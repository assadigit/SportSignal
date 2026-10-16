// SportSignal — the cron POOL PHASE: the tick's match-data decision —
// quiet-period KV-pool reuse vs the cheap live sweep vs the full
// 3-provider sweep vs the 92-day long-view pool recovery (v13.54.1).
// Returns { matches, poolRef, poolBlob, fullSweepThisTick } (undefined =
// no pool this tick; the shell skips the notification phases).
// Extracted from cron.ts in v13.75-cronsplit.
import { CONFIG } from "./config";
import type { Env } from "./types";
import { isLiveStatus } from "./match-model";
import { shouldReport } from "./match-classify";
import { fetchMatchesFromAPI, fetchLiveSweep, fetchLongView } from "./providers";
import { alertPhaseError } from "./monitoring";

export async function runPoolPhase(env: Env, prevStatus, budgetHard: boolean, NOW: number) {
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
  // v13.55-epochflow: the RAW pool blob (not just the rows) — the quiet-tick
  // stamp-advance below needs fetchedAt + source, and reading the blob
  // once here replaces the getCachedMatches call (same KV read).
  let poolBlob: any = null;
  try {
    poolBlob = await env.STATE.get(CONFIG.KV_MATCHES_KEY, "json").catch(() => null);
    const cachedPool = poolBlob && Array.isArray(poolBlob.matches) ? poolBlob.matches : [];
    if (cachedPool.length) console.log("Using cached matches from " + (poolBlob.source || "?") + " (" + poolBlob.fetchedAt + ")");
    poolRef = cachedPool;
    const isActiveTime = cachedPool.some((m) => {
      // v13.109-consolidated: the CONSOLIDATED tier drives pool cadence —
      // one-desired fixtures stay live-tracked (website lists, digests,
      // results), so the sweep cadence is unchanged from pre-v13.109.
      if (!shouldReport(m)) return false;
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
      // v13.54.1-poolbreak: pool RECOVERY runs the 92-DAY long view. The
      // ±10-day sweep (fetchMatchesFromAPI) can't see fixtures beyond its
      // +8d window — during international breaks it legitimately returns
      // 0 league matches — and TSP's regressed league views carry ~1 event
      // each, so it could never rebuild a dead pool by itself. The long
      // view is the only complete pool-builder, and it can ONLY complete
      // in a cron tick: a visitor's ctx.waitUntil dies at ~30s (the v13.52
      // lesson — moving the long view off the request path inadvertently
      // removed the only thing that ever refilled the pool; the 595-row
      // pool from 2026-09-28 12:09Z was the LAST sync-path long view, and
      // it expired at its 24h TTL a day later with nothing able to
      // rewrite it). Triggers:
      //   - the pool is EMPTY (the 2026-09-30 deadlock: pool expired →
      //     every tick swept → the concurrent fan-out crossed CF's real
      //     ~50-subrequest ceiling → 0 matches → pool never rewritten);
      //   - the pool's fixture HORIZON is <5 days out (it can no longer
      //     feed the nextWeek card — re-enrich before it starves; the
      //     long view's own 6h+60d gate dedupes redundant runs).
      // fetchLongView is now sequential + budget-gated (FD chunks → TSP →
      // intl → sportscore-on-leftover), so this always fits the ceiling.
      const horizonMs = cachedPool.length ? Math.max(0, ...cachedPool.map((m) => new Date(m.utcDate || 0).getTime())) : 0;
      const poolBlind = !cachedPool.length || horizonMs < Date.now() + 5 * 864e5;
      console.log("\n\u{1F4E1} Fetching matches from API..." + (poolBlind ? " (pool recovery: 92-day long view)" : ""));
      // v13.44-quotaguard: HARD governor → the pool-cache write is held
      // this tick (env-scoped flag; see cacheMatches). The sweep itself
      // still runs — fresh match data feeds the notification pipeline
      // either way.
      matches = await (poolBlind ? fetchLongView(budgetHard ? { ...env, KV_BUDGET_HOLD: true } : env) : fetchMatchesFromAPI(budgetHard ? { ...env, KV_BUDGET_HOLD: true } : env));
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
  return { matches, poolRef, poolBlob, fullSweepThisTick };
}
