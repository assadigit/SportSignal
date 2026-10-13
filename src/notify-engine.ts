// SportSignal — the notification ENGINE: the NOTIFICATION_CONFIGS window/
// formatter table, sendNotificationIfNeeded (the per-match send with the
// write-first dedupe gate + per-chat card fallback) and sendMatchNotifications
// (the fan-out with dead-chat pruning, horizon fence and the breadcrumb
// summary). Extracted from notifications.ts in v13.77-digestnotify.
import { CONFIG } from "./config";
import { COMP_EN } from "./tables";
import type { Env } from "./types";
import { getNowTehran, subrequestCount } from "./utils";
import { normalizeTeamName } from "./teams";
import { matchKey } from "./dedupe";
import { translateTeam, getCompetitionPriority } from "./translate";
import { isMatchFinished } from "./match-model";
import { isWithin24HourWindow, isWithinBigMatchWindow, isWithin3HourWindow, isWithin1HourWindow, isWithin5MinWindow, isMatchStartingNow, isWithinPostMatchWindow, isBackfillEligible } from "./match-windows";
import { getNotifiedMatches, saveNotifiedMatch, shouldSendNotification, cleanupExpiredNotifications } from "./match-dedupe";
import { shouldNotify } from "./match-classify";
import { format24HourMessage, formatBigMatchMessage, format3HourMessage, format1HourMessage, format5MinMessage, formatMatchStartMessage, formatResultMessage, specialBanner } from "./composers";
import { sendTelegram, sendDice, sendPhotoBinary } from "./telegram";
import { renderCardPngCached } from "./card";
import { getRegisteredChats, getUserPrefs, groupChatsByTz, userFollowsMatch, isBigMatch, isMasterBigMatch } from "./users";

export const NOTIFICATION_CONFIGS = [
  {
    // Mode B (priority): only fires for users following BOTH teams
    type: "pre-match-72h",
    windowCheck: isWithinBigMatchWindow,
    messageFormatter: formatBigMatchMessage,
    requiresFuture: true,
    bigMatchOnly: true
  },
  {
    type: "pre-match-24h",
    windowCheck: isWithin24HourWindow,
    messageFormatter: format24HourMessage,
    requiresFuture: true
  },
  {
    type: "pre-match-3h",
    windowCheck: isWithin3HourWindow,
    messageFormatter: format3HourMessage,
    requiresFuture: true
  },
  {
    type: "pre-match-1h",
    windowCheck: isWithin1HourWindow,
    messageFormatter: format1HourMessage,
    requiresFuture: true
  },
  {
    // v12.x-cron-gaps: 5-minute "kickoff now" reminder. BIG matches only
    // (both teams in master team list). Lean text per the user's "reduce
    // noise" ask.
    type: "pre-match-5min",
    windowCheck: isWithin5MinWindow,
    messageFormatter: format5MinMessage,
    requiresFuture: true,
    bigMatchOnly: true
  },
  {
    type: "match-start",
    windowCheck: isMatchStartingNow,
    messageFormatter: formatMatchStartMessage,
    // ✅ FIX Bug #2: must be false — isMatchStartingNow allows up to 5 min AFTER
    // kick-off as a grace window. requiresFuture:true was short-circuiting the
    // entire notification the moment the clock ticked past the scheduled start time.
    requiresFuture: false
  },
  {
    type: "result",
    windowCheck: (match, env) => isWithinPostMatchWindow(match, env),
    messageFormatter: formatResultMessage,
    requiresFuture: false
  }
];
export async function sendNotificationIfNeeded(match, config, chatGroups, env, counts, notifiedMatches, deadChats) {
  const matchTime = new Date(match.utcDate);
  const isFuture = matchTime > new Date();
  const isFinished = isMatchFinished(match);
  if (config.requiresFuture && !isFuture) return;
  if (config.type === "result" && !isFinished) return;
  let late = false;
  if (!config.windowCheck(match, env)) {
    if (!isBackfillEligible(match, config.type, env)) return;
    late = true;
  }
  const shouldSend = await shouldSendNotification(env, match, config.type, notifiedMatches);
  if (!shouldSend) return;
  // v13.36-nospam: WRITE-FIRST dedupe — and v13.42-rekindle makes that
  // promise REAL: the send only proceeds if the record PERSISTED. The old
  // order (send → save) was the spam engine (a failed KV save left the
  // notification "unrecorded" → re-sent by the next isolate). v13.36 fixed
  // the order but still sent on save failure while claiming "fail closed"
  // — meaning an unrecorded delivery + zero retries if the send also
  // failed (observed 2026-09-14: the Torino-Roma pre-match delivered with
  // NO dedupe record ever persisted). Now a KV failure defers the send to
  // the next tick: nothing sent, nothing lost, duplicates impossible. A
  // send that later hard-fails is still recovered by the outbox.
  const persisted = await saveNotifiedMatch(env, match, config.type, notifiedMatches);
  if (!persisted) {
    console.warn("\u23F8 Dedupe save failed for " + config.type + " (match " + match.id + ") — send deferred to the next tick (fail-closed anti-spam)");
    return;
  }
  let anySuccess = false;
  // v13.5-tz-scope: each chat-group's timezone flows through a CLONED env
  // instead of mutating the shared env object — the same isolate-safety fix
  // the /next handler got in v13.2 (concurrent requests can no longer observe
  // another group's TZ mid-flight).
  for (const g of chatGroups) {
    const scopedEnv: Env = { ...env, TEHRAN_TZ: g.tz };
    const lang = g.lang || "fa";
    // v13.42-rekindle: the formatter call had ZERO guard — an exception
    // here aborted sendNotificationIfNeeded AND the whole
    // sendMatchNotifications match-loop (every later match silently
    // skipped that tick, invocation still error=0). All current formatters
    // are fail-safe, but one regression must never cost a whole matchday.
    let message = "";
    try {
      message = specialBanner(match, lang) + await config.messageFormatter(match, scopedEnv, lang);
    } catch (e) {
      console.error("Formatter failed for " + config.type + " (match " + match.id + ", tz " + g.tz + "): " + e.message);
      continue;
    }
    if (late) message += "\n\n" + (lang === "en" ? "This reminder was sent late" : "\u0627\u06CC\u0646 \u06CC\u0627\u062F\u0622\u0648\u0631\u06CC \u0628\u0627 \u062A\u0623\u062E\u06CC\u0631 \u0627\u0631\u0633\u0627\u0644 \u0634\u062F");
    // v13.22-promo: website promotion footer on every notification. The user's
    // exact format: a separator line, then the promo text + the site URL.
    message += lang === "en"
      ? "\n\n\\-\\-\\-\\-\\-\\-\nView league tables and the biggest upcoming matches:\nhttps://sportsignal\\.ir"
      : "\n\n\\-\\-\\-\\-\\-\\-\n\u0645\u0634\u0627\u0647\u062F\u0647 \u062C\u062F\u0648\u0644 \u0644\u06CC\u06AF\u200C\u0647\u0627 \u0648 \u0645\u0647\u0645\u062A\u0631\u06CC\u0646 \u0628\u0627\u0632\u06CC\u200C\u0647\u0627\u06CC \u067E\u06CC\u0634 \u0631\u0648:\nhttps://sportsignal\\.ir";
    // v13.10-animated: for match-start, send an animated ⚽ dice FIRST (a
    // spinning football that signals "kickoff!") before the text message.
    // This is Telegram's built-in sendDice animation — zero asset hosting.
    // v13.15-reliability: fire-and-forget (no await) so a slow/failed dice
    // never blocks the text notification. The text is the critical path.
    if (config.type === "match-start" && !late) {
      g.chats.forEach((chatId) => { sendDice(scopedEnv, chatId, "\u26BD").catch(() => null); });
    }
    // v13.19-every-card: send a visual match CARD for EVERY notification type
    // (72h, 24h, 3h, 1h, 5min, match-start, result) — including late
    // backfills. The card image carries the crests + layout; the caption
    // carries the full match text. If the card send fails for a chat, the
    // text fallback below covers THAT chat so the notification is never lost.
    // v13.69-cardfallback: PER-CHAT verdicts. The old group-level gate
    // (cardSent = cardResults.some(true)) marked the whole tz-group served
    // when ONE chat's photo landed — every chat whose card send failed
    // (transient 5xx/429, upload blip) got NOTHING: the group text fallback
    // was skipped AND the write-first dedupe record was already persisted,
    // so that user silently missed the alert with no retry path. Now each
    // chat that did not CONFIRMEDLY receive the card (true) or is confirmed
    // dead gets its own text fallback send.
    let cardResults: any[] = [];
    let cardsAttempted = false;
    if (match.homeTeam.crest || match.awayTeam.crest) {
      try {
        const pngBuf = await renderCardPngCached(scopedEnv, match, lang);
        if (pngBuf) {
          cardsAttempted = true;
          // The caption is the full match text (specialBanner + formatter +
          // late tag if applicable). Truncate to 1024 (Telegram caption
          // limit) — the result formatter's standings line can push it long.
          const caption = message.length > 1024 ? message.slice(0, 1020) + "…" : message;
          cardResults = await Promise.allSettled(
            g.chats.map((chatId) => sendPhotoBinary(scopedEnv, chatId, pngBuf, caption, true))
          );
          // Track dead chats from the card send too.
          cardResults.forEach((r, i) => {
            if (r.status === "fulfilled" && r.value === "dead") deadChats.push(g.chats[i]);
          });
        }
      } catch (e) {
        console.warn("Card render/send failed, falling back to text: " + e.message);
      }
    }
    // Text fallback for EXACTLY the chats the card did not reach (no card
    // attempted, send failed, or send rejected). Dead chats are excluded —
    // they are pruned below.
    const needText = g.chats.filter((_chatId, i) => {
      if (!cardsAttempted) return true;
      const r = cardResults[i];
      return !(r.status === "fulfilled" && (r.value === true || r.value === "dead"));
    });
    if (needText.length) {
      const textResults = await Promise.allSettled(
        needText.map((chatId) => sendTelegram(scopedEnv, message, chatId))
      );
      textResults.forEach((r, i) => {
        if (r.status === "fulfilled" && r.value === "dead") deadChats.push(needText[i]);
      });
      if (textResults.some((r) => r.status === "fulfilled" && r.value === true)) anySuccess = true;
    }
    // A confirmed card delivery counts as success too — the old code only
    // counted text sends, so card-only notifications were invisible to the
    // breadcrumb summary (notify.s) and the tick logs.
    if (cardResults.some((r) => r.status === "fulfilled" && r.value === true)) anySuccess = true;
  }
  if (anySuccess) {
    counts[config.type]++;
    console.log(`\u{1F4E4} Sent ${config.type.toUpperCase()} notification for match ${match.id}`);
  }
}
export async function sendMatchNotifications(env: Env, matches) {
  const chatIds = await getRegisteredChats(env);
  if (chatIds.length === 0) {
    console.log("\u274C No users to notify");
    return;
  }
  const prefs = await getUserPrefs(env);
  const nowMs = Date.now();
  // v13.36-nospam: the past/future horizon — "focus on the upcoming events,
  // not the past". A match may only notify inside [-26h, +73h] of its
  // kickoff: +73h covers the 72h big-match pre-window, -26h covers the
  // widest look-back any type can still legally fire in (the result
  // backfill ends at kickoff+24h). Everything outside is dead weight —
  // scanning it wastes the sweep and any bug that re-opens an old window
  // would resurrect week-old results. PAST EVENTS REMIND AT MOST ONCE
  // (the never-expire line in shouldSendNotification does the "at most
  // once" part; this horizon is the hard outer fence).
  const MIN_MS = nowMs - 26 * 36e5;
  const MAX_MS = nowMs + 73 * 36e5;
  const notifyMatches = matches.filter((m) => {
    if (!shouldNotify(m)) return false;
    const t = new Date(m.utcDate).getTime();
    return t >= MIN_MS && t <= MAX_MS;
  });
  if (notifyMatches.length === 0) {
    console.log("\u2705 No matches meet the notification criteria");
    return;
  }
  await cleanupExpiredNotifications(env);
  const notifiedMatches = await getNotifiedMatches(env);
  console.log(`\u{1F4E8} Found ${notifyMatches.length} matches to potentially notify`);
  notifyMatches.sort((a, b) => {
    const bigA = isMasterBigMatch(a) ? 1 : 0;
    const bigB = isMasterBigMatch(b) ? 1 : 0;
    if (bigA !== bigB) return bigB - bigA;
    const priorityDiff = getCompetitionPriority(a.competition.code) - getCompetitionPriority(b.competition.code);
    if (priorityDiff !== 0) return priorityDiff;
    return new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime();
  });
  const nowTehran = getNowTehran(env);
  console.log(`\u{1F552} Current Tehran time: ${nowTehran.toLocaleString("fa-IR")}`);
  const notificationCounts = {
    "pre-match-72h": 0,
    "pre-match-24h": 0,
    "pre-match-3h": 0,
    "pre-match-1h": 0,
    "pre-match-5min": 0,
    "match-start": 0,
    "result": 0
  };
  const deadChats = [];
  let budgetDeferred = 0;
  // v13.42-rekindle: breadcrumb summary — folded into cron_status_v1 by the
  // caller. The 2026-09-14 Torino-Roma missed-start took an hour of
  // forensics because the sweep's decisions were invisible after the fact
  // (no retained logs, no counters). Now the tick blob answers: did the
  // sweep see the match, was it skipped for no followers, what fired?
  const notifySummary = { found: notifyMatches.length, noChats: 0, budgetDeferred: 0, sent: notificationCounts, last: null as string | null };
  for (const match of notifyMatches) {
    const matchChats = chatIds.filter((c) => userFollowsMatch(prefs, c, match));
    if (!matchChats.length) { notifySummary.noChats++; continue; }
    notifySummary.last = matchKey(match);
    // v13.9-reliability #6: subrequest-budget guard. If the budget is low
    // (<10 remaining under the 48 cap), stop sending THIS sweep and let the
    // next sweep pick up the rest. The dedupe KV hasn't been written for
    // unsent notifications, so they'll fire next time. This prevents silent
    // budget-exhaustion skips on busy matchdays (40 matches × 7 configs).
    // v13.15-reliability: match-start is EXEMPT from the guard — the window
    // is narrow (-1..+45min) + missing it means the user never learns the
    // match started. Always process match-start even if the budget is low
    // (it's a single send per chat, ~1 subrequest).
    const now = Date.now();
    const matchStartActive = (() => {
      const mt = new Date(match.utcDate).getTime();
      const minSince = (now - mt) / 60000;
      return minSince >= -1 && minSince <= 45;
    })();
    if (subrequestCount() > 38 && !matchStartActive) {
      budgetDeferred++;
      continue;
    }
    const chatGroups = groupChatsByTz(matchChats, prefs, env);
    const matchTime = new Date(match.utcDate);
    console.log(`
\u{1F3AF} Processing: ${translateTeam(match.homeTeam.name)} vs ${translateTeam(match.awayTeam.name)}`);
    console.log(`   Match time: ${matchTime.toLocaleString("fa-IR")}`);
    console.log(`   Status: ${match.status}`);
    for (const config of NOTIFICATION_CONFIGS) {
      if (config.bigMatchOnly) {
        const both = matchChats.filter((c) => isBigMatch(match, prefs, c));
        if (!both.length) continue;
        const bigGroups = groupChatsByTz(both, prefs, env);
        await sendNotificationIfNeeded(match, config, bigGroups, env, notificationCounts, notifiedMatches, deadChats);
        continue;
      }
      await sendNotificationIfNeeded(match, config, chatGroups, env, notificationCounts, notifiedMatches, deadChats);
    }
  }
  if (budgetDeferred) {
    console.log(`\u23F1 Subrequest budget guard: deferred ${budgetDeferred} matches to the next sweep (budget low)`);
    notifySummary.budgetDeferred = budgetDeferred;
  }
  if (deadChats.length) {
    const keep = chatIds.filter((c) => !deadChats.includes(c));
    console.log(`\u{1F5D1}\uFE0F Pruning dead chats: ${deadChats.join(", ")}`);
    await env.STATE.put(CONFIG.KV_USERS_KEY, JSON.stringify(keep)).catch(() => {
    });
  }
  console.log(`
\u{1F4CA} Notification Summary:`);
  console.log(`   24-hour: ${notificationCounts["pre-match-24h"]}`);
  console.log(`   3-hour: ${notificationCounts["pre-match-3h"]}`);
  console.log(`   1-hour: ${notificationCounts["pre-match-1h"]}`);
  console.log(`   Match-start: ${notificationCounts["match-start"]}`);
  console.log(`   Results: ${notificationCounts["result"]}`);
  const totalSent = Object.values(notificationCounts).reduce((a, b) => a + b, 0);
  console.log(`   Total: ${totalSent}`);
  return notifySummary;
}
