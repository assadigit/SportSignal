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
if (!/import \{ matchCentreMain, matchHeroHtml, matchSummaryHtml, type MatchHeroInput, type MatchSummaryInput \} from "\.\/match-centre";/.test(pagesSrc)) { bad("wiring: pages.ts lost the match-centre import (matchCentreMain + the S04 hero renderer matchHeroHtml + the S07 summary renderer matchSummaryHtml)"); wiringOk = false; }
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
if (!/form: formCard,/.test(pagesSrc)) { bad("wiring: the form part no longer carries the W/D/L strip"); wiringOk = false; }
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

if (failures) { console.error("\ncheck-match-centre: " + failures + " failure(s)"); process.exit(1); }
console.log("check-match-centre: all checks passed");
