# SEO Program Session 15 — Final Regression, Production QA and Handoff

> Agents: read AGENTS.md in the repo root first, and follow it for this whole task.

- **Date:** 2026-11-17
- **Version shipped:** none (docs-only — the regression is clean; the live deployment `a4cc2982-c6fa-493f-907b-e71d89c1f33f` @100% = `13.268.0-perf-preconnect` from Session 14 STAYS).
- **Live before:** `13.268.0-perf-preconnect` (Session 14, deployment `a4cc2982-c6fa-493f-907b-e71d89c1f33f` @100%).
- **Status:** Completed (docs-only; no deploy by design — the regression surfaced NO bug). The 15-session SEO program close-out.
- **Freeze status:** the session runs BEFORE Dec 9 (2026-11-17). The Dec 4-8 measurement freeze HOLDS — the regression is read-only on the byte-frozen surfaces (verified unchanged; NOT touched).

## 1. Objective and scope

The final regression — the 15-session SEO program close-out (the route plan
§10 — the phase file
`sportsignal-seo-implementation/phases/SESSION-15-FINAL-QA-REGRESSION-AND-HANDOFF.md`).
The phase file's required work: (1) re-run all unit/integration/build/lint
tests; (2) crawl or sample all URL classes; (3) verify title, H1, meta
description, canonical, robots, hreflang, structured data, sitemap membership,
status code and crawlable links; (4) verify no unsupported live/broadcast
claims and no unselected club page has become indexable; (5) verify Cloudflare
resource consumption and no new unbounded provider requests/jobs; (6) verify
deployment and key production routes; (7) compare post-deploy GSC baseline only
after enough data has accumulated; (8) produce residual backlog and a future
monitoring calendar.

This session is the FINAL regression. The Dec 4-8 measurement freeze applies
to the GSC-measured surfaces (all title/H1 bytes + the team-name spellings +
the date-hub empty-state copy on `/matches/tomorrow`). **Session 15 runs
before Dec 9 — the freeze HOLDS — the regression is READ-ONLY on the
byte-frozen surfaces** (verify they are unchanged; do NOT touch them). The S12
EN architecture decision (FINAL — Option (b)), the S13 structured-data decision
(docs-only), and the S14 GA4 DEFER + preconnect STAY — Session 15 does NOT
re-litigate them.

## 2. The test suite — re-run (the baseline verification)

`npm install` (npm only, never `bun install`) → `npm test`:

- **`npx tsc --noEmit` — clean (exit 0).**
- **`npm test` — exit 0.** The OK count = **3,738** — byte-identical to the
  Session 14 baseline (the S14 count was 3,720 → 3,738 via the 17 new
  `check-seo-performance.js` gates + 1 updated parity baseline; Session 15
  added no new check script — the count is unchanged). The 56 check scripts
  all pass.
- The check chain (`package.json` `test`) ends with `check-seo-performance.js`
  (the S14 gate) — all 17 mobile-performance gates pass, including the
  preconnect-on-homepage + page-shell discipline, the no-crossorigin
  discipline, the S24-P1 hero-lazy REJECTION + the LCP `fetchpriority="high"`
  protection, the below-the-fold `loading="lazy"` discipline, the deferred JS
  bundle, the freeze-coordination gate, and the GSC monitoring view + GA4
  DEFER decision-record.

**No new check script was added this session** (the regression is read-only —
no code change to pin). The existing 56 check scripts (Sessions 1-14) already
pin every SEO contract the program established. This is the same discipline as
the docs-only S12 + S13 sessions.

## 3. The URL-class crawl — the per-page-class verification matrix

All URLs sampled live against `https://sportsignal.ir` on 2026-11-17. The
GSC monitoring view (`seo-implementation/GSC-MONITORING-VIEW.md`) is the
URL-class sampling guide. Every page returns HTTP 200 + the correct canonical +
the correct robots + the title/H1/description + the JSON-LD + the crawlable
links + the S14 preconnect. **ZERO hreflang on every page** (the S12 Option (b)
FINAL decision holds).

| Page class | URL sampled | HTTP | Canonical | Robots | JSON-LD `@type` | Preconnect | hreflang |
|---|---|---:|---|---|---|:---:|:---:|
| Homepage | `/` | 200 | `/` | index,follow | CollectionPage, WebSite, Organization, ItemList | yes | 0 |
| Match (with-venue) | `/matches/barcelona-vs-manchester-city-2026-12-08` | 200 | self | index,follow | SportsEvent (+`location: Camp Nou` StadiumOrArena), SportsTeam, SportsOrganization, WebPage, BreadcrumbList | yes | 0 |
| Match (no-venue) | `/matches/lazio-vs-lecce-2026-11-21` | 200 | self | index,follow | SportsEvent (**no location** — the MISSING-IS-NOT-ZERO law), SportsTeam, SportsOrganization, WebPage, BreadcrumbList | yes | 0 |
| Match (expired) | `/matches/arsenal-vs-leeds-united-2026-10-10` | 200 | self | index,follow | SportsEvent (+StadiumOrArena), SportsTeam, SportsOrganization, WebPage, BreadcrumbList | yes | 0 |
| Selected team | `/teams/barcelona` | 200 | self | index,follow | WebPage, SportsTeam, BreadcrumbList, ItemList | yes | 0 |
| Non-selected team | `/teams/fulham` | 200 | self | **noindex, follow** | SportsTeam, WebPage, BreadcrumbList | yes | 0 |
| Non-selected team | `/teams/leeds-united` | 200 | self | **noindex, follow** | SportsTeam, WebPage, BreadcrumbList | yes | 0 |
| Non-selected team | `/teams/le-havre` | 200 | self | **noindex, follow** | SportsTeam, WebPage, BreadcrumbList | yes | 0 |
| Non-selected team | `/teams/juventus` | 200 | self | **noindex, follow** | SportsTeam, WebPage, BreadcrumbList | yes | 0 |
| Core competition | `/competitions/champions-league` | 200 | self | index,follow | CollectionPage, SportsOrganization, BreadcrumbList, ItemList | yes | 0 |
| Non-core competition | `/competitions/dfb-pokal` | 200 | self | index,follow | CollectionPage, SportsOrganization, BreadcrumbList, ItemList | yes | 0 |
| Date hub (tomorrow) | `/matches/tomorrow` | 200 | self | index,follow | CollectionPage, FAQPage, Question, Answer, BreadcrumbList | yes | 0 |
| Date hub (today) | `/matches/today` | 200 | self | index,follow | CollectionPage, FAQPage, Question, Answer | yes | 0 |
| Weekly (this-week) | `/matches/this-week` | 200 | self | index,follow | CollectionPage, FAQPage | yes | 0 |
| Weekly (this-weekend) | `/matches/this-weekend` | 200 | self | index,follow | CollectionPage | yes | 0 |
| Matches hub | `/matches` | 200 | self | index,follow | CollectionPage | yes | 0 |
| Teams index | `/teams` | 200 | self | index,follow | CollectionPage (the 13 selected clubs lead the tile order) | yes | 0 |
| Competitions index | `/competitions` | 200 | self | index,follow | CollectionPage | yes | 0 |
| Pagination | `/matches?page=2` | 200 | self (`?page=2`) | index,follow | CollectionPage | yes | 0 |
| Machine: robots.txt | `/robots.txt` | 200 | — | — | — | — | — |
| Machine: sitemap index | `/sitemap.xml` | 200 | — | — | 5 sub-sitemaps (pages, competitions, teams, matches-upcoming, matches-archive) | — | — |
| Machine: teams sitemap | `/sitemaps/teams.xml` | 200 | — | — | **exactly 13 rows** (the selected clubs only — the Session 4 C1 filter) | — | — |
| Machine: competitions sitemap | `/sitemaps/competitions.xml` | 200 | — | — | 7 rows | — | — |

### 3.1 The structured-data verification — the SportsEvent contract (the S13 re-confirm)

The with-venue match (`/matches/barcelona-vs-manchester-city-2026-12-08`)
emits `"location":{"@type":"StadiumOrArena","name":"Camp Nou"}` — the venue IS
present where a true venue exists. The no-venue match
(`/matches/lazio-vs-lecce-2026-11-21`) correctly OMITS `location` — the
**MISSING-IS-NOT-ZERO law holds** (the `if (m.venue)` guard in
`src/seo/jsonld.ts:149-154` + the fail-closed `hydrateMatchVenue` in
`src/seo/data.ts:506-567`). Neither match emits `endDate`, `offers`,
`aggregateRating`, or `performer` (zero fabricated fields — the S-05
no-invented-data rule). The S13 structured-data decision (docs-only) is
re-confirmed live.

### 3.2 The hreflang verification — ZERO (the S12 Option (b) FINAL re-confirm)

Every sampled page ships ZERO `hreflang` link tags (the `grep -c hreflang`
count = 0 on all 19 HTML pages). The router (`src/seo/router.ts`) has no
`/en/` branch. Every page ships `<html lang="fa" dir="rtl">` +
`og:locale=fa_IR`. The EN/FA toggle is client-side only (the `?lang=en`
query). The S12 Option (b) FINAL decision holds.

### 3.3 The sitemap membership — the teams.xml 13-row filter (the S4 C1 re-confirm)

`/sitemaps/teams.xml` carries EXACTLY 13 URLs — the selected clubs only:
bayern-munich, manchester-city, borussia-dortmund, chelsea,
paris-saint-germain, arsenal, real-madrid, barcelona, liverpool,
manchester-united, ac-milan, internazionale-milano, club-atletico-de-madrid.
The non-selected team pages are absent from the sitemap AND carry
`noindex, follow` (verified on 4 distinct non-selected slugs: fulham,
leeds-united, le-havre, juventus). The Session 4 C1 disposition holds.

### 3.4 The crawlable links — the internal-links contract (the S10 re-confirm + the S10-2 gap note)

The homepage links to `/matches` (hub), `/competitions` (index), and many
`/matches/<slug>` URLs (the featured carousel + the big-matches box + the
standings). The `/teams` index links the 13 selected clubs FIRST (the tile
order matches the sitemap order — the S10 selected-clubs-first sort holds),
then the non-selected clubs. The match-detail pages link to the team pages
via the footer-hook team-link (the S7 gating — only the selected teams get a
crawlable team link; the non-selected teams get a plain-text name). **The
S10-2 documented gap holds: the homepage does NOT link directly to
`/teams/<slug>` or `/competitions/<slug>`** — this is a documented gap, NOT a
regression (the spec §9 lists "Homepage → ... selected competition sections
and selected team pages"; closing it is a future "link placement" change that
touches the shared homepage renderers with visual side-effects — a post-Dec-8
follow-up).

### 3.5 The expired-match lifecycle (the S5 INERT state re-confirm)

The expired match (`/matches/arsenal-vs-leeds-united-2026-10-10`, Oct 10) is
STILL indexable (`index, follow`) + still in `/sitemaps/matches-archive.xml`
(151 rows). This is the designed Session 5 INERT-lifecycle state: the
season-end noindex mechanism is shipped + test-proven but INERT (the
`SEASON_END_NOINDEX_ENABLED` flag is false + the `SEASON_END_DATES` map is
empty). The first real transition is a May 2027 decision (after the 2026-27
season closes). This is NOT a regression — it is the documented S5 state.

## 4. The no-live-broadcast-claims + the no-unselected-club-indexability verification

- **No unsupported live/broadcast claims** (the S-04 no-fake-offers +
  S-05 no-invented-data laws): a `grep` for `پخش زنده` / `watch live` /
  `live stream` / `پخش زنده رایگان` / `لایو رایگان` on the match page
  (`/matches/barcelona-vs-manchester-city-2026-12-08`) returns ZERO matches.
  No stream/watch/broadcast links are present. The match JSON-LD carries no
  `offers` field (zero fabricated ticket/broadcast offers). The law holds.
- **No unselected club page has become indexable** (the Session 4 C1
  disposition): 4 distinct non-selected team slugs (fulham, leeds-united,
  le-havre, juventus) all return `noindex, follow`. The `isSelectedTeam`
  predicate + the 13-club allowlist hold (`src/seo/data.ts` +
  `src/seo/files.ts`). The teams.xml 13-row filter holds. The law holds.

## 5. The Cloudflare resource consumption + the no-unbounded-provider-requests verification

- **The live `/healthz` (2026-11-17, session close):**
  `ok:true` + `pool_matches:324` + `kv_writes_day:403` (of the 1,000 free-plan
  write limit) + `kv_writes_web:201` + `degraded:false` +
  `subreq_last_tick:31` (the ~50/tick budget is respected) +
  `kv_ops_last_tick:31` + `sched_mode:IDLE` + `sched_reason:beyond-horizon` +
  `sched_feed_ok:true` + `sched_next_ko:2026-11-20T19:30:00.000Z` (the
  Bayern–Köln S27 auto-verify window — 3 days away; NOT today) +
  `version:13.268.0-perf-preconnect`. **The KV read quota is healthy**
  (ok:true + pool_matches:324 + the Persian + EN entity-name data surfaces +
  the structured-data surfaces are all populated — verified in §3). The
  quota was healthy at the Session 10/11 deploy + the Session 12/13/14 close;
  it stays healthy at the Session 15 close (no deploy — docs-only).
- **The KV write budget:** `kv_writes_day:403` of 1,000 (40.3% — well within
  the free-plan limit). The SEO program added zero new KV write paths
  (Sessions 4-14 were all metadata/preconnect/docs — the only KV writes are
  the cron ticks' pool refreshes, unchanged since the pre-SEO baseline).
- **The subrequest budget:** `subreq_last_tick:31` (the cron tick's
  subrequest total — fetches + KV ops — is ~31, well under the ~50/tick
  budget). The SEO program added zero new per-request fetches (the S14
  preconnect is a client-side hint — the Worker does NOT fetch).
- **The 10ms CPU cliff (the C7 chronic state):** the Cloudflare Workers
  Analytics GraphQL (`workersInvocationsAdaptive`, the Nov 16-17 window)
  returns: `success` = 22,359 invocations (cpuTimeUs = 490,258,414 total;
  subrequests = 1,491); `exceededResources` = 4,832 invocations
  (cpuTimeUs = 53,081,540 total; avg ~11ms CPU each — the 10ms cliff);
  `clientDisconnected` = 40. **This is the documented chronic C7 state** —
  the cold-render CPU exhaustion on the free plan's 10ms limit. **The SEO
  program added ZERO Worker CPU** (every S4-S14 change was metadata /
  preconnect / docs — the preconnect is a static `<link>` string in the HTML
  template, zero CPU). The CPU cliff is NOT caused by the SEO program; it is
  a pre-existing infrastructure issue. The durable fix is the Workers Paid
  plan ($5/mo → 30s CPU limit + 1M KV reads/day) — the same prerequisite as
  the S12-1 axis 2 (any future `/en/` URL architecture) + the S14-3 GA4
  budget priority.
- **The cron triggers:** `crons = ["*/10 * * * *", "27 */4 * * *"]`
  (`wrangler.toml`) — unchanged. No new cron paths were added by the SEO
  program.
- **The S14 preconnect budget (re-confirmed):** the preconnect adds ZERO
  runtime cost (zero new KV read, zero new KV write, zero new subrequest,
  zero new Worker CPU). The `/healthz` budget snapshot before/after the
  preconnect is unchanged (the preconnect is a client-side hint — the Worker
  emits the `<link>` in the HTML head; the browser MAY open the connection
  but the Worker does NOT fetch). The S14-1 freeze-safe decision holds.

## 6. The byte-frozen surfaces — the read-only freeze verification

Session 15 runs BEFORE Dec 9 (2026-11-17). **The Dec 4-8 freeze HOLDS.** The
regression is READ-ONLY on the byte-frozen surfaces:

- **`git status` is clean** — zero `src/` changes this session (the definitive
  proof: the byte-frozen source surfaces are untouched). Session 15 is
  docs-only (the deliverables are markdown reports — no `src/`, `scripts/`,
  or `assets/` change, no version bump, no deploy).
- The byte-frozen surfaces verified UNCHANGED (live crawl confirms the bytes
  match the documented frozen values):
  - the homepage title/H1 (Session 6) — live title
    «برنامه بازی‌های مهم فوتبال | تاریخ و ساعت شروع | اسپرت سیگنال» +
    the dynamic H1 «بازی بزرگ بعدی: لیورپول – منچستریونایتد»;
  - the match-page title/H1/description/answer-sentence (Session 7) — live
    on the Barcelona–Man City + Lazio–Lecce + Arsenal–Leeds matches;
  - the team-page title/H1/description/answer (Session 8) — live on
    `/teams/barcelona`;
  - the competition-page title/H1/description/answer (Session 9) — live on
    `/competitions/champions-league` + `/competitions/dfb-pokal`;
  - the date-hub empty-state copy on `/matches/tomorrow` (S06-H3) — the
    source bytes in `src/seo/pages.ts` are unchanged (git clean); the
    empty-state is not currently displayed (Nov 18 has matches), but the
    frozen source bytes are verified intact;
  - the team-name spellings in `fa-dict.ts` (the S1 M2 F3 spelling fix is
    LIVE and mid-measurement — judge ~Dec 8) — the source is unchanged (git
    clean).

The S11 freeze-safe changes (og:type=article + SEO_EXTRA_ALIASES +
TEAM_SLUGS no-op) stay durable (live: og:type=article confirmed on all 3
detail page types). The S12 EN decision (FINAL — Option (b)) stays. The S13
structured-data decision (docs-only) stays. The S14 preconnect (freeze-safe)
stays. The S14 GA4 DEFER stays (no GA4 installed).

## 7. The GSC baseline comparison — NOT claimed (the seasonality discipline)

The 2026-11-15 GSC export is the baseline (250 clicks / 9,465 impressions /
412 URLs; Mobile = 94.8% of clicks; Iran = 98.4% of clicks — the GSC
monitoring view §1). A FRESH 16-month GSC export (the post-Dec-8 measurement)
is the standing request — it would validate the full-program regression (the
page-class performance after Sessions 4-14). **The owner did NOT supply a
fresh GSC export this session.** Per the spec §11 ("Compare equivalent windows
and note seasonality. Do not attribute changes to an algorithm update without
evidence.") and the phase file's item 7 ("Compare post-deploy GSC baseline
only after enough data has accumulated; do not claim ranking improvements
immediately"), **no ranking improvement is claimed.** The GSC monitoring view
(`seo-implementation/GSC-MONITORING-VIEW.md`) defines the cadence (weekly for
the top 4 page classes, monthly for the full snapshot, post-Dec-8 for the
freeze-lift measurement) — the owner should run the post-Dec-8 measurement
after the freeze lifts.

The owner should ALSO supply, if accessible: the Chrome UX Report (CrUX) /
PageSpeed Insights data for sportsignal.ir (the mobile LCP / INP / CLS per
URL class — the S14 preconnect's post-deploy measurement); the Cloudflare
Workers Analytics (the `workersInvocationsAdaptive` GraphQL — supplied this
session: the CPU/subrequest/outcome per invocation, the 10ms CPU cliff).

## 8. Deliverables

- **`seo-implementation/FINAL-SEO-IMPLEMENTATION-REPORT.md`** — the full-program
  report (the 15-session summary + the per-session deploy/version/test-count
  chain + the per-page-class verification matrix + the residual backlog + the
  future monitoring calendar).
- **the completed tracker** (`sportsignal-seo-implementation/IMPLEMENTATION-TRACKER.md`
  — the Session 15 row).
- **residual risks/backlog** (in the FINAL-SEO-IMPLEMENTATION-REPORT.md §5 +
  the HANDOFF).
- **the "project complete" handoff** — Session 15 IS the final session (there
  is no Session 16). The residual work is the post-Dec-8 follow-ups (the
  freeze-lift decisions + the GSC post-Dec-8 measurement + the Workers Paid
  plan + the CrUX data) — these are owner-driven follow-ups, NOT a further
  implementation session. The `seo-implementation/next-session-prompt.md` is
  replaced with the "project complete" handoff.

## 9. Decisions

- **S15-1 — the final regression is CLEAN (no bug found; no deploy).** All 19
  sampled HTML pages + the 4 machine files return 200 with the correct SEO
  contracts. All 56 check scripts pass (3,738 OK; `npx tsc --noEmit` clean).
  No unsupported live/broadcast claims. No unselected club page is indexable
  (4 non-selected slugs verified noindex,follow). The byte-frozen surfaces
  are unchanged (git clean). The Cloudflare budget is healthy
  (`ok:true` + `kv_writes_day:403` + `subreq_last_tick:31`). No deploy
  (docs-only — the same discipline as S12 Option (b) + S13 docs-only). The
  live deployment `a4cc2982-c6fa-493f-907b-e71d89c1f33f` @100% =
  `13.268.0-perf-preconnect` STAYS.
- **S15-2 — the freeze-coordination (the session runs before Dec 9 — the
  freeze HOLDS; the regression is read-only on the byte-frozen surfaces).**
  The byte-frozen title/H1/description/answer-sentence bytes + the team-name
  spellings + the date-hub empty-state copy are ALL untouched (git clean). The
  S12/S13/S14 decisions STAY — Session 15 does NOT re-litigate them. The
  post-Dec-8 freeze-lift decisions (the S2 title-test re-fire, the S06-H3
  follow-up, the S1 spelling-fix judgement, the S11 SEO_EXTRA_ALIASES
  extension, the S13-1 option (c) Events rich-result eligibility revisit) are
  the residual backlog.
- **S15-3 — the 15-session SEO program is COMPLETE.** The route plan §10
  sequencing (Sessions 1-15) is DONE. The residual work is owner-driven
  follow-ups (the post-Dec-8 GSC measurement + the Workers Paid plan + the
  CrUX data + the freeze-lift byte decisions) — these are NOT a further
  implementation session. The "project complete" handoff is delivered.

## 10. What I checked (verification summary)

- `npm install` (npm only) → `npm test` exit 0 (**3,738 OK** — the S14
  baseline; `npx tsc --noEmit` clean; all 56 check scripts pass).
- The live `/healthz` (ok:true + pool_matches:324 + kv_writes_day:403 +
  degraded:false + version:13.268.0-perf-preconnect; the KV quota healthy).
- The live crawl of 19 HTML pages + 4 machine files (the §3 matrix) — every
  page 200 + the correct canonical/robots/title/H1/description/JSON-LD/
  preconnect + ZERO hreflang.
- The SportsEvent MISSING-IS-NOT-ZERO law (with-venue emits location; no-venue
  omits location; no endDate/offers/aggregateRating — the S13 re-confirm).
- The 13-club allowlist + the teams.xml 13-row filter + the /teams tile
  ordering (the S4/S10 re-confirm).
- The non-selected team noindex,follow disposition (4 slugs verified — the C1
  re-confirm).
- The no-live-broadcast-claims law (zero matches on the match page).
- The Cloudflare Workers Analytics GraphQL (the Nov 16-17 window: 22,359
  success + 4,832 exceededResources [the chronic C7 CPU cliff] + 40
  clientDisconnected — the SEO program added zero Worker CPU).
- The cron triggers (unchanged: `*/10 * * * *` + `27 */4 * * *`).
- The byte-frozen surfaces (git clean — the read-only freeze verification).
- `git status` clean (docs-only session; no `src/`/`scripts/`/`assets/`
  change).

## 11. What I could NOT check (the documented access limits)

- **The fresh 16-month GSC export** (the post-Dec-8 measurement) — NOT
  supplied by the owner this session. No ranking improvement is claimed (the
  spec §11 seasonality discipline). The GSC monitoring view defines the
  post-Dec-8 measurement cadence.
- **The CrUX / PageSpeed Insights data** for sportsignal.ir — NOT supplied
  (the PageSpeed Insights API was quota-blocked without a Google API key at
  S14; the CrUX API requires a Google API key). The structural analysis (the
  render path + the KV-read count + the CPU cliff) is the fallback — the
  Workers Analytics GraphQL (supplied this session) confirms the chronic 10ms
  CPU cliff.
- **The Rich Results Test manual re-run** (the S13 follow-up) — the owner
  should re-run it manually (in a non-automated browser) on the representative
  pages; the GSC Events report IS the batch Rich Results Test result (the S13
  evidence).

## 12. Cloudflare budget of this session

**Zero.** Session 15 is docs-only (no `src/`/`scripts/`/`assets/` change, no
version bump, no deploy). Zero new KV reads, zero new KV writes, zero new
subrequests, zero new Worker CPU, zero new cron paths. The live deployment
`a4cc2982-c6fa-493f-907b-e71d89c1f33f` @100% = `13.268.0-perf-preconnect`
STAYS (the Session 14 deploy — unchanged).
