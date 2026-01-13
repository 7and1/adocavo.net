import type { Session } from "next-auth";
import { eq } from "drizzle-orm";
import { AppError } from "@/lib/errors";
import { getBindings } from "@/lib/cloudflare";
import { createDb } from "@/lib/db";
import { users } from "@/lib/schema";
import { checkRateLimit } from "./rate-limit";

/**
 * Enforces stricter rate limits for admin endpoints.
 * Admin actions are sensitive and require tighter throttling.
 */
async function enforceAdminRateLimit(
  db: ReturnType<typeof createDb>,
  session: Session | null,
): Promise<void> {
  if (!session?.user?.id) {
    throw new AppError("UNAUTHORIZED", "Authentication required", 401);
  }

  // Check rate limit for admin user
  const rateResult = await checkRateLimit(
    db,
    { type: "user", value: session.user.id },
    "admin",
    "admin", // Admin tier gets the configured admin rate limit
  );

  if (!rateResult.allowed) {
    throw new AppError(
      "RATE_LIMIT_EXCEEDED",
      "Admin rate limit exceeded. Please slow down.",
      429,
    );
  }
}

export async function requireAdmin(session: Session | null) {
  if (!session?.user?.id) {
    throw new AppError("UNAUTHORIZED", "Authentication required", 401);
  }

  const env = getBindings();
  if (!env.DB) {
    throw new AppError("ENV_MISSING", "DB binding missing", 500);
  }

  const db = createDb(env.DB as D1Database);

  // Enforce admin-specific rate limiting
  await enforceAdminRateLimit(db, session);

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
  });

  if (!user || user.role !== "admin") {
    throw new AppError("FORBIDDEN", "Admin access required", 403);
  }

  return { db, user };
}
