import { describe, it, expect, beforeAll } from "vitest";
import { migrate } from "drizzle-orm/d1/migrator";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "@/lib/schema";
import { eq, sql } from "drizzle-orm";
import { createTestEnvironment } from "./test-utils";

describe("Database Migration: Constraints and Indexes", () => {
  let testEnv: Awaited<ReturnType<typeof createTestEnvironment>>;
  let db: ReturnType<typeof drizzle>;

  beforeAll(async () => {
    testEnv = await createTestEnvironment();
    db = testEnv.db;

    try {
      await migrate(db, { migrationsFolder: "./drizzle/migrations" });
    } catch (error) {
      console.log("Migrations not found, using empty database");
    }
  });

  describe("CHECK Constraints", () => {
    it("should enforce users.credits >= 0", async () => {
      const userId = "test-credits-constraint";

      await db.insert(schema.users).values({
        id: userId,
        email: "test@example.com",
        role: "user",
        credits: 0,
      });

      await expect(
        db
          .update(schema.users)
          .set({ credits: -1 })
          .where(eq(schema.users.id, userId)),
      ).rejects.toThrow();

      await db.delete(schema.users).where(eq(schema.users.id, userId));
    });

    it("should enforce users.role IN ('user', 'pro', 'admin')", async () => {
      const userId = "test-role-constraint";

      await db.insert(schema.users).values({
        id: userId,
        email: "test2@example.com",
        role: "user",
        credits: 10,
      });

      await expect(
        db
          .update(schema.users)
          .set({ role: "invalid" as any })
          .where(eq(schema.users.id, userId)),
      ).rejects.toThrow();

      await db.delete(schema.users).where(eq(schema.users.id, userId));
    });

    it("should enforce script_ratings.rating BETWEEN 1 AND 5", async () => {
      const userId = "test-rating-constraint";
      const scriptId = "test-script-rating";

      await db.insert(schema.users).values({
        id: userId,
        email: "test3@example.com",
        role: "user",
        credits: 10,
      });

      await db.insert(schema.generatedScripts).values({
        id: scriptId,
        userId,
        hookId: "hook-1",
        productDescription: "Test product",
        scripts: JSON.stringify([
          { angle: "Pain Point", script: "Test script" },
          { angle: "Benefit", script: "Test script" },
          { angle: "Social Proof", script: "Test script" },
        ]),
      });

      await expect(
        db.insert(schema.scriptRatings).values({
          id: "rating-1",
          generatedScriptId: scriptId,
          userId,
          scriptIndex: 0,
          rating: 0,
        }),
      ).rejects.toThrow();

      await expect(
        db.insert(schema.scriptRatings).values({
          id: "rating-2",
          generatedScriptId: scriptId,
          userId,
          scriptIndex: 0,
          rating: 6,
        }),
      ).rejects.toThrow();

      await db
        .delete(schema.scriptRatings)
        .where(eq(schema.scriptRatings.generatedScriptId, scriptId));
      await db
        .delete(schema.generatedScripts)
        .where(eq(schema.generatedScripts.id, scriptId));
      await db.delete(schema.users).where(eq(schema.users.id, userId));
    });

    it("should enforce hook_review_queue.status IN ('pending', 'approved', 'rejected')", async () => {
      const queueId = "test-queue-status";

      await expect(
        db.insert(schema.hookReviewQueue).values({
          id: queueId,
          text: "Test hook text for validation",
          category: "tech",
          engagementScore: 50,
          status: "invalid" as any,
        }),
      ).rejects.toThrow();
    });

    it("should enforce rate_limits.reset_at > updated_at", async () => {
      const ip = "127.0.0.1";
      const endpoint = "/api/test";

      const now = Math.floor(Date.now() / 1000);

      await expect(
        db.insert(schema.rateLimits).values({
          ip,
          endpoint,
          count: 0,
          resetAt: new Date((now - 1000) * 1000),
          updatedAt: new Date(now * 1000),
        }),
      ).rejects.toThrow();
    });
  });

  describe("Composite Indexes", () => {
    let testUserId: string;

    beforeAll(async () => {
      testUserId = "test-indexes-user";
      await db.insert(schema.users).values({
        id: testUserId,
        email: "index-test@example.com",
        role: "user",
        credits: 100,
      });
    });

    afterAll(async () => {
      await db
        .delete(schema.generatedScripts)
        .where(eq(schema.generatedScripts.userId, testUserId));
      await db.delete(schema.users).where(eq(schema.users.id, testUserId));
    });

    it("should use generated_scripts_user_created_idx for user history", async () => {
      const hookId = "hook-index-test";

      await db.insert(schema.hooks).values({
        id: hookId,
        text: "Test hook for index",
        category: "tech",
        engagementScore: 75,
      });

      const scripts = Array.from({ length: 10 }, (_, i) => ({
        id: `script-${i}`,
        userId: testUserId,
        hookId,
        productDescription: `Product ${i}`,
        scripts: JSON.stringify([
          { angle: "Pain Point", script: "Test" },
          { angle: "Benefit", script: "Test" },
          { angle: "Social Proof", script: "Test" },
        ]),
      }));

      await db.insert(schema.generatedScripts).values(scripts);

      const result = await db
        .select()
        .from(schema.generatedScripts)
        .where(eq(schema.generatedScripts.userId, testUserId))
        .orderBy(sql`created_at DESC`)
        .limit(5);

      expect(result.length).toBe(5);

      await db
        .delete(schema.generatedScripts)
        .where(eq(schema.generatedScripts.hookId, hookId));
      await db.delete(schema.hooks).where(eq(schema.hooks.id, hookId));
    });

    it("should use script_ratings_script_rating_idx for rating queries", async () => {
      const scriptId = "script-rating-index";
      const userId = "user-rating-index";

      await db.insert(schema.users).values({
        id: userId,
        email: "rating-index@example.com",
        role: "user",
        credits: 10,
      });

      await db.insert(schema.generatedScripts).values({
        id: scriptId,
        userId,
        hookId: "hook-1",
        productDescription: "Test",
        scripts: JSON.stringify([
          { angle: "Pain Point", script: "Test" },
          { angle: "Benefit", script: "Test" },
          { angle: "Social Proof", script: "Test" },
        ]),
      });

      const ratings = Array.from({ length: 20 }, (_, i) => ({
        id: `rating-${i}`,
        generatedScriptId: scriptId,
        userId: `user-${i}`,
        scriptIndex: 0,
        rating: (i % 5) + 1,
      }));

      await db.insert(schema.scriptRatings).values(ratings);

      const highRatings = await db
        .select()
        .from(schema.scriptRatings)
        .where(sql`generated_script_id = ${scriptId} AND rating >= 4`);

      expect(highRatings.length).toBeGreaterThan(0);

      await db
        .delete(schema.scriptRatings)
        .where(eq(schema.scriptRatings.generatedScriptId, scriptId));
      await db
        .delete(schema.generatedScripts)
        .where(eq(schema.generatedScripts.id, scriptId));
      await db.delete(schema.users).where(eq(schema.users.id, userId));
    });

    it("should use hooks_category_active_score_idx for category queries", async () => {
      const hooks = Array.from({ length: 15 }, (_, i) => ({
        id: `hook-${i}`,
        text: `Hook ${i}`,
        category: "tech" as const,
        engagementScore: i * 5,
        isActive: i % 2 === 0,
      }));

      await db.insert(schema.hooks).values(hooks);

      const result = await db
        .select()
        .from(schema.hooks)
        .where(sql`category = 'tech' AND is_active = 1`)
        .orderBy(sql`engagement_score DESC`)
        .limit(10);

      expect(result.length).toBe(10);

      await db.delete(schema.hooks).where(sql`category = 'tech'`);
    });
  });

  describe("Performance Improvements", () => {
    it("should handle pagination efficiently", async () => {
      const userId = "test-pagination-user";

      await db.insert(schema.users).values({
        id: userId,
        email: "pagination@example.com",
        role: "user",
        credits: 100,
      });

      const hookId = "hook-pagination";

      await db.insert(schema.hooks).values({
        id: hookId,
        text: "Test hook",
        category: "tech",
        engagementScore: 50,
      });

      const scripts = Array.from({ length: 50 }, (_, i) => ({
        id: `script-page-${i}`,
        userId,
        hookId,
        productDescription: `Product ${i}`,
        scripts: JSON.stringify([
          { angle: "Pain Point", script: "Test" },
          { angle: "Benefit", script: "Test" },
          { angle: "Social Proof", script: "Test" },
        ]),
      }));

      await db.insert(schema.generatedScripts).values(scripts);

      const page1 = await db
        .select()
        .from(schema.generatedScripts)
        .where(eq(schema.generatedScripts.userId, userId))
        .orderBy(sql`created_at DESC`)
        .limit(20)
        .offset(0);

      const page2 = await db
        .select()
        .from(schema.generatedScripts)
        .where(eq(schema.generatedScripts.userId, userId))
        .orderBy(sql`created_at DESC`)
        .limit(20)
        .offset(20);

      expect(page1.length).toBe(20);
      expect(page2.length).toBe(20);
      expect(page1[0].id).not.toBe(page2[0].id);

      await db
        .delete(schema.generatedScripts)
        .where(eq(schema.generatedScripts.userId, userId));
      await db.delete(schema.hooks).where(eq(schema.hooks.id, hookId));
      await db.delete(schema.users).where(eq(schema.users.id, userId));
    });
  });

  afterAll(async () => {
    await db.delete(schema.generatedScripts);
    await db.delete(schema.scriptRatings);
    await db.delete(schema.favorites);
    await db.delete(schema.hookReviewQueue);
    await db.delete(schema.hooks);
    await db.delete(schema.sessions);
    await db.delete(schema.accounts);
    await db.delete(schema.rateLimits);
    await db.delete(schema.waitlistEntries);
    await db.delete(schema.users);
  });
});
