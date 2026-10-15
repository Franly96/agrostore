import Link from "next/link";
import { AddToCartButton } from "@/components/add-to-cart";
import { CategoryChips, ProductCard, centsToPesos } from "@/components/agrostore";
import { Pagination } from "@/components/pagination";
import { MAX_LINE_QTY } from "@/src/lib/cart";
import {
  CATALOG_PAGE_SIZE,
  countCatalogByCategory,
  listCatalogProducts,
} from "@/src/lib/data/catalog";
import { compareCategories, groupByCategory } from "@/src/lib/data/store";
import { buildHref, paginate, parsePage, readParam } from "@/src/lib/list-query";

const gridClass = "grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4";

/**
 * In-stock products filtered by name (`?q=`) and category (`?categoria=`), one page at a time
 * (`?pagina=`), with one section per category and the existing categories as quick filters.
 */
export async function ProductList({
  searchParams,
}: {
  searchParams: PageProps<"/productos">["searchParams"];
}) {
  const params = await searchParams;
  const q = readParam(params.q);
  const category = readParam(params.categoria, 60);

  const counts = (await countCatalogByCategory(q)).sort((a, b) =>
    compareCategories(a.category, b.category),
  );
  const allTotal = counts.reduce((sum, c) => sum + c.total, 0);
  const total = category ? (counts.find((c) => c.category === category)?.total ?? 0) : allTotal;
  const pagination = paginate(total, parsePage(params.pagina), CATALOG_PAGE_SIZE);
  const items =
    total > 0
      ? await listCatalogProducts({
          q,
          category,
          offset: pagination.offset,
          limit: pagination.limit,
        })
      : [];

  const chipHref = (categoria: string) => buildHref("/productos", { q, categoria });
  const chips = [
    { value: "", label: "Todas", count: allTotal, href: chipHref("") },
    ...counts.map((c) => ({
      value: c.category,
      label: c.category,
      count: c.total,
      href: chipHref(c.category),
    })),
  ];
  // Keep the active category visible even when the search leaves it empty.
  if (category && !counts.some((c) => c.category === category)) {
    chips.push({ value: category, label: category, count: 0, href: chipHref(category) });
  }

  const filtered = q !== "" || category !== "";

  return (
    <div>
      {counts.length > 0 || category ? (
        <CategoryChips
          options={chips}
          value={category}
          scroll
          label="Filtrar por categoría"
          className="-mx-1 px-1 pt-1 md:flex-wrap md:overflow-visible"
        />
      ) : null}

      {total === 0 ? (
        <div className="mt-6 rounded-md border border-line bg-surface p-6 text-center">
          <p className="text-title text-ink">
            {filtered
              ? "Ningún producto coincide con tu búsqueda"
              : "Por ahora no hay productos disponibles"}
          </p>
          {filtered ? (
            <Link
              href="/productos"
              className="mt-2 inline-flex min-h-11 items-center rounded-sm text-body-sm font-semibold text-green-600 hover:text-green-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600"
            >
              Ver todos
            </Link>
          ) : null}
        </div>
      ) : (
        <>
          <p className="mt-4 text-body-sm text-ink-muted">
            {total} {total === 1 ? "producto" : "productos"}
            {q ? <> para “{q}”</> : null}
          </p>
          <div className="mt-6 flex flex-col gap-10">
            {groupByCategory(items).map(({ category: name, items: group }, i) => (
              <section key={name} aria-labelledby={`categoria-${i}`}>
                <h2 id={`categoria-${i}`} className="mb-4 text-title text-ink">
                  {name}
                </h2>
                <div className={gridClass}>
                  {group.map((p) => (
                    <ProductCard
                      key={p.id}
                      href={`/productos/${p.id}`}
                      name={p.name}
                      price={centsToPesos(p.priceCents)}
                      unit={p.unit}
                      seller={p.sellerName}
                      province={p.province ?? undefined}
                      imageSrc={p.imageUrl ?? undefined}
                      badges={p.organic ? [{ label: "Orgánico", tone: "green" }] : []}
                      action={
                        <AddToCartButton
                          productId={p.id}
                          name={p.name}
                          max={p.unlimitedStock ? MAX_LINE_QTY : p.stock}
                        />
                      }
                      className="max-w-none"
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
          <Pagination
            page={pagination.page}
            pages={pagination.pages}
            path="/productos"
            params={{ q, categoria: category }}
          />
        </>
      )}
    </div>
  );
}

export function ProductListSkeleton() {
  return (
    <div aria-busy="true">
      <div className="flex animate-pulse gap-2 overflow-hidden">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-11 w-24 flex-none rounded-pill border border-line bg-surface" />
        ))}
      </div>
      <div className="mt-6 mb-4 h-6 w-32 animate-pulse rounded-sm bg-line" />
      <div className={gridClass}>
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex animate-pulse flex-col overflow-hidden rounded-md border border-line bg-surface"
          >
            <div className="aspect-[4/3] bg-green-100" />
            <div className="flex flex-col gap-2 p-4">
              <div className="h-5 w-3/4 rounded-sm bg-line" />
              <div className="h-4 w-1/2 rounded-sm bg-line" />
              <div className="h-6 w-2/5 rounded-sm bg-line" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
