# HANDOFF — SportSignal

> Agents: read AGENTS.md in the repo root first, and follow it for the whole session.

## This session (S25 — post-M10 hardening: the a11y deep-dive, COMPLETE + DEPLOYED 2026-11-15)

**S25 closes the post-M10 hardening track's a11y deep-dive.** The S23 hardening
report (`docs/mc/post-m10-hardening-report.md`) documented four a11y findings
(F1-F4). S25 runs the full WCAG-AA audit (axe-core + WAVE style — the DOM/ARIA
check categories), the cross-browser compatibility analysis (Safari/Firefox/Edge
— the S23 §2.5 gap), the screen-reader announcement prediction (NVDA/VoiceOver
— the accessibility tree), implements the F1-F4 fixes, and ships them to
production. The audit is `docs/audits/2026-11-15-s25-a11y-audit.md` (the PRIMARY
deliverable). **S25 is a CODE + DEPLOY session** — the production is now at
deployment `181285b8` / version `13.258-mca11y` (created 2026-11-15T02:38:53Z).

**The F1-F4 fixes (all presentation-layer, body-only — the GSC surfaces in the
`<head>` are NOT touched; the await count stays 3; the composer purity holds —
S25 MODIFIES the existing S06 nav script to also toggle `aria-current`, NOT a
new script):**
- **F1 (MEDIUM a11y) FIXED** — `src/seo/match-centre.ts` `matchHeroHtml` returns
  `<div class="mcentre-hero">` (NOT `<section aria-label="خلاصه بازی">`); the
  outer `<section id="mcentre-hero" aria-label="تیم‌ها و وضعیت بازی">` is the
  single landmark.
- **F2 (LOW a11y) FIXED** — `src/seo/data.ts` `heroArtMetaSrv` returns
  `{src, player}`; `src/seo/pages.ts` `portraitHtml(src, player, teamFa)` builds
  `alt="تصویر {player}، بازیکن {teamFa}"`; `heroArtSrv` kept (the homepage
  `.mc-port` mirror untouched).
- **F3 (LOW a11y) FIXED** — `src/seo/pages.ts` `matchNavHtml` sets
  `aria-current="true"` on the first nav item at render; `matchNavScript`'s
  IntersectionObserver toggles `aria-current` alongside the `is-active` class.
- **F4 (LOW a11y) FIXED** — `src/seo/match-centre.ts` `matchCentreMain`
  special-cases the nav slot to `<section id="mcentre-nav">` (no aria-label — a
  non-landmark container); the inner `<nav class="mnav" aria-label="…">` is the
  single landmark; the `display:contents` sticky-nav architecture preserved.

**The byte-frozen verification (MANDATORY before the deploy) PASSED:**
- Source-level: the head-building files (`page-shell.ts`, `jsonld.ts`,
  `markup.ts`) are UNCHANGED; the `buildHead`/`pageShell`/`matchAnswerSentence`
  calls in `pages.ts` are UNCHANGED.
- Runtime: the preview URL `<head>` (Version 181285b8) vs the production
  `<head>` (Version 10c0a004) = **DIFF 0** (byte-identical). The GSC surfaces
  (title, canonical, og, twitter, h1, meta-desc, JSON-LD) all BYTE-IDENTICAL.
- The homepage byte-frozen surfaces (`#promoStrip`/`#tgHead`/`#tgPill`/
  `#tgPillGo`/`#about`) all present in the preview.

**The deploy (M3) LANDED:**
- `wrangler versions upload` from `main` → Worker Version
  `181285b8-c97d-4942-9d66-dafff2bd382a` (preview URL
  `https://181285b8-ucl-notifier.sportsignal.workers.dev`).
- `wrangler versions deploy --version-id 181285b8-... --percentage 100 --yes`
  → production traffic shifted to the S25 build in 0.88 sec (created
  2026-11-15T02:40:05Z).
- The S22 6-point post-deploy smoke matrix PASSED: [1] `/healthz`
  `ok:true / 13.258-mca11y / degraded:false / pool_matches:348 /
  sched_next_ko:2026-11-20T19:30:00.000Z`; [2] the Bayern match page HTTP 200
  with the F1-F4 fixes present (verified via the workers.dev alias — the apex
  edge cache is revalidating naturally within the SWR=300 window, the S22
  precedent; the token is scoped to Workers versions — no zone cache-purge
  permission); [3] the GSC surfaces byte-frozen (DIFF 0); [4] the homepage +
  the `/matches/today` hub + the `/matches/this-weekend` hub all HTTP 200; [5]
  the cron re-arm `last_cron_age_min:2` (<10); [6] the KV counters
  `pool_matches:348` unchanged + `kv_writes_day:124` advanced by the cron-tick
  writes.
- The agent-browser visual/a11y re-verification PASSED: desktop 1440 + mobile
  390, zero console errors, the skip-link + the `:focus-visible` 2px solid
  #7dd3fc, the F1-F4 fixes confirmed in the live DOM (hero `<div>`, nav
  `aria-current="true"` first, nav section no aria-label, portrait alts
  descriptive), no mobile horizontal scroll.
- Rollback point: the S22 + post-merge re-deploy (`ab1395ee` / `10c0a004` /
  `13.257-mcmatchcentre` — `npx wrangler rollback` restores it INSTANTLY).

**Standing laws honoured (unchanged):**
- The composer purity (S04 countdown / S06 nav / S15 schedule / S16 FAQ are
  the ONLY inline-JS exceptions — S25 MODIFIES the S06 nav script, adds NO new
  script).
- `buildMatchPage`'s await count stays exactly 3 (`hydrateMatchVenue`,
  `loadArchive`, `fullByCodeFor` — ADR-006).
- GSC surfaces + the answer sentence byte-frozen (the fixes are body-only —
  the `<head>` is NOT touched; the byte-frozen diff DIFF 0 verified).
- The homepage `#promoStrip`/`#tgHead`/`#tgPill`/`#tgPillGo` + the
  `#about`/`.pagesfoot` footer byte-frozen (decision 65).
- `wrangler deploy` FORBIDDEN (used `wrangler versions deploy`); `main` is the
  canonical branch; committed directly to `main`; NEVER force-push or rewrite
  published git history.
- The version bump law (audit §7): the deploy moved `src/config.ts` VERSION +
  `package.json` version + the `check-stats.js` version-wiring pins + CHANGELOG
  together.
- The cross-track SEO measurement window (Dec 4-8) is PROTECTED — the GSC
  surfaces are byte-frozen (the F1-F4 fixes are body-only; the deploy landed
  before Dec 8).

## Current state (machine)

- **Version:** `13.258-mca11y` (`src/config.ts` VERSION / `package.json` version
  `13.258.0.0`; kept in sync by `scripts/check-version-sync.js` +
  `scripts/check-stats.js` version-wiring pins; codename suffix is house style).
- **Deploy:** Cloudflare Worker `ucl-notifier`, deployed via
  `npx wrangler versions deploy` (versioned deploy + instant rollback). Current
  production deployment `181285b8-c97d-4942-9d66-dafff2bd382a` (created
  2026-11-15T02:38:53Z — the S25 a11y deep-dive; 100% traffic). Rollback:
  `npx wrangler rollback` restores the S22 + post-merge re-deploy (`ab1395ee` /
  `10c0a004` / `13.257-mcmatchcentre` — the previous deployment); the second
  rollback target is `88649642`/`b48bae21`/`13.255-seospell`.
- **Production hostnames:** `sportsignal.ir` (apex, the Custom Domain — the
  edge cache revalidates within the SWR=300 window post-deploy) +
  `football.sportsignal.ir` (301s to apex except `/webhook`, `/api/`, `/admin`)
  + `ucl-notifier.sportsignal.workers.dev` (the workers.dev alias serving
  production traffic — the F1-F4 fixes are LIVE here immediately post-deploy;
  NEVER treat as a scratch environment).
- **Branch:** `main` (canonical). HEAD = the S25 commit (the F1-F4 fixes + the
  audit + the version bump). `feat/match-centre` was merged at `c058035` on
  2026-11-15 (the owner's instruction); S23 added `cb9f7b5` (the docs commit);
  S25 added the F1-F4 + audit commit.
- **Commands:** `npm test` (tsc + the check scripts — must exit 0 before every
  push; the baseline is now **3,583 OK** = 3,573 baseline + 10 new S25 a11y
  assertions / 0 failures). **npm only, never `bun install`** (breaks
  `@resvg/resvg-wasm`; AGENTS §11). Port for local dev: `npx wrangler dev`
  (8787; `wrangler.dev.toml` is the local config — git-ignored). Deploy:
  `CLOUDFLARE_API_TOKEN=… CLOUDFLARE_ACCOUNT_ID=a796fdfe… npx wrangler versions
  upload` → `npx wrangler versions deploy --version-id <id> --percentage 100 --yes`.
- **Cron triggers:** `*/10 * * * *` + `27 */4 * * *` (re-armed automatically via
  `wrangler versions deploy`). The pool `pool_matches: 348` + the
  `sched_next_ko: 2026-11-20T19:30:00.000Z` (the Bayern vs Köln kickoff)
  survived the deploy.
- **Key folders:** `src/` (worker modules; `scripts/lib/worker-src.js` carries
  the bundle file ORDER — co-evolve when adding files); `assets/` (immutable
  versioned client payload — UNCHANGED by S25; the SW cache stays
  `sportsignal-v126` + the client bundle stays `public-13.80.js`); `docs/`
  (RUNBOOK, HANDOFF, specs, audits, `docs/mc/` the Match Centre milestone docs,
  `docs/audits/2026-11-15-s25-a11y-audit.md` the S25 audit, `docs/history/`
  session records); `docs/assets/s25-a11y/` (the S25 before/after screenshots).
- **Backups:** KV is live state; no routine file backups (RUNBOOK §5 has the KV
  key contracts). Never rename KV keys. KV schema is additive across versions
  (no renames, ever → rollback-safe).
- **Standing limits:** `_headers` sits at the 100-rule cap — every new pin needs
  a cap sweep. The cross-track SEO measurement window is Dec 4-8 (the GSC
  surfaces must stay byte-frozen through it — S25's body-only fixes comply).
  Team-name spellings must NOT change before ~Dec 8 (the S1 M2 spelling fix is
  mid-measurement).

## The M1 audit's documented gaps (the follow-up smokes)

S25's audit is honest about what was tested in-session vs. the documented gaps
(per AGENTS.md §9). The F1-F4 fixes are LIVE + verified. The follow-up smokes
(the owner's BrowserStack/LambdaTest session or local installs) are:
- **The live NVDA (Windows) + VoiceOver (macOS) screen-reader smoke** — S25
  predicted the announcements from the accessibility tree (the DOM + ARIA, the
  exact input screen readers consume); the live confirmation needs a
  Windows/macOS owner session. The F1-F4 fixes are universally-supported
  semantic corrections (WCAG 2.1 + ARIA 1.2) — safe to land without the live
  screen-reader confirmation.
- **The live Safari (WebKit) + Firefox + Edge cross-browser smoke** — S25
  analysed the CSS feature support matrix (logical properties, `:focus-visible`,
  `content-visibility`, `display:contents`, grid, WebP). The highest cross-browser
  risk is the `display:contents`/`content-visibility` sticky-nav on Safari < 17 /
  Firefox < 125 (a UX regression, NOT a11y-blocking — the F4 fix preserves the
  `display:contents` rule). The live cross-browser smoke confirms the desktop
  sticky nav persists on the current browser baseline (Safari 17+ / Firefox
  125+ / Edge / Chrome).

## Previous sessions (the S02-S22 Match Centre track — CLOSED at M10)

The full session-by-session record lives in `MATCH-CENTRE-EXECUTION-LOG.md` +
`MATCH-CENTRE-MILESTONE-LEDGER.md`. The M10 production release report lives in
`MATCH-CENTRE-RELEASE-REPORT.md`. The S23 hardening report is at
`docs/mc/post-m10-hardening-report.md`. The S25 audit is at
`docs/audits/2026-11-15-s25-a11y-audit.md`.

The S1/S2 SEO track (the team-name spelling fix + the title test) is parked at
the Dec 4 GSC gate (HANDOFF note preserved below for continuity).

### S1/S2 SEO track (parked at the Dec 4 GSC gate)

- **S1** ✅ closed (2026-11-10) — F3 spelling fix `13.255-seospell` (Leipzig
  «لایپزیگ», Nordsjælland «نورشلان», Roma «رم» + «آ س رم») is LIVE and
  mid-measurement (judge ~Dec 8). T-25 internal-link check wired into
  `scripts/seo-check.js`. Full record: `docs/history/2026-11-10-s1-seo-quickwins.md`.
- **S2** — title test («X مقابل Y» on half the match pages). **Parked 2026-11-10**
  (fired 24 days early, no GSC export). **Re-fire the unchanged S2 start prompt
  on/after Dec 4, 2026** with the fresh GSC export attached. Do NOT change
  team-name spellings before its ~Dec 8 read.
- **S3** — where-to-watch CLOSED (no Iran/Afghanistan source); lineups = owner
  decision (plan Q2).

## Next sessions (the post-M10 hardening track — S25 done; S24/S26/S27 remain)

The S23 hardening report proposed four follow-ups. The recommended order (per
the S23 decision record):
- **S25 (a11y deep-dive)** ✅ DONE + DEPLOYED 2026-11-15 — the F1-F4 fixes are
  LIVE at `13.258-mca11y`. The follow-up smokes (NVDA/VoiceOver + Safari/Firefox/
  Edge) are the documented gaps above.
- **S27 (live/finished verification)** — runs AFTER the Nov 20 kickoff
  (`2026-11-20T19:30:00Z` — the Bayern vs Köln match). A short verification
  session (no code changes unless a critical bug): verify the `.mlive` pulse +
  the `.mfin` «پایان بازی» status + the result block against REAL live/finished
  matches. The S23 H1 markers checklist is at `docs/mc/post-m10-hardening-report.md`
  §1.2.
- **S24 (perf/CWV review)** — runs AFTER Dec 8 (the cross-track SEO measurement
  window close + enough CWV data — the production has been live since
  2026-11-15). Fix P1 (the hero `loading="lazy"` → `eager`/`fetchpriority=high`)
  + P2 (the `<link rel="preconnect">` to `crests.football-data.org`) IF the LCP
  data justifies it. Instrument the per-route CPU via the Cloudflare GraphQL
  API.
- **S26 (UI/UX iteration)** — runs AFTER S25 (so the iterations build on a clean
  a11y base — S25 is DONE). The owner's vibe-coding design rounds: the hero
  portrait rendering, the nav UX, the FAQ discoverability, the schedule
  density, the telegram CTA placement.
