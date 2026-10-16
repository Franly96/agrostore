// Browser-only: shrinks a phone photo before upload (spec 002, D2).
export const MAX_EDGE = 1600;
export const MIN_SHORT_EDGE = 600;
export const MAX_ORIGINAL_BYTES = 25 * 1024 * 1024;
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

/** Profile photos: square, 512px, small. */
export const AVATAR_EDGE = 512;
export const AVATAR_MIN_EDGE = 200;
export const MAX_AVATAR_BYTES = 1024 * 1024;

export type ResizeOptions = {
  /** Long edge after resizing (default 1600). */
  maxEdge?: number;
  /** Smaller photos are rejected with "La foto es muy pequeña" (default 600). */
  minShortEdge?: number;
  /** Center-crop to a square first (profile photos). */
  square?: boolean;
};

export type ResizedImage = {
  blob: Blob;
  width: number;
  height: number;
  /** "webp" normally, "jpg" when the browser can't encode WebP. */
  extension: "webp" | "jpg";
};

export class ImageError extends Error {}

export const IMAGE_ERRORS = {
  notPhoto: "Ese archivo no es una foto.",
  tooSmall: "La foto es muy pequeña",
  tooLarge: "La foto es demasiado grande.",
} as const;

/** Scale so the long edge is at most `max`; never upscales. */
export function fitWithin(width: number, height: number, max = MAX_EDGE) {
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/** Centered square crop of the source (the whole image when `square` is false). */
export function sourceRect(width: number, height: number, square: boolean) {
  if (!square) return { sx: 0, sy: 0, sw: width, sh: height };
  const side = Math.min(width, height);
  return { sx: Math.round((width - side) / 2), sy: Math.round((height - side) / 2), sw: side, sh: side };
}

export async function resizeImage(
  file: File,
  { maxEdge = MAX_EDGE, minShortEdge = MIN_SHORT_EDGE, square = false }: ResizeOptions = {},
): Promise<ResizedImage> {
  if (!file.type.startsWith("image/")) throw new ImageError(IMAGE_ERRORS.notPhoto);
  if (file.size > MAX_ORIGINAL_BYTES) throw new ImageError(IMAGE_ERRORS.tooLarge);

  let bitmap: ImageBitmap;
  try {
    // "from-image" applies EXIF rotation so portrait phone photos aren't sideways.
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    // e.g. HEIC the browser can't decode.
    throw new ImageError(IMAGE_ERRORS.notPhoto);
  }

  try {
    if (Math.min(bitmap.width, bitmap.height) < minShortEdge) {
      throw new ImageError(IMAGE_ERRORS.tooSmall);
    }
    const { sx, sy, sw, sh } = sourceRect(bitmap.width, bitmap.height, square);
    const { width, height } = fitWithin(sw, sh, maxEdge);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new ImageError(IMAGE_ERRORS.notPhoto);
    ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, width, height);

    // Browsers that can't encode WebP silently return PNG, so check the type.
    const webp = await toBlob(canvas, "image/webp", 0.82);
    if (webp && webp.type === "image/webp") {
      return { blob: webp, width, height, extension: "webp" };
    }
    const jpeg = await toBlob(canvas, "image/jpeg", 0.85);
    if (!jpeg) throw new ImageError(IMAGE_ERRORS.notPhoto);
    return { blob: jpeg, width, height, extension: "jpg" };
  } finally {
    bitmap.close();
  }
}
