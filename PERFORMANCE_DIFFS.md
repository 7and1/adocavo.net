# Performance Optimization - Code Changes

## Table of Contents

- [KV Cache Implementation](#kv-cache-implementation)
- [Hooks Service Optimization](#hooks-service-optimization)
- [Ratings Service Optimization](#ratings-service-optimization)
- [Favorites Service Optimization](#favorites-service-optimization)
- [Image Configuration](#image-configuration)
- [Cache Headers](#cache-headers)

---

## KV Cache Implementation

### NEW FILE: `src/lib/cache/kv-cache.ts`

**Before**: No caching layer

```typescript
// No caching existed
```

**After**: Full KV cache with TTL and tags

```typescript
export class KVCache {
  constructor(kv: KVNamespace, defaultTTL = 300) {
    this.kv = kv;
    this.defaultTTL = defaultTTL;
  }

  async get<T>(key: string): Promise<T | null> {
    const cached = await this.kv.get<CacheEntry<T>>(key, "json");
    if (!cached) return null;

    // Check expiration
    if (Date.now() - cached.timestamp > this.defaultTTL * 1000) {
      await this.delete(key);
      return null;
    }

    return cached.data;
  }

  async set<T>(key: string, data: T, options: CacheOptions = {}) {
    const ttl = options.ttl ?? this.defaultTTL;
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      version: options.version ?? "v1",
    };

    await this.kv.put(key, JSON.stringify(entry), {
      expirationTtl: ttl,
    });

    if (options.tags) {
      await this.addTagsToKey(key, options.tags);
    }
  }

  async invalidateByTag(tag: string) {
    const tagKey = `tag:${tag}`;
    const keys = await this.kv.get(tagKey, "json");
    if (Array.isArray(keys)) {
      await Promise.all(keys.map((key) => this.delete(key)));
    }
  }
}
```

---

## Hooks Service Optimization

### FILE: `src/lib/services/hooks.ts`

**Before**: No caching

```typescript
export async function getHooks(d1: D1Database, filters: HookFilters = {}) {
  const db = createDb(d1);
  // Direct query every time
  const result = await db.query.hooks.findMany({
    where: whereClauses,
    orderBy: [desc(hooks.engagementScore)],
    limit,
    offset,
  });
  return result;
}
```

**After**: With caching

```typescript
export async function getHooks(d1: D1Database, filters: HookFilters = {}) {
  const { category, search, page = 1, limit = 20 } = filters;

  // Create cache key from filters
  const cacheKey = CacheKeys.hooks(
    JSON.stringify({ category, search, page, limit }),
  );

  return withCache(
    cacheKey,
    async () => {
      const db = createDb(d1);
      const offset = (page - 1) * limit;
      // ... query logic
      return result;
    },
    CacheTTL.MEDIUM,
  ); // 5 minutes
}
```

**NEW**: Batch loading to prevent N+1

```typescript
export async function getHooksByIds(
  d1: D1Database,
  ids: string[],
): Promise<Hook[]> {
  if (ids.length === 0) return [];

  const db = createDb(d1);

  return db.query.hooks.findMany({
    where: and(
      eq(hooks.isActive, true),
      inArray(hooks.id, ids), // Single query for all IDs
    ),
  });
}
```

---

## Ratings Service Optimization

### FILE: `src/lib/services/ratings.ts`

**Before**: Individual queries, no caching

```typescript
async getHookRatingStats(hookId: string): Promise<{...}> {
  const stats = await this.db
    .select({...})
    .from(scriptRatings)
    .innerJoin(generatedScripts, ...)
    .where(eq(generatedScripts.hookId, hookId));

  return {
    averageRating: stats[0]?.averageRating || 0,
    totalRatings: stats[0]?.totalRatings || 0,
  };
}
```

**After**: With caching

```typescript
async getHookRatingStats(hookId: string): Promise<{...}> {
  const cacheKey = CacheKeys.ratingStats(hookId);

  return withCache(cacheKey, async () => {
    const stats = await this.db
      .select({...})
      .from(scriptRatings)
      .innerJoin(generatedScripts, ...)
      .where(eq(generatedScripts.hookId, hookId));

    return {
      averageRating: stats[0]?.averageRating || 0,
      totalRatings: stats[0]?.totalRatings || 0,
    };
  }, CacheTTL.MEDIUM); // 5 minutes
}
```

**NEW**: Batch method for N+1 elimination

```typescript
async getBatchHookRatingStats(hookIds: string[]): Promise<Map<string, {...}>> {
  if (hookIds.length === 0) return new Map();

  const results = await this.db
    .select({
      hookId: hooks.id,
      averageRating: avg(scriptRatings.rating).mapWith(Number),
      totalRatings: count(scriptRatings.id).mapWith(Number),
    })
    .from(scriptRatings)
    .innerJoin(generatedScripts, eq(scriptRatings.generatedScriptId, generatedScripts.id))
    .innerJoin(hooks, eq(generatedScripts.hookId, hooks.id))
    .where(inArray(hooks.id, hookIds))  // Single query!
    .groupBy(hooks.id);

  return new Map(results.map((r) => [r.hookId, {...}]));
}
```

**Usage comparison**:

```typescript
// Before: N queries
for (const hook of hooks) {
  const stats = await getHookRatingStats(hook.id); // Query!
}

// After: 1 query
const statsMap = await getBatchHookRatingStats(hook.map((h) => h.id));
```

---

## Favorites Service Optimization

### FILE: `src/lib/services/favorites.ts`

**Before**: No cache invalidation

```typescript
async addFavorite(input: FavoriteInput): Promise<{ id: string }> {
  const id = nanoid();
  await this.db.insert(scriptFavorites).values({
    id,
    userId,
    generatedScriptId,
  });

  return { id };
}
```

**After**: With cache invalidation

```typescript
async addFavorite(input: FavoriteInput): Promise<{ id: string }> {
  const id = nanoid();
  await this.db.insert(scriptFavorites).values({
    id,
    userId,
    generatedScriptId,
  });

  // Invalidate user favorites cache
  const cache = getCache();
  if (cache) {
    await cache.invalidateByTags([
      CacheTags.favorites,
      CacheTags.user(userId)
    ]);
  }

  return { id };
}
```

---

## Image Configuration

### FILE: `next.config.js`

**Before**: Basic config

```javascript
images: {
  loader: "custom",
  loaderFile: "./src/lib/cloudflare-image-loader.ts",
  formats: ["image/avif", "image/webp"],
  remotePatterns: [
    { protocol: "https", hostname: "avatars.githubusercontent.com" },
    { protocol: "https", hostname: "lh3.googleusercontent.com" },
  ],
}
```

**After**: Optimized with sizes and caching

```javascript
images: {
  loader: "custom",
  loaderFile: "./src/lib/cloudflare-image-loader.ts",
  formats: ["image/avif", "image/webp"],
  deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],  // NEW
  imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],              // NEW
  minimumCacheTTL: 31536000,  // 1 year for static images        // NEW
  remotePatterns: [
    { protocol: "https", hostname: "avatars.githubusercontent.com" },
    { protocol: "https", hostname: "lh3.googleusercontent.com" },
  ],
}
```

---

## Cache Headers

### FILE: `next.config.js`

**Before**: No cache headers

```javascript
async headers() {
  return [
    {
      source: "/(.*)",
      headers: [
        { key: "X-Frame-Options", value: "DENY" },
        // ... other security headers
      ],
    },
  ];
}
```

**After**: Added cache headers

```javascript
async headers() {
  return [
    {
      source: "/(.*)",
      headers: [
        { key: "X-Frame-Options", value: "DENY" },
        // ... security headers
      ],
    },
    {
      source: "/api/:path*",
      headers: [
        {
          key: "Cache-Control",
          value: "public, s-maxage=60, stale-while-revalidate=300",
        },
      ],
    },
    {
      source: "/_next/image/:path*",
      headers: [
        {
          key: "Cache-Control",
          value: "public, max-age=31536000, immutable",
        },
      ],
    },
    {
      source: "/static/:path*",
      headers: [
        {
          key: "Cache-Control",
          value: "public, max-age=31536000, immutable",
        },
      ],
    },
  ];
}
```

### FILE: `middleware.ts`

**Before**: Basic request ID

```typescript
const response = NextResponse.next();
response.headers.set("x-request-id", crypto.randomUUID());
return response;
```

**After**: Added cache headers

```typescript
const response = NextResponse.next();
response.headers.set("x-request-id", crypto.randomUUID());

// Add performance and security headers
if (pathname.startsWith("/api/")) {
  response.headers.set(
    "Cache-Control",
    "public, s-maxage=60, stale-while-revalidate=300",
  );
} else if (pathname.match(/\.(jpg|jpeg|png|gif|ico|svg|webp|avif)$/i)) {
  response.headers.set("Cache-Control", "public, max-age=31536000, immutable");
}

return response;
```

---

## Type Definitions

### FILE: `src/types/cloudflare.d.ts`

**Before**: No KV types

```typescript
interface D1Database { ... }
interface Ai { ... }
interface R2Bucket { ... }
```

**After**: Added KVNamespace

```typescript
interface D1Database { ... }
interface Ai { ... }
interface KVNamespace {              // NEW
  get(key: string): Promise<string | null>;
  get(key: string, type: "json"): Promise<unknown | null>;
  put(key: string, value: string, options?: {...}): Promise<void>;
  delete(key: string | string[]): Promise<void>;
  list(options?: {...}): Promise<{...}>;
}
interface R2Bucket { ... }
```

---

## Summary Table

| File                            | Change Type | Lines Added | Impact               |
| ------------------------------- | ----------- | ----------- | -------------------- |
| `src/lib/cache/kv-cache.ts`     | New         | 177         | Caching layer        |
| `src/lib/cache/index.ts`        | New         | 66          | Cache helpers        |
| `src/lib/performance.ts`        | New         | 185         | Monitoring           |
| `src/lib/services/hooks.ts`     | Modified    | ~50         | Cache + batch        |
| `src/lib/services/ratings.ts`   | Modified    | ~60         | Cache + batch        |
| `src/lib/services/favorites.ts` | Modified    | ~30         | Cache + invalidation |
| `next.config.js`                | Modified    | ~20         | Images + headers     |
| `middleware.ts`                 | Modified    | ~20         | Cache headers        |
| `src/lib/cloudflare.ts`         | Modified    | ~10         | KV binding           |
| `src/types/cloudflare.d.ts`     | Modified    | ~20         | KV types             |

**Total**: ~638 lines added/modified across 10 files

---

## Usage Examples

### Basic caching

```typescript
import { withCache, CacheTTL } from "@/lib/cache";

const data = await withCache(
  "my:key",
  async () => await expensiveOperation(),
  CacheTTL.MEDIUM,
);
```

### Batch loading

```typescript
const stats = await service.getBatchHookRatingStats([
  "hook1",
  "hook2",
  "hook3",
]);
```

### Cache invalidation

```typescript
import { invalidateCache, CacheTags } from "@/lib/cache";

await invalidateCache(CacheTags.hooks, CacheTags.categories);
```
