// SportSignal — the bot-migration broadcast (split from cron.ts in
// v13.47-seams): if the admin started a migration (POST /api/migrate/start),
// every registered chat gets the "this bot is deprecated, join the new bot"
// message every MIGRATION_INTERVAL_DAYS for MIGRATION_TOTAL_DAYS. Per-chat
// KV dedupe so each user gets it exactly once per round (write-first —
// see the marker-gated send below).

import { CONFIG } from "./config";
import type { Env } from "./types";
import { sendTelegram } from "./telegram";
import { getRegisteredChats, getUserPrefs } from "./users";

export async function maybeBroadcastMigration(env: Env) {
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
}
