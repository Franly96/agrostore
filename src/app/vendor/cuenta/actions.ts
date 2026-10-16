"use server";

import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { after } from "next/server";
import { db } from "@/src/db";
import { users } from "@/src/db/schema";
import { auth } from "@/src/lib/auth";
import { requireRole } from "@/src/lib/dal";
import { removeBlobs, verifyUpload } from "@/src/lib/images/blob-store";
import { isOwnAvatarPathname, pathnameFromUrl } from "@/src/lib/images/paths";
import { AVATAR_MSG, avatarSchema } from "@/src/lib/validation/avatar";

export type AvatarResult = { ok: true; url: string | null } | { ok: false; message: string };

const FAILED: AvatarResult = { ok: false, message: "No pudimos guardar la foto. Inténtalo de nuevo." };

/** The seller's current photo file, if it's one of ours (so it can be deleted). */
async function currentAvatarPathname(sellerId: number) {
  const [row] = await db.select({ image: users.image }).from(users).where(eq(users.id, sellerId));
  const pathname = row?.image ? pathnameFromUrl(row.image) : null;
  return pathname && isOwnAvatarPathname(pathname, sellerId) ? pathname : null;
}

/** Saves an uploaded photo as the seller's profile photo and deletes the previous one. */
export async function setAvatar(input: unknown): Promise<AvatarResult> {
  const user = await requireRole("seller");
  const parsed = avatarSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: AVATAR_MSG };
  const { url, pathname } = parsed.data;

  try {
    const own = await verifyUpload({ url, pathname }, (p) => isOwnAvatarPathname(p, user.id));
    if (!own) return { ok: false, message: AVATAR_MSG };
    const previous = await currentAvatarPathname(user.id);
    // users is Better Auth's table: write through auth.api (AGENTS.md).
    await auth.api.updateUser({ body: { image: url }, headers: await headers() });
    if (previous && previous !== pathname) after(() => removeBlobs([previous]));
  } catch (error) {
    console.error("setAvatar failed", error);
    return FAILED;
  }
  return { ok: true, url };
}

/** Removes the seller's profile photo. */
export async function removeAvatar(): Promise<AvatarResult> {
  const user = await requireRole("seller");
  try {
    const previous = await currentAvatarPathname(user.id);
    await auth.api.updateUser({ body: { image: null }, headers: await headers() });
    if (previous) after(() => removeBlobs([previous]));
  } catch (error) {
    console.error("removeAvatar failed", error);
    return FAILED;
  }
  return { ok: true, url: null };
}
