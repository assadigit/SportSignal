// SportSignal — chat registry & user preferences: registered chats,
// bot member profiles, per-user prefs (teams / timezone / language), the
// followable master team list, tz resolution and per-tz grouping.


import { CONFIG } from "./config";
import type { Env } from "./types";
import { toFaDigits } from "./utils";
import { normalizeTeamName } from "./teams.js";
import { sendTelegram } from "./telegram";
import { normAlias } from "./matches";

export async function getRegisteredChats(env: Env) {
  try {
    const chats = await env.STATE.get(CONFIG.KV_USERS_KEY);
    if (chats) {
      const parsed = JSON.parse(chats);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (error) {
    console.error("Invalid users KV data:", error.message);
  }
  const fallback = parseInt(env.CHAT_ID);
  return isNaN(fallback) ? [] : [fallback];
}
export async function getBotMembers(env: Env) {
  const chats = await getRegisteredChats(env);
  const profiles = await env.STATE.get(CONFIG.KV_USER_PROFILES, "json").catch(() => null) || {};
  const members = chats.map((id) => {
    const p = profiles[String(id)] || {};
    return { id, username: p.username || null, first_name: p.first_name || null, title: p.title || null, joined: p.joined || null };
  });
  let backfilled = 0;
  const missing = members.filter((m) => !m.username && !m.first_name && !m.title);
  for (const m of missing) {
    if (backfilled >= 40) break;
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
    await env.STATE.put(CONFIG.KV_USER_PROFILES, JSON.stringify(profiles)).catch(() => {
    });
  }
  members.sort((a, b) => String(a.id).localeCompare(String(b.id)));
  return { count: members.length, backfilled, members };
}
export async function getUserPrefs(env: Env) {
  try {
    // v13.5-sim-scope: request-scoped override (set only by /api/simulate's
    // cloned env) — the shared CONFIG is never mutated at runtime.
    return await env.STATE.get(env.SIM_PREFS_KEY || CONFIG.KV_USER_PREFS, "json") || {};
  } catch (e) {
    return {};
  }
}
// v12.x-bilingual-bot: get the user's language preference. Defaults to
// "fa" (Persian) since the existing user base is Persian. Reads from KV
// user_prefs[chatId].lang.
export async function getUserLang(env: Env, chatId) {
  try {
    const prefs = await env.STATE.get(env.SIM_PREFS_KEY || CONFIG.KV_USER_PREFS, "json");
    const p = prefs && prefs[String(chatId)];
    if (p && (p.lang === "fa" || p.lang === "en")) return p.lang;
  } catch (e) {
  }
  return "fa";
}
// v12.x-bilingual-bot: set the user's language preference. Writes to KV
// user_prefs[chatId].lang. Preserves the existing teams + tz fields.
export async function setUserLang(env: Env, chatId, lang) {
  const clean = lang === "en" ? "en" : "fa";
  try {
    const prefs = await getUserPrefs(env);
    const key = String(chatId);
    const cur = prefs[key] || {};
    prefs[key] = { teams: cur.teams || [], tz: cur.tz || null, lang: clean };
    await env.STATE.put(env.SIM_PREFS_KEY || CONFIG.KV_USER_PREFS, JSON.stringify(prefs));
    return true;
  } catch (e) {
    console.error("setUserLang failed: " + e.message);
    return false;
  }
}
var BOT_STRINGS = {
  "fa_start_welcome": "\u2705 \u0628\u0647 SportSignal \u062E\u0648\u0634 \u0622\u0645\u062F\u06CC\u062D\!\n\u0627\u0639\u0644\u0627\u0646 \u0645\u0633\u0627\u0628\u0642\u0627\u062A \u0645\u0647\u0645 \u0631\u0627 \u0627\u0632 \u062F\u0633\u062A \u0646\u062F\u0647\u06CC\u062F\.",
  "en_start_welcome": "Welcome to SportSignal\!\nNever miss the big matches\.",
  "fa_start_pick_lang": "\u26BD \u0628\u0647 SportSignal \u062E\u0648\u0634 \u0622\u0645\u062F\u06CC\u062D\n\u0628\u0631\u0627\u06CC \u0627\u0646\u062A\u062E\u0627\u0628 \u0632\u0628\u0627\u0646\u060C /lang \u0631\u0627 \u0628\u0641\u0631\u0633\u062A\u06CC\u062F\.",
  "en_start_pick_lang": "Welcome to SportSignal\nSend /lang to choose your language\.",
  "fa_lang_prompt": "\u0632\u0628\u0627\u0646 \u0631\u0628\u0627\u062A \u0631\u0627 \u0627\u0646\u062A\u062E\u0627\u0628 \u06A9\u0646\u06CC\u062F:",
  "en_lang_prompt": "Choose your language:",
  "fa_lang_set": "\u2705 \u0632\u0628\u0627\u0646 \u0631\u0628\u0627\u062A \u0641\u0627\u0631\u0633\u06CC \u0634\u062F\.",
  "en_lang_set": "Bot language set to English\.",
  "fa_help_body": "/start \u2014 \u0639\u0636\u0648\u06CC\u062A\n/teams \u2014 \u0644\u06CC\u0633\u062A \u062A\u06CC\u0645\u200C\u0647\u0627\n/follow 1,3,7 \u2014 \u0627\u0646\u062A\u062E\u0627\u0628 \u062A\u06CC\u0645\n/follow all \u2014 \u0647\u0645\u0647 \u062A\u06CC\u0645\u200C\u0647\u0627\n/next \u2014 \u0628\u0627\u0632\u06CC\u200C\u0647\u0627\u06CC \u067E\u06CC\u0634\u200C\u0631\u0648\n/tables \u2014 \u062C\u062F\u0648\u0644\u200C\u0647\u0627\n/timezone london \u2014 \u062A\u0646\u0638\u06CC\u0645 \u0632\u0645\u0627\u0646\n/lang \u2014 \u062A\u063A\u06CC\u06CC\u0631 \u0632\u0628\u0627\u0646\n/stop \u2014 \u0627\u0646\u0635\u0631\u0627\u0641",
  "en_help_body": "/start \u2014 Join\n/teams \u2014 List teams\n/follow 1,3,7 \u2014 Pick teams\n/follow all \u2014 All teams\n/next \u2014 Upcoming matches\n/tables \u2014 League tables\n/timezone london \u2014 Set timezone\n/lang \u2014 Change language\n/stop \u2014 Unsubscribe",
  "fa_stop": "\u274C \u0627\u0632 \u062F\u0631\u06CC\u0627\u0641\u062A \u067E\u06CC\u0627\u0645 \u062E\u0627\u0631\u062C \u0634\u062F\u06CC\u062F\.",
  "en_stop": "You have been unsubscribed\. Use /start to return\.",
  "fa_teams_header": "\u062A\u06CC\u0645\u200C\u0647\u0627\u06CC \u0642\u0627\u0628\u0644 \u062F\u0646\u0628\u0627\u0644\u200C\u06A9\u0631\u062F\u0646:",
  "en_teams_header": "Teams you can follow:",
  "fa_teams_follow_all": "\u0647\u0645\u0647 \u062A\u06CC\u0645\u200C\u0647\u0627 \u062F\u0646\u0628\u0627\u0644 \u0645\u06CC\u200C\u0634\u0648\u0646\u062F\.",
  "en_teams_follow_all": "Following all teams.",
  "fa_teams_n_selected": "\u062A\u0639\u062F\u0627\u062F \u062A\u06CC\u0645 \u0627\u0646\u062A\u062E\u0627\u0628\u06CC: ",
  "en_teams_n_selected": "Selected teams: ",
  "fa_teams_footer": "\u0627\u0646\u062A\u062E\u0627\u0628: /follow 1,3,7\n\u0647\u0645\u0647: /follow all",
  "en_teams_footer": "Pick: /follow 1,3,7\nAll: /follow all",
  "fa_follow_all_set": "\u2705 \u0647\u0645\u0647 \u062A\u06CC\u0645\u200C\u0647\u0627 \u062F\u0646\u0628\u0627\u0644 \u0645\u06CC\u200C\u0634\u0648\u0646\u062F\.",
  "en_follow_all_set": "Following all teams.",
  "fa_follow_invalid": "\u26A0\uFE0F \u0634\u0645\u0627\u0631\u0647 \u0646\u0627\u0645\u0639\u062A\u0628\u0631 \u0627\u0633\u062A\.",
  "en_follow_invalid": "Invalid number. Use /teams to see the list.",
  "fa_follow_set_header": "\u2705 \u062A\u06CC\u0645\u200C\u0647\u0627\u06CC \u0627\u0646\u062A\u062E\u0627\u0628\u06CC \u0634\u0645\u0627:",
  "en_follow_set_header": "Your selected teams:",
  "fa_follow_set_footer": "\u0628\u0631\u0627\u06CC \u062A\u063A\u06CC\u06CC\u0631\u060C /follow all \u06CC\u0627 \u0634\u0645\u0627\u0631\u0647\u200C\u0647\u0627\u06CC \u062C\u062F\u06CC\u062F \u0631\u0627 \u0628\u0641\u0631\u0633\u062A\u06CC\u062F\.",
  "en_follow_set_footer": "To change: /follow all or new numbers.",
  "fa_next_header": "\u0628\u0627\u0632\u06CC\u200C\u0647\u0627\u06CC \u067E\u06CC\u0634\u200C\u0631\u0648:",
  "en_next_header": "Upcoming matches:",
  "fa_next_empty": "\u062F\u0631 \u062D\u0627\u0644 \u062D\u0627\u0636\u0631 \u0628\u0627\u0632\u06CC \u067E\u06CC\u0634\u200C\u0631\u0648\u06CC \u0628\u0631\u0627\u06CC \u062A\u06CC\u0645\u200C\u0647\u0627\u06CC \u062F\u0646\u0628\u0627\u0644\u200C\u0634\u062F\u0647 \u0634\u0645\u0627 \u0648\u062C\u0648\u062F \u0646\u062F\u0627\u0631\u062F\.",
  "en_next_empty": "No upcoming matches for your followed teams right now.",
  "fa_tables_unavailable": "\u26A0\uFE0F \u062C\u062F\u0648\u0644\u200C\u0647\u0627 \u0641\u0639\u0644\u0627\u064B \u062F\u0631 \u062F\u0633\u062A\u0631\u0633 \u0646\u06CC\u0633\u062A\.",
  "en_tables_unavailable": "Tables are not available right now\. Please try again in a few minutes\.",
  "fa_tz_current": "\u23F0 \u0645\u0646\u0637\u0642\u0647 \u0632\u0645\u0627\u0646\u06CC \u0634\u0645\u0627: ",
  "en_tz_current": "Your timezone: ",
  "fa_tz_change_hint": "\n\u0628\u0631\u0627\u06CC \u062A\u063A\u06CC\u06CC\u0631: /timezone london",
  "en_tz_change_hint": "\nChange: /timezone london",
  "fa_tz_reset": "\u2705 \u0645\u0646\u0637\u0642\u0647 \u0632\u0645\u0627\u0646\u06CC \u0634\u0645\u0627 \u0628\u0647 \u067E\u06CC\u0634\u200C\u0641\u0631\u0636 \u0628\u0627\u0632\u06AF\u0634\u062A: ",
  "en_tz_reset": "Timezone reset to default: ",
  "fa_tz_invalid": "\u26A0\uFE0F \u0645\u0646\u0637\u0642\u0647 \u0632\u0645\u0627\u0646\u06CC \u0646\u0627\u0645\u0639\u062A\u0628\u0631 \u0627\u0633\u062A\.",
  "en_tz_invalid": "Invalid timezone.",
  "fa_tz_invalid_hint": "\n\u0645\u062B\u0627\u0644: /timezone london \u06CC\u0627 /timezone Europe/London",
  "en_tz_invalid_hint": "\nExample: /timezone london or /timezone Europe/London",
  "fa_tz_set": "\u2705 \u0645\u0646\u0637\u0642\u0647 \u0632\u0645\u0627\u0646\u06CC \u0634\u0645\u0627 \u062A\u063A\u06CC\u06CC\u0631 \u06A9\u0631\u062F: ",
  "en_tz_set": "Timezone set: ",
  "fa_tz_set_note": "\n\u067E\u06CC\u0627\u0645\u200C\u0647\u0627 \u0627\u0632 \u0627\u06CC\u0646 \u067E\u0633 \u0628\u0631 \u0627\u0633\u0627\u0633 \u0633\u0627\u0639\u062A \u0645\u062D\u0644\u06CC \u0627\u0631\u0633\u0627\u0644 \u0645\u06CC\u200C\u0634\u0648\u0646\u062F\.",
  "en_tz_set_note": "\nMessages will be sent in your local time.",
  "fa_unknown": "\u{1F4DD} \u062F\u0633\u062A\u0648\u0631 \u0646\u0627\u0634\u0646\u0627\u062E\u062A\u0647 \u0627\u0633\u062A\u060C \u0627\u0632 /help \u0627\u0633\u062A\u0641\u0627\u062F\u0647 \u06A9\u0646\u06CC\u062F\.",
  "en_unknown": "Unknown command\. Use /help\.",
  "fa_late": "\u0627\u06CC\u0646 \u06CC\u0627\u062F\u0622\u0648\u0631\u06CC \u0628\u0627 \u062A\u0623\u062E\u06CC\u0631 \u0627\u0631\u0633\u0627\u0644 \u0634\u062F",
  "en_late": "This reminder was sent late",
  "fa_3h_reminder": "\u06CC\u0627\u062F\u0622\u0648\u0631\u06CC \u06F3 \u0633\u0627\u0639\u062A\u0647",
  "fa_1h_reminder": "\u06CC\u0627\u062F\u0622\u0648\u0631\u06CC \u06F1 \u0633\u0627\u0639\u062A\u0647",
  "fa_match_start": "\u0628\u0627\u0632\u06CC \u0634\u0631\u0648\u0639 \u0634\u062F\!",
  "fa_match_final": "\u0646\u062A\u06CC\u062C\u0647 \u0646\u0647\u0627\u06CC\u06CC",
  "fa_match_winner": " \u0628\u0631\u0646\u062F\u0647 \u0634\u062F",
  "fa_match_draw": "\u0645\u0633\u0627\u0648\u06CC",
  "fa_no_score": "\u0646\u062A\u06CC\u062C\u0647 \u062F\u0631 \u062F\u0633\u062A\u0631\u0633 \u0646\u06CC\u0633\u062A",
  "fa_home_label": "\u0645\u06CC\u0632\u0628\u0627\u0646",
  "fa_full_table": "\n\n\u{1F4CA} \u062C\u062F\u0648\u0644 \u06A9\u0627\u0645\u0644: football\.sportsignal\.ir",
  "fa_table_matchday": " \u2014 \u0647\u0641\u062A\u0647 ",
  "fa_table_pts": " \u0627\u0645\u062A\u06CC\u0627\u0632",
  "fa_table_more": "\n\u2026 ",
  "fa_table_after": " \u062A\u06CC\u0645 \u0628\u0639\u062F\u06CC",
  "fa_week_ahead_more": "\n\u2026 ",
  "fa_week_ahead_other": " \u0628\u0627\u0632\u06CC \u062F\u06CC\u06AF\u0631",
  "fa_week_ahead_header": "\u{1F4C5} *\u0628\u0627\u0632\u06CC\u200C\u0647\u0627\u06CC \u0647\u0641\u062A\u0647 \u0622\u06CC\u0646\u062F\u0647*",
  "fa_coronation_header": "\u{1F451} *\u0635\u062F\u0631 \u062C\u062F\u0648\u0644 ",
  "fa_coronation_changed": " \u062A\u063A\u06CC\u06CC\u0631 \u06A9\u0631\u062F*\n\n",
  "fa_coronation_reached": " \u0628\u0627 ",
  "fa_coronation_points": " \u0627\u0645\u062A\u06CC\u0627\u0632 \u0628\u0647 \u0635\u062F\u0631 \u062C\u062F\u0648\u0644 ",
  "fa_coronation_prev": " \u0631\u0633\u06CC\u062F \u2014 \u0631\u062A\u0628\u0647 \u0642\u0628\u0644\u06CC: ",
  "fa_big_match_header": "\u26A1 *\u0628\u0627\u0632\u06CC \u0628\u0632\u0631\u06AF:* ",
  "fa_phase_playoff": "\n\n\u2694\uFE0F \u0627\u06CC\u0646 \u0645\u0633\u0627\u0628\u0642\u0647 \u062F\u0631 \u0645\u0631\u062D\u0644\u0647 \u062D\u0630\u0641\u06CC \u0628\u0648\u062F",
  "fa_default_stage": "\u0645\u0631\u062D\u0644\u0647 \u06AF\u0631\u0648\u0647\u06CC",
  "fa_comp_dash": " \\\\- ",
  "en_3h_reminder": "3 hours to kickoff",
  "en_1h_reminder": "1 hour to kickoff",
  "en_match_start": "Kickoff",
  "en_match_final": "Full time",
  "en_match_winner": " won",
  "en_match_draw": "Draw",
  "en_no_score": "Score not available",
  "en_home_label": "Host",
  "en_full_table": "\n\nFull table: football\.sportsignal\.ir",
  "en_table_matchday": " \u2014 Matchday ",
  "en_table_pts": " pts",
  "en_table_more": "\n+ ",
  "en_table_after": " more teams",
  "en_week_ahead_more": "\n+ ",
  "en_week_ahead_other": " more matches",
  "en_week_ahead_header": "Matches this week",
  "en_coronation_header": "New leader: ",
  "en_coronation_reached": " reached the top of ",
  "en_coronation_points": " with ",
  "en_coronation_pts_suffix": " pts",
  "en_coronation_prev": " \u2014 previous position: ",
  "en_big_match_header": "Big match: ",
  "en_phase_playoff": "\n\nThis was a knockout match",
  "en_default_stage": "Group stage",
  "en_comp_dash": " \\- ",
  "fa_tables_label": "\u062C\u062F\u0648\u0644 \u0641\u0639\u0644\u06CC",
  "en_tables_label": "Current table",
  "fa_weekly_label": "\u067E\u0627\u06CC\u0627\u0646 \u0647\u0641\u062A\u0647",
  "en_weekly_label": "End of week"
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
  tokyo: "Asia/Tokyo"
};
export function resolveTimeZone(input) {
  const raw = String(input || "").trim().toLowerCase().replace(/\s+/g, "-");
  const candidate = TZ_ALIASES[raw] || raw.replace(/(^|[\/_])[a-z]/g, (m) => m.toUpperCase());
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: candidate });
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
