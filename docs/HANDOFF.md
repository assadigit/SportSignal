# HANDOFF — SportSignal

> Agents: read AGENTS.md in the repo root first, and follow it for this whole session.

## This session (SEO Program Session 15 — Final Regression + Production QA + Handoff; TWELFTH session, 2026-11-17, docs-only — no deploy; the 15-session SEO program CLOSE-OUT)

The final regression — the 15-session SEO program close-out (the route plan
§10 — the phase file
`sportsignal-seo-implementation/phases/SESSION-15-FINAL-QA-REGRESSION-AND-HANDOFF.md`).
**Docs-only — the regression is CLEAN (no bug found; no deploy).** The live
deployment `a4cc2982-c6fa-493f-907b-e71d89c1f33f` @100% =
`13.268.0-perf-preconnect` (Session 14) STAYS.

- **The freeze status:** the session runs BEFORE Dec 9 (2026-11-17). **The
  Dec 4-8 freeze HOLDS** — the regression is read-only on the byte-frozen
  surfaces (verified unchanged; NOT touched). The S12 EN decision (FINAL —
  Option (b)), the S13 structured-data decision (docs-only), the S14 GA4 DEFER
  + preconnect STAY — Session 15 does NOT re-litigate them.

- **The test suite re-run:** `npm install` (npm only) → `npm test` exit 0
  (**3,738 OK** = the S14 baseline; no new check script added — the regression
  is read-only; `npx tsc --noEmit` clean). All 56 check scripts pass.

- **The URL-class crawl (the per-page-class verification matrix):** 19 HTML
  pages + 4 machine files sampled live against `https://sportsignal.ir` on
  2026-11-17. EVERY page returns HTTP 200 + the correct canonical + the
  correct robots + the title/H1/description + the JSON-LD + the S14 preconnect
  + ZERO hreflang. The classes sampled: the homepage (`/`); the match-detail
  (with-venue [Barcelona–Man City, `location: Camp Nou`] + no-venue
  [Lazio–Lecce, no location — the MISSING-IS-NOT-ZERO law] + expired
  [Arsenal–Leeds, the S5 INERT-lifecycle state]); the selected team
  (`/teams/barcelona` — indexable); the non-selected team (×4 slugs: fulham,
  leeds-united, le-havre, juventus — ALL `noindex, follow`); the core +
  non-core competition (Champions League + DFB-Pokal); the date hubs
  (today/tomorrow); the weekly pages (this-week/this-weekend); the matches
  hub; the teams + competitions index pages; the pagination (`?page=2`); the
  machine files (robots.txt, sitemap.xml, sitemaps/teams.xml [exactly 13
  rows], sitemaps/competitions.xml [7 rows]). The full matrix is in
  `seo-implementation/session-reports/SESSION-15.md` §3 + the
  `seo-implementation/FINAL-SEO-IMPLEMENTATION-REPORT.md` §2.

- **The laws re-confirmed live:**
  - the MISSING-IS-NOT-ZERO law (the with-venue match emits `location`; the
    no-venue match OMITS it; no endDate/offers/aggregateRating fabricated);
  - the 13-club allowlist + the C1 disposition (the teams.xml = exactly 13
    rows; 4 non-selected slugs verified noindex,follow);
  - the /teams tile ordering (the 13 selected clubs lead — the S10 sort);
  - the ZERO hreflang stance (the S12 Option (b) FINAL — every page ships 0
    hreflang; the router has no `/en/` branch; every page ships `<html lang="fa"
    dir="rtl">` + `og:locale=fa_IR`);
  - the no-fake-offers / no-invented-data law (zero live-broadcast claims on
    the match page; zero fabricated `offers`);
  - the S14 preconnect (present on the homepage + every SEO page shell — a
    client-side hint, zero Worker CPU);
  - the GA4 DEFER (no `gtag()` / no GA4 measurement ID; the Cloudflare Web
    Analytics cookieless RUM is on the homepage).

- **The Cloudflare resource state (the Session 15 close):** the live
  `/healthz` — `ok:true` + `pool_matches:324` + `kv_writes_day:403` (of 1,000)
  + `degraded:false` + `subreq_last_tick:31` + `version:13.268.0-perf-preconnect`
  (the KV quota healthy). The Workers Analytics GraphQL (the Nov 16-17 window):
  `success` = 22,359 invocations; `exceededResources` = 4,832 (the chronic C7
  10ms CPU cliff — avg ~11ms CPU each; **NOT caused by the SEO program — zero
  Worker CPU added across S4-S14**); `clientDisconnected` = 40. The cron
  triggers unchanged (`*/10 * * * *` + `27 */4 * * *`). The S14 preconnect
  budget re-confirmed (zero runtime cost — a client-side hint).

- **The byte-frozen surfaces (the read-only freeze verification):** `git
  status` is clean — zero `src/` changes this session (the definitive proof:
  the byte-frozen source surfaces are untouched). Session 15 is docs-only (the
  deliverables are markdown reports — no `src/`/`scripts/`/`assets/` change, no
  version bump, no deploy). The live crawl confirms the frozen bytes match the
  documented values (the homepage title/H1 [S6], the match-page
  title/H1/description/answer-sentence [S7], the team-page title/H1/description/
  answer [S8], the competition-page title/H1/description/answer [S9], the
  date-hub empty-state copy on `/matches/tomorrow` [S06-H3 — the source bytes
  in `src/seo/pages.ts` unchanged], the team-name spellings in `fa-dict.ts`
  [the S1 M2 F3 fix — mid-measurement, judge ~Dec 8]).

- **The GSC baseline comparison — NOT claimed (the seasonality discipline):**
  the 2026-11-15 GSC export is the baseline (250 clicks / 9,465 impressions /
  412 URLs; Mobile = 94.8% of clicks; Iran = 98.4% of clicks). A fresh 16-month
  GSC export (the post-Dec-8 measurement) is the standing request — NOT
  supplied this session. Per the spec §11 + the phase file's item 7, **no
  ranking improvement is claimed.** The GSC monitoring view
  (`seo-implementation/GSC-MONITORING-VIEW.md`) defines the post-Dec-8
  measurement cadence.

- **Decisions:** S15-1 (the final regression is CLEAN — no bug found; no
  deploy), S15-2 (the freeze-coordination — the session runs before Dec 9, the
  freeze HOLDS; the regression is read-only on the byte-frozen surfaces),
  S15-3 (the 15-session SEO program is COMPLETE). Details in `docs/DECISIONS.md`.

- **Deliverables:** the `seo-implementation/FINAL-SEO-IMPLEMENTATION-REPORT.md`
  (the full-program report — the 15-session summary + the per-session
  deploy/version/test-count chain + the per-page-class verification matrix +
  the residual backlog + the future monitoring calendar); the
  `seo-implementation/session-reports/SESSION-15.md` (the session report); the
  completed tracker (the Session 15 row); the ROUTE-AND-CANONICAL-PLAN §10
  Session 15 row; the "project complete" handoff in
  `seo-implementation/next-session-prompt.md`.

- **The program close-out:** the 15-session SportSignal SEO implementation
  program is COMPLETE. The route plan §10 sequencing (Sessions 1-15) is DONE.
  The residual work is owner-driven follow-ups (the post-Dec-8 freeze-lift
  decisions + the measurement requests + the Workers Paid plan + the
  product/UX follow-ups) — NOT a further implementation session. There is no
  Session 16.

## Current state (machine)

- **Version:** `13.268.0-perf-preconnect` (`src/config.ts` / `package.json` `13.268.0.0`). npm test baseline **3,738 OK** (`npx tsc --noEmit` clean + 56 check scripts — unchanged from S14; Session 15 added no new check). UNCHANGED by the docs-only S15 regression.
- **Deploy:** Worker `ucl-notifier`, versioned deploys only. Current deployment `a4cc2982-c6fa-493f-907b-e71d89c1f33f` (`13.268.0-perf-preconnect`; 2026-11-17, deployed @100% — the Session 14 deploy; UNCHANGED by the docs-only S15). Rollback chain: `21efcee2` (13.267.0-persian-entities, Session 11) → `12793863` (13.266.0-internallinks, Session 10) → `fc07b557` (13.265.0-competitions, Session 9) → `b313aada` (13.264.0-teampages, Session 8) → `3e3a65e7` (13.263.0-matchlinks, Session 7) → `7df40334` (13.262.0-homepage, Session 6) → `1d70129b` (13.261.0-matchlife, Session 5) → `7d92e633` (13.260.1-teamidx, Session 4) → `24c62781` (13.260.0-teamidx) → `c97ae70b` (byte-identical S28.1) → earlier. Rollback = `npx wrangler rollback`.
- **Production hostnames:** `sportsignal.ir` (apex Custom Domain), `football.sportsignal.ir` (301→apex except `/webhook`,`/api/`,`/admin`), `ucl-notifier.sportsignal.workers.dev` (noindex-guarded alias — HTML AND machine files since Session 4; never a scratch env).
- **Branch:** `main` (canonical; HEAD = the S15 checkpoint — ls-remote verified after the one-shot token push). Session 15 commit: `seo(s15): the final regression + the production QA + the handoff …` (docs-only: the FINAL-SEO-IMPLEMENTATION-REPORT.md + the SESSION-15 report + the tracker Session 15 row + the HANDOFF/CHANGELOG/DECISIONS updates + the ROUTE-AND-CANONICAL-PLAN §10 Session 15 row + the "project complete" handoff; no `src/`/`scripts/`/`assets/` change, no version bump, no deploy).
- **Commands:** `npm test` (must exit 0 before every push). **npm only, never `bun install`**. Local dev: `npx wrangler dev --config wrangler.dev.toml --port 8787 --local` (the dev config has no [ai] remote binding — safe without the token). Deploy needs `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID=a796fdfe…` in the env. Versioned deploy: `npx wrangler versions upload` → `npx wrangler versions deploy --version-id <id> --percentage 100 --yes`.
- **Cron triggers:** `*/10 * * * *` + `27 */4 * * *` (unchanged). Live healthz at Session 15 close: version `13.268.0-perf-preconnect`; the KV quota is healthy (`ok:true` + `pool_matches:324` + `kv_writes_day:403` + `degraded:false` + `subreq_last_tick:31`); `sched_next_ko: 2026-11-20T19:30:00.000Z` (the Bayern–Köln S27 auto-verify window — 3 days away; the owner re-fires the M1/M2 window sessions per the S27-cont record).
- **Key folders:** `src/` (worker modules; `scripts/lib/worker-src.js` carries the bundle ORDER — co-evolve), `assets/` (immutable versioned client payload; SW `sportsignal-v126`, bundle `public-13.80.js`, stylesheet `public-13.87.css`), `docs/` (RUNBOOK, specs, audits, history), `sportsignal-seo-implementation/` (the SEO spec pack — owner's, tracker updated per session), `seo-implementation/` (the SEO program working tree: audits, keyword research, architecture, session reports, FINAL-SEO-IMPLEMENTATION-REPORT.md, GSC-MONITORING-VIEW.md, next-session-prompt.md), `docs/specs/GA4-EVALUATION.md` (the Session 14 GA4 evaluation), `docs/assets/gsc/s13/` (the Session 13 validation evidence).
- **Backups:** KV is live state; no routine file backups (RUNBOOK §5 KV key contracts). Never rename KV keys.
- **Standing limits:** `_headers` at the 100-rule cap (the S14 preconnect is an HTML `<link>`, NOT a header rule — no cap change). **The 15-session SEO program is COMPLETE (Session 15 = the final regression; there is no Session 16).** The Dec 4-8 measurement freeze HELDS through Dec 8 (the GSC surfaces + team-name spellings byte-frozen); the session runs before Dec 9 — the freeze HOLDS. The S12 decision (Option (b) — maintain the single-language stance) is FINAL; no `/en/` URLs, no hreflang. The S13 structured-data decision (docs-only — the 13 items are the honest "missing recommended field" class; the MISSING-IS-NOT-ZERO law holds) STAYS. The S14 preconnect (freeze-safe) + the GA4 DEFER (GA4 NOT installed; the Cloudflare Web Analytics cookieless RUM is on the homepage) STAY. The S28 archive scope stays BIG matches only until the owner's A/B. Avoid deploys in the Nov 20 Bayern–Köln verification windows (M1 ~19:35 UTC, M2 ~21:35-45 UTC). Cloudflare free-tier budget: the 10ms CPU cliff on cold match renders is chronic (the C7 audit — 4,832 exceededResources over Nov 16-17; NOT caused by the SEO program); **the KV read quota (100,000/day free-plan) was exceeded DAILY at Sessions 5-9; healthy at Sessions 10-15 close** (`ok:true` + `pool_matches:324`) — investigate the read-source; a Workers Paid plan ($5/mo → 1M reads/day) is the durable fix AND the prerequisite for any future `/en/` URL architecture AND the GA4 budget priority.

## Open follow-ups (the residual backlog — owner-driven; NOT a further implementation session)

The program's implementation work is complete. These are owner-driven
follow-ups (the post-Dec-8 freeze-lift decisions + the measurement requests +
the infrastructure + the product/UX follow-ups). The full backlog is in
`seo-implementation/FINAL-SEO-IMPLEMENTATION-REPORT.md` §5.

- **The post-Dec-8 freeze-lift decisions:** the S2 title-test re-fire; the
  S06-H3 date-hub empty-state copy decision; the S1 spelling-fix judgement
  (judge ~Dec 8); the S11 SEO_EXTRA_ALIASES extension (new GSC-observed
  Persian variants); the S13-1 option (c) Events rich-result eligibility
  revisit (the curated stadium-lookup — ONLY where a true venue value exists;
  NEVER fabricate). All need the fresh 16-month GSC export.
- **The fresh 16-month GSC export** (the post-Dec-8 measurement) — the
  program's top evidence request; validates the full-program regression.
- **The CrUX / PageSpeed Insights data** for sportsignal.ir (the mobile
  LCP/INP/CLS per URL class — the S14 preconnect's post-deploy measurement)
  OR a Google API key for the CrUX API.
- **The Workers Paid plan ($5/mo)** — the durable fix for the KV read-quota
  exhaustion + the 10ms CPU cliff + the prerequisite for any future `/en/`
  URL architecture + the GA4 budget priority.
- **The S24 per-route CPU via GraphQL** — the aggregate supplied this session;
  the per-route breakdown needs the Workers Logs or the per-route labeling.
- **The S14 Cloudflare beacon extension to SEO pages** (the GA4 alternative) —
  extend the cookieless beacon to the SEO pages (one-line, freeze-safe) IF the
  owner wants the per-page-class RUM WITHOUT the GA4 consent burden.
- **The S13 Rich Results Test manual re-run** — the owner re-runs it manually.
- **S26 (UI/UX iteration):** hero rendering, nav UX, FAQ discoverability,
  schedule density, telegram CTA (S06-H4 belongs here).
- **S10-2 (the homepage → team/competition spec §9 gap):** the homepage does
  NOT link directly to `/teams/<slug>` or `/competitions/<slug>` — a future
  "link placement" change (touches the shared homepage renderers with visual
  side-effects).
- **S25 follow-up smokes:** NVDA/VoiceOver + Safari/Firefox/Edge live
  confirmations (owner sessions needed).
- **C8 client-side staleness vector (Session 4):** the
  `/api/public-matches` zone-edge HIT stamp (`max-age=14400`) is
  browser-honored on the poll path — client-side fix or zone Cache Rule.
- **Season-end lifecycle first run (Session 5):** the mechanism is shipped +
  test-proven but INERT. The first real transition is a May 2027 decision
  (after the 2026-27 season closes).
- **Nov 20 (S27 option B):** the auto-verify workflow fires around
  Bayern–Köln (`sched_next_ko: 2026-11-20T19:30:00.000Z`); the owner re-fires
  the M1/M2 window sessions per the S27-cont record.
- **The S12 EN re-litigation gate (FINAL):** a future session that wants to
  build `/en/` URLs must re-litigate ALL THREE evidence axes (English-query
  demand in a fresh 16-month GSC export + a Workers Paid plan in place + a
  demonstrated competitive angle against the English-native publishers).

## SEO program state (the 15-session track — COMPLETE)

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
Session 14 ✅ Completed / deployed (2026-11-17) — the mobile performance + the GSC monitoring + the optional GA4 decision: **the preconnect to crests.football-data.org IMPLEMENTED on the homepage + the SEO page shell (freeze-safe — the S24-P2 item); the S24-P1 hero-lazy REJECTED (the hero is the LCP with `fetchpriority="high"` + a preload); the GA4 DEFER (the consent/perf prerequisites not met; the Cloudflare Web Analytics cookieless RUM is already installed); the GSC monitoring view (the per-page-class markdown report + the cadence + the GSC filter instructions)**. The new `check-seo-performance.js` gate (17 gates). Version bump 13.267.0 → 13.268.0; npm test 3,720 → 3,738 OK. Deployment `a4cc2982…` @100%.
Session 15 ✅ Completed, docs-only, no deploy (2026-11-17) — **the final regression + the production QA + the handoff — the 15-session SEO program CLOSE-OUT.** The regression is CLEAN: all 19 sampled HTML pages + the 4 machine files return 200 with the correct SEO contracts; all 56 check scripts pass (3,738 OK; `npx tsc --noEmit` clean); no unsupported live/broadcast claims; no unselected club page indexable (4 slugs verified noindex,follow); the byte-frozen surfaces unchanged (git clean — the session runs before Dec 9, the freeze HOLDS); the Cloudflare budget healthy (`ok:true` + `pool_matches:324` + `kv_writes_day:403` + `subreq_last_tick:31`); the Workers Analytics GraphQL confirms the chronic C7 10ms CPU cliff (4,832 exceededResources over Nov 16-17 — NOT caused by the SEO program, zero Worker CPU added). No deploy — the live deployment `a4cc2982…` @100% = `13.268.0-perf-preconnect` STAYS. Deliverables: the `seo-implementation/FINAL-SEO-IMPLEMENTATION-REPORT.md` + the `seo-implementation/session-reports/SESSION-15.md` + the completed tracker + the ROUTE-AND-CANONICAL-PLAN §10 Session 15 row + the "project complete" handoff. **The 15-session SEO program is COMPLETE. There is no Session 16.**

Progress source of truth: `sportsignal-seo-implementation/IMPLEMENTATION-TRACKER.md`
(the Session 15 row). The full-program report:
`seo-implementation/FINAL-SEO-IMPLEMENTATION-REPORT.md`. The "project
complete" handoff: `seo-implementation/next-session-prompt.md`.

**Credentials used, not stored.** The owner should rotate the GitHub +
Cloudflare tokens (they were used across Sessions 14 + 15).
