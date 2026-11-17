// scripts/s18-content-smoke.ts
// SEO Follow-up Session 18 — the editorial-content render harness (the
// s17-faq-smoke.ts seeded-harness pattern). A seeded SeoCtx renders the
// REAL builders + asserts the S18 contracts:
//   1. /teams/barcelona (buildTeamPage) — the editorial card renders
//      (the h2 «وضعیت فصل بارسلونا» + the standings paragraph + the
//      recent-results run + the upcoming-run close + the source note)
//      + the placement order (answercard < editorialcard < faqcard)
//      + the S17 faqcard regression (the FAQPage node + the T-20 contract
//      survive the reposition) + the byte-frozen title/H1 unchanged.
//   2. A team with NO standings row + NO finished window — the honest
//      degradation (the lead + the source note only; no «نامعلوم»).
//   3. /competitions/la-liga (buildCompetitionPage) — the title-race
//      paragraph + the coverage note + the placement (answer < standings
//      < editorial < fixtures).
//   4. A cup-style competition with NO standings — the title-race paragraph
//      omits, the coverage note stays.
// Run: npx tsx scripts/s18-content-smoke.ts
async function main() {
  const pages = await import("../src/seo/pages.ts");
  const slugs = await import("../src/slugs.ts");
  const teamSlug = slugs.teamSlug;

  // ---- Seed: upcoming + finished matches + a standings table ----
  const base = Date.now() + 2 * 864e5;
  const T = (days: number) => new Date(base + days * 864e5).toISOString();
  const seed = [
    { home: "FC Barcelona", away: "RB Leipzig", code: "CL", compFa: "لیگ قهرمانان اروپا", date: T(0) },
    { home: "FC Barcelona", away: "Chelsea FC", code: "PD", compFa: "لالیگا", date: T(5) },
    { home: "Real Madrid CF", away: "Inter Milan", code: "PD", compFa: "لالیگا", date: T(1) },
  ];
  const pool: any[] = [];
  const shaped: any[] = [];
  for (const s of seed) {
    const id = "smoke-" + s.home + "-vs-" + s.away;
    pool.push({ id, homeTeam: { name: s.home, crest: null }, awayTeam: { name: s.away, crest: null }, utcDate: s.date, status: "TIMED", competition: { code: s.code, emblem: null }, score: null });
    shaped.push({
      id, homeTeam: { name: s.home, faName: s.home === "FC Barcelona" ? "بارسلونا" : s.home, crest: null },
      awayTeam: { name: s.away, faName: s.away === "RB Leipzig" ? "لایپزیگ" : s.away, crest: null },
      utcDate: s.date, path: "/matches/" + teamSlug(s.home) + "-vs-" + teamSlug(s.away) + "-" + s.date.slice(0, 10),
      competition: { code: s.code, faName: s.compFa, emblem: null }, status: "TIMED", round: "Matchday 5", roundFa: "هفته ۵", big: true
    });
  }
  // a finished match 3 days ago (the recent-results prose)
  const past = new Date(Date.now() - 3 * 864e5).toISOString();
  const fid = "smoke-barcelona-vs-sevilla";
  pool.push({ id: fid, homeTeam: { name: "FC Barcelona", crest: null }, awayTeam: { name: "Sevilla FC", crest: null }, utcDate: past, status: "FINISHED", competition: { code: "PD", emblem: null }, score: { home: 3, away: 1 } });
  shaped.push({
    id: fid, homeTeam: { name: "FC Barcelona", faName: "بارسلونا", crest: null },
    awayTeam: { name: "Sevilla FC", faName: "سویا", crest: null },
    utcDate: past, path: "/matches/" + teamSlug("FC Barcelona") + "-vs-" + teamSlug("Sevilla FC") + "-" + past.slice(0, 10),
    competition: { code: "PD", faName: "لالیگا", emblem: null }, status: "FINISHED", big: true
  });
  // a standings table (the same shape the payload carries): Barcelona at pos 2.
  const rows: any[] = [
    { pos: 1, name: "Real Madrid CF", faName: "رئال مادرید", played: 11, won: 9, draw: 2, lost: 0, points: 29 },
    { pos: 2, name: "FC Barcelona", faName: "بارسلونا", played: 11, won: 8, draw: 2, lost: 1, points: 26 },
    { pos: 3, name: "Atletico Madrid", faName: "اتلتیکو مادرید", played: 11, won: 7, draw: 2, lost: 2, points: 23 },
    { pos: 4, name: "Sevilla FC", faName: "سویا", played: 11, won: 5, draw: 3, lost: 3, points: 18 },
    { pos: 5, name: "Villarreal CF", faName: "ویارئال", played: 11, won: 4, draw: 4, lost: 3, points: 16 },
    { pos: 6, name: "Real Sociedad", faName: "رئال سوسیداد", played: 11, won: 4, draw: 3, lost: 4, points: 15 }
  ];
  const ctx: any = {
    env: { STATE: { get: async () => null } }, // mock — fail-closed (no KV)
    payload: {
      upcoming: [], finished: [], nextBig: null, topSpot: null,
      thisWeek: [], nextWeek: [], cups: [], ucl: null,
      standings: { PD: { teams: rows, faName: "لالیگا", emblem: null } },
      fetchedAt: "2026-11-17T00:00:00.000Z", degraded: false,
    },
    pool, shaped, fetchedAt: "2026-11-17T00:00:00.000Z", degraded: false,
  };

  let pass = 0, fail = 0;
  const assert = (name: string, cond: boolean, detail?: string) => {
    if (cond) { pass++; console.log("PASS " + name); }
    else { fail++; console.error("FAIL " + name + (detail ? " — " + detail : "")); }
  };
  const jsonldGraph = (html: string): any[] => {
    const m = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    if (!m) return [];
    try { return JSON.parse(m[1])["@graph"] || []; } catch (e) { return []; }
  };
  const findByType = (graph: any[], type: string): any => {
    return graph.find((n: any) => {
      const t = n["@type"]; return Array.isArray(t) ? t.includes(type) : t === type;
    });
  };

  // ============================================================
  // PART 1: /teams/barcelona — the editorial card + the placement + the
  // S17 regression (the faqcard below the editorial) + the byte-frozen
  // title/H1.
  // ============================================================
  console.log("\n--- /teams/barcelona (buildTeamPage) ---");
  const teamRes = await pages.buildTeamPage(ctx, "barcelona");
  assert("S18 team-page renders (notFound=false)", teamRes.notFound === false, "got notFound=" + teamRes.notFound);
  if (!teamRes.notFound) {
    const tHtml = teamRes.html;
    const edIdx = tHtml.indexOf('class="card prose editorialcard"');
    const answerIdx = tHtml.indexOf('class="answercard"');
    const faqIdx = tHtml.indexOf('class="card prose faqcard"');
    assert("S18-M1: the editorial card renders on the team page", edIdx >= 0, "no editorialcard in html");
    assert("S18/freeze: answercard < editorialcard < faqcard (the content, then the Q&A)",
      answerIdx >= 0 && edIdx > answerIdx && faqIdx > edIdx,
      "answer@" + answerIdx + " editorial@" + edIdx + " faq@" + faqIdx);
    if (edIdx >= 0) {
      const cardEnd = tHtml.indexOf("</div>", tHtml.indexOf("editorsrc")) + 6;
      const card = tHtml.slice(edIdx, cardEnd);
      assert("S18-M1: the h2 «وضعیت فصل بارسلونا»", /<h2>وضعیت فصل بارسلونا<\/h2>/.test(card));
      assert("S18-M1: the standings paragraph (pos 2 + 26 امتیاز + the W/D/L run + the صدرنشین band)",
        /بارسلونا با ۲۶ امتیاز از ۱۱ بازی در ردهٔ ۲ لالیگا قرار دارد/.test(card) &&
        /۸ برد، ۲ مساوی و ۱ شکست/.test(card) &&
        /در رده‌بندی صدرنشین‌ها/.test(card),
        "card=" + card.slice(0, 300));
      assert("S18-M1: the recent-results run (بارسلونا – سویا (۳–۱))",
        /بازی‌های اخیر این تیم \(به‌ترتیب از جدیدترین\): بارسلونا – سویا \(۳–۱\)/.test(card) ||
        /بازی‌های اخیر این تیم/.test(card) && /سویا/.test(card) && /۳–۱/.test(card),
        "card=" + card.slice(0, 500));
      assert("S18-M1: the upcoming-run close (the queued count + the next pair)",
        /در برنامه پیش‌رو ۲ بازی ثبت‌شده است؛ نزدیک‌ترین دیدار بارسلونا – لایپزیگ/.test(card),
        "card=" + card.slice(0, 700));
      assert("S18/E-E-A-T: the source note (football-data.org) rides the editorial card",
        /football-data\.org/.test(card) && /editorsrc/.test(card));
      assert("S18/original-content: no «نامعلوم»/«نامشخص» placeholders in the card",
        !/نامعلوم|نامشخص/.test(card));
    }
    // the S17 regression: the FAQPage node + the T-20 contract + the last-section placement.
    const graph = jsonldGraph(tHtml);
    const faq = findByType(graph, "FAQPage");
    assert("S17 regression: the FAQPage node still in the @graph", !!faq);
    if (faq) {
      const qs: any[] = (faq.mainEntity || []);
      const visQ = Array.from(tHtml.matchAll(/<h3 class="faqq">([^<]*)<\/h3>/g)).map((m: any) => m[1]);
      assert("S17 regression: 3 Questions + the visible faqq byte-identical",
        qs.length === 3 && visQ.length === qs.length && qs.every((q: any, i: number) => q.name === visQ[i]),
        "jsonld=" + JSON.stringify(qs.map((q: any) => q.name)) + " visible=" + JSON.stringify(visQ));
    }
    // the byte-frozen surfaces (re-verified).
    const tTitle = tHtml.match(/<title>([^<]+)<\/title>/);
    assert("S18/freeze: the byte-frozen team-page title unchanged",
      !!tTitle && tTitle[1].indexOf("برنامه بازی بعدی و ساعت شروع") >= 0, "got " + (tTitle ? tTitle[1] : "(none)"));
    const tH1 = tHtml.match(/<h1[^>]*>([^<]+)<\/h1>/);
    assert("S18/freeze: the byte-frozen H1 «برنامه بازی‌های بارسلونا»",
      !!tH1 && tH1[1].indexOf("برنامه بازی‌های") >= 0 && tH1[1].indexOf("بارسلونا") >= 0,
      "got " + (tH1 ? tH1[1] : "(none)"));
    assert("S18/S8 regression: the @graph still carries NO SportsEvent", !findByType(graph, "SportsEvent"));
  }

  // ============================================================
  // PART 2: a team with NO standings row + NO finished window — the honest
  // degradation (the lead + the source note only). Seeded as an upcoming
  // big match (teamsIndex only indexes upcoming playable rows — the
  // s17-faq-smoke Toulouse pattern rides a FINISHED row through the
  // findTeamBySlug pool fallback; here the upcoming seed keeps the page
  // fully rendered with a standings-less team).
  // ============================================================
  console.log("\n--- /teams/" + teamSlug("Nice") + " (buildTeamPage, NO standings/finished) ---");
  // seed one more upcoming match so Nice enters teamsIndex
  const niceSeed = { home: "Nice", away: "Olympique Lyonnais", code: "FL1", compFa: "لیگ ۱ فرانسه", date: T(9) };
  {
    const id = "smoke-nice-vs-lyon";
    const raw = { id, homeTeam: { name: niceSeed.home, crest: null }, awayTeam: { name: niceSeed.away, crest: null }, utcDate: niceSeed.date, status: "TIMED", competition: { code: niceSeed.code, emblem: null }, score: null };
    const sh = { id, homeTeam: { name: niceSeed.home, faName: "نیس", crest: null }, awayTeam: { name: niceSeed.away, faName: "لیون", crest: null }, utcDate: niceSeed.date, path: "/matches/" + teamSlug(niceSeed.home) + "-vs-" + teamSlug(niceSeed.away) + "-" + niceSeed.date.slice(0, 10), competition: { code: niceSeed.code, faName: niceSeed.compFa, emblem: null }, status: "TIMED", big: true };
    ctx.pool.push(raw); ctx.shaped.push(sh);
  }
  const teamRes2 = await pages.buildTeamPage(ctx, teamSlug("Nice"));
  assert("S18 degraded team-page renders (notFound=false)", teamRes2.notFound === false, "got notFound=" + teamRes2.notFound);
  if (!teamRes2.notFound) {
    const edIdx2 = teamRes2.html.indexOf('class="card prose editorialcard"');
    assert("S18/MISSING-IS-NOT-ZERO: the editorial card stays (the lead + the source note)",
      edIdx2 >= 0 && /وضعیت فصل نیس|به‌روزرسانی می‌شود/.test(teamRes2.html.slice(edIdx2, edIdx2 + 900)),
      "no honest editorial card");
    const card2 = teamRes2.html.slice(edIdx2, edIdx2 + 1000);
    assert("S18/MISSING-IS-NOT-ZERO: no «در ردهٔ» paragraph + no «بازی‌های اخیر» paragraph (they omit, never placeholders)",
      edIdx2 < 0 || (!/در ردهٔ/.test(card2) && !/بازی‌های اخیر این تیم/.test(card2)),
      "card=" + card2.slice(0, 400));
  }

  // ============================================================
  // PART 3: /competitions/la-liga — the title-race paragraph + the
  // placement order.
  // ============================================================
  console.log("\n--- /competitions/la-liga (buildCompetitionPage) ---");
  const compRes = await pages.buildCompetitionPage(ctx, "la-liga");
  assert("S18 competition-page renders (notFound=false)", compRes.notFound === false, "got notFound=" + compRes.notFound);
  if (!compRes.notFound) {
    const cHtml = compRes.html;
    const cEdIdx = cHtml.indexOf('class="card prose editorialcard"');
    const cAnswerIdx = cHtml.indexOf('class="answercard"');
    const cTableIdx = cHtml.indexOf('class="stbox"');
    const cListIdx = cHtml.indexOf("بازی‌های پیش‌رو");
    assert("S18-M2: the editorial card renders on the competition page", cEdIdx >= 0, "no editorialcard");
    assert("S18/freeze: answercard < standings table < editorialcard < fixtures list",
      cAnswerIdx >= 0 && cEdIdx > cAnswerIdx && cEdIdx > cTableIdx && cListIdx > cEdIdx,
      "answer@" + cAnswerIdx + " table@" + cTableIdx + " editorial@" + cEdIdx + " list@" + cListIdx);
    const card3 = cHtml.slice(cEdIdx, cHtml.indexOf("</div>", cHtml.indexOf("editorsrc")) + 6);
    assert("S18-M2: the h2 «تصویر کلی لالیگا» + the lead",
      /<h2>تصویر کلی لالیگا<\/h2>/.test(card3) && /در ادامه، تصویر کلی لالیگا/.test(card3));
    assert("S18-M2: the title-race read (رئال مادرید + the 3-point gap + the 2nd/3rd names)",
      /صدر جدول لالیگا در دست رئال مادرید با ۲۹ امتیاز است و فاصلهٔ آن با ردهٔ دوم ۳ امتیاز است/.test(card3) &&
      /رده‌های دوم و سوم — بارسلونا و اتلتیکو مادرید —/.test(card3),
      "card=" + card3.slice(0, 400));
    assert("S18-M2: the coverage note (the honest scope)",
      /این صفحه بازی‌های بزرگ پیش‌روی لالیگا را دنبال می‌کند/.test(card3));
    assert("S18/E-E-A-T: the source note rides the competition editorial card",
      /football-data\.org/.test(card3));
    // the byte-frozen competition-page surfaces (re-verified).
    const cTitle = cHtml.match(/<title>([^<]+)<\/title>/);
    assert("S18/freeze: the byte-frozen competition-page title unchanged",
      !!cTitle && cTitle[1].indexOf("برنامه بازی‌های بزرگ پیش‌رو") >= 0, "got " + (cTitle ? cTitle[1] : "(none)"));
  }

  // ============================================================
  // PART 4: a cup-style competition with NO standings — the title-race
  // paragraph omits, the coverage note stays.
  // ============================================================
  console.log("\n--- /competitions/ucl (buildCompetitionPage, NO standings table) ---");
  // seed a CL-code upcoming match so the UCL entry exists in compsIndex with
  // an EMPTY standings map (the cup degradation path).
  const ctxNoTable: any = {
    ...ctx,
    payload: { ...ctx.payload, standings: {} },
  };
  const compRes2 = await pages.buildCompetitionPage(ctxNoTable, "champions-league");
  assert("S18 cup competition-page renders (notFound=false)", compRes2.notFound === false, "got notFound=" + compRes2.notFound);
  if (!compRes2.notFound) {
    const cHtml2 = compRes2.html;
    const cEdIdx2 = cHtml2.indexOf('class="card prose editorialcard"');
    assert("S18/MISSING-IS-NOT-ZERO: the cup editorial card stays (the coverage note path)",
      cEdIdx2 >= 0, "no editorial card on the cup page");
    const card4 = cHtml2.slice(cEdIdx2, cEdIdx2 + 900);
    assert("S18/MISSING-IS-NOT-ZERO: NO title-race paragraph (no fabricated table)",
      cEdIdx2 < 0 || !/صدر جدول/.test(card4), "card=" + card4.slice(0, 300));
    assert("S18/MISSING-IS-NOT-ZERO: the coverage note + the source note stay",
      /دنبال می‌کند/.test(card4) && /football-data\.org/.test(card4));
  }

  console.log("\n" + pass + " passed, " + fail + " failed");
  if (fail) process.exit(1);
}
main().catch((e) => { console.error(e); process.exit(1); });
