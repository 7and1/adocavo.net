import { withErrorHandler, successResponse } from "@/lib/api-utils";
import { AppError, RateLimitError } from "@/lib/errors";
import { hooksQuerySchema } from "@/lib/validations";
import { getBindings } from "@/lib/cloudflare";
import { createDb } from "@/lib/db";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { getHooks } from "@/lib/services/hooks";

export const dynamic = "force-dynamic";

export const GET = withErrorHandler(async (request: Request) => {
  const url = new URL(request.url);
  const params = Object.fromEntries(url.searchParams.entries());
  const parsed = hooksQuerySchema.parse(params);

  const env = getBindings();
  if (!env.DB) {
    throw new AppError("ENV_MISSING", "DB binding missing", 500);
  }

  const db = createDb(env.DB as D1Database);
  const ip = getClientIp(request);
  const rate = await checkRateLimit(db, ip, "hooks");

  if (!rate.allowed) {
    throw new RateLimitError(rate.retryAfter);
  }

  const data = await getHooks(env.DB as D1Database, {
    category: parsed.category,
    search: parsed.search,
    page: parsed.page,
    limit: parsed.limit,
  });

  return successResponse(data);
});
