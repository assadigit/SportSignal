// Self-check: the Telegram onboarding / join flow — the actual webhook command
// handler extracted from src/worker.ts (single source of truth). Asserts every
// command a new fan uses to join & configure the bot works against a fake KV:
//   /start  → registers a fresh chatId (idempotent; no dup on re-start)
//   /teams  → numbered selection list is sent
//   /follow all → clears the user's prefs (back to follow-everything)
//   /follow 1,3 → selects exactly those team numbers
//   /follow <invalid> → rejected, no prefs written
//   /stop   → removes the chatId from registered users
//   <unknown> → friendly "unknown command" reply
//
// The handler block is sliced verbatim out of worker.ts, so if a maintainer
// changes the join logic, this gate fails until the assertions are updated too.
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


// --- Extract the webhook command chain (in-memory source of truth) ---
const start = src.indexOf('if (text === "/start") {');
const end = src.indexOf('} catch (error) {', start); // end of handleTelegramUpdate
if (start < 0 || end < 0) {
  console.error("FAIL: join command chain not found in worker source");
  process.exit(1);
}
const chain = src.slice(start, end).replace(/\n\s*$/, "");

// v13.92-d1userstore: the join commands now write through the REAL
// user-data seam — slice the module in so these tests exercise the actual
// register/remove/save code (legacy KV mode: the mock env carries no
// USERS_DB binding).
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
// v13.71-admintools: the command chain now pages the owner on join/leave —
// capture stubs keep `sent` user-facing only (the existing count assertions
// stay meaningful) while recording the page calls for the new assertions.
let adminPages = [];
globalThis.CONFIG = CONFIG;
globalThis.masterTeamList = () => STUB_TEAMS;
globalThis.normalizeTeamName = (n) => String(n);
globalThis.translateTeam = (n) => String(n);
globalThis.escapeMarkdownCharacters = (s) => String(s);
globalThis.toFaDigits = (s) => String(s);
globalThis.replyKeyboard = (lang) => ({ keyboard: [], resize_keyboard: true });
globalThis.sendTelegram = async (_env, msg, id) => { sent.push({ msg, id }); return true; };
globalThis.getRegisteredChats = async (env) => {
  const raw = await env.STATE.get(CONFIG.KV_USERS_KEY);
  if (!raw) return [];
  const p = JSON.parse(raw);
  return Array.isArray(p) ? p : [];
};
globalThis.getUserPrefs = async (env) => (await env.STATE.get(CONFIG.KV_USER_PREFS, "json")) || {};
globalThis.notifyAdminUserJoined = async (env, chatId, total) => { adminPages.push({ type: "join", chatId, total }); };
globalThis.notifyAdminUserLeft = async (env, chatId, total) => { adminPages.push({ type: "left", chatId, total }); };

// v13.49-buttons: the /teams reply now uses the real grid builders — slice
// them into the eval so the extraction stays faithful to shipped code.
const bldStart = src.indexOf("// v13.49-buttons: shared message builders");
const bldEnd = src.indexOf("async function handleTelegramUpdate");
if (bldStart < 0 || bldEnd < 0 || bldEnd < bldStart) {
  console.error("FAIL: builders block not found in worker source");
  process.exit(1);
}
const buildersSrc = src.slice(bldStart, bldEnd);
const handler = new Function("text", "chatId", "env", "return (async () => { " + buildersSrc + "\n" + userStoreSrc + "\n" + chain + "\n })();");

function freshEnv() {
  sent = [];
  adminPages = [];
  return { STATE: makeStore(), BOT_TOKEN: "test", CHAT_ID: "0", TEHRAN_TZ: "Asia/Tehran" };
}

let failed = 0;
const check = (name, cond) => {
  console.log((cond ? "OK   " : "FAIL ") + name);
  if (!cond) failed++;
};

(async () => {
  // 1) /start registers a brand-new user (chatId 42, not the owner).
  // v13.92-d1userstore: the real seam runs now (was a stub) — a fresh
  // registry SEEDS with the [CHAT_ID] admin exactly like the old
  // getRegisteredChats fallback did, so the roster is [0, 42].
  const env = freshEnv();
  await handler("/start", 42, env);
  let users = await env.STATE.get(CONFIG.KV_USERS_KEY);
  check("/start registers a fresh chatId (with the [CHAT_ID] seed)", users && users.includes(42) && JSON.parse(users).length === 2 && JSON.parse(users)[0] === 0);
  // v13.71-admintools: the owner is paged exactly once for the NEW join
  check("/start (new join) pages the owner once", adminPages.length === 1 && adminPages[0].type === "join" && adminPages[0].chatId === 42 && adminPages[0].total === 2);

  // 2) /start is idempotent — re-starting must not duplicate the user
  await handler("/start", 42, env);
  users = await env.STATE.get(CONFIG.KV_USERS_KEY);
  check("/start is idempotent (no duplicate on re-start)", JSON.parse(users).filter((c) => c === 42).length === 1);
  check("/start sends a welcome message", sent.length === 2 && sent.every((s) => s.id === 42));
  check("re-start does NOT re-page the owner (already joined)", adminPages.length === 1);

  // 3) /teams sends a numbered selection list
  await handler("/teams", 42, env);
  const teamsMsg = sent[sent.length - 1].msg;
  check("/teams lists numbered teams", /1\\./.test(teamsMsg) && /2\\./.test(teamsMsg) && /3\\./.test(teamsMsg));

  // 4) /follow all clears prefs → back to follow-everything (no entry)
  await handler("/follow all", 42, env);
  let prefs = await env.STATE.get(CONFIG.KV_USER_PREFS, "json");
  check("/follow all clears the user's prefs", !prefs || !prefs["42"]);

  // 5) /follow 1,3 selects exactly those teams
  await handler("/follow 1,3", 42, env);
  prefs = await env.STATE.get(CONFIG.KV_USER_PREFS, "json");
  const picked = prefs["42"].teams;
  check("/follow 1,3 sets exactly teams 1 and 3", picked.length === 2 && picked[0] === "Alpha FC" && picked[1] === "Gamma United");

  // 6) invalid numbers are rejected and no prefs are written
  await handler("/follow 99", 42, env);
  prefs = await env.STATE.get(CONFIG.KV_USER_PREFS, "json");
  check("/follow <invalid> writes no prefs", (!prefs || !prefs["42"] || prefs["42"].teams.length === 2));
  check("/follow <invalid> sends a warning", /نا‌معتبر|نامعتبر/.test(sent[sent.length - 1].msg));

  // 7) /stop removes the chatId from registered users (the [CHAT_ID] seed
  // member survives — the admin was never removable by a user's /stop).
  await handler("/stop", 42, env);
  users = await env.STATE.get(CONFIG.KV_USERS_KEY);
  check("/stop removes the chatId (seed member survives)", users && JSON.parse(users).length === 1 && JSON.parse(users)[0] === 0);
  // v13.71-admintools: a member's /stop pages the owner (leave signal)
  const leftEnv = freshEnv();
  await handler("/start", 42, leftEnv);
  adminPages = [];
  await handler("/stop", 42, leftEnv);
  check("/stop (member) pages the owner with the leave signal", adminPages.length === 1 && adminPages[0].type === "left" && adminPages[0].chatId === 42);
  const strangerEnv = freshEnv();
  adminPages = [];
  await handler("/stop", 555, strangerEnv);
  check("/stop (stranger, never a member) does NOT page the owner", adminPages.length === 0);

  // 8) unknown command gets a friendly reply
  await handler("/wibble", 42, freshEnv());
  check("<unknown command> replies (not silent)", /ناشناخته/.test(sent[sent.length - 1].msg));

  // =====================================================================
  // v13.102-referral: the WELCOME content + the full language-tap join
  // path, through the REAL users.ts strings and the REAL bot.ts callback
  // block (both sliced verbatim from the concat).
  // =====================================================================

  // --- MarkdownV2 parse-safety (v13.106-mdstyle): the SHARED entity-aware
  // validator. The old blanket no-markup rule was complete only while the
  // welcome carried zero entities; the welcome title is BOLD now, so the
  // gate models the entity set instead (same discipline as check-admin /
  // check-mdstyle: outside code spans every reserved char must be escaped).
  const { mdv2Safe, mdv2Entities } = require("./lib/mdv2");

  // 9) the REAL BOT_STRINGS + botStr (sliced from users.ts)
  const bsStart = src.indexOf("var BOT_STRINGS = {");
  const bsEnd = src.indexOf("function userFollowsMatch", bsStart);
  if (bsStart < 0 || bsEnd < 0) {
    console.error("FAIL: BOT_STRINGS block not found in worker source");
    process.exit(1);
  }
  const botStrApi = new Function("stubs", src.slice(bsStart, bsEnd) + "\n; return { botStr, BOT_STRINGS };")({});
  const faWelcome = botStrApi.botStr("fa", "start_welcome");
  const enWelcome = botStrApi.botStr("en", "start_welcome");
  check("fa welcome keeps the original greeting", faWelcome.includes("به SportSignal خوش آمدید") && faWelcome.includes("اعلام مسابقات مهم را از دست ندهید"));
  check("en welcome keeps the original greeting", enWelcome.includes("Welcome to SportSignal") && enWelcome.includes("Never miss the big matches"));
  // v13.106-mdstyle: the greeting line is the message TITLE - BOLD
  check("fa welcome title is a BOLD entity", mdv2Entities(faWelcome).bold.some((b) => b.includes("\u0628\u0647 SportSignal \u062E\u0648\u0634 \u0622\u0645\u062F\u06CC\u062F")));
  check("en welcome title is a BOLD entity", mdv2Entities(enWelcome).bold.some((b) => b.includes("Welcome to SportSignal")));
  // the referral push: urge + BOTH links (bot + website), fa
  check("fa welcome urges recommending to friends", faWelcome.includes("دوستانی دارید که عاشق فوتبال") && faWelcome.includes("پیشنهاد کنید"));
  check("fa welcome links the BOT (t.me, escaped)", faWelcome.includes("https://t\\.me/SportSignalAlertsBot"));
  check("fa welcome links the WEBSITE (escaped)", faWelcome.includes("football\\.sportsignal\\.ir"));
  // the referral push: en
  check("en welcome urges recommending to friends", enWelcome.includes("football\\-loving friends") && enWelcome.includes("recommend this bot"));
  check("en welcome links the BOT (t.me, escaped)", enWelcome.includes("https://t\\.me/SportSignalAlertsBot"));
  check("en welcome links the WEBSITE (escaped)", enWelcome.includes("football\\.sportsignal\\.ir"));
  // MarkdownV2 safety of every string the join path can send
  check("fa welcome is MarkdownV2-safe (parse-400 guard)", mdv2Safe(faWelcome));
  check("en welcome is MarkdownV2-safe (parse-400 guard)", mdv2Safe(enWelcome));
  check("fa lang_set is MarkdownV2-safe", mdv2Safe(botStrApi.botStr("fa", "lang_set")));
  check("en lang_set is MarkdownV2-safe", mdv2Safe(botStrApi.botStr("en", "lang_set")));
  check("fa welcome mentions BOTH the bot and the site (not just one)", faWelcome.includes("t\\.me/SportSignalAlertsBot") && faWelcome.includes("sportsignal\\.ir"));

  // 10) the REAL language-tap join flow (bot.ts callback block, verbatim)
  const ltStart = src.indexOf('const data = String(cbq.data || "");');
  const ltEnd = src.indexOf("// v13.49-buttons: team-grid callbacks", ltStart);
  if (ltStart < 0 || ltEnd < 0) {
    console.error("FAIL: language-tap callback block not found in worker source");
    process.exit(1);
  }
  // the real builders (replyKeyboard / tzOnboardText / tzPickerKeyboard)
  const buildersApi = new Function(
    "CONFIG", "toFaDigits", "escapeMarkdownCharacters", "normalizeTeamName", "translateTeam",
    buildersSrc + "\n; return { replyKeyboard, tzOnboardText, tzPickerKeyboard };"
  )(CONFIG, (s) => String(s), (s) => String(s), (n) => String(n), (n) => String(n));

  // real registerChat / saveUserPref via the seam eval (same pattern as the
  // command chain above)
  const seamFns = new Function("CONFIG", userStoreSrc + "\n; return { registerChat, saveUserPref };")(CONFIG);
  // setUserLang — mirrors users.ts setUserLang exactly (real saveUserPref
  // through the seam, same field preservation)
  const setUserLangReal = async (env, chatId, lang) => {
    const clean = lang === "en" ? "en" : "fa";
    const cur = (await globalThis.getUserPrefs(env))[String(chatId)] || {};
    return await seamFns.saveUserPref(env, chatId, { teams: cur.teams || [], tz: cur.tz || null, lang: clean });
  };

  // The language-tap runner: REAL botStr + REAL seam (registerChat inside
  // the sliced user-store module) + the REAL bot.ts callback block. String
  // concatenation (not template interpolation) so the slices stay inert
  // data — and no name shadowing between the stubs and the sliced
  // declarations (registerChat comes from the slice, everything else is
  // stubbed because it lives in modules we did not slice).
  const tapSrc = "const CONFIG = stubs.CONFIG;\n"
    + "const setUserLang = stubs.setUserLang;\n"
    + "const answerCallbackQuery = stubs.answerCallbackQuery;\n"
    + "const notifyAdminUserJoined = stubs.notifyAdminUserJoined;\n"
    + "const sendTelegram = stubs.sendTelegram;\n"
    + "const getUserPrefs = stubs.getUserPrefs;\n"
    + "const replyKeyboard = stubs.replyKeyboard;\n"
    + "const tzOnboardText = stubs.tzOnboardText;\n"
    + "const tzPickerKeyboard = stubs.tzPickerKeyboard;\n"
    + src.slice(bsStart, bsEnd) + "\n"
    + userStoreSrc + "\n"
    + "return async function (env, update) {\n"
    + "  const cbq = update && update.callback_query;\n"
    + "  const cbChatId = cbq && cbq.message && cbq.message.chat && cbq.message.chat.id;\n"
    + "  const cbUserId = cbq && cbq.from && cbq.from.id;\n"
    + "  const cbChatId2 = cbChatId || cbUserId;\n"
    + src.slice(ltStart, ltEnd) + "\n"
    + "};\n";
  let tapSent = [];
  let tapAnswers = [];
  let tapAdminPages = [];
  const makeTapEnv = () => ({ STATE: makeStore(), BOT_TOKEN: "test", CHAT_ID: "0", TEHRAN_TZ: "Asia/Tehran" });
  const tap = new Function("stubs", tapSrc)({
    CONFIG,
    setUserLang: setUserLangReal,
    answerCallbackQuery: async (env, id, text) => { tapAnswers.push({ id, text }); },
    notifyAdminUserJoined: async (env, chatId, total) => { tapAdminPages.push({ chatId, total }); },
    sendTelegram: async (env, msg, id, kb) => { tapSent.push({ msg, id, kb }); return true; },
    getUserPrefs: async (env) => (await env.STATE.get(CONFIG.KV_USER_PREFS, "json")) || {},
    replyKeyboard: buildersApi.replyKeyboard,
    tzOnboardText: buildersApi.tzOnboardText,
    tzPickerKeyboard: buildersApi.tzPickerKeyboard,
  });

  const langEnv = makeTapEnv();
  const upd42 = (lang) => ({ update_id: 1, callback_query: { id: "cb1", from: { id: 42 }, data: "lang:" + lang, message: { chat: { id: 42 } } } });
  await tap(langEnv, upd42("fa"));
  check("lang:fa tap sends exactly welcome + tz onboarding (2 messages)", tapSent.length === 2 && tapSent.every((s) => s.id === 42));
  const tapWelcome = tapSent[0].msg;
  check("lang-tap welcome greets in Persian", tapWelcome.includes("زبان ربات فارسی شد"));
  check("lang-tap welcome carries the referral push (fa)", tapWelcome.includes("پیشنهاد کنید") && tapWelcome.includes("https://t\\.me/SportSignalAlertsBot") && tapWelcome.includes("football\\.sportsignal\\.ir"));
  check("lang-tap welcome is MarkdownV2-safe (fa)", mdv2Safe(tapWelcome));
  check("lang-tap welcome attaches the reply keyboard", !!tapSent[0].kb);
  check("lang:fa tap registers the chat (real seam)", (await langEnv.STATE.get(CONFIG.KV_USERS_KEY)).includes(42));
  check("lang:fa tap pages the owner once (join signal)", tapAdminPages.length === 1 && tapAdminPages[0].chatId === 42 && tapAdminPages[0].total === 2);
  check("tz onboarding fires for a tz-less joiner (v13.90 intact)", tapSent[1].msg.includes("منطقه") && !!tapSent[1].kb);
  // the tap answered the callback (dismisses the spinner)
  check("callback_query answered", tapAnswers.length === 1);

  // 11) a user WITH a tz set is never re-nagged by the picker
  const tzEnv = makeTapEnv();
  await tap(tzEnv, upd42("fa"));
  // set the tz directly (the tz: callback path is covered by check-bot-edges;
  // here we only need the prefs state "tz set")
  const p = (await tzEnv.STATE.get(CONFIG.KV_USER_PREFS, "json")) || {};
  p["42"] = { teams: [], tz: "Europe/London", lang: "fa" };
  await tzEnv.STATE.put(CONFIG.KV_USER_PREFS, JSON.stringify(p));
  tapSent = []; tapAnswers = []; tapAdminPages = [];
  await tap(tzEnv, upd42("en"));
  check("tz-set user re-taps lang: NO tz onboarding again", tapSent.length === 1);
  check("tz-set user re-tap welcome carries the referral push (en)", tapSent[0].msg.includes("recommend this bot") && tapSent[0].msg.includes("https://t\\.me/SportSignalAlertsBot"));
  check("re-tap (already registered) does NOT re-page the owner", tapAdminPages.length === 0);

  console.log(failed ? failed + " FAILURES" : "join flow OK");
  process.exit(failed ? 1 : 0);
})();
