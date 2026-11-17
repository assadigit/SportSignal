# SEO Program Session 14 — Mobile Performance + GSC Monitoring + Optional GA4

> Agents: read AGENTS.md in the repo root first, and follow it for this whole task.

- **Date:** 2026-11-17
- **Version shipped:** `13.268.0-perf-preconnect` (deployment `a4cc2982-c6fa-493f-907b-e71d89c1f33f` @100%).
- **Live before:** `13.267.0-persian-entities` (Session 11, deployment `21efcee2-269a-4ad1-819c-b6027822607a` @100% — UNCHANGED by the docs-only S12 + S13 sessions).
- **Status:** Completed / deployed + verified live. One freeze-safe runtime change (the preconnect to crests.football-data.org) + two documentation deliverables (the GSC monitoring view + the GA4 evaluation) + one REJECTED item (the S24-P1 hero-lazy) + one DEFER item (GA4).

## 1. Objective and scope

The mobile performance + the GSC monitoring + the optional GA4 decision
session of the 15-session SEO program (the route plan §10 — the phase file
`sportsignal-seo-implementation/phases/SESSION-14-PERFORMANCE-GSC-AND-OPTIONAL-GA4.md`).
The phase file's required work: (1) audit real mobile Core Web Vitals /
PageSpeed evidence where accessible; (2) optimize only measured bottlenecks;
preserve the existing visual design and football imagery; (3) reuse image
optimization/caching patterns; avoid new runtime fetches; (4) verify Core
Web Vitals and critical routes after changes; (5) establish a GSC monitoring
view/report for homepage, match, selected-team, competition and date pages;
(6) evaluate GA4 as optional: first check existing analytics, privacy/legal/
consent setup and performance impact. Do not install it automatically if
configuration/consent is unclear. Document pros/cons and request owner
approval in the report if necessary.

The Dec 4-8 measurement freeze applies to the GSC-measured surfaces (all
title/H1 bytes + the team-name spellings + the date-hub empty-state copy on
`/matches/tomorrow`). Session 14's mobile-performance work is spelling-freeze-
aware: the performance optimizations (image loading, preconnect, render-cost
reductions) are NOT GSC-measured title/H1 bytes — safe under the freeze IF
they do not touch the byte-frozen title/H1/description/answer-sentence bytes
(the same discipline as the S11 og:type=article + SEO_EXTRA_ALIASES freeze-
safe changes). Adding `loading="lazy"` to below-the-fold images or a
`<link rel="preconnect">` is a render-performance change (NOT a title/H1 byte
change) — freeze-safe. NEVER change the byte-frozen title/H1/description/
answer-sentence bytes (the Dec 4-8 freeze holds).

## 2. The mobile CWV audit — the structural analysis (the PageSpeed Insights API was quota-blocked)

The PageSpeed Insights API (`https://www.googleapis.com/pagespeedonline/v5/
runPagespeed?url=https://sportsignal.ir/&strategy=mobile&category=PERFORMANCE`)
was attempted. The response: `quotaLimitExceeded` — the default per-day
quota is 0 without a Google API key. The CrUX API
(`https://api.crux-api.com/v1/records`) requires a Google API key (not
supplied). **The structural analysis (the render path + the KV-read count +
the CPU cliff) is the fallback** — the prompt anticipated this: "if a metric
is not accessible, say so + use the structural analysis."

### 2.1 The render path (the homepage + the SEO pages)

- **The homepage** (`src/pages/public.ts` — the `PUBLIC_PAGE` template):
  the `<head>` ships the font preloads (Peyda-Regular / Peyda-ExtraBold /
  MorabbaVF — `crossorigin`), the hero poster preload (`/hero-poster.jpg`
  with `media="(max-width:899px)" fetchpriority="high"` — the v13.224-herolcp
  LCP protection), the stylesheet (`/public-13.87.css`), the inline styles.
  The `<body>` ships the hero, the big-matches box, the UCL card + table, the
  standings grid, the cups, the live section. The JS bundle
  (`public-13.80.js`, 181KB) + the core dictionary (`core-13.16.js`) load
  with `defer` (no render-blocking). The Cloudflare Web Analytics beacon
  (`beacon.min.js` with `type="module"` — deferred by default, cookieless)
  is the last `<script>`.

- **The SEO pages** (`src/seo/page-shell.ts` — the `pageShell` function,
  used by match/team/competition/hubs/static): the `<head>` ships the font
  preloads + the `FONT_FACES_STYLE` + the stylesheet (`/public-13.87.css`)
  + the inline page-specific styles + the `buildHead` output (title /
  description / canonical / robots / icons / og / twitter / alternates /
  JSON-LD). The SEO pages are complete server HTML — no home-page JS is
  loaded. The match-page hero scene art (`/ui/mc/scene-4-2.webp` or
  `scene-2.webp`) ships a media-scoped `(max-width:899px)` `fetchpriority=high`
  preload (router.ts:354) when a hero match exists.

### 2.2 The external render-dependency — the crest images

The crest images are the primary external render-dependency on every page.
The crest URLs come from the football-data.org API response (`r.team.crest`)
— confirmed live: `https://crests.football-data.org/64.png` (Barcelona),
`/66.png` (Real Madrid), `/PL.png` (Premier League), etc. The crests render
on:
- **The homepage:** the big-matches box (`.mcrest`), the UCL table
  (`.stcrest`), the cups (`.mcomplogo`), the standings grid (`.stbox-head`
  emblems).
- **The match page:** the facts panel team crests, the standings tables, the
  breadcrumb competition chip.
- **The team page:** the team crest in the hero + the standings.
- **The competition page:** the competition emblem + the match-list crests.

Before this session, there was NO `<link rel="preconnect">` to
`crests.football-data.org`. The browser discovered the crest `<img>` tags
as it parsed the HTML below the fold, then started the DNS+TCP+TLS handshake
for each — adding the handshake latency to the crest fetch. **This is the
measured bottleneck the S24-P2 preconnect resolves** (the S24 parked item).

### 2.3 The Worker-side CPU cliff (the C7 audit — unchanged by S14)

The 10ms CPU cliff on cold match renders is CHRONIC
(`docs/audits/2026-11-15-gsc-read.md` §6): 37 exceededResources errors in the
3 hours before the 13.259 deploy (on the untouched 13.258), 13 on Nov 13,
~789 on Nov 10 (the SEO-layer launch week). The exceeded invocations sit at
exactly 10ms CPU (the Workers free-plan limit); successful renders show P50
≈ 1ms (cache hits) with P99 up to ~124ms (cold renders) — every cold match-
page render is a lottery ticket against the 10ms cliff. The cold match-render
path parses the 139KB archive + the 346-row pool + 7 standings tables +
composes ~100KB of HTML, all near the cliff on a cold isolate. The ARCHIVE_PAGE_TTL
is frozen at 6h as the C7 mitigation.

**The S14 preconnect does NOT add to the Worker CPU** — it is a client-side
hint (the Worker emits the `<link>` in the HTML head; the browser MAY open
the connection but the Worker does NOT fetch). The preconnect is a ZERO-cost
runtime change (zero new KV reads, zero new KV writes, zero new subrequests,
zero new Worker CPU).

## 3. The S24 parked items resolved

### 3.1 P1 — hero `loading="lazy"` — REJECTED with reasoning (S14-2)

The S24-P1 item was parked with the note "the hero image is above-the-fold —
`loading='lazy'` may NOT be right for it; evaluate." The evaluation:

- **The hero poster (`/hero-poster.jpg`) is the above-the-fold LCP image.**
  The v13.224-herolcp diagnostic (the public.ts comment block at lines 61-78)
  established this: "lighthouse's own lcp-discovery-insight says
  'fetchpriority=high should be applied' (priorityHinted:false) — the poster
  rides at MEDIUM priority behind the VeryHigh CSS + the High fonts/scene."
  The fix (v13.224-herolcp) shipped: (1) a media-scoped
  `(max-width:899px)` `<link rel="preload" as="image" fetchpriority="high">`
  in the `<head>` (so the fetch starts at HTML-byte-0, before the render-
  blocking stylesheet applies the element's display rule); (2) the matching
  `fetchpriority="high"` on the `<img>` itself (so the priority holds when
  the element parses).

- **Adding `loading="lazy"` to an above-the-fold LCP image would DELAY the
  LCP.** The browser defers lazy images until they are near the viewport.
  The hero IS the viewport (above-the-fold). The deferral would delay the LCP
  fetch, regressing the mobile LCP — the #1 CWV metric for the mobile-first
  audience (Mobile = 94.8% of clicks).

- **The S24-P1 INTENT (lazy-load below-the-fold images) is ALREADY satisfied.**
  The crest images (`markup.ts:62`, `pages.ts:169/1981`, etc.), the mc-port
  portraits (`router.ts:349`), the emblems (`markup.ts:148/266/349/453/499`,
  `pages.ts:258/1754/1943/2261`), the standings logos ALL ship
  `loading="lazy" + decoding="async"`. The hero league logo ships
  `loading="eager"` (correct — it is part of the above-the-fold hero
  presentation).

**Decision: REJECT P1** (do NOT add `loading="lazy"` to the hero poster).
The `check-seo-performance.js` gate pins: (1) the hero poster preload with
`fetchpriority="high"` is present; (2) the hero-bg img does NOT carry
`loading="lazy"`; (3) the below-the-fold crest/portrait images DO carry
`loading="lazy"`. The S14-2 decision.

### 3.2 P2 — preconnect to crests.football-data.org — IMPLEMENTED, freeze-safe (S14-1)

The S24-P2 item: "preconnect to crests.football-data.org" — the crest images
are a render-blocking fetch chain (the external host every team/competition
emblem + standings crest is fetched from). **IMPLEMENTED.**

- **The change:** a `<link rel="preconnect" href="https://crests.football-data.org">`
  added to BOTH the homepage `<head>` (`src/pages/public.ts` — right after
  the viewport meta, before the icons) AND the SEO page shell `<head>`
  (`src/seo/page-shell.ts` — right after the viewport meta, before the
  themeInit / the font preloads / the stylesheet). The preconnect is placed
  EARLY in `<head>` so the DNS+TCP+TLS handshake precedes the render-blocking
  stylesheet parse. The SEO page shell covers ALL SEO pages (match/team/
  competition/hubs/static — `pages-static.ts` reuses `pageShell`).

- **The no-crossorigin discipline:** the preconnect carries NO `crossorigin`
  attribute. Crest `<img>` requests are non-CORS (simple image requests with
  `referrerpolicy="no-referrer"`). A `crossorigin` preconnect would open a
  SEPARATE connection that the image fetches would NOT reuse, defeating the
  optimization.

- **The freeze-safety:** the preconnect is a `<link>` in `<head>` — NOT a
  GSC-measured title/H1/description/answer-sentence byte. The byte-frozen
  surfaces are ALL untouched. The preconnect is the same class as the S11
  og:type=article + SEO_EXTRA_ALIASES non-title metadata changes (freeze-safe
  per Dec 4-8). The S14-5 decision.

- **The Cloudflare budget:** zero new KV reads (the preconnect is a client-
  side hint — the Worker emits the `<link>` in the HTML head; no KV read);
  zero new KV writes; zero new subrequests (the preconnect is a hint, not a
  fetch — the browser MAY open the connection but the Worker does NOT fetch);
  zero new Worker CPU (the `<link>` is a static string in the HTML template);
  zero render-cost additions (the preconnect REDUCES the crest fetch latency
  — the opposite of a render-cost addition).

### 3.3 The bundle audit — no split needed

The `public-13.80.js` bundle (181KB) loads with `defer` — no render-blocking
(the HTML parse + first paint proceed without waiting for the bundle). The
`core-13.16.js` (the I18N dictionary) is also deferred. The CSS
(`public-13.87.css`, 142KB) loads via a standard `<link rel="stylesheet">`.
**No split needed** — `defer` is the right strategy for a single 181KB bundle
on a mobile-first audience. No bundle/CSS rename — the preconnect is a
`<link>` in `<head>`, not a bundle/CSS change. The SW cache stays
`sportsignal-v126`; the client bundle stays `public-13.80.js`; the stylesheet
stays `public-13.87.css`. The `_headers` cap is untouched (the preconnect is
an HTML `<link>`, not a header rule).

## 4. The GSC monitoring view (S14-4)

The GSC monitoring view is a DOCUMENTATION deliverable
(`seo-implementation/GSC-MONITORING-VIEW.md`). The report defines:

1. **The baseline** (the 2026-11-15 GSC export — 16-month window): 250 clicks
   / 9,465 impressions / 412 URLs. The device breakdown: Mobile = 237 clicks
   / 9,145 impressions (94.8% of clicks); Desktop = 9 / 197; Tablet = 4 / 123.
   The country breakdown: Iran = 248 clicks / 8,774 impressions (98.4% of
   clicks); Afghanistan = 1 / 438; Germany = 0 / 50 (Persian-diaspora, zero
   clicks).

2. **The per-page-class aggregation** (the Pages.csv → the 9 page classes):
   match-detail (192 clicks / 6,356 impr / 262 URLs / avg pos 8.3), date-hub
   tomorrow (18 / 218 / pos 6.7), homepage (8 / 267 / pos 9.1), team-detail
   (16 / 2,456 impr / 127 URLs / pos 8.0), competition-detail (6 / 161 / 6
   URLs / pos 7.3), matches hub (3 / 100 / pos 5.8), matches pagination (3 /
   32 / 2 URLs), date-hub today (2 / 26 / pos 7.6), teams index (0 / 24 /
   pos 5.5), competitions index (0 / 10 / pos 4.7).

3. **The per-page-class GSC filter instructions** — the exact Page filter /
   regex for each class (e.g., `https://sportsignal.ir/matches/*` for match-
   detail; the regex `\/matches\/[a-z].*-202[56]-` to exclude the date hubs).

4. **The monitoring cadence:** weekly for the top 4 page classes (match-
   detail, homepage, date-hub tomorrow, selected-team detail — ~5 minutes);
   monthly for the full snapshot (the 28-day CSV export + the page-class
   aggregation — ~15 minutes); post-Dec-8 for the freeze-lift measurement
   (the first fresh 16-month GSC export after Dec 8).

5. **The GSC report URLs / filter sets** the owner should check: Search
   Results, Pages, Queries, Devices, Countries, Enhancements/Events, Coverage.

No dashboard tool is built (the phase file's item 5: "a markdown report + the
GSC filter instructions is sufficient"). The S14-4 decision.

## 5. The GA4 evaluation (S14-3) — DEFER

The GA4 evaluation is a DOCUMENTATION deliverable
(`docs/specs/GA4-EVALUATION.md`). The evaluation:

### 5.1 Existing analytics — what is ALREADY installed

**GA4 is NOT installed.** There is no `<script>` tag for GA4, no `gtag()`
call, no GA4 measurement ID (`G-XXXXXXXXXX`) anywhere in the codebase
(verified — `grep -rn "gtag\|G-[A-Z0-9]\{10\}" src/` returns zero matches).

**Cloudflare Web Analytics (cookieless RUM) IS installed.** The homepage
(`src/pages/public.ts`) ships the Cloudflare Insights beacon:
```html
<script type="module" src="https://static.cloudflareinsights.com/beacon.min.js"
  data-cf-beacon='{"token": "fb7e7f1d66e84ed3b4572545c93ef538",
  "send": {"to": "/cdn-cgi/rum"}}'></script>
```
This is Cloudflare's cookieless RUM — page views + CWV (LCP/CLS/INP) +
country/device WITHOUT a cookie. The `send.to: /cdn-cgi/rum` routes the
beacon to the same origin (the Cloudflare edge). The beacon is loaded with
`type="module"` (deferred by default) so it does NOT block the HTML parse.

**The key finding: the site ALREADY has a privacy-respecting, cookieless RUM
that covers the core measurement needs WITHOUT the GA4 consent burden.** The
SEO pages (match/team/competition/hubs — `src/seo/page-shell.ts`) do NOT ship
the beacon (it is on the homepage only). A future session could extend the
beacon to the SEO pages (one-line, cookieless, freeze-safe) — the recommended
path for the per-page-class traffic data WITHOUT GA4.

### 5.2 Privacy / legal / consent — NOT established

- No cookie banner, no consent management platform (CMP).
- No privacy policy page for analytics cookies (the site has `/methodology` +
  `/about` but no `/privacy`).
- The jurisdictional assessment: Iran = 98.4% of clicks (Iran's 2022 Personal
  Data Protection Act); the Persian-diaspora in GDPR jurisdictions (Germany
  50 impr, Netherlands, UK) — the ePrivacy Directive + the UK GDPR/PECR
  require EXPLICIT CONSENT before the GA4 script loads; the Schrems II ruling
  adds a data-transfer assessment for EU → US data flows.

### 5.3 Performance impact

GA4 adds a render-blocking `<script>` tag + a `gtag()` call per page (~50KB
gzipped + the configuration + the event calls). Against the budget: the
mobile-first audience (Mobile = 94.8% of clicks) on throttled 3G/4G
connections in Iran would feel the GA4 script's fetch + parse + execute cost
as a TBT + FCP regression. The Cloudflare beacon (cookieless, deferred via
`type="module"`, ~10KB) is the lighter alternative.

### 5.4 The decision — DEFER

**Default: GA4 is NOT installed.** The consent management platform is NOT
established, the privacy policy is NOT updated, and the performance budget
is NOT allocated. The prerequisites (a CMP + a privacy policy update + a
performance budget + the jurisdictional assessment + the Workers Paid plan
decision) must be met before any GA4 install. The recommended path: extend
the Cloudflare beacon to the SEO pages + use the GSC monitoring view +
pursue the Workers Paid plan first. The S14-3 decision.

## 6. The verification

- **`npm test` exit 0:** 3,738 OK (the 3,720 baseline + 17 new
  `check-seo-performance.js` gates + 1 updated parity baseline; `npx tsc
  --noEmit` clean). Verified before the push.
- **The local wrangler dev smoke:** the worker boots; `/healthz` returns the
  health JSON (503 is the designed degraded-state response in local dev with
  empty KV — NOT a 500/1101 error); the homepage 200; the preconnect present
  in the homepage HTML + the SEO page shell HTML (the team page). The match
  page 404 in local dev is the empty-KV limitation (pool_matches:0) — NOT a
  code issue.
- **The versioned deploy:** `npx wrangler versions upload` → version
  `a4cc2982-c6fa-493f-907b-e71d89c1f33f` → `npx wrangler versions deploy
  --version-id a4cc2982-c6fa-493f-907b-e71d89c1f33f --percentage 100 --yes`
  → SUCCESS.
- **The live verification:** `/healthz` `ok:true` + `pool_matches:324` +
  `kv_writes_day:379` + `degraded:false` + `version:13.268.0-perf-preconnect`
  (the KV quota is healthy); the homepage 200 + the preconnect present; the
  match-page (Barcelona–Man City) HTML + the preconnect present; the team-
  page (Barcelona) HTML + the preconnect present; the competition-page
  (Champions League) HTML + the preconnect present.

## 7. Byte-frozen (NOT changed — the Dec 4-8 freeze holds)

The competition-page title/H1/description/answer (Session 9), the team-page
title/H1/description/answer (Session 8), the match-page title/H1/description/
answer-sentence (Session 7), the homepage title/H1 (Session 6), the date-hub
empty-state copy on `/matches/tomorrow` (S06-H3), the team-name spellings in
fa-dict.ts (the S1 M2 F3 spelling fix is LIVE and mid-measurement — judge
~Dec 8). The S11 freeze-safe changes (og:type=article + SEO_EXTRA_ALIASES +
TEAM_SLUGS no-op) stay durable. The S12 EN architecture decision (Option (b))
stays FINAL. The S13 structured-data decision (docs-only) stays. The S14
preconnect is a render-performance HINT — NOT a GSC-measured title/H1/
description/answer byte (freeze-safe). The S14-5 decision.

## 8. Decisions

- **S14-1:** the preconnect to crests.football-data.org — IMPLEMENTED,
  freeze-safe (the S24-P2 item). Details in `docs/DECISIONS.md`.
- **S14-2:** the S24-P1 hero `loading="lazy"` — REJECTED with reasoning (the
  hero is the above-the-fold LCP image with `fetchpriority="high"` + a
  preload; the below-the-fold images already use `loading="lazy"`).
- **S14-3:** the GA4 DEFER — the consent management platform + the privacy
  policy + the performance budget are the prerequisites; the Cloudflare Web
  Analytics cookieless RUM is already installed; the Workers Paid plan is the
  budget priority.
- **S14-4:** the GSC monitoring view — the per-page-class markdown report +
  the cadence + the GSC filter instructions; no dashboard tool built.
- **S14-5:** the freeze-coordination — the preconnect is a render-performance
  HINT, NOT a byte-frozen surface; the Dec 4-8 freeze holds.

## 9. Next session (Session 15)

The final regression — the 15-session SEO program close-out (the route plan
§10 — the phase file
`sportsignal-seo-implementation/phases/SESSION-15-FINAL-REGRESSION.md`). The
next-session prompt is in `seo-implementation/next-session-prompt.md`.
