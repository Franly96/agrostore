import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/src/db";
import { products } from "@/src/db/schema";
import type { toProductRow } from "@/src/lib/validation/product";

// Seller-scoped product access. `sellerId` must always come from
// requireRole("seller"), never from user input.

type ProductRow = ReturnType<typeof toProductRow>;

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

export function listSellerProducts(sellerId: number) {
  return db
    .select(sellerProductColumns)
    .from(products)
    .where(eq(products.sellerId, sellerId))
    .orderBy(desc(products.updatedAt));
}

export async function getSellerProduct(sellerId: number, productId: number) {
  const [row] = await db
    .select(sellerProductColumns)
    .from(products)
    .where(and(eq(products.id, productId), eq(products.sellerId, sellerId)))
    .limit(1);
  return row ?? null;
}

export async function insertSellerProduct(sellerId: number, row: ProductRow) {
  await db.insert(products).values({ ...row, sellerId });
}

/** Returns false when the product doesn't exist or belongs to another seller. */
export async function updateSellerProduct(sellerId: number, productId: number, row: ProductRow) {
  const updated = await db
    .update(products)
    .set(row)
    .where(and(eq(products.id, productId), eq(products.sellerId, sellerId)))
    .returning({ id: products.id });
  return updated.length > 0;
}
