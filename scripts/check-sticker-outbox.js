// check-sticker-outbox.js — v13.125-stickeroutbox: a table that recovers
// through the outbox must recover WITH its logo — the [sticker][table] pair
// travels as ONE unit.
//
// The incident this guards against (live, 2026-10-19): the weekly digest's
// texts failed into the outbox mid-roster; the 23:10 UTC drain then
// delivered the tail chats' league tables as BARE texts — outboxPush had
// no sticker field, drainOutbox is text-only by construction, and
// sendSticker failures were silently dropped. The owner saw sticker-less
// tables on the test account.
//
// Scenario matrix (REAL worker modules via the full-worker harness; the
// fetch dispatcher captures every Telegram call):
//   1) healthy burst: exact [sticker][text] order, stickers counted, no pairs
//   2) transient sticker failure: the pair is OUTBOXED, the table is NOT
//      sent bare in the burst; the entry carries {sticker, footered text}
//   3) drain with the pair, sticker fails AGAIN: the text still goes out
//      (the payload rule) — the entry is consumed, not requeued
//   4) drain with the pair, sticker OK + text FAILS: requeued WITHOUT the
//      sticker (a retry can never duplicate the logo) — next drain is
//      text-only for that entry
//   5) drain with the pair, sticker DEAD: counted dead, the text skipped
//   6) legacy entry (pre-13.125, no sticker field): text-only, no
//      sendSticker call (backwards compatibility)
//   7) the outbox itself is down (10048 quota-death): outboxPush returns
//      false and the burst falls back to the BARE direct send (a table
//      must not die with its flourish)
//   8) source-level: sendLeagueTables (the /tables command path) carries
//      the same pair-outbox block
const path = require("path");
const { makeKV, makeD1, makeFetchDispatcher } = require("./lib/mock-env");
const createHarness = require("./lib/full-worker");
const fs = require("fs");

let failed = 0;
const check = (name, cond) => {
  console.log((cond ? "OK   " : "FAIL ") + name);
  if (!cond) failed++;
};

(async () => {
  const T0 = Date.parse("2026-10-19T01:00:00Z");
  const h = createHarness({ startMs: T0 });
  const fetchState = makeFetchDispatcher();
  globalThis.fetch = fetchState.dispatch;

  // Per-scenario Telegram verdicts. Default: everything succeeds.
  // failSticker: set of chat ids whose sendSticker calls 500 (transient);
  // deadSticker: chat ids whose sendSticker calls 403 "blocked";
  // failText: chat ids whose sendMessage calls 500.
  const prog = { failSticker: new Set(), deadSticker: new Set(), failText: new Set() };
  fetchState.onTelegram = async (entry) => {
    if (entry.method === "sendSticker") {
      if (prog.deadSticker.has(entry.chatId)) return "dead";
      if (prog.failSticker.has(entry.chatId)) return "fail";
      return;
    }
    if (entry.method === "sendMessage" && prog.failText.has(entry.chatId)) return "fail";
    return;
  };

  const baseEnv = () => ({
    STATE: makeKV(),
    USERS_DB: makeD1(),
    BOT_TOKEN: "test-token",
    CHAT_ID: "100",
    TEHRAN_TZ: "Asia/Tehran",
    API_TOKEN: "fd-token"
  });

  const sendsFor = (chat) => fetchState.telegramSends.filter((e) => e.chatId === chat);
  // The senders RETRY (sendSticker ×2, sendMessage ×3) — the dispatcher
  // records every ATTEMPT. Compress runs so assertions see the logical
  // call sequence, not the retry echo.
  const seqOf = (chat) => {
    const s = sendsFor(chat).map((e) => e.method).join(",");
    return s.replace(/(\w+)(,\1)+/g, "$1");
  };

  // ===== 1) healthy burst: exact [sticker][text] order =====
  {
    const env = baseEnv();
    const group = {
      tables: [
        { code: "PD", text: "T-PD", sticker: "FID-PD" },
        { code: "CL", text: "T-CL", sticker: null }
      ],
      weekAhead: "T-WEEKAHEAD"
    };
    const out = await serveWeeklyBurst(env, 101, group);
    const seq = sendsFor(101).map((e) => e.method + (e.payload.sticker ? "(logo)" : ""));
    check("1a healthy burst: [sendSticker][sendMessage] per stickered table, plain for the rest, week-ahead last",
      seq.join(",") === "sendSticker(logo),sendMessage,sendMessage,sendMessage", seq.join(","));
    check("1b counters: sent=3 stickers=1 pairs=0", out.sent === 3 && out.stickers === 1 && (out.pairs || 0) === 0);
    check("1c the stickered table text follows the logo (order preserved)",
      sendsFor(101)[1].text.indexOf("T-PD") >= 0 && sendsFor(101)[0].payload.sticker === "FID-PD");
  }

  // ===== 2) transient sticker failure → the PAIR is outboxed =====
  {
    const env = baseEnv();
    prog.failSticker.add(202);
    const group = {
      tables: [
        { code: "PD", text: "T-PD", sticker: "FID-PD" },
        { code: "CL", text: "T-CL", sticker: null }
      ],
      weekAhead: "T-WEEKAHEAD"
    };
    const out = await serveWeeklyBurst(env, 202, group);
    const sm = sendsFor(202).filter((e) => e.method === "sendMessage");
    check("2a the stickered table was NOT sent bare in the burst (non-stickered table + week-ahead direct, T-PD never direct)",
      sm.length === 2 && sm.some((e) => e.text.indexOf("T-CL") >= 0) && sm.some((e) => e.text.indexOf("T-WEEKAHEAD") >= 0) && !sm.some((e) => e.text.indexOf("T-PD") >= 0),
      JSON.stringify(sm.map((e) => e.text.slice(0, 30))));
    check("2b counters: pairs=1 (the deferred pair), sent=2, stickers=0",
      out.pairs === 1 && out.sent === 2 && out.stickers === 0);
    const box = await env.STATE.get("pending_sends_v1", "json");
    check("2c the outbox entry carries BOTH the sticker and the FOOTERED text",
      box.length === 1 && box[0].sticker === "FID-PD" && box[0].chatId === 202 &&
      box[0].text === withTrialFooter("T-PD", 4096, true),
      JSON.stringify(box));
    prog.failSticker.clear();
  }

  // ===== 3) drain: the pair, sticker fails AGAIN → text still delivered =====
  {
    const env = baseEnv();
    prog.failSticker.add(303);
    await outboxPush(env, withTrialFooter("T-PD", 4096, true), 303, null, "FID-PD");
    h.advance(61e3); // past the 1m first backoff
    const dr = await drainOutbox(env);
    const seq = seqOf(303);
    check("3a the drain attempted the logo FIRST, then delivered the text bare (payload rule)",
      seq === "sendSticker,sendMessage" && sendsFor(303).some((e) => e.method === "sendMessage" && e.text.indexOf("T-PD") >= 0), seq);
    check("3b drained=1, not requeued (consumed, no infinite pair loop)",
      dr.drained === 1 && dr.remaining === 0);
    prog.failSticker.clear();
  }

  // ===== 4) drain: sticker OK + text fails → requeued WITHOUT the sticker =====
  {
    const env = baseEnv();
    prog.failText.add(404);
    await outboxPush(env, withTrialFooter("T-PD", 4096, true), 404, null, "FID-PD");
    h.advance(61e3);
    const dr = await drainOutbox(env);
    check("4a the pair drained its logo, the text failed once (drained=0, remaining=1)",
      dr.drained === 0 && dr.remaining === 1, JSON.stringify(dr));
    const box = await env.STATE.get("pending_sends_v1", "json");
    check("4b the requeued entry NO LONGER carries the sticker (no duplicate logo on retry)",
      box.length === 1 && box[0].sticker == null && box[0].attempts === 1);
    prog.failText.clear(); // the retry drain must SUCCEED — 4c is about the shape, not the failure
    const before = sendsFor(404).length;
    h.advance(12e4 + 61e3); // past the 2m second backoff
    const dr2 = await drainOutbox(env);
    const after = sendsFor(404).slice(before);
    check("4c the retry is TEXT-ONLY for that entry (no second sendSticker)",
      dr2.drained === 1 && after.filter((e) => e.method === "sendSticker").length === 0 && after.some((e) => e.method === "sendMessage"),
      JSON.stringify(after.map((e) => e.method)));
    prog.failText.clear();
  }

  // ===== 5) drain: sticker DEAD → dead, the text skipped =====
  {
    const env = baseEnv();
    prog.deadSticker.add(505);
    await outboxPush(env, withTrialFooter("T-PD", 4096, true), 505, null, "FID-PD");
    h.advance(61e3);
    const dr = await drainOutbox(env);
    const calls = seqOf(505);
    check("5a a dead chat at the sticker stage counts dead and sends NO text",
      dr.dead === 1 && dr.drained === 0 && calls === "sendSticker", calls);
    prog.deadSticker.clear();
  }

  // ===== 6) legacy entry (no sticker field) → text-only, untouched =====
  {
    const env = baseEnv();
    await outboxPush(env, "legacy text", 606, null); // no 5th arg — pre-13.125 shape
    h.advance(61e3);
    const dr = await drainOutbox(env);
    const calls = seqOf(606);
    check("6a a pre-13.125 entry drains text-only (backwards compatible)",
      dr.drained === 1 && calls === "sendMessage" && sendsFor(606).some((e) => e.text.indexOf("legacy") >= 0),
      calls);
  }

  // ===== 7) the outbox itself is down → burst falls back to the bare send =====
  {
    const env = baseEnv();
    // 10048 quota-death: every put on the outbox key rejects.
    const quota = {
      get: env.STATE.get.bind(env.STATE),
      put: (k, v, o) => (k === "pending_sends_v1" ? Promise.reject(new Error("KV put() limit exceeded for the day")) : env.STATE.put(k, v, o)),
      delete: env.STATE.delete.bind(env.STATE)
    };
    const dead = { ...env, STATE: quota };
    prog.failSticker.add(707);
    const group = { tables: [{ code: "PD", text: "T-PD", sticker: "FID-PD" }], weekAhead: null };
    const out = await serveWeeklyBurst(dead, 707, group);
    const seq = seqOf(707);
    check("7a outboxPush reports the failure (pairs=0) and the table goes out BARE (payload beats flourish)",
      out.pairs === 0 && out.sent === 1 && seq === "sendSticker,sendMessage" && sendsFor(707).some((e) => e.method === "sendMessage" && e.text.indexOf("T-PD") >= 0),
      JSON.stringify({ out, seq }));
    prog.failSticker.clear();
  }

  // ===== 8) source-level: sendLeagueTables (/tables command) carries the pairing =====
  {
    const src = fs.readFileSync(path.join(__dirname, "..", "src", "digest-weekly.ts"), "utf8");
    const leagueBlock = src.slice(src.indexOf("export async function sendLeagueTables"), src.indexOf("export async function buildWeekAheadMessage"));
    check("8a sendLeagueTables outboxes the pair on a failed sticker",
      /outboxPush\(env, withTrialFooter\(m\.text/.test(leagueBlock) && /out\.pairs/.test(leagueBlock) && /continue;/.test(leagueBlock));
    check("8b a dead sticker falls through to the text send (no pair for a dead chat)",
      /r !== "dead"/.test(leagueBlock));
  }

  h.restore();
  console.log(failed ? `\nFAIL check-sticker-outbox: ${failed} failure(s)` : "\n✅ check-sticker-outbox: ALL PASS");
  process.exit(failed ? 1 : 0);
})().catch((e) => {
  console.error("check-sticker-outbox crashed:", e);
  process.exit(1);
});
