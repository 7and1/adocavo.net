import NextAuth, { type NextAuthConfig, type Session } from "next-auth";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { createDb, getDb } from "./db";
import { getBindings, type EnvBindings } from "./cloudflare";
import { users } from "./schema";
import { eq } from "drizzle-orm";

function buildBaseConfig(env: EnvBindings): NextAuthConfig {
  return {
    providers: [
      Google({
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
      }),
      GitHub({
        clientId: env.GITHUB_CLIENT_ID,
        clientSecret: env.GITHUB_CLIENT_SECRET,
      }),
    ],
    // Set trustHost to true only for production domains to prevent session fixation
    // NextAuth validates the Host header against the origin when trustHost is true
    trustHost: process.env.NODE_ENV === "production",
    secret: env.NEXTAUTH_SECRET,
    callbacks: {
      async session({ session, user }) {
        const db = await getDb().catch(() => null);
        if (!db) {
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

export async function getAuthHandler() {
  const env = getBindings();
  const config = buildBaseConfig(env);
  const hasDatabase = Boolean(env.DB);

  if (hasDatabase) {
    const db = createDb(env.DB as D1Database);
    config.adapter = DrizzleAdapter(db);
    config.session = { strategy: "database" };
  } else {
    console.warn(
      "D1 binding not available. Auth will run with JWT sessions only.",
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
