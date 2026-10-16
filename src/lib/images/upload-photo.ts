import { upload } from "@vercel/blob/client";
import type { PhotoUploader } from "@/components/agrostore";
import { ImageError, resizeImage, MAX_UPLOAD_BYTES } from "./resize";
import { sellerPrefix } from "./paths";

const FAILED = "No pudimos subir la foto. Revisa tu conexión e inténtalo de nuevo.";

/**
 * Browser side of the upload flow: shrink the photo, then send it straight to
 * Blob with a token from /api/uploads/product-image (scoped to this seller).
 */
export function productPhotoUploader(sellerId: number): PhotoUploader {
  return async (file, onProgress) => {
    const { blob, width, height, extension } = await resizeImage(file);
    if (blob.size > MAX_UPLOAD_BYTES) throw new ImageError("La foto es demasiado grande.");
    try {
      const result = await upload(`${sellerPrefix(sellerId)}foto.${extension}`, blob, {
        access: "public",
        handleUploadUrl: "/api/uploads/product-image",
        contentType: blob.type,
        onUploadProgress: ({ percentage }) => onProgress(percentage),
      });
      return { url: result.url, pathname: result.pathname, width, height };
    } catch {
      throw new Error(FAILED);
    }
  };
}
