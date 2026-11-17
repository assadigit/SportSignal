# FINAL SEO Implementation Report — SportSignal (the 15-session program close-out)

> Agents: read AGENTS.md in the repo root first, and follow it for this whole task.

- **Program:** the 15-session SportSignal SEO implementation program
  (`sportsignal-seo-implementation/` — the spec pack; `seo-implementation/`
  — the working tree).
- **Period:** 2026-11-16 → 2026-11-17 (Sessions 1-15).
- **Final session:** Session 15 — the final regression + the production QA +
  the handoff (2026-11-17; docs-only; no deploy — the regression is clean).
- **Live production:** `https://sportsignal.ir` (Worker `ucl-notifier`;
  versioned deploys only). Current deployment
  `a4cc2982-c6fa-493f-907b-e71d89c1f33f` @100% = `13.268.0-perf-preconnect`
  (Session 14; UNCHANGED by the docs-only S15 regression).
- **Status: the 15-session SEO program is COMPLETE.** The route plan §10
  sequencing (Sessions 1-15) is DONE. The residual work is owner-driven
  follow-ups (the post-Dec-8 GSC measurement + the Workers Paid plan + the
  CrUX data + the freeze-lift byte decisions) — NOT a further implementation
  session.

## 1. The 15-session summary

The program delivered a full technical-SEO + on-page-SEO + structured-data +
performance + monitoring build-out on a Cloudflare Worker (TypeScript, zero
framework, SSR HTML from KV). Every change was budget-aware (the Cloudflare
free-tier guardrails: KV writes ≤ 1,000/day, ~50 subrequests/tick, the 10ms
CPU cliff) + freeze-aware (the Dec 4-8 GSC-measured-surface freeze). The
program never fabricated data (the S-05 no-invented-data rule), never claimed
unsupported live/broadcast offers (the S-04 no-fake-offers law), and never
touched the byte-frozen title/H1/description/answer-sentence bytes during the
freeze window.

| # | Session | Outcome | Deploy / version | Test count |
|---:|---|---|---|---:|
| 1 | Repository + production + technical-SEO audit | audit + docs; pipeline-verification deploy of byte-identical code | `c97ae70b` @100% (`13.259.1-archttl`) | baseline (3,615) |
| 2 | Keyword research validation + expansion | docs-only; 369-phrase validated map; the 13-club correction | none | 3,615 |
| 3 | Keyword-to-URL architecture (the approved blueprint) | docs-only; the route plan + the matrix + the C1 disposition | none | 3,615 |
| 4 | Technical crawl/index foundation (C1/C6/C8) | the teams.xml 87→13 filter + the non-selected-team noindex,follow + the non-prod x-robots-tag | `7d92e633` @100% (`13.260.1-teamidx`) | 3,628 |
| 5 | Match-URL lifecycle mechanism (INERT) | the season-end noindex mechanism shipped + test-proven but INERT (flag false + empty dates) | `1d70129b` @100% (`13.261.0-matchlife`) | 3,652 |
| 6 | Homepage one-month window + carousel crawlability + curated-selection promise | the 92→30 DISPLAY split; the hero-card anchor href; the sr-only curated-selection paragraph; the homepage title/H1 frozen | `7df40334` @100% (`13.262.0-homepage`) | 3,675 |
| 7 | Match-detail footer-hook team-link gating + metadata audit | the selected-team-only crawlable footer-hook link; the og:type audit | `3e3a65e7` @100% (`13.263.0-matchlinks`) | 3,676 |
| 8 | Selected-club team-page @graph WebPage node + the check-seo-teampages.js gate | the team-page WebPage + SportsTeam @graph | `b313aada` @100% (`13.264.0-teampages`) | 3,685 |
| 9 | Competition-page @graph CollectionPage node + date-hub/empty-state verification + the check-seo-competitionpages.js gate | the competition-page CollectionPage + SportsOrganization @graph | `fc07b557` @100% (`13.265.0-competitions`) | 3,694 |
| 10 | /teams index tile ordering — the 13 selected clubs first + the check-seo-internallinks.js gate | the selected-clubs-first sort (presentation-layer, the raw generator unchanged) | `12793863` @100% (`13.266.0-internallinks`) | 3,704 |
| 11 | Persian entity-naming/metadata polish (spelling-freeze-aware) | the og:type=article on the 3 detail page types + the SEO_EXTRA_ALIASES map (the Barcelona «بارسا» alias) + the TEAM_SLUGS no-op + the check-seo-persian-entities.js gate | `21efcee2` @100% (`13.267.0-persian-entities`) | 3,720 |
| 12 | EN architecture + hreflang decision — Option (b), FINAL | docs-only; the single-language stance is FINAL (zero English-query demand + the 2× KV-read/CPU cost not justified + the EN SERP saturated) | none (stays `21efcee2`) | 3,720 |
| 13 | Structured-data + GSC enhancement validation | docs-only; the 13 "Missing field location" GSC Critical items + the 4 non-critical issue types are ALL the honest "missing recommended field" class; the MISSING-IS-NOT-ZERO law holds; the SportsEvent JSON-LD is schema.org-VALID | none (stays `21efcee2`) | 3,720 |
| 14 | Mobile performance + GSC monitoring + optional GA4 | the preconnect to crests.football-data.org (freeze-safe); the S24-P1 hero-lazy REJECTED; the GA4 DEFER; the GSC monitoring view; the check-seo-performance.js gate | `a4cc2982` @100% (`13.268.0-perf-preconnect`) | 3,738 |
| 15 | Final regression + production QA + handoff | docs-only; the regression is CLEAN (no bug found; no deploy); the 15-session program close-out | none (stays `a4cc2982`) | 3,738 |

**The deploy chain (rollback order):** `a4cc2982` (S14, 13.268.0) → `21efcee2`
(S11, 13.267.0) → `12793863` (S10, 13.266.0) → `fc07b557` (S9, 13.265.0) →
`b313aada` (S8, 13.264.0) → `3e3a65e7` (S7, 13.263.0) → `7df40334` (S6,
13.262.0) → `1d70129b` (S5, 13.261.0) → `7d92e633` (S4, 13.260.1) → `c97ae70b`
(S1, 13.259.1 — byte-identical) → earlier. Rollback = `npx wrangler rollback`.

## 2. The per-page-class verification matrix (the Session 15 live regression)

All URLs sampled live against `https://sportsignal.ir` on 2026-11-17. Every
page returns HTTP 200 + the correct canonical + the correct robots + the
title/H1/description + the JSON-LD + the S14 preconnect + ZERO hreflang. The
full matrix is in `seo-implementation/session-reports/SESSION-15.md` §3.

| Page class | HTTP | Robots | JSON-LD primary `@type` | hreflang | Preconnect |
|---|---:|---|---|:---:|:---:|
| Homepage (`/`) | 200 | index,follow | CollectionPage + WebSite + Organization + ItemList | 0 | yes |
| Match — with-venue | 200 | index,follow | SportsEvent (+ `location: Camp Nou`) + SportsTeam + SportsOrganization + WebPage + BreadcrumbList | 0 | yes |
| Match — no-venue | 200 | index,follow | SportsEvent (**no location** — MISSING-IS-NOT-ZERO) + SportsTeam + WebPage + BreadcrumbList | 0 | yes |
| Match — expired (archive) | 200 | index,follow | SportsEvent (+StadiumOrArena) + SportsTeam + WebPage + BreadcrumbList | 0 | yes |
| Selected team | 200 | index,follow | WebPage + SportsTeam + BreadcrumbList + ItemList | 0 | yes |
| Non-selected team (×4 slugs) | 200 | **noindex, follow** | SportsTeam + WebPage + BreadcrumbList | 0 | yes |
| Core competition | 200 | index,follow | CollectionPage + SportsOrganization + BreadcrumbList + ItemList | 0 | yes |
| Non-core competition | 200 | index,follow | CollectionPage + SportsOrganization + BreadcrumbList + ItemList | 0 | yes |
| Date hub (today/tomorrow) | 200 | index,follow | CollectionPage + FAQPage + Question + Answer | 0 | yes |
| Weekly (this-week/this-weekend) | 200 | index,follow | CollectionPage (+ FAQPage on this-week) | 0 | yes |
| Matches hub (`/matches`) | 200 | index,follow | CollectionPage | 0 | yes |
| Teams index (`/teams`) | 200 | index,follow | CollectionPage (13 selected clubs lead the tile order) | 0 | yes |
| Competitions index (`/competitions`) | 200 | index,follow | CollectionPage | 0 | yes |
| Pagination (`/matches?page=2`) | 200 | index,follow | CollectionPage (self-canonical `?page=2`) | 0 | yes |
| `/robots.txt` | 200 | — | — | — | — |
| `/sitemap.xml` | 200 | — | 5 sub-sitemaps | — | — |
| `/sitemaps/teams.xml` | 200 | — | **exactly 13 rows** (the selected clubs only) | — | — |
| `/sitemaps/competitions.xml` | 200 | — | 7 rows | — | — |

**The laws re-confirmed live:**

- **The MISSING-IS-NOT-ZERO law** (S13): the with-venue match emits
  `location: Camp Nou` (StadiumOrArena); the no-venue match correctly OMITS
  `location`. No `endDate`/`offers`/`aggregateRating`/`performer` fabricated.
- **The 13-club allowlist + the C1 disposition** (S4): the teams.xml =
  exactly 13 rows; 4 non-selected team slugs verified `noindex, follow`.
- **The /teams tile ordering** (S10): the 13 selected clubs lead, then the
  non-selected clubs.
- **The ZERO hreflang stance** (S12 — FINAL, Option (b)): every page ships
  zero hreflang; the router has no `/en/` branch; every page ships
  `<html lang="fa" dir="rtl">` + `og:locale=fa_IR`.
- **The no-fake-offers / no-invented-data law** (S-04/S-05): zero live-
  broadcast claims on the match page; zero fabricated `offers`.
- **The S14 preconnect** (freeze-safe): present on the homepage + every SEO
  page shell (match/team/competition/hubs) — a client-side hint, zero Worker
  CPU.
- **The GA4 DEFER** (S14): no `gtag()` / no GA4 measurement ID; the
  Cloudflare Web Analytics cookieless RUM is on the homepage.

## 3. The Cloudflare resource state (the Session 15 close)

- **`/healthz` (2026-11-17):** `ok:true` + `pool_matches:324` +
  `kv_writes_day:403` (of 1,000) + `degraded:false` + `subreq_last_tick:31`
  + `version:13.268.0-perf-preconnect`. **The KV read quota is healthy**
  (ok:true + pool_matches:324 + the entity-name + structured-data surfaces
  populated).
- **The Workers Analytics GraphQL (Nov 16-17):** `success` = 22,359
  invocations; `exceededResources` = 4,832 (the chronic C7 10ms CPU cliff —
  avg ~11ms CPU each; NOT caused by the SEO program — zero Worker CPU added
  across S4-S14); `clientDisconnected` = 40.
- **The cron triggers:** `*/10 * * * *` + `27 */4 * * *` (unchanged).
- **The budget verdict:** the SEO program added zero new KV write paths,
  zero new per-request fetches, zero new Worker CPU, zero new cron paths.
  Every change was metadata / preconnect / docs. The Cloudflare free-tier
  guardrails are respected.

## 4. The byte-frozen surfaces (the Dec 4-8 freeze — HOLDS at S15)

Session 15 runs before Dec 9 (2026-11-17). The freeze HOLDS. The byte-frozen
surfaces are UNCHANGED (`git status` clean — docs-only session):

- the homepage title/H1 (S6);
- the match-page title/H1/description/answer-sentence (S7);
- the team-page title/H1/description/answer (S8);
- the competition-page title/H1/description/answer (S9);
- the date-hub empty-state copy on `/matches/tomorrow` (S06-H3);
- the team-name spellings in `fa-dict.ts` (the S1 M2 F3 fix — mid-measurement,
  judge ~Dec 8).

The S11 freeze-safe changes (og:type=article + SEO_EXTRA_ALIASES +
TEAM_SLUGS no-op) stay durable. The S12/S13/S14 decisions STAY.

## 5. The residual backlog (the owner-driven follow-ups)

These are NOT a further implementation session — they are owner-driven
follow-ups (the post-Dec-8 freeze-lift decisions + the measurement requests +
the infrastructure decisions). The program's implementation work is complete.

### 5.1 The post-Dec-8 freeze-lift decisions (the byte-frozen surfaces)

After Dec 8, with a fresh 16-month GSC export, the owner may revisit:

- **S2 title-test re-fire** — re-fire the title test on/after Dec 4 with the
  fresh GSC export (the frozen-surface byte decisions: S09-3, S08, S07-H2,
  S06-H2).
- **S06-H3 follow-up** — the date-hub empty-state copy on `/matches/tomorrow`
  (the frozen source bytes are intact; the post-Dec-8 decision).
- **S1 spelling-fix judgement** — the S1 M2 F3 fa-dict spelling fix is LIVE
  and mid-measurement; judge ~Dec 8 (keep or revert based on the GSC data).
- **S11 SEO_EXTRA_ALIASES extension** — add NEW GSC-observed Persian variants
  as further `SEO_EXTRA_ALIASES` entries (every alias cites its GSC evidence
  per the S-05 rule).
- **S13-1 option (c) Events rich-result eligibility revisit** — IF the owner
  wants to pursue the Events rich-result snippet (which would require
  `location` on the no-venue matches), evaluate a curated, per-entry-verified
  stadium-lookup (the `src/grounds.ts` home-ground table extended to cover
  the no-venue matches' home teams, OR a Wikidata sameAs stadium lookup) —
  ONLY where a true venue value exists + the provenance is verified per entry.
  NEVER fabricate.

### 5.2 The measurement + infrastructure requests

- **The fresh 16-month GSC export** (the post-Dec-8 measurement) — the
  program's top evidence request; validates the full-program regression (the
  page-class performance after Sessions 4-14). The GSC monitoring view
  (`seo-implementation/GSC-MONITORING-VIEW.md`) defines the cadence + the
  filter instructions.
- **The CrUX / PageSpeed Insights data** for sportsignal.ir (the mobile
  LCP / INP / CLS per URL class — the S14 preconnect's post-deploy
  measurement) OR a Google API key for the CrUX API.
- **The Workers Paid plan ($5/mo)** — the durable fix for the chronic KV
  read-quota exhaustion (100,000/day free-plan → 1M reads/day paid) AND the
  10ms CPU cliff (10ms free → 30s paid) AND the prerequisite for any future
  `/en/` URL architecture (the S12-1 axis 2) AND the GA4 budget priority
  (the S14-3 decision).
- **The S24 per-route CPU via GraphQL** (the remaining S24 item) — the owner
  should supply the Workers Analytics access OR the GraphQL query result (the
  `workersInvocationsAdaptive` — supplied this session at the aggregate level;
  the per-route breakdown needs the `workersInvocationsAdaptive` grouped by
  request URL, which requires the Workers Logs or the per-route labeling).
- **The S14 Cloudflare beacon extension to SEO pages** (the GA4 alternative)
  — the homepage ships the Cloudflare Web Analytics cookieless beacon; the
  SEO pages (`src/seo/page-shell.ts`) do NOT. A future session could extend
  the beacon to the SEO pages (one-line `<script>` in the `pageShell` head —
  cookieless, deferred via `type="module"`, freeze-safe) IF the owner wants
  the per-page-class RUM WITHOUT the GA4 consent burden. This is the
  recommended path per `docs/specs/GA4-EVALUATION.md` §6.
- **The S13 Rich Results Test manual re-run** — the owner should re-run it
  manually (in a non-automated browser) on the representative pages.

### 5.3 The product + UX follow-ups

- **S26 (UI/UX iteration):** hero rendering, nav UX, FAQ discoverability,
  schedule density, telegram CTA. **S06-H4 (the visible curation copy)
  belongs here or in a dedicated UI round.**
- **S10-2 (the homepage → team/competition spec §9 gap):** the homepage does
  NOT link directly to `/teams/<slug>` or `/competitions/<slug>`. Closing it
  is a "link placement" change that touches the shared homepage
  standings/cups renderers (`markup.ts`) with visual side-effects.
- **S25 follow-up smokes:** NVDA/VoiceOver + Safari/Firefox/Edge live
  confirmations (owner sessions needed).
- **C8 client-side staleness vector (Session 4):** the
  `/api/public-matches` zone-edge HIT stamp (`max-age=14400`) is
  browser-honored on the poll path — client-side fix or zone Cache Rule;
  owner decision.
- **Season-end lifecycle first run (Session 5):** the mechanism is shipped +
  test-proven but INERT. To enable: confirm FD `season.endDate` values →
  populate `SEASON_END_DATES` → set `SEASON_END_NOINDEX_ENABLED = true` →
  versioned deploy → verify live. The first real transition is a May 2027
  decision (after the 2026-27 season closes).
- **Nov 20 (S27 option B):** the auto-verify workflow fires around
  Bayern–Köln (`sched_next_ko: 2026-11-20T19:30:00.000Z`); the owner re-fires
  the M1/M2 window sessions per the S27-cont record.

### 5.4 The S12 EN re-litigation gate (FINAL — only if all three axes flip)

A future session that wants to build `/en/` URLs must re-litigate ALL THREE
evidence axes: (1) English-query demand in a fresh 16-month GSC export; (2) a
Workers Paid plan in place (the 2× KV-read demand); (3) a demonstrated
competitive angle against the English-native publishers (BBC Sport, ESPN, the
league-official sites, Flashscore, Sofascore). The keyword map §2 English plan
slots stay as the documented Option (a) contingency.

## 6. The future monitoring calendar

### 6.1 The GSC monitoring cadence (the `seo-implementation/GSC-MONITORING-VIEW.md`)

- **Weekly** — the top 4 page classes (the homepage, the match-detail, the
  selected-team, the competition). The URL-pattern × the
  clicks/impressions/CTR/position. Filter instructions per page class in the
  monitoring view.
- **Monthly** — the full snapshot (all 412+ URLs). The device breakdown
  (Mobile = 94.8% of clicks) + the country breakdown (Iran = 98.4% of clicks).
- **Post-Dec-8** — the freeze-lift measurement. A fresh 16-month GSC export
  (the program's top evidence request) compared against the 2026-11-15
  baseline (250 clicks / 9,465 impressions / 412 URLs). **Compare equivalent
  windows + note seasonality. Do NOT attribute changes to an algorithm update
  without evidence (the spec §11).**

### 6.2 The post-Dec-8 freeze-lift decision calendar

| Date | Decision | Evidence needed |
|---|---|---|
| ~Dec 8 | the S1 spelling-fix judgement (keep or revert the fa-dict M2 F3 fix) | the GSC data for the affected team-name queries |
| Dec 9+ | the S2 title-test re-fire (the frozen-surface byte decisions: S09-3, S08, S07-H2, S06-H2) | the fresh 16-month GSC export |
| Dec 9+ | the S06-H3 date-hub empty-state copy decision | the GSC data for `/matches/tomorrow` |
| Dec 9+ | the S11 SEO_EXTRA_ALIASES extension (new GSC-observed Persian variants) | the fresh GSC export |
| Dec 9+ | the S13-1 option (c) Events rich-result eligibility revisit | the owner's desire for the Events snippet + the curated stadium-lookup |

### 6.3 The standing health checks (every session / every deploy)

- the live `/healthz` (`ok:true` + `pool_matches:324` + `degraded:false` +
  `version` = the deployed version);
- the KV read quota (100,000/day free-plan — was exceeded daily at S5-S9;
  healthy at S10-S15 close — investigate the read-source; the Workers Paid
  plan is the durable fix);
- the KV writes (`kv_writes_day` < 1,000);
- the subrequests (`subreq_last_tick` ~31, well under the ~50/tick budget);
- the 10ms CPU cliff (the Workers Analytics GraphQL — the chronic C7 state);
- the cron triggers (`*/10 * * * *` + `27 */4 * * *`);
- the sitemap integrity (`/sitemaps/teams.xml` = exactly 13 rows);
- the non-selected team noindex,follow disposition (the C1 law).

## 7. The acceptance criteria (the phase file)

- **All changes have commit/push/deploy evidence** — Session 15 is docs-only
  (the FINAL-SEO-IMPLEMENTATION-REPORT.md + the SESSION-15 report + the
  tracker Session 15 row + the HANDOFF/CHANGELOG/DECISIONS updates + the
  route plan §10 Session 15 row + the "project complete" handoff). The commit
  is `seo(s15): …`; the push is the one-shot token push (ls-remote verified).
  No deploy (docs-only — the regression is clean).
- **No known Critical regression** — the regression is CLEAN. All 19 HTML
  pages + the 4 machine files return 200 with the correct SEO contracts. All
  56 check scripts pass (3,738 OK; `npx tsc --noEmit` clean). No unsupported
  live/broadcast claims. No unselected club page is indexable. The byte-frozen
  surfaces are unchanged.
- **Unresolved data/access limits documented** — the fresh 16-month GSC
  export (NOT supplied); the CrUX / PageSpeed Insights data (NOT supplied —
  the structural analysis is the fallback); the Rich Results Test manual
  re-run (owner action); the Workers Paid plan (owner decision); the S24
  per-route CPU via GraphQL (the aggregate supplied this session; the
  per-route breakdown needs the Workers Logs).
- **Production verification results are factual** — every claim in this
  report is verified live (the §2 matrix + the §3 resource state + the §4
  freeze verification) or explicitly marked as NOT supplied / NOT claimed.

## 8. The program close-out

The 15-session SportSignal SEO implementation program is COMPLETE. The route
plan §10 sequencing (Sessions 1-15) is DONE. The implementation work
delivered:

- the crawl/index foundation (C1/C6/C8 — the 13-club allowlist + the
  non-selected-team noindex,follow + the non-prod x-robots-tag);
- the match-URL lifecycle mechanism (INERT — the May 2027 decision);
- the homepage one-month window + carousel crawlability + curated-selection
  promise;
- the match-detail footer-hook team-link gating;
- the team-page @graph WebPage node + the competition-page @graph
  CollectionPage node;
- the /teams index tile ordering (the 13 selected clubs first);
- the Persian entity-naming/metadata polish (og:type=article +
  SEO_EXTRA_ALIASES);
- the EN architecture decision (FINAL — Option (b): the single-language
  stance);
- the structured-data validation (the MISSING-IS-NOT-ZERO law; the SportsEvent
  JSON-LD is schema.org-VALID);
- the mobile-performance preconnect (freeze-safe) + the GSC monitoring view +
  the GA4 DEFER + the GA4 evaluation.

The residual work is owner-driven (the post-Dec-8 freeze-lift decisions + the
measurement requests + the Workers Paid plan + the product/UX follow-ups).
These are NOT a further implementation session. The "project complete" handoff
is delivered in `seo-implementation/next-session-prompt.md`.

**Credentials used, not stored.** The owner should rotate the GitHub +
Cloudflare tokens (they were used across Sessions 14 + 15).
