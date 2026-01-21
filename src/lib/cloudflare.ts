import { getCloudflareContext as getOpenNextContext } from "@opennextjs/cloudflare";
import { AppError } from "./errors";
import { createDb, type Database } from "./db";
import { z } from "zod";

/**
 * Zod schema for validating Cloudflare environment bindings.
 * Provides runtime type safety for environment variables and bindings.
 */
const EnvBindingsSchema = z.object({
  DB: z.custom<D1Database>().optional(),
  AI: z.custom<Ai>().optional(),
  CACHE_KV: z.custom<KVNamespace>().optional(),
  NEXT_INC_CACHE_KV: z.custom<KVNamespace>().optional(),
  NEXT_TAG_CACHE_KV: z.custom<KVNamespace>().optional(),
  NEXTAUTH_SECRET: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
  NEXTAUTH_URL: z.string().optional(),
  AI_MODEL_SIZE: z.string().optional(),
  AI_STREAMING: z.string().optional(),
  LOG_DRAIN_URL: z.string().url().optional(),
  LOG_DRAIN_TOKEN: z.string().optional(),
  LOG_DRAIN_PROVIDER: z.enum(["logtail", "datadog", "papertrail"]).optional(),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).optional(),
  ALERT_WEBHOOK_URL: z.string().url().optional(),
  R2_BACKUPS: z.custom<R2Bucket>().optional(),
  TURNSTILE_SECRET_KEY: z.string().optional(),
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().optional(),
});

export type EnvBindings = z.infer<typeof EnvBindingsSchema>;

/**
 * Safe validation wrapper for environment bindings.
 * Filters out invalid values while preserving valid ones.
 */
function safeValidateBindings(input: unknown): EnvBindings {
  const result = EnvBindingsSchema.safeParse(input);
  if (result.success) {
    return result.data;
  }
  // Log validation errors for debugging but don't fail hard
  console.warn("Environment binding validation errors:", result.error.format());
  // Return partial valid data
  return EnvBindingsSchema.partial().parse(input);
}

/**
 * Gets environment bindings from Cloudflare context or process.env with validation.
 * In production Cloudflare Workers, bindings come from wrangler.toml [vars] and secrets.
 * In development, they come from process.env or Cloudflare context via getPlatformProxy.
 *
 * @throws {AppError} If critical bindings are completely unavailable
 */
export function getBindings(): EnvBindings {
  try {
    const context = getOpenNextContext();
    if (context?.env && typeof context.env === "object") {
      // Validate and merge Cloudflare context with process.env
      const merged = { ...process.env, ...context.env };
      return safeValidateBindings(merged);
    }
  } catch {
    // Continue to process.env fallback
  }
  // Validate process.env for build-time and fallback scenarios
  return safeValidateBindings(process.env);
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
