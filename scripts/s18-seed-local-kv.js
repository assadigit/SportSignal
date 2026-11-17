// scripts/s18-seed-local-kv.js — seeds the LOCAL wrangler-dev KV (miniflare,
// .wrangler/state) with a minimal pool + payload + standings so the local dev
// smoke renders the real team/competition pages. NOT for production (the
// local dev store only — never run against a live env).
// Usage: node scripts/s18-seed-local-kv.js            (seeds via wrangler kv put --local)
// Run while `npx wrangler dev --config wrangler.dev.toml --port 8787 --local` is STOPPED
// (miniflare reads the state dir at boot), then start dev + curl the pages.
"use strict";
const { execSync } = require("child_process");
const path = require("path");
const root = path.resolve(__dirname, "..");

const soon = (d) => new Date(Date.now() + d * 864e5).toISOString();
const ago = (d) => new Date(Date.now() - d * 864e5).toISOString();

const pool = [
  {
    id: "seed-1", utcDate: soon(2), status: "TIMED", matchday: 5,
    competition: { code: "PD", name: "Primera Division", emblem: null },
    homeTeam: { name: "FC Barcelona", shortName: "Barcelona", crest: null },
    awayTeam: { name: "RB Leipzig", shortName: "Leipzig", crest: null },
    score: null, venue: null,
  },
  {
    id: "seed-2", utcDate: soon(6), status: "TIMED", matchday: 6,
    competition: { code: "PD", name: "Primera Division", emblem: null },
    homeTeam: { name: "FC Barcelona", shortName: "Barcelona", crest: null },
    awayTeam: { name: "Chelsea FC", shortName: "Chelsea", crest: null },
    score: null, venue: null,
  },
  {
    id: "seed-3", utcDate: soon(1), status: "TIMED", matchday: 5,
    competition: { code: "PD", name: "Primera Division", emblem: null },
    homeTeam: { name: "Real Madrid CF", shortName: "Real Madrid", crest: null },
    awayTeam: { name: "Inter Milan", shortName: "Inter", crest: null },
    score: null, venue: null,
  },
  {
    id: "seed-4", utcDate: ago(3), status: "FINISHED", matchday: 4,
    competition: { code: "PD", name: "Primera Division", emblem: null },
    homeTeam: { name: "FC Barcelona", shortName: "Barcelona", crest: null },
    awayTeam: { name: "Sevilla FC", shortName: "Sevilla", crest: null },
    score: { fullTime: { home: 3, away: 1 } }, venue: null,
  },
];

const standingsRows = [
  { pos: 1, name: "Real Madrid CF", faName: "رئال مادرید", played: 11, won: 9, draw: 2, lost: 0, points: 29 },
  { pos: 2, name: "FC Barcelona", faName: "بارسلونا", played: 11, won: 8, draw: 2, lost: 1, points: 26 },
  { pos: 3, name: "Atletico Madrid", faName: "اتلتیکو مادرید", played: 11, won: 7, draw: 2, lost: 2, points: 23 },
  { pos: 4, name: "Sevilla FC", faName: "سویا", played: 11, won: 5, draw: 3, lost: 3, points: 18 },
  { pos: 5, name: "Villarreal CF", faName: "ویارئال", played: 11, won: 4, draw: 4, lost: 3, points: 16 },
  { pos: 6, name: "Real Sociedad", faName: "رئال سوسیداد", played: 11, won: 4, draw: 3, lost: 4, points: 15 },
];

const payload = {
  data: {
    upcoming: [], finished: [], nextBig: null, topSpot: null, thisWeek: [], nextWeek: [],
    cups: [], ucl: null,
    standings: { PD: { teams: standingsRows, faName: "لالیگا", emblem: null } },
    fetchedAt: new Date().toISOString(), degraded: false,
  },
};

function put(key, value) {
  const file = path.join(root, ".wrangler", "tmp-seed-" + key.replace(/[^a-z0-9]/gi, "_") + ".json");
  require("fs").writeFileSync(file, JSON.stringify(value));
  execSync(`npx wrangler kv key put --config wrangler.dev.toml --namespace-id c63588df02ae4bf1bfdc18d19c5b3631 --local "${key}" --path "${file}"`, { cwd: root, stdio: "inherit" });
  require("fs").rmSync(file);
}

put("matches_v13_tracked", { matches: pool, fetchedAt: new Date().toISOString() });
put("public_matches_v1", payload);
put("standings_cache_PD", { teams: standingsRows, faName: "لالیگا", emblem: null });
console.log("seeded local KV (matches_v13_tracked + public_matches_v1 + standings_cache_PD)");
