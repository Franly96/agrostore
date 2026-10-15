export type DashboardLink = { href: string; label: string };

export const navItemClass =
  "inline-flex min-h-11 w-full items-center whitespace-nowrap rounded-pill px-4 text-body-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600";

export const SELLER_LINKS: readonly DashboardLink[] = [
  { href: "/panel/productos", label: "Mis productos" },
  { href: "/panel/productos/nuevo", label: "Publicar producto" },
  { href: "/panel/cuenta", label: "Mi cuenta" },
];

export const ADMIN_LINKS: readonly DashboardLink[] = [
  { href: "/admin/vendedores", label: "Vendedores" },
  { href: "/admin/vendedores/nuevo", label: "Nuevo vendedor" },
  { href: "/admin/cuenta", label: "Mi cuenta" },
];
