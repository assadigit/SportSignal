// SportSignal — Cloudflare Worker entry point.
//
// The monolithic v12.33-xpost bundle was split into real ES modules
// (see scripts/refactor-extract.mjs for the verbatim extraction map).
// This file is now a thin re-export: wrangler's esbuild bundles the
// module graph from here, exactly like the old single file.
//
// Module map:
//   config.ts            VERSION, CONFIG, X_CONFIG + static tables
//   utils.ts             digits/dates/auth-hash/subrequest/HTTP helpers
//   fa-dict.ts           static Farsi team dictionary (layer 1)
//   translate.ts         3-layer translation + competition helpers
//   fa-ai.ts             Workers AI Farsi-name learner (layer 2)
//   matches.ts           eligibility rules, windows, notified-match KV
//   providers.ts         football-data / sportscore / thesportsdb / wiki
//   telegram.ts          Bot API senders (retry, 429 pause, dead-chat)
//   composers.ts         message composers + standings pipeline
//   digest.ts            weekly tables / morning digest / coronation
//   x.ts                 X (Twitter) automated profile
//   notifications.ts     per-match notification engine
//   users.ts             chats, member profiles, prefs, master list
//   admin.ts             sessions, settings, clubs catalog, dummy matches
//   public-matches.ts    /api/public-matches pipeline
//   bot.ts               Telegram webhook handler
//   cron.ts              the */10 sweep
//   api.ts               HTTP router (fetch + scheduled)
//   pages/*.ts           PUBLIC / LOGIN / ADMIN page templates

import { CONFIG, VERSION, X_CONFIG } from "./config";
import worker from "./api";
export default worker;
