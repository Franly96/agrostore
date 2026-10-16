import { and, eq } from "drizzle-orm";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AddToCartPanel } from "@/components/add-to-cart";
import { Badge, Button, PriceTag, centsToPesos } from "@/components/agrostore";
import { Leaf } from "@/components/agrostore/leaf";
import { ProductGallery } from "@/components/product-gallery";
import { db } from "@/src/db";
import { MAX_LINE_QTY } from "@/src/lib/cart";
import { products, users } from "@/src/db/schema";
import { listProductImages } from "@/src/lib/data/products";
import { activeSeller, isSoldOut, sellerDisplayName } from "@/src/lib/data/store";
import { isDisplayableAvatar } from "@/src/lib/images/paths";

export const metadata: Metadata = { title: "Detalle del producto" };

const MAX_INT = 2147483647;

export default function Page({ params }: PageProps<"/productos/[id]">) {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 md:px-6">
      <Link
        href="/productos"
        className="rounded-sm text-body-sm font-semibold text-green-600 hover:text-green-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600"
      >
        ← Volver a productos
      </Link>
      <Suspense fallback={<ProductDetailSkeleton />}>
        <ProductDetail params={params} />
      </Suspense>
    </main>
  );
}

async function ProductDetail({
  params,
}: {
  params: PageProps<"/productos/[id]">["params"];
}) {
  const { id } = await params;
  const productId = Number(id);
  if (!Number.isInteger(productId) || productId < 1 || productId > MAX_INT) {
    notFound();
  }

  // Product and photos in parallel; the photos are only shown if the product is public.
  const [[product], images] = await Promise.all([
    db
      .select({
        name: products.name,
        description: products.description,
        priceCents: products.priceCents,
        unit: products.unit,
        stock: products.stock,
        unlimitedStock: products.unlimitedStock,
        organic: products.organic,
        category: products.category,
        province: products.province,
        sellerId: users.id,
        sellerName: sellerDisplayName,
        sellerImage: users.image,
      })
      .from(products)
      .innerJoin(users, eq(products.sellerId, users.id))
      .where(and(eq(products.id, productId), activeSeller))
      .limit(1),
    listProductImages(productId),
  ]);

  if (!product) notFound();

  const soldOut = isSoldOut(product);
  const avatar = isDisplayableAvatar(product.sellerImage, product.sellerId)
    ? product.sellerImage
    : null;

  return (
    <article className="mt-6 grid gap-6 md:grid-cols-2">
      {images.length > 0 ? (
        <ProductGallery images={images} name={product.name} soldOut={soldOut} />
      ) : (
        <div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-md bg-green-100">
          <Leaf size={96} />
        </div>
      )}
      <div className="flex flex-col gap-4">
        {soldOut || product.organic ? (
          <div className="flex gap-1">
            {soldOut ? <Badge tone="danger">Agotado</Badge> : null}
            {product.organic ? <Badge tone="green">Orgánico</Badge> : null}
          </div>
        ) : null}
        <h1 className="text-heading text-ink">{product.name}</h1>
        <PriceTag
          amount={centsToPesos(product.priceCents)}
          unit={product.unit}
        />
        <p className="text-body-sm text-ink-muted">
          {[
            product.category,
            product.province,
            soldOut || product.unlimitedStock
              ? null
              : `${product.stock} disponibles`,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
        {product.description ? (
          <p className="text-body text-ink">{product.description}</p>
        ) : null}
        {soldOut ? (
          <Button variant="secondary" disabled className="min-h-11 self-start">
            Agotado
          </Button>
        ) : (
          <AddToCartPanel
            productId={productId}
            max={product.unlimitedStock ? MAX_LINE_QTY : product.stock}
          />
        )}
        <p className="flex items-center gap-2 text-body-sm text-ink-muted">
          {avatar ? (
            <Image
              src={avatar}
              alt=""
              width={32}
              height={32}
              sizes="32px"
              className="size-8 flex-none rounded-pill object-cover"
            />
          ) : null}
          <span>
            Vendido por{" "}
            <Link
              href={`/vendedores/${product.sellerId}`}
              className="font-semibold text-green-600 underline-offset-2 hover:text-green-800 hover:underline"
            >
              {product.sellerName}
            </Link>
          </span>
        </p>
      </div>
    </article>
  );
}

function ProductDetailSkeleton() {
  return (
    <div
      className="mt-6 grid animate-pulse gap-6 md:grid-cols-2"
      aria-busy="true"
    >
      <div className="aspect-[4/3] rounded-md bg-green-100" />
      <div className="flex flex-col gap-4">
        <div className="h-9 w-2/3 rounded-sm bg-line" />
        <div className="h-6 w-40 rounded-sm bg-line" />
        <div className="h-5 w-48 rounded-sm bg-line" />
        <div className="h-5 w-56 rounded-sm bg-line" />
      </div>
    </div>
  );
}
