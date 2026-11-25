// scripts/s281-seed-local-kv.js — seeds the LOCAL wrangler-dev KV (miniflare,
// .wrangler/state) for the v13.281.0-teamstrict smoke: a pool that covers the
// strict-gating verification matrix — selected clubs with upcoming fixtures,
// the Iranian big four's PGL rows (upcoming + finished), an off-policy ELC
// tie, an off-policy DED tie, a UCL tie with ONE selected side, an A-League
// row (site-hidden — must never surface), and a non-selected PL side. NOT for
// production (the local dev store only — never run against a live env).
// Usage: node scripts/s281-seed-local-kv.js
// Run while `npx wrangler dev --config wrangler.dev.toml --port 8787 --local`
// is STOPPED (miniflare reads the state dir at boot), then start dev + curl.
"use strict";
const { execSync } = require("child_process");
const path = require("path");
const root = path.resolve(__dirname, "..");

const now = Date.now();
const T = (min) => new Date(now + min * 6e4).toISOString();
const Tpast = (min) => new Date(now - min * 6e4).toISOString();

const pool = [
  // (1) selected-club PL tie (upcoming) — indexable, both teams url'd in JSON-LD
  { id: "t281-pl-1", utcDate: T(90), status: "TIMED", competition: { code: "PL" }, homeTeam: { name: "Arsenal FC", faName: "آرسنال", crest: null }, awayTeam: { name: "Fulham FC", faName: "فولام", crest: null }, score: null },
  // (2) a UCL tie with ONE selected side — indexable, ONLY the selected side gets a teamRef url
  { id: "t281-cl-1", utcDate: T(200), status: "TIMED", competition: { code: "CL" }, homeTeam: { name: "FC Barcelona", faName: "بارسا", crest: null }, awayTeam: { name: "SK Slovan Bratislava", faName: null, crest: null }, score: null },
  // (3) the Iranian big four — PGL upcoming rows (tiles + teams.xml + 200+index pages)
  { id: "t281-pgl-1", utcDate: T(320), status: "TIMED", competition: { code: "PGL" }, homeTeam: { name: "Persepolis", faName: "پرسپولیس", crest: null }, awayTeam: { name: "Gol Gohar FC", faName: null, crest: null }, score: null },
  { id: "t281-pgl-2", utcDate: T(340), status: "TIMED", competition: { code: "PGL" }, homeTeam: { name: "Esteghlal Tehran", faName: "استقلال", crest: null }, awayTeam: { name: "Zob Ahan", faName: null, crest: null }, score: null },
  { id: "t281-pgl-3", utcDate: T(360), status: "TIMED", competition: { code: "PGL" }, homeTeam: { name: "Sepahan", faName: "سپاهان", crest: null }, awayTeam: { name: "Foolad Khozestan", faName: null, crest: null }, score: null },
  { id: "t281-pgl-4", utcDate: T(380), status: "TIMED", competition: { code: "PGL" }, homeTeam: { name: "Tractor S.C.", faName: "تراکتور", crest: null }, awayTeam: { name: "Malavan", faName: null, crest: null }, score: null },
  // (4) OFF-POLICY: an ELC league tie (no selected club, no top3) — 200 + noindex,follow, no teamRef urls
  { id: "t281-elc-1", utcDate: T(120), status: "TIMED", competition: { code: "ELC" }, homeTeam: { name: "Hull City", faName: null, crest: null }, awayTeam: { name: "Brighton & Hove Albion", faName: null, crest: null }, score: null },
  // (5) OFF-POLICY FINISHED: a DED tie — archives (pool) + renders noindex,follow
  { id: "t281-ded-1", utcDate: Tpast(600), status: "FINISHED", competition: { code: "DED" }, homeTeam: { name: "PSV Eindhoven", faName: null, crest: null }, awayTeam: { name: "sc Heerenveen", faName: null, crest: null }, score: { home: 2, away: 1 } },
  // (6) an A-League row — site-hidden: never a page/list/sitemap row (and its archived twin 410s)
  { id: "t281-al-1", utcDate: Tpast(4000), status: "FINISHED", competition: { code: "AL" }, homeTeam: { name: "Sydney FC", faName: "سیدنی", crest: null }, awayTeam: { name: "Western Sydney Wanderers", faName: null, crest: null }, score: { home: 1, away: 1 } },
  // (7) a PGL big-four FINISHED row (the archived eligible class — stays in the archive child)
  { id: "t281-pgl-5", utcDate: Tpast(3000), status: "FINISHED", competition: { code: "PGL" }, homeTeam: { name: "Persepolis", faName: "پرسپولیس", crest: null }, awayTeam: { name: "Paykan", faName: null, crest: null }, score: { home: 3, away: 0 } }
];

function put(key, value) {
  const file = path.join(root, ".wrangler", "tmp-seed-" + key.replace(/[^a-z0-9]/gi, "_") + ".json");
  require("fs").mkdirSync(path.join(root, ".wrangler"), { recursive: true });
  require("fs").writeFileSync(file, JSON.stringify(value));
  execSync(`npx wrangler kv key put --config wrangler.dev.toml --namespace-id c63588df02ae4bf1bfdc18d19c5b3631 --local "${key}" --path "${file}"`, { cwd: root, stdio: "inherit" });
  require("fs").rmSync(file);
}

put("matches_v13_tracked", { matches: pool, fetchedAt: new Date().toISOString(), source: "s281-teamstrict-smoke" });
put("cron_status_v1", { heartbeat: String(now - 6e5), last_cron: String(now - 6e5), last_full_sweep: String(now - 6e5), kv_day: new Date().toISOString().slice(0, 10), kv_writes_day: 0 });
console.log("seeded local KV (matches_v13_tracked: " + pool.length + " rows — the teamstrict smoke matrix)");
