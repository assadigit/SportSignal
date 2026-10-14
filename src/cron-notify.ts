// SportSignal — the cron NOTIFY phase: status-change detection, the
// guarded fan-out (sendMatchNotifications with its breadcrumb summary),
// the big-match kickoff + FT broadcasts, the morning digest, coronation
// alerts (full sweeps only) and the notification audit. Returns the
// notify breadcrumb for the completion blob. Extracted from cron.ts in
// v13.75-cronsplit.
import { CONFIG } from "./config";
import type { Env } from "./types";
import { shouldNotify } from "./match-classify";
import { translateTeam } from "./translate";
import { sendMatchNotifications, repairPerChatGaps } from "./notify-engine";
import { detectStatusChanges } from "./notify-status";
import { auditNotifications } from "./notify-audit";
import { broadcastBigMatchResults, broadcastBigMatchKickoff } from "./digest-bigmatch";
import { maybeSendMorningDigest } from "./digest-morning";
import { maybeSendNightDigest } from "./digest-night";
import { maybeSendUclNightPreview } from "./digest-uclnight";
import { maybeNotifyTableToppers } from "./digest-coronation";
import { ensureBotMenu } from "./telegram";
import { alertPhaseError } from "./monitoring";

export async function runNotifyPhase(env: Env, ctx) {
  const { chatIds, matches, fullSweepThisTick } = ctx;
  // v13.99-botmenu: the "/" command menu (setMyCommands) — once per VERSION
  // (KV-flagged; ~4 Telegram calls, then nothing per tick). Own try/catch:
  // a menu hiccup must never touch the notify path.
  try {
    await ensureBotMenu(env);
  } catch (e) {
    console.error("Bot menu registration step failed: " + e.message);
  }
  // (v13.9-reliability #5's canary injection was REMOVED in
  // v13.44-quotaguard — audit F9: cacheMatches runs BEFORE the injection,
  // so the canary never persisted and its 24h/3h/1h windows NEVER opened;
  // every tick minted a fresh +25h kickoff + a canary_match_v1 write
  // (~144 writes/day of the 1,000/day free quota for zero value, plus
  // notify-path reads for a phantom match). Pipeline visibility lives in
  // the notify breadcrumb (v13.42) + auditNotifications + the 6h admin
  // heartbeat.)
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
  // heartbeat) AND the tick. Now it alerts + moves on.
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
  // v13.99-uclgif: the UCL night preview — the UCL.gif banner + the evening's
  // CL fixture list with kickoff times, once per chat per UCL day (first
  // tick inside [T-6h, T-10min]). Own try/catch; wall-guarded inside.
  try {
    const up = await maybeSendUclNightPreview(env, chatIds, matches);
    if (up && up.sent) console.log(`\u{1F3AF} UCL night preview: sent=${up.sent} skipped=${up.skipped}`);
  } catch (e) {
    console.error("UCL preview step failed: " + e.message);
  }
  // v12.x-cron-gaps: matchday morning digest at 9am local tz. Fires once
  // per chat per day; per-chat KV dedupe. Own try/catch.
  try {
    const md = await maybeSendMorningDigest(env, chatIds);
    if (md && md.sent) console.log(`\u{1F4C5} Morning digest: sent=${md.sent} skipped=${md.skipped}`);
  } catch (e) {
    console.error("Morning digest step failed: " + e.message);
  }
  // v13.96-nightdigest: the end-of-night consolidated results digest — one
  // message per chat with every result of the night, followed-team
  // sentences + current table rank. Fires when the tz-local matchday is
  // over (all FINISHED / resolved); the merged live pool rides in via ctx
  // so tonight's statuses are final minutes before the KV pool persists
  // them. Own try/catch; subrequest-wall-guarded inside.
  try {
    const nd = await maybeSendNightDigest(env, chatIds, matches);
    if (nd && (nd.sent || nd.notOver)) console.log(`\u{1F319} Night digest: sent=${nd.sent} skipped=${nd.skipped} notOver=${nd.notOver}`);
  } catch (e) {
    console.error("Night digest step failed: " + e.message);
  }
  // v12.32 (the user's ask): table-top coronation alerts \u2014 a non-first
  // team (2nd/3rd/4th\u2026) overtaking the leader after a fresh full-time
  // result gets its own special Telegram message. Own try/catch (a
  // failure here must never break the result/pre-match notifications).
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
      console.log(`\u{1F451} Table-top alerts: ${tt.events.map((e) => e.code + ":" + e.leader).join(", ")} (sent ${tt.sent}, failed ${tt.failed})`);
    }
  } catch (e) {
    console.error("Table-top detection failed: " + e.message);
  }
  // v13.23-audit: compare sportsignal.ir match data (ground truth) with the
  // bot's notified_matches_v6 KV. Reports gaps — matches that should have
  // been notified but weren't. Alerts the admin if >2 gaps found.
  try {
    const audit = await auditNotifications(env, matches);
    if (audit.gaps) console.log(`\u{1F50D} Audit: ${audit.gaps}/${audit.total} gaps`);
    // v13.102-perchat: the PER-CHAT REPAIR — every stage the audit found
    // missing delivery rows for (the CPU-kill mid-fan-out shape) is re-sent
    // to exactly the no-row chats while its window is still open (write-first
    // repair marker: one attempt per match+type+chat, ever). Own try/catch —
    // a repair failure must never touch the sweep.
    if (audit.perChatGaps && audit.perChatGaps.length) {
      try {
        const rep = await repairPerChatGaps(env, matches, audit.perChatGaps);
        if (rep && rep.repaired) console.log(`\u{1FA79} Per-chat repair: ${rep.repaired} send(s) recovered this tick`);
      } catch (e) {
        console.error("Per-chat repair step failed: " + e.message);
      }
    }
  } catch (e) {
    console.error("Audit step failed: " + e.message);
  }
  return notifySummary;
}
