// SportSignal — the WEB-SIDE KV write meter (v13.111-quotaslim).
//
// THE BLIND-METER BUG this closes: the cron shell (cron.ts) counts every
// STATE.put it makes and folds the day's total into cron_status_v1
// (kv_writes_day) — but ONLY cron-tick writes. Web-invocation writes
// (visitor-triggered public-payload rebuilds + snapshot refreshes, the SEO
// render path's venue caches, the admin panel, Telegram-webhook follow/
// preference writes, and the CI crawler's crawl-induced writes) were
// INVISIBLE: on 2026-10-17 03:22Z the account had burned 136 writes while
// the meter said 87 — 36% of the day's real burn unknown to the governor,
// so the SOFT/HARD shed levels could never fire against web-side bursts
// (the 2026-10-14 breach: 1,273 writes, ~13 CI runs + dev-session traffic,
// while healthz reported a healthy cron-only number).
//
// Design (chosen to cost almost nothing against the very quota it guards):
//   - installWebKvMeter(env) wraps STATE.put/delete once per isolate,
//     pinning the PRISTINE binding under __origPut (the SAME pin cron.ts
//     uses — whoever wraps first, both meters always call the pristine
//     binding; a re-wrap is a no-op chain, never a double-count: each write
//     executes through exactly ONE wrapper, whichever is installed).
//     Every wrapped put/delete increments the module-global pendingWeb.
//   - maybeFlushWebKvWrites() is called at the END of every web invocation
//     (and after the webhook's waitUntil chain). It is THROTTLED: flush
//     only when ≥8 writes are pending OR the last flush was ≥5min ago.
//     A flush = one KV read + one KV put of {d, n} (the flush's own put is
//     included in n — honest to the last write). Amortized overhead on a
//     burst day (CI crawl ≈ hundreds of single-write invocations across a
//     couple of warm isolates): ~12% of the counted writes; on a quiet day
//     (a handful of webhook commands): a couple of flushes, total.
//   - The governor (cron-preflight), healthz, the admin /status card and
//     the public-rebuild budget guard all read cronN + webN (see
//     monitoring.ts getDailyWrites) — the sum is the honest daily burn.
//
// Attribution nuance (accepted): whichever wrapper is installed at the
// moment a put executes attributes it (cron vs web). A web request landing
// mid-tick re-installs the web wrapper, so the rest of THAT tick's writes
// count as web — the tick's own count drops by the same amount, keeping
// the SUM exact. Flush lag is ≤5min; a killed invocation can lose its
// pending count — the meter is a safety governor, not billing.

import type { Env } from "./types";
import { bumpKvOp } from "./utils";

export const KV_WRITES_WEB_KEY = "kv_writes_web_v1";

var pendingWeb = 0;
var lastWebFlushAt = 0;

export function webWritesPending() {
  return pendingWeb;
}

export function installWebKvMeter(env: Env) {
  const S: any = env && (env.STATE as any);
  if (!S || !S.put) return;
  // Identity check, NOT a boolean flag: cron.ts re-installs ITS wrapper at
  // every tick start (S.put = cronWrapper), which would leave a stale
  // "installed" flag lying and this meter permanently dead. Re-installing
  // whenever S.put isn't ours keeps the web meter live across tick cycles
  // at the cost of one closure per invocation.
  if (S.put === S.__webPutWrapper && S.delete === S.__webDeleteWrapper) return;
  // The shared pristine pin: cron.ts reads/writes __origPut with the same
  // semantics — "the binding untouched by ANY meter". Pinning through it
  // when it already exists means our wrapper (and any later cron wrapper)
  // always terminates at the pristine put.
  const origPut = S.__origPut || S.put.bind(S);
  S.__origPut = origPut;
  const origDelete = S.__origDelete || S.delete.bind(S);
  S.__origDelete = origDelete;
  const putWrapper = (...args: unknown[]) => {
    pendingWeb++;
    try { bumpKvOp(); } catch (e) { }
    return origPut(...(args as [string, string, any?]));
  };
  // KV deletes bill against the same daily write class as puts on the free
  // tier — counted, unlike the cron meter (which only counts puts). Rare
  // either way (~1-8/day).
  const deleteWrapper = (...args: unknown[]) => {
    pendingWeb++;
    try { bumpKvOp(); } catch (e) { }
    return origDelete(...(args as [string]));
  };
  S.__webPutWrapper = putWrapper;
  S.__webDeleteWrapper = deleteWrapper;
  S.put = putWrapper;
  S.delete = deleteWrapper;
}

export function maybeFlushWebKvWrites(env: Env, ctx) {
  if (!env || !ctx || pendingWeb <= 0) return;
  const now = Date.now();
  // v13.111-quotaslim: the throttle — batch small trickles into ≥5min
  // windows, flush big bursts immediately. 8 ≈ the writes of two public
  // rebuilds; below that the counter waits so a lone webhook command
  // doesn't mint a +1 write of metering overhead for 2 writes of signal.
  if (pendingWeb < 8 && lastWebFlushAt && now - lastWebFlushAt < 5 * 60e3) return;
  lastWebFlushAt = now;
  const n = pendingWeb;
  pendingWeb = 0;
  const S: any = env.STATE;
  const pristinePut = (S && (S.__origPut || S.put.bind(S))) || null;
  if (!pristinePut) return;
  ctx.waitUntil((async () => {
    try {
      const day = new Date().toISOString().slice(0, 10);
      const prev = await env.STATE.get(KV_WRITES_WEB_KEY, "json").catch(() => null);
      const base = prev && prev.d === day ? (parseInt(prev.n) || 0) : 0;
      // +1 = this flush's own put (it bypasses the meters, so it must be
      // accounted here — the same fold trick cron.ts uses for its blob).
      await pristinePut(KV_WRITES_WEB_KEY, JSON.stringify({ d: day, n: base + n + 1 }), { expirationTtl: 90000 });
    } catch (e) {
      // A lost flush loses the count, not the writes themselves — the
      // governor under-reports by that burst. Acceptable floor semantics.
      console.warn("kv-webmeter flush failed: " + (e && e.message));
    }
  })());
}
