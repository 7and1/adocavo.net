/**
 * Hierarchical Cache Implementation
 * L1 (Memory) -> L2 (Cache API) -> L3 (KV)
 *
 * Cache hierarchy:
 * - L1: In-memory cache (fastest, per-request)
 * - L2: Cloudflare Cache API (fast, distributed)
 * - L3: Cloudflare KV (slower, persistent)
 */

import { getKV } from "../cloudflare";

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

// Cache entry metadata
interface CacheMetadata<T> {
  data: T;
  timestamp: number;
  ttl: number;
  version: string;
  tags?: string[];
}

// L1 Memory cache entry
interface MemoryEntry<T> {
  data: T;
  expiresAt: number;
}

// Cache result with metadata
export interface CacheResult<T> {
  data: T;
  hit: boolean;
  layer?: "L1" | "L2" | "L3";
  stale?: boolean;
}

// Cache options
export interface HierarchicalCacheOptions {
  ttl?: number; // Default TTL in seconds
  version?: string; // Cache version for invalidation
  tags?: string[]; // Tags for group invalidation
  skipMemory?: boolean; // Skip L1 cache
  skipCacheAPI?: boolean; // Skip L2 cache
  forceRefresh?: boolean; // Force refresh from source
  staleWhileRevalidate?: number; // Serve stale while refreshing (seconds)
}

// Cache statistics
export interface CacheStats {
  l1Hits: number;
  l1Misses: number;
  l2Hits: number;
  l2Misses: number;
  l3Hits: number;
  l3Misses: number;
  sets: number;
  deletes: number;
  invalidations: number;
}

// Default TTL values
export const CacheTTL = {
  SHORT: 60, // 1 minute
  MEDIUM: 300, // 5 minutes
  LONG: 3600, // 1 hour
  VERY_LONG: 86400, // 24 hours
};

// L1: In-memory cache (process-scoped, reset between requests in production)
class MemoryCache {
  private cache = new Map<string, MemoryEntry<unknown>>();
  private maxSize = 100; // Max entries in memory cache

  get<T>(key: string): T | null {
    const entry = this.cache.get(key) as MemoryEntry<T> | undefined;
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  set<T>(key: string, data: T, ttl: number): void {
    // Evict oldest entry if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttl * 1000,
    });
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }
}

// L2: Cache API (Cloudflare's edge cache)
class CacheAPILayer {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private cache: Cache | null = null;

  constructor() {
    try {
      // @ts-expect-error - Cloudflare Workers specific
      this.cache = caches?.default || null;
    } catch {
      // Cache API not available
    }
  }

  async get<T>(request: Request): Promise<T | null> {
    if (!this.cache) return null;

    try {
      const response = await this.cache.match(request);
      if (!response) return null;

      const text = await response.text();
      const metadata = JSON.parse(text) as CacheMetadata<T>;

      // Check expiration
      if (Date.now() - metadata.timestamp > metadata.ttl * 1000) {
        await this.delete(request);
        return null;
      }

      return metadata.data;
    } catch {
      return null;
    }
  }

  async set<T>(
    request: Request,
    data: T,
    options: HierarchicalCacheOptions,
  ): Promise<void> {
    if (!this.cache) return;

    const ttl = options.ttl ?? CacheTTL.MEDIUM;
    const metadata: CacheMetadata<T> = {
      data,
      timestamp: Date.now(),
      ttl,
      version: options.version ?? "v1",
      tags: options.tags,
    };

    try {
      const response = new Response(JSON.stringify(metadata), {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": `public, max-age=${ttl}`,
        },
      });
      await this.cache.put(request, response);
    } catch (error) {
      console.warn("Cache API set failed:", error);
    }
  }

  async delete(request: Request): Promise<void> {
    if (!this.cache) return;
    try {
      await this.cache.delete(request);
    } catch (error) {
      console.warn("Cache API delete failed:", error);
    }
  }
}

// L3: KV cache (persistent, slower)
class KVCacheLayer {
  private kv: KVNamespace | null = null;

  constructor() {
    this.kv = getKV();
  }

  async get<T>(
    key: string,
  ): Promise<{ data: T; timestamp: number; ttl: number } | null> {
    if (!this.kv) return null;

    try {
      const text = await this.kv.get(key, "text");
      if (!text) return null;

      const cached = JSON.parse(text) as CacheMetadata<T>;
      if (!cached) return null;

      return {
        data: cached.data,
        timestamp: cached.timestamp,
        ttl: cached.ttl,
      };
    } catch {
      return null;
    }
  }

  async set<T>(
    key: string,
    data: T,
    options: HierarchicalCacheOptions,
  ): Promise<void> {
    if (!this.kv) return;

    const ttl = options.ttl ?? CacheTTL.MEDIUM;
    const metadata: CacheMetadata<T> = {
      data,
      timestamp: Date.now(),
      ttl,
      version: options.version ?? "v1",
      tags: options.tags,
    };

    try {
      await this.kv.put(key, JSON.stringify(metadata), {
        expirationTtl: ttl,
      });

      // Store tag associations
      if (options.tags && options.tags.length > 0) {
        await this.addTagsToKey(key, options.tags);
      }
    } catch (error) {
      console.warn("KV set failed:", error);
    }
  }

  async delete(key: string): Promise<void> {
    if (!this.kv) return;
    try {
      await this.kv.delete(key);
      await this.removeTagsFromKey(key);
    } catch (error) {
      console.warn("KV delete failed:", error);
    }
  }

  async invalidateByTag(tag: string): Promise<void> {
    if (!this.kv) return;
    try {
      const tagKey = `tag:${tag}`;
      const keys = await this.kv.get(tagKey, "json");
      if (Array.isArray(keys)) {
        await Promise.all(keys.map((key) => this.delete(key)));
      }
      await this.kv.delete(tagKey);
    } catch (error) {
      console.warn("KV invalidate by tag failed:", error);
    }
  }

  async invalidateByTags(tags: string[]): Promise<void> {
    await Promise.all(tags.map((tag) => this.invalidateByTag(tag)));
  }

  private async addTagsToKey(key: string, tags: string[]): Promise<void> {
    if (!this.kv) return;
    await Promise.all(
      tags.map(async (tag) => {
        const tagKey = `tag:${tag}`;
        const keys = await this.kv!.get(tagKey, "json");
        const keyList: string[] = Array.isArray(keys) ? keys : [];
        if (!keyList.includes(key)) {
          keyList.push(key);
          await this.kv!.put(tagKey, JSON.stringify(keyList));
        }
      }),
    );
  }

  private async removeTagsFromKey(key: string): Promise<void> {
    if (!this.kv) return;
    try {
      const tagList = await this.kv.get("active_tags", "json");
      if (Array.isArray(tagList)) {
        await Promise.all(
          tagList.map(async (tag) => {
            const tagKey = `tag:${tag}`;
            const keys = await this.kv!.get(tagKey, "json");
            if (Array.isArray(keys)) {
              const filtered = keys.filter((k) => k !== key);
              await this.kv!.put(tagKey, JSON.stringify(filtered));
            }
          }),
        );
      }
    } catch {
      // Silently fail - tags cleanup is best-effort
    }
  }
}

// Main hierarchical cache class
export class HierarchicalCache {
  private l1: MemoryCache;
  private l2: CacheAPILayer;
  private l3: KVCacheLayer;
  private baseUrl: string;

  constructor(baseUrl = "https://cache.internal") {
    this.l1 = new MemoryCache();
    this.l2 = new CacheAPILayer();
    this.l3 = new KVCacheLayer();
    this.baseUrl = baseUrl;
  }

  private createCacheRequest(key: string): Request {
    return new Request(`${this.baseUrl}/cache/${key}`, {
      method: "GET",
    });
  }

  /**
   * Get value from cache, checking all layers
   */
  async get<T>(
    key: string,
    options: HierarchicalCacheOptions = {},
  ): Promise<CacheResult<T>> {
    const { skipMemory = false, skipCacheAPI = false } = options;

    // Check L1: Memory cache
    if (!skipMemory) {
      const l1Data = this.l1.get<T>(key);
      if (l1Data !== null) {
        return { data: l1Data, hit: true, layer: "L1" };
      }
    }

    // Check L2: Cache API
    if (!skipCacheAPI) {
      const request = this.createCacheRequest(key);
      const l2Data = await this.l2.get<T>(request);
      if (l2Data !== null) {
        // Promote to L1
        const ttl = options.ttl ?? CacheTTL.MEDIUM;
        if (!skipMemory) {
          this.l1.set(key, l2Data, ttl);
        }
        return { data: l2Data, hit: true, layer: "L2" };
      }
    }

    // Check L3: KV cache
    const l3Result = await this.l3.get<T>(key);
    if (l3Result !== null) {
      // Check for stale while revalidate
      const age = (Date.now() - l3Result.timestamp) / 1000;
      const stale = age > l3Result.ttl;
      const swr = options.staleWhileRevalidate ?? 0;

      // Promote to L1 and L2
      const ttl = options.ttl ?? CacheTTL.MEDIUM;
      if (!skipMemory) {
        this.l1.set(key, l3Result.data, ttl);
      }
      if (!skipCacheAPI) {
        const request = this.createCacheRequest(key);
        await this.l2.set(request, l3Result.data, options);
      }

      // Return stale data if within SWR window
      if (stale && age < l3Result.ttl + swr) {
        return { data: l3Result.data, hit: true, layer: "L3", stale: true };
      }

      if (!stale) {
        return { data: l3Result.data, hit: true, layer: "L3" };
      }
    }

    return { data: null as unknown as T, hit: false };
  }

  /**
   * Set value in all cache layers
   */
  async set<T>(
    key: string,
    data: T,
    options: HierarchicalCacheOptions = {},
  ): Promise<void> {
    const ttl = options.ttl ?? CacheTTL.MEDIUM;

    // Set L1
    if (!options.skipMemory) {
      this.l1.set(key, data, ttl);
    }

    // Set L2
    if (!options.skipCacheAPI) {
      const request = this.createCacheRequest(key);
      await this.l2.set(request, data, options);
    }

    // Set L3
    await this.l3.set(key, data, options);
  }

  /**
   * Delete from all cache layers
   */
  async delete(
    key: string,
    options: HierarchicalCacheOptions = {},
  ): Promise<void> {
    // Delete L1
    if (!options.skipMemory) {
      this.l1.delete(key);
    }

    // Delete L2
    if (!options.skipCacheAPI) {
      const request = this.createCacheRequest(key);
      await this.l2.delete(request);
    }

    // Delete L3
    await this.l3.delete(key);
  }

  /**
   * Invalidate cache by tags
   */
  async invalidateByTags(tags: string[]): Promise<void> {
    await this.l3.invalidateByTags(tags);
    this.l1.clear(); // Clear L1 as it doesn't support tag invalidation
  }

  /**
   * Get or set with factory function
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    options: HierarchicalCacheOptions = {},
  ): Promise<T> {
    if (options.forceRefresh) {
      const data = await factory();
      await this.set(key, data, options);
      return data;
    }

    const result = await this.get<T>(key, options);
    if (result.hit && !result.stale) {
      return result.data;
    }

    // Fetch fresh data
    const data = await factory();
    await this.set(key, data, options);

    return data;
  }

  /**
   * Clear L1 cache (useful for testing or memory management)
   */
  clearL1(): void {
    this.l1.clear();
  }

  /**
   * Pre-warm cache with multiple entries
   */
  async warm<T>(
    entries: Array<{
      key: string;
      data: T;
      options?: HierarchicalCacheOptions;
    }>,
  ): Promise<void> {
    await Promise.all(
      entries.map((entry) => this.set(entry.key, entry.data, entry.options)),
    );
  }
}

// Singleton instance
let cacheInstance: HierarchicalCache | null = null;

export function getHierarchicalCache(): HierarchicalCache {
  if (!cacheInstance) {
    cacheInstance = new HierarchicalCache();
  }
  return cacheInstance;
}

export function resetHierarchicalCache(): void {
  cacheInstance = null;
}

/**
 * Cache wrapper for async functions
 */
export async function withHierarchicalCache<T>(
  key: string,
  factory: () => Promise<T>,
  options: HierarchicalCacheOptions = {},
): Promise<T> {
  const cache = getHierarchicalCache();
  return cache.getOrSet(key, factory, options);
}
