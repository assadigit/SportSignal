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
if (!/import \{ matchCentreMain, matchHeroHtml, type MatchHeroInput \} from "\.\/match-centre";/.test(pagesSrc)) { bad("wiring: pages.ts lost the match-centre import (matchCentreMain + the S04 hero renderer matchHeroHtml)"); wiringOk = false; }
if (!/const main = matchCentreMain\(\{/.test(pagesSrc)) { bad("wiring: buildMatchPage no longer delegates its main assembly to matchCentreMain"); wiringOk = false; }
// Match Centre S04: the hero part is now the composer's matchHeroHtml render
// (from the matchHeroInput projection) + the unchanged actions row + script.
if (!/function matchHeroInput\(sm: SeoMatch\): MatchHeroInput \{/.test(pagesSrc)) { bad("wiring: the S04 hero data projection (matchHeroInput) is gone from pages.ts"); wiringOk = false; }
if (!/hero: matchHeroHtml\(heroInput\) \+ matchActionsHtml\(sm, path\) \+ matchHeadScript\(\)/.test(pagesSrc)) { bad("wiring: the hero part is no longer the S04 hero render + actions + script"); wiringOk = false; }
if (/function matchHeadHtml\(/.test(pagesSrc) || /class="matchhead"/.test(pagesSrc)) { bad("wiring: the legacy matchHeadHtml builder/marked-up still present after the S04 retirement"); wiringOk = false; }
if (!/summary: whyBigHtml\(sm, ctx\) \+ facts \+ resultBlock/.test(pagesSrc)) { bad("wiring: the summary part no longer carries answercard + facts (+ result block)"); wiringOk = false; }
if (!/form: formCard,/.test(pagesSrc)) { bad("wiring: the form part no longer carries the W/D/L strip"); wiringOk = false; }
if (!/related: similarCard,/.test(pagesSrc)) { bad("wiring: the related part no longer carries the sibling-fixtures card"); wiringOk = false; }
if (!/footerHook: related/.test(pagesSrc)) { bad("wiring: the footer-hook part no longer carries the related-links card"); wiringOk = false; }
if (/matchHeadHtml\(sm\) \+ matchActionsHtml/.test(pagesSrc)) { bad("wiring: the old flat hero assembly is still present alongside the delegation"); wiringOk = false; }
if (wiringOk) ok("wiring: buildMatchPage delegates the five parts to matchCentreMain — the hero rides matchHeroHtml(matchHeroInput) + the unchanged actions/script (legacy matchHeadHtml retired)");

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

if (failures) { console.error("\ncheck-match-centre: " + failures + " failure(s)"); process.exit(1); }
console.log("check-match-centre: all checks passed");
