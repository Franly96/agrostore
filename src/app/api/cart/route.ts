import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/src/db";
import { products, users } from "@/src/db/schema";
import { parseIdList, type CartProduct } from "@/src/lib/cart";
import { activeSeller, sellerDisplayName } from "@/src/lib/data/store";

// Public read for the cart page: the browser keeps only product ids and quantities, so it asks
// here for the current name, price and stock. It returns the same data the store pages already
// show. Products that no longer exist, or whose seller is deactivated, are simply left out.
export async function GET(request: Request) {
  const ids = parseIdList(new URL(request.url).searchParams.get("ids"));
  if (ids.length === 0) return Response.json({ items: [] });

  const items: CartProduct[] = await db
    .select({
      id: products.id,
      name: products.name,
      priceCents: products.priceCents,
      unit: products.unit,
      stock: products.stock,
      unlimitedStock: products.unlimitedStock,
      imageUrl: products.imageUrl,
      sellerId: users.id,
      sellerName: sellerDisplayName,
    })
    .from(products)
    .innerJoin(users, eq(products.sellerId, users.id))
    .where(and(activeSeller, inArray(products.id, ids)));

  return Response.json({ items }, { headers: { "Cache-Control": "no-store" } });
}
