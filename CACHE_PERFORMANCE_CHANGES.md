# Cache and Performance Optimizations

## Summary of Changes

This document describes the cache and performance optimizations made to the Adocavo project.

## 1. Hierarchical Cache Layer (`src/lib/cache/hierarchical-cache.ts`)

### Features

- **L1 (Memory)**: Fastest, per-request cache with LRU eviction
- **L2 (Cache API)**: Cloudflare's edge cache for distributed caching
- **L3 (KV)**: Persistent storage for long-term caching

### Key Classes

- `MemoryCache`: In-memory cache with TTL support
- `CacheAPILayer`: Wrapper for Cloudflare Cache API
- `KVCacheLayer`: KV storage with tag-based invalidation
- `HierarchicalCache`: Main orchestrator with automatic cache promotion

### Usage

```typescript
import { withHierarchicalCache, CacheTTL } from "@/lib/cache";

const data = await withHierarchicalCache(
  "hooks:all",
  async () => await fetchFromDB(),
  { ttl: CacheTTL.MEDIUM, tags: ["hooks"] },
);
```

### TTL Presets

- `SHORT`: 60 seconds (1 minute)
- `MEDIUM`: 300 seconds (5 minutes)
- `LONG`: 3600 seconds (1 hour)
- `VERY_LONG`: 86400 seconds (24 hours)

## 2. Enhanced Device Fingerprint (`src/lib/rate-limit.ts`)

### Improvements

- Added `accept-encoding` header
- Added `accept` header
- Added all `sec-ch-ua-*` Client Hints headers
- Added `sec-fetch-*` headers
- Added `dnt`, `save-data`, `viewport-width` headers
- IP address already included via `getClientIp()`

This makes the fingerprint more unique and resistant to spoofing.

## 3. Cursor Pagination (`src/lib/services/hooks.ts`)

### New Functions

- `cursorPaginate()`: Cursor-based pagination for efficient large dataset queries
- `offsetPaginate()`: Backward-compatible offset pagination (marked as deprecated)
- `encodeCursor()`: Encode cursor to base64
- `decodeCursor()`: Decode cursor from base64

### Interfaces

```typescript
export interface CursorPaginationResult<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}
```

### Benefits

- Consistent results even if data changes between requests
- Better performance for large offsets
- No count query needed

## 4. Request ID Tracking

### Files Modified

- `src/lib/logger.ts`: Added `extractRequestIds()`, `createResponseHeaders()`, enhanced `RequestContext`
- `src/lib/api-utils.ts`: Enhanced `withErrorHandler()` and `withAuthHandler()` with request IDs
- `src/lib/request-context.ts`: New utility module for request context management

### Headers Added to All Responses

- `x-request-id`: Unique request identifier
- `x-correlation-id`: Links related requests
- `x-trace-id`: Distributed tracing identifier

### Usage

```typescript
import { extractRequestIds, createResponseHeaders } from "@/lib/logger";

const { requestId, correlationId, traceId } = extractRequestIds(request);
// ... process request ...
const headers = createResponseHeaders({ requestId, correlationId, traceId });
```

## 5. Backward Compatibility

All changes maintain backward compatibility:

- Existing `withCache()` function still works
- Existing offset pagination still works
- Existing `getHooks()` function unchanged
- New features are opt-in

## Files Changed

### New Files

- `src/lib/cache/hierarchical-cache.ts` - Hierarchical cache implementation
- `src/lib/request-context.ts` - Request context utilities

### Modified Files

- `src/lib/cache/index.ts` - Re-export hierarchical cache
- `src/lib/cache/kv-cache.ts` - Fixed KV type handling
- `src/lib/rate-limit.ts` - Enhanced device fingerprinting
- `src/lib/services/hooks.ts` - Added cursor pagination
- `src/lib/logger.ts` - Added request ID helpers
- `src/lib/api-utils.ts` - Added request ID tracking to handlers

## Configuration

### Environment Variables

No new environment variables required. Uses existing:

- `CACHE_KV` or `NEXT_CACHE_KV` - KV namespace binding

### Cache Warming

```typescript
import { getHierarchicalCache } from "@/lib/cache";

const cache = getHierarchicalCache();
await cache.warm([
  { key: "hooks:all", data: hooksData, options: { ttl: CacheTTL.LONG } },
  // ... more entries
]);
```

## Performance Impact

Expected improvements:

- **L1 cache hit**: ~1ms (memory access)
- **L2 cache hit**: ~10-50ms (edge cache)
- **L3 cache hit**: ~100-300ms (KV)
- **Cache miss**: ~500-2000ms (database query)

Cursor pagination vs offset:

- Offset 1000: ~50-100ms slower due to skipped rows
- Cursor: Consistent ~10-20ms regardless of position
