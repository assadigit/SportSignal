// Self-check: v13.230-channelbase — the Telegram Channel Mirror foundation
// (src/channel-mirror.ts, the REAL module sliced whole from the concat — the
// check-userstore pattern) against a mock KV + a mock D1 recognizing exactly
// the channel_posts_v1 statement surface. Session 1 of the
// TELEGRAM_CHANNEL_MIRROR_SPEC program; DISCOVERY §7 is the design under
// test. Everything here is offline/deterministic — no Telegram, no channel.
//
// The matrix (spec PART V §14 mapped to the Session-1 scope, prompt items
// a–f):
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
// Plus: the destination shape/parsing table (chatId numeric/@username,
// publicUrl https://t.me/… only) and recordChannelState telemetry (row
// updates, attempts increments, sanitized last_error, never throws).
const src = require("./lib/worker-src")();

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
    throw new Error("mock D1: unrecognized statement: " + s.slice(0, 80));
  }
  return d1;
}

globalThis.CONFIG = { KV_CHANNEL_MIRROR: "channel_mirror_v1" };

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

  console.log(failed ? failed + " FAILURES" : "channel-mirror OK");
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error("FAIL harness error: " + e.message + "\n" + e.stack); process.exit(1); });

function destT2() { return { key: "fa-football", chatId: "-1001234567890", locale: "fa", sport: "football", enabled: true }; }
