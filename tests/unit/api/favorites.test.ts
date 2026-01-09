import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST, DELETE } from "@/app/api/scripts/favorites/route";
import { auth } from "@/lib/auth";
import { getBindings, getD1 } from "@/lib/cloudflare";
import { createFavoriteService } from "@/lib/services/favorites";
import { checkRateLimit } from "@/lib/rate-limit";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/cloudflare", async () => {
  const actual = await vi.importActual("@/lib/cloudflare");
  return {
    ...actual,
    getBindings: vi.fn(),
    getD1: vi.fn(() => ({}) as D1Database),
    getDB: vi.fn(() => ({})),
  };
});

vi.mock("@/lib/services/favorites", () => ({
  createFavoriteService: vi.fn(),
}));

vi.mock("@/lib/api-utils", async () => {
  const actual = await vi.importActual("@/lib/api-utils");
  return {
    ...actual,
    validateCSRF: vi.fn(() => true),
  };
});

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue({ allowed: true }),
}));

describe("API: /api/scripts/favorites", () => {
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

  const mockSession = {
    user: {
      id: "user-1",
      email: "test@example.com",
      credits: 10,
    },
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  };

  const mockFavoriteService = {
    getUserFavorites: vi.fn(),
    addFavorite: vi.fn(),
    removeFavorite: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(getBindings).mockReturnValue(mockEnv as any);
    vi.mocked(createFavoriteService).mockResolvedValue(
      mockFavoriteService as any,
    );
    vi.mocked(getD1).mockReturnValue({} as D1Database);
  });

  describe("GET /api/scripts/favorites", () => {
    it("should return user favorites when authenticated", async () => {
      const mockFavorites = [
        {
          id: "fav-1",
          generatedScriptId: "script-1",
          hookText: "Hook 1",
          productDescription: "Product 1",
          scripts: [{ angle: "Pain Point", script: "Script 1" }],
          createdAt: new Date(),
        },
      ];
      mockFavoriteService.getUserFavorites.mockResolvedValue(mockFavorites);

      const request = new Request("https://adocavo.net/api/scripts/favorites");
      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.favorites).toHaveLength(1);
      expect(body.data.favorites[0]).toMatchObject({
        id: "fav-1",
        generatedScriptId: "script-1",
        hookText: "Hook 1",
        productDescription: "Product 1",
        scripts: [{ angle: "Pain Point", script: "Script 1" }],
      });
      expect(body.data.favorites[0].createdAt).toBeDefined();
      expect(mockFavoriteService.getUserFavorites).toHaveBeenCalledWith(
        "user-1",
      );
    });

    it("should return 401 when not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const request = new Request("https://adocavo.net/api/scripts/favorites");
      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("AUTH_REQUIRED");
    });

    it("should return empty array when no favorites", async () => {
      mockFavoriteService.getUserFavorites.mockResolvedValue([]);

      const request = new Request("https://adocavo.net/api/scripts/favorites");
      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data.favorites).toEqual([]);
    });

    it("should return 500 when database unavailable", async () => {
      vi.mocked(getD1).mockImplementation(() => {
        throw new Error("D1 not available");
      });

      const request = new Request("https://adocavo.net/api/scripts/favorites");
      const response = await GET(request);

      expect(response.status).toBe(500);
    });
  });

  describe("POST /api/scripts/favorites", () => {
    it("should add favorite when authenticated", async () => {
      mockFavoriteService.addFavorite.mockResolvedValue({ id: "fav-1" });

      const request = new Request("https://adocavo.net/api/scripts/favorites", {
        method: "POST",
        body: JSON.stringify({
          generatedScriptId: "script-1",
        }),
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.id).toBe("fav-1");
      expect(mockFavoriteService.addFavorite).toHaveBeenCalledWith({
        userId: "user-1",
        generatedScriptId: "script-1",
      });
    });

    it("should return 401 when not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const request = new Request("https://adocavo.net/api/scripts/favorites", {
        method: "POST",
        body: JSON.stringify({
          generatedScriptId: "script-1",
        }),
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body.success).toBe(false);
    });

    it("should validate generatedScriptId is present", async () => {
      const request = new Request("https://adocavo.net/api/scripts/favorites", {
        method: "POST",
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.success).toBe(false);
    });

    it("should validate generatedScriptId is not empty", async () => {
      const request = new Request("https://adocavo.net/api/scripts/favorites", {
        method: "POST",
        body: JSON.stringify({
          generatedScriptId: "",
        }),
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.success).toBe(false);
    });

    it("should handle invalid JSON", async () => {
      const request = new Request("https://adocavo.net/api/scripts/favorites", {
        method: "POST",
        body: "invalid json",
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.success).toBe(false);
    });

    it("should return 500 when database unavailable", async () => {
      vi.mocked(getD1).mockImplementation(() => {
        throw new Error("D1 not available");
      });

      const request = new Request("https://adocavo.net/api/scripts/favorites", {
        method: "POST",
        body: JSON.stringify({
          generatedScriptId: "script-1",
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(500);
    });

    it("should return existing favorite ID when already favorited", async () => {
      mockFavoriteService.addFavorite.mockResolvedValue({ id: "existing-fav" });

      const request = new Request("https://adocavo.net/api/scripts/favorites", {
        method: "POST",
        body: JSON.stringify({
          generatedScriptId: "script-1",
        }),
      });

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data.id).toBe("existing-fav");
    });
  });

  describe("DELETE /api/scripts/favorites", () => {
    it("should remove favorite when authenticated", async () => {
      mockFavoriteService.removeFavorite.mockResolvedValue(true);

      const request = new Request("https://adocavo.net/api/scripts/favorites", {
        method: "DELETE",
        body: JSON.stringify({
          generatedScriptId: "script-1",
        }),
      });

      const response = await DELETE(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.success).toBe(true);
      expect(mockFavoriteService.removeFavorite).toHaveBeenCalledWith(
        "user-1",
        "script-1",
      );
    });

    it("should return 401 when not authenticated", async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const request = new Request("https://adocavo.net/api/scripts/favorites", {
        method: "DELETE",
        body: JSON.stringify({
          generatedScriptId: "script-1",
        }),
      });

      const response = await DELETE(request);
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body.success).toBe(false);
    });

    it("should validate generatedScriptId is present", async () => {
      const request = new Request("https://adocavo.net/api/scripts/favorites", {
        method: "DELETE",
        body: JSON.stringify({}),
      });

      const response = await DELETE(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.success).toBe(false);
    });

    it("should handle invalid JSON", async () => {
      const request = new Request("https://adocavo.net/api/scripts/favorites", {
        method: "DELETE",
        body: "invalid json",
      });

      const response = await DELETE(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.success).toBe(false);
    });

    it("should return 500 when database unavailable", async () => {
      vi.mocked(getD1).mockImplementation(() => {
        throw new Error("D1 not available");
      });

      const request = new Request("https://adocavo.net/api/scripts/favorites", {
        method: "DELETE",
        body: JSON.stringify({
          generatedScriptId: "script-1",
        }),
      });

      const response = await DELETE(request);

      expect(response.status).toBe(500);
    });

    it("should succeed even when favorite does not exist", async () => {
      mockFavoriteService.removeFavorite.mockResolvedValue(true);

      const request = new Request("https://adocavo.net/api/scripts/favorites", {
        method: "DELETE",
        body: JSON.stringify({
          generatedScriptId: "nonexistent-script",
        }),
      });

      const response = await DELETE(request);

      expect(response.status).toBe(200);
    });
  });
});
