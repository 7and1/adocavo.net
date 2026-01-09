import { describe, it, expect, vi, beforeEach } from "vitest";
import { RatingService, createRatingService } from "@/lib/services/ratings";
import { createDb } from "@/lib/db";
import { scriptRatings, generatedScripts, hooks } from "@/lib/schema";

vi.mock("@/lib/db", () => ({
  createDb: vi.fn(),
}));

vi.mock("nanoid", () => ({
  nanoid: vi.fn(() => "test-rating-id"),
}));

describe("RatingService", () => {
  let mockDb: any;
  let service: RatingService;

  beforeEach(() => {
    vi.clearAllMocks();

    mockDb = {
      query: {
        scriptRatings: {
          findFirst: vi.fn(),
          findMany: vi.fn(),
        },
      },
      select: vi.fn(),
      insert: vi.fn(),
      update: vi.fn(),
    };

    service = new RatingService(mockDb);
  });

  describe("rateScript", () => {
    it("should add a new rating with valid data", async () => {
      const input = {
        generatedScriptId: "script-1",
        userId: "user-1",
        scriptIndex: 0,
        rating: 5,
        isHelpful: true,
        feedback: "Great script!",
      };

      mockDb.query.scriptRatings.findFirst.mockResolvedValue(null);
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      });

      const result = await service.rateScript(input);

      expect(result.id).toBe("test-rating-id");
      expect(mockDb.insert).toHaveBeenCalledWith(scriptRatings);
    });

    it("should update existing rating for user/script combination", async () => {
      const input = {
        generatedScriptId: "script-1",
        userId: "user-1",
        scriptIndex: 0,
        rating: 4,
      };

      const existingRating = { id: "existing-rating-id" };
      mockDb.query.scriptRatings.findFirst.mockResolvedValue(existingRating);
      mockDb.update.mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });

      const result = await service.rateScript(input);

      expect(result.id).toBe("existing-rating-id");
      expect(mockDb.update).toHaveBeenCalledWith(scriptRatings);
    });

    it("should allow rating without userId", async () => {
      const input = {
        generatedScriptId: "script-1",
        userId: null,
        scriptIndex: 0,
        rating: 5,
      };

      mockDb.query.scriptRatings.findFirst.mockResolvedValue(null);
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      });

      const result = await service.rateScript(input);

      expect(result.id).toBe("test-rating-id");
    });

    it("should default isHelpful to true when not provided", async () => {
      const input = {
        generatedScriptId: "script-1",
        userId: "user-1",
        scriptIndex: 0,
        rating: 5,
      };

      mockDb.query.scriptRatings.findFirst.mockResolvedValue(null);
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      });

      await service.rateScript(input);

      const insertCall = mockDb.insert().values;
      expect(insertCall).toHaveBeenCalled();
    });

    it("should handle null feedback", async () => {
      const input = {
        generatedScriptId: "script-1",
        userId: "user-1",
        scriptIndex: 0,
        rating: 5,
        feedback: null,
      };

      mockDb.query.scriptRatings.findFirst.mockResolvedValue(null);
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      });

      const result = await service.rateScript(input);

      expect(result.id).toBe("test-rating-id");
    });

    describe("validation", () => {
      it("should throw error for rating below 1", async () => {
        const input = {
          generatedScriptId: "script-1",
          userId: "user-1",
          scriptIndex: 0,
          rating: 0,
        };

        await expect(service.rateScript(input)).rejects.toThrow(
          "Rating must be between 1 and 5",
        );
      });

      it("should throw error for rating above 5", async () => {
        const input = {
          generatedScriptId: "script-1",
          userId: "user-1",
          scriptIndex: 0,
          rating: 6,
        };

        await expect(service.rateScript(input)).rejects.toThrow(
          "Rating must be between 1 and 5",
        );
      });

      it("should throw error for negative rating", async () => {
        const input = {
          generatedScriptId: "script-1",
          userId: "user-1",
          scriptIndex: 0,
          rating: -1,
        };

        await expect(service.rateScript(input)).rejects.toThrow(
          "Rating must be between 1 and 5",
        );
      });

      it("should accept rating of 1", async () => {
        const input = {
          generatedScriptId: "script-1",
          userId: "user-1",
          scriptIndex: 0,
          rating: 1,
        };

        mockDb.query.scriptRatings.findFirst.mockResolvedValue(null);
        mockDb.insert.mockReturnValue({
          values: vi.fn().mockResolvedValue(undefined),
        });

        const result = await service.rateScript(input);

        expect(result.id).toBe("test-rating-id");
      });

      it("should accept rating of 5", async () => {
        const input = {
          generatedScriptId: "script-1",
          userId: "user-1",
          scriptIndex: 0,
          rating: 5,
        };

        mockDb.query.scriptRatings.findFirst.mockResolvedValue(null);
        mockDb.insert.mockReturnValue({
          values: vi.fn().mockResolvedValue(undefined),
        });

        const result = await service.rateScript(input);

        expect(result.id).toBe("test-rating-id");
      });
    });

    describe("edge cases", () => {
      it("should handle float ratings (converts to number)", async () => {
        const input = {
          generatedScriptId: "script-1",
          userId: "user-1",
          scriptIndex: 0,
          rating: 4.5,
        };

        mockDb.query.scriptRatings.findFirst.mockResolvedValue(null);
        mockDb.insert.mockReturnValue({
          values: vi.fn().mockResolvedValue(undefined),
        });

        const result = await service.rateScript(input);

        expect(result.id).toBe("test-rating-id");
      });

      it("should handle maximum feedback length", async () => {
        const longFeedback = "x".repeat(1000);
        const input = {
          generatedScriptId: "script-1",
          userId: "user-1",
          scriptIndex: 0,
          rating: 5,
          feedback: longFeedback,
        };

        mockDb.query.scriptRatings.findFirst.mockResolvedValue(null);
        mockDb.insert.mockReturnValue({
          values: vi.fn().mockResolvedValue(undefined),
        });

        const result = await service.rateScript(input);

        expect(result.id).toBe("test-rating-id");
      });
    });
  });

  describe("getScriptStats", () => {
    it("should return stats for script with ratings", async () => {
      const mockStats = [
        {
          averageRating: 4.5,
          totalRatings: 10,
          helpfulCount: 8,
        },
      ];

      const mockByIndex = [
        { scriptIndex: 0, averageRating: 4.8, count: 5 },
        { scriptIndex: 1, averageRating: 4.2, count: 3 },
        { scriptIndex: 2, averageRating: 4.5, count: 2 },
      ];

      const selectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(mockStats),
      };

      const selectChainByIndex = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        groupBy: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue(mockByIndex),
      };

      mockDb.select
        .mockReturnValueOnce(selectChain as any)
        .mockReturnValueOnce(selectChainByIndex as any);

      const result = await service.getScriptStats("script-1");

      expect(result).toEqual({
        averageRating: 4.5,
        totalRatings: 10,
        helpfulCount: 8,
        scriptIndexStats: mockByIndex,
      });
    });

    it("should return zeros for script with no ratings", async () => {
      const selectChain1 = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([{}]),
      };
      const selectChain2 = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        groupBy: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue([]),
      };

      mockDb.select
        .mockReturnValueOnce(selectChain1 as any)
        .mockReturnValueOnce(selectChain2 as any);

      const result = await service.getScriptStats("script-1");

      expect(result.averageRating).toBe(0);
      expect(result.totalRatings).toBe(0);
      expect(result.helpfulCount).toBe(0);
    });

    it("should calculate correct average rating", async () => {
      const mockStats = [
        {
          averageRating: 3.7,
          totalRatings: 5,
          helpfulCount: 4,
        },
      ];

      const selectChain1 = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(mockStats),
      };
      const selectChain2 = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        groupBy: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue([]),
      };

      mockDb.select
        .mockReturnValueOnce(selectChain1 as any)
        .mockReturnValueOnce(selectChain2 as any);

      const result = await service.getScriptStats("script-1");

      expect(result.averageRating).toBe(3.7);
    });

    it("should get stats by script index", async () => {
      const mockByIndex = [
        { scriptIndex: 0, averageRating: 5, count: 1 },
        { scriptIndex: 1, averageRating: 4, count: 1 },
      ];

      const selectChain1 = {
        from: vi.fn().mockReturnThis(),
        where: vi
          .fn()
          .mockResolvedValue([
            { averageRating: 4.5, totalRatings: 2, helpfulCount: 2 },
          ]),
      };
      const selectChain2 = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        groupBy: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue(mockByIndex),
      };

      mockDb.select
        .mockReturnValueOnce(selectChain1 as any)
        .mockReturnValueOnce(selectChain2 as any);

      const result = await service.getScriptStats("script-1");

      expect(result.scriptIndexStats).toEqual(mockByIndex);
    });
  });

  describe("getUserRating", () => {
    it("should return user rating when exists", async () => {
      const mockRating = {
        rating: 5,
        isHelpful: true,
      };

      mockDb.query.scriptRatings.findFirst.mockResolvedValue(mockRating);

      const result = await service.getUserRating("script-1", "user-1", 0);

      expect(result).toEqual({ rating: 5, isHelpful: true });
    });

    it("should return null when user has not rated", async () => {
      mockDb.query.scriptRatings.findFirst.mockResolvedValue(null);

      const result = await service.getUserRating("script-1", "user-1", 0);

      expect(result).toBeNull();
    });

    it("should query with correct parameters", async () => {
      mockDb.query.scriptRatings.findFirst.mockResolvedValue(null);

      await service.getUserRating("script-1", "user-1", 2);

      expect(mockDb.query.scriptRatings.findFirst).toHaveBeenCalledWith({
        where: expect.any(Object),
      });
    });

    it("should handle isHelpful being null", async () => {
      const mockRating = {
        rating: 4,
        isHelpful: null,
      };

      mockDb.query.scriptRatings.findFirst.mockResolvedValue(mockRating);

      const result = await service.getUserRating("script-1", "user-1", 0);

      expect(result).toEqual({ rating: 4, isHelpful: true });
    });
  });

  describe("getTopRatedScripts", () => {
    it("should return top rated scripts", async () => {
      const mockResults = [
        {
          id: "script-1",
          hookText: "Hook 1",
          productDescription: "Product 1",
          averageRating: 5,
          ratingCount: 10,
        },
        {
          id: "script-2",
          hookText: "Hook 2",
          productDescription: "Product 2",
          averageRating: 4.5,
          ratingCount: 8,
        },
      ];

      const selectChain = {
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        groupBy: vi.fn().mockReturnThis(),
        having: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue(mockResults),
      };

      mockDb.select.mockReturnValue(selectChain as any);

      const result = await service.getTopRatedScripts(10);

      expect(result).toHaveLength(2);
      expect(result[0].averageRating).toBe(5);
    });

    it("should use default limit of 10", async () => {
      const selectChain = {
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        groupBy: vi.fn().mockReturnThis(),
        having: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      };

      mockDb.select.mockReturnValue(selectChain as any);

      await service.getTopRatedScripts();

      expect(selectChain.limit).toHaveBeenCalledWith(10);
    });

    it("should respect custom limit", async () => {
      const selectChain = {
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        groupBy: vi.fn().mockReturnThis(),
        having: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      };

      mockDb.select.mockReturnValue(selectChain as any);

      await service.getTopRatedScripts(5);

      expect(selectChain.limit).toHaveBeenCalledWith(5);
    });

    it("should filter by minimum rating of 4", async () => {
      const selectChain = {
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        groupBy: vi.fn().mockReturnThis(),
        having: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      };

      mockDb.select.mockReturnValue(selectChain as any);

      await service.getTopRatedScripts();

      expect(selectChain.having).toHaveBeenCalled();
    });

    it("should return empty array when no scripts meet criteria", async () => {
      const selectChain = {
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        groupBy: vi.fn().mockReturnThis(),
        having: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      };

      mockDb.select.mockReturnValue(selectChain as any);

      const result = await service.getTopRatedScripts();

      expect(result).toEqual([]);
    });
  });
});

describe("createRatingService", () => {
  it("should create RatingService with database instance", async () => {
    const mockD1 = {} as D1Database;
    const mockDbInstance = {};

    vi.mocked(createDb).mockReturnValue(mockDbInstance as any);

    const service = await createRatingService(mockD1);

    expect(service).toBeInstanceOf(RatingService);
    expect(createDb).toHaveBeenCalledWith(mockD1);
  });
});
