import { withErrorHandler, successResponse } from "@/lib/api-utils";
import {
  AppError,
  NotFoundError,
  RateLimitError,
  ValidationError,
} from "@/lib/errors";
import { generateRequestSchema } from "@/lib/validations";
import { getBindings } from "@/lib/cloudflare";
import { createDb } from "@/lib/db";
import { checkRateLimit, getRateLimitContext } from "@/lib/rate-limit";
import { generateGuestScripts } from "@/lib/services/generation";
import { verifyTurnstileToken } from "@/lib/turnstile";

export const dynamic = "force-dynamic";

export const POST = withErrorHandler(async (request: Request) => {
  const body = await request.json().catch(() => {
    throw new ValidationError();
  });

  const parsed = generateRequestSchema.parse(body);
  const env = getBindings();

  if (!env.DB || !env.AI) {
    throw new AppError("ENV_MISSING", "AI/DB bindings missing", 500);
  }

  await verifyTurnstileToken(request, parsed.turnstileToken, {
    action: "generate",
    env,
  });

  const db = createDb(env.DB as D1Database);

  const { identifier } = await getRateLimitContext(request, null);
  const rate = await checkRateLimit(
    db,
    identifier,
    "generate",
    "free",
  );

  if (!rate.allowed) {
    throw new RateLimitError(rate.retryAfter);
  }

  const result = await generateGuestScripts(env.AI as Ai, env.DB as D1Database, {
    hookId: parsed.hookId,
    productDescription: parsed.productDescription,
    remixTone: parsed.remixTone,
    remixInstruction: parsed.remixInstruction,
  });

  if (!result.success) {
    switch (result.error) {
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
