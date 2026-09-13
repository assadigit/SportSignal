// Gate: getSettings must union default leagues with saved leagues so a league
// added in new code (BL1/Bundesliga) survives settings saved by older versions.
// Mirrors the teams deep-merge already in worker.ts.
const fs = require("fs");
const src = require("./lib/worker-src")();
const m = src.match(/const leagues = \[\.\.\.new Set\(\[\.\.\.Array\.isArray\(defaults\.leagues\) \? defaults\.leagues : \[\], \.\.\.Array\.isArray\(saved\.leagues\) \? saved\.leagues : \[\]\]\)\];/);
if (!m) { console.error("FAIL: league-union line not found"); process.exit(1); }
// Check the union is actually used in the return (not dead code)
if (!/return \{ \.\.\.defaults, \.\.\.saved, teams: syncUclSelection\(canonicalizeTeams\(teams, cat\)\), leagues \};/.test(src)) {
  console.error("FAIL: union not wired into the return"); process.exit(1);
}
// Defaults must include BL1 and the merge must produce it even when saved lacks it
if (!/"BL1": \[/.test(src)) { console.error("FAIL: BL1 not in defaults teams"); process.exit(1); }
if (!/"BL1": "Bundesliga"/.test(src)) { console.error("FAIL: BL1 comp name missing"); process.exit(1); }
console.log("OK  getSettings merges default leagues (BL1 survives old settings)");