/**
 * Cache initialization and helper functions
 */

import { getBindings } from "../cloudflare";
import { KVCache, CacheTTL } from "./kv-cache";
// Hierarchical cache is available but not currently used
// import type { HierarchicalCache } from "./hierarchical-cache";

let cacheInstance: KVCache | null = null;

/**
 * Get or initialize the KV cache instance
 */
export function getCache(): KVCache | null {
  if (cacheInstance) {
    return cacheInstance;
  }

  const env = getBindings();

  // Check for cache binding - try multiple possible binding names
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cacheKV = (env as any).CACHE_KV || (env as any).NEXT_CACHE_KV;

  if (!cacheKV) {
    // Cache is optional - return null if not available
    return null;
  }

  cacheInstance = new KVCache(cacheKV, CacheTTL.MEDIUM);
  return cacheInstance;
}

/**
 * Reset cache instance (useful for testing)
 */
export function resetCache(): void {
  cacheInstance = null;
}

/**
 * Cache wrapper for async functions with automatic error handling
 */
export async function withCache<T>(
  key: string,
  factory: () => Promise<T>,
  ttl: number = CacheTTL.MEDIUM,
): Promise<T> {
  const cache = getCache();

  if (!cache) {
    // If cache is unavailable, just execute the factory
    return factory();
  }

  return cache.getOrSet(key, factory, { ttl });
}

/**
 * Invalidate cache entries by tags
 */
export async function invalidateCache(...tags: string[]): Promise<void> {
  const cache = getCache();
  if (!cache) return;

  await cache.invalidateByTags(tags);
}

// Hierarchical cache exports are available but not re-exported
// Import directly from ./hierarchical-cache if needed in the future
export { KVCache, CacheTTL, CacheKeys, CacheTags } from "./kv-cache";
