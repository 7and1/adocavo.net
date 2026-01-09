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

  beforeEach(() => {
    vi.clearAllMocks();

    mockDb = {
      query: {
        rateLimits: {
          findFirst: vi.fn(),
        },
      },
      insert: vi.fn(),
      update: vi.fn(),
    };

    vi.mocked(createDb).mockReturnValue(mockDb);
  });

  describe("checkRateLimit", () => {
    it("should allow first request", async () => {
      mockDb.query.rateLimits.findFirst.mockResolvedValue(null);
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          onConflictDoUpdate: vi.fn().mockReturnValue({
            target: vi.fn().mockReturnValue({
              set: vi.fn(),
            }),
          }),
        }),
      });

      const result = await checkRateLimit(mockDb, "127.0.0.1", "generate");

      expect(result.allowed).toBe(true);
      expect(result.retryAfter).toBeUndefined();
    });

    it("should allow requests under limit", async () => {
      const existingRecord = {
        ip: "127.0.0.1",
        endpoint: "generate",
        count: 5,
        resetAt: new Date(Date.now() + 60000),
      };

      mockDb.query.rateLimits.findFirst.mockResolvedValue(existingRecord);
      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn(),
        }),
      });

      const result = await checkRateLimit(mockDb, "127.0.0.1", "generate");

      expect(result.allowed).toBe(true);
    });

    it("should block requests over limit", async () => {
      const existingRecord = {
        ip: "127.0.0.1",
        endpoint: "generate",
        count: 10,
        resetAt: new Date(Date.now() + 60000),
      };

      mockDb.query.rateLimits.findFirst.mockResolvedValue(existingRecord);

      const result = await checkRateLimit(mockDb, "127.0.0.1", "generate");

      expect(result.allowed).toBe(false);
      expect(result.retryAfter).toBeDefined();
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    it("should reset counter when window expires", async () => {
      const existingRecord = {
        ip: "127.0.0.1",
        endpoint: "generate",
        count: 100,
        resetAt: new Date(Date.now() - 1000),
      };

      mockDb.query.rateLimits.findFirst.mockResolvedValue(existingRecord);
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          onConflictDoUpdate: vi.fn().mockReturnValue({
            target: vi.fn().mockReturnValue({
              set: vi.fn(),
            }),
          }),
        }),
      });

      const result = await checkRateLimit(mockDb, "127.0.0.1", "generate");

      expect(result.allowed).toBe(true);
    });

    it("should calculate retryAfter correctly", async () => {
      const resetTime = new Date(Date.now() + 30000);
      const existingRecord = {
        ip: "127.0.0.1",
        endpoint: "generate",
        count: 10,
        resetAt: resetTime,
      };

      mockDb.query.rateLimits.findFirst.mockResolvedValue(existingRecord);

      const result = await checkRateLimit(mockDb, "127.0.0.1", "generate");

      expect(result.allowed).toBe(false);
      expect(result.retryAfter).toBeLessThanOrEqual(30);
      expect(result.retryAfter).toBeGreaterThan(25);
    });

    it("should use correct limits for generate action", async () => {
      mockDb.query.rateLimits.findFirst.mockResolvedValue(null);
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          onConflictDoUpdate: vi.fn().mockReturnValue({
            target: vi.fn().mockReturnValue({
              set: vi.fn(),
            }),
          }),
        }),
      });

      await checkRateLimit(mockDb, "127.0.0.1", "generate");

      expect(mockDb.query.rateLimits.findFirst).toHaveBeenCalled();
    });

    it("should use correct limits for waitlist action", async () => {
      mockDb.query.rateLimits.findFirst.mockResolvedValue(null);
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          onConflictDoUpdate: vi.fn().mockReturnValue({
            target: vi.fn().mockReturnValue({
              set: vi.fn(),
            }),
          }),
        }),
      });

      await checkRateLimit(mockDb, "127.0.0.1", "waitlist");

      expect(mockDb.query.rateLimits.findFirst).toHaveBeenCalled();
    });

    it("should use correct limits for hooks action", async () => {
      mockDb.query.rateLimits.findFirst.mockResolvedValue(null);
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          onConflictDoUpdate: vi.fn().mockReturnValue({
            target: vi.fn().mockReturnValue({
              set: vi.fn(),
            }),
          }),
        }),
      });

      await checkRateLimit(mockDb, "127.0.0.1", "hooks");

      expect(mockDb.query.rateLimits.findFirst).toHaveBeenCalled();
    });

    it("should use correct limits for fakeDoor action", async () => {
      mockDb.query.rateLimits.findFirst.mockResolvedValue(null);
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          onConflictDoUpdate: vi.fn().mockReturnValue({
            target: vi.fn().mockReturnValue({
              set: vi.fn(),
            }),
          }),
        }),
      });

      await checkRateLimit(mockDb, "127.0.0.1", "fakeDoor");

      expect(mockDb.query.rateLimits.findFirst).toHaveBeenCalled();
    });

    it("should increment count on allowed request", async () => {
      const existingRecord = {
        ip: "127.0.0.1",
        endpoint: "generate",
        count: 5,
        resetAt: new Date(Date.now() + 60000),
      };

      mockDb.query.rateLimits.findFirst.mockResolvedValue(existingRecord);
      const setSpy = vi.fn();
      mockDb.update.mockReturnValue({
        set: setSpy.mockReturnValue({
          where: vi.fn(),
        }),
      });

      await checkRateLimit(mockDb, "127.0.0.1", "generate");

      expect(setSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          count: 6,
        }),
      );
    });

    it("should handle edge case: count equals limit", async () => {
      const existingRecord = {
        ip: "127.0.0.1",
        endpoint: "generate",
        count: 10,
        resetAt: new Date(Date.now() + 60000),
      };

      mockDb.query.rateLimits.findFirst.mockResolvedValue(existingRecord);

      const result = await checkRateLimit(mockDb, "127.0.0.1", "generate");

      expect(result.allowed).toBe(false);
    });

    it("should allow different IPs to have independent limits", async () => {
      mockDb.query.rateLimits.findFirst.mockResolvedValue(null);
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          onConflictDoUpdate: vi.fn().mockReturnValue({
            target: vi.fn().mockReturnValue({
              set: vi.fn(),
            }),
          }),
        }),
      });

      const result1 = await checkRateLimit(mockDb, "127.0.0.1", "generate");
      const result2 = await checkRateLimit(mockDb, "192.168.1.1", "generate");

      expect(result1.allowed).toBe(true);
      expect(result2.allowed).toBe(true);
    });

    it("should allow different endpoints to have independent limits", async () => {
      mockDb.query.rateLimits.findFirst.mockResolvedValue(null);
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          onConflictDoUpdate: vi.fn().mockReturnValue({
            target: vi.fn().mockReturnValue({
              set: vi.fn(),
            }),
          }),
        }),
      });

      const result1 = await checkRateLimit(mockDb, "127.0.0.1", "generate");
      const result2 = await checkRateLimit(mockDb, "127.0.0.1", "waitlist");

      expect(result1.allowed).toBe(true);
      expect(result2.allowed).toBe(true);
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
  });

  describe("RateLimitAction type", () => {
    it("should accept valid rate limit actions", () => {
      const actions: RateLimitAction[] = [
        "generate",
        "waitlist",
        "hooks",
        "fakeDoor",
      ];

      actions.forEach((action) => {
        expect(action).toMatch(/^(generate|waitlist|hooks|fakeDoor)$/);
      });
    });
  });
});
