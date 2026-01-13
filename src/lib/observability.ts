import {
  recordRequestMetric,
  recordAIMetric,
  recordDatabaseMetric,
  recordBusinessMetric,
} from "./metrics";
import {
  createTracer,
  createDatabaseTracer,
  createAITracer,
  Tracer,
} from "./tracing";
import { RequestContext, logError } from "./logger";

export interface ObservabilityContext {
  traceId: string;
  correlationId: string;
  userId?: string;
  sessionId?: string;
}

export class ObservabilityManager {
  private tracer: Tracer;
  private requestContext: RequestContext;
  private startTime: number;

  constructor(
    private route: string,
    private method: string,
    private requestId: string,
    private userId?: string,
    private ip?: string,
    private userAgent?: string,
  ) {
    this.tracer = createTracer();
    this.requestContext = new RequestContext(requestId, route, method);
    this.startTime = Date.now();
  }

  getTraceId(): string {
    return this.tracer.getTraceId();
  }

  getCorrelationId(): string {
    return this.requestContext.getCorrelationId();
  }

  getContext(): ObservabilityContext {
    return {
      traceId: this.getTraceId(),
      correlationId: this.getCorrelationId(),
      userId: this.userId,
    };
  }

  logRequest() {
    this.requestContext.logRequest(this.userId, this.ip, this.userAgent);
  }

  logResponse(statusCode: number) {
    const duration = Date.now() - this.startTime;

    recordRequestMetric({
      endpoint: this.route,
      method: this.method,
      statusCode,
      duration,
      timestamp: Date.now(),
      userId: this.userId,
      ip: this.ip,
      success: statusCode >= 200 && statusCode < 400,
    }).catch((error) => {
      logError("Failed to record request metric", error);
    });

    this.requestContext.logResponse(
      statusCode,
      this.userId,
      this.ip,
      this.userAgent,
    );
  }

  logError(error: unknown) {
    // const duration = Date.now() - this.startTime; // Prepared for logging duration
    this.requestContext.logError(error, this.userId, this.ip, this.userAgent);
  }

  recordAI(
    success: boolean,
    duration: number,
    modelSize?: string,
    errorMessage?: string,
  ) {
    recordAIMetric({
      success,
      duration,
      modelSize,
      errorMessage,
      timestamp: Date.now(),
      userId: this.userId,
    }).catch((error) => {
      logError("Failed to record AI metric", error);
    });
  }

  recordDatabase(
    query: string,
    duration: number,
    success: boolean,
    errorMessage?: string,
  ) {
    recordDatabaseMetric({
      query,
      duration,
      success,
      errorMessage,
      timestamp: Date.now(),
    }).catch((error) => {
      logError("Failed to record database metric", error);
    });
  }

  recordBusiness(
    type:
      | "credits_consumed"
      | "user_registration"
      | "script_generation"
      | "hook_view",
    value: number,
    metadata?: Record<string, unknown>,
  ) {
    recordBusinessMetric({
      type,
      value,
      timestamp: Date.now(),
      userId: this.userId,
      metadata,
    }).catch((error) => {
      logError("Failed to record business metric", error);
    });
  }

  getTracer(): Tracer {
    return this.tracer;
  }

  getDatabaseTracer() {
    return createDatabaseTracer(this.tracer);
  }

  getAITracer() {
    return createAITracer(this.tracer);
  }
}

export function createObservabilityManager(
  route: string,
  method: string,
  requestId: string,
  userId?: string,
  ip?: string,
  userAgent?: string,
): ObservabilityManager {
  return new ObservabilityManager(
    route,
    method,
    requestId,
    userId,
    ip,
    userAgent,
  );
}

export async function withObservability<T>(
  route: string,
  method: string,
  requestId: string,
  handler: (manager: ObservabilityManager) => Promise<T>,
  userId?: string,
  ip?: string,
  userAgent?: string,
): Promise<T> {
  const manager = createObservabilityManager(
    route,
    method,
    requestId,
    userId,
    ip,
    userAgent,
  );

  manager.logRequest();

  try {
    const result = await handler(manager);

    manager.logResponse(200);

    return result;
  } catch (error) {
    manager.logError(error);

    throw error;
  }
}
