// check-x-budget.js — v12.33-xpost KV budget governor + dedupe + dry-run
// logic check. Verifies:
//  1) xMonthKey / xDayKey format (yyyymm / yyyymmdd, UTC, zero-padded)
//  2) xBudgetCheck allows under cap, refuses AT cap (monthly + daily independently)
//  3) xBudgetIncr writes the new counter + TTL and returns the new counts
//  4) xDedupeCheck / xDedupeMark — exactly-once per key (TTL written)
//  5) xIsEnabled / xIsDryRun — KV overrides secret; secret is the fallback
//  6) xGetPhase / xHasPhase — default phase B (coronation,ft) when KV empty
//  7) xLeagueTag — Persian hashtag per league code (used by composers)
//  8) composeXResult / composeXCoronation / composeXKickoff / composeXTableForLeague
//     produce ≤280 chars, Persian numerals, #فوتبال + league tag + site URL
//
// Usage: node scripts/check-x-budget.js (extracts functions from src/worker.ts)
// NOTE: no "use strict" — sloppy-mode eval leaks function decls to module scope.
const fs = require("fs");
const src = fs.readFileSync("src/worker.ts", "utf8");

// String-aware brace-balanced slice. The worker's composers use \u{1F451}
// curly-brace unicode escapes inside template literals, so a naive
// brace counter trips on them. This scanner tracks string / template /
// comment context and only counts "real" braces. A state stack is used so
// strings inside ${...} template expressions return to the template-expr
// state (and then to the template-string state) rather than to code state.
function grabFn(sig) {
  const i = src.indexOf(sig);
  if (i < 0) throw new Error("missing " + sig);
  const open = src.indexOf("{", i);
  let depth = 0, j = open;
  // state: 0 = code, 1 = line comment, 2 = block comment, 3 = " ", 4 = ' ',
  // 5 = ` ` (template string), 6 = template-expr (depth tracked separately)
  let state = 0;
  let tplExprDepth = 0;
  // Stack of states to return to when a nested string closes. Pushed when
  // entering a string from inside a template-expr; popped when the string
  // closes. Empty means "return to code state".
  const stack = [];
  while (j < src.length) {
    const ch = src[j];
    const next = src[j + 1] || "";
    if (state === 0) {
      if (ch === "/" && next === "/") { state = 1; j += 2; continue; }
      if (ch === "/" && next === "*") { state = 2; j += 2; continue; }
      if (ch === '"') { stack.push(0); state = 3; j++; continue; }
      if (ch === "'") { stack.push(0); state = 4; j++; continue; }
      if (ch === "`") { stack.push(0); state = 5; j++; continue; }
      if (ch === "{") depth++;
      else if (ch === "}") {
        depth--;
        if (depth === 0) break;
      }
      if (ch === "\\" && next === "u" && src[j + 2] === "{") {
        const end = src.indexOf("}", j + 3);
        if (end > 0) { j = end + 1; continue; }
      }
    } else if (state === 1) {
      if (ch === "\n") state = 0;
    } else if (state === 2) {
      if (ch === "*" && next === "/") { state = 0; j += 2; continue; }
    } else if (state === 3) {
      if (ch === "\\") { j += 2; continue; }
      if (ch === '"') state = stack.pop();
    } else if (state === 4) {
      if (ch === "\\") { j += 2; continue; }
      if (ch === "'") state = stack.pop();
    } else if (state === 5) {
      if (ch === "\\") { j += 2; continue; }
      if (ch === "`") { state = stack.pop(); j++; continue; }
      if (ch === "$" && next === "{") { state = 6; tplExprDepth = 1; j += 2; continue; }
    } else if (state === 6) {
      if (ch === "{") tplExprDepth++;
      else if (ch === "}") { tplExprDepth--; if (tplExprDepth === 0) state = 5; }
      else if (ch === '"') { stack.push(6); state = 3; }
      else if (ch === "'") { stack.push(6); state = 4; }
      else if (ch === "`") { stack.push(6); state = 5; }
      else if (ch === "\\") { j++; }
    }
    j++;
  }
  return src.slice(i, j + 1);
}

let fails = 0;
function chk(cond, msg) { if (!cond) { fails++; console.log("FAIL " + msg); } else console.log("OK   " + msg); }

// ---------- stubs the grabbed functions resolve at call time ----------
const X_CONFIG_LIVE = {
  KV_PHASE: "x_phase_v1",
  KV_BUDGET_PREFIX: "x_budget_v1:",
  KV_DAILY_PREFIX: "x_daily_v1:",
  KV_TEST_PREFIX: "x_test_v1:",
  KV_DEDUPE_PREFIX: "x_post_v1:",
  KV_LAST_POST: "x_last_post_v1",
  KV_LAST_ERROR: "x_last_error_v1",
  KV_PAUSE: "x_pause_v1",
  KV_DRY_RUN: "x_dry_run_v1",
  KV_ENABLED: "x_enabled_v1",
  MONTHLY_CAP: 450,
  DAILY_CAP: 12,
  TEST_DAILY_CAP: 5,
  DEDUPE_TTL_SEC: 7 * 86400,
  DAILY_TTL_SEC: 36 * 3600,
  PAUSE_TTL_SEC: 900,
  RETRY_5XX: 1,
  POST_CHAR_LIMIT: 280,
  DEFAULT_PHASE: "coronation,ft",
  API_BASE: "https://api.x.com",
  TWEET_PATH: "/2/tweets"
};

// KV map + env stub. env.STATE.get returns the stored string; env.STATE.put
// writes it; env.STATE.delete removes it. We also track put-calls to verify
// TTL was passed.
const kvLog = [];
const kv = {
  map: {},
  async get(k) { return k in this.map ? this.map[k] : null; },
  async put(k, v, opts) { this.map[k] = String(v); kvLog.push({ k, v, opts }); },
  async delete(k) { delete this.map[k]; }
};

// X_CONFIG is referenced by the grabbed functions — expose it before eval.
var X_CONFIG = X_CONFIG_LIVE;
var CONFIG = {
  LEAGUES: ["CL", "PL", "PD", "SA", "FL1"],
  BIG_TEAMS_BY_LEAGUE: {
    PL: ["Arsenal FC", "Liverpool FC"],
    PD: ["FC Barcelona", "Real Madrid CF"],
    SA: ["Inter Milan"],
    FL1: ["Paris Saint-Germain"]
  },
  WEEKLY_TABLES: { day: 1, fromMin: 90, toMin: 360 }
};
const translateTeam = (n) => n;
const translateCompetition = (c) => ({ PL: "لیگ برتر انگلیس", PD: "لالیگا", SA: "سری‌آ", FL1: "لیگ یک فرانسه", BL1: "بوندسلیگا", CL: "لیگ قهرمانان اروپا" })[c] || c;
function toFaDigits(str) { return String(str).replace(/[0-9]/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[+d]); }
function getJalaliDate(_utc, _env) { return "یکشنبه ۱ شهریور ۱۴۰۵"; }
function getJalaliTime(_utc, _env) { return "۲۱:۰۰"; }

// ---------- worker-side functions under test ----------
eval([
  grabFn("function xMonthKey()"),
  grabFn("function xDayKey()"),
  grabFn("async function xBudgetCheck(env)"),
  grabFn("async function xBudgetIncr(env)"),
  grabFn("async function xDedupeCheck(env, key)"),
  grabFn("async function xDedupeMark(env, key)"),
  grabFn("async function xIsEnabled(env)"),
  grabFn("async function xIsDryRun(env)"),
  grabFn("async function xGetPhase(env)"),
  grabFn("function xHasPhase(phase, list)"),
  grabFn("function xLeagueTag(code)"),
  grabFn("function xUrl()"),
  grabFn("function xTruncate(s, max)"),
  grabFn("function composeXCoronation(env, code, newLeader, prevRow, trigger)"),
  grabFn("function composeXResult(env, match)"),
  grabFn("function composeXKickoff(env, match)"),
  grabFn("function composeXTableForLeague(env, code, st)")
].join("\n"));

// ---------- A: key formats ----------
const mk = xMonthKey();
const dk = xDayKey();
chk(/^\d{6}$/.test(mk), "xMonthKey is yyyymm (6 digits): " + mk);
chk(/^\d{8}$/.test(dk), "xDayKey is yyyymmdd (8 digits): " + dk);
chk(mk === dk.slice(0, 6), "xMonthKey prefix of xDayKey matches");

// ---------- B: budget governor ----------
(async () => {
  // Fresh: ok
  kv.map = {}; kvLog.length = 0;
  let b = await xBudgetCheck({ STATE: kv });
  chk(b.ok === true && b.monthlyUsed === 0 && b.dailyUsed === 0, "fresh budget: ok=true, 0/0");
  // One incr
  const r1 = await xBudgetIncr({ STATE: kv });
  chk(r1.monthly === 1 && r1.daily === 1, "after 1 incr: monthly=1 daily=1");
  chk(kv.map[X_CONFIG.KV_BUDGET_PREFIX + mk] === "1", "monthly counter written");
  chk(kv.map[X_CONFIG.KV_DAILY_PREFIX + dk] === "1", "daily counter written");
  const monthlyPut = kvLog.find((x) => x.k === X_CONFIG.KV_BUDGET_PREFIX + mk);
  const dailyPut = kvLog.find((x) => x.k === X_CONFIG.KV_DAILY_PREFIX + dk);
  chk(monthlyPut && monthlyPut.opts && monthlyPut.opts.expirationTtl >= 30 * 86400, "monthly TTL ≥ 30d");
  chk(dailyPut && dailyPut.opts && dailyPut.opts.expirationTtl >= 3600, "daily TTL ≥ 1h");
  // Hit monthly cap
  kv.map[X_CONFIG.KV_BUDGET_PREFIX + mk] = String(X_CONFIG.MONTHLY_CAP);
  b = await xBudgetCheck({ STATE: kv });
  chk(b.ok === false && b.reason === "monthly-cap", "at monthly cap: ok=false, reason=monthly-cap");
  // Hit daily cap (monthly below cap)
  kv.map[X_CONFIG.KV_BUDGET_PREFIX + mk] = String(X_CONFIG.MONTHLY_CAP - 1);
  kv.map[X_CONFIG.KV_DAILY_PREFIX + dk] = String(X_CONFIG.DAILY_CAP);
  b = await xBudgetCheck({ STATE: kv });
  chk(b.ok === false && b.reason === "daily-cap", "at daily cap (monthly below): ok=false, reason=daily-cap");
  // One below monthly cap: ok
  kv.map[X_CONFIG.KV_BUDGET_PREFIX + mk] = String(X_CONFIG.MONTHLY_CAP - 1);
  kv.map[X_CONFIG.KV_DAILY_PREFIX + dk] = String(X_CONFIG.DAILY_CAP - 1);
  b = await xBudgetCheck({ STATE: kv });
  chk(b.ok === true, "one below both caps: ok=true");

  // ---------- C: dedupe ----------
  kv.map = {}; kvLog.length = 0;
  let ok = await xDedupeCheck({ STATE: kv }, "coronation:PL");
  chk(ok === true, "fresh dedupe key: check=true");
  await xDedupeMark({ STATE: kv }, "coronation:PL");
  chk(kv.map[X_CONFIG.KV_DEDUPE_PREFIX + "coronation:PL"] != null, "dedupe marker written");
  const dedupePut = kvLog.find((x) => x.k === X_CONFIG.KV_DEDUPE_PREFIX + "coronation:PL");
  chk(dedupePut && dedupePut.opts && dedupePut.opts.expirationTtl === X_CONFIG.DEDUPE_TTL_SEC, "dedupe TTL = 7d");
  ok = await xDedupeCheck({ STATE: kv }, "coronation:PL");
  chk(ok === false, "after mark: check=false (exactly-once)");
  ok = await xDedupeCheck({ STATE: kv }, "coronation:PD");
  chk(ok === true, "different league key: still fresh (independent)");

  // ---------- D: enabled / dry-run override ----------
  kv.map = {};
  let env = { STATE: kv, X_ENABLED: "1", X_DRY_RUN: "0" };
  chk((await xIsEnabled(env)) === true, "X_ENABLED=1 → enabled");
  chk((await xIsDryRun(env)) === false, "X_DRY_RUN=0 → not dry");
  env = { STATE: kv, X_ENABLED: "0", X_DRY_RUN: "1" };
  chk((await xIsEnabled(env)) === false, "X_ENABLED=0 → disabled");
  chk((await xIsDryRun(env)) === true, "X_DRY_RUN=1 → dry");
  env = { STATE: kv, X_ENABLED: "true", X_DRY_RUN: "true" };
  chk((await xIsEnabled(env)) === true, "X_ENABLED=true → enabled (string variant)");
  chk((await xIsDryRun(env)) === true, "X_DRY_RUN=true → dry (string variant)");
  env = { STATE: kv }; // no secrets
  chk((await xIsEnabled(env)) === false, "no secrets, no KV → disabled");
  chk((await xIsDryRun(env)) === false, "no secrets, no KV → not dry");
  // KV overrides secret
  kv.map[X_CONFIG.KV_ENABLED] = "1";
  env = { STATE: kv, X_ENABLED: "0" };
  chk((await xIsEnabled(env)) === true, "KV x_enabled_v1=1 overrides X_ENABLED=0");
  kv.map[X_CONFIG.KV_ENABLED] = "0";
  env = { STATE: kv, X_ENABLED: "1" };
  chk((await xIsEnabled(env)) === false, "KV x_enabled_v1=0 overrides X_ENABLED=1");
  kv.map[X_CONFIG.KV_DRY_RUN] = "1";
  env = { STATE: kv, X_DRY_RUN: "0" };
  chk((await xIsDryRun(env)) === true, "KV x_dry_run_v1=1 overrides X_DRY_RUN=0");
  kv.map[X_CONFIG.KV_DRY_RUN] = "0";
  env = { STATE: kv, X_DRY_RUN: "1" };
  chk((await xIsDryRun(env)) === false, "KV x_dry_run_v1=0 overrides X_DRY_RUN=1");

  // ---------- E: phase config ----------
  kv.map = {};
  env = { STATE: kv };
  let phase = await xGetPhase(env);
  chk(JSON.stringify(phase) === JSON.stringify(["coronation", "ft"]), "default phase = coronation,ft");
  kv.map[X_CONFIG.KV_PHASE] = "coronation,ft,kickoff,tables";
  phase = await xGetPhase(env);
  chk(JSON.stringify(phase) === JSON.stringify(["coronation", "ft", "kickoff", "tables"]), "KV phase parsed");
  kv.map[X_CONFIG.KV_PHASE] = "  coronation , ft ,  tables  ";
  phase = await xGetPhase(env);
  chk(JSON.stringify(phase) === JSON.stringify(["coronation", "ft", "tables"]), "phase trimmed + filtered");
  chk(xHasPhase("coronation", phase) === true, "xHasPhase finds present phase");
  chk(xHasPhase("kickoff", phase) === false, "xHasPhase rejects absent phase");

  // ---------- F: league tags ----------
  chk(xLeagueTag("PL") === "#لیگ_برتر_انگلیس", "PL tag");
  chk(xLeagueTag("PD") === "#لالیگا", "PD tag");
  chk(xLeagueTag("SA") === "#سری_آ", "SA tag");
  chk(xLeagueTag("CL") === "#لیگ_قهرمانان_اروپا", "CL tag");
  chk(xLeagueTag("FL1") === "#لیگ_۱_فرانسه", "FL1 tag");
  chk(xLeagueTag("BL1") === "#بوندسلیگا", "BL1 tag");
  chk(xLeagueTag("ZZ") === "", "unknown code → empty tag");

  // ---------- G: composers — ≤280 chars, Persian numerals, #فوتبال, URL ----------
  const trigger = {
    homeTeam: { name: "Liverpool FC" },
    awayTeam: { name: "Newcastle United FC" },
    competition: { code: "PL" },
    utcDate: "2026-09-21T19:00:00Z",
    score: { fullTime: { home: 2, away: 1 } },
    id: 12345
  };
  const newLeader = { name: "Liverpool FC", pos: 1, points: 12 };
  const prevRow = { name: "Liverpool FC", pos: 2, points: 9 };
  const coro = composeXCoronation({ TEHRAN_TZ: "Asia/Tehran" }, "PL", newLeader, prevRow, trigger);
  chk(coro.length <= 280, "coronation ≤ 280 chars (" + coro.length + ")");
  chk(coro.includes("👑"), "coronation has 👑");
  chk(coro.includes("صدر جدول"), "coronation has 'صدر جدول'");
  chk(coro.includes("۲"), "coronation has Persian digit ۲ (points/prevPos)");
  chk(coro.includes("Liverpool FC"), "coronation keeps team name");
  chk(coro.includes("football.sportsignal.ir"), "coronation has site URL");
  chk(coro.includes("#فوتبال"), "coronation has #فوتبال");
  chk(coro.includes("#لیگ_برتر_انگلیس"), "coronation has league tag");

  const result = composeXResult({ TEHRAN_TZ: "Asia/Tehran" }, trigger);
  chk(result.length <= 280, "result ≤ 280 chars (" + result.length + ")");
  chk(result.includes("نتیجه نهایی"), "result has 'نتیجه نهایی'");
  chk(result.includes("۲-۱"), "result has Persian score ۲-۱");
  chk(result.includes("برنده شد"), "result has winner line");
  chk(result.includes("#فوتبال"), "result has #فوتبال");

  const kickoff = composeXKickoff({ TEHRAN_TZ: "Asia/Tehran" }, trigger);
  chk(kickoff.length <= 280, "kickoff ≤ 280 chars (" + kickoff.length + ")");
  chk(kickoff.includes("بازی بزرگ"), "kickoff has 'بازی بزرگ'");
  chk(kickoff.includes("۲۱:۰۰"), "kickoff has Persian time");
  chk(kickoff.includes("#فوتبال"), "kickoff has #فوتبال");

  const st = { matchday: 4, started: true, teams: [
    { name: "Manchester City FC", pos: 1, points: 9 },
    { name: "Arsenal FC", pos: 2, points: 9 },
    { name: "Liverpool FC", pos: 3, points: 7 }
  ] };
  const table = composeXTableForLeague({ TEHRAN_TZ: "Asia/Tehran" }, "PL", st);
  chk(table.length <= 280, "table ≤ 280 chars (" + table.length + ")");
  chk(table.includes("جدول لیگ برتر انگلیس"), "table has league name");
  chk(table.includes("هفته ۴"), "table has matchday ۴ (Persian)");
  chk(table.includes("۹ امتیاز"), "table has '۹ امتیاز' (Persian)");
  chk(table.includes("#فوتبال"), "table has #فوتبال");

  // Long league: ensure truncate works
  const manyTeams = { matchday: 30, started: true, teams: Array.from({ length: 20 }, (_, i) => ({ name: "Team " + i + " With A Very Long Name FC", pos: i + 1, points: 100 - i * 3 })) };
  const longTable = composeXTableForLeague({ TEHRAN_TZ: "Asia/Tehran" }, "PL", manyTeams);
  chk(longTable.length <= 280, "long table truncated to ≤ 280 (" + longTable.length + ")");
  chk(longTable.endsWith("…") === false || longTable.length === 280, "truncate produces ellipsis only when needed");

  console.log(fails === 0 ? "\n✅ check-x-budget: ALL PASS" : `\n❌ check-x-budget: ${fails} FAILURE(S)`);
  process.exit(fails === 0 ? 0 : 1);
})().catch((e) => { console.error("ERROR", e); process.exit(1); });
