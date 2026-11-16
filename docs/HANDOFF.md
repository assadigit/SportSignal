# HANDOFF — SportSignal

> Agents: read AGENTS.md in the repo root first, and follow it for the whole session.

## This session (SEO Program Session 2 — keyword research validation; docs-only, 2026-11-16)

The dedicated keyword session of the 15-session SEO program. **No worker
code change, no version bump, no deploy (no runtime change by design).**
All phase acceptance criteria met (374-phrase validated map, zero invented
volumes, zero ineligible URL assignments).

- **Deliverables:** `seo-implementation/keyword-research/` —
  KEYWORD-VALIDATION-REPORT.md, VALIDATED-KEYWORD-MAP.csv (374 rows: 202
  GSC-observed exact strings / 39 Google-autocomplete-validated fa-IR /
  133 research candidates), SERP-SAMPLES.md, EVIDENCE-LOG.md. Plus the
  tracker Session-02 row, SESSION-02.md, and the Session 3 standalone
  prompt in `seo-implementation/next-session-prompt.md`.
- **Correction recorded:** the selected-club allowlist has **13 European
  clubs, not 14** (machine-counted from `src/config.ts`; Session 1 and the
  Session 2 start prompt carried the miscount). Also: Inter/Atlético serve
  at provider-derived slugs (`internazionale-milano`, `club-atletico-de-madrid`),
  not the pinned `TEAM_SLUGS` values — a Session 3 URL-identity question.
- **Headline findings:** next-match demand concentrates in Barcelona
  (~77% of visible next-match impressions) then Bayern/Inter/Milan/Liverpool;
  `/matches/tomorrow` is the best-CTR surface (8.26%); the match-detail
  exact-slug pattern is the strongest ranking surface (best query pos 3.25);
  the #1 clicking visible query is broadcast-intent (deliberately excluded);
  team-page CTR is poor for selected (0.69%) AND non-selected (0.62%) clubs
  — a title/snippet problem (the parked Dec 4 test), not just selection.
- **Evidence discipline:** no volume tool existed — every volume field reads
  "unavailable" (never invented); Google SERP is CAPTCHA-blocked and
  Bing-Persian empty from this sandbox — SERP formats documented via Google
  Suggest fa/IR + Google News RSS fa/IR + live competitor fetches
  (ScoreYab/Soot360/365Scores; TVeto challenged), all tool+date+locale
  labeled in EVIDENCE-LOG.md. `npm test` exit 0 (3,615 OK) before push.

**Next:** the owner fires Session 3 (keyword-to-URL architecture — docs/
planning only; implementation starts in Session 4) with
`seo-implementation/next-session-prompt.md`. A fresh GSC export (16 months,
URL-level samples, queries×pages) remains the program's top evidence
request for Sessions 3-8.

## Current state (machine)

- **Version:** `13.259.1-archttl` (`src/config.ts` / `package.json` `13.259.1.0`). npm test baseline **3,615 OK** (`npx tsc --noEmit` clean; re-verified this session).
- **Deploy:** Worker `ucl-notifier`, versioned deploys only (`npx wrangler versions upload` → `versions deploy --version-id <id> --percentage 100 --yes`). Current deployment `c97ae70b-c4b8-4a11-a840-34d8b93f19a7` (byte-identical S28.1 code; 2026-11-16). Rollback chain: `79688dbf` (13.259.1-archttl) → `10d0b018` (13.259-archserve) → `181285b8` (13.258-mca11y) → earlier.
- **Production hostnames:** `sportsignal.ir` (apex Custom Domain), `football.sportsignal.ir` (301→apex except `/webhook`,`/api/`,`/admin`), `ucl-notifier.sportsignal.workers.dev` (noindex-guarded alias — never a scratch env).
- **Branch:** `main` (canonical; HEAD = the SEO Session 2 close-out docs commit — `git log --oneline -5`). `feat/match-centre` merged; `chore/tidy-root` dormant.
- **Commands:** `npm test` (must exit 0 before every push). **npm only, never `bun install`**. Local dev: `npx wrangler dev` (8787). Deploy needs `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID=a796fdfe…` in the env.
- **Cron triggers:** `*/10 * * * *` + `27 */4 * * *` (unchanged; API-verified 2026-11-16). Live healthz: pool 324 matches, KV writes 131/day (of 1,000), subreq 31/tick, `degraded:false`, next kickoff Bayern–Köln 2026-11-20T19:30Z.
- **Key folders:** `src/` (worker modules; `scripts/lib/worker-src.js` carries the bundle ORDER — co-evolve), `assets/` (immutable versioned client payload; SW `sportsignal-v126`, bundle `public-13.80.js`), `docs/` (RUNBOOK, specs, audits, history), `sportsignal-seo-implementation/` (the SEO spec pack — owner's, tracker updated per session), `seo-implementation/` (the SEO program working tree: audits, session reports, next-session prompts, keyword research).
- **Backups:** KV is live state; no routine file backups (RUNBOOK §5 KV key contracts). Never rename KV keys.
- **Standing limits:** `_headers` at the 100-rule cap. **Cross-track SEO measurement window Dec 4-8: the GSC surfaces + team-name spellings stay byte-frozen through it.** The S28 archive scope stays BIG matches only until the owner's A/B. Avoid deploys in the Nov 20 Bayern–Köln verification windows (M1 ~19:35 UTC, M2 ~21:35-45 UTC). Cloudflare free-tier budget: see `seo-implementation/audit/CLOUDFLARE-RESOURCE-BASELINE.md` (the 10ms CPU cliff on cold match renders is chronic — every new surface states its render/KV cost).

## Open follow-ups from the previous tracks (unchanged by Session 1)

- **Nov 20 (S27 option B):** the auto-verify workflow fires around Bayern–Köln; the owner re-fires the M1/M2 window sessions per the S27-cont record (`docs/mc/post-m10-hardening-report.md` §1.4.4).
- **S24 (perf/CWV):** after Dec 8 — P1 hero `loading="lazy"`, P2 preconnect to crests.football-data.org, per-route CPU via GraphQL.
- **S26 (UI/UX iteration):** after S25 (done) — hero rendering, nav UX, FAQ discoverability, schedule density, telegram CTA.
- **S1/S2 SEO mini-track (repo-internal, predates the program):** S1 spelling fix LIVE and mid-measurement (judge ~Dec 8); S2 title test parked — re-fire on/after Dec 4 with a fresh GSC export. **The new program's Sessions 2-3 must coordinate with these** (the program tracker + next-session prompt carry the coordination notes).
- **S25 follow-up smokes:** NVDA/VoiceOver + Safari/Firefox/Edge live confirmations (owner sessions needed).

## SEO program state (the 15-session track)

Session 01 ✅ Completed / verified in production (2026-11-16) — audit + docs.
Session 02 ✅ Completed, docs-only, no deploy (2026-11-16) — keyword
validation: 374-phrase map + one-URL rules + cannibalization register;
allowlist corrected to **13** European clubs.
`seo-implementation/next-session-prompt.md` holds the Session 3 start prompt
(keyword-to-URL architecture; docs/planning only — implementation starts in
Session 4). Progress source of truth:
`sportsignal-seo-implementation/IMPLEMENTATION-TRACKER.md`.
