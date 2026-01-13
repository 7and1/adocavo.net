import { eq, and, desc, count } from "drizzle-orm";
import { createDb, type Database } from "../db";
import { scriptFavorites, generatedScripts, hooks } from "../schema";
import { nanoid } from "nanoid";
import { getCache, CacheKeys, CacheTags, CacheTTL, withCache } from "../cache";

export interface HookFavoriteInput {
  userId: string;
  hookId: string;
}

export interface HookFavoriteWithDetails {
  id: string;
  hookId: string;
  hookText: string;
  category: string;
  engagementScore: number;
  createdAt: Date;
}

export class HookFavoriteService {
  constructor(private readonly db: Database) {}

  async addFavorite(
    input: HookFavoriteInput,
  ): Promise<{ id: string; generatedScriptId: string }> {
    const { userId, hookId } = input;

    // Find the hook first
    const hook = await this.db.query.hooks.findFirst({
      where: eq(hooks.id, hookId),
    });

    if (!hook) {
      throw new Error("Hook not found");
    }

    // Check if user already has favorited this hook
    const existingFavorite = await this.db.query.scriptFavorites.findFirst({
      where: and(
        eq(scriptFavorites.userId, userId),
        eq(generatedScripts.hookId, hookId),
      ),
      with: {
        generatedScript: true,
      },
    });

    if (existingFavorite) {
      return {
        id: existingFavorite.id,
        generatedScriptId: existingFavorite.generatedScriptId,
      };
    }

    // Create a minimal generated script as a favorite marker
    const generatedScriptId = nanoid();
    await this.db.insert(generatedScripts).values({
      id: generatedScriptId,
      userId: userId,
      hookId: hookId,
      productDescription: `Favorite: ${hook.text}`,
      scripts: JSON.stringify([{ angle: "Favorite", script: hook.text }]),
    });

    const favoriteId = nanoid();
    await this.db.insert(scriptFavorites).values({
      id: favoriteId,
      userId: userId,
      generatedScriptId: generatedScriptId,
    });

    // Invalidate user favorites cache
    const cache = getCache();
    if (cache) {
      await cache.invalidateByTags([
        CacheTags.favorites,
        CacheTags.user(userId),
      ]);
    }

    return { id: favoriteId, generatedScriptId };
  }

  async removeFavorite(userId: string, hookId: string): Promise<boolean> {
    const favorite = await this.db.query.scriptFavorites.findFirst({
      where: and(
        eq(scriptFavorites.userId, userId),
        eq(generatedScripts.hookId, hookId),
      ),
      with: {
        generatedScript: true,
      },
    });

    if (favorite) {
      await this.db
        .delete(scriptFavorites)
        .where(eq(scriptFavorites.id, favorite.id));
      await this.db
        .delete(generatedScripts)
        .where(eq(generatedScripts.id, favorite.generatedScriptId));

      // Invalidate user favorites cache
      const cache = getCache();
      if (cache) {
        await cache.invalidateByTags([
          CacheTags.favorites,
          CacheTags.user(userId),
        ]);
      }
    }

    return true;
  }

  async isFavorite(userId: string, hookId: string): Promise<boolean> {
    const favorite = await this.db.query.scriptFavorites.findFirst({
      where: and(
        eq(scriptFavorites.userId, userId),
        eq(generatedScripts.hookId, hookId),
      ),
    });

    return !!favorite;
  }

  async getUserFavorites(
    userId: string,
    limit = 50,
    offset = 0,
  ): Promise<HookFavoriteWithDetails[]> {
    const cacheKey = CacheKeys.userFavorites(
      userId,
      Math.floor(offset / limit) + 1,
    );

    return withCache(
      cacheKey,
      async () => {
        const result = await this.db
          .select({
            favoriteId: scriptFavorites.id,
            hookId: generatedScripts.hookId,
            hookText: hooks.text,
            category: hooks.category,
            engagementScore: hooks.engagementScore,
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
          .limit(limit)
          .offset(offset);

        return result.map((row) => ({
          id: row.favoriteId,
          hookId: row.hookId,
          hookText: row.hookText,
          category: row.category,
          engagementScore: row.engagementScore,
          createdAt: row.createdAt,
        }));
      },
      CacheTTL.MEDIUM,
    );
  }

  async getFavoriteCount(userId: string): Promise<number> {
    const result = await this.db.query.scriptFavorites.findMany({
      where: eq(scriptFavorites.userId, userId),
    });

    return result.length;
  }

  async getUserFavoritesByCategory(
    userId: string,
  ): Promise<Record<string, number>> {
    const cacheKey = CacheKeys.userFavoritesByCategory(userId);

    return withCache(
      cacheKey,
      async () => {
        const result = await this.db
          .select({
            category: hooks.category,
            count: count(),
          })
          .from(scriptFavorites)
          .innerJoin(
            generatedScripts,
            eq(scriptFavorites.generatedScriptId, generatedScripts.id),
          )
          .innerJoin(hooks, eq(generatedScripts.hookId, hooks.id))
          .where(eq(scriptFavorites.userId, userId))
          .groupBy(hooks.category);

        const counts: Record<string, number> = {};
        result.forEach((row) => {
          counts[row.category] = Number(row.count);
        });

        return counts;
      },
      CacheTTL.MEDIUM,
    );
  }
}

export async function createHookFavoriteService(
  d1: D1Database,
): Promise<HookFavoriteService> {
  const db = createDb(d1);
  return new HookFavoriteService(db);
}
