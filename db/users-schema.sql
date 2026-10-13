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

-- v13.94-fanoutfix — the notified-match DEDUPE store. ROOT CAUSE (live
-- forensics 2026-10-13): the KV daily write quota is ACCOUNT-level and
-- exhausts every afternoon/evening (error 10048; measured again today via
-- the REST probe). The write-first dedupe put is THE critical write of the
-- notification pipeline — while it fails, every send defers; when the
-- failure outlives the notification windows, whole matchdays vanish for
-- every user (the audit's 2026-10-09/10/11 gaps: Dortmund-Werder,
-- Liverpool-ManCity, Barca-Getafe, ManUtd-Tottenham... zero records).
-- D1's separate 100k-writes/day free tier makes the write-first gate
-- durable 24/7. PK (match_key, ntype) = the "never-re-arm" line: a row
-- exists ⟺ the (match, type) fired; INSERT OR IGNORE makes the check+write
-- ATOMIC (the KV blob needed a whole-key read-modify-write).
CREATE TABLE IF NOT EXISTS notified_v1 (
  match_key TEXT NOT NULL,
  ntype TEXT NOT NULL,
  notified_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  match_date TEXT,
  PRIMARY KEY (match_key, ntype)
);
CREATE INDEX IF NOT EXISTS idx_notified_exp ON notified_v1(expires_at);
