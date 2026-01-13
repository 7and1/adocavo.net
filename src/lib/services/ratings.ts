import { eq, and, avg, count, sql, desc, inArray } from "drizzle-orm";
import { createDb, type Database } from "../db";
import { scriptRatings, generatedScripts, hooks } from "../schema";
import { nanoid } from "nanoid";
import { getCache, CacheKeys, CacheTags, CacheTTL, withCache } from "../cache";

export interface RateScriptInput {
  generatedScriptId: string;
  userId: string | null;
  scriptIndex: number;
  rating: number;
  isHelpful?: boolean;
  feedback?: string;
}

export interface ScriptStats {
  averageRating: number;
  totalRatings: number;
  helpfulCount: number;
  scriptIndexStats: Array<{
    scriptIndex: number;
    averageRating: number;
    count: number;
  }>;
}

export class RatingService {
  constructor(private readonly db: Database) {}

  async rateScript(input: RateScriptInput): Promise<{ id: string }> {
    const {
      generatedScriptId,
      userId,
      scriptIndex,
      rating,
      isHelpful,
      feedback,
    } = input;

    if (rating < 1 || rating > 5) {
      throw new Error("Rating must be between 1 and 5");
    }

    const existing = userId
      ? await this.db.query.scriptRatings.findFirst({
          where: and(
            eq(scriptRatings.generatedScriptId, generatedScriptId),
            eq(scriptRatings.userId, userId),
            eq(scriptRatings.scriptIndex, scriptIndex),
          ),
        })
      : null;

    if (existing) {
      await this.db
        .update(scriptRatings)
        .set({
          rating,
          isHelpful: isHelpful ?? true,
          feedback: feedback || null,
        })
        .where(eq(scriptRatings.id, existing.id));
      return { id: existing.id };
    }

    const id = nanoid();
    await this.db.insert(scriptRatings).values({
      id,
      generatedScriptId,
      userId: userId || null,
      scriptIndex,
      rating,
      isHelpful: isHelpful ?? true,
      feedback: feedback || null,
    });

    return { id };
  }

  async getScriptStats(generatedScriptId: string): Promise<ScriptStats> {
    const cacheKey = `scriptStats:${generatedScriptId}`;

    return withCache(
      cacheKey,
      async () => {
        const stats = await this.db
          .select({
            averageRating: avg(scriptRatings.rating).mapWith(Number),
            totalRatings: count(scriptRatings.id).mapWith(Number),
            helpfulCount: count(
              sql`CASE WHEN ${scriptRatings.isHelpful} = 1 THEN 1 END`,
            ).mapWith(Number),
          })
          .from(scriptRatings)
          .where(eq(scriptRatings.generatedScriptId, generatedScriptId));

        const byIndex = await this.db
          .select({
            scriptIndex: scriptRatings.scriptIndex,
            averageRating: avg(scriptRatings.rating).mapWith(Number),
            count: count(scriptRatings.id).mapWith(Number),
          })
          .from(scriptRatings)
          .where(eq(scriptRatings.generatedScriptId, generatedScriptId))
          .groupBy(scriptRatings.scriptIndex)
          .orderBy(scriptRatings.scriptIndex);

        return {
          averageRating: stats[0]?.averageRating || 0,
          totalRatings: stats[0]?.totalRatings || 0,
          helpfulCount: stats[0]?.helpfulCount || 0,
          scriptIndexStats: byIndex,
        };
      },
      CacheTTL.MEDIUM,
    );
  }

  async getUserRating(
    generatedScriptId: string,
    userId: string,
    scriptIndex: number,
  ): Promise<{ rating: number; isHelpful: boolean } | null> {
    const result = await this.db.query.scriptRatings.findFirst({
      where: and(
        eq(scriptRatings.generatedScriptId, generatedScriptId),
        eq(scriptRatings.userId, userId),
        eq(scriptRatings.scriptIndex, scriptIndex),
      ),
    });

    return result
      ? { rating: result.rating, isHelpful: result.isHelpful ?? true }
      : null;
  }

  async getTopRatedScripts(limit = 10): Promise<
    Array<{
      id: string;
      hookText: string;
      productDescription: string;
      averageRating: number;
      ratingCount: number;
    }>
  > {
    const cacheKey = "topRated:scripts";

    return withCache(
      cacheKey,
      async () => {
        const results = await this.db
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
      },
      CacheTTL.LONG,
    );
  }

  async getHookRatingStats(hookId: string): Promise<{
    averageRating: number;
    totalRatings: number;
  }> {
    const cacheKey = CacheKeys.ratingStats(hookId);

    return withCache(
      cacheKey,
      async () => {
        const stats = await this.db
          .select({
            averageRating: avg(scriptRatings.rating).mapWith(Number),
            totalRatings: count(scriptRatings.id).mapWith(Number),
          })
          .from(scriptRatings)
          .innerJoin(
            generatedScripts,
            eq(scriptRatings.generatedScriptId, generatedScripts.id),
          )
          .where(eq(generatedScripts.hookId, hookId));

        return {
          averageRating: stats[0]?.averageRating || 0,
          totalRatings: stats[0]?.totalRatings || 0,
        };
      },
      CacheTTL.MEDIUM,
    );
  }

  async getBatchHookRatingStats(
    hookIds: string[],
  ): Promise<Map<string, { averageRating: number; totalRatings: number }>> {
    if (hookIds.length === 0) return new Map();

    const results = await this.db
      .select({
        hookId: hooks.id,
        averageRating: avg(scriptRatings.rating).mapWith(Number),
        totalRatings: count(scriptRatings.id).mapWith(Number),
      })
      .from(scriptRatings)
      .innerJoin(
        generatedScripts,
        eq(scriptRatings.generatedScriptId, generatedScripts.id),
      )
      .innerJoin(hooks, eq(generatedScripts.hookId, hooks.id))
      .where(inArray(hooks.id, hookIds))
      .groupBy(hooks.id);

    return new Map(
      results.map((r) => [
        r.hookId,
        {
          averageRating: r.averageRating || 0,
          totalRatings: r.totalRatings || 0,
        },
      ]),
    );
  }

  async invalidateScriptCache(generatedScriptId: string): Promise<void> {
    const cache = getCache();
    if (!cache) return;

    await cache.delete(`scriptStats:${generatedScriptId}`);
    await cache.invalidateByTags([CacheTags.ratings]);
  }
}

export async function createRatingService(
  d1: D1Database,
): Promise<RatingService> {
  const db = createDb(d1);
  return new RatingService(db);
}

export async function getHookRatingStats(
  d1: D1Database,
  hookId: string,
): Promise<{ averageRating: number; totalRatings: number }> {
  const db = createDb(d1);
  const service = new RatingService(db);
  return service.getHookRatingStats(hookId);
}
