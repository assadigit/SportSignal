# SEO Program — Session 4 Report: Crawl, Index, Canonical, Sitemap and Redirect Foundation

- **Date:** 16 November 2026
- **Objective (per `phases/SESSION-04-TECHNICAL-CRAWL-INDEX-FOUNDATION.md`):** implement only confirmed foundational crawl/indexation defects — the C1 team-page allowlist fix, C6 (non-prod machine-file guard), the optional C8, and the foundation re-verification.
- **Outcome:** **Done and verified live.** Deployed as versioned deployments `24c62781-04b5-4fe3-84ea-911951644386` (`13.260.0-teamidx`) then `7d92e633-5b78-41ad-ac60-6dbbe6d2728d` (`13.260.1-teamidx`, the C8 revert — current live). All phase acceptance criteria met (§9).

## 1. Scope executed

1. Read the full mandatory list in order (repo AGENTS.md; spec-pack README, AGENT-INSTRUCTIONS, PRODUCT-AND-SEO-STRATEGY + MASTER-SEO-SPEC §2-3/§4/§5, GSC-AUDIT-BASELINE; the SESSION-04 phase file; Session 1's audit + resource baseline; Session 2's validation report §6; Session 3's keyword-to-URL map + indexability matrix + route/canonical plan; SESSION-01/02/03 reports; the tracker; RUNBOOK §2; HANDOFF).
2. Cloned fresh (`ce7b280` = Session 3 close-out + post-push correction), verified clean tree, no concurrent-agent work.
3. **Live pre-state capture (machine-run, all saved):** sitemap children 15/7/**87**/123/151 = **383**; the 87 team slugs saved (all 13 selected present); `/teams/fulham` + `/teams/barcelona` captured pre-deploy (fulham indexable today — the C1 problem live); robots.txt; the 6-redirect host matrix; `?page=1/2` canonicals; workers.dev machine files (7 routes, no `x-robots-tag` — the C6 gap live); workers.dev HTML page (guard present); `/api/public-matches` double-GET (C8: MISS `max-age=60`, HIT `max-age=14400` — re-confirmed live); `/healthz` pre-budget.
4. Implemented C1 + C6 + the C8 one-liner (§3), with a new 13-gate check script wired into `npm test`.
5. `npm install` + `npm test` (exit 0, **3,628 OK** = baseline 3,615 + 13), `npx wrangler dev` local smoke with a seeded KV fixture (§6), checkpointed commits, one-shot token push (ls-remote verified).
6. Versioned deploy → live verification → **C8 measured and reverted per the phase contract** → second versioned deploy → full live re-verification (§7).
7. Wrote `seo-implementation/audit/CRAWL-INDEX-CHANGELOG.md` (the phase deliverable, with pre/post counts + samples), this report, the tracker row, and the Session 5 prompt.

## 2. Findings — confirmed vs suspected

- **C1 confirmed (the mechanism + the fix):** `teamsIndex` generates team entries for both sides of every eligible pool match; the sitemap listed all 87. Fixed per the approved disposition (route plan §2.3): teams.xml 87 → 13 (allowlist filter before any row is pushed); non-selected team pages → `noindex, follow` (200 + self-canonical + all internal links preserved). The per-URL demand evidence is route plan §2.2 (cited in the changelog).
- **C6 confirmed:** all 7 machine-file routes on workers.dev lacked the guard (re-verified live pre-deploy); fixed with a post-cache guard so the host-independent edge-cache key can never leak the header across environments.
- **C8 confirmed then RESOLVED AS RECORD-AND-SKIP (measured):** the one-line `s-maxage=60` candidate shipped in 13.260.0 and was live-tested — **the Workers free-plan edge floor overrides both `max-age` and `s-maxage` on Cache API entries** (HIT at age 3 still stamped `max-age=14400`). No one-line cache-header fix exists → reverted in 13.260.1 per the phase contract ("normalize only if it's a one-line cache-header fix, else record and skip"). Residual finding flagged for the owner: the stamped 14400 is browser-honored on the client poll path (plain `fetch`, SW passes `/api/*` through) — a client-side fix (poll fetch `cache` option + bundle rename + SW bump) or a zone Cache Rule; both out of Session 4's server-side scope, both recorded in the changelog §C8.
- **S2 (pagination GSC verification): unverifiable — no fresh GSC export exists this session** (the owner supplied credentials only). Recorded; the `?page=N≥2` self-canonical policy stays as decided (verified live again: page 2/3 self-canonical with query; `?page=99` clamps to the last real page with its canonical).
- **C7 observation (pre-existing, not a regression):** the full-sitemap sweep at 12-concurrency produced 29 transient 503s on cold archive renders (the documented free-plan CPU cliff); all 29 recovered on paced retry with correct canonicals. Session 4 touches no match-page code path.

## 3. Implementation decisions and deviations

1. **C1 as Option A's functional core with a named predicate** (`isSelectedTeam` in `src/seo/data.ts`) rather than Option B's broader `teamPageEligibility()` surface: the two current consumers (sitemap child + team-page robots rule) need exactly one shared test; Option B's extra surface (internal-link weighting) has no consumer before Session 10. The predicate mirrors `shouldReport`'s proven normalization pairing (set built with `normalizeTeamName` over the domestic-league config names, lookups via `normAlias`) — verified against the two provider-derived canonical slugs ("FC Internazionale Milano", "Club Atlético de Madrid") and 18 variant cases. Recorded in DECISIONS.
2. **The selected set = the domestic league keys only (PL/PD/SA/FL1/BL1):** EL/ECL entries repeat the same 11 European names; AL (5 A-League clubs) is site-hidden and NOT part of the SEO selected 13. 13 names asserted by a test gate.
3. **The admin-overlay memo:** the predicate re-checks the `CONFIG.BIG_TEAMS_BY_LEAGUE` object identity (the `teamNormCache` sig pattern) so an admin-selected club becomes indexable without a redeploy — pinned by a test gate (both rebuild directions).
4. **C6 applied OUTSIDE `wantCached`** (post-cache) instead of baking the header into the render: the edge cache key is host-independent, so a baked header could leak across environments (workers.dev render → prod serve, or an unguarded prod render → workers.dev serve). Verified live in both directions.
5. **C8: attempted → measured → reverted.** The honest sequence the phase contract prescribes. The revert is its own versioned deploy (13.260.1) so live and repo agree; the record-and-skip marker + evidence pointer remain in `src/public-swr.ts`, and the test gate pins the record-and-skip outcome (so a future session can't silently "re-fix" it without re-reading the evidence).
6. **Check-script pin ride-forwards:** two shape-pinned assertions (check-conditional-gets' machine-file regexes, check-match-centre's heroArtSrv import pin) and the check-stats version pins moved forward with the new call shapes/version, intent intact — the repo's standing convention (the 13.259 release did the same).
7. **Deviations from the blueprint: none.** teams.xml = exactly the 13 rows the route plan §6 specifies; total 383 → 309 exactly; no new redirects; no canonical changes; no robots.txt growth; no frozen-surface byte touched (barcelona byte-identical; fulham delta = robots meta + ItemList node only).

## 4. Files changed

- Code: `src/seo/data.ts` (+isSelectedTeam), `src/seo/files.ts` (teams filter), `src/seo/pages.ts` (indexable rule), `src/seo/router.ts` (guardNonProdMachineFile + 7 wraps), `src/public-swr.ts` (C8 attempt → revert; net comment-only), `src/config.ts`/`package.json`/`package-lock.json` (version triple 13.260.1).
- Tests: `scripts/check-seo-crawlindex.js` (NEW, 13 gates); `check-stats.js`, `check-conditional-gets.js`, `check-match-centre.js` (pin ride-forwards).
- Docs: `CHANGELOG.md` (v13.260.0/13.260.1 entry), `seo-implementation/audit/CRAWL-INDEX-CHANGELOG.md` (NEW — the phase deliverable), this report, the tracker Session 04 row, `seo-implementation/next-session-prompt.md` (Session 5), `docs/HANDOFF.md`, `docs/DECISIONS.md`.
- **No client asset changed** (SW `sportsignal-v126`, `public-13.80.js`, `public-13.87.css`, `_headers` untouched — no cap sweep needed).

## 5. Tests and exact outcomes

- `npm test`: **exit 0 — 3,628 OK** (baseline 3,615 + the 13 new gates; the count machine-verified by grep over the full log). Failures encountered and fixed en route: two version-pin checks (the ride-forward), five check-conditional-gets shape pins, one check-match-centre import-shape pin, one sed-escaping bug in my own pin edit — all resolved with intent preserved, none weakened.
- New gate inventory (`check-seo-crawlindex.js`): the domestic-league-key set; all 13 clubs match; 18 provider-variant cases (incl. both provider-derived slugs, both Bayern spellings, A-League rejections); the admin-overlay rebuild both directions; C1 wiring (filter-before-push order; indexable rule; competition rule untouched); the teamsIndex both-sides scope law; C6 (7 routes, post-cache shape, isProd short-circuit, PRODUCTION_HOSTS unchanged); the C8 record-and-skip outcome; the robots-only-/admin crawlability law.
- Local smoke (`npx wrangler dev`, seeded KV fixture of 3 matches / 6 teams): teams.xml lists exactly barcelona/liverpool/internazionale-milano; getafe + fulham 200 + `noindex, follow` + self-canonical; barcelona indexable; `/teams` lists all 6; the fixture match page links both teams; all 7 machine files + robots.txt carry the C6 header on localhost; homepage/matches 200; `/api/public-matches` serves the original header bytes (post-revert).

## 6. Checkpoints, deploy and verification

| Checkpoint | SHA | Push | Deploy |
|---|---|---|---|
| The foundation release (C1+C6+C8 attempt, tests, version, changelog) | `2a405f7` | yes (ls-remote verified) | `24c62781-04b5-4fe3-84ea-911951644386` @100% |
| The C8 record-and-skip revert (13.260.1) | `c805910` | yes (ls-remote verified) | `7d92e633-5b78-41ad-ac60-6dbbe6d2728d` @100% (current) |
| The session close-out (this report, changelog deliverable, tracker, Session 5 prompt, HANDOFF, DECISIONS) | (this commit) | yes | none (docs-only) |

**Live verification of the final state (2026-11-16, all machine-run):**

- `/healthz`: `ok:true`, version `13.260.1-teamidx`, `degraded:false`, `kv_writes_day 334 / web 163` (pre-session 322/157 — normal cron churn, no spike from the change), `subreq_last_tick 46` on one full-sweep tick (the documented 40-50 full-sweep profile; quiet ticks 28-29), pool 324.
- Sitemap children: 15 / 7 / **13** / 123 / 151 = **309**; teams.xml set-diff vs the 13 expected slugs: **identical** (incl. club-atletico-de-madrid + internazionale-milano).
- **Full 309-URL sweep:** every sitemap row fetched — 200, self-canonical, `index, follow`, zero noindex/redirect/404 rows. (29 archive rows transiently 503'd under the sweep's 12-concurrent burst — the pre-existing C7 cold-render cliff; all 29 recovered on paced retry. Not a Session 4 regression: no match-page path changed.)
- `/teams/fulham`: 200 + `noindex, follow` + self-canonical; byte-diff vs pre = robots meta + ItemList node only. `/teams/barcelona`: **byte-identical** to pre-deploy. `/teams` index: all pool teams still listed (crawl path intact).
- C6: production 7/7 routes with NO `x-robots-tag`; workers.dev 7/7 with `x-robots-tag: noindex, nofollow`.
- C8: `/api/public-matches` serves the original `public, max-age=60` bytes (the record-and-skip outcome; evidence in the changelog §C8).
- Host matrix: all 6 single-hop 301s (http, www, football, trailing-slash, uppercase, /public); robots.txt unchanged (Allow / + Disallow /admin + sitemap line); pagination `?page=1`→`/matches`, `?page=2/3` self-canonical with query, `?page=99` → clamped canonical `?page=3`.
- Honest lastmod: the 13 kept teams rows retain their original 2026-11-07/08/09 stamps (no restamp; no IndexNow ping for the 74 removals).

**Cloudflare budget statement (per change):** C1 zero-marginal by construction and measurement (in-memory Set membership on data already read; no new KV reads/writes — the teams child still does its one getSeoCtx + one lastmod-map read; no new subrequests; no render-cost change; `/healthz` writes flat). C6: non-prod only, one Headers clone + Response wrap per request; production returns the cached Response untouched. C8 revert: restores the pre-session bytes exactly.

## 7. Unresolved risks and blockers

- **S2 unverifiable** without a fresh GSC export (the program's top evidence request — would also unlock S1/S4 URL identities for Sessions 5/8).
- **C8 residual staleness vector** (browser-honored `max-age=14400` on zone-HIT poll responses): client-side fix or zone Cache Rule — owner decision, flagged in the changelog §C8 + DECISIONS.
- **C7 chronic CPU cliff** (pre-existing): cold archive renders under burst concurrency still kill; the 6h render-hold stands. Session 5's lifecycle work must not add render cost.
- **No fresh GSC export** was supplied this session (credentials only) — all GSC numbers in this report trace to the 2026-11-15 export via Sessions 2-3's machine derivations.

## 8. Tracker status

`IMPLEMENTATION-TRACKER.md` Session 04 row updated: **Completed / verified in production**, commits `2a405f7` + `c805910` + close-out, deploy `7d92e633-5b78-41ad-ac60-6dbbe6d2728d` @100%, verification summary + handoff prompt path recorded.

## 9. Acceptance criteria (phase file) — item by item

| Criterion | Status |
|---|---|
| Build and tests pass | ✅ `npm test` exit 0, 3,628 OK; `tsc` clean |
| Canonical, robots and sitemap behaviour verified on production | ✅ the full 309-URL sweep + per-class checks (§6) |
| No bulk redirects or mass deindexing without URL-level evidence | ✅ zero redirects added; the C1 noindex is per-URL-evidenced (route plan §2.2, cited in the changelog); fully reversible |
| Sitemaps list only canonical, intended-to-index, 200 URLs | ✅ machine-swept, zero violations |
| robots.txt does not block any noindex target | ✅ unchanged (Disallow /admin only); now test-pinned |
| Pagination/query-parameter rules verified | ✅ live-verified; S2 GSC check recorded unverifiable (no export) |
| Deliverables (code, CRAWL-INDEX-CHANGELOG.md, pre/post counts + samples) | ✅ all present |

## 10. Next session

**Session 5 — match URL lifecycle and seasonal indexing** (phase file `phases/SESSION-05-MATCH-LIFECYCLE-AND-SEASONAL-INDEXING.md`): the `MATCH-LIFECYCLE-POLICY.md` thresholds document, the match-URL classification, indexability-transition tests, and — only if the architecture needs it — a bounded, idempotent, resumable season-end batch. Full standalone prompt: `seo-implementation/next-session-prompt.md`.
