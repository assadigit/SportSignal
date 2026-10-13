-- v13.92-d1userstore — user data schema (D1 database `sportsignal-users`).
-- The user-ACTION write path (tz / teams / lang / join / leave / update
-- dedupe) moved off the STATE KV namespace: the KV daily write quota is
-- ACCOUNT-level on the free plan and exhausts every afternoon (error 10048)
-- because the account also hosts the sibling currena workers (measured
-- 2026-10-13: 631 STATE + 658 RATES writes before 14:00 UTC). D1's separate
-- 100k-writes/day free tier keeps user actions writable 24/7.
--
-- Semantics preserved from the KV blob era (byte-identical in-memory shape):
--   user_prefs_v1   {chatId: {teams?: string[], tz?: string, lang?: "fa"|"en"}}
--   telegram_users_v6  [chatId, ...]  (registry ONLY — /stop keeps prefs orphaned)
--   user_profiles_v1   {chatId: {username, first_name, title, joined}}
--   upd_<id>           "1" (TTL 600 — here: pruned probabilistically, 2h cut)
-- teams is a JSON-encoded array column (SQLite has no list type).
-- The one-time KV→D1 backfill writes `migrated_at` into userstore_meta; empty
-- D1 AFTER the marker means empty (a /stop-ed roster is never resurrected
-- from the stale KV snapshot).

CREATE TABLE IF NOT EXISTS user_prefs (
  chat_id INTEGER PRIMARY KEY,
  teams TEXT,
  tz TEXT,
  lang TEXT,
  updated_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_user_prefs_lang ON user_prefs(lang);

CREATE TABLE IF NOT EXISTS chats (
  chat_id INTEGER PRIMARY KEY,
  joined_at TEXT
);

CREATE TABLE IF NOT EXISTS chat_profiles (
  chat_id INTEGER PRIMARY KEY,
  username TEXT,
  first_name TEXT,
  title TEXT,
  joined TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS upd_dedupe (
  upd_id TEXT PRIMARY KEY,
  ts INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_upd_dedupe_ts ON upd_dedupe(ts);

CREATE TABLE IF NOT EXISTS userstore_meta (
  k TEXT PRIMARY KEY,
  v TEXT NOT NULL
);
