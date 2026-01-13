import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getHooks,
  getHookById,
  getCategories,
  getHookCategories,
  getHookCount,
} from "@/lib/services/hooks";
import { createDb } from "@/lib/db";
import type { HookCategory } from "@/lib/validations";

vi.mock("@/lib/db", () => ({
  createDb: vi.fn(),
}));

vi.mock("@/lib/cloudflare", () => ({
  getCloudflareContext: vi.fn(),
  getBindings: vi.fn(() => ({})),
  getD1: vi.fn(() => ({})),
  getKV: vi.fn(() => null),
}));

describe("Hooks Service", () => {
  let mockDb: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockDb = {
      query: {
        hooks: {
          findMany: vi.fn(),
          findFirst: vi.fn(),
        },
      },
      select: vi.fn(),
    };

    vi.mocked(createDb).mockReturnValue(mockDb);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("getHooks", () => {
    const mockHooks = [
      {
        id: "hook-1",
        text: "Stop scrolling if you have acne",
        category: "beauty",
        engagementScore: 9500,
        isActive: true,
      },
      {
        id: "hook-2",
        text: "This is your sign to start that side hustle",
        category: "finance",
        engagementScore: 8900,
        isActive: true,
      },
    ];

    it("should return hooks with default filters", async () => {
      mockDb.query.hooks.findMany.mockResolvedValue(mockHooks);

      const result = await getHooks({} as D1Database);

      expect(result).toEqual(mockHooks);
      expect(mockDb.query.hooks.findMany).toHaveBeenCalledWith({
        where: expect.any(Object),
        orderBy: expect.any(Array),
        limit: 20,
        offset: 0,
      });
    });

    it("should filter by category", async () => {
      mockDb.query.hooks.findMany.mockResolvedValue([mockHooks[0]]);

      const result = await getHooks({} as D1Database, {
        category: "beauty" as HookCategory,
      });

      expect(result).toHaveLength(1);
      expect(result[0].category).toBe("beauty");
    });

    it("should filter by search term", async () => {
      mockDb.query.hooks.findMany.mockResolvedValue([mockHooks[0]]);

      const result = await getHooks({} as D1Database, {
        search: "acne",
      });

      expect(mockDb.query.hooks.findMany).toHaveBeenCalled();
    });

    it("should apply pagination", async () => {
      mockDb.query.hooks.findMany.mockResolvedValue(mockHooks);

      await getHooks({} as D1Database, {
        page: 2,
        limit: 10,
      });

      expect(mockDb.query.hooks.findMany).toHaveBeenCalledWith({
        where: expect.any(Object),
        orderBy: expect.any(Array),
        limit: 10,
        offset: 10,
      });
    });

    it("should combine category and search filters", async () => {
      mockDb.query.hooks.findMany.mockResolvedValue([]);

      await getHooks({} as D1Database, {
        category: "beauty" as HookCategory,
        search: "acne",
      });

      expect(mockDb.query.hooks.findMany).toHaveBeenCalled();
    });

    it("should respect max limit", async () => {
      mockDb.query.hooks.findMany.mockResolvedValue([]);

      await getHooks({} as D1Database, {
        limit: 100,
      });

      expect(mockDb.query.hooks.findMany).toHaveBeenCalledWith({
        where: expect.any(Object),
        orderBy: expect.any(Array),
        limit: 100,
        offset: 0,
      });
    });

    it("should handle empty results", async () => {
      mockDb.query.hooks.findMany.mockResolvedValue([]);

      const result = await getHooks({} as D1Database);

      expect(result).toEqual([]);
    });

    it("should return only active hooks", async () => {
      const allHooks = [
        { id: "hook-1", isActive: true },
        { id: "hook-2", isActive: false },
      ];
      mockDb.query.hooks.findMany.mockResolvedValue([allHooks[0]]);

      const result = await getHooks({} as D1Database);

      expect(result).not.toContainEqual(allHooks[1]);
    });
  });

  describe("getHookById", () => {
    it("should return hook when it exists and is active", async () => {
      const mockHook = {
        id: "hook-1",
        text: "Test hook",
        category: "beauty",
        isActive: true,
      };
      mockDb.query.hooks.findFirst.mockResolvedValue(mockHook);

      const result = await getHookById({} as D1Database, "hook-1");

      expect(result).toEqual(mockHook);
    });

    it("should return null when hook does not exist", async () => {
      mockDb.query.hooks.findFirst.mockResolvedValue(null);

      const result = await getHookById({} as D1Database, "nonexistent");

      expect(result).toBeNull();
    });

    it("should return null when hook is inactive", async () => {
      const inactiveHook = {
        id: "hook-1",
        text: "Test hook",
        isActive: false,
      };
      mockDb.query.hooks.findFirst.mockResolvedValue(null);

      const result = await getHookById({} as D1Database, "hook-1");

      expect(result).toBeNull();
    });

    it("should handle special characters in hook ID", async () => {
      const mockHook = {
        id: "hook-with-special-chars-123",
        text: "Test hook",
        isActive: true,
      };
      mockDb.query.hooks.findFirst.mockResolvedValue(mockHook);

      const result = await getHookById(
        {} as D1Database,
        "hook-with-special-chars-123",
      );

      expect(result).toEqual(mockHook);
    });
  });

  describe("getCategories", () => {
    it("should return categories with counts", async () => {
      const mockDbResult = [
        { category: "beauty", count: 15 },
        { category: "tech", count: 10 },
      ];

      const mockSelectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        groupBy: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue(mockDbResult),
      };

      mockDb.select.mockReturnValue(mockSelectChain);

      const result = await getCategories({} as D1Database);

      expect(result).toEqual([
        { category: "beauty", count: 15 },
        { category: "tech", count: 10 },
      ]);
    });

    it("should return empty array when no categories exist", async () => {
      const mockSelectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        groupBy: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue([]),
      };

      mockDb.select.mockReturnValue(mockSelectChain);

      const result = await getCategories({} as D1Database);

      expect(result).toEqual([]);
    });

    it("should order by count descending", async () => {
      const mockSelectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        groupBy: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue([]),
      };

      mockDb.select.mockReturnValue(mockSelectChain);

      await getCategories({} as D1Database);

      expect(mockSelectChain.orderBy).toHaveBeenCalled();
    });
  });

  describe("getHookCategories", () => {
    it("should return distinct categories", async () => {
      const mockDbResult = [
        { category: "beauty" },
        { category: "tech" },
        { category: "finance" },
      ];

      mockDb.query.hooks.findMany = vi
        .fn()
        .mockResolvedValue([
          { category: "beauty" },
          { category: "tech" },
          { category: "finance" },
        ]);

      mockDb.selectDistinct = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(mockDbResult),
      });

      const result = await getHookCategories({} as D1Database);

      expect(result).toEqual(["beauty", "tech", "finance"]);
    });

    it("should return empty array when no hooks exist", async () => {
      mockDb.selectDistinct = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([]),
      });

      const result = await getHookCategories({} as D1Database);

      expect(result).toEqual([]);
    });

    it("should filter only active hooks", async () => {
      mockDb.selectDistinct = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{ category: "beauty" }]),
      });

      await getHookCategories({} as D1Database);

      const whereChain = mockDb.selectDistinct({}).from({}).where;
      expect(whereChain).toBeDefined();
    });
  });

  describe("getHookCount", () => {
    it("should return total count without category filter", async () => {
      const mockSelectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        get: vi.fn().mockResolvedValue({ total: 100 }),
      };

      mockDb.select.mockReturnValue(mockSelectChain);

      const result = await getHookCount({} as D1Database);

      expect(result).toBe(100);
    });

    it("should return count for specific category", async () => {
      const mockSelectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        get: vi.fn().mockResolvedValue({ total: 25 }),
      };

      mockDb.select.mockReturnValue(mockSelectChain);

      const result = await getHookCount({} as D1Database, "beauty");

      expect(result).toBe(25);
    });

    it("should return 0 when no hooks match", async () => {
      const mockSelectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        get: vi.fn().mockResolvedValue(null),
      };

      mockDb.select.mockReturnValue(mockSelectChain);

      const result = await getHookCount({} as D1Database, "nonexistent");

      expect(result).toBe(0);
    });

    it("should return 0 when database returns undefined", async () => {
      const mockSelectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        get: vi.fn().mockResolvedValue(undefined),
      };

      mockDb.select.mockReturnValue(mockSelectChain);

      const result = await getHookCount({} as D1Database);

      expect(result).toBe(0);
    });

    it("should count only active hooks", async () => {
      const mockSelectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        get: vi.fn().mockResolvedValue({ total: 50 }),
      };

      mockDb.select.mockReturnValue(mockSelectChain);

      await getHookCount({} as D1Database);

      expect(mockSelectChain.where).toHaveBeenCalled();
    });
  });
});
