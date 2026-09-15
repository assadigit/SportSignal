// SportSignal — the cron sweep (*/10 * * * *): stale-run alert, execution
// lock, quiet-period pool reuse, FA-AI learning, notification fan-out,
// digests, coronation alerts, X mirror, heartbeat.


import { CONFIG } from "./config";
import type { Env } from "./types";
import { toFaDigits, resetSubrequestBudget, subrequestCount, escapeMarkdownCharacters } from "./utils";
import { translateTeam, ensureFaAiCache, ensureFaVenueCache } from "./translate";
import { shouldNotify, isLiveStatus } from "./matches";
import { maybeRunFaAi } from "./fa-ai";
import { fetchMatchesFromAPI, getCachedMatches, fetchLiveSweep } from "./providers";
import { sendTelegram, drainOutbox } from "./telegram";
import { sendMatchNotifications, detectStatusChanges, auditNotifications } from "./notifications";
import { maybeSendWeeklyTables, maybeSendMorningDigest, broadcastBigMatchResults, broadcastBigMatchKickoff, maybeNotifyTableToppers } from "./digest";
import { maybePostX } from "./x";
import { getRegisteredChats, checkUserCap, getUserPrefs } from "./users";
import { applySettings, buildCanaryMatch } from "./admin";
import { fetchPublicMatches } from "./public-matches";

export async function getCronStatus(env: Env) {
  try {
    const s = await env.STATE.get("cron_status_v1", "json").catch(() => null);
    if (s && s.heartbeat) return s;
  } catch (e) {
  }
  const hb = parseInt(await env.STATE.get(CONFIG.KV_HEARTBEAT).catch(() => null)) || 0;
  const lc = parseInt(await env.STATE.get(CONFIG.KV_LAST_CRON).catch(() => null)) || 0;
  const src = await env.STATE.get(CONFIG.KV_LAST_SOURCE).catch(() => null);
  const lfs = parseInt(await env.STATE.get("last_full_sweep").catch(() => null)) || 0;
  return { heartbeat: hb ? String(hb) : "0", last_cron: lc ? String(lc) : "0", api_source: src || null, last_full_sweep: lfs ? String(lfs) : "0" };
}
// v13.36-nospam: rate-limited phase-error alert. The Sep 14 00:20→10:10 UTC
// outage (CF analytics: err=1 on EVERY cron tick for ~10h) was completely
// invisible — no log, no message, just a stale heartbeat. Now every guarded
// phase reports its failure to the admin chat (max 1 alert / 30min per
// isolate) so the NEXT outage is diagnosable from Telegram within minutes.
var LAST_ERR_ALERT = 0;
async function alertPhaseError(env: Env, phase, err) {
  const msg = String(err && err.message || err || "unknown");
  console.error(`Cron phase [${phase}] failed: ${msg}`);
  const now = Date.now();
  if (now - LAST_ERR_ALERT < 30 * 6e4) return;
  LAST_ERR_ALERT = now;
  try {
    const adminChat = parseInt(env.CHAT_ID);
    if (!isNaN(adminChat)) {
      await sendTelegram(env, "\u26A0\uFE0F *\u062E\u0637\u0627\u06CC \u0632\u0645\u0627\u0646\u200C\u0628\u0646\u062F:* " + escapeMarkdownCharacters(phase) + "\n`" + escapeMarkdownCharacters(msg.slice(0, 160)) + "`", adminChat);
    }
  } catch (e) {
  }
}
// v13.43-cpukeeper: fingerprint of every live-ish match row (status +
// score + identity). Two lists with equal fingerprints carry identical live
// information — used to skip the ~100ms-CPU public-payload prewarm on live
// ticks where nothing actually changed (the common case: no goal since the
// last rebuild). Order-independent (sorted) so a merge re-ordering can't
// produce a false "changed".
function liveFingerprint(list) {
  const parts = [];
  for (const m of list || []) {
    const st = String(m.status || "").toUpperCase();
    if (st !== "LIVE" && st !== "IN_PLAY" && st !== "PAUSED" && st !== "FINISHED") continue;
    const s = m.score && m.score.fullTime ? String(m.score.fullTime.home) + "-" + String(m.score.fullTime.away) : "n";
    parts.push(String(m.homeTeam && m.homeTeam.name) + "|" + String(m.awayTeam && m.awayTeam.name) + "|" + String(m.utcDate || "").slice(0, 10) + "|" + st + "|" + s);
  }
  parts.sort();
  return parts.join(";");
}
export async function executeScheduledLogic(env: Env) {
  resetSubrequestBudget();
  // v13.36-nospam: settings failure must not kill the tick (it previously
  // ran unguarded BEFORE the lock — an exception here left zero diagnostics
  // and a stale heartbeat).
  try {
    await applySettings(env);
  } catch (e) {
    await alertPhaseError(env, "apply-settings", e);
  }
  await ensureFaAiCache(env).catch(() => {
  });
  await ensureFaVenueCache(env).catch(() => {
  });
  const NOW = Date.now();
  const prevStatus = await getCronStatus(env);
  console.log(`
\u{1F680} Starting scheduled execution at ${new Date(NOW).toISOString()}`);
  try {
    const lastCron = parseInt(prevStatus.last_cron) || 0;
    const lastStale = parseInt(await env.STATE.get("stale_alert_at").catch(() => null)) || 0;
    if (lastCron && NOW - lastCron > 30 * 6e4 && NOW - lastStale > 12 * 36e5) {
      await env.STATE.put("stale_alert_at", String(NOW)).catch(() => {
      });
      const gapMin = Math.round((NOW - lastCron) / 6e4);
      const adminChat = parseInt(env.CHAT_ID);
      if (!isNaN(adminChat)) {
        await sendTelegram(env, "\u26A0\uFE0F *\u0631\u0628\u0627\u062A \u0628\u0631\u0627\u06CC " + toFaDigits(String(gapMin)) + " \u062F\u0642\u06CC\u0642\u0647 \u062E\u0627\u0645\u0648\u0634 \u0628\u0648\u062F* \u2014 \u0627\u0639\u0644\u0627\u0646\u200C\u0647\u0627\u06CC \u0622\u0646 \u0628\u0627\u0632\u0647 \u0645\u0645\u06A9\u0646 \u0627\u0633\u062A \u0627\u0632 \u062F\u0633\u062A \u0631\u0641\u062A\u0647 \u0628\u0627\u0634\u0646\u062F. \u0627\u06A9\u0646\u0648\u0646 \u062F\u0648\u0628\u0627\u0631\u0647 \u0641\u0639\u0627\u0644 \u0634\u062F.", adminChat);
      }
    }
  } catch (e) {
    console.error("Stale alert failed: " + e.message);
  }
  const lockValue = await env.STATE.get(CONFIG.KV_EXECUTION_LOCK).catch(() => null);
  if (lockValue) {
    const lockTime = parseInt(String(lockValue).replace(/^own:/, "")) || 0;
    if (lockTime && NOW - lockTime < CONFIG.LOCK_TIMEOUT) {
      console.log("\u23ED\uFE0F Execution already in progress, skipping");
      return;
    }
  }
  const lockOwner = "own:" + NOW + ":" + crypto.randomUUID();
  // v13.36-nospam: the lock write is now guarded + fails CLOSED. It was the
  // only unguarded KV write in the pre-flight path — a quota-exhausted tick
  // died right here with zero diagnostics (the observed err=1/subreq=0
  // signature from the Sep 14 outage). Without a persisted lock we cannot
  // guarantee single-flight AND every dedupe write below would fail too —
  // sending anyway is exactly how the duplicate-notification spam happened.
  // Defer to the next tick instead.
  try {
    await env.STATE.put(CONFIG.KV_EXECUTION_LOCK, lockOwner, {
      expirationTtl: Math.ceil(CONFIG.LOCK_TIMEOUT / 1e3)
    });
  } catch (e) {
    await alertPhaseError(env, "execution-lock (KV writes failing — notifications deferred)", e);
    return;
  }
  const lockCheck = await env.STATE.get(CONFIG.KV_EXECUTION_LOCK).catch(() => null);
  if (lockCheck !== lockOwner) {
    console.log("\u23ED\uFE0F Lock claimed by a concurrent run, skipping");
    return;
  }
  // v13.36-nospam: START heartbeat. The old code only wrote the heartbeat
  // at the very END of the tick — any mid-tick crash (see the Sep 14
  // outage: every tick err=1 for 10 hours) left the heartbeat frozen and
  // healthz reported ok:false with a phantom "dead bot". Writing the
  // heartbeat right after the lock proves the cron fired; last_cron below
  // still proves the tick COMPLETED.
  // v13.38-qc: carry the KV-write daily accumulator through this overwrite
  // (the final blob below refreshes it with this tick's counted writes).
  try {
    await env.STATE.put("cron_status_v1", JSON.stringify({
      heartbeat: String(NOW),
      last_cron: prevStatus.last_cron || "0",
      last_full_sweep: prevStatus.last_full_sweep || "0",
      kv_day: prevStatus.kv_day || "",
      kv_writes_day: prevStatus.kv_writes_day || 0
    }));
  } catch (e) {
    console.error("Start-heartbeat write failed: " + e.message);
  }
  // v13.38-qc: KV WRITE BUDGET METER. The free tier's 1,000 writes/day was
  // exhausted once (the original spam trigger) and the budget math was
  // pencil-only. Count every env.STATE.put from here to tick end, fold the
  // running day-total into the status blob, and log the burn. Constant
  // offsets (the lock put just above) are uncounted — irrelevant for trend
  // monitoring; +1/tick ≈ +144/day at most.
  let kvWritesThisTick = 0;
  const kvWriteKeys: Record<string, number> = {};
  const origStatePut = env.STATE.put.bind(env.STATE);
  (env.STATE as any).put = (...args: unknown[]) => {
    kvWritesThisTick++;
    try {
      const k = String(args[0]).slice(0, 28);
      kvWriteKeys[k] = (kvWriteKeys[k] || 0) + 1;
    } catch (e) { }
    return origStatePut(...(args as [string, string, any?]));
  };
  try {
    let chatIds;
    // v13.36-nospam: user-list read failure previously re-threw through the
    // big try/catch — killing the tick with zero diagnostics.
    try {
      chatIds = await getRegisteredChats(env);
    } catch (e) {
      await alertPhaseError(env, "get-registered-chats", e);
      return;
    }
    console.log(`\u{1F465} Registered users: ${chatIds.length}`);
    // v13.9-reliability #3: drain the dead-letter outbox FIRST. Any send
    // that failed last sweep (Telegram 5xx/429/network) gets retried now
    // with exponential backoff. A message is never silently lost.
    try {
      const dr = await drainOutbox(env);
      if (dr.drained) console.log(`\u{1F4E9} Outbox drained: ${dr.drained} sent, ${dr.dead} dead, ${dr.remaining} pending`);
    } catch (e) {
      console.error("Outbox drain failed: " + e.message);
    }
    // v13.9-reliability #9: 6h heartbeat to the admin chat. If the admin
    // doesn't see it, something broke (cron, worker, KV, Telegram).
    try {
      const lastHb = parseInt(await env.STATE.get(CONFIG.KV_HEARTBEAT_LAST).catch(() => null)) || 0;
      if (Date.now() - lastHb > CONFIG.HEARTBEAT_INTERVAL_MS) {
        const adminChat = parseInt(env.CHAT_ID);
        if (!isNaN(adminChat)) {
          await sendTelegram(env, "\u2705 *\u0631\u0628\u0627\u062A \u0633\u0627\u0644\u0645 \u0627\u0633\u062A* \u2014 \u062A\u0645\u0627\u0645 \u0633\u06CC\u0633\u062A\u0645 \u0647\u0627\u06CC \u0627\u0639\u0644\u0627\u0646\\-\u0631\u0633\u0627\u0646\u06CC \u0641\u0639\u0627\u0644 \u0627\u0633\u062A\u0646\\.", adminChat);
          await env.STATE.put(CONFIG.KV_HEARTBEAT_LAST, String(Date.now())).catch(() => {});
        }
      }
    } catch (e) {
      console.error("Heartbeat failed: " + e.message);
    }
    // v13.11-migration: bot migration broadcast. If the admin has started a
    // migration (POST /api/migrate/start), send a "this bot is deprecated,
    // join the new bot" message to all registered chats every 3 days for 2
    // weeks. Per-chat KV dedupe so each user gets it exactly once per round.
    try {
      const mig = await env.STATE.get(CONFIG.KV_MIGRATION, "json").catch(() => null);
      if (mig && mig.active) {
        const NOW_MS = Date.now();
        const started = mig.startedAt || NOW_MS;
        const ageDays = Math.floor((NOW_MS - started) / (24 * 36e5));
        if (ageDays <= CONFIG.MIGRATION_TOTAL_DAYS) {
          const lastRound = mig.lastRound || 0;
          const roundDue = lastRound === 0 || (NOW_MS - lastRound) >= CONFIG.MIGRATION_INTERVAL_DAYS * 24 * 36e5;
          if (roundDue) {
            const chats = await getRegisteredChats(env);
            const roundNum = Math.floor(ageDays / CONFIG.MIGRATION_INTERVAL_DAYS) + 1;
            const prefs = await getUserPrefs(env).catch(() => ({}));
            let sent = 0, failed = 0;
            for (const chatId of chats) {
              const dedupeKey = "mig_sent_v1:" + roundNum + ":" + chatId;
              const already = await env.STATE.get(dedupeKey).catch(() => null);
              if (already) continue;
              const p = prefs[String(chatId)] || {};
              const lang = p.lang === "en" ? "en" : "fa";
              // v13.36-nospam: write-first — mark this chat as migrated
              // BEFORE the send so a failed KV write can't re-send the
              // migration notice to the same user every 10-min tick.
              // v13.38-qc: the marker put's success now GATES the send —
              // the swallowed .catch left the write-first promise hollow
              // (put fails → not marked → re-send next tick).
              let migMarked = false;
              try {
                await env.STATE.put(dedupeKey, "1", { expirationTtl: CONFIG.MIGRATION_INTERVAL_DAYS * 24 * 3600 + 3600 });
                migMarked = true;
              } catch (e) {
                console.error("Migration dedupe mark failed — skipping this chat this tick (fail-closed anti-spam)");
              }
              if (!migMarked) continue;
              const msg = lang === "en"
                ? "\u{1F6A8} *This bot is deprecated\\!*\n\nWe've moved to a new, faster bot with better features\\. Please join our new bot to continue receiving match notifications\\.\n\n\u2728 *New bot:* " + CONFIG.MIGRATION_NEW_BOT_HANDLE + "\n\u{1F517} " + CONFIG.MIGRATION_NEW_BOT_URL + "\n\n_Thank you for following \\- see you on the new bot\\!_"
                : "\u{1F6A8} *\u0627\u06CC\u0646 \u0631\u0628\u0627\u062A \u0645\u0646\u0633\u0648\u062E \u0634\u062F\u0647\\!*\n\n\u0631\u0628\u0627\u062A \u062C\u062F\u06CC\u062F \u0645\u0627 \u0628\u0627 \u0627\u0645\u06A9\u0627\u0646\u0627\u062A \u0628\u0647\u062A\u0631 \u0648 \u0633\u0631\u0639\u062A \u0628\u0627\u0644\u0627\u062A\u0631 \u0631\u0627\u0647\u200C\u0627\u0646\u062F\u0627\u0632\u06CC \u0634\u062F\u0647 \u0627\u0633\u062A\\.\n\u0628\u0631\u0627\u06CC \u062F\u0631\u06CC\u0627\u0641\u062A \u0627\u0639\u0644\u0627\u0646\u200C\u0647\u0627\u060C \u0628\u0647 \u0631\u0628\u0627\u062A \u062C\u062F\u06CC\u062F \u0628\u067E\u06CC\u0648\u0646\u062F\u06CC\u062F\\.\n\n\u2728 *\u0631\u0628\u0627\u062A \u062C\u062F\u06CC\u062F:* " + CONFIG.MIGRATION_NEW_BOT_HANDLE + "\n\u{1F517} " + CONFIG.MIGRATION_NEW_BOT_URL + "\n\n_\u0627\u0632 \u0647\u0645\u0631\u0627\u0647\u06CC\u200C\u062A\u0627\u0646 \u0645\u062A\u0634\u06A9\u0631\u06CC\u0645 \\- \u0645\u0646\u062A\u0638\u0631 \u0634\u0645\u0627 \u062F\u0631 \u0631\u0628\u0627\u062A \u062C\u062F\u06CC\u062F \u0647\u0633\u062A\u06CC\u0645_";
              const r = await sendTelegram(env, msg, chatId);
              if (r === true) {
                sent++;
              } else if (r === "dead") failed++;
            }
            mig.lastRound = NOW_MS;
            mig.totalSent = (mig.totalSent || 0) + sent;
            await env.STATE.put(CONFIG.KV_MIGRATION, JSON.stringify(mig)).catch(() => {});
            console.log(`\u{1F6A8} Migration broadcast: sent=${sent} failed=${failed} (round ${roundNum}/${Math.ceil(CONFIG.MIGRATION_TOTAL_DAYS / CONFIG.MIGRATION_INTERVAL_DAYS)})`);
          }
        } else {
          // Migration period over — deactivate.
          mig.active = false;
          mig.endedAt = NOW_MS;
          await env.STATE.put(CONFIG.KV_MIGRATION, JSON.stringify(mig)).catch(() => {});
          console.log(`\u2705 Migration period ended (total sent: ${mig.totalSent || 0})`);
        }
      }
    } catch (e) {
      console.error("Migration broadcast failed: " + e.message);
    }
    try {
      const fa = await maybeRunFaAi(env);
      if (fa && fa.ok && fa.learned) console.log(`\u{1F9E0} FA-AI: ${fa.learned} new Persian names learned (${fa.totalLearned} total)`);
    } catch (e) {
      console.error("FA-AI cron step failed: " + e.message);
    }
    await checkUserCap(env, chatIds.length);
    if (chatIds.length === 0) {
      console.log("\u274C No users, skipping");
      return;
    }
    try {
      const wt = await maybeSendWeeklyTables(env, chatIds);
      if (wt) console.log(`\u{1F4CA} Weekly tables digest: leagues=${wt.leagues.filter((l) => l.ok).length} sent=${wt.sent} failed=${wt.failed}`);
    } catch (e) {
      console.error("Weekly tables digest failed: " + e.message);
    }
    let fullSweepThisTick = false;
    // v13.36-nospam: the pool/fetch phase is guarded + fails to a SAFE
    // default (an empty pool with last_full_sweep pushed forward would
    // suppress reminders for a tick — a caught failure that bubbles up
    // instead would kill the heartbeat AND every later phase, with zero
    // diagnostics).
    let matches;
    // v13.43-cpukeeper: reference to the pre-merge KV pool — the prewarm
    // gate compares live fingerprints of pool vs merged to detect whether
    // the live sweep actually changed anything worth republishing.
    let poolRef = null;
    try {
      const cachedPool = await getCachedMatches(env);
      poolRef = cachedPool;
      const isActiveTime = cachedPool.some((m) => {
        if (!shouldNotify(m)) return false;
        if (isLiveStatus(m.status)) return true;
        const ko = new Date(m.utcDate).getTime();
        if (m.status === "FINISHED") return NOW - ko < CONFIG.ACTIVE_WINDOW_BEHIND_MS;
        return ko > NOW && ko - NOW < CONFIG.ACTIVE_WINDOW_AHEAD_MS;
      });
      // v13.36-nospam: last_full_sweep now lives INSIDE the cron_status_v1
      // blob (one write/tick instead of two — ~144 writes/day saved against
      // the 1,000/day free quota). getCronStatus falls back to the legacy
      // standalone key for old blobs.
      const lastSweep = parseInt(prevStatus.last_full_sweep) || 0;
      const sweepFresh = lastSweep && NOW - lastSweep < CONFIG.QUIET_SWEEP_MS;
      if (sweepFresh && cachedPool.length) {
        if (isActiveTime) {
          // v13.43-cpukeeper: ACTIVE windows no longer re-run the full
          // 3-provider sweep every tick — that sweep burns ~100ms CPU and 6
          // per hour dragged this account over the FREE-plan 10ms rolling
          // CPU average, after which CF killed EVERY cron tick at exactly
          // 10ms CPU (status=exceededResources: the 2026-09-14 00:20→10:10Z
          // and 22:00Z+ outages — hours of silent notification loss). Now:
          // full sweep at most every QUIET_SWEEP_MS (2h); between full
          // sweeps an active tick runs the cheap LIVE sweep (narrow
          // football-data ±2d + sportscore yesterday/today, ~15-25ms CPU)
          // merged over this KV pool IN MEMORY — HT/FT/result/match-start-
          // backfill windows still evaluate at full 10-min cadence.
          matches = await fetchLiveSweep(env, cachedPool);
        } else {
          matches = cachedPool;
          console.log(`\u{1F50C} Quiet period \u2014 reusing KV pool (${matches.length} matches, last sweep ${Math.round((NOW - lastSweep) / 6e4)} min ago); pre-match reminders still fire from the pool`);
        }
      } else {
        console.log("\n\u{1F4E1} Fetching matches from API...");
        matches = await fetchMatchesFromAPI(env);
        fullSweepThisTick = true;
      }
    } catch (e) {
      await alertPhaseError(env, "match-pool/fetch", e);
      matches = null;
    }
    if (!matches) {
      console.log("\u26A0\uFE0F No match pool this tick \u2014 skipping notification phases (will retry next tick)");
      return;
    }
    console.log(`\u{1F4CA} Total matches received: ${matches.length}`);
    // v13.9-reliability #5: inject the canary match into the pool. It's a
    // synthetic worthy PL big-match (Arsenal vs Chelsea) with kickoff ~25h
    // ahead, refreshed every 6h. The full notification pipeline exercises it
    // end-to-end; if the canary's reminders stop arriving, the pipeline is
    // broken. It's tagged canary:true so the public page filters it out.
    try {
      const canaryLast = parseInt(await env.STATE.get(CONFIG.KV_CANARY).catch(() => null)) || 0;
      let canary = matches.find((m) => m.canary);
      if (!canary || Date.now() - canaryLast > CONFIG.CANARY_REFRESH_MS) {
        canary = buildCanaryMatch();
        matches.push(canary);
        await env.STATE.put(CONFIG.KV_CANARY, String(Date.now()), { expirationTtl: 7 * 86400 }).catch(() => {});
        console.log(`\u{1F4A1} Canary match injected: ${canary.homeTeam.name} vs ${canary.awayTeam.name} @ ${canary.utcDate}`);
      }
    } catch (e) {
      console.error("Canary injection failed: " + e.message);
    }
    // (v13.9-reliability #1's reconcileSchedules was REMOVED in v13.43: its
    // sched_v1:* records were a decoy — the `sent` map was never updated and
    // nothing ever read them back for firing (the fire-leg was never built;
    // the v13.42 backfill legs inside isBackfillEligible + the outbox cover
    // every recovery case for real). Measured cost of the decoy: one KV read
    // per worthy match per tick — 174 reads/tick at the time of removal,
 // ~35-90ms of CPU the free-plan budget couldn't afford. The stale sched_v1:*
    // keys expire via their 7-day TTL on their own.)
    await detectStatusChanges(env, matches);
    const worthyMatches = matches.filter(shouldNotify);
    console.log(`\u{1F3AF} Matches meeting notification criteria: ${worthyMatches.length}`);
    const now = new Date();
    const upcomingMatches = worthyMatches.filter((m) => new Date(m.utcDate) > now).sort((a, b) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime()).slice(0, 10);
    if (upcomingMatches.length > 0) {
      console.log(`
\u{1F4C5} Upcoming matches (next 10):`);
      for (const match of upcomingMatches) {
        const matchTime = new Date(match.utcDate);
        const hoursUntil = (matchTime.getTime() - now.getTime()) / CONFIG.ONE_HOUR_MS;
        console.log(`  ${translateTeam(match.homeTeam.name)} vs ${translateTeam(match.awayTeam.name)}`);
        console.log(`    ${matchTime.toLocaleString("fa-IR")} (${hoursUntil.toFixed(1)}h from now)`);
      }
    }
    // v13.36-nospam: sendMatchNotifications is guarded — an exception here
    // used to kill the rest of the sweep (kickoff/FT broadcasts, digests,
    // X, heartbeat) AND the tick. Now it alerts + moves on.
    let notifySummary: Awaited<ReturnType<typeof sendMatchNotifications>> = null;
    try {
      notifySummary = await sendMatchNotifications(env, matches);
    } catch (e) {
      await alertPhaseError(env, "send-notifications", e);
    }
    // v13.13-kickoff: ALWAYS notify when a big match starts. Fires to ALL
    // chats (not just followers) when a master big-match kicks off. Own
    // try/catch so a failure here can never break the rest of the sweep.
    try {
      const bk = await broadcastBigMatchKickoff(env, matches);
      if (bk && bk.sent) console.log(`\u{1F680} Big-match kickoff broadcast: ${bk.sent}/${bk.matches} (dead=${bk.dead})`);
    } catch (e) {
      console.error("Big-match kickoff broadcast step failed: " + e.message);
    }
    // v12.x-cron-gaps: big-match FT broadcast — users who follow neither
    // team in a master-big-match still get the FT result (Real Madrid vs
    // Man City, etc.). Additive; own try/catch so a failure here can
    // never break the rest of the sweep.
    try {
      const bb = await broadcastBigMatchResults(env, matches);
      if (bb && bb.sent) console.log(`\u{1F4E4} Big-match FT broadcast: ${bb.sent}/${bb.matches} (dead=${bb.dead})`);
    } catch (e) {
      console.error("Big-match FT broadcast step failed: " + e.message);
    }
    // v12.x-cron-gaps: matchday morning digest at 9am local tz. Fires once
    // per chat per day; per-chat KV dedupe. Own try/catch.
    try {
      const md = await maybeSendMorningDigest(env, chatIds);
      if (md && md.sent) console.log(`\u{1F4C5} Morning digest: sent=${md.sent} skipped=${md.skipped}`);
    } catch (e) {
      console.error("Morning digest step failed: " + e.message);
    }
    // v12.32 (the user's ask): table-top coronation alerts \u2014 a non-first
    // team (2nd/3rd/4th\u2026) overtaking the leader after a fresh full-time
    // result gets its own special Telegram message. Own try/catch (a
    // failure here must never break the result/pre-match notifications).
    // v12.33-xpost: the events list is captured so the X mirror runs AFTER
    // Telegram (X is additive — wrapped in its own try/catch below).
    let tableToppersEvents = [];
    try {
      // v13.38-qc: coronation detection ONLY on full sweeps. The meter
      // measured the old every-tick cycle at 7 snapshot writes + 7 standings
      // reads per tick ≈ 1,000+ writes/day BY ITSELF — the single biggest
      // quota burner (quota exhaustion was the original spam trigger). Safe:
      // a coronation needs a finished-within-6h trigger match, which forces
      // active-time → every such tick IS a full sweep. Quiet ticks reuse the
      // stale KV pool where no trigger can exist, so skipping is pure win.
      const tt = fullSweepThisTick ? await maybeNotifyTableToppers(env, matches) : { sent: 0, failed: 0, events: [] };
      if (tt && tt.events && tt.events.length) {
        tableToppersEvents = tt.events;
        console.log(`\u{1F451} Table-top alerts: ${tt.events.map((e) => e.code + ":" + e.leader).join(", ")} (sent ${tt.sent}, failed ${tt.failed})`);
      }
    } catch (e) {
      console.error("Table-top detection failed: " + e.message);
    }
    // v12.33-xpost: X (Twitter) automated profile \u2014 Persian mirror of the
    // Telegram composers (coronation > FT > kickoff > weekly tables). Additive:
    // wrapped in try/catch so a failing post can NEVER fail the sweep.
    try {
      const xr = await maybePostX(env, matches, { topperEvents: tableToppersEvents });
      if (xr && (xr.sent || xr.dryRun)) console.log(`\u{1F426} X sweep: sent=${xr.sent} dryRun=${xr.dryRun} skipped=${xr.skipped} errors=${xr.errors.length}`);
    } catch (e) {
      console.error("X post step failed: " + e.message);
    }
    // v13.23-audit: compare sportsignal.ir match data (ground truth) with the
    // bot's notified_matches_v6 KV. Reports gaps — matches that should have
    // been notified but weren't. Alerts the admin if >2 gaps found.
    try {
      const audit = await auditNotifications(env, matches);
      if (audit.gaps) console.log(`\u{1F50D} Audit: ${audit.gaps}/${audit.total} gaps`);
    } catch (e) {
      console.error("Audit step failed: " + e.message);
    }
    // v13.36-nospam: single status blob — heartbeat (tick started/ended),
    // last_cron (tick completed) and last_full_sweep (folded in from the
    // old standalone key; one write/tick saved). The heartbeat is NOT
    // overwritten with a later stamp than the start-heartbeat if the tick
    // somehow re-enters — simple monotonic max.
    try {
      const prevBlob = await env.STATE.get("cron_status_v1", "json").catch(() => null) || {};
      const hb = Math.max(parseInt(prevBlob.heartbeat) || 0, NOW);
      // v13.38-qc: fold the KV write meter into the blob — actual daily burn
      // instead of pencil math. kv_writes_day resets on the UTC date change.
      const kvDay = new Date(NOW).toISOString().slice(0, 10);
      const kvWritesDay = kvWritesThisTick + ((prevBlob.kv_day === kvDay ? parseInt(prevBlob.kv_writes_day) : 0) || 0);
      if (kvWritesDay > 800) console.warn("\u26A0\uFE0F KV write budget: " + kvWritesDay + "/1000 used today — investigate write churn");
      await env.STATE.put("cron_status_v1", JSON.stringify({
        heartbeat: String(hb),
        last_cron: String(NOW),
        last_full_sweep: fullSweepThisTick ? String(NOW) : String(prevStatus.last_full_sweep || parseInt(await env.STATE.get("last_full_sweep").catch(() => null)) || 0),
        kv_day: kvDay,
        kv_writes_day: kvWritesDay,
        kv_writes_last_tick: kvWritesThisTick,
        // v13.42-rekindle: notification breadcrumb — the tick blob now
        // records what the sweep SAW and SENT (found / skipped-for-no-
        // followers / budget-deferred / per-type counts / last match
        // processed). A missed-start investigation is now a single KV read.
        notify: notifySummary ? { f: notifySummary.found, n: notifySummary.noChats, d: notifySummary.budgetDeferred, s: notifySummary.sent, l: notifySummary.last } : null
      }));
    } catch (e) {
      await env.STATE.put(CONFIG.KV_HEARTBEAT, NOW.toString()).catch(() => {
      });
      await env.STATE.put(CONFIG.KV_LAST_CRON, NOW.toString()).catch(() => {
      });
    }
    // v13.35-prewarm: kill the first-visitor cold sweep. If the public
    // payload is (nearly) expired, rebuild it NOW from the pool this tick
    // already fetched — the expensive provider sweep never runs twice, and
    // visitors between ticks always hit a warm 3-minute-fresh KV payload
    // instead of paying ~4.6s for the sweep. Budget-guarded: prewarm only
    // with ≥18 subrequests of headroom (standings need ≤6; the pool ride-
    // along needs 0). KV write math documented in public-matches.ts.
    // v13.43-cpukeeper: the payload rebuild itself is ~100ms of CPU (full
    // shaping + ~100KB stringify) — running it EVERY tick was the other half
    // of the poison that tripped the free-plan 10ms CPU average (measured
    // live: a live-sweep tick WITH prewarm = 164ms CPU). It now runs ONLY on
    // full sweeps (2h cadence) or when the live sweep actually CHANGED live
    // data (goal / HT / FT / newly-discovered fixture). Quiet ticks skip it
    // entirely; visitors between rebuilds trigger the on-demand refresh
    // (the pre-v13.35 path).
    try {
      const pub = await env.STATE.get(CONFIG.KV_PUBLIC_MATCHES, "json").catch(() => null) as any;
      const pubStale = !pub || !pub.ts || Date.now() - pub.ts >= 555e3;
      let liveChanged = false;
      if (!fullSweepThisTick && poolRef) {
        liveChanged = liveFingerprint(matches) !== liveFingerprint(poolRef);
      }
      if ((fullSweepThisTick || liveChanged) && pubStale && subrequestCount() < 30) {
        await fetchPublicMatches(env, null, { prewarm: true, pool: matches });
        console.log(`\u{1F525} Public payload pre-warmed (${fullSweepThisTick ? "full sweep" : "live data changed"}) for the next visitors`);
      }
    } catch (e) {
      console.error("Public pre-warm failed: " + e.message);
    }
    console.log(`
\u2705 Execution completed at ${(new Date()).toISOString()}
\u{1F4CA} Subrequest budget: ${subrequestCount()}/48 used (${48 - subrequestCount()} headroom under the 50-ceiling)
\u{1F4BE} KV writes this tick: ${kvWritesThisTick} — top: ${Object.entries(kvWriteKeys).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, n]) => k + "\u00d7" + n).join(", ") || "none"}`);
  } catch (error) {
    console.error(`\u274C Fatal error in scheduled logic:`, error);
    throw error;
  }
}
