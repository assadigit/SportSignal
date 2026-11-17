# Route and Canonical Plan — Session 3

> Agents: read AGENTS.md in the repo root first, and follow it for this whole task.

- **Date:** 16 November 2026
- **Session:** SEO Implementation Program, Session 3 of 15
- **Author:** SEO implementation agent (per `AGENT-INSTRUCTIONS.md`)
- **Code changes:** **None.** This is the blueprint Sessions 4+ implement. Every proposal below carries its Cloudflare free-tier budget (baseline: `../audit/CLOUDFLARE-RESOURCE-BASELINE.md` — KV writes 117/day of 1,000; ~31 subrequests/tick of ~50; the 10ms CPU cliff on cold renders).
- **Companion deliverables:** `../keyword-research/KEYWORD-TO-URL-MAP.md` (cluster assignment, metadata plans) and `INDEXABILITY-MATRIX.csv` (the per-route-class disposition table this plan explains).

---

## 1. Canonical strategy per URL class (summary)

One law first: **every HTML page self-canonicals** (the existing `page-shell` behavior, `src/seo/page-shell.ts:33-40`) — there are no cross-page canonicals anywhere in this architecture, because the one-URL-per-intent mapping (KEYWORD-TO-URL-MAP §3) already removed every duplicate-URL problem at the source. The only intentional exceptions: `?page=1` canonicalizes to `/matches` (query-drop), and the 404 emits no canonical (by design, F-L1).

| URL class | Canonical | Status today (verified) | Change planned |
|---|---|---|---|
| Homepage `/` | `https://sportsignal.ir/` | self-canonical ✓ | none |
| `/matches` | `https://sportsignal.ir/matches` | self-canonical ✓ | none |
| `/matches?page=N` (N≥2) | `https://sportsignal.ir/matches?page=N` — **query KEPT** | self-canonical incl. query ✓ (live: page 2, 3) | none (§4) |
| `/matches/today\|tomorrow\|this-week\|this-weekend` | self | self-canonical ✓ | none |
| `/teams/{slug}` (13 selected) | self | self-canonical ✓ | none |
| `/teams/{slug}` (74 non-selected) | self — **stays self-canonical after noindex** | self-canonical ✓ (currently indexable — the C1 change) | robots meta → `noindex, follow`; canonical stays self (§6.4) |
| `/teams`, `/competitions` | self | self-canonical ✓ | none |
| `/competitions/{slug}` (7 live) | self | self-canonical ✓ | none |
| Match detail | self (`/matches/{home}-vs-{away}-{YYYY-MM-DD}`) | self-canonical ✓ | none |
| Static pages | self | self-canonical ✓ | none |
| 404 | none emitted | none ✓ | none |
| Host variants (`www.`, `football.`, uppercase, trailing slash, `/public`) | 301 to apex canonical form | verified 6 single-hop 301s ✓ | none |

**Host/protocol normalization is already complete and verified** (audit §12: http→https, www→apex, football→apex, trailing-slash, uppercase→lowercase, `/public`→`/` — all single-hop). Session 4 re-verifies; no new redirect is proposed by this blueprint.

---

## 2. The C1 team-page disposition plan (the central decision)

### 2.1 The problem (verified, quantified)

`teamsIndex` (`src/seo/data.ts:276-310`) generates team entries for **both sides of every eligible pool match**, not from the 13-club selected allowlist. Result today: **87 URLs in `teams.xml` = 13 selected + 74 non-selected** (machine-verified from the live sitemap this session). GSC (2026-11-15 export, machine-derived this session):

| Segment | URLs | Clicks | Impressions | CTR |
|---|---:|---:|---:|---:|
| Selected-club team URLs | 13 | 8 | 1,159 | 0.69% |
| Non-selected team URLs | 114 | 8 | 1,297 | 0.62% |
| All team URLs | 127 | 16 | 2,456 | 0.65% |

The spec's law (MASTER-SEO-SPEC §2 "Team pages"; PRODUCT-AND-SEO-STRATEGY §6): *only selected clubs get indexable team pages*; any noindex/redirect/404 of existing non-selected URLs requires **demand/backlink review first — never blind deletion**. That review is below.

### 2.2 The evidence table (per-URL, from GSC Pages.csv — the disposition basis)

Non-selected team URLs by visible impressions (the full 114-row table is in the session report §5; the disposition-relevant head and tail are here):

| Tier | URLs | Evidence | Disposition |
|---|---|---|---|
| Click-earners (8 URLs, 1 click each) | sporting-clube-de-portugal (36 impr), ssc-napoli (19), thun (11), tottenham (9), vfl-bochum (7), 1-union-berlin (5), hertha-berlin (3), egnatia (1) | real but minimal demand; every URL stopped at exactly 1 click over ~3 months | **noindex** (same as the rest) — 8 clicks/3mo across 8 URLs does not justify indexable pages the owner's model excludes; the pages REMAIN live and crawlable, so any demand growth is visible in GSC and reversible (§2.5) |
| Impression heads (0 clicks) | heart-of-midlothian-f-c (138), como (127), inter-club-d-escaldes (80), sabah (55), roma (46), valencia (40), brighton-and-hove-albion (39), copenhagen (37) | top-10 non-selected URLs carry 48% of the non-selected impressions (top-20: 66%) — demand is real but shallow and heavily skewed to one-off European-tie opponents (Sabah, Copenhagen, Twente are selected clubs' UCL opponents — their demand is the *matchup's* demand spilling onto the team URL) | **noindex** — the matchup intent is served by the match-detail page (the conditional cluster); the team URL is a duplicate answer to it |
| Long tail (0-27 impressions each) | the remaining ~100 URLs incl. Iranian clubs (malavan 29, fajr-sepasi 16, persepolis 9 — out of product scope entirely) | zero clicks across the entire tail | **noindex** |
| In sitemap, absent from GSC (19 of the 87 live) | e.g. sv-07-elversberg, parma, leeds-united, ogc-nice | zero *visible* impressions in a partial export — absence ≠ zero demand, but no positive evidence either | **noindex** (same treatment; the 200-live page keeps serving) |

**Backlinks:** no backlink data source exists in this program (no tool access; recorded honestly). The spec's review requirement is satisfied on the demand axis (the table above) + the reversibility design (§2.4); a backlink check is folded into Session 8's verification if the owner supplies a tool/export, and the disposition is explicitly revisitable (§2.5).

### 2.3 The decision

1. **`/teams/{slug}` pages for the 13 selected clubs: indexable (the allowlist is the authority).** All further team-page work (content depth, internal links, title pattern after the parked test) is Session 8.
2. **The 74 non-selected team URLs currently in the sitemap: `noindex, follow` — and REMOVED from `teams.xml`.** Never robots-blocked, never 404, never redirected, never deleted. The pages keep serving 200 with full content, self-canonical, and keep their internal links (from `/teams` index tiles, match-page "تیم‌ها" links, and sibling fixtures) so Google can read the noindex directive (the crawlability law: a noindex that Google cannot crawl is invisible).
3. **`teamsIndex` generation scope: PROPOSAL for Session 4/8** — the code change that stops generating non-selected team URLs at the source is *not* this session's to make. Two implementation options, decided by Session 4 within its scope:
   - **Option A (preferred, smallest):** keep `teamsIndex` as-is (both sides — it also powers the `/teams` index page and match-page team links, which must keep working for ALL teams so the noindex stays crawlable), and change ONLY the sitemap child (`files.ts` teams branch) to filter to the selected-club allowlist + flip the team-page `indexable` rule to `allowlist || false`. **Budget: zero extra KV/subrequest/CPU** — the allowlist is an in-memory CONFIG lookup on data already read.
   - **Option B (broader):** a new `teamPageEligibility()` helper mirroring MASTER-SEO-SPEC §3's single-source-of-truth law (selectedClub check), consumed by sitemap + robots-meta + (later) internal-link weighting. Same budget (in-memory set membership), slightly more code surface. Session 4 may choose either; the blueprint's acceptance test is identical: teams.xml = 13 rows; non-selected team URLs serve `noindex, follow` + 200; internal links to them intact.
4. **The `/teams` index page keeps listing every pool team** (it is the crawl path for the noindexed URLs). Tile ordering may put the 13 selected clubs first — Session 10's call, cosmetic only.

### 2.4 Why noindex (not redirect, not 404)

- **404/410** would break the internal-link graph (match pages link both teams' pages: `src/seo/pages.ts` related-links "تیم‌ها" row) and delete real served content for fixtures that DO involve those teams as selected-club opponents. Spec Phase D: 404 only when content is gone and no replacement exists — not the case here.
- **301** has no true equivalent destination (the team's fixtures are not "the same content" as a competition page or the homepage) — spec Phase D forbids redirecting arbitrary pages to homepage/competition pages.
- **noindex (keep 200, crawlable, linked)** is the only disposition that (a) implements the owner's selected-clubs-only indexability decision, (b) preserves the user experience for anyone landing on the URL, (c) keeps the internal-link crawl graph intact, and (d) is fully reversible by removing one meta tag if evidence changes.

### 2.5 Reversibility and monitoring (the no-blind-deletion guarantee)

- The disposition is a meta tag + sitemap row removal — byte-reversible per URL.
- Session 8 verifies in GSC (coverage report: the 74 URLs moving from "Indexed" to "Excluded by noindex") and watches for anomalies (e.g. any URL still accumulating impressions after the noindex is read — which would be a signal to reconsider, via the owner).
- **Season-end review hook:** at the season close (or when a fresh GSC export with URL-level data arrives — still the program's top evidence request), re-read the demand table; any non-selected club showing sustained clicks (>1/mo sustained, not a one-off) becomes an owner-decision candidate for allowlist promotion (a PRODUCT decision: the allowlist is season-stable by design, so this is flagged, not automated).

### 2.6 Expected effect (honestly bounded)

Teams sitemap drops 87 → 13 URLs; Google's team-URL index count trends toward 13 over weeks (no timeline promise — noindex removal from the index is Google-paced). Crawl budget concentrating on the 13 selected pages is the mechanism, not a traffic projection: **no traffic-upside number is modeled** (no volume data exists; the site's team-page CTR problem is the parked title test's to solve, and it affects the 13 keepers identically).

---

## 3. The top-3-standings coverage route — decision: STAYS

`isBigForSeo` (`src/seo/data.ts:114-122`) marks a fixture SEO-eligible when either side sits in the competition's top-3 standings (`payloadTop3` from the cached standings), independent of the selected-club allowlist. **184 of 264 (70%)** observed match-detail GSC rows exist via this route (Session 2 verification-pass count).

**Decision: the route stays as the de-facto implementation of "independently important match" (PRODUCT-AND-SEO-STRATEGY §4.B — the automated title/table-race signal).** Rationale:

1. The demand is real and matches the product promise: the passive one-off matchup heads (Atalanta–Kairat 329 impr, Monaco–Nordsjaelland 244, Man Utd–Roma 210 — all top-3-route URLs with zero clicks at pos 12+) are exactly "big matches" the curation exists to serve.
2. It is bounded and source-verified: top-3 of covered competitions only, from the standings cache (no new fetches; `payloadTop3` reads the payload already in KV context).
3. Removing it would orphan ~70% of observed match-detail demand and contradict the spec's exception model.

The owner may narrow/overlay it later (a manual-exception list on top) — a product decision recorded as revisit-able in `docs/DECISIONS.md`, not an SEO default. Sessions 5/7 inherit this as eligibility law.

---

## 4. Pagination and query-parameter policy

### 4.1 `?page=N` on `/matches` (the only paginated surface)

**Current policy (verified live this session): keep it.**

- `/matches` and `?page=1` canonicalize to `/matches`; each `?page=N` (N≥2) is **self-canonical including the query**, indexable, titled «… — صفحه N | اسپرت سیگنال» (Persian digits), cached per full key (`path + ?page=N`, `src/seo/router.ts:784`).
- Why self-canonical rather than canonical-to-page-1: each page's content is a distinct 50-match slice (`buildMatchesPage`, `src/seo/pages.ts:1419-1458`) — consolidating would deliberately de-index real content pages that GSC already shows rows for (`?page=2`, `?page=3` in the export).
- Bounded: `Math.min(page, totalPages)` clamps outranged pages back to the last page — no infinite/empty pagination URLs.
- Sitemaps do NOT list pagination URLs (correct — they're linked from the hub's own pagination nav; discovered by crawl).
- **S2 (suspected: does Google honor the query-kept canonical?) stays on the Session 4 verify list**: with a fresh GSC export, check that `?page=2` reports as its own canonical URL, not consolidated. If GSC ever shows consolidation trouble, the fallback is a `rel="prev/next"`-style internal-link strengthening — not a canonical change.

### 4.2 All other query parameters

- `?action=…` — legacy bot actions; the SEO router bypasses them entirely (`url.searchParams.has("action") → null`, `src/seo/router.ts:515`). Not public surfaces; no SEO treatment. No change.
- Any OTHER query string on a canonical route (e.g. `/matches/today?utm=x`): serves the page (query ignored by the router's path matching); the page's self-canonical without the query handles consolidation. Verified behavior class in Session 1 (canonicals correct on 12 sampled pages). No change.
- **Policy statement for implementers:** no new indexable query-parameter URLs. Any future parameter surface (filters, tracking) must self-canonical to the bare path. `?page=` is the single grandfathered exception.

---

## 5. Empty-hub indexability (C5) and the `/teams` + `/competitions` index pages

- **Empty time hubs (incl. `/matches/tomorrow` on empty days): stay indexable.** This is the deliberate thin-content tradeoff the audit recorded (C5): `/matches/tomorrow` is the site's best-CTR surface (8.26%) WITH an honest empty state (spec-mandated copy, verified live on a genuinely empty day). Flipping empty days to noindex would make the URL's indexability oscillate daily — worse for consistency than the thin day. Session 9 refines the empty-state content (the spec's recommended Persian copy is already live); the indexability decision is final here.
- **Competition pages at 0 upcoming:** keep the current rules — `noindex, follow` at 0 upcoming (`MIN_UPCOMING_FOR_INDEX = 1`), 404 when no pool rows at all. A noindex competition page stays crawlable (linked from `/competitions`) — same law as teams.
- **`/teams` and `/competitions` index pages: keep indexable** (both verified live this session: 200, indexable, self-canonical, tile grids + ItemList JSON-LD). They are the crawl backbone for the noindexed team URLs (§2.3) and the 7 competition pages. No thin-content concern: they are link hubs with real tiles.

---

## 6. Sitemap plan (input to Session 4's sitemap work)

| Sitemap child | Today | After Session 4 implements this blueprint |
|---|---|---|
| `pages.xml` | 15 URLs | 15 (unchanged — all classes stay indexable) |
| `competitions.xml` | 7 URLs | 7 (unchanged) |
| `teams.xml` | **87 URLs** | **13 URLs** (the allowlist rows; the C1 fix) |
| `matches-upcoming.xml` | 123 URLs | 123 (unchanged; eligibility law unchanged) |
| `matches-archive.xml` | 151 URLs | 151 (unchanged; the 365-day archive serve stays) |

Budget for the change: **zero marginal cost** — the teams child already iterates `teamsIndex(ctx)` (one KV-context read that happens regardless); the filter is an in-memory allowlist membership test. Lastmod semantics (change-only hash map, `seo_lastmod_v1`) are untouched. IndexNow pings only changed URLs — the 74 removed rows will not ping (they leave the candidate set, which is the correct no-ping behavior for removals; GSC re-reads the child sitemap on its own cadence).

**Standing rule (spec §5, already implemented, preserved):** sitemaps list only canonical, indexable, 200 URLs — no noindex/redirect/404 rows. After the C1 fix this invariant becomes fully true for teams (today the 87 rows are all indexable so the invariant holds; post-fix the 13 remaining rows are the indexable set).

---

## 7. Team-slug URL identity (Inter/Atlético)

The live canonical URLs for two selected clubs are **provider-derived**: `/teams/internazionale-milano` and `/teams/club-atletico-de-madrid` — NOT the pinned `TEAM_SLUGS` values (`inter-milan`, `atletico-madrid`; `src/slugs.ts:45-70`), because the provider's team names ("FC Internazionale Milano", "Club Atlético de Madrid") differ from the pinned keys and `teamSlug()` falls through to the derived path. All 13 selected-club slugs including these two are present in the live sitemap (verified this session), so **nothing is broken** — but the divergence is recorded as the URL identity:

- **Decision: the live provider-derived slugs ARE the canonical URLs.** They are the URLs GSC has impressions for, the sitemap lists, and every internal link emits (all links route through `teamSlug()` — one source of truth, `src/slugs.ts` header).
- **Do NOT "fix" `TEAM_SLUGS` to match the provider names** — a slug change is a URL change (301 migration for zero benefit). The pinned values are simply dead entries for these two clubs; optionally Session 8 aligns the pinned table to reality (adding the provider-name keys) as a no-op tidiness fix with zero URL effect. This is a URL-identity question, NOT a spelling change — the Dec 8 team-name spelling freeze (visible Persian names) is untouched by any of it.

---

## 8. Hreflang stance — FINAL (Session 12 decided: Option (b) — maintain the single-language stance)

**Current state (audit C2, re-verified Session 12): zero hreflang, zero English URLs.** The EN/FA toggle is client-side only (the `?lang=en` query — a runtime display toggle, NOT a URL architecture); every page ships `<html lang="fa" dir="rtl">`; `scripts/seo-check.js:461-463` codifies the single-language decision (T-08 — "site is single-language (fa) — hreflang not applicable"). The only `lang="en"` references in the codebase are the client-side EN button + the `html[lang="en"]` CSS rules in `src/pages/public.ts` (the display toggle, NOT server-side EN pages).

**Session 12 decided Option (b) — the single-language stance is FINAL (no longer "pending Session 12").** The decision (`docs/DECISIONS.md` S12-1) rests on three independently-verified evidence axes, all decisive for (b):

1. **English-query demand = ZERO.** Session 12 re-verified the demand directly from the 2026-11-15 GSC export (`Queries.csv`): 375 visible query rows, 374 Persian (or Persian-with-a-club-name-token), the 1 Latin-only string is "kups" (KuPS — the Finnish club, a one-off European-tie opponent; 1 impression, 0 clicks). ZERO full English queries. Iran = 248 clicks / 8,774 impressions (98.4% of clicks); the top English-speaking countries (US/UK/Canada/Ireland) collectively = 0 clicks / ~23 impressions at poor positions (Persian-diaspora searches, not English queries). Mobile = 94.8% of clicks.
2. **The localization cost against the Worker budget is NOT justified.** Building `/en/` URLs doubles the page count (~383 → ~766 sitemap URLs) + doubles the KV-read demand (each EN page render reads the same `getSeoCtx` data) — and the 100,000 KV reads/day free-plan limit is ALREADY exceeded DAILY (Sessions 5-11). The 10ms CPU/invocation cliff is chronic (37 `exceededResources` in 3h on v13.258, 789 on Nov 10); doubling the page count doubles the cold-render exposure. The free-tier budget cannot absorb the doubling; a Workers Paid plan ($5/mo → 1M reads/day) is a prerequisite for any future `/en/` architecture.
3. **The EN SERP is saturated** by high-authority English-native publishers (BBC Sport, ESPN, the league-official sites, Flashscore, Sofascore). The curation differentiator («برنامه بازی‌های مهم فوتبال») does not translate to a competitive English advantage. The site's best-CTR surfaces are ALL Persian-query surfaces.

**The FINAL stance (S12-1, S12-2):**

1. **No hreflang and no `/en/` URLs.** Emitting hreflang for an absent or non-equivalent translation is a spec violation (MASTER-SEO-SPEC §7 — "Do not emit hreflang for an absent or non-equivalent translation"), and there is zero English-query evidence to justify the URLs. The client-side `?lang=en` toggle stays as the ONLY English surface — it is NOT an SEO surface and was never the basis for an EN URL architecture.
2. **The keyword map §2 English plan slots are RETIRED as active plan slots** — they remain in the map as the documented Option (a) contingency (what the EN titles/H1s WOULD be if a future session re-litigates and chooses Option (a)), but they are no longer "pending Session 12" slots. A future session that wants to build `/en/` URLs must re-litigate ALL THREE evidence axes (S12-1 revisit clause) with a fresh 16-month GSC export showing real English-query demand + a Workers Paid plan in place + a demonstrated competitive angle.
3. **No URL, no markup, no canonical change.** Every FA page stays self-canonical; `<html lang="fa" dir="rtl">` stays; `og:locale=fa_IR` stays; the T-08 live-audit gate stays.
4. **Constraint carried forward (for any future Option (a) re-litigation):** if a future session builds EN URLs, each language page self-canonicals per language URL and the hreflang set must be reciprocal and complete (fa-IR + en) — including `x-default` only if a genuine language-neutral entry exists.

---

## 9. Redirect policy (standing)

- Existing verified matrix stays: http→https, www→apex, football→apex, trailing-slash, uppercase→lowercase, `/public`→`/` (all single-hop 301s). No new redirects are proposed by this blueprint.
- **No bulk redirects ever** (spec Phase D; AGENT-INSTRUCTIONS): the 159-404 class is already correctly handled (custom 404 + the S28 archive serve restoring the legitimate ones); Session 5 formalizes the season-end classification.
- The 74 noindexed team URLs get NO redirect (§2.4).

---

## 10. Implementation sequencing (which session does what)

| Item | Session | Budget note |
|---|---|---|
| teams.xml 87→13 + non-selected team URLs → `noindex, follow` (C1) | **4** | zero marginal KV/subrequest/CPU (in-memory allowlist filter on existing iteration) |
| C6: non-prod `x-robots-tag` on machine files | 4 | trivial header addition on non-prod hosts only |
| C8 (optional): `/api/public-matches` edge TTL normalization | 4 | cache-header change only |
| Pagination `?page=N` policy verification in GSC (S2) | 4 (needs fresh export) | read-only |
| Match lifecycle thresholds (`MATCH-LIFECYCLE-POLICY.md`) | 5 | bounded season-end job design; must be idempotent + resumable |
| Homepage/featured/window work | 6 | render-cost aware (the 10ms cliff; hero changes state their budget) |
| Match-detail metadata refinements | 7 | within the existing template; frozen-surface changes only after Dec 4-8 |
| Team pages: content depth + internal links; title pattern AFTER the Dec 4 gate | 8 | KV-read-cheap (existing teamMatches path) |
| Competition/date/empty-state content decisions + the held-competitions threshold review | 9 | content-first; no thin pages |
| Internal linking/nav (tile order, anchor wording per the cannibalization checklist) | 10 | markup-only |
| Persian entity naming/metadata polish | 11 | spelling-freeze-aware (post-Dec 8 for frozen surfaces) |
| EN architecture + hreflang decision | 12 (DONE — Option (b): maintain the single-language stance, FINAL) | docs-only; no new URLs (zero English-query demand + the 2× KV-read/CPU cost is not justified on the free plan; see §8 + DECISIONS S12-1) |
| Structured data + GSC enhancement validation | 13 (DONE — docs-only: the 13 "Missing field location" GSC Critical items + the 4 non-critical issue types [endDate 31 / offers 31 / performer 31 / address-in-location 18] are ALL the honest "missing recommended field" class; the schema type IS SportsEvent; the MISSING-IS-NOT-ZERO law holds; no code change, no deploy) | zero marginal KV/subrequest/CPU (docs-only — read-only inspection; the `if (m.venue)` guard in `jsonld.ts:149-154` + the fail-closed `hydrateMatchVenue` in `data.ts:506-567` already correct; the existing `check-match-centre.js` S20 gate + the `seo-check.js` T-04 gate already pin the SportsEvent contract; the Schema Markup Validator confirms both the with-venue + no-venue match pages are schema.org-VALID; see DECISIONS S13-1/S13-2/S13-3) |
| Mobile performance + GSC monitoring + optional GA4 | 14 (DONE — deployed `13.268.0-perf-preconnect`: the S24-P2 preconnect to crests.football-data.org on the homepage + the SEO page shell [freeze-safe — a render-performance HINT, zero new runtime fetch/subrequest/KV-read/CPU]; the S24-P1 hero `loading="lazy"` REJECTED [the hero is the above-the-fold LCP image with `fetchpriority="high"` + a preload]; the GA4 DEFER [the CMP + the privacy policy + the performance budget are the prerequisites; the Cloudflare Web Analytics cookieless RUM is already installed]; the GSC monitoring view [`seo-implementation/GSC-MONITORING-VIEW.md`]; the new `check-seo-performance.js` gate [17 gates]) | zero marginal KV/subrequest/CPU (the preconnect is a client-side HINT — the Worker emits the `<link>` in the HTML head; the browser MAY open the connection but the Worker does NOT fetch; the GA4 DEFER adds nothing to the runtime; the GSC monitoring view is documentation-only; see DECISIONS S14-1/S14-2/S14-3/S14-4/S14-5) |
| Final regression + production QA + handoff (the 15-session close-out) | 15 (DONE — docs-only; the regression is CLEAN: all 19 sampled HTML pages + the 4 machine files return 200 with the correct SEO contracts; all 56 check scripts pass [3,738 OK; `npx tsc --noEmit` clean]; no unsupported live/broadcast claims; no unselected club page indexable [4 non-selected slugs verified noindex,follow]; the byte-frozen surfaces unchanged [git clean — the session runs before Dec 9, the freeze HOLDS]; the Cloudflare budget healthy [`ok:true` + `pool_matches:324` + `kv_writes_day:403` + `subreq_last_tick:31`]; the Workers Analytics GraphQL confirms the chronic C7 10ms CPU cliff [4,832 exceededResources over Nov 16-17 — NOT caused by the SEO program, zero Worker CPU added]; no deploy — the live deployment `a4cc2982` @100% = `13.268.0-perf-preconnect` STAYS; the FINAL-SEO-IMPLEMENTATION-REPORT.md + the "project complete" handoff delivered) | zero marginal KV/subrequest/CPU (docs-only — no `src/`/`scripts/`/`assets/` change, no version bump, no deploy; the regression is read-only on the byte-frozen surfaces; the S12/S13/S14 decisions STAY; see DECISIONS S15-1/S15-2/S15-3) |

**Standing constraints carried into every implementation session:** the Dec 4-8 measurement freeze (GSC-measured surfaces + team-name spellings byte-frozen); no deploys in the Nov 20 Bayern–Köln S27 windows (kickoff 19:30 UTC; M1 ~19:35, M2 ~21:35-45 UTC); npm only; `npm test` exit 0 before every push; versioned deploys only; no new per-request fetches, no client polling, no unbounded cron.
