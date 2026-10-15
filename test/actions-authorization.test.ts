// Every server action must call requireRole first and stop for the wrong role.
import { beforeEach, describe, expect, it, vi } from "vitest";

const calls = vi.hoisted(() => ({ dataWrites: 0, authWrites: 0, signedInAs: "seller" as string | null }));

vi.mock("@/src/lib/dal", () => ({
  requireRole: vi.fn(async (role: string) => {
    if (calls.signedInAs !== role) throw new Error(`REDIRECT:${role}`);
    return { id: 7, name: "Test", email: "t@test.do", role, farmName: null };
  }),
}));
vi.mock("@/src/lib/data/products", () => ({
  insertSellerProduct: vi.fn(async () => void calls.dataWrites++),
  updateSellerProduct: vi.fn(async () => (calls.dataWrites++, true)),
}));
vi.mock("@/src/lib/data/vendors", () => ({
  getVendor: vi.fn(async (id: number) => ({ id, name: "V", farmName: "F", email: "v@test.do", phone: null, province: null, banned: false })),
}));
vi.mock("@/src/lib/auth", () => ({
  auth: {
    api: new Proxy({}, { get: () => vi.fn(async () => void calls.authWrites++) }),
  },
}));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
}));

const { createProduct, updateProduct } = await import("@/src/app/vendor/productos/actions");
const { createVendor, updateVendor, setVendorPassword, setVendorActive } = await import(
  "@/src/app/admin/vendedores/actions"
);

const idle = { status: "idle" as const };
const productForm = () => {
  const fd = new FormData();
  for (const [k, v] of Object.entries({ name: "Yuca", category: "Víveres", province: "Duarte", price: "20", unit: "libra", stock: "5" })) fd.set(k, v);
  return fd;
};
const vendorForm = () => {
  const fd = new FormData();
  for (const [k, v] of Object.entries({ name: "Ana", farmName: "Finca", email: "a@test.do", phone: "8095551234", province: "Duarte", password: "temporal123", confirmPassword: "temporal123" })) fd.set(k, v);
  return fd;
};

beforeEach(() => {
  calls.dataWrites = 0;
  calls.authWrites = 0;
});

describe("seller product actions", () => {
  it.each([null, "admin"])("refuse %s without writing", async (who) => {
    calls.signedInAs = who;
    await expect(createProduct(idle, productForm())).rejects.toThrow("REDIRECT:seller");
    await expect(updateProduct(1, idle, productForm())).rejects.toThrow("REDIRECT:seller");
    expect(calls.dataWrites).toBe(0);
  });

  it("rejects a tampered product id", async () => {
    calls.signedInAs = "seller";
    await expect(updateProduct("1; drop" as unknown as number, idle, productForm())).rejects.toThrow("NOT_FOUND");
    expect(calls.dataWrites).toBe(0);
  });

  it("writes for a seller and redirects", async () => {
    calls.signedInAs = "seller";
    await expect(createProduct(idle, productForm())).rejects.toThrow("REDIRECT:/vendor/productos?ok=creado");
    expect(calls.dataWrites).toBe(1);
  });
});

describe("admin vendor actions", () => {
  it.each([null, "seller"])("refuse %s without writing", async (who) => {
    calls.signedInAs = who;
    await expect(createVendor(idle, vendorForm())).rejects.toThrow("REDIRECT:admin");
    await expect(updateVendor(3, idle, vendorForm())).rejects.toThrow("REDIRECT:admin");
    await expect(setVendorPassword(3, idle, vendorForm())).rejects.toThrow("REDIRECT:admin");
    await expect(setVendorActive(3, false)).rejects.toThrow("REDIRECT:admin");
    expect(calls.authWrites).toBe(0);
  });

  it("writes for an admin", async () => {
    calls.signedInAs = "admin";
    await expect(createVendor(idle, vendorForm())).rejects.toThrow("REDIRECT:/admin/vendedores?ok=creado");
    expect(calls.authWrites).toBe(1);
  });
});
