// scripts/clubdata/apply-sections.js — Milestone 6 integration. Reads the
// master evidence dataset (clubdata-2026-27.json) and INSERTS the generated
// entries into src/fa-dict.ts (new keyed sections) and src/config.ts
// (TEAM_STADIUMS) — additively, idempotently (already-present keys are
// skipped), with zero removals. Run: node scripts/clubdata/apply-sections.js
// then `npx tsc --noEmit` + `npm test`. The sections carry the same comment
// style as the surrounding hand-curated data.
"use strict";
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..", "..");
const DATA = JSON.parse(fs.readFileSync(path.join(ROOT, "docs/audits/club-translation-data/clubdata-2026-27.json"), "utf8"));
const { normTeamKey } = require(path.join(ROOT, "src/teams.ts"));

// ---- competition grouping for the dict sections (order = file order)
const SECTION_OF = (key) => {
  const k = key.toLowerCase();
  if (["wrexham", "bolton", "lincoln city"].some((x) => k.includes(x))) return "ELC";
  if (["arezzo", "ascoli", "avellino", "benevento", "carrarese", "catanzaro", "cesena", "juve stabia", "mantova", "modena", "padova", "palermo", "sampdoria", "südtirol", "sudtirol", "vicenza", "entella"].some((x) => k.includes(x))) return "SB";
  if (["barnsley", "blackpool", "burton", "cambridge", "doncaster", "huddersfield", "milton keynes", "mk dons", "notts county", "plymouth", "stockport", "stevenage", "wycombe", "bromley", "leyton orient", "wimbledon"].some((x) => k.includes(x))) return "EL1";
  if (k.includes("elversberg")) return "BL1";
  if (["hertha", "bielefeld", "braunschweig", "cottbus", "dresden", "fürth", "furth", "kaiserslautern", "karlsruher", "nürnberg", "nurnberg", "osnabrück", "osnabruck"].some((x) => k.includes(x))) return "BL2";
  if (k.includes("troyes")) return "FL1";
  if (k.includes("santander")) return "PD";
  if (["albacete", "andorra", "burgos", "cádiz", "cadiz", "castellón", "castellon", "celta fortuna", "ceuta", "córdoba", "cordoba", "eibar", "eldense", "granada", "oviedo", "sociedad b", "sabadell", "gijón", "gijon", "tenerife"].some((x) => k.includes(x))) return "SD";
  return "HIST";
};
const SECTION_HEADERS = {
  ELC: `    // ---- v13.277-clubdata: EFL Championship 2026-27 — the promoted three\n    // (Wrexham, Bolton, Lincoln). FD 2026-27 roster verified 2026-11-21.`,
  EL1: `    // ---- v13.277-clubdata: EFL League One 2026-27 — the 15 clubs the dict\n    // did not cover (Wikipedia 2026-27 season roster, verified 2026-11-21).\n    // Persian names per fa.wikipedia titles (media short forms where\n    // established); full evidence: docs/audits/club-translation-data/`,
  SB: `    // ---- v13.277-clubdata: Serie B 2026-27 — 16 clubs (Wikipedia season\n    // roster). Cesena has no fa.wiki article — established media form چزنا.`,
  BL1: `    // ---- v13.277-clubdata: Bundesliga 2026-27 — SV 07 Elversberg (the\n    // promoted side the dict missed).`,
  BL2: `    // ---- v13.277-clubdata: 2. Bundesliga 2026-27 — 10 clubs (Wikipedia\n    // season roster).`,
  FL1: `    // ---- v13.277-clubdata: Ligue 1 2026-27 — ES Troyes AC (promoted).`,
  PD: `    // ---- v13.277-clubdata: La Liga 2026-27 — Real Racing Club de\n    // Santander (promoted).`,
  SD: `    // ---- v13.277-clubdata: LaLiga 2 (Segunda División) 2026-27 — 16 clubs\n    // (Wikipedia season roster). Includes the RESERVE TEAMS Celta Fortuna +\n    // Real Sociedad B with DISTINCT names (the parent-club stem-fold fix).`,
  HIST: `    // ---- v13.277-clubdata: UCL historical layer — the 30-season window\n    // (1996-97 → 2025-26) extension. The 2005-06 → 2024-25 window was already\n    // covered; these are the still-active 1996-97 → 2004-05 group-stage\n    // participants (spec 3.2 priorities 1-3) + the 2025-26 league-phase\n    // additions. Defunct participants (Košice, Lierse) are DEFERRED with\n    // reasons in clubdata-2026-27.json — no active-club records for them.`
};

// ---- 1. fa-dict.ts
const dictPath = path.join(ROOT, "src/fa-dict.ts");
let dictSrc = fs.readFileSync(dictPath, "utf8");
const dm = dictSrc.match(/const FA_TEAMS = \{([\s\S]*?)\n  \};/);
const FA_TEAMS = eval("(" + "{" + dm[1] + "}" + ")");
const dictSeenNorm = new Map(Object.keys(FA_TEAMS).map((k) => [normTeamKey(k), FA_TEAMS[k]]));
const sections = { ELC: [], EL1: [], SB: [], BL1: [], BL2: [], FL1: [], PD: [], SD: [], HIST: [] };
let added = 0, skipped = 0;
for (const e of DATA.entries) {
  const lines = [];
  let anyNew = false;
  for (const k of e.keys) {
    if (FA_TEAMS[k] === e.fa) { skipped++; continue; } // idempotent
    if (FA_TEAMS[k]) { console.error(`REFUSE: key ${k} exists with different value`); process.exit(1); }
    const nk = normTeamKey(k);
    if (dictSeenNorm.has(nk) && dictSeenNorm.get(nk) !== e.fa) { console.error(`REFUSE: norm-key collision ${k}`); process.exit(1); }
    lines.push(`    ${JSON.stringify(k)}: ${JSON.stringify(e.fa)},`);
    anyNew = true;
    added++;
  }
  if (anyNew) {
    sections[SECTION_OF(e.keys[0])].push(
      `    // ${e.keys[0]} — ${e.conf}` + (e.conf === "verified" ? "" : " (clubdata evidence)")
    );
    sections[SECTION_OF(e.keys[0])].push(...lines);
  }
}
let dictInsert = "";
for (const [sec, lines] of Object.entries(sections)) {
  if (!lines.length) continue;
  dictInsert += "\n" + SECTION_HEADERS[sec] + "\n" + lines.join("\n") + "\n";
}
if (dictInsert) {
  const closeIdx = dictSrc.indexOf("\n  };", dictSrc.indexOf("const FA_TEAMS = {"));
  // the last existing entry may lack a trailing comma (it was the final
  // property) — the insertion needs it
  const before = dictSrc.slice(0, closeIdx).replace(/,\s*$/, "");
  const lastChar = before.trim().slice(-1);
  const needsComma = lastChar === '"' || lastChar === '}';
  dictSrc = before + (needsComma ? "," : "") + dictInsert + dictSrc.slice(closeIdx);
  fs.writeFileSync(dictPath, dictSrc);
  console.log(`fa-dict.ts: +${added} keys (${skipped} already present)`);
} else console.log("fa-dict.ts: nothing to add");

// ---- 2. config.ts TEAM_STADIUMS
const cfgPath = path.join(ROOT, "src/config.ts");
let cfgSrc = fs.readFileSync(cfgPath, "utf8");
const sm = cfgSrc.match(/TEAM_STADIUMS: \{([\s\S]*?)\n  \},/);
const STADIUMS = eval("(" + "{" + sm[1] + "}" + ")");
const stadSeen = new Set(Object.keys(STADIUMS).map((k) => normTeamKey(k)));
let stadInsert = "";
let stadAdded = 0;
function addStad(clubKey, s) {
  if (!clubKey || !s || !s.en || !s.fa) return;
  const nk = normTeamKey(clubKey);
  if (stadSeen.has(nk)) return;
  stadSeen.add(nk);
  stadInsert += `    ${JSON.stringify(clubKey)}: { en: ${JSON.stringify(s.en)}, fa: ${JSON.stringify(s.fa)} },\n`;
  stadAdded++;
}
for (const e of DATA.entries) addStad(e.stadiumKey || e.keys[0], { en: e.stadiumEn, fa: e.stadiumFa });
for (const [lg, clubs] of Object.entries(DATA.stadiumsExistingClubs)) {
  if (lg.startsWith("_")) continue;
  for (const [clubKey, s] of Object.entries(clubs)) addStad(clubKey, s);
}
if (stadInsert) {
  const header = `    // v13.277-clubdata (2026-11-21): full current-coverage extension —\n    // every 2026-27 in-scope club (PL/ELC/EL1, SA/SB, BL1/BL2, FL1, PD/SD)\n    // + the UCL historical layer's active clubs. Sources: 2026-27 season\n    // articles (stadium tables), club infoboxes, fa.wikipedia stadium\n    // titles where they exist — every entry's evidence + confidence in\n    // docs/audits/club-translation-data/clubdata-2026-27.json. Existing\n    // entries above are preserved byte-for-byte (sponsor forms kept).\n`;
  const closeIdx = cfgSrc.indexOf("\n  },", cfgSrc.indexOf("TEAM_STADIUMS: {"));
  const before = cfgSrc.slice(0, closeIdx).replace(/,\s*$/, "");
  const lastChar = before.trim().slice(-1);
  const needsComma = lastChar === '"' || lastChar === '}';
  cfgSrc = before + (needsComma ? "," : "") + "\n" + header + stadInsert + cfgSrc.slice(closeIdx);
  fs.writeFileSync(cfgPath, cfgSrc);
  console.log(`config.ts TEAM_STADIUMS: +${stadAdded} entries`);
} else console.log("config.ts: nothing to add");
console.log("APPLY OK");
