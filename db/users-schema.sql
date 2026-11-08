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

-- v13.102-perchat — PER-CHAT DELIVERY ledger. ROOT CAUSE (the reliability
-- audit's residual hole): the notified_v1 dedupe record is per (match, type)
-- GLOBAL, so a CPU-kill mid fan-out persists the record while the tail chats
-- got nothing — no outbox entry (their sends never ran), no retry (the record
-- blocks re-send), no trace (the tick blob died with the isolate). The audit
-- (notify-audit.ts) could see "match X notified" while chat Y silently missed
-- it. This ledger closes detection + enables the bounded in-window repair:
--   verdict 'sent'   — confirmed delivery (card photo OR text send ok)
--   verdict 'dead'   — confirmed dead chat (pruned; not a delivery gap)
--   verdict 'failed' — send failed after retries; the DEAD-LETTER OUTBOX
--                      owns recovery (a row exists precisely so the repair
--                      leg does NOT double-send behind the outbox)
--   verdict 'repair' — write-first marker of one repair attempt (at most one
--                      re-send per (match, type, chat), ever)
-- The audit pages the admin ONLY on NO-ROW gaps (the CPU-kill shape); rows
-- with failed/repair/dead are visible via /api/audit. Rows older than 48h
-- are irrelevant (the widest repair window — result backfill — ends at 24h)
-- and pruned opportunistically.
CREATE TABLE IF NOT EXISTS notify_deliveries_v1 (
  match_key TEXT NOT NULL,
  ntype TEXT NOT NULL,
  chat_id INTEGER NOT NULL,
  verdict TEXT NOT NULL,
  sent_at INTEGER NOT NULL,
  PRIMARY KEY (match_key, ntype, chat_id)
);
CREATE INDEX IF NOT EXISTS idx_deliveries_sent ON notify_deliveries_v1(sent_at);

-- v13.230-channelbase — the Telegram Channel Mirror CLAIM LEDGER (spec
-- docs/TELEGRAM_CHANNEL_MIRROR_SPEC.md PART IV §10; DISCOVERY §7.2). The
-- channel-side twin of notified_v1 (v13.94): destination-scoped,
-- write-first, fail-closed event idempotency — INSERT OR IGNORE against
-- PK (dest_key, event_key) makes the check+write ATOMIC; changes>0 ⟺ the
-- event is newly claimed (the channel send may proceed); changes=0
-- (already claimed: race, re-fire, stuck row) or a D1 error ⟺ NO send.
-- One logical notification occurrence → at most ONE channel post per
-- destination, ever. The private notified_v1 contract is UNTOUCHED —
-- disjoint by table AND by key shape, so a channel claim can never
-- suppress a private send or vice-versa. D1 (never KV) for the v13.94
-- reason: the anti-spam claim is the one write that must never be
-- KV-quota-starved; D1's separate 100k-writes/day tier makes it durable.
--   state 'claimed'     — the write-first marker (sent_at NULL; a stuck
--                          claim is Session 3's reconciliation surface,
--                          never a blind re-send — at-most-once bias)
--   state 'sent'        — confirmed post (sent_at set)
--   state 'failed'      — transient failure (outbox-owned retry, S3)
--   state 'unreachable' — permanent error class (pause-marker territory)
-- last_error carries a sanitized CLASS only ('permanent-403'), never a
-- raw error, payload, chat id or token. Rows are hygiene-pruned past 14
-- days (Session 3, the notified_v1 tidy pattern) — the never-re-arm line
-- is the row's existence, exactly notified_v1's law.
-- Applied while the mirror is DISABLED (empty [vars]) — the table is pure
-- foundation until Session 2 wires the hooks; nothing reads or writes it
-- before then.
--
-- Apply once (RUNBOOK §8b — idempotent, safe to re-run):
--   npx wrangler d1 execute sportsignal-users --remote --file=db/users-schema.sql
CREATE TABLE IF NOT EXISTS channel_posts_v1 (
  dest_key   TEXT NOT NULL,        -- "fa-football"
  event_key  TEXT NOT NULL,        -- the DISCOVERY §7.2 identity table (builders: src/channel-mirror.ts)
  claimed_at INTEGER NOT NULL,
  sent_at    INTEGER,              -- null = claimed/pending
  state      TEXT NOT NULL,        -- 'claimed' | 'sent' | 'failed' | 'unreachable'
  attempts   INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,                 -- sanitized CLASS only, never payload/token
  PRIMARY KEY (dest_key, event_key)
);
