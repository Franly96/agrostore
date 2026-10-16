import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/src/lib/dal";
import { isOwnPathname, sellerPrefix } from "@/src/lib/images/paths";
import { consumeAttempt } from "@/src/lib/throttle";

const MAX_BYTES = 4 * 1024 * 1024;
const HOUR = 60 * 60 * 1000;
const TOKENS_PER_HOUR = 60;

// Issues short-lived client tokens so the seller's browser can upload a resized
// photo straight to Blob. A route handler (not a server action) so it can answer
// 401/403 JSON instead of redirecting. Saving the URL happens later, in the
// product action, which re-validates it (we don't use onUploadCompleted).
export async function POST(request: Request) {
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
        if (!isOwnPathname(pathname, user.id)) {
          throw new Error(`pathname must be directly under ${sellerPrefix(user.id)}`);
        }
        if (!(await consumeAttempt(`upload:${user.id}`, TOKENS_PER_HOUR, HOUR))) {
          throw new RateLimited();
        }
        return {
          allowedContentTypes: ["image/webp", "image/jpeg"],
          maximumSizeInBytes: MAX_BYTES,
          addRandomSuffix: true,
        };
      },
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof RateLimited) {
      return NextResponse.json({ error: "Demasiadas fotos. Inténtalo más tarde." }, { status: 429 });
    }
    console.error("product-image token", error);
    return NextResponse.json({ error: "No se pudo preparar la subida" }, { status: 400 });
  }
}

class RateLimited extends Error {}
