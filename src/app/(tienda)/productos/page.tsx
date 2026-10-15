import type { Metadata } from "next";
import { SearchBar } from "@/components/agrostore";

export const metadata: Metadata = { title: "Productos" };

export default function Page() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 md:px-6">
      <h1 className="text-heading text-ink">Productos</h1>
      <SearchBar action="/productos" className="mt-4" />
      <p className="mt-4 text-body text-ink-muted">Catálogo de productos con búsqueda y filtros por categoría y provincia.</p>
    </main>
  );
}
