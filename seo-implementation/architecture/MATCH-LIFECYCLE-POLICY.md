# MATCH-LIFECYCLE-POLICY.md — Match-URL Lifecycle and Seasonal Indexing Policy

> Agents: read AGENTS.md in the repo root first, and follow it for this whole task.

**Session:** 5 of 15 (SEO Program) · **Author:** the implementation agent · **Date:** 2026-11-17
**Status:** thresholds recorded BEFORE implementation (MASTER-SEO-SPEC §4 rule). The mechanism ships this session; the first real season-end run awaits owner approval (§7).
**Predecessors:** `MASTER-SEO-SPEC.md` §4 (the law); `ROUTE-AND-CANONICAL-PLAN.md` §9 (no bulk redirects); `INDEXABILITY-MATRIX.csv` rows 16-17; `CRAWL-INDEX-CHANGELOG.md` (the C1/C6/C8 foundation this builds on).

---

## 0. Purpose and scope

This document gives match-detail URLs (`/matches/{home}-vs-{away}-{YYYY-MM-DD}`) a safe, evidenced lifecycle so the site does not continuously accumulate low-value indexable pages — while protecting the historical assets that carry the site's clicks.

It is the **thresholds-and-rationale** document MASTER-SEO-SPEC §4 requires to exist **before** any implementation code. The code changes that follow (Session 5) implement exactly this policy — no more, no less.

**In scope:** the indexability lifecycle of match-detail URLs that already exist (the 4-route eligibility is settled — Session 3; the top-3-standings route STAYS).

**Out of scope:** match-page title/description/metadata bytes (Session 7); team-page content (Session 8); competition/date pages (Session 9); hreflang/EN (Session 12); structured-data refinements (Session 13). The 4-route eligibility law itself is NOT reopened.

---

## 1. The three separated concerns (MASTER-SEO-SPEC §4)

The lifecycle separates three concerns that must never be conflated:

| Concern | What it governs | This policy's instrument |
|---|---|---|
| **1. Search index eligibility** | whether Google is *allowed* to index the URL | the `<meta name="robots">` tag (this policy) |
| **2. Public page availability / history** | whether the URL resolves to a 200 page a user can visit | the pool + the 365-day archive (existing, unchanged) |
| **3. Data retention / storage / runtime cost** | whether the underlying KV rows are kept | the archive's 365-day TTL + the pool's 7-day retention (existing, unchanged) |

**The hard rule:** an index-eligibility decision (concern 1) NEVER automatically triggers a page-availability deletion (concern 2) or a data-store deletion (concern 3). A season-ended ordinary match page stays **200 + crawlable + self-canonical**; only its robots meta flips to `noindex, follow` and it leaves the sitemap. The KV row is NOT deleted. (MASTER-SEO-SPEC §4: "Do not delete database/provider records solely to reduce Google index count.")

---

## 2. The lifecycle phases A–D mapped onto this codebase

MASTER-SEO-SPEC §4 defines four phases. Here is how each maps onto SportSignal's real state model.

### Phase A — Upcoming fixture (indexable, in sitemap)

**Codebase state:** the match is in `matches_v13_tracked` (the pool), `status` is a playable-future status, `utcDate ≤ now + 92 days`, and it passes `isBigForSeo(raw, top3) || s.big` (the 4-route eligibility). It appears in `matches-upcoming.xml` via `upcomingBig(ctx)`.

**Indexability:** `index, follow` (the `indexable: true` literal in `buildMatchPage`). In sitemap. In homepage/hub/team-page current lists.

**No change this session.** Upcoming matches are never season-ended (they haven't happened).

### Phase B — Recently completed, within the relevant competition season (indexable, in sitemap)

**Codebase state:** the match is FINISHED. Two sub-states:
- **B-pool:** still in the 7-day pool window (`utcDate > now - 7d`). Rendered from the pool. In `matches-archive.xml` via `finishedRecent(ctx, 30)`.
- **B-archive:** past the 7-day pool retention, within the 365-day archive. `findArchivedMatchBySlug` serves the page (the S28 fix). In `matches-archive.xml` via the `archRecs` loop.

**Indexability:** `index, follow`. In sitemap. The page holds its render 6h (`ARCHIVE_PAGE_TTL` — the C7 CPU-cliff mitigation; **do not shorten**).

**The season is still open.** This is the default state for all currently-archived matches (see §3).

### Phase C — Season-end review (the transition this session mechanizes)

**Codebase state:** the match is FINISHED, in the archive (or the pool window), AND the relevant competition's season has closed (§3).

**Two dispositions:**

- **C-marquee (keep indexable):** the match has demonstrated ongoing demand, editorial value, or evergreen intent (§5). Stays `index, follow`, stays in sitemap, stays in current lists. Reassessed at the *next* season close (not kept indefinitely by default).

- **C-ordinary (noindex transition):** the match is finished, the season closed, and it is NOT marquee. The robots meta flips to `noindex, follow`. The URL leaves `matches-archive.xml`. The page stays **200 + self-canonical + crawlable** (the noindex-must-stay-crawlable law). No robots.txt blocking. No 301. No 404. No deletion. Fully reversible per URL.

**The instrument (robots-meta level ONLY — like C1):** a pure render-time predicate `isSeasonEndedOrdinary(sm)` evaluates at page-render time and at sitemap-build time. No batch job, no per-match cron, no sweep (§6). The predicate is gated on an explicit enable flag (§7) — the owner approves the first real run.

### Phase D — Invalid / unknown / out-of-archive slug (404 — terminal, unchanged)

**Codebase state:** the slug does not match any pool row AND does not match any archive row.

**Disposition:** HTTP 404 with the custom 404 page (`noindex, follow` + `x-robots-tag: noindex, nofollow` + links home/today/matches/sitemap). No canonical emitted (F-L1). This is the **terminal state** for truly-unknown slugs (the T-06 contract).

**No change this session.** The custom 404 + the archive-serve fallback are the correct terminal dispositions (matrix row 17). No bulk redirects (route plan §9). No deletions.

---

## 3. Season-boundary definition (the "when is a season closed" rule)

**Definition.** A competition's season is **closed** when the current date exceeds that competition's most-recent-completed-season end date, as recorded in the football-data.org v4 `season.endDate` field (the same field `src/composers.ts:286` already reads for pre-season detection).

**Source of truth.** The FD v4 `/competitions/{code}/standings` response carries a `season` object with `startDate` and `endDate`. These are the authoritative competition season boundaries. The policy does NOT invent dates.

**Code representation.** A `SEASON_END_DATES` map (competition code → ISO date) in `src/seo/config.ts`. The map starts **empty** in the shipped code. The owner populates it from a fresh FD standings fetch (confirming the `season.endDate` values) before enabling the first run (§7).

**Reference dates (the publicly scheduled 2025-26 European season close — NOT baked into code; recorded here for the owner's confirmation step):**

| Competition | Code | 2025-26 close (public schedule) | Source to confirm before enabling |
|---|---|---|---|
| Premier League | `PL` | 2026-05-24 | FD `season.endDate` for PL |
| La Liga | `PD` | 2026-05-24 | FD `season.endDate` for PD |
| Serie A | `SA` | 2026-05-24 | FD `season.endDate` for SA |
| Bundesliga | `BL1` | 2026-05-23 | FD `season.endDate` for BL1 |
| Ligue 1 | `FL1` | 2026-05-17 | FD `season.endDate` for FL1 |
| Champions League | `CL` | 2026-05-30 (final) | FD `season.endDate` for CL |

**Current state (2026-11-17):** the 2025-26 European season is closed (ended May 2026). The 2026-27 season is **in progress** (ends May 2027). All 151 matches currently in `matches-archive.xml` are 2026-27 season matches (Oct–Nov 2026 kickoffs). Therefore **no current archive match is from a closed season** — the mechanism is inert even if the flag were enabled, until the 2026-27 season closes AND its end dates are added to the map.

**Why an empty map is safe:** the predicate `seasonClosedFor(code)` returns `false` for any code not in the map (conservative default — assume the season is still open). An empty map = no transitions, regardless of the flag.

**A fresh GSC export would refine this** by confirming which closed-season matches (if any re-enter the archive) carry residual demand worth a marquee override.

---

## 4. Keep-indexable evidence thresholds (the marquee test)

MASTER-SEO-SPEC §4: "Keep indexable longer when there is evidence of continuing organic clicks/impressions, valuable external links, distinctive evergreen interest, or explicit editorial value."

A match is **marquee** (stays indexable through season-end) when ANY of these signals is true. The signals are ordered by evidential strength:

| # | Signal | Threshold / source | Rationale (evidence base: GSC 2026-11-15 export) | A fresh export would refine? |
|---|---|---|---|---|
| **M1** | Selected-club involvement | `isSelectedTeam(home) OR isSelectedTeam(away)` (the 13-club allowlist) | The 13 selected clubs are the site's core editorial selection — evergreen fan-demand surfaces. The head term «بارسلونا مقابل منچستر سیتی 2026» (6 clicks, pos 3.25) and the PSG–Barcelona URL (35 clicks) are both selected-club matches. | No — the allowlist is the owner's fixed-per-season decision. |
| **M2** | Curated featured matchup | `sm.s.big` (the `BIG_MATCH_TEAMS`/`BIG_MATCH_UEFA` both-sides list — the PSG–Barcelona class) | These are the editorially curated marquee matchups — both sides are in the featured pool. The isFeaturedMatch predicate is the existing curation. | No — curated, owner-controlled. |
| **M3** | Late-stage knockout | `isQuarterFinalOrLater(sm.raw.stage)` (QF / SF / Final / 3rd-place) | A QF+ tie is the competition's climax — evergreen historical interest. Available on pool rows; archive rows lose `stage` (pubMatch doesn't project it) so this signal applies to the pool-window transition only. | No — structural. |
| **M4** | Derby / historic rivalry | `isDerby(sm.raw) OR isTrueBigDuel(sm.raw)` | Derbies carry evergreen matchup intent independent of standings. | No — structural. |
| **M5** | Demonstrated GSC demand (editorial override) | slug in `MARQUEE_MATCH_SLUGS` (curated from the 2026-11-15 export: every match-detail URL with ≥1 click) | The 51 click-earning match-detail URLs in the 2026-11-15 export (190 clicks total) are the evidenced demand surface. Seeding the slug set with all click-earners is conservative — it retains MORE, not fewer. | **Yes** — a fresh 16-month export would add/remove slugs based on sustained demand. This is the threshold a fresh export most directly refines. |

**The "ordinary" class (transitions to noindex at season-end):** a finished match in a closed-season competition that passes NONE of M1–M5. These are the top-3-standings-route matches between two non-selected, non-derby, non-QF+ clubs with zero GSC clicks — the passive one-off matchup heads (e.g. the Atalanta–Kairat / Monaco–Nordsjaelland class: high impressions, ~0 clicks, position ~12). They accumulated because they were top-3 at the time, but have no sustained demand and no evergreen intent.

**Threshold values recorded:**
- Clicks threshold for M5: **≥1 click** in the 16-month GSC window (conservative — retains any URL with demonstrated demand). Rationale: the site's match-detail total is 190 clicks across 264 URLs; 51 URLs earned ≥1 click. A threshold of ≥1 retains the entire evidenced-demand surface. A stricter threshold (≥2 or ≥3) would drop 1-click URLs — NOT chosen because a single click is still demonstrated intent and the noindex transition is reversible.
- Impressions threshold: **none** (impressions alone do not retain — the Atalanta–Kairat class has 329 impressions but 0 clicks at pos 12.36, which is passive one-off intent, not demand worth retaining).
- Position threshold: **none** (position is an outcome, not a retention signal).

**A fresh GSC export would refine M5** by refreshing the `MARQUEE_MATCH_SLUGS` set (adding newly-clicked URLs, dropping URLs whose demand has faded across a longer window).

---

## 5. The marquee-retention rule (the PSG–Barcelona class)

**Rule.** A marquee match (passes any of M1–M5) stays `index, follow`, in sitemap, in current lists, through the season-end review and into the next season. It is **reassessed at the next season close** (MASTER-SEO-SPEC §4: "Reevaluate retained exceptional pages at the next season close. Do not keep them indefinitely by default.").

**The PSG–Barcelona class (named):** matches involving two selected clubs OR two featured-pool clubs (M1 both-sides or M2) — the «بارسلونا مقابل منچستر سیتی 2026» head (6 clicks, pos 3.25) and the Paris Saint-Germain vs Barcelona URL (35 clicks, 854 impr). These are the site's strongest demand surfaces and are protected unconditionally through season-end.

**The passive one-off matchup heads (named, the contrast class):** the Atalanta–Kairat (329 impr, 0 clicks, pos 12.36), Monaco–Nordsjaelland (244 impr, 1 click, pos 12.46), Manchester United–Roma (210 impr, 0 clicks, pos 11.05) type — top-3-route, non-selected, non-derby, non-QF+. High impressions but ~zero clicks at page-2 positions = passive intent that does NOT retain. These are the ordinary class that transitions to noindex at season-end (when the season closes AND the flag is enabled).

**The M5 override protects the exception:** if a passive one-off matchup head DID earn a click (e.g. Monaco–Nordsjaelland's 1 click), its slug is in `MARQUEE_MATCH_SLUGS` and it retains. The threshold is deliberately conservative (≥1 click) so no demonstrated demand is lost.

---

## 6. The noindex transition rule (robots-meta level ONLY — like C1)

**Rule.** The season-end ordinary transition is **robots-meta level ONLY**:
- The `<meta name="robots">` flips from `index, follow…` to `noindex, follow`.
- The URL leaves `matches-archive.xml` (sitemap-row removal).
- The page stays **HTTP 200**.
- The page keeps its **self-canonical** link.
- The page stays **crawlable** (no robots.txt blocking — the noindex-must-stay-crawlable law, MASTER-SEO-SPEC §4 Phase C).
- **Never** a 301 redirect for an ordinary season-end page.
- **Never** a 404/410 for an ordinary season-end page.
- **Never** a robots.txt entry (the crawlability law is test-pinned — robots.txt stays `Allow: /` + `Disallow: /admin`).
- **Never** a KV/data deletion (concern 3 is separate from concern 1).

**The instrument is render-time and sitemap-build-time, not a batch job:**
- At page render (`buildMatchPage`): the `noindex` flag is derived from `isSeasonEndedOrdinary(sm)` and passed to `buildHead`. The page serves 200 with the correct robots meta. Zero new awaits, zero new KV reads, zero new fetches (the predicate reads only `sm` fields already loaded — the zero-runtime-cost law).
- At sitemap build (`buildSitemap` matches-archive branch): the `archRecs` loop skips rows where `isSeasonEndedOrdinary` is true, before `candidates.push` (mirrors the C1 `if (!isSelectedTeam(e.name)) continue;` precedent).

**Why no batch job:** the transition is a pure function of (a) the match's finish status, (b) the competition's season-end date, (c) the marquee signals — all of which are already in the render context. A render-time predicate is the smallest possible surface, is inherently bounded/idempotent/resumable (every render evaluates it; no state to corrupt; no sweep to resume), and adds zero KV writes. This satisfies MASTER-SEO-SPEC §4 Phase C ("one bounded, season-level cleanup/review … or use the existing deployment/data-management job; do not create per-match cron jobs") and §10 ("Any season-end review must be bounded, idempotent, resumable").

**Reversibility:** flipping the flag back to false (or removing a date from the map) instantly restores the page to `index, follow` and re-adds it to the sitemap on the next sitemap build. The KV row was never touched.

---

## 7. The owner-approval point (the first real season-end run)

**The 2025-26 European season is already closed.** The first real application of this policy is a real decision with real URL-level effects. Per the session contract: **propose, do not execute, the first batch unless the owner explicitly approves it in-session.**

**What shipped this session (the MECHANISM):**
- The `isSeasonEndedOrdinary(sm)` predicate (pure, render-time).
- The `HeadInput.noindex` field + the `buildHead` robots derivation.
- The `buildMatchPage` wiring (adds `noindex: finished && isSeasonEndedOrdinary(sm)` alongside the literal `indexable: true` — the S19 noindex law is preserved).
- The sitemap archive filter (skips ordinary-season-ended rows before `candidates.push`).
- The transition test (`scripts/check-seo-match-lifecycle.js`, wired into `npm test`).
- The `SEASON_END_NOINDEX_ENABLED` flag (default **false**) and the empty `SEASON_END_DATES` map in `src/seo/config.ts`.
- The `MARQUEE_MATCH_SLUGS` set seeded from the 2026-11-15 GSC click-earners.

**What did NOT happen (the first run, deferred):**
- The flag is false → no page transitions. The live site behavior is byte-identical to the Session 4 close-out.
- The `SEASON_END_DATES` map is empty → even with the flag on, no competition is considered closed.
- The 2026-27 season (the season of all current archive matches) is still open → no current archive match is from a closed season.

**To enable the first real run (a future session, after owner approval):**
1. The owner confirms the season-end dates against a fresh FD `season.endDate` fetch and approves populating `SEASON_END_DATES`.
2. The owner sets `SEASON_END_NOINDEX_ENABLED = true`.
3. A versioned deploy ships the config change.
4. Verify live: sampled noindexed page = 200 + `noindex, follow` + self-canonical; sitemap child count drops by the ordinary-class count; `/healthz` budget flat (zero new KV writes — the predicate is pure).
5. Record the GSC measurement window (post-transition vs the 2026-11-15 baseline).

**The proposed first batch (for the owner's review, NOT executed):** per `MATCH-URL-CLASSIFICATION.csv`, 56 of the 151 current archive matches are ordinary-class (non-selected, non-derby, non-QF+, zero GSC clicks). BUT all 56 are 2026-27 season matches — the season is still open. The first batch that would actually transition is the ordinary-class subset of the 2026-27 archive matches, evaluated AFTER the 2026-27 season closes (May 2027) AND the dates are confirmed AND the flag is enabled. The 56-row count is the safe-sample projection of the policy's effect, not a live transition count.

---

## 8. The 404 class formalization (INDEXABILITY-MATRIX row 17)

**The terminal states for match-detail URLs (formalized, unchanged from current behavior):**

| State | Trigger | Response | Robots | Canonical | Sitemap | Redirect? |
|---|---|---|---|---|---|---|
| **Phase D — unknown slug** | slug matches no pool row AND no archive row | HTTP 404 (custom 404 page) | `noindex, follow` + `x-robots-tag: noindex, nofollow` | none (F-L1) | no | **no** |
| **Phase D — out-of-archive** | slug is a real finished match >365 days past kickoff (past the archive TTL) | HTTP 404 (custom 404 page) — the archive-serve fallback found nothing | `noindex, follow` + `x-robots-tag` | none (F-L1) | no | **no** |
| **Phase C-ordinary — season-ended** | slug is in the archive, season closed, not marquee | HTTP 200 (the page still serves) | `noindex, follow` (the transition) | self-canonical (kept) | **removed** (the sitemap filter) | **no** |

**The rules (verbatim from route plan §9 + MASTER-SEO-SPEC §4 Phase D):**
- **No bulk redirects ever.** The 159-not-found GSC class (audit C4) is already correctly handled: the legitimate ones were restored by the S28 archive serve (151 now 200 + sitemap); the truly-unknown ones 404 correctly (T-06). Session 5 does NOT add redirects.
- **301 only to a true equivalent.** No match-detail URL has a "true equivalent" destination — a finished match is unique to its date. No 301s are used for season-end pages.
- **404/410 for gone-and-no-replacement.** The truly-unknown slug 404s. The out-of-archive slug (>365 days) 404s. These are correct terminal states, not failures.
- **No deletions.** Data retention (concern 3) is decided separately from index eligibility (concern 1). The archive's 365-day TTL is the data-retention policy; the noindex transition does not delete the KV row.

---

## 9. Resource impact (Cloudflare free-tier budget statement)

| Dimension | Before (Session 4 close) | After (Session 5) | Delta |
|---|---|---|---|
| KV reads / match-page render | 3 (loadArchive, hydrateMatchVenue, fullByCodeFor) | 3 | **0** — the predicate is pure (reads only `sm` fields) |
| KV writes / match-page render | 0 | 0 | **0** |
| KV writes / sitemap build | change-only (lastmod map) | change-only (same map; ordinary rows leave the candidate set = no write, like C1's 74 removed team rows) | **0** |
| Subrequests / tick | 28-46 | 28-46 | **0** |
| CPU / cold render | ~10ms cliff (C7) | ~10ms cliff (one in-memory predicate evaluation ≈ microseconds) | **negligible** — no new rendering work |
| Sitemap child count (matches-archive) | 151 | 151 (flag is false — no rows removed) | **0** live; the mechanism can remove up to 56 when enabled |
| `/healthz` budget | `kv_writes_day 334 / web 163` | unchanged (no new write paths) | **0** |

**The change is zero-marginal-cost** — an in-memory predicate evaluation on data already loaded, exactly like C1's `isSelectedTeam` Set membership test. No new KV write paths, no new fetches, no new cron, no render-cost additions. (CLOUDFLARE-RESOURCE-BASELINE §7 rules 1-5 all satisfied.)

---

## 10. Acceptance criteria mapping (the phase file's checklist)

| Criterion (phase file) | How this policy + the Session 5 code satisfy it |
|---|---|
| A test fixture proves upcoming → completed → season-end ordinary noindex | `scripts/check-seo-match-lifecycle.js` gate: a fixture match through the transition returns `noindex` when flag+dates+finished+ordinary; `index` when upcoming or marquee |
| Marquee page retention | the test asserts a selected-club / s.big / QF+ / slug-in-MARQUEE_SET fixture stays indexable through season-end |
| Invalid URL response | the test asserts the T-06 contract (unknown slug → 404) is unchanged |
| Correct sitemap removal | the test asserts the `archRecs` loop skips ordinary-season-ended rows before `candidates.push` (the C1-precedent pattern) |
| No robots blocking | the test asserts robots.txt is unchanged (`Allow: /` + `Disallow: /admin` only); the noindex is meta-level, never robots.txt |
| No destructive data deletion | the policy §1 three-separated-concerns rule; the code touches no KV delete path |
| Resource impact measured or explicitly unchanged | §9 above — zero-marginal |
| Build and tests pass | `npm test` exit 0 (baseline 3,628 + new gates) |
| No bulk redirects or mass deindexing without URL-level evidence | §8 (no redirects); the M5 threshold is per-URL-evidenced (GSC click data); the flag gates the first batch |

---

## 11. What this policy does NOT change (the frozen surfaces)

- The **top-3-standings route** STAYS (Session 3 decision — 70% of match-detail demand).
- The **`?page=N≥2` self-canonical** policy stays (S2 unverifiable — no fresh GSC export).
- **robots.txt** stays `Allow: /` + `Disallow: /admin` (test-pinned crawlability law).
- **No hreflang/EN** (Session 12).
- **Match-page title/description/H1 bytes** are frozen (Session 7 owns them; Session 5 is robots-meta/sitemap/list level ONLY — verified by page diff).
- **`ARCHIVE_PAGE_TTL` (6h)** — do not shorten (the C7 mitigation).
- **IndexNow** 15-min rate limit + parked-URL drain — do not break (ordinary rows leaving the sitemap generate no ping — removals are not changes, same as C1).
- **The 4-route eligibility law** is not reopened.
- **The archive's 365-day TTL** is not changed.
- **C8** = record-and-skip, do NOT re-attempt the `s-maxage` fix.

---

## 12. Decision log cross-reference

Every threshold chosen here is recorded in `docs/DECISIONS.md` under the 2026-11-17 SEO Session 5 entry:
- The enable-flag default (false) + the empty dates map (the first-run deferral).
- The marquee signals M1–M5 + the ≥1-click M5 threshold.
- The robots-meta-level-only transition rule (no 301/404/robots.txt for ordinary season-end).
- The render-time predicate design (no batch job — bounded/idempotent/resumable by construction).
- The season-boundary source (FD `season.endDate`, not invented).
