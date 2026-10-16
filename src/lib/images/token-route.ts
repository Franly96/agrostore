import "server-only";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/src/lib/dal";
import { consumeAttempt } from "@/src/lib/throttle";

const HOUR = 60 * 60 * 1000;

type Options = {
  /** Ownership rule for the requested pathname (the signed-in seller's folder). */
  isAllowedPathname: (pathname: string, sellerId: number) => boolean;
  /** Rate-limit bucket, e.g. "upload" → key `upload:{sellerId}`. */
  rateKey: string;
  perHour: number;
  maxBytes: number;
};

/**
 * Issues a short-lived client token so a seller's browser can upload a resized
 * photo straight to Blob. Used by route handlers (not server actions) so they
 * answer 401/403 JSON instead of redirecting. Saving the URL happens later, in a
 * server action that re-validates it; onUploadCompleted isn't used (it can't
 * reach localhost).
 */
export async function handleImageTokenRequest(request: Request, options: Options) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (user.role !== "seller") return NextResponse.json({ error: "Prohibido" }, { status: 403 });

  let body: HandleUploadBody;
  try {
    body = (await request.json()) as HandleUploadBody;
  } catch {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }

  try {
    const result = await handleUpload({
      request,
      body,
      onBeforeGenerateToken: async (pathname) => {
        if (!options.isAllowedPathname(pathname, user.id)) {
          throw new Error("pathname is outside the seller's folder");
        }
        if (!(await consumeAttempt(`${options.rateKey}:${user.id}`, options.perHour, HOUR))) {
          throw new RateLimited();
        }
        return {
          allowedContentTypes: ["image/webp", "image/jpeg"],
          maximumSizeInBytes: options.maxBytes,
          addRandomSuffix: true,
        };
      },
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof RateLimited) {
      return NextResponse.json({ error: "Demasiadas fotos. Inténtalo más tarde." }, { status: 429 });
    }
    console.error(`${options.rateKey} token`, error);
    return NextResponse.json({ error: "No se pudo preparar la subida" }, { status: 400 });
  }
}

class RateLimited extends Error {}
