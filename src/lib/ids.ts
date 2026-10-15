const MAX_INT4 = 2147483647;

/** Parses a positive Postgres int4 id from a route param or form value; null if invalid. */
export function parseId(value: unknown): number | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const s = String(value);
  if (!/^\d{1,10}$/.test(s)) return null;
  const n = Number(s);
  return n >= 1 && n <= MAX_INT4 ? n : null;
}
