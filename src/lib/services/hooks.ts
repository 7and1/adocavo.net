import { and, desc, eq, sql, inArray } from "drizzle-orm";
import { createDb } from "../db";
import { hooks, type Hook } from "../schema";
import type { HookCategory } from "../validations";
import { getCache, CacheKeys, CacheTags, CacheTTL, withCache } from "../cache";

export interface HookFilters {
  category?: HookCategory;
  search?: string;
  page?: number;
  limit?: number;
}

export interface CursorPaginationParams {
  cursor?: string; // Base64 encoded cursor
  limit?: number;
}

export interface CursorPaginationResult<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

/**
 * Decode cursor from base64 string
 * Cursor format: base64("{\"timestamp\":1234567890,\"id\":\"hook-id\"}")
 */
export function decodeCursor(
  cursor: string,
): { timestamp: number; id: string } | null {
  try {
    const decoded = atob(cursor);
    return JSON.parse(decoded) as { timestamp: number; id: string };
  } catch {
    return null;
  }
}

/**
 * Encode cursor to base64 string
 */
export function encodeCursor(timestamp: number, id: string): string {
  const cursorData = { timestamp, id };
  return btoa(JSON.stringify(cursorData));
}

/**
 * Cursor-based pagination for hooks
 * More efficient than offset-based for large datasets
 */
export async function cursorPaginate(
  d1: D1Database,
  filters: Omit<HookFilters, "page"> & { cursor?: string },
): Promise<CursorPaginationResult<Hook>> {
  const { category, search, cursor, limit = 20 } = filters;
  const db = createDb(d1);

  // Decode cursor if provided
  let cursorTimestamp: number | undefined;
  let cursorId: string | undefined;

  if (cursor) {
    const decoded = decodeCursor(cursor);
    if (decoded) {
      cursorTimestamp = decoded.timestamp;
      cursorId = decoded.id;
    }
  }

  // Build where clauses
  const whereClauses = [eq(hooks.isActive, true)];

  if (category) {
    whereClauses.push(eq(hooks.category, category));
  }

  if (search) {
    const escapedSearch = search
      .replace(/%/g, "\\%")
      .replace(/_/g, "\\_")
      .replace(/\\/g, "\\\\");
    whereClauses.push(
      sql`${hooks.text} LIKE ${`%${escapedSearch}%`} ESCAPE '\\'`,
    );
  }

  // Add cursor condition for pagination
  // We use (engagementScore DESC, createdAt DESC) as the sort key
  // The cursor encodes the last item's position
  if (cursorTimestamp !== undefined && cursorId !== undefined) {
    // For cursor pagination: fetch items after the cursor
    // Using (createdAt < cursorTimestamp) OR (createdAt = cursorTimestamp AND id < cursorId)
    whereClauses.push(
      sql`(${hooks.createdAt} < ${new Date(cursorTimestamp)} OR (${hooks.createdAt} = ${new Date(cursorTimestamp)} AND ${hooks.id} < ${cursorId}))`,
    );
  }

  // Query with cursor-based pagination
  const result = await db.query.hooks.findMany({
    where: whereClauses.length > 1 ? and(...whereClauses) : whereClauses[0],
    orderBy: [desc(hooks.engagementScore), desc(hooks.createdAt)],
    limit: limit + 1, // Fetch one extra to check if there are more results
  });

  // Determine if there are more results
  const hasMore = result.length > limit;
  const items = hasMore ? result.slice(0, limit) : result;

  // Generate next cursor if there are more results
  let nextCursor: string | null = null;
  if (hasMore && items.length > 0) {
    const lastItem = items[items.length - 1];
    nextCursor = encodeCursor(lastItem.createdAt.getTime(), lastItem.id);
  }

  return {
    items,
    nextCursor,
    hasMore,
  };
}

/**
 * Backward compatible offset-based pagination
 * @deprecated Use cursorPaginate instead for better performance
 */
export async function offsetPaginate(
  d1: D1Database,
  filters: HookFilters,
): Promise<{ items: Hook[]; total: number; hasMore: boolean }> {
  const { category, search, page = 1, limit = 20 } = filters;
  const db = createDb(d1);
  const offset = (page - 1) * limit;

  const whereClauses = [eq(hooks.isActive, true)];

  if (category) {
    whereClauses.push(eq(hooks.category, category));
  }

  if (search) {
    const escapedSearch = search
      .replace(/%/g, "\\%")
      .replace(/_/g, "\\_")
      .replace(/\\/g, "\\\\");
    whereClauses.push(
      sql`${hooks.text} LIKE ${`%${escapedSearch}%`} ESCAPE '\\'`,
    );
  }

  // Get total count
  const countResult = await db
    .select({ total: sql<number>`count(*)`.as("total") })
    .from(hooks)
    .where(whereClauses.length > 1 ? and(...whereClauses) : whereClauses[0])
    .get();

  const total = Number(countResult?.total ?? 0);
  const hasMore = offset + limit < total;

  // Get items
  const items = await db.query.hooks.findMany({
    where: whereClauses.length > 1 ? and(...whereClauses) : whereClauses[0],
    orderBy: [desc(hooks.engagementScore)],
    limit,
    offset,
  });

  return { items, total, hasMore };
}

/**
 * Get hooks with KV caching and optimized query
 * FIX: No N+1 queries - single optimized query with joins
 */
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
      const whereClauses = [eq(hooks.isActive, true)];

      if (category) {
        whereClauses.push(eq(hooks.category, category));
      }

      if (search) {
        // Escape LIKE wildcards to prevent SQL injection
        const escapedSearch = search
          .replace(/%/g, "\\%")
          .replace(/_/g, "\\_")
          .replace(/\\/g, "\\\\");
        // Use raw SQL with parameterized query for safe LIKE operation
        whereClauses.push(
          sql`${hooks.text} LIKE ${`%${escapedSearch}%`} ESCAPE '\\'`,
        );
      }

      const result = await db.query.hooks.findMany({
        where: whereClauses.length > 1 ? and(...whereClauses) : whereClauses[0],
        orderBy: [desc(hooks.engagementScore)],
        limit,
        offset,
      });

      return result;
    },
    CacheTTL.MEDIUM,
  );
}

/**
 * Get hook by ID with caching
 */
export async function getHookById(d1: D1Database, id: string) {
  const cacheKey = CacheKeys.hookById(id);

  return withCache(
    cacheKey,
    async () => {
      const db = createDb(d1);
      return db.query.hooks.findFirst({
        where: and(eq(hooks.id, id), eq(hooks.isActive, true)),
      });
    },
    CacheTTL.LONG,
  );
}

/**
 * Get categories with counts - optimized single query
 * FIX: Eliminates N+1 by using aggregation in single query
 */
export async function getCategories(d1: D1Database) {
  const cacheKey = CacheKeys.categories();

  return withCache(
    cacheKey,
    async () => {
      const db = createDb(d1);
      const results = await db
        .select({
          category: hooks.category,
          count: sql<number>`count(*)`.as("count"),
        })
        .from(hooks)
        .where(eq(hooks.isActive, true))
        .groupBy(hooks.category)
        .orderBy(desc(sql<number>`count(*)`));

      return results.map((row) => ({
        category: row.category as HookCategory,
        count: Number(row.count),
      }));
    },
    CacheTTL.LONG,
  );
}

/**
 * Get distinct hook categories
 */
export async function getHookCategories(d1: D1Database) {
  const cacheKey = "categories:distinct";

  return withCache(
    cacheKey,
    async () => {
      const db = createDb(d1);
      const results = await db
        .selectDistinct({ category: hooks.category })
        .from(hooks)
        .where(eq(hooks.isActive, true));
      return results.map((row) => row.category as HookCategory);
    },
    CacheTTL.LONG,
  );
}

/**
 * Get hook count - optimized query
 */
export async function getHookCount(d1: D1Database, category?: HookCategory) {
  const cacheKey = `count:${category || "all"}`;

  return withCache(
    cacheKey,
    async () => {
      const db = createDb(d1);
      const where = category
        ? and(eq(hooks.isActive, true), eq(hooks.category, category))
        : eq(hooks.isActive, true);

      const result = await db
        .select({ total: sql<number>`count(*)`.as("total") })
        .from(hooks)
        .where(where)
        .get();

      return Number(result?.total ?? 0);
    },
    CacheTTL.MEDIUM,
  );
}

/**
 * Get multiple hooks by IDs in a single query
 * FIX: Batch loading to prevent N+1
 */
export async function getHooksByIds(
  d1: D1Database,
  ids: string[],
): Promise<Hook[]> {
  if (ids.length === 0) return [];

  const db = createDb(d1);

  return db.query.hooks.findMany({
    where: and(eq(hooks.isActive, true), inArray(hooks.id, ids)),
  });
}

/**
 * Invalidate hooks cache
 */
export async function invalidateHooksCache(hookId?: string): Promise<void> {
  const cache = getCache();
  if (!cache) return;

  if (hookId) {
    await cache.delete(CacheKeys.hookById(hookId));
  }

  await cache.invalidateByTags([CacheTags.hooks, CacheTags.categories]);
}
