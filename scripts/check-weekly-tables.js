// check-weekly-tables.js — v12.9 non-trivial logic check: the end-of-week
// league-tables digest (message building, rank renumbering, CL cap, ⭐ marks,
// ISO-week key, delivery window, once-per-week flag + retry semantics).
// v13.124-weeklyfanout: the CHUNKED fan-out — budget reservation per burst,
// the resumable KV cursor (remove-before-send), payload snapshot reuse, the
// quota-death fail-closed pause, and the admin manual enqueue.
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
  KV_WEEKLY_CURSOR: "weekly_tables_cursor_v1",
  KV_WEEKLY_PAYLOAD: "weekly_tables_payload_v1",
  WEEKLY_TABLES: { day: 1, fromMin: 90, toMin: 360 },
  // v13.124-weeklyfanout: the reservation pair (the real one is config.ts;
  // tests flip WEEKLY_FANOUT_CAP to force chunking).
  WEEKLY_FANOUT_CAP: 100,
  WEEKLY_BURST_RESERVE: 15,
  // v13.114-stickers: parseStickerMap's league whitelist (the real one is
  // config.ts STICKER_LEAGUE_CODES — mirror it here).
  STICKER_LEAGUE_CODES: ["PL", "PD", "SA", "BL1", "FL1"],
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
// buildLeagueTableMessage's en path reads COMP_EN (tables.ts) — stub it.
var COMP_EN = { PL: "Premier League", PD: "LaLiga", SA: "Serie A", FL1: "Ligue 1", BL1: "Bundesliga", PGL: "Persian Gulf Pro League", CL: "UEFA Champions League" };

// fixed clock + KV + telegram recorder, swapped per scenario
let NOW = new Date("2026-09-14T01:35:00Z"); // Tehran wall-clock on the UTC timeline (getNowTehran convention)
// v13.124-weeklyfanout: the mock KV is json-aware (the cursor/payload read
// paths use { json }) and carries the quota-death controls (putFails /
// putFailKeys = the error-10048 window caught live 2026-10-19).
const kv = {
  map: {}, putFails: false, putFailKeys: null,
  async get(k, opts) {
    if (!(k in this.map)) return null;
    const v = this.map[k];
    if (opts === "json") { try { return JSON.parse(v); } catch (e) { return null; } }
    return v;
  },
  async put(k, v) {
    if (this.putFails || (this.putFailKeys && this.putFailKeys.has(k))) throw new Error("KV put() limit exceeded for the day.");
    this.map[k] = String(v);
  },
  async delete(k) { delete this.map[k]; }
};
const env = { STATE: kv };
const sentLog = [];
let telegramOK = true;
// v13.114-stickers: getLeagueStickers + sendSticker are free variables of
// the eval'd sendLeagueTables — stubbed like sendTelegram. stickerMap flips
// the available logos, stickerOK flips the send verdict, actionLog records
// the COMBINED order (the sticker-before-table proof).
let stickerMap = {};
let stickerOK = true;
const stickerLog = [];
const actionLog = [];
async function getLeagueStickers(_env) { return stickerMap; }
async function sendSticker(_env, chatId, fileId) { tickFetches++; stickerLog.push({ chatId, fileId }); actionLog.push({ kind: "sticker", chatId, fileId }); return stickerOK; }
async function sendTelegram(_env, text, chatId) { tickFetches++; if (!telegramOK) return false; sentLog.push({ text, chatId }); actionLog.push({ kind: "text", chatId, text }); return true; }
// v13.124-weeklyfanout: the true-subrequest counters the reservation reads.
// tickBase models the tick's pre-digest burn (preflight/lock/user-phase KV
// ops + standings fetches); tickFetches counts this harness's own sends.
let tickBase = 0, tickFetches = 0;
function resetTickBudget(base) { tickBase = base || 0; tickFetches = 0; }
function subrequestCount() { return tickBase + tickFetches; }
function kvOpsCount() { return 0; }
// bundle-format shims: the deployed worker is a self-contained bundle whose
// grabbed functions resolve (0, import_teams.normalizeTeamName) through this
// scope. buildWeekAheadMessage is stubbed (waText flips the week-ahead tail
// of a burst); getUserPrefs stubs the per-chat lang split.
const import_teams = { normalizeTeamName: (n) => n };
let waText = null;
let userPrefsStub = {};
async function buildWeekAheadMessage(_env, _lng) { return waText; }
async function getUserPrefs(_env) { return userPrefsStub; }
async function sendWeekAhead(_env, _chatIds) { return { sent: 0, failed: 0, text: null, skipped: true }; }
let standingsCalls = 0;
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
async function fetchStandings(_env, code) { standingsCalls++; return standings[code] || null; }
function getNowTehran() { return new Date(NOW.getTime()); }

// ---------- worker-side functions under test ----------
eval([
  grabFn("function toFaDigits(str)"),
  grabFn("function escapeMarkdownCharacters(text)"),
  // v13.106-mdstyle: the real entity builders (the table title is BOLD)
  (src.match(/var MDV2_RESERVED = "[^"]*";/) || ["FAIL-MDV2-RESERVED"])[0],
  (src.match(/var MDV2_ESCAPE_SRC = [^\n]*;/) || ["FAIL-MDV2-SRC"])[0],
  (src.match(/var MDV2_ESCAPE_RE = [^\n]*;/) || ["FAIL-MDV2-RE"])[0],
  grabFn("function mdEscape(text)"),
  grabFn("function mdBold(text)"),
  grabFn("function mdItalic(text)"),
  grabFn("function mdCode(text)"),
  grabFn("function isoWeekKey(d)"),
  grabFn("function weeklyTableCodes()"),
  grabFn("function buildLeagueTableMessage(code"),
  grabFn("async function sendLeagueTables(env"),
  // v13.124-weeklyfanout: the chunked digest machinery
  (src.match(/var WEEKLY_PAYLOAD_MEMO = \{ week: null, at: 0, payload: null \};/) || ["FAIL-WEEKLY-MEMO"])[0],
  grabFn("function weeklyBurstCost(group)"),
  grabFn("async function buildWeeklyPayload(env, chatIds)"),
  grabFn("async function serveWeeklyBurst(env, chatId, group)"),
  grabFn("async function continueWeeklyDigest(env, cursor, payload)"),
  grabFn("async function loadWeeklyPayload(env, cursor)"),
  grabFn("async function maybeSendWeeklyTables(env, chatIds)"),
  grabFn("async function startManualWeeklyDigest(env, chatIds)"),
  // v13.114-stickers: the pure KV-shape parser (src/stickers.ts)
  grabFn("function parseStickerMap(raw)")
].join("\n"));

// ---------- A: ISO week keys (ground truth: Python datetime.isocalendar) ----------
chk(isoWeekKey(new Date("2026-09-10T12:00:00Z")) === "2026-W37", "isoWeek 2026-09-10 = W37");
chk(isoWeekKey(new Date("2026-09-14T01:00:00Z")) === "2026-W38", "isoWeek 2026-09-14 = W38");
chk(isoWeekKey(new Date("2026-01-01T00:00:00Z")) === "2026-W01", "isoWeek 2026-01-01 = W01");
chk(isoWeekKey(new Date("2027-01-01T00:00:00Z")) === "2026-W53", "isoWeek 2027-01-01 = W53");
chk(isoWeekKey(new Date("2021-01-01T00:00:00Z")) === "2020-W53", "isoWeek 2021-01-01 = W53");
chk(isoWeekKey(new Date("2020-12-28T00:00:00Z")) === "2020-W53", "isoWeek 2020-12-28 = W53");

// ---------- B: selected leagues ----------
chk(JSON.stringify(weeklyTableCodes()) === JSON.stringify(["PL", "PD", "SA", "FL1", "PGL", "CL"]), "codes: settings leagues + PGL, ordered");
CONFIG.LEAGUES = ["CL", "PL", "PD", "SA", "FL1", "BL1"];
chk(JSON.stringify(weeklyTableCodes()) === JSON.stringify(["PL", "PD", "SA", "BL1", "FL1", "PGL", "CL"]), "codes: BL1 joins when selected");
CONFIG.LEAGUES = ["CL", "PL", "PD", "SA", "FL1"];

// ---------- C: message building ----------
const plMsg = buildLeagueTableMessage("PL", standings.PL, { label: "پایان هفته" });
chk(plMsg.startsWith("*جدول لیگ برتر انگلیس*: — هفته ۴ — پایان هفته"), "PL header: BOLD league title + matchday + label (v13.106 styled)");
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

// ---------- D: sendLeagueTables (the single-chat primitive — /tables) ----------
(async () => {
  // ---------- D0: parseStickerMap (v13.114-stickers) ----------
  chk(JSON.stringify(parseStickerMap(null)) === "{}", "parseStickerMap: null → {}");
  chk(JSON.stringify(parseStickerMap("garbage{")) === "{}", "parseStickerMap: garbage → {}");
  const longId = "FID_" + "x".repeat(30);
  const pm = parseStickerMap(JSON.stringify({ PL: longId, PD: "short", AL: "y".repeat(40), XX: "z".repeat(40) }));
  chk(pm.PL === longId, "parseStickerMap: well-formed PL kept");
  chk(!pm.PD && !pm.AL && !pm.XX, "parseStickerMap: short id + non-league codes (AL!) dropped");

  resetTickBudget(0);
  sentLog.length = 0;
  const res = await sendLeagueTables(env, [555], { label: "پایان هفته" });
  chk(res.sent === 6 && res.failed === 0, "sendLeagueTables: 6 leagues sent");
  chk(sentLog.length === 6, "6 telegram messages");
  chk(res.leagues.find((l) => l.code === "PL").rows === 6, "PL rows reported");
  chk(res.leagues.find((l) => l.code === "CL").rows === 10, "CL rows reported (capped)");
  chk(sentLog[0].text.includes("لیگ برتر انگلیس") && sentLog[5].text.includes("قهرمانان"), "league order PL→…→CL");
  const empty = await sendLeagueTables(env, [], null);
  chk(empty.error === "no chats" && empty.sent === 0, "no chats guard");

  // ---------- D2: v13.114-stickers — [logo sticker][league table] ----------
  sentLog.length = 0; stickerLog.length = 0; actionLog.length = 0;
  stickerMap = { PL: "FID_PL", PD: "FID_PD" };
  stickerOK = true;
  const res2 = await sendLeagueTables(env, [777], { label: "پایان هفته" });
  chk(res2.sent === 6 && res2.failed === 0, "stickers: all 6 tables still sent");
  chk(res2.stickers === 2, "stickers: 2 logos counted (PL, PD)");
  chk(stickerLog.length === 2 && stickerLog[0].fileId === "FID_PL" && stickerLog[1].fileId === "FID_PD", "stickers: PL+PD file_ids in league order");
  chk(stickerLog.every((s) => s.chatId === 777), "stickers: sent to the chat");
  const codeOf = (a) => a.kind === "sticker" ? a.fileId : (a.text.includes("لیگ برتر انگلیس") ? "PL" : a.text.includes("لالیگا") ? "PD" : "other");
  chk(actionLog.slice(0, 4).map((a) => a.kind + ":" + codeOf(a)).join("|") === "sticker:FID_PL|text:PL|sticker:FID_PD|text:PD", "stickers: [PL logo][PL table][PD logo][PD table] — the owner's layout");
  chk(actionLog.filter((a) => a.kind === "sticker").length === 2, "stickers: SA/FL1/PGL/CL have no logo — no extra sends");
  // sticker failure never blocks the table behind it
  stickerOK = false;
  sentLog.length = 0; stickerLog.length = 0; actionLog.length = 0;
  const res3 = await sendLeagueTables(env, [777], null);
  chk(res3.sent === 6 && res3.failed === 0 && !res3.stickers, "stickers: failed logo → uncounted, tables unaffected");
  stickerOK = true;
  // empty map → no sticker field at all
  stickerMap = {};
  sentLog.length = 0;
  const res4 = await sendLeagueTables(env, [777], null);
  chk(res4.sent === 6 && !("stickers" in res4), "stickers: empty map → no sticker field, tables flow");
  stickerMap = {};

  // ---------- E: weekly window + once-per-week + retry (cursor semantics) ----------
  kv.map = {};
  sentLog.length = 0;
  waText = null; userPrefsStub = {};
  CONFIG.WEEKLY_FANOUT_CAP = 100;
  resetTickBudget(0);
  NOW = new Date("2026-09-14T01:35:00Z"); // Monday 01:35 Tehran
  let r = await maybeSendWeeklyTables(env, [555]);
  chk(r && r.sent === 6 && r.served === 1, "Monday 01:35: digest fires (single chat, one burst)");
  chk(kv.map.weekly_tables_v1 === "2026-W38", "week flag set to 2026-W38");
  chk(kv.map.weekly_tables_payload_v1 && kv.map.weekly_tables_payload_v1.includes("جدول"), "payload snapshot persisted at start");
  chk(!kv.map.weekly_tables_cursor_v1, "cursor deleted on completion (all served in one tick)");
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
  resetTickBudget(0);
  r = await maybeSendWeeklyTables(env, [555]);
  chk(r && r.sent === 6, "next Monday: fresh digest");
  chk(kv.map.weekly_tables_v1 === "2026-W39", "flag rolls to 2026-W39");
  kv.map = {};
  telegramOK = false;
  resetTickBudget(0);
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
  resetTickBudget(0);
  r = await maybeSendWeeklyTables(env, [555]);
  chk(r === null && sentLog.length === 12, "no retry next tick (write-first anti-spam)");
  telegramOK = false;
  const realStandings = JSON.parse(JSON.stringify(standings));
  for (const c of Object.keys(standings)) standings[c] = { matchday: 1, started: false, teams: [{ name: "X", pos: 1, points: 0 }] };
  kv.map = {};
  resetTickBudget(0);
  r = await maybeSendWeeklyTables(env, [555]);
  chk(r && r.sent === 0, "all leagues not-started: nothing sent");
  chk(kv.map.weekly_tables_v1 === "2026-W39", "not-started week consumes the slot (write-first)");
  for (const c of Object.keys(realStandings)) standings[c] = realStandings[c];
  telegramOK = true;

  // ---------- F: v13.124-weeklyfanout — the chunked fan-out ----------
  stickerMap = {}; waText = "WEEK AHEAD"; telegramOK = true;
  kv.map = {}; sentLog.length = 0; actionLog.length = 0;

  // F1: budget reservation chunks a 3-chat roster across ticks (cap 20,
  // tick base 5 → one burst/tick: 5+9=14 fits, 12+9=21 defers).
  CONFIG.WEEKLY_FANOUT_CAP = 20;
  const chats3 = [111, 222, 333];
  NOW = new Date("2026-10-19T01:35:00Z"); // Monday W43
  resetTickBudget(5);
  let f1 = await maybeSendWeeklyTables(env, chats3);
  chk(f1 && f1.served === 1 && f1.pending === 2 && f1.deferred === 2, "F1 tick1: ONE burst served, two deferred (reservation)");
  chk(sentLog.filter((s) => s.chatId === 111).length === 7, "F1 tick1: chat 111 got 6 tables + week-ahead");
  chk(f1.sent === 7 && f1.leagues.filter((l) => l.ok).length === 6, "F1 tick1: counters + league meta reported");
  let cur = kv.get ? null : null;
  cur = JSON.parse(kv.map.weekly_tables_cursor_v1);
  chk(cur.week === "2026-W43" && JSON.stringify(cur.pending.fa) === JSON.stringify([222, 333]), "F1: cursor persisted with the 2 pending chats");
  chk(kv.map.weekly_tables_v1 === "2026-W43", "F1: marker consumed the week at start (write-first)");
  resetTickBudget(5);
  NOW = new Date("2026-10-19T01:45:00Z");
  let f2 = await maybeSendWeeklyTables(env, chats3);
  chk(f2 && f2.served === 1 && f2.pending === 1, "F1 tick2: chat 222 served from the cursor");
  chk(f2.leagues.length === 6, "F1 tick2: league meta still reported from the payload");
  resetTickBudget(5);
  NOW = new Date("2026-10-19T01:55:00Z");
  let f3 = await maybeSendWeeklyTables(env, chats3);
  chk(f3 && f3.served === 1 && f3.pending === 0, "F1 tick3: chat 333 served, digest complete");
  chk(!kv.map.weekly_tables_cursor_v1, "F1: cursor deleted on completion");
  chk(sentLog.filter((s) => s.chatId === 111).length === 7 && sentLog.filter((s) => s.chatId === 222).length === 7 && sentLog.filter((s) => s.chatId === 333).length === 7, "F1: every chat got the FULL burst exactly once");
  resetTickBudget(5);
  let f4 = await maybeSendWeeklyTables(env, chats3);
  chk(f4 === null, "F1: nothing more after completion");
  // per-chat order: 6 tables then the week-ahead tail
  const chat111 = actionLog.filter((a) => a.chatId === 111);
  chk(chat111[chat111.length - 1].text === "WEEK AHEAD", "F1: week-ahead rides the burst tail");

  // F2: stickers ride the chunked burst in the owner's [logo][table] order
  kv.map = {}; sentLog.length = 0; stickerLog.length = 0; actionLog.length = 0;
  stickerMap = { PL: "FID_PL" };
  CONFIG.WEEKLY_FANOUT_CAP = 100;
  NOW = new Date("2026-10-19T01:35:00Z");
  resetTickBudget(0);
  let f5 = await maybeSendWeeklyTables(env, [444]);
  chk(f5.served === 1 && f5.sent === 7 && f5.stickers === 1, "F2: burst counts stickers (6 tables + week-ahead + 1 logo)");
  chk(stickerLog.length === 1 && stickerLog[0].chatId === 444 && stickerLog[0].fileId === "FID_PL", "F2: the PL logo went to the chat");
  const f2seq = actionLog.slice(0, 2).map((a) => a.kind).join("|");
  chk(f2seq === "sticker|text", "F2: [logo sticker][league table] order preserved in the burst");
  stickerMap = {};

  // F3: quota-death (KV put fails) — no burst without a persisted removal,
  // cursor untouched, self-heals next tick. The 2026-10-19 incident shape.
  kv.map = {}; sentLog.length = 0;
  waText = "WEEK AHEAD";
  CONFIG.WEEKLY_FANOUT_CAP = 20;
  NOW = new Date("2026-10-19T01:35:00Z");
  resetTickBudget(5);
  await maybeSendWeeklyTables(env, chats3); // tick1: chat 111 served, 222/333 deferred
  kv.putFails = true; // the error-10048 window
  resetTickBudget(5);
  NOW = new Date("2026-10-19T01:45:00Z");
  let f6 = await maybeSendWeeklyTables(env, chats3);
  chk(f6 && f6.served === 0 && f6.pending === 2, "F3 quota-death: zero bursts (fail-closed)");
  cur = JSON.parse(kv.map.weekly_tables_cursor_v1);
  chk(JSON.stringify(cur.pending.fa) === JSON.stringify([222, 333]), "F3: cursor untouched (restore-on-put-failure)");
  chk(sentLog.filter((s) => s.chatId === 222).length === 0, "F3: no sends during the outage");
  kv.putFails = false;
  resetTickBudget(5);
  NOW = new Date("2026-10-19T01:55:00Z");
  let f7 = await maybeSendWeeklyTables(env, chats3);
  chk(f7 && f7.served === 1 && f7.pending === 1, "F3 quota-recovered: chat 222 drains (333 still over budget)");
  resetTickBudget(5);
  let f7b = await maybeSendWeeklyTables(env, chats3);
  chk(f7b && f7b.served === 1 && f7b.pending === 0, "F3: chat 333 drains on the next tick");
  chk(!kv.map.weekly_tables_cursor_v1, "F3: cursor deleted after the recovery drain");
  chk(sentLog.filter((s) => s.chatId === 222).length === 7 && sentLog.filter((s) => s.chatId === 333).length === 7, "F3: both tail chats fully served post-recovery");

  // F4: bootstrap write failures — (a) the MARKER-only failure: payload +
  // cursor persisted, nothing sent this tick; the live cursor delivers on
  // the next tick (the digest is in-flight state — no spam: each chat is
  // remove-before-send). (b) a FULL write outage: nothing persisted, the
  // start retries cleanly next tick.
  kv.map = {}; sentLog.length = 0;
  CONFIG.WEEKLY_FANOUT_CAP = 100;
  kv.putFailKeys = new Set(["weekly_tables_v1"]);
  NOW = new Date("2026-10-19T01:35:00Z");
  resetTickBudget(0);
  let f8 = await maybeSendWeeklyTables(env, [555]);
  chk(f8 === null && sentLog.length === 0, "F4: un-persistable marker → no sends this tick (fail-closed)");
  chk(!!kv.map.weekly_tables_cursor_v1, "F4: payload+cursor persisted (the marker-only failure leaves the digest in-flight)");
  chk(!kv.map.weekly_tables_v1, "F4: the week marker itself is NOT set");
  kv.putFailKeys = null;
  resetTickBudget(0);
  let f9 = await maybeSendWeeklyTables(env, [555]);
  chk(f9 && f9.served === 1 && f9.pending === 0, "F4: the in-flight cursor delivers next tick");
  chk(!kv.map.weekly_tables_cursor_v1, "F4: cursor completed and deleted");
  // (b) full outage — nothing at all persists
  kv.map = {}; sentLog.length = 0;
  kv.putFails = true;
  NOW = new Date("2026-10-19T01:35:00Z");
  resetTickBudget(0);
  let f9b = await maybeSendWeeklyTables(env, [555]);
  chk(f9b === null && sentLog.length === 0 && !kv.map.weekly_tables_cursor_v1 && !kv.map.weekly_tables_v1, "F4b: full write outage → nothing persisted, nothing sent");
  kv.putFails = false;
  resetTickBudget(0);
  let f9c = await maybeSendWeeklyTables(env, [555]);
  chk(f9c && f9c.served === 1, "F4b: next tick retries the start cleanly");

  // F5: stale cursor (>12h) is dropped, never resumed
  kv.map = {};
  kv.map.weekly_tables_cursor_v1 = JSON.stringify({ week: "2026-W43", ts: Date.now() - 13 * 36e5, pending: { fa: [555], en: [] } });
  kv.map.weekly_tables_payload_v1 = "x";
  NOW = new Date("2026-10-20T01:35:00Z"); // Tuesday
  resetTickBudget(0);
  let f10 = await maybeSendWeeklyTables(env, [555]);
  chk(f10 === null && !kv.map.weekly_tables_cursor_v1, "F5: stale cursor deleted, Tuesday starts nothing");

  // F6: a fresh cursor drains even OUTSIDE the window (completion > window)
  kv.map = {};
  kv.map.weekly_tables_cursor_v1 = JSON.stringify({ week: "2026-W43", ts: Date.now(), pending: { fa: [555], en: [] } });
  NOW = new Date("2026-10-19T07:05:00Z"); // Monday 07:05 Tehran — past 06:00
  resetTickBudget(0);
  let f11 = await maybeSendWeeklyTables(env, [555]);
  chk(f11 && f11.served === 1 && f11.pending === 0, "F6: fresh cursor completes past the window edge");
  chk(!kv.map.weekly_tables_cursor_v1, "F6: cursor deleted");

  // F7: the admin manual enqueue — window + marker ignored, cursor seeded
  // for EVERY chat, synchronous bursts under this invocation's budget.
  kv.map = {}; sentLog.length = 0;
  waText = null;
  CONFIG.WEEKLY_FANOUT_CAP = 44;
  NOW = new Date("2026-10-21T12:00:00Z"); // Wednesday
  resetTickBudget(0);
  let f12 = await startManualWeeklyDigest(env, chats3);
  chk(f12.queued === 3 && f12.served === 3 && f12.pending === 0, "F7: manual send queues + serves all 3 synchronously (fresh budget)");
  chk(!kv.map.weekly_tables_cursor_v1, "F7: cursor completed and deleted");
  chk(sentLog.filter((s) => s.chatId === 111).length === 6 && sentLog.filter((s) => s.chatId === 333).length === 6, "F7: every chat got the tables");
  chk(!kv.map.weekly_tables_v1 || kv.map.weekly_tables_v1 === "2026-W43", "F7: manual path does not disturb the auto marker");
  // manual under a tight budget defers the tail to the cron ticks
  kv.map = {}; sentLog.length = 0;
  waText = "WEEK AHEAD";
  CONFIG.WEEKLY_FANOUT_CAP = 20;
  resetTickBudget(5);
  let f13 = await startManualWeeklyDigest(env, chats3);
  chk(f13.queued === 3 && f13.served === 1 && f13.pending === 2, "F7b: tight budget → 1 served now, 2 queued for the cron");
  cur = JSON.parse(kv.map.weekly_tables_cursor_v1);
  chk(JSON.stringify(cur.pending.fa) === JSON.stringify([222, 333]), "F7b: cursor holds the tail chats");
  // and the CRON continuation (marker already consumed? irrelevant) drains it
  NOW = new Date("2026-10-21T12:10:00Z"); // still Wednesday — continuation runs on any tick
  resetTickBudget(5);
  let f14 = await maybeSendWeeklyTables(env, chats3);
  chk(f14 && f14.served === 1 && f14.pending === 1, "F7b: cron continuation drains the manual cursor (window ignored)");
  resetTickBudget(5);
  let f15 = await maybeSendWeeklyTables(env, chats3);
  chk(f15 && f15.served === 1 && f15.pending === 0 && !kv.map.weekly_tables_cursor_v1, "F7b: manual cursor fully drained by the cron");

  // F8: lang split — the en group renders English tables + its own week-ahead
  kv.map = {}; sentLog.length = 0;
  waText = "WEEK AHEAD EN/FA";
  CONFIG.WEEKLY_FANOUT_CAP = 100;
  userPrefsStub = { 222: { lang: "en" } };
  NOW = new Date("2026-10-19T01:35:00Z");
  resetTickBudget(0);
  let f16 = await maybeSendWeeklyTables(env, chats3);
  chk(f16 && f16.served === 3, "F8: all three chats served");
  const enTexts = sentLog.filter((s) => s.chatId === 222).map((s) => s.text);
  chk(enTexts.some((t) => t.includes("Premier League")), "F8: chat 222 (lang=en) got ENGLISH tables");
  chk(sentLog.filter((s) => s.chatId === 111).every((s) => s.text.includes("جدول") || s.text === "WEEK AHEAD EN/FA"), "F8: chats 111/333 got Persian tables");
  cur = undefined;
  userPrefsStub = {};

  // F9: payload rebuild on KV miss (the memo is fresh → same-isolate reuse;
  // a cleared memo + missing key → live rebuild refetches standings once)
  kv.map = {};
  waText = "WEEK AHEAD";
  CONFIG.WEEKLY_FANOUT_CAP = 20;
  NOW = new Date("2026-10-19T01:35:00Z");
  resetTickBudget(5);
  await maybeSendWeeklyTables(env, chats3); // tick1: 111 served, 222/333 deferred
  const callsAfterStart = standingsCalls;
  delete kv.map.weekly_tables_payload_v1; // TTL lapse / the write failed
  // memo fresh → the continuation reuses it without refetching
  resetTickBudget(5);
  NOW = new Date("2026-10-19T01:45:00Z");
  await maybeSendWeeklyTables(env, chats3);
  chk(standingsCalls === callsAfterStart, "F9: fresh memo serves the continuation with ZERO standings refetches");
  // memo stale → one live rebuild for the remaining chats, then cached again
  WEEKLY_PAYLOAD_MEMO = { week: null, at: 0, payload: null };
  delete kv.map.weekly_tables_payload_v1;
  resetTickBudget(5);
  NOW = new Date("2026-10-19T01:55:00Z");
  let f17 = await maybeSendWeeklyTables(env, chats3);
  chk(f17 && f17.served === 1 && f17.pending === 0, "F9: rebuild path finishes the digest");
  chk(standingsCalls > callsAfterStart, "F9: the rebuild refetched the standings (once)");
  chk(kv.map.weekly_tables_payload_v1 && kv.map.weekly_tables_payload_v1.includes("جدول"), "F9: rebuilt payload re-persisted");

  // F10: an empty roster never starts anything
  kv.map = {};
  NOW = new Date("2026-10-19T01:35:00Z");
  resetTickBudget(0);
  let f18 = await maybeSendWeeklyTables(env, []);
  chk(f18 === null && !kv.map.weekly_tables_v1, "F10: empty roster → no digest, no marker");

  console.log(fails === 0 ? "\n✅ check-weekly-tables: ALL PASS" : `\n❌ check-weekly-tables: ${fails} FAILURE(S)`);
  process.exit(fails === 0 ? 0 : 1);
})().catch((e) => { console.error("ERROR", e); process.exit(1); });
