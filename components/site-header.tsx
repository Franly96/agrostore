import Link from "next/link";
import { Suspense } from "react";
import { AccountLink } from "@/components/account-link";
import { CartLink } from "@/components/cart-link";
import { navLinkClass } from "@/components/nav-link-class";

function NavLink({ href, children }: { href: string; children: string }) {
  return (
    <li>
      <Link href={href} className={navLinkClass}>
        {children}
      </Link>
    </li>
  );
}

export function SiteHeader() {
  return (
    <header className="border-b border-line bg-surface">
      <nav className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 px-4 py-2 md:px-6 md:py-3">
        <Link
          href="/"
          className="order-1 inline-flex min-h-11 items-center rounded-sm text-title font-extrabold text-green-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600"
        >
          Agrostore
        </Link>

        <ul className="order-3 -mx-4 flex w-[calc(100%+2rem)] gap-5 overflow-x-auto border-t border-line px-4 md:order-2 md:mx-0 md:w-auto md:gap-6 md:overflow-visible md:border-0 md:px-0">
          <NavLink href="/productos">Productos</NavLink>
        </ul>

        <ul className="order-2 ml-auto flex items-center gap-4 md:order-3 md:gap-6">
          <CartLink />
          <Suspense fallback={null}>
            <AccountLink />
          </Suspense>
        </ul>
      </nav>
    </header>
  );
}
