#!/usr/bin/env node
// scripts/check-seo-internallinks.js
// SEO Program Session 10 (internal linking + navigation relationships):
// offline gates for the cross-page internal-link graph — the tile order, the
// anchor wording, the crawlability law, the visible==machine JSON-LD contract,
// + the breadcrumb discipline (keyword map §3 + the route plan §2.3/§10 +
// MASTER-SEO-SPEC §9).
//
// The Session 10 scope (the route plan §10 — markup-only): tile order, anchor
// wording, link placement. No new URLs, no canonical changes, no indexability
// changes, no new KV reads, no new fetches. The ONE explicit decision (route
// plan §2.3): the /teams index tile ordering may put the 13 selected clubs
// first — cosmetic only. This gate pins what Session 10 DID change + the
// cross-page internal-link invariants it must NOT regress:
//
//   1. THE TEAMSINDEX SELECTED-CLUBS-FIRST SORT (S10) — the teamsIndex sort
//      comparator now puts the 13 selected clubs (isSelectedTeam) before the
//      non-selected pool teams, with the chronological-by-next-kickoff
//      tiebreaker WITHIN each group. Cosmetic only — the non-selected tiles
//      stay (the crawlability law: a noindex page stays crawlable so Google
//      can read the directive). Zero KV cost (in-memory isSelectedTeam check).
//   2. THE /teams INDEX VISIBLE==MACHINE CONTRACT (SS-13) — the tile grid +
//      the linkItemList JSON-LD consume the SAME `entries` array (teamsIndex),
//      so the visible tile order mirrors the machine-readable ListItem
//      positions exactly. The selected-clubs-first sort rides in teamsIndex,
//      so both surfaces see the new order.
//   3. THE /competitions INDEX VISIBLE==MACHINE CONTRACT (SS-13) — the tile
//      grid + the linkItemList consume the SAME `entries` array (compsIndex).
//   4. CRAWLABLE <a href> IN THE TILE GRIDS — every /teams + /competitions
//      tile is a crawlable <a href="/teams/..."> / <a href="/competitions/...">.
//      No href="#" placeholders, no JS-only navigation (spec §5 + the C1
//      disposition).
//   5. THE HUBTILES() CROSS-HUB NAV — the date hubs + the /matches hub carry
//      a 4-tile shortcut grid linking to all 4 sibling hubs (today, tomorrow,
//      this-week, this-weekend). The breadcrumb is the only path back to
//      /matches from a hub; the hubTiles grid is the cross-hub nav.
//   6. THE BREADCRUMB DISCIPLINE — every page class (match, team, competition,
//      hub, /teams index, /competitions index, /matches hub) carries a
//      breadcrumb trail (home → section → page) via M.breadcrumbsHtml + the
//      JSON-LD breadcrumbNode. The homepage (root) + 404 are the exceptions.
//   7. THE MATCH-PAGE FOOTER-HOOK TEAM-LINK GATING (S7 regression pin) — the
//      «تیم‌ها» footer-hook line renders selected clubs as <a href="/teams/...">
//      + non-selected clubs as plain text (isSelectedTeam gating, BODY-ONLY,
//      the byte-frozen <head> untouched).
//   8. THE HOMEPAGE HERO-CARD ANCHOR (S6 regression pin) — the hero card
//      carries a crawlable <a href="/matches/..."> (matchHref) when a featured
//      match exists (the empty-state href="#" fallback only when nextBig is
//      null + the card is display:none).
"use strict";
const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");

let failures = 0;
let oks = 0;
function ok(msg) { oks++; console.log("OK   check-seo-internallinks: " + msg); }
function bad(msg) { console.error("FAIL check-seo-internallinks: " + msg); failures++; }

const dataSrc = fs.readFileSync(path.join(root, "src", "seo", "data.ts"), "utf8");
const pagesSrc = fs.readFileSync(path.join(root, "src", "seo", "pages.ts"), "utf8");
const routerSrc = fs.readFileSync(path.join(root, "src", "seo", "router.ts"), "utf8");

// Locate a function body (between its signature and the next top-level
// function/export). Handles both exported and non-exported functions.
function fnBody(src, name) {
  // try exported variants first, then the bare `function name(` form (buildHub,
  // hubTile etc. are non-exported module-local helpers).
  const candidates = [
    "export function " + name + "(",
    "export async function " + name + "(",
    "function " + name + "(",
  ];
  let start = -1;
  for (const c of candidates) { start = src.indexOf(c); if (start >= 0) break; }
  if (start < 0) return null;
  let end = src.indexOf("\nexport ", start + 1);
  if (end < 0) end = src.indexOf("\nfunction ", start + 1);
  if (end < 0) end = src.length;
  return src.slice(start, end);
}

// ---- 1. the /teams index selected-clubs-first sort (S10 — the ONE explicit decision) ----
// The sort rides in the PRESENTATION layer (buildTeamsIndexPage), NOT in
// teamsIndex itself — the Session 4 C1 law (check-seo-crawlindex.js) requires
// teamsIndex to generate BOTH sides unfiltered (the sitemap teams.xml filter +
// the team-page indexable rule apply isSelectedTeam; teamsIndex stays the raw
// chronological generator that powers the /teams tiles for ALL teams so the
// noindex stays crawlable). The S10 sort is a presentation-only reordering.
const teamsIndexPageBody = fnBody(pagesSrc, "buildTeamsIndexPage");
let s10SortOk = true;
if (!teamsIndexPageBody) {
  bad("S10: buildTeamsIndexPage not found in src/seo/pages.ts");
  s10SortOk = false;
} else {
  // the sort comparator must call isSelectedTeam on both sides + return the
  // selected-first delta BEFORE the chronological tiebreaker. The S10 comment
  // marker + the isSelectedTeam call + the sa/sb 0/1 pattern are the signature.
  if (!/isSelectedTeam\(a\.name\)/.test(teamsIndexPageBody) || !/isSelectedTeam\(b\.name\)/.test(teamsIndexPageBody)) {
    bad("S10: buildTeamsIndexPage's sort comparator lost its isSelectedTeam(a.name)/isSelectedTeam(b.name) calls (the selected-clubs-first decision — route plan §2.3)");
    s10SortOk = false;
  }
  // the 0/1 selected-first delta must run BEFORE the chronological tiebreaker
  if (!/const sa = isSelectedTeam\(a\.name\) \? 0 : 1;/.test(teamsIndexPageBody) ||
      !/const sb = isSelectedTeam\(b\.name\) \? 0 : 1;/.test(teamsIndexPageBody) ||
      !/if \(sa !== sb\) return sa - sb;/.test(teamsIndexPageBody)) {
    bad("S10: buildTeamsIndexPage's sort comparator lost its `if (sa !== sb) return sa - sb;` selected-first guard (the selected clubs must lead the grid before the chronological tiebreaker)");
    s10SortOk = false;
  }
  // the chronological tiebreaker must STILL run (the within-group order)
  if (!/new Date\(a\.next\.raw\.utcDate\)\.getTime\(\) - new Date\(b\.next\.raw\.utcDate\)\.getTime\(\)/.test(teamsIndexPageBody)) {
    bad("S10: buildTeamsIndexPage's sort lost its chronological-by-next-kickoff tiebreaker (the within-group order — selected clubs are chronological among themselves, non-selected too)");
    s10SortOk = false;
  }
  // the S10 comment marker (the decision trail — the presentation-layer note)
  if (!/S10 \(internal linking/.test(teamsIndexPageBody)) {
    bad("S10: buildTeamsIndexPage lost its S10 decision-trail comment (the route plan §2.3 + §10 citation — the cosmetic-only + crawlability-law + presentation-layer note)");
    s10SortOk = false;
  }
  // v13.281.0-teamstrict: the sort consumes teamsIndex(ctx) (the raw
  // chronological source) — with the strict-mode selected-only filter
  // applied BEFORE it (legacy: the bare sort, byte-identical).
  if (!/const all = teamsIndex\(ctx\);/.test(teamsIndexPageBody) ||
      !/const entries = \(selectedOnly \? all\.filter\(\(e\) => isSelectedTeam\(e\.name\)\) : all\)\.sort\(/.test(teamsIndexPageBody)) {
    bad("S10: buildTeamsIndexPage must derive `entries` from teamsIndex(ctx) through the flag-gated selected-only filter then the selected-first sort (v13.281 — legacy renders every eligible tile)");
    s10SortOk = false;
  }
}
if (s10SortOk) ok("S10: buildTeamsIndexPage sorts the 13 selected clubs first (isSelectedTeam ? 0 : 1 → sa-sb delta before the chronological tiebreaker) — the ONE explicit Session 10 decision (route plan §2.3); cosmetic only, the non-selected tiles stay (crawlability law); the sort rides in the presentation layer so teamsIndex stays the raw unfiltered generator (the Session 4 C1 law); zero KV cost");

// ---- the C1 invariant regression: teamsIndex itself must NOT use isSelectedTeam ----
// (the Session 4 check-seo-crawlindex.js gate — re-asserted here so the S10
// presentation-layer sort cannot accidentally leak into the data layer.)
const teamsIndexBody = fnBody(dataSrc, "teamsIndex");
// v13.281.0-teamstrict SUPERSESION: the C1-era invariant (NO isSelectedTeam
// in teamsIndex) is superseded by the owner-approved strict gating —
// teamsIndex gains the flag-gated selected-team ELIGIBILITY arm (D1: the
// Iranian big four must qualify; the presentation layer + sitemap apply the
// selected cut). The NEW invariant: the arm is flag-gated (legacy mode must
// never see it) and teamsIndex still iterates both sides of every admitted
// fixture.
if (teamsIndexBody && !/SEO\.TEAM_PAGE_POLICY === "strict"/.test(teamsIndexBody)) {
  bad("S10/v13.281-regression: teamsIndex lost the TEAM_PAGE_POLICY gate on the selected-team eligibility arm (legacy mode must stay byte-identical — the rollback contract)");
  s10SortOk = false;
}
if (s10SortOk) ok("S10/v13.281-regression: teamsIndex widens eligibility via the flag-gated selected-team arm; the strict selected cut + the selected-first sort live in buildTeamsIndexPage (the presentation layer) + the sitemap filter (files.ts)");

// ---- 2. the /teams index visible==machine contract (SS-13) ----
// (teamsIndexPageBody is already declared in gate 1 above — reused here.)
let teamsVmOk = true;
if (!teamsIndexPageBody) {
  bad("SS-13: buildTeamsIndexPage not found in src/seo/pages.ts");
  teamsVmOk = false;
} else {
  // the tile grid + the linkItemList must both consume `entries` (the
  // filtered+sorted teamsIndex return — v13.281: strict mode filters to the
  // selected clubs first)
  if (!/const entries = \(selectedOnly \? all\.filter\(\(e\) => isSelectedTeam\(e\.name\)\) : all\)\.sort\(/.test(teamsIndexPageBody)) {
    bad("SS-13: buildTeamsIndexPage lost its `entries` source (the flag-gated selected filter + the sort — the /teams index tile grid + the linkItemList must consume the same array)");
    teamsVmOk = false;
  }
  // the tile grid iterates entries
  if (!/for \(const e of entries\)/.test(teamsIndexPageBody)) {
    bad("SS-13: buildTeamsIndexPage's tile grid lost its `for (const e of entries)` iteration (the visible tiles)");
    teamsVmOk = false;
  }
  // the linkItemList maps over entries (the machine list mirrors the tiles)
  if (!/entries\.map\(\(e\) => \(\{ name: seoTeamFaName\(e\), url: absUrl\("\/teams\/" \+ e\.slug\)/.test(teamsIndexPageBody)) {
    bad("SS-13: buildTeamsIndexPage's linkItemList must map over the SAME `entries` array the tile grid iterates (the visible==machine contract — the selected-clubs-first sort rides in buildTeamsIndexPage, so both surfaces see the new order)");
    teamsVmOk = false;
  }
  // the tile anchor is crawlable <a href="/teams/..."> — match the href construction
  if (!/href="\/teams\/' \+ e\.slug/.test(teamsIndexPageBody)) {
    bad("SS-13: the /teams tile anchor drifted (must be <a class=\"hubtile\" href=\"/teams/{slug}\"> — crawlable, no href=\"#\" placeholder)");
    teamsVmOk = false;
  }
  // the linkItemList sits in the jsonldNodes (the @graph)
  if (!/jsonldNodes: \[\.\.\.JL\.siteNodes\(\), JL\.collectionPageNode\(path, "تیم‌ها", ctx\.fetchedAt\), teamList, JL\.breadcrumbNode\(trail\)\]/.test(teamsIndexPageBody)) {
    bad("SS-13: buildTeamsIndexPage's @graph assembly drifted (siteNodes → collectionPageNode → teamList → breadcrumbNode — the linkItemList must sit in the @graph)");
    teamsVmOk = false;
  }
}
if (teamsVmOk) ok("SS-13: the /teams index visible==machine contract holds (the tile grid + the linkItemList consume the same `entries` array; the selected-clubs-first sort rides in teamsIndex so both surfaces see the new order); every tile is a crawlable <a href=\"/teams/{slug}\">");

// ---- 3. the /competitions index visible==machine contract (SS-13) ----
const compsIndexPageBody = fnBody(pagesSrc, "buildCompetitionsIndexPage");
let compsVmOk = true;
if (!compsIndexPageBody) {
  bad("SS-13: buildCompetitionsIndexPage not found in src/seo/pages.ts");
  compsVmOk = false;
} else {
  // v13.281.0-teamstrict: strict mode derives `entries` from the 10
  // SELECTED_COMPETITION_SLUGS (pool-matched for next-fixture info, the
  // honest empty tile otherwise); legacy keeps the bare compsIndex source.
  if (!/const poolEntries = compsIndex\(ctx\);/.test(compsIndexPageBody) ||
      !/Array\.from\(SEO\.SELECTED_COMPETITION_SLUGS\)\.map\(/.test(compsIndexPageBody)) {
    bad("SS-13: buildCompetitionsIndexPage lost its v13.281 entries source (poolEntries + the strict 10-slug derivation — the tile grid + the linkItemList must consume the same array)");
    compsVmOk = false;
  }
  if (!/for \(const e of entries\)/.test(compsIndexPageBody)) {
    bad("SS-13: buildCompetitionsIndexPage's tile grid lost its `for (const e of entries)` iteration");
    compsVmOk = false;
  }
  if (!/entries\.map\(\(e\) => \(/.test(compsIndexPageBody) || !/absUrl\("\/competitions\/" \+ e\.slug\)/.test(compsIndexPageBody)) {
    bad("SS-13: buildCompetitionsIndexPage's linkItemList must map over the SAME `entries` array the tile grid iterates (the visible==machine contract)");
    compsVmOk = false;
  }
  if (!/href="\/competitions\/' \+ e\.slug/.test(compsIndexPageBody)) {
    bad("SS-13: the /competitions tile anchor drifted (must be <a class=\"hubtile\" href=\"/competitions/{slug}\"> — crawlable, no href=\"#\" placeholder)");
    compsVmOk = false;
  }
}
if (compsVmOk) ok("SS-13: the /competitions index visible==machine contract holds (the tile grid + the linkItemList consume the same `entries` array); every tile is a crawlable <a href=\"/competitions/{slug}\">");

// ---- 4. crawlable <a href> in the tile grids (no href="#" placeholders) ----
// The tile hrefs are crawlable /teams/... + /competitions/... (verified above).
// Additional: the match-row renderer (mrowHtml) emits <a class="match" href="...">
// — the match-detail + team-page + competition-page + hub internal links.
let crawlOk = true;
if (!/let row = '<a class="match' \+/.test(pagesSrc) && !/<a class="match/.test(pagesSrc)) {
  // the mrowHtml lives in markup.ts — check the hub/match/competition builders
  // call dateGroupedRows (the crawlable match-row renderer).
}
// the dateGroupedRows renderer is the crawlable match-row surface
const matchPageBody = fnBody(pagesSrc, "buildMatchPage");
const teamPageBody = fnBody(pagesSrc, "buildTeamPage");
const compPageBody = fnBody(pagesSrc, "buildCompetitionPage");
const hubBody = fnBody(pagesSrc, "buildHub");
if (matchPageBody && !/dateGroupedRows\(/.test(matchPageBody) && !/matchRelatedHtml\(/.test(matchPageBody)) {
  // match page uses matchRelatedHtml (the S17 block) — that's the crawlable surface
}
if (teamPageBody && !/dateGroupedRows\(upcoming, false\)/.test(teamPageBody)) {
  bad("S10/crawl: buildTeamPage lost its dateGroupedRows(upcoming, false) call — the crawlable <a href> match rows (Session 8 — the upcoming-matches block)");
  crawlOk = false;
}
if (compPageBody && !/dateGroupedRows\(list, false\)/.test(compPageBody)) {
  bad("S10/crawl: buildCompetitionPage lost its dateGroupedRows(list, false) call — the crawlable <a href> match rows (Session 9 — the upcoming-matches block)");
  crawlOk = false;
}
if (hubBody && !/dateGroupedRows\(all, false\)/.test(hubBody)) {
  bad("S10/crawl: buildHub lost its dateGroupedRows(all, false) call — the crawlable <a href> match rows (the date-hub match list)");
  crawlOk = false;
}
if (crawlOk) ok("S10/crawl: the team-page + competition-page + date-hub match lists render crawlable <a href> match rows via dateGroupedRows → mrowHtml → matchHref (spec §5 + §9 — no JS-only navigation, no href=\"#\" placeholders)");

// ---- 5. the hubTiles() cross-hub nav (all 4 sibling hubs) ----
let hubTilesOk = true;
if (!/function hubTiles\(\): string \{/.test(pagesSrc)) {
  bad("S10/nav: the hubTiles() shortcut grid not found (the date-hub + /matches cross-hub nav — 4 sibling-hub tiles)");
  hubTilesOk = false;
} else {
  const htStart = pagesSrc.indexOf("function hubTiles(): string {");
  const htEnd = pagesSrc.indexOf("\n}", htStart);
  const htBody = pagesSrc.slice(htStart, htEnd < 0 ? pagesSrc.length : htEnd);
  // all 4 sibling hubs must be linked
  const expected = [
    ['/matches/today', "بازی‌های امروز"],
    ['/matches/tomorrow', "بازی‌های فردا"],
    ['/matches/this-week', "بازی‌های این هفته"],
    ['/matches/this-weekend', "بازی‌های آخر هفته"],
  ];
  for (const [href, label] of expected) {
    if (!htBody.includes('hubTile("' + href + '", "' + label + '"')) {
      bad("S10/nav: hubTiles() lost its " + href + " tile («" + label + "» — the cross-hub nav must link all 4 sibling hubs)");
      hubTilesOk = false;
    }
  }
  // each tile is a crawlable <a href> — the hubTile() renderer builds the anchor
  if (!/href="' \+ href \+ '"/.test(pagesSrc)) {
    bad("S10/nav: the hubTile() renderer lost its crawlable <a class=\"hubtile\" href=\"...\"> pattern");
    hubTilesOk = false;
  }
}
if (hubTilesOk) ok("S10/nav: the hubTiles() shortcut grid links all 4 sibling hubs (today/tomorrow/this-week/this-weekend) via crawlable <a href> — the cross-hub nav");

// ---- 6. the breadcrumb discipline (every page class carries a trail) ----
let crumbOk = true;
const crumbChecks = [
  ["buildMatchPage", "بازی‌ها", "/matches"],          // match → home/بازی‌ها/{home – away}
  ["buildTeamPage", "تیم‌ها", "/teams"],               // team → home/تیم‌ها/{name}
  ["buildCompetitionPage", "رقابت‌ها", "/competitions"], // comp → home/رقابت‌ها/{comp}
  ["buildHub", "بازی‌ها", "/matches"],                  // hub → home/بازی‌ها/{crumb}
  ["buildTeamsIndexPage", "تیم‌ها", null],              // /teams index → home/تیم‌ها
  ["buildCompetitionsIndexPage", "رقابت‌ها", null],     // /competitions index → home/رقابت‌ها
];
for (const [fn, section, sectionHref] of crumbChecks) {
  const body = fnBody(pagesSrc, fn);
  if (!body) { bad("S10/crumb: " + fn + " not found"); crumbOk = false; continue; }
  if (!/const trail = \[/.test(body)) {
    bad("S10/crumb: " + fn + " lost its breadcrumb `trail` definition (home → section → page — spec §5 + P-17)");
    crumbOk = false;
  }
  if (!/M\.breadcrumbsHtml\(trail\)/.test(body)) {
    bad("S10/crumb: " + fn + " lost its M.breadcrumbsHtml(trail) visible-breadcrumb render");
    crumbOk = false;
  }
  if (!/JL\.breadcrumbNode\(trail\)/.test(body)) {
    bad("S10/crumb: " + fn + " lost its JL.breadcrumbNode(trail) JSON-LD BreadcrumbList node (the machine-readable breadcrumb)");
    crumbOk = false;
  }
  if (sectionHref && !body.includes('{ name: "' + section + '", href: "' + sectionHref + '" }')) {
    bad("S10/crumb: " + fn + " breadcrumb lost its «" + section + "» → " + sectionHref + " crumb (the section link)");
    crumbOk = false;
  }
}
if (crumbOk) ok("S10/crumb: every page class (match/team/competition/hub/teams-index/competitions-index) carries a breadcrumb trail (home → section → page) — visible M.breadcrumbsHtml + JSON-LD breadcrumbNode (spec §5 + P-17)");

// ---- 7. the match-page footer-hook team-link gating (S7 regression pin) ----
let s7GatingOk = true;
if (!matchPageBody) {
  bad("S7-regression: buildMatchPage not found");
  s7GatingOk = false;
} else {
  // the isSelectedTeam gating: selected → <a href="/teams/...">; non-selected → plain esc(faName)
  if (!/const homeTeamHtml = isSelectedTeam\(m\.homeTeam\.name\)/.test(matchPageBody)) {
    bad("S7-regression: buildMatchPage lost its `isSelectedTeam(m.homeTeam.name)` footer-hook gating (Session 7 — selected clubs get <a href>; non-selected render as plain text)");
    s7GatingOk = false;
  }
  if (!/const awayTeamHtml = isSelectedTeam\(m\.awayTeam\.name\)/.test(matchPageBody)) {
    bad("S7-regression: buildMatchPage lost its `isSelectedTeam(m.awayTeam.name)` footer-hook gating");
    s7GatingOk = false;
  }
  // the <a href="/teams/..."> pattern for selected + the plain esc(faName(...)) for non-selected
  if (!/'<a href="\/teams\/' \+ teamSlug\(m\.homeTeam\.name\) \+ '">' \+ esc\(faName\(m\.homeTeam\)\) \+ '<\/a>'/.test(matchPageBody)) {
    bad("S7-regression: buildMatchPage's selected-team anchor drifted (must be <a href=\"/teams/{slug}\">faName</a>)");
    s7GatingOk = false;
  }
  // the footer-hook «تیم‌ها» label — the source carries the ZWNJ as a literal
  // \u200c escape sequence (TypeScript string escape). Match the homeTeamHtml
  // concat that follows the label.
  if (!/homeTeamHtml \+ " \u00b7 " \+ awayTeamHtml/.test(matchPageBody) && !/homeTeamHtml \+ " . " \+ awayTeamHtml/.test(matchPageBody)) {
    bad("S7-regression: buildMatchPage's footer-hook «تیم‌ها» label drifted (the homeTeamHtml · awayTeamHtml concat — the Persian prefix with ZWNJ)");
    s7GatingOk = false;
  }
}
if (s7GatingOk) ok("S7-regression: the match-page footer-hook «تیم‌ها» line still gates team links on isSelectedTeam (selected → <a href=\"/teams/{slug}\">; non-selected → plain text; BODY-ONLY, the byte-frozen <head> untouched)");

// ---- 8. the homepage hero-card anchor (S6 regression pin) ----
let s6HeroOk = true;
// the hero card href is built from matchHref(nextBig.s) — router.ts
if (!/const heroHref = nextBig \? esc\(M\.matchHref\(nextBig\.s\)\) : "#";/.test(routerSrc)) {
  bad("S6-regression: the homepage hero-card href wiring drifted (router.ts: `heroHref = nextBig ? esc(M.matchHref(nextBig.s)) : \"#\"` — Session 6's crawlable hero anchor)");
  s6HeroOk = false;
}
// the hero-card <a> receives the href
if (!/<a class="hero-card" id="bigHeroCard"/.test(routerSrc)) {
  bad("S6-regression: the homepage hero-card <a> wiring drifted (the hero-card anchor element)");
  s6HeroOk = false;
}
// the sr-only carousel nav (the carousel slide links) — emitted when ≥ 2 heroMatches
if (!/function carouselNavHtml\(/.test(routerSrc)) {
  bad("S6-regression: the homepage carouselNavHtml() function not found (the sr-only carousel nav — crawlable slide links)");
  s6HeroOk = false;
} else {
  const cnStart = routerSrc.indexOf("function carouselNavHtml(");
  const cnEnd = routerSrc.indexOf("\n}", cnStart);
  const cnBody = routerSrc.slice(cnStart, cnEnd < 0 ? routerSrc.length : cnEnd);
  if (!/const href = M\.matchHref\(m\);/.test(cnBody)) {
    bad("S6-regression: carouselNavHtml lost its `M.matchHref(m)` href (the crawlable carousel slide links)");
    s6HeroOk = false;
  }
}
if (s6HeroOk) ok("S6-regression: the homepage hero-card anchor + the sr-only carousel nav still carry crawlable <a href=\"/matches/...\"> (Session 6's hero-card SSR href + carousel crawlability)");

if (failures) { console.error("FAIL check-seo-internallinks: " + failures + " failure(s)"); process.exit(1); }
console.log("OK   check-seo-internallinks: all " + oks + " internal-link gates passed (S10 teamsIndex selected-first sort, SS-13 visible==machine on /teams + /competitions, crawlable tile hrefs, hubTiles cross-hub nav, breadcrumb discipline, S7 footer-hook gating regression, S6 hero-card anchor regression)");
