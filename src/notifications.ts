// SportSignal — the per-match notification engine: NOTIFICATION_CONFIGS
// window/formatter table, sendMatchNotifications fan-out with dead-chat
// pruning, and live status-change detection (kickoff/HT/FT events).


import { CONFIG, COMP_EN } from "./config";
import type { Env } from "./types";
import { toFaDigits, getNowTehran, escapeMarkdownCharacters, subrequestCount } from "./utils";
import { normalizeTeamName } from "./teams.js";
import { matchKey } from "./dedupe.js";
import { translateTeam, translateCompetition, getCompetitionPriority } from "./translate";
import { isWithin24HourWindow, isWithinBigMatchWindow, isWithin3HourWindow, isWithin1HourWindow, isWithin5MinWindow, isMatchStartingNow, isWithinPostMatchWindow, isMatchFinished, getNotifiedMatches, saveNotifiedMatch, shouldSendNotification, cleanupExpiredNotifications, isBackfillEligible, shouldNotify } from "./matches";
import { format24HourMessage, formatBigMatchMessage, format3HourMessage, format1HourMessage, format5MinMessage, formatMatchStartMessage, formatResultMessage, specialBanner } from "./composers";
import { sendTelegram, sendDice, sendPhotoBinary } from "./telegram";
import { renderCardPng } from "./card";
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
  let anySuccess = false;
  // v13.5-tz-scope: each chat-group's timezone flows through a CLONED env
  // instead of mutating the shared env object — the same isolate-safety fix
  // the /next handler got in v13.2 (concurrent requests can no longer observe
  // another group's TZ mid-flight).
  for (const g of chatGroups) {
    const scopedEnv: Env = { ...env, TEHRAN_TZ: g.tz };
    const lang = g.lang || "fa";
    let message = specialBanner(match, lang) + await config.messageFormatter(match, scopedEnv, lang);
    if (late) message += "\n\n" + (lang === "en" ? "This reminder was sent late" : "\u0627\u06CC\u0646 \u06CC\u0627\u062F\u0622\u0648\u0631\u06CC \u0628\u0627 \u062A\u0623\u062E\u06CC\u0631 \u0627\u0631\u0633\u0627\u0644 \u0634\u062F");
    // v13.10-animated: for match-start, send an animated ⚽ dice FIRST (a
    // spinning football that signals "kickoff!") before the text message.
    // This is Telegram's built-in sendDice animation — zero asset hosting.
    // v13.15-reliability: fire-and-forget (no await) so a slow/failed dice
    // never blocks the text notification. The text is the critical path.
    if (config.type === "match-start" && !late) {
      g.chats.forEach((chatId) => { sendDice(scopedEnv, chatId, "\u26BD").catch(() => null); });
    }
    // v13.18-card-caption: for match-start + result, send a visual match CARD
    // with the REAL match text as its caption (card + complementary text in
    // ONE message). The card image carries the crests + layout; the caption
    // carries the full date/time/teams/competition text. If the card sends
    // successfully, the separate text message is SKIPPED (the card already
    // has the text). If the card render or send fails, fall back to the
    // separate text message so the notification is never lost.
    let cardSent = false;
    if ((config.type === "match-start" || config.type === "result") && !late && (match.homeTeam.crest || match.awayTeam.crest)) {
      try {
        const pngBuf = await renderCardPng(scopedEnv, match, lang);
        if (pngBuf) {
          // The caption is the full match text (specialBanner + formatter).
          // parse_mode=MarkdownV2 so the bold/team names render.
          const caption = message;
          const cardResults = await Promise.allSettled(
            g.chats.map((chatId) => sendPhotoBinary(scopedEnv, chatId, pngBuf, caption, true))
          );
          if (cardResults.some((r) => r.status === "fulfilled" && r.value === true)) {
            cardSent = true;
          }
          // Track dead chats from the card send too.
          cardResults.forEach((r, i) => {
            if (r.status === "fulfilled" && r.value === "dead") deadChats.push(g.chats[i]);
          });
        }
      } catch (e) {
        console.warn("Card render/send failed, falling back to text: " + e.message);
      }
    }
    // If the card sent successfully, skip the separate text message (the
    // card's caption already carries the full text). Otherwise, send the
    // text as the fallback.
    let sendResults: any[] = [];
    if (!cardSent) {
      sendResults = await Promise.allSettled(
        g.chats.map((chatId) => sendTelegram(scopedEnv, message, chatId))
      );
      sendResults.forEach((r, i) => {
        if (r.status === "fulfilled" && r.value === "dead") deadChats.push(g.chats[i]);
      });
    }
    if (sendResults.some((r) => r.status === "fulfilled" && r.value === true)) anySuccess = true;
  }
  if (anySuccess) {
    await saveNotifiedMatch(env, match, config.type, notifiedMatches);
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
  const notifyMatches = matches.filter(shouldNotify);
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
    "match-start": 0,
    "result": 0
  };
  const deadChats = [];
  let budgetDeferred = 0;
  for (const match of notifyMatches) {
    const matchChats = chatIds.filter((c) => userFollowsMatch(prefs, c, match));
    if (!matchChats.length) continue;
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
    await env.STATE.put(CONFIG.KV_MATCH_STATUS, JSON.stringify(cur), { expirationTtl: 14 * 86400 }).catch(() => {
    });
    if (alerts.length) {
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
    if (htAlerts.length) {
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
    }
  } catch (e) {
    console.error("Status change detection failed: " + e.message);
  }
}

// v13.9-reliability #1: pre-scheduled notifications. At discovery time, write
// a schedule record per match listing its notification types + whether each
// has fired. Every sweep reconciles: for each schedule whose next-due type
// has passed its window AND isn't marked sent, fire it (with the "late" tag
// if past the window). This eliminates the cron-timing dependency — a
// skipped cron no longer loses the 5min/match-start reminder; it fires
// late on the next run. The dedupe KV (notified_matches_v6) is still the
// primary exactly-once guard; the schedule is the catch-all backstop.
export async function reconcileSchedules(env: Env, matches) {
  const now = Date.now();
  const worthy = matches.filter(shouldNotify);
  let written = 0;
  for (const m of worthy) {
    const key = CONFIG.KV_SCHEDULE_PREFIX + matchKey(m);
    const existing = await env.STATE.get(key, "json").catch(() => null);
    // (Re)write the schedule if missing OR the kickoff time shifted (reschedule).
    if (!existing || existing.utcDate !== m.utcDate) {
      const schedule = {
        utcDate: m.utcDate,
        matchKey: matchKey(m),
        types: ["pre-match-24h", "pre-match-3h", "pre-match-1h", "pre-match-5min", "match-start", "result"],
        sent: existing && existing.sent ? existing.sent : {}
      };
      await env.STATE.put(key, JSON.stringify(schedule), { expirationTtl: 7 * 86400 }).catch(() => {});
      written++;
    }
  }
  if (written) console.log(`\u{1F4CB} Schedule: wrote ${written} records (${worthy.length} worthy matches)`);
  return written;
}

