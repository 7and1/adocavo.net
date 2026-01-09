import {
  withErrorHandler,
  successResponse,
  validateCSRF,
} from "@/lib/api-utils";
import {
  AuthRequiredError,
  AppError,
  CreditsError,
  NotFoundError,
  RateLimitError,
  ValidationError,
} from "@/lib/errors";
import { auth } from "@/lib/auth";
import { generateRequestSchema } from "@/lib/validations";
import { getBindings } from "@/lib/cloudflare";
import { createDb } from "@/lib/db";
import { checkRateLimit, type RateLimitIdentifier } from "@/lib/rate-limit";
import { generateScripts } from "@/lib/services/generation";
import { NextResponse } from "next/server";

export const POST = withErrorHandler(async (request: Request) => {
  const session = await auth();
  if (!session?.user?.id) {
    throw new AuthRequiredError();
  }

  // Validate CSRF for authenticated state-changing requests
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

  const parsed = generateRequestSchema.parse(body);
  const env = getBindings();

  if (!env.DB || !env.AI) {
    throw new AppError("ENV_MISSING", "AI/DB bindings missing", 500);
  }

  const db = createDb(env.DB as D1Database);

  // Use user-based rate limiting for authenticated users to prevent proxy bypass
  const rateLimitId: RateLimitIdentifier = {
    type: "user",
    value: session.user.id,
  };
  const rate = await checkRateLimit(db, rateLimitId, "generate");

  if (!rate.allowed) {
    throw new RateLimitError(rate.retryAfter);
  }

  const result = await generateScripts(env.AI as Ai, env.DB as D1Database, {
    userId: session.user.id,
    hookId: parsed.hookId,
    productDescription: parsed.productDescription,
  });

  if (!result.success) {
    switch (result.error) {
      case "INSUFFICIENT_CREDITS":
        throw new CreditsError();
      case "HOOK_NOT_FOUND":
        throw new NotFoundError("Hook not found");
      case "AI_UNAVAILABLE":
        throw new AppError("AI_UNAVAILABLE", result.message, 503);
      case "INVALID_AI_RESPONSE":
        throw new AppError("INVALID_AI_RESPONSE", result.message, 502);
      default:
        throw new AppError("GENERATION_FAILED", result.message, 500);
    }
  }

  return successResponse({
    scripts: result.scripts,
    creditsRemaining: result.creditsRemaining,
    generationId: result.generationId,
  });
});
