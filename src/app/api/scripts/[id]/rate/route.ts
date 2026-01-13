import {
  withErrorHandler,
  successResponse,
  validateCSRF,
  type RouteContext,
} from "@/lib/api-utils";
import { AuthRequiredError, ValidationError } from "@/lib/errors";
import { auth } from "@/lib/auth";
import { getDB, getD1 } from "@/lib/cloudflare";
import { createRatingService } from "@/lib/services/ratings";
import { ratingRequestSchema } from "@/lib/validations";
import { checkRateLimit, getRateLimitContext } from "@/lib/rate-limit";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export const POST = withErrorHandler(
  async (request: Request, context?: unknown) => {
    const { id } = await (context as RouteContext<{ id: string }>).params;
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

    const parsed = ratingRequestSchema.parse({
      ...body,
      generatedScriptId: id,
    });

    const db = getDB();
    const d1 = getD1();

    // Rate limit using user ID for authenticated users
    const { identifier, tier } = await getRateLimitContext(request, session);
    const rate = await checkRateLimit(db, identifier, "ratings", tier);
    if (!rate.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "RATE_LIMIT_EXCEEDED",
            message: "Too many rating actions. Please try again later.",
            retryAfter: rate.retryAfter,
          },
        },
        { status: 429 },
      );
    }

    const ratingService = await createRatingService(d1);
    const result = await ratingService.rateScript({
      generatedScriptId: id,
      userId: session.user.id,
      ...parsed,
    });

    return successResponse({ id: result.id });
  },
);

export const GET = withErrorHandler(
  async (request: Request, context?: unknown) => {
    const { id } = await (context as RouteContext<{ id: string }>).params;
    const session = await auth();

    const d1 = getD1();
    const ratingService = await createRatingService(d1);
    const stats = await ratingService.getScriptStats(id);

    let userRating = null;
    if (session?.user?.id) {
      const url = new URL(request.url);
      const scriptIndex = url.searchParams.get("scriptIndex");
      if (scriptIndex) {
        userRating = await ratingService.getUserRating(
          id,
          session.user.id,
          parseInt(scriptIndex, 10),
        );
      }
    }

    return successResponse({ ...stats, userRating });
  },
);
