import { withErrorHandler, successResponse } from "@/lib/api-utils";
import { AppError, RateLimitError, ValidationError } from "@/lib/errors";
import { analyzeRequestSchema } from "@/lib/validations";
import { getBindings } from "@/lib/cloudflare";
import { createDb } from "@/lib/db";
import { checkRateLimit, getRateLimitContext } from "@/lib/rate-limit";
import { analyzeTikTokUrl } from "@/lib/services/competitor-analysis";
import { verifyTurnstileToken } from "@/lib/turnstile";

export const dynamic = "force-dynamic";

export const POST = withErrorHandler(async (request: Request) => {
  const body = await request.json().catch(() => {
    throw new ValidationError();
  });

  const parsed = analyzeRequestSchema.parse(body);
  const env = getBindings();

  if (!env.DB || !env.AI) {
    throw new AppError("ENV_MISSING", "AI/DB bindings missing", 500);
  }

  await verifyTurnstileToken(request, parsed.turnstileToken, {
    action: "analyze",
    env,
  });

  const db = createDb(env.DB as D1Database);
  const { identifier } = await getRateLimitContext(request, null);
  const rate = await checkRateLimit(db, identifier, "analyze", "free");

  if (!rate.allowed) {
    throw new RateLimitError(rate.retryAfter);
  }

  const result = await analyzeTikTokUrl(env.AI as Ai, env.DB as D1Database, {
    url: parsed.url,
  });

  if (!result.success) {
    if (result.error === "TRANSCRIPT_NOT_FOUND") {
      throw new AppError(
        "TRANSCRIPT_NOT_FOUND",
        "Unable to extract a transcript from that TikTok URL.",
        422,
      );
    }
    if (result.error === "INVALID_AI_RESPONSE") {
      throw new AppError(
        "INVALID_AI_RESPONSE",
        "AI could not parse the transcript. Try a different URL.",
        502,
      );
    }
    throw new AppError("ANALYSIS_FAILED", "Analysis failed", 500);
  }

  return successResponse(result.result);
});
