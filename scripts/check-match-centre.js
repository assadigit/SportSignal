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
//   6. S03 FOUNDATION — the responsive/spacing/RTL layer: the page-shell
//      inline style block carries the mcentre foundation (section macro
//      rhythm + the .mcentre-cols two-column→one-column collapse utility),
//      scoped to the mcentre vocabulary, on the design system's own
//      600px/1080px breakpoints, logical properties only, no new tokens,
//      and the S02 wrapper stays attribute-only (S03 is CSS-only — the
//      page body is byte-identical).
//   7. S04 HERO (M2) — specification §5, decisions 7–10/85/91–99, Q4=A: the
//      hero MARKUP is owned by the composer (matchHeroHtml renders the
//      mcentre-hero section — the legacy pages.ts matchHeadHtml is retired
//      and pages.ts delegates via the matchHeroInput projection). Gated:
//      the competition header line above the teams; the balanced face-off
//      (home first = right under native RTL, away last, one shared side
//      shape, «میزبان»/«میهمان» labels, no side color coding); the central
//      scoreboard dominant across the three lifecycle states with the
//      exact legacy state gates; upcoming = kickoff time + the untouched
//      hidden .mcount mount (no new countdown dependency); live = score +
//      status + minute with no extra live apparatus; finished = score +
//      the «پایان بازی» status pill with NO scorer block (Q4=A — finished
//      scorers are not in the data pool); the inner aria-label «خلاصه بازی"
//      landmark preserved (S20 owns the a11y dedup); missing emblem/crest/
//      venue/round never render empty frames; the page-shell style block's
//      v13.81 hero presentation reworked in place (.mcentre-hero family)
//      on the block's own tokens, logical properties only, .mvenue-map and
//      the actions-row vocabulary untouched.
//   8. S05 PORTRAITS + TIMEZONE/DATE (M2) — specification §5 Player
//      portraits/Atmosphere/Date and time, decisions 7/8/85/93–95/99,
//      Q1=A: the both-or-neither portrait face-off (the shared heroArtSrv
//      coverage lookup — relocated verbatim to seo/data.ts, S05 — feeds the
//      projection; the composer re-enforces the law; the .mport atom rides
//      the .mc-port SSR vocabulary with a pure-DOM onerror that removes BOTH
//      portraits, no retry — decision 85); the kickoff line gains
//      «به وقت تهران» + the Latin UTC island (Q1=A — no new JS) and the date
//      line upgrades to the D1 full localized date (decision 95); the Tehran
//      midnight crossover runs the REAL seo/utils.ts helpers (transpiled
//      from source, never re-implemented); atmosphere (decision 99) is
//      CSS-only (zero new assets/requests).
//   9. S06 (M2) STICKY NAV + BACK-TO-TOP — Q9=B adaptive, Q10=C responsive,
//      Q11=A IntersectionObserver, Q12 back-to-top, Q13=A inline script (see
//      the section-9 assertions below for the full Q-mapping).
//  10. S07 (M3) SUMMARY & EDITORIAL SYSTEM — specification §5 + the S03
//      .mcentre-cols pairing grid (decisions 75–77): the summary MARKUP is
//      owned by the composer (matchSummaryHtml renders the mcentre-summary
//      inner content — the answer-first briefing card with id="answer"
//      preserved from the S02 answercard, the compact facts panel wrapping
//      the <table class="facts"> shape, the .mcentre-cols two-column briefing|
//      facts pairing at the 1080px wide threshold collapsing to one column
//      below it, and the finished result block below the pair); pages.ts
//      delegates via the MatchSummaryInput projection (the S04 hero precedent
//      — the composer stays the pure leaf). No <h2>«خلاصه» heading precedes
//      the briefing (spec §5: "No repeated Summary heading before briefing").
//      The answer sentence text (matchAnswerSentence) feeds the meta
//      description + the SportsEvent JSON-LD AND the visible briefing card —
//      one source of truth, byte-frozen. The facts rows' fullWhenHtml date
//      row stays byte-frozen inside its <td> (S05 decision 95). The nav's
//      adaptive Q9=B filter still detects a non-empty summary (the خلاصه nav
//      item renders). CSS logical properties only (RTL/LTR clean under a dir
//      flip — decision 2); the block's own icy/navy tokens, zero new
//      assets/requests.
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
if (!/import \{ matchCentreMain, matchHeroHtml, matchSummaryHtml, matchFormHtml, matchMetricsHtml, matchVenueHtml, matchScheduleHtml, matchFaqHtml, type MatchHeroInput, type MatchSummaryInput, type MatchFormInput, type MatchFormSideInput, type MatchFormResultRow, type MatchMetricsInput, type MatchMetricsSideInput, type MatchVenueInput, type MatchScheduleInput, type MatchScheduleDayGroup, type MatchScheduleRowInput, type MatchFaqInput, type MatchFaqItemInput \} from "\.\/match-centre";/.test(pagesSrc)) { bad("wiring: pages.ts lost the match-centre import (matchCentreMain + the S04 hero renderer matchHeroHtml + the S07 summary renderer matchSummaryHtml + the S12 form renderer matchFormHtml + the S13 metrics renderer matchMetricsHtml + the S14 venue renderer matchVenueHtml + the S14 schedule renderer matchScheduleHtml + the S16 FAQ renderer matchFaqHtml + the projection types)"); wiringOk = false; }
// S08: pages.ts imports the narrative engine (narrativeHtml + the lifecycle type).
if (!/import \{ narrativeHtml, type NarrativeLifecycle \} from "\.\/narrative";/.test(pagesSrc)) { bad("wiring: pages.ts lost the narrative engine import (narrativeHtml + NarrativeLifecycle — the S08 deterministic narrative engine)"); wiringOk = false; }
if (!/const main = matchCentreMain\(\{/.test(pagesSrc)) { bad("wiring: buildMatchPage no longer delegates its main assembly to matchCentreMain"); wiringOk = false; }
// Match Centre S04: the hero part is now the composer's matchHeroHtml render
// (from the matchHeroInput projection) + the unchanged actions row + script.
if (!/function matchHeroInput\(sm: SeoMatch\): MatchHeroInput \{/.test(pagesSrc)) { bad("wiring: the S04 hero data projection (matchHeroInput) is gone from pages.ts"); wiringOk = false; }
if (!/hero: matchHeroHtml\(heroInput\) \+ matchActionsHtml\(sm, path\) \+ matchHeadScript\(\)/.test(pagesSrc)) { bad("wiring: the hero part is no longer the S04 hero render + actions + script"); wiringOk = false; }
if (/function matchHeadHtml\(/.test(pagesSrc) || /class="matchhead"/.test(pagesSrc)) { bad("wiring: the legacy matchHeadHtml builder/marked-up still present after the S04 retirement"); wiringOk = false; }
// Match Centre S07: the summary part is now the composer's matchSummaryHtml
// render (from the MatchSummaryInput projection — the answer-first sentence +
// the facts rows + the finished result text). The legacy whyBigHtml + facts +
// resultBlock flat assembly is retired.
// Match Centre S08: whyBigHtml is RETIRED (replaced by the deterministic
// narrative engine in src/seo/narrative.ts). The summary projection GAINS the
// narrativeHtml atom (the engine's pre-built .mcentre-narrative element);
// pages.ts computes the lifecycle flag + calls narrativeHtml + passes the atom.
if (!/const summaryHtml = matchSummaryHtml\(\{/.test(pagesSrc)) { bad("wiring: the summary part no longer delegates to matchSummaryHtml (S07)"); wiringOk = false; }
if (!/answerHtml: esc\(matchAnswerSentence\(sm\)\)/.test(pagesSrc)) { bad("wiring: the summary answer atom no longer carries the answer-first sentence (the G-03 briefing copy — matchAnswerSentence, the same source that feeds the meta description + the JSON-LD)"); wiringOk = false; }
if (!/factsRows: rows\.map\(\(r\) => \(\{ label: esc\(r\[0\]\), valueHtml: r\[1\] \}\)\)/.test(pagesSrc)) { bad("wiring: the summary facts atoms no longer carry the facts rows array (label pre-escaped, valueHtml prebuilt — the fullWhenHtml date row rides byte-identical inside its <td>)"); wiringOk = false; }
if (!/const resultHtml = finished && m\.score && m\.score\.home != null/.test(pagesSrc)) { bad("wiring: the summary result atom no longer carries the finished result content (the h2 + the answer sentence — \"\" when not finished)"); wiringOk = false; }
// S08: the narrative lifecycle flag + the engine call + the atom wiring.
if (!/const narrativeLifecycle: NarrativeLifecycle = finished \? "finished" : \(live \? "live" : "upcoming"\)/.test(pagesSrc)) { bad("wiring: the S08 narrative lifecycle flag (finished/live/upcoming — the same gates the hero + the answer sentence use) is gone from buildMatchPage"); wiringOk = false; }
if (!/const narrativeAtomHtml = narrativeHtml\(sm, ctx, narrativeLifecycle\)/.test(pagesSrc)) { bad("wiring: buildMatchPage no longer calls the narrative engine (narrativeHtml — the S08 deterministic narrative)"); wiringOk = false; }
if (!/narrativeHtml: narrativeAtomHtml/.test(pagesSrc)) { bad("wiring: the summary projection no longer carries the narrative atom (narrativeHtml — the engine's pre-built .mcentre-narrative element, passed to the composer)"); wiringOk = false; }
// S08: whyBigHtml + its isTopTable helper are RETIRED (the engine subsumes both).
if (/export function whyBigHtml\(/.test(pagesSrc) || /function whyBigHtml\(/.test(pagesSrc)) { bad("wiring: the legacy whyBigHtml is still present (S08 retired it — the narrative engine in src/seo/narrative.ts replaces it)"); wiringOk = false; }
if (/function isTopTable\(/.test(pagesSrc)) { bad("wiring: the legacy isTopTable helper is still present (S08 retired it — the engine's topTableEligible replaces it)"); wiringOk = false; }
if (!/form: formPartHtml,/.test(pagesSrc)) { bad("wiring: the form part no longer carries the W/D/L strip (the S12 matchFormHtml render — S13 co-evolution: the form part is now the COMBINED formPartHtml = the form card + the S13 metrics card, decision S13-1)"); wiringOk = false; }
if (!/related: similarCard,/.test(pagesSrc)) { bad("wiring: the related part no longer carries the sibling-fixtures card"); wiringOk = false; }
if (!/footerHook: related/.test(pagesSrc)) { bad("wiring: the footer-hook part no longer carries the related-links card"); wiringOk = false; }
if (/matchHeadHtml\(sm\) \+ matchActionsHtml/.test(pagesSrc)) { bad("wiring: the old flat hero assembly is still present alongside the delegation"); wiringOk = false; }
if (wiringOk) ok("wiring: buildMatchPage delegates the parts to matchCentreMain — the hero rides matchHeroHtml(matchHeroInput) + actions/script (legacy matchHeadHtml retired); the summary rides matchSummaryHtml(MatchSummaryInput) — the answer-first sentence + facts rows + result text atoms + the S08 narrative atom (legacy whyBigHtml+facts+resultBlock flat assembly retired; whyBigHtml RETIRED by S08 — the deterministic narrative engine in src/seo/narrative.ts replaces it; the narrativeHtml atom rides ABOVE the briefing|facts pairing)");

// GSC measurement surfaces — byte-for-byte, still assembled in pages.ts
let gscOk = true;
if (!/let title = tCore \+ compFa \+ "، " \+ tDate \+ " \| اسپرت سیگنال";/.test(pagesSrc)) { bad("GSC: the <title> ladder entry point changed (Nov 6 title test runs until Dec 4)"); gscOk = false; }
if (!/let desc = matchAnswerSentence\(sm\)\.replace\(/.test(pagesSrc)) { bad("GSC: the meta-description funnel no longer starts from matchAnswerSentence"); gscOk = false; }
if (!/path,\n\s+title,/.test(pagesSrc) || !/head: buildHead\(\{/.test(pagesSrc)) { bad("GSC: buildHead no longer receives the canonical path + title"); gscOk = false; }
if (!/JL\.sportsEventNode\(sm, matchAnswerSentence\(sm\)\.replace\(/.test(pagesSrc)) { bad("GSC: the SportsEvent JSON-LD description node changed"); gscOk = false; }
if (!/JL\.breadcrumbNode\(trail\)/.test(pagesSrc) || !/crumbHtml: M\.breadcrumbsHtml\(trail\)/.test(pagesSrc)) { bad("GSC: the breadcrumb node/render changed"); gscOk = false; }
// S07: the answer-first briefing card (id="answer" — the G-03 anchor) now
// renders via the composer's matchSummaryHtml (the S04 hero precedent — the
// MARKUP moved to match-centre.ts). The TEXT source stays matchAnswerSentence
// (the same function that feeds the meta description + the SportsEvent JSON-LD
// — one source of truth, byte-frozen). The rendered briefing card carries
// id="answer" (verified via the REAL matchSummaryHtml output below in the S07
// group). S08 RETIRED whyBigHtml (the narrative engine in src/seo/narrative.ts
// replaces it); the source-inspection check here is the COMPOSER's contract
// (matchSummaryHtml renders id="answer"), not pages.ts's retired string.
if (!/id="answer"/.test(mcSrc) || !/mcentre-brief/.test(mcSrc)) { bad("GSC: the answer-first briefing card (id=\"answer\" — the G-03 anchor) is no longer rendered by the composer (matchSummaryHtml)"); gscOk = false; }
if (!/answerHtml: esc\(matchAnswerSentence\(sm\)\)/.test(pagesSrc)) { bad("GSC: the answer-first sentence (matchAnswerSentence — the meta-description + JSON-LD source) no longer feeds the visible briefing card atom"); gscOk = false; }
if (gscOk) ok("GSC surfaces intact: title ladder, desc funnel, canonical path, SportsEvent + Breadcrumb JSON-LD, answer-first briefing card (id=\"answer\" via the composer) — byte-for-byte");

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
// S08: the narrative engine (src/seo/narrative.ts) is a pure-logic module —
// zero AI/network calls, zero KV/fetch/timer/polling, zero new Image (the
// zero-runtime-cost law). It reads the SeoMatch fields already loaded by the
// three pre-existing awaits; its deterministicVariantIndex is a sync string
// hash (integer math, no crypto). The runtime imports it DOES carry (esc /
// compNameFa / normalizeTeamName / payloadTop3) are the SAME seo/* helpers
// pages.ts already imports — zero new dependency surface.
const narrSrc = read("src/seo/narrative.ts");
if (/fetch\(|XMLHttpRequest|new Image|setTimeout|setInterval|addEventListener|\.get\(|\.put\(|env\.STATE|env\.AI|AI\.run|generateText|chat\.completions/i.test(narrSrc)) { bad("cost: the narrative engine contains AI/network/KV/timer code (S08 zero-runtime-cost law — the engine reads from the SeoMatch fields already loaded; no AI, no network calls, no expensive per-match processing)"); costOk = false; }
// buildMatchPage's awaits stay exactly the three pre-existing loads
const bpStart = pagesSrc.indexOf("export async function buildMatchPage");
const bpEnd = pagesSrc.indexOf("function dateGroupedRows", bpStart);
const bpSeg = pagesSrc.slice(bpStart, bpEnd > 0 ? bpEnd : bpStart + 12000);
for (const pre of ["await hydrateMatchVenue(", "await loadArchive(", "await fullByCodeFor("]) {
  if (!bpSeg.includes(pre)) { bad("cost: buildMatchPage lost the pre-existing load " + pre); costOk = false; }
}
if (/await env\.STATE|await fetch\(|await fetchJSON/.test(bpSeg)) { bad("cost: buildMatchPage gained a new await on KV/fetch"); costOk = false; }
const awaitCount = (bpSeg.match(/\bawait\b/g) || []).length;
if (awaitCount !== 3) { bad("cost: buildMatchPage's await count is " + awaitCount + " (expected exactly 3: hydrateMatchVenue, loadArchive, fullByCodeFor — the pre-existing loads; the narrative engine adds ZERO awaits — it reads the already-loaded SeoMatch fields)"); costOk = false; }
if (costOk) ok("cost law: pure-leaf composer (no runtime imports/KV/fetch/timers) + the narrative engine (no AI/network/KV/timer) + buildMatchPage awaits unchanged (hydrateMatchVenue, loadArchive, fullByCodeFor — the narrative engine adds ZERO awaits)");

// ---------- 5. harness co-evolution ----------
check(harnessSrc.indexOf('"seo/match-centre.ts"') > -1 && harnessSrc.indexOf('"seo/match-centre.ts"') > harnessSrc.indexOf('"api.ts"'),
  "harness: worker-src.js carries seo/match-centre.ts after api.ts (the seo group opens)");
// S08: the narrative engine joins the concat after match-centre.ts (the seo group grows).
check(harnessSrc.indexOf('"seo/narrative.ts"') > -1 && harnessSrc.indexOf('"seo/narrative.ts"') > harnessSrc.indexOf('"seo/match-centre.ts"'),
  "harness: worker-src.js carries seo/narrative.ts after seo/match-centre.ts (the S08 narrative engine joins the seo group — the co-evolution law)");
const pkg = JSON.parse(read("package.json"));
check(String(pkg.scripts.test).includes("node scripts/check-match-centre.js"),
  "harness: package.json test chain runs check-match-centre.js");

// ---------- 6. S03 (M1): the responsive/spacing/RTL foundation ----------
// The foundation is a CSS-only extension of the page-shell's shared inline
// <style> block (the ADR-006 pattern: no asset renames, no sw.js bump). It
// is scoped to the mcentre vocabulary (id attribute selector + the
// .mcentre-cols class), so every other SEO page ships the bytes but never
// matches a rule — rendering unchanged by construction.
const styleStart = shellSrc.indexOf("<style>");
const styleEnd = shellSrc.indexOf("</style>", styleStart);
const styleBlock = styleStart >= 0 && styleEnd > styleStart ? shellSrc.slice(styleStart, styleEnd) : "";
const s03Idx = styleBlock.indexOf("Match Centre S03");
const s03 = s03Idx >= 0 ? styleBlock.slice(s03Idx) : "";
check(s03.length > 0,
  "S03: the page-shell style block carries the Match Centre foundation (marked 'Match Centre S03', after the S02 component styles)");
// (a) section rhythm — the macro rhythm lives ON the sections
check(s03.includes('section[id^="mcentre-"]+section[id^="mcentre-"]{margin-block-start:28px}'),
  "S03 rhythm: adjacent mcentre sections get macro spacing (28px = 2× the 14px card micro-rhythm; the rule WINS the collapsed chain — no double-spacing; first section stays flush with the h1 block)");
check(s03.includes('@media (max-width:600px){section[id^="mcentre-"]+section[id^="mcentre-"]{margin-block-start:20px}}'),
  "S03 rhythm: tighter at the design system's own 600px mobile breakpoint (28→20px, decision 78 adaptive spacing)");
// (b) the two-column→one-column collapse utility (spec §4, decisions 75–77)
check(s03.includes(".mcentre-cols{display:grid;grid-template-columns:minmax(0,1fr);gap:14px}"),
  "S03 collapse: the .mcentre-cols pairing grid is ONE column by default (601–1079px never squeeze a pair into the 760px page-col)");
check(s03.includes('@media (min-width:1080px){.mcentre-cols{grid-template-columns:repeat(2,minmax(0,1fr))}}'),
  "S03 collapse: two tracks ONLY at the 1080px wide threshold (.page-col widens 760→1400px there) — collapse relatively early, decision 77");
check(s03.includes(".mcentre-cols>*{min-width:0}"),
  "S03 collapse: min-width:0 grid children — long team names wrap (overflow-wrap), never blow out the tracks");
// (c) the breakpoint discipline: only the design system's own widths
const s03Medias = s03.match(/@media[^{]+/g) || [];
check(s03Medias.length === 2 && s03Medias.every((x) => /max-width:600px|min-width:1080px/.test(x)),
  "S03 breakpoints: exactly the design system's own two (600px rhythm tightening + 1080px cols pairing; public-13.87.css) — no invented widths (spec §4)");
// (d) the direction discipline: logical properties only
check(!/margin-left|margin-right|padding-left|padding-right|text-align:\s*(left|right)|\bleft:|\bright:|float:/.test(s03),
  "S03 RTL/LTR: CSS logical properties only (margin-block-start, minmax tracks) — the native-Persian RTL foundation mirrors cleanly under a dir flip (decision 2)");
// (e) the token discipline: spacing/structure only — no new colors or fonts
check(!/#[0-9a-fA-F]{3,8}\b|rgba?\(|hsl\(|font-family|font-size/.test(s03),
  "S03 tokens: no new colors, fonts or sizes — the foundation reuses the design system (spec §2: no new font/dependency)");
// (f) S03 is CSS-only: the S02 wrapper shape is unchanged (zero body bytes)
check(/return '<section id="' \+ def\.slot \+ '" aria-label="' \+ def\.label \+ '">' \+ inner \+ "<\/section>";/.test(mcSrc),
  "S03 is CSS-only: the S02 section wrapper stays attribute-only (id + aria-label, no class hook) — the whole S03 diff rides the <style> block, the body is byte-identical");

// ---------- 7. S04 (M2): the hero — identity and lifecycle ----------
// The hero markup is owned by the composer; every behavioral assertion below
// runs the REAL module (required above — never re-implemented).
const hSide = (name, crest) => ({ crestHtml: crest, nameHtml: '<span title="' + name + '">' + name + "</span>" });
const heroBase = {
  compHtml: '<a href="/competitions/premier-league">لیگ برتل انگلیس</a> · هفته ۱۲',
  home: hSide("آرسنال", '<img class="mcrest" src="https://x/a.png">'),
  away: hSide("دورتموند", '<span class="mcrest mcrest-mono" aria-hidden="true">د</span>'),
  kickTimeHtml: '<time datetime="2026-11-14T20:00:00Z">۲۳:۳۰</time>',
  kickDateHtml: "شنبه ۲۴ آبان (۱۴ نوامبر)",
  countHtml: '<div class="mcount" data-kickoff="2026-11-14T20:00:00Z" hidden></div>',
  venueHtml: '<a class="mvenue mvenue-map" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=x">🏟</a>'
};
const heroUpcoming = mc.matchHeroHtml({ ...heroBase, live: false, finished: false, scored: false, scoreTxt: "", liveTxt: "" });
const heroLive = mc.matchHeroHtml({ ...heroBase, live: true, finished: false, scored: true, scoreTxt: "۲ – ۱", liveTxt: "در جریان (۶۷ʹ)", countHtml: "" });
const heroFinished = mc.matchHeroHtml({ ...heroBase, live: false, finished: true, scored: true, scoreTxt: "۲ – ۱", liveTxt: "", countHtml: "" });

// (a) the composer contract: matchHeroHtml + the projection interfaces
check(typeof mc.matchHeroHtml === "function" && /export interface MatchHeroInput/.test(mcSrc) && /export interface MatchHeroSideInput/.test(mcSrc),
  "S04 contract: matchHeroHtml + MatchHeroInput/MatchHeroSideInput exported (the pre-escaped projection — the composer stays import-free)");

// (b) the hero landmark: the inner aria-label «خلاصه بازی» is PRESERVED
// (check-stats v13.81 lineage; the near-duplicate with the summary section
// stays until S20's a11y dedup).
const heroOpen = '<section class="mcentre-hero" aria-label="خلاصه بازی">';
check(heroUpcoming.startsWith(heroOpen) && heroLive.startsWith(heroOpen) && heroFinished.startsWith(heroOpen) && (heroUpcoming.match(/aria-label="خلاصه بازی"/g) || []).length === 1,
  "S04 landmark: the hero opens <section class=\"mcentre-hero\" aria-label=\"خلاصه بازی\"> — the pinned inner landmark survives the rework (S20 owns the dedup)");

// (c) competition header — the restrained line ABOVE the teams (decision 98)
const compIdx = (h) => h.indexOf('<div class="mcentre-hero-comp">');
const faceIdx = (h) => h.indexOf('<div class="mcentre-hero-face">');
check(heroUpcoming.indexOf('<span class="mchip"><a href="/competitions/premier-league">') > -1 && compIdx(heroUpcoming) > -1 && compIdx(heroUpcoming) < faceIdx(heroUpcoming) &&
  [heroLive, heroFinished].every((h) => compIdx(h) > -1 && compIdx(h) < faceIdx(h)),
  "S04 comp header: the .mchip line renders above the face-off in every state (compact, secondary to teams and score — decision 98)");

// (d) the balanced face-off: home FIRST (right under native Persian RTL),
// away LAST (left); one shared side shape — [portrait?, label, name, crest]
// (the optional portrait slot is S05 — it only ever renders on BOTH sides);
// the subtle role labels; no side-specific color/decoration (decision 96/97).
const sideRe = /<div class="mteam(?: away)?">(?:<img class="mport"[^>]*>)?<div class="mside-lbl">([^<]+)<\/div><div class="mname">[\s\S]*?<\/div>[\s\S]*?<\/div>/g;
function sidesOf(h) { const out = []; let m; sideRe.lastIndex = 0; while ((m = sideRe.exec(h)) !== null) out.push(m[1]); return out; }
check(JSON.stringify(sidesOf(heroUpcoming)) === JSON.stringify(["میزبان", "میهمان"]) &&
  heroUpcoming.indexOf('<div class="mteam"><div class="mside-lbl">میزبان</div>') < heroUpcoming.indexOf('<div class="mcenter">') &&
  heroUpcoming.indexOf('<div class="mcenter">') < heroUpcoming.indexOf('<div class="mteam away"><div class="mside-lbl">میهمان</div>') &&
  heroUpcoming.indexOf('mcrest-mono') > -1 && heroUpcoming.indexOf('class="mcrest"') > -1,
  "S04 face-off: home (میزبان, first → right in RTL) and away (میهمان, last → left) share one side shape — label, name, crest both visible; crest <img> and the mono fallback render");

// (e) lifecycle — upcoming: kickoff time near the scoreboard + the full date
// + the hidden .mcount mount preserved exactly (decision 92); no score/status.
check(heroUpcoming.includes('<div class="mkick"><time datetime="2026-11-14T20:00:00Z">۲۳:۳۰</time></div>') &&
  heroUpcoming.includes('<div class="mkickdate">شنبه ۲۴ آبان (۱۴ نوامبر)</div>') &&
  heroUpcoming.includes('<div class="mcount" data-kickoff="2026-11-14T20:00:00Z" hidden></div>') &&
  !/mscore|mlive|mfin/.test(heroUpcoming),
  "S04 upcoming: prominent kickoff time + full localized date + the untouched hidden-until-filled .mcount (no countdown dependency); no score/status invented");

// (f) lifecycle — live: score + status + minute in the hero; NO extra live
// apparatus (decision 90) and no countdown mount (the legacy gate, byte-faithful).
check(heroLive.includes('<div class="mscore" aria-label="در جریان">۲ – ۱</div>') &&
  heroLive.includes('<div class="mlive"><span class="mdot" aria-hidden="true"></span>در جریان (۶۷ʹ)</div>') &&
  !heroLive.includes("mcount") && !heroLive.includes("mfin") && heroLive.includes('<div class="mkickdate">'),
  "S04 live: score (aria-labelled) + the .mlive status with the retained minute — no live strip, event timeline, minute component or extra live statistics; no .mcount");

// (g) lifecycle — finished: the final score dominant + the clear «پایان بازی»
// status pill; NO scorer block (Q4=A — finished scorers are not in the data
// pool; nothing below the hero is invented) and no countdown.
check(heroFinished.includes('<div class="mscore">۲ – ۱</div>') &&
  heroFinished.includes('<div class="mfin">پایان بازی</div>') &&
  !heroFinished.includes("mcount") && !heroFinished.includes("mlive") &&
  !/گلزن|scorer/.test(heroFinished),
  "S04 finished: final score + the «پایان بازی» status pill; NO scorer block ever renders (Q4=A) and no countdown");

// (h) same core identity across the three states (decision 10): the comp
// header + face-off + center column + date + venue ride every state.
check([heroUpcoming, heroLive, heroFinished].every((h) =>
  h.startsWith(heroOpen) && compIdx(h) < faceIdx(h) && h.includes('<div class="mcenter">') && h.includes('<div class="mkickdate">') && h.includes("mvenue-map")),
  "S04 identity: the same hero framework across upcoming/live/finished (comp header, face-off, central scoreboard, date, venue)");

// (i) missing-data states — never an empty frame, never an invented fact:
// missing emblem → no <img> in the chip; missing venue → no .mvenue element;
// unscored (missing score) → the kickoff-time branch, no empty .mscore.
const heroNoEmblem = mc.matchHeroHtml({ ...heroBase, compHtml: '<a href="/competitions/pl">لیگ برتل</a>', live: false, finished: false, scored: false, scoreTxt: "", liveTxt: "" });
const heroNoVenue = mc.matchHeroHtml({ ...heroBase, venueHtml: "", live: true, finished: false, scored: true, scoreTxt: "۱ – ۱", liveTxt: "در جریان" });
const chipSeg = heroNoEmblem.slice(compIdx(heroNoEmblem), faceIdx(heroNoEmblem));
check(!chipSeg.includes("<img") && chipSeg.includes('<span class="mchip"><a href="/competitions/pl">') &&
  !heroNoVenue.includes("mvenue") && heroNoVenue.includes('<div class="mscore" aria-label="در جریان">۱ – ۱</div>'),
  "S04 missing-data: emblem-less chip renders link-only (no empty image frame); venue-less hero drops the .mvenue element entirely");

// (j) the page-shell S04 presentation: the v13.81 hero block reworked in
// place — the container family, the dominant scoreboard scale, the finished
// pill, the retired .mkicksub; the shared .mvenue-map/.mact vocabulary and
// the .mdot reduced-motion guard untouched.
check(shellSrc.includes(".mcentre-hero{background:radial-gradient(130% 100% at 50% -25%,rgba(56,132,255,.13),rgba(56,132,255,0) 55%),linear-gradient(160deg,rgba(56,132,255,.10),rgba(56,132,255,.03) 55%,rgba(148,163,184,.05));border:1px solid rgba(94,160,255,.28);border-radius:18px;") &&
  shellSrc.includes(".mcentre-hero-comp{display:flex;justify-content:center;padding-block-end:12px}") &&
  shellSrc.includes(".mcentre-hero-face{display:grid;grid-template-columns:1fr minmax(150px,auto) 1fr;align-items:center;gap:10px}"),
  "S04 CSS: the .mcentre-hero container carries the v13.81 card treatment byte-for-byte (no new colors) + the comp line + the three-track face-off grid");
check(shellSrc.includes(".mscore{font-size:clamp(2.1rem,6vw,3.1rem);font-weight:800;") &&
  shellSrc.includes(".mkick{font-size:clamp(2rem,5.5vw,2.9rem);font-weight:800;") &&
  shellSrc.includes(".mfin{display:inline-flex;align-items:center;gap:7px;font-size:.84rem;font-weight:700;color:#7dd3fc;background:rgba(125,211,252,.10);border:1px solid rgba(125,211,252,.28);border-radius:999px;padding:3px 12px}") &&
  !/\.mkicksub\{/.test(shellSrc),
  "S04 CSS: dominant display numerals (.mscore/.mkick tiers) + the .fin «پایان بازی» pill in the block's own sky family; the .mkicksub rule retired (only the comment that documents the retirement remains)");
check(/@media \(max-width:560px\)\{\.mcentre-hero\{padding:14px 8px\}\.mcentre-hero-comp\{padding-block-end:8px\}\.mcentre-hero-face\{grid-template-columns:1fr 1fr;grid-template-areas:"home away" "center center"\}/.test(shellSrc) &&
  shellSrc.includes('.mcenter{grid-area:center;margin-block-start:8px}') && shellSrc.includes(".mcrest{width:48px;height:48px}") &&
  /@media \(prefers-reduced-motion:reduce\)\{\.mdot\{animation:none\}\}/.test(shellSrc) &&
  /a\.mvenue-map\{/.test(shellSrc) && /\.mact\{/.test(shellSrc) && /\.mactions\{/.test(shellSrc),
  "S04 CSS: the 560px stacking (home|away row, center below) co-evolved to the new selectors, logical properties; .mdot reduced-motion + the shared .mvenue-map/.mact vocabulary untouched");
// (k) the S04-touched selectors use CSS logical properties only — no physical
// left/right anywhere in the new container/comp/face/stacking rules.
const s04Lines = (shellSrc.match(/\.mcentre-hero\{[^}]*\}|\.mcentre-hero-comp\{[^}]*\}|\.mcentre-hero-face\{[^}]*\}|@media \(max-width:560px\)\{\.mcentre-hero\{[^}]*\}\.mcentre-hero-comp\{[^}]*\}\.mcentre-hero-face\{[^}]*\}\.mteam\{grid-area:home\}\.mteam\.away\{grid-area:away\}\.mcenter\{[^}]*\}\.mcrest\{[^}]*\}(?:\.mport\{[^}]*\})?\}/g) || []).join("");
check(s04Lines.length > 0 && !/margin-left|margin-right|padding-left|padding-right|text-align:\s*(left|right)|\bleft:|\bright:|float:/.test(s04Lines),
  "S04 RTL/LTR: the S04-touched hero rules are logical-property-only — the native-Persian RTL hero mirrors cleanly under a dir flip (decision 2)");

// ---------- 8. S05 (M2): portraits, timezone and date ----------
// The both-or-neither face-off + the Q1=A Tehran/UTC kickoff atoms. The
// portrait atoms below are PREBUILT exactly the way pages.ts's projection
// builds them (the composer never escapes); the crossover assertions run
// the REAL seo/utils.ts helpers transpiled from source.
const s05Port = (src) => '<img class="mport" src="' + src + '" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" width="88" height="88" ' +
  "onerror=\"var h=this.closest('.mcentre-hero');if(h)h.querySelectorAll('.mport').forEach(function(x){x.remove()})\">";
const heroPorts = mc.matchHeroHtml({ ...heroBase, home: { ...heroBase.home, portraitHtml: s05Port("/players/hero/christian-pulisic.webp") }, away: { ...heroBase.away, portraitHtml: s05Port("/players/hero/franck-rijkaard.webp") }, live: false, finished: false, scored: false, scoreTxt: "", liveTxt: "" });
const portImgs = heroPorts.match(/<img class="mport"[^>]*>/g) || [];

// (a) the contract: the optional portraitHtml atom on the side input
check(/portraitHtml\?: string; \/\/ <img class="mport"> hero portrait — prebuilt \(S05, both-or-neither\)/.test(mcSrc) &&
  /const ports = h\.home\.portraitHtml && h\.away\.portraitHtml;/.test(mcSrc) &&
  /heroSideHtml\(h\.home, MC_HERO_HOME_LABEL, "", homePort\)/.test(mcSrc) &&
  /heroSideHtml\(h\.away, MC_HERO_AWAY_LABEL, "away", awayPort\)/.test(mcSrc),
  "S05 contract: MatchHeroSideInput gains the optional portraitHtml atom; matchHeroHtml resolves BOTH sides before either side renders (one shared side builder, one DOM shape)");

// (b) both portraits render at the TOP of their side columns — home side
// (right under RTL) portrait before the «میزبان» label, away side (left)
// portrait after the center column, before the «میهمان» label; on mobile
// the 560px grid areas keep the pair side-by-side ABOVE the scoreboard.
check(portImgs.length === 2 &&
  heroPorts.indexOf(portImgs[0]) < heroPorts.indexOf('<div class="mside-lbl">میزبان</div>') &&
  heroPorts.indexOf(portImgs[1]) > heroPorts.indexOf('<div class="mcenter">') &&
  heroPorts.indexOf(portImgs[1]) < heroPorts.indexOf('<div class="mside-lbl">میهمان</div>') &&
  heroPorts.indexOf(portImgs[0]) < heroPorts.indexOf(portImgs[1]),
  "S05 portraits: both atoms render — home portrait tops the home column (right under RTL), away portrait tops the away column (left); side-by-side above the scoreboard at ≤560px (decision 8)");
check(portImgs.every((t) => t.includes('alt=""') && t.includes('loading="lazy"') && t.includes('decoding="async"') && t.includes('referrerpolicy="no-referrer"') && /width="88" height="88"/.test(t)),
  "S05 portraits: every .mport img rides the .mc-port SSR vocabulary (lazy + async + no-referrer; decorative alt=\"\" — the names sit directly below; fixed width/height = CLS-neutral)");
check(portImgs.every((t) => /onerror="var h=this\.closest\('\.mcentre-hero'\);if\(h\)h\.querySelectorAll\('\.mport'\)\.forEach\(function\(x\)\{x\.remove\(\)\}\)"/.test(t)) &&
  !/fetch\(|setTimeout|setInterval|XMLHttpRequest|new Image/.test(portImgs.join("")),
  "S05 fallback (decision 85): the onerror is a PURE DOM walk — BOTH portraits removed when either fails, restoring the S04 no-portrait scoreboard exactly; no retry, no fetch, no timer");

// (c) both-or-neither — the composer's independent enforcement
const heroOnePort = mc.matchHeroHtml({ ...heroBase, home: { ...heroBase.home, portraitHtml: s05Port("/players/hero/christian-pulisic.webp") }, live: false, finished: false, scored: false, scoreTxt: "", liveTxt: "" });
check(!heroOnePort.includes("mport") && !heroUpcoming.includes("mport") && !heroLive.includes("mport") && !heroFinished.includes("mport"),
  "S05 both-or-neither (decisions 7/8): a ONE-sided portraitHtml renders NO portrait at all — never half a face-off; the no-coverage hero keeps the exact S04 shape (label → name → crest)");

// (d) the projection pins — pages.ts computes the atoms (the composer stays
// the pure leaf; heroArtSrv is the SHARED data-layer lookup, S05-relocated)
check(/, heroArtSrv \} from "\.\/data";/.test(pagesSrc),
  "S05 wiring: pages.ts imports heroArtSrv from ./data (the shared lookup — relocated verbatim from seo/router.ts; no router→pages cycle)");
check(/const hArt = heroArtSrv\(m\.homeTeam\);/.test(pagesSrc) && /const aArt = heroArtSrv\(m\.awayTeam\);/.test(pagesSrc) &&
  /const ports = hArt && aArt \? \{ h: portraitHtml\(hArt\), a: portraitHtml\(aArt\) \} : null;/.test(pagesSrc) &&
  /portraitHtml: ports \? ports\.h : ""/.test(pagesSrc) && /portraitHtml: ports \? ports\.a : ""/.test(pagesSrc),
  "S05 projection: BOTH sides resolve through heroArtSrv before either atom is built (both-or-neither at the data layer too — one covered side alone renders nothing)");

// (e) the Q1=A kickoff atoms — Tehran wall clock + the display-TZ label +
// the Latin UTC island; the D1 full localized date; the frozen surfaces
// (h1 D2, facts-table fullWhenHtml) untouched.
check(/kickTimeHtml: '<time datetime="' \+ esc\(m\.utcDate\) \+ '">' \+ toFaDigits\(faTime\(m\.utcDate\)\) \+ '<\/time> <span class="tznote">' \+ esc\(SEO\.DISPLAY_TZ_LABEL\) \+ '<\/span> <span class="utcnote" dir="ltr">' \+ esc\(m\.utcDate\.slice\(11, 16\) \+ " UTC"\) \+ "<\/span>"/.test(pagesSrc),
  "S05 kickoff (Q1=A, decisions 93/94): the prominent Tehran time + «به وقت تهران» + the Latin «… UTC» island (fullWhenHtml's tznote/utcnote vocabulary; <time datetime> stays Gregorian ISO — SS-27; no new JS)");
check(/kickDateHtml: esc\(faDateD1\(m\.utcDate\)\),/.test(pagesSrc) &&
  /const h1 = faName\(m\.homeTeam\) \+ " – " \+ faName\(m\.awayTeam\) \+ " \| " \+ compFa \+ "، " \+ faDateD2\(m\.utcDate\);/.test(pagesSrc) &&
  /rows\.push\(\["تاریخ", M\.fullWhenHtml\(m\.utcDate\)\]\);/.test(pagesSrc),
  "S05 date (decision 95): the hero date line is the D1 full localized date; the h1's compact D2 and the facts table's fullWhenHtml stay byte-frozen (the S1/S2 GSC measurement surfaces)");

// (f) the midnight crossover + numeral formatting — the REAL seo/utils.ts
// helpers (tehranParts/faTime/faDateD1), transpiled from source — never
// re-implemented. 20:30Z crosses the Tehran calendar day (00:00 next day).
function s05DateHelpers() {
  const ts = require(path.join(root, "node_modules", "typescript"));
  const extract = (rel, stubs, ret) => {
    const src = fs.readFileSync(path.join(root, rel), "utf8")
      .replace(/^import\s+[^;]+;\n?/gm, "").replace(/^export\s+/gm, "");
    const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.None, target: "ES2020" } }).outputText;
    return new Function(...Object.keys(stubs), js + "\nreturn " + ret + ";")(...Object.values(stubs));
  };
  const toFaDigits = extract("src/utils.ts", {}, "(typeof toFaDigits==='function')?toFaDigits:null");
  return extract("src/seo/utils.ts", { SEO: { DISPLAY_TZ: "Asia/Tehran" }, toFaDigits }, "({tehranParts,faTime,faDateD1})");
}
const D = s05DateHelpers();
check(D.faTime("2026-11-14T20:30:00Z") === "۰۰:۰۰" && D.faDateD1("2026-11-14T20:30:00Z") === "یکشنبه ۲۴ آبان ۱۴۰۵ (۱۵ نوامبر ۲۰۲۶)",
  "S05 midnight crossover (the REAL helpers): a 20:30Z kickoff crosses the Tehran calendar day — the hero reads ۰۰:۰۰ and the FULL date carries the NEXT Tehran day (۲۴ آبان / ۱۵ نوامبر) while the UTC note keeps the Latin 20:30 UTC (decisions 93–95, Q1=A; decision 94: 24-hour Persian numerals)");
check(D.faTime("2026-11-14T17:00:00Z") === "۲۰:۳۰" && D.faDateD1("2026-11-14T17:00:00Z") === "شنبه ۲۳ آبان ۱۴۰۵ (۱۴ نوامبر ۲۰۲۶)",
  "S05 same-day sanity (the REAL helpers): a 17:00Z kickoff stays on the SAME Tehran calendar day — ۲۰:۳۰، شنبه ۲۳ آبان ۱۴۰۵ (۱۴ نوامبر ۲۰۲۶)");

// (g) the S05 CSS — the portrait frame, the .mkick-scoped notes, the
// atmosphere layer (decision 99), the 560px co-evolution, logical props.
check(shellSrc.includes(".mport{width:88px;height:88px;border-radius:50%;object-fit:cover;object-position:center 18%;background:rgba(2,8,23,.45);border:1px solid rgba(94,160,255,.30);box-shadow:0 6px 18px rgba(2,8,23,.45)}") &&
  /@media \(max-width:560px\)\{[\s\S]*?\.mcrest\{width:48px;height:48px\}\.mport\{width:64px;height:64px\}\}/.test(shellSrc),
  "S05 CSS: the circular .mport frame (88px desktop / 64px ≤560px — crest-adjacent sizing, one shared shape; dark navy backing + icy ring = the restrained stadium depth, decision 99)");
check(shellSrc.includes(".mkick .tznote{font-size:.8rem;font-weight:600;color:var(--muted,#9aa4b2)}") &&
  shellSrc.includes(".mkick .utcnote{font-size:.74rem;font-weight:600;color:var(--muted,#9aa4b2);font-variant-numeric:tabular-nums}") &&
  (shellSrc.match(/\.tznote\{/g) || []).length === 1 && (shellSrc.match(/\.utcnote\{/g) || []).length === 1 &&
  shellSrc.includes(".mkickdate{line-height:1.8}"),
  "S05 CSS: the kickoff notes are .mkick-SCOPED (exactly one .tznote/.utcnote rule each — the facts table's fullWhenHtml spans keep their inherited size) and the D1 date line wraps without truncation");
check(shellSrc.includes(".mcentre-hero{background:radial-gradient(130% 100% at 50% -25%,rgba(56,132,255,.13),rgba(56,132,255,0) 55%),linear-gradient(160deg,rgba(56,132,255,.10),rgba(56,132,255,.03) 55%,rgba(148,163,184,.05));"),
  "S05 CSS (decision 99): the restrained stadium light-wash layers ABOVE the S04 gradient — the block's own icy/navy tokens, zero new assets, zero new requests; the foreground hierarchy (names, crests, score) stays dominant");
const s05Rules = (shellSrc.match(/\.mport\{[^}]*\}|\.mkick \.tznote\{[^}]*\}|\.mkick \.utcnote\{[^}]*\}|\.mkickdate\{line-height:1\.8\}/g) || []).join("");
check(s05Rules.length > 0 && !/margin-left|margin-right|padding-left|padding-right|\bleft:|\bright:|float:/.test(s05Rules),
  "S05 RTL/LTR: the S05-touched rules are physical-property-free — the portrait order comes from the DOM (home first = right under native RTL), so a deliberate LTR mirror stays clean (decision 2)");

// ---------- 9. S06 (M2): sticky section nav + back-to-top ----------
// Q9=B adaptive (only present sections), Q10=C responsive (desktop sticky
// top / mobile fixed bottom), Q11=A IntersectionObserver, Q12 back-to-top
// (hero-out-of-view threshold, logical-property placement, reduced-motion),
// Q13=A inline script (no bundle/SW bump). The composer stays pure — the
// nav part arrives prebuilt, the composer only wraps it in mcentre-nav.

// (a) the contract: MC_NAV_DESTS + matchNavHtml + matchNavScript in pages.ts
check(/const MC_NAV_DESTS: \{ id: string; label: string \}\[\]/.test(pagesSrc) &&
  /function matchNavHtml\(/.test(pagesSrc) && /function matchNavScript\(/.test(pagesSrc),
  "S06 contract: pages.ts defines MC_NAV_DESTS + matchNavHtml + matchNavScript (the nav part builder + its inline script)");

// (b) wiring: buildMatchPage passes nav: navHtml (the mcentre-nav slot fills)
check(/const navHtml = matchNavHtml\(/.test(pagesSrc) && /nav: navHtml,/.test(pagesSrc),
  "S06 wiring: buildMatchPage extracts summaryHtml + builds navHtml + passes nav: navHtml to matchCentreMain (the mcentre-nav slot fills — no contract change, the slot + MatchCentreParts.nav? exist since S02)");

// (c) Q9=B adaptive: only present sections render a nav item
check(/MC_NAV_DESTS\.filter\(/.test(pagesSrc) && /html && html\.trim\(\)\.length > 0/.test(pagesSrc),
  "S06 adaptive (Q9=B): matchNavHtml filters MC_NAV_DESTS by non-empty part content — only present sections render a nav item (no broken anchors to not-yet-built sections; the nav grows as S10/S14/S15 ship)");

// (d) the five spec destinations (decisions 11/13) in page order
check(/\{ id: "mcentre-summary", label: "خلاصه" \}/.test(pagesSrc) &&
  /\{ id: "mcentre-standings", label: "جدول" \}/.test(pagesSrc) &&
  /\{ id: "mcentre-form", label: "فرم" \}/.test(pagesSrc) &&
  /\{ id: "mcentre-schedule", label: "بازی‌ها" \}/.test(pagesSrc) &&
  /\{ id: "mcentre-venue", label: "ورزشگاه" \}/.test(pagesSrc),
  "S06 destinations: the five spec §3 nav targets (خلاصه/جدول/فرم/بازی‌ها/ورزشگاه — decisions 11/13) registered in page order");

// (e) the nav item shape — href + data-target (the observer + click driver)
check(/'<a class="mnav-item" href="#' \+ d\.id \+ '" data-target="' \+ d\.id \+ '">' \+ esc\(d\.label\) \+ '<\/a>'/.test(pagesSrc),
  "S06 nav item: each item is <a class=\"mnav-item\" href=\"#mcentre-X\" data-target=\"mcentre-X\">LABEL</a> — the data-target drives the IntersectionObserver + the click handler");

// (f) Q12 back-to-top: the button + the decorative chevron SVG, hidden initially
check(pagesSrc.includes('<button class="mtop" type="button" aria-label="بازگشت به بالا" hidden>') &&
  pagesSrc.includes('<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">'),
  "S06 back-to-top (Q12): a <button class=\"mtop\" aria-label=\"بازگشت به بالا\" hidden> + a decorative chevron SVG (aria-hidden, focusable=false) — hidden until the hero leaves the viewport");

// (g) Q11=A + Q13=A + cost law: the inline script (IntersectionObserver,
//     DOMContentLoaded guard, scrollIntoView/scrollTo, reduced-motion) —
//     pure DOM, no fetch/timer/polling. Extract the matchNavScript body to
//     scope the cost-law check (matchHeadScript carries setTimeout elsewhere).
var navFnStart = pagesSrc.indexOf("function matchNavScript");
var navFnEnd = pagesSrc.indexOf("function matchActionsHtml", navFnStart);
var navFnSrc = navFnStart >= 0 && navFnEnd > navFnStart ? pagesSrc.slice(navFnStart, navFnEnd) : "";
check(navFnSrc.length > 0 && /IntersectionObserver/.test(navFnSrc) && /rootMargin:'-20% 0px -60% 0px'/.test(navFnSrc),
  "S06 active tracking (Q11=A): the inline script uses IntersectionObserver with a -20%/-60% rootMargin (the active-reading zone) — no main-thread scroll thrash");
check(navFnSrc.length > 0 && /document\.readyState==='loading'/.test(navFnSrc) && /DOMContentLoaded/.test(navFnSrc),
  "S06 script guard: DOMContentLoaded — the target sections render after the mcentre-nav section in registry order, so the observer setup waits for the full DOM");
check(navFnSrc.length > 0 && /scrollIntoView\(\{behavior:reduce\?'auto':'smooth',block:'start'\}\)/.test(navFnSrc) && /window\.scrollTo\(\{top:0,behavior:reduce\?'auto':'smooth'\}\)/.test(navFnSrc),
  "S06 scroll (Q12): nav-item click → scrollIntoView (the CSS scroll-margin-top offsets the sticky bar); back-to-top → scrollTo(0); reduced-motion = instant (behavior:'auto')");
check(navFnSrc.length > 0 && !/fetch\(|setInterval|setTimeout|XMLHttpRequest|new Image/.test(navFnSrc),
  "S06 cost law (Q13=A): the inline nav script is pure DOM — no fetch/timer/polling/new Image (rides the mcentre-nav part like the S04 countdown script; no public-*.js bundle rename, no SW cache bump — ADR-006)");

// (h) composer purity: match-centre.ts carries NO nav/observer/script code
check(!/matchNavHtml|matchNavScript|IntersectionObserver|\.mnav\b|\.mtop\b/.test(mcSrc),
  "S06 purity: the composer (match-centre.ts) carries zero nav/observer/script code — the nav part arrives prebuilt from pages.ts, the composer only wraps it in the mcentre-nav anchor (the S02 pure leaf holds)");

// (i) the S06 CSS — sticky/fixed nav, active state, back-to-top, responsive,
//     scroll-margin-top, reduced-motion, logical properties only.
check(shellSrc.includes(".mnav{position:sticky;top:0;z-index:50;") &&
  shellSrc.includes(".mnav-item{display:inline-block;") &&
  shellSrc.includes(".mnav-item.is-active{color:#7dd3fc;"),
  "S06 CSS nav (Q10=C desktop): .mnav sticky-top + .mnav-item + .is-active — the active destination highlights in the sky family");
check(shellSrc.includes(".mtop{position:fixed;inset-block-end:1rem;inset-inline-end:1rem;") &&
  shellSrc.includes(".mtop[hidden]{display:none}"),
  "S06 CSS back-to-top (Q12): .mtop fixed bottom-end (inset-block-end + inset-inline-end — logical properties, RTL/LTR clean), [hidden] removes it from layout + a11y tree");
check(/@media \(min-width:601px\)\{section\[id\^="mcentre-"\]\{scroll-margin-top:48px\}\}/.test(shellSrc),
  "S06 CSS offset: desktop (≥601px) scroll-margin-top:48px on mcentre-* sections — a clicked destination clears the sticky nav (mobile bottom nav needs no top offset)");
// S06 desktop sticky-persistence fix: the composer wraps the nav part in
// <section id="mcentre-nav">, whose height equals .mnav's own (~48px) — that
// gave .mnav{position:sticky;top:0} ZERO sticking range (the nav scrolled
// away the instant its 48px section passed the viewport top; a 48px empty
// gap on a non-adjacent click where the sticky bar should be). The fix
// dissolves the section's BOX on desktop (display:contents) so .mnav's
// containing block becomes .page-col (the grandparent — spans the whole
// match page): the sticky nav persists at top:0 across ALL sections (Q10=C
// desktop sticky-top, analogous to the mobile fixed-bottom). The element
// stays in the DOM (id anchor + aria-label landmark + getElementById all
// intact) — only its box vanishes. Mobile (≤600px) is unaffected (.mnav is
// position:fixed there). This source-inspection assertion defeats the
// 48px-wrapper defect at the rule level (the runtime persistence is the
// agent-browser smoke's job — the documented S06 gap was that the source
// checks never covered the layout/DOM-structure concern).
check(/@media \(min-width:601px\)\{#mcentre-nav\{display:contents\}\}/.test(shellSrc),
  "S06 sticky persistence (desktop fix): @media(min-width:601px){#mcentre-nav{display:contents}} dissolves the 48px section wrapper so .mnav's containing block spans .page-col — the sticky nav persists at viewport top:0 across all sections (defeats the zero-sticking-range defect; Q10=C desktop sticky-top, analogous to the mobile fixed-bottom)");
check(/@media \(max-width:600px\)\{\.mnav\{position:fixed;inset-block-end:0;inset-inline:0;top:auto/.test(shellSrc) &&
  shellSrc.includes(".mtop{inset-block-end:calc(60px + .5rem)}"),
  "S06 CSS responsive (Q10=C mobile): ≤600px the nav becomes a fixed bottom tab-bar (inset-block-end:0, inset-inline:0, space-around) and .mtop rises above it (calc(60px + .5rem)) — thumb-reachable, no overlap");
check(/@media \(prefers-reduced-motion:reduce\)\{\.mnav-item\{transition:none\}\.mtop\{transition:none\}\}/.test(shellSrc),
  "S06 CSS reduced-motion: the nav-item + back-to-top transitions are disabled under prefers-reduced-motion (decision: instant, no smooth)");
var s06Rules = (shellSrc.match(/\.mnav\{[^}]*\}|\.mnav-item\{[^}]*\}|\.mnav-item\.is-active\{[^}]*\}|\.mnav-item:hover\{[^}]*\}|\.mtop\{[^}]*\}|\.mtop:hover\{[^}]*\}|\.mtop\[hidden\]\{[^}]*\}/g) || []).join("");
check(s06Rules.length > 0 && !/margin-left|margin-right|padding-left|padding-right|\bleft:|\bright:|float:/.test(s06Rules),
  "S06 RTL/LTR: the S06 nav + back-to-top rules are physical-property-free (inset-block-end/inset-inline-end/inset-inline only — top:0 is vertical, doesn't flip under RTL) — the native-Persian RTL nav mirrors cleanly under a dir flip (decision 2)");

// ---------- 10. S07 (M3): the summary & editorial system ----------
// specification §5 (M3/S07) + the S03 .mcentre-cols pairing grid (decisions
// 75–77). The summary MARKUP is owned by the composer (matchSummaryHtml renders
// the mcentre-summary inner content — the editorial briefing card + the compact
// facts panel + the .mcentre-cols two-column pairing + the finished result
// block); pages.ts delegates via the MatchSummaryInput projection (the S04 hero
// precedent — the composer stays the pure leaf). Every behavioral assertion
// below runs the REAL module (required above — never re-implemented).

// (a) the contract: matchSummaryHtml + MatchSummaryInput/MatchFactRow exported
check(typeof mc.matchSummaryHtml === "function" &&
  /export interface MatchSummaryInput/.test(mcSrc) &&
  /export interface MatchFactRow/.test(mcSrc),
  "S07 contract: matchSummaryHtml + MatchSummaryInput/MatchFactRow exported (the pre-escaped projection — the composer stays import-free, the S04 hero precedent)");

// (b) the briefing card — id="answer" preserved (the G-03 anchor carried from
// the S02 answercard); the .mcentre-card.mcentre-brief shell; the answer
// sentence text rides inside (pre-escaped by the projection). Verified via the
// REAL matchSummaryHtml output (not just source inspection).
const s07Brief = mc.matchSummaryHtml({
  answerHtml: "آرسنال میزبان دورتموند است؛ این بازی شنبه ۲۴ آبان ۱۴۰۵ ساعت ۲۳:۳۰ به وقت تهران برگزار می‌شود.",
  factsRows: [],
  resultHtml: ""
});
check(s07Brief.includes('<div class="mcentre-card mcentre-brief" id="answer">') &&
  s07Brief.includes("آرسنال میزبان دورتموند است") &&
  !s07Brief.includes("mcentre-facts") && !s07Brief.includes("mcentre-result") && !s07Brief.includes("mcentre-cols"),
  "S07 briefing card: the answer-first card carries id=\"answer\" (the G-03 anchor) + the .mcentre-card.mcentre-brief shell + the pre-escaped answer sentence; with no facts/result atoms the pairing grid + the result block are OMITTED (no lone .mcentre-cols wrapper for a single child)");

// (c) the facts panel — wraps the <table class="facts"> shape (the caption +
// the <th scope="row">/<td> rows with their border dividers); the fullWhenHtml
// date row rides byte-identical inside its <td> (S05 decision 95 frozen). The
// caption is the composer constant MC_SUMMARY_FACTS_CAPTION («مشخصات بازی»).
const s07FactsRow = { label: "تاریخ", valueHtml: '<time datetime="2026-11-14T20:00:00Z">شنبه ۲۴ آبان ۱۴۰۵ (۱۵ نوامبر ۲۰۲۶)</time> <span class="tznote">به وقت تهران</span>' };
const s07Facts = mc.matchSummaryHtml({ answerHtml: "", factsRows: [s07FactsRow], resultHtml: "" });
check(s07Facts.includes('<div class="mcentre-facts"><table class="facts"><caption>مشخصات بازی</caption><tbody>') &&
  s07Facts.includes('<tr><th scope="row">تاریخ</th><td><time datetime="2026-11-14T20:00:00Z">شنبه ۲۴ آبان ۱۴۰۵ (۱۵ نوامبر ۲۰۲۶)</time>') &&
  !s07Facts.includes("mcentre-brief") && !s07Facts.includes("mcentre-cols"),
  "S07 facts panel: the .mcentre-facts panel wraps the <table class=\"facts\"> shape byte-identically (caption «مشخصات بازی» + <th scope=\"row\">/<td> rows); the fullWhenHtml date row rides inside its <td> untouched (S05 decision 95 frozen); with no answer atom the briefing card + the pairing grid are OMITTED");

// (d) the two-column pairing — briefing | facts wrapped in .mcentre-cols when
// BOTH atoms are present (briefing FIRST = right under native Persian RTL at
// the wide threshold; first on mobile when collapsed to one column). The S03
// .mcentre-cols utility (page-shell.ts) carries the 1080px collapse. When only
// one atom is present, the grid is OMITTED (no .mcentre-cols wrapper for a
// single child — verified in (b) and (c) above).
const s07Pair = mc.matchSummaryHtml({ answerHtml: "خلاصه بازی", factsRows: [s07FactsRow], resultHtml: "" });
check(s07Pair.indexOf('<div class="mcentre-cols">') > -1 &&
  s07Pair.indexOf('<div class="mcentre-cols">') < s07Pair.indexOf('<div class="mcentre-card mcentre-brief" id="answer">') &&
  s07Pair.indexOf('<div class="mcentre-card mcentre-brief" id="answer">') < s07Pair.indexOf('<div class="mcentre-facts">'),
  "S07 pairing: briefing + facts wrapped in .mcentre-cols when both present — briefing FIRST (DOM order = right under native Persian RTL at the wide threshold; first on mobile), facts second; the S03 pairing grid carries the 1080px two-column→one-column collapse");

// (e) the finished result block — rides below the pair (the answer restated);
// the .mcentre-card.mcentre-result shell + the prebuilt inner content (h2 +
// the answer sentence). OMITTED when resultHtml is "" (the no-empty-cards law).
const s07Result = mc.matchSummaryHtml({ answerHtml: "خلاصه", factsRows: [s07FactsRow], resultHtml: '<h2>نتیجه نهایی</h2><p class="prose">آرسنال و دورتموند به مصاف هم رفتند.</p>' });
check(s07Result.includes('<div class="mcentre-card mcentre-result"><h2>نتیجه نهایی</h2><p class="prose">') &&
  s07Result.indexOf("mcentre-result") > s07Result.indexOf("mcentre-facts"),
  "S07 result block: the finished result rides below the pairing grid in a .mcentre-card.mcentre-result shell; the h2 + the answer sentence are the prebuilt inner content; OMITTED when resultHtml=\"\" (verified in (b)/(c)/(d) — no mcentre-result renders without the atom)");

// (f) the no-empty-cards law — all-empty input → "" (the section omits via
// sectionHtml; the summary is always present in production — every match has
// an answer sentence — but the renderer is fail-closed for the edge case).
check(mc.matchSummaryHtml({ answerHtml: "", factsRows: [], resultHtml: "" }) === "",
  "S07 no-empty-cards: all-empty atoms → empty string (the mcentre-summary section omits via sectionHtml — never a hollow card; the summary is always present in production but the renderer is fail-closed)");

// (g) no repeated Summary heading before the briefing (spec §5: "No repeated
// Summary heading before briefing") — the briefing card itself is the answer-
// first surface; NO <h2>«خلاصه» precedes it. The section's aria-label is the
// landmark name (not a visible heading).
check(!/<h2[^>]*>خلاصه/.test(s07Brief) && !/<h2[^>]*>خلاصه/.test(s07Pair) && !/<h2[^>]*>خلاصه/.test(s07Result),
  "S07 no-heading: no <h2>«خلاصه» heading precedes the briefing (spec §5: \"No repeated Summary heading before briefing\" — the briefing card itself is the answer-first surface; the section aria-label «خلاصه و مشخصات بازی» is the landmark name, not a visible heading)");

// (h) the fullWhenHtml date row — byte-frozen inside its <td> (S05 decision 95).
// The composer builds <th scope="row">LABEL</th><td>VALUEHTML</td> byte-for-byte
// from the atoms; the valueHtml rides untouched (the seo-check.js facts-table
// date regex `تاریخ</th><td>...</td>` still matches — the <th scope="row">
// attribute precedes the label, the </th><td> structure is preserved).
check(s07Facts.includes("تاریخ</th><td><time datetime=") &&
  /تاریخ<\/th><td>([\s\S]*?)<\/td>/.test(s07Facts),
  "S07 fullWhenHtml frozen: the facts-table date row markup is byte-identical (<th scope=\"row\">تاریخ</th><td>VALUEHTML</td>) — the seo-check.js facts-table date regex `تاریخ</th><td>...</td>` still matches; the fullWhenHtml atom rides untouched inside its <td> (S05 decision 95)");

// (i) composer purity — the S07 renderer adds zero imports/KV/fetch/scripts.
// The cost-law regex above (section 4) already gates the whole module; this
// pins the summary-specific vocabulary to the pure-leaf contract.
check(/export function matchSummaryHtml\(s: MatchSummaryInput\): string \{/.test(mcSrc) &&
  !/import |env\.STATE|\.get\(|\.put\(|fetch\(|addEventListener|setTimeout|setInterval|<script/i.test(mcSrc),
  "S07 purity: matchSummaryHtml is a pure string renderer — the composer carries zero imports/KV/fetch/client-scripts (the S02 pure leaf holds; the atoms arrive prebuilt from pages.ts)");

// (j) the adaptive filter still passes — the summary is always present (every
// match has an answer sentence), so the nav's Q9=B filter detects a non-empty
// summary and the خلاصه nav item renders. The summaryHtml variable feeds both
// matchNavHtml + matchCentreMain (the S06 extraction, byte-identical value).
check(/const navHtml = matchNavHtml\(\{ summary: summaryHtml,/.test(pagesSrc) &&
  /summary: summaryHtml,/.test(pagesSrc),
  "S07 adaptive filter: the summaryHtml (matchSummaryHtml output) feeds both matchNavHtml + matchCentreMain — the nav's Q9=B filter detects a non-empty summary (the answer sentence is always present) so the خلاصه nav item renders (no contract change from S06)");

// (k) the S07 CSS — the editorial card + facts panel + result block + the
// pairing alignment override, on the block's own icy/navy tokens, logical
// properties only.
check(shellSrc.includes(".mcentre-card{background:linear-gradient(160deg,rgba(56,132,255,.08),rgba(56,132,255,.02) 55%,rgba(148,163,184,.04));border:1px solid rgba(94,160,255,.22);border-radius:14px;padding:14px 16px}") &&
  shellSrc.includes(".mcentre-brief{font-size:1.04rem;line-height:1.95;color:var(--fg,#e8eefc)}") &&
  shellSrc.includes(".mcentre-facts{background:rgba(2,8,23,.32);border:1px solid rgba(148,163,184,.18);border-radius:12px;padding:10px 12px}"),
  "S07 CSS cards: the .mcentre-card container + the .mcentre-brief typography + the .mcentre-facts panel — the block's own icy/navy tokens (the hero/nav family), zero new assets/requests");
check(shellSrc.includes(".mcentre-result{margin-block-start:14px}") &&
  shellSrc.includes(".mcentre-result h2{font-size:1rem;font-weight:800;margin-block:0 6px;color:#7dd3fc}") &&
  shellSrc.includes(".mcentre-facts .facts{margin:0;font-size:.9rem}") &&
  shellSrc.includes(".mcentre-facts .facts caption{text-align:start;font-weight:700;padding-block-end:8px;color:#7dd3fc}"),
  "S07 CSS details: the result block (margin-block-start + the sky-family h2) + the facts panel scoping (margin:0, .9rem, the sky-family caption — the existing .facts vocabulary overridden inside .mcentre-facts only, the global .facts/.answercard rules untouched)");
check(shellSrc.includes("#mcentre-summary .mcentre-cols{align-items:start}"),
  "S07 CSS pairing alignment: #mcentre-summary .mcentre-cols{align-items:start} — briefing | facts top-aligned (each card its natural height; scoped to #mcentre-summary so the shared S03 .mcentre-cols utility stays untouched for S12's home|away form pairing)");
// the S07 block rides the page-shell style block (marked 'Match Centre S07')
const s07StyleIdx = shellSrc.indexOf("Match Centre S07");
check(s07StyleIdx > -1 && s07StyleIdx > shellSrc.indexOf("Match Centre S06") && s07StyleIdx < shellSrc.indexOf("Match Centre S03"),
  "S07 CSS placement: the S07 style block rides the page-shell inline <style> after S06 and before the S03 foundation (chronological session order: S04 → S05 → S06 → S07 → S03)");

// (l) S07 RTL/LTR — the S07-touched CSS rules use logical properties only
// (no physical left/right anywhere in the new card/facts/result/pairing rules).
var s07Rules = (shellSrc.match(/\.mcentre-card\{[^}]*\}|\.mcentre-brief\{[^}]*\}|\.mcentre-result\{[^}]*\}|\.mcentre-result h2\{[^}]*\}|\.mcentre-result \.prose\{[^}]*\}|\.mcentre-facts\{[^}]*\}|\.mcentre-facts \.facts\{[^}]*\}|\.mcentre-facts \.facts caption\{[^}]*\}|\.mcentre-facts \.facts th,\.mcentre-facts \.facts td\{[^}]*\}|#mcentre-summary \.mcentre-cols\{[^}]*\}/g) || []).join("");
check(s07Rules.length > 0 && !/margin-left|margin-right|padding-left|padding-right|text-align:\s*(left|right)|\bleft:|\bright:|float:/.test(s07Rules),
  "S07 RTL/LTR: the S07-touched rules are physical-property-free (margin-block-start, padding-block-end, padding-block, padding-inline, text-align:start, align-items:start — logical properties only) — the native-Persian RTL briefing|facts pairing mirrors cleanly under a dir flip (decision 2; the briefing renders right, facts left at the wide threshold under RTL, and mirrors under LTR)");

// (m) the S03 .mcentre-cols utility stays byte-frozen — S07 reuses it, never
// redefines it (the pairing grid is the shared utility; S07 only adds the
// alignment override scoped to #mcentre-summary).
check(shellSrc.includes(".mcentre-cols{display:grid;grid-template-columns:minmax(0,1fr);gap:14px}") &&
  shellSrc.includes('@media (min-width:1080px){.mcentre-cols{grid-template-columns:repeat(2,minmax(0,1fr))}}'),
  "S07 reuses S03: the .mcentre-cols pairing grid is byte-frozen from S03 (S07 reuses it for the briefing|facts pairing; only the #mcentre-summary-scoped align-items:start override is new — the shared utility stays untouched for S12)");

// ---------- 11. S08 (M3): the deterministic narrative engine ----------
// specification §5 (M3/S08) + the milestones-and-sessions.md M3/S08 scope. The
// "why this match matters" editorial layer — a central category registry +
// global priority ranking + explicit triggers/samples/exclusions + factual
// source fields + one primary narrative + an optional distinct secondary +
// stable deterministic variant selection. No AI, no network calls, no
// expensive per-match processing (the zero-runtime-cost law — the engine
// reads the SeoMatch fields already loaded). The narrative is a SEPARATE
// editorial layer, DISTINCT from the answer sentence (no repetition — the
// variant templates carry ONLY the rivalry/derby/top-table/knockout/featured
// context, never the kickoff time/venue/score). Every behavioral assertion
// below extracts the REAL engine via ts.transpileModule (the s05DateHelpers
// pattern — stubbed deps; never re-implemented) and runs it against fake
// SeoMatch objects.

// Extract the REAL narrative engine (src/seo/narrative.ts) via ts.transpileModule
// with stubbed deps (esc / compNameFa / normalizeTeamName / payloadTop3 — the
// s05DateHelpers pattern). The stubs let the tests control the top3 map + the
// comp name; the engine's pure logic (the registry + the triggers + the
// deterministic selection + the lifecycle gating) runs unmodified.
function narrativeEngine() {
  const ts = require(path.join(root, "node_modules", "typescript"));
  const src = fs.readFileSync(path.join(root, "src", "seo", "narrative.ts"), "utf8")
    .replace(/^import\s+[^;]+;\n?/gm, "")
    .replace(/^export\s+/gm, "");
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.None, target: "ES2020" } }).outputText;
  const stubs = {
    // a real esc (so the text is properly escaped — matches production behavior)
    esc: function (s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;"); },
    // a fake compNameFa — returns the competition's faName (or the code), the
    // same shape the real markup.ts compNameFa returns
    compNameFa: function (m) { return (m && m.competition) ? (m.competition.faName || m.competition.code || "TEST_COMP") : "TEST_COMP"; },
    // normalizeTeamName: identity-lowercase — so the test's top3 Set can hold
    // lowercased names and the trigger's set.has() resolves them
    normalizeTeamName: function (n) { return String(n || "").toLowerCase(); },
    // payloadTop3: returns the test-controlled top3 map (ctx.payload._top3 or
    // built from ctx.payload.standings — the real helper's shape, simplified)
    payloadTop3: function (payload) {
      const out = {};
      const st = payload && (payload._top3 || (payload.standings ? (function () {
        const o = {};
        for (const code of Object.keys(payload.standings)) {
          const teams = payload.standings[code] && payload.standings[code].teams;
          if (Array.isArray(teams) && teams.length) {
            o[code] = new Set(teams.slice(0, 3).map(function (t) { return String(t.name || "").toLowerCase(); }));
          }
        }
        return o;
      })() : null));
      if (st) for (const k of Object.keys(st)) out[k] = st[k] instanceof Set ? st[k] : new Set(st[k]);
      return out;
    }
  };
  return new Function(...Object.keys(stubs), js + "\nreturn { NARRATIVE_CATEGORIES, narrativePlan, narrativeHtml, deterministicVariantIndex, topTableEligible };")(...Object.values(stubs));
}
const ne = narrativeEngine();

// (a) the contract: the engine module exports its surface
check(typeof ne.narrativeHtml === "function" && typeof ne.narrativePlan === "function" &&
  typeof ne.deterministicVariantIndex === "function" && Array.isArray(ne.NARRATIVE_CATEGORIES) &&
  typeof ne.topTableEligible === "function",
  "S08 contract: the narrative engine (src/seo/narrative.ts) exports narrativeHtml + narrativePlan + deterministicVariantIndex + NARRATIVE_CATEGORIES + topTableEligible (the central registry + the plan + the selection + the eligibility helper)");

// (b) the registry — five categories in priority order (1=rivalry … 5=big-club)
check(ne.NARRATIVE_CATEGORIES.length === 5,
  "S08 registry: five categories (rivalry / knockout-stage / top-table / derby / big-club — the spec §5 'Possible categories' mapped to the available data pool)");
const catIds = ne.NARRATIVE_CATEGORIES.map((c) => c.id);
check(JSON.stringify(catIds) === JSON.stringify(["rivalry", "knockout-stage", "top-table", "derby", "big-club"]),
  "S08 priority: the global editorial priority hierarchy is rivalry(1) > knockout-stage(2) > top-table(3) > derby(4) > big-club(5) — a named rivalry is the marquee; a knockout round is high-stakes; a top-table clash is the title race; a derby is a heated local match; the big-club framing is the featured-match fallback (lowest — the 'concise factual editorial paragraph if useful' from spec §5)");
check(ne.NARRATIVE_CATEGORIES.every((c, i) => c.priority === i + 1 && c.priority >= 1 && c.priority <= 5),
  "S08 priority: every category carries a priority field 1..5 matching its registry position (the centrally-documented ranking — spec §5: 'Position in a centrally defined editorial priority hierarchy')");
check(ne.NARRATIVE_CATEGORIES.every((c) => typeof c.trigger === "function" && Array.isArray(c.variants) && c.variants.length >= 1 && Array.isArray(c.variantsFinished) && c.variantsFinished.length >= 1),
  "S08 registry shape: every category defines a trigger function + a variants array (upcoming/live) + a variantsFinished array (finished) — each with ≥1 variant (the deterministic selection mechanism is in force; S09 curates/expands the copy)");

// (c) the triggers — explicit deterministic conditions (spec §5: "Explicit
// deterministic trigger conditions"). Each trigger returns the source fields
// if eligible, else null. Verified via the REAL engine against fake SeoMatch
// objects (the stubbed deps let us control the top3 map + the comp name).
function mkS(o) {
  return Object.assign({
    homeTeam: { name: "Arsenal" }, awayTeam: { name: "Dortmund" },
    competition: { code: "PL", faName: "لیگ برتر انگلیس" },
    rivalryFa: null, derby: false, big: false, roundFa: null,
    path: "/matches/arsenal-vs-dortmund-2026-11-14"
  }, o || {});
}
function mkSm(s, raw) { return { s, raw: raw || { status: "SCHEDULED" } }; }
const ctxNone = { payload: { standings: null } };  // no top3 → top-table never eligible
// rivalry: fires on m.rivalryFa (the Persian rivalry name)
check(ne.narrativePlan(mkSm(mkS({ rivalryFa: "ال کلاسیکو" })), ctxNone, "upcoming").primary !== null &&
  ne.narrativePlan(mkSm(mkS({ rivalryFa: "ال کلاسیکو" })), ctxNone, "upcoming").primary.categoryId === "rivalry",
  "S08 trigger rivalry: m.rivalryFa truthy → the rivalry category fires (the named rivalry — El Clásico, Der Klassiker… — is the marquee, priority 1)");
check(ne.narrativePlan(mkSm(mkS({ rivalryFa: null })), ctxNone, "upcoming").primary === null ||
  ne.narrativePlan(mkSm(mkS({ rivalryFa: null, big: false })), ctxNone, "upcoming").primary === null,
  "S08 trigger rivalry boundary: m.rivalryFa falsy + no other eligible → no rivalry category (the trigger is null — missing data, no fabrication)");
// derby: fires on m.derby && !m.rivalryFa (a named rivalry supersedes a bare derby)
check(ne.narrativePlan(mkSm(mkS({ derby: true })), ctxNone, "upcoming").primary.categoryId === "derby",
  "S08 trigger derby: m.derby truthy + no rivalryFa → the derby category fires (priority 4; a bare derby, no named rivalry)");
check(ne.narrativePlan(mkSm(mkS({ derby: true, rivalryFa: "ال کلاسیکو" })), ctxNone, "upcoming").primary.categoryId === "rivalry",
  "S08 trigger derby exclusion: m.derby truthy BUT m.rivalryFa truthy → the rivalry category wins (a named rivalry supersedes a bare derby — the two are mutually exclusive; the derby trigger gates on !rivalryFa)");
// big-club: fires on m.big && !topTable (the featured-match fallback; a top-table clash takes top-table instead)
check(ne.narrativePlan(mkSm(mkS({ big: true })), ctxNone, "upcoming").primary.categoryId === "big-club",
  "S08 trigger big-club: m.big truthy + not top-table → the big-club category fires (priority 5 — the featured-match fallback: both teams are SportSignal followed clubs, the v13.179 hero AND rule)");
// knockout-stage: fires on m.roundFa matching the knockout regex
check(ne.narrativePlan(mkSm(mkS({ roundFa: "یک‌چهارم نهایی" })), ctxNone, "upcoming").primary.categoryId === "knockout-stage",
  "S08 trigger knockout-stage: m.roundFa matches /فینال|نهایی|یک‌چهارم|نیمه/ → the knockout-stage category fires (priority 2 — a knockout round, high stakes)");
check(ne.narrativePlan(mkSm(mkS({ roundFa: "هفته ۱۲" })), ctxNone, "upcoming").primary === null ||
  ne.narrativePlan(mkSm(mkS({ roundFa: "هفته ۱۲", big: false })), ctxNone, "upcoming").primary === null,
  "S08 trigger knockout-stage boundary: m.roundFa is a league round (no match) → no knockout category (the regex gate excludes non-knockout rounds — no unsupported competitive stakes)");
// top-table: fires on both teams in the top-3 standings
const ctxTop3 = { payload: { standings: { PL: { teams: [{ name: "Arsenal" }, { name: "Dortmund" }, { name: "Chelsea" }] } } } };
check(ne.narrativePlan(mkSm(mkS({ big: true })), ctxTop3, "upcoming").primary.categoryId === "top-table",
  "S08 trigger top-table: both teams in the top-3 standings → the top-table category fires (priority 3 — the title race; supersedes big-club since the big-club trigger gates on !topTable)");
check(ne.narrativePlan(mkSm(mkS({ homeTeam: { name: "Arsenal" }, awayTeam: { name: "Everton" }, big: true })), ctxTop3, "upcoming").primary.categoryId === "big-club",
  "S08 trigger top-table boundary: only ONE team in the top-3 → top-table does NOT fire (both-teams gate — a single top-3 team is insufficient sample; the big-club fallback fires instead)");

// (d) competing narrative priority — the primary is the highest-priority
// eligible; the secondary is the next-highest DISTINCT eligible (never the
// same category; never forced when only one is eligible)
const multiPlan = ne.narrativePlan(mkSm(mkS({ rivalryFa: "ال کلاسیکو", roundFa: "نیمه‌نهایی", big: true, derby: true })), ctxTop3, "upcoming");
check(multiPlan.primary.categoryId === "rivalry" && multiPlan.secondary !== null && multiPlan.secondary.categoryId === "knockout-stage",
  "S08 competing priority: rivalry + knockout-stage + top-table + derby + big-club ALL eligible → primary=rivalry(1), secondary=knockout-stage(2) (the two highest-priority distinct categories; the rest are dropped — spec §5: 'Display one primary storyline and optionally one distinct secondary storyline. Never force a second' — only TWO render, never a third)");
const soloPlan = ne.narrativePlan(mkSm(mkS({ rivalryFa: "ال کلاسیکو" })), ctxNone, "upcoming");
check(soloPlan.primary.categoryId === "rivalry" && soloPlan.secondary === null,
  "S08 no-forced-secondary: only ONE category eligible → primary=rivalry, secondary=null (the secondary is NEVER forced — it only renders when a distinct eligible category exists)");

// (e) insufficient sample / missing data — no eligible category → no narrative
// (the no-empty-cards law + the no-fabrication guard; the briefing|facts
// pairing still renders — the S07 contract holds)
const emptyPlan = ne.narrativePlan(mkSm(mkS({})), ctxNone, "upcoming");
check(emptyPlan.primary === null && emptyPlan.secondary === null,
  "S08 insufficient sample: a match with NO eligible category (no rivalry/derby/top-table/knockout/big) → primary=null, secondary=null (the narrative element is OMITTED — the no-empty-cards law + the 'omit the briefing if no useful paragraph can be made' spec path; the briefing card + facts still render, the S07 contract holds; NO fabricated significance)");
check(ne.narrativeHtml(mkSm(mkS({})), ctxNone, "upcoming") === "",
  "S08 no-fabrication: a match with no eligible category → narrativeHtml returns '' (the .mcentre-narrative element is omitted — never a hollow/filler narrative; spec §5: 'Never use generic filler or unsupported predictions')");

// (f) stable deterministic variant selection — same match + same category →
// same variant, every call (spec §5: "wording must not randomly change between
// page visits"). Different matches CAN yield different variants (the stable
// hash varies). Verified via the REAL deterministicVariantIndex + the plan.
const dv = ne.deterministicVariantIndex;
check(dv("path-A|rivalry", 2) === dv("path-A|rivalry", 2),
  "S08 stable selection: deterministicVariantIndex is stable — same key + same count → same index, every call (no random between page visits)");
check(dv("path-A|rivalry", 2) === dv("path-A|rivalry", 2) && dv("path-A|rivalry", 2) < 2 && dv("path-A|rivalry", 2) >= 0,
  "S08 selection range: deterministicVariantIndex returns an index in [0, count) — never out of bounds");
check(dv("", 1) === 0 && dv("anything", 1) === 0,
  "S08 selection boundary: count <= 1 → index 0 (the single variant — no selection needed; fail-safe)");
// two different matches with the rivalry category → the variant text may
// differ (the stable hash varies by the canonical path); both stable across
// repeated calls
const pA1 = ne.narrativePlan(mkSm(mkS({ rivalryFa: "ال کلاسیکو", path: "/matches/a-vs-b-1" })), ctxNone, "upcoming");
const pA2 = ne.narrativePlan(mkSm(mkS({ rivalryFa: "ال کلاسیکو", path: "/matches/a-vs-b-1" })), ctxNone, "upcoming");
const pB1 = ne.narrativePlan(mkSm(mkS({ rivalryFa: "ال کلاسیکو", path: "/matches/c-vs-d-2" })), ctxNone, "upcoming");
check(pA1.primary.text === pA2.primary.text,
  "S08 stable output across repeated calls: the SAME match (same canonical path) + same category → the SAME variant text, every call (the stable hash → same index → same variant; spec §5: 'wording must not randomly change between page visits')");
// at least one of the two distinct matches yields a different variant (the
// hash varies; 2 variants → ~50% chance, but the test confirms the mechanism
// CAN switch — if both happen to land on the same variant, that's still valid
// stable behavior, so we assert the mechanism (the index CAN differ) not the
// specific outcome)
const idxA = dv("/matches/a-vs-b-1|rivalry", 2);
const idxB = dv("/matches/c-vs-d-2|rivalry", 2);
check(typeof idxA === "number" && typeof idxB === "number" && idxA >= 0 && idxB >= 0 && idxA < 2 && idxB < 2,
  "S08 variant mechanism: different matches yield indices in [0,2) via the stable hash (the selection is deterministic per-match; the variant array has 2 entries — S09 expands to 'Multiple natural Persian variants')");

// (g) lifecycle eligibility — upcoming/live use the `variants` array (live =
// retained — spec §5: "do not regenerate frequently"); finished uses the
// `variantsFinished` array (past tense + significance). The eligibility GATES
// (which categories fire) are lifecycle-independent (rivalry fires whenever
// m.rivalryFa, regardless of state).
const upPlan = ne.narrativePlan(mkSm(mkS({ rivalryFa: "ال کلاسیکو" })), ctxNone, "upcoming");
const livePlan = ne.narrativePlan(mkSm(mkS({ rivalryFa: "ال کلاسیکو" })), ctxNone, "live");
const finPlan = ne.narrativePlan(mkSm(mkS({ rivalryFa: "ال کلاسیکو" }), { status: "FINISHED" }), ctxNone, "finished");
check(upPlan.primary.categoryId === "rivalry" && livePlan.primary.categoryId === "rivalry" && finPlan.primary.categoryId === "rivalry",
  "S08 lifecycle eligibility: the rivalry category is eligible across ALL three lifecycles (upcoming/live/finished) — the trigger is lifecycle-independent (rivalry fires whenever m.rivalryFa)");
check(livePlan.primary.text === upPlan.primary.text,
  "S08 live = retained upcoming: live matches use the SAME variants as upcoming (spec §5: 'Live: retain the pre-match briefing; do not regenerate frequently' — no regeneration between upcoming and live)");
// the finished variant is from variantsFinished (past tense). The rivalry
// category's variantsFinished entries ALL carry «به پایان رسید» (a past-tense
// marker the upcoming variants never carry), so the finished plan's primary
// text MUST contain it + the upcoming/live plans' primary text MUST NOT.
check(finPlan.primary.text.indexOf("به پایان رسید") > -1,
  "S08 finished tense: finished matches use the variantsFinished array — the rivalry finished variant carries «به پایان رسید» (the past-tense + significance marker; the upcoming/live variants are NOT used for finished)");
check(upPlan.primary.text.indexOf("به پایان رسید") === -1 && livePlan.primary.text.indexOf("به پایان رسید") === -1,
  "S08 upcoming/live tense: upcoming + live use the variants array — NO «به پایان رسید» (the upcoming variants carry present-tense framing; live = retained upcoming, the same present-tense variants — spec §5: 'do not regenerate frequently')");
// a category with no source field (derby/big-club) still works across lifecycles
const derbyFin = ne.narrativePlan(mkSm(mkS({ derby: true }), { status: "FINISHED" }), ctxNone, "finished");
check(derbyFin.primary.categoryId === "derby" && derbyFin.primary.text.length > 0,
  "S08 lifecycle no-field categories: the derby category (no source field) fires across lifecycles + the finished variant renders (past tense — no source field needed; the trigger is the flag only)");

// (h) no-repetition-with-answer discipline — the narrative variant templates
// carry ONLY the rivalry/derby/top-table/knockout/featured context; they NEVER
// reference the kickoff time / venue / score (the answer sentence's domain).
// Source-inspection: the variant strings never embed the answer-sentence
// clauses ("به وقت تهران" / "ورزشگاه" / "نتیجه نهایی" / "زمان جهانی").
const allVariants = ne.NARRATIVE_CATEGORIES.flatMap((c) => c.variants.concat(c.variantsFinished));
check(allVariants.length > 0 && !allVariants.some((v) => /به وقت تهران|ورزشگاه|نتیجه نهایی|زمان جهانی|ساعت /.test(v)),
  "S08 no-repetition: the variant templates NEVER reference the answer sentence's domain (no «به وقت تهران» / «ورزشگاه» / «نتیجه نهایی» / «زمان جهانی» / «ساعت» — the kickoff time / venue / score / UTC clause stay exclusive to the answer sentence; the narrative is the DISTINCT 'why this matters' context — spec M3 gate: 'Keep answer-first context and facts table distinct; avoid repetition')");
// the narrative plan's primary text is never byte-equal to the answer sentence
// (they're different layers by construction)
const answer = "آرسنال در لیگ برتر انگلیس میزبان دورتموند است؛ این بازی شنبه به وقت تهران برگزار می‌شود.";
check(ne.narrativePlan(mkSm(mkS({ rivalryFa: "ال کلاسیکو" })), ctxNone, "upcoming").primary.text !== answer,
  "S08 distinct-from-answer: the narrative primary text is never byte-equal to the answer sentence (the two layers are distinct by construction — the narrative carries the rivalry significance, the answer carries the kickoff/venue/score)");

// (i) no-fabricated-statistics guard — the variant templates never cite streak
// counts, win/loss tallies, standings positions (beyond the verified top-3
// fact), or progression outcomes (which would need bracket data the pool lacks)
check(!allVariants.some((v) => /\d+\s*برد|\d+\s*باخت|\d+\s*مساوی|پیاپی|متوالی|صعود کرد|حذف شد/.test(v)),
  "S08 no-fabricated-stats: the variant templates never cite streak counts / win-loss tallies / progression outcomes (no fabricated statistics — spec §5: 'No unsupported competitive stakes or fabricated statistics'; the top-table variant states the title-race significance defensibly because both-top-3 is a verified fact, not a fabricated stat)");

// (j) the composer integration — matchSummaryHtml slots the narrative ABOVE
// the pairing. With a narrativeHtml atom, the .mcentre-narrative element
// renders FIRST (before the .mcentre-cols pairing). Without it (or ""), no
// .mcentre-narrative renders (the S07 contract holds byte-for-byte).
const s08WithNarr = mc.matchSummaryHtml({
  answerHtml: "خلاصه", factsRows: [{ label: "تاریخ", valueHtml: "۱۴ آبان" }], resultHtml: "",
  narrativeHtml: '<div class="mcentre-narrative"><p class="mcentre-nar-primary">دربی هفته</p></div>'
});
check(s08WithNarr.indexOf('<div class="mcentre-narrative">') === 0 &&
  s08WithNarr.indexOf("mcentre-narrative") < s08WithNarr.indexOf("mcentre-cols") &&
  s08WithNarr.indexOf("mcentre-cols") < s08WithNarr.indexOf("mcentre-brief"),
  "S08 composer integration: the narrativeHtml atom rides ABOVE the .mcentre-cols pairing (DOM order: narrative → pairing grid → briefing card inside the grid) — the editorial lead-in, then the answer-first briefing | facts, then the result; the S07 pairing contract holds inside the grid");
// without narrativeHtml (or "") — the S07 contract holds byte-for-byte (no .mcentre-narrative)
const s08NoNarr = mc.matchSummaryHtml({
  answerHtml: "خلاصه", factsRows: [{ label: "تاریخ", valueHtml: "۱۴ آبان" }], resultHtml: ""
});
check(!s08NoNarr.includes("mcentre-narrative") && s08NoNarr === mc.matchSummaryHtml({ answerHtml: "خلاصه", factsRows: [{ label: "تاریخ", valueHtml: "۱۴ آبان" }], resultHtml: "", narrativeHtml: "" }),
  "S08 no-narrative fallback: narrativeHtml omitted OR '' → no .mcentre-narrative element (the S07 contract holds byte-for-byte — `'' + pair + result` === `pair + result`; the briefing|facts pairing still renders; the no-empty-cards law holds at the narrative level)");
// the narrativeHtml atom wraps primary + optional secondary in the engine
const narrWithSec = ne.narrativeHtml(mkSm(mkS({ rivalryFa: "ال کلاسیکو", roundFa: "نیمه‌نهایی" })), ctxNone, "upcoming");
check(narrWithSec.indexOf('<div class="mcentre-narrative">') === 0 &&
  narrWithSec.indexOf("mcentre-nar-primary") > -1 && narrWithSec.indexOf("mcentre-nar-secondary") > -1 &&
  narrWithSec.indexOf("mcentre-nar-primary") < narrWithSec.indexOf("mcentre-nar-secondary"),
  "S08 narrative HTML: the engine's narrativeHtml wraps the primary (mcentre-nar-primary) + the optional secondary (mcentre-nar-secondary) in a .mcentre-narrative div — primary FIRST, secondary below (the optional distinct secondary renders when a distinct eligible category exists)");
const narrSolo = ne.narrativeHtml(mkSm(mkS({ rivalryFa: "ال کلاسیکو" })), ctxNone, "upcoming");
check(narrSolo.indexOf("mcentre-nar-primary") > -1 && !narrSolo.includes("mcentre-nar-secondary"),
  "S08 narrative HTML no-secondary: when only ONE category is eligible, the narrativeHtml renders the primary ONLY (no secondary — never forced)");

// (k) the S08 CSS — the .mcentre-narrative block (the editorial typography +
// the subtle divider), logical properties only, the block's own tokens.
check(shellSrc.includes(".mcentre-narrative{margin-block-end:14px;padding-block-end:12px;border-block-end:1px solid rgba(94,160,255,.16)}") &&
  shellSrc.includes(".mcentre-narrative p{margin:0;line-height:1.9;text-align:start;color:var(--fg,#e8eefc)}") &&
  shellSrc.includes(".mcentre-narrative p.mcentre-nar-primary{font-size:1.02rem;font-weight:600}") &&
  shellSrc.includes(".mcentre-narrative p.mcentre-nar-secondary{margin-block-start:8px;font-size:.94rem;color:var(--muted,#9aa4b2)}"),
  "S08 CSS narrative: the .mcentre-narrative block (the editorial lead — NOT a .mcentre-card, per spec §5 'Open editorial layout, not a prominent card background') + the primary (1.02rem/font-weight 600 — prominent via typography) + the secondary (smaller/muted — the optional distinct storyline); the subtle border-block-end divider separates it from the pairing below; the block's own icy/navy tokens, zero new assets/requests");
// the S08 block rides the page-shell style block AFTER S07 and BEFORE S03
const s08StyleIdx = shellSrc.indexOf("Match Centre S08");
check(s08StyleIdx > -1 && s08StyleIdx > shellSrc.indexOf("Match Centre S07") && s08StyleIdx < shellSrc.indexOf("Match Centre S03"),
  "S08 CSS placement: the S08 style block rides the page-shell inline <style> after S07 and before the S03 foundation (chronological session order: S04 → S05 → S06 → S07 → S08 → S03)");

// (l) S08 RTL/LTR — the narrative CSS rules use logical properties only
var s08Rules = (shellSrc.match(/\.mcentre-narrative\{[^}]*\}|\.mcentre-narrative p\{[^}]*\}|\.mcentre-narrative p\.mcentre-nar-primary\{[^}]*\}|\.mcentre-narrative p\.mcentre-nar-secondary\{[^}]*\}/g) || []).join("");
check(s08Rules.length > 0 && !/margin-left|margin-right|padding-left|padding-right|text-align:\s*(left|right)|\bleft:|\bright:|float:/.test(s08Rules),
  "S08 RTL/LTR: the narrative CSS rules are physical-property-free (margin-block-end, padding-block-end, border-block-end, margin-block-start, text-align:start — logical properties only) — the native-Persian RTL narrative mirrors cleanly under a dir flip (decision 2; the primary renders right-aligned under RTL, mirrors under LTR)");

// ---------- 11. S09 (M3): the Persian copy + factual fallback + editorial QA ----------
// specification §5 (M3/S09) + milestones-and-sessions.md M3/S09 — the final M3
// session: complete the manually authored copy + the editorial QA. The S08
// engine is the mechanism (the registry + the triggers + the deterministic
// selection + the lifecycle eligibility); S09 is the COPY + the fallback
// decision + the figure policy + the QA. The engine's structure (the
// NARRATIVE_CATEGORIES shape + deterministicVariantIndex + the lifecycle
// eligibility) is S08-frozen; S09 extends the variant ARRAYS only (2 → 4 per
// category per lifecycle) + documents the OMIT fallback + the figure policy.
// Every assertion below extracts the REAL engine (the `ne` transpile above) +
// runs against fake SeoMatch objects.

// (a) S09 variant count — "Multiple natural Persian variants per supported
// category" (spec §5). The S08 floor was ≥1; S09 raises the copy-QA floor to
// ≥3 (the "Multiple" threshold — 2 is the S08 seed pair, 3+ is "multiple") in
// BOTH the upcoming/live `variants` array AND the finished `variantsFinished`
// array, for every category. Authored at 4 each (the 3–5 target, middle value).
check(ne.NARRATIVE_CATEGORIES.every((c) => c.variants.length >= 3),
  "S09 variant count upcoming/live: every category carries ≥3 upcoming/live variants (spec §5 'Multiple manually written Persian wording variants' — the S08 seed pair of 2 expanded; authored at 4 each, the 3–5 target middle value; enough for the deterministic selection to vary meaningfully across matches without repetition)");
check(ne.NARRATIVE_CATEGORIES.every((c) => c.variantsFinished.length >= 3),
  "S09 variant count finished: every category carries ≥3 finished variants (the past-tense + significance pool — the same 'Multiple' floor; authored at 4 each; finished matches get a stable bucket selection from a real pool, not a single seed)");
// the total variant corpus — 5 categories × ≥3 × 2 lifecycles ≥ 30 (authored 40)
check(allVariants.length >= 30,
  "S09 variant corpus: the total variant corpus (5 categories × both lifecycles) is ≥30 (authored 40 — 5 × 4 × 2); the deterministic selection has a real pool to distribute across matches, never a hollow single-variant-per-category registry");

// (b) S09 grammar + RTL punctuation — Persian typography discipline across the
// full variant corpus. The Persian comma «،», the semicolon «؛», the guillemets
// ««»» (around the rivalry name), and the ZWNJ (U+200C, in compound words like
// همیشه‌جدی / صدرنشین / به‌طور) are the markers of natural Persian editorial
// copy. Their presence asserts the copy is native Persian (not transliterated,
// not Latin-punctuated) + the compound words are properly joined.
check(allVariants.some((v) => v.indexOf("،") > -1),
  "S09 grammar Persian comma: the variant corpus uses the Persian comma «،» (not the Latin comma) — natural Persian editorial punctuation");
check(allVariants.some((v) => v.indexOf("؛") > -1),
  "S09 grammar Persian semicolon: the variant corpus uses the Persian semicolon «؛» — the clause separator in multi-clause editorial sentences");
check(allVariants.some((v) => v.indexOf("«") > -1 && v.indexOf("»") > -1),
  "S09 grammar guillemets: the variant corpus uses Persian guillemets ««»» (around the rivalry name — «{rivalry}»; the native-Persian quotation marks, not Latin double-quotes)");
check(allVariants.some((v) => v.indexOf("\u200c") > -1),
  "S09 grammar ZWNJ: the variant corpus uses the ZWNJ (U+200C) in Persian compound words (همیشه‌جدی / صدرنشین / به‌طور / پرطرفدار — the half-space that joins the parts of a compound without a full word break; the marker of correct Persian typography)");

// (c) S09 factual equivalence — every variant of a category cites the SAME
// source field (the category's factual evidence), worded differently. This is
// the spec §5 "Factual evidence and source fields" + the "Multiple manually
// written Persian wording variants" pair: same significance, different
// wording. The rivalry variants all carry {rivalry}; the knockout variants all
// carry {round} + {comp}; the top-table variants all carry {comp}; the derby
// variants all carry «دربی» (no source field — the defining term); the big-club
// variants all carry «SportSignal» (the defining term).
function variantsOf(id, finished) {
  const c = ne.NARRATIVE_CATEGORIES.find((x) => x.id === id);
  return finished ? c.variantsFinished : c.variants;
}
check(variantsOf("rivalry", false).every((v) => v.indexOf("{rivalry}") > -1) &&
  variantsOf("rivalry", true).every((v) => v.indexOf("{rivalry}") > -1),
  "S09 factual equivalence rivalry: every rivalry variant (upcoming/live + finished) cites {rivalry} — the named rivalry is the factual evidence in every wording (the significance is the same; the phrasing varies)");
check(variantsOf("knockout-stage", false).every((v) => v.indexOf("{round}") > -1 && v.indexOf("{comp}") > -1) &&
  variantsOf("knockout-stage", true).every((v) => v.indexOf("{round}") > -1 && v.indexOf("{comp}") > -1),
  "S09 factual equivalence knockout-stage: every knockout variant cites {round} + {comp} — the round name (an already-available figure, e.g. «یک‌چهارم نهایی») + the competition are the factual evidence in every wording");
check(variantsOf("top-table", false).every((v) => v.indexOf("{comp}") > -1) &&
  variantsOf("top-table", true).every((v) => v.indexOf("{comp}") > -1),
  "S09 factual equivalence top-table: every top-table variant cites {comp} — the competition (both teams are verified top-3 in it) is the factual evidence in every wording");
check(variantsOf("derby", false).every((v) => v.indexOf("دربی") > -1) &&
  variantsOf("derby", true).every((v) => v.indexOf("دربی") > -1),
  "S09 factual equivalence derby: every derby variant carries «دربی» — the defining term (no source field; the flag only) is the factual evidence in every wording");
check(variantsOf("big-club", false).every((v) => v.indexOf("SportSignal") > -1) &&
  variantsOf("big-club", true).every((v) => v.indexOf("SportSignal") > -1),
  "S09 factual equivalence big-club: every big-club variant carries «SportSignal» — the defining term (the featured-match framing; both teams are SportSignal followed clubs) is the factual evidence in every wording");

// (d) S09 no repeated/contradictory facts — within a category, no two variants
// are byte-identical (no duplicate copy). A duplicate would mean the
// deterministic selection could land on the same text for two different
// indices — a hollow pool. Cross-variant contradiction is guarded by the
// factual-equivalence check above (same source field) + the no-fabrication
// guard below (no fabricated stats to contradict).
check(ne.NARRATIVE_CATEGORIES.every((c) => new Set(c.variants).size === c.variants.length),
  "S09 no repeated variants upcoming/live: within each category, no two upcoming/live variants are byte-identical (the deterministic pool is a real set — no hollow duplicates that would collapse the selection)");
check(ne.NARRATIVE_CATEGORIES.every((c) => new Set(c.variantsFinished).size === c.variantsFinished.length),
  "S09 no repeated variants finished: within each category, no two finished variants are byte-identical (the finished pool is a real set)");

// (e) S09 figure policy — the no-fabricated-stats guard HOLDS (spec §5: "Use
// figures only when they materially strengthen the narrative and are already
// available"). The already-available figures (round / competition / rivalry
// names) are ALREADY cited via the {round}/{comp}/{rivalry} placeholders. No
// NEW figure placeholder is introduced (no {streak}/{wins}/{position}/{form} —
// those would need new data work the pool does not carry). Every {placeholder}
// across the full corpus is one of the three already-loaded fields.
const allPlaceholders = allVariants.flatMap((v) => {
  const arr = [];
  v.replace(/\{(\w+)\}/g, (_m, k) => { arr.push(k); return _m; });
  return arr;
});
check(allPlaceholders.every((k) => k === "rivalry" || k === "round" || k === "comp"),
  "S09 figure policy: every {placeholder} across all variants is one of {rivalry}/{round}/{comp} — the three already-loaded SeoMatch fields (the figures that materially help + are already available without extra provider requests/KV/computation); NO new figure placeholder ({streak}/{wins}/{position}/{form}) is introduced — the no-fabricated-stats guard holds unchanged (S09-3 decision)");
// the no-fabricated-stats regex re-asserted on the expanded corpus (the S08
// assertion auto-extends via allVariants, but S09 re-asserts explicitly to
// confirm the new variants 2–3 didn't introduce fabricated stats)
check(!allVariants.some((v) => /\d+\s*برد|\d+\s*باخت|\d+\s*مساوی|پیاپی|متوالی|صعود کرد|حذف شد/.test(v)),
  "S09 no-fabricated-stats (expanded): the expanded variant corpus (40 strings) carries NO streak counts / win-loss tallies / progression-outcome claims — no fabricated statistics (spec §5: 'No unsupported competitive stakes or fabricated statistics'; the knockout variants cite the round + the stakes — «شرط صعود» the noun, never «صعود کرد» the claimed outcome)");

// (f) S09 lifecycle tense — stricter than S08 (which checks the rivalry
// selected variant). S09 asserts the tense discipline ACROSS THE FULL CORPUS:
// NO upcoming/live variant (any category) carries «به پایان رسید» (the
// past-tense marker is exclusive to the finished pool); ALL rivalry finished
// variants carry «به پایان رسید» (the rivalry category's finished pool is
// uniformly past-tense — the S08 marker discipline holds at the corpus level).
check(!allVariants.filter((v) => {
  // is this an upcoming/live variant? reconstruct by checking it's in some
  // category's `variants` (not variantsFinished)
  return ne.NARRATIVE_CATEGORIES.some((c) => c.variants.indexOf(v) > -1);
}).some((v) => v.indexOf("به پایان رسید") > -1),
  "S09 lifecycle tense upcoming/live: NO upcoming/live variant across ANY category carries «به پایان رسید» (the past-tense marker is exclusive to the finished pool — spec §5: 'Upcoming: pre-match form and competition context' / 'Live: retain the pre-match briefing'; the upcoming/live variants carry present-tense framing only)");
check(variantsOf("rivalry", true).every((v) => v.indexOf("به پایان رسید") > -1),
  "S09 lifecycle tense rivalry finished: ALL rivalry finished variants carry «به پایان رسید» (the rivalry category's finished pool is uniformly past-tense + significance — spec §5: 'Finished: verified result and significance'; the S08 selected-variant check is raised to a corpus-wide invariant)");

// (g) S09 fallback discipline — the OMIT decision (S09-2). When no category
// qualifies, narrativeHtml returns "" (the element is omitted; the briefing|
// facts pairing still renders; the S07 contract holds). NO sixth "fallback"
// category is added to the registry (a generic match's only verified facts are
// the kickoff/venue/competition/round — already covered by the answer sentence
// + the facts table; a fallback editorial paragraph would restate them
// [violating the M3 gate no-repetition discipline] or fabricate significance
// [violating the no-fabrication guard]). The spec §5 "If no useful paragraph
// can be made, omit the briefing" path is the correct resolution.
check(ne.NARRATIVE_CATEGORIES.length === 5 &&
  ne.NARRATIVE_CATEGORIES.every((c) => c.id !== "fallback"),
  "S09 fallback OMIT — no fallback category: the registry stays at 5 categories (no sixth 'fallback' category — a generic match's only verified facts are the kickoff/venue/competition/round already in the answer sentence + the facts table; a fallback editorial paragraph would repeat them [M3 gate no-repetition] or fabricate significance [no-fabrication guard]; the S09-2 OMIT decision)");
check(ne.narrativeHtml(mkSm(mkS({})), ctxNone, "upcoming") === "" &&
  ne.narrativeHtml(mkSm(mkS({})), ctxNone, "live") === "" &&
  ne.narrativeHtml(mkSm(mkS({}), { status: "FINISHED" }), ctxNone, "finished") === "",
  "S09 fallback OMIT — empty return: a match with NO eligible category → narrativeHtml returns '' across ALL three lifecycles (the .mcentre-narrative element is omitted — the no-empty-cards law + the spec §5 'If no useful paragraph can be made, omit the briefing' path; the briefing card + facts table still render, the S07 contract holds; NO fabricated significance)");

// (h) S09 variant distribution — with 4 variants per category, the deterministic
// hash yields indices in [0,4) (the expanded pool). Several distinct matches
// distribute across the 4 buckets (the selection varies meaningfully — spec
// §5: "wording must not randomly change between page visits" + "Multiple …
// variants"). Same match → same index (stability); different matches → may
// differ (distribution).
var s09Paths = ["/matches/a-vs-b-1", "/matches/c-vs-d-2", "/matches/e-vs-f-3", "/matches/g-vs-h-4", "/matches/i-vs-j-5"];
var s09Indices = s09Paths.map((p) => dv(p + "|rivalry", 4));
check(s09Indices.every((i) => typeof i === "number" && i >= 0 && i < 4),
  "S09 variant distribution range: with 4 rivalry variants, the deterministic hash yields indices in [0,4) for every match — the expanded pool is in range (never out of bounds)");
check(new Set(s09Indices).size >= 2,
  "S09 variant distribution spread: ≥2 distinct indices across 5 matches (the stable hash distributes across the 4-bucket pool — the 'Multiple natural Persian variants' yield visibly different copy across matches, not a single always-selected variant)");

// (i) S09 the S08 contract surface is byte-frozen — the engine's structure
// (the NARRATIVE_CATEGORIES shape + the deterministic selection + the lifecycle
// eligibility + the primary/optional-secondary plan) is S08-frozen; S09
// extended the variant ARRAYS only. The function signatures + the types +
// the trigger logic + the narrativeHtml markup are unchanged.
check(typeof ne.narrativeHtml === "function" && typeof ne.narrativePlan === "function" &&
  typeof ne.deterministicVariantIndex === "function" && typeof ne.topTableEligible === "function" &&
  Array.isArray(ne.NARRATIVE_CATEGORIES) && ne.NARRATIVE_CATEGORIES.length === 5,
  "S09 S08-frozen surface: the engine's contract (narrativeHtml + narrativePlan + deterministicVariantIndex + topTableEligible + NARRATIVE_CATEGORIES[5]) is unchanged — S09 extended the variant ARRAYS only (2 → 4 per category per lifecycle); the trigger logic + the deterministic selection + the lifecycle eligibility + the primary/optional-secondary plan are S08-frozen");
// the narrativeHtml markup wraps the primary + optional secondary (unchanged)
var s09NarrHtml = ne.narrativeHtml(mkSm(mkS({ rivalryFa: "ال کلاسیکو", roundFa: "نیمه‌نهایی" })), ctxNone, "upcoming");
check(s09NarrHtml.indexOf('<div class="mcentre-narrative">') === 0 &&
  s09NarrHtml.indexOf("mcentre-nar-primary") > -1 && s09NarrHtml.indexOf("mcentre-nar-secondary") > -1 &&
  s09NarrHtml.indexOf("mcentre-nar-primary") < s09NarrHtml.indexOf("mcentre-nar-secondary") &&
  s09NarrHtml.indexOf("</div>") > s09NarrHtml.indexOf("mcentre-nar-secondary"),
  "S09 narrative HTML structure unchanged: the engine's narrativeHtml still wraps the primary (mcentre-nar-primary) + the optional secondary (mcentre-nar-secondary) in a .mcentre-narrative div — primary FIRST, secondary below, closed </div>; the S08 markup contract holds (S09 extended the variant strings, not the markup)");

// (j) S09 the trigger matrix doc — the M3 gate's documentation requirement
// (spec M3 gate: "Provide trigger matrix and rendered examples"). The doc
// carries the 5 categories × their triggers × their eligibility boundaries × a
// representative match per lifecycle × the rendered primary + secondary output.
var matrixDoc = "";
try { matrixDoc = read("docs/mc/narrative-trigger-matrix.md"); } catch (e) { matrixDoc = ""; }
check(matrixDoc.length > 0,
  "S09 trigger matrix doc exists: docs/mc/narrative-trigger-matrix.md is committed (the M3 gate documentation requirement — spec: 'Provide trigger matrix and rendered examples')");
check(["rivalry", "knockout-stage", "top-table", "derby", "big-club"].every((id) => matrixDoc.indexOf(id) > -1),
  "S09 trigger matrix doc coverage: the matrix documents all 5 categories (rivalry / knockout-stage / top-table / derby / big-club — the trigger conditions + the eligibility boundaries per lifecycle + the rendered primary + optional secondary)");
check(matrixDoc.indexOf("به پایان رسید") > -1 && matrixDoc.indexOf("upcoming") > -1 && matrixDoc.indexOf("finished") > -1,
  "S09 trigger matrix doc lifecycles: the matrix documents the lifecycle tense switching (upcoming/live → present-tense variants; finished → past-tense + significance — the «به پایان رسید» marker) across representative matches");

// ---------- 12. S10 (M4): the standings selection/window logic ----------
// specification §8 (M4/S10) + milestones-and-sessions.md M4/S10 — the unified
// competition table's DATA layer. S10 ships the pure SELECTION logic (the
// five-row neighbourhood for both teams, the merge/touch/ellipsis, the
// participant-mark, the fail-closed gate) + the tests; S11 ships the renderer
// (the unified table markup + the participant highlight + the responsive mobile
// layout + the CSS) + the composer wiring. The S10/S11 split = selection vs
// rendering (the spec's design). The selection is PURE LOGIC — zero KV reads,
// zero awaits, zero fetches (the S08 narrative precedent, audit §R3: the
// standings are already loaded by getSeoCtx + fullByCodeFor). The new module
// src/seo/standings-window.ts owns the algorithm; the existing team-page
// teamStandingsWindow (data.ts) is NOT modified (the team-page path stays
// byte-frozen). The composer stays the S02 pure leaf (zero runtime imports).

// (a) S10 the cost law — the new module is pure logic (zero AI/network/KV/
// timer/polling). The same regex the S08 narrative engine is gated on.
const swSrc = read("src/seo/standings-window.ts");
check(!/fetch\(|XMLHttpRequest|new Image|setTimeout|setInterval|addEventListener|\.get\(|\.put\(|env\.STATE|env\.AI|AI\.run|generateText|chat\.completions/i.test(swSrc),
  "S10 cost law: the standings-window module (src/seo/standings-window.ts) carries NO AI/network/KV/timer/polling code (the S08 zero-runtime-cost law — the module reads from the already-loaded standings_cache + fullByCode; zero new awaits, zero new KV reads, zero new fetches)");
// the module's runtime imports are the SAME seo/* helpers pages.ts already
// imports (normalizeTeamName + COMP_EN + the type-only SeoMatch/SeoCtx) — zero
// new dependency surface.
check(/^import \{ normalizeTeamName \} from "\.\.\/teams";/m.test(swSrc) &&
  /^import \{ COMP_EN \} from "\.\.\/tables";/m.test(swSrc) &&
  /^import type \{ SeoMatch, SeoCtx \} from "\.\/data";/m.test(swSrc),
  "S10 imports: the standings-window module imports ONLY normalizeTeamName (teams) + COMP_EN (tables) + the type-only SeoMatch/SeoCtx (data) — the SAME seo/* helpers pages.ts already imports; zero new dependency surface");

// (b) S10 harness co-evolution — worker-src.js carries the new module after
// narrative.ts (the seo group grows).
check(harnessSrc.indexOf('"seo/standings-window.ts"') > -1 &&
  harnessSrc.indexOf('"seo/standings-window.ts"') > harnessSrc.indexOf('"seo/narrative.ts"'),
  "S10 harness: worker-src.js carries seo/standings-window.ts after seo/narrative.ts (the S10 module joins the seo group — the co-evolution law)");

// (c) S10 the contract — the module exports its surface. Extract the REAL
// module via ts.transpileModule with stubbed deps (the s05DateHelpers pattern —
// the S08 narrative precedent). The stubs let the tests control the
// normalizeTeamName + COMP_EN; the module's pure logic (the lookup + the
// neighbourhood + the merge/touch/ellipsis + the participant-mark + the
// fail-closed gate) runs unmodified.
function standingsWindowEngine() {
  const ts = require(path.join(root, "node_modules", "typescript"));
  const src = fs.readFileSync(path.join(root, "src", "seo", "standings-window.ts"), "utf8")
    .replace(/^import\s+[^;]+;\n?/gm, "")
    .replace(/^export\s+/gm, "");
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.None, target: "ES2020" } }).outputText;
  const stubs = {
    // normalizeTeamName: identity-lowercase (the same stub the S08 narrative
    // test uses — so the test's fake teams match by lowercased name).
    normalizeTeamName: function (n) { return String(n || "").toLowerCase(); },
    // COMP_EN: a minimal stub — the test controls the fallback competition name.
    COMP_EN: { PL: "Premier League", PD: "La Liga", SA: "Serie A", BL1: "Bundesliga", FL1: "Ligue 1", CL: "Champions League", PGL: "Persian Gulf Pro League" }
  };
  return new Function(...Object.keys(stubs), js + "\nreturn { matchStandingsWindow };")(...Object.values(stubs));
}
const sw = standingsWindowEngine();
check(typeof sw.matchStandingsWindow === "function",
  "S10 contract: the standings-window module (src/seo/standings-window.ts) exports matchStandingsWindow (the unified-window entry point)");

// Build a fake SeoMatch + ctx for the behavioral assertions. The fake
// standings tables carry the full row shape (pos/name/faName/crest/points/
// played/won/draw/lost/gf/ga) — the same shape the real standings_cache rows
// carry (audit §R3/§67). The gd column (gf-ga) is computed by S11's renderer,
// not the selection — the selection returns the full row (decision 4).
function mkStandingsRow(name, pos, opts) {
  opts = opts || {};
  return {
    name: name,
    pos: pos,
    faName: opts.faName || name,
    crest: opts.crest || null,
    points: opts.points != null ? opts.points : (20 - pos),
    played: opts.played != null ? opts.played : 10,
    won: opts.won != null ? opts.won : (10 - pos),
    draw: opts.draw != null ? opts.draw : 0,
    lost: opts.lost != null ? opts.lost : pos,
    gf: opts.gf != null ? opts.gf : (20 - pos),
    ga: opts.ga != null ? opts.ga : pos
  };
}
function mkStandingsTable(teams, started) {
  return { started: started !== false, faName: "TEST_COMP_FA", emblem: "https://example.com/emblem.png", teams: teams };
}
function mkSmS(home, away, code) {
  return {
    s: {
      homeTeam: { name: home }, awayTeam: { name: away },
      competition: { code: code || "PL", faName: "لیگ برتر انگلیس" }
    },
    raw: { status: "SCHEDULED" }
  };
}

// (d) S10 the neighbourhood size — five rows around each participating team
// (the team's row ± 2, clamped at the table edges).
const plTeams = [
  mkStandingsRow("Arsenal", 1), mkStandingsRow("Man City", 2), mkStandingsRow("Liverpool", 3),
  mkStandingsRow("Chelsea", 4), mkStandingsRow("Tottenham", 5), mkStandingsRow("Man United", 6),
  mkStandingsRow("Newcastle", 7), mkStandingsRow("Brighton", 8), mkStandingsRow("West Ham", 9),
  mkStandingsRow("Aston Villa", 10), mkStandingsRow("Brentford", 11), mkStandingsRow("Fulham", 12),
  mkStandingsRow("Wolves", 13), mkStandingsRow("Palace", 14), mkStandingsRow("Everton", 15),
  mkStandingsRow("Brentford2", 16), mkStandingsRow("Forest", 17), mkStandingsRow("Luton", 18),
  mkStandingsRow("Burnley", 19), mkStandingsRow("Sheffield", 20)
];
const ctxPL = { payload: { standings: { PL: mkStandingsTable(plTeams) } } };

// mid-table match: both teams near the middle → 5-row window each, centered.
const midMatch = sw.matchStandingsWindow(mkSmS("Chelsea", "Tottenham", "PL"), ctxPL);
check(midMatch !== null && midMatch.length === 1,
  "S10 same-competition: both teams in the same competition's standings → ONE block (the unified window — spec §8: 'Use one unified competition table')");
const midBlock = midMatch && midMatch[0];
check(midBlock && midBlock.code === "PL" && midBlock.compFa === "TEST_COMP_FA" && midBlock.emblem === "https://example.com/emblem.png",
  "S10 block shape: the block carries the code + the compFa (st.faName || COMP_EN[code] || code — the teamStandingsWindow precedent) + the emblem (st.emblem || null)");
// Chelsea at pos 4, Tottenham at pos 5 → neighbourhoods [2,3,4,5,6] and [3,4,5,6,7]
// → overlapping → MERGE → the union [2,3,4,5,6,7] = 6 rows.
check(midBlock && midBlock.rows.length === 6 && !midBlock.rows.some((r) => r.ellipsis),
  "S10 merge overlapping: Chelsea (pos 4) + Tottenham (pos 5) → neighbourhoods [2-6] + [3-7] overlap → MERGE into the union [2-7] = 6 rows (NO ellipsis — the ranges overlap, spec §8: 'Merge overlapping or touching ranges')");
// the participant-mark: Chelsea + Tottenham are marked home + away.
const chelseaRow = midBlock && midBlock.rows.find((r) => r.team && r.team.name === "Chelsea");
const totRow = midBlock && midBlock.rows.find((r) => r.team && r.team.name === "Tottenham");
check(chelseaRow && chelseaRow.participant === "home" && totRow && totRow.participant === "away",
  "S10 participant-mark: the home (Chelsea) + away (Tottenham) rows carry participant='home'/'away'; every other row carries null (S11 applies the typography-only icy-blue highlight — decision 25, NO row background)");
// the non-participant rows carry null participant.
check(midBlock && midBlock.rows.filter((r) => r.team && r.participant === null).length === 4,
  "S10 participant-mark discipline: the 4 non-participant rows in the merged block carry participant=null (only the home+away rows are marked; the union's contextual rows are NOT marked)");

// (e) S10 the merge/touch/ellipsis boundary — three cases.
// TOUCH (gap 0 — adjacent): Arsenal (pos 1) vs Man City (pos 2) → neighbourhoods
// [1-5] + [1-5] → overlap (the windows are identical) → MERGE → 5 rows.
const touchMatch = sw.matchStandingsWindow(mkSmS("Arsenal", "Man City", "PL"), ctxPL);
const touchBlock = touchMatch && touchMatch[0];
check(touchBlock && touchBlock.rows.length === 5 && !touchBlock.rows.some((r) => r.ellipsis),
  "S10 touch adjacent: Arsenal (pos 1) + Man City (pos 2) → neighbourhoods [1-5] + [1-5] overlap → MERGE → 5 rows (no ellipsis — the ranges overlap, the union is contiguous)");
// TOUCH (gap 1 — one row between): Chelsea (pos 4) vs Man United (pos 6) →
// neighbourhoods [2-6] + [4-8] overlap (startB=4 <= endA=6) → MERGE → 7 rows.
const touch1Match = sw.matchStandingsWindow(mkSmS("Chelsea", "Man United", "PL"), ctxPL);
const touch1Block = touch1Match && touch1Match[0];
check(touch1Block && touch1Block.rows.length === 7 && !touch1Block.rows.some((r) => r.ellipsis),
  "S10 touch 1-row gap: Chelsea (pos 4) + Man United (pos 6) → neighbourhoods [2-6] + [4-8] overlap → MERGE → 7 rows (the gap row IS included — it's contextual between the two neighbourhoods, not 'intervening' in the separated-ranges sense)");
// SEPARATED (gap ≥ 2): Arsenal (pos 1) vs Everton (pos 15) → neighbourhoods
// [1-5] + [13-17] → gap = 13 - 6 = 7 (>= 2) → ELLIPSIS → 5 + 1 + 5 = 11 rows.
const sepMatch = sw.matchStandingsWindow(mkSmS("Arsenal", "Everton", "PL"), ctxPL);
const sepBlock = sepMatch && sepMatch[0];
check(sepBlock && sepBlock.rows.length === 11 && sepBlock.rows.filter((r) => r.ellipsis).length === 1,
  "S10 separated: Arsenal (pos 1) + Everton (pos 15) → neighbourhoods [1-5] + [13-17] gap >= 2 → ELLIPSIS sentinel + show both neighbourhoods (5 + 1 + 5 = 11 entries; the intervening teams are NOT loaded/displayed — spec §8: 'Use a discreet ellipsis when ranges are separated' + 'Do not load or display intervening teams')");
const sepEllipsis = sepBlock && sepBlock.rows.find((r) => r.ellipsis);
check(sepEllipsis && sepEllipsis.ellipsis === true && sepEllipsis.team === undefined,
  "S10 ellipsis sentinel shape: the sentinel row carries { ellipsis: true } with NO team data (S11 renders «⋯» with no pos/name/played/gd/points cells — the discreet separator)");
// the ellipsis sits BETWEEN the two neighbourhoods (after the home's 5 rows, before the away's 5 rows).
const sepEllipsisIdx = sepBlock ? sepBlock.rows.findIndex((r) => r.ellipsis) : -1;
check(sepEllipsisIdx === 5,
  "S10 ellipsis placement: the sentinel sits at index 5 (after the lower-positioned team's 5-row neighbourhood, before the higher-positioned team's 5-row neighbourhood — the standings order, top to bottom)");
// the participant-mark: Arsenal (home) is in the first neighbourhood, Everton (away) in the second.
const sepHome = sepBlock && sepBlock.rows.slice(0, 5).find((r) => r.team && r.team.name === "Arsenal");
const sepAway = sepBlock && sepBlock.rows.slice(6).find((r) => r.team && r.team.name === "Everton");
check(sepHome && sepHome.participant === "home" && sepAway && sepAway.participant === "away",
  "S10 separated participant-mark: the home (Arsenal) row in the first neighbourhood carries participant='home'; the away (Everton) row in the second neighbourhood carries participant='away' (the ellipsis sentinel carries no mark)");

// (f) S10 the edge cases — team at pos 1 (no rows above) + team at pos N (no
// rows below). The neighbourhood clamps at the table boundary (fewer than 5
// rows is acceptable at the edges; no fabricated rows).
const edgeTopMatch = sw.matchStandingsWindow(mkSmS("Arsenal", "Liverpool", "PL"), ctxPL);
// Arsenal (pos 1) + Liverpool (pos 3) → neighbourhoods [1-5] + [1-5] overlap → MERGE → 5 rows.
const edgeTopBlock = edgeTopMatch && edgeTopMatch[0];
check(edgeTopBlock && edgeTopBlock.rows.length === 5 && edgeTopBlock.rows[0].team.pos === 1,
  "S10 edge top: Arsenal (pos 1) → neighbourhood [1-5] (clamped at the table top — no rows above, no fabricated rows; the team's row ± 2 with edge clamping, the teamStandingsWindow precedent)");
// Sheffield (pos 20, last) + Burnley (pos 19) → BOTH at the table bottom →
// both neighbourhoods clamp to [16-20] (the team's row ± 2 with edge clamping:
// start = max(0, min(idx-2, max(0, len-5))) = max(0, min(17, 15)) = 15 → slice
// [15..20) = pos 16-20). The two neighbourhoods are IDENTICAL → overlap →
// MERGE → 5 rows (the union of two identical ranges is the same 5 rows). The
// last row is pos 20 (Sheffield, clamped at the bottom — no rows below, no
// fabricated rows; the spec's 'fewer than 5 rows is acceptable at the edges').
const edgeBotMatch = sw.matchStandingsWindow(mkSmS("Burnley", "Sheffield", "PL"), ctxPL);
const edgeBotBlock = edgeBotMatch && edgeBotMatch[0];
check(edgeBotBlock && edgeBotBlock.rows.length === 5 && edgeBotBlock.rows[edgeBotBlock.rows.length - 1].team.pos === 20,
  "S10 edge bottom: Sheffield (pos 20, last) + Burnley (pos 19) → both neighbourhoods clamp to [16-20] (start = max(0, min(idx-2, max(0, len-5))) = 15 → slice [15..20)) → IDENTICAL → MERGE → 5 rows; the last row is pos 20 (clamped at the table bottom — no rows below, no fabricated rows; the spec's 'fewer than 5 rows is acceptable at the edges')");

// (g) S10 the different-competition branch — both teams in DIFFERENT
// competitions (the rare cross-competition case: a friendly/super-cup between
// teams from different leagues). Two separate blocks (one per competition).
const saTeams = [
  mkStandingsRow("Inter", 1), mkStandingsRow("Milan", 2), mkStandingsRow("Juventus", 3),
  mkStandingsRow("Napoli", 4), mkStandingsRow("Roma", 5), mkStandingsRow("Lazio", 6),
  mkStandingsRow("Atalanta", 7), mkStandingsRow("Fiorentina", 8), mkStandingsRow("Bologna", 9),
  mkStandingsRow("Torino", 10)
];
const ctxDiff = { payload: { standings: { PL: mkStandingsTable(plTeams), SA: mkStandingsTable(saTeams) } } };
// Arsenal (PL) vs Inter (SA) — different competitions → two blocks.
const diffMatch = sw.matchStandingsWindow(mkSmS("Arsenal", "Inter", "PL"), ctxDiff);
check(diffMatch !== null && diffMatch.length === 2,
  "S10 different-competition: home (Arsenal, PL) + away (Inter, SA) in DIFFERENT competitions → TWO blocks (the rare cross-competition case — one block per team's competition; spec §8: 'Use one unified competition table' — each competition gets its own table when the teams play in different leagues)");
const diffHome = diffMatch && diffMatch.find((b) => b.code === "PL");
const diffAway = diffMatch && diffMatch.find((b) => b.code === "SA");
check(diffHome && diffAway && diffHome.rows.some((r) => r.team && r.team.name === "Arsenal" && r.participant === "home") &&
  diffAway.rows.some((r) => r.team && r.team.name === "Inter" && r.participant === "away"),
  "S10 different-competition blocks: the PL block carries Arsenal (participant='home'); the SA block carries Inter (participant='away') — each team's neighbourhood in its own competition's table");

// (h) S10 the fail-closed gate — returns null when:
//   - the standings cache is missing (covers cups/KO — no league table).
//   - st.started === false (pre-season — FD roster-alphabetical, no matches played).
//   - the table has <2 teams (degenerate).
//   - NEITHER team is found in the table.
// cups/KO: a cup competition (FA_CUP) has no standings_cache entry → null.
const ctxCup = { payload: { standings: {} } };
const cupMatch = sw.matchStandingsWindow(mkSmS("Arsenal", "Chelsea", "FA_CUP"), ctxCup);
check(cupMatch === null,
  "S10 fail-closed cups/KO: the fixture's competition (FA_CUP) has no standings_cache entry → null (cups/KO have no league table — the audit §67: 'cups/KO → not applicable'; the missing-cache gate handles them naturally; the mcentre-standings section is omitted, the جدول nav item stays filtered out)");
// pre-season: the table exists but started === false → null.
const ctxPre = { payload: { standings: { PL: mkStandingsTable(plTeams, false) } } };
const preMatch = sw.matchStandingsWindow(mkSmS("Arsenal", "Chelsea", "PL"), ctxPre);
check(preMatch === null,
  "S10 fail-closed pre-season: the table exists but st.started === false → null (pre-season — FD roster-alphabetical, no matches played; the audit §67: 'pre-season (started:false) → drop section fail-closed'; the public-matches.ts/digest-weekly.ts/seo/markup.ts gates use the same flag)");
// degenerate: the table has <2 teams → null.
const ctxDegen = { payload: { standings: { PL: mkStandingsTable([mkStandingsRow("Arsenal", 1)]) } } };
const degenMatch = sw.matchStandingsWindow(mkSmS("Arsenal", "Chelsea", "PL"), ctxDegen);
check(degenMatch === null,
  "S10 fail-closed degenerate: the table has <2 teams → null (a 1-team table is not a table; the fail-closed gate)");
// neither team found: the table exists but neither team is in it → null.
const ctxNotFound = { payload: { standings: { PL: mkStandingsTable([mkStandingsRow("Real Madrid", 1), mkStandingsRow("Barcelona", 2), mkStandingsRow("Atletico", 3), mkStandingsRow("Sevilla", 4), mkStandingsRow("Valencia", 5)]) } } };
const notFoundMatch = sw.matchStandingsWindow(mkSmS("Arsenal", "Chelsea", "PL"), ctxNotFound);
check(notFoundMatch === null,
  "S10 fail-closed neither team: the table exists but neither participating team is in it → null (the team isn't in this competition's standings; no fabricated rows; the no-empty-cards law — the section is omitted)");

// (i) S10 only ONE team found → a single-team window (the spec's "five-row
// neighbourhood around each participating team" doesn't require BOTH to be
// found — show the ones we CAN find, no fabricated rows). The home team is in
// the PL table; the away team is NOT (a lower-division side not covered).
const ctxOne = { payload: { standings: { PL: mkStandingsTable(plTeams) } } };
const oneMatch = sw.matchStandingsWindow(mkSmS("Arsenal", "Real Madrid", "PL"), ctxOne);
check(oneMatch !== null && oneMatch.length === 1 && oneMatch[0].code === "PL",
  "S10 single-team: only the home team (Arsenal) is found in the PL table; the away (Real Madrid) is NOT in any standings_cache → a single-team window (ONE block, the home team's 5-row neighbourhood; the spec's 'five-row neighbourhood around each participating team' doesn't require BOTH to be found — show the ones we CAN find, no fabricated rows)");
const oneBlock = oneMatch && oneMatch[0];
check(oneBlock && oneBlock.rows.some((r) => r.team && r.team.name === "Arsenal" && r.participant === "home") &&
  !oneBlock.rows.some((r) => r.participant === "away"),
  "S10 single-team mark: the home (Arsenal) row carries participant='home'; no row carries participant='away' (the away team isn't in the standings — no fabricated mark)");

// (j) S10 the column projection discipline — the selection returns the FULL
// row data (the raw standings_cache row: pos/name/faName/crest/points/played/
// won/draw/lost/gf/ga); S11's renderer projects the 5 visible columns (pos |
// team+crest | played | gd=gf-ga | points). The won/draw/lost/gf/ga stay in
// the cache, NOT displayed by S11 (the spec's "Do not load or display
// intervening teams" discipline extends to columns: only the 5 visible columns
// surface).
const projBlock = midBlock;
check(projBlock && projBlock.rows.every((r) => !r.ellipsis ? (
  r.team && typeof r.team.pos === "number" && typeof r.team.name === "string" &&
  "faName" in r.team && "crest" in r.team && "points" in r.team &&
  "played" in r.team && "won" in r.team && "draw" in r.team && "lost" in r.team &&
  "gf" in r.team && "ga" in r.team
) : true),
  "S10 column projection: the selection returns the FULL row data (pos/name/faName/crest/points/played/won/draw/lost/gf/ga — the audit §R3 full-row shape); S11's renderer projects the 5 visible columns (pos | team+crest | played | gd=gf-ga | points) — the selection is pure DATA, the renderer is pure presentation (decision 4 — the S04 hero projection precedent)");
// gd is NOT pre-computed by the selection — S11 computes it (gf-ga).
check(!projBlock || !projBlock.rows.some((r) => r.team && "gd" in r.team),
  "S10 no pre-computed gd: the selection does NOT pre-compute gd (gf-ga) — the row carries gf + ga, S11's renderer computes gd (keeps the selection pure data; the spec's 'تفاضل' column = gf-ga is a presentation concern)");

// (k) S10 the fullByCode precedence — when fullByCode has the fixture's code,
// it wins over the payload's top-8 compact (the freshest, complete source —
// the teamStandingsWindow precedent). A rank-9+ team invisible to the top-8
// compact is found via fullByCode.
const compactTeams = plTeams.slice(0, 8); // the payload compact only carries the top-8
const fullByCodeFull = { PL: mkStandingsTable(plTeams) }; // the full cached table (all 20 teams)
const ctxCompact = { payload: { standings: { PL: mkStandingsTable(compactTeams) } } };
// Burnley is at pos 19 — invisible to the top-8 compact (which only has pos 1-8),
// visible to the full table. The lookup must find Burnley via fullByCode (the
// full table wins over the compact per the teamStandingsWindow precedent).
const rank19Match = sw.matchStandingsWindow(mkSmS("Burnley", "Sheffield", "PL"), ctxCompact, fullByCodeFull);
const rank19Block = rank19Match && rank19Match[0];
check(rank19Block && rank19Block.code === "PL" &&
  rank19Block.rows.some((r) => r.team && r.team.name === "Burnley" && r.participant === "home") &&
  rank19Block.rows.some((r) => r.team && r.team.name === "Sheffield" && r.participant === "away"),
  "S10 fullByCode precedence: the full cached table (fullByCode) wins over the payload's top-8 compact — a rank-19 team (Burnley, invisible to the top-8) is found via fullByCode; the teamStandingsWindow precedent (the full table is the freshest, complete source — already loaded by buildMatchPage's fullByCodeFor)");

// (l) S10 buildMatchPage's await count stays 3 — the standings-window module
// adds ZERO awaits (the zero-runtime-cost law). The S08 cost law already gates
// this for the narrative engine; S10 re-asserts it for the standings-window.
// (The existing cost-law check above already asserts awaitCount === 3 — S10
// does NOT touch buildMatchPage, so the await count stays 3 by construction.
// This re-assertion documents the S10 contribution to the cost law.)
check(awaitCount === 3,
  "S10 await count: buildMatchPage's await count stays 3 (hydrateMatchVenue, loadArchive, fullByCodeFor — the pre-existing loads; the standings-window module is pure logic reading the already-loaded standings_cache + fullByCode — ZERO new awaits; the zero-runtime-cost law holds; S10 does NOT touch buildMatchPage)");

// (m) S10 the team-page path stays byte-frozen — teamStandingsWindow in
// data.ts is NOT modified (the S10 unified-window computes both neighbourhoods
// directly; the team-page path stays byte-frozen).
const dataSrc = read("src/seo/data.ts");
check(/export function teamStandingsWindow\(ctx: SeoCtx, teamName: string, next: SeoMatch \| null, fullByCode\?: Record<string, any>\): \{ code: string; compFa: string; emblem: string \| null; rows: any\[\]; meIdx: number \} \| null/.test(dataSrc),
  "S10 team-page frozen: teamStandingsWindow in src/seo/data.ts is byte-frozen (the team-page standings path stays untouched; the unified-window for the match page computes both neighbourhoods directly from the standings_cache rows — the spec's S10/S11 split: the team-page renderer buildStandingsWindowHtml stays byte-frozen too, used on team pages)");

// (n) S10 the composer stays the S02 pure leaf — the mcentre-standings slot +
// MatchCentreParts.standings? exist since S02 (the slot is wired to receive
// the pre-built window STRING in S11; S10 ships the SELECTION logic only, the
// mcentre-standings section stays empty this session — the جدول nav item stays
// filtered out until S11).
check(/standings\?: string;.*\/\/ five-row context windows \(S10\/S11\)/.test(mcSrc),
  "S10 composer slot: MatchCentreParts.standings? (the slot + the mcentre-standings section + label «جدول رقابت») exist since S02 — S10 ships the SELECTION logic + the tests only; S11 wires the renderer + passes the pre-built window string to the composer (the S10/S11 split: selection vs rendering)");
// the composer has NO runtime imports (the S02 cost law — S10 does NOT break this).
check(!/^\s*import (?!type )/m.test(mcSrc),
  "S10 composer purity: match-centre.ts has NO runtime imports (the S02 pure-leaf law holds — the standings-window module is imported by pages.ts in S11, NOT by the composer; the composer stays the pure leaf)");

// ---------- 12. S11 (M4): the standings rendering + CSS (M4, session 2 of 2) ----------
// specification §8 (Competition standings) + milestones-and-sessions.md M4/S11.
// S11 ships the RENDERING (the unified table markup + the participant highlight +
// the responsive mobile layout + the CSS) + the composer wiring. S10 shipped the
// pure SELECTION logic (matchStandingsWindow) + the tests; S11 renders the S10
// selection's output. The S10/S11 split = selection (pure DATA) vs rendering
// (pure PRESENTATION). The team-page buildStandingsWindowHtml stays byte-frozen
// (the match-page buildStandingsHtml is a NEW function — the S04 hero precedent:
// pages.ts builds the HTML string, the composer wraps it in the mcentre-standings
// anchor).

// a toFaDigits helper for computing the expected Persian-digit strings.
function s11FaDigits(s) { return String(s == null ? "" : s).replace(/\d/g, function (d) { return "\u06F0\u06F1\u06F2\u06F3\u06F4\u06F5\u06F6\u06F7\u06F8\u06F9"[d]; }); }

// (a) S11 the contract — pages.ts exports buildStandingsHtml. Extract the REAL
// renderer via ts.transpileModule with stubbed deps (the s05DateHelpers pattern —
// the S08 narrative + the S10 standings-window precedent). The stubs let the
// tests control toFaDigits + esc + M.nameHtml (the 3 deps buildStandingsHtml
// uses); the rest of pages.ts's imports are stubbed as no-ops (buildStandingsHtml
// never calls them — only buildMatchPage/buildTeamPage/etc. do, and those are
// never invoked during the renderer tests).
function standingsRendererEngine() {
  const ts = require(path.join(root, "node_modules", "typescript"));
  const src = fs.readFileSync(path.join(root, "src", "seo", "pages.ts"), "utf8")
    .replace(/^import\s+[^;]+;\n?/gm, "")
    .replace(/^export\s+/gm, "");
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.None, target: "ES2020" } }).outputText;
  const stubs = {
    // the 3 real stubs buildStandingsHtml uses:
    toFaDigits: function (s) { return s11FaDigits(s); },
    esc: function (s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;"); },
    M: { nameHtml: function (s) { return String(s == null ? "" : s); } },
    // no-op stubs for all other imports (never called by buildStandingsHtml —
    // only by buildMatchPage/buildTeamPage/etc. which are never invoked here):
    SEO: {}, absUrl: function () { return ""; }, matchPath: function () { return ""; }, compSlug: function () { return ""; }, teamSlug: function () { return ""; },
    faTime: function () { return ""; }, faDateD1: function () { return ""; }, faDateD2: function () { return ""; }, tehranDayKey: function () { return ""; }, utcTime: function () { return ""; }, statusLabelFa: function () { return ""; }, weekendWindowTehran: function () { return null; },
    COMP_EN: {},
    upcomingBig: function () { return []; }, upcomingFollowed: function () { return []; }, isBigForSeo: function () { return false; }, finishedRecent: function () { return []; }, teamMatches: function () { return { upcoming: [], finished: [] }; }, compMatches: function () { return []; }, teamsIndex: function () { return []; }, compsIndex: function () { return []; }, findMatchBySlug: function () { return null; }, findTeamBySlug: function () { return null; }, payloadTop3: function () { return {}; }, hydrateMatchVenue: async function () { return null; }, similarMatches: function () { return []; }, teamStandingsWindow: function () { return null; }, teamForm: function () { return null; }, teamSeasonRecord: function () { return null; }, heroArtSrv: function () { return null; },
    JL: {}, buildHead: function () { return ""; }, pageShell: function () { return ""; },
    seoTeamFaName: function (t) { return (t && (t.faName || t.name)) || ""; }, seoTeamAltName: function () { return null; },
    matchCentreMain: function () { return ""; }, matchHeroHtml: function () { return ""; }, matchSummaryHtml: function () { return ""; },
    narrativeHtml: function () { return ""; }, matchStandingsWindow: function () { return null; },
    loadArchive: async function () { return []; }, fetchStandings: async function () { return null; }, translateTeam: function () { return ""; }
  };
  return new Function(...Object.keys(stubs), js + "\nreturn { buildStandingsHtml };")(...Object.values(stubs));
}
const sr = standingsRendererEngine();
check(typeof sr.buildStandingsHtml === "function",
  "S11 contract: pages.ts exports buildStandingsHtml (the match-page standings renderer — the S10/S11 split: the renderer is a NEW function in pages.ts; the team-page buildStandingsWindowHtml stays byte-frozen)");

// (b) S11 the null → "" fail-closed — when matchStandingsWindow returns null
// (the S10 fail-closed gate: cups/KO / pre-season / degenerate / neither team
// found), buildStandingsHtml returns "" (the no-empty-cards law — the
// composer's sectionHtml omits the mcentre-standings section; the جدول nav
// item stays filtered out).
check(sr.buildStandingsHtml(null) === "",
  "S11 null fail-closed: null → \"\" (the S10 fail-closed gate — the renderer returns \"\" when the selection returns null; the composer's sectionHtml omits the mcentre-standings section; the جدول nav item stays filtered out)");
check(sr.buildStandingsHtml([]) === "",
  "S11 empty fail-closed: [] → \"\" (the empty-window case — the renderer returns \"\" when the selection returns an empty array; the no-empty-cards law)");

// (c) S11 the 5 visible columns — رتبه | تیم | بازی | تفاضل | امتیاز. Reuse the
// S10 fake data + the S10 selection to produce real StandingsWindow objects,
// then render them. The mid-table match (Chelsea vs Tottenham, both in PL).
const s11MidWindow = sw.matchStandingsWindow(mkSmS("Chelsea", "Tottenham", "PL"), ctxPL);
const s11MidHtml = sr.buildStandingsHtml(s11MidWindow);
check(s11MidHtml.indexOf('class="stbox stwin"') > -1 && s11MidHtml.indexOf('class="stbox-head"') > -1,
  "S11 box: the renderer wraps the table in .stbox.stwin + .stbox-head (reuses the team-page + competition-page vocabulary — shared CSS, consistent visual language across the site; the S03 foundation precedent — no new vocabulary when the existing one fits)");
check(s11MidHtml.indexOf('class="sthead"') > -1 && s11MidHtml.indexOf("\u0628\u0627\u0632\u06CC") > -1 && s11MidHtml.indexOf("\u062A\u0641\u0627\u0636\u0644") > -1 && s11MidHtml.indexOf("\u0627\u0645\u062A\u06CC\u0627\u0632") > -1,
  "S11 column headers: the .sthead row carries \u0628\u0627\u0632\u06CC (played) + \u062A\u0641\u0627\u0636\u0644 (gd) + \u0627\u0645\u062A\u06CC\u0627\u0632 (points) headers — the 3 number-column headers (the pos + name columns carry no text header — .sthead-fill spans them, the position number + team name are self-evident)");
// NO W/D/L column (the spec's 5 columns don't include it)
check(s11MidHtml.indexOf("stwdl") === -1 && s11MidHtml.indexOf("sthead-wdl") === -1,
  "S11 no W/D/L: the match-page renderer does NOT carry the .stwdl / .sthead-wdl column (the spec's 5 visible columns are pos | team | played | gd | points — no W/D/L; the team-page buildStandingsWindowHtml keeps it, the match-page renderer omits it)");
// NO .stmore link (spec §8: "Static table: no expandable rows, team-page navigation or extra controls")
check(s11MidHtml.indexOf("stmore") === -1,
  "S11 no stmore: the match-page renderer does NOT carry the .stmore 'full table' link (spec \u00A78: 'Static table: no expandable rows, team-page navigation or extra controls' — the match-page table is a read-only context window, not a navigation surface; the team-page buildStandingsWindowHtml keeps its .stmore link)");
// NO .ucl-hidem on the played column (spec §8: "keep all five columns visible" on mobile)
check(s11MidHtml.indexOf("ucl-hidem") === -1,
  "S11 no ucl-hidem: the played column does NOT carry .ucl-hidem (spec \u00A78: 'keep all five columns visible; no hidden columns' — the played column stays visible on mobile; the team-page buildStandingsWindowHtml uses .ucl-hidem, the match-page renderer does not)");
// the 5 cells per data row: stpos | stname | stnum | stnum stgd | stpts
check(s11MidHtml.indexOf('class="stpos') > -1 && s11MidHtml.indexOf('class="stname"') > -1 && s11MidHtml.indexOf('class="stnum"') > -1 && s11MidHtml.indexOf('class="stnum stgd"') > -1 && s11MidHtml.indexOf('class="stpts"') > -1,
  "S11 5 columns: each data row carries .stpos (rank) + .stname (team) + .stnum (played) + .stnum.stgd (gd) + .stpts (points) — the 5 visible columns (spec \u00A78: \u0631\u062A\u0628\u0647 | \u062A\u06CC\u0645 | \u0628\u0627\u0632\u06CC | \u062A\u0641\u0627\u0636\u0644 | \u0627\u0645\u062A\u06CC\u0627\u0632)");
// the Persian digits: pos/played/gd/points render with toFaDigits
check(s11MidHtml.indexOf(s11FaDigits("4")) > -1 && s11MidHtml.indexOf(s11FaDigits("10")) > -1 && s11MidHtml.indexOf(s11FaDigits("16")) > -1,
  "S11 Persian digits: the pos/played/points render with toFaDigits (the site-wide convention — the existing buildStandingsWindowHtml uses it; Chelsea pos=4 \u2192 \u00AB\u06F4\u00BB, played=10 \u2192 \u00AB\u06F1\u06F0\u00BB, points=16 \u2192 \u00AB\u06F1\u06F6\u00BB)");

// (d) S11 the participant-mark typography — the home (Chelsea) + away (Tottenham)
// rows carry .strow-participant (typography-only — decision 25; NO .strow-me
// background). The CSS in page-shell.ts applies font-weight:600 + #7dd3fc to
// .stname + the icy-blue color to .stpos (NO background, NO border).
check((s11MidHtml.match(/strow strow-participant/g) || []).length === 2,
  "S11 participant-mark: the home (Chelsea) + away (Tottenham) rows carry .strow-participant (the typography-only class — decision 25; 2 participant rows in the merged block)");
check(s11MidHtml.indexOf("strow-me") === -1,
  "S11 no strow-me: the match-page participant-mark is typography-only (.strow-participant — font-weight:600 + icy-blue color, NO background); the .strow-me background the team-page uses is NOT applied (decision 25 — the team-page path stays byte-frozen; the match-page participant-mark is scoped to #mcentre-standings)");

// (e) S11 the gd computation (gf - ga) + the sign convention. The fake rows
// carry gf = 20-pos, ga = pos. Chelsea (pos 4): gf=16, ga=4 → gd=+12 → «+۱۲».
// Positive shows "+", zero shows "۰", negative shows "-" (the toFaDigits
// default — the Latin hyphen-minus, the existing site convention).
const chelseaGd = (20 - 4) - 4;  // = 12
check(s11MidHtml.indexOf("+" + s11FaDigits(String(chelseaGd))) > -1,
  "S11 gd positive: Chelsea (gf=16, ga=4) \u2192 gd = +12 \u2192 rendered as \u00AB+" + s11FaDigits("12") + "\u00BB (the gd = gf-ga computation + the + sign for positive gd + Persian digits via toFaDigits — the spec's '\u062A\u0641\u0627\u0636\u0644' column = gf-ga is S11's job; the selection does NOT pre-compute gd [S10 decision 5] — the renderer computes it [decision 4, the S04 hero projection precedent])");
// negative gd: Everton (pos 15): gf=5, ga=15 → gd=-10 → «-۱۰»
const s11SepWindow = sw.matchStandingsWindow(mkSmS("Arsenal", "Everton", "PL"), ctxPL);
const s11SepHtml = sr.buildStandingsHtml(s11SepWindow);
const evertonGd = (20 - 15) - 15;  // = -10
check(s11SepHtml.indexOf(s11FaDigits(String(evertonGd))) > -1,
  "S11 gd negative: Everton (gf=5, ga=15) \u2192 gd = -10 \u2192 rendered as \u00AB" + s11FaDigits("-10") + "\u00BB (the Latin hyphen-minus — the toFaDigits default; the existing site convention — toFaDigits replaces [0-9] only, not the sign; no U+2212 override)");
// zero gd: a team with gf === ga → gd = 0 → «۰» (no + sign for zero)
const zeroGdRow = mkStandingsRow("TestZero", 1, { gf: 5, ga: 5 });
const zeroGdTable = mkStandingsTable([zeroGdRow, mkStandingsRow("OtherTeam", 2, { gf: 10, ga: 5 })]);
const zeroGdCtx = { payload: { standings: { PL: zeroGdTable } } };
const zeroGdHtml = sr.buildStandingsHtml(sw.matchStandingsWindow(mkSmS("TestZero", "OtherTeam", "PL"), zeroGdCtx));
check(zeroGdHtml.indexOf('stnum stgd">' + s11FaDigits("0") + '<') > -1,
  "S11 gd zero: a team with gf === ga \u2192 gd = 0 \u2192 rendered as \u00AB\u06F0\u00BB in the .stgd cell (no + sign for zero — only positive shows +; zero shows the bare Persian digit; the assertion checks the specific .stgd cell, not just \u00AB\u06F0\u00BB which also appears in played=10 \u2192 \u00AB\u06F1\u06F0\u00BB)");
check(zeroGdHtml.indexOf('stnum stgd">+' + s11FaDigits("0") + '<') === -1,
  "S11 gd zero no-plus: the zero-gd cell does NOT carry a + sign (only positive gd shows +; zero + negative show no + sign)");

// (f) S11 the ellipsis sentinel rendering — the { ellipsis: true } sentinel
// renders as «⋯» (U+22EF) centered, spanning all 5 columns. The separated match
// (Arsenal vs Everton) has an ellipsis sentinel between the two neighbourhoods.
check(s11SepHtml.indexOf("strow-ellipsis") > -1 && s11SepHtml.indexOf("stellipsis") > -1,
  "S11 ellipsis rendering: the { ellipsis: true } sentinel renders as .strow-ellipsis + .stellipsis (\u00AB\u22EF\u00BB U+22EF centered, spanning all 5 columns — the discreet separator between separated neighbourhoods; spec \u00A78: 'Use a discreet ellipsis when ranges are separated')");
check(s11SepHtml.indexOf("\u22EF") > -1,
  "S11 ellipsis glyph: the sentinel renders \u00AB\u22EF\u00BB (U+22EF — the midline horizontal ellipsis; the S10 sentinel shape { ellipsis: true } \u2192 S11's discreet visual)");
check(s11SepHtml.indexOf('aria-hidden="true"') > -1,
  "S11 ellipsis aria-hidden: the sentinel carries aria-hidden=\"true\" (decorative — screen readers skip it; the table is still navigable by the real rows)");

// (g) S11 the crest rendering — the standings_cache rows carry a crest URL.
// The renderer renders it as a small <img class="stcrest"> anchored to the
// team name (the .stname.haslogo variant — display:flex + gap + .sttxt).
const crestRow = mkStandingsRow("Arsenal", 1, { crest: "https://example.com/arsenal.png" });
const crestRow2 = mkStandingsRow("Man City", 2, { crest: "https://example.com/city.png" });
const crestTable = mkStandingsTable([crestRow, crestRow2, mkStandingsRow("Liverpool", 3), mkStandingsRow("Chelsea", 4), mkStandingsRow("Tottenham", 5)]);
const crestCtx = { payload: { standings: { PL: crestTable } } };
const crestHtml = sr.buildStandingsHtml(sw.matchStandingsWindow(mkSmS("Arsenal", "Man City", "PL"), crestCtx));
check(crestHtml.indexOf('class="stname haslogo"') > -1 && crestHtml.indexOf('class="stcrest"') > -1 && crestHtml.indexOf('class="sttxt"') > -1,
  "S11 crest rendering: the crest <img> rides .stname.haslogo + .stcrest + .sttxt (the versioned stylesheet's crest-capable .stname variant — display:flex + gap + the text wrapper; the crest is anchored to the team name)");
check(crestHtml.indexOf('loading="lazy"') > -1 && crestHtml.indexOf('decoding="async"') > -1 && crestHtml.indexOf('referrerpolicy="no-referrer"') > -1,
  "S11 crest attributes: the crest <img> carries loading=\"lazy\" + decoding=\"async\" + referrerpolicy=\"no-referrer\" (the S05 hero portrait precedent — CLS-neutral + privacy + no extra requests)");
check(crestHtml.indexOf('alt=""') > -1,
  "S11 crest alt: the crest <img> carries alt=\"\" (decorative — the team name is the accessible name; the crest is visual context only)");
check(crestHtml.indexOf('onerror="this.remove()"') > -1,
  "S11 crest onerror: the crest <img> carries onerror=\"this.remove()\" (a failed crest removes just itself — NOT a both-portrait walk; the standings crest is independent per row, the both-or-neither law is the HERO's only)");
check(crestHtml.indexOf('width="16" height="16"') > -1,
  "S11 crest size: the crest <img> carries width=\"16\" height=\"16\" (16px desktop — the S11 CSS block in page-shell.ts drops it to 14px at the 600px mobile breakpoint; CLS-neutral — the fixed square box)");

// (h) S11 the two-block case (different-competition) — TWO .stbox.stwin tables
// stacked (one per block, each with its own competition header). The rare
// cross-competition case (Arsenal PL vs Inter SA).
const s11DiffWindow = sw.matchStandingsWindow(mkSmS("Arsenal", "Inter", "PL"), ctxDiff);
const s11DiffHtml = sr.buildStandingsHtml(s11DiffWindow);
check((s11DiffHtml.match(/class="stbox stwin"/g) || []).length === 2,
  "S11 two-block case: different-competition \u2192 TWO .stbox.stwin tables (one per block, stacked vertically — the rare cross-competition case; spec \u00A78: 'Use one unified competition table' — each competition gets its own table when the teams play in different leagues)");
check((s11DiffHtml.match(/class="stbox-head"/g) || []).length === 2,
  "S11 two-block headers: each of the two tables carries its own .stbox-head competition header (the PL block + the SA block — each with its own emblem + compFa)");

// (i) S11 the competition header — the block's compFa + emblem render as a
// header row ABOVE the table (reuse .stbox-head). The fake table's compFa is
// "TEST_COMP_FA" + the emblem is "https://example.com/emblem.png".
check(s11MidHtml.indexOf("TEST_COMP_FA") > -1 && s11MidHtml.indexOf("https://example.com/emblem.png") > -1,
  "S11 competition header: the block's compFa + emblem render as .stbox-head (the emblem <img> + the compFa text — reuses the team-page + competition-page vocabulary; byte-identical header shape to buildStandingsWindowHtml)");

// (j) S11 the fail-closed renders "" for the S10 null cases (cups/KO + pre-season
// + degenerate + neither team). The renderer respects the S10 gate — null → "".
check(sr.buildStandingsHtml(sw.matchStandingsWindow(mkSmS("Arsenal", "Chelsea", "FA_CUP"), ctxCup)) === "",
  "S11 fail-closed cups/KO: the FA_CUP match (no standings_cache) \u2192 S10 returns null \u2192 S11 renders \"\" (the mcentre-standings section is omitted; the جدول nav item stays filtered out)");
check(sr.buildStandingsHtml(sw.matchStandingsWindow(mkSmS("Arsenal", "Chelsea", "PL"), ctxPre)) === "",
  "S11 fail-closed pre-season: the PL table with started===false \u2192 S10 returns null \u2192 S11 renders \"\"");
check(sr.buildStandingsHtml(sw.matchStandingsWindow(mkSmS("Arsenal", "Chelsea", "PL"), ctxDegen)) === "",
  "S11 fail-closed degenerate: the 1-team table \u2192 S10 returns null \u2192 S11 renders \"\"");
check(sr.buildStandingsHtml(sw.matchStandingsWindow(mkSmS("Arsenal", "Chelsea", "PL"), ctxNotFound)) === "",
  "S11 fail-closed neither team: neither team in the table \u2192 S10 returns null \u2192 S11 renders \"\"");

// (k) S11 the composer wiring — buildMatchPage calls matchStandingsWindow +
// buildStandingsHtml + passes standings: standingsHtml to matchCentreMain AND
// matchNavHtml. The standings string feeds BOTH the nav (so the جدول nav item
// renders when non-empty) AND the composer (so the mcentre-standings section
// wraps it).
check(/import \{ matchStandingsWindow, type StandingsWindow \} from "\.\/standings-window";/.test(pagesSrc),
  "S11 wiring import: pages.ts imports matchStandingsWindow + the StandingsWindow type from ./standings-window (the S10 module — already loaded; fullByCode is already loaded by the pre-existing fullByCodeFor await)");
check(/const standingsHtml = buildStandingsHtml\(matchStandingsWindow\(sm, ctx, fullByCode\)\)/.test(pagesSrc),
  "S11 wiring call: buildMatchPage calls matchStandingsWindow(sm, ctx, fullByCode) + buildStandingsHtml(window) — the S10 selection runs HERE (pure logic, zero new awaits), the renderer projects the 5 visible columns (pure string composition, zero new awaits)");
check(/matchNavHtml\(\{ summary: summaryHtml, standings: standingsHtml, form: formPartHtml, venue: venueHtml, schedule: scheduleHtml \}\)/.test(pagesSrc),
  "S11 wiring nav: the standings string is passed to matchNavHtml ({ standings: standingsHtml }) so the nav's adaptive Q9=B filter renders the جدول nav item when the standings part is non-empty (S12 co-evolution: the form part is the matchFormHtml render; S13 co-evolution: the form part is now the COMBINED formPartHtml — the form card + the metrics card — the same adaptive filter renders the فرم nav item when EITHER renders, decision S13-1; S14 co-evolution: the nav call now also passes venue: venueHtml, schedule: scheduleHtml — the ورزشگاه + بازی‌ها nav items join the same adaptive filter, decision S14-2: the pre-existing slots reused)");
check(/standings: standingsHtml,/.test(pagesSrc),
  "S11 wiring composer: the standings string is passed to matchCentreMain ({ standings: standingsHtml }) so the composer wraps it in the mcentre-standings anchor (the S04 hero precedent — pages.ts builds the string, the composer wraps it)");

// (l) S11 the cost law — the renderer is pure string composition. Extract
// JUST the buildStandingsHtml function source (brace-matched) + check it for
// AI/network/KV/timer/polling code. The whole pages.ts has legitimate fetch/KV
// calls in OTHER functions (buildCompetitionPage etc.) — checking the whole
// file would false-positive; the cost law is scoped to the RENDERER only.
function extractFnSrc(src, name) {
  var re = new RegExp("function " + name + "\\(");
  var m = re.exec(src);
  if (!m) return null;
  var start = m.index;
  var braceIdx = src.indexOf("{", start);
  var depth = 0, end = -1;
  for (var i = braceIdx; i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}") { depth--; if (depth === 0) { end = i; break; } }
  }
  return end < 0 ? null : src.slice(start, end + 1);
}
const bshSrc = extractFnSrc(pagesSrc, "buildStandingsHtml");
const bshStripped = bshSrc ? String(bshSrc).replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "") : "";
check(bshSrc != null && !/fetch\(|XMLHttpRequest|new Image|setTimeout|setInterval|addEventListener|\.get\(|\.put\(|env\.STATE|env\.AI|AI\.run|generateText|chat\.completions/i.test(bshStripped),
  "S11 cost law: the buildStandingsHtml function carries NO AI/network/KV/timer/polling code (the S08 zero-runtime-cost law — the renderer is pure string composition reading the S10 selection's pre-built window DATA; zero new awaits, zero new KV reads, zero new fetches; the cost check is scoped to the RENDERER function — pages.ts's other functions [buildCompetitionPage etc.] keep their legitimate fetch/KV calls, the renderer does not)");
check(awaitCount === 3,
  "S11 await count: buildMatchPage's await count stays 3 (hydrateMatchVenue, loadArchive, fullByCodeFor — the pre-existing loads; the S11 renderer is pure string composition reading the S10 selection's pre-built window DATA — ZERO new awaits; the zero-runtime-cost law holds)")

// (m) S11 the team-page path stays byte-frozen — buildStandingsWindowHtml in
// pages.ts is NOT modified (the match-page buildStandingsHtml is a NEW function;
// the team-page renderer stays byte-frozen, used on team pages).
check(/function buildStandingsWindowHtml\(stw: \{ code: string; compFa: string; emblem: string \| null; rows: any\[\]; meIdx: number \}\): string/.test(pagesSrc),
  "S11 team-page frozen: buildStandingsWindowHtml in pages.ts is byte-frozen (the team-page standings renderer stays untouched; the match-page buildStandingsHtml is a NEW function — the S10/S11 split: the team-page path is untouched)");
check(/function buildStandingsHtml\(window: StandingsWindow\): string/.test(pagesSrc),
  "S11 renderer home: buildStandingsHtml is a NEW function in pages.ts (the match-page renderer — distinct from the team-page buildStandingsWindowHtml; the S04 hero precedent: pages.ts builds the HTML string, the composer wraps it)");

// (n) S11 the CSS — the .mcentre-standings block rides page-shell.ts AFTER S08
// and BEFORE the S03 foundation (chronological session order: S04 → S05 → S06
// → S07 → S08 → S11 → S03). Scoped to #mcentre-standings; logical properties
// only; the block's own icy/navy tokens, zero new assets/requests.
// (shellSrc is already loaded at the top of the file — line 98.)
// the S11 block sits AFTER the S08 block (.mcentre-nar-secondary) and BEFORE the S03 block
check(shellSrc.indexOf(".mcentre-narrative p.mcentre-nar-secondary") < shellSrc.indexOf("Match Centre S11 (M4)") && shellSrc.indexOf("Match Centre S11 (M4)") < shellSrc.indexOf("Match Centre S03 (M1)"),
  "S11 CSS placement: the S11 style block rides page-shell.ts AFTER S08 (.mcentre-nar-secondary) and BEFORE S03 (the responsive/spacing/RTL foundation) — chronological session order: S04 → S05 → S06 → S07 → S08 → S11 → S03");
// the participant-mark typography — font-weight:600 + #7dd3fc on .stname, #7dd3fc on .stpos, NO background
check(/#mcentre-standings \.strow\.strow-participant \.stname\{font-weight:600;color:#7dd3fc\}/.test(shellSrc),
  "S11 CSS participant name: the participant .stname gets font-weight:600 + #7dd3fc (the icy-blue color — the .mfin/.mcount/.mnav-item.is-active family; typography-only, NO background — decision 25)");
check(/#mcentre-standings \.strow\.strow-participant \.stpos\{color:#7dd3fc\}/.test(shellSrc),
  "S11 CSS participant rank: the participant .stpos gets #7dd3fc (the icy-blue color ONLY — its existing font-weight:800 from the versioned stylesheet is already the strongest weight; 'stronger typography' via color contrast, NOT by reducing the weight)");
// NO background on the participant-mark (decision 25 — typography-only)
check(!/#mcentre-standings \.strow\.strow-participant\{[^}]*background/.test(shellSrc),
  "S11 CSS no participant background: the .strow-participant class carries NO background (decision 25 — typography-only participant highlight; the .strow-me background the team-page uses is NOT applied to the match page)");
// the crest sizing — 16px desktop, 14px mobile
check(/#mcentre-standings \.stcrest\{width:16px;height:16px/.test(shellSrc),
  "S11 CSS crest desktop: the crest <img> is 16px desktop (object-fit:contain — CLS-neutral; the fixed square box)");
check(/@media \(max-width:600px\)\{[\s\S]*?#mcentre-standings \.stcrest\{width:14px;height:14px/.test(shellSrc),
  "S11 CSS crest mobile: the crest <img> drops to 14px at the 600px mobile breakpoint (spec §8: 'optimize padding and typography')");
// the ellipsis rendering — .strow-ellipsis + .stellipsis
check(/#mcentre-standings \.strow\.strow-ellipsis\{justify-content:center/.test(shellSrc),
  "S11 CSS ellipsis: the .strow-ellipsis centers the «⋯» (justify-content:center — the single .stellipsis child is centered horizontally, spanning all 5 columns)");
// the mobile layout — all 5 columns visible, no horizontal scroll, team names readable
check(/@media \(max-width:600px\)\{[\s\S]*?#mcentre-standings \.strow\{font-size:11px/.test(shellSrc),
  "S11 CSS mobile font: the .strow font-size drops to 11px at ≤600px (spec §8: 'optimize padding and typography' — all 5 columns stay visible with no horizontal scroll)");
check(/@media \(max-width:600px\)\{[\s\S]*?#mcentre-standings \.stnum\{width:20px/.test(shellSrc),
  "S11 CSS mobile columns: the .stnum width drops to 20px at ≤600px (the number columns narrow so all 5 stay visible — NO .ucl-hidem, no hidden columns)");
// logical properties only — no physical properties (margin-left/right, padding-left/right, etc.)
check(!/#mcentre-standings[^{]*\{[^}]*\b(margin-left|margin-right|padding-left|padding-right|left:|right:)\b/.test(shellSrc),
  "S11 CSS logical properties: the S11 block uses CSS logical properties ONLY (margin-block, padding-block, inset-inline, text-align — RTL/LTR clean under a dir flip, decision 2; no physical left/right properties)");
// the جدول nav item renders when the standings part is non-empty (the nav's adaptive Q9=B filter)
check(/standings\?: string;.*\/\/ five-row context windows \(S10\/S11\)/.test(mcSrc),
  "S11 nav جدول item: MatchCentreParts.standings? (the slot + the mcentre-standings section) exist since S02 — S11 populates it; the nav's adaptive Q9=B filter renders the جدول nav item when the standings part is non-empty (the matchNavHtml call now passes standings: standingsHtml)");

// ---------- 13. S12 (M5): the form renderer + the latest results (M5, session 1 of 2) ----------
// specification §9 (Team form and recent results) + milestones-and-sessions.md
// M5/S12. S12 ships the form renderer MIGRATION (the W/D/L dots + the count
// summary + the season-record chip — the v13.87/v13.88 vocabulary migrated
// into the composer as a .mcentre-form section, the S04/S07/S11 precedent)
// + the NEW latest-results list (spec §9 "Latest five results" — the dots'
// hover-title text promoted to visible text: opponent + score + date, from
// the SAME teamForm return, ZERO new data work) + the participant-mark
// typography (.mcentre-form-participant — the S11 .strow-participant
// precedent: font-weight:600 + #7dd3fc on the team names, typography-only,
// NO background, decision 25) + the responsive mobile layout (the dots + the
// summary visible, the team name truncates, one line per result row, no
// horizontal scroll). S13 (session 2 of 2) ships the M5 gate. The team-page
// formStrip card (formRowHtml/formLegendHtml via teamFormCardHtml) stays
// byte-frozen; the match-page matchFormHtml is a NEW composer function fed
// by the pages.ts matchFormInput projection (the S04 hero precedent).

// (a) the contract — matchFormHtml + the projection interfaces exported
check(typeof mc.matchFormHtml === "function" &&
  /export interface MatchFormInput/.test(mcSrc) &&
  /export interface MatchFormSideInput/.test(mcSrc) &&
  /export interface MatchFormResultRow/.test(mcSrc),
  "S12 contract: matchFormHtml + MatchFormInput/MatchFormSideInput/MatchFormResultRow exported (the pre-built-atoms projection — the composer stays import-free, the S04 hero precedent; pages.ts's matchFormInput pre-escapes/prebuilds every string)");

// (b) the renderer — both sides with dots (the REAL mc.matchFormHtml, never
// re-implemented). Home: a 5-dot W/D/L/W/W side; away: a 3-dot D/W/W side.
const s12HomeDots = {
  team: "آرسنال",
  dotsHtml: '<i class="fdot fw">ب</i><i class="fdot fd">م</i><i class="fdot fl">ش</i><i class="fdot fw">ب</i><i class="fdot fw">ب</i>',
  sumHtml: s11FaDigits("3") + " برد · " + s11FaDigits("1") + " مساوی · " + s11FaDigits("1") + " شکست",
  seasonHtml: "",
  results: [
    { dotHtml: '<i class="fdot fw">ب</i>', oppHtml: "ولورهمپتون", scoreHtml: s11FaDigits("2") + " – " + s11FaDigits("0"), dateHtml: "D2(2026-10-12)" },
    { dotHtml: '<i class="fdot fd">م</i>', oppHtml: "لیورپول", scoreHtml: s11FaDigits("1") + " – " + s11FaDigits("1"), dateHtml: "D2(2026-10-19)" },
    { dotHtml: '<i class="fdot fl">ش</i>', oppHtml: "منچستریونایتد", scoreHtml: s11FaDigits("0") + " – " + s11FaDigits("1"), dateHtml: "D2(2026-10-26)" },
    { dotHtml: '<i class="fdot fw">ب</i>', oppHtml: "نیوکاسل", scoreHtml: s11FaDigits("3") + " – " + s11FaDigits("1"), dateHtml: "D2(2026-11-02)" },
    { dotHtml: '<i class="fdot fw">ب</i>', oppHtml: "برایتون", scoreHtml: s11FaDigits("2") + " – " + s11FaDigits("1"), dateHtml: "D2(2026-11-09)" }
  ]
};
const s12AwayDots = {
  team: "چلسی",
  dotsHtml: '<i class="fdot fd">م</i><i class="fdot fw">ب</i><i class="fdot fw">ب</i>',
  sumHtml: s11FaDigits("2") + " برد · " + s11FaDigits("1") + " مساوی · " + s11FaDigits("0") + " شکست",
  seasonHtml: "",
  results: [
    { dotHtml: '<i class="fdot fd">م</i>', oppHtml: "وست‌هم", scoreHtml: s11FaDigits("0") + " – " + s11FaDigits("0"), dateHtml: "D2(2026-10-10)" },
    { dotHtml: '<i class="fdot fw">ب</i>', oppHtml: "فولام", scoreHtml: s11FaDigits("2") + " – " + s11FaDigits("0"), dateHtml: "D2(2026-10-17)" },
    { dotHtml: '<i class="fdot fw">ب</i>', oppHtml: "بورنلی", scoreHtml: s11FaDigits("1") + " – " + s11FaDigits("0"), dateHtml: "D2(2026-10-31)" }
  ]
};
const s12FormBoth = mc.matchFormHtml({ home: s12HomeDots, away: s12AwayDots });
check(s12FormBoth.startsWith('<div class="card formstrip"><h2>فرم اخیر</h2>') &&
  s12FormBoth.indexOf('<p class="formlegend"><i class="fdot fw">ب</i>برد · <i class="fdot fd">م</i>مساوی · <i class="fdot fl">ش</i>شکست</p>') > -1,
  "S12 container: the renderer wraps the form in the .card.formstrip container (the v13.87 vocabulary — shared CSS with the team-page card) + the <h2>«فرم اخیر» title (any side has dots) + the dot legend (the ب=برد م=مساوی ش=شکست decoder — spec §9 'Accessible labels; never rely on color alone'; byte-identical to formLegendHtml()'s output so the match-page + team-page cards decode the dots identically)");
check(s12FormBoth.indexOf('<span class="formdots">' + s12HomeDots.dotsHtml + "</span>") > -1 &&
  s12FormBoth.indexOf('<span class="formsum">' + s12HomeDots.sumHtml + "</span>") > -1,
  "S12 dots + summary: the composer wraps the pre-built dot atoms in <span class=\"formdots\"> + the count-summary text in <span class=\"formsum\"> (the v13.87 vocabulary — the W/D/L indicators ب/م/ش + the W·D·L count summary per side)");
check(s12FormBoth.indexOf("title=") === -1,
  "S12 no tooltip: the match-page dots carry NO title attribute (spec §9 'Non-interactive: no tooltip, click or expand' — the v13.87 hover-title text is promoted to the VISIBLE latest-results list below; the team-page formRowHtml keeps its titles, byte-frozen)");

// (c) the latest-results list — <ul class="formresults"> with one <li> per
// finished result: [dot][fropp opponent][frscore][frdate] — the dots' title
// text promoted to visible text (spec §9 "Latest five results": up to five
// per side, opponent + score prominent, date secondary).
check((s12FormBoth.match(/<ul class="formresults">/g) || []).length === 2 &&
  (s12FormBoth.match(/<li>/g) || []).length === 8,
  "S12 results list: one <ul class=\"formresults\"> per dots side (2 lists; 5 + 3 = 8 <li> rows — up to five results per side, spec §9 'Up to five available results per team')");
check(s12FormBoth.indexOf('<li><i class="fdot fw">ب</i><span class="fropp">ولورهمپتون</span><b class="frscore">' + s11FaDigits("2") + " – " + s11FaDigits("0") + '</b><span class="frdate">D2(2026-10-12)</span></li>') > -1,
  "S12 results row: each row = the W/D/L dot + the opponent (<span class=\"fropp\">) + the score (<b class=\"frscore\">) + the date (<span class=\"frdate\">) — the dots' title text promoted to visible text, one compact line per result");
check(s12FormBoth.indexOf('<ul class="formresults">') > s12FormBoth.indexOf('<span class="formdots">') &&
  s12FormBoth.indexOf("آرسنال") < s12FormBoth.indexOf("چلسی") &&
  s12FormBoth.indexOf("بورنلی") > s12FormBoth.indexOf("ولورهمپتون"),
  "S12 list under the dots: the results list rides UNDER its side's dots row (the list follows the formrow in DOM order); home renders FIRST, away underneath (spec §9 layout: 'home team first, away team underneath' — the stacked two-side resolution)");

// (d) the participant-mark typography — both team names carry
// .mcentre-form-participant (the S11 .strow-participant precedent:
// font-weight:600 + #7dd3fc via the page-shell S12 CSS, typography-only, NO
// background, decision 25). The mark rides the TEAM NAME only.
check((s12FormBoth.match(/<span class="formteam mcentre-form-participant">/g) || []).length === 2 &&
  (s12FormBoth.match(/mcentre-form-participant/g) || []).length === 2,
  "S12 participant-mark: both team names carry .formteam.mcentre-form-participant (the typography-only class — decision 25, the S11 precedent; the CSS applies font-weight:600 + #7dd3fc); the mark rides the TEAM NAME only — the dots + the summary + the chip carry NO participant class");
check(s12FormBoth.indexOf("mcentre-cols") === -1 && s12FormBoth.indexOf("strow-me") === -1,
  "S12 stacked: the two sides render STACKED (one .formrow per side + its list, NO .mcentre-cols pairing grid — the side-by-side pairing is the S07 summary's shape, not the form's) + NO .strow-me background (typography-only, decision 25)");

// (e) the season-record fallback — a side with no dots falls back to the
// pre-built .fseason chip (the aggregate W/D/L from the standings snapshot);
// a chip side carries NO results list (no fake per-match granularity).
const s12SeasonSide = {
  team: "اورتون",
  dotsHtml: "",
  sumHtml: "",
  seasonHtml: '<span class="fseason"><b class="fspos">ردیف ' + s11FaDigits("2") + '</b><b class="fsw">' + s11FaDigits("6") + '</b>ب <b class="fsd">' + s11FaDigits("2") + '</b>م <b class="fsl">' + s11FaDigits("2") + '</b>ش<i class="fsplayed">از ' + s11FaDigits("10") + ' بازی لیگ برتر انگلیس</i></span>',
  results: []
};
const s12Mixed = mc.matchFormHtml({ home: s12HomeDots, away: s12SeasonSide });
check(s12Mixed.indexOf(s12SeasonSide.seasonHtml) > -1 &&
  (s12Mixed.match(/<ul class="formresults">/g) || []).length === 1 &&
  s12Mixed.indexOf('<h2>فرم اخیر</h2>') > -1,
  "S12 season fallback: a side with no dots falls back to the pre-built .fseason chip (the aggregate W/D/L — «ردیف ۲ ۶ب ۲م ۲ش از ۱۰ بازی»); the chip side carries NO results list (1 list total — no fake per-match granularity); the title stays «فرم اخیر» (any side has dots)");
const s12SeasonSide2 = { ...s12SeasonSide, team: "فولام", seasonHtml: '<span class="fseason"><b class="fsw">' + s11FaDigits("1") + '</b>ب</span>' };
const s12BothSeason = mc.matchFormHtml({ home: s12SeasonSide, away: s12SeasonSide2 });
check(s12BothSeason.indexOf('<h2>وضعیت فصل</h2>') > -1 && s12BothSeason.indexOf("formlegend") === -1 && s12BothSeason.indexOf("formresults") === -1,
  "S12 season title: when EVERY side falls back to the season aggregate the title honestly switches to «وضعیت فصل» + NO legend + NO results lists (the v13.88 behavior — no fake per-match granularity; the dots vocabulary never renders without dots)");

// (f) the fail-closed — BOTH sides empty → "" (the no-empty-cards law: the
// composer's sectionHtml omits the mcentre-form section; the فرم nav item
// stays filtered out). One-sided: the empty side drops, the data side renders.
const s12EmptySide = { team: "بی‌داده", dotsHtml: "", sumHtml: "", seasonHtml: "", results: [] };
check(mc.matchFormHtml({ home: s12EmptySide, away: s12EmptySide }) === "",
  "S12 fail-closed: BOTH sides empty (no dots AND no record) → \"\" (the no-empty-cards law — the composer's sectionHtml omits the mcentre-form section; the فرم nav item stays filtered out via the adaptive Q9=B filter)");
const s12OneSided = mc.matchFormHtml({ home: s12EmptySide, away: s12AwayDots });
check(s12OneSided.indexOf("چلسی") > -1 && s12OneSided.indexOf("بی‌داده") === -1 &&
  (s12OneSided.match(/class="formrow"/g) || []).length === 1,
  "S12 one-sided: a side with NEITHER dots NOR a record renders nothing (the empty side drops; the data side still renders — one .formrow total; the v13.88 one-sided rendering)");

// (g) the projection — extract the REAL matchFormInput from pages.ts via
// ts.transpileModule with CONTROLLABLE teamForm/teamSeasonRecord/faDateD2
// stubs (the S08/S10/S11 pattern). The stubs let the tests control the data
// atoms; the rest of pages.ts's imports are stubbed as no-ops exactly as the
// S11 standingsRendererEngine does (matchFormInput never calls them — only
// buildMatchPage/buildTeamPage/etc. do, and those are never invoked here).
const S12_STUB_DOTS = {
  Arsenal: [
    { r: "W", oppFa: "ولورهمپتون", score: "2-0", date: "2026-10-12" },
    { r: "D", oppFa: "لیورپول", score: "1-1", date: "2026-10-19" },
    { r: "L", oppFa: "منچستریونایتد", score: "0-1", date: "2026-10-26" },
    { r: "W", oppFa: "نیوکاسل", score: "3-1", date: "2026-11-02" },
    { r: "W", oppFa: "ساندرلند & <b>", score: "2-1", date: "2026-11-09" }
  ]
};
const S12_STUB_RECS = {
  Everton: { code: "PL", compFa: "لیگ برتر انگلیس", pos: 2, played: 10, won: 6, draw: 2, lost: 2, points: 20 }
};
const s12RecCalls = [];
function formProjectionEngine() {
  const ts = require(path.join(root, "node_modules", "typescript"));
  const src = fs.readFileSync(path.join(root, "src", "seo", "pages.ts"), "utf8")
    .replace(/^import\s+[^;]+;\n?/gm, "")
    .replace(/^export\s+/gm, "");
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.None, target: "ES2020" } }).outputText;
  const stubs = {
    // the controllable data stubs matchFormInput uses:
    teamForm: function (ctx, name) { return S12_STUB_DOTS[name] || null; },
    teamSeasonRecord: function (ctx, name) { s12RecCalls.push(name); return S12_STUB_RECS[name] || null; },
    faDateD2: function (iso) { return "D2(" + iso + ")"; },
    toFaDigits: function (s) { return s11FaDigits(s); },
    esc: function (s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;"); },
    seoTeamFaName: function (t) { return (t && (t.faName || t.name)) || ""; },
    // no-op stubs for all other imports (never called by matchFormInput —
    // only by buildMatchPage/buildTeamPage/etc. which are never invoked here):
    SEO: {}, absUrl: function () { return ""; }, matchPath: function () { return ""; }, compSlug: function () { return ""; }, teamSlug: function () { return ""; },
    faTime: function () { return ""; }, faDateD1: function () { return ""; }, tehranDayKey: function () { return ""; }, utcTime: function () { return ""; }, statusLabelFa: function () { return ""; }, weekendWindowTehran: function () { return null; },
    COMP_EN: {},
    upcomingBig: function () { return []; }, upcomingFollowed: function () { return []; }, isBigForSeo: function () { return false; }, finishedRecent: function () { return []; }, teamMatches: function () { return { upcoming: [], finished: [] }; }, compMatches: function () { return []; }, teamsIndex: function () { return []; }, compsIndex: function () { return []; }, findMatchBySlug: function () { return null; }, findTeamBySlug: function () { return null; }, payloadTop3: function () { return {}; }, hydrateMatchVenue: async function () { return null; }, similarMatches: function () { return []; }, teamStandingsWindow: function () { return null; }, heroArtSrv: function () { return null; },
    JL: {}, buildHead: function () { return ""; }, pageShell: function () { return ""; },
    seoTeamAltName: function () { return null; },
    matchCentreMain: function () { return ""; }, matchHeroHtml: function () { return ""; }, matchSummaryHtml: function () { return ""; }, matchFormHtml: function () { return ""; },
    narrativeHtml: function () { return ""; }, matchStandingsWindow: function () { return null; },
    loadArchive: async function () { return []; }, fetchStandings: async function () { return null; }, translateTeam: function () { return ""; },
    M: { nameHtml: function (s) { return String(s == null ? "" : s); } }
  };
  return new Function(...Object.keys(stubs), js + "\nreturn { matchFormInput };")(...Object.values(stubs));
}
const fp12 = formProjectionEngine();
check(typeof fp12.matchFormInput === "function",
  "S12 projection contract: pages.ts carries matchFormInput (the form data projection — the S04 hero precedent: pages.ts builds the MatchFormInput atoms, the composer renders the markup; the REAL function extracted via ts.transpileModule, never re-implemented)");
const s12Sm = {
  raw: { homeTeam: { name: "Arsenal" }, awayTeam: { name: "Everton" }, status: "" },
  s: { homeTeam: { faName: "آرسنال" }, awayTeam: { faName: "اورتون" } }
};
const s12Input = fp12.matchFormInput(s12Sm, {}, [], {});
check(s12Input.home.team === "آرسنال" && s12Input.away.team === "اورتون",
  "S12 projection teams: each side carries the pre-escaped Persian faName (faName(sm.s.homeTeam/awayTeam) — the same atoms formStripHtml read; the data lookups use sm.raw.*.name exactly as before)");
check(s12Input.home.dotsHtml === '<i class="fdot fw">ب</i><i class="fdot fd">م</i><i class="fdot fl">ش</i><i class="fdot fw">ب</i><i class="fdot fw">ب</i>' &&
  s12Input.home.sumHtml === s11FaDigits("3") + " برد · " + s11FaDigits("1") + " مساوی · " + s11FaDigits("1") + " شکست",
  "S12 projection dots + summary: the projection pre-builds the W/D/L dot atoms (ب/م/ش in the fW/fD/fL classes, oldest→newest — the teamForm DOM order) + the W·D·L count-summary text (۳ برد · ۱ مساوی · ۱ شکست — the same bytes formRowHtml renders)");
check(s12Input.home.seasonHtml === "" && s12Input.away.dotsHtml === "" && s12Input.away.sumHtml === "" && s12Input.away.results.length === 0,
  "S12 projection fallback split: a dots side carries NO season chip (seasonHtml=\"\") + a chip side carries NO dots/summary/results (the dots-else-chip branch — the chip is the fallback, never a companion)");
check(s12Input.away.seasonHtml === '<span class="fseason"><b class="fspos">ردیف ' + s11FaDigits("2") + '</b><b class="fsw">' + s11FaDigits("6") + '</b>ب <b class="fsd">' + s11FaDigits("2") + '</b>م <b class="fsl">' + s11FaDigits("2") + '</b>ش<i class="fsplayed">از ' + s11FaDigits("10") + ' بازی لیگ برتر انگلیس</i></span>',
  "S12 projection season chip: the pre-built .fseason chip is byte-identical to formRowHtml's shape (fspos «ردیف ۲» + fsw/fd/fl count segments + fsplayed «از ۱۰ بازی لیگ برتر انگلیس» — the v13.93-fullrec vocabulary, shared visual language with the team-page card)");
check(s12RecCalls.indexOf("Arsenal") === -1 && s12RecCalls.indexOf("Everton") > -1,
  "S12 projection gating: teamSeasonRecord runs ONLY for the no-dots side (Everton — the teamFormCardHtml precedent; Arsenal's dots skip the record lookup — the chip is the fallback, never a companion)");
check(s12Input.home.results.length === 5 &&
  s12Input.home.results[0].dotHtml === '<i class="fdot fw">ب</i>' &&
  s12Input.home.results[0].oppHtml === "ولورهمپتون" &&
  s12Input.home.results[0].scoreHtml === s11FaDigits("2") + " – " + s11FaDigits("0") &&
  s12Input.home.results[0].dateHtml === "D2(2026-10-12)",
  "S12 projection results: the latest-results rows carry all 4 atoms from the SAME teamForm return — the dotHtml badge + the opponent + the Persian-digit score «۲ – ۰» (the en-dash form, the dots' title score convention) + the faDateD2 compact date (ZERO new data work — the loadArchive await already feeds this)");
check(s12Input.home.results[4].oppHtml === "ساندرلند &amp; &lt;b&gt;",
  "S12 projection escaping: the opponent name arrives PRE-ESCAPED (the hostile «ساندرلند & <b>» → «ساندرلند &amp; &lt;b&gt;» — the projection owns every escaped string, the composer never needs esc; the S04 hero precedent)");

// (h) the integration — the REAL projection feeds the REAL renderer (the
// full pipeline on controlled data), + the fail-closed pipeline.
const s12Pipe = mc.matchFormHtml(s12Input);
check(s12Pipe.indexOf('<div class="card formstrip"><h2>فرم اخیر</h2>') > -1 &&
  s12Pipe.indexOf('<span class="formteam mcentre-form-participant">آرسنال</span>') > -1 &&
  s12Pipe.indexOf('<span class="formteam mcentre-form-participant">اورتون</span>') > -1 &&
  s12Pipe.indexOf(s12Input.away.seasonHtml) > -1 &&
  (s12Pipe.match(/<ul class="formresults">/g) || []).length === 1,
  "S12 integration: matchFormHtml(matchFormInput(sm, ctx, archive, fullByCode)) renders the full card — the participant-marked team names + the home dots/summary/list + the away season chip (the mixed case end-to-end)");
check(mc.matchFormHtml(fp12.matchFormInput({ raw: { homeTeam: { name: "X" }, awayTeam: { name: "Y" }, status: "" }, s: { homeTeam: { faName: "X" }, awayTeam: { faName: "Y" } } }, {}, [], {})) === "",
  "S12 integration fail-closed: neither side has dots nor a record → the projection returns empty atoms → the renderer returns \"\" (the mcentre-form section is omitted; the فرم nav item stays filtered out)");

// (i) the composer wiring — buildMatchPage calls matchFormInput +
// matchFormHtml + passes form: formHtml to BOTH matchNavHtml + matchCentreMain.
check(/const formHtml = matchFormHtml\(matchFormInput\(sm, ctx, archive, fullByCode\)\);/.test(pagesSrc),
  "S12 wiring call: buildMatchPage calls matchFormInput(sm, ctx, archive, fullByCode) + matchFormHtml(input) — the projection reads the already-loaded teamForm + teamSeasonRecord data (the loadArchive + fullByCodeFor awaits — ZERO new awaits), the renderer is pure string composition in the composer");
check(/matchNavHtml\(\{ summary: summaryHtml, standings: standingsHtml, form: formPartHtml, venue: venueHtml, schedule: scheduleHtml \}\)/.test(pagesSrc) && /form: formPartHtml,/.test(pagesSrc),
  "S12 wiring dual: the form string feeds BOTH matchNavHtml (the فرم nav item — the adaptive Q9=B filter renders it when the form part is non-empty) AND matchCentreMain (the mcentre-form section anchor — the S11 standings dual-passing precedent) (S13 co-evolution: the form part is now the COMBINED formPartHtml = the S12 form card + the S13 metrics card riding INSIDE the mcentre-form section — decision S13-1; the فرم nav item lights when EITHER card renders; S14 co-evolution: the nav call now also passes venue: venueHtml, schedule: scheduleHtml — the pre-existing slots reused, decision S14-2)");
check(/\{ id: "mcentre-form", label: "فرم" \}/.test(pagesSrc),
  "S12 nav فرم item: the MC_NAV_DESTS registry carries the mcentre-form destination (فرم) — the nav item renders when the form part is non-empty (the adaptive Q9=B filter reads parts.form — already wired since S06, S12 keeps it)");

// (j) the team-page path stays byte-frozen — formStripHtml/formRowHtml/
// formLegendHtml stay in pages.ts untouched (the team-page teamFormCardHtml
// renders through them; the match page no longer calls formStripHtml).
check(/function formStripHtml\(ctx: SeoCtx, sm: SeoMatch, archive: any\[\], fullByCode\?: Record<string, any>\): string/.test(pagesSrc) &&
  /function formRowHtml\(fa: string, dots: \{ r: string; oppFa: string; score: string; date: string \}\[\] \| null, rec: \{ won: number \| null; draw: number \| null; lost: number \| null; played: number \| null; pos\?: number \| null; compFa\?: string \| null \} \| null\): string/.test(pagesSrc) &&
  /function formLegendHtml\(\): string/.test(pagesSrc),
  "S12 team-page frozen: formStripHtml/formRowHtml/formLegendHtml stay in pages.ts byte-frozen (the S10/S11 split precedent — the team-page formStrip card renders through them via teamFormCardHtml; the match-page matchFormHtml is a NEW composer function)");
check(/function teamFormCardHtml\(ctx: SeoCtx, entryName: string, fa: string, archive: any\[\], fullByCode\?: Record<string, any>\): string/.test(pagesSrc) &&
  /const row = formRowHtml\(fa, dots, rec\);/.test(pagesSrc),
  "S12 team-page card: teamFormCardHtml still renders through formRowHtml (the team-page form path untouched — the v13.87/v13.88/v13.93 renderer stays byte-frozen on team pages)");

// (k) the cost law — the projection is pure string composition reading the
// already-loaded data. Scoped to matchFormInput + matchFormSideInput (the
// extractFnSrc brace-matched extraction — the S11 buildStandingsHtml
// precedent) + the composer's matchFormHtml/formSideHtml (the whole-module
// purity regex above already gates the composer; this pins the S12
// functions).
const s12ProjSrc = (extractFnSrc(pagesSrc, "matchFormSideInput") || "") + (extractFnSrc(pagesSrc, "matchFormInput") || "");
const s12ProjStripped = s12ProjSrc.replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
check(s12ProjSrc.length > 0 && !/fetch\(|XMLHttpRequest|new Image|setTimeout|setInterval|addEventListener|\.get\(|\.put\(|env\.STATE|env\.AI|AI\.run|generateText|chat\.completions|await\b/i.test(s12ProjStripped),
  "S12 cost law: matchFormInput + matchFormSideInput carry NO AI/network/KV/timer/polling/await code (the S08 zero-runtime-cost law — the projection reads the already-loaded teamForm + teamSeasonRecord data; zero new awaits, zero new KV reads, zero new fetches; the cost check is scoped to the projection functions — pages.ts's other functions keep their legitimate fetch/KV calls)");
const s12CompSrc = (extractFnSrc(mcSrc, "formSideHtml") || "") + (extractFnSrc(mcSrc, "matchFormHtml") || "");
const s12CompStripped = s12CompSrc.replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
check(s12CompSrc.length > 0 && !/fetch\(|XMLHttpRequest|new Image|setTimeout|setInterval|addEventListener|\.get\(|\.put\(|env\.STATE|env\.AI|AI\.run|import /i.test(s12CompStripped),
  "S12 composer purity: matchFormHtml + formSideHtml are pure string renderers (the composer stays the S02 pure leaf — zero imports/KV/fetch/client-scripts; the atoms arrive prebuilt from pages.ts)");
check(awaitCount === 3,
  "S12 await count: buildMatchPage's await count stays 3 (hydrateMatchVenue, loadArchive, fullByCodeFor — the pre-existing loads; the S12 form renderer is pure string composition reading the already-loaded teamForm + teamSeasonRecord DATA — ZERO new awaits; the zero-runtime-cost law holds)");

// (l) the CSS — the S12 style block rides page-shell.ts AFTER S11 and BEFORE
// the S03 foundation (chronological session order: S04 → S05 → S06 → S07 →
// S08 → S11 → S12 → S03). Scoped to #mcentre-form; logical properties only;
// the block's own icy/navy tokens, zero new assets/requests.
check(shellSrc.indexOf("Match Centre S11 (M4)") < shellSrc.indexOf("Match Centre S12 (M5)") && shellSrc.indexOf("Match Centre S12 (M5)") < shellSrc.indexOf("Match Centre S03 (M1)"),
  "S12 CSS placement: the S12 style block rides page-shell.ts AFTER S11 (.stcrest mobile) and BEFORE S03 (the responsive/spacing/RTL foundation) — chronological session order: S04 → S05 → S06 → S07 → S08 → S11 → S12 → S03");
check(/#mcentre-form \.formteam\.mcentre-form-participant\{font-weight:600;color:#7dd3fc\}/.test(shellSrc),
  "S12 CSS participant-mark: the participant .formteam gets font-weight:600 + #7dd3fc (the icy-blue color — the .mfin/.mcount/.mnav-item.is-active family; typography-only — the S11 .strow-participant precedent, decision 25)");
check(!/#mcentre-form \.formteam\.mcentre-form-participant\{[^}]*background/.test(shellSrc) && !/#mcentre-form[^{]*strow-me[^{]*\{[^}]*background/.test(shellSrc),
  "S12 CSS no participant background: the .mcentre-form-participant class carries NO background (decision 25 — typography-only; NO #mcentre-form-scoped .strow-me rule applies a background — the team-page highlight is NOT applied to the match page)");
check(shellSrc.includes("#mcentre-form .formresults{margin-block:4px 10px;margin-inline:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:4px}") &&
  shellSrc.includes("#mcentre-form .formresults li{display:flex;align-items:center;gap:8px;font-size:.78rem;line-height:1.7}"),
  "S12 CSS results list: the .formresults list (margin-block/margin-inline logical spacing, list-style:none, the flex column with a 4px gap) + the one-line rows (flex, centered, .78rem — spec §9 'Compact vertical list; Opponent and score prominent; Date secondary')");
check(/#mcentre-form \.fropp\{font-weight:600;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap\}/.test(shellSrc) &&
  /#mcentre-form \.frscore\{font-weight:800;font-variant-numeric:tabular-nums;white-space:nowrap;flex-shrink:0\}/.test(shellSrc) &&
  /#mcentre-form \.frdate\{font-size:\.68rem;font-weight:600;color:var\(--muted,#9aa4b2\);white-space:nowrap;flex-shrink:0;margin-inline-start:auto\}/.test(shellSrc),
  "S12 CSS row cells: the opponent truncates (min-width:0 + ellipsis — long names never blow out the row), the score is prominent (weight 800, tabular digits, never shrinks), the date rides the inline-end (margin-inline-start:auto — the muted secondary, spec §9 'Date secondary')");
check(/#mcentre-form \.formrow\{border-block-end:none\}/.test(shellSrc) &&
  /#mcentre-form \.formresults \+ \.formrow,\n#mcentre-form \.formrow \+ \.formrow\{border-block-start:1px dashed var\(--border,#334155\)\}/.test(shellSrc),
  "S12 CSS side divider: the v13.87 per-row border-bottom is dropped inside #mcentre-form (border-block-end:none) + the dashed divider rides BETWEEN the sides (on the row that follows a list or another row — home|away separation, never inside a side)");
check(/@media \(max-width:600px\)\{[\s\S]*?#mcentre-form \.formteam\{min-width:0;flex:0 1 auto;overflow:hidden;text-overflow:ellipsis;white-space:nowrap\}/.test(shellSrc) &&
  /@media \(max-width:600px\)\{[\s\S]*?#mcentre-form \.formresults li\{gap:6px;font-size:\.72rem\}/.test(shellSrc) &&
  /@media \(max-width:600px\)\{[\s\S]*?#mcentre-form \.formrow\{gap:8px;padding-block:6px\}/.test(shellSrc),
  "S12 CSS mobile: at ≤600px the team name truncates (the .stname precedent from S11 — min-width:0 + ellipsis + nowrap), the gaps/padding tighten, the list rows stay ONE line at .72rem (spec §9: 'keep the dots + the summary visible; optimize padding and typography; no horizontal scrolling')");
check(!/#mcentre-form[^{]*\.fdot\{[^}]*width/.test(shellSrc),
  "S12 CSS fdot keeps 22px: the S12 block does NOT resize .fdot (the existing 22px desktop / 16px legend sizes are already touch-friendly — the S12 resolution: keep; the dots stay visible on mobile, no new sizing vocabulary)");
check(!/#mcentre-form[^{]*\{[^}]*\b(margin-left|margin-right|padding-left|padding-right|left:|right:)\b/.test(shellSrc),
  "S12 CSS logical properties: the S12 block uses CSS logical properties ONLY (margin-block, margin-inline, padding-block, border-block-start — RTL/LTR clean under a dir flip, decision 2; no physical left/right properties)");

// ---------- 14. S13 (M5): the home/away performance metrics + the M5 gate ----------
// specification §9 (Team form and recent results > "Home/away performance") +
// milestones-and-sessions.md M5/S13 + decisions 33/34/35 + audit §11 rows
// 70-71. S13 ships the NUMERICAL comparison — goals scored / goals conceded /
// clean sheets — the two participants compared side by side (home team column
// FIRST = right under native RTL; "home/away" = the two participants, NOT
// home-only/away-only splits — the standings source carries full-season team
// aggregates). NUMBERS ONLY (decision 35). Data provenance (audit §11):
// GF/GA/played (grade A) from the fixture's OWN competition standings rows
// (fullByCode — the fullByCodeFor await, loaded for exactly the fixture's
// code — then ctx.payload.standings); clean sheets (grade D — derivable,
// partial coverage) from the SAME pool-FINISHED/archive merge teamForm reads,
// deduped on the sorted-pair+day key, FILTERED to the fixture's competition,
// with the min-3 sample gate. The renderer (matchMetricsHtml in the composer)
// + the projection (matchMetricsInput in pages.ts) + the wiring (decision
// S13-1: the metrics ride INSIDE the mcentre-form section AFTER the two form
// sides — the combined formPartHtml feeds BOTH the nav's adaptive Q9=B filter
// AND matchCentreMain; NO new section anchor, NO new nav destination).

// (a) the contract — matchMetricsHtml + the projection interfaces exported +
// the data helper teamCompMetrics exported from data.ts (audit §12 row S13:
// "src/seo/data.ts (clean-sheet aggregation + sample labels),
// src/seo/match-centre.ts | GF/GA from standings; clean sheets from
// pool+archive with gates").
check(typeof mc.matchMetricsHtml === "function" &&
  /export interface MatchMetricsInput/.test(mcSrc) &&
  /export interface MatchMetricsSideInput/.test(mcSrc),
  "S13 contract: matchMetricsHtml + MatchMetricsInput/MatchMetricsSideInput exported (the pre-built-atoms projection — the composer stays import-free, the S04 hero precedent; pages.ts's matchMetricsInput pre-escapes/prebuilds every string)");
check(/export function teamCompMetrics\(ctx: SeoCtx, teamName: string, archiveRows: any\[\] = \[\], fullByCode\?: Record<string, any>, compCode\?: string \| null\): TeamCompMetrics \| null/.test(read("src/seo/data.ts")) &&
  /export interface TeamCompMetrics/.test(read("src/seo/data.ts")),
  "S13 data contract: data.ts exports teamCompMetrics + the TeamCompMetrics interface (the S13 aggregation helper — pure aggregation over (ctx, teamName, archiveRows, fullByCode, compCode); the CALLER passes the already-loaded archive rows in [data.ts cannot import files.ts — the teamForm precedent]; the S12 season chip [teamSeasonRecord] is the richest-record lookup ACROSS competitions, this is the FIXTURE-competition lookup — the two concerns stay distinct)");

// (b) the data helper — extract the REAL teamCompMetrics from data.ts
// (brace-matched extraction + ts.transpileModule for the TS annotations — the
// check-stats teamForm brace-matching precedent + the S10/S12 transpileModule
// precedent) with the REAL normalizeTeamName (src/teams.ts — the check-stats
// require precedent) + a controllable COMP_EN stub. The controlled data:
// a fake PL table + a fake BL1 table (the scoping test) + pool FINISHED rows
// + archive rows (one DUPLICATE across sources — the teamForm dedupe key).
function s13DataEngine() {
  const ts = require(path.join(root, "node_modules", "typescript"));
  const d = read("src/seo/data.ts");
  const i = d.indexOf("export function teamCompMetrics");
  if (i < 0) return null;
  const open = d.indexOf("| null {", i) + 7; // body-open anchored past the return-type braces (the teamForm precedent)
  let depth = 0, j = open;
  for (; j < d.length; j++) {
    if (d[j] === "{") depth++;
    else if (d[j] === "}") { depth--; if (depth === 0) break; }
  }
  const seg = d.slice(i, j + 1).replace(/^export /, "");
  const js = ts.transpileModule(seg, { compilerOptions: { module: ts.ModuleKind.None, target: ts.ScriptTarget.ES2020 } }).outputText;
  const { normalizeTeamName } = require(path.join(root, "src", "teams.ts"));
  const COMP_EN = { PL: "Premier League", BL1: "Bundesliga", CL: "Champions League" };
  const translateCompetition = function (c) { return c === "CL" ? "\u0644\u06CC\u06AF \u0642\u0647\u0631\u0645\u0627\u0646\u0627\u0646 \u0627\u0631\u0648\u067E\u0627" : c; };
  return new Function("normalizeTeamName", "COMP_EN", "translateCompetition", js + "\n; return teamCompMetrics;")(normalizeTeamName, COMP_EN, translateCompetition);
}
const s13Tcm = s13DataEngine();
check(typeof s13Tcm === "function",
  "S13 data extraction: the REAL teamCompMetrics extracted from data.ts via brace-matched extraction + ts.transpileModule (never re-implemented — the check-stats teamForm brace-matching precedent + the S10/S12 transpileModule pattern), fed the REAL normalizeTeamName (src/teams.ts — the check-stats require precedent) + controllable COMP_EN/translateCompetition stubs");
// the fake standings tables (the full S10 row shape: pos/name/faName/crest/
// points/played/won/draw/lost/gf/ga — audit §R3/§67)
function s13Row(name, pos, o) {
  o = o || {};
  return { name: name, pos: pos, faName: o.faName || name, crest: null, points: o.points != null ? o.points : 20 - pos,
    played: o.played != null ? o.played : 10, won: o.won != null ? o.won : 10 - pos, draw: 0, lost: o.lost != null ? o.lost : pos,
    gf: o.gf != null ? o.gf : 20 - pos, ga: o.ga != null ? o.ga : pos };
}
const S13_PL_TEAMS = [
  s13Row("Arsenal", 1, { played: 11, gf: 28, ga: 12 }),
  s13Row("Man City", 2, { played: 10, gf: 31, ga: 15 }),
  s13Row("Liverpool", 3, { played: 11, gf: 24, ga: 9 }),
  s13Row("Chelsea", 4, { played: 10, gf: 18, ga: 11 }),
  s13Row("Tottenham", 5), s13Row("Everton", 6)
];
const S13_BL1_TEAMS = [s13Row("Dortmund", 1, { played: 9, gf: 22, ga: 10 }), s13Row("Leverkusen", 2, { played: 9, gf: 20, ga: 8 })];
const s13Table = (teams, fa, started) => ({ started: started !== false, faName: fa, emblem: null, teams: teams });
// the fake pool rows (raw shape: status/utcDate/score.fullTime/competition)
function s13Pool(status, date, comp, home, away, gh, ga) {
  return { status: status, utcDate: date, competition: { code: comp }, homeTeam: { name: home }, awayTeam: { name: away }, score: { fullTime: { home: gh, away: ga } } };
}
const S13_POOL = [
  s13Pool("FINISHED", "2026-10-12T18:00:00Z", "PL", "Arsenal", "Wolves", 2, 0),      // Arsenal conceded 0 → clean sheet
  s13Pool("FINISHED", "2026-10-19T16:30:00Z", "PL", "Liverpool", "Arsenal", 1, 1),   // Arsenal conceded 1
  s13Pool("FINISHED", "2026-11-02T18:00:00Z", "PL", "Arsenal", "Newcastle", 3, 1),   // Arsenal conceded 1
  s13Pool("FINISHED", "2026-11-05T20:00:00Z", "FA_CUP", "Arsenal", "Leeds", 1, 0),   // NOT PL → the comp filter excludes it
  s13Pool("SCHEDULED", "2026-11-20T18:00:00Z", "PL", "Arsenal", "Chelsea", null, null), // not FINISHED → excluded
  s13Pool("FINISHED", "2026-10-10T17:00:00Z", "PL", "Chelsea", "Tottenham", 2, 1)    // neither side is Arsenal → excluded
];
// the fake archive rows (pubMatch shape: m.utcDate/m.homeTeam/m.awayTeam/m.score/m.competition)
function s13Arch(date, comp, home, away, gh, ga) {
  return { m: { utcDate: date, competition: { code: comp }, homeTeam: { name: home }, awayTeam: { name: away }, score: { home: gh, away: ga } } };
}
const S13_ARCH = [
  s13Arch("2026-09-26T16:30:00Z", "PL", "Arsenal", "Chelsea", 0, 0),   // Arsenal conceded 0 → clean sheet
  s13Arch("2026-10-12T18:00:00Z", "PL", "Arsenal", "Wolves", 2, 0),    // DUPLICATE of pool row 0 (same pair+day) → deduped
  s13Arch("2026-10-03T16:30:00Z", "PL", "Man City", "Man United", 4, 2) // Man City conceded 2 (only 1 sample → below the gate)
];
const s13Ctx = {
  payload: { standings: { PL: s13Table(S13_PL_TEAMS, "لیگ برتر انگلیس"), BL1: s13Table(S13_BL1_TEAMS, "بوندسلیگا") } },
  pool: S13_POOL,
  shaped: S13_POOL.map(() => ({}))
};
// GF/GA/played/compFa from the fixture's OWN competition table (grade A) +
// clean sheets from the pool+archive merge (grade D): Arsenal — played 11,
// gf 28, ga 12; the merge dedupes the duplicate (pool row 0 == archive row 1)
// → csSample 4 (3 pool + 1 archive), cs 2 (2026-10-12 + 2026-09-26); the
// FA_CUP row, the SCHEDULED row + the other-teams row are excluded.
const s13Ars = s13Tcm(s13Ctx, "Arsenal", S13_ARCH, undefined, "PL");
check(s13Ars && s13Ars.code === "PL" && s13Ars.compFa === "لیگ برتر انگلیس" &&
  s13Ars.played === 11 && s13Ars.gf === 28 && s13Ars.ga === 12 &&
  s13Ars.cs === 2 && s13Ars.csSample === 4,
  "S13 GF/GA grade A + clean sheets grade D: Arsenal → { PL, «لیگ برتر انگلیس», played 11, gf 28, ga 12, cs 2, csSample 4 } — the fixture's OWN competition standings rows carry the season aggregates (audit row 70) + the pool-FINISHED/archive merge (deduped on the sorted-pair+day key — the pool's Arsenal-Wolves 2026-10-12 + the archive's same fixture count ONCE; the FA_CUP row + the SCHEDULED row + the other-teams row are excluded by the comp/status/team filters — audit row 71)");
// the min-sample gate: Man City has only 1 sample (the archive row) → cs
// null + csSample null (the metric omits — never a misleading count).
const s13City = s13Tcm(s13Ctx, "Man City", S13_ARCH, undefined, "PL");
check(s13City && s13City.played === 10 && s13City.gf === 31 && s13City.ga === 15 &&
  s13City.cs === null && s13City.csSample === null,
  "S13 min-sample gate: Man City (csSample 1 < 3) → cs null + csSample null (the clean-sheet metric omits — a 1-2 game sample is noise, never a misleading count; the teamForm min-3 precedent; GF/GA still return — the gate is per-metric, decisions 33/34)");
// the missing-vs-zero distinction: a team with 3+ samples and ZERO clean
// sheets (conceded in every game) → cs 0 (a REAL zero, not null).
const s13ZeroPool = [
  s13Pool("FINISHED", "2026-10-01T18:00:00Z", "PL", "Everton", "Fulham", 1, 2),   // Everton conceded 2
  s13Pool("FINISHED", "2026-10-08T18:00:00Z", "PL", "Everton", "Brentford", 1, 1), // Everton conceded 1
  s13Pool("FINISHED", "2026-10-15T18:00:00Z", "PL", "Wolves", "Everton", 3, 1)    // Everton conceded 3
];
const s13ZeroCtx = { payload: { standings: { PL: s13Table(S13_PL_TEAMS, "لیگ برتر انگلیس") } }, pool: s13ZeroPool, shaped: s13ZeroPool.map(() => ({})) };
const s13Zero = s13Tcm(s13ZeroCtx, "Everton", [], undefined, "PL");
check(s13Zero && s13Zero.cs === 0 && s13Zero.csSample === 3,
  "S13 actual zero: Everton (3 samples, conceded in all 3 → ZERO clean sheets) → cs 0 + csSample 3 (a 0 clean-sheet count in a SUFFICIENT sample IS a real zero — spec §16 'Missing is not zero' cuts both ways: missing → null, an actual zero → 0; the renderer renders «۰», never «—»)");
// the partial dataset: played 11 vs a 4-game clean-sheet window → both
// return (the caller discloses the window when it materially differs).
check(s13Ars && s13Ars.played === 11 && s13Ars.csSample === 4 && s13Ars.csSample < s13Ars.played,
  "S13 partial dataset: Arsenal played 11 but the pool+archive merge covers only 4 → csSample 4 returns alongside played 11 (the tracked big-match universe is a PARTIAL sample — the caller's materiality disclosure |csSample − played| ≥ 2 lights the window note, decision 34)");
// the fail-closed gates: missing table / team not in the table / pre-season /
// degenerate / played=0 / missing gf / no compCode → null (missing ≠ zero —
// the side omits entirely; a missing table is NEVER rendered as zeroes).
check(s13Tcm(s13Ctx, "Arsenal", [], undefined, "SA") === null,
  "S13 missing table: no standings table for the fixture's code (SA) → null (audit row 70: 'missing table → omit' — a missing table is NOT zero; the side omits entirely)");
check(s13Tcm(s13Ctx, "Real Madrid", [], undefined, "PL") === null,
  "S13 team not in the table: Real Madrid is not in the PL table → null (the side omits; never a fabricated row)");
const s13PreCtx = { payload: { standings: { PL: s13Table(S13_PL_TEAMS, "لیگ برتر انگلیس", false) } }, pool: [], shaped: [] };
check(s13Tcm(s13PreCtx, "Arsenal", [], undefined, "PL") === null,
  "S13 pre-season: started === false → null (the S10 gate — a pre-season table carries roster-alphabetical zeroes that would read as fake aggregates)");
check(s13Tcm({ payload: { standings: { PL: s13Table([s13Row("Arsenal", 1)], "لیگ برتر انگلیس") } }, pool: [], shaped: [] }, "Arsenal", [], undefined, "PL") === null,
  "S13 degenerate table: a 1-team table is not a table → null (the S10 gate)");
check(s13Tcm({ payload: { standings: { PL: s13Table([s13Row("Arsenal", 1, { played: 0, gf: 0, ga: 0 })].concat(S13_PL_TEAMS.slice(1)) , "لیگ برتر انگلیس") } }, pool: [], shaped: [] }, "Arsenal", [], undefined, "PL") === null,
  "S13 played=0: a standings row with played 0 → null (nothing played yet — gf 0/ga 0 would read as fake zeroes; spec §16 'Omit insufficient statistics rather than presenting zeroes or misleading values'; the standings-table zeroes ARE real only once the season has games in it — played > 0 gates that)");
check(s13Tcm({ payload: { standings: { PL: s13Table([Object.assign(s13Row("Arsenal", 1, { played: 11, ga: 12 }), { gf: undefined })].concat(S13_PL_TEAMS.slice(1)), "لیگ برتر انگلیس") } }, pool: [], shaped: [] }, "Arsenal", [], undefined, "PL") === null,
  "S13 missing aggregate: a standings row with gf missing (played 11) → null (fail-closed — never render a partial row with a fake zero in the missing cell)");
check(s13Tcm(s13Ctx, "Arsenal", [], undefined, null) === null,
  "S13 no compCode: a fixture with no competition code → null (fail-closed — no competition scope, no metrics)");
// the fixture-competition scoping (the S12 season-chip distinction):
// Dortmund IS in the BL1 table, but the fixture's code is PL → null (the
// FIXTURE-competition lookup, NOT teamSeasonRecord's richest-record lookup
// across competitions).
check(s13Tcm(s13Ctx, "Dortmund", [], undefined, "PL") === null &&
  s13Tcm(s13Ctx, "Dortmund", [], undefined, "BL1") !== null,
  "S13 fixture-competition scoping: Dortmund (in BL1, not in PL) → null for a PL fixture but a full record for a BL1 fixture (the S12 season chip [teamSeasonRecord] is the RICHEST-record lookup ACROSS competitions; teamCompMetrics is the FIXTURE-competition lookup — a cup fixture against a league table never leaks league aggregates in)");
// the fullByCode precedence: the full cached table wins over the payload
// compact for the SAME code (the v13.93-fullrec + teamStandingsWindow
// precedent — the freshest, complete source).
const s13Full = { PL: s13Table([s13Row("Arsenal", 1, { played: 12, gf: 30, ga: 13 })].concat(S13_PL_TEAMS.slice(1)), "فول لیگ برتر"), BL1: undefined };
const s13FromFull = s13Tcm(s13Ctx, "Arsenal", S13_ARCH, s13Full, "PL");
check(s13FromFull && s13FromFull.played === 12 && s13FromFull.gf === 30 && s13FromFull.ga === 13 && s13FromFull.compFa === "فول لیگ برتر",
  "S13 fullByCode precedence: fullByCode[PL] (the fullByCodeFor await, loaded for exactly the fixture's code) beats ctx.payload.standings[PL] for the same code (the v13.93-fullrec + teamStandingsWindow precedent — the freshest, complete source; played 12/gf 30/ga 13 + the full table's own compFa)");
// the REAL-DATA provenance discovery (the mcM5x preview smoke): the
// v13.89-stdetail fullStandings loader projects fullByCode's rows WITHOUT
// gf/ga (pos/name/faName/played/won/draw/lost/points only) — a row without
// the aggregates falls through to the payload's top-8 compact (v12.16: the
// per-team stats ride along), so the metrics render from the compact.
function s13StdRow(name, pos, o) {
  o = o || {};
  return { name: name, pos: pos, faName: name, played: o.played != null ? o.played : 12, won: o.won != null ? o.won : 8, draw: 2, lost: o.lost != null ? o.lost : 2, points: o.points != null ? o.points : 26 };
}
const s13FullNoGf = { PL: { teams: [s13StdRow("Arsenal", 1), s13StdRow("Man City", 2), s13StdRow("Liverpool", 3), s13StdRow("Chelsea", 4), s13StdRow("Tottenham", 5), s13StdRow("Everton", 6, { played: 12, won: 2, lost: 8, points: 8 })], faName: "فول لیگ برتر" } };
const s13FromCompact = s13Tcm(s13Ctx, "Arsenal", S13_ARCH, s13FullNoGf, "PL");
check(s13FromCompact && s13FromCompact.played === 11 && s13FromCompact.gf === 28 && s13FromCompact.ga === 12 && s13FromCompact.compFa === "لیگ برتر انگلیس" &&
  s13FromCompact.cs === 2 && s13FromCompact.csSample === 4,
  "S13 fullByCode without gf/ga falls through: the v13.89-stdetail fullStandings rows carry NO gf/ga (the real fullByCode shape discovered on the mcM5x preview) → the lookup falls through to ctx.payload.standings[PL] (the top-8 compact, v12.16: gf/ga ride along) → Arsenal renders { played 11, gf 28, ga 12 } from the compact (a row without the aggregates NEVER renders a fake zero — it falls through; a future loader that keeps the aggregates upgrades the metrics to full-table coverage with ZERO changes here)");
// a team in the full table but NOT in the top-8 compact (the real Everton
// case): fullByCode has no aggregates for it + the compact doesn't carry it
// → null (the honest one-sided omission — the side omits, the other renders).
const s13CompactNoEve = { payload: { standings: { PL: s13Table(S13_PL_TEAMS.slice(0, 5), "لیگ برتر انگلیس") } }, pool: [], shaped: [] };
check(s13Tcm(s13CompactNoEve, "Everton", [], s13FullNoGf, "PL") === null,
  "S13 not-in-compact omission: Everton (in fullByCode's table but WITHOUT gf/ga there, NOT in the payload's top-8 compact) → null (the side omits honestly — the one-sided omission; the data side still renders; never a fake zero)");
// the CL fixtures' third source: payload.ucl — the FULL UCL league-phase
// table (gf/ga ride along — the teamSeasonRecord third source). A CL fixture
// whose compact/top-8 misses the team still renders from the full UCL table.
const s13UclTeams = [
  s13Row("PSG", 1, { played: 4, gf: 9, ga: 2 }),
  s13Row("Roma", 2, { played: 4, gf: 7, ga: 4 }),
  s13Row("Bayern", 3, { played: 4, gf: 11, ga: 3 }),
  s13Row("Real Madrid", 4, { played: 4, gf: 8, ga: 5 })
];
const s13ClCtx = { payload: { standings: {}, ucl: s13Table(s13UclTeams, undefined, undefined) }, pool: [], shaped: [] };
const s13Psg = s13Tcm(s13ClCtx, "PSG", [], undefined, "CL");
check(s13Psg && s13Psg.code === "CL" && s13Psg.played === 4 && s13Psg.gf === 9 && s13Psg.ga === 2 && s13Psg.compFa === "لیگ قهرمانان اروپا",
  "S13 CL via payload.ucl: a CL fixture whose payload.standings compact misses the team still renders from payload.ucl — the FULL UCL league-phase table (gf/ga ride along; the teamSeasonRecord third source; the compFa = translateCompetition(\"CL\") — the same fallback teamSeasonRecord uses); PSG → { CL, played 4, gf 9, ga 2 }");
// the ucl third source is CL-ONLY: a PL fixture never reads payload.ucl.
check(s13Tcm(s13ClCtx, "PSG", [], undefined, "PL") === null,
  "S13 ucl source is CL-only: a PL fixture (PSG not in any PL table) never reads payload.ucl (the fixture-competition scoping holds across all three sources)");

// (c) the renderer — the REAL mc.matchMetricsHtml with controlled atoms (the
// S12 pattern). Home: played 11, cs 7 with a material window note (|9-11| ≥ 2);
// away: played 10 (the unequal-samples case — each side labels its own count),
// cs 6 with an immaterial window (no note).
const s13HomeAtoms = {
  team: "آرسنال",
  sampleHtml: "در " + s11FaDigits("11") + " بازی لیگ برتر انگلیس",
  gf: s11FaDigits("28"), ga: s11FaDigits("12"), cs: s11FaDigits("7"),
  csNoteHtml: "در " + s11FaDigits("9") + " بازی"
};
const s13AwayAtoms = {
  team: "منچستر سیتی",
  sampleHtml: "در " + s11FaDigits("10") + " بازی لیگ برتر انگلیس",
  gf: s11FaDigits("31"), ga: s11FaDigits("15"), cs: s11FaDigits("6"),
  csNoteHtml: ""
};
const s13Both = mc.matchMetricsHtml({ home: s13HomeAtoms, away: s13AwayAtoms });
check(s13Both.startsWith('<div class="card mcentre-metrics"><h2>مقایسه آمار فصل</h2><table class="mcmtable"><thead><tr><th class="mcmcorner" scope="col">آمار</th>') &&
  s13Both.indexOf("</tbody></table></div>") > -1,
  "S13 container: the renderer wraps the metrics in the .card.mcentre-metrics container + the <h2>«مقایسه آمار فصل</h2> title + the compact semantic <table class=\"mcmtable\"> (the S11 table precedent — a real table, not div rows; the card rides INSIDE #mcentre-form as a SIBLING under the form card, decision S13-1)");
check(s13Both.indexOf('<th class="mcmteam" scope="col"><span class="formteam mcentre-form-participant">آرسنال</span><span class="mcmsample">' + s13HomeAtoms.sampleHtml + "</span></th>") > -1 &&
  s13Both.indexOf('<th class="mcmteam" scope="col"><span class="formteam mcentre-form-participant">منچستر سیتی</span><span class="mcmsample">' + s13AwayAtoms.sampleHtml + "</span></th>") > -1,
  "S13 team columns: the two team faNames ride the column headers (<th class=\"mcmteam\" scope=\"col\">) with the S12 participant-mark classes (.formteam.mcentre-form-participant — the page-shell S12 rule applies font-weight:600 + #7dd3fc inside #mcentre-form, NO background, decision 25) + the per-team sample label ONCE per column under the name («در ۱۱ بازی لیگ برتر انگلیس» vs «در ۱۰ بازی لیگ برتر انگلیس» — decisions 33/34; the unequal-samples case: each side labels its OWN played count)");
check((s13Both.match(/formteam mcentre-form-participant/g) || []).length === 2 &&
  s13Both.indexOf("mcentre-cols") === -1 && s13Both.indexOf("strow-me") === -1,
  "S13 participant-mark reuse: exactly 2 participant-marked names (the two columns) + NO new participant class + NO .mcentre-cols pairing + NO .strow-me background (the S12 rule is REUSED, not duplicated — typography-only, decision 25)");
check(s13Both.indexOf('<tr><th class="mcmlbl" scope="row">گل زده</th><td class="mcmnum">' + s11FaDigits("28") + '</td><td class="mcmnum">' + s11FaDigits("31") + "</td></tr>") > -1 &&
  s13Both.indexOf('<tr><th class="mcmlbl" scope="row">گل خورده</th><td class="mcmnum">' + s11FaDigits("12") + '</td><td class="mcmnum">' + s11FaDigits("15") + "</td></tr>") > -1,
  "S13 GF/GA rows: گل زده + گل خورده row headers (<th class=\"mcmlbl\" scope=\"row\">) + the centered Persian-digit number cells (<td class=\"mcmnum\"> — toFaDigits, the S11 .stpos/.stgd precedent; numbers ONLY — the numerals ARE the comparison, decision 35)");
check(s13Both.indexOf('<tr><th class="mcmlbl" scope="row">کلین شیت</th><td class="mcmnum">' + s11FaDigits("7") + ' <span class="mcmnote">' + "در " + s11FaDigits("9") + " بازی</span></td>" + '<td class="mcmnum">' + s11FaDigits("6") + "</td></tr>") > -1,
  "S13 clean-sheet row + window note: کلین شیت (the common Persian football-media loanword) + the inline .mcmnote window note rides ONLY the home cell (its sample materially differs: |9 − 11| ≥ 2 → «در ۹ بازی»; the away cell carries NO note — |10 − 10| immaterial, decision 34)");
check(s13Both.indexOf("<svg") === -1 && s13Both.indexOf("canvas") === -1 && s13Both.indexOf("linear-gradient") === -1 && s13Both.indexOf("style=") === -1 && s13Both.indexOf("width=") === -1,
  "S13 numbers only: NO svg/canvas/gradient/inline-style/width markup (decision 35: 'Clean numerical comparison; no decorative bars or charts' — the comparison is the numerals themselves)");
// both sides below the clean-sheet gate → the ROW omits entirely (2 rows).
const s13NoCs = mc.matchMetricsHtml({
  home: { ...s13HomeAtoms, cs: "", csNoteHtml: "" },
  away: { ...s13AwayAtoms, cs: "", csNoteHtml: "" }
});
check(s13NoCs.indexOf("کلین شیت") === -1 && (s13NoCs.match(/<tr><th class="mcmlbl"/g) || []).length === 2,
  "S13 cs row omits: BOTH sides below the min-sample gate (cs \"\") → the کلین شیت row omits entirely (2 data rows remain — never a row of «—» «—»; the no-empty-cards law applied per-row)");
// one side insufficient → the muted «—» cell; an actual zero renders «۰».
const s13MixedCs = mc.matchMetricsHtml({ home: s13HomeAtoms, away: { ...s13AwayAtoms, cs: "", csNoteHtml: "" } });
check(s13MixedCs.indexOf("کلین شیت") > -1 &&
  s13MixedCs.indexOf('<td class="mcmnum mcmnd">—</td>') > -1 &&
  s13MixedCs.indexOf('">' + s11FaDigits("7") + " <span") > -1,
  "S13 one-sided insufficient: the row renders; the insufficient side's cell is the muted «—» marker (<td class=\"mcmnum mcmnd\">—</td> — the honest no-data marker, NEVER a zero; the data side still renders its count)");
const s13ZeroCs = mc.matchMetricsHtml({ home: { ...s13HomeAtoms, cs: s11FaDigits("0"), csNoteHtml: "" }, away: s13AwayAtoms });
check(s13ZeroCs.indexOf('<td class="mcmnum">' + s11FaDigits("0") + "</td>") > -1 && s13ZeroCs.indexOf("mcmnd") === -1,
  "S13 actual zero renders: cs «۰» (a REAL zero — 0 conceded in a sufficient sample) renders as a plain number cell, NOT the «—» marker (missing ≠ zero, spec §16 — the distinction made visible: «—» = insufficient sample, «۰» = a real zero)");
// one-sided (null side) → the single-team table; fail-closed (both null) → "".
const s13OneSided = mc.matchMetricsHtml({ home: s13HomeAtoms, away: null });
check(s13OneSided.indexOf("آرسنال") > -1 && s13OneSided.indexOf("منچستر سیتی") === -1 &&
  (s13OneSided.match(/<th class="mcmteam"/g) || []).length === 1 &&
  (s13OneSided.match(/<td class="mcmnum"/g) || []).length === 3,
  "S13 one-sided omission: a null side (missing table / team not in the table / pre-season) drops its COLUMN honestly — 1 team header + 3 number cells (the data side still renders; the table never fabricates the missing side's cells)");
check(mc.matchMetricsHtml({ home: null, away: null }) === "",
  "S13 fail-closed: BOTH sides null (neither has sufficient stats) → \"\" (the no-empty-cards law — the metrics block omits entirely; the فرم section survives on the S12 dots/chip alone, the nav item logic unchanged)");

// (d) the projection — extract the REAL matchMetricsInput from pages.ts via
// ts.transpileModule with a CONTROLLABLE teamCompMetrics stub (the S12
// formProjectionEngine pattern). The stub is swappable: the integration tests
// below inject the REAL extracted teamCompMetrics for the full pipeline.
const S13_STUB_METRICS = {
  "Arsenal": { code: "PL", compFa: "لیگ برتر انگلیس", played: 11, gf: 28, ga: 12, cs: 2, csSample: 4 },
  "Man City": { code: "PL", compFa: "لیگ برتر انگلیس", played: 10, gf: 31, ga: 15, cs: 6, csSample: 10 },
  "Everton": { code: "PL", compFa: "لیگ برتر انگلیس", played: 11, gf: 5, ga: 15, cs: 5, csSample: 10 },
  "Fulham": { code: "PL", compFa: "لیگ برتر انگلیس", played: 11, gf: 9, ga: 18, cs: 5, csSample: 11 },
  "Wall FC": { code: "PL", compFa: "لیگ & <برتر>", played: 11, gf: 20, ga: 6, cs: null, csSample: null }
};
let s13MetricsImpl = null; // when set, overrides the stub table (the integration injection)
function metricsProjectionEngine() {
  const ts = require(path.join(root, "node_modules", "typescript"));
  const src = read("src/seo/pages.ts")
    .replace(/^import\s+[^;]+;\n?/gm, "")
    .replace(/^export\s+/gm, "");
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.None, target: ts.ScriptTarget.ES2020 } }).outputText;
  const stubs = {
    // the controllable data stub matchMetricsInput uses:
    teamCompMetrics: function (ctx, name, archive, fullByCode, compCode) {
      if (s13MetricsImpl) return s13MetricsImpl(ctx, name, archive, fullByCode, compCode);
      return S13_STUB_METRICS[name] || null;
    },
    esc: function (s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;"); },
    toFaDigits: function (s) { return s11FaDigits(s); },
    seoTeamFaName: function (t) { return (t && (t.faName || t.name)) || ""; },
    // no-op stubs for all other imports (never called by matchMetricsInput —
    // only by buildMatchPage/buildTeamPage/etc. which are never invoked here):
    SEO: {}, absUrl: function () { return ""; }, matchPath: function () { return ""; }, compSlug: function () { return ""; }, teamSlug: function () { return ""; },
    faTime: function () { return ""; }, faDateD1: function () { return ""; }, faDateD2: function () { return ""; }, tehranDayKey: function () { return ""; }, utcTime: function () { return ""; }, statusLabelFa: function () { return ""; }, weekendWindowTehran: function () { return null; },
    COMP_EN: {},
    upcomingBig: function () { return []; }, upcomingFollowed: function () { return []; }, isBigForSeo: function () { return false; }, finishedRecent: function () { return []; }, teamMatches: function () { return { upcoming: [], finished: [] }; }, compMatches: function () { return []; }, teamsIndex: function () { return []; }, compsIndex: function () { return []; }, findMatchBySlug: function () { return null; }, findTeamBySlug: function () { return null; }, payloadTop3: function () { return {}; }, hydrateMatchVenue: async function () { return null; }, similarMatches: function () { return []; }, teamStandingsWindow: function () { return null; }, teamForm: function () { return null; }, teamSeasonRecord: function () { return null; }, heroArtSrv: function () { return null; },
    JL: {}, buildHead: function () { return ""; }, pageShell: function () { return ""; },
    seoTeamAltName: function () { return null; },
    matchCentreMain: function () { return ""; }, matchHeroHtml: function () { return ""; }, matchSummaryHtml: function () { return ""; }, matchFormHtml: function () { return ""; }, matchMetricsHtml: function () { return ""; },
    narrativeHtml: function () { return ""; }, matchStandingsWindow: function () { return null; },
    loadArchive: async function () { return []; }, fetchStandings: async function () { return null; }, translateTeam: function () { return ""; },
    M: { nameHtml: function (s) { return String(s == null ? "" : s); } }
  };
  return new Function(...Object.keys(stubs), js + "\nreturn { matchMetricsInput };")(...Object.values(stubs));
}
const mp13 = metricsProjectionEngine();
check(typeof mp13.matchMetricsInput === "function",
  "S13 projection contract: pages.ts carries matchMetricsInput (the metrics data projection — the S04 hero/S12 form precedent: pages.ts builds the MatchMetricsInput atoms, the composer renders the markup; the REAL function extracted via ts.transpileModule, never re-implemented)");
const s13Sm = {
  raw: { homeTeam: { name: "Arsenal" }, awayTeam: { name: "Man City" }, status: "" },
  s: { homeTeam: { faName: "آرسنال" }, awayTeam: { faName: "منچستر سیتی" }, competition: { code: "PL" } }
};
const s13Proj = mp13.matchMetricsInput(s13Sm, {}, [], {});
check(s13Proj.home && s13Proj.home.team === "آرسنال" &&
  s13Proj.home.sampleHtml === "در " + s11FaDigits("11") + " بازی لیگ برتر انگلیس" &&
  s13Proj.home.gf === s11FaDigits("28") && s13Proj.home.ga === s11FaDigits("12") && s13Proj.home.cs === s11FaDigits("2"),
  "S13 projection atoms: the home side carries the pre-escaped faName + the pre-built sample label «در ۱۱ بازی لیگ برتر انگلیس» (played + compFa — decisions 33/34) + the Persian-digit gf/ga/cs numerals (toFaDigits — the S11 .stpos/.stgd precedent)");
check(s13Proj.home.csNoteHtml === "در " + s11FaDigits("4") + " بازی" && s13Proj.away.csNoteHtml === "",
  "S13 projection note gating: the window note rides ONLY the materially-different side (home |4 − 11| = 7 ≥ 2 → «در ۴ بازی»; away |10 − 10| = 0 → \"\" — a one-match lag is timing noise, two or more missing games is a genuinely smaller window, decision 34)");
check(s13Proj.away && s13Proj.away.sampleHtml === "در " + s11FaDigits("10") + " بازی لیگ برتر انگلیس",
  "S13 projection unequal samples: the away side labels its OWN played count («در ۱۰ بازی…» vs the home's «در ۱۱ بازی…» — each side's label reflects its own standings row, decisions 33/34)");
const s13Sm2 = {
  raw: { homeTeam: { name: "Wall FC" }, awayTeam: { name: "NotInTable" }, status: "" },
  s: { homeTeam: { faName: "وال & <اف‌سی>" }, awayTeam: { faName: "ناشناس" }, competition: { code: "PL" } }
};
const s13Proj2 = mp13.matchMetricsInput(s13Sm2, {}, [], {});
check(s13Proj2.home && s13Proj2.home.team === "وال &amp; &lt;اف‌سی&gt;" &&
  s13Proj2.home.sampleHtml === "در " + s11FaDigits("11") + " بازی لیگ &amp; &lt;برتر&gt;" &&
  s13Proj2.home.cs === "" && s13Proj2.home.csNoteHtml === "" && s13Proj2.away === null,
  "S13 projection escaping + gates: the team name + the compFa arrive PRE-ESCAPED (the hostile «وال & <اف‌سی>» + «لیگ & <برتر>» → &amp;/&lt;/&gt; — the projection owns every escaped string, the S04 hero precedent) + cs null → \"\" (below the min-sample gate → the renderer's «—» cell) + the null side (teamCompMetrics null → the column drops — the one-sided omission)");

// (e) the integration — the REAL data helper injected into the projection's
// stub (the swappable teamCompMetrics) → the REAL projection → the REAL
// renderer: the full pipeline on the controlled pool/archive/standings rows.
s13MetricsImpl = s13Tcm;
const s13PipeInput = mp13.matchMetricsInput(s13Sm, s13Ctx, S13_ARCH, undefined);
const s13Pipe = mc.matchMetricsHtml(s13PipeInput);
check(s13Pipe.indexOf('<span class="formteam mcentre-form-participant">آرسنال</span><span class="mcmsample">در ' + s11FaDigits("11") + " بازی لیگ برتر انگلیس</span>") > -1 &&
  s13Pipe.indexOf('<span class="formteam mcentre-form-participant">منچستر سیتی</span><span class="mcmsample">در ' + s11FaDigits("10") + " بازی لیگ برتر انگلیس</span>") > -1 &&
  s13Pipe.indexOf('<td class="mcmnum">' + s11FaDigits("28") + '</td><td class="mcmnum">' + s11FaDigits("31") + "</td>") > -1 &&
  s13Pipe.indexOf('<td class="mcmnum">' + s11FaDigits("2") + ' <span class="mcmnote">در ' + s11FaDigits("4") + " بازی</span></td>") > -1 &&
  s13Pipe.indexOf('<td class="mcmnum mcmnd">—</td>') > -1,
  "S13 integration: matchMetricsHtml(matchMetricsInput(sm, ctx, archive, fullByCode)) with the REAL teamCompMetrics injected renders the full pipeline — the participant-marked names + the per-team played labels (11 vs 10 — the unequal samples) + the gf row (۲۸ | ۳۱) + Arsenal's clean-sheet cell (۲ with the material «در ۴ بازی» note — |4 − 11| ≥ 2) + Man City's muted «—» cell (csSample 1 < the min-3 gate) — the controlled pool/archive/standings rows flowing through the REAL data layer + the REAL projection + the REAL renderer");
const s13PipeFail = mc.matchMetricsHtml(mp13.matchMetricsInput({ raw: { homeTeam: { name: "X" }, awayTeam: { name: "Y" }, status: "" }, s: { homeTeam: { faName: "X" }, awayTeam: { faName: "Y" }, competition: { code: "FA_CUP" } } }, s13Ctx, S13_ARCH, undefined));
check(s13PipeFail === "",
  "S13 integration fail-closed: a cup fixture (FA_CUP — no standings table) → both sides null → the metrics block omits entirely (\"\" — the mcentre-form section survives on the S12 dots/chip alone; the فرم nav item logic unchanged)");
s13MetricsImpl = null;

// (f) the wiring — the metrics render + the combined form part + the registry
// unchanged (decision S13-1).
check(/const metricsHtml = matchMetricsHtml\(matchMetricsInput\(sm, ctx, archive, fullByCode\)\);/.test(pagesSrc) &&
  /const formPartHtml = formHtml \+ metricsHtml;/.test(pagesSrc),
  "S13 wiring call: buildMatchPage calls matchMetricsInput(sm, ctx, archive, fullByCode) + matchMetricsHtml(input) + builds the COMBINED formPartHtml = formHtml + metricsHtml — the projection reads the already-loaded data through the teamCompMetrics aggregation helper (the loadArchive + fullByCodeFor awaits — ZERO new awaits), the renderer is pure string composition in the composer");
check(/matchNavHtml\(\{ summary: summaryHtml, standings: standingsHtml, form: formPartHtml, venue: venueHtml, schedule: scheduleHtml \}\)/.test(pagesSrc) && /form: formPartHtml,/.test(pagesSrc),
  "S13 wiring dual: the COMBINED form part feeds BOTH matchNavHtml (the فرم nav item lights when EITHER the form card or the metrics card renders — the adaptive Q9=B filter reads the same part) AND matchCentreMain (the mcentre-form section anchor — the S11/S12 dual-passing precedent) (S14 co-evolution: the nav call now also passes venue: venueHtml, schedule: scheduleHtml — the pre-existing slots reused, decision S14-2)");
check(/\{ id: "mcentre-form", label: "فرم" \}/.test(pagesSrc) &&
  !/"mcentre-metrics"/.test(mcSrc.match(/MC_SECTION_ORDER[\s\S]{0,900}/) && mcSrc.match(/MC_SECTION_ORDER[\s\S]{0,900}/)[0] || "") &&
  /"mcentre-form": parts\.form/.test(mcSrc),
  "S13 wiring registry unchanged: the MC_NAV_DESTS فرم entry stays + NO mcentre-metrics section slot exists (the eleven-slot registry is unchanged — the metrics ride INSIDE the mcentre-form section, decision S13-1: no new nav destination, no new section anchor; the composer's bySlot still maps mcentre-form to parts.form)");

// (g) the cost laws — the scoped cost law (the projection + the data helper
// carry NO AI/network/KV/timer/polling/await code) + the composer purity +
// the await count stays 3.
const s13ProjSrc = (extractFnSrc(pagesSrc, "matchMetricsSideInput") || "") + (extractFnSrc(pagesSrc, "matchMetricsInput") || "");
const s13ProjStripped = s13ProjSrc.replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
check(s13ProjSrc.length > 0 && !/fetch\(|XMLHttpRequest|new Image|setTimeout|setInterval|addEventListener|\.get\(|\.put\(|env\.STATE|env\.AI|AI\.run|generateText|chat\.completions|await\b/i.test(s13ProjStripped),
  "S13 cost law (projection): matchMetricsInput + matchMetricsSideInput carry NO AI/network/KV/timer/polling/await code (the S08/S12 zero-runtime-cost law — the projection reads the already-loaded teamCompMetrics data; zero new awaits, zero new KV reads, zero new fetches; the cost check is scoped to the projection functions — pages.ts's other functions keep their legitimate fetch/KV calls)");
const s13DataSeg = s13Tcm ? (function () { const d = read("src/seo/data.ts"); const i = d.indexOf("export function teamCompMetrics"); const open = d.indexOf("| null {", i) + 7; let depth = 0, j = open; for (; j < d.length; j++) { if (d[j] === "{") depth++; else if (d[j] === "}") { depth--; if (depth === 0) break; } } return d.slice(i, j + 1); })() : "";
const s13DataStripped = s13DataSeg.replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
check(s13DataSeg.length > 0 && !/fetch\(|XMLHttpRequest|new Image|setTimeout|setInterval|addEventListener|\.get\(|\.put\(|env\.STATE|env\.AI|AI\.run|await\b/i.test(s13DataStripped),
  "S13 cost law (data helper): teamCompMetrics carries NO AI/network/KV/timer/polling/await code (the check-stats teamForm precedent — pure aggregation over the caller-passed ctx + archive rows; the pool/payload/standings/fullByCode are ALREADY LOADED by getSeoCtx + buildMatchPage's 3 pre-existing awaits — zero new KV reads, zero new fetches, ADR-006)");
const s13CompSrc = extractFnSrc(mcSrc, "matchMetricsHtml") || "";
const s13CompStripped = s13CompSrc.replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
check(s13CompSrc.length > 0 && !/fetch\(|XMLHttpRequest|new Image|setTimeout|setInterval|addEventListener|\.get\(|\.put\(|env\.STATE|env\.AI|AI\.run|import /i.test(s13CompStripped),
  "S13 composer purity: matchMetricsHtml is a pure string renderer (the composer stays the S02 pure leaf — zero imports/KV/fetch/client-scripts; the atoms arrive prebuilt from pages.ts)");
check(awaitCount === 3,
  "S13 await count: buildMatchPage's await count stays 3 (hydrateMatchVenue, loadArchive, fullByCodeFor — the pre-existing loads; the S13 metrics are pure aggregation over the already-loaded data — ZERO new awaits; the zero-runtime-cost law holds)");

// (h) the CSS — the S13 style block rides page-shell.ts AFTER S12 and BEFORE
// the S03 foundation (chronological session order: S04 → S05 → S06 → S07 →
// S08 → S11 → S12 → S13 → S03). Scoped to the #mcentre-form .mcentre-metrics
// sub-scope; logical properties only; the block's own icy/navy tokens; zero
// new assets/requests; NO bars/gradients (decision 35).
check(shellSrc.indexOf("Match Centre S12 (M5)") < shellSrc.indexOf("Match Centre S13 (M5)") && shellSrc.indexOf("Match Centre S13 (M5)") < shellSrc.indexOf("Match Centre S03 (M1)"),
  "S13 CSS placement: the S13 style block rides page-shell.ts AFTER S12 (the form renderer) and BEFORE S03 (the responsive/spacing/RTL foundation) — chronological session order: S04 → S05 → S06 → S07 → S08 → S11 → S12 → S13 → S03");
check(/#mcentre-form \.mcentre-metrics \.mcmtable\{width:100%;table-layout:fixed;border-collapse:collapse;font-size:\.8rem\}/.test(shellSrc) &&
  /#mcentre-form \.mcentre-metrics \.mcmcorner\{width:26%;text-align:start;font-weight:600;color:var\(--muted,#9aa4b2\);white-space:nowrap\}/.test(shellSrc) &&
  /#mcentre-form \.mcentre-metrics \.mcmtable thead th\{border-block-end:1px solid rgba\(51,65,85,\.9\)\}/.test(shellSrc) &&
  /#mcentre-form \.mcentre-metrics \.mcmtable tbody tr\+tr\{border-block-start:1px solid rgba\(51,65,85,\.5\)\}/.test(shellSrc),
  "S13 CSS table: the full-width fixed-layout table (the corner 26% + the two equal team columns) + the muted start-aligned corner + the thin logical dividers (the stronger thead border-block-end + the subtle tbody tr+tr border-block-start — thin, subtle dividers, spec §2)");
check(/#mcentre-form \.mcentre-metrics \.mcmteam \.formteam\{display:block;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap\}/.test(shellSrc) &&
  /#mcentre-form \.mcentre-metrics \.mcmsample\{display:block;font-size:\.66rem;font-weight:600;color:var\(--muted,#9aa4b2\);line-height:1\.7\}/.test(shellSrc),
  "S13 CSS team columns: the team name truncates to one line (min-width:0 + ellipsis + nowrap — the .stname/S12 .formteam precedent; table-layout:fixed constrains the column) + the honest sample label rides UNDER the name (muted .66rem, wraps — the honesty never truncates)");
check(/#mcentre-form \.mcentre-metrics \.mcmlbl\{text-align:start;font-weight:600;color:var\(--muted,#9aa4b2\);white-space:nowrap\}/.test(shellSrc) &&
  /#mcentre-form \.mcentre-metrics \.mcmnum\{text-align:center;font-weight:800;font-size:\.92rem;font-variant-numeric:tabular-nums;white-space:nowrap\}/.test(shellSrc) &&
  /#mcentre-form \.mcentre-metrics \.mcmnote\{font-size:\.6rem;font-weight:600;color:var\(--muted,#9aa4b2\);margin-inline-start:2px\}/.test(shellSrc) &&
  /#mcentre-form \.mcentre-metrics \.mcmnd\{font-weight:400;color:var\(--muted,#9aa4b2\)\}/.test(shellSrc),
  "S13 CSS rows: the muted start-aligned label column + the centered weight-800 tabular-digit number cells (the numbers ARE the comparison — numbers readable) + the inline-end muted window note (margin-inline-start) + the «—» insufficient marker muted at normal weight (NEVER styled like a number — missing ≠ zero)");
check(/@media \(max-width:600px\)\{[\s\S]*?#mcentre-form \.mcentre-metrics \.mcmtable\{font-size:\.72rem\}/.test(shellSrc) &&
  /@media \(max-width:600px\)\{[\s\S]*?#mcentre-form \.mcentre-metrics \.mcmnum\{font-size:\.85rem\}/.test(shellSrc) &&
  /@media \(max-width:600px\)\{[\s\S]*?#mcentre-form \.mcentre-metrics \.mcmcorner\{width:23%\}/.test(shellSrc) &&
  /@media \(max-width:600px\)\{[\s\S]*?#mcentre-form \.mcentre-metrics \.mcmsample\{font-size:\.58rem;line-height:1\.6\}/.test(shellSrc),
  "S13 CSS mobile: at ≤600px the numbers stay readable (.85rem weight 800), the table font tightens (.72rem), the corner narrows (26%→23%) so the team columns keep their share, the sample label drops to .58rem (wraps, never truncates) — table-layout:fixed + the ellipsized names keep the 3-column table inside the viewport, no horizontal scroll (spec §9 'Numbers remain the focus' + spec §4)");
check(!/#mcentre-form \.mcentre-metrics[^{]*\{[^}]*linear-gradient/.test(shellSrc) && !/#mcentre-form \.mcentre-metrics[^{]*\{[^}]*background[^}]*width:/.test(shellSrc),
  "S13 CSS no bars/charts: the metrics sub-scope carries NO gradients and NO width-scaled backgrounds (decision 35: 'Clean numerical comparison; no decorative bars or charts' — the CSS mirrors the markup law)");
check(!/#mcentre-form \.mcentre-metrics[^{]*\{[^}]*\b(margin-left|margin-right|padding-left|padding-right|left:|right:)\b/.test(shellSrc),
  "S13 CSS logical properties: the S13 metrics block uses CSS logical properties ONLY (text-align:start, border-block-end, border-block-start, margin-inline-start, padding-block — RTL/LTR clean under a dir flip, decision 2; no physical left/right properties)");
check((shellSrc.match(/#mcentre-form \.formteam\.mcentre-form-participant\{font-weight:600;color:#7dd3fc\}/g) || []).length === 1,
  "S13 CSS participant-mark reuse: the S12 participant rule is REUSED exactly once (no S13 duplicate — the metrics card rides INSIDE #mcentre-form so the S12 rule applies to the column team names with NO new participant rule; the «reuse, don't duplicate» discipline)");

// ---------- 15. S14 (M6): the venue panel + the seven-day schedule data layer ----------
// specification §10 (Venue) + §11 (Weekly fixture schedule) +
// milestones-and-sessions.md M6/S14 + decisions 37/38/42 + audit §4 rows
// 72/74 + §5 R1. S14 ships the DATA SELECTION — the venue panel (the compact
// information card: the stadium name [Q2=A: name only, city/country omitted]
// + the discreet verified-source mark «تأییدشده»; decisions 37/38: NO
// map/preview/external nav) + the seven-day schedule DATA layer (the
// windowSchedule helper + the MatchScheduleInput atoms; S15 renders the
// rows + the «نمایش روزهای بعد» expand control). The R1 venue double-wording
// fix (audit §5 R1) rides the answer sentence (the no-prepend-if-already-
// present pattern). The mcentre-venue + mcentre-schedule slots ALREADY EXIST
// in the S02 registry (decision S14-2: NO new nav destination, NO new
// section anchor). S14 is the pure-data layer — NO inline JS, NO expand
// control this session.

// (a) the contract — matchVenueHtml + matchScheduleHtml + the projection
// interfaces exported + the data helper windowSchedule exported from data.ts
// (audit §12 row S14: "src/seo/data.ts (7-day window helper),
// src/seo/match-centre.ts | venue panel [name only — Q2=A], 48h emphasis,
// coverage-note data").
check(typeof mc.matchVenueHtml === "function" &&
  /export interface MatchVenueInput/.test(mcSrc) &&
  typeof mc.matchScheduleHtml === "function" &&
  /export interface MatchScheduleInput/.test(mcSrc) &&
  /export interface MatchScheduleDayGroup/.test(mcSrc) &&
  /export interface MatchScheduleRowInput/.test(mcSrc),
  "S14 contract: matchVenueHtml + matchScheduleHtml + MatchVenueInput/MatchScheduleInput/MatchScheduleDayGroup/MatchScheduleRowInput exported (the pre-built-atoms projection — the composer stays import-free, the S04 hero precedent; pages.ts's matchVenueInput/matchScheduleInput pre-escapes/prebuilds every string; the schedule atoms are forward-compatible for S15's row renderer)");
check(/export function windowSchedule\(ctx: SeoCtx, fixtureDate: string, fixturePath: string\): WindowSchedule \| null/.test(read("src/seo/data.ts")) &&
  /export interface WindowSchedule/.test(read("src/seo/data.ts")) &&
  /export interface ScheduleDayGroup/.test(read("src/seo/data.ts")) &&
  /export interface ScheduleRow/.test(read("src/seo/data.ts")),
  "S14 data contract: data.ts exports windowSchedule + the WindowSchedule/ScheduleDayGroup/ScheduleRow interfaces (the S14 aggregation helper — pure aggregation over (ctx, fixtureDate, fixturePath); the CALLER passes the already-loaded ctx in [data.ts cannot import files.ts — the teamForm/teamCompMetrics precedent]; the 7-day window reads the already-loaded ctx.pool rows [the matches_v13_tracked 92-day horizon, hidden leagues filtered — the SAME pool the S12 form + the S13 clean-sheet reads use] + payload.thisWeek/nextWeek [deduped])");

// (b) the data helper — extract the REAL windowSchedule from data.ts
// (brace-matched extraction + ts.transpileModule for the TS annotations — the
// S13 teamCompMetrics brace-matching precedent) with the REAL tehranDayKey
// (extracted from seo/utils.ts — the S13 normalizeTeamName precedent; utils.ts
// imports ./config which Node's type-stripping require can't resolve, so the
// REAL tehranDayKey + its tehranParts helper are brace-extracted + transpiled
// + fed a stub SEO = { DISPLAY_TZ: 'Asia/Tehran' }) + a controllable
// COMP_EN/translateCompetition stub. The controlled data: a fake pool (raw +
// shaped twins) + a payload (thisWeek + nextWeek lists) + a fixture (date +
// path) — the same-day/next-48h/remaining grouping + the fixture-self-
// exclusion + the ±3.5d window edges + the dedupe + the empty-window case.
function s14TehranDayKey() {
  const ts = require(path.join(root, "node_modules", "typescript"));
  const u = read("src/seo/utils.ts");
  const start = u.indexOf("export function tehranParts");
  const dkStart = u.indexOf("export function tehranDayKey", start);
  const dkBodyOpen = u.indexOf("{", dkStart);
  let depth = 0, j = dkBodyOpen;
  for (; j < u.length; j++) { if (u[j] === "{") depth++; else if (u[j] === "}") { depth--; if (depth === 0) break; } }
  const seg = u.slice(start, j + 1).replace(/^export /gm, ""); // strip ALL export keywords (tehranParts + tehranDayKey — two functions; the /gm flag strips both, the S13 single-function .replace(/^export /,"") precedent generalised)
  const js = ts.transpileModule(seg, { compilerOptions: { module: ts.ModuleKind.None, target: ts.ScriptTarget.ES2020 } }).outputText;
  const SEO = { DISPLAY_TZ: "Asia/Tehran" };
  return new Function("SEO", js + "\n; return tehranDayKey;")(SEO);
}
function s14DataEngine() {
  const ts = require(path.join(root, "node_modules", "typescript"));
  const d = read("src/seo/data.ts");
  const i = d.indexOf("export function windowSchedule");
  if (i < 0) return null;
  const open = d.indexOf("| null {", i) + 7; // body-open anchored past the return-type braces (the S13 teamCompMetrics precedent)
  let depth = 0, j = open;
  for (; j < d.length; j++) {
    if (d[j] === "{") depth++;
    else if (d[j] === "}") { depth--; if (depth === 0) break; }
  }
  const seg = d.slice(i, j + 1).replace(/^export /, "");
  const js = ts.transpileModule(seg, { compilerOptions: { module: ts.ModuleKind.None, target: ts.ScriptTarget.ES2020 } }).outputText;
  const tehranDayKey = s14TehranDayKey();
  const COMP_EN = { PL: "Premier League", BL1: "Bundesliga", CL: "Champions League" };
  const translateCompetition = function (c) { return c === "CL" ? "\u0644\u06CC\u06AF \u0642\u0647\u0631\u0645\u0627\u0646\u0627\u0646 \u0627\u0631\u0648\u067E\u0627" : c; };
  return new Function("tehranDayKey", "COMP_EN", "translateCompetition", js + "\n; return windowSchedule;")(tehranDayKey, COMP_EN, translateCompetition);
}
const s14Ws = s14DataEngine();
check(typeof s14Ws === "function" && typeof s14TehranDayKey() === "function",
  "S14 data extraction: the REAL windowSchedule extracted from data.ts via brace-matched extraction + ts.transpileModule (never re-implemented — the S13 teamCompMetrics brace-matching precedent), fed the REAL tehranDayKey (extracted from seo/utils.ts via the same brace-matched extraction + transpileModule, fed a stub SEO = { DISPLAY_TZ: 'Asia/Tehran' } — utils.ts imports ./config which Node's type-stripping require can't resolve, so the REAL tehranDayKey + its tehranParts helper are extracted, not required) + controllable COMP_EN/translateCompetition stubs");
if (s14Ws) {
  // the controlled data: a fixture (2026-11-29 17:30Z, a PL match) + a pool of
  // 6 matches around it (same-day, next-48h, remaining, the fixture itself,
  // outside the window, a DUPLICATE across pool+payload — the dedupe key)
  const fxDate = "2026-11-29T17:30:00Z";
  const fxPath = "/arsenal-vs-mancity-2026-11-29";
  const mkRow = (home, away, iso, code, status, gh, ga, path) => ({
    utcDate: iso, homeTeam: { name: home, faName: home + "Fa" }, awayTeam: { name: away, faName: away + "Fa" },
    competition: { code: code, faName: code === "PL" ? "لیگ برتر انگلیس" : (code === "BL1" ? "بوندسلیگا" : "لیگ قهرمانان") },
    status: status, score: status === "FINISHED" ? { fullTime: { home: gh, away: ga } } : undefined,
    score: status === "FINISHED" ? { home: gh, away: ga } : undefined, path: path
  });
  const pool = [
    mkRow("Arsenal", "Man City", fxDate, "PL", "SCHEDULED", null, null, fxPath),       // the fixture itself (excluded by path)
    mkRow("Liverpool", "Chelsea", "2026-11-29T15:00:00Z", "PL", "FINISHED", 2, 1, "/liverpool-vs-chelsea-2026-11-29"), // same-day (before kickoff)
    mkRow("Spurs", "Newcastle", "2026-11-29T20:00:00Z", "PL", "SCHEDULED", null, null, "/spurs-vs-newcastle-2026-11-29"), // same-day (after kickoff)
    mkRow("Dortmund", "Leverkusen", "2026-11-30T17:30:00Z", "BL1", "SCHEDULED", null, null, "/dortmund-vs-leverkusen-2026-11-30"), // next-48h (the next day)
    mkRow("Bayern", "Leipzig", "2026-12-02T17:30:00Z", "BL1", "SCHEDULED", null, null, "/bayern-vs-leipzig-2026-12-02"), // remaining (>48h after, within ±3.5d)
    mkRow("PSG", "Marseille", "2026-11-25T17:30:00Z", "CL", "FINISHED", 3, 0, "/psg-vs-marseille-2026-11-25")  // outside the window (4 days before — >3.5d)
  ];
  const shaped = pool.slice(); // the shaped twin (pubMatch shape — same fields for the test)
  const payload = {
    thisWeek: [mkRow("Liverpool", "Chelsea", "2026-11-29T15:00:00Z", "PL", "FINISHED", 2, 1, "/liverpool-vs-chelsea-2026-11-29")], // a DUPLICATE of a pool row (the dedupe key)
    nextWeek: [mkRow("Atletico", "Barcelona", "2026-12-01T17:30:00Z", "CL", "SCHEDULED", null, null, "/atletico-vs-barca-2026-12-01")] // next-48h (within 48h, the 2nd day after)
  };
  const ctx = { pool: pool, shaped: shaped, payload: payload };
  const win = s14Ws(ctx, fxDate, fxPath);
  // the fixture-self-exclusion: the fixture (Arsenal vs Man City) is NOT in the window (excluded by path)
  check(win && !win.sameDay.flatMap(g => g.rows).some(r => r.homeFa === "ArsenalFa") && !win.next48h.flatMap(g => g.rows).some(r => r.homeFa === "ArsenalFa") && !win.remaining.flatMap(g => g.rows).some(r => r.homeFa === "ArsenalFa"),
    "S14 fixture-self-exclusion: the fixture ITSELF is excluded by path (the pubMatch shape always carries a path — no self-reference in its own schedule; the Arsenal-vs-ManCity fixture at /arsenal-vs-mancity-2026-11-29 is NOT in sameDay/next48h/remaining)");
  // the same-day grouping: the 2 same-day matches (Liverpool vs Chelsea [15:00Z], Spurs vs Newcastle [20:00Z]) — the fixture's Tehran calendar day (2026-11-29)
  const sameDayRows = win.sameDay.length === 1 ? win.sameDay[0].rows : [];
  check(win && win.sameDay.length === 1 && sameDayRows.length === 2 &&
    sameDayRows[0].homeFa === "LiverpoolFa" && sameDayRows[1].homeFa === "SpursFa", // chronological (15:00Z before 20:00Z)
    "S14 same-day grouping: the 2 same-day matches (Liverpool vs Chelsea [15:00Z, FINISHED] + Spurs vs Newcastle [20:00Z, SCHEDULED]) group under the fixture's Tehran calendar day (2026-11-29), chronological (the earlier kickoff first — spec §11 «Same-day matches first»)");
  // the next-48h grouping: Dortmund vs Leverkusen (next day, 2026-11-30) + Atletico vs Barcelona (2026-12-01, from the payload nextWeek, within 48h) — NOT the same-day matches
  const next48hRows = win.next48h.length === 2 ? win.next48h[0].rows.concat(win.next48h[1].rows) : [];
  check(win && win.next48h.length === 2 && next48hRows.length === 2 &&
    next48hRows.some(r => r.homeFa === "DortmundFa") && next48hRows.some(r => r.homeFa === "AtleticoFa"),
    "S14 next-48h grouping: the 48h-AFTER-kickoff matches on OTHER days (Dortmund vs Leverkusen [2026-11-30, the next day] + Atletico vs Barcelona [2026-12-01, from the payload nextWeek, within 48h]) — the emphasized window (spec §11 «next 48 hours»); same-day matches do NOT leak into next48h (sameDay takes precedence)");
  // the remaining grouping: Bayern vs Leipzig (2026-12-02, >48h after, within ±3.5d) — for S15's expand control
  const remainingRows = win.remaining.length === 1 ? win.remaining[0].rows : [];
  check(win && win.remaining.length === 1 && remainingRows.length === 1 && remainingRows[0].homeFa === "BayernFa",
    "S14 remaining grouping: the >48h-after match (Bayern vs Leipzig [2026-12-02, within the ±3.5d window]) groups into remaining — for S15's «نمایش روزهای بعد» expand control; a match >48h after the fixture but within the 7-day window is NOT same-day/next-48h");
  // the ±3.5d window edge: PSG vs Marseille (2026-11-25, 4 days before — >3.5d) is EXCLUDED (outside the window)
  check(win && !win.sameDay.flatMap(g => g.rows).concat(win.next48h.flatMap(g => g.rows), win.remaining.flatMap(g => g.rows)).some(r => r.homeFa === "PSGFa"),
    "S14 window edge (±3.5d): the 4-days-before match (PSG vs Marseille [2026-11-25, >3.5d before the fixture]) is EXCLUDED — outside the 7-day window (the ±3.5d boundary); only matches within [fixtureDate − 3.5d, fixtureDate + 3.5d] are collected");
  // the dedupe: the Liverpool vs Chelsea match appears in BOTH the pool AND the payload.thisWeek — counted ONCE (the teamForm dedupe key: home|away|utcDate-day)
  const allRows = win.sameDay.flatMap(g => g.rows).concat(win.next48h.flatMap(g => g.rows), win.remaining.flatMap(g => g.rows));
  check(win && allRows.filter(r => r.homeFa === "LiverpoolFa").length === 1,
    "S14 dedupe: the Liverpool vs Chelsea match appears in BOTH the pool AND the payload.thisWeek — counted ONCE (the teamForm dedupe key: home|away|utcDate-day — a match is never double-counted across the pool + the payload lists)");
  // the coverage-note flag: always true when the window is anchored (the mandatory tracked-universe coverage note)
  check(win && win.coverageNote === true && win.total === allRows.length,
    "S14 coverage-note flag: the coverageNote flag is always true when the window is anchored (the mandatory tracked-universe coverage note — audit §4 row 74 + decision 42; the no-false-empty law: empty ≠ «بدون مسابقه», spec §11); the total counts the deduped rows");
  // the empty window: a fixture with NO other matches in the 7-day window → empty groups + coverageNote:true (NOT a fabricated «no matches»)
  const emptyWin = s14Ws({ pool: [mkRow("Arsenal", "Man City", fxDate, "PL", "SCHEDULED", null, null, fxPath)], shaped: [mkRow("Arsenal", "Man City", fxDate, "PL", "SCHEDULED", null, null, fxPath)], payload: { thisWeek: [], nextWeek: [] } }, fxDate, fxPath);
  check(emptyWin && emptyWin.sameDay.length === 0 && emptyWin.next48h.length === 0 && emptyWin.remaining.length === 0 && emptyWin.total === 0 && emptyWin.coverageNote === true,
    "S14 empty window (no-false-empty): a fixture with NO other matches in the 7-day window → empty sameDay/next48h/remaining + coverageNote:true (the no-false-empty law — spec §11 «Never say «بدون مسابقه» merely because the dataset is empty»; the caller renders the coverage note ALONE, NOT a fabricated «no matches» — the tracked-universe coverage disclosure)");
  // the degenerate guard: a missing/invalid fixtureDate → null (can't anchor the window — every match carries a utcDate, so this is the degenerate guard)
  check(s14Ws(ctx, "", fxPath) === null && s14Ws(ctx, "not-a-date", fxPath) === null,
    "S14 degenerate guard: a missing/invalid fixtureDate → null (can't anchor the 7-day window — every match carries a utcDate, so this is the degenerate guard; the caller's projection returns coverageNote:false → the schedule section omits entirely)");
  // the row atoms: the compFa + the score + the status (the S15 broadcast-row inputs)
  const livRow = sameDayRows.find(r => r.homeFa === "LiverpoolFa");
  check(livRow && livRow.compFa === "لیگ برتر انگلیس" && livRow.gh === 2 && livRow.ga === 1 && livRow.finished === true && livRow.live === false && livRow.path === "/liverpool-vs-chelsea-2026-11-29",
    "S14 row atoms: a FINISHED row carries compFa (the compNameFa fallback: s.competition.faName || translateCompetition || COMP_EN || code) + the gh/ga score (from raw.score.fullTime or s.score) + the finished flag + the path (the S15 broadcast-row inputs — forward-compatible)");
  const spursRow = sameDayRows.find(r => r.homeFa === "SpursFa");
  check(spursRow && spursRow.gh === null && spursRow.ga === null && spursRow.finished === false && spursRow.live === false,
    "S14 upcoming row: a SCHEDULED row carries gh/ga = null (not scored — the S15 upcoming marker) + finished/live = false (MISSING IS NOT ZERO — a not-scored match is never a fake 0-0)");
}

// (c) the renderer — the REAL matchVenueHtml + matchScheduleHtml (the
// composer is a pure leaf — required directly, the S13 matchMetricsHtml
// precedent; zero imports/KV/fetch/client-scripts).
check(mc.matchVenueHtml({ nameHtml: "" }) === "" &&
  mc.matchVenueHtml({ nameHtml: "ورزشگاه آلیانز آرنا" }) === '<div class="card mcentre-venue-panel"><h2>ورزشگاه</h2><div class="mcentre-venue-name">ورزشگاه آلیانز آرنا</div><div class="mcentre-venue-mark">تأییدشده</div></div>',
  "S14 venue renderer: the compact information card — the <h2>«ورزشگاه»</h2> title + the stadium name (.mcentre-venue-name) + the discreet verified-source mark «تأییدشده» (.mcentre-venue-mark); NO map/preview/external-nav (decisions 37/38); the stadium name shows venueFa AS-IS (NO «ورزشگاه » prepend — the R1 no-double pattern); fail-closed: nameHtml \"\" → \"\" (the no-empty-cards law — a missing venue is NOT «ورزشگاه نامشخص»)");
check(mc.matchScheduleHtml({ sameDay: [], next48h: [], remaining: [], coverageNote: false }) === "" &&
  mc.matchScheduleHtml({ sameDay: [], next48h: [], remaining: [], coverageNote: true }) === '<div class="mcentre-schedule"><h2>بازی\u200cهای هفته</h2><p class="mcentre-schedule-note">این برنامه بر اساس داده\u200cهای موجود نمایش داده می\u200cشود و ممکن است شامل تمام بازی\u200cها نباشد.</p></div>',
  "S14 schedule renderer (S15 co-evolution): the <h2>«بازی\u200cهای هفته»</h2> section title + the discreet tracked-universe coverage note (.mcentre-schedule-note) — S15 EXTENDS the renderer to consume the day-group atoms (the rows + the date headings + the «نمایش روزهای بعد» expand control) for NON-EMPTY windows, but an EMPTY window (sameDay/next48h/remaining all empty) still renders the coverage note ALONE (byte-identical to S14 — the no-false-empty law: coverageNote:true — NEVER «بدون مسابقه», spec §11; NO rows, NO button, NO remaining container); fail-closed: coverageNote:false (the degenerate guard — no fixture date) → \"\" (the section omits entirely); the inline JS rides pages.ts's matchScheduleScript (the S06 precedent — the composer stays the pure leaf)");
// the empty-window case: the coverage note renders ALONE (not «بدون مسابقه») — the no-false-empty law
check(/mcentre-schedule-note/.test(mc.matchScheduleHtml({ sameDay: [], next48h: [], remaining: [], coverageNote: true })) &&
  !/بدون\s*مسابقه/.test(mc.matchScheduleHtml({ sameDay: [], next48h: [], remaining: [], coverageNote: true })),
  "S14 no-false-empty law: an EMPTY window renders the coverage note ALONE — NEVER «بدون مسابقه» (spec §11 «Never say «بدون مسابقه» merely because the dataset is empty»; the discreet tracked-universe coverage note is the antidote — the section is present with the note, not a false «no matches» message; audit §4 row 74: «empty ≠ «no matches»»)");

// (d) the projection — the REAL matchVenueInput + matchScheduleInput (the
// S12/S13 extractFnSrc + ts.transpileModule pattern with a STUB data module
// — the projection reads the already-loaded data; the swappable windowSchedule
// stub feeds the controlled window).
const s14VenueProj = extractFnSrc(pagesSrc, "matchVenueInput");
check(s14VenueProj && /sm\.s\.venueFa\s*\|\|\s*sm\.s\.venue/.test(s14VenueProj) && /nameHtml:\s*v\s*\?\s*esc\(v\)\s*:\s*""/.test(s14VenueProj),
  "S14 venue projection: matchVenueInput reads the ALREADY-LOADED sm.s.venueFa || sm.s.venue (the hydrateMatchVenue await — one of the 3 pre-existing awaits; the venue is ALREADY LOADED, ZERO new awaits) + pre-escapes the name (nameHtml = esc(v) when present, \"\" when missing → the panel omits — the no-empty-cards law; the stadium name shows venueFa AS-IS, NO prepend — the R1 no-double pattern)");
function s14ProjEngine() {
  const ts = require(path.join(root, "node_modules", "typescript"));
  const d = read("src/seo/data.ts");
  const i = d.indexOf("export function windowSchedule");
  const open = d.indexOf("| null {", i) + 7;
  let depth = 0, j = open;
  for (; j < d.length; j++) { if (d[j] === "{") depth++; else if (d[j] === "}") { depth--; if (depth === 0) break; } }
  const wsSeg = d.slice(i, j + 1).replace(/^export /, "");
  const wsJs = ts.transpileModule(wsSeg, { compilerOptions: { module: ts.ModuleKind.None, target: ts.ScriptTarget.ES2020 } }).outputText;
  const tehranDayKey = s14TehranDayKey();
  const windowSchedule = new Function("tehranDayKey", "COMP_EN", "translateCompetition", wsJs + "\n; return windowSchedule;")(tehranDayKey, { PL: "Premier League", BL1: "Bundesliga", CL: "Champions League" }, function (c) { return c === "CL" ? "لیگ قهرمانان اروپا" : c; });
  // the projection reads windowSchedule + matchPath + esc + toFaDigits + faTime + faDateD2 (all stubbed except windowSchedule which is the REAL extracted helper)
  const proj = extractFnSrc(pagesSrc, "matchScheduleInput");
  if (!proj) return null;
  const projJs = ts.transpileModule(proj, { compilerOptions: { module: ts.ModuleKind.None, target: ts.ScriptTarget.ES2020 } }).outputText;
  const matchPath = function (h, a, iso) { return "/" + String(h).toLowerCase().replace(/\s+/g, "-") + "-vs-" + String(a).toLowerCase().replace(/\s+/g, "-") + "-" + String(iso).slice(0, 10); };
  const esc = function (s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); };
  const toFaDigits = function (s) { return String(s).replace(/[0-9]/g, function (d) { return "۰۱۲۳۴۵۶۷۸۹"[+d]; }); };
  const faTime = function (iso) { var d = new Date(iso); var h = String(d.getUTCHours()).padStart(2, "0"); var m = String(d.getUTCMinutes()).padStart(2, "0"); return h + ":" + m; };
  const faDateD2 = function (iso) { return "، " + iso.slice(0, 10); }; // a stub (the REAL one is the Jalali+Gregorian formatter — the projection's dateHtml is forward-compatible for S15; the stub verifies the projection CALLS faDateD2 with the dayKey ISO)
  return new Function("windowSchedule", "matchPath", "esc", "toFaDigits", "faTime", "faDateD2", projJs + "\n; return matchScheduleInput;")(windowSchedule, matchPath, esc, toFaDigits, faTime, faDateD2);
}
const s14SchedProj = s14ProjEngine();
check(typeof s14SchedProj === "function",
  "S14 schedule projection extraction: the REAL matchScheduleInput extracted from pages.ts via extractFnSrc + ts.transpileModule, fed the REAL windowSchedule (extracted from data.ts — the same brace-matched extraction) + stub matchPath/esc/toFaDigits/faTime/faDateD2 (the S12/S13 swappable-stub precedent; the projection reads the already-loaded data through the windowSchedule aggregation helper)");
if (s14SchedProj) {
  const fxDate = "2026-11-29T17:30:00Z";
  const fxPath = "/arsenal-vs-mancity-2026-11-29";
  const mkS = (home, away, iso, code, status, gh, ga, path) => ({
    utcDate: iso, homeTeam: { name: home, faName: home }, awayTeam: { name: away, faName: away },
    competition: { code: code, faName: code === "PL" ? "لیگ برتر انگلیس" : "بوندسلیگا" }, status: status,
    score: status === "FINISHED" ? { fullTime: { home: gh, away: ga } } : undefined, path: path
  });
  const pool = [
    mkS("Arsenal", "Man City", fxDate, "PL", "SCHEDULED", null, null, fxPath),
    mkS("Liverpool", "Chelsea", "2026-11-29T15:00:00Z", "PL", "FINISHED", 2, 1, "/liverpool-vs-chelsea-2026-11-29"),
    mkS("Dortmund", "Leverkusen", "2026-11-30T17:30:00Z", "BL1", "SCHEDULED", null, null, "/dortmund-vs-leverkusen-2026-11-30")
  ];
  const sm = { s: { utcDate: fxDate, path: fxPath, homeTeam: { name: "Arsenal" }, awayTeam: { name: "Man City" }, venue: "Emirates", venueFa: "ورزشگاه امارات" } };
  const input = s14SchedProj(sm, { pool: pool, shaped: pool, payload: { thisWeek: [], nextWeek: [] } });
  // the projection pre-builds the day-group atoms (forward-compatible for S15)
  check(input && input.coverageNote === true && input.sameDay.length === 1 && input.sameDay[0].rows.length === 1 &&
    input.sameDay[0].rows[0].homeHtml === "Liverpool" && input.sameDay[0].rows[0].scoreHtml === "۲ – ۱" && input.sameDay[0].rows[0].finished === true,
    "S14 schedule projection atoms: the REAL matchScheduleInput pre-builds the day-group atoms — the sameDay group with the Liverpool-vs-Chelsea row (the pre-escaped homeHtml + the Persian-digit scoreHtml «۲ – ۱» + the finished flag) + the coverageNote:true; the atoms are forward-compatible for S15's row renderer (the projection owns every escaped string — the composer is a pure leaf, the S04 hero precedent)");
  check(input && input.next48h.length === 1 && input.next48h[0].rows.length === 1 && input.next48h[0].rows[0].compHtml === "بوندسلیگا" && input.next48h[0].rows[0].scoreHtml === "" && input.next48h[0].rows[0].live === false,
    "S14 schedule projection upcoming row: the Dortmund-vs-Leverkusen row (SCHEDULED) carries compHtml «بوندسلیگا» + scoreHtml \"\" (not scored — the S15 upcoming marker) + live:false (MISSING IS NOT ZERO); the compFa fallback (s.competition.faName || translateCompetition || COMP_EN || code) resolves the BL1 faName");
  check(input && input.remaining.length === 0,
    "S14 schedule projection remaining: the Bayern-vs-Leipzig match is NOT in this pool (the controlled data has only same-day + next-48h) → remaining is empty; the remaining groups are forward-compatible for S15's expand control");
  // the timeHtml + the pathHtml atoms (the S15 broadcast-row inputs)
  const livRow = input && input.sameDay[0].rows[0];
  check(livRow && /<time datetime=/.test(livRow.timeHtml) && /۱۵:۰۰|15:00/.test(livRow.timeHtml) && /<a href="\/liverpool-vs-chelsea-2026-11-29">Liverpool – Chelsea<\/a>/.test(livRow.pathHtml),
    "S14 schedule projection time/link atoms: the timeHtml carries the <time datetime=...> + the Persian-digit kickoff time (faTime) + the pathHtml carries the <a href=\"/liverpool-vs-chelsea-2026-11-29\">Liverpool – Chelsea</a> link (the S15 broadcast-row inputs — forward-compatible)");
}

// (e) the integration — the REAL windowSchedule feeds the REAL projection
// (the S12/S13 swappable-stub precedent). A venue-present case → the panel
// renders; a venue-missing case → the panel omits; an empty-window case →
// the schedule coverage note renders ALONE.
check(mc.matchVenueHtml({ nameHtml: "ورزشگاه آلیانز آرنا" }).includes("mcentre-venue-name") && mc.matchVenueHtml({ nameHtml: "ورزشگاه آلیانز آرنا" }).includes("mcentre-venue-mark"),
  "S14 integration (venue present): the venue panel renders the .mcentre-venue-name + the .mcentre-venue-mark (the verified-source mark «تأییدشده») — the compact information card with the RICHER presentation (the distinct role vs the byte-frozen S07 facts-table venue cell — decision S14-Venue-Redundancy option [a])");
check(mc.matchVenueHtml({ nameHtml: "" }) === "",
  "S14 integration (venue missing): a missing venue → nameHtml \"\" → the panel omits entirely (the no-empty-cards law — a missing venue is NOT «ورزشگاه نامشخص»; the mcentre-venue section omits, the ورزشگاه nav item stays filtered out)");
check(mc.matchScheduleHtml({ sameDay: [], next48h: [], remaining: [], coverageNote: true }).includes("mcentre-schedule-note") && !/نمایش\s*روزهای\s*بعد/.test(mc.matchScheduleHtml({ sameDay: [], next48h: [], remaining: [], coverageNote: true })),
  "S14 integration (empty window) (S15 co-evolution): the schedule section renders the coverage note ALONE (the no-false-empty law) — NO «نمایش روزهای بعد» expand control for an EMPTY window (S15 ships the expand control ONLY when there are remaining groups — an empty window has none; the empty-window output is byte-identical to S14)");

// (f) the wiring — buildMatchPage calls matchVenueInput/matchVenueHtml +
// matchScheduleInput/matchScheduleHtml + passes venue + schedule to BOTH
// matchNavHtml (the ورزشگاه + بازی‌ها nav items — the adaptive Q9=B filter)
// AND matchCentreMain (the mcentre-venue + mcentre-schedule section anchors).
// The pre-existing slots (decision S14-2): NO new nav destination, NO new
// section anchor (the eleven-slot registry + the five nav destinations
// unchanged — S14 wires content into the pre-existing slots, the S13 discipline).
check(/const venueHtml = matchVenueHtml\(matchVenueInput\(sm\)\);/.test(pagesSrc) && /const scheduleHtml = matchScheduleHtml\(matchScheduleInput\(sm, ctx\)\);/.test(pagesSrc),
  "S14 wiring call: buildMatchPage calls matchVenueInput(sm) + matchVenueHtml(input) + matchScheduleInput(sm, ctx) + matchScheduleHtml(input) — the projection reads the already-loaded data (the venue via the hydrateMatchVenue await; the schedule via the windowSchedule aggregation helper over the already-loaded ctx.pool — ZERO new awaits), the renderers are pure string composition in the composer");
check(/matchNavHtml\(\{ summary: summaryHtml, standings: standingsHtml, form: formPartHtml, venue: venueHtml, schedule: scheduleHtml \}\)/.test(pagesSrc) &&
  /venue: venueHtml,/.test(pagesSrc) && /schedule: scheduleHtml \? scheduleHtml \+ matchScheduleScript\(\)/.test(pagesSrc),
  "S14 wiring dual (S15 co-evolution): the venue + schedule strings feed BOTH matchNavHtml (the ورزشگاه + بازی‌ها nav items — the adaptive Q9=B filter lights them only when their part is non-empty — the nav call passes schedule: scheduleHtml unchanged) AND matchCentreMain (the mcentre-venue + mcentre-schedule section anchors — the S11/S12/S13 dual-passing precedent; the S15 schedule part now carries the matchScheduleScript inline JS when the section renders — schedule: scheduleHtml ? scheduleHtml + matchScheduleScript() : empty-string, the ternary guard — no bare script on the degenerate-omitted section, the S06 nav-script-rides-the-part precedent)");
check(/{ slot: "mcentre-venue", label: "ورزشگاه" }/.test(mcSrc) && /{ slot: "mcentre-schedule", label: "بازی\u200cهای هفته" }/.test(mcSrc) &&
  /"mcentre-venue": parts\.venue/.test(mcSrc) && /"mcentre-schedule": parts\.schedule/.test(mcSrc) &&
  !/"mcentre-metrics"/.test(mcSrc.match(/MC_SECTION_ORDER[\s\S]{0,900}/) && mcSrc.match(/MC_SECTION_ORDER[\s\S]{0,900}/)[0] || ""),
  "S14 wiring registry unchanged (decision S14-2): the mcentre-venue + mcentre-schedule section slots ALREADY EXIST in the S02 registry (MC_SECTION_ORDER line 109/110 + the bySlot map line 571/572) + the MC_NAV_DESTS ورزشگاه + بازی‌ها entries stay — NO new nav destination, NO new section anchor (the eleven-slot registry + the five nav destinations unchanged — S14 wires content into the pre-existing slots, the S13 discipline; the composer's bySlot maps mcentre-venue→parts.venue + mcentre-schedule→parts.schedule)");
check(/{ id: "mcentre-venue", label: "ورزشگاه" }/.test(pagesSrc) && /{ id: "mcentre-schedule", label: "بازی\u200cها" }/.test(pagesSrc),
  "S14 nav destinations unchanged: the MC_NAV_DESTS ورزشگاه + بازی‌ها entries stay (the five nav destinations — S14 reuses the pre-existing ورزشگاه + بازی‌ها destinations, NO new nav item; the Q9=B adaptive filter lights them only when their part is non-empty)");

// (g) the R1 venue double-wording fix (audit §5 R1) — the answer sentence
// no-longer double-prepends «ورزشگاه » when venueFa already begins with
// «ورزشگاه». A string fix, NOT a contract change (the title/meta [the venue
// clause is dropped via noVenue]/canonical/og:title/SportsEvent SHAPE/h1
// unchanged; the JSON-LD description string changes ONLY where the double-
// wording bug existed). One fix, three surfaces: the answer sentence (fixed)
// + the facts-table venue cell (byte-frozen — shows venueFa AS-IS, no prepend)
// + the new S14 venue panel (shows venueFa AS-IS, no prepend).
const r1Src = s14ExtractFnSig(pagesSrc, "matchAnswerSentence");
check(r1Src && /startsWith\("ورزشگاه"\)/.test(r1Src) && !/؛ ورزشگاه " \+/.test(r1Src.replace(/\/\/[^\n]*/g, "")),
  "S14 R1 fix (audit §5 R1): the answer sentence no-longer double-prepends «ورزشگاه » — the no-double fix checks String(v).startsWith(\"ورزشگاه\") and uses v AS-IS when it already begins with «ورزشگاه» (the curated venueFa values begin with «ورزشگاه», e.g. «ورزشگاه آلیانز آرنا»), else prepends «ورزشگاه » (the zero-cost string fix: stop prepending when venueFa already begins with «ورزشگاه» — audit §5 R1 root cause: seo/pages.ts prepends «ورزشگاه » while curated venueFa values already begin with «ورزشگاه» → «ورزشگاه ورزشگاه آلیانز آرنا»)");
// the R1 fix produces NO double «ورزشگاه ورزشگاه» (the curated name) + STILL prepends for a non-«ورزشگاه» venueFa
// NOTE: matchAnswerSentence's signature carries an inline object-type param (opts?: { noVenue?: boolean })
// — the generic extractFnSrc finds the first `{` (the object type's) and brace-matches the wrong block.
// The dedicated extractor below tracks PAREN depth past the params, then finds the body-open `{`.
function s14ExtractFnSig(src, name) {
  var re = new RegExp("function " + name + "\\(");
  var m = re.exec(src);
  if (!m) return null;
  var i = m.index + m[0].length; // just past the opening (
  var depth = 1; // inside the params (
  for (; i < src.length && depth > 0; i++) {
    if (src[i] === "(") depth++;
    else if (src[i] === ")") depth--;
  }
  // i is just past the closing ) of the params — the body-open { is the first { after it
  var bodyOpen = src.indexOf("{", i);
  if (bodyOpen < 0) return null;
  var d2 = 0, end = -1;
  for (var j = bodyOpen; j < src.length; j++) {
    if (src[j] === "{") d2++;
    else if (src[j] === "}") { d2--; if (d2 === 0) { end = j; break; } }
  }
  return end < 0 ? null : src.slice(m.index, end + 1);
}
const r1Engine = (function () {
  const ts = require(path.join(root, "node_modules", "typescript"));
  const seg = s14ExtractFnSig(pagesSrc, "matchAnswerSentence");
  if (!seg) return null;
  const js = ts.transpileModule(seg, { compilerOptions: { module: ts.ModuleKind.None, target: ts.ScriptTarget.ES2020 } }).outputText;
  // matchAnswerSentence reads: faName, M.compNameFa, faDateD1, faTime, scoreStr, utcTime (all stubbed)
  const faName = function (t) { return (t && t.faName) || (t && t.name) || ""; };
  const M = { compNameFa: function (m) { return (m.competition && (m.competition.faName || m.competition.code)) || ""; } };
  const scoreStr = function (sc) { return sc && sc.home != null ? sc.home + " - " + sc.away : ""; };
  const faTime = function () { return "17:30"; }; const utcTime = function () { return "14:00 UTC"; }; const faDateD1 = function () { return "شنبه ۱۵ آبان ۱۴۰۵"; };
  return new Function("faName", "M", "scoreStr", "faTime", "utcTime", "faDateD1", js + "\n; return matchAnswerSentence;")(faName, M, scoreStr, faTime, utcTime, faDateD1);
})();
if (r1Engine) {
  const curated = r1Engine({ s: { homeTeam: { name: "Arsenal" }, awayTeam: { name: "Man City" }, competition: { code: "PL" }, roundFa: "", utcDate: "2026-11-29T17:30:00Z", venue: "Allianz Arena", venueFa: "ورزشگاه آلیانز آرنا", score: null }, raw: { status: "SCHEDULED", minute: null } });
  check(curated.includes("؛ ورزشگاه آلیانز آرنا.") && !/ورزشگاه ورزشگاه/.test(curated),
    "S14 R1 fix (curated venueFa): the curated venueFa «ورزشگاه آلیانز آرنا» (already begins with «ورزشگاه») → the answer sentence uses it AS-IS (no prepend) → «؛ ورزشگاه آلیانز آرنا.» — NO double «ورزشگاه ورزشگاه» (the R1 double-wording bug fixed; audit §5 R1 root cause: the prepend produced «ورزشگاه ورزشگاه آلیانز آرنا» before the fix)");
  const nonCurated = r1Engine({ s: { homeTeam: { name: "Arsenal" }, awayTeam: { name: "Man City" }, competition: { code: "PL" }, roundFa: "", utcDate: "2026-11-29T17:30:00Z", venue: "Emirates Stadium", venueFa: "امارات", score: null }, raw: { status: "SCHEDULED", minute: null } });
  check(nonCurated.includes("؛ ورزشگاه امارات.") && !/ورزشگاه ورزشگاه/.test(nonCurated),
    "S14 R1 fix (non-curated venueFa): a venueFa that does NOT begin with «ورزشگاه» («امارات») → the answer sentence PREPENDS «ورزشگاه » → «؛ ورزشگاه امارات.» (the fix only skips the prepend when venueFa already begins with «ورزشگاه» — the curated names; a non-curated name still gets the «ورزشگاه » prefix so the sentence stays grammatical)");
  // the noVenue trim ladder (SS-11) still drops the venue clause (the meta description's first trim step) — the R1 fix doesn't break the trim ladder
  const noVenue = r1Engine({ s: { homeTeam: { name: "Arsenal" }, awayTeam: { name: "Man City" }, competition: { code: "PL" }, roundFa: "", utcDate: "2026-11-29T17:30:00Z", venue: "Allianz Arena", venueFa: "ورزشگاه آلیانز آرنا", score: null }, raw: { status: "SCHEDULED", minute: null } }, { noVenue: true });
  check(!/ورزشگاه/.test(noVenue),
    "S14 R1 fix + the noVenue trim ladder: opts.noVenue still drops the venue clause entirely (the SS-11 meta-description trim ladder's first step — the R1 fix is a string fix to the venue clause, NOT a contract change; the noVenue trim ladder is byte-frozen; the meta description drops the venue clause, so the R1 fix does NOT affect the meta description — «meta unchanged»)");
}

// (h) the cost laws — the scoped cost law (the projection + the data helper
// carry NO AI/network/KV/timer/polling/await code) + the composer purity +
// the await count stays 3.
const s14ProjSrc = (extractFnSrc(pagesSrc, "matchVenueInput") || "") + (extractFnSrc(pagesSrc, "matchScheduleInput") || "");
const s14ProjStripped = s14ProjSrc.replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
check(s14ProjSrc.length > 0 && !/fetch\(|XMLHttpRequest|new Image|setTimeout|setInterval|addEventListener|\.get\(|\.put\(|env\.STATE|env\.AI|AI\.run|generateText|chat\.completions|await\b/i.test(s14ProjStripped),
  "S14 cost law (projection): matchVenueInput + matchScheduleInput carry NO AI/network/KV/timer/polling/await code (the S08/S12/S13 zero-runtime-cost law — the projection reads the already-loaded data through the windowSchedule aggregation helper; zero new awaits, zero new KV reads, zero new fetches; the cost check is scoped to the projection functions — pages.ts's other functions keep their legitimate fetch/KV calls)");
const s14DataSeg = s14Ws ? (function () { const d = read("src/seo/data.ts"); const i = d.indexOf("export function windowSchedule"); const open = d.indexOf("| null {", i) + 7; let depth = 0, j = open; for (; j < d.length; j++) { if (d[j] === "{") depth++; else if (d[j] === "}") { depth--; if (depth === 0) break; } } return d.slice(i, j + 1); })() : "";
const s14DataStripped = s14DataSeg.replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
check(s14DataSeg.length > 0 && !/fetch\(|XMLHttpRequest|new Image|setTimeout|setInterval|addEventListener|\.get\(|\.put\(|env\.STATE|env\.AI|AI\.run|await\b/i.test(s14DataStripped),
  "S14 cost law (data helper): windowSchedule carries NO AI/network/KV/timer/polling/await code (the S13 teamCompMetrics precedent — pure aggregation over the caller-passed ctx [pool + shaped + payload]; the pool/payload are ALREADY LOADED by getSeoCtx — zero new KV reads, zero new fetches, ADR-006; the only fetch on the match-page path is the venue-detail hydration [hydrateMatchVenue, one of the 3 pre-existing awaits] — the schedule reads the already-loaded ctx.pool, NOT a new fetch)");
const s14CompVenue = extractFnSrc(mcSrc, "matchVenueHtml") || "";
const s14CompSched = extractFnSrc(mcSrc, "matchScheduleHtml") || "";
const s14CompStripped = (s14CompVenue + s14CompSched).replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
check(s14CompVenue.length > 0 && s14CompSched.length > 0 && !/fetch\(|XMLHttpRequest|new Image|setTimeout|setInterval|addEventListener|\.get\(|\.put\(|env\.STATE|env\.AI|AI\.run|import /i.test(s14CompStripped),
  "S14 composer purity (S15 co-evolution): matchVenueHtml + matchScheduleHtml are pure string renderers (the composer stays the S02 pure leaf — zero imports/KV/fetch/client-scripts; the atoms arrive prebuilt from pages.ts; S15 EXTENDS matchScheduleHtml to produce the rows + the date headings + the expand-control MARKUP — the inline JS rides pages.ts's matchScheduleScript, the S06 nav-script-rides-the-part + the S04 countdown-script-rides-the-hero-part precedent — the composer carries NO <script>/addEventListener/fetch/timer code; the schedule script is gated by the S15 cost-law assertions below)");
check(awaitCount === 3,
  "S14 await count: buildMatchPage's await count stays 3 (hydrateMatchVenue, loadArchive, fullByCodeFor — the pre-existing loads; the S14 venue + schedule are pure aggregation over the already-loaded data [the venue via the hydrateMatchVenue await; the schedule via the windowSchedule helper over the already-loaded ctx.pool] — ZERO new awaits; the zero-runtime-cost law holds)");

// (i) the CSS — the S14 style block rides page-shell.ts AFTER S13 (the
// metrics) and BEFORE S03 (the responsive/spacing/RTL foundation) —
// chronological session order: S04 → S05 → S06 → S07 → S08 → S11 → S12 →
// S13 → S14 → S03. Scoped to #mcentre-venue + #mcentre-schedule; logical
// properties only; the block's own icy/navy tokens; the 600px mobile layout
// — no horizontal scroll.
check(shellSrc.indexOf("Match Centre S13 (M5)") < shellSrc.indexOf("Match Centre S14 (M6)") && shellSrc.indexOf("Match Centre S14 (M6)") < shellSrc.indexOf("Match Centre S03 (M1)"),
  "S14 CSS placement: the S14 style block rides page-shell.ts AFTER S13 (the metrics) and BEFORE S03 (the responsive/spacing/RTL foundation) — chronological session order: S04 → S05 → S06 → S07 → S08 → S11 → S12 → S13 → S14 → S03");
check(/#mcentre-venue \.mcentre-venue-panel\{[^}]*border-radius:10px/.test(shellSrc) &&
  /#mcentre-venue \.mcentre-venue-name\{[^}]*font-weight:700/.test(shellSrc) &&
  /#mcentre-venue \.mcentre-venue-mark\{[^}]*color:#7dd3fc/.test(shellSrc),
  "S14 CSS venue panel: the compact information card — the .mcentre-venue-panel (border-radius + the navy/icy tokens) + the .mcentre-venue-name (prominent, weight 700) + the .mcentre-venue-mark (the discreet verified-source mark — the icy-blue #7dd3fc, a small pill; decision 37: a compact information panel; decision 38: NO map/preview/external-nav)");
check(/#mcentre-schedule \.mcentre-schedule-note\{[^}]*font-size:\.75rem/.test(shellSrc) &&
  /#mcentre-schedule \.mcentre-schedule-note\{[^}]*color:var\(--muted,#9aa4b2\)/.test(shellSrc),
  "S14 CSS schedule note: the discreet tracked-universe coverage note — the .mcentre-schedule-note (muted, .75rem — the no-false-empty law: the note is MANDATORY when the section is present; NEVER «بدون مسابقه», spec §11; decision 42: one discreet schedule coverage note)");
check(/@media \(max-width:600px\)\{[\s\S]*?#mcentre-venue \.mcentre-venue-panel\{[^}]*padding-inline:12px/.test(shellSrc) &&
  /@media \(max-width:600px\)\{[\s\S]*?#mcentre-schedule \.mcentre-schedule-note\{[^}]*font-size:\.7rem/.test(shellSrc),
  "S14 CSS mobile: at ≤600px the venue panel tightens (padding-inline 16→12px) + the venue name scales (.96rem) + the verified mark shrinks (.64rem) + the schedule note tightens (.7rem) — the compact panels stay inside the viewport, no horizontal scroll (spec §4 + §9; the 600px mobile breakpoint — the design system's own)");
check(!/#mcentre-venue[^{]*\{[^}]*\b(margin-left|margin-right|padding-left|padding-right|left:|right:)\b/.test(shellSrc) && !/#mcentre-schedule[^{]*\{[^}]*\b(margin-left|margin-right|padding-left|padding-right|left:|right:)\b/.test(shellSrc),
  "S14 CSS logical properties: the S14 venue + schedule blocks use CSS logical properties ONLY (margin-block-start, padding-block, padding-inline, border-block-start, border-inline — RTL/LTR clean under a dir flip, decision 2; no physical left/right properties)");

// ---------- 16. S15 (M6): the schedule presentation — the broadcast rows + the
// date headings + the «نمایش روزهای بعد» expand control (M6, session 2 of 2) ----------
// specification §11 (Weekly fixture schedule) + milestones-and-sessions.md
// M6/S15 + decisions 39/40/41/42 + audit §4 row 74 + §12 row S15. S15 EXTENDS
// the S14 schedule renderer (matchScheduleHtml) to consume the S14 day-group
// atoms (sameDay/next48h/remaining + the pre-built MatchScheduleRowInput atoms)
// — the broadcast rows + the localized date headings + the one «نمایش روزهای
// بعد» expand control + the inline matchScheduleScript in pages.ts. The atoms
// are byte-frozen (S14's windowSchedule + the MatchScheduleInput projection —
// S15 EXTENDS the renderer, NOT the atoms; decision S15-Crest: name-only). S15
// CLOSES M6 — the M6 gate (the mcM6x preview upload + the production-KV
// agent-browser smoke) ships AFTER the tests pass.

// (a) the contract — matchScheduleHtml extends; scheduleRowHtml + scheduleGroupHtml
// helpers; the new vocabulary constants; matchScheduleScript in pages.ts.
check(typeof mc.matchScheduleHtml === "function" && /function scheduleRowHtml\(/.test(mcSrc) && /function scheduleGroupHtml\(/.test(mcSrc),
  "S15 contract: matchScheduleHtml extends to consume the day groups (scheduleRowHtml + scheduleGroupHtml helpers in match-centre.ts — the broadcast row + the day-group renderers); the composer stays the S02 pure leaf (zero client-script — the inline JS rides pages.ts's matchScheduleScript)");
check(/const MC_SCHEDULE_UPCOMING = "در انتظار";/.test(mcSrc) && /const MC_SCHEDULE_LIVE_LABEL = "در جریان";/.test(mcSrc) && /const MC_SCHEDULE_FINISHED_LABEL = "پایان";/.test(mcSrc) && /const MC_SCHEDULE_EXPAND_SHOW = "نمایش روزهای بعد";/.test(mcSrc) && /const MC_SCHEDULE_EXPAND_HIDE = "بستن روزهای بعد";/.test(mcSrc),
  "S15 contract vocabulary: the broadcast-row constants — MC_SCHEDULE_UPCOMING «در انتظار» (the SCHEDULED upcoming marker) + MC_SCHEDULE_LIVE_LABEL «در جریان» (the S04 hero live aria-label) + MC_SCHEDULE_FINISHED_LABEL «پایان» (the S04 hero «پایان بازی» compacted) + MC_SCHEDULE_EXPAND_SHOW «نمایش روزهای بعد» + MC_SCHEDULE_EXPAND_HIDE «بستن روزهای بعد» (decision 40: the expand-control label swap)");
check(/function matchScheduleScript\(/.test(pagesSrc),
  "S15 contract script: pages.ts defines matchScheduleScript (the inline expand-control script — the S06 matchNavScript / S04 matchHeadScript precedent; rides the schedule part via the buildMatchPage ternary)");

// (b) the REAL renderer — the broadcast rows + the date headings + the expand
// control + the next48h emphasis + the chronological order + the upcoming
// marker + the no-crest + the live/finished status + the no-false-empty + the
// no-button-when-no-remaining + the coverage-note-at-end.
var s15RowFin = { pathHtml: '<a href="/liverpool-vs-chelsea-2026-11-29">Liverpool – Chelsea</a>', timeHtml: '<time datetime="2026-11-29T15:00:00Z">۱۵:۰۰</time>', compHtml: "لیگ برتر انگلیس", homeHtml: "Liverpool", awayHtml: "Chelsea", scoreHtml: "۲ – ۱", live: false, finished: true };
var s15RowSched = { pathHtml: '<a href="/dortmund-vs-leverkusen-2026-11-30">Dortmund – Leverkusen</a>', timeHtml: '<time datetime="2026-11-30T17:30:00Z">۱۷:۳۰</time>', compHtml: "بوندسلیگا", homeHtml: "Dortmund", awayHtml: "Leverkusen", scoreHtml: "", live: false, finished: false };
var s15RowLive = { pathHtml: '<a href="/bayern-vs-leipzig-2026-12-02">Bayern – Leipzig</a>', timeHtml: '<time datetime="2026-12-02T19:30:00Z">۱۹:۳۰</time>', compHtml: "بوندسلیگا", homeHtml: "Bayern", awayHtml: "Leipzig", scoreHtml: "۱ – ۰", live: true, finished: false };
var s15SameDay = [{ dateHtml: "، ۱۴ آذر (۴ دسامبر)", rows: [s15RowFin] }];
var s15Next48h = [{ dateHtml: "، ۱۵ آذر (۵ دسامبر)", rows: [s15RowSched] }];
var s15Remaining = [{ dateHtml: "، ۱۷ آذر (۷ دسامبر)", rows: [s15RowLive] }];
var s15Full = mc.matchScheduleHtml({ sameDay: s15SameDay, next48h: s15Next48h, remaining: s15Remaining, coverageNote: true });
check(s15Full.startsWith('<div class="mcentre-schedule">') && s15Full.includes("mcentre-sched-row") && s15Full.includes("mcentre-sched-time") && s15Full.includes("mcentre-sched-comp") && s15Full.includes("mcentre-sched-teams") && s15Full.includes("mcentre-sched-result"),
  "S15 broadcast row: the compact broadcast-style row renders the timeHtml (.mcentre-sched-time) + the compHtml (.mcentre-sched-comp) + the teams (.mcentre-sched-teams — the pathHtml, name-only) + the result cell (.mcentre-sched-result — the score or the upcoming marker) — spec §11 «Compact broadcast-style rows: kickoff time, competition, team crests/names, central score or upcoming indicator, status where available»");
check(s15Full.includes('<h3 class="mcentre-sched-date">') && s15Full.includes(s15SameDay[0].dateHtml) && s15Full.includes(s15Next48h[0].dateHtml) && s15Full.includes(s15Remaining[0].dateHtml),
  "S15 date headings: one <h3 class=\"mcentre-sched-date\"> per day group with the dateHtml (faDateD2 — spec §11 «Group fixtures under localized date headings»); decision S15-Date: the heading renders CONSISTENTLY for ALL groups (sameDay + next48h + remaining — NO special «امروز» label)");
check(s15Full.indexOf(s15SameDay[0].dateHtml) < s15Full.indexOf(s15Next48h[0].dateHtml) && s15Full.indexOf(s15Next48h[0].dateHtml) < s15Full.indexOf(s15Remaining[0].dateHtml),
  "S15 chronological order: the day groups render in chronological order — sameDay (the fixture's day) → next48h (the emphasized 48h) → remaining (the collapsed days) — spec §11 «Same-day matches first» + «Emphasize the next 48 hours» + «Remaining days initially collapsed»; the milestones S15 test list: «chronological expansion»");
check(s15Full.includes('<div class="mcentre-sched-soon">') && s15Full.indexOf("mcentre-sched-soon") < s15Full.indexOf(s15Next48h[0].dateHtml),
  "S15 next48h emphasis: the next48h groups are wrapped in <div class=\"mcentre-sched-soon\"> (the subtle icy-blue border-inline-start — spec §11 «Emphasize the next 48 hours»; decision S15-Emphasis); the sameDay + remaining groups render un-emphasized");
check(s15Full.indexOf("mcentre-sched-soon") >= 0 && !/mcentre-sched-soon"[^>]*\shidden/.test(s15Full),
  "S15 initial 48h: the next48h groups render UNCOLLAPSED (visible by default — the milestones S15 test list: «initial 48h»; the remaining groups are the ONLY collapsed block, behind the «نمایش روزهای بعد» control)");
check(s15Full.includes('<button class="mcentre-sched-toggle" type="button" aria-expanded="false" aria-controls="mcentre-sched-remaining">نمایش روزهای بعد</button>') && s15Full.includes('<div id="mcentre-sched-remaining" class="mcentre-sched-remaining" hidden>'),
  "S15 expand control: ONE <button class=\"mcentre-sched-toggle\" type=\"button\" aria-expanded=\"false\" aria-controls=\"mcentre-sched-remaining\"> (decision 40: ONE «نمایش روزهای بعد» control, no per-date expanders; keyboard-accessible — a <button>; the milestones S15 test list: «keyboard interaction») + the collapsed remaining container <div id=\"mcentre-sched-remaining\" hidden> (the remaining groups initially collapsed — spec §11 «Remaining days initially collapsed»)");
check((s15Full.match(/mcentre-sched-toggle/g) || []).length === 1,
  "S15 one expand control: exactly ONE «نمایش روزهای بعد» button (decision 40: «One control reveals remaining days; no per-date expanders» — NO per-date expanders, NO multiple buttons)");
check(s15Full.indexOf("mcentre-schedule-note") > s15Full.indexOf("mcentre-sched-toggle") && s15Full.indexOf("mcentre-schedule-note") > s15Full.indexOf("mcentre-sched-remaining"),
  "S15 coverage note at end: the discreet coverage note rides at the END of the schedule section (decision S15-Note — AFTER the rows + the expand control + the remaining container; spec §11 «one discreet coverage note» with no placement constraint; the note qualifies the rows above it)");
check(s15Full.includes('<span class="mcentre-sched-upcoming">در انتظار</span>') && !/mcentre-sched-score[^<]*۰[^<]*–[^<]*۰/.test(s15Full),
  "S15 upcoming marker: a SCHEDULED row (scoreHtml \"\") renders the upcoming marker «در انتظار» (.mcentre-sched-upcoming) — NOT a fake 0-0 (the S14 scoreHtml \"\" law: MISSING IS NOT ZERO; spec §11 «central score or upcoming indicator» — the upcoming indicator, NOT a fabricated score; the milestones S15 test list: «missing crest/status»)");
check(!/<img[^>]*crest/i.test(s15Full) && !/mcentre-sched-crest/.test(s15Full) && s15Full.includes("Liverpool – Chelsea") && s15Full.includes("Dortmund – Leverkusen"),
  "S15 no crest (decision S15-Crest): the rows are NAME-ONLY — the teams render via homeHtml/awayHtml/pathHtml (the names), NO crest <img> markup (spec §11 «team crests/names» allows name-only; the S14 atoms carry NO crestHtml — the lower-risk option, NO S14 atom/projection co-evolution; the milestones S15 test list: «missing crest/status»)");
check(s15Full.includes('<i class="mcentre-sched-live" aria-label="در جریان"></i>') && s15Full.includes("is-live"),
  "S15 live indicator: a LIVE row (live:true, scoreHtml populated) renders the live dot <i class=\"mcentre-sched-live\" aria-label=\"در جریان\"> (the S04 hero .mscore aria-label vocabulary) + the score; the .mcentre-sched-row.is-live class (the milestones S15 test list: «partial/stale/empty data» — the live-overlay guards)");
check(s15Full.includes('<span class="mcentre-sched-fin">پایان</span>') && s15Full.includes("is-fin"),
  "S15 finished status: a FINISHED row (finished:true, scoreHtml populated) renders «پایان» (.mcentre-sched-fin — the S04 hero «پایان بازی» compacted) + the score (the Persian-digit «H – A»)");
check(mc.matchScheduleHtml({ sameDay: [], next48h: [], remaining: [], coverageNote: true }) === '<div class="mcentre-schedule"><h2>بازی\u200cهای هفته</h2><p class="mcentre-schedule-note">این برنامه بر اساس داده\u200cهای موجود نمایش داده می\u200cشود و ممکن است شامل تمام بازی\u200cها نباشد.</p></div>' && !/mcentre-sched-row/.test(mc.matchScheduleHtml({ sameDay: [], next48h: [], remaining: [], coverageNote: true })),
  "S15 no-false-empty (empty window): an EMPTY window (sameDay/next48h/remaining all empty) renders the coverage note ALONE — NO rows, NO button, NO remaining container (byte-identical to S14's empty-window case — the no-false-empty law: NEVER «بدون مسابقه», spec §11; the milestones S15 test list: «partial/stale/empty data»)");
check(!/mcentre-sched-toggle/.test(mc.matchScheduleHtml({ sameDay: s15SameDay, next48h: s15Next48h, remaining: [], coverageNote: true })) && !/mcentre-sched-remaining/.test(mc.matchScheduleHtml({ sameDay: s15SameDay, next48h: s15Next48h, remaining: [], coverageNote: true })),
  "S15 no button when no remaining: when remaining is empty (but sameDay/next48h have rows) → NO «نمایش روزهای بعد» button, NO remaining container (the expand control renders ONLY when there are remaining groups — hasRemaining; the no-empty-cards law)");
check(mc.matchScheduleHtml({ sameDay: s15SameDay, next48h: s15Next48h, remaining: s15Remaining, coverageNote: false }) === "",
  "S15 degenerate guard: coverageNote:false (the degenerate guard — no fixture date) → \"\" (the section omits entirely — every match carries a utcDate, so this is the S14 degenerate guard; S15 preserves it)");
var s15Partial = mc.matchScheduleHtml({ sameDay: s15SameDay, next48h: [], remaining: [], coverageNote: true });
check(s15Partial.includes("mcentre-sched-row") && !/mcentre-sched-soon/.test(s15Partial) && !/mcentre-sched-toggle/.test(s15Partial) && s15Partial.includes("mcentre-schedule-note"),
  "S15 partial data: only sameDay present (next48h + remaining empty) → the sameDay rows render + the coverage note, NO .mcentre-sched-soon wrapper (next48h empty), NO expand button (remaining empty) — the partial dataset renders the present groups (the milestones S15 test list: «partial/stale/empty data»)");

// (c) the inline JS — matchScheduleScript (presence + purity + the click handler
// + the aria-expanded toggle + the label swap + the no-op guard). Extracted via
// extractFnSrc (the S06 nav-script precedent — scoped to the function body).
var s15SchedFn = extractFnSrc(pagesSrc, "matchScheduleScript") || "";
check(s15SchedFn.length > 0 && /<script>/.test(s15SchedFn) && /addEventListener\('click'/.test(s15SchedFn),
  "S15 script presence: matchScheduleScript returns a <script> tag + the click handler (addEventListener('click' — the expand-control toggle; the S06 nav-script precedent — inline, CSP-legal)");
check(s15SchedFn.length > 0 && /aria-expanded/.test(s15SchedFn) && /box\.hidden/.test(s15SchedFn),
  "S15 script toggle: the click handler toggles the remaining container's `hidden` attribute (box.hidden) + the button's aria-expanded (true ↔ false) — the milestones S15 test list: «keyboard interaction» (the button is keyboard-accessible, the aria-expanded toggles)");
check(s15SchedFn.length > 0 && /var SHOW=/.test(s15SchedFn) && /var HIDE=/.test(s15SchedFn) && /btn\.textContent=SHOW/.test(s15SchedFn) && /btn\.textContent=HIDE/.test(s15SchedFn),
  "S15 script label swap: the click handler swaps the button label («نمایش روزهای بعد» ↔ «بستن روزهای بعد») via the SHOW/HIDE variables + btn.textContent (decision 40: the label swaps; the expand → «بستن روزهای بعد», the collapse → «نمایش روزهای بعد»)");
check(s15SchedFn.length > 0 && /if\(!btn\)return/.test(s15SchedFn),
  "S15 script no-op guard: the handler no-ops when the button isn't found (if(!btn)return — a degenerate page with no schedule section; the script rides ONLY when the schedule part renders via the buildMatchPage ternary, but the no-op guard is the belt-and-braces defense)");
var s15SchedFnStripped = s15SchedFn.replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
check(s15SchedFn.length > 0 && !/fetch\(|setInterval|setTimeout|XMLHttpRequest|new Image|import /i.test(s15SchedFnStripped),
  "S15 script cost law: the inline schedule script is pure DOM — no fetch/timer/polling/new Image/imports (the S06 Q13=A precedent; rides the schedule part, no public-*.js bundle rename, no SW cache bump — ADR-006)");
check(/@media \(prefers-reduced-motion:reduce\)\{#mcentre-schedule \.mcentre-sched-remaining:not\(\[hidden\]\)\{animation:none\}\}/.test(shellSrc) && /@media \(prefers-reduced-motion:reduce\)\{#mcentre-schedule \.mcentre-sched-live\{animation:none\}\}/.test(shellSrc),
  "S15 reduced motion: the CSS gates the expand fade-in (.mcentre-sched-remaining:not([hidden]) animation:none) + the live-dot pulse (.mcentre-sched-live animation:none) under prefers-reduced-motion:reduce (the S06 precedent — reduced-motion = instant; the script itself does no motion)");

// (d) the wiring — buildMatchPage appends matchScheduleScript to the schedule
// part (the ternary guard) + the hero wiring unchanged (the schedule script
// rides the schedule part, NOT the hero part).
check(/schedule: scheduleHtml \? scheduleHtml \+ matchScheduleScript\(\) : ""/.test(pagesSrc),
  "S15 wiring script: buildMatchPage appends matchScheduleScript to the schedule part via the ternary schedule: scheduleHtml ? scheduleHtml + matchScheduleScript() : empty-string (the script rides ONLY when the section renders — no bare script on the degenerate-omitted section; the S06 nav-script-rides-the-part precedent)");
check(/hero: matchHeroHtml\(heroInput\) \+ matchActionsHtml\(sm, path\) \+ matchHeadScript\(\),/.test(pagesSrc),
  "S15 wiring hero unchanged: the hero part stays matchHeroHtml + matchActionsHtml + matchHeadScript (the S04 precedent — the schedule script rides the schedule part, NOT the hero part; the hero wiring is byte-frozen)");

// (e) the cost laws — the composer purity (matchScheduleHtml + scheduleRowHtml +
// scheduleGroupHtml carry NO script/fetch/timer code) + the await count stays 3.
var s15CompSched = extractFnSrc(mcSrc, "matchScheduleHtml") || "";
var s15CompRow = extractFnSrc(mcSrc, "scheduleRowHtml") || "";
var s15CompGroup = extractFnSrc(mcSrc, "scheduleGroupHtml") || "";
var s15CompStripped = (s15CompSched + s15CompRow + s15CompGroup).replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
check(s15CompSched.length > 0 && s15CompRow.length > 0 && s15CompGroup.length > 0 && !/fetch\(|XMLHttpRequest|new Image|setTimeout|setInterval|addEventListener|\.get\(|\.put\(|env\.STATE|env\.AI|AI\.run|import |<script/i.test(s15CompStripped),
  "S15 composer purity: matchScheduleHtml + scheduleRowHtml + scheduleGroupHtml are pure string renderers (the composer stays the S02 pure leaf — zero imports/KV/fetch/client-scripts/<script>; the atoms arrive prebuilt from pages.ts; the inline JS rides pages.ts's matchScheduleScript — the S06/S04 precedent; the composer carries NO addEventListener/<script>/fetch/timer code)");
check(awaitCount === 3,
  "S15 await count: buildMatchPage's await count stays 3 (hydrateMatchVenue, loadArchive, fullByCodeFor — the pre-existing loads; S15 is a PRESENTATION session — the schedule reads the already-loaded ctx.pool via the S14 windowSchedule helper; ZERO new awaits, zero new KV reads, zero new fetches — ADR-006; the zero-runtime-cost law holds)");

// (f) the CSS — the S15 style block rides page-shell.ts AFTER S14 (the venue +
// the schedule note) and BEFORE S03 (the responsive/spacing/RTL foundation) —
// chronological session order: S04 → S05 → S06 → S07 → S08 → S11 → S12 → S13 →
// S14 → S15 → S03. Scoped to #mcentre-schedule; logical properties only; the
// block's own icy/navy tokens; the 600px mobile layout — no horizontal scroll.
check(shellSrc.indexOf("Match Centre S14 (M6)") < shellSrc.indexOf("Match Centre S15 (M6)") && shellSrc.indexOf("Match Centre S15 (M6)") < shellSrc.indexOf("Match Centre S03 (M1)"),
  "S15 CSS placement: the S15 style block rides page-shell.ts AFTER S14 (the venue + the schedule note) and BEFORE S03 (the responsive/spacing/RTL foundation) — chronological session order: S04 → S05 → S06 → S07 → S08 → S11 → S12 → S13 → S14 → S15 → S03");
check(/#mcentre-schedule \.mcentre-sched-row\{[^}]*display:flex/.test(shellSrc) && /#mcentre-schedule \.mcentre-sched-teams\{[^}]*text-overflow:ellipsis/.test(shellSrc) && /#mcentre-schedule \.mcentre-sched-score\{[^}]*font-weight:800/.test(shellSrc),
  "S15 CSS broadcast row: the compact broadcast row — .mcentre-sched-row (display:flex — the one-line RTL layout) + .mcentre-sched-teams (text-overflow:ellipsis — the names truncate, the S12 .formresults precedent) + .mcentre-sched-score (font-weight:800 — the score stays prominent); the milestones S15 test list: «mobile readability»");
check(/#mcentre-schedule \.mcentre-sched-date\{[^}]*font-weight:600/.test(shellSrc),
  "S15 CSS date heading: the <h3> date heading — .mcentre-sched-date (font-weight:600, the localized faDateD2 heading; spec §11 «Group fixtures under localized date headings»)");
check(/#mcentre-schedule \.mcentre-sched-toggle\{[^}]*color:#7dd3fc/.test(shellSrc) && /#mcentre-schedule \.mcentre-sched-toggle:focus-visible\{[^}]*outline:2px solid #7dd3fc/.test(shellSrc),
  "S15 CSS expand control: the «نمایش روزهای بعد» button — .mcentre-sched-toggle (the icy-blue #7dd3fc, display:block width:100%) + the :focus-visible outline (keyboard-accessible — the milestones S15 test list: «keyboard interaction»; the focus ring #7dd3fc)");
check(/#mcentre-schedule \.mcentre-sched-soon\{[^}]*border-inline-start:2px solid rgba\(125,211,252,.5\)/.test(shellSrc),
  "S15 CSS next48h emphasis: the .mcentre-sched-soon wrapper carries the subtle icy-blue border-inline-start (spec §11 «Emphasize the next 48 hours»; decision S15-Emphasis — the next48h groups get the visual emphasis, the sameDay + remaining render un-emphasized)");
check(/#mcentre-schedule \.mcentre-sched-remaining:not\(\[hidden\]\)\{[^}]*animation:mcsched-reveal/.test(shellSrc),
  "S15 CSS remaining reveal: the .mcentre-sched-remaining:not([hidden]) carries the mcsched-reveal fade-in animation (the gentle expand transition — spec §15 «Gentle functional transitions for expandable schedule»; reduced-motion = no animation via the media query)");
check(/#mcentre-schedule \.mcentre-sched-live\{[^}]*animation:mcsched-pulse/.test(shellSrc),
  "S15 CSS live dot: the .mcentre-sched-live carries the mcsched-pulse animation (the live indicator — a small pulsing icy-blue dot; the S04 hero «در جریان» vocabulary; reduced-motion = no animation)");
check(/@media \(max-width:600px\)\{[\s\S]*?#mcentre-schedule \.mcentre-sched-row\{[^}]*gap:\.35rem/.test(shellSrc) && /@media \(max-width:600px\)\{[\s\S]*?#mcentre-schedule \.mcentre-sched-teams\{[^}]*font-size:\.72rem/.test(shellSrc),
  "S15 CSS mobile: at ≤600px the broadcast row tightens (gap .5→.35rem, padding-inline 8→6px) + the teams scale (.76→.72rem) + the score scales (.78→.74rem) — the rows stay one line, the names truncate, the score stays prominent, no horizontal scroll (spec §4 + §9; the milestones S15 test list: «mobile readability» — the 600px mobile breakpoint, the design system's own)");
check(!/#mcentre-schedule[^{]*\{[^}]*\b(margin-left|margin-right|padding-left|padding-right|left:|right:)\b/.test(shellSrc),
  "S15 CSS logical properties: the S15 schedule block uses CSS logical properties ONLY (margin-block, margin-block-start, padding-block, padding-inline, border-inline-start, padding-inline-start — RTL/LTR clean under a dir flip, decision 2; no physical left/right properties; the @keyframes + the reduced-motion media queries are NOT #mcentre-schedule-prefixed rules so the guard does not flag them)");

// ---------- 17. S16 (M7): the FAQ accordion — the delayed-collapse behaviour
// + the authored facts-only content (M7, session 1 of 2) ----------
// specification §12 (FAQ) + milestones-and-sessions.md M7/S16 + decisions
// 57/58/64/80/13 + audit §4 row "FAQ content" (grade F → S16 authors it) + §12
// row S16. S16 ADDS the mcentre-faq section content: the authored Q/A
// (src/seo/faq-content.ts — buildMatchFaqItems) + the accordion renderer
// (match-centre.ts matchFaqHtml — custom button+region) + the inline delayed-
// collapse script (pages.ts matchFaqScript — setTimeout + rapid-toggle cancel
// + reduced-motion instant) + the CSS (page-shell.ts S16 block). The mcentre-faq
// slot ALREADY EXISTS in the S02 registry (decision S16-2: NO new slot, NO new
// section anchor); the faq?: string key ALREADY EXISTS in MatchCentreParts
// (S02). NO new nav destination (decision 13: FAQs are OUTSIDE the 5-item nav).
// S16 is M7 session 1 of 2 — MID-MILESTONE (S17 ships the related-matches list +
// the M7 gate; S16 ships NO preview upload, NO gate doc).

// (a) the contract — the new module (faq-content.ts) + the renderer
// (matchFaqHtml) + the interfaces + the title constant + the script in pages.ts.
const faqSrc = read("src/seo/faq-content.ts");
check(typeof mc.matchFaqHtml === "function" && /export function matchFaqHtml\(/.test(mcSrc) && /export interface MatchFaqInput\b/.test(mcSrc) && /export interface MatchFaqItemInput\b/.test(mcSrc),
  "S16 contract renderer: matchFaqHtml + the MatchFaqInput/MatchFaqItemInput interfaces live in match-centre.ts (the accordion MARKUP — the S12 matchFormHtml / S14 matchVenueHtml / S15 matchScheduleHtml precedent; the composer stays the S02 pure leaf for the markup — zero client-script)");
check(/const MC_FAQ_TITLE = "[^"]+";/.test(mcSrc) && mcSrc.indexOf('const MC_FAQ_TITLE =') > -1 && /const MC_FAQ_TITLE = "[\u0600-\u06FF ]+";/.test(mcSrc),
  "S16 contract title: the MC_FAQ_TITLE constant carries a Persian label «سوالات متداول» (matches the MC_SECTION_ORDER aria-label — the mcentre-faq slot label; the S15 MC_SCHEDULE_TITLE precedent)");
check(/export function buildMatchFaqItems\(/.test(faqSrc) && /import type \{ SeoMatch \} from "\.\/data";/.test(faqSrc),
  "S16 contract content: src/seo/faq-content.ts exports buildMatchFaqItems (the authored Q/A list — audit §4 row «FAQ content» grade F → S16 authors it, facts-only) + imports the SeoMatch type (the data shape already loaded by buildMatchPage's three pre-existing awaits)");
check(/function matchFaqScript\(/.test(pagesSrc),
  "S16 contract script: pages.ts defines matchFaqScript (the inline delayed-collapse accordion script — the S06 matchNavScript / S04 matchHeadScript / S15 matchScheduleScript precedent; rides the faq part via the buildMatchPage ternary)");
check(/import \{ buildMatchFaqItems \} from "\.\/faq-content";/.test(pagesSrc) && /import \{ matchCentreMain, matchHeroHtml, matchSummaryHtml, matchFormHtml, matchMetricsHtml, matchVenueHtml, matchScheduleHtml, matchFaqHtml,/.test(pagesSrc),
  "S16 contract wiring: pages.ts imports matchFaqHtml from ./match-centre (the renderer) + buildMatchFaqItems from ./faq-content (the authored content) — the S04 hero/S14 venue/S15 schedule import precedent");

// (b) the REAL renderer — the accordion markup (custom button+region + aria +
// hidden + role=region + aria-labelledby) + the section wrapper + the
// no-empty-cards + the partial-data behaviour.
var s16Items = [
  { qHtml: "بازی چه زمانی برگزار می\u200cشود؟", aHtml: "این بازی شنبه ۱۵ آبان ۱۴۰۵ ساعت ۱۶:۳۰ به وقت تهران برگزار می\u200cشود." },
  { qHtml: "بازی کجا برگزار می\u200cشود؟", aHtml: "این بازی در ورزشگاه آنفیلد برگزار می\u200cشود." },
  { qHtml: "این بازی در کدام رقابت است؟", aHtml: "این بازی در لیگ برتر انگلیس است." },
  { qHtml: "ساعت بازی به وقت کجاست؟", aHtml: "ساعت همه بازی\u200cها به وقت تهران نمایش داده می\u200cشود." }
];
var s16Full = mc.matchFaqHtml({ items: s16Items });
check(s16Full.startsWith('<div class="mcentre-faq"><h2>') && s16Full.includes('</h2><div class="mcentre-faq-list">') && s16Full.endsWith("</div></div>"),
  "S16 section wrapper: matchFaqHtml returns <div class=\"mcentre-faq\"><h2>«سوالات متداول»</h2><div class=\"mcentre-faq-list\">…</div></div> (the .mcentre-faq-list is the click-delegation container the inline matchFaqScript queries — the S15 .mcentre-schedule wrapper precedent; the <section id=\"mcentre-faq\"> anchor is added by the composer's sectionHtml)");
check(s16Full.includes('<div class="mfaq-item"><h3 class="mfaq-heading"><button class="mfaq-q" id="mfaq-q-0" type="button" aria-expanded="false" aria-controls="mfaq-a-0">') && s16Full.includes('</button></h3><div id="mfaq-a-0" class="mfaq-a" role="region" aria-labelledby="mfaq-q-0" hidden><p>'),
  "S16 accordion markup: each Q/A is a custom button+region accordion item — <h3 class=\"mfaq-heading\"> wraps <button class=\"mfaq-q\" id aria-expanded=\"false\" aria-controls> (the question) + <div id class=\"mfaq-a\" role=\"region\" aria-labelledby hidden><p> (the answer). Decision S16-Accordion: custom button+region (NOT native <details> — the delayed-collapse of decision 58 cannot be expressed in <details>; the S06 nav + S15 schedule precedent = custom button + JS)");
check(s16Full.includes('aria-expanded="false"') && s16Full.includes('aria-controls="mfaq-a-') && s16Full.includes('role="region"') && s16Full.includes('aria-labelledby="mfaq-q-') && s16Full.includes(" hidden>"),
  "S16 a11y attributes: the button carries aria-expanded (false initially) + aria-controls (the region id); the region carries role=region + aria-labelledby (the button id) + hidden (collapsed initially — spec §12 «Expandable answers»; the accessible accordion pattern — the milestones S16 test list: «keyboard interaction»)");
check((s16Full.match(/<button class="mfaq-q"/g) || []).length === 4 && (s16Full.match(/role="region"/g) || []).length === 4,
  "S16 item count: 4 Q/A items render 4 buttons + 4 regions (the qHtml/aHtml atoms project verbatim — the S04 hero precedent)");
check(s16Full.includes('id="mfaq-q-0"') && s16Full.includes('id="mfaq-q-1"') && s16Full.includes('id="mfaq-q-2"') && s16Full.includes('id="mfaq-q-3"') && s16Full.includes('id="mfaq-a-0"') && s16Full.includes('id="mfaq-a-3"'),
  "S16 sequential ids: the buttons + regions carry sequential ids (mfaq-q-N / mfaq-a-N — the button's aria-controls points to the region's id; the region's aria-labelledby points to the button's id; the pairing is correct by construction)");
check(mc.matchFaqHtml({ items: [] }) === "" && mc.matchFaqHtml(null) === "" && mc.matchFaqHtml(undefined) === "",
  "S16 no-empty-cards: an EMPTY FAQ (items.length === 0 / null / undefined) → \"\" (the section omits entirely — the no-empty-cards law; the S14/S15 no-false-empty precedent — NO fabricated Qs, NO placeholder answers; the milestones S16 test list: «partial/empty data»)");
check(mc.matchFaqHtml({ items: [s16Items[0]] }).includes("mfaq-q-0") && !/mfaq-q-1/.test(mc.matchFaqHtml({ items: [s16Items[0]] })),
  "S16 partial data: a single Q/A renders ONE button + ONE region (mfaq-q-0 only, no mfaq-q-1 — the partial dataset renders the present items; the milestones S16 test list: «partial/empty data»)");
check(!/<details/.test(s16Full) && !/<summary/.test(s16Full),
  "S16 no native details: the accordion uses custom button+region (NOT native <details>/<summary> — decision S16-Accordion: the delayed-collapse of decision 58 cannot be expressed in <details>; the S06 nav + S15 schedule precedent = custom button + JS)");

// (c) the authored content — buildMatchFaqItems extracted via ts.transpileModule
// with stubbed deps (the s05DateHelpers / S08 narrative / S10 standings-window
// pattern). The stubs control faDateD1/faTime/compNameFa; the module's pure
// logic (the 4 questions + the lifecycle phrasing + the conditional venue +
// the no-fabrication gate) runs unmodified.
function faqContentEngine() {
  const ts = require(path.join(root, "node_modules", "typescript"));
  const src = fs.readFileSync(path.join(root, "src", "seo", "faq-content.ts"), "utf8")
    .replace(/^import\s+[^;]+;\n?/gm, "")
    .replace(/^export\s+/gm, "");
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.None, target: "ES2020" } }).outputText;
  const stubs = {
    faDateD1: function (iso) { return "D1(" + iso + ")"; },
    faTime: function (iso) { return "T(" + iso + ")"; },
    compNameFa: function (s) { return (s && s.competition && s.competition.faName) || ""; }
  };
  return new Function(...Object.keys(stubs), js + "\nreturn { buildMatchFaqItems };")(...Object.values(stubs));
}
const fc = faqContentEngine();
check(typeof fc.buildMatchFaqItems === "function",
  "S16 content extraction: the REAL buildMatchFaqItems extracted from faq-content.ts via ts.transpileModule with stubbed faDateD1/faTime/compNameFa (the s05DateHelpers / S08 narrative / S10 standings-window pattern — never re-implemented; the module's pure logic runs unmodified)");
// a full upcoming match (utcDate + venue + competition) → 4 Qs
var s16SmUpcoming = { s: { utcDate: "2026-11-29T15:00:00Z", venueFa: "ورزشگاه آنفیلد", competition: { faName: "لیگ برتر انگلیس", code: "PL" } }, raw: { status: "SCHEDULED" } };
var s16UpcomingItems = fc.buildMatchFaqItems(s16SmUpcoming);
check(s16UpcomingItems.length === 4,
  "S16 content full upcoming: a full upcoming match (utcDate + venue + competition) → 4 Qs (kickoff + venue + competition + timezone — the S16-Content decision; compact per spec §12; the milestones S16 test list: «partial/empty data»)");
check(s16UpcomingItems[0].q.indexOf("برگزار") >= 0 && s16UpcomingItems[0].q.indexOf("شود") >= 0 && s16UpcomingItems[0].a.indexOf("D1(2026-11-29T15:00:00Z)") >= 0 && s16UpcomingItems[0].a.indexOf("T(2026-11-29T15:00:00Z)") >= 0 && s16UpcomingItems[0].a.indexOf("به وقت تهران") >= 0,
  "S16 content Q1 kickoff (upcoming): the first Q is the kickoff («برگزار … شود؟» — the upcoming phrasing) + the answer composes faDateD1 + faTime + «به وقت تهران» + the upcoming verb (lifecycle-aware — decision S16-Content; ALWAYS present — every match carries a utcDate)");
check(s16UpcomingItems[1].q.indexOf("کجا") >= 0 && s16UpcomingItems[1].q.indexOf("شود") >= 0 && s16UpcomingItems[1].a.indexOf("ورزشگاه آنفیلد") >= 0,
  "S16 content Q2 venue (upcoming): the second Q is the venue («کجا … شود؟» — the upcoming phrasing) + the answer carries the venue name (sm.s.venueFa — the S14 venue, ALREADY LOADED by hydrateMatchVenue; CONDITIONAL — omits when no venue)");
check(s16UpcomingItems[2].q.indexOf("رقابت") >= 0 && s16UpcomingItems[2].a.indexOf("لیگ برتر انگلیس") >= 0,
  "S16 content Q3 competition: the third Q is the competition («کدام رقابت» — compNameFa, the hero's .mchip context restated in Q&A form; ALWAYS present when compFa non-empty)");
check(s16UpcomingItems[3].q.indexOf("وقت") >= 0 && s16UpcomingItems[3].a.indexOf("تهران") >= 0,
  "S16 content Q4 timezone: the fourth Q is the timezone policy («به وقت کجاست؟» — standalone editorial, NOT derived from the match's data; ALWAYS present — the S16-Content decision)");
// a finished match → the lifecycle phrasing swaps to past tense («برگزار شد»)
var s16SmFinished = { s: { utcDate: "2026-11-29T15:00:00Z", venueFa: "ورزشگاه آنفیلد", competition: { faName: "لیگ برتر انگلیس", code: "PL" } }, raw: { status: "FINISHED" } };
var s16FinishedItems = fc.buildMatchFaqItems(s16SmFinished);
check(s16FinishedItems.length === 4 && s16FinishedItems[0].q.indexOf("برگزار") >= 0 && s16FinishedItems[0].q.indexOf("شود") < 0 && s16FinishedItems[0].a.indexOf("برگزار شد") >= 0 && s16FinishedItems[0].a.indexOf("شود") < 0,
  "S16 content lifecycle (finished): a FINISHED match swaps the kickoff Q + answer to the past tense («برگزار شد؟» / «… برگزار شد.» — NOT «برگزار می‌شود»); the verb + the question phrasing pick the past form for FINISHED (the match has ended — the lifecycle-aware discipline; the milestones S16 test list: «partial/stale/empty data»)");
var s16SmLive = { s: { utcDate: "2026-11-29T15:00:00Z", venueFa: "ورزشگاه آنفیلد", competition: { faName: "لیگ برتر انگلیس", code: "PL" } }, raw: { status: "IN_PLAY" } };
var s16LiveItems = fc.buildMatchFaqItems(s16SmLive);
check(s16LiveItems[0].a.indexOf("برگزار شد") >= 0 && s16LiveItems[0].a.indexOf("شود") < 0,
  "S16 content lifecycle (live): a LIVE match (IN_PLAY) uses the past-tense verb («برگزار شد» — the match has started; the live/finished → past-form rule; the lifecycle-aware discipline)");
// a no-venue match → the venue Q OMITS (the no-fabrication discipline)
var s16SmNoVenue = { s: { utcDate: "2026-11-29T15:00:00Z", competition: { faName: "لیگ برتر انگلیس", code: "PL" } }, raw: { status: "SCHEDULED" } };
var s16NoVenueItems = fc.buildMatchFaqItems(s16SmNoVenue);
check(s16NoVenueItems.length === 3 && !s16NoVenueItems.some((it) => it.q.indexOf("بازی کجا") >= 0),
  "S16 content no-venue (no-fabrication): a match with NO venue → the venue Q OMITS (3 Qs: kickoff + competition + timezone — NOT a placeholder «ورزشگاه نامشخص»; the no-fabrication discipline — spec §12 + §17; the S14 no-empty-cards precedent: a missing venue is NOT «ورزشگاه نامشخص»; the venue Q is uniquely identified by «بازی کجا» [the kickoff + timezone Qs carry «کجا» in «کجاست» but NOT the «بازی کجا» prefix])");// the degenerate guard — no sm / no utcDate / no competition
check((fc.buildMatchFaqItems(null) || []).length === 0,
  "S16 content degenerate (null sm): buildMatchFaqItems(null) → [] (the no-fabrication guard — the no-empty-cards law; the section omits entirely)");
check(fc.buildMatchFaqItems({ s: {}, raw: { status: "SCHEDULED" } }).length === 1 && fc.buildMatchFaqItems({ s: {}, raw: { status: "SCHEDULED" } })[0].q.indexOf("وقت") >= 0,
  "S16 content degenerate (no utcDate/venue/comp): a match with only the timezone-policy answer (no utcDate, no venue, no comp) → 1 Q (the timezone policy — the standalone editorial ALWAYS present; the kickoff + venue + competition Qs omit when their facts are unavailable — the no-fabrication discipline)");
// the projection — matchFaqInput escapes the raw { q, a } into { qHtml, aHtml }
var s16ProjFn = extractFnSrc(pagesSrc, "matchFaqInput") || "";
check(s16ProjFn.length > 0 && /buildMatchFaqItems\(sm\)/.test(s16ProjFn) && /esc\(qa\.q\)/.test(s16ProjFn) && /esc\(qa\.a\)/.test(s16ProjFn) && /qHtml:/.test(s16ProjFn) && /aHtml:/.test(s16ProjFn),
  "S16 projection contract: pages.ts carries matchFaqInput (the FAQ data projection — calls buildMatchFaqItems + escapes the raw { q, a } into the MatchFaqItemInput { qHtml, aHtml } atoms; the S04 hero precedent: pages.ts builds the atoms, the composer renders the markup; the REAL function extracted via extractFnSrc, never re-implemented)");

// (d) the inline JS — matchFaqScript (presence + the delayed-collapse setTimeout
// + the rapid-toggle clearTimeout + the reduced-motion matchMedia + the click
// delegation + the aria-expanded toggle + the hidden toggle + the no-op guard +
// the purity [setTimeout ALLOWED — the scoped exception]). Extracted via
// extractFnSrc (the S06/S15 nav/schedule-script precedent).
var s16FaqFn = extractFnSrc(pagesSrc, "matchFaqScript") || "";
check(s16FaqFn.length > 0 && /<script>/.test(s16FaqFn) && /addEventListener\('click'/.test(s16FaqFn),
  "S16 script presence: matchFaqScript returns a <script> tag + the click handler (addEventListener('click' — the accordion toggle; the S06 nav-script / S15 schedule-script precedent — inline, CSP-legal)");
check(s16FaqFn.length > 0 && /setTimeout/.test(s16FaqFn),
  "S16 script delayed-collapse (decision 58): the script uses setTimeout to schedule the delayed collapse of the previously-open answers (decision 58 MANDATES the delay — «multiple answers may remain open briefly; previously opened answers collapse after a short delay»; the scoped setTimeout exception — the S04 countdown-timer precedent; the cost law's «no timer» was scoped to the S15 schedule script — documented in the matchFaqScript header comment)");
check(s16FaqFn.length > 0 && /clearTimeout/.test(s16FaqFn),
  "S16 script rapid-toggle cancel: the script uses clearTimeout to cancel a pending collapse when a new answer opens during the delay window (the rapid-toggle test — milestones S16: «a second open during the delay window cancels the pending collapse of the first»; the previously-open answers stay open + get re-scheduled)");
check(s16FaqFn.length > 0 && /matchMedia/.test(s16FaqFn) && /prefers-reduced-motion/.test(s16FaqFn) && /var DELAY=rm\?0:600/.test(s16FaqFn),
  "S16 script reduced-motion (decision 80): the script checks matchMedia('(prefers-reduced-motion: reduce)') + sets DELAY = rm ? 0 : 600 (the delay value S16-Delay = 600ms; reduced-motion = 0 = instant collapse — the S06 precedent; under prefers-reduced-motion only ONE answer is open at a time — the collapse fires on the next tick)");
check(s16FaqFn.length > 0 && /querySelector\('\.mcentre-faq-list'\)/.test(s16FaqFn),
  "S16 script click delegation: the script queries the .mcentre-faq-list container (ONE delegated click listener — the S15 schedule-toggle precedent — NOT per-button listeners; the container is the click-delegation root)");
check(s16FaqFn.length > 0 && /aria-expanded/.test(s16FaqFn) && /\.hidden/.test(s16FaqFn),
  "S16 script toggle: the click handler toggles the answer region's `hidden` attribute (region.hidden) + the button's aria-expanded (true ↔ false) — the milestones S16 test list: «keyboard interaction» (the button is keyboard-accessible — a real <button>, Enter/Space triggers the click; the aria-expanded toggles)");
check(s16FaqFn.length > 0 && /if\(!list\)return/.test(s16FaqFn),
  "S16 script no-op guard: the handler no-ops when the list isn't found (if(!list)return — a degenerate page with no FAQ section; the script rides ONLY when the FAQ part renders via the buildMatchPage ternary, but the no-op guard is the belt-and-braces defense)");
check(s16FaqFn.length > 0 && /schedule\(/.test(s16FaqFn) && /cancel\(/.test(s16FaqFn),
  "S16 script schedule/cancel helpers: the script defines schedule(btn, region) [sets the delayed-collapse timer] + cancel(id) [clears a pending timer] — the rapid-toggle re-scheduling logic (a new open cancels + re-schedules the previously-open answers' collapse)");
check(s16FaqFn.length > 0 && /querySelectorAll\('\.mfaq-q\[aria-expanded=/.test(s16FaqFn),
  "S16 script other-open selector: when a new answer opens, the script queries all OTHER open answers (.mfaq-q[aria-expanded=\"true\"] — excluding the just-opened button) + schedules their delayed collapse (decision 58: «older opened answers collapse after a short delay when a new one opens»)");
var s16FaqFnStripped = s16FaqFn.replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
check(s16FaqFn.length > 0 && !/fetch\(|setInterval|XMLHttpRequest|new Image|import /i.test(s16FaqFnStripped),
  "S16 script cost law (scoped): the inline FAQ script is pure DOM — no fetch/polling/new Image/imports/setInterval (the S06 Q13=A precedent; the delay timer is the ALLOWED scoped exception — decision 58 mandates the delayed-collapse; the S04 countdown-timer precedent; rides the faq part, no public-*.js bundle rename, no SW cache bump — ADR-006)");

// (e) the wiring — buildMatchPage appends matchFaqScript to the faq part (the
// ternary guard) + the pre-existing faq?: string key + the pre-existing
// mcentre-faq slot + NO new nav destination (decision 13).
check(/faq: faqHtml \? faqHtml \+ matchFaqScript\(\) : ""/.test(pagesSrc),
  "S16 wiring script: buildMatchPage appends matchFaqScript to the faq part via the ternary faq: faqHtml ? faqHtml + matchFaqScript() : empty-string (the script rides ONLY when the section renders — no bare script on the degenerate-omitted section; the S15 schedule-script-rides-the-schedule-part precedent)");
check(/faq\?: string;/.test(mcSrc) && /"mcentre-faq": parts\.faq \|\| ""/.test(mcSrc),
  "S16 wiring pre-existing slot: the faq?: string key ALREADY EXISTS in MatchCentreParts (the S02 optional key — S16 FILLS the already-existing slot; NO new interface field) + the mcentre-faq slot ALREADY EXISTS in the bySlot map (decision S16-2: NO new slot, NO new section anchor; the S14/S15 discipline)");
check(/hero: matchHeroHtml\(heroInput\) \+ matchActionsHtml\(sm, path\) \+ matchHeadScript\(\),/.test(pagesSrc) && /schedule: scheduleHtml \? scheduleHtml \+ matchScheduleScript\(\) : "",/.test(pagesSrc),
  "S16 wiring unchanged: the hero part stays matchHeroHtml + matchActionsHtml + matchHeadScript (the S04 precedent) + the schedule part stays scheduleHtml ? scheduleHtml + matchScheduleScript() : empty-string (the S15 precedent — the faq script rides the faq part, NOT the hero/schedule parts; the hero/schedule wiring is byte-frozen)");
check(!/\{ id: "mcentre-faq", label:/.test(pagesSrc) && (pagesSrc.match(/id: "mcentre-[a-z-]+", label:/g) || []).filter((s) => /"mcentre-(summary|standings|form|schedule|venue)"/.test(s)).length === 5,
  "S16 no new nav destination (decision 13): MC_NAV_DESTS keeps exactly the 5 nav items (خلاصه، جدول، فرم، بازی‌ها، ورزشگاه) — FAQ is NOT a nav destination (decision 13: «FAQs/SEO outside nav»; the Q9=B adaptive filter unchanged — FAQ never lights a nav destination; the milestones S16 test list: «no FAQPage schema solely for rich results» [the schema decision] + the nav stays 5 items)");

// (f) the cost laws — the composer purity (matchFaqHtml carries NO script/fetch/
// timer code) + the await count stays 3 + the faq-content module purity.
var s16CompFaq = extractFnSrc(mcSrc, "matchFaqHtml") || "";
var s16CompFaqStripped = s16CompFaq.replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
check(s16CompFaq.length > 0 && !/fetch\(|XMLHttpRequest|new Image|setTimeout|setInterval|addEventListener|\.get\(|\.put\(|env\.STATE|env\.AI|AI\.run|import |<script/i.test(s16CompFaqStripped),
  "S16 composer purity: matchFaqHtml is a pure string renderer (the composer stays the S02 pure leaf for the markup — zero imports/KV/fetch/timers/client-scripts/<script>; the atoms arrive prebuilt from pages.ts's matchFaqInput; the inline JS rides pages.ts's matchFaqScript — the S06/S04/S15 precedent; the composer carries NO setTimeout/addEventListener/<script>/fetch code — the scoped setTimeout exception lives in pages.ts, NOT the composer)");
var s16FaqContentStripped = faqSrc.replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
check(!/fetch\(|XMLHttpRequest|new Image|setTimeout|setInterval|addEventListener|\.get\(|\.put\(|env\.STATE|env\.AI|AI\.run|generateText|chat\.completions/i.test(s16FaqContentStripped),
  "S16 faq-content purity: the authored FAQ module (src/seo/faq-content.ts) is pure-logic — zero AI/network/KV/timer/polling code (the S08 zero-runtime-cost law — the module reads the SeoMatch fields already loaded + the pure faDateD1/faTime/compNameFa string formatters; no AI, no network calls, no KV reads)");
check(awaitCount === 3,
  "S16 await count: buildMatchPage's await count stays 3 (hydrateMatchVenue, loadArchive, fullByCodeFor — the pre-existing loads; S16 is a PRESENTATION + AUTHORING session — the FAQ reads the already-loaded SeoMatch fields via the buildMatchFaqItems helper; ZERO new awaits, zero new KV reads, zero new fetches — ADR-006; the zero-runtime-cost law holds)");

// (g) the no-FAQPage-schema law (spec §12 + decision 57 + S16-Schema: OMIT) —
// the match page does NOT emit a FAQPage JSON-LD node; the hub faqNode helper
// stays byte-frozen (the match page's jsonldNodes carries siteNodes + webPageNode
// + sportsEventNode + breadcrumbNode — NO faqNode).
check(!/JL\.faqNode|faqNode\(/.test(bpSeg),
  "S16 no-FAQPage-schema (spec §12 + decision 57 + S16-Schema: OMIT): buildMatchPage's jsonldNodes does NOT include JL.faqNode (the match page's SportsEvent JSON-LD node already carries the kickoff/date/venue facts; spec §12 «No FAQPage schema solely to pursue Google FAQ rich results» — Google retired FAQ rich results in August 2023; the hub faqHtml()/faqNode() pattern stays byte-frozen — the /about, /methodology, /data hub pages + the window hubs keep their GEO FAQPage node; the match page takes the conservative omit path; the milestones S16 test list: «no FAQPage schema solely for rich results»)");
check(/export function faqNode\(/.test(read("src/seo/jsonld.ts")),
  "S16 hub faqNode byte-frozen: the JL.faqNode helper stays byte-frozen in jsonld.ts (the hub pages keep their GEO FAQPage node — S16 does NOT modify the hub pattern; the match-page omit decision does NOT touch the hub faqNode)");

// (h) the CSS — the S16 style block rides page-shell.ts AFTER S15 (the schedule
// presentation) and BEFORE S03 (the responsive/spacing/RTL foundation) —
// chronological session order: S04 → S05 → S06 → S07 → S08 → S11 → S12 → S13 →
// S14 → S15 → S16 → S03. Scoped to #mcentre-faq; logical properties only; the
// block's own icy/navy tokens; the 600px mobile layout — no horizontal scroll.
check(shellSrc.indexOf("Match Centre S15 (M6)") < shellSrc.indexOf("Match Centre S16 (M7)") && shellSrc.indexOf("Match Centre S16 (M7)") < shellSrc.indexOf("Match Centre S03 (M1)"),
  "S16 CSS placement: the S16 style block rides page-shell.ts AFTER S15 (the schedule presentation) and BEFORE S03 (the responsive/spacing/RTL foundation) — chronological session order: S04 → S05 → S06 → S07 → S08 → S11 → S12 → S13 → S14 → S15 → S16 → S03");
check(/#mcentre-faq \.mfaq-q\{[^}]*display:flex/.test(shellSrc) && /#mcentre-faq \.mfaq-q\{[^}]*cursor:pointer/.test(shellSrc),
  "S16 CSS button: the <button class=\"mfaq-q\"> — display:flex (the question + the chevron ::after) + cursor:pointer (the interactive affordance; the S15 .mcentre-sched-toggle precedent)");
check(/#mcentre-faq \.mfaq-q:focus-visible\{[^}]*outline:2px solid #7dd3fc/.test(shellSrc),
  "S16 CSS focus-visible: the .mfaq-q:focus-visible carries the icy-blue #7dd3fc outline (keyboard-accessible — the milestones S16 test list: «keyboard interaction»; the focus ring #7dd3fc — the S15 .mcentre-sched-toggle precedent)");
check(/#mcentre-faq \.mfaq-q::after\{[^}]*border-inline-start:5px solid currentColor/.test(shellSrc) && /#mcentre-faq \.mfaq-q\[aria-expanded="true"\]::after\{[^}]*transform:rotate\(90deg\)/.test(shellSrc),
  "S16 CSS chevron: the .mfaq-q::after is a CSS-drawn triangle (border-inline-start:5px solid currentColor — the subtle functional-motion cue, decision 80) that rotates 90° when aria-expanded=true (the open/close indicator — gentle, not decorative; the S15 mcsched-reveal precedent)");
check(/#mcentre-faq \.mfaq-a\[hidden\]\{[^}]*display:none/.test(shellSrc) && /#mcentre-faq \.mfaq-a:not\(\[hidden\]\)\{[^}]*animation:mfaq-reveal/.test(shellSrc),
  "S16 CSS answer region: the .mfaq-a[hidden] → display:none (collapsed) + .mfaq-a:not([hidden]) → the mfaq-reveal fade-in animation (the gentle expand transition — spec §15 «Gentle functional transitions for accordions»; the answer region wraps, no truncation — spec §12 «expandable answers»; reduced-motion = no animation via the media query)");
check(/@media \(prefers-reduced-motion:reduce\)\{#mcentre-faq \.mfaq-q::after\{[^}]*transition:none/.test(shellSrc) && /@media \(prefers-reduced-motion:reduce\)\{[^}]*#mcentre-faq \.mfaq-a:not\(\[hidden\]\)\{[^}]*animation:none/.test(shellSrc),
  "S16 CSS reduced motion: the chevron transition (.mfaq-q::after transition:none) + the reveal animation (.mfaq-a:not([hidden]) animation:none) gate under prefers-reduced-motion:reduce (the S06/S15 precedent — reduced-motion = instant; the script's setTimeout delay is also 0 via the matchMedia check)");
check(/@media \(max-width:600px\)\{[\s\S]*?#mcentre-faq \.mfaq-q\{[^}]*font-size:\.78rem/.test(shellSrc) && /@media \(max-width:600px\)\{[\s\S]*?#mcentre-faq \.mfaq-a p\{[^}]*font-size:\.74rem/.test(shellSrc),
  "S16 CSS mobile: at ≤600px the button scales (.84→.78rem) + the answer scales (.8→.74rem) — the answer region wraps, no truncation, no horizontal scroll (spec §4 + §9 + §12 «expandable answers»; the milestones S16 test list: «mobile readability» + «long answers» — the 600px mobile breakpoint, the design system's own)");
check(!/#mcentre-faq[^{]*\{[^}]*\b(margin-left|margin-right|padding-left|padding-right|left:|right:)\b/.test(shellSrc),
  "S16 CSS logical properties: the S16 FAQ block uses CSS logical properties ONLY (margin-block-end, padding-block, padding-inline, border-block-end, border-inline-start, padding-block-start, padding-block-end — RTL/LTR clean under a dir flip, decision 2; no physical left/right properties; the @keyframes + the reduced-motion media queries are NOT #mcentre-faq-prefixed rules so the guard does not flag them)");
check(/\.faqcard \.faqitem\{padding:6px 0;border-bottom:1px dashed rgba\(148,163,184,.16\)\}/.test(shellSrc),
  "S16 hub .faqcard byte-frozen: the existing .faqcard hub CSS (line 142–147) stays byte-frozen — S16 adds the #mcentre-faq-scoped accordion variant, does NOT modify the hub .faqcard pattern (the /about, /methodology, /data hub pages keep their visible-FAQ pattern; the match-page FAQ is the expandable accordion variant)");

// (i) the harness co-evolution — faq-content.ts joins the worker-src.js concat
// AFTER standings-window.ts (the seo group grows; the S08 narrative / S10
// standings-window precedent).
check(harnessSrc.indexOf('"seo/faq-content.ts"') > -1 && harnessSrc.indexOf('"seo/faq-content.ts"') > harnessSrc.indexOf('"seo/standings-window.ts"'),
  "S16 harness: worker-src.js carries seo/faq-content.ts after seo/standings-window.ts (the S16 authored-content module joins the concat — the seo group grows; the S08 narrative / S10 standings-window co-evolution precedent)");

if (failures) { console.error("\ncheck-match-centre: " + failures + " failure(s)"); process.exit(1); }
console.log("check-match-centre: all checks passed");
