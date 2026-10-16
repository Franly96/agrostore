import { isOwnPathname } from "@/src/lib/images/paths";
import { MAX_UPLOAD_BYTES } from "@/src/lib/images/resize";
import { handleImageTokenRequest } from "@/src/lib/images/token-route";

// Client-upload tokens for product photos: signed-in sellers only, files under
// products/{sellerId}/, 60 per hour (spec 002, §4).
export function POST(request: Request) {
  return handleImageTokenRequest(request, {
    isAllowedPathname: isOwnPathname,
    rateKey: "upload",
    perHour: 60,
    maxBytes: MAX_UPLOAD_BYTES,
  });
}
