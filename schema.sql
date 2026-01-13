-- Adocavo Intelligence schema (D1 / SQLite)

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT,
  email TEXT NOT NULL UNIQUE,
  emailVerified INTEGER,
  image TEXT,
  role TEXT NOT NULL DEFAULT 'user',
  credits INTEGER NOT NULL DEFAULT 10,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  CHECK (credits >= 0),
  CHECK (role IN ('user', 'pro', 'admin'))
);

CREATE INDEX IF NOT EXISTS users_email_idx ON users (email);
CREATE INDEX IF NOT EXISTS users_role_idx ON users (role);

CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  type TEXT NOT NULL,
  provider TEXT NOT NULL,
  providerAccountId TEXT NOT NULL,
  refresh_token TEXT,
  access_token TEXT,
  expires_at INTEGER,
  token_type TEXT,
  scope TEXT,
  id_token TEXT,
  session_state TEXT,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS accounts_user_idx ON accounts (userId);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  sessionToken TEXT NOT NULL UNIQUE,
  userId TEXT NOT NULL,
  expires INTEGER NOT NULL,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions (userId);
CREATE INDEX IF NOT EXISTS sessions_expires_idx ON sessions (expires);
CREATE INDEX IF NOT EXISTS sessions_expires_cleanup_idx ON sessions (expires);

CREATE TABLE IF NOT EXISTS verificationTokens (
  identifier TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires INTEGER NOT NULL,
  PRIMARY KEY (identifier, token)
);

CREATE TABLE IF NOT EXISTS hooks (
  id TEXT PRIMARY KEY,
  text TEXT NOT NULL,
  category TEXT NOT NULL,
  engagement_score INTEGER NOT NULL,
  source TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS hooks_category_active_score_idx ON hooks (category, is_active, engagement_score DESC);

CREATE TABLE IF NOT EXISTS hook_review_queue (
  id TEXT PRIMARY KEY,
  text TEXT NOT NULL,
  category TEXT NOT NULL,
  engagement_score INTEGER NOT NULL,
  source TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  reviewer_id TEXT,
  reviewed_at INTEGER,
  notes TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE SET NULL,
  CHECK (status IN ('pending', 'approved', 'rejected'))
);

CREATE INDEX IF NOT EXISTS hook_review_status_created_idx ON hook_review_queue (status, created_at DESC);
CREATE INDEX IF NOT EXISTS hook_review_category_idx ON hook_review_queue (category);

CREATE TABLE IF NOT EXISTS generated_scripts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  hook_id TEXT NOT NULL,
  product_description TEXT NOT NULL,
  remix_tone TEXT,
  remix_instruction TEXT,
  scripts TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (hook_id) REFERENCES hooks(id)
);

CREATE INDEX IF NOT EXISTS generated_scripts_user_idx ON generated_scripts (user_id);
CREATE INDEX IF NOT EXISTS generated_scripts_user_created_idx ON generated_scripts (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS generated_scripts_hook_idx ON generated_scripts (hook_id);
CREATE INDEX IF NOT EXISTS generated_scripts_hook_created_idx ON generated_scripts (hook_id, created_at DESC);

CREATE TABLE IF NOT EXISTS competitor_analyses (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  tiktok_url TEXT NOT NULL,
  title TEXT,
  author TEXT,
  transcript TEXT NOT NULL,
  transcript_source TEXT NOT NULL,
  hook TEXT,
  structure TEXT,
  template TEXT,
  cta TEXT,
  notes TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS competitor_analyses_user_idx ON competitor_analyses (user_id);
CREATE INDEX IF NOT EXISTS competitor_analyses_user_created_idx ON competitor_analyses (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS waitlist (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  email TEXT NOT NULL UNIQUE,
  feature_interest TEXT,
  source_url TEXT,
  user_tier TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS waitlist_email_idx ON waitlist (email);

CREATE TABLE IF NOT EXISTS fake_door_clicks (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  feature TEXT NOT NULL,
  clicked_at INTEGER NOT NULL DEFAULT (unixepoch()),
  user_agent TEXT,
  referrer TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS fake_door_feature_idx ON fake_door_clicks (feature);

CREATE TABLE IF NOT EXISTS rate_limits (
  ip TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  reset_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (ip, endpoint),
  CHECK (reset_at > updated_at)
);

CREATE INDEX IF NOT EXISTS rate_limits_endpoint_idx ON rate_limits (endpoint);
CREATE INDEX IF NOT EXISTS rate_limits_reset_idx ON rate_limits (reset_at);

CREATE TABLE IF NOT EXISTS script_ratings (
  id TEXT PRIMARY KEY,
  generated_script_id TEXT NOT NULL,
  user_id TEXT,
  script_index INTEGER NOT NULL,
  rating INTEGER NOT NULL,
  is_helpful INTEGER DEFAULT 1,
  feedback TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (generated_script_id) REFERENCES generated_scripts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  CHECK (rating BETWEEN 1 AND 5)
);

CREATE INDEX IF NOT EXISTS script_ratings_script_idx ON script_ratings (generated_script_id);
CREATE INDEX IF NOT EXISTS script_ratings_script_rating_idx ON script_ratings (generated_script_id, rating);
CREATE INDEX IF NOT EXISTS script_ratings_rating_idx ON script_ratings (rating);
CREATE INDEX IF NOT EXISTS script_ratings_user_idx ON script_ratings (user_id);
CREATE UNIQUE INDEX IF NOT EXISTS script_ratings_user_script_idx ON script_ratings (generated_script_id, user_id);

CREATE TABLE IF NOT EXISTS script_favorites (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  generated_script_id TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (generated_script_id) REFERENCES generated_scripts(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS script_favorites_user_script_unique ON script_favorites (user_id, generated_script_id);
CREATE INDEX IF NOT EXISTS script_favorites_user_idx ON script_favorites (user_id);
CREATE INDEX IF NOT EXISTS script_favorites_user_created_idx ON script_favorites (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS script_favorites_script_idx ON script_favorites (generated_script_id);
