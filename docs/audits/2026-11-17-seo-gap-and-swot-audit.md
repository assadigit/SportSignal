# SEO Gap Analysis + SWOT Audit — SportSignal (post-Session-15, the 15-session program close-out)

> Agents: read AGENTS.md in the repo root first, and follow it for this whole task.

- **Date:** 2026-11-17 (the day after the Session 15 final regression close-out).
- **Author:** the SEO implementation agent (a post-program audit, requested by the owner).
- **Scope:** a thorough, evidence-based gap analysis of what SHOULD have been implemented/improved during the 15-session SEO program but was NOT — plus a SWOT audit of the SportSignal SEO state. Every assertion is verified live (the 2026-11-17 crawl) or against the repo source, or explicitly marked as a strategic judgement.
- **Status of the program:** the 15-session SEO program is COMPLETE (Session 15 = the final regression; docs-only; the regression is clean). This audit is a post-program assessment — it does NOT re-open the program; it surfaces the gaps for the owner's post-Dec-8 decisions + the future follow-up sessions.
- **Freeze note:** this audit is documentation-only (no `src/`/`scripts/`/`assets/` change, no byte-frozen surface touched). The Dec 4-8 freeze holds (the session runs before Dec 9).

## 0. How to read this audit

The 15-session program was disciplined + budget-aware + freeze-aware. It delivered a
clean technical-SEO + on-page-SEO + structured-data + performance-hint + monitoring
build-out on a Cloudflare Worker free tier. The regression (Session 15) confirmed every
shipped contract holds live. **This audit is NOT a list of bugs or regressions — there
are none.** It is a list of (a) things the program explicitly chose NOT to do (with the
reason), (b) things the program deferred to post-Dec-8 (the residual backlog), and (c)
things the program did NOT address at all (the genuine blind spots — the most valuable
section). Each gap is prioritized P0 (critical / direct SEO harm) → P1 (high / a real
missed opportunity) → P2 (medium / a polish item) → P3 (low / a nice-to-have), with the
evidence + the reason it was not done + the recommended action.

---

## 1. The gap analysis (evidence-based, prioritized)

### P0-1 — The Core Web Vitals + the real performance impact are UNMEASURED (the #1 gap)

- **The gap:** the 15-session program never obtained real mobile CWV data (LCP / INP /
  CLS) per URL class. The PageSpeed Insights API was quota-blocked (no Google API key);
  the CrUX API requires a Google API key (not supplied). The program fell back to a
  "structural analysis" (the render path + the KV-read count + the CPU cliff). The S14
  preconnect was deployed on the structural analysis alone — without a before/after CWV
  measurement.
- **The evidence:** the Session 15 Workers Analytics GraphQL (Nov 16-17) shows
  **4,832 `exceededResources` invocations** (the 10ms CPU cliff) out of ~27,231 total =
  **~17.7% of all Worker invocations fail with CPU exhaustion**. On a mobile-first site
  (Mobile = 94.8% of clicks), a 17.7% request-failure rate almost certainly harms the
  real LCP/INP. **But this was never measured.** The program cannot claim a performance
  win — it can only claim a structural improvement.
- **Why it was not done:** the Google API keys were not supplied; the owner did not
  supply the CrUX / PageSpeed Insights data (the program's top evidence request across
  S14 + S15).
- **The SEO harm:** unmeasured ≠ unaffected. The 10ms CPU cliff means ~1 in 6 requests
  get terminated by Cloudflare. **When Googlebot hits a CPU-cliff-terminated page, it
  gets a failed response → the page may not be indexed, may be deindexed, or may be
  crawled less frequently.** This is a direct crawlability + indexability risk on the
  free plan. It is the single biggest SEO risk on the site.
- **The recommended action:** (a) the owner supplies the CrUX / PageSpeed Insights data
  for sportsignal.ir OR a Google API key for the CrUX API; (b) the owner upgrades to the
  Workers Paid plan ($5/mo → 30s CPU limit, eliminating the 10ms cliff) — this is the
  durable fix AND the prerequisite for any future `/en/` URL architecture AND the GA4
  budget priority; (c) a post-Dec-8 session measures the CWV before/after the preconnect
  + the paid-plan upgrade.

### P0-2 — The program's actual SEO IMPACT is UNVERIFIED (no before/after GSC)

- **The gap:** the program ran on a single 2026-11-15 GSC snapshot (250 clicks / 9,465
  impressions / 412 URLs). It NEVER obtained a fresh 16-month GSC export for the
  post-Dec-8 measurement. So the program cannot demonstrate that the 15 sessions moved
  the needle — the baseline was established but never compared against a
  post-implementation window.
- **The evidence:** the GSC monitoring view (`seo-implementation/GSC-MONITORING-VIEW.md`)
  defines the post-Dec-8 measurement cadence — but the measurement never ran. The
  Session 15 report explicitly states "no ranking improvement is claimed."
- **Why it was not done:** the fresh GSC export was the program's top evidence request
  across every session from S9 onward; the owner did not supply it. The Dec 4-8 freeze
  also delayed the post-implementation measurement (the byte-frozen surfaces could not
  be touched until Dec 9).
- **The SEO harm:** without the before/after, the owner cannot know which of the 15
  sessions' changes helped, hurt, or did nothing. The post-Dec-8 freeze-lift byte
  decisions (the S2 title-test, the S1 spelling-fix judgement, the S11 SEO_EXTRA_ALIASES
  extension) are BLOCKED on this data — deciding them blind risks undoing a working
  change OR keeping a failing one.
- **The recommended action:** the owner supplies the fresh 16-month GSC export (with the
  URL-level page samples + the queries×pages matrix + the enhancement/Critical-issues
  CSVs + the Core Web Vitals report) AFTER Dec 8. Compare against the 2026-11-15
  baseline per page class (the GSC monitoring view §1). **Compare equivalent windows +
  note seasonality (the spec §11).**

### P0-3 — The 10ms CPU cliff is CHRONIC + UNRESOLVED (direct crawlability harm)

- **The gap:** the C7 audit (2026-11-15) identified the 10ms CPU cliff on cold match
  renders. The S14 preconnect did NOT address it (it is a client-side hint — zero Worker
  CPU). The cliff persists: 4,832 `exceededResources` over Nov 16-17 (~17.7% of
  invocations). The durable fix (the Workers Paid plan) was identified but NOT pursued —
  it is a deferred owner decision.
- **The evidence:** the Workers Analytics GraphQL (the Session 15 close): `success` =
  22,359; `exceededResources` = 4,832 (avg ~11ms CPU each); `clientDisconnected` = 40.
- **Why it was not done:** the Workers Paid plan is an owner budget decision ($5/mo) —
  the agent cannot make it. The free-tier CPU limit (10ms) is a platform constraint the
  program could not engineer around (the render cost is the KV-read + the HTML-template
  assembly on cold cache misses).
- **The SEO harm:** Googlebot + the mobile users hit the cliff on ~1 in 6 requests. The
  failed responses harm the crawl rate, the indexation, and the CWV. **This is the
  highest-leverage unresolved SEO issue** — fixing it (the paid plan) would likely
  improve the indexation + the CWV more than any on-page change the program made.
- **The recommended action:** the owner upgrades to the Workers Paid plan ($5/mo). This
  is the durable fix for the CPU cliff + the KV-read quota + the prerequisite for any
  future `/en/` URL architecture + the GA4 budget priority. It is the single
  highest-ROI action the owner can take.

### P1-1 — The content depth is THIN (the Helpful Content System risk)

- **The gap:** the team/competition/match detail pages are primarily DATA-driven (fixture
  lists, standings, the answer-sentence) with minimal editorial body text. The measured
  visible-text volume: the team page ~2,983 chars / 2 `<p>` tags; the competition page
  ~6,395 chars / 2 `<p>`; the match page ~3 `<p>`. The homepage has ~22,406 chars but 0
  `<p>` + 0 `<section>` (it is the fixture data + the standings tables — data, not
  editorial prose).
- **The evidence:** the 2026-11-17 live crawl (`/teams/barcelona` = 2 `<p>` / 2,983
  chars; `/competitions/champions-league` = 2 `<p>` / 6,395 chars; the match page = 3
  `<p>`). The pages have the title/H1/description/JSON-LD + the fixture data, but the
  editorial body (the "why this match matters," the team's form, the head-to-head
  history, the competition's significance) is absent or minimal.
- **Why it was not done:** the program's scope was the technical-SEO + the on-page-
  metadata + the structured-data foundation. The content-depth audit was NOT a session
  objective (the route plan §10 did not include a "content depth" session). The
  byte-frozen surfaces (the title/H1/description/answer-sentence) were protected during
  the freeze — but the BODY content was never the program's focus.
- **The SEO harm:** Google's Helpful Content System (2023+) down-ranks pages "primarily
  designed for search engines" without "original content, reporting, research, or
  analysis." A fixture-data page with a thin editorial wrapper is exactly the profile at
  risk. The 412 URLs may be indexed but rank poorly because they lack the editorial
  substance that earns the ranking. **This is likely the #1 reason the site has only 250
  clicks / 9,465 impressions despite 412 indexed URLs** — the pages are technically
  correct but substantively thin.
- **The recommended action:** a post-Dec-8 content-depth session per page class: add a
  substantive editorial section to the team page (the team's season narrative, the form
  guide, the key players), the competition page (the competition's structure, the
  current standings narrative, the title race), the match page (the preview, the H2H
  history, the significance). This is the highest-leverage CONTENT action. It must be
  Persian, original, + E-E-A-T-grounded (cite the data source). **Do NOT touch the
  byte-frozen title/H1/description/answer-sentence bytes** — add the editorial body
  BELOW the existing answer-sentence.

### P1-2 — The match-page SportsTeam nodes are BARE (the entity-grounding inconsistency)

- **The gap:** on the match page, the two SportsTeam nodes (the home + away teams) carry
  `name` + `sport` + `url` + `alternateName` — but NO `sameAs` (no Wikipedia / Wikidata
  link). On the TEAM page, the same SportsTeam node IS enriched with `sameAs`
  (e.g., Barcelona → `https://en.wikipedia.org/wiki/FC_Barcelona` +
  `https://www.wikidata.org/wiki/Q7156`). The match page is the click-earner page type
  (the Barcelona–Man City match is the #1 GSC-observed URL) — the bare SportsTeam nodes
  there weaken the entity grounding on the highest-traffic page.
- **The evidence:** the 2026-11-17 live crawl of `/matches/barcelona-vs-manchester-city-2026-12-08`:
  the two SportsTeam nodes have NO `sameAs`; the match page has only 1 `wikidata`
  reference total (the competition's Q18756). The team page `/teams/barcelona` has the
  full `sameAs` (Wikipedia + Wikidata Q7156) on its SportsTeam node.
- **Why it was not done:** the program's structured-data work (S7-S13) added the
  SportsEvent + SportsTeam + SportsOrganization nodes per page, but the `sameAs`
  enrichment was applied inconsistently — the team page's own SportsTeam got the
  `sameAs` (the S11 Persian entity-naming pass), but the match page's SportsTeam nodes
  (emitted by the `sportsEventNode` builder in `src/seo/jsonld.ts`) did not. The S13
  structured-data validation focused on the SportsEvent `location` field, not the
  SportsTeam `sameAs` parity.
- **The SEO harm:** the entity grounding (the knowledge-graph reconciliation) is weaker
  on the match page — Google may not confidently link the match's teams to the
  knowledge-graph entities. The match page is the page type that earns the clicks; the
  weak grounding there is a missed rich-result + knowledge-panel opportunity.
- **The recommended action:** a post-Dec-8 session adds the `sameAs` (Wikipedia +
  Wikidata) to the match-page SportsTeam nodes, sourced from the same home-ground /
  entity table that the team page uses. Verify the parity across the team page + the
  match page. Add a `check-seo-entity-parity.js` gate. (Freeze-safe — the `sameAs` is a
  JSON-LD field, NOT a byte-frozen title/H1/description/answer byte.)

### P1-3 — NO visible breadcrumb navigation (machine-only BreadcrumbList)

- **The gap:** every detail page ships a `BreadcrumbList` JSON-LD node (machine-
  readable), but there is NO visible breadcrumb navigation in the HTML (no
  `aria-label="breadcrumb"`, no breadcrumb class, no visible `<nav>` with the trail).
  The breadcrumbs are invisible to users + to the visible-internal-link graph.
- **The evidence:** the 2026-11-17 live crawl — `grep` for `aria-label="breadcrumb"` /
  `class="[^"]*breadcrumb[^"]*"` returns nothing on the match/team/competition pages.
  The JSON-LD `BreadcrumbList` IS present (verified in the Session 15 regression).
- **Why it was not done:** the program's internal-linking work (S10) focused on the
  `/teams` index tile ordering + the match-detail footer-hook team-link gating. The
  visible breadcrumb was not a session objective.
- **The SEO harm:** (a) the user wayfinding is weaker (a user on a match page cannot
  click back to the competition or the hub via a breadcrumb); (b) the visible internal-
  link graph loses a clean, context-rich set of links (the breadcrumb trail is one of
  the highest-signal internal-link patterns); (c) Google's breadcrumb rich-result
  REQUIRES a visible breadcrumb (the JSON-LD alone is not enough — the rich-result
  validator checks for the visible markup).
- **The recommended action:** a post-Dec-8 session adds a visible breadcrumb `<nav
  aria-label="breadcrumb">` to the detail pages (match/team/competition), with the
  trail: homepage → hub → competition/team → match. The JSON-LD BreadcrumbList already
  exists — the visible nav should mirror it. (Freeze-safe — the breadcrumb is an
  additive nav element, NOT a byte-frozen title/H1/description/answer byte. It DOES add
  visible links, so the anchor wording must be diff-verified — but it is additive, not a
  change to existing bytes.)

### P1-4 — The expired matches stay INDEXABLE (the S5 INERT lifecycle — content decay)

- **The gap:** the match-URL lifecycle mechanism (S5) is shipped + test-proven but
  INERT (`SEASON_END_NOINDEX_ENABLED = false` + `SEASON_END_DATES` empty). The
  `/sitemaps/matches-archive.xml` carries 151 expired matches, ALL indexable (`index,
  follow`). The expired matches dilute the crawl budget + may cannibalize the
  upcoming-match pages (a past "Arsenal–Leeds" page vs. a future "Arsenal–Leeds" page).
- **The evidence:** the 2026-11-17 live crawl — `/matches/arsenal-vs-leeds-united-2026-10-10`
  (Oct 10, expired) returns 200 + `index, follow` + is in the archive sitemap (151 rows).
- **Why it was not done:** the S5 mechanism was intentionally shipped INERT — the
  activation requires the FD `season.endDate` values + a versioned deploy + the live
  verification. The first real transition was deferred to May 2027 (after the 2026-27
  season closes). The program judged the activation a season-end decision, not a
  mid-season one.
- **The SEO harm:** (a) 151 stale pages consume the crawl budget (Googlebot crawls +
  re-crawls them, wasting the budget on pages whose data is frozen); (b) the stale pages
  may cannibalize the fresh-match pages (the "Arsenal vs Leeds" query could return the
  past match instead of the upcoming one); (c) the stale pages' data (the final score,
  the past fixture) is correct but the page offers no ongoing value — a user landing on
  an expired match page from search has a poor experience.
- **The recommended action:** (a) the owner confirms the FD `season.endDate` values for
  the active competitions; (b) populate `SEASON_END_DATES`; (c) set
  `SEASON_END_NOINDEX_ENABLED = true`; (d) versioned deploy + verify live. **This does
  NOT require waiting until May 2027** — the expired matches from the 2025-26 season
  (already finished) could be noindexed NOW. The May 2027 date is for the CURRENT
  season's end; the PAST season's expired matches are already eligible.

### P1-5 — The pagination self-canonicalizes + stays indexable (the duplicate-content risk)

- **Gap:** `/matches?page=2` self-canonicalizes to `?page=2` + is `index, follow`. Each
  pagination page carries an overlapping slice of the match list. This creates
  near-duplicate content across the pagination series (page 1, page 2, page 3 share the
  same template + the same match tiles, just different slices).
- **The evidence:** the 2026-11-17 live crawl — `/matches?page=2` returns 200 +
  canonical `https://sportsignal.ir/matches?page=2` + `index, follow`.
- **Why it was not done:** the S2 pagination policy was "parked — needs a fresh GSC
  export" (the route plan §10). The program deferred the pagination decision to the
  post-Dec-8 data.
- **The SEO harm:** Google may treat the pagination series as duplicate / near-
  duplicate, diluting the ranking signal across the pages. The self-canonical is the
  "safe" choice (each page is its own canonical), but it does not consolidate the equity.
- **The recommended action:** the post-Dec-8 decision (with the fresh GSC data): either
  (a) keep the self-canonical + `index, follow` (the current state — defensible IF the
  pagination pages earn distinct impressions), OR (b) canonicalize the pagination to
  `/matches` (consolidate the equity — the common choice for a single list), OR (c)
  `noindex, follow` the pagination pages (keep the crawl but drop the indexation). The
  GSC data for the `?page=N` URLs will decide.

### P1-6 — NO FAQ structured data on the detail pages (the missed FAQ rich-result)

- **The gap:** the `FAQPage` + `Question` + `Answer` structured data exists ONLY on the
  date hubs (`/matches/today`, `/matches/tomorrow`, `/matches/this-week`). The detail
  pages (team/competition/match) have NO FAQ. The Persian query "بازی بعدی بارسلونا"
  (Barcelona's next match) is the #1 GSC-observed query pattern — a FAQ on the team page
  ("بازی بعدی بارسلونا کی است؟" → the next fixture) could capture the FAQ rich-result
  snippet.
- **The evidence:** the 2026-11-17 live crawl — `/teams/barcelona` has 0 `FAQPage`
  nodes. The date hubs have the FAQPage (verified in the Session 15 regression).
- **Why it was not done:** the FAQ structured data was added to the date hubs (S9) as
  part of the empty-state / date-page work. The detail-page FAQ was not a session
  objective.
- **The SEO harm:** the FAQ rich-result is one of the few rich-result types widely
  available for content sites (the Events rich-result is the S13-1 option (c) revisit —
  it requires `location` which the no-venue matches lack). The FAQ rich-result needs
  only real Q&A. The "بازی بعدی X" query pattern is high-demand + low-competition in
  Persian — a FAQ rich-result there could be a meaningful CTR win.
- **The recommended action:** a post-Dec-8 session adds the FAQPage structured data to
  the team page (the "next match" + "last result" + "the team's league" Q&A) + the match
  page (the "kickoff time" + "the venue" + "how to follow" Q&A — NEVER a "where to
  watch" Q that implies a broadcast). The Q&A must be real (not invented) + Persian.
  Add a `check-seo-faq.js` gate. (Freeze-safe — the FAQ is an additive JSON-LD node +
  the visible Q&A, NOT a byte-frozen title/H1/description/answer byte. The visible Q&A
  adds body content — which also addresses P1-1.)

### P2-1 — NO analytics on the SEO pages (the RUM is homepage-only)

- **The gap:** the Cloudflare Web Analytics cookieless beacon is installed on the
  HOMEPAGE only. The SEO pages (match/team/competition/hubs — the bulk of the 412 URLs)
  have NO analytics. GA4 is deferred (the S14-3 decision). So the program has NO
  per-page-class RUM — no page-view data, no engagement data, no per-page CWV field data
  for the 411 non-homepage URLs.
- **The evidence:** the Session 14 report — the beacon is on the homepage only; the SEO
  page shell (`src/seo/page-shell.ts`) does NOT include the beacon. The GA4 DEFER (S14-3)
  means no GA4 either.
- **Why it was not done:** the GA4 DEFER was the S14-3 decision (the CMP + the privacy
  policy + the performance budget prerequisites are not met). The Cloudflare beacon
  extension to the SEO pages was identified as the recommended GA4 alternative
  (`docs/specs/GA4-EVALUATION.md` §6) but was a documented follow-up, not a Session 14
  deliverable.
- **The SEO harm:** without the per-page RUM, the owner cannot measure which page class
  earns the engagement, which has the high bounce rate, which has the CWV issue. The GSC
  data shows the impressions/clicks but NOT the engagement/CWV. The measurement gap
  (P0-1 + P0-2) is compounded.
- **The recommended action:** extend the Cloudflare Web Analytics cookieless beacon to
  the SEO page shell (one-line `<script>` in the `pageShell` head — cookieless, deferred
  via `type="module"`, freeze-safe). This is the S14 recommended path — the per-page RUM
  WITHOUT the GA4 consent burden. (Freeze-safe — the beacon is a `<script>` in `<head>`,
  NOT a byte-frozen surface.)

### P2-2 — The sitemap lastmod dates are STALE on some URLs

- **The gap:** some upcoming matches in `/sitemaps/matches-upcoming.xml` have a `lastmod`
  of 2026-11-04 (13 days stale at the 2026-11-17 crawl) even though they are upcoming
  fixtures whose data may have changed (the kickoff time, the venue, the status). The
  stale lastmod understates the freshness signal to Googlebot.
- **The evidence:** the 2026-11-17 crawl of `/sitemaps/matches-upcoming.xml` — e.g.,
  `<loc>.../bayern-munich-vs-1-koln-2026-11-20</loc><lastmod>2026-11-04T19:46:00.943Z</lastmod>`
  (13 days stale for a match 3 days away).
- **Why it was not done:** the `lastmod` is written when the match row is first ingested
  (the cron tick's pool refresh). The program's `check-seo-lastmod.js` gate pins the
  lastmod discipline, but the gate may not enforce a freshness re-touch on the upcoming
  matches when the pool refreshes. The sitemap regeneration rides the cron tick.
- **The SEO harm:** Google uses the `lastmod` as a crawl-priority hint. A stale lastmod
  on an upcoming match means Googlebot may not re-crawl the page before the kickoff,
  missing a last-minute data change (a time change, a venue change). For a fixture site,
  the freshness signal is critical.
- **The recommended action:** a session reviews the `lastmod` write logic — the upcoming
  matches' lastmod should be refreshed when the pool tick detects a data change (the
  kickoff time, the venue, the status). Add a `check-seo-lastmod-freshness.js` gate.
  (Freeze-safe — the lastmod is a sitemap field, NOT a byte-frozen HTML surface.)

### P2-3 — The 74 non-selected team pages are a long-tail coverage trade-off

- **The gap:** the 13-club allowlist (the "curated" stance) means 74 team pages are
  `noindex, follow` + absent from the sitemap. The Persian long-tail demand for the
  non-selected teams (e.g., "بازی بعدی یوونتوس" [Juventus], "بازی بعدی لیدز" [Leeds]) is
  left unaddressed — the pages exist (200 + the fixture data) but are NOT indexed.
- **The evidence:** the 2026-11-17 crawl — `/teams/juventus` returns 200 + `noindex,
  follow`. The `/sitemaps/teams.xml` has exactly 13 rows.
- **Why it was not done:** the Session 4 C1 disposition — the curated 13-club stance to
  focus the crawl budget on the high-value pages (the 13 clubs the GSC data shows earn
  the clicks). The decision is defensible (the 13 clubs = the click-earners; the 74
  non-selected = the long-tail with low GSC evidence).
- **The SEO harm:** the long-tail Persian query demand for the non-selected teams is
  real (a Juventus fan in Iran searches "بازی بعدی یوونتوس"). The site has the page +
  the data but refuses to index it — the demand goes to a competitor (Flashscore,
  Sofascore). This is a strategic coverage trade-off, not a bug.
- **The recommended action:** the post-Dec-8 decision (with the fresh GSC data): either
  (a) keep the curated 13-club stance (the current state — defensible IF the 13 clubs
  earn the vast majority of the clicks), OR (b) expand the allowlist to the next tier
  (the Italian/Spanish/German big clubs not in the 13 — Juventus, Napoli, Atletico [wait,
  Atletico IS in the 13], Inter [in the 13], etc. — re-evaluate with the GSC data). The
  expansion would need the Workers Paid plan (the 74 → N pages would multiply the KV-read
  demand).

### P2-4 — NO image sitemap (the image-search visibility)

- **The gap:** there is no image sitemap. The site renders many images — the crest
  images (crests.football-data.org), the hero poster, the match-centre scene art, the
  OG images. An image sitemap would declare these to Google Image search.
- **The evidence:** the sitemap index has 5 sub-sitemaps (pages, competitions, teams,
  matches-upcoming, matches-archive) — none is an image sitemap. The `<url>` entries do
  not carry the `<image:image>` extension.
- **Why it was not done:** the program's sitemap work (S4) built the URL sitemaps. The
  image sitemap was not a session objective.
- **The SEO harm:** the image-search visibility is undeclared. For a football site, the
  crest / team-logo / player-portrait image searches are a real traffic vector (a user
  searching "لوگو بارسلونا" [Barcelona logo] could land on the team page via image
  search). Without the image sitemap, Google discovers the images via the HTML crawl but
  without the structured image-metadata declaration.
- **The recommended action:** a session adds the `<image:image>` extension to the
  existing sitemap entries (the crest URL + the OG image URL per page). Add a
  `check-seo-image-sitemap.js` gate. (Freeze-safe — the image sitemap is a machine file,
  NOT a byte-frozen HTML surface.)

### P2-5 — NO WebSite `potentialAction` (the sitelinks search box)

- **The gap:** the WebSite node has `@id`, `url`, `name`, `alternateName`,
  `description`, `inLanguage`, `publisher` — but NO `potentialAction` (SearchAction).
  The sitelinks search box (the Google search-result feature that puts a search box
  directly in the brand's sitelinks) is not declared.
- **The evidence:** the 2026-11-17 crawl — the WebSite node on the homepage + the match
  page has NO `potentialAction` key.
- **Why it was not done:** the sitelinks search box requires an internal search
  endpoint. The site has NO internal search (a Worker with a 10ms CPU cliff cannot
  afford a search query). The `potentialAction` would point to a non-existent search
  URL.
- **The SEO harm:** minor — the sitelinks search box is a brand-search enhancement (it
  appears when a user searches "اسپرت سیگنال" [SportSignal] by name). Without it, the
  brand-search result lacks the inline search box. The feature is low-traffic for a site
  with 250 clicks.
- **The recommended action:** defer until an internal search exists (which requires the
  Workers Paid plan for the CPU budget). NOT a priority.

### P3-1 — The `/teams.xml` (without the `/sitemaps/` prefix) returns HTML (a soft quirk)

- **The gap:** the URL `https://sportsignal.ir/teams.xml` (without the `/sitemaps/`
  prefix) returns 200 with an HTML page (the SEO page shell), NOT an XML sitemap. The
  canonical sitemap URL is `/sitemaps/teams.xml`. A user / a crawler hitting `/teams.xml`
  gets an HTML page (a soft 404 / incorrect content-type).
- **The evidence:** the 2026-11-17 crawl — `curl https://sportsignal.ir/teams.xml`
  returns the HTML page shell (the preconnect + the fonts + the page content), NOT XML.
- **Why it was not done:** the router (`src/seo/router.ts`) does not have a route for
  `/teams.xml` — it falls through to the default page renderer. The sitemap is served
  only at `/sitemaps/teams.xml` (the `robots.txt` Sitemap directive points there).
- **The SEO harm:** minimal — the `robots.txt` declares the correct sitemap URL, so
  Googlebot uses `/sitemaps/teams.xml`. But a direct hit on `/teams.xml` is a soft 404
  (a 200 with HTML instead of the expected XML) — Google may index it as a page (a
  duplicate-content oddity).
- **The recommended action:** a session adds a 301 redirect from `/teams.xml` (and any
  `.xml` request outside `/sitemaps/`) to the correct `/sitemaps/teams.xml`, OR a 404.
  (Freeze-safe — a router redirect, NOT a byte-frozen surface.)

### P3-2 — NO off-page SEO / link-building (the domain-authority gap)

- **The gap:** the 15-session program was entirely ON-page + technical. There was NO
  off-page SEO — no link-building, no digital PR, no outreach, no backlink acquisition.
  For a site with 412 URLs + 250 clicks + a likely-low domain authority, the off-page
  is a major gap (the on-page is sound but the site lacks the authority signals to
  rank).
- **The evidence:** the program's scope (the route plan §10 — Sessions 1-15) is entirely
  on-page/technical/structured-data/performance/monitoring. No session addresses off-page.
- **Why it was not done:** the program was scoped as an on-page SEO implementation
  program. Off-page is a different discipline (content marketing + digital PR) + is
  owner-driven (the agent cannot build backlinks autonomously).
- **The SEO harm:** the on-page SEO is sound, but without the domain authority, the site
  will struggle to rank for the competitive head terms (the Persian "بازی بعدی بارسلونا"
  etc. — where Flashscore/Sofascore dominate). The long-tail may rank (lower competition)
  but the head terms need authority.
- **The recommended action:** the owner pursues the off-page SEO separately — the
  Telegram channel (the @SportSignalAlertsBot — a built-in distribution channel), the
  Persian football-community engagement, the digital PR (the Persian sports press). This
  is beyond the SEO implementation program's scope but is the natural next track.

### P3-3 — NO player pages / standings pages / H2H pages (the content-class expansion)

- **The gap:** the program built the team/competition/match page classes. It did NOT
  build: the player pages (e.g., "مهدی طارمی" — a Persian-query-demand page for the
  Iranian players abroad), the standalone standings pages (e.g.,
  `/standings/premier-league` — "جدول لیگ برتر انگلیس"), the head-to-head pages (e.g.,
  `/h2h/arsenal-vs-chelsea` — "آرسنال против چلسی"). These are content classes with real
  Persian query demand that the site does not serve.
- **The evidence:** the sitemap (`/sitemaps/pages.xml`) lists only the homepage, the
  hubs, the index pages, + the static pages. No player/standings/H2H URLs.
- **Why it was not done:** the program's scope was the existing page classes (the route
  plan §2 — the keyword-to-URL map). The player/standings/H2H classes were not in the
  approved architecture (the S3 blueprint).
- **The SEO harm:** the unaddressed query demand (the player names, the league tables,
  the H2H) goes to the competitors. The site's content footprint is narrower than the
  demand.
- **The recommended action:** a future content-expansion track (post-Dec-8, post-the-
  Workers-Paid-plan): the player pages (especially the Iranian players abroad — a
  Persian-audience magnet), the standalone standings pages, the H2H pages. Each is a
  new page class with its own @graph + its own check gate.

### P3-4 — The E-E-A-T signals are thin (the trust enhancement)

- **The gap:** the site has a `/methodology` page (good for the data-source transparency)
  + the Organization node (the logo + the Telegram/X sameAs). But the E-E-A-T
  (Experience, Expertise, Authoritativeness, Trustworthiness) signals are thin: no
  author/expert attribution, no editorial policy page beyond the methodology, no
  fact-checking attribution, no "last updated" timestamps on the pages, no expert
  reviewer credits.
- **The evidence:** the `/methodology` page exists (in the pages sitemap). The
  Organization node has the logo + the sameAs. But no Author structured data, no
  Article/NewsArticle nodes (the site is a fixture/data site, not a publisher — so
  Author may be N/A), no visible "last updated" on the pages.
- **Why it was not done:** the E-E-A-T enhancement was not a session objective. The
  program focused on the technical-SEO + the structured-data foundation.
- **The SEO harm:** for a YMYL-adjacent topic (sports data is low-YMYL, but the trust
  signals still matter for the ranking), the thin E-E-A-T may cap the ranking potential.
  Google's E-E-A-T is a ranking consideration (not a direct signal, but a quality-frame
  evaluation).
- **The recommended action:** a trust-enhancement session: add a visible "last updated"
  timestamp to the pages (the data freshness); enrich the `/methodology` page with the
  editorial policy + the data-source attribution + the fact-checking process; consider
  an Author/expert attribution if the site adds editorial content (P1-1). (Freeze-safe
  for the additive elements; the methodology page is NOT a byte-frozen surface.)

---

## 2. The SWOT audit

### Strengths (the internal positives)

1. **The structured-data foundation is schema.org-VALID + comprehensive.** Every page
   ships a JSON-LD `<script type="application/ld+json">` block. The SportsEvent node
   (the match detail) emits `location` ONLY when a true venue exists (the
   MISSING-IS-NOT-ZERO law — the `if (m.venue)` guard). The SportsTeam + SportsOrganization
   nodes carry the `sameAs` to Wikipedia + Wikidata on their own pages (Barcelona →
   Q7156; the Champions League → Q18756). The BreadcrumbList + the FAQPage (on the date
   hubs) + the CollectionPage + the WebPage + the Organization (with the logo + the
   Telegram/X sameAs) + the WebSite nodes are all present. The Schema Markup Validator
   confirms the schema.org validity (S13).

2. **The no-fabrication discipline (the S-04 no-fake-offers + the S-05 no-invented-data
   laws).** The program NEVER fabricated a venue, an offer, a broadcast link, an
   endDate, or a performer. The MISSING-IS-NOT-ZERO law is the embodiment of this — the
   honest "missing recommended field" class (the 13 GSC Critical items + the 4
   non-critical issue types). No penalty risk from invented data.

3. **The curated 13-club crawl-budget focus.** The teams.xml = exactly 13 rows. The
   `/teams` tile ordering = the 13 selected clubs first. The non-selected teams are
   `noindex, follow` (the C1 disposition — crawlable for the link equity but not
   indexed). The crawl budget is focused on the click-earner pages.

4. **The SSR-from-KV speed (cache hits P50 ~1ms).** The Worker serves the complete HTML
   from the KV cache (the `getSeoCtx` payload + pool + overlay). The cache-hit path is
   fast (P50 ~1ms CPU). The S14 preconnect to crests.football-data.org starts the
   handshake at HTML-byte-0 (a real client-side optimization, freeze-safe, zero Worker
   CPU).

5. **The Persian-first + mobile-first stance.** Every page ships `<html lang="fa"
   dir="rtl">` + `og:locale=fa_IR`. The site targets the Iran market (98.4% of clicks)
   + the mobile audience (94.8% of clicks). The S12 EN decision (FINAL — Option (b))
   is the disciplined single-language stance (zero English-query demand + the 2×
   KV-read/CPU cost not justified on the free plan).

6. **The sitemap structure + the machine-file hygiene.** The 5 sub-sitemaps (pages,
   competitions, teams, matches-upcoming, matches-archive) are well-organized. The
   `robots.txt` is clean. The non-prod `x-robots-tag` (the C6 disposition) prevents the
   staging surfaces from being indexed.

7. **The freeze discipline.** The Dec 4-8 measurement freeze held across S6-S15. The
   byte-frozen surfaces (the title/H1/description/answer-sentence) were protected during
   the measurement window. The freeze-safe changes (the S11 og:type + SEO_EXTRA_ALIASES;
   the S14 preconnect) were correctly classified as non-frozen.

8. **The check-gate suite (56 scripts / 3,738 gates).** Every SEO contract is pinned by
   an eval-extract check script (the check-seo-*.js family). The gates run in `npm test`
   — a regression in any contract fails the build. This is a strong engineering
   discipline.

9. **The dynamic OG images.** Every match page ships a per-match `og:image`
   (`/og/match-<slug>.png`) + `twitter:card=summary_large_image`. The social sharing is
   configured with dynamic images (not a generic fallback).

10. **The GSC monitoring view.** The `seo-implementation/GSC-MONITORING-VIEW.md` defines
    the per-page-class monitoring cadence + the filter instructions. The baseline (250
    clicks / 9,465 impressions / 412 URLs) is established.

### Weaknesses (the internal negatives)

1. **The measurement gap (P0-1 + P0-2).** The real CWV + the before/after GSC are
   unmeasured. The program's actual impact is unverified. The GA4 is deferred; the RUM
   is homepage-only. This is the #1 weakness — the program is disciplined but cannot
   prove its ROI.

2. **The content depth is thin (P1-1).** The team/competition/match pages are
   data-driven with minimal editorial body text (~2,983 / ~6,395 / ~3 `<p>` tags). The
   Helpful Content System risk is real. This is likely the #1 reason the 412 indexed
   URLs earn only 250 clicks.

3. **The 10ms CPU cliff (P0-3).** ~17.7% of Worker invocations fail with CPU
   exhaustion. The free-plan limit is the constraint. The durable fix (the Workers Paid
   plan) is deferred. This directly harms the crawlability + the CWV.

4. **The entity-grounding inconsistency (P1-2).** The match-page SportsTeam nodes are
   bare (no `sameAs`); the team-page SportsTeam nodes are enriched. The click-earner
   page type has the weaker grounding.

5. **The machine-only breadcrumbs (P1-3).** The BreadcrumbList is JSON-LD-only — no
   visible breadcrumb nav. The user wayfinding + the visible-internal-link graph + the
   breadcrumb rich-result are all missed.

6. **The INERT lifecycle (P1-4).** 151 expired matches stay indexable. The crawl-budget
   dilution + the cannibalization risk persist.

7. **The KV-read quota exhaustion (the chronic free-tier issue).** The 100,000/day
   free-plan limit was exceeded daily at S5-S9 (healthy at S10-S15 close). When
   exceeded, the entity-name + structured-data surfaces go empty (a pre-existing
   infrastructure issue, not a code issue — but a real weakness on the free plan).

8. **The pagination self-canonical (P1-5).** The duplicate-content risk across the
   pagination series is unresolved.

9. **The no-FAQ on the detail pages (P1-6).** The FAQ rich-result opportunity for the
   "بازی بعدی X" query pattern is missed.

10. **The single-account free-tier dependency.** The program's future options (the
    `/en/` architecture, the GA4 budget, the 74→N team-page expansion, the internal
    search) ALL bottleneck on the Workers Paid plan. The free tier caps the ceiling.

### Opportunities (the external positives)

1. **The fresh 16-month GSC export (the post-Dec-8 measurement).** The program's top
   evidence request. It would validate the full-program regression + unlock the
   post-Dec-8 freeze-lift byte decisions (the S2 title-test, the S1 spelling-fix, the
   S11 SEO_EXTRA_ALIASES extension, the S13-1 Events rich-result revisit).

2. **The Workers Paid plan ($5/mo).** The single highest-ROI action. Fixes the CPU cliff
   + the KV-read quota + unblocks the `/en/` architecture + the GA4 budget + the
   internal search + the content-class expansion. A force-multiplier for every future
   opportunity.

3. **The Cloudflare beacon extension to the SEO pages (P2-1).** One-line, cookieless,
   freeze-safe. The per-page RUM without the GA4 consent burden.

4. **The content-depth session (P1-1).** The highest-leverage CONTENT action. Adding
   the editorial body to the team/competition/match pages could move the 412 URLs from
   "indexed but thin" to "indexed + substantive" — the likely biggest ranking win
   available.

5. **The FAQ rich-result on the detail pages (P1-6).** The "بازی بعدی X" query pattern
   is high-demand + low-competition in Persian. The FAQ rich-result could be a
   meaningful CTR win.

6. **The entity-grounding parity (P1-2).** Adding the `sameAs` to the match-page
   SportsTeam nodes is a small, freeze-safe change with a real knowledge-graph benefit.

7. **The visible breadcrumbs (P1-3).** An additive nav element with the user-wayfinding
   + the internal-link + the rich-result benefits.

8. **The lifecycle activation (P1-4).** Noindexing the expired matches (the 2025-26
   season's past matches) could be done NOW (not May 2027) — a crawl-budget reclaim.

9. **The content-class expansion (P3-3).** The player pages (especially the Iranian
   players abroad), the standalone standings pages, the H2H pages — new content classes
   with real Persian query demand.

10. **The Telegram channel as the off-page engine (P3-2).** The @SportSignalAlertsBot
    is a built-in distribution channel. The Telegram audience is the natural source of
    the brand-search demand + the referral traffic + the backlink acquisition (the
    Persian football-community engagement).

11. **The image sitemap (P2-4).** A small change to declare the images to Google Image
    search.

12. **The Discover optimization.** For a football fixture site, the Google Discover feed
    could be a major traffic source (the visual content + the topical authority). The
    structured data + the preconnect help; the content depth (P1-1) + the E-E-A-T
    (P3-4) would strengthen the Discover eligibility.

### Threats (the external negatives)

1. **The CPU-cliff crawlability harm (P0-3).** Googlebot hitting a 10ms-cliff-terminated
   page gets a failed response. The ~17.7% failure rate may directly reduce the
   indexation + the crawl frequency. This is the single biggest SEO threat — an
   unmeasured but near-certain harm.

2. **The competitive threat (Flashscore / Sofascore / the league-official sites).** The
   football-data SERP is saturated by high-authority English-native + the Persian-
   native publishers. The site's 412 URLs + 250 clicks is a thin footprint against the
   competitors. The content depth (P1-1) + the off-page (P3-2) are the defenses.

3. **The Helpful Content System risk (P1-1).** The thin editorial body on the
   data-driven pages is exactly the profile at risk. A Helpful Content System
   down-rank would cap the ranking potential across the 412 URLs.

4. **The KV-read quota exhaustion (the free-tier cliff).** When the 100,000/day limit is
   exceeded (daily at peak traffic), the entity-name + structured-data surfaces go
   empty. Googlebot crawling during the quota-exceeded window sees pages with empty
   JSON-LD / empty faName — a data-quality + indexation risk.

5. **The duplicate-content risk (P1-4 + P1-5).** The expired matches (151 indexable) +
   the pagination self-canonical create the near-duplicate content. A Google
   duplicate-content demotion could cluster the pages + dilute the ranking.

6. **The single-account + single-Worker dependency.** The site is one Worker on one
   Cloudflare account. A single misconfiguration / a single quota exhaustion / a single
   CPU-cliff spike affects the whole site. No redundancy.

7. **The freeze-lift byte-decision risk.** The post-Dec-8 decisions (the S2 title-test,
   the S1 spelling-fix, the S11 SEO_EXTRA_ALIASES extension) carry the risk of undoing a
   working change OR keeping a failing one — blind without the fresh GSC data (P0-2).

8. **The Google algorithm-update attribution risk.** The spec §11 warns: "Do not
   attribute changes to an algorithm update without evidence." The program's
   measurement gap (P0-2) makes the algorithm-update attribution harder to detect — a
   future ranking drop could be an algorithm update OR a regression, and the program
   cannot distinguish without the before/after data.

9. **The Persian-content moderation risk.** The Iran market has the content-regulation
   considerations (the filtering, the blocking). A site accessible in Iran is subject to
   the local content rules. (Low SEO threat but a real operational consideration.)

10. **The token-rotation + the access-security risk.** The GitHub + Cloudflare tokens
    were shared across Sessions 14 + 15. If not rotated, a token leak could compromise
    the repo + the production. (An operational threat, not an SEO threat — but it
    affects the program's security posture.)

---

## 3. The prioritized action list (the owner's roadmap)

The recommended priority order (the highest-leverage first):

| # | The action | The priority | The prerequisite | The freeze-safety |
|---:|---|---|---|---|
| 1 | Upgrade to the Workers Paid plan ($5/mo) — fixes the CPU cliff + the KV quota + unblocks everything | P0 | owner budget decision | N/A (infra) |
| 2 | Supply the fresh 16-month GSC export (post-Dec-8) — validates the program + unlocks the byte decisions | P0 | owner action | post-Dec-8 |
| 3 | Supply the CrUX / PageSpeed Insights data OR a Google API key — measures the real CWV | P0 | owner action | N/A (measurement) |
| 4 | The content-depth session (the editorial body on team/competition/match) — the biggest ranking lever | P1 | the Workers Paid plan (the CPU budget) | freeze-safe (additive body content; do NOT touch the byte-frozen title/H1/description) |
| 5 | The entity-grounding parity (the match-page SportsTeam `sameAs`) | P1 | none | freeze-safe (JSON-LD field) |
| 6 | The visible breadcrumb nav on the detail pages | P1 | none | freeze-safe (additive nav) |
| 7 | The FAQ structured data on the detail pages (the "بازی بعدی X" rich-result) | P1 | the content depth (the Q&A body) | freeze-safe (additive JSON-LD + visible Q&A) |
| 8 | The lifecycle activation (noindex the 2025-26 expired matches NOW) | P1 | the FD `season.endDate` values | freeze-safe (the lifecycle flag) |
| 9 | The Cloudflare beacon extension to the SEO pages (the per-page RUM) | P2 | none | freeze-safe (a `<script>` in `<head>`) |
| 10 | The pagination decision (with the fresh GSC data) | P1 | the fresh GSC export | freeze-safe (a canonical/robots change) |
| 11 | The sitemap lastmod freshness (the upcoming matches) | P2 | none | freeze-safe (a sitemap field) |
| 12 | The image sitemap | P2 | none | freeze-safe (a machine file) |
| 13 | The non-selected-team allowlist re-evaluation (the 74 long-tail) | P2 | the fresh GSC data + the Workers Paid plan | freeze-safe (the allowlist) |
| 14 | The `/teams.xml` soft-404 redirect | P3 | none | freeze-safe (a router redirect) |
| 15 | The E-E-A-T enhancement (the "last updated" + the editorial policy) | P3 | the content depth | freeze-safe (additive) |
| 16 | The content-class expansion (player / standings / H2H pages) | P3 | the Workers Paid plan | freeze-safe (new page classes) |
| 17 | The off-page SEO / link-building (the Telegram channel + the digital PR) | P3 | owner action | N/A (off-page) |
| 18 | Rotate the GitHub + Cloudflare tokens | P0 | owner action | N/A (security) |

---

## 4. The honest verdict

The 15-session program was a **disciplined, budget-aware, freeze-aware technical-SEO
build-out** that shipped a clean, schema.org-valid, well-structured foundation on a
Cloudflare Worker free tier. It did NOT fabricate data, did NOT break production, did
NOT touch the byte-frozen surfaces during the freeze, and pinned every contract with a
check gate. **As a technical-SEO foundation, it is sound.**

But the program's **three biggest gaps are NOT technical — they are measurement,
content, and infrastructure:**

1. **The measurement gap** (P0-1 + P0-2): the program cannot prove its ROI. The real
   CWV + the before/after GSC are unmeasured. The owner must supply the data.

2. **The content-depth gap** (P1-1): the pages are technically correct but
   substantively thin. This is likely the #1 reason the 412 indexed URLs earn only 250
   clicks. The program added the metadata + the structured data but NOT the editorial
   body. **This is the highest-leverage unaddressed SEO action.**

3. **The infrastructure gap** (P0-3): the 10ms CPU cliff on the free plan directly harms
   the crawlability (~17.7% request failure). The Workers Paid plan ($5/mo) is the
   single highest-ROI action the owner can take — it fixes the cliff + the KV quota +
   unblocks every future opportunity.

**The program is a solid foundation. The next phase is measurement + content +
infrastructure — not more technical-SEO plumbing.**

Credentials used in the environment, not stored. The owner should rotate the GitHub +
Cloudflare tokens.
