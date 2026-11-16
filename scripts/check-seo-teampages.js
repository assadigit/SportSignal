#!/usr/bin/env node
// scripts/check-seo-teampages.js
// SEO Program Session 8 (selected-club team pages — content + indexability
// alignment): offline gates for the 13 keeper team pages.
//
// The Session 8 scope (phase file + keyword map §2.7 + the Dec 4-8 freeze):
// the C1 disposition (allowlist + sitemap filter + non-selected noindex) is
// DONE (Session 4 — gated by check-seo-crawlindex.js); the team-page
// title/H1 bytes are byte-frozen through Dec 4-8 (the parked S2 title test
// reads GSC on Dec 4 — Session 8 owns the content + the structural JSON-LD,
// NOT the title bytes pre-gate). This gate pins what Session 8 DID add +
// the byte-frozen surfaces it must NOT regress:
//
//   1. THE WEBPAGE NODE (S8) — buildTeamPage's @graph now carries a WebPage
//      node (JL.webPageNode), the same page-level grounding every other
//      page-class emits (match: webPageNode; hubs + /teams + /competitions
//      indexes: collectionPageNode). The team page was the lone page-class
//      without one; the spec contract (Step 3: "@graph carries Organization
//      + WebSite + WebPage + BreadcrumbList") now holds. STRUCTURAL JSON-LD
//      hygiene only — the byte-frozen title/H1/description are untouched.
//   2. NO SPORTSEVENT — the team page is not an event; a SportsEvent node
//      would require a fabricated fixture-on-this-page. The @graph keeps
//      SportsTeam + ItemList (when indexable) + BreadcrumbList + WebPage.
//   3. THE BYTE-FROZEN TITLE LADDER — the title template + the >65 rung
//      (the keyword map §2.7 plan, byte-frozen through Dec 4-8). Any drift
//      here is a freeze violation.
//   4. THE BYTE-FROZEN H1 — «برنامه بازی‌های X» (keyword map §2.7).
//   5. THE ANSWER SENTENCE LEADS WITH «بازی بعدی X» when there is a next
//      match (the GSC query head the page must answer — «بازی بعدی بارسا»
//      179 impr / pos 9.97).
//   6. THE INDEXABLE RULE — selected club AND >= MIN_UPCOMING_FOR_INDEX
//      (the C1 disposition, gated here too so a team-page regression is
//      caught by THIS gate as well as check-seo-crawlindex.js §2).
//   7. INTERNAL LINKS — the upcoming-matches block renders crawlable
//      <a href> match rows (dateGroupedRows → mrowHtml → matchHref); the
//      spec §9 "Selected team page → upcoming approved matches and
//      competition pages" contract.
"use strict";
const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");

let failures = 0;
let oks = 0;
function ok(msg) { oks++; console.log("OK   check-seo-teampages: " + msg); }
function bad(msg) { console.error("FAIL check-seo-teampages: " + msg); failures++; }

const pagesSrc = fs.readFileSync(path.join(root, "src", "seo", "pages.ts"), "utf8");

// Locate buildTeamPage — the function body (between its signature and the
// next export at column 0). Every assertion below is scoped to THIS body so
// a string match elsewhere in the file cannot satisfy a team-page gate.
const fnName = "buildTeamPage";
const fnStart = pagesSrc.indexOf("export async function " + fnName + "(");
if (fnStart < 0) { bad(fnName + " not found in src/seo/pages.ts"); process.exit(1); }
// the body ends at the next top-level "export " line after fnStart
let fnEnd = pagesSrc.indexOf("\nexport ", fnStart + 1);
if (fnEnd < 0) fnEnd = pagesSrc.length;
const body = pagesSrc.slice(fnStart, fnEnd);

// ---- 1. the WebPage node (S8) — JL.webPageNode is in the team-page @graph ----
let s8wpOk = true;
if (!body.includes("JL.webPageNode(")) {
  bad("S8: buildTeamPage's jsonldNodes lost the JL.webPageNode call (the page-level WebPage node — the spec §Step-3 contract)");
  s8wpOk = false;
}
// the WebPage node sits inside the jsonldNodes array (the @graph), not loose
const wpArrayStart = body.indexOf("jsonldNodes:");
const wpArrayEnd = body.indexOf("].filter(Boolean)", wpArrayStart);
if (wpArrayStart < 0 || wpArrayEnd < 0 || wpArrayEnd <= wpArrayStart) {
  bad("S8: buildTeamPage's jsonldNodes array not found (the @graph assembly moved?)");
  s8wpOk = false;
} else {
  const wpArray = body.slice(wpArrayStart, wpArrayEnd);
  if (!wpArray.includes("JL.webPageNode(")) {
    bad("S8: JL.webPageNode must sit INSIDE buildTeamPage's jsonldNodes array (the @graph), not loose in the body");
    s8wpOk = false;
  }
  // the WebPage node describes the team page itself — its name carries the
  // page's H1 intent (the schedule, not a single fixture)
  if (!/JL\.webPageNode\(path,\s*ctx\.fetchedAt,/.test(wpArray)) {
    bad("S8: the webPageNode call must take (path, ctx.fetchedAt, …) — the page-level subject (path + dateModified)");
    s8wpOk = false;
  }
}
if (s8wpOk) ok("S8: buildTeamPage's @graph carries a WebPage node (JL.webPageNode(path, ctx.fetchedAt, …)) — the page-level grounding every page-class emits; the spec Step-3 contract holds");

// ---- 2. NO SportsEvent in the team-page @graph ----
if (body.includes("JL.sportsEventNode(") || body.includes('"@type": "SportsEvent"')) {
  bad("S8: a SportsEvent node leaked into buildTeamPage — the team page is not an event; a fixture-on-this-page would be fabricated (S-03/S-04 no-invented-data)");
} else {
  ok("S8: buildTeamPage emits NO SportsEvent node (the team page is a schedule hub, not an event — the spec contract)");
}

// ---- 3. the byte-frozen title ladder (keyword map §2.7) ----
let titleOk = true;
const titleTemplate = '" — برنامه بازی بعدی و ساعت شروع | اسپرت سیگنال"';
const titleRung = '" — برنامه بازی و ساعت شروع | اسپرت سیگنال"';
if (!body.includes("let title = name + " + titleTemplate)) {
  bad("S8/freeze: the byte-frozen team-page title template drifted (keyword map §2.7: «X — برنامه بازی بعدی و ساعت شروع | اسپرت سیگنال»)");
  titleOk = false;
}
if (!body.includes("if (title.length > 65) title = name + " + titleRung)) {
  bad("S8/freeze: the >65 title rung drifted (the v13.229-teamladder trim drops «بعدی » only when the assembled title exceeds 65)");
  titleOk = false;
}
if (titleOk) ok("S8/freeze: the team-page title ladder is byte-frozen (keyword map §2.7 + the v13.229-teamladder >65 rung — the Dec 4-8 freeze holds)");

// ---- 4. the byte-frozen H1 (keyword map §2.7) ----
if (!body.includes('h1: "برنامه بازی‌های " + esc(name)')) {
  bad("S8/freeze: the byte-frozen team-page H1 drifted (keyword map §2.7: «برنامه بازی‌های X»)");
} else {
  ok("S8/freeze: the team-page H1 is byte-frozen (keyword map §2.7: «برنامه بازی‌های X»)");
}

// ---- 5. the answer sentence leads with «بازی بعدی X» when there is a next match ----
// The GSC query head the page must answer: «بازی بعدی بارسا» 179 impr / pos 9.97.
let answerOk = true;
if (!body.includes('answer = "بازی بعدی " + name + ": "')) {
  bad("S8: the next-match answer sentence lost its «بازی بعدی X» lead (the GSC query head the page must answer — «بازی بعدی بارسا» / «بازی بعدی بایرن مونیخ»)");
  answerOk = false;
}
if (!body.includes('answer = "برنامه بازی‌های " + name + " در اسپرت سیگنال')) {
  bad("S8: the no-next-match answer sentence lost its «برنامه بازی‌های X در اسپرت سیگنال» form (the schedule-head when no fixture is queued)");
  answerOk = false;
}
if (answerOk) ok("S8: the answer sentence leads with «بازی بعدی X» (next match) / «برنامه بازی‌های X در اسپرت سیگنال» (no next match) — the GSC query heads the page answers");

// ---- 6. the indexable rule (the C1 disposition — gated here too) ----
if (!body.includes("const indexable = isSelectedTeam(entry.name) && upcoming.length >= SEO.MIN_UPCOMING_FOR_INDEX;")) {
  bad("S8: buildTeamPage's indexable rule drifted (the C1 disposition: selected club AND >= MIN_UPCOMING_FOR_INDEX)");
} else {
  ok("S8: buildTeamPage's indexable rule = selected club AND >= MIN_UPCOMING_FOR_INDEX (the C1 disposition — row 9 index at >=1, noindex at 0)");
}

// ---- 7. internal links — the upcoming-matches block renders crawlable <a href> ----
let linkOk = true;
if (!body.includes('بازی‌های پیش‌روی ')) {
  bad("S8: the upcoming-matches block heading «بازی‌های پیش‌روی X» drifted (the spec §9 'Selected team page → upcoming approved matches' surface)");
  linkOk = false;
}
if (!body.includes("dateGroupedRows(upcoming, false)")) {
  bad("S8: the upcoming-matches block lost dateGroupedRows(upcoming, false) — the crawlable <a href> match rows (spec §9 internal links)");
  linkOk = false;
}
if (!body.includes("نتایج اخیر")) {
  bad("S8: the recent-results block «نتایج اخیر» drifted (spec §2 'recent/final result information already available')");
  linkOk = false;
}
if (linkOk) ok("S8: the team page renders crawlable upcoming-matches rows (dateGroupedRows → mrowHtml → matchHref) + the recent-results block (spec §2 + §9)");

// ---- 8. the JSON-LD node ORDER mirrors the match page (site → WebPage → entity → ItemList → Breadcrumb) ----
// The order is a convention, not a schema requirement, but pinning it keeps
// the @graph legible and catches an accidental node swap.
const orderMarkers = ["JL.siteNodes()", "JL.webPageNode(", "JL.sportsTeamNode(", "JL.breadcrumbNode("];
const positions = orderMarkers.map((m) => body.indexOf(m));
if (positions.some((p) => p < 0)) {
  bad("S8: a @graph node-order marker is missing (site/WebPage/SportsTeam/Breadcrumb) — the @graph assembly moved?");
} else {
  let orderOk = true;
  for (let i = 1; i < positions.length; i++) {
    if (positions[i] <= positions[i - 1]) { orderOk = false; break; }
  }
  if (!orderOk) {
    bad("S8: the team-page @graph node order drifted (convention: siteNodes → webPageNode → sportsTeamNode → [itemListNode] → breadcrumbNode)");
  } else {
    ok("S8: the team-page @graph node order: siteNodes → webPageNode → sportsTeamNode → [itemListNode] → breadcrumbNode");
  }
}

if (failures) { console.error("FAIL check-seo-teampages: " + failures + " failure(s)"); process.exit(1); }
console.log("OK   check-seo-teampages: all " + oks + " selected-club team-page gates passed (S8 WebPage node, no-SportsEvent, byte-frozen title/H1, answer lead, indexable rule, internal links, @graph order)");
