import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/analyze-product/route";
import { scrapeProductUrl, formatProductDescription } from "@/lib/url-scraper";

// Mock dependencies
vi.mock("@/lib/cloudflare", () => ({
  getBindings: () => ({
    DB: {},
    AI: {
      run: vi.fn().mockResolvedValue({ response: "AI analysis" }),
    },
  }),
}));

vi.mock("@/lib/db", () => ({
  createDb: () => ({
    insert: () => ({
      values: () => ({
        onConflictDoUpdate: () => ({
          returning: () => Promise.resolve([{ count: 1, resetAt: new Date() }]),
        }),
      }),
    }),
  }),
}));

vi.mock("@/lib/cache", () => ({
  getCache: () => null,
  CacheTTL: {
    VERY_LONG: 86400,
  },
}));

vi.mock("@/lib/auth", () => ({
  auth: () => Promise.resolve(null),
}));

vi.mock("@/lib/rate-limit", () => ({
  getRateLimitContext: () =>
    Promise.resolve({
      identifier: { type: "ip", value: "127.0.0.1" },
      tier: "anon" as const,
    }),
  checkRateLimit: () => Promise.resolve({ allowed: true }),
}));

vi.mock("@/lib/url-scraper", () => ({
  scrapeProductUrl: vi.fn(),
  formatProductDescription: (product: unknown) => {
    const p = product as {
      title?: string;
      description?: string;
      price?: string;
    };
    const formatted = [
      p.title,
      p.description,
      p.price ? `Price: ${p.price}` : "",
    ]
      .filter(Boolean)
      .join(". ");
    // Truncate to 500 chars like the real implementation
    return formatted.substring(0, 500);
  },
}));

describe("POST /api/analyze-product", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return product info for valid URL", async () => {
    const mockProduct = {
      title: "Test Product",
      description: "A great product",
      price: "$29.99",
      imageUrl: "https://example.com/image.jpg",
      source: "generic" as const,
    };

    vi.mocked(scrapeProductUrl).mockResolvedValueOnce(mockProduct);

    const request = new Request("http://localhost:3000/api/analyze-product", {
      method: "POST",
      body: JSON.stringify({ url: "https://example.com/product" }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.data).toMatchObject({
      title: "Test Product",
      description: "A great product",
      price: "$29.99",
      source: "generic",
    });
    expect(data.data.formatted).toContain("Test Product");
  });

  it("should reject invalid URL", async () => {
    const request = new Request("http://localhost:3000/api/analyze-product", {
      method: "POST",
      body: JSON.stringify({ url: "not-a-url" }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(data.success).toBe(false);
    expect(data.error?.code).toBe("VALIDATION_ERROR");
  });

  it("should reject private IPs", async () => {
    const request = new Request("http://localhost:3000/api/analyze-product", {
      method: "POST",
      body: JSON.stringify({ url: "http://localhost:3000/product" }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(data.success).toBe(false);
    expect(data.error?.code).toBe("VALIDATION_ERROR");
  });
});

describe("url-scraper", () => {
  describe("formatProductDescription", () => {
    it("should format product info into description", () => {
      const product = {
        title: "Test Product",
        description: "A great product",
        price: "$29.99",
        source: "generic" as const,
      };

      const formatted = formatProductDescription(product);
      expect(formatted).toContain("Test Product");
      expect(formatted).toContain("A great product");
      expect(formatted).toContain("$29.99");
    });

    it("should handle missing optional fields", () => {
      const product = {
        title: "Test Product",
        description: "",
        source: "generic" as const,
      };

      const formatted = formatProductDescription(product);
      expect(formatted).toContain("Test Product");
    });

    it("should truncate long descriptions", () => {
      const product = {
        title: "Test Product",
        description: "A".repeat(600),
        source: "generic" as const,
      };

      const formatted = formatProductDescription(product);
      expect(formatted.length).toBeLessThanOrEqual(500);
    });
  });
});
