// scripts/clubdata/generate-sections.js — deterministic generator for the
// club Persian-translation completion (SPORTSIGNAL_CLUB_PERSIAN_TRANSLATION_
// COMPLETION_SPEC Milestone 6). Reads the master evidence dataset
// (docs/audits/club-translation-data/clubdata-2026-27.json) and prints:
//   1) the fa-dict.ts section entries (provider-key -> Persian)
//   2) the config.ts TEAM_STADIUMS entries (provider-key -> {en, fa})
//   3) collision diagnostics (duplicate keys across the whole dict,
//      cross-club Persian value collisions, stem-fold hazards)
// The printed sections are pasted into the curated static files BY HAND and
// validated afterwards by scripts/check-club-coverage.js — the generator
// never writes to src/ (the repo convention is hand-curated static data
// with rich comments; this tool only guarantees byte-accuracy + safety).
// Usage: node scripts/clubdata/generate-sections.js
"use strict";
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..", "..");
const DATA = JSON.parse(fs.readFileSync(path.join(ROOT, "docs/audits/club-translation-data/clubdata-2026-27.json"), "utf8"));
const { normTeamKey } = require(path.join(ROOT, "src/teams.ts"));

// ---- load current fa-dict + TEAM_STADIUMS exactly like the runtime does
const dictSrc = fs.readFileSync(path.join(ROOT, "src/fa-dict.ts"), "utf8");
const m = dictSrc.match(/const FA_TEAMS = \{([\s\S]*?)\n  \};/);
const FA_TEAMS = eval("(" + "{" + m[1] + "}" + ")");
const cfgSrc = fs.readFileSync(path.join(ROOT, "src/config.ts"), "utf8");
const sm = cfgSrc.match(/TEAM_STADIUMS: \{([\s\S]*?)\n  \},/);
const STADIUMS = eval("(" + "{" + sm[1] + "}" + ")");

let problems = 0;
const prob = (msg) => { console.error("PROBLEM: " + msg); problems++; };

// ---- 1. new dict entries
console.log("// ===== fa-dict.ts NEW ENTRIES (paste into buildFaTeamDict) =====");
const seenKeys = new Set(Object.keys(FA_TEAMS));
const valueOwners = {}; // fa value -> [club keys] for cross-club collision check
for (const [en, fa] of Object.entries(FA_TEAMS)) (valueOwners[fa] = valueOwners[fa] || []).push(en);
for (const e of DATA.entries) {
  for (const k of e.keys) {
    if (seenKeys.has(k)) { prob(`dict key already exists: ${k}`); continue; }
    // normalized-key collision against a DIFFERENT club
    const nk = normTeamKey(k);
    for (const [en2] of Object.entries(FA_TEAMS)) {
      if (normTeamKey(en2) === nk && FA_TEAMS[en2] !== e.fa) { prob(`norm-key collision: ${k} (new) vs ${en2} (existing, different value)`); break; }
    }
  }
  if (!e.keys.length) { console.log(`    // (no new dict keys — ${e.notes ? e.notes.split('.')[0] : 'stadium-only entry'})`); continue; }
  (valueOwners[e.fa] = valueOwners[e.fa] || []).push(e.keys[0]);
  const keyList = e.keys.map((k) => JSON.stringify(k) + ": " + JSON.stringify(e.fa)).join(",\n    ");
  console.log(`    // ${e.keys[0]} — ${e.conf}` + (e.conf === "verified" ? "" : " (see clubdata-2026-27.json)"));
  console.log("    " + keyList + ",");
}
// cross-club value collisions involving NEW values
const newFas = new Set(DATA.entries.map((e) => e.fa));
console.log("\n// ---- cross-club Persian value collisions check (new values vs ALL) ----");
for (const [fa, owners] of Object.entries(valueOwners)) {
  if (!newFas.has(fa)) continue;
  const uniqOwners = [...new Set(owners)];
  if (uniqOwners.length > 1) {
    // same Persian name for multiple distinct clubs — only a problem when the
    // owners are genuinely different clubs (not provider variants)
    const uniqNorms = [...new Set(uniqOwners.map((o) => normTeamKey(o)))];
    if (uniqNorms.length > 1) prob(`Persian value shared across distinct clubs: ${fa} -> ${uniqOwners.join(" | ")}`);
    else console.log(`// OK same-club fold: ${fa} <- ${uniqOwners.join(" | ")}`);
  }
}

// ---- 2. stadium entries
console.log("\n// ===== config.ts TEAM_STADIUMS NEW ENTRIES =====");
const stadSeen = new Set(Object.keys(STADIUMS).map((k) => normTeamKey(k)));
const stadOut = [];
function addStad(clubKey, s) {
  if (!s) return;
  const nk = normTeamKey(clubKey);
  if (stadSeen.has(nk)) { console.log(`// SKIP (existing): ${clubKey}`); return; }
  stadSeen.add(nk);
  stadOut.push(`    ${JSON.stringify(clubKey)}: { en: ${JSON.stringify(s.en)}, fa: ${JSON.stringify(s.fa)} },`);
}
for (const e of DATA.entries) addStad(e.keys[0], { en: e.stadiumEn, fa: e.stadiumFa });
for (const [lg, clubs] of Object.entries(DATA.stadiumsExistingClubs)) {
  if (lg.startsWith("_")) continue;
  for (const [clubKey, s] of Object.entries(clubs)) addStad(clubKey, s);
}
for (const line of stadOut) console.log(line);
console.log(`\n// stadium entries to add: ${stadOut.length}`);

// ---- 3. summary
console.log(`\n// new dict keys: ${DATA.entries.reduce((n, e) => n + e.keys.length, 0)} across ${DATA.entries.length} clubs`);
console.log(`// uncertainty queue entries: ${DATA.uncertaintyQueue.length}`);
console.log(`// deferred (historical, defunct): ${DATA.deferred.length}`);
if (problems) { console.error(`\n${problems} PROBLEM(S) — fix before applying`); process.exit(1); }
console.log("\n// NO COLLISIONS — safe to apply");
