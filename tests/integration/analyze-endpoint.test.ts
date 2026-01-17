import { describe, it, expect, beforeEach, vi } from "vitest";
import { POST } from "@/app/api/analyze/route";
import { auth } from "@/lib/auth";
import { getBindings } from "@/lib/cloudflare";
import { createDb } from "@/lib/db";
import { checkRateLimit, getRateLimitContext } from "@/lib/rate-limit";
import { analyzeTikTokUrl } from "@/lib/services/competitor-analysis";

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
  getRateLimitContext: vi.fn(),
}));

vi.mock("@/lib/services/competitor-analysis", () => ({
  analyzeTikTokUrl: vi.fn(),
}));

vi.mock("@/lib/api-utils", async () => {
  const actual = await vi.importActual("@/lib/api-utils");
  return {
    ...actual,
    validateCSRF: vi.fn(() => true),
  };
});

describe("Integration: Product URL Analysis Endpoint", () => {
  const mockSession = {
    user: {
      id: "user-1",
      email: "test@example.com",
      credits: 100,
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
    vi.mocked(getRateLimitContext).mockResolvedValue({
      identifier: { type: "user", value: "user-1" },
      tier: "free",
    });
  });

  describe("Authentication and Authorization", () => {
    it("should require authentication", async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const request = new Request("https://adocavo.net/api/analyze", {
        method: "POST",
        headers: {
          origin: "https://adocavo.net",
        },
        body: JSON.stringify({
          url: "https://www.tiktok.com/@user/video/123456789",
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(401);

      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("AUTH_REQUIRED");
    });

    it("should allow authenticated users", async () => {
      vi.mocked(analyzeTikTokUrl).mockResolvedValue({
        success: true,
        result: {
          hook: "Stop scrolling if you want better skin",
          structure: [
            { label: "Hook", summary: "Stops the scroll immediately" },
            { label: "Problem", summary: "Identifies pain point" },
          ],
          template: [
            { label: "Hook", script: "Stop scrolling if..." },
            { label: "Problem", script: "You know when..." },
          ],
          cta: "Link in bio",
        },
      });

      const request = new Request("https://adocavo.net/api/analyze", {
        method: "POST",
        body: JSON.stringify({
          url: "https://www.tiktok.com/@user/video/123456789",
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
    });
  });

  describe("URL Validation", () => {
    it("should accept valid TikTok URLs", async () => {
      vi.mocked(analyzeTikTokUrl).mockResolvedValue({
        success: true,
        result: { hook: "Test hook" },
      });

      const validUrls = [
        "https://www.tiktok.com/@user/video/123456789",
        "https://tiktok.com/@user/video/123456789",
        "https://vm.tiktok.com/ZMJabcd/",
        "https://www.tiktok.com/t/abcd1234",
        "https://www.tiktok.com/@username/video/7234567890?lang=en",
      ];

      for (const url of validUrls) {
        const request = new Request("https://adocavo.net/api/analyze", {
          method: "POST",
          body: JSON.stringify({ url }),
        });

        const response = await POST(request);
        expect(response.status).not.toBe(400);
      }
    });

    it("should reject non-TikTok URLs", async () => {
      const invalidUrls = [
        "https://www.youtube.com/watch?v=123",
        "https://www.instagram.com/p/abcd1234",
        "https://twitter.com/user/status/123",
        "https://facebook.com/video/123",
        "https://example.com",
        "ftp://files.example.com",
        "not-a-url",
        "",
      ];

      for (const url of invalidUrls) {
        const request = new Request("https://adocavo.net/api/analyze", {
          method: "POST",
          body: JSON.stringify({ url }),
        });

        const response = await POST(request);
        expect([400, 422]).toContain(response.status);
      }
    });

    it("should reject URLs exceeding maximum length", async () => {
      const longUrl = "https://www.tiktok.com/@user/video/" + "a".repeat(500);

      const request = new Request("https://adocavo.net/api/analyze", {
        method: "POST",
        body: JSON.stringify({ url: longUrl }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it("should handle URL encoding correctly", async () => {
      vi.mocked(analyzeTikTokUrl).mockResolvedValue({
        success: true,
        result: { hook: "Test hook" },
      });

      const encodedUrl =
        "https%3A%2F%2Fwww.tiktok.com%2F%40user%2Fvideo%2F123456789";

      const request = new Request("https://adocavo.net/api/analyze", {
        method: "POST",
        body: JSON.stringify({ url: encodedUrl }),
      });

      const response = await POST(request);
      expect(response.status).not.toBe(500);
    });
  });

  describe("Rate Limiting", () => {
    it("should enforce rate limits for analyze endpoint", async () => {
      vi.mocked(checkRateLimit).mockResolvedValue({
        allowed: false,
        retryAfter: 3600,
      });

      const request = new Request("https://adocavo.net/api/analyze", {
        method: "POST",
        body: JSON.stringify({
          url: "https://www.tiktok.com/@user/video/123456789",
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(429);

      const body = await response.json();
      expect(body.error.code).toBe("RATE_LIMIT_EXCEEDED");
    });

    it("should use correct action for rate limiting", async () => {
      vi.mocked(analyzeTikTokUrl).mockResolvedValue({
        success: true,
        result: { hook: "Test hook" },
      });

      const request = new Request("https://adocavo.net/api/analyze", {
        method: "POST",
        body: JSON.stringify({
          url: "https://www.tiktok.com/@user/video/123456789",
        }),
      });

      await POST(request);

      expect(checkRateLimit).toHaveBeenCalledWith(
        mockDb,
        { type: "user", value: "user-1" },
        "analyze",
        "free",
      );
    });
  });

  describe("CSRF Protection", () => {
    it("should validate CSRF for POST requests", async () => {
      const request = new Request("https://adocavo.net/api/analyze", {
        method: "POST",
        headers: {
          origin: "https://malicious-site.com",
        },
        body: JSON.stringify({
          url: "https://www.tiktok.com/@user/video/123456789",
        }),
      });

      const response = await POST(request);

      if (response.status === 403) {
        const body = await response.json();
        expect(body.error.code).toBe("CSRF_ERROR");
      }
    });
  });

  describe("Service Integration", () => {
    it("should call analyzeTikTokUrl with correct parameters", async () => {
      vi.mocked(analyzeTikTokUrl).mockResolvedValue({
        success: true,
        result: {
          hook: "Stop scrolling for this hack",
          structure: [
            { label: "Hook", summary: "Stops scrolling" },
            { label: "Content", summary: "Shows value" },
          ],
          template: [
            { label: "Hook", script: "Stop scrolling..." },
            { label: "Content", script: "Here's the hack..." },
          ],
        },
      });

      const testUrl = "https://www.tiktok.com/@user/video/123456789";
      const request = new Request("https://adocavo.net/api/analyze", {
        method: "POST",
        body: JSON.stringify({ url: testUrl }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      expect(analyzeTikTokUrl).toHaveBeenCalledWith(mockEnv.AI, mockEnv.DB, {
        userId: "user-1",
        url: testUrl,
      });
    });

    it("should return analysis result on success", async () => {
      const mockResult = {
        hook: "This skincare hack changed my life",
        structure: [
          { label: "Hook", summary: "Stops scrolling with relatable problem" },
          { label: "Problem", summary: "Introduces pain point about skincare" },
          { label: "Solution", summary: "Shows the product and results" },
          { label: "CTA", summary: "Encourages purchase with urgency" },
        ],
        template: [
          { label: "Hook", script: "Stop scrolling if you're tired of..." },
          { label: "Problem", script: "I've been dealing with..." },
          { label: "Solution", script: "Until I found..." },
          { label: "CTA", script: "Link in bio before it's gone!" },
        ],
        cta: "Check link in bio",
        notes: ["High engagement in first 3 seconds", "Clear visual demo"],
      };

      vi.mocked(analyzeTikTokUrl).mockResolvedValue({
        success: true,
        result: mockResult,
      });

      const request = new Request("https://adocavo.net/api/analyze", {
        method: "POST",
        body: JSON.stringify({
          url: "https://www.tiktok.com/@user/video/123456789",
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.data).toEqual(mockResult);
    });
  });

  describe("Error Handling", () => {
    it("should handle transcript not found error", async () => {
      vi.mocked(analyzeTikTokUrl).mockResolvedValue({
        success: false,
        error: "TRANSCRIPT_NOT_FOUND",
        message: "Unable to extract transcript from that TikTok URL",
      });

      const request = new Request("https://adocavo.net/api/analyze", {
        method: "POST",
        body: JSON.stringify({
          url: "https://www.tiktok.com/@user/video/123456789",
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(422);

      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("TRANSCRIPT_NOT_FOUND");
    });

    it("should handle invalid AI response error", async () => {
      vi.mocked(analyzeTikTokUrl).mockResolvedValue({
        success: false,
        error: "INVALID_AI_RESPONSE",
        message: "AI could not parse the transcript",
      });

      const request = new Request("https://adocavo.net/api/analyze", {
        method: "POST",
        body: JSON.stringify({
          url: "https://www.tiktok.com/@user/video/123456789",
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(502);

      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("INVALID_AI_RESPONSE");
    });

    it("should handle general analysis failure", async () => {
      vi.mocked(analyzeTikTokUrl).mockResolvedValue({
        success: false,
        error: "ANALYSIS_FAILED",
        message: "Analysis failed",
      });

      const request = new Request("https://adocavo.net/api/analyze", {
        method: "POST",
        body: JSON.stringify({
          url: "https://www.tiktok.com/@user/video/123456789",
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(500);

      const body = await response.json();
      expect(body.success).toBe(false);
    });

    it("should handle invalid JSON request body", async () => {
      const request = new Request("https://adocavo.net/api/analyze", {
        method: "POST",
        body: "invalid json {{{",
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it("should handle missing URL field", async () => {
      const request = new Request("https://adocavo.net/api/analyze", {
        method: "POST",
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });
  });

  describe("Environment Bindings", () => {
    it("should return 500 when DB binding missing", async () => {
      vi.mocked(getBindings).mockReturnValue({
        ...mockEnv,
        DB: undefined,
      } as any);

      const request = new Request("https://adocavo.net/api/analyze", {
        method: "POST",
        body: JSON.stringify({
          url: "https://www.tiktok.com/@user/video/123456789",
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(500);
    });

    it("should return 500 when AI binding missing", async () => {
      vi.mocked(getBindings).mockReturnValue({
        ...mockEnv,
        AI: undefined,
      } as any);

      const request = new Request("https://adocavo.net/api/analyze", {
        method: "POST",
        body: JSON.stringify({
          url: "https://www.tiktok.com/@user/video/123456789",
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(500);
    });
  });

  describe("Malicious URL Handling", () => {
    it("should reject URLs with javascript protocol", async () => {
      const maliciousUrls = [
        "javascript:alert(1)",
        "JAVASCRIPT:alert(1)",
        "Javascript:alert(1)",
      ];

      for (const url of maliciousUrls) {
        const request = new Request("https://adocavo.net/api/analyze", {
          method: "POST",
          body: JSON.stringify({ url }),
        });

        const response = await POST(request);
        expect([400, 422]).toContain(response.status);
      }
    });

    it("should reject data protocol URLs", async () => {
      const request = new Request("https://adocavo.net/api/analyze", {
        method: "POST",
        body: JSON.stringify({
          url: "data:text/html,<script>alert(1)</script>",
        }),
      });

      const response = await POST(request);
      expect([400, 422]).toContain(response.status);
    });

    it("should reject file protocol URLs", async () => {
      const request = new Request("https://adocavo.net/api/analyze", {
        method: "POST",
        body: JSON.stringify({
          url: "file:///etc/passwd",
        }),
      });

      const response = await POST(request);
      expect([400, 422]).toContain(response.status);
    });
  });

  describe("Response Format", () => {
    it("should return consistent API response structure", async () => {
      vi.mocked(analyzeTikTokUrl).mockResolvedValue({
        success: true,
        result: {
          hook: "Test hook",
          structure: [],
          template: [],
        },
      });

      const request = new Request("https://adocavo.net/api/analyze", {
        method: "POST",
        body: JSON.stringify({
          url: "https://www.tiktok.com/@user/video/123456789",
        }),
      });

      const response = await POST(request);
      const body = await response.json();

      expect(body).toHaveProperty("success");
      if (body.success) {
        expect(body).toHaveProperty("data");
      } else {
        expect(body).toHaveProperty("error");
        expect(body.error).toHaveProperty("code");
        expect(body.error).toHaveProperty("message");
      }
    });
  });
});
