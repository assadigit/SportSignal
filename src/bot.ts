// SportSignal — Telegram webhook handler: /start /lang /stop /help /teams
// /follow /next /tables /timezone + callback_query handlers (language
// picker, team-grid toggles, timezone quick-picks — v13.49-buttons).


import { CONFIG } from "./config";
import type { Env } from "./types";
import { toFaDigits, escapeMarkdownCharacters, getJalaliTime, getJalaliDate, getEnglishTime, getEnglishDate } from "./utils";
import { normalizeTeamName } from "./teams";
import { translateTeam, translateCompetition, translateVenue } from "./translate";
import { shouldNotify, isFeaturedMatch, isMasterPair, pickHeroMatch } from "./match-classify";
import { matchKey } from "./dedupe";
import { sendTelegram, answerCallbackQuery, sendPhotoBinary, editMessageText } from "./telegram";
import { renderCardPngCached } from "./card";
import { formatBigMatchMessage, specialBanner } from "./composers";
import { getRegisteredChats, getUserPrefs, setUserLang, getUserTz, masterTeamList, userFollowsMatch, botStr, resolveTimeZone } from "./users";
import { sendLeagueTables, sendWeekAhead } from "./digest-weekly";
import { applySettings } from "./admin";
import { isAdminChat, notifyAdminUserJoined, notifyAdminUserLeft, adminPanelText, adminPanelKeyboard, adminMembersMessage, adminStatusMessage, adminBroadcast } from "./admin-bot";

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
      [{ text: "Teams" }, { text: "Timezone" }],
      [{ text: "Language" }, { text: "Help" }],
      [{ text: "Stop" }]
    ], resize_keyboard: true };
  }
  return { keyboard: [
    [{ text: "\u2B50 \u0628\u0627\u0632\u06CC \u0628\u0631\u062A\u0631" }],
    [{ text: "\u0628\u0627\u0632\u06CC\u200C\u0647\u0627\u06CC \u067E\u06CC\u0634\u200C\u0631\u0648" }, { text: "\u062C\u062F\u0648\u0644\u200C\u0647\u0627" }],
    [{ text: "\u062A\u06CC\u0645\u200C\u0647\u0627" }, { text: "\u0632\u0645\u0627\u0646" }],
    [{ text: "\u0632\u0628\u0627\u0646" }, { text: "\u0631\u0627\u0647\u0646\u0645\u0627" }],
    [{ text: "\u0627\u0646\u0635\u0631\u0627\u0641" }]
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
    "\u0632\u0645\u0627\u0646": "/timezone",
    "\u0631\u0627\u0647\u0646\u0645\u0627": "/help",
    "\u0627\u0646\u0635\u0631\u0627\u0641": "/stop"
  };
  if (faMap[t]) return faMap[t];
  // English button labels → slash commands
  const enMap = { "\u2B50 Featured match": "/featured", "Upcoming": "/next", "Tables": "/tables", "Teams": "/teams", "Timezone": "/timezone", "Language": "/lang", "Help": "/help", "Stop": "/stop" };
  if (enMap[t]) return enMap[t];
  return text;
}

// v13.49-buttons: shared message builders (grid + pickers)
// teamsMessageText: the /teams body — numbered list kept for the
// /follow <numbers> flow, status line, and the tap hint. The inline grid
// below the text is the tap-to-toggle surface (teamsGridKeyboard).
function teamsMessageText(lang, selected, master) {
  const lines = master.map((t, i) => {
    const isSel = selected && selected.some((s) => normalizeTeamName(s) === normalizeTeamName(t));
    return (isSel ? "\u2705 " : "") + String(i + 1) + "\\. " + escapeMarkdownCharacters(translateTeam(t));
  });
  const status = selected
    ? (lang === "en" ? "Selected teams: " + selected.length : "\u062A\u0639\u062F\u0627\u062F \u062A\u06CC\u0645 \u0627\u0646\u062A\u062E\u0627\u0628\u06CC: " + toFaDigits(String(selected.length)))
    : (lang === "en" ? "Following all teams\\." : "\u0647\u0645\u0647 \u062A\u06CC\u0645\u200C\u0647\u0627 \u062F\u0646\u0628\u0627\u0644 \u0645\u06CC\u200C\u0634\u0648\u0646\u062F\\.");
  const header = lang === "en" ? "*Teams you can follow:*" : "*\u062A\u06CC\u0645\u200C\u0647\u0627\u06CC \u0642\u0627\u0628\u0644 \u062F\u0646\u0628\u0627\u0644\u200C\u06A9\u0631\u062F\u0646:*";
  const footer = lang === "en" ? "Tap a button to follow/unfollow, or /follow 1,3,7" : "\u0628\u0631\u0627\u06CC \u0627\u0646\u062A\u062E\u0627\u0628/\u062D\u0630\u0641 \u0631\u0648\u06CC \u062F\u06A9\u0645\u0647\u200C\u0647\u0627 \u0628\u0632\u0646\u06CC\u062F \u06CC\u0627 /follow 1,3,7";
  return header + "\n\n" + lines.join("\n") + "\n\n" + status + "\n\n" + footer;
}

// The inline toggle grid: row 0 = follow-all reset; then the master list
// two per row, \u2705 on followed teams. callback_data tf:<1-based index>.
function teamsGridKeyboard(selected, master) {
  const rows = [[{ text: "\u2705 " + "\u0647\u0645\u0647 \u062A\u06CC\u0645\u200C\u0647\u0627", callback_data: "tf:all" }]];
  for (let i = 0; i < master.length; i += 2) {
    const row = [];
    for (let j = i; j < i + 2 && j < master.length; j++) {
      const isSel = selected && selected.some((s) => normalizeTeamName(s) === normalizeTeamName(master[j]));
      row.push({ text: (isSel ? "\u2705 " : "") + translateTeam(master[j]), callback_data: "tf:" + (j + 1) });
    }
    rows.push(row);
  }
  return { inline_keyboard: rows };
}

// tzStatusText + tzPickerKeyboard: the /timezone reply and its quick-pick
// grid (cities resolve via the same TZ_ALIASES as /timezone <city>).
function tzStatusText(lang, tz) {
  const head = lang === "en" ? "Your timezone: " : "\u23F0 \u0645\u0646\u0637\u0642\u0647 \u0632\u0645\u0627\u0646\u06CC \u0634\u0645\u0627: ";
  const tail = lang === "en" ? "\nPick below or /timezone <city>" : "\n\u0627\u0632 \u062F\u06A9\u0645\u0647\u200C\u0647\u0627\u06CC \u067E\u0627\u06CC\u06CC\u0646 \u06CC\u0627 /timezone <\u0634\u0647\u0631>";
  return head + escapeMarkdownCharacters(tz) + tail;
}

function tzPickerKeyboard(lang) {
  const cities = lang === "en"
    ? [["Tehran", "tehran"], ["London", "london"], ["Paris", "paris"], ["Berlin", "berlin"], ["New York", "new-york"], ["Los Angeles", "los-angeles"], ["Dubai", "dubai"], ["Sydney", "sydney"], ["Tokyo", "tokyo"]]
    : [["\u062A\u0647\u0631\u0627\u0646", "tehran"], ["\u0644\u0646\u062F\u0646", "london"], ["\u067E\u0627\u0631\u06CC\u0633", "paris"], ["\u0628\u0631\u0644\u06CC\u0646", "berlin"], ["\u0646\u06CC\u0648\u06CC\u0648\u0631\u06A9", "new-york"], ["\u0644\u0633\u200C\u0622\u0646\u062C\u0644\u0633", "los-angeles"], ["\u062F\u0628\u06CC", "dubai"], ["\u0633\u06CC\u062F\u0646\u06CC", "sydney"], ["\u062A\u0648\u06A9\u06CC\u0648", "tokyo"]];
  const rows = [];
  for (let i = 0; i < cities.length; i += 3) {
    rows.push(cities.slice(i, i + 3).map((c) => ({ text: c[0], callback_data: "tz:" + c[1] })));
  }
  rows.push([{ text: "\uD83D\uDD04 " + (lang === "en" ? "Reset" : "\u0631\u06CC\u0633\u062A"), callback_data: "tz:reset" }]);
  return { inline_keyboard: rows };
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
    // optional keyboard parameter of sendTelegram.
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
              // v13.71-admintools: a registration through the language picker
              // (a returning user tapping an old picker after /stop) pages the
              // admin too — same join signal as /start.
              await notifyAdminUserJoined(env, cbChatId2, chats.length);
            }
            await setUserLang(env, cbChatId2, lang);
            await answerCallbackQuery(env, cbq.id, lang === "en" ? "English" : "\u0641\u0627\u0631\u0633\u06CC");
            const welcomeText = botStr(lang, "lang_set") + "\n\n" + botStr(lang, "start_welcome") + "\n\n" + (lang === "en" ? "Use the buttons below to navigate\\." : "\u0627\u0632 \u062F\u06A9\u0645\u0647\u200C\u0647\u0627\u06CC \u067E\u0627\u06CC\u06CC\u0646 \u0628\u0631\u0627\u06CC \u0646\u0627\u0648\u0628\u0631\u06CC \u0627\u0633\u062A\u0641\u0627\u062F\u0647 \u06A9\u0646\u06CC\u062F\\.");
            await sendTelegram(env, welcomeText, cbChatId2, replyKeyboard(lang));
          }
        // v13.49-buttons: team-grid callbacks (tf:<n> / tf:all) from the
        // /teams inline grid. Tap toggles follow-status; the message is
        // re-rendered in place so the \u2705 marks never go stale. In
        // follow-all mode the first tap starts a fresh selection with that
        // team (all-minus-one would silently REMOVE alerts).
        const tft = data.match(/^tf:(\d+|all)$/);
        if (tft) {
          const master: any = masterTeamList();
          const prefs = await getUserPrefs(env);
          const key = String(cbChatId2);
          const p = prefs[key] || {};
          const lang = p.lang === "en" ? "en" : "fa";
          if (tft[1] === "all") {
            prefs[key] = { tz: p.tz || null, lang: p.lang || "fa" };
            await env.STATE.put(CONFIG.KV_USER_PREFS, JSON.stringify(prefs));
            await answerCallbackQuery(env, cbq.id, lang === "en" ? "Following all teams" : "\u0647\u0645\u0647 \u062A\u06CC\u0645\u200C\u0647\u0627 \u062F\u0646\u0628\u0627\u0644 \u0645\u06CC\u200C\u0634\u0648\u0646\u062F");
            await editMessageText(env, cbChatId2, cbq.message && cbq.message.message_id, teamsMessageText(lang, null, master), teamsGridKeyboard(null, master));
          } else {
            const idx = parseInt(tft[1], 10);
            if (idx >= 1 && idx <= master.length) {
              const name = master[idx - 1];
              const wasSel = Array.isArray(p.teams) && p.teams.some((s) => normalizeTeamName(s) === normalizeTeamName(name));
              let sel;
              if (!Array.isArray(p.teams)) {
                sel = [name];
              } else if (wasSel) {
                sel = p.teams.filter((s) => normalizeTeamName(s) !== normalizeTeamName(name));
                if (!sel.length) {
                  await answerCallbackQuery(env, cbq.id, lang === "en" ? "Keep at least one team \u2014 or tap All" : "\u062D\u062F\u0627\u0642\u0644 \u06CC\u06A9 \u062A\u06CC\u0645 \u0644\u0627\u0632\u0645 \u0627\u0633\u062A \u2014 \u06CC\u0627 \u0647\u0645\u0647 \u0631\u0627 \u0628\u0632\u0646\u06CC\u062F");
                  return;
                }
              } else {
                sel = p.teams.concat([name]);
              }
              prefs[key] = { teams: sel, tz: p.tz || null, lang: p.lang || "fa" };
              await env.STATE.put(CONFIG.KV_USER_PREFS, JSON.stringify(prefs));
              await answerCallbackQuery(env, cbq.id, (wasSel && Array.isArray(p.teams) ? (lang === "en" ? "Removed: " : "\u062D\u0630\u0641 \u0634\u062F: ") : (lang === "en" ? "Added: " : "\u0627\u0641\u0632\u0648\u062F\u0647 \u0634\u062F: ")) + translateTeam(name));
              await editMessageText(env, cbChatId2, cbq.message && cbq.message.message_id, teamsMessageText(lang, sel, master), teamsGridKeyboard(sel, master));
            }
          }
        }
        // v13.49-buttons: timezone quick-picks (tz:<city> / tz:reset) \u2014
        // the same resolveTimeZone the /timezone command uses, tappable.
        const tzt = data.match(/^tz:([a-z0-9\-]+)$/);
        if (tzt) {
          const prefs = await getUserPrefs(env);
          const key = String(cbChatId2);
          const p = prefs[key] || {};
          const lang = p.lang === "en" ? "en" : "fa";
          if (tzt[1] === "reset") {
            if (prefs[key]) delete prefs[key].tz;
            await env.STATE.put(CONFIG.KV_USER_PREFS, JSON.stringify(prefs));
            await answerCallbackQuery(env, cbq.id, lang === "en" ? "Timezone reset" : "\u0628\u0627\u0632\u06AF\u0634\u062A \u0628\u0647 \u067E\u06CC\u0634\u200C\u0641\u0631\u0636");
          } else {
            const tz = resolveTimeZone(tzt[1]);
            if (tz) {
              if (!prefs[key]) prefs[key] = {};
              prefs[key].tz = tz;
              if (!prefs[key].lang) prefs[key].lang = "fa";
              await env.STATE.put(CONFIG.KV_USER_PREFS, JSON.stringify(prefs));
              await answerCallbackQuery(env, cbq.id, lang === "en" ? "Timezone: " + tz : "\u0645\u0646\u0637\u0642\u0647 \u0632\u0645\u0627\u0646\u06CC: " + tz);
            } else {
              await answerCallbackQuery(env, cbq.id, lang === "en" ? "Unknown timezone" : "\u0645\u0646\u0637\u0642\u0647 \u0632\u0645\u0627\u0646\u06CC \u0646\u0627\u0645\u0639\u062A\u0628\u0631 \u0627\u0633\u062A");
            }
          }
          await editMessageText(env, cbChatId2, cbq.message && cbq.message.message_id, tzStatusText(lang, prefs[key] ? prefs[key].tz || (env.TEHRAN_TZ || "Asia/Tehran") : (env.TEHRAN_TZ || "Asia/Tehran")), tzPickerKeyboard(lang));
        }
        // v13.71-admintools: the /admin panel's quick buttons — members roster
        // and live status. Strictly gated to the owner chat (a non-admin tap
        // gets a denial toast and nothing else).
        const admt = data.match(/^adm:(members|status)$/);
        if (admt) {
          if (!isAdminChat(env, cbChatId2)) {
            await answerCallbackQuery(env, cbq.id, "\u26D4 \u0645\u062E\u0635\u0648\u0635 \u0645\u062F\u06CC\u0631 \u0631\u0628\u0627\u062A \u0627\u0633\u062A");
          } else {
            const body = admt[1] === "members" ? await adminMembersMessage(env) : await adminStatusMessage(env);
            await answerCallbackQuery(env, cbq.id, "\u2713");
            await sendTelegram(env, body, cbChatId2);
          }
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
      const alreadyJoined = chats.includes(chatId);
      if (!alreadyJoined) {
        chats.push(chatId);
        await env.STATE.put(CONFIG.KV_USERS_KEY, JSON.stringify(chats));
        // v13.71-admintools: page the owner the moment a NEW member joins
        // (name/username come from the just-written profile — the per-message
        // upsert above already stored them). Re-starts don't re-page (the
        // alreadyJoined branch below is a returning member, not a join).
        await notifyAdminUserJoined(env, chatId, chats.length);
      }
      const prefs = await getUserPrefs(env);
      const up = prefs[String(chatId)] || {};
      const langSet = up.lang === "en" || up.lang === "fa";
      if (alreadyJoined && langSet) {
        // v13.68-alreadyjoined: a returning user who taps /start again gets a
        // reassuring acknowledgment (not a silent duplicate-welcome). They are
        // already on the roster — tell them the next big-match alert is coming.
        const msg = up.lang === "en"
          ? "\u2705 You\u2019re already joined\\! You\u2019ll get notified of the next big match\\."
          : "\u2705 \u0634\u0645\u0627 \u0642\u0628\u0644\u0627\u064B \u0639\u0636\u0648 \u0634\u062F\u0647\u200C\u0627\u06CC\u062F\\! \u062A\u0627 \u0628\u0627\u0632\u06CC \u0645\u0647\u0645 \u0628\u0639\u062F\u060C \u0627\u0639\u0644\u0627\u0646 \u0622\u0646 \u0631\u0627 \u062F\u0631\u06CC\u0627\u0641\u062A \u062E\u0648\u0627\u0647\u06CC\u062F \u06A9\u0631\u062F\\.";
        await sendTelegram(env, msg, chatId, replyKeyboard(up.lang));
      } else if (langSet && up.lang === "en") {
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
      const wasMember = chats.includes(chatId);
      const newChats = chats.filter((c) => c !== chatId);
      await env.STATE.put(CONFIG.KV_USERS_KEY, JSON.stringify(newChats));
      if (wasMember) {
        // v13.71-admintools: a real leave (was on the roster) pages the
        // owner; a /stop from a stranger is not a leave.
        await notifyAdminUserLeft(env, chatId, newChats.length);
      }
      const prefs = await getUserPrefs(env);
      const lang = (prefs[String(chatId)] && prefs[String(chatId)].lang) === "en" ? "en" : "fa";
      await sendTelegram(env, lang === "en" ? "You have been unsubscribed\\. Use /start to return\\." : "\u274C \u0627\u0632 \u062F\u0631\u06CC\u0627\u0641\u062A \u067E\u06CC\u0627\u0645 \u062E\u0627\u0631\u062C \u0634\u062F\u06CC\u062F\\.", chatId, replyKeyboard(lang));
    } else if (text === "/help") {
      const prefs = await getUserPrefs(env);
      const lang = (prefs[String(chatId)] && prefs[String(chatId)].lang) === "en" ? "en" : "fa";
      const body = lang === "en"
        ? "/start \\- Join\n/teams \\- List teams\n/follow 1,3,7 \\- Pick teams\n/follow all \\- All teams\n/next \\- Upcoming matches\n/tables \\- League tables\n/timezone london \\- Set timezone\n/lang \\- Change language\n/stop \\- Unsubscribe"
        : "/start \\- \u0639\u0636\u0648\u06CC\u062A\n/teams \\- \u0644\u06CC\u0633\u062A \u062A\u06CC\u0645\u200C\u0647\u0627\n/follow 1,3,7 \\- \u0627\u0646\u062A\u062E\u0627\u0628 \u062A\u06CC\u0645\n/follow all \\- \u0647\u0645\u0647 \u062A\u06CC\u0645\u200C\u0647\u0627\n/next \\- \u0628\u0627\u0632\u06CC\u200C\u0647\u0627\u06CC \u067E\u06CC\u0634\u200C\u0631\u0648\n/tables \\- \u062C\u062F\u0648\u0644\u200C\u0647\u0627\n/timezone london \\- \u062A\u0646\u0638\u06CC\u0645 \u0632\u0645\u0627\u0646\n/lang \\- \u062A\u063A\u06CC\u06CC\u0631 \u0632\u0628\u0627\u0646\n/stop \\- \u0627\u0646\u0635\u0631\u0627\u0641";
      const header = lang === "en" ? "\u26BD *Help*\n\n" : "\u26BD *\u0631\u0627\u0647\u0646\u0645\u0627*\n\n";
      const tip = "\n\n" + (lang === "en" ? "Tip: tap the buttons below \uD83D\uDC47" : "\u0631\u0627\u0647\u0646\u0645\u0627: \u0627\u0632 \u062F\u06A9\u0645\u0647\u200C\u0647\u0627\u06CC \u067E\u0627\u06CC\u06CC\u0646 \u0627\u0633\u062A\u0641\u0627\u062F\u0647 \u06A9\u0646 \uD83D\uDC47");
      await sendTelegram(env, header + body + tip, chatId, replyKeyboard(lang));
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
      // v13.49-buttons: the /teams reply now carries the inline toggle grid
      // (tap to follow/unfollow \u2014 the numbered list stays for the
      // /follow <numbers> flow).
      await sendTelegram(env, teamsMessageText(lang, selected, master), chatId, teamsGridKeyboard(selected, master));
    } else if (text && text.startsWith("/follow")) {
      const arg = text.slice(7).trim();
      const master: any = masterTeamList();
      const prefs = await getUserPrefs(env);
      const p = prefs[String(chatId)] || {};
      const lang = p.lang === "en" ? "en" : "fa";
      if (!arg || arg === "all") {
        if (prefs[String(chatId)]) delete prefs[String(chatId)];
        await env.STATE.put(CONFIG.KV_USER_PREFS, JSON.stringify(prefs));
        await sendTelegram(env, lang === "en" ? "Following all teams\\." : "\u2705 \u0647\u0645\u0647 \u062A\u06CC\u0645\u200C\u0647\u0627 \u062F\u0646\u0628\u0627\u0644 \u0645\u06CC\u200C\u0634\u0648\u0646\u062F\\.", chatId, replyKeyboard(lang));
      } else {
        const nums = arg.split(/[\s,\u060C]+/).map((n) => parseInt(String(n), 10)).filter((n) => !isNaN(n) && n >= 1 && n <= master.length);
        if (!nums.length) {
          await sendTelegram(env, lang === "en" ? "Invalid number\\. Use /teams to see the list\\." : "\u26A0\uFE0F \u0634\u0645\u0627\u0631\u0647 \u0646\u0627\u0645\u0639\u062A\u0628\u0631 \u0627\u0633\u062A\\.", chatId, replyKeyboard(lang));
        } else {
          const picked = [...new Set(nums)].map((n: any) => master[n - 1]);
          prefs[String(chatId)] = { teams: picked, tz: p.tz || null, lang: p.lang || "fa" };
          await env.STATE.put(CONFIG.KV_USER_PREFS, JSON.stringify(prefs));
          const sep = lang === "en" ? ", " : "\u060C ";
          const names = picked.map((t) => escapeMarkdownCharacters(translateTeam(t))).join(sep);
          const head = lang === "en" ? "Your selected teams:\n" : "\u2705 \u062A\u06CC\u0645\u200C\u0647\u0627\u06CC \u0627\u0646\u062A\u062E\u0627\u0628\u06CC \u0634\u0645\u0627:\n";
          const foot = lang === "en" ? "\n\nTo change: /follow all or new numbers\\." : "\n\n\u0628\u0631\u0627\u06CC \u062A\u063A\u06CC\u06CC\u0631\u060C /follow all \u06CC\u0627 \u0634\u0645\u0627\u0631\u0647\u200C\u0647\u0627\u06CC \u062C\u062F\u06CC\u062F \u0631\u0627 \u0628\u0641\u0631\u0633\u062A\u06CC\u062F\\.";
          await sendTelegram(env, head + names + foot, chatId, replyKeyboard(lang));
        }
      }
    } else if (text && text.startsWith("/timezone")) {
      const prefs = await getUserPrefs(env);
      const p = prefs[String(chatId)] || {};
      const lang = p.lang === "en" ? "en" : "fa";
      const arg = text.slice(10).trim();
      if (!arg) {
        const tz = getUserTz(prefs, chatId, env);
        // v13.49-buttons: /timezone now offers tappable city quick-picks
        await sendTelegram(env, tzStatusText(lang, tz), chatId, tzPickerKeyboard(lang));
      } else if (arg === "reset") {
        if (prefs[String(chatId)]) delete prefs[String(chatId)].tz;
        await env.STATE.put(CONFIG.KV_USER_PREFS, JSON.stringify(prefs));
        const head = lang === "en" ? "Timezone reset to default: " : "\u2705 \u0645\u0646\u0637\u0642\u0647 \u0632\u0645\u0627\u0646\u06CC \u0634\u0645\u0627 \u0628\u0647 \u067E\u06CC\u0634\u200C\u0641\u0631\u0636 \u0628\u0627\u0632\u06AF\u0634\u062A: ";
        await sendTelegram(env, head + escapeMarkdownCharacters(env.TEHRAN_TZ || ""), chatId, replyKeyboard(lang));
      } else {
        const tz = resolveTimeZone(arg);
        if (!tz) {
          const head = lang === "en" ? "Invalid timezone\\." : "\u26A0\uFE0F \u0645\u0646\u0637\u0642\u0647 \u0632\u0645\u0627\u0646\u06CC \u0646\u0627\u0645\u0639\u062A\u0628\u0631 \u0627\u0633\u062A\\.";
          const tail = lang === "en" ? "\nExample: /timezone london or /timezone Europe/London" : "\n\u0645\u062B\u0627\u0644: /timezone london \u06CC\u0627 /timezone Europe/London";
          await sendTelegram(env, head + tail, chatId, replyKeyboard(lang));
        } else {
          if (!prefs[String(chatId)]) prefs[String(chatId)] = {};
          prefs[String(chatId)].tz = tz;
          if (!prefs[String(chatId)].lang) prefs[String(chatId)].lang = "fa";
          await env.STATE.put(CONFIG.KV_USER_PREFS, JSON.stringify(prefs));
          const head = lang === "en" ? "Timezone set: " : "\u2705 \u0645\u0646\u0637\u0642\u0647 \u0632\u0645\u0627\u0646\u06CC \u0634\u0645\u0627 \u062A\u063A\u06CC\u06CC\u0631 \u06A9\u0631\u062F: ";
          const tail = lang === "en" ? "\nMessages will be sent in your local time\\." : "\n\u067E\u06CC\u0627\u0645\u200C\u0647\u0627 \u0627\u0632 \u0627\u06CC\u0646 \u067E\u0633 \u0628\u0631 \u0627\u0633\u0627\u0633 \u0633\u0627\u0639\u062A \u0645\u062D\u0644\u06CC \u0627\u0631\u0633\u0627\u0644 \u0645\u06CC\u200C\u0634\u0648\u0646\u062F\\.";
          await sendTelegram(env, head + escapeMarkdownCharacters(tz) + tail, chatId, replyKeyboard(lang));
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
      // v13.73-herotruth: /featured calls the SHARED pickHeroMatch (matches.ts)
      // — the exact expression the website hero uses (isFeaturedMatch ||
      // isMasterPair, live-first, nearest kickoff). v13.68 made the website
      // the ground truth; until here the bot carried a hand-copied filter that
      // had already drifted (unsorted live pick). One expression, two
      // consumers (ADR-001). Was shouldNotify(m) before v13.68 — that only
      // required ONE big team.
      const featured = pickHeroMatch(matches);
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
        await sendTelegram(env, lang === "en" ? "No upcoming matches for your followed teams right now\\." : "\u{1F4C5} \u062F\u0631 \u062D\u0627\u0644 \u062D\u0627\u0636\u0631 \u0628\u0627\u0632\u06CC \u067E\u06CC\u0634\u200C\u0631\u0648\u06CC \u0628\u0631\u0627\u06CC \u062A\u06CC\u0645\u200C\u0647\u0627\u06CC \u062F\u0646\u0628\u0627\u0644\u200C\u0634\u062F\u0647 \u0634\u0645\u0627 \u0648\u062C\u0648\u062F \u0646\u062F\u0627\u0631\u062F\\.", chatId, replyKeyboard(lang));
      } else {
        const lines = upcoming.map((m) => {
          // v13.68-fulldate: /next now shows the full date (weekday + day +
          // month) alongside the time — was time-only, so users couldn't tell
          // which day a match was on.
          const date = lang === "en" ? getEnglishDate(m.utcDate, tzEnv) : getJalaliDate(m.utcDate, tzEnv);
          const time = lang === "en" ? getEnglishTime(m.utcDate, tzEnv) : getJalaliTime(m.utcDate, tzEnv);
          const vs = lang === "en" ? " vs " : " \u{1F19A} ";
          return escapeMarkdownCharacters(translateTeam(m.homeTeam.name)) + vs + escapeMarkdownCharacters(translateTeam(m.awayTeam.name)) + "\n" + escapeMarkdownCharacters(translateCompetition(m.competition.code)) + " \u2014 " + escapeMarkdownCharacters(date) + " \u2014 " + time;
        });
        const header = lang === "en" ? "*Upcoming matches:*\n\n" : "*\u0628\u0627\u0632\u06CC\u200C\u0647\u0627\u06CC \u067E\u06CC\u0634\u200C\u0631\u0648:*\n\n";
        await sendTelegram(env, header + lines.join("\n\n"), chatId, replyKeyboard(lang));
      }
    } else if (text === "/tables" || text === "/\u062C\u062F\u0648\u0644") {
      await applySettings(env);
      const prefs = await getUserPrefs(env);
      const lang = (prefs[String(chatId)] && prefs[String(chatId)].lang) === "en" ? "en" : "fa";
      const label = lang === "en" ? "Current table" : "\u062C\u062F\u0648\u0644 \u0641\u0639\u0644\u06CC";
      const res = await sendLeagueTables(env, [chatId], { label, lang });
      const wa = await sendWeekAhead(env, [chatId], lang);
      if (res.sent === 0 && wa.sent === 0) {
        await sendTelegram(env, lang === "en" ? "Tables are not available right now\\. Please try again in a few minutes\\." : "\u26A0\uFE0F \u062C\u062F\u0648\u0644\u200C\u0647\u0627 \u0641\u0639\u0644\u0627\u064B \u062F\u0631 \u062F\u0633\u062A\u0631\u0633 \u0646\u06CC\u0633\u062A \\- \u0644\u0637\u0641\u0627\u064B \u062F\u0642\u0627\u06CC\u0642\u06CC \u0628\u0639\u062F \u062F\u0648\u0628\u0627\u0631\u0647 \u062A\u0644\u0627\u0634 \u06A9\u0646\u06CC\u062F\\.", chatId, replyKeyboard(lang));
      }
    } else if (text === "/admin" || text === "/members" || text === "/status" || (text && /^\/broadcast($|[@\s])/.test(text))) {
      // v13.71-admintools: the owner's toolbelt (see src/admin-bot.ts).
      // Gated to the admin chat id (env.CHAT_ID) BEFORE anything else — a
      // non-owner probing these gets a plain denial, no data, no fan-out.
      if (!isAdminChat(env, chatId)) {
        console.warn("\u26D4 Non-admin " + chatId + " probed an admin command: " + String(text).slice(0, 40));
        const prefs = await getUserPrefs(env);
        const lang = (prefs[String(chatId)] && prefs[String(chatId)].lang) === "en" ? "en" : "fa";
        await sendTelegram(env, lang === "en" ? "\u26D4 Owner\-only command\." : "\u26D4 \u0627\u06CC\u0646 \u062F\u0633\u062A\u0648\u0631 \u0645\u062E\u0635\u0648\u0635 \u0645\u062F\u06CC\u0631 \u0631\u0628\u0627\u062A \u0627\u0633\u062A\.", chatId, replyKeyboard(lang));
      } else if (text === "/admin") {
        await sendTelegram(env, adminPanelText(), chatId, adminPanelKeyboard());
      } else if (text === "/members") {
        await sendTelegram(env, await adminMembersMessage(env), chatId);
      } else if (text === "/status") {
        await sendTelegram(env, await adminStatusMessage(env), chatId);
      } else {
        // /broadcast <text> — strip the command (+ any @bot suffix Telegram
        // appends in groups) and fan out to every registered chat.
        const body = text.replace(/^\/broadcast(@\S+)?\s*/, "");
        if (!body) {
          await sendTelegram(env, "\u{1F4E2} \u0627\u0633\u062A\u0641\u0627\u062F\u0647: /broadcast <\u0645\u062A\u0646 \u067E\u06CC\u0627\u0645>", chatId);
        } else {
          await sendTelegram(env, "\u23F3 \u062F\u0631 \u062D\u0627\u0644 \u0627\u0631\u0633\u0627\u0644 \u06AF\u0631\u0648\u0647\u06CC\u2026", chatId);
          await sendTelegram(env, await adminBroadcast(env, body), chatId);
        }
      }
    } else if (text && text.startsWith("/")) {
      const prefs = await getUserPrefs(env);
      const lang = (prefs[String(chatId)] && prefs[String(chatId)].lang) === "en" ? "en" : "fa";
      await sendTelegram(env, lang === "en" ? "Unknown command\\. Use /help\\." : "\u{1F4DD} \u062F\u0633\u062A\u0648\u0631 \u0646\u0627\u0634\u0646\u0627\u062E\u062A\u0647 \u0627\u0633\u062A\u060C \u0627\u0632 /help \u0627\u0633\u062A\u0641\u0627\u062F\u0647 \u06A9\u0646\u06CC\u062F\\.", chatId, replyKeyboard(lang));
    }
    return;
  } catch (error) {
    console.error("Webhook handler error:", error);
  }
}
