# SEO Program — Session 2 Report: Keyword Research Validation and Expansion

- **Date:** 16 November 2026
- **Objective (per `phases/SESSION-02-KEYWORD-RESEARCH-VALIDATION.md`):** validate and expand the 200-phrase seed bank before any keyword-driven implementation; produce the keyword-research deliverables, update the tracker, and prepare the Session 3 prompt.
- **Outcome:** **Done in code, not deployed (docs-only session by design — no runtime change, so no deploy per the phase file and the start prompt).** All acceptance criteria met (see §10).

## 1. Scope executed

1. Read the full mandatory list (AGENTS.md, the spec pack README/AGENT-INSTRUCTIONS/STRATEGY/MASTER-SPEC/GSC-BASELINE/KEYWORD-RESEARCH/SOURCE-RESEARCH/TRACKER/phase file + Session 1's report and audit) and re-inspected the original GSC export in full (all 13 CSVs, not the summary).
2. Re-queried/segmented the GSC data: language (374/375 Persian-script), geography (Iran 99.2% of country clicks / 92.7% of impressions; next: Afghanistan 438 impr), device (mobile 94.8% clicks / 96.6% impressions), intent buckets across all 375 visible queries, page-type segmentation, and a quantified privacy gap (55.8% of impressions / 90.8% of clicks unattributed to visible queries).
3. Re-verified the selected-club allowlist from source (`src/config.ts:38-100`) including the admin-overlay nuance (`src/admin.ts:56-79`) — and recorded a **correction: the allowlist has 13 European clubs, not 14** (machine-counted; Session 1 and the start prompt carried a miscount).
4. Validated the seed bank: all 70 "GSC observed" claims verified present in Queries.csv with matching metrics; 6 ineligible team-page targets re-mapped (non-selected clubs); fuzzy targets resolved to exactly one URL type each; the seed file itself left unchanged (version-history rule).
5. Gathered fresh demand evidence within this sandbox's real limits: Google Suggest autocomplete (20 heads, `hl=fa&gl=IR`, 177 suggestions), Google News RSS (6 queries, fa/IR), live competitor formats (ScoreYab, Soot360, 365Scores fetched; TVeto Cloudflare-blocked), live sportsignal.ir page titles + the 87-URL teams sitemap. Direct Google SERP and Bing-Persian were tested and are NOT accessible from this environment — recorded as limitations, never worked around with fabricated data.
6. Built the validated keyword map: **374 rows in the initial build** (200 seed-annotated + 174 expansion), clustered, one-URL-per-intent rules, cannibalization register, 24 documented exclusions (broadcast/lineup/ticket/non-selected/navigational), 33 holds, zero volumes invented.
7. **Post-delivery verification pass (same session):** independently re-derived every headline number from the raw export and repo source. Confirmed the segmentation arithmetic exactly (privacy gap 55.8%/90.8%; Iran 99.2%/92.7%; mobile 94.8%/96.6%; team-page split 13 URLs 0.69% vs 114 URLs 0.62%; 70/70 seed GSC claims). Found and fixed four defects in place: (a) row 73's `TEAM?` placeholder target URL → `/teams/internazionale-milano`; (b) 5 exact-duplicate keyword rows with conflicting targets (removed; both-clubs row re-resolved to match detail per rule 4); (c) the "174 of 264 (66%)" non-selected-club share was a miscount — true value **184 of 264 (70%)**, corrected in all four documents; (d) evidence-class counts corrected to the unique counts (**198 GSC-observed / 38 autocomplete / 133 candidates = 369 rows**). The corrected map passes all integrity checks (0 placeholders, 0 off-allowlist team targets, 0 retained rows without targets, 0 duplicates, 0 invented volumes; all GSC strings + per-string metrics verified against raw Queries.csv). Full detail: KEYWORD-VALIDATION-REPORT.md §12.
8. Updated the tracker (Session 02 row), wrote this report, and created the standalone Session 3 prompt.

## 2. Findings — confirmed vs corrected vs still open

**Confirmed (evidence in the deliverables):**
- Next-match intent is the core team-page demand and is heavily concentrated: the Barcelona name-cluster alone carries ~546 of ~712 visible next-match impressions (77%); Bayern 65, Inter 44, Milan 28, Liverpool 26, Arsenal 43 (incl. «ارسنال» spelling), Man City 22; Chelsea and Man Utd ~1-11 each.
- `/matches/tomorrow` is the site's best-CTR surface (18 clicks / 218 impr / 8.26%) — the tomorrow query family justifies P1.
- «بارسلونا مقابل منچستر سیتی 2026» is the site's best query (6 clicks / 103 impr / avg pos 3.25) — the exact-slug match-detail URL pattern is the strongest ranking surface; the conditional-matchup mapping rule is validated by it.
- The top-clicking visible query overall is a broadcast-intent query («مکان تماشای بولونیا درمقابل مونتزا», 8 clicks) — deliberately excluded per the product promise; broadcast+lineup+ticket intents total ~345 impr / 8 of 23 attributed clicks.
- 174 of 264 match-detail GSC rows (66%) involve no selected club — **corrected to 184 of 264 (70%) by the post-delivery verification pass (see §4a)** — they exist via the live `isBigForSeo` top-3-standings route (`src/seo/data.ts:112-122`), the automated "important table race" mechanism. The keyword map treats those URLs as legitimate conditional targets.
- Team-page CTR is poor across the board: 13 selected-club URLs → 8 clicks / 1,159 impr (0.69%) vs 114 non-selected URLs → 8 clicks / 1,297 impr (0.62%). The team-page problem is a title/snippet/template problem (the repo's parked Dec 4 title test), not merely a selection problem.
- Zero English-query evidence (1 Latin string total; no English-geo demand). English stays Session 12 candidates; no English SERP sampling was justified (per the phase rule, only evidenced geographies may be sampled).

**Corrected (vs the Session 1 record):**
- **13 selected European clubs, not 14** (PL 5 + PD 3 + SA 2 + FL1 1 + BL1 2). Logged in `docs/DECISIONS.md`; Session 3+ docs should use 13.
- The start prompt's "96.6% of impressions from Iran" conflated reports: 96.6% is the mobile impression share; Iran's impression share is 92.7% (99.2% of clicks). Strategic conclusion unchanged (Persian-first, mobile-first).
- Inter and Atlético serve at provider-derived slugs (`/teams/internazionale-milano`, `/teams/club-atletico-de-madrid`), not the pinned `TEAM_SLUGS` values (`inter-milan`, `atletico-madrid`) — a URL-identity fact for Session 3, not a spelling change; the freeze is untouched.

**Still open (fed to Session 3 with the evidence packs):**
- The C1/S1 decision: what happens to the 87-URL teams sitemap and the 114 non-selected team URLs with demand (Brighton 22, Como 21+44, Copenhagen 22, Twente 16, Roma 17, Malavan 13, Fajr 13… visible next-match impressions; 0.62% CTR). Flagged, not solved, per the session scope.
- Whether the top-3-standings coverage route stays as the de-facto "independently important match" implementation (Session 3 should say so explicitly in the architecture doc).
- The Holds queue: EL / ECL / FA Cup / Copa del Rey / Coppa Italia cluster queries have no competition pages today (Session 9 decides); DFB-Pokal is the only cup with a live page (3 new candidates added).

## 3. Files changed (this session — all docs, no code)

- `seo-implementation/keyword-research/KEYWORD-VALIDATION-REPORT.md` — NEW (main report: method, segmentation, allowlist verification, seed validation, clusters + one-URL rules + cannibalization register, revised priority list, limitations, Session 3 inputs).
- `seo-implementation/keyword-research/VALIDATED-KEYWORD-MAP.csv` — NEW (initially 374 rows, **369 after the §4a verification pass**; 19 columns incl. evidence class/source, language, geography, GSC site metrics, tail, intent, cluster, target page type + exact URL, priority, status, notes).
- `seo-implementation/keyword-research/SERP-SAMPLES.md` — NEW (per-cluster format evidence + the honest access-limitation table).
- `seo-implementation/keyword-research/EVIDENCE-LOG.md` — NEW (fourth deliverable: every evidence source with tool+date+locale, raw autocomplete/News-RSS data, re-verification recipe).
- `sportsignal-seo-implementation/IMPLEMENTATION-TRACKER.md` — Session 02 row updated.
- `seo-implementation/session-reports/SESSION-02.md` — this file.
- `seo-implementation/next-session-prompt.md` — REWRITTEN as the Session 3 standalone prompt.
- `docs/HANDOFF.md`, `CHANGELOG.md`, `docs/DECISIONS.md` — repo-convention updates (AGENTS.md §10).

**No `src/`, `assets/`, config or workflow files were touched. No version bump. The seed bank `keyword-bank-200.csv` is unchanged (preserved in version history per KEYWORD-RESEARCH.md §9; the validated map supersedes it as the working artifact).**

## 4. Implementation decisions and deviations

**4a. The post-delivery verification pass (§1 item 7).** After the initial deliverables were committed (`abce80f`), a second verification sweep re-derived every claim from the raw sources. It corrected the map (369 rows now) and four documents' statistics; the corrections are documented in KEYWORD-VALIDATION-REPORT.md §12 and in the commit that follows `2d9f51e`. Nothing about the strategic conclusions changed — the corrections are counts, not judgments.

1. **No code changes, no deploy** — per the phase file and the start prompt ("Docs/analysis only"; "No deploy (no runtime change)"). The Session 1 pipeline-verification deploy is NOT repeated: this session changed nothing the Worker serves, and the start prompt explicitly forbids deploying.
2. **Expansion to 374 initial rows instead of stopping at 200** — the phase says "at least 200 … only if useful"; the useful additions were (a) 105 additional GSC-observed exact strings (incl. spelling/ZWNJ/digit variants that prove how fragmented the demand is, the excluded-intent documentation, and the C1/S1 demand rows), (b) 39 autocomplete-validated forms (one later folded into its GSC duplicate by the §4a pass), (c) 3 DFB-Pokal candidates (the only cup with a live page). Final unique count: 369.
3. **Volume discipline** — no volume tool was available; every `search_volume` cell reads "unavailable — no volume tool access (never invented)". GSC site metrics live in separate, clearly-labeled columns.
4. **Status taxonomy introduced** (Retain–active / Retain–passive / Hold / Excluded–reason) to keep "passive" pattern demand (standings-vs, timeline, one-off matchups) distinct from actively-targeted phrases — an honest middle ground the seed bank lacked.
5. **Seed bank untouched** — corrections (6 re-mapped rows, priority revisions, resolved fuzzy targets) live only in the validated map, with the change reasons in the notes column; the original bank stays pristine per the pack's preservation rule.
6. **Deviation note (tooling):** direct Google SERP inspection was impossible from this sandbox (CAPTCHA) and Bing-Persian returned zero results; SERP-format evidence therefore came from Google Suggest + Google News RSS + live competitor pages, all explicitly labeled with tool/date/locale. The phase's "inspect actual Persian SERPs" requirement is met to the extent the environment allows, and the gap is recorded (never papered over).

## 5. Tests and exact outcomes

- `npm install` (npm only, per AGENTS.md §11): completed.
- `npm test`: **exit 0** — `npx tsc --noEmit` clean + 48 check scripts, **3,615 OK** assertions, 0 failures (matches the Session 1 baseline exactly; expected — zero code changed).
- Deliverable integrity checks (initial build script + the §4a verification pass): **369 unique rows**; 0 keywords mapped to non-allowlist team URLs; 0 retained keywords without an existing-URL-type target; 0 GSC-observed rows lacking re-derived metrics; 0 volumes invented; 0 duplicate keyword rows; 0 placeholder targets.
- Cross-verification: all 70 seed-bank GSC claims matched the raw Queries.csv; the 28-day chart sum (239 clicks / 9,301 impressions) reproduced the baseline numbers exactly.

## 6. Checkpoints (commits, SHAs, push status)

| Checkpoint | Commit | Push |
|---|---|---|
| Keyword-research deliverables (4 files) | `abce80f` | pushed to `main` (ls-remote verified) |
| Session report + tracker + Session 3 prompt + repo docs | `65ac843` | pushed to `main` (ls-remote verified) |
| Verification-pass corrections (map defects + statistics, §4a) | `bef8879` | pushed to `main` (ls-remote verified: remote main = `bef8879`) |

Push discipline: `git fetch` before push, one-shot token-URL push (token never persisted in git config, files, logs or reports), `git ls-remote` verification after each push.

## 7. Deployment and verification

**No deploy — by design.** This session produced documentation only; there is no runtime change to verify. Production remains at versioned deployment `c97ae70b-c4b8-4a11-a840-34d8b93f19a7` (`13.259.1-archttl`), verified live during Session 1. Nothing about the Worker, bindings, assets or configuration changed.

## 8. Cloudflare / runtime effects

**None.** Zero runtime cost introduced: the deliverables are markdown/CSV docs. The keyword work has no KV, subrequest, or CPU implications. (Standing note for implementation sessions: every future keyword-driven surface must state its budget against the free-tier limits recorded in `seo-implementation/audit/CLOUDFLARE-RESOURCE-BASELINE.md`.)

## 9. Unresolved risks and blockers

1. **Evidence gap — no fresh GSC export.** The owner did not supply one this session; the 2026-11-15 export remains the only demand source. Highest-value upgrade for Sessions 3-8: a 16-month export with URL-level page samples and the queries×pages matrix (unlocks S1/S4 URL identities and real volume proxies). The request is repeated in the Session 3 prompt.
2. **No volume data at all** — Keyword Planner/Trends access was not provided; priorities are evidence-of-fit ranked, not demand-sized. Any traffic-upside modelling remains impossible without stated assumptions (and was not attempted).
3. **SERP-format evidence is partial** (Google SERP CAPTCHA-blocked, Bing fa empty, TVeto challenged from this environment) — mitigated with Suggest/News-RSS/competitor fetches, honestly labeled.
4. **Standing freezes carry forward:** GSC-measured surfaces + team-name spellings byte-frozen through Dec 4-8, 2026; avoid deploys around the Nov 20 Bayern–Köln windows (19:30 UTC kickoff). Session 3 is also docs-first, so unaffected.

## 10. Acceptance criteria check (phase file)

| Criterion | Result |
|---|---|
| ≥ 200 candidate phrases documented with evidence class, language, geography, intent, tail, target page type, priority, status | **Met — 369 unique rows** (post-dedup; the initial build had 374 incl. 5 duplicates), all columns populated |
| Volume only where a named source + location/time basis exists | **Met — all volumes "unavailable"**, never invented |
| No keyword assigned to an ineligible URL type | **Met — 0 violations** (non-allowlist teams, hypothetical match URLs, non-existent competition pages all excluded or held) |
| Exact GSC strings separate from candidates | **Met** (`evidence_class`/`evidence_source` columns) |
| Deliverables at the exact required paths | **Met** (4 files + tracker + this report + the Session 3 prompt) |

## 11. Next session

**Session 3 — Final keyword-to-URL mapping and SEO architecture** (phase file: `sportsignal-seo-implementation/phases/SESSION-03-KEYWORD-TO-URL-ARCHITECTURE.md`). Full standalone prompt: `../next-session-prompt.md` (also printed to the owner in this session's final response). Do not start until the owner opens a new session with that prompt.
