// SportSignal — the cron USER PHASE: the registered-chat list (guarded,
// fail-closed), the dead-letter outbox drain, the 6h admin heartbeat
// (v13.70: loud when CHAT_ID is unparseable), the migration broadcast,
// FA-AI learning (gated on the SOFT budget) and the user-cap check.
// Returns the chat list (null = guarded failure; the shell skips the tick).
// Extracted from cron.ts in v13.75-cronsplit.
import { CONFIG } from "./config";
import type { Env } from "./types";
import { getRegisteredChats, checkUserCap } from "./users";
import { sendTelegram, drainOutbox } from "./telegram";
import { maybeRunFaAi } from "./fa-ai";
import { alertPhaseError } from "./monitoring";
import { maybeBroadcastMigration } from "./migration";

export async function runUserPhase(env: Env, budgetSoft: boolean) {
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
      } else {
        // v13.70-adminpulse: this was SILENT — with an unparseable CHAT_ID
        // the entire admin-paging layer (this heartbeat, alertPhaseError
        // pages, budget pages, audit gap reports, cap warnings) sat dead
        // while healthz showed green (observed live: heartbeat_sent_v1 and
        // audit_alert_v1 — the only stamps written INSIDE the guard —
        // never existed). Loud now; /healthz carries admin_alerts_ok so
        // external monitors can page on it. Fix: wrangler secret put CHAT_ID.
        console.error("\u26A0\uFE0F CHAT_ID secret is missing/unparseable \u2014 every admin alert path (heartbeat, phase-error pages, budget/audit/cap alerts) is DISABLED. Fix: npx wrangler secret put CHAT_ID (numeric Telegram chat id)");
      }
    }
  } catch (e) {
    console.error("Heartbeat failed: " + e.message);
  }
  // v13.11-migration: bot migration broadcast. If the admin has started a
  // migration (POST /api/migrate/start), send a "this bot is deprecated,
  // join the new bot" message to all registered chats every 3 days for 2
  // weeks. Per-chat KV dedupe so each user gets it exactly once per round.
  // v13.47-seams: the broadcast itself lives in migration.ts.
  try {
    await maybeBroadcastMigration(env);
  } catch (e) {
    console.error("Migration broadcast failed: " + e.message);
  }
  try {
    // v13.44-quotaguard: FA-AI learning is a cosmetic write — skip under
    // the SOFT governor (names re-learn on a healthier day; the existing
    // fa_teams_ai cache keeps serving reads).
    if (!budgetSoft) {
      const fa = await maybeRunFaAi(env);
      if (fa && fa.ok && fa.learned) console.log(`\u{1F9E0} FA-AI: ${fa.learned} new Persian names learned (${fa.totalLearned} total)`);
    } else {
      console.log("\u{1F4B0} KV write budget: FA-AI learning skipped (soft governor)");
    }
  } catch (e) {
    console.error("FA-AI cron step failed: " + e.message);
  }
  await checkUserCap(env, chatIds.length);
  return chatIds;
}
