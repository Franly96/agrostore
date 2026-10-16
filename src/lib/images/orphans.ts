/** Uploads not saved within this window are treated as abandoned (spec 002, §6). */
export const ORPHAN_AGE_MS = 24 * 60 * 60 * 1000;

/**
 * Pathnames to delete: blobs older than ORPHAN_AGE_MS that nothing in the
 * database points at. Recent uploads are left alone, since a seller may still
 * be filling in the form.
 */
export function selectOrphans(
  blobs: { pathname: string; uploadedAt: Date }[],
  referenced: ReadonlySet<string>,
  now: number,
): string[] {
  return blobs
    .filter((b) => now - b.uploadedAt.getTime() > ORPHAN_AGE_MS && !referenced.has(b.pathname))
    .map((b) => b.pathname);
}
