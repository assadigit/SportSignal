#!/usr/bin/env node
// scripts/check-seo-competitionpages.js
// SEO Program Session 9 (competition pages + date hubs + empty states):
// offline gates for the 7 live competition detail pages (PL, PD, SA, FL1, BL1,
// UCL, DFB-Pokal — keyword map §2.8-2.13).
//
// The Session 9 scope (phase file + keyword map §2.8-2.13 + the Dec 4-8 freeze):
// the competition-page title/H1 bytes are byte-frozen through Dec 4-8 (the
// actual byte change is a post-Dec-4 decision with a fresh GSC export). The
// date hubs (/matches/today, /matches/tomorrow, /matches/this-week,
// /matches/this-weekend) are verified correct (collectionPageNode + ItemList +
// FAQ + Breadcrumb; self-canonical; indexable per the C5 decision; honest
// empty-state copy). This gate pins what Session 9 DID add + the byte-frozen
// surfaces it must NOT regress:
//
//   1. THE COLLECTIONPAGE NODE (S9) — buildCompetitionPage's @graph now carries
//      a CollectionPage node (JL.collectionPageNode), the same page-level
//      grounding every sibling page emits (the /competitions index + the
//      /matches hub + the time hubs use collectionPageNode; the team page +
//      the match page use webPageNode). The competition detail page was the
//      lone competition-family page without one; the spec contract (Step 3:
//      "@graph carries Organization + WebSite + WebPage + BreadcrumbList") now
//      holds. STRUCTURAL JSON-LD hygiene only — the byte-frozen
//      title/H1/description are untouched.
//   2. NO SPORTSEVENT — the competition page is not an event; a SportsEvent
//      node would require a fabricated fixture-on-this-page. The @graph keeps
//      SportsOrganization + ItemList (when indexable) + BreadcrumbList +
//      CollectionPage.
//   3. THE BYTE-FROZEN TITLE — «{لیگ} — برنامه بازی‌های بزرگ پیش‌رو | اسپرت
//      سیگنال» (keyword map §2.8-2.13 plan, byte-frozen through Dec 4-8 — the
//      curated framing «بازی‌های بزرگ پیش‌رو» is the differentiator vs the
//      full-coverage competitors). Any drift here is a freeze violation.
//   4. THE BYTE-FROZEN H1 — «برنامه بازی‌های X» (keyword map §2.8-2.13).
//   5. THE ANSWER SENTENCE LEADS WITH «نزدیک‌ترین بازی بزرگ {لیگ}» when there
//      is a next match (the GSC query head «برنامه بازی های لیگ قهرمانان
//      اروپا» 14 impr / pos 9.36 + the league-schedule heads), OR «بازی‌های
//      بزرگ پیش‌روی {لیگ} در اسپرت سیگنال» when no fixture is queued.
//   6. THE INDEXABLE RULE — list.length >= MIN_UPCOMING_FOR_INDEX (a
//      competition page is indexable when ≥1 upcoming approved match in that
//      competition; noindex, follow at 0 upcoming; 404 when no pool rows at
//      all — the route plan §5 + the INDEXABILITY-MATRIX competition rows).
//   7. INTERNAL LINKS — the upcoming-matches block renders crawlable <a href>
//      match rows (dateGroupedRows → mrowHtml → matchHref); the spec §9
//      "Competition page → upcoming approved matches and team pages" contract.
//      The full standings table (fullStandings, one cache-only KV read,
//      fail-closed to the compact) is the spec §2 "Keep the current fairly
//      complete competition page experience" surface.
//   8. THE JSON-LD NODE ORDER mirrors the team page (site → CollectionPage →
//      entity → ItemList → Breadcrumb). The order is a convention, not a
//      schema requirement, but pinning it keeps the @graph legible and catches
//      an accidental node swap.
"use strict";
const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");

let failures = 0;
let oks = 0;
function ok(msg) { oks++; console.log("OK   check-seo-competitionpages: " + msg); }
function bad(msg) { console.error("FAIL check-seo-competitionpages: " + msg); failures++; }

const pagesSrc = fs.readFileSync(path.join(root, "src", "seo", "pages.ts"), "utf8");

// Locate buildCompetitionPage — the function body (between its signature and
// the next export at column 0). Every assertion below is scoped to THIS body
// so a string match elsewhere in the file cannot satisfy a competition-page
// gate.
const fnName = "buildCompetitionPage";
const fnStart = pagesSrc.indexOf("export async function " + fnName + "(");
if (fnStart < 0) { bad(fnName + " not found in src/seo/pages.ts"); process.exit(1); }
// the body ends at the next top-level "export " line after fnStart
let fnEnd = pagesSrc.indexOf("\nexport ", fnStart + 1);
if (fnEnd < 0) fnEnd = pagesSrc.length;
const body = pagesSrc.slice(fnStart, fnEnd);

// ---- 1. the CollectionPage node (S9) — JL.collectionPageNode is in the competition-page @graph ----
let s9cpOk = true;
if (!body.includes("JL.collectionPageNode(")) {
  bad("S9: buildCompetitionPage's jsonldNodes lost the JL.collectionPageNode call (the page-level CollectionPage node — the spec §Step-3 contract)");
  s9cpOk = false;
}
// the CollectionPage node sits inside the jsonldNodes array (the @graph), not loose
const cpArrayStart = body.indexOf("jsonldNodes:");
const cpArrayEnd = body.indexOf("].filter(Boolean)", cpArrayStart);
if (cpArrayStart < 0 || cpArrayEnd < 0 || cpArrayEnd <= cpArrayStart) {
  bad("S9: buildCompetitionPage's jsonldNodes array not found (the @graph assembly moved?)");
  s9cpOk = false;
} else {
  const cpArray = body.slice(cpArrayStart, cpArrayEnd);
  if (!cpArray.includes("JL.collectionPageNode(")) {
    bad("S9: JL.collectionPageNode must sit INSIDE buildCompetitionPage's jsonldNodes array (the @graph), not loose in the body");
    s9cpOk = false;
  }
  // the CollectionPage node describes the competition page itself — its name
  // carries the page's H1 intent (the schedule, not a single fixture) and its
  // path + dateModified ground the page-level subject. The name argument is a
  // concatenation ("برنامه بازی‌های " + String(cNameFa)) with nested parens,
  // so we slice from the call opening to its ctx.fetchedAt) close and check
  // the slice carries path + the H1-intent phrase + dateModified.
  const cpCallStart = cpArray.indexOf("JL.collectionPageNode(");
  const cpCallEnd = cpArray.indexOf("ctx.fetchedAt)", cpCallStart);
  if (cpCallStart < 0 || cpCallEnd < 0 || cpCallEnd <= cpCallStart) {
    bad("S9: the collectionPageNode call signature is malformed (expected JL.collectionPageNode(…, ctx.fetchedAt)) — the @graph assembly moved?");
    s9cpOk = false;
  } else {
    const cpCall = cpArray.slice(cpCallStart, cpCallEnd + "ctx.fetchedAt)".length);
    if (!/JL\.collectionPageNode\(path,/.test(cpCall)) {
      bad("S9: the collectionPageNode call must take path as its first argument (the page-level subject's URL)");
      s9cpOk = false;
    }
    if (!cpCall.includes("برنامه بازی‌های")) {
      bad("S9: the collectionPageNode name argument lost its «برنامه بازی‌های …» H1-intent phrase (the page describes the schedule, not a single fixture)");
      s9cpOk = false;
    }
    if (!cpCall.includes("ctx.fetchedAt")) {
      bad("S9: the collectionPageNode call lost its ctx.fetchedAt dateModified argument (the page-level subject's last-modified ground)");
      s9cpOk = false;
    }
  }
}
if (s9cpOk) ok("S9: buildCompetitionPage's @graph carries a CollectionPage node (JL.collectionPageNode(path, \"برنامه بازی‌های …\", ctx.fetchedAt)) — the page-level grounding every sibling page emits; the spec Step-3 contract holds");

// ---- 2. NO SportsEvent in the competition-page @graph ----
if (body.includes("JL.sportsEventNode(") || body.includes('"@type": "SportsEvent"')) {
  bad("S9: a SportsEvent node leaked into buildCompetitionPage — the competition page is not an event; a fixture-on-this-page would be fabricated (S-03/S-04 no-invented-data)");
} else {
  ok("S9: buildCompetitionPage emits NO SportsEvent node (the competition page is a schedule/standings hub, not an event — the spec contract)");
}

// ---- 3. the byte-frozen title (keyword map §2.8-2.13) ----
let titleOk = true;
const titleTemplate = '" — برنامه بازی‌های بزرگ پیش‌رو | اسپرت سیگنال"';
if (!body.includes("const title = cNameFa + " + titleTemplate)) {
  bad("S9/freeze: the byte-frozen competition-page title template drifted (keyword map §2.8-2.13: «{لیگ} — برنامه بازی‌های بزرگ پیش‌رو | اسپرت سیگنال» — the curated framing «بازی‌های بزرگ پیش‌رو» is the differentiator)");
  titleOk = false;
}
if (titleOk) ok("S9/freeze: the competition-page title is byte-frozen (keyword map §2.8-2.13: «{لیگ} — برنامه بازی‌های بزرگ پیش‌رو | اسپرت سیگنال» — the Dec 4-8 freeze holds)");

// ---- 4. the byte-frozen H1 (keyword map §2.8-2.13) ----
if (!body.includes('h1: "برنامه بازی‌های " + esc(String(cNameFa))')) {
  bad("S9/freeze: the byte-frozen competition-page H1 drifted (keyword map §2.8-2.13: «برنامه بازی‌های X»)");
} else {
  ok("S9/freeze: the competition-page H1 is byte-frozen (keyword map §2.8-2.13: «برنامه بازی‌های X»)");
}

// ---- 5. the answer sentence leads with «نزدیک‌ترین بازی بزرگ {لیگ}» when there is a next match ----
// The GSC query head the page must answer: «برنامه بازی های لیگ قهرمانان اروپا»
// (14 impr, pos 9.36) + the league-schedule heads (the keyword map §2.8-2.13
// representative phrases). The answer leads with the next big match in that
// competition.
let answerOk = true;
if (!body.includes('answer = "نزدیک‌ترین بازی بزرگ " + cNameFa + ": "')) {
  bad("S9: the next-match answer sentence lost its «نزدیک‌ترین بازی بزرگ {لیگ}: …» lead (the GSC query head the page must answer — «برنامه بازی های لیگ قهرمانان اروپا» / «برنامه بازی های لالیگا» / «بازی‌های لیگ برتر انگلیس»)");
  answerOk = false;
}
if (!body.includes('answer = "بازی‌های بزرگ پیش‌روی " + cNameFa + " در اسپرت سیگنال')) {
  bad("S9: the no-next-match answer sentence lost its «بازی‌های بزرگ پیش‌روی {لیگ} در اسپرت سیگنال» form (the schedule-head when no fixture is queued)");
  answerOk = false;
}
if (answerOk) ok("S9: the answer sentence leads with «نزدیک‌ترین بازی بزرگ {لیگ}» (next match) / «بازی‌های بزرگ پیش‌روی {لیگ} در اسپرت سیگنال» (no next match) — the GSC query heads the page answers");

// ---- 6. the indexable rule (the route plan §5 + the INDEXABILITY-MATRIX competition rows) ----
if (!body.includes("const indexable = list.length >= SEO.MIN_UPCOMING_FOR_INDEX;")) {
  bad("S9: buildCompetitionPage's indexable rule drifted (the route plan §5: indexable when ≥1 upcoming approved match; noindex, follow at 0 upcoming; 404 when no pool rows at all)");
} else {
  ok("S9: buildCompetitionPage's indexable rule = list.length >= MIN_UPCOMING_FOR_INDEX (the route plan §5 + the INDEXABILITY-MATRIX competition rows — index at ≥1, noindex at 0)");
}

// ---- 7. internal links — the upcoming-matches block renders crawlable <a href> + the standings table ----
let linkOk = true;
if (!body.includes('<h2>بازی‌های پیش‌رو</h2>')) {
  bad("S9: the upcoming-matches block heading «بازی‌های پیش‌رو» drifted (the spec §9 'Competition page → upcoming approved matches and team pages' surface)");
  linkOk = false;
}
if (!body.includes("dateGroupedRows(list, false)")) {
  bad("S9: the upcoming-matches block lost dateGroupedRows(list, false) — the crawlable <a href> match rows (spec §9 internal links)");
  linkOk = false;
}
// the full standings table (fullStandings, one cache-only KV read, fail-closed)
// — the spec §2 "Keep the current fairly complete competition page experience"
if (!body.includes("const full = await fullStandings(ctx.env, code)")) {
  bad("S9: the full standings table loader drifted (the spec §2 'Keep the current fairly complete competition page experience' — fullStandings, one cache-only KV read, fail-closed to the compact)");
  linkOk = false;
}
if (!body.includes("standingsBlock")) {
  bad("S9: the standings block assembly drifted (the spec §2 'fairly complete competition page experience' surface)");
  linkOk = false;
}
if (linkOk) ok("S9: the competition page renders crawlable upcoming-matches rows (dateGroupedRows → mrowHtml → matchHref) + the full standings table (fullStandings, cache-only, fail-closed) — spec §2 + §9");

// ---- 8. the JSON-LD node ORDER mirrors the team page (site → CollectionPage → entity → ItemList → Breadcrumb) ----
// The order is a convention, not a schema requirement, but pinning it keeps
// the @graph legible and catches an accidental node swap.
const orderMarkers = ["JL.siteNodes()", "JL.collectionPageNode(", "JL.sportsOrganizationNode(", "JL.breadcrumbNode("];
const positions = orderMarkers.map((m) => body.indexOf(m));
if (positions.some((p) => p < 0)) {
  bad("S9: a @graph node-order marker is missing (site/CollectionPage/SportsOrganization/Breadcrumb) — the @graph assembly moved?");
} else {
  let orderOk = true;
  for (let i = 1; i < positions.length; i++) {
    if (positions[i] <= positions[i - 1]) { orderOk = false; break; }
  }
  if (!orderOk) {
    bad("S9: the competition-page @graph node order drifted (convention: siteNodes → collectionPageNode → sportsOrganizationNode → [itemListNode] → breadcrumbNode)");
  } else {
    ok("S9: the competition-page @graph node order: siteNodes → collectionPageNode → sportsOrganizationNode → [itemListNode] → breadcrumbNode");
  }
}

if (failures) { console.error("FAIL check-seo-competitionpages: " + failures + " failure(s)"); process.exit(1); }
console.log("OK   check-seo-competitionpages: all " + oks + " competition-page gates passed (S9 CollectionPage node, no-SportsEvent, byte-frozen title/H1, answer lead, indexable rule, internal links + standings, @graph order)");
