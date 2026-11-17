#!/usr/bin/env node
// scripts/check-seo-performance.js
// SEO Program Session 14 (Mobile Performance + GSC Monitoring + Optional GA4 —
// the S24 parked items: P1 hero loading="lazy" [REJECTED with reasoning],
// P2 preconnect to crests.football-data.org [IMPLEMENTED, freeze-safe]).
//
// The Session 14 scope (route plan §10 + the phase file
// SESSION-14-PERFORMANCE-GSC-AND-OPTIONAL-GA4.md + the spec §10 Cloudflare
// free-tier guardrails + §11 measurement):
//   1. The preconnect to the crest image origin (crests.football-data.org) —
//      a render-performance HINT that starts the DNS+TCP+TLS handshake at
//      HTML-byte-0 so the first crest <img> that parses below the fold
//      fetches without the handshake delay. Added to BOTH the homepage
//      <head> (src/pages/public.ts) AND the SEO page shell <head>
//      (src/seo/page-shell.ts — covers match/team/competition/hubs). A
//      HINT only — zero new runtime fetch, zero subrequest, zero KV read,
//      zero CPU. NOT a GSC-measured title/H1/description/answer byte
//      (freeze-safe per the Dec 4-8 discipline — the same class as the S11
//      og:type + SEO_EXTRA_ALIASES non-title metadata changes).
//   2. The S24-P1 hero loading="lazy" item — REJECTED with reasoning: the
//      hero poster (/hero-poster.jpg) is the above-the-fold LCP image, already
//      ships fetchpriority="high" + a media-scoped (max-width:899px) preload
//      (v13.224-herolcp). Adding loading="lazy" to an above-the-fold LCP
//      image would DELAY the LCP (the browser defers lazy images until
//      near-viewport). The below-the-fold images (crests, mc-port portraits,
//      emblems) ALREADY use loading="lazy" (verified below). P1 is satisfied
//      where appropriate + correctly NOT applied to the hero.
//   3. The no-crossorigin discipline on the preconnect — crest <img>
//      requests are non-CORS (simple image requests with
//      referrerpolicy="no-referrer"). A crossorigin preconnect would open a
//      SEPARATE connection that the image fetches would NOT reuse, defeating
//      the optimization.
//   4. The freeze-coordination gate — the preconnect is a <link> in <head>,
//      NOT a title/H1/description/answer byte. The byte-frozen surfaces stay
//      untouched (the Dec 4-8 freeze holds).
//   5. The GA4 decision (DEFER — default) + the GSC monitoring view are
//      documentation deliverables (no runtime code) — pinned here as the
//      decision-record presence check.
"use strict";
const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");

let failures = 0;
let oks = 0;
function ok(msg) { oks++; console.log("OK   check-seo-performance: " + msg); }
function bad(msg) { console.error("FAIL check-seo-performance: " + msg); failures++; }

const publicSrc = fs.readFileSync(path.join(root, "src", "pages", "public.ts"), "utf8");
const shellSrc = fs.readFileSync(path.join(root, "src", "seo", "page-shell.ts"), "utf8");
const routerSrc = fs.readFileSync(path.join(root, "src", "seo", "router.ts"), "utf8");
const markupSrc = fs.readFileSync(path.join(root, "src", "seo", "markup.ts"), "utf8");
const pagesSrc = fs.readFileSync(path.join(root, "src", "seo", "pages.ts"), "utf8");
const configSrc = fs.readFileSync(path.join(root, "src", "config.ts"), "utf8");

// ============================================================
// 1. The preconnect to crests.football-data.org — the HOMEPAGE <head>
//    (src/pages/public.ts). The handshake starts at HTML-byte-0.
// ============================================================
const homepagePreconnect = /<link rel="preconnect" href="https:\/\/crests\.football-data\.org">/.test(publicSrc);
if (homepagePreconnect) ok("S14/P2: the preconnect to crests.football-data.org is in the homepage <head> (src/pages/public.ts) — the handshake starts at HTML-byte-0");
else bad("S14/P2: the preconnect to crests.football-data.org is MISSING from the homepage <head> (src/pages/public.ts)");

// The preconnect sits EARLY in <head> (after viewport, before the icons) so
// the handshake starts before the stylesheet + the inline styles parse.
const homepageEarlyOrder = /<meta name="viewport"[^>]*>\s*<!--[^]*?preconnect[^]*?-->\s*<link rel="preconnect" href="https:\/\/crests\.football-data\.org">\s*<link rel="icon"/.test(publicSrc);
if (homepageEarlyOrder) ok("S14/P2: the homepage preconnect is placed EARLY in <head> (after viewport, before icons — the handshake precedes the stylesheet parse)");
else bad("S14/P2: the homepage preconnect is NOT placed early in <head> (it must sit after viewport, before icons — so the handshake starts before the render-blocking stylesheet)");

// ============================================================
// 2. The preconnect to crests.football-data.org — the SEO PAGE SHELL <head>
//    (src/seo/page-shell.ts — covers match/team/competition/hubs/static)
// ============================================================
const shellPreconnect = /<link rel="preconnect" href="https:\/\/crests\.football-data\.org">/.test(shellSrc);
if (shellPreconnect) ok("S14/P2: the preconnect to crests.football-data.org is in the SEO page shell <head> (src/seo/page-shell.ts — covers match/team/competition/hubs)");
else bad("S14/P2: the preconnect to crests.football-data.org is MISSING from the SEO page shell <head> (src/seo/page-shell.ts)");

const shellEarlyOrder = /<meta name="viewport"[^>]*>\s*<!--[^]*?preconnect[^]*?-->\s*<link rel="preconnect" href="https:\/\/crests\.football-data\.org">\s*\$\{themeInit\}/.test(shellSrc);
if (shellEarlyOrder) ok("S14/P2: the page-shell preconnect is placed EARLY in <head> (after viewport, before themeInit — the handshake precedes the font preloads + stylesheet parse)");
else bad("S14/P2: the page-shell preconnect is NOT placed early in <head> (it must sit after viewport, before themeInit — so the handshake starts before the render-blocking stylesheet + font preloads)");

// ============================================================
// 3. The no-crossorigin discipline — crest <img> requests are non-CORS
//    (simple image requests with referrerpolicy="no-referrer"). A
//    crossorigin preconnect would open a SEPARATE connection that the
//    image fetches would NOT reuse, defeating the optimization.
// ============================================================
const homepageNoCrossorigin = !/crests\.football-data\.org"[^>]*crossorigin/.test(publicSrc);
const shellNoCrossorigin = !/crests\.football-data\.org"[^>]*crossorigin/.test(shellSrc);
if (homepageNoCrossorigin && shellNoCrossorigin) ok("S14/P2: the preconnect carries NO crossorigin attribute (crest <img> requests are non-CORS — a crossorigin preconnect would open a separate connection the image fetches would NOT reuse)");
else bad("S14/P2: the preconnect carries a crossorigin attribute — crest <img> requests are non-CORS (referrerpolicy=\"no-referrer\"); a crossorigin preconnect opens a SEPARATE connection the image fetches would NOT reuse, defeating the optimization");

// ============================================================
// 4. The S24-P1 hero loading="lazy" REJECTION — the hero poster
//    (/hero-poster.jpg) is the above-the-fold LCP image. It ships
//    fetchpriority="high" + a media-scoped preload. Adding loading="lazy"
//    to an above-the-fold LCP image would DELAY the LCP. The hero stays
//    eager (the LCP protection).
// ============================================================
const heroPreload = /<link rel="preload" href="\/hero-poster\.jpg" as="image" media="\(max-width:899px\)" fetchpriority="high">/.test(publicSrc);
if (heroPreload) ok("S14/P1-REJECT: the hero poster preload ships fetchpriority=\"high\" + media-scoped (max-width:899px) — the above-the-fold LCP protection (adding loading=\"lazy\" to an above-the-fold LCP image would DELAY the LCP; the hero stays eager)");
else bad("S14/P1-REJECT: the hero poster preload with fetchpriority=\"high\" is MISSING from the homepage <head> (the above-the-fold LCP protection must stay — do NOT add loading=\"lazy\" to the hero)");

// The hero poster <img> itself must NOT carry loading="lazy" (it is the LCP).
// Verify the hero-bg img tag does not have loading="lazy".
const heroImgNoLazy = !/<img[^>]*class="bg-photo"[^>]*loading="lazy"/.test(publicSrc);
if (heroImgNoLazy) ok("S14/P1-REJECT: the hero-bg img does NOT carry loading=\"lazy\" (the above-the-fold LCP image stays eager — loading=\"lazy\" would defer the LCP fetch)");
else bad("S14/P1-REJECT: the hero-bg img carries loading=\"lazy\" — this is WRONG for an above-the-fold LCP image (it would defer the LCP fetch); remove loading=\"lazy\" from the hero img");

// ============================================================
// 5. The below-the-fold loading="lazy" discipline — the crest images,
//    the mc-port portraits, the emblems, the standings logos ALL ship
//    loading="lazy" (the S24-P1 intent is satisfied where appropriate:
//    below-the-fold images are lazy; the hero is NOT).
// ============================================================
// Representative crest image gates (the crest <img> tags in markup.ts + pages.ts)
const crestLazyCount_markup = (markupSrc.match(/<img[^>]*crest[^>]*loading="lazy"/g) || []).length;
const crestLazyCount_pages = (pagesSrc.match(/<img[^>]*loading="lazy"[^>]*referrerpolicy="no-referrer"/g) || []).length;
if (crestLazyCount_markup >= 1) ok("S14/P1-satisfied: the below-the-fold crest images in markup.ts ship loading=\"lazy\" (" + crestLazyCount_markup + " match[es] — the S24-P1 intent is satisfied where appropriate)");
else bad("S14/P1-satisfied: the below-the-fold crest images in markup.ts lost the loading=\"lazy\" discipline (the S24-P1 intent — lazy below-the-fold, eager hero — must hold)");
if (crestLazyCount_pages >= 3) ok("S14/P1-satisfied: the below-the-fold crest/portrait images in pages.ts ship loading=\"lazy\" + referrerpolicy=\"no-referrer\" (" + crestLazyCount_pages + " matches — the lazy discipline holds across the match-centre + standings renderers)");
else bad("S14/P1-satisfied: the below-the-fold crest/portrait images in pages.ts lost the loading=\"lazy\" discipline (" + crestLazyCount_pages + " matches — expected >= 3; the lazy discipline must hold across the match-centre + standings renderers)");

// The mobile featured-match card portraits (mc-port) ship loading="lazy" (router.ts:349)
const mcPortLazy = /const port = \(src: string\) => '<img src="' \+ esc\(src\) \+ '" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">'/.test(routerSrc);
if (mcPortLazy) ok("S14/P1-satisfied: the mobile featured-match card portraits (mc-port) ship loading=\"lazy\" + decoding=\"async\" (router.ts — the below-the-fold portraits are lazy)");
else bad("S14/P1-satisfied: the mobile featured-match card portraits (mc-port) lost the loading=\"lazy\" discipline (router.ts — the below-the-fold portraits must stay lazy)");

// ============================================================
// 6. The JS bundle loads with defer (no render-blocking) — the
//    public-13.80.js bundle is 181KB but loads with defer so it does NOT
//    block the HTML parse or the first paint. The core-13.16.js is also
//    deferred. No bundle split needed (defer is the right strategy for a
//    single 181KB bundle on a mobile-first audience).
// ============================================================
const bundleDefer = /<script src="\/public-13\.80\.js" defer>/.test(publicSrc);
if (bundleDefer) ok("S14/bundle: the public-13.80.js bundle (181KB) loads with defer — no render-blocking (the HTML parse + first paint proceed without waiting for the bundle; no split needed — defer is the right strategy for a single bundle on a mobile-first audience)");
else bad("S14/bundle: the public-13.80.js bundle does NOT load with defer — the bundle MUST stay deferred (a render-blocking bundle would regress the FCP + the LCP on mobile)");

const coreDefer = /<script src="\/core-13\.16\.js" defer>/.test(publicSrc);
if (coreDefer) ok("S14/bundle: the core-13.16.js (the I18N dictionary) loads with defer — no render-blocking");
else bad("S14/bundle: the core-13.16.js does NOT load with defer — the core dictionary MUST stay deferred");

// ============================================================
// 7. The freeze-coordination gate — the preconnect is a <link> in <head>,
//    NOT a title/H1/description/answer byte. The version bump records the
//    change (13.267.0-persian-entities -> 13.268.0-perf-preconnect at S14;
//    subsequent sessions bump forward — 13.269.0-entity-image at S16, etc.).
//    The invariant: the version is >= 13.268.0 (the preconnect shipped + is
//    preserved through later versions).
// ============================================================
const versionBumped = /export const VERSION = "13\.(26[8-9]|[3-9][0-9]{2})\./.test(configSrc);
if (versionBumped) ok("S14/freeze: the version is >= 13.268.0 (the preconnect shipped at S14 + is preserved through later versions — NOT a GSC-measured title/H1/description/answer byte; the Dec 4-8 freeze holds)");
else bad("S14/freeze: the VERSION regressed below 13.268.0 (the preconnect shipped at 13.268.0 — a later version MUST preserve it; the version MUST be >= 13.268.0 per the repo convention)");

// The preconnect does NOT touch any title/H1/description/answer byte —
// verify it lives ONLY in the <head> section (before <title> or after, but
// never inside the <body> title/H1 elements). This is structural: the
// preconnect is a <link> tag, which is only valid in <head>.
const preconnectIsHeadLink = /<link rel="preconnect"/.test(publicSrc) && /<link rel="preconnect"/.test(shellSrc);
const preconnectNotInBody = !/<h1[^>]*>[^]*<link rel="preconnect"/.test(publicSrc) && !/<h1[^>]*>[^]*<link rel="preconnect"/.test(shellSrc);
if (preconnectIsHeadLink && preconnectNotInBody) ok("S14/freeze: the preconnect is a <head> <link> only — it does NOT touch any byte-frozen title/H1/description/answer-sentence byte (the Dec 4-8 freeze coordination holds)");
else bad("S14/freeze: the preconnect leaked outside <head> or touched a byte-frozen surface — the preconnect MUST be a <head> <link> only (freeze-safe)");

// ============================================================
// 8. The documentation deliverables — the GSC monitoring view + the GA4
//    evaluation. These are documentation-only (no runtime code). Pinned
//    as the decision-record presence check.
// ============================================================
const gscViewExists = fs.existsSync(path.join(root, "seo-implementation", "GSC-MONITORING-VIEW.md"));
if (gscViewExists) ok("S14/docs: the GSC monitoring view report exists (seo-implementation/GSC-MONITORING-VIEW.md — the per-page-class GSC monitoring view + the cadence + the GSC filter instructions)");
else bad("S14/docs: the GSC monitoring view report is MISSING (seo-implementation/GSC-MONITORING-VIEW.md — the per-page-class GSC monitoring view must exist as the documentation deliverable)");

const ga4EvalExists = fs.existsSync(path.join(root, "docs", "specs", "GA4-EVALUATION.md"));
if (ga4EvalExists) ok("S14/docs: the GA4 evaluation exists (docs/specs/GA4-EVALUATION.md — the pros/cons + the consent assessment + the performance impact + the default DEFER decision + the prerequisites)");
else bad("S14/docs: the GA4 evaluation is MISSING (docs/specs/GA4-EVALUATION.md — the GA4 decision-record must exist as the documentation deliverable)");

// The GA4 default decision: DEFER (do NOT install). Verify NO gtag() call +
// NO GA4 measurement ID in the codebase (the default defer holds).
const noGtagPublic = !/gtag\(/.test(publicSrc) && !/G-[A-Z0-9]{10}/.test(publicSrc);
const noGtagShell = !/gtag\(/.test(shellSrc) && !/G-[A-Z0-9]{10}/.test(shellSrc);
if (noGtagPublic && noGtagShell) ok("S14/GA4-DEFER: NO gtag() call + NO GA4 measurement ID in the homepage or the SEO page shell (the default DEFER decision holds — GA4 is NOT installed; the consent assessment + the performance budget are the prerequisites)");
else bad("S14/GA4-DEFER: a gtag() call or a GA4 measurement ID (G-XXXXXXXXXX) was found in the homepage or the SEO page shell — the default DEFER decision was violated (GA4 must NOT be installed without the consent management platform + the privacy policy update + the performance budget)");

if (failures) { console.error("\ncheck-seo-performance: " + failures + " failure(s)"); process.exit(1); }
console.log("OK   check-seo-performance: all " + oks + " mobile-performance gates passed (S14: the crests.football-data.org preconnect on the homepage + the SEO page shell, the no-crossorigin discipline, the S24-P1 hero-lazy REJECTION with the LCP-fetchpriority=high protection, the below-the-fold loading=\"lazy\" discipline, the deferred JS bundle, the freeze-coordination gate, the GSC monitoring view + the GA4 DEFER decision-record)");
