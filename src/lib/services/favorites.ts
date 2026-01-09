import { eq, and, desc } from "drizzle-orm";
import { createDb, type Database } from "../db";
import { scriptFavorites, generatedScripts, hooks } from "../schema";
import { nanoid } from "nanoid";

export interface FavoriteInput {
  userId: string;
  generatedScriptId: string;
}

export interface FavoriteWithDetails {
  id: string;
  generatedScriptId: string;
  hookText: string;
  productDescription: string;
  scripts: Array<{ angle: string; script: string }>;
  createdAt: Date;
}

export class FavoriteService {
  constructor(private readonly db: Database) {}

  async addFavorite(input: FavoriteInput): Promise<{ id: string }> {
    const { userId, generatedScriptId } = input;

    const existing = await this.db.query.scriptFavorites.findFirst({
      where: and(
        eq(scriptFavorites.userId, userId),
        eq(scriptFavorites.generatedScriptId, generatedScriptId),
      ),
    });

    if (existing) {
      return { id: existing.id };
    }

    const id = nanoid();
    await this.db.insert(scriptFavorites).values({
      id,
      userId,
      generatedScriptId,
    });

    return { id };
  }

  async removeFavorite(
    userId: string,
    generatedScriptId: string,
  ): Promise<boolean> {
    await this.db
      .delete(scriptFavorites)
      .where(
        and(
          eq(scriptFavorites.userId, userId),
          eq(scriptFavorites.generatedScriptId, generatedScriptId),
        ),
      );

    return true;
  }

  async isFavorite(
    userId: string,
    generatedScriptId: string,
  ): Promise<boolean> {
    const favorite = await this.db.query.scriptFavorites.findFirst({
      where: and(
        eq(scriptFavorites.userId, userId),
        eq(scriptFavorites.generatedScriptId, generatedScriptId),
      ),
    });

    return !!favorite;
  }

  async getUserFavorites(
    userId: string,
    limit = 20,
  ): Promise<FavoriteWithDetails[]> {
    const result = await this.db
      .select({
        favoriteId: scriptFavorites.id,
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
      .limit(limit);

    return result.map((row) => ({
      id: row.favoriteId,
      generatedScriptId: row.generatedScriptId,
      hookText: row.hookText,
      productDescription: row.productDescription,
      scripts: row.scripts as Array<{ angle: string; script: string }>,
      createdAt: row.createdAt,
    }));
  }

  async getFavoriteCount(userId: string): Promise<number> {
    const result = await this.db.query.scriptFavorites.findMany({
      where: eq(scriptFavorites.userId, userId),
    });

    return result.length;
  }
}

export async function createFavoriteService(
  d1: D1Database,
): Promise<FavoriteService> {
  const db = createDb(d1);
  return new FavoriteService(db);
}
