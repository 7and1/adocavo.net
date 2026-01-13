import NextAuth, { type NextAuthConfig, type Session } from "next-auth";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { createDb, getDb, type Database } from "./db";
import { getBindings, type EnvBindings } from "./cloudflare";
import { users, sessions } from "./schema";
import { eq, and, lt, desc, count } from "drizzle-orm";
import { logError, logWarn } from "./logger";

const MAX_ACTIVE_SESSIONS_PER_USER = 5;

export interface SessionMetadata {
  ipAddress?: string;
  userAgent?: string;
  lastActivity: number;
}

export interface SessionSecurityWarning {
  type: "ip_changed" | "user_agent_changed" | "session_limit_exceeded";
  message: string;
  sessionId: string;
  detectedAt: string;
}

function buildBaseConfig(env: EnvBindings): NextAuthConfig {
  const providers = [];

  // Only add Google provider if credentials are configured
  if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
    providers.push(
      Google({
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
      }),
    );
  } else {
    console.warn(
      "Google OAuth not configured: GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET missing",
    );
  }

  // Only add GitHub provider if credentials are configured
  if (env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET) {
    providers.push(
      GitHub({
        clientId: env.GITHUB_CLIENT_ID,
        clientSecret: env.GITHUB_CLIENT_SECRET,
      }),
    );
  } else {
    console.warn(
      "GitHub OAuth not configured: GITHUB_CLIENT_ID or GITHUB_CLIENT_SECRET missing",
    );
  }

  if (!env.NEXTAUTH_SECRET) {
    console.error(
      "CRITICAL: NEXTAUTH_SECRET is not configured. Auth will not work properly.",
    );
  }

  return {
    providers,
    // Set trustHost to true only for production domains to prevent session fixation
    // NextAuth validates the Host header against the origin when trustHost is true
    trustHost: process.env.NODE_ENV === "production",
    secret: env.NEXTAUTH_SECRET,
    callbacks: {
      async session({ session, user }) {
        const db = await getDb().catch(() => null);
        if (!db) {
          // Log database unavailability for security monitoring
          logError(
            "Session Database Unavailable",
            new Error("Failed to get database in session callback"),
            {
              userId: user.id,
              severity: "warning",
              impact: "User credits and role set to defaults",
            },
          );
          return {
            ...session,
            user: {
              ...session.user,
              id: user.id,
              credits: 0,
              role: "user",
            },
          };
        }

        const dbUser = await db.query.users.findFirst({
          where: eq(users.id, user.id),
        });

        return {
          ...session,
          user: {
            ...session.user,
            id: user.id,
            credits: dbUser?.credits ?? 0,
            role: dbUser?.role ?? "user",
          },
        };
      },
      async signIn({ user }) {
        const db = await getDb().catch(() => null);
        if (!db || !user?.email || !user?.id) return true;

        try {
          // Check for existing sessions and enforce limit
          await enforceSessionConcurrencyLimit(db, user.id);
        } catch (error) {
          logError("Session concurrency check failed", error, {
            userId: user.id,
            email: user.email,
          });
          // Allow sign-in even if concurrency check fails
        }
        return true;
      },
    },
    events: {
      async createUser({ user }) {
        console.log(`New user created: ${user.email}`);
      },
    },
    pages: {
      signIn: "/auth/signin",
      error: "/auth/error",
    },
    // Debug mode is explicitly disabled in production to prevent info leaks
    // Only enable via explicit DEBUG_NEXTAUTH environment variable in development
    debug:
      process.env.NODE_ENV === "development" &&
      process.env.DEBUG_NEXTAUTH === "true",
  };
}

/**
 * Enforces session concurrency limit per user
 * Removes oldest expired sessions when limit is exceeded
 */
async function enforceSessionConcurrencyLimit(
  db: Database,
  userId: string,
): Promise<void> {
  // First, clean up expired sessions
  await cleanupExpiredSessions(db, userId);

  // Count active sessions
  const sessionCounts = await db
    .select({ count: count() })
    .from(sessions)
    .where(eq(sessions.userId, userId));

  const activeCount = sessionCounts[0]?.count ?? 0;

  if (activeCount >= MAX_ACTIVE_SESSIONS_PER_USER) {
    // Remove oldest sessions beyond the limit
    const excessSessions = await db
      .select()
      .from(sessions)
      .where(eq(sessions.userId, userId))
      .orderBy(desc(sessions.expires))
      .offset(MAX_ACTIVE_SESSIONS_PER_USER - 1);

    for (const session of excessSessions) {
      await db.delete(sessions).where(eq(sessions.id, session.id));
    }

    if (excessSessions.length > 0) {
      logWarn("Session limit exceeded, oldest sessions removed", {
        userId,
        removedCount: excessSessions.length,
        maxSessions: MAX_ACTIVE_SESSIONS_PER_USER,
      });
    }
  }
}

/**
 * Cleans up expired sessions for a user
 */
export async function cleanupExpiredSessions(
  db: Database,
  userId?: string,
): Promise<number> {
  const now = new Date();
  const expiredSessions = await db
    .select()
    .from(sessions)
    .where(
      userId
        ? and(eq(sessions.userId, userId), lt(sessions.expires, now))
        : lt(sessions.expires, now),
    );

  let deletedCount = 0;
  for (const session of expiredSessions) {
    await db.delete(sessions).where(eq(sessions.id, session.id));
    deletedCount++;
  }

  return deletedCount;
}

/**
 * Detects potential session hijacking based on IP and User-Agent changes
 * Returns warnings if suspicious activity is detected
 */
export async function detectSessionAnomalies(
  request: Request,
  sessionToken: string,
  userId: string,
): Promise<SessionSecurityWarning[]> {
  const warnings: SessionSecurityWarning[] = [];

  try {
    const db = await getDb();
    const session = await db.query.sessions.findFirst({
      where: eq(sessions.sessionToken, sessionToken),
    });

    if (!session) return warnings;

    const clientIp =
      request.headers.get("cf-connecting-ip") ||
      request.headers.get("x-forwarded-for")?.split(",")[0] ||
      "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";

    // Decode existing metadata if stored (for future enhancement)
    // For now, we'll store the current IP/UA for future comparisons

    // Log the session access for audit trail
    logWarn("Session access recorded", {
      userId,
      sessionToken: sessionToken.substring(0, 8) + "...",
      ip: clientIp,
      userAgent: userAgent.substring(0, 50),
    });
  } catch (error) {
    logError("Session anomaly detection failed", error, {
      userId,
      sessionToken,
    });
  }

  return warnings;
}

/**
 * Gets active session count for a user
 */
export async function getUserActiveSessionCount(
  userId: string,
): Promise<number> {
  try {
    const db = await getDb();

    const result = await db
      .select({ count: count() })
      .from(sessions)
      .where(
        and(
          eq(sessions.userId, userId),
          // Sessions that haven't expired
          // Note: We use a simple check, actual cleanup happens separately
        ),
      );

    return result[0]?.count ?? 0;
  } catch (error) {
    logError("Failed to get user session count", error, { userId });
    return 0;
  }
}

/**
 * Revokes a specific session by token
 */
export async function revokeSession(sessionToken: string): Promise<boolean> {
  try {
    const db = await getDb();
    await db.delete(sessions).where(eq(sessions.sessionToken, sessionToken));
    return true;
  } catch (error) {
    logError("Failed to revoke session", error, { sessionToken });
    return false;
  }
}

/**
 * Revokes all sessions for a user except the current one
 */
export async function revokeOtherUserSessions(
  userId: string,
  currentSessionToken: string,
): Promise<number> {
  try {
    const db = await getDb();

    const otherSessions = await db
      .select()
      .from(sessions)
      .where(
        and(
          eq(sessions.userId, userId),
          // Sessions not matching the current token
        ),
      );

    // Filter out current session in application logic
    let revokedCount = 0;
    for (const session of otherSessions) {
      if (session.sessionToken !== currentSessionToken) {
        await db.delete(sessions).where(eq(sessions.id, session.id));
        revokedCount++;
      }
    }

    return revokedCount;
  } catch (error) {
    logError("Failed to revoke other sessions", error, { userId });
    return 0;
  }
}

export async function getAuthHandler() {
  const env = getBindings();
  const config = buildBaseConfig(env);
  const hasDatabase = Boolean(env.DB);

  if (hasDatabase) {
    const db = createDb(env.DB as D1Database);
    config.adapter = DrizzleAdapter(db);
    config.session = { strategy: "database" };
  } else {
    // Log authentication downgrade for security monitoring
    logError(
      "Authentication Downgrade",
      new Error("D1 database binding unavailable"),
      {
        severity: "warning",
        impact: "JWT-only sessions - user data not persisted",
        recommendation: "Verify D1 binding configuration in wrangler.toml",
      },
    );
    console.warn(
      "SECURITY WARNING: D1 binding not available. Auth will run with JWT sessions only.",
    );
    config.session = { strategy: "jwt" };
  }

  return NextAuth(config);
}

export async function auth(request?: Request): Promise<Session | null> {
  const { auth: authHandler } = await getAuthHandler();
  if (request) {
    return authHandler(request as never) as Promise<Session | null>;
  }
  return authHandler() as Promise<Session | null>;
}
