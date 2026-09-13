// Self-check: every Telegram notification formatter includes the date
// (day-of-week + day-of-month) + a minimum emoji set. Regresses if a
// maintainer drops the date line (the user's v13.8 ask: "always mention
// date — a 3h reminder with only time + relative-time is ambiguous") or
// strips emojis below the floor.
//
// Exercises the REAL formatters (extracted from the concatenated worker
// source) against a dummy match, so a behavior change fails the gate
// until the assertions are updated too.
const src = require("./lib/worker-src")();

// --- Extract the composer functions (format*Message) + their deps ---
// The formatters live in src/composers.ts. grabFn is a brace-balanced
// slice that handles template-literal \u{...} escapes (reused from
// check-x-budget.js's scanner).
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
      if (ch === "`") { state = stack.pop(); j++; continue; }
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

let failed = 0;
const check = (name, cond) => {
  console.log((cond ? "OK   " : "FAIL ") + name);
  if (!cond) failed++;
};

// --- Stubs the formatters resolve at call time ---
const CONFIG = {
  KV_STANDINGS_CACHE: "standings_cache_", KV_STANDINGS_SNAP: "standings_snap_",
  BIG_TEAMS_BY_LEAGUE: { PL: ["Arsenal FC", "Liverpool FC"], BL1: ["FC Bayern München"] }
};
const COMP_EN = { PL: "Premier League", BL1: "Bundesliga", CL: "Champions League" };
const STAGE_FA = { GROUP_STAGE: "مرحله گروهی" };
function escapeMarkdownCharacters(s) { return String(s).replace(/([\[\]\(\)~`>#\+\-=|{}\.!_])/g, "\\$1"); }
function toFaDigits(s) { return String(s).replace(/[0-9]/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[+d]); }
function getJalaliDate() { return "شنبه ۱۳ شهریور ۱۴۰۵"; }
function getJalaliTime() { return "۲۱:۰۰"; }
function getEnglishDate() { return "Saturday, 13 September 2026"; }
function getEnglishTime() { return "21:00"; }
function getRelativeTimeUntilMatch() { return "۳ ساعت و ۲۰ دقیقه دیگر"; }
function getEnglishRelative() { return "3h 20m to go"; }
function enStageName(s) { return s ? "Group stage" : null; }
function translateTeam(n) { return n; }
function translateCompetition(c) { return COMP_EN[c] || c; }
function translateVenue(v) { return v; } // v13.13-venues stub
function isDomesticCup() { return false; }
function isDerby() { return false; }
function isMasterPair() { return false; }
function normAlias(n) { return String(n || "").toLowerCase().replace(/\s+/g, ""); }
// standingsLine + fetchStandings stubs (formatResultMessage appends one)
async function fetchStandings() { return null; }
async function standingsLine() { return null; }
function faStageName() { return null; }

// KV stub for fetchStandings
const kv = {
  async get() { return null; },
  async put() { },
  async delete() { }
};

// Expose the grabbed functions
eval([
  grabFn("function format24HourMessage(match, env, lang)"),
  grabFn("function formatBigMatchMessage(match, env, lang)"),
  grabFn("function format3HourMessage(match, env, lang)"),
  grabFn("function format1HourMessage(match, env, lang)"),
  grabFn("function format5MinMessage(match, env, lang)"),
  grabFn("function formatMatchStartMessage(match, env, lang)"),
  grabFn("async function formatResultMessage(match, env, lang)"),
  grabFn("async function appendTableOrPhase(env, match, message, lang)"),
  grabFn("function specialBanner(match, lang)")
].join("\n"));

// --- dummy match (fa) ---
const faMatch = {
  id: 561001,
  homeTeam: { name: "Levante UD" },
  awayTeam: { name: "FC Barcelona" },
  competition: { code: "PD" },
  utcDate: "2026-09-13T17:45:00Z",
  status: "SCHEDULED",
  stage: "REGULAR_SEASON",
  score: { fullTime: { home: null, away: null } }
};
const env = { STATE: kv, TEHRAN_TZ: "Asia/Tehran", API_TOKEN: "x" };

(async () => {
  // 1) format3HourMessage — v13.10 clean format: date-first, no header, no countdown
  const m3h = format3HourMessage(faMatch, env, "fa");
  check("3h reminder includes a date line (📅 or weekday)", /📅/.test(m3h) || /شنبه|یکشنبه|دوشنبه|سه‌شنبه|چهارشنبه|پنجشنبه|جمعه/.test(m3h));
  check("3h reminder still has the time", /۲۱:۰۰|۱۷:۴۵|۰[۰-۹]:[۰-۵][۰-۹]/.test(m3h));
  check("3h reminder has NO countdown (v13.10 removed it)", !/دقیقه دیگر|hours to go/.test(m3h));
  check("3h reminder has NO reminder-header (v13.10 removed it)", !/یادآوری/.test(m3h));
  check("3h reminder has VS emoji", /🆚/.test(m3h));
  check("3h reminder has competition text", /PD|La Liga|لالیگا/.test(m3h));
  check("3h reminder is date-first (📅 on line 1)", m3h.trim().startsWith("📅") || /شنبه|یکشنبه/.test(m3h.split("\n")[0]));

  // 2) format1HourMessage — v13.10 clean format (the user's exact example)
  const m1h = format1HourMessage(faMatch, env, "fa");
  check("1h reminder includes a date line", /📅/.test(m1h) || /شنبه|یکشنبه|دوشنبه/.test(m1h));
  check("1h reminder has VS emoji", /🆚/.test(m1h));
  check("1h reminder has NO countdown (v13.10 removed it)", !/دقیقه دیگر|hours to go/.test(m1h));
  check("1h reminder has NO reminder-header (v13.10 removed it)", !/یادآوری/.test(m1h));
  check("1h reminder has competition text", /PD|La Liga|لالیگا/.test(m1h));

  // 3) format5MinMessage — v13.10 clean format
  const m5 = format5MinMessage(faMatch, env, "fa");
  check("5min reminder includes a date line", /📅/.test(m5) || /شنبه|یکشنبه|دوشنبه/.test(m5));
  check("5min reminder has VS emoji", /🆚/.test(m5));
  check("5min reminder has NO countdown (v13.10 removed it)", !/دقیقه دیگر/.test(m5));

  // 4) formatMatchStartMessage — v13.10 clean format + 🚀
  const ms = formatMatchStartMessage(faMatch, env, "fa");
  check("match-start includes a date line", /📅/.test(ms) || /شنبه|یکشنبه|دوشنبه/.test(ms));
  check("match-start has VS emoji", /🆚/.test(ms));
  check("match-start has 🚀 kickoff marker", /🚀/.test(ms));
  check("match-start has NO countdown (v13.10 removed it)", !/دقیقه دیگر/.test(ms));

  // 5) format24HourMessage — v13.10 clean format
  const m24 = format24HourMessage(faMatch, env, "fa");
  check("24h reminder includes a date line", /📅/.test(m24) || /شنبه|یکشنبه|دوشنبه/.test(m24));
  check("24h reminder has VS emoji", /🆚/.test(m24));
  check("24h reminder has competition text", /PD|La Liga|لالیگا/.test(m24));
  check("24h reminder has NO countdown (v13.10 removed it)", !/دقیقه دیگر|hours to go/.test(m24));

  // 6) formatBigMatchMessage — v13.10 clean format + 🔥
  const mbig = formatBigMatchMessage(faMatch, env, "fa");
  check("big-match reminder includes a date line", /📅/.test(mbig) || /شنبه|یکشنبه|دوشنبه/.test(mbig));
  check("big-match reminder has 🔥 big-match fire", /🔥/.test(mbig));
  check("big-match reminder has VS emoji", /🆚/.test(mbig));
  check("big-match reminder has competition text", /PD|La Liga/.test(mbig));
  check("big-match reminder has NO countdown (v13.10 removed it)", !/دقیقه دیگر|hours to go/.test(mbig));

  // 7) formatResultMessage — date + emojis (score, winner trophy, full-time)
  const finMatch = Object.assign({}, faMatch, { status: "FINISHED", score: { fullTime: { home: 2, away: 1 } } });
  const mres = await formatResultMessage(finMatch, env, "fa");
  check("result includes a date line", /📅/.test(mres) || /شنبه|یکشنبه|دوشنبه/.test(mres));
  check("result has VS emoji", /🆚/.test(mres));
  check("result has 🚩 result head", /🚩/.test(mres));
  check("result has the Persian score", /۲|۱/.test(mres));
  check("result has ✴ winner marker (home won 2-1)", /✴/.test(mres));

  // 8) English variants also carry the date (bilingual)
  const m3hEn = format3HourMessage(faMatch, env, "en");
  check("3h reminder (en) includes a date line", /📅/.test(m3hEn) || /Saturday|Sunday|Monday|Tuesday|Wednesday|Thursday|Friday/.test(m3hEn));

  // 9) transliteration fold (dedupe fix) — Bayern variants collapse (the
  //    reported duplicate-notification bug). Köln→Cologne folds too; the
  //    "1." prefix in "1. FC Köln" is a separate pre-existing edge (club
  //    ordinals), not part of this fix.
  const { normalizeTeamName } = require("../src/teams.js");
  check("translit fold: FC Bayern München === Bayern Munich", normalizeTeamName("FC Bayern München") === normalizeTeamName("Bayern Munich"));
  check("translit fold: Köln → cologne (accent+exonym)", normalizeTeamName("FC Köln") === normalizeTeamName("Cologne"));

  console.log(failed ? failed + " FAILURES" : "composer invariants OK");
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error("ERROR", e); process.exit(1); });
