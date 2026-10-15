import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { signOut } from "@/src/lib/auth-actions";
import { type DashboardLink, navItemClass } from "./dashboard-links";
import { DashboardNav, DashboardNavList } from "./dashboard-nav";

/** Shared layout for /vendor and /admin: swipeable section row on phones, sidebar from md. */
export function DashboardShell({
  title,
  links,
  children,
}: {
  title: string;
  links: readonly DashboardLink[];
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-surface-soft">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-2 md:px-6">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center rounded-sm text-title font-extrabold text-green-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600"
          >
            Agrostore
          </Link>
          <span className="text-body-sm font-semibold text-ink-muted">{title}</span>
          <form action={signOut} className="ml-auto">
            <button
              type="submit"
              className="ag-btn ag-btn-ghost ag-btn-sm min-h-11"
            >
              Salir
            </button>
          </form>
        </div>
      </header>
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 px-4 py-4 md:flex-row md:gap-6 md:px-6 md:py-6">
        <nav
          aria-label={title}
          className="-mx-4 overflow-x-auto px-4 md:mx-0 md:w-56 md:shrink-0 md:overflow-visible md:px-0"
        >
          <Suspense fallback={<DashboardNavList links={links} />}>
            <DashboardNav links={links} />
          </Suspense>
          <Link
            href="/"
            className={`${navItemClass} mt-2 hidden text-ink-muted hover:bg-green-100 hover:text-green-800 md:flex`}
          >
            ← Ver tienda
          </Link>
        </nav>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
