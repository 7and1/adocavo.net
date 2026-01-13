import { getBindings, getKV } from "@/lib/cloudflare";

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogContext {
  requestId?: string;
  correlationId?: string;
  traceId?: string;
  route?: string;
  method?: string;
  userId?: string;
  status?: number;
  ip?: string;
  userAgent?: string;
  duration?: number;
  errorMessage?: string;
  errorCode?: string;
  stackTrace?: string;
  endpoint?: string;
  statusCode?: number;
  success?: boolean;
  [key: string]: unknown;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  correlationId?: string;
  traceId?: string;
  requestId?: string;
  route?: string;
  method?: string;
  userId?: string;
  ip?: string;
  userAgent?: string;
  duration?: number;
  error?: {
    name?: string;
    message?: string;
    stack?: string;
    code?: string;
    statusCode?: number;
  };
  [key: string]: unknown;
}

interface LogDrainConfig {
  url?: string;
  token?: string;
  provider?: "axiom" | "betterstack" | "datadog" | "generic";
  batchSize?: number;
  flushInterval?: number;
  maxRetries?: number;
}

interface DeadLetterEntry {
  entry: LogEntry;
  attempt: number;
  lastAttempt: string;
  errorMessage?: string;
}

const DEFAULT_BATCH_SIZE = 50;
const DEFAULT_FLUSH_INTERVAL = 5000;
const DEFAULT_MAX_RETRIES = 3;

let logBuffer: LogEntry[] = [];
let flushTimeout: ReturnType<typeof setTimeout> | null = null;
let deadLetterQueue: DeadLetterEntry[] = [];

function getLogDrainConfig(): LogDrainConfig {
  const env = getBindings();
  return {
    url: env.LOG_DRAIN_URL || undefined,
    token: env.LOG_DRAIN_TOKEN || undefined,
    provider:
      (env.LOG_DRAIN_PROVIDER as LogDrainConfig["provider"]) || "generic",
    batchSize: DEFAULT_BATCH_SIZE,
    flushInterval: DEFAULT_FLUSH_INTERVAL,
    maxRetries: DEFAULT_MAX_RETRIES,
  };
}

function shouldLog(level: LogLevel): boolean {
  const env = getBindings();
  const logLevel = (env.LOG_LEVEL || "info").toLowerCase();

  const levels: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  };

  return levels[level] >= levels[logLevel as LogLevel];
}

function serializeError(error: unknown) {
  if (!error || typeof error !== "object") {
    return { message: String(error) };
  }

  const err = error as Error & { code?: string; statusCode?: number };
  return {
    name: err.name,
    message: err.message,
    stack: err.stack,
    code: err.code,
    statusCode: err.statusCode,
  };
}

async function sendWithRetry(
  url: string,
  payload: LogEntry | LogEntry[],
  headers: Record<string, string>,
  maxRetries: number,
): Promise<boolean> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // const body = Array.isArray(payload) ? payload : [payload]; // Prepared but not needed
      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return true;
    } catch {
      // const lastError = error as Error; // Prepared but not needed

      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000;
        // eslint-disable-next-line no-await-in-loop
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  return false;
}

async function addToDeadLetterQueue(entry: LogEntry, errorMessage: string) {
  deadLetterQueue.push({
    entry,
    attempt: 0,
    lastAttempt: new Date().toISOString(),
    errorMessage,
  });

  const kv = getKV();
  if (kv) {
    try {
      await kv.put(
        "logs:dead_letter_queue",
        JSON.stringify(deadLetterQueue.slice(-1000)),
        { expirationTtl: 86400 },
      );
    } catch (error) {
      console.error("Failed to persist dead letter queue to KV:", error);
    }
  }

  if (deadLetterQueue.length > 100) {
    console.warn(
      "Dead letter queue size exceeded 100, dropping oldest entries",
    );
    deadLetterQueue = deadLetterQueue.slice(-100);
  }
}

async function retryDeadLetterQueue() {
  if (deadLetterQueue.length === 0) return;

  const config = getLogDrainConfig();
  if (!config.url) return;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (config.token) {
    headers.Authorization = `Bearer ${config.token}`;
  }

  // const retried: LogEntry[] = []; // Prepared but not used

  for (const item of deadLetterQueue) {
    if (item.attempt >= (config.maxRetries || DEFAULT_MAX_RETRIES)) {
      continue;
    }

    const success = await sendWithRetry(config.url, item.entry, headers, 1);

    if (success) {
      deadLetterQueue = deadLetterQueue.filter((i) => i !== item);
    } else {
      item.attempt++;
      item.lastAttempt = new Date().toISOString();
    }
  }
}

async function flushLogBuffer() {
  if (logBuffer.length === 0) return;

  const config = getLogDrainConfig();
  if (!config.url) {
    logBuffer = [];
    return;
  }

  const batch = logBuffer.splice(0, config.batchSize || DEFAULT_BATCH_SIZE);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (config.token) {
    headers.Authorization = `Bearer ${config.token}`;
  }

  try {
    if (config.provider === "axiom") {
      const success = await sendWithRetry(
        config.url,
        batch,
        headers,
        config.maxRetries || DEFAULT_MAX_RETRIES,
      );
      if (!success) {
        batch.forEach((entry) =>
          addToDeadLetterQueue(entry, "Batch send failed"),
        );
      }
    } else if (config.provider === "betterstack") {
      for (const entry of batch) {
        const success = await sendWithRetry(
          config.url,
          entry,
          headers,
          config.maxRetries || DEFAULT_MAX_RETRIES,
        );
        if (!success) {
          addToDeadLetterQueue(entry, "Individual send failed");
        }
      }
    } else if (config.provider === "datadog") {
      if (config.token) {
        headers["DD-API-KEY"] = config.token;
      }
      const success = await sendWithRetry(
        config.url,
        batch,
        headers,
        config.maxRetries || DEFAULT_MAX_RETRIES,
      );
      if (!success) {
        batch.forEach((entry) =>
          addToDeadLetterQueue(entry, "Batch send failed"),
        );
      }
    } else {
      const success = await sendWithRetry(
        config.url,
        batch,
        headers,
        config.maxRetries || DEFAULT_MAX_RETRIES,
      );
      if (!success) {
        batch.forEach((entry) =>
          addToDeadLetterQueue(entry, "Generic send failed"),
        );
      }
    }
  } catch (error) {
    batch.forEach((entry) =>
      addToDeadLetterQueue(
        entry,
        error instanceof Error ? error.message : String(error),
      ),
    );
  }

  if (logBuffer.length > 0) {
    flushTimeout = setTimeout(flushLogBuffer, 1000);
  }
}

async function scheduleFlush() {
  const config = getLogDrainConfig();
  if (flushTimeout) {
    clearTimeout(flushTimeout);
  }

  flushTimeout = setTimeout(
    flushLogBuffer,
    config.flushInterval || DEFAULT_FLUSH_INTERVAL,
  );
}

async function sendToLogDrain(entry: LogEntry) {
  const config = getLogDrainConfig();
  if (!config.url) return;

  logBuffer.push(entry);

  if (logBuffer.length >= (config.batchSize || DEFAULT_BATCH_SIZE)) {
    await flushLogBuffer();
  } else {
    scheduleFlush();
  }
}

export function log(
  level: LogLevel,
  message: string,
  context: LogContext = {},
) {
  if (!shouldLog(level)) {
    return;
  }

  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...context,
  };

  switch (level) {
    case "debug":
      console.debug(JSON.stringify(entry));
      break;
    case "info":
      console.info(JSON.stringify(entry));
      break;
    case "warn":
      console.warn(JSON.stringify(entry));
      break;
    case "error":
      console.error(JSON.stringify(entry));
      break;
    default:
      console.log(JSON.stringify(entry));
  }

  void sendToLogDrain(entry);
}

export function logError(
  message: string,
  error: unknown,
  context: LogContext = {},
) {
  const serializedError = serializeError(error);
  log("error", message, {
    ...context,
    error: serializedError,
    errorMessage: serializedError.message,
    errorCode: serializedError.code,
    stackTrace: serializedError.stack,
  });
}

export function logInfo(message: string, context: LogContext = {}) {
  log("info", message, context);
}

export function logWarn(message: string, context: LogContext = {}) {
  log("warn", message, context);
}

export function logDebug(message: string, context: LogContext = {}) {
  log("debug", message, context);
}

export class RequestContext {
  private correlationId: string;
  private traceId: string;
  private startTime: number;

  constructor(
    private requestId: string,
    private route: string,
    private method: string,
    existingContext?: { correlationId?: string; traceId?: string },
  ) {
    this.correlationId = existingContext?.correlationId || crypto.randomUUID();
    this.traceId = existingContext?.traceId || crypto.randomUUID();
    this.startTime = Date.now();
  }

  getRequestId(): string {
    return this.requestId;
  }

  getCorrelationId(): string {
    return this.correlationId;
  }

  getTraceId(): string {
    return this.traceId;
  }

  getDuration(): number {
    return Date.now() - this.startTime;
  }

  getContext(userId?: string, ip?: string, userAgent?: string): LogContext {
    return {
      requestId: this.requestId,
      correlationId: this.correlationId,
      traceId: this.traceId,
      route: this.route,
      method: this.method,
      userId,
      ip,
      userAgent,
    };
  }

  logRequest(userId?: string, ip?: string, userAgent?: string) {
    logInfo("Incoming request", {
      ...this.getContext(userId, ip, userAgent),
      phase: "request",
    });
  }

  logResponse(
    statusCode: number,
    userId?: string,
    ip?: string,
    userAgent?: string,
  ) {
    const duration = this.getDuration();
    logInfo("Outgoing response", {
      ...this.getContext(userId, ip, userAgent),
      statusCode,
      duration,
      phase: "response",
    });
  }

  logError(error: unknown, userId?: string, ip?: string, userAgent?: string) {
    const duration = this.getDuration();
    logError("Request error", error, {
      ...this.getContext(userId, ip, userAgent),
      duration,
      phase: "error",
    });
  }
}

/**
 * Extract request IDs from incoming request headers
 */
export function extractRequestIds(request: Request): {
  requestId: string;
  correlationId?: string;
  traceId?: string;
} {
  return {
    requestId: request.headers.get("x-request-id") || crypto.randomUUID(),
    correlationId: request.headers.get("x-correlation-id") || undefined,
    traceId: request.headers.get("x-trace-id") || undefined,
  };
}

/**
 * Create response headers with request tracking IDs
 */
export function createResponseHeaders(context: {
  requestId: string;
  correlationId: string;
  traceId: string;
}): Headers {
  const headers = new Headers();
  headers.set("x-request-id", context.requestId);
  headers.set("x-correlation-id", context.correlationId);
  headers.set("x-trace-id", context.traceId);
  return headers;
}

export async function flushLogs() {
  await flushLogBuffer();
}

export { retryDeadLetterQueue };
