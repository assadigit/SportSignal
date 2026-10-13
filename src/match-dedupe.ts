// SportSignal — the notified-match DEDUPE store: the read
// (getNotifiedMatches), the write-first save (saveNotifiedMatch — a failed
// save defers the send, fail-closed), the send gate
// (shouldSendNotification: MEM_DEDUPE + the never-re-arm line + window ||
// backfill), the hourly cleanup and the in-memory isolate-lifetime Set
// (MEM_DEDUPE). Extracted from matches.ts in v13.76-matchsplit.
//
// v13.94-fanoutfix: THE STORE MOVES TO D1 (binding USERS_DB, table
// notified_v1). Live forensics 2026-10-13: the KV write quota is
// ACCOUNT-level on the free plan and exhausts every afternoon (REST probe
// → 10048 while the cron path still occasionally passed — per-colo
// enforcement variance we cannot rely on). While the dedupe put fails, the
// write-first gate defers every send; when the failure outlives the
// notification windows, whole matchdays vanish for every user (the audit's
// 2026-10-09/10/11 gaps: Dortmund-Werder, Liverpool-ManCity, Barca-Getafe,
// ManUtd-Tottenham — zero records, zero sends). D1's separate
// 100k-writes/day tier makes the gate durable 24/7, and the
// (match_key, ntype) PRIMARY KEY turns the check+write into one atomic
// INSERT OR IGNORE (the KV blob needed a whole-key read-modify-write).
// CONTRACT (byte-identical when USERS_DB is unbound — local dev, the eval
// harness — or when the sim override is set): the legacy KV blob paths
// below are VERBATIM the pre-v13.94 code (notified_matches_v6 shape).
import { CONFIG } from "./config";
import type { Env } from "./types";
import { matchKey } from "./dedupe";
import { vlog } from "./utils";
import { isWithin24HourWindow, isWithinBigMatchWindow, isWithin3HourWindow, isWithin1HourWindow, isWithin5MinWindow, isMatchStartingNow, isWithinPostMatchWindow, isBackfillEligible } from "./match-windows";
import { isMatchFinished } from "./match-model";

// v13.27-dedupe-fix: in-memory dedupe fallback. When the backing store
// writes fail, saveNotifiedMatch can't persist the dedupe record. Without
// it, shouldSendNotification returns true every sweep → the same
// notification re-sends forever (the "bot is spamming" bug). This Set is
// the fallback: it lives for the isolate's lifetime (survives across
// requests within the same Worker isolate), so within a single cron sweep
// the dedupe works even when storage is down. Across isolates (different
// cron invocations) it resets, but the execution lock (24h TTL) prevents
// concurrent sweeps, so the same isolate handles both.
var MEM_DEDUPE = new Set<string>();

function notifiedStoreActive(env: Env) {
  return !!(env && (env as any).USERS_DB && !env.SIM_NOTIFIED_KEY);
}

export async function getNotifiedMatches(env: Env) {
  // v13.5-sim-scope: request-scoped override (set only by /api/simulate's
  // cloned env) — the shared CONFIG is never mutated at runtime. The sim
  // path stays on the KV sim key (simulation isolation is more important
  // than the sim's storage tier).
  if (!env.SIM_NOTIFIED_KEY && notifiedStoreActive(env)) {
    try {
      const rows = await (env as any).USERS_DB.prepare("SELECT match_key, ntype, notified_at, expires_at, match_date FROM notified_v1").all();
      const out: Record<string, any[]> = {};
      for (const r of (rows && rows.results) || []) {
        if (!out[r.match_key]) out[r.match_key] = [];
        out[r.match_key].push({
          matchId: r.match_key,
          notifiedAt: Number(r.notified_at) || 0,
          expiresAt: Number(r.expires_at) || 0,
          matchDate: r.match_date || null,
          notificationType: r.ntype
        });
      }
      const n = Object.keys(out).length;
      // One-time KV→D1 import: an EMPTY table before the migration marker
      // means "not migrated yet" (a marker-less fresh DB self-heals from the
      // legacy KV snapshot once — the v13.92 userstore pattern; after the
      // marker, empty means empty).
      if (n === 0) {
        const meta = await (env as any).USERS_DB.prepare("SELECT v FROM userstore_meta WHERE k = 'notified_migrated'").first().catch(() => null);
        if (!meta || !meta.v) {
          await importNotifiedFromKV(env);
          const rows2 = await (env as any).USERS_DB.prepare("SELECT match_key, ntype, notified_at, expires_at, match_date FROM notified_v1").all();
          for (const r of (rows2 && rows2.results) || []) {
            if (!out[r.match_key]) out[r.match_key] = [];
            out[r.match_key].push({ matchId: r.match_key, notifiedAt: Number(r.notified_at) || 0, expiresAt: Number(r.expires_at) || 0, matchDate: r.match_date || null, notificationType: r.ntype });
          }
          await (env as any).USERS_DB.prepare("INSERT INTO userstore_meta (k, v) VALUES ('notified_migrated', ?1) ON CONFLICT(k) DO UPDATE SET v=excluded.v").bind(new Date().toISOString()).run().catch(() => {});
          console.log("notified-store: legacy KV snapshot imported into D1 (" + Object.keys(out).length + " keys)");
        }
      }
      return out;
    } catch (e: any) {
      console.warn("notified-store: D1 read failed (legacy KV fallback): " + e.message);
    }
  }
  try {
    const data = await env.STATE.get(env.SIM_NOTIFIED_KEY || CONFIG.KV_NOTIFIED_KEY, "json");
    return data || {};
  } catch (error) {
    console.log("No notified matches found, starting fresh");
    return {};
  }
}

// One-time import of the live KV blob into notified_v1 (idempotent —
// INSERT OR IGNORE; safe to re-run).
async function importNotifiedFromKV(env: Env) {
  const blob = await env.STATE.get(CONFIG.KV_NOTIFIED_KEY, "json").catch(() => null) as any;
  if (!blob || typeof blob !== "object") return;
  const stmts = [];
  for (const key of Object.keys(blob)) {
    const entries = blob[key];
    const list = Array.isArray(entries) ? entries : [];
    for (const e of list) {
      stmts.push(
        (env as any).USERS_DB.prepare("INSERT OR IGNORE INTO notified_v1 (match_key, ntype, notified_at, expires_at, match_date) VALUES (?1, ?2, ?3, ?4, ?5)")
          .bind(key, String(e.notificationType || ""), Number(e.notifiedAt) || 0, Number(e.expiresAt) || 0, e.matchDate || null)
      );
    }
  }
  if (stmts.length) await (env as any).USERS_DB.batch(stmts).catch(() => {});
}

// v13.42-rekindle: returns true iff the dedupe record PERSISTED. The caller
// gates the send on this — a failed save defers the send to the next tick
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
  // v13.94-fanoutfix: D1 primary — the atomic never-re-arm. INSERT OR
  // IGNORE against the (match_key, ntype) PK: changes>0 = the record is
  // NEWLY persisted (proceed to the fan-out); changes=0 = it already
  // exists (a race or a re-fire — treat like "already sent": return false
  // so the caller skips, exactly what shouldSendNotification would have
  // said). A D1 failure returns false → the send defers to the next tick
  // (fail-closed anti-spam, same contract as the KV path).
  if (notifiedStoreActive(env)) {
    try {
      const r = await (env as any).USERS_DB.prepare(
        "INSERT OR IGNORE INTO notified_v1 (match_key, ntype, notified_at, expires_at, match_date) VALUES (?1, ?2, ?3, ?4, ?5)"
      ).bind(key, notificationType, now, expiresAt, match.utcDate).run();
      if (r && r.meta && r.meta.changes > 0) {
        if (!notifiedMatches[key]) notifiedMatches[key] = [];
        notifiedMatches[key].push({ matchId: key, notifiedAt: now, expiresAt, matchDate: match.utcDate, notificationType });
        if (MEM_DEDUPE.size > 4000) MEM_DEDUPE.clear();
        MEM_DEDUPE.add(key + ":" + notificationType);
        return true;
      }
      return false;
    } catch (e: any) {
      console.error("Notification state D1 save failed — send deferred to next tick (fail-closed anti-spam): " + e.message);
      return false;
    }
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
  // storage writes are failing — without this, every sweep re-sends because
  // the dedupe record was never persisted).
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
  // extra times across isolates costs a couple of reads per tick — reads
  // are 100k/day, effectively free.
  const hourStamp = Math.floor(Date.now() / 36e5);
  if (CLEANUP_HOUR === hourStamp) return;
  CLEANUP_HOUR = hourStamp;
  // v13.94-fanoutfix: the D1 store prunes rows two weeks past their window
  // (never-re-arm is absolute WHILE a window could still matter — the
  // horizon fence never looks past ±3 days, so 14 days is ~5× margin).
  // Probabilistic like the updSeen tidy (2% of calls).
  if (notifiedStoreActive(env)) {
    if (Math.random() < 0.02) {
      await (env as any).USERS_DB.prepare("DELETE FROM notified_v1 WHERE expires_at < ?1").bind(Date.now() - 14 * 864e5).run().catch(() => {});
    }
    return;
  }
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
