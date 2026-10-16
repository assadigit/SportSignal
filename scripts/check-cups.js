// Self-check: per-cup "next match" selection + tournament tier/grouping (the cup
// boxes on the public page). Extracts the exact selection code from worker.ts
// (single source of truth), runs it against dummy matches, and asserts: live match
// wins over future, future-only per cup, finished matches are excluded, UEFA tiers
// (gold/silver/bronze) and domestic country grouping, and international cups are
// hidden unless in process.
const fs = require("fs");
const src = require("./lib/worker-src")();

// 1) Extract isLiveStatus (source of truth)
const isLiveStatus = new Function(
  "status",
  src.match(/function isLiveStatus\(status\) \{[\s\S]*?\n\}/)[0].replace(/^function isLiveStatus\(status\) \{/, "").replace(/\n\}$/, "")
);

// 2) Extract the cups block from fetchPublicMatches
const start = src.indexOf('const tierOf = (code) =>');
const end = src.indexOf("const data = { upcoming:", start);
if (start < 0 || end < 0) { console.error("FAIL: cups block not found in worker.ts"); process.exit(1); }
const cupBlock = src.slice(start, end)
  // bundle-format: the v12.28+ clubs-catalog KV fetch (await) is not under
  // test here — neutralize it so the sync eval still parses.
  .replace(/const clubsCat = await env\.STATE\.get\([^;]+;/, "const clubsCat = null;");

// 3) Stub the globals the block references
const compEn = eval("(" + src.match(/var COMP_EN = (\{[\s\S]*?\n\});/)[1] + ")");
globalThis.COMP_EN = compEn;
const translateCompetition = () => "x";
const LEAGUE_LOGOS = {};
globalThis.pubMatch = (m) => m;
// bundle format: extracted code resolves (0, import_teams.normalizeTeamName)
globalThis.import_teams = { normalizeTeamName: (n) => n };
// esbuild __name wrappers (identity in the sandbox)
globalThis.__name = (f) => f;
// the cups block reads CUP_PHASE_WINDOWS against the current Tehran clock
globalThis.getNowTehran = () => new Date();
// getNowTehran(env) evaluates its argument — the block only needs a blank env
globalThis.env = { STATE: { get: async () => null } };
// the block also builds thisWeek/nextWeek lists (not under test) — their
// filters need these three helpers
// v13.109-consolidated: the block's filters read the consolidated tier
// (shouldReport) now — stub it the same way the old shouldNotify stub did.
globalThis.shouldNotify = () => false;
globalThis.shouldReport = () => false;
globalThis.isTopTeamInvolved = () => false;
globalThis.liveRank = () => 0;
globalThis.compact = (st) => (st && st.teams && st.teams.length ? st : null);
globalThis.translateTeam = (n) => n;
// Future-plan fix: the UCL spot block now filters for a featured (big) pairing
// before falling back to the next fixture — stub it true so the live-first
// assertion still selects the live match.
globalThis.isFeaturedMatch = () => true;
// v12.3: the CL BOX pick also considers selected-vs-selected pairings
// (isMasterPair) — stub false so the cup fixtures here never qualify.
globalThis.isMasterPair = () => false;
// v12.4/v12.12: the UCL box shows ONLY matches with ≥1 selected club — stub
// the selector so the CL fixtures here (cup4/cup5) qualify and every other
// fixture doesn't; the old nbig pick chain is retired with the generalized box.
globalThis.hasSelectedTeam = (m) => m.competition.code === "CL";
// Only WC is "known" to the stub config: a WC match exists (box shows), while EC
// has fixtures (intl codes are fetched) but is NOT in INTL_COMPETITIONS — assert
// the cup list only ever includes codes from the config.
globalThis.CONFIG = { INTL_COMPETITIONS: { WC: 2000 }, CUP_PHASE_WINDOWS: { EURO_LL_START: "2026-09-28T00:00:00Z", FA_ROUND1: "2026-11-09T00:00:00Z" } };
// Fixture dates are generated relative to "now" (d(n) = today + n days) so the
// gate never goes stale; the FA_CUP/round-window dates stay absolute because
// they are compared against the fixed CUP_PHASE_WINDOWS in the stub config
// below (refreshed each season alongside worker CONFIG).
const d = (days) => new Date(Date.now() + days * 864e5).toISOString();
const matches = [
  { id: "cup1", competition: { code: "FA_CUP" }, status: "FINISHED", utcDate: "2026-08-05T10:00:00Z" },   // finished → excluded
  { id: "cup9", competition: { code: "FA_CUP" }, status: "SCHEDULED", utcDate: d(1) },                   // pre First-Round amateur tie → must be hidden
  { id: "cup2", competition: { code: "FA_CUP" }, status: "SCHEDULED", utcDate: "2026-11-10T10:00:00Z" },  // next FA cup (post Round-1, big-club entry)
  { id: "cup3", competition: { code: "FA_CUP" }, status: "SCHEDULED", utcDate: "2026-11-20T10:00:00Z" },  // later → not picked
  { id: "cup4", competition: { code: "CL" }, status: "LIVE", utcDate: "2026-08-08T10:00:00Z" },           // live CL → wins
  { id: "cup5", competition: { code: "CL" }, status: "SCHEDULED", utcDate: d(2) },                       // future CL
  { id: "cup6", competition: { code: "EL" }, status: "SCHEDULED", utcDate: d(5) },                        // EL (pre league-phase → labelled qualifying)
  { id: "cup7", competition: { code: "WC" }, status: "SCHEDULED", utcDate: d(6) },                        // intl WC in process
  { id: "cup8", competition: { code: "EC" }, status: "SCHEDULED", utcDate: d(7) }                         // EC data exists but unknown to config → must not appear
];
let cups;
let uclOut;
// v13.53-standsteady: the UCL card slice now references snapUcl (the
// snapshot fallback source declared above the extracted block) — stub it
// null so the stCL-null path keeps its pre-13.53 semantics (started=true,
// teams=null).
try { const out = eval("(() => { const stPGL = null; const stCL = null; var snapUcl = null; const matches = " + JSON.stringify(matches) + ";" + cupBlock.replace("const cupOrder", "var cupOrder") + "return { cups, ucl };})()"); cups = out.cups; uclOut = out.ucl; }
catch (e) { console.error("FAIL: cups block threw: " + e.message); process.exit(1); }

const byCode = {};
cups.forEach((c) => { byCode[c.code] = c.next ? c.next.id : null; });
const tierOf = (code) => { const c = cups.find((x) => x.code === code); return c ? c.tier : null; };
const countryOf = (code) => { const c = cups.find((x) => x.code === code); return c ? c.country : null; };

let failed = 0;
const check = (label, actual, expected) => {
  if (actual !== expected) { console.error(`FAIL ${label}: got ${actual}, want ${expected}`); failed++; }
};
check("FA_CUP next (post Round-1; pre-Round-1 amateur hidden)", byCode.FA_CUP, "cup2");
check("CL gone from generic cups (own box now)", byCode.CL, undefined);
check("EL next", byCode.EL, "cup6");
check("ECL no matches -> null", byCode.ECL, null);
check("EFL_CUP no matches -> null", byCode.EFL_CUP, null);
check("CDR no matches -> null", byCode.CDR, null);
check("COPPA_ITALIA no matches -> null", byCode.COPPA_ITALIA, null);
check("WC in process -> box present", byCode.WC, "cup7");
check("EC unknown to config -> box absent", byCode.EC, undefined);

// UCL dedicated payload (v12.12): the GENERALIZED box — live CL match leads,
// only matches with ≥1 selected club (the CL fixtures; the rest is noise),
// the single-headline nbig pick is retired, full table shape unchanged.
check("ucl payload present", !!uclOut, true);
check("ucl box live-first, selected-only", uclOut.matches.map((m) => m.id).join(","), "cup4,cup5");
check("ucl nbig retired (v12.12 generalized box)", uclOut.nbig, undefined);
check("ucl teams null when stCL null", uclOut.teams, null);

check("CL tier irrelevant in cups", tierOf("CL"), null);
check("EL tier", tierOf("EL"), "silver");
check("ECL tier", tierOf("ECL"), "bronze");
check("WC tier", tierOf("WC"), "gold");
check("FA_CUP tier", tierOf("FA_CUP"), "domestic");
check("FA_CUP country", countryOf("FA_CUP"), "EN");
check("EFL_CUP country", countryOf("EFL_CUP"), "EN");
check("CDR country", countryOf("CDR"), "ES");
check("COPPA_ITALIA country", countryOf("COPPA_ITALIA"), "IT");

// --- v13.50-cupscan: the team-view cup mapper (behavioral) ---
// cupEventToMatch wraps tspEventToMatch with the LIVE status vocabulary
// TSP's team view carries (strStatus) — the league-view mapper only knows
// finished|completed and would report a 2H match as SCHEDULED.
const cemM = src.match(/function cupEventToMatch\(e, code\) \{[\s\S]*?\n\}/);
const tspM = src.match(/function tspEventToMatch\(e, code\) \{[\s\S]*?\n\}/);
if (!cemM || !tspM) {
  console.error("FAIL: cupEventToMatch/tspEventToMatch not found in worker source");
  process.exit(1);
}
const cemSrc = cemM[0];
const tspSrc = tspM[0];
globalThis.parseTSPDate = (d, t) => new Date(d + "T" + (t || "12:00:00") + "Z").toISOString();
globalThis.mapStageName = () => "REGULAR_SEASON";
const cemFn = eval("(function () {" + tspSrc + "\n" + cemSrc + " return cupEventToMatch; })()");
const mkEv = (st, h, a) => ({ strSport: "Soccer", idLeague: "4570", strLeague: "EFL Cup", strStatus: st, intHomeScore: h, intAwayScore: a, dateEvent: "2026-09-15", strTime: "19:00:00", strHomeTeam: "Liverpool", strAwayTeam: "Tottenham Hotspur", strRound: "32", idEvent: "2594454" });
const c1 = cemFn(mkEv("NS", null, null), "EFL_CUP");
check("cupscan NS -> SCHEDULED with NO stored score", c1.status === "SCHEDULED" && c1.score === null, true);
const c2 = cemFn(mkEv("2H", "2", "1"), "EFL_CUP");
check("cupscan 2H -> LIVE with live score 2-1", c2.status === "LIVE" && c2.score.fullTime.home === 2 && c2.score.fullTime.away === 1, true);
const c3 = cemFn(mkEv("HT", "0", "0"), "EFL_CUP");
check("cupscan HT -> PAUSED", c3.status === "PAUSED", true);
const c4 = cemFn(mkEv("FT", "4", "0"), "EFL_CUP");
check("cupscan FT -> FINISHED with final score", c4.status === "FINISHED" && c4.score.fullTime.home === 4, true);
const c5 = cemFn(mkEv("", "", ""), "EFL_CUP");
check("cupscan empty strStatus -> league-view fallback (SCHEDULED, no score)", c5.status === "SCHEDULED" && c5.score === null, true);
check("cupscan roundRaw preserved (3rd-round label)", c5.roundRaw === "32", true);
const c6 = cemFn(mkEv("AET", "1", "1"), "EFL_CUP");
check("cupscan AET -> FINISHED", c6.status === "FINISHED", true);

console.log(failed ? failed + " failures" : "cups selection OK");
process.exit(failed ? 1 : 0);