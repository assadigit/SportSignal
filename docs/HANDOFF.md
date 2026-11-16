# HANDOFF — SportSignal

> Agents: read AGENTS.md in the repo root first, and follow it for this whole session.

## This session (SEO Program Session 3 — keyword-to-URL mapping + SEO architecture; docs-only, 2026-11-16)

The architecture session of the 15-session SEO program: Session 2's
validated map + Session 1's audit converted into ONE approved blueprint.
**No worker code change, no version bump, no deploy (no runtime change by
design).** All phase acceptance criteria met (SESSION-03.md §10).

- **Deliverables:** `seo-implementation/keyword-research/KEYWORD-TO-URL-MAP.md`
  (15 URL classes → one primary cluster each, machine-derived from the
  369-row map; Persian title/H1/meta PLANS + English Session-12 slots;
  zero deviations from the one-URL law; zero pages solely for keyword
  variants), `seo-implementation/architecture/INDEXABILITY-MATRIX.csv`
  (16 route classes × disposition × evidence × implementing session), and
  `seo-implementation/architecture/ROUTE-AND-CANONICAL-PLAN.md` (canonical
  strategy per class, pagination policy, the C1 plan, sitemap plan
  383→309, hreflang stance, Session 4-12 sequencing with budgets). Plus
  the tracker Session-03 row, SESSION-03.md, and the Session 4 standalone
  prompt in `seo-implementation/next-session-prompt.md`.
- **The C1 decision (the session's central call):** the 74 non-selected
  team URLs → `noindex, follow` + removed from `teams.xml` (87→13) —
  never robots-blocked/404/redirected/deleted; pages keep serving 200,
  self-canonical, fully linked (noindex-must-stay-crawlable). Per-URL
  demand evidence: 114 non-selected URLs / 8 clicks / 1,297 impr / 0.62%
  CTR; 8 click-earners at 1 click each; top-10 URLs = 48% of impressions.
  Reversible per URL; season-end re-read with fresh GSC is the revisit
  hook. Implementation = Session 4 (zero marginal KV/subrequest/CPU).
- **Other decisions recorded:** the top-3-standings route (`isBigForSeo`)
  STAYS (184/264 = 70% of match-detail rows; the de-facto "independently
  important match" implementation); `?page=N≥2` self-canonical policy
  KEPT (verified live); empty hubs STAY indexable (C5 resolved —
  `/matches/tomorrow` is the best-CTR surface at 8.26%); the
  provider-derived Inter/Atlético slugs ARE canonical (no slug "fix");
  hreflang = zero until Session 12 (plan slots only).
- **Live cross-checks (2026-11-16):** teams.xml 87 = 13 selected + 74
  non-selected (all 13 selected slugs present); non-selected team URLs
  (fulham, lecce) confirmed indexable today — the C1 problem live;
  `/teams` + `/competitions` indexes verified; `?page=2/3` self-canonical
  with query; sitemap children 15/7/87/123/151 = 383 (unchanged).
  `npm test` exit 0 (3,615 OK) before push.

**Next:** the owner fires Session 4 (crawl/index/canonical/sitemap/redirect
foundation — the FIRST implementation session: the C1 fix + C6/C8 + the
foundation re-verification) with `seo-implementation/next-session-prompt.md`.
A fresh GSC export (16 months, URL-level samples, queries×pages) remains
the program's top evidence request (unlocks S1/S4 identities + the S2
pagination verification).

## Current state (machine)

- **Version:** `13.259.1-archttl` (`src/config.ts` / `package.json` `13.259.1.0`). npm test baseline **3,615 OK** (`npx tsc --noEmit` clean; re-verified this session).
- **Deploy:** Worker `ucl-notifier`, versioned deploys only (`npx wrangler versions upload` → `versions deploy --version-id <id> --percentage 100 --yes`). Current deployment `c97ae70b-c4b8-4a11-a840-34d8b93f19a7` (byte-identical S28.1 code; 2026-11-16). Rollback chain: `79688dbf` (13.259.1-archttl) → `10d0b018` (13.259-archserve) → `181285b8` (13.258-mca11y) → earlier.
- **Production hostnames:** `sportsignal.ir` (apex Custom Domain), `football.sportsignal.ir` (301→apex except `/webhook`,`/api/`,`/admin`), `ucl-notifier.sportsignal.workers.dev` (noindex-guarded alias — never a scratch env).
- **Branch:** `main` (canonical; HEAD = the SEO Session 3 close-out docs commit — `git log --oneline -5`). `feat/match-centre` merged; `chore/tidy-root` dormant.
- **Commands:** `npm test` (must exit 0 before every push). **npm only, never `bun install`**. Local dev: `npx wrangler dev` (8787). Deploy needs `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID=a796fdfe…` in the env.
- **Cron triggers:** `*/10 * * * *` + `27 */4 * * *` (unchanged; API-verified 2026-11-16). Live healthz: pool 324 matches, KV writes 131/day (of 1,000), subreq 31/tick, `degraded:false`, next kickoff Bayern–Köln 2026-11-20T19:30Z.
- **Key folders:** `src/` (worker modules; `scripts/lib/worker-src.js` carries the bundle ORDER — co-evolve), `assets/` (immutable versioned client payload; SW `sportsignal-v126`, bundle `public-13.80.js`), `docs/` (RUNBOOK, specs, audits, history), `sportsignal-seo-implementation/` (the SEO spec pack — owner's, tracker updated per session), `seo-implementation/` (the SEO program working tree: audits, keyword research, architecture, session reports, next-session prompts).
- **Backups:** KV is live state; no routine file backups (RUNBOOK §5 KV key contracts). Never rename KV keys.
- **Standing limits:** `_headers` at the 100-rule cap. **Cross-track SEO measurement window Dec 4-8: the GSC surfaces + team-name spellings stay byte-frozen through it.** The S28 archive scope stays BIG matches only until the owner's A/B. Avoid deploys in the Nov 20 Bayern–Köln verification windows (M1 ~19:35 UTC, M2 ~21:35-45 UTC). Cloudflare free-tier budget: see `seo-implementation/audit/CLOUDFLARE-RESOURCE-BASELINE.md` (the 10ms CPU cliff on cold match renders is chronic — every new surface states its render/KV cost).

## Open follow-ups from the previous tracks (unchanged by Sessions 1-3)

- **Nov 20 (S27 option B):** the auto-verify workflow fires around Bayern–Köln; the owner re-fires the M1/M2 window sessions per the S27-cont record (`docs/mc/post-m10-hardening-report.md` §1.4.4).
- **S24 (perf/CWV):** after Dec 8 — P1 hero `loading="lazy"`, P2 preconnect to crests.football-data.org, per-route CPU via GraphQL.
- **S26 (UI/UX iteration):** after S25 (done) — hero rendering, nav UX, FAQ discoverability, schedule density, telegram CTA.
- **S1/S2 SEO mini-track (repo-internal, predates the program):** S1 spelling fix LIVE and mid-measurement (judge ~Dec 8); S2 title test parked — re-fire on/after Dec 4 with a fresh GSC export. **The program's Session 8 (team pages) consumes the S2 title-test result; Session 4's noindex work must not touch title bytes.**
- **S25 follow-up smokes:** NVDA/VoiceOver + Safari/Firefox/Edge live confirmations (owner sessions needed).

## SEO program state (the 15-session track)

Session 01 ✅ Completed / verified in production (2026-11-16) — audit + docs.
Session 02 ✅ Completed, docs-only, no deploy (2026-11-16) — keyword
validation: 369-unique-phrase map + one-URL rules + cannibalization
register; allowlist corrected to **13** European clubs.
Session 03 ✅ Completed, docs-only, no deploy (2026-11-16) — the approved
architecture: keyword-to-URL map (15 classes), indexability matrix, route
+ canonical plan; the C1 disposition (74 non-selected team URLs →
noindex + sitemap 87→13, Session 4 implements), the top-3-route STAYS
decision, pagination/empty-hub/slug/hreflang stances.
`seo-implementation/next-session-prompt.md` holds the Session 4 start
prompt (crawl/index/canonical/sitemap/redirect foundation — the first
implementation session). Progress source of truth:
`sportsignal-seo-implementation/IMPLEMENTATION-TRACKER.md`.
