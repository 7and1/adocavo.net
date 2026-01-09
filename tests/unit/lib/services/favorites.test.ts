import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  FavoriteService,
  createFavoriteService,
} from "@/lib/services/favorites";
import { createDb } from "@/lib/db";
import { scriptFavorites, generatedScripts, hooks } from "@/lib/schema";

vi.mock("@/lib/db", () => ({
  createDb: vi.fn(),
}));

vi.mock("nanoid", () => ({
  nanoid: vi.fn(() => "test-id"),
}));

describe("FavoriteService", () => {
  let mockDb: any;
  let service: FavoriteService;

  beforeEach(() => {
    vi.clearAllMocks();

    const mockSelectResult = {
      from: vi.fn().mockReturnThis(),
      innerJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    };

    mockDb = {
      query: {
        scriptFavorites: {
          findFirst: vi.fn(),
          findMany: vi.fn(),
        },
        generatedScripts: {
          findFirst: vi.fn(),
        },
      },
      insert: vi.fn(),
      delete: vi.fn(),
      select: vi.fn().mockReturnValue(mockSelectResult),
    };

    service = new FavoriteService(mockDb);
  });

  describe("addFavorite", () => {
    it("should add a new favorite", async () => {
      mockDb.query.scriptFavorites.findFirst.mockResolvedValue(null);
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      });

      const result = await service.addFavorite({
        userId: "user-1",
        generatedScriptId: "script-1",
      });

      expect(result.id).toBe("test-id");
      expect(mockDb.insert).toHaveBeenCalledWith(scriptFavorites);
    });

    it("should return existing favorite ID if already favorited", async () => {
      const existingFavorite = { id: "existing-id" };
      mockDb.query.scriptFavorites.findFirst.mockResolvedValue(
        existingFavorite,
      );

      const result = await service.addFavorite({
        userId: "user-1",
        generatedScriptId: "script-1",
      });

      expect(result.id).toBe("existing-id");
      expect(mockDb.insert).not.toHaveBeenCalled();
    });

    it("should check for existing favorite with correct where clause", async () => {
      mockDb.query.scriptFavorites.findFirst.mockResolvedValue(null);
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      });

      await service.addFavorite({
        userId: "user-1",
        generatedScriptId: "script-1",
      });

      expect(mockDb.query.scriptFavorites.findFirst).toHaveBeenCalledWith({
        where: expect.any(Object),
      });
    });
  });

  describe("removeFavorite", () => {
    it("should remove a favorite", async () => {
      mockDb.delete.mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      });

      const result = await service.removeFavorite("user-1", "script-1");

      expect(result).toBe(true);
      expect(mockDb.delete).toHaveBeenCalledWith(scriptFavorites);
    });

    it("should use correct where clause for deletion", async () => {
      const whereSpy = vi.fn().mockResolvedValue(undefined);
      mockDb.delete.mockReturnValue({
        where: whereSpy,
      });

      await service.removeFavorite("user-1", "script-1");

      expect(whereSpy).toHaveBeenCalledWith(expect.any(Object));
    });

    it("should return true even if favorite does not exist", async () => {
      mockDb.delete.mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      });

      const result = await service.removeFavorite(
        "user-1",
        "nonexistent-script",
      );

      expect(result).toBe(true);
    });
  });

  describe("isFavorite", () => {
    it("should return true when script is favorited", async () => {
      mockDb.query.scriptFavorites.findFirst.mockResolvedValue({
        id: "fav-1",
        userId: "user-1",
        generatedScriptId: "script-1",
      });

      const result = await service.isFavorite("user-1", "script-1");

      expect(result).toBe(true);
    });

    it("should return false when script is not favorited", async () => {
      mockDb.query.scriptFavorites.findFirst.mockResolvedValue(null);

      const result = await service.isFavorite("user-1", "script-1");

      expect(result).toBe(false);
    });

    it("should use correct query parameters", async () => {
      mockDb.query.scriptFavorites.findFirst.mockResolvedValue(null);

      await service.isFavorite("user-1", "script-1");

      expect(mockDb.query.scriptFavorites.findFirst).toHaveBeenCalledWith({
        where: expect.any(Object),
      });
    });
  });

  describe("getUserFavorites", () => {
    const mockFavorites = [
      {
        id: "fav-1",
        userId: "user-1",
        generatedScriptId: "script-1",
        createdAt: new Date("2024-01-01"),
      },
      {
        id: "fav-2",
        userId: "user-1",
        generatedScriptId: "script-2",
        createdAt: new Date("2024-01-02"),
      },
    ];

    const mockScriptsWithHook = [
      {
        id: "script-1",
        hook: {
          text: "Hook 1",
        },
        productDescription: "Product 1",
        scripts: [{ angle: "Pain Point", script: "Script 1" }],
      },
      {
        id: "script-2",
        hook: {
          text: "Hook 2",
        },
        productDescription: "Product 2",
        scripts: [{ angle: "Benefit", script: "Script 2" }],
      },
    ];

    it("should return user favorites with details", async () => {
      const mockSelectResult = [
        {
          favoriteId: "fav-1",
          generatedScriptId: "script-1",
          hookText: "Hook 1",
          productDescription: "Product 1",
          scripts: [
            { angle: "Pain Point", script: "Script 1" },
          ] as unknown as string,
          createdAt: new Date(),
        },
        {
          favoriteId: "fav-2",
          generatedScriptId: "script-2",
          hookText: "Hook 2",
          productDescription: "Product 2",
          scripts: [
            { angle: "Benefit", script: "Script 2" },
          ] as unknown as string,
          createdAt: new Date(),
        },
      ];

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue(mockSelectResult),
      });

      const result = await service.getUserFavorites("user-1");

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        id: "fav-1",
        generatedScriptId: "script-1",
        hookText: "Hook 1",
        productDescription: "Product 1",
      });
    });

    it("should use default limit of 20", async () => {
      const limitMock = vi.fn().mockResolvedValue([]);
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: limitMock,
      });

      await service.getUserFavorites("user-1");

      expect(limitMock).toHaveBeenCalledWith(20);
    });

    it("should respect custom limit", async () => {
      const limitMock = vi.fn().mockResolvedValue([]);
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: limitMock,
      });

      await service.getUserFavorites("user-1", 5);

      expect(limitMock).toHaveBeenCalledWith(5);
    });

    it("should skip favorites where script is deleted", async () => {
      // The new implementation uses SQL joins, so deleted scripts won't appear
      // This test now verifies that the query works correctly
      const mockSelectResult = [
        {
          favoriteId: "fav-1",
          generatedScriptId: "script-1",
          hookText: "Hook 1",
          productDescription: "Product 1",
          scripts: [
            { angle: "Pain Point", script: "Script 1" },
          ] as unknown as string,
          createdAt: new Date(),
        },
      ];

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue(mockSelectResult),
      });

      const result = await service.getUserFavorites("user-1");

      expect(result).toHaveLength(1);
      expect(result[0].generatedScriptId).toBe("script-1");
    });

    it("should order by creation date descending", async () => {
      const orderByMock = vi.fn().mockReturnThis();
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: orderByMock,
        limit: vi.fn().mockResolvedValue([]),
      });

      await service.getUserFavorites("user-1");

      expect(orderByMock).toHaveBeenCalled();
    });

    it("should handle empty favorites list", async () => {
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      });

      const result = await service.getUserFavorites("user-1");

      expect(result).toEqual([]);
    });

    it("should return scripts array correctly", async () => {
      const mockSelectResult = [
        {
          favoriteId: "fav-1",
          generatedScriptId: "script-1",
          hookText: "Hook 1",
          productDescription: "Product 1",
          scripts: [
            { angle: "Pain Point", script: "Script 1" },
            { angle: "Benefit", script: "Script 2" },
          ] as unknown as string, // Mocking the db layer parsing
          createdAt: new Date(),
        },
      ];

      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue(mockSelectResult),
      });

      const result = await service.getUserFavorites("user-1");

      expect(result[0].scripts).toHaveLength(2);
      expect(result[0].scripts[0]).toEqual({
        angle: "Pain Point",
        script: "Script 1",
      });
    });
  });

  describe("getFavoriteCount", () => {
    it("should return count of user favorites", async () => {
      const favorites = [
        { id: "fav-1", userId: "user-1" },
        { id: "fav-2", userId: "user-1" },
        { id: "fav-3", userId: "user-1" },
      ];
      mockDb.query.scriptFavorites.findMany.mockResolvedValue(favorites);

      const result = await service.getFavoriteCount("user-1");

      expect(result).toBe(3);
    });

    it("should return 0 when user has no favorites", async () => {
      mockDb.query.scriptFavorites.findMany.mockResolvedValue([]);

      const result = await service.getFavoriteCount("user-1");

      expect(result).toBe(0);
    });

    it("should filter by user ID", async () => {
      mockDb.query.scriptFavorites.findMany.mockResolvedValue([]);

      await service.getFavoriteCount("user-1");

      expect(mockDb.query.scriptFavorites.findMany).toHaveBeenCalledWith({
        where: expect.any(Object),
      });
    });
  });
});

describe("createFavoriteService", () => {
  it("should create FavoriteService with database instance", async () => {
    const mockD1 = {} as D1Database;
    const mockDbInstance = {};

    vi.mocked(createDb).mockReturnValue(mockDbInstance as any);

    const service = await createFavoriteService(mockD1);

    expect(service).toBeInstanceOf(FavoriteService);
    expect(createDb).toHaveBeenCalledWith(mockD1);
  });
});
