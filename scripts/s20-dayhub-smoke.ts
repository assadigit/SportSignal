// scripts/s20-dayhub-smoke.ts
// Session 20 — the ALL-MATCHES DAY PAGES seeded harness (the
// s17-faq-smoke/s18-content-smoke/s19-goal-smoke pattern). The REAL
// builders + the REAL hygiene predicates + the REAL goal layer, seeded:
//   (a) a normal CLUB day — the today hub lists big + non-big + FD-4 rows in
//       the pinned order (big first, then chronological — the ranking law
//       the owner asked for, now over the widened universe);
//   (b) a BREAK day — the raw sportscore international feed (reversed
//       duplicates, ghost rows, youth + women noise) passes the REAL
//       sanitizeIntlRows and the today hub lists the seniors with their
//       Persian comp/team names;
//   (c) a DEAD day — the honest empty state (MISSING-IS-NOT-ZERO: no
//       fabricated matches);
//   (d) the SIDE-EFFECT MAP — shouldReport || top3-involvement and
//       upcomingBig (the /matches hub + sitemap-upcoming + feed source)
//       stay FREE of every new-comp row;
//   (e) the GOAL-ALERT zero-audience skip — an in-flight Iraq–IR Iran goal
//       with no national-team followers claims nothing, sends nothing, and
//       the baseline still advances.
// Run: npx tsx scripts/s20-dayhub-smoke.ts
// (Timing tolerance: the today-day seeds sit ~25-90min ahead of now — the
// same-day Tehran bucket assumption the s17/s18 harnesses make.)
async function main() {
  const pages = await import("../src/seo/pages.ts");
  const dataMod = await import("../src/seo/data.ts");
  const intl = await import("../src/provider-intl.ts");
  const pm = await import("../src/public-matches.ts");
  const classify = await import("../src/match-classify.ts");
  const goalAlert = await import("../src/goal-alert.ts");
  const mock = await import("./lib/mock-env.js") as any;

  let pass = 0, fail = 0;
  const assert = (name: string, cond: boolean, detail?: string) => {
    if (cond) { pass++; console.log("PASS " + name); }
    else { fail++; console.error("FAIL " + name + (detail ? " — " + detail : "")); }
  };

  // ---- the shared seeded ctx builder (REAL pubMatch shaping) ----
  const mkRow = (code: string, home: string, away: string, status: string, iso: string, hs?: number, as?: number) => ({
    id: "s20-" + code + "-" + home + "-" + away + "-" + iso,
    utcDate: iso, status, stage: null, roundRaw: "",
    competition: { code },
    homeTeam: { name: home, crest: null },
    awayTeam: { name: away, crest: null },
    score: hs != null ? { fullTime: { home: hs, away: as } } : null
  });
  const buildCtx = (rows: any[]) => {
    const shaped = rows.map((m) => pm.pubMatch(m));
    return {
      env: { STATE: { async get() { return null; }, async put() { } } },
      payload: {
        upcoming: [], finished: [], nextBig: null, topSpot: null, thisWeek: [], nextWeek: [],
        cups: [], ucl: null,
        standings: {
          PD: { teams: [
            { name: "Real Madrid CF", faName: "رئال مادرید" }, { name: "FC Barcelona", faName: "بارسلونا" },
            { name: "Atlético Madrid", faName: "اتلتیکو مادرید" }
          ], faName: "لالیگا", emblem: null }
        },
        fetchedAt: "2026-11-18T00:00:00.000Z", degraded: false
      },
      pool: rows, shaped, fetchedAt: "2026-11-18T00:00:00.000Z", degraded: false
    };
  };
  const countRows = (html: string) => (html.match(/class="mrow"/g) || []).length;

  // ============================================================
  // PART (a) — a normal club day: the ranking law over the widened universe
  // ============================================================
  console.log("\n--- PART (a): the club day (big-first + chronological + the FD-4 rows) ---");
  const now = Date.now();
  const T = (min: number) => new Date(now + min * 6e4).toISOString();
  const clubDay = [
    mkRow("PD", "Nottingham Forest FC", "AFC Bournemouth", "TIMED", T(25)),      // non-big, EARLIEST kickoff
    mkRow("PD", "Everton FC", "Fulham FC", "TIMED", T(50)),                     // non-big, second
    mkRow("PD", "FC Barcelona", "Real Madrid CF", "TIMED", T(90)),              // BIG (El Clásico) — LATEST kickoff
    mkRow("BSA", "Cruzeiro EC", "SE Palmeiras", "TIMED", T(140))                // the FD-4 Brasileirão row
  ];
  const ctxA: any = buildCtx(clubDay);
  const todayHtml = await pages.buildTodayPage(ctxA);
  assert("the today hub renders 200-style HTML for the club day", /بازی\u200cهای فوتبال امروز/.test(todayHtml), "no H1 marker");
  assert("the answer card counts all 4 matches («۴ بازی امروز در برنامه است (۱ بازی بزرگ)»)",
    /۴ بازی امروز در برنامه است/.test(todayHtml) && /\(۱ بازی بزرگ\)/.test(todayHtml),
    (todayHtml.match(/[^<]*بازی امروز[^<]*/g) || []).join("|"));
  assert("the ranking law: the BIG El Clásico row sorts ABOVE the earlier non-big rows (big-first, not kickoff order)",
    todayHtml.indexOf("بارسلونا") < todayHtml.indexOf("ناتینگهام"), "clásico@" + todayHtml.indexOf("بارسلونا") + " forest@" + todayHtml.indexOf("ناتینگهام"));
  assert("the non-big rows keep their CHRONOLOGICAL order after the big one (Forest(+25m) before Everton(+50m))",
    todayHtml.indexOf("ناتینگهام") < todayHtml.indexOf("اورتون"));
  assert("the FD-4 Brasileirão row LISTS (the widened universe — the break-day filler)",
    /Cruzeiro EC/.test(todayHtml) && /سری \u0622 برزیل/.test(todayHtml), "no BSA row/comp name");
  assert("the club day renders exactly 4 match rows (one per fixture)",
    countRows(todayHtml) === 4, "rows=" + countRows(todayHtml));

  // ============================================================
  // PART (b) — the break day: the hygiene law + the senior internationals
  // ============================================================
  console.log("\n--- PART (b): the break day (the intl feed passes hygiene) ---");
  const rawFeed = [
    mkRow("INTL_FR", "Qatar", "South Korea", "SCHEDULED", T(40)),                       // reversed dupe A
    mkRow("INTL_FR", "South Korea", "Qatar", "SCHEDULED", T(40)),                       // reversed dupe B (same kickoff)
    mkRow("INTL_FR", "Tahiti", "Cook Islands", "SCHEDULED", T(40)),                     // ghost-row class twin
    mkRow("INTL_FR", "Tahiti", "Cook Islands", "FINISHED", T(40)),                     // ghost-row class twin (finished)
    mkRow("INTL_FR", "South Korea U21", "Mexico U23", "SCHEDULED", T(40)),              // youth noise
    mkRow("INTL_FR", "Italy (w)", "Germany Women", "SCHEDULED", T(40)),                 // women noise
    mkRow("INTL_FR", "Iraq", "IR Iran", "SCHEDULED", T(40)),                            // senior
    mkRow("UEFA_NL", "Denmark", "Norway", "SCHEDULED", T(60))                           // senior
  ];
  const sanitized = intl.sanitizeIntlRows(rawFeed);
  assert("the hygiene pass collapses the raw feed to exactly the 4 senior rows (dupe + ghost merged, youth + women dropped)",
    sanitized.length === 4, "sanitized=" + sanitized.length + " " + sanitized.map((r: any) => r.homeTeam.name + " v " + r.awayTeam.name).join(" | "));
  assert("the reversed dupe survives as ONE row (unordered-pair collapse)",
    sanitized.filter((r: any) => /Qatar|South Korea/.test(r.homeTeam.name + r.awayTeam.name)).length === 1);
  assert("the ghost-row pair survives as ONE row",
    sanitized.filter((r: any) => /Tahiti|Cook Islands/.test(r.homeTeam.name + r.awayTeam.name)).length === 1);
  assert("no youth/women row survives the hygiene law",
    !sanitized.some((r: any) => /U1[6-9]|U2[0-3]|\(w\)|Women/i.test(r.homeTeam.name + r.awayTeam.name)));
  const ctxB: any = buildCtx(sanitized);
  const breakHtml = await pages.buildTodayPage(ctxB);
  assert("the break-day today hub LISTS the senior internationals (ایران + قطر/کره جنوبی + دانمارک + تاهیتی)",
    /ایران/.test(breakHtml) && /قطر/.test(breakHtml) && /دانمارک/.test(breakHtml), "missing senior names");
  assert("the Persian comp names ride the intl rows («بازی دوستانه ملی» + «لیگ ملت\u200cهای اروپا»)",
    /بازی دوستانه ملی/.test(breakHtml) && /لیگ ملت\u200cهای اروپا/.test(breakHtml), "missing comp names");
  assert("the rendered break-day list carries exactly 3 rows — the ghost pair's collapsed FINISHED row correctly does NOT render as an upcoming hub row",
    countRows(breakHtml) === 3, "rows=" + countRows(breakHtml));
  assert("no youth/women text ever renders on the page",
    !/U2[0-3]|\(w\)|Women/.test(breakHtml));
  assert("the finished Tahiti–Cook Islands ghost never renders as an upcoming row (the phantom is dead)",
    !/Tahiti|تاهیتی/.test(breakHtml));

  // ============================================================
  // PART (c) — the dead day: the honest empty state
  // ============================================================
  console.log("\n--- PART (c): the dead day (MISSING-IS-NOT-ZERO) ---");
  const ctxC: any = buildCtx([mkRow("PD", "FC Barcelona", "Real Madrid CF", "TIMED", new Date(now + 3 * 864e5).toISOString())]);
  const deadHtml = await pages.buildTodayPage(ctxC);
  assert("a dead day renders the honest empty state («مسابقه\u200cای در راه نیست» — no fabricated matches)",
    /مسابقه\u200cای در راه نیست/.test(deadHtml));
  assert("the dead-day FAQ answers honestly (nothing scheduled yet)",
    /برای امروز ثبت نشده است/.test(deadHtml));
  assert("the dead day renders ZERO match rows",
    countRows(deadHtml) === 0);

  // ============================================================
  // PART (d) — the side-effect map: the gated surfaces stay free
  // ============================================================
  console.log("\n--- PART (d): the side-effect map (homepage / /matches / sitemap stay gated) ---");
  const newCompRows = [
    mkRow("BSA", "Cruzeiro EC", "SE Palmeiras", "TIMED", T(140)),
    mkRow("DED", "PSV Eindhoven", "Ajax Amsterdam", "TIMED", T(150)),
    mkRow("PPL", "SL Benfica", "FC Porto", "TIMED", T(160)),
    mkRow("ELC", "Leeds United FC", "Burnley FC", "TIMED", T(170)),
    mkRow("INTL_FR", "Iraq", "IR Iran", "TIMED", T(40)),
    mkRow("UEFA_NL", "Denmark", "Norway", "TIMED", T(60)),
    mkRow("AFCON_Q", "Egypt", "Morocco", "TIMED", T(70)),
    mkRow("CONCACAF_NL", "USA", "Mexico", "TIMED", T(80))
  ];
  const norm = (n: string) => String(n || "").toLowerCase().replace(/\s+/g, "");
  const top3: Record<string, Set<string>> = { PD: new Set(["realmadridcf", "fcarcelona", "atleticomadrid"]) };
  const isTopTeamInvolved = (m: any) => {
    const set = top3[m.competition.code];
    if (!set) return false;
    return set.has(norm(m.homeTeam.name)) || set.has(norm(m.awayTeam.name));
  };
  for (const m of newCompRows) {
    assert("shouldReport stays FALSE for " + m.competition.code + " (the consolidated tier — homepage lists + pool retention semantics unchanged)",
      classify.shouldReport(m) === false);
  }
  assert("the homepage tier (shouldReport || top3-involvement) admits ZERO new-comp rows",
    !newCompRows.some((m) => classify.shouldReport(m) || isTopTeamInvolved(m)));
  const ctxD: any = buildCtx(newCompRows);
  const bigList = dataMod.upcomingBig(ctxD);
  assert("upcomingBig (the /matches hub + sitemap-upcoming + feed.xml source) stays FREE of new-comp rows",
    bigList.length === 0, "bigList=" + bigList.length);
  assert("upcomingFollowed (the time hubs' source) LISTS every new-comp row — the feature's whole point",
    dataMod.upcomingFollowed(ctxD).length === 8);

  // ============================================================
  // PART (e) — the goal-alert zero-audience skip
  // ============================================================
  console.log("\n--- PART (e): the goal-alert zero-audience skip ---");
  const kv = mock.makeKV();
  const d1 = mock.makeD1({});
  const SENT: any[] = [];
  const env: any = { STATE: kv, USERS_DB: d1, BOT_TOKEN: "test-token", CHAT_ID: "501", TEHRAN_TZ: "Asia/Tehran", SIM_NOTIFIED_KEY: undefined };
  await d1.prepare("INSERT OR IGNORE INTO chats (chat_id, joined_at) VALUES (?1, ?2)").bind(501, "2026-11-01").run();
  await d1.prepare("INSERT INTO user_prefs (chat_id, teams, tz, lang, updated_at) VALUES (?1, ?2, ?3, ?4, ?5)")
    .bind(501, JSON.stringify(["FC Barcelona"]), "Asia/Tehran", "fa", "2026-11-01").run();
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async (url: any, init?: any) => {
    const u = String(url);
    if (/api\.telegram\.org\/bot[^/]+\/sendMessage/.test(u)) {
      const body = JSON.parse(String(init && init.body));
      SENT.push({ kind: "text", chatId: body.chat_id });
      return new Response(JSON.stringify({ ok: true, result: { message_id: SENT.length } }), { status: 200 });
    }
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }) as any;
  const KO = new Date(Date.now() - 30 * 6e4).toISOString();
  const intlMatch = (h: number | null, a: number | null) => ({
    id: "s20-intl-1",
    competition: { code: "INTL_FR", name: "International Friendly", emblem: null },
    homeTeam: { name: "Iraq", crest: null },
    awayTeam: { name: "IR Iran", crest: null },
    utcDate: KO, status: "IN_PLAY",
    score: h == null ? null : { fullTime: { home: h, away: a } }
  });
  let r = await goalAlert.detectGoalEvents(env, [intlMatch(0, 0)]);
  assert("the 0-0 first sighting seeds the baseline and fires nothing",
    r.events === 0 && SENT.length === 0);
  r = await goalAlert.detectGoalEvents(env, [intlMatch(1, 0)]);
  assert("the Iraq goal fires an EVENT but CLAIMS nothing — zero-audience (no national-team followers)",
    r.events === 0 && r.noChats === 1, "events=" + r.events + " noChats=" + r.noChats);
  assert("the zero-audience skip sends NOTHING (no Telegram calls)",
    SENT.length === 0, "sent=" + JSON.stringify(SENT));
  assert("the baseline still ADVANCES (the snapshot reads 1-0 — the next sweep will not re-derive the goal)",
    (() => { const snap = kv._map.get("goal_snapshots_v1"); if (!snap) return false; const j = JSON.parse(snap.v); return Object.values(j).some((row: any) => row.h === 1 && row.a === 0); })(),
    JSON.stringify(kv._map.get("goal_snapshots_v1")));
  assert("the notified ledger carries ZERO goal claims for the intl match",
    [...d1._tables.notified_v1.keys()].filter((k) => String(k).includes("goal:")).length === 0);
  globalThis.fetch = realFetch;

  console.log("\ns20-dayhub-smoke: " + pass + " passed, " + fail + " failed");
  if (fail) process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
