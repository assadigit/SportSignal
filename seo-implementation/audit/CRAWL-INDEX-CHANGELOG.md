# Crawl-Index Changelog — Session 4 (the crawl, index, canonical, sitemap and redirect foundation)

> Agents: read AGENTS.md in the repo root first, and follow it for this whole task.

- **Date:** 16 November 2026
- **Session:** SEO Implementation Program, Session 4 of 15 (the FIRST implementation session)
- **Phase file:** `sportsignal-seo-implementation/phases/SESSION-04-TECHNICAL-CRAWL-INDEX-FOUNDATION.md`
- **Blueprint authority:** `../architecture/ROUTE-AND-CANONICAL-PLAN.md` (§2 the C1 disposition, §4 pagination, §6 sitemap plan) + `../architecture/INDEXABILITY-MATRIX.csv` (rows 9-10, 19, 21)
- **Code versions:** `13.260.0-teamidx` (commit `2a405f7`, deployment `24c62781-04b5-4fe3-84ea-911951644386`) → `13.260.1-teamidx` (commit `c805910`, deployment `7d92e633-5b78-41ad-ac60-6dbbe6d2728d`, the C8 revert; **current live**)
- **Test baseline:** `npm test` exit 0, **3,628 OK** (baseline 3,615 + 13 new gates in `scripts/check-seo-crawlindex.js`)

---

## 1. The C1 fix — team-page indexability + teams.xml scope (the central change)

**The law implemented** (MASTER-SEO-SPEC §2 "Team pages"; PRODUCT-AND-SEO-STRATEGY §6; ROUTE-AND-CANONICAL-PLAN §2.3; INDEXABILITY-MATRIX rows 9-10): only the 13 selected clubs get indexable team pages and teams.xml rows. **URL-level demand evidence for the disposition: ROUTE-AND-CANONICAL-PLAN §2.2** (GSC 2026-11-15 export, machine-derived in Session 3: 114 non-selected team URLs / 8 clicks / 1,297 impressions / 0.62% CTR vs the 13 selected: 8 clicks / 1,159 impressions / 0.69%; the 8 click-earners are 1-click URLs each — Sporting CP 36 impr, Napoli 19, Thun 11, Tottenham 9, Bochum 7, Union Berlin 5, Hertha 3, Egnatia 1; top-10 URLs carry 48% of the non-selected impressions; the long tail is zero-click, including Iranian clubs that are out of product scope entirely). No bulk redirects, no 404s, no deletions — **`noindex, follow` + sitemap-row removal only, fully reversible per URL** (ROUTE-AND-CANONICAL-PLAN §2.5).

### What changed (commit `2a405f7`)

| File | Change |
|---|---|
| `src/seo/data.ts` | NEW `isSelectedTeam(name)` — the selected-club predicate: an in-memory Set built from the **domestic league keys** of `CONFIG.BIG_TEAMS_BY_LEAGUE` (PL/PD/SA/FL1/BL1 = the 13 European clubs; AL excluded as site-hidden; EL/ECL entries repeat the same names), looked up through `normAlias` so provider-legal variants fold onto the config keys. Memo re-checks the `CONFIG.BIG_TEAMS_BY_LEAGUE` object identity (the `teamNormCache` sig pattern) so the admin overlay takes effect without a redeploy. |
| `src/seo/files.ts` | The `teams` sitemap branch filters `teamsIndex(ctx)` through `isSelectedTeam` **before any candidate row is pushed** — a noindex URL can never enter the child. |
| `src/seo/pages.ts` | `buildTeamPage`: `indexable = isSelectedTeam(entry.name) && upcoming.length >= SEO.MIN_UPCOMING_FOR_INDEX` — the 13 selected keep the existing ≥1-upcoming law (matrix row 9); every non-selected team page now serves `noindex, follow` (row 10). |
| *unchanged by design* | `teamsIndex` still generates BOTH sides of every eligible fixture (it powers the `/teams` index tiles and the match-page «تیم‌ها» links — the crawl path that keeps the noindexed URLs readable by Google); `TEAM_SLUGS` untouched (the provider-derived `/teams/internazionale-milano` and `/teams/club-atletico-de-madrid` ARE canonical — route plan §7); competition-page indexability untouched. |

**Implementation option:** Option A's functional core (route plan §2.3) with a named predicate — the smallest surface that satisfies both consumption points (sitemap + robots-meta) from one source of truth. Option B's broader `teamPageEligibility()` surface (internal-link weighting etc.) is not needed by any current consumer; recorded in `docs/DECISIONS.md`.

### Pre/post machine counts (live, machine-counted)

| Sitemap child | Pre (13.259.1) | Post (13.260.x) | Verified |
|---|---:|---:|---|
| pages.xml | 15 | 15 | live count, both sessions |
| competitions.xml | 7 | 7 | live count, both sessions |
| **teams.xml** | **87** | **13** | live count + exact-set diff vs the 13 expected slugs: **identical** |
| matches-upcoming.xml | 123 | 123 | live count, both sessions |
| matches-archive.xml | 151 | 151 | live count, both sessions |
| **Total** | **383** | **309** | |

The 13 post rows (sorted): ac-milan, arsenal, barcelona, bayern-munich, borussia-dortmund, chelsea, club-atletico-de-madrid, internazionale-milano, liverpool, manchester-city, manchester-united, paris-saint-germain, real-madrid — **exactly the 13-club allowlist, including the two provider-derived slugs.**

Pre-state samples (from the live 87, saved 2026-11-16 pre-deploy): `/teams/bayern-munich`, `/teams/1-koln`, `/teams/manchester-city`, `/teams/fulham`, `/teams/lazio`, `/teams/lecce`, `/teams/sv-07-elversberg`, `/teams/freiburg`, `/teams/borussia-monchengladbach`, `/teams/borussia-dortmund`, `/teams/chelsea`, `/teams/leeds-united`, … `/teams/sv-werder-bremen`, `/teams/ipswich-town`, `/teams/como`, `/teams/juventus`, `/teams/real-sociedad-de-futbol` — 74 of these rows left the child (the pages all still serve).

### Live acceptance checks (all post-deploy, 2026-11-16)

| Check | Result |
|---|---|
| teams.xml = exactly the 13 selected-club URLs | ✅ set-diff vs expected: identical |
| Sampled non-selected `/teams/fulham` | ✅ HTTP 200 + `<meta name="robots" content="noindex, follow">` + self-canonical `https://sportsignal.ir/teams/fulham` |
| `/teams/barcelona` (selected) | ✅ 200 + `index, follow, …` + **byte-identical to the pre-deploy capture** (diff = zero bytes — no title/H1/description/visible-text change; the measurement freeze holds) |
| `/teams/fulham` byte-diff vs pre | exactly 2 deltas: the robots meta line, and the JSON-LD `@graph` dropping its `ItemList` node (the pre-existing `indexable ? itemListNode : null` behavior — same as competition pages at 0 upcoming; Organization/WebSite/SportsTeam/BreadcrumbList nodes byte-identical) |
| `/teams` index page | ✅ still lists every pool team (the crawl path — verified with a 6-team local fixture: all 6 tiles render, sitemap lists only the 3 selected) |
| Match pages still link both teams | ✅ local fixture match page links `/teams/barcelona` AND `/teams/getafe`; live sweep found every match page 200 |
| Honest lastmod | ✅ the 13 kept rows retain their original 2026-11-07/08/09 stamps (no restamp); the 74 removed rows left the candidate set — **no IndexNow ping** (removals are not changes), no KV write |
| robots.txt | ✅ unchanged: `Allow: /` + `Disallow: /admin` + sitemap line — blocks nothing that carries a noindex (the crawlability law, now also pinned by a test gate) |

**Cloudflare budget (per the deploy ritual):** zero-marginal by construction and by measurement — the predicate is an in-memory Set membership test on entries the sitemap iteration already produced; no new KV reads/writes (the teams child still does exactly one `getSeoCtx` + one lastmod-map read), no new subrequests, no render-cost change. `/healthz` before: `kv_writes_day 322 / web 157, subreq 29-31/tick, degraded:false`; after (settled): `334 / 163, subreq 46 on one full-sweep tick (the documented 40-50 full-sweep profile), degraded:false` — no write spike from the change (the C1 path writes nothing).

## 2. C6 — the non-prod x-robots-tag on machine files

**Gap (audit C6):** HTML pages, robots.txt and BingSiteAuth carried the R-13 environment guard on workers.dev; the sitemaps/feed/calendar/matches.json/llms files did not.

**Fix (commit `2a405f7`):** `guardNonProdMachineFile(res, isProd)` in `src/seo/router.ts`, applied at all 7 routes — `/sitemap.xml`, `/sitemaps/{kind}.xml`, `/feed.xml`, `/calendar.ics`, `/api/matches.json`, `/llms.txt`, `/llms-full.txt` — **outside `wantCached`** (post-cache). Rationale: the edge cache key is host-independent (`edge-internal.sportsignal.ir` + path), so baking the header into a cached render could leak across environments (a workers.dev render stamping noindex into a copy later served to production, and vice versa). Post-cache application makes the guard per-request. Deliberately NOT covered (unchanged, not in the audit's gap list): `/.well-known/security.txt`, the IndexNow key file, `/og/match-*.png` (robots.txt and BingSiteAuth were already guarded).

**Live verification (2026-11-16):** production `sportsignal.ir` — `x-robots-tag` absent on all 7 (count 0) ✅; workers.dev — `x-robots-tag: noindex, nofollow` present on all 7 ✅ (including on shared-cache serves — the post-cache application working as designed). Budget: on non-prod only, one Headers clone + Response wrap per request; production returns the cached Response untouched.

## 3. C8 — the `/api/public-matches` edge TTL: attempted, measured, REVERTED (record-and-skip)

**Pre-state (re-confirmed live this session, 2026-11-16):** cold/MISS serves `cache-control: public, max-age=60` (the code's intent); zone-edge HITs serve `cache-control: public, max-age=14400` + `cf-cache-status: HIT` (Cloudflare's default edge TTL stamped on the cached JSON).

**The attempt (`13.260.0`, commit `2a405f7`):** the one-line candidate — `s-maxage=60` added to the response cache-control (shared-cache TTL explicit; browser `max-age=60` semantics unchanged).

**The measurement (live, post-deploy):** MISS = `public, max-age=60, s-maxage=60`; HIT at age 3 = `public, max-age=14400, s-maxage=60`. **The Workers free-plan edge floor overrides both `max-age` and `s-maxage` on Cache API entries** — the stamp persists. No one-line cache-header fix exists.

**The revert (`13.260.1`, commit `c805910`):** declaration removed (it normalizes nothing on this plan); the record-and-skip marker + evidence pointer left in `src/public-swr.ts`; the test gate re-pinned to the record-and-skip outcome. Live post-revert: the route serves the original `public, max-age=60` bytes.

**Residual finding (flagged for the owner, out of Session 4 scope):** the stamped `max-age=14400` is browser-honored on the poll path — the client polls with a plain `fetch("/api/public-matches")` (default cache mode) and the service worker passes `/api/*` through to the default network stack, so a browser receiving a zone-HIT response may serve its cached copy for up to ~4h without revalidation (bounded staleness for the polled payload; the HTML surfaces are unaffected). The fix is client-side (the poll fetch's `cache` option + the ADR-006 bundle-rename + SW-bump ritual) — a candidate follow-up requiring an owner decision, NOT executed this session. A zone-level alternative (a Cache Rule excluding `/api/public-matches` or honoring origin TTL) is an owner-side dashboard decision, also flagged.

## 4. The foundation re-verification (the phase's checklist, machine-run 2026-11-16)

| Item | Result |
|---|---|
| HTTP→HTTPS + host variants | ✅ all 6 single-hop 301s re-verified live: `http://` → `https://`, `www.` → apex, `football.` → apex, trailing-slash, uppercase → lowercase, `/public` → `/`. Compound variants take one hop per violation (unchanged, as-designed — e.g. `http://www…/teams/` → `https://…/teams/` → `https://…/teams`) |
| Redirect chains/loops | ✅ none per normalization (each redirect lands directly on the canonical form) |
| robots.txt blocks no noindex target | ✅ only `/admin` disallowed; no growth |
| Sitemaps list only canonical/indexable/200 URLs | ✅ **full 309-URL sweep**: every row in every child fetched — 200, self-canonical, `index, follow` robots, zero noindex/redirect/404 rows. (29 archive rows initially returned 503 under the sweep's 12-concurrent burst — the documented pre-existing C7 cold-render CPU cliff, not a Session 4 regression: Session 4 touches no match-page path, and all 29 recovered on paced retry with correct canonicals; the 6h archive render-hold mitigation from 13.259.1 stands) |
| Canonical tags per class | ✅ sweep-verified self-canonical on all classes; `?page=1`/bare → `/matches`; `?page=2`/`?page=3` self-canonical WITH the query (live); outranged `?page=99` clamps to the last real page and canonicalizes to it (`?page=3`) — no empty pagination URLs |
| Pagination policy (blueprint §4) | ✅ unchanged and verified live (S2's GSC page-level check: **no fresh GSC export exists — S2 remains unverifiable, recorded; the canonical policy stays as decided**) |
| Internal links to 404 URLs | none identified by this session's verification (the sweep + the repo's surface checks found no concrete broken link) — nothing to fix |
| Frozen surfaces (Dec 4-8 freeze) | ✅ barcelona byte-identical; fulham delta = robots meta + ItemList node only; homepage + match pages untouched by the changed code paths (all verified 200 + correct canonicals in the sweep) |

## 5. Files changed (Session 4 total)

- `src/seo/data.ts` — `isSelectedTeam` + `normAlias` import (C1)
- `src/seo/files.ts` — teams sitemap allowlist filter (C1)
- `src/seo/pages.ts` — team-page indexable rule (C1)
- `src/seo/router.ts` — `guardNonProdMachineFile` + 7 route wraps (C6)
- `src/public-swr.ts` — C8 attempt then revert; record-and-skip marker remains (net: comment-only)
- `src/config.ts` / `package.json` / `package-lock.json` — version triple → `13.260.1.0` / `13.260.1-teamidx`
- `scripts/check-seo-crawlindex.js` — NEW, 13 gates, wired into `npm test`
- `scripts/check-stats.js` / `check-conditional-gets.js` / `check-match-centre.js` — version pins + two shape pins rode forward per the standing convention (intent intact)
- `CHANGELOG.md` — the v13.260.0/13.260.1 release entry

No client asset changed (SW `sportsignal-v126`, bundle `public-13.80.js`, stylesheet `public-13.87.css`, `_headers` untouched — no cap sweep needed).

## 6. What Session 8 inherits (the C1 follow-ups)

- Verify in GSC (needs a fresh export): the 74 URLs moving from indexed to "Excluded by 'noindex' tag"; watch for anomalies (any URL still accumulating impressions after the noindex is read).
- The season-end demand re-read (route plan §2.5): any non-selected club with sustained clicks (>1/mo sustained) becomes an owner-decision candidate for allowlist promotion.
- Team-page content depth + internal links (Session 8's main scope); the title-pattern work strictly AFTER the Dec 4 gate (the parked S2 title test).
