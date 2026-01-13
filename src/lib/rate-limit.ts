import { and, eq } from "drizzle-orm";
import { rateLimits } from "./schema";
import type { Database } from "./db";
import type { Session } from "next-auth";

// Rate limit configuration with environment variable overrides
const getRateLimitConfig = () => ({
  generate: {
    requests: Number(process.env.RATE_LIMIT_GENERATE_REQUESTS) || 10,
    anonRequests: Number(process.env.RATE_LIMIT_GENERATE_ANON_REQUESTS) || 3,
    proRequests: Number(process.env.RATE_LIMIT_GENERATE_PRO_REQUESTS) || 30,
    window: Number(process.env.RATE_LIMIT_GENERATE_WINDOW) || 60,
  },
  waitlist: {
    requests: Number(process.env.RATE_LIMIT_WAITLIST_REQUESTS) || 5,
    anonRequests: Number(process.env.RATE_LIMIT_WAITLIST_ANON_REQUESTS) || 3,
    proRequests: Number(process.env.RATE_LIMIT_WAITLIST_PRO_REQUESTS) || 10,
    window: Number(process.env.RATE_LIMIT_WAITLIST_WINDOW) || 300,
  },
  hooks: {
    requests: Number(process.env.RATE_LIMIT_HOOKS_REQUESTS) || 120,
    anonRequests: Number(process.env.RATE_LIMIT_HOOKS_ANON_REQUESTS) || 60,
    proRequests: Number(process.env.RATE_LIMIT_HOOKS_PRO_REQUESTS) || 300,
    window: Number(process.env.RATE_LIMIT_HOOKS_WINDOW) || 60,
  },
  fakeDoor: {
    requests: Number(process.env.RATE_LIMIT_FAKEDOOR_REQUESTS) || 20,
    anonRequests: Number(process.env.RATE_LIMIT_FAKEDOOR_ANON_REQUESTS) || 10,
    proRequests: Number(process.env.RATE_LIMIT_FAKEDOOR_PRO_REQUESTS) || 40,
    window: Number(process.env.RATE_LIMIT_FAKEDOOR_WINDOW) || 60,
  },
  favorites: {
    requests: Number(process.env.RATE_LIMIT_FAVORITES_REQUESTS) || 30,
    anonRequests: Number(process.env.RATE_LIMIT_FAVORITES_ANON_REQUESTS) || 10,
    proRequests: Number(process.env.RATE_LIMIT_FAVORITES_PRO_REQUESTS) || 60,
    window: Number(process.env.RATE_LIMIT_FAVORITES_WINDOW) || 60,
  },
  ratings: {
    requests: Number(process.env.RATE_LIMIT_RATINGS_REQUESTS) || 20,
    anonRequests: Number(process.env.RATE_LIMIT_RATINGS_ANON_REQUESTS) || 10,
    proRequests: Number(process.env.RATE_LIMIT_RATINGS_PRO_REQUESTS) || 40,
    window: Number(process.env.RATE_LIMIT_RATINGS_WINDOW) || 60,
  },
  analyze: {
    requests: Number(process.env.RATE_LIMIT_ANALYZE_REQUESTS) || 8,
    anonRequests: Number(process.env.RATE_LIMIT_ANALYZE_ANON_REQUESTS) || 2,
    proRequests: Number(process.env.RATE_LIMIT_ANALYZE_PRO_REQUESTS) || 20,
    window: Number(process.env.RATE_LIMIT_ANALYZE_WINDOW) || 3600,
  },
  admin: {
    requests: Number(process.env.RATE_LIMIT_ADMIN_REQUESTS) || 10,
    anonRequests: 0, // No anonymous access
    proRequests: Number(process.env.RATE_LIMIT_ADMIN_PRO_REQUESTS) || 10,
    window: Number(process.env.RATE_LIMIT_ADMIN_WINDOW) || 60,
  },
});

const RATE_LIMITS = getRateLimitConfig();

export type RateLimitAction = keyof typeof RATE_LIMITS;
export type RateLimitTier = "anon" | "free" | "pro" | "admin";

/**
 * Rate limit identifier - can be an IP address or a user ID
 * Using user ID for authenticated users prevents proxy/VPN bypass
 */
export type RateLimitIdentifier =
  | { type: "ip"; value: string }
  | { type: "user"; value: string }
  | { type: "device"; value: string };

function resolveRequests(action: RateLimitAction, tier?: RateLimitTier) {
  const config = RATE_LIMITS[action];
  if (!tier || tier === "free") {
    return config.requests;
  }
  if (tier === "anon") {
    return config.anonRequests ?? config.requests;
  }
  if (tier === "admin" || tier === "pro") {
    return config.proRequests ?? config.requests;
  }
  return config.requests;
}

async function hashFingerprint(value: string) {
  if (!value) return null;
  const data = new TextEncoder().encode(value);
  if (globalThis.crypto?.subtle) {
    const digest = await globalThis.crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  const { createHash } = await import("crypto");
  return createHash("sha256").update(value).digest("hex");
}

export async function getDeviceFingerprint(
  request: Request,
): Promise<string | null> {
  // Collect comprehensive device fingerprint data
  const parts: string[] = [];

  // Browser identity
  parts.push(request.headers.get("user-agent") || "");

  // Content preferences
  parts.push(request.headers.get("accept-language") || "");
  parts.push(request.headers.get("accept-encoding") || "");
  parts.push(request.headers.get("accept") || "");

  // Client Hints (Sec-CH-UA headers)
  parts.push(request.headers.get("sec-ch-ua") || "");
  parts.push(request.headers.get("sec-ch-ua-mobile") || "");
  parts.push(request.headers.get("sec-ch-ua-platform") || "");
  parts.push(request.headers.get("sec-ch-ua-arch") || "");
  parts.push(request.headers.get("sec-ch-ua-bitness") || "");
  parts.push(request.headers.get("sec-ch-ua-model") || "");

  // Fetch metadata
  parts.push(request.headers.get("sec-fetch-site") || "");
  parts.push(request.headers.get("sec-fetch-mode") || "");
  parts.push(request.headers.get("sec-fetch-user") || "");
  parts.push(request.headers.get("sec-fetch-dest") || "");

  // Other identifying headers
  parts.push(request.headers.get("dnt") || "");
  parts.push(request.headers.get("save-data") || "");
  parts.push(request.headers.get("viewport-width") || "");

  // IP address (already validated by getClientIp)
  parts.push(getClientIp(request));

  const raw = parts.join("|").trim();
  if (!raw) return null;

  return hashFingerprint(raw);
}

export function deriveUserTier(session?: Session | null): RateLimitTier {
  if (!session?.user?.id) return "anon";
  const role = (session.user.role || "").toLowerCase();
  if (role === "admin") return "admin";
  if (role === "pro" || role === "paid") return "pro";
  return "free";
}

export async function getRateLimitContext(
  request: Request,
  session?: Session | null,
): Promise<{ identifier: RateLimitIdentifier; tier: RateLimitTier }> {
  if (session?.user?.id) {
    return {
      identifier: { type: "user", value: session.user.id },
      tier: deriveUserTier(session),
    };
  }

  const fingerprint = await getDeviceFingerprint(request);
  if (fingerprint) {
    return { identifier: { type: "device", value: fingerprint }, tier: "anon" };
  }

  return {
    identifier: { type: "ip", value: getClientIp(request) },
    tier: "anon",
  };
}

export async function checkRateLimit(
  db: Database,
  identifier: RateLimitIdentifier | string,
  action: RateLimitAction,
  tier: RateLimitTier = "free",
): Promise<{ allowed: boolean; retryAfter?: number }> {
  // Backward compatibility: allow string as identifier (treat as IP)
  const id =
    typeof identifier === "string"
      ? { type: "ip" as const, value: identifier }
      : identifier;

  const { window } = RATE_LIMITS[action];
  const requests = resolveRequests(action, tier);
  const now = Date.now();

  // Use both IP-based and user-based keys for dual rate limiting
  // User-based rate limiting is more secure for authenticated users
  const tierKey = tier ? `tier:${tier}` : "tier:free";
  const idPrefix =
    id.type === "user" ? "user" : id.type === "device" ? "device" : "ip";
  const rateLimitKey = `${tierKey}:${idPrefix}:${id.value}`;

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

/**
 * IPv4 address validation pattern.
 * Matches valid IPv4 addresses (0.0.0.0 - 255.255.255.255).
 */
const IPV4_PATTERN =
  /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

/**
 * IPv6 address validation pattern.
 * Matches valid IPv6 addresses including compressed forms.
 */
const IPV6_PATTERN =
  /^(?:(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|(?:[0-9a-fA-F]{1,4}:){1,7}:|(?:[0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|(?:[0-9a-fA-F]{1,4}:){1,5}(?::[0-9a-fA-F]{1,4}){1,2}|(?:[0-9a-fA-F]{1,4}:){1,4}(?::[0-9a-fA-F]{1,4}){1,3}|(?:[0-9a-fA-F]{1,4}:){1,3}(?::[0-9a-fA-F]{1,4}){1,4}|(?:[0-9a-fA-F]{1,4}:){1,2}(?::[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:(?:(?::[0-9a-fA-F]{1,4}){1,6})|:(?:(?::[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(?::[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]+|::(?:ffff(?::0{1,4})?:)?(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)|(?:[0-9a-fA-F]{1,4}:){1,4}:(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?))$/;

/**
 * Validates whether a string is a valid IP address (IPv4 or IPv6).
 */
export function isValidIpAddress(ip: string): boolean {
  return IPV4_PATTERN.test(ip) || IPV6_PATTERN.test(ip);
}

/**
 * Extracts and validates the client IP address from request headers.
 * Returns "unknown" if no valid IP is found, preventing injection attacks.
 *
 * Security: Validates IP format before returning to prevent injection
 * of malicious values through cf-connecting-ip or x-forwarded-for headers.
 */
export function getClientIp(request: Request): string {
  const header =
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for") ||
    request.headers.get("x-real-ip");

  if (!header) return "unknown";

  const rawIp = header.split(",")[0]?.trim();
  if (!rawIp) return "unknown";

  // Validate IP format to prevent injection
  if (isValidIpAddress(rawIp)) {
    return rawIp;
  }

  // Log suspicious IP format for security monitoring
  console.warn(
    `Security: Invalid IP format detected in headers: ${rawIp.substring(0, 50)}`,
  );

  return "unknown";
}
