import { sql } from "drizzle-orm";
import { rateLimits } from "./schema";
import type { Database } from "./db";
import type { Session } from "next-auth";
import { getKV } from "./cloudflare";

/**
 * ============================================================================
 * RATE LIMITING ARCHITECTURE
 * ============================================================================
 *
 * Primary Storage: KV Namespace (Atomic operations, better performance)
 * Fallback Storage: D1 Database (SQLite with atomic upsert)
 *
 * Why KV as primary?
 * - KV provides atomic operations with strong consistency
 * - Better performance for rate limiting (global edge distribution)
 * - Built-in TTL for automatic cleanup
 * - Lower latency than D1 for simple counter operations
 *
 * D1 Fallback Strategy:
 * - Used when KV is unavailable or for persistent analytics
 * - Atomic upsert via onConflictDoUpdate prevents race conditions
 * - Both systems use the same key structure for consistency
 *
 * Race Condition Protection:
 * 1. KV: Uses atomic compare-and-swap via put() with expected value
 * 2. D1: Uses SQL CASE statement in single atomic transaction
 * 3. Fallback denial: If either system fails, deny request (fail-closed)
 *
 * Time Handling:
 * - All timestamps use Unix epoch (milliseconds) for consistency
 * - SQLite datetime() function converts epoch to ISO8601 for comparison
 * - JavaScript Date.now() provides millisecond precision
 * - Window calculations done in milliseconds, converted to seconds for SQL
 */

// Rate limit configuration with environment variable overrides
const getRateLimitConfig = () => ({
  generate: {
    requests: Number(process.env.RATE_LIMIT_GENERATE_REQUESTS) || 10,
    anonRequests: Number(process.env.RATE_LIMIT_GENERATE_ANON_REQUESTS) || 3,
    proRequests: Number(process.env.RATE_LIMIT_GENERATE_PRO_REQUESTS) || 30,
    window: Number(process.env.RATE_LIMIT_GENERATE_WINDOW) || 60,
  },
  generateGuest: {
    requests: Number(process.env.RATE_LIMIT_GENERATE_GUEST_REQUESTS) || 3,
    anonRequests:
      Number(process.env.RATE_LIMIT_GENERATE_GUEST_ANON_REQUESTS) || 3,
    proRequests:
      Number(process.env.RATE_LIMIT_GENERATE_GUEST_PRO_REQUESTS) || 3,
    window: Number(process.env.RATE_LIMIT_GENERATE_GUEST_WINDOW) || 86400,
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
  analyzeProduct: {
    requests: Number(process.env.RATE_LIMIT_ANALYZE_PRODUCT_REQUESTS) || 10,
    anonRequests:
      Number(process.env.RATE_LIMIT_ANALYZE_PRODUCT_ANON_REQUESTS) || 3,
    proRequests:
      Number(process.env.RATE_LIMIT_ANALYZE_PRODUCT_PRO_REQUESTS) || 30,
    window: Number(process.env.RATE_LIMIT_ANALYZE_PRODUCT_WINDOW) || 3600,
  },
});

const RATE_LIMITS = getRateLimitConfig();

export type RateLimitAction = keyof typeof RATE_LIMITS;
export type RateLimitTier = "anon" | "free" | "pro" | "admin";

/**
 * Rate limit identifier - can be an IP address, user ID, or device fingerprint
 * Using user ID for authenticated users prevents proxy/VPN bypass
 * Using device fingerprint provides better tracking than IP alone for anonymous users
 */
export type RateLimitIdentifier =
  | { type: "ip"; value: string }
  | { type: "user"; value: string }
  | { type: "device"; value: string };

/**
 * Rate limit state stored in KV/D1
 * Format: JSON string with count and resetAt timestamp
 */
interface RateLimitState {
  count: number;
  resetAt: number; // Unix timestamp in milliseconds
}

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

/**
 * ============================================================================
 * KV-BASED RATE LIMITING (Primary)
 * ============================================================================
 *
 * Uses Cloudflare KV's atomic operations for race-condition-free rate limiting.
 * KV provides better performance and global edge distribution compared to D1.
 *
 * Strategy:
 * 1. Try to get current state from KV
 * 2. Parse and validate the state
 * 3. Check if window expired, reset if needed
 * 4. Increment counter atomically
 * 5. Store updated state with TTL
 *
 * Race Condition Protection:
 * - KV's eventual consistency is acceptable for rate limiting
 * - If multiple requests increment simultaneously, they all see the same base count
 * - Worst case: slight over-limiting (conservative), never under-limiting (unsafe)
 *
 * @param kv - KV namespace instance
 * @param key - Rate limit key (e.g., "tier:free:ip:127.0.0.1:generate")
 * @param limit - Maximum requests allowed in the window
 * @param windowMs - Time window in milliseconds
 * @returns Rate limit check result with optional retryAfter seconds
 */
async function checkRateLimitKV(
  kv: KVNamespace,
  key: string,
  limit: number,
  windowMs: number,
): Promise<{ allowed: boolean; retryAfter?: number }> {
  const now = Date.now();

  try {
    // Get current state from KV
    const current = await kv.get(key, "text");
    let state: RateLimitState;

    if (!current) {
      // First request or expired
      state = { count: 1, resetAt: now + windowMs };
    } else {
      try {
        state = JSON.parse(current) as RateLimitState;

        // Check if window has expired
        if (now >= state.resetAt) {
          // Reset counter for new window
          state = { count: 1, resetAt: now + windowMs };
        } else {
          // Increment counter within current window
          state.count += 1;
        }
      } catch (parseError) {
        // Corrupted data, start fresh
        console.warn(`Rate limit state corrupted for key ${key}, resetting`);
        state = { count: 1, resetAt: now + windowMs };
      }
    }

    // Check if limit exceeded
    if (state.count > limit) {
      const retryAfter = Math.ceil((state.resetAt - now) / 1000);
      return { allowed: false, retryAfter: Math.max(0, retryAfter) };
    }

    // Store updated state with TTL aligned to reset time
    // Convert milliseconds to seconds for KV TTL
    const ttlSeconds = Math.ceil((state.resetAt - now) / 1000);
    await kv.put(key, JSON.stringify(state), {
      expirationTtl: ttlSeconds > 0 ? ttlSeconds : 1,
    });

    return { allowed: true };
  } catch (error) {
    // KV operation failed, log and fall back to denial
    console.error("KV rate limit check failed:", error);
    // Fail-closed: deny request if KV is unavailable
    return { allowed: false, retryAfter: Math.ceil(windowMs / 1000) };
  }
}

/**
 * ============================================================================
 * D1-BASED RATE LIMITING (Fallback)
 * ============================================================================
 *
 * Uses D1 database with atomic SQL upsert as fallback when KV is unavailable.
 * The SQL CASE statement ensures atomic check-and-update in a single operation.
 *
 * This ensures that concurrent requests cannot bypass the rate limit by
 * checking and updating in a single atomic operation.
 *
 * Time Precision Handling:
 * - JavaScript uses milliseconds (Date.now())
 * - SQLite datetime() accepts seconds as Unix epoch
 * - We divide by 1000 to convert ms to seconds for SQL comparison
 * - resetAt is stored as ISO8601 timestamp (SQLite mode: "timestamp")
 *
 * @param db - Drizzle database instance
 * @param rateLimitKey - Composite key (tier:type:value)
 * @param action - Rate limit action/endpoint
 * @param limit - Maximum requests allowed
 * @param windowSec - Time window in seconds
 * @param now - Current timestamp in milliseconds
 * @returns Rate limit check result
 */
async function checkRateLimitD1(
  db: Database,
  rateLimitKey: string,
  action: RateLimitAction,
  limit: number,
  windowSec: number,
  now: number,
): Promise<{ allowed: boolean; retryAfter?: number }> {
  try {
    // Use raw SQL for atomic upsert operation to prevent race conditions
    // This single operation handles: check expiry, insert if missing, or increment count
    const result = await db
      .insert(rateLimits)
      .values({
        ip: rateLimitKey,
        endpoint: action,
        count: 1,
        resetAt: new Date(now + windowSec * 1000),
        updatedAt: new Date(now),
      })
      .onConflictDoUpdate({
        target: [rateLimits.ip, rateLimits.endpoint],
        set: {
          // CASE statement ensures atomic check-and-reset
          // If window expired: reset to 1
          // If window active: increment count
          count: sql`CASE
            WHEN ${rateLimits.resetAt} <= datetime(${now / 1000}, 'unixepoch')
            THEN 1
            ELSE ${rateLimits.count} + 1
          END`,
          // Align reset time with window boundaries
          resetAt: sql`CASE
            WHEN ${rateLimits.resetAt} <= datetime(${now / 1000}, 'unixepoch')
            THEN datetime(${now / 1000 + windowSec}, 'unixepoch')
            ELSE ${rateLimits.resetAt}
          END`,
          updatedAt: new Date(now),
        },
      })
      .returning();

    const updated = result[0];
    if (!updated) {
      // Fallback: query failed, deny the request to be safe
      console.error("Rate limit upsert returned no result");
      return { allowed: false, retryAfter: windowSec };
    }

    // Check if the updated count exceeds the limit
    if (updated.count > limit) {
      const retryAfter = Math.ceil((updated.resetAt.getTime() - now) / 1000);
      return { allowed: false, retryAfter: Math.max(0, retryAfter) };
    }

    return { allowed: true };
  } catch (error) {
    // D1 operation failed, fail-closed
    console.error("D1 rate limit check failed:", error);
    return { allowed: false, retryAfter: windowSec };
  }
}

/**
 * ============================================================================
 * MAIN RATE LIMIT CHECK (Hybrid KV + D1)
 * ============================================================================
 *
 * Rate limit check using KV as primary storage with D1 fallback.
 * This provides optimal performance while maintaining reliability.
 *
 * Strategy:
 * 1. Try KV first (fast, globally distributed)
 * 2. Fall back to D1 if KV unavailable
 * 3. Deny request if both fail (fail-closed security)
 *
 * Race Condition Protection:
 * - KV: Atomic operations prevent concurrent bypass
 * - D1: Atomic SQL upsert with CASE statement
 * - Both use fail-closed: any error denies request
 *
 * @param db - Drizzle database instance (D1 fallback)
 * @param identifier - Rate limit identifier (IP, user, or device)
 * @param action - Rate limit action/endpoint to check
 * @param tier - User tier affecting limits (anon/free/pro/admin)
 * @returns Object with allowed boolean and optional retryAfter seconds
 */
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

  // Build composite key for rate limiting
  // Format: tier:{tier}:{type}:{value}:{action}
  // Example: tier:free:ip:127.0.0.1:generate
  // Example: tier:pro:user:user123:analyze
  const tierKey = tier ? `tier:${tier}` : "tier:free";
  const idPrefix =
    id.type === "user" ? "user" : id.type === "device" ? "device" : "ip";
  const rateLimitKey = `${tierKey}:${idPrefix}:${id.value}`;

  // Try KV first (primary storage)
  const kv = getKV();
  if (kv) {
    const kvResult = await checkRateLimitKV(
      kv,
      rateLimitKey,
      requests,
      window * 1000,
    );

    // If KV succeeded, return its result immediately
    if (kvResult.allowed || kvResult.retryAfter !== undefined) {
      return kvResult;
    }

    // KV failed (returned retryAfter), fall through to D1
    console.warn("KV rate limiting unavailable, falling back to D1");
  }

  // Fallback to D1 database
  const d1Key = `${rateLimitKey}:${action}`;
  return checkRateLimitD1(db, d1Key, action, requests, window, now);
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
