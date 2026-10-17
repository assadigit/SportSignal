// SportSignal — the NIGHT RESULTS digest (v13.96-nightdigest): one
// consolidated message at the end of the match night with every result of
// the night, the user's followed-team results called out with a
// won/lost/draw sentence, and each followed team's CURRENT table rank
// ("آرسنال در مقابل لیل برنده شد. رتبه فعلی: ۳"). The user's ask: CL
// nights have a handful of games — instead of (or in addition to) per-match
// cards, one summary when the night is over.
//
// WHEN it fires (per chat, per its own timezone):
//   - The "night" being summarized = matches whose LOCAL kickoff date is
//     dateKey, where dateKey = today if local hour >= 6, else YESTERDAY
//     (a 22:30 kickoff that ends 00:30 next morning is still "that night").
//   - Only during the night window: local hour >= 20 or hour < 6.
//   - Only when the night is OVER: every match of that local date is
//     FINISHED — or is >4h past kickoff while still unresolved (the
//     2026-10-13 lesson: a frozen IN_PLAY pool must not block the digest
//     forever; POSTPONED/CANCELLED/AWARDED count as done too).
//   - Only if at least one match FINISHED that date (a night with zero
//     football sends nothing).
//   - ONCE per chat per date: KV `nightdigest_<dateKey>_<chatId>`,
//     mark-before-send (the v13.36-nospam write-first order), TTL 36h.
//
// Fan-out safety (the v13.94 lessons): each chat's send is isolated
// (one dead chat can't kill the loop), and the whole digest skips ticks
// that are already at the subrequest wall (>= 44) — the notify engine's
// cards own the budget first.
import { CONFIG } from "./config";
import type { Env } from "./types";
import { toFaDigits, escapeMarkdownCharacters, subrequestCount, jalaliDateFa, englishDateYmd } from "./utils";
// v13.106-mdstyle: entity builders (bold followed team + score, italic
// competition group labels).
import { mdBold, mdItalic } from "./md";
import { translateTeam, translateCompetition } from "./translate";
import { fetchStandings } from "./composers";
import { sendTelegram, sendUclGifBanner } from "./telegram";
import { getUserPrefs, getUserTz, userFollowsMatch, userFollowsSides } from "./users";
import { normalizeTeamName } from "./teams";
import { priorityTier, isBotSilentLeague } from "./match-classify";
// v13.113-cupcover: the always-covered elimination events ("Club X
// eliminated against Y" — the owner's rule).
import { collectEliminations } from "./cup-elim";

const DONE_STATUSES = ["FINISHED", "POSTPONED", "CANCELLED", "AWARDED", "SUSPENDED"];

// v13.96.1-hotfix (the 2026-10-14 00:53Z incident): the first cut
// constructed an Intl.DateTimeFormat PER MATCH PER TZ (705 matches x N
// buckets = thousands of formatter constructions per tick) — a
// v13.43-cpukeeper-class CPU burn that killed invocations outright. Now:
// ONE formatToParts per tz to sample its current offset, then pure
// arithmetic per match (the offset is stable across a night; a DST edge
// shifts a boundary match by one hour at worst, which the per-date dedupe
// absorbs into the neighboring night).
// v13.99-uclgif: exported for digest-uclnight.ts (the UCL preview's twin —
// same tz-date arithmetic; one-directional import, no cycle).
export function tzOffsetMs(tz: string) {
  try {
    const now = new Date();
    const parts = new Intl.DateTimeFormat("en-GB", ({
      timeZone: tz, hour12: false,
      year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit"
    } as any)).formatToParts(now);
    const p: any = {};
    for (const x of parts) p[x.type] = x.value;
    const hh = p.hour === "24" ? "00" : p.hour;
    const asUTC = Date.UTC(parseInt(p.year, 10), parseInt(p.month, 10) - 1, parseInt(p.day, 10), parseInt(hh, 10), parseInt(p.minute, 10));
    return asUTC - Math.floor(now.getTime() / 60000) * 60000;
  } catch (e) {
    return null;
  }
}

export function dateKeyOf(y: number, m: number, d: number) {
  return y + "-" + String(m).padStart(2, "0") + "-" + String(d).padStart(2, "0");
}

// The local calendar date of a UTC instant under a known offset: read the
// UTC getters of (ms + offset) — zero formatter work.
export function localDateKeyOf(ms: number, offsetMs: number) {
  const d = new Date(ms + offsetMs);
  return dateKeyOf(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

// The night's matches for a tz-local date: kickoff's LOCAL calendar date
// equals dateKey. A match kicked off 22:30 Oct-14 (local) belongs to the
// Oct-14 night even though it finishes Oct-15 00:30.
export function matchesOfLocalDate(matches, offsetMs: number, y: number, m: number, d: number) {
  const key = dateKeyOf(y, m, d);
  const out = [];
  for (const m0 of matches) {
    if (!m0 || !m0.utcDate) continue;
    const t = new Date(m0.utcDate).getTime();
    if (isNaN(t)) continue;
    if (localDateKeyOf(t, offsetMs) === key) out.push(m0);
  }
  return out;
}

// The night is over when every match of that local date is resolved
// (FINISHED / POSTPONED / CANCELLED / AWARDED / SUSPENDED) or is so far
// past kickoff that a stuck status can only be stale data (the 4h defense).
// v13.98-jalalinight: `defended` counts the matches resolved ONLY by that
// defense — the caller's completeness guard uses it to refuse a digest
// built off a stale pool (the 2026-10-14 01:11Z incident: the migration
// night's first digest fired on a pool whose UCL chunk hadn't refreshed,
// sending 1 game of a 12-game night).
function nightIsOver(nightMatches, nowMs: number) {
  let finished = 0, defended = 0;
  for (const m of nightMatches) {
    const st = String((m && m.status) || "").toUpperCase();
    if (st === "FINISHED") { finished++; continue; }
    if (DONE_STATUSES.includes(st)) continue;
    const ko = m && m.utcDate ? new Date(m.utcDate).getTime() : 0;
    if (ko && nowMs - ko > 4 * 60 * 60 * 1e3) { defended++; continue; } // stuck/unresolved — treat as done
    return { over: false, finished, defended };
  }
  return { over: true, finished, defended };
}

// v13.113-nightgate: THE VALUABLE-NIGHT predicate — the owner's rule
// (2026-10-17): "do not always show خلاصه شب — keep it only for the UCL
// nights, or the nights when at least 1 of the desired teams had a match
// that night/day … because none of those [random league results] are
// worth watching or mentioning." A digest exists ONLY when:
//   (a) it's a UCL night (>=1 CL match in the night's set — the digest's
//       founding product, v13.96), OR
//   (b) an elimination event happened (cup ties are ALWAYS covered — the
//       same owner message), OR
//   (c) THIS chat's desired teams played — per-chat, the exact
//       resolution userFollowsMatch uses for the "your teams" section
//       (explicit follows first, master fallback).
// Exported pure (time-independent) so the harness can drive the gate
// directly; the caller pairs it with the quiet counter + a skipped
// dedupe read/write (a quiet night costs ZERO KV ops now).
export function nightIsValuable(nightMatches, eliminations, prefs, chatId) {
  if (nightMatches.some((mm) => mm && mm.competition && mm.competition.code === "CL")) return true;
  if (Array.isArray(eliminations) && eliminations.length) return true;
  return nightMatches.some((mm) => userFollowsMatch(prefs, chatId, mm));
}

function ftScore(m) {
  const ft = m && m.score && m.score.fullTime;
  const h = ft && ft.home != null ? ft.home : null;
  const a = ft && ft.away != null ? ft.away : null;
  return h != null && a != null ? { home: h, away: a } : null;
}

// v13.110-dupcollapse: display-level insurance for the exact 2026-10-16
// regression (the user's digest printed "آینتراشت فرانکفورت ۱ - ۰ کلن"
// twice). The pool-level fold (teams.ts digitfold + canonDedupe) is the
// root fix, but ANY future provider-name variant that normalization
// misses would still reach this surface — a night can not legitimately
// contain the same ordered pairing twice (leagues are one meeting per
// matchday; a cup + league double-header of the same pairing on one
// calendar night does not exist), so collapse by competition+pairing.
// Row-quality ranking: a FINISHED copy beats a stale/live twin — the LIVE
// 2026-10-16 pool's TSP Frosinone twin carried a pre-kickoff default 0-0
// score with status SCHEDULED; a plain "later copy wins" would have let
// it displace the real FINISHED 4-2 row (and the FINISHED render filter
// would then drop the pairing entirely). FINISHED+score > FINISHED >
// scored non-FINISHED > the rest; equal rank keeps the later (fresher)
// copy — canonDedupe's own watch-order rule.
function collapsePairings(list) {
  const rank = (m) => {
    const fin = String((m && m.status) || "").toUpperCase() === "FINISHED";
    return (fin ? 2 : 0) + (ftScore(m) ? 1 : 0);
  };
  const byPair = new Map();
  for (const m of list) {
    if (!m || !m.homeTeam || !m.awayTeam) continue;
    const k = ((m.competition && m.competition.code) || "?") + "|" + normalizeTeamName(m.homeTeam.name) + "|" + normalizeTeamName(m.awayTeam.name);
    const cur = byPair.get(k);
    if (!cur || rank(m) >= rank(cur)) byPair.set(k, m);
  }
  return [...byPair.values()];
}

// Current rank of a team in its competition table (post-FT freshness).
async function teamRank(env: Env, code: string, teamName: string, rankCache: Map<string, any>) {
  if (!code || !teamName) return null;
  if (rankCache.has(code)) {
    const data = rankCache.get(code);
    return findTeamRow(data, teamName);
  }
  // fetchStandings: cache-first with a 10-min freshness gate (post-FT
  // standings matter here); on failure it returns the stale cached table —
  // a one-matchday-old rank is still a rank.
  let data: any = null;
  try {
    data = await fetchStandings(env, code, true, { freshMs: 6e5 });
  } catch (e) {
    data = null;
  }
  rankCache.set(code, data);
  return findTeamRow(data, teamName);
}

function findTeamRow(data: any, teamName: string) {
  if (!data || !Array.isArray(data.teams)) return null;
  const want = normalizeTeamName(teamName);
  for (const t of data.teams) {
    if (normalizeTeamName(t.name) === want) return t;
  }
  return null;
}

export async function maybeSendNightDigest(env: Env, chatIds, matches?) {
  const out = { sent: 0, skipped: 0, noMatches: 0, notOver: 0, quiet: 0 };
  if (!Array.isArray(chatIds) || !chatIds.length) return out;
  // The tick's merged live pool beats the KV snapshot (tonight's statuses
  // live there minutes before the next full sweep persists them).
  let pool = Array.isArray(matches) && matches.length ? matches : null;
  if (!pool) {
    const blob = await env.STATE.get(CONFIG.KV_MATCHES_KEY, "json").catch(() => null);
    pool = blob && Array.isArray(blob.matches) ? blob.matches : [];
  }
  if (!pool.length) return out;
  const prefs = typeof getUserPrefs === "function" ? await getUserPrefs(env) : {};
  // v13.94 wall-proofing: a digest is cosmetic — never spend a tick that is
  // already at the subrequest wall.
  if (subrequestCount() >= 44) return out;
  // Group chats by tz (a Sydney night ends ~7h before Tehran's).
  const byTz = new Map();
  for (const c of chatIds) {
    const tz = (typeof getUserTz === "function" ? getUserTz(prefs, c, env) : env.TEHRAN_TZ) || env.TEHRAN_TZ || "Asia/Tehran";
    if (!byTz.has(tz)) byTz.set(tz, []);
    byTz.get(tz).push(c);
  }
  const nowMs = Date.now();
  const rankCache = new Map();
  for (const [tz, tzChats] of byTz) {
    const offset = tzOffsetMs(tz);
    if (offset == null) continue;
    const lpNow = new Date(Date.now() + offset);
    const hour = lpNow.getUTCHours();
    // Early morning (<6h) summarizes YESTERDAY's evening; the evening
    // itself (>=20h) summarizes today once everything is done.
    let y = lpNow.getUTCFullYear(), m = lpNow.getUTCMonth() + 1, d = lpNow.getUTCDate();
    if (hour < 6) {
      const prev = new Date(Date.UTC(y, m - 1, d) - 24 * 60 * 60 * 1e3);
      y = prev.getUTCFullYear(); m = prev.getUTCMonth() + 1; d = prev.getUTCDate();
    } else if (hour < 20) {
      continue; // daytime — the night hasn't started ending yet
    }
    const dateKey = dateKeyOf(y, m, d);
    let nightMatches = matchesOfLocalDate(pool, offset, y, m, d);
    // v13.113-alquiet: the bot-silent leagues leave the night's set
    // ENTIRELY (the owner's rule: "Do not notify Australia league in the
    // robot") — AL rows never gate the digest, never render a line, and
    // never block the completeness check either. An AL-only night is a
    // no-op from here down.
    nightMatches = nightMatches.filter((mm) => mm && !isBotSilentLeague(mm.competition && mm.competition.code));
    if (!nightMatches.length) continue;
    // v13.99-uclgif: UCL nights (>=1 CL match in the night's set) open with
    // the UCL.gif banner — the results half of the user's ask:
    //   GIF
    //   [result 1] [result 2] ...
    // The banner is cosmetic: budget-guarded (< 42), wrapped so a failure
    // can never touch the digest text behind it.
    const nightHasUcl = nightMatches.some((mm) => mm && mm.competition && mm.competition.code === "CL");
    const verdict = nightIsOver(nightMatches, nowMs);
    if (!verdict.over) { out.notOver++; continue; }
    if (verdict.finished < 1) continue; // nothing actually resolved — no digest
    // v13.98-jalalinight: the STALE-POOL completeness guard. When the 4h
    // defense is what "resolved" half or more of the night, the pool is
    // almost certainly stale (a failed/partial sweep — the migration-night
    // shape: 1 FINISHED + 11 stale IN_PLAY), not a genuinely frozen match.
    // Defer to a later tick in the window so a fresh sweep can complete the
    // night; at the window's last hour (local 23h or 5h) send anyway — the
    // 2026-10-13 lesson (a frozen pool must not block the digest forever)
    // still holds.
    const lastChance = hour >= 23 || hour >= 5; // window is [20,24) ∪ [0,6)
    if (verdict.defended > 0 && verdict.finished * 2 < nightMatches.length && !lastChance) {
      console.log(`\u{1F319} Night digest deferred (stale pool: ${verdict.finished} finished, ${verdict.defended} defended of ${nightMatches.length}) — waiting for a fresh sweep`);
      out.notOver++;
      continue;
    }
    // v13.113-cupcover: the ALWAYS-COVERED events — a cup tie whose loser
    // is decided tonight (single-leg knockout, or a two-leg tie the pool
    // still holds both legs of). Computed over the FULL pool: the first
    // leg of a two-leg tie lives in an earlier night's rows.
    const eliminations = collectEliminations(nightMatches, pool);
    for (const c of tzChats) {
      // v13.113-nightgate: THE VALUABLE-NIGHT GATE — see nightIsValuable.
      if (!nightIsValuable(nightMatches, eliminations, prefs, c)) { out.quiet++; continue; }
      const dedupeKey = "nightdigest_" + dateKey + "_" + c;
      const already = await env.STATE.get(dedupeKey).catch(() => null);
      if (already) { out.skipped++; continue; }
      const lang = (prefs[String(c)] && prefs[String(c)].lang) === "en" ? "en" : "fa";
      // v13.36-nospam: write-first — mark before the send so a failed KV
      // write can't re-send the digest on every tick of the window.
      await env.STATE.put(dedupeKey, String(Date.now()), { expirationTtl: 36 * 60 * 60 }).catch(() => {});
      let msg: string;
      try {
        msg = await buildNightDigestMessage({ ...env, TEHRAN_TZ: tz }, nightMatches, lang, prefs, c, rankCache, { y, m, d }, eliminations);
      } catch (e) {
        console.error("night digest build failed: " + e.message);
        continue;
      }
      // v13.99-uclgif: the banner goes FIRST (GIF, then the results text —
      // the user's exact layout). A dead chat / wall-hit / any failure here
      // only skips the GIF: the digest text below still sends.
      if (nightHasUcl && subrequestCount() < 42) {
        try {
          const cap = lang === "en"
            ? "\u{1F3C6} Champions League \u2014 night results"
            : "\u{1F3C6} \u0644\u06CC\u06AF \u0642\u0647\u0631\u0645\u0627\u0646\u0627\u0646 \u0627\u0631\u0648\u067E\u0627 \u2014 \u0646\u062A\u0627\u06CC\u062C \u0634\u0628";
          await sendUclGifBanner({ ...env, TEHRAN_TZ: tz }, c, cap);
        } catch (e) {
          console.warn("UCL night banner failed: " + e.message);
        }
      }
      const r = await sendTelegram({ ...env, TEHRAN_TZ: tz }, msg, c);
      if (r === true) out.sent++;
      else out.skipped++; // dead or failed — already marked, don't retry this night
    }
    if (out.sent) console.log(`\u{1F319} Night results digest (${tz}): sent=${out.sent} skipped=${out.skipped}` + (nightHasUcl ? " (+UCL banner)" : ""));
    else if (out.quiet) console.log(`\u{1F319} Night digest (${tz}): quiet night — ${out.quiet} chat(s) skipped the valuable-night gate (no UCL, no desired team, no elimination)`);
  }
  return out;
}

export async function buildNightDigestMessage(env: Env, nightMatches, lang, prefs, chatId, rankCache, nightYmd?, eliminations?) {
  const en = lang === "en";
  // v13.110-dupcollapse: the same fixture reaching the night's set through
  // two provider spellings renders ONCE (the 2026-10-16 double line).
  nightMatches = collapsePairings(nightMatches);
  // v13.113-cupcover: the always-covered elimination events (already
  // computed by the caller over the FULL pool — twin legs included).
  const elimList = Array.isArray(eliminations) ? eliminations : [];
  // v13.98-jalalinight: the header renders the night's LOCAL date fully in
  // the user's calendar — Jalali (Hijri-Shamsi) for fa mode ("سه‌شنبه ۲۱ مهر
  // ۱۴۰۵"), Gregorian long-form for en. The y/m/d comes from the caller's
  // tz-local dateKey (the fallback re-derives it from the first match under
  // the chat's tz, as the pre-13.98 code did).
  let ny = nightYmd && nightYmd.y, nm = nightYmd && nightYmd.m, nd = nightYmd && nightYmd.d;
  if (!ny || !nm || !nd) {
    const p: any = {};
    const parts = new Intl.DateTimeFormat("en-GB", { timeZone: env.TEHRAN_TZ || "Asia/Tehran", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(nightMatches[0].utcDate));
    for (const x of parts) p[x.type] = x.value;
    ny = parseInt(p.year, 10); nm = parseInt(p.month, 10); nd = parseInt(p.day, 10);
  }
  const head = en
    ? "*\u{1F319} Night results \u2014 " + englishDateYmd(ny, nm, nd) + "*\n\n"
    : "*\u{1F319} \u062E\u0644\u0627\u0635\u0647 \u0646\u062A\u0627\u06CC\u062C \u0634\u0628 \u2014 " + jalaliDateFa(ny, nm, nd) + "*\n\n";
  // Split: the user's followed-team matches vs the rest. v13.113-cupcover:
  // a pairing that produced an elimination event renders in the
  // elimination section (or "your teams", when followed — the personal
  // verdict outranks the league-wide line), never as a THIRD plain line.
  const elimKeys = new Set();
  for (const ev of elimList) elimKeys.add(ev.code + "|" + normalizeTeamName(ev.home) + "|" + normalizeTeamName(ev.away));
  const mine = [], others = [];
  for (const m of nightMatches) {
    if (String((m && m.status) || "").toUpperCase() !== "FINISHED") continue;
    const follow = userFollowsMatch(prefs, chatId, m);
    if (follow) { mine.push(m); continue; }
    const k = ((m.competition && m.competition.code) || "?") + "|" + normalizeTeamName(m.homeTeam.name) + "|" + normalizeTeamName(m.awayTeam.name);
    if (elimKeys.has(k)) continue; // the eliminations section owns this row
    others.push(m);
  }
  // v13.100-priority: the user's rule inside "بازی‌های شما" too — both-sides
  // followed (+featured bonus) lead the section, one-side follow, then by
  // kickoff inside each tier. The 2026-10-14 shape: LASK–Liverpool (one side,
  // 20:15) used to open the digest while City–PSG (both sides, 22:30) sat
  // last — now the marquee clash reads first.
  mine.sort((a, b) => priorityTier(b, prefs, chatId) - priorityTier(a, prefs, chatId) || new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime());
  const sections: string[] = [];
  // Section 1 — followed teams: result sentence + current rank.
  if (mine.length) {
    const title = en ? "*Your teams:*\n" : "*\u0628\u0627\u0632\u06CC\u200C\u0647\u0627\u06CC \u0634\u0645\u0627:*\n";
    const lines: string[] = [];
    for (const m of mine.slice(0, 6)) {
      const homeName = en ? m.homeTeam.name : translateTeam(m.homeTeam.name);
      const awayName = en ? m.awayTeam.name : translateTeam(m.awayTeam.name);
      const sc = ftScore(m);
      // v13.96: the verdict reads from the FOLLOWED side's perspective
      // ("آرسنال در مقابل لیل برنده شد") — side-aware, master-list fallback
      // included, via userFollowsSides (users.ts).
      const sides = userFollowsSides(prefs, chatId, m);
      const followHome = sides.home || !sides.away ? true : false;
      let line: string;
      if (sc) {
        const my = followHome ? sc.home : sc.away;
        const their = followHome ? sc.away : sc.home;
        const verdict = my > their ? (en ? "won" : "\u0628\u0631\u0646\u062F\u0647 \u0634\u062F") : my < their ? (en ? "lost" : "\u0628\u0627\u062E\u062A") : (en ? "drew" : "\u0645\u0633\u0627\u0648\u06CC \u06A9\u0631\u062F");
        // v13.96.1 lesson preserved: the score passes through mdBold, which
        // escapes '-' and every other reserved char INSIDE the entity (the
        // 01:00Z tick's "can't parse entities" rejection burned all four
        // sends of the first digest). v13.106: the score is BOLD now.
        if (en) {
          line = "\u26BD " + mdBold(followHome ? homeName : awayName) + " " + verdict + " against " + escapeMarkdownCharacters(followHome ? awayName : homeName) + " \u2014 " + mdBold(en ? (sc.home + " - " + sc.away) : toFaDigits(String(sc.home) + " - " + String(sc.away)));
        } else {
          line = "\u26BD " + mdBold(followHome ? homeName : awayName) + " \u062F\u0631 \u0645\u0642\u0627\u0628\u0644 " + escapeMarkdownCharacters(followHome ? awayName : homeName) + " " + verdict + " \u2014 " + mdBold(en ? (sc.home + " - " + sc.away) : toFaDigits(String(sc.home) + " - " + String(sc.away)));
        }
      } else {
        const noScore = en ? "Score not available" : "\u0646\u062A\u06CC\u062C\u0647 \u062F\u0631 \u062F\u0633\u062A\u0631\u0633 \u0646\u06CC\u0633\u062A";
        line = "\u26BD " + escapeMarkdownCharacters(homeName) + " \u{1F19A} " + escapeMarkdownCharacters(awayName) + " \u2014 " + noScore;
      }
      lines.push(line);
      // \u0631\u062A\u0628\u0647 \u0641\u0639\u0644\u06CC: the followed side's CURRENT table position.
      const sideName = followHome ? m.homeTeam.name : m.awayTeam.name;
      const code = m.competition && m.competition.code;
      const row = code && !["FA_CUP", "EFL_CUP", "CDR", "COPPA_ITALIA", "HAZFI_CUP"].includes(code)
        ? await teamRank(env, code, sideName, rankCache)
        : null;
      if (row && row.pos != null) {
        const rankStr = escapeMarkdownCharacters(en
          ? "\u{1F4CA} Current rank: " + row.pos + (row.points != null ? " | " + row.points + " pts" : "")
          : "\u{1F4CA} \u0631\u062A\u0628\u0647 \u0641\u0639\u0644\u06CC: " + toFaDigits(String(row.pos)) + (row.points != null ? " | " + toFaDigits(String(row.points)) + " \u0627\u0645\u062A\u06CC\u0627\u0632" : ""));
        lines.push(rankStr);
      }
      lines.push("");
    }
    if (mine.length > 6) {
      const extra = escapeMarkdownCharacters(en ? "+ " + (mine.length - 6) + " more of your teams" : "\u2026 \u0648 " + toFaDigits(String(mine.length - 6)) + " \u0628\u0627\u0632\u06CC \u062F\u06CC\u06AF\u0631 \u0627\u0632 \u062A\u06CC\u0645\u200C\u0647\u0627\u06CC \u0634\u0645\u0627");
      lines.push(extra);
    }
    sections.push(title + lines.join("\n"));
  }
  // Section 2 — v13.113-cupcover: the elimination events (the owner's
  // "always cover elimination cups" rule — the one content class the
  // valuable-night gate can never silence).
  if (elimList.length) {
    sections.push(renderEliminationSection(elimList, en));
  }
  // Section 3 — every other result of the night, grouped by competition.
  if (others.length) {
    const title = en ? "*All results of the night:*\n" : "*\u0646\u062A\u0627\u06CC\u062C \u0634\u0628:*\n";
    const byComp = new Map();
    for (const m of others) {
      const code = (m.competition && m.competition.code) || "?";
      if (!byComp.has(code)) byComp.set(code, []);
      byComp.get(code).push(m);
    }
    const lines: string[] = [];
    let shown = 0;
    const LIMIT = 20;
    for (const [code, list] of byComp) {
      const comp = en ? code : translateCompetition(code);
      lines.push("\u{1F3C6} " + mdItalic(comp));
      for (const m of list) {
        if (shown >= LIMIT) break;
        const homeName = en ? m.homeTeam.name : translateTeam(m.homeTeam.name);
        const awayName = en ? m.awayTeam.name : translateTeam(m.awayTeam.name);
        const sc = ftScore(m);
        const scoreStr = sc ? mdBold(en ? (sc.home + " - " + sc.away) : toFaDigits(String(sc.home) + " - " + String(sc.away))) : (en ? "n/a" : "\u061F");
        lines.push(escapeMarkdownCharacters(homeName) + " " + scoreStr + " " + escapeMarkdownCharacters(awayName));
        shown++;
      }
    }
    if (others.length > shown) {
      const extra = escapeMarkdownCharacters(en ? "+ " + (others.length - shown) + " more" : "\u2026 \u0648 " + toFaDigits(String(others.length - shown)) + " \u0628\u0627\u0632\u06CC \u062F\u06CC\u06AF\u0631");
      lines.push(extra);
    }
    sections.push(title + lines.join("\n"));
  }
  if (!sections.length) {
    // Followed nothing played and nothing finished — unreachable in
    // practice (the caller requires >= 1 FINISHED), keep the guard anyway.
    return en ? "*\u{1F319} Night results*" : "*\u{1F319} \u062E\u0644\u0627\u0635\u0647 \u0646\u062A\u0627\u06CC\u062C \u0634\u0628*";
  }
  return head + sections.join("\n");
}

// v13.113-cupcover: the "Club X eliminated against Y" section — grouped by
// competition (the same \u{1F3C6} italic labels as the results section); each
// line names the LOSER (the digest's job: what changed, who is OUT).
// MarkdownV2-safe: names via escapeMarkdownCharacters, the aggregate via
// toFaDigits + escape (the '-' is a reserved char — the v13.96.1 lesson).
function renderEliminationSection(eliminations, en) {
  const byComp = new Map();
  for (const ev of eliminations) {
    if (!ev || !ev.code) continue;
    if (!byComp.has(ev.code)) byComp.set(ev.code, []);
    byComp.get(ev.code).push(ev);
  }
  const lines = [];
  for (const [code, list] of byComp) {
    const comp = en ? code : translateCompetition(code);
    lines.push("\u{1F3C6} " + mdItalic(comp));
    for (const ev of list) {
      const loser = en ? ev.loser : translateTeam(ev.loser);
      const winner = en ? ev.winner : translateTeam(ev.winner);
      // The paren/dot literals are ESCAPED inline (\( \) \.) — reserved
      // chars in MarkdownV2, the v13.90 parse-400 graveyard class; the
      // names/scores/aggregate ride escapeMarkdownCharacters as usual.
      if (en) {
        lines.push("\u274C " + escapeMarkdownCharacters(loser) + " eliminated by " + escapeMarkdownCharacters(winner)
          + (ev.final ? " in the final" : "")
          + (ev.agg ? " \\(agg\\. " + escapeMarkdownCharacters(ev.agg.w + " - " + ev.agg.l) + "\\)" : ""));
      } else {
        lines.push("\u274C " + escapeMarkdownCharacters(loser) + (ev.final ? " \u062F\u0631 \u0641\u06CC\u0646\u0627\u0644" : "") + " \u0645\u0642\u0627\u0628\u0644 " + escapeMarkdownCharacters(winner) + " \u062D\u0630\u0641 \u0634\u062F"
          + (ev.agg ? " \\(\u0645\u062C\u0645\u0648\u0639 " + escapeMarkdownCharacters(toFaDigits(ev.agg.w + " - " + ev.agg.l)) + "\\)" : ""));
      }
    }
  }
  const title = en ? "*Cup eliminations:*\n" : "*\u062D\u0630\u0641\u200C\u0634\u062F\u06AF\u0627\u0646 \u062C\u0627\u0645\u200C\u0647\u0627\u06CC \u062D\u0630\u0641\u06CC:*\n";
  return title + lines.join("\n");
}
