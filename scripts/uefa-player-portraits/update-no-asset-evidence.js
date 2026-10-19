// update-no-asset-evidence.js — Task A documentation pass (2026-10-19, session
// recovered after sandbox reset; evidence re-verified live during recovery).
//
// Thorough UEFA coverage re-verification for the 70 non-complete clubs:
//   1. research-pending resolution (Wikipedia/Wikidata P2276 research)
//   2. bounded club-context probe sets (researched hints + adjacent seasons)
//   3. current-registration fallback-avatar locations (UEL/UECL 26/27)
//   4. right-kit participation targets (club UEFA seasons)
//   5. national-team segment sweep (EURO 2024 family = segment 3; national
//      kits are NOT usable as club hero portraits)
//   6. kit-timing withdrawals (wrong-club kits: Tzolakis/Olympiacos,
//      Mandi/Lille — Lyon/Openda precedent)
//
// This script records the outcome in roster-heroes.json:
//   - UPDATES the 23 committed no_asset records with the re-verification
//   - CREATES no_asset records for the 42 conclusively-verified clubs
//
// Usage: node scripts/uefa-player-portraits/update-no-asset-evidence.js [--dry]
"use strict";

const fs = require("fs");
const path = require("path");
const { config } = require("./lib/config");

const DRY = process.argv.includes("--dry");
const ROSTER = path.join(config.script_dir, "roster-heroes.json");
const VERIFY_DATE = "2026-10-19";

const NT_NOTE =
  "NT sweep: UEFA's national-team asset family lives at competition segment 3 (EURO 2024); full candidate-segment space swept on a no-club-career subject — national-kit assets are not usable as club hero portraits (kit-consistency rule)";

// ---------------------------------------------------------------------------
// UPDATE pass — the 23 committed records get the re-verification additions
// (current-registration fallback locations probed 404; EURO 2024 where found)
// ---------------------------------------------------------------------------
const FB_UPDATES = {
  "brighton-hove-albion-fc": "current-registration fallback 2019/2027 (UECL 26/27 squad) probed 404",
  "chelsea-fc": "current-registration fallback 14/2027 (UEL 26/27 squad) probed 404",
  "brentford-fc": "current-registration fallback 14/2027 (UEL 26/27 squad) probed 404",
  "leeds-united-fc": "current-registration fallback 14/2027 (UEL 26/27 squad) probed 404",
  "everton-fc": "current-registration fallback 14/2027 (UEL 26/27 squad) probed 404; EURO 2024 national-team cutoff exists (England kit — not a club asset)",
  "ipswich-town-fc": "current-registration fallback 14/2027 (UEL 26/27 squad) probed 404",
  "newcastle-united-fc": "current-registration fallback 14/2027 (UEL 26/27 squad) probed 404",
  "crystal-palace-fc": "current-registration fallback 14/2027 (UEL 26/27 squad) probed 404; no EURO 2024 asset",
  "afc-bournemouth": "current-registration fallback 14/2027 (UEL 26/27 squad) probed 404 + UECL 25/26 (2019/2026) probed 404 — Bournemouth's two European seasons both lack cutoffs",
  "coventry-city-fc": "current-registration fallback 14/2027 (UEL 26/27 squad) probed 404",
  "fulham-fc": "current-registration fallback 14/2027 (UEL 26/27 squad) probed 404",
  "nottingham-forest-fc": "current-registration fallback 14/2027 (UEL 26/27 squad) probed 404; no EURO 2024 asset",
  "sunderland-afc": "current-registration fallback 14/2027 (UEL 26/27 squad) probed 404; EURO 2024 national-team cutoff exists (Switzerland kit — not a club asset)",
  "tottenham-hotspur-fc": "current-registration fallback 14/2027 (UEL 26/27 squad) probed 404; EURO 2024 national-team cutoff exists (England kit — not a club asset); Super Cup segment (2/2025) probed 404 for the UEL-winning squad's playmaker",
  "real-sociedad-de-futbol": "current-registration fallback 14/2027 (UEL 26/27 squad) probed 404; UCL 23/24 (1/2024) probed 404; UEL 20/21 (14/2021) + adjacent UEL seasons (14/2023, 14/2025) probed 404; EURO 2024 national-team cutoff exists (Spain kit — not a club asset)",
  "sevilla-fc": "current-registration fallback 14/2027 (UEL 26/27 squad) probed 404; EURO 2024 national-team cutoff exists (Switzerland kit — not a club asset)",
  "rc-celta-de-vigo": "current-registration fallback 14/2027 (UEL 26/27 squad) probed 404; UECL 22/23 (2019/2023) probed 404; no EURO 2024 asset",
  "rc-deportivo-la-coruna": "current-registration fallback 14/2027 (UEL 26/27 squad) probed 404",
  "athletic-club": "current-registration fallback 14/2027 (UEL 26/27 squad) probed 404; EURO 2024 national-team cutoff exists (Spain kit — not a club asset)",
  "getafe-cf": "current-registration fallback 2019/2027 (UECL 26/27 squad) re-verified 404",
  "sc-freiburg": "current-registration fallback 2019/2027 (UECL 26/27 squad) probed 404; UEL 22/23 (14/2023) + UEL 23/24 (14/2024) probed 404",
  "tsg-1899-hoffenheim": "current-registration fallback 14/2027 (UEL 26/27 squad) probed 404; UEL 20/21 (14/2021) probed 404; EURO 2024 national-team cutoff exists (Croatia kit — not a club asset)",
  "olympique-lyonnais": "current UCL 26/27 registration (1/2027) probed 404 — no Lyon-kit UEFA cutoff exists at any probed location",
};

// ---------------------------------------------------------------------------
// CREATE pass — the 42 research-pending clubs, conclusively verified
// A: withdrawn after kit-timing analysis (wrong-club kit)
// B: UEFA profile exists (generic shell) — all probed locations 404
// C: no UEFA profile for any hero candidate (never registered)
// ---------------------------------------------------------------------------
const NEW_RECORDS = {
  // A — kit-timing withdrawals
  "hull-city-afc": {
    evidence: "Tzolakis: the only existing cutoff is 1/2026 (UCL 25/26) = Olympiacos kit (Olympiacos 2019–2026, Hull 2026–; Wikipedia career table fetched 2026-10-19) — downloaded then WITHDRAWN (wrong-club kit); current UECL 26/27 registration fallback (2019/2027) probed 404",
    method: "kit-timing withdrawal + bounded probe set + manual paced probes via the scoped relay; retry with --refresh if UEFA publishes new assets",
  },
  "levante-ud": {
    evidence: "Mandi: the only existing cutoff is 1/2025 (UCL 24/25) = Lille kit (Villarreal 2021–2024, Lille 2024–2026, Levante 2026–; Wikipedia career table fetched 2026-10-19) — downloaded then WITHDRAWN (wrong-club kit); current UEL 26/27 registration fallback (14/2027) probed 404",
    method: "kit-timing withdrawal + bounded probe set + manual paced probes via the scoped relay; retry with --refresh if UEFA publishes new assets",
  },

  // B — profile exists, everything probed 404 (player id in parens)
  "deportivo-alaves": { id: "250121868", who: "Boyé", extra: "" },
  "ca-osasuna": { id: "250053837", who: "Budimir", extra: "" },
  "valencia-cf": { id: "250047086", who: "Gayà", extra: "" },
  "ss-lazio": { id: "250150875", who: "Zaccagni", extra: "; bounded set: researched hint 1/2024 (Lazio UCL 23/24) + adjacent 1/2023, 1/2025, 1/2022 all 404" },
  "us-sassuolo-calcio": { id: "250058759", who: "Berardi", extra: "" },
  "torino-fc": { id: "250155055", who: "Adams", extra: "" },
  "genoa-cfc": { id: "250113827", who: "Osmajić", extra: "" },
  "acf-fiorentina": { id: "1901746", who: "de Gea", extra: "; bounded set: researched hint 2019/2025 (Fiorentina UECL 24/25) + adjacent 2019/2024, 2019/2026, 2019/2023 all 404" },
  "1-fsv-mainz-05": { id: "250078643", who: "Amiri", extra: "" },
  "sv-werder-bremen": { id: "250041844", who: "Füllkrug", extra: "" },
  "fc-augsburg": { id: "250023832", who: "Gregoritsch", extra: "" },
  "1-fc-koln": { id: "250119519", who: "Skhiri", extra: "" },
  "fc-schalke-04": { id: "72048", who: "Džeko", extra: "" },
  "sc-paderborn-07": { id: "250087141", who: "F. Götze", extra: "" },
  "1-fc-union-berlin": { id: "250023709", who: "Rønnow", extra: "; bounded set: researched hint 1/2024 (Union Berlin UCL 23/24) + adjacent seasons all 404" },
  "paris-fc": { id: "1902188", who: "Trapp", extra: "" },
  "stade-rennais-fc-1901": { id: "250132409", who: "Thomasson", extra: "" },
  "fc-lorient": { id: "250210897", who: "Bernardeau", extra: "" },
  "ogc-nice": { id: "250171228", who: "Clauss", extra: "" },
  "rc-strasbourg-alsace": { id: "250136355", who: "Doué", extra: "; Panichelli fallback probed: his only existing cutoff is 1/2026 (Leverkusen UCL 25/26) — wrong-club kit by kit timing (Leverkusen 2025–2026, Strasbourg 2026–)" },
  "angers-sco": { id: "1901643", who: "Lopes", extra: "" },
  "le-mans-fc": { id: "250175693", who: "Brahimi", extra: "" },
  "le-havre-ac": { id: "250099055", who: "Samatta", extra: "" },
  "frosinone-calcio": { id: "250097378", who: "Schmid", extra: "" },
  "real-racing-club-de-santander": { id: "1906765", who: "Canales", extra: "" },
  "toulouse-fc": { id: "250101874", who: "Tengstedt", extra: "" },

  // C — no UEFA profile for any candidate
  "rcd-espanyol-de-barcelona": null,
  "rayo-vallecano-de-madrid": null,
  "elche-cf": null,
  "malaga-cf": null,
  "cagliari-calcio": null,
  "us-lecce": null,
  "ac-monza": null,
  "parma-calcio-1913": null,
  "venezia-fc": null,
  "sv-07-elversberg": null,
  "hamburger-sv": null,
  "borussia-monchengladbach": null,
  "aj-auxerre": null,
  "es-troyes-ac": null,
};

const roster = JSON.parse(fs.readFileSync(ROSTER, "utf8"));
let updated = 0, created = 0;

for (const p of roster.players) {
  const key = p.state_key;
  if (FB_UPDATES[key] && p.no_asset) {
    p.no_asset.evidence = p.no_asset.evidence.replace(/;\s*$/, "") + "; " + FB_UPDATES[key] + ". " + NT_NOTE;
    p.no_asset.reverified_at = VERIFY_DATE;
    updated++;
    continue;
  }
  const hasRec = Object.prototype.hasOwnProperty.call(NEW_RECORDS, key);
  if (!hasRec || p.no_asset) continue;
  const rec = NEW_RECORDS[key];
  if (rec && rec.evidence) {
    p.no_asset = { verified_at: VERIFY_DATE, evidence: rec.evidence + ". " + NT_NOTE, method: rec.method };
  } else if (rec && rec.id) {
    p.no_asset = {
      verified_at: VERIFY_DATE,
      evidence: `${rec.who}: UEFA profile exists (id ${rec.id}) but the page is a generic shell (no name/DOB fields, no cutoff image); current-registration fallback location (UEL/UECL 26/27) probed 404${rec.extra}. ${NT_NOTE}`,
      method: "research-pending resolution (Wikidata P2276 + Wikipedia external links) + bounded probe sets + manual paced probes via the scoped relay, documented per-URL; retry with --refresh if UEFA publishes new assets",
    };
  } else {
    p.no_asset = {
      verified_at: VERIFY_DATE,
      evidence: `no UEFA player profile exists for any hero candidate (research-pending resolution 2026-10-19: no Wikidata P2276 id and no Wikipedia external UEFA link — the candidates have never been registered in UEFA competition, and the club is not in a current UEFA competition). ${NT_NOTE}`,
      method: "research-pending resolution (Wikidata P2276 + Wikipedia external links); no probe surface exists without a player id; retry with --refresh if the club qualifies for a UEFA competition",
    };
  }
  created++;
}

console.log(`updated: ${updated}; created: ${created}`);
if (!DRY) {
  fs.writeFileSync(ROSTER, JSON.stringify(roster, null, 2) + "\n");
  console.log("roster written");
} else {
  console.log("(dry run)");
}
