/**
 * Request ID and correlation tracking utilities
 * Ensures all API calls have proper tracing IDs for observability
 */

import { logInfo, logError } from "./logger";

export interface RequestContextData {
  requestId: string;
  correlationId: string;
  traceId: string;
  userId?: string;
  ip?: string;
  userAgent?: string;
  startTime: number;
}

export interface RequestMetadata {
  route: string;
  method: string;
  userId?: string;
  ip?: string;
  userAgent?: string;
}

/**
 * Generate a unique request ID
 * Format: prefix-timestamp-random
 */
export function generateRequestId(prefix = "req"): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `${prefix}-${timestamp}-${random}`;
}

/**
 * Generate a trace ID for distributed tracing
 * Uses UUID v4 format
 */
export function generateTraceId(): string {
  return crypto.randomUUID();
}

/**
 * Generate a correlation ID to link related requests
 */
export function generateCorrelationId(): string {
  return crypto.randomUUID();
}

/**
 * Extract or create request context from headers
 */
export function extractRequestContext(
  request: Request,
  metadata?: RequestMetadata,
): RequestContextData {
  // Check for existing trace headers
  const existingTraceId = request.headers.get("x-trace-id") || undefined;
  const existingCorrelationId =
    request.headers.get("x-correlation-id") || undefined;
  const existingRequestId = request.headers.get("x-request-id") || undefined;

  return {
    requestId: existingRequestId || generateRequestId(),
    correlationId: existingCorrelationId || generateCorrelationId(),
    traceId: existingTraceId || generateTraceId(),
    userId: metadata?.userId,
    ip: metadata?.ip || request.headers.get("cf-connecting-ip") || undefined,
    userAgent:
      metadata?.userAgent || request.headers.get("user-agent") || undefined,
    startTime: Date.now(),
  };
}

/**
 * Set request context headers on a response
 */
export function setRequestContextHeaders(
  response: Response,
  context: RequestContextData,
): Response {
  const newHeaders = new Headers(response.headers);
  newHeaders.set("x-request-id", context.requestId);
  newHeaders.set("x-correlation-id", context.correlationId);
  newHeaders.set("x-trace-id", context.traceId);

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}

/**
 * Context manager for request tracking
 */
export class RequestContextManager {
  private static context = new Map<string, RequestContextData>();

  /**
   * Store request context
   */
  static set(requestId: string, context: RequestContextData): void {
    this.context.set(requestId, context);
  }

  /**
   * Get request context
   */
  static get(requestId: string): RequestContextData | undefined {
    return this.context.get(requestId);
  }

  /**
   * Remove request context (cleanup)
   */
  static delete(requestId: string): void {
    this.context.delete(requestId);
  }

  /**
   * Log request with context
   */
  static logRequest(
    requestId: string,
    route: string,
    method: string,
    metadata?: RequestMetadata,
  ): void {
    const context = this.get(requestId);
    if (!context) return;

    logInfo("Incoming request", {
      requestId: context.requestId,
      correlationId: context.correlationId,
      traceId: context.traceId,
      route,
      method,
      userId: metadata?.userId || context.userId,
      ip: metadata?.ip || context.ip,
      userAgent: metadata?.userAgent || context.userAgent,
      phase: "request",
    });
  }

  /**
   * Log response with context
   */
  static logResponse(
    requestId: string,
    statusCode: number,
    additionalContext?: Record<string, unknown>,
  ): void {
    const context = this.get(requestId);
    if (!context) return;

    const duration = Date.now() - context.startTime;

    logInfo("Outgoing response", {
      requestId: context.requestId,
      correlationId: context.correlationId,
      traceId: context.traceId,
      statusCode,
      duration,
      phase: "response",
      ...additionalContext,
    });

    // Clean up context after response
    this.delete(requestId);
  }

  /**
   * Log error with context
   */
  static logError(
    requestId: string,
    error: unknown,
    additionalContext?: Record<string, unknown>,
  ): void {
    const context = this.get(requestId);
    if (!context) {
      logError("Request error (no context)", error, additionalContext);
      return;
    }

    const duration = Date.now() - context.startTime;

    logError("Request error", error, {
      requestId: context.requestId,
      correlationId: context.correlationId,
      traceId: context.traceId,
      duration,
      phase: "error",
      ...additionalContext,
    });
  }
}

/**
 * Wrap a fetch call with request context headers
 */
export async function fetchWithContext(
  url: string,
  context: RequestContextData,
  init?: RequestInit,
): Promise<Response> {
  const headers = new Headers(init?.headers);
  headers.set("x-request-id", generateRequestId("sub"));
  headers.set("x-correlation-id", context.correlationId);
  headers.set("x-trace-id", context.traceId);

  return fetch(url, {
    ...init,
    headers,
  });
}

/**
 * Higher-order function to wrap API handlers with request context
 */
export function withRequestContext<T>(
  handler: (request: Request, context: RequestContextData) => Promise<T>,
  metadata?: RequestMetadata,
): (request: Request) => Promise<T> {
  return async (request: Request) => {
    const context = extractRequestContext(request, metadata);
    const requestId = context.requestId;

    RequestContextManager.set(requestId, context);

    try {
      RequestContextManager.logRequest(
        requestId,
        metadata?.route || request.url,
        metadata?.method || request.method || "GET",
        metadata,
      );

      const result = await handler(request, context);

      // Assume result is a Response and add headers
      if (result instanceof Response) {
        return setRequestContextHeaders(result, context) as T;
      }

      return result;
    } catch (error) {
      RequestContextManager.logError(requestId, error);
      throw error;
    }
  };
}
