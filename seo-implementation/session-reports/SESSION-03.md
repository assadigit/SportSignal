# SEO Program — Session 3 Report: Final Keyword-to-URL Mapping and SEO Architecture

- **Date:** 16 November 2026
- **Objective (per `phases/SESSION-03-KEYWORD-TO-URL-ARCHITECTURE.md`):** convert Session 2's validated keyword map and Session 1's audit into one approved mapping/blueprint document set — the keyword-to-URL map, the indexability matrix, and the route/canonical plan.
- **Outcome:** **Done in code, not deployed (docs-only session by design — no runtime change, so no deploy per the phase file and the start prompt).** All acceptance criteria met (see §10).

## 1. Scope executed

1. Read the full mandatory list in order (repo AGENTS.md; spec-pack README, AGENT-INSTRUCTIONS, PRODUCT-AND-SEO-STRATEGY, MASTER-SEO-SPEC §2-3, GSC-AUDIT-BASELINE; the SESSION-03 phase file; Session 1's audit + resource baseline; Session 2's validation report + validated map + SERP samples + evidence log; SESSION-01/02 reports; the tracker; plus the SESSION-04 phase file for the next-session prompt).
2. Re-derived the mapping statistics from the 369-row validated map with a script (never hand-computed): per-URL-class row counts, per-club team-page demand, time-hub and competition-page distributions, P1 heads per URL, hold/excluded inventories — §5 below.
3. Re-derived the C1 per-URL evidence table from the original GSC export (Pages.csv × the live 87-URL teams sitemap): the 13-vs-114 split, the click-earners, the impression heads, the top-10/top-20 concentration, the 19 in-sitemap-but-absent-from-GSC URLs.
4. Live spot-verification against production (the phase's "reviewed against existing routes" criterion, no wholesale re-audit): teams.xml (87 = 13 selected + 74 non-selected, all 13 selected slugs incl. the provider-derived Inter/Atlético slugs), `/teams/fulham` + `/teams/lecce` (non-selected URLs are indexable + self-canonical today — the C1 problem live), `/teams` + `/competitions` index pages, `/matches?page=2` + `?page=3` (self-canonical with query + «صفحه N» suffix), this-week/this-weekend hubs, all 5 sitemap children (15/7/87/123/151 = 383).
5. Re-verified every code citation used in the deliverables at HEAD `4d93541`: `isBigForSeo` (`src/seo/data.ts:114-122`), `teamsIndex` both-sides loop (`src/seo/data.ts:276-310`), `shouldReport` (`src/match-classify.ts:161-174`), `MIN_UPCOMING_FOR_INDEX = 1` (`src/seo/config.ts:62`), pagination canonical (`src/seo/pages.ts:1419-1458`), team-page title ladder (`src/seo/pages.ts:2020-2032`), match-title ladder (`src/seo/pages.ts:1060-1085`), homepage title/desc (`src/seo/router.ts:107-165`), `TEAM_SLUGS`/`COMP_SLUGS`/`matchPath` (`src/slugs.ts`), the 404 regex + page-cache key (`src/seo/router.ts:784-798`), sitemap children construction (`src/seo/files.ts:244-285`).
6. Wrote the three deliverables, updated the tracker, wrote this report, and created the Session 4 standalone prompt.

## 2. Findings — the decisions this blueprint makes

**D1 — C1 team-page disposition (the central decision).** The 74 non-selected team URLs in the live sitemap (114 in GSC incl. historical) go **`noindex, follow` + removal from `teams.xml` (87 → 13 rows)** — never robots-blocked, never 404/redirect/deleted; pages keep serving 200, self-canonical, fully linked (the noindex-must-stay-crawlable law). Evidence per URL: 114 non-selected URLs / 8 clicks / 1,297 impr / 0.62% CTR; the 8 click-earners are 1-click-each URLs over ~3 months; top-10 URLs carry 48% of the impressions; the demand is largely matchup spillover (Sabah/Copenhagen/Twente are selected clubs' UCL opponents — served by the match-detail pages). No backlink tool exists — recorded honestly; reversibility design + a season-end re-read of the demand table are the spec-required review's completion. Implementation: Session 4, Option A preferred (sitemap filter + indexable-rule flip; zero marginal KV/subrequest/CPU — an in-memory allowlist test on data already read).

**D2 — the top-3-standings route STAYS** as the de-facto "independently important match" implementation (`isBigForSeo`): 184 of 264 (70%) observed match-detail GSC rows exist via it, the demand is real (the passive one-off heads are its URLs), and it matches PRODUCT-AND-SEO-STRATEGY §4.B. The owner may overlay/narrow it later — flagged as revisit-able in DECISIONS, not changed.

**D3 — `?page=N` policy: keep self-canonical-per-page** (verified live: page 2/3 self-canonical WITH the query, «صفحه N» suffix, clamped by content). Each page is a distinct 50-match slice with GSC rows of its own; no consolidation. S2 (does Google honor it) stays on Session 4's verify list for a fresh GSC export.

**D4 — empty hubs stay indexable** (C5 resolved as deliberate): `/matches/tomorrow` is the best-CTR surface (8.26%) WITH the honest empty state; daily indexability oscillation would be worse than the thin day. Session 9 refines empty-state content only.

**D5 — the Inter/Atlético provider-derived slugs ARE the canonical URLs** (`/teams/internazionale-milano`, `/teams/club-atletico-de-madrid`): they are what GSC, the sitemap, and every internal link use. No slug "fix" (that would be a URL migration for zero benefit); optionally Session 8 aligns the dead `TEAM_SLUGS` pins as a no-op tidiness fix. URL identity, not a spelling change — the Dec 8 freeze untouched.

**D6 — hreflang stance: zero until Session 12.** No EN URLs, no hreflang markup (spec §7 forbids hreflang for absent translations; zero English-query evidence). Every URL class carries an English title/H1 PLAN SLOT only, so Session 12 can act without re-deriving the mapping.

**D7 — mapping law inherited with ZERO deviations.** All 7 one-URL rules carry forward as build law; the 7-entry cannibalization register becomes the regression checklist for Sessions 6-10; the holds queue (EL/ECL/FA Cup/Copa/Coppa + English + out-of-scope) stays explicit non-mapping pending Sessions 9/12.

## 3. Files changed (this session — all docs, no code)

- `seo-implementation/keyword-research/KEYWORD-TO-URL-MAP.md` — NEW (the mapping: 15 URL classes → primary cluster → representative phrases → Persian title/H1/meta plan + English Session-12 slots → owner rule; the conditional match-eligibility law; the freeze schedule; the live cross-check record).
- `seo-implementation/architecture/INDEXABILITY-MATRIX.csv` — NEW (every existing route class — 16 rows from homepage through legacy GET actions — × disposition (index/noindex/404/keep-out-of-sitemap) × robots-meta × canonical rule × sitemap inclusion × evidence × implementing session).
- `seo-implementation/architecture/ROUTE-AND-CANONICAL-PLAN.md` — NEW (canonical strategy per class; the C1 disposition plan with the per-URL evidence table and reversibility design; the top-3-route decision; pagination/query-param policy; empty-hub + index-page decisions; sitemap plan 383→309; the Inter/Atlético slug identity; hreflang stance; redirect policy; the Session 4-12 sequencing table with budgets).
- `sportsignal-seo-implementation/IMPLEMENTATION-TRACKER.md` — Session 03 row updated.
- `seo-implementation/session-reports/SESSION-03.md` — this file.
- `seo-implementation/next-session-prompt.md` — REWRITTEN as the Session 4 standalone prompt.
- `docs/HANDOFF.md`, `CHANGELOG.md`, `docs/DECISIONS.md` — repo-convention updates (AGENTS.md §10).

**No `src/`, `assets/`, config or workflow files were touched. No version bump. No deploy.**

## 4. Implementation decisions and deviations

1. **No code changes, no deploy** — per the phase file and the start prompt (planning/documentation session; the first implementation session is 4). Production remains at versioned deployment `c97ae70b-c4b8-4a11-a840-34d8b93f19a7` (`13.259.1-archttl`), verified live in Session 1; nothing the Worker serves changed.
2. **Every number machine-derived** — the map statistics from a Python script over `VALIDATED-KEYWORD-MAP.csv`; the C1 table from Pages.csv × the live teams sitemap. No hand arithmetic; no volume/CPC/difficulty number exists anywhere (no volume tool has ever been available in this program).
3. **The C1 disposition is per-URL-evidenced, not bulk** — the spec's demand/backlink review was executed on the demand axis (the full 114-row table derived; the disposition-relevant tiers documented in the route plan §2.2); backlink data does not exist in this program (recorded as an honest gap with the reversibility design as the compensating control; a backlink check is folded into Session 8's verification if the owner supplies a tool).
4. **Spot-verification scope choice** — the phase file says spot-verify, don't re-audit; this session verified exactly the inputs the blueprint relies on that Sessions 1-2 had not covered per-URL (the non-selected team URL indexability, the index pages, the pagination canonicals live) plus re-read the 9 source locations cited. Nothing diverged from the audit's record.
5. **Deviation from Session 2's inherited law: none.** The blueprint adopts all 7 one-URL rules verbatim; the only new decisions (D1-D6) are within the spaces Session 2 explicitly left open (C1, top-3 route, pagination, empty hubs, slug identity, hreflang).

## 5. Tests and exact outcomes

- `npm install` (npm only, per AGENTS.md §11): completed, no dependency changes.
- `npm test`: **exit 0** — `npx tsc --noEmit` clean + 48 check scripts, **3,615 OK** assertions, 0 failures (matches the Session 1/2 baseline exactly; expected — zero code changed).
- Deliverable integrity checks (scripted): validated map re-read = 369 rows, 0 duplicate keyword strings, 0 placeholder targets; retained rows 312 across 27 unique target URLs, all within the 6 existing route classes; 86 match-detail rows all conditional-pattern; 100 team rows all on the 13 allowlist URLs; 20 English rows all held; 15 non-selected-club rows all excluded-with-evidence.
- Live cross-checks: teams.xml 200 (87 URLs = 13 + 74; all 13 selected slugs present); `/teams/fulham` + `/teams/lecce` 200 + indexable + self-canonical; `/teams` + `/competitions` 200 + indexable; `?page=2/3` 200 + self-canonical with query; this-week/this-weekend 200 + indexable; sitemap children 15/7/87/123/151 (383 total — unchanged from Session 1).
- C1 evidence re-derivation: 127 GSC team rows = 13 selected (8 clicks / 1,159 impr / 0.69%) + 114 non-selected (8 / 1,297 / 0.62%) — matches Session 2's verified split exactly; top-10 non-selected = 48% of impressions, top-20 = 66%; 8 click-earners (1 click each); 19 of 87 live-sitemap URLs absent from GSC (partial-export caveat recorded).
- Not run: `npm run seo:check` (the live T-01…T-25 verifier) — this session changed no code; the manual spot-checks above covered the blueprint's live inputs. It is the designated verifier for Session 4+.

## 6. Checkpoints (commits, SHAs, push status)

| Checkpoint | Commit | Push |
|---|---|---|
| The three architecture deliverables (KEYWORD-TO-URL-MAP.md, INDEXABILITY-MATRIX.csv, ROUTE-AND-CANONICAL-PLAN.md) | `a3dd1c7` | pushed to `main` (ls-remote verified) |
| Session report + tracker update + Session 4 prompt + repo docs (HANDOFF/CHANGELOG/DECISIONS) | `a045ffe` | pushed to `main` (ls-remote verified; remote main = `a045ffe`) |

Push discipline: `git fetch` before push (no concurrent movement), one-shot token-URL push (token never persisted in git config, files, logs or reports), `git ls-remote` verification after each push.

## 7. Deployment and verification

**No deploy — by design.** This session produced documentation only; there is no runtime change to verify. Production remains at versioned deployment `c97ae70b-c4b8-4a11-a840-34d8b93f19a7` (`13.259.1-archttl`). Nothing about the Worker, bindings, assets or configuration changed. Session 4 is the first implementation session and will deploy through the established versioned flow.

## 8. Cloudflare / runtime effects

**None.** Zero runtime cost introduced: the deliverables are markdown/CSV docs. The blueprint's only implementation proposals state their budgets: the C1 fix = zero marginal KV/subrequest/CPU (in-memory allowlist filter on the existing sitemap iteration); C6 = a header addition on non-prod hosts; C8 = a cache-header normalization. Every later-session item in the sequencing table carries its budget note (route plan §10).

## 9. Unresolved risks and blockers

1. **Evidence gap — still no fresh GSC export** (the program's top request, third session running). The 2026-11-15 export remains the only demand source; the C1 disposition would be stronger with backlink data and URL-level index samples (S1/S4). The request is repeated in the Session 4 prompt.
2. **The C1 noindex is Google-paced** — no timeline promise for the 74 URLs leaving the index; Session 8 verifies via GSC coverage and watches for anomalies. Reversible per URL by design.
3. **S2 (pagination canonical consolidation) unverifiable without page-level GSC data** — carried to Session 4's verify list.
4. **Team-page CTR problem is not solved by the C1 disposition** (Session 2's finding: 0.69% selected vs 0.62% non-selected — a title/snippet problem): the repo's parked Dec 4 title test owns the answer; Session 8 applies its result AFTER the gate. The blueprint schedules accordingly.
5. **Standing freezes carry forward:** GSC-measured surfaces + team-name spellings byte-frozen through Dec 4-8, 2026; avoid deploys around the Nov 20 Bayern–Köln windows (kickoff 19:30 UTC; M1 ~19:35, M2 ~21:35-45 UTC).

## 10. Acceptance criteria check (phase file)

| Criterion | Result |
|---|---|
| One primary keyword/intent cluster per canonical URL; no fragmentation into per-phrase targeting | **Met** — 15 URL classes, one primary cluster each, machine-derived from the 369-row map |
| Full mapping across homepage, 4 time hubs + `/matches` (+pagination), 5 leagues + UCL + DFB-Pokal, 13 team pages, match-detail (conditional) | **Met** — KEYWORD-TO-URL-MAP §1.1 + §2 |
| Fate of every current route class (87-URL teams sitemap, non-selected team URLs per-URL with demand evidence, `?page=N`, empty hubs, `/teams` + `/competitions` indexes) | **Met** — INDEXABILITY-MATRIX.csv (16 route classes) + ROUTE-AND-CANONICAL-PLAN §2-§6 |
| Index/noindex/redirect/removed per class with evidence; no blind deletion; noindex stays crawlable | **Met** — matrix evidence column + route plan §2 (per-URL table, no-robots-block law) |
| Overlaps resolved per one-URL rules; deviations documented | **Met** — zero deviations (KEYWORD-TO-URL-MAP §3) |
| Content/metadata map for Persian and English separately (plan only; freeze respected; EN = slots) | **Met** — per-class plans + EN slots; freeze schedule §6 |
| Confirm no page exists solely for a keyword variant | **Met** — KEYWORD-TO-URL-MAP §1.1 (map-side integrity checks + owner-rule-side verification) |
| Every indexable URL class has purpose, target intent, owner rule, canonical strategy | **Met** — map (purpose/intent/owner rule) + route plan §1 (canonical per class) |
| Team and match eligibility follows the editorial allowlist/exception model | **Met** — 13-club allowlist + the 4-route coverage law (top-3 decision recorded) |
| Plan reviewed against existing routes before implementation | **Met** — live spot-checks + source re-verification (KEYWORD-TO-URL-MAP §7) |
| Deliverables at the exact required paths | **Met** (3 files + tracker + this report + the Session 4 prompt) |

## 11. Next session

**Session 4 — Crawl, index, canonical, sitemap and redirect foundation** (the first implementation session; phase file: `sportsignal-seo-implementation/phases/SESSION-04-TECHNICAL-CRAWL-INDEX-FOUNDATION.md`). Full standalone prompt: `../next-session-prompt.md` (also printed to the owner in this session's final response). Do not start until the owner opens a new session with that prompt.
