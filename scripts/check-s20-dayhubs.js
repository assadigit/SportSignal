// check-s20-dayhubs.js — v13.273-dayhub (S20, the all-matches day pages):
// the day-hub data-universe extension — the FD four + the emptiness-gated
// senior-international fill. The gates:
//   STATIC — the FD-URL carries the 4 day-view comps in BOTH fetch sites;
//   CONFIG.LEAGUES untouched (the admin-state trap — the 4 codes must NEVER
//   appear there); the intl slug set + INTL_DAY_CODES; the hygiene filters +
//   the unordered-pair collapse; the emptiness-gate wiring + the 44-stop;
//   SS_LIVE_ELIGIBLE + the cron-pool cadence extension; the live-sweep
//   sanitize + the reuse-guard extension; COMP_EN twins + the fa-dict
//   national-team seed; the goal-alert no-audience skip still present (the
//   intl rows claim nothing); the version triple.
//   BEHAVIORAL — the REAL translateCompetition (grabbed from the transformed
//   source) + the REAL provider-intl module (eval'd whole, imports stubbed):
//   the reversed-dupe collapse, the ghost-row collapse, the youth/women drops
//   (incl. the "(w)" form), the club pass-through, the distinct-meeting
//   non-collapse, the LIVE-beats-SCHEDULED collapse, the club-day gate law
//   (BSA never closes it, PL does), the gated scan (12 calls open / 0 closed /
//   0 suspended / 0 at the 44-stop, the [today-1d, tomorrow] date set, the
//   sanitized return carrying the FINISHED score, fail-closed on a scan
//   error).
// The seeded end-to-end harness (club-day ordering, break-day hygiene,
// dead-day honesty, the side-effect map, the goal-alert skip) lives in
// scripts/s20-dayhub-smoke.ts (the s17/s18/s19 precedent, run manually).
const fs = require("fs");
const path = require("path");
const src = require("./lib/worker-src")();

const SRC_DIR = path.join(__dirname, "..", "src");
const readSrc = (f) => fs.readFileSync(path.join(SRC_DIR, f), "utf8");

let failed = 0;
const check = (name, cond) => {
  console.log((cond ? "OK   " : "FAIL ") + name);
  if (!cond) failed++;
};

// grabFn — brace-balanced slice (the check-composers.js scanner).
function grabFn(sig) {
  const i = src.indexOf(sig);
  if (i < 0) throw new Error("missing " + sig);
  const open = src.indexOf("{", i);
  let depth = 0, j = open;
  let state = 0, tplExprDepth = 0;
  const stack = [];
  while (j < src.length) {
    const ch = src[j], next = src[j + 1] || "";
    if (state === 0) {
      if (ch === "/" && next === "/") { state = 1; j += 2; continue; }
      if (ch === "/" && next === "*") { state = 2; j += 2; continue; }
      if (ch === '"') { stack.push(0); state = 3; j++; continue; }
      if (ch === "'") { stack.push(0); state = 4; j++; continue; }
      if (ch === "`") { stack.push(0); state = 5; j++; continue; }
      if (ch === "{") depth++;
      else if (ch === "}") { depth--; if (depth === 0) break; }
      if (ch === "\\" && next === "u" && src[j + 2] === "{") {
        const end = src.indexOf("}", j + 3);
        if (end > 0) { j = end + 1; continue; }
      }
    } else if (state === 1) { if (ch === "\n") state = 0; }
    else if (state === 2) { if (ch === "*" && next === "/") { state = 0; j += 2; continue; } }
    else if (state === 3) { if (ch === "\\") { j += 2; continue; } if (ch === '"') state = stack.pop(); }
    else if (state === 4) { if (ch === "\\") { j += 2; continue; } if (ch === "'") state = stack.pop(); }
    else if (state === 5) {
      if (ch === "\\") { j += 2; continue; }
      if (ch === "`") { state = stack.pop(); continue; }
      if (ch === "$" && next === "{") { state = 6; tplExprDepth = 1; j += 2; continue; }
    } else if (state === 6) {
      if (ch === "{") tplExprDepth++;
      else if (ch === "}") { tplExprDepth--; if (tplExprDepth === 0) state = 5; }
      else if (ch === '"') { stack.push(6); state = 3; }
      else if (ch === "'") { stack.push(6); state = 4; }
      else if (ch === "`") { stack.push(6); state = 5; }
      else if (ch === "\\") j++;
    }
    j++;
  }
  return src.slice(i, j + 1);
}

// ============================================================================
// LAYER 1 — STATIC WIRING
// ============================================================================
const cfgSrc = readSrc("config.ts");
const fdSrc = readSrc("provider-fd.ts");
const provSrc = readSrc("providers.ts");
const intlSrc = readSrc("provider-intl.ts");
const tablesSrc = readSrc("tables.ts");
const translateSrc = readSrc("translate.ts");
const faDictSrc = readSrc("fa-dict.ts");
const poolSrc = readSrc("cron-pool.ts");
const goalSrc = readSrc("goal-alert.ts");
const pagesSrc = readSrc("seo/pages.ts");
const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "package.json"), "utf8"));
const wsSrc = fs.readFileSync(path.join(__dirname, "lib", "worker-src.js"), "utf8");

check("s20: CONFIG.FD_DAYVIEW_COMPS exists with the exact four (DED/PPL/ELC/BSA) — the day-view universe constant",
  /FD_DAYVIEW_COMPS: \["DED", "PPL", "ELC", "BSA"\]/.test(cfgSrc));
check("s20: CONFIG.LEAGUES UNTOUCHED (the admin-state trap — the monitored list stays the big-5+CL exactly; the 4 day-view codes must never leak in)",
  /LEAGUES: \["CL", "PL", "PD", "SA", "FL1", "BL1"\]/.test(cfgSrc) &&
  !/LEAGUES:[^\n]*(DED|PPL|ELC|BSA)/.test(cfgSrc));
check("s20: the FD fetch URL site (provider-fd.ts fetchFootballData — the ONE site for BOTH the full sweep and the live sweep) appends FD_DAYVIEW_COMPS",
  /\[\.\.\.CONFIG\.LEAGUES, \.\.\.\(CONFIG\.FD_DAYVIEW_COMPS \|\| \[\]\)\]\.filter/.test(fdSrc));
check("s20: the long view's FD URL site (providers.ts fetchLongView) appends FD_DAYVIEW_COMPS the same way",
  /fetchLongView[\s\S]{0,2000}\[\.\.\.CONFIG\.LEAGUES, \.\.\.\(CONFIG\.FD_DAYVIEW_COMPS \|\| \[\]\)\]\.filter/.test(provSrc));
check("s20: the four intl slugs ride SPORTSCORE_SLUGS with the verified slug strings (+ INTL_DAY_CODES exported)",
  /"INTL_FR": "international-friendly"/.test(tablesSrc) &&
  /"AFCON_Q": "caf-africa-cup-of-nations"/.test(tablesSrc) &&
  /"CONCACAF_NL": "concacaf-nations-league"/.test(tablesSrc) &&
  /"UEFA_NL": "uefa-nations-league"/.test(tablesSrc) &&
  /export const INTL_DAY_CODES = \["INTL_FR", "AFCON_Q", "CONCACAF_NL", "UEFA_NL"\]/.test(tablesSrc));
check("s20: the default full-sweep slug filter stays WITHOUT the intl codes (the ungated sweep never pays intl calls — the gated fill owns when)",
  /code === "EL" \|\| code === "ECL" \|\| code === "BL1" \|\| code === "FA_CUP" \|\| code === "EFL_CUP" \|\| code === "CDR" \|\| code === "COPPA_ITALIA" \|\| code === "PGL"/.test(readSrc("provider-sportscore.ts")));
check("s20: the hygiene law — the senior-men filter (U16-U23 word-bounded + the women markers incl. the provider's live-verified \"(w)\" form)",
  intlSrc.includes("INTL_YOUTH_WOMEN_RE = /\\bU1[6-9]\\b|\\bU2[0-3]\\b|Women|Frauen|Femenino|Femenil|\\(w\\)/i"));
check("s20: the hygiene law — the unordered-pair+date collapse keeps the MOST-PROGRESSED status (FINISHED > LIVE > SCHEDULED)",
  /\[normalizeTeamName\(h\), normalizeTeamName\(a\)\]\.sort\(\)\.join\("\|"\)/.test(intlSrc) &&
  /statusProgress\(m\) >= statusProgress\(cur\)/.test(intlSrc) &&
  /if \(s === "FINISHED"\) return 2;\s*\n\s*if \(s === "LIVE" \|\| s === "IN_PLAY"\) return 1;/.test(intlSrc));
check("s20: the emptiness gate — the CLUB codes (CONFIG.LEAGUES + EL/ECL + PGL + the domestic cups; the FD-4 and the intl codes deliberately NOT counted), the [now-1d, now+1d] window",
  /codes\.add\("EL"\);[\s\S]{0,120}codes\.add\("ECL"\);[\s\S]{0,80}codes\.add\("PGL"\);[\s\S]{0,200}DOMESTIC_CUP_IDS/.test(intlSrc) &&
  /t >= now - 864e5 && t <= now \+ 864e5/.test(intlSrc));
check("s20: the emptiness gate wiring — fetchMatchesFromAPI hooks the fill BETWEEN TSP and the sportscore CLUB fan-out (v13.273.1-dayhubfix: the verified live failure — a post-fan-out fill budget-stopped at 0 calls after FD 6 + TSP 8 + fan-out 27 + a standings refresh), with the gate fed by merged (FD+TSP) + opts.clubContext (the cached pool, in memory at cron-pool — sportscore-only club rows like PGL close it too; ZERO new KV reads)",
  /if \(s\.name === "sportscore"\) \{\s*\n\s*const intlRows = await fetchIntlDayFill\(env, \[\.\.\.merged\.values\(\), \.\.\.\(\(opts && opts\.clubContext\) \|\| \[\]\)\]\);/.test(provSrc) &&
  /fetchMatchesFromAPI\(budgetHard \? \{ \.\.\.env, KV_BUDGET_HOLD: true \} : env, \{ clubContext: cachedPool \}\)/.test(poolSrc));
check("s20: the 44-metered budget-stop rides the intl scan (the hard backstop)",
  /subrequestCount\(\) >= 44/.test(intlSrc));
check("s20: the scan window is [today-1d, tomorrow] (three UTC dates — the Tehran today/tomorrow buckets)",
  /for \(let i = -1; i <= 1; i\+\+\)/.test(intlSrc));
check("s20: SS_LIVE_ELIGIBLE gains the four intl codes (in-flight internationals get 10-min live score updates)",
  /SS_LIVE_ELIGIBLE = \["EL", "ECL", "BL1", "FA_CUP", "EFL_CUP", "CDR", "COPPA_ITALIA", "PGL", "AL", \.\.\.INTL_DAY_CODES\]/.test(provSrc));
check("s20: the LIVE sweep sanitizes its sportscore fetch (the same feed carries the intl landmines)",
  /const ssClean = sanitizeIntlRows\(ss\);/.test(provSrc) && /fetched\.push\(\.\.\.ssClean\);/.test(provSrc));
check("s20: the cron-pool cadence relevance extension (senior-intl rows arm the active-window cadence — window days sweep like matchdays)",
  /shouldReport\(m\) \|\| isIntlDayCode\(m && m\.competition && m\.competition\.code\)/.test(poolSrc));
check("s20: the cached-pool reuse guard never discards a sweep's intl rows (a sweep carrying them is not a 0-followed sweep)",
  /!matches\.some\(shouldNotify\) && !matches\.some\(\(m\) => isIntlDayCode\(m && m\.competition && m\.competition\.code\)\)/.test(provSrc));
check("s20: COMP_EN twins for the 8 new codes (the EN names on the EN side)",
  /"DED": "Eredivisie"/.test(tablesSrc) && /"PPL": "Primeira Liga"/.test(tablesSrc) &&
  /"ELC": "EFL Championship"/.test(tablesSrc) && /"BSA": "Brasileir/.test(tablesSrc) &&
  /"INTL_FR": "International Friendly"/.test(tablesSrc) && /"AFCON_Q": "CAF Africa Cup of Nations"/.test(tablesSrc) &&
  /"CONCACAF_NL": "CONCACAF Nations League"/.test(tablesSrc) && /"UEFA_NL": "UEFA Nations League"/.test(tablesSrc));
check("s20: the fa-dict national-team seed carries the PROVIDER name forms (IR Iran / Turkiye / Czechia Republic / South Korea / USA)",
  faDictSrc.includes('"IR Iran": "ایران"') &&
  faDictSrc.includes('"Turkiye": "ترکیه"') &&
  faDictSrc.includes('"Czechia Republic": "چک"') &&
  faDictSrc.includes('"South Korea": "کره جنوبی"') &&
  faDictSrc.includes('"USA": "آمریکا"'));
check("s20: the goal-alert no-audience skip still present (a zero-audience intl match claims nothing, the baseline advances)",
  /if \(!matchChats\.length\) \{ out\.noChats\+\+; done\.add\(ev\.key\); continue; \}/.test(goalSrc));
check("s20: provider-intl.ts rides the worker concat (the bundle order, after provider-sportscore)",
  /"provider-breaker\.ts", "provider-wikipedia\.ts", "provider-sportscore\.ts", "provider-intl\.ts", "provider-tsp\.ts"/.test(wsSrc));
check("s20: zero page-builder changes — buildHub's shape (upcomingFollowed + the day filter + the honest empty state) untouched by S20",
  /const all = upcomingFollowed\(ctx\)\.filter\(def\.filter\);/.test(pagesSrc));
check("s20: the version triple — src/config.ts 13.273.1-dayhub + package.json 13.273.1.0",
  /export const VERSION = "13\.273\.1-dayhub";/.test(cfgSrc) &&
  pkg.version === "13.273.1.0");
check("s20: the check is wired into the npm test chain",
  /node scripts\/check-s20-dayhubs\.js/.test(pkg.scripts.test));
check("s20: the seeded harness + the local seeder exist (the s17/s18/s19 convention)",
  fs.existsSync(path.join(__dirname, "s20-dayhub-smoke.ts")) &&
  fs.existsSync(path.join(__dirname, "s20-seed-local-kv.js")));

// ============================================================================
// LAYER 2 — BEHAVIORAL (the REAL functions, eval'd from the transformed source)
// ============================================================================

// ---- the REAL translateCompetition (self-contained grab): the 8 Persian
// names decode through the eval'd parser — the behavior, not the byte form.
eval(grabFn("function translateCompetition(code)"));
check("behavior: translateCompetition carries the 8 new codes' Persian names (the spec strings)",
  translateCompetition("DED") === "اردیویزه هلند" &&
  translateCompetition("PPL") === "لیگ برتر پرتغال" &&
  translateCompetition("ELC") === "چمپیونشیپ انگلیس" &&
  translateCompetition("BSA") === "سری آ برزیل" &&
  translateCompetition("INTL_FR") === "بازی دوستانه ملی" &&
  translateCompetition("AFCON_Q") === "جام ملت‌های آفریقا" &&
  translateCompetition("CONCACAF_NL") === "لیگ ملت‌های کونکاکاف" &&
  translateCompetition("UEFA_NL") === "لیگ ملت‌های اروپا" &&
  translateCompetition("PL") === "لیگ برتر انگلیس");

// ---- the REAL provider-intl module (eval'd whole, imports stubbed) ----
const { normalizeTeamName } = require("../src/teams.ts");
const modStart = src.indexOf("// ===== src/provider-intl.ts =====");
const modEnd = src.indexOf("// ===== src/provider-tsp.ts =====");
if (modStart < 0 || modEnd < 0 || modEnd < modStart) {
  console.log("FAIL s20: the provider-intl.ts module is missing from the worker concat");
  process.exit(1);
}
const modSrc = src.slice(modStart, modEnd);

// The transport stubs (controllable per scenario).
var SS_CALLS = [];
var SS_FEED = {};
var sportScoreDay = async function (code, slug, dateStr, acc) {
  SS_CALLS.push(code + "@" + dateStr);
  // The feed is keyed by code (each slug returns only its own rows — the
  // friendly rows ride the INTL_FR slug alone).
  const rows = code === "INTL_FR" ? (SS_FEED[dateStr] || []) : [];
  let added = 0;
  for (const e of rows) {
    const utcDate = e.time ? new Date(e.time).toISOString() : null;
    if (!utcDate) continue;
    const dedupeKey = code + "|" + e.home + "|" + e.away + "|" + utcDate.slice(0, 16);
    if (acc.seen.has(dedupeKey)) continue;
    acc.seen.add(dedupeKey);
    added++;
    const status = e.status === "finished" ? "FINISHED" : e.status === "live" ? "LIVE" : "SCHEDULED";
    acc.list.push({
      id: "spsc-" + dateStr + "-" + code + "-" + acc.list.length,
      utcDate, status, stage: null, roundRaw: e.round || "",
      competition: { code },
      homeTeam: { name: e.home, crest: e.home_logo || null },
      awayTeam: { name: e.away, crest: e.away_logo || null },
      score: status !== "SCHEDULED" ? { fullTime: { home: parseInt(e.home_score) || 0, away: parseInt(e.away_score) || 0 } } : null
    });
  }
  return added;
};
var providerSuspended = async function () { return false; };
var SUBREQUEST_N = 0;
var subrequestCount = function () { return SUBREQUEST_N; };
var CONFIG = {
  LEAGUES: ["CL", "PL", "PD", "SA", "FL1", "BL1"],
  FD_DAYVIEW_COMPS: ["DED", "PPL", "ELC", "BSA"],
  DOMESTIC_CUP_IDS: { "FA_CUP": 2055, "EFL_CUP": 2139, "CDR": 2079, "COPPA_ITALIA": 2122, "DFB_POKAL": 4555 }
};
var SPORTSCORE_SLUGS = {
  "INTL_FR": "international-friendly",
  "AFCON_Q": "caf-africa-cup-of-nations",
  "CONCACAF_NL": "concacaf-nations-league",
  "UEFA_NL": "uefa-nations-league"
};
var INTL_DAY_CODES = ["INTL_FR", "AFCON_Q", "CONCACAF_NL", "UEFA_NL"];

eval(modSrc);

const KO = "2026-11-17T14:00:00.000Z";
const mkRow = (code, home, away, status, iso, hs, as) => ({
  id: "row-" + code + "-" + home + "-" + away,
  utcDate: iso, status, stage: null, roundRaw: "",
  competition: { code },
  homeTeam: { name: home, crest: null },
  awayTeam: { name: away, crest: null },
  score: hs != null ? { fullTime: { home: hs, away: as } } : null
});

// ---- the hygiene law (sanitizeIntlRows) ----
const sanitized = sanitizeIntlRows([
  mkRow("INTL_FR", "Qatar", "South Korea", "SCHEDULED", KO),
  mkRow("INTL_FR", "South Korea", "Qatar", "FINISHED", KO, 2, 1),
  mkRow("INTL_FR", "Tahiti", "Cook Islands", "SCHEDULED", "2026-11-17T05:30:00.000Z"),
  mkRow("INTL_FR", "Tahiti", "Cook Islands", "FINISHED", "2026-11-17T05:30:00.000Z", 1, 0),
  mkRow("INTL_FR", "South Korea U21", "Mexico U23", "FINISHED", "2026-11-17T10:00:00.000Z", 0, 0),
  mkRow("INTL_FR", "Portugal U18", "USA U18", "FINISHED", "2026-11-17T13:00:00.000Z", 1, 1),
  mkRow("INTL_FR", "Italy (w) U16", "Germany U16 Women", "SCHEDULED", "2026-11-19T10:00:00.000Z"),
  mkRow("INTL_FR", "Italy (w)", "Germany Women", "SCHEDULED", "2026-11-19T10:00:00.000Z"),
  mkRow("INTL_FR", "Iraq", "IR Iran", "FINISHED", "2026-11-17T16:15:00.000Z", 1, 0),
  mkRow("UEFA_NL", "Denmark", "Norway", "FINISHED", "2026-11-17T19:45:00.000Z", 2, 3),
  mkRow("PL", "FC Barcelona", "Real Madrid CF", "TIMED", "2026-11-22T20:00:00.000Z"),
  mkRow("EL", "AS Roma", "FC Porto", "TIMED", "2026-11-27T17:45:00.000Z")
]);
check("behavior: the reversed-dupe collapses to ONE row — the FINISHED orientation (South Korea-Qatar, score kept)",
  sanitized.filter((r) => r.competition.code === "INTL_FR" && /Qatar|South Korea/.test(r.homeTeam.name + r.awayTeam.name)).length === 1 &&
  sanitized.some((r) => r.homeTeam.name === "South Korea" && r.awayTeam.name === "Qatar" && r.status === "FINISHED" && r.score && r.score.fullTime.home === 2 && r.score.fullTime.away === 1));
check("behavior: the ghost-row collapses to ONE row — FINISHED kills the phantom 'upcoming'",
  sanitized.filter((r) => /Tahiti|Cook Islands/.test(r.homeTeam.name + r.awayTeam.name)).length === 1 &&
  sanitized.some((r) => r.homeTeam.name === "Tahiti" && r.status === "FINISHED"));
check("behavior: youth rows DROP (U16-U23 word-bounded)",
  !sanitized.some((r) => /U1[6-9]|U2[0-3]/i.test(r.homeTeam.name + r.awayTeam.name)));
check("behavior: women rows DROP (Women marker + the provider's \"(w)\" form)",
  !sanitized.some((r) => /\(w\)|Women/i.test(r.homeTeam.name + r.awayTeam.name)));
check("behavior: the senior internationals survive with their scores (Iraq-IR Iran 1-0, Denmark-Norway 2-3)",
  sanitized.some((r) => r.homeTeam.name === "Iraq" && r.awayTeam.name === "IR Iran" && r.score && r.score.fullTime.home === 1) &&
  sanitized.some((r) => r.homeTeam.name === "Denmark" && r.score && r.score.fullTime.away === 3));
check("behavior: club rows pass through UNTOUCHED (PL + EL verbatim)",
  sanitized.some((r) => r.competition.code === "PL" && r.homeTeam.name === "FC Barcelona") &&
  sanitized.some((r) => r.competition.code === "EL" && r.homeTeam.name === "AS Roma"));
check("behavior: a malformed intl row (no away name) drops — never a ghost render",
  sanitizeIntlRows([mkRow("INTL_FR", "Iraq", null, "SCHEDULED", KO), mkRow("INTL_FR", "Iraq", "IR Iran", "FINISHED", KO, 1, 0)]).length === 1);
check("behavior: two REAL distinct meetings (different dates) do NOT collapse",
  sanitizeIntlRows([
    mkRow("INTL_FR", "Qatar", "South Korea", "FINISHED", KO, 2, 1),
    mkRow("INTL_FR", "South Korea", "Qatar", "SCHEDULED", "2026-11-21T14:00:00.000Z")
  ]).length === 2);
check("behavior: LIVE beats SCHEDULED in the collapse (an in-flight row wins over its scheduled reversed twin)",
  (() => {
    const out = sanitizeIntlRows([
      mkRow("INTL_FR", "Qatar", "South Korea", "SCHEDULED", KO),
      mkRow("INTL_FR", "South Korea", "Qatar", "LIVE", KO, 1, 0)
    ]);
    return out.length === 1 && out[0].status === "LIVE" && out[0].score.fullTime.home === 1;
  })());

// ---- the emptiness gate (clubDayBusy) ----
const NOW = Date.parse("2026-11-18T13:00:00.000Z");
check("behavior: a CLUB row in [now-1d, now+1d] opens the busy verdict (PL tomorrow)",
  clubDayBusy([mkRow("PL", "Bayern Munich", "1. FC Köln", "TIMED", "2026-11-18T18:00:00.000Z")], NOW) === true);
check("behavior: the FD-4 rows NEVER close the gate (BSA plays through windows — counting it would starve the break days)",
  clubDayBusy([mkRow("BSA", "Cruzeiro EC", "SE Palmeiras", "TIMED", "2026-11-18T23:30:00.000Z")], NOW) === false);
check("behavior: the intl rows never close the gate either (it cannot close itself on its own output)",
  clubDayBusy([mkRow("INTL_FR", "Iraq", "IR Iran", "FINISHED", "2026-11-17T16:15:00.000Z")], NOW) === false);
check("behavior: a club row OUTSIDE [now-1d, now+1d] keeps the gate open (a +2d cup tie is not today)",
  clubDayBusy([mkRow("FA_CUP", "Arsenal FC", "Liverpool FC", "TIMED", "2026-11-20T15:00:00.000Z")], NOW) === false);
check("behavior: PGL + EL + the cups are all club-gate codes (the tracked club universe)",
  clubDayBusy([mkRow("PGL", "Persepolis", "Esteghlal", "TIMED", "2026-11-18T14:00:00.000Z")], NOW) === true &&
  clubDayBusy([mkRow("EL", "AS Roma", "FC Porto", "TIMED", "2026-11-18T20:00:00.000Z")], NOW) === true &&
  clubDayBusy([mkRow("CDR", "Real Madrid CF", "UD Almería", "TIMED", "2026-11-17T20:00:00.000Z")], NOW) === true);
check("behavior: isIntlDayCode — the four codes true, PL/BSA/CL false",
  isIntlDayCode("INTL_FR") && isIntlDayCode("AFCON_Q") && isIntlDayCode("CONCACAF_NL") && isIntlDayCode("UEFA_NL") &&
  !isIntlDayCode("PL") && !isIntlDayCode("BSA") && !isIntlDayCode("CL"));

// ---- the gated scan (fetchIntlDayFill) ----
const env = { STATE: { async get() { return null; }, async put() {} } };
const todayStr = new Date().toISOString().split("T")[0];
const ydayStr = new Date(Date.now() - 864e5).toISOString().split("T")[0];
const tomorrowStr = new Date(Date.now() + 864e5).toISOString().split("T")[0];
SS_FEED = {};
SS_FEED[ydayStr] = [
  { home: "Qatar", away: "South Korea", status: "upcoming", time: ydayStr + "T14:00:00+00:00", home_score: null, away_score: null },
  { home: "South Korea", away: "Qatar", status: "finished", time: ydayStr + "T14:00:00+00:00", home_score: "2", away_score: "1" },
  { home: "Portugal U18", away: "USA U18", status: "finished", time: ydayStr + "T13:00:00+00:00", home_score: "1", away_score: "1" },
  { home: "Iraq", away: "IR Iran", status: "finished", time: ydayStr + "T16:15:00+00:00", home_score: "1", away_score: "0" }
];

(async () => {
  // 1. the gate CLOSED: a club row in-window → ZERO calls.
  SS_CALLS = [];
  const closed = await fetchIntlDayFill(env, [mkRow("PL", "A", "B", "TIMED", new Date(Date.now() + 36e5).toISOString())]);
  check("behavior: the CLOSED gate (a PL row in [now-1d, now+1d]) makes ZERO sportscore calls",
    SS_CALLS.length === 0 && closed.length === 0);
  // 2. sportscore suspended → zero calls.
  providerSuspended = async function () { return true; };
  SS_CALLS = [];
  const susp = await fetchIntlDayFill(env, []);
  check("behavior: a suspended sportscore skips the intl scan entirely",
    SS_CALLS.length === 0 && susp.length === 0);
  providerSuspended = async function () { return false; };
  // 3. the gate OPEN: the BSA row does NOT close it → 12 calls (3 dates x 4 slugs), rows sanitized.
  SS_CALLS = [];
  const open = await fetchIntlDayFill(env, [mkRow("BSA", "Cruzeiro EC", "SE Palmeiras", "TIMED", new Date(Date.now() + 6 * 36e5).toISOString())]);
  const dateSet = new Set(SS_CALLS.map((c) => c.split("@")[1]));
  check("behavior: the OPEN gate scans exactly [today-1d, tomorrow] x the 4 slugs = 12 metered calls",
    SS_CALLS.length === 12 && dateSet.size === 3 && dateSet.has(ydayStr) && dateSet.has(todayStr) && dateSet.has(tomorrowStr));
  check("behavior: the fill's return is SANITIZED (the reversed dupe collapsed to the finished row + the senior; the youth dropped)",
    open.length === 2 &&
    open.some((r) => r.homeTeam.name === "South Korea" && r.status === "FINISHED" && r.score.fullTime.home === 2) &&
    open.some((r) => r.homeTeam.name === "Iraq" && r.awayTeam.name === "IR Iran"));
  // 4. the 44-stop: zero calls when the budget is exhausted.
  SUBREQUEST_N = 44;
  SS_CALLS = [];
  const stopped = await fetchIntlDayFill(env, []);
  check("behavior: the 44-metered budget-stop kills the scan (the hard backstop)",
    SS_CALLS.length === 0 && stopped.length === 0);
  SUBREQUEST_N = 0;
  // 5. a provider error inside the scan never throws (fail-closed, rows lost at most).
  SS_CALLS = [];
  const realDay = sportScoreDay;
  sportScoreDay = async function () { throw new Error("boom"); };
  const errored = await fetchIntlDayFill(env, []);
  sportScoreDay = realDay;
  check("behavior: a total scan failure fails CLOSED (empty return, never a throw)",
    Array.isArray(errored) && errored.length === 0);

  // ---- the verdict ----
  if (failed) {
    console.error("\ncheck-s20-dayhubs: " + failed + " FAIL");
    process.exit(1);
  }
  console.log("\ncheck-s20-dayhubs: all gates OK");
})();
