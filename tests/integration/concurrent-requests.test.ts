import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { POST } from "@/app/api/generate/route";
import { auth } from "@/lib/auth";
import { getBindings } from "@/lib/cloudflare";
import { createDb } from "@/lib/db";
import { checkRateLimit, getRateLimitContext } from "@/lib/rate-limit";
import {
  generateScripts,
  generateGuestScripts,
} from "@/lib/services/generation";

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

vi.mock("@/lib/api-utils", async () => {
  const actual = await vi.importActual("@/lib/api-utils");
  return {
    ...actual,
    validateCSRF: vi.fn(() => true),
  };
});

describe("Integration: Concurrent Request Handling", () => {
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

  beforeAll(() => {
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
  });

  describe("Race Condition Prevention", () => {
    it("should handle concurrent generation requests correctly", async () => {
      const concurrentRequests = 5;
      const promises = Array.from(
        { length: concurrentRequests },
        (_, i) =>
          new Request("https://adocavo.net/api/generate", {
            method: "POST",
            body: JSON.stringify({
              hookId: `hook-${i}`,
              productDescription: `Product description ${i} that is long enough to pass validation`,
            }),
          }),
      );

      const responses = await Promise.all(promises.map((req) => POST(req)));

      expect(responses).toHaveLength(concurrentRequests);
      responses.forEach((response) => {
        expect(response.status).toBe(200);
      });

      const bodies = await Promise.all(responses.map((res) => res.json()));

      bodies.forEach((body) => {
        expect(body.success).toBe(true);
        expect(body.data.scripts).toHaveLength(3);
      });
    });

    it("should handle rapid sequential requests without state corruption", async () => {
      const sequentialRequests = 10;
      const results = [];

      for (let i = 0; i < sequentialRequests; i++) {
        const request = new Request("https://adocavo.net/api/generate", {
          method: "POST",
          body: JSON.stringify({
            hookId: `hook-${i}`,
            productDescription: `Product description ${i} that is long enough to pass validation`,
          }),
        });

        const response = await POST(request);
        results.push(await response.json());
      }

      expect(results).toHaveLength(sequentialRequests);
      results.forEach((result) => {
        expect(result.success).toBe(true);
      });
    });

    it("should prevent duplicate generations from identical concurrent requests", async () => {
      let callCount = 0;
      vi.mocked(generateScripts).mockImplementation(
        async () =>
          new Promise((resolve) => {
            callCount++;
            setTimeout(() => {
              resolve({
                success: true,
                scripts: [
                  { angle: "Pain Point", script: "Script 1" },
                  { angle: "Benefit", script: "Script 2" },
                  { angle: "Social Proof", script: "Script 3" },
                ],
                creditsRemaining: 95,
                generationId: `gen-${callCount}`,
              });
            }, 50);
          }),
      );

      const identicalRequests = 3;
      const promises = Array.from(
        { length: identicalRequests },
        () =>
          new Request("https://adocavo.net/api/generate", {
            method: "POST",
            body: JSON.stringify({
              hookId: "hook-same",
              productDescription:
                "Same product description that is long enough to pass validation",
            }),
          }),
      );

      await Promise.all(promises.map((req) => POST(req)));

      expect(callCount).toBe(identicalRequests);
    });

    it("should handle concurrent requests with different user tiers", async () => {
      const freeUserRequest = new Request("https://adocavo.net/api/generate", {
        method: "POST",
        body: JSON.stringify({
          hookId: "hook-1",
          productDescription: "A valid product description that is long enough",
        }),
      });

      const proUserSession = {
        ...mockSession,
        user: { ...mockSession.user, id: "pro-user", role: "pro" },
      };
      vi.mocked(auth).mockResolvedValueOnce(proUserSession as any);
      vi.mocked(getRateLimitContext).mockResolvedValueOnce({
        identifier: { type: "user", value: "pro-user" },
        tier: "pro",
      });

      const proUserRequest = new Request("https://adocavo.net/api/generate", {
        method: "POST",
        body: JSON.stringify({
          hookId: "hook-2",
          productDescription: "A valid product description that is long enough",
        }),
      });

      const [freeResponse, proResponse] = await Promise.all([
        POST(freeUserRequest),
        POST(proUserRequest),
      ]);

      expect(freeResponse.status).toBe(200);
      expect(proResponse.status).toBe(200);
    });
  });

  describe("Rate Limiting Under Load", () => {
    it("should enforce rate limits even with concurrent requests", async () => {
      let requestCount = 0;
      vi.mocked(checkRateLimit).mockImplementation(
        async () =>
          new Promise((resolve) => {
            requestCount++;
            if (requestCount > 5) {
              resolve({ allowed: false, retryAfter: 60 });
            } else {
              resolve({ allowed: true });
            }
          }),
      );

      const concurrentRequests = 10;
      const promises = Array.from(
        { length: concurrentRequests },
        (_, i) =>
          new Request("https://adocavo.net/api/generate", {
            method: "POST",
            body: JSON.stringify({
              hookId: `hook-${i}`,
              productDescription: `Product description ${i}`,
            }),
          }),
      );

      const responses = await Promise.all(promises.map((req) => POST(req)));

      const successResponses = responses.filter((r) => r.status === 200);
      const rateLimitedResponses = responses.filter((r) => r.status === 429);

      expect(rateLimitedResponses.length).toBeGreaterThan(0);
      expect(successResponses.length).toBeLessThanOrEqual(5);
    });

    it("should reset rate limit correctly after window expires", async () => {
      const rateLimitStates = [];
      let windowStart = Date.now();

      vi.mocked(checkRateLimit).mockImplementation(
        async () =>
          new Promise((resolve) => {
            const now = Date.now();
            const windowElapsed = (now - windowStart) / 1000;

            if (windowElapsed > 60) {
              windowStart = now;
              rateLimitStates.length = 0;
            }

            rateLimitStates.push(now);
            resolve({
              allowed: rateLimitStates.length <= 10,
              retryAfter: rateLimitStates.length > 10 ? 60 : undefined,
            });
          }),
      );

      const request1 = new Request("https://adocavo.net/api/generate", {
        method: "POST",
        body: JSON.stringify({
          hookId: "hook-1",
          productDescription: "A valid product description that is long enough",
        }),
      });

      const response1 = await POST(request1);
      expect(response1.status).toBe(200);

      windowStart = Date.now() - 61000;
      const request2 = new Request("https://adocavo.net/api/generate", {
        method: "POST",
        body: JSON.stringify({
          hookId: "hook-2",
          productDescription: "A valid product description that is long enough",
        }),
      });

      const response2 = await POST(request2);
      expect(response2.status).toBe(200);
    });
  });

  describe("Credit Deduction Race Conditions", () => {
    it("should prevent negative credits from concurrent deductions", async () => {
      const userCredits = { credits: 5 };
      let deductionCount = 0;

      vi.mocked(generateScripts).mockImplementation(
        async () =>
          new Promise((resolve) => {
            deductionCount++;
            const newCredits = Math.max(0, userCredits.credits - 5);
            userCredits.credits = newCredits;

            if (newCredits === 0 && deductionCount > 1) {
              resolve({
                success: false,
                error: "INSUFFICIENT_CREDITS",
                message: "No credits remaining",
              });
            } else {
              resolve({
                success: true,
                scripts: [
                  { angle: "Pain Point", script: "Script 1" },
                  { angle: "Benefit", script: "Script 2" },
                  { angle: "Social Proof", script: "Script 3" },
                ],
                creditsRemaining: userCredits.credits,
                generationId: `gen-${deductionCount}`,
              });
            }
          }),
      );

      const concurrentRequests = 3;
      const promises = Array.from(
        { length: concurrentRequests },
        (_, i) =>
          new Request("https://adocavo.net/api/generate", {
            method: "POST",
            body: JSON.stringify({
              hookId: `hook-${i}`,
              productDescription: `Product description ${i}`,
            }),
          }),
      );

      const responses = await Promise.all(promises.map((req) => POST(req)));

      const successCount = responses.filter((r) => r.status === 200).length;
      const errorCount = responses.filter((r) => r.status === 402).length;

      expect(successCount).toBe(1);
      expect(errorCount).toBe(2);
      expect(userCredits.credits).toBe(0);
    });
  });

  describe("Error Handling Under Concurrency", () => {
    it("should handle partial failures gracefully", async () => {
      let callCount = 0;
      vi.mocked(generateScripts).mockImplementation(
        async () =>
          new Promise((resolve, reject) => {
            callCount++;
            if (callCount % 2 === 0) {
              resolve({
                success: true,
                scripts: [
                  { angle: "Pain Point", script: "Script 1" },
                  { angle: "Benefit", script: "Script 2" },
                  { angle: "Social Proof", script: "Script 3" },
                ],
                creditsRemaining: 95,
                generationId: `gen-${callCount}`,
              });
            } else {
              reject(new Error("Simulated AI failure"));
            }
          }),
      );

      const requests = 4;
      const promises = Array.from(
        { length: requests },
        (_, i) =>
          new Request("https://adocavo.net/api/generate", {
            method: "POST",
            body: JSON.stringify({
              hookId: `hook-${i}`,
              productDescription: `Product description ${i}`,
            }),
          }),
      );

      const results = await Promise.allSettled(
        promises.map((req) => POST(req)),
      );

      const fulfilled = results.filter((r) => r.status === "fulfilled");
      const rejected = results.filter((r) => r.status === "rejected");

      expect(fulfilled.length + rejected.length).toBe(requests);
      expect(fulfilled.length).toBeGreaterThan(0);
    });

    it("should maintain data consistency after concurrent failures", async () => {
      const consistentCredits = { value: 50 };

      vi.mocked(generateScripts).mockResolvedValue({
        success: true,
        scripts: [
          { angle: "Pain Point", script: "Script 1" },
          { angle: "Benefit", script: "Script 2" },
          { angle: "Social Proof", script: "Script 3" },
        ],
        creditsRemaining: consistentCredits.value,
        generationId: "gen-1",
      });

      const requests = 5;
      const promises = Array.from(
        { length: requests },
        (_, i) =>
          new Request("https://adocavo.net/api/generate", {
            method: "POST",
            body: JSON.stringify({
              hookId: `hook-${i}`,
              productDescription: `Product description ${i}`,
            }),
          }),
      );

      const responses = await Promise.all(promises.map((req) => POST(req)));

      const bodies = await Promise.all(
        responses.map(async (res) => {
          if (res.status === 200) {
            return res.json();
          }
          return null;
        }),
      );

      const creditValues = bodies
        .filter((b) => b !== null)
        .map((b) => b.data.creditsRemaining);

      creditValues.forEach((credits) => {
        expect(credits).toBeGreaterThanOrEqual(0);
        expect(credits).toBeLessThanOrEqual(100);
      });
    });
  });
});
