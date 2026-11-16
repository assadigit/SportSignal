// scripts/s9-competition-smoke.ts
// SEO Program Session 9 — the competition-page render harness.
//
// A seeded SeoCtx with one upcoming PL fixture (Arsenal vs Liverpool, both
// selected clubs) renders /competitions/premier-league and asserts the S9
// structural change (the @graph CollectionPage node) + the byte-frozen
// surfaces + the crawlable links + the indexable rule. Mirrors the Session 8
// s8-team-smoke pattern. Run: npx tsx scripts/s9-competition-smoke.ts
async function main() {
  // Build the pages module path + import dynamically (tsx handles the TS).
  const pages = await import("../src/seo/pages.ts");
  const JL = await import("../src/seo/jsonld.ts");
  const { compSlug } = await import("../src/slugs.ts");

  const code = "PL";
  const slug = compSlug(code); // "premier-league"
  const future = new Date(Date.now() + 3 * 864e5).toISOString(); // 3 days out
  const rawMatch = {
    id: "smoke-pl-1",
    homeTeam: { name: "Arsenal", crest: null },
    awayTeam: { name: "Liverpool", crest: null },
    utcDate: future,
    status: "TIMED",
    competition: { code: "PL", emblem: null },
    score: null,
  };
  // Minimal shaped row — the fields buildCompetitionPage + dateGroupedRows +
  // mrowHtml read. s.big = true so compsIndex's isBigForSeo||s.big filter
  // passes (the competition appears in the index → the detail page renders).
  const shapedMatch = {
    id: rawMatch.id,
    homeTeam: { name: "Arsenal", faName: "آرسنال", crest: null },
    awayTeam: { name: "Liverpool", faName: "لیورپول", crest: null },
    utcDate: rawMatch.utcDate,
    path: "/matches/arsenal-vs-liverpool-" + rawMatch.utcDate.slice(0, 10),
    competition: { code: "PL", faName: "لیگ برتر انگلیس", emblem: null },
    status: "TIMED",
    round: "Matchday 13",
    roundFa: "هفته ۱۳",
    big: true,
  };
  const ctx: any = {
    env: { STATE: { get: async () => null } }, // mock — fail-closed (no KV)
    payload: {
      upcoming: [], finished: [], nextBig: null, topSpot: null,
      thisWeek: [], nextWeek: [], cups: [], ucl: null,
      standings: {
        PL: {
          emblem: null,
          teams: [
            { pos: 1, name: "Arsenal", faName: "آرسنال", played: 12, won: 9, draw: 2, lost: 1, points: 29 },
            { pos: 2, name: "Liverpool", faName: "لیورپول", played: 12, won: 8, draw: 3, lost: 1, points: 27 },
          ],
        },
      },
      fetchedAt: null,
      degraded: false,
    },
    pool: [rawMatch],
    shaped: [shapedMatch],
    fetchedAt: "2026-11-17T00:00:00.000Z",
    degraded: false,
  };

  const res = await pages.buildCompetitionPage(ctx, slug);
  let pass = 0, fail = 0;
  const assert = (name: string, cond: boolean, detail?: string) => {
    if (cond) { pass++; console.log("PASS " + name); }
    else { fail++; console.error("FAIL " + name + (detail ? " — " + detail : "")); }
  };

  const html = res.html;
  assert("renders 200 (notFound=false)", res.notFound === false);
  assert("code = PL", res.code === code);

  // 1. the @graph CollectionPage node (S9)
  const jsonldMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  assert("JSON-LD script present", !!jsonldMatch);
  let graph: any[] = [];
  if (jsonldMatch) {
    try {
      const parsed = JSON.parse(jsonldMatch[1]);
      graph = parsed["@graph"] || [];
    } catch (e) { /* fall through */ }
  }
  const cpNode = graph.find((n: any) => Array.isArray(n["@type"]) ? n["@type"].includes("CollectionPage") : n["@type"] === "CollectionPage");
  assert("S9: @graph carries a CollectionPage node", !!cpNode);
  if (cpNode) {
    assert("S9: CollectionPage @id = /competitions/premier-league#webpage", cpNode["@id"] === "https://sportsignal.ir/competitions/premier-league#webpage", "got " + cpNode["@id"]);
    assert("S9: CollectionPage url = https://sportsignal.ir/competitions/premier-league", cpNode.url === "https://sportsignal.ir/competitions/premier-league");
    assert("S9: CollectionPage name carries «برنامه بازی‌های»", typeof cpNode.name === "string" && cpNode.name.includes("برنامه بازی‌های"), "got " + cpNode.name);
    assert("S9: CollectionPage inLanguage = fa-IR", cpNode.inLanguage === "fa-IR");
    assert("S9: CollectionPage dateModified set", !!cpNode.dateModified);
    assert("S9: CollectionPage isPartOf → #website", cpNode.isPartOf && cpNode.isPartOf["@id"] === "https://sportsignal.ir/#website");
  }

  // 2. NO SportsEvent in the @graph
  const hasSportsEvent = graph.some((n: any) => {
    const t = n["@type"];
    return Array.isArray(t) ? t.includes("SportsEvent") : t === "SportsEvent";
  });
  assert("S9: @graph emits NO SportsEvent node", !hasSportsEvent);

  // 3. the @graph node order: Organization, WebSite, CollectionPage, SportsOrganization, [ItemList], BreadcrumbList
  const types = graph.map((n: any) => {
    const t = n["@type"];
    return Array.isArray(t) ? t[0] : t;
  });
  const cpIdx = types.indexOf("CollectionPage");
  const soIdx = types.indexOf("SportsOrganization");
  const orgIdx = types.indexOf("Organization");
  const wsIdx = types.indexOf("WebSite");
  const bcIdx = types.indexOf("BreadcrumbList");
  const ilIdx = types.indexOf("ItemList");
  assert("S9: @graph order — Organization before WebSite", orgIdx >= 0 && wsIdx >= 0 && orgIdx < wsIdx);
  assert("S9: @graph order — WebSite before CollectionPage", wsIdx >= 0 && cpIdx >= 0 && wsIdx < cpIdx);
  assert("S9: @graph order — CollectionPage before SportsOrganization", cpIdx >= 0 && soIdx >= 0 && cpIdx < soIdx);
  assert("S9: @graph order — SportsOrganization before ItemList (when present)", ilIdx < 0 || (soIdx >= 0 && soIdx < ilIdx));
  assert("S9: @graph order — ItemList before BreadcrumbList (when present)", ilIdx < 0 || (ilIdx >= 0 && bcIdx >= 0 && ilIdx < bcIdx));
  assert("S9: @graph order — BreadcrumbList last", bcIdx === types.length - 1 || (ilIdx < 0 && bcIdx === types.length - 1));

  // 4. the byte-frozen title (keyword map §2.8-2.13)
  const titleMatch = html.match(/<title>([^<]*)<\/title>/);
  assert("freeze: byte-frozen title «{لیگ} — برنامه بازی‌های بزرگ پیش‌رو | اسپرت سیگنال»", !!titleMatch && titleMatch[1].includes("برنامه بازی‌های بزرگ پیش‌رو") && titleMatch[1].endsWith("| اسپرت سیگنال"), "got " + (titleMatch ? titleMatch[1] : "(no title)"));

  // 5. the byte-frozen H1 (keyword map §2.8-2.13)
  const h1Match = html.match(/<h1[^>]*>([^<]*)<\/h1>/);
  assert("freeze: byte-frozen H1 «برنامه بازی‌های X»", !!h1Match && h1Match[1].startsWith("برنامه بازی‌های "), "got " + (h1Match ? h1Match[1] : "(no h1)"));

  // 6. the answer sentence leads with «نزدیک‌ترین بازی بزرگ {لیگ}» (next match present)
  const answerMatch = html.match(/<div class="answercard">([\s\S]*?)<\/div>/);
  assert("S9: answer leads with «نزدیک‌ترین بازی بزرگ» (next match present)", !!answerMatch && answerMatch[1].includes("نزدیک‌ترین بازی بزرگ"), "got " + (answerMatch ? answerMatch[1].slice(0, 80) : "(no answercard)"));

  // 7. the indexable rule — indexable (≥1 upcoming) → robots index, follow
  // (the full directive carries the max-snippet/max-image-preview/max-video
  // modifiers; the indexable signal is the leading "index, follow".)
  const robotsMatch = html.match(/<meta name="robots" content="([^"]*)"/);
  assert("S9: robots leads with index, follow (indexable, ≥1 upcoming)", !!robotsMatch && robotsMatch[1].startsWith("index, follow"), "got " + (robotsMatch ? robotsMatch[1] : "(no robots)"));

  // 8. the self-canonical
  const canonMatch = html.match(/<link rel="canonical" href="([^"]*)"/);
  assert("S9: self-canonical = https://sportsignal.ir/competitions/premier-league", !!canonMatch && canonMatch[1] === "https://sportsignal.ir/competitions/premier-league", "got " + (canonMatch ? canonMatch[1] : "(no canonical)"));

  // 9. a crawlable <a href="/matches/..."> match row (spec §9 internal links)
  const matchHrefMatch = html.match(/<a[^>]*href="(\/matches\/arsenal-vs-liverpool-[^"]*)"/);
  assert("S9: crawlable <a href=\"/matches/...\"> match row present (spec §9)", !!matchHrefMatch, matchHrefMatch ? matchHrefMatch[1] : "(no match href)");

  // 10. the upcoming-matches block heading «بازی‌های پیش‌رو»
  assert("S9: upcoming-matches block heading «بازی‌های پیش‌رو»", html.includes("<h2>بازی‌های پیش‌رو</h2>"));

  // 11. the SportsOrganization node (the competition entity)
  const soNode = graph.find((n: any) => {
    const t = n["@type"];
    return Array.isArray(t) ? t.includes("SportsOrganization") : t === "SportsOrganization";
  });
  assert("S9: @graph carries a SportsOrganization node (the competition entity)", !!soNode);
  if (soNode) {
    assert("S9: SportsOrganization name = Champions League... no, Premier League", soNode.name === "Premier League", "got " + soNode.name);
    assert("S9: SportsOrganization url = https://sportsignal.ir/competitions/premier-league", soNode.url === "https://sportsignal.ir/competitions/premier-league");
  }

  // 12. the ItemList node (when indexable — the upcoming matches)
  const ilNode = graph.find((n: any) => {
    const t = n["@type"];
    return Array.isArray(t) ? t.includes("ItemList") : t === "ItemList";
  });
  assert("S9: @graph carries an ItemList node (the upcoming matches, indexable)", !!ilNode);
  if (ilNode) {
    assert("S9: ItemList numberOfItems = 1", ilNode.numberOfItems === 1, "got " + ilNode.numberOfItems);
  }

  // 13. the BreadcrumbList node
  const bcNode = graph.find((n: any) => {
    const t = n["@type"];
    return Array.isArray(t) ? t.includes("BreadcrumbList") : t === "BreadcrumbList";
  });
  assert("S9: @graph carries a BreadcrumbList node", !!bcNode);

  console.log("\n" + pass + " pass, " + fail + " fail");
  if (fail > 0) process.exit(1);
}
main().catch((e) => { console.error(e); process.exit(1); });
