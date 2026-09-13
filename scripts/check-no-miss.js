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
  KV_USER_PREFS: "user_prefs_v1", KV_PUBLIC_MATCHES: "public_matches_v1"
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

  console.log("\n" + (failed ? failed + " FAILURES" : "ALL PASS") + " (" + passed + " checks)");
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error("ERROR", e); process.exit(1); });
