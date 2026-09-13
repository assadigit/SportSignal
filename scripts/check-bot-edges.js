// Self-check: Telegram bot edge cases beyond the join-flow happy path.
//
// Covers the callback_query language picker (fa + en + malformed data), the
// /timezone sub-commands (show / reset / invalid / valid), /lang picker
// re-send, /help body, and the /stop → /start re-join round-trip. Asserts the
// corrected Persian welcome spelling ("خوش آمدید") after the v13.7-botpass
// typo fix (was "خوش آمدیح" / "خوش آمدیا").
//
// The handler blocks are sliced verbatim out of the concatenated worker source
// (single source of truth); if a maintainer changes the bot logic, this gate
// fails until the assertions are updated too.
const fs = require("fs");
const src = require("./lib/worker-src")();

// --- Extract BOT_STRINGS + botStr (real definitions, so the callback test
//     exercises the actual welcome strings — catches typos in BOT_STRINGS) ---
const bsStart = src.indexOf("var BOT_STRINGS = {");
const bsEnd = src.indexOf("function userFollowsMatch");
if (bsStart < 0 || bsEnd < 0 || bsEnd < bsStart) {
  console.error("FAIL: BOT_STRINGS/botStr block not found in worker source");
  process.exit(1);
}
const botStrSrc = src.slice(bsStart, bsEnd).replace(/\n\s*$/, "");

// --- Extract the callback_query block (cbq → return) ---
const cbStart = src.indexOf("const cbq = update && update.callback_query;");
const cbEnd = src.indexOf("const message = update && update.message;");
if (cbStart < 0 || cbEnd < 0 || cbEnd < cbStart) {
  console.error("FAIL: callback_query block not found in worker source");
  process.exit(1);
}
const cbChain = src.slice(cbStart, cbEnd).replace(/\n\s*$/, "");

// --- Extract the message command chain (/start … unknown) ---
const msgStart = src.indexOf('if (text === "/start") {');
const msgEnd = src.indexOf('} catch (error) {', msgStart);
if (msgStart < 0 || msgEnd < 0) {
  console.error("FAIL: message command chain not found in worker source");
  process.exit(1);
}
const msgChain = src.slice(msgStart, msgEnd).replace(/\n\s*$/, "");

// --- Fake KV + harness ---
function makeStore() {
  const m = new Map();
  return {
    async get(k, arg) {
      const v = m.get(k);
      if (arg === "json") return v ? JSON.parse(v) : null;
      return v === undefined ? null : v;
    },
    async put(k, v) { m.set(k, v); },
    async delete(k) { m.delete(k); }
  };
}

const CONFIG = { KV_USERS_KEY: "telegram_users_v6", KV_USER_PREFS: "user_prefs_v1" };
const STUB_TEAMS = ["Alpha FC", "Beta SC", "Gamma United"];

let sent = [];
let answered = [];
let envRef = null;
globalThis.CONFIG = CONFIG;
globalThis.masterTeamList = () => STUB_TEAMS;
globalThis.normalizeTeamName = (n) => String(n);
globalThis.translateTeam = (n) => String(n);
globalThis.translateCompetition = (c) => String(c);
globalThis.escapeMarkdownCharacters = (s) => String(s);
globalThis.toFaDigits = (s) => String(s);
globalThis.sendTelegram = async (_env, msg, id, keyboard) => { sent.push({ msg, id, keyboard }); return true; };
globalThis.answerCallbackQuery = async (_env, cbqId, text) => { answered.push({ cbqId, text }); return true; };
globalThis.getRegisteredChats = async (env) => {
  const raw = await env.STATE.get(CONFIG.KV_USERS_KEY);
  if (!raw) return [];
  const p = JSON.parse(raw);
  return Array.isArray(p) ? p : [];
};
globalThis.getUserPrefs = async (env) => (await env.STATE.get(CONFIG.KV_USER_PREFS, "json")) || {};
globalThis.setUserLang = async (env, chatId, lang) => {
  const prefs = await globalThis.getUserPrefs(env);
  const key = String(chatId);
  const cur = prefs[key] || {};
  prefs[key] = { teams: cur.teams || [], tz: cur.tz || null, lang: lang === "en" ? "en" : "fa" };
  await env.STATE.put(CONFIG.KV_USER_PREFS, JSON.stringify(prefs));
  return true;
};
globalThis.getUserTz = (prefs, chatId, env) => {
  const p = prefs[String(chatId)];
  return p && typeof p.tz === "string" && p.tz ? p.tz : (env.TEHRAN_TZ || "Asia/Tehran");
};
globalThis.resolveTimeZone = (input) => {
  const map = { london: "Europe/London", tehran: "Asia/Tehran" };
  const raw = String(input || "").trim().toLowerCase();
  return map[raw] || null;
};
// v13.23-buttons: stubs for the reply keyboard + command normalizer
globalThis.replyKeyboard = (lang) => ({ keyboard: [], resize_keyboard: true });
globalThis.normalizeCommand = (text) => text;

const cbHandler = new Function("env", "update", "return (async () => { " + botStrSrc + "\n" + cbChain + "\n })();");
const msgHandler = new Function("text", "chatId", "env", "return (async () => { " + msgChain + "\n })();");

function freshEnv() {
  sent = [];
  answered = [];
  const env = { STATE: makeStore(), BOT_TOKEN: "test", CHAT_ID: "0", TEHRAN_TZ: "Asia/Tehran" };
  envRef = env;
  return env;
}

let failed = 0;
const check = (name, cond) => {
  console.log((cond ? "OK   " : "FAIL ") + name);
  if (!cond) failed++;
};

(async () => {
  // 1) callback_query lang:fa — registers chat, persists lang, answers, sends welcome
  const env1 = freshEnv();
  await cbHandler(env1, { callback_query: { id: "cb1", data: "lang:fa", from: { id: 42 }, message: { chat: { id: 42 } } } });
  const users1 = JSON.parse(await env1.STATE.get(CONFIG.KV_USERS_KEY) || "[]");
  check("cbq lang:fa registers the chat", users1.includes(42));
  const prefs1 = await env1.STATE.get(CONFIG.KV_USER_PREFS, "json");
  check("cbq lang:fa persists lang=fa", prefs1 && prefs1["42"] && prefs1["42"].lang === "fa");
  check("cbq lang:fa answers the callback", answered.length === 1 && answered[0].cbqId === "cb1");
  check("cbq lang:fa sends a welcome message", sent.length === 1 && sent[0].id === 42);
  check("cbq lang:fa welcome spells خوش آمدید (typo fixed)", /خوش آمدید/.test(sent[0].msg));

  // 2) callback_query lang:en — English welcome
  const env2 = freshEnv();
  await cbHandler(env2, { callback_query: { id: "cb2", data: "lang:en", from: { id: 43 }, message: { chat: { id: 43 } } } });
  const prefs2 = await env2.STATE.get(CONFIG.KV_USER_PREFS, "json");
  check("cbq lang:en persists lang=en", prefs2 && prefs2["43"] && prefs2["43"].lang === "en");
  check("cbq lang:en answers the callback", answered.length === 1 && answered[0].text === "English");
  check("cbq lang:en sends English welcome", sent.length === 1 && /Welcome to SportSignal/.test(sent[0].msg));

  // 3) callback_query with malformed data — no crash, no send (silent)
  const env3 = freshEnv();
  await cbHandler(env3, { callback_query: { id: "cb3", data: "unknown:payload", from: { id: 44 }, message: { chat: { id: 44 } } } });
  check("cbq malformed data sends nothing", sent.length === 0);

  // 4) /timezone with no arg — shows current tz
  const env4 = freshEnv();
  await msgHandler("/timezone", 42, env4);
  check("/timezone (no arg) shows current tz", /منطقه زمانی|timezone/i.test(sent[sent.length - 1].msg));

  // 5) /timezone reset — clears tz, sends reset message
  const env5 = freshEnv();
  // seed a tz first
  await env5.STATE.put(CONFIG.KV_USER_PREFS, JSON.stringify({ "42": { tz: "Europe/London", lang: "fa" } }));
  await msgHandler("/timezone reset", 42, env5);
  const prefs5 = await env5.STATE.get(CONFIG.KV_USER_PREFS, "json");
  check("/timezone reset clears the tz field", !prefs5["42"].tz);
  check("/timezone reset sends reset message", /بازگشت|reset/i.test(sent[sent.length - 1].msg));

  // 6) /timezone invalid — sends invalid message, no tz written
  const env6 = freshEnv();
  await env6.STATE.put(CONFIG.KV_USER_PREFS, JSON.stringify({ "42": { lang: "fa" } }));
  await msgHandler("/timezone notarealplace", 42, env6);
  const prefs6 = await env6.STATE.get(CONFIG.KV_USER_PREFS, "json");
  check("/timezone invalid writes no tz", !prefs6["42"].tz);
  check("/timezone invalid sends invalid message", /نامعتبر|invalid/i.test(sent[sent.length - 1].msg));

  // 7) /timezone london — sets tz, sends set message
  const env7 = freshEnv();
  await env7.STATE.put(CONFIG.KV_USER_PREFS, JSON.stringify({ "42": { lang: "fa" } }));
  await msgHandler("/timezone london", 42, env7);
  const prefs7 = await env7.STATE.get(CONFIG.KV_USER_PREFS, "json");
  check("/timezone london sets tz=Europe/London", prefs7["42"].tz === "Europe/London");
  check("/timezone london sends set message", /تغییر کرد|set/i.test(sent[sent.length - 1].msg));

  // 8) /lang — sends the picker keyboard
  const env8 = freshEnv();
  await msgHandler("/lang", 42, env8);
  const langMsg = sent[sent.length - 1];
  check("/lang sends the picker keyboard", langMsg.keyboard && langMsg.keyboard.inline_keyboard &&
    langMsg.keyboard.inline_keyboard[0].some((b) => b.callback_data === "lang:fa") &&
    langMsg.keyboard.inline_keyboard[0].some((b) => b.callback_data === "lang:en"));

  // 9) /help — sends the help body with the command list
  const env9 = freshEnv();
  await msgHandler("/help", 42, env9);
  const helpMsg = sent[sent.length - 1].msg;
  check("/help lists the commands", /\/start/.test(helpMsg) && /\/teams/.test(helpMsg) && /\/follow/.test(helpMsg) && /\/next/.test(helpMsg) && /\/stop/.test(helpMsg));

  // 10) /stop → /start re-join round-trip
  const env10 = freshEnv();
  await msgHandler("/start", 42, env10);
  let users10 = JSON.parse(await env10.STATE.get(CONFIG.KV_USERS_KEY) || "[]");
  check("re-join /start registers the chat", users10.includes(42));
  await msgHandler("/stop", 42, env10);
  users10 = JSON.parse(await env10.STATE.get(CONFIG.KV_USERS_KEY) || "[]");
  check("/stop removes the chat after re-join", !users10.includes(42));

  // 11) /start fa welcome (existing fa user) spells خوش آمدید (typo fixed)
  const env11 = freshEnv();
  await env11.STATE.put(CONFIG.KV_USER_PREFS, JSON.stringify({ "42": { lang: "fa" } }));
  await msgHandler("/start", 42, env11);
  check("/start fa welcome spells خوش آمدید (typo fixed)", /خوش آمدید/.test(sent[sent.length - 1].msg));

  // 12) /start en welcome (existing en user)
  const env12 = freshEnv();
  await env12.STATE.put(CONFIG.KV_USER_PREFS, JSON.stringify({ "42": { lang: "en" } }));
  await msgHandler("/start", 42, env12);
  check("/start en welcome is English", /Welcome to SportSignal/.test(sent[sent.length - 1].msg));

  console.log(failed ? failed + " FAILURES" : "bot edges OK");
  process.exit(failed ? 1 : 0);
})();
