// Self-check: the club Persian-translation + stadium coverage gate
// (SPORTSIGNAL_CLUB_PERSIAN_TRANSLATION_COMPLETION_SPEC §8 Phase D — the
// repeatable check for future seasons' roster refreshes: it REPORTS missing
// translations/stadiums instead of silently relying on the AI learner).
//
// Gates:
//  G1 every 2026-27 in-scope roster club (10 competitions, 204 clubs — the
//     roster snapshot in docs/audits/club-translation-data/rosters-2026-27.json)
//     resolves to a non-empty Persian name through the REAL translateTeam
//     layers (dict exact -> normalized) — no AI, no stems.
//  G2 every roster club has a TEAM_STADIUMS entry (homeGround resolves).
//  G3 every clubdata dataset key resolves to its recorded Persian value.
//  G4 no Persian display value is shared by two DISTINCT clubs (alias
//     collisions — spec §7).
//  G5 the reserve-team distinctions hold: Real Sociedad B / Celta Fortuna
//     must NOT fold onto their parent clubs' names (the stem-layer bug the
//     2026-27 refresh fixed).
//  G6 the evidence dataset's stadium entries are present in TEAM_STADIUMS.
//
// v13.277-clubdata (2026-11-21). After a future season refresh: update the
// roster snapshot + clubdata JSON, re-run scripts/clubdata/apply-sections.js,
// then this gate reports what's missing.
const fs = require("fs");
const path = require("path");
const src = require("./lib/worker-src")();

const dictSrc = src.match(/const FA_TEAMS = (\{[\s\S]*?\n  \});/)[1];
const FA_TEAMS = eval("(" + dictSrc + ")");
const cfgMatch = src.match(/TEAM_STADIUMS: \{([\s\S]*?\n  \},)/);
const STADIUMS = eval("(" + "{" + cfgMatch[1].slice(0, -2) + "}" + ")");
const { normTeamKey } = require("../src/teams.ts");

const DATA = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "docs", "audits", "club-translation-data", "clubdata-2026-27.json"), "utf8"));
const ROSTERS = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "docs", "audits", "club-translation-data", "rosters-2026-27.json"), "utf8"));

// the REAL layers 1-3 of translateTeam (no AI cache, no fuzzy stems — the
// spec's "resolve locally without AI for covered clubs" contract)
const NORM = new Map();
for (const [en, fa] of Object.entries(FA_TEAMS)) NORM.set(normTeamKey(en), fa);
function translateLocal(name) {
  if (FA_TEAMS[name]) return FA_TEAMS[name];
  const k = normTeamKey(name);
  return (k && NORM.get(k)) || null;
}
const STAD_NORM = new Map();
for (const k of Object.keys(STADIUMS)) STAD_NORM.set(normTeamKey(k), STADIUMS[k]);

let failed = 0;
const fail = (gate, msg) => { console.error(`FAIL [${gate}] ${msg}`); failed++; };

// G1 + G2: roster coverage
let clubs = 0, faOk = 0, stadOk = 0;
const IN_SCOPE = ["PL", "ELC", "EL1", "SA", "SB", "BL1", "BL2", "FL1", "PD", "SD"];
for (const lg of IN_SCOPE) {
  for (const t of ROSTERS[lg] || []) {
    clubs++;
    const fa = translateLocal(t);
    if (fa) faOk++; else fail("G1", `${lg}: ${t} has no local Persian translation`);
    if (STAD_NORM.has(normTeamKey(t))) stadOk++; else fail("G2", `${lg}: ${t} has no TEAM_STADIUMS entry`);
  }
}
console.log(`G1 roster Persian coverage: ${faOk}/${clubs}`);
console.log(`G2 roster stadium coverage: ${stadOk}/${clubs}`);
if (faOk !== clubs || stadOk !== clubs) failed++;

// CL layer coverage (informational + gated)
let clFa = 0;
for (const t of ROSTERS["CL-2026-27"] || []) { if (translateLocal(t)) clFa++; else fail("G1", `CL: ${t} untranslated`); }
console.log(`G1 CL 2026-27 league phase: ${clFa}/${(ROSTERS["CL-2026-27"] || []).length}`);

// G3: dataset keys resolve to their recorded values
let keys = 0;
for (const e of DATA.entries) {
  for (const k of e.keys) {
    keys++;
    const fa = translateLocal(k);
    if (fa !== e.fa) fail("G3", `${k} -> ${fa} (expected ${e.fa})`);
  }
}
console.log(`G3 dataset keys resolved: ${keys}`);

// G4: no cross-club Persian value collisions. The dict's design invariant is
// ONE Persian value per CLUB: provider name variants of the same club share
// the value (the alias mechanism — e.g. "Atlético Madrid" / "Club Atlético
// de Madrid"), so a value with multiple keys is fine ONLY when all keys
// belong to one club: either one clubdata entry's key set, or the pre-clubdata
// baseline (the 95 shared-value groups spot-checked in the M1 audit — keys
// the dataset did not introduce). Two different clubdata entries sharing a
// value is always a failure.
const newKeyUnion = new Set();
const entryByFirstKey = new Map();
for (const e of DATA.entries) { for (const k of e.keys) newKeyUnion.add(k); entryByFirstKey.set(e.keys[0], e); }
const valueToEntry = new Map(); // value -> entry that claims it
let collisions = 0;
const owners = {};
for (const [en, fa] of Object.entries(FA_TEAMS)) (owners[fa] = owners[fa] || []).push(en);
for (const e of DATA.entries) {
  if (e.fa && valueToEntry.has(e.fa) && valueToEntry.get(e.fa) !== e) { fail("G4", `two clubdata entries share value ${e.fa}`); collisions++; }
  else if (e.fa) valueToEntry.set(e.fa, e);
}
for (const [fa, keys] of Object.entries(owners)) {
  const entry = valueToEntry.get(fa);
  const outside = keys.filter((k) => entry && !entry.keys.includes(k) && newKeyUnion.has(k));
  if (outside.length) { fail("G4", `Persian value ${fa} claimed by keys outside its club entry: ${outside.join(", ")}`); collisions++; }
  // keys NOT introduced by clubdata are the audited baseline (same-club
  // provider variants); distinct-normKey same-value groups among them were
  // verified in the M1 audit — nothing to do.
}
console.log(`G4 cross-club value collisions: ${collisions}`);

// G5: reserve-team distinctions
const rsb = translateLocal("Real Sociedad B");
const rsParent = FA_TEAMS["Real Sociedad"];
if (!rsb || rsb === rsParent) fail("G5", `Real Sociedad B folds onto parent (${rsb})`);
else console.log(`G5 Real Sociedad B -> ${rsb} (distinct from ${rsParent})`);
const cf = translateLocal("RC Celta Fortuna");
const cfParent = FA_TEAMS["RC Celta de Vigo"];
if (!cf || cf === cfParent) fail("G5", `Celta Fortuna folds onto parent (${cf})`);
else console.log(`G5 RC Celta Fortuna -> ${cf} (distinct from ${cfParent})`);

// G6: dataset stadium entries present
let stadEntries = 0;
function checkStad(clubKey, s) {
  if (!clubKey || !s || !s.en || !s.fa) return;
  stadEntries++;
  const g = STAD_NORM.get(normTeamKey(clubKey));
  if (!g) fail("G6", `${clubKey}: stadium ${s.en} missing from TEAM_STADIUMS`);
  else if (g.en !== s.en || g.fa !== s.fa) fail("G6", `${clubKey}: stadium mismatch (${g.en}/${g.fa} vs ${s.en}/${s.fa})`);
}
for (const e of DATA.entries) checkStad(e.stadiumKey || e.keys[0], { en: e.stadiumEn, fa: e.stadiumFa });
for (const [lg, clubsObj] of Object.entries(DATA.stadiumsExistingClubs)) {
  if (lg.startsWith("_")) continue;
  for (const [clubKey, s] of Object.entries(clubsObj)) checkStad(clubKey, s);
}
console.log(`G6 dataset stadium entries verified: ${stadEntries}`);

// summary
const dictCount = Object.keys(FA_TEAMS).length;
const stadCount = Object.keys(STADIUMS).length;
console.log(`club-coverage: dict=${dictCount} keys, stadiums=${stadCount} entries, ${failed === 0 ? "ALL GATES OK" : failed + " FAILURES"}`);
process.exit(failed ? 1 : 0);
