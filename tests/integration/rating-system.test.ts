import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  createTestEnvironment,
  cleanupTestDatabase,
  createTestUser,
  createTestHook,
  createTestScript,
} from "./test-utils";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "@/lib/schema";
import { eq, sql, desc, avg } from "drizzle-orm";

describe("Rating System Integration Tests", () => {
  let testEnv: Awaited<ReturnType<typeof createTestEnvironment>>;
  let db: ReturnType<typeof drizzle>;

  beforeAll(async () => {
    testEnv = await createTestEnvironment();
    db = testEnv.db;
  });

  afterAll(async () => {
    await cleanupTestDatabase(db);
  });

  describe("Rating Creation", () => {
    it("should create a script rating", async () => {
      const userId = "rating-user";
      const scriptId = "rating-script";

      // Create user and script
      await db.insert(schema.users).values({
        id: userId,
        email: "rating@example.com",
        emailVerified: new Date(),
        credits: 10,
      });

      await db.insert(schema.hooks).values({
        id: "rating-hook",
        text: "Rating test hook",
        category: "tech",
        engagementScore: 8000,
        source: "tiktok",
        isActive: true,
      });

      await db.insert(schema.generatedScripts).values({
        id: scriptId,
        userId,
        hookId: "rating-hook",
        productDescription: "Rating test product",
        scripts: JSON.stringify([
          { angle: "Pain Point", script: "Test script" },
        ]),
      });

      // Create rating
      const ratingData = {
        id: "rating-1",
        generatedScriptId: scriptId,
        userId,
        scriptIndex: 0,
        rating: 5,
      };

      const result = await db
        .insert(schema.scriptRatings)
        .values(ratingData)
        .returning();
      const rating = result[0];

      expect(rating).toMatchObject({
        id: "rating-1",
        generatedScriptId: scriptId,
        userId,
        scriptIndex: 0,
        rating: 5,
      });

      // Verify rating exists
      const dbRating = await db
        .select()
        .from(schema.scriptRatings)
        .where(eq(schema.scriptRatings.id, rating.id));
      expect(dbRating).toHaveLength(1);
    });

    it("should enforce rating value constraints", async () => {
      const userId = "constraint-user";
      const scriptId = "constraint-script";

      // Create user and script
      await db.insert(schema.users).values({
        id: userId,
        email: "constraint@example.com",
        emailVerified: new Date(),
        credits: 10,
      });

      await db.insert(schema.hooks).values({
        id: "constraint-hook",
        text: "Constraint test hook",
        category: "fitness",
        engagementScore: 7500,
        source: "tiktok",
        isActive: true,
      });

      await db.insert(schema.generatedScripts).values({
        id: scriptId,
        userId,
        hookId: "constraint-hook",
        productDescription: "Constraint test product",
        scripts: JSON.stringify([
          { angle: "Pain Point", script: "Test script" },
        ]),
      });

      // Try to create rating with value 0 - should fail
      await expect(
        db.insert(schema.scriptRatings).values({
          id: "rating-0",
          generatedScriptId: scriptId,
          userId,
          scriptIndex: 0,
          rating: 0,
        }),
      ).rejects.toThrow();

      // Try to create rating with value 6 - should fail
      await expect(
        db.insert(schema.scriptRatings).values({
          id: "rating-6",
          generatedScriptId: scriptId,
          userId,
          scriptIndex: 0,
          rating: 6,
        }),
      ).rejects.toThrow();
    });

    it("should enforce unique rating constraint for user-script combination", async () => {
      const userId = "unique-rating-user";
      const scriptId = "unique-rating-script";

      // Create user and script
      await db.insert(schema.users).values({
        id: userId,
        email: "unique-rating@example.com",
        emailVerified: new Date(),
        credits: 10,
      });

      await db.insert(schema.hooks).values({
        id: "unique-rating-hook",
        text: "Unique rating test hook",
        category: "tech",
        engagementScore: 8500,
        source: "tiktok",
        isActive: true,
      });

      await db.insert(schema.generatedScripts).values({
        id: scriptId,
        userId,
        hookId: "unique-rating-hook",
        productDescription: "Unique rating test product",
        scripts: JSON.stringify([
          { angle: "Pain Point", script: "Test script" },
        ]),
      });

      // Create first rating
      await db.insert(schema.scriptRatings).values({
        id: "unique-rating-1",
        generatedScriptId: scriptId,
        userId,
        scriptIndex: 0,
        rating: 4,
      });

      // Try to create another rating for same user and script - should fail
      await expect(
        db.insert(schema.scriptRatings).values({
          id: "unique-rating-2",
          generatedScriptId: scriptId,
          userId,
          scriptIndex: 0,
          rating: 5,
        }),
      ).rejects.toThrow();
    });

    it("should allow multiple ratings for different scripts", async () => {
      const userId = "multiple-scripts-user";
      const scriptId1 = "multiple-script-1";
      const scriptId2 = "multiple-script-2";

      // Create user
      await db.insert(schema.users).values({
        id: userId,
        email: "multiple-scripts@example.com",
        emailVerified: new Date(),
        credits: 10,
      });

      // Create hooks
      await db.insert(schema.hooks).values([
        {
          id: "multiple-hook-1",
          text: "Multiple test hook 1",
          category: "tech",
          engagementScore: 8000,
          source: "tiktok",
          isActive: true,
        },
        {
          id: "multiple-hook-2",
          text: "Multiple test hook 2",
          category: "fitness",
          engagementScore: 8500,
          source: "tiktok",
          isActive: true,
        },
      ]);

      // Create scripts
      await db.insert(schema.generatedScripts).values([
        {
          id: scriptId1,
          userId,
          hookId: "multiple-hook-1",
          productDescription: "Multiple test product 1",
          scripts: JSON.stringify([
            { angle: "Pain Point", script: "Test script 1" },
          ]),
        },
        {
          id: scriptId2,
          userId,
          hookId: "multiple-hook-2",
          productDescription: "Multiple test product 2",
          scripts: JSON.stringify([
            { angle: "Pain Point", script: "Test script 2" },
          ]),
        },
      ]);

      // Create ratings for different scripts
      await db.insert(schema.scriptRatings).values([
        {
          id: "multiple-rating-1",
          generatedScriptId: scriptId1,
          userId,
          scriptIndex: 0,
          rating: 5,
        },
        {
          id: "multiple-rating-2",
          generatedScriptId: scriptId2,
          userId,
          scriptIndex: 0,
          rating: 4,
        },
      ]);

      // Verify both ratings exist
      const ratings = await db.select().from(schema.scriptRatings);
      expect(ratings).toHaveLength(2);
    });
  });

  describe("Rating Updates", () => {
    it("should update an existing rating", async () => {
      const userId = "update-rating-user";
      const scriptId = "update-rating-script";

      // Create user and script
      await db.insert(schema.users).values({
        id: userId,
        email: "update-rating@example.com",
        emailVerified: new Date(),
        credits: 10,
      });

      await db.insert(schema.hooks).values({
        id: "update-rating-hook",
        text: "Update rating test hook",
        category: "beauty",
        engagementScore: 9000,
        source: "tiktok",
        isActive: true,
      });

      await db.insert(schema.generatedScripts).values({
        id: scriptId,
        userId,
        hookId: "update-rating-hook",
        productDescription: "Update rating test product",
        scripts: JSON.stringify([
          { angle: "Pain Point", script: "Test script" },
        ]),
      });

      // Create initial rating
      const initialRating = {
        id: "update-rating-1",
        generatedScriptId: scriptId,
        userId,
        scriptIndex: 0,
        rating: 3,
      };

      await db.insert(schema.scriptRatings).values(initialRating);

      // Update rating
      const result = await db
        .update(schema.scriptRatings)
        .set({
          rating: 5,
          updatedAt: new Date(),
        })
        .where(eq(schema.scriptRatings.id, initialRating.id))
        .returning();

      expect(result[0].rating).toBe(5);

      // Verify update
      const updatedRating = await db
        .select()
        .from(schema.scriptRatings)
        .where(eq(schema.scriptRatings.id, initialRating.id));
      expect(updatedRating[0].rating).toBe(5);
    });

    it("should update aggregated rating when individual rating changes", async () => {
      const userId = "aggregated-rating-user";
      const scriptId = "aggregated-rating-script";

      // Create user and script
      await db.insert(schema.users).values({
        id: userId,
        email: "aggregated-rating@example.com",
        emailVerified: new Date(),
        credits: 10,
      });

      await db.insert(schema.hooks).values({
        id: "aggregated-rating-hook",
        text: "Aggregated rating test hook",
        category: "finance",
        engagementScore: 7500,
        source: "tiktok",
        isActive: true,
      });

      await db.insert(schema.generatedScripts).values({
        id: scriptId,
        userId,
        hookId: "aggregated-rating-hook",
        productDescription: "Aggregated rating test product",
        scripts: JSON.stringify([
          { angle: "Pain Point", script: "Test script" },
        ]),
      });

      // Create multiple ratings for the same script
      await db.insert(schema.scriptRatings).values([
        {
          id: "aggregated-rating-1",
          generatedScriptId: scriptId,
          userId: "user-1",
          scriptIndex: 0,
          rating: 5,
        },
        {
          id: "aggregated-rating-2",
          generatedScriptId: scriptId,
          userId: "user-2",
          scriptIndex: 0,
          rating: 4,
        },
        {
          id: "aggregated-rating-3",
          generatedScriptId: scriptId,
          userId: "user-3",
          scriptIndex: 0,
          rating: 3,
        },
      ]);

      // Calculate average rating
      const averageRating = await db
        .select({ avg: avg(schema.scriptRatings.rating) })
        .from(schema.scriptRatings)
        .where(eq(schema.scriptRatings.generatedScriptId, scriptId));

      expect(averageRating[0].avg).toBeCloseTo(4, 0); // (5 + 4 + 3) / 3 = 4

      // Update one rating
      await db
        .update(schema.scriptRatings)
        .set({
          rating: 2,
          updatedAt: new Date(),
        })
        .where(eq(schema.scriptRatings.id, "aggregated-rating-1"));

      // Verify average changed
      const updatedAverage = await db
        .select({ avg: avg(schema.scriptRatings.rating) })
        .from(schema.scriptRatings)
        .where(eq(schema.scriptRatings.generatedScriptId, scriptId));

      expect(updatedAverage[0].avg).toBeCloseTo(3, 0); // (2 + 4 + 3) / 3 = 3
    });
  });

  describe("Rating Aggregation", () => {
    it("should calculate average rating for a script", async () => {
      const userId = "avg-rating-user";
      const scriptId = "avg-rating-script";

      // Create user and script
      await db.insert(schema.users).values({
        id: userId,
        email: "avg-rating@example.com",
        emailVerified: new Date(),
        credits: 10,
      });

      await db.insert(schema.hooks).values({
        id: "avg-rating-hook",
        text: "Average rating test hook",
        category: "tech",
        engagementScore: 8000,
        source: "tiktok",
        isActive: true,
      });

      await db.insert(schema.generatedScripts).values({
        id: scriptId,
        userId,
        hookId: "avg-rating-hook",
        productDescription: "Average rating test product",
        scripts: JSON.stringify([
          { angle: "Pain Point", script: "Test script" },
        ]),
      });

      // Create multiple ratings
      const ratings = [5, 4, 3, 2, 5];
      await db.insert(schema.scriptRatings).values(
        ratings.map((rating, index) => ({
          id: `avg-rating-${index + 1}`,
          generatedScriptId: scriptId,
          userId: `user-${index + 1}`,
          scriptIndex: 0,
          rating,
        })),
      );

      // Calculate average
      const average = await db
        .select({ avg: avg(schema.scriptRatings.rating) })
        .from(schema.scriptRatings)
        .where(eq(schema.scriptRatings.generatedScriptId, scriptId));

      expect(average[0].avg).toBeCloseTo(3.8, 0); // (5 + 4 + 3 + 2 + 5) / 5 = 3.8
    });

    it("should handle case with no ratings", async () => {
      const userId = "no-ratings-user";
      const scriptId = "no-ratings-script";

      // Create user and script
      await db.insert(schema.users).values({
        id: userId,
        email: "no-ratings@example.com",
        emailVerified: new Date(),
        credits: 10,
      });

      await db.insert(schema.hooks).values({
        id: "no-ratings-hook",
        text: "No ratings test hook",
        category: "fitness",
        engagementScore: 8500,
        source: "tiktok",
        isActive: true,
      });

      await db.insert(schema.generatedScripts).values({
        id: scriptId,
        userId,
        hookId: "no-ratings-hook",
        productDescription: "No ratings test product",
        scripts: JSON.stringify([
          { angle: "Pain Point", script: "Test script" },
        ]),
      });

      // Try to calculate average for script with no ratings
      const average = await db
        .select({ avg: avg(schema.scriptRatings.rating) })
        .from(schema.scriptRatings)
        .where(eq(schema.scriptRatings.generatedScriptId, scriptId));

      // Should return null for average
      expect(average[0].avg).toBeNull();
    });

    it("should count total ratings for a script", async () => {
      const userId = "count-ratings-user";
      const scriptId = "count-ratings-script";

      // Create user and script
      await db.insert(schema.users).values({
        id: userId,
        email: "count-ratings@example.com",
        emailVerified: new Date(),
        credits: 10,
      });

      await db.insert(schema.hooks).values({
        id: "count-ratings-hook",
        text: "Count ratings test hook",
        category: "beauty",
        engagementScore: 9000,
        source: "tiktok",
        isActive: true,
      });

      await db.insert(schema.generatedScripts).values({
        id: scriptId,
        userId,
        hookId: "count-ratings-hook",
        productDescription: "Count ratings test product",
        scripts: JSON.stringify([
          { angle: "Pain Point", script: "Test script" },
        ]),
      });

      // Create multiple ratings
      await db.insert(schema.scriptRatings).values(
        Array.from({ length: 10 }, (_, i) => ({
          id: `count-rating-${i + 1}`,
          generatedScriptId: scriptId,
          userId: `user-${i + 1}`,
          scriptIndex: 0,
          rating: (i % 5) + 1, // Ratings from 1 to 5
        })),
      );

      // Count ratings
      const count = await db
        .select({ count: sql`count(*)` })
        .from(schema.scriptRatings)
        .where(eq(schema.scriptRatings.generatedScriptId, scriptId));

      expect(count[0].count).toBe(10);
    });

    it("should calculate rating distribution", async () => {
      const userId = "distribution-user";
      const scriptId = "distribution-script";

      // Create user and script
      await db.insert(schema.users).values({
        id: userId,
        email: "distribution@example.com",
        emailVerified: new Date(),
        credits: 10,
      });

      await db.insert(schema.hooks).values({
        id: "distribution-hook",
        text: "Distribution test hook",
        category: "finance",
        engagementScore: 7500,
        source: "tiktok",
        isActive: true,
      });

      await db.insert(schema.generatedScripts).values({
        id: scriptId,
        userId,
        hookId: "distribution-hook",
        productDescription: "Distribution test product",
        scripts: JSON.stringify([
          { angle: "Pain Point", script: "Test script" },
        ]),
      });

      // Create ratings with distribution
      await db.insert(schema.scriptRatings).values([
        {
          id: "dist-1",
          generatedScriptId: scriptId,
          userId: "u1",
          scriptIndex: 0,
          rating: 5,
        },
        {
          id: "dist-2",
          generatedScriptId: scriptId,
          userId: "u2",
          scriptIndex: 0,
          rating: 5,
        },
        {
          id: "dist-3",
          generatedScriptId: scriptId,
          userId: "u3",
          scriptIndex: 0,
          rating: 5,
        },
        {
          id: "dist-4",
          generatedScriptId: scriptId,
          userId: "u4",
          scriptIndex: 0,
          rating: 4,
        },
        {
          id: "dist-5",
          generatedScriptId: scriptId,
          userId: "u5",
          scriptIndex: 0,
          rating: 4,
        },
        {
          id: "dist-6",
          generatedScriptId: scriptId,
          userId: "u6",
          scriptIndex: 0,
          rating: 3,
        },
        {
          id: "dist-7",
          generatedScriptId: scriptId,
          userId: "u7",
          scriptIndex: 0,
          rating: 3,
        },
        {
          id: "dist-8",
          generatedScriptId: scriptId,
          userId: "u8",
          scriptIndex: 0,
          rating: 2,
        },
        {
          id: "dist-9",
          generatedScriptId: scriptId,
          userId: "u9",
          scriptIndex: 0,
          rating: 1,
        },
      ]);

      // Calculate rating distribution
      const distribution = await db
        .select({
          rating: schema.scriptRatings.rating,
          count: sql`count(*)`,
        })
        .from(schema.scriptRatings)
        .where(eq(schema.scriptRatings.generatedScriptId, scriptId))
        .groupBy(schema.scriptRatings.rating)
        .orderBy(schema.scriptRatings.rating);

      // Verify distribution
      const distributionMap = new Map(
        distribution.map((d) => [d.rating, d.count]),
      );
      expect(distributionMap.get(5)).toBe(3); // 3 five-star ratings
      expect(distributionMap.get(4)).toBe(2); // 2 four-star ratings
      expect(distributionMap.get(3)).toBe(2); // 2 three-star ratings
      expect(distributionMap.get(2)).toBe(1); // 1 two-star rating
      expect(distributionMap.get(1)).toBe(1); // 1 one-star rating
    });
  });

  describe("Rating Queries", () => {
    it("should fetch ratings by user", async () => {
      const userId = "user-ratings-user";
      const scriptId1 = "user-ratings-script-1";
      const scriptId2 = "user-ratings-script-2";

      // Create user
      await db.insert(schema.users).values({
        id: userId,
        email: "user-ratings@example.com",
        emailVerified: new Date(),
        credits: 10,
      });

      // Create hooks and scripts
      await db.insert(schema.hooks).values([
        {
          id: "user-ratings-hook-1",
          text: "User ratings test hook 1",
          category: "tech",
          engagementScore: 8000,
          source: "tiktok",
          isActive: true,
        },
        {
          id: "user-ratings-hook-2",
          text: "User ratings test hook 2",
          category: "fitness",
          engagementScore: 8500,
          source: "tiktok",
          isActive: true,
        },
      ]);

      await db.insert(schema.generatedScripts).values([
        {
          id: scriptId1,
          userId,
          hookId: "user-ratings-hook-1",
          productDescription: "User ratings test product 1",
          scripts: JSON.stringify([
            { angle: "Pain Point", script: "Test script 1" },
          ]),
        },
        {
          id: scriptId2,
          userId,
          hookId: "user-ratings-hook-2",
          productDescription: "User ratings test product 2",
          scripts: JSON.stringify([
            { angle: "Pain Point", script: "Test script 2" },
          ]),
        },
      ]);

      // Create ratings
      await db.insert(schema.scriptRatings).values([
        {
          id: "user-rating-1",
          generatedScriptId: scriptId1,
          userId,
          scriptIndex: 0,
          rating: 5,
        },
        {
          id: "user-rating-2",
          generatedScriptId: scriptId2,
          userId,
          scriptIndex: 0,
          rating: 4,
        },
      ]);

      // Fetch user's ratings
      const userRatings = await db
        .select()
        .from(schema.scriptRatings)
        .where(eq(schema.scriptRatings.userId, userId));

      expect(userRatings).toHaveLength(2);
      expect(userRatings.map((r) => r.rating).sort()).toEqual([4, 5]);
    });

    it("should fetch ratings by script", async () => {
      const userId1 = "script-ratings-user-1";
      const userId2 = "script-ratings-user-2";
      const userId3 = "script-ratings-user-3";
      const scriptId = "script-ratings-script";

      // Create users
      await db.insert(schema.users).values([
        {
          id: userId1,
          email: "script-ratings-1@example.com",
          emailVerified: new Date(),
          credits: 10,
        },
        {
          id: userId2,
          email: "script-ratings-2@example.com",
          emailVerified: new Date(),
          credits: 10,
        },
        {
          id: userId3,
          email: "script-ratings-3@example.com",
          emailVerified: new Date(),
          credits: 10,
        },
      ]);

      await db.insert(schema.hooks).values({
        id: "script-ratings-hook",
        text: "Script ratings test hook",
        category: "beauty",
        engagementScore: 9000,
        source: "tiktok",
        isActive: true,
      });

      await db.insert(schema.generatedScripts).values({
        id: scriptId,
        userId: userId1,
        hookId: "script-ratings-hook",
        productDescription: "Script ratings test product",
        scripts: JSON.stringify([
          { angle: "Pain Point", script: "Test script" },
        ]),
      });

      // Create ratings for the same script
      await db.insert(schema.scriptRatings).values([
        {
          id: "script-rating-1",
          generatedScriptId: scriptId,
          userId: userId1,
          scriptIndex: 0,
          rating: 5,
        },
        {
          id: "script-rating-2",
          generatedScriptId: scriptId,
          userId: userId2,
          scriptIndex: 0,
          rating: 4,
        },
        {
          id: "script-rating-3",
          generatedScriptId: scriptId,
          userId: userId3,
          scriptIndex: 0,
          rating: 3,
        },
      ]);

      // Fetch ratings for the script
      const scriptRatings = await db
        .select()
        .from(schema.scriptRatings)
        .where(eq(schema.scriptRatings.generatedScriptId, scriptId))
        .orderBy(schema.scriptRatings.createdAt);

      expect(scriptRatings).toHaveLength(3);
      expect(scriptRatings.map((r) => r.rating)).toEqual([5, 4, 3]);
    });

    it("should handle script with multiple angles", async () => {
      const userId = "multi-angle-user";
      const scriptId = "multi-angle-script";

      // Create user
      await db.insert(schema.users).values({
        id: userId,
        email: "multi-angle@example.com",
        emailVerified: new Date(),
        credits: 10,
      });

      await db.insert(schema.hooks).values({
        id: "multi-angle-hook",
        text: "Multi angle test hook",
        category: "tech",
        engagementScore: 8500,
        source: "tiktok",
        isActive: true,
      });

      await db.insert(schema.generatedScripts).values({
        id: scriptId,
        userId,
        hookId: "multi-angle-hook",
        productDescription: "Multi angle test product",
        scripts: JSON.stringify([
          { angle: "Pain Point", script: "Pain Point script" },
          { angle: "Benefit", script: "Benefit script" },
          { angle: "Social Proof", script: "Social Proof script" },
        ]),
      });

      // Create ratings for different angles
      await db.insert(schema.scriptRatings).values([
        {
          id: "multi-angle-rating-1",
          generatedScriptId: scriptId,
          userId,
          scriptIndex: 0, // Pain Point
          rating: 5,
        },
        {
          id: "multi-angle-rating-2",
          generatedScriptId: scriptId,
          userId,
          scriptIndex: 1, // Benefit
          rating: 4,
        },
        {
          id: "multi-angle-rating-3",
          generatedScriptId: scriptId,
          userId,
          scriptIndex: 2, // Social Proof
          rating: 3,
        },
      ]);

      // Fetch all ratings for the script
      const ratings = await db
        .select()
        .from(schema.scriptRatings)
        .where(eq(schema.scriptRatings.generatedScriptId, scriptId))
        .orderBy(schema.scriptRatings.scriptIndex);

      expect(ratings).toHaveLength(3);
      expect(ratings.map((r) => r.rating)).toEqual([5, 4, 3]);
    });

    it("should delete ratings when script is deleted", async () => {
      const userId = "delete-ratings-user";
      const scriptId = "delete-ratings-script";

      // Create user and script
      await db.insert(schema.users).values({
        id: userId,
        email: "delete-ratings@example.com",
        emailVerified: new Date(),
        credits: 10,
      });

      await db.insert(schema.hooks).values({
        id: "delete-ratings-hook",
        text: "Delete ratings test hook",
        category: "fitness",
        engagementScore: 8000,
        source: "tiktok",
        isActive: true,
      });

      await db.insert(schema.generatedScripts).values({
        id: scriptId,
        userId,
        hookId: "delete-ratings-hook",
        productDescription: "Delete ratings test product",
        scripts: JSON.stringify([
          { angle: "Pain Point", script: "Test script" },
        ]),
      });

      // Create ratings
      await db.insert(schema.scriptRatings).values([
        {
          id: "delete-rating-1",
          generatedScriptId: scriptId,
          userId,
          scriptIndex: 0,
          rating: 5,
        },
        {
          id: "delete-rating-2",
          generatedScriptId: scriptId,
          userId,
          scriptIndex: 0,
          rating: 4,
        },
      ]);

      // Verify ratings exist
      let ratings = await db
        .select()
        .from(schema.scriptRatings)
        .where(eq(schema.scriptRatings.generatedScriptId, scriptId));
      expect(ratings).toHaveLength(2);

      // Delete script
      await db
        .delete(schema.generatedScripts)
        .where(eq(schema.generatedScripts.id, scriptId));

      // Verify ratings are also deleted
      ratings = await db
        .select()
        .from(schema.scriptRatings)
        .where(eq(schema.scriptRatings.generatedScriptId, scriptId));
      expect(ratings).toHaveLength(0);
    });
  });
});
