// SportSignal — the cron PRE-FLIGHT: settings + FA caches + the status
// read + the daily KV-write budget governor (SOFT/HARD levels + the budget
// page) + the stale-run alert. Returns the tick's shared constants (NOW,
// prevStatus, budgetSoft, budgetHard) to the shell. The KV-write meter is
// installed by the shell BEFORE this runs, so every read/write below is
// counted. Extracted from cron.ts in v13.75-cronsplit.
import { CONFIG } from "./config";
import type { Env } from "./types";
import { toFaDigits } from "./utils";
import { ensureFaAiCache, ensureFaVenueCache } from "./translate";
import { sendTelegram } from "./telegram";
import { applySettings } from "./admin";
import { getCronStatus, alertPhaseError } from "./monitoring";

export async function runPreflight(env: Env) {
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
  // v13.44-quotaguard: the daily KV-write budget governor (free tier =
  // 1,000 writes/day; the binding constraint for this whole worker). The
  // v13.38 meter MEASURED but never ACTED; now the tick sheds cosmetic
  // writes as the day's burn crosses the thresholds:
  //   SOFT (700): skip the public-payload prewarm + FA-AI learning writes.
  //   HARD (850): also hold the pool-cache write, and page the admin
  //               once/12h (write-first, KV-mark deduped).
  // NEVER gated: the execution lock, the completion status blob, dedupe
  // records, the outbox, match-status telemetry — the anti-spam +
  // monitoring set. A dedupe write that fails (real quota exhaustion)
  // already defers its send fail-closed (v13.42), so the worst case at
  // 1,000 is deferred notifications + a paged admin, never spam, never a
  // dead-looking bot.
  // v13.111-quotaslim: the burn now includes the WEB side (kv_writes_web_v1
  // — visitor rebuilds, venue caches, webhook writes, CI-crawl bursts; see
  // kv-webmeter.ts). The cron accumulator alone under-reported by the whole
  // web share (2026-10-17 03:22Z: 136 real vs 87 metered — 36% invisible),
  // so the governor could never engage against web-side bursts.
  const kvDay = new Date(NOW).toISOString().slice(0, 10);
  const cronWritesSoFar = (prevStatus.kv_day === kvDay ? parseInt(prevStatus.kv_writes_day) : 0) || 0;
  let webWritesSoFar = 0;
  try {
    const w = await env.STATE.get("kv_writes_web_v1", "json").catch(() => null);
    if (w && w.d === kvDay) webWritesSoFar = parseInt(w.n) || 0;
  } catch (e) {
  }
  const writesSoFarToday = cronWritesSoFar + webWritesSoFar;
  const budgetSoft = writesSoFarToday >= CONFIG.KV_WRITES_SOFT;
  const budgetHard = writesSoFarToday >= CONFIG.KV_WRITES_HARD;
  if (budgetSoft) console.warn(`\u{1F4B0} KV write budget: ${writesSoFarToday}/1000 today (cron ${cronWritesSoFar} + web ${webWritesSoFar}) \u2014 governor ${budgetHard ? "HARD" : "SOFT"} engaged (cosmetic writes shedding; notifications unaffected)`);
  if (budgetHard) {
    try {
      const lastBudgetAlert = parseInt(await env.STATE.get("kv_budget_alert_v1").catch(() => null)) || 0;
      if (Date.now() - lastBudgetAlert > 12 * 36e5) {
        await env.STATE.put("kv_budget_alert_v1", String(Date.now()), { expirationTtl: 43200 });
        const adminChat = parseInt(env.CHAT_ID);
        if (!isNaN(adminChat)) {
          await sendTelegram(env, "\u26A0\uFE0F *\u0633\u0642\u0641 \u0646\u0648\u0634\u062A\u0646 KV \u0646\u0632\u062F\u06CC\u06A9 \u0627\u0633\u062A* \u2014 " + toFaDigits(String(writesSoFarToday)) + " \/\u06F1\u06F0\u06F0\u06F0 \u0646\u0648\u0634\u062A\u0647 \u0627\u0645\u0631\u0648\u0632\uD83D\uDCB0 \u0635\u0631\u0641\u0647\u200C\u062C\u0648\u06CC\u06CC \u0641\u0639\u0627\u0644 \u0634\u062F\u061B \u0627\u0637\u0644\u0627\u0639\u200C\u0647\u0627\u06CC \u0627\u0635\u0644\u06CC \u0627\u062F\u0627\u0645\u0647 \u062F\u0627\u0631\u0646\u062F.", adminChat);
        }
      }
    } catch (e) {
      console.error("Budget alert failed: " + e.message);
    }
  }
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
  return { NOW, prevStatus, budgetSoft, budgetHard };
}
