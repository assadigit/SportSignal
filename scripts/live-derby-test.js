// live-derby-test.js — non-trivial logic check for v11.20 features:
// derby detection, month-end window, live enrichment, page render (live + derby).
// Usage: node scripts/live-derby-test.js (extracts functions from src/worker.ts)
// NOTE: no "use strict" — sloppy-mode eval leaks function decls to module scope.
const fs = require("fs");
const src = fs.readFileSync("src/worker.ts", "utf8");

function grabFn(name) {
  const i = src.indexOf(name);
  if (i < 0) throw new Error("missing " + name);
  const open = src.indexOf("{", i);
  let depth = 0, j = open;
  for (; j < src.length; j++) {
    const ch = src[j];
    if (ch === "{") depth++;
    else if (ch === "}") { depth--; if (depth === 0) break; }
  }
  return src.slice(i, j + 1);
}
function grabVar(name) {
  const i = src.indexOf("var " + name + " =");
  const j = src.indexOf(";", i);
  return src.slice(i, j + 1);
}
function grabVarBalanced(name) {
  // like grabVar but brace-aware: var X = expr with inner braces (e.g. .map(function(){...}))
  const i = src.indexOf("var " + name + " =");
  const eq = src.indexOf("=", i);
  let depth = 0, j = eq;
  for (; j < src.length; j++) {
    const ch = src[j];
    if (ch === "{") depth++;
    else if (ch === "}") { depth--; if (depth < 0) break; }
    else if (ch === ";" && depth === 0) break;
  }
  return src.slice(i, j + 1);
}

let fails = 0;
function chk(cond, msg) { if (!cond) { fails++; console.log("FAIL " + msg); } }

// ---------- worker-side functions ----------
const CONFIG = {
  KV_PUBLIC_MATCHES: "public_matches_v1",
  KV_MATCHES_KEY: "matches_v13_tracked",
  KV_LIVE_DETAIL: "live_detail_",
  BIG_TEAMS_BY_LEAGUE: {
    PL: ["Arsenal FC", "Liverpool FC", "Manchester City FC", "Manchester United FC"],
    EL: ["Arsenal FC", "Liverpool FC", "Manchester City FC", "Manchester United FC", "FC Barcelona", "Paris Saint-Germain"],
    ECL: ["Arsenal FC", "Liverpool FC", "Manchester City FC", "Manchester United FC", "FC Barcelona", "Paris Saint-Germain"],
    PD: ["FC Barcelona", "Real Madrid CF", "Atlético Madrid"],
    SA: ["Inter Milan", "AC Milan"],
    FL1: ["Paris Saint-Germain"]
  },
  DOMESTIC_CUP_IDS: { FA_CUP: 2055 }
};
const isQuarterFinalOrLater = () => false;
const translateTeam = (n) => n;
const translateCompetition = (c) => c;
const LEAGUE_LOGOS = {};

const { normalizeTeamName } = require("../src/teams.js");
const { matchKey, canonDedupe } = require("../src/dedupe.js");
const domCupSrc = grabFn("function isDomesticCup(code)");
// v12.3: the alias/master helpers must leak before the functions that call them
// (shouldNotify / isFeaturedMatch / isDerby / fetchPublicMatches all resolve
// them through this module scope at runtime). v12.4: hasSelectedTeam joins the
// leak set (the TOP BOX pick calls it; it was missing and only survived
// because the old code path never reached it with these pools).
const aliasSrc = grabVarBalanced("TEAM_ALIASES") + "\n" + grabFn("function normAlias(name)") + "\n" + grabFn("function isDomesticLeagueCode(code)") + "\n" + grabVar("_masterMemo") + "\n" + grabFn("function masterTeamList()") + "\n" + grabFn("function isMasterPair(match)") + "\n" + grabFn("function hasSelectedTeam(match)") + "\n" + grabFn("function isMasterClash(match)");
const shouldNotifySrc = grabFn("function shouldNotify(match)");
const featSrc = grabVar("BIG_MATCH_TEAMS") + "\n" + grabVar("BIG_MATCH_UEFA") + "\n" + grabFn("function isFeaturedMatch(match)");
const derbyBlockSrc = grabVarBalanced("DERBY_PAIRS") + "\n" + grabVarBalanced("DERBY_NORM") + "\n" + grabFn("function isDerby(match)");
const livesSrc = grabFn("function isLiveStatus(status)") + "\n" + grabFn("function applyLiveDetail(m, detail)") + "\n" + grabFn("async function enrichLiveMatches(env, matches)");
const pubSrc = grabFn("function pubMatch(m)");

eval(domCupSrc + "\n" + aliasSrc + "\n" + shouldNotifySrc + "\n" + featSrc + "\n" + derbyBlockSrc + "\n" + livesSrc + "\n" + pubSrc);

// ---------- A: derby detection ----------
chk(isDerby({ homeTeam: { name: "Real Madrid CF" }, awayTeam: { name: "FC Barcelona" } }) === true, "El Clasico");
chk(isDerby({ homeTeam: { name: "Barcelona" }, awayTeam: { name: "Real Madrid" } }) === true, "El Clasico reversed (short names)");
chk(isDerby({ homeTeam: { name: "AC Milan" }, awayTeam: { name: "Inter Milan" } }) === true, "Madonnina (ac-milan norm)");
chk(isDerby({ homeTeam: { name: "Manchester City FC" }, awayTeam: { name: "Manchester United FC" } }) === true, "Manchester derby");
chk(isDerby({ homeTeam: { name: "Everton FC" }, awayTeam: { name: "Liverpool FC" } }) === true, "Merseyside reversed");
chk(isDerby({ homeTeam: { name: "Paris Saint-Germain" }, awayTeam: { name: "Olympique de Marseille" } }) === true, "Le Classique");
chk(isDerby({ homeTeam: { name: "Arsenal FC" }, awayTeam: { name: "Chelsea FC" } }) === false, "not a derby pair");
chk(isDerby({ homeTeam: { name: "Arsenal FC" }, awayTeam: { name: "Tottenham Hotspur FC" } }) === true, "North London derby");
// v12.3: football-data legal names must fold onto the short forms via the alias map
chk(isDerby({ homeTeam: { name: "Club Atlético de Madrid" }, awayTeam: { name: "Real Madrid CF" } }) === true, "Madrid derby (FD legal names)");
chk(isDerby({ homeTeam: { name: "AC Milan" }, awayTeam: { name: "FC Internazionale Milano" } }) === true, "Madonnina (FD legal names)");
chk(shouldNotify({ homeTeam: { name: "Club Atlético de Madrid" }, awayTeam: { name: "Real Betis Balompié" }, competition: { code: "PD" } }) === true, "Atlético (FD legal name) notifies via PD selection");
chk(shouldNotify({ homeTeam: { name: "FC Internazionale Milano" }, awayTeam: { name: "Udinese Calcio" }, competition: { code: "SA" } }) === true, "Inter (FD legal name) notifies via SA selection");
chk(isFeaturedMatch({ homeTeam: { name: "Club Atlético de Madrid" }, awayTeam: { name: "Real Madrid CF" }, competition: { code: "PD" } }) === true, "Madrid derby is a featured pairing (FD legal names)");
chk(isMasterPair({ homeTeam: { name: "FC Internazionale Milano" }, awayTeam: { name: "AC Milan" }, competition: { code: "SA" } }) === true, "Madonnina is a master pair (FD legal names)");
chk(isMasterClash({ homeTeam: { name: "Arsenal FC" }, awayTeam: { name: "Liverpool FC" }, competition: { code: "PL" } }) === true, "Arsenal-Liverpool is a domestic master clash");
chk(isMasterClash({ homeTeam: { name: "Arsenal FC" }, awayTeam: { name: "Liverpool FC" }, competition: { code: "CL" } }) === false, "CL pairings are NOT domestic clashes (CL BOX territory)");

// ---------- B: month-end window via real fetchPublicMatches ----------
const fetchPM = grabFn("async function fetchPublicMatches(env, req)"); // req optional (rate-limit only)
const pool = [
  { id: "m-in", homeTeam: { name: "Arsenal FC" }, awayTeam: { name: "Liverpool FC" }, competition: { code: "PL" }, utcDate: new Date(Date.now() + 864e5).toISOString(), status: "SCHEDULED" },
  (() => { const d = new Date(); d.setMonth(d.getMonth() + 1, 1); d.setHours(12, 0, 0, 0); return { id: "m-out", homeTeam: { name: "Arsenal FC" }, awayTeam: { name: "Liverpool FC" }, competition: { code: "PL" }, utcDate: d.toISOString(), status: "SCHEDULED" }; })(),
  { id: "m-live", homeTeam: { name: "Manchester City FC" }, awayTeam: { name: "Manchester United FC" }, competition: { code: "PL" }, utcDate: new Date(Date.now() - 40 * 6e4).toISOString(), status: "IN_PLAY", minute: 67, scorers: [{ minute: 23, type: "GOAL", scorer: "Haaland", team: "Manchester City FC" }], score: { fullTime: { home: 2, away: 1 } } },
  (() => { const d = new Date(); d.setMonth(d.getMonth() + 2, 15); d.setHours(19, 0, 0, 0); return { id: "m-far", homeTeam: { name: "FC Barcelona" }, awayTeam: { name: "Real Madrid CF" }, competition: { code: "PD" }, utcDate: d.toISOString(), status: "SCHEDULED" }; })(),
  { id: "m-nonfollowed", homeTeam: { name: "Coventry City FC" }, awayTeam: { name: "Bristol City FC" }, competition: { code: "PL" }, utcDate: new Date(Date.now() + 864e5).toISOString(), status: "SCHEDULED" }
];
let pool2 = pool;
const state = { store: {} };
state.store["matches_v13_tracked"] = { fetchedAt: new Date().toISOString(), source: "test", matches: pool };
// C: cacheMatches merge semantics — the wide pool must survive cron near-rewrites.
const cacheSrc = grabFn("async function cacheMatches(env, matches, source)") + "\n" + grabFn("async function getCachedMatches(env)");
eval(cacheSrc);
const testState = { store: {} };
const testEnv = {
  STATE: { get: async (k, type) => { const v = testState.store[k]; return v == null ? null : type === "json" ? JSON.parse(v) : v; }, put: async (k, v) => { testState.store[k] = v; } }
};
(async () => {
  const far = { id: "far-1", homeTeam: { name: "FC Barcelona" }, awayTeam: { name: "Real Madrid CF" }, competition: { code: "PD" }, utcDate: new Date(Date.now() + 80 * 864e5).toISOString(), status: "SCHEDULED" };
  await cacheMatches(testEnv, [far], "longview");
  const cs1 = await getCachedMatches(testEnv);
  chk(cs1.length === 1 && cs1[0].id === "far-1", "long view writes far match");
  const near = { id: "near-1", homeTeam: { name: "Arsenal FC" }, awayTeam: { name: "Liverpool FC" }, competition: { code: "PL" }, utcDate: new Date(Date.now() + 3 * 864e5).toISOString(), status: "SCHEDULED" };
  await cacheMatches(testEnv, [near], "cron");
  const cs2 = await getCachedMatches(testEnv);
  chk(cs2.length === 2 && cs2.some((m) => m.id === "far-1"), "cron rewrite keeps far match (merge not replace)");
  const near2 = { id: "near-1", homeTeam: { name: "Arsenal FC" }, awayTeam: { name: "Liverpool FC" }, competition: { code: "PL" }, utcDate: new Date(Date.now() + 3 * 864e5).toISOString(), status: "TIMED" };
  // Seed an ancient entry into the cache head, then rewrite without it: the
  // 2-day cutoff must prune it on the next merge (fresh args are never pruned
  // by design — the wide long-view horizon must survive cron rewrites).
  await cacheMatches(testEnv, [{ id: "old-1", homeTeam: { name: "A" }, awayTeam: { name: "B" }, competition: { code: "PD" }, utcDate: new Date(Date.now() - 90 * 864e5).toISOString(), status: "FINISHED" }], "cron");
  await cacheMatches(testEnv, [near2], "cron");
  const cs3 = await getCachedMatches(testEnv);
  chk(cs3.find((m) => m.id === "near-1").status === "TIMED", "same-id entry overwritten by fresher data");
  chk(!cs3.some((m) => m.id === "old-1"), "ancient entry pruned from cache head");
  console.log("cache merge check done");
})().catch((e) => { console.error(e); process.exit(1); });
// D: getJalaliDate — Persian order must be day month-name year (جمعه ۳۰ مرداد ۱۴۰۵).
const jalaliSrc = grabFn("function getJalaliDate(utcDateStr, env)");
eval(jalaliSrc);
const jd = getJalaliDate("2026-08-21T19:00:00Z", { TEHRAN_TZ: "Asia/Tehran" });
chk(/^\S+ \S+ \S+ \S+$/.test(jd), "getJalaliDate returns 4 fields (weekday day month year)");
chk(/مرداد/.test(jd), "getJalaliDate uses Persian month name");
chk(!/^\d{4}/.test(jd), "getJalaliDate does not start with the year");
const envStub = {
  API_TOKEN: "t",
  STATE: {
    get: async (k, type) => { const v = state.store[k]; return v == null ? null : type === "json" ? JSON.parse(v) : v; },
    put: async (k, v) => { state.store[k] = v; }
  }
};
eval("const applySettings = async () => {};\nconst getCachedMatches = async () => pool2;\nconst fetchLongView = async () => pool2;\nconst enrichLiveMatches = async (e, ms) => ms;\nconst fetchStandings = async (env, code) => null;\nconst compact = (st) => (st && st.teams && st.teams.length ? st : null);\nconst COMP_EN = { PL: \"PL\", PD: \"PD\", SA: \"SA\", BL1: \"BL1\", CL: \"CL\", EL: \"EL\", ECL: \"ECL\", FA_CUP: \"FA Cup\", EFL_CUP: \"EFL Cup\", CDR: \"CDR\", COPPA_ITALIA: \"COPPA_ITALIA\" };\nconst LEAGUE_LOGOS = {};\nconst CONFIG = { KV_PUBLIC_MATCHES: \"public_matches_v1\", INTL_COMPETITIONS: {}, DOMESTIC_CUP_IDS: { FA_CUP: 2055 }, CUP_PHASE_WINDOWS: { EURO_LL_START: \"2026-09-28T00:00:00Z\", FA_ROUND1: \"2026-11-09T00:00:00Z\" } };\n" + fetchPM);
(async () => {
  const data = await fetchPublicMatches(envStub);
  const ids = data.upcoming.map((m) => m.id);
  // v12.7: the TOP BOX consolidates every big fixture (up to 6) — live clash,
  // near clash, month-out clash and the far derby ALL live in the box now, so
  // the upcoming list is empty and the box IS their presentation.
  chk(!ids.length, "v12.7: all big fixtures consolidated into the TOP BOX, upcoming list empty");
  const box = data.topSpot && data.topSpot.matches;
  chk(Array.isArray(box) && box.length === 4, "TOP BOX holds the 4 big matches (live clash + near clash + month-out clash + far derby)");
  chk(data.topSpot.next && data.topSpot.next.id === "m-live", "TOP BOX slot 1 = live master clash (v12.4 headline semantics)");
  const boxIds = (box || []).map((m) => m.id);
  chk(boxIds[0] === "m-live", "slot 1 = live master clash");
  chk(boxIds[1] === "m-in", "slot 2 = nearest ≤7-day clash");
  chk(boxIds[2] === "m-out" && boxIds[3] === "m-far", "far slots follow kickoff order (month-out clash then far derby)");
  chk(!boxIds.includes("m-nonfollowed"), "non-followed match never boxes");
  const live = data.topSpot && data.topSpot.next;
  chk(!!live && live.id === "m-live", "TOP BOX headline = live master clash");
  chk(live && live.minute === 67, "live minute exposed (TOP BOX)");
  chk(live && live.scorers.length === 1 && live.scorers[0].scorer === "Haaland", "live scorers exposed (TOP BOX)");
  chk(live && live.derby === true, "derby flag on Manchester derby (TOP BOX)");
  chk(live && live.clash === true, "clash flag on TOP BOX headline");
  chk(data.nextBig && data.nextBig.id === "m-live", "nextBig = nearest featured match (live wins)");
  chk(data.nextBig && data.nextBig.derby === true, "nextBig carries derby flag (Manchester derby)");
  chk(data.nextBig && data.nextBig.id != null, "nextBig exposes id");
  chk((box || []).find((m) => m.id === "m-in").derby === false, "no derby flag on Arsenal-Liverpool");
  chk((box || []).every((m) => m.id != null), "pubMatch exposes id");

  // Scenario 2: no featured match inside the month window → nextBig must cross EOM.
  // Purge the 3-min public-matches KV cache so the far-pool scenario actually re-runs.
  delete state.store["public_matches_v1"];
  pool2 = pool.filter((m) => m.id === "m-far" || m.id === "m-nonfollowed");
  const data2 = await fetchPublicMatches(envStub);
  chk(data2.nextBig && data2.nextBig.id === "m-far", "nextBig crosses EOM (far featured match)");
  chk(data2.nextBig && data2.nextBig.derby === true, "far El Clasico flagged as derby");
  chk(!data2.upcoming.length, "month list empty without in-window featured matches");
  chk(data2.topSpot && data2.topSpot.next && data2.topSpot.next.id === "m-far", "far clash headlines the TOP BOX (90-day horizon crosses EOM)");

  // Scenario 3 (v12.3): TOP BOX — a domestic selected-vs-selected clash is the
  // headline; it is excluded from the upcoming list; further clashes stay in
  // the list clash-flagged. Re-eval fetchPublicMatches with fresh stubs (the
  // eval re-leaks the function with a closure over THIS eval's stubs — that is
  // also why this scenario must run AFTER scenario 1/2 finished).
  const state3 = { store: {} };
  const env3 = {
    API_TOKEN: "t",
    STATE: { get: async (k, type) => { const v = state3.store[k]; return v == null ? null : type === "json" ? JSON.parse(v) : v; }, put: async (k, v) => { state3.store[k] = v; } }
  };
  const pool3 = [
    { id: "t-derby", homeTeam: { name: "Manchester United FC" }, awayTeam: { name: "Manchester City FC" }, competition: { code: "PL" }, utcDate: new Date(Date.now() + 2 * 864e5).toISOString(), status: "SCHEDULED" },
    { id: "t-clash2", homeTeam: { name: "FC Barcelona" }, awayTeam: { name: "Real Madrid CF" }, competition: { code: "PD" }, utcDate: new Date(Date.now() + 5 * 864e5).toISOString(), status: "SCHEDULED" },
    { id: "t-one", homeTeam: { name: "Arsenal FC" }, awayTeam: { name: "Brentford FC" }, competition: { code: "PL" }, utcDate: new Date(Date.now() + 864e5).toISOString(), status: "SCHEDULED" },
    { id: "t-none", homeTeam: { name: "Everton FC" }, awayTeam: { name: "Fulham FC" }, competition: { code: "PL" }, utcDate: new Date(Date.now() + 3 * 864e5).toISOString(), status: "SCHEDULED" }
  ];
  eval("const applySettings = async () => {};\nconst getCachedMatches = async () => pool3;\nconst fetchLongView = async () => pool3;\nconst enrichLiveMatches = async (e, ms) => ms;\nconst fetchStandings = async (env, code) => null;\nconst compact = (st) => (st && st.teams && st.teams.length ? st : null);\nconst COMP_EN = { PL: \"PL\", PD: \"PD\", SA: \"SA\", BL1: \"BL1\", FL1: \"FL1\", AL: \"AL\", CL: \"CL\", EL: \"EL\", ECL: \"ECL\", PGL: \"PGL\" };\nconst LEAGUE_LOGOS = {};\nconst CONFIG = { KV_PUBLIC_MATCHES: \"pm3\", INTL_COMPETITIONS: {}, DOMESTIC_CUP_IDS: { FA_CUP: 2055 }, CUP_PHASE_WINDOWS: { EURO_LL_START: \"2026-09-28T00:00:00Z\", FA_ROUND1: \"2026-11-09T00:00:00Z\" } };\n" + fetchPM);
  const d3 = await fetchPublicMatches(env3);
  chk(d3.topSpot && d3.topSpot.next && d3.topSpot.next.id === "t-derby", "TOP BOX headline = nearest selected-vs-selected league clash");
  chk(d3.topSpot.next.clash === true && d3.topSpot.next.derby === true, "TOP BOX headline carries clash+derby flags");
  // v12.7: the further clash is CONSOLIDATED into the box (was: stays in the
  // list) — the box holds up to six big matches together.
  // v12.8: t-one (Arsenal–Brentford — ONE selected side vs a non-top-5
  // opponent, no standings available) is NOT big anymore: it stays in the
  // upcoming list instead of taking a box slot (the Liverpool–Fulham rule).
  const box3 = d3.topSpot.matches || [];
  chk(box3.map((m) => m.id).join(",") === "t-derby,t-clash2", "v12.8: box = [nearest clash, further clash] in kickoff order");
  const c2 = box3.find((m) => m.id === "t-clash2");
  chk(!!c2 && c2.clash === true, "further clash consolidated into the box, clash-flagged");
  chk(!d3.upcoming.some((m) => m.id === "t-derby"), "headline clash excluded from the upcoming list");
  chk(!d3.upcoming.some((m) => m.id === "t-clash2"), "boxed further clash excluded from the upcoming list");
  chk(d3.upcoming.some((m) => m.id === "t-one"), "v12.8: single-selected vs non-top-5 stays in the upcoming list (NOT big)");
  chk(!box3.some((m) => m.id === "t-one"), "v12.8: single-selected vs non-top-5 never boxes (Liverpool–Fulham rule)");
  chk(!box3.some((m) => m.id === "t-none"), "unfollowed match never boxes");
  chk(d3.nextBig && d3.nextBig.id === "t-derby", "nextBig prefers the selected-vs-selected clash");

  // Scenario 3b (v12.8): the fallback tier + STRICT kickoff order. With PL
  // standings stubbed (top 5: City, Arsenal, Hull, Chelsea, Tottenham):
  //   t-fb     Liverpool–Tottenham   +1d  fallback (selected vs TOP-5 side)
  //   t-derby  Man Utd–Man City      +2d  core (A: two selected + C: derby)
  //   t-rout   Arsenal–Brentford     +3d  NOT big (selected vs non-top-5)
  // Box = [t-fb, t-derby] — strictly by kickoff: the CLOSEST upcoming match
  // is on top even when a core derby sits behind it; topSpot.next (the
  // countdown target) is the box top. t-rout never boxes.
  const state4 = { store: {} };
  const env4 = {
    API_TOKEN: "t",
    STATE: { get: async (k, type) => { const v = state4.store[k]; return v == null ? null : type === "json" ? JSON.parse(v) : v; }, put: async (k, v) => { state4.store[k] = v; } }
  };
  const stand4 = { PL: { started: true, teams: [
    { pos: 1, name: "Manchester City FC", points: 9 },
    { pos: 2, name: "Arsenal FC", points: 9 },
    { pos: 3, name: "Hull City AFC", points: 7 },
    { pos: 4, name: "Chelsea FC", points: 6 },
    { pos: 5, name: "Tottenham Hotspur FC", points: 5 }
  ] } };
  const pool4 = [
    { id: "t-fb", homeTeam: { name: "Liverpool FC" }, awayTeam: { name: "Tottenham Hotspur FC" }, competition: { code: "PL" }, utcDate: new Date(Date.now() + 1 * 864e5).toISOString(), status: "SCHEDULED" },
    { id: "t-derby", homeTeam: { name: "Manchester United FC" }, awayTeam: { name: "Manchester City FC" }, competition: { code: "PL" }, utcDate: new Date(Date.now() + 2 * 864e5).toISOString(), status: "SCHEDULED" },
    { id: "t-rout", homeTeam: { name: "Arsenal FC" }, awayTeam: { name: "Brentford FC" }, competition: { code: "PL" }, utcDate: new Date(Date.now() + 3 * 864e5).toISOString(), status: "SCHEDULED" }
  ];
  eval("const applySettings = async () => {};\nconst getCachedMatches = async () => pool4;\nconst fetchLongView = async () => pool4;\nconst enrichLiveMatches = async (e, ms) => ms;\nconst fetchStandings = async (env, code) => (stand4[code] || null);\nconst compact = (st) => (st && st.teams && st.teams.length ? st : null);\nconst COMP_EN = { PL: \"PL\", PD: \"PD\", SA: \"SA\", BL1: \"BL1\", FL1: \"FL1\", AL: \"AL\", CL: \"CL\", EL: \"EL\", ECL: \"ECL\", PGL: \"PGL\" };\nconst LEAGUE_LOGOS = {};\nconst CONFIG = { KV_PUBLIC_MATCHES: \"pm4\", INTL_COMPETITIONS: {}, DOMESTIC_CUP_IDS: { FA_CUP: 2055 }, CUP_PHASE_WINDOWS: { EURO_LL_START: \"2026-09-28T00:00:00Z\", FA_ROUND1: \"2026-11-09T00:00:00Z\" } };\n" + fetchPM);
  const d4 = await fetchPublicMatches(env4);
  const box4 = d4.topSpot.matches || [];
  chk(box4.map((m) => m.id).join(",") === "t-fb,t-derby", "v12.8: strict kickoff order — closest (fallback) on top, derby behind");
  chk(d4.topSpot.next && d4.topSpot.next.id === "t-fb", "v12.8: countdown target (topSpot.next) = the box top = closest big match");
  chk(box4.some((m) => m.id === "t-fb"), "v12.8: selected-vs-top-5 (Liverpool–Tottenham) boxes via the fallback tier");
  chk(!box4.some((m) => m.id === "t-rout"), "v12.8: selected-vs-non-top-5 (Arsenal–Brentford) never boxes");
  chk(d4.upcoming.some((m) => m.id === "t-rout"), "v12.8: routine selected fixture stays in the upcoming list");
  chk(!d4.upcoming.some((m) => m.id === "t-fb") && !d4.upcoming.some((m) => m.id === "t-derby"), "boxed fixtures excluded from the upcoming list");
  console.log(fails === 0 ? "worker logic OK ✓" : fails + " FAILURES");
  process.exit(fails ? 1 : 0);
})();