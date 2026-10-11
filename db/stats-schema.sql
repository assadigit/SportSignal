-- SportSignal visitor-stats schema (D1).
--
-- v13.56-visitcount: a tiny, cookieless, IP-free page-view counter. One row
-- per Tehran-calendar day; the worker upserts pageviews+1 on every real
-- (non-bot) browser beacon. NO IP, NO fingerprint, NO cookies, NO personal
-- data — aggregate counts only (see /privacy). Isolated in its own D1
-- database (sportsignal-stats) so the daily write volume never touches the
-- STATE KV namespace's 1,000-writes/day free-tier quota (the chronic
-- 13.55-epochflow pain point); D1's free tier allows 100k writes/day.
--
-- Apply once:  npx wrangler d1 execute sportsignal-stats --file=db/stats-schema.sql

CREATE TABLE IF NOT EXISTS daily_stats (
  day       TEXT PRIMARY KEY,           -- YYYY-MM-DD in Asia/Tehran (en-CA calendar)
  pageviews INTEGER NOT NULL DEFAULT 0, -- one beacon = one view (bots excluded server-side)
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- tracking_since: the first day a visit was ever recorded (for the honest
-- "counting since" line on the admin dashboard). Written once, never updated.
CREATE TABLE IF NOT EXISTS stats_meta (
  k TEXT PRIMARY KEY,
  v TEXT NOT NULL
);
INSERT OR IGNORE INTO stats_meta (k, v) VALUES ('tracking_since', '');
