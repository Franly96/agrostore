"use client";

import { ShoppingCart } from "lucide-react";
import Link from "next/link";
import { navLinkClass } from "@/components/nav-link-class";
import { useCartLines } from "@/src/lib/cart-store";

/**
 * Icon-only, so the accessible name comes from aria-label (it carries the count too). -mr-2
 * lines the glyph up with the page edge while keeping the full 44px tap target. The badge counts
 * distinct products, since quantities mix units (libras, docenas, cajas).
 */
export function CartLink() {
  const count = useCartLines().length;
  const label =
    count > 0 ? `Carrito, ${count} ${count === 1 ? "producto" : "productos"}` : "Carrito";

  return (
    <li className="-mr-2">
      <Link
        href="/carrito"
        aria-label={label}
        title="Carrito"
        className={`${navLinkClass} relative min-w-11 justify-center`}
      >
        <ShoppingCart aria-hidden="true" size={24} />
        {count > 0 ? (
          <span
            aria-hidden="true"
            className="absolute right-0.5 top-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-pill bg-green-600 px-1 text-label text-surface"
          >
            {count}
          </span>
        ) : null}
      </Link>
    </li>
  );
}
