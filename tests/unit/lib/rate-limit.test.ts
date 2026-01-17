import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  checkRateLimit,
  getClientIp,
  type RateLimitAction,
} from "@/lib/rate-limit";
import { rateLimits } from "@/lib/schema";
import { createDb } from "@/lib/db";

vi.mock("@/lib/db", () => ({
  createDb: vi.fn(),
}));

describe("Rate Limit", () => {
  let mockDb: any;
  let mockReturningResult: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock for the atomic upsert with returning
    mockReturningResult = vi.fn();

    mockDb = {
      query: {
        rateLimits: {
          findFirst: vi.fn(),
        },
      },
      insert: vi.fn(() => ({
        values: vi.fn(() => ({
          onConflictDoUpdate: vi.fn(() => ({
            returning: mockReturningResult,
          })),
        })),
      })),
      update: vi.fn(),
    };

    vi.mocked(createDb).mockReturnValue(mockDb);
  });

  describe("checkRateLimit - Atomic Implementation", () => {
    it("should allow first request with atomic upsert", async () => {
      const mockRecord = {
        ip: "tier:free:ip:127.0.0.1",
        endpoint: "generate",
        count: 1,
        resetAt: new Date(Date.now() + 60000),
      };
      mockReturningResult.mockResolvedValue([mockRecord]);

      const result = await checkRateLimit(mockDb, "127.0.0.1", "generate");

      expect(result.allowed).toBe(true);
      expect(result.retryAfter).toBeUndefined();
      expect(mockReturningResult).toHaveBeenCalled();
    });

    it("should allow requests under limit", async () => {
      const mockRecord = {
        ip: "tier:free:ip:127.0.0.1",
        endpoint: "generate",
        count: 5,
        resetAt: new Date(Date.now() + 60000),
      };
      mockReturningResult.mockResolvedValue([mockRecord]);

      const result = await checkRateLimit(mockDb, "127.0.0.1", "generate");

      expect(result.allowed).toBe(true);
    });

    it("should block requests over limit", async () => {
      const mockRecord = {
        ip: "tier:free:ip:127.0.0.1",
        endpoint: "generate",
        count: 11, // Over the limit of 10
        resetAt: new Date(Date.now() + 60000),
      };
      mockReturningResult.mockResolvedValue([mockRecord]);

      const result = await checkRateLimit(mockDb, "127.0.0.1", "generate");

      expect(result.allowed).toBe(false);
      expect(result.retryAfter).toBeDefined();
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    it("should reset counter when window expires", async () => {
      const mockRecord = {
        ip: "tier:free:ip:127.0.0.1",
        endpoint: "generate",
        count: 1, // Reset to 1 by atomic upsert
        resetAt: new Date(Date.now() + 60000),
      };
      mockReturningResult.mockResolvedValue([mockRecord]);

      const result = await checkRateLimit(mockDb, "127.0.0.1", "generate");

      expect(result.allowed).toBe(true);
    });

    it("should calculate retryAfter correctly", async () => {
      const resetTime = new Date(Date.now() + 30000);
      const mockRecord = {
        ip: "tier:free:ip:127.0.0.1",
        endpoint: "generate",
        count: 11,
        resetAt: resetTime,
      };
      mockReturningResult.mockResolvedValue([mockRecord]);

      const result = await checkRateLimit(mockDb, "127.0.0.1", "generate");

      expect(result.allowed).toBe(false);
      expect(result.retryAfter).toBeLessThanOrEqual(30);
      expect(result.retryAfter).toBeGreaterThan(25);
    });

    it("should handle empty returning result gracefully", async () => {
      mockReturningResult.mockResolvedValue([]);

      const result = await checkRateLimit(mockDb, "127.0.0.1", "generate");

      expect(result.allowed).toBe(false);
      expect(result.retryAfter).toBe(60); // Default window
    });

    it("should allow different IPs to have independent limits", async () => {
      mockReturningResult
        .mockResolvedValueOnce([
          {
            ip: "tier:free:ip:127.0.0.1",
            endpoint: "generate",
            count: 1,
            resetAt: new Date(Date.now() + 60000),
          },
        ])
        .mockResolvedValueOnce([
          {
            ip: "tier:free:ip:192.168.1.1",
            endpoint: "generate",
            count: 1,
            resetAt: new Date(Date.now() + 60000),
          },
        ]);

      const result1 = await checkRateLimit(mockDb, "127.0.0.1", "generate");
      const result2 = await checkRateLimit(mockDb, "192.168.1.1", "generate");

      expect(result1.allowed).toBe(true);
      expect(result2.allowed).toBe(true);
    });

    it("should allow different endpoints to have independent limits", async () => {
      mockReturningResult
        .mockResolvedValueOnce([
          {
            ip: "tier:free:ip:127.0.0.1",
            endpoint: "generate",
            count: 1,
            resetAt: new Date(Date.now() + 60000),
          },
        ])
        .mockResolvedValueOnce([
          {
            ip: "tier:free:ip:127.0.0.1",
            endpoint: "waitlist",
            count: 1,
            resetAt: new Date(Date.now() + 60000),
          },
        ]);

      const result1 = await checkRateLimit(mockDb, "127.0.0.1", "generate");
      const result2 = await checkRateLimit(mockDb, "127.0.0.1", "waitlist");

      expect(result1.allowed).toBe(true);
      expect(result2.allowed).toBe(true);
    });

    it("should use tier-specific limits for pro users", async () => {
      const mockRecord = {
        ip: "tier:pro:user:user123",
        endpoint: "generate",
        count: 15,
        resetAt: new Date(Date.now() + 60000),
      };
      mockReturningResult.mockResolvedValue([mockRecord]);

      const result = await checkRateLimit(
        mockDb,
        { type: "user", value: "user123" },
        "generate",
        "pro",
      );

      // Pro users have higher limit (30)
      expect(result.allowed).toBe(true);
    });

    it("should block anonymous users at lower limit", async () => {
      const mockRecord = {
        ip: "tier:anon:ip:127.0.0.1",
        endpoint: "generate",
        count: 4,
        resetAt: new Date(Date.now() + 60000),
      };
      mockReturningResult.mockResolvedValue([mockRecord]);

      const result = await checkRateLimit(
        mockDb,
        { type: "ip", value: "127.0.0.1" },
        "generate",
        "anon",
      );

      // Anon limit is 3, so count of 4 should be blocked
      expect(result.allowed).toBe(false);
    });
  });

  describe("getClientIp", () => {
    it("should extract IP from cf-connecting-ip header", () => {
      const request = new Request("https://example.com", {
        headers: { "cf-connecting-ip": "203.0.113.1" },
      });

      const ip = getClientIp(request);

      expect(ip).toBe("203.0.113.1");
    });

    it("should extract IP from x-forwarded-for header", () => {
      const request = new Request("https://example.com", {
        headers: { "x-forwarded-for": "203.0.113.2" },
      });

      const ip = getClientIp(request);

      expect(ip).toBe("203.0.113.2");
    });

    it("should extract IP from x-real-ip header", () => {
      const request = new Request("https://example.com", {
        headers: { "x-real-ip": "203.0.113.3" },
      });

      const ip = getClientIp(request);

      expect(ip).toBe("203.0.113.3");
    });

    it("should prioritize cf-connecting-ip over other headers", () => {
      const request = new Request("https://example.com", {
        headers: {
          "cf-connecting-ip": "203.0.113.1",
          "x-forwarded-for": "203.0.113.2",
          "x-real-ip": "203.0.113.3",
        },
      });

      const ip = getClientIp(request);

      expect(ip).toBe("203.0.113.1");
    });

    it("should prioritize x-forwarded-for over x-real-ip", () => {
      const request = new Request("https://example.com", {
        headers: {
          "x-forwarded-for": "203.0.113.2",
          "x-real-ip": "203.0.113.3",
        },
      });

      const ip = getClientIp(request);

      expect(ip).toBe("203.0.113.2");
    });

    it("should handle comma-separated IPs in x-forwarded-for", () => {
      const request = new Request("https://example.com", {
        headers: { "x-forwarded-for": "203.0.113.1, 203.0.113.2, 203.0.113.3" },
      });

      const ip = getClientIp(request);

      expect(ip).toBe("203.0.113.1");
    });

    it("should trim whitespace from IP", () => {
      const request = new Request("https://example.com", {
        headers: { "x-forwarded-for": " 203.0.113.1 " },
      });

      const ip = getClientIp(request);

      expect(ip).toBe("203.0.113.1");
    });

    it("should return unknown when no IP headers present", () => {
      const request = new Request("https://example.com");

      const ip = getClientIp(request);

      expect(ip).toBe("unknown");
    });

    it("should return unknown when headers are empty string", () => {
      const request = new Request("https://example.com", {
        headers: { "x-forwarded-for": "" },
      });

      const ip = getClientIp(request);

      expect(ip).toBe("unknown");
    });

    it("should handle IPv6 addresses", () => {
      const request = new Request("https://example.com", {
        headers: { "cf-connecting-ip": "2001:db8::1" },
      });

      const ip = getClientIp(request);

      expect(ip).toBe("2001:db8::1");
    });

    it("should handle localhost addresses", () => {
      const request = new Request("https://example.com", {
        headers: { "x-forwarded-for": "127.0.0.1" },
      });

      const ip = getClientIp(request);

      expect(ip).toBe("127.0.0.1");
    });

    it("should handle case-insensitive header names", () => {
      const request = new Request("https://example.com", {
        headers: { "CF-Connecting-IP": "203.0.113.1" },
      });

      const ip = getClientIp(request);

      expect(ip).toBe("203.0.113.1");
    });

    it("should validate IP format and return unknown for invalid IPs", () => {
      const request = new Request("https://example.com", {
        headers: { "x-forwarded-for": "<script>alert('xss')</script>" },
      });

      const ip = getClientIp(request);

      expect(ip).toBe("unknown");
    });

    it("should validate IP format and reject SQL injection attempts", () => {
      const request = new Request("https://example.com", {
        headers: { "x-forwarded-for": "127.0.0.1'; DROP TABLE users--" },
      });

      const ip = getClientIp(request);

      expect(ip).toBe("unknown");
    });
  });

  describe("RateLimitAction type", () => {
    it("should accept valid rate limit actions", () => {
      const actions: RateLimitAction[] = [
        "generate",
        "generateGuest",
        "waitlist",
        "hooks",
        "fakeDoor",
        "favorites",
        "ratings",
        "analyze",
        "admin",
      ];

      actions.forEach((action) => {
        expect(action).toBeDefined();
      });
    });
  });
});
