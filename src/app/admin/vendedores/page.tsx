import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Badge, ButtonLink, SearchBar } from "@/components/agrostore";
import { FormAlert } from "@/components/form-alert";
import { requireRole } from "@/src/lib/dal";
import { Pagination } from "@/components/pagination";
import { LIST_PAGE_SIZE, paginate, parsePage, readParam } from "@/src/lib/list-query";
import { countVendors, listVendors } from "@/src/lib/data/vendors";
import { formatDrPhone } from "@/src/lib/validation/vendor";

export const metadata: Metadata = { title: "Vendedores" };

export default function Page({ searchParams }: PageProps<"/admin/vendedores">) {
  return (
    <main className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-heading text-ink">Vendedores</h1>
        <ButtonLink href="/admin/vendedores/nuevo">Nuevo vendedor</ButtonLink>
      </div>
      <Suspense fallback={<ListSkeleton />}>
        <Vendors searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

function StatusBadge({ banned }: { banned: boolean }) {
  return <Badge tone={banned ? "danger" : "green"}>{banned ? "Desactivado" : "Activo"}</Badge>;
}

async function Vendors({
  searchParams,
}: {
  searchParams: PageProps<"/admin/vendedores">["searchParams"];
}) {
  await requireRole("admin", "/admin/vendedores");
  const params = await searchParams;
  const { ok } = params;
  const query = readParam(params.q);
  const total = await countVendors(query);
  const pagination = paginate(total, parsePage(params.pagina), LIST_PAGE_SIZE);
  const vendors = total > 0 ? await listVendors(query, pagination) : [];

  return (
    <>
      {ok === "creado" ? <FormAlert tone="success">Vendedor creado.</FormAlert> : null}
      <SearchBar
        action="/admin/vendedores"
        defaultValue={query}
        placeholder="Buscar por finca, nombre o correo…"
        label="Buscar vendedores"
      />
      {vendors.length === 0 ? (
        <div className="rounded-md border border-line bg-surface p-6 text-center">
          <p className="text-title text-ink">
            {query ? "Ningún vendedor coincide con tu búsqueda" : "Todavía no hay vendedores"}
          </p>
          {query ? (
            <Link href="/admin/vendedores" className="mt-2 inline-block text-body-sm font-semibold text-green-600 hover:text-green-800">
              Ver todos
            </Link>
          ) : null}
        </div>
      ) : (
        <>
          <ul className="flex flex-col gap-2 md:hidden">
            {vendors.map((v) => (
              <li key={v.id}>
                <Link
                  href={`/admin/vendedores/${v.id}`}
                  className="flex flex-col gap-1 rounded-md border border-line bg-surface p-4 hover:border-ink-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600"
                >
                  <span className="flex items-start justify-between gap-2">
                    <span className="text-body font-semibold text-ink">{v.farmName ?? v.name}</span>
                    <StatusBadge banned={v.banned} />
                  </span>
                  <span className="text-body-sm text-ink-muted">
                    {v.name} · {formatDrPhone(v.phone)}
                  </span>
                  <span className="break-all text-body-sm text-ink-muted">{v.email}</span>
                  <span className="text-body-sm text-ink-muted">
                    {v.province} · {v.productCount} productos
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <div className="hidden overflow-x-auto rounded-md border border-line bg-surface md:block">
            <table className="w-full text-left">
              <thead className="border-b border-line bg-surface-soft">
                <tr className="text-label text-ink-muted">
                  <th className="px-4 py-2">Finca o negocio</th>
                  <th className="px-4 py-2">Contacto</th>
                  <th className="hidden px-4 py-2 lg:table-cell">Provincia</th>
                  <th className="px-4 py-2">Productos</th>
                  <th className="px-4 py-2">Estado</th>
                  <th className="px-4 py-2">
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {vendors.map((v) => (
                  <tr key={v.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-3 text-body font-semibold text-ink">{v.farmName ?? v.name}</td>
                    <td className="px-4 py-3">
                      <span className="block text-body-sm text-ink">{v.name}</span>
                      <span className="block break-all text-body-sm text-ink-muted">{v.email}</span>
                    </td>
                    <td className="hidden px-4 py-3 text-body-sm text-ink-muted lg:table-cell">{v.province}</td>
                    <td className="px-4 py-3 text-body-sm text-ink">{v.productCount}</td>
                    <td className="px-4 py-3">
                      <StatusBadge banned={v.banned} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <ButtonLink href={`/admin/vendedores/${v.id}`} variant="ghost" size="sm">
                        Editar
                      </ButtonLink>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            page={pagination.page}
            pages={pagination.pages}
            path="/admin/vendedores"
            params={{ q: query }}
          />
        </>
      )}
    </>
  );
}

function ListSkeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-2" aria-busy="true">
      <div className="h-12 rounded-pill border border-line bg-surface" />
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-24 rounded-md border border-line bg-surface md:h-14" />
      ))}
    </div>
  );
}
