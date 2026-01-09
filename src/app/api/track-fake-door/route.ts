import { withErrorHandler, successResponse } from "@/lib/api-utils";
import { AppError, RateLimitError, ValidationError } from "@/lib/errors";
import { auth } from "@/lib/auth";
import { fakeDoorClickSchema } from "@/lib/validations";
import { getBindings } from "@/lib/cloudflare";
import { createDb } from "@/lib/db";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { fakeDoorClicks } from "@/lib/schema";
import { nanoid } from "nanoid";

export const POST = withErrorHandler(async (request: Request) => {
  const body = await request.json().catch(() => {
    throw new ValidationError();
  });

  const parsed = fakeDoorClickSchema.parse(body);
  const env = getBindings();

  if (!env.DB) {
    throw new AppError("ENV_MISSING", "DB binding missing", 500);
  }

  const db = createDb(env.DB as D1Database);
  const ip = getClientIp(request);
  const rate = await checkRateLimit(db, ip, "fakeDoor");

  if (!rate.allowed) {
    throw new RateLimitError(rate.retryAfter);
  }

  const session = await auth();

  await db.insert(fakeDoorClicks).values({
    id: nanoid(),
    userId: session?.user?.id ?? null,
    feature: parsed.feature,
    userAgent: request.headers.get("user-agent"),
    referrer: request.headers.get("referer"),
  });

  return successResponse({ ok: true });
});
