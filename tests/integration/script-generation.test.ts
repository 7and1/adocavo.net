import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  createTestEnvironment,
  cleanupTestDatabase,
  createTestUser,
  createTestHook,
  createTestScript,
  resetRateLimit,
} from "./test-utils";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "@/lib/schema";
import { eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { getBindings } from "@/lib/cloudflare";

describe("Script Generation Flow Integration Tests", () => {
  let testEnv: Awaited<ReturnType<typeof createTestEnvironment>>;
  let db: ReturnType<typeof drizzle>;

  beforeAll(async () => {
    testEnv = await createTestEnvironment();
    db = testEnv.db;
  });

  afterAll(async () => {
    await cleanupTestDatabase(db);
  });

  describe("Hook Management", () => {
    it("should create a new hook", async () => {
      const hookData = {
        id: "test-hook-generation",
        text: "Stop scrolling if you have acne",
        category: "beauty",
        engagementScore: 9500,
        source: "tiktok",
        isActive: true,
      };

      const result = await db.insert(schema.hooks).values(hookData).returning();
      const hook = result[0];

      expect(hook).toMatchObject({
        id: "test-hook-generation",
        text: "Stop scrolling if you have acne",
        category: "beauty",
        engagementScore: 9500,
        source: "tiktok",
        isActive: true,
      });

      // Verify hook exists
      const dbHook = await db
        .select()
        .from(schema.hooks)
        .where(eq(schema.hooks.id, hook.id));
      expect(dbHook).toHaveLength(1);
    });

    it("should fetch active hooks by category", async () => {
      // Create test hooks
      const hooks = [
        {
          id: "category-hook-1",
          text: "Beauty hook 1",
          category: "beauty",
          engagementScore: 9000,
          source: "tiktok",
          isActive: true,
        },
        {
          id: "category-hook-2",
          text: "Beauty hook 2",
          category: "beauty",
          engagementScore: 8500,
          source: "tiktok",
          isActive: true,
        },
        {
          id: "category-hook-3",
          text: "Fitness hook",
          category: "fitness",
          engagementScore: 9200,
          source: "tiktok",
          isActive: true,
        },
        {
          id: "inactive-hook",
          text: "Inactive hook",
          category: "beauty",
          engagementScore: 9500,
          source: "tiktok",
          isActive: false,
        },
      ];

      await db.insert(schema.hooks).values(hooks);

      // Fetch active beauty hooks
      const beautyHooks = await db
        .select()
        .from(schema.hooks)
        .where(sql`category = 'beauty' AND is_active = 1`)
        .orderBy(sql`engagement_score DESC`);

      expect(beautyHooks).toHaveLength(2);
      expect(beautyHooks[0].text).toBe("Beauty hook 1");
      expect(beautyHooks[1].text).toBe("Beauty hook 2");

      // Verify inactive hook is not included
      const inactiveHooks = await db
        .select()
        .from(schema.hooks)
        .where(sql`category = 'beauty' AND is_active = 1`);
      expect(inactiveHooks).toHaveLength(2);
    });

    it("should deactivate a hook", async () => {
      const hookId = "deactivate-hook-test";

      // Create active hook
      await db.insert(schema.hooks).values({
        id: hookId,
        text: "Test hook to deactivate",
        category: "beauty",
        engagementScore: 8000,
        source: "tiktok",
        isActive: true,
      });

      // Deactivate hook
      const result = await db
        .update(schema.hooks)
        .set({
          isActive: false,
          updatedAt: new Date(),
        })
        .where(eq(schema.hooks.id, hookId))
        .returning();

      expect(result[0].isActive).toBe(false);

      // Verify deactivation
      const deactivatedHook = await db
        .select()
        .from(schema.hooks)
        .where(eq(schema.hooks.id, hookId));
      expect(deactivatedHook[0].isActive).toBe(false);
    });

    it("should enforce unique hook text constraint", async () => {
      const hookText = "Unique test hook";

      // Insert first hook
      await db.insert(schema.hooks).values({
        id: "hook-1",
        text: hookText,
        category: "tech",
        engagementScore: 5000,
        source: "tiktok",
        isActive: true,
      });

      // Try to insert hook with same text - should fail
      await expect(
        db.insert(schema.hooks).values({
          id: "hook-2",
          text: hookText,
          category: "tech",
          engagementScore: 6000,
          source: "tiktok",
          isActive: true,
        }),
      ).rejects.toThrow();
    });
  });

  describe("Script Generation", () => {
    it("should generate and save a script", async () => {
      const userId = "script-gen-user";
      const hookId = "script-gen-hook";

      // Create user and hook
      await db.insert(schema.users).values({
        id: userId,
        email: "scriptgen@example.com",
        emailVerified: new Date(),
        credits: 10,
      });

      await db.insert(schema.hooks).values({
        id: hookId,
        text: "Test hook for script generation",
        category: "tech",
        engagementScore: 8500,
        source: "tiktok",
        isActive: true,
      });

      // Generate script (simulating the actual generation)
      const scriptData = {
        id: "generated-script-1",
        userId,
        hookId,
        productDescription: "AI-powered productivity tool for remote teams",
        scripts: JSON.stringify([
          {
            angle: "Pain Point",
            script:
              "[Visual: Frustrated team members struggling with coordination]",
          },
          {
            angle: "Benefit",
            script: "[Visual: Smooth team collaboration with AI assistance]",
          },
          {
            angle: "Social Proof",
            script: "[Visual: Customer testimonials and growth metrics]",
          },
        ]),
      };

      const result = await db
        .insert(schema.generatedScripts)
        .values(scriptData)
        .returning();
      const script = result[0];

      expect(script).toMatchObject({
        id: "generated-script-1",
        userId,
        hookId,
        productDescription: "AI-powered productivity tool for remote teams",
      });

      // Verify saved script
      const savedScript = await db
        .select()
        .from(schema.generatedScripts)
        .where(eq(schema.generatedScripts.id, script.id));
      expect(savedScript).toHaveLength(1);
      expect(savedScript[0].scripts).toBeDefined();
    });

    it("should deduct credits on script generation", async () => {
      const userId = "credits-deduction-user";
      const hookId = "credits-deduction-hook";
      const initialCredits = 10;

      // Create user and hook
      await db.insert(schema.users).values({
        id: userId,
        email: "credits@example.com",
        emailVerified: new Date(),
        credits: initialCredits,
      });

      await db.insert(schema.hooks).values({
        id: hookId,
        text: "Test hook for credit deduction",
        category: "tech",
        engagementScore: 7500,
        source: "tiktok",
        isActive: true,
      });

      // Generate script
      await db.insert(schema.generatedScripts).values({
        id: "credit-script-1",
        userId,
        hookId,
        productDescription: "Credit test product",
        scripts: JSON.stringify([
          { angle: "Pain Point", script: "Test script" },
        ]),
      });

      // Verify credits deducted
      const user = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, userId));
      expect(user[0].credits).toBe(initialCredits - 1);
    });

    it("should fail to generate script with insufficient credits", async () => {
      const userId = "insufficient-credits-user";
      const hookId = "insufficient-credits-hook";

      // Create user with 0 credits
      await db.insert(schema.users).values({
        id: userId,
        email: "no-credits@example.com",
        emailVerified: new Date(),
        credits: 0,
      });

      await db.insert(schema.hooks).values({
        id: hookId,
        text: "Test hook for insufficient credits",
        category: "tech",
        engagementScore: 7000,
        source: "tiktok",
        isActive: true,
      });

      // Try to generate script - should fail
      await expect(
        db.insert(schema.generatedScripts).values({
          id: "no-credits-script",
          userId,
          hookId,
          productDescription: "No credits product",
          scripts: JSON.stringify([
            { angle: "Pain Point", script: "Test script" },
          ]),
        }),
      ).rejects.toThrow("INSUFFICIENT_CREDITS");
    });

    it("should save multiple angles in a single script", async () => {
      const userId = "multi-angle-user";
      const hookId = "multi-angle-hook";

      // Create user and hook
      await db.insert(schema.users).values({
        id: userId,
        email: "multi-angle@example.com",
        emailVerified: new Date(),
        credits: 20,
      });

      await db.insert(schema.hooks).values({
        id: hookId,
        text: "Multi angle test hook",
        category: "fitness",
        engagementScore: 9000,
        source: "tiktok",
        isActive: true,
      });

      // Generate script with multiple angles
      const scriptData = {
        id: "multi-angle-script",
        userId,
        hookId,
        productDescription: "Multi-feature fitness app",
        scripts: JSON.stringify([
          {
            angle: "Pain Point",
            script: "[Visual: Person struggling with traditional workouts]",
          },
          {
            angle: "Benefit",
            script: "[Visual: Person using app and getting fit]",
          },
          {
            angle: "Social Proof",
            script: "[Visual: User success stories and testimonials]",
          },
          {
            angle: "Urgency",
            script: "[Visual: Limited time offer countdown]",
          },
        ]),
      };

      const result = await db
        .insert(schema.generatedScripts)
        .values(scriptData)
        .returning();
      const script = result[0];

      // Verify all angles are saved
      const savedScript = await db
        .select()
        .from(schema.generatedScripts)
        .where(eq(schema.generatedScripts.id, script.id));
      expect(savedScript[0].scripts).toBeDefined();

      // Parse and verify angles
      const angles = JSON.parse(savedScript[0].scripts);
      expect(angles).toHaveLength(4);
      expect(angles[0].angle).toBe("Pain Point");
      expect(angles[1].angle).toBe("Benefit");
      expect(angles[2].angle).toBe("Social Proof");
      expect(angles[3].angle).toBe("Urgency");
    });

    it("should fetch user's script history", async () => {
      const userId = "history-user";
      const hookId = "history-hook";

      // Create user and hook
      await db.insert(schema.users).values({
        id: userId,
        email: "history@example.com",
        emailVerified: new Date(),
        credits: 50,
      });

      await db.insert(schema.hooks).values({
        id: hookId,
        text: "History test hook",
        category: "finance",
        engagementScore: 8000,
        source: "tiktok",
        isActive: true,
      });

      // Generate multiple scripts
      const scripts = Array.from({ length: 5 }, (_, i) => ({
        id: `history-script-${i}`,
        userId,
        hookId,
        productDescription: `History product ${i}`,
        scripts: JSON.stringify([
          { angle: "Pain Point", script: `Script ${i}` },
        ]),
        createdAt: new Date(Date.now() + i * 1000), // Different timestamps
      }));

      await db.insert(schema.generatedScripts).values(scripts);

      // Fetch user's history (ordered by creation date descending)
      const history = await db
        .select()
        .from(schema.generatedScripts)
        .where(eq(schema.generatedScripts.userId, userId))
        .orderBy(sql`created_at DESC`);

      expect(history).toHaveLength(5);
      expect(history[0].id).toBe("history-script-4"); // Most recent first
      expect(history[4].id).toBe("history-script-0"); // Oldest last
    });
  });

  describe("Rate Limiting for Generation", () => {
    it("should enforce generation rate limits", async () => {
      const userId = "rate-limit-user";
      const hookId = "rate-limit-hook";

      // Create user and hook
      await db.insert(schema.users).values({
        id: userId,
        email: "rate-limit@example.com",
        emailVerified: new Date(),
        credits: 100,
      });

      await db.insert(schema.hooks).values({
        id: hookId,
        text: "Rate limit test hook",
        category: "tech",
        engagementScore: 7500,
        source: "tiktok",
        isActive: true,
      });

      // Simulate rate limit being reached
      await db.insert(schema.rateLimits).values({
        ip: `user:${userId}`,
        endpoint: "generate",
        count: 100,
        resetAt: new Date(Date.now() + 60 * 1000),
        updatedAt: new Date(),
      });

      // Try to generate script - should fail due to rate limit
      await expect(
        db.insert(schema.generatedScripts).values({
          id: "rate-limited-script",
          userId,
          hookId,
          productDescription: "Rate limited product",
          scripts: JSON.stringify([
            { angle: "Pain Point", script: "Test script" },
          ]),
        }),
      ).rejects.toThrow("RATE_LIMIT_EXCEEDED");
    });

    it("should reset rate limits after time window", async () => {
      const userId = "rate-limit-reset-user";
      const hookId = "rate-limit-reset-hook";

      // Create user and hook
      await db.insert(schema.users).values({
        id: userId,
        email: "rate-reset@example.com",
        emailVerified: new Date(),
        credits: 50,
      });

      await db.insert(schema.hooks).values({
        id: hookId,
        text: "Rate reset test hook",
        category: "beauty",
        engagementScore: 8500,
        source: "tiktok",
        isActive: true,
      });

      // Create expired rate limit
      await db.insert(schema.rateLimits).values({
        ip: `user:${userId}`,
        endpoint: "generate",
        count: 100,
        resetAt: new Date(Date.now() - 1000), // Expired
        updatedAt: new Date(),
      });

      // Should be able to generate script after rate limit reset
      await db.insert(schema.generatedScripts).values({
        id: "rate-reset-script",
        userId,
        hookId,
        productDescription: "Rate reset product",
        scripts: JSON.stringify([
          { angle: "Pain Point", script: "Test script" },
        ]),
      });

      // Verify script was generated
      const script = await db
        .select()
        .from(schema.generatedScripts)
        .where(eq(schema.generatedScripts.id, "rate-reset-script"));
      expect(script).toHaveLength(1);
    });
  });

  describe("Script Validation", () => {
    it("should validate required fields for script generation", async () => {
      const userId = "validation-user";

      // Create user
      await db.insert(schema.users).values({
        id: userId,
        email: "validation@example.com",
        emailVerified: new Date(),
        credits: 10,
      });

      // Try to save script without required fields - should fail
      await expect(
        db.insert(schema.generatedScripts).values({
          id: "invalid-script",
          userId,
          hookId: "",
          productDescription: "",
          scripts: "",
        }),
      ).rejects.toThrow();
    });

    it("should validate JSON structure of scripts", async () => {
      const userId = "json-validation-user";
      const hookId = "json-validation-hook";

      // Create user and hook
      await db.insert(schema.users).values({
        id: userId,
        email: "json-validation@example.com",
        emailVerified: new Date(),
        credits: 10,
      });

      await db.insert(schema.hooks).values({
        id: hookId,
        text: "JSON validation test hook",
        category: "tech",
        engagementScore: 7000,
        source: "tiktok",
        isActive: true,
      });

      // Try to save invalid JSON - should fail
      await expect(
        db.insert(schema.generatedScripts).values({
          id: "invalid-json-script",
          userId,
          hookId,
          productDescription: "JSON test product",
          scripts: "invalid-json-string",
        }),
      ).rejects.toThrow();
    });

    it("should validate script angle structure", async () => {
      const userId = "angle-validation-user";
      const hookId = "angle-validation-hook";

      // Create user and hook
      await db.insert(schema.users).values({
        id: userId,
        email: "angle-validation@example.com",
        emailVerified: new Date(),
        credits: 10,
      });

      await db.insert(schema.hooks).values({
        id: hookId,
        text: "Angle validation test hook",
        category: "fitness",
        engagementScore: 8000,
        source: "tiktok",
        isActive: true,
      });

      // Create valid script structure
      const validScript = {
        id: "valid-angle-script",
        userId,
        hookId,
        productDescription: "Angle validation product",
        scripts: JSON.stringify([
          {
            angle: "Valid Angle",
            script: "[Visual: Valid test visual]",
          },
        ]),
      };

      // Should save successfully
      await expect(
        db.insert(schema.generatedScripts).values(validScript),
      ).resolves.toBeTruthy();

      // Verify saved script
      const savedScript = await db
        .select()
        .from(schema.generatedScripts)
        .where(eq(schema.generatedScripts.id, "valid-angle-script"));
      expect(savedScript).toHaveLength(1);
    });
  });

  describe("Cleanup Operations", () => {
    it("should cascade delete scripts when user is deleted", async () => {
      const userId = "cascade-delete-scripts-user";
      const hookId = "cascade-delete-scripts-hook";

      // Create user and hook
      await db.insert(schema.users).values({
        id: userId,
        email: "cascade-delete@example.com",
        emailVerified: new Date(),
        credits: 10,
      });

      await db.insert(schema.hooks).values({
        id: hookId,
        text: "Cascade delete test hook",
        category: "tech",
        engagementScore: 7000,
        source: "tiktok",
        isActive: true,
      });

      // Generate script
      await db.insert(schema.generatedScripts).values({
        id: "cascade-delete-script",
        userId,
        hookId,
        productDescription: "Cascade delete product",
        scripts: JSON.stringify([
          { angle: "Pain Point", script: "Test script" },
        ]),
      });

      // Delete user
      await db.delete(schema.users).where(eq(schema.users.id, userId));

      // Verify script is also deleted
      const script = await db
        .select()
        .from(schema.generatedScripts)
        .where(eq(schema.generatedScripts.userId, userId));
      expect(script).toHaveLength(0);
    });

    it("should handle bulk script generation", async () => {
      const userId = "bulk-generation-user";
      const hookId = "bulk-generation-hook";

      // Create user and hook
      await db.insert(schema.users).values({
        id: userId,
        email: "bulk-generation@example.com",
        emailVerified: new Date(),
        credits: 50,
      });

      await db.insert(schema.hooks).values({
        id: hookId,
        text: "Bulk generation test hook",
        category: "finance",
        engagementScore: 9000,
        source: "tiktok",
        isActive: true,
      });

      // Generate multiple scripts in bulk
      const scripts = Array.from({ length: 10 }, (_, i) => ({
        id: `bulk-script-${i}`,
        userId,
        hookId,
        productDescription: `Bulk product ${i}`,
        scripts: JSON.stringify([
          { angle: "Pain Point", script: `Bulk script ${i}` },
        ]),
      }));

      await db.insert(schema.generatedScripts).values(scripts);

      // Verify all scripts were generated
      const allScripts = await db
        .select()
        .from(schema.generatedScripts)
        .where(eq(schema.generatedScripts.userId, userId));
      expect(allScripts).toHaveLength(10);

      // Verify credits were deducted
      const user = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, userId));
      expect(user[0].credits).toBe(40); // 50 - 10
    });
  });
});
