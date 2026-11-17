// scripts/s19-seed-local-kv.js — seeds the LOCAL wrangler-dev KV + D1
// (miniflare, .wrangler/state) for the S19 goal-alert cron-tick smoke: a
// pool carrying ONE live match (Barcelona vs Real Madrid, IN_PLAY, kickoff
// ~2h past so the engine's match-start window is closed and ONLY the goal
// layer can fire) + a registered follower chat in the local USERS_DB. NOT
// for production (the local dev store only — never run against a live env).
// Usage: node scripts/s19-seed-local-kv.js <scoreHome> <scoreAway>   (default 1 0)
// Run while `npx wrangler dev --config wrangler.dev.toml --port 8787 --local`
// is STOPPED (miniflare reads the state dir at boot), then start dev +
// trigger the cron via: curl "http://127.0.0.1:8787/__scheduled"
"use strict";
const { execSync } = require("child_process");
const path = require("path");
const root = path.resolve(__dirname, "..");

const H = parseInt(process.argv[2] || "1", 10);
const A = parseInt(process.argv[3] || "0", 10);
// ~2h past kickoff: inside the goal window [-6h, +4h], OUTSIDE the engine's
// match-start window [-1min, +45min] (the regression isolation — only the
// goal layer can fire on this seed)
const KO = new Date(Date.now() - 2 * 36e5).toISOString();

const pool = [
  {
    id: "s19-seed-1", utcDate: KO, status: "IN_PLAY", matchday: 5,
    competition: { code: "PD", name: "Primera Division", emblem: null },
    homeTeam: { name: "FC Barcelona", shortName: "Barcelona", crest: null },
    awayTeam: { name: "Real Madrid CF", shortName: "Real Madrid", crest: null },
    score: { fullTime: { home: H, away: A } }, venue: null,
  },
];

function put(key, value) {
  const file = path.join(root, ".wrangler", "tmp-seed-" + key.replace(/[^a-z0-9]/gi, "_") + ".json");
  require("fs").mkdirSync(path.join(root, ".wrangler"), { recursive: true });
  require("fs").writeFileSync(file, JSON.stringify(value));
  execSync(`npx wrangler kv key put --config wrangler.dev.toml --namespace-id c63588df02ae4bf1bfdc18d19c5b3631 --local "${key}" --path "${file}"`, { cwd: root, stdio: "inherit" });
  require("fs").rmSync(file);
}

put("matches_v13_tracked", { matches: pool, fetchedAt: new Date().toISOString() });
// a fresh-enough last_full_sweep so the tick takes the cheap LIVE-sweep path
put("cron_status_v1", { heartbeat: String(Date.now() - 6e5), last_cron: String(Date.now() - 6e5), last_full_sweep: String(Date.now() - 6e5), kv_day: new Date().toISOString().slice(0, 10), kv_writes_day: 0 });
console.log("seeded local KV (matches_v13_tracked IN_PLAY " + H + "-" + A + " + cron_status_v1)");

// the follower chat in the local USERS_DB (the user-store seam reads it)
execSync(`npx wrangler d1 execute sportsignal-users --config wrangler.dev.toml --local --command "INSERT OR IGNORE INTO chats (chat_id, joined_at) VALUES (501, '2026-11-01'); INSERT OR REPLACE INTO user_prefs (chat_id, teams, tz, lang, updated_at) VALUES (501, '[\\"FC Barcelona\\"]', 'Asia/Tehran', 'fa', '2026-11-01');"`, { cwd: root, stdio: "inherit" });
console.log("seeded local USERS_DB (chats 501 + user_prefs: follows FC Barcelona)");
