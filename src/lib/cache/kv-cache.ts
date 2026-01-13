/**
 * Cloudflare Workers KV Cache Implementation
 * Provides high-performance caching with TTL and automatic invalidation
 */

// Cloudflare KV types
interface KVNamespace {
  get(key: string, type: string): Promise<string | null>;
  put(
    key: string,
    value: string,
    options?: { expirationTtl?: number },
  ): Promise<void>;
  delete(key: string): Promise<void>;
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  version: string;
}

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  version?: string; // Cache version for invalidation
  tags?: string[]; // Tags for group invalidation
}

export class KVCache {
  private kv: KVNamespace;
  private defaultTTL: number;

  constructor(kv: KVNamespace, defaultTTL = 300) {
    this.kv = kv;
    this.defaultTTL = defaultTTL;
  }

  /**
   * Get cached value with automatic expiration check
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const text = await this.kv.get(key, "text");
      if (!text) return null;

      const cached = JSON.parse(text) as CacheEntry<T>;
      if (!cached) return null;

      // Check expiration
      if (
        cached.timestamp &&
        Date.now() - cached.timestamp > this.defaultTTL * 1000
      ) {
        await this.delete(key);
        return null;
      }

      return cached.data;
    } catch (error) {
      console.error("Cache get error:", error);
      return null;
    }
  }

  /**
   * Set cached value with optional TTL override
   */
  async set<T>(
    key: string,
    data: T,
    options: CacheOptions = {},
  ): Promise<void> {
    const ttl = options.ttl ?? this.defaultTTL;
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      version: options.version ?? "v1",
    };

    try {
      // Store with TTL
      await this.kv.put(key, JSON.stringify(entry), {
        expirationTtl: ttl,
      });

      // Store tag associations for group invalidation
      if (options.tags && options.tags.length > 0) {
        await this.addTagsToKey(key, options.tags);
      }
    } catch (error) {
      console.error("Cache set error:", error);
    }
  }

  /**
   * Delete single cache entry
   */
  async delete(key: string): Promise<void> {
    try {
      await this.kv.delete(key);
      await this.removeTagsFromKey(key);
    } catch (error) {
      console.error("Cache delete error:", error);
    }
  }

  /**
   * Invalidate cache by tags
   */
  async invalidateByTag(tag: string): Promise<void> {
    try {
      const tagKey = `tag:${tag}`;
      const keys = await this.kv.get(tagKey, "json");
      if (Array.isArray(keys)) {
        await Promise.all(keys.map((key) => this.delete(key)));
      }
      await this.kv.delete(tagKey);
    } catch (error) {
      console.error("Cache invalidation error:", error);
    }
  }

  /**
   * Invalidate multiple tags
   */
  async invalidateByTags(tags: string[]): Promise<void> {
    await Promise.all(tags.map((tag) => this.invalidateByTag(tag)));
  }

  /**
   * Add key to tag sets for group invalidation
   */
  private async addTagsToKey(key: string, tags: string[]): Promise<void> {
    await Promise.all(
      tags.map(async (tag) => {
        const tagKey = `tag:${tag}`;
        const keys = await this.kv.get(tagKey, "json");
        const keyList: string[] = Array.isArray(keys) ? keys : [];
        if (!keyList.includes(key)) {
          keyList.push(key);
          await this.kv.put(tagKey, JSON.stringify(keyList));
        }
      }),
    );
  }

  /**
   * Remove key from all tag sets
   */
  private async removeTagsFromKey(key: string): Promise<void> {
    // List all tag keys and remove this key
    // Note: In production, you'd want to maintain a list of active tags
    try {
      const tagList = await this.kv.get("active_tags", "json");
      if (Array.isArray(tagList)) {
        await Promise.all(
          tagList.map(async (tag) => {
            const tagKey = `tag:${tag}`;
            const keys = await this.kv.get(tagKey, "json");
            if (Array.isArray(keys)) {
              const filtered = keys.filter((k) => k !== key);
              await this.kv.put(tagKey, JSON.stringify(filtered));
            }
          }),
        );
      }
    } catch (error) {
      console.error("Remove tags error:", error);
    }
  }

  /**
   * Cache warming - pre-populate cache with data
   */
  async warm<T>(
    entries: Array<{ key: string; data: T; options?: CacheOptions }>,
  ): Promise<void> {
    await Promise.all(
      entries.map((entry) => this.set(entry.key, entry.data, entry.options)),
    );
  }

  /**
   * Get or set pattern with factory function
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    options: CacheOptions = {},
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const data = await factory();
    await this.set(key, data, options);
    return data;
  }
}

/**
 * Cache key generators for consistent key naming
 */
export const CacheKeys = {
  hook: (id: string) => `hook:${id}` as const,
  hooks: (filters: string) => `hooks:${filters}` as const,
  hookById: (id: string) => `hook:byId:${id}` as const,
  categoryHooks: (category: string, page: number) =>
    `category:${category}:${page}` as const,
  categories: () => "categories:all" as const,
  ratingStats: (hookId: string) => `ratings:${hookId}` as const,
  userFavorites: (userId: string, page: number) =>
    `favorites:${userId}:${page}` as const,
  userFavoritesByCategory: (userId: string) =>
    `favorites:${userId}:byCategory` as const,
  userSession: (userId: string) => `session:${userId}` as const,
  apiResponse: (endpoint: string, params: string) =>
    `api:${endpoint}:${params}` as const,
};

/**
 * Cache tag generators for group invalidation
 */
export const CacheTags = {
  hooks: "hooks" as const,
  categories: "categories" as const,
  ratings: "ratings" as const,
  favorites: "favorites" as const,
  user: (userId: string) => `user:${userId}` as const,
};

/**
 * TTL presets (in seconds)
 */
export const CacheTTL = {
  SHORT: 60, // 1 minute
  MEDIUM: 300, // 5 minutes
  LONG: 3600, // 1 hour
  VERY_LONG: 86400, // 24 hours
};
