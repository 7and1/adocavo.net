import { describe, it, expect } from "vitest";

describe("TikTok URL Detection", () => {
  it("should detect various TikTok URL formats", () => {
    const tiktokUrls = [
      "https://www.tiktok.com/@user/video/123456789",
      "https://tiktok.com/@user/video/123456789",
      "https://vm.tiktok.com/ZMJabcd/",
      "https://vt.tiktok.com/ZSJxyz123/",
    ];

    tiktokUrls.forEach((url) => {
      const hostname = new URL(url).hostname.toLowerCase();
      const isTikTok = [
        "tiktok.com",
        "www.tiktok.com",
        "vm.tiktok.com",
        "vt.tiktok.com",
      ].some((d) => hostname === d || hostname.endsWith("." + d));

      expect(isTikTok).toBe(true);
    });
  });

  it("should not detect non-TikTok URLs as TikTok", () => {
    const nonTiktokUrls = [
      "https://amazon.com/product",
      "https://shop.example.com/products/item",
      "https://example.com/page",
    ];

    nonTiktokUrls.forEach((url) => {
      const hostname = new URL(url).hostname.toLowerCase();
      const isTikTok = [
        "tiktok.com",
        "www.tiktok.com",
        "vm.tiktok.com",
        "vt.tiktok.com",
      ].some((d) => hostname === d || hostname.endsWith("." + d));

      expect(isTikTok).toBe(false);
    });
  });

  it("should detect private IPs correctly", () => {
    const privateUrls = [
      "http://localhost:3000",
      "http://127.0.0.1:8080",
      "http://192.168.1.1",
      "http://10.0.0.1",
      "http://172.16.0.1",
    ];

    privateUrls.forEach((url) => {
      const hostname = new URL(url).hostname.toLowerCase();
      const blocked = [
        "localhost",
        "127.0.0.1",
        "0.0.0.0",
        "::1",
        "10.",
        "192.168.",
        "172.16.",
        "172.17.",
        "172.18.",
        "172.19.",
        "172.20.",
        "172.21.",
        "172.22.",
        "172.23.",
        "172.24.",
        "172.25.",
        "172.26.",
        "172.27.",
        "172.28.",
        "172.29.",
        "172.30.",
        "172.31.",
      ];
      const isPrivate = blocked.some(
        (b) => hostname === b || hostname.startsWith(b),
      );

      expect(isPrivate).toBe(true);
    });
  });

  it("should allow public IPs", () => {
    const publicUrls = [
      "https://example.com",
      "https://8.8.8.8", // Google DNS
      "https://1.1.1.1", // Cloudflare DNS
      "https://amazon.com",
    ];

    publicUrls.forEach((url) => {
      const hostname = new URL(url).hostname.toLowerCase();
      const blocked = [
        "localhost",
        "127.0.0.1",
        "0.0.0.0",
        "::1",
        "10.",
        "192.168.",
        "172.16.",
        "172.17.",
        "172.18.",
        "172.19.",
        "172.20.",
        "172.21.",
        "172.22.",
        "172.23.",
        "172.24.",
        "172.25.",
        "172.26.",
        "172.27.",
        "172.28.",
        "172.29.",
        "172.30.",
        "172.31.",
      ];
      const isPrivate = blocked.some(
        (b) => hostname === b || hostname.startsWith(b),
      );

      expect(isPrivate).toBe(false);
    });
  });
});
