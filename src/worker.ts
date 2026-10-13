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
//   matches.ts           eligibility rules, windows, notified-match KV,
//                       pickHeroMatch (the shared hero expression)
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
//   digest.ts            weekly tables / morning digest / coronation
//   notifications.ts     per-match notification engine
//   users.ts             chats, member profiles, prefs, master list
//   admin.ts             sessions, settings, clubs catalog, dummy matches
//   public-matches.ts    /api/public-matches pipeline
//   bot.ts               Telegram webhook handler
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
