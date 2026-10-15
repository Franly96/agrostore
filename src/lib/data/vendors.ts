import "server-only";
import { and, asc, count, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "@/src/db";
import { products, users } from "@/src/db/schema";

// Admin-only reads. Call requireRole("admin") before using these.

const vendorColumns = {
  id: users.id,
  name: users.name,
  farmName: users.farmName,
  email: users.email,
  phone: users.phone,
  province: users.province,
  banned: sql<boolean>`coalesce(${users.banned}, false)`,
  createdAt: users.createdAt,
};

export function listVendors(query?: string) {
  const q = query?.trim();
  const search = q
    ? or(
        ilike(users.name, `%${q}%`),
        ilike(users.farmName, `%${q}%`),
        ilike(users.email, `%${q}%`),
      )
    : undefined;

  return db
    .select({ ...vendorColumns, productCount: count(products.id) })
    .from(users)
    .leftJoin(products, eq(products.sellerId, users.id))
    .where(and(eq(users.role, "seller"), search))
    .groupBy(users.id)
    .orderBy(asc(sql`coalesce(${users.farmName}, ${users.name})`));
}

/** A seller by id; null for unknown ids and for non-seller accounts (admins). */
export async function getVendor(id: number) {
  const [row] = await db
    .select(vendorColumns)
    .from(users)
    .where(and(eq(users.id, id), eq(users.role, "seller")))
    .limit(1);
  return row ?? null;
}
