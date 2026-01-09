import { withErrorHandler, successResponse } from "@/lib/api-utils";
import { AppError, RateLimitError, ValidationError } from "@/lib/errors";
import { auth } from "@/lib/auth";
import { waitlistRequestSchema } from "@/lib/validations";
import { getBindings } from "@/lib/cloudflare";
import { createDb } from "@/lib/db";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { waitlist as waitlistTable } from "@/lib/schema";
import { nanoid } from "nanoid";

export const dynamic = "force-dynamic";

function deriveUserTier(credits?: number | null) {
  if (credits == null) return "anon";
  if (credits <= 0) return "out_of_credits";
  if (credits <= 2) return "low_credits";
  if (credits <= 5) return "active";
  return "new";
}

export const POST = withErrorHandler(async (request: Request) => {
  const body = await request.json().catch(() => {
    throw new ValidationError();
  });

  const parsed = waitlistRequestSchema.parse(body);
  const env = getBindings();

  if (!env.DB) {
    throw new AppError("ENV_MISSING", "DB binding missing", 500);
  }

  const db = createDb(env.DB as D1Database);
  const ip = getClientIp(request);
  const rate = await checkRateLimit(db, ip, "waitlist");

  if (!rate.allowed) {
    throw new RateLimitError(rate.retryAfter);
  }

  const session = await auth();
  const sourceUrl = parsed.sourceUrl || request.headers.get("referer") || null;
  const userTier = parsed.userTier || deriveUserTier(session?.user?.credits);

  // Use a constant-time operation pattern to prevent email enumeration
  // Always perform both insert and update operations, returning a consistent response
  const startTime = Date.now();

  try {
    await db
      .insert(waitlistTable)
      .values({
        id: nanoid(),
        userId: session?.user?.id ?? null,
        email: parsed.email,
        featureInterest: parsed.featureInterest ?? null,
        sourceUrl,
        userTier,
      })
      .onConflictDoUpdate({
        target: waitlistTable.email,
        set: {
          featureInterest: parsed.featureInterest ?? null,
          sourceUrl,
          userTier,
        },
      });
  } catch {
    // Silently handle errors to prevent email enumeration
    // The error could be due to duplicate, invalid format, etc.
  }

  // Ensure consistent response timing regardless of new vs existing email
  const minResponseTime = 100; // ms
  const elapsed = Date.now() - startTime;
  if (elapsed < minResponseTime) {
    await new Promise((resolve) =>
      setTimeout(resolve, minResponseTime - elapsed),
    );
  }

  return successResponse({
    ok: true,
    message:
      "Thanks for joining! We'll be in touch soon with exclusive early access.",
  });
});
