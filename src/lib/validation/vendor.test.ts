import { describe, expect, it } from "vitest";
import { formatDrPhone, normalizeDrPhone, setPasswordSchema, vendorCreateSchema } from "./vendor";

describe("normalizeDrPhone", () => {
  it.each([
    ["809-555-1234", "8095551234"],
    ["(829) 555 1234", "8295551234"],
    ["1-849-555-1234", "8495551234"],
    ["+1 809 555 1234", "8095551234"],
  ])("normalizes %j", (raw, expected) => {
    expect(normalizeDrPhone(raw)).toBe(expected);
  });

  it.each(["305-555-1234", "809-555-123", "", "8095551234567"])("rejects %j", (raw) => {
    expect(normalizeDrPhone(raw)).toBeNull();
  });

  it("formats 10 digits for display", () => {
    expect(formatDrPhone("8095551234")).toBe("809-555-1234");
  });
});

describe("vendorCreateSchema", () => {
  const valid = {
    name: "Ana Rodríguez",
    farmName: "Finca Los Ríos",
    email: "  Ana@Correo.COM ",
    phone: "(809) 555-1234",
    province: "Duarte",
    password: "temporal123",
  };

  it("normalizes email and phone", () => {
    expect(vendorCreateSchema.parse(valid)).toMatchObject({
      email: "ana@correo.com",
      phone: "8095551234",
    });
  });

  it("requires a password of at least 8 characters", () => {
    expect(vendorCreateSchema.safeParse({ ...valid, password: "corta" }).success).toBe(false);
  });

  it("rejects a non-DR phone with a Spanish message", () => {
    const r = vendorCreateSchema.safeParse({ ...valid, phone: "305-555-1234" });
    expect(r.error?.issues[0]).toMatchObject({ path: ["phone"], message: "Escribe los 10 dígitos, ej. 809-555-1234." });
  });
});

describe("setPasswordSchema", () => {
  it("requires matching passwords", () => {
    const r = setPasswordSchema.safeParse({ password: "nueva12345", confirmPassword: "otra12345" });
    expect(r.error?.issues[0]).toMatchObject({ path: ["confirmPassword"], message: "Las contraseñas no coinciden." });
  });
});
