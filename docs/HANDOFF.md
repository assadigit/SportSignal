# HANDOFF — SportSignal

> Agents: read AGENTS.md in the repo root first, and follow it for the whole session.

## This session (SEO Program Session 1 — the repository + production technical SEO audit; docs-only, 2026-11-16)

The owner started the **formal 15-session SEO implementation program** (the
`sportsignal-seo-implementation/` spec pack, v1.0, extracted from the owner's
zip in `9fcc6a3`). Session 1 was audit-only per the phase file: **no worker
code change, no version bump**; a pipeline-verification deploy of
byte-identical code was performed and verified (see below).

- **Deliverables:** `seo-implementation/audit/REPOSITORY-AND-TECHNICAL-AUDIT.md`
  (the full verified architecture + the confirmed-vs-suspected issue register
  C1-C8 / S1-S4), `seo-implementation/audit/URL-INVENTORY.csv` (391 rows),
  `seo-implementation/audit/CLOUDFLARE-RESOURCE-BASELINE.md`,
  `seo-implementation/session-reports/SESSION-01.md`, and
  `seo-implementation/next-session-prompt.md` (Session 2 = keyword research
  validation — the owner starts it in a NEW session with that prompt).
- **Headline confirmed findings:** C1 team pages are generated for BOTH sides
  of every eligible match (87 in the live sitemap incl. non-selected clubs —
  the mechanism behind GSC's 127 team URLs / 0.65% CTR); C2 zero hreflang / no
  EN URLs (client-side toggle only); C3 SportsEvent `location` is
  venue-conditional (the 13 GSC missing-location items); C4 the 159-404 cliff
  is ALREADY mitigated in production (S28 archive serve; 151 archive URLs 200
  + in sitemap). The selected-club allowlist = the 14 European clubs in
  `CONFIG.BIG_TEAMS_BY_LEAGUE` (`src/config.ts:38-100`).
- **Verified live this session:** version match (repo HEAD == production
  `13.259.1-archttl`), full redirect matrix (6 single-hop 301s), 404 +
  noindex, workers.dev noindex guard, sitemap index + 5 children (383 URLs),
  robots.txt, canonicals on 12 sampled pages, JSON-LD types per page type,
  rendered desktop 1440px (0 console errors) + mobile 390px (no horizontal
  scroll), and the honest `/matches/tomorrow` empty state on a genuinely
  empty day. `npm test` exit 0 (3,615 OK) before every push.
- **Deploy:** versioned deploy `c97ae70b-c4b8-4a11-a840-34d8b93f19a7` @100%
  (byte-identical code — docs-only session; pipeline verification per the
  owner's start prompt). Rollback unchanged: `npx wrangler rollback` →
  `79688dbf` (13.259.1-archttl).

**Next:** the owner fires Session 2 (keyword research validation) with
`seo-implementation/next-session-prompt.md`. Program docs:
`sportsignal-seo-implementation/` (spec, read-only except the tracker) +
`seo-implementation/` (working tree). The program's 15 sessions run alongside
the repo's own tracks below — coordinate through the standing limits.

## Current state (machine)

- **Version:** `13.259.1-archttl` (`src/config.ts` / `package.json` `13.259.1.0`). npm test baseline **3,615 OK** (`npx tsc --noEmit` clean; re-verified this session).
- **Deploy:** Worker `ucl-notifier`, versioned deploys only (`npx wrangler versions upload` → `versions deploy --version-id <id> --percentage 100 --yes`). Current deployment `c97ae70b-c4b8-4a11-a840-34d8b93f19a7` (byte-identical S28.1 code; 2026-11-16). Rollback chain: `79688dbf` (13.259.1-archttl) → `10d0b018` (13.259-archserve) → `181285b8` (13.258-mca11y) → earlier.
- **Production hostnames:** `sportsignal.ir` (apex Custom Domain), `football.sportsignal.ir` (301→apex except `/webhook`,`/api/`,`/admin`), `ucl-notifier.sportsignal.workers.dev` (noindex-guarded alias — never a scratch env).
- **Branch:** `main` (canonical; HEAD = the SEO Session 1 close-out docs commit — `git log --oneline -5`). `feat/match-centre` merged; `chore/tidy-root` dormant.
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

Session 01 ✅ Completed / verified in production (2026-11-16) — audit + docs;
`seo-implementation/next-session-prompt.md` holds the Session 2 start prompt
(keyword research validation; docs-only, no deploy). Progress source of
truth: `sportsignal-seo-implementation/IMPLEMENTATION-TRACKER.md`.
