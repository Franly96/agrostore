import { sql } from "drizzle-orm";
import { users } from "@/src/db/schema";

/** Public store queries only show products from active (not deactivated) sellers. */
export const activeSeller = sql`coalesce(${users.banned}, false) = false`;

/** Public seller name: farm name, falling back to the contact name. */
export const sellerDisplayName = sql<string>`coalesce(${users.farmName}, ${users.name})`;

export function isSoldOut(p: { stock: number; unlimitedStock: boolean }) {
  return !p.unlimitedStock && p.stock <= 0;
}
