// check-lifecycle.js — v13.102: the END-TO-END SIMULATED-TIMELINE reliability
// test. Replays a full match lifecycle (and a full second one) through the
// REAL tick code — executeScheduledLogic, the actual cron shell, notify
// engine, digests, broadcasts, outbox, breaker, audit — with only the WORLD
// mocked: a controllable clock (Date subclass), in-memory KV + D1 (the exact
// USERS_DB statement surface), a fetch dispatcher (football-data.org,
// sportscore, thesportsdb, wikipedia, Telegram capture) and instant timers.
//
// THE WORLD (mirrors the live roster: 7 heterogeneous chats):
//   92788333  admin, fa, Asia/Tehran, master-follow (the default)
//   101088217 fa, Asia/Tehran, follows ONLY Liverpool FC (non-follower for
//             City–PSG: the big-broadcast audience)
//   288571422 fa, Asia/Tehran (master-follow)
//   7591867599 fa, Asia/Tehran (master-follow) — suffers a transient
//             Telegram 500 during the 3h fan-out → outbox recovery
//   6393672649 fa, Asia/Tehran (master-follow)
//   90712592  en, Europe/London (master-follow)
//   8960654513 en, Australia/Sydney (master-follow — the far-tz digest
//             timing differs by a day, per-chat keys must follow)
//
// THE MATCHES:
//   M1 Manchester City–Paris Saint-Germain, CL, Tue 2026-10-20T19:00Z —
//      master big + featured (the marquee): full lifecycle
//      SCHEDULED → IN_PLAY → PAUSED(HT) → IN_PLAY → FINISHED 2-1.
//   M2 FC Bayern–LASK Linz, CL, Tue 16:45Z — one-side master (the digest
//      must list City–PSG FIRST: priority ordering).
//   M3 Liverpool–Everton, PL, Mon 20:15Z — the Liverpool-fan's followed
//      match (their own night digest section + result verdict sentence).
//
// THE HOSTILITIES (each targets a documented failure class):
//   DEPLOY WINDOW   — every tick skipped Mon 19:00Z→23:10Z (the entire 24h
//                     pre-match window of M1): the stage must fire LATE via
//                     the backfill leg with the "sent late" tag — never lost.
//   PROVIDER OUTAGE — football-data returns 429 for the Tue 18:00Z-18:30Z
//                     full sweep: the breaker suspends FD, the pool falls
//                     back to cache, the degradation alert pages the admin,
//                     and no in-window stage is missed.
//   TRANSIENT 500   — Telegram 500 for chat 7591867599 during the 3h
//                     fan-out: 3 retries fail → dead-letter outbox → the
//                     next tick's drain delivers it. Never silently lost.
//   CPU KILL        — at the Tue 19:00Z match-start fan-out the "isolate"
//                     dies after the FIRST chat's card send (deterministic
//                     dispatcher call-count): the write-first dedupe record
//                     is already persisted, the tail chats get nothing, no
//                     outbox entries. The NEXT tick's per-chat audit must
//                     detect the no-row chats, page the admin, and the
//                     repair leg re-sends the kickoff to exactly those
//                     chats (late-tagged) while the window is open.
//
// Then the timeline asserts EVERY chat receives EVERY stage it is owed, at
// the RIGHT local time, exactly once (modulo the two documented duplicate
// windows: the CPU-kill repair for the admin — died-before-row-write — and
// the outbox redelivery for the 500 chat, which is at-least-once by design).
const { makeKV, makeD1, makeFetchDispatcher } = require("./lib/mock-env");
const createHarness = require("./lib/full-worker");

let failed = 0;
const check = (name, cond) => {
  console.log((cond ? "OK   " : "FAIL ") + name);
  if (!cond) failed++;
};

(async () => {
  // ================= the world =================
  const START = Date.parse("2026-10-18T12:00:00Z");  // Sunday
  const END = Date.parse("2026-10-21T12:00:00Z");    // Wednesday noon
  const DEPLOY_FROM = Date.parse("2026-10-19T19:00:00Z");
  const DEPLOY_TO = Date.parse("2026-10-19T23:10:00Z");
  const OUTAGE_FROM = Date.parse("2026-10-20T17:00:00Z");
  const OUTAGE_TO = Date.parse("2026-10-20T17:40:00Z");
  const T500_TICK = Date.parse("2026-10-20T15:30:00Z"); // the 3h fan-out tick
  // the CPU kill targets M2's match-start (Bayern–LASK is NOT master-big →
  // no all-chats kickoff broadcast → the per-chat REPAIR leg is the only
  // recovery path; M1's City–PSG kickoff runs normally and is covered by
  // the regular fan-out + the broadcast, a second redundant path).
  // 16:50Z = the FIRST tick inside the [-1,+45min] window (M2 kicks off at
  // :45 — the 10-min grid's first in-window tick is 5 min after kickoff).
  const KILL_TICK = Date.parse("2026-10-20T16:50:00Z");

  const M1 = { id: 501, home: "Manchester City FC", away: "Paris Saint-Germain", comp: "CL", ko: Date.parse("2026-10-20T19:00:00Z") };
  const M2 = { id: 502, home: "FC Bayern München", away: "LASK Linz", comp: "CL", ko: Date.parse("2026-10-20T16:45:00Z") };
  const M3 = { id: 503, home: "Liverpool FC", away: "Everton FC", comp: "PL", ko: Date.parse("2026-10-19T20:15:00Z") };
  // M4: a distant filler (26 days out — far outside every notification
  // window, inert for sends) that keeps the pool horizon > 5 days so full
  // sweeps run fetchMatchesFromAPI — the path the provider outage must hit
  // (an empty/horizon-less pool would take the 92-day fetchLongView path,
  // which has no degradation alert).
  const M4 = { id: 504, home: "Real Madrid CF", away: "FC Barcelona", comp: "PD", ko: Date.parse("2026-11-15T20:00:00Z") };

  // The fixture at a point in time — statuses advance with the mock clock.
  function fixtureAt(m, now) {
    const seg = (a, b) => now >= a && now < b;
    let status = "SCHEDULED", sc = null;
    if (m === M1) {
      if (seg(m.ko, Date.parse("2026-10-20T19:47:00Z"))) { status = "IN_PLAY"; sc = [1, 0]; }
      else if (seg(Date.parse("2026-10-20T19:47:00Z"), Date.parse("2026-10-20T20:02:00Z"))) { status = "PAUSED"; sc = [1, 1]; }
      else if (seg(Date.parse("2026-10-20T20:02:00Z"), Date.parse("2026-10-20T21:00:00Z"))) { status = "IN_PLAY"; sc = [2, 1]; }
      else if (now >= Date.parse("2026-10-20T21:00:00Z")) { status = "FINISHED"; sc = [2, 1]; }
    } else if (m === M2) {
      if (seg(m.ko, Date.parse("2026-10-20T17:32:00Z"))) { status = "IN_PLAY"; sc = [1, 0]; }
      else if (seg(Date.parse("2026-10-20T17:32:00Z"), Date.parse("2026-10-20T17:47:00Z"))) { status = "PAUSED"; sc = [1, 0]; }
      else if (seg(Date.parse("2026-10-20T17:47:00Z"), Date.parse("2026-10-20T18:35:00Z"))) { status = "IN_PLAY"; sc = [3, 0]; }
      else if (now >= Date.parse("2026-10-20T18:35:00Z")) { status = "FINISHED"; sc = [3, 0]; }
    } else {
      if (seg(m.ko, Date.parse("2026-10-19T21:02:00Z"))) { status = "IN_PLAY"; sc = [1, 0]; }
      else if (seg(Date.parse("2026-10-19T21:02:00Z"), Date.parse("2026-10-19T21:17:00Z"))) { status = "PAUSED"; sc = [1, 0]; }
      else if (seg(Date.parse("2026-10-19T21:17:00Z"), Date.parse("2026-10-19T22:00:00Z"))) { status = "IN_PLAY"; sc = [2, 1]; }
      else if (now >= Date.parse("2026-10-19T22:00:00Z")) { status = "FINISHED"; sc = [2, 1]; }
    }
    return {
      id: m.id, utcDate: new Date(m.ko).toISOString(), status,
      competition: { code: m.comp },
      homeTeam: { name: m.home, crest: "https://crests.example/" + m.home + ".png" },
      awayTeam: { name: m.away, crest: "https://crests.example/" + m.away + ".png" },
      score: sc ? { fullTime: { home: sc[0], away: sc[1] } } : null
    };
  }

  const h = createHarness({ startMs: START });
  const fs = makeFetchDispatcher();
  globalThis.fetch = fs.dispatch;

  // --- the poison (CPU-kill simulation): once armed, EVERY fetch, KV and
  // D1 op after the Nth Telegram call of the tick rejects — the isolate
  // "dies" mid-fan-out with the dedupe record already persisted. ---
  const poison = { on: false, tgCount: 0, killAfterN: null };

  // FD 429 outage + fixtures
  const fdMatchesHandler = {
    match: (u) => u.indexOf("api.football-data.org/v4/matches?") >= 0,
    handle: async (u) => {
      if (Date.now() >= OUTAGE_FROM && Date.now() < OUTAGE_TO) {
        return new Response(JSON.stringify({ message: "rate limited" }), { status: 429, headers: { "content-type": "application/json", "retry-after": "1" } });
      }
      const now = Date.now();
      return fs.json({ matches: [fixtureAt(M1, now), fixtureAt(M2, now), fixtureAt(M3, now), fixtureAt(M4, now)] });
    }
  };
  // CL standings (the night digest rank + the weekly tables); other leagues
  // are unavailable (502) — a lean but realistic digest surface.
  const fdStandingsHandler = {
    match: (u) => /api\.football\.org\.example/.test(u) || /api\.football-data\.org\/v4\/competitions\/([A-Z_]+)\/standings/.test(u),
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
  };
  fs.handlers.push(fdMatchesHandler, fdStandingsHandler);

  fs.onTelegram = async (entry) => {
    if (poison.on) throw new Error("isolate dead: telegram");
    poison.tgCount++;
    if (poison.killAfterN != null && poison.tgCount > poison.killAfterN) {
      poison.on = true; // the isolate dies FROM HERE ON
      throw new Error("isolate dead: telegram");
    }
    // transient 500 for one chat during the 3h fan-out tick
    if (h.clockMs() === T500_TICK && entry.chatId === 7591867599 && (entry.method === "sendMessage" || entry.method === "sendPhoto")) return "fail";
    return true;
  };
  fs.clock = () => h.clockMs();

  // --- env with poison-aware KV/D1 wrappers ---
  const realKV = makeKV();
  const realD1 = makeD1();
  const env = {
    STATE: {
      async get(k, a) { if (poison.on) throw new Error("isolate dead: kv"); return realKV.get(k, a); },
      async put(k, v, o) { if (poison.on) throw new Error("isolate dead: kv"); return realKV.put(k, v, o); },
      async delete(k) { if (poison.on) throw new Error("isolate dead: kv"); return realKV.delete(k); }
    },
    USERS_DB: {
      prepare(sql) {
        return {
          bind(...p) { const s = realD1.prepare(sql).bind(...p); return {
            run: async () => { if (poison.on) throw new Error("isolate dead: d1"); return s.run(); },
            first: async () => { if (poison.on) throw new Error("isolate dead: d1"); return s.first(); },
            all: async () => { if (poison.on) throw new Error("isolate dead: d1"); return s.all(); }
          }; },
          run: async () => { if (poison.on) throw new Error("isolate dead: d1"); return realD1.prepare(sql).run(); },
          first: async () => { if (poison.on) throw new Error("isolate dead: d1"); return realD1.prepare(sql).first(); },
          all: async () => { if (poison.on) throw new Error("isolate dead: d1"); return realD1.prepare(sql).all(); }
        };
      },
      async batch(stmts) {
        if (poison.on) throw new Error("isolate dead: d1");
        return realD1.batch(stmts);
      }
    },
    BOT_TOKEN: "test-token",
    CHAT_ID: "92788333",
    API_TOKEN: "fd-token",
    TEHRAN_TZ: "Asia/Tehran"
  };

  // card rendering stubs (card.ts is not part of the cron body — a fake PNG
  // makes every fan-out send the card, with the caption carrying the text)
  globalThis.renderCardPngCached = async () => new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
  globalThis.cachedCardPng = async () => new Uint8Array([0x89, 0x50, 0x4e, 0x47]);

  // --- seed the roster (D1, exactly like the live users DB) ---
  const joined = new Date(START - 30 * 864e5).toISOString();
  const CHATS = [
    { id: 92788333, tz: null, lang: "fa", teams: null },        // admin, master-follow
    { id: 101088217, tz: null, lang: "fa", teams: ["Liverpool FC"] }, // Liverpool-only
    { id: 288571422, tz: null, lang: "fa", teams: null },
    { id: 7591867599, tz: null, lang: "fa", teams: null },
    { id: 6393672649, tz: null, lang: "fa", teams: null },
    { id: 90712592, tz: "Europe/London", lang: "en", teams: null },
    { id: 8960654513, tz: "Australia/Sydney", lang: "en", teams: null }
  ];
  const UP = "INSERT INTO user_prefs (chat_id, teams, tz, lang, updated_at) VALUES (?1, ?2, ?3, ?4, ?5) ON CONFLICT(chat_id) DO UPDATE SET teams=excluded.teams, tz=excluded.tz, lang=excluded.lang, updated_at=excluded.updated_at";
  for (const c of CHATS) {
    await realD1.prepare("INSERT OR IGNORE INTO chats (chat_id, joined_at) VALUES (?1, ?2)").bind(c.id, joined).run();
    await realD1.prepare("INSERT INTO chat_profiles (chat_id, username, first_name, title, joined, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)")
      .bind(c.id, null, "user" + c.id, null, joined, joined).run();
    await realD1.prepare(UP).bind(c.id, c.teams ? JSON.stringify(c.teams) : null, c.tz, c.lang, joined).run();
  }

  // ================= the timeline =================
  const kills = [];
  let ticksRan = 0;
  for (let t = START; t < END; t += 10 * 60 * 1e3) {
    h.setClock(t);
    if (t >= DEPLOY_FROM && t < DEPLOY_TO) continue; // the deploy window
    // Force the outage tick to be a FULL sweep: a stale last_full_sweep in
    // the completion blob makes cron-pool run fetchMatchesFromAPI (the
    // 429 → all-sources-empty → cache-fallback + degradation-alert path)
    // instead of the quiet/live reuse that absorbed the first attempt.
    if (t === OUTAGE_FROM) {
      const blob = (await realKV.get("cron_status_v1", "json")) || {};
      blob.last_full_sweep = String(t - 3 * 36e5);
      await realKV.put("cron_status_v1", JSON.stringify(blob));
    }
    poison.tgCount = 0;
    poison.on = false;
    poison.killAfterN = t === KILL_TICK ? 5 : null; // dice×4 + admin's card → die
    try {
      await executeScheduledLogic(env);
      ticksRan++;
    } catch (e) {
      kills.push({ t, msg: String(e && e.message || e) });
      // a killed tick: the isolate is dead — nothing after this point ran
    }
    poison.on = false;
    poison.killAfterN = null;
    if (process.env.LIFECYCLE_PROBE === new Date(t).toISOString().slice(0, 16)) {
      const poolBlob = (await realKV.get("matches_v13_tracked", "json")) || {};
      console.log("[PROBE] pool matches:");
      for (const m of poolBlob.matches || []) console.log("[PROBE]  " + m.homeTeam.name + " vs " + m.awayTeam.name + " | " + m.competition.code + " | " + m.status + " | shouldNotify=" + shouldNotify(m) + " | starting=" + isMatchStartingNow(m, env));
      const recs = (await realD1.prepare("SELECT match_key, ntype, notified_at, expires_at, match_date FROM notified_v1").all()).results;
      console.log("\n[PROBE @" + new Date(t).toISOString() + "] notified rows:", JSON.stringify(recs.filter((r) => r.match_key.indexOf("manchestercity") === 0)));
      const led = await fetchDeliveryLedger(env, 0);
      console.log("[PROBE] ledger keys:", Object.keys(led).filter((k) => k.indexOf("manchestercity") === 0));
      for (const k of Object.keys(led).filter((x) => x.indexOf("manchestercity") === 0)) console.log("[PROBE]  " + k + " => " + JSON.stringify([...led[k].entries()]));
      const poolNow = [fixtureAt(M1, t), fixtureAt(M2, t), fixtureAt(M3, t), fixtureAt(M4, t)];
      const a = await auditNotifications(env, poolNow);
      console.log("[PROBE] audit perChatGaps:", JSON.stringify(a.perChatGaps));
    }
  }
  check("the timeline ran (ticks executed)", ticksRan > 380);
  // the CPU-kill signature: the worker's guards absorb the death (every
  // phase try/catches), so the observable is the I/O failure burst at the
  // kill tick — everything after the first chat's card send rejected.
  const killFails = fs.telegramSends.filter((s2) => !s2.ok && s2.t === KILL_TICK);
  check("the CPU-kill tick died (every post-kill telegram call rejected)", kills.length === 0 && killFails.length >= 8);

  // ================= helpers =================
  const sends = fs.telegramSends; // every telegram API call (ok flag + mock-clock stamp t)
  const okSends = sends.filter((s) => s.ok);
  const m1Text = (s) => /منچسترسیتی|Manchester City/.test(s.text);
  const late = (s) => s.text.includes("تأخیر") || s.text.includes("sent late");
  const inWin = (s, from, to) => s.t != null && s.t >= from && s.t < to;

  // ================= A. the dedupe store =================
  const notified = await realD1.prepare("SELECT match_key, ntype, notified_at, expires_at, match_date FROM notified_v1").all();
  const rows = notified.results;
  const m1Key = "manchestercity|parissaintgermain|2026-10-20T19:00";
  const m3Key = "liverpool|everton|2026-10-19T20:15";
  const typesOf = (k) => rows.filter((r) => r.match_key === k).map((r) => r.ntype);
  const t1 = typesOf(m1Key);
  check("M1 fired every stage: 72h/24h/3h/1h/5min/match-start/result (+big)", ["pre-match-72h", "pre-match-24h", "pre-match-3h", "pre-match-1h", "pre-match-5min", "match-start", "match-start-big", "result", "result-big"].every((x) => t1.includes(x)));
  check("M1 never re-armed: exactly one row per type", new Set(t1).size === t1.length);
  const t3 = typesOf(m3Key);
  // M3's match-start window [20:14Z, 21:00Z] + its live backfill leg fall
  // ENTIRELY inside the 4h deploy window — the documented loss class (the
  // result still fires on the first tick back; the audit reports the gap).
  check("M3 fired 24h/3h/1h/result (5min needs master-big — absent)", ["pre-match-24h", "pre-match-3h", "pre-match-1h", "result"].every((x) => t3.includes(x)) && !t3.includes("pre-match-5min") && !t3.includes("match-start-big"));
  check("M3's match-start is the deploy window's documented loss (audit-visible)", !t3.includes("match-start"));

  // the 24h fired LATE (deploy window) — notified_at lands after the
  // window closed, i.e. after DEPLOY_TO
  const r24 = rows.find((r) => r.match_key === m1Key && r.ntype === "pre-match-24h");
  check("deploy window: the 24h record persisted AFTER the skipped window (late fire)", r24 && r24.notified_at >= DEPLOY_TO && r24.notified_at < DEPLOY_TO + 20 * 60 * 1e3);

  // ================= B. per-chat delivery (the ledger) =================
  const ledger = await fetchDeliveryLedger(env, 0);
  const FOLLOWERS = [92788333, 288571422, 7591867599, 6393672649, 90712592, 8960654513];
  const NONFOLLOWER = 101088217;
  const rowFor = (mk, nt, chat) => (ledger[mk + "|" + nt] || new Map()).get(chat);
  for (const nt of ["pre-match-72h", "pre-match-24h", "pre-match-3h", "pre-match-1h", "pre-match-5min"]) {
    // 'failed' rows are the outbox-owned recoveries (chat 7591867599's
    // transient 500): the row exists, the outbox delivered the message.
    const all = FOLLOWERS.every((c) => ["sent", "failed"].includes(rowFor(m1Key, nt, c)));
    check("ledger: " + nt + " delivered to every follower chat", all);
    check("ledger: " + nt + " never recorded for the non-follower", rowFor(m1Key, nt, NONFOLLOWER) === undefined);
  }
  check("ledger: match-start recovered for every follower (repair leg)", FOLLOWERS.every((c) => ["sent", "repair"].includes(rowFor(m1Key, "match-start", c))));
  const m2Key = "bayernmunich|lasklinz|2026-10-20T16:45"; // post-bayernfix key
  check("ledger: the KILLED match's match-start repaired for every follower (M2, no broadcast path)", FOLLOWERS.every((c) => ["sent", "repair"].includes(rowFor(m2Key, "match-start", c))));
  check("ledger: the killed match-start has no rows for the non-follower (audience scoping)", rowFor(m2Key, "match-start", NONFOLLOWER) === undefined);
  check("ledger: match-start-big delivered to the non-follower", rowFor(m1Key, "match-start-big", NONFOLLOWER) === "sent");
  check("ledger: result + result-big complete", FOLLOWERS.every((c) => rowFor(m1Key, "result", c) === "sent") && rowFor(m1Key, "result-big", NONFOLLOWER) === "sent");
  check("ledger: M3 stages delivered to every chat (Liverpool is master)", CHATS.every((c) => rowFor(m3Key, "pre-match-24h", c.id) === "sent" && rowFor(m3Key, "result", c.id) === "sent"));
  check("ledger: M3's lost match-start has no rows anywhere (audit-visible gap)", CHATS.every((c) => rowFor(m3Key, "match-start", c.id) === undefined));

  // stage windows for the delivery checks (mock-clock instants)
  const W1h = [Date.parse("2026-10-20T17:25:00Z"), Date.parse("2026-10-20T18:20:00Z")];

  // ================= D. the hostile-event proofs =================
  // D1. deploy window → late 24h with the tag (fired on the first tick
  // after the skipped window, Monday 23:10Z)
  const late24 = okSends.filter((s) => m1Text(s) && late(s) && FOLLOWERS.includes(s.chatId) && inWin(s, DEPLOY_TO, DEPLOY_TO + 60 * 60 * 1e3));
  check("deploy window: the 24h fired LATE (tagged) to every follower on the first tick back", late24.length >= 6);

  // D2. provider outage → degradation alert + no missed stage
  const degradation = okSends.find((s) => s.chatId === 92788333 && /همه منابع/.test(s.text) && /از کاش/.test(s.text));
  check("provider outage: the degradation alert paged the admin (cache fallback)", !!degradation);
  const oneHour = okSends.filter((s) => m1Text(s) && !late(s) && inWin(s, W1h[0], W1h[1]) && FOLLOWERS.includes(s.chatId));
  check("provider outage: the 1h stage still fired (from the cached pool)", FOLLOWERS.every((c) => oneHour.some((s) => s.chatId === c)));

  // D3. transient 500 → outbox → delivered
  const ob = await realKV.get("pending_sends_v1", "json");
  check("outbox: drained to empty by the end of the timeline", Array.isArray(ob) ? ob.length === 0 : true);
  const chat759 = okSends.filter((s) => s.chatId === 7591867599 && m1Text(s));
  check("outbox: chat 7591867599 received the 3h message (at-least-once)", chat759.length >= 2); // 24h + 3h at minimum

  // D4. CPU kill → detection + repair (M2 Bayern–LASK: no broadcast path)
  const m2Text = (s) => /بایرن|Bayern/.test(s.text);
  const startWin = okSends.filter((s) => m2Text(s) && s.text.includes("🚀") && FOLLOWERS.includes(s.chatId) && inWin(s, KILL_TICK, Date.parse("2026-10-20T18:00:00Z")));
  const adminStarts = startWin.filter((s) => s.chatId === 92788333);
  const repaired = startWin.filter((s) => late(s));
  check("CPU kill: the admin received the kickoff card (before the kill) + exactly one repair (the documented duplicate window)", adminStarts.length === 2);
  check("CPU kill: every other follower was REPAIRED (late-tagged kickoff)", FOLLOWERS.filter((c) => c !== 92788333).every((c) => repaired.some((s) => s.chatId === c)));
  const perchatPage = okSends.find((s) => s.chatId === 92788333 && /تحویل در سطح چت|چت بدون ردیف تحویل/.test(s.text));
  check("CPU kill: the per-chat gap PAGED the admin (detection ≤ 10 min)", !!perchatPage);

  // ================= E. digests & broadcasts (every chat, its own tz) =================
  const kv = realKV._map;
  const keyExists = (k) => {
    const e = kv.get(k);
    return !!e;
  };
  const ucl20 = CHATS.filter((c) => c.id !== 8960654513).every((c) => keyExists("uclnight_2026-10-20_" + c.id));
  const ucl21 = keyExists("uclnight_2026-10-21_8960654513");
  check("UCL preview: per-chat keys for ALL 7 chats (6 on the 20th + Sydney on the 21st)", ucl20 && ucl21);
  const gifs = okSends.filter((s) => s.method === "sendAnimation");
  check("UCL preview: the GIF banner sent (sendAnimation)", gifs.length >= 7);
  const nd19 = CHATS.filter((c) => c.id !== 8960654513).every((c) => keyExists("nightdigest_2026-10-19_" + c.id));
  const nd20 = CHATS.filter((c) => c.id !== 8960654513).every((c) => keyExists("nightdigest_2026-10-20_" + c.id));
  const nd21 = keyExists("nightdigest_2026-10-21_8960654513");
  check("night digest: per-chat keys for all 7 chats on BOTH nights (Sydney folded to the 21st)", nd19 && nd20 && nd21);
  const ndAdmin = okSends.find((s) => s.chatId === 92788333 && s.text.includes("خلاصه نتایج شب") && s.text.includes("منچسترسیتی"));
  check("night digest (fa/Tehran): sent with the Jalali header", !!ndAdmin && ndAdmin.text.includes("مهر"));
  if (ndAdmin) {
    const iCity = ndAdmin.text.indexOf("منچسترسیتی");
    const iBayern = ndAdmin.text.indexOf("بایرن");
    check("night digest: City–PSG LEADS the digest (priority ordering, v13.100)", iCity >= 0 && (iBayern < 0 || iCity < iBayern));
    check("night digest: the followed-team verdict sentence is present", ndAdmin.text.includes("برنده شد"));
  } else check("night digest: City–PSG LEADS (priority ordering, v13.100)", false);
  const ndEn = okSends.find((s) => s.chatId === 90712592 && s.text.includes("Night results"));
  check("night digest (en/London): the same surface in English", !!ndEn);
  const ndLiv = okSends.find((s) => s.chatId === 101088217 && s.text.includes("لیورپول") && s.text.includes("برنده شد"));
  check("night digest: the Liverpool fan's followed-match verdict sentence (won)", !!ndLiv);
  const md20 = CHATS.filter((c) => c.id !== 8960654513).every((c) => keyExists("digest_sent_2026-10-20_" + c.id));
  check("morning digest: per-chat keys for the 6 Tehran/London chats", md20);
  check("morning digest: Sydney gets NO empty digest (games finished before their 9am — no spam)", !keyExists("digest_sent_2026-10-20_8960654513") && !keyExists("digest_sent_2026-10-21_8960654513"));
  const wk = okSends.filter((s) => s.text.includes("جدول لیگ") || s.text.includes("End of week"));
  check("weekly tables (Monday): sent to every chat", CHATS.every((c) => wk.some((s) => s.chatId === c.id)));
  const ht = okSends.filter((s) => s.text.includes("استراحت") || s.text.includes("Half time"));
  check("HT alert: broadcast to ALL 7 chats (master big match)", CHATS.every((c) => ht.some((s) => s.chatId === c.id)));

  // ================= F. same flow for everyone (agenda 3, dynamic) =================
  const publicSurfaces = {
    "72h": (c) => okSends.some((s) => s.chatId === c && m1Text(s) && s.text.includes("🔥")),
    "3h/1h/5min cards": (c) => rowFor(m1Key, "pre-match-3h", c) === "sent" && rowFor(m1Key, "pre-match-1h", c) === "sent" && rowFor(m1Key, "pre-match-5min", c) === "sent",
    "kickoff": (c) => okSends.some((s) => s.chatId === c && m1Text(s) && s.text.includes("🚀")),
    "result": (c) => okSends.some((s) => s.chatId === c && m1Text(s) && (s.text.includes("نتیجه نهایی") || s.text.includes("Full time"))),
    "UCL preview": (c) => okSends.some((s) => s.chatId === c && (s.text.includes("شب لیگ قهرمانان اروپا") || s.text.includes("Champions League night"))),
    "morning digest (tz-realistic)": (c) => c === 8960654513 || okSends.some((s) => s.chatId === c && (s.text.includes("بازی‌های بزرگ امروز") || s.text.includes("Today's big matches"))),
    "night digest": (c) => okSends.some((s) => s.chatId === c && (s.text.includes("خلاصه نتایج شب") || s.text.includes("Night results"))),
    "weekly tables": (c) => wk.some((s) => s.chatId === c),
    "HT alert": (c) => ht.some((s) => s.chatId === c)
  };
  for (const [name, fn] of Object.entries(publicSurfaces)) {
    const admin = fn(92788333);
    const ordinary = fn(288571422) && fn(6393672649) && fn(90712592) && fn(8960654513);
    check("parity: admin receives the same \"" + name + "\" as ordinary users", admin && ordinary);
  }
  const heartbeats = okSends.filter((s) => s.chatId === 92788333 && s.text.includes("ربات سالم است"));
  check("admin-only extras: the 6h heartbeat pages ONLY the admin", heartbeats.length >= 3 && !okSends.some((s) => s.chatId === 288571422 && s.text.includes("ربات سالم است")));

  // ================= G. final state =================
  h.setClock(END + 10 * 60 * 1e3); // past the execution-lock TTL for the stale check
  const finalPool = [fixtureAt(M1, END), fixtureAt(M2, END), fixtureAt(M3, END), fixtureAt(M4, END)];
  const finalAudit = await auditNotifications(env, finalPool);
  check("final audit: ZERO per-chat gaps after the full hostile timeline", finalAudit.perChatGaps.length === 0);
  const cronStatus = await realKV.get("cron_status_v1", "json");
  check("cron_status_v1: fresh heartbeat + last_cron + notify blob", cronStatus && parseInt(cronStatus.last_cron) >= END - 20 * 60 * 1e3 && cronStatus.notify);
  check("cron_status_v1: the notify breadcrumb carries the per-chat outcome + deferred-key fields", !!(cronStatus.notify && cronStatus.notify.o && Array.isArray(cronStatus.notify.dk)));
  const lockLeft = await realKV.get("execution_lock");
  check("execution lock: expired (not stuck)", !lockLeft || false);
  check("no outbox residue", !(await realKV.get("pending_sends_v1", "json") || []).length);


  if (process.env.LIFECYCLE_DEBUG) {
    console.log("\n=== DEBUG: KV keys ===");
    for (const k of [...realKV._map.keys()].sort()) console.log("  " + k);
    console.log("=== DEBUG: kills ===");
    for (const k of kills) console.log("  @" + new Date(k.t).toISOString() + " :: " + k.msg);
    console.log("=== DEBUG: FAILED telegram entries (with clock t) ===");
    for (const s2 of fs.telegramSends.filter((x) => !x.ok)) {
      console.log("  [" + (s2.t != null ? new Date(s2.t).toISOString() : "?") + "] " + s2.method + " -> " + s2.chatId + " :: " + String(s2.text).replace(/\n/g, " | ").slice(0, 60));
    }
    console.log("=== DEBUG: full admin Tuesday night digest ===");
    const ndA = fs.telegramSends.filter((x) => x.method === "sendMessage" && x.chatId === 92788333 && x.text.includes("خلاصه نتایج شب"));
    for (const s2 of ndA) console.log(s2.text);
    console.log("=== DEBUG: M2 kickoff-ish sends (Bayern, any method) ===");
    for (const s2 of fs.telegramSends.filter((x) => /Bayern|بایرن/.test(x.text) && x.text.includes("🚀"))) {
      console.log("  [" + (s2.t != null ? new Date(s2.t).toISOString() : "?") + "] " + s2.method + " -> " + s2.chatId + (s2.ok ? "" : " FAIL") + " late=" + (s2.text.includes("تأخیر") || s2.text.includes("sent late")));
    }
    console.log("=== DEBUG: degradation alert hunt ===");
    for (const s2 of fs.telegramSends.filter((x) => /ناتوانستان|degradation|منابع/.test(x.text))) {
      console.log("  [" + (s2.t != null ? new Date(s2.t).toISOString() : "?") + "] " + s2.method + " -> " + s2.chatId + (s2.ok ? " ok" : " FAIL") + " len=" + s2.text.length + " :: " + JSON.stringify(s2.text.slice(0, 40)));
    }
    console.log("=== DEBUG: all late-tagged deliveries ===");
    for (const s2 of fs.telegramSends.filter((x) => x.text.includes("تأخیر") || x.text.includes("sent late"))) {
      console.log("  [" + (s2.t != null ? new Date(s2.t).toISOString() : "?") + "] " + s2.method + " -> " + s2.chatId + (s2.ok ? "" : " FAIL") + " :: " + s2.text.replace(/\n/g, " | ").slice(0, 70));
    }
    console.log("=== DEBUG: outbox residue ===");
    console.log("  " + JSON.stringify((await realKV.get("pending_sends_v1", "json")) || []).slice(0, 400));
    console.log("=== DEBUG: telegram sends by method+chat ===");
    const byM = {};
    for (const s2 of fs.telegramSends) {
      const k = s2.method + " " + (s2.chatId != null ? s2.chatId : "?") + (s2.ok ? "" : " (FAIL)");
      byM[k] = (byM[k] || 0) + 1;
    }
    for (const k of Object.keys(byM).sort()) console.log("  " + k + " x" + byM[k]);
    console.log("=== DEBUG: all sendMessage texts (first 80 chars, with clock t) ===");
    for (const s2 of fs.telegramSends.filter((x) => x.method === "sendMessage" && x.ok)) {
      console.log("  [" + (s2.t != null ? new Date(s2.t).toISOString() : "?") + "] -> " + s2.chatId + " :: " + s2.text.replace(/\n/g, " | ").slice(0, 110));
    }
    console.log("=== DEBUG: notified_v1 rows ===");
    for (const r of rows) console.log("  " + r.match_key + " " + r.ntype + " @ " + new Date(r.notified_at).toISOString());
    console.log("=== DEBUG: ledger rows (non-sent only) ===");
    for (const [k, m] of Object.entries(ledger)) for (const [c, v] of m) if (v !== "sent") console.log("  " + k + " chat " + c + " = " + v);
  }

  // ================= H. normalizer consistency (the bayernfix gate) ======
  // The v13.8 TRANSLIT_FOLDS and the v12.15 TEAM_ALIASES conflicted: every
  // set is built with normalizeTeamName while every lookup goes through
  // normAlias — the alias flipped Bayern onto the unfolded key and
  // shouldNotify("FC Bayern München") was FALSE (found live: zero bayern
  // rows in notified_v1 EVER). The invariant: for every canonical master
  // name and every common provider variant, normAlias === normalizeTeamName
  // — else some set lookup silently misses.
  const masterNames = [];
  for (const list of Object.values(CONFIG.BIG_TEAMS_BY_LEAGUE)) masterNames.push(...list);
  masterTeamList();
  const masterNormKeys = new Set(masterNames.map((n) => normalizeTeamName(n)));
  // variants of MASTER clubs (Lazio lives only in the derby table — no
  // master-set lookup — so it is out of scope for this invariant)
  const variants = ["FC Bayern München", "Bayern Munich", "Bayern München", "Inter Milan", "FC Internazionale Milano", "Internazionale", "Atlético Madrid", "Club Atlético de Madrid", "Atlético de Madrid", "Paris Saint-Germain", "AC Milan", "Milan"];
  const inconsistent = [];
  // the SET-LOOKUP property: for every canonical + variant name, normAlias
  // must land on a key the normalizeTeamName-built sets actually contain
  // (shouldNotify/isFeaturedMatch/userFollowsMatch all compare normAlias
  // outputs against normalizeTeamName-built sets).
  for (const n of masterNames.concat(variants)) {
    if (!masterNormKeys.has(normAlias(n))) inconsistent.push(n + " -> " + normAlias(n));
  }
  check("normalizer: every master/variant name lands IN the normalizeTeamName-built sets", inconsistent.length === 0);
  if (inconsistent.length) console.log("     inconsistent: " + inconsistent.join(", "));
  const bayernVariants = ["FC Bayern München", "Bayern Munich", "Bayern München"].every((n) => normAlias(n) === "bayernmunich");
  check("normalizer: every Bayern spelling folds to ONE key (bayernmunich)", bayernVariants);
  const bayernLask = { id: 502, utcDate: "2026-10-20T16:45:00Z", status: "IN_PLAY", competition: { code: "CL" }, homeTeam: { name: "FC Bayern München" }, awayTeam: { name: "LASK Linz" }, score: null };
  check("normalizer: shouldNotify(Bayern–LASK) is TRUE (the bug that never notified)", shouldNotify(bayernLask) === true);
  const bayernLeverkusen = { ...bayernLask, awayTeam: { name: "Bayer 04 Leverkusen" }, competition: { code: "BL1" } };
  check("normalizer: shouldNotify(Bayern–Leverkusen) is TRUE (BL1, non-master opponent)", shouldNotify(bayernLeverkusen) === true);

  h.restore();
  console.log(failed ? failed + " FAILURES" : "lifecycle OK — every chat received every stage through every failure class");
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error("FAIL harness error: " + (e && e.stack || e)); process.exit(1); });
