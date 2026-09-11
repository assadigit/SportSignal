// Self-check: v12.15 uniform club names + UCL auto-selection. Extracts the
// EXACT code from worker.ts (single source of truth) and asserts:
//   1) the code defaults ship ONE name per club (the reported "FC Bayern
//      München" + "Bayern Munich" duplicate is gone from the BL1 default),
//   2) canonicalizeTeams() folds stored variants onto the EXACT catalog name
//      ("Bayern Munich" → "FC Bayern München", "Inter Milan" → "FC
//      Internazionale Milano", "Atlético Madrid" → "Club Atlético de
//      Madrid", "Paris Saint-Germain" → "Paris Saint-Germain FC") and
//      dedupes within each league list; unknown names pass through; a null
//      (missing) catalog still dedupes by normAlias,
//   3) syncUclSelection() puts EVERY selected club into the CL box (union),
//      keeps UCL-only picks, dedupes across leagues, and drops clubs removed
//      from every league,
//   4) wiring: read path + save path apply both, the admin add-flow carries
//      the anorm() variant guard + CL auto-add, i18n keys exist (fa+en).
const fs = require("fs");
const src = fs.readFileSync("src/worker.ts", "utf8");

let pass = 0, fail = 0;
function ok(cond, label) {
  if (cond) { pass++; console.log("OK   " + label); }
  else { fail++; console.log("FAIL " + label); }
}

// 1) Extract the REAL blocks: TEAM_ALIASES+normAlias, then the v12.15
//    canonicalization block (catalogNameMap … syncUclSelection).
const { normalizeTeamName } = require("../src/teams.js");
globalThis.__name = (t) => t;
globalThis.normalizeTeamName = normalizeTeamName;
const aStart = src.indexOf("var TEAM_ALIASES = {");
const aEnd = src.indexOf('__name(normAlias, "normAlias");');
if (aStart < 0 || aEnd < 0) { console.error("FAIL: alias block not found"); process.exit(1); }
eval(src.slice(aStart, aEnd + '__name(normAlias, "normAlias");'.length));
const cStart = src.indexOf("function catalogNameMap(");
const cEnd = src.indexOf('__name(syncUclSelection, "syncUclSelection");');
if (cStart < 0 || cEnd < 0) { console.error("FAIL: canonical block not found"); process.exit(1); }
eval(src.slice(cStart, cEnd + '__name(syncUclSelection, "syncUclSelection");'.length));

// 2) Fixture catalog with the REAL provider names (shape of KV clubs_catalog).
const cat = { clubs: [
  { n: "FC Bayern München", s: "Bayern", t: "FCB", l: ["CL", "BL1"], c: "" },
  { n: "Borussia Dortmund", s: "Dortmund", t: "BVB", l: ["CL", "BL1"], c: "" },
  { n: "FC Internazionale Milano", s: "Inter", t: "INT", l: ["CL", "SA"], c: "" },
  { n: "AC Milan", s: "Milan", t: "MIL", l: ["SA"], c: "" },
  { n: "Club Atlético de Madrid", s: "Atleti", t: "ATL", l: ["CL", "PD"], c: "" },
  { n: "Real Madrid CF", s: "Real Madrid", t: "RMA", l: ["CL", "PD"], c: "" },
  { n: "FC Barcelona", s: "Barça", t: "FCB", l: ["CL", "PD"], c: "" },
  { n: "Paris Saint-Germain FC", s: "PSG", t: "PSG", l: ["CL", "FL1"], c: "" },
  { n: "Arsenal FC", s: "Arsenal", t: "ARS", l: ["CL", "PL"], c: "" },
  { n: "AS Roma", s: "Roma", t: "ROM", l: ["SA"], c: "" },
  { n: "Melbourne Victory", s: "", t: "", l: ["AL"], c: "" },
  { n: "Western Sydney Wanderers FC", s: "", t: "", l: ["AL"], c: "" }
] };

// 3) The code defaults: ONE name per club (the shipped BL1 list).
const dStart = src.indexOf("BIG_TEAMS_BY_LEAGUE: {");
const dEnd = src.indexOf("DOMESTIC_CUP_IDS:");
if (dStart < 0 || dEnd < 0) { console.error("FAIL: defaults block not found"); process.exit(1); }
const defaultsText = src.slice(dStart + "BIG_TEAMS_BY_LEAGUE:".length, dEnd);
var defaultsTeams = eval("(" + defaultsText.trim().replace(/,$/, "") + ")");
ok(Array.isArray(defaultsTeams.BL1) && defaultsTeams.BL1.length === 2, "default BL1 ships exactly 2 clubs (duplicate removed)");
ok(defaultsTeams.BL1.some((t) => t === "FC Bayern München") && !defaultsTeams.BL1.includes("Bayern Munich"), 'default BL1 has "FC Bayern München" and NOT "Bayern Munich"');
{
  // No variant duplicates anywhere in the shipped defaults (catalog or not).
  const canonDefs = canonicalizeTeams(defaultsTeams, cat);
  const clean = Object.entries(defaultsTeams).every(([lg, list]) => canonDefs[lg] && list.length === canonDefs[lg].length);
  ok(clean, "defaults: no league list contains a name-variant duplicate");
}

// 4) canonicalizeTeams — the exact duplicate the user reported.
{
  const t = canonicalizeTeams({ BL1: ["FC Bayern München", "Bayern Munich", "Borussia Dortmund"] }, cat);
  ok(t.BL1.length === 2 && t.BL1[0] === "FC Bayern München" && t.BL1[1] === "Borussia Dortmund", '"FC Bayern München" + "Bayern Munich" collapse to ONE exact provider entry');
}
{
  const t = canonicalizeTeams({ SA: ["Inter Milan", "AC Milan"], PD: ["Atlético Madrid"], FL1: ["Paris Saint-Germain"] }, cat);
  ok(t.SA[0] === "FC Internazionale Milano" && t.SA[1] === "AC Milan", '"Inter Milan" folds onto "FC Internazionale Milano" (legal name)');
  ok(t.PD[0] === "Club Atlético de Madrid", '"Atlético Madrid" folds onto "Club Atlético de Madrid" (alias map)');
  ok(t.FL1[0] === "Paris Saint-Germain FC", '"Paris Saint-Germain" folds onto this season\'s "Paris Saint-Germain FC"');
}
{
  const t = canonicalizeTeams({ SA: ["AS Roma", "Some FC Neverland"] }, cat);
  ok(t.SA[0] === "AS Roma" && t.SA[1] === "Some FC Neverland", "exact name kept + unknown name passes through (free-typed fallback)");
}
{
  const t = canonicalizeTeams({ BL1: ["FC Bayern München", "Bayern Munich", "Bayern  München"] }, null);
  ok(t.BL1.length === 1 && t.BL1[0] === "FC Bayern München", "null catalog (degraded): variants still dedupe by normAlias, first entry wins");
}
{
  const t = canonicalizeTeams({ SA: ["Roma"] }, cat); // short-name "Roma" of AS Roma
  ok(t.SA[0] === "AS Roma", 'short-name variant "Roma" maps onto "AS Roma"');
}

// 5) syncUclSelection — every club added anywhere is selected for UCL.
{
  const t = syncUclSelection({ PL: ["Arsenal FC"], PD: ["FC Barcelona", "Real Madrid CF"], CL: ["Olympique de Marseille"] });
  ok(t.CL[0] === "Olympique de Marseille", "UCL-only explicit pick stays first in the CL list");
  ok(t.CL.length === 4 && t.CL.includes("Arsenal FC") && t.CL.includes("FC Barcelona") && t.CL.includes("Real Madrid CF"), "every league club auto-selected for the Champions League");
}
{
  const t = syncUclSelection({ PL: ["Arsenal FC"], PD: ["Arsenal FC"] });
  ok(t.CL.length === 1, "same club in two leagues → ONE CL entry (dedupe)");
}
{
  const t = syncUclSelection({ PD: ["FC Barcelona", "Real Madrid CF"] }); // Arsenal removed everywhere
  ok(!t.CL.includes("Arsenal FC"), "club removed from every league drops out of UCL on recompute");
}
{
  const t = syncUclSelection({});
  ok(Array.isArray(t.CL) && t.CL.length === 0, "empty teams → empty CL array (never undefined)");
}
{
  const t = syncUclSelection(canonicalizeTeams(defaultsTeams, cat));
  ok(t.CL.length === 18, "defaults through the full pipeline → CL box mirrors all 18 unique clubs");
  ok(t.CL.includes("FC Bayern München") && t.CL.includes("Paris Saint-Germain FC") && t.CL.includes("Melbourne Victory"), "CL union includes Bayern, canonical PSG and the A-League clubs");
}

// 6) Wiring: both entry points + admin add-flow + i18n.
ok((src.match(/syncUclSelection\(canonicalizeTeams\(/g) || []).length >= 2, "read path (GET /api/settings) AND save path (PUT) apply canonicalize + UCL sync");
ok(src.includes("function anorm(") && src.includes("AC_ALIAS"), "admin add-flow carries the anorm() variant guard");
ok(src.includes('STATE.teams.CL = STATE.teams.CL || []') && src.includes('fmt("acAddUcl"'), "admin add-flow auto-adds to the CL box with the acAddUcl toast");
ok(src.includes('uh.textContent = T("uclSync")'), "CL box renders the auto-selection hint (uclSync)");
ok(src.includes("acAddUcl:") && (src.match(/acAddUcl:/g) || []).length === 6, "acAddUcl i18n key present in all 6 page dicts");
ok(src.includes("uclSync:") && (src.match(/uclSync:/g) || []).length === 6, "uclSync i18n key present in all 6 page dicts");
ok(src.includes("12.17-fai"), "VERSION bumped to 12.17-fai (uniform + UCL auto-selection still on board)");

console.log(fail === 0 ? "uniform names + UCL auto-selection OK ✓" : `uniform names + UCL auto-selection FAILED (${fail})`);
process.exit(fail === 0 ? 0 : 1);
