# SportSignal SEO Program — Session 5 Start Prompt (Match URL Lifecycle and Seasonal Indexing)

Read AGENTS.md in the repo root first and follow it for the whole session.

You are the implementation agent for the SportSignal SEO project, Session 5 of 15: **match URL lifecycle and seasonal indexing**. Sessions 1-4 produced the audit, the validated keyword map, the approved architecture blueprint, and the deployed crawl/index foundation (C1/C6 live). This session gives match-detail URLs a safe, evidenced lifecycle so the site does not continuously accumulate low-value indexable pages — while protecting the historical assets that carry the site's clicks.

## Step 0 — Credentials (supplied by the owner at session start; never commit them)

The owner provides per session: a GitHub classic token (repo push) and a Cloudflare API token + account ID (deploy). Use credentials only in the environment / one-shot push URL (`git push https://x-access-token:<token>@… main`), never in git config, files, commits, logs or reports. If something you need is missing, say so and proceed with what exists — never fabricate. **A fresh GSC export (ideally 16 months, with URL-level page samples and the queries×pages matrix) remains the program's top evidence request — for this session it would turn the MATCH-URL-CLASSIFICATION deliverable from a safe-sample into the full per-URL demand table, and it unlocks S1/S4 (the URL identities behind the crawled/discovered-not-indexed counts).**

## Step 1 — Repository

- Repository: `https://github.com/assadigit/SportSignal` (verify the actual `git remote -v`; the owner also writes `assadigit/sportsignal` — same repo).
- Branch: `main` only. Session 4 closed with the foundation release `2a405f7`, the C8 record-and-skip revert `c805910`, and the session close-out commit (run `git log --oneline -8` to confirm HEAD; the tracker's Session 04 row records the session's commits).
- Clone fresh, verify `git status` is clean, and confirm no uncommitted concurrent-agent work (if any exists: preserve it, isolate your changes, never reset/clean/force-push).
- Live production site: `https://sportsignal.ir` (Worker `ucl-notifier`, versioned deploys only). This session DEPLOYS if (and only if) it makes runtime changes — through the repo's established ritual only.

## Step 2 — Mandatory reading order (all in the repo)

1. `AGENTS.md` (repo root — the operating contract; sections 5-7 govern git/secrets/deploy)
2. `sportsignal-seo-implementation/README.md`
3. `sportsignal-seo-implementation/AGENT-INSTRUCTIONS.md` (the master execution contract)
4. `sportsignal-seo-implementation/PRODUCT-AND-SEO-STRATEGY.md` + `MASTER-SEO-SPEC.md` (**§4 is this session's law: the lifecycle phases A-D, the three separated concerns, the thresholds rule — record chosen thresholds in `MATCH-LIFECYCLE-POLICY.md` BEFORE implementing**; §2-3 eligibility; §5 technical requirements; §10 Cloudflare guardrails)
5. `sportsignal-seo-implementation/GSC-AUDIT-BASELINE.md`
6. `sportsignal-seo-implementation/phases/SESSION-05-MATCH-LIFECYCLE-AND-SEASONAL-INDEXING.md` (this session's scope)
7. `seo-implementation/audit/REPOSITORY-AND-TECHNICAL-AUDIT.md` (Session 1: the architecture, the C1-C8/S1-S4 register — **C4 is yours** (the 159-not-found class, already mitigated by the archive serve; your job is the policy formalization), §12-13)
8. `seo-implementation/audit/CLOUDFLARE-RESOURCE-BASELINE.md` (the budget every change must state)
9. `seo-implementation/audit/CRAWL-INDEX-CHANGELOG.md` (Session 4: what just changed live — C1/C6/C8; your work must not regress any of it)
10. `seo-implementation/architecture/ROUTE-AND-CANONICAL-PLAN.md` (Session 3: §9 redirect policy — no bulk redirects ever; the top-3-route decision §3 STAYS; sequencing §10)
11. `seo-implementation/architecture/INDEXABILITY-MATRIX.csv` (rows 16-17 are this session's: match detail covered fixture + the out-of-pool/out-of-archive 404 class)
12. `seo-implementation/session-reports/SESSION-01.md` + `SESSION-02.md` + `SESSION-03.md` + `SESSION-04.md`
13. `sportsignal-seo-implementation/IMPLEMENTATION-TRACKER.md` (progress source of truth)
14. `docs/RUNBOOK.md` §2 (the deploy ritual) — and re-check `docs/HANDOFF.md` for the current state

## Step 3 — Session 1-4 facts you must build on (verified; do not re-audit)

**Architecture (Session 1, live-verified):** Cloudflare Worker `ucl-notifier`, TypeScript, zero framework; SSR HTML from KV only (`getSeoCtx`: payload + pool + overlay); hand-rolled router (`src/seo/router.ts`); npm test = `tsc --noEmit` + 49 check scripts (**baseline now 3,628 OK** — Session 4 added `scripts/check-seo-crawlindex.js`, 13 gates); versioned deploys (`npx wrangler versions upload` → `versions deploy --version-id <id> --percentage 100 --yes`); rollback via `npx wrangler rollback`. **Current live: `13.260.1-teamidx`, deployment `7d92e633-5b78-41ad-ac60-6dbbe6d2728d` @100%** (= repo HEAD at Session 4 close-out).

**The match-page lifecycle machinery you inherit (all verified live):**
- **The pool** (`matches_v13_tracked`, `src/match-pool.ts`) retains finished matches ~7 days; upcoming up to a 92-day horizon. 324 matches at the Session 4 close.
- **The archive** (`seo_archive_v1`, 365-day, `src/seo/files.ts` syncArchive): every finished BIG match appends (change-only KV writes); `findArchivedMatchBySlug` serves the page after the pool drops it — the S28 fix that turned the 159-not-found GSC class into 151 live 200s (archive rows in `matches-archive.xml`). Archive pages hold their render 6h (`ARCHIVE_PAGE_TTL` — the C7 CPU-cliff mitigation; do not shorten).
- **Eligibility** (the 4-route coverage law): a match page exists when the fixture passes `isBigForSeo` (selected club OR top-3-standings — **the top-3 route STAYS, Session 3 decision**) or `s.big` (derby/QF+ knockout classes). `upcomingBig` / `finishedRecent(30)` / `similarMatches` / `relatedMatches` drive lists and links.
- **Sitemaps:** index + 5 children, **309 URLs live** (pages 15 / competitions 7 / **teams 13** / matches-upcoming 123 / matches-archive 151); honest change-only lastmods (`seo_lastmod_v1`); IndexNow pings changed URLs only (15-min rate limit + parked-URL drain — do not break).
- **Canonicals:** every page self-canonical; 404 emits none (F-L1); custom 404 = noindex, follow + links home/today/matches/sitemap. Unknown/outranged slugs 404 correctly (T-06).
- **GSC (2026-11-15 export, the only demand source):** match-detail pages = 264 URLs / 190 clicks / 6,338 impr / 3.00% CTR — MOST of the site's clicks; the head («بارسلونا مقابل منچستر سیتی 2026» 6 clicks pos 3.25) and the passive one-off matchup heads (Atalanta–Kairat 329 impr pos 12.36) are both real demand classes the lifecycle must protect differently. GSC impressions are site metrics, never market volumes; no volume tool has ever been available — never invent volume/CPC/difficulty.

**Session 4's deployed foundation (do not regress — test-pinned in `check-seo-crawlindex.js`):** `isSelectedTeam` (`src/seo/data.ts`) — only the 13 selected clubs get indexable team pages + teams.xml rows; non-selected team pages serve `noindex, follow` (200 + self-canonical + all links — the noindex-must-stay-crawlable law); `guardNonProdMachineFile` (C6 — non-prod machine files noindex, production clean, applied post-cache); C8 = **record-and-skip, do NOT re-attempt** the `s-maxage` fix (measured 2026-11-16: the Workers free-plan edge floor overrides both `max-age` and `s-maxage` on Cache API entries — evidence in CRAWL-INDEX-CHANGELOG §C8; the client-side staleness vector is flagged for the owner, out of program scope unless the owner says otherwise).

**What NOT to touch:** the top-3-standings route STAYS; `?page=N≥2` self-canonical policy stays (S2 still unverifiable — no fresh GSC export; do not change policy on suspicion); no bulk redirects (route plan §9); no robots.txt growth (the crawlability law is test-pinned); no hreflang/EN URLs (Session 12); team-page titles + GSC-measured surfaces byte-frozen through **Dec 4-8, 2026** (match-page title/description bytes are frozen surfaces too — Session 7 owns them; your lifecycle changes are robots-meta/sitemap/list-membership level ONLY, verified by page diff); **avoid deploys in any remaining Nov 20 Bayern–Köln S27 auto-verify windows** (kickoff 19:30 UTC; M1 ~19:35, M2 ~21:35-45 UTC — check the date before you deploy); Cloudflare free tier is the budget (KV writes ~330/day of 1,000; ~50 subrequests/tick; the 10ms CPU cliff on cold renders — C7 — every change states its budget).

## Step 4 — Session 5 scope (from the phase file + the blueprint)

1. **Trace the lifecycle surfaces** (read-first, no code): where match URLs are created (`buildMatchPage` + the 4-route eligibility), how match/competition/season state is represented in the pool rows + archive records (status, utcDate, competition.code, stage — what survives the archive shape and what does not), where lists and links include/exclude finished matches (homepage, hubs, team pages, `similarMatches`/`relatedMatches`), and how the two matches sitemap children draw their rows.
2. **Write `seo-implementation/architecture/MATCH-LIFECYCLE-POLICY.md` FIRST** (MASTER-SEO-SPEC §4's rule: thresholds recorded BEFORE implementation): the phase A/B/C/D mapping onto this codebase's real state model; the chosen season-boundary definition (competition season close dates as represented in the data — do not invent dates); the keep-indexable evidence thresholds (GSC clicks/impressions windows from the 2026-11-15 export as the available evidence base; state every threshold's rationale in terms of that evidence; flag which thresholds a fresh GSC export would refine); the noindex transition rule (robots-meta level only, like C1 — never robots.txt, never 404/301 for ordinary season-end pages); the marquee-retention rule (the PSG–Barcelona class: demonstrated demand, editorial value, evergreen matchup intent); the owner-approval point for the first actual season-end run (the 2025-26 European season is already closed — the first application is a real decision with real URL-level effects; propose, do not execute, the first batch unless the owner explicitly approves it in-session).
3. **Build `seo-implementation/audit/MATCH-URL-CLASSIFICATION.csv`** from the real live data (machine-derived): the current match-URL universe (upcoming 123 + archive 151 at minimum) × classification (season, competition, selected-club involvement, big-vs-ordinary route, the available GSC demand per URL from the 2026-11-15 export where present) × the policy's proposed disposition. If URL-level GSC demand is missing for some rows, mark them honestly (the export is partial) — this is the safe-sample path the phase file allows.
4. **Implement the lifecycle mechanics the architecture actually needs** — smallest surface: the season-end noindex transition + sitemap-row removal + current-list removal for ordinary pages, and the marquee retention. ONLY IF a batch is needed to apply it, design it bounded/idempotent/resumable (MASTER-SEO-SPEC §4 Phase C + §10: prefer an existing job or a manual admin action; no per-match cron; no unbounded sweeps). If the policy's first real application is deferred to the owner's approval, ship the MECHANISM + tests and record that the first run awaits approval.
5. **Indexability-transition tests** (repo convention: a new `scripts/check-*.js` wired into `npm test`): a fixture proves upcoming → completed → season-end ordinary = noindex + sitemap removal + page still 200 + no robots blocking; marquee retention stays indexable; invalid/unknown slug still 404s (T-06 contract); the C1/C6 gates from Session 4 still pass.
6. **The 404 class formalization** (matrix row 17): the custom 404 + the archive-serve fallback stay the correct dispositions — document them as the terminal states in the policy; no bulk redirects, no deletions (data retention is decided separately from index eligibility — MASTER-SEO-SPEC §4's three separated concerns).

**Deliverables (exact paths):**
- `seo-implementation/architecture/MATCH-LIFECYCLE-POLICY.md` (thresholds + rationale)
- `seo-implementation/audit/MATCH-URL-CLASSIFICATION.csv` (machine-derived, honest evidence column)
- Code changes for the lifecycle mechanics (smallest surface; `src/` only where needed)
- The transition test script (wired into `npm test`; record the new OK count — baseline 3,628)
- Plus the program contract: tracker Session 05 row, `seo-implementation/session-reports/SESSION-05.md`, the rewritten `seo-implementation/next-session-prompt.md` (Session 6 — homepage/featured match/window), printed in full in your final response.

**Acceptance criteria (from the phase file):** a test fixture proves upcoming → completed → season-end ordinary noindex; marquee page retention; invalid URL response; correct sitemap removal; no robots blocking; no destructive data deletion; resource impact measured or explicitly unchanged. Build and tests pass; no bulk redirects or mass deindexing without URL-level evidence.

## Step 5 — Git, tests, deploy rules for this session

- `npm install` (npm only, never bun) and `npm test` before your push; the suite must exit 0 (baseline **3,628 OK** — your new checks increase the count; record the new number).
- If runtime code changed: `npm test` → `npx wrangler dev` local smoke of the changed behavior (a fixture match through the transition) → **versioned deploy** (`CLOUDFLARE_API_TOKEN=… CLOUDFLARE_ACCOUNT_ID=a796fdfe… npx wrangler versions upload` → `npx wrangler versions deploy --version-id <id> --percentage 100 --yes`) → verify live (a sampled noindexed page 200 + `noindex, follow` + self-canonical; sitemap children counts; `/healthz` budget before/after) → record the deployment ID. Rollback = `npx wrangler rollback`. If NO runtime change (policy + classification + tests only), no deploy — say so explicitly.
- Deploy-time ritual detail: state the Cloudflare budget of every change; `/healthz` before/after; version bump per the repo convention (version triple + the check-stats pins ride forward + CHANGELOG entry) if code changed.
- Checkpointed commits with `seo(s05): …` messages; push one-shot with the token; fetch before push; verify with `git ls-remote`. Never force-push, never stage unrelated files, never commit secrets.
- End with the repo-convention updates (AGENTS.md §10): `docs/HANDOFF.md`, `CHANGELOG.md`, `docs/DECISIONS.md` (every threshold chosen and why; the first-run deferral if that's the call), then the TLDR report in your final response with the full Session 6 prompt pasted for the owner.

## Step 6 — Standing constraints (carry into every session)

- Measurement freeze: GSC-measured surfaces + team-name spellings byte-frozen through **Dec 4-8, 2026**. Lifecycle changes are robots-meta/sitemap/list level — verify with a page diff that no title/H1/description byte changed.
- Cloudflare free tier is the budget (KV writes ~330/day of 1,000; ~50 subrequests/tick; 10ms CPU cliff on cold renders — C7). Every change states its budget. No new KV write paths without a change-only discipline; no render-cost additions.
- GSC impressions are site impressions, not market volumes. Do not model traffic upside without stated assumptions.
- Do not start Session 6 work in this session; do not execute later sessions' scopes (homepage/window = 6; match-detail metadata = 7; team-page content = 8; competition/date pages = 9).
- If the same approach fails three times, change approach; if genuinely blocked (missing credential, broken production, unverifiable risk), stop and say so with the exact blocker — never fabricate work, commits, test outcomes, or GSC results.
