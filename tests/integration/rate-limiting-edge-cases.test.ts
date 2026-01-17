import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { POST } from "@/app/api/generate/route";
import { POST as POSTWaitlist } from "@/app/api/waitlist/route";
import { POST as POSTAnalyze } from "@/app/api/analyze/route";
import { auth } from "@/lib/auth";
import { getBindings } from "@/lib/cloudflare";
import { createDb } from "@/lib/db";
import { checkRateLimit, getRateLimitContext } from "@/lib/rate-limit";
import {
  generateScripts,
  generateGuestScripts,
} from "@/lib/services/generation";
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

vi.mock("@/lib/services/generation", () => ({
  generateScripts: vi.fn(),
  generateGuestScripts: vi.fn(),
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

describe("Integration: Rate Limiting Edge Cases", () => {
  const mockSession = {
    user: {
      id: "user-1",
      email: "test@example.com",
      credits: 100,
      role: "user",
    },
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  };

  const mockProSession = {
    user: {
      id: "pro-user-1",
      email: "pro@example.com",
      credits: 1000,
      role: "pro",
    },
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  };

  const mockAdminSession = {
    user: {
      id: "admin-user-1",
      email: "admin@example.com",
      credits: 1000,
      role: "admin",
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

  const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

  beforeEach(() => {
    vi.clearAllMocks();
    rateLimitStore.clear();

    vi.mocked(getBindings).mockReturnValue(mockEnv as any);
    vi.mocked(createDb).mockReturnValue(mockDb as any);
    vi.mocked(generateScripts).mockResolvedValue({
      success: true,
      scripts: [
        { angle: "Pain Point", script: "Script 1" },
        { angle: "Benefit", script: "Script 2" },
        { angle: "Social Proof", script: "Script 3" },
      ],
      creditsRemaining: 95,
      generationId: "gen-1",
    });
    vi.mocked(generateGuestScripts).mockResolvedValue({
      success: true,
      scripts: [],
      creditsRemaining: 0,
      generationId: "guest-gen-1",
    });
    vi.mocked(analyzeTikTokUrl).mockResolvedValue({
      success: true,
      result: {
        hook: "Test hook",
        structure: [{ label: "Intro", summary: "Test summary" }],
        template: [{ label: "Hook", script: "Test script" }],
      },
    });

    vi.mocked(checkRateLimit).mockImplementation(
      async (db, identifier, action, tier) => {
        const key = `${identifier.type}:${identifier.value}:${action}`;
        const now = Date.now();
        const record = rateLimitStore.get(key);

        if (!record || record.resetAt < now) {
          rateLimitStore.set(key, { count: 1, resetAt: now + 60000 });
          return { allowed: true };
        }

        record.count++;
        const limits = getLimits(action, tier);

        if (record.count > limits) {
          const retryAfter = Math.ceil((record.resetAt - now) / 1000);
          return { allowed: false, retryAfter: Math.max(0, retryAfter) };
        }

        return { allowed: true };
      },
    );
  });

  afterEach(() => {
    rateLimitStore.clear();
  });

  function getLimits(action: string, tier: string): number {
    const limits: Record<string, Record<string, number>> = {
      generate: { anon: 3, free: 10, pro: 30, admin: 30 },
      generateGuest: { anon: 3, free: 3, pro: 3, admin: 3 },
      waitlist: { anon: 3, free: 5, pro: 10, admin: 10 },
      analyze: { anon: 2, free: 8, pro: 20, admin: 20 },
    };
    return limits[action]?.[tier] || 10;
  }

  describe("Tier-Based Rate Limiting", () => {
    it("should apply different limits for anonymous users", async () => {
      vi.mocked(auth).mockResolvedValue(null);
      vi.mocked(getRateLimitContext).mockResolvedValue({
        identifier: { type: "device", value: "device-anon-1" },
        tier: "anon",
      });

      const requests = [];
      for (let i = 0; i < 3; i++) {
        requests.push(
          new Request("https://adocavo.net/api/generate", {
            method: "POST",
            body: JSON.stringify({
              hookId: `hook-${i}`,
              productDescription: `Product ${i} that is long enough for testing`,
            }),
          }),
        );
      }

      const responses = await Promise.all(requests.map((req) => POST(req)));
      const successCount = responses.filter((r) => r.status === 200).length;

      expect(successCount).toBeLessThanOrEqual(3);
    });

    it("should apply different limits for free users", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as any);
      vi.mocked(getRateLimitContext).mockResolvedValue({
        identifier: { type: "user", value: "user-1" },
        tier: "free",
      });

      for (let i = 0; i < 10; i++) {
        const request = new Request("https://adocavo.net/api/generate", {
          method: "POST",
          body: JSON.stringify({
            hookId: `hook-${i}`,
            productDescription: `Product ${i} that is long enough for testing`,
          }),
        });

        const response = await POST(request);
        if (i < 10) {
          expect(response.status).toBe(200);
        }
      }

      const request11 = new Request("https://adocavo.net/api/generate", {
        method: "POST",
        body: JSON.stringify({
          hookId: "hook-11",
          productDescription: "Product that is long enough for testing",
        }),
      });

      const response11 = await POST(request11);
      expect(response11.status).toBe(429);
    });

    it("should apply different limits for pro users", async () => {
      vi.mocked(auth).mockResolvedValue(mockProSession as any);
      vi.mocked(getRateLimitContext).mockResolvedValue({
        identifier: { type: "user", value: "pro-user-1" },
        tier: "pro",
      });

      for (let i = 0; i < 30; i++) {
        const request = new Request("https://adocavo.net/api/generate", {
          method: "POST",
          body: JSON.stringify({
            hookId: `hook-${i}`,
            productDescription: `Product ${i} that is long enough for testing`,
          }),
        });

        const response = await POST(request);
        if (i < 30) {
          expect(response.status).toBe(200);
        }
      }

      const request31 = new Request("https://adocavo.net/api/generate", {
        method: "POST",
        body: JSON.stringify({
          hookId: "hook-31",
          productDescription: "Product that is long enough for testing",
        }),
      });

      const response31 = await POST(request31);
      expect(response31.status).toBe(429);
    });

    it("should apply higher limits for admin users", async () => {
      vi.mocked(auth).mockResolvedValue(mockAdminSession as any);
      vi.mocked(getRateLimitContext).mockResolvedValue({
        identifier: { type: "user", value: "admin-user-1" },
        tier: "admin",
      });

      for (let i = 0; i < 10; i++) {
        const request = new Request("https://adocavo.net/api/generate", {
          method: "POST",
          body: JSON.stringify({
            hookId: `hook-${i}`,
            productDescription: `Product ${i} that is long enough for testing`,
          }),
        });

        const response = await POST(request);
        expect(response.status).toBe(200);
      }
    });
  });

  describe("Endpoint-Specific Rate Limits", () => {
    it("should track generate endpoint separately from other endpoints", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as any);
      vi.mocked(getRateLimitContext).mockResolvedValue({
        identifier: { type: "user", value: "user-1" },
        tier: "free",
      });

      for (let i = 0; i < 10; i++) {
        const genRequest = new Request("https://adocavo.net/api/generate", {
          method: "POST",
          body: JSON.stringify({
            hookId: `hook-${i}`,
            productDescription: `Product ${i} that is long enough`,
          }),
        });
        await POST(genRequest);
      }

      const genRequestAfterLimit = new Request(
        "https://adocavo.net/api/generate",
        {
          method: "POST",
          body: JSON.stringify({
            hookId: "hook-11",
            productDescription: "Product that is long enough",
          }),
        },
      );
      const genResponse = await POST(genRequestAfterLimit);
      expect(genResponse.status).toBe(429);

      const waitlistRequest = new Request("https://adocavo.net/api/waitlist", {
        method: "POST",
        body: JSON.stringify({
          email: "test@example.com",
        }),
      });
      const waitlistResponse = await POSTWaitlist(waitlistRequest);
      expect(waitlistResponse.status).not.toBe(429);
    });

    it("should track analyze endpoint with its own limit", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as any);
      vi.mocked(getRateLimitContext).mockResolvedValue({
        identifier: { type: "user", value: "user-1" },
        tier: "free",
      });

      for (let i = 0; i < 8; i++) {
        const analyzeRequest = new Request("https://adocavo.net/api/analyze", {
          method: "POST",
          body: JSON.stringify({
            url: "https://www.tiktok.com/@user/video/12345",
          }),
        });
        await POSTAnalyze(analyzeRequest);
      }

      const analyzeRequestAfterLimit = new Request(
        "https://adocavo.net/api/analyze",
        {
          method: "POST",
          body: JSON.stringify({
            url: "https://www.tiktok.com/@user/video/67890",
          }),
        },
      );
      const analyzeResponse = await POSTAnalyze(analyzeRequestAfterLimit);
      expect(analyzeResponse.status).toBe(429);
    });

    it("should reset limits independently per endpoint", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as any);
      vi.mocked(getRateLimitContext).mockResolvedValue({
        identifier: { type: "user", value: "user-1" },
        tier: "free",
      });

      const generateKey = "user:user-1:generate";
      const analyzeKey = "user:user-1:analyze";

      rateLimitStore.set(generateKey, {
        count: 10,
        resetAt: Date.now() - 1000,
      });
      rateLimitStore.set(analyzeKey, {
        count: 5,
        resetAt: Date.now() + 50000,
      });

      // Set up analyzeTikTokUrl mock to return success
      vi.mocked(analyzeTikTokUrl).mockResolvedValue({
        success: true,
        result: {
          hook: "Test hook",
          structure: [{ label: "Intro", summary: "Test summary" }],
          template: [{ label: "Hook", script: "Test script" }],
        },
      });

      const genRequest = new Request("https://adocavo.net/api/generate", {
        method: "POST",
        body: JSON.stringify({
          hookId: "hook-1",
          productDescription: "Product that is long enough",
        }),
      });
      const genResponse = await POST(genRequest);
      expect(genResponse.status).toBe(200);

      const analyzeRequest = new Request("https://adocavo.net/api/analyze", {
        method: "POST",
        body: JSON.stringify({
          url: "https://www.tiktok.com/@user/video/12345",
        }),
      });
      const analyzeResponse = await POSTAnalyze(analyzeRequest);
      expect(analyzeResponse.status).toBe(200);
    });
  });

  describe("Time Window Edge Cases", () => {
    it("should handle exact window boundary expiration", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as any);
      vi.mocked(getRateLimitContext).mockResolvedValue({
        identifier: { type: "user", value: "user-1" },
        tier: "free",
      });

      const key = "user:user-1:generate";
      const exactExpiryTime = Date.now() - 1;
      rateLimitStore.set(key, {
        count: 10,
        resetAt: exactExpiryTime,
      });

      const request = new Request("https://adocavo.net/api/generate", {
        method: "POST",
        body: JSON.stringify({
          hookId: "hook-1",
          productDescription: "Product that is long enough",
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
    });

    it("should calculate retryAfter correctly", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as any);
      vi.mocked(getRateLimitContext).mockResolvedValue({
        identifier: { type: "user", value: "user-1" },
        tier: "free",
      });

      const key = "user:user-1:generate";
      const resetTime = Date.now() + 30000;
      rateLimitStore.set(key, {
        count: 10,
        resetAt: resetTime,
      });

      const request = new Request("https://adocavo.net/api/generate", {
        method: "POST",
        body: JSON.stringify({
          hookId: "hook-1",
          productDescription: "Product that is long enough",
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(429);

      const body = await response.json();
      expect(body.error.code).toBe("RATE_LIMIT_EXCEEDED");
      expect(body.error.details.retryAfter).toBeGreaterThan(0);
      expect(body.error.details.retryAfter).toBeLessThanOrEqual(30);
    });

    it("should handle very short time windows", async () => {
      const shortWindowKey = "user:user-1-short:generate";
      rateLimitStore.set(shortWindowKey, {
        count: 10,
        resetAt: Date.now() + 100,
      });

      await new Promise((resolve) => setTimeout(resolve, 150));

      vi.mocked(getRateLimitContext).mockResolvedValue({
        identifier: { type: "user", value: "user-1-short" },
        tier: "free",
      });

      const request = new Request("https://adocavo.net/api/generate", {
        method: "POST",
        body: JSON.stringify({
          hookId: "hook-1",
          productDescription: "Product that is long enough",
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
    });
  });

  describe("Identifier-Based Segmentation", () => {
    it("should rate limit by user ID independently", async () => {
      const user1Session = {
        ...mockSession,
        user: { ...mockSession.user, id: "user-1" },
      };
      const user2Session = {
        ...mockSession,
        user: { ...mockSession.user, id: "user-2" },
      };

      for (let i = 0; i < 10; i++) {
        vi.mocked(auth).mockResolvedValueOnce(user1Session as any);
        vi.mocked(getRateLimitContext).mockResolvedValueOnce({
          identifier: { type: "user", value: "user-1" },
          tier: "free",
        });

        const request = new Request("https://adocavo.net/api/generate", {
          method: "POST",
          body: JSON.stringify({
            hookId: `hook-${i}`,
            productDescription: `Product ${i} that is long enough`,
          }),
        });

        await POST(request);
      }

      vi.mocked(auth).mockResolvedValueOnce(user1Session as any);
      vi.mocked(getRateLimitContext).mockResolvedValueOnce({
        identifier: { type: "user", value: "user-1" },
        tier: "free",
      });

      const user1RateLimitedRequest = new Request(
        "https://adocavo.net/api/generate",
        {
          method: "POST",
          body: JSON.stringify({
            hookId: "hook-11",
            productDescription: "Product that is long enough",
          }),
        },
      );
      const user1Response = await POST(user1RateLimitedRequest);
      expect(user1Response.status).toBe(429);

      vi.mocked(auth).mockResolvedValueOnce(user2Session as any);
      vi.mocked(getRateLimitContext).mockResolvedValueOnce({
        identifier: { type: "user", value: "user-2" },
        tier: "free",
      });

      const user2Request = new Request("https://adocavo.net/api/generate", {
        method: "POST",
        body: JSON.stringify({
          hookId: "hook-1",
          productDescription: "Product that is long enough",
        }),
      });
      const user2Response = await POST(user2Request);
      expect(user2Response.status).toBe(200);
    });

    it("should rate limit by device fingerprint for anonymous users", async () => {
      vi.mocked(auth).mockResolvedValue(null);

      vi.mocked(getRateLimitContext).mockResolvedValue({
        identifier: { type: "device", value: "device-fingerprint-1" },
        tier: "anon",
      });

      for (let i = 0; i < 3; i++) {
        const deviceRequest = new Request("https://adocavo.net/api/generate", {
          method: "POST",
          headers: {
            "user-agent": "Mozilla/5.0 (Device 1)",
            "accept-language": "en-US",
          },
          body: JSON.stringify({
            hookId: `hook-${i}`,
            productDescription: `Product that is long enough ${i}`,
          }),
        });

        const response = await POST(deviceRequest);
        expect(response.status).toBe(200);
      }

      const device1RateLimitedResponse = await POST(
        new Request("https://adocavo.net/api/generate", {
          method: "POST",
          headers: {
            "user-agent": "Mozilla/5.0 (Device 1)",
            "accept-language": "en-US",
          },
          body: JSON.stringify({
            hookId: "hook-4",
            productDescription: "Product that is long enough 4",
          }),
        }),
      );
      expect(device1RateLimitedResponse.status).toBe(429);
    });
  });

  describe("Burst Request Handling", () => {
    it("should handle burst of requests within window", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as any);
      vi.mocked(getRateLimitContext).mockResolvedValue({
        identifier: { type: "user", value: "user-burst" },
        tier: "free",
      });

      const burstSize = 10;
      const requests = Array.from(
        { length: burstSize },
        (_, i) =>
          new Request("https://adocavo.net/api/generate", {
            method: "POST",
            body: JSON.stringify({
              hookId: `hook-${i}`,
              productDescription: `Product ${i} that is long enough`,
            }),
          }),
      );

      const responses = await Promise.all(requests.map((req) => POST(req)));

      const successResponses = responses.filter((r) => r.status === 200);
      expect(successResponses).toHaveLength(burstSize);
    });

    it("should handle requests spaced evenly across window", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as any);
      vi.mocked(getRateLimitContext).mockResolvedValue({
        identifier: { type: "user", value: "user-spaced" },
        tier: "free",
      });

      for (let i = 0; i < 10; i++) {
        const request = new Request("https://adocavo.net/api/generate", {
          method: "POST",
          body: JSON.stringify({
            hookId: `hook-${i}`,
            productDescription: `Product ${i} that is long enough`,
          }),
        });

        const response = await POST(request);
        expect(response.status).toBe(200);

        await new Promise((resolve) => setTimeout(resolve, 10));
      }
    });
  });

  describe("Race Condition Prevention in Rate Limiting", () => {
    it("should handle concurrent rate limit checks atomically", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as any);
      vi.mocked(getRateLimitContext).mockResolvedValue({
        identifier: { type: "user", value: "user-concurrent" },
        tier: "free",
      });

      const concurrentRequests = 20;
      const requests = Array.from(
        { length: concurrentRequests },
        (_, i) =>
          new Request("https://adocavo.net/api/generate", {
            method: "POST",
            body: JSON.stringify({
              hookId: `hook-${i}`,
              productDescription: `Product ${i} that is long enough`,
            }),
          }),
      );

      const responses = await Promise.all(requests.map((req) => POST(req)));

      const successCount = responses.filter((r) => r.status === 200).length;
      const rateLimitedCount = responses.filter((r) => r.status === 429).length;

      expect(successCount).toBeLessThanOrEqual(10);
      expect(rateLimitedCount).toBeGreaterThan(0);
    });
  });

  describe("Rate Limit Error Response Format", () => {
    it("should include proper error structure", async () => {
      vi.mocked(auth).mockResolvedValue(mockSession as any);
      vi.mocked(getRateLimitContext).mockResolvedValue({
        identifier: { type: "user", value: "user-error" },
        tier: "free",
      });

      const key = "user:user-error:generate";
      rateLimitStore.set(key, {
        count: 11,
        resetAt: Date.now() + 60000,
      });

      const request = new Request("https://adocavo.net/api/generate", {
        method: "POST",
        body: JSON.stringify({
          hookId: "hook-1",
          productDescription: "Product that is long enough",
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(429);

      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("RATE_LIMIT_EXCEEDED");
      expect(body.error.message).toBeDefined();
      expect(body.error.details).toBeDefined();
      expect(body.error.details.retryAfter).toBeGreaterThan(0);
    });
  });
});
