#!/usr/bin/env node
// scripts/check-match-centre.js
// Match Centre S02 (M1): gates the route shell + the semantic section
// structure (milestones-and-sessions.md M1/S02, audit §16).
//   1. REGISTRY — src/seo/match-centre.ts defines the eleven semantic
//      section slots in specification §3 order (hero, nav, summary/
//      briefing+facts, standings, form, venue, schedule, faq, related,
//      telegram, footer-hook), each with a Persian landmark label.
//   2. BEHAVIOR — the REAL composer (required, never re-implemented):
//      sections render in registry order, every non-empty part wrapped in
//      its anchored <section id="mcentre-*" aria-label="…">, content
//      round-trips byte-identical, and EMPTY PARTS ARE OMITTED — never an
//      empty placeholder (the no-empty-cards law, spec §3/§16).
//   3. WIRING — buildMatchPage delegates its main assembly to
//      matchCentreMain with the existing builders' output (hero/summary/
//      form/related/footer-hook); the GSC measurement surfaces (title
//      ladder, meta-description funnel, canonical path, JSON-LD nodes,
//      breadcrumbs, the answer-first answercard) stay byte-for-byte in
//      pages.ts — the S1/S2 SEO measurement runs until Dec 4–8.
//   4. THE COST LAW — zero new data work: match-centre.ts is a pure leaf
//      (no runtime imports, no KV, no fetch, no client script) and
//      buildMatchPage's awaits stay exactly the three pre-existing loads
//      (hydrateMatchVenue, loadArchive, fullByCodeFor).
//   5. HARNESS — worker-src.js carries the seo/match-centre.ts order entry
//      (the co-evolution law) and package.json's test chain runs this file.
"use strict";
const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");

let failures = 0;
function ok(msg) { console.log("OK   check-match-centre: " + msg); }
function bad(msg) { console.error("FAIL check-match-centre: " + msg); failures++; }
function read(rel) { return fs.readFileSync(path.join(root, rel), "utf8"); }
function check(cond, msg) { if (cond) ok(msg); else bad(msg); }

const mcSrc = read("src/seo/match-centre.ts");
const pagesSrc = read("src/seo/pages.ts");
const shellSrc = read("src/seo/page-shell.ts");
const harnessSrc = read("scripts/lib/worker-src.js");

// ---------- 1. the registry ----------
const EXPECTED_SLOTS = [
  "mcentre-hero", "mcentre-nav", "mcentre-summary", "mcentre-standings",
  "mcentre-form", "mcentre-venue", "mcentre-schedule", "mcentre-faq",
  "mcentre-related", "mcentre-telegram", "mcentre-footer-hook"
];
const slots = [];
const slotRe = /slot:\s*"(mcentre-[a-z-]+)"/g;
let m;
while ((m = slotRe.exec(mcSrc)) !== null) slots.push(m[1]);
check(JSON.stringify(slots) === JSON.stringify(EXPECTED_SLOTS),
  "registry: the eleven semantic slots in spec §3 order (hero, nav, summary, standings, form, venue, schedule, faq, related, telegram, footer-hook)");
check(/export const MC_SECTION_ORDER/.test(mcSrc),
  "registry: MC_SECTION_ORDER is the exported contract");
// every slot carries a non-empty Persian landmark label
const labelOk = EXPECTED_SLOTS.every((s) => {
  const re = new RegExp('slot:\\s*"' + s + '",\\s*label:\\s*"([^"]+)"');
  const mm = mcSrc.match(re);
  return !!mm && mm[1].trim().length > 1 && /[\u0600-\u06FF]/.test(mm[1]);
});
check(labelOk, "registry: every slot carries a non-empty Persian aria-label");
// the anchor prefix stays clear of the mobile-card family (mcCells/mcHint/mc-heroes)
check(!/["']mc-/.test(mcSrc),
  "registry: no bare mc- ids (the mobile-card family owns that spelling — mcentre- only)");

// ---------- 2. behavior: require the REAL module ----------
const mc = require(path.join(root, "src", "seo", "match-centre.ts"));
check(typeof mc.matchCentreMain === "function" && Array.isArray(mc.MC_SECTION_ORDER),
  "module loads via the repo's stripTypes require (matchCentreMain + MC_SECTION_ORDER exported)");

// full render: registry order, exact wrappers, byte-identical content
const parts = {
  hero: "<div>HERO</div>",
  summary: '<div class="answercard" id="answer">خلاصه — ۲ – ۱</div>',
  form: "<div>FORM</div>",
  related: "<div>RELATED</div>",
  footerHook: "<div>HOOK</div>"
};
const html = mc.matchCentreMain(parts);
const gotOrder = [];
const idRe = /<section id="(mcentre-[a-z-]+)"/g;
while ((m = idRe.exec(html)) !== null) gotOrder.push(m[1]);
check(JSON.stringify(gotOrder) === JSON.stringify(["mcentre-hero", "mcentre-summary", "mcentre-form", "mcentre-related", "mcentre-footer-hook"]),
  "behavior: S02 parts render as five sections in registry order (future slots omitted)");
check(html.indexOf('<section id="mcentre-hero" aria-label="') > -1 && html.indexOf("<div>HERO</div></section>") > -1,
  "behavior: the hero part is wrapped in its anchored aria-labelled section");
check(html.includes('<div class="answercard" id="answer">خلاصه — ۲ – ۱</div>'),
  "behavior: content round-trips byte-identical (no escaping, no re-wrapping)");

// the no-empty-cards law: empty and whitespace-only parts are OMITTED
const sparse = mc.matchCentreMain({ hero: "<div>H</div>", summary: "", form: "   \n\t", related: "", footerHook: "<div>K</div>" });
check(!sparse.includes("mcentre-summary") && !sparse.includes("mcentre-form") && !sparse.includes("mcentre-related"),
  "behavior: empty/whitespace-only parts are omitted entirely (no empty cards)");
check(!/<section id="mcentre-[a-z-]+"[^>]*>\s*<\/section>/.test(sparse) && !/<section id="mcentre-[a-z-]+"[^>]*><\/section>/.test(mc.matchCentreMain(parts)),
  "behavior: no hollow <section> wrapper ever renders (the no-placeholder law)");
check(mc.matchCentreMain({ hero: "", summary: "", form: "", related: "", footerHook: "" }) === "",
  "behavior: all-empty input → empty string (fail-closed, never a bare shell)");
// a future-slot part lands in its registry position (composer ready for S06+)
const withNav = mc.matchCentreMain({ ...parts, nav: "<nav>NAV</nav>" });
check(withNav.indexOf('id="mcentre-hero"') < withNav.indexOf('id="mcentre-nav"') && withNav.indexOf('id="mcentre-nav"') < withNav.indexOf('id="mcentre-summary"'),
  "behavior: a provided future slot (nav) renders in its spec position — S06+ needs no contract change");

// ---------- 3. wiring: buildMatchPage delegates, GSC surfaces stay ----------
let wiringOk = true;
if (!/import \{ matchCentreMain \} from "\.\/match-centre";/.test(pagesSrc)) { bad("wiring: pages.ts lost the match-centre import"); wiringOk = false; }
if (!/const main = matchCentreMain\(\{/.test(pagesSrc)) { bad("wiring: buildMatchPage no longer delegates its main assembly to matchCentreMain"); wiringOk = false; }
if (!/hero: matchHeadHtml\(sm\) \+ matchActionsHtml\(sm, path\) \+ matchHeadScript\(\)/.test(pagesSrc)) { bad("wiring: the hero part is no longer the scoreboard head + actions + script"); wiringOk = false; }
if (!/summary: whyBigHtml\(sm, ctx\) \+ facts \+ resultBlock/.test(pagesSrc)) { bad("wiring: the summary part no longer carries answercard + facts (+ result block)"); wiringOk = false; }
if (!/form: formCard,/.test(pagesSrc)) { bad("wiring: the form part no longer carries the W/D/L strip"); wiringOk = false; }
if (!/related: similarCard,/.test(pagesSrc)) { bad("wiring: the related part no longer carries the sibling-fixtures card"); wiringOk = false; }
if (!/footerHook: related/.test(pagesSrc)) { bad("wiring: the footer-hook part no longer carries the related-links card"); wiringOk = false; }
if (/matchHeadHtml\(sm\) \+ matchActionsHtml\(sm, path\) \+ matchHeadScript\(\) \+ whyBigHtml/.test(pagesSrc)) { bad("wiring: the old flat main concat is still present alongside the delegation"); wiringOk = false; }
if (wiringOk) ok("wiring: buildMatchPage delegates the five parts to matchCentreMain (old flat concat gone)");

// GSC measurement surfaces — byte-for-byte, still assembled in pages.ts
let gscOk = true;
if (!/let title = tCore \+ compFa \+ "، " \+ tDate \+ " \| اسپرت سیگنال";/.test(pagesSrc)) { bad("GSC: the <title> ladder entry point changed (Nov 6 title test runs until Dec 4)"); gscOk = false; }
if (!/let desc = matchAnswerSentence\(sm\)\.replace\(/.test(pagesSrc)) { bad("GSC: the meta-description funnel no longer starts from matchAnswerSentence"); gscOk = false; }
if (!/path,\n\s+title,/.test(pagesSrc) || !/head: buildHead\(\{/.test(pagesSrc)) { bad("GSC: buildHead no longer receives the canonical path + title"); gscOk = false; }
if (!/JL\.sportsEventNode\(sm, matchAnswerSentence\(sm\)\.replace\(/.test(pagesSrc)) { bad("GSC: the SportsEvent JSON-LD description node changed"); gscOk = false; }
if (!/JL\.breadcrumbNode\(trail\)/.test(pagesSrc) || !/crumbHtml: M\.breadcrumbsHtml\(trail\)/.test(pagesSrc)) { bad("GSC: the breadcrumb node/render changed"); gscOk = false; }
if (!/<div class="answercard" id="answer">/.test(pagesSrc) || !/summary: whyBigHtml\(sm, ctx\)/.test(pagesSrc)) { bad("GSC: the answer-first answercard is no longer rendered inside the summary section"); gscOk = false; }
if (gscOk) ok("GSC surfaces intact: title ladder, desc funnel, canonical path, SportsEvent + Breadcrumb JSON-LD, answercard-in-summary — byte-for-byte");

// header/footer reuse: the shell still owns the global chrome + centered column
let shellOk = true;
if (!/<header id="topbar">/.test(shellSrc)) { bad("shell: the global header (#topbar) is gone from page-shell.ts"); shellOk = false; }
if (!/<footer class="pagesfoot" id="about">/.test(shellSrc)) { bad("shell: the global footer (.pagesfoot) is gone from page-shell.ts"); shellOk = false; }
if (!/<div class="page-col">/.test(shellSrc)) { bad("shell: the .page-col centered editorial container is gone"); shellOk = false; }
if (!/mainHtml: main/.test(pagesSrc) || !/pageShell\(\{/.test(pagesSrc)) { bad("shell: buildMatchPage no longer renders through pageShell(mainHtml)"); shellOk = false; }
if (shellOk) ok("shell: global header/footer + .page-col container reused via pageShell (no global redesign)");

// ---------- 4. the cost law: zero new data work ----------
let costOk = true;
if (/^\s*import (?!type )/m.test(mcSrc)) { bad("cost: match-centre.ts gained a RUNTIME import (S02 law: pure composition, type-only imports)"); costOk = false; }
if (/env\.STATE|\.get\(|\.put\(|fetch\(|addEventListener|setTimeout|setInterval|<script/i.test(mcSrc)) { bad("cost: match-centre.ts contains KV/fetch/DOM/timer code (zero new data work — render from ctx only)"); costOk = false; }
if (/STATE\.|KV_[A-Z]|cache:|_v\d|live_detail|standings_cache/.test(mcSrc)) { bad("cost: match-centre.ts references KV key vocabulary (no new reads)"); costOk = false; }
// buildMatchPage's awaits stay exactly the three pre-existing loads
const bpStart = pagesSrc.indexOf("export async function buildMatchPage");
const bpEnd = pagesSrc.indexOf("function dateGroupedRows", bpStart);
const bpSeg = pagesSrc.slice(bpStart, bpEnd > 0 ? bpEnd : bpStart + 12000);
for (const pre of ["await hydrateMatchVenue(", "await loadArchive(", "await fullByCodeFor("]) {
  if (!bpSeg.includes(pre)) { bad("cost: buildMatchPage lost the pre-existing load " + pre); costOk = false; }
}
if (/await env\.STATE|await fetch\(|await fetchJSON/.test(bpSeg)) { bad("cost: buildMatchPage gained a new await on KV/fetch"); costOk = false; }
const awaitCount = (bpSeg.match(/\bawait\b/g) || []).length;
if (awaitCount !== 3) { bad("cost: buildMatchPage's await count is " + awaitCount + " (expected exactly 3: hydrateMatchVenue, loadArchive, fullByCodeFor — the pre-existing loads)"); costOk = false; }
if (costOk) ok("cost law: pure-leaf composer (no runtime imports/KV/fetch/timers) + buildMatchPage awaits unchanged (hydrateMatchVenue, loadArchive, fullByCodeFor)");

// ---------- 5. harness co-evolution ----------
check(harnessSrc.indexOf('"seo/match-centre.ts"') > -1 && harnessSrc.indexOf('"seo/match-centre.ts"') > harnessSrc.indexOf('"api.ts"'),
  "harness: worker-src.js carries seo/match-centre.ts after api.ts (the seo group opens)");
const pkg = JSON.parse(read("package.json"));
check(String(pkg.scripts.test).includes("node scripts/check-match-centre.js"),
  "harness: package.json test chain runs check-match-centre.js");

if (failures) { console.error("\ncheck-match-centre: " + failures + " failure(s)"); process.exit(1); }
console.log("check-match-centre: all checks passed");
