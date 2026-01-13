import { withErrorHandler, successResponse } from "@/lib/api-utils";
import { AppError, NotFoundError, RateLimitError } from "@/lib/errors";
import { getBindings } from "@/lib/cloudflare";
import { createDb } from "@/lib/db";
import { checkRateLimit, getRateLimitContext } from "@/lib/rate-limit";
import { getHookById } from "@/lib/services/hooks";

export const dynamic = "force-dynamic";

export const GET = withErrorHandler(async (request: Request, context) => {
  const { params } = context as { params: { id: string } };
  const env = getBindings();
  if (!env.DB) {
    throw new AppError("ENV_MISSING", "DB binding missing", 500);
  }

  const db = createDb(env.DB as D1Database);
  const { identifier, tier } = await getRateLimitContext(request);
  const rate = await checkRateLimit(db, identifier, "hooks", tier);
  if (!rate.allowed) {
    throw new RateLimitError(rate.retryAfter);
  }

  const hook = await getHookById(env.DB as D1Database, params.id);
  if (!hook) {
    throw new NotFoundError("Hook not found");
  }

  return successResponse(hook);
});
