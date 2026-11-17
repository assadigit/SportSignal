// scripts/s10-internallinks-smoke.ts
// SEO Program Session 10 — the internal-linking render harness.
//
// A seeded SeoCtx with 4 upcoming matches (each one selected club vs one
// non-selected club, ascending dates) renders:
//   1. /teams index (buildTeamsIndexPage) — the S10 selected-clubs-first sort
//      + the visible==machine contract (tile grid ↔ linkItemList JSON-LD) +
//      crawlable <a href> tiles.
//   2. /matches/this-week hub (buildThisWeekPage) — the cross-hub nav
//      (hubTiles) + crawlable <a href> match rows + the breadcrumb.
//   3. /matches/{arsenal-vs-juventus} (buildMatchPage) — the Session 7
//      footer-hook team-link gating (Arsenal selected → <a href>; Juventus
//      non-selected → plain text) + the breadcrumb + crawlable date links.
//
// Mirrors the s8/s9 harness pattern. Run: npx tsx scripts/s10-internallinks-smoke.ts
async function main() {
  const pages = await import("../src/seo/pages.ts");
  const data = await import("../src/seo/data.ts");
  const slugs = await import("../src/slugs.ts");
  const teamSlug = slugs.teamSlug;
  const isSelectedTeam = data.isSelectedTeam;
  const teamsIndex = data.teamsIndex;

  // ---- Seed: 4 matches, each one selected club vs one non-selected club ----
  // Dates ascend so the chronological tiebreaker is unambiguous within each
  // group. The selected clubs: Arsenal FC, FC Barcelona, Chelsea FC,
  // FC Bayern München. The non-selected: Juventus, AS Roma, Lazio, Torino FC.
  const base = Date.now() + 2 * 864e5; // 2 days out (within the this-week window)
  const T = (days: number) => new Date(base + days * 864e5).toISOString();
  const seed = [
    { home: "Arsenal FC",       away: "Juventus",   code: "PL",  compFa: "لیگ برتر انگلیس", date: T(0) },
    { home: "FC Barcelona",    away: "AS Roma",    code: "PD",  compFa: "لالیگا",          date: T(1) },
    { home: "Chelsea FC",      away: "Lazio",      code: "PL",  compFa: "لیگ برتر انگلیس", date: T(2) },
    { home: "FC Bayern München", away: "Torino FC", code: "BL1", compFa: "بوندسلیگا",       date: T(3) },
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
      id, homeTeam: { name: s.home, faName: s.home, crest: null },
      awayTeam: { name: s.away, faName: s.away, crest: null },
      utcDate: s.date, path: "/matches/" + teamSlug(s.home) + "-vs-" + teamSlug(s.away) + "-" + s.date.slice(0, 10),
      competition: { code: s.code, faName: s.compFa, emblem: null },
      status: "TIMED", round: "Matchday 12", roundFa: "هفته ۱۲", big: true,
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

  // ============================================================
  // PART 1: /teams index — the S10 selected-clubs-first sort
  // ============================================================
  console.log("\n--- /teams index (buildTeamsIndexPage) ---");
  // teamsIndex returns the RAW chronological order (the Session 4 C1 law:
  // teamsIndex generates BOTH sides unfiltered). The S10 selected-first sort
  // rides in buildTeamsIndexPage (the presentation layer) — so the order is
  // verified via the RENDERED tile hrefs, not the teamsIndex return.
  const rawEntries = teamsIndex(ctx);
  assert("teamsIndex returns 8 entries (4 selected + 4 non-selected, raw chronological)",
    rawEntries.length === 8, "got " + rawEntries.length);

  // render the page — the sort happens inside buildTeamsIndexPage
  const teamsHtml = pages.buildTeamsIndexPage(ctx);
  assert("/teams index renders (non-empty)", typeof teamsHtml === "string" && teamsHtml.length > 100);

  // every tile is a crawlable <a href="/teams/..."> — parse in document order
  const tileHrefs = (teamsHtml.match(/<a class="hubtile" href="(\/teams\/[^"]+)"/g) || [])
    .map((m: string) => m.replace(/<a class="hubtile" href="|"/g, ""));
  assert("/teams index: 8 crawlable <a href=\"/teams/...\"> tiles", tileHrefs.length === 8, "got " + tileHrefs.length);
  assert("/teams index: no href=\"#\" placeholders in the tile grid", !teamsHtml.includes('href="#"'));

  // the selected clubs must come FIRST (the S10 sort) — in chronological order
  // within the group: arsenal (T0), barcelona (T1), chelsea (T2), bayern-munich (T3)
  const tileSlugs = tileHrefs.map((h: string) => h.replace("/teams/", ""));
  const selectedSlugs = tileSlugs.slice(0, 4);
  const nonSelectedSlugs = tileSlugs.slice(4);
  assert("S10: the first 4 tiles are the selected clubs (arsenal, barcelona, chelsea, bayern-munich)",
    selectedSlugs.join(",") === "arsenal,barcelona,chelsea,bayern-munich",
    "got " + selectedSlugs.join(","));
  assert("S10: the last 4 tiles are the non-selected clubs (juventus, roma, lazio, torino)",
    nonSelectedSlugs.join(",") === "juventus,roma,lazio,torino",
    "got " + nonSelectedSlugs.join(","));

  // every selected tile is a selected club (isSelectedTeam) + every non-selected isn't
  const selectedFlags = rawEntries.map((e: any) => isSelectedTeam(e.name) ? 1 : 0);
  const selectedCount = selectedFlags.reduce((a: number, b: number) => a + b, 0);
  assert("S10: the seed has exactly 4 selected + 4 non-selected clubs", selectedCount === 4, "got " + selectedCount);

  // the linkItemList JSON-LD mirrors the tile order (visible==machine, SS-13)
  const jsonldMatch = teamsHtml.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  assert("/teams index: JSON-LD script present", !!jsonldMatch);
  let teamGraph: any[] = [];
  if (jsonldMatch) {
    try { teamGraph = JSON.parse(jsonldMatch[1])["@graph"] || []; } catch (e) { /* fall through */ }
  }
  const itemList = teamGraph.find((n: any) => {
    const t = n["@type"]; return Array.isArray(t) ? t.includes("ItemList") : t === "ItemList";
  });
  assert("/teams index: @graph carries an ItemList (the linkItemList)", !!itemList);
  if (itemList) {
    assert("/teams index: ItemList numberOfItems = 8", itemList.numberOfItems === 8, "got " + itemList.numberOfItems);
    const listUrls = (itemList.itemListElement || []).map((li: any) => li.url);
    const listSlugs = listUrls.map((u: string) => u.replace("https://sportsignal.ir/teams/", ""));
    assert("/teams index: ItemList url order == tile href order (visible==machine, SS-13)",
      listSlugs.join(",") === tileSlugs.join(","),
      "list=" + listSlugs.join(",") + " tiles=" + tileSlugs.join(","));
    assert("/teams index: ItemList leads with the selected clubs (arsenal, barcelona, chelsea, bayern-munich)",
      listSlugs.slice(0, 4).join(",") === "arsenal,barcelona,chelsea,bayern-munich",
      "got " + listSlugs.slice(0, 4).join(","));
  }

  // the breadcrumb
  assert("/teams index: visible breadcrumb «خانه / تیم‌ها» present",
    /class="crumbs"/.test(teamsHtml) && teamsHtml.includes("خانه") && teamsHtml.includes("تیم‌ها"));
  const teamBcNode = teamGraph.find((n: any) => {
    const t = n["@type"]; return Array.isArray(t) ? t.includes("BreadcrumbList") : t === "BreadcrumbList";
  });
  assert("/teams index: @graph carries a BreadcrumbList node", !!teamBcNode);

  // ============================================================
  // PART 2: /matches/this-week hub — cross-hub nav + crawlable match rows
  // ============================================================
  console.log("\n--- /matches/this-week hub (buildThisWeekPage) ---");
  const hubHtml = pages.buildThisWeekPage(ctx);
  assert("/matches/this-week hub renders (non-empty)", typeof hubHtml === "string" && hubHtml.length > 100);

  // crawlable <a href="/matches/..."> match rows (the 4 seeded fixtures).
  // The href pattern is /matches/{slug}-vs-{slug}-{date}; team slugs can carry
  // hyphens (e.g. bayern-munich), so the match-row filter uses -vs- + the date.
  const hubMatchHrefs = (hubHtml.match(/<a[^>]*href="(\/matches\/[^"]+)"/g) || [])
    .map((m: string) => m.replace(/<a[^>]*href="|"/g, ""))
    .filter((u: string) => /\/matches\/[a-z0-9-]+-vs-[a-z0-9-]+-\d{4}-\d{2}-\d{2}/.test(u));
  assert("/matches/this-week: ≥4 crawlable <a href=\"/matches/...\"> match rows", hubMatchHrefs.length >= 4, "got " + hubMatchHrefs.length + " — " + hubMatchHrefs.join(", "));

  // the hubTiles() cross-hub nav (all 4 sibling hubs)
  assert("/matches/this-week: hubTiles links to /matches/today", hubHtml.includes('href="/matches/today"'));
  assert("/matches/this-week: hubTiles links to /matches/tomorrow", hubHtml.includes('href="/matches/tomorrow"'));
  assert("/matches/this-week: hubTiles links to /matches/this-week", hubHtml.includes('href="/matches/this-week"'));
  assert("/matches/this-week: hubTiles links to /matches/this-weekend", hubHtml.includes('href="/matches/this-weekend"'));

  // the breadcrumb (home → بازی‌ها → این هفته)
  assert("/matches/this-week: breadcrumb «خانه / بازی‌ها / این هفته» present",
    /class="crumbs"/.test(hubHtml) && hubHtml.includes("بازی‌ها"));

  // ============================================================
  // PART 3: match page — the Session 7 footer-hook team-link gating
  // ============================================================
  console.log("\n--- /matches/arsenal-vs-juventus (buildMatchPage) ---");
  const matchSlug = "arsenal-vs-juventus-" + seed[0].date.slice(0, 10);
  const matchRes = await pages.buildMatchPage(ctx, matchSlug);
  assert("/matches/arsenal-vs-juventus renders (notFound=false)", matchRes.notFound === false, "got notFound=" + matchRes.notFound);
  if (!matchRes.notFound) {
    const mHtml = matchRes.html;
    // the footer-hook «تیم‌ها» line: Arsenal (selected) → <a href="/teams/arsenal">; Juventus (non-selected) → plain text
    assert("S7: footer-hook links Arsenal (selected) as <a href=\"/teams/arsenal\">",
      mHtml.includes('href="/teams/arsenal"'), "no /teams/arsenal anchor in the match page");
    assert("S7: footer-hook does NOT link Juventus (non-selected) — plain text only",
      !mHtml.includes('href="/teams/juventus"'), "a non-selected team got a crawlable <a href> (the S7 gating regressed)");

    // the competition link ( crawlable <a href="/competitions/...">)
    assert("S7: footer-hook competition link <a href=\"/competitions/premier-league\"> present",
      mHtml.includes('href="/competitions/premier-league"'));

    // the date links (crawlable <a href>)
    assert("S7: footer-hook date link <a href=\"/matches/today\"> present", mHtml.includes('href="/matches/today"'));
    assert("S7: footer-hook date link <a href=\"/matches/this-week\"> present", mHtml.includes('href="/matches/this-week"'));
    assert("S7: footer-hook date link <a href=\"/matches\"> present", mHtml.includes('href="/matches"'));

    // the breadcrumb (home → بازی‌ها → arsenal – juventus)
    assert("S7: match-page breadcrumb «خانه / بازی‌ها» present",
      /class="crumbs"/.test(mHtml) && mHtml.includes("بازی‌ها"));
  }

  console.log("\n" + pass + " pass, " + fail + " fail");
  if (fail > 0) process.exit(1);
}
main().catch((e) => { console.error(e); process.exit(1); });
