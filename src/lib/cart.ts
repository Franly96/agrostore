import { parseId } from "@/src/lib/ids";

// Cart lines kept in the browser (localStorage) until the server-side cart of spec 003 lands.
// A line is a reference to a product and a quantity. It never holds a price: prices and
// availability always come from the database when the cart is shown or an order is placed.

export const CART_STORAGE_KEY = "agrostore.cart";
/** Distinct products in the cart (spec 003, D2). */
export const MAX_CART_LINES = 30;
export const MAX_LINE_QTY = 999;

export type CartLine = { productId: number; qty: number };

export type AddResult =
  /** Everything requested was added. */
  | { status: "added"; lines: CartLine[]; added: number }
  /** Only part of it fit under the limit. */
  | { status: "capped"; lines: CartLine[]; added: number }
  /** The cart already holds the most that can be bought of this product. */
  | { status: "maxed"; lines: CartLine[]; added: 0 }
  /** A new product, but the cart already has MAX_CART_LINES products. */
  | { status: "full"; lines: CartLine[]; added: 0 };

/** What the cart page shows about a product, read from the database (`/api/cart`). */
export type CartProduct = {
  id: number;
  name: string;
  priceCents: number;
  unit: string;
  stock: number;
  unlimitedStock: boolean;
  imageUrl: string | null;
  sellerId: number;
  sellerName: string;
};

/** Reads the stored cart. Anything malformed is dropped; repeated products are merged. */
export function parseCart(raw: string | null): CartLine[] {
  if (!raw) return [];
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(data)) return [];

  const merged = new Map<number, number>();
  for (const item of data) {
    if (typeof item !== "object" || item === null) continue;
    const { productId, qty } = item as Record<string, unknown>;
    if (typeof productId !== "number" || parseId(productId) === null) continue;
    if (typeof qty !== "number" || !Number.isInteger(qty) || qty < 1) continue;
    if (!merged.has(productId) && merged.size >= MAX_CART_LINES) continue;
    merged.set(productId, Math.min((merged.get(productId) ?? 0) + qty, MAX_LINE_QTY));
  }
  return [...merged].map(([productId, qty]) => ({ productId, qty }));
}

/** Sets the quantity of a product that is in the cart (1 to MAX_LINE_QTY). */
export function setLineQty(lines: CartLine[], productId: number, qty: number): CartLine[] {
  const next = Math.min(Math.max(1, Math.floor(qty)), MAX_LINE_QTY);
  return lines.map((l) => (l.productId === productId ? { ...l, qty: next } : l));
}

export function removeLine(lines: CartLine[], productId: number): CartLine[] {
  return lines.filter((l) => l.productId !== productId);
}

/** Ids from a comma-separated query param ("3,7,7,x"): valid, unique, at most MAX_CART_LINES. */
export function parseIdList(value: string | null): number[] {
  if (!value) return [];
  const ids = new Set<number>();
  for (const part of value.split(",")) {
    const id = parseId(part.trim());
    if (id !== null) ids.add(id);
    if (ids.size >= MAX_CART_LINES) break;
  }
  return [...ids];
}

/**
 * Adds `qty` of a product, keeping the quantity in the cart at or below `max` (the stock, or
 * MAX_LINE_QTY when it is unlimited). Pure: returns the new lines without touching storage.
 */
export function addLine(lines: CartLine[], productId: number, qty: number, max: number): AddResult {
  const limit = Math.min(Math.max(1, Math.floor(max)), MAX_LINE_QTY);
  const current = lines.find((l) => l.productId === productId);
  if (!current && lines.length >= MAX_CART_LINES) return { status: "full", lines, added: 0 };

  const have = current?.qty ?? 0;
  const room = limit - have;
  if (room <= 0) return { status: "maxed", lines, added: 0 };

  const wanted = Math.max(1, Math.floor(qty));
  const added = Math.min(wanted, room);
  const next = current
    ? lines.map((l) => (l.productId === productId ? { ...l, qty: have + added } : l))
    : [...lines, { productId, qty: added }];
  return { status: added < wanted ? "capped" : "added", lines: next, added };
}
