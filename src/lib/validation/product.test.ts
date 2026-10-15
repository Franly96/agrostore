import { describe, expect, it } from "vitest";
import { productSchema, toProductRow, validateProductDraft } from "./product";

const valid = {
  name: "Aguacate Semil",
  category: "Frutas",
  province: "Duarte",
  price: "45.50",
  unit: "unidad",
  stock: "30",
  description: "",
};

describe("productSchema", () => {
  it("parses a valid form post", () => {
    const r = productSchema.parse(valid);
    expect(r).toMatchObject({ price: 45.5, stock: 30, unlimitedStock: false, organic: false, description: null });
  });

  it("accepts thousands separators in the price", () => {
    expect(productSchema.parse({ ...valid, price: "1,200.50" }).price).toBe(1200.5);
  });

  it.each(["0", "-5", "abc", "12.345", "", "2000000"])("rejects price %j", (price) => {
    expect(productSchema.safeParse({ ...valid, price }).success).toBe(false);
  });

  it("treats a missing or empty stock as 0", () => {
    expect(productSchema.parse({ ...valid, stock: undefined }).stock).toBe(0);
    expect(productSchema.parse({ ...valid, stock: "" }).stock).toBe(0);
  });

  it.each(["1.5", "-1", "diez"])("rejects stock %j", (stock) => {
    expect(productSchema.safeParse({ ...valid, stock }).success).toBe(false);
  });

  it("reads checkboxes from form posts and client state", () => {
    const r = productSchema.parse({ ...valid, organic: "on", unlimitedStock: true });
    expect(r.organic).toBe(true);
    expect(r.unlimitedStock).toBe(true);
  });

  it("rejects values outside the design-system lists", () => {
    expect(productSchema.safeParse({ ...valid, category: "Carros" }).success).toBe(false);
    expect(productSchema.safeParse({ ...valid, province: "Miami" }).success).toBe(false);
    expect(productSchema.safeParse({ ...valid, unit: "tonelada" }).success).toBe(false);
  });

  it("returns Spanish messages per field", () => {
    const r = productSchema.safeParse({ ...valid, name: "", price: "0" });
    expect(r.success).toBe(false);
    const messages = r.error!.issues.map((i) => i.message);
    expect(messages).toContain("Escribe el nombre del producto.");
    expect(messages).toContain("Indica un precio mayor que 0.");
  });
});

describe("toProductRow", () => {
  it("converts pesos to centavos without float drift", () => {
    expect(toProductRow(productSchema.parse({ ...valid, price: "45.55" })).priceCents).toBe(4555);
    expect(toProductRow(productSchema.parse({ ...valid, price: "0.29" })).priceCents).toBe(29);
  });

  it("stores stock 0 for unlimited products", () => {
    const row = toProductRow(productSchema.parse({ ...valid, stock: "30", unlimitedStock: "on" }));
    expect(row).toMatchObject({ stock: 0, unlimitedStock: true });
  });
});

describe("validateProductDraft", () => {
  const draft = { ...valid, unlimitedStock: false, organic: false };

  it("returns no errors for a valid draft", () => {
    expect(validateProductDraft(draft)).toEqual({});
  });

  it("ignores the stock field when stock is unlimited", () => {
    expect(validateProductDraft({ ...draft, stock: "abc", unlimitedStock: true })).toEqual({});
  });

  it("returns the first message per field", () => {
    expect(validateProductDraft({ ...draft, category: "" })).toEqual({ category: "Elige una categoría." });
  });
});
