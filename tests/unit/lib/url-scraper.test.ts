import { describe, it, expect, vi } from "vitest";
import { formatProductDescription } from "@/lib/url-scraper";

// Mock fetch globally
global.fetch = vi.fn();

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

    it("should handle empty title", () => {
      const product = {
        title: "",
        description: "A great product with lots of details",
        source: "generic" as const,
      };

      const formatted = formatProductDescription(product);
      expect(formatted).toContain("great product");
    });

    it("should include price when present", () => {
      const product = {
        title: "Widget",
        description: "Useful widget",
        price: "$99.99",
        source: "shopify" as const,
      };

      const formatted = formatProductDescription(product);
      expect(formatted).toContain("Price: $99.99");
    });

    it("should handle TikTok source", () => {
      const product = {
        title: "TikTok Viral Product",
        description: "Amazing product featured on TikTok",
        source: "tiktok" as const,
      };

      const formatted = formatProductDescription(product);
      expect(formatted).toContain("TikTok Viral Product");
      expect(formatted).toContain("Amazing product featured on TikTok");
    });
  });
});
