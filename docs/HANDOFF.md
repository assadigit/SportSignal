# HANDOFF — SportSignal

> Agents: read AGENTS.md in the repo root first, and follow it for this whole session.

## This session (SEO Program Session 9 — competition pages + date pages + empty states; SIXTH implementation session, 2026-11-17)

The competition-page session of the 15-session SEO program: the
`/competitions/{slug}` family (keyword map §2.8-2.13; 7 live competition
pages: PL, PD, SA, FL1, BL1, UCL, DFB-Pokal) + the date hub pages
(`/matches/today`, `/matches/tomorrow`, `/matches/this-week`,
`/matches/this-weekend`) + the empty-state behavior. The Dec 4-8 measurement
freeze applies to the competition-page title/H1 bytes — Session 9 owns them
but the actual byte change is a post-Dec-4 decision with a fresh GSC export.
**Deployed (versioned): `fc07b557-8f7e-4408-859d-5901e9ac9cbf`**
(`13.265.0-competitions`) @ 100%. All phase acceptance criteria met
(SESSION-09.md).

- **The audit (read-first, no code):** `buildCompetitionPage`
  (`src/seo/pages.ts`) is already complete against the keyword map §2.8-2.13 +
  the spec §2/§9: the title («{لیگ} — برنامه بازی‌های بزرگ پیش‌رو | اسپرت
  سیگنال» — the curated framing «بازی‌های بزرگ پیش‌رو» is the differentiator vs
  the full-coverage competitors), the H1 («برنامه بازی‌های X»), the answer
  sentence (leads with «نزدیک‌ترین بازی بزرگ {لیگ}: …» when there is a next
  match — the GSC query head «برنامه بازی های لیگ قهرمانان اروپا» 14 impr /
  pos 9.36 + the league-schedule heads), the meta description (derived from
  the answer, sliced to 165), the content blocks (the answercard + the full
  standings table via `fullStandings` — one cache-only KV read, fail-closed to
  the compact + the upcoming matches list «بازی‌های پیش‌رو»), the internal
  links (crawlable `<a href>` match URLs via `dateGroupedRows` → `mrowHtml` →
  `matchHref` → the canonical `/matches/{home}-vs-{away}-{YYYY-MM-DD}`), the
  indexable rule (`list.length >= SEO.MIN_UPCOMING_FOR_INDEX` — indexable when
  ≥1 upcoming approved match; `noindex, follow` at 0 upcoming; 404 when no
  pool rows at all), and the competition-name aliases (the
  `translateCompetition` map rides the `sportsOrganizationNode`
  `alternateName`). ALL present + correct + byte-frozen. No filler text added
  (spec §2 "Keep the current fairly complete competition page experience";
  "Do not add filler text to match a word count").

- **The ONE code change — the competition-page @graph CollectionPage node
  (S9):** the competition detail page was the lone competition-family page
  without a WebPage/CollectionPage node in its JSON-LD @graph. Every sibling
  page emits one: the `/competitions` index + the `/matches` hub + the time
  hubs via `JL.collectionPageNode`; the team page + the match page via
  `JL.webPageNode`. The spec contract (Step 3: "the @graph carries
  Organization + WebSite + WebPage + BreadcrumbList") now holds:
  `buildCompetitionPage`'s `jsonldNodes` gains
  `JL.collectionPageNode(path, "برنامه بازی‌های " + String(cNameFa),
  ctx.fetchedAt)` between `siteNodes()` and `sportsOrganizationNode`.
  CollectionPage is the accurate type: the page's primary content is a
  collection of that competition's upcoming fixtures (the `itemListNode` when
  indexable) + the full standings table — the `sportsOrganizationNode` already
  carries the competition-entity semantics, so the page-level node describes
  the collection, not the entity. STRUCTURAL JSON-LD hygiene only — the
  byte-frozen title/H1/description/answer are untouched (the Dec 4-8 freeze
  holds — verified by the new `check-seo-competitionpages.js` freeze gates).
  Decision S09-1 in `docs/DECISIONS.md`.

- **The date-hub pages (verified correct — NO code change):** `buildHub`
  already emits `JL.collectionPageNode(def.path, def.h1, ctx.fetchedAt)` +
  `JL.itemListNode` + `JL.faqNode` + `JL.breadcrumbNode`; the hubs are
  self-canonical + indexable (the C5 decision: empty hubs stay indexable —
  `/matches/tomorrow` is the site's best-CTR surface at 8.26% WITH an honest
  empty state). The empty-state behavior is correct: a hub with zero upcoming
  matches renders «مسابقه‌ای در راه نیست» in the list + the FAQ answers
  honestly + the answer sentence uses `def.desc`. The S06-H3 follow-up (the
  tomorrow-empty-state refinement to the spec's suggested Persian copy) is a
  post-Dec-4 decision — documented, NOT changed. Decision S09-2.

- **The new check gate — `scripts/check-seo-competitionpages.js`:** 8 offline
  gates pinned to the `buildCompetitionPage` function body: (1) the
  CollectionPage node is in the `jsonldNodes` array; (2) NO SportsEvent node;
  (3) the byte-frozen title template; (4) the byte-frozen H1; (5) the answer
  sentence leads with «نزدیک‌ترین بازی بزرگ {لیگ}» (next match) / «بازی‌های
  بزرگ پیش‌روی {لیگ} در اسپرت سیگنال» (no next match); (6) the indexable rule
  (the route plan §5); (7) the crawlable upcoming-matches rows + the full
  standings table (spec §2 + §9); (8) the @graph node order. Wired into the
  `npm test` chain after `check-seo-teampages.js`.

- **The seeded render harness — `scripts/s9-competition-smoke.ts`:** a seeded
  SeoCtx with one upcoming PL fixture (Arsenal vs Liverpool, both selected
  clubs) renders `/competitions/premier-league` and asserts (1) the @graph
  carries a CollectionPage node with the correct @id/url/name/inLanguage/
  dateModified/isPartOf; (2) NO SportsEvent; (3) the @graph node order;
  (4) the byte-frozen title; (5) the byte-frozen H1; (6) the answer lead;
  (7) robots `index, follow`; (8) the self-canonical; (9) a crawlable
  `<a href>` match row; (10) the upcoming-matches heading; (11) the
  SportsOrganization node; (12) the ItemList node; (13) the BreadcrumbList
  node. **30/30 assertions pass.**

- **Byte-frozen (NOT changed — the Dec 4-8 freeze holds):** the
  competition-page `<title>`, `<h1>`, meta description, answer sentence, and
  the competition-name spellings. The team-page title/H1/description/answer
  (Session 8). The match-page title/H1/description/answer (Session 7). The
  homepage title/H1 (Session 6). The date-hub empty-state copy on
  `/matches/tomorrow` (the S06-H3 follow-up). The CollectionPage node is NOT a
  GSC-measured surface (machine-readable JSON-LD, invisible to the SERP
  snippet) — safe under the freeze. Decision S09-3.

- **What I checked (verification):** `npm test` exit 0 (**3,694 OK** = baseline
  3,685 + 9 from the new `check-seo-competitionpages.js` gates; `npx tsc
  --noEmit` clean); the new `check-seo-competitionpages.js` standalone (8/8
  gates pass); the seeded tsx render harness (`scripts/s9-competition-smoke.ts`
  — 30/30 assertions pass); local `wrangler dev` smoke (worker boots,
  `/healthz` 200, the `/competitions` index renders 200 + the CollectionPage
  node + the byte-frozen title, `/competitions/premier-league` 404 on empty
  local KV = correct — the data-path, not a code error). Live: version
  `13.265.0-competitions` on `/healthz` ✓; `/competitions` index 200 +
  CollectionPage node + the byte-frozen title ✓.

- **The KV read quota (pre-existing, NOT a code issue):** STILL exceeded at
  Session 9 close (live `/healthz` 2026-11-16 23:50 UTC: `ok:false` +
  `pool_matches:0` + `pool_age_min:-1`). The competition-page data surfaces
  (the upcoming matches list, the full standings table, the rendered
  CollectionPage node on a detail page WITH upcoming matches) CANNOT be
  live-verified while the quota is exceeded — they self-verify once the quota
  resets at UTC midnight. The SSR-structural change (the CollectionPage node)
  is verified by the offline gates + the tsx harness (30/30). The owner should
  investigate the read-source; a Workers Paid plan ($5/mo → 1M reads/day) is
  the durable fix. Decision S09-4.

- **Cloudflare budget of this change:** zero new KV reads (the
  `collectionPageNode` call is an in-memory object literal built from `path` +
  `ctx.fetchedAt` + `cNameFa` already in scope); zero new KV writes
  (`kv_writes_day:0`); zero new subrequests; zero new fetches; zero
  render-cost additions (a small object appended to an existing array). Well
  within the free-tier budget.

- **Decisions:** S09-1 (the CollectionPage node), S09-2 (the audit confirms
  the date-hub + empty-state behavior is already correct — the S06-H3
  refinement is post-Dec-4), S09-3 (the competition-page title/H1 bytes ARE
  byte-frozen — the actual byte change is a post-Dec-4 decision with a fresh
  GSC export), S09-4 (the KV read quota STILL exceeded at S9 close). Details
  in `docs/DECISIONS.md`.

- **Next session (Session 10):** the internal linking + navigation
  relationships (tile order, anchor wording per the cannibalization checklist
  — keyword map §3 + the route plan §10). The next-session prompt is in
  `seo-implementation/next-session-prompt.md`. A fresh GSC export (16 months,
  URL-level) remains the top evidence request (unlocks the S09-3
  competition-page title/H1 byte decision, the S08 team-page title-test
  result, the S07-H2 match-page title/H1 byte decisions, the S07-H4
  `og:type` decision, the S06-H2 homepage H1 decision, the S06-H3 tomorrow
  empty-state refinement, the M5 marquee-slug refinement).

## Current state (machine)

- **Version:** `13.265.0-competitions` (`src/config.ts` / `package.json` `13.265.0.0`). npm test baseline **3,694 OK** (`npx tsc --noEmit` clean + 53 check scripts — the +1 is the new `check-seo-competitionpages.js`; verified this session — was 3,685).
- **Deploy:** Worker `ucl-notifier`, versioned deploys only. Current deployment `fc07b557-8f7e-4408-859d-5901e9ac9cbf` (`13.265.0-competitions`; 2026-11-17, deployed @100%). Rollback chain: `b313aada` (13.264.0-teampages, Session 8) → `3e3a65e7` (13.263.0-matchlinks, Session 7) → `7df40334` (13.262.0-homepage, Session 6) → `1d70129b` (13.261.0-matchlife, Session 5) → `7d92e633` (13.260.1-teamidx, Session 4) → `24c62781` (13.260.0-teamidx) → `c97ae70b` (byte-identical S28.1) → earlier. Rollback = `npx wrangler rollback`.
- **Production hostnames:** `sportsignal.ir` (apex Custom Domain), `football.sportsignal.ir` (301→apex except `/webhook`,`/api/`,`/admin`), `ucl-notifier.sportsignal.workers.dev` (noindex-guarded alias — HTML AND machine files since Session 4; never a scratch env).
- **Branch:** `main` (canonical; HEAD = the Session 9 code checkpoint + close-out — ls-remote verified after the one-shot token push). Session 9 commit: `seo(s09): the competition-page @graph CollectionPage node + the check-seo-competitionpages.js gate + version bump`.
- **Commands:** `npm test` (must exit 0 before every push). **npm only, never `bun install`**. Local dev: `npx wrangler dev --config wrangler.dev.toml --port 8787 --local` (the dev config has no [ai] remote binding — safe without the token). Deploy needs `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID=a796fdfe…` in the env.
- **Cron triggers:** `*/10 * * * *` + `27 */4 * * *` (unchanged). Live healthz at Session 9 close (2026-11-16 23:50 UTC): version `13.265.0-competitions`; `ok:false` + `pool_matches:0` + `pool_age_min:-1` due to the KV read quota (pre-existing, self-heals at UTC midnight); `degraded:false`; `kv_writes_day:0` (zero new writes — the Session 9 change is a structural JSON-LD node, an in-memory object literal).
- **Key folders:** `src/` (worker modules; `scripts/lib/worker-src.js` carries the bundle ORDER — co-evolve), `assets/` (immutable versioned client payload; SW `sportsignal-v126`, bundle `public-13.80.js`, stylesheet `public-13.87.css`), `docs/` (RUNBOOK, specs, audits, history), `sportsignal-seo-implementation/` (the SEO spec pack — owner's, tracker updated per session), `seo-implementation/` (the SEO program working tree: audits, keyword research, architecture, session reports, next-session prompts).
- **Backups:** KV is live state; no routine file backups (RUNBOOK §5 KV key contracts). Never rename KV keys.
- **Standing limits:** `_headers` at the 100-rule cap. **Cross-track SEO measurement window Dec 4-8: the GSC surfaces + team-name spellings stay byte-frozen through it.** The competition-page title/H1/description/answer ARE GSC-measured surfaces — Session 9 changed NEITHER (verified by the new `check-seo-competitionpages.js` freeze gates). The team-page title/H1/description/answer ARE byte-frozen (Session 8 verified; Session 9 did not touch them). The match-page title/H1/description/answer-sentence ARE byte-frozen (Session 7 verified). The homepage title/H1 ARE byte-frozen (Session 6). The date-hub empty-state copy on `/matches/tomorrow` IS byte-frozen (the S06-H3 follow-up is post-Dec-4). The CollectionPage node is NOT a GSC-measured surface (machine-readable JSON-LD) — safe under the freeze. The S28 archive scope stays BIG matches only until the owner's A/B. Avoid deploys in the Nov 20 Bayern–Köln verification windows (M1 ~19:35 UTC, M2 ~21:35-45 UTC). Cloudflare free-tier budget: the 10ms CPU cliff on cold match renders is chronic; **the KV read quota (100,000/day) is STILL exceeded** — investigate the read-source; a Workers Paid plan ($5/mo → 1M reads/day) is the durable fix.

## Open follow-ups from the previous tracks (updated by Session 9)

- **Nov 20 (S27 option B):** the auto-verify workflow fires around Bayern–Köln; the owner re-fires the M1/M2 window sessions per the S27-cont record.
- **S24 (perf/CWV):** after Dec 8 — P1 hero `loading="lazy"`, P2 preconnect to crests.football-data.org, per-route CPU via GraphQL.
- **S26 (UI/UX iteration):** after S25 (done) — hero rendering, nav UX, FAQ discoverability, schedule density, telegram CTA. **S06-H4 (the visible curation copy) belongs here or in a dedicated UI round.**
- **S1/S2 SEO mini-track:** S1 spelling fix LIVE and mid-measurement (judge ~Dec 8); S2 title test parked — re-fire on/after Dec 4 with a fresh GSC export. **The program's Session 9 (competition pages) consumes the S2 title-test result after Dec 4 for the competition-page title/H1 byte decision (S09-3).**
- **S25 follow-up smokes:** NVDA/VoiceOver + Safari/Firefox/Edge live confirmations (owner sessions needed).
- **C8 client-side staleness vector (Session 4):** the `/api/public-matches` zone-edge HIT stamp (`max-age=14400`) is browser-honored on the poll path — client-side fix or zone Cache Rule; owner decision.
- **KV read quota (Session 5/6/7/8/9, STILL OPEN):** the account's 100,000 KV reads/day free-plan limit is exceeded. Investigate the read-source; consider a Workers Paid plan ($5/mo → 1M reads/day). Self-heals at UTC midnight. **Session 9's data-dependent surface (the rendered competition-page @graph CollectionPage node on a detail page WITH upcoming matches + the upcoming-matches list + the full standings table) self-verifies once the quota resets.**
- **Season-end lifecycle first run (Session 5, unchanged):** the mechanism is shipped + test-proven but INERT (flag false + empty dates map). To enable: confirm FD `season.endDate` values → populate `SEASON_END_DATES` → set `SEASON_END_NOINDEX_ENABLED = true` → versioned deploy → verify live. The first real transition is a May 2027 decision (after the 2026-27 season closes).
- **S06 data-surface self-verify (Session 6):** once the KV quota resets (UTC midnight), re-verify live: (1) the homepage hero card anchor carries a real `/matches/{slug}` href; (2) the sr-only carousel nav is present when ≥ 2 slides; (3) the homepage boxes show ≤ 30 days; (4) the `/matches` hub shows ≤ 30 days. The SSR-structural changes are already verified live.
- **S07 data-surface self-verify (Session 7):** once the KV quota resets (UTC midnight), re-verify live: (1) a match page between two SELECTED clubs renders the footer-hook «تیم‌ها» line with BOTH team names as `<a href="/teams/...">` links; (2) a match page between one selected + one non-selected club renders the selected team as `<a href>` + the non-selected team as plain text; (3) a match page between two non-selected clubs renders BOTH team names as plain text; (4) the competition link + the date links are unchanged.
- **S08 data-surface self-verify (Session 8):** once the KV quota resets (UTC midnight), re-verify live: (1) a selected-club team page WITH upcoming matches (e.g. `/teams/barcelona`) renders 200 + `index, follow` + the @graph carries a `WebPage` node + the byte-frozen title/H1 + the upcoming-matches block with crawlable `<a href>` match rows + the recent-results block; (2) a selected-club team page with ZERO upcoming matches renders 200 + `noindex, follow` + the self-canonical unchanged; (3) a NON-selected team page renders 200 + `noindex, follow` + the self-canonical unchanged.
- **S09 data-surface self-verify (Session 9, NEW):** once the KV quota resets (UTC midnight), re-verify live: (1) a competition page WITH upcoming matches (e.g. `/competitions/premier-league`) renders 200 + `index, follow` + the @graph carries a `CollectionPage` node (the `@type` array includes `CollectionPage`) + the byte-frozen title «{لیگ} — برنامه بازی‌های بزرگ پیش‌رو | اسپرت سیگنال» + the byte-frozen H1 «برنامه بازی‌های X» + the upcoming-matches block with crawlable `<a href>` match rows + the full standings table; (2) a competition page with ZERO upcoming matches renders 200 + `noindex, follow` + the self-canonical unchanged + the CollectionPage node still in the @graph (the page-level subject is independent of the ItemList); (3) a competition page with NO pool rows at all renders 404 (the route plan §5 — `compsIndex` returns no entry for that slug). The SSR-structural change (the CollectionPage node) is verified by the `check-seo-competitionpages.js` offline gates + the tsx render harness (`scripts/s9-competition-smoke.ts` — 30/30 assertions pass); the live data-surface self-verify confirms the rendered bytes once the quota resets.
- **S10 scope note (internal linking + nav):** Session 10 owns the internal linking + navigation relationships (tile order, anchor wording per the cannibalization checklist — keyword map §3 + the route plan §10). The competition pages NOW carry the CollectionPage node (S09-1) + the crawlable match rows + the standings table — the internal-link surface Session 10 refines is already crawlable.

## SEO program state (the 15-session track)

Session 01 ✅ Completed / verified in production (2026-11-16) — audit + docs.
Session 02 ✅ Completed, docs-only, no deploy (2026-11-16) — 369-phrase map + one-URL rules; allowlist corrected to 13.
Session 03 ✅ Completed, docs-only, no deploy (2026-11-16) — the approved architecture (map, matrix, route plan).
Session 04 ✅ Completed / verified in production (2026-11-16) — the crawl/index foundation (C1/C6/C8); 3,628 OK.
Session 05 ✅ Completed / deployed (2026-11-17) — the match-URL lifecycle mechanism (INERT by default); 3,652 OK. Deployment `1d70129b…` @100%.
Session 06 ✅ Completed / deployed (2026-11-17) — the homepage one-month window + carousel crawlability + curated-selection promise; 3,675 OK. Deployment `7df40334…` @100%.
Session 07 ✅ Completed / deployed (2026-11-17) — the match-detail footer-hook team-link gating + the metadata audit; 3,676 OK. Deployment `3e3a65e7…` @100%.
Session 08 ✅ Completed / deployed (2026-11-16) — the selected-club team-page @graph WebPage node + the new `check-seo-teampages.js` gate; 3,685 OK. Deployment `b313aada…` @100%.
Session 09 ✅ Completed / deployed (2026-11-17) — the competition-page @graph CollectionPage node (structural JSON-LD hygiene — the competition detail page was the lone competition-family page without one; the byte-frozen title/H1/description/answer untouched) + the date-hub/empty-state verification (buildHub already correct — no code change; the S06-H3 refinement is post-Dec-4) + the new `check-seo-competitionpages.js` gate (8 gates) + the seeded render harness (`scripts/s9-competition-smoke.ts` — 30/30 assertions pass); 3,694 OK. Deployment `fc07b557-8f7e-4408-859d-5901e9ac9cbf` @100%.
`seo-implementation/next-session-prompt.md` holds the Session 10 start prompt
(internal linking + nav). Progress source of truth:
`sportsignal-seo-implementation/IMPLEMENTATION-TRACKER.md`.
