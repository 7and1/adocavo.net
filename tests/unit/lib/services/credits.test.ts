import { describe, it, expect, vi, beforeEach } from "vitest";
import { getUserCredits } from "@/lib/services/credits";
import { createDb } from "@/lib/db";

vi.mock("@/lib/db", () => ({
  createDb: vi.fn(),
}));

describe("Credits Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getUserCredits", () => {
    it("should return user credits when user exists", async () => {
      const mockUser = { id: "user-1", credits: 5 };
      const mockDb = {
        query: {
          users: {
            findFirst: vi.fn().mockResolvedValue(mockUser),
          },
        },
      };

      vi.mocked(createDb).mockReturnValue(mockDb as any);

      const result = await getUserCredits({} as D1Database, "user-1");

      expect(result).toBe(5);
      expect(mockDb.query.users.findFirst).toHaveBeenCalledWith({
        where: expect.any(Object),
      });
    });

    it("should return 0 when user does not exist", async () => {
      const mockDb = {
        query: {
          users: {
            findFirst: vi.fn().mockResolvedValue(null),
          },
        },
      };

      vi.mocked(createDb).mockReturnValue(mockDb as any);

      const result = await getUserCredits({} as D1Database, "nonexistent-user");

      expect(result).toBe(0);
    });

    it("should return 0 when user exists but has no credits field", async () => {
      const mockDb = {
        query: {
          users: {
            findFirst: vi.fn().mockResolvedValue({ id: "user-1" }),
          },
        },
      };

      vi.mocked(createDb).mockReturnValue(mockDb as any);

      const result = await getUserCredits({} as D1Database, "user-1");

      expect(result).toBe(0);
    });

    it("should return 0 when credits field is null", async () => {
      const mockDb = {
        query: {
          users: {
            findFirst: vi
              .fn()
              .mockResolvedValue({ id: "user-1", credits: null }),
          },
        },
      };

      vi.mocked(createDb).mockReturnValue(mockDb as any);

      const result = await getUserCredits({} as D1Database, "user-1");

      expect(result).toBe(0);
    });

    it("should return 0 when credits field is undefined", async () => {
      const mockDb = {
        query: {
          users: {
            findFirst: vi
              .fn()
              .mockResolvedValue({ id: "user-1", credits: undefined }),
          },
        },
      };

      vi.mocked(createDb).mockReturnValue(mockDb as any);

      const result = await getUserCredits({} as D1Database, "user-1");

      expect(result).toBe(0);
    });

    it("should handle maximum credit value", async () => {
      const mockDb = {
        query: {
          users: {
            findFirst: vi
              .fn()
              .mockResolvedValue({ id: "user-1", credits: 999999 }),
          },
        },
      };

      vi.mocked(createDb).mockReturnValue(mockDb as any);

      const result = await getUserCredits({} as D1Database, "user-1");

      expect(result).toBe(999999);
    });

    it("should handle zero credits", async () => {
      const mockDb = {
        query: {
          users: {
            findFirst: vi.fn().mockResolvedValue({ id: "user-1", credits: 0 }),
          },
        },
      };

      vi.mocked(createDb).mockReturnValue(mockDb as any);

      const result = await getUserCredits({} as D1Database, "user-1");

      expect(result).toBe(0);
    });
  });
});
