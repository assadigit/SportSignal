// check-pervchat.js — v13.102-perchat: the PER-CHAT DELIVERY LEDGER, the
// per-chat audit pass and the repair leg, exercised against the REAL worker
// modules (the full-worker harness evals the whole cron graph once; the mock
// D1 implements the exact USERS_DB statement surface, the mock KV carries
// TTL semantics, Telegram sends are captured by the fetch dispatcher).
//
// The scenario matrix:
//   ledger round-trip (record → fetch, verdicts preserved)
//   repair marker: first attempt ok, second NO (write-first, once-ever)
//   audit: a follower chat missing its row → per-chat gap (paged once / 6h)
//   audit: complete coverage → no gaps
//   audit: a chat that joined AFTER the stage → not expected
//   audit: pre-epoch records → not audited (no false gaps after deploy)
//   audit: 'failed' rows → NOT a page-gap (the outbox owns recovery)
//   audit: match-start/match-start-big equivalence group (follower served
//          by the regular type, non-follower by the broadcast — one group)
//   repair: in-window gap → re-sent to exactly the missing chat, with the
//          late tag + promo footer; marker + 'sent' row written
//   repair: second pass → NO re-send (the marker blocks it)
//   repair: out-of-window → no send (reported only)
const path = require("path");
const { makeKV, makeD1, makeFetchDispatcher } = require("./lib/mock-env");
const createHarness = require("./lib/full-worker");

let failed = 0;
const check = (name, cond) => {
  console.log((cond ? "OK   " : "FAIL ") + name);
  if (!cond) failed++;
};

(async () => {
  const T0 = Date.parse("2026-10-20T18:00:00Z"); // a Tuesday evening
  const h = createHarness({ startMs: T0 });
  globalThis.fetchState = makeFetchDispatcher();
  globalThis.fetch = globalThis.fetchState.dispatch;

  // --- the world: 4 chats, admin + fa followers + an en follower + a
  // Liverpool-only fan (a non-follower for City-PSG). All joined long ago.
  const env = {
    STATE: makeKV(),
    USERS_DB: makeD1(),
    BOT_TOKEN: "test-token",
    CHAT_ID: "100",
    TEHRAN_TZ: "Asia/Tehran",
    API_TOKEN: "fd-token"
  };
  const joined = new Date(T0 - 30 * 864e5).toISOString();
  const mkMatch = (home, away, iso, status, comp) => ({
    id: 1, utcDate: iso, status: status || "SCHEDULED",
    competition: { code: comp || "CL" },
    homeTeam: { name: home, crest: null }, awayTeam: { name: away, crest: null },
    score: { fullTime: { home: null, away: null } }
  });
  for (const id of [100, 201, 202, 203]) {
    await env.USERS_DB.prepare("INSERT OR IGNORE INTO chats (chat_id, joined_at) VALUES (?1, ?2)").bind(id, joined).run();
    await env.USERS_DB.prepare("INSERT INTO chat_profiles (chat_id, username, first_name, title, joined, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)")
      .bind(id, null, "u" + id, null, joined, joined).run();
  }
  // prefs: 201 follows nothing explicit (master fallback → follower),
  // 202 is en + master fallback, 203 follows ONLY Liverpool (non-follower
  // for a City-PSG clash).
  await env.USERS_DB.prepare("INSERT INTO user_prefs (chat_id, teams, tz, lang, updated_at) VALUES (?1, ?2, ?3, ?4, ?5) ON CONFLICT(chat_id) DO UPDATE SET teams=excluded.teams, tz=excluded.tz, lang=excluded.lang, updated_at=excluded.updated_at")
    .bind(203, JSON.stringify(["Liverpool FC"]), null, "fa", joined).run();
  await env.USERS_DB.prepare("INSERT INTO user_prefs (chat_id, teams, tz, lang, updated_at) VALUES (?1, ?2, ?3, ?4, ?5) ON CONFLICT(chat_id) DO UPDATE SET teams=excluded.teams, tz=excluded.tz, lang=excluded.lang, updated_at=excluded.updated_at")
    .bind(202, JSON.stringify([]), null, "en", joined).run();

  const cityPsg = mkMatch("Manchester City FC", "Paris Saint-Germain", "2026-10-20T21:00:00Z");
  const key = matchKey(cityPsg);

  // ===== 1) ledger round-trip =====
  check("recordDeliveries writes rows (batch, real SQL surface)", await recordDeliveries(env, cityPsg, "pre-match-24h", [{ chatId: 100, verdict: "sent" }, { chatId: 201, verdict: "sent" }]));
  const ledger1 = await fetchDeliveryLedger(env);
  check("fetchDeliveryLedger round-trips verdicts", ledger1[key + "|pre-match-24h"] && ledger1[key + "|pre-match-24h"].get(100) === "sent" && ledger1[key + "|pre-match-24h"].get(201) === "sent");
  check("ledger read is scoped by sent_at (48h default window)", (await fetchDeliveryLedger(env, Date.now() + 1))[key + "|pre-match-24h"] === undefined);

  // ===== 2) repair marker: once ever, fail-closed =====
  // (203 — a DIFFERENT chat than the audit scenarios below, so the marker
  // row never interferes with the missing-row assertions.)
  check("markDeliveryRepair: first attempt persists", await markDeliveryRepair(env, cityPsg, "pre-match-24h", 203));
  check("markDeliveryRepair: second attempt is a no-op (once ever)", !(await markDeliveryRepair(env, cityPsg, "pre-match-24h", 203)));
  const dFail = makeD1({ failWrites: true });
  check("markDeliveryRepair: write failure → false (fail-closed)", !(await markDeliveryRepair({ ...env, USERS_DB: dFail }, cityPsg, "pre-match-24h", 999)));

  // ===== 3) audit: the missing follower chat is reported =====
  // notified record AFTER the epoch; rows exist for 100+201 but not 202 → gap.
  await env.USERS_DB.prepare("INSERT OR IGNORE INTO notified_v1 (match_key, ntype, notified_at, expires_at, match_date) VALUES (?1, ?2, ?3, ?4, ?5)")
    .bind(key, "pre-match-24h", Date.now(), Date.now() + 36e5, "2026-10-20T21:00:00Z").run();
  const audit1 = await auditNotifications(env, [cityPsg]);
  check("audit: missing follower chat (202) reported as per-chat gap", audit1.perChatGaps.length === 1 && audit1.perChatGaps[0].missing.includes(202) && audit1.perChatGaps[0].ntype === "pre-match-24h" && !audit1.perChatGaps[0].missing.includes(203));
  check("audit: the admin page for per-chat gaps fired once (6h rate limit)", (() => {
    const sent = globalThis.fetchState.telegramSends.filter((s) => s.method === "sendMessage" && s.chatId === 100 && s.text.includes("تحویل"));
    return sent.length === 1;
  })());
  // second audit run within 6h: gap still reported, page NOT re-sent
  const audit1b = await auditNotifications(env, [cityPsg]);
  check("audit: gap persists but the admin page is rate-limited (6h)", audit1b.perChatGaps.length === 1 && globalThis.fetchState.telegramSends.filter((s) => s.chatId === 100 && s.text.includes("تحویل")).length === 1);

  // ===== 4) complete coverage → no gaps =====
  await recordDeliveries(env, cityPsg, "pre-match-24h", [{ chatId: 202, verdict: "sent" }]);
  const audit2 = await auditNotifications(env, [cityPsg]);
  check("audit: complete follower coverage → no per-chat gaps", audit2.perChatGaps.length === 0);

  // ===== 5) a chat that joined AFTER the stage is not expected =====
  const lateJoiner = 999;
  await env.USERS_DB.prepare("INSERT OR IGNORE INTO chats (chat_id, joined_at) VALUES (?1, ?2)").bind(lateJoiner, new Date(Date.now() + 7200e3).toISOString()).run();
  await env.USERS_DB.prepare("INSERT INTO chat_profiles (chat_id, username, first_name, title, joined, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)")
    .bind(lateJoiner, null, "late", null, new Date(Date.now() + 7200e3).toISOString(), new Date(Date.now() + 7200e3).toISOString()).run();
  const audit3 = await auditNotifications(env, [cityPsg]);
  check("audit: a chat that joined after the stage is not a gap", audit3.perChatGaps.length === 0);

  // ===== 6) pre-epoch records are not audited =====
  const oldMatch = mkMatch("Arsenal FC", "Chelsea FC", "2026-10-10T20:00:00Z", "FINISHED");
  const oldKey = matchKey(oldMatch);
  await env.USERS_DB.prepare("INSERT OR IGNORE INTO notified_v1 (match_key, ntype, notified_at, expires_at, match_date) VALUES (?1, ?2, ?3, ?4, ?5)")
    .bind(oldKey, "result", Date.parse("2026-10-11T01:00:00Z"), Date.parse("2026-10-12T01:00:00Z"), "2026-10-10T20:00:00Z").run();
  const audit4 = await auditNotifications(env, [oldMatch, cityPsg]);
  check("audit: pre-epoch (pre-deploy) records are never per-chat gaps", audit4.perChatGaps.length === 0);

  // ===== 7) 'failed' rows are not page-gaps (the outbox owns them) =====
  const failMatch = mkMatch("Real Madrid CF", "FC Barcelona", "2026-10-20T20:00:00Z");
  const failKey = matchKey(failMatch);
  await env.USERS_DB.prepare("INSERT OR IGNORE INTO notified_v1 (match_key, ntype, notified_at, expires_at, match_date) VALUES (?1, ?2, ?3, ?4, ?5)")
    .bind(failKey, "pre-match-3h", Date.now(), Date.now() + 36e5, "2026-10-20T20:00:00Z").run();
  await recordDeliveries(env, failMatch, "pre-match-3h", [
    { chatId: 100, verdict: "sent" }, { chatId: 201, verdict: "sent" }, { chatId: 202, verdict: "failed" }
  ]);
  const audit5 = await auditNotifications(env, [failMatch, cityPsg]);
  check("audit: a 'failed' row is not a page-gap (outbox-owned recovery)", audit5.perChatGaps.length === 0);

  // ===== 8) the match-start / match-start-big equivalence group =====
  // A LIVE master big-match (kickoff 20min ago, IN_PLAY): the match-start
  // window is open, so the repair leg is eligible too.
  const koMatch = mkMatch("Inter Milan", "AC Milan", new Date(Date.now() - 20 * 6e4).toISOString(), "IN_PLAY");
  const koKey = matchKey(koMatch);
  await env.USERS_DB.prepare("INSERT OR IGNORE INTO notified_v1 (match_key, ntype, notified_at, expires_at, match_date) VALUES (?1, ?2, ?3, ?4, ?5)")
    .bind(koKey, "match-start", Date.now(), Date.now() + 2 * 36e5, "2026-10-20T19:00:00Z").run();
  await env.USERS_DB.prepare("INSERT OR IGNORE INTO notified_v1 (match_key, ntype, notified_at, expires_at, match_date) VALUES (?1, ?2, ?3, ?4, ?5)")
    .bind(koKey, "match-start-big", Date.now(), Date.now() + 2 * 36e5, "2026-10-20T19:00:00Z").run();
  await recordDeliveries(env, koMatch, "match-start", [
    { chatId: 100, verdict: "sent" }, { chatId: 201, verdict: "sent" }, { chatId: 202, verdict: "sent" }
  ]);
  // 203 (Liverpool-only) is a NON-follower → served by match-start-big; no
  // row for it → the group check must report it missing.
  const audit6 = await auditNotifications(env, [koMatch, cityPsg, failMatch]);
  check("audit: non-follower missing the -big broadcast row is a group gap", audit6.perChatGaps.length === 1 && audit6.perChatGaps[0].missing.includes(203) && audit6.perChatGaps[0].ntype === "match-start");

  // ===== 9) repair: in-window group gap → re-send to exactly 203 =====
  const sendsBefore = globalThis.fetchState.telegramSends.length;
  const rep1 = await repairPerChatGaps(env, [koMatch], audit6.perChatGaps);
  const newSends = globalThis.fetchState.telegramSends.slice(sendsBefore);
  check("repair: re-sent to exactly the missing chat", rep1.repaired === 1 && newSends.length === 1 && newSends[0].chatId === 203);
  check("repair: the message carries the late tag", newSends[0].text.includes("تأخیر"));
  check("repair: the message carries the promo footer", newSends[0].text.includes("sportsignal"));
  check("repair: the 'sent' row is recorded after the recovery", (await fetchDeliveryLedger(env))[koKey + "|match-start-big"] && (await fetchDeliveryLedger(env))[koKey + "|match-start-big"].get(203) === "sent");
  const audit7 = await auditNotifications(env, [koMatch, cityPsg, failMatch]);
  check("repair: the group gap is closed after the repair", audit7.perChatGaps.length === 0);

  // ===== 10) repair: second pass is a no-op (marker blocks) =====
  // wipe the sent row but keep the marker? The marker row IS the same row —
  // simulate the retry-blocking by removing the 'sent' verdict via a fresh
  // recordDeliveries('failed') then re-auditing: the row exists → not a gap.
  const repAgain = await repairPerChatGaps(env, [koMatch], audit6.perChatGaps);
  const sendsBefore2 = globalThis.fetchState.telegramSends.length;
  check("repair: a second pass re-sends nothing (once ever)", repAgain.repaired === 0 && globalThis.fetchState.telegramSends.length === sendsBefore2);

  // ===== 11) repair: out-of-window gap → reported only, never re-sent =====
  const pastMatch = mkMatch("Liverpool FC", "Manchester United FC", new Date(Date.now() - 3 * 36e5).toISOString(), "FINISHED");
  const pastKey = matchKey(pastMatch);
  await env.USERS_DB.prepare("INSERT OR IGNORE INTO notified_v1 (match_key, ntype, notified_at, expires_at, match_date) VALUES (?1, ?2, ?3, ?4, ?5)")
    .bind(pastKey, "pre-match-1h", Date.now() - 3.2 * 36e5, Date.now() + 36e5, pastMatch.utcDate).run();
  await recordDeliveries(env, pastMatch, "pre-match-1h", [{ chatId: 100, verdict: "sent" }, { chatId: 201, verdict: "sent" }]);
  const audit8 = await auditNotifications(env, [pastMatch]);
  check("audit: the past-kickoff gap IS reported (visibility)", audit8.perChatGaps.length === 1 && audit8.perChatGaps[0].missing.includes(202));
  const sendsBefore3 = globalThis.fetchState.telegramSends.length;
  const rep2 = await repairPerChatGaps(env, [pastMatch], audit8.perChatGaps);
  check("repair: past-kickoff pre-match is NEVER re-sent (nonsense content)", rep2.repaired === 0 && rep2.ineligible === 1 && globalThis.fetchState.telegramSends.length === sendsBefore3);

  // ===== 12) repair: result backfill window still open → repaired late =====
  const resMatch = mkMatch("FC Bayern München", "Borussia Dortmund", new Date(Date.now() - 9 * 36e5).toISOString(), "FINISHED");
  const resKey = matchKey(resMatch);
  resMatch.score.fullTime = { home: 3, away: 2 };
  await env.USERS_DB.prepare("INSERT OR IGNORE INTO notified_v1 (match_key, ntype, notified_at, expires_at, match_date) VALUES (?1, ?2, ?3, ?4, ?5)")
    .bind(resKey, "result", Date.now() - 8 * 36e5, Date.now() + 36e5, resMatch.utcDate).run();
  await recordDeliveries(env, resMatch, "result", [{ chatId: 100, verdict: "sent" }, { chatId: 201, verdict: "sent" }]);
  const audit9 = await auditNotifications(env, [resMatch]);
  check("audit: the 9h-old result gap is reported", audit9.perChatGaps.length === 1 && audit9.perChatGaps[0].missing.includes(202));
  const rep3 = await repairPerChatGaps(env, [resMatch], audit9.perChatGaps);
  check("repair: result backfill (≤24h) recovers the chat", rep3.repaired === 1);

  // ===== 13) repairWindowOpen truth table =====
  const in3h = mkMatch("Juventus FC", "AS Roma", new Date(Date.now() + 3 * 36e5).toISOString());
  check("repairWindowOpen: pre-match-3h at 3h-out is open", repairWindowOpen(in3h, "pre-match-3h", env) === true);
  const at26h = mkMatch("Juventus FC", "AS Roma", new Date(Date.now() + 26 * 36e5).toISOString());
  check("repairWindowOpen: pre-match-3h at 26h-out is closed", repairWindowOpen(at26h, "pre-match-3h", env) === false);
  const justKicked = mkMatch("Juventus FC", "AS Roma", new Date(Date.now() - 20 * 6e4).toISOString(), "IN_PLAY");
  check("repairWindowOpen: match-start at +20min live is open", repairWindowOpen(justKicked, "match-start", env) === true);
  const longDone = mkMatch("Juventus FC", "AS Roma", new Date(Date.now() - 4 * 36e5).toISOString(), "FINISHED");
  check("repairWindowOpen: match-start at +4h finished is closed", repairWindowOpen(longDone, "match-start", env) === false);

  h.restore();
  console.log(failed ? failed + " FAILURES" : "per-chat ledger OK");
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error("FAIL harness error: " + (e && e.stack || e)); process.exit(1); });
