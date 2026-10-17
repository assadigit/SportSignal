// SportSignal — chat registry & user preferences: registered chats,
// bot member profiles, per-user prefs (teams / timezone / language), the
// followable master team list, tz resolution and per-tz grouping.


import { CONFIG } from "./config";
import type { Env } from "./types";
import { toFaDigits, bumpSubrequest, tzOffsetMinutes } from "./utils";
// v13.106-mdstyle: the welcome greeting line is the message title - BOLD.
import { mdBold } from "./md";
import { normalizeTeamName } from "./teams";
import { sendTelegram } from "./telegram";
import { normAlias } from "./teams";
// v13.92-d1userstore: the storage seam — D1 primary (quota-proof user
// writes), legacy KV paths verbatim when USERS_DB is unbound (local dev,
// eval harness), legacy snapshot on D1 read failure.
import { registeredChats, userPrefsAll, saveUserPref, chatProfilesAll, saveChatProfilesBulk } from "./user-store";

export async function getRegisteredChats(env: Env) {
  try {
    // v13.92-d1userstore: registeredChats returns number[] (EMPTY [] is a
    // real answer once the migration marker exists) or null when storage is
    // absent/unreadable — the [CHAT_ID] seed fallback below is unchanged.
    const ids = await registeredChats(env);
    if (Array.isArray(ids)) return ids;
  } catch (error) {
    console.error("Invalid users KV data:", error.message);
  }
  const fallback = parseInt(env.CHAT_ID);
  return isNaN(fallback) ? [] : [fallback];
}
export async function getBotMembers(env: Env) {
  const chats = await getRegisteredChats(env);
  // v13.92-d1userstore: profiles via the seam (D1 primary / KV fallback);
  // the getChat backfill write goes through saveChatProfilesBulk (per-row
  // D1 upserts — no more whole-blob rewrite).
  const profiles = await chatProfilesAll(env);
  const members = chats.map((id) => {
    const p = profiles[String(id)] || {};
    return { id, username: p.username || null, first_name: p.first_name || null, title: p.title || null, joined: p.joined || null };
  });
  let backfilled = 0;
  const missing = members.filter((m) => !m.username && !m.first_name && !m.title);
  for (const m of missing) {
    if (backfilled >= 40) break;
    // v13.45-sightlines (F10): the getChat backfill fetches were invisible
    // to the subrequest counter — count them; budget-out stops the backfill
    // (profiles fill in on a later request).
    if (bumpSubrequest()) break;
    try {
      const res = await fetch("https://api.telegram.org/bot" + env.BOT_TOKEN + "/getChat?chat_id=" + encodeURIComponent(m.id));
      const d = await res.json() as any;
      if (d && d.ok && d.result) {
        const c = d.result;
        m.username = c.username || null;
        m.first_name = c.first_name || null;
        m.title = c.title || null;
        profiles[String(m.id)] = { username: m.username, first_name: m.first_name, title: m.title, joined: m.joined || (new Date()).toISOString() };
        backfilled++;
      }
    } catch (e) {
    }
  }
  if (backfilled > 0) {
    await saveChatProfilesBulk(env, profiles);
  }
  members.sort((a, b) => String(a.id).localeCompare(String(b.id)));
  return { count: members.length, backfilled, members };
}
export async function getUserPrefs(env: Env) {
  try {
    // v13.5-sim-scope: request-scoped override (set only by /api/simulate's
    // cloned env) — the shared CONFIG is never mutated at runtime.
    // v13.92-d1userstore: the seam reads D1 first (SIM key short-circuits
    // inside userPrefsAll; D1 failure falls back to the legacy KV snapshot).
    // Same {chatId: {teams, tz, lang}} shape every consumer reads.
    return await userPrefsAll(env);
  } catch (e) {
    return {};
  }
}
// v12.x-bilingual-bot getUserLang — REMOVED in v13.46-trim: zero call sites
// (the Persian-first audience made the default "fa" universal; /lang prefs are
// read directly by the composers where needed). setUserLang below is LIVE.
// v12.x-bilingual-bot: set the user's language preference. Writes
// user_prefs[chatId].lang. Preserves the existing teams + tz fields.
// v13.92-d1userstore: through the seam — saveUserPref (D1 row upsert, or
// the sim-key blob when simulating; boolean success preserved).
export async function setUserLang(env: Env, chatId, lang) {
  const clean = lang === "en" ? "en" : "fa";
  try {
    const prefs = await getUserPrefs(env);
    const cur = prefs[String(chatId)] || {};
    return await saveUserPref(env, chatId, { teams: cur.teams || [], tz: cur.tz || null, lang: clean });
  } catch (e) {
    console.error("setUserLang failed: " + e.message);
    return false;
  }
}
// v13.72-deadweight: BOT_STRINGS slimmed to the only keys ever read
// (botStr(lang, "lang_set") / botStr(lang, "start_welcome") — bot.ts).
// The ~100 v12.x keys (help_body, teams_*, follow_*, tz_*) were orphaned
// when the composers began hardcoding their own bilingual strings; they
// had zero readers. Kept: the two the welcome path reads.
// v13.90-tzonboard: these four strings carried SINGLE-escaped \! and \. —
// in a JS string literal that produces no backslash at all, so the
// post-language-tap welcome failed Telegram's MarkdownV2 parse with 400
// ("'.' is reserved") and NEVER DELIVERED (verified live against the bot
// API). Double-escaped like every other literal in the bot now.
// v13.102-referral: the welcome ALSO urges the new member to recommend the
// bot AND the website (football.sportsignal.ir) to their football-loving
// friends — the user's ask. MarkdownV2-safe: every '.', '-' and '!' escaped
// (the join flow's history of parse-400s); the URLs stay bare-text links
// (Telegram auto-links them after the parser strips the escapes — the same
// discipline as the v13.22-promo footer riding every notification). No
// entity markup in the copy, so there is nothing to balance either.
var BOT_STRINGS = {
  "fa_start_welcome": "\u2705 *\u0628\u0647 SportSignal \u062E\u0648\u0634 \u0622\u0645\u062F\u06CC\u062F*\\!\n\u0627\u0639\u0644\u0627\u0645 \u0645\u0633\u0627\u0628\u0642\u0627\u062A \u0645\u0647\u0645 \u0631\u0627 \u0627\u0632 \u062F\u0633\u062A \u0646\u062F\u0647\u06CC\u062F\\.\n\n\uD83D\uDC65 \u0627\u06AF\u0631 \u062F\u0648\u0633\u062A\u0627\u0646\u06CC \u062F\u0627\u0631\u06CC\u062F \u06A9\u0647 \u0639\u0627\u0634\u0642 \u0641\u0648\u062A\u0628\u0627\u0644 \u0647\u0633\u062A\u0646\u062F\u060C \u0627\u06CC\u0646 \u0631\u0628\u0627\u062A \u0648 \u0633\u0627\u06CC\u062A \u0645\u0627 \u0631\u0627 \u0628\u0647 \u0622\u0646\u200C\u0647\u0627 \u067E\u06CC\u0634\u0646\u0647\u0627\u062F \u06A9\u0646\u06CC\u062F:\n\uD83E\uDD16 https://t\\.me/SportSignalAlertsBot\n\uD83C\uDF10 football\\.sportsignal\\.ir",
  "en_start_welcome": "*Welcome to SportSignal*\\!\nNever miss the big matches\\.\n\n\uD83D\uDC65 If you have football\\-loving friends, recommend this bot and our website to them:\n\uD83E\uDD16 https://t\\.me/SportSignalAlertsBot\n\uD83C\uDF10 football\\.sportsignal\\.ir",
  "fa_lang_set": "\u2705 \u0632\u0628\u0627\u0646 \u0631\u0628\u0627\u062A \u0641\u0627\u0631\u0633\u06CC \u0634\u062F\\.",
  "en_lang_set": "Bot language set to English\\.",
};
export function botStr(lang, key) {
  const k = (lang === "en" ? "en_" : "fa_") + key;
  return BOT_STRINGS[k] != null ? BOT_STRINGS[k] : BOT_STRINGS["fa_" + key] || "";
}
export function userFollowsMatch(prefs, chatId, match) {
  const p = prefs[String(chatId)];
  const nh = normAlias(match.homeTeam.name);
  const na = normAlias(match.awayTeam.name);
  let home = false, away = false;
  if (p && Array.isArray(p.teams) && p.teams.length) {
    home = p.teams.some((t) => normalizeTeamName(t) === nh);
    away = p.teams.some((t) => normalizeTeamName(t) === na);
  } else {
    masterTeamList();
    home = masterMemo.normSet.has(nh);
    away = masterMemo.normSet.has(na);
  }
  return home && away ? "both" : home || away ? "one" : null;
}
// v13.96-nightdigest: the SIDE-aware variant — the night digest needs to
// know WHICH side a chat follows (its verdict sentence reads
// "آرسنال در مقابل لیل برنده شد" from the followed team's perspective; with
// only "one" a Lille-home fixture would read from the wrong side). Same
// resolution order as userFollowsMatch (explicit teams → master fallback).
export function userFollowsSides(prefs, chatId, match) {
  const p = prefs[String(chatId)];
  const nh = normAlias(match.homeTeam.name);
  const na = normAlias(match.awayTeam.name);
  if (p && Array.isArray(p.teams) && p.teams.length) {
    return {
      home: p.teams.some((t) => normalizeTeamName(t) === nh),
      away: p.teams.some((t) => normalizeTeamName(t) === na)
    };
  }
  masterTeamList();
  return { home: masterMemo.normSet.has(nh), away: masterMemo.normSet.has(na) };
}
export function isBigMatch(match, prefs, chatId) {
  return userFollowsMatch(prefs, chatId, match) === "both";
}
export const masterMemo = { sig: null, list: null, normSet: null };
export function masterTeamList() {
  if (masterMemo.sig !== CONFIG.BIG_TEAMS_BY_LEAGUE) {
    const seen = new Set();
    const out = [];
    for (const list of Object.values(CONFIG.BIG_TEAMS_BY_LEAGUE) as any) {
      for (const t of list) {
        if (!seen.has(t)) {
          seen.add(t);
          out.push(t);
        }
      }
    }
    masterMemo.sig = CONFIG.BIG_TEAMS_BY_LEAGUE;
    masterMemo.list = out;
    masterMemo.normSet = new Set(out.map(normalizeTeamName));
  }
  return masterMemo.list;
}
export function isMasterBigMatch(match) {
  masterTeamList();
  const nset = masterMemo.normSet;
  return nset.has(normAlias(match.homeTeam.name)) && nset.has(normAlias(match.awayTeam.name));
}
var TZ_ALIASES = {
  tehran: "Asia/Tehran",
  london: "Europe/London",
  paris: "Europe/Paris",
  berlin: "Europe/Berlin",
  madrid: "Europe/Madrid",
  rome: "Europe/Rome",
  amsterdam: "Europe/Amsterdam",
  istanbul: "Europe/Istanbul",
  moscow: "Europe/Moscow",
  dubai: "Asia/Dubai",
  doha: "Asia/Qatar",
  "new-york": "America/New_York",
  toronto: "America/Toronto",
  "los-angeles": "America/Los_Angeles",
  sydney: "Australia/Sydney",
  melbourne: "Australia/Melbourne",
  brisbane: "Australia/Brisbane",
  adelaide: "Australia/Adelaide",
  canberra: "Australia/Canberra",
  canbera: "Australia/Canberra",
  // user's typo — accept both
  perth: "Australia/Perth",
  bangkok: "Asia/Bangkok",
  "kuala-lumpur": "Asia/Kuala_Lumpur",
  singapore: "Asia/Singapore",
  "hong-kong": "Asia/Hong_Kong",
  tokyo: "Asia/Tokyo",
  // v13.90-tzonboard: the region-picker city slugs (every city button's
  // callback_data resolves through this table) + the popular text-input
  // candidates. All hyphenated — the tz: callback regex is [a-z0-9-]+.
  vienna: "Europe/Vienna",
  athens: "Europe/Athens",
  zurich: "Europe/Zurich",
  stockholm: "Europe/Stockholm",
  oslo: "Europe/Oslo",
  copenhagen: "Europe/Copenhagen",
  dublin: "Europe/Dublin",
  lisbon: "Europe/Lisbon",
  warsaw: "Europe/Warsaw",
  prague: "Europe/Prague",
  budapest: "Europe/Budapest",
  helsinki: "Europe/Helsinki",
  riyadh: "Asia/Riyadh",
  kuwait: "Asia/Kuwait",
  manama: "Asia/Bahrain",
  muscat: "Asia/Muscat",
  seoul: "Asia/Seoul",
  shanghai: "Asia/Shanghai",
  jakarta: "Asia/Jakarta",
  chicago: "America/Chicago",
  denver: "America/Denver",
  houston: "America/Chicago",
  vancouver: "America/Vancouver",
  "mexico-city": "America/Mexico_City",
  "sao-paulo": "America/Sao_Paulo",
  "buenos-aires": "America/Argentina/Buenos_Aires",
  lima: "America/Lima",
  bogota: "America/Bogota",
  santiago: "America/Santiago",
  caracas: "America/Caracas",
  auckland: "Pacific/Auckland",
  wellington: "Pacific/Wellington"
};
export function resolveTimeZone(input) {
  const raw = String(input || "").trim().toLowerCase().replace(/\s+/g, "-");
  const candidate = TZ_ALIASES[raw] || raw.replace(/(^|[\/_])[a-z]/g, (m) => m.toUpperCase());
  // v13.116-tzproof \u2014 THE DEAD-BUTTON FIX. The old validator was a
  // fields-less DateTimeFormat constructor \u2014 exactly the class some
  // Cloudflare edge colos get wrong (the 2026-10-17 morning: the owner's
  // tap on the Iran button did NOTHING \u2014 no save, no confirm view, the
  // D1 row never moved \u2014 because this threw/failed on a broken colo and
  // the handler re-rendered the same status). Validation now runs through
  // the offset probe (shortOffset \u2014 verified correct even on the broken
  // colos) with a date-bearing constructor as the fallback.
  if (tzOffsetMinutes(candidate) != null) return candidate;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: candidate, year: "numeric" });
    return candidate;
  } catch (e) {
    return null;
  }
}
export function getUserTz(prefs, chatId, env) {
  const p = prefs[String(chatId)];
  return p && typeof p.tz === "string" && p.tz ? p.tz : env.TEHRAN_TZ;
}
export function groupChatsByTz(chatIds, prefs, env) {
  // v12.x-bilingual-bot: each group now carries a `lang` field ("fa" or
  // "en") so the cron composers render the message in the user's lang.
  // Chats are grouped by `${tz}|${lang}` so a tz with mixed langs splits
  // into one group per lang (rendered once per lang, sent per group).
  const map = new Map();
  for (const c of chatIds) {
    const tz = getUserTz(prefs, c, env);
    const lang = (prefs[String(c)] && prefs[String(c)].lang) === "en" ? "en" : "fa";
    const key = tz + "|" + lang;
    if (!map.has(key)) map.set(key, { tz, lang, chats: [] });
    map.get(key).chats.push(c);
  }
  return [...map.values()];
}
export async function checkUserCap(env: Env, count) {
  try {
    for (const lv of [15, 20, 25]) {
      if (count < lv) continue;
      const key = "cap_warn_" + lv;
      const last = parseInt(await env.STATE.get(key).catch(() => null)) || 0;
      if (Date.now() - last < 7 * 864e5) continue;
      await env.STATE.put(key, String(Date.now())).catch(() => {
      });
      const adminChat = parseInt(env.CHAT_ID);
      if (!isNaN(adminChat)) {
        await sendTelegram(env, "\u26A0\uFE0F *\u0647\u0634\u062F\u0627\u0631 \u0638\u0631\u0641\u06CC\u062A:* " + toFaDigits(String(count)) + " \u06A9\u0627\u0631\u0628\u0631 \u062B\u0628\u062A\u200C\u0646\u0627\u0645 \u06A9\u0631\u062F\u0647\u200C\u0627\u0646\u062F. \u062D\u062F \u0639\u0645\u0644\u06CC \u0631\u0627\u06CC\u06AF\u0627\u0646 \u0637\u0628\u0642\u0647 \u0639\u0628\u0648\u0631\u06CC ~\u06F2\u06F0-\u06F2\u06F5 \u06A9\u0627\u0631\u0628\u0631 \u0627\u0633\u062A \u2014 \u0628\u0627\u0644\u0627\u062A\u0631 \u0627\u0632 \u0622\u0646 \u0627\u0639\u0644\u0627\u0646\u200C\u0647\u0627 \u0645\u0645\u06A9\u0646 \u0627\u0633\u062A \u062D\u0630\u0641 \u0634\u0648\u0646\u062F. \u067E\u0644\u0627\u0646 \u067E\u0631\u062F\u0627\u062E\u062A\u06CC Workers \u0631\u0627 \u062F\u0631 \u0646\u0638\u0631 \u0628\u06AF\u06CC\u0631\u06CC\u062F.", adminChat);
      }
    }
  } catch (e) {
    console.error("Cap check failed: " + e.message);
  }
}
