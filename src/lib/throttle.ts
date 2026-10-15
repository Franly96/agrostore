import "server-only";
import { sql } from "drizzle-orm";
import { headers } from "next/headers";
import { db } from "@/src/db";
import { rateLimits } from "@/src/db/schema";

// Better Auth's rate limiter only covers its HTTP endpoints (/api/auth/*), not
// auth.api calls made from server actions, so the login action uses this.
// Fixed-window counters in the shared rate_limits table, keys prefixed "action:".
// For these rows last_request holds the window start (epoch ms).

/** Counts one attempt; returns false when `key` is over `max` in the current window. */
export async function consumeAttempt(key: string, max: number, windowMs: number): Promise<boolean> {
  const now = Date.now();
  const windowStart = now - windowMs;
  const fullKey = `action:${key}`;
  const [row] = await db
    .insert(rateLimits)
    .values({ key: fullKey, count: 1, lastRequest: now })
    .onConflictDoUpdate({
      target: rateLimits.key,
      set: {
        count: sql`case when ${rateLimits.lastRequest} < ${windowStart} then 1 else ${rateLimits.count} + 1 end`,
        lastRequest: sql`case when ${rateLimits.lastRequest} < ${windowStart} then ${now} else ${rateLimits.lastRequest} end`,
      },
    })
    .returning({ count: rateLimits.count });
  return row.count <= max;
}

/** Client IP as reported by the hosting proxy; "unknown" locally. */
export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}
