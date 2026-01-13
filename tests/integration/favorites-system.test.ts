import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestEnvironment, cleanupTestDatabase } from "./test-utils";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "@/lib/schema";
import { eq, sql, desc } from "drizzle-orm";

describe("Favorites System Integration Tests", () => {
  let testEnv: Awaited<ReturnType<typeof createTestEnvironment>>;
  let db: ReturnType<typeof drizzle>;

  beforeAll(async () => {
    testEnv = await createTestEnvironment();
    db = testEnv.db;
  });

  afterAll(async () => {
    await cleanupTestDatabase(db);
  });

  describe("Favorite Creation", () => {
    it("should add a hook to favorites", async () => {
      const userId = "favorite-user";
      const hookId = "favorite-hook";

      // Create user
      await db.insert(schema.users).values({
        id: userId,
        email: "favorite@example.com",
        emailVerified: new Date(),
        credits: 10,
      });

      await db.insert(schema.hooks).values({
        id: hookId,
        text: "Favorite test hook",
        category: "tech",
        engagementScore: 8000,
        source: "tiktok",
        isActive: true,
      });

      // Add to favorites
      const favoriteData = {
        id: "favorite-1",
        userId,
        hookId,
      };

      const result = await db
        .insert(schema.favorites)
        .values(favoriteData)
        .returning();
      const favorite = result[0];

      expect(favorite).toMatchObject({
        id: "favorite-1",
        userId,
        hookId,
      });

      // Verify favorite exists
      const dbFavorite = await db
        .select()
        .from(schema.favorites)
        .where(eq(schema.favorites.id, favorite.id));
      expect(dbFavorite).toHaveLength(1);
    });

    it("should enforce unique user-hook constraint", async () => {
      const userId = "unique-favorite-user";
      const hookId = "unique-favorite-hook";

      await db.insert(schema.users).values({
        id: userId,
        email: "unique-favorite@example.com",
        emailVerified: new Date(),
        credits: 10,
      });

      await db.insert(schema.hooks).values({
        id: hookId,
        text: "Unique favorite test hook",
        category: "beauty",
        engagementScore: 9000,
        source: "tiktok",
        isActive: true,
      });

      // Add to favorites first time
      await db.insert(schema.favorites).values({
        id: "unique-favorite-1",
        userId,
        hookId,
      });

      // Try to add same hook to same user again - should fail
      await expect(
        db.insert(schema.favorites).values({
          id: "unique-favorite-2",
          userId,
          hookId,
        }),
      ).rejects.toThrow();
    });

    it("should allow adding multiple hooks to same user", async () => {
      const userId = "multiple-hooks-user";
      const hookId1 = "multiple-hooks-1";
      const hookId2 = "multiple-hooks-2";
      const hookId3 = "multiple-hooks-3";

      await db.insert(schema.users).values({
        id: userId,
        email: "multiple-hooks@example.com",
        emailVerified: new Date(),
        credits: 10,
      });

      // Create hooks
      await db.insert(schema.hooks).values([
        {
          id: hookId1,
          text: "Multiple hooks test hook 1",
          category: "tech",
          engagementScore: 7500,
          source: "tiktok",
          isActive: true,
        },
        {
          id: hookId2,
          text: "Multiple hooks test hook 2",
          category: "fitness",
          engagementScore: 8500,
          source: "tiktok",
          isActive: true,
        },
        {
          id: hookId3,
          text: "Multiple hooks test hook 3",
          category: "beauty",
          engagementScore: 9500,
          source: "tiktok",
          isActive: true,
        },
      ]);

      // Add all hooks to favorites
      await db.insert(schema.favorites).values([
        {
          id: "multiple-favorite-1",
          userId,
          hookId: hookId1,
        },
        {
          id: "multiple-favorite-2",
          userId,
          hookId: hookId2,
        },
        {
          id: "multiple-favorite-3",
          userId,
          hookId: hookId3,
        },
      ]);

      // Verify user has 3 favorites
      const favorites = await db
        .select()
        .from(schema.favorites)
        .where(eq(schema.favorites.userId, userId));
      expect(favorites).toHaveLength(3);
    });

    it("should allow same hook to be favorited by multiple users", async () => {
      const hookId = "shared-hook";
      const userId1 = "shared-user-1";
      const userId2 = "shared-user-2";

      // Create users
      await db.insert(schema.users).values([
        {
          id: userId1,
          email: "shared-1@example.com",
          emailVerified: new Date(),
          credits: 10,
        },
        {
          id: userId2,
          email: "shared-2@example.com",
          emailVerified: new Date(),
          credits: 10,
        },
      ]);

      // Create hook
      await db.insert(schema.hooks).values({
        id: hookId,
        text: "Shared hook test",
        category: "tech",
        engagementScore: 9500,
        source: "tiktok",
        isActive: true,
      });

      // Add hook to favorites for both users
      await db.insert(schema.favorites).values([
        {
          id: "shared-favorite-1",
          userId: userId1,
          hookId,
        },
        {
          id: "shared-favorite-2",
          userId: userId2,
          hookId,
        },
      ]);

      // Verify both users have the hook favorited
      const favorites1 = await db
        .select()
        .from(schema.favorites)
        .where(eq(schema.favorites.userId, userId1));
      const favorites2 = await db
        .select()
        .from(schema.favorites)
        .where(eq(schema.favorites.userId, userId2));

      expect(favorites1).toHaveLength(1);
      expect(favorites2).toHaveLength(1);
      expect(favorites1[0].hookId).toBe(hookId);
      expect(favorites2[0].hookId).toBe(hookId);

      // Verify hook has 2 favorites
      const favorites = await db
        .select()
        .from(schema.favorites)
        .where(eq(schema.favorites.hookId, hookId));
      expect(favorites).toHaveLength(2);
    });
  });

  describe("Favorite Retrieval", () => {
    it("should fetch user's favorite hooks", async () => {
      const userId = "fetch-favorites-user";
      const hookId1 = "fetch-hook-1";
      const hookId2 = "fetch-hook-2";

      await db.insert(schema.users).values({
        id: userId,
        email: "fetch-favorites@example.com",
        emailVerified: new Date(),
        credits: 10,
      });

      // Create hooks
      await db.insert(schema.hooks).values([
        {
          id: hookId1,
          text: "Fetch favorites test hook 1",
          category: "tech",
          engagementScore: 7000,
          source: "tiktok",
          isActive: true,
        },
        {
          id: hookId2,
          text: "Fetch favorites test hook 2",
          category: "tech",
          engagementScore: 9000,
          source: "tiktok",
          isActive: true,
        },
      ]);

      // Add hooks to favorites
      await db.insert(schema.favorites).values([
        {
          id: "fetch-favorite-1",
          userId,
          hookId: hookId1,
        },
        {
          id: "fetch-favorite-2",
          userId,
          hookId: hookId2,
        },
      ]);

      // Fetch favorites with hook details
      const favorites = await db
        .select({
          favorite: schema.favorites,
          hook: schema.hooks,
        })
        .from(schema.favorites)
        .leftJoin(schema.hooks, eq(schema.favorites.hookId, schema.hooks.id))
        .where(eq(schema.favorites.userId, userId))
        .orderBy(desc(schema.hooks.engagementScore));

      expect(favorites).toHaveLength(2);
      expect(favorites[0].hook.text).toBe("Fetch favorites test hook 2"); // Higher engagement
      expect(favorites[1].hook.text).toBe("Fetch favorites test hook 1");
    });

    it("should return empty array for user with no favorites", async () => {
      const userId = "no-favorites-user";

      // Create user
      await db.insert(schema.users).values({
        id: userId,
        email: "no-favorites@example.com",
        emailVerified: new Date(),
        credits: 10,
      });

      // Fetch favorites - should return empty array
      const favorites = await db
        .select()
        .from(schema.favorites)
        .where(eq(schema.favorites.userId, userId));

      expect(favorites).toHaveLength(0);
    });

    it("should handle non-existent user gracefully", async () => {
      const favorites = await db
        .select()
        .from(schema.favorites)
        .where(eq(schema.favorites.userId, "non-existent-user"));

      expect(favorites).toHaveLength(0);
    });

    it("should filter favorites by category", async () => {
      const userId = "category-filter-user";
      const techHookId = "category-tech-hook";
      const fitnessHookId = "category-fitness-hook";

      await db.insert(schema.users).values({
        id: userId,
        email: "category-filter@example.com",
        emailVerified: new Date(),
        credits: 10,
      });

      // Create hooks in different categories
      await db.insert(schema.hooks).values([
        {
          id: techHookId,
          text: "Tech hook",
          category: "tech",
          engagementScore: 8000,
          source: "tiktok",
          isActive: true,
        },
        {
          id: fitnessHookId,
          text: "Fitness hook",
          category: "fitness",
          engagementScore: 8500,
          source: "tiktok",
          isActive: true,
        },
      ]);

      // Add both hooks to favorites
      await db.insert(schema.favorites).values([
        {
          id: "category-tech-favorite",
          userId,
          hookId: techHookId,
        },
        {
          id: "category-fitness-favorite",
          userId,
          hookId: fitnessHookId,
        },
      ]);

      // Filter by tech category
      const techFavorites = await db
        .select({
          favorite: schema.favorites,
          hook: schema.hooks,
        })
        .from(schema.favorites)
        .leftJoin(schema.hooks, eq(schema.favorites.hookId, schema.hooks.id))
        .where(
          sql`favorites.user_id = ${userId} AND hooks.category = 'tech' AND hooks.is_active = 1`,
        );

      // Filter by fitness category
      const fitnessFavorites = await db
        .select({
          favorite: schema.favorites,
          hook: schema.hooks,
        })
        .from(schema.favorites)
        .leftJoin(schema.hooks, eq(schema.favorites.hookId, schema.hooks.id))
        .where(
          sql`favorites.user_id = ${userId} AND hooks.category = 'fitness' AND hooks.is_active = 1`,
        );

      expect(techFavorites).toHaveLength(1);
      expect(fitnessFavorites).toHaveLength(1);
      expect(techFavorites[0].hook.category).toBe("tech");
      expect(fitnessFavorites[0].hook.category).toBe("fitness");
    });

    it("should exclude inactive hooks from favorites", async () => {
      const userId = "inactive-user";
      const activeHookId = "active-hook";
      const inactiveHookId = "inactive-hook";

      await db.insert(schema.users).values({
        id: userId,
        email: "inactive@example.com",
        emailVerified: new Date(),
        credits: 10,
      });

      // Create hooks
      await db.insert(schema.hooks).values([
        {
          id: activeHookId,
          text: "Active hook",
          category: "tech",
          engagementScore: 8000,
          source: "tiktok",
          isActive: true,
        },
        {
          id: inactiveHookId,
          text: "Inactive hook",
          category: "tech",
          engagementScore: 7500,
          source: "tiktok",
          isActive: false,
        },
      ]);

      // Add both hooks to favorites
      await db.insert(schema.favorites).values([
        {
          id: "active-favorite",
          userId,
          hookId: activeHookId,
        },
        {
          id: "inactive-favorite",
          userId,
          hookId: inactiveHookId,
        },
      ]);

      // Fetch favorites - should only include active hook
      const favorites = await db
        .select({
          favorite: schema.favorites,
          hook: schema.hooks,
        })
        .from(schema.favorites)
        .leftJoin(schema.hooks, eq(schema.favorites.hookId, schema.hooks.id))
        .where(sql`favorites.user_id = ${userId} AND hooks.is_active = 1`);

      expect(favorites).toHaveLength(1);
      expect(favorites[0].hook.id).toBe(activeHookId);
    });
  });

  describe("Favorite Analytics", () => {
    it("should count favorites for a hook", async () => {
      const hookId = "count-favorites-hook";
      const user1 = "count-user-1";
      const user2 = "count-user-2";

      // Create users
      await db.insert(schema.users).values([
        {
          id: user1,
          email: "count-1@example.com",
          emailVerified: new Date(),
          credits: 10,
        },
        {
          id: user2,
          email: "count-2@example.com",
          emailVerified: new Date(),
          credits: 10,
        },
      ]);

      await db.insert(schema.hooks).values({
        id: hookId,
        text: "Count favorites hook",
        category: "tech",
        engagementScore: 7500,
        source: "tiktok",
        isActive: true,
      });

      // Add hook to favorites for 2 users
      await db.insert(schema.favorites).values([
        {
          id: "count-favorite-1",
          userId: user1,
          hookId,
        },
        {
          id: "count-favorite-2",
          userId: user2,
          hookId,
        },
      ]);

      // Count favorites for the hook
      const favoriteCount = await db
        .select({ count: sql`count(*)` })
        .from(schema.favorites)
        .where(eq(schema.favorites.hookId, hookId));

      expect(favoriteCount[0].count).toBe(2);
    });

    it("should return 0 count for hook with no favorites", async () => {
      const hookId = "no-count-hook";

      await db.insert(schema.hooks).values({
        id: hookId,
        text: "No count hook",
        category: "tech",
        engagementScore: 7000,
        source: "tiktok",
        isActive: true,
      });

      // Count favorites for hook with no favorites
      const favoriteCount = await db
        .select({ count: sql`count(*)` })
        .from(schema.favorites)
        .where(eq(schema.favorites.hookId, hookId));

      expect(favoriteCount[0].count).toBe(0);
    });

    it("should calculate favorite statistics by category", async () => {
      const hooks = Array.from({ length: 5 }, (_, i) => ({
        id: `stats-hook-${i}`,
        text: `Stats hook ${i}`,
        category: i % 2 === 0 ? "tech" : "fitness",
        engagementScore: 7000 + i * 500,
        source: "tiktok",
        isActive: true,
      }));

      // Create hooks
      await db.insert(schema.hooks).values(hooks);

      // Create users and add favorites
      const users = Array.from({ length: 5 }, (_, i) => ({
        id: `stats-user-${i}`,
        email: `stats-${i}@example.com`,
        emailVerified: new Date(),
        credits: 10,
      }));

      await db.insert(schema.users).values(users);

      // Add favorites - tech hooks get 3 favorites each, fitness get 1
      const favorites = [];
      hooks.forEach((hook, i) => {
        const count = hook.category === "tech" ? 3 : 1;
        for (let j = 0; j < count; j++) {
          favorites.push({
            id: `stats-favorite-${i}-${j}`,
            userId: users[j].id,
            hookId: hook.id,
          });
        }
      });

      await db.insert(schema.favorites).values(favorites);

      // Calculate category statistics
      const categoryStats = await db
        .select({
          category: schema.hooks.category,
          count: sql`count(distinct favorites.id)`,
          avgEngagement: sql`avg(hooks.engagement_score)`,
        })
        .from(schema.favorites)
        .leftJoin(schema.hooks, eq(schema.favorites.hookId, schema.hooks.id))
        .groupBy(schema.hooks.category);

      expect(categoryStats.length).toBeGreaterThan(0);
      expect(categoryStats.find((s) => s.category === "tech")?.count).toBe(15); // 5 tech hooks * 3 favorites
      expect(categoryStats.find((s) => s.category === "fitness")?.count).toBe(
        5,
      ); // 5 fitness hooks * 1 favorite
    });
  });

  describe("Favorite Deletion", () => {
    it("should remove a hook from favorites", async () => {
      const userId = "remove-favorite-user";
      const hookId = "remove-favorite-hook";

      await db.insert(schema.users).values({
        id: userId,
        email: "remove-favorite@example.com",
        emailVerified: new Date(),
        credits: 10,
      });

      await db.insert(schema.hooks).values({
        id: hookId,
        text: "Remove favorite test hook",
        category: "beauty",
        engagementScore: 8500,
        source: "tiktok",
        isActive: true,
      });

      // Add to favorites
      await db.insert(schema.favorites).values({
        id: "remove-favorite-1",
        userId,
        hookId,
      });

      // Verify favorite exists
      let favorite = await db
        .select()
        .from(schema.favorites)
        .where(eq(schema.favorites.id, "remove-favorite-1"));
      expect(favorite).toHaveLength(1);

      // Remove from favorites
      await db
        .delete(schema.favorites)
        .where(eq(schema.favorites.id, "remove-favorite-1"));

      // Verify favorite is deleted
      favorite = await db
        .select()
        .from(schema.favorites)
        .where(eq(schema.favorites.id, "remove-favorite-1"));
      expect(favorite).toHaveLength(0);
    });

    it("should remove all favorites for a user when user is deleted", async () => {
      const userId = "delete-user-favorites";
      const hookId1 = "delete-user-hook-1";
      const hookId2 = "delete-user-hook-2";

      await db.insert(schema.users).values({
        id: userId,
        email: "delete-user-favorites@example.com",
        emailVerified: new Date(),
        credits: 10,
      });

      // Create hooks
      await db.insert(schema.hooks).values([
        {
          id: hookId1,
          text: "Delete user hook 1",
          category: "tech",
          engagementScore: 8000,
          source: "tiktok",
          isActive: true,
        },
        {
          id: hookId2,
          text: "Delete user hook 2",
          category: "fitness",
          engagementScore: 8500,
          source: "tiktok",
          isActive: true,
        },
      ]);

      // Add hooks to favorites
      await db.insert(schema.favorites).values([
        {
          id: "delete-user-favorite-1",
          userId,
          hookId: hookId1,
        },
        {
          id: "delete-user-favorite-2",
          userId,
          hookId: hookId2,
        },
      ]);

      // Verify favorites exist
      let favorites = await db
        .select()
        .from(schema.favorites)
        .where(eq(schema.favorites.userId, userId));
      expect(favorites).toHaveLength(2);

      // Delete user
      await db.delete(schema.users).where(eq(schema.users.id, userId));

      // Verify favorites are also deleted
      favorites = await db
        .select()
        .from(schema.favorites)
        .where(eq(schema.favorites.userId, userId));
      expect(favorites).toHaveLength(0);
    });

    it("should handle deletion of non-existent favorite gracefully", async () => {
      // Try to delete non-existent favorite - should not throw
      await expect(
        db
          .delete(schema.favorites)
          .where(eq(schema.favorites.id, "non-existent-favorite")),
      ).resolves.not.toThrow();
    });

    it("should remove specific user-hook favorite when hook is deleted", async () => {
      const userId = "delete-hook-favorite-user";
      const hookId = "delete-hook-favorite-hook";

      await db.insert(schema.users).values({
        id: userId,
        email: "delete-hook-favorite@example.com",
        emailVerified: new Date(),
        credits: 10,
      });

      // Create hook
      await db.insert(schema.hooks).values({
        id: hookId,
        text: "Delete hook favorite test",
        category: "tech",
        engagementScore: 9000,
        source: "tiktok",
        isActive: true,
      });

      // Add to favorites
      await db.insert(schema.favorites).values({
        id: "delete-hook-favorite-1",
        userId,
        hookId,
      });

      // Verify favorite exists
      let favorite = await db
        .select()
        .from(schema.favorites)
        .where(eq(schema.favorites.id, "delete-hook-favorite-1"));
      expect(favorite).toHaveLength(1);

      // Delete hook
      await db.delete(schema.hooks).where(eq(schema.hooks.id, hookId));

      // Verify favorite is also deleted
      favorite = await db
        .select()
        .from(schema.favorites)
        .where(eq(schema.favorites.id, "delete-hook-favorite-1"));
      expect(favorite).toHaveLength(0);
    });

    it("should remove multiple favorites when hook is deleted", async () => {
      const hookId = "bulk-delete-hook";
      const user1 = "bulk-delete-user-1";
      const user2 = "bulk-delete-user-2";

      // Create users
      await db.insert(schema.users).values([
        {
          id: user1,
          email: "bulk-delete-1@example.com",
          emailVerified: new Date(),
          credits: 10,
        },
        {
          id: user2,
          email: "bulk-delete-2@example.com",
          emailVerified: new Date(),
          credits: 10,
        },
      ]);

      // Create hook
      await db.insert(schema.hooks).values({
        id: hookId,
        text: "Bulk delete hook",
        category: "beauty",
        engagementScore: 9500,
        source: "tiktok",
        isActive: true,
      });

      // Add hook to favorites for multiple users
      await db.insert(schema.favorites).values([
        {
          id: "bulk-delete-1",
          userId: user1,
          hookId,
        },
        {
          id: "bulk-delete-2",
          userId: user2,
          hookId,
        },
        {
          id: "bulk-delete-3",
          userId: user1,
          hookId,
        },
      ]);

      // Verify favorites exist
      let favorites = await db
        .select()
        .from(schema.favorites)
        .where(eq(schema.favorites.hookId, hookId));
      expect(favorites).toHaveLength(3);

      // Delete hook
      await db.delete(schema.hooks).where(eq(schema.hooks.id, hookId));

      // Verify all favorites are deleted
      favorites = await db
        .select()
        .from(schema.favorites)
        .where(eq(schema.favorites.hookId, hookId));
      expect(favorites).toHaveLength(0);
    });
  });

  describe("Bulk Operations", () => {
    it("should handle bulk favorite operations efficiently", async () => {
      const userId = "bulk-user";
      const hookIds = Array.from({ length: 100 }, (_, i) => `bulk-hook-${i}`);

      await db.insert(schema.users).values({
        id: userId,
        email: "bulk@example.com",
        emailVerified: new Date(),
        credits: 10,
      });

      // Create hooks
      await db.insert(schema.hooks).values(
        hookIds.map((hookId, i) => ({
          id: hookId,
          text: `Bulk hook ${i}`,
          category: "tech",
          engagementScore: 7000 + i,
          source: "tiktok",
          isActive: true,
        })),
      );

      // Add all hooks to favorites
      const favorites = hookIds.map((hookId, i) => ({
        id: `bulk-favorite-${i}`,
        userId,
        hookId,
      }));

      await db.insert(schema.favorites).values(favorites);

      // Verify all favorites were added
      const dbFavorites = await db
        .select()
        .from(schema.favorites)
        .where(eq(schema.favorites.userId, userId));
      expect(dbFavorites).toHaveLength(100);

      // Remove all favorites
      await db
        .delete(schema.favorites)
        .where(eq(schema.favorites.userId, userId));

      // Verify all favorites were removed
      const remainingFavorites = await db
        .select()
        .from(schema.favorites)
        .where(eq(schema.favorites.userId, userId));
      expect(remainingFavorites).toHaveLength(0);
    });

    it("should handle concurrent favorite operations", async () => {
      const userId = "concurrent-user";
      const hookId = "concurrent-hook";

      await db.insert(schema.users).values({
        id: userId,
        email: "concurrent@example.com",
        emailVerified: new Date(),
        credits: 10,
      });

      await db.insert(schema.hooks).values({
        id: hookId,
        text: "Concurrent hook",
        category: "tech",
        engagementScore: 8000,
        source: "tiktok",
        isActive: true,
      });

      // Try to add same favorite multiple times concurrently
      const promises = Array.from({ length: 5 }, () =>
        db.insert(schema.favorites).values({
          id: `concurrent-favorite-${Math.random()}`,
          userId,
          hookId,
        }),
      );

      const results = await Promise.allSettled(promises);
      const successes = results.filter((r) => r.status === "fulfilled");
      const failures = results.filter((r) => r.status === "rejected");

      expect(successes).toHaveLength(1);
      expect(failures).toHaveLength(4);
    });

    it("should handle favorite with deactivated hook", async () => {
      const userId = "deactivated-user";
      const hookId = "deactivated-hook";

      await db.insert(schema.users).values({
        id: userId,
        email: "deactivated@example.com",
        emailVerified: new Date(),
        credits: 10,
      });

      // Create active hook, then deactivate it
      await db.insert(schema.hooks).values({
        id: hookId,
        text: "Deactivated hook",
        category: "tech",
        engagementScore: 7500,
        source: "tiktok",
        isActive: true,
      });

      // Add to favorites
      await db.insert(schema.favorites).values({
        id: "deactivated-favorite",
        userId,
        hookId,
      });

      // Deactivate hook
      await db
        .update(schema.hooks)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(schema.hooks.id, hookId));

      // Try to fetch favorites - should not include deactivated hook
      const favorites = await db
        .select({
          favorite: schema.favorites,
          hook: schema.hooks,
        })
        .from(schema.favorites)
        .leftJoin(schema.hooks, eq(schema.favorites.hookId, schema.hooks.id))
        .where(sql`favorites.user_id = ${userId} AND hooks.is_active = 1`);

      expect(favorites).toHaveLength(0);
    });
  });
});
