import { getCloudflareContext as getOpenNextContext } from "@opennextjs/cloudflare";
import { AppError } from "./errors";
import { createDb, type Database } from "./db";

export interface EnvBindings {
  DB?: D1Database;
  AI?: Ai;
  CACHE_KV?: KVNamespace;
  NEXT_INC_CACHE_KV?: KVNamespace;
  NEXT_TAG_CACHE_KV?: KVNamespace;
  NEXTAUTH_SECRET?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
  NEXTAUTH_URL?: string;
  AI_MODEL_SIZE?: string;
  AI_STREAMING?: string;
  LOG_DRAIN_URL?: string;
  LOG_DRAIN_TOKEN?: string;
  LOG_DRAIN_PROVIDER?: string;
  LOG_LEVEL?: string;
  ALERT_WEBHOOK_URL?: string;
  R2_BACKUPS?: R2Bucket;
}

/**
 * Gets environment bindings from Cloudflare context or process.env.
 * In production Cloudflare Workers, bindings come from wrangler.toml [vars] and secrets.
 * In development, they come from process.env or Cloudflare context via getPlatformProxy.
 */
export function getBindings(): EnvBindings {
  try {
    const context = getOpenNextContext();
    if (context?.env && typeof context.env === "object") {
      // Merge Cloudflare context with process.env for any missing values
      return {
        ...process.env,
        ...context.env,
      } as EnvBindings;
    }
  } catch {
    // Continue to process.env fallback
  }
  // Return process.env for build-time and fallback scenarios
  return process.env as unknown as EnvBindings;
}

/**
 * Helper function to get the raw D1 database binding with error handling.
 * Use this for service factories that expect raw D1 (e.g., createRatingService).
 *
 * @throws {AppError} If database binding is unavailable
 * @returns {D1Database} The D1 database instance
 *
 * @example
 * ```ts
 * export const POST = withErrorHandler(async () => {
 *   const d1 = getD1(); // Throws if unavailable
 *   const service = await createRatingService(d1);
 *   return successResponse({ result });
 * });
 * ```
 */
export function getD1(): D1Database {
  const env = getBindings();
  if (!env.DB) {
    throw new AppError("ENV_MISSING", "Database binding unavailable", 500);
  }
  return env.DB as D1Database;
}

/**
 * Helper function to get the Drizzle database instance with error handling.
 * Use this for queries using the Drizzle ORM (e.g., checkRateLimit).
 *
 * @throws {AppError} If database binding is unavailable
 * @returns {Database} The Drizzle database instance
 *
 * @example
 * ```ts
 * export const GET = withErrorHandler(async () => {
 *   const db = getDB(); // Throws if unavailable
 *   const results = await db.select().from(users);
 *   return successResponse({ users: results });
 * });
 * ```
 */
export function getDB(): Database {
  return createDb(getD1());
}

/**
 * Get KV namespace for caching
 */
export function getKV(): KVNamespace | null {
  const env = getBindings();
  return env.CACHE_KV || env.NEXT_INC_CACHE_KV || null;
}

export async function getCloudflareContext() {
  return getOpenNextContext({ async: true });
}
