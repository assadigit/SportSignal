# SportSignal SEO Program — Session 4 Start Prompt (Crawl, Index, Canonical, Sitemap and Redirect Foundation)

Read AGENTS.md in the repo root first and follow it for the whole session.

You are the implementation agent for the SportSignal SEO project, Session 4 of 15: **crawl, index, canonical, sitemap and redirect foundation** — the FIRST implementation session of the program. Sessions 1-3 produced the audit, the validated keyword map, and the approved architecture blueprint; this session turns the blueprint's foundation items into verified production code.

## Step 0 — Credentials (supplied by the owner at session start; never commit them)

The owner provides per session: a GitHub classic token (repo push) and a Cloudflare API token + account ID (deploy). Use credentials only in the environment / one-shot push URL (`git push https://x-access-token:<token>@… main`), never in git config, files, commits, logs or reports. If something you need is missing, say so and proceed with what exists — never fabricate. **A fresh GSC export (ideally 16 months, with URL-level page samples and the queries×pages matrix) remains the program's top evidence request — it would unlock the S1/S4 URL-identity questions and the S2 pagination-verification task below.**

## Step 1 — Repository

- Repository: `https://github.com/assadigit/SportSignal` (verify the actual `git remote -v`; the owner also writes `assadigit/sportsignal` — same repo).
- Branch: `main` only. Session 3 closed with its deliverables commit + the session close-out commit (run `git log --oneline -8` to confirm HEAD; the tracker's Session 03 row records the session's commits).
- Clone fresh, verify `git status` is clean, and confirm no uncommitted concurrent-agent work (if any exists: preserve it, isolate your changes, never reset/clean/force-push).
- Live production site: `https://sportsignal.ir` (Worker `ucl-notifier`, versioned deploys only). This session DOES deploy — through the repo's established ritual only.

## Step 2 — Mandatory reading order (all in the repo)

1. `AGENTS.md` (repo root — the operating contract; sections 5-7 govern git/secrets/deploy)
2. `sportsignal-seo-implementation/README.md`
3. `sportsignal-seo-implementation/AGENT-INSTRUCTIONS.md` (the master execution contract)
4. `sportsignal-seo-implementation/PRODUCT-AND-SEO-STRATEGY.md` + `MASTER-SEO-SPEC.md` (§2-3 page-eligibility law, §4 lifecycle, §5 technical requirements)
5. `sportsignal-seo-implementation/GSC-AUDIT-BASELINE.md`
6. `sportsignal-seo-implementation/phases/SESSION-04-TECHNICAL-CRAWL-INDEX-FOUNDATION.md` (this session's scope)
7. `seo-implementation/audit/REPOSITORY-AND-TECHNICAL-AUDIT.md` (Session 1: the verified architecture, the C1-C8/S1-S4 register, §12 live-verification record, §13 deploy ritual)
8. `seo-implementation/audit/CLOUDFLARE-RESOURCE-BASELINE.md` (the budget every change must state)
9. `seo-implementation/keyword-research/KEYWORD-VALIDATION-REPORT.md` (§6 one-URL rules — the mapping law your changes must not break)
10. `seo-implementation/keyword-research/KEYWORD-TO-URL-MAP.md` (Session 3: 15 URL classes, owner rules, the metadata plans)
11. `seo-implementation/architecture/INDEXABILITY-MATRIX.csv` (Session 3: every route class × disposition × evidence × implementing session — **your worklist**)
12. `seo-implementation/architecture/ROUTE-AND-CANONICAL-PLAN.md` (Session 3: canonical strategy per class, the C1 disposition plan §2, pagination policy §4, sitemap plan §6, sequencing §10 — **your implementation spec**)
13. `seo-implementation/session-reports/SESSION-01.md` + `SESSION-02.md` + `SESSION-03.md`
14. `sportsignal-seo-implementation/IMPLEMENTATION-TRACKER.md` (progress source of truth)
15. `docs/RUNBOOK.md` §2 (the deploy ritual) — and re-check `docs/HANDOFF.md` for the current state

## Step 3 — Session 1-3 facts you must build on (verified; do not re-audit)

**Architecture (Session 1, all live-verified):** Cloudflare Worker `ucl-notifier`, TypeScript, zero framework; SSR HTML from KV (the SEO layer reads only KV — `getSeoCtx`: payload + pool + overlay, no request-time provider fetches); hand-rolled router (`src/seo/router.ts`); npm test = `tsc --noEmit` + 48 check scripts (baseline **3,615 OK**); deploy = versioned (`npx wrangler versions upload` → `versions deploy --version-id <id> --percentage 100 --yes`); rollback via `npx wrangler rollback`. Host normalization already complete and verified (6 single-hop 301s: http→https, www→apex, football→apex, trailing-slash, uppercase, `/public`→`/`). robots.txt = `Allow: /` + `Disallow: /admin` + sitemap line (correct; `/api/` deliberately crawlable). Self-canonical on every HTML page (`src/seo/page-shell.ts:33-40`); `?page=1`/bare path → `/matches`, `?page=N≥2` self-canonical WITH the query (SS-03 policy — Session 3 decided: KEEP). Sitemap = index + 5 children (`files.ts`): pages 15 / competitions 7 / teams 87 / matches-upcoming 123 / matches-archive 151 = 383 URLs; honest change-only lastmods (`seo_lastmod_v1`); IndexNow pings changed URLs only (15-min rate limit + parked-URL drain — do not break this).

**The C1 problem you are fixing (Session 3 decision, evidence table in ROUTE-AND-CANONICAL-PLAN §2):** `teamsIndex` (`src/seo/data.ts:276-310`) generates team entries for BOTH sides of every eligible pool match. Live: 87 team URLs = 13 selected + 74 non-selected; GSC: 114 non-selected URLs / 8 clicks / 1,297 impr / 0.62% CTR (vs the 13 selected: 8 / 1,159 / 0.69%). **The approved disposition: the 74 non-selected team URLs → `noindex, follow` + removed from `teams.xml` (87 → 13). NEVER robots-blocked, never 404/redirect/deleted — pages keep serving 200, self-canonical, and keep ALL internal links (the `/teams` index tiles, match-page «تیم‌ها» links) so Google can read the noindex.** Implementation options A (preferred: filter the sitemap child + flip the team-page indexable rule via the allowlist; zero marginal KV/subrequest/CPU — an in-memory `CONFIG.BIG_TEAMS_BY_LEAGUE` membership test on data already read) or B (a `teamPageEligibility()` helper per MASTER-SEO-SPEC §3) — both documented in the route plan §2.3. **The selected-club allowlist = 13 European clubs** (machine-verified: Arsenal, Chelsea, Man Utd, Man City, Liverpool / Barcelona, Real Madrid, Atlético Madrid / Inter, Milan / PSG / Bayern, Dortmund — `src/config.ts:38-100`; the live slugs incl. provider-derived `/teams/internazionale-milano` and `/teams/club-atletico-de-madrid` ARE canonical — do not "fix" `TEAM_SLUGS`). A-League (5 clubs) is site-hidden. `teamsIndex` itself MUST keep generating both sides (it powers the `/teams` index page and match-page team links — the crawl path for the noindexed URLs).

**The other confirmed foundation items (audit register + blueprint sequencing):**
- **C6 (do):** non-prod `x-robots-tag: noindex, nofollow` missing on machine files (sitemaps/feed/calendar/matches.json/llms) on workers.dev — HTML pages have it; extend to the machine-file response headers on non-prod hosts only (production must NOT get the header). Low severity, trivial.
- **C8 (optional):** `/api/public-matches` observed with edge `cache-control: public, max-age=14400` (Cloudflare default on the cached JSON) vs the code's 60s intent — harmless for correctness (SWR client); normalize only if it's a one-line cache-header fix, else record and skip.
- **S2 (verify, needs page-level GSC data):** that `?page=2` reports in GSC as its own canonical URL (not consolidated). If no fresh export exists, record as unverifiable and move on — do NOT change the canonical policy on suspicion.
- **404 class:** the custom 404 (noindex, follow + links home/today/matches/sitemap, no canonical — F-L1) is CORRECT for unknown slugs; the 159-not-found GSC class was already mitigated by the S28 archive serve (365-day `seo_archive_v1`; 151 archive URLs 200 + in sitemap). Do not add bulk redirects. Fix internal links to 404 URLs only where the phase's verification identifies a concrete broken link.

**What NOT to touch (Session 3 decisions that bind you):** the top-3-standings route (`isBigForSeo`) STAYS; empty time hubs STAY indexable (C5 resolved); `/teams` + `/competitions` index pages stay indexable; pagination self-canonical policy stays; no new redirects; no hreflang/EN URLs (Session 12); team-page TITLES are byte-frozen (the parked Dec 4 GSC title test) — your noindex change must not alter any title/H1/visible-text byte on any page.

**GSC baseline (2026-11-15 export, the only demand source):** 28-day chart 239 clicks / 9,301 impressions; match-detail pages carry most clicks; `/matches/tomorrow` 18 clicks / 218 impr / 8.26% CTR (best CTR — protect it); 55.8% of impressions / 90.8% of clicks privacy-unattributed. GSC impressions are site metrics, never market volumes; no volume tool has ever been available — never invent volume/CPC/difficulty.

**Repo-internal coordination:** team-name spellings byte-frozen until ~Dec 8; GSC-measured surfaces byte-frozen through **Dec 4-8, 2026** (your changes are robots-meta/sitemap/header-level, NOT frozen-surface bytes — but verify no title/description byte changes with a diff); **avoid deploys in the Nov 20 Bayern–Köln S27 auto-verify windows (kickoff 19:30 UTC; M1 ~19:35, M2 ~21:35-45 UTC)** — schedule your deploy outside them.

## Step 4 — Session 4 scope (from the phase file + the blueprint)

1. **Implement the C1 foundation fix** (the blueprint §2.3): sitemap `teams.xml` 87 → 13 rows (allowlist filter); non-selected team pages serve `noindex, follow` (keep 200 + self-canonical + all internal links). Acceptance: teams.xml lists exactly the 13 selected-club URLs; a sampled non-selected team URL (e.g. `/teams/fulham`) returns 200 + `noindex, follow` + self-canonical; `/teams/barcelona` unchanged (indexable, same title bytes); `/teams` index still lists all pool teams; match pages still link both teams.
2. **C6:** add the non-prod `x-robots-tag: noindex, nofollow` to machine-file responses (verify the guard does NOT apply to production `sportsignal.ir`).
3. **C8 (optional, one-line only):** the `/api/public-matches` edge TTL normalization — or record-and-skip with the reason.
4. **Re-verify the foundation** per the phase file: HTTP/HTTPS + host variants (all already 301 — re-run the matrix live); robots.txt never blocks any noindex target (it must not grow); sitemaps list only canonical/indexable/200 URLs (post-C1 this is fully true for teams — verify no noindex/redirect/404 rows in ANY child); no redirect chains/loops (single-hop only); canonical tags correct on every class (spot-check per the matrix); fix any identified internal link to a 404.
5. **Verify pagination per the blueprint §4:** `?page=N≥2` self-canonical + indexable + clamped; no new query-param surfaces; S2 GSC check only if a fresh export exists.
6. Write `seo-implementation/audit/CRAWL-INDEX-CHANGELOG.md` (the phase deliverable): every change, pre/post sitemap URL counts and samples (pre: teams 87, total 383; post: teams 13, total 309 — machine-count both live before/after).

**Deliverables (exact paths):**
- Code changes for the confirmed issues above (`src/` only where needed — smallest change that fully solves each; no drive-by refactors)
- `seo-implementation/audit/CRAWL-INDEX-CHANGELOG.md`
- Pre/post sitemap URL counts and samples (inside the changelog)
- Plus the program contract: tracker Session 04 row, `seo-implementation/session-reports/SESSION-04.md`, the rewritten `seo-implementation/next-session-prompt.md` (Session 5 — match lifecycle), printed in full in your final response.

**Acceptance criteria (from the phase file):** build and tests pass; canonical, robots and sitemap behaviour verified on production; **no bulk redirects or mass deindexing without URL-level evidence** (the C1 evidence is the per-URL table in the blueprint §2.2 — cite it in the changelog).

## Step 5 — Git, tests, deploy rules for this session

- `npm install` (npm only, never bun) and `npm test` before your push; the suite must exit 0 (baseline 3,615 OK — new checks you add for the C1 filter should increase the count; record the new number).
- This session DEPLOYS: `npm test` → `npx wrangler dev` local smoke of the changed routes (teams sitemap, a non-selected team page, a selected team page) → **versioned deploy** (`CLOUDFLARE_API_TOKEN=… CLOUDFLARE_ACCOUNT_ID=a796fdfe… npx wrangler versions upload` → `npx wrangler versions deploy --version-id <id> --percentage 100 --yes`) → verify live OUTSIDE the Nov 20 windows → record the deployment ID in the tracker/report. Rollback = `npx wrangler rollback`.
- Deploy-time ritual detail: state the Cloudflare budget of every change (the C1 fix is zero-marginal by design — prove it: no new KV reads/writes, no new subrequests, no render-cost change; `/healthz` before/after).
- Checkpointed commits with `seo(s04): …` messages; push one-shot with the token; fetch before push; verify with `git ls-remote`. Never force-push, never stage unrelated files, never commit secrets.
- End with the repo-convention updates (AGENTS.md §10): `docs/HANDOFF.md`, `CHANGELOG.md` (with the version entry if you bump the version string per the repo's deploy convention — follow the existing convention), `docs/DECISIONS.md` (the implementation choices: Option A vs B, any deviation), then the TLDR report in your final response with the full Session 5 prompt pasted for the owner.

## Step 6 — Standing constraints (carry into every session)

- Measurement freeze: GSC-measured surfaces + team-name spellings stay byte-frozen through **Dec 4-8, 2026**. Session 4's changes (robots meta, sitemap rows, headers) are NOT frozen bytes, but verify with a page diff that no title/H1/description byte changed on any page class.
- Avoid deploys around the Nov 20 Bayern–Köln lifecycle-verification windows (kickoff 19:30 UTC; M1 ~19:35, M2 ~21:35-45 UTC).
- Cloudflare free tier is the budget (KV writes ~117/day of 1,000; ~50 subrequests/tick; 10ms CPU cliff on cold renders — the C7 guardrail). Every change states its budget.
- GSC impressions are site impressions, not market volumes. Do not model traffic upside without stated assumptions.
- Do not start Session 5 work in this session; do not execute later sessions' scopes (team-page content is Session 8; competition/date pages are Session 9; lifecycle thresholds are Session 5).
- If the same approach fails three times, change approach; if genuinely blocked (missing credential, broken production, unverifiable risk), stop and say so with the exact blocker — never fabricate work, commits, test outcomes, or GSC results.
