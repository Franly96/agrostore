import { describe, expect, it } from "vitest";
import {
  buildHref,
  likePattern,
  normalizeSearch,
  paginate,
  parsePage,
  readParam,
} from "@/src/lib/list-query";

describe("readParam", () => {
  it("takes the first value, trims and caps it", () => {
    expect(readParam("  mango ")).toBe("mango");
    expect(readParam(["a", "b"])).toBe("a");
    expect(readParam("abcdef", 3)).toBe("abc");
  });

  it("returns an empty string when the param is missing", () => {
    expect(readParam(undefined)).toBe("");
    expect(readParam([])).toBe("");
  });
});

describe("parsePage", () => {
  it("accepts positive integers", () => {
    expect(parsePage("3")).toBe(3);
  });

  it.each(["0", "-2", "1.5", "abc", "", "1e3", "Infinity"])("falls back to 1 for %j", (value) => {
    expect(parsePage(value)).toBe(1);
  });

  it("falls back to 1 when missing and caps absurd values", () => {
    expect(parsePage(undefined)).toBe(1);
    expect(parsePage("99999999")).toBe(100_000);
  });
});

describe("paginate", () => {
  it("computes pages and the row offset", () => {
    expect(paginate(25, 2, 10)).toEqual({ page: 2, pages: 3, total: 25, offset: 10, limit: 10 });
  });

  it("always has at least one page", () => {
    expect(paginate(0, 1, 10)).toEqual({ page: 1, pages: 1, total: 0, offset: 0, limit: 10 });
  });

  it("clamps a page past the end to the last page", () => {
    expect(paginate(25, 9, 10)).toMatchObject({ page: 3, offset: 20 });
  });

  it("fills the last page exactly when the total is a multiple of the page size", () => {
    expect(paginate(20, 2, 10)).toMatchObject({ pages: 2, offset: 10 });
  });
});

describe("buildHref", () => {
  it("leaves out empty params and encodes the rest", () => {
    expect(buildHref("/productos", { q: "piña colada", categoria: "", pagina: undefined })).toBe(
      "/productos?q=pi%C3%B1a+colada",
    );
  });

  it("returns the bare path when nothing is set", () => {
    expect(buildHref("/productos", {})).toBe("/productos");
  });

  it("keeps numbers", () => {
    expect(buildHref("/admin/vendedores", { pagina: 2 })).toBe("/admin/vendedores?pagina=2");
  });
});

describe("search term", () => {
  it("normalizes case and accents", () => {
    expect(normalizeSearch("Plátano PIÑA Café")).toBe("platano pina cafe");
  });

  it("escapes LIKE wildcards", () => {
    expect(likePattern("100%_a\\b")).toBe("%100\\%\\_a\\\\b%");
  });
});
