// SportSignal — the notification TIME WINDOWS: 24h/3h/1h/5min pre-match,
// the post-kickoff match-start window (v13.15 widened), the post-match
// result window, and isBackfillEligible (the missed-window rescue —
// v13.42-rekindle). Windows are pure predicates over utcDate + status.
// Extracted from matches.ts in v13.76-matchsplit.
import { CONFIG } from "./config";
import { getNowUTC } from "./utils";
import { isLiveStatus, isMatchFinished } from "./match-model";

export function isWithin24HourWindow(match, _env) {
  const now = getNowUTC();
  const matchTime = new Date(match.utcDate);
  if (matchTime <= now) return false;
  const hoursUntilMatch = (matchTime.getTime() - now.getTime()) / CONFIG.ONE_HOUR_MS;
  return hoursUntilMatch <= 24 && hoursUntilMatch >= 20;
}
export function isWithinBigMatchWindow(match, _env) {
  const now = getNowUTC();
  const matchTime = new Date(match.utcDate);
  if (matchTime <= now) return false;
  const hoursUntilMatch = (matchTime.getTime() - now.getTime()) / CONFIG.ONE_HOUR_MS;
  return hoursUntilMatch <= CONFIG.BIG_MATCH_NOTIFICATION_HOURS && hoursUntilMatch >= CONFIG.BIG_MATCH_NOTIFICATION_HOURS - 4;
}
export function isWithin3HourWindow(match, _env) {
  const now = getNowUTC();
  const matchTime = new Date(match.utcDate);
  if (matchTime <= now) return false;
  const hoursUntilMatch = (matchTime.getTime() - now.getTime()) / CONFIG.ONE_HOUR_MS;
  return hoursUntilMatch <= 3.5 && hoursUntilMatch >= 2.5;
}
export function isWithin1HourWindow(match, _env) {
  const now = getNowUTC();
  const matchTime = new Date(match.utcDate);
  if (matchTime <= now) return false;
  const hoursUntilMatch = (matchTime.getTime() - now.getTime()) / CONFIG.ONE_HOUR_MS;
  return hoursUntilMatch <= 1.5 && hoursUntilMatch >= 0.75;
}
// v12.x-cron-gaps: 5-minute "kickoff now" reminder window. Fires for BIG
// matches only (both teams big), 1-10 minutes before kickoff. The 10-min
// width matches the cron tick cadence so the sweep catches the window at
// least once (worst case the reminder lands ~1 min before kickoff).
export function isWithin5MinWindow(match, _env) {
  const now = getNowUTC();
  const matchTime = new Date(match.utcDate);
  if (matchTime <= now) return false;
  const minutesUntilMatch = (matchTime.getTime() - now.getTime()) / (60 * 1e3);
  return minutesUntilMatch > 0 && minutesUntilMatch <= 10;
}
export function isMatchStartingNow(match, _env) {
  const now = getNowUTC();
  const matchTime = new Date(match.utcDate);
  const minutesSinceKickoff = (now.getTime() - matchTime.getTime()) / (60 * 1e3);
  // v13.15-reliability: widened from -1..+20min to -1..+45min. The cron
  // ticks every 10min, so the old 21-min window only covered 2 ticks — if
  // one tick was skipped (or busy), the match-start never fired. 46min
  // covers ~5 ticks, so even with 2 skipped ticks the match-start lands.
  // (Also matches the budget-guard exemption in sendMatchNotifications.)
  if (minutesSinceKickoff < -1 || minutesSinceKickoff > 45) return false;
  const status = String(match.status || "").toUpperCase();
  return status !== "FINISHED" && status !== "POSTPONED" && status !== "SUSPENDED" && status !== "CANCELLED" && status !== "CANCEL";
}
export function isWithinPostMatchWindow(match, _env) {
  if (!isMatchFinished(match)) return false;
  const now = getNowUTC();
  const matchTime = new Date(match.utcDate);
  const hoursSinceMatch = (now.getTime() - matchTime.getTime()) / CONFIG.ONE_HOUR_MS;
  return hoursSinceMatch <= CONFIG.POST_MATCH_NOTIFICATION_HOURS;
}
export function isBackfillEligible(match, type, _env) {
  const now = getNowUTC();
  const matchTime = new Date(match.utcDate);
  // v13.42-rekindle: the REAL match-start backfill. The v13.9 rescue
  // (isMatchStartBackfillEligible, [20-30min]) was wired into
  // shouldSendNotification — a layer sendNotificationIfNeeded can never
  // reach once its own window/backfill gate returned false, and this
  // function had NO match-start entry (floor === undefined → always
  // false) — dead code on BOTH layers. Observed live 2026-09-14:
  // Torino-Roma kicked off while the SA pool missed it for every
  // in-window tick; the [-1..+45min] window closed with zero record and
  // every backstop hollow. Now: if the live window was missed entirely,
  // fire the start reminder LATE while the match is still live
  // (IN_PLAY/PAUSED/LIVE) up to 3h after kickoff; once FINISHED the
  // result notification covers it — never a "match started" for a
  // finished match.
  if (type === "match-start") {
    const minutesSince = (now.getTime() - matchTime.getTime()) / (60 * 1e3);
    if (minutesSince < 45 || minutesSince > 180) return false;
    return isLiveStatus(match.status);
  }
  if (type === "result") {
    if (!isMatchFinished(match)) return false;
    const hoursSince = (now.getTime() - matchTime.getTime()) / CONFIG.ONE_HOUR_MS;
    return hoursSince > CONFIG.POST_MATCH_NOTIFICATION_HOURS && hoursSince <= 24;
  }
  if (matchTime <= now) return false;
  const hoursUntil = (matchTime.getTime() - now.getTime()) / CONFIG.ONE_HOUR_MS;
  // v13.9-reliability, amended v13.42: backfill covers ALL pre-match types.
  // (match-start moved to its own branch above — it is past-kickoff and
  // live-status-gated, so the hoursUntil table below never applied to it
  // correctly.) The floor keeps a small guard so we don't fire 5min at
  // 0.5min (already kickoff).
  const floors = { "pre-match-24h": 3.5, "pre-match-3h": 1.5, "pre-match-1h": 10 / 60, "pre-match-72h": CONFIG.BIG_MATCH_NOTIFICATION_HOURS - 24, "pre-match-5min": 2 / 60 };
  const maxes = { "pre-match-24h": 24, "pre-match-3h": 3.5, "pre-match-1h": 1.5, "pre-match-72h": CONFIG.BIG_MATCH_NOTIFICATION_HOURS, "pre-match-5min": 10 / 60 };
  const floor = floors[type];
  const max = maxes[type];
  if (floor === void 0) return false;
  return hoursUntil <= max && hoursUntil > floor;
}
