// SportSignal — the notified-match DEDUPE store (notified_matches_v6): the
// KV read (getNotifiedMatches), the write-first save (saveNotifiedMatch —
// a failed KV save defers the send, fail-closed), the send gate
// (shouldSendNotification: MEM_DEDUPE + the never-re-arm line + window ||
// backfill), the hourly cleanup and the in-memory isolate-lifetime Set
// (MEM_DEDUPE). Extracted from matches.ts in v13.76-matchsplit.
import { CONFIG } from "./config";
import type { Env } from "./types";
import { matchKey } from "./dedupe";
import { vlog } from "./utils";
import { isWithin24HourWindow, isWithinBigMatchWindow, isWithin3HourWindow, isWithin1HourWindow, isWithin5MinWindow, isMatchStartingNow, isWithinPostMatchWindow, isBackfillEligible } from "./match-windows";
import { isMatchFinished } from "./match-model";

// v13.27-dedupe-fix: in-memory dedupe fallback. When KV writes fail (quota
// exhausted — the free tier has a 1,000 writes/day limit), saveNotifiedMatch
// can't persist the dedupe record. Without it, shouldSendNotification returns
// true every sweep → the same notification re-sends forever (the "bot is
// spamming" bug). This Set is the fallback: it lives for the isolate's
// lifetime (survives across requests within the same Worker isolate), so
// within a single cron sweep the dedupe works even when KV is down. Across
// isolates (different cron invocations) it resets, but the execution lock
// (24h TTL) prevents concurrent sweeps, so the same isolate handles both.
var MEM_DEDUPE = new Set<string>();

export async function getNotifiedMatches(env: Env) {
  try {
    // v13.5-sim-scope: request-scoped override (set only by /api/simulate's
    // cloned env) — the shared CONFIG is never mutated at runtime.
    const data = await env.STATE.get(env.SIM_NOTIFIED_KEY || CONFIG.KV_NOTIFIED_KEY, "json");
    return data || {};
  } catch (error) {
    console.log("No notified matches found, starting fresh");
    return {};
  }
}
// v13.42-rekindle: returns true iff the dedupe record PERSISTED. The caller
// gates the send on this — a failed KV save defers the send to the next tick
// (fail-closed) instead of sending unrecorded. MEM_DEDUPE is only seeded on
// success: a failed save must leave the notification retryable, and with the
// send now gated on the save there is nothing to double-send within the
// isolate anyway (the old MEM-on-failure add would have blocked the retry
// for the isolate's whole lifetime = permanent silent loss).
export async function saveNotifiedMatch(env: Env, match, notificationType, notifiedMatches) {
  const now = Date.now();
  const matchTime = new Date(match.utcDate).getTime();
  const key = matchKey(match);
  let expiresAt;
  switch (notificationType) {
    case "pre-match-24h":
    case "pre-match-3h":
    case "pre-match-1h":
      expiresAt = matchTime + CONFIG.ONE_HOUR_MS;
      break;
    case "match-start":
    case "match-start-big":
      expiresAt = matchTime + CONFIG.TWO_HOURS_MS;
      break;
    case "result":
    case "result-big":
      expiresAt = now + CONFIG.ONE_DAY_MS;
      break;
    default:
      expiresAt = matchTime + CONFIG.ONE_HOUR_MS;
  }
  if (!notifiedMatches[key]) {
    notifiedMatches[key] = [];
  }
  notifiedMatches[key] = notifiedMatches[key].filter((n) => now < n.expiresAt);
  notifiedMatches[key].push({
    matchId: key,
    notifiedAt: now,
    expiresAt,
    matchDate: match.utcDate,
    notificationType
  });
  const allNotifications: any[] = Object.values(notifiedMatches || {}).flat();
  const overallExpiresAt = allNotifications.length > 0 ? Math.max(...allNotifications.map((n) => n.expiresAt)) : now + CONFIG.ONE_DAY_MS;
  const ttlSeconds = Math.ceil((overallExpiresAt - now) / 1e3);
  vlog(`\u{1F4BE} Saving notification: match=${key}, type=${notificationType}, total_tracked=${Object.keys(notifiedMatches).length}, ttl=${ttlSeconds}s`);
  // v13.27-dedupe-fix: ALWAYS record in the in-memory Set first (even if KV
  // fails). This prevents re-sending within the same isolate (the same cron
  // sweep processes multiple matches — if the KV write fails for one, the
  // next sweep would re-send it). The key is matchKey + ":" + notificationType.
  // v13.38-qc: size cap — MEM_DEDUPE lives for the isolate's lifetime and
  // nothing removed entries; a long-lived isolate on a busy season grows it
  // without bound. 4000 entries ≈ months of matchdays; past that, clear
  // (safe: the KV record is the real never-expire line, this is the
  // write-outage fallback).
  if (MEM_DEDUPE.size > 4000) MEM_DEDUPE.clear();
  try {
    await env.STATE.put(
      env.SIM_NOTIFIED_KEY || CONFIG.KV_NOTIFIED_KEY,
      JSON.stringify(notifiedMatches),
      { expirationTtl: ttlSeconds > 0 ? ttlSeconds : 3600 }
    );
    MEM_DEDUPE.add(key + ":" + notificationType);
    return true;
  } catch (e) {
    // KV write failed (quota exhausted, network) — the caller defers the
    // send to the next tick (fail-closed): nothing sent, nothing lost, and
    // the retry sees no record. Log so the admin knows KV is failing.
    console.error("Notification state KV save failed — send deferred to next tick (fail-closed anti-spam): " + e.message);
    return false;
  }
}
export async function shouldSendNotification(env: Env, match, notificationType, notifiedMatches) {
  const now = Date.now();
  const key = matchKey(match);
  // v13.27-dedupe-fix: check the in-memory Set FIRST (covers the case where
  // KV writes are failing — without this, every sweep re-sends because the
  // KV dedupe record was never persisted).
  if (MEM_DEDUPE.has(key + ":" + notificationType)) {
    return false;
  }
  // v13.36-nospam THE LINE: once an event has fired, it never fires again —
  // regardless of the record's expiresAt. Previously a record that expired
  // mid-window (e.g. the old kickoff+1h default for "result-big" inside the
  // 6h post-match window) silently RE-ARMED the send and the notification
  // spammed every sweep. expiresAt is now purely KV-size hygiene: every
  // type's expiry is >= its window's end, so cleanup can never purge a
  // record whose window is still open.
  if (notifiedMatches[key]) {
    const existingNotification = notifiedMatches[key].find(
      (n) => n.notificationType === notificationType
    );
    if (existingNotification) {
      const timeAgo = ((now - existingNotification.notifiedAt) / CONFIG.ONE_HOUR_MS).toFixed(1);
      console.log(`\u23ED\uFE0F Skipping ${notificationType} for match ${key}: Already sent ${timeAgo}h ago`);
      return false;
    }
  }
  switch (notificationType) {
    case "pre-match-72h":
      return isWithinBigMatchWindow(match, env) || isBackfillEligible(match, "pre-match-72h", env);
    case "pre-match-24h":
      return isWithin24HourWindow(match, env) || isBackfillEligible(match, "pre-match-24h", env);
    case "pre-match-3h":
      return isWithin3HourWindow(match, env) || isBackfillEligible(match, "pre-match-3h", env);
    case "pre-match-1h":
      return isWithin1HourWindow(match, env) || isBackfillEligible(match, "pre-match-1h", env);
    case "pre-match-5min":
      return isWithin5MinWindow(match, env) || isBackfillEligible(match, "pre-match-5min", env);
    case "match-start":
      // v13.42-rekindle: agree with the gate above — window OR the new
      // isBackfillEligible("match-start") branch. (The v13.9
      // `|| isMatchStartBackfillEligible` OR-leg sat here all along but
      // was UNREACHABLE: the sendNotificationIfNeeded gate had no
      // match-start entry and always returned false first.)
      return isMatchStartingNow(match, env) || isBackfillEligible(match, "match-start", env);
    case "result":
      return isMatchFinished(match) && isWithinPostMatchWindow(match, env) || isBackfillEligible(match, "result", env);
    // v13.36-nospam: the big-match broadcast types were NEVER checked here
    // (the broadcast code sent first and only saved after) — a finished
    // master big-match re-sent its FT to all non-followers on EVERY tick of
    // the 6h post window (up to 36 copies) and the kickoff broadcast did the
    // same across its whole -1..+45min window. Both now dedupe like every
    // other type.
    case "match-start-big":
      return isMatchStartingNow(match, env);
    case "result-big":
      return isMatchFinished(match) && isWithinPostMatchWindow(match, env);
    default:
      return false;
  }
}
export async function cleanupExpiredNotifications(env: Env) {
  // v13.36-nospam: the once-per-hour guard is now isolate-local. The old
  // cleanup_hour KV write cost 144 writes/day (a big chunk of the 1,000/day
  // free quota) just to remember an optimization. Cleanup is idempotent and
  // only WRITES when it actually removed something, so running it a few
  // extra times across isolates costs a couple of KV reads per tick — reads
  // are 100k/day, effectively free.
  const hourStamp = Math.floor(Date.now() / 36e5);
  if (CLEANUP_HOUR === hourStamp) return;
  CLEANUP_HOUR = hourStamp;
  const notifiedMatches: Record<string, any> = await getNotifiedMatches(env);
  const now = Date.now();
  let cleanedCount = 0;
  for (const [matchId, notifications] of Object.entries(notifiedMatches)) {
    const validNotifications = notifications.filter((n) => now < n.expiresAt);
    if (validNotifications.length !== notifications.length) {
      cleanedCount += notifications.length - validNotifications.length;
      if (validNotifications.length > 0) {
        notifiedMatches[matchId] = validNotifications;
      } else {
        delete notifiedMatches[matchId];
      }
    }
  }
  if (cleanedCount > 0) {
    const allNotifications: any[] = Object.values(notifiedMatches || {}).flat();
    const maxExpiry = allNotifications.length > 0 ? Math.max(...allNotifications.map((n) => n.expiresAt)) : now + 36e5;
    const ttl = Math.max(3600, Math.ceil((maxExpiry - now) / 1e3));
    try {
      await env.STATE.put(
        env.SIM_NOTIFIED_KEY || CONFIG.KV_NOTIFIED_KEY,
        JSON.stringify(notifiedMatches),
        // ✅ Must be string for KV
        { expirationTtl: ttl }
      );
    } catch (e) {
      console.error("Notification cleanup write failed: " + e.message);
    }
    console.log(`\u{1F9F9} Cleaned up ${cleanedCount} expired notifications`);
  }
}
// v13.36-nospam: isolate-local cleanup guard (replaced the cleanup_hour KV
// key — see cleanupExpiredNotifications above).
var CLEANUP_HOUR = -1;
