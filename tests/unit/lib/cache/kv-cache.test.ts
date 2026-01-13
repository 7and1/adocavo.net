import { describe, it, expect, vi, beforeEach } from "vitest";
import { KVCache, CacheTTL, CacheKeys, CacheTags } from "@/lib/cache/kv-cache";

describe("KVCache", () => {
  let mockKV: KVNamespace;
  let cache: KVCache;

  beforeEach(() => {
    vi.clearAllMocks();

    mockKV = {
      get: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      list: vi.fn(),
    } as unknown as KVNamespace;

    cache = new KVCache(mockKV, 300);
  });

  describe("get", () => {
    it("should return cached data when entry exists and is valid", async () => {
      const mockData = { foo: "bar" };
      const mockEntry = {
        data: mockData,
        timestamp: Date.now(),
        version: "v1",
      };

      vi.mocked(mockKV.get).mockResolvedValue(JSON.stringify(mockEntry));

      const result = await cache.get("test-key");

      expect(result).toEqual(mockData);
      expect(mockKV.get).toHaveBeenCalledWith("test-key", "text");
    });

    it("should return null when entry does not exist", async () => {
      vi.mocked(mockKV.get).mockResolvedValue(null);

      const result = await cache.get("nonexistent-key");

      expect(result).toBeNull();
    });

    it("should return null and delete entry when TTL has expired", async () => {
      const expiredEntry = {
        data: { foo: "bar" },
        timestamp: Date.now() - 400 * 1000, // 400 seconds ago
        version: "v1",
      };

      vi.mocked(mockKV.get).mockResolvedValue(JSON.stringify(expiredEntry));
      vi.mocked(mockKV.delete).mockResolvedValue(undefined);

      const result = await cache.get("expired-key");

      expect(result).toBeNull();
      expect(mockKV.delete).toHaveBeenCalledWith("expired-key");
    });

    it("should return null on KV get error", async () => {
      vi.mocked(mockKV.get).mockImplementation(async () => {
        throw new Error("KV connection failed");
      });

      const result = await cache.get("error-key");

      expect(result).toBeNull();
    });

    it("should handle entry without timestamp", async () => {
      const mockEntry = {
        data: { foo: "bar" },
        timestamp: undefined as unknown as number,
        version: "v1",
      };

      vi.mocked(mockKV.get).mockResolvedValue(JSON.stringify(mockEntry));

      const result = await cache.get("no-timestamp-key");

      expect(result).toEqual({ foo: "bar" });
    });
  });

  describe("set", () => {
    it("should store data with default TTL", async () => {
      vi.mocked(mockKV.put).mockResolvedValue(undefined);
      vi.mocked(mockKV.get).mockResolvedValue([]);

      await cache.set("test-key", { data: "value" });

      expect(mockKV.put).toHaveBeenCalledWith(
        "test-key",
        expect.stringContaining('"data":"value"'),
        { expirationTtl: 300 },
      );
    });

    it("should store data with custom TTL", async () => {
      vi.mocked(mockKV.put).mockResolvedValue(undefined);
      vi.mocked(mockKV.get).mockResolvedValue([]);

      await cache.set("test-key", { data: "value" }, { ttl: 600 });

      expect(mockKV.put).toHaveBeenCalledWith(
        "test-key",
        expect.stringContaining('"data":{"data":"value"}'),
        { expirationTtl: 600 },
      );
    });

    it("should store data with custom version", async () => {
      vi.mocked(mockKV.put).mockResolvedValue(undefined);
      vi.mocked(mockKV.get).mockResolvedValue([]);

      await cache.set("test-key", { data: "value" }, { version: "v2" });

      const putCall = vi.mocked(mockKV.put).mock.calls[0];
      const storedEntry = JSON.parse(putCall[1]);

      expect(storedEntry.version).toBe("v2");
    });

    it("should store tag associations when tags provided", async () => {
      vi.mocked(mockKV.put).mockResolvedValue(undefined);
      vi.mocked(mockKV.get).mockResolvedValue([]);

      await cache.set(
        "test-key",
        { data: "value" },
        { tags: ["hooks", "user:123"] },
      );

      expect(mockKV.put).toHaveBeenCalledTimes(2); // entry + 1 tag (first one)
    });

    it("should not store tags when empty array provided", async () => {
      vi.mocked(mockKV.put).mockResolvedValue(undefined);

      await cache.set("test-key", { data: "value" }, { tags: [] });

      expect(mockKV.put).toHaveBeenCalledTimes(1);
    });

    it("should handle put error gracefully", async () => {
      vi.mocked(mockKV.put).mockImplementation(async () => {
        throw new Error("KV write failed");
      });

      await expect(
        cache.set("test-key", { data: "value" }),
      ).resolves.not.toThrow();
    });

    it("should append key to existing tag list", async () => {
      vi.mocked(mockKV.put).mockResolvedValue(undefined);
      vi.mocked(mockKV.get)
        .mockResolvedValueOnce(["existing-key"])
        .mockResolvedValueOnce([]);

      await cache.set("new-key", { data: "value" }, { tags: ["hooks"] });

      const putCalls = vi.mocked(mockKV.put).mock.calls;
      const tagPutCall = putCalls.find((call) => call[0] === "tag:hooks");
      const tagData = JSON.parse(tagPutCall![1]);

      expect(tagData).toEqual(["existing-key", "new-key"]);
    });
  });

  describe("delete", () => {
    it("should delete entry from KV", async () => {
      vi.mocked(mockKV.delete).mockResolvedValue(undefined);
      vi.mocked(mockKV.get).mockResolvedValue([]);

      await cache.delete("test-key");

      expect(mockKV.delete).toHaveBeenCalledWith("test-key");
    });

    it("should handle delete error gracefully", async () => {
      vi.mocked(mockKV.delete).mockImplementation(async () => {
        throw new Error("KV delete failed");
      });

      await expect(cache.delete("test-key")).resolves.not.toThrow();
    });
  });

  describe("invalidateByTag", () => {
    it("should delete all keys associated with tag", async () => {
      const keys = ["key1", "key2", "key3"];
      // Mock get to return keys first, then empty array for removeTagsFromKey
      vi.mocked(mockKV.get)
        .mockResolvedValueOnce(keys)
        .mockResolvedValueOnce([])
        .mockResolvedValue([]);
      vi.mocked(mockKV.delete).mockResolvedValue(undefined);

      await cache.invalidateByTag("hooks");

      expect(mockKV.get).toHaveBeenCalledWith("tag:hooks", "json");
      expect(mockKV.delete).toHaveBeenCalledWith("key1");
      expect(mockKV.delete).toHaveBeenCalledWith("key2");
      expect(mockKV.delete).toHaveBeenCalledWith("key3");
      expect(mockKV.delete).toHaveBeenCalledWith("tag:hooks");
    });

    it("should handle non-existent tag", async () => {
      vi.mocked(mockKV.get).mockResolvedValue(null);

      await cache.invalidateByTag("nonexistent");

      expect(mockKV.delete).toHaveBeenCalledWith("tag:nonexistent");
    });

    it("should handle tag invalidation error gracefully", async () => {
      vi.mocked(mockKV.get).mockImplementation(async () => {
        throw new Error("KV error");
      });

      await expect(cache.invalidateByTag("hooks")).resolves.not.toThrow();
    });

    it("should handle empty key list", async () => {
      vi.mocked(mockKV.get).mockResolvedValue([]);

      await cache.invalidateByTag("empty-tag");

      expect(mockKV.delete).toHaveBeenCalledWith("tag:empty-tag");
    });
  });

  describe("invalidateByTags", () => {
    it("should invalidate multiple tags in parallel", async () => {
      const keys1 = ["key1", "key2"];
      const keys2 = ["key3"];
      vi.mocked(mockKV.get)
        .mockResolvedValueOnce(keys1)
        .mockResolvedValueOnce(keys2)
        .mockResolvedValue([]);
      vi.mocked(mockKV.delete).mockResolvedValue(undefined);

      await cache.invalidateByTags(["hooks", "favorites"]);

      expect(mockKV.delete).toHaveBeenCalledWith("key1");
      expect(mockKV.delete).toHaveBeenCalledWith("key2");
      expect(mockKV.delete).toHaveBeenCalledWith("key3");
      expect(mockKV.delete).toHaveBeenCalledWith("tag:hooks");
      expect(mockKV.delete).toHaveBeenCalledWith("tag:favorites");
    });
  });

  describe("warm", () => {
    it("should pre-populate cache with multiple entries", async () => {
      vi.mocked(mockKV.put).mockResolvedValue(undefined);
      vi.mocked(mockKV.get).mockResolvedValue([]);

      const entries = [
        { key: "key1", data: { value: 1 } },
        { key: "key2", data: { value: 2 }, options: { ttl: 600 } },
        { key: "key3", data: { value: 3 } },
      ];

      await cache.warm(entries);

      expect(mockKV.put).toHaveBeenCalledTimes(3);
      expect(mockKV.put).toHaveBeenCalledWith("key1", expect.any(String), {
        expirationTtl: 300,
      });
      expect(mockKV.put).toHaveBeenCalledWith("key2", expect.any(String), {
        expirationTtl: 600,
      });
    });

    it("should handle errors during warming", async () => {
      vi.mocked(mockKV.put)
        .mockResolvedValueOnce(undefined)
        .mockImplementationOnce(async () => {
          throw new Error("KV error");
        })
        .mockResolvedValueOnce(undefined);
      vi.mocked(mockKV.get).mockResolvedValue([]);

      const entries = [
        { key: "key1", data: { value: 1 } },
        { key: "key2", data: { value: 2 } },
        { key: "key3", data: { value: 3 } },
      ];

      await expect(cache.warm(entries)).resolves.not.toThrow();
    });
  });

  describe("getOrSet", () => {
    it("should return cached value when exists", async () => {
      const mockData = { cached: true };
      const mockEntry = {
        data: mockData,
        timestamp: Date.now(),
        version: "v1",
      };

      vi.mocked(mockKV.get).mockResolvedValue(JSON.stringify(mockEntry));

      const factory = vi.fn().mockResolvedValue({ fresh: true });
      const result = await cache.getOrSet("test-key", factory);

      expect(result).toEqual(mockData);
      expect(factory).not.toHaveBeenCalled();
    });

    it("should call factory and cache result when entry not exists", async () => {
      const freshData = { fresh: true };
      // First call returns null (not cached), second call returns empty array (for tags)
      vi.mocked(mockKV.get)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce([]);
      vi.mocked(mockKV.put).mockResolvedValue(undefined);

      const factory = vi.fn().mockResolvedValue(freshData);
      const result = await cache.getOrSet("test-key", factory);

      expect(result).toEqual(freshData);
      expect(factory).toHaveBeenCalled();
      expect(mockKV.put).toHaveBeenCalled();
    });

    it("should pass options to set when factory called", async () => {
      vi.mocked(mockKV.get).mockResolvedValue(null);
      vi.mocked(mockKV.put).mockResolvedValue(undefined);
      vi.mocked(mockKV.get).mockResolvedValue([]);

      const factory = vi.fn().mockResolvedValue({ data: "value" });
      const options = { ttl: 600, tags: ["test"] };

      await cache.getOrSet("test-key", factory, options);

      expect(mockKV.put).toHaveBeenCalledWith("test-key", expect.any(String), {
        expirationTtl: 600,
      });
    });
  });

  describe("edge cases", () => {
    it("should handle storing complex nested objects", async () => {
      vi.mocked(mockKV.put).mockResolvedValue(undefined);
      vi.mocked(mockKV.get).mockResolvedValue([]);

      const complexData = {
        nested: {
          deeply: {
            value: [1, 2, 3],
          },
        },
        array: [{ a: 1 }, { b: 2 }],
      };

      await cache.set("complex-key", complexData);

      const putCall = vi.mocked(mockKV.put).mock.calls[0];
      const storedEntry = JSON.parse(putCall[1]);

      expect(storedEntry.data).toEqual(complexData);
    });

    it("should handle TTL of 0 (no expiration)", async () => {
      vi.mocked(mockKV.put).mockResolvedValue(undefined);
      vi.mocked(mockKV.get).mockResolvedValue([]);

      await cache.set("test-key", { data: "value" }, { ttl: 0 });

      const putCall = vi.mocked(mockKV.put).mock.calls[0];

      expect(putCall[2]).toEqual({ expirationTtl: 0 });
    });

    it("should handle very large data sets", async () => {
      vi.mocked(mockKV.put).mockResolvedValue(undefined);
      vi.mocked(mockKV.get).mockResolvedValue([]);

      const largeData = {
        items: Array.from({ length: 1000 }, (_, i) => ({
          id: i,
          value: `item-${i}`,
        })),
      };

      await cache.set("large-key", largeData);

      expect(mockKV.put).toHaveBeenCalled();
    });
  });
});

describe("CacheKeys", () => {
  it("should generate hook key", () => {
    expect(CacheKeys.hook("hook-123")).toBe("hook:hook-123");
  });

  it("should generate hooks filter key", () => {
    expect(CacheKeys.hooks("category:ecommerce")).toBe(
      "hooks:category:ecommerce",
    );
  });

  it("should generate hook by id key", () => {
    expect(CacheKeys.hookById("abc-123")).toBe("hook:byId:abc-123");
  });

  it("should generate category hooks key", () => {
    expect(CacheKeys.categoryHooks("ecommerce", 2)).toBe(
      "category:ecommerce:2",
    );
  });

  it("should generate categories key", () => {
    expect(CacheKeys.categories()).toBe("categories:all");
  });

  it("should generate rating stats key", () => {
    expect(CacheKeys.ratingStats("hook-456")).toBe("ratings:hook-456");
  });

  it("should generate user favorites key", () => {
    expect(CacheKeys.userFavorites("user-789", 1)).toBe("favorites:user-789:1");
  });

  it("should generate user session key", () => {
    expect(CacheKeys.userSession("session-abc")).toBe("session:session-abc");
  });

  it("should generate API response key", () => {
    expect(CacheKeys.apiResponse("/api/hooks", "page=1")).toBe(
      "api:/api/hooks:page=1",
    );
  });
});

describe("CacheTags", () => {
  it("should have hooks tag", () => {
    expect(CacheTags.hooks).toBe("hooks");
  });

  it("should have categories tag", () => {
    expect(CacheTags.categories).toBe("categories");
  });

  it("should have ratings tag", () => {
    expect(CacheTags.ratings).toBe("ratings");
  });

  it("should have favorites tag", () => {
    expect(CacheTags.favorites).toBe("favorites");
  });

  it("should generate user-specific tag", () => {
    expect(CacheTags.user("user-123")).toBe("user:user-123");
  });
});

describe("CacheTTL", () => {
  it("should have SHORT TTL of 60 seconds", () => {
    expect(CacheTTL.SHORT).toBe(60);
  });

  it("should have MEDIUM TTL of 300 seconds", () => {
    expect(CacheTTL.MEDIUM).toBe(300);
  });

  it("should have LONG TTL of 3600 seconds", () => {
    expect(CacheTTL.LONG).toBe(3600);
  });

  it("should have VERY_LONG TTL of 86400 seconds", () => {
    expect(CacheTTL.VERY_LONG).toBe(86400);
  });
});
