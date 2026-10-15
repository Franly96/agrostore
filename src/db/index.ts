import { attachDatabasePool } from "@vercel/functions";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

// One pool per server instance. On Vercel (Fluid compute) attachDatabasePool
// closes idle connections before the instance suspends; locally it does nothing.
// DATABASE_URL is Neon's pooled connection string in production and previews.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 5_000,
});
attachDatabasePool(pool);

export const db = drizzle({ client: pool, schema });
