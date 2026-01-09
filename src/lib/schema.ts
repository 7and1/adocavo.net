import {
  sqliteTable,
  text,
  integer,
  primaryKey,
  index,
  unique,
} from "drizzle-orm/sqlite-core";
import {
  relations,
  type InferInsertModel,
  type InferSelectModel,
} from "drizzle-orm";

export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    name: text("name"),
    email: text("email").notNull().unique(),
    emailVerified: integer("emailVerified", { mode: "timestamp" }),
    image: text("image"),
    role: text("role").default("user").notNull(),
    credits: integer("credits").default(10).notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .defaultNow()
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    emailIdx: index("users_email_idx").on(table.email),
    roleIdx: index("users_role_idx").on(table.role),
  }),
);

export const accounts = sqliteTable(
  "accounts",
  {
    id: text("id").primaryKey(),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (table) => ({
    userIdx: index("accounts_user_idx").on(table.userId),
  }),
);

export const sessions = sqliteTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    sessionToken: text("sessionToken").notNull().unique(),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expires: integer("expires", { mode: "timestamp" }).notNull(),
  },
  (table) => ({
    userIdx: index("sessions_user_idx").on(table.userId),
    expiresIdx: index("sessions_expires_idx").on(table.expires),
  }),
);

export const verificationTokens = sqliteTable(
  "verificationTokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull().unique(),
    expires: integer("expires", { mode: "timestamp" }).notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.identifier, table.token] }),
  }),
);

export const hooks = sqliteTable(
  "hooks",
  {
    id: text("id").primaryKey(),
    text: text("text").notNull(),
    category: text("category").notNull(),
    engagementScore: integer("engagement_score").notNull(),
    source: text("source"),
    isActive: integer("is_active", { mode: "boolean" }).default(true).notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .defaultNow()
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    categoryScoreIdx: index("hooks_category_score_idx").on(
      table.category,
      table.engagementScore,
    ),
    activeIdx: index("hooks_active_idx").on(table.isActive),
  }),
);

export const generatedScripts = sqliteTable(
  "generated_scripts",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    hookId: text("hook_id")
      .notNull()
      .references(() => hooks.id),
    productDescription: text("product_description").notNull(),
    scripts: text("scripts", { mode: "json" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    userIdx: index("generated_scripts_user_idx").on(table.userId),
    hookIdx: index("generated_scripts_hook_idx").on(table.hookId),
  }),
);

export const waitlist = sqliteTable(
  "waitlist",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").references(() => users.id),
    email: text("email").notNull().unique(),
    featureInterest: text("feature_interest"),
    sourceUrl: text("source_url"),
    userTier: text("user_tier"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    emailIdx: index("waitlist_email_idx").on(table.email),
  }),
);

export const fakeDoorClicks = sqliteTable(
  "fake_door_clicks",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").references(() => users.id),
    feature: text("feature").notNull(),
    clickedAt: integer("clicked_at", { mode: "timestamp" })
      .defaultNow()
      .notNull(),
    userAgent: text("user_agent"),
    referrer: text("referrer"),
  },
  (table) => ({
    featureIdx: index("fake_door_feature_idx").on(table.feature),
  }),
);

export const rateLimits = sqliteTable(
  "rate_limits",
  {
    ip: text("ip").notNull(),
    endpoint: text("endpoint").notNull(),
    count: integer("count").notNull().default(0),
    resetAt: integer("reset_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.ip, table.endpoint] }),
    endpointIdx: index("rate_limits_endpoint_idx").on(table.endpoint),
  }),
);

export const scriptRatings = sqliteTable(
  "script_ratings",
  {
    id: text("id").primaryKey(),
    generatedScriptId: text("generated_script_id")
      .notNull()
      .references(() => generatedScripts.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    scriptIndex: integer("script_index").notNull(),
    rating: integer("rating").notNull(),
    isHelpful: integer("is_helpful", { mode: "boolean" }).default(true),
    feedback: text("feedback"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    scriptIdx: index("script_ratings_script_idx").on(table.generatedScriptId),
    userIdx: index("script_ratings_user_idx").on(table.userId),
    uniqueUserScript: unique("script_ratings_user_script_idx").on(
      table.generatedScriptId,
      table.userId,
    ),
  }),
);

export const scriptFavorites = sqliteTable(
  "script_favorites",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    generatedScriptId: text("generated_script_id")
      .notNull()
      .references(() => generatedScripts.id, { onDelete: "cascade" }),
    createdAt: integer("created_at", { mode: "timestamp" })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    userIdx: index("script_favorites_user_idx").on(table.userId),
    scriptIdx: index("script_favorites_script_idx").on(table.generatedScriptId),
    uniqueUserScript: primaryKey({
      columns: [table.userId, table.generatedScriptId],
    }),
  }),
);

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
  generatedScripts: many(generatedScripts),
}));

export const hooksRelations = relations(hooks, ({ many }) => ({
  generatedScripts: many(generatedScripts),
}));

export const generatedScriptsRelations = relations(
  generatedScripts,
  ({ one }) => ({
    user: one(users, {
      fields: [generatedScripts.userId],
      references: [users.id],
    }),
    hook: one(hooks, {
      fields: [generatedScripts.hookId],
      references: [hooks.id],
    }),
  }),
);

export type User = InferSelectModel<typeof users>;
export type Hook = InferSelectModel<typeof hooks>;
export type GeneratedScript = InferSelectModel<typeof generatedScripts>;
export type WaitlistEntry = InferSelectModel<typeof waitlist>;
export type NewHook = InferInsertModel<typeof hooks>;
export type ScriptRating = InferSelectModel<typeof scriptRatings>;
export type ScriptFavorite = InferSelectModel<typeof scriptFavorites>;
