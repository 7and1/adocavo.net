import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/hooks/route";
import { getBindings } from "@/lib/cloudflare";
import { createDb } from "@/lib/db";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { getHooks } from "@/lib/services/hooks";

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

vi.mock("@/lib/services/hooks", () => ({
  getHooks: vi.fn(),
}));

describe("API: GET /api/hooks", () => {
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
  const mockHooks = [
    {
      id: "hook-1",
      text: "Stop scrolling if you have acne",
      category: "beauty",
      engagementScore: 9500,
      isActive: true,
    },
    {
      id: "hook-2",
      text: "This is your sign to start that side hustle",
      category: "finance",
      engagementScore: 8900,
      isActive: true,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getBindings).mockReturnValue(mockEnv as any);
    vi.mocked(createDb).mockReturnValue(mockDb as any);
    vi.mocked(checkRateLimit).mockResolvedValue({ allowed: true });
    vi.mocked(getClientIp).mockReturnValue("127.0.0.1");
    vi.mocked(getHooks).mockResolvedValue(mockHooks);
  });

  describe("successful requests", () => {
    it("should return hooks with default pagination", async () => {
      const request = new Request("https://adocavo.net/api/hooks");

      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data).toEqual(mockHooks);
      expect(getHooks).toHaveBeenCalledWith(mockEnv.DB, {
        category: undefined,
        search: undefined,
        page: 1,
        limit: 20,
      });
    });

    it("should parse category from query params", async () => {
      const request = new Request(
        "https://adocavo.net/api/hooks?category=beauty",
      );

      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(getHooks).toHaveBeenCalledWith(mockEnv.DB, {
        category: "beauty",
        search: undefined,
        page: 1,
        limit: 20,
      });
    });

    it("should parse search from query params", async () => {
      const request = new Request("https://adocavo.net/api/hooks?search=acne");

      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(getHooks).toHaveBeenCalledWith(mockEnv.DB, {
        category: undefined,
        search: "acne",
        page: 1,
        limit: 20,
      });
    });

    it("should parse page from query params", async () => {
      const request = new Request("https://adocavo.net/api/hooks?page=2");

      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(getHooks).toHaveBeenCalledWith(mockEnv.DB, {
        category: undefined,
        search: undefined,
        page: 2,
        limit: 20,
      });
    });

    it("should parse limit from query params", async () => {
      const request = new Request("https://adocavo.net/api/hooks?limit=10");

      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(getHooks).toHaveBeenCalledWith(mockEnv.DB, {
        category: undefined,
        search: undefined,
        page: 1,
        limit: 10,
      });
    });

    it("should combine multiple query params", async () => {
      const request = new Request(
        "https://adocavo.net/api/hooks?category=tech&page=3&limit=5",
      );

      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(getHooks).toHaveBeenCalledWith(mockEnv.DB, {
        category: "tech",
        search: undefined,
        page: 3,
        limit: 5,
      });
    });
  });

  describe("rate limiting", () => {
    it("should enforce rate limits", async () => {
      vi.mocked(checkRateLimit).mockResolvedValue({
        allowed: false,
        retryAfter: 30,
      });

      const request = new Request("https://adocavo.net/api/hooks");

      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(429);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("RATE_LIMIT_EXCEEDED");
      expect(body.error.details.retryAfter).toBe(30);
    });

    it("should check rate limit for hooks action", async () => {
      const request = new Request("https://adocavo.net/api/hooks");

      await GET(request);

      expect(checkRateLimit).toHaveBeenCalledWith(mockDb, "127.0.0.1", "hooks");
    });
  });

  describe("environment bindings", () => {
    it("should return 500 when DB binding missing", async () => {
      vi.mocked(getBindings).mockReturnValue({
        ...mockEnv,
        DB: undefined,
      } as any);

      const request = new Request("https://adocavo.net/api/hooks");

      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.success).toBe(false);
    });
  });

  describe("query validation", () => {
    it("should reject invalid category", async () => {
      const request = new Request(
        "https://adocavo.net/api/hooks?category=invalid",
      );

      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.success).toBe(false);
    });

    it("should reject invalid page (zero)", async () => {
      const request = new Request("https://adocavo.net/api/hooks?page=0");

      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.success).toBe(false);
    });

    it("should reject invalid limit (over 50)", async () => {
      const request = new Request("https://adocavo.net/api/hooks?limit=100");

      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.success).toBe(false);
    });

    it("should coerce page string to number", async () => {
      const request = new Request("https://adocavo.net/api/hooks?page=5");

      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(getHooks).toHaveBeenCalledWith(
        mockEnv.DB,
        expect.objectContaining({
          page: 5,
        }),
      );
    });
  });

  describe("empty results", () => {
    it("should return empty array when no hooks found", async () => {
      vi.mocked(getHooks).mockResolvedValue([]);

      const request = new Request("https://adocavo.net/api/hooks");

      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data).toEqual([]);
    });
  });
});
