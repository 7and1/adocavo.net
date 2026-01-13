import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  withDbQuery,
  QueryTimeoutError,
  CircuitBreakerOpenError,
  DatabaseError,
  paginatedQuery,
  batchQuery,
} from "@/lib/db-utils";

describe("Database Utils", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe("withDbQuery", () => {
    it("should execute query successfully", async () => {
      const queryFn = vi.fn().mockResolvedValue({ data: "test" });
      const result = await withDbQuery("test_operation", queryFn);

      expect(result).toEqual({ data: "test" });
      expect(queryFn).toHaveBeenCalledTimes(1);
    });

    it("should timeout after specified duration", async () => {
      const queryFn = vi.fn(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve({ data: "test" }), 6000),
          ),
      );

      await expect(
        withDbQuery("slow_operation", queryFn, { timeout: 1000 }),
      ).rejects.toThrow(QueryTimeoutError);
    });

    it("should retry on failure", async () => {
      const queryFn = vi
        .fn()
        .mockImplementationOnce(async () => {
          throw new Error("Temporary failure");
        })
        .mockImplementationOnce(async () => {
          throw new Error("Temporary failure");
        })
        .mockResolvedValue({ data: "success" });

      const result = await withDbQuery("retry_operation", queryFn, {
        retries: 3,
      });

      expect(result).toEqual({ data: "success" });
      expect(queryFn).toHaveBeenCalledTimes(3);
    });

    it("should fail after max retries", async () => {
      const queryFn = vi.fn().mockImplementation(async () => {
        throw new Error("Persistent failure");
      });

      await expect(
        withDbQuery("fail_operation", queryFn, { retries: 2 }),
      ).rejects.toThrow(DatabaseError);

      expect(queryFn).toHaveBeenCalledTimes(3);
    });

    it("should open circuit breaker after threshold failures", async () => {
      const queryFn = vi.fn().mockImplementation(async () => {
        throw new Error("Service down");
      });

      for (let i = 0; i < 6; i++) {
        try {
          await withDbQuery("failing_operation", queryFn, { retries: 0 });
        } catch (e) {
          // Expected to fail
        }
      }

      await expect(withDbQuery("blocked_operation", queryFn)).rejects.toThrow(
        CircuitBreakerOpenError,
      );
    });
  });

  describe("paginatedQuery", () => {
    it("should return paginated results", async () => {
      const items = Array.from({ length: 50 }, (_, i) => ({ id: i }));

      const queryFn = async (limit: number, offset: number) => {
        return items.slice(offset, offset + limit);
      };

      const countFn = async () => items.length;

      const page1 = await paginatedQuery(queryFn, countFn, 1, 20);
      const page2 = await paginatedQuery(queryFn, countFn, 2, 20);
      const page3 = await paginatedQuery(queryFn, countFn, 3, 20);

      expect(page1.items.length).toBe(20);
      expect(page1.page).toBe(1);
      expect(page1.total).toBe(50);
      expect(page1.hasMore).toBe(true);

      expect(page2.items.length).toBe(20);
      expect(page2.page).toBe(2);
      expect(page2.hasMore).toBe(true);

      expect(page3.items.length).toBe(10);
      expect(page3.hasMore).toBe(false);
    });

    it("should validate and clamp limits", async () => {
      const queryFn = async () => [];
      const countFn = async () => 0;

      const result = await paginatedQuery(queryFn, countFn, 1, 200);

      expect(result.limit).toBe(100);
    });

    it("should validate page numbers", async () => {
      const queryFn = async () => [];
      const countFn = async () => 0;

      const result = await paginatedQuery(queryFn, countFn, 0, 20);

      expect(result.page).toBe(1);
    });
  });

  describe("batchQuery", () => {
    it("should process items in batches", async () => {
      const items = Array.from({ length: 25 }, (_, i) => i);
      const processed: number[][] = [];

      const queryFn = async (item: number) => {
        return new Promise<void>((resolve) => {
          setTimeout(() => {
            const lastIndex = processed.length - 1;
            if (lastIndex < 0 || processed[lastIndex].length >= 10) {
              processed.push([item]);
            } else {
              processed[lastIndex].push(item);
            }
            resolve();
          }, 10);
        });
      };

      await batchQuery(items, queryFn, { batchSize: 10, delayMs: 50 });

      expect(processed.length).toBe(3);
      expect(processed[0].length).toBe(10);
      expect(processed[1].length).toBe(10);
      expect(processed[2].length).toBe(5);
    });

    it("should handle empty arrays", async () => {
      const queryFn = vi.fn();

      await batchQuery([], queryFn);

      expect(queryFn).not.toHaveBeenCalled();
    });
  });
});
