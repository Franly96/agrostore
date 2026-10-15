// Creates the first admin. Usage:
//   ADMIN_EMAIL=… ADMIN_NAME=… ADMIN_PASSWORD=… npm run create-admin
import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "../src/db";
import { users } from "../src/db/schema";
import { createScriptAuth } from "../src/lib/auth-options";

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const name = process.env.ADMIN_NAME?.trim();
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !name || !password) {
    console.error("Set ADMIN_EMAIL, ADMIN_NAME and ADMIN_PASSWORD.");
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("ADMIN_PASSWORD must be at least 8 characters.");
    process.exit(1);
  }

  const [existing] = await db.select({ role: users.role }).from(users).where(eq(users.email, email));
  if (existing) {
    console.log(`${email} already exists (role: ${existing.role}). Nothing to do.`);
    process.exit(0);
  }

  await createScriptAuth().api.createUser({ body: { email, name, password, role: "admin" } });
  console.log(`Admin ${email} created. Sign in at /auth/login.`);
  process.exit(0);
}
main();
