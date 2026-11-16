#!/usr/bin/env node
// scripts/check-seo-homepage.js
// SEO Program Session 6 (MASTER-SEO-SPEC §1/§2, phase file
// SESSION-06-HOMEPAGE-FEATURED-MATCH-AND-WINDOW.md): offline gates for the
// homepage + one-month fixture window + carousel crawlability.
//
// Proves:
//   1. HORIZON CONSTANT — SEO.UPCOMING_DISPLAY_DAYS === 30 (the spec's
//      "up to one month" display window).
//   2. HOMEPAGE BOXES — public-matches.ts topspot (lgPool) + uclspot
//      (clMatches) use SEO.UPCOMING_DISPLAY_DAYS (was the literal `90`);
//      no `90 * 864e5` literal remains in either filter.
//   3. UPCOMING ARRAY — the payload's `upcoming` filter rides the 30-day
//      displayHorizon (was `eom` = end-of-current-month); `eom` is gone.
//   4. /matches HUB — buildMatchesPage narrows upcomingBig to 30 days via
//      SEO.UPCOMING_DISPLAY_DAYS for DISPLAY; upcomingBig itself stays 92
//      (the DATA/DISCOVERY horizon — sitemap/feed/API).
//   5. DATA HORIZON PRESERVED — upcomingBig + upcomingFollowed in data.ts
//      keep `92 * 864e5` (NOT narrowed — the discovery window is intact).
//   6. HERO CARD CRAWLABILITY — buildHomePage sets the hero-card anchor's
//      SSR href to the REAL match URL (heroHref = M.matchHref(nextBig.s)),
//      not "#"; same for the mobile hero-mcard anchor. No `href="#"` survives
//      the unhide replacement for the hero/mhero cards.
//   7. CAROUSEL NAV — the carouselNavHtml helper exists, emits a sr-only
//      <nav> with real <a href> links, returns "" for < 2 slides, and is
//      wired into the H1/supporting-copy injection.
//   8. CURATION PROMISE — a sr-only <p> with the curated-selection promise
//      (spec §2 "Do not claim all matches are covered. Say selected/important
//      matches") is injected alongside the existing sr-only page-summary.
//   9. TITLE BYTE-FROZEN — the homepage <title> string is byte-identical to
//      the pre-S06 value (the Dec 4-8 GSC-measured-surface freeze holds).
//   10. NO REGRESSION — the __SEO_ROBOTS__ prod replacement (index,follow)
//       and the self-canonical at "/" are unchanged.
//   11. RESOURCE — zero new KV writes/fetches (the horizon change is a filter
//       on already-loaded lists; the carousel nav + curation promise are
//       string concatenation from the existing payload rows).
"use strict";
const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");

let failures = 0;
let oks = 0;
function ok(msg) { oks++; console.log("OK   check-seo-homepage: " + msg); }
function bad(msg) { console.error("FAIL check-seo-homepage: " + msg); failures++; }

// ---- 0. the REAL SEO config (require cleanly — the config leaf) ----
const { SEO } = require(path.join(root, "src", "seo", "config.ts"));

// ---- 1. HORIZON CONSTANT ----
if (typeof SEO.UPCOMING_DISPLAY_DAYS === "number" && SEO.UPCOMING_DISPLAY_DAYS === 30) {
  ok("S06-1 horizon: SEO.UPCOMING_DISPLAY_DAYS === 30 (the spec §1/§2 'up to one month' display window)");
} else {
  bad("S06-1 horizon: SEO.UPCOMING_DISPLAY_DAYS is not 30 (got " + JSON.stringify(SEO.UPCOMING_DISPLAY_DAYS) + ")");
}

// ---- source readers ----
function read(rel) { return fs.readFileSync(path.join(root, rel), "utf8"); }
const pubSrc = read("src/public-matches.ts");
const pagesSrc = read("src/seo/pages.ts");
const dataSrc = read("src/seo/data.ts");
const routerSrc = read("src/seo/router.ts");

// ---- 2. HOMEPAGE BOXES (topspot lgPool + uclspot clMatches) ----
// The topspot lgPool filter: `new Date(m.utcDate).getTime() <= now + SEO.UPCOMING_DISPLAY_DAYS * 864e5`
// The uclspot clMatches filter: `<= Date.now() + SEO.UPCOMING_DISPLAY_DAYS * 864e5`
// Both must NOT carry the old literal `90 * 864e5`.
const lgPoolLine = pubSrc.split("\n").find((l) => /const lgPool = matches\.filter/.test(l));
const clMatchesLine = pubSrc.split("\n").find((l) => /const clMatches = matches\.filter/.test(l));
if (lgPoolLine && /SEO\.UPCOMING_DISPLAY_DAYS \* 864e5/.test(lgPoolLine) && !/90 \* 864e5/.test(lgPoolLine)) {
  ok("S06-2a topspot: lgPool uses SEO.UPCOMING_DISPLAY_DAYS (was the literal 90; no `90 * 864e5` remains)");
} else {
  bad("S06-2a topspot: lgPool does not use SEO.UPCOMING_DISPLAY_DAYS or still carries `90 * 864e5` — line: " + (lgPoolLine || "(not found)").slice(0, 120));
}
if (clMatchesLine && /SEO\.UPCOMING_DISPLAY_DAYS \* 864e5/.test(clMatchesLine) && !/90 \* 864e5/.test(clMatchesLine)) {
  ok("S06-2b uclspot: clMatches uses SEO.UPCOMING_DISPLAY_DAYS (was the literal 90; no `90 * 864e5` remains)");
} else {
  bad("S06-2b uclspot: clMatches does not use SEO.UPCOMING_DISPLAY_DAYS or still carries `90 * 864e5` — line: " + (clMatchesLine || "(not found)").slice(0, 120));
}
// the SEO import is present in public-matches.ts
if (/import \{ SEO \} from "\.\/seo\/config"/.test(pubSrc)) {
  ok("S06-2c import: public-matches.ts imports SEO from ./seo/config (the display-horizon constant)");
} else {
  bad("S06-2c import: public-matches.ts does not import SEO from ./seo/config");
}

// ---- 3. UPCOMING ARRAY (displayHorizon, eom gone) ----
if (/const displayHorizon = now \+ SEO\.UPCOMING_DISPLAY_DAYS \* 864e5/.test(pubSrc) && /<= displayHorizon/.test(pubSrc)) {
  ok("S06-3 upcoming: the payload upcoming array rides the 30-day displayHorizon (was eom = end-of-current-month)");
} else {
  bad("S06-3 upcoming: the displayHorizon const / `<= displayHorizon` filter not found");
}
if (!/\beom\b/.test(pubSrc)) {
  ok("S06-3a cleanup: the old `eom` (end-of-current-month) variable is removed from public-matches.ts");
} else {
  bad("S06-3a cleanup: `eom` still referenced in public-matches.ts (should be removed)");
}

// ---- 4. /matches HUB (30-day display filter) ----
const matchesPageIdx = pagesSrc.indexOf("export function buildMatchesPage");
if (matchesPageIdx >= 0) {
  const matchesPageBlock = pagesSrc.slice(matchesPageIdx, matchesPageIdx + 1200);
  if (/SEO\.UPCOMING_DISPLAY_DAYS \* 864e5/.test(matchesPageBlock) && /upcomingBig\(ctx\)\.filter/.test(matchesPageBlock)) {
    ok("S06-4 /matches hub: buildMatchesPage narrows upcomingBig(ctx) to 30 days via SEO.UPCOMING_DISPLAY_DAYS (display); pagination rides the 30-day set");
  } else {
    bad("S06-4 /matches hub: the 30-day display filter on upcomingBig(ctx) not found in buildMatchesPage");
  }
} else {
  bad("S06-4 /matches hub: buildMatchesPage not found in pages.ts");
}

// ---- 5. DATA HORIZON PRESERVED (upcomingBig + upcomingFollowed stay 92) ----
const upcomingBigLine = dataSrc.split("\n").find((l) => /const horizon = now \+ 92 \* 864e5/.test(l));
const horizonCount = (dataSrc.match(/const horizon = now \+ 92 \* 864e5/g) || []).length;
if (upcomingBigLine && horizonCount === 2) {
  ok("S06-5 data horizon preserved: upcomingBig + upcomingFollowed keep `92 * 864e5` (the DATA/DISCOVERY horizon — 2 occurrences, NOT narrowed to 30)");
} else {
  bad("S06-5 data horizon preserved: expected 2 `const horizon = now + 92 * 864e5` occurrences in data.ts (upcomingBig + upcomingFollowed), found " + horizonCount);
}

// ---- 6. HERO CARD CRAWLABILITY (real href, not #) ----
// The hero card unhide: `'<a class="hero-card" id="bigHeroCard" href="' + heroHref + '">'`
// (was `href="#"`). heroHref = `nextBig ? esc(M.matchHref(nextBig.s)) : "#"`.
if (/const heroHref = nextBig \? esc\(M\.matchHref\(nextBig\.s\)\) : "#"/.test(routerSrc)) {
  ok("S06-6a heroHref: buildHomePage computes heroHref = M.matchHref(nextBig.s) (the canonical match URL — slide 1)");
} else {
  bad("S06-6a heroHref: the `const heroHref = nextBig ? esc(M.matchHref(nextBig.s)) : \"#\"` declaration not found in router.ts");
}
// the PC hero card unhide uses heroHref (not href="#")
const pcUnhide = routerSrc.indexOf("if (heroHtml) html = html.replace('<a class=\"hero-card\" id=\"bigHeroCard\" style=\"display:none\" href=\"#\">'");
if (pcUnhide >= 0) {
  const pcReplaceLine = routerSrc.slice(pcUnhide, pcUnhide + 220);
  if (/href="' \+ heroHref \+ '"/.test(pcReplaceLine) && !/'<a class="hero-card" id="bigHeroCard" href="#">'/.test(pcReplaceLine)) {
    ok("S06-6b PC hero card: the unhide replacement sets href to heroHref (the real match URL — was href=\"#\")");
  } else {
    bad("S06-6b PC hero card: the unhide replacement still sets href=\"#\" (should be heroHref) — line: " + pcReplaceLine.replace(/\n/g, " ").slice(0, 160));
  }
} else {
  bad("S06-6b PC hero card: the `if (heroHtml) html = html.replace('<a class=\"hero-card\"...` unhide line not found");
}
// the mobile hero-mcard unhide uses heroHref (not href="#")
const mcUnhide = routerSrc.indexOf("if (mheroHtml) html = html.replace('<a class=\"hero-mcard\" id=\"heroMCard\" style=\"display:none\" href=\"#\" dir=\"ltr\">'");
if (mcUnhide >= 0) {
  const mcReplaceLine = routerSrc.slice(mcUnhide, mcUnhide + 280);
  if (/href="' \+ heroHref \+ '"/.test(mcReplaceLine)) {
    ok("S06-6c mobile hero card: the unhide replacement sets href to heroHref (the real match URL — was href=\"#\")");
  } else {
    bad("S06-6c mobile hero card: the unhide replacement still sets href=\"#\" (should be heroHref) — line: " + mcReplaceLine.replace(/\n/g, " ").slice(0, 160));
  }
} else {
  bad("S06-6c mobile hero card: the `if (mheroHtml) html = html.replace('<a class=\"hero-mcard\"...` unhide line not found");
}

// ---- 7. CAROUSEL NAV (carouselNavHtml) ----
if (/function carouselNavHtml\(heroMatches: any\): string/.test(routerSrc)) {
  ok("S06-7a carouselNavHtml: the helper function exists in router.ts");
} else {
  bad("S06-7a carouselNavHtml: the function declaration not found in router.ts");
}
// returns "" for < 2 slides
const carouselNavBlock = routerSrc.slice(routerSrc.indexOf("function carouselNavHtml"), routerSrc.indexOf("function carouselNavHtml") + 700);
if (/heroMatches\.length < 2/.test(carouselNavBlock) && /return "";/.test(carouselNavBlock)) {
  ok("S06-7b carouselNavHtml: returns '' when the carousel has < 2 slides (the 1-slide case is covered by the hero-card anchor)");
} else {
  bad("S06-7b carouselNavHtml: the < 2 slides early-return guard not found");
}
// emits a sr-only <nav> with <a href>
if (/<nav class="sr-only" aria-label=/.test(carouselNavBlock) && /<li><a href="' \+ esc\(href\)/.test(carouselNavBlock)) {
  ok("S06-7c carouselNavHtml: emits a sr-only <nav> with real <a href> links (one per carousel slide)");
} else {
  bad("S06-7c carouselNavHtml: the sr-only <nav> + <a href> emission not found");
}
// wired into the H1/supporting-copy injection
if (/const carouselNav = carouselNavHtml\(p\.heroMatches\)/.test(routerSrc)) {
  ok("S06-7d carouselNav wiring: buildHomePage calls carouselNavHtml(p.heroMatches) and injects the nav alongside the H1");
} else {
  bad("S06-7d carouselNav wiring: the `const carouselNav = carouselNavHtml(p.heroMatches)` call not found");
}

// ---- 8. CURATION PROMISE (sr-only paragraph) ----
if (/const CURATION_PROMISE = /.test(routerSrc)) {
  ok("S06-8a curation promise: the CURATION_PROMISE const exists in buildHomePage");
} else {
  bad("S06-8a curation promise: the CURATION_PROMISE const not found in router.ts");
}
// the promise names the curated-selection framing (گلچین و معرفی = curated and introduced)
if (/گلچین و معرفی می/.test(routerSrc) && /لیگ برتر انگلیس/.test(routerSrc) && /لیگ قهرمانان اروپا/.test(routerSrc)) {
  ok("S06-8b curation promise copy: names the domestic leagues + UCL + the curated framing («گلچین و معرفی می‌کند» — spec §2 'Do not claim all matches are covered')");
} else {
  bad("S06-8b curation promise copy: the curated-selection framing / league names not found in the CURATION_PROMISE string");
}
// injected as a sr-only <p> (additive — alongside the existing page-summary)
if (/<p class="sr-only">' \+ esc\(CURATION_PROMISE\) \+ "<\/p>/.test(routerSrc)) {
  ok("S06-8c curation promise injection: a sr-only <p> with the curated-selection promise is injected (additive to the existing sr-only page-summary — no title/H1 byte change)");
} else {
  bad("S06-8c curation promise injection: the sr-only <p> injection of CURATION_PROMISE not found");
}

// ---- 9. TITLE BYTE-FROZEN ----
const frozenTitle = "برنامه بازی‌های مهم فوتبال | تاریخ و ساعت شروع | اسپرت سیگنال";
if (routerSrc.includes('const title = "' + frozenTitle + '";')) {
  ok("S06-9 title frozen: the homepage <title> is byte-identical to the pre-S06 value (the Dec 4-8 GSC-measured-surface freeze holds — keyword map §2.1 'keep it; change scheduled: none before Dec 4-8')");
} else {
  bad("S06-9 title frozen: the homepage <title> string changed (should be byte-frozen through Dec 4-8)");
}
// the H1 builder is also frozen (heroH1 unchanged)
if (/function heroH1\(sm: SeoMatch \| null\): string/.test(routerSrc) && /بازی بزرگ بعدی: /.test(routerSrc) && /بازی‌های بزرگ فوتبال/.test(routerSrc)) {
  ok("S06-9a H1 frozen: the heroH1 builder is byte-identical (the dynamic «بازی بزرگ بعدی: …» H1 + the «بازی‌های بزرگ فوتبال» fallback — frozen; the keyword-map §2.1 plan H1 «مهم‌ترین بازی‌های فوتبال اروپا را از دست ندهید» is a post-Dec-4 decision, documented in DECISIONS.md)");
} else {
  bad("S06-9a H1 frozen: the heroH1 builder changed (should be byte-frozen)");
}

// ---- 10. NO REGRESSION (robots + canonical) ----
if (/__SEO_ROBOTS__[\s\S]*?index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1/.test(routerSrc) && /noindex, nofollow/.test(routerSrc)) {
  ok("S06-10a robots: the __SEO_ROBOTS__ prod/non-prod replacement is intact (index,follow on prod / noindex,nofollow on non-prod)");
} else {
  bad("S06-10a robots: the __SEO_ROBOTS__ replacement pattern changed");
}
// the self-canonical at / (in public.ts)
const publicSrc = read("src/pages/public.ts");
if (/<link rel="canonical" href="https:\/\/sportsignal\.ir\/">/.test(publicSrc)) {
  ok("S06-10b canonical: the homepage self-canonical at / is intact (no query, no path change)");
} else {
  bad("S06-10b canonical: the homepage self-canonical link changed");
}

// ---- 11. RESOURCE (zero new KV/fetch) ----
// The horizon change is a filter on already-loaded lists; the carousel nav +
// curation promise are string concatenation from the existing payload rows.
// Verified structurally: no new `env.STATE.get` / `env.STATE.put` / `fetch(` in
// the S06-touched functions (carouselNavHtml, the buildHomePage injection, the
// buildMatchesPage filter).
const s06Blocks = [
  routerSrc.slice(routerSrc.indexOf("function carouselNavHtml"), routerSrc.indexOf("function carouselNavHtml") + 700),
  routerSrc.slice(routerSrc.indexOf("const heroHref ="), routerSrc.indexOf("const heroHref =") + 700),
  pagesSrc.slice(pagesSrc.indexOf("export function buildMatchesPage"), pagesSrc.indexOf("export function buildMatchesPage") + 900)
];
const s06Joined = s06Blocks.join("\n");
if (!/env\.STATE\.(get|put)/.test(s06Joined) && !/\bfetch\(/.test(s06Joined)) {
  ok("S06-11 resource: zero new KV reads/writes + zero new fetches in the S06-touched code (the horizon change is a filter on already-loaded lists; the carousel nav + curation promise are string concatenation from the existing payload rows — the Cloudflare free-tier budget is unchanged)");
} else {
  bad("S06-11 resource: a KV/fetch call found in the S06-touched code (should be zero new I/O)");
}

// ---- summary ----
if (failures === 0) {
  console.log("check-seo-homepage: all checks passed");
  process.exit(0);
} else {
  console.error("check-seo-homepage: " + failures + " FAILURE(S), " + oks + " OK");
  process.exit(1);
}
