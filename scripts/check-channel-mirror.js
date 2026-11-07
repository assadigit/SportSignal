// Self-check: v13.230-channelbase + v13.231-channelmirror — the Telegram
// Channel Mirror foundation AND the Session-2 family hooks
// (src/channel-mirror.ts, the REAL module sliced whole from the concat — the
// check-userstore pattern) against a mock KV + a mock D1 recognizing exactly
// the channel_posts_v1 statement surface. The program:
// TELEGRAM_CHANNEL_MIRROR_SPEC.md; DISCOVERY §7 is the design under test.
// Everything here is offline/deterministic — no Telegram, no channel.
//
// The matrix (spec PART V §14 mapped to the sessions, prompt items a–f for
// the v13.230 foundation PLUS the Session-2 families):
//   a. disabled state: missing/empty/malformed TELEGRAM_CHANNEL_CHAT_ID ⇒
//      channelDestinations [] and EVERY entry point a no-op BEFORE any
//      KV/D1/subrequest op (the mock stores count every operation);
//   b. claim idempotency: the second claim of the same (dest, event_key)
//      returns false; a different event_key (and a different dest_key)
//      claims fine — one identity cannot enqueue two deliveries;
//   c. D1 failure injection ⇒ claim returns false (fail-closed — no claim,
//      no send, exactly the saveNotifiedMatch law);
//   d. SIM_NOTIFIED_KEY set ⇒ full no-op (the simulate harness must never
//      touch the channel), even when a valid dest is passed explicitly;
//   e. the event-key builders from DISCOVERY §7.2's identity table — pure
//      functions, table-driven (engine types, the -big base-stage collapse,
//      status transitions, digest/dateKey editions, the ISO weekly edition,
//      coronation);
//   f. pause-marker semantics: paused ⇒ the send-path gate is OFF;
//      unpaused on transition; transition-only writes (idempotent re-mark
//      is a no-write); reason sanitization; memo TTL lets an owner-side KV
//      change propagate; a KV read failure fails open WITHOUT poisoning the
//      memo.
// Plus the v13.231 Session-2 matrix (spec PART VI Session 2 acceptance):
//   g. the hook runner (claimChannelPost/sendChannelPost/mirrorChannelPost):
//     claim→send→record lifecycle, outcome classification (sent / dead⇒
//     unreachable+pause / transient⇒failed), never-throws isolation, tick
//     stats, channelEnvFor, appendChannelFooter's duplicate-avoidance table,
//     withChannelCta's identity-when-unset parity (both states);
//   h. the family behavioral matrix — every ✅ family produces exactly ONE
//     channel event per logical occurrence (the engine types, the -big stage
//     collapse, status transitions, the morning/UCL/night Tehran editions,
//     coronation, the weekly burst), against the REAL channel-mirror module
//     + the REAL family functions with stubbed private seams;
//   i. Persian determinism: the channel output is identical regardless of
//     subscriber order/languages/timezones; private output is byte-identical
//     when the channel is unconfigured AND when configured without a public
//     URL (the CTA parity law);
//   j. the ⛔ exclusion matrix: command replies / admin pages / heartbeats /
//     migration / simulate / degradation never reach the channel;
//   k. resources: the fan-out reservation gains exactly +2 when enabled, the
//     exact pre-13.231 cost when not; no new cron triggers; notify.ch rides
//     the completion blob's existing put.
const src = require("./lib/worker-src")();
// v13.232-channelhardening: the REAL-transport + full-worker harness pieces
// (the l/m sections below — the transport/failure matrix through the REAL
// senders + the budget re-measure through the REAL pipeline).
const { makeKV, makeD1: makeMockD1, makeFetchDispatcher } = require("./lib/mock-env");
const createFullWorker = require("./lib/full-worker");

// grabFn — brace-balanced slice (the check-composers.js scanner), for the
// family functions under behavioral test.
function grabFn(sig) {
  const i = src.indexOf(sig);
  if (i < 0) throw new Error("missing " + sig);
  const open = src.indexOf("{", i);
  let depth = 0, j = open;
  let state = 0, tplExprDepth = 0;
  const stack = [];
  while (j < src.length) {
    const ch = src[j], next = src[j + 1] || "";
    if (state === 0) {
      if (ch === "/" && next === "/") { state = 1; j += 2; continue; }
      if (ch === "/" && next === "*") { state = 2; j += 2; continue; }
      if (ch === '"') { stack.push(0); state = 3; j++; continue; }
      if (ch === "'") { stack.push(0); state = 4; j++; continue; }
      if (ch === "`") { stack.push(0); state = 5; j++; continue; }
      if (ch === "{") depth++;
      else if (ch === "}") { depth--; if (depth === 0) break; }
      if (ch === "\\" && next === "u" && src[j + 2] === "{") {
        const end = src.indexOf("}", j + 3);
        if (end > 0) { j = end + 1; continue; }
      }
    } else if (state === 1) { if (ch === "\n") state = 0; }
    else if (state === 2) { if (ch === "*" && next === "/") { state = 0; j += 2; continue; } }
    else if (state === 3) { if (ch === "\\") { j += 2; continue; } if (ch === '"') state = stack.pop(); }
    else if (state === 4) { if (ch === "\\") { j += 2; continue; } if (ch === "'") state = stack.pop(); }
    else if (state === 5) {
      if (ch === "\\") { j += 2; continue; }
      if (ch === "`") { state = stack.pop(); j++; continue; }
      if (ch === "$" && next === "{") { state = 6; tplExprDepth = 1; j += 2; continue; }
    } else if (state === 6) {
      if (ch === "{") tplExprDepth++;
      else if (ch === "}") { tplExprDepth--; if (tplExprDepth === 0) state = 5; }
      else if (ch === '"') { stack.push(6); state = 3; }
      else if (ch === "'") { stack.push(6); state = 4; }
      else if (ch === "`") { stack.push(6); state = 5; }
      else if (ch === "\\") j++;
    }
    j++;
  }
  return src.slice(i, j + 1);
}

// --- slice the REAL channel-mirror module ---
const cmStart = src.indexOf("// ===== src/channel-mirror.ts =====");
const cmEnd = src.indexOf("// ===== src/cup-elim.ts =====");
if (cmStart < 0 || cmEnd < 0 || cmEnd < cmStart) {
  console.error("FAIL: channel-mirror module not found in worker source (harness order regression)");
  process.exit(1);
}
const channelMirrorSrc = src.slice(cmStart, cmEnd);

// --- mock KV with operation counters ---
function makeStore(opts) {
  const o = opts || {};
  const m = new Map();
  if (o.seed) { for (const k of Object.keys(o.seed)) m.set(k, o.seed[k]); } // v13.231: pre-seeded state
  const store = {
    getCount: 0,
    putCount: 0,
    failReads: !!o.failReads,   // mutable on purpose — scenarios flip them mid-test
    failWrites: !!o.failWrites,
    async get(k, arg) {
      store.getCount++;
      if (store.failReads) throw new Error("KV is unreachable");
      const v = m.get(k);
      if (v === undefined) return null;
      if (arg === "json") { try { return JSON.parse(v); } catch (e) { return null; } }
      return v;
    },
    async put(k, v) {
      store.putCount++;
      if (store.failWrites) throw new Error("KV write quota exhausted");
      m.set(k, String(v));
    },
    async delete(k) { m.delete(k); },
    _map: m
  };
  return store;
}

// --- mock D1 (recognizes the exact channel_posts_v1 statement surface) ---
function makeD1(opts) {
  const o = opts || {};
  const t = { channel_posts_v1: new Map() }; // "<dest>\u0000<event>" -> row
  const d1 = {
    _tables: t,
    _prepCount: 0,
    prepare(sql) {
      d1._prepCount++;
      const stmt = {
        _sql: sql,
        bind(...params) {
          return {
            run: async () => exec(sql, params),
            first: async () => exec(sql, params).results[0] || null,
            all: async () => ({ results: exec(sql, params).results })
          };
        },
        run: async () => exec(sql, []),
        first: async () => exec(sql, []).results[0] || null,
        all: async () => ({ results: exec(sql, []).results })
      };
      return stmt;
    }
  };
  function exec(sql, p) {
    const s = String(sql).trim();
    if (o.failWrites && /^(INSERT|DELETE|UPDATE)/i.test(s)) throw new Error("D1 is overloaded");
    if (o.failReads && /^SELECT/i.test(s)) throw new Error("D1 is unreachable");
    if (o.failPrepare) throw new Error("D1 binding is gone");
    if (s.startsWith("INSERT OR IGNORE INTO channel_posts_v1")) {
      const key = p[0] + "\u0000" + p[1];
      if (t.channel_posts_v1.has(key)) return { meta: { changes: 0 } };
      t.channel_posts_v1.set(key, { claimed_at: p[2], sent_at: null, state: "claimed", attempts: 0, last_error: null });
      return { meta: { changes: 1 } };
    }
    if (s.startsWith("UPDATE channel_posts_v1 SET state")) {
      const key = p[3] + "\u0000" + p[4];
      const row = t.channel_posts_v1.get(key);
      if (!row) return { meta: { changes: 0 } };
      row.state = p[0];
      row.attempts = (row.attempts || 0) + 1;
      if (p[0] === "sent") row.sent_at = p[1];
      row.last_error = p[2] != null ? p[2] : null;
      return { meta: { changes: 1 } };
    }
    // v13.232-channelhardening: the health-snapshot SELECTs (the
    // channelHealthSnapshot aggregates + the lazy stuck scan)
    if (s.startsWith("SELECT dest_key, state, COUNT(*)")) {
      const byKey = new Map();
      for (const [k, v] of [...t.channel_posts_v1.entries()]) {
        const dest_key = k.split("\u0000")[0];
        if (!byKey.has(dest_key)) byKey.set(dest_key, new Map());
        const g = byKey.get(dest_key);
        if (!g.has(v.state)) g.set(v.state, { dest_key, state: v.state, n: 0, attempts: 0, oldest: null, last_sent: null });
        const row = g.get(v.state);
        row.n++;
        row.attempts += v.attempts || 0;
        if (row.oldest == null || v.claimed_at < row.oldest) row.oldest = v.claimed_at;
        if (v.sent_at != null && (row.last_sent == null || v.sent_at > row.last_sent)) row.last_sent = v.sent_at;
      }
      return { results: [...byKey.values()].flatMap((g) => [...g.values()]) };
    }
    if (s.startsWith("SELECT dest_key, last_error, claimed_at")) {
      return { results: [...t.channel_posts_v1.entries()]
        .filter(([k, v]) => v.last_error != null)
        .map(([k, v]) => ({ dest_key: k.split("\u0000")[0], last_error: v.last_error, claimed_at: v.claimed_at }))
        .sort((a, b) => b.claimed_at - a.claimed_at) };
    }
    if (s.startsWith("SELECT dest_key, event_key, state, claimed_at, last_error")) {
      return { results: [...t.channel_posts_v1.entries()]
        .filter(([k, v]) => (v.state === "claimed" || v.state === "failed") && v.sent_at == null && v.claimed_at < p[0])
        .map(([k, v]) => ({ dest_key: k.split("\u0000")[0], event_key: k.split("\u0000")[1], state: v.state, claimed_at: v.claimed_at, last_error: v.last_error })) };
    }
    throw new Error("mock D1: unrecognized statement: " + s.slice(0, 80));
  }
  return d1;
}

globalThis.CONFIG = {
  KV_CHANNEL_MIRROR: "channel_mirror_v1",
  // v13.231-channelmirror: the footer constants the module reads at eval time
  CHANNEL_SITE_URL: "https://sportsignal.ir",
  CHANNEL_BOT_URL: "https://t.me/SportSignalAlertsBot",
  // the family eval scopes read these (fanoutReservation / the digest gates)
  SUBREQUEST_FANOUT_CAP: 46,
  KV_MATCHES_KEY: "matches_v13_tracked",
  KV_MATCH_STATUS: "match_status_v1",
  KV_WEEKLY_PAYLOAD: "weekly_tables_payload_v1",
  KV_WEEKLY_CURSOR: "weekly_tables_cursor_v1",
  KV_WEEKLY_TABLES: "weekly_tables_v1",
  WEEKLY_FANOUT_CAP: 44,
  WEEKLY_TABLES: { day: 1, fromMin: 90, toMin: 360 },
  UCL_PREVIEW_LEAD_MS: 6 * 60 * 60 * 1e3,
  UCL_PREVIEW_TAIL_MS: 10 * 60 * 1e3,
  // v13.232-channelhardening: the transport-module constants the REAL
  // telegram.ts senders read (the l section evals that module whole).
  KV_OUTBOX: "pending_sends_v1",
  KV_OUTBOX_MAX: 200,
  TELEGRAM_RETRY_ATTEMPTS: 3,
  TELEGRAM_MIN_SEND_GAP_MS: 0,
  TELEGRAM_PAUSE_WAIT_MAX_MS: 8000,
  TRIAL_FOOTER: "\u0646\u0633\u062E\u0647 \u0622\u0632\u0645\u0627\u06CC\u0634\u06CC\u0648\u0646.",
  ONE_HOUR_MS: 60 * 60 * 1000
};
// the REAL escape (utils.ts) — the channel-mirror module's footer/CTA
// builders close over it (the transform strips its import).
globalThis.escapeMarkdownCharacters = function escapeMarkdownCharacters(text) {
  return text.replace(/([\[\]\(\)~`>#\+\-=|{}\.!_])/g, "\\$1");
};
// v13.234-channelstyle: the REAL mdBold (md.ts) — the channel module's
// stage-badge builder closes over it (the transform strips its import);
// identical to the md.ts implementation (entities wrap ESCAPED inner text,
// the whole reserved set — md.ts's MDV2_RESERVED law).
globalThis.mdBold = function mdBold(text) {
  const RESERVED = "_*[]()~`>#+-=|{}.!\\";
  const RE = new RegExp("[" + RESERVED.replace(/[-\\^\[\]]/g, "\\$&") + "]", "g");
  return "*" + String(text == null ? "" : text).replace(RE, "\\$&") + "*";
};
// v13.232-channelhardening: the transport seams the channel module now
// references at module scope (setChannelDrainHook — the registration
// statement) and inside the pause page (sendTelegram). The unit sections
// (a–k) run against these deterministic stubs; the l section below evals
// the REAL telegram.ts module TOGETHER with the channel module in one
// scope, which re-declares the real senders/registration over these.
let DRAIN_HOOK_FN = null;
globalThis.setChannelDrainHook = function setChannelDrainHook(fn) { DRAIN_HOOK_FN = fn; };
// the REAL toFaDigits (utils.ts) — the /status section's Persian rendering
// closes over it (the module's own import is stripped by the transform).
globalThis.toFaDigits = function toFaDigits(str) {
  const FA_DIGIT_MAP = { "0": "\u06F0", "1": "\u06F1", "2": "\u06F2", "3": "\u06F3", "4": "\u06F4", "5": "\u06F5", "6": "\u06F6", "7": "\u06F7", "8": "\u06F8", "9": "\u06F9" };
  return String(str).replace(/[0-9]/g, (w) => FA_DIGIT_MAP[w] || w);
};
const ADMIN_PAGES = [];
globalThis.sendTelegram = async function sendTelegram(env, text, chatId) {
  ADMIN_PAGES.push({ text: String(text), chatId });
  return true;
};

let failed = 0;
const check = (name, cond) => {
  console.log((cond ? "OK   " : "FAIL ") + name);
  if (!cond) failed++;
};

(async () => {
  // eval the real module once in this scope
  eval(channelMirrorSrc);

  const CHAT_ID = "-1001234567890";
  const URL = "https://t.me/sportsignal_fa";
  const configured = (extra) => Object.assign({ TELEGRAM_CHANNEL_CHAT_ID: CHAT_ID, TELEGRAM_CHANNEL_PUBLIC_URL: URL }, extra || {});

  // ===== a) disabled state: zero ops before the no-op answer =====
  check("a. absent var ⇒ channelDestinations []", channelDestinations({}).length === 0);
  check("a. empty var ⇒ []", channelDestinations({ TELEGRAM_CHANNEL_CHAT_ID: "" }).length === 0);
  check("a. whitespace var ⇒ []", channelDestinations({ TELEGRAM_CHANNEL_CHAT_ID: "   " }).length === 0);
  check("a. garbage var ⇒ [] (a typo is never a channel)", channelDestinations({ TELEGRAM_CHANNEL_CHAT_ID: "not-a-chat-id" }).length === 0);
  check("a. fractional numeric ⇒ []", channelDestinations({ TELEGRAM_CHANNEL_CHAT_ID: "12.5" }).length === 0);
  check("a. too-short @handle ⇒ []", channelDestinations({ TELEGRAM_CHANNEL_CHAT_ID: "@abc" }).length === 0);

  const envOff = { STATE: makeStore(), USERS_DB: makeD1() };
  const gateOff = await channelGate(envOff);
  check("a. gate: unconfigured ⇒ {ok:false, reason:'unconfigured'}", gateOff.ok === false && gateOff.reason === "unconfigured" && gateOff.dests.length === 0);
  check("a. gate spends ZERO KV reads while unconfigured", envOff.STATE.getCount === 0);
  check("a. claim no-ops with ZERO D1 prepares while unconfigured", (await claimChannelEvent(envOff, { key: "fa-football", chatId: CHAT_ID }, "match:x:y")) === false && envOff.USERS_DB._prepCount === 0);
  check("a. recordChannelState no-ops with ZERO D1 prepares while unconfigured", (await recordChannelState(envOff, { key: "fa-football" }, "match:x:y", "sent")) === false && envOff.USERS_DB._prepCount === 0);
  check("a. pausedChannel is never reached while unconfigured (0 KV reads)", envOff.STATE.getCount === 0);

  // ===== destination shape + parsing table =====
  const dests = channelDestinations(configured());
  check("shape: exactly one destination", dests.length === 1);
  const d0 = dests[0];
  check("shape: {key:'fa-football', chatId, publicUrl, locale:'fa', sport:'football', enabled}", d0.key === "fa-football" && d0.chatId === CHAT_ID && d0.publicUrl === URL && d0.locale === "fa" && d0.sport === "football" && d0.enabled === true);
  check("parse: positive numeric chat id accepted", channelDestinations({ TELEGRAM_CHANNEL_CHAT_ID: "12345" })[0].chatId === "12345");
  check("parse: @username accepted as interim value", channelDestinations({ TELEGRAM_CHANNEL_CHAT_ID: "@sportsignal_fa" })[0].chatId === "@sportsignal_fa");
  check("parse: chat id survives surrounding whitespace", channelDestinations({ TELEGRAM_CHANNEL_CHAT_ID: "  " + CHAT_ID + " " })[0].chatId === CHAT_ID);
  check("parse: malformed public URL ⇒ undefined (never a wrong CTA)", channelDestinations({ TELEGRAM_CHANNEL_CHAT_ID: CHAT_ID, TELEGRAM_CHANNEL_PUBLIC_URL: "https://example.com/x" })[0].publicUrl === undefined);
  check("parse: http (not https) t.me link ⇒ undefined", channelDestinations({ TELEGRAM_CHANNEL_CHAT_ID: CHAT_ID, TELEGRAM_CHANNEL_PUBLIC_URL: "http://t.me/x" })[0].publicUrl === undefined);
  check("parse: bare https://t.me/ ⇒ undefined", channelDestinations({ TELEGRAM_CHANNEL_CHAT_ID: CHAT_ID, TELEGRAM_CHANNEL_PUBLIC_URL: "https://t.me/" })[0].publicUrl === undefined);
  check("parse: trailing slash tolerated + trimmed", channelDestinations({ TELEGRAM_CHANNEL_CHAT_ID: CHAT_ID, TELEGRAM_CHANNEL_PUBLIC_URL: URL + "/" })[0].publicUrl === URL);

  // ===== b) claim idempotency (write-first, destination-scoped) =====
  const envC = { STATE: makeStore(), USERS_DB: makeD1(), TELEGRAM_CHANNEL_CHAT_ID: CHAT_ID, TELEGRAM_CHANNEL_PUBLIC_URL: URL };
  const dest = channelDestinations(configured())[0];
  const mk = "Real Madrid CF|FC Barcelona|2026-11-25T20:00";
  check("b. first claim of (dest, event) ⇒ true", (await claimChannelEvent(envC, dest, "match:" + mk + ":match-start")) === true);
  check("b. second claim of the SAME (dest, event) ⇒ false (at-most-once)", (await claimChannelEvent(envC, dest, "match:" + mk + ":match-start")) === false);
  check("b. a different event_key claims fine", (await claimChannelEvent(envC, dest, "match:" + mk + ":result")) === true);
  check("b. a NON-live dest cannot claim through the v1 API (only live destinations claim)", (await claimChannelEvent(envC, { key: "en-football", chatId: "-100999", locale: "en", sport: "football", enabled: true }, "match:" + mk + ":match-start")) === false);
  check("b. the ledger rows are keyed by (dest_key, event_key) — the PK shape channel_posts_v1 enforces", (() => {
    const rows = [...envC.USERS_DB._tables.channel_posts_v1.keys()];
    return rows.every((k) => k.startsWith("fa-football\u0000")) && rows.includes("fa-football\u0000match:" + mk + ":match-start") && rows.includes("fa-football\u0000match:" + mk + ":result");
  })());
  check("b. claim row persisted with state 'claimed', sent_at NULL, attempts 0", (() => {
    const row = envC.USERS_DB._tables.channel_posts_v1.get("fa-football\u0000match:" + mk + ":match-start");
    return !!row && row.state === "claimed" && row.sent_at === null && row.attempts === 0;
  })());
  check("b. malformed eventKey ⇒ false, no D1 op", (await claimChannelEvent(envC, dest, "")) === false && (await claimChannelEvent(envC, dest, null)) === false);
  check("b. dest without key/chatId ⇒ false, no D1 op", (await claimChannelEvent(envC, { locale: "fa" }, "match:x:y")) === false);

  // ===== c) D1 failure injection ⇒ fail-closed =====
  const envW = { STATE: makeStore(), USERS_DB: makeD1({ failWrites: true }), TELEGRAM_CHANNEL_CHAT_ID: CHAT_ID };
  check("c. D1 write failure ⇒ claim false (fail-closed — no claim, no send)", (await claimChannelEvent(envW, dest, "match:" + mk + ":pre-match-3h")) === false);
  check("c. D1 failure left NO row (nothing claimed)", envW.USERS_DB._tables.channel_posts_v1.size === 0);
  const envP = { STATE: makeStore(), USERS_DB: makeD1({ failPrepare: true }), TELEGRAM_CHANNEL_CHAT_ID: CHAT_ID };
  check("c. hard D1 prepare failure ⇒ claim false, never throws", (await claimChannelEvent(envP, dest, "match:" + mk + ":pre-match-3h")) === false);
  const envNoDb = { STATE: makeStore(), TELEGRAM_CHANNEL_CHAT_ID: CHAT_ID };
  check("c. missing USERS_DB binding ⇒ claim false (D1-only by design — never a KV fallback)", (await claimChannelEvent(envNoDb, dest, "match:" + mk + ":pre-match-3h")) === false && envNoDb.STATE.getCount === 0 && envNoDb.STATE.putCount === 0);

  // ===== d) SIM: the simulate harness never touches the channel =====
  const envS = { STATE: makeStore(), USERS_DB: makeD1(), SIM_NOTIFIED_KEY: "sim_notified_v1", TELEGRAM_CHANNEL_CHAT_ID: CHAT_ID, TELEGRAM_CHANNEL_PUBLIC_URL: URL };
  check("d. SIM set ⇒ channelDestinations [] (even fully configured)", channelDestinations(envS).length === 0);
  const gateS = await channelGate(envS);
  check("d. SIM set ⇒ gate {ok:false, reason:'sim'}", gateS.ok === false && gateS.reason === "sim");
  check("d. SIM set ⇒ claim false with a VALID dest passed explicitly, ZERO D1 ops", (await claimChannelEvent(envS, dest, "match:" + mk + ":match-start")) === false && envS.USERS_DB._prepCount === 0);
  check("d. SIM set ⇒ recordChannelState false, ZERO D1 ops", (await recordChannelState(envS, dest, "match:" + mk + ":match-start", "sent")) === false && envS.USERS_DB._prepCount === 0);
  check("d. SIM set ⇒ markChannelPaused false, ZERO KV writes", (await markChannelPaused(envS, "permanent-403")) === false && envS.STATE.putCount === 0);
  check("d. SIM set ⇒ markChannelResumed false, ZERO KV writes", (await markChannelResumed(envS)) === false && envS.STATE.putCount === 0);
  check("d. SIM state left completely untouched", envS.USERS_DB._tables.channel_posts_v1.size === 0 && envS.STATE._map.size === 0);

  // ===== e) event-key builders — the DISCOVERY §7.2 identity table =====
  const KEY_TABLE = [
    // [builder, args, expected]
    [channelEventKeyMatch, [mk, "pre-match-72h"], "match:" + mk + ":pre-match-72h"],
    [channelEventKeyMatch, [mk, "pre-match-24h"], "match:" + mk + ":pre-match-24h"],
    [channelEventKeyMatch, [mk, "pre-match-3h"], "match:" + mk + ":pre-match-3h"],
    [channelEventKeyMatch, [mk, "pre-match-1h"], "match:" + mk + ":pre-match-1h"],
    [channelEventKeyMatch, [mk, "pre-match-5min"], "match:" + mk + ":pre-match-5min"],
    [channelEventKeyMatch, [mk, "match-start"], "match:" + mk + ":match-start"],
    [channelEventKeyMatch, [mk, "result"], "match:" + mk + ":result"],
    // the §7.3 base-stage collapse: -big types share the base stage key
    [channelEventKeyMatch, [mk, "match-start-big"], "match:" + mk + ":match-start"],
    [channelEventKeyMatch, [mk, "result-big"], "match:" + mk + ":result"],
    // status transitions
    [channelEventKeyStatus, [mk, "POSTPONED"], "match:" + mk + ":postponed"],
    [channelEventKeyStatus, [mk, "CANCELLED"], "match:" + mk + ":cancelled"],
    [channelEventKeyStatus, [mk, "PAUSED"], "match:" + mk + ":ht"],
    [channelEventKeyStatus, [mk, "postponed"], "match:" + mk + ":postponed"],
    // digest editions (Tehran dateKey)
    [channelEventKeyDigest, ["morning", "2026-11-25"], "digest:morning:2026-11-25"],
    [channelEventKeyDigest, ["uclnight", "2026-11-25"], "digest:uclnight:2026-11-25"],
    [channelEventKeyDigest, ["night", "2026-11-25"], "digest:night:2026-11-25"],
    // weekly edition (ISO week)
    [channelEventKeyWeekly, ["2026-W48"], "digest:weekly:2026-W48"],
    // coronation
    [channelEventKeyCoronation, ["PL", mk], "coronation:PL:" + mk],
  ];
  for (const [fn, args, expected] of KEY_TABLE) {
    check("e. " + fn.name + "(" + JSON.stringify(args).slice(1, -1) + ") ⇒ " + expected, fn.apply(null, args) === expected);
  }
  // distinct stages stay distinct (never bare matchKey)
  const stages = ["pre-match-72h", "pre-match-24h", "pre-match-3h", "pre-match-1h", "pre-match-5min", "match-start", "result", "match-start-big", "result-big"].map((t) => channelEventKeyMatch(mk, t));
  check("e. the 9 types collapse to exactly 7 distinct keys (the -big pairs fold)", new Set(stages).size === 7);
  // malformed inputs fail closed (null — no key, no claim, no post)
  const NULLS = [
    [channelEventKeyMatch, ["", "match-start"]],
    [channelEventKeyMatch, [mk, ""]],
    [channelEventKeyMatch, [mk, "bogus-type"]],
    [channelEventKeyMatch, [null, "result"]],
    [channelEventKeyStatus, [mk, "IN_PLAY"]],
    [channelEventKeyStatus, [mk, ""]],
    [channelEventKeyStatus, ["", "POSTPONED"]],
    [channelEventKeyDigest, ["weekly", "2026-11-25"]],
    [channelEventKeyDigest, ["morning", "2026-11-5"]],
    [channelEventKeyDigest, ["morning", "not-a-date"]],
    [channelEventKeyDigest, ["", "2026-11-25"]],
    [channelEventKeyWeekly, ["2026-48"]],
    [channelEventKeyWeekly, ["W48"]],
    [channelEventKeyWeekly, [""]],
    [channelEventKeyCoronation, ["", mk]],
    [channelEventKeyCoronation, ["PL", ""]],
  ];
  for (const [fn, args] of NULLS) {
    check("e. " + fn.name + "(" + JSON.stringify(args).slice(1, -1) + ") ⇒ null (fail closed)", fn.apply(null, args) === null);
  }

  // ===== f) pause-marker semantics =====
  const envP1 = { STATE: makeStore(), USERS_DB: makeD1() };
  const gateBefore = await channelGate(configured({ STATE: envP1.STATE, USERS_DB: envP1.USERS_DB }));
  check("f. fresh state ⇒ not paused, gate ok", gateBefore.ok === true && (await pausedChannel(configured({ STATE: envP1.STATE }))) === null);
  check("f. fresh state ⇒ the pause read cost exactly 1 KV read (memoized afterwards)", envP1.STATE.getCount === 1);
  check("f. markChannelPaused writes the transition", (await markChannelPaused(configured({ STATE: envP1.STATE }), "permanent-403")) === true);
  const marker = JSON.parse(envP1.STATE._map.get("channel_mirror_v1"));
  check("f. marker shape {paused:true, reason:'permanent-403', at}", marker.paused === true && marker.reason === "permanent-403" && typeof marker.at === "number");
  const gatePaused = await channelGate(configured({ STATE: envP1.STATE, USERS_DB: envP1.USERS_DB }));
  check("f. paused ⇒ the send-path gate is OFF (reason:'paused')", gatePaused.ok === false && gatePaused.reason === "paused");
  const putsAfterPause = envP1.STATE.putCount;
  check("f. re-marking the SAME reason ⇒ false, no rewrite (transition-only writes)", (await markChannelPaused(configured({ STATE: envP1.STATE }), "permanent-403")) === false && envP1.STATE.putCount === putsAfterPause);
  check("f. re-marking a DIFFERENT reason ⇒ a real transition write", (await markChannelPaused(configured({ STATE: envP1.STATE }), "permanent-400")) === true && envP1.STATE.putCount === putsAfterPause + 1);
  check("f. reason is sanitized (CLASS only — no separators/payload)", JSON.parse(envP1.STATE._map.get("channel_mirror_v1")).reason === "permanent-400");
  {
    const s = makeStore();
    await markChannelPaused({ STATE: s }, "boom; drop table-- x");
    const r = JSON.parse(s._map.get("channel_mirror_v1")).reason;
    check("f. hostile reason sanitized (no ';', no spaces — dashes kept by design)", /^[A-Za-z0-9-]+$/.test(r) && !r.includes(";") && !r.includes(" ") && r === "boomdroptable--x");
  }
  check("f. markChannelResumed writes the un-pause transition", (await markChannelResumed(configured({ STATE: envP1.STATE }))) === true);
  const resumed = JSON.parse(envP1.STATE._map.get("channel_mirror_v1"));
  check("f. resumed marker keeps the breadcrumb {paused:false, reason, resumed_at}", resumed.paused === false && resumed.reason === "permanent-400" && typeof resumed.resumed_at === "number");
  const gateResumed = await channelGate(configured({ STATE: envP1.STATE, USERS_DB: envP1.USERS_DB }));
  check("f. resumed ⇒ the send-path gate is back ON", gateResumed.ok === true);
  const putsAfterResume = envP1.STATE.putCount;
  check("f. resume with no pause marker ⇒ false, no write", (await markChannelResumed({ STATE: makeStore() })) === false);
  check("f. double-resume ⇒ false, no rewrite (already resumed)", (await markChannelResumed(configured({ STATE: envP1.STATE }))) === false && envP1.STATE.putCount === putsAfterResume);

  // memo TTL: an owner-side KV change propagates within the memo window
  {
    const s = makeStore();
    const envM = configured({ STATE: s });
    await pausedChannel(envM); // seeds the memo (absent ⇒ null)
    s._map.set("channel_mirror_v1", JSON.stringify({ paused: true, reason: "owner-side-test", at: 1 })); // owner writes directly
    const stillMemo = await pausedChannel(envM);
    check("f. within the 60s memo window the owner-side change is NOT yet seen", stillMemo === null);
    const realNow = Date.now;
    Date.now = () => realNow() + 61 * 1000; // advance past the TTL
    const afterTtl = await pausedChannel(envM);
    Date.now = realNow;
    check("f. past the memo TTL the owner-side pause IS seen", afterTtl && afterTtl.paused === true && afterTtl.reason === "owner-side-test");
  }
  // KV read failure: fail-open, no memo poisoning
  {
    const s = makeStore({ failReads: true });
    const envR = configured({ STATE: s });
    check("f. KV read failure ⇒ pausedChannel null (fail-open; the D1 claim guards at-most-once)", (await pausedChannel(envR)) === null);
    s.failReads = false;
    s._map.set("channel_mirror_v1", JSON.stringify({ paused: true, reason: "after-outage", at: 1 }));
    check("f. the read failure was NOT memoized — the next call re-reads and sees the pause", (await pausedChannel(envR)) !== null && (await pausedChannel(envR)).reason === "after-outage");
  }
  // a failing pause-marker WRITE never throws into the caller
  {
    const s = makeStore({ failWrites: true });
    let threw = false;
    try { await markChannelPaused({ STATE: s }, "permanent-403"); } catch (e) { threw = true; }
    check("f. pause-marker write failure ⇒ false, never throws", threw === false);
  }

  // ===== recordChannelState telemetry =====
  {
    const envT = { STATE: makeStore(), USERS_DB: makeD1(), TELEGRAM_CHANNEL_CHAT_ID: CHAT_ID };
    const destT = channelDestinations(configured())[0];
    const ek = channelEventKeyMatch(mk, "pre-match-24h");
    await claimChannelEvent(envT, destT, ek);
    check("t. recordChannelState('failed', 'transient') ⇒ true", (await recordChannelState(envT, destT, ek, "failed", "transient")) === true);
    check("t. recordChannelState('sent') ⇒ true + sent_at set + attempts=2", (await recordChannelState(envT, destT, ek, "sent")) === true && (() => {
      const row = envT.USERS_DB._tables.channel_posts_v1.get("fa-football\u0000" + ek);
      return row.state === "sent" && typeof row.sent_at === "number" && row.attempts === 2 && row.last_error === null;
    })());
    await claimChannelEvent(envT, destT, channelEventKeyMatch(mk, "result"));
    const ek2 = channelEventKeyMatch(mk, "result");
    await recordChannelState(envT, destT, ek2, "unreachable", "permanent-403");
    const row2 = envT.USERS_DB._tables.channel_posts_v1.get("fa-football\u0000" + ek2);
    check("t. 'unreachable' state + sanitized error CLASS persisted, sent_at stays NULL", row2.state === "unreachable" && row2.last_error === "permanent-403" && row2.sent_at === null);
    check("t. invalid state ('bogus') ⇒ false, no D1 op", (await recordChannelState(envT, destT, ek, "bogus")) === false);
    const prepBefore = envT.USERS_DB._prepCount;
    let threw = false;
    {
      const d1f = makeD1({ failWrites: true });
      try { await recordChannelState({ USERS_DB: d1f, TELEGRAM_CHANNEL_CHAT_ID: CHAT_ID }, destT, ek, "sent"); } catch (e) { threw = true; }
    }
    check("t. telemetry write failure ⇒ false and NEVER throws (cannot break a send path)", threw === false && envT.USERS_DB._prepCount === prepBefore);
  }
  {
    // the sanitized-errorClass assertion (explicit — no nesting games)
    const d1x = makeD1();
    const e = { USERS_DB: d1x, TELEGRAM_CHANNEL_CHAT_ID: CHAT_ID };
    await claimChannelEvent(e, destT2(), "match:san|itize:match-start");
    await recordChannelState(e, destT2(), "match:san|itize:match-start", "failed", "cla;ss WITH junk--");
    check("t. hostile errorClass sanitized to [A-Za-z0-9-] in the row", d1x._tables.channel_posts_v1.get("fa-football\u0000match:san|itize:match-start").last_error === "classWITHjunk--");
  }

  // ===== the claim + state lifecycle end-to-end on one event =====
  {
    const envL = { STATE: makeStore(), USERS_DB: makeD1(), TELEGRAM_CHANNEL_CHAT_ID: CHAT_ID };
    const destL = channelDestinations(configured())[0];
    const ek = channelEventKeyDigest("night", "2026-11-25");
    const first = await claimChannelEvent(envL, destL, ek);
    await recordChannelState(envL, destL, ek, "sent");
    const again = await claimChannelEvent(envL, destL, ek);
    check("lifecycle: claim → sent → re-claim on a later tick ⇒ false (one delivery per identity)", first === true && again === false);
  }


  // ======================================================================
  // v13.231-channelmirror — SESSION 2: the hook runner, the footer/CTA,
  // the family behavioral matrix, Persian determinism, the exclusion
  // matrix and the resource assertions (spec PART VI Session 2).
  // ======================================================================

  // ===== g) the hook runner + the footer/CTA tables =====
  console.log("\n=== g. the v13.231 hook runner / footer / CTA ===");
  {
    // mirrorChannelPost on an unconfigured env: no claim, no ops.
    const envG = { STATE: makeStore(), USERS_DB: makeD1() };
    const rG = await mirrorChannelPost(envG, "match:x:y:match-start", async () => true);
    check("g. mirrorChannelPost unconfigured ⇒ {ok:false, claimed:false}, ZERO D1 ops", rG.ok === false && rG.claimed === false && envG.USERS_DB._prepCount === 0);

    // claim → sender(true) → row 'sent' + sent_at + stats.s
    const envG2 = { STATE: makeStore(), USERS_DB: makeD1(), TELEGRAM_CHANNEL_CHAT_ID: CHAT_ID, TELEGRAM_CHANNEL_PUBLIC_URL: URL };
    const sentArgs = [];
    const rG2 = await mirrorChannelPost(envG2, "match:aa|bb|2026-11-07T16:00:result", async (chEnv, dest) => { sentArgs.push({ tz: chEnv.TEHRAN_TZ, chatId: dest.chatId }); return true; });
    const rowG2 = envG2.USERS_DB._tables.channel_posts_v1.get("fa-football\u0000match:aa|bb|2026-11-07T16:00:result");
    check("g. claim → send(true) ⇒ ok + row state 'sent' + sent_at set", rG2.ok === true && rG2.claimed === true && rowG2.state === "sent" && typeof rowG2.sent_at === "number");
    check("g. the sender receives the channel env (TEHRAN_TZ pinned to Asia/Tehran) + the live dest", sentArgs.length === 1 && sentArgs[0].tz === "Asia/Tehran" && sentArgs[0].chatId === CHAT_ID);
    check("g. channelEnvFor pins Asia/Tehran and preserves the rest of the env", (() => { const e = channelEnvFor({ TEHRAN_TZ: "Europe/London", BOT_TOKEN: "t", X: 1 }); return e.TEHRAN_TZ === "Asia/Tehran" && e.BOT_TOKEN === "t" && e.X === 1; })());

    // verdict false ⇒ failed/transient
    const envG3 = { STATE: makeStore(), USERS_DB: makeD1(), TELEGRAM_CHANNEL_CHAT_ID: CHAT_ID };
    await mirrorChannelPost(envG3, "match:aa|bb|2026-11-07T16:00:match-start", async () => false);
    check("g. sender false ⇒ row state 'failed' + last_error 'transient'", envG3.USERS_DB._tables.channel_posts_v1.get("fa-football\u0000match:aa|bb|2026-11-07T16:00:match-start").state === "failed");

    // verdict "dead" ⇒ unreachable + PAUSE (the dead-chat class never prunes the channel)
    const envG4 = { STATE: makeStore(), USERS_DB: makeD1(), TELEGRAM_CHANNEL_CHAT_ID: CHAT_ID };
    await mirrorChannelPost(envG4, "match:aa|bb|2026-11-07T16:00:pre-match-1h", async () => "dead");
    const rowG4 = envG4.USERS_DB._tables.channel_posts_v1.get("fa-football\u0000match:aa|bb|2026-11-07T16:00:pre-match-1h");
    const pausedAfter = JSON.parse(envG4.STATE._map.get("channel_mirror_v1"));
    check("g. sender 'dead' ⇒ row 'unreachable' + last_error 'dead-chat' + the pause marker", rowG4.state === "unreachable" && rowG4.last_error === "dead-chat" && pausedAfter.paused === true && pausedAfter.reason === "dead-chat");

    // a sender that THROWS is isolated — the runner never throws into the private path
    const envG5 = { STATE: makeStore(), USERS_DB: makeD1(), TELEGRAM_CHANNEL_CHAT_ID: CHAT_ID };
    let threw = false;
    try { await mirrorChannelPost(envG5, "match:aa|bb|2026-11-07T16:00:pre-match-3h", async () => { throw new Error("boom"); }); } catch (e) { threw = true; }
    check("g. a throwing sender is isolated (never throws into the private path)", threw === false && envG5.USERS_DB._tables.channel_posts_v1.get("fa-football\u0000match:aa|bb|2026-11-07T16:00:pre-match-3h").state === "failed");

    // the tick stats: sent/deferred/skipped/paused counted + reset by take
    const st1 = takeChannelTickStats();
    check("g. tick stats counted the g-section outcomes and takeChannelTickStats resets", st1.s >= 1 && st1.d >= 2 && typeof st1.k === "number" && typeof st1.p === "number");
    const st2 = takeChannelTickStats();
    check("g. a second take reads ZERO (reset semantics — per-tick across isolate reuse)", st2.s === 0 && st2.d === 0 && st2.k === 0 && st2.p === 0);

    // appendChannelFooter — the duplicate-avoidance table
    const NO_LINKS = "plain digest body";
    const f1 = appendChannelFooter(NO_LINKS);
    check("g. footer: no links present ⇒ separator + site + bot lines appended", f1 === NO_LINKS + "\n\n\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n\uD83C\uDF10 \u0633\u0627\u06CC\u062A: https://sportsignal\\.ir\n\uD83E\uDD16 \u0631\u0628\u0627\u062A: https://t\\.me/SportSignalAlertsBot");
    const PROMO = "msg\n\n\\-\\-\\-\\-\\-\\-\n\u0645\u0634\u0627\u0647\u062F\u0647:\nhttps://sportsignal\\.ir";
    const f2 = appendChannelFooter(PROMO);
    check("g. footer: the escaped promo site link counts ⇒ ONLY the bot line rides (no second separator)", f2 === PROMO + "\n\uD83E\uDD16 \u0631\u0628\u0627\u062A: https://t\\.me/SportSignalAlertsBot");
    const BOT_ONLY = "msg with https://t.me/SportSignalAlertsBot already";
    const f3 = appendChannelFooter(BOT_ONLY);
    check("g. footer: bot link already present (raw form) ⇒ only the site line + separator", f3 === BOT_ONLY + "\n\n\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n\uD83C\uDF10 \u0633\u0627\u06CC\u062A: https://sportsignal\\.ir");
    const BOTH = "msg https://sportsignal.ir and https://t.me/SportSignalAlertsBot";
    check("g. footer: both links present ⇒ byte-identical (no duplicate footer elements)", appendChannelFooter(BOTH) === BOTH);
    const FOOTERED = appendChannelFooter(NO_LINKS);
    check("g. footer: idempotent (footering a footered message is a no-op)", appendChannelFooter(FOOTERED) === FOOTERED);
    const LONG = "x".repeat(4090);
    check("g. footer: fail-open at the 4096 ceiling (the withTrialFooter law)", appendChannelFooter(LONG) === LONG);
    check("g. footer: the table-footer subdomain counts as the site link (no duplicate)", appendChannelFooter("table\n\n\u062C\u062F\u0648\u0644 \u06A9\u0627\u0645\u0644: football\\.sportsignal\\.ir") .endsWith("\n\uD83E\uDD16 \u0631\u0628\u0627\u062A: https://t\\.me/SportSignalAlertsBot"));

    // channelStageHead — the v13.234-channelstyle stage badges (the feed
    // needs each countdown post self-explanatory; the old promo CTA is gone
    // from channel copies, the badge is the new opener)
    check("g. badge: pre-match-72h ⇒ \u23F3 bold «\u06F3 \u0631\u0648\u0632 \u062A\u0627 \u0634\u0631\u0648\u0639 \u0628\u0627\u0632\u06CC» + blank line", channelStageHead("pre-match-72h") === "\u23F3 *\u06F3 \u0631\u0648\u0632 \u062A\u0627 \u0634\u0631\u0648\u0639 \u0628\u0627\u0632\u06CC*\n\n");
    check("g. badge: pre-match-24h ⇒ \u23F3 bold «\u06F2\u06F4 \u0633\u0627\u0639\u062A \u062A\u0627 \u0634\u0631\u0648\u0639 \u0628\u0627\u0632\u06CC»", channelStageHead("pre-match-24h") === "\u23F3 *\u06F2\u06F4 \u0633\u0627\u0639\u062A \u062A\u0627 \u0634\u0631\u0648\u0639 \u0628\u0627\u0632\u06CC*\n\n");
    check("g. badge: pre-match-3h ⇒ \u23F3 bold «\u06F3 \u0633\u0627\u0639\u062A \u062A\u0627 \u0634\u0631\u0648\u0639 \u0628\u0627\u0632\u06CC»", channelStageHead("pre-match-3h") === "\u23F3 *\u06F3 \u0633\u0627\u0639\u062A \u062A\u0627 \u0634\u0631\u0648\u0639 \u0628\u0627\u0632\u06CC*\n\n");
    check("g. badge: pre-match-1h ⇒ \u23F3 bold «\u06F1 \u0633\u0627\u0639\u062A \u062A\u0627 \u0634\u0631\u0648\u0639 \u0628\u0627\u0632\u06CC»", channelStageHead("pre-match-1h") === "\u23F3 *\u06F1 \u0633\u0627\u0639\u062A \u062A\u0627 \u0634\u0631\u0648\u0639 \u0628\u0627\u0632\u06CC*\n\n");
    check("g. badge: pre-match-5min ⇒ \u23F3 bold «\u06F5 \u062F\u0642\u06CC\u0642\u0647 \u062A\u0627 \u0634\u0631\u0648\u0639 \u0628\u0627\u0632\u06CC»", channelStageHead("pre-match-5min") === "\u23F3 *\u06F5 \u062F\u0642\u06CC\u0642\u0647 \u062A\u0627 \u0634\u0631\u0648\u0639 \u0628\u0627\u0632\u06CC*\n\n");
    check("g. badge: match-start / result / unknown / null ⇒ the empty string (their formatters carry the headlines)", channelStageHead("match-start") === "" && channelStageHead("result") === "" && channelStageHead("result-big") === "" && channelStageHead("nope") === "" && channelStageHead(null) === "");

    // withChannelCta — the private parity law, both states
    const base = "private message body";
    check("g. CTA: unconfigured ⇒ identity (byte-identical private output)", withChannelCta(base, {}, "fa") === base);
    check("g. CTA: configured chat id but NO public URL ⇒ identity (no CTA without the real URL)", withChannelCta(base, { TELEGRAM_CHANNEL_CHAT_ID: CHAT_ID }, "fa") === base);
    check("g. CTA: malformed public URL ⇒ identity (never a wrong CTA)", withChannelCta(base, { TELEGRAM_CHANNEL_CHAT_ID: CHAT_ID, TELEGRAM_CHANNEL_PUBLIC_URL: "https://example.com/x" }, "fa") === base);
    const ctaFa = withChannelCta(base, configured(), "fa");
    check("g. CTA: configured ⇒ the fa CTA line rides the private message", ctaFa === base + "\n\uD83D\uDCE2 \u06A9\u0627\u0646\u0627\u0644 \u0645\u0627: https://t\\.me/sportsignal\\_fa");
    const ctaEn = withChannelCta(base, configured(), "en");
    check("g. CTA: the en label form", ctaEn === base + "\n\uD83D\uDCE2 Our channel: https://t\\.me/sportsignal\\_fa");
    check("g. CTA: never duplicated (the URL already present in either form)", withChannelCta(ctaFa, configured(), "fa") === ctaFa && withChannelCta(ctaFa.replace(/\\/g, ""), configured(), "fa") === ctaFa.replace(/\\/g, ""));
    check("g. CTA: fail-open at the 4096 ceiling", withChannelCta("x".repeat(4090), configured(), "fa") === "x".repeat(4090));
    check("g. CTA: non-string input passes through untouched", withChannelCta(null, configured(), "fa") === null);
  }

  // ===== shared helpers for the family scopes =====
  const untype = (s) => s.replace(/:\s*(number|string|boolean|any|Date|Map<[^>]*>)(?![.\w])(\[\])?/g, "").replace(/\?([,)])/g, "$1");
  const G = (sig) => untype(grabFn(sig));
  const MD_PIECES = () => [
    (src.match(/var MDV2_RESERVED = "[^"]*";/) || ["FAIL-MDV2-RESERVED"])[0],
    (src.match(/var MDV2_ESCAPE_SRC = [^\n]*;/) || ["FAIL-MDV2-SRC"])[0],
    (src.match(/var MDV2_ESCAPE_RE = [^\n]*;/) || ["FAIL-MDV2-RE"])[0],
    G("function mdEscape(text)"),
    G("function mdBold(text)"),
    G("function mdItalic(text)"),
    G("function mdCode(text)")
  ];
  const JALALI_PIECES = () => [
    (src.match(/var JALALI_MONTHS_FA = \[[\s\S]*?\];/) || ["FAIL-JM"])[0],
    (src.match(/var WEEKDAYS_FA = \[[^\]]*\];/) || ["FAIL-WD"])[0],
    G("function toJalaliParts(gy"),
    G("function jalaliDateFa(y"),
    G("function englishDateYmd(y")
  ];
  const matchKeyStub = (m) => String(m.homeTeam.name).toLowerCase().replace(/\s+/g, "") + "|" + String(m.awayTeam.name).toLowerCase().replace(/\s+/g, "") + "|" + String(m.utcDate || "").slice(0, 16);

  // ===== h1) the ENGINE family: one channel post per (match, type) unit =====
  console.log("\n=== h1. the engine family (sendNotificationIfNeeded) ===");
  await (async () => {
    const CH = []; // channel-destination sends
    const PV = []; // private sends
    async function sendTelegram(env, text, chatId) { (String(chatId) === CHAT_ID ? CH : PV).push({ text, chatId }); return true; }
    async function sendPhotoBinary() { return false; }
    async function sendDice() { return 3; }
    async function renderCardPngCached() { return null; }
    async function cachedCardPng() { return null; }
    async function shouldSendNotification() { return true; }
    async function saveNotifiedMatch() { return true; }
    function specialBanner() { return ""; }
    async function recordDeliveries() { return true; }
    function isBackfillEligible() { return false; }
    function isMatchFinished() { return false; }
    function subrequestCount() { return 0; }
    function kvOpsCount() { return 0; }
    const matchKey = matchKeyStub;
    eval([
      channelMirrorSrc,
      G("function fanoutFetchCost(chatGroups, config, channelEnabled)"),
      G("function fanoutReservation(config, chatGroups, channelEnabled)"),
      ...MD_PIECES(),
      G("function mdItalic(text)"),
      G("async function sendNotificationIfNeeded(match, config, chatGroups, env, counts, notifiedMatches, deadChats, deferred)")
    ].join("\n"));
    const match = { id: "e1", utcDate: new Date(Date.now() + 2 * 36e5).toISOString(), status: "SCHEDULED", competition: { code: "PL" }, homeTeam: { name: "Arsenal FC" }, awayTeam: { name: "Chelsea FC" } };
    const cfg = { type: "pre-match-3h", windowCheck: () => true, messageFormatter: async () => "MATCHTEXT", requiresFuture: true };
    const groupsA = [{ tz: "Asia/Tehran", lang: "fa", chats: [501, 502] }, { tz: "Europe/London", lang: "en", chats: [503] }];
    const groupsB = [{ tz: "Europe/London", lang: "en", chats: [503] }, { tz: "Asia/Tehran", lang: "fa", chats: [502, 501] }];
    const run = (env, groups) => { const counts = { "pre-match-3h": 0 }; return sendNotificationIfNeeded(match, cfg, groups, env, counts, {}, []); };

    // 1. UNCONFIGURED: private only, byte-frozen as the parity baseline
    const envU = { STATE: makeStore(), USERS_DB: makeD1() };
    await run(envU, groupsA);
    check("h1. unconfigured ⇒ ZERO channel sends, ZERO claim rows", CH.length === 0 && envU.USERS_DB._tables.channel_posts_v1.size === 0);
    const baselinePriv = JSON.stringify(PV);

    // 2. CONFIGURED (no public URL): private output byte-identical + ONE channel post
    CH.length = 0; PV.length = 0;
    const envC = { STATE: makeStore(), USERS_DB: makeD1(), TELEGRAM_CHANNEL_CHAT_ID: CHAT_ID };
    await run(envC, groupsA);
    check("h1. configured ⇒ private output BYTE-IDENTICAL (the CTA parity law, unset URL)", JSON.stringify(PV) === baselinePriv);
    check("h1. one fan-out to 3 subscribers (2 groups) ⇒ exactly ONE channel post", CH.length === 1 && CH[0].chatId === CHAT_ID);
    const chTextA = CH[0].text;
    check("h1. the channel copy is the badge + fa/Asia-Tehran composition + the labeled footer block (v13.234-channelstyle)", chTextA === "\u23F3 *\u06F3 \u0633\u0627\u0639\u062A \u062A\u0627 \u0634\u0631\u0648\u0639 \u0628\u0627\u0632\u06CC*\n\nMATCHTEXT" + "\n\n\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n\uD83C\uDF10 \u0633\u0627\u06CC\u062A: https://sportsignal\\.ir\n\uD83E\uDD16 \u0631\u0628\u0627\u062A: https://t\\.me/SportSignalAlertsBot");
    check("h1. no subscriber chat id / username ever leaks into the channel payload", !chTextA.includes("501") && !chTextA.includes("502") && !chTextA.includes("503"));
    check("h1. the claim row recorded 'sent'", envC.USERS_DB._tables.channel_posts_v1.get("fa-football\u0000match:" + matchKey(match) + ":pre-match-3h").state === "sent");

    // 3. repeated tick: the claim no-ops — no duplicate channel post
    CH.length = 0; PV.length = 0;
    await run(envC, groupsA);
    check("h1. repeated tick ⇒ NO second channel post (the D1 claim persists)", CH.length === 0);

    // 4. Persian determinism: reversed subscriber order/langs/tz ⇒ identical channel text
    CH.length = 0;
    const envD = { STATE: makeStore(), USERS_DB: makeD1(), TELEGRAM_CHANNEL_CHAT_ID: CHAT_ID };
    await run(envD, groupsB);
    check("h1. Persian determinism: identical channel output regardless of subscriber order/lang/tz", CH.length === 1 && CH[0].text === chTextA);

    // 5. CONFIGURED + public URL: private messages gain the CTA line; the channel post does NOT
    CH.length = 0; PV.length = 0;
    const envP = { STATE: makeStore(), USERS_DB: makeD1(), TELEGRAM_CHANNEL_CHAT_ID: CHAT_ID, TELEGRAM_CHANNEL_PUBLIC_URL: URL };
    await run(envP, groupsA);
    check("h1. configured + URL ⇒ private messages gain the CTA line (fa and en groups alike)", PV.length === 3 && PV.every((m) => m.text.includes("https://t\\.me/sportsignal\\_fa")) && PV.some((m) => m.text.includes("\u06A9\u0627\u0646\u0627\u0644 \u0645\u0627")) && PV.some((m) => m.text.includes("Our channel")));
    check("h1. the channel post itself carries the FOOTER, never the private CTA", CH.length === 1 && CH[0].text === chTextA);

    // 6. distinct stages on the same match stay separate posts
    CH.length = 0;
    const envS = { STATE: makeStore(), USERS_DB: makeD1(), TELEGRAM_CHANNEL_CHAT_ID: CHAT_ID };
    await run(envS, groupsA);
    const cfgMs = { type: "match-start", windowCheck: () => true, messageFormatter: async () => "KOSTART", requiresFuture: false };
    await sendNotificationIfNeeded(match, cfgMs, groupsA, envS, { "match-start": 0 }, {}, []);
    check("h1. distinct stages (3h + match-start) ⇒ TWO separate channel posts", CH.length === 2);
  })().catch((e) => { console.error("FAIL h1 harness error: " + e.message); failed++; });

  // ===== h2) the -big broadcasts + the stage collapse =====
  console.log("\n=== h2. the big-match broadcasts (the -big stage collapse) ===");
  await (async () => {
    const CH = [];
    async function sendTelegram(env, text, chatId) { if (String(chatId) === CHAT_ID) CH.push({ text, chatId }); return true; }
    async function getRegisteredChats() { return [501]; }
    async function getUserPrefs() { return {}; }
    function userFollowsMatch() { return null; }
    function groupChatsByTz(chatIds) { return [{ tz: "Asia/Tehran", lang: "fa", chats: chatIds }]; }
    function isMasterBigMatch() { return true; }
    function isMatchStartingNow() { return true; }
    function isBotSilentLeague() { return false; }
    async function getNotifiedMatches() { return {}; }
    async function saveNotifiedMatch() { return true; }
    async function shouldSendNotification() { return true; }
    async function recordDeliveries() { return true; }
    function notifiedStoreActive() { return false; }
    function deliveriesActive() { return false; }
    function specialBanner() { return ""; }
    async function formatMatchStartMessage() { return "KOSTART"; }
    async function formatResultMessage() { return "FTTEXT"; }
    function isMatchFinished() { return true; }
    function isWithinPostMatchWindow() { return true; }
    async function renderCardPngCached() { return null; }
    async function cachedCardPng() { return null; }
    async function sendPhotoBinary() { return false; }
    async function sendDice() { return 3; }
    function isBackfillEligible() { return false; }
    function subrequestCount() { return 0; }
    function kvOpsCount() { return 0; }
    const matchKey = matchKeyStub;
    eval([
      channelMirrorSrc,
      G("function fanoutFetchCost(chatGroups, config, channelEnabled)"),
      G("function fanoutReservation(config, chatGroups, channelEnabled)"),
      G("function mdItalic(text)"),
      G("async function sendNotificationIfNeeded(match, config, chatGroups, env, counts, notifiedMatches, deadChats, deferred)"),
      G("async function broadcastBigMatchKickoff(env, matches)"),
      G("async function broadcastBigMatchResults(env, matches)")
    ].join("\n"));
    const bigMatch = { id: "b1", utcDate: new Date().toISOString(), status: "IN_PLAY", competition: { code: "PL" }, homeTeam: { name: "Arsenal FC" }, awayTeam: { name: "Liverpool FC" } };
    const cfgMs = { type: "match-start", windowCheck: () => true, messageFormatter: async () => "KOSTART", requiresFuture: false };

    // 1. the broadcast alone posts exactly once
    const env1 = { STATE: makeStore(), USERS_DB: makeD1(), TELEGRAM_CHANNEL_CHAT_ID: CHAT_ID };
    await broadcastBigMatchKickoff(env1, [bigMatch]);
    check("h2. match-start-big alone ⇒ ONE channel post (text-only, the full footer block)", CH.length === 1 && CH[0].text === "KOSTART" + "\n\n\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n\uD83C\uDF10 \u0633\u0627\u06CC\u062A: https://sportsignal\\.ir\n\uD83E\uDD16 \u0631\u0628\u0627\u062A: https://t\\.me/SportSignalAlertsBot");
    CH.length = 0;
    await broadcastBigMatchKickoff(env1, [bigMatch]);
    check("h2. repeated broadcast tick ⇒ no duplicate", CH.length === 0);

    // 2. THE STAGE COLLAPSE: the engine's match-start already claimed ⇒ the broadcast's claim no-ops
    const env2 = { STATE: makeStore(), USERS_DB: makeD1(), TELEGRAM_CHANNEL_CHAT_ID: CHAT_ID };
    await sendNotificationIfNeeded(bigMatch, cfgMs, [{ tz: "Asia/Tehran", lang: "fa", chats: [501] }], env2, { "match-start": 0 }, {}, []);
    const afterEngine = CH.length;
    await broadcastBigMatchKickoff(env2, [bigMatch]);
    check("h2. STAGE COLLAPSE: engine match-start + match-start-big ⇒ exactly ONE kickoff post", afterEngine === 1 && CH.length === 1);
    check("h2. the collapsed identity is match:<matchKey>:match-start (one row)", env2.USERS_DB._tables.channel_posts_v1.has("fa-football\u0000match:" + matchKey(bigMatch) + ":match-start") && env2.USERS_DB._tables.channel_posts_v1.size === 1);

    // 3. result-big posts its own stage
    const env3 = { STATE: makeStore(), USERS_DB: makeD1(), TELEGRAM_CHANNEL_CHAT_ID: CHAT_ID };
    CH.length = 0;
    await broadcastBigMatchResults(env3, [Object.assign({}, bigMatch, { status: "FINISHED", score: { fullTime: { home: 2, away: 1 } } })]);
    check("h2. result-big ⇒ ONE channel post on the result stage", CH.length === 1 && env3.USERS_DB._tables.channel_posts_v1.has("fa-football\u0000match:" + matchKey(bigMatch) + ":result"));
  })().catch((e) => { console.error("FAIL h2 harness error: " + e.message); failed++; });

  // ===== h3) the status-change alerts =====
  console.log("\n=== h3. the status-change alerts (detectStatusChanges) ===");
  await (async () => {
    const CH = [];
    const PV = [];
    async function sendTelegram(env, text, chatId) { (String(chatId) === CHAT_ID ? CH : PV).push({ text, chatId }); return true; }
    async function getRegisteredChats() { return [501]; }
    async function getUserPrefs() { return {}; }
    function shouldNotify() { return true; }
    function isMasterBigMatch() { return true; }
    function normalizeTeamName(n) { return String(n).toLowerCase(); }
    const translateTeam = (n) => n;
    const translateCompetition = (c) => "COMP-" + c;
    var COMP_EN = {};
    const matchKey = matchKeyStub;
    eval([
      channelMirrorSrc,
      ...MD_PIECES(),
      G("function mdBold(text)"),
      G("function mdItalic(text)"),
      G("function toFaDigits(str)"),
      G("async function detectStatusChanges(env")
    ].join("\n"));
    const statusMatch = (status, score) => ({ id: "s1", utcDate: new Date(Date.now() - 36e5).toISOString(), status, competition: { code: "PL" }, homeTeam: { name: "Arsenal FC" }, awayTeam: { name: "Chelsea FC" }, score: { fullTime: score || { home: 0, away: 0 } } });
    const envS = { STATE: makeStore(), USERS_DB: makeD1(), TELEGRAM_CHANNEL_CHAT_ID: CHAT_ID };
    await detectStatusChanges(envS, [statusMatch("SCHEDULED")]);
    check("h3. SCHEDULED baseline ⇒ no channel post", CH.length === 0);
    await detectStatusChanges(envS, [statusMatch("POSTPONED")]);
    check("h3. POSTPONED transition ⇒ ONE channel post (fa composition + footer)", CH.length === 1 && CH[0].text.includes("\u0628\u0627\u0632\u06CC \u0628\u0647 \u062A\u0639\u0648\u06CC\u0642 \u0627\u0641\u062A\u0627\u062F") && CH[0].text.includes("\uD83E\uDD16 \u0631\u0628\u0627\u062A: https://t\\.me/SportSignalAlertsBot"));
    check("h3. the private bucket also got its copy (the mirror is additive)", PV.length === 1);
    const claimedPostponed = envS.USERS_DB._tables.channel_posts_v1.size;
    await detectStatusChanges(envS, [statusMatch("POSTPONED")]);
    check("h3. same status again ⇒ no duplicate channel post", claimedPostponed === 1 && CH.length === 1);
    // HT alert → the :ht key
    const htEnv = { STATE: makeStore(), USERS_DB: makeD1(), TELEGRAM_CHANNEL_CHAT_ID: CHAT_ID };
    const htMatch = (status) => ({ id: "s2", utcDate: new Date(Date.now() - 4e6).toISOString(), status, competition: { code: "PL" }, homeTeam: { name: "Arsenal FC" }, awayTeam: { name: "Liverpool FC" }, score: { fullTime: { home: 1, away: 1 } } });
    CH.length = 0;
    await detectStatusChanges(htEnv, [htMatch("SCHEDULED")]);
    await detectStatusChanges(htEnv, [htMatch("PAUSED")]);
    check("h3. HT (PAUSED) transition ⇒ ONE channel post on the :ht key", CH.length === 1 && htEnv.USERS_DB._tables.channel_posts_v1.has("fa-football\u0000match:" + matchKey(htMatch("PAUSED")) + ":ht"));
    // fail-closed: a failing status-map save suppresses the channel copy too
    const envF = { STATE: makeStore({ failWrites: true }), USERS_DB: makeD1(), TELEGRAM_CHANNEL_CHAT_ID: CHAT_ID };
    const fm = (status) => ({ id: "s3", utcDate: new Date(Date.now() - 36e5).toISOString(), status, competition: { code: "SA" }, homeTeam: { name: "Inter Milan" }, awayTeam: { name: "AC Milan" }, score: { fullTime: { home: 0, away: 0 } } });
    CH.length = 0;
    await detectStatusChanges(envF, [fm("SCHEDULED")]);
    await detectStatusChanges(envF, [fm("CANCELLED")]);
    check("h3. statusMapSaved false (fail-closed) ⇒ NO channel post either", CH.length === 0 && envF.USERS_DB._tables.channel_posts_v1.size === 0);
  })().catch((e) => { console.error("FAIL h3 harness error: " + e.message); failed++; });

  // ===== h4) the morning digest edition =====
  console.log("\n=== h4. the morning digest (mirrorMorningChannelPost) ===");
  await (async () => {
    const CH = [];
    async function sendTelegram(env, text, chatId) { CH.push({ text, chatId }); return true; }
    function isMasterBigMatch() { return true; }
    function isBotSilentLeague() { return false; }
    async function getCachedMatches() { return []; }
    const translateTeam = (n) => n;
    const translateCompetition = (c) => "COMP-" + c;
    var COMP_EN = {};
    eval([
      channelMirrorSrc,
      (src.match(/var JALALI_MONTHS_FA = \[[\s\S]*?\];/) || ["FAIL-JM"])[0],
      (src.match(/var WEEKDAYS_FA = \[[^\]]*\];/) || ["FAIL-WD"])[0],
      G("function toJalaliParts(gy"),
      G("function jalaliDateFa(y"),
      G("function englishDateYmd(y"),
          (src.match(/var TZOFF_MEMO = \{\};/) || ["FAIL-TZM"])[0],
    (src.match(/var TZOFF_MEMO_AT = 0;/) || ["FAIL-TZA"])[0],
G("function tzOffsetMinutes(tz"),
      G("function zonedYmDHm(tz, date)"),
      G("function zonedHm(tz, date, lang)"),
      G("function toFaDigits(str)"),
      ...MD_PIECES(),
      G("function mdEscape(text)"),
      G("function mdBold(text)"),
      G("function mdItalic(text)"),
      G("async function buildMorningDigestMessage(env"),
      G("async function mirrorMorningChannelPost(env")
    ].join("\n"));
    const pool = { matches: [
      { competition: { code: "PL" }, utcDate: "2026-11-07T16:00:00Z", status: "SCHEDULED", homeTeam: { name: "Arsenal FC" }, awayTeam: { name: "Liverpool FC" } }
    ] };
    const mkEnv = (extra) => Object.assign({ STATE: makeStore({ seed: { matches_v13_tracked: JSON.stringify(pool) } }), USERS_DB: makeD1() }, extra || {});
    const TEHRAN_0905 = Date.parse("2026-11-07T05:35:00Z"); // Tehran wall 09:05
    const TEHRAN_1500 = Date.parse("2026-11-07T11:35:00Z"); // Tehran wall 15:05
    // unconfigured: zero ops at 9am
    const envU = mkEnv();
    const rU = await mirrorMorningChannelPost(envU, TEHRAN_0905);
    check("h4. unconfigured at Tehran 9am ⇒ null, ZERO D1 ops (the edition gates run only when configured)", rU === null && envU.USERS_DB._prepCount === 0);
    // non-9am: no post even configured
    const envN = mkEnv({ TELEGRAM_CHANNEL_CHAT_ID: CHAT_ID });
    const rN = await mirrorMorningChannelPost(envN, TEHRAN_1500);
    check("h4. Tehran 15:05 ⇒ no morning edition (the 9am wall gate)", rN === null && CH.length === 0 && envN.USERS_DB._tables.channel_posts_v1.size === 0);
    // 9am + big match ⇒ one post
    const envM = mkEnv({ TELEGRAM_CHANNEL_CHAT_ID: CHAT_ID });
    const rM = await mirrorMorningChannelPost(envM, TEHRAN_0905);
    check("h4. Tehran 9am + master big match ⇒ ONE channel post (fa digest + footer)", rM && rM.ok === true && CH.length === 1 && CH[0].chatId === CHAT_ID);
    check("h4. the morning channel post carries the digest header + the footer links", CH[0].text.includes("\u0628\u0627\u0632\u06CC\u200C\u0647\u0627\u06CC \u0628\u0632\u0631\u06AF \u0627\u0645\u0631\u0648\u0632") && CH[0].text.includes("https://sportsignal\\.ir") && CH[0].text.includes("https://t\\.me/SportSignalAlertsBot"));
    check("h4. the edition claim is digest:morning:<tehran-dateKey>", envM.USERS_DB._tables.channel_posts_v1.has("fa-football\u0000digest:morning:2026-11-07"));
    // repeat same dateKey ⇒ no dup; next day ⇒ new edition
    const rM2 = await mirrorMorningChannelPost(envM, TEHRAN_0905);
    check("h4. repeat at the same dateKey ⇒ no second post", rM2 && rM2.claimed === false && CH.length === 1);
    // quiet day (no big matches)
    const envQ = mkEnv({ TELEGRAM_CHANNEL_CHAT_ID: CHAT_ID });
    envQ.STATE._map.set("matches_v13_tracked", JSON.stringify({ matches: [] }));
    const rQ = await mirrorMorningChannelPost(envQ, TEHRAN_0905);
    check("h4. a quiet Tehran day ⇒ no post, no claim burned", rQ === null && envQ.USERS_DB._tables.channel_posts_v1.size === 0);
  })().catch((e) => { console.error("FAIL h4 harness error: " + e.message); failed++; });

  // ===== h5) the UCL night preview edition =====
  console.log("\n=== h5. the UCL night preview (mirrorUclNightChannelPost) ===");
  await (async () => {
    const CH = [];
    const BANNERS = [];
    async function sendTelegram(env, text, chatId) { CH.push({ text, chatId }); return true; }
    async function sendUclGifBanner(env, chatId, caption) { BANNERS.push({ chatId, caption }); return true; }
    const translateTeam = (n) => n;
    var UCL_CODES = ["CL"];
    function subrequestCount() { return 0; }
    eval([
      channelMirrorSrc,
      G("function tzOffsetMs(tz"),
      (src.match(/var TZOFF_MEMO = \{\};/) || ["FAIL-TZM"])[0],
      (src.match(/var TZOFF_MEMO_AT = 0;/) || ["FAIL-TZA"])[0],
      G("function tzOffsetMinutes(tz"),
      G("function dateKeyOf(y"),
      G("function localDateKeyOf(ms"),
      G("function matchesOfLocalDate(matches"),
      G("function previewWindowState(firstKoMs"),
      (src.match(/var JALALI_MONTHS_FA = \[[\s\S]*?\];/) || ["FAIL-JM"])[0],
      (src.match(/var WEEKDAYS_FA = \[[^\]]*\];/) || ["FAIL-WD"])[0],
      G("function toJalaliParts(gy"),
      G("function jalaliDateFa(y"),
      G("function englishDateYmd(y"),
          (src.match(/var TZOFF_MEMO = \{\};/) || ["FAIL-TZM"])[0],
    (src.match(/var TZOFF_MEMO_AT = 0;/) || ["FAIL-TZA"])[0],
G("function tzOffsetMinutes(tz"),
      G("function zonedYmDHm(tz, date)"),
      G("function zonedHm(tz, date, lang)"),
      G("function getJalaliTime(utcDateStr"),
      G("function getEnglishTime(utcDateStr"),
      G("function toFaDigits(str)"),
      ...MD_PIECES(),
      G("function mdEscape(text)"),
      G("function mdBold(text)"),
      G("function uclPreviewLine(env"),
      G("function buildUclPreviewMessage(env"),
      G("async function mirrorUclNightChannelPost(env")
    ].join("\n"));
    const cl = (h, home, away) => ({ competition: { code: "CL" }, utcDate: "2026-11-07T" + h + ":00Z", status: "SCHEDULED", homeTeam: { name: home }, awayTeam: { name: away } });
    const pool = [cl("19:45", "Arsenal FC", "Chelsea FC"), cl("20:00", "Real Madrid CF", "FC Barcelona")];
    const NOW_IN_WINDOW = Date.parse("2026-11-07T15:00:00Z"); // Tehran 18:30; firstKo 19:45Z − 6h = 13:45Z ≤ now ≤ 19:35Z
    const envU = { STATE: makeStore(), USERS_DB: makeD1(), TELEGRAM_CHANNEL_CHAT_ID: CHAT_ID };
    const rU = await mirrorUclNightChannelPost(envU, pool, NOW_IN_WINDOW);
    check("h5. in-window CL day ⇒ banner + ONE channel post", rU && rU.ok === true && BANNERS.length === 1 && CH.length === 1);
    check("h5. the banner caption is the fa UCL-night line", BANNERS[0].caption.includes("\u0634\u0628 \u0644\u06CC\u06AF \u0642\u0647\u0631\u0645\u0627\u0646\u0627\u0646 \u0627\u0631\u0648\u067E\u0627"));
    // PLAIN KICKOFF ORDER: the lines appear in kickoff order (19:45 team pair before 20:00)
    const idxA = CH[0].text.indexOf("Arsenal FC");
    const idxB = CH[0].text.indexOf("Real Madrid CF");
    check("h5. the fixture list is in PLAIN kickoff order (no uclPreviewOrder priority pass)", idxA >= 0 && idxB >= 0 && idxA < idxB);
    check("h5. the mirror function NEVER CALLS uclPreviewOrder (the name appears only in the explanatory comment)", !/uclPreviewOrder\(/.test(G("async function mirrorUclNightChannelPost(env")));
    check("h5. the edition claim is digest:uclnight:<tehran-dateKey>", envU.USERS_DB._tables.channel_posts_v1.has("fa-football\u0000digest:uclnight:2026-11-07"));
    const rU2 = await mirrorUclNightChannelPost(envU, pool, NOW_IN_WINDOW);
    check("h5. repeat ⇒ no second preview (edition claimed)", rU2 && rU2.claimed === false && CH.length === 1);
    // out of window (after the tail): no post, no claim burned
    const envL = { STATE: makeStore(), USERS_DB: makeD1(), TELEGRAM_CHANNEL_CHAT_ID: CHAT_ID };
    const rL = await mirrorUclNightChannelPost(envL, pool, Date.parse("2026-11-07T19:40:00Z"));
    check("h5. past the window tail ⇒ no post, no claim burned", rL === null && envL.USERS_DB._tables.channel_posts_v1.size === 0);
  })().catch((e) => { console.error("FAIL h5 harness error: " + e.message); failed++; });

  // ===== h6) the night digest edition + the private parity law =====
  console.log("\n=== h6. the night digest (mirrorNightChannelPost + the additive channel variant) ===");
  await (async () => {
    const CH = [];
    const BANNERS = [];
    async function sendTelegram(env, text, chatId) { CH.push({ text, chatId }); return true; }
    async function sendUclGifBanner(env, chatId, caption) { BANNERS.push({ chatId, caption }); return true; }
    let elimStub = [];
    function collectEliminations() { return elimStub; } // SYNC like the real cup-elim.ts export
    function isBotSilentLeague() { return false; }
    function subrequestCount() { return 0; }
    const translateTeam = (n) => n;
    const translateCompetition = (c) => "COMP-" + c;
    function normalizeTeamName(n) { return String(n).toLowerCase(); }
    eval([
      channelMirrorSrc,
          (src.match(/var TZOFF_MEMO = \{\};/) || ["FAIL-TZM"])[0],
    (src.match(/var TZOFF_MEMO_AT = 0;/) || ["FAIL-TZA"])[0],
G("function tzOffsetMinutes(tz"),
      G("function tzOffsetMs(tz"),
      G("function zonedYmDHm(tz, date)"),
      G("function dateKeyOf(y"),
      G("function localDateKeyOf(ms"),
      G("function matchesOfLocalDate(matches"),
      (src.match(/(?:var|const) DONE_STATUSES = \[[^\]]*\];/) || ["FAIL-DS"])[0],
      G("function nightIsOver(nightMatches"),
      (src.match(/var JALALI_MONTHS_FA = \[[\s\S]*?\];/) || ["FAIL-JM"])[0],
      (src.match(/var WEEKDAYS_FA = \[[^\]]*\];/) || ["FAIL-WD"])[0],
      G("function toJalaliParts(gy"),
      G("function jalaliDateFa(y"),
      G("function englishDateYmd(y"),
      G("function toFaDigits(str)"),
      ...MD_PIECES(),
      G("function mdEscape(text)"),
      G("function mdBold(text)"),
      G("function mdItalic(text)"),
      G("function ftScore(m)"),
      G("function collapsePairings(list)"),
      G("function renderEliminationSection(eliminations, en)"),
      G("async function buildNightDigestChannelMessage(env"),
      G("async function mirrorNightChannelPost(env")
    ].join("\n"));
    const fin = (code, h, home, away, sH, sA) => ({ competition: { code }, utcDate: "2026-11-07T" + h + ":00Z", status: "FINISHED", homeTeam: { name: home }, awayTeam: { name: away }, score: { fullTime: { home: sH, away: sA } } });
    const uclPool = [fin("CL", "19:45", "Arsenal FC", "Chelsea FC", 2, 1), fin("CL", "20:00", "Real Madrid CF", "FC Barcelona", 1, 1)];
    const plPool = [fin("PL", "20:00", "Hull City AFC", "Everton FC", 0, 3)];
    const TEHRAN_2100 = Date.parse("2026-11-07T17:30:00Z"); // Tehran 21:00 (>= 20)
    // 1. UCL night ⇒ one channel post + banner
    const envU = { STATE: makeStore(), USERS_DB: makeD1(), TELEGRAM_CHANNEL_CHAT_ID: CHAT_ID };
    const rU = await mirrorNightChannelPost(envU, uclPool, TEHRAN_2100);
    check("h6. a UCL night (over, all FINISHED) ⇒ banner + ONE channel post", rU && rU.ok === true && BANNERS.length === 1 && CH.length === 1);
    check("h6. the channel variant has NO per-chat «بازی‌های شما» section", !CH[0].text.includes("\u0628\u0627\u0632\u06CC\u200C\u0647\u0627\u06CC \u0634\u0645\u0627"));
    check("h6. the channel variant carries the results section + the footer links", CH[0].text.includes("\u0646\u062A\u0627\u06CC\u062C \u0634\u0628") && CH[0].text.includes("https://sportsignal\\.ir") && CH[0].text.includes("https://t\\.me/SportSignalAlertsBot"));
    check("h6. the edition claim is digest:night:<tehran-dateKey>", envU.USERS_DB._tables.channel_posts_v1.has("fa-football\u0000digest:night:2026-11-07"));
    // 2. repeat ⇒ no dup
    const rU2 = await mirrorNightChannelPost(envU, uclPool, TEHRAN_2100);
    check("h6. repeat at the same dateKey ⇒ no second post", rU2 && rU2.claimed === false && CH.length === 1);
    // 3. QUIET night: non-UCL, no elimination — even though a hypothetical follower exists — NO post (the desired-teams leg is dropped)
    const envQ = { STATE: makeStore(), USERS_DB: makeD1(), TELEGRAM_CHANNEL_CHAT_ID: CHAT_ID };
    const rQ = await mirrorNightChannelPost(envQ, plPool, TEHRAN_2100);
    check("h6. a QUIET night (no UCL, no elimination) ⇒ NO channel post, no claim burned (the desired-teams leg is dropped)", rQ === null && envQ.USERS_DB._tables.channel_posts_v1.size === 0);
    // 4. elimination night ⇒ post with the elimination section
    const envE = { STATE: makeStore(), USERS_DB: makeD1(), TELEGRAM_CHANNEL_CHAT_ID: CHAT_ID };
    CH.length = 0;
    elimStub = [{ code: "COPPA_ITALIA", home: "AS Roma", away: "Lazio Roma", loser: "Lazio Roma", winner: "AS Roma", agg: { w: 3, l: 1 }, final: false }];
    const rE = await mirrorNightChannelPost(envE, plPool.concat([fin("COPPA_ITALIA", "18:30", "AS Roma", "Lazio Roma", 2, 0)]), TEHRAN_2100);
    check("h6. an elimination night ⇒ ONE channel post with the eliminations section", rE && rE.ok === true && CH.length === 1 && CH[0].text.includes("\u062D\u0630\u0641\u200C\u0634\u062F\u06AF\u0627\u0646 \u062C\u0627\u0645\u200C\u0647\u0627\u06CC \u062D\u0630\u0641\u06CC"));
    elimStub = [];
    // 5. the night is not over ⇒ no post
    const envO = { STATE: makeStore(), USERS_DB: makeD1(), TELEGRAM_CHANNEL_CHAT_ID: CHAT_ID };
    const livePool = uclPool.concat([{ competition: { code: "CL" }, utcDate: "2026-11-07T17:00:00Z", status: "IN_PLAY", homeTeam: { name: "A Team" }, awayTeam: { name: "B Team" }, score: { fullTime: { home: 0, away: 0 } } }]);
    const rO = await mirrorNightChannelPost(envO, livePool, TEHRAN_2100);
    check("h6. a night still in play ⇒ no post (nightIsOver gate)", rO === null && envO.USERS_DB._tables.channel_posts_v1.size === 0);
    // 6. daytime ⇒ nothing
    const rD = await mirrorNightChannelPost(envO, uclPool, Date.parse("2026-11-07T08:00:00Z"));
    check("h6. Tehran daytime ⇒ no night edition", rD === null);
  })().catch((e) => { console.error("FAIL h6 harness error: " + e.message); failed++; });

  // ===== h6b) the PRIVATE night digest builder — the frozen-fixture parity =====
  console.log("\n=== h6b. buildNightDigestMessage — byte-identical private parity ===");
  await (async () => {
    const translateTeam = (n) => n;
    const translateCompetition = (c) => "COMP-" + c;
    function normalizeTeamName(n) { return String(n).toLowerCase().replace(/\s+/g, " "); }
    function userFollowsMatch(prefs, chatId, m) {
      const p = prefs[String(chatId)];
      if (!p || !Array.isArray(p.teams)) return null;
      return p.teams.includes(m.homeTeam.name) || p.teams.includes(m.awayTeam.name) ? "one" : null;
    }
    function userFollowsSides(prefs, chatId, m) {
      const p = prefs[String(chatId)];
      return { home: !!(p && p.teams && p.teams.includes(m.homeTeam.name)), away: !!(p && p.teams && p.teams.includes(m.awayTeam.name)) };
    }
    function priorityTier() { return 0; }
    function zonedYmDHm(tz, date) { return { y: 2026, m: 11, d: 7, dow: 6, hh: 23, mm: 5, hm: "23:05" }; }
    async function fetchStandings(env, code) {
      if (code === "CL") return { teams: [{ name: "Arsenal FC", pos: 2, points: 7 }] };
      return null;
    }
    eval([
      ...MD_PIECES(),
      G("function toFaDigits(str)"),
      G("function ftScore(m)"),
      G("function collapsePairings(list)"),
      G("async function teamRank(env"),
      G("function findTeamRow(data"),
      G("function renderEliminationSection(eliminations, en)"),
      (src.match(/var JALALI_MONTHS_FA = \[[\s\S]*?\];/) || ["FAIL-JM"])[0],
      (src.match(/var WEEKDAYS_FA = \[[^\]]*\];/) || ["FAIL-WD"])[0],
      G("function toJalaliParts(gy"),
      G("function jalaliDateFa(y"),
      G("async function buildNightDigestMessage(env")
    ].join("\n"));
    const nightMatches = [
      { competition: { code: "CL" }, utcDate: "2026-11-07T19:45:00Z", status: "FINISHED", homeTeam: { name: "Arsenal FC" }, awayTeam: { name: "Chelsea FC" }, score: { fullTime: { home: 2, away: 1 } } },
      { competition: { code: "PL" }, utcDate: "2026-11-07T20:00:00Z", status: "FINISHED", homeTeam: { name: "Hull City AFC" }, awayTeam: { name: "Everton FC" }, score: { fullTime: { home: 0, away: 3 } } },
      { competition: { code: "PD" }, utcDate: "2026-11-07T21:30:00Z", status: "FINISHED", homeTeam: { name: "Deportivo Alavés" }, awayTeam: { name: "Real Betis" }, score: { fullTime: { home: 1, away: 1 } } },
      { competition: { code: "COPPA_ITALIA" }, utcDate: "2026-11-07T18:30:00Z", status: "FINISHED", homeTeam: { name: "AS Roma" }, awayTeam: { name: "Lazio Roma" }, score: { fullTime: { home: 2, away: 0 } } }
    ];
    const prefs = { "501": { teams: ["Arsenal FC"], lang: "fa" } };
    const eliminations = [{ code: "COPPA_ITALIA", home: "AS Roma", away: "Lazio Roma", loser: "Lazio Roma", winner: "AS Roma", agg: { w: 3, l: 1 }, final: false }];
    const out = await buildNightDigestMessage({ TEHRAN_TZ: "Asia/Tehran" }, nightMatches, "fa", prefs, 501, new Map(), { y: 2026, m: 11, d: 7 }, eliminations);
    const fsx = require("fs");
    const FROZEN = fsx.readFileSync(require("path").join(__dirname, "fixtures", "nightdigest-private-baseline.txt"), "utf8");;
    check("h6b. the PRIVATE buildNightDigestMessage output is byte-identical to the frozen v13.230 baseline", out === FROZEN);
  })().catch((e) => { console.error("FAIL h6b harness error: " + e.message); failed++; });

  // ===== h7) the coronation alerts =====
  console.log("\n=== h7. the coronation alerts (maybeNotifyTableToppers) ===");
  await (async () => {
    const CH = [];
    const PV = [];
    async function sendTelegram(env, text, chatId) { (String(chatId) === CHAT_ID ? CH : PV).push({ text, chatId }); return true; }
    async function getRegisteredChats() { return [501]; }
    async function getUserPrefs() { return {}; }
    function normAlias(n) { return String(n).toLowerCase(); }
    function weeklyTableCodes() { return ["PL"]; }
    function isMatchFinished() { return true; }
    function isWithinPostMatchWindow() { return true; }
    const translateTeam = (n) => n;
    const translateCompetition = (c) => "COMP-" + c;
    var COMP_EN = {};
    const matchKey = matchKeyStub;
    async function fetchStandings() { return { started: true, matchday: 11, teams: [ { name: "Arsenal FC", pos: 1, points: 12 }, { name: "Manchester City FC", pos: 2, points: 9 } ] }; }
    eval([
      channelMirrorSrc,
      G("function toFaDigits(str)"),
      (src.match(/var JALALI_MONTHS_FA = \[[\s\S]*?\];/) || ["FAIL-JM"])[0],
      (src.match(/var WEEKDAYS_FA = \[[^\]]*\];/) || ["FAIL-WD"])[0],
      G("function toJalaliParts(gy"),
      G("function jalaliDateFa(y"),
      G("function getJalaliDate(utcDateStr"),
      G("function getEnglishDate(utcDateStr"),
      G("async function formatTableTopMessage(env"),
      G("async function maybeNotifyTableToppers(env")
    ].join("\n"));
    const trigger = { id: "c1", utcDate: new Date(Date.now() - 36e5).toISOString(), status: "FINISHED", competition: { code: "PL" }, homeTeam: { name: "Arsenal FC" }, awayTeam: { name: "Everton FC" }, score: { fullTime: { home: 3, away: 0 } } };
    // seed the PREVIOUS snapshot: City on top, Arsenal second
    const seed = { "table_top_v1:PL": JSON.stringify({ ts: Date.now() - 864e5, top: [ { name: "Manchester City FC", pos: 1, points: 9 }, { name: "Arsenal FC", pos: 2, points: 9 } ] }) };
    const envC = Object.assign({ STATE: makeStore({ seed }), USERS_DB: makeD1(), TELEGRAM_CHANNEL_CHAT_ID: CHAT_ID });
    const rC = await maybeNotifyTableToppers(envC, [trigger]);
    check("h7. a coronation event ⇒ ONE channel post (fa + footer on top of the table link)", CH.length === 1 && rC.events.length === 1);
    check("h7. the coronation channel post names the new leader + the footer bot line", CH[0].text.includes("Arsenal FC") && CH[0].text.includes("\uD83E\uDD16 \u0631\u0628\u0627\u062A: https://t\\.me/SportSignalAlertsBot"));
    check("h7. the claim key is coronation:<code>:<triggerMatchKey>", envC.USERS_DB._tables.channel_posts_v1.has("fa-football\u0000coronation:PL:" + matchKey(trigger)));
    const claimed = CH.length;
    await maybeNotifyTableToppers(envC, [trigger]);
    check("h7. repeat (the snapshot now matches) ⇒ no second channel post", CH.length === claimed);
    // snapshot save failure ⇒ fail-closed, no channel post
    const envF = Object.assign({ STATE: makeStore({ seed, failWrites: true }), USERS_DB: makeD1(), TELEGRAM_CHANNEL_CHAT_ID: CHAT_ID });
    CH.length = 0;
    await maybeNotifyTableToppers(envF, [trigger]);
    check("h7. snapshot save failure ⇒ NO channel post (fail-closed gate respected)", CH.length === 0 && envF.USERS_DB._tables.channel_posts_v1.size === 0);
  })().catch((e) => { console.error("FAIL h7 harness error: " + e.message); failed++; });

  // ===== h8) the weekly channel burst =====
  console.log("\n=== h8. the weekly channel burst (serveChannelWeekly) ===");
  await (async () => {
    const CH = [];
    const STK = [];
    async function sendTelegram(env, text, chatId) { CH.push({ text, chatId }); return true; }
    async function sendSticker(env, chatId, sticker) { STK.push({ chatId, sticker }); return true; }
    function subrequestCount() { return 0; }
    function kvOpsCount() { return 0; }
    eval([
      channelMirrorSrc,
      G("function weeklyBurstCost(group"),
      G("async function serveChannelWeekly(env")
    ].join("\n"));
    const payload = { week: "2026-W46", groups: { fa: { tables: [ { code: "PL", text: "TBL-PL", sticker: null }, { code: "PD", text: "TBL-PD", sticker: "STK-PD" } ], weekAhead: "WEEKAHEAD" } } };
    const mkEnv = (extra) => Object.assign({ STATE: makeStore({ seed: { weekly_tables_payload_v1: JSON.stringify(payload) } }), USERS_DB: makeD1() }, extra || {});
    const envW = mkEnv({ TELEGRAM_CHANNEL_CHAT_ID: CHAT_ID });
    const rW = await serveChannelWeekly(envW, "2026-W46");
    check("h8. the burst serves [sticker][table]×N + week-ahead to the channel", rW && rW.served === true && STK.length === 1 && STK[0].sticker === "STK-PD" && CH.length === 3);
    check("h8. the footer rides the CLOSING message only (no footer spam on the tables)", !CH[0].text.includes("\u0633\u0627\u06CC\u062A") && !CH[1].text.includes("\u0633\u0627\u06CC\u062A") && CH[2].text === "WEEKAHEAD" + "\n\n\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n\uD83C\uDF10 \u0633\u0627\u06CC\u062A: https://sportsignal\\.ir\n\uD83E\uDD16 \u0631\u0628\u0627\u062A: https://t\\.me/SportSignalAlertsBot");
    check("h8. the claim is digest:weekly:<isoWeekKey> + state 'sent'", envW.USERS_DB._tables.channel_posts_v1.get("fa-football\u0000digest:weekly:2026-W46").state === "sent");
    const rW2 = await serveChannelWeekly(envW, "2026-W46");
    check("h8. repeat ⇒ no second burst (the week is claimed)", rW2 === null && CH.length === 3);
    // reservation-blocked: NO claim burned (the retry stays possible)
    const envD = mkEnv({ TELEGRAM_CHANNEL_CHAT_ID: CHAT_ID });
    // (the grabbed function closes over THIS scope's subrequestCount binding)
    subrequestCount = function () { return 40; };
    const rD = await serveChannelWeekly(envD, "2026-W46");
    check("h8. budget-blocked ⇒ {deferred:true} and NO claim burned (the retry lane stays open)", rD && rD.deferred === true && envD.USERS_DB._tables.channel_posts_v1.size === 0);
    subrequestCount = function () { return 0; };
    const rD2 = await serveChannelWeekly(envD, "2026-W46");
    check("h8. budget recovered ⇒ the burst fires on the retry (the claim was not burned)", rD2 && rD2.served === true);
    // a payload for a different week ⇒ no-op
    const envX = mkEnv({ TELEGRAM_CHANNEL_CHAT_ID: CHAT_ID });
    const rX = await serveChannelWeekly(envX, "2026-W47");
    check("h8. a payload from another week ⇒ no-op (week match enforced)", rX === null && envX.USERS_DB._tables.channel_posts_v1.size === 0);
  })().catch((e) => { console.error("FAIL h8 harness error: " + e.message); failed++; });

  // ===== i) the EXCLUSION matrix (every ⛔ family) =====
  console.log("\n=== i. the exclusion matrix (spec PART II §2) ===");
  {
    const fs = require("fs");
    const path = require("path");
    const SRC = (f) => fs.readFileSync(path.join(__dirname, "..", "src", f), "utf8");
    const CHANNEL_SEAM = /claimChannelPost|sendChannelPost|mirrorChannelPost|claimChannelEvent|recordChannelState|channelDestinations|channelActive|appendChannelFooter|channelStageHead|withChannelCta|mirrorMorningChannelPost|mirrorUclNightChannelPost|mirrorNightChannelPost|serveChannelWeekly/;
    const EXCLUDED = [
      ["bot.ts", "the private command replies (/start /help /next /teams /timezone /lang /stop)"],
      ["admin-bot.ts", "the admin command surface (/status /members /broadcast)"],
      ["admin-ops.ts", "the admin panel operations"],
      ["admin.ts", "the admin auth/ops layer"],
      ["migration.ts", "the owner-triggered migration broadcast"],
      ["monitoring.ts", "the phase-error admin pages"],
      ["cron-users.ts", "the 6-hourly admin heartbeat"],
      ["cron-preflight.ts", "the KV-budget + stale-run admin pages"],
      ["providers.ts", "the provider degradation alert (owner decision pending — DISCOVERY §12 q2)"],
      ["notify-audit.ts", "the notification-gap audit reports"],
      ["users.ts", "the user-cap warning"],
      ["simulate.ts", "the /api/simulate dry-run"]
    ];
    for (const [f, why] of EXCLUDED) {
      check("i. \u25ED " + f + " (" + why + ") never reaches the channel", !CHANNEL_SEAM.test(SRC(f)));
    }
    check("i. the ONLY channel hook sites are the six DISCOVERY §7.4 boundaries", (() => {
      const hooksIn = ["notify-engine.ts", "digest-bigmatch.ts", "notify-status.ts", "digest-morning.ts", "digest-uclnight.ts", "digest-night.ts", "digest-coronation.ts", "digest-weekly.ts", "cron.ts"];
      for (const f of hooksIn) { if (!CHANNEL_SEAM.test(SRC(f))) return false; }
      return true;
    })());
  }

  // ===== k) resources (spec PART IV §12 / DISCOVERY §7.7) =====
  console.log("\n=== k. the resource discipline ===");
  {
    const fs = require("fs");
    const path = require("path");
    const read = (f) => fs.readFileSync(path.join(__dirname, "..", f), "utf8");
    check("k. fanoutFetchCost gains exactly +2 per unit when the channel is enabled", (() => {
      const fn = eval("(" + untype(grabFn("function fanoutFetchCost(chatGroups, config, channelEnabled)")) + ")");
      const g = [{ tz: "Asia/Tehran", lang: "fa", chats: [1, 2] }];
      const cfg = { type: "pre-match-1h" };
      return fn(g, cfg) === 8 && fn(g, cfg, true) === 10;
    })());
    check("k. NO new cron triggers (the two documented crons unchanged)", /crons = \["\*\/10 \* \* \* \*", "27 \*\/4 \* \* \*"\]/.test(read("wrangler.toml")));
    check("k. the notify.ch breadcrumb rides the completion blob's existing put (zero extra KV writes)", /ch: channelActive\(env\) \? takeChannelTickStats\(\) : null/.test(read("src/cron.ts")));
    check("k. channel-mirror.ts imports no provider (no new fetch/polling class)", !/provider/.test(read("src/channel-mirror.ts").replace(/\/\/[^\n]*/g, "")));
    check("k. the engine claim sits AFTER saveNotifiedMatch (the private write-first gate)", (() => { const s = grabFn("async function sendNotificationIfNeeded(match, config, chatGroups, env, counts, notifiedMatches, deadChats, deferred)"); return s.indexOf("await saveNotifiedMatch") >= 0 && s.indexOf("await claimChannelPost") > s.indexOf("await saveNotifiedMatch") && s.indexOf("await claimChannelPost") < s.indexOf("for (const g of chatGroups)"); })());
    check("k. the engine send sits AFTER the group loop (never inside a per-recipient loop)", (() => { const s = grabFn("async function sendNotificationIfNeeded(match, config, chatGroups, env, counts, notifiedMatches, deadChats, deferred)"); return s.indexOf("await sendChannelPost") > s.indexOf("for (const g of chatGroups)"); })());
    check("k. [vars] carry the ACTIVATED destination (the S21 Session-4 owner gate: the numeric -100… chat id + the https://t.me/SportSignalz public URL — PUBLIC values, not secrets; malformed values still fail closed in channelDestinations)", /TELEGRAM_CHANNEL_CHAT_ID = "-1003654328600"/.test(read("wrangler.toml")) && /TELEGRAM_CHANNEL_PUBLIC_URL = "https:\/\/t\.me\/SportSignalz"/.test(read("wrangler.toml")));
  }


  // ======================================================================
  // v13.232-channelhardening — SESSION 3 (spec PART VI Session 3; DISCOVERY
  // §7.6/§7.7/§10): the transport/failure matrix through the REAL senders,
  // the stuck-claim reconciliation + the admin health surface, and the
  // full-worker budget re-measure.
  // ======================================================================

  // ===== l) the transport/failure matrix — REAL senders + REAL drain =====
  console.log("\n=== l. the v13.232 transport/failure matrix (REAL senders) ===");
  {
    // Slice the REAL telegram.ts module (it sits right before composers.ts
    // in the concat) and eval it TOGETHER with the channel module — ONE
    // scope, so the module-scope setChannelDrainHook registration wires the
    // REAL drainOutbox to the REAL channelDrainOutcome (the production
    // wiring, exercised offline). The earlier sections' channel-module
    // bindings are re-declared by this eval (same source) — the sections
    // above have already run and asserted.
    const tgStart = src.indexOf("// ===== src/telegram.ts =====");
    const tgEnd = src.indexOf("// ===== src/composers.ts =====");
    if (tgStart < 0 || tgEnd < 0 || tgEnd < tgStart) throw new Error("telegram module not found in concat");
    const telegramSrc = src.slice(tgStart, tgEnd);
    // the transport module's utility seams (the REAL budget gate is
    // exercised in the m sections below; here it never trips)
    globalThis.vlog = () => {};
    globalThis.bumpSubrequest = () => false;
    globalThis.VERSION = "13.232-test";
    // a controlled clock + instant timers (the f-section precedent): the
    // 429 pause-outlives-the-bound path needs fake seconds to elapse
    // without real waiting. Every Date.now() read advances 1 fake-second;
    // clockMs is directly adjustable between phases.
    const RealDateNow = Date.now.bind(Date);
    const RealSetTimeout = globalThis.setTimeout;
    let clockMs = RealDateNow();
    Date.now = () => (clockMs += 1000);
    globalThis.setTimeout = (fn) => RealSetTimeout(fn, 0);
    const dispatcher = makeFetchDispatcher();
    globalThis.fetch = dispatcher.dispatch;
    dispatcher.clock = () => clockMs;
    try {
      eval(telegramSrc + "\n" + channelMirrorSrc);

      const rowOf = (env, ek) => env.USERS_DB._tables.channel_posts_v1.get("fa-football\u0000" + ek);
      const boxOf = (env) => JSON.parse(env.STATE._map.get("pending_sends_v1") || "[]");
      const markerOf = (env) => JSON.parse(env.STATE._map.get("channel_mirror_v1") || "null");
      const chanEnv = (extra) => Object.assign({ STATE: makeStore(), USERS_DB: makeD1(), TELEGRAM_CHANNEL_CHAT_ID: CHAT_ID, BOT_TOKEN: "test-token", CHAT_ID: "92788333" }, extra || {});
      const senderOf = (text) => async (chEnv, dest, chan) => sendTelegram(chEnv, text, dest.chatId, null, chan);

      // --- l1. successful text send through the REAL sender ---
      dispatcher.onTelegram = async () => true;
      {
        const env = chanEnv();
        const r = await mirrorChannelPost(env, "match:l1|a|2026-11-08T16:00:match-start", senderOf("hello *channel*"));
        const row = rowOf(env, "match:l1|a|2026-11-08T16:00:match-start");
        check("l1. real sendTelegram success ⇒ sent + claim 'sent' + exactly one channel fetch",
          r.ok === true && r.claimed === true && row.state === "sent" && typeof row.sent_at === "number" &&
          dispatcher.telegramSends.filter((s) => s.chatId === Number(CHAT_ID)).length === 1 && boxOf(env).length === 0);
      }

      // --- l2. 429 + retry_after outliving the pause bound → dest-bearing outbox entry, claim failed (transient), NOT paused ---
      {
        const env = chanEnv();
        dispatcher.onTelegram = async (e) => e.method === "sendMessage"
          ? { status: 429, retryAfter: 9, description: "Too Many Requests: retry after 9" } : true;
        const r = await mirrorChannelPost(env, "match:l2|a|2026-11-08T16:00:match-start", senderOf("rate limited body"));
        const row = rowOf(env, "match:l2|a|2026-11-08T16:00:match-start");
        const box = boxOf(env);
        check("l2. 429+retry_after (pause outlives the 8s bound) ⇒ verdict false + claim failed/'rate-limited' + NOT paused",
          r.ok === false && row.state === "failed" && row.last_error === "rate-limited" && markerOf(env) === null);
        check("l2. the deferred entry carries dest {k,e} — distinguishable from every private entry",
          box.length === 1 && box[0].dest && box[0].dest.k === "fa-football" && box[0].dest.e === "match:l2|a|2026-11-08T16:00:match-start" && box[0].chatId === CHAT_ID);
      }

      // --- l3. transient 5xx (retries exhausted) → dest entry; the NEXT
      //     drain delivers it → the claim row goes 'sent' through the REAL
      //     drain-hook registration (the retry-after-restart proof: the KV
      //     list IS the persistence across invocations) ---
      {
        const env = chanEnv();
        dispatcher.onTelegram = async (e) => e.method === "sendMessage" ? "fail" : true;
        const r = await mirrorChannelPost(env, "match:l3|a|2026-11-08T16:00:result", senderOf("server error body"));
        const row = rowOf(env, "match:l3|a|2026-11-08T16:00:result");
        check("l3a. transient 5xx ×3 ⇒ claim failed/'server-error' + ONE dest-bearing entry",
          r.ok === false && row.state === "failed" && row.last_error === "server-error" && boxOf(env).length === 1);
        dispatcher.onTelegram = async () => true;
        clockMs += 61 * 1000; // past the 1m first backoff
        const d = await drainOutbox(env);
        const row2 = rowOf(env, "match:l3|a|2026-11-08T16:00:result");
        check("l3b. the drain (a fresh invocation — the KV list is the persistence) delivers it ⇒ drained + claim 'sent' + sent_at set",
          d.drained === 1 && d.remaining === 0 && row2.state === "sent" && typeof row2.sent_at === "number" && boxOf(env).length === 0);
      }

      // --- l4. the PERMANENT 400/403 classes — every one pauses the
      //     destination + marks the claim unreachable (the S18 residual
      //     note 1 closed); non-dead 4xx never outboxes ---
      {
        const PERM = [
          ["chat-not-found", 400, "Bad Request: chat not found", "dead"],
          ["need-administrator-rights", 400, "Bad Request: need administrator rights in the channel chat", false],
          ["bot-not-a-member", 403, "Forbidden: bot is not a member of the channel chat", false],
          ["bad-request-markdown", 400, "Bad Request: can't parse entities: unclosed quote at byte 12", false],
        ];
        for (const [cls, st, desc, verdictExp] of PERM) {
          const env = chanEnv();
          dispatcher.onTelegram = async () => ({ status: st, description: desc });
          const r = await mirrorChannelPost(env, "match:l4|a|2026-11-08T16:00:" + cls, senderOf("body"));
          const row = rowOf(env, "match:l4|a|2026-11-08T16:00:" + cls);
          const marker = markerOf(env);
          check("l4. " + cls + " ⇒ claim 'unreachable' + last_error '" + cls + "' + the pause marker with that reason + ZERO outbox entries",
            r.ok === false && r.verdict === verdictExp && row.state === "unreachable" && row.last_error === cls &&
            marker && marker.paused === true && marker.reason === cls && marker.chatId === CHAT_ID && boxOf(env).length === 0);
        }
      }

      // --- l5. the transient/unknown classes stay failed, never pause ---
      {
        const env5a = chanEnv();
        dispatcher.onTelegram = async (e) => e.method === "sendMessage" ? "network" : true;
        await mirrorChannelPost(env5a, "match:l5|a|2026-11-08T16:00:match-start", senderOf("network body"));
        const row5a = rowOf(env5a, "match:l5|a|2026-11-08T16:00:match-start");
        check("l5a. a network throw (the ambiguous-timeout class) ⇒ outboxed WITH dest + claim failed/'network' (the transport's documented at-least-once lane — the claim never blind-resends)",
          row5a.state === "failed" && row5a.last_error === "network" && boxOf(env5a).length === 1 && boxOf(env5a)[0].dest.e === "match:l5|a|2026-11-08T16:00:match-start");
        const env5b = chanEnv();
        dispatcher.onTelegram = async () => ({ status: 400, description: "Bad Request: message is too long" });
        const r5b = await mirrorChannelPost(env5b, "match:l5|a|2026-11-08T16:00:result", senderOf("too long body"));
        const row5b = rowOf(env5b, "match:l5|a|2026-11-08T16:00:result");
        check("l5b. an UNKNOWN 4xx ⇒ failed/'bad-request', NOT paused, NOT outboxed (the transport's hard-fail — the reconciliation surfaces it)",
          r5b.ok === false && row5b.state === "failed" && row5b.last_error === "bad-request" && markerOf(env5b) === null && boxOf(env5b).length === 0);
      }

      // --- l6. missing config ⇒ zero surface through the REAL path ---
      {
        const envOffL = { STATE: makeStore(), USERS_DB: makeD1(), BOT_TOKEN: "test-token" };
        const before = dispatcher.telegramSends.length;
        const r = await mirrorChannelPost(envOffL, "match:l6|a|2026-11-08T16:00:match-start", senderOf("x"));
        check("l6. unconfigured ⇒ {ok:false, claimed:false}, zero D1 ops, zero fetches",
          r.ok === false && r.claimed === false && envOffL.USERS_DB._prepCount === 0 && dispatcher.telegramSends.length === before);
      }

      // --- l7. channel failure NEVER stops private sends; pause ⇒ hooks
      //     skip; a paused channel never re-fires past claims; resume ---
      {
        const env = chanEnv();
        dispatcher.onTelegram = async (e) => e.chatId === Number(CHAT_ID)
          ? { status: 400, description: "Bad Request: chat not found" } : true;
        // the private send to a healthy chat while the channel 400s:
        const priv = await sendTelegram(env, "a private message", 12345);
        check("l7a. a permanent channel failure NEVER stops private sends (same tick, same sender)",
          priv === true && dispatcher.telegramSends.some((s) => s.chatId === 12345 && s.ok === true));
        // the channel event that hits the wall:
        await mirrorChannelPost(env, "match:l7|a|2026-11-08T16:00:match-start", senderOf("x"));
        check("l7b. the channel claim is unreachable + the destination is paused", rowOf(env, "match:l7|a|2026-11-08T16:00:match-start").state === "unreachable" && markerOf(env).paused === true);
        // paused ⇒ subsequent hooks skip BEFORE any claim (no new D1 row):
        const prep = env.USERS_DB._prepCount;
        const r2 = await mirrorChannelPost(env, "match:l7|b|2026-11-08T18:00:match-start", senderOf("x"));
        check("l7c. paused ⇒ the hook skips with NO claim row (zero D1 ops) and no sends",
          r2.ok === false && r2.claimed === false && env.USERS_DB._prepCount === prep && !rowOf(env, "match:l7|b|2026-11-08T18:00:match-start"));
        // resume (the owner action) — the PAST claim never re-fires:
        const sendsBefore = dispatcher.telegramSends.filter((s) => s.chatId === Number(CHAT_ID)).length;
        check("l7d. markChannelResumed ⇒ the transition write", (await markChannelResumed(env)) === true);
        const r3 = await mirrorChannelPost(env, "match:l7|a|2026-11-08T16:00:match-start", senderOf("x"));
        const r4 = await mirrorChannelPost(env, "match:l7|b|2026-11-08T18:00:match-start", senderOf("x"));
        const sendsAfter = dispatcher.telegramSends.filter((s) => s.chatId === Number(CHAT_ID)).length;
        check("l7e. after resume: the PAST (already-claimed) event never re-fires; a NEW event claims + sends",
          r3.claimed === false && r4.claimed === true && r4.ok === false && sendsAfter === sendsBefore + 1);
        // resume on CONFIG CHANGE (a different chat id ⇒ the stale pause):
        const envA = chanEnv();
        await markChannelPaused(envA, "chat-not-found");
        const envB = { STATE: envA.STATE, USERS_DB: makeD1(), TELEGRAM_CHANNEL_CHAT_ID: "-1009998887777", BOT_TOKEN: "test-token" };
        const gateB = await channelGate(envB);
        check("l7f. a pause pinned to a DIFFERENT chat id is STALE after a config change ⇒ the gate opens (no writes)",
          gateB.ok === true && markerOf(envA).paused === true);
        const gateA = await channelGate(envA);
        check("l7g. the same-id config keeps the pause in force (never blind-open a known-bad destination)",
          gateA.ok === false && gateA.reason === "paused");
        // the pre-v13.232 old-shape marker (no chatId) keeps pausing:
        const envC = chanEnv();
        envC.STATE._map.set("channel_mirror_v1", JSON.stringify({ paused: true, reason: "old-shape", at: 1 }));
        check("l7h. an old-shape (chatId-less) marker keeps pausing (conservative)", (await channelGate(envC)).ok === false);
      }

      // --- l8. bounded retry/dead-letter: the 6-attempt drop of a
      //     dest-bearing entry records 'outbox-exhausted' on the claim ---
      {
        const env = chanEnv();
        const ek = "match:l8|a|2026-11-08T16:00:result";
        await claimChannelEvent(env, channelDestinations(env)[0], ek);
        await recordChannelState(env, channelDestinations(env)[0], ek, "failed", "server-error");
        await env.STATE.put("pending_sends_v1", JSON.stringify([
          { text: "retry me", chatId: CHAT_ID, keyboard: null, sticker: null, dest: { k: "fa-football", e: ek }, ts: clockMs - 36e5, attempts: 6 }
        ]));
        dispatcher.onTelegram = async (e) => e.method === "sendMessage" ? "fail" : true;
        const d = await drainOutbox(env);
        const row = rowOf(env, ek);
        check("l8. attempts=6 + one more transient failure ⇒ dropped (bounded), claim failed/'outbox-exhausted', queue empty",
          d.drained === 0 && d.remaining === 0 && boxOf(env).length === 0 && row.state === "failed" && row.last_error === "outbox-exhausted");
      }

      // --- l9. OLD (pre-v13.232, no-dest) entries drain EXACTLY as before ---
      {
        const env = chanEnv();
        const prep = env.USERS_DB._prepCount;
        await env.STATE.put("pending_sends_v1", JSON.stringify([
          { text: "legacy private retry", chatId: 777, keyboard: null, sticker: null, ts: clockMs - 36e5, attempts: 0 }
        ]));
        dispatcher.onTelegram = async () => true;
        const d = await drainOutbox(env);
        check("l9. a legacy no-dest entry drains unchanged with ZERO channel D1 ops (the private queue is untouched by the hook)",
          d.drained === 1 && boxOf(env).length === 0 && env.USERS_DB._prepCount === prep);
      }

      // --- l10. the drain-side DEAD outcome (a queued channel entry whose
      //     retry hits the dead-chat regex) ⇒ unreachable + pause ---
      {
        const env = chanEnv();
        const ek = "match:l10|a|2026-11-08T16:00:match-start";
        await claimChannelEvent(env, channelDestinations(env)[0], ek);
        await recordChannelState(env, channelDestinations(env)[0], ek, "failed", "server-error");
        await env.STATE.put("pending_sends_v1", JSON.stringify([
          { text: "dead retry", chatId: CHAT_ID, keyboard: null, sticker: null, dest: { k: "fa-football", e: ek }, ts: clockMs - 36e5, attempts: 0 }
        ]));
        dispatcher.onTelegram = async (e) => e.chatId === Number(CHAT_ID) ? "dead" : true;
        const d = await drainOutbox(env);
        const row = rowOf(env, ek);
        const marker = markerOf(env);
        check("l10. the drain-side dead ⇒ claim 'unreachable'/'dead-chat' + the pause marker + the entry dropped",
          d.dead === 1 && row.state === "unreachable" && row.last_error === "dead-chat" && marker && marker.paused === true && boxOf(env).length === 0);
      }

      // --- l11. the drain-side PERMANENT failure ⇒ the entry is dropped
      //     (never 6 doomed attempts) + unreachable + pause ---
      {
        const env = chanEnv();
        const ek = "match:l11|a|2026-11-08T16:00:match-start";
        await claimChannelEvent(env, channelDestinations(env)[0], ek);
        await recordChannelState(env, channelDestinations(env)[0], ek, "failed", "server-error");
        await env.STATE.put("pending_sends_v1", JSON.stringify([
          { text: "need admin retry", chatId: CHAT_ID, keyboard: null, sticker: null, dest: { k: "fa-football", e: ek }, ts: clockMs - 36e5, attempts: 0 }
        ]));
        dispatcher.onTelegram = async () => ({ status: 400, description: "Bad Request: need administrator rights in the channel chat" });
        const d = await drainOutbox(env);
        const row = rowOf(env, ek);
        check("l11. a permanent class at the drain ⇒ policy 'permanent': entry dropped, claim unreachable, destination paused",
          d.drained === 0 && d.remaining === 0 && boxOf(env).length === 0 && row.state === "unreachable" && row.last_error === "need-administrator-rights" && markerOf(env).reason === "need-administrator-rights");
      }

      // --- l12. duplicate/out-of-order invocations: one channel post ---
      {
        const env = chanEnv();
        dispatcher.onTelegram = async () => true;
        const before = dispatcher.telegramSends.filter((s) => s.chatId === Number(CHAT_ID)).length;
        await mirrorChannelPost(env, "match:l12|a|2026-11-08T16:00:match-start", senderOf("dup"));
        await mirrorChannelPost(env, "match:l12|a|2026-11-08T16:00:match-start", senderOf("dup"));
        await mirrorChannelPost(env, "match:l12|a|2026-11-08T16:00:match-start", senderOf("dup"));
        check("l12. three invocations of the same event ⇒ exactly ONE channel send (the D1 claim is the fence)",
          dispatcher.telegramSends.filter((s) => s.chatId === Number(CHAT_ID)).length === before + 1);
      }

      // --- l13. the rate-limited admin page on a real pause transition ---
      {
        const env = chanEnv();
        dispatcher.onTelegram = async () => true;
        const pagesBefore = dispatcher.telegramSends.filter((s) => s.chatId === 92788333).length;
        clockMs += 31 * 60 * 1000; // clear the 30-min rate window from the earlier sections' transitions
        await markChannelPaused(env, "need-administrator-rights");
        const pagesAll = dispatcher.telegramSends.filter((s) => s.chatId === 92788333);
        const pages = pagesAll.length - pagesBefore;
        const pageText = (pagesAll[pagesAll.length - 1] || {}).text || "";
        check("l13a. a real pause transition pages the admin (the sanitized CLASS only — the alertPhaseError pattern)",
          pages === 1 && pageText.indexOf("need-administrator-rights") >= 0 && pageText.indexOf(CHAT_ID) < 0);
        clockMs += 5 * 60 * 1000; // INSIDE the 30-min rate limit
        await markChannelPaused(env, "chat-not-found");
        const pages2 = dispatcher.telegramSends.filter((s) => s.chatId === 92788333).length - pagesBefore;
        check("l13b. the page is rate-limited (a second transition within 30 min does not re-page)",
          pages2 === 1 && markerOf(env).reason === "chat-not-found");
        clockMs += 31 * 60 * 1000; // past the window
        await markChannelPaused(env, "bot-not-a-member");
        check("l13c. past the window a new transition pages again",
          dispatcher.telegramSends.filter((s) => s.chatId === 92788333).length - pagesBefore === 2);
      }

      // --- l14. classifyTelegramFailure — the pure fingerprint table ---
      {
        const T = [
          [429, "Too Many Requests", "rate-limited"],
          [500, "internal", "server-error"],
          [502, "bad gateway", "server-error"],
          [400, "Bad Request: chat not found", "chat-not-found"],
          [400, "Bad Request: need administrator rights in the channel chat", "need-administrator-rights"],
          [403, "Forbidden: bot is not a member of the channel chat", "bot-not-a-member"],
          [403, "Forbidden: bot was kicked from the supergroup chat", "bot-not-a-member"],
          [403, "Forbidden: bot was blocked by the user", "dead-chat"],
          [403, "Forbidden: user is deactivated", "dead-chat"],
          [400, "Bad Request: can't parse entities: bad character", "bad-request-markdown"],
          [400, "Bad Request: message is too long", "bad-request"],
          [0, "", "network"],
        ];
        for (const [st, body, cls] of T) {
          check("l14. classify(" + st + ", …) ⇒ '" + cls + "'", classifyTelegramFailure(st, body) === cls);
        }
        check("l14. isPermanentChannelClass: exactly the five permanent classes",
          isPermanentChannelClass("chat-not-found") && isPermanentChannelClass("need-administrator-rights") &&
          isPermanentChannelClass("bot-not-a-member") && isPermanentChannelClass("dead-chat") && isPermanentChannelClass("bad-request-markdown") &&
          !isPermanentChannelClass("rate-limited") && !isPermanentChannelClass("server-error") && !isPermanentChannelClass("network") &&
          !isPermanentChannelClass("bad-request") && !isPermanentChannelClass("transient") && !isPermanentChannelClass(null));
      }

      // --- l15. the stuck-claim reconciliation + the admin health surface ---
      {
        // unconfigured ⇒ zero ops
        const envOff2 = { STATE: makeStore(), USERS_DB: makeD1() };
        const snap0 = await channelHealthSnapshot(envOff2);
        check("l15a. unconfigured ⇒ {configured:false} with ZERO D1/KV ops",
          snap0.configured === false && envOff2.USERS_DB._prepCount === 0 && envOff2.STATE.getCount === 0);
        const sec0 = await channelStatusSection(envOff2);
        check("l15b. the /status section unconfigured ⇒ the single honest 'not configured' line",
          typeof sec0.text === "string" && sec0.text.indexOf("\u067E\u06CC\u06A9\u0631\u0628\u0646\u062F\u06CC") >= 0);
        // a populated ledger: 2 sent, 1 failed (in-flight — a dest entry
        // covers it), 1 claimed STUCK (41 min old, nothing covers it),
        // 1 unreachable recent
        const env = chanEnv();
        const d = channelDestinations(env)[0];
        const now = Date.now();
        for (const [ek, st] of [["match:s1|x:t:result", "sent"], ["digest:night:2026-11-07", "sent"]]) {
          await claimChannelEvent(env, d, ek);
          await recordChannelState(env, d, ek, st === "sent" ? "sent" : "failed", null);
        }
        await claimChannelEvent(env, d, "match:f1|x:t:match-start");
        await recordChannelState(env, d, "match:f1|x:t:match-start", "failed", "server-error"); // in-flight
        await env.STATE.put("pending_sends_v1", JSON.stringify([
          { text: "in flight", chatId: CHAT_ID, keyboard: null, sticker: null, dest: { k: "fa-football", e: "match:f1|x:t:match-start" }, ts: now, attempts: 1 }
        ]));
        const stuckRow = { claimed_at: now - 41 * 60 * 1000, sent_at: null, state: "claimed", attempts: 0, last_error: null };
        env.USERS_DB._tables.channel_posts_v1.set("fa-football\u0000match:st1|x:t:match-start", stuckRow); // an isolate-death residue — no outbox entry
        await claimChannelEvent(env, d, "match:u1|x:t:result");
        await recordChannelState(env, d, "match:u1|x:t:result", "unreachable", "need-administrator-rights");
        const snap = await channelHealthSnapshot(env);
        check("l15c. the snapshot counts: sent 2, failed 1, unreachable 1, claimed 1 (stuck) — sanitized (no ids/bodies)",
          snap.configured === true && snap.claims.sent === 2 && snap.claims.failed === 1 && snap.claims.unreachable === 1 && snap.claims.claimed === 1 &&
          JSON.stringify(snap).indexOf(CHAT_ID) < 0);
        check("l15d. the reconciliation: the in-flight (outbox-covered) claim is NOT stuck; the 41-min orphan IS (count 1, oldest ≈ 41 min)",
          snap.stuck.count === 1 && snap.stuck.oldestAgeMin >= 40 && snap.stuck.oldestAgeMin <= 42);
        check("l15e. lastErrorClass surfaces the newest class ('need-administrator-rights')",
          snap.lastErrorClass === "need-administrator-rights");
        check("l15f. lastSentAgeMin is computed from MAX(sent_at)", typeof snap.lastSentAgeMin === "number" && snap.lastSentAgeMin <= 2);
        // the at-most-once law: the stuck claim is NEVER re-sent — the
        // next hook invocation finds the row and skips
        const r = await claimChannelPost(env, "match:st1|x:t:match-start");
        check("l15g. a stuck claim is NEVER re-claimed/re-sent (the reconciliation is report-only — at-most-once)",
          r === null && env.USERS_DB._tables.channel_posts_v1.get("fa-football\u0000match:st1|x:t:match-start").state === "claimed");
        // the /status section renders the configured + stuck state
        const sec = await channelStatusSection(env);
        check("l15h. the /status section: active + pending count + the stuck warning line",
          sec.text.indexOf("\u0641\u0639\u0627\u0644") >= 0 && sec.text.indexOf("\u062F\u0631 \u0627\u0646\u062A\u0638\u0627\u0631") >= 0 && sec.text.indexOf("api/audit") >= 0);
        // paused section
        await markChannelPaused(env, "bot-not-a-member");
        const secP = await channelStatusSection(env);
        check("l15i. the /status section paused line carries the reason CLASS",
          secP.text.indexOf("\u0645\u062A\u0648\u0642\u0641") >= 0 && secP.text.indexOf("bot-not-a-member") >= 0);
        // the lazy stuck scan: a young ledger issues NO stuck-candidate SELECT
        const envYoung = chanEnv();
        await claimChannelEvent(envYoung, d, "match:y1|x:t:result");
        await recordChannelState(envYoung, d, "match:y1|x:t:result", "failed", "server-error");
        const prepYoung = envYoung.USERS_DB._prepCount;
        const snapYoung = await channelHealthSnapshot(envYoung);
        check("l15j. a young failed claim (< grace) issues no lazy stuck scan (exactly the 2 aggregate SELECTs)",
          snapYoung.stuck.count === 0 && envYoung.USERS_DB._prepCount === prepYoung + 2);
      }
    } finally {
      Date.now = RealDateNow;
      globalThis.setTimeout = RealSetTimeout;
    }
  }

  // ===== m) the budget re-measure — the REAL pipeline, configured vs unconfigured =====
  console.log("\n=== m. the v13.232 budget re-measure (REAL pipeline) ===");
  {
    // The DISCOVERY §8 estimates, re-measured: each scenario runs TWICE
    // through the REAL executeScheduledLogic (the full-worker harness —
    // the whole tick graph) against IDENTICAL fixtures/clocks; the only
    // difference is the channel [vars]. Assertions: ZERO delta while
    // unconfigured, and the documented envelopes while configured.
    const CHAN_ID_NUM = -1001234567890;
    const pngBuf = () => new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
    globalThis.renderCardPngCached = async () => pngBuf(); // the check-lifecycle stub (card.ts is not in the cron body)
    globalThis.cachedCardPng = async () => pngBuf();

    async function budgetRun(opts, configured) {
      const h = createFullWorker({ startMs: opts.ticks[0] });
      // 429/retry waits must terminate under the frozen tick clock: wrap
      // the harness's instant timer so every sleep advances the mock clock
      // (the real runtime's Date.now advances across I/O the same way).
      const harnessTimeout = globalThis.setTimeout;
      globalThis.setTimeout = (fn, ms) => harnessTimeout(() => { h.advance(ms || 0); fn(); }, 0);
      const kv = makeKV();
      const realD1 = makeMockD1();
      let kvPuts = 0, d1Channel = 0, d1Stmts = 0;
      const env = {
        STATE: {
          async get(k, a) { return kv.get(k, a); },
          async put(k, v, o) { kvPuts++; return kv.put(k, v, o); },
          async delete(k) { return kv.delete(k); }
        },
        USERS_DB: {
          prepare(sql) { d1Stmts++; if (String(sql).indexOf("channel_posts_v1") >= 0) d1Channel++; return realD1.prepare(sql); },
          async batch(stmts) { return realD1.batch(stmts); }
        },
        BOT_TOKEN: "test-token",
        CHAT_ID: "92788333",
        API_TOKEN: "fd-token",
        TEHRAN_TZ: "Asia/Tehran"
      };
      if (configured) {
        env.TELEGRAM_CHANNEL_CHAT_ID = String(CHAN_ID_NUM);
        env.TELEGRAM_CHANNEL_PUBLIC_URL = URL;
      }
      const fs = makeFetchDispatcher();
      globalThis.fetch = fs.dispatch;
      fs.clock = () => h.clockMs();
      opts.program(fs, h, configured);
      // the roster
      const joined = new Date(opts.ticks[0] - 30 * 864e5).toISOString();
      const UP = "INSERT INTO user_prefs (chat_id, teams, tz, lang, updated_at) VALUES (?1, ?2, ?3, ?4, ?5) ON CONFLICT(chat_id) DO UPDATE SET teams=excluded.teams, tz=excluded.tz, lang=excluded.lang, updated_at=excluded.updated_at";
      for (const c of opts.chats) {
        await realD1.prepare("INSERT OR IGNORE INTO chats (chat_id, joined_at) VALUES (?1, ?2)").bind(c.id, joined).run();
        await realD1.prepare(UP).bind(c.id, c.teams ? JSON.stringify(c.teams) : null, c.tz, c.lang, joined).run();
      }
      try {
        for (const t of opts.ticks) {
          h.setClock(t);
          await executeScheduledLogic(env);
        }
      } catch (e) {
        // a scenario bug — surface it loudly with the run's identity
        throw new Error("budgetRun(" + opts.name + (configured ? ",configured" : ",unconfigured") + ") tick threw: " + e.message);
      }
      const out = {
        kvPuts,
        d1Stmts,
        d1Channel,
        chanRows: realD1._tables.channel_posts_v1.size,
        chanSends: fs.telegramSends.filter((s) => s.chatId === CHAN_ID_NUM).length,
        allTg: fs.telegramSends.length,
        fetches: fs.calls.length
      };
      if (process.env.CHANNEL_BUDGET_DEBUG) {
        console.error("[budget:" + opts.name + (configured ? "+ch" : "") + "] " + JSON.stringify(out) +
          " rows=" + JSON.stringify([...realD1._tables.channel_posts_v1.entries()].map(([k, r]) => k.split("\u0000")[1] + ":" + r.state)));
      }
      globalThis.setTimeout = harnessTimeout;
      h.restore();
      return out;
    }

    // the shared provider surface: FD fixtures + CL standings (the
    // check-lifecycle shape — everything else 502s, a lean realistic world)
    function fdFixtures(fs, fixtures) {
      fs.handlers.push(
        {
          match: (u) => u.indexOf("api.football-data.org/v4/matches?") >= 0,
          handle: async () => fs.json({ matches: fixtures.map((f) => f()) })
        },
        {
          match: (u) => /api\.football-data\.org\/v4\/competitions\/([A-Z_]+)\/standings/.test(u),
          handle: async (u) => {
            const code = (u.match(/competitions\/([A-Z_]+)\/standings/) || [])[1];
            if (code !== "CL") return new Response("upstream", { status: 502 });
            return fs.json({
              season: { startDate: "2026-08-01", endDate: "2027-05-30" },
              standings: [{ table: [
                { position: 1, points: 9, team: { name: "Manchester City FC" } },
                { position: 2, points: 7, team: { name: "Real Madrid CF" } },
                { position: 3, points: 6, team: { name: "FC Bayern München" } },
                { position: 4, points: 5, team: { name: "Paris Saint-Germain" } }
              ] }]
            });
          }
        }
      );
    }
    const mk = (id, home, away, comp, iso, status, sc) => ({
      id, utcDate: new Date(iso).toISOString(), status, competition: { code: comp },
      homeTeam: { name: home, crest: "https://crests.example/a.png" },
      awayTeam: { name: away, crest: "https://crests.example/b.png" },
      score: sc ? { fullTime: { home: sc[0], away: sc[1] } } : null
    });

    // --- m1. QUIET: nothing in any window ⇒ ZERO delta, zero channel ops ---
    {
      const T0 = Date.parse("2026-11-10T12:00:00Z"); // a Tuesday noon
      const mkFar = () => mk(901, "Real Madrid CF", "FC Barcelona", "PD", "2026-11-15T20:00:00Z", "SCHEDULED", null);
      const opts = {
        name: "quiet",
        ticks: [T0, T0 + 10 * 60 * 1000],
        chats: [{ id: 92788333, tz: null, lang: "fa", teams: null }],
        program: (fs) => { fs.onTelegram = async () => true; fdFixtures(fs, [mkFar]); }
      };
      const off = await budgetRun(opts, false);
      const on = await budgetRun(opts, true);
      check("m1. quiet tick: ZERO delta while configured (KV writes, D1 statements, fetches, telegram sends all identical)",
        on.kvPuts === off.kvPuts && on.d1Stmts === off.d1Stmts && on.fetches === off.fetches && on.allTg === off.allTg);
      check("m1. quiet tick: ZERO channel D1 writes, ZERO channel sends, ZERO claim rows",
        on.d1Channel === 0 && on.chanSends === 0 && on.chanRows === 0);
    }

    // --- m2. NORMAL: one pre-match-24h reminder fires ---
    {
      const T0 = Date.parse("2026-11-10T12:00:00Z"); // match kicks off 2026-11-11T09:00Z — 21h away: inside the 20–24h window
      const mkM = () => mk(902, "Manchester City FC", "Paris Saint-Germain", "CL", "2026-11-11T09:00:00Z", "SCHEDULED", null);
      const opts = {
        name: "normal-1-reminder",
        // tick 1 populates the pool (the long-view recovery burns the fan-out
        // budget — the unit defers, exactly the live pattern); tick 2 is a
        // cheap cached-pool tick and the deferred unit fires
        ticks: [T0, T0 + 10 * 60 * 1000],
        chats: [
          { id: 92788333, tz: null, lang: "fa", teams: null },
          { id: 101088217, tz: null, lang: "fa", teams: ["Manchester City FC"] }
        ],
        program: (fs) => { fs.onTelegram = async () => true; fdFixtures(fs, [mkM]); }
      };
      const off = await budgetRun(opts, false);
      const on = await budgetRun(opts, true);
      check("m2. normal 1-reminder tick: the private sends are IDENTICAL configured vs not (isolation)",
        on.allTg - on.chanSends === off.allTg);
      check("m2. the channel adds exactly ONE post (the fa card path) + 2 D1 writes (claim+sent) + 0 KV writes",
        on.chanSends >= 1 && on.chanSends <= 2 && on.d1Channel === 2 && on.chanRows === 1 && on.kvPuts === off.kvPuts);
      check("m2. the fetch delta stays inside the +2 reservation envelope (fanoutFetchCost +2 per unit)",
        on.fetches - off.fetches >= 1 && on.fetches - off.fetches <= 2);
    }

    // --- m3. MATCH-NIGHT: 2 simultaneous kickoffs + HT + 2 results ---
    {
      const T0 = Date.parse("2026-11-10T18:40:00Z");
      const KO1 = "2026-11-10T19:00:00Z", KO2 = "2026-11-10T19:00:00Z";
      const state = { phase: 0 }; // 0=pre 1=live 2=ht 3=ft
      const mkM1 = () => {
        const s = state.phase === 0 ? ["SCHEDULED", null] : state.phase === 1 ? ["IN_PLAY", [1, 0]] : state.phase === 2 ? ["PAUSED", [1, 1]] : ["FINISHED", [2, 1]];
        return mk(903, "Manchester City FC", "Paris Saint-Germain", "CL", KO1, s[0], s[1]);
      };
      const mkM2 = () => {
        const s = state.phase === 0 ? ["SCHEDULED", null] : state.phase >= 3 ? ["FINISHED", [3, 0]] : ["IN_PLAY", [1, 0]];
        return mk(904, "FC Bayern München", "LASK Linz", "CL", KO2, s[0], s[1]);
      };
      const opts = {
        name: "match-night",
        // 18:40 warm-up (pool recovery — nothing in-window), 19:05 the two
        // kickoffs, 19:30 the HT, 20:50 FINISHED (a full-sweep tick may
        // defer the result units — the real kickoff-drain chain delivers
        // them; the harness models it with the 21:00 retry tick)
        ticks: [T0, T0 + 25 * 60 * 1000, T0 + 50 * 60 * 1000, T0 + 130 * 60 * 1000, T0 + 140 * 60 * 1000],
        chats: [
          { id: 92788333, tz: null, lang: "fa", teams: null },
          { id: 101088217, tz: null, lang: "fa", teams: ["Manchester City FC"] }
        ],
        program: (fs, h) => {
          fs.onTelegram = async () => true;
          fdFixtures(fs, [mkM1, mkM2]);
          const orig = fs.handlers[0];
          // advance the fixture phase per tick (the handlers close over
          // state.phase; the tick loop bumps it via the clock)
          fs.handlers[0] = {
            match: orig.match,
            handle: async (u, i) => {
              const t = h.clockMs();
              state.phase = t < Date.parse(KO1) ? 0 : t < Date.parse(KO1) + 25 * 60 * 1000 ? 1 : t < Date.parse(KO1) + 50 * 60 * 1000 ? 2 : 3;
              return orig.handle(u, i);
            }
          };
        }
      };
      const off = await budgetRun(opts, false);
      const on = await budgetRun(opts, true);
      // events: 2 match-start (M1 collapses with -big) + 1 HT (M1 master) + 2 results = 5
      // (d1Channel counts PREPARED statements: 5×2 effective + the stage
      // collapse's idempotent re-claims — honest D1-op metering)
      check("m3. match-night: the channel events stay inside the documented envelope (≤6 events incl. the night digest ⇒ ≤13 D1 channel ops incl. the collapse no-ops)",
        on.chanRows >= 5 && on.chanRows <= 6 && on.d1Channel <= 13 && on.d1Channel >= 8);
      check("m3. match-night: the KV-write delta ≤ 3 (the result composers' standings snapshots — the measured correction to DISCOVERY §8's 0)",
        on.kvPuts - off.kvPuts >= 0 && on.kvPuts - off.kvPuts <= 3);
      check("m3. match-night: the channel fetch delta ≤ 9 (cards/dice/text per event, within the +2-per-unit reservations)",
        on.fetches - off.fetches >= 4 && on.fetches - off.fetches <= 9);
      check("m3. match-night: the private sends are unchanged configured vs not",
        on.allTg - on.chanSends === off.allTg);
    }

    // --- m4. UCL NIGHT: preview + 2 kickoffs + results + the night digest ---
    {
      const T0 = Date.parse("2026-11-10T12:30:00Z"); // the warm-up: pool recovery (the 24h backfill defers here)
      const KO = "2026-11-10T19:00:00Z"; // 22:30 Tehran — a clean same-date Tehran matchday (the preview + the night digest dateKey both key on it)
      const state = { phase: 0 };
      const mkA = () => {
        const s = state.phase === 0 ? ["SCHEDULED", null] : state.phase === 1 ? ["IN_PLAY", [0, 0]] : ["FINISHED", [1, 0]];
        return mk(905, "Manchester City FC", "Paris Saint-Germain", "CL", KO, s[0], s[1]);
      };
      const mkB = () => {
        const s = state.phase === 0 ? ["SCHEDULED", null] : state.phase === 1 ? ["IN_PLAY", [0, 0]] : ["FINISHED", [2, 2]];
        return mk(906, "FC Bayern München", "Real Madrid CF", "CL", KO, s[0], s[1]);
      };
      const opts = {
        name: "ucl-night",
        // 12:30 warm-up (pool recovery; the missed 24h window backfills),
        // 13:40 the preview (inside [KO−6h, KO−10min] on a cheap tick) +
        // the deferred 24h backfills, 19:05 both kickoffs (live sweep),
        // 21:10 FINISHED (a heavy tick may defer the result units — the
        // 21:20 retry models the kickoff-drain chain) + the night digest
        // (00:50 Tehran, the 11-10 matchday over, UCL night)
        ticks: [T0, Date.parse("2026-11-10T13:40:00Z"), Date.parse("2026-11-10T19:05:00Z"), Date.parse("2026-11-10T21:10:00Z"), Date.parse("2026-11-10T21:20:00Z")],
        chats: [{ id: 92788333, tz: null, lang: "fa", teams: null }],
        program: (fs, h) => {
          fs.onTelegram = async () => true;
          fdFixtures(fs, [mkA, mkB]);
          const orig = fs.handlers[0];
          fs.handlers[0] = {
            match: orig.match,
            handle: async (u, i) => {
              const t = h.clockMs();
              state.phase = t < Date.parse(KO) - 10 * 60 * 1000 ? 0 : t < Date.parse(KO) + 120 * 60 * 1000 ? 1 : 2;
              return orig.handle(u, i);
            }
          };
        }
      };
      const off = await budgetRun(opts, false);
      const on = await budgetRun(opts, true);
      // events: 2 pre-match-24h (backfill) + uclnight preview + 2 match-start + 2 results + night digest = 8
      // (d1Channel includes the stage-collapse's idempotent re-claims)
      check("m4. UCL night: the channel events stay inside the documented envelope (≤8 events ⇒ ≤18 D1 channel ops incl. the collapse no-ops)",
        on.chanRows >= 6 && on.chanRows <= 8 && on.d1Channel <= 18);
      check("m4. UCL night: the KV-write delta ≤ 3 (the result composers' standings snapshots — the measured DISCOVERY §8 correction)",
        on.kvPuts - off.kvPuts >= 0 && on.kvPuts - off.kvPuts <= 3);
      check("m4. UCL night: the channel fetch delta ≤ 14 (the DISCOVERY §8 envelope)",
        on.fetches - off.fetches >= 5 && on.fetches - off.fetches <= 14);
      check("m4. UCL night: the private sends are unchanged configured vs not",
        on.allTg - on.chanSends === off.allTg);
    }

    // --- m5. WEEKLY MONDAY: the private weekly burst + the channel burst ---
    {
      // Monday 02:00 Tehran = Sunday 22:30Z (the WEEKLY_TABLES window)
      const T0 = Date.parse("2026-11-15T22:30:00Z"); // a Sunday 22:30Z = Monday 02:00+ Tehran
      const opts = {
        name: "weekly-monday",
        ticks: [T0, T0 + 10 * 60 * 1000, T0 + 20 * 60 * 1000],
        chats: [{ id: 92788333, tz: null, lang: "fa", teams: null }],
        program: (fs) => {
          fs.onTelegram = async () => true;
          // the fixture sits ~5 days out — inside the week-ahead horizon but
          // OUTSIDE every notification window (the 72h window of an earlier
          // draft accidentally fired an extra channel event)
          fdFixtures(fs, [() => mk(907, "Manchester City FC", "Paris Saint-Germain", "CL", "2026-11-20T20:00:00Z", "SCHEDULED", null)]);
        }
      };
      const off = await budgetRun(opts, false);
      const on = await budgetRun(opts, true);
      check("m5. weekly Monday: the channel burst lands ONE edition (chanRows 1, ≤2+2 D1 channel writes)",
        on.chanRows === 1 && on.d1Channel <= 4 && on.d1Channel >= 2);
      check("m5. weekly Monday: the channel sends ≤ 5 (the fa payload group's [sticker][table] + week-ahead)",
        on.chanSends >= 1 && on.chanSends <= 5);
      check("m5. weekly Monday: the KV-write delta ≤ 2 (the burst itself writes NO KV — claims are D1)",
        on.kvPuts - off.kvPuts >= 0 && on.kvPuts - off.kvPuts <= 2);
      check("m5. weekly Monday: the private sends are unchanged configured vs not",
        on.allTg - on.chanSends === off.allTg);
    }
  }

  console.log(failed ? failed + " FAILURES" : "channel-mirror OK");
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error("FAIL harness error: " + e.message + "\n" + e.stack); process.exit(1); });

function destT2() { return { key: "fa-football", chatId: "-1001234567890", locale: "fa", sport: "football", enabled: true }; }
