import { describe, expect, it } from "vitest";
import {
  MAX_CART_LINES,
  MAX_LINE_QTY,
  addLine,
  parseCart,
  parseIdList,
  removeLine,
  setLineQty,
} from "@/src/lib/cart";

const raw = (value: unknown) => JSON.stringify(value);

describe("parseCart", () => {
  it("reads valid lines", () => {
    expect(parseCart(raw([{ productId: 3, qty: 2 }]))).toEqual([{ productId: 3, qty: 2 }]);
  });

  it.each([null, "", "not json", "{}", "42", raw({ productId: 1, qty: 1 })])(
    "gives an empty cart for %j",
    (value) => {
      expect(parseCart(value)).toEqual([]);
    },
  );

  it("drops malformed lines and keeps the good ones", () => {
    const lines = parseCart(
      raw([
        { productId: 1, qty: 1 },
        { productId: "2", qty: 1 },
        { productId: 0, qty: 1 },
        { productId: -4, qty: 1 },
        { productId: 2147483648, qty: 1 },
        { productId: 1.5, qty: 1 },
        { productId: 5, qty: 0 },
        { productId: 6, qty: 1.5 },
        { productId: 7, qty: "3" },
        null,
        "x",
        { productId: 8, qty: 4 },
      ]),
    );
    expect(lines).toEqual([
      { productId: 1, qty: 1 },
      { productId: 8, qty: 4 },
    ]);
  });

  it("merges repeated products and caps the quantity", () => {
    expect(
      parseCart(raw([{ productId: 1, qty: 600 }, { productId: 1, qty: 600 }, { productId: 2, qty: 1 }])),
    ).toEqual([
      { productId: 1, qty: MAX_LINE_QTY },
      { productId: 2, qty: 1 },
    ]);
  });

  it("keeps at most MAX_CART_LINES products", () => {
    const many = Array.from({ length: MAX_CART_LINES + 5 }, (_, i) => ({ productId: i + 1, qty: 1 }));
    const lines = parseCart(raw(many));
    expect(lines).toHaveLength(MAX_CART_LINES);
    expect(lines.at(-1)?.productId).toBe(MAX_CART_LINES);
  });
});

describe("addLine", () => {
  it("adds a new product", () => {
    expect(addLine([], 4, 1, 10)).toEqual({
      status: "added",
      lines: [{ productId: 4, qty: 1 }],
      added: 1,
    });
  });

  it("adds to the quantity of a product already in the cart", () => {
    const result = addLine([{ productId: 4, qty: 2 }, { productId: 9, qty: 1 }], 4, 3, 10);
    expect(result.status).toBe("added");
    expect(result.lines).toEqual([
      { productId: 4, qty: 5 },
      { productId: 9, qty: 1 },
    ]);
  });

  it("caps at the available stock and says so", () => {
    const result = addLine([{ productId: 4, qty: 8 }], 4, 5, 10);
    expect(result).toEqual({ status: "capped", lines: [{ productId: 4, qty: 10 }], added: 2 });
  });

  it("refuses when the cart already holds all the stock", () => {
    const lines = [{ productId: 4, qty: 10 }];
    expect(addLine(lines, 4, 1, 10)).toEqual({ status: "maxed", lines, added: 0 });
  });

  it("never goes above MAX_LINE_QTY, even for unlimited stock", () => {
    const result = addLine([{ productId: 4, qty: 998 }], 4, 5, Number.MAX_SAFE_INTEGER);
    expect(result.lines).toEqual([{ productId: 4, qty: MAX_LINE_QTY }]);
  });

  it("refuses a new product when the cart is full, but still lets existing ones grow", () => {
    const full = Array.from({ length: MAX_CART_LINES }, (_, i) => ({ productId: i + 1, qty: 1 }));
    expect(addLine(full, 999, 1, 10).status).toBe("full");
    expect(addLine(full, 1, 1, 10).status).toBe("added");
  });

  it("does not mutate the cart it was given", () => {
    const lines = [{ productId: 4, qty: 1 }];
    addLine(lines, 4, 1, 10);
    expect(lines).toEqual([{ productId: 4, qty: 1 }]);
  });
});

describe("setLineQty and removeLine", () => {
  const lines = [{ productId: 1, qty: 2 }, { productId: 2, qty: 5 }];

  it("changes only the quantity of that product", () => {
    expect(setLineQty(lines, 2, 7)).toEqual([{ productId: 1, qty: 2 }, { productId: 2, qty: 7 }]);
  });

  it("keeps the quantity between 1 and MAX_LINE_QTY", () => {
    expect(setLineQty(lines, 1, 0)[0].qty).toBe(1);
    expect(setLineQty(lines, 1, 100_000)[0].qty).toBe(MAX_LINE_QTY);
  });

  it("ignores a product that isn't in the cart", () => {
    expect(setLineQty(lines, 99, 3)).toEqual(lines);
  });

  it("removes a product and leaves the others in order", () => {
    expect(removeLine(lines, 1)).toEqual([{ productId: 2, qty: 5 }]);
    expect(removeLine(lines, 99)).toEqual(lines);
  });
});

describe("parseIdList", () => {
  it("keeps valid, unique ids in order", () => {
    expect(parseIdList("3, 7,7,x,0,-1,2147483648,9")).toEqual([3, 7, 9]);
  });

  it("is empty for missing input", () => {
    expect(parseIdList(null)).toEqual([]);
    expect(parseIdList("")).toEqual([]);
  });

  it("caps the list at MAX_CART_LINES", () => {
    const many = Array.from({ length: MAX_CART_LINES + 10 }, (_, i) => i + 1).join(",");
    expect(parseIdList(many)).toHaveLength(MAX_CART_LINES);
  });
});
