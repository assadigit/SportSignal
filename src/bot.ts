// SportSignal — Telegram webhook handler: /start /lang /stop /help /teams
// /follow /next /tables /timezone + callback_query language picker.


import { CONFIG } from "./config";
import type { Env } from "./types";
import { toFaDigits, escapeMarkdownCharacters, getJalaliTime, getJalaliDate, getEnglishTime, getEnglishDate } from "./utils";
import { normalizeTeamName } from "./teams";
import { translateTeam, translateCompetition, translateVenue } from "./translate";
import { shouldNotify } from "./matches";
import { matchKey } from "./dedupe";
import { sendTelegram, answerCallbackQuery, sendPhotoBinary } from "./telegram";
import { renderCardPngCached } from "./card";
import { formatBigMatchMessage, specialBanner } from "./composers";
import { getRegisteredChats, getUserPrefs, setUserLang, getUserTz, masterTeamList, userFollowsMatch, botStr, resolveTimeZone } from "./users";
import { sendLeagueTables, sendWeekAhead } from "./digest";
import { applySettings } from "./admin";

// v13.23-buttons: persistent reply keyboard (buttons at the bottom of the
// chat). Users tap buttons instead of typing slash commands. The button
// labels are Persian (fa) or English (en). When tapped, Telegram sends the
// label as a message — handled as a command alias below.
// v13.24-featured: added a "⭐ Featured match" button (first row, full width).
function replyKeyboard(lang) {
  if (lang === "en") {
    return { keyboard: [
      [{ text: "\u2B50 Featured match" }],
      [{ text: "Upcoming" }, { text: "Tables" }],
      [{ text: "Teams" }, { text: "Language" }],
      [{ text: "Help" }, { text: "Stop" }]
    ], resize_keyboard: true };
  }
  return { keyboard: [
    [{ text: "\u2B50 \u0628\u0627\u0632\u06CC \u0628\u0631\u062A\u0631" }],
    [{ text: "\u0628\u0627\u0632\u06CC\u200C\u0647\u0627\u06CC \u067E\u06CC\u0634\u200C\u0631\u0648" }, { text: "\u062C\u062F\u0648\u0644\u200C\u0647\u0627" }],
    [{ text: "\u062A\u06CC\u0645\u200C\u0647\u0627" }, { text: "\u0632\u0628\u0627\u0646" }],
    [{ text: "\u0631\u0627\u0647\u0646\u0645\u0627" }, { text: "\u0627\u0646\u0635\u0631\u0627\u0641" }]
  ], resize_keyboard: true };
}

// Normalize button labels to slash commands (so the existing if-chain
// handles them without duplication).
function normalizeCommand(text) {
  if (!text) return text;
  const t = text.trim();
  // Persian button labels → slash commands
  const faMap = {
    "\u2B50 \u0628\u0627\u0632\u06CC \u0628\u0631\u062A\u0631": "/featured",
    "\u0628\u0627\u0632\u06CC\u200C\u0647\u0627\u06CC \u067E\u06CC\u0634\u200C\u0631\u0648": "/next",
    "\u062C\u062F\u0648\u0644\u200C\u0647\u0627": "/tables",
    "\u062A\u06CC\u0645\u200C\u0647\u0627": "/teams",
    "\u0632\u0628\u0627\u0646": "/lang",
    "\u0631\u0627\u0647\u0646\u0645\u0627": "/help",
    "\u0627\u0646\u0635\u0631\u0627\u0641": "/stop"
  };
  if (faMap[t]) return faMap[t];
  // English button labels → slash commands
  const enMap = { "\u2B50 Featured match": "/featured", "Upcoming": "/next", "Tables": "/tables", "Teams": "/teams", "Language": "/lang", "Help": "/help", "Stop": "/stop" };
  if (enMap[t]) return enMap[t];
  return text;
}

export async function handleTelegramUpdate(env: Env, update) {
  try {
    const updId = update && update.update_id;
    if (updId != null) {
      const seen = await env.STATE.get("upd_" + updId).catch(() => null);
      if (seen) return;
      await env.STATE.put("upd_" + updId, "1", { expirationTtl: 600 }).catch(() => {
      });
    }
    // v12.x-bilingual-bot: callback_query handler (language picker). Runs
    // BEFORE the message handlers. The callback_data is "lang:fa" or
    // "lang:en". On tap: register the chat if needed, persist the lang,
    // answer the callback (dismisses the loading spinner on the button),
    // then send the welcome + help in the chosen lang. The picker itself
    // is sent via the /lang command (and /start for new users) using the
    // sendTelegramWithKeyboard helper.
    const cbq = update && update.callback_query;
    if (cbq && cbq.id) {
      try {
        const cbChatId = cbq.message && cbq.message.chat && cbq.message.chat.id;
        const cbUserId = cbq.from && cbq.from.id;
        const cbChatId2 = cbChatId || cbUserId;
        if (cbChatId2) {
          const data = String(cbq.data || "");
          const m = data.match(/^lang:(fa|en)$/);
          if (m) {
            const lang = m[1];
            const chats = await getRegisteredChats(env);
            if (!chats.includes(cbChatId2)) {
              chats.push(cbChatId2);
              await env.STATE.put(CONFIG.KV_USERS_KEY, JSON.stringify(chats));
            }
            await setUserLang(env, cbChatId2, lang);
            await answerCallbackQuery(env, cbq.id, lang === "en" ? "English" : "\u0641\u0627\u0631\u0633\u06CC");
            const welcomeText = botStr(lang, "lang_set") + "\n\n" + botStr(lang, "start_welcome") + "\n\n" + (lang === "en" ? "Use the buttons below to navigate\\." : "\u0627\u0632 \u062F\u06A9\u0645\u0647\u200C\u0647\u0627\u06CC \u067E\u0627\u06CC\u06CC\u0646 \u0628\u0631\u0627\u06CC \u0646\u0627\u0648\u0628\u0631\u06CC \u0627\u0633\u062A\u0641\u0627\u062F\u0647 \u06A9\u0646\u06CC\u062F\\.");
            await sendTelegram(env, welcomeText, cbChatId2, replyKeyboard(lang));
          }
        }
      } catch (e) {
        console.error("callback_query handler failed: " + e.message);
      }
      return;
    }
    const message = update && update.message;
    if (!message || !message.chat || !message.chat.id) return;
    const chatId = message.chat.id;
    // v13.23-buttons: normalize button labels (Persian/English) to slash commands.
    const text = normalizeCommand(message.text);
    try {
      const from = message.from || {};
      const chat = message.chat || {};
      if (from.id || chat.title) {
        const profiles = await env.STATE.get(CONFIG.KV_USER_PROFILES, "json").catch(() => null) || {};
        const key = String(chatId);
        const cur = profiles[key] || {};
        const next = {
          username: from.username || cur.username || null,
          first_name: from.first_name || cur.first_name || (chat.title ? null : cur.first_name) || null,
          title: chat.title || cur.title || null,
          joined: cur.joined || (new Date()).toISOString()
        };
        if (JSON.stringify(next) !== JSON.stringify(cur)) {
          profiles[key] = next;
          await env.STATE.put(CONFIG.KV_USER_PROFILES, JSON.stringify(profiles)).catch(() => {
          });
        }
      }
    } catch (e) {
    }
    if (text === "/start") {
      const chats = await getRegisteredChats(env);
      if (!chats.includes(chatId)) {
        chats.push(chatId);
        await env.STATE.put(CONFIG.KV_USERS_KEY, JSON.stringify(chats));
      }
      const prefs = await getUserPrefs(env);
      const up = prefs[String(chatId)] || {};
      const langSet = up.lang === "en" || up.lang === "fa";
      if (langSet && up.lang === "en") {
        await sendTelegram(env, "Welcome to SportSignal\\!\nNever miss the big matches\\.\n\nUse the buttons below to navigate\\.", chatId, replyKeyboard("en"));
      } else if (langSet && up.lang === "fa") {
        await sendTelegram(env, "\u2705 \u0628\u0647 SportSignal \u062E\u0648\u0634 \u0622\u0645\u062F\u06CC\u062F\\!\n\u0627\u0632 \u062F\u06A9\u0645\u0647\u200C\u0647\u0627\u06CC \u067E\u0627\u06CC\u06CC\u0646 \u0628\u0631\u0627\u06CC \u0646\u0627\u0648\u0628\u0631\u06CC \u0627\u0633\u062A\u0641\u0627\u062F\u0647 \u06A9\u0646\u06CC\u062F\\.", chatId, replyKeyboard("fa"));
      } else {
        const promptText = "\u{1F310} \u0632\u0628\u0627\u0646 / Language";
        const keyboard = { inline_keyboard: [[
          { text: "\u{1F1EE}\u{1F1F7} \u0641\u0627\u0631\u0633\u06CC", callback_data: "lang:fa" },
          { text: "\u{1F1EC}\u{1F1E7} English", callback_data: "lang:en" }
        ]] };
        await sendTelegram(env, promptText, chatId, keyboard);
      }
    } else if (text === "/lang") {
      const promptText = "\u{1F310} \u0632\u0628\u0627\u0646 / Language";
      const keyboard = { inline_keyboard: [[
        { text: "\u{1F1EE}\u{1F1F7} \u0641\u0627\u0631\u0633\u06CC", callback_data: "lang:fa" },
        { text: "\u{1F1EC}\u{1F1E7} English", callback_data: "lang:en" }
      ]] };
      await sendTelegram(env, promptText, chatId, keyboard);
    } else if (text === "/stop") {
      const chats = await getRegisteredChats(env);
      const newChats = chats.filter((c) => c !== chatId);
      await env.STATE.put(CONFIG.KV_USERS_KEY, JSON.stringify(newChats));
      const prefs = await getUserPrefs(env);
      const lang = (prefs[String(chatId)] && prefs[String(chatId)].lang) === "en" ? "en" : "fa";
      await sendTelegram(env, lang === "en" ? "You have been unsubscribed\\. Use /start to return\\." : "\u274C \u0627\u0632 \u062F\u0631\u06CC\u0627\u0641\u062A \u067E\u06CC\u0627\u0645 \u062E\u0627\u0631\u062C \u0634\u062F\u06CC\u062F\\.", chatId);
    } else if (text === "/help") {
      const prefs = await getUserPrefs(env);
      const lang = (prefs[String(chatId)] && prefs[String(chatId)].lang) === "en" ? "en" : "fa";
      const body = lang === "en"
        ? "/start \\- Join\n/teams \\- List teams\n/follow 1,3,7 \\- Pick teams\n/follow all \\- All teams\n/next \\- Upcoming matches\n/tables \\- League tables\n/timezone london \\- Set timezone\n/lang \\- Change language\n/stop \\- Unsubscribe"
        : "/start \\- \u0639\u0636\u0648\u06CC\u062A\n/teams \\- \u0644\u06CC\u0633\u062A \u062A\u06CC\u0645\u200C\u0647\u0627\n/follow 1,3,7 \\- \u0627\u0646\u062A\u062E\u0627\u0628 \u062A\u06CC\u0645\n/follow all \\- \u0647\u0645\u0647 \u062A\u06CC\u0645\u200C\u0647\u0627\n/next \\- \u0628\u0627\u0632\u06CC\u200C\u0647\u0627\u06CC \u067E\u06CC\u0634\u200C\u0631\u0648\n/tables \\- \u062C\u062F\u0648\u0644\u200C\u0647\u0627\n/timezone london \\- \u062A\u0646\u0638\u06CC\u0645 \u0632\u0645\u0627\u0646\n/lang \\- \u062A\u063A\u06CC\u06CC\u0631 \u0632\u0628\u0627\u0646\n/stop \\- \u0627\u0646\u0635\u0631\u0627\u0641";
      const header = lang === "en" ? "\u26BD *Help*\n\n" : "\u26BD *\u0631\u0627\u0647\u0646\u0645\u0627*\n\n";
      await sendTelegram(env, header + body, chatId);
    } else if (text === "/teams") {
      const master: any = masterTeamList();
      const prefs = await getUserPrefs(env);
      const p = prefs[String(chatId)];
      const lang = (p && p.lang) === "en" ? "en" : "fa";
      const selected = p && Array.isArray(p.teams) ? p.teams : null;
      const lines = master.map((t, i) => {
        const isSel = selected && selected.some((s) => normalizeTeamName(s) === normalizeTeamName(t));
        return (isSel ? "\u2705 " : "") + String(i + 1) + "\\. " + escapeMarkdownCharacters(translateTeam(t));
      });
      const status = selected
        ? (lang === "en" ? "Selected teams: " + selected.length : "\u062A\u0639\u062F\u0627\u062F \u062A\u06CC\u0645 \u0627\u0646\u062A\u062E\u0627\u0628\u06CC: " + toFaDigits(String(selected.length)))
        : (lang === "en" ? "Following all teams\\." : "\u0647\u0645\u0647 \u062A\u06CC\u0645\u200C\u0647\u0627 \u062F\u0646\u0628\u0627\u0644 \u0645\u06CC\u200C\u0634\u0648\u0646\u062F\\.");
      const header = lang === "en" ? "*Teams you can follow:*" : "*\u062A\u06CC\u0645\u200C\u0647\u0627\u06CC \u0642\u0627\u0628\u0644 \u062F\u0646\u0628\u0627\u0644\u200C\u06A9\u0631\u062F\u0646:*";
      const footer = lang === "en" ? "Pick: /follow 1,3,7\nAll: /follow all" : "\u0627\u0646\u062A\u062E\u0627\u0628: /follow 1,3,7\n\u0647\u0645\u0647: /follow all";
      await sendTelegram(env, header + "\n\n" + lines.join("\n") + "\n\n" + status + "\n\n" + footer, chatId);
    } else if (text && text.startsWith("/follow")) {
      const arg = text.slice(7).trim();
      const master: any = masterTeamList();
      const prefs = await getUserPrefs(env);
      const p = prefs[String(chatId)] || {};
      const lang = p.lang === "en" ? "en" : "fa";
      if (!arg || arg === "all") {
        if (prefs[String(chatId)]) delete prefs[String(chatId)];
        await env.STATE.put(CONFIG.KV_USER_PREFS, JSON.stringify(prefs));
        await sendTelegram(env, lang === "en" ? "Following all teams\\." : "\u2705 \u0647\u0645\u0647 \u062A\u06CC\u0645\u200C\u0647\u0627 \u062F\u0646\u0628\u0627\u0644 \u0645\u06CC\u200C\u0634\u0648\u0646\u062F\\.", chatId);
      } else {
        const nums = arg.split(/[\s,\u060C]+/).map((n) => parseInt(String(n), 10)).filter((n) => !isNaN(n) && n >= 1 && n <= master.length);
        if (!nums.length) {
          await sendTelegram(env, lang === "en" ? "Invalid number\\. Use /teams to see the list\\." : "\u26A0\uFE0F \u0634\u0645\u0627\u0631\u0647 \u0646\u0627\u0645\u0639\u062A\u0628\u0631 \u0627\u0633\u062A\\.", chatId);
        } else {
          const picked = [...new Set(nums)].map((n: any) => master[n - 1]);
          prefs[String(chatId)] = { teams: picked, tz: p.tz || null, lang: p.lang || "fa" };
          await env.STATE.put(CONFIG.KV_USER_PREFS, JSON.stringify(prefs));
          const sep = lang === "en" ? ", " : "\u060C ";
          const names = picked.map((t) => escapeMarkdownCharacters(translateTeam(t))).join(sep);
          const head = lang === "en" ? "Your selected teams:\n" : "\u2705 \u062A\u06CC\u0645\u200C\u0647\u0627\u06CC \u0627\u0646\u062A\u062E\u0627\u0628\u06CC \u0634\u0645\u0627:\n";
          const foot = lang === "en" ? "\n\nTo change: /follow all or new numbers\\." : "\n\n\u0628\u0631\u0627\u06CC \u062A\u063A\u06CC\u06CC\u0631\u060C /follow all \u06CC\u0627 \u0634\u0645\u0627\u0631\u0647\u200C\u0647\u0627\u06CC \u062C\u062F\u06CC\u062F \u0631\u0627 \u0628\u0641\u0631\u0633\u062A\u06CC\u062F\\.";
          await sendTelegram(env, head + names + foot, chatId);
        }
      }
    } else if (text && text.startsWith("/timezone")) {
      const prefs = await getUserPrefs(env);
      const p = prefs[String(chatId)] || {};
      const lang = p.lang === "en" ? "en" : "fa";
      const arg = text.slice(10).trim();
      if (!arg) {
        const tz = getUserTz(prefs, chatId, env);
        const head = lang === "en" ? "Your timezone: " : "\u23F0 \u0645\u0646\u0637\u0642\u0647 \u0632\u0645\u0627\u0646\u06CC \u0634\u0645\u0627: ";
        const tail = lang === "en" ? "\nChange: /timezone london" : "\n\u0628\u0631\u0627\u06CC \u062A\u063A\u06CC\u06CC\u0631: /timezone london";
        await sendTelegram(env, head + escapeMarkdownCharacters(tz) + tail, chatId);
      } else if (arg === "reset") {
        if (prefs[String(chatId)]) delete prefs[String(chatId)].tz;
        await env.STATE.put(CONFIG.KV_USER_PREFS, JSON.stringify(prefs));
        const head = lang === "en" ? "Timezone reset to default: " : "\u2705 \u0645\u0646\u0637\u0642\u0647 \u0632\u0645\u0627\u0646\u06CC \u0634\u0645\u0627 \u0628\u0647 \u067E\u06CC\u0634\u200C\u0641\u0631\u0636 \u0628\u0627\u0632\u06AF\u0634\u062A: ";
        await sendTelegram(env, head + escapeMarkdownCharacters(env.TEHRAN_TZ || ""), chatId);
      } else {
        const tz = resolveTimeZone(arg);
        if (!tz) {
          const head = lang === "en" ? "Invalid timezone\\." : "\u26A0\uFE0F \u0645\u0646\u0637\u0642\u0647 \u0632\u0645\u0627\u0646\u06CC \u0646\u0627\u0645\u0639\u062A\u0628\u0631 \u0627\u0633\u062A\\.";
          const tail = lang === "en" ? "\nExample: /timezone london or /timezone Europe/London" : "\n\u0645\u062B\u0627\u0644: /timezone london \u06CC\u0627 /timezone Europe/London";
          await sendTelegram(env, head + tail, chatId);
        } else {
          if (!prefs[String(chatId)]) prefs[String(chatId)] = {};
          prefs[String(chatId)].tz = tz;
          if (!prefs[String(chatId)].lang) prefs[String(chatId)].lang = "fa";
          await env.STATE.put(CONFIG.KV_USER_PREFS, JSON.stringify(prefs));
          const head = lang === "en" ? "Timezone set: " : "\u2705 \u0645\u0646\u0637\u0642\u0647 \u0632\u0645\u0627\u0646\u06CC \u0634\u0645\u0627 \u062A\u063A\u06CC\u06CC\u0631 \u06A9\u0631\u062F: ";
          const tail = lang === "en" ? "\nMessages will be sent in your local time\\." : "\n\u067E\u06CC\u0627\u0645\u200C\u0647\u0627 \u0627\u0632 \u0627\u06CC\u0646 \u067E\u0633 \u0628\u0631 \u0627\u0633\u0627\u0633 \u0633\u0627\u0639\u062A \u0645\u062D\u0644\u06CC \u0627\u0631\u0633\u0627\u0644 \u0645\u06CC\u200C\u0634\u0648\u0646\u062F\\.";
          await sendTelegram(env, head + escapeMarkdownCharacters(tz) + tail, chatId);
        }
      }
    } else if (text === "/featured") {
      // v13.24-featured: show the most important + closest upcoming match
      // (the same featured match the website's hero card shows). Sends a
      // match card image (PNG via resvg-wasm) + the match text.
      await applySettings(env);
      const prefs = await getUserPrefs(env);
      const p = prefs[String(chatId)] || {};
      const lang = p.lang === "en" ? "en" : "fa";
      const pool = await env.STATE.get(CONFIG.KV_MATCHES_KEY, "json").catch(() => null);
      // v13.45-sightlines (W8): bot commands never trigger the full provider
      // sweep. /featured and /next used to re-sweep when the pool was >10min
      // old — a user-typed command could burn ~100ms of CPU on a FETCH
      // invocation (the exact poison behind the 2026-09-14 CPU kills, which
      // 13.43 fixed for cron) plus unmetered KV pool writes. The KV pool is
      // at most one full sweep old (2h) — serving it matches the cron's own
      // quiet-period semantics. Empty pool = the no-matches reply.
      const matches = Array.isArray(pool && pool.matches) ? pool.matches : [];
      const now = new Date();
      // Find the featured match: closest upcoming worthy match (same logic
      // as the website's nextBig — isFeaturedMatch or isMasterPair, live
      // first then by kickoff order). Fall back to any worthy upcoming.
      const upcoming = matches.filter((m) => shouldNotify(m) && (m.status === "SCHEDULED" || m.status === "TIMED") && new Date(m.utcDate) > now).sort((a, b) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime());
      const live = matches.filter((m) => shouldNotify(m) && (m.status === "IN_PLAY" || m.status === "LIVE" || m.status === "PAUSED"));
      const featured = (live.length ? live : upcoming)[0];
      if (!featured) {
        await sendTelegram(env, lang === "en" ? "No upcoming matches right now\\." : "\u{1F4C5} \u062F\u0631 \u062D\u0627\u0644 \u062D\u0627\u0636\u0631 \u0628\u0627\u0632\u06CC \u0645\u0647\u0645\u06CC \u0648\u062C\u0648\u062F \u0646\u062F\u0627\u0631\u062F\\.", chatId, replyKeyboard(lang));
      } else {
        const tzEnv = { ...env, TEHRAN_TZ: getUserTz(prefs, chatId, env) };
        const message = specialBanner(featured, lang) + await formatBigMatchMessage(featured, tzEnv, lang) + (lang === "en"
          ? "\n\n\\-\\-\\-\\-\\-\\-\nView league tables and the biggest upcoming matches:\nhttps://sportsignal\\.ir"
          : "\n\n\\-\\-\\-\\-\\-\\-\n\u0645\u0634\u0627\u0647\u062F\u0647 \u062C\u062F\u0648\u0644 \u0644\u06CC\u06AF\u200C\u0647\u0627 \u0648 \u0645\u0647\u0645\u062A\u0631\u06CC\u0646 \u0628\u0627\u0632\u06CC\u200C\u0647\u0627\u06CC \u067E\u06CC\u0634 \u0631\u0648:\nhttps://sportsignal\\.ir");
        // Send as a card image + caption (like the automated notifications).
        let cardSent = false;
        if (featured.homeTeam.crest || featured.awayTeam.crest) {
          try {
            const pngBuf = await renderCardPngCached(tzEnv, featured, lang);
            if (pngBuf) {
              const caption = message.length > 1024 ? message.slice(0, 1020) + "\u2026" : message;
              const r = await sendPhotoBinary(tzEnv, chatId, pngBuf, caption, true);
              if (r === true) cardSent = true;
            }
          } catch (e) {
            console.warn("Featured card render failed: " + e.message);
          }
        }
        if (!cardSent) {
          await sendTelegram(env, message, chatId, replyKeyboard(lang));
        }
      }
    } else if (text === "/next") {
      await applySettings(env);
      const pool = await env.STATE.get(CONFIG.KV_MATCHES_KEY, "json").catch(() => null);
      // v13.45-sightlines (W8): bot commands never trigger the full provider
      // sweep. /featured and /next used to re-sweep when the pool was >10min
      // old — a user-typed command could burn ~100ms of CPU on a FETCH
      // invocation (the exact poison behind the 2026-09-14 CPU kills, which
      // 13.43 fixed for cron) plus unmetered KV pool writes. The KV pool is
      // at most one full sweep old (2h) — serving it matches the cron's own
      // quiet-period semantics. Empty pool = the no-matches reply.
      const matches = Array.isArray(pool && pool.matches) ? pool.matches : [];
      const prefs = await getUserPrefs(env);
      const p = prefs[String(chatId)] || {};
      const lang = p.lang === "en" ? "en" : "fa";
      const now = new Date();
      const upcoming = matches.filter((m) => shouldNotify(m) && userFollowsMatch(prefs, chatId, m) && new Date(m.utcDate) > now).sort((a, b) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime()).slice(0, 5);
      // v13.2: scoped tz — a shallow env clone feeds the time formatters
      // instead of mutating the isolate-shared env object (the old mutation
      // leaked this user's timezone into unrelated concurrent requests).
      const tzEnv = { ...env, TEHRAN_TZ: getUserTz(prefs, chatId, env) };
      if (!upcoming.length) {
        await sendTelegram(env, lang === "en" ? "No upcoming matches for your followed teams right now\\." : "\u{1F4C5} \u062F\u0631 \u062D\u0627\u0644 \u062D\u0627\u0636\u0631 \u0628\u0627\u0632\u06CC \u067E\u06CC\u0634\u200C\u0631\u0648\u06CC \u0628\u0631\u0627\u06CC \u062A\u06CC\u0645\u200C\u0647\u0627\u06CC \u062F\u0646\u0628\u0627\u0644\u200C\u0634\u062F\u0647 \u0634\u0645\u0627 \u0648\u062C\u0648\u062F \u0646\u062F\u0627\u0631\u062F\\.", chatId);
      } else {
        const lines = upcoming.map((m) => {
          const time = lang === "en" ? getEnglishTime(m.utcDate, tzEnv) : getJalaliTime(m.utcDate, tzEnv);
          const vs = lang === "en" ? " vs " : " \u{1F19A} ";
          return escapeMarkdownCharacters(translateTeam(m.homeTeam.name)) + vs + escapeMarkdownCharacters(translateTeam(m.awayTeam.name)) + "\n" + translateCompetition(m.competition.code) + " \u2014 " + time;
        });
        const header = lang === "en" ? "*Upcoming matches:*\n\n" : "*\u0628\u0627\u0632\u06CC\u200C\u0647\u0627\u06CC \u067E\u06CC\u0634\u200C\u0631\u0648:*\n\n";
        await sendTelegram(env, header + lines.join("\n\n"), chatId);
      }
    } else if (text === "/tables" || text === "/\u062C\u062F\u0648\u0644") {
      await applySettings(env);
      const prefs = await getUserPrefs(env);
      const lang = (prefs[String(chatId)] && prefs[String(chatId)].lang) === "en" ? "en" : "fa";
      const label = lang === "en" ? "Current table" : "\u062C\u062F\u0648\u0644 \u0641\u0639\u0644\u06CC";
      const res = await sendLeagueTables(env, [chatId], { label, lang });
      const wa = await sendWeekAhead(env, [chatId], lang);
      if (res.sent === 0 && wa.sent === 0) {
        await sendTelegram(env, lang === "en" ? "Tables are not available right now\\. Please try again in a few minutes\\." : "\u26A0\uFE0F \u062C\u062F\u0648\u0644\u200C\u0647\u0627 \u0641\u0639\u0644\u0627\u064B \u062F\u0631 \u062F\u0633\u062A\u0631\u0633 \u0646\u06CC\u0633\u062A \\- \u0644\u0637\u0641\u0627\u064B \u062F\u0642\u0627\u06CC\u0642\u06CC \u0628\u0639\u062F \u062F\u0648\u0628\u0627\u0631\u0647 \u062A\u0644\u0627\u0634 \u06A9\u0646\u06CC\u062F\\.", chatId);
      }
    } else if (text && text.startsWith("/")) {
      const prefs = await getUserPrefs(env);
      const lang = (prefs[String(chatId)] && prefs[String(chatId)].lang) === "en" ? "en" : "fa";
      await sendTelegram(env, lang === "en" ? "Unknown command\\. Use /help\\." : "\u{1F4DD} \u062F\u0633\u062A\u0648\u0631 \u0646\u0627\u0634\u0646\u0627\u062E\u062A\u0647 \u0627\u0633\u062A\u060C \u0627\u0632 /help \u0627\u0633\u062A\u0641\u0627\u062F\u0647 \u06A9\u0646\u06CC\u062F\\.", chatId);
    }
    return;
  } catch (error) {
    console.error("Webhook handler error:", error);
  }
}
