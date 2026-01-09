import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { isAppError } from "./errors";

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

/**
 * Validates CSRF protection for state-changing requests (POST, PUT, DELETE, PATCH).
 * Uses origin/referer header validation to ensure requests come from allowed domains.
 *
 * @param request - The incoming request
 * @param isAuthenticated - Whether the request is authenticated (has valid session)
 * @returns true if request passes CSRF validation, false otherwise
 */
export function validateCSRF(
  request: Request,
  isAuthenticated: boolean,
): boolean {
  const method = request.method.toUpperCase();

  // Skip CSRF for read-only methods
  if (["GET", "HEAD", "OPTIONS"].includes(method)) {
    return true;
  }

  // For authenticated state-changing requests, validate origin
  if (isAuthenticated) {
    const origin = request.headers.get("origin");
    const referer = request.headers.get("referer");
    const host = request.headers.get("host");

    // Allowed hosts for same-origin requests
    const allowedHosts = [
      "adocavo.net",
      "www.adocavo.net",
      "localhost:3000",
      "127.0.0.1:3000",
    ];

    // Check if origin, referer, or host matches allowed hosts
    const isValidOrigin =
      (origin && allowedHosts.some((h) => origin.includes(h))) ||
      (referer && allowedHosts.some((h) => referer.includes(h))) ||
      (host && allowedHosts.includes(host));

    if (!isValidOrigin) {
      return false;
    }
  }

  return true;
}

export function successResponse<T>(
  data: T,
  status = 200,
): NextResponse<APIResponse<T>> {
  return NextResponse.json({ success: true, data }, { status });
}

export function errorResponse(
  error: unknown,
): NextResponse<APIResponse<never>> {
  if (isAppError(error)) {
    return NextResponse.json(
      {
        success: false,
        error: error.toJSON(),
      },
      { status: error.statusCode },
    );
  }

  if (error instanceof ZodError) {
    const details = error.flatten();
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid request data",
          details,
        },
      },
      { status: 400 },
    );
  }

  console.error("Unexpected error:", error);

  return NextResponse.json(
    {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred",
      },
    },
    { status: 500 },
  );
}

export function withErrorHandler<T>(
  handler: (
    request: Request,
    context?: unknown,
  ) => Promise<NextResponse<APIResponse<T>>>,
) {
  return async (
    request: Request,
    context?: unknown,
  ): Promise<NextResponse<APIResponse<T>>> => {
    try {
      return await handler(request, context);
    } catch (error) {
      return errorResponse(error) as NextResponse<APIResponse<T>>;
    }
  };
}

/**
 * Wrapper for authenticated API routes that validates CSRF protection.
 * This should be used for routes that require authentication and perform state changes.
 */
export function withAuthHandler<T>(
  handler: (
    request: Request,
    context?: unknown,
  ) => Promise<NextResponse<APIResponse<T>>>,
) {
  return async (
    request: Request,
    context?: unknown,
  ): Promise<NextResponse<APIResponse<T>>> => {
    try {
      // Import auth dynamically to avoid edge runtime issues
      const { auth } = await import("@/lib/auth");
      const session = await auth();

      if (!session?.user?.id) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "UNAUTHORIZED",
              message: "Authentication required",
            },
          },
          { status: 401 },
        );
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

      // Attach session to request context for handler use
      (request as Request & { session?: typeof session }).session = session;
      return await handler(request, context);
    } catch (error) {
      return errorResponse(error) as NextResponse<APIResponse<T>>;
    }
  };
}

export type RouteContext<T = unknown> = {
  params: Promise<T>;
};
