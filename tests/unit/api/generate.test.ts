import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/generate/route";
import { auth } from "@/lib/auth";
import { getBindings } from "@/lib/cloudflare";
import { createDb } from "@/lib/db";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { generateScripts } from "@/lib/services/generation";
import {
  AuthRequiredError,
  RateLimitError,
  CreditsError,
  NotFoundError,
} from "@/lib/errors";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/cloudflare", () => ({
  getBindings: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  createDb: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn(),
  getClientIp: vi.fn(),
}));

vi.mock("@/lib/services/generation", () => ({
  generateScripts: vi.fn(),
}));

vi.mock("@/lib/api-utils", async () => {
  const actual = await vi.importActual("@/lib/api-utils");
  return {
    ...actual,
    validateCSRF: vi.fn(() => true),
  };
});

describe("API: POST /api/generate", () => {
  const mockSession = {
    user: {
      id: "user-1",
      email: "test@example.com",
      credits: 10,
    },
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  };

  const mockEnv = {
    DB: {} as D1Database,
    AI: {} as Ai,
    NEXTAUTH_SECRET: "test-secret",
    GOOGLE_CLIENT_ID: "test-google-client-id",
    GOOGLE_CLIENT_SECRET: "test-google-secret",
    GITHUB_CLIENT_ID: "test-github-client-id",
    GITHUB_CLIENT_SECRET: "test-github-secret",
    NEXTAUTH_URL: "http://localhost:3000",
  };

  const mockDb = {};

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(getBindings).mockReturnValue(mockEnv as any);
    vi.mocked(createDb).mockReturnValue(mockDb as any);
    vi.mocked(checkRateLimit).mockResolvedValue({ allowed: true });
    vi.mocked(getClientIp).mockReturnValue("127.0.0.1");
    // Default mock for generateScripts to prevent 500 errors in validation tests
    vi.mocked(generateScripts).mockResolvedValue({
      success: true,
      scripts: [],
      creditsRemaining: 9,
      generationId: "gen-1",
    });
  });

  describe("authentication", () => {
    it("should return 401 when no session exists", async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const request = new Request("https://adocavo.net/api/generate", {
        method: "POST",
        body: JSON.stringify({
          hookId: "hook-1",
          productDescription: "A valid product description that is long enough",
        }),
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("AUTH_REQUIRED");
    });

    it("should return 401 when session exists but no user", async () => {
      vi.mocked(auth).mockResolvedValue({ user: null } as any);

      const request = new Request("https://adocavo.net/api/generate", {
        method: "POST",
        body: JSON.stringify({
          hookId: "hook-1",
          productDescription: "A valid product description that is long enough",
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(401);
    });
  });

  describe("request validation", () => {
    it("should validate hookId is present", async () => {
      const request = new Request("https://adocavo.net/api/generate", {
        method: "POST",
        body: JSON.stringify({
          productDescription: "A valid product description that is long enough",
        }),
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.success).toBe(false);
    });

    it("should validate productDescription minimum length", async () => {
      const request = new Request("https://adocavo.net/api/generate", {
        method: "POST",
        body: JSON.stringify({
          hookId: "hook-1",
          productDescription: "Too short",
        }),
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.success).toBe(false);
    });

    it("should validate productDescription maximum length", async () => {
      const request = new Request("https://adocavo.net/api/generate", {
        method: "POST",
        body: JSON.stringify({
          hookId: "hook-1",
          productDescription: "x".repeat(1001),
        }),
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.success).toBe(false);
    });

    it("should handle invalid JSON", async () => {
      const request = new Request("https://adocavo.net/api/generate", {
        method: "POST",
        body: "invalid json",
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.success).toBe(false);
    });
  });

  describe("rate limiting", () => {
    it("should enforce rate limits", async () => {
      vi.mocked(checkRateLimit).mockResolvedValue({
        allowed: false,
        retryAfter: 60,
      });

      const request = new Request("https://adocavo.net/api/generate", {
        method: "POST",
        body: JSON.stringify({
          hookId: "hook-1",
          productDescription: "A valid product description that is long enough",
        }),
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(429);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("RATE_LIMIT_EXCEEDED");
      expect(body.error.details.retryAfter).toBe(60);
    });

    it("should check rate limit with user ID", async () => {
      const request = new Request("https://adocavo.net/api/generate", {
        method: "POST",
        body: JSON.stringify({
          hookId: "hook-1",
          productDescription: "A valid product description that is long enough",
        }),
      });

      await POST(request);

      expect(checkRateLimit).toHaveBeenCalledWith(
        mockDb,
        { type: "user", value: "user-1" },
        "generate",
      );
    });
  });

  describe("environment bindings", () => {
    it("should return 500 when DB binding missing", async () => {
      vi.mocked(getBindings).mockReturnValue({
        ...mockEnv,
        DB: undefined,
      } as any);

      const request = new Request("https://adocavo.net/api/generate", {
        method: "POST",
        body: JSON.stringify({
          hookId: "hook-1",
          productDescription: "A valid product description that is long enough",
        }),
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.success).toBe(false);
    });

    it("should return 500 when AI binding missing", async () => {
      vi.mocked(getBindings).mockReturnValue({
        ...mockEnv,
        AI: undefined,
      } as any);

      const request = new Request("https://adocavo.net/api/generate", {
        method: "POST",
        body: JSON.stringify({
          hookId: "hook-1",
          productDescription: "A valid product description that is long enough",
        }),
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.success).toBe(false);
    });
  });

  describe("generation service integration", () => {
    it("should call generateScripts with correct parameters", async () => {
      vi.mocked(generateScripts).mockResolvedValue({
        success: true,
        scripts: [
          { angle: "Pain Point", script: "Script 1" },
          { angle: "Benefit", script: "Script 2" },
          { angle: "Social Proof", script: "Script 3" },
        ],
        creditsRemaining: 9,
        generationId: "gen-1",
      });

      const request = new Request("https://adocavo.net/api/generate", {
        method: "POST",
        body: JSON.stringify({
          hookId: "hook-1",
          productDescription: "A valid product description that is long enough",
        }),
      });

      const response = await POST(request);
      const body = await response.json();

      expect(generateScripts).toHaveBeenCalledWith(mockEnv.AI, mockEnv.DB, {
        userId: "user-1",
        hookId: "hook-1",
        productDescription: "A valid product description that is long enough",
      });
      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.scripts).toHaveLength(3);
    });

    it("should return 402 when insufficient credits", async () => {
      vi.mocked(generateScripts).mockResolvedValue({
        success: false,
        error: "INSUFFICIENT_CREDITS",
        message: "No credits remaining",
      });

      const request = new Request("https://adocavo.net/api/generate", {
        method: "POST",
        body: JSON.stringify({
          hookId: "hook-1",
          productDescription: "A valid product description that is long enough",
        }),
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(402);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("INSUFFICIENT_CREDITS");
    });

    it("should return 404 when hook not found", async () => {
      vi.mocked(generateScripts).mockResolvedValue({
        success: false,
        error: "HOOK_NOT_FOUND",
        message: "Hook not found",
      });

      const request = new Request("https://adocavo.net/api/generate", {
        method: "POST",
        body: JSON.stringify({
          hookId: "nonexistent-hook",
          productDescription: "A valid product description that is long enough",
        }),
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(404);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("NOT_FOUND");
    });

    it("should return 503 when AI unavailable", async () => {
      vi.mocked(generateScripts).mockResolvedValue({
        success: false,
        error: "AI_UNAVAILABLE",
        message: "AI service unavailable",
      });

      const request = new Request("https://adocavo.net/api/generate", {
        method: "POST",
        body: JSON.stringify({
          hookId: "hook-1",
          productDescription: "A valid product description that is long enough",
        }),
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(503);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("AI_UNAVAILABLE");
    });

    it("should return 502 when AI response invalid", async () => {
      vi.mocked(generateScripts).mockResolvedValue({
        success: false,
        error: "INVALID_AI_RESPONSE",
        message: "Failed to parse AI response",
      });

      const request = new Request("https://adocavo.net/api/generate", {
        method: "POST",
        body: JSON.stringify({
          hookId: "hook-1",
          productDescription: "A valid product description that is long enough",
        }),
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(502);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("INVALID_AI_RESPONSE");
    });

    it("should return 500 on database error", async () => {
      vi.mocked(generateScripts).mockResolvedValue({
        success: false,
        error: "DATABASE_ERROR",
        message: "Failed to save generated scripts",
      });

      const request = new Request("https://adocavo.net/api/generate", {
        method: "POST",
        body: JSON.stringify({
          hookId: "hook-1",
          productDescription: "A valid product description that is long enough",
        }),
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.success).toBe(false);
    });

    it("should return generation result with remaining credits", async () => {
      vi.mocked(generateScripts).mockResolvedValue({
        success: true,
        scripts: [
          { angle: "Pain Point", script: "Script 1" },
          { angle: "Benefit", script: "Script 2" },
          { angle: "Social Proof", script: "Script 3" },
        ],
        creditsRemaining: 7,
        generationId: "gen-123",
      });

      const request = new Request("https://adocavo.net/api/generate", {
        method: "POST",
        body: JSON.stringify({
          hookId: "hook-1",
          productDescription: "A valid product description that is long enough",
        }),
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data.creditsRemaining).toBe(7);
      expect(body.data.generationId).toBe("gen-123");
    });
  });

  describe("edge cases", () => {
    it("should trim productDescription", async () => {
      vi.mocked(generateScripts).mockResolvedValue({
        success: true,
        scripts: [],
        creditsRemaining: 9,
        generationId: "gen-1",
      });

      const request = new Request("https://adocavo.net/api/generate", {
        method: "POST",
        body: JSON.stringify({
          hookId: "hook-1",
          productDescription:
            "  A valid product description that is long enough  ",
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(generateScripts).toHaveBeenCalledWith(
        mockEnv.AI,
        mockEnv.DB,
        expect.objectContaining({
          productDescription: "A valid product description that is long enough",
        }),
      );
    });
  });
});
