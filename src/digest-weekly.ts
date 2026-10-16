// SportSignal — the WEEKLY digest: the Monday-morning league tables
// (sendLeagueTables + maybeSendWeeklyTables, per-chat KV dedupe) and the
// week-ahead fixtures message (buildWeekAheadMessage + sendWeekAhead).
// Extracted from digest.ts in v13.77-digestnotify.
import { CONFIG } from "./config";
import { COMP_EN } from "./tables";
import type { Env } from "./types";
import { toFaDigits, escapeMarkdownCharacters, getNowTehran } from "./utils";
// v13.106-mdstyle: entity builders (bold teams, italic competition). No
// entity NESTING: the derby/UCL lines keep their emoji anchors instead of
// the old whole-line bold (a bold wrapper around a line that now contains
// bold/italic spans would nest entities — MarkdownV2 cannot).
// v13.107-plaintimes: the fixture TIME (and the weekday) render PLAIN
// (mdEscape) — the user's readability ask (was a monospace code span).
import { mdBold, mdItalic, mdEscape } from "./md";
import { translateTeam, translateCompetition } from "./translate";
import { shouldNotify, isMasterPair, isDerby } from "./match-classify";
import { fetchStandings, buildLeagueTableMessage, isoWeekKey, weeklyTableCodes } from "./composers";
import { sendTelegram } from "./telegram";
import { getUserPrefs } from "./users";
import { getCachedMatches } from "./match-pool";

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
      // v13.53-standsteady: the weekly digest keeps the 10-min freshness —
      // it renders the table once a week, so the freshest data wins (7
      // fetches/week is nothing against the volume we just cut).
      st = await fetchStandings(env, code, true, { freshMs: 6e5 });
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
    return mark + mdBold(home) + vs + mdBold(away) + " \u2014 " + mdEscape(weekday) + " " + mdEscape(timeStr) + " \u2014 " + mdItalic(comp);
  };
  const lines = [];
  for (const m of derbies) lines.push(fmtLine(m, "\u2694\uFE0F "));
  for (const m of uclDuels) lines.push(fmtLine(m, "\u{1F525} "));
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
  // v13.37-nospam2: WRITE-FIRST — the week marker is persisted BEFORE any
  // send. The old send-then-mark order meant a failed marker write
  // re-broadcast the full tables digest on every tick of the 4.5h Monday
  // window (up to ~27 copies). Fail closed: if the marker can't be
  // persisted, skip this week's digest entirely — one missed weekly digest
  // beats a duplicate storm. (A total Telegram outage at digest time also
  // loses that week's digest — accepted: never-spam outranks never-miss
  // for one-shot digests. Per-event notifications keep outbox recovery.)
  try {
    await env.STATE.put(CONFIG.KV_WEEKLY_TABLES, week);
  } catch (e) {
    console.error("Weekly-tables marker save failed — skipping this week's digest (fail-closed anti-spam)");
    return null;
  }
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
  let res: any = { leagues: [], sent: 0, failed: 0 };
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
  return res;
}
