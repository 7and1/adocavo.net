import { describe, it, expect } from "vitest";
import {
  AppError,
  ValidationError,
  AuthRequiredError,
  RateLimitError,
  NotFoundError,
  CreditsError,
  isAppError,
} from "@/lib/errors";

describe("Errors", () => {
  describe("AppError", () => {
    it("should create error with code, message, and status", () => {
      const error = new AppError("TEST_CODE", "Test error message", 400);

      expect(error.code).toBe("TEST_CODE");
      expect(error.message).toBe("Test error message");
      expect(error.statusCode).toBe(400);
      expect(error.name).toBe("AppError");
    });

    it("should serialize to JSON correctly", () => {
      const error = new AppError("TEST_CODE", "Test error message", 400, {
        extra: "info",
      });

      const json = error.toJSON();

      expect(json).toEqual({
        code: "TEST_CODE",
        message: "Test error message",
        details: { extra: "info" },
      });
    });

    it("should handle error without details", () => {
      const error = new AppError("TEST_CODE", "Test error message", 400);

      const json = error.toJSON();

      expect(json.details).toBeUndefined();
    });

    it("should be instanceof Error", () => {
      const error = new AppError("TEST_CODE", "Test error message", 400);

      expect(error instanceof Error).toBe(true);
    });
  });

  describe("ValidationError", () => {
    it("should create error with default message", () => {
      const error = new ValidationError();

      expect(error.code).toBe("VALIDATION_ERROR");
      expect(error.message).toBe("Invalid request data");
      expect(error.statusCode).toBe(400);
      expect(error.name).toBe("ValidationError");
    });

    it("should create error with custom message", () => {
      const error = new ValidationError("Custom validation error");

      expect(error.message).toBe("Custom validation error");
      expect(error.code).toBe("VALIDATION_ERROR");
      expect(error.statusCode).toBe(400);
    });

    it("should include details in JSON", () => {
      const details = { field: "email", issue: "invalid format" };
      const error = new ValidationError("Validation failed", details);

      const json = error.toJSON();

      expect(json.details).toEqual(details);
    });

    it("should be instance of AppError", () => {
      const error = new ValidationError();

      expect(error instanceof AppError).toBe(true);
      expect(isAppError(error)).toBe(true);
    });
  });

  describe("AuthRequiredError", () => {
    it("should create error with correct defaults", () => {
      const error = new AuthRequiredError();

      expect(error.code).toBe("AUTH_REQUIRED");
      expect(error.message).toBe("Authentication required");
      expect(error.statusCode).toBe(401);
      expect(error.name).toBe("AuthRequiredError");
    });

    it("should serialize correctly", () => {
      const error = new AuthRequiredError();

      const json = error.toJSON();

      expect(json).toEqual({
        code: "AUTH_REQUIRED",
        message: "Authentication required",
      });
    });

    it("should be instance of AppError", () => {
      const error = new AuthRequiredError();

      expect(error instanceof AppError).toBe(true);
      expect(isAppError(error)).toBe(true);
    });
  });

  describe("RateLimitError", () => {
    it("should create error without retryAfter", () => {
      const error = new RateLimitError();

      expect(error.code).toBe("RATE_LIMIT_EXCEEDED");
      expect(error.message).toBe("Too many requests");
      expect(error.statusCode).toBe(429);
      expect(error.name).toBe("RateLimitError");
    });

    it("should create error with retryAfter", () => {
      const error = new RateLimitError(60);

      expect(error.code).toBe("RATE_LIMIT_EXCEEDED");
      expect(error.statusCode).toBe(429);

      const json = error.toJSON();

      expect(json.details).toEqual({ retryAfter: 60 });
    });

    it("should include retryAfter in details", () => {
      const error = new RateLimitError(120);

      const json = error.toJSON();

      expect(json.details).toEqual({ retryAfter: 120 });
    });

    it("should be instance of AppError", () => {
      const error = new RateLimitError();

      expect(error instanceof AppError).toBe(true);
      expect(isAppError(error)).toBe(true);
    });
  });

  describe("NotFoundError", () => {
    it("should create error with default message", () => {
      const error = new NotFoundError();

      expect(error.code).toBe("NOT_FOUND");
      expect(error.message).toBe("Resource not found");
      expect(error.statusCode).toBe(404);
      expect(error.name).toBe("NotFoundError");
    });

    it("should create error with custom message", () => {
      const error = new NotFoundError("Hook not found");

      expect(error.message).toBe("Hook not found");
      expect(error.code).toBe("NOT_FOUND");
      expect(error.statusCode).toBe(404);
    });

    it("should be instance of AppError", () => {
      const error = new NotFoundError();

      expect(error instanceof AppError).toBe(true);
      expect(isAppError(error)).toBe(true);
    });
  });

  describe("CreditsError", () => {
    it("should create error with correct defaults", () => {
      const error = new CreditsError();

      expect(error.code).toBe("INSUFFICIENT_CREDITS");
      expect(error.message).toBe("No credits remaining");
      expect(error.statusCode).toBe(402);
      expect(error.name).toBe("CreditsError");
    });

    it("should use 402 status code (Payment Required)", () => {
      const error = new CreditsError();

      expect(error.statusCode).toBe(402);
    });

    it("should be instance of AppError", () => {
      const error = new CreditsError();

      expect(error instanceof AppError).toBe(true);
      expect(isAppError(error)).toBe(true);
    });
  });

  describe("isAppError", () => {
    it("should return true for AppError instances", () => {
      const error = new AppError("TEST", "Test", 400);

      expect(isAppError(error)).toBe(true);
    });

    it("should return true for ValidationError", () => {
      const error = new ValidationError();

      expect(isAppError(error)).toBe(true);
    });

    it("should return true for AuthRequiredError", () => {
      const error = new AuthRequiredError();

      expect(isAppError(error)).toBe(true);
    });

    it("should return true for RateLimitError", () => {
      const error = new RateLimitError();

      expect(isAppError(error)).toBe(true);
    });

    it("should return true for NotFoundError", () => {
      const error = new NotFoundError();

      expect(isAppError(error)).toBe(true);
    });

    it("should return true for CreditsError", () => {
      const error = new CreditsError();

      expect(isAppError(error)).toBe(true);
    });

    it("should return false for generic Error", () => {
      const error = new Error("Generic error");

      expect(isAppError(error)).toBe(false);
    });

    it("should return false for non-Error objects", () => {
      expect(isAppError("string")).toBe(false);
      expect(isAppError(null)).toBe(false);
      expect(isAppError(undefined)).toBe(false);
      expect(isAppError({})).toBe(false);
    });

    it("should handle null input", () => {
      expect(isAppError(null)).toBe(false);
    });
  });

  describe("Error inheritance chain", () => {
    it("should maintain proper inheritance for all error types", () => {
      const validationError = new ValidationError();
      const authError = new AuthRequiredError();
      const rateLimitError = new RateLimitError();
      const notFoundError = new NotFoundError();
      const creditsError = new CreditsError();

      expect(validationError instanceof Error).toBe(true);
      expect(authError instanceof Error).toBe(true);
      expect(rateLimitError instanceof Error).toBe(true);
      expect(notFoundError instanceof Error).toBe(true);
      expect(creditsError instanceof Error).toBe(true);

      expect(validationError instanceof AppError).toBe(true);
      expect(authError instanceof AppError).toBe(true);
      expect(rateLimitError instanceof AppError).toBe(true);
      expect(notFoundError instanceof AppError).toBe(true);
      expect(creditsError instanceof AppError).toBe(true);
    });
  });
});
