// SportSignal — the cron sweep SHELL (*/10 * * * *): installs the KV-write
// meter (wrapping env.STATE before ANY phase write), acquires the execution
// lock, sequences the phase modules, and writes the completion blob (the
// tick's LAST KV write — the meter fold). The phases live in cron-*.ts
// (v13.75-cronsplit): preflight (settings/budget/stale alert), users
// (outbox/heartbeat/migration/FA-AI), pool (the sweep decision),
// maintenance (cup scans/stamp/standings), notify (fan-out + broadcasts),
// public (prewarm + live overlay). Status/phase-alerts live in monitoring.ts;
// the migration broadcast lives in migration.ts (v13.47-seams).

import { CONFIG } from "./config";
import type { Env } from "./types";
import { resetSubrequestBudget, subrequestCount, kvOpsCount, bumpKvOp } from "./utils";
import { maybeSendWeeklyTables } from "./digest-weekly";
import { alertPhaseError } from "./monitoring";
import { runPreflight } from "./cron-preflight";
import { runUserPhase } from "./cron-users";
import { runPoolPhase } from "./cron-pool";
import { runPoolMaintenance } from "./cron-maintenance";
import { runNotifyPhase } from "./cron-notify";
import { runPublicPhase } from "./cron-public";

export async function executeScheduledLogic(env: Env) {
  resetSubrequestBudget();
  // v13.44-quotaguard: the KV-write meter now wraps the VERY FIRST action —
  // the execution-lock put and every phase write below are counted, so
  // kv_writes_day is the TRUE burn. (The v13.38 meter started after the lock
  // and the old start-heartbeat, silently undercounting by ~288 writes/day
  // — 29% of the free quota invisible to healthz.)
  let kvWritesThisTick = 0;
  const kvWriteKeys: Record<string, number> = {};
  // v13.44-quotaguard: capture the TRUE original put once per isolate — a
  // warm isolate re-enters this function every 10 min, and re-wrapping the
  // previous tick's wrapper would chain wrappers (each put traversing one
  // more layer, forever). __origPut pins the pristine binding; if the
  // runtime hands out fresh binding objects per invocation this degrades
  // gracefully to a plain re-bind.
  const origStatePut = (env.STATE as any).__origPut || env.STATE.put.bind(env.STATE);
  (env.STATE as any).__origPut = origStatePut;
  (env.STATE as any).put = (...args: unknown[]) => {
    kvWritesThisTick++;
    bumpKvOp();
    try {
      const k = String(args[0]).slice(0, 28);
      kvWriteKeys[k] = (kvWriteKeys[k] || 0) + 1;
    } catch (e) { }
    return origStatePut(...(args as [string, string, any?]));
  };
  // v13.45-sightlines (F10): KV reads/deletes are subrequests too — wrapped
  // with the same __orig pinning the put wrapper uses (STATE.list is unused
  // across the codebase, so only get/delete are wrapped). The gates (prewarm
  // <30, notify-defer >38) deliberately keep reading the FETCH-only counter:
  // they were tuned on that number. The KV-ops total is a new sightline —
  // the true per-tick load is subrequestCount() + kvOpsCount() (blob field,
  // closing log line, healthz).
  const origStateGet = (env.STATE as any).__origGet || env.STATE.get.bind(env.STATE);
  (env.STATE as any).__origGet = origStateGet;
  (env.STATE as any).get = (...args: unknown[]) => {
    bumpKvOp();
    return origStateGet(...(args as [string, any?]));
  };
  const origStateDelete = (env.STATE as any).__origDelete || env.STATE.delete.bind(env.STATE);
  (env.STATE as any).__origDelete = origStateDelete;
  (env.STATE as any).delete = (...args: unknown[]) => {
    bumpKvOp();
    return origStateDelete(...(args as [string]));
  };
  const { NOW, prevStatus, budgetSoft, budgetHard } = await runPreflight(env);
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
  // v13.44-quotaguard: the START-heartbeat put is RETIRED (−144
  // writes/day — 14% of the free quota, for a signal the lock already
  // persists). Its two jobs are covered for free: "the cron fired" is
  // proven by the execution-lock put above (own:<now>:<uuid>, TTL'd), and
  // "the tick completed" by last_cron in the completion blob below.
  // healthz (v13.43) requires BOTH freshnesses, so a mid-tick death still
  // flips ok:false within ~35min; the heartbeat field now only advances on
  // completion. (The old write also re-carried the kv_writes_day
  // accumulator mid-tick — the completion blob is now its only fold
  // point, which removes the clobber window entirely.)
  try {
    const chatIds = await runUserPhase(env, budgetSoft);
    if (!chatIds) return;
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
    const pool = await runPoolPhase(env, prevStatus, budgetHard, NOW);
    if (!pool || !pool.matches) return;
    const { matches, poolRef, poolBlob, fullSweepThisTick } = pool;
    await runPoolMaintenance(env, { fullSweepThisTick, budgetSoft, budgetHard, matches, poolRef, poolBlob });
    console.log(`\u{1F4CA} Total matches received: ${matches.length}`);
    const notifySummary = await runNotifyPhase(env, { chatIds, matches, fullSweepThisTick });
    await runPublicPhase(env, { fullSweepThisTick, budgetSoft, budgetHard, matches, poolRef });
    // v13.36-nospam: single status blob — heartbeat (tick started/ended),
    // last_cron (tick completed) and last_full_sweep (folded in from the
    // old standalone key; one write/tick saved). The heartbeat is NOT
    // overwritten with a later stamp than the start-heartbeat if the tick
    // somehow re-enters — simple monotonic max.
    // v13.44.1-truemeter: this blob is the tick's FINAL KV write. The fold
    // adds +1 for the blob's own put (the wrapper counts it as the put
    // executes, but the value stored here is computed beforehand) — the
    // stored accumulator, kv_writes_last_tick and the closing log line now
    // agree EXACTLY (v13.44 undercounted 1 write/tick = 144/day, plus the
    // prewarm writes that ran after the fold — HARD@850 was engaging at a
    // true ~994, six writes from the quota line).
    try {
      const prevBlob = await env.STATE.get("cron_status_v1", "json").catch(() => null) || {};
      const hb = Math.max(parseInt(prevBlob.heartbeat) || 0, NOW);
      // v13.38-qc: fold the KV write meter into the blob — actual daily burn
      // instead of pencil math. kv_writes_day resets on the UTC date change.
      const kvDay = new Date(NOW).toISOString().slice(0, 10);
      const kvWritesDay = kvWritesThisTick + 1 + ((prevBlob.kv_day === kvDay ? parseInt(prevBlob.kv_writes_day) : 0) || 0);
      if (kvWritesDay > 800) console.warn("\u26A0\uFE0F KV write budget: " + kvWritesDay + "/1000 used today — investigate write churn");
      await env.STATE.put("cron_status_v1", JSON.stringify({
        heartbeat: String(hb),
        last_cron: String(NOW),
        last_full_sweep: fullSweepThisTick ? String(NOW) : String(prevStatus.last_full_sweep || parseInt(await env.STATE.get("last_full_sweep").catch(() => null)) || 0),
        kv_day: kvDay,
        kv_writes_day: kvWritesDay,
        kv_writes_last_tick: kvWritesThisTick + 1,
        // v13.45-sightlines (F10): the true per-tick subrequest load —
        // fetches (subrequestCount) + KV ops (kvOpsCount) + 1 for this
        // blob's own put (the wrappers count ops as they run; this value is
        // computed beforehand — same fold shape as kv_writes_last_tick).
        // The healthcheck ping fires after the blob as one more fetch and
        // is deliberately NOT folded in (it is post-completion, not work).
        subreq_last_tick: subrequestCount() + kvOpsCount() + 1,
        kv_ops_last_tick: kvOpsCount() + 1,
        // v13.44-quotaguard: which governor level was engaged when this tick
        // started (null = healthy budget) — one KV read answers "why did
        // the prewarm/pool writes stop today".
        budget: budgetHard ? "hard" : budgetSoft ? "soft" : null,
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
    console.log(`
\u2705 Execution completed at ${(new Date()).toISOString()}
\u{1F4CA} Subrequest budget: ${subrequestCount()}/48 used (${48 - subrequestCount()} headroom under the 50-ceiling)
\u{1F4BE} KV writes this tick: ${kvWritesThisTick} — top: ${Object.entries(kvWriteKeys).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, n]) => k + "\u00d7" + n).join(", ") || "none"}
\u{1F50C} KV ops this tick: ${kvOpsCount()} (includes the completion blob's own put) — true subrequest total ${subrequestCount() + kvOpsCount()}/50 (fetches ${subrequestCount()} + KV ops ${kvOpsCount()})`);
  } catch (error) {
    console.error(`\u274C Fatal error in scheduled logic:`, error);
    throw error;
  }
}
