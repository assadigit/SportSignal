# SportSignal SEO Program — Session 3 Start Prompt (Keyword-to-URL Mapping and SEO Architecture)

Read AGENTS.md in the repo root first and follow it for the whole session.

You are the implementation agent for the SportSignal SEO project, Session 3 of 15: **final keyword-to-URL mapping and SEO architecture** — converting Session 2's validated keyword map and Session 1's audit into ONE approved mapping/blueprint document set. This is a planning/documentation session: the phase file's deliverables are the map, an indexability matrix, and a route/canonical plan. Implementation happens in Sessions 4+.

## Step 0 — Credentials (supplied by the owner at session start; never commit them)

The owner provides per session: a GitHub classic token (repo push), and optionally a fresh GSC export and/or keyword-tool access. Use credentials only in the environment / one-shot push URL (`git push https://x-access-token:<token>@… main`), never in git config, files, commits, logs or reports. If something you need is missing, say so and proceed with what exists — never fabricate. **If you can bring a fresh GSC export (ideally 16 months, with URL-level page samples and the queries×pages matrix), Session 3's evidence base upgrades sharply — it is the program's top evidence request (see SESSION-02.md §9.1).**

## Step 1 — Repository

- Repository: `https://github.com/assadigit/SportSignal` (verify the actual `git remote -v`; the owner also writes it as `assadigit/sportsignal` — same repo).
- Branch: `main` only. Session 2 closed with its deliverables commit + the session close-out commit (run `git log --oneline -8` to confirm HEAD; the tracker's Session 02 row records the session's commits).
- Clone fresh, verify `git status` is clean, and confirm no uncommitted concurrent-agent work (if any exists: preserve it, isolate your changes, never reset/clean/force-push).
- Live production site: `https://sportsignal.ir` (Worker `ucl-notifier`). Do not deploy in this session — Session 3 is planning/documentation; any code change you believe is required is a PROPOSAL in the blueprint, not an edit.

## Step 2 — Mandatory reading order (all in the repo)

1. `AGENTS.md` (repo root — the operating contract; sections 5-7 govern git/secrets)
2. `sportsignal-seo-implementation/README.md`
3. `sportsignal-seo-implementation/AGENT-INSTRUCTIONS.md` (the master execution contract)
4. `sportsignal-seo-implementation/PRODUCT-AND-SEO-STRATEGY.md` + `MASTER-SEO-SPEC.md` (§2-3 are the page-eligibility and architecture law your blueprint implements)
5. `sportsignal-seo-implementation/GSC-AUDIT-BASELINE.md`
6. `sportsignal-seo-implementation/phases/SESSION-03-KEYWORD-TO-URL-ARCHITECTURE.md` (this session's scope)
7. `seo-implementation/audit/REPOSITORY-AND-TECHNICAL-AUDIT.md` (Session 1's verified architecture + the C1-C8/S1-S4 issue register)
8. `seo-implementation/keyword-research/KEYWORD-VALIDATION-REPORT.md` (Session 2's validation — §6 one-URL rules, §6.2 cannibalization register, §8 revised priorities, §10 inputs prepared for you)
9. `seo-implementation/keyword-research/VALIDATED-KEYWORD-MAP.csv` (369 unique rows — your mapping input; note the `target_url`, `status`, `priority` columns and the one-URL rules; the 2026-11-16 verification pass removed 5 duplicate rows and fixed one placeholder target — see KEYWORD-VALIDATION-REPORT.md §12)
10. `seo-implementation/keyword-research/SERP-SAMPLES.md` + `EVIDENCE-LOG.md` (format evidence + every evidence source with tool/date/locale)
11. `seo-implementation/session-reports/SESSION-01.md` + `SESSION-02.md`
12. `sportsignal-seo-implementation/IMPLEMENTATION-TRACKER.md` (progress source of truth)

## Step 3 — Session 1+2 facts you must build on (verified; do not re-audit)

**Selected-club allowlist — CORRECTED COUNT: 13 European clubs (not 14 — Session 1 and earlier docs carried a miscount; machine-verified from `src/config.ts:38-100`):** Arsenal, Chelsea, Manchester United, Manchester City, Liverpool (PL); Barcelona, Real Madrid, Atlético Madrid (PD); Inter Milan, AC Milan (SA); Paris Saint-Germain (FL1); Bayern München, Borussia Dortmund (BL1). A-League (5 clubs) is site-hidden. Team-name spellings are byte-frozen until ~Dec 8; the live team-page slugs include the provider-derived `/teams/internazionale-milano` and `/teams/club-atletico-de-madrid` (NOT the pinned `inter-milan`/`atletico-madrid`) — a URL-identity question for you, not a spelling change.

**Current URL architecture (live-verified Session 1):** `/`, `/matches` (+`?page=N`), `/matches/today|tomorrow|this-week|this-weekend`, `/matches/{home}-vs-{away}-{YYYY-MM-DD}` (365-day archive serve), `/teams/{slug}`, `/competitions/{slug}` (7 live: bundesliga, premier-league, serie-a, ligue-1, la-liga, champions-league, dfb-pokal), static pages. Sitemap = index + 5 children, 383 URLs (teams child: 87 URLs — the C1 problem).

**C1 (your central decision):** team pages are generated for BOTH sides of every eligible match (`src/seo/data.ts:276-310`), not from the allowlist — 87 live URLs incl. non-selected clubs; GSC showed 127 team URLs / 16 clicks / 0.65% CTR. Session 2 quantified the split: the 13 selected-club URLs carry 8 clicks / 1,159 impr (0.69% CTR, all 13 present in GSC; Barcelona 564 + Real Madrid 178 = 64% of impressions) vs 114 non-selected URLs with 8 clicks / 1,297 impr (0.62%). Non-selected next-match demand is real but shallow (Brighton 22, Como 21+44, Copenhagen 22, Twente 16, Roma 17, Malavan 13, Fajr Sepasi 13 visible impressions…; Iranian-club demand is out of product scope). The spec's rule (MASTER-SEO-SPEC §2 "Team pages") requires demand/backlink review before noindex/redirect/404 — never blind deletion.

**Match eligibility (verified):** a pool match is covered when it involves a selected club (`shouldReport`, `src/match-classify.ts:162-174`: league lists; CL/cups also QF+), OR — SEO-only — when either side sits in the competition's top-3 standings (`isBigForSeo`, `src/seo/data.ts:112-122`). **184 of 264 (70%)** observed match-detail GSC rows come from that top-3 route (corrected count — Session 2's verification pass; the initial 174/66% figure was a miscount). Your blueprint must say explicitly whether that route stays as the de-facto "independently important match" implementation.

**Language reality:** Persian-first (`lang="fa" dir="rtl"`), Iran 99.2% of country clicks / 92.7% of impressions, mobile 94.8% of clicks. Zero English-query evidence; EN is a client-side toggle with zero hreflang. English work = evidence-led candidates for Session 12 only; your blueprint creates the *plan slots*, never URLs.

**Session 2's mapping law (already encoded in VALIDATED-KEYWORD-MAP.csv — inherit, don't re-litigate without evidence):**
1. Time-qualified → time hub (امروز/امشب→today, فردا→tomorrow, این هفته→this-week, آخر هفته→this-weekend); homepage never competes for time-qualified queries.
2. Club-dominant: one selected club named → that club's team page (incl. club+competition, club+امشب, club+weekday forms).
3. Competition-dominant: league/UCL-qualified (incl. league+امشب) → competition page.
4. Both-clubs matchup → match detail, CONDITIONAL on editorial coverage (selected club / top-3 route / derby / QF+). No hypothetical URLs, ever.
5. Result queries → match detail (post-match; no live promise).
6. Derbies → each covered edition's match page; derby-discovery → homepage.
7. English → future (Session 12), no URL today.
Plus the cannibalization watchlist (7 resolved overlaps — KEYWORD-VALIDATION-REPORT.md §6.2) and the Holds queue for Session 9 (EL/ECL/FA Cup/Copa/Coppa have NO competition pages today; DFB-Pokal is the only live cup page).

**GSC baseline (2026-11-15 export, only demand source):** 28-day chart 239 clicks / 9,301 impressions; match-detail pages carry most clicks; `/matches/tomorrow` 18 clicks / 218 impr / 8.26% CTR (best CTR surface); top query «بارسلونا مقابل منچستر سیتی 2026» 6 clicks / pos 3.25; the #1 clicking query overall is a broadcast-intent query we deliberately exclude. 55.8% of impressions / 90.8% of clicks are privacy-unattributed. GSC impressions are site metrics, never market volumes; no volume tool has ever been available in this program — never invent volume/CPC/difficulty.

**Repo-internal overlaps to respect:** parked team-page title test (Dec 4 GSC gate) — your blueprint schedules any team-page title work AFTER that gate; team-name spelling freeze until ~Dec 8; the S27 auto-verify windows around Bayern–Köln Nov 20 19:30 UTC (avoid deploys).

## Step 4 — Session 3 scope (from the phase file)

1. Select one primary keyword/intent cluster per canonical URL (build from the validated map's clusters — do not fragment into per-phrase targeting; confirm no page exists solely for a keyword variant).
2. Produce the full mapping across: homepage, the four time hubs + `/matches` (+pagination/`?page=N` policy), 5 domestic league pages + UCL + DFB-Pokal, the 13 selected-club team pages, and match-detail pages (conditional eligibility). Decide the fate of every CURRENT route class, including: the 87-URL teams sitemap (C1), non-selected team URLs (per-URL disposition with the demand evidence), `?page=N` canonicalization, empty-hub indexability (C5), and the `/teams`, `/competitions` index pages.
3. Decide indexable / noindex / redirect / removed for each existing route CLASS with evidence (GSC rows, the audit's C/S register, Session 2's demand tables). No blind deletion; a `noindex` must stay crawlable (never robots-blocked).
4. Resolve the overlaps the phase file names (matches vs date routes vs pagination vs query params) using Session 2's one-URL rules; document any case where you deviate and why.
5. Create the content/metadata map for Persian and English separately (titles/H1/meta per URL class — as PLAN; the freeze means no live title changes before the Dec 4-8 gates; English = plan slots only).
6. Cross-check the blueprint against the live routes (spot-verify anything you rely on that Sessions 1-2 did not already verify; don't re-audit wholesale).

**Deliverables (exact paths):**
- `seo-implementation/keyword-research/KEYWORD-TO-URL-MAP.md` (the mapping: URL class → primary cluster → representative phrases → title/H1/description plan → owner rule)
- `seo-implementation/architecture/INDEXABILITY-MATRIX.csv` (every existing route class × disposition: index/noindex/redirect/404 × evidence × session that implements it)
- `seo-implementation/architecture/ROUTE-AND-CANONICAL-PLAN.md` (canonical strategy per class, pagination/query-param policy, the C1 team-page disposition plan with its evidence table, the top-3-standings route decision, hreflang stance pending Session 12)

**Acceptance criteria (from the phase file):** every indexable URL class has a clear purpose, target intent, owner rule and canonical strategy; team and match eligibility follows the editorial allowlist/exception model; the plan is reviewed against existing routes before implementation.

Also per the program contract: update `sportsignal-seo-implementation/IMPLEMENTATION-TRACKER.md` (Session 03 row), write `seo-implementation/session-reports/SESSION-03.md` (AGENT-INSTRUCTIONS §9), and replace `seo-implementation/next-session-prompt.md` with the complete standalone Session 4 prompt (crawl/index/canonical/sitemap/redirect foundation — Session 4 is the first implementation session), printed in full in your final response.

## Step 5 — Git, tests, deploy rules for this session

- Docs/planning only: **no `src/`, `assets/`, config or workflow changes.** If you believe a code change is required, it goes into the blueprint as a proposal with its Cloudflare free-tier budget (KV reads/writes, subrequests, CPU — see `seo-implementation/audit/CLOUDFLARE-RESOURCE-BASELINE.md`), never as an edit.
- Run `npm install` (npm only, never bun) and `npm test` before your push; the suite must exit 0 (baseline 3,615 OK). No deploy (no runtime change) — state this explicitly in the report.
- Checkpointed commits with `seo(s03): …` messages; push one-shot with the token; fetch before push; verify with `git ls-remote`. Never force-push, never stage unrelated files, never commit secrets.
- End with the repo-convention updates (AGENTS.md §10): `docs/HANDOFF.md`, `CHANGELOG.md` (docs-only entry, no version bump), `docs/DECISIONS.md` (every non-obvious disposition call, esp. the C1 decision rationale), then the TLDR report in your final response with the full Session 4 prompt pasted for the owner.

## Step 6 — Standing constraints (carry into every session)

- Measurement freeze: GSC-measured surfaces + team-name spellings stay byte-frozen through **Dec 4-8, 2026**. Your blueprint may PLAN title/metadata changes; implementation of frozen-surface changes must be scheduled after the gates.
- Avoid deploys around the Nov 20 Bayern–Köln lifecycle-verification windows (kickoff 19:30 UTC).
- Cloudflare free tier is the budget (KV writes ~117/day of 1,000; ~50 subrequests/tick; 10ms CPU cliff). Every proposed implementation item must state its budget.
- GSC impressions are site impressions, not market volumes; average position is aggregated. Do not model traffic upside without stated assumptions.
- Do not start Session 4 work in this session; do not execute later sessions.
