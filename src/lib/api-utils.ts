import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { isAppError } from "./errors";
import { logError } from "./logger";
import { extractRequestIds, createResponseHeaders } from "./logger";

/**
 * Extracts and validates the hostname from a URL.
 * Returns null if the URL is invalid or hostname cannot be extracted.
 */
function extractHostname(urlString: string | null): string | null {
  if (!urlString) return null;
  try {
    const url = new URL(urlString);
    return url.hostname;
  } catch {
    return null;
  }
}

/**
 * Validates if a hostname exactly matches an allowed hostname.
 * Uses exact match to prevent bypass via subdomain-like patterns
 * (e.g., eviladocavo.net would not match adocavo.net).
 */
function isAllowedHostname(
  hostname: string | null,
  allowedHosts: readonly string[],
): boolean {
  if (!hostname) return false;
  return allowedHosts.includes(hostname);
}

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
 * Uses origin/referer header validation with exact hostname matching to prevent
 * bypass attempts via look-alike domains (e.g., eviladocavo.net).
 *
 * Security: Uses exact hostname matching instead of .includes() to prevent
 * bypasses where malicious domains contain allowed hostnames as substrings.
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

    // Allowed hostnames for same-origin requests
    // Using ReadonlyArray to prevent modification
    const allowedHosts = [
      "adocavo.net",
      "www.adocavo.net",
      "localhost:3000",
      "127.0.0.1:3000",
    ] as const;

    // Extract hostnames from origin and referer headers
    const originHostname = extractHostname(origin);
    const refererHostname = extractHostname(referer);

    // Validate using exact hostname matching (prevents eviladocavo.net bypass)
    const isValidOrigin =
      isAllowedHostname(originHostname, allowedHosts) ||
      isAllowedHostname(refererHostname, allowedHosts) ||
      isAllowedHostname(host, allowedHosts);

    if (!isValidOrigin) {
      // Log suspicious origin for security monitoring
      console.warn(
        `CSRF validation failed: origin=${originHostname}, referer=${refererHostname}, host=${host}`,
      );
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
  requireAuth = false,
) {
  return async (
    request: Request,
    context?: unknown,
  ): Promise<NextResponse<APIResponse<T>>> => {
    // Extract or generate request IDs for tracing
    const { requestId, correlationId, traceId } = extractRequestIds(request);

    try {
      // CSRF validation for non-GET requests
      const method = request.method.toUpperCase();
      if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
        const isAuthenticated = requireAuth;
        if (!validateCSRF(request, isAuthenticated)) {
          const response = NextResponse.json(
            {
              success: false,
              error: {
                code: "CSRF_ERROR",
                message: "Invalid origin. Please refresh and try again.",
              },
            },
            { status: 403 },
          ) as NextResponse<APIResponse<T>>;
          // Add request ID headers
          const headers = createResponseHeaders({
            requestId,
            correlationId: correlationId || crypto.randomUUID(),
            traceId: traceId || crypto.randomUUID(),
          });
          headers.forEach((value, key) => response.headers.set(key, value));
          return response;
        }
      }
      const result = await handler(request, context);
      // Add request ID headers to successful response
      const headers = createResponseHeaders({
        requestId,
        correlationId: correlationId || crypto.randomUUID(),
        traceId: traceId || crypto.randomUUID(),
      });
      headers.forEach((value, key) => result.headers.set(key, value));
      return result;
    } catch (error) {
      const url = new URL(request.url);
      logError("API handler error", error, {
        route: url.pathname,
        method: request.method,
        requestId,
        correlationId,
        traceId,
        userAgent: request.headers.get("user-agent") || undefined,
        ip: request.headers.get("cf-connecting-ip") || undefined,
      });
      const errorResp = errorResponse(error) as NextResponse<APIResponse<T>>;
      // Add request ID headers to error response
      const headers = createResponseHeaders({
        requestId,
        correlationId: correlationId || crypto.randomUUID(),
        traceId: traceId || crypto.randomUUID(),
      });
      headers.forEach((value, key) => errorResp.headers.set(key, value));
      return errorResp;
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
    // Extract or generate request IDs for tracing
    const { requestId, correlationId, traceId } = extractRequestIds(request);

    try {
      // Import auth dynamically to avoid edge runtime issues
      const { auth } = await import("@/lib/auth");
      const session = await auth();

      if (!session?.user?.id) {
        const response = NextResponse.json(
          {
            success: false,
            error: {
              code: "UNAUTHORIZED",
              message: "Authentication required",
            },
          },
          { status: 401 },
        );
        // Add request ID headers
        const headers = createResponseHeaders({
          requestId,
          correlationId: correlationId || crypto.randomUUID(),
          traceId: traceId || crypto.randomUUID(),
        });
        headers.forEach((value, key) => response.headers.set(key, value));
        return response;
      }

      // Validate CSRF for authenticated state-changing requests
      if (!validateCSRF(request, true)) {
        const response = NextResponse.json(
          {
            success: false,
            error: {
              code: "CSRF_ERROR",
              message: "Invalid origin. Please refresh and try again.",
            },
          },
          { status: 403 },
        );
        // Add request ID headers
        const headers = createResponseHeaders({
          requestId,
          correlationId: correlationId || crypto.randomUUID(),
          traceId: traceId || crypto.randomUUID(),
        });
        headers.forEach((value, key) => response.headers.set(key, value));
        return response;
      }

      // Attach session to request context for handler use
      (request as Request & { session?: typeof session }).session = session;
      const result = await handler(request, context);
      // Add request ID headers to successful response
      const headers = createResponseHeaders({
        requestId,
        correlationId: correlationId || crypto.randomUUID(),
        traceId: traceId || crypto.randomUUID(),
      });
      headers.forEach((value, key) => result.headers.set(key, value));
      return result;
    } catch (error) {
      const url = new URL(request.url);
      logError("Authenticated API handler error", error, {
        route: url.pathname,
        method: request.method,
        requestId,
        correlationId,
        traceId,
        userAgent: request.headers.get("user-agent") || undefined,
        ip: request.headers.get("cf-connecting-ip") || undefined,
      });
      const errorResp = errorResponse(error) as NextResponse<APIResponse<T>>;
      // Add request ID headers to error response
      const headers = createResponseHeaders({
        requestId,
        correlationId: correlationId || crypto.randomUUID(),
        traceId: traceId || crypto.randomUUID(),
      });
      headers.forEach((value, key) => errorResp.headers.set(key, value));
      return errorResp;
    }
  };
}

export type RouteContext<T = unknown> = {
  params: Promise<T>;
};
