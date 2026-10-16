import { describe, expect, it } from "vitest";
import { ORPHAN_AGE_MS, selectOrphans } from "./orphans";

const now = Date.parse("2026-10-16T12:00:00Z");
const ago = (ms: number) => new Date(now - ms);

describe("selectOrphans", () => {
  const blobs = [
    { pathname: "products/7/saved.webp", uploadedAt: ago(3 * ORPHAN_AGE_MS) },
    { pathname: "products/7/abandoned.webp", uploadedAt: ago(ORPHAN_AGE_MS + 1) },
    { pathname: "products/7/in-progress.webp", uploadedAt: ago(60_000) },
  ];

  it("deletes only old files nothing points at", () => {
    expect(selectOrphans(blobs, new Set(["products/7/saved.webp"]), now)).toEqual([
      "products/7/abandoned.webp",
    ]);
  });

  it("never touches recent uploads, even unreferenced", () => {
    expect(selectOrphans(blobs, new Set(), now)).not.toContain("products/7/in-progress.webp");
  });
});
