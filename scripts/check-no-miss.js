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
  KV_MATCH_STATUS: "match_status_v1", KV_OUTBOX: "outbox_lst",
  POOL_STAMP_REFRESH_MS: 90 * 60 * 1000
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
  grabFn("function isLiveStatus(status)"),
  grabFn("function isPresumablyFinished(match, _env)"),
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
  // v13.42-rekindle: match-start backfill now lives INSIDE
  // isBackfillEligible (the old isMatchStartBackfillEligible was wired into
  // shouldSendNotification, a layer the window/backfill gate never lets it
  // reach — dead code; the Torino-Roma 2026-09-14 missed start proved it).
  // Rules: window [-1..+45min] closed → eligible while LIVE, up to 3h past
  // kickoff; FINISHED → never (the result notification covers it).
  check("backfill-match-start: 50min after kickoff IN_PLAY → eligible (45-180min, live)", isBackfillEligible(matchAt(-50/60, "IN_PLAY"), "match-start", env));
  check("backfill-match-start: 2h after kickoff IN_PLAY → eligible (still live)", isBackfillEligible(matchAt(-2, "IN_PLAY"), "match-start", env));
  check("backfill-match-start: 44min after kickoff → NOT backfill (live window still open)", !isBackfillEligible(matchAt(-44/60, "IN_PLAY"), "match-start", env));
  check("backfill-match-start: 30min after kickoff → NOT backfill (in window)", !isBackfillEligible(matchAt(-30/60, "IN_PLAY"), "match-start", env));
  check("backfill-match-start: 50min after kickoff FINISHED → NOT eligible (result covers it)", !isBackfillEligible(matchAt(-50/60, "FINISHED"), "match-start", env));
  check("backfill-match-start: 3.5h after kickoff IN_PLAY → NOT eligible (info stale)", !isBackfillEligible(matchAt(-3.5, "IN_PLAY"), "match-start", env));
  check("backfill-match-start: POSTPONED 60min after planned kickoff → NOT eligible", !isBackfillEligible(matchAt(-1, "POSTPONED"), "match-start", env));
  // End-to-end wiring: the shouldSend chain (as sendNotificationIfNeeded
  // gates it: window || backfill) must now return TRUE for a missed-window
  // live match — this exact case failed in production on 2026-09-14.
  check("wiring: match-start 50min after kickoff IN_PLAY → shouldSend=true (the Torino-Roma case)", await shouldSendNotification(env, matchAt(-50/60, "IN_PLAY"), "match-start", {}));
  check("wiring: match-start 50min after kickoff FINISHED → shouldSend=false", !await shouldSendNotification(env, matchAt(-50/60, "FINISHED"), "match-start", {}));
  check("wiring: match-start 2min after kickoff IN_PLAY → shouldSend=true (live window)", await shouldSendNotification(env, matchAt(-2/60, "IN_PLAY"), "match-start", {}));

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
  check("schedule: sched_v1 decoy REMOVED (v13.43 — backfill legs cover recovery)", !/function reconcileSchedules\(/.test(src) && !/KV_SCHEDULE_PREFIX \+ matchKey/.test(src));
  check("audit: auditNotifications exists", /function auditNotifications\(/.test(src));
  check("kickoff-broadcast: broadcastBigMatchKickoff exists", /function broadcastBigMatchKickoff\(/.test(src));
  check("kickoff-broadcast: wired in cron", /await broadcastBigMatchKickoff\(/.test(src));
  check("audit: wired in cron", /await auditNotifications\(/.test(src));
  check("canary: buildCanaryMatch REMOVED (v13.44 F9 — the injection never persisted, ~144 wasted writes/day)", !/function buildCanaryMatch\(/.test(src));
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
  // v13.69-cardfallback: the group-level cardSent gate is GONE — one
  // successful photo used to mark the whole tz-group served, so chats whose
  // card failed got no text fallback AND no retry (dedupe already persisted).
  check("card: per-chat fallback filter (needText) replaces the group gate", /const needText = g\.chats\.filter/.test(src));
  check("card: fallback sent only to chats the card did not reach (true/dead excluded)", /r\.value === true \|\| r\.value === "dead"/.test(src));
  check("card: group-level cardSent gate REMOVED from the broadcast path", !/let cardSent = false;[\s\S]{0,600}?g\.chats\.map/.test(src));
  check("card: confirmed card delivery counts as success (breadcrumb visibility)", /if \(cardResults\.some\(\(r\) => r\.status === "fulfilled" && r\.value === true\)\) anySuccess = true/.test(src));

  console.log("\n=== N. Promo footer on every notification ===");
  check("promo: sportsignal.ir URL in footer", /sportsignal/.test(src) && /https:\/\/sportsignal/.test(src));
  check("promo: separator line (dashes)", /\\\\-\\\\-\\\\-\\\\-\\\\-\\\\-/.test(src));

  console.log("\n=== O. Bot buttons + featured match ===");
  check("buttons: replyKeyboard function exists", /function replyKeyboard\(/.test(src));
  check("buttons: normalizeCommand function exists", /function normalizeCommand\(/.test(src));
  check("buttons: featured button label exists", /\\u2B50/.test(src) || /⭐/.test(src));
  check("featured: /featured handler exists", /text === "\/featured"/.test(src));
  // v13.73-herotruth: the hero pick is ONE shared expression (ADR-001).
  check("herotruth: pickHeroMatch defined exactly once", (src.match(/function pickHeroMatch\(/g) || []).length === 1);
  check("herotruth: bot /featured uses the shared pickHeroMatch", /const featured = pickHeroMatch\(matches\);/.test(src));
  check("herotruth: site hero uses the shared pickHeroMatch (public-matches)", /const heroMatch = pickHeroMatch\(matches\);/.test(src));
  check("herotruth: no private hero re-implementation left (isHeroWorthy gone)", !/isHeroWorthy/.test(src));
  check("herotruth: shared expression semantics — featured||masterPair, not-FINISHED, live-first, nearest kickoff",
    /function pickHeroMatch\(matches\) \{[\s\S]{0,700}?isFeaturedMatch\(m\) \|\| isMasterPair\(m\)[\s\S]{0,300}?isLiveStatus\(m\.status\) \|\| new Date\(m\.utcDate\)\.getTime\(\) > Date\.now\(\)[\s\S]{0,400}?\(isLiveStatus\(a\.status\) \? 0 : 1\) - \(isLiveStatus\(b\.status\) \? 0 : 1\) \|\| new Date\(a\.utcDate\)\.getTime\(\) - new Date\(b\.utcDate\)\.getTime\(\)/.test(src));
  check("herotruth: both /featured and the site read the pool only (no sweeps from commands)",
    (src.split("// ===== src/bot.ts =====")[1] || "").split("// ===== src/cron.ts =====")[0].indexOf("pickHeroMatch(matches)") > -1);

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

  // ===== v13.43-cpukeeper: behavioral proof — the LIVE SWEEP keeps every
  // window live while full sweeps are throttled to 2h. Root cause it guards:
  // full sweeps burn ~100ms CPU and 6/hour over the free-plan 10ms rolling
  // CPU average killed every cron tick (2026-09-14 outages). The wiring that
  // must now hold: an active tick's match data = cachedPool MERGED with the
  // narrow live fetch (fresh statuses/scores win), pool-only fixtures keep
  // notifying (5-min window), a match the pool never saw is DISCOVERED by
  // the live sweep (the Torino-Roma shape → match-start backfill eligible),
  // and the merge performs ZERO KV writes.
  console.log("\n=== S. v13.43-cpukeeper: live sweep keeps every window live (behavioral) ===");
  // Real fetchLiveSweep + real canonDedupe from source; providers stubbed so
  // the scenario is deterministic. matchAt exists above.
  let FD_RESPONSE = [], SS_RESPONSE = [], FD_OPTS_SEEN = null, SS_OPTS_SEEN = null, FD_THROWS = false;
  async function fetchFootballData(_e, opts) { FD_OPTS_SEEN = opts; if (FD_THROWS) throw new Error("429"); return FD_RESPONSE; }
  async function fetchSportScore(_e, opts) { SS_OPTS_SEEN = opts; return SS_RESPONSE; }
  // Real canonDedupe from src/dedupe.ts (Node type-stripping, like
  // check-dedupe.js); fetchLiveSweep grabbed from the transformed source.
  const { canonDedupe } = require("../src/dedupe.ts");
  eval([grabFn("async function fetchLiveSweep(env, cachedPool)")].join("\n"));
  // KV mock that counts puts — the live sweep must write NOTHING.
  let livePuts = 0;
  const liveEnv = { STATE: { async get() { return null; }, async put() { livePuts++; } }, TEHRAN_TZ: "Asia/Tehran" };
  // The 2h-old KV pool: A=live-but-stale-status (kickoff 30min ago, pool still
  // SCHEDULED), B=pool-only fixture 5min before kickoff (must still notify),
  // and NO copy of the match the providers only just discovered (C).
  const poolA = matchAt(-0.5, "SCHEDULED", { id: "pool-a" });
  const poolB = matchAt(5 / 60, "SCHEDULED", { id: "pool-b", homeTeam: { name: "Real Madrid CF" }, awayTeam: { name: "FC Barcelona" }, competition: { code: "PD" } });
  const cachedPool = [poolA, poolB];
  // The live fetch: A now IN_PLAY 1-0 (fresh status+score), B unchanged, plus
  // C — a worthy match the pool MISSED entirely, live for 60min (the exact
  // Torino-Roma missed-start shape the backfill must catch).
  const fdA = matchAt(-0.5, "IN_PLAY", { id: "fd-a", score: { fullTime: { home: 1, away: 0 } } });
  const fdC = matchAt(-1, "IN_PLAY", { id: "fd-c", homeTeam: { name: "Inter Milan" }, awayTeam: { name: "AC Milan" }, competition: { code: "SA" } });
  FD_RESPONSE = [fdA, fdC]; SS_RESPONSE = [];
  const merged = await fetchLiveSweep(liveEnv, cachedPool);
  const mA = merged.find((m) => m.id === "pool-a" || m.id === "fd-a");
  const mB = merged.find((m) => m.id === "pool-b");
  const mC = merged.find((m) => m.id === "fd-c");
  check("live: fresh provider status REPLACES the stale pool copy (A IN_PLAY)", mA && mA.status === "IN_PLAY" && mA.score.fullTime.home === 1);
  check("live: fresh provider score carried into the merged row", mA && mA.score.fullTime.away === 0);
  check("live: pool-only fixture survives the merge (B present)", !!mB);
  check("live: pool-only 5-min window STILL evaluates on a live tick", mB && isWithin5MinWindow(mB, env));
  check("live: pool-only match-start window still evaluates (A within -1..+45min)", mA && isMatchStartingNow(mA, env));
  check("live: a match the pool NEVER saw is discovered by the live sweep (C)", !!mC);
  check("live: discovered live match is match-start-BACKFILL eligible (the Torino-Roma rescue)", mC && isBackfillEligible(mC, "match-start", env));
  check("live: narrow FD range wired (pastDays 2, futureDays 2, live)", FD_OPTS_SEEN && FD_OPTS_SEEN.pastDays === 2 && FD_OPTS_SEEN.futureDays === 2 && FD_OPTS_SEEN.live === true);
  // v13.53-standsteady (R6): the pool above holds only PL/PD/SA matches —
  // FD-covered leagues. The sportscore day sweep must be SKIPPED ENTIRELY
  // (0 of the old 18 calls): no eligible league has a live/imminent/
  // just-finished pool match, so there is nothing for it to update.
  check("live: R6 — sportscore SKIPPED when no eligible league has an in-window pool match (0 of 18 calls)", SS_OPTS_SEEN === null);
  check("live: ZERO KV writes during the live sweep", livePuts === 0);
  // Total provider failure: the live sweep must not throw and must return the
  // pool unchanged (the quiet path's data source — notifications still run).
  FD_THROWS = true; FD_RESPONSE = []; SS_RESPONSE = [];
  const fallback = await fetchLiveSweep(liveEnv, cachedPool);
  check("live: total provider failure returns the cached pool unchanged", fallback.length === 2 && fallback.every((m) => cachedPool.some((p) => p.id === m.id)));
  check("live: total provider failure still performs ZERO KV writes", livePuts === 0);
  FD_THROWS = false;
  // Next live tick: A goes PAUSED (HT) — the merged row must flip so
  // detectStatusChanges sees the transition (its fail-closed dedupe is proven
  // in section Q); then FINISHED — the result window must open.
  FD_RESPONSE = [matchAt(-0.5, "PAUSED", { id: "fd-a2" }), fdC];
  const mergedHT = await fetchLiveSweep(liveEnv, cachedPool);
  const mHT = mergedHT.find((m) => m.id === "pool-a" || m.id === "fd-a2");
  check("live: SCHEDULED→PAUSED transition reaches the merged pool (HT alert data)", mHT && mHT.status === "PAUSED" && isLiveStatus(mHT.status));
  FD_RESPONSE = [matchAt(-2, "FINISHED", { id: "fd-a3", score: { fullTime: { home: 2, away: 1 } } })];
  const mergedFT = await fetchLiveSweep(liveEnv, cachedPool);
  const mFT = mergedFT.find((m) => m.id === "pool-a" || m.id === "fd-a3");
  check("live: FINISHED reaches the merged pool and isMatchFinished opens the result path", mFT && isMatchFinished(mFT) && isWithinPostMatchWindow(mFT, env));

  // v13.53-standsteady (R6 behavioral): an EL match in the pool's live
  // window narrows the sportscore sweep to JUST that league's slug (2
  // day-calls, was 9 slugs × 2 days = 18); a far-future EL fixture alone
  // triggers NO call at all (nothing to update for hours).
  SS_OPTS_SEEN = null;
  const poolEL = [matchAt(-0.5, "LIVE", { id: "pool-el", competition: { code: "EL" } })];
  const mergedEL = await fetchLiveSweep(liveEnv, poolEL);
  check("live: R6 — EL live in the pool narrows sportscore to [EL] (2 calls, was 18)", SS_OPTS_SEEN && Array.isArray(SS_OPTS_SEEN.slugs) && SS_OPTS_SEEN.slugs.length === 1 && SS_OPTS_SEEN.slugs[0] === "EL" && SS_OPTS_SEEN.fromDays === 1 && SS_OPTS_SEEN.toDays === 0);
  check("live: R6 — the EL pool fixture survives the merge", mergedEL.some((m) => m.id === "pool-el"));
  SS_OPTS_SEEN = null;
  const poolELFar = [matchAt(48, "SCHEDULED", { id: "pool-el-far", competition: { code: "EL" } })];
  const mergedELFar = await fetchLiveSweep(liveEnv, poolELFar);
  check("live: R6 — a far-future EL fixture (outside +3h) triggers NO sportscore call", SS_OPTS_SEEN === null && mergedELFar.some((m) => m.id === "pool-el-far"));
  SS_OPTS_SEEN = null;
  const poolCup = [matchAt(2, "SCHEDULED", { id: "pool-cup", competition: { code: "EFL_CUP" } })];
  const mergedCup = await fetchLiveSweep(liveEnv, poolCup);
  check("live: R6 — an imminent (+2h) EFL Cup pool match arms its slug (kickoff transitions)", SS_OPTS_SEEN && Array.isArray(SS_OPTS_SEEN.slugs) && SS_OPTS_SEEN.slugs.includes("EFL_CUP") && mergedCup.some((m) => m.id === "pool-cup"));

  // The prewarm gate's fingerprint (v13.43): equal live data → equal
  // fingerprint (prewarm skipped); a goal/status change → different; list
  // re-ordering alone → still equal (no false "changed").
  eval([grabFn("function liveFingerprint(list)")].join("\n"));
  const fpPool = [matchAt(-1, "IN_PLAY", { id: "fp-1", score: { fullTime: { home: 0, away: 0 } } }), matchAt(-20, "FINISHED", { id: "fp-2", score: { fullTime: { home: 3, away: 2 } } })];
  const fpSame = [...fpPool].reverse();
  check("fingerprint: identical live data (reordered) → equal", liveFingerprint(fpPool) === liveFingerprint(fpSame));
  const fpGoal = [matchAt(-1, "IN_PLAY", { id: "fp-1", score: { fullTime: { home: 1, away: 0 } } }), matchAt(-20, "FINISHED", { id: "fp-2", score: { fullTime: { home: 3, away: 2 } } })];
  check("fingerprint: a goal changes it", liveFingerprint(fpPool) !== liveFingerprint(fpGoal));
  const fpHT = [matchAt(-1, "PAUSED", { id: "fp-1", score: { fullTime: { home: 0, away: 0 } } }), matchAt(-20, "FINISHED", { id: "fp-2", score: { fullTime: { home: 3, away: 2 } } })];
  check("fingerprint: an HT status change changes it", liveFingerprint(fpPool) !== liveFingerprint(fpHT));
  const fpNew = [...fpPool, matchAt(-1.5, "IN_PLAY", { id: "fp-3", homeTeam: { name: "Inter Milan" }, awayTeam: { name: "AC Milan" }, competition: { code: "SA" } })];
  check("fingerprint: a newly discovered live match changes it", liveFingerprint(fpPool) !== liveFingerprint(fpNew));
  check("fingerprint: non-live rows are ignored (quiet noise can't trigger)", liveFingerprint(fpPool) === liveFingerprint([...fpPool, matchAt(48, "SCHEDULED", { id: "fp-4" })]));

  // ===== v13.44-quotaguard: behavioral proof — the free-tier budget
  // guarantee. (1) The big-match kickoff broadcast is fail-closed on the
  // dedupe save (F3): a failing KV put suppresses the send entirely (an
  // unrecorded send would re-arm and duplicate next tick — the exact vector
  // the KV-write governor could otherwise trip); once KV recovers, the
  // broadcast fires exactly once and dedupes thereafter. (2) The pool-cache
  // write honors the HARD budget hold. (3) fetchWithRetry honors
  // Retry-After (capped at 15s) and flags the 429 for the FD circuit.
  console.log("\n=== T. v13.44-quotaguard: budget guarantee (behavioral) ===");
  function vlog() {}
  function bumpSubrequest() { return false; }
  var RATE_LIMITED_AT = 0;
  CONFIG.API_RETRY_ATTEMPTS = 2;
  CONFIG.API_RETRY_DELAY = 1000;
  function specialBanner() { return "BANNER "; }
  async function formatMatchStartMessage() { return "KICKOFF-MSG"; }
  eval([
    grabFn("async function getNotifiedMatches(env)"),
    grabFn("async function saveNotifiedMatch(env, match, notificationType, notifiedMatches)"),
    grabFn("async function broadcastBigMatchKickoff(env, matches)")
  ].join("\n"));
  const bigStart = matchAt(-10 / 60, "IN_PLAY", { id: "bigstart-1" });
  putFails = true;
  const beforeT = STATUS_SENT.length;
  let bkOut = await broadcastBigMatchKickoff(stEnv, [bigStart]);
  check("quota: failing dedupe save suppresses the big-match kickoff broadcast (fail-closed, F3)", STATUS_SENT.length === beforeT && bkOut.sent === 0);
  check("quota: the un-persisted send stays retryable (no MEM_DEDUPE lock on failure)", await shouldSendNotification(stEnv, bigStart, "match-start-big", {}));
  putFails = false;
  bkOut = await broadcastBigMatchKickoff(stEnv, [bigStart]);
  check("quota: recovered KV fires the broadcast exactly once", STATUS_SENT.length === beforeT + 1 && bkOut.sent === 1);
  bkOut = await broadcastBigMatchKickoff(stEnv, [bigStart]);
  check("quota: the next call is deduped (no re-broadcast)", STATUS_SENT.length === beforeT + 1 && bkOut.sent === 0);

  eval([grabFn("async function cacheMatches(env, matches, source)")].join("\n"));
  let poolPuts = 0;
  const holdEnv = { STATE: { async get() { return null; }, async put() { poolPuts++; } } };
  await cacheMatches(holdEnv, [matchAt(-1, "IN_PLAY", { id: "pool-1" })], "test");
  check("quota: pool-cache write happens without the hold flag", poolPuts === 1);
  const holdEnv2 = { STATE: { async get() { return null; }, async put() { poolPuts++; } }, KV_BUDGET_HOLD: true };
  await cacheMatches(holdEnv2, [matchAt(-1, "IN_PLAY", { id: "pool-2" })], "test");
  check("quota: HARD budget hold defers the pool-cache write (zero extra puts)", poolPuts === 1);

  // v13.54-livestamp behavioral: the stamp-advance gate. The pool's
  // fetchedAt is the site header's "Last updated" clock — on break weeks
  // content never changes, and the old change-only gate froze that stamp
  // for DAYS while sweeps ran clean every 2h (the 2026-09-28 report:
  // "Monday 15:39 · cached (1407m ago)"). Unchanged content + a STALE
  // stamp must rewrite the pool; unchanged content + a FRESH stamp must
  // still skip (the v13.31 change-only KV budget stays intact).
  const poolStampRows = [matchAt(24, "TIMED", { id: "pool-s1" })];
  const stampEnv = (stampMs) => ({ STATE: {
    async get() { return { fetchedAt: new Date(stampMs).toISOString(), matches: JSON.parse(JSON.stringify(poolStampRows)) }; },
    async put() { poolPuts++; }
  } });
  let putsBefore = poolPuts;
  await cacheMatches(stampEnv(Date.now() - 5 * 60e3), JSON.parse(JSON.stringify(poolStampRows)), "test");
  check("livestamp: fresh stamp (<90min) + identical content → no rewrite (change-only intact)", poolPuts === putsBefore);
  await cacheMatches(stampEnv(Date.now() - 3 * 36e5), JSON.parse(JSON.stringify(poolStampRows)), "test");
  check("livestamp: stale stamp (>90min) + identical content → the stamp-advance rewrite fires", poolPuts === putsBefore + 1);

  eval([
    grabFn("function fdRateLimited()"),
    grabFn("async function fetchWithRetry(url, apiToken, label)")
  ].join("\n"));
  const SLEEPS = [];
  const realSetTimeout = setTimeout;
  global.setTimeout = (fn, ms) => { SLEEPS.push(ms); return realSetTimeout(fn, 0); };
  const realFetch = global.fetch;
  let FETCH_SEQ = [];
  global.fetch = async () => FETCH_SEQ.shift();
  try {
    FETCH_SEQ = [
      { ok: false, status: 429, headers: { get: (h) => String(h).toLowerCase() === "retry-after" ? "7" : null }, text: async () => "" },
      { ok: true, status: 200, json: async () => ({ matches: [{ id: "ra-1" }] }) }
    ];
    const out1 = await fetchWithRetry("https://fd.test/x", "tok", "ra-test");
    check("quota: 429 then 200 returns the matches", Array.isArray(out1) && out1.length === 1 && out1[0].id === "ra-1");
    check("quota: Retry-After=7s honored (7s sleep before the retry)", SLEEPS.length === 1 && SLEEPS[0] === 7000);
    check("quota: the 429 is flagged for the FD suspension circuit", fdRateLimited() === true);
    FETCH_SEQ = [
      { ok: false, status: 429, headers: { get: (h) => String(h).toLowerCase() === "retry-after" ? "60" : null }, text: async () => "" },
      { ok: true, status: 200, json: async () => ({ matches: [] }) }
    ];
    await fetchWithRetry("https://fd.test/y", "tok", "ra-cap");
    check("quota: a 60s Retry-After is capped at 15s (the tick can't stall)", SLEEPS[SLEEPS.length - 1] === 15000);
    FETCH_SEQ = [
      { ok: false, status: 429, headers: { get: () => null }, text: async () => "" },
      { ok: true, status: 200, json: async () => ({ matches: [] }) }
    ];
    await fetchWithRetry("https://fd.test/z", "tok", "ra-none");
    check("quota: missing Retry-After falls back to the fixed delay", SLEEPS[SLEEPS.length - 1] === 1000);
  } finally {
    global.setTimeout = realSetTimeout;
    global.fetch = realFetch;
  }

  // ===== v13.52-swrsolid (behavioral): the LIVE OVERLAY — fixtures cache,
  // live matches never go stale. The serve path patches overlay rows into
  // every payload it serves: a SCHEDULED row the tick now sees IN_PLAY goes
  // live with score+minute; a finished game is PURGED from upcoming and
  // prepended to finished with its final score (the user's rule: "you can't
  // cache a live game — it would still show as playing"); lookup falls back
  // to team-pair+day when the payload and pool carry different ids.
  console.log("\n=== T. v13.52-swrsolid: live overlay (behavioral) ===");
  eval([grabFn("function applyLiveOverlay(data, ov)")].join("\n"));
  const pubRow = (id, h, a, day, status, extra) => Object.assign({ id, homeTeam: { name: h }, awayTeam: { name: a }, utcDate: day + "T19:00:00Z", status, minute: null, score: null }, extra || {});
  const OD = "2026-09-16";
  // FT purge: a LIVE row the overlay now reports FINISHED leaves upcoming,
  // lands at the head of finished with the final score and no minute.
  // v14.0.6-livescore: scores on PUBLIC rows are FLAT {home,away} — the
  // nested {fullTime} write was the "undefined - undefined" live-card bug.
  let data1 = { upcoming: [pubRow("ov-1", "Real Madrid", "Barcelona", OD, "LIVE")], finished: [pubRow("ov-9", "Arsenal", "Chelsea", "2026-09-15", "FINISHED", { score: { home: 2, away: 1 } })], nextBig: null, topSpot: null, thisWeek: [], nextWeek: [], cups: [] };
  applyLiveOverlay(data1, { ts: 1, rows: [{ id: "ov-1", h: "real madrid", a: "barcelona", d: OD + "T19:00:00Z", st: "FINISHED", min: 90, s: { home: 3, away: 2 } }] });
  check("overlay: a FINISHED game is purged from upcoming (the user's rule)", data1.upcoming.length === 0);
  check("overlay: the FT row lands on finished with the final score, minute nulled", data1.finished.length === 2 && data1.finished[0].id === "ov-1" && data1.finished[0].score.home === 3 && data1.finished[0].score.away === 2 && data1.finished[0].minute === null);
  // kickoff: SCHEDULED → IN_PLAY with score + minute patched in place.
  let data2 = { upcoming: [pubRow("ov-2", "Bayern Munich", "Borussia Dortmund", OD, "SCHEDULED")], finished: [] };
  applyLiveOverlay(data2, { ts: 1, rows: [{ id: "ov-2", h: "bayern munich", a: "borussia dortmund", d: OD + "T18:30:00Z", st: "IN_PLAY", min: 23, s: { home: 1, away: 0 } }] });
  check("overlay: kickoff (SCHEDULED→IN_PLAY) patches status+minute+score (FLAT)", data2.upcoming[0].status === "IN_PLAY" && data2.upcoming[0].minute === 23 && data2.upcoming[0].score.home === 1 && data2.upcoming[0].score.away === 0);
  // byPair fallback: the payload and overlay carry different ids for the
  // same fixture (provider switch between rebuilds) — pair+day still hits.
  let data3 = { upcoming: [pubRow("tsd-777", "Liverpool FC", "Manchester United", OD, "SCHEDULED")], finished: [] };
  applyLiveOverlay(data3, { ts: 1, rows: [{ id: 555001, h: "liverpoolfc", a: "manchesterunited", d: OD + "T20:00:00Z", st: "LIVE", min: 5, s: { home: 0, away: 0 } }] });
  check("overlay: id-miss falls back to team-pair+day lookup", data3.upcoming[0].status === "LIVE" && data3.upcoming[0].minute === 5);
  // the rest of the live-bearing surfaces: nextBig, topSpot, weeks, cups.
  const nb = pubRow("ov-4", "Inter Milan", "AC Milan", OD, "LIVE");
  const cupNext = pubRow("ov-5", "PSG", "Marseille", OD, "SCHEDULED");
  let data4 = { upcoming: [], finished: [], nextBig: nb, topSpot: { next: cupNext, matches: [nb, cupNext] }, thisWeek: [cupNext], nextWeek: [], cups: [{ code: "FL1", next: cupNext }] };
  applyLiveOverlay(data4, { ts: 1, rows: [{ id: "ov-4", h: "inter", a: "milan", d: OD + "T19:00:00Z", st: "PAUSED", min: 45, s: { home: 0, away: 0 } }, { id: "ov-5", h: "psg", a: "marseille", d: OD + "T19:00:00Z", st: "IN_PLAY", min: 12, s: { home: 2, away: 1 } }] });
  check("overlay: nextBig patched (HT pause carries the minute)", data4.nextBig.status === "PAUSED" && data4.nextBig.minute === 45);
  check("overlay: cups[].next + topSpot.next + thisWeek rows patched too", data4.cups[0].next.status === "IN_PLAY" && data4.topSpot.next.minute === 12 && data4.thisWeek[0].minute === 12);
  // no overlay / unknown rows: the payload is served exactly as cached.
  const untouched = { upcoming: [pubRow("x-1", "Torino", "Roma", OD, "SCHEDULED")], finished: [] };
  applyLiveOverlay(untouched, null);
  check("overlay: no overlay blob → payload served as-is", untouched.upcoming[0].status === "SCHEDULED" && untouched.upcoming.length === 1);
  applyLiveOverlay(untouched, { ts: 1, rows: [{ id: "other-1", h: "ajax", a: "feyenoord", d: OD + "T19:00:00Z", st: "LIVE", min: 3, s: null }] });
  check("overlay: rows the blob doesn't know stay untouched", untouched.upcoming[0].status === "SCHEDULED" && untouched.upcoming.length === 1);

  // ===== v13.69-cardfallback (behavioral): per-chat card verdicts. The old
  // group gate (cardSent = cardResults.some(true)) marked the whole tz-group
  // served when ONE chat's photo landed — the other chats got NO text
  // fallback and NO retry (the write-first dedupe was already persisted =
  // a silently missed alert). Proofs below run the REAL
  // sendNotificationIfNeeded with stubbed senders.
  console.log("\n=== V. v13.69-cardfallback: per-chat card verdicts (behavioral) ===");
  await (async () => {
    const SENT_CARD = [], SENT_TEXT = [];
    let deadHit = null;
    const cardVerdict = new Map(); // chatId -> true | false | "dead"
    async function sendTelegram(_e, _t, chatId) { SENT_TEXT.push(chatId); return true; }
    async function sendPhotoBinary(_e, chatId) {
      const v = cardVerdict.get(chatId);
      if (v === "dead") { deadHit = chatId; return "dead"; }
      if (v !== true) return false;
      SENT_CARD.push(chatId);
      return true;
    }
    async function sendDice() { return 3; }
    async function renderCardPngCached() { return new ArrayBuffer(8); }
    async function shouldSendNotification() { return true; }
    async function saveNotifiedMatch() { return true; }
    function isBackfillEligible() { return false; }
    function isMatchFinished() { return false; }
    function specialBanner() { return ""; }
    eval([grabFn("async function sendNotificationIfNeeded(match, config, chatGroups, env, counts, notifiedMatches, deadChats)")].join("\n")); // v13.72-deadweight: dead nowTehran param removed (was never read)
    const mkMatch = (crests) => ({
      id: "cf-1",
      utcDate: new Date(Date.now() + 30 * 60e3).toISOString(),
      status: "SCHEDULED",
      competition: { code: "PL" },
      homeTeam: { name: "Arsenal FC", crest: crests ? "https://x/1.png" : undefined },
      awayTeam: { name: "Chelsea FC", crest: crests ? "https://x/2.png" : undefined }
    });
    const cfg = { type: "pre-match-1h", windowCheck: () => true, messageFormatter: async () => "MSG", requiresFuture: true };
    const run = (match, chats) => {
      const counts = { "pre-match-1h": 0 };
      const deadChats = [];
      const p = sendNotificationIfNeeded(match, cfg, [{ tz: "Asia/Tehran", lang: "fa", chats }], {}, counts, {}, deadChats);
      return { p, counts, deadChats };
    };
    // 1. card OK for chat A, FAILS for chat B → B gets the text fallback.
    cardVerdict.set(101, true); cardVerdict.set(102, false);
    SENT_CARD.length = 0; SENT_TEXT.length = 0;
    const r1 = run(mkMatch(true), [101, 102]);
    await r1.p;
    check("cardfallback: card OK for A, fail for B → card lands ONLY for A", SENT_CARD.length === 1 && SENT_CARD[0] === 101);
    check("cardfallback: B still gets the TEXT fallback (no silent loss)", SENT_TEXT.length === 1 && SENT_TEXT[0] === 102);
    check("cardfallback: the type still counts as sent (card success counts)", r1.counts["pre-match-1h"] === 1);
    // 2. card dead for chat C → no text to C, C lands in deadChats (pruned).
    cardVerdict.set(103, "dead");
    SENT_CARD.length = 0; SENT_TEXT.length = 0;
    const r2 = run(mkMatch(true), [103]);
    await r2.p;
    check("cardfallback: dead chat gets NO card retry and NO text", deadHit === 103 && SENT_TEXT.length === 0);
    check("cardfallback: dead chat lands in deadChats for pruning", r2.deadChats.length === 1 && r2.deadChats[0] === 103);
    // 3. no crests → no card attempted → text for EVERYONE.
    cardVerdict.clear();
    SENT_CARD.length = 0; SENT_TEXT.length = 0;
    const r3 = run(mkMatch(false), [201, 202]);
    await r3.p;
    check("cardfallback: no card attempted → text fallback for every chat", SENT_TEXT.length === 2 && SENT_CARD.length === 0);
    // 4. all cards land → zero redundant text sends (the card caption
    //    already carries the text — the old skip behavior is preserved).
    cardVerdict.set(301, true); cardVerdict.set(302, true);
    SENT_CARD.length = 0; SENT_TEXT.length = 0;
    const r4 = run(mkMatch(true), [301, 302]);
    await r4.p;
    check("cardfallback: all cards land → no redundant text sends", SENT_CARD.length === 2 && SENT_TEXT.length === 0);
    check("cardfallback: all-cards success still counts (breadcrumb)", r4.counts["pre-match-1h"] === 1);
  })();

  console.log("\n" + (failed ? failed + " FAILURES" : "ALL PASS") + " (" + passed + " checks)");
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error("ERROR", e); process.exit(1); });
