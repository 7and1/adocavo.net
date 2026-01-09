import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  successResponse,
  errorResponse,
  withErrorHandler,
  type APIResponse,
} from "@/lib/api-utils";
import { ZodError } from "zod";
import {
  AppError,
  ValidationError,
  AuthRequiredError,
  RateLimitError,
  NotFoundError,
  CreditsError,
} from "@/lib/errors";
import { NextResponse } from "next/server";

describe("API Utils", () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });
  describe("successResponse", () => {
    it("should create success response with data", () => {
      const data = { id: "123", name: "Test" };
      const response = successResponse(data);

      expect(response).toBeInstanceOf(NextResponse);
      expect(response.status).toBe(200);
    });

    it("should include success: true in response body", async () => {
      const data = { message: "Success" };
      const response = successResponse(data);
      const body = await response.json();

      expect(body).toEqual({
        success: true,
        data: { message: "Success" },
      });
    });

    it("should allow custom status code", () => {
      const response = successResponse({ created: true }, 201);

      expect(response.status).toBe(201);
    });

    it("should handle complex data structures", async () => {
      const data = {
        user: { id: "1", credits: 5 },
        scripts: [{ angle: "Pain Point", script: "Test" }],
      };
      const response = successResponse(data);
      const body = await response.json();

      expect(body.data).toEqual(data);
    });

    it("should handle null data", async () => {
      const response = successResponse(null);
      const body = await response.json();

      expect(body.data).toBeNull();
      expect(body.success).toBe(true);
    });

    it("should handle empty object data", async () => {
      const response = successResponse({});
      const body = await response.json();

      expect(body.data).toEqual({});
    });

    it("should default to status 200", () => {
      const response = successResponse({ test: true });

      expect(response.status).toBe(200);
    });
  });

  describe("errorResponse", () => {
    it("should handle AppError correctly", async () => {
      const error = new AppError("TEST_CODE", "Test error", 400);
      const response = errorResponse(error);
      const body = await response.json();

      expect(body).toEqual({
        success: false,
        error: {
          code: "TEST_CODE",
          message: "Test error",
          details: undefined,
        },
      });
      expect(response.status).toBe(400);
    });

    it("should handle ValidationError", async () => {
      const error = new ValidationError("Invalid input");
      const response = errorResponse(error);
      const body = await response.json();

      expect(body.success).toBe(false);
      expect(body.error.code).toBe("VALIDATION_ERROR");
      expect(body.error.message).toBe("Invalid input");
      expect(response.status).toBe(400);
    });

    it("should handle AuthRequiredError", async () => {
      const error = new AuthRequiredError();
      const response = errorResponse(error);
      const body = await response.json();

      expect(body.success).toBe(false);
      expect(body.error.code).toBe("AUTH_REQUIRED");
      expect(response.status).toBe(401);
    });

    it("should handle RateLimitError", async () => {
      const error = new RateLimitError(60);
      const response = errorResponse(error);
      const body = await response.json();

      expect(body.success).toBe(false);
      expect(body.error.code).toBe("RATE_LIMIT_EXCEEDED");
      expect(body.error.details).toEqual({ retryAfter: 60 });
      expect(response.status).toBe(429);
    });

    it("should handle NotFoundError", async () => {
      const error = new NotFoundError("Resource not found");
      const response = errorResponse(error);
      const body = await response.json();

      expect(body.success).toBe(false);
      expect(body.error.code).toBe("NOT_FOUND");
      expect(response.status).toBe(404);
    });

    it("should handle CreditsError", async () => {
      const error = new CreditsError();
      const response = errorResponse(error);
      const body = await response.json();

      expect(body.success).toBe(false);
      expect(body.error.code).toBe("INSUFFICIENT_CREDITS");
      expect(response.status).toBe(402);
    });

    it("should handle ZodError with validation details", async () => {
      const zodError = new ZodError([
        {
          code: "invalid_type",
          expected: "string",
          received: "number",
          path: ["field1"],
          message: "Expected string, received number",
        },
        {
          code: "too_small",
          minimum: 5,
          type: "string",
          path: ["field2"],
          message: "String must contain at least 5 character(s)",
        },
      ]);

      const response = errorResponse(zodError);
      const body = await response.json();

      expect(body.success).toBe(false);
      expect(body.error.code).toBe("VALIDATION_ERROR");
      expect(body.error.message).toBe("Invalid request data");
      expect(body.error.details).toBeDefined();
      expect(response.status).toBe(400);
    });

    it("should handle generic Error with INTERNAL_ERROR code", async () => {
      const error = new Error("Something went wrong");
      const response = errorResponse(error);
      const body = await response.json();

      expect(body).toEqual({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred",
        },
      });
      expect(response.status).toBe(500);
    });

    it("should handle non-Error objects", async () => {
      const response = errorResponse("string error");
      const body = await response.json();

      expect(body.success).toBe(false);
      expect(body.error.code).toBe("INTERNAL_ERROR");
      expect(response.status).toBe(500);
    });

    it("should handle null error", async () => {
      const response = errorResponse(null);
      const body = await response.json();

      expect(body.success).toBe(false);
      expect(body.error.code).toBe("INTERNAL_ERROR");
    });

    it("should handle undefined error", async () => {
      const response = errorResponse(undefined);
      const body = await response.json();

      expect(body.success).toBe(false);
      expect(body.error.code).toBe("INTERNAL_ERROR");
    });

    it("should include error details when present", async () => {
      const error = new AppError("TEST_CODE", "Test error", 400, {
        field: "email",
        issue: "invalid",
      });
      const response = errorResponse(error);
      const body = await response.json();

      expect(body.error.details).toEqual({ field: "email", issue: "invalid" });
    });
  });

  describe("withErrorHandler", () => {
    it("should call handler and return response on success", async () => {
      const handler = vi
        .fn()
        .mockResolvedValue(successResponse({ result: "success" }));

      const wrapped = withErrorHandler(handler);
      const request = new Request("https://example.com");
      const response = await wrapped(request);

      expect(handler).toHaveBeenCalledWith(request, undefined);
      const body = await response.json();
      expect(body.data.result).toBe("success");
    });

    it("should catch AppError and return error response", async () => {
      const handler = vi
        .fn()
        .mockRejectedValue(new NotFoundError("Resource not found"));

      const wrapped = withErrorHandler(handler);
      const response = await wrapped(new Request("https://example.com"));
      const body = await response.json();

      expect(body.success).toBe(false);
      expect(body.error.code).toBe("NOT_FOUND");
      expect(response.status).toBe(404);
    });

    it("should catch generic Error and return internal error", async () => {
      const handler = vi.fn().mockRejectedValue(new Error("Unexpected error"));

      const wrapped = withErrorHandler(handler);
      const response = await wrapped(new Request("https://example.com"));
      const body = await response.json();

      expect(body.success).toBe(false);
      expect(body.error.code).toBe("INTERNAL_ERROR");
      expect(response.status).toBe(500);
    });

    it("should pass context to handler", async () => {
      const handler = vi.fn().mockResolvedValue(successResponse({}));
      const context = { params: Promise.resolve({ id: "123" }) };

      const wrapped = withErrorHandler(handler);
      const request = new Request("https://example.com");
      await wrapped(request, context);

      expect(handler).toHaveBeenCalledWith(request, context);
    });

    it("should handle ZodError from handler", async () => {
      const handler = vi.fn().mockRejectedValue(
        new ZodError([
          {
            code: "invalid_type",
            expected: "string",
            received: "number",
            path: ["field"],
            message: "Invalid type",
          },
        ]),
      );

      const wrapped = withErrorHandler(handler);
      const response = await wrapped(new Request("https://example.com"));
      const body = await response.json();

      expect(body.success).toBe(false);
      expect(body.error.code).toBe("VALIDATION_ERROR");
      expect(response.status).toBe(400);
    });

    it("should handle synchronous thrown errors", async () => {
      const handler = vi.fn().mockImplementation(() => {
        throw new ValidationError("Sync error");
      });

      const wrapped = withErrorHandler(handler);
      const response = await wrapped(new Request("https://example.com"));
      const body = await response.json();

      expect(body.success).toBe(false);
      expect(body.error.code).toBe("VALIDATION_ERROR");
    });

    it("should preserve handler's response type", async () => {
      interface TestData {
        id: string;
      }

      const handler: (
        request: Request,
      ) => Promise<NextResponse<APIResponse<TestData>>> = vi
        .fn()
        .mockResolvedValue(successResponse({ id: "123" }));

      const wrapped = withErrorHandler<TestData>(handler);
      const response = await wrapped(new Request("https://example.com"));
      const body = await response.json();

      expect(body.data.id).toBe("123");
    });
  });
});
