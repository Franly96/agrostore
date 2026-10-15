import { eq, gt, or, sql } from "drizzle-orm";
import { CATEGORIES } from "@/components/agrostore/constants";
import { products, users } from "@/src/db/schema";

/** Public store queries only show products from active (not deactivated) sellers. */
export const activeSeller = sql`coalesce(${users.banned}, false) = false`;

/** Public seller name: farm name, falling back to the contact name. */
export const sellerDisplayName = sql<string>`coalesce(${users.farmName}, ${users.name})`;

/** SQL twin of `!isSoldOut(p)`: the catalog only lists products that can be bought. */
export const inStock = or(eq(products.unlimitedStock, true), gt(products.stock, 0));

export function isSoldOut(p: { stock: number; unlimitedStock: boolean }) {
  return !p.unlimitedStock && p.stock <= 0;
}

const knownCategories: readonly string[] = CATEGORIES;

function categoryRank(category: string) {
  const i = knownCategories.indexOf(category);
  return i === -1 ? knownCategories.length : i;
}

/** Sort order for category names: the order of `CATEGORIES`, unknown ones last, alphabetically. */
export function compareCategories(a: string, b: string) {
  return categoryRank(a) - categoryRank(b) || a.localeCompare(b, "es");
}

/**
 * Groups items by category in `compareCategories` order. Categories without items are left
 * out; item order is preserved.
 */
export function groupByCategory<T extends { category: string }>(items: T[]) {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const group = groups.get(item.category);
    if (group) group.push(item);
    else groups.set(item.category, [item]);
  }

  return [...groups]
    .sort(([a], [b]) => compareCategories(a, b))
    .map(([category, items]) => ({ category, items }));
}
