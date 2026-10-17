// SportSignal — the CORONATION alerts (v12.32): a non-first team overtaking
// the league leader after a fresh FT gets its own special message.
// Snapshot-gated (table_top_v1:<code>), fresh-FT-triggered (standings
// fetch freshMs only for leagues with a just-finished match — v13.53).
// Extracted from digest.ts in v13.77-digestnotify.
import { CONFIG } from "./config";
import { COMP_EN } from "./tables";
import type { Env } from "./types";
import { toFaDigits, escapeMarkdownCharacters, getJalaliDate, getEnglishDate } from "./utils";
import { normAlias } from "./teams";
import { translateTeam, translateCompetition } from "./translate";
import { isMatchFinished } from "./match-model";
import { isWithinPostMatchWindow } from "./match-windows";
import { fetchStandings, weeklyTableCodes } from "./composers";
import { sendTelegram } from "./telegram";
import { getRegisteredChats, getUserPrefs } from "./users";

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
      // v13.53-standsteady: coronation keeps POST-FT freshness ONLY for
      // leagues with a just-finished match in the pool — the only ones whose
      // table can actually have changed (a leader can only be overtaken via
      // that league's own FT). The rest serve the 6h-cached copy: identical
      // detection semantics, ~80% fewer standings fetches (the old path
      // re-fetched all 7 codes on EVERY full sweep ≈ 84 FD calls/day by
      // itself — the biggest single standings consumer).
      const codeHadFT = matches.some((m) => m && m.competition && m.competition.code === code && isMatchFinished(m) && isWithinPostMatchWindow(m, env));
      st = await fetchStandings(env, code, true, codeHadFT ? { freshMs: 6e5 } : undefined);
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
    // v13.37-nospam2: the snapshot is the coronation detector's dedupe
    // state. The old code swallowed put failures — a failed write left
    // `prev` stale, so the same coronation re-alerted on EVERY tick of the
    // 6h post-match window (up to 36 copies). Fail closed: if the snapshot
    // can't be persisted, skip this league this tick (no send, no re-arm).
    let snapSaved = false;
    // v13.111-quotaslim: WRITE-ONLY-WHEN-CHANGED (the v13.38 status-map
    // pattern). The snapshot used to be put on EVERY full sweep for EVERY
    // league — 6-7 codes × 12 sweeps = ~72-84 writes/day of the 1,000/day
    // quota, all re-writing byte-identical top-10s on the ~99% of sweeps
    // where no table changed. An unchanged table needs NO new dedupe state
    // (prev already IS that state), so the put is skipped and the detection
    // semantics below are untouched. The 40d TTL still applies to real
    // changes; a league whose key expires after 40 quiet days re-seeds
    // here (prev=null → not unchanged → one write, silent — same as the
    // old first-run behavior).
    const newTop = sorted.slice(0, 10).map((t) => ({ name: t.name, pos: t.pos, points: t.points }));
    const tableUnchanged = !!(prev && Array.isArray(prev.top) && prev.top.length === newTop.length && JSON.stringify(prev.top) === JSON.stringify(newTop));
    if (tableUnchanged) {
      snapSaved = true;
    } else {
      try {
        // v13.38-qc: 40d TTL — the old snapshot put had NO expiry, so the 7
        // league keys lived forever. Stale snapshots are harmless (prev only
        // feeds transition detection), so a long TTL is pure hygiene.
        await env.STATE.put(snapKey, JSON.stringify({ ts: Date.now(), top: newTop }), { expirationTtl: 40 * 86400 });
        snapSaved = true;
      } catch (e) {
        console.error(`Table-top snapshot save failed [${code}] — skipping coronation check this tick (fail-closed anti-spam)`);
      }
    }
    if (!snapSaved) continue;
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
