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

  console.log(failed ? failed + " FAILURES" : "join flow OK");
  process.exit(failed ? 1 : 0);
})();
