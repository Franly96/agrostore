import "server-only";
import { and, asc, count, desc, eq, inArray, ne, sql } from "drizzle-orm";
import { db } from "@/src/db";
import { productImages, products } from "@/src/db/schema";
import type { PhotoInput, toProductRow } from "@/src/lib/validation/product";

// Seller-scoped product access. `sellerId` must always come from
// requireRole("seller"), never from user input.

type ProductRow = ReturnType<typeof toProductRow>;
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * URL of a product's cover photo (position 0), or null. Use in a select on
 * `products`. Names are written out in full because Drizzle leaves columns
 * unqualified in single-table queries, which would make `${products.id}` resolve
 * to `product_images.id` inside this subquery.
 */
export const coverImageUrl = sql<string | null>`(
  select cover.url from product_images as cover
  where cover.product_id = "products"."id" and cover.position = 0
)`;

const sellerProductColumns = {
  id: products.id,
  name: products.name,
  category: products.category,
  province: products.province,
  priceCents: products.priceCents,
  unit: products.unit,
  stock: products.stock,
  unlimitedStock: products.unlimitedStock,
  description: products.description,
  organic: products.organic,
  updatedAt: products.updatedAt,
};

export async function countSellerProducts(sellerId: number) {
  const [row] = await db
    .select({ total: count() })
    .from(products)
    .where(eq(products.sellerId, sellerId));
  return row?.total ?? 0;
}

/** One page of the seller's products, most recently updated first. */
export function listSellerProducts(sellerId: number, { offset, limit }: { offset: number; limit: number }) {
  return db
    .select({ ...sellerProductColumns, coverUrl: coverImageUrl })
    .from(products)
    .where(eq(products.sellerId, sellerId))
    .orderBy(desc(products.updatedAt), desc(products.id))
    .limit(limit)
    .offset(offset);
}

/** Photos of a product in display order (first = cover). */
export function listProductImages(productId: number) {
  return db
    .select({
      url: productImages.url,
      pathname: productImages.pathname,
      width: productImages.width,
      height: productImages.height,
    })
    .from(productImages)
    .where(eq(productImages.productId, productId))
    .orderBy(asc(productImages.position));
}

/** The seller's product with its photos; null when missing or not theirs. */
export async function getSellerProduct(sellerId: number, productId: number) {
  const [row] = await db
    .select(sellerProductColumns)
    .from(products)
    .where(and(eq(products.id, productId), eq(products.sellerId, sellerId)))
    .limit(1);
  if (!row) return null;
  return { ...row, images: await listProductImages(productId) };
}

/** A submitted photo is already attached to another product. */
export class PhotoInUseError extends Error {}

async function replaceImages(tx: Tx, sellerId: number, productId: number, images: PhotoInput[]) {
  if (images.length > 0) {
    const taken = await tx
      .select({ id: productImages.id })
      .from(productImages)
      .where(
        and(
          inArray(productImages.pathname, images.map((img) => img.pathname)),
          ne(productImages.productId, productId),
        ),
      )
      .limit(1);
    if (taken.length > 0) throw new PhotoInUseError();
  }
  const before = await tx
    .select({ pathname: productImages.pathname })
    .from(productImages)
    .where(eq(productImages.productId, productId));
  await tx.delete(productImages).where(eq(productImages.productId, productId));
  if (images.length > 0) {
    await tx.insert(productImages).values(
      images.map((img, position) => ({ ...img, productId, sellerId, position })),
    );
  }
  const kept = new Set(images.map((img) => img.pathname));
  return before.map((b) => b.pathname).filter((p) => !kept.has(p));
}

/** Creates the product and its photos together. */
export async function insertSellerProduct(sellerId: number, row: ProductRow, images: PhotoInput[] = []) {
  await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(products)
      .values({ ...row, sellerId })
      .returning({ id: products.id });
    await replaceImages(tx, sellerId, created.id, images);
  });
}

/**
 * Updates the product and replaces its photos. Returns the pathnames of photos
 * that were removed (to delete from storage), or null when the product doesn't
 * exist or belongs to another seller.
 */
export async function updateSellerProduct(
  sellerId: number,
  productId: number,
  row: ProductRow,
  images: PhotoInput[] = [],
): Promise<string[] | null> {
  return db.transaction(async (tx) => {
    const updated = await tx
      .update(products)
      .set(row)
      .where(and(eq(products.id, productId), eq(products.sellerId, sellerId)))
      .returning({ id: products.id });
    if (updated.length === 0) return null;
    return replaceImages(tx, sellerId, productId, images);
  });
}
