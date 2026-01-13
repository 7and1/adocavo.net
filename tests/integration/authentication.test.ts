import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestEnvironment, cleanupTestDatabase } from "./test-utils";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "@/lib/schema";
import { eq, sql } from "drizzle-orm";

describe("Authentication Flow Integration Tests", () => {
  let testEnv: Awaited<ReturnType<typeof createTestEnvironment>>;
  let db: ReturnType<typeof drizzle>;

  beforeAll(async () => {
    testEnv = await createTestEnvironment();
    db = testEnv.db;
  });

  afterAll(async () => {
    await cleanupTestDatabase(db);
  });

  describe("User Registration", () => {
    it("should create a new user with default credits", async () => {
      const userData = {
        id: "test-user-register",
        email: "register@example.com",
        name: "Register Test User",
        emailVerified: new Date(),
      };

      const result = await db.insert(schema.users).values(userData).returning();
      const user = result[0];

      expect(user).toMatchObject({
        id: "test-user-register",
        email: "register@example.com",
        name: "Register Test User",
        role: "user",
        credits: 10, // Default credits
      });

      // Verify user exists in database
      const dbUser = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, user.id));
      expect(dbUser).toHaveLength(1);
    });

    it("should enforce unique email constraint", async () => {
      const email = "unique-test@example.com";

      // Insert first user
      await db.insert(schema.users).values({
        id: "user-1",
        email,
        emailVerified: new Date(),
      });

      // Try to insert user with same email - should fail
      await expect(
        db.insert(schema.users).values({
          id: "user-2",
          email,
          emailVerified: new Date(),
        }),
      ).rejects.toThrow();
    });

    it("should enforce valid role values", async () => {
      const userData = {
        id: "invalid-role-user",
        email: "invalid-role@example.com",
        emailVerified: new Date(),
      };

      // Try to insert with invalid role - should fail
      await expect(
        db.insert(schema.users).values({
          ...userData,
          role: "invalid-role" as any,
        }),
      ).rejects.toThrow();
    });
  });

  describe("User Session Management", () => {
    it("should create a session for existing user", async () => {
      const userId = "session-test-user";

      // Create user first
      await db.insert(schema.users).values({
        id: userId,
        email: "session@example.com",
        emailVerified: new Date(),
      });

      // Create session
      const sessionData = {
        id: "session-1",
        sessionToken: "session-token-123",
        userId,
        expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      };

      const result = await db
        .insert(schema.sessions)
        .values(sessionData)
        .returning();
      const session = result[0];

      expect(session).toMatchObject({
        id: "session-1",
        sessionToken: "session-token-123",
        userId,
      });

      // Verify session exists
      const dbSession = await db
        .select()
        .from(schema.sessions)
        .where(eq(schema.sessions.id, session.id));
      expect(dbSession).toHaveLength(1);
    });

    it("should delete expired sessions", async () => {
      const userId = "expired-session-user";
      const expiredDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // Yesterday

      // Create user
      await db.insert(schema.users).values({
        id: userId,
        email: "expired@example.com",
        emailVerified: new Date(),
      });

      // Create expired session
      await db.insert(schema.sessions).values({
        id: "expired-session",
        sessionToken: "expired-token",
        userId,
        expires: expiredDate,
      });

      // Create valid session
      await db.insert(schema.sessions).values({
        id: "valid-session",
        sessionToken: "valid-token",
        userId,
        expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      // Clean up expired sessions
      await db.delete(schema.sessions).where(sql`expires < ${new Date()}`);

      // Verify only valid session remains
      const remainingSessions = await db.select().from(schema.sessions);
      expect(remainingSessions).toHaveLength(1);
      expect(remainingSessions[0].sessionToken).toBe("valid-token");
    });

    it("should cascade delete sessions when user is deleted", async () => {
      const userId = "cascade-delete-user";

      // Create user
      await db.insert(schema.users).values({
        id: userId,
        email: "cascade@example.com",
        emailVerified: new Date(),
      });

      // Create session
      await db.insert(schema.sessions).values({
        id: "cascade-session",
        sessionToken: "cascade-token",
        userId,
        expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      // Delete user
      await db.delete(schema.users).where(eq(schema.users.id, userId));

      // Verify session is also deleted
      const session = await db
        .select()
        .from(schema.sessions)
        .where(eq(schema.sessions.userId, userId));
      expect(session).toHaveLength(0);
    });
  });

  describe("OAuth Account Linking", () => {
    it("should link Google account to user", async () => {
      const userId = "google-link-user";

      // Create user
      await db.insert(schema.users).values({
        id: userId,
        email: "google@example.com",
        emailVerified: new Date(),
      });

      // Link Google account
      const accountData = {
        id: "google-account-1",
        userId,
        provider: "google",
        providerAccountId: "google-123",
        type: "oauth",
      };

      const result = await db
        .insert(schema.accounts)
        .values(accountData)
        .returning();
      const account = result[0];

      expect(account).toMatchObject({
        id: "google-account-1",
        userId,
        provider: "google",
        providerAccountId: "google-123",
        type: "oauth",
      });

      // Verify account exists
      const dbAccount = await db
        .select()
        .from(schema.accounts)
        .where(eq(schema.accounts.id, account.id));
      expect(dbAccount).toHaveLength(1);
    });

    it("should enforce unique provider account constraint", async () => {
      const userId = "unique-provider-user";
      const providerAccountId = "unique-provider-123";

      // Link first account
      await db.insert(schema.accounts).values({
        id: "account-1",
        userId,
        provider: "google",
        providerAccountId,
        type: "oauth",
      });

      // Try to link same provider account to same user - should fail
      await expect(
        db.insert(schema.accounts).values({
          id: "account-2",
          userId,
          provider: "google",
          providerAccountId,
          type: "oauth",
        }),
      ).rejects.toThrow();
    });

    it("should cascade delete accounts when user is deleted", async () => {
      const userId = "cascade-account-user";

      // Create user
      await db.insert(schema.users).values({
        id: userId,
        email: "cascade-account@example.com",
        emailVerified: new Date(),
      });

      // Link accounts
      await db.insert(schema.accounts).values([
        {
          id: "account-1",
          userId,
          provider: "google",
          providerAccountId: "google-123",
          type: "oauth",
        },
        {
          id: "account-2",
          userId,
          provider: "github",
          providerAccountId: "github-456",
          type: "oauth",
        },
      ]);

      // Delete user
      await db.delete(schema.users).where(eq(schema.users.id, userId));

      // Verify accounts are also deleted
      const accounts = await db
        .select()
        .from(schema.accounts)
        .where(eq(schema.accounts.userId, userId));
      expect(accounts).toHaveLength(0);
    });
  });

  describe("User Management", () => {
    it("should update user credits", async () => {
      const userId = "credits-update-user";

      // Create user
      await db.insert(schema.users).values({
        id: userId,
        email: "credits@example.com",
        emailVerified: new Date(),
        credits: 10,
      });

      // Update credits
      const result = await db
        .update(schema.users)
        .set({
          credits: 20,
          updatedAt: new Date(),
        })
        .where(eq(schema.users.id, userId))
        .returning();

      expect(result[0].credits).toBe(20);

      // Verify update
      const updatedUser = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, userId));
      expect(updatedUser[0].credits).toBe(20);
    });

    it("should enforce minimum credits constraint", async () => {
      const userId = "min-credits-user";

      // Create user
      await db.insert(schema.users).values({
        id: userId,
        email: "min-credits@example.com",
        emailVerified: new Date(),
        credits: 0,
      });

      // Try to set negative credits - should fail
      await expect(
        db
          .update(schema.users)
          .set({
            credits: -1,
          })
          .where(eq(schema.users.id, userId)),
      ).rejects.toThrow();
    });

    it("should fetch user with associated accounts", async () => {
      const userId = "with-accounts-user";

      // Create user
      await db.insert(schema.users).values({
        id: userId,
        email: "with-accounts@example.com",
        emailVerified: new Date(),
      });

      // Link accounts
      await db.insert(schema.accounts).values([
        {
          id: "account-1",
          userId,
          provider: "google",
          providerAccountId: "google-123",
          type: "oauth",
        },
        {
          id: "account-2",
          userId,
          provider: "github",
          providerAccountId: "github-456",
          type: "oauth",
        },
      ]);

      // Fetch user with accounts
      const userWithAccounts = await db
        .select({
          user: schema.users,
          accounts: schema.accounts,
        })
        .from(schema.users)
        .leftJoin(schema.accounts, eq(schema.accounts.userId, schema.users.id))
        .where(eq(schema.users.id, userId));

      expect(userWithAccounts).toHaveLength(3); // 1 user + 2 accounts
    });
  });

  describe("Admin Operations", () => {
    it("should create admin user", async () => {
      const adminData = {
        id: "admin-user",
        email: "admin@example.com",
        name: "Admin User",
        emailVerified: new Date(),
        role: "admin" as const,
      };

      const result = await db
        .insert(schema.users)
        .values(adminData)
        .returning();
      const admin = result[0];

      expect(admin.role).toBe("admin");

      // Verify admin has higher credits
      const dbAdmin = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, admin.id));
      expect(dbAdmin[0].role).toBe("admin");
    });

    it("should enforce valid admin role values", async () => {
      const userData = {
        id: "invalid-role-user-2",
        email: "invalid-role-2@example.com",
        emailVerified: new Date(),
      };

      // Try to insert with invalid admin role - should fail
      await expect(
        db.insert(schema.users).values({
          ...userData,
          role: "super-admin" as any,
        }),
      ).rejects.toThrow();
    });

    it("should update user role", async () => {
      const userId = "role-update-user";

      // Create user
      await db.insert(schema.users).values({
        id: userId,
        email: "role-update@example.com",
        emailVerified: new Date(),
        role: "user",
      });

      // Promote to admin
      const result = await db
        .update(schema.users)
        .set({
          role: "admin",
          updatedAt: new Date(),
        })
        .where(eq(schema.users.id, userId))
        .returning();

      expect(result[0].role).toBe("admin");

      // Verify update
      const updatedUser = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, userId));
      expect(updatedUser[0].role).toBe("admin");
    });
  });
});
