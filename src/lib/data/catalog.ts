import "server-only";
import { and, asc, count, desc, eq, sql } from "drizzle-orm";
import { CATEGORIES } from "@/components/agrostore/constants";
import { db } from "@/src/db";
import { products, users } from "@/src/db/schema";
import { activeSeller, inStock, sellerDisplayName } from "@/src/lib/data/store";
import { likePattern, normalizeSearch } from "@/src/lib/list-query";

// Public catalog reads: in-stock products from active sellers, filtered by product name and
// category. `q` and `category` are user input; they only ever reach SQL as bound parameters.

/** Products per page in the store grid (divisible by the grid's 2, 3 and 4 columns). */
export const CATALOG_PAGE_SIZE = 12;

// Same normalization as `normalizeSearch`, applied to the column (no `unaccent` extension needed).
const normalizedName = sql`lower(translate(${products.name}, 'áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunAEIOUUN'))`;

function nameMatches(q: string) {
  const term = normalizeSearch(q);
  return term ? sql`${normalizedName} like ${likePattern(term)}` : undefined;
}

// Position in CATEGORIES; unknown categories come back null and sort last.
const categoryRank = sql`array_position(array[${sql.join(
  CATEGORIES.map((category) => sql`${category}`),
  sql`, `,
)}]::text[], ${products.category})`;

/** Number of matching products per category, ignoring any category filter. */
export async function countCatalogByCategory(q: string) {
  return db
    .select({ category: products.category, total: count() })
    .from(products)
    .innerJoin(users, eq(products.sellerId, users.id))
    .where(and(activeSeller, inStock, nameMatches(q)))
    .groupBy(products.category);
}

/** One page of matching products, ordered by category and then newest first. */
export function listCatalogProducts({
  q,
  category,
  offset,
  limit,
}: {
  q: string;
  category: string;
  offset: number;
  limit: number;
}) {
  return db
    .select({
      id: products.id,
      name: products.name,
      category: products.category,
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
    .where(
      and(activeSeller, inStock, nameMatches(q), category ? eq(products.category, category) : undefined),
    )
    .orderBy(
      sql`${categoryRank} asc nulls last`,
      asc(products.category),
      desc(products.createdAt),
      desc(products.id),
    )
    .limit(limit)
    .offset(offset);
}
