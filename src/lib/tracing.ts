import { logInfo, logError, logDebug } from "./logger";

export interface TraceSpan {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  operationName: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  tags?: Record<string, unknown>;
  success?: boolean;
  errorMessage?: string;
}

export class Tracer {
  private spans: Map<string, TraceSpan> = new Map();
  private traceId: string;

  constructor(traceId?: string) {
    this.traceId = traceId || crypto.randomUUID();
  }

  getTraceId(): string {
    return this.traceId;
  }

  startSpan(
    operationName: string,
    parentSpanId?: string,
    tags?: Record<string, unknown>,
  ): string {
    const spanId = crypto.randomUUID();
    const span: TraceSpan = {
      traceId: this.traceId,
      spanId,
      parentSpanId,
      operationName,
      startTime: Date.now(),
      tags,
    };

    this.spans.set(spanId, span);

    logDebug(`Span started: ${operationName}`, {
      traceId: this.traceId,
      spanId,
      parentSpanId,
      ...tags,
    });

    return spanId;
  }

  endSpan(
    spanId: string,
    success = true,
    errorMessage?: string,
    additionalTags?: Record<string, unknown>,
  ): TraceSpan | undefined {
    const span = this.spans.get(spanId);
    if (!span) {
      logError("Span not found", new Error(`Span ${spanId} not found`), {
        traceId: this.traceId,
        spanId,
      });
      return undefined;
    }

    const endTime = Date.now();
    const duration = endTime - span.startTime;

    span.endTime = endTime;
    span.duration = duration;
    span.success = success;
    span.errorMessage = errorMessage;
    span.tags = { ...span.tags, ...additionalTags };

    logInfo(`Span completed: ${span.operationName}`, {
      traceId: this.traceId,
      spanId,
      parentSpanId: span.parentSpanId,
      duration,
      success,
      errorMessage,
      ...span.tags,
    });

    return span;
  }

  getSpan(spanId: string): TraceSpan | undefined {
    return this.spans.get(spanId);
  }

  getAllSpans(): TraceSpan[] {
    return Array.from(this.spans.values());
  }

  exportTrace(): TraceSpan[] {
    return this.getAllSpans().map((span) => ({
      ...span,
    }));
  }
}

export class DatabaseTracer {
  private tracer: Tracer;

  constructor(tracer: Tracer) {
    this.tracer = tracer;
  }

  async traceQuery<T>(
    query: string,
    execute: () => Promise<T>,
    tags?: Record<string, unknown>,
  ): Promise<T> {
    const spanId = this.tracer.startSpan("database.query", undefined, {
      query: query.substring(0, 100),
      ...tags,
    });

    try {
      const result = await execute();
      this.tracer.endSpan(spanId, true, undefined, {
        rowsAffected: Array.isArray(result) ? result.length : 1,
      });
      return result;
    } catch (error) {
      this.tracer.endSpan(
        spanId,
        false,
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    }
  }
}

export class ExternalAPITracer {
  private tracer: Tracer;

  constructor(tracer: Tracer) {
    this.tracer = tracer;
  }

  async traceRequest<T>(
    serviceName: string,
    url: string,
    execute: () => Promise<T>,
    tags?: Record<string, unknown>,
  ): Promise<T> {
    const spanId = this.tracer.startSpan(
      `external_api.${serviceName}`,
      undefined,
      {
        url,
        ...tags,
      },
    );

    try {
      const result = await execute();
      this.tracer.endSpan(spanId, true, undefined);
      return result;
    } catch (error) {
      this.tracer.endSpan(
        spanId,
        false,
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    }
  }
}

export class AITracer {
  private tracer: Tracer;

  constructor(tracer: Tracer) {
    this.tracer = tracer;
  }

  async traceGeneration<T>(
    model: string,
    operation: string,
    execute: () => Promise<T>,
    tags?: Record<string, unknown>,
  ): Promise<T> {
    const spanId = this.tracer.startSpan(`ai.generation`, undefined, {
      model,
      operation,
      ...tags,
    });

    try {
      const result = await execute();
      this.tracer.endSpan(spanId, true, undefined);
      return result;
    } catch (error) {
      this.tracer.endSpan(
        spanId,
        false,
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    }
  }
}

export function createTracer(traceId?: string): Tracer {
  return new Tracer(traceId);
}

export function createDatabaseTracer(tracer: Tracer): DatabaseTracer {
  return new DatabaseTracer(tracer);
}

export function createExternalAPITracer(tracer: Tracer): ExternalAPITracer {
  return new ExternalAPITracer(tracer);
}

export function createAITracer(tracer: Tracer): AITracer {
  return new AITracer(tracer);
}
