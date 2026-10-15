import { describe, expect, it } from "vitest";
import { parseId } from "./ids";
import { safeNext } from "./roles";

describe("safeNext", () => {
  it("allows paths inside the role's own area", () => {
    expect(safeNext("/vendor/productos/3", "seller")).toBe("/vendor/productos/3");
    expect(safeNext("/admin/vendedores?q=ana", "admin")).toBe("/admin/vendedores?q=ana");
  });

  it.each([
    ["//evil.com", "seller"],
    ["https://evil.com/vendor", "seller"],
    ["/\\evil.com", "seller"],
    ["/admin/vendedores", "seller"],
    ["/vendor/productos", "admin"],
    ["/panelx", "seller"],
    [undefined, "seller"],
  ] as const)("sends %j for a %s to their home", (next, role) => {
    expect(safeNext(next, role)).toBe(role === "admin" ? "/admin/vendedores" : "/vendor/productos");
  });
});

describe("parseId", () => {
  it.each([["1", 1], ["2147483647", 2147483647], [42, 42]])("accepts %j", (raw, id) => {
    expect(parseId(raw)).toBe(id);
  });

  it.each(["0", "-1", "1.5", "abc", "2147483648", "99999999999", "", null, undefined, "1e3"])(
    "rejects %j",
    (raw) => {
      expect(parseId(raw)).toBeNull();
    },
  );
});
