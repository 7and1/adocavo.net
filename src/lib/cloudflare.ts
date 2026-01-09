import { getCloudflareContext as getOpenNextContext } from "@opennextjs/cloudflare";
import { AppError } from "./errors";
import { createDb, type Database } from "./db";

export interface EnvBindings {
  DB: D1Database;
  AI: Ai;
  NEXTAUTH_SECRET: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  NEXTAUTH_URL: string;
  AI_MODEL_SIZE?: string;
  AI_STREAMING?: string;
}

function isValidEnvBindings(obj: unknown): obj is EnvBindings {
  if (typeof obj !== "object" || obj === null) {
    return false;
  }
  const env = obj as Record<string, unknown>;
  return (
    "DB" in env &&
    "AI" in env &&
    "NEXTAUTH_SECRET" in env &&
    "GOOGLE_CLIENT_ID" in env &&
    "GOOGLE_CLIENT_SECRET" in env &&
    "GITHUB_CLIENT_ID" in env &&
    "GITHUB_CLIENT_SECRET" in env &&
    "NEXTAUTH_URL" in env
  );
}

export function getBindings(): EnvBindings {
  try {
    const context = getOpenNextContext();
    if (isValidEnvBindings(context.env)) {
      return context.env;
    }
  } catch {
    // Continue to process.env fallback
  }
  if (isValidEnvBindings(process.env)) {
    return process.env;
  }
  // Return partial bindings for build-time scenarios
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

export async function getCloudflareContext() {
  return getOpenNextContext({ async: true });
}
