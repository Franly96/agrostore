import { del, list } from "@vercel/blob";
import { inArray, isNotNull } from "drizzle-orm";
import { db } from "@/src/db";
import { productImages, users } from "@/src/db/schema";
import { selectOrphans, ORPHAN_AGE_MS } from "@/src/lib/images/orphans";
import { pathnameFromUrl } from "@/src/lib/images/paths";

// Daily Vercel Cron (vercel.json): deletes photos that were uploaded but never
// saved, e.g. the seller closed the tab before pressing "Guardar". Vercel sends
// `Authorization: Bearer ${CRON_SECRET}`; anything else gets 401.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }

  const now = Date.now();
  try {
    const products = await sweep("products/", now, async (pathnames) => {
      const rows = await db
        .select({ pathname: productImages.pathname })
        .from(productImages)
        .where(inArray(productImages.pathname, pathnames));
      return new Set(rows.map((r) => r.pathname));
    });

    // Few sellers, so read every profile photo once.
    const avatarRows = await db.select({ image: users.image }).from(users).where(isNotNull(users.image));
    const avatars = new Set(avatarRows.map((r) => (r.image ? pathnameFromUrl(r.image) : null)).filter((p) => p !== null));
    const vendors = await sweep("vendors/", now, async () => avatars);

    return Response.json({ deleted: { products, vendors } });
  } catch (error) {
    console.error("cleanup-images failed", error);
    return Response.json({ error: "cleanup failed" }, { status: 500 });
  }
}

/** Lists every blob under `prefix`, page by page, and deletes the orphans. Returns how many. */
async function sweep(
  prefix: string,
  now: number,
  referencedAmong: (pathnames: string[]) => Promise<ReadonlySet<string>>,
): Promise<number> {
  let cursor: string | undefined;
  let deleted = 0;
  do {
    const page = await list({ prefix, cursor, limit: 1000 });
    const old = page.blobs.filter((b) => now - b.uploadedAt.getTime() > ORPHAN_AGE_MS);
    if (old.length > 0) {
      const referenced = await referencedAmong(old.map((b) => b.pathname));
      const orphans = selectOrphans(old, referenced, now);
      if (orphans.length > 0) {
        await del(orphans);
        deleted += orphans.length;
      }
    }
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return deleted;
}
