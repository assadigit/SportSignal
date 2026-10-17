// SportSignal — the MATCHDAY MORNING digest: today's master big matches at
// 9am local tz, once per chat per day (per-chat KV dedupe via
// digest_sent_<date>_<chatId> — mark-before-send). Extracted from digest.ts
// in v13.77-digestnotify.
import { CONFIG } from "./config";
import { COMP_EN } from "./tables";
import type { Env } from "./types";
import { toFaDigits, escapeMarkdownCharacters, zonedHm, zonedYmDHm } from "./utils";
// v13.106-mdstyle: entity builders (bold match header / italic competition
// label). v13.107-plaintimes: the fixture TIME renders PLAIN (mdEscape) —
// the user's readability ask (was a monospace code span in v13.106).
import { mdBold, mdItalic, mdEscape } from "./md";
import { translateTeam, translateCompetition } from "./translate";
import { sendTelegram } from "./telegram";
import { getUserPrefs, getUserTz, isMasterBigMatch } from "./users";
// v13.113-alquiet: the bot-silent league gate — the morning digest lists no
// AL big-vs-big either (the owner's rule).
import { isBotSilentLeague } from "./match-classify";
import { getCachedMatches } from "./match-pool";

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
    // v13.116-tzproof: the 9am gate reads the wall clock by ARITHMETIC
    // (verified shortOffset + math) — the date-bearing Intl shape stays
    // as the fallback. A broken colo rendering the old gate as UTC would
    // fire the digest at 12:30 Tehran instead of 9:00.
    let hour = -1, dateKey = null;
    const wall = zonedYmDHm(tz);
    if (wall) {
      hour = wall.hh;
      const p2 = (n) => (n < 10 ? "0" + n : "" + n);
      dateKey = wall.y + "-" + p2(wall.m) + "-" + p2(wall.d);
    } else {
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
      !isBotSilentLeague(m.competition.code) &&
      isMasterBigMatch(m) &&
      m.status !== "FINISHED" &&
      (function () { const tt = new Date(m.utcDate).getTime(); return tt >= dayStart && tt < dayEnd; })()
    ).sort((a, b) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime());
    if (!todayBig.length) continue;
    // Per-chat send with dedupe. Use the original env.TEHRAN_TZ for time
    // rendering in the user's lang (the matches are at UTC instants; the
    // time displayed is whatever tz the user has set).
    // v13.5-tz-scope: the tz flows through a CLONED env instead of mutating
    // the shared env object (isolate-safety for concurrent requests).
    for (const c of tzChats) {
      const scopedEnv: Env = { ...env, TEHRAN_TZ: tz };
      const dedupeKey = "digest_sent_" + dateKey + "_" + c;
      const already = await env.STATE.get(dedupeKey).catch(() => null);
      if (already) { out.skipped++; continue; }
      const lang = (prefs[String(c)] && prefs[String(c)].lang) === "en" ? "en" : "fa";
      // v13.36-nospam: write-first — mark the digest as sent BEFORE the
      // Telegram send. The old send-then-mark order meant a failed KV write
      // re-sent the digest on every tick of the 9am hour.
      await env.STATE.put(dedupeKey, String(Date.now()), { expirationTtl: 36 * 60 * 60 }).catch(() => {});
      const msg = await buildMorningDigestMessage(scopedEnv, todayBig, lang);
      const r = await sendTelegram(scopedEnv, msg, c);
      if (r === true) {
        out.sent++;
      } else if (r === "dead") {
        // Already marked above — don't retry a dead chat all 9am hour.
        out.skipped++;
      }
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
    // v13.116-tzproof: was a TIME-ONLY Intl format (the broken-colo UTC/LMT
    // class) — arithmetic now.
    const time = zonedHm(env.TEHRAN_TZ || "Asia/Tehran", new Date(m.utcDate));
    const timeStr = en ? time : toFaDigits(time);
    const vs = en ? " vs " : " \u{1F19A} ";
    lines.push("\u26BD " + mdBold(home) + vs + mdBold(away) + " \u2014 " + mdEscape(timeStr) + " \u2014 " + mdItalic(comp));
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
