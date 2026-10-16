import { isOwnAvatarPathname } from "@/src/lib/images/paths";
import { MAX_AVATAR_BYTES } from "@/src/lib/images/resize";
import { handleImageTokenRequest } from "@/src/lib/images/token-route";

// Client-upload tokens for the seller's profile photo: signed-in sellers only,
// files under vendors/{sellerId}/, 20 per hour.
export function POST(request: Request) {
  return handleImageTokenRequest(request, {
    isAllowedPathname: isOwnAvatarPathname,
    rateKey: "avatar-upload",
    perHour: 20,
    maxBytes: MAX_AVATAR_BYTES,
  });
}
