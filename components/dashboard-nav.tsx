"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navItemClass, type DashboardLink } from "./dashboard-links";

export function DashboardNav({ links }: { links: readonly DashboardLink[] }) {
  const pathname = usePathname();
  return <DashboardNavList links={links} activeHref={activeHref(links, pathname)} />;
}

function activeHref(links: readonly DashboardLink[], pathname: string) {
  return links
    .filter((l) => pathname === l.href || pathname.startsWith(`${l.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;
}

export function DashboardNavList({
  links,
  activeHref,
}: {
  links: readonly DashboardLink[];
  activeHref?: string;
}) {
  return (
    <ul className="flex gap-2 md:flex-col">
      {links.map((l) => {
        const active = l.href === activeHref;
        return (
          <li key={l.href}>
            <Link
              href={l.href}
              aria-current={active ? "page" : undefined}
              className={`${navItemClass} ${
                active
                  ? "bg-green-600 text-surface hover:bg-green-800"
                  : "text-ink hover:bg-green-100 hover:text-green-800"
              }`}
            >
              {l.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
