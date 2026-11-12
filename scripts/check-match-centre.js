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
if (!/const main = matchCentreMain\(\{/.test(pagesSrc)) { bad("wiring: buildMatchPage no longer delegates its main assembly to matchCentreMain"); wiringOk = false; }
// Match Centre S04: the hero part is now the composer's matchHeroHtml render
// (from the matchHeroInput projection) + the unchanged actions row + script.
if (!/function matchHeroInput\(sm: SeoMatch\): MatchHeroInput \{/.test(pagesSrc)) { bad("wiring: the S04 hero data projection (matchHeroInput) is gone from pages.ts"); wiringOk = false; }
if (!/hero: matchHeroHtml\(heroInput\) \+ matchActionsHtml\(sm, path\) \+ matchHeadScript\(\)/.test(pagesSrc)) { bad("wiring: the hero part is no longer the S04 hero render + actions + script"); wiringOk = false; }
if (/function matchHeadHtml\(/.test(pagesSrc) || /class="matchhead"/.test(pagesSrc)) { bad("wiring: the legacy matchHeadHtml builder/marked-up still present after the S04 retirement"); wiringOk = false; }
// Match Centre S07: the summary part is now the composer's matchSummaryHtml
// render (from the MatchSummaryInput projection — the answer-first sentence +
// the facts rows + the finished result text). The legacy whyBigHtml + facts +
// resultBlock flat assembly is retired (whyBigHtml stays as the S08 narrative
// prep — exported, not called in the S07 summary path).
if (!/const summaryHtml = matchSummaryHtml\(\{/.test(pagesSrc)) { bad("wiring: the summary part no longer delegates to matchSummaryHtml (S07)"); wiringOk = false; }
if (!/answerHtml: esc\(matchAnswerSentence\(sm\)\)/.test(pagesSrc)) { bad("wiring: the summary answer atom no longer carries the answer-first sentence (the G-03 briefing copy — matchAnswerSentence, the same source that feeds the meta description + the JSON-LD)"); wiringOk = false; }
if (!/factsRows: rows\.map\(\(r\) => \(\{ label: esc\(r\[0\]\), valueHtml: r\[1\] \}\)\)/.test(pagesSrc)) { bad("wiring: the summary facts atoms no longer carry the facts rows array (label pre-escaped, valueHtml prebuilt — the fullWhenHtml date row rides byte-identical inside its <td>)"); wiringOk = false; }
if (!/const resultHtml = finished && m\.score && m\.score\.home != null/.test(pagesSrc)) { bad("wiring: the summary result atom no longer carries the finished result content (the h2 + the answer sentence — \"\" when not finished)"); wiringOk = false; }
if (!/form: formCard,/.test(pagesSrc)) { bad("wiring: the form part no longer carries the W/D/L strip"); wiringOk = false; }
if (!/related: similarCard,/.test(pagesSrc)) { bad("wiring: the related part no longer carries the sibling-fixtures card"); wiringOk = false; }
if (!/footerHook: related/.test(pagesSrc)) { bad("wiring: the footer-hook part no longer carries the related-links card"); wiringOk = false; }
if (/matchHeadHtml\(sm\) \+ matchActionsHtml/.test(pagesSrc)) { bad("wiring: the old flat hero assembly is still present alongside the delegation"); wiringOk = false; }
if (wiringOk) ok("wiring: buildMatchPage delegates the parts to matchCentreMain — the hero rides matchHeroHtml(matchHeroInput) + actions/script (legacy matchHeadHtml retired); the summary rides matchSummaryHtml(MatchSummaryInput) — the answer-first sentence + facts rows + result text atoms (legacy whyBigHtml+facts+resultBlock flat assembly retired; whyBigHtml stays as S08 narrative prep)");

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
// group). whyBigHtml still carries the legacy answercard string in its source
// (S08 prep — exported, not the S07 live path), so the source-inspection
// check here is the COMPOSER's contract, not pages.ts's dead string.
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

if (failures) { console.error("\ncheck-match-centre: " + failures + " failure(s)"); process.exit(1); }
console.log("check-match-centre: all checks passed");
