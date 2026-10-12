// SportSignal — the per-match notification engine: NOTIFICATION_CONFIGS
// window/formatter table, sendMatchNotifications fan-out with dead-chat
// pruning, and live status-change detection (kickoff/HT/FT events).


import { CONFIG } from "./config";
import { COMP_EN } from "./tables";
import type { Env } from "./types";
import { toFaDigits, getNowTehran, escapeMarkdownCharacters, subrequestCount } from "./utils";
import { normalizeTeamName } from "./teams";
import { matchKey } from "./dedupe";
import { translateTeam, translateCompetition, getCompetitionPriority } from "./translate";
import { isWithin24HourWindow, isWithinBigMatchWindow, isWithin3HourWindow, isWithin1HourWindow, isWithin5MinWindow, isMatchStartingNow, isWithinPostMatchWindow, isMatchFinished, getNotifiedMatches, saveNotifiedMatch, shouldSendNotification, cleanupExpiredNotifications, isBackfillEligible, shouldNotify } from "./matches";
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
export async function sendNotificationIfNeeded(match, config, chatGroups, env, nowTehran, counts, notifiedMatches, deadChats) {
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
        await sendNotificationIfNeeded(match, config, bigGroups, env, nowTehran, notificationCounts, notifiedMatches, deadChats);
        continue;
      }
      await sendNotificationIfNeeded(match, config, chatGroups, env, nowTehran, notificationCounts, notifiedMatches, deadChats);
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
export async function detectStatusChanges(env: Env, matches) {
  try {
    const prev = await env.STATE.get(CONFIG.KV_MATCH_STATUS, "json") || {};
    const cur = {};
    const now = Date.now();
    const alerts = [];
    // v12.x-cron-gaps: half-time (PAUSED) alerts for BIG matches only.
    // Tracked separately from postponement/cancellation alerts so they get
    // their own bilingual "HT: Team A [score] - [score] Team B" message
    // and only fire when a SCHEDULED/TIMED/IN_PLAY match first transitions
    // to PAUSED (HT). One fire per status transition (the KV status map
    // flips to PAUSED so a subsequent IN_PLAY \u2192 PAUSED, e.g. after extra
    // time, won't re-fire).
    const htAlerts = [];
    for (const m of matches) {
      if (!shouldNotify(m)) continue;
      const t = new Date(m.utcDate).getTime();
      if (t < now - 3 * 864e5 || t > now + 10 * 864e5) continue;
      const status = m.status || "SCHEDULED";
      const key = normalizeTeamName(m.homeTeam.name) + "|" + normalizeTeamName(m.awayTeam.name) + "|" + m.competition.code;
      cur[key] = status;
      const old = prev[key];
      if (old && old !== status && (status === "POSTPONED" || status === "CANCELLED") && (old === "SCHEDULED" || old === "TIMED" || old === "POSTPONED")) {
        alerts.push({ m, status });
      }
      // v12.x-cron-gaps: PAUSED \u2192 half-time alert. BIG matches only.
      // Trigger only on the FIRST transition into PAUSED from a non-PAUSED
      // state (so we don't fire on every PAUSED\u2194IN_PLAY flicker).
      if (old && old !== status && status === "PAUSED" && old !== "PAUSED" && isMasterBigMatch(m)) {
        htAlerts.push({ m, status });
      }
    }
    // v13.38-qc: WRITE-ONLY-WHEN-CHANGED. The status map was put EVERY tick
    // (144 writes/day) even when the pool was the stale KV cache and cur was
    // byte-identical to prev — quiet ticks can't produce transitions (same
    // stale statuses), so the write was pure churn against the 1,000/day
    // quota. The meter measured it; this kills it.
    let statusMapSaved = false;
    const curJson = JSON.stringify(cur);
    if (curJson === JSON.stringify(prev)) {
      statusMapSaved = true;
    } else {
      try {
        await env.STATE.put(CONFIG.KV_MATCH_STATUS, curJson, { expirationTtl: 14 * 86400 });
        statusMapSaved = true;
      } catch (e) {
        console.error("Status map KV save failed — suppressing status-change alerts this tick (fail-closed anti-spam)");
      }
    }
    if (alerts.length && !statusMapSaved) {
      console.log("\u{1F507} " + alerts.length + " status-change alert(s) deferred: dedupe map not persisted");
    }
    if (alerts.length && statusMapSaved) {
      const chats = await getRegisteredChats(env);
      // v12.x-bilingual-bot: send the alert in each user's lang.
      const prefs = typeof getUserPrefs === "function" ? await getUserPrefs(env) : {};
      const langBuckets = new Map();
      for (const c of chats) {
        const p = prefs[String(c)] || {};
        const lng = p.lang === "en" ? "en" : "fa";
        if (!langBuckets.has(lng)) langBuckets.set(lng, []);
        langBuckets.get(lng).push(c);
      }
      for (const a of alerts) {
        for (const [lng, bucket] of langBuckets) {
          const en = lng === "en";
          const home = en ? a.m.homeTeam.name : translateTeam(a.m.homeTeam.name);
          const away = en ? a.m.awayTeam.name : translateTeam(a.m.awayTeam.name);
          const comp = en ? (COMP_EN[a.m.competition.code] || a.m.competition.code) : translateCompetition(a.m.competition.code);
          const vs = en ? " vs " : " \u{1F19A} ";
          const teams = escapeMarkdownCharacters(home) + vs + escapeMarkdownCharacters(away) + " (" + escapeMarkdownCharacters(comp) + ")";
          const msg = a.status === "CANCELLED"
            ? (en ? "\u274C *Match cancelled:* " + teams : "\u274C *\u0628\u0627\u0632\u06CC \u0644\u063A\u0648 \u0634\u062F:* " + teams)
            : (en ? "*Match postponed:* " + teams : "\u{1F550} *\u0628\u0627\u0632\u06CC \u0628\u0647 \u062A\u0639\u0648\u06CC\u0642 \u0627\u0641\u062A\u0627\u062F:* " + teams);
          await Promise.allSettled(bucket.map((c) => sendTelegram(env, msg, c)));
        }
      }
    }
    // v12.x-cron-gaps: HT alerts broadcast to ALL registered chats (it's a
    // big-match highlight, not a per-team-follow event). Grouped by lang so
    // each user gets the HT message in their lang.
    // v13.37-nospam2: HT alerts share the same dedupe state (the status
    // map) — same fail-closed gate as the postponement/cancellation alerts.
    if (htAlerts.length && statusMapSaved) {
      const chats = await getRegisteredChats(env);
      const prefs = typeof getUserPrefs === "function" ? await getUserPrefs(env) : {};
      const langBuckets = new Map();
      for (const c of chats) {
        const p = prefs[String(c)] || {};
        const lng = p.lang === "en" ? "en" : "fa";
        if (!langBuckets.has(lng)) langBuckets.set(lng, []);
        langBuckets.get(lng).push(c);
      }
      for (const a of htAlerts) {
        const m = a.m;
        const home = m.homeTeam.name;
        const away = m.awayTeam.name;
        const sH = m.score && m.score.fullTime && m.score.fullTime.home != null ? m.score.fullTime.home : null;
        const sA = m.score && m.score.fullTime && m.score.fullTime.away != null ? m.score.fullTime.away : null;
        const comp = COMP_EN[m.competition.code] || m.competition.code;
        for (const [lng, bucket] of langBuckets) {
          const en = lng === "en";
          const hName = en ? home : translateTeam(home);
          const aName = en ? away : translateTeam(away);
          const compName = en ? comp : translateCompetition(m.competition.code);
          const hStr = sH == null ? "?" : (en ? String(sH) : toFaDigits(String(sH)));
          const aStr = sA == null ? "?" : (en ? String(sA) : toFaDigits(String(sA)));
          const head = en ? "*Half time*" : "*\u0627\u0633\u062A\u0631\u0627\u062D\u062A*";
          const vs = en ? " - " : " \u2014 ";
          const msg = head + "\n\n\u26BD *" + escapeMarkdownCharacters(hName) + vs + escapeMarkdownCharacters(aName) + "*\n" + escapeMarkdownCharacters(compName) + "\n*" + hStr + "\\-" + aStr + "*";
          await Promise.allSettled(bucket.map((c) => sendTelegram(env, msg, c)));
        }
      }
      console.log(`\u{1F680} HT alerts sent for ${htAlerts.length} big matches`);
    } else if (htAlerts.length && !statusMapSaved) {
      console.log("\u{1F507} " + htAlerts.length + " HT alert(s) deferred: dedupe map not persisted");
    }
  } catch (e) {
    console.error("Status change detection failed: " + e.message);
  }
}

// (v13.9-reliability #1's reconcileSchedules was REMOVED in v13.43-cpukeeper:
// it wrote sched_v1:* schedule records whose `sent` map was NEVER updated and
// which NOTHING ever read back for firing — the fire-leg was never built, so
// the records were a pure decoy (one KV read per worthy match per tick,
// ~174 reads/tick ≈ 35-90ms CPU the free-plan 10ms budget couldn't afford).
// Recovery is covered for real by the isBackfillEligible legs in
// shouldSendNotification/sendNotificationIfNeeded (every type incl.
// match-start, v13.42) + the dead-letter outbox. Stale sched_v1:* keys expire
// via their own 7-day TTL.)

// v13.23-audit: compare sportsignal.ir match data (ground truth) with the
// bot's notified_matches_v6 KV. For each worthy match whose kickoff has
// passed, checks that the expected notification types fired. Reports gaps.
// Called from cron after sendMatchNotifications. Also available via
// /api/audit (admin endpoint) for on-demand checks.
export async function auditNotifications(env: Env, matches) {
  const now = Date.now();
  const notified = await getNotifiedMatches(env);
  const worthy = (matches || []).filter(shouldNotify);
  const gaps = [];
  for (const m of worthy) {
    const ko = new Date(m.utcDate).getTime();
    const minSince = (now - ko) / 60000;
    const hoursSince = (now - ko) / CONFIG.ONE_HOUR_MS;
    const key = matchKey(m);
    const sent = notified[key] || [];
    const sentTypes = new Set(sent.map((n) => n.notificationType));
    // Expected notifications based on how long ago kickoff was:
    // - >24h ago: 24h, 3h, 1h, match-start (if not finished)
    // - FINISHED + >6h ago: 24h, 3h, 1h, match-start, result
    const expected = [];
    if (hoursSince > 24) expected.push("pre-match-24h");
    if (hoursSince > 3.5) expected.push("pre-match-3h");
    if (hoursSince > 1.5) expected.push("pre-match-1h");
    if (minSince > 20) expected.push("match-start");
    if (isMatchFinished(m) && hoursSince > CONFIG.POST_MATCH_NOTIFICATION_HOURS) expected.push("result");
    // Check for missing types (exclude big-match-only types for non-big matches)
    const missing = expected.filter((t) => !sentTypes.has(t) && t !== "pre-match-72h" && t !== "pre-match-5min");
    if (missing.length) {
      gaps.push({
        match: translateTeam(m.homeTeam.name) + " vs " + translateTeam(m.awayTeam.name),
        kickoff: m.utcDate,
        status: m.status,
        missing: missing,
        key: key
      });
    }
  }
  const result = { total: worthy.length, gaps: gaps.length, details: gaps };
  if (gaps.length) {
    console.log(`\u26A0\uFE0F Audit: ${gaps.length} notification gaps found out of ${worthy.length} worthy matches`);
    for (const g of gaps.slice(0, 5)) {
      console.log(`   ${g.match} (${g.kickoff}) — missing: ${g.missing.join(", ")}`);
    }
    // Alert the admin if there are significant gaps (more than 2).
    // v13.37-nospam2: RATE-LIMITED. Gaps can legitimately persist for hours
    // (a provider drops a finished match from the pool; a type the audit
    // expects but reality never sends) — the old code alerted the admin on
    // EVERY tick while gaps > 2 (up to 144 alerts/day: the bot spammed its
    // own admin). One alert / 6h max, stamped in KV.
    if (gaps.length > 2) {
      const adminChat = parseInt(env.CHAT_ID);
      const stamp = await env.STATE.get(CONFIG.KV_AUDIT_ALERT, "json").catch(() => null);
      const lastTs = stamp && stamp.ts ? stamp.ts : 0;
      if (!isNaN(adminChat) && Date.now() - lastTs > 6 * CONFIG.ONE_HOUR_MS) {
        const summary = gaps.slice(0, 10).map((g) => `\u2022 ${g.match} \\- missing: ${g.missing.join(", ")}`).join("\n");
        await sendTelegram(env, "\u26A0\uFE0F *\u06AF\u0632\u0627\u0631\u0634 \u0628\u0627\u0632\u0628\u06CC\u0646\u06CC*\n\n" + toFaDigits(String(gaps.length)) + " \u0646\u0648\u0639\u06CC\u0641\u06CC\u06A9\u06CC\u0646 \u0646\u0627\u0642\u0635 \\(" + toFaDigits(String(worthy.length)) + " \u0645\u0633\u0627\u0628\u0642\u0627\u062A\\)\n\n" + summary, adminChat).catch(() => {});
        await env.STATE.put(CONFIG.KV_AUDIT_ALERT, JSON.stringify({ ts: Date.now() }), { expirationTtl: 2 * 86400 }).catch(() => {});
      }
    }
  } else {
    console.log(`\u2705 Audit: all ${worthy.length} worthy matches have complete notifications`);
  }
  return result;
}

