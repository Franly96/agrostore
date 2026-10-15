"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { SearchBar } from "@/components/agrostore";
import { buildHref } from "@/src/lib/list-query";

/**
 * Product-name search for /productos. Reads the URL so the box shows the active term, and keeps
 * the selected category when searching (a new search always goes back to page 1).
 */
export function CatalogSearch() {
  const router = useRouter();
  const params = useSearchParams();
  const q = params.get("q") ?? "";
  const categoria = params.get("categoria") ?? undefined;

  return (
    // key: remount when the term in the URL changes (e.g. "Ver todos") so the box follows it.
    <SearchBar
      key={q}
      defaultValue={q}
      action="/productos"
      placeholder="Buscar por nombre…"
      onSearch={(value) => router.push(buildHref("/productos", { q: value.trim(), categoria }))}
    />
  );
}
