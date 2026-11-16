# HANDOFF — SportSignal

> Agents: read AGENTS.md in the repo root first, and follow it for this whole session.

## This session (SEO Program Session 5 — match URL lifecycle + seasonal indexing; SECOND implementation session, 2026-11-17)

The match-URL lifecycle session: match-detail URLs now have a safe,
evidenced lifecycle so the site does not continuously accumulate low-value
indexable pages — while protecting the historical assets that carry the
site's clicks. **Deployed (versioned): `1d70129b…` (`13.261.0-matchlife`) —
the mechanism ships INERT by default; the first real season-end run awaits
owner approval.** All phase acceptance criteria met (SESSION-05.md §5).

- **The policy (written FIRST per MASTER-SEO-SPEC §4):**
  `seo-implementation/architecture/MATCH-LIFECYCLE-POLICY.md` — the phases
  A-D mapping onto the codebase's real state model; the three separated
  concerns (index eligibility ≠ page availability ≠ data retention); the
  season-boundary definition (FD `season.endDate`, not invented — the map
  starts empty); the keep-indexable thresholds M1-M5 (selected-club /
  `s.big` / QF+ / derby / demonstrated GSC demand ≥1 click — conservative,
  retains MORE not fewer); the noindex transition rule (robots-meta level
  ONLY, like C1 — never robots.txt, never 404/301 for ordinary season-end
  pages); the marquee retention rule (the PSG-Barcelona class); the
  owner-approval point (flag false + empty map = the first run awaits
  approval); the 404 class formalization (matrix row 17 — terminal states,
  no bulk redirects, no deletions); the resource budget (zero-marginal).
- **The classification (machine-derived):**
  `seo-implementation/audit/MATCH-URL-CLASSIFICATION.csv` — 274 rows (123
  upcoming + 151 archive from the live sitemaps) × classification (season,
  competition inferred, selected-club involvement, route, GSC demand per URL
  from the 2026-11-15 export) × proposed disposition. 104 rows carry GSC
  demand; 33 click-earners; 95 archive marquee (retain) + 56 archive ordinary
  (noindex at season-end — the proposed first batch, ALL 2026-27 season so
  inert until the season closes).
- **The mechanism (shipped, INERT):** a pure render-time predicate
  `isSeasonEndedOrdinary(sm)` (`src/seo/data.ts`) evaluates at page-render
  time and at sitemap-build time. When ALL of (flag on + FINISHED + season
  closed + NOT marquee) are true, the page's robots meta flips to `noindex,
  follow` and the URL leaves `matches-archive.xml`. The page ALWAYS stays 200
  + self-canonical + crawlable. The S19 noindex law is preserved
  (`buildMatchPage` keeps its literal `indexable: true`; the transition hooks
  through a NEW sibling `noindex?: boolean` field on `HeadInput`). Zero new
  KV writes/fetches/awaits (the zero-runtime-cost law).
- **The owner-approval gate:** `SEO.SEASON_END_NOINDEX_ENABLED = false`
  (default) + `SEO.SEASON_END_DATES = {}` (empty map). The mechanism is fully
  built and test-proven, but NO real page transitions until the owner (a)
  confirms the season-end dates against a fresh FD `season.endDate` fetch,
  (b) populates the map, (c) flips the flag. The 2025-26 season is closed but
  all 151 current archive matches are 2026-27 (still open) — the first real
  transition is a May 2027 decision.
- **Tests:** NEW `scripts/check-seo-match-lifecycle.js` (23 gates: behavior
  across all transition states, marquee retention, S19 law preservation,
  wiring, sitemap filter, no-regression, resource purity, policy+CSV
  existence) — **npm test baseline now 3,652 OK** (was 3,628). Version triple
  `13.261.0.0` / `13.261.0-matchlife`. No client asset changed (SW v126,
  public-13.80.js, public-13.87.css, _headers untouched).
- **KV read quota exceeded (pre-existing, NOT caused by the deploy):** the
  worker tail shows `"Settings read failed: KV get() limit exceeded for the
  day"` — the account's 100,000 KV reads/day free-plan limit is exceeded.
  The pool/archive data persists but can't be read until the quota resets at
  UTC midnight. The mechanism is INERT (flag false) so the live behavior is
  byte-identical to Session 4 regardless. **The owner should investigate the
  read-source** (the 10-min cron + public traffic + the bot may collectively
  exceed 100K reads/day). A Workers Paid plan ($5/mo) raises the limit to
  1M/day.

**Next:** the owner fires Session 6 (homepage / featured match / one-month
fixture window) with `seo-implementation/next-session-prompt.md`. A fresh
GSC export (16 months, URL-level) remains the top evidence request (unlocks
S1/S4 identities, the S2 pagination verification, and the M5 marquee-slug
refinement for the lifecycle).

## Current state (machine)

- **Version:** `13.261.0-matchlife` (`src/config.ts` / `package.json` `13.261.0.0`). npm test baseline **3,652 OK** (`npx tsc --noEmit` clean + 50 check scripts; verified this session).
- **Deploy:** Worker `ucl-notifier`, versioned deploys only (`npx wrangler versions upload` → `versions deploy --version-id <id> --percentage 100 --yes`). Current deployment `1d70129b-fff3-459b-9fa3-c5f8bd571b12` (`13.261.0-matchlife`; 2026-11-16). Rollback chain: `7d92e633` (13.260.1-teamidx, Session 4) → `24c62781` (13.260.0-teamidx) → `c97ae70b` (byte-identical S28.1) → earlier.
- **Production hostnames:** `sportsignal.ir` (apex Custom Domain), `football.sportsignal.ir` (301→apex except `/webhook`,`/api/`,`/admin`), `ucl-notifier.sportsignal.workers.dev` (noindex-guarded alias — HTML AND machine files since Session 4; never a scratch env).
- **Branch:** `main` (canonical; HEAD = the SEO Session 5 close-out docs commit). Session 5 commits: `d8a7294` (policy + classification CSV), `4f05267` (mechanism + tests + version bump), + close-out.
- **Commands:** `npm test` (must exit 0 before every push). **npm only, never `bun install`**. Local dev: `npx wrangler dev --config wrangler.dev.toml` (8787; seed local KV via `npx wrangler kv key put --path <file> --local`). Deploy needs `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID=a796fdfe…` in the env.
- **Cron triggers:** `*/10 * * * *` + `27 */4 * * *` (unchanged, verified active via the Cloudflare API). Live healthz: version `13.261.0-matchlife` confirmed; `ok:false` + `pool_matches:0` due to the KV read quota issue (pre-existing, self-heals at UTC midnight); `degraded:false`.
- **Key folders:** `src/` (worker modules; `scripts/lib/worker-src.js` carries the bundle ORDER — co-evolve), `assets/` (immutable versioned client payload; SW `sportsignal-v126`, bundle `public-13.80.js`, stylesheet `public-13.87.css`), `docs/` (RUNBOOK, specs, audits, history), `sportsignal-seo-implementation/` (the SEO spec pack — owner's, tracker updated per session), `seo-implementation/` (the SEO program working tree: audits, keyword research, architecture, session reports, next-session prompts).
- **Backups:** KV is live state; no routine file backups (RUNBOOK §5 KV key contracts). Never rename KV keys.
- **Standing limits:** `_headers` at the 100-rule cap. **Cross-track SEO measurement window Dec 4-8: the GSC surfaces + team-name spellings stay byte-frozen through it.** Match-page title/description/H1 bytes are frozen (Session 7 owns them; Session 5 lifecycle changes are robots-meta/sitemap/list level ONLY). The S28 archive scope stays BIG matches only until the owner's A/B. Avoid deploys in the Nov 20 Bayern–Köln verification windows (M1 ~19:35 UTC, M2 ~21:35-45 UTC). Cloudflare free-tier budget: see `seo-implementation/audit/CLOUDFLARE-RESOURCE-BASELINE.md` (the 10ms CPU cliff on cold match renders is chronic — every new surface states its render/KV cost).

## Open follow-ups from the previous tracks (unchanged by Sessions 1-5)

- **Nov 20 (S27 option B):** the auto-verify workflow fires around Bayern–Köln; the owner re-fires the M1/M2 window sessions per the S27-cont record.
- **S24 (perf/CWV):** after Dec 8 — P1 hero `loading="lazy"`, P2 preconnect to crests.football-data.org, per-route CPU via GraphQL.
- **S26 (UI/UX iteration):** after S25 (done) — hero rendering, nav UX, FAQ discoverability, schedule density, telegram CTA.
- **S1/S2 SEO mini-track:** S1 spelling fix LIVE and mid-measurement (judge ~Dec 8); S2 title test parked — re-fire on/after Dec 4 with a fresh GSC export. **The program's Session 8 (team pages) consumes the S2 title-test result.**
- **S25 follow-up smokes:** NVDA/VoiceOver + Safari/Firefox/Edge live confirmations (owner sessions needed).
- **C8 client-side staleness vector (Session 4):** the `/api/public-matches` zone-edge HIT stamp (`max-age=14400`) is browser-honored on the poll path — client-side fix or zone Cache Rule; owner decision.
- **KV read quota (Session 5, NEW):** the account's 100,000 KV reads/day free-plan limit is exceeded. Investigate the read-source; consider a Workers Paid plan ($5/mo → 1M reads/day). Self-heals at UTC midnight.
- **Season-end lifecycle first run (Session 5, NEW):** the mechanism is shipped + test-proven but INERT (flag false + empty dates map). To enable: confirm FD `season.endDate` values → populate `SEASON_END_DATES` → set `SEASON_END_NOINDEX_ENABLED = true` → versioned deploy → verify live. The first real transition is a May 2027 decision (after the 2026-27 season closes).

## SEO program state (the 15-session track)

Session 01 ✅ Completed / verified in production (2026-11-16) — audit + docs.
Session 02 ✅ Completed, docs-only, no deploy (2026-11-16) — 369-phrase map + one-URL rules; allowlist corrected to 13.
Session 03 ✅ Completed, docs-only, no deploy (2026-11-16) — the approved architecture (map, matrix, route plan).
Session 04 ✅ Completed / verified in production (2026-11-16) — the crawl/index foundation (C1/C6/C8); 3,628 OK.
Session 05 ✅ Completed / deployed (2026-11-17) — the match-URL lifecycle mechanism (INERT by default; first run awaits owner approval); MATCH-LIFECYCLE-POLICY.md + MATCH-URL-CLASSIFICATION.csv + 23-gate transition test; 3,652 OK.
`seo-implementation/next-session-prompt.md` holds the Session 6 start prompt
(homepage / featured match / one-month fixture window). Progress source of
truth: `sportsignal-seo-implementation/IMPLEMENTATION-TRACKER.md`.
