// live-derby-test.js — non-trivial logic check for v11.20 features:
// derby detection, month-end window, live enrichment, page render (live + derby).
// Usage: node scripts/live-derby-test.js (extracts functions from src/worker.ts)
// NOTE: no "use strict" — sloppy-mode eval leaks function decls to module scope.
const fs = require("fs");
const src = require("./lib/worker-src")();

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

const { normalizeTeamName, normTeamKey } = require("../src/teams.ts");
const { matchKey, canonDedupe } = require("../src/dedupe.ts");
// bundle-format shims: the deployed worker is a self-contained bundle — its
// grabbed code calls (0, import_teams.X) / (0, import_dedupe.X) which must
// resolve through this module scope.
const import_teams = { normalizeTeamName, normTeamKey };
// v12.2x bundle: fetchPublicMatches awaits the FA-AI cache warm-up
const ensureFaAiCache = async () => {};
const ensureFaVenueCache = async () => {}; // v13.13-venues stub
const translateVenue = (v) => v; // v13.13-venues stub
const getNowTehran = () => new Date();
const import_dedupe = { matchKey, canonDedupe };
// esbuild __name wrappers (identity in the sandbox)
const __name = (f) => f;
const domCupSrc = grabFn("function isDomesticCup(code)");
// v12.3: the alias/master helpers must leak before the functions that call them
// (shouldNotify / isFeaturedMatch / isDerby / fetchPublicMatches all resolve
// them through this module scope at runtime). v12.4: hasSelectedTeam joins the
// leak set (the TOP BOX pick calls it; it was missing and only survived
// because the old code path never reached it with these pools).
const aliasSrc = grabVarBalanced("TEAM_ALIASES") + "\n" + grabFn("function normAlias(name)") + "\n" + grabFn("function isDomesticLeagueCode(code)") + "\n" + grabVar("masterMemo") + "\n" + grabFn("function masterTeamList()") + "\n" + grabFn("function isMasterPair(match)") + "\n" + grabFn("function hasSelectedTeam(match)") + "\n" + grabFn("function isMasterClash(match)");
// v13.109-consolidated: the strict tier's machinery must ride in the eval —
// shouldNotify now calls teamNormCache/isUclParticipant/isDerby, and the
// consolidated-tier twin shouldReport joins the leak set (fetchPublicMatches
// re-evals below resolve it through this module scope too).
const uclSrc = grabVar("UCL_PARTICIPANTS") + "\n" + grabFn("function setUclParticipants(names)") + "\n" + grabFn("function clearUclParticipants()") + "\n" + grabFn("function isUclParticipant(name)");
const teamNormSrc = grabFn("function teamNormCache()");
const shouldNotifySrc = grabFn("function shouldNotify(match)") + "\n" + grabFn("function shouldReport(match)");
const featSrc = grabVar("BIG_MATCH_TEAMS") + "\n" + grabVar("BIG_MATCH_UEFA") + "\n" + grabFn("function isFeaturedMatch(match)") + "\n" + grabFn("function pickHeroMatch(matches)"); // v13.73-herotruth: the shared hero expression fetchPublicMatches now calls
const derbyBlockSrc = grabVarBalanced("DERBY_PAIRS") + "\n" + grabVarBalanced("DERBY_NORM") + "\n" + grabFn("function isDerby(match)") + "\n" + grabVarBalanced("RIVALRY_PAIRS") + "\n" + grabVarBalanced("RIVALRY_NORM") + "\n" + grabFn("function rivalryName(match, lang, allowUcl)");
const livesSrc = grabFn("function isLiveStatus(status)") + "\n" + grabFn("function applyLiveDetail(m, detail)") + "\n" + grabFn("async function enrichLiveMatches(env, matches)");
const pubSrc = grabFn("function pubMatch(m)");
// v13.35-rounds: pubMatch now derives round/roundFa through roundLabel — the
// grabbed pubMatch body needs roundLabel + its two consts in eval scope.
// v13.80-canonical-hrefs: pubMatch also stamps `path` via matchPath — the
// slug block (TEAM_SLUGS/STRICT_STRIP/teamSlug/matchPath from src/slugs.ts)
// must ride along in the eval.
const roundSrc = grabVar("ROUND_FA") + "\n" + grabVar("FA_ORDINALS") + "\n" + grabFn("function roundLabel(m)") + "\n" + grabVar("TEAM_SLUGS") + "\n" + (function(){ const i = src.indexOf("const STRICT_STRIP = new Set("); const j = src.indexOf(");", i); return src.slice(i, j + 2); })() + "\n" + grabFn("function teamSlug(name)") + "\n" + grabFn("function matchPath(homeName, awayName, utcDate)");

// v13.85-stadiumchip: pubMatch's home-ground fallback — the REAL grounds
// functions ride along (identity normalizeTeamName stub + minimal CONFIG
// table; the venue values aren't under test here — pubMatch must not throw).
// v13.86-groundsfix: the slice extends through curatedVenueFa (pubMatch
// now calls it before translateVenue); normTeamKey is already in this
// module scope (line above, required from src/teams.ts).
const groundsSrc = (function () {
  const i = src.indexOf("let cache = null;");
  const j = src.indexOf("function curatedVenueFa");
  const end = src.indexOf("\n}", j);
  return i >= 0 && j > i ? src.slice(i, end + 3) : "";
})();
// CONFIG + normalizeTeamName are both already in the eval scope (grabbed
// slices carry them) — only the grounds block itself is prepended.
const groundsPrelude = "";
eval(domCupSrc + "\n" + aliasSrc + "\n" + uclSrc + "\n" + teamNormSrc + "\n" + shouldNotifySrc + "\n" + featSrc + "\n" + derbyBlockSrc + "\n" + livesSrc + "\n" + roundSrc + "\n" + pubSrc + "\n" + groundsPrelude + groundsSrc);

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
chk(isDerby({ homeTeam: { name: "FC Bayern München" }, awayTeam: { name: "Borussia Dortmund" }, competition: { code: "BL1" } }) === true, "Der Klassiker (v13.51 DERBY_NORM alias fix — was silently broken)");

// ---------- A2: named rivalries (v13.51 / v13.101-trueduels) ----------
// rivalryName(match, lang, allowUcl?): the named tag for this match in
// this language, or null. Default callers: never in the UCL. v13.101: every
// pairing carries a Persian code name (دربی میلان، کلاسیکر آلمان…) and
// the BOT opt-in (allowUcl=true) lifts the UCL suppression — a Clásico in
// a UCL shirt is still El Clásico. Generic derbies keep the old tag.
const rv = (h, a, comp, lang, allowUcl) => rivalryName({ homeTeam: { name: h }, awayTeam: { name: a }, competition: comp }, lang, allowUcl);
chk(rv("Real Madrid CF", "FC Barcelona", { code: "PD" }, "en") === "El Clásico", "rivalry: El Clásico (La Liga)");
chk(rv("Barcelona", "Real Madrid", { code: "PD" }, "fa") === "\u0627\u0644 \u06A9\u0644\u0627\u0633\u06CC\u06A9\u0648", "rivalry: fa El Clásico keeps its spelling");
chk(rv("Real Madrid CF", "FC Barcelona", { code: "CDR" }, "en") === "El Clásico", "rivalry: El Clásico counts in the Copa del Rey too (domestic cups OK)");
chk(rv("Real Madrid CF", "FC Barcelona", { code: "CL" }, "en") === null, "rivalry: DEFAULT callers get NO name in the UCL (site boxing stays v13.51)");
chk(rv("Real Madrid CF", "FC Barcelona", { code: "CL" }, "en", true) === "El Clásico", "rivalry: allowUcl lifts the UCL suppression (the bot's code-name promotion)");
chk(rv("Barcelona", "Real Madrid", { code: "CL" }, "fa", true) === "\u0627\u0644 \u06A9\u0644\u0627\u0633\u06CC\u06A9\u0648", "rivalry: allowUcl fa Clásico");
chk(isDerby({ homeTeam: { name: "Real Madrid CF" }, awayTeam: { name: "FC Barcelona" }, competition: { code: "CL" } }) === false, "UCL Clásico is not a derby either (isDerby keeps the suppression)");
chk(rv("FC Bayern München", "Borussia Dortmund", { code: "BL1" }, "en") === "Der Klassiker", "rivalry: Der Klassiker (FD spelling)");
chk(rv("Bayern Munich", "Borussia Dortmund", { code: "BL1" }, "en") === "Der Klassiker", "rivalry: Der Klassiker (TSP spelling)");
chk(rv("Bayern Munich", "Borussia Dortmund", { code: "BL1" }, "fa") === "\u06A9\u0644\u0627\u0633\u06CC\u06A9\u0631 \u0622\u0644\u0645\u0627\u0646", "rivalry: fa Klassiker code name (v13.101 — was English-only/null)");
chk(rv("AC Milan", "FC Internazionale Milano", { code: "SA" }, "en") === "Derby della Madonnina", "rivalry: Derby della Madonnina (FD legal names)");
chk(rv("AC Milan", "FC Internazionale Milano", { code: "SA" }, "fa") === "\u062F\u0631\u0628\u06CC \u0645\u06CC\u0644\u0627\u0646", "rivalry: fa Madonnina = دربی میلان");
chk(rv("Liverpool FC", "Manchester United FC", { code: "PL" }, "en") === "North West Derby", "rivalry: North West Derby");
chk(rv("Manchester United FC", "Manchester City FC", { code: "PL" }, "en") === "Manchester Derby", "rivalry: Manchester Derby (reversed pair order)");
chk(rv("Arsenal FC", "Tottenham Hotspur FC", { code: "PL" }, "en") === "North London Derby", "rivalry: North London Derby");
chk(rv("Paris Saint-Germain", "Olympique de Marseille", { code: "FL1" }, "en") === "Le Classique", "rivalry: Le Classique");
chk(rv("AS Roma", "SS Lazio", { code: "SA" }, "en") === "Derby della Capitale", "rivalry: Derby della Capitale (SS Lazio alias fold)");
chk(rv("Juventus FC", "Torino FC", { code: "SA" }, "en") === "Derby della Mole", "rivalry: Derby della Mole");
chk(rv("Arsenal FC", "Chelsea FC", { code: "PL" }, "en") === null, "rivalry: none for a non-rivalry pair");
// v13.101-trueduels: the three NEW named pairings
chk(rv("Club Atlético de Madrid", "Real Madrid CF", { code: "PD" }, "en") === "El Derbi Madrileño", "rivalry: El Derbi Madrileño (FD legal names — was generic-only)");
chk(rv("Club Atlético de Madrid", "Real Madrid CF", { code: "PD" }, "fa") === "\u062F\u0631\u0628\u06CC \u0645\u0627\u062F\u0631\u06CC\u062F", "rivalry: fa Madrid derby = دربی مادرید");
chk(rv("Everton FC", "Liverpool FC", { code: "PL" }, "en") === "Merseyside Derby", "rivalry: Merseyside Derby (was generic-only)");
chk(rv("Everton FC", "Liverpool FC", { code: "PL" }, "fa") === "\u062F\u0631\u0628\u06CC \u0645\u0631\u0633\u06CC\u200C\u0633\u0627\u06CC\u062F", "rivalry: fa Merseyside = دربی مرسی\u200Cساید");
chk(rv("Juventus FC", "FC Internazionale Milano", { code: "SA" }, "en") === "Derby d'Italia", "rivalry: Derby d'Italia (new pairing)");
chk(rv("Juventus FC", "FC Internazionale Milano", { code: "SA" }, "fa") === "\u062F\u0631\u0628\u06CC \u0627\u06CC\u062A\u0627\u0644\u06CC\u0627", "rivalry: fa Derby d'Italia = دربی ایتالیا");
chk(isDerby({ homeTeam: { name: "Juventus FC" }, awayTeam: { name: "FC Internazionale Milano" }, competition: { code: "SA" } }) === true, "Derby d'Italia pair is a derby (boxing/sorting)");
chk(isDerby({ homeTeam: { name: "Everton FC" }, awayTeam: { name: "Liverpool FC" }, competition: { code: "PL" } }) === true, "generic derbies keep the tag (Merseyside — named list doesn't swallow it)");
chk(isDerby({ homeTeam: { name: "Juventus FC" }, awayTeam: { name: "Torino FC" }, competition: { code: "SA" } }) === true, "della Mole pair is also a derby (boxing/sorting)");
// v13.109-consolidated: the FD-legal-name resolution proof moves to the
// CONSOLIDATED tier (same either-desired semantics the asserts pinned since
// v12.x), and the STRICT tier gets its own pins: one-desired league fixtures
// are digest-only with the eval'd UCL set UNPRIMED, the Merseyside derby
// keeps its individual fixture (the derby clause), and priming Betis flips
// the Atlético verdict (the UCL-participant exception).
chk(shouldReport({ homeTeam: { name: "Club Atlético de Madrid" }, awayTeam: { name: "Real Betis Balompié" }, competition: { code: "PD" } }) === true, "Atlético (FD legal name) is REPORTED via PD selection");
chk(shouldReport({ homeTeam: { name: "FC Internazionale Milano" }, awayTeam: { name: "Udinese Calcio" }, competition: { code: "SA" } }) === true, "Inter (FD legal name) is REPORTED via SA selection");
chk(shouldNotify({ homeTeam: { name: "Club Atlético de Madrid" }, awayTeam: { name: "Real Betis Balompié" }, competition: { code: "PD" } }) === false, "v13.109: Atlético–Betis (one desired) is digest-only — strict tier, unprimed set");
chk(shouldNotify({ homeTeam: { name: "FC Internazionale Milano" }, awayTeam: { name: "Udinese Calcio" }, competition: { code: "SA" } }) === false, "v13.109: Inter–Udinese (one desired) is digest-only — strict tier, unprimed set");
chk(shouldNotify({ homeTeam: { name: "Liverpool FC" }, awayTeam: { name: "Everton FC" }, competition: { code: "PL" } }) === true, "v13.109: the Merseyside derby keeps its individual fixture (derby clause)");
setUclParticipants(["Real Betis Balompié"]);
chk(shouldNotify({ homeTeam: { name: "Club Atlético de Madrid" }, awayTeam: { name: "Real Betis Balompié" }, competition: { code: "PD" } }) === true, "v13.109: Atlético–Betis pushes once Betis is a UCL participant (the exception)");
clearUclParticipants();
chk(isFeaturedMatch({ homeTeam: { name: "Club Atlético de Madrid" }, awayTeam: { name: "Real Madrid CF" }, competition: { code: "PD" } }) === true, "Madrid derby is a featured pairing (FD legal names)");
chk(isMasterPair({ homeTeam: { name: "FC Internazionale Milano" }, awayTeam: { name: "AC Milan" }, competition: { code: "SA" } }) === true, "Madonnina is a master pair (FD legal names)");
chk(isMasterClash({ homeTeam: { name: "Arsenal FC" }, awayTeam: { name: "Liverpool FC" }, competition: { code: "PL" } }) === true, "Arsenal-Liverpool is a domestic master clash");
chk(isMasterClash({ homeTeam: { name: "Arsenal FC" }, awayTeam: { name: "Liverpool FC" }, competition: { code: "CL" } }) === false, "CL pairings are NOT domestic clashes (CL BOX territory)");

// ---------- B: month-end window via real fetchPublicMatches ----------
// v13.52 (test hygiene): the upcoming list is EOM-gated (fixtures beyond the
// current month-end are intentionally dropped), so fixed +Nd fixtures cross
// the boundary in the last N days of any month — found live 2026-09-28,
// three days before EOM, on PRISTINE 13.51 code (t-rout at +3d fell into
// October and "routine selected fixture stays in the upcoming list" failed).
// The suite must never be date-dependent: relOff(days) returns the plain
// day-offset when the month has room and otherwise scales it into the
// remaining hours — strictly increasing in `days`, so every kickoff-order
// assertion keeps holding. (Rows whose assertions are box/90-day-window
// only — e.g. t-clash2 at relOff(5) — may scale past EOM on cramped months;
// that is fine: the box window is 90d, only `upcoming` is month-gated.)
const EOM_MS = (() => { const d = new Date(); d.setMonth(d.getMonth() + 1, 0); d.setHours(23, 59, 59, 999); return d.getTime(); })();
// v13.55: m-in's fixed +1d offset collided with m-out (next-month-1st
// 12:00) when the suite runs on the EOM day after noon — m-in landed Oct 1
// 19:00, AFTER m-out, flipping the box's kickoff order (found live
// 2026-09-30 19:00Z, both slots red on pristine 13.54.1). nearOff keeps
// m-in strictly inside the current month on cramped days (EOM −1h, floored
// at 1min) so m-in < m-out holds every day of every month; on normal days
// it is exactly the old +1d.
const nearOff = Math.max(6e4, Math.min(864e5, EOM_MS - Date.now() - 36e5));
const relOff = (days) => (EOM_MS - Date.now() > (days + 1) * 864e5) ? days * 864e5 : Math.max(6e4, Math.round((EOM_MS - Date.now()) * days / 4.2));
const fetchPM = grabFn("async function fetchPublicMatches(env, req"); // req optional (rate-limit only); v13.35 adds opts (prewarm/pool)
const pool = [
  { id: "m-in", homeTeam: { name: "Arsenal FC" }, awayTeam: { name: "Liverpool FC" }, competition: { code: "PL" }, utcDate: new Date(Date.now() + nearOff).toISOString(), status: "SCHEDULED" },
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
    { id: "t-derby", homeTeam: { name: "Manchester United FC" }, awayTeam: { name: "Manchester City FC" }, competition: { code: "PL" }, utcDate: new Date(Date.now() + relOff(2)).toISOString(), status: "SCHEDULED" },
    { id: "t-clash2", homeTeam: { name: "FC Barcelona" }, awayTeam: { name: "Real Madrid CF" }, competition: { code: "PD" }, utcDate: new Date(Date.now() + relOff(5)).toISOString(), status: "SCHEDULED" },
    { id: "t-one", homeTeam: { name: "Arsenal FC" }, awayTeam: { name: "Brentford FC" }, competition: { code: "PL" }, utcDate: new Date(Date.now() + relOff(1)).toISOString(), status: "SCHEDULED" },
    { id: "t-none", homeTeam: { name: "Everton FC" }, awayTeam: { name: "Fulham FC" }, competition: { code: "PL" }, utcDate: new Date(Date.now() + relOff(3)).toISOString(), status: "SCHEDULED" }
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
    { id: "t-fb", homeTeam: { name: "Liverpool FC" }, awayTeam: { name: "Tottenham Hotspur FC" }, competition: { code: "PL" }, utcDate: new Date(Date.now() + relOff(1)).toISOString(), status: "SCHEDULED" },
    { id: "t-derby", homeTeam: { name: "Manchester United FC" }, awayTeam: { name: "Manchester City FC" }, competition: { code: "PL" }, utcDate: new Date(Date.now() + relOff(2)).toISOString(), status: "SCHEDULED" },
    { id: "t-rout", homeTeam: { name: "Arsenal FC" }, awayTeam: { name: "Brentford FC" }, competition: { code: "PL" }, utcDate: new Date(Date.now() + relOff(3)).toISOString(), status: "SCHEDULED" }
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

  // Scenario 5 (v13.35): prewarm ride-along + canary strip + round labels.
  // The cron tick passes its in-memory pool (which CONTAINS the synthetic
  // canary match) via opts.pool + opts.prewarm: the canary must never reach
  // the public payload, the payload must be stamped `prewarm` (and the KV
  // write must carry it), and cup fixtures must surface round/roundFa.
  const state5 = { store: {} };
  const env5 = {
    API_TOKEN: "t",
    STATE: { get: async (k, type) => { const v = state5.store[k]; return v == null ? null : type === "json" ? JSON.parse(v) : v; }, put: async (k, v) => { state5.store[k] = v; } }
  };
  const pool5 = [
    { id: "canary-1", canary: true, homeTeam: { name: "Arsenal FC" }, awayTeam: { name: "Chelsea FC" }, competition: { code: "PL" }, utcDate: new Date(Date.now() + 25 * 36e5).toISOString(), status: "SCHEDULED" },
    { id: "t-fa", homeTeam: { name: "Arsenal FC" }, awayTeam: { name: "Chelsea FC" }, competition: { code: "FA_CUP" }, utcDate: new Date(Date.now() + 70 * 864e5).toISOString(), status: "SCHEDULED", roundRaw: "Round of 16" },
    { id: "t-el", homeTeam: { name: "Manchester United FC" }, awayTeam: { name: "Tottenham Hotspur FC" }, competition: { code: "EL" }, utcDate: new Date(Date.now() + 9 * 864e5).toISOString(), status: "SCHEDULED", roundRaw: "Quarter-finals" }
  ];
  eval("const applySettings = async () => {};\nconst getCachedMatches = async () => pool5;\nconst fetchLongView = async () => pool5;\nconst enrichLiveMatches = async (e, ms) => ms;\nconst fetchStandings = async (env, code) => null;\nconst compact = (st) => (st && st.teams && st.teams.length ? st : null);\nconst COMP_EN = { PL: \"PL\", PD: \"PD\", SA: \"SA\", BL1: \"BL1\", FL1: \"FL1\", CL: \"CL\", EL: \"EL\", ECL: \"ECL\", PGL: \"PGL\", FA_CUP: \"FA Cup\" };\nconst LEAGUE_LOGOS = {};\nconst CONFIG = { KV_PUBLIC_MATCHES: \"pm5\", INTL_COMPETITIONS: {}, DOMESTIC_CUP_IDS: { FA_CUP: 2055 }, CUP_PHASE_WINDOWS: { EURO_LL_START: \"2026-09-28T00:00:00Z\", FA_ROUND1: \"2026-11-09T00:00:00Z\" } };\n" + fetchPM);
  const d5 = await fetchPublicMatches(env5, null, { prewarm: true, pool: pool5 });
  const all5 = [].concat(d5.upcoming, d5.topSpot.matches || [], d5.thisWeek || [], d5.nextWeek || []);
  chk(!all5.some((m) => m.canary || String(m.id || "").indexOf("canary") !== -1), "prewarm: canary match never reaches the public payload");
  chk(d5.prewarm === true, "prewarm: payload stamped prewarm (9.25-min fresh window)");
  const kv5 = JSON.parse(state5.store["pm5"]);
  chk(kv5 && kv5.data && kv5.data.prewarm === true, "prewarm: KV write carries the prewarm stamp");
  const faRow = d5.cups && d5.cups.find((c) => c.code === "FA_CUP");
  chk(!!faRow && !!faRow.next, "prewarm: FA Cup box has its next fixture");
  chk(faRow && faRow.next.round === "Round of 16" && faRow.next.roundFa === "یک‌هشتم نهایی", "prewarm: cup fixture carries round + FA round label (Round of 16)");
  const elRow = d5.cups && d5.cups.find((c) => c.code === "EL");
  chk(elRow && elRow.next.roundFa === "یک‌چهارم نهایی", "prewarm: EL quarter-final relabeled (یک‌چهارم نهایی)");
  const leagueRow = [].concat(d5.upcoming, d5.finished).find((m) => m.competition && m.competition.code === "PL");
  if (leagueRow) chk(leagueRow.round == null && leagueRow.roundFa == null, "prewarm: league fixtures carry NO round chip");

  // ---------- v14.0.6-livescore: the overlay score SHAPE ----------
  // Owner report: live card showed "undefined - undefined". Root cause:
  // applyLiveOverlay wrote the INTERNAL raw-FD {fullTime:{home,away}} shape
  // into PUBLIC payload rows whose contract (pubMatch) is flat {home,away} —
  // the client's scoreNode/keyOf and the server's scoreHtml read score.home
  // directly. Public rows must stay flat; only the raw POOL rows (re-shaped
  // through pubMatch, which reads m.score.fullTime) keep the nested shape.
  const alo = grabFn("function applyLiveOverlay");
  eval(alo);
  const mkPub = (id, h, a) => ({ id, homeTeam: { name: h }, awayTeam: { name: a }, utcDate: "2026-10-11T13:00:00Z", status: "TIMED", score: null, minute: null });
  const ov14 = { rows: [
    // h/a are NORMALIZED names — exactly what the cron tick writes (cron.ts
    // stores normalizeTeamName() of each side; the byPair key is built from
    // them raw and looked up normalized).
    { id: 558583, h: normalizeTeamName("SS Lazio"), a: normalizeTeamName("AC Monza"), d: "2026-10-11T13:00:00Z", st: "IN_PLAY", min: 63, s: { home: 2, away: 1 } },
    { id: null, h: normalizeTeamName("SS Lazio"), a: normalizeTeamName("Parma Calcio 1913"), d: "2026-10-11T13:00:00Z", st: "FINISHED", min: null, s: { home: 3, away: 0 } } // pair-lookup row (no id)
  ] };
  const pub = mkPub(558583, "SS Lazio", "AC Monza");
  const pubPair = mkPub(null, "SS Lazio", "Parma Calcio 1913"); // found via team-pair + day, not id
  const pubUntouched = mkPub(991199, "AS Roma", "Bologna FC"); // not in the overlay
  const poolRow14 = { id: 558583, homeTeam: { name: "SS Lazio" }, awayTeam: { name: "AC Monza" }, utcDate: "2026-10-11T13:00:00Z", status: "TIMED", score: null };
  const served14 = applyLiveOverlay({ upcoming: [pub, pubPair, pubUntouched], thisWeek: [mkPub(558583, "SS Lazio", "AC Monza")], finished: [], pool: [poolRow14] }, ov14);
  chk(served14.upcoming[0].status === "IN_PLAY" && served14.upcoming[0].minute === 63, "livescore: overlay patches status + minute on public rows");
  chk(served14.upcoming[0].score && served14.upcoming[0].score.home === 2 && served14.upcoming[0].score.away === 1, "livescore: PUBLIC rows carry the FLAT {home,away} score (client reads score.home — was \"undefined - undefined\")");
  chk(!(served14.upcoming[0].score && served14.upcoming[0].score.fullTime), "livescore: no nested fullTime on public rows (keyOf's change detection sees goals again)");
  chk(served14.finished.length === 1 && served14.finished[0].status === "FINISHED" && served14.finished[0].score && served14.finished[0].score.home === 3 && served14.finished[0].score.away === 0, "livescore: pair-lookup row (no id) FINISHED → purged from upcoming, prepended to finished with a FLAT score");
  chk(!served14.finished[0].score.fullTime, "livescore: justFinished prepend rows are flat too");
  chk(served14.upcoming.length === 2 && served14.upcoming[1].status === "TIMED" && served14.upcoming[1].score === null, "livescore: rows outside the overlay untouched");
  chk(served14.thisWeek[0].score && served14.thisWeek[0].score.home === 2 && !served14.thisWeek[0].score.fullTime, "livescore: thisWeek rows (forEach index-arg trap) stay flat");
  chk(served14.pool[0].score && served14.pool[0].score.fullTime && served14.pool[0].score.fullTime.home === 2 && served14.pool[0].score.fullTime.away === 1, "livescore: RAW POOL rows keep the internal {fullTime:{home,away}} shape for pubMatch");

  console.log(fails === 0 ? "worker logic OK ✓" : fails + " FAILURES");
  process.exit(fails ? 1 : 0);
})();