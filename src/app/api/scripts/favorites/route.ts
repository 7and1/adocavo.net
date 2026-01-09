import {
  withErrorHandler,
  successResponse,
  validateCSRF,
} from "@/lib/api-utils";
import { AuthRequiredError, ValidationError } from "@/lib/errors";
import { auth } from "@/lib/auth";
import { getDB, getD1 } from "@/lib/cloudflare";
import { createFavoriteService } from "@/lib/services/favorites";
import { favoriteRequestSchema } from "@/lib/validations";
import { checkRateLimit } from "@/lib/rate-limit";
import { NextResponse } from "next/server";

export const GET = withErrorHandler(async () => {
  const session = await auth();

  if (!session?.user?.id) {
    throw new AuthRequiredError();
  }

  const d1 = getD1();
  const favoriteService = await createFavoriteService(d1);
  const favorites = await favoriteService.getUserFavorites(session.user.id);

  return successResponse({ favorites });
});

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

  const parsed = favoriteRequestSchema.parse(body);
  const db = getDB();
  const d1 = getD1();

  // Rate limit using user ID for authenticated users
  const rate = await checkRateLimit(
    db,
    { type: "user", value: session.user.id },
    "favorites",
  );
  if (!rate.allowed) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "RATE_LIMIT_EXCEEDED",
          message: "Too many favorite actions. Please try again later.",
          retryAfter: rate.retryAfter,
        },
      },
      { status: 429 },
    );
  }

  const favoriteService = await createFavoriteService(d1);
  const result = await favoriteService.addFavorite({
    userId: session.user.id,
    ...parsed,
  });

  return successResponse({ id: result.id });
});

export const DELETE = withErrorHandler(async (request: Request) => {
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

  const parsed = favoriteRequestSchema.parse(body);
  const db = getDB();
  const d1 = getD1();

  // Rate limit using user ID for authenticated users
  const rate = await checkRateLimit(
    db,
    { type: "user", value: session.user.id },
    "favorites",
  );
  if (!rate.allowed) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "RATE_LIMIT_EXCEEDED",
          message: "Too many favorite actions. Please try again later.",
          retryAfter: rate.retryAfter,
        },
      },
      { status: 429 },
    );
  }

  const favoriteService = await createFavoriteService(d1);
  await favoriteService.removeFavorite(
    session.user.id,
    parsed.generatedScriptId,
  );

  return successResponse({ success: true });
});
