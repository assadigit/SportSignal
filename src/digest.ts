// SportSignal — scheduled digests & specials: weekly league tables,
// week-ahead fixtures, matchday morning digest, big-match FT broadcast, and
// the 👑 table-top coronation alerts.


import { CONFIG, COMP_EN } from "./config";
import type { Env } from "./types";
import { toFaDigits, escapeMarkdownCharacters, getJalaliDate, getNowTehran, getEnglishDate } from "./utils";
import { translateTeam, translateCompetition } from "./translate";
import { shouldNotify, isMatchFinished, isWithinPostMatchWindow, getNotifiedMatches, saveNotifiedMatch, normAlias, isMasterPair, isDerby } from "./matches";
import { fetchStandings, buildLeagueTableMessage, specialBanner, formatResultMessage, isoWeekKey, weeklyTableCodes } from "./composers";
import { sendTelegram } from "./telegram";
import { getRegisteredChats, getUserPrefs, getUserTz, groupChatsByTz, userFollowsMatch, isMasterBigMatch } from "./users";
import { getCachedMatches } from "./providers";

export async function sendLeagueTables(env: Env, chatIds, opts, lang?) {
  const lng = lang === "en" ? "en" : "fa";
  const out: any = { leagues: [], sent: 0, failed: 0 };
  if (!Array.isArray(chatIds) || !chatIds.length) {
    out.error = "no chats";
    return out;
  }
  const messages = [];
  for (const code of weeklyTableCodes()) {
    let st = null;
    try {
      st = await fetchStandings(env, code, true);
    } catch (e) {
      st = null;
    }
    if (!st || !Array.isArray(st.teams) || !st.teams.length) {
      out.leagues.push({ code, ok: false, reason: "unavailable" });
      continue;
    }
    if (st.started === false) {
      out.leagues.push({ code, ok: false, reason: "not-started" });
      continue;
    }
    messages.push({ code, text: buildLeagueTableMessage(code, st, opts, lng) });
    out.leagues.push({ code, ok: true, rows: code === "CL" ? Math.min(10, st.teams.length) : st.teams.length, matchday: st.matchday || null });
  }
  for (const chatId of chatIds) {
    for (const m of messages) {
      if (await sendTelegram(env, m.text, chatId)) out.sent++;
      else out.failed++;
    }
  }
  return out;
}
export async function buildWeekAheadMessage(env: Env, lang) {
  const en = lang === "en";
  let pool = await env.STATE.get(CONFIG.KV_MATCHES_KEY, "json").catch(() => null);
  let matches = pool && Array.isArray(pool.matches) ? pool.matches : [];
  if (!matches.length) matches = await getCachedMatches(env);
  const now = Date.now();
  const to = now + CONFIG.WEEK_AHEAD_DAYS * 864e5;
  const worthy = matches.filter((m) => shouldNotify(m) && new Date(m.utcDate).getTime() >= now - 36e5 && new Date(m.utcDate).getTime() < to);
  if (!worthy.length) return null;
  const byKick = (a, b) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime();
  const derbies = worthy.filter((m) => isDerby(m)).sort(byKick);
  const uclDuels = worthy.filter((m) => !isDerby(m) && m.competition && m.competition.code === "CL" && isMasterPair(m)).sort(byKick);
  const rest = worthy.filter((m) => !derbies.includes(m) && !uclDuels.includes(m)).sort(byKick).slice(0, 10);
  const fmtLine = (m, mark) => {
    const locale = en ? "en-GB" : "fa-IR";
    const weekday = new Intl.DateTimeFormat(locale, { weekday: "long", timeZone: env.TEHRAN_TZ || "Asia/Tehran" }).format(new Date(m.utcDate));
    const time = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: env.TEHRAN_TZ || "Asia/Tehran" }).format(new Date(m.utcDate));
    const timeStr = en ? time : toFaDigits(time);
    const home = en ? m.homeTeam.name : translateTeam(m.homeTeam.name);
    const away = en ? m.awayTeam.name : translateTeam(m.awayTeam.name);
    const comp = en ? (COMP_EN[m.competition.code] || m.competition.code) : translateCompetition(m.competition.code);
    const vs = en ? " vs " : " \u{1F19A} ";
    return mark + escapeMarkdownCharacters(home) + vs + escapeMarkdownCharacters(away) + " \u2014 " + weekday + " " + timeStr + " \u2014 " + escapeMarkdownCharacters(comp);
  };
  const lines = [];
  for (const m of derbies) lines.push("*" + fmtLine(m, "\u2694\uFE0F ") + "*");
  for (const m of uclDuels) lines.push("*" + fmtLine(m, "") + "*");
  for (const m of rest) lines.push(fmtLine(m, ""));
  const extraCount = worthy.length - derbies.length - uclDuels.length - rest.length;
  const head = en ? "*Matches this week*\n\n" : "*\u0628\u0627\u0632\u06CC\u200C\u0647\u0627\u06CC \u0647\u0641\u062A\u0647 \u0622\u06CC\u0646\u062F\u0647*\n\n";
  let msg = head + lines.join("\n");
  if (extraCount > 0) {
    const extraStr = en ? "\n+ " + String(extraCount) + " more matches" : "\n\u2026 \u0648 " + toFaDigits(String(extraCount)) + " \u0628\u0627\u0632\u06CC \u062F\u06CC\u06AF\u0631";
    msg += extraStr;
  }
  return msg;
}
export async function sendWeekAhead(env: Env, chatIds, lang?) {
  const out = { sent: 0, failed: 0, text: null };
  if (!Array.isArray(chatIds) || !chatIds.length) return out;
  let text = null;
  try {
    text = await buildWeekAheadMessage(env, lang);
  } catch (e) {
    console.error("week-ahead build failed: " + e.message);
  }
  if (!text) return out;
  out.text = text;
  for (const chatId of chatIds) {
    if (await sendTelegram(env, text, chatId)) out.sent++;
    else out.failed++;
  }
  return out;
}
export async function maybeSendWeeklyTables(env: Env, chatIds) {
  const t = getNowTehran(env);
  if (t.getUTCDay() !== CONFIG.WEEKLY_TABLES.day) return null;
  const mins = t.getUTCHours() * 60 + t.getUTCMinutes();
  if (mins < CONFIG.WEEKLY_TABLES.fromMin || mins >= CONFIG.WEEKLY_TABLES.toMin) return null;
  const week = isoWeekKey(t);
  const done = await env.STATE.get(CONFIG.KV_WEEKLY_TABLES).catch(() => null);
  if (done === week) return null;
  // v12.x-bilingual-bot: group chats by lang so each user gets the
  // digest + week-ahead in their own lang. Defensive: getUserPrefs may
  // be undefined in the test harness (check-weekly-tables.js).
  const prefs = typeof getUserPrefs === "function" ? await getUserPrefs(env) : {};
  const langGroups = new Map();
  for (const c of chatIds) {
    const p = prefs[String(c)] || {};
    const lng = p.lang === "en" ? "en" : "fa";
    if (!langGroups.has(lng)) langGroups.set(lng, []);
    langGroups.get(lng).push(c);
  }
  let res = { leagues: [], sent: 0, failed: 0 };
  let weekAheadAgg = { sent: 0, failed: 0, skipped: true };
  for (const [lng, group] of langGroups) {
    const label = lng === "en" ? "End of week" : "\u067E\u0627\u06CC\u0627\u0646 \u0647\u0641\u062A\u0647";
    const r = await sendLeagueTables(env, group, { label }, lng);
    res.sent += r.sent; res.failed += r.failed;
    res.leagues = res.leagues.concat(r.leagues);
    const wa = await sendWeekAhead(env, group, lng);
    weekAheadAgg.sent += wa.sent; weekAheadAgg.failed += wa.failed;
    if (wa.text) weekAheadAgg.skipped = false;
  }
  res.weekAhead = weekAheadAgg;
  if (res.sent > 0 || weekAheadAgg.sent > 0) await env.STATE.put(CONFIG.KV_WEEKLY_TABLES, week).catch(() => {
  });
  return res;
}
// v12.x-cron-gaps: matchday morning digest. Fires ONCE per chat per day at
// 9am local time. Lists today's master big matches (both teams big) in the
// user's lang. Per-chat dedupe via KV `digest_sent_<YYYY-MM-DD>_<chatId>`.
// Designed to coexist with the existing weekly tables digest; it's much
// leaner (one line per match, no full tables) and fires every day (the
// weekly tables only fire Monday morning Tehran).
export async function maybeSendMorningDigest(env: Env, chatIds) {
  const out = { sent: 0, skipped: 0, noMatches: 0 };
  if (!Array.isArray(chatIds) || !chatIds.length) return out;
  const prefs = typeof getUserPrefs === "function" ? await getUserPrefs(env) : {};
  // Build the per-tz "is it 9am here?" lookup once. Each tz bucket is
  // processed independently so a Sydney 9am fires ~6 hours before Tehran's.
  const byTz = new Map();
  for (const c of chatIds) {
    const tz = (typeof getUserTz === "function" ? getUserTz(prefs, c, env) : env.TEHRAN_TZ) || env.TEHRAN_TZ || "Asia/Tehran";
    if (!byTz.has(tz)) byTz.set(tz, []);
    byTz.get(tz).push(c);
  }
  for (const [tz, tzChats] of byTz) {
    let hour = -1, dateKey = null;
    try {
      const parts = new Intl.DateTimeFormat("en-GB", ({
        timeZone: tz, hour12: false,
        year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit"
      } as any)).formatToParts(new Date());
      const p: any = {};
  for (const x of parts) p[x.type] = x.value;
      const hh = p.hour === "24" ? "00" : p.hour;
      hour = parseInt(hh, 10);
      dateKey = p.year + "-" + p.month + "-" + p.day;
    } catch (e) {
      continue;
    }
    if (hour !== 9) continue;
    if (!dateKey) continue;
    // Pull the latest pool (KV first; falls back to the in-memory cron pool).
    let pool = await env.STATE.get(CONFIG.KV_MATCHES_KEY, "json").catch(() => null);
    let matches = pool && Array.isArray(pool.matches) ? pool.matches : [];
    if (!matches.length) matches = await getCachedMatches(env).catch(() => []);
    if (!Array.isArray(matches) || !matches.length) continue;
    // Today's big matches (in this tz). "Today" = midnight-to-midnight local.
    // Build the tz-local midnight as a UTC instant using the format above.
    let dayStart = 0, dayEnd = 0;
    try {
      const parts = new Intl.DateTimeFormat("en-GB", ({
        timeZone: tz, hour12: false,
        year: "numeric", month: "2-digit", day: "2-digit"
      } as any)).formatToParts(new Date());
      const p: any = {};
  for (const x of parts) p[x.type] = x.value;
      dayStart = Date.UTC(parseInt(p.year, 10), parseInt(p.month, 10) - 1, parseInt(p.day, 10), 0, 0, 0);
      dayEnd = dayStart + 24 * 60 * 60 * 1e3;
    } catch (e) {
      continue;
    }
    const todayBig = matches.filter((m) =>
      m && m.competition && m.competition.code &&
      isMasterBigMatch(m) &&
      m.status !== "FINISHED" &&
      (function () { const tt = new Date(m.utcDate).getTime(); return tt >= dayStart && tt < dayEnd; })()
    ).sort((a, b) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime());
    if (!todayBig.length) continue;
    // Per-chat send with dedupe. Use the original env.TEHRAN_TZ for time
    // rendering in the user's lang (the matches are at UTC instants; the
    // time displayed is whatever tz the user has set).
    const originalTz = env.TEHRAN_TZ;
    try {
      env.TEHRAN_TZ = tz;
      for (const c of tzChats) {
        const dedupeKey = "digest_sent_" + dateKey + "_" + c;
        const already = await env.STATE.get(dedupeKey).catch(() => null);
        if (already) { out.skipped++; continue; }
        const lang = (prefs[String(c)] && prefs[String(c)].lang) === "en" ? "en" : "fa";
        const msg = await buildMorningDigestMessage(env, todayBig, lang);
        const r = await sendTelegram(env, msg, c);
        if (r === true) {
          out.sent++;
          await env.STATE.put(dedupeKey, String(Date.now()), { expirationTtl: 36 * 60 * 60 }).catch(() => {});
        } else if (r === "dead") {
          // Mark as sent too — don't retry a dead chat all 9am hour.
          await env.STATE.put(dedupeKey, String(Date.now()), { expirationTtl: 36 * 60 * 60 }).catch(() => {});
        }
      }
    } finally {
      env.TEHRAN_TZ = originalTz;
    }
  }
  if (out.sent) console.log(`\u{1F4C5} Morning digest sent=${out.sent} skipped=${out.skipped}`);
  return out;
}
export async function buildMorningDigestMessage(env: Env, matches, lang) {
  const en = lang === "en";
  const head = en ? "*Today's big matches:*\n\n" : "*\u0628\u0627\u0632\u06CC\u200C\u0647\u0627\u06CC \u0628\u0632\u0631\u06AF \u0627\u0645\u0631\u0648\u0632:*\n\n";
  const lines = [];
  for (const m of matches.slice(0, 8)) {
    const home = en ? m.homeTeam.name : translateTeam(m.homeTeam.name);
    const away = en ? m.awayTeam.name : translateTeam(m.awayTeam.name);
    const comp = en ? (COMP_EN[m.competition.code] || m.competition.code) : translateCompetition(m.competition.code);
    const time = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: env.TEHRAN_TZ || "Asia/Tehran" }).format(new Date(m.utcDate));
    const timeStr = en ? time : toFaDigits(time);
    const vs = en ? " vs " : " \u{1F19A} ";
    lines.push("\u26BD " + escapeMarkdownCharacters(home) + vs + escapeMarkdownCharacters(away) + " \u2014 " + timeStr + " \u2014 " + escapeMarkdownCharacters(comp));
  }
  let msg = head + lines.join("\n");
  if (matches.length > 8) {
    const extra = matches.length - 8;
    const extraStr = en ? "\n+ " + String(extra) + " more" : "\n\u2026 \u0648 " + toFaDigits(String(extra)) + " \u0628\u0627\u0632\u06CC \u062F\u06CC\u06AF\u0631";
    msg += extraStr;
  }
  return msg;
}
// v12.x-cron-gaps: big-match FT broadcast. The existing "result" config
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
    );
    if (!candidates.length) return out;
    const chatIds = await getRegisteredChats(env);
    if (!chatIds.length) return out;
    const prefs = typeof getUserPrefs === "function" ? await getUserPrefs(env) : {};
    const notifiedMatches = await getNotifiedMatches(env);
    const deadChats = [];
    const originalTz = env.TEHRAN_TZ;
    for (const match of candidates) {
      out.matches++;
      // Users who follow at least one team in the match already get the
      // "result" notification via the regular path \u2014 skip them here.
      const nonFollowers = chatIds.filter((c) => {
        const f = (typeof userFollowsMatch === "function" ? userFollowsMatch(prefs, c, match) : null);
        return f === null;
      });
      if (!nonFollowers.length) continue;
      const groups = (typeof groupChatsByTz === "function" ? groupChatsByTz(nonFollowers, prefs, env) : [{ tz: env.TEHRAN_TZ, lang: "fa", chats: nonFollowers }]);
      let anySuccess = false;
      try {
        for (const g of groups) {
          env.TEHRAN_TZ = g.tz;
          const lang = g.lang || "fa";
          const message = specialBanner(match, lang) + await formatResultMessage(match, env, lang);
          const sendResults = await Promise.allSettled(
            g.chats.map((chatId) => sendTelegram(env, message, chatId))
          );
          sendResults.forEach((r, i) => {
            if (r.status === "fulfilled" && r.value === "dead") deadChats.push(g.chats[i]);
          });
          if (sendResults.some((r) => r.status === "fulfilled" && r.value === true)) anySuccess = true;
        }
      } finally {
        env.TEHRAN_TZ = originalTz;
      }
      if (anySuccess) {
        await saveNotifiedMatch(env, match, "result-big", notifiedMatches);
        out.sent++;
      }
    }
    if (deadChats.length) {
      const keep = chatIds.filter((c) => !deadChats.includes(c));
      await env.STATE.put(CONFIG.KV_USERS_KEY, JSON.stringify(keep)).catch(() => {});
      out.dead = deadChats.length;
    }
    if (out.sent) console.log(`\u{1F4E4} result-big broadcast: ${out.sent} big-match FTs to non-followers`);
  } catch (e) {
    console.error("Big-match result broadcast failed: " + e.message);
  }
  return out;
}
// v12.32 (the user's ask): "When a team that is not in the first place, such
// as a team that is second, third, or fourth in the table, reaches the top
// of the table, a special notification should be sent in the Telegram bot.
// For example, if Liverpool is second in the table and Manchester City is
// first. If Liverpool beats Newcastle, it reaches the top of the table, the
// bot sends a notification that Liverpool has reached the top of the table
// after this match [match details]" \u2014 maybeNotifyTableToppers runs after
// every cron sweep, for each domestic league with a table: the current #1
// is compared against the LAST RUN's snapshot (KV "table_top_v1:<code>",
// top-10 rows). A change fires ONLY when (a) the new #1 was NOT #1 before
// (its previous position is 2+, any non-first slot), and (b) a just-
// finished match (within the 6h post-match window) involving the new OR
// the old leader is in the pool \u2014 THAT match's details ride the message
// (teams, score, competition, date). Without such a match the change is
// API jitter / season reset and the snapshot just updates silently. The
// snapshot updates EVERY run, so each genuine coronation notifies exactly
// once. Recipients: every registered chat (a league-wide headline, like
// the weekly tables digest \u2014 not a per-team-follow event).
export async function maybeNotifyTableToppers(env: Env, matches) {
  const out = { sent: 0, failed: 0, events: [] };
  const chatIds = await getRegisteredChats(env);
  if (!Array.isArray(chatIds) || !chatIds.length) return out;
  if (!Array.isArray(matches) || !matches.length) return out;
  for (const code of weeklyTableCodes().filter((c) => c !== "CL")) {
    let st = null;
    try {
      st = await fetchStandings(env, code, true);
    } catch (e) {
      st = null;
    }
    if (!st || !Array.isArray(st.teams) || !st.teams.length) continue;
    if (st.started === false) continue;
    const sorted = st.teams.slice().sort((a, b) => (a.pos || 999) - (b.pos || 999) || (b.points || 0) - (a.points || 0));
    const newLeader = sorted[0];
    if (!newLeader) continue;
    const snapKey = "table_top_v1:" + code;
    const prev = await env.STATE.get(snapKey, "json").catch(() => null);
    await env.STATE.put(snapKey, JSON.stringify({ ts: Date.now(), top: sorted.slice(0, 10).map((t) => ({ name: t.name, pos: t.pos, points: t.points })) })).catch(() => {
    });
    if (!prev || !Array.isArray(prev.top) || !prev.top.length) continue;
    const oldLeader = prev.top.find((t) => t.pos === 1);
    if (!oldLeader) continue;
    if (normAlias(oldLeader.name) === normAlias(newLeader.name)) continue;
    const prevRowOfNew = prev.top.find((t) => normAlias(t.name) === normAlias(newLeader.name));
    if (!prevRowOfNew) continue;
    if (prevRowOfNew.pos === 1) continue;
    const involved = (m, teamName) => {
      if (!m || !m.competition || m.competition.code !== code) return false;
      if (!isMatchFinished(m) || !isWithinPostMatchWindow(m, env)) return false;
      return normAlias(m.homeTeam.name) === normAlias(teamName) || normAlias(m.awayTeam.name) === normAlias(teamName);
    };
    const trigger = matches.find((m) => involved(m, newLeader.name)) || matches.find((m) => involved(m, oldLeader.name));
    if (!trigger) continue;
    // v12.x-bilingual-bot: render + send per-lang so each user gets the
    // coronation in their own lang. Falls back to "fa" if no prefs entry.
    const prefs = typeof getUserPrefs === "function" ? await getUserPrefs(env) : {};
    const langBuckets = new Map();
    for (const c of chatIds) {
      const p = prefs[String(c)] || {};
      const lng = p.lang === "en" ? "en" : "fa";
      if (!langBuckets.has(lng)) langBuckets.set(lng, []);
      langBuckets.get(lng).push(c);
    }
    let ok = 0;
    for (const [lng, bucket] of langBuckets) {
      const text = await formatTableTopMessage(env, code, newLeader, prevRowOfNew, trigger, lng);
      if (!text) continue;
      for (const chatId of bucket) {
        const r = await sendTelegram(env, text, chatId);
        if (r === true) ok++;
        else if (r !== "dead") out.failed++;
      }
    }
    out.sent += ok;
    out.events.push({ code, leader: newLeader.name, prevPos: prevRowOfNew.pos, match: trigger.id || null, sent: ok });
    console.log(`\u{1F451} Table-top alert [${code}]: ${translateTeam(newLeader.name)} (prev #${prevRowOfNew.pos}) overtakes ${translateTeam(oldLeader.name)} \u2014 sent to ${ok}/${chatIds.length}`);
  }
  return out;
}
export async function formatTableTopMessage(env: Env, code, newLeader, prevRow, trigger, lang) {
  try {
    const en = lang === "en";
    const league = en ? (COMP_EN[code] || code) : translateCompetition(code);
    const home = en ? trigger.homeTeam.name : translateTeam(trigger.homeTeam.name);
    const away = en ? trigger.awayTeam.name : translateTeam(trigger.awayTeam.name);
    const leaderName = en ? newLeader.name : translateTeam(newLeader.name);
    const esc = escapeMarkdownCharacters;
    const pts = newLeader.points == null ? 0 : newLeader.points;
    const ptsStr = en ? String(pts) : toFaDigits(String(pts));
    const prevPosStr = en ? String(prevRow.pos) : toFaDigits(String(prevRow.pos));
    const dateStr = en ? getEnglishDate(trigger.utcDate, env) : getJalaliDate(trigger.utcDate, env);
    const vs = en ? " vs " : " \u{1F19A} ";
    const head = en ? `*New leader: ${esc(league)}*\n\n` : `*\u0635\u062F\u0631 \u062C\u062F\u0648\u0644 ${esc(league)} \u062A\u063A\u06CC\u06CC\u0631 \u06A9\u0631\u062F*\n\n`;
    let message = head;
    const reachedLine = en
      ? `${esc(leaderName)} reached the top of ${esc(league)} with ${ptsStr} pts \u2014 previous position: ${prevPosStr}\n\n`
      : `${esc(leaderName)} \u0628\u0627 ${ptsStr} \u0627\u0645\u062A\u06CC\u0627\u0632 \u0628\u0647 \u0635\u062F\u0631 \u062C\u062F\u0648\u0644 ${esc(league)} \u0631\u0633\u06CC\u062F \u2014 \u0631\u062A\u0628\u0647 \u0642\u0628\u0644\u06CC: ${prevPosStr}\n\n`;
    message += reachedLine;
    message += `\u26BD *${esc(home)}${vs}${esc(away)}*\n`;
    message += `${esc(league)}\n`;
    message += `${esc(dateStr)}\n`;
    const h = trigger.score && trigger.score.fullTime && trigger.score.fullTime.home, a = trigger.score && trigger.score.fullTime && trigger.score.fullTime.away;
    if (h !== null && h !== void 0 && a !== null && a !== void 0) {
      const hStr = en ? String(h) : toFaDigits(String(h));
      const aStr = en ? String(a) : toFaDigits(String(a));
      message += `*${hStr}\\-${aStr}*`;
      if (h > a) {
        const won = en ? `${esc(home)} won` : `\n\u2705 ${esc(home)} \u0628\u0631\u0646\u062F\u0647 \u0634\u062F`;
        message += `\n${won}`;
      } else if (h < a) {
        const won = en ? `${esc(away)} won` : `\n\u2705 ${esc(away)} \u0628\u0631\u0646\u062F\u0647 \u0634\u062F`;
        message += `\n${won}`;
      } else {
        const draw = en ? "Draw" : "\u0645\u0633\u0627\u0648\u06CC";
        message += `\n${draw}`;
      }
    }
    const footer = en ? `\n\nFull table: football\\.sportsignal\\.ir` : `\n\n\u{1F4CA} \u062C\u062F\u0648\u0644 \u06A9\u0627\u0645\u0644: football\\.sportsignal\\.ir`;
    message += footer;
    return message;
  } catch (e) {
    console.error("Table-top message build failed: " + e.message);
    return null;
  }
}
