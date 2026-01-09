import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/health/route";
import { getCloudflareContext } from "@/lib/cloudflare";

vi.mock("@/lib/cloudflare", () => ({
  getCloudflareContext: vi.fn(),
}));

describe("API: GET /api/health", () => {
  const mockEnv = {
    DB: {
      prepare: vi.fn(),
      batch: vi.fn(),
      exec: vi.fn(),
    } as unknown as D1Database,
    AI: {
      run: vi.fn(),
    } as unknown as Ai,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(1704067200000);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("healthy responses", () => {
    it("should return healthy status when all services are up", async () => {
      vi.mocked(getCloudflareContext).mockResolvedValue({
        env: mockEnv,
      } as never);

      const mockDbStatement = {
        all: vi.fn().mockResolvedValue([{ ping: 1 }]),
        run: vi.fn().mockResolvedValue({}),
      };
      vi.mocked(mockEnv.DB.prepare).mockReturnValue(mockDbStatement as never);
      vi.mocked(mockEnv.AI.run).mockResolvedValue({ response: "pong" });

      const response = await GET();
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.status).toBe("healthy");
      expect(body.checks.database.status).toBe("healthy");
      expect(body.checks.ai.status).toBe("healthy");
    });

    it("should include latency information", async () => {
      vi.mocked(getCloudflareContext).mockResolvedValue({
        env: mockEnv,
      } as never);

      const mockDbStatement = {
        all: vi.fn().mockResolvedValue([{ ping: 1 }]),
        run: vi.fn().mockResolvedValue({}),
      };
      vi.mocked(mockEnv.DB.prepare).mockReturnValue(mockDbStatement as never);
      vi.mocked(mockEnv.AI.run).mockResolvedValue({ response: "pong" });

      const response = await GET();
      const body = await response.json();

      expect(body.latency).toBeGreaterThanOrEqual(0);
      expect(body.checks.database.latency).toBeGreaterThanOrEqual(0);
      expect(body.checks.ai.latency).toBeGreaterThanOrEqual(0);
    });

    it("should include timestamp", async () => {
      vi.mocked(getCloudflareContext).mockResolvedValue({
        env: mockEnv,
      } as never);

      const mockDbStatement = {
        all: vi.fn().mockResolvedValue([{ ping: 1 }]),
        run: vi.fn().mockResolvedValue({}),
      };
      vi.mocked(mockEnv.DB.prepare).mockReturnValue(mockDbStatement as never);
      vi.mocked(mockEnv.AI.run).mockResolvedValue({ response: "pong" });

      const response = await GET();
      const body = await response.json();

      expect(body.timestamp).toBe("2024-01-01T00:00:00.000Z");
    });

    it("should include runtime information", async () => {
      vi.mocked(getCloudflareContext).mockResolvedValue({
        env: mockEnv,
      } as never);

      const mockDbStatement = {
        all: vi.fn().mockResolvedValue([{ ping: 1 }]),
        run: vi.fn().mockResolvedValue({}),
      };
      vi.mocked(mockEnv.DB.prepare).mockReturnValue(mockDbStatement as never);
      vi.mocked(mockEnv.AI.run).mockResolvedValue({ response: "pong" });

      const response = await GET();
      const body = await response.json();

      expect(body.runtime).toBeDefined();
    });
  });

  describe("database checks", () => {
    it("should detect when DB binding is missing", async () => {
      vi.mocked(getCloudflareContext).mockResolvedValue({
        env: {
          ...mockEnv,
          DB: undefined,
        },
      } as never);

      const response = await GET();
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.status).toBe("unhealthy");
      expect(body.checks.database.status).toBe("error");
      expect(body.checks.database.details).toBe("DB binding missing");
    });

    it("should detect database connection errors", async () => {
      vi.mocked(getCloudflareContext).mockResolvedValue({
        env: mockEnv,
      } as never);

      const mockDbStatement = {
        all: vi.fn().mockRejectedValue(new Error("Connection lost")),
        run: vi.fn().mockResolvedValue({}),
      };
      vi.mocked(mockEnv.DB.prepare).mockReturnValue(mockDbStatement as never);
      vi.mocked(mockEnv.AI.run).mockResolvedValue({ response: "pong" });

      const response = await GET();
      const body = await response.json();

      expect(body.status).toBe("unhealthy");
      expect(body.checks.database.status).toBe("error");
      expect(body.checks.database.details).toBe("Connection lost");
    });

    it("should perform ping query", async () => {
      vi.mocked(getCloudflareContext).mockResolvedValue({
        env: mockEnv,
      } as never);

      const mockDbStatement = {
        all: vi.fn().mockResolvedValue([{ ping: 1 }]),
        run: vi.fn().mockResolvedValue({}),
      };
      const prepareSpy = vi
        .mocked(mockEnv.DB.prepare)
        .mockReturnValue(mockDbStatement as never);
      vi.mocked(mockEnv.AI.run).mockResolvedValue({ response: "pong" });

      await GET();

      expect(prepareSpy).toHaveBeenCalledWith("SELECT 1 as ping");
    });

    it("should perform write capability check", async () => {
      vi.mocked(getCloudflareContext).mockResolvedValue({
        env: mockEnv,
      } as never);

      const mockDbStatement = {
        all: vi.fn().mockResolvedValue([{ ping: 1 }]),
        run: vi.fn().mockResolvedValue({}),
      };
      const prepareSpy = vi
        .mocked(mockEnv.DB.prepare)
        .mockReturnValue(mockDbStatement as never);
      vi.mocked(mockEnv.AI.run).mockResolvedValue({ response: "pong" });

      await GET();

      expect(prepareSpy).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE rate_limits"),
      );
    });
  });

  describe("AI checks", () => {
    it("should detect when AI binding is missing", async () => {
      vi.mocked(getCloudflareContext).mockResolvedValue({
        env: {
          ...mockEnv,
          AI: undefined,
        },
      } as never);

      const mockDbStatement = {
        all: vi.fn().mockResolvedValue([{ ping: 1 }]),
        run: vi.fn().mockResolvedValue({}),
      };
      vi.mocked(mockEnv.DB.prepare).mockReturnValue(mockDbStatement as never);

      const response = await GET();
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.status).toBe("unhealthy");
      expect(body.checks.ai.status).toBe("error");
      expect(body.checks.ai.details).toBe("AI binding missing");
    });

    it("should detect AI service errors", async () => {
      vi.mocked(getCloudflareContext).mockResolvedValue({
        env: mockEnv,
      } as never);

      const mockDbStatement = {
        all: vi.fn().mockResolvedValue([{ ping: 1 }]),
        run: vi.fn().mockResolvedValue({}),
      };
      vi.mocked(mockEnv.DB.prepare).mockReturnValue(mockDbStatement as never);
      vi.mocked(mockEnv.AI.run).mockRejectedValue(new Error("AI unavailable"));

      const response = await GET();
      const body = await response.json();

      expect(body.status).toBe("unhealthy");
      expect(body.checks.ai.status).toBe("error");
      expect(body.checks.ai.details).toBe("AI unavailable");
    });

    it("should call AI with minimal token usage", async () => {
      vi.mocked(getCloudflareContext).mockResolvedValue({
        env: mockEnv,
      } as never);

      const mockDbStatement = {
        all: vi.fn().mockResolvedValue([{ ping: 1 }]),
        run: vi.fn().mockResolvedValue({}),
      };
      vi.mocked(mockEnv.DB.prepare).mockReturnValue(mockDbStatement as never);
      const aiRunSpy = vi
        .mocked(mockEnv.AI.run)
        .mockResolvedValue({ response: "pong" });

      await GET();

      expect(aiRunSpy).toHaveBeenCalledWith(
        "@cf/meta/llama-3-8b-instruct",
        expect.objectContaining({
          max_tokens: 1,
        }),
      );
    });
  });

  describe("context errors", () => {
    it("should handle missing Cloudflare context", async () => {
      vi.mocked(getCloudflareContext).mockRejectedValue(
        new Error("Cloudflare context not available"),
      );

      const response = await GET();
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.status).toBe("error");
      expect(body.message).toContain("Cloudflare");
    });

    it("should handle missing env in context", async () => {
      vi.mocked(getCloudflareContext).mockResolvedValue({
        env: undefined,
      } as never);

      const response = await GET();
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.status).toBe("error");
      expect(body.message).toContain("Cloudflare Context missing");
    });

    it("should handle thrown errors", async () => {
      vi.mocked(getCloudflareContext).mockImplementation(() => {
        throw new Error("Unexpected error");
      });

      const response = await GET();
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.status).toBe("error");
    });
  });

  describe("partial failures", () => {
    it("should report unhealthy when DB fails but AI is healthy", async () => {
      vi.mocked(getCloudflareContext).mockResolvedValue({
        env: mockEnv,
      } as never);

      const mockDbStatement = {
        all: vi.fn().mockRejectedValue(new Error("DB error")),
        run: vi.fn().mockResolvedValue({}),
      };
      vi.mocked(mockEnv.DB.prepare).mockReturnValue(mockDbStatement as never);
      vi.mocked(mockEnv.AI.run).mockResolvedValue({ response: "pong" });

      const response = await GET();
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.status).toBe("unhealthy");
      expect(body.checks.database.status).toBe("error");
      expect(body.checks.ai.status).toBe("healthy");
    });

    it("should report unhealthy when AI fails but DB is healthy", async () => {
      vi.mocked(getCloudflareContext).mockResolvedValue({
        env: mockEnv,
      } as never);

      const mockDbStatement = {
        all: vi.fn().mockResolvedValue([{ ping: 1 }]),
        run: vi.fn().mockResolvedValue({}),
      };
      vi.mocked(mockEnv.DB.prepare).mockReturnValue(mockDbStatement as never);
      vi.mocked(mockEnv.AI.run).mockRejectedValue(new Error("AI error"));

      const response = await GET();
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.status).toBe("unhealthy");
      expect(body.checks.database.status).toBe("healthy");
      expect(body.checks.ai.status).toBe("error");
    });
  });

  describe("response structure", () => {
    it("should include all expected fields in healthy response", async () => {
      vi.mocked(getCloudflareContext).mockResolvedValue({
        env: mockEnv,
      } as never);

      const mockDbStatement = {
        all: vi.fn().mockResolvedValue([{ ping: 1 }]),
        run: vi.fn().mockResolvedValue({}),
      };
      vi.mocked(mockEnv.DB.prepare).mockReturnValue(mockDbStatement as never);
      vi.mocked(mockEnv.AI.run).mockResolvedValue({ response: "pong" });

      const response = await GET();
      const body = await response.json();

      expect(Object.keys(body)).toEqual([
        "status",
        "timestamp",
        "runtime",
        "latency",
        "checks",
      ]);
      expect(Object.keys(body.checks)).toEqual(["database", "ai"]);
    });
  });
});
