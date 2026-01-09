type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  requestId?: string;
  timestamp: string;
}

class Logger {
  private requestId?: string;

  setRequestId(id: string) {
    this.requestId = id;
  }

  private log(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>,
  ) {
    const entry: LogEntry = {
      level,
      message,
      context,
      requestId: this.requestId,
      timestamp: new Date().toISOString(),
    };

    const logMessage = JSON.stringify(entry);

    switch (level) {
      case "debug":
      case "info":
        console.log(logMessage);
        break;
      case "warn":
        console.warn(logMessage);
        break;
      case "error":
        console.error(logMessage);
        break;
    }
  }

  debug(message: string, context?: Record<string, unknown>) {
    this.log("debug", message, context);
  }

  info(message: string, context?: Record<string, unknown>) {
    this.log("info", message, context);
  }

  warn(message: string, context?: Record<string, unknown>) {
    this.log("warn", message, context);
  }

  error(
    message: string,
    error?: Error | unknown,
    context?: Record<string, unknown>,
  ) {
    const errorContext =
      error instanceof Error
        ? { ...context, error: error.message, stack: error.stack }
        : context;
    this.log("error", message, errorContext);
  }

  metric(name: string, value: number, unit = "ms") {
    this.info("metric", { metric: name, value, unit });
  }
}

export const logger = new Logger();

export function withLogger<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  name = fn.name,
): T {
  return (async (...args: unknown[]) => {
    const requestId = crypto.randomUUID?.() || Math.random().toString(36);
    logger.setRequestId(requestId);

    const startTime = performance.now();
    logger.info(`Starting: ${name}`);

    try {
      const result = await fn(...args);
      const duration = performance.now() - startTime;
      logger.metric(`duration.${name}`, duration);
      logger.info(`Completed: ${name}`, { duration });
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      logger.error(`Failed: ${name}`, error, { duration });
      throw error;
    }
  }) as T;
}
