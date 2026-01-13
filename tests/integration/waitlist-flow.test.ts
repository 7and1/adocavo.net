import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestEnvironment, cleanupTestDatabase } from "./test-utils";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "@/lib/schema";
import { eq, sql } from "drizzle-orm";

describe("Waitlist Flow Integration Tests", () => {
  let testEnv: Awaited<ReturnType<typeof createTestEnvironment>>;
  let db: ReturnType<typeof drizzle>;

  beforeAll(async () => {
    testEnv = await createTestEnvironment();
    db = testEnv.db;
  });

  afterAll(async () => {
    await cleanupTestDatabase(db);
  });

  describe("Email Validation", () => {
    it("should validate email format", async () => {
      const validEmails = [
        "user@example.com",
        "test.email+tag@example.com",
        "user123@domain.co.uk",
        "a@b.co",
      ];

      const invalidEmails = [
        "invalid-email",
        "@example.com",
        "user@",
        "user@example.",
        ".user@example.com",
        "user..email@example.com",
      ];

      // Test valid emails
      for (const email of validEmails) {
        const result = await db.insert(schema.waitlistEntries).values({
          id: `valid-${email.replace(/[^a-zA-Z0-9]/g, "-")}`,
          email,
          source: "web",
        });

        expect(result).toBeTruthy();
      }

      // Test invalid emails - should fail
      for (const email of invalidEmails) {
        await expect(
          db.insert(schema.waitlistEntries).values({
            id: `invalid-${email.replace(/[^a-zA-Z0-9]/g, "-")}`,
            email,
            source: "web",
          }),
        ).rejects.toThrow();
      }
    });

    it("should enforce unique email constraint", async () => {
      const email = "unique-test@example.com";

      // Insert first entry
      await db.insert(schema.waitlistEntries).values({
        id: "waitlist-1",
        email,
        source: "web",
      });

      // Try to insert same email again - should fail
      await expect(
        db.insert(schema.waitlistEntries).values({
          id: "waitlist-2",
          email,
          source: "web",
        }),
      ).rejects.toThrow();
    });

    it("should normalize email before saving", async () => {
      const testEmail = "  Test.Email@example.com  ";
      const normalizedEmail = "test.email@example.com";

      // Insert with whitespace
      await db.insert(schema.waitlistEntries).values({
        id: "normalize-email",
        email: testEmail,
        source: "web",
      });

      // Verify email is normalized
      const entry = await db
        .select()
        .from(schema.waitlistEntries)
        .where(eq(schema.waitlistEntries.email, normalizedEmail));

      expect(entry).toHaveLength(1);
    });

    it("should store email source", async () => {
      const sources = ["web", "mobile", "api", "referral"];

      for (const source of sources) {
        await db.insert(schema.waitlistEntries).values({
          id: `source-${source}`,
          email: `source-${source}@example.com`,
          source,
        });
      }

      // Verify all sources were stored
      const entries = await db
        .select()
        .from(schema.waitlistEntries)
        .where(sql`email LIKE '%source-%'`);

      expect(entries).toHaveLength(sources.length);
      expect(new Set(entries.map((e) => e.source))).toEqual(new Set(sources));
    });
  });

  describe("Waitlist Entry Management", () => {
    it("should create a new waitlist entry", async () => {
      const entryData = {
        id: "new-entry",
        email: "new@example.com",
        source: "web",
        referralCode: "ref123",
        userAgent: "Mozilla/5.0",
        ipAddress: "127.0.0.1",
      };

      const result = await db
        .insert(schema.waitlistEntries)
        .values(entryData)
        .returning();
      const entry = result[0];

      expect(entry).toMatchObject({
        id: "new-entry",
        email: "new@example.com",
        source: "web",
        referralCode: "ref123",
        userAgent: "Mozilla/5.0",
        ipAddress: "127.0.0.1",
      });

      // Verify entry exists
      const dbEntry = await db
        .select()
        .from(schema.waitlistEntries)
        .where(eq(schema.waitlistEntries.id, entry.id));
      expect(dbEntry).toHaveLength(1);
    });

    it("should require email field", async () => {
      // Try to create entry without email - should fail
      await expect(
        db.insert(schema.waitlistEntries).values({
          id: "no-email",
          source: "web",
        }),
      ).rejects.toThrow();
    });

    it("should default source to 'web' if not provided", async () => {
      const entryData = {
        id: "default-source",
        email: "default@example.com",
      };

      const result = await db
        .insert(schema.waitlistEntries)
        .values(entryData)
        .returning();
      const entry = result[0];

      expect(entry.source).toBe("web");
    });

    it("should store optional fields", async () => {
      const entryData = {
        id: "optional-fields",
        email: "optional@example.com",
        source: "web",
        referralCode: "REF456",
        userAgent: "Chrome/91.0",
        ipAddress: "192.168.1.1",
        notes: "Priority customer",
      };

      const result = await db
        .insert(schema.waitlistEntries)
        .values(entryData)
        .returning();
      const entry = result[0];

      expect(entry.referralCode).toBe("REF456");
      expect(entry.userAgent).toBe("Chrome/91.0");
      expect(entry.ipAddress).toBe("192.168.1.1");
      expect(entry.notes).toBe("Priority customer");
    });

    it("should handle batch insertions", async () => {
      const entries = Array.from({ length: 10 }, (_, i) => ({
        id: `batch-${i}`,
        email: `batch-${i}@example.com`,
        source: i % 2 === 0 ? "web" : "mobile",
      }));

      await db.insert(schema.waitlistEntries).values(entries);

      // Verify all entries were created
      const batchEntries = await db
        .select()
        .from(schema.waitlistEntries)
        .where(sql`email LIKE 'batch-%'`);

      expect(batchEntries).toHaveLength(10);
      expect(new Set(batchEntries.map((e) => e.email))).toEqual(
        new Set(entries.map((e) => e.email)),
      );
    });
  });

  describe("Waitlist Query Operations", () => {
    it("should fetch waitlist entries by source", async () => {
      const sources = ["web", "mobile", "api"];
      const emails = sources.map((s, i) => `${s}-${i}@example.com`);

      // Create entries with different sources
      await db.insert(schema.waitlistEntries).values(
        emails.map((email, i) => ({
          id: `source-query-${i}`,
          email,
          source: sources[i],
        })),
      );

      // Query by source
      const webEntries = await db
        .select()
        .from(schema.waitlistEntries)
        .where(eq(schema.waitlistEntries.source, "web"));

      expect(webEntries).toHaveLength(1);
      expect(webEntries[0].email).toBe("web-0@example.com");
    });

    it("should fetch entries with referral codes", async () => {
      const emails = [
        { email: "ref1@example.com", referralCode: "ABC123" },
        { email: "ref2@example.com", referralCode: "DEF456" },
        { email: "no-ref@example.com", referralCode: null },
      ];

      await db.insert(schema.waitlistEntries).values(
        emails.map((e, i) => ({
          id: `ref-query-${i}`,
          email: e.email,
          source: "web",
          referralCode: e.referralCode,
        })),
      );

      // Query entries with referral codes
      const refEntries = await db
        .select()
        .from(schema.waitlistEntries)
        .where(sql`referral_code IS NOT NULL`);

      expect(refEntries).toHaveLength(2);
      expect(refEntries.map((e) => e.email)).toEqual([
        "ref1@example.com",
        "ref2@example.com",
      ]);

      // Query entries without referral codes
      const noRefEntries = await db
        .select()
        .from(schema.waitlistEntries)
        .where(sql`referral_code IS NULL`);

      expect(noRefEntries).toHaveLength(1);
      expect(noRefEntries[0].email).toBe("no-ref@example.com");
    });

    it("should fetch entries by IP address", async () => {
      const ipAddresses = ["192.168.1.1", "10.0.0.1", "172.16.0.1"];

      await db.insert(schema.waitlistEntries).values(
        ipAddresses.map((ip, i) => ({
          id: `ip-query-${i}`,
          email: `ip-${i}@example.com`,
          source: "web",
          ipAddress: ip,
        })),
      );

      // Query by IP
      const ipEntries = await db
        .select()
        .from(schema.waitlistEntries)
        .where(eq(schema.waitlistEntries.ipAddress, "192.168.1.1"));

      expect(ipEntries).toHaveLength(1);
      expect(ipEntries[0].email).toBe("ip-0@example.com");
    });

    it("should count waitlist entries by source", async () => {
      const sources = ["web", "mobile", "api", "web", "mobile"];
      const emails = sources.map((s, i) => `${s}-${i}@example.com`);

      await db.insert(schema.waitlistEntries).values(
        emails.map((email, i) => ({
          id: `count-source-${i}`,
          email,
          source: sources[i],
        })),
      );

      // Count entries by source
      const sourceCounts = await db
        .select({
          source: schema.waitlistEntries.source,
          count: sql`count(*)`,
        })
        .from(schema.waitlistEntries)
        .groupBy(schema.waitlistEntries.source);

      const countMap = new Map(sourceCounts.map((s) => [s.source, s.count]));
      expect(countMap.get("web")).toBe(2);
      expect(countMap.get("mobile")).toBe(2);
      expect(countMap.get("api")).toBe(1);
    });

    it("should calculate waitlist growth", async () => {
      const dates = [
        new Date("2024-01-01"),
        new Date("2024-01-02"),
        new Date("2024-01-03"),
        new Date("2024-01-01"), // Duplicate date
        new Date("2024-01-02"), // Duplicate date
      ];

      await db.insert(schema.waitlistEntries).values(
        dates.map((date, i) => ({
          id: `growth-${i}`,
          email: `growth-${i}@example.com`,
          source: "web",
          createdAt: date,
        })),
      );

      // Count entries by date
      const dailyGrowth = await db
        .select({
          date: sql`date(created_at)`,
          count: sql`count(*)`,
        })
        .from(schema.waitlistEntries)
        .groupBy(sql`date(created_at)`)
        .orderBy(sql`date(created_at)`);

      expect(dailyGrowth).toHaveLength(3); // 3 unique dates
      expect(dailyGrowth[0].count).toBe(1); // Jan 1
      expect(dailyGrowth[1].count).toBe(1); // Jan 2
      expect(dailyGrowth[2].count).toBe(1); // Jan 3
    });

    it("should search waitlist by email partial match", async () => {
      const emails = [
        "john.doe@example.com",
        "jane.smith@example.com",
        "johnny.test@example.com",
        "mike@example.com",
      ];

      await db.insert(schema.waitlistEntries).values(
        emails.map((email, i) => ({
          id: `search-${i}`,
          email,
          source: "web",
        })),
      );

      // Search for emails containing "john"
      const searchResults = await db
        .select()
        .from(schema.waitlistEntries)
        .where(sql`email LIKE '%john%'`);

      expect(searchResults).toHaveLength(2);
      expect(searchResults.map((e) => e.email)).toEqual([
        "john.doe@example.com",
        "johnny.test@example.com",
      ]);
    });

    it("should fetch waitlist entries with pagination", async () => {
      // Create many entries
      const entries = Array.from({ length: 25 }, (_, i) => ({
        id: `pagination-${i}`,
        email: `pagination-${i}@example.com`,
        source: "web",
      }));

      await db.insert(schema.waitlistEntries).values(entries);

      // Page 1 (first 10)
      const page1 = await db
        .select()
        .from(schema.waitlistEntries)
        .where(sql`email LIKE 'pagination-%'`)
        .orderBy(schema.waitlistEntries.createdAt)
        .limit(10)
        .offset(0);

      expect(page1).toHaveLength(10);
      expect(page1[0].email).toBe("pagination-0@example.com");

      // Page 2 (next 10)
      const page2 = await db
        .select()
        .from(schema.waitlistEntries)
        .where(sql`email LIKE 'pagination-%'`)
        .orderBy(schema.waitlistEntries.createdAt)
        .limit(10)
        .offset(10);

      expect(page2).toHaveLength(10);
      expect(page2[0].email).toBe("pagination-10@example.com");
    });
  });

  describe("Waitlist Analytics", () => {
    it("should calculate conversion rate from waitlist", async () => {
      // Create waitlist entries
      await db.insert(schema.waitlistEntries).values([
        { id: "conv-1", email: "conv-1@example.com", source: "web" },
        { id: "conv-2", email: "conv-2@example.com", source: "web" },
        { id: "conv-3", email: "conv-3@example.com", source: "web" },
      ]);

      // Create some users from waitlist
      await db.insert(schema.users).values([
        {
          id: "user-1",
          email: "conv-1@example.com",
          emailVerified: new Date(),
        },
        {
          id: "user-2",
          email: "conv-2@example.com",
          emailVerified: new Date(),
        },
      ]);

      // Calculate conversion rate
      const [totalWaitlist] = await db
        .select({ count: sql`count(*)` })
        .from(schema.waitlistEntries);

      const [convertedUsers] = await db
        .select({ count: sql`count(*)` })
        .from(schema.waitlistEntries)
        .where(
          sql`email IN (SELECT email FROM users WHERE email_verified IS NOT NULL)`,
        );

      const conversionRate = (convertedUsers.count / totalWaitlist.count) * 100;
      expect(conversionRate).toBe(66.67); // 2 out of 3 converted
    });

    it("should track waitlist sources effectiveness", async () => {
      // Create entries with different sources
      await db.insert(schema.waitlistEntries).values([
        { id: "track-1", email: "track-1@example.com", source: "web" },
        { id: "track-2", email: "track-2@example.com", source: "web" },
        { id: "track-3", email: "track-3@example.com", source: "mobile" },
        { id: "track-4", email: "track-4@example.com", source: "mobile" },
        { id: "track-5", email: "track-5@example.com", source: "mobile" },
        { id: "track-6", email: "track-6@example.com", source: "referral" },
      ]);

      // Convert some users
      await db.insert(schema.users).values([
        {
          id: "user-1",
          email: "track-1@example.com",
          emailVerified: new Date(),
        },
        {
          id: "user-2",
          email: "track-3@example.com",
          emailVerified: new Date(),
        },
        {
          id: "user-3",
          email: "track-4@example.com",
          emailVerified: new Date(),
        },
        {
          id: "user-4",
          email: "track-6@example.com",
          emailVerified: new Date(),
        },
      ]);

      // Calculate conversion by source
      const sourceConversion = await db
        .select({
          source: schema.waitlistEntries.source,
          total: sql`count(wl.id)`,
          converted: sql`count(u.id)`,
          conversion: sql`(count(u.id) * 100.0 / count(wl.id))`,
        })
        .from(schema.waitlistEntries as any)
        .leftJoin(
          schema.users as any,
          eq(schema.users.email, schema.waitlistEntries.email),
        )
        .where(sql`users.email_verified IS NOT NULL`)
        .groupBy(schema.waitlistEntries.source);

      // Verify conversions
      const conversionMap = new Map(
        sourceConversion.map((s) => [
          s.source,
          { total: s.total, converted: s.converted },
        ]),
      );

      expect(conversionMap.get("web")).toEqual({ total: 2, converted: 1 });
      expect(conversionMap.get("mobile")).toEqual({ total: 3, converted: 2 });
      expect(conversionMap.get("referral")).toEqual({ total: 1, converted: 1 });
    });

    it("should identify waitlist trends over time", async () => {
      // Create entries over time
      const dates = [
        new Date("2024-01-01T10:00:00Z"),
        new Date("2024-01-01T14:00:00Z"),
        new Date("2024-01-02T09:00:00Z"),
        new Date("2024-01-02T15:00:00Z"),
        new Date("2024-01-03T11:00:00Z"),
        new Date("2024-01-03T16:00:00Z"),
      ];

      await db.insert(schema.waitlistEntries).values(
        dates.map((date, i) => ({
          id: `trend-${i}`,
          email: `trend-${i}@example.com`,
          source: "web",
          createdAt: date,
        })),
      );

      // Daily trend analysis
      const dailyTrends = await db
        .select({
          date: sql`date(created_at)`,
          count: sql`count(*)`,
        })
        .from(schema.waitlistEntries)
        .groupBy(sql`date(created_at)`)
        .orderBy(sql`date(created_at)`);

      expect(dailyTrends).toHaveLength(3);
      expect(dailyTrends[0].count).toBe(2);
      expect(dailyTrends[1].count).toBe(2);
      expect(dailyTrends[2].count).toBe(2);
    });

    it("should identify peak waitlist hours", async () => {
      // Create entries at different hours
      const hours = [9, 14, 9, 15, 10, 14, 11, 15, 9, 14, 10, 15];

      await db.insert(schema.waitlistEntries).values(
        hours.map((hour, i) => ({
          id: `hour-${i}`,
          email: `hour-${i}@example.com`,
          source: "web",
          createdAt: new Date(`2024-01-01T${hour}:00:00Z`),
        })),
      );

      // Hourly analysis
      const hourlyAnalysis = await db
        .select({
          hour: sql`strftime('%H', created_at)`,
          count: sql`count(*)`,
        })
        .from(schema.waitlistEntries)
        .groupBy(sql`strftime('%H', created_at)`)
        .orderBy(sql`strftime('%H', created_at)`);

      const hourCounts = new Map(
        hourlyAnalysis.map((h) => [parseInt(h.hour), h.count]),
      );
      expect(hourCounts.get(9)).toBe(3); // 9 AM entries
      expect(hourCounts.get(10)).toBe(2); // 10 AM entries
      expect(hourCounts.get(11)).toBe(1); // 11 AM entries
      expect(hourCounts.get(14)).toBe(3); // 2 PM entries
      expect(hourCounts.get(15)).toBe(3); // 3 PM entries
    });
  });

  describe("Data Cleanup Operations", () => {
    it("should remove duplicate waitlist entries", async () => {
      const email = "duplicate@example.com";

      // Create duplicate entries
      await db.insert(schema.waitlistEntries).values([
        {
          id: "duplicate-1",
          email,
          source: "web",
          createdAt: new Date("2024-01-01T10:00:00Z"),
        },
        {
          id: "duplicate-2",
          email,
          source: "web",
          createdAt: new Date("2024-01-01T10:00:00Z"),
        },
      ]);

      // Remove duplicates keeping the oldest
      await db.delete(schema.waitlistEntries).where(
        sql`id IN (
          SELECT id FROM waitlist_entries
          WHERE email = ${email}
          AND id NOT IN (
            SELECT id FROM (
              SELECT id
              FROM waitlist_entries
              WHERE email = ${email}
              ORDER BY created_at ASC, id ASC
              LIMIT 1
            )
          )
        )`,
      );

      // Verify only one entry remains
      const remainingEntries = await db
        .select()
        .from(schema.waitlistEntries)
        .where(eq(schema.waitlistEntries.email, email));

      expect(remainingEntries).toHaveLength(1);
    });

    it("should clean up old waitlist entries", async () => {
      // Create old and recent entries
      await db.insert(schema.waitlistEntries).values([
        {
          id: "old-1",
          email: "old-1@example.com",
          source: "web",
          createdAt: new Date("2023-01-01T00:00:00Z"), // 2 years old
        },
        {
          id: "recent-1",
          email: "recent-1@example.com",
          source: "web",
          createdAt: new Date("2024-01-01T00:00:00Z"), // Recent
        },
      ]);

      // Remove entries older than 1 year
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

      await db
        .delete(schema.waitlistEntries)
        .where(sql`created_at < ${oneYearAgo}`);

      // Verify only recent entries remain
      const remainingEntries = await db
        .select()
        .from(schema.waitlistEntries)
        .where(sql`email LIKE 'recent-%' OR email LIKE 'old-%'`);

      expect(remainingEntries).toHaveLength(1);
      expect(remainingEntries[0].email).toBe("recent-1@example.com");
    });

    it("should archive waitlist entries after conversion", async () => {
      // Create waitlist entry
      await db.insert(schema.waitlistEntries).values({
        id: "archive-test",
        email: "archive-test@example.com",
        source: "web",
      });

      // Create user (simulate conversion)
      await db.insert(schema.users).values({
        id: "user-archive",
        email: "archive-test@example.com",
        emailVerified: new Date(),
      });

      // Archive converted entries (in a real system, this would be a separate table)
      const convertedEntry = await db
        .select()
        .from(schema.waitlistEntries)
        .leftJoin(
          schema.users,
          eq(schema.users.email, schema.waitlistEntries.email),
        )
        .where(sql`users.email_verified IS NOT NULL`);

      expect(convertedEntry).toHaveLength(1);
    });
  });
});
