import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Badge, ButtonLink, PriceTag, centsToPesos } from "@/components/agrostore";
import { FormAlert } from "@/components/form-alert";
import { requireRole } from "@/src/lib/dal";
import { Pagination } from "@/components/pagination";
import { countSellerProducts, listSellerProducts } from "@/src/lib/data/products";
import { LIST_PAGE_SIZE, paginate, parsePage } from "@/src/lib/list-query";

export const metadata: Metadata = { title: "Mis productos" };

const OK_MESSAGES: Record<string, string> = {
  creado: "Producto publicado.",
  guardado: "Cambios guardados.",
};

export default function Page({ searchParams }: PageProps<"/vendor/productos">) {
  return (
    <main className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-heading text-ink">Mis productos</h1>
        <ButtonLink href="/vendor/productos/nuevo">Publicar producto</ButtonLink>
      </div>
      <Suspense fallback={<ListSkeleton />}>
        <SellerProducts searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

type Item = Awaited<ReturnType<typeof listSellerProducts>>[number];

function Availability({ item }: { item: Item }) {
  if (item.unlimitedStock) return <span className="text-body-sm text-ink-muted">Sin límite</span>;
  if (item.stock <= 0) return <Badge tone="danger">Agotado</Badge>;
  return (
    <span className="text-body-sm text-ink-muted">
      {item.stock} {item.unit}
    </span>
  );
}

async function SellerProducts({
  searchParams,
}: {
  searchParams: PageProps<"/vendor/productos">["searchParams"];
}) {
  const user = await requireRole("seller", "/vendor/productos");
  const params = await searchParams;
  const okMessage = typeof params.ok === "string" ? OK_MESSAGES[params.ok] : undefined;
  const total = await countSellerProducts(user.id);
  const pagination = paginate(total, parsePage(params.pagina), LIST_PAGE_SIZE);
  const items = total > 0 ? await listSellerProducts(user.id, pagination) : [];

  return (
    <>
      {okMessage ? <FormAlert tone="success">{okMessage}</FormAlert> : null}
      {items.length === 0 ? (
        <div className="rounded-md border border-line bg-surface p-6 text-center">
          <p className="text-title text-ink">Todavía no tienes productos</p>
          <p className="mt-2 text-body text-ink-muted">
            Publica tu primer producto para que los compradores lo vean en la tienda.
          </p>
        </div>
      ) : (
        <>
          <ul className="flex flex-col gap-2 md:hidden">
            {items.map((item) => (
              <li key={item.id}>
                <Link
                  href={`/vendor/productos/${item.id}`}
                  className="flex flex-col gap-1 rounded-md border border-line bg-surface p-4 hover:border-ink-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600"
                >
                  <span className="flex items-start justify-between gap-2">
                    <span className="text-body font-semibold text-ink">{item.name}</span>
                    {item.organic ? <Badge tone="green">Orgánico</Badge> : null}
                  </span>
                  <span className="text-body-sm text-ink-muted">{item.category}</span>
                  <span className="flex flex-wrap items-center justify-between gap-2">
                    <PriceTag amount={centsToPesos(item.priceCents)} unit={item.unit} />
                    <Availability item={item} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <div className="hidden overflow-hidden rounded-md border border-line bg-surface md:block">
            <table className="w-full text-left">
              <thead className="border-b border-line bg-surface-soft">
                <tr className="text-label text-ink-muted">
                  <th className="px-4 py-2">Producto</th>
                  <th className="px-4 py-2">Categoría</th>
                  <th className="px-4 py-2">Precio</th>
                  <th className="px-4 py-2">Disponible</th>
                  <th className="px-4 py-2">
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-3">
                      <span className="flex flex-wrap items-center gap-2 text-body font-semibold text-ink">
                        {item.name}
                        {item.organic ? <Badge tone="green">Orgánico</Badge> : null}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-body-sm text-ink-muted">{item.category}</td>
                    <td className="px-4 py-3">
                      <PriceTag amount={centsToPesos(item.priceCents)} unit={item.unit} />
                    </td>
                    <td className="px-4 py-3">
                      <Availability item={item} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <ButtonLink href={`/vendor/productos/${item.id}`} variant="ghost" size="sm">
                        Editar
                      </ButtonLink>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={pagination.page} pages={pagination.pages} path="/vendor/productos" />
        </>
      )}
    </>
  );
}

function ListSkeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-2" aria-busy="true">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-20 rounded-md border border-line bg-surface md:h-14" />
      ))}
    </div>
  );
}
