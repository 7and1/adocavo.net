import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/generate/route";
import { getBindings } from "@/lib/cloudflare";
import { createDb } from "@/lib/db";
import { checkRateLimit, getRateLimitContext } from "@/lib/rate-limit";
import { generateGuestScripts } from "@/lib/services/generation";
import { verifyTurnstileToken } from "@/lib/turnstile";

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
  generateGuestScripts: vi.fn(),
}));

vi.mock("@/lib/turnstile", () => ({
  verifyTurnstileToken: vi.fn(),
}));

describe("API: POST /api/generate", () => {
  const mockEnv = {
    DB: {} as D1Database,
    AI: {} as Ai,
    TURNSTILE_SECRET_KEY: "test-secret",
  };

  const mockDb = {};

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getBindings).mockReturnValue(mockEnv as any);
    vi.mocked(createDb).mockReturnValue(mockDb as any);
    vi.mocked(checkRateLimit).mockResolvedValue({ allowed: true });
    vi.mocked(getRateLimitContext).mockResolvedValue({
      identifier: { type: "device", value: "device-1" },
      tier: "anon",
    });
    vi.mocked(verifyTurnstileToken).mockResolvedValue({ success: true } as any);
    vi.mocked(generateGuestScripts).mockResolvedValue({
      success: true,
      scripts: [],
      creditsRemaining: 0,
      generationId: "guest-gen-1",
    });
  });

  it("should require turnstile token", async () => {
    const request = new Request("https://adocavo.net/api/generate", {
      method: "POST",
      body: JSON.stringify({
        hookId: "hook-1",
        productDescription: "A valid product description that is long enough",
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
  });

  it("should verify turnstile token", async () => {
    const request = new Request("https://adocavo.net/api/generate", {
      method: "POST",
      body: JSON.stringify({
        hookId: "hook-1",
        productDescription: "A valid product description that is long enough",
        turnstileToken: "token-123",
      }),
    });

    await POST(request);

    expect(verifyTurnstileToken).toHaveBeenCalledWith(
      expect.any(Request),
      "token-123",
      expect.objectContaining({
        action: "generate",
        env: mockEnv,
      }),
    );
  });

  it("should enforce rate limits", async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: false,
      retryAfter: 60,
    });

    const request = new Request("https://adocavo.net/api/generate", {
      method: "POST",
      body: JSON.stringify({
        hookId: "hook-1",
        productDescription: "A valid product description that is long enough",
        turnstileToken: "token-123",
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(429);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("RATE_LIMIT_EXCEEDED");
  });

  it("should call generateGuestScripts with correct parameters", async () => {
    const request = new Request("https://adocavo.net/api/generate", {
      method: "POST",
      body: JSON.stringify({
        hookId: "hook-1",
        productDescription: "A valid product description that is long enough",
        turnstileToken: "token-123",
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(generateGuestScripts).toHaveBeenCalledWith(mockEnv.AI, mockEnv.DB, {
      hookId: "hook-1",
      productDescription: "A valid product description that is long enough",
      remixTone: undefined,
      remixInstruction: undefined,
    });
    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
  });

  it("should return 404 when hook not found", async () => {
    vi.mocked(generateGuestScripts).mockResolvedValue({
      success: false,
      error: "HOOK_NOT_FOUND",
      message: "Hook not found",
    });

    const request = new Request("https://adocavo.net/api/generate", {
      method: "POST",
      body: JSON.stringify({
        hookId: "missing-hook",
        productDescription: "A valid product description that is long enough",
        turnstileToken: "token-123",
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("NOT_FOUND");
  });

  it("should return 503 when AI unavailable", async () => {
    vi.mocked(generateGuestScripts).mockResolvedValue({
      success: false,
      error: "AI_UNAVAILABLE",
      message: "AI service unavailable",
    });

    const request = new Request("https://adocavo.net/api/generate", {
      method: "POST",
      body: JSON.stringify({
        hookId: "hook-1",
        productDescription: "A valid product description that is long enough",
        turnstileToken: "token-123",
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("AI_UNAVAILABLE");
  });

  it("should return 502 when AI response invalid", async () => {
    vi.mocked(generateGuestScripts).mockResolvedValue({
      success: false,
      error: "INVALID_AI_RESPONSE",
      message: "Failed to parse AI response",
    });

    const request = new Request("https://adocavo.net/api/generate", {
      method: "POST",
      body: JSON.stringify({
        hookId: "hook-1",
        productDescription: "A valid product description that is long enough",
        turnstileToken: "token-123",
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("INVALID_AI_RESPONSE");
  });

  it("should return 500 on database error", async () => {
    vi.mocked(generateGuestScripts).mockResolvedValue({
      success: false,
      error: "DATABASE_ERROR",
      message: "Failed to complete generation",
    });

    const request = new Request("https://adocavo.net/api/generate", {
      method: "POST",
      body: JSON.stringify({
        hookId: "hook-1",
        productDescription: "A valid product description that is long enough",
        turnstileToken: "token-123",
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.success).toBe(false);
  });

  it("should trim productDescription", async () => {
    const request = new Request("https://adocavo.net/api/generate", {
      method: "POST",
      body: JSON.stringify({
        hookId: "hook-1",
        productDescription:
          "  A valid product description that is long enough  ",
        turnstileToken: "token-123",
      }),
    });

    await POST(request);

    expect(generateGuestScripts).toHaveBeenCalledWith(
      mockEnv.AI,
      mockEnv.DB,
      expect.objectContaining({
        productDescription: "A valid product description that is long enough",
      }),
    );
  });
});
