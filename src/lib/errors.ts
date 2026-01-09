export interface AppErrorJSON {
  code: string;
  message: string;
  details?: unknown;
}

export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }

  toJSON(): AppErrorJSON {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
    };
  }
}

export class ValidationError extends AppError {
  constructor(message = "Invalid request data", details?: unknown) {
    super("VALIDATION_ERROR", message, 400, details);
    this.name = "ValidationError";
  }
}

export class AuthRequiredError extends AppError {
  constructor() {
    super("AUTH_REQUIRED", "Authentication required", 401);
    this.name = "AuthRequiredError";
  }
}

export class RateLimitError extends AppError {
  constructor(retryAfter?: number) {
    super(
      "RATE_LIMIT_EXCEEDED",
      "Too many requests",
      429,
      retryAfter ? { retryAfter } : undefined,
    );
    this.name = "RateLimitError";
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Resource not found") {
    super("NOT_FOUND", message, 404);
    this.name = "NotFoundError";
  }
}

export class CreditsError extends AppError {
  constructor() {
    super("INSUFFICIENT_CREDITS", "No credits remaining", 402);
    this.name = "CreditsError";
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
