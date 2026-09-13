// SportSignal — the cron sweep (*/10 * * * *): stale-run alert, execution
// lock, quiet-period pool reuse, FA-AI learning, notification fan-out,
// digests, coronation alerts, X mirror, heartbeat.


import { CONFIG } from "./config";
import type { Env } from "./types";
import { toFaDigits, resetSubrequestBudget } from "./utils";
import { translateTeam, ensureFaAiCache } from "./translate";
import { shouldNotify, isLiveStatus } from "./matches";
import { maybeRunFaAi } from "./fa-ai";
import { fetchMatchesFromAPI, getCachedMatches } from "./providers";
import { sendTelegram } from "./telegram";
import { sendMatchNotifications, detectStatusChanges } from "./notifications";
import { maybeSendWeeklyTables, maybeSendMorningDigest, broadcastBigMatchResults, maybeNotifyTableToppers } from "./digest";
import { maybePostX } from "./x";
import { getRegisteredChats, checkUserCap } from "./users";
import { applySettings } from "./admin";

export async function getCronStatus(env: Env) {
  try {
    const s = await env.STATE.get("cron_status_v1", "json").catch(() => null);
    if (s && s.heartbeat) return s;
  } catch (e) {
  }
  const hb = parseInt(await env.STATE.get(CONFIG.KV_HEARTBEAT).catch(() => null)) || 0;
  const lc = parseInt(await env.STATE.get(CONFIG.KV_LAST_CRON).catch(() => null)) || 0;
  const src = await env.STATE.get(CONFIG.KV_LAST_SOURCE).catch(() => null);
  return { heartbeat: hb ? String(hb) : "0", last_cron: lc ? String(lc) : "0", api_source: src || null };
}
export async function executeScheduledLogic(env: Env) {
  resetSubrequestBudget();
  await applySettings(env);
  await ensureFaAiCache(env).catch(() => {
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
  await env.STATE.put(CONFIG.KV_EXECUTION_LOCK, lockOwner, {
    expirationTtl: Math.ceil(CONFIG.LOCK_TIMEOUT / 1e3)
  });
  const lockCheck = await env.STATE.get(CONFIG.KV_EXECUTION_LOCK).catch(() => null);
  if (lockCheck !== lockOwner) {
    console.log("\u23ED\uFE0F Lock claimed by a concurrent run, skipping");
    return;
  }
  try {
    const chatIds = await getRegisteredChats(env);
    console.log(`\u{1F465} Registered users: ${chatIds.length}`);
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
    const cachedPool = await getCachedMatches(env);
    const isActiveTime = cachedPool.some((m) => {
      if (!shouldNotify(m)) return false;
      if (isLiveStatus(m.status)) return true;
      const ko = new Date(m.utcDate).getTime();
      if (m.status === "FINISHED") return NOW - ko < CONFIG.ACTIVE_WINDOW_BEHIND_MS;
      return ko > NOW && ko - NOW < CONFIG.ACTIVE_WINDOW_AHEAD_MS;
    });
    const lastSweep = parseInt(await env.STATE.get("last_full_sweep").catch(() => null)) || 0;
    const sweepFresh = lastSweep && NOW - lastSweep < CONFIG.QUIET_SWEEP_MS;
    let matches;
    if (!isActiveTime && sweepFresh && cachedPool.length) {
      matches = cachedPool;
      console.log(`\u{1F50C} Quiet period \u2014 reusing KV pool (${matches.length} matches, last sweep ${Math.round((NOW - lastSweep) / 6e4)} min ago); pre-match reminders still fire from the pool`);
    } else {
      console.log("\n\u{1F4E1} Fetching matches from API...");
      matches = await fetchMatchesFromAPI(env);
      await env.STATE.put("last_full_sweep", String(NOW)).catch(() => {
      });
    }
    console.log(`\u{1F4CA} Total matches received: ${matches.length}`);
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
    await sendMatchNotifications(env, matches);
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
      const tt = await maybeNotifyTableToppers(env, matches);
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
    try {
      await env.STATE.put("cron_status_v1", JSON.stringify({
        heartbeat: String(NOW),
        last_cron: String(NOW)
      }));
    } catch (e) {
      await env.STATE.put(CONFIG.KV_HEARTBEAT, NOW.toString()).catch(() => {
      });
      await env.STATE.put(CONFIG.KV_LAST_CRON, NOW.toString()).catch(() => {
      });
    }
    console.log(`
\u2705 Execution completed at ${(new Date()).toISOString()}`);
  } catch (error) {
    console.error(`\u274C Fatal error in scheduled logic:`, error);
    throw error;
  }
}
