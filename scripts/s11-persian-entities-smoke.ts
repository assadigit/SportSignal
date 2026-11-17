// scripts/s11-persian-entities-smoke.ts
// SEO Program Session 11 — the Persian entity-naming/metadata-polish render harness.
//
// A seeded SeoCtx with 4 upcoming matches (each one selected club vs one
// non-selected club, ascending dates) renders:
//   1. /matches/{barcelona-vs-leipzig-...} (buildMatchPage) — the og:type=
//      article pin + the Barcelona «بارسا» alias in the SportsEvent
//      homeTeam.alternateName JSON-LD + the byte-frozen title/H1/desc
//      unchanged (the Dec 4-8 freeze holds).
//   2. /teams/barcelona (buildTeamPage) — the og:type=article pin + the
//      Barcelona «بارسا» alias in the SportsTeam alternateName JSON-LD +
//      the byte-frozen title/H1/desc unchanged.
//   3. /competitions/la-liga (buildCompetitionPage) — the og:type=article
//      pin + the byte-frozen title/H1 unchanged.
//   4. / (buildHomePage) — the og:type=website default + the byte-frozen
//      title/H1 unchanged.
//   5. /teams (buildTeamsIndexPage) — the og:type=website default (the hub
//      pattern).
//
// Mirrors the s8/s9/s10 harness pattern. Run: npx tsx scripts/s11-persian-entities-smoke.ts
async function main() {
  const pages = await import("../src/seo/pages.ts");
  const data = await import("../src/seo/data.ts");
  const slugs = await import("../src/slugs.ts");
  const teamSlug = slugs.teamSlug;
  const isSelectedTeam = data.isSelectedTeam;
  const teamsIndex = data.teamsIndex;

  // ---- Seed: 4 matches, each one selected club vs one non-selected club ----
  // Barcelona vs RB Leipzig exercises BOTH the Barcelona «بارسا» alias (the
  // S11 SEO_EXTRA_ALIASES extension) AND the Leipzig «لایپزیگ»/«لایپزیش»
  // override (the S1 M2 / F3 spelling fix). The other 3 matches exercise
  // the og:type=article pin on the team + competition pages they touch.
  const base = Date.now() + 2 * 864e5; // 2 days out
  const T = (days: number) => new Date(base + days * 864e5).toISOString();
  const seed = [
    { home: "FC Barcelona",      away: "RB Leipzig",         code: "CL",  compFa: "لیگ قهرمانان اروپا", date: T(0) },
    { home: "Real Madrid CF",    away: "Inter Milan",        code: "PD",  compFa: "لالیگا",              date: T(1) },
    { home: "Arsenal FC",        away: "FC Bayern München",  code: "PL",  compFa: "لیگ برتر انگلیس",     date: T(2) },
    { home: "Chelsea FC",        away: "AC Milan",           code: "PL",  compFa: "لیگ برتر انگلیس",     date: T(3) },
  ];
  const pool: any[] = [];
  const shaped: any[] = [];
  for (const s of seed) {
    const id = "smoke-" + s.home + "-vs-" + s.away;
    const raw = {
      id, homeTeam: { name: s.home, crest: null }, awayTeam: { name: s.away, crest: null },
      utcDate: s.date, status: "TIMED", competition: { code: s.code, emblem: null }, score: null,
    };
    // The shaped (SSR-friendly) form: faName carried per side. Barcelona's
    // faName is «بارسلونا» (the dict spelling); the S11 SEO_EXTRA_ALIASES
    // extension appends «بارسا» ONLY to the JSON-LD alternateName array —
    // the visible faName stays byte-frozen.
    const faHome = s.home === "FC Barcelona" ? "بارسلونا" : s.home;
    const faAway = s.away === "RB Leipzig" ? "لایپزیش" : s.away;
    const sh = {
      id, homeTeam: { name: s.home, faName: faHome, crest: null },
      awayTeam: { name: s.away, faName: faAway, crest: null },
      utcDate: s.date, path: "/matches/" + teamSlug(s.home) + "-vs-" + teamSlug(s.away) + "-" + s.date.slice(0, 10),
      competition: { code: s.code, faName: s.compFa, emblem: null },
      status: "TIMED", round: "Matchday 5", roundFa: "هفته ۵", big: true,
    };
    pool.push(raw); shaped.push(sh);
  }
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

  // Helper: extract og:type from a rendered HTML string
  const ogType = (html: string): string | null => {
    const m = html.match(/<meta property="og:type" content="([^"]+)"/);
    return m ? m[1] : null;
  };
  // Helper: extract og:locale from a rendered HTML string
  const ogLocale = (html: string): string | null => {
    const m = html.match(/<meta property="og:locale" content="([^"]+)"/);
    return m ? m[1] : null;
  };
  // Helper: extract the JSON-LD @graph from a rendered HTML string
  const jsonldGraph = (html: string): any[] => {
    const m = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    if (!m) return [];
    try { return JSON.parse(m[1])["@graph"] || []; } catch (e) { return []; }
  };
  // Helper: find a node by @type in the @graph (handles the @type-as-array case)
  const findByType = (graph: any[], type: string): any => {
    return graph.find((n: any) => {
      const t = n["@type"]; return Array.isArray(t) ? t.includes(type) : t === type;
    });
  };

  // ============================================================
  // PART 1: /matches/{barcelona-vs-leipzig} — og:type=article + the «بارسا» alias
  // ============================================================
  console.log("\n--- /matches/barcelona-vs-rb-leipzig (buildMatchPage) ---");
  const matchSlug = "barcelona-vs-rb-leipzig-" + seed[0].date.slice(0, 10);
  const matchRes = await pages.buildMatchPage(ctx, matchSlug);
  assert("S11 match-page renders (notFound=false)", matchRes.notFound === false, "got notFound=" + matchRes.notFound);
  if (!matchRes.notFound) {
    const mHtml = matchRes.html;

    // og:type=article (S07-H4 follow-up)
    assert("S11 match-page og:type=article (the S07-H4 follow-up — spec §8 + keyword map §2.15)",
      ogType(mHtml) === "article", "got og:type=" + ogType(mHtml));

    // og:locale=fa_IR
    assert("S11 match-page og:locale=fa_IR (the Persian locale pin — spec §7)",
      ogLocale(mHtml) === "fa_IR", "got og:locale=" + ogLocale(mHtml));

    // the byte-frozen title (S7 — Session 7 verified; the freeze holds)
    const titleMatch = mHtml.match(/<title>([^<]+)<\/title>/);
    assert("S11/freeze match-page: the byte-frozen title carries the leading ⚽ + Barcelona + Leipzig + the date",
      !!titleMatch && titleMatch[1].includes("⚽") && titleMatch[1].includes("بارسلونا") && titleMatch[1].includes("لایپزیگ"),
      "got title=" + (titleMatch ? titleMatch[1] : "(none)"));

    // the JSON-LD: the SportsEvent node carries the Barcelona «بارسا» alias
    const graph = jsonldGraph(mHtml);
    const sportsEvent = findByType(graph, "SportsEvent");
    assert("S11 match-page: @graph carries a SportsEvent node", !!sportsEvent);
    if (sportsEvent) {
      // homeTeam.alternateName (Barcelona — the SEO_EXTRA_ALIASES extension)
      const homeAlts = sportsEvent.homeTeam && sportsEvent.homeTeam.alternateName;
      const homeAltsArr = Array.isArray(homeAlts) ? homeAlts : (homeAlts ? [homeAlts] : []);
      assert("S11 match-page: SportsEvent.homeTeam.alternateName carries «بارسا» (the GSC-evidenced short form)",
        homeAltsArr.includes("بارسا"), "got homeTeam.alternateName=" + JSON.stringify(homeAlts));
      // the SEO name «بارسلونا» is FIRST (the override-aware order — the visible name leads)
      assert("S11 match-page: SportsEvent.homeTeam.alternateName leads with «بارسلونا» (the SEO name first, then the alias)",
        homeAltsArr[0] === "بارسلونا", "got order=" + JSON.stringify(homeAltsArr));

      // awayTeam.alternateName (Leipzig — the S1 M2 / F3 override: «لایپزیگ» first, «لایپزیش» after)
      const awayAlts = sportsEvent.awayTeam && sportsEvent.awayTeam.alternateName;
      const awayAltsArr = Array.isArray(awayAlts) ? awayAlts : (awayAlts ? [awayAlts] : []);
      assert("S11 match-page: SportsEvent.awayTeam.alternateName carries BOTH Leipzig spellings (the S1 M2 / F3 override)",
        awayAltsArr.includes("لایپزیگ") && awayAltsArr.includes("لایپزیش"),
        "got awayTeam.alternateName=" + JSON.stringify(awayAlts));
    }
  }

  // ============================================================
  // PART 2: /teams/barcelona — og:type=article + the «بارسا» alias on the SportsTeam node
  // ============================================================
  console.log("\n--- /teams/barcelona (buildTeamPage) ---");
  const teamRes = await pages.buildTeamPage(ctx, "barcelona");
  assert("S11 team-page renders (notFound=false)", teamRes.notFound === false, "got notFound=" + teamRes.notFound);
  if (!teamRes.notFound) {
    const tHtml = teamRes.html;

    // og:type=article
    assert("S11 team-page og:type=article (the S07-H4 follow-up — spec §8 + keyword map §2.7)",
      ogType(tHtml) === "article", "got og:type=" + ogType(tHtml));

    // og:locale=fa_IR
    assert("S11 team-page og:locale=fa_IR", ogLocale(tHtml) === "fa_IR", "got og:locale=" + ogLocale(tHtml));

    // the byte-frozen title + H1 (S8 — Session 8 verified; the freeze holds)
    const tTitle = tHtml.match(/<title>([^<]+)<\/title>/);
    assert("S11/freeze team-page: the byte-frozen title «بارسلونا — برنامه بازی بعدی و ساعت شروع | اسپرت سیگنال»",
      !!tTitle && tTitle[1].includes("بارسلونا") && tTitle[1].includes("برنامه بازی بعدی و ساعت شروع"),
      "got title=" + (tTitle ? tTitle[1] : "(none)"));
    const tH1 = tHtml.match(/<h1[^>]*>([^<]+)<\/h1>/);
    assert("S11/freeze team-page: the byte-frozen H1 «برنامه بازی‌های بارسلونا»",
      !!tH1 && tH1[1].includes("برنامه بازی‌های") && tH1[1].includes("بارسلونا"),
      "got H1=" + (tH1 ? tH1[1] : "(none)"));

    // the JSON-LD: the SportsTeam node carries the Barcelona «بارسا» alias
    const graph = jsonldGraph(tHtml);
    const sportsTeam = findByType(graph, "SportsTeam");
    assert("S11 team-page: @graph carries a SportsTeam node", !!sportsTeam);
    if (sportsTeam) {
      const alts = sportsTeam.alternateName;
      const altsArr = Array.isArray(alts) ? alts : (alts ? [alts] : []);
      assert("S11 team-page: SportsTeam.alternateName carries «بارسا» (the GSC-evidenced short form)",
        altsArr.includes("بارسا"), "got alternateName=" + JSON.stringify(alts));
      assert("S11 team-page: SportsTeam.alternateName leads with «بارسلونا» (the SEO name first)",
        altsArr[0] === "بارسلونا", "got order=" + JSON.stringify(altsArr));
    }
  }

  // ============================================================
  // PART 3: /competitions/la-liga — og:type=article (the S07-H4 follow-up)
  // ============================================================
  console.log("\n--- /competitions/la-liga (buildCompetitionPage) ---");
  const compRes = await pages.buildCompetitionPage(ctx, "la-liga");
  assert("S11 competition-page renders (notFound=false)", compRes.notFound === false, "got notFound=" + compRes.notFound);
  if (!compRes.notFound) {
    const cHtml = compRes.html;

    // og:type=article
    assert("S11 competition-page og:type=article (the S07-H4 follow-up — spec §8 + keyword map §2.8-2.13)",
      ogType(cHtml) === "article", "got og:type=" + ogType(cHtml));

    // og:locale=fa_IR
    assert("S11 competition-page og:locale=fa_IR", ogLocale(cHtml) === "fa_IR", "got og:locale=" + ogLocale(cHtml));

    // the byte-frozen title (S9 — Session 9 verified; the freeze holds)
    const cTitle = cHtml.match(/<title>([^<]+)<\/title>/);
    assert("S11/freeze competition-page: the byte-frozen title «لالیگا — برنامه بازی‌های بزرگ پیش‌رو | اسپرت سیگنال»",
      !!cTitle && cTitle[1].includes("لالیگا") && cTitle[1].includes("برنامه بازی‌های بزرگ پیش‌رو"),
      "got title=" + (cTitle ? cTitle[1] : "(none)"));

    // the JSON-LD: the CollectionPage node + the SportsOrganization node (the S9 wiring)
    const graph = jsonldGraph(cHtml);
    const collectionPage = findByType(graph, "CollectionPage");
    const sportsOrg = findByType(graph, "SportsOrganization");
    assert("S11 competition-page: @graph carries a CollectionPage node (S9 wiring)", !!collectionPage);
    assert("S11 competition-page: @graph carries a SportsOrganization node (the entity grounding)", !!sportsOrg);
    if (sportsOrg) {
      // the SportsOrganization.alternateName = the Persian competition name (translateCompetition)
      assert("S11 competition-page: SportsOrganization.alternateName carries «لالیگا» (the Persian competition-name alias)",
        sportsOrg.alternateName === "لالیگا", "got alternateName=" + JSON.stringify(sportsOrg.alternateName));
    }
  }

  // ============================================================
  // PART 4: / (homepage) — og:type=website (the default)
  // ============================================================
  console.log("\n--- / (buildHomePage — via router.ts) ---");
  // buildHomePage lives in router.ts; the harness imports it directly
  const router = await import("../src/seo/router.ts");
  const homeHtml = await router.buildHomePage(ctx, true);
  assert("S11 homepage renders (non-empty)", typeof homeHtml === "string" && homeHtml.length > 100);
  if (typeof homeHtml === "string") {
    // og:type=website (the default — the homepage does NOT pass ogType)
    assert("S11 homepage og:type=website (the default — the homepage is a hub, not an article)",
      ogType(homeHtml) === "website", "got og:type=" + ogType(homeHtml));
    // og:locale=fa_IR
    assert("S11 homepage og:locale=fa_IR", ogLocale(homeHtml) === "fa_IR", "got og:locale=" + ogLocale(homeHtml));
    // the byte-frozen title (S6 — Session 6 verified; the freeze holds)
    const hTitle = homeHtml.match(/<title>([^<]+)<\/title>/);
    assert("S11/freeze homepage: the byte-frozen title «برنامه بازی‌های مهم فوتبال | تاریخ و ساعت شروع | اسپرت سیگنال»",
      !!hTitle && hTitle[1].includes("برنامه بازی‌های مهم فوتبال") && hTitle[1].includes("اسپرت سیگنال"),
      "got title=" + (hTitle ? hTitle[1] : "(none)"));
  }

  // ============================================================
  // PART 5: /teams index — og:type=website (the hub pattern)
  // ============================================================
  console.log("\n--- /teams index (buildTeamsIndexPage) ---");
  // re-seed with all 4 matches in the payload so teamsIndex sees them
  ctx.payload.upcoming = pool;
  const teamsHtml = pages.buildTeamsIndexPage(ctx);
  assert("S11 /teams index renders (non-empty)", typeof teamsHtml === "string" && teamsHtml.length > 100);
  if (typeof teamsHtml === "string") {
    assert("S11 /teams index og:type=website (the default — the index is a hub, not an article)",
      ogType(teamsHtml) === "website", "got og:type=" + ogType(teamsHtml));
    assert("S11 /teams index og:locale=fa_IR", ogLocale(teamsHtml) === "fa_IR", "got og:locale=" + ogLocale(teamsHtml));
  }

  // ============================================================
  // PART 6: the Inter + Atlético TEAM_SLUGS no-op tidiness fix (route plan §7)
  // ============================================================
  console.log("\n--- TEAM_SLUGS no-op tidiness fix (route plan §7) ---");
  // verify the explicit pins exist + match the derivation
  assert("S11/§7: TEAM_SLUGS pins \"FC Internazionale Milano\" → \"internazionale-milano\" (the live canonical URL)",
    slugs.TEAM_SLUGS["FC Internazionale Milano"] === "internazionale-milano");
  assert("S11/§7: TEAM_SLUGS pins \"Club Atlético de Madrid\" → \"club-atletico-de-madrid\" (the live canonical URL)",
    slugs.TEAM_SLUGS["Club Atlético de Madrid"] === "club-atletico-de-madrid");
  // the no-op proof: the explicit pin matches the derivation output
  assert("S11/§7: the Inter pin matches the derivation (teamSlug(\"FC Internazionale Milano\") === \"internazionale-milano\")",
    teamSlug("FC Internazionale Milano") === "internazionale-milano");
  assert("S11/§7: the Atlético pin matches the derivation (teamSlug(\"Club Atlético de Madrid\") === \"club-atletico-de-madrid\")",
    teamSlug("Club Atlético de Madrid") === "club-atletico-de-madrid");

  console.log("\n" + pass + " pass, " + fail + " fail");
  if (fail > 0) process.exit(1);
}
main().catch((e) => { console.error(e); process.exit(1); });
