import {
  withErrorHandler,
  successResponse,
  validateCSRF,
} from "@/lib/api-utils";
import {
  AppError,
  AuthRequiredError,
  RateLimitError,
  ValidationError,
} from "@/lib/errors";
import { auth } from "@/lib/auth";
import { analyzeRequestSchema } from "@/lib/validations";
import { getBindings } from "@/lib/cloudflare";
import { createDb } from "@/lib/db";
import { checkRateLimit, getRateLimitContext } from "@/lib/rate-limit";
import { analyzeTikTokUrl } from "@/lib/services/competitor-analysis";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export const POST = withErrorHandler(async (request: Request) => {
  const session = await auth();
  if (!session?.user?.id) {
    throw new AuthRequiredError();
  }

  if (!validateCSRF(request, true)) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "CSRF_ERROR",
          message: "Invalid origin. Please refresh and try again.",
        },
      },
      { status: 403 },
    );
  }

  const body = await request.json().catch(() => {
    throw new ValidationError();
  });

  const parsed = analyzeRequestSchema.parse(body);
  const env = getBindings();

  if (!env.DB || !env.AI) {
    throw new AppError("ENV_MISSING", "AI/DB bindings missing", 500);
  }

  const db = createDb(env.DB as D1Database);
  const { identifier, tier } = await getRateLimitContext(request, session);
  const rate = await checkRateLimit(db, identifier, "analyze", tier);

  if (!rate.allowed) {
    throw new RateLimitError(rate.retryAfter);
  }

  const result = await analyzeTikTokUrl(env.AI as Ai, env.DB as D1Database, {
    userId: session.user.id,
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
