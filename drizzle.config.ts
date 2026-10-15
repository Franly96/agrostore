import "dotenv/config";
import { defineConfig } from "drizzle-kit";

// Migrations use Neon's direct (unpooled) connection; locally both are the Docker URL.
export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: (process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL)! },
});
