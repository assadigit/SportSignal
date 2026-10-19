// scripts/sync-hero-clubs.js — regenerates src/hero-club-alternates.ts, the
// server-side mirror of the CLUB ALTERNATES LIBRARY (v13.133-clubalt).
//
// WHY THIS EXISTS: the library lives in assets/players/clubs/manifest.json
// (the club jersey database built by scripts/uefa-player-portraits/
// clubs-alternates.js), but static assets are NOT importable worker code —
// the transfer watch (src/hero-rotation.ts) needs the index in the bundle:
//   clubs: slug → { club, league, fdTeamId, active, activeUrl, activeStyle,
//                   candidates: [{ player, url, style }] }
// `active` follows the manifest's active_index (rotations advance it), so
// a deploy of a rotated library automatically updates the watch's notion
// of every club's hero (that is how open events resolve).
//
// Determinism: output is slug-sorted + stable so regeneration is diff-clean
// (check-hero-clubs.js fails npm test on drift, like check-version-sync).
//
// Usage: node scripts/sync-hero-clubs.js   (or: npm run heroes:clubs-sync)
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const MANIFEST = path.join(ROOT, "assets", "players", "clubs", "manifest.json");
const OUT = path.join(ROOT, "src", "hero-club-alternates.ts");

function buildIndex() {
  const lib = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
  const clubs = {};
  let candidatesTotal = 0;
  const slugs = Object.keys(lib.clubs || {}).sort();
  for (const slug of slugs) {
    const e = lib.clubs[slug];
    const cands = (e.candidates || []).map((c) => ({
      player: c.player,
      url: "/players/clubs/" + e.league_folder + "/" + slug + "/" + c.file,
      style: c.style || null,
    }));
    candidatesTotal += cands.length;
    const ai = typeof e.active_index === "number" && e.candidates && e.candidates[e.active_index] ? e.active_index : 0;
    const active = cands[ai] || null;
    clubs[slug] = {
      club: e.club,
      league: e.league,
      fdTeamId: e.fd_team_id != null ? e.fd_team_id : null,
      active: active ? active.player : null,
      activeUrl: active ? active.url : null,
      activeStyle: active ? active.style : null,
      candidates: cands,
    };
  }
  return { clubs, n: slugs.length, candidatesTotal };
}

function renderModule(idx) {
  return `// GENERATED FILE — do not edit by hand.
// Source of truth: assets/players/clubs/manifest.json (the club jersey
//   database — scripts/uefa-player-portraits/clubs-alternates.js builds it;
//   scripts/rotate-hero.js advances active_index on a rotation).
// Regenerate: node scripts/sync-hero-clubs.js  (npm run heroes:clubs-sync)
// Drift gate: scripts/check-hero-clubs.js (part of npm test).
// v13.133-clubalt: consumed by src/hero-rotation.ts — the runtime transfer
//   watch (FD.org squad checks → KV hero_rotation_v1) + /api/hero-rotation
//   + heroClubActive(). \`active\` tracks the manifest's active_index, so a
//   rotation deploy resolves the club's open departure event automatically.

export const HERO_CLUB_ALTERNATES_RAW = {
  generated_at: ${JSON.stringify(new Date().toISOString())},
  clubs: ${JSON.stringify(idx.clubs, null, 2)},
};
`;
}

function main() {
  const idx = buildIndex();
  fs.writeFileSync(OUT, renderModule(idx));
  console.log(`hero-club-alternates.ts: ${idx.n} clubs, ${idx.candidatesTotal} candidates → ${path.relative(ROOT, OUT)}`);
}

if (require.main === module) main();

module.exports = { buildIndex, renderModule, MANIFEST, OUT };
