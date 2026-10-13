// Self-check: the v13.71-admintools Telegram admin toolbelt.
//
// Two layers:
//   1) SOURCE assertions — the admin commands are wired BEFORE the generic
//      unknown-command fallback, the isAdminChat gate precedes every send,
//      the adm: callbacks are gated, the broadcast body is escaped + capped,
//      fan-out is sequential (pacing-friendly), and the join/leave pagers
//      never page the admin himself and never throw.
//   2) BEHAVIORAL proofs — the REAL src/admin-bot.ts module + the REAL
//      command/callback chains from bot.ts are eval'd against a fake KV and
//      captured sends: non-admin denial, admin roster/status/broadcast,
//      join/leave pages, dead-chat accounting, and the fail-closed
//      unparseable-CHAT_ID shape.
const fs = require("fs");
const src = require("./lib/worker-src")();

let failed = 0;
const check = (name, cond) => {
  console.log((cond ? "OK   " : "FAIL ") + name);
  if (!cond) failed++;
};

// ---------- 1) source-level assertions ----------
const adminBranch = src.indexOf('text === "/admin" || text === "/members"');
const unknownBranch = src.indexOf('text && text.startsWith("/")');
check("admin commands exist in the command chain", adminBranch > 0);
check("admin commands precede the generic unknown-command fallback", adminBranch > 0 && unknownBranch > adminBranch);

const adminBranchSrc = src.slice(adminBranch, unknownBranch);
check("isAdminChat gate precedes any send in the admin branch", adminBranchSrc.indexOf("if (!isAdminChat(env, chatId))") >= 0 && adminBranchSrc.indexOf("if (!isAdminChat(env, chatId))") < adminBranchSrc.indexOf("await sendTelegram"));
check("admin branch exposes the panel, roster, status and broadcast", ["/admin", "/members", "/status"].every((c) => adminBranchSrc.indexOf('"' + c + '"') >= 0) && adminBranchSrc.includes("^\\/broadcast"));
check("broadcast strips the optional @bot suffix", /\/\^\\\/broadcast\(@\\S\+\)\?\\s\*\//.test(adminBranchSrc));

const admb = src.indexOf("const admt = data.match(/^adm:(members|status)$/)");
check("adm: callback handler exists", admb > 0);
check("adm: callback is gated to the owner chat", src.slice(admb, admb + 600).indexOf("if (!isAdminChat(env, cbChatId2))") >= 0);

const mStart = src.indexOf("// ===== src/admin-bot.ts =====");
const mEnd = src.indexOf("// ===== src/", mStart + 10);
check("src/admin-bot.ts is registered in the worker-src order", mStart > 0 && mEnd > mStart);
const modSrc = src.slice(mStart, mEnd);
check("join/leave pagers never page the admin himself", (modSrc.match(/Number\(chatId\) === admin/g) || []).length >= 2);
check("join/leave pagers never throw (a failed page must not break onboarding)", modSrc.indexOf("notifyAdminUserJoined failed") >= 0 && modSrc.indexOf("notifyAdminUserLeft failed") >= 0);
check("broadcast escapes the body (renders verbatim under MarkdownV2)", modSrc.indexOf("escapeMarkdownCharacters(String(body)") >= 0);
check("broadcast caps the raw body (Telegram 4096 limit, escape-safe margin)", modSrc.indexOf(".slice(0, 3500)") >= 0);
check("broadcast fan-out is sequential (paced), not parallel", modSrc.indexOf("for (const c of chats)") >= 0 && modSrc.indexOf("Promise.all") < 0);
check("roster truncates before the Telegram message limit", modSrc.indexOf("3600") >= 0);
check("status card carries the admin-alerts layer verdict", modSrc.indexOf("adminOk") >= 0);

// ---------- 2) behavioral harness ----------
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

const CONFIG = { KV_USERS_KEY: "telegram_users_v6", KV_USER_PREFS: "user_prefs_v1", KV_USER_PROFILES: "user_profiles_v1", KV_OUTBOX: "pending_sends_v1", KV_MATCHES_KEY: "matches_v13_tracked" };
const ADMIN = 777, MEMBER = 42, NEWBIE = 99;
globalThis.CONFIG = CONFIG;
globalThis.VERSION = "13.71-admintools";

// real toFaDigits + escapeMarkdownCharacters (the escaping is behavior we
// assert on — slice the actual utils implementations)
const tdStart = src.indexOf("function toFaDigits");
const tdEnd = src.indexOf("var LOG_VERBOSE");
if (tdStart < 0 || tdEnd < 0 || tdEnd < tdStart) {
  console.error("FAIL: toFaDigits/escapeMarkdownCharacters block not found");
  process.exit(1);
}
const utilsFactory = new Function(src.slice(tdStart, tdEnd) + "\nreturn { toFaDigits, escapeMarkdownCharacters };");
const utils = utilsFactory();
globalThis.toFaDigits = utils.toFaDigits;
globalThis.escapeMarkdownCharacters = utils.escapeMarkdownCharacters;
globalThis.getJalaliDate = (d) => "J" + String(d).slice(0, 10);

const FIXTURE_MEMBERS = [
  { id: ADMIN, username: "alitagram", first_name: "Alitagram", title: null, joined: "2026-01-01T00:00:00Z" },
  { id: MEMBER, username: "alix", first_name: "Ali", title: null, joined: "2026-10-01T00:00:00Z" }
];
globalThis.getBotMembers = async () => ({ count: FIXTURE_MEMBERS.length, backfilled: 0, members: FIXTURE_MEMBERS.slice() });
globalThis.getRegisteredChats = async (env) => {
  const raw = await env.STATE.get(CONFIG.KV_USERS_KEY);
  if (!raw) return [];
  const p = JSON.parse(raw);
  return Array.isArray(p) ? p : [];
};
globalThis.getUserPrefs = async (env) => (await env.STATE.get(CONFIG.KV_USER_PREFS, "json")) || {};
globalThis.getCronStatus = async (env) => {
  const s = await env.STATE.get("cron_status_v1", "json").catch(() => null);
  return s || { heartbeat: "0", last_cron: "0" };
};
let sent = [];
let sendResults = {}; // chatId -> true | "dead" | false (default true)
globalThis.sendTelegram = async (env, msg, id, keyboard) => {
  sent.push({ msg: String(msg), id, keyboard });
  return sendResults[id] !== undefined ? sendResults[id] : true;
};

// the REAL admin-bot module (eval'd — its free identifiers resolve to the
// stubs above at call time)
const adminBotFactory = new Function("return (function() {\n" + modSrc + "\nreturn { isAdminChat, notifyAdminUserJoined, notifyAdminUserLeft, adminPanelText, adminPanelKeyboard, adminMembersMessage, adminStatusMessage, adminBroadcast };\n})();");
const adminBot = adminBotFactory();
Object.assign(globalThis, adminBot);

// stubs for the command/callback chains (same set as the other harnesses)
const STUB_TEAMS = ["Alpha FC", "Beta SC", "Gamma United"];
globalThis.masterTeamList = () => STUB_TEAMS;
globalThis.normalizeTeamName = (n) => String(n);
globalThis.translateTeam = (n) => String(n);
globalThis.translateCompetition = (c) => String(c);
globalThis.replyKeyboard = (lang) => ({ keyboard: [], resize_keyboard: true });
globalThis.normalizeCommand = (text) => text;
let answered = [];
globalThis.answerCallbackQuery = async (env, cbqId, text) => { answered.push({ cbqId, text: String(text || "") }); return true; };
let edited = [];
globalThis.editMessageText = async (env, chatId, msgId, text, kb) => { edited.push({ chatId, msgId, text }); return true; };
globalThis.setUserLang = async () => true;
globalThis.resolveTimeZone = (input) => (String(input).toLowerCase() === "london" ? "Europe/London" : null);

// BOT_STRINGS + botStr (real) — the callback chain's lang branch uses them
const bsStart = src.indexOf("var BOT_STRINGS = {");
const bsEnd = src.indexOf("function userFollowsMatch");
if (bsStart < 0 || bsEnd < 0 || bsEnd < bsStart) {
  console.error("FAIL: BOT_STRINGS/botStr block not found");
  process.exit(1);
}
const botStrSrc = src.slice(bsStart, bsEnd);

// builders (teamsMessageText / teamsGridKeyboard / tzStatusText / tzPickerKeyboard)
const bldStart = src.indexOf("// v13.49-buttons: shared message builders");
const bldEnd = src.indexOf("async function handleTelegramUpdate");
if (bldStart < 0 || bldEnd < 0 || bldEnd < bldStart) {
  console.error("FAIL: builders block not found");
  process.exit(1);
}
const buildersSrc = src.slice(bldStart, bldEnd);

// the message command chain (/start … unknown)
const chainStart = src.indexOf('if (text === "/start") {');
const chainEnd = src.indexOf('} catch (error) {', chainStart);
if (chainStart < 0 || chainEnd < 0) {
  console.error("FAIL: join command chain not found");
  process.exit(1);
}
const chain = src.slice(chainStart, chainEnd).replace(/\n\s*$/, "");
const handler = new Function("text", "chatId", "env", "return (async () => { " + buildersSrc + "\n" + chain + "\n })();");

// the callback_query chain (lang / tf / tz / adm)
const cbStart = src.indexOf("const cbq = update && update.callback_query;");
const cbEnd = src.indexOf("const message = update && update.message;");
if (cbStart < 0 || cbEnd < 0 || cbEnd < cbStart) {
  console.error("FAIL: callback_query block not found");
  process.exit(1);
}
const cbChain = src.slice(cbStart, cbEnd).replace(/\n\s*$/, "");
const cbHandler = new Function("env", "update", "return (async () => { " + botStrSrc + "\n" + buildersSrc + "\n" + cbChain + "\n })();");

function freshEnv(chatId) {
  sent = [];
  answered = [];
  edited = [];
  sendResults = {};
  const env = { STATE: makeStore(), BOT_TOKEN: "test", CHAT_ID: String(chatId), TEHRAN_TZ: "Asia/Tehran" };
  env.STATE.put(CONFIG.KV_USERS_KEY, JSON.stringify([ADMIN, MEMBER]));
  env.STATE.put(CONFIG.KV_USER_PREFS, JSON.stringify({ [String(MEMBER)]: { lang: "fa" }, [String(ADMIN)]: { lang: "fa" } }));
  env.STATE.put(CONFIG.KV_USER_PROFILES, JSON.stringify({
    [String(MEMBER)]: { username: "alix", first_name: "Ali", title: null, joined: "2026-10-01T00:00:00Z" },
    [String(ADMIN)]: { username: "alitagram", first_name: "Alitagram", title: null, joined: "2026-01-01T00:00:00Z" }
  }));
  env.STATE.put("cron_status_v1", JSON.stringify({ heartbeat: String(Date.now()), last_cron: String(Date.now()), kv_writes_day: "100", api_source: "football-data" }));
  return env;
}

(async () => {
  // B1) non-admin /members → denial, no data, nothing to the owner
  let env = freshEnv(ADMIN);
  await handler("/members", MEMBER, env);
  check("non-admin /members is denied (one reply, to the prober)", sent.length === 1 && sent[0].id === MEMBER && /مخصوص مدیر/.test(sent[0].msg));
  check("non-admin /members leaks no roster", !sent.some((s) => String(s.msg).includes(String(ADMIN))));

  // B2) admin /members → the roster (names, ids, count)
  env = freshEnv(ADMIN);
  await handler("/members", ADMIN, env);
  check("admin /members sends the roster to the owner", sent.length === 1 && sent[0].id === ADMIN);
  check("roster lists member names + ids + count", sent[0].msg.includes("Ali") && sent[0].msg.includes("alix") && sent[0].msg.includes(String(MEMBER)) && sent[0].msg.includes("۲"));

  // B3) admin /status → live health card
  env = freshEnv(ADMIN);
  await handler("/status", ADMIN, env);
  check("admin /status sends the health card to the owner", sent.length === 1 && sent[0].id === ADMIN);
  check("status card carries the escaped version + heartbeat line", sent[0].msg.includes("13\\.71\\-admintools") && sent[0].msg.includes("ضربان"));
  check("status verdict is degraded without a pool (pool_age -1)", sent[0].msg.includes("نیازمند بررسی"));
  env = freshEnv(ADMIN);
  await env.STATE.put(CONFIG.KV_MATCHES_KEY, JSON.stringify({ fetchedAt: new Date().toISOString(), matches: [1, 2, 3] }));
  await handler("/status", ADMIN, env);
  check("status verdict is healthy with a fresh pool + counts matches", sent[0].msg.includes("سالم") && sent[0].msg.includes("۳"));

  // B4) /admin panel
  env = freshEnv(ADMIN);
  await handler("/admin", ADMIN, env);
  check("admin /admin sends the panel with quick buttons", sent.length === 1 && sent[0].id === ADMIN && sent[0].keyboard && JSON.stringify(sent[0].keyboard).includes("adm:members") && JSON.stringify(sent[0].keyboard).includes("adm:status"));
  await handler("/admin", MEMBER, env);
  check("non-admin /admin is denied", /مخصوص مدیر/.test(sent[sent.length - 1].msg) && sent[sent.length - 1].id === MEMBER);

  // B5) broadcast happy path — every registered chat gets the body, owner gets the summary
  env = freshEnv(ADMIN);
  await handler("/broadcast سلام به همه", ADMIN, env);
  check("broadcast acks, fans out to every chat, then summarizes", sent.length === 4 && sent[0].id === ADMIN && sent[1].msg.includes("سلام به همه") && sent[2].msg.includes("سلام به همه") && sent[3].id === ADMIN);
  const bodySends = sent.filter((s) => s.msg.includes("سلام به همه")).map((s) => s.id);
  check("broadcast body reached exactly the registered chats", bodySends.length === 2 && bodySends.includes(ADMIN) && bodySends.includes(MEMBER));
  check("broadcast summary reports the sent count", sent[3].msg.includes("ارسال گروهی تمام شد") && sent[3].msg.includes("۲"));

  // B6) broadcast body is escaped (renders verbatim under MarkdownV2)
  env = freshEnv(ADMIN);
  await handler("/broadcast سلام (تست).", ADMIN, env);
  check("broadcast escapes MarkdownV2 specials in the body", sent.some((s) => s.msg.includes("\\(تست\\)")));

  // B7) broadcast without a body → usage, no fan-out
  env = freshEnv(ADMIN);
  await handler("/broadcast", ADMIN, env);
  check("empty /broadcast shows usage and sends nothing", sent.length === 1 && sent[0].msg.includes("استفاده"));
  await handler("/broadcast   ", ADMIN, env);
  check("whitespace-only /broadcast also shows usage", sent.length === 2 && sent[1].msg.includes("استفاده"));
  // a glued "/broadcastX" is NOT a broadcast (word boundary) — it falls
  // through to the unknown-command reply instead of fanning garbage out
  await handler("/broadcasthello", ADMIN, env);
  check("glued /broadcastX is not a broadcast (no fan-out, unknown-command reply)", sent.length === 3 && sent[2].id === ADMIN && /ناشناخته|Unknown/.test(sent[2].msg));

  // B8) non-admin broadcast → denial, no fan-out
  env = freshEnv(ADMIN);
  await handler("/broadcast spam", MEMBER, env);
  check("non-admin /broadcast is denied with zero fan-out", sent.length === 1 && sent[0].id === MEMBER && /مخصوص مدیر/.test(sent[0].msg));

  // B9) dead-chat accounting in the broadcast summary
  env = freshEnv(ADMIN);
  sendResults = { [MEMBER]: "dead" };
  await handler("/broadcast x", ADMIN, env);
  check("broadcast summary counts dead chats", sent[sent.length - 1].msg.includes("چت‌های مرده") && sent[sent.length - 1].msg.includes("۱"));
  env = freshEnv(ADMIN);
  sendResults = { [MEMBER]: false };
  await handler("/broadcast x", ADMIN, env);
  check("broadcast summary counts queued (outbox) sends", sent[sent.length - 1].msg.includes("صف تلاش مجدد") && sent[sent.length - 1].msg.includes("۱"));

  // B10) a NEW member's /start pages the owner with id + count
  env = freshEnv(ADMIN);
  await handler("/start", NEWBIE, env);
  const joinPage = sent.find((s) => s.id === ADMIN && s.msg.includes("عضو جدید"));
  check("new join pages the owner (id + total)", !!joinPage && joinPage.msg.includes(String(NEWBIE)) && joinPage.msg.includes("۳"));
  const registry = JSON.parse(await env.STATE.get(CONFIG.KV_USERS_KEY));
  check("the joining chat IS registered", registry.includes(NEWBIE) && registry.length === 3);

  // B11) the owner's own re-/start never pages himself
  env = freshEnv(ADMIN);
  await handler("/start", ADMIN, env);
  check("owner's /start (already a member) does not page himself", !sent.some((s) => s.msg.includes("عضو جدید")));
  check("owner gets the already-joined ack (v13.68 no-regression)", sent.length === 1 && sent[0].id === ADMIN && /قبلاً|already/i.test(sent[0].msg));

  // B12) direct pager semantics: skip the admin himself, page for others
  env = freshEnv(ADMIN);
  sent = [];
  await adminBot.notifyAdminUserJoined(env, ADMIN, 2);
  check("notifyAdminUserJoined skips the admin himself", sent.length === 0);
  await adminBot.notifyAdminUserJoined(env, MEMBER, 2);
  check("notifyAdminUserJoined pages the owner for another joiner", sent.length === 1 && sent[0].id === ADMIN && sent[0].msg.includes(String(MEMBER)));
  sent = [];
  await adminBot.notifyAdminUserLeft(env, MEMBER, 1);
  check("notifyAdminUserLeft pages the owner", sent.length === 1 && sent[0].id === ADMIN && sent[0].msg.includes("خروج"));

  // B13) member /stop pages the owner with the leave signal
  env = freshEnv(ADMIN);
  await handler("/stop", MEMBER, env);
  const leavePage = sent.find((s) => s.id === ADMIN && s.msg.includes("خروج"));
  check("member /stop pages the owner (leave signal + remaining count)", !!leavePage && leavePage.msg.includes(String(MEMBER)));

  // B14) adm: callbacks — owner served, non-owner denied
  env = freshEnv(ADMIN);
  await cbHandler(env, { callback_query: { id: "cb1", data: "adm:members", from: { id: ADMIN }, message: { chat: { id: ADMIN }, message_id: 5 } } });
  check("adm:members from the owner answers + sends the roster", answered.length === 1 && sent.length === 1 && sent[0].id === ADMIN && sent[0].msg.includes("Ali"));
  await cbHandler(env, { callback_query: { id: "cb2", data: "adm:status", from: { id: ADMIN }, message: { chat: { id: ADMIN }, message_id: 6 } } });
  check("adm:status from the owner sends the health card", sent[sent.length - 1].id === ADMIN && sent[sent.length - 1].msg.includes("ضربان"));
  await cbHandler(env, { callback_query: { id: "cb3", data: "adm:members", from: { id: MEMBER }, message: { chat: { id: MEMBER }, message_id: 7 } } });
  check("adm:members from a non-owner gets the denial toast and NO roster", answered[answered.length - 1].cbqId === "cb3" && answered[answered.length - 1].text.includes("مدیر") && !sent.slice(-1)[0].msg.includes("Ali"));

  // B15) fail-closed: unparseable CHAT_ID — no admin access, no pages
  env = freshEnv("not-a-number");
  await handler("/members", ADMIN, env);
  check("unparseable CHAT_ID: admin commands stay closed", /مخصوص مدیر/.test(sent[sent.length - 1].msg));
  await handler("/start", NEWBIE, env);
  check("unparseable CHAT_ID: joins are not paged anywhere", !sent.some((s) => s.msg.includes("عضو جدید")));

  // B16) the language-picker registration path also pages the owner
  env = freshEnv(ADMIN);
  await env.STATE.put(CONFIG.KV_USERS_KEY, JSON.stringify([ADMIN])); // MEMBER not registered yet
  await cbHandler(env, { callback_query: { id: "cb4", data: "lang:fa", from: { id: MEMBER, first_name: "Ali" }, message: { chat: { id: MEMBER }, message_id: 8 } } });
  check("lang-picker registration pages the owner with the join signal", sent.some((s) => s.id === ADMIN && s.msg.includes("عضو جدید")));

  console.log(failed ? failed + " FAILURES" : "admin toolbelt OK");
  process.exit(failed ? 1 : 0);
})();
