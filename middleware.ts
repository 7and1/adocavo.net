import { NextResponse, type NextRequest } from "next/server";
import { RequestContext, logInfo, logWarn, logError } from "@/lib/logger";

const SESSION_COOKIES = [
  "__Secure-next-auth.session-token",
  "next-auth.session-token",
  "__Secure-authjs.session-token",
  "authjs.session-token",
];

const PROTECTED_PAGES = ["/dashboard", "/remix", "/admin"];
const PROTECTED_APIS = ["/api/generate", "/api/scripts"];

const RATE_LIMITS = [
  { prefix: "/api/generate", limit: 10, windowSeconds: 60 },
  { prefix: "/api/scripts", limit: 30, windowSeconds: 60 },
];

function getClientIp(request: NextRequest) {
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.ip ||
    "unknown"
  );
}

function generateRequestId(): string {
  return (
    crypto.randomUUID() ||
    Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15)
  );
}

function hasSessionCookie(request: NextRequest) {
  return SESSION_COOKIES.some((name) => request.cookies.get(name));
}

async function checkRateLimitWithFallback(
  request: NextRequest,
  prefix: string,
  limit: number,
  windowSeconds: number,
): Promise<{ allowed: boolean; retryAfter?: number }> {
  const ip = getClientIp(request);
  if (!ip || ip === "unknown") {
    // If no IP, don't bypass - deny request for security
    return { allowed: false, retryAfter: windowSeconds };
  }

  // Try cache-based rate limiting first (fast path)
  if (typeof caches !== "undefined") {
    try {
      const windowMs = windowSeconds * 1000;
      const bucket = Math.floor(Date.now() / windowMs);
      const cacheKey = new Request(
        `https://rate-limit/${prefix}/${ip}/${bucket}`,
      );
      const cache = caches.default;

      const cached = await cache.match(cacheKey);
      const current = cached ? Number(await cached.text()) : 0;

      if (current >= limit) {
        return { allowed: false, retryAfter: windowSeconds };
      }

      const nextCount = Number.isFinite(current) ? current + 1 : 1;
      await cache.put(
        cacheKey,
        new Response(String(nextCount), {
          headers: { "Cache-Control": `max-age=${windowSeconds}` },
        }),
      );

      return { allowed: true };
    } catch (cacheError) {
      // Cache failed, fall through to DB-backed rate limiting
      console.warn(
        "Cache rate limiting failed, falling back to DB:",
        cacheError,
      );
    }
  }

  // Fallback: Database-backed rate limiting (slower but always available)
  try {
    // Import dynamically to avoid edge runtime issues
    const { getDB } = await import("@/lib/cloudflare");
    const { checkRateLimit: checkDbRateLimit } =
      await import("@/lib/rate-limit");

    const db = getDB();
    return await checkDbRateLimit(
      db,
      { type: "ip", value: ip },
      prefix as any,
      "free",
    );
  } catch (dbError) {
    // If both cache and DB fail, fail closed for security
    console.error("Rate limiting completely failed:", dbError);
    return { allowed: false, retryAfter: windowSeconds };
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const requestId = generateRequestId();
  const ip = getClientIp(request);
  const userAgent = request.headers.get("user-agent") || undefined;

  const requestContext = new RequestContext(
    requestId,
    pathname,
    request.method,
  );

  const startTime = Date.now();

  try {
    const isProtectedPage = PROTECTED_PAGES.some((prefix) =>
      pathname.startsWith(prefix),
    );
    const isProtectedApi = PROTECTED_APIS.some((prefix) =>
      pathname.startsWith(prefix),
    );

    if ((isProtectedPage || isProtectedApi) && !hasSessionCookie(request)) {
      logInfo("Unauthorized access attempt", {
        requestId,
        route: pathname,
        method: request.method,
        ip,
        userAgent,
        correlationId: requestContext.getCorrelationId(),
        isProtectedPage,
        isProtectedApi,
      });

      if (isProtectedApi) {
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

      const signInUrl = new URL("/auth/signin", request.url);
      signInUrl.searchParams.set(
        "callbackUrl",
        `${request.nextUrl.pathname}${request.nextUrl.search}`,
      );
      return NextResponse.redirect(signInUrl);
    }

    if (
      isProtectedApi &&
      ["POST", "PUT", "PATCH", "DELETE"].includes(request.method)
    ) {
      const rule = RATE_LIMITS.find((r) => pathname.startsWith(r.prefix));
      if (rule) {
        const rate = await checkRateLimitWithFallback(
          request,
          rule.prefix.replace(/\W+/g, "-"),
          rule.limit,
          rule.windowSeconds,
        );
        if (!rate.allowed) {
          logWarn("Rate limit exceeded", {
            requestId,
            route: pathname,
            method: request.method,
            ip,
            userAgent,
            correlationId: requestContext.getCorrelationId(),
            limit: rule.limit,
            window: rule.windowSeconds,
          });

          const response = NextResponse.json(
            {
              success: false,
              error: {
                code: "RATE_LIMIT_EXCEEDED",
                message: "Too many requests. Please try again soon.",
                retryAfter: rate.retryAfter,
              },
            },
            { status: 429 },
          );
          if (rate.retryAfter) {
            response.headers.set("Retry-After", String(rate.retryAfter));
          }
          response.headers.set("x-request-id", requestId);
          response.headers.set(
            "x-correlation-id",
            requestContext.getCorrelationId(),
          );
          return response;
        }
      }
    }

    const response = NextResponse.next();
    response.headers.set("x-request-id", requestId);
    response.headers.set("x-correlation-id", requestContext.getCorrelationId());

    const duration = Date.now() - startTime;

    if (pathname.startsWith("/api/")) {
      logInfo("API request", {
        requestId,
        route: pathname,
        method: request.method,
        ip,
        userAgent,
        correlationId: requestContext.getCorrelationId(),
        duration,
        phase: "middleware_complete",
      });

      response.headers.set(
        "Cache-Control",
        "public, s-maxage=60, stale-while-revalidate=300",
      );
    } else if (pathname.match(/\.(jpg|jpeg|png|gif|ico|svg|webp|avif)$/i)) {
      response.headers.set(
        "Cache-Control",
        "public, max-age=31536000, immutable",
      );
    } else if (
      pathname.match(/\/static\//) ||
      pathname.startsWith("/_next/static/")
    ) {
      response.headers.set(
        "Cache-Control",
        "public, max-age=31536000, immutable",
      );
    }

    return response;
  } catch (error) {
    logError("Middleware error", error, {
      requestId,
      route: pathname,
      method: request.method,
      ip,
      userAgent,
      correlationId: requestContext.getCorrelationId(),
      duration: Date.now() - startTime,
    });

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
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/remix/:path*",
    "/admin/:path*",
    "/api/:path*",
  ],
};
