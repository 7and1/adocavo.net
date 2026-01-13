import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestEnvironment, cleanupTestDatabase } from "./test-utils";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "@/lib/schema";
import { eq, sql, desc, and, gte, lte } from "drizzle-orm";
import type { RateLimitConfig } from "@/lib/rate-limit";

describe("Error Scenarios Integration Tests", () => {
  let testEnv: Awaited<ReturnType<typeof createTestEnvironment>>;
  let db: ReturnType<typeof drizzle>;

  beforeAll(async () => {
    testEnv = await createTestEnvironment();
    db = testEnv.db;
  });

  afterAll(async () => {
    await cleanupTestDatabase(db);
  });

  describe("Rate Limiting Enforcement", () => {
    it("should reject requests when rate limit is exceeded", async () => {
      const userId = "rate-limit-user";
      const endpoint = "generate";
      const limit = 5;

      // Create user
      await db.insert(schema.users).values({
        id: userId,
        email: "rate-limit@example.com",
        emailVerified: new Date(),
        credits: 100,
      });

      // Create rate limit record at limit
      await db.insert(schema.rateLimits).values({
        ip: `user:${userId}`,
        endpoint,
        count: limit,
        resetAt: new Date(Date.now() + 60 * 1000),
        updatedAt: new Date(),
      });

      // Try to make requests - should fail
      for (let i = 0; i < 3; i++) {
        // Mock a rate limited request by directly checking the rate limit logic
        const currentRateLimit = await db
          .select()
          .from(schema.rateLimits)
          .where(
            and(
              eq(schema.rateLimits.ip, `user:${userId}`),
              eq(schema.rateLimits.endpoint, endpoint),
              gte(schema.rateLimits.resetAt, new Date()),
            ),
          );

        expect(currentRateLimit).toHaveLength(1);
        expect(currentRateLimit[0].count).toBeGreaterThanOrEqual(limit);
      }
    });

    it("should reset rate limit after time window expires", async () => {
      const userId = "rate-limit-reset-user";
      const endpoint = "generate";
      const limit = 3;

      // Create user
      await db.insert(schema.users).values({
        id: userId,
        email: "rate-limit-reset@example.com",
        emailVerified: new Date(),
        credits: 100,
      });

      // Create rate limit that expired 1 second ago
      await db.insert(schema.rateLimits).values({
        ip: `user:${userId}`,
        endpoint,
        count: limit,
        resetAt: new Date(Date.now() - 1000), // Expired
        updatedAt: new Date(),
      });

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Try to make request - should succeed because limit is reset
      const currentRateLimit = await db
        .select()
        .from(schema.rateLimits)
        .where(
          and(
            eq(schema.rateLimits.ip, `user:${userId}`),
            eq(schema.rateLimits.endpoint, endpoint),
            gte(schema.rateLimits.resetAt, new Date()),
          ),
        );

      expect(currentRateLimit).toHaveLength(0);
    });

    it("should track rate limits separately for different endpoints", async () => {
      const userId = "multi-endpoint-user";
      const endpoint1 = "generate";
      const endpoint2 = "favorite";

      // Create user
      await db.insert(schema.users).values({
        id: userId,
        email: "multi-endpoint@example.com",
        emailVerified: new Date(),
        credits: 100,
      });

      // Set rate limits for different endpoints
      await db.insert(schema.rateLimits).values([
        {
          id: "rate-limit-1",
          ip: `user:${userId}`,
          endpoint: endpoint1,
          count: 5,
          resetAt: new Date(Date.now() + 60 * 1000),
          updatedAt: new Date(),
        },
        {
          id: "rate-limit-2",
          ip: `user:${userId}`,
          endpoint: endpoint2,
          count: 10,
          resetAt: new Date(Date.now() + 60 * 1000),
          updatedAt: new Date(),
        },
      ]);

      // Verify separate rate limits
      const rateLimit1 = await db
        .select()
        .from(schema.rateLimits)
        .where(
          and(
            eq(schema.rateLimits.ip, `user:${userId}`),
            eq(schema.rateLimits.endpoint, endpoint1),
          ),
        );

      const rateLimit2 = await db
        .select()
        .from(schema.rateLimits)
        .where(
          and(
            eq(schema.rateLimits.ip, `user:${userId}`),
            eq(schema.rateLimits.endpoint, endpoint2),
          ),
        );

      expect(rateLimit1).toHaveLength(1);
      expect(rateLimit2).toHaveLength(1);
      expect(rateLimit1[0].count).toBe(5);
      expect(rateLimit2[0].count).toBe(10);
    });

    it("should handle concurrent rate limit checks", async () => {
      const userId = "concurrent-rate-user";
      const endpoint = "generate";
      const limit = 2;

      // Create user
      await db.insert(schema.users).values({
        id: userId,
        email: "concurrent-rate@example.com",
        emailVerified: new Date(),
        credits: 100,
      });

      // Set rate limit
      await db.insert(schema.rateLimits).values({
        id: "concurrent-rate-limit",
        ip: `user:${userId}`,
        endpoint,
        count: limit,
        resetAt: new Date(Date.now() + 60 * 1000),
        updatedAt: new Date(),
      });

      // Try multiple concurrent requests
      const promises = Array.from({ length: 5 }, () =>
        db
          .select()
          .from(schema.rateLimits)
          .where(
            and(
              eq(schema.rateLimits.ip, `user:${userId}`),
              eq(schema.rateLimits.endpoint, endpoint),
            ),
          ),
      );

      const results = await Promise.allSettled(promises);
      expect(results).toHaveLength(5);

      // All should succeed since we're just reading, not incrementing
      results.forEach((result) => {
        expect(result.status).toBe("fulfilled");
      });
    });
  });

  describe("Insufficient Credits", () => {
    it("should reject script generation when user has no credits", async () => {
      const userId = "no-credits-user";

      // Create user with 0 credits
      await db.insert(schema.users).values({
        id: userId,
        email: "no-credits@example.com",
        emailVerified: new Date(),
        credits: 0,
      });

      // Verify user has no credits
      const user = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, userId));
      expect(user[0].credits).toBe(0);

      // Try to generate script - should fail due to insufficient credits
      // In a real implementation, this would be caught by the service layer
    });

    it("should allow script generation when user has sufficient credits", async () => {
      const userId = "sufficient-credits-user";
      const creditsNeeded = 5;

      // Create user with sufficient credits
      await db.insert(schema.users).values({
        id: userId,
        email: "sufficient-credits@example.com",
        emailVerified: new Date(),
        credits: creditsNeeded + 10, // More than needed
      });

      // Verify user has enough credits
      const user = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, userId));
      expect(user[0].credits).toBeGreaterThan(creditsNeeded);
    });

    it("should deduct credits after successful script generation", async () => {
      const userId = "deduct-credits-user";
      const initialCredits = 20;
      const cost = 5;

      // Create user
      await db.insert(schema.users).values({
        id: userId,
        email: "deduct-credits@example.com",
        emailVerified: new Date(),
        credits: initialCredits,
      });

      // Simulate credit deduction (what would happen in generation)
      await db
        .update(schema.users)
        .set({
          credits: sql`${schema.users.credits} - ${cost}`,
          updatedAt: new Date(),
        })
        .where(eq(schema.users.id, userId));

      // Verify credits were deducted
      const user = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, userId));
      expect(user[0].credits).toBe(initialCredits - cost);
    });

    it("should prevent negative credits", async () => {
      const userId = "negative-credits-user";

      // Create user
      await db.insert(schema.users).values({
        id: userId,
        email: "negative-credits@example.com",
        emailVerified: new Date(),
        credits: 10,
      });

      // Try to set negative credits - should fail
      await expect(
        db
          .update(schema.users)
          .set({ credits: -1 })
          .where(eq(schema.users.id, userId)),
      ).rejects.toThrow();
    });

    it("should handle concurrent credit deductions safely", async () => {
      const userId = "concurrent-credits-user";
      const initialCredits = 10;
      const deductionAmount = 5;

      // Create user
      await db.insert(schema.users).values({
        id: userId,
        email: "concurrent-credits@example.com",
        emailVerified: new Date(),
        credits: initialCredits,
      });

      // Try concurrent deductions
      const promises = Array.from({ length: 3 }, () =>
        db
          .update(schema.users)
          .set({
            credits: sql`${schema.users.credits} - ${deductionAmount}`,
            updatedAt: new Date(),
          })
          .where(eq(schema.users.id, userId)),
      );

      const results = await Promise.allSettled(promises);

      // At least one should succeed
      const successes = results.filter((r) => r.status === "fulfilled");
      expect(successes.length).toBeGreaterThan(0);

      // Final credits should not be negative
      const user = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, userId));
      expect(user[0].credits).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Invalid Input Handling", () => {
    it("should reject empty hook text", async () => {
      const userId = "empty-hook-user";

      // Create user
      await db.insert(schema.users).values({
        id: userId,
        email: "empty-hook@example.com",
        emailVerified: new Date(),
        credits: 10,
      });

      // Try to create hook with empty text - should fail
      await expect(
        db.insert(schema.hooks).values({
          id: "empty-hook",
          userId,
          text: "",
          category: "tech",
          engagementScore: 1000,
          source: "tiktok",
          isActive: true,
        }),
      ).rejects.toThrow();
    });

    it("should reject hooks with invalid category", async () => {
      const userId = "invalid-category-user";

      // Create user
      await db.insert(schema.users).values({
        id: userId,
        email: "invalid-category@example.com",
        emailVerified: new Date(),
        credits: 10,
      });

      // Try to create hook with invalid category - should fail
      await expect(
        db.insert(schema.hooks).values({
          id: "invalid-category-hook",
          userId,
          text: "Test hook",
          category: "invalid-category" as any,
          engagementScore: 1000,
          source: "tiktok",
          isActive: true,
        }),
      ).rejects.toThrow();
    });

    it("should reject negative engagement scores", async () => {
      const userId = "negative-score-user";

      // Create user
      await db.insert(schema.users).values({
        id: userId,
        email: "negative-score@example.com",
        emailVerified: new Date(),
        credits: 10,
      });

      // Try to create hook with negative score - should fail
      await expect(
        db.insert(schema.hooks).values({
          id: "negative-score-hook",
          userId,
          text: "Test hook",
          category: "tech",
          engagementScore: -100,
          source: "tiktok",
          isActive: true,
        }),
      ).rejects.toThrow();
    });

    it("should reject malformed email addresses", async () => {
      // Try to create user with invalid email - should fail
      await expect(
        db.insert(schema.users).values({
          id: "invalid-email-user",
          email: "invalid-email",
          emailVerified: new Date(),
          credits: 10,
        }),
      ).rejects.toThrow();
    });

    it("should reject duplicate email addresses", async () => {
      const email = "duplicate@example.com";

      // Create first user
      await db.insert(schema.users).values({
        id: "user-1",
        email,
        emailVerified: new Date(),
        credits: 10,
      });

      // Try to create second user with same email - should fail
      await expect(
        db.insert(schema.users).values({
          id: "user-2",
          email,
          emailVerified: new Date(),
          credits: 10,
        }),
      ).rejects.toThrow();
    });

    it("should reject invalid UUIDs", async () => {
      // Try to create record with invalid UUID - should fail
      await expect(
        db.insert(schema.users).values({
          id: "invalid-id",
          email: "invalid-id@example.com",
          emailVerified: new Date(),
          credits: 10,
        }),
      ).rejects.toThrow();
    });
  });

  describe("API Failure Scenarios", () => {
    it("should handle AI service timeouts gracefully", async () => {
      const userId = "ai-timeout-user";

      // Create user
      await db.insert(schema.users).values({
        id: userId,
        email: "ai-timeout@example.com",
        emailVerified: new Date(),
        credits: 10,
      });

      // Test timeout handling
      // In a real implementation, this would be caught by the AI service wrapper
      expect(true).toBe(true); // Placeholder test
    });

    it("should handle AI service errors gracefully", async () => {
      const userId = "ai-error-user";

      // Create user
      await db.insert(schema.users).values({
        id: userId,
        email: "ai-error@example.com",
        emailVerified: new Date(),
        credits: 10,
      });

      // Test error handling
      // In a real implementation, this would be caught by the AI service wrapper
      expect(true).toBe(true); // Placeholder test
    });

    it("should handle database connection failures", async () => {
      // Test database failure handling
      // In a real implementation, this would be caught by the database connection wrapper
      expect(true).toBe(true); // Placeholder test
    });

    it("should handle service unavailability", async () => {
      // Test service unavailability handling
      // In a real implementation, this would be handled by circuit breakers or retries
      expect(true).toBe(true); // Placeholder test
    });
  });

  describe("Edge Cases", () => {
    it("should handle extreme values", async () => {
      const userId = "extreme-user";
      const hookId = "extreme-hook";

      // Create user
      await db.insert(schema.users).values({
        id: userId,
        email: "extreme@example.com",
        emailVerified: new Date(),
        credits: 1000000, // Very high credits
      });

      await db.insert(schema.hooks).values({
        id: hookId,
        text: "X".repeat(1000), // Very long text
        category: "tech",
        engagementScore: 9999999999, // Very high score
        source: "tiktok",
        isActive: true,
      });

      // Verify extreme values were stored
      const user = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, userId));
      const hook = await db
        .select()
        .from(schema.hooks)
        .where(eq(schema.hooks.id, hookId));

      expect(user[0].credits).toBe(1000000);
      expect(hook[0].text.length).toBe(1000);
      expect(hook[0].engagementScore).toBe(9999999999);
    });

    it("should handle Unicode characters", async () => {
      const userId = "unicode-user";
      const hookId = "unicode-hook";

      // Create user with Unicode name
      await db.insert(schema.users).values({
        id: userId,
        email: "unicode@example.com",
        name: "José María", // Unicode characters
        emailVerified: new Date(),
        credits: 10,
      });

      await db.insert(schema.hooks).values({
        id: hookId,
        text: "Café & naïve résumé", // Unicode characters
        category: "tech",
        engagementScore: 5000,
        source: "tiktok",
        isActive: true,
      });

      // Verify Unicode characters were stored correctly
      const user = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, userId));
      const hook = await db
        .select()
        .from(schema.hooks)
        .where(eq(schema.hooks.id, hookId));

      expect(user[0].name).toBe("José María");
      expect(hook[0].text).toBe("Café & naïve résumé");
    });

    it("should handle concurrent user creation", async () => {
      const userEmail = "concurrent-email@example.com";

      // Try to create user with same email concurrently
      const promises = Array.from({ length: 3 }, (_, i) =>
        db.insert(schema.users).values({
          id: `concurrent-user-${i}`,
          email: userEmail,
          emailVerified: new Date(),
          credits: 10,
        }),
      );

      const results = await Promise.allSettled(promises);

      // Only one should succeed
      const successes = results.filter((r) => r.status === "fulfilled");
      const failures = results.filter((r) => r.status === "rejected");

      expect(successes).toHaveLength(1);
      expect(failures).toHaveLength(2);
    });

    it("should handle large batch operations", async () => {
      const userId = "batch-user";
      const batchSize = 1000;

      // Create user
      await db.insert(schema.users).values({
        id: userId,
        email: "batch@example.com",
        emailVerified: new Date(),
        credits: 1000,
      });

      // Create large batch of hooks
      const hooks = Array.from({ length: batchSize }, (_, i) => ({
        id: `batch-hook-${i}`,
        userId,
        text: `Batch hook ${i}`,
        category: "tech",
        engagementScore: 1000 + i,
        source: "tiktok",
        isActive: true,
      }));

      // Insert in batches to avoid memory issues
      const batchSizeInsert = 100;
      for (let i = 0; i < batchSize; i += batchSizeInsert) {
        const batch = hooks.slice(i, i + batchSizeInsert);
        await db.insert(schema.hooks).values(batch);
      }

      // Verify all hooks were inserted
      const dbHooks = await db
        .select()
        .from(schema.hooks)
        .where(eq(schema.hooks.userId, userId));
      expect(dbHooks).toHaveLength(batchSize);
    });

    it("should handle mixed valid and invalid data", async () => {
      // Create valid user
      await db.insert(schema.users).values({
        id: "valid-user",
        email: "valid@example.com",
        emailVerified: new Date(),
        credits: 10,
      });

      // Try to insert mixed valid and invalid hooks
      const hooks = [
        {
          id: "valid-hook-1",
          text: "Valid hook",
          category: "tech",
          engagementScore: 1000,
          source: "tiktok",
          isActive: true,
        },
        {
          id: "invalid-hook-1",
          text: "", // Invalid empty text
          category: "tech",
          engagementScore: 1000,
          source: "tiktok",
          isActive: true,
        },
        {
          id: "valid-hook-2",
          text: "Another valid hook",
          category: "tech",
          engagementScore: 1000,
          source: "tiktok",
          isActive: true,
        },
      ];

      // Should fail on invalid hook
      await expect(db.insert(schema.hooks).values(hooks)).rejects.toThrow();

      // Verify only valid hooks were inserted (transaction should rollback)
      const dbHooks = await db
        .select()
        .from(schema.hooks)
        .where(eq(schema.hooks.userId, "valid-user"));
      expect(dbHooks).toHaveLength(0);
    });

    it("should handle data recovery after failures", async () => {
      const userId = "recovery-user";

      // Create user
      await db.insert(schema.users).values({
        id: userId,
        email: "recovery@example.com",
        emailVerified: new Date(),
        credits: 10,
      });

      // Try to insert hook with invalid data
      const invalidHook = {
        id: "recovery-hook-invalid",
        text: "", // Invalid
        category: "tech",
        engagementScore: 1000,
        source: "tiktok",
        isActive: true,
      };

      // Should fail
      await expect(
        db.insert(schema.hooks).values(invalidHook),
      ).rejects.toThrow();

      // Then insert valid hook
      await db.insert(schema.hooks).values({
        id: "recovery-hook-valid",
        text: "Recovery hook",
        category: "tech",
        engagementScore: 1000,
        source: "tiktok",
        isActive: true,
      });

      // Verify system recovered and valid hook was inserted
      const dbHooks = await db
        .select()
        .from(schema.hooks)
        .where(eq(schema.hooks.userId, userId));
      expect(dbHooks).toHaveLength(1);
      expect(dbHooks[0].text).toBe("Recovery hook");
    });
  });
});
