import { and, desc, eq, sql } from "drizzle-orm";
import { createDb } from "../db";
import { hooks, type Hook } from "../schema";
import type { HookCategory } from "../validations";

export interface HookFilters {
  category?: HookCategory;
  search?: string;
  page?: number;
  limit?: number;
}

const CACHE_TTL = 60 * 60; // 1 hour

function getCache() {
  if (typeof caches === "undefined") return null;
  const storage = caches as unknown as { default?: Cache };
  return storage.default ?? null;
}

async function cacheGet<T>(key: string): Promise<T | null> {
  const cache = getCache();
  if (!cache) return null;
  const cached = await cache.match(new Request(`https://cache/${key}`));
  if (!cached) return null;
  return cached.json() as Promise<T>;
}

async function cacheSet<T>(key: string, value: T) {
  const cache = getCache();
  if (!cache) return;
  const response = new Response(JSON.stringify(value), {
    headers: { "Cache-Control": `max-age=${CACHE_TTL}` },
  });
  await cache.put(new Request(`https://cache/${key}`), response.clone());
}

export async function getHooks(d1: D1Database, filters: HookFilters = {}) {
  const db = createDb(d1);
  const { category, search, page = 1, limit = 20 } = filters;

  const cacheKey = `hooks:${category || "all"}:${search || ""}:${page}:${limit}`;
  const cached = await cacheGet<Hook[]>(cacheKey);
  if (cached) return cached;

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

  await cacheSet(cacheKey, result);
  return result;
}

export async function getHookById(d1: D1Database, id: string) {
  const db = createDb(d1);
  return db.query.hooks.findFirst({
    where: and(eq(hooks.id, id), eq(hooks.isActive, true)),
  });
}

export async function getCategories(d1: D1Database) {
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
}

export async function getHookCategories(d1: D1Database) {
  const db = createDb(d1);
  const results = await db
    .selectDistinct({ category: hooks.category })
    .from(hooks)
    .where(eq(hooks.isActive, true));
  return results.map((row) => row.category as HookCategory);
}

export async function getHookCount(d1: D1Database, category?: HookCategory) {
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
}
