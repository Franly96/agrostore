// Client-only: the browser side of the cart. Components subscribe with `useCartLines`; the
// functions below write to localStorage and notify every subscriber (this tab through a custom
// event, other tabs through the native `storage` event).
import { useMemo, useSyncExternalStore } from "react";
import {
  CART_STORAGE_KEY,
  addLine,
  parseCart,
  removeLine,
  setLineQty,
  type AddResult,
  type CartLine,
} from "@/src/lib/cart";

const CART_CHANGED = "agrostore:cart-changed";

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CART_CHANGED, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CART_CHANGED, onChange);
  };
}

// localStorage can throw (blocked site data, private windows), so every access is guarded.
function readRaw(): string | null {
  try {
    return window.localStorage.getItem(CART_STORAGE_KEY);
  } catch {
    return null;
  }
}

function write(lines: CartLine[]): boolean {
  try {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(lines));
  } catch {
    return false;
  }
  window.dispatchEvent(new Event(CART_CHANGED));
  return true;
}

/** The cart lines; empty on the server and during hydration, then the stored cart. */
export function useCartLines(): CartLine[] {
  const raw = useSyncExternalStore(subscribe, readRaw, () => null);
  return useMemo(() => parseCart(raw), [raw]);
}

const noUnsubscribe = () => () => {};

/** False on the server and during hydration, true once the stored cart has been read. */
export function useCartReady(): boolean {
  return useSyncExternalStore(noUnsubscribe, () => true, () => false);
}

/** Adds to the stored cart. `max` caps the quantity of this product (stock or unlimited). */
export function addToCart(
  productId: number,
  qty: number,
  max: number,
): AddResult | { status: "error"; added: 0 } {
  const result = addLine(parseCart(readRaw()), productId, qty, max);
  if (result.added === 0) return result;
  return write(result.lines) ? result : { status: "error", added: 0 };
}

export function setCartQty(productId: number, qty: number) {
  return write(setLineQty(parseCart(readRaw()), productId, qty));
}

export function removeFromCart(productId: number) {
  return write(removeLine(parseCart(readRaw()), productId));
}
