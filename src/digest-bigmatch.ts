// SportSignal — the BIG-MATCH BROADCASTS: the FT result broadcast (every
// registered chat gets a finished master-big-match's FT, "result-big"
// dedupe type) and the kickoff broadcast ("match-start-big"). Both
// write-first (saveNotifiedMatch persisted before sendTelegram — a failed
// save defers the send). Extracted from digest.ts in v13.77-digestnotify.
import { CONFIG } from "./config";
import type { Env } from "./types";
import { formatResultMessage, formatMatchStartMessage, specialBanner } from "./composers";
import { isMatchFinished } from "./match-model";
import { isWithinPostMatchWindow, isMatchStartingNow } from "./match-windows";
import { getNotifiedMatches, saveNotifiedMatch, shouldSendNotification, recordDeliveries } from "./match-dedupe";
// v13.92-d1userstore: the dead-chat registry prune goes through the seam.
import { pruneChats } from "./user-store";
import { sendTelegram } from "./telegram";
import { getRegisteredChats, getUserPrefs, groupChatsByTz, userFollowsMatch, isMasterBigMatch } from "./users";
// v13.113-alquiet: the bot-silent league gate — AL big-vs-big clashes are
// site content, not broadcasts (the owner's rule).
import { isBotSilentLeague } from "./match-classify";

// only fires for users following at least one team in the match \u2014 so a
// UCL blockbuster (Real Madrid vs Man City) only notifies users who
// follow either side. This broadcast fills the gap: for any finished
// master-big-match in the post-match window, FT is sent to every
// registered chat that didn't already get it via the regular result
// path. Uses a separate "result-big" notification type so the dedupe
// map doesn't double-count against the existing "result" entry.
export async function broadcastBigMatchResults(env: Env, matches) {
  const out = { sent: 0, failed: 0, dead: 0, matches: 0 };
  try {
    if (!Array.isArray(matches) || !matches.length) return out;
    const candidates = matches.filter((m) =>
      m && isMatchFinished(m) && isWithinPostMatchWindow(m, env) && isMasterBigMatch(m)
      && !isBotSilentLeague(m.competition && m.competition.code)
    );
    if (!candidates.length) return out;
    const chatIds = await getRegisteredChats(env);
    if (!chatIds.length) return out;
    const prefs = typeof getUserPrefs === "function" ? await getUserPrefs(env) : {};
    const notifiedMatches = await getNotifiedMatches(env);
    const deadChats = [];
    for (const match of candidates) {
      out.matches++;
      // v13.36-nospam: THE MISSING DEDUPE CHECK. Since v12.x this broadcast
      // loaded notifiedMatches but never consulted it — the comment claimed
      // "deduped via result-big" while the code sent first and saved after.
      // A finished master big-match therefore re-sent its FT to all
      // non-followers on EVERY tick of the 6h post-match window (up to 36
      // copies) — the reported "bot spamming 10-20 times". Now: check →
      // write-first → send, exactly like the regular notification path.
      if (!await shouldSendNotification(env, match, "result-big", notifiedMatches)) continue;
      // Users who follow at least one team in the match already get the
      // "result" notification via the regular path \u2014 skip them here.
      const nonFollowers = chatIds.filter((c) => {
        const f = (typeof userFollowsMatch === "function" ? userFollowsMatch(prefs, c, match) : null);
        return f === null;
      });
      if (!nonFollowers.length) continue;
      const groups = (typeof groupChatsByTz === "function" ? groupChatsByTz(nonFollowers, prefs, env) : [{ tz: env.TEHRAN_TZ, lang: "fa", chats: nonFollowers }]);
      let anySuccess = false;
      // v13.5-tz-scope: per-group tz through a CLONED env (no shared-env
      // mutation — isolate-safety for concurrent requests).
      // v13.36-nospam: write-first — the dedupe record is persisted BEFORE
      // the sends so a failed KV write can never re-arm this broadcast on
      // the next tick (the outbox retries delivery; duplicates are
      // impossible).
      // v13.44-quotaguard (F3): fail-closed — gate the broadcast sends on
      // the dedupe record PERSISTING, exactly like sendNotificationIfNeeded
      // (v13.42). A failed/skipped save defers the send to the next tick;
      // an unrecorded send would re-arm and duplicate (the exact vector the
      // KV-write governor could otherwise trip under write pressure).
      const persistedBig = await saveNotifiedMatch(env, match, "result-big", notifiedMatches);
      if (!persistedBig) continue;
      const bigDeliveries: any[] = []; // {chatId, verdict}
      for (const g of groups) {
        const scopedEnv: Env = { ...env, TEHRAN_TZ: g.tz };
        const lang = g.lang || "fa";
        const message = specialBanner(match, lang) + await formatResultMessage(match, scopedEnv, lang);
        const sendResults = await Promise.allSettled(
          g.chats.map((chatId) => sendTelegram(scopedEnv, message, chatId))
        );
        sendResults.forEach((r, i) => {
          if (r.status === "fulfilled" && r.value === "dead") deadChats.push(g.chats[i]);
        });
        if (sendResults.some((r) => r.status === "fulfilled" && r.value === true)) anySuccess = true;
        // v13.102-perchat: the broadcast's per-chat verdicts → the delivery
        // ledger (the audit checks result/result-big as one equivalence
        // group over the whole registry).
        for (let i = 0; i < g.chats.length; i++) {
          const r = sendResults[i];
          const verdict = r && r.status === "fulfilled" ? (r.value === true ? "sent" : r.value === "dead" ? "dead" : "failed") : "failed";
          bigDeliveries.push({ chatId: g.chats[i], verdict });
        }
      }
      if (bigDeliveries.length) await recordDeliveries(env, match, "result-big", bigDeliveries);
      if (anySuccess) {
        out.sent++;
      }
    }
    if (deadChats.length) {
      const keep = chatIds.filter((c) => !deadChats.includes(c));
      // v13.92-d1userstore: prune via the seam (D1 / legacy blob).
      await pruneChats(env, keep);
      out.dead = deadChats.length;
    }
    if (out.sent) console.log(`\u{1F4E4} result-big broadcast: ${out.sent} big-match FTs to non-followers`);
  } catch (e) {
    console.error("Big-match result broadcast failed: " + e.message);
  }
  return out;
}
// v13.13-kickoff: ALWAYS notify when a big match starts. Fires to ALL
// registered chats (not just followers) when a master big-match (both teams
// in the master list) kicks off. Parallel to broadcastBigMatchResults but
// for kickoff. Users who follow a team already get the per-user
// match-start notification via the regular path — this broadcast reaches
// NON-followers too, so nobody misses a big-match kickoff. Deduped via
// "match-start-big" so it fires exactly once per match.
export async function broadcastBigMatchKickoff(env: Env, matches) {
  const out = { sent: 0, failed: 0, dead: 0, matches: 0 };
  try {
    if (!Array.isArray(matches) || !matches.length) return out;
    const candidates = matches.filter((m) =>
      m && isMatchStartingNow(m, env) && isMasterBigMatch(m)
      && !isBotSilentLeague(m.competition && m.competition.code)
    );
    if (!candidates.length) return out;
    const chatIds = await getRegisteredChats(env);
    if (!chatIds.length) return out;
    const prefs = typeof getUserPrefs === "function" ? await getUserPrefs(env) : {};
    const notifiedMatches = await getNotifiedMatches(env);
    const deadChats = [];
    for (const match of candidates) {
      out.matches++;
      // v13.36-nospam: THE MISSING DEDUPE CHECK (same bug as result-big —
      // the comment said "deduped via match-start-big" but nothing ever
      // consulted the dedupe state before sending). The kickoff broadcast
      // re-sent to ALL chats on every tick of the -1..+45min window. Now:
      // check → write-first → send.
      if (!await shouldSendNotification(env, match, "match-start-big", notifiedMatches)) continue;
      // ALL chats get the big-match kickoff (not just non-followers — the
      // user's ask: "always send notification when a big match is started").
      const groups = (typeof groupChatsByTz === "function" ? groupChatsByTz(chatIds, prefs, env) : [{ tz: env.TEHRAN_TZ, lang: "fa", chats: chatIds }]);
      let anySuccess = false;
      // v13.36-nospam: write-first (see result-big above).
      // v13.44-quotaguard (F3): fail-closed — same gate as result-big above.
      const persistedBig = await saveNotifiedMatch(env, match, "match-start-big", notifiedMatches);
      if (!persistedBig) continue;
      const koDeliveries: any[] = []; // {chatId, verdict}
      for (const g of groups) {
        const scopedEnv: Env = { ...env, TEHRAN_TZ: g.tz };
        const lang = g.lang || "fa";
        const message = specialBanner(match, lang) + await formatMatchStartMessage(match, scopedEnv, lang);
        const sendResults = await Promise.allSettled(
          g.chats.map((chatId) => sendTelegram(scopedEnv, message, chatId))
        );
        sendResults.forEach((r, i) => {
          if (r.status === "fulfilled" && r.value === "dead") deadChats.push(g.chats[i]);
        });
        if (sendResults.some((r) => r.status === "fulfilled" && r.value === true)) anySuccess = true;
        // v13.102-perchat: same ledger discipline as result-big (the audit
        // checks match-start/match-start-big as one group over the registry).
        for (let i = 0; i < g.chats.length; i++) {
          const r = sendResults[i];
          const verdict = r && r.status === "fulfilled" ? (r.value === true ? "sent" : r.value === "dead" ? "dead" : "failed") : "failed";
          koDeliveries.push({ chatId: g.chats[i], verdict });
        }
      }
      if (koDeliveries.length) await recordDeliveries(env, match, "match-start-big", koDeliveries);
      if (anySuccess) {
        out.sent++;
      }
    }
    if (deadChats.length) {
      const keep = chatIds.filter((c) => !deadChats.includes(c));
      // v13.92-d1userstore: prune via the seam (D1 / legacy blob).
      await pruneChats(env, keep);
      out.dead = deadChats.length;
    }
    if (out.sent) console.log(`\u{1F680} match-start-big broadcast: ${out.sent} big-match kickoffs to all chats`);
  } catch (e) {
    console.error("Big-match kickoff broadcast failed: " + e.message);
  }
  return out;
}
// v12.32 (the user's ask): "When a team that is not in the first place, such
// as a team that is second, third, or fourth in the table, reaches the top
// of the table, a special notification should be sent in the Telegram bot.
// For example, if Liverpool is second in the table and Manchester City is
// first. If Liverpool beats Newcastle, it reaches the top of the table, the
