import Link from "next/link";
import { Suspense } from "react";
import { AccountLink, SignInLink } from "@/components/account-link";

const linkClass =
  "inline-flex min-h-11 items-center whitespace-nowrap rounded-sm text-body-sm font-semibold text-ink hover:text-green-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600";

function NavLink({
  href,
  children,
  className,
}: {
  href: string;
  children: string;
  className?: string;
}) {
  return (
    <li className={className}>
      <Link href={href} className={linkClass}>
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
          <NavLink href="/pedidos" className="md:hidden">
            Mis pedidos
          </NavLink>
          <NavLink href="/cuenta" className="md:hidden">
            Cuenta
          </NavLink>
        </ul>

        <ul className="order-2 ml-auto flex items-center gap-4 md:order-3 md:gap-6">
          <NavLink href="/pedidos" className="hidden md:block">
            Mis pedidos
          </NavLink>
          <NavLink href="/cuenta" className="hidden md:block">
            Cuenta
          </NavLink>
          <NavLink href="/carrito">Carrito</NavLink>
          <li>
            <Suspense fallback={<SignInLink />}>
              <AccountLink />
            </Suspense>
          </li>
        </ul>
      </nav>
    </header>
  );
}
