import { and, eq } from "drizzle-orm";
import { rateLimits } from "./schema";
import type { Database } from "./db";

// Rate limit configuration with environment variable overrides
const getRateLimitConfig = () => ({
  generate: {
    requests: Number(process.env.RATE_LIMIT_GENERATE_REQUESTS) || 10,
    window: Number(process.env.RATE_LIMIT_GENERATE_WINDOW) || 60,
  },
  waitlist: {
    requests: Number(process.env.RATE_LIMIT_WAITLIST_REQUESTS) || 3,
    window: Number(process.env.RATE_LIMIT_WAITLIST_WINDOW) || 300,
  },
  hooks: {
    requests: Number(process.env.RATE_LIMIT_HOOKS_REQUESTS) || 100,
    window: Number(process.env.RATE_LIMIT_HOOKS_WINDOW) || 60,
  },
  fakeDoor: {
    requests: Number(process.env.RATE_LIMIT_FAKEDOOR_REQUESTS) || 20,
    window: Number(process.env.RATE_LIMIT_FAKEDOOR_WINDOW) || 60,
  },
  favorites: {
    requests: Number(process.env.RATE_LIMIT_FAVORITES_REQUESTS) || 30,
    window: Number(process.env.RATE_LIMIT_FAVORITES_WINDOW) || 60,
  },
  ratings: {
    requests: Number(process.env.RATE_LIMIT_RATINGS_REQUESTS) || 20,
    window: Number(process.env.RATE_LIMIT_RATINGS_WINDOW) || 60,
  },
});

const RATE_LIMITS = getRateLimitConfig();

export type RateLimitAction = keyof typeof RATE_LIMITS;

/**
 * Rate limit identifier - can be an IP address or a user ID
 * Using user ID for authenticated users prevents proxy/VPN bypass
 */
export type RateLimitIdentifier =
  | { type: "ip"; value: string }
  | { type: "user"; value: string };

export async function checkRateLimit(
  db: Database,
  identifier: RateLimitIdentifier | string,
  action: RateLimitAction,
): Promise<{ allowed: boolean; retryAfter?: number }> {
  // Backward compatibility: allow string as identifier (treat as IP)
  const id =
    typeof identifier === "string"
      ? { type: "ip" as const, value: identifier }
      : identifier;

  const { requests, window } = RATE_LIMITS[action];
  const now = Date.now();

  // Use both IP-based and user-based keys for dual rate limiting
  // User-based rate limiting is more secure for authenticated users
  const rateLimitKey =
    id.type === "user" ? `user:${id.value}` : `ip:${id.value}`;

  const existing = await db.query.rateLimits.findFirst({
    where: and(
      eq(rateLimits.ip, rateLimitKey),
      eq(rateLimits.endpoint, action),
    ),
  });

  if (!existing || existing.resetAt <= new Date(now)) {
    await db
      .insert(rateLimits)
      .values({
        ip: rateLimitKey,
        endpoint: action,
        count: 1,
        resetAt: new Date(now + window * 1000),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [rateLimits.ip, rateLimits.endpoint],
        set: {
          count: 1,
          resetAt: new Date(now + window * 1000),
          updatedAt: new Date(),
        },
      });

    return { allowed: true };
  }

  if (existing.count >= requests) {
    const retryAfter = Math.ceil((existing.resetAt.getTime() - now) / 1000);
    return { allowed: false, retryAfter };
  }

  await db
    .update(rateLimits)
    .set({ count: existing.count + 1, updatedAt: new Date() })
    .where(
      and(eq(rateLimits.ip, rateLimitKey), eq(rateLimits.endpoint, action)),
    );

  return { allowed: true };
}

export function getClientIp(request: Request): string {
  const header =
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for") ||
    request.headers.get("x-real-ip");

  if (!header) return "unknown";

  return header.split(",")[0]?.trim() || "unknown";
}
