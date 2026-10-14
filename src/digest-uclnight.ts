// SportSignal — the UCL NIGHT PREVIEW (v13.99-uclgif): on a day that HAS
// Champions League matches (competition code "CL" — league phase + knockouts;
// data-driven, NOT weekday-driven: "UCL night" is whatever tz-local date
// has >=1 CL match), every chat gets:
//
//   [UCL.gif banner — plain-text caption with the Jalali/Gregorian date]
//   *🏆 شب لیگ قهرمانان اروپا — چهارشنبه ۲۲ مهر ۱۴۰۵*
//   ⚽ آرسنال 🆚 شاختار — ۲۰:۱۵
//   ⚽ اینتر 🆚 بایرن — ۲۲:۳۰
//
// i.e. the fixtures half of the user's ask ("show this gif two times a day,
// one at showing the 2-3 match times together"). The results half — GIF +
// the night digest — lives in digest-night.ts (nightHasUcl).
//
// WHEN it fires (per chat, per its own timezone):
//   - ONCE per chat per date: KV `uclnight_<dateKey>_<chatId>` (write-first,
//     the v13.36-nospam discipline), TTL 36h.
//   - Window: [first CL kickoff − 6h, first CL kickoff − 10min] — the
//     CONFIG.UCL_PREVIEW_LEAD_MS / TAIL_MS tunables. Before the window the
//     day is still "far away" (morning); after it the ball is rolling and a
//     fixture list is stale. A feature deployed MID-window (today's case)
//     still fires on the first tick inside the window; a deploy after
//     kickoff skips cleanly — the dedupe key is never written, tomorrow's
//     UCL night starts fresh.
//   - NO preview when the local date has zero CL matches (an empty preview
//     is spam, and the user only asked for UCL nights).
//
// Fan-out safety (the v13.94 lessons): entry wall-guard at >= 40 (the
// notify engine's cards own the budget first — the preview defers to a
// later tick inside its 6h window), per-chat send isolation, and the
// message body is built ONCE per language per tz (getJalaliTime /
// getEnglishTime construct an Intl formatter per call — the v13.96.1
// discipline: a handful of constructions on the ONE preview tick per day,
// never per chat).

import { CONFIG } from "./config";
import type { Env } from "./types";
import { toFaDigits, escapeMarkdownCharacters, jalaliDateFa, englishDateYmd, subrequestCount, getJalaliTime, getEnglishTime } from "./utils";
import { translateTeam } from "./translate";
import { sendTelegram, sendUclGifBanner } from "./telegram";
import { getUserPrefs, getUserTz } from "./users";
import { priorityTier } from "./match-classify";
import { tzOffsetMs, dateKeyOf, matchesOfLocalDate } from "./digest-night";

// football-data.org: the Champions League proper. (Qualifiers are "CLQ",
// Conference "CONF" etc. — deliberately NOT part of "UCL night".)
const UCL_CODES = ["CL"];

// Pure window verdict (harness-testable): given the first CL kickoff and
// now, should the preview fire? "early" = the day is still too far ahead,
// "late" = the ball is rolling (within the 10-min tail), "fire" = in-window.
export function previewWindowState(firstKoMs, nowMs) {
  if (!firstKoMs || isNaN(firstKoMs)) return "none";
  if (nowMs < firstKoMs - CONFIG.UCL_PREVIEW_LEAD_MS) return "early";
  if (nowMs > firstKoMs - CONFIG.UCL_PREVIEW_TAIL_MS) return "late";
  return "fire";
}

export async function maybeSendUclNightPreview(env: Env, chatIds, matches?) {
  const out = { sent: 0, skipped: 0, noUcl: 0, notInWindow: 0 };
  if (!Array.isArray(chatIds) || !chatIds.length) return out;
  // The tick's merged live pool beats the KV snapshot (same preference as
  // the night digest — tonight's fixtures are freshest there).
  let pool = Array.isArray(matches) && matches.length ? matches : null;
  if (!pool) {
    const blob = await env.STATE.get(CONFIG.KV_MATCHES_KEY, "json").catch(() => null);
    pool = blob && Array.isArray(blob.matches) ? blob.matches : [];
  }
  if (!pool.length) return out;
  const prefs = typeof getUserPrefs === "function" ? await getUserPrefs(env) : {};
  // Cosmetic: the preview never spends a busy tick — its 6h window gives the
  // next 10-min tick (and 35 more after that) another chance.
  if (subrequestCount() >= 40) return out;
  const byTz = new Map();
  for (const c of chatIds) {
    const tz = (typeof getUserTz === "function" ? getUserTz(prefs, c, env) : env.TEHRAN_TZ) || env.TEHRAN_TZ || "Asia/Tehran";
    if (!byTz.has(tz)) byTz.set(tz, []);
    byTz.get(tz).push(c);
  }
  const nowMs = Date.now();
  for (const [tz, tzChats] of byTz) {
    const offset = tzOffsetMs(tz);
    if (offset == null) continue;
    const lp = new Date(nowMs + offset);
    const y = lp.getUTCFullYear(), m = lp.getUTCMonth() + 1, d = lp.getUTCDate();
    const dateKey = dateKeyOf(y, m, d);
    const todayMatches = matchesOfLocalDate(pool, offset, y, m, d);
    const ucl = todayMatches
      .filter((mm) => mm && mm.competition && UCL_CODES.indexOf(mm.competition.code) > -1)
      .sort((a, b) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime());
    if (!ucl.length) { out.noUcl++; continue; }
    const firstKo = new Date(ucl[0].utcDate).getTime();
    const state = previewWindowState(firstKo, nowMs);
    if (state !== "fire") { out.notInWindow++; continue; }
    // v13.100-priority: the fixture list is PER-CHAT now (each chat's desired
    // teams lead — the user's rule: both-sides followed first, then one side,
    // then the rest; the curated featured clash breaks the both-sides ties).
    // The v13.96.1 CPU discipline SURVIVES the split: the expensive part (the
    // Intl time string per match per language) is built ONCE per match per
    // lang in lineFor's cache — never per chat. Per chat the build is pure
    // set-lookups + sort + string joins.
    const envTz = { ...env, TEHRAN_TZ: tz };
    const lineCache = new Map(); // lang -> Map(matchKey -> line)
    const lineFor = (mt, lang) => {
      if (!lineCache.has(lang)) lineCache.set(lang, new Map());
      const cache = lineCache.get(lang);
      const k = String(mt.id || "") + "|" + mt.utcDate;
      let line = cache.get(k);
      if (line === undefined) {
        line = uclPreviewLine(envTz, mt, lang);
        cache.set(k, line);
      }
      return line;
    };
    for (const c of tzChats) {
      const dedupeKey = "uclnight_" + dateKey + "_" + c;
      const already = await env.STATE.get(dedupeKey).catch(() => null);
      if (already) { out.skipped++; continue; }
      const lang = (prefs[String(c)] && prefs[String(c)].lang) === "en" ? "en" : "fa";
      // v13.36-nospam: write-first — mark BEFORE any send so a KV hiccup
      // can't re-send the preview on the window's later ticks.
      await env.STATE.put(dedupeKey, String(Date.now()), { expirationTtl: 36 * 60 * 60 }).catch(() => {});
      // The banner first (GIF, then the fixture text — the user's exact
      // layout). A failed banner only skips the GIF, never the text.
      if (subrequestCount() < 42) {
        try {
          const cap = lang === "en"
            ? "\u{1F3C6} Champions League \u2014 " + englishDateYmd(y, m, d)
            : "\u{1F3C6} \u0634\u0628 \u0644\u06CC\u06AF \u0642\u0647\u0631\u0645\u0627\u0646\u0627\u0646 \u0627\u0631\u0648\u067E\u0627 \u2014 " + jalaliDateFa(y, m, d);
          await sendUclGifBanner(envTz, c, cap);
        } catch (e) {
          console.warn("UCL preview banner failed: " + e.message);
        }
      }
      let msg;
      try {
        msg = buildUclPreviewMessage(envTz, uclPreviewOrder(ucl, prefs, c), lang, y, m, d, (mt) => lineFor(mt, lang));
      } catch (e) {
        console.error("UCL preview build failed: " + e.message);
        continue;
      }
      const r = await sendTelegram(envTz, msg, c);
      if (r === true) out.sent++;
      else out.skipped++; // dead or failed — already marked, this night is done
    }
    if (out.sent) console.log(`\u{1F3AF} UCL night preview (${tz}): sent=${out.sent} skipped=${out.skipped} (${ucl.length} games)`);
  }
  return out;
}

// v13.100-priority: the per-chat ORDERING — pure and harness-testable.
// Sort key: priorityTier DESC (both-sides-followed + featured-bonus first —
// see match-classify.ts), then kickoff ASC inside each tier (the 20:15
// games stay ahead of the 22:30 ones inside their tier). Returns a NEW
// array (the caller's ucl array is shared across chats — never mutated).
export function uclPreviewOrder(ucl, prefs, chatId) {
  const ko = (m) => {
    const t = new Date(m.utcDate).getTime();
    return isNaN(t) ? 0 : t;
  };
  return ucl.slice().sort((a, b) => priorityTier(b, prefs, chatId) - priorityTier(a, prefs, chatId) || ko(a) - ko(b));
}

// v13.100-priority: ONE fixture line (team names + local time). Extracted so
// the per-chat path can memoize lines once per match per language while the
// ordering varies per chat. Same escape discipline as before.
export function uclPreviewLine(env: Env, mt, lang) {
  const en = lang === "en";
  const home = en ? mt.homeTeam.name : translateTeam(mt.homeTeam.name);
  const away = en ? mt.awayTeam.name : translateTeam(mt.awayTeam.name);
  const t = en ? getEnglishTime(mt.utcDate, env) : getJalaliTime(mt.utcDate, env);
  return "\u26BD " + escapeMarkdownCharacters(home) + " \u{1F19A} " + escapeMarkdownCharacters(away) + " \u2014 " + escapeMarkdownCharacters(t);
}

// The fixture-list text (the message under the GIF). MarkdownV2, same escape
// discipline as the night digest: team names escaped (the v13.96.1 '-'/'|'
// lesson), times are pure digits+colon (escape is a no-op, applied anyway).
// v13.100-priority: renders the array AS GIVEN — the per-chat ordering is
// uclPreviewOrder's job (the caller passes it pre-sorted). lineBuilder lets
// the fan-out loop inject its memoized lines (once per match per lang); a
// direct call builds each line itself (harness path — same output).
export function buildUclPreviewMessage(env: Env, uclMatches, lang, y, m, d, lineBuilder?) {
  const en = lang === "en";
  const head = en
    ? "*\u{1F3C6} Champions League night \u2014 " + englishDateYmd(y, m, d) + "*\n\n"
    : "*\u{1F3C6} \u0634\u0628 \u0644\u06CC\u06AF \u0642\u0647\u0631\u0645\u0627\u0646\u0627\u0646 \u0627\u0631\u0648\u067E\u0627 \u2014 " + jalaliDateFa(y, m, d) + "*\n\n";
  const lines = [];
  const LIMIT = 16; // the league-phase max is 18 simultaneous; 16 + "+N more" keeps it readable
  for (const mt of uclMatches.slice(0, LIMIT)) {
    lines.push(lineBuilder ? lineBuilder(mt) : uclPreviewLine(env, mt, lang));
  }
  if (uclMatches.length > LIMIT) {
    const extra = en
      ? "+ " + (uclMatches.length - LIMIT) + " more"
      : "\u2026 \u0648 " + toFaDigits(String(uclMatches.length - LIMIT)) + " \u0628\u0627\u0632\u06CC \u062F\u06CC\u06AF\u0631";
    lines.push(escapeMarkdownCharacters(extra));
  }
  return head + lines.join("\n");
}
