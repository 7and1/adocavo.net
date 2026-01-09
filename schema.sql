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
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
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

CREATE INDEX IF NOT EXISTS hooks_category_score_idx ON hooks (category, engagement_score);
CREATE INDEX IF NOT EXISTS hooks_active_idx ON hooks (is_active);

CREATE TABLE IF NOT EXISTS generated_scripts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  hook_id TEXT NOT NULL,
  product_description TEXT NOT NULL,
  scripts TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (hook_id) REFERENCES hooks(id)
);

CREATE INDEX IF NOT EXISTS generated_scripts_user_idx ON generated_scripts (user_id);
CREATE INDEX IF NOT EXISTS generated_scripts_hook_idx ON generated_scripts (hook_id);

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
  PRIMARY KEY (ip, endpoint)
);

CREATE INDEX IF NOT EXISTS rate_limits_endpoint_idx ON rate_limits (endpoint);
