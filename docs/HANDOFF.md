# HANDOFF — SportSignal

> Agents: read AGENTS.md in the repo root first, and follow it for this whole session.

## This session (SEO Program Session 4 — the crawl/index/sitemap foundation; FIRST implementation session, 2026-11-16)

The foundation session of the 15-session SEO program: Session 3's
blueprint turned into verified production code. **Deployed twice
(versioned): `24c62781…` (`13.260.0-teamidx`) then `7d92e633…`
(`13.260.1-teamidx`, current) — C1 + C6 live, C8 measured and
record-and-skipped.** All phase acceptance criteria met
(SESSION-04.md §9).

- **C1 (the central fix, live):** team pages indexable ONLY for the 13
  selected clubs — `isSelectedTeam` (`src/seo/data.ts`, the
  domestic-league keys of `CONFIG.BIG_TEAMS_BY_LEAGUE`, `normAlias`
  provider-variant folding, admin-overlay memo); **teams.xml 87 → 13
  rows** (sitemap total **383 → 309**; set-diff vs the 13 expected slugs
  identical, incl. the provider-derived Inter/Atlético slugs); every
  non-selected team page serves 200 + self-canonical + **`noindex,
  follow`** with ALL internal links kept (the crawl path);
  `teamsIndex` still generates both sides (the `/teams` tiles +
  match-page «تیم‌ها» links). Zero-marginal budget; lastmods unrestamped;
  no IndexNow ping for the 74 removals. Per-URL evidence: route plan
  §2.2 (cited in CRAWL-INDEX-CHANGELOG.md §1).
- **C6 (live):** non-prod `x-robots-tag: noindex, nofollow` on all 7
  machine-file routes (sitemaps index + children, feed, calendar,
  matches.json, llms, llms-full) — applied OUTSIDE the edge cache
  (`guardNonProdMachineFile`) so the host-independent cache key can
  never leak the header across environments. Production verified clean
  (0 headers); workers.dev verified guarded (7/7).
- **C8 (measured → record-and-skip):** the one-line `s-maxage=60`
  candidate shipped in 13.260.0 and was live-tested — **the Workers
  free-plan edge floor overrides both `max-age` and `s-maxage` on Cache
  API entries** (HIT at age 3 still stamped `max-age=14400`). Reverted
  in 13.260.1 per the phase contract; evidence in
  CRAWL-INDEX-CHANGELOG.md §C8. **Residual finding flagged for the
  owner:** the stamped 14400 is browser-honored on the client poll path
  (plain fetch; SW passes `/api/*` through) — a client-side fix (poll
  fetch cache option + bundle rename + SW bump) or a zone Cache Rule;
  owner decision, out of program scope.
- **Foundation re-verified live:** the **full 309-URL sitemap sweep**
  (every row 200 + self-canonical + indexable, zero noindex/redirect/
  404 rows; 29 transient C7-class cold-render 503s under the 12-concurrent
  burst all recovered on paced retry — pre-existing, no match-page path
  changed); host matrix 6×single-hop 301s; robots.txt unchanged
  (Disallow /admin only); pagination canonicals verified (`?page=99`
  clamps to `?page=3`); barcelona byte-identical (the Dec 4-8 freeze
  holds), fulham delta = robots meta + ItemList node only.
- **Tests:** NEW `scripts/check-seo-crawlindex.js` (13 gates: C1
  behavior/wiring/scope, C6 guard, C8 record-and-skip pin, the
  robots-only-/admin crawlability law) — **npm test baseline now 3,628
  OK** (was 3,615). Version pins + two shape pins rode forward per the
  standing convention. Version triple `13.260.1.0` / `13.260.1-teamidx`.
  No client asset changed (SW v126, public-13.80.js, _headers untouched).

**Next:** the owner fires Session 5 (match URL lifecycle + seasonal
indexing — the `MATCH-LIFECYCLE-POLICY.md` thresholds, the match-URL
classification, indexability-transition tests) with
`seo-implementation/next-session-prompt.md`. A fresh GSC export (16
months, URL-level samples, queries×pages) remains the program's top
evidence request (unlocks S1/S4 identities, the S2 pagination
verification, and Session 5's full per-URL demand table).

## Current state (machine)

- **Version:** `13.260.1-teamidx` (`src/config.ts` / `package.json` `13.260.1.0`). npm test baseline **3,628 OK** (`npx tsc --noEmit` clean + 49 check scripts; verified this session).
- **Deploy:** Worker `ucl-notifier`, versioned deploys only (`npx wrangler versions upload` → `versions deploy --version-id <id> --percentage 100 --yes`). Current deployment `7d92e633-5b78-41ad-ac60-6dbbe6d2728d` (`13.260.1-teamidx`; 2026-11-16). Rollback chain: `24c62781` (13.260.0-teamidx) → `c97ae70b` (byte-identical S28.1) → `79688dbf` (13.259.1-archttl) → earlier.
- **Production hostnames:** `sportsignal.ir` (apex Custom Domain), `football.sportsignal.ir` (301→apex except `/webhook`,`/api/`,`/admin`), `ucl-notifier.sportsignal.workers.dev` (noindex-guarded alias — HTML AND machine files since Session 4; never a scratch env).
- **Branch:** `main` (canonical; HEAD = the SEO Session 4 close-out docs commit — `git log --oneline -6`). Session 4 commits: `2a405f7` (the foundation release), `c805910` (the C8 revert), + close-out.
- **Commands:** `npm test` (must exit 0 before every push). **npm only, never `bun install`**. Local dev: `npx wrangler dev --config wrangler.dev.toml` (8787; seed local KV via `npx wrangler kv key put --path <file> --local` — the `--path` flag matters). Deploy needs `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID=a796fdfe…` in the env.
- **Cron triggers:** `*/10 * * * *` + `27 */4 * * *` (unchanged). Live healthz (post-Session-4): pool 324 matches, KV writes 334/day bot + 163 web (of 1,000), subreq 28-46/tick (46 = the documented full-sweep profile), `degraded:false`, next kickoff Bayern–Köln 2026-11-20T19:30Z.
- **Key folders:** `src/` (worker modules; `scripts/lib/worker-src.js` carries the bundle ORDER — co-evolve), `assets/` (immutable versioned client payload; SW `sportsignal-v126`, bundle `public-13.80.js`), `docs/` (RUNBOOK, specs, audits, history), `sportsignal-seo-implementation/` (the SEO spec pack — owner's, tracker updated per session), `seo-implementation/` (the SEO program working tree: audits, keyword research, architecture, session reports, next-session prompts).
- **Backups:** KV is live state; no routine file backups (RUNBOOK §5 KV key contracts). Never rename KV keys.
- **Standing limits:** `_headers` at the 100-rule cap. **Cross-track SEO measurement window Dec 4-8: the GSC surfaces + team-name spellings stay byte-frozen through it.** The S28 archive scope stays BIG matches only until the owner's A/B. Avoid deploys in the Nov 20 Bayern–Köln verification windows (M1 ~19:35 UTC, M2 ~21:35-45 UTC). Cloudflare free-tier budget: see `seo-implementation/audit/CLOUDFLARE-RESOURCE-BASELINE.md` (the 10ms CPU cliff on cold match renders is chronic — every new surface states its render/KV cost).

## Open follow-ups from the previous tracks (unchanged by Sessions 1-4)

- **Nov 20 (S27 option B):** the auto-verify workflow fires around Bayern–Köln; the owner re-fires the M1/M2 window sessions per the S27-cont record (`docs/mc/post-m10-hardening-report.md` §1.4.4).
- **S24 (perf/CWV):** after Dec 8 — P1 hero `loading="lazy"`, P2 preconnect to crests.football-data.org, per-route CPU via GraphQL.
- **S26 (UI/UX iteration):** after S25 (done) — hero rendering, nav UX, FAQ discoverability, schedule density, telegram CTA.
- **S1/S2 SEO mini-track (repo-internal, predates the program):** S1 spelling fix LIVE and mid-measurement (judge ~Dec 8); S2 title test parked — re-fire on/after Dec 4 with a fresh GSC export. **The program's Session 8 (team pages) consumes the S2 title-test result.**
- **S25 follow-up smokes:** NVDA/VoiceOver + Safari/Firefox/Edge live confirmations (owner sessions needed).
- **C8 client-side staleness vector (NEW, Session 4):** the `/api/public-matches` zone-edge HIT stamp (`max-age=14400`) is browser-honored on the poll path — client-side fix or zone Cache Rule; owner decision (CRAWL-INDEX-CHANGELOG.md §C8).

## SEO program state (the 15-session track)

Session 01 ✅ Completed / verified in production (2026-11-16) — audit + docs.
Session 02 ✅ Completed, docs-only, no deploy (2026-11-16) — keyword
validation: 369-unique-phrase map + one-URL rules + cannibalization
register; allowlist corrected to **13** European clubs.
Session 03 ✅ Completed, docs-only, no deploy (2026-11-16) — the approved
architecture: keyword-to-URL map (15 classes), indexability matrix, route
+ canonical plan; the C1 disposition, the top-3-route STAYS decision,
pagination/empty-hub/slug/hreflang stances.
Session 04 ✅ Completed / verified in production (2026-11-16) — the
crawl/index foundation DEPLOYED: C1 (teams.xml 87→13, non-selected team
pages `noindex, follow` + crawlable), C6 (non-prod machine-file guard),
C8 record-and-skip (measured); the full 309-URL sitemap sweep clean;
npm test 3,628 OK.
`seo-implementation/next-session-prompt.md` holds the Session 5 start
prompt (match URL lifecycle + seasonal indexing). Progress source of
truth: `sportsignal-seo-implementation/IMPLEMENTATION-TRACKER.md`.
