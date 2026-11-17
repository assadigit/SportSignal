// scripts/s19-goal-smoke.ts
// Telegram Alerts Track Session 19 — the GOAL-EVENT end-to-end harness (the
// s17-faq-smoke/s18-content-smoke seeded-harness pattern). A synthetic score
// timeline drives the REAL detectGoalEvents through a mock KV + the mock D1
// (the scripts/lib/mock-env.js statement surface) + a captured Telegram
// transport, asserting:
//   1. the timeline 0-0 → 1-0 → 2-0: EXACTLY one alert per goal, in order,
//      with the accurate score line each time (goal:1-0 then goal:2-0).
//   2. a re-sweep of the same 2-0: ZERO alerts (the per-tuple D1 claim).
//   3. a provider-error gap (score missing) mid-match: ZERO alerts during
//      the gap + NO burst on recovery — the next real goal (2-1... wait:
//      2-0 → gap → 2-0) fires nothing; 2-0 → gap → 3-0 fires exactly ONE
//      (goal:3-0), not the 2-goal burst a reset baseline would produce.
//   4. the MISSING-IS-NOT-ZERO law: a null-score live sighting never seeds
//      a fake 0-0 (the snapshot stays empty until a REAL score arrives; the
//      first real 1-0 sighting seeds and does NOT fire).
//   5. the EITHER-side fan-out gate: a chat following only the HOME side
//      receives an AWAY goal too (a goal event fans out to followers of
//      either side); a chat following NEITHER side receives nothing.
//   6. the engine regression: the same tick's sendMatchNotifications still
//      fires match-start (the goal layer never touches the engine types).
//   7. fail-closed D1: with the notified store failing, a goal tick sends
//      NOTHING (no claim, no send) and the next healthy tick re-derives it.
// Run: npx tsx scripts/s19-goal-smoke.ts
async function main() {
  const goalAlert = await import("../src/goal-alert.ts");
  const mock = await import("./lib/mock-env.js") as any;

  // ---- the mock environment (in-memory KV + D1 + captured transport) ----
  const kv = mock.makeKV();
  const d1 = mock.makeD1({});
  const SENT: any[] = []; // the captured Telegram sends (text + photo)
  const env: any = {
    STATE: kv,
    USERS_DB: d1,
    BOT_TOKEN: "test-token",
    CHAT_ID: "501",
    TEHRAN_TZ: "Asia/Tehran",
    SIM_NOTIFIED_KEY: undefined,
  };

  // Seed the roster + prefs through the mock D1 (the user-store seam reads
  // these): chat 501 follows ONLY Barcelona (home side); chat 502 follows
  // only Real Madrid (away side); chat 503 follows neither.
  await d1.prepare("INSERT OR IGNORE INTO chats (chat_id, joined_at) VALUES (?1, ?2)").bind(501, "2026-11-01").run();
  await d1.prepare("INSERT OR IGNORE INTO chats (chat_id, joined_at) VALUES (?1, ?2)").bind(502, "2026-11-01").run();
  await d1.prepare("INSERT OR IGNORE INTO chats (chat_id, joined_at) VALUES (?1, ?2)").bind(503, "2026-11-01").run();
  await d1.prepare("INSERT INTO user_prefs (chat_id, teams, tz, lang, updated_at) VALUES (?1, ?2, ?3, ?4, ?5)")
    .bind(501, JSON.stringify(["FC Barcelona"]), "Asia/Tehran", "fa", "2026-11-01").run();
  await d1.prepare("INSERT INTO user_prefs (chat_id, teams, tz, lang, updated_at) VALUES (?1, ?2, ?3, ?4, ?5)")
    .bind(502, JSON.stringify(["Real Madrid CF"]), "Asia/Tehran", "fa", "2026-11-01").run();
  await d1.prepare("INSERT INTO user_prefs (chat_id, teams, tz, lang, updated_at) VALUES (?1, ?2, ?3, ?4, ?5)")
    .bind(503, JSON.stringify(["Liverpool FC"]), "Asia/Tehran", "fa", "2026-11-01").run();

  // ---- stub the transport + card + channel seams (module-level monkey-
  // patching via the module registry is not available under tsx ESM; the
  // REAL detectGoalEvents imports them — so we intercept at the env/transport
  // boundary instead: the senders hit api.telegram.org, which we cannot let
  // happen. STRATEGY: run the REAL detection with a captured transport by
  // swapping global fetch BEFORE the first import resolution of telegram.ts
  // side effects — telegram.ts only uses fetch inside its senders, so a
  // global fetch stub captures every send deterministically.)
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async (url: any, init?: any) => {
    const u = String(url);
    if (/api\.telegram\.org\/bot[^/]+\/sendMessage/.test(u)) {
      const body = JSON.parse(String(init && init.body));
      SENT.push({ kind: "text", chatId: body.chat_id, text: body.text });
      return new Response(JSON.stringify({ ok: true, result: { message_id: SENT.length } }), { status: 200 });
    }
    if (/api\.telegram\.org\/bot[^/]+\/sendPhoto/.test(u)) {
      const m = String(init && init.body).match(/name="chat_id"\r?\n\r?(\d+)/) || String(init && init.body).match(/chat_id["']?[:=]\s*"?(\d+)/);
      SENT.push({ kind: "photo", chatId: m ? Number(m[1]) : null, caption: String(init && init.body).slice(0, 60) });
      return new Response(JSON.stringify({ ok: true, result: { message_id: SENT.length } }), { status: 200 });
    }
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }) as any;

  let pass = 0, fail = 0;
  const assert = (name: string, cond: boolean, detail?: string) => {
    if (cond) { pass++; console.log("PASS " + name); }
    else { fail++; console.error("FAIL " + name + (detail ? " — " + detail : "")); }
  };

  const NOW = Date.now();
  const KO = new Date(NOW - 30 * 6e4).toISOString(); // kicked off 30min ago
  const mk = (status: string, h: number | null, a: number | null) => ({
    id: "smoke-1",
    competition: { code: "PL", name: "Premier League", emblem: null },
    homeTeam: { name: "FC Barcelona", crest: null },
    awayTeam: { name: "Real Madrid CF", crest: null },
    utcDate: KO, status,
    score: h == null ? null : { fullTime: { home: h, away: a } },
  });
  const textSends = () => SENT.filter((s) => s.kind === "text");

  // ============================================================
  // PART 4 first (the MISSING-IS-NOT-ZERO seeding law) — a null-score
  // live sighting must seed NOTHING and fire NOTHING.
  // ============================================================
  console.log("\n--- PART 4: MISSING-IS-NOT-ZERO (null score seeds nothing) ---");
  let r = await goalAlert.detectGoalEvents(env, [mk("IN_PLAY", null, null)]);
  const snap0 = await kv.get("goal_snapshots_v1", "json");
  assert("a null-score live sighting seeds NO snapshot row (never a fake 0-0)", snap0 === null || Object.keys(snap0).length === 0, JSON.stringify(snap0));
  assert("a null-score live sighting fires nothing", r.events === 0 && SENT.length === 0);

  // ============================================================
  // PART 1: the timeline 0-0 → 1-0 → 2-0 — one alert per goal, in order.
  // ============================================================
  console.log("\n--- PART 1: the 0-0 → 1-0 → 2-0 timeline ---");
  r = await goalAlert.detectGoalEvents(env, [mk("IN_PLAY", 0, 0)]);
  assert("the first REAL 0-0 sighting seeds the baseline and fires nothing (a real 0-0 is legitimately no alert)",
    r.events === 0 && textSends().length === 0);
  let snap = await kv.get("goal_snapshots_v1", "json");
  assert("the snapshot row exists at 0-0 after the seeding tick", snap && snap[Object.keys(snap)[0]] && snap[Object.keys(snap)[0]].h === 0);

  r = await goalAlert.detectGoalEvents(env, [mk("IN_PLAY", 1, 0)]);
  assert("the 1-0 goal fires exactly ONE event", r.events === 1, "events=" + r.events);
  assert("both side-followers receive the 1-0 alert (the EITHER-side fan-out: 501 follows home, 502 follows away)",
    textSends().length === 2 && textSends().every((s) => s.chatId === 501 || s.chatId === 502),
    JSON.stringify(textSends().map((s) => s.chatId)));
  assert("the non-follower (503) receives nothing", !textSends().some((s) => s.chatId === 503));
  const firstAlert = textSends()[0];
  assert("the fa alert carries «گُل!» + the accurate score line «۱\\-۰» + the side attribution «گلِ بارسلونا»",
    firstAlert.text.includes("گُل") && firstAlert.text.includes("*۱\\-۰*") && firstAlert.text.includes("گلِ بارسلونا"),
    firstAlert.text);

  r = await goalAlert.detectGoalEvents(env, [mk("IN_PLAY", 2, 0)]);
  assert("the 2-0 goal fires exactly ONE more event (two goals total across the timeline)",
    r.events === 1 && textSends().length === 4, "events=" + r.events + " sends=" + textSends().length);
  const secondRound = textSends().slice(2);
  assert("the 2-0 alert shows the CURRENT score «۲\\-۰»", secondRound.every((s) => s.text.includes("*۲\\-۰*")));

  // ============================================================
  // PART 2: a re-sweep of the same 2-0 — ZERO alerts.
  // ============================================================
  console.log("\n--- PART 2: the re-sweep idempotency ---");
  r = await goalAlert.detectGoalEvents(env, [mk("IN_PLAY", 2, 0)]);
  assert("a re-sweep of the same 2-0 alerts ZERO times (the per-tuple D1 claim + the unchanged snapshot)",
    r.events === 0 && textSends().length === 4, "events=" + r.events + " sends=" + textSends().length);

  // ============================================================
  // PART 3: the provider-error gap — no alerts during, no burst after.
  // ============================================================
  console.log("\n--- PART 3: the provider-error gap (fail-closed) ---");
  r = await goalAlert.detectGoalEvents(env, [mk("IN_PLAY", null, null)]);
  assert("the gap tick (score missing) fires nothing", r.events === 0 && textSends().length === 4);
  snap = await kv.get("goal_snapshots_v1", "json");
  assert("the gap tick RETAINS the 2-0 baseline (fail-closed: the snapshot survives the provider outage)",
    snap && Object.values(snap).some((row: any) => row.h === 2 && row.a === 0), JSON.stringify(snap));
  r = await goalAlert.detectGoalEvents(env, [mk("IN_PLAY", 3, 0)]);
  assert("recovery 2-0 → 3-0 fires exactly ONE goal (goal:3-0) — NOT a burst from a reset baseline",
    r.events === 1 && textSends().length === 6, "events=" + r.events + " sends=" + textSends().length);
  const thirdRound = textSends().slice(4);
  assert("the recovery alert shows the accurate «۳\\-۰»", thirdRound.every((s) => s.text.includes("*۳\\-۰*")));

  // ============================================================
  // PART 7: fail-closed D1 — a goal tick with the notified store failing
  // sends NOTHING; the next healthy tick re-derives it exactly once.
  // ============================================================
  console.log("\n--- PART 7: the fail-closed D1 claim ---");
  const d1Failing = mock.makeD1({ failWrites: true, failReads: true });
  const envFail: any = { ...env, USERS_DB: d1Failing };
  r = await goalAlert.detectGoalEvents(envFail, [mk("IN_PLAY", 4, 0)]);
  assert("a D1 outage sends NOTHING (no claim, no send — fail-closed anti-spam)",
    r.events === 0 && textSends().length === 6, "events=" + r.events);
  r = await goalAlert.detectGoalEvents(env, [mk("IN_PLAY", 4, 0)]);
  assert("the next healthy tick re-derives the 4-0 delta and sends it exactly once",
    r.events === 1 && textSends().length === 8, "events=" + r.events + " sends=" + textSends().length);

  // ============================================================
  // PART 5 (audience detail): the AWAY-side goal reaches the HOME-only
  // follower — covered above by 502 receiving home goals; now the away
  // goal: 4-0 → 4-1 must reach BOTH 501 (home-only) and 502 (away-only).
  // ============================================================
  console.log("\n--- PART 5: the away-side goal reaches both side-followers ---");
  r = await goalAlert.detectGoalEvents(env, [mk("IN_PLAY", 4, 1)]);
  const awayRound = textSends().slice(8);
  assert("the away goal fires once and reaches BOTH the home-only and away-only followers",
    r.events === 1 && awayRound.length === 2 && awayRound.some((s) => s.chatId === 501) && awayRound.some((s) => s.chatId === 502),
    JSON.stringify(awayRound.map((s) => s.chatId)));
  assert("the away-goal attribution names the away side («گلِ رئال مادرید»)",
    awayRound.every((s) => s.text.includes("گلِ رئال مادرید")), awayRound[0] && awayRound[0].text);

  // ============================================================
  // PART 6: the engine regression — the same tick still runs
  // sendMatchNotifications' match-start path (the goal layer never touches
  // the engine types). Proven at the composition level: the REAL engine's
  // match-start + result formatters produce their bytes unchanged.
  // ============================================================
  console.log("\n--- PART 6: the engine regression (composition) ---");
  const composers = await import("../src/composers.ts");
  const startMsg = await composers.formatMatchStartMessage(mk("IN_PLAY", 4, 1), env, "fa");
  assert("the engine's match-start composition is unchanged («مسابقه شروع شد» headline)",
    startMsg.includes("مسابقه شروع شد"), startMsg.slice(0, 120));
  const resMsg = await composers.formatResultMessage(mk("FINISHED", 4, 1), env, "fa");
  assert("the engine's result composition is unchanged («نتیجه نهایی» headline + «۴\\-۱» in its MarkdownV2-escaped form)",
    resMsg.includes("نتیجه نهایی") && resMsg.includes("۴\\-۱"), resMsg.slice(0, 160));

  // ---- the snapshot-write budget sanity: the KV map holds exactly the
  // in-window live rows (1 here), never the whole pool ----
  snap = await kv.get("goal_snapshots_v1", "json");
  assert("the KV snapshot map stays compact (exactly the live match's row)", Object.keys(snap).length === 1, JSON.stringify(Object.keys(snap)));

  globalThis.fetch = realFetch;
  console.log("\ns19-goal-smoke: " + pass + " passed, " + fail + " failed");
  if (fail) process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
