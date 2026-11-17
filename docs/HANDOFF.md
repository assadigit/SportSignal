# HANDOFF — SportSignal

> Agents: read AGENTS.md in the repo root first, and follow it for this whole session.

## This session (SEO Program Session 14 — Mobile Performance + GSC Monitoring + Optional GA4; ELEVENTH session, 2026-11-17, deployed 13.268.0-perf-preconnect)

The mobile performance + the GSC monitoring + the optional GA4 decision
session of the 15-session SEO program (the route plan §10 — the phase file
`sportsignal-seo-implementation/phases/SESSION-14-PERFORMANCE-GSC-AND-OPTIONAL-GA4.md`).
**One freeze-safe runtime change (the preconnect to crests.football-data.org)
+ two documentation deliverables (the GSC monitoring view + the GA4
evaluation) + one REJECTED item (the S24-P1 hero-lazy) + one DEFER item (GA4).
Deployed 13.268.0-perf-preconnect.**

- **The S24 parked items resolved:**
  - **P1 hero `loading="lazy"` — REJECTED with reasoning.** The hero poster
    (`/hero-poster.jpg`) is the above-the-fold LCP image. It already ships
    `fetchpriority="high"` + a media-scoped `(max-width:899px)` preload
    (v13.224-herolcp). Adding `loading="lazy"` to an above-the-fold LCP image
    would DELAY the LCP. The below-the-fold images (crests, mc-port
    portraits, emblems, standings logos) ALREADY use `loading="lazy"`
    (verified — the `check-seo-performance.js` gate pins the discipline). P1
    is satisfied where appropriate + correctly NOT applied to the hero. The
    S14-2 decision.
  - **P2 preconnect to crests.football-data.org — IMPLEMENTED, freeze-safe.**
    A `<link rel="preconnect" href="https://crests.football-data.org">` added
    to BOTH the homepage `<head>` (`src/pages/public.ts`) AND the SEO page
    shell `<head>` (`src/seo/page-shell.ts` — covers match/team/competition/
    hubs/static). The DNS+TCP+TLS handshake starts at HTML-byte-0 so the
    first crest `<img>` that parses below the fold fetches without the
    handshake delay. A render-performance HINT only — zero new runtime fetch,
    zero subrequest, zero KV read, zero Worker CPU. NOT a GSC-measured
    title/H1/description/answer byte (freeze-safe per the Dec 4-8 discipline
    — the same class as the S11 og:type + SEO_EXTRA_ALIASES non-title
    metadata changes). NO `crossorigin` — crest `<img>` requests are non-CORS
    (`referrerpolicy="no-referrer"`; a crossorigin preconnect would open a
    separate connection the image fetches would NOT reuse). The S14-1
    decision.

- **The bundle audit:** the `public-13.80.js` bundle (181KB) loads with
  `defer` — no render-blocking (no split needed — defer is the right strategy
  for a single bundle on a mobile-first audience [Mobile = 94.8% of clicks]).
  The `core-13.16.js` (the I18N dictionary) is also deferred. The CSS
  (`public-13.87.css`, 142KB) loads via a standard `<link rel="stylesheet">`
  (the font faces are preloaded + the hero poster is preloaded with
  `fetchpriority="high"` for mobile). No bundle/CSS rename — the preconnect
  is a `<link>` in `<head>`, not a bundle/CSS change.

- **The mobile CWV audit (structural analysis):** the PageSpeed Insights API
  was quota-blocked without an API key (the default per-day quota is 0); the
  CrUX API requires a Google API key (not supplied). The structural analysis
  (the render path + the KV-read count + the CPU cliff) is the fallback. The
  10ms CPU cliff on cold match renders is CHRONIC (37 exceededResources in
  3h on v13.258; P50 ≈ 1ms [cache hits], P99 up to ~124ms [cold renders] —
  the C7 audit / `docs/audits/2026-11-15-gsc-read.md` §6). The preconnect
  does NOT add to the Worker CPU (it is a client-side hint — the Worker emits
  the `<link>` in the HTML head; the browser MAY open the connection but the
  Worker does NOT fetch). The owner should supply the CrUX / PageSpeed
  Insights data for sportsignal.ir if accessible (the program's top evidence
  request — the post-Dec-8 sessions).

- **The documentation deliverables:**
  - **The GSC monitoring view** (`seo-implementation/GSC-MONITORING-VIEW.md`)
    — the per-page-class GSC monitoring view (the URL-pattern × the
    clicks/impressions/CTR/position) + the monitoring cadence (weekly for
    the top 4 page classes, monthly for the full snapshot, post-Dec-8 for
    the freeze-lift measurement) + the GSC filter instructions for each page
    class. Uses the 2026-11-15 GSC export as the baseline (250 clicks /
    9,465 impressions / 412 URLs; Mobile = 94.8% of clicks; Iran = 98.4% of
    clicks). No dashboard tool built (a markdown report + the GSC filter
    instructions is sufficient — the phase file's item 5). The S14-4
    decision.
  - **The GA4 evaluation** (`docs/specs/GA4-EVALUATION.md`) — the pros/cons +
    the consent assessment + the performance impact + the default DEFER
    decision. **GA4 is NOT installed** (no `<script>` tag, no `gtag()` call,
    no GA4 measurement ID — verified). The Cloudflare Web Analytics
    (cookieless RUM) IS already installed on the homepage (the
    `beacon.min.js` with `send.to: /cdn-cgi/rum` — cookieless, deferred via
    `type="module"`, ~10KB). The consent management platform is NOT
    established; the privacy policy is NOT updated for analytics cookies;
    the performance budget for the GA4 script is NOT allocated. The
    prerequisites (a CMP + a privacy policy update + a performance budget +
    the jurisdictional assessment + the Workers Paid plan decision) must be
    met before any GA4 install. The recommended path: extend the Cloudflare
    beacon to the SEO pages (one-line, cookieless, freeze-safe) + use the
    GSC monitoring view + pursue the Workers Paid plan first. The S14-3
    decision.

- **The new check gate:** `scripts/check-seo-performance.js` (17 gates: the
  preconnect on the homepage + the page shell, the early-in-head placement,
  the no-crossorigin discipline, the S24-P1 hero-lazy REJECTION + the LCP
  `fetchpriority="high"` protection, the below-the-fold `loading="lazy"`
  discipline, the deferred JS bundle, the freeze-coordination gate, the GSC
  monitoring view + the GA4 DEFER decision-record). Wired into the `npm test`
  chain. The `check-stats.js` LIVE version pin updated (13.267.0 → 13.268.0
  + the new check-seo-performance.js references). The page baseline
  re-frozen via `--update` (the preconnect is an intended HTML change).

- **What I checked (verification):** the live `/healthz` at session close
  (`ok:true` + `pool_matches:324` + `kv_writes_day:379` + `degraded:false` +
  `version:13.268.0-perf-preconnect` — the KV quota is healthy); the live
  homepage 200 + the preconnect present in the HTML; the live match-page
  (Barcelona–Man City) HTML + the preconnect present; the live team-page
  (Barcelona) HTML + the preconnect present; the live competition-page
  (Champions League) HTML + the preconnect present; `npm test` exit 0
  (**3,738 OK** = the 3,720 baseline + 17 new check-seo-performance gates +
  1 updated parity baseline; `npx tsc --noEmit` clean); the local wrangler
  dev smoke (the worker boots, `/healthz` returns the health JSON [503 is
  the designed degraded-state response in local dev with empty KV — NOT a
  500/1101 error], the homepage 200, the preconnect present in the homepage
  + the SEO page shell HTML); the PageSpeed Insights API attempt (quota-
  blocked without an API key — documented as the structural-analysis
  fallback).

- **Byte-frozen (NOT changed — the Dec 4-8 freeze holds):** the competition-
  page title/H1/description/answer (Session 9), the team-page
  title/H1/description/answer (Session 8), the match-page
  title/H1/description/answer-sentence (Session 7), the homepage title/H1
  (Session 6), the date-hub empty-state copy on `/matches/tomorrow` (S06-H3),
  the team-name spellings in fa-dict.ts (the S1 M2 F3 spelling fix is LIVE
  and mid-measurement — judge ~Dec 8). The S11 freeze-safe changes
  (og:type=article + SEO_EXTRA_ALIASES + TEAM_SLUGS no-op) stay durable. The
  S12 EN architecture decision (Option (b)) stays FINAL. The S13 structured-
  data decision (docs-only) stays. The S14 preconnect is a render-performance
  HINT — NOT a GSC-measured title/H1/description/answer byte (freeze-safe).
  The S14-5 decision.

- **Cloudflare budget of this change:** zero new KV reads (the preconnect is
  a client-side hint — the Worker emits the `<link>` in the HTML head; no KV
  read); zero new KV writes; zero new subrequests (the preconnect is a hint,
  not a fetch — the browser MAY open the connection but the Worker does NOT
  fetch); zero new Worker CPU (the `<link>` is a static string in the HTML
  template); zero render-cost additions (the preconnect REDUCES the crest
  fetch latency — the opposite of a render-cost addition). The GA4 DEFER
  decision adds NOTHING to the runtime (no script installed).

- **Decisions:** S14-1 (the preconnect to crests.football-data.org —
  IMPLEMENTED, freeze-safe; the S24-P2 item), S14-2 (the S24-P1 hero-lazy —
  REJECTED with reasoning; the hero is the LCP with `fetchpriority="high"` +
  a preload; the below-the-fold images already use `loading="lazy"`), S14-3
  (the GA4 DEFER — the consent management platform + the privacy policy +
  the performance budget are the prerequisites; the Cloudflare Web Analytics
  cookieless RUM is already installed; the Workers Paid plan is the budget
  priority), S14-4 (the GSC monitoring view — the per-page-class markdown
  report + the cadence + the GSC filter instructions; no dashboard tool
  built), S14-5 (the freeze-coordination — the preconnect is a render-
  performance HINT, NOT a byte-frozen surface; the Dec 4-8 freeze holds).
  Details in `docs/DECISIONS.md`.

- **Next session (Session 15):** the final regression — the 15-session SEO
  program close-out (the route plan §10 — the phase file
  `sportsignal-seo-implementation/phases/SESSION-15-FINAL-REGRESSION.md`).
  The next-session prompt is in `seo-implementation/next-session-prompt.md`.

## Current state (machine)

- **Version:** `13.268.0-perf-preconnect` (`src/config.ts` / `package.json` `13.268.0.0`). npm test baseline **3,738 OK** (`npx tsc --noEmit` clean + 56 check scripts — the 55 from S13 + the new `check-seo-performance.js`; verified before the push).
- **Deploy:** Worker `ucl-notifier`, versioned deploys only. Current deployment `a4cc2982-c6fa-493f-907b-e71d89c1f33f` (`13.268.0-perf-preconnect`; 2026-11-17, deployed @100% — the Session 14 deploy). Rollback chain: `21efcee2` (13.267.0-persian-entities, Session 11) → `12793863` (13.266.0-internallinks, Session 10) → `fc07b557` (13.265.0-competitions, Session 9) → `b313aada` (13.264.0-teampages, Session 8) → `3e3a65e7` (13.263.0-matchlinks, Session 7) → `7df40334` (13.262.0-homepage, Session 6) → `1d70129b` (13.261.0-matchlife, Session 5) → `7d92e633` (13.260.1-teamidx, Session 4) → `24c62781` (13.260.0-teamidx) → `c97ae70b` (byte-identical S28.1) → earlier. Rollback = `npx wrangler rollback`.
- **Production hostnames:** `sportsignal.ir` (apex Custom Domain), `football.sportsignal.ir` (301→apex except `/webhook`,`/api/`,`/admin`), `ucl-notifier.sportsignal.workers.dev` (noindex-guarded alias — HTML AND machine files since Session 4; never a scratch env).
- **Branch:** `main` (canonical; HEAD = the S14 checkpoint — ls-remote verified after the one-shot token push). Session 14 commit: `seo(s14): the mobile performance + the GSC monitoring + the optional GA4 decision …` (the preconnect to crests.football-data.org on the homepage + the SEO page shell + the S24-P1 hero-lazy REJECTION + the GA4 DEFER + the GSC monitoring view + the new check-seo-performance.js gate + the version bump 13.267.0 → 13.268.0 + the DECISIONS S14-1/2/3/4/5 + the ROUTE-AND-CANONICAL-PLAN §10 note + the SESSION-14 report + the HANDOFF/CHANGELOG/tracker).
- **Commands:** `npm test` (must exit 0 before every push). **npm only, never `bun install`**. Local dev: `npx wrangler dev --config wrangler.dev.toml --port 8787 --local` (the dev config has no [ai] remote binding — safe without the token). Deploy needs `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID=a796fdfe…` in the env. Versioned deploy: `npx wrangler versions upload` → `npx wrangler versions deploy --version-id <id> --percentage 100 --yes`.
- **Cron triggers:** `*/10 * * * *` + `27 */4 * * *` (unchanged). Live healthz at Session 14 close: version `13.268.0-perf-preconnect`; the KV quota is healthy (`ok:true` + `pool_matches:324` + `kv_writes_day:379` + `degraded:false`); `sched_next_ko: 2026-11-20T19:30:00.000Z` (the Bayern–Köln S27 auto-verify window — 3 days away; Session 15 should check the date before any deploy).
- **Key folders:** `src/` (worker modules; `scripts/lib/worker-src.js` carries the bundle ORDER — co-evolve), `assets/` (immutable versioned client payload; SW `sportsignal-v126`, bundle `public-13.80.js`, stylesheet `public-13.87.css`), `docs/` (RUNBOOK, specs, audits, history), `sportsignal-seo-implementation/` (the SEO spec pack — owner's, tracker updated per session), `seo-implementation/` (the SEO program working tree: audits, keyword research, architecture, session reports, next-session prompts, GSC-MONITORING-VIEW.md), `docs/specs/GA4-EVALUATION.md` (the Session 14 GA4 evaluation), `docs/assets/gsc/s13/` (the Session 13 validation evidence).
- **Backups:** KV is live state; no routine file backups (RUNBOOK §5 KV key contracts). Never rename KV keys.
- **Standing limits:** `_headers` at the 100-rule cap (the S14 preconnect is an HTML `<link>`, NOT a header rule — no cap change). **Cross-track SEO measurement window Dec 4-8: the GSC surfaces + team-name spellings stay byte-frozen through it.** The competition-page title/H1/description/answer ARE byte-frozen (Session 9). The team-page title/H1/description/answer ARE byte-frozen (Session 8). The match-page title/H1/description/answer-sentence ARE byte-frozen (Session 7). The homepage title/H1 ARE byte-frozen (Session 6). The date-hub empty-state copy on `/matches/tomorrow` IS byte-frozen (the S06-H3 follow-up is post-Dec-4). The team-name spellings in fa-dict.ts ARE byte-frozen (the S1 M2 F3 spelling fix is LIVE and mid-measurement — judge ~Dec 8). The S11 changes (og:type=article + SEO_EXTRA_ALIASES + TEAM_SLUGS no-op) are NOT GSC-measured surfaces — safe under the freeze; durable. **The S12 decision (Option (b) — maintain the single-language stance) is FINAL; no `/en/` URLs, no hreflang.** **The S13 inspection is read-only — the 13 "Missing field location" GSC Critical items + the 4 non-critical issue types are ALL the honest "missing recommended field" class; the MISSING-IS-NOT-ZERO law holds; the SportsEvent JSON-LD is correct.** **The S14 preconnect is a render-performance HINT — NOT a GSC-measured title/H1/description/answer byte (freeze-safe). The S14 GA4 DEFER holds (GA4 NOT installed; the Cloudflare Web Analytics cookieless RUM is already on the homepage).** The S28 archive scope stays BIG matches only until the owner's A/B. Avoid deploys in the Nov 20 Bayern–Köln verification windows (M1 ~19:35 UTC, M2 ~21:35-45 UTC). Cloudflare free-tier budget: the 10ms CPU cliff on cold match renders is chronic; **the KV read quota (100,000/day free-plan) was exceeded DAILY at Sessions 5-9; at Session 10 + 11 deploy + Session 12 + 13 + 14 close it was healthy** (`ok:true` + `pool_matches:324`) — investigate the read-source; a Workers Paid plan ($5/mo → 1M reads/day) is the durable fix AND the prerequisite for any future `/en/` URL architecture.

## Open follow-ups from the previous tracks (updated by Session 14)

- **Nov 20 (S27 option B):** the auto-verify workflow fires around Bayern–Köln; the owner re-fires the M1/M2 window sessions per the S27-cont record. (`sched_next_ko: 2026-11-20T19:30:00.000Z` — 3 days from the S14 close.)
- **S24 (perf/CWV) — RESOLVED this session:** P1 hero `loading="lazy"` REJECTED (S14-2); P2 preconnect to crests.football-data.org IMPLEMENTED (S14-1). The remaining S24 item — per-route CPU via the Cloudflare GraphQL `workersInvocationsAdaptive` — is a post-Dec-8 follow-up (the owner should supply the Workers Analytics access OR the GraphQL query result; the 10ms CPU cliff on cold match renders is chronic — the C7 audit).
- **S26 (UI/UX iteration):** after S25 (done) — hero rendering, nav UX, FAQ discoverability, schedule density, telegram CTA. **S06-H4 (the visible curation copy) belongs here or in a dedicated UI round.**
- **S1/S2 SEO mini-track:** S1 spelling fix LIVE and mid-measurement (judge ~Dec 8); S2 title test parked — re-fire on/after Dec 4 with a fresh GSC export. **The program's Session 9/10/11 (competition/team pages + internal linking + Persian entity-naming) consumes the S2 title-test result after Dec 4 for the frozen-surface byte decisions (S09-3, S08, S07-H2, S06-H2).**
- **S25 follow-up smokes:** NVDA/VoiceOver + Safari/Firefox/Edge live confirmations (owner sessions needed).
- **C8 client-side staleness vector (Session 4):** the `/api/public-matches` zone-edge HIT stamp (`max-age=14400`) is browser-honored on the poll path — client-side fix or zone Cache Rule; owner decision.
- **KV read quota (Session 5/6/7/8/9/10/11/12/13/14, STILL OPEN):** the account's 100,000 KV reads/day free-plan limit is exceeded DAILY (it resets at UTC midnight but gets exceeded again during the day). Investigate the read-source; consider a Workers Paid plan ($5/mo → 1M reads/day). **Session 14 close: the quota is healthy** (`ok:true` + `pool_matches:324` + `degraded:false`; the deploy did NOT add KV reads — the preconnect is a client-side hint). **A Workers Paid plan is ALSO the prerequisite for any future `/en/` URL architecture** (the S12-1 axis 2 — the 2× KV-read demand) AND the GA4 budget priority (the S14-3 decision).
- **Season-end lifecycle first run (Session 5, unchanged):** the mechanism is shipped + test-proven but INERT (flag false + empty dates map). To enable: confirm FD `season.endDate` values → populate `SEASON_END_DATES` → set `SEASON_END_NOINDEX_ENABLED = true` → versioned deploy → verify live. The first real transition is a May 2027 decision (after the 2026-27 season closes).
- **S10-2 follow-up (the homepage → team/competition spec §9 gap):** the homepage does NOT link directly to `/teams/<slug>` or `/competitions/<slug>` (spec §9 lists "Homepage → ... selected competition sections and selected team pages"). Closing it is a "link placement" change (in-scope per route plan §10) but touches the shared homepage standings/cups renderers (`markup.ts`) with visual side-effects — a Session 15+ follow-up.
- **S11 SEO_EXTRA_ALIASES extension — future additions:** after Dec 4-8, with a fresh 16-month GSC export, validate the alias coverage — add NEW GSC-observed Persian variants as further `SEO_EXTRA_ALIASES` entries (every alias cites its GSC evidence per the S-05 rule).
- **S12 EN architecture decision (FINAL — Option (b)):** a future session that wants to build `/en/` URLs must re-litigate ALL THREE evidence axes (English-query demand in a fresh 16-month GSC export + a Workers Paid plan in place + a demonstrated competitive angle against the English-native publishers). The keyword map §2 English plan slots stay as the documented Option (a) contingency.
- **S13 Events rich-result eligibility revisit (S13-1 option (c)):** after Dec 4-8, with a fresh GSC export, IF the owner wants to pursue the Events rich-result snippet (which would require `location` on the no-venue matches), evaluate a curated, per-entry-verified stadium-lookup (the home-ground table `src/grounds.ts` extended to cover the no-venue matches' home teams, OR a Wikidata sameAs stadium lookup) — ONLY where a true venue value exists + the provenance is verified per entry. NEVER fabricate. That session would add the `check-seo-structured-data.js` gate + the version bump + the deploy.
- **S13 Rich Results Test manual re-run:** the owner should re-run the Rich Results Test (https://search.google.com/test/rich-results) manually (in a non-automated browser) on the representative pages.
- **S14 Cloudflare beacon extension to SEO pages (the GA4 alternative):** the homepage ships the Cloudflare Web Analytics cookieless beacon; the SEO pages (match/team/competition/hubs — `src/seo/page-shell.ts`) do NOT. A future session could extend the beacon to the SEO pages (one-line `<script>` in the `pageShell` head — cookieless, deferred via `type="module"`, freeze-safe) IF the owner wants the per-page-class RUM WITHOUT the GA4 consent burden. This is the recommended path per `docs/specs/GA4-EVALUATION.md` §6.
- **S14 CrUX / PageSpeed Insights data request:** the PageSpeed Insights API was quota-blocked without an API key; the CrUX API requires a Google API key. The owner should supply the CrUX / PageSpeed Insights data for sportsignal.ir (the mobile LCP / INP / CLS per URL class) OR a Google API key for the CrUX API. This is the program's top evidence request for the post-Dec-8 sessions (the S14-1 revisit).

## SEO program state (the 15-session track)

Session 01 ✅ Completed / verified in production (2026-11-16) — audit + docs.
Session 02 ✅ Completed, docs-only, no deploy (2026-11-16) — 369-phrase map + one-URL rules; allowlist corrected to 13.
Session 03 ✅ Completed, docs-only, no deploy (2026-11-16) — the approved architecture (map, matrix, route plan).
Session 04 ✅ Completed / verified in production (2026-11-16) — the crawl/index foundation (C1/C6/C8); 3,628 OK.
Session 05 ✅ Completed / deployed (2026-11-17) — the match-URL lifecycle mechanism (INERT by default); 3,652 OK. Deployment `1d70129b…` @100%.
Session 06 ✅ Completed / deployed (2026-11-17) — the homepage one-month window + carousel crawlability + curated-selection promise; 3,675 OK. Deployment `7df40334…` @100%.
Session 07 ✅ Completed / deployed (2026-11-17) — the match-detail footer-hook team-link gating + the metadata audit; 3,676 OK. Deployment `3e3a65e7…` @100%.
Session 08 ✅ Completed / deployed (2026-11-16) — the selected-club team-page @graph WebPage node + the new `check-seo-teampages.js` gate; 3,685 OK. Deployment `b313aada…` @100%.
Session 09 ✅ Completed / deployed (2026-11-17) — the competition-page @graph CollectionPage node + the date-hub/empty-state verification + the new `check-seo-competitionpages.js` gate + the seeded render harness; 3,694 OK. Deployment `fc07b557…` @100%.
Session 10 ✅ Completed / deployed (2026-11-17) — the `/teams` index tile ordering (the 13 selected clubs first) + the new `check-seo-internallinks.js` gate + the seeded render harness; 3,704 OK. Deployment `12793863…` @100%.
Session 11 ✅ Completed / deployed (2026-11-17) — the Persian entity-naming/metadata polish (og:type=article + SEO_EXTRA_ALIASES + TEAM_SLUGS no-op) + the new `check-seo-persian-entities.js` gate + the seeded render harness; 3,720 OK. Deployment `21efcee2…` @100%.
Session 12 ✅ Completed, docs-only, no deploy (2026-11-17) — the EN architecture + hreflang decision: **Option (b) — maintain the single-language stance, FINAL**. No code change, no version bump, no deploy; npm test 3,720 OK (baseline unchanged).
Session 13 ✅ Completed, docs-only, no deploy (2026-11-17) — the structured-data + GSC enhancement validation: **the 13 "Missing field location" GSC Critical items + the 4 non-critical issue types are ALL the honest "missing recommended field" class — the schema type IS SportsEvent; the MISSING-IS-NOT-ZERO law holds; the SportsEvent JSON-LD is schema.org-VALID; the existing gates already pin the contract**. No code change, no version bump, no deploy; npm test 3,720 OK (baseline unchanged).
Session 14 ✅ Completed / deployed (2026-11-17) — the mobile performance + the GSC monitoring + the optional GA4 decision: **the preconnect to crests.football-data.org IMPLEMENTED on the homepage + the SEO page shell (freeze-safe — the S24-P2 item); the S24-P1 hero-lazy REJECTED (the hero is the LCP with `fetchpriority="high"` + a preload); the GA4 DEFER (the consent/perf prerequisites not met; the Cloudflare Web Analytics cookieless RUM is already installed); the GSC monitoring view (the per-page-class markdown report + the cadence + the GSC filter instructions)**. The new `check-seo-performance.js` gate (17 gates); the GSC monitoring view (`seo-implementation/GSC-MONITORING-VIEW.md`); the GA4 evaluation (`docs/specs/GA4-EVALUATION.md`). Version bump 13.267.0 → 13.268.0; npm test 3,720 → 3,738 OK. Deployment `a4cc2982…` @100%.
`seo-implementation/next-session-prompt.md` holds the Session 15 start prompt
(the final regression — the 15-session SEO program close-out). Progress source of
truth: `sportsignal-seo-implementation/IMPLEMENTATION-TRACKER.md`.
