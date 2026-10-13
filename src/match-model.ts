// SportSignal — the match MODEL primitives: the live/finished status
// vocabulary (isLiveStatus, isMatchFinished, isPresumablyFinished) and the
// provider event→match format helpers (mapStageName, parseTSPDate). Every
// other match-* module builds on these. Extracted from matches.ts in
// v13.76-matchsplit.
import { getNowUTC } from "./utils";

// v13.9-reliability #8: time-based result fallback. If a match's utcDate is
// >90min past AND the status is still SCHEDULED/TIMED (provider hasn't
// reported FINISHED yet — all providers down or slow), treat it as
// "presumably finished" so the result notification fires (with score
// pending) instead of waiting for a provider that may not recover. When
// the provider recovers, the real score updates the snapshot.
// v13.20-fix: IN_PLAY + PAUSED are EXCLUDED — those mean the match is
// actively being played (extra time, stoppage time, half-time). The
// fallback should ONLY fire when the provider hasn't even started
// reporting the match as live (SCHEDULED/TIMED at 90+min = provider is
// genuinely down, not "the match is in extra time").
export function isPresumablyFinished(match, _env) {
  const now = getNowUTC();
  const matchTime = new Date(match.utcDate);
  const minutesSince = (now.getTime() - matchTime.getTime()) / (60 * 1e3);
  // v13.20: widened to 150min (football matches with extra time can run
  // to ~120min; stoppage time + delays can push to ~130min). 150min gives
  // a safe margin so we don't fire during a legitimately long match.
  if (minutesSince < 150) return false;
  const status = String(match.status || "").toUpperCase();
  // ONLY SCHEDULED/TIMED — the provider hasn't started reporting live at all.
  // IN_PLAY/PAUSED mean the match is actively being played (NOT finished).
  return status === "SCHEDULED" || status === "TIMED";
}
// (v13.9 #2 match-start backfill retired in v13.42-rekindle — its logic lives
// in the isBackfillEligible "match-start" branch, where it can actually run.)
export function isMatchFinished(match) {
  return match.status === "FINISHED" || isPresumablyFinished(match, null);
}
export function mapStageName(stage) {
  const s = String(stage || "").toLowerCase();
  if (s.includes("quarter")) return "QUARTER_FINALS";
  if (s.includes("semi")) return "SEMI_FINALS";
  if (s.includes("final")) return "FINAL";
  if (s.includes("third") || s.includes("3rd")) return "THIRD_PLACE";
  return "REGULAR_SEASON";
}
export function parseTSPDate(dateStr, timeStr, tsStr) {
  if (tsStr) {
    const d2 = new Date(tsStr);
    if (!isNaN(d2.getTime())) return d2.toISOString();
  }
  if (!dateStr) return null;
  const d = new Date(dateStr + "T" + (timeStr || "12:00:00") + "Z");
  return isNaN(d.getTime()) ? null : d.toISOString();
}
export function isLiveStatus(status) {
  const s = String(status || "").toUpperCase();
  return s === "LIVE" || s === "IN_PLAY" || s === "PAUSED";
}
