import "server-only";
import { BlobNotFoundError, del, head } from "@vercel/blob";
import { isOwnBlobUrl } from "./paths";

// Server-side check for an uploaded file the browser reports back. The client
// can send anything, so before saving we confirm, with `head()` against our own
// store, that the file exists, is an image, and that the URL is exactly the one
// our store gives for that pathname (so a URL from another host or another
// store is rejected). No hostname config is needed: the store answers for itself.

export type UploadedFile = { url: string; pathname: string };

/**
 * True when `file` is an image in our Blob store at `file.pathname` and `file.url`
 * is its public URL. `isAllowedPathname` is the ownership rule (seller's folder).
 */
export async function verifyUpload(
  file: UploadedFile,
  isAllowedPathname: (pathname: string) => boolean,
): Promise<boolean> {
  if (!isAllowedPathname(file.pathname)) return false;
  let stored: Awaited<ReturnType<typeof head>>;
  try {
    stored = await head(file.pathname);
  } catch (error) {
    if (error instanceof BlobNotFoundError) return false;
    throw error;
  }
  if (!stored.contentType.startsWith("image/") || stored.pathname !== file.pathname) return false;
  return isOwnBlobUrl(file.url, file.pathname, new URL(stored.url).hostname);
}

/** Verifies every file (in parallel); true only when all of them pass. */
export async function verifyUploads(
  files: UploadedFile[],
  isAllowedPathname: (pathname: string) => boolean,
): Promise<boolean> {
  if (files.length === 0) return true;
  if (new Set(files.map((f) => f.pathname)).size !== files.length) return false;
  const results = await Promise.all(files.map((f) => verifyUpload(f, isAllowedPathname)));
  return results.every(Boolean);
}

/**
 * Deletes files from the store; failures are logged, never thrown (the daily
 * cleanup job catches anything left behind). Call it inside `after()`.
 */
export async function removeBlobs(pathnames: string[]): Promise<void> {
  if (pathnames.length === 0) return;
  try {
    await del(pathnames);
  } catch (error) {
    console.error("removeBlobs failed", error);
  }
}
