// SportSignal — Cloudflare Worker entry point.
//
// The monolithic v12.33-xpost bundle was split into real ES modules in
// v13.0 (the extraction pipeline was retired in v13.46-trim — history
// lives in git and CHANGELOG). This file is a thin re-export: wrangler's
// esbuild bundles the module graph from here, exactly like the old single
// file.
//
// Module map:
//   config.ts            VERSION, CONFIG (KV-key contract)
//   tables.ts            static dictionaries/logos/provider ids/CSP (13.47)
//   utils.ts             digits/dates/auth-hash/subrequest/HTTP helpers
//   fa-dict.ts           static Farsi team dictionary (layer 1)
//   translate.ts         3-layer translation + competition helpers
//   fa-ai.ts             Workers AI Farsi-name learner (layer 2)
//   match-model.ts        the status vocabulary + event→match format helpers
//   match-windows.ts      notification time windows + backfill eligibility
//   match-dedupe.ts       notified-match KV store + the write-first send gate
//   match-classify.ts     eligibility, big-match/derby sets, pickHeroMatch
//   provider-breaker.ts  per-provider suspension circuit (prov_down_*)
//   provider-wikipedia.ts PGL standings fallback (Wikipedia scrape)
//   provider-sportscore.ts sportscore day fetch + day-window sweep
//   provider-tsp.ts      thesportsdb mapper + league-views sweep
//   provider-fd.ts       football-data range fetch + 429 suspension
//   match-pool.ts        the KV pool (matches_v13_tracked) read/write
//   provider-cups.ts     domestic-cup scans (big-team + far probe)
//   providers.ts         sweep orchestrators (long view, live sweep, merge)
//   telegram.ts          Bot API senders (retry, 429 pause, dead-chat)
//   composers.ts         message composers + standings pipeline
//   digest-weekly.ts     Monday league tables + week-ahead fixtures
//   digest-morning.ts    the 9am matchday digest (per-chat KV dedupe)
//   digest-bigmatch.ts   big-match FT + kickoff broadcasts
//   digest-coronation.ts table-top coronation alerts
//   notify-engine.ts     NOTIFICATION_CONFIGS + the fan-out engine
//   notify-status.ts     kickoff/HT/FT status-change detection
//   notify-audit.ts      notified-match gap audit
//   users.ts             chats, member profiles, prefs, master list
//   admin.ts             sessions, settings, clubs catalog, dummy matches
//   (pages/*: page templates — admin.ts is now a thin composer over
//   pages/admin-css/-html/-js + styles-shared; byte-parity-guarded)
//   public-matches.ts    /api/public-matches pipeline
//   bot-ui.ts            reply keyboard, command normalizer, grids/pickers
//   bot.ts               Telegram webhook router (handleTelegramUpdate)
//   cron-preflight.ts    settings/caches/status/budget + stale alert
//   cron-users.ts         outbox drain, heartbeat, migration, FA-AI, cap
//   cron-pool.ts          the sweep decision (quiet/live/full/long-view)
//   cron-maintenance.ts   cup scans, pool stamp-advance, standings
//   cron-notify.ts        fan-out, big-match broadcasts, digests, audit
//   cron-public.ts        prewarm + the live overlay write
//   cron.ts               the */10 sweep SHELL (meter/lock/blob fold)
//   monitoring.ts        status blob reader + phase alerts + fingerprint
//   migration.ts         bot-migration broadcast (13.47)
//   auth.ts              admin login/logout/change-password (13.47)
//   public-swr.ts        public-matches SWR endpoint (13.47)
//   card-route.ts        /api/card/:matchKey SVG/PNG (13.47)
//   simulate.ts          POST /api/simulate harness (13.47)
//   admin-ops.ts         admin/ops routes + legacy GET actions (13.47)
//   api.ts               HTTP router (fetch + scheduled)
//   pages/*.ts           PUBLIC / LOGIN / ADMIN page templates

import worker from "./api";
export default worker;
