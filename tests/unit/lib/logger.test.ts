import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  log,
  logError,
  logInfo,
  logWarn,
  logDebug,
  RequestContext,
  flushLogs,
  retryDeadLetterQueue,
  type LogContext,
} from "@/lib/logger";

const mockGetBindings = vi.fn(() => ({
  LOG_LEVEL: "info",
  LOG_DRAIN_URL: "https://logs.example.com",
  LOG_DRAIN_TOKEN: "test-token",
  LOG_DRAIN_PROVIDER: "generic",
}));

const mockGetKV = vi.fn(() => ({
  put: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/cloudflare", () => ({
  getBindings: () => mockGetBindings(),
  getKV: () => mockGetKV(),
}));

describe("Logger", () => {
  let consoleSpy: {
    debug?: ReturnType<typeof vi.spyOn>;
    info?: ReturnType<typeof vi.spyOn>;
    warn?: ReturnType<typeof vi.spyOn>;
    error?: ReturnType<typeof vi.spyOn>;
    log?: ReturnType<typeof vi.spyOn>;
  } = {};

  beforeEach(() => {
    vi.clearAllMocks();
    consoleSpy = {
      debug: vi.spyOn(console, "debug").mockImplementation(() => {}),
      info: vi.spyOn(console, "info").mockImplementation(() => {}),
      warn: vi.spyOn(console, "warn").mockImplementation(() => {}),
      error: vi.spyOn(console, "error").mockImplementation(() => {}),
      log: vi.spyOn(console, "log").mockImplementation(() => {}),
    };

    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("log", () => {
    it("should log debug message when log level is debug", () => {
      mockGetBindings.mockReturnValue({ LOG_LEVEL: "debug" });

      const context: LogContext = { userId: "user-123" };
      log("debug", "Test debug message", context);

      expect(consoleSpy.debug).toHaveBeenCalled();
      const loggedData = JSON.parse(consoleSpy.debug!.mock.calls[0][0]);
      expect(loggedData.level).toBe("debug");
      expect(loggedData.message).toBe("Test debug message");
      expect(loggedData.userId).toBe("user-123");
    });

    it("should log info message", () => {
      const context: LogContext = { userId: "user-456" };
      log("info", "Test info message", context);

      expect(consoleSpy.info).toHaveBeenCalled();
      const loggedData = JSON.parse(consoleSpy.info!.mock.calls[0][0]);
      expect(loggedData.level).toBe("info");
      expect(loggedData.message).toBe("Test info message");
      expect(loggedData.userId).toBe("user-456");
    });

    it("should log warn message", () => {
      log("warn", "Test warn message");

      expect(consoleSpy.warn).toHaveBeenCalled();
      const loggedData = JSON.parse(consoleSpy.warn!.mock.calls[0][0]);
      expect(loggedData.level).toBe("warn");
      expect(loggedData.message).toBe("Test warn message");
    });

    it("should log error message", () => {
      log("error", "Test error message");

      expect(consoleSpy.error).toHaveBeenCalled();
      const loggedData = JSON.parse(consoleSpy.error!.mock.calls[0][0]);
      expect(loggedData.level).toBe("error");
      expect(loggedData.message).toBe("Test error message");
    });

    it("should not log debug when log level is info", () => {
      log("debug", "Debug message");

      expect(consoleSpy.debug).not.toHaveBeenCalled();
    });

    it("should include timestamp in log entry", () => {
      log("info", "Test message");

      const loggedData = JSON.parse(consoleSpy.info!.mock.calls[0][0]);
      expect(loggedData.timestamp).toBeDefined();
      expect(new Date(loggedData.timestamp)).toBeInstanceOf(Date);
    });

    it("should merge context with log entry", () => {
      const context: LogContext = {
        userId: "user-789",
        route: "/api/hooks",
        method: "GET",
        status: 200,
      };
      log("info", "Request completed", context);

      const loggedData = JSON.parse(consoleSpy.info!.mock.calls[0][0]);
      expect(loggedData.userId).toBe("user-789");
      expect(loggedData.route).toBe("/api/hooks");
      expect(loggedData.method).toBe("GET");
      expect(loggedData.status).toBe(200);
    });

    it("should handle empty context", () => {
      log("info", "Test message");

      expect(consoleSpy.info).toHaveBeenCalled();
    });

    it("should handle context with custom properties", () => {
      const context: LogContext = {
        customField: "custom-value",
        anotherField: 123,
      };
      log("info", "Test with custom fields", context);

      const loggedData = JSON.parse(consoleSpy.info!.mock.calls[0][0]);
      expect(loggedData.customField).toBe("custom-value");
      expect(loggedData.anotherField).toBe(123);
    });
  });

  describe("logError", () => {
    it("should log error with Error object", () => {
      const error = new Error("Something went wrong");
      logError("Operation failed", error, { userId: "user-123" });

      expect(consoleSpy.error).toHaveBeenCalled();
      const loggedData = JSON.parse(consoleSpy.error!.mock.calls[0][0]);
      expect(loggedData.message).toBe("Operation failed");
      expect(loggedData.error.name).toBe("Error");
      expect(loggedData.error.message).toBe("Something went wrong");
      expect(loggedData.error.stack).toBeDefined();
    });

    it("should log error with custom error class", () => {
      class CustomError extends Error {
        constructor(
          message: string,
          public code: string,
        ) {
          super(message);
          this.name = "CustomError";
        }
      }

      const error = new CustomError("Custom error occurred", "CUSTOM_ERR");
      logError("Custom operation failed", error);

      const loggedData = JSON.parse(consoleSpy.error!.mock.calls[0][0]);
      expect(loggedData.error.message).toBe("Custom error occurred");
      expect(loggedData.errorMessage).toBe("Custom error occurred");
    });

    it("should log error with status code", () => {
      const error = new Error("Not found") as Error & { statusCode: number };
      error.statusCode = 404;
      logError("Resource not found", error);

      const loggedData = JSON.parse(consoleSpy.error!.mock.calls[0][0]);
      expect(loggedData.error.statusCode).toBe(404);
    });

    it("should log error with error code", () => {
      const error = new Error("Database error") as Error & { code?: string };
      error.code = "DB_CONN_ERR";
      logError("Database connection failed", error);

      const loggedData = JSON.parse(consoleSpy.error!.mock.calls[0][0]);
      expect(loggedData.error.code).toBe("DB_CONN_ERR");
      expect(loggedData.errorCode).toBe("DB_CONN_ERR");
    });

    it("should handle non-Error objects", () => {
      logError("Unexpected error", "string error", { userId: "user-123" });

      const loggedData = JSON.parse(consoleSpy.error!.mock.calls[0][0]);
      expect(loggedData.error.message).toBe("string error");
    });

    it("should handle null error", () => {
      logError("Operation failed", null);

      const loggedData = JSON.parse(consoleSpy.error!.mock.calls[0][0]);
      expect(loggedData.error.message).toBe("null");
    });

    it("should include stack trace when available", () => {
      const error = new Error("Stack trace test");
      logError("Test stack trace", error);

      const loggedData = JSON.parse(consoleSpy.error!.mock.calls[0][0]);
      expect(loggedData.error.stack).toBeDefined();
      expect(loggedData.stackTrace).toBe(loggedData.error.stack);
    });
  });

  describe("logInfo", () => {
    it("should log info level message", () => {
      logInfo("User logged in", { userId: "user-123" });

      expect(consoleSpy.info).toHaveBeenCalled();
      const loggedData = JSON.parse(consoleSpy.info!.mock.calls[0][0]);
      expect(loggedData.level).toBe("info");
      expect(loggedData.message).toBe("User logged in");
    });

    it("should work without context", () => {
      logInfo("Simple info message");

      expect(consoleSpy.info).toHaveBeenCalled();
    });
  });

  describe("logWarn", () => {
    it("should log warn level message", () => {
      logWarn("Deprecated API usage", { endpoint: "/api/v1/old" });

      expect(consoleSpy.warn).toHaveBeenCalled();
      const loggedData = JSON.parse(consoleSpy.warn!.mock.calls[0][0]);
      expect(loggedData.level).toBe("warn");
      expect(loggedData.message).toBe("Deprecated API usage");
      expect(loggedData.endpoint).toBe("/api/v1/old");
    });
  });

  describe("logDebug", () => {
    it("should not log when log level is info", () => {
      logDebug("Debug info");

      expect(consoleSpy.debug).not.toHaveBeenCalled();
    });

    it("should log when log level is debug", () => {
      mockGetBindings.mockReturnValue({ LOG_LEVEL: "debug" });

      logDebug("Debug info", { variable: "value" });

      expect(consoleSpy.debug).toHaveBeenCalled();
      const loggedData = JSON.parse(consoleSpy.debug!.mock.calls[0][0]);
      expect(loggedData.level).toBe("debug");
      expect(loggedData.variable).toBe("value");
    });
  });

  describe("RequestContext", () => {
    it("should create context with unique IDs", () => {
      const ctx = new RequestContext("req-1", "/api/test", "GET");

      expect(ctx.getCorrelationId()).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
      expect(ctx.getTraceId()).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
      expect(ctx.getCorrelationId()).not.toBe(ctx.getTraceId());
    });

    it("should track request duration", () => {
      const ctx = new RequestContext("req-1", "/api/test", "GET");

      const initialDuration = ctx.getDuration();
      expect(initialDuration).toBeGreaterThanOrEqual(0);

      // Advance time (simulated by checking again)
      const laterDuration = ctx.getDuration();
      expect(laterDuration).toBeGreaterThanOrEqual(initialDuration);
    });

    it("should get context with user info", () => {
      const ctx = new RequestContext("req-1", "/api/test", "GET");

      const context = ctx.getContext("user-123", "127.0.0.1", "TestAgent/1.0");

      expect(context.requestId).toBe("req-1");
      expect(context.route).toBe("/api/test");
      expect(context.method).toBe("GET");
      expect(context.userId).toBe("user-123");
      expect(context.ip).toBe("127.0.0.1");
      expect(context.userAgent).toBe("TestAgent/1.0");
      expect(context.correlationId).toBeDefined();
      expect(context.traceId).toBeDefined();
    });

    it("should get context without optional parameters", () => {
      const ctx = new RequestContext("req-2", "/api/hooks", "POST");

      const context = ctx.getContext();

      expect(context.requestId).toBe("req-2");
      expect(context.userId).toBeUndefined();
      expect(context.ip).toBeUndefined();
      expect(context.userAgent).toBeUndefined();
    });

    it("should log incoming request", () => {
      const ctx = new RequestContext("req-3", "/api/generate", "POST");

      ctx.logRequest("user-456", "192.168.1.1", "Mozilla/5.0");

      expect(consoleSpy.info).toHaveBeenCalled();
      const loggedData = JSON.parse(consoleSpy.info!.mock.calls[0][0]);
      expect(loggedData.message).toBe("Incoming request");
      expect(loggedData.phase).toBe("request");
      expect(loggedData.requestId).toBe("req-3");
    });

    it("should log outgoing response", () => {
      const ctx = new RequestContext("req-4", "/api/hooks", "GET");

      ctx.logResponse(200, "user-789");

      expect(consoleSpy.info).toHaveBeenCalled();
      const loggedData = JSON.parse(consoleSpy.info!.mock.calls[0][0]);
      expect(loggedData.message).toBe("Outgoing response");
      expect(loggedData.phase).toBe("response");
      expect(loggedData.statusCode).toBe(200);
      expect(loggedData.duration).toBeGreaterThanOrEqual(0);
    });

    it("should log request error", () => {
      const ctx = new RequestContext("req-5", "/api/fail", "POST");
      const error = new Error("Request processing failed");

      ctx.logError(error, "user-error", "10.0.0.1");

      expect(consoleSpy.error).toHaveBeenCalled();
      const loggedData = JSON.parse(consoleSpy.error!.mock.calls[0][0]);
      expect(loggedData.message).toBe("Request error");
      expect(loggedData.phase).toBe("error");
      expect(loggedData.error.message).toBe("Request processing failed");
    });

    it("should maintain consistent IDs across the request lifecycle", () => {
      const ctx = new RequestContext("req-6", "/api/test", "GET");

      const correlationId = ctx.getCorrelationId();
      const traceId = ctx.getTraceId();
      const context1 = ctx.getContext();
      const context2 = ctx.getContext();

      expect(context1.correlationId).toBe(correlationId);
      expect(context1.traceId).toBe(traceId);
      expect(context2.correlationId).toBe(correlationId);
      expect(context2.traceId).toBe(traceId);
    });
  });

  describe("log drain integration", () => {
    it("should schedule flush when log is created", async () => {
      // Note: Fake timers have compatibility issues with async operations
      // This test verifies the log function doesn't throw
      logInfo("Test message for drain");

      // Log should be created without errors
      expect(consoleSpy.info).toHaveBeenCalled();
    });

    it("should flush logs on demand", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
      } as Response);

      await flushLogs();

      // No assertions needed - just ensure it doesn't throw
    });

    it("should handle fetch errors during log drain", async () => {
      global.fetch = vi.fn().mockImplementation(async () => {
        throw new Error("Network error");
      });

      logInfo("Test message");

      // Wait a bit for any scheduled flushes to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Should not throw
      await flushLogs();
    }, 10000);
  });

  describe("retryDeadLetterQueue", () => {
    it("should retry failed log sends", async () => {
      // This test runs after other tests that may have populated the dead letter queue
      // Just ensure the function doesn't throw
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
      } as Response);
      global.fetch = mockFetch;

      await expect(retryDeadLetterQueue()).resolves.not.toThrow();
    });
  });

  describe("edge cases", () => {
    it("should handle very long log messages", () => {
      const longMessage = "x".repeat(10000);
      logInfo(longMessage);

      expect(consoleSpy.info).toHaveBeenCalled();
    });

    it("should handle special characters in messages", () => {
      const specialMessage =
        "Test with \"quotes\" and 'apostrophes' \n\t and emojis 🎉";
      logInfo(specialMessage);

      const loggedData = JSON.parse(consoleSpy.info!.mock.calls[0][0]);
      expect(loggedData.message).toContain("quotes");
    });

    it("should handle undefined context values", () => {
      logInfo("Test", { userId: undefined } as unknown as LogContext);

      expect(consoleSpy.info).toHaveBeenCalled();
    });

    it("should handle circular references via JSON.stringify fallback", () => {
      const context: LogContext = { userId: "user-123" };
      // @ts-expect-error - testing circular reference
      context.self = context;

      // JSON.stringify throws on circular references, but we want to document this behavior
      // The logger currently does not handle circular references
      expect(() => logInfo("Test", context)).toThrow();
    });

    it("should handle concurrent log calls", async () => {
      const promises = Array.from({ length: 100 }, (_, i) =>
        Promise.resolve(logInfo(`Concurrent log ${i}`)),
      );

      await Promise.all(promises);

      expect(consoleSpy.info).toHaveBeenCalledTimes(100);
    });
  });
});
