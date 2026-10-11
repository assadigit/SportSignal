-- SportSignal visitor-stats schema v2 (D1) — unique visitors + countries + online.
--
-- v13.57-uniqueregions: extends v13.56 with (a) daily unique-visitor dedup via
-- a salted one-way SHA-256 hash of IP+UA+day (the IP itself is NEVER stored —
-- only the salted hash, which is per-day and pruned), (b) per-day per-country
-- aggregate counts (Cloudflare's CF-IPCountry / req.cf.country — a country
-- CODE is not personal data), and (c) live "online now" tracking via a
-- last-seen timestamp per visitor hash (pruned hourly).
--
-- The salt is auto-generated once (crypto.getRandomValues) and stored in
-- stats_meta(key='salt') — never in source, never a secret the owner must set.
-- See src/stats.ts. Apply on top of db/stats-schema.sql.
--
-- Apply:  npx wrangler d1 execute sportsignal-stats --remote --file=db/stats-schema-v2.sql

-- (1) daily_stats: add a visitors (unique) column alongside pageviews.
--     SQLite ALTER has no IF NOT EXISTS; the column does not exist yet in v1,
--     so this succeeds on first run. Re-running errors harmlessly ("duplicate
--     column name") — wrangler reports it but the column is already there.
ALTER TABLE daily_stats ADD COLUMN visitors INTEGER NOT NULL DEFAULT 0;

-- (2) daily_visitors: one row per (day, visitor_hash). PK enables
--     INSERT OR IGNORE → changes>0 means a NEW unique visitor for that day.
--     Pruned to ~30 days (a returning visitor on a new day is a new row).
CREATE TABLE IF NOT EXISTS daily_visitors (
  day     TEXT NOT NULL,
  visitor TEXT NOT NULL,
  PRIMARY KEY (day, visitor)
);

-- (3) country_stats: per-day per-country aggregate (visitors = unique,
--     pageviews = total). country is the ISO-3166 alpha-2 code Cloudflare
--     populates (IR, GB, AU, …) — a country code is not personal data.
--     Pruned to ~90 days.
CREATE TABLE IF NOT EXISTS country_stats (
  day       TEXT NOT NULL,
  country   TEXT NOT NULL,
  visitors  INTEGER NOT NULL DEFAULT 0,
  pageviews INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, country)
);

-- (4) visitor_online: last-seen epoch-seconds per visitor hash. "Online now"
--     = last_seen within ONLINE_WINDOW_SECONDS (300). Pruned to entries seen
--     in the last hour (occasional 2%-chance cleanup in recordVisit).
CREATE TABLE IF NOT EXISTS visitor_online (
  visitor   TEXT PRIMARY KEY,
  last_seen INTEGER NOT NULL
);

-- (5) stats_meta: the auto-generated salt row is created lazily by the worker
--     on first beacon (key='salt'). tracking_since already exists from v1.
INSERT OR IGNORE INTO stats_meta (k, v) VALUES ('salt', '');
