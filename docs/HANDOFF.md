# HANDOFF — SportSignal

> Agents: read AGENTS.md in the repo root first, and follow it for the whole session.

## This session (S28 — the SEO weekly read + the GSC 404-cliff fix; v13.259-archserve deployed 2026-11-15)

**S28 is the weekly GSC review session** (growth plan §9 — the owner's Nov 15
export) that found and fixed the site's biggest SEO defect. Full analysis:
`docs/audits/2026-11-15-gsc-read.md`; decision: DECISIONS (the archserve
entry, 2026-11-15); changelog: the `# v13.259-archserve` entry.

**The finding:** the Nov 15 Search Console export showed **159 not-found
URLs** (Coverage critical class). Root cause: the KV pool prunes finished
matches at 7 days (`src/match-pool.ts`), `findMatchBySlug` reads only the
pool, so every finished match page 404s a week after the game — while the
365-day `seo_archive_v1` (U-05) already held 158 finished big matches that
no serving path ever read. 161 of 264 match pages in the GSC report were
dead URLs carrying **52% of match-page impressions + 131 clicks of history**
(PSG–Barcelona 854 impr, Real Madrid–RB Leipzig 388, Atalanta–Kairat 351,
Santander–Real Madrid 302, Man Utd–Roma 283, Monaco–Nordsjælland 275…) —
the whole positions-8–20 growth zone, AND the M2 spelling-fix measurement
pages (a 404 cannot win clicks; the ~Dec 8 judgment would have read as
failure while the pages were simply dead).

**The fix (v13.259-archserve, deployed):**
- `src/seo/data.ts` — `findArchivedMatchBySlug` (the out-of-pool lookup;
  the pubMatch-shaped archive rows serve as BOTH raw and s; earliest-kickoff
  wins on same-day duplicates) + `SeoMatch.archived?` + the venue-honesty
  guard in `hydrateMatchVenue` (archived rows skip the home-ground table —
  stage/roundRaw do not survive the archive shape, so a neutral final could
  otherwise hydrate a WRONG stadium; the FD-detail path stays, real data
  only).
- `src/seo/pages.ts` — `buildMatchPage`: the archive load hoisted to the top
  (the SAME single KV read the related-matches block already made) + the
  fallback before the notFound return. **The await count stays exactly 3**
  (ADR-006; check-match-centre green).
- `src/seo/files.ts` — the `matches-archive` sitemap child lists the pool
  30-day window PLUS the 365-day archive (syncArchive's return, deduped by
  path, lastmods through the same change-only matchHash); the per-match OG
  image (`buildMatchOgPng`) follows its page (the archive fallback).
- `scripts/check-archserve.js` (NEW, wired into `npm test` after
  check-seo-lastmod) — 29 assertions: slug-resolution behavior against the
  production KV shape, the wiring + 3-await cost law, the venue guard, the
  sitemap merge, the OG follow, and the archserve-scoped freeze guard.
- Verified: `npm test` exit 0 (**3,612 OK** = the 3,583 baseline + 29 new);
  the local `wrangler dev` smoke with a seeded archive (restored URLs 200
  with full surfaces — title/canonical/robots/answer-sentence/h1/result
  block/«پایان بازی»/JSON-LD SportsEvent with location/breadcrumbs/og:image;
  invented URL still 404 — the T-06 contract holds; the archive child lists
  the restored URLs; the archived OG PNG renders 200 with the final score).

**The rest of the weekly read (audit §3, all deferred by the measurement
discipline):** team pages 0.65% CTR on 2,456 impressions (the
«بازی بعدی» intent — 1,205 impr, 3 clicks) → the S2 title test after Dec 4;
standings intent («جایگاه‌های…» 678 impr, 0 clicks) → S2 snippet work;
structured-data warnings (location 13 = data-coverage task behind the Dec 8
freeze; endDate/offers/performer = principled omissions, S-03/S-04);
zero backlinks (Phase 3); indexed = 659 (KPI table filled).

**Standing laws honoured:** the GSC surfaces + the answer sentence
byte-frozen (verified DIFF 0 on the live Bayern page post-deploy — the
cross-track Dec 4–8 measurement window stays PROTECTED); team-name spellings
unchanged; `wrangler deploy` used the versioned path with instant rollback;
no client asset changed (SW stays `sportsignal-v126`, bundle stays
`public-13.80.js`, `_headers` untouched); the await-count law (3);
the composer purity; zero credentials in any tracked file (the GitHub PAT
and the CF tokens were used ONLY in the environment/URL, never persisted in
git config or committed — `git config -l | grep -c ghp_` = 0).

**The owner's open A/B (audit §4):** extend the archive scope to ALL
finished matches (~1,400-impression long tail, ~4x KV blob) — recommended:
re-evaluate with the Dec 4 export. **The S27 H1 follow-up is unchanged:**
the Nov 20 Bayern vs Köln live/finished windows (M1 ~19:35 UTC, M2
~21:35–21:45 UTC) — the auto-verify workflow (`.github/workflows/
s27-lifecycle-verify.yml`) fires on its own.

## Current state (machine)

- **Version:** `13.259.1-archttl` (`src/config.ts` VERSION / `package.json` version `13.259.1.0`; the S28 hotfix — the 6h archived render-hold + the edge-cached OG route, the CPU-cliff mitigation). The npm test baseline is now **3,615 OK** (the 3,583 S25 baseline + 32 new S28 archserve/archttl assertions; `npx tsc --noEmit` clean).
- **Deploy:** Cloudflare Worker `ucl-notifier`, deployed via `npx wrangler versions deploy` (versioned deploy + instant rollback). Current production deployment `79688dbf-3807-4dbf-a491-b79e32190e68` = the S28 `13.259.1-archttl` hotfix (100% traffic; the archive serving + the 6h archived render-hold + the edge-cached OG route LIVE; the pre-existing CPU-cliff condition mitigated for the archived surface). Rollback: `npx wrangler rollback` restores `10d0b018` (`13.259-archserve`), then `181285b8` (the S25 `13.258-mca11y` deploy), then `ab1395ee`/`10c0a004`/`13.257-mcmatchcentre`, then `88649642`/`b48bae21`/`13.255-seospell`.
- **Production hostnames:** `sportsignal.ir` (apex, the Custom Domain — the edge cache revalidates within the SWR=300 window) + `football.sportsignal.ir` (301s to apex except `/webhook`, `/api/`, `/admin`) + `ucl-notifier.sportsignal.workers.dev` (the workers.dev alias serving production traffic — NEVER treat as a scratch environment).
- **Branch:** `main` (canonical). HEAD = the S28 archserve commit (code + docs + the filed GSC exports). `feat/match-centre` was merged at `c058035` on 2026-11-15; S25 added the F1-F4 + audit commit; S27/S27-cont added their docs commits; S28 adds the 404-cliff fix + the weekly-read audit.
- **Commands:** `npm test` (tsc + the check scripts — must exit 0 before every push; the baseline is **3,612 OK** from S28). **npm only, never `bun install`** (breaks `@resvg/resvg-wasm`; AGENTS §11). Port for local dev: `npx wrangler dev` (8787; needs CLOUDFLARE_API_TOKEN in the env for the remote AI binding; local KV = the `preview_id` namespace — seed it with `wrangler kv key put --namespace-id 3d0548d6… --local`). Deploy: `CLOUDFLARE_API_TOKEN=… CLOUDFLARE_ACCOUNT_ID=a796fdfe… npx wrangler versions upload` → `npx wrangler versions deploy --version-id <id> --percentage 100 --yes`.
- **Cron triggers:** `*/10 * * * *` + `27 */4 * * *` (re-armed; UNCHANGED by S27). The pool `pool_matches: 348` + the `sched_next_ko: 2026-11-20T19:30:00.000Z` (the Bayern vs Köln kickoff) + the `sched_next_wake: 2026-11-20T18:30:00.000Z` (the cron wakes 1 hour before kickoff to arm the live sweep) + `sched_live_now:0` (NO live matches until Nov 20).
- **Key folders:** `src/` (worker modules; `scripts/lib/worker-src.js` carries the bundle file ORDER — co-evolve when adding files; UNCHANGED by S27); `assets/` (immutable versioned client payload — UNCHANGED by S25/S27; the SW cache stays `sportsignal-v126` + the client bundle stays `public-13.80.js`); `docs/` (RUNBOOK, HANDOFF, specs, audits, `docs/mc/` the Match Centre milestone docs, `docs/audits/2026-11-15-s25-a11y-audit.md` the S25 audit, `docs/history/` session records); `docs/assets/s25-a11y/` (the S25 before/after screenshots); `docs/assets/s27-lifecycle/` (the S27 pre-match baseline screenshots — NEW).
- **Backups:** KV is live state; no routine file backups (RUNBOOK §5 has the KV key contracts). Never rename KV keys. KV schema is additive across versions (no renames, ever → rollback-safe).
- **Standing limits:** `_headers` sits at the 100-rule cap — every new pin needs a cap sweep. The cross-track SEO measurement window is Dec 4-8 (the GSC surfaces must stay byte-frozen through it — S25's body-only fixes + S28's archive restoration comply; verified DIFF 0 post-S28-deploy). Team-name spellings must NOT change before ~Dec 8 (the S1 M2 spelling fix is mid-measurement). The S28 archive scope stays BIG matches only (`isBigForSeo`) until the owner's A/B (audit §4).

## The S27 documented gaps (the follow-up — the Nov 20 windows)

S27 is honest about what was tested in-session vs. what could NOT be tested (per AGENTS.md §9). The pre-match baseline (H1-upcoming) is verified + the byte-frozen GSC baseline is captured. The follow-up:
- **The H1-live + H1-finished marker verification is DEFERRED to the Nov 20 windows** (the Bayern vs Köln kickoff `2026-11-20T19:30:00Z` is 5 days away; `sched_live_now:0`; the 30 homepage match links are ALL dated Nov 20+ — NO live or finished matches in the pool to verify against). The owner's choice on how to run the Nov 20 windows (the S27 TLDR's A/B/C/D options) is the next decision.
- The S25 follow-up smokes (the documented gaps from the S25 audit) remain: the live NVDA (Windows) + VoiceOver (macOS) screen-reader smoke (S25 predicted the announcements from the accessibility tree — the live confirmation needs a Windows/macOS owner session) + the live Safari (WebKit) + Firefox + Edge cross-browser smoke (S25 analysed the CSS feature support matrix — the live confirmation needs a BrowserStack/LambdaTest session or local installs). The F1-F4 fixes are universally-supported semantic corrections — safe to land without the live cross-browser/screen-reader confirmation.
- The P1/P2 perf findings are UNCHANGED by S27 (for S24 after Dec 8): P1 the hero `loading="lazy"` (MEDIUM — the LCP anti-pattern) + P2 the no `<link rel="preconnect">` to crests.football-data.org (LOW).

## Previous sessions (the S02-S22 Match Centre track — CLOSED at M10)

The full session-by-session record lives in `MATCH-CENTRE-EXECUTION-LOG.md` +
`MATCH-CENTRE-MILESTONE-LEDGER.md`. The M10 production release report lives in
`MATCH-CENTRE-RELEASE-REPORT.md`. The S23 hardening report is at
`docs/mc/post-m10-hardening-report.md` (§1.2 the H1 verification PLAN + the
markers checklist; §1.4 the S27 pre-match baseline record + the Nov 20 plan).
The S25 audit is at `docs/audits/2026-11-15-s25-a11y-audit.md` (the F1-F4 fixes
+ the WCAG-AA scorecard + the cross-browser analysis + the screen-reader
prediction).

The S1/S2 SEO track (the team-name spelling fix + the title test) is parked at
the Dec 4 GSC gate (HANDOFF note preserved below for continuity).

### S1/S2 SEO track (parked at the Dec 4 GSC gate)

- **S1** ✅ closed (2026-11-10) — F3 spelling fix `13.255-seospell` (Leipzig «لایپزیگ», Nordsjælland «نورشلان», Roma «رم» + «آ س رم») is LIVE and mid-measurement (judge ~Dec 8). T-25 internal-link check wired into `scripts/seo-check.js`. Full record: `docs/history/2026-11-10-s1-seo-quickwins.md`.
- **S2** — title test («X مقابل Y» on half the match pages). **Parked 2026-11-10** (fired 24 days early, no GSC export). **Re-fire the unchanged S2 start prompt on/after Dec 4, 2026** with the fresh GSC export attached. Do NOT change team-name spellings before its ~Dec 8 read.
- **S3** — where-to-watch CLOSED (no Iran/Afghanistan source); lineups = owner decision (plan Q2).

## Next sessions (the post-M10 hardening track — S25 done, S27 pre-match baseline done, S27-cont the drift-check + timing-block record done; the Nov 20 verification [the owner re-fires option B] + S24 + S26 remain)

The S23 hardening report proposed four follow-ups. The current state:
- **S25 (a11y deep-dive)** ✅ DONE + DEPLOYED 2026-11-15 — the F1-F4 fixes are LIVE at `13.258-mca11y`. The follow-up smokes (NVDA/VoiceOver + Safari/Firefox/Edge) are the documented gaps above.
- **S27 + S27-cont (live/finished verification)** ⬜ PARTLY DONE 2026-11-15 — the pre-match baseline (H1-upcoming re-verified [S27] + re-confirmed byte-frozen DIFF 0 [S27-cont] + the byte-frozen GSC baseline captured + the Nov 20 plan documented) is DONE; the live + finished marker verification (H1-live + H1-finished) is DEFERRED to the Nov 20 windows. **The owner chose option B** (DECISIONS decision 3 — the owner starts a new session during the live window + another after FT+900s [the recommended reliable path]). S27-cont (fired 2026-11-15, 5 days before the kickoff) was BLOCKED by timing — the M1/M2 windows could NOT run (the production scheduler confirms `sched_mode:IDLE / sched_live_now:0`). **The owner re-fires option B on Nov 20: M1 [live] at ~19:35 UTC (kickoff 19:30 UTC + 5 min, clears the `LIVE_PAGE_TTL:120` render-hold) + M2 [finished] at ~21:35–21:45 UTC (FT + the `SEO_PAGE_TTL:900` render-hold).** The S27-cont prompt is self-contained + re-fireable verbatim at those times (the next-session prompt is below). The H1-live + H1-finished markers checklist is at `docs/mc/post-m10-hardening-report.md` §1.2 + the pre-match baseline + the Nov 20 plan at §1.4 + the S27-cont timing-block + drift-check record at §1.4.4.
- **S24 (perf/CWV review)** — runs AFTER Dec 8 (the cross-track SEO measurement window close + enough CWV data — the production has been live since 2026-11-15T00:21Z). Fix P1 (the hero `loading="lazy"` → `eager`/`fetchpriority=high`) + P2 (the `<link rel="preconnect">` to crests.football-data.org) IF the LCP data justifies it. Instrument the per-route CPU via the Cloudflare GraphQL API.
- **S26 (UI/UX iteration)** — runs AFTER S25 (so the iterations build on a clean a11y base — S25 is DONE). The owner's vibe-coding design rounds: the hero portrait rendering, the nav UX, the FAQ discoverability, the schedule density, the telegram CTA placement.
