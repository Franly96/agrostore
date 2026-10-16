// Browser-only: shrinks a phone photo before upload (spec 002, D2).
export const MAX_EDGE = 1600;
export const MIN_SHORT_EDGE = 600;
export const MAX_ORIGINAL_BYTES = 25 * 1024 * 1024;
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

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

export async function resizeImage(file: File): Promise<ResizedImage> {
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
    if (Math.min(bitmap.width, bitmap.height) < MIN_SHORT_EDGE) {
      throw new ImageError(IMAGE_ERRORS.tooSmall);
    }
    const { width, height } = fitWithin(bitmap.width, bitmap.height);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new ImageError(IMAGE_ERRORS.notPhoto);
    ctx.drawImage(bitmap, 0, 0, width, height);

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
