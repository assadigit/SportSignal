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
// v13.106-mdstyle: the REAL entity builders (src/md.ts), sliced from the
// concat and installed as GLOBALS — the eval'd builders/command chains below
// compose bold/italic/code spans through them, and their free identifiers
// resolve through the global object.
const mdModStart = src.indexOf("// ===== src/md.ts =====");
const mdModEnd = src.indexOf("// ===== src/", mdModStart + 10);
if (mdModStart < 0 || mdModEnd < 0) {
  console.error("FAIL: src/md.ts module not found in worker source");
  process.exit(1);
}
Object.assign(globalThis, new Function(src.slice(mdModStart, mdModEnd) + "\n; return { mdEscape, mdBold, mdItalic, mdCode };")());


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

// v13.92-d1userstore: the command/callback chains now write through the
// REAL user-data seam — slice the whole module in so the tests exercise the
// actual save/register/dedupe code paths (legacy KV mode: the mock envs
// carry no USERS_DB binding).
const usStart = src.indexOf("// ===== src/user-store.ts =====");
const usEnd = src.indexOf("// ===== src/users.ts =====");
if (usStart < 0 || usEnd < 0 || usEnd < usStart) {
  console.error("FAIL: user-store module not found in worker source");
  process.exit(1);
}
const userStoreSrc = src.slice(usStart, usEnd);

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

const CONFIG = { KV_USERS_KEY: "telegram_users_v6", KV_USER_PREFS: "user_prefs_v1", KV_USER_PROFILES: "user_profiles_v1" };
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
// v13.71-admintools: the command/callback chains now page the owner on
// join/leave — no-op capture stubs keep this harness's send-count
// assertions about USER-facing messages only.
let adminPages = [];
globalThis.notifyAdminUserJoined = async () => {};
globalThis.notifyAdminUserLeft = async () => {};
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
  // v13.90-tzonboard: extended to the region-picker city slugs the new
  // tests exercise (mirrors the real TZ_ALIASES entries in users.ts).
  const map = { london: "Europe/London", tehran: "Asia/Tehran", sydney: "Australia/Sydney", melbourne: "Australia/Melbourne", auckland: "Pacific/Auckland", perth: "Australia/Perth", "new-york": "America/New_York", athens: "Europe/Athens", moscow: "Europe/Moscow", "buenos-aires": "America/Argentina/Buenos_Aires", "mexico-city": "America/Mexico_City" };
  const raw = String(input || "").trim().toLowerCase();
  return map[raw] || null;
};
// v13.23-buttons: stubs for the reply keyboard + command normalizer
globalThis.replyKeyboard = (lang) => ({ keyboard: [], resize_keyboard: true });
globalThis.normalizeCommand = (text) => text;
// v13.49-buttons: capture editMessageText calls (in-place grid re-render)
let edited = [];
globalThis.editMessageText = async (_env, chatId, msgId, text, kb) => { edited.push({ chatId, msgId, text, kb }); return true; };

// v13.49-buttons: slice the REAL grid/picker builders into the eval so the
// callback tests exercise the actual render code, not stubs.
const bldStart = src.indexOf("// v13.49-buttons: shared message builders");
const bldEnd = src.indexOf("async function handleTelegramUpdate");
if (bldStart < 0 || bldEnd < 0 || bldEnd < bldStart) {
  console.error("FAIL: builders block not found in worker source");
  process.exit(1);
}
const buildersSrc = src.slice(bldStart, bldEnd);
const cbHandler = new Function("env", "update", "return (async () => { " + botStrSrc + "\n" + buildersSrc + "\n" + userStoreSrc + "\n" + cbChain + "\n })();");
// v13.102-referral: the /start langSet branch now composes the welcome
// through botStr (ONE source of welcome truth) — slice the REAL strings in.
const msgHandler = new Function("text", "chatId", "env", "return (async () => { " + botStrSrc + "\n" + buildersSrc + "\n" + userStoreSrc + "\n" + msgChain + "\n })();");

function freshEnv() {
  sent = [];
  answered = [];
  edited = [];
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
  // v13.90-tzonboard: welcome + tz onboarding prompt (no tz set yet)
  check("cbq lang:fa sends welcome + tz onboarding (2 msgs)", sent.length === 2 && sent[0].id === 42);
  check("cbq lang:fa welcome spells خوش آمدید (typo fixed)", /خوش آمدید/.test(sent[0].msg));
  check("cbq lang:fa tz prompt offers the hub (tzr: + tz:tehran + tz:reset)",
    sent[1].keyboard && (sent[1].keyboard.inline_keyboard || []).flat().some((b) => b.callback_data === "tz:tehran") &&
    (sent[1].keyboard.inline_keyboard || []).flat().some((b) => b.callback_data === "tzr:oceania") &&
    (sent[1].keyboard.inline_keyboard || []).flat().some((b) => b.callback_data === "tz:reset"));
  check("cbq lang:fa welcome is MarkdownV2-clean (fixed v13.90 single-escape bug)", sent[0].msg.includes("\\!") && !/(^|[^\\])[.!?]/.test(sent[0].msg.replace(/\u2705/g, "")));

  // 2) callback_query lang:en — English welcome
  const env2 = freshEnv();
  await cbHandler(env2, { callback_query: { id: "cb2", data: "lang:en", from: { id: 43 }, message: { chat: { id: 43 } } } });
  const prefs2 = await env2.STATE.get(CONFIG.KV_USER_PREFS, "json");
  check("cbq lang:en persists lang=en", prefs2 && prefs2["43"] && prefs2["43"].lang === "en");
  check("cbq lang:en answers the callback", answered.length === 1 && answered[0].text === "English");
  check("cbq lang:en sends English welcome + tz prompt (2 msgs)", sent.length === 2 && /Welcome to SportSignal/.test(sent[0].msg));
  check("cbq lang:en tz prompt is English", /timezone/i.test(sent[1].msg));

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
  check("/start fa welcome spells خوش آمدید (typo fixed)", sent.some((s) => /خوش آمدید/.test(s.msg)));
  check("/start (fa, no tz) also offers the tz picker", sent.some((s) => s.keyboard && (s.keyboard.inline_keyboard || []).flat().some((b) => b.callback_data === "tzr:eu")));

  // 12) /start en welcome (existing en user)
  const env12 = freshEnv();
  await env12.STATE.put(CONFIG.KV_USER_PREFS, JSON.stringify({ "42": { lang: "en" } }));
  await msgHandler("/start", 42, env12);
  check("/start en welcome is English", sent.some((s) => /Welcome to SportSignal/.test(s.msg)));
  check("/start (en, no tz) also offers the tz picker", sent.some((s) => s.keyboard && (s.keyboard.inline_keyboard || []).flat().some((b) => b.callback_data === "tzr:namerica")));

  // 13) /teams sends the numbered list AND the inline toggle grid
  const env13 = freshEnv();
  await msgHandler("/teams", 42, env13);
  const teamsMsg = sent[sent.length - 1];
  const flatButtons = (teamsMsg.keyboard && teamsMsg.keyboard.inline_keyboard || []).flat();
  check("/teams sends the inline grid (tf:all + numbered tf buttons)",
    flatButtons.some((b) => b.callback_data === "tf:all") &&
    flatButtons.some((b) => b.callback_data === "tf:1") &&
    flatButtons.some((b) => b.callback_data === "tf:2") &&
    flatButtons.some((b) => b.callback_data === "tf:3"));
  check("/teams text still numbered (join-flow contract)", /1\\./.test(teamsMsg.msg) && /3\\./.test(teamsMsg.msg));

  // 14) tf:2 in follow-all mode -> selection starts with exactly team 2
  const env14 = freshEnv();
  await cbHandler(env14, { callback_query: { id: "cb14", data: "tf:2", from: { id: 42 }, message: { chat: { id: 42 }, message_id: 77 } } });
  const prefs14 = await env14.STATE.get(CONFIG.KV_USER_PREFS, "json");
  check("tf:2 in all-mode starts a fresh selection with team 2",
    prefs14 && prefs14["42"] && JSON.stringify(prefs14["42"].teams) === JSON.stringify(["Beta SC"]));
  check("tf:2 re-renders the grid in place (editMessageText)", edited.length === 1 && edited[0].msgId === 77);
  check("tf:2 grid marks team 2 selected",
    (edited[0].kb.inline_keyboard || []).flat().some((b) => b.callback_data === "tf:2" && /^\u2705/.test(b.text)));

  // 15) toggling the LAST selected team off is refused (never drop to zero silently)
  const env15 = freshEnv();
  await env15.STATE.put(CONFIG.KV_USER_PREFS, JSON.stringify({ "42": { teams: ["Beta SC"], lang: "fa" } }));
  await cbHandler(env15, { callback_query: { id: "cb15", data: "tf:2", from: { id: 42 }, message: { chat: { id: 42 }, message_id: 88 } } });
  const prefs15 = await env15.STATE.get(CONFIG.KV_USER_PREFS, "json");
  check("tf off the last team is refused (min-one guard)", prefs15 && prefs15["42"] && prefs15["42"].teams.length === 1);
  check("min-one guard answers the callback", answered.length === 1 && /\u062D\u062F\u0627\u0642\u0644|one team/i.test(answered[0].text));

  // 16) tf:1 then tf:3 accumulates a multi-selection
  const env16 = freshEnv();
  await env16.STATE.put(CONFIG.KV_USER_PREFS, JSON.stringify({ "42": { teams: ["Alpha FC"], lang: "fa" } }));
  await cbHandler(env16, { callback_query: { id: "cb16", data: "tf:3", from: { id: 42 }, message: { chat: { id: 42 }, message_id: 99 } } });
  const prefs16 = await env16.STATE.get(CONFIG.KV_USER_PREFS, "json");
  check("tf:3 adds to an existing selection",
    prefs16 && prefs16["42"] && JSON.stringify(prefs16["42"].teams) === JSON.stringify(["Alpha FC", "Gamma United"]));

  // 17) tf:all returns to follow-everything (teams gone, lang/tz preserved)
  const env17 = freshEnv();
  await env17.STATE.put(CONFIG.KV_USER_PREFS, JSON.stringify({ "42": { teams: ["Alpha FC"], tz: "Europe/London", lang: "en" } }));
  await cbHandler(env17, { callback_query: { id: "cb17", data: "tf:all", from: { id: 42 }, message: { chat: { id: 42 }, message_id: 100 } } });
  const prefs17 = await env17.STATE.get(CONFIG.KV_USER_PREFS, "json");
  check("tf:all clears teams but preserves lang+tz",
    prefs17 && prefs17["42"] && !prefs17["42"].teams && prefs17["42"].lang === "en" && prefs17["42"].tz === "Europe/London");

  // 18) tz:london callback sets the timezone
  const env18 = freshEnv();
  await env18.STATE.put(CONFIG.KV_USER_PREFS, JSON.stringify({ "42": { lang: "fa" } }));
  await cbHandler(env18, { callback_query: { id: "cb18", data: "tz:london", from: { id: 42 }, message: { chat: { id: 42 }, message_id: 101 } } });
  const prefs18 = await env18.STATE.get(CONFIG.KV_USER_PREFS, "json");
  check("tz:london sets tz=Europe/London", prefs18 && prefs18["42"] && prefs18["42"].tz === "Europe/London");
  // v13.90-tzonboard: selecting a zone edits to the select+confirm view
  check("tz:london edits to the confirm view (tzok + change-region)", edited.length === 1 &&
    (edited[0].kb.inline_keyboard || []).flat().some((b) => b.callback_data === "tzok") &&
    (edited[0].kb.inline_keyboard || []).flat().some((b) => b.callback_data === "tzr:hub"));
  check("tz confirm view carries the zone + a time hint", /Europe\/London/.test(edited[0].text) && /\d\d:\d\d/.test(edited[0].text));

  // 19) tz:reset clears it again
  await cbHandler(env18, { callback_query: { id: "cb19", data: "tz:reset", from: { id: 42 }, message: { chat: { id: 42 }, message_id: 102 } } });
  const prefs19 = await env18.STATE.get(CONFIG.KV_USER_PREFS, "json");
  check("tz:reset clears the tz", prefs19 && prefs19["42"] && !prefs19["42"].tz);

  // 20) tz:<unknown> answers invalid, writes nothing
  const env20 = freshEnv();
  await env20.STATE.put(CONFIG.KV_USER_PREFS, JSON.stringify({ "42": { lang: "fa" } }));
  await cbHandler(env20, { callback_query: { id: "cb20", data: "tz:atlantis", from: { id: 42 }, message: { chat: { id: 42 }, message_id: 103 } } });
  const prefs20 = await env20.STATE.get(CONFIG.KV_USER_PREFS, "json");
  check("tz:atlantis writes no tz", prefs20 && prefs20["42"] && !prefs20["42"].tz);
  check("tz:atlantis answers invalid", /\u0646\u0627\u0645\u0639\u062A\u0628\u0631|Unknown/.test(answered[0].text));

  // 21) /timezone no-arg now offers the tappable quick-picks
  const env21 = freshEnv();
  await msgHandler("/timezone", 42, env21);
  const tzMsg = sent[sent.length - 1];
  check("/timezone shows current tz (regression)", /\u0645\u0646\u0637\u0642\u0647 \u0632\u0645\u0627\u0646\u06CC|timezone/i.test(tzMsg.msg));
  check("/timezone sends the tz quick-pick grid",
    tzMsg.keyboard && tzMsg.keyboard.inline_keyboard &&
    (tzMsg.keyboard.inline_keyboard || []).flat().some((b) => b.callback_data === "tz:tehran") &&
    (tzMsg.keyboard.inline_keyboard || []).flat().some((b) => b.callback_data === "tz:reset"));

  // 22) the real replyKeyboard carries a Timezone button and normalizeCommand maps it
  const rkSrc = src.slice(src.indexOf("function replyKeyboard(lang)"), src.indexOf("// Normalize button labels"));
  const ncSrc = src.slice(src.indexOf("function normalizeCommand(text)"), src.indexOf("// v13.49-buttons: shared message builders"));
  const rkFn = eval("(function () {" + rkSrc + " return replyKeyboard; })()");
  const ncFn = eval("(function () {" + ncSrc + " return normalizeCommand; })()");
  check("replyKeyboard has a Timezone button (fa+en)", /Timezone/.test(JSON.stringify(rkFn("en"))) && /\u0632\u0645\u0627\u0646/.test(rkFn("fa").keyboard.map((r) => r.map((b) => b.text).join(",")).join(",")) || /\u0632\u0645\u0627\u0646/.test(JSON.stringify(rkFn("fa"))));
  check("normalizeCommand maps the Timezone labels", ncFn("Timezone") === "/timezone" && ncFn("\u0632\u0645\u0627\u0646") === "/timezone");


  // ---- v13.90-tzonboard: the region picker, the onboarding, and the
  // select+confirm step (behavioral, against the real sliced builders) ----
  // 23) lang pick for a user who ALREADY has a tz never re-prompts (no nag)
  const env23 = freshEnv();
  await env23.STATE.put(CONFIG.KV_USERS_KEY, JSON.stringify([42]));
  await env23.STATE.put(CONFIG.KV_USER_PREFS, JSON.stringify({ "42": { lang: "fa", tz: "Australia/Sydney" } }));
  await cbHandler(env23, { callback_query: { id: "cb23", data: "lang:fa", from: { id: 42 }, message: { chat: { id: 42 } } } });
  check("lang:fa with tz set sends welcome ONLY (no tz nag)", sent.length === 1 && /\u062E\u0648\u0634 \u0622\u0645\u062F\u06CC\u062F/.test(sent[0].msg));

  // 24) /start returning member WITH a tz: ack only, no prompt
  const env24 = freshEnv();
  await env24.STATE.put(CONFIG.KV_USERS_KEY, JSON.stringify([42]));
  await env24.STATE.put(CONFIG.KV_USER_PREFS, JSON.stringify({ "42": { lang: "en", tz: "Europe/London" } }));
  await msgHandler("/start", 42, env24);
  check("/start (member with tz) sends ack only, no tz prompt", sent.length === 1 && /already joined/i.test(sent[0].msg));

  // 25) tzr:oceania renders the region page: city buttons with live times,
  //     back-to-hub row, and the \u2705 mark on the already-set zone
  const env25 = freshEnv();
  await env25.STATE.put(CONFIG.KV_USER_PREFS, JSON.stringify({ "42": { lang: "en", tz: "Australia/Perth" } }));
  await cbHandler(env25, { callback_query: { id: "cb25", data: "tzr:oceania", from: { id: 42 }, message: { chat: { id: 42 }, message_id: 201 } } });
  const flat25 = (edited[0] && edited[0].kb.inline_keyboard || []).flat();
  check("tzr:oceania edits the message in place", edited.length === 1 && edited[0].msgId === 201);
  check("tzr:oceania shows city buttons (Perth \u2705-marked)",
    flat25.some((b) => b.callback_data === "tz:perth" && /^\u2705/.test(b.text)) &&
    flat25.some((b) => b.callback_data === "tz:sydney") &&
    flat25.some((b) => b.callback_data === "tz:auckland"));
  check("tzr:oceania city buttons carry live local times",
    flat25.filter((b) => /^tz:/.test(b.callback_data)).every((b) => /\u00B7 \d\d:\d\d/.test(b.text)));
  check("tzr:oceania has the back-to-hub row", flat25.some((b) => b.callback_data === "tzr:hub"));

  // 26) tzr:hub returns to the status + hub
  await cbHandler(env25, { callback_query: { id: "cb26", data: "tzr:hub", from: { id: 42 }, message: { chat: { id: 42 }, message_id: 201 } } });
  const flat26 = (edited[1] && edited[1].kb.inline_keyboard || []).flat();
  check("tzr:hub returns to status + hub", edited.length === 2 &&
    /Australia\/Perth/.test(edited[1].text) &&
    flat26.some((b) => b.callback_data === "tz:tehran") &&
    flat26.some((b) => b.callback_data === "tzr:eu") &&
    flat26.some((b) => b.callback_data === "tz:reset"));

  // 27) tzr:<unknown> fails closed to the hub (no crash, no empty keyboard)
  await cbHandler(env25, { callback_query: { id: "cb27", data: "tzr:atlantis", from: { id: 42 }, message: { chat: { id: 42 }, message_id: 201 } } });
  check("tzr:atlantis fails closed to the hub", edited.length === 3 &&
    (edited[2].kb.inline_keyboard || []).flat().some((b) => b.callback_data === "tz:tehran"));

  // 28) tz:sydney selects + the confirm view; tzok finalizes with no keyboard
  const env28 = freshEnv();
  await env28.STATE.put(CONFIG.KV_USER_PREFS, JSON.stringify({ "42": { lang: "en" } }));
  await cbHandler(env28, { callback_query: { id: "cb28", data: "tz:sydney", from: { id: 42 }, message: { chat: { id: 42 }, message_id: 202 } } });
  const prefs28 = await env28.STATE.get(CONFIG.KV_USER_PREFS, "json");
  check("tz:sydney writes tz=Australia/Sydney (write-first)", prefs28 && prefs28["42"] && prefs28["42"].tz === "Australia/Sydney");
  check("tz:sydney confirm view shows the local time + UTC offset",
    /Australia\/Sydney/.test(edited[0].text) && /UTC[+-]\d/.test(edited[0].text) && /\d\d:\d\d/.test(edited[0].text));
  await cbHandler(env28, { callback_query: { id: "cb29", data: "tzok", from: { id: 42 }, message: { chat: { id: 42 }, message_id: 202 } } });
  check("tzok edits to the done text with buttons removed", edited.length === 2 &&
    /All set/.test(edited[1].text) &&
    (!edited[1].kb || (edited[1].kb.inline_keyboard || []).length === 0));

  // 29) the REAL tz helpers (brace-sliced from the concatenated source, with
  //     the REAL toFaDigits — not the identity stub)
  function sliceFn(name) {
    const start = src.indexOf("function " + name + "(");
    if (start < 0) return null;
    let depth = 0, began = false;
    for (let j = src.indexOf("{", start); j < src.length; j++) {
      if (src[j] === "{") { depth++; began = true; }
      else if (src[j] === "}") { depth--; if (began && depth === 0) return src.slice(start, j + 1); }
    }
    return null;
  }
  const realFa = sliceFn("toFaDigits");
  const realEsc = sliceFn("escapeMarkdownCharacters");
  check("real toFaDigits found in the concat source", !!realFa);
  check("real escapeMarkdownCharacters found in the concat source", !!realEsc);
  if (realFa && realEsc) {
    const realFaFn = eval("(" + realFa + ")");
    const tzSegStart = src.indexOf("// tzStatusText (v13.90-tzonboard): the /timezone reply");
    const tzSegEnd = src.indexOf("// ===== src/bot.ts =====");
    check("TZ_REGIONS segment found in the concat source", tzSegStart >= 0 && tzSegEnd > tzSegStart);
    if (tzSegStart >= 0 && tzSegEnd > tzSegStart) {
      // swap in the REAL toFaDigits for this eval only
      // install the REAL toFaDigits + escapeMarkdownCharacters for the eval
      // AND the assertions below (the texts resolve them at CALL time;
      // restoring early would silently test the identity stubs instead)
      const prevFa = globalThis.toFaDigits;
      const prevEsc = globalThis.escapeMarkdownCharacters;
      globalThis.toFaDigits = realFaFn;
      globalThis.escapeMarkdownCharacters = eval("(" + realEsc + ")");
      const tzApi = eval("(function () { " + src.slice(tzSegStart, tzSegEnd) + " return { TZ_REGIONS, tzLocalTime, tzUtcOffset, tzOnboardText, tzConfirmText, tzDoneText, tzRegionText, tzStatusText }; })()");
      check("tzUtcOffset Tehran = UTC+3:30 (stable, no DST)", tzApi.tzUtcOffset("Asia/Tehran") === "UTC+3:30");
      check("tzUtcOffset Tokyo = UTC+9", tzApi.tzUtcOffset("Asia/Tokyo") === "UTC+9");
      check("tzUtcOffset Kathmandu = UTC+5:45 (quarter-hour zone)", tzApi.tzUtcOffset("Asia/Kathmandu") === "UTC+5:45");
      check("tzUtcOffset invalid tz fails closed to empty", tzApi.tzUtcOffset("Not/AZone") === "");
      check("tzLocalTime fa renders Persian digits", /^[\u06F0-\u06F9]{2}:[\u06F0-\u06F9]{2}$/.test(tzApi.tzLocalTime("Asia/Tehran", "fa")));
      check("tzLocalTime en renders latin digits", /^\d\d:\d\d$/.test(tzApi.tzLocalTime("Asia/Tehran", "en")));
      // TZ_REGIONS integrity: every city slug resolves (via the REAL
      // resolveTimeZone + TZ_ALIASES) to the canonical tz stored in the row
      const aliasStart = src.indexOf("var TZ_ALIASES = {");
      const aliasEnd = src.indexOf("function getUserTz");
      const aliasApi = eval("(function () { " + src.slice(aliasStart, aliasEnd) + " return resolveTimeZone; })()");
      let badSlugs = [];
      let badCharsets = [];
      let cities = 0;
      for (const rk of Object.keys(tzApi.TZ_REGIONS)) {
        for (const row of tzApi.TZ_REGIONS[rk]) {
          cities++;
          if (aliasApi(row[2]) !== row[3]) badSlugs.push(row[2]);
          if (!/^[a-z0-9\-]+$/.test(row[2])) badCharsets.push(row[2]);
        }
      }
      check("TZ_REGIONS: every slug resolves to its canonical tz (" + cities + " cities)", badSlugs.length === 0);
      check("TZ_REGIONS: every slug is Telegram callback-safe ([a-z0-9-])", badCharsets.length === 0);
      // MarkdownV2 discipline on the new literals — v13.106 entity-aware:
      // the tz texts now carry INTENTIONAL code spans (the live local time
      // renders monospace), so "clean" means "parses under the shared
      // entity-aware validator" (outside code spans every reserved char
      // must still be escaped — the v13.90 rule, unchanged in spirit).
      const { mdv2Safe, mdv2Entities: mdv2Ent } = require("./lib/mdv2");
      const mdTexts = [tzApi.tzOnboardText("fa"), tzApi.tzOnboardText("en"), tzApi.tzRegionText("fa"), tzApi.tzRegionText("en"), tzApi.tzConfirmText("fa", "Europe/London"), tzApi.tzConfirmText("en", "Europe/London"), tzApi.tzDoneText("fa", "Europe/London"), tzApi.tzDoneText("en", "Europe/London"), tzApi.tzStatusText("fa", "Europe/London"), tzApi.tzStatusText("en", "Europe/London"), tzApi.tzConfirmText("fa", "Asia/Tehran"), tzApi.tzConfirmText("en", "Australia/Sydney")];
      const mdClean = mdTexts.every((t) => mdv2Safe(t));
      check("v13.90 tz texts are MarkdownV2-clean (escaped punctuation)", mdClean);
      // v13.106-mdstyle: the local time renders as a MONOSPACE code span
      check("tz texts carry the live local time as a code span (v13.106)", mdv2Ent(tzApi.tzStatusText("fa", "Asia/Tehran")).code.length === 1 && mdv2Ent(tzApi.tzConfirmText("en", "Europe/London")).code.length === 1);
      globalThis.toFaDigits = prevFa;
      globalThis.escapeMarkdownCharacters = prevEsc;
    }
  }

  // ---- v13.91-tzquota: honest failure when the prefs save throws (the
  // observed live cause: KV daily-quota exhaustion). Never a confirm view
  // for a tz that was NOT persisted; never a silent hanging spinner. ----
  // 30) tz:<city> callback with a throwing put -> retry-later toast, no edit
  const env30 = freshEnv();
  await env30.STATE.put(CONFIG.KV_USER_PREFS, JSON.stringify({ "42": { lang: "fa" } }));
  env30.STATE.put = async () => { throw new Error("KV put() limit exceeded for the day."); };
  await cbHandler(env30, { callback_query: { id: "cb30", data: "tz:sydney", from: { id: 42 }, message: { chat: { id: 42 }, message_id: 300 } } });
  check("tz:sydney quota-failure answers retry-later (fa)", answered.length === 1 && /\u0630\u062E\u06CC\u0631\u0647 \u0646\u0634\u062F/.test(answered[0].text));
  check("tz:sydney quota-failure sends NO confirm edit", edited.length === 0);

  // 31) /timezone <city> with a throwing put -> honest warning message
  const env31 = freshEnv();
  await env31.STATE.put(CONFIG.KV_USER_PREFS, JSON.stringify({ "42": { lang: "fa" } }));
  env31.STATE.put = async () => { throw new Error("KV put() limit exceeded for the day."); };
  await msgHandler("/timezone sydney", 42, env31);
  check("/timezone sydney quota-failure warns the user", /\u0630\u062E\u06CC\u0631\u0647 \u0646\u0634\u062F/.test(sent[sent.length - 1].msg));
  check("/timezone sydney quota-failure does NOT claim success", !/\u062A\u063A\u06CC\u06CC\u0631 \u06A9\u0631\u062F|Timezone set/.test(sent[sent.length - 1].msg));

  console.log(failed ? failed + " FAILURES" : "bot edges OK");
  process.exit(failed ? 1 : 0);
})();
