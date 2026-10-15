import { ProductCard, centsToPesos } from "@/components/agrostore";
import { desc, eq } from "drizzle-orm";
import { db } from "@/src/db";
import { products, users } from "@/src/db/schema";
import { activeSeller, isSoldOut, sellerDisplayName } from "@/src/lib/data/store";

const gridClass = "grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4";

export async function ProductList() {
  const items = await db
    .select({
      id: products.id,
      name: products.name,
      priceCents: products.priceCents,
      unit: products.unit,
      stock: products.stock,
      unlimitedStock: products.unlimitedStock,
      organic: products.organic,
      province: products.province,
      imageUrl: products.imageUrl,
      sellerName: sellerDisplayName,
    })
    .from(products)
    .innerJoin(users, eq(products.sellerId, users.id))
    .where(activeSeller)
    .orderBy(desc(products.createdAt));

  return (
    <div className={gridClass}>
      {items.map((p) => (
        <ProductCard
          key={p.id}
          href={`/productos/${p.id}`}
          name={p.name}
          price={centsToPesos(p.priceCents)}
          unit={p.unit}
          seller={p.sellerName}
          province={p.province ?? undefined}
          imageSrc={p.imageUrl ?? undefined}
          soldOut={isSoldOut(p)}
          badges={p.organic ? [{ label: "Orgánico", tone: "green" }] : []}
          className="max-w-none"
        />
      ))}
    </div>
  );
}

export function ProductListSkeleton() {
  return (
    <div className={gridClass} aria-busy="true">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="flex animate-pulse flex-col overflow-hidden rounded-md border border-line bg-surface"
        >
          <div className="aspect-[4/3] bg-green-100" />
          <div className="flex flex-col gap-2 p-4">
            <div className="h-5 w-3/4 rounded-sm bg-line" />
            <div className="h-4 w-1/2 rounded-sm bg-line" />
            <div className="h-6 w-2/5 rounded-sm bg-line" />
          </div>
        </div>
      ))}
    </div>
  );
}
