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
const shouldNotifySrc = grabFn("function shouldNotify(match)");
const featSrc = grabVar("BIG_MATCH_TEAMS") + "\n" + grabVar("BIG_MATCH_UEFA") + "\n" + grabFn("function isFeaturedMatch(match)");
const derbyBlockSrc = grabVarBalanced("DERBY_PAIRS") + "\n" + grabVarBalanced("DERBY_NORM") + "\n" + grabFn("function isDerby(match)");
const livesSrc = grabFn("function isLiveStatus(status)") + "\n" + grabFn("function applyLiveDetail(m, detail)") + "\n" + grabFn("async function enrichLiveMatches(env, matches)");
const pubSrc = grabFn("function pubMatch(m)");

eval(domCupSrc + "\n" + shouldNotifySrc + "\n" + featSrc + "\n" + derbyBlockSrc + "\n" + livesSrc + "\n" + pubSrc);

// ---------- A: derby detection ----------
chk(isDerby({ homeTeam: { name: "Real Madrid CF" }, awayTeam: { name: "FC Barcelona" } }) === true, "El Clasico");
chk(isDerby({ homeTeam: { name: "Barcelona" }, awayTeam: { name: "Real Madrid" } }) === true, "El Clasico reversed (short names)");
chk(isDerby({ homeTeam: { name: "AC Milan" }, awayTeam: { name: "Inter Milan" } }) === true, "Madonnina (ac-milan norm)");
chk(isDerby({ homeTeam: { name: "Manchester City FC" }, awayTeam: { name: "Manchester United FC" } }) === true, "Manchester derby");
chk(isDerby({ homeTeam: { name: "Everton FC" }, awayTeam: { name: "Liverpool FC" } }) === true, "Merseyside reversed");
chk(isDerby({ homeTeam: { name: "Paris Saint-Germain" }, awayTeam: { name: "Olympique de Marseille" } }) === true, "Le Classique");
chk(isDerby({ homeTeam: { name: "Arsenal FC" }, awayTeam: { name: "Chelsea FC" } }) === false, "not a derby pair");
chk(isDerby({ homeTeam: { name: "Arsenal FC" }, awayTeam: { name: "Tottenham Hotspur FC" } }) === true, "North London derby");

// ---------- B: month-end window via real fetchPublicMatches ----------
const fetchPM = grabFn("async function fetchPublicMatches(env)");
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
  chk(ids.includes("m-in"), "in-month match shown");
  chk(ids.includes("m-live"), "live match shown (kickoff passed)");
  chk(!ids.includes("m-out"), "next-month match excluded from list");
  chk(!ids.includes("m-far"), "far (2-month) match excluded from EOM list");
  chk(!ids.includes("m-nonfollowed"), "non-followed match excluded");
  chk(ids[0] === "m-live", "live match pinned on top");
  const live = data.upcoming.find((m) => m.id === "m-live");
  chk(live.minute === 67, "live minute exposed");
  chk(live.scorers.length === 1 && live.scorers[0].scorer === "Haaland", "live scorers exposed");
  chk(live.derby === true, "derby flag on Manchester derby");
  chk(data.nextBig && data.nextBig.id === "m-live", "nextBig = nearest featured match (live wins)");
  chk(data.nextBig && data.nextBig.derby === true, "nextBig carries derby flag (Manchester derby)");
  chk(data.nextBig && data.nextBig.id != null, "nextBig exposes id");
  chk(data.upcoming.find((m) => m.id === "m-in").derby === false, "no derby flag on Arsenal-Liverpool");
  chk(data.upcoming.every((m) => m.id != null), "pubMatch exposes id");

  // Scenario 2: no featured match inside the month window → nextBig must cross EOM.
  // Purge the 3-min public-matches KV cache so the far-pool scenario actually re-runs.
  delete state.store["public_matches_v1"];
  pool2 = pool.filter((m) => m.id === "m-far" || m.id === "m-nonfollowed");
  const data2 = await fetchPublicMatches(envStub);
  chk(data2.nextBig && data2.nextBig.id === "m-far", "nextBig crosses EOM (far featured match)");
  chk(data2.nextBig && data2.nextBig.derby === true, "far El Clasico flagged as derby");
  chk(!data2.upcoming.length, "month list empty without in-window featured matches");
  console.log(fails === 0 ? "worker logic OK ✓" : fails + " FAILURES");
  process.exit(fails ? 1 : 0);
})();