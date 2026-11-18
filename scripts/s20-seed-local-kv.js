// scripts/s20-seed-local-kv.js — seeds the LOCAL wrangler-dev KV (miniflare,
// .wrangler/state) for the S20 day-hub smoke: a BREAK-DAY pool — the
// Brasileirão evening slate + the senior internationals (exactly the rows
// the widened universe produces on a FIFA-window day) — so /matches/today
// and /matches/tomorrow render the all-matches day pages against REAL
// workerd serving. NOT for production (the local dev store only — never run
// against a live env).
// Usage: node scripts/s20-seed-local-kv.js
// Run while `npx wrangler dev --config wrangler.dev.toml --port 8787 --local`
// is STOPPED (miniflare reads the state dir at boot), then start dev +
// curl http://127.0.0.1:8787/matches/today (and /matches/tomorrow, /healthz).
"use strict";
const { execSync } = require("child_process");
const path = require("path");
const root = path.resolve(__dirname, "..");

// The break-day pool: BSA plays THROUGH the window; the internationals are
// the sanitized senior rows (pre-collapsed — the hygiene law ran in the
// fill). Kickoffs ~1-3h ahead so the rows sit in TODAY's Tehran bucket
// (unless run within ~3h of Tehran midnight — then they land on the
// tomorrow page; both pages are checked in the smoke).
const now = Date.now();
const T = (min) => new Date(now + min * 6e4).toISOString();
const pool = [
  { id: "s20-bsa-1", utcDate: T(65), status: "TIMED", competition: { code: "BSA" }, homeTeam: { name: "Cruzeiro EC", crest: null }, awayTeam: { name: "SE Palmeiras", crest: null }, score: null },
  { id: "s20-bsa-2", utcDate: T(125), status: "TIMED", competition: { code: "BSA" }, homeTeam: { name: "CR Flamengo", crest: null }, awayTeam: { name: "CA Paranaense", crest: null }, score: null },
  { id: "s20-intl-1", utcDate: T(45), status: "TIMED", competition: { code: "INTL_FR" }, homeTeam: { name: "Iraq", crest: null }, awayTeam: { name: "IR Iran", crest: null }, score: null },
  { id: "s20-intl-2", utcDate: T(85), status: "TIMED", competition: { code: "UEFA_NL" }, homeTeam: { name: "Denmark", crest: null }, awayTeam: { name: "Norway", crest: null }, score: null },
  { id: "s20-intl-3", utcDate: T(105), status: "TIMED", competition: { code: "CONCACAF_NL" }, homeTeam: { name: "USA", crest: null }, awayTeam: { name: "Mexico", crest: null }, score: null }
];

function put(key, value) {
  const file = path.join(root, ".wrangler", "tmp-seed-" + key.replace(/[^a-z0-9]/gi, "_") + ".json");
  require("fs").mkdirSync(path.join(root, ".wrangler"), { recursive: true });
  require("fs").writeFileSync(file, JSON.stringify(value));
  execSync(`npx wrangler kv key put --config wrangler.dev.toml --namespace-id c63588df02ae4bf1bfdc18d19c5b3631 --local "${key}" --path "${file}"`, { cwd: root, stdio: "inherit" });
  require("fs").rmSync(file);
}

put("matches_v13_tracked", { matches: pool, fetchedAt: new Date().toISOString(), source: "s20-smoke-seed" });
put("cron_status_v1", { heartbeat: String(now - 6e5), last_cron: String(now - 6e5), last_full_sweep: String(now - 6e5), kv_day: new Date().toISOString().slice(0, 10), kv_writes_day: 0 });
console.log("seeded local KV (matches_v13_tracked: 2 BSA + 3 senior-intl rows — the break-day pool)");
