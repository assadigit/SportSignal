// check-weekly-tables.js — v12.9 non-trivial logic check: the end-of-week
// league-tables digest (message building, rank renumbering, CL cap, ⭐ marks,
// ISO-week key, delivery window, once-per-week flag + retry semantics).
// Usage: node scripts/check-weekly-tables.js (extracts functions from src/worker.ts)
// NOTE: no "use strict" — sloppy-mode eval leaks function decls to module scope.
const fs = require("fs");
const src = require("./lib/worker-src")();

function grabFn(sig) {
  // Brace-balanced slice of a function starting at its declaration signature.
  // Works because none of the grabbed functions carry braces inside strings.
  const i = src.indexOf(sig);
  if (i < 0) throw new Error("missing " + sig);
  const open = src.indexOf("{", i);
  let depth = 0, j = open;
  for (; j < src.length; j++) {
    const ch = src[j];
    if (ch === "{") depth++;
    else if (ch === "}") { depth--; if (depth === 0) break; }
  }
  return src.slice(i, j + 1);
}

let fails = 0;
function chk(cond, msg) { if (!cond) { fails++; console.log("FAIL " + msg); } }

// ---------- stubs the grabbed functions resolve at call time ----------
const CONFIG = {
  LEAGUES: ["CL", "PL", "PD", "SA", "FL1"],
  KV_WEEKLY_TABLES: "weekly_tables_v1",
  WEEKLY_TABLES: { day: 1, fromMin: 90, toMin: 360 },
  BIG_TEAMS_BY_LEAGUE: {
    PL: ["Arsenal FC", "Liverpool FC"],
    PD: ["FC Barcelona", "Real Madrid CF"],
    SA: ["Inter Milan"],
    FL1: ["Paris Saint-Germain"]
    // CL deliberately absent — same as the live settings
  }
};
const translateTeam = (n) => n;
const translateCompetition = (c) => ({ PL: "لیگ برتر انگلیس", PD: "لالیگا", SA: "سری‌آ", FL1: "لیگ یک فرانسه", PGL: "لیگ برتر خلیج فارس", CL: "لیگ قهرمانان اروپا", AL: "لیگ استرالیا" })[c] || c;
const normAlias = (n) => String(n).toLowerCase().replace(/[^a-z0-9]/g, "");

// fixed clock + KV + telegram recorder, swapped per scenario
let NOW = new Date("2026-09-14T01:35:00Z"); // Tehran wall-clock on the UTC timeline (getNowTehran convention)
const kv = { map: {}, async get(k) { return k in this.map ? this.map[k] : null; }, async put(k, v) { this.map[k] = String(v); } };
const env = { STATE: kv };
const sentLog = [];
let telegramOK = true;
async function sendTelegram(_env, text, chatId) { if (!telegramOK) return false; sentLog.push({ text, chatId }); return true; }
// bundle-format shims: the deployed worker is a self-contained bundle whose
// grabbed functions resolve (0, import_teams.normalizeTeamName) through this
// scope, and maybeSendWeeklyTables calls sendWeekAhead (not under test here).
const import_teams = { normalizeTeamName: (n) => n };
async function sendWeekAhead(_env, _chatIds) { return { sent: 0, failed: 0, text: null, skipped: true }; }
const standings = {
  PL: { matchday: 4, started: true, teams: [
    { name: "Manchester City FC", pos: 1, points: 9 },
    { name: "Arsenal FC", pos: 2, points: 9 },
    { name: "Hull City AFC", pos: 3, points: 7 },
    { name: "Liverpool FC", pos: 6, points: 5 },
    { name: "Newcastle United FC", pos: 6, points: 5 },
    { name: "Everton FC", pos: 8, points: 5 }
  ] },
  PD: { matchday: 6, started: true, teams: [
    { name: "FC Barcelona", pos: 1, points: 12 },
    { name: "Deportivo Alavés", pos: 2, points: 10 },
    { name: "Real Madrid CF", pos: 3, points: 9 }
  ] },
  SA: { matchday: 4, started: true, teams: [
    { name: "AS Roma", pos: 1, points: 9 },
    { name: "FC Internazionale Milano", pos: 2, points: 9 }
  ] },
  FL1: { matchday: 4, started: true, teams: [
    { name: "AS Monaco FC", pos: 1, points: 9 },
    { name: "Paris Saint-Germain", pos: 13, points: 2 }
  ] },
  PGL: { matchday: null, started: true, teams: [
    { name: "Tractor S.C.", pos: 1, points: 16 },
    { name: "Esteghlal Tehran", pos: 2, points: 15 }
  ] },
  AL: { matchday: null, started: false, teams: [{ name: "Melbourne Victory", pos: 1, points: 0 }] },
  CL: { matchday: 1, started: true, teams: Array.from({ length: 36 }, (_, i) => ({ name: "CL Team " + String.fromCharCode(65 + (i % 26)) + (i >= 26 ? "2" : ""), pos: i + 1, points: i < 12 ? 3 : 0 })) }
};
async function fetchStandings(_env, code) { return standings[code] || null; }
function getNowTehran() { return new Date(NOW.getTime()); }

// ---------- worker-side functions under test ----------
eval([
  grabFn("function toFaDigits(str)"),
  grabFn("function escapeMarkdownCharacters(text)"),
  grabFn("function isoWeekKey(d)"),
  grabFn("function weeklyTableCodes()"),
  grabFn("function buildLeagueTableMessage(code"),
  grabFn("async function sendLeagueTables(env"),
  grabFn("async function maybeSendWeeklyTables(env")
].join("\n"));

// ---------- A: ISO week keys (ground truth: Python datetime.isocalendar) ----------
chk(isoWeekKey(new Date("2026-09-10T12:00:00Z")) === "2026-W37", "isoWeek 2026-09-10 = W37");
chk(isoWeekKey(new Date("2026-09-14T01:00:00Z")) === "2026-W38", "isoWeek 2026-09-14 = W38");
chk(isoWeekKey(new Date("2026-01-01T00:00:00Z")) === "2026-W01", "isoWeek 2026-01-01 = W01");
chk(isoWeekKey(new Date("2027-01-01T00:00:00Z")) === "2026-W53", "isoWeek 2027-01-01 = 2026-W53");
chk(isoWeekKey(new Date("2021-01-01T00:00:00Z")) === "2020-W53", "isoWeek 2021-01-01 = 2020-W53");
chk(isoWeekKey(new Date("2020-12-28T00:00:00Z")) === "2020-W53", "isoWeek 2020-12-28 = 2020-W53");

// ---------- B: selected leagues ----------
chk(JSON.stringify(weeklyTableCodes()) === JSON.stringify(["PL", "PD", "SA", "FL1", "PGL", "CL"]), "codes: settings leagues + PGL, ordered");
CONFIG.LEAGUES = ["CL", "PL", "PD", "SA", "FL1", "BL1"];
chk(JSON.stringify(weeklyTableCodes()) === JSON.stringify(["PL", "PD", "SA", "BL1", "FL1", "PGL", "CL"]), "codes: BL1 joins when selected");
CONFIG.LEAGUES = ["CL", "PL", "PD", "SA", "FL1"];

// ---------- C: message building ----------
const plMsg = buildLeagueTableMessage("PL", standings.PL, { label: "پایان هفته" });
chk(plMsg.startsWith("جدول لیگ برتر انگلیس: — هفته ۴ — پایان هفته"), "PL header: league + matchday + label (v13.21 no 📊 emoji)");
chk(plMsg.includes("*۱\\. Manchester City FC — ۹ امتیاز*"), "leader row bold, Persian digits");
chk(plMsg.includes("۲\\. Arsenal FC ⭐ — ۹ امتیاز"), "selected team starred");
chk(plMsg.includes("۴\\. Liverpool FC ⭐"), "duplicate provider pos 6 renumbered to 4 (starred: selected)");
chk(plMsg.includes("۵\\. Newcastle United FC"), "provider pos 6 #2 renumbered to 5");
chk(plMsg.includes("۶\\. Everton FC — ۵ امتیاز"), "provider pos 8 renumbered to 6 (no gap)");
chk(!/\n۸\\\./.test(plMsg), "no stale rank 8 line");
chk(plMsg.split("\n").filter((l) => /^\*?[۰-۹]+\\\./.test(l)).length === 6, "exactly 6 table rows");
chk(plMsg.includes("football\\.sportsignal\\.ir"), "footer link present");
chk(plMsg.includes("امتیاز"), "points word present");
const pglMsg = buildLeagueTableMessage("PGL", standings.PGL, null);
chk(!pglMsg.includes("هفته"), "PGL: no matchday line when null");
chk(pglMsg.includes("۱\\. Tractor S\\.C\\."), "PGL team dots escaped (MarkdownV2)");
const clMsg = buildLeagueTableMessage("CL", standings.CL, { label: "پایان هفته" });
chk(clMsg.split("\n").filter((l) => /^\*?[۰-۹]+\\\./.test(l)).length === 10, "CL capped to 10 rows");
chk(clMsg.includes("۲۶ تیم بعدی"), "CL continuation note (36-10)");
chk(!clMsg.includes("⭐"), "CL: no stars (no selected CL teams in settings)");

// ---------- D: sendLeagueTables ----------
(async () => {
  sentLog.length = 0;
  const res = await sendLeagueTables(env, [555], { label: "پایان هفته" });
  chk(res.sent === 6 && res.failed === 0, "sendLeagueTables: 6 leagues sent");
  chk(sentLog.length === 6, "6 telegram messages");
  chk(res.leagues.find((l) => l.code === "PL").rows === 6, "PL rows reported");
  chk(res.leagues.find((l) => l.code === "CL").rows === 10, "CL rows reported (capped)");
  chk(sentLog[0].text.includes("لیگ برتر انگلیس") && sentLog[5].text.includes("قهرمانان"), "league order PL→…→CL");
  const empty = await sendLeagueTables(env, [], null);
  chk(empty.error === "no chats" && empty.sent === 0, "no chats guard");

  // ---------- E: weekly window + once-per-week + retry ----------
  kv.map = {};
  sentLog.length = 0;
  NOW = new Date("2026-09-14T01:35:00Z"); // Monday 01:35 Tehran
  let r = await maybeSendWeeklyTables(env, [555]);
  chk(r && r.sent === 6, "Monday 01:35: digest fires");
  chk(kv.map.weekly_tables_v1 === "2026-W38", "week flag set to 2026-W38");
  r = await maybeSendWeeklyTables(env, [555]);
  chk(r === null && sentLog.length === 6, "same week: no double send");
  NOW = new Date("2026-09-14T00:30:00Z");
  kv.map = {};
  r = await maybeSendWeeklyTables(env, [555]);
  chk(r === null && !kv.map.weekly_tables_v1, "Monday 00:30: before window");
  NOW = new Date("2026-09-14T06:05:00Z");
  r = await maybeSendWeeklyTables(env, [555]);
  chk(r === null && !kv.map.weekly_tables_v1, "Monday 06:05: after window");
  NOW = new Date("2026-09-16T01:35:00Z"); // Wednesday
  r = await maybeSendWeeklyTables(env, [555]);
  chk(r === null, "Wednesday: no digest");
  NOW = new Date("2026-09-21T01:35:00Z"); // NEXT Monday
  r = await maybeSendWeeklyTables(env, [555]);
  chk(r && r.sent === 6, "next Monday: fresh digest");
  chk(kv.map.weekly_tables_v1 === "2026-W39", "flag rolls to 2026-W39");
  kv.map = {};
  telegramOK = false;
  NOW = new Date("2026-09-21T01:35:00Z");
  r = await maybeSendWeeklyTables(env, [555]);
  chk(r && r.sent === 0 && r.failed === 6, "all sends fail: reported");
  // v13.37-nospam2: write-first — the marker is set BEFORE the sends. A
  // failed send run no longer retries next tick (the old retry loop
  // re-broadcast up to ~27 copies across the 4.5h window when the marker
  // write itself failed, and partial-failure chats got duplicates). Never-
  // spam outranks never-miss for one-shot digests: an outage week loses its
  // digest instead of risking a duplicate storm.
  chk(kv.map.weekly_tables_v1 === "2026-W39", "write-first: outage run CONSUMES the week slot (anti-spam)");
  telegramOK = true;
  r = await maybeSendWeeklyTables(env, [555]);
  chk(r === null && sentLog.length === 12, "no retry next tick (write-first anti-spam)");
  telegramOK = false;
  const realPL = standings.PL;
  for (const c of Object.keys(standings)) standings[c] = { matchday: 1, started: false, teams: [{ name: "X", pos: 1, points: 0 }] };
  kv.map = {};
  r = await maybeSendWeeklyTables(env, [555]);
  chk(r && r.sent === 0, "all leagues not-started: nothing sent");
  chk(kv.map.weekly_tables_v1 === "2026-W39", "not-started week consumes the slot (write-first)");
  standings.PL = realPL;

  console.log(fails === 0 ? "\n✅ check-weekly-tables: ALL PASS" : `\n❌ check-weekly-tables: ${fails} FAILURE(S)`);
  process.exit(fails === 0 ? 0 : 1);
})().catch((e) => { console.error("ERROR", e); process.exit(1); });
