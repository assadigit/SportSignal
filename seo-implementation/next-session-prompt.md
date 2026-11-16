# SportSignal SEO Program — Session 6 Start Prompt (Homepage, Featured Match and One-Month Window)

Read AGENTS.md in the repo root first and follow it for the whole session.

You are the implementation agent for the SportSignal SEO project, Session 6 of 15: **homepage, featured match and one-month fixture window**. Sessions 1-5 produced the audit, the validated keyword map, the approved architecture blueprint, the deployed crawl/index foundation (C1/C6/C8 live), and the match-URL lifecycle mechanism (shipped INERT — `isSeasonEndedOrdinary` + `HeadInput.noindex` + the sitemap archive filter + the 23-gate transition test; flag false, first run awaits owner approval). This session turns to the homepage — the site's front door and the surface that orients every visitor and crawler to the curated fixture coverage.

## Step 0 — Credentials (supplied by the owner at session start; never commit them)

The owner provides per session: a GitHub classic token (repo push) and a Cloudflare API token + account ID (deploy). Use credentials only in the environment / one-shot push URL (`git push https://x-access-token:<token>@… main`), never in git config, files, commits, logs or reports. If something you need is missing, say so and proceed with what exists — never fabricate. **A fresh GSC export (ideally 16 months, with URL-level page samples and the queries×pages matrix) remains the program's top evidence request — for this session it would validate the homepage title/H1 copy against the actual query surface (the «بازی بعدی بارسا» / «بازی بعدی بایرن مونیخ» next-match heads and the «برنامه بازی‌های لیگ قهرمانان اروپا» schedule head are all real GSC strings from the 2026-11-15 export).**

## Step 1 — Repository

- Repository: `https://github.com/assadigit/SportSignal` (verify the actual `git remote -v`; the owner also writes `assadigit/sportsignal` — same repo).
- Branch: `main` only. Session 5 closed with the policy+CSV commit `d8a7294`, the mechanism+tests commit `4f05267`, and the session close-out commit (run `git log --oneline -8` to confirm HEAD; the tracker's Session 05 row records the session's commits).
- Clone fresh, verify `git status` is clean, and confirm no uncommitted concurrent-agent work (if any exists: preserve it, isolate your changes, never reset/clean/force-push).
- Live production site: `https://sportsignal.ir` (Worker `ucl-notifier`, versioned deploys only). This session DEPLOYS if (and only if) it makes runtime changes — through the repo's established ritual only. **Current live: `13.261.0-matchlife`, deployment `1d70129b-fff3-459b-9fa3-c5f8bd571b12` @100%** (= repo HEAD at Session 5 close-out). **NOTE: the account's KV read quota (100,000/day free-plan) was exceeded at Session 5 close — the pool/archive data persists but can't be read until the quota resets at UTC midnight. Verify the quota has reset before your live smoke; if still exceeded, the match data surfaces will be empty (this is a pre-existing infrastructure issue, NOT a code issue).**

## Step 2 — Mandatory reading order (all in the repo)

1. `AGENTS.md` (repo root — the operating contract; sections 5-7 govern git/secrets/deploy)
2. `sportsignal-seo-implementation/README.md`
3. `sportsignal-seo-implementation/AGENT-INSTRUCTIONS.md` (the master execution contract)
4. `sportsignal-seo-implementation/PRODUCT-AND-SEO-STRATEGY.md` + `MASTER-SEO-SPEC.md` (§2-3 eligibility; §5 technical requirements; §6 the homepage/featured-match/window spec — the curated-selection promise, the one-month horizon, the domestic-first-then-UCL ordering, the featured-match = nearest upcoming editorially approved fixture; §10 Cloudflare guardrails)
5. `sportsignal-seo-implementation/GSC-AUDIT-BASELINE.md` (the homepage's GSC row: 1 URL / 8 clicks / 267 impr / 3.00% CTR; the «بازی بعدی بارسا» 179 impr pos 9.97, «بازی بعدی بایرن مونیخ» 37 impr pos 7.49, «برنامه بازی‌های لیگ قهرمانان اروپا» 14 impr pos 9.36 next-match/schedule heads)
6. `sportsignal-seo-implementation/phases/SESSION-06-HOMEPAGE-FEATURED-MATCH-AND-WINDOW.md` (this session's scope)
7. `seo-implementation/audit/REPOSITORY-AND-TECHNICAL-AUDIT.md` (Session 1: the architecture, the homepage render path, C5 the empty-hub tradeoff; §12-13)
8. `seo-implementation/audit/CLOUDFLARE-RESOURCE-BASELINE.md` (the budget every change must state)
9. `seo-implementation/architecture/ROUTE-AND-CANONICAL-PLAN.md` (Session 3: §5 empty hubs stay indexable — the `/matches/tomorrow` best-CTR 8.26% surface with honest empty state; the homepage canonical; §10 sequencing)
10. `seo-implementation/architecture/INDEXABILITY-MATRIX.csv` (the homepage row + the `/matches/tomorrow` row)
11. `seo-implementation/session-reports/SESSION-05.md` + `SESSION-04.md` + `SESSION-03.md` (the inherited state — the lifecycle mechanism, the C1/C6/C8 foundation, the architecture)
12. `sportsignal-seo-implementation/IMPLEMENTATION-TRACKER.md` (progress source of truth)
13. `docs/RUNBOOK.md` §2 (the deploy ritual) — and re-check `docs/HANDOFF.md` for the current state (the KV quota issue + the lifecycle first-run deferral)

## Step 3 — Session 1-5 facts you must build on (verified; do not re-audit)

**Architecture (Session 1, live-verified):** Cloudflare Worker `ucl-notifier`, TypeScript, zero framework; SSR HTML from KV only (`getSeoCtx`: payload + pool + overlay); hand-rolled router (`src/seo/router.ts`); npm test = `tsc --noEmit` + 50 check scripts (**baseline now 3,652 OK** — Session 5 added `scripts/check-seo-match-lifecycle.js`, 23 gates); versioned deploys (`npx wrangler versions upload` → `versions deploy --version-id <id> --percentage 100 --yes`); rollback via `npx wrangler rollback`.

**The homepage machinery you inherit (all verified live before the KV quota issue):**
- The homepage is the ONE page that DOES load client JS (`assets/public-13.80.js` + `core-13.15.js` + `public-13.87.css`); every other SEO page is complete server HTML. The homepage template lives in `src/pages/public.ts` (the SSR shell) + the client bundle (the interactive carousel, the live-card poll, the hero portraits).
- The featured match = the nearest upcoming editorially approved fixture (`upcomingBig(ctx)` sorted by kickoff, live-first; the `pickHeroMatch` / `pickHeroMatches` selectors in `src/match-classify.ts`).
- The homepage lists upcoming BIG matches via `upcomingBig(ctx)` with a **92-day horizon** (NOT one month — the spec says "up to one month ahead" but the code uses 92 days; Session 6 must reconcile this: either narrow the horizon to 30 days per the spec, or document the 92-day choice as the deliberate wider window).
- The hero carousel (`pickHeroMatches`) shows highlighted matches that share the same day/night grouping; the `.mc-port` portraits serve the same `heroArtFor()` HERO_ART desktop library (the v13.197 one-image-set round).
- The `/matches/tomorrow` hub (ROUTE-AND-CANONICAL-PLAN §5) is the best-CTR surface (8.26%) WITH an honest empty state — it STAYS indexable (C5 deliberate tradeoff).
- The homepage canonical: self-canonical at `/` (no query); the `__SEO_ROBOTS__` placeholder replaced at render with `index, follow…` on prod / `noindex, nofollow` on non-prod.
- The homepage GSC (2026-11-15 export): 1 URL / 8 clicks / 267 impr / 3.00% CTR. The next-match heads («بازی بعدی بارسا» 179 impr, «بازی بعدی لیورپول» 24 impr, «بازی بعدی آرسنال» 14 impr) are real demand — the homepage title/H1 should orient to these.

**Session 4's deployed foundation (do not regress):** `isSelectedTeam` (C1 — only 13 selected clubs get indexable team pages + teams.xml rows); `guardNonProdMachineFile` (C6); C8 = record-and-skip (do NOT re-attempt the `s-maxage` fix).

**Session 5's lifecycle mechanism (do not regress — test-pinned in `check-seo-match-lifecycle.js`):** `isSeasonEndedOrdinary(sm)` (pure predicate, flag false by default); `isMarqueeMatch(sm)` (M1-M5); `HeadInput.noindex` field + `buildHead` robots derivation; the sitemap archive filter; `MARQUEE_MATCH_SLUGS` (51 GSC click-earner slugs); `SEASON_END_DATES` (empty map); `SEASON_END_NOINDEX_ENABLED = false`.

**What NOT to touch:** the top-3-standings route STAYS; `?page=N≥2` self-canonical policy stays; no bulk redirects (route plan §9); no robots.txt growth; no hreflang/EN URLs (Session 12); **team-page titles + GSC-measured surfaces + team-name spellings byte-frozen through Dec 4-8, 2026** (the homepage title/H1 ARE GSC-measured surfaces — any copy change must be justified against the GSC evidence and verified with a page diff; the Dec 4-8 freeze applies); avoid deploys in any remaining Nov 20 Bayern–Köln S27 auto-verify windows (kickoff 19:30 UTC; M1 ~19:35, M2 ~21:35-45 UTC — check the date before you deploy); Cloudflare free tier is the budget (KV writes ~330/day of 1,000; ~50 subrequests/tick; the 10ms CPU cliff on cold renders — C7; **the KV read quota (100,000/day) was exceeded at Session 5 close — investigate before deploying**).

## Step 4 — Session 6 scope (from the phase file + the blueprint)

1. **Trace the homepage surfaces** (read-first, no code): the SSR shell in `src/pages/public.ts`, the client bundle's carousel + live-card + hero-portrait logic, the `upcomingBig(ctx)` feed, the `pickHeroMatch`/`pickHeroMatches` selectors, the `__SEO_ROBOTS__` placeholder, the title/H1/meta copy. Identify where the 92-day horizon vs the spec's "one month" divergence lives.
2. **Update the Persian + English title/H1/meta copy** based on the validated keyword map (`seo-implementation/keyword-research/KEYWORD-TO-URL-MAP.md` — the homepage cluster). The curated-selection promise must be explicit (not every fixture is listed — the 13 selected clubs + the 4-route coverage). **The Dec 4-8 freeze applies to GSC-measured surfaces — if the homepage title/H1 bytes change, verify with a page diff and record the before/after GSC position.**
3. **The featured-match logic**: confirm `pickHeroMatch` = the nearest upcoming editorially approved fixture (live-first, then by kickoff). The carousel groups highlighted matches by day/night — verify the grouping is accessible (crawlable anchor links, no JS-only navigation) and that the carousel stays crawlable (the cards carry real `<a href>` links to the match pages).
4. **The one-month window**: reconcile the 92-day horizon with the spec's "up to one month ahead." Either narrow to 30 days (the spec) or document the 92-day choice. Display domestic leagues first, then Champions League, then other covered competitions/cups. Preserve CL editorial importance through featured treatment, NOT an incorrect list ordering.
5. **The `/matches/tomorrow` hub**: it STAYS indexable (C5). Verify the honest empty state (no unsupported live-score or full-coverage claim). The hub is the best-CTR surface (8.26%) — do not regress it.
6. **Crawlable anchor links**: every fixture card must carry a real `<a href>` to the match page (no JS-only navigation). Verify the carousel cards, the list rows, and the featured-match card all have crawlable links.
7. **Metadata + H1 agreement**: the title, H1, and visible copy must agree (no keyword stuffing, no unsupported claims). The Persian copy is the canonical surface; the English is a client-side toggle (Session 12 owns the EN/hreflang architecture).

## Step 5 — Git, tests, deploy rules for this session

- `npm install` (npm only, never bun) and `npm test` before your push; the suite must exit 0 (baseline **3,652 OK** — your new checks increase the count; record the new number).
- If runtime code changed: `npm test` → `npx wrangler dev` local smoke of the changed behavior → **versioned deploy** (`CLOUDFLARE_API_TOKEN=… CLOUDFLARE_ACCOUNT_ID=a796fdfe… npx wrangler versions upload` → `npx wrangler versions deploy --version-id <id> --percentage 100 --yes`) → verify live (the homepage 200 + title/H1/meta agree + the featured match + the one-month list + the carousel links + `/healthz` budget before/after) → record the deployment ID. Rollback = `npx wrangler rollback`. If NO runtime change (copy/docs only), no deploy — say so explicitly.
- Deploy-time ritual detail: state the Cloudflare budget of every change; `/healthz` before/after; **verify the KV read quota has reset** (the Session 5 close had it exceeded — if still exceeded, the homepage's match data will be empty; wait for UTC midnight or document the limitation); version bump per the repo convention (version triple + the check-stats pins ride forward + CHANGELOG entry) if code changed.
- Checkpointed commits with `seo(s06): …` messages; push one-shot with the token; fetch before push; verify with `git ls-remote`. Never force-push, never stage unrelated files, never commit secrets.
- End with the repo-convention updates (AGENTS.md §10): `docs/HANDOFF.md`, `CHANGELOG.md`, `docs/DECISIONS.md` (every copy change and why; the horizon reconciliation decision), then the TLDR report in your final response with the full Session 7 prompt pasted for the owner.

## Step 6 — Standing constraints (carry into every session)

- Measurement freeze: GSC-measured surfaces + team-name spellings byte-frozen through **Dec 4-8, 2026**. The homepage title/H1 ARE GSC-measured surfaces — copy changes must be justified and diff-verified.
- Cloudflare free tier is the budget (KV writes ~330/day of 1,000; ~50 subrequests/tick; 10ms CPU cliff on cold renders — C7; **KV reads 100,000/day — was exceeded at Session 5 close**). Every change states its budget. No new KV write paths without a change-only discipline; no render-cost additions.
- GSC impressions are site impressions, not market volumes. Do not model traffic upside without stated assumptions.
- Do not start Session 7 work in this session; do not execute later sessions' scopes (match-detail metadata = 7; team-page content = 8; competition/date pages = 9).
- If the same approach fails three times, change approach; if genuinely blocked (missing credential, broken production, unverifiable risk), stop and say so with the exact blocker — never fabricate work, commits, test outcomes, or GSC results.
