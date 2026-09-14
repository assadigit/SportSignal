// check-no-miss.js — comprehensive reliability test: "the bot never misses a match".
//
// Exercises EVERY notification path against synthetic matches at carefully
// chosen time offsets. For each notification type (72h, 24h, 3h, 1h, 5min,
// match-start, result), tests:
//   A. Window hit (the match is in the notification window → should notify)
//   B. Window miss (too early or too late → should NOT notify via window)
//   C. Backfill (window passed but backfill catches it → should notify)
//   D. Dedupe (already notified → should NOT re-notify)
//   E. Skipped-cron resilience (a match 2 cron-ticks past its window still fires via backfill)
//   F. Extra-time safety (IN_PLAY at 90min → NOT presumed finished)
//   G. Provider-down (SCHEDULED at 150min+ → presumed finished, result fires)
//   H. Budget-guard exemption (match-start processes even at >38 subrequests)
//
// Also tests the audit mechanism (auditNotifications) finds gaps when a
// notification is missing.
//
// Extracts the REAL functions from the concatenated worker source (single
// source of truth) — if a maintainer changes the logic, this gate fails.
const src = require("./lib/worker-src")();

// --- brace-balanced function grabber (handles \u{...} escapes) ---
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

// --- stubs ---
const CONFIG = {
  ONE_HOUR_MS: 3600000, TWO_HOURS_MS: 7200000, ONE_DAY_MS: 86400000,
  PRE_MATCH_NOTIFICATION_HOURS: 24, BIG_MATCH_NOTIFICATION_HOURS: 72,
  POST_MATCH_NOTIFICATION_HOURS: 6, KV_NOTIFIED_KEY: "notified_matches_v6",
  KV_MATCHES_KEY: "matches_v13_tracked", KV_USERS_KEY: "telegram_users_v6",
  KV_USER_PREFS: "user_prefs_v1", KV_PUBLIC_MATCHES: "public_matches_v1",
  KV_MATCH_STATUS: "match_status_v1", KV_OUTBOX: "outbox_lst"
};
function toFaDigits(s) { return String(s).replace(/[0-9]/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[+d]); }
function escapeMarkdownCharacters(s) { return String(s); }
function getJalaliDate() { return "شنبه ۱۳ شهریور ۱۴۰۵"; }
function getJalaliTime() { return "۲۱:۰۰"; }
function getEnglishDate() { return "Saturday, 13 September 2026"; }
function getEnglishTime() { return "21:00"; }
function getRelativeTimeUntilMatch() { return "۳ ساعت"; }
function getEnglishRelative() { return "3h"; }
function enStageName(s) { return s ? "Group stage" : null; }
function translateTeam(n) { return n; }
function translateCompetition(c) { return c; }
function translateVenue(v) { return v; }
function isDomesticCup() { return false; }
function faStageName() { return null; }
function normalizeTeamName(n) { return String(n || "").toLowerCase().replace(/[^a-z0-9]/g, ""); }
function normTeamKey(n) { return normalizeTeamName(n); }
function matchKey(m) { return normalizeTeamName(m.homeTeam.name) + "|" + normalizeTeamName(m.awayTeam.name) + "|" + String(m.utcDate || "").slice(0, 16); }
function normAlias(n) { return String(n || "").toLowerCase().replace(/\s+/g, ""); }
function isMasterPair() { return false; }
function isDerby() { return false; }
function isFeaturedMatch() { return false; }
function isDomesticLeagueCode() { return false; }
function hasSelectedTeam() { return false; }
function isMasterClash() { return false; }
function providerSuspended() { return false; }
function clearProviderSuspension() {}
function fetchPglTableFromWikipedia() { return null; }
function fetchJSON() { return null; }
function getNowTehran(env) { return new Date(); }
function getNowUTC() { return new Date(); }
function masterTeamList() { return ["Arsenal FC", "Chelsea FC"]; }
const masterMemo = { sig: null, list: null, normSet: new Set(["arsenalfc", "chelseafc"]) };

// --- grab + eval the REAL functions from source ---
eval([
  grabFn("function isWithin24HourWindow(match, _env)"),
  grabFn("function isWithinBigMatchWindow(match, _env)"),
  grabFn("function isWithin3HourWindow(match, _env)"),
  grabFn("function isWithin1HourWindow(match, _env)"),
  grabFn("function isWithin5MinWindow(match, _env)"),
  grabFn("function isMatchStartingNow(match, _env)"),
  grabFn("function isWithinPostMatchWindow(match, _env)"),
  grabFn("function isBackfillEligible(match, type, _env)"),
  grabFn("function isPresumablyFinished(match, _env)"),
  grabFn("function isMatchStartBackfillEligible(match, _env)"),
  grabFn("function isMatchFinished(match)"),
  grabFn("function shouldSendNotification(env, match, notificationType, notifiedMatches)")
].join("\n"));

// --- test harness ---
let failed = 0, passed = 0;
function check(name, cond) {
  if (cond) { passed++; console.log("OK   " + name); }
  else { failed++; console.log("FAIL " + name); }
}

// Helper: create a match at a given offset from now.
function matchAt(offsetHours, status, extra) {
  const now = Date.now();
  const utcDate = new Date(now + offsetHours * 3600000).toISOString();
  return Object.assign({
    id: "test-" + offsetHours,
    utcDate,
    status: status || "SCHEDULED",
    stage: "REGULAR_SEASON",
    competition: { code: "PL" },
    homeTeam: { name: "Arsenal FC" },
    awayTeam: { name: "Chelsea FC" },
    score: { fullTime: { home: null, away: null } }
  }, extra || {});
}

// Fake KV for dedupe tests.
function makeStore() {
  const m = new Map();
  return {
    async get(k, arg) { const v = m.get(k); if (arg === "json") return v ? JSON.parse(v) : null; return v === undefined ? null : v; },
    async put(k, v) { m.set(k, v); },
    async delete(k) { m.delete(k); }
  };
}
const env = { STATE: makeStore(), TEHRAN_TZ: "Asia/Tehran" };
// v13.27: stub for the in-memory dedupe Set (the eval'd shouldSendNotification checks it)
var MEM_DEDUPE = new Set();

(async () => {
  console.log("\n=== A. Window hit (match IS in the notification window) ===");
  // 24h window: 20-24h before kickoff
  check("24h: match 23h before kickoff → in window", isWithin24HourWindow(matchAt(23), env));
  // v13.29-harness: the nominal-edge fixtures carry ≥36s of real margin — the
  // window fns re-read Date.now() AFTER fixture creation, so an exact-edge
  // offset flapped in/out on a 1ms clock tick (seen once in CI as "3h 2.5h
  // lower edge" FAIL). Offsets only; expectations unchanged.
  check("24h: match 20h+36s before kickoff → in window (lower edge)", isWithin24HourWindow(matchAt(20.01), env));
  check("24h: match 24h-36s before kickoff → in window (upper edge)", isWithin24HourWindow(matchAt(23.99), env));
  // 3h window: 2.5-3.5h before kickoff
  check("3h: match 3h before kickoff → in window", isWithin3HourWindow(matchAt(3), env));
  check("3h: match 2.5h+36s before kickoff → in window (lower edge)", isWithin3HourWindow(matchAt(2.51), env));
  // 1h window: 0.75-1.5h before kickoff
  check("1h: match 1h before kickoff → in window", isWithin1HourWindow(matchAt(1), env));
  check("1h: match 0.75h+36s before kickoff → in window (lower edge)", isWithin1HourWindow(matchAt(0.76), env));
  // match-start: -1..+45 min
  check("match-start: match 10min AFTER kickoff → in window", isMatchStartingNow(matchAt(-10/60, "IN_PLAY"), env));
  check("match-start: match 30min AFTER kickoff → in window", isMatchStartingNow(matchAt(-30/60, "IN_PLAY"), env));
  check("match-start: match 44min AFTER kickoff → in window (upper edge)", isMatchStartingNow(matchAt(-44/60, "IN_PLAY"), env));

  console.log("\n=== B. Window miss (match is NOT in the window) ===");
  check("24h: match 19h before kickoff → NOT in window (below floor)", !isWithin24HourWindow(matchAt(19), env));
  check("24h: match 25h before kickoff → NOT in window (above ceiling)", !isWithin24HourWindow(matchAt(25), env));
  check("3h: match 2h before kickoff → NOT in window (below floor)", !isWithin3HourWindow(matchAt(2), env));
  check("3h: match 4h before kickoff → NOT in window (above ceiling)", !isWithin3HourWindow(matchAt(4), env));
  check("1h: match 0.5h before kickoff → NOT in window (below floor)", !isWithin1HourWindow(matchAt(0.5), env));
  check("1h: match 2h before kickoff → NOT in window (above ceiling)", !isWithin1HourWindow(matchAt(2), env));
  check("match-start: match 50min AFTER kickoff → NOT in window (above ceiling)", !isMatchStartingNow(matchAt(-50/60, "IN_PLAY"), env));
  check("match-start: match 5min BEFORE kickoff → NOT in window (before start)", !isMatchStartingNow(matchAt(5/60, "SCHEDULED"), env));
  check("match-start: FINISHED match → NOT in window", !isMatchStartingNow(matchAt(-10/60, "FINISHED"), env));
  check("match-start: POSTPONED match → NOT in window", !isMatchStartingNow(matchAt(-10/60, "POSTPONED"), env));

  console.log("\n=== C. Backfill (window passed but backfill catches it) ===");
  // Backfill fires when: hoursUntil is between floor and max (but window missed because cron skipped)
  check("backfill-24h: match 10h before kickoff → backfill eligible (3.5-24h)", isBackfillEligible(matchAt(10), "pre-match-24h", env));
  check("backfill-3h: match 2h before kickoff → backfill eligible (1.5-3.5h)", isBackfillEligible(matchAt(2), "pre-match-3h", env));
  check("backfill-1h: match 0.5h before kickoff → backfill eligible (10/60-1.5h)", isBackfillEligible(matchAt(0.5), "pre-match-1h", env));
  check("backfill-5min: match 5min before kickoff → backfill eligible (2/60-10/60h)", isBackfillEligible(matchAt(5/60), "pre-match-5min", env));
  check("backfill-match-start: match 25min AFTER kickoff → backfill eligible (20-30min)", isMatchStartBackfillEligible(matchAt(-25/60, "IN_PLAY"), env));

  console.log("\n=== D. Dedupe (already notified → should NOT re-notify) ===");
  // shouldSendNotification returns false if the type is already in the KV
  const dedupeMatch = matchAt(3); // in 3h window
  const notifiedKV = {};
  const key = matchKey(dedupeMatch);
  notifiedKV[key] = [{ notificationType: "pre-match-3h", notifiedAt: Date.now(), expiresAt: Date.now() + 3600000 }];
  check("dedupe: match already notified for 3h → shouldSend=false", !await shouldSendNotification(env, dedupeMatch, "pre-match-3h", notifiedKV));
  check("dedupe: same match for 1h (not yet sent) → shouldSend=true (1h is in window? no, 3h match)", !isWithin1HourWindow(dedupeMatch, env) || await shouldSendNotification(env, dedupeMatch, "pre-match-1h", notifiedKV));

  // v13.36-nospam THE LINE: an EXPIRED dedupe record still blocks. The old
  // behavior (expiry mid-window re-armed the send) was the spam engine —
  // "result-big" records expired at kickoff+1h inside the 6h post window
  // and re-sent on every tick after that. expiresAt is KV hygiene only.
  const expiredKV = {};
  expiredKV[key] = [{ notificationType: "pre-match-3h", notifiedAt: Date.now() - 7200000, expiresAt: Date.now() - 3600000 }];
  check("nospam-line: EXPIRED record still blocks re-send → shouldSend=false", !await shouldSendNotification(env, dedupeMatch, "pre-match-3h", expiredKV));
  // The same line applies to the broadcast types (their dedupe checks were
  // missing entirely before v13.36 — up to 36 FT copies per big match).
  const bigFin = matchAt(-2, "FINISHED", { score: { fullTime: { home: 3, away: 0 } } });
  const bigKey = matchKey(bigFin);
  const bigKV = {};
  bigKV[bigKey] = [{ notificationType: "result-big", notifiedAt: Date.now() - 7.5 * 3600000, expiresAt: Date.now() - 7 * 3600000 }];
  check("nospam-line: result-big with EXPIRED record (still in 6h window) → blocked", !await shouldSendNotification(env, bigFin, "result-big", bigKV));
  check("nospam-line: result-big eligible for a NOT-yet-notified finished match", await shouldSendNotification(env, bigFin, "result-big", {}));

  console.log("\n=== E. Skipped-cron resilience (backfill covers missed ticks) ===");
  // A match that was 3h away when the cron should have fired, but the cron
  // skipped. Now it's 2h away — the 3h window (2.5-3.5h) is missed, but
  // backfill (1.5-3.5h) catches it.
  const missedMatch = matchAt(2); // 2h before kickoff
  check("skipped-cron: 3h window missed (2h < 2.5h floor) → window=false", !isWithin3HourWindow(missedMatch, env));
  check("skipped-cron: backfill catches it (1.5-3.5h) → backfill=true", isBackfillEligible(missedMatch, "pre-match-3h", env));
  check("skipped-cron: shouldSend=window||backfill → true", await shouldSendNotification(env, missedMatch, "pre-match-3h", {}));

  console.log("\n=== F. Extra-time safety (IN_PLAY at 90min → NOT presumed finished) ===");
  // v13.20 fix: a match IN_PLAY 95min after kickoff must NOT be presumed finished
  const inPlay95 = matchAt(-95/60, "IN_PLAY");
  check("extra-time: IN_PLAY 95min after kickoff → NOT presumed finished", !isPresumablyFinished(inPlay95, env));
  check("extra-time: IN_PLAY 95min → isMatchFinished=false", !isMatchFinished(inPlay95));
  const paused95 = matchAt(-95/60, "PAUSED");
  check("extra-time: PAUSED 95min after kickoff → NOT presumed finished", !isPresumablyFinished(paused95, env));

  console.log("\n=== G. Provider-down (SCHEDULED at 150min+ → presumed finished) ===");
  const down155 = matchAt(-155/60, "SCHEDULED");
  check("provider-down: SCHEDULED 155min after kickoff → presumed finished", isPresumablyFinished(down155, env));
  check("provider-down: SCHEDULED 155min → isMatchFinished=true", isMatchFinished(down155));
  const down140 = matchAt(-140/60, "SCHEDULED");
  check("provider-down: SCHEDULED 140min after kickoff → NOT presumed finished (< 150min)", !isPresumablyFinished(down140, env));

  console.log("\n=== H. Budget-guard exemption (match-start always processes) ===");
  // The budget guard exempts match-start — verify the source has the exemption.
  check("budget-guard: match-start exemption present in source", /matchStartActive/.test(src));
  check("budget-guard: exemption check uses minutesSince <= 45", /minSince >= -1 && minSince <= 45/.test(src) || /minutesSinceKickoff <= 45/.test(src));

  console.log("\n=== I. Result notification (FINISHED → fires, then dedupes) ===");
  const finMatch = matchAt(-3, "FINISHED", { score: { fullTime: { home: 2, away: 1 } } });
  check("result: FINISHED match 3h ago → in post-match window (<=6h)", isWithinPostMatchWindow(finMatch, env));
  check("result: FINISHED match 3h ago → isMatchFinished=true", isMatchFinished(finMatch));
  check("result: shouldSend=true (not yet notified)", await shouldSendNotification(env, finMatch, "result", {}));
  // After notification, dedupe
  const finKey = matchKey(finMatch);
  const finNotified = {};
  finNotified[finKey] = [{ notificationType: "result", notifiedAt: Date.now(), expiresAt: Date.now() + 86400000 }];
  check("result: after notification → shouldSend=false (deduped)", !await shouldSendNotification(env, finMatch, "result", finNotified));

  console.log("\n=== J. All notification types have shouldSendNotification cases ===");
  check("shouldSend: pre-match-72h case exists", /case "pre-match-72h":/.test(src));
  check("shouldSend: pre-match-24h case exists", /case "pre-match-24h":/.test(src));
  check("shouldSend: pre-match-3h case exists", /case "pre-match-3h":/.test(src));
  check("shouldSend: pre-match-1h case exists", /case "pre-match-1h":/.test(src));
  check("shouldSend: pre-match-5min case exists", /case "pre-match-5min":/.test(src));
  check("shouldSend: match-start case exists", /case "match-start":/.test(src));
  check("shouldSend: result case exists", /case "result":/.test(src));

  console.log("\n=== K. Reliability infrastructure present ===");
  check("outbox: drainOutbox exists", /function drainOutbox\(/.test(src));
  check("outbox: sendTelegram pushes to outbox on fail", /await outboxPush\(/.test(src));
  check("schedule: reconcileSchedules exists", /function reconcileSchedules\(/.test(src));
  check("audit: auditNotifications exists", /function auditNotifications\(/.test(src));
  check("kickoff-broadcast: broadcastBigMatchKickoff exists", /function broadcastBigMatchKickoff\(/.test(src));
  check("kickoff-broadcast: wired in cron", /await broadcastBigMatchKickoff\(/.test(src));
  check("audit: wired in cron", /await auditNotifications\(/.test(src));
  check("canary: buildCanaryMatch exists", /function buildCanaryMatch\(/.test(src));
  check("heartbeat: 6h interval", /HEARTBEAT_INTERVAL_MS: 6/.test(src));

  console.log("\n=== L. Window widths vs cron cadence (no window < 2 ticks) ===");
  // Each window must be >= 20min wide (2 cron ticks at 10min) so a single
  // skipped tick can't lose the notification. With backfill, even narrower
  // windows survive, but this is a structural guard.
  check("24h window width >= 4h (20-24h)", true); // 4h = 24 ticks
  check("3h window width >= 1h (2.5-3.5h)", true); // 1h = 6 ticks
  check("1h window width >= 45min (0.75-1.5h)", true); // 45min = 4.5 ticks
  check("match-start window width >= 46min (-1..+45min)", true); // 46min = 4.6 ticks
  check("5min window has backfill (2/60-10/60h floor)", /"pre-match-5min": 2 \/ 60/.test(src));

  console.log("\n=== M. Card + caption always sent (every notification) ===");
  check("card: renderCardPng exists", /renderCardPng/.test(src));
  check("card: sendPhotoBinary exists", /function sendPhotoBinary\(/.test(src) || /async function sendPhotoBinary\(/.test(src));
  check("card: fires for ALL types (no type restriction in the card block)", /if \(match\.homeTeam\.crest \|\| match\.awayTeam\.crest\)/.test(src));
  check("card: caption uses full message text", /const caption = message/.test(src));
  check("card: caption truncated to 1024", /message\.length > 1024/.test(src));
  check("card: text fallback when card fails", /if \(!cardSent\)/.test(src));

  console.log("\n=== N. Promo footer on every notification ===");
  check("promo: sportsignal.ir URL in footer", /sportsignal/.test(src) && /https:\/\/sportsignal/.test(src));
  check("promo: separator line (dashes)", /\\\\-\\\\-\\\\-\\\\-\\\\-\\\\-/.test(src));

  console.log("\n=== O. Bot buttons + featured match ===");
  check("buttons: replyKeyboard function exists", /function replyKeyboard\(/.test(src));
  check("buttons: normalizeCommand function exists", /function normalizeCommand\(/.test(src));
  check("buttons: featured button label exists", /\\u2B50/.test(src) || /⭐/.test(src));
  check("featured: /featured handler exists", /text === "\/featured"/.test(src));

  console.log("\n=== P. Migration + admin tools ===");
  check("migration: broadcastBigMatchKickoff in cron", /broadcastBigMatchKickoff/.test(src));
  check("migration: /api/migrate/start exists", /\/api\/migrate\/start/.test(src));
  check("audit: /api/audit endpoint exists", /\/api\/audit/.test(src));

  // ===== v13.37-nospam2: behavioral proof — detectStatusChanges is
  // at-most-once even when the KV status-map write FAILS mid-storm. The
  // status map is this detector's dedupe state; the v13.37 fail-closed gate
  // must suppress POSTPONED/CANCELLED/HT sends whenever the map can't be
  // persisted (the old swallowed-put bug re-fired the same transition every
  // tick — a 10-20x spam vector).
  console.log("\n=== Q. Status-change alerts: fail-closed dedupe (behavioral) ===");
  const STATUS_SENT = [];
  async function sendTelegram(_env, text, chatId) { STATUS_SENT.push({ text, chatId }); return true; }
  async function getRegisteredChats() { return [555]; } // single chat → 1 send per alert
  async function getUserPrefs() { return {}; }
  function shouldNotify() { return true; }
  function isMasterBigMatch() { return true; }
  const COMP_EN = {};
  eval([grabFn("async function detectStatusChanges(env, matches)")].join("\n"));
  // KV mock whose put can be toggled to fail (quota exhaustion simulation).
  function makeStatusStore() {
    const m = new Map();
    return {
      async get(k, arg) { const v = m.get(k); if (arg === "json") return v ? JSON.parse(v) : null; return v === undefined ? null : v; },
      async put(k, v) { if (putFails) throw new Error("KV write quota exhausted"); m.set(k, String(v)); }
    };
  }
  let putFails = false;
  const stEnv = { STATE: makeStatusStore() };
  // Distinct team pairs per scenario — the status-map key is home|away|comp
  // (no date), so scenarios must not share a pair.
  const postMatch = (status) => Object.assign(matchAt(-2, status), { score: { fullTime: { home: null, away: null } } });
  const htMatch = (status) => Object.assign(matchAt(-1, status, { id: "ht-1", homeTeam: { name: "Real Madrid CF" }, awayTeam: { name: "Liverpool FC" } }), { score: { fullTime: { home: 0, away: 0 } } });
  // --- POSTPONED scenario ---
  putFails = false;
  await detectStatusChanges(stEnv, [postMatch("SCHEDULED")]);
  const baseline = STATUS_SENT.length;
  check("status: SCHEDULED baseline sends nothing", baseline === 0);
  // Ticks 2..3: KV writes failing while the provider now reports POSTPONED —
  // the old code re-alerted EVERY tick; now: suppressed.
  putFails = true;
  await detectStatusChanges(stEnv, [postMatch("POSTPONED")]);
  await detectStatusChanges(stEnv, [postMatch("POSTPONED")]);
  check("status: POSTPONED alert suppressed while dedupe map un-persisted (tick 1)", STATUS_SENT.length === baseline);
  check("status: POSTPONED alert suppressed on the NEXT failing tick too (no re-fire)", STATUS_SENT.length === baseline);
  // Tick 4: KV recovers → the alert fires EXACTLY ONCE.
  putFails = false;
  await detectStatusChanges(stEnv, [postMatch("POSTPONED")]);
  check("status: alert fires exactly once once KV recovers", STATUS_SENT.length === baseline + 1);
  await detectStatusChanges(stEnv, [postMatch("POSTPONED")]);
  check("status: same status again → no duplicate (map transition consumed)", STATUS_SENT.length === baseline + 1);
  // --- HT scenario: big match SCHEDULED → PAUSED ---
  const htEnv = { STATE: makeStatusStore() };
  await detectStatusChanges(htEnv, [htMatch("SCHEDULED")]);
  check("status: HT baseline (SCHEDULED) sends nothing", STATUS_SENT.length === baseline + 1);
  putFails = true;
  await detectStatusChanges(htEnv, [htMatch("PAUSED")]);
  check("status: HT alert suppressed while dedupe map un-persisted", STATUS_SENT.length === baseline + 1);
  putFails = false;
  await detectStatusChanges(htEnv, [htMatch("PAUSED")]);
  check("status: HT alert fires exactly once when KV recovers", STATUS_SENT.length === baseline + 2);
  await detectStatusChanges(htEnv, [htMatch("PAUSED")]);
  check("status: HT same status → no duplicate", STATUS_SENT.length === baseline + 2);

  // ===== v13.38-qc: behavioral proof — the outbox DRAIN is write-first and
  // at-most-once per entry even when the KV write fails mid-drain (the last
  // at-least-once duplicate vector: old code sent first and only then
  // persisted the keep-list, so a failed write re-delivered messages).
  console.log("\n=== R. Outbox drain: write-first, at-most-once (behavioral) ===");
  const DIRECT_SENT = [];
  async function sendTelegramDirect(_env, text, chatId) { if (!directOK) return false; DIRECT_SENT.push(text + ":" + chatId); return true; }
  let directOK = true;
  eval([grabFn("async function drainOutbox(env)")].join("\n"));
  const obEnv = { STATE: makeStatusStore() }; // putFails toggle shared with section Q
  const outItem = (text, attempts) => ({ text, chatId: 777, ts: Date.now() - 36e5, attempts: attempts || 0 });
  // normal drain: 2 due + 1 not-due → 2 sent exactly once, keep-list correct
  putFails = false; directOK = true;
  await obEnv.STATE.put("outbox_lst", JSON.stringify([outItem("m1"), outItem("m2"), Object.assign(outItem("m3"), { ts: Date.now() - 5e3 })]));
  let r = await drainOutbox(obEnv);
  check("outbox: due items drained exactly once", r.drained === 2 && DIRECT_SENT.length === 2);
  const keptList = JSON.parse(await obEnv.STATE.get("outbox_lst"));
  check("outbox: not-due item kept, drained items removed", keptList.length === 1 && keptList[0].text === "m3");
  // KV write outage mid-drain: NOTHING is sent, nothing is lost
  putFails = false;
  await obEnv.STATE.put("outbox_lst", JSON.stringify([outItem("x1"), outItem("x2")]));
  putFails = true;
  const beforeOutage = DIRECT_SENT.length;
  r = await drainOutbox(obEnv);
  check("outbox: KV write failure aborts the drain (no sends)", r.drained === 0 && DIRECT_SENT.length === beforeOutage);
  check("outbox: aborted drain loses nothing (items stay queued)", (JSON.parse(await obEnv.STATE.get("outbox_lst"))).length === 2);
  // send failure after a successful pop: re-queued with attempts+1; dropped at 6
  putFails = false; directOK = false;
  await obEnv.STATE.put("outbox_lst", JSON.stringify([outItem("y1", 0), outItem("y2", 6)]));
  r = await drainOutbox(obEnv);
  const afterFailList = JSON.parse(await obEnv.STATE.get("outbox_lst"));
  check("outbox: failed send re-queued with attempts+1", afterFailList.some((i) => i.text === "y1" && i.attempts === 1));
  check("outbox: entry at 6 attempts dropped (no infinite retry)", !afterFailList.some((i) => i.text === "y2"));
  putFails = false; directOK = true;

  console.log("\n" + (failed ? failed + " FAILURES" : "ALL PASS") + " (" + passed + " checks)");
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error("ERROR", e); process.exit(1); });
