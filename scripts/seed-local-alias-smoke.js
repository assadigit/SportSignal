// scripts/seed-local-alias-smoke.js — seeds the LOCAL wrangler-dev KV with
// a minimal pool carrying ONE selected-club fixture (Real Madrid vs FC
// Barcelona, La Liga, ~90min ahead) so /teams/barcelona + /teams/real-madrid
// render through the REAL worker in local dev — verifying the deployed
// JSON-LD alternateName aliases end-to-end (the s20-seed-local-kv.js
// precedent; local dev store ONLY — never run against a live env).
// Usage: node scripts/seed-local-alias-smoke.js (run while wrangler dev is STOPPED)
"use strict";
const { execSync } = require("child_process");
const path = require("path");
const root = path.resolve(__dirname, "..");

const now = Date.now();
const T = (min) => new Date(now + min * 6e4).toISOString();
const pool = [
  { id: "alias-clasico", utcDate: T(90), status: "TIMED", competition: { code: "PD" },
    homeTeam: { name: "Real Madrid CF", crest: null }, awayTeam: { name: "FC Barcelona", crest: null }, score: null },
  { id: "alias-bayern", utcDate: T(200), status: "TIMED", competition: { code: "BL1" },
    homeTeam: { name: "FC Bayern München", crest: null }, awayTeam: { name: "Borussia Dortmund", crest: null }, score: null },
  { id: "alias-city", utcDate: T(320), status: "TIMED", competition: { code: "PL" },
    homeTeam: { name: "Manchester City FC", crest: null }, awayTeam: { name: "Arsenal FC", crest: null }, score: null },
  { id: "alias-inter", utcDate: T(440), status: "TIMED", competition: { code: "SA" },
    homeTeam: { name: "FC Internazionale Milano", crest: null }, awayTeam: { name: "AC Milan", crest: null }, score: null }
];

function put(key, value) {
  const file = path.join(root, ".wrangler", "tmp-seed-" + key.replace(/[^a-z0-9]/gi, "_") + ".json");
  require("fs").mkdirSync(path.join(root, ".wrangler"), { recursive: true });
  require("fs").writeFileSync(file, JSON.stringify(value));
  execSync(`npx wrangler kv key put --config wrangler.dev.toml --namespace-id c63588df02ae4bf1bfdc18d19c5b3631 --local "${key}" --path "${file}"`, { cwd: root, stdio: "inherit" });
  require("fs").rmSync(file);
}

put("matches_v13_tracked", { matches: pool, fetchedAt: new Date().toISOString(), source: "alias-smoke-seed" });
console.log("seeded local KV (matches_v13_tracked: 4 selected-club fixtures — the alias-smoke pool)");
