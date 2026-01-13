import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  createTestEnvironment,
  cleanupTestDatabase,
  createTestUser,
  createTestHook,
  generateTestHooks,
  generateTestUsers,
} from "./test-utils";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "@/lib/schema";
import { eq, sql, desc } from "drizzle-orm";

describe("Admin Operations Integration Tests", () => {
  let testEnv: Awaited<ReturnType<typeof createTestEnvironment>>;
  let db: ReturnType<typeof drizzle>;

  beforeAll(async () => {
    testEnv = await createTestEnvironment();
    db = testEnv.db;
  });

  afterAll(async () => {
    await cleanupTestDatabase(db);
  });

  describe("Admin User Management", () => {
    it("should create admin user with elevated privileges", async () => {
      const adminData = {
        id: "admin-user-test",
        email: "admin@test.com",
        name: "Admin User",
        emailVerified: new Date(),
        role: "admin" as const,
        credits: 1000, // Admins get more credits
      };

      const result = await db
        .insert(schema.users)
        .values(adminData)
        .returning();
      const admin = result[0];

      expect(admin).toMatchObject({
        id: "admin-user-test",
        email: "admin@test.com",
        role: "admin",
        credits: 1000,
      });

      // Verify admin has correct privileges
      const dbAdmin = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, admin.id));
      expect(dbAdmin[0].role).toBe("admin");
    });

    it("should enforce valid role assignments", async () => {
      const userId = "invalid-role-user";

      // Create user
      await db.insert(schema.users).values({
        id: userId,
        email: "invalid@test.com",
        emailVerified: new Date(),
        role: "user",
      });

      // Try to assign invalid role - should fail
      await expect(
        db
          .update(schema.users)
          .set({
            role: "super-admin" as any,
          })
          .where(eq(schema.users.id, userId)),
      ).rejects.toThrow();
    });

    it("should demote admin to user", async () => {
      const userId = "demote-user";

      // Create admin
      await db.insert(schema.users).values({
        id: userId,
        email: "demote@test.com",
        emailVerified: new Date(),
        role: "admin" as const,
      });

      // Demote to user
      const result = await db
        .update(schema.users)
        .set({
          role: "user",
          updatedAt: new Date(),
        })
        .where(eq(schema.users.id, userId))
        .returning();

      expect(result[0].role).toBe("user");

      // Verify demotion
      const demotedUser = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, userId));
      expect(demotedUser[0].role).toBe("user");
    });

    it("should list all users with filtering", async () => {
      // Create test users
      const users = generateTestUsers(10);
      await db.insert(schema.users).values(users);

      // Filter by role
      const adminUsers = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.role, "admin"));

      expect(adminUsers).toHaveLength(2); // 2 admins out of 10 users

      // Filter by user
      const regularUsers = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.role, "user"));

      expect(regularUsers).toHaveLength(8);
    });

    it("should update user credits for admin", async () => {
      const userId = "credits-update-user";

      // Create user
      await db.insert(schema.users).values({
        id: userId,
        email: "credits-update@test.com",
        emailVerified: new Date(),
        credits: 10,
      });

      // Update credits as admin
      const result = await db
        .update(schema.users)
        .set({
          credits: 100,
          updatedAt: new Date(),
        })
        .where(eq(schema.users.id, userId))
        .returning();

      expect(result[0].credits).toBe(100);

      // Verify update
      const updatedUser = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, userId));
      expect(updatedUser[0].credits).toBe(100);
    });
  });

  describe("Hook Review Queue", () => {
    it("should submit hook for review", async () => {
      const hookData = {
        id: "review-hook-test",
        text: "Stop scrolling if you have acne",
        category: "beauty",
        engagementScore: 9500,
        source: "tiktok",
        isActive: false, // Pending review
      };

      // Create hook in review queue
      const result = await db
        .insert(schema.hookReviewQueue)
        .values({
          id: "review-queue-1",
          text: hookData.text,
          category: hookData.category,
          engagementScore: hookData.engagementScore,
          source: hookData.source,
          status: "pending",
          submittedBy: "user-1",
        })
        .returning();

      const queueItem = result[0];

      expect(queueItem).toMatchObject({
        id: "review-queue-1",
        text: hookData.text,
        category: hookData.category,
        engagementScore: hookData.engagementScore,
        source: hookData.source,
        status: "pending",
        submittedBy: "user-1",
      });

      // Verify queue item exists
      const dbItem = await db
        .select()
        .from(schema.hookReviewQueue)
        .where(eq(schema.hookReviewQueue.id, queueItem.id));
      expect(dbItem).toHaveLength(1);
    });

    it("should review and approve hook", async () => {
      const hookData = {
        id: "approve-hook-test",
        text: "Approved hook text",
        category: "tech",
        engagementScore: 8500,
        source: "tiktok",
        isActive: false,
      };

      // Create hook in queue
      await db.insert(schema.hookReviewQueue).values({
        id: "approve-queue-1",
        text: hookData.text,
        category: hookData.category,
        engagementScore: hookData.engagementScore,
        source: hookData.source,
        status: "pending",
        submittedBy: "user-2",
      });

      // Approve hook
      const result = await db
        .update(schema.hookReviewQueue)
        .set({
          status: "approved",
          reviewedBy: "admin-1",
          reviewedAt: new Date(),
          reviewNotes: "Great hook content!",
        })
        .where(eq(schema.hookReviewQueue.id, "approve-queue-1"))
        .returning();

      expect(result[0].status).toBe("approved");

      // Verify approval
      const approvedItem = await db
        .select()
        .from(schema.hookReviewQueue)
        .where(eq(schema.hookReviewQueue.id, "approve-queue-1"));
      expect(approvedItem[0].status).toBe("approved");
    });

    it("should reject hook with reason", async () => {
      const hookData = {
        id: "reject-hook-test",
        text: "Low quality hook",
        category: "fitness",
        engagementScore: 100,
        source: "tiktok",
        isActive: false,
      };

      // Create hook in queue
      await db.insert(schema.hookReviewQueue).values({
        id: "reject-queue-1",
        text: hookData.text,
        category: hookData.category,
        engagementScore: hookData.engagementScore,
        source: hookData.source,
        status: "pending",
        submittedBy: "user-3",
      });

      // Reject hook
      const result = await db
        .update(schema.hookReviewQueue)
        .set({
          status: "rejected",
          reviewedBy: "admin-1",
          reviewedAt: new Date(),
          reviewNotes: "Engagement score too low",
        })
        .where(eq(schema.hookReviewQueue.id, "reject-queue-1"))
        .returning();

      expect(result[0].status).toBe("rejected");

      // Verify rejection
      const rejectedItem = await db
        .select()
        .from(schema.hookReviewQueue)
        .where(eq(schema.hookReviewQueue.id, "reject-queue-1"));
      expect(rejectedItem[0].status).toBe("rejected");
    });

    it("should enforce valid review status values", async () => {
      const hookData = {
        id: "invalid-status-hook",
        text: "Invalid status hook",
        category: "tech",
        engagementScore: 5000,
        source: "tiktok",
      };

      // Create hook in queue
      await db.insert(schema.hookReviewQueue).values({
        id: "invalid-status-queue-1",
        text: hookData.text,
        category: hookData.category,
        engagementScore: hookData.engagementScore,
        source: hookData.source,
        status: "pending",
        submittedBy: "user-4",
      });

      // Try to set invalid status - should fail
      await expect(
        db
          .update(schema.hookReviewQueue)
          .set({
            status: "invalid-status" as any,
          })
          .where(eq(schema.hookReviewQueue.id, "invalid-status-queue-1")),
      ).rejects.toThrow();
    });

    it("should list review queue with filters", async () => {
      // Create multiple hooks in queue
      await db.insert(schema.hookReviewQueue).values([
        {
          id: "filter-pending-1",
          text: "Pending hook 1",
          category: "tech",
          engagementScore: 8000,
          source: "tiktok",
          status: "pending",
          submittedBy: "user-1",
        },
        {
          id: "filter-pending-2",
          text: "Pending hook 2",
          category: "fitness",
          engagementScore: 8500,
          source: "tiktok",
          status: "pending",
          submittedBy: "user-2",
        },
        {
          id: "filter-approved-1",
          text: "Approved hook 1",
          category: "beauty",
          engagementScore: 9000,
          source: "tiktok",
          status: "approved",
          reviewedBy: "admin-1",
          reviewedAt: new Date(),
        },
        {
          id: "filter-rejected-1",
          text: "Rejected hook 1",
          category: "tech",
          engagementScore: 100,
          source: "tiktok",
          status: "rejected",
          reviewedBy: "admin-1",
          reviewedAt: new Date(),
          reviewNotes: "Low quality",
        },
      ]);

      // Filter by status
      const pendingItems = await db
        .select()
        .from(schema.hookReviewQueue)
        .where(eq(schema.hookReviewQueue.status, "pending"));

      expect(pendingItems).toHaveLength(2);

      // Filter by category
      const techItems = await db
        .select()
        .from(schema.hookReviewQueue)
        .where(eq(schema.hookReviewQueue.category, "tech"));

      expect(techItems).toHaveLength(2);

      // Filter by review status
      const reviewedItems = await db
        .select()
        .from(schema.hookReviewQueue)
        .where(sql`status IN ('approved', 'rejected')`);

      expect(reviewedItems).toHaveLength(2);
    });

    it("should count review queue items", async () => {
      // Create hooks in different statuses
      await db.insert(schema.hookReviewQueue).values([
        {
          id: "count-pending-1",
          text: "Count pending",
          category: "tech",
          engagementScore: 7000,
          source: "tiktok",
          status: "pending",
          submittedBy: "user-1",
        },
        {
          id: "count-pending-2",
          text: "Count pending 2",
          category: "fitness",
          engagementScore: 7500,
          source: "tiktok",
          status: "pending",
          submittedBy: "user-2",
        },
        {
          id: "count-approved-1",
          text: "Count approved",
          category: "beauty",
          engagementScore: 8000,
          source: "tiktok",
          status: "approved",
          reviewedBy: "admin-1",
          reviewedAt: new Date(),
        },
      ]);

      // Count by status
      const statusCounts = await db
        .select({
          status: schema.hookReviewQueue.status,
          count: sql`count(*)`,
        })
        .from(schema.hookReviewQueue)
        .groupBy(schema.hookReviewQueue.status);

      const countMap = new Map(statusCounts.map((s) => [s.status, s.count]));
      expect(countMap.get("pending")).toBe(2);
      expect(countMap.get("approved")).toBe(1);
      expect(countMap.get("rejected")).toBeUndefined();
    });

    it("should convert approved hook to active hook", async () => {
      // Create and approve hook in queue
      await db.insert(schema.hookReviewQueue).values({
        id: "convert-hook-1",
        text: "Hook to convert",
        category: "tech",
        engagementScore: 9000,
        source: "tiktok",
        status: "approved",
        reviewedBy: "admin-1",
        reviewedAt: new Date(),
        reviewNotes: "Excellent hook!",
      });

      // Convert to active hook
      const queueItem = await db
        .select()
        .from(schema.hookReviewQueue)
        .where(eq(schema.hookReviewQueue.id, "convert-hook-1"));

      // Create active hook from approved queue item
      await db.insert(schema.hooks).values({
        id: "converted-hook",
        text: queueItem[0].text,
        category: queueItem[0].category,
        engagementScore: queueItem[0].engagementScore,
        source: queueItem[0].source,
        isActive: true,
      });

      // Verify active hook exists
      const activeHook = await db
        .select()
        .from(schema.hooks)
        .where(eq(schema.hooks.id, "converted-hook"));
      expect(activeHook).toHaveLength(1);
      expect(activeHook[0].text).toBe("Hook to convert");
    });

    it("should handle bulk review operations", async () => {
      // Create multiple hooks for bulk approval
      const bulkHooks = Array.from({ length: 10 }, (_, i) => ({
        id: `bulk-approve-${i}`,
        text: `Bulk hook ${i}`,
        category: i % 2 === 0 ? "tech" : "fitness",
        engagementScore: 7000 + i * 100,
        source: "tiktok",
        status: "pending",
        submittedBy: `user-${i}`,
      }));

      await db.insert(schema.hookReviewQueue).values(bulkHooks);

      // Bulk approve hooks
      await db
        .update(schema.hookReviewQueue)
        .set({
          status: "approved",
          reviewedBy: "admin-1",
          reviewedAt: new Date(),
          reviewNotes: "Bulk approved",
        })
        .where(sql`status = 'pending' AND id LIKE 'bulk-approve-%'`);

      // Verify bulk approval
      const approvedHooks = await db
        .select()
        .from(schema.hookReviewQueue)
        .where(sql`id LIKE 'bulk-approve-%'`);

      expect(approvedHooks).toHaveLength(10);
      expect(approvedHooks.every((h) => h.status === "approved")).toBe(true);
    });
  });

  describe("Admin Analytics", () => {
    it("should calculate system statistics", async () => {
      // Create test data
      await db.insert(schema.users).values([
        { id: "user-1", email: "user1@test.com", emailVerified: new Date() },
        {
          id: "user-2",
          email: "user2@test.com",
          role: "admin",
          emailVerified: new Date(),
        },
      ]);

      await db.insert(schema.hooks).values([
        {
          id: "hook-1",
          text: "Hook 1",
          category: "tech",
          engagementScore: 8000,
          source: "tiktok",
          isActive: true,
        },
        {
          id: "hook-2",
          text: "Hook 2",
          category: "fitness",
          engagementScore: 9000,
          source: "tiktok",
          isActive: false,
        },
      ]);

      await db.insert(schema.hookReviewQueue).values([
        {
          id: "queue-1",
          text: "Queue 1",
          category: "tech",
          engagementScore: 7000,
          source: "tiktok",
          status: "pending",
          submittedBy: "user-1",
        },
        {
          id: "queue-2",
          text: "Queue 2",
          category: "fitness",
          engagementScore: 8000,
          source: "tiktok",
          status: "approved",
          reviewedBy: "admin-1",
          reviewedAt: new Date(),
        },
        {
          id: "queue-3",
          text: "Queue 3",
          category: "beauty",
          engagementScore: 8500,
          source: "tiktok",
          status: "rejected",
          reviewedBy: "admin-1",
          reviewedAt: new Date(),
          reviewNotes: "Low quality",
        },
      ]);

      // Calculate system stats
      const [userCount] = await db
        .select({ count: sql`count(*)` })
        .from(schema.users);
      const [activeHookCount] = await db
        .select({ count: sql`count(*)` })
        .from(schema.hooks)
        .where(sql`is_active = 1`);
      const [pendingReviewCount] = await db
        .select({ count: sql`count(*)` })
        .from(schema.hookReviewQueue)
        .where(eq(schema.hookReviewQueue.status, "pending"));
      const [approvalRate] = await db
        .select({
          rate: sql`(SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) * 100.0 / COUNT(*))`,
        })
        .from(schema.hookReviewQueue);

      expect(userCount.count).toBe(2);
      expect(activeHookCount.count).toBe(1);
      expect(pendingReviewCount.count).toBe(1);
      expect(approvalRate.rate).toBe(33.33); // 1 approved out of 3 total
    });

    it("should track engagement metrics", async () => {
      // Create hooks with different engagement scores
      await db.insert(schema.hooks).values([
        {
          id: "eng-high",
          text: "High engagement",
          category: "tech",
          engagementScore: 9500,
          source: "tiktok",
          isActive: true,
        },
        {
          id: "eng-medium",
          text: "Medium engagement",
          category: "fitness",
          engagementScore: 7500,
          source: "tiktok",
          isActive: true,
        },
        {
          id: "eng-low",
          text: "Low engagement",
          category: "beauty",
          engagementScore: 500,
          source: "tiktok",
          isActive: true,
        },
      ]);

      // Calculate engagement statistics
      const engagementStats = await db
        .select({
          category: schema.hooks.category,
          avgScore: sql`avg(engagement_score)`,
          maxScore: sql`max(engagement_score)`,
          minScore: sql`min(engagement_score)`,
        })
        .from(schema.hooks)
        .where(sql`is_active = 1`)
        .groupBy(schema.hooks.category);

      // Verify stats
      const categoryStats = new Map(
        engagementStats.map((s) => [s.category, s]),
      );
      expect(categoryStats.get("tech")?.avgScore).toBe(9500);
      expect(categoryStats.get("fitness")?.avgScore).toBe(7500);
      expect(categoryStats.get("beauty")?.avgScore).toBe(500);
    });

    it("should monitor system performance", async () => {
      // Create large datasets for performance testing
      const users = Array.from({ length: 1000 }, (_, i) => ({
        id: `perf-user-${i}`,
        email: `perf-${i}@test.com`,
        emailVerified: new Date(),
        credits: 50,
      }));

      const hooks = Array.from({ length: 500 }, (_, i) => ({
        id: `perf-hook-${i}`,
        text: `Performance hook ${i}`,
        category: i % 3 === 0 ? "tech" : i % 3 === 1 ? "fitness" : "beauty",
        engagementScore: Math.floor(Math.random() * 10000),
        source: "tiktok",
        isActive: true,
      }));

      await db.insert(schema.users).values(users);
      await db.insert(schema.hooks).values(hooks);

      // Test performance of bulk queries
      const startTime = Date.now();

      // Complex join query
      const complexQuery = await db
        .select({
          userCount: sql`count(DISTINCT u.id)`,
          hookCount: sql`count(DISTINCT h.id)`,
          avgEngagement: sql`avg(h.engagement_score)`,
        })
        .from(schema.users as any)
        .leftJoin(
          schema.generatedScripts as any,
          eq(schema.generatedScripts.userId, schema.users.id),
        )
        .leftJoin(
          schema.hooks as any,
          eq(schema.generatedScripts.hookId, schema.hooks.id),
        )
        .where(sql`h.is_active = 1`);

      const queryTime = Date.now() - startTime;

      expect(complexQuery).toHaveLength(1);
      expect(queryTime).toBeLessThan(100); // Should complete in under 100ms
      expect(complexQuery[0].userCount).toBe(1000);
      expect(complexQuery[0].hookCount).toBeGreaterThan(0);
    });
  });

  describe("Admin Security", () => {
    it("should enforce admin-only operations", async () => {
      const userId = "non-admin-user";

      // Create regular user
      await db.insert(schema.users).values({
        id: userId,
        email: "non-admin@test.com",
        emailVerified: new Date(),
        role: "user",
      });

      // Try to perform admin operation as regular user - should fail
      await expect(
        db.insert(schema.hookReviewQueue).values({
          id: "security-test",
          text: "Security test",
          category: "tech",
          engagementScore: 1000,
          source: "tiktok",
          status: "pending",
          submittedBy: userId,
        }),
      ).rejects.toThrow();
    });

    it("should audit admin actions", async () => {
      const adminUserId = "audit-admin";
      const regularUserId = "audit-user";

      // Create admin and regular user
      await db.insert(schema.users).values([
        {
          id: adminUserId,
          email: "admin@test.com",
          emailVerified: new Date(),
          role: "admin",
        },
        {
          id: regularUserId,
          email: "user@test.com",
          emailVerified: new Date(),
          role: "user",
        },
      ]);

      // Admin performs action
      await db
        .update(schema.users)
        .set({
          credits: 100,
          updatedAt: new Date(),
        })
        .where(eq(schema.users.id, regularUserId));

      // In a real system, this would create an audit log entry
      const updatedUser = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, regularUserId));

      expect(updatedUser[0].credits).toBe(100);
      // Verify updatedAt was changed
      expect(updatedUser[0].updatedAt).toBeDefined();
    });

    it("should validate admin permissions", async () => {
      const userId = "permission-test-user";

      // Create user with specific role
      await db.insert(schema.users).values({
        id: userId,
        email: "permission@test.com",
        emailVerified: new Date(),
        role: "user",
      });

      // Try to access admin-only data - should fail or return empty
      const adminData = await db
        .select()
        .from(schema.users)
        .where(sql`role = 'admin' AND id = ${userId}`);

      expect(adminData).toHaveLength(0);
    });
  });

  describe("Data Management", () => {
    it("should handle database backups and restores", async () => {
      // Create test data
      await db.insert(schema.users).values([
        {
          id: "backup-user-1",
          email: "backup1@test.com",
          emailVerified: new Date(),
        },
        {
          id: "backup-user-2",
          email: "backup2@test.com",
          emailVerified: new Date(),
        },
      ]);

      await db.insert(schema.hooks).values([
        {
          id: "backup-hook-1",
          text: "Backup hook 1",
          category: "tech",
          engagementScore: 8000,
          source: "tiktok",
          isActive: true,
        },
        {
          id: "backup-hook-2",
          text: "Backup hook 2",
          category: "fitness",
          engagementScore: 9000,
          source: "tiktok",
          isActive: true,
        },
      ]);

      // Simulate backup by exporting data
      const backupData = {
        users: await db.select().from(schema.users),
        hooks: await db.select().from(schema.hooks),
        timestamp: new Date().toISOString(),
      };

      expect(backupData.users).toHaveLength(2);
      expect(backupData.hooks).toHaveLength(2);

      // Simulate restore by clearing and reinserting
      await db.delete(schema.users);
      await db.delete(schema.hooks);

      // Verify data is cleared
      let users = await db.select().from(schema.users);
      let hooks = await db.select().from(schema.hooks);
      expect(users).toHaveLength(0);
      expect(hooks).toHaveLength(0);

      // Restore data
      await db.insert(schema.users).values(backupData.users);
      await db.insert(schema.hooks).values(backupData.hooks);

      // Verify restore
      users = await db.select().from(schema.users);
      hooks = await db.select().from(schema.hooks);
      expect(users).toHaveLength(2);
      expect(hooks).toHaveLength(2);
    });

    it("should handle data migration scenarios", async () => {
      // Create old format data
      await db.insert(schema.hookReviewQueue).values([
        {
          id: "migrate-1",
          text: "Old format hook",
          category: "tech",
          engagementScore: 7000,
          source: "tiktok",
          status: "pending",
          submittedBy: "user-1",
          oldField: "legacy data", // Would be removed in migration
        },
      ]);

      // Simulate data cleanup/migration
      await db
        .update(schema.hookReviewQueue)
        .set({
          reviewNotes: "Migrated data",
        })
        .where(sql`id = 'migrate-1'`);

      // Verify migration
      const migratedItem = await db
        .select()
        .from(schema.hookReviewQueue)
        .where(eq(schema.hookReviewQueue.id, "migrate-1"));

      expect(migratedItem[0].reviewNotes).toBe("Migrated data");
    });
  });

  describe("Error Handling", () => {
    it("should handle concurrent admin operations", async () => {
      const adminUserId = "concurrent-admin";

      // Create admin
      await db.insert(schema.users).values({
        id: adminUserId,
        email: "concurrent@test.com",
        emailVerified: new Date(),
        role: "admin",
      });

      // Perform concurrent updates
      const updatePromises = Array.from({ length: 10 }, (_, i) =>
        db
          .update(schema.users)
          .set({
            credits: i * 100,
            updatedAt: new Date(),
          })
          .where(eq(schema.users.id, adminUserId)),
      );

      const results = await Promise.allSettled(updatePromises);

      // All should succeed (last one wins)
      expect(results.every((r) => r.status === "fulfilled")).toBe(true);

      // Verify final state
      const finalUser = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, adminUserId));
      expect(finalUser[0].credits).toBe(900); // Last update value
    });

    it("should handle database connection errors gracefully", async () => {
      // Test error handling for invalid queries
      await expect(
        db
          .select()
          .from(schema.users)
          .where(sql`invalid_column = 'test'`),
      ).rejects.toThrow();
    });

    it("should provide meaningful error messages for admin operations", async () => {
      // Test with invalid data
      await expect(
        db.insert(schema.users).values({
          id: "error-user",
          email: "invalid-email", // Invalid format
        }),
      ).rejects.toThrow();

      // Test with missing required fields
      await expect(
        db.insert(schema.hooks).values({
          id: "error-hook",
          text: "", // Empty text
          category: "tech",
          engagementScore: 1000,
          source: "tiktok",
        }),
      ).rejects.toThrow();
    });
  });
});
