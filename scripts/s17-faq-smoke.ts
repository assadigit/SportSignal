// scripts/s17-faq-smoke.ts
// SEO Follow-up Session 17 — the FAQ render harness (the s9/s10/s11 seeded
// harness pattern). A seeded SeoCtx renders the REAL builders + asserts the
// S17 contracts:
//   1. /teams/barcelona (buildTeamPage) — the FAQPage node (3 Qs: next
//      fixture / league / Tehran time) + the visible faqcard BELOW the
//      answercard + the T-20 byte-identical contract (the JSON-LD q/a ===
//      the visible q/a) + the byte-frozen title/H1 unchanged.
//   2. /matches/barcelona-vs-rb-leipzig-… (buildMatchPage, WITH venue —
//      Camp Nou from the home-ground table) — the FAQPage node (4 Qs incl.
//      the venue Q) + the T-20 contract against the visible accordion.
//   3. A no-venue match (Lille OSC home) — 3 Qs (the venue Q OMITS — the
//      MISSING-IS-NOT-ZERO law).
//   4. A team with an EMPTY upcoming window — 1 Q (the honest empty answer;
//      Q2/Q3 omit — no fabricated league/kickoff).
// Run: npx tsx scripts/s17-faq-smoke.ts
async function main() {
  const pages = await import("../src/seo/pages.ts");
  const slugs = await import("../src/slugs.ts");
  const teamSlug = slugs.teamSlug;

  // ---- Seed: upcoming matches (2-6 days out, TIMED) + one finished pair ----
  const base = Date.now() + 2 * 864e5;
  const T = (days: number) => new Date(base + days * 864e5).toISOString();
  const seed = [
    { home: "FC Barcelona",     away: "RB Leipzig",        code: "CL", compFa: "لیگ قهرمانان اروپا", date: T(0) },
    { home: "Real Madrid CF",   away: "Inter Milan",       code: "PD", compFa: "لالیگا",             date: T(1) },
    { home: "Lille OSC",        away: "Nice",              code: "FL1", compFa: "لیگ ۱ فرانسه",      date: T(2) },
    { home: "Chelsea FC",       away: "AC Milan",          code: "PL", compFa: "لیگ برتر انگلیس",   date: T(3) },
  ];
  const pool: any[] = [];
  const shaped: any[] = [];
  for (const s of seed) {
    const id = "smoke-" + s.home + "-vs-" + s.away;
    const raw = {
      id, homeTeam: { name: s.home, crest: null }, awayTeam: { name: s.away, crest: null },
      utcDate: s.date, status: "TIMED", competition: { code: s.code, emblem: null }, score: null,
    };
    const sh = {
      id, homeTeam: { name: s.home, faName: s.home === "FC Barcelona" ? "بارسلونا" : s.home, crest: null },
      awayTeam: { name: s.away, faName: s.away === "RB Leipzig" ? "لایپزیش" : s.away, crest: null },
      utcDate: s.date, path: "/matches/" + teamSlug(s.home) + "-vs-" + teamSlug(s.away) + "-" + s.date.slice(0, 10),
      competition: { code: s.code, faName: s.compFa, emblem: null },
      status: "TIMED", round: "Matchday 5", roundFa: "هفته ۵", big: true,
    };
    pool.push(raw); shaped.push(sh);
  }
  // A finished pair (12 days ago — inside the 30-day finished window): the
  // team page's upcoming list is EMPTY → the honest empty-answer FAQ.
  const past = new Date(Date.now() - 12 * 864e5).toISOString();
  const fid = "smoke-toulouse-vs-rennes";
  pool.push({
    id: fid, homeTeam: { name: "Toulouse FC", crest: null }, awayTeam: { name: "Stade Rennais FC", crest: null },
    utcDate: past, status: "FINISHED", competition: { code: "FL1", emblem: null }, score: { home: 1, away: 1 },
  });
  shaped.push({
    id: fid, homeTeam: { name: "Toulouse FC", faName: "تولوز", crest: null },
    awayTeam: { name: "Stade Rennais FC", faName: "رن", crest: null },
    utcDate: past, path: "/matches/" + teamSlug("Toulouse FC") + "-vs-" + teamSlug("Stade Rennais FC") + "-" + past.slice(0, 10),
    competition: { code: "FL1", faName: "لیگ ۱ فرانسه", emblem: null },
    status: "FINISHED", big: false,
  });

  const ctx: any = {
    env: { STATE: { get: async () => null } }, // mock — fail-closed (no KV)
    payload: {
      upcoming: [], finished: [], nextBig: null, topSpot: null,
      thisWeek: [], nextWeek: [], cups: [], ucl: null,
      standings: {}, fetchedAt: null, degraded: false,
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
  // PART 1: /teams/barcelona — the team-page FAQPage + the visible faqcard
  // ============================================================
  console.log("\n--- /teams/barcelona (buildTeamPage) ---");
  const teamRes = await pages.buildTeamPage(ctx, "barcelona");
  assert("S17 team-page renders (notFound=false)", teamRes.notFound === false, "got notFound=" + teamRes.notFound);
  if (!teamRes.notFound) {
    const tHtml = teamRes.html;
    const graph = jsonldGraph(tHtml);
    const faq = findByType(graph, "FAQPage");
    assert("S17-M1 team-page: the @graph carries a FAQPage node", !!faq);
    if (faq) {
      const qs: any[] = (faq.mainEntity || []);
      assert("S17-M1 team-page: 3 Questions (next fixture / league / Tehran time)",
        qs.length === 3, "got " + qs.length + ": " + JSON.stringify(qs.map((q: any) => q.name)));
      assert("S17-M1 team-page: Q1 === «بازی بعدی بارسلونا کی است؟» (the #1 GSC query pattern)",
        qs[0] && qs[0].name === "بازی بعدی بارسلونا کی است؟", "got " + JSON.stringify(qs[0] && qs[0].name));
      assert("S17-M1 team-page: Q1's answer carries the fixture + the competition + Tehran time",
        !!(qs[0] && qs[0].acceptedAnswer.text.indexOf("بارسلونا – ") >= 0 &&
          /لایپز/.test(qs[0].acceptedAnswer.text) &&
          qs[0].acceptedAnswer.text.indexOf("لیگ قهرمانان اروپا") >= 0 &&
          qs[0].acceptedAnswer.text.indexOf("به وقت تهران") >= 0),
        "got " + JSON.stringify(qs[0] && qs[0].acceptedAnswer.text));
      assert("S17-M1 team-page: Q2 asks «در کدام لیگ است؟» + names the competition",
        !!(qs[1] && qs[1].name.indexOf("در کدام لیگ است؟") >= 0 &&
          qs[1].acceptedAnswer.text.indexOf("لیگ قهرمانان اروپا") >= 0 &&
          qs[1].acceptedAnswer.text.indexOf("برگزار می‌شود") >= 0),
        "got " + JSON.stringify(qs[1]));
      assert("S17-M1 team-page: Q3 asks the Tehran kickoff + the answer carries it + the UTC pointer",
        !!(qs[2] && qs[2].name.indexOf("ساعت بازی بعدی بارسلونا") === 0 &&
          qs[2].name.indexOf("به وقت تهران چند است؟") >= 0 &&
          qs[2].acceptedAnswer.text.indexOf("به وقت تهران شروع می‌شود") >= 0 &&
          qs[2].acceptedAnswer.text.indexOf("زمان جهانی") >= 0),
        "got " + JSON.stringify(qs[2]));

      // the visible faqcard: the T-20 byte-identical contract
      const faqcardIdx = tHtml.indexOf('<div class="card prose faqcard">');
      const answerIdx = tHtml.indexOf('<div class="answercard">');
      assert("S17-M1 team-page: the visible faqcard renders (the hub faqcard pattern)",
        faqcardIdx >= 0);
      assert("S17-M1/freeze team-page: the faqcard sits BELOW the answer-sentence",
        faqcardIdx > answerIdx && answerIdx >= 0, "faqcard@" + faqcardIdx + " answercard@" + answerIdx);
      const visQ = Array.from(tHtml.matchAll(/<h3 class="faqq">([^<]*)<\/h3>/g)).map((m: any) => m[1]);
      const visA = Array.from(tHtml.matchAll(/<p class="faqa">([^<]*)<\/p>/g)).map((m: any) => m[1]);
      assert("S17-M1 team-page T-20: the visible questions === the JSON-LD Question names (byte-identical)",
        visQ.length === qs.length && qs.every((q: any, i: number) => q.name === visQ[i]),
        "visible=" + JSON.stringify(visQ));
      assert("S17-M1 team-page T-20: the visible answers === the JSON-LD Answer texts (byte-identical)",
        visA.length === qs.length && qs.every((q: any, i: number) => q.acceptedAnswer.text === visA[i]),
        "visible[0]=" + JSON.stringify(visA[0]));
      assert("S17 no-broadcast-claims (team): no «پخش زنده»/watch strings in the faqcard",
        !/پخش\s*زنده|watch|بث\s*زنده/.test(tHtml.slice(faqcardIdx, faqcardIdx + 4000)));
    }
    // the byte-frozen surfaces (re-verified)
    const tTitle = tHtml.match(/<title>([^<]+)<\/title>/);
    assert("S17/freeze team-page: the byte-frozen title unchanged",
      !!tTitle && tTitle[1].indexOf("برنامه بازی بعدی و ساعت شروع") >= 0, "got " + (tTitle ? tTitle[1] : "(none)"));
    const tH1 = tHtml.match(/<h1[^>]*>([^<]+)<\/h1>/);
    assert("S17/freeze team-page: the byte-frozen H1 «برنامه بازی‌های بارسلونا»",
      !!tH1 && tH1[1].indexOf("برنامه بازی‌های") >= 0 && tH1[1].indexOf("بارسلونا") >= 0,
      "got " + (tH1 ? tH1[1] : "(none)"));
    assert("S17/S8 team-page: the @graph still carries NO SportsEvent",
      !findByType(graph, "SportsEvent"));
  }

  // ============================================================
  // PART 2: the WITH-venue match page — the 4-Q FAQPage + the accordion T-20
  // ============================================================
  console.log("\n--- /matches/" + teamSlug("FC Barcelona") + "-vs-" + teamSlug("RB Leipzig") + "-" + seed[0].date.slice(0, 10) + " (buildMatchPage, venue=Camp Nou) ---");
  const mSlug1 = teamSlug("FC Barcelona") + "-vs-" + teamSlug("RB Leipzig") + "-" + seed[0].date.slice(0, 10);
  const mRes1 = await pages.buildMatchPage(ctx, mSlug1);
  assert("S17-M2 match-page renders (notFound=false)", mRes1.notFound === false, "got notFound=" + mRes1.notFound);
  if (!mRes1.notFound) {
    const mHtml = mRes1.html;
    const graph = jsonldGraph(mHtml);
    const faq = findByType(graph, "FAQPage");
    assert("S17-M2 match-page: the @graph carries a FAQPage node (the GEO emit path)", !!faq);
    assert("S17-M2 match-page: the @graph still carries the SportsEvent (the primary node)",
      !!findByType(graph, "SportsEvent"));
    if (faq) {
      const qs: any[] = (faq.mainEntity || []);
      assert("S17-M2 match-page (with venue): 4 Questions (kickoff + venue + competition + timezone)",
        qs.length === 4, "got " + qs.length + ": " + JSON.stringify(qs.map((q: any) => q.name)));
      const venueQ = qs.find((q: any) => q.name.indexOf("کجا برگزار") >= 0);
      assert("S17-M2 match-page: the venue Q present + names Camp Nou (the home-ground table)",
        !!venueQ && venueQ.acceptedAnswer.text.indexOf("کمپ نو") >= 0,
        "got " + JSON.stringify(venueQ));
      // the T-20 contract against the visible accordion
      const btnQ = Array.from(mHtml.matchAll(/<button class="mfaq-q"[^>]*>([^<]*)<\/button>/g)).map((m: any) => m[1]);
      const regA = Array.from(mHtml.matchAll(/<div id="mfaq-a-\d+" class="mfaq-a"[^>]*><p>([^<]*)<\/p>/g)).map((m: any) => m[1]);
      assert("S17-M2 match-page T-20: the accordion questions === the JSON-LD Question names (byte-identical)",
        btnQ.length === qs.length && qs.every((q: any, i: number) => q.name === btnQ[i]),
        "accordion=" + JSON.stringify(btnQ));
      assert("S17-M2 match-page T-20: the accordion answers === the JSON-LD Answer texts (byte-identical)",
        regA.length === qs.length && qs.every((q: any, i: number) => q.acceptedAnswer.text === regA[i]),
        "accordion[0]=" + JSON.stringify(regA[0]));
    }
  }

  // ============================================================
  // PART 3: the NO-venue match page — the venue Q OMITS
  // ============================================================
  console.log("\n--- /matches/" + teamSlug("Lille OSC") + "-vs-" + teamSlug("Nice") + "-" + seed[2].date.slice(0, 10) + " (buildMatchPage, NO venue) ---");
  const mSlug2 = teamSlug("Lille OSC") + "-vs-" + teamSlug("Nice") + "-" + seed[2].date.slice(0, 10);
  const mRes2 = await pages.buildMatchPage(ctx, mSlug2);
  assert("S17-M2 no-venue match-page renders (notFound=false)", mRes2.notFound === false, "got notFound=" + mRes2.notFound);
  if (!mRes2.notFound) {
    const faq2 = findByType(jsonldGraph(mRes2.html), "FAQPage");
    assert("S17-M2 no-venue match-page: the FAQPage carries 3 Questions (the venue Q OMITS — MISSING-IS-NOT-ZERO)",
      !!faq2 && faq2.mainEntity.length === 3 &&
        !faq2.mainEntity.some((q: any) => q.name.indexOf("کجا برگزار") >= 0),
      "got " + JSON.stringify(faq2 && faq2.mainEntity.map((q: any) => q.name)));
  }

  // ============================================================
  // PART 4: the EMPTY team window — the honest empty answer
  // ============================================================
  console.log("\n--- /teams/" + teamSlug("Toulouse FC") + " (buildTeamPage, EMPTY upcoming) ---");
  const teamRes2 = await pages.buildTeamPage(ctx, teamSlug("Toulouse FC"));
  assert("S17 empty-window team-page renders (notFound=false)", teamRes2.notFound === false, "got notFound=" + teamRes2.notFound);
  if (!teamRes2.notFound) {
    const faq3 = findByType(jsonldGraph(teamRes2.html), "FAQPage");
    assert("S17 empty-window team-page: 1 Question — the honest empty answer; Q2/Q3 OMIT (no fabricated league/kickoff)",
      !!faq3 && faq3.mainEntity.length === 1 &&
        faq3.mainEntity[0].acceptedAnswer.text.indexOf("ثبت نشده است") >= 0 &&
        !faq3.mainEntity.some((q: any) => q.name.indexOf("کدام لیگ") >= 0 || q.name.indexOf("چند است") >= 0),
      "got " + JSON.stringify(faq3 && faq3.mainEntity.map((q: any) => q.name)));
  }

  console.log("\n" + pass + " passed, " + fail + " failed");
  if (fail) process.exit(1);
}
main().catch((e) => { console.error(e); process.exit(1); });
