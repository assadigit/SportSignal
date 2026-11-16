# SportSignal SEO Program — Session 2 Start Prompt (Keyword Research Validation)

Read AGENTS.md in the repo root first and follow it for the whole session.

You are the implementation agent for the SportSignal SEO project, Session 2 of 15: **keyword research validation and expansion** (the dedicated keyword session — no keyword-driven implementation happens anywhere else in the program).

## Step 0 — Credentials (supplied by the owner at session start; never commit them)

The owner provides per session: a GitHub classic token (repo push), and optionally a fresh GSC export and/or keyword-tool access. Use credentials only in the environment / one-shot push URL (`git push https://x-access-token:<token>@… main`), never in git config, files, commits, logs or reports. If something you need is missing, say so and proceed with what exists — never fabricate.

## Step 1 — Repository

- Repository: `https://github.com/assadigit/SportSignal` (verify the actual `git remote -v`; the owner also writes it as `assadigit/sportsignal` — same repo).
- Branch: `main` only. Session 1 closed at commit `809bafb` plus the immediately-following session close-out docs commit (run `git log --oneline -8` to confirm the current HEAD; the tracker records the session's commits).
- Clone fresh, verify `git status` is clean, and confirm no uncommitted concurrent-agent work (if any exists: preserve it, isolate your changes, never reset/clean/force-push).
- Live production site: `https://sportsignal.ir` (Worker `ucl-notifier`). Do not deploy in this session — Session 2 is analysis/documentation only.

## Step 2 — Mandatory reading order (all in the repo)

1. `AGENTS.md` (repo root — the operating contract; sections 5-7 govern git/secrets)
2. `sportsignal-seo-implementation/README.md`
3. `sportsignal-seo-implementation/AGENT-INSTRUCTIONS.md` (the master execution contract — §5 is the keyword-research contract)
4. `sportsignal-seo-implementation/PRODUCT-AND-SEO-STRATEGY.md`
5. `sportsignal-seo-implementation/MASTER-SEO-SPEC.md`
6. `sportsignal-seo-implementation/GSC-AUDIT-BASELINE.md` + the original export `sportsignal-seo-implementation/reference/sportsignal.ir-GSC-11-15.zip` (do not rely on the summary alone)
7. `sportsignal-seo-implementation/KEYWORD-RESEARCH.md` + `keyword-bank-200.csv` (the 200-phrase seed bank: 70 exact GSC strings + 130 candidates; no volumes fabricated)
8. `sportsignal-seo-implementation/SOURCE-RESEARCH.md`
9. `sportsignal-seo-implementation/IMPLEMENTATION-TRACKER.md` (progress source of truth)
10. `sportsignal-seo-implementation/phases/SESSION-02-KEYWORD-RESEARCH-VALIDATION.md` (this session's scope)
11. `seo-implementation/session-reports/SESSION-01.md` + `seo-implementation/audit/REPOSITORY-AND-TECHNICAL-AUDIT.md` (Session 1's verified facts — below the essentials)

## Step 3 — Session 1 facts you must build on (verified 2026-11-16; do not re-audit)

**Selected-club allowlist (the ONLY team-page keyword targets — from `src/config.ts` `BIG_TEAMS_BY_LEAGUE`, admin-overlayable):**
- Premier League: Arsenal, Chelsea, Manchester United, Manchester City, Liverpool
- La Liga: Barcelona, Real Madrid, Atlético Madrid
- Serie A: Inter, Milan
- Ligue 1: Paris Saint-Germain
- Bundesliga: Bayern München, Borussia Dortmund
(14 European clubs. The A-League list is site-hidden from SEO. Team-name spellings are byte-frozen until ~Dec 8 — do not propose spelling changes in this session's outputs.)

**Current URL architecture (live-verified):** `/` (homepage), `/matches` (+`?page=N`), `/matches/today|tomorrow|this-week|this-weekend`, `/matches/{home}-vs-{away}-{YYYY-MM-DD}` (365-day archive serve for finished matches), `/teams/{slug}`, `/competitions/{slug}` (7 live: bundesliga, premier-league, serie-a, ligue-1, la-liga, champions-league, dfb-pokal), static pages (/about, /methodology, /contact, /privacy, /terms, /data, /sitemap). Sitemap = index + 5 children, 383 URLs (teams child currently 87 URLs — see the C1 issue).

**Known issue C1 (the central keyword-mapping constraint):** team pages are currently generated for BOTH sides of every eligible match (87 in sitemap, incl. non-selected clubs like Köln, Fulham, Lecce, Parma), not from the allowlist — GSC showed 127 team URLs / 16 clicks / 0.65% CTR. Session 3 decides the architecture; your keyword map must target ONLY the 14 selected clubs' team URLs, and flag (not solve) the non-selected-team demand question.

**Language reality:** Persian-first (`lang="fa" dir="rtl"`), 96.6% of impressions from Iran, 94.8% of clicks mobile. NO English URLs exist (EN is a client-side toggle; zero hreflang). English keyword work proceeds as evidence-led candidates only.

**GSC baseline (2026-11-15 export, verified):** 28-day chart 239 clicks / 9,301 impressions; match-detail pages carry most clicks; `/matches/tomorrow` has demonstrated value (18 clicks / 218 impressions); top observed queries include «بازی بعدی بارسا», «بارسلونا مقابل منچستر سیتی 2026», «برنامه بازی های لیگ قهرمانان اروپا». Chart data covers only 35 days — treat as snapshot, not trend. **Live GSC access was NOT available in Session 1** — if the owner supplies a fresh export (ask for one, ideally 16 months with URL-level page samples), integrate it; otherwise record the limitation and never infer URL lists that are not in the data.

**Repo-internal overlap to respect:** the repo has its own parked title test (team-page title pattern, gated on the Dec 4 GSC export) and the team-name spelling measurement (frozen until ~Dec 8). Your validated keyword map feeds Session 3's architecture — coordinate priorities with these parked measurements, don't contradict them.

## Step 4 — Session 2 scope (from the phase file + KEYWORD-RESEARCH.md §"Required Session 2 validation")

1. Re-query all available GSC data (the supplied export; a fresh one if the owner provides it). Segment Iran/mobile/Persian vs English/country. Distinguish privacy-suppressed queries where possible.
2. Confirm the selected-club allowlist from `src/config.ts` (done in Session 1 — re-verify quickly, including the admin-overlay nuance in `src/admin.ts:56-79`).
3. Validate the 200 seed phrases: keep exact GSC-observed strings strictly separate from research candidates; add evidence tags (source, date, locale, tool). If Google Ads Keyword Planner / Trends / autocomplete / localized SERP tools are available to you, record tool+date+locale for every number; otherwise mark "volume unavailable" — **never invent volume, CPC or difficulty** (the spec's absolute rule).
4. Inspect actual Persian SERPs (Iran locale) and English SERPs (only geographies with GSC evidence) for the main clusters; document result-page formats and the curated-vs-full-coverage positioning difference. Competitor format references from SOURCE-RESEARCH.md: ScoreYab, Soot360 (formats only — never clone their full-coverage/live-score positioning).
5. Expand to at least 200 validated/evidence-tagged candidates only if useful; cluster synonyms to ONE landing-page intent; identify cannibalization; exclude live-score, live-status, broadcast/TV, betting and lineup intents (outside the product promise).
6. Map every retained cluster to exactly one existing URL type (homepage / time hubs / match detail / selected-club team page / competition page / English-future). No keyword maps to an ineligible URL (no team pages for non-selected clubs; no match URLs for hypothetical fixtures).

**Deliverables (exact paths):**
- `seo-implementation/keyword-research/KEYWORD-VALIDATION-REPORT.md`
- `seo-implementation/keyword-research/VALIDATED-KEYWORD-MAP.csv`
- `seo-implementation/keyword-research/SERP-SAMPLES.md`
- proposed revised priority list + evidence log (inside the report or as a fourth file)
- Update `sportsignal-seo-implementation/IMPLEMENTATION-TRACKER.md` (Session 02 row)
- Write `seo-implementation/session-reports/SESSION-02.md` (per AGENT-INSTRUCTIONS §9)
- Create `seo-implementation/next-session-prompt.md` — a complete standalone prompt for Session 3 (keyword-to-URL architecture), printed in full in your final response

**Acceptance criteria (from the phase file):** at least 200 candidate phrases documented with evidence class, language, geography, intent, tail length, target page type, priority and status; volume populated ONLY where a named source + location/time basis exists; no keyword assigned to an ineligible URL type.

## Step 5 — Git, tests, deploy rules for this session

- Docs/analysis only: **no `src/`, `assets/`, config or workflow changes.** If you believe a code change is required, stop and report it as a proposal instead.
- Run `npm install` (npm only, never bun) and `npm test` before your push; the suite must exit 0 (baseline 3,615 OK). No deploy (no runtime change) — state this explicitly in the report.
- Checkpointed commits with `seo(s02): …` messages; push one-shot with the token; fetch before push; verify with `git ls-remote`. Never force-push, never stage unrelated files, never commit secrets.
- End with the repo-convention updates (AGENTS.md §10): `docs/HANDOFF.md`, `CHANGELOG.md` (docs-only entry, no version bump), `docs/DECISIONS.md` (any non-obvious judgment calls), then the TLDR report in your final response with the full Session 3 prompt pasted for the owner.

## Step 6 — Standing constraints (carry into every session)

- Measurement freeze: GSC-measured surfaces + team-name spellings stay byte-frozen through **Dec 4-8, 2026**.
- Avoid deploys around the Nov 20 Bayern-Köln lifecycle-verification windows (kickoff 19:30 UTC).
- Cloudflare free tier is the budget (KV writes ~117/day of 1,000; ~50 subrequests/tick; 10ms CPU cliff) — keyword work has no runtime cost, but every later implementation must state its budget.
- GSC impressions are site impressions, not market volumes; average position is aggregated. Do not model traffic upside without stated assumptions.
- Do not start Session 3 work in this session; do not execute later sessions.
