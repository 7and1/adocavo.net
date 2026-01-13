/**
 * Environment variable validation
 * Validates all required environment variables on startup
 */

import { z } from "zod";

/**
 * Environment variable schema
 * Validates all required and optional environment variables
 */
const envSchema = z
  .object({
    // Auth (required)
    NEXTAUTH_URL: z.string().url("NEXTAUTH_URL must be a valid URL"),
    NEXTAUTH_SECRET: z
      .string()
      .min(32, "NEXTAUTH_SECRET must be at least 32 characters"),

    // Site URLs (required)
    NEXT_PUBLIC_SITE_URL: z
      .string()
      .url("NEXT_PUBLIC_SITE_URL must be a valid URL"),
    NEXT_PUBLIC_IMAGE_LOADER: z.string().default("cloudflare").optional(),

    // Node environment (default to production)
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("production"),

    // OAuth Providers (required in production)
    GOOGLE_CLIENT_ID: z.string().min(1).optional(),
    GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),
    GITHUB_CLIENT_ID: z.string().min(1).optional(),
    GITHUB_CLIENT_SECRET: z.string().min(1).optional(),

    // AI Configuration (optional with defaults)
    AI_MODEL_SIZE: z.string().default("8b").optional(),
    AI_STREAMING: z
      .string()
      .transform((val) => val === "true")
      .default("false")
      .optional(),

    // Log Drain (optional)
    LOG_DRAIN_PROVIDER: z.string().optional(),
    LOG_DRAIN_URL: z.string().url().optional(),
    LOG_DRAIN_TOKEN: z.string().optional(),
  })
  .refine(
    (data) => {
      // At least one OAuth provider must be configured in production
      if (data.NODE_ENV === "production") {
        return (
          (data.GOOGLE_CLIENT_ID && data.GOOGLE_CLIENT_SECRET) ||
          (data.GITHUB_CLIENT_ID && data.GITHUB_CLIENT_SECRET)
        );
      }
      return true;
    },
    {
      message:
        "At least one OAuth provider (Google or GitHub) must be configured in production",
    },
  );

export type Env = z.infer<typeof envSchema>;

/**
 * Validation error with detailed information
 */
export class EnvValidationError extends Error {
  public missing: string[];
  public invalid: Array<{ key: string; message: string }>;

  constructor(
    missing: string[],
    invalid: Array<{ key: string; message: string }>,
  ) {
    const missingMsg =
      missing.length > 0 ? `\n  Missing: ${missing.join(", ")}` : "";
    const invalidMsg =
      invalid.length > 0
        ? `\n  Invalid: ${invalid.map((i) => `${i.key} (${i.message})`).join(", ")}`
        : "";

    super(`Environment validation failed:${missingMsg}${invalidMsg}`);
    this.name = "EnvValidationError";
    this.missing = missing;
    this.invalid = invalid;
  }
}

/**
 * Validates environment variables
 * @throws {EnvValidationError} If validation fails
 * @returns {Env} Validated environment variables
 */
export function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.errors;
    const missing: string[] = [];
    const invalid: Array<{ key: string; message: string }> = [];

    for (const error of errors) {
      const path = error.path.join(".");
      if (error.code === "invalid_type") {
        missing.push(path);
      } else {
        invalid.push({ key: path, message: error.message });
      }
    }

    throw new EnvValidationError(missing, invalid);
  }

  return result.data;
}

/**
 * Validates Cloudflare bindings are available
 * @throws {Error} If bindings are missing
 */
export function validateBindings(bindings: {
  DB?: D1Database;
  AI?: Ai;
  NEXT_INC_CACHE_KV?: KVNamespace;
  NEXT_TAG_CACHE_KV?: KVNamespace;
}): void {
  const missing: string[] = [];

  if (!bindings.DB) {
    missing.push("DB (D1 Database)");
  }
  if (!bindings.AI) {
    missing.push("AI (Workers AI)");
  }
  if (!bindings.NEXT_INC_CACHE_KV) {
    missing.push("NEXT_INC_CACHE_KV");
  }
  if (!bindings.NEXT_TAG_CACHE_KV) {
    missing.push("NEXT_TAG_CACHE_KV");
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required Cloudflare bindings:\n  ${missing.join("\n  ")}\n\n` +
        `Check wrangler.toml configuration.`,
    );
  }
}

/**
 * Singleton for validated environment
 * Caches validation result to avoid repeated validation
 */
let validatedEnv: Env | null = null;

/**
 * Get validated environment variables
 * Validates on first call, returns cached result on subsequent calls
 * @returns {Env} Validated environment variables
 */
export function getEnv(): Env {
  if (!validatedEnv) {
    validatedEnv = validateEnv();
  }
  return validatedEnv;
}

/**
 * Validate and return environment with detailed error reporting
 * Use this in API routes to provide clear error messages
 * @returns {Env} Validated environment variables
 * @throws {Error} With detailed validation information
 */
export function validateEnvOrThrow(): Env {
  try {
    return getEnv();
  } catch (error) {
    if (error instanceof EnvValidationError) {
      console.error("Environment validation failed:");
      if (error.missing.length > 0) {
        console.error("  Missing variables:", error.missing.join(", "));
      }
      if (error.invalid.length > 0) {
        console.error(
          "  Invalid variables:",
          error.invalid.map((i) => `${i.key}: ${i.message}`).join(", "),
        );
      }
      throw error;
    }
    throw error;
  }
}
