import type { Metadata } from "next";
import { Suspense } from "react";
import { SearchBar } from "@/components/agrostore";
import { CatalogSearch } from "@/components/catalog-search";
import { ProductList, ProductListSkeleton } from "@/components/ui/product-list";

export const metadata: Metadata = { title: "Productos" };

export default function Page({ searchParams }: PageProps<"/productos">) {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 md:px-6">
      <h1 className="text-heading text-ink">Productos</h1>
      <div className="mt-4">
        {/* CatalogSearch reads the URL on the client, so it needs its own boundary. */}
        <Suspense fallback={<SearchBar action="/productos" placeholder="Buscar por nombre…" />}>
          <CatalogSearch />
        </Suspense>
      </div>
      <div className="mt-6">
        <Suspense fallback={<ProductListSkeleton />}>
          <ProductList searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
  );
}
