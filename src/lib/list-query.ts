// Helpers for URL-driven lists: query-string params, search terms and pagination.
// Pure functions (no DB, no Next), shared by the catalog and the seller and admin lists.

type Param = string | string[] | undefined;

/** Rows per page in the seller and admin tables. The store grid has its own size. */
export const LIST_PAGE_SIZE = 10;

const MAX_PAGE = 100_000;

/** First value of a query param, trimmed and capped; "" when missing. */
export function readParam(value: Param, maxLength = 80): string {
  const first = Array.isArray(value) ? value[0] : value;
  return typeof first === "string" ? first.trim().slice(0, maxLength) : "";
}

/** 1-based page from the `pagina` param; anything invalid is page 1. */
export function parsePage(value: Param): number {
  const raw = readParam(value, 10);
  if (!/^\d+$/.test(raw)) return 1;
  return Math.min(Math.max(Number(raw), 1), MAX_PAGE);
}

export type Pagination = {
  page: number;
  pages: number;
  total: number;
  offset: number;
  limit: number;
};

/** Clamps the requested page into 1..pages, so a stale `?pagina=9` shows the last page. */
export function paginate(total: number, requestedPage: number, pageSize: number): Pagination {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(1, requestedPage), pages);
  return { page, pages, total, offset: (page - 1) * pageSize, limit: pageSize };
}

/** `path` plus a query string, leaving out empty params. */
export function buildHref(path: string, params: Record<string, string | number | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `${path}?${query}` : path;
}

/** Lowercase and accent-free, so "platano" finds "Plátano" and "pina" finds "piña". */
export function normalizeSearch(text: string) {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

/** `%term%` for LIKE, with `%`, `_` and `\` escaped so they match literally. */
export function likePattern(term: string) {
  return `%${term.replace(/[\\%_]/g, "\\$&")}%`;
}
