import "dotenv/config";
import { eq } from "drizzle-orm";
import { createScriptAuth } from "../lib/auth-options";
import { db } from "./index";
import { products, users } from "./schema";

const SELLER_EMAIL = "finca@example.com";

async function main() {
  const auth = createScriptAuth();

  let [seller] = await db.select().from(users).where(eq(users.email, SELLER_EMAIL));
  if (!seller) {
    await auth.api.createUser({
      body: {
        email: SELLER_EMAIL,
        password: process.env.SEED_SELLER_PASSWORD ?? "agro-seller-dev",
        name: "Ana Rodríguez",
        role: "seller",
        data: { farmName: "Finca El Cacao", phone: "8095550101", province: "La Vega" },
      },
    });
    [seller] = await db.select().from(users).where(eq(users.email, SELLER_EMAIL));
  }

  const existing = await db
    .select({ id: products.id })
    .from(products)
    .where(eq(products.sellerId, seller.id))
    .limit(1);

  if (existing.length > 0) {
    console.log("Seed data already present, skipping products.");
    process.exit(0);
  }

  await db.insert(products).values([
    {
      sellerId: seller.id,
      name: "Cacao en grano",
      category: "Café y cacao",
      organic: true,
      priceCents: 25000,
      unit: "libra",
      stock: 200,
      province: "La Vega",
    },
    {
      sellerId: seller.id,
      name: "Plátano barahonero",
      category: "Víveres",
      priceCents: 1500,
      unit: "unidad",
      unlimitedStock: true,
      province: "Duarte",
    },
  ]);
  console.log(`Seeded seller ${SELLER_EMAIL} and 2 products.`);
  process.exit(0);
}
main();
