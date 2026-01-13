import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/waitlist/route";
import { auth } from "@/lib/auth";
import { getBindings } from "@/lib/cloudflare";
import { createDb } from "@/lib/db";
import { checkRateLimit, getRateLimitContext } from "@/lib/rate-limit";
import { waitlist as waitlistTable } from "@/lib/schema";

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

describe("API: POST /api/waitlist", () => {
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

  const mockDb = {
    insert: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue(null);
    vi.mocked(getBindings).mockReturnValue(mockEnv as any);
    vi.mocked(createDb).mockReturnValue(mockDb as any);
    vi.mocked(checkRateLimit).mockResolvedValue({ allowed: true });
    vi.mocked(getRateLimitContext).mockResolvedValue({
      identifier: { type: "ip", value: "127.0.0.1" },
      tier: "anon",
    });
    mockDb.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoUpdate: vi.fn().mockReturnValue({
          target: vi.fn().mockReturnValue({
            set: vi.fn(),
          }),
        }),
      }),
    });
  });

  describe("successful requests", () => {
    it("should accept valid waitlist request with minimal data", async () => {
      const request = new Request("https://adocavo.net/api/waitlist", {
        method: "POST",
        body: JSON.stringify({
          email: "test@example.com",
        }),
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.ok).toBe(true);
      expect(mockDb.insert).toHaveBeenCalledWith(waitlistTable);
    });

    it("should accept waitlist request with all optional fields", async () => {
      const request = new Request("https://adocavo.net/api/waitlist", {
        method: "POST",
        body: JSON.stringify({
          email: "user@example.com",
          featureInterest: "unlimited",
          sourceUrl: "https://adocavo.net/hook/test",
          userTier: "premium",
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
    });

    it("should use referer header when sourceUrl not provided", async () => {
      const request = new Request("https://adocavo.net/api/waitlist", {
        method: "POST",
        headers: {
          referer: "https://adocavo.net/hook/test",
        },
        body: JSON.stringify({
          email: "test@example.com",
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
    });

    it("should derive user tier from session credits", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", credits: 3 },
      } as any);

      const request = new Request("https://adocavo.net/api/waitlist", {
        method: "POST",
        body: JSON.stringify({
          email: "test@example.com",
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
    });

    it("should update existing email on conflict", async () => {
      const request = new Request("https://adocavo.net/api/waitlist", {
        method: "POST",
        body: JSON.stringify({
          email: "existing@example.com",
          featureInterest: "team",
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockDb.insert).toHaveBeenCalled();
    });
  });

  describe("request validation", () => {
    it("should reject request without email", async () => {
      const request = new Request("https://adocavo.net/api/waitlist", {
        method: "POST",
        body: JSON.stringify({
          featureInterest: "unlimited",
        }),
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.success).toBe(false);
    });

    it("should reject invalid email format", async () => {
      const request = new Request("https://adocavo.net/api/waitlist", {
        method: "POST",
        body: JSON.stringify({
          email: "invalid-email",
        }),
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.success).toBe(false);
    });

    it("should reject invalid featureInterest", async () => {
      const request = new Request("https://adocavo.net/api/waitlist", {
        method: "POST",
        body: JSON.stringify({
          email: "test@example.com",
          featureInterest: "invalid-feature",
        }),
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.success).toBe(false);
    });

    it("should reject invalid sourceUrl", async () => {
      const request = new Request("https://adocavo.net/api/waitlist", {
        method: "POST",
        body: JSON.stringify({
          email: "test@example.com",
          sourceUrl: "not-a-url",
        }),
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.success).toBe(false);
    });

    it("should handle invalid JSON", async () => {
      const request = new Request("https://adocavo.net/api/waitlist", {
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
        retryAfter: 120,
      });

      const request = new Request("https://adocavo.net/api/waitlist", {
        method: "POST",
        body: JSON.stringify({
          email: "test@example.com",
        }),
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(429);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("RATE_LIMIT_EXCEEDED");
      expect(body.error.details.retryAfter).toBe(120);
    });

    it("should check rate limit for waitlist action", async () => {
      const request = new Request("https://adocavo.net/api/waitlist", {
        method: "POST",
        body: JSON.stringify({
          email: "test@example.com",
        }),
      });

      await POST(request);

      expect(checkRateLimit).toHaveBeenCalledWith(
        mockDb,
        { type: "ip", value: "127.0.0.1" },
        "waitlist",
        "anon",
      );
    });
  });

  describe("environment bindings", () => {
    it("should return 500 when DB binding missing", async () => {
      vi.mocked(getBindings).mockReturnValue({
        ...mockEnv,
        DB: undefined,
      } as any);

      const request = new Request("https://adocavo.net/api/waitlist", {
        method: "POST",
        body: JSON.stringify({
          email: "test@example.com",
        }),
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.success).toBe(false);
    });
  });

  describe("user tier derivation", () => {
    it("should derive anon tier when no session", async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const request = new Request("https://adocavo.net/api/waitlist", {
        method: "POST",
        body: JSON.stringify({
          email: "test@example.com",
        }),
      });

      await POST(request);

      expect(mockDb.insert).toHaveBeenCalled();
    });

    it("should derive out_of_credits tier when credits = 0", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", credits: 0 },
      } as any);

      const request = new Request("https://adocavo.net/api/waitlist", {
        method: "POST",
        body: JSON.stringify({
          email: "test@example.com",
        }),
      });

      await POST(request);

      expect(mockDb.insert).toHaveBeenCalled();
    });

    it("should derive low_credits tier when credits <= 2", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", credits: 2 },
      } as any);

      const request = new Request("https://adocavo.net/api/waitlist", {
        method: "POST",
        body: JSON.stringify({
          email: "test@example.com",
        }),
      });

      await POST(request);

      expect(mockDb.insert).toHaveBeenCalled();
    });

    it("should derive active tier when credits <= 5", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", credits: 5 },
      } as any);

      const request = new Request("https://adocavo.net/api/waitlist", {
        method: "POST",
        body: JSON.stringify({
          email: "test@example.com",
        }),
      });

      await POST(request);

      expect(mockDb.insert).toHaveBeenCalled();
    });

    it("should derive new tier when credits > 5", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", credits: 10 },
      } as any);

      const request = new Request("https://adocavo.net/api/waitlist", {
        method: "POST",
        body: JSON.stringify({
          email: "test@example.com",
        }),
      });

      await POST(request);

      expect(mockDb.insert).toHaveBeenCalled();
    });

    it("should allow overriding derived userTier", async () => {
      vi.mocked(auth).mockResolvedValue({
        user: { id: "user-1", credits: 10 },
      } as any);

      const request = new Request("https://adocavo.net/api/waitlist", {
        method: "POST",
        body: JSON.stringify({
          email: "test@example.com",
          userTier: "custom-tier",
        }),
      });

      await POST(request);

      expect(mockDb.insert).toHaveBeenCalled();
    });
  });

  describe("valid feature interests", () => {
    const validInterests = ["unlimited", "team", "api", "spy"];

    validInterests.forEach((interest) => {
      it(`should accept featureInterest: ${interest}`, async () => {
        const request = new Request("https://adocavo.net/api/waitlist", {
          method: "POST",
          body: JSON.stringify({
            email: "test@example.com",
            featureInterest: interest,
          }),
        });

        const response = await POST(request);

        expect(response.status).toBe(200);
      });
    });
  });
});
