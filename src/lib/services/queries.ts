import { eq, and, desc, count, avg, sql } from "drizzle-orm";
import type { Database } from "../db";
import {
  users,
  generatedScripts,
  hooks,
  scriptRatings,
  scriptFavorites,
  competitorAnalyses,
  hookReviewQueue,
} from "../schema";
import { withDbQuery, paginatedQuery } from "../db-utils";

export interface UserScriptHistoryOptions {
  userId: string;
  page?: number;
  limit?: number;
}

export interface PaginatedScripts {
  items: Array<{
    id: string;
    hookText: string;
    productDescription: string;
    scripts: unknown;
    createdAt: Date;
  }>;
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

/**
 * Optimized query for user script history with pagination
 * Uses composite index (user_id, created_at DESC)
 */
export async function getUserScriptHistory(
  db: Database,
  options: UserScriptHistoryOptions,
): Promise<PaginatedScripts> {
  const { userId, page = 1, limit = 20 } = options;

  return paginatedQuery(
    async (limitVal, offset) => {
      const result = await db
        .select({
          id: generatedScripts.id,
          hookText: hooks.text,
          productDescription: generatedScripts.productDescription,
          scripts: generatedScripts.scripts,
          createdAt: generatedScripts.createdAt,
        })
        .from(generatedScripts)
        .innerJoin(hooks, eq(generatedScripts.hookId, hooks.id))
        .where(eq(generatedScripts.userId, userId))
        .orderBy(desc(generatedScripts.createdAt))
        .limit(limitVal)
        .offset(offset);

      return result;
    },
    async () => {
      const result = await db
        .select({ total: count() })
        .from(generatedScripts)
        .where(eq(generatedScripts.userId, userId))
        .get();

      return Number(result?.total ?? 0);
    },
    page,
    limit,
  );
}

/**
 * Optimized query for top-rated scripts
 * Uses script_ratings_script_rating_idx index
 */
export async function getTopRatedScripts(
  db: Database,
  limit = 10,
): Promise<
  Array<{
    id: string;
    hookText: string;
    productDescription: string;
    averageRating: number;
    ratingCount: number;
  }>
> {
  return withDbQuery("top_rated_scripts", async () => {
    const results = await db
      .select({
        id: generatedScripts.id,
        hookText: hooks.text,
        productDescription: generatedScripts.productDescription,
        averageRating: avg(scriptRatings.rating).mapWith(Number),
        ratingCount: count(scriptRatings.id).mapWith(Number),
      })
      .from(scriptRatings)
      .innerJoin(
        generatedScripts,
        eq(scriptRatings.generatedScriptId, generatedScripts.id),
      )
      .innerJoin(hooks, eq(generatedScripts.hookId, hooks.id))
      .groupBy(generatedScripts.id)
      .having(sql`${avg(scriptRatings.rating)} >= 4`)
      .orderBy(desc(avg(scriptRatings.rating)))
      .limit(limit);

    return results;
  });
}

/**
 * Optimized query for user favorites with JOIN data
 * Uses script_favorites_user_created_idx index
 */
export async function getUserFavorites(
  db: Database,
  userId: string,
  page = 1,
  limit = 20,
): Promise<PaginatedScripts> {
  return paginatedQuery(
    async (limitVal, offset) => {
      const result = await db
        .select({
          id: scriptFavorites.id,
          generatedScriptId: scriptFavorites.generatedScriptId,
          hookText: hooks.text,
          productDescription: generatedScripts.productDescription,
          scripts: generatedScripts.scripts,
          createdAt: scriptFavorites.createdAt,
        })
        .from(scriptFavorites)
        .innerJoin(
          generatedScripts,
          eq(scriptFavorites.generatedScriptId, generatedScripts.id),
        )
        .innerJoin(hooks, eq(generatedScripts.hookId, hooks.id))
        .where(eq(scriptFavorites.userId, userId))
        .orderBy(desc(scriptFavorites.createdAt))
        .limit(limitVal)
        .offset(offset);

      return result.map((row) => ({
        id: row.id,
        hookText: row.hookText,
        productDescription: row.productDescription,
        scripts: row.scripts,
        createdAt: row.createdAt,
      }));
    },
    async () => {
      const result = await db
        .select({ total: count() })
        .from(scriptFavorites)
        .where(eq(scriptFavorites.userId, userId))
        .get();

      return Number(result?.total ?? 0);
    },
    page,
    limit,
  );
}

/**
 * Optimized query for hook review queue
 * Uses hook_review_status_created_idx index
 */
export async function getReviewQueue(
  db: Database,
  status: "pending" | "approved" | "rejected",
  page = 1,
  limit = 50,
) {
  return paginatedQuery(
    async (limitVal, offset) => {
      return db.query.hookReviewQueue.findMany({
        where: eq(hookReviewQueue.status, status),
        orderBy: [desc(hookReviewQueue.createdAt)],
        limit: limitVal,
        offset,
      });
    },
    async () => {
      const result = await db
        .select({ total: count() })
        .from(hookReviewQueue)
        .where(eq(hookReviewQueue.status, status))
        .get();

      return Number(result?.total ?? 0);
    },
    page,
    limit,
  );
}

/**
 * Optimized query for user competitor analyses
 * Uses competitor_analyses_user_created_idx index
 */
export async function getUserCompetitorAnalyses(
  db: Database,
  userId: string,
  page = 1,
  limit = 20,
) {
  return paginatedQuery(
    async (limitVal, offset) => {
      return db.query.competitorAnalyses.findMany({
        where: eq(competitorAnalyses.userId, userId),
        orderBy: [desc(competitorAnalyses.createdAt)],
        limit: limitVal,
        offset,
      });
    },
    async () => {
      const result = await db
        .select({ total: count() })
        .from(competitorAnalyses)
        .where(eq(competitorAnalyses.userId, userId))
        .get();

      return Number(result?.total ?? 0);
    },
    page,
    limit,
  );
}

/**
 * Query for hooks by category with optimal index usage
 * Uses hooks_category_active_score_idx index
 */
export async function getHooksByCategory(
  db: Database,
  category: string,
  limit = 20,
): Promise<(typeof hooks.$inferSelect)[]> {
  return withDbQuery("hooks_by_category", async () => {
    return db.query.hooks.findMany({
      where: and(eq(hooks.category, category), eq(hooks.isActive, true)),
      orderBy: [desc(hooks.engagementScore)],
      limit,
    });
  });
}

/**
 * Aggregated statistics for hooks
 */
export async function getHookStatistics(
  db: Database,
  hookId: string,
): Promise<{
  totalGenerations: number;
  averageRating: number;
  totalRatings: number;
}> {
  return withDbQuery("hook_statistics", async () => {
    const [genResult, ratingResult] = await Promise.all([
      db
        .select({ total: count() })
        .from(generatedScripts)
        .where(eq(generatedScripts.hookId, hookId))
        .get(),
      db
        .select({
          averageRating: avg(scriptRatings.rating).mapWith(Number),
          totalRatings: count(scriptRatings.id).mapWith(Number),
        })
        .from(scriptRatings)
        .innerJoin(
          generatedScripts,
          eq(scriptRatings.generatedScriptId, generatedScripts.id),
        )
        .where(eq(generatedScripts.hookId, hookId))
        .get(),
    ]);

    return {
      totalGenerations: Number(genResult?.total ?? 0),
      averageRating: ratingResult?.averageRating ?? 0,
      totalRatings: ratingResult?.totalRatings ?? 0,
    };
  });
}

/**
 * Batch user lookup with single query
 */
export async function getUsersByIds(
  db: Database,
  userIds: string[],
): Promise<(typeof users.$inferSelect)[]> {
  if (userIds.length === 0) return [];

  return withDbQuery("get_users_by_ids", async () => {
    return db.query.users.findMany({
      where: sql`${users.id} IN ${sql.placeholder("ids")}`,
    });
  });
}
