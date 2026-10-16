export const MAX_IMAGES = 5;

/** Folder for a seller's product photos. */
export function sellerPrefix(sellerId: number): string {
  return `products/${sellerId}/`;
}

/** Folder for a seller's profile photo. */
export function avatarPrefix(sellerId: number): string {
  return `vendors/${sellerId}/`;
}

// A file sits directly under `prefix`: no nested folders and no `..`, so a
// prefix check can't be walked out of.
function isDirectlyUnder(pathname: string, prefix: string): boolean {
  if (!pathname.startsWith(prefix)) return false;
  const rest = pathname.slice(prefix.length);
  return rest.length > 0 && !rest.includes("/") && !rest.includes("..");
}

/** True when the pathname is one of this seller's product photos. */
export function isOwnPathname(pathname: string, sellerId: number): boolean {
  return isDirectlyUnder(pathname, sellerPrefix(sellerId));
}

/** True when the pathname is this seller's profile photo. */
export function isOwnAvatarPathname(pathname: string, sellerId: number): boolean {
  return isDirectlyUnder(pathname, avatarPrefix(sellerId));
}

// The URL must be https on our Blob host and point at the given pathname.
export function isOwnBlobUrl(
  url: string,
  pathname: string,
  hostname: string | null,
): boolean {
  if (!hostname) return false;
  try {
    const u = new URL(url);
    return (
      u.protocol === "https:" &&
      u.hostname === hostname &&
      u.port === "" &&
      u.search === "" &&
      u.pathname === `/${pathname}`
    );
  } catch {
    return false;
  }
}

/** The Blob pathname of a public Blob URL (`https://host/a/b.webp` → `a/b.webp`), or null. */
export function pathnameFromUrl(url: string): string | null {
  try {
    const u = new URL(url);
    return u.protocol === "https:" && u.pathname.length > 1 ? decodeURIComponent(u.pathname.slice(1)) : null;
  } catch {
    return null;
  }
}

const BLOB_HOST_SUFFIX = ".public.blob.vercel-storage.com";

/**
 * Whether a stored profile photo URL is safe to render with next/image: https on a
 * public Blob host, under that seller's own folder. Guards against a bad value in
 * `users.image` (next/image throws for hosts outside `remotePatterns`).
 */
export function isDisplayableAvatar(url: string | null, sellerId: number): url is string {
  if (!url) return false;
  try {
    const u = new URL(url);
    if (u.protocol !== "https:" || !u.hostname.endsWith(BLOB_HOST_SUFFIX) || u.search !== "") return false;
    return isOwnAvatarPathname(decodeURIComponent(u.pathname.slice(1)), sellerId);
  } catch {
    return false;
  }
}
