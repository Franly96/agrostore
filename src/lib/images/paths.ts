export const MAX_IMAGES = 5;

export function sellerPrefix(sellerId: number): string {
  return `products/${sellerId}/`;
}

// A pathname is the seller's own when it sits directly under their prefix.
// `..` and nested folders are rejected so a prefix check can't be walked out of.
export function isOwnPathname(pathname: string, sellerId: number): boolean {
  const prefix = sellerPrefix(sellerId);
  if (!pathname.startsWith(prefix)) return false;
  const rest = pathname.slice(prefix.length);
  return rest.length > 0 && !rest.includes("/") && !rest.includes("..");
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
