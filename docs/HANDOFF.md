# HANDOFF — SportSignal

> Agents: read AGENTS.md in the repo root first, and follow it for the whole session.

## This session (S27-cont — the option-B continuation attempted 2026-11-15; BLOCKED by timing [fired 5 days before the kickoff]; the pre-match baseline re-confirmed byte-frozen DIFF 0 vs §1.4.2; NO code change, NO deploy, NO cron; H1 stays OPEN)

**S27-cont is the option-B continuation of S27** (DECISIONS decision 3 — the owner
starts a new session during the live window + another after FT+900s). The owner
fired it on 2026-11-15 (the same day as S27, ~50 min after the §1.4.2 baseline
capture) to run the M1 (live) + M2 (finished) lifecycle verification against the
REAL Bayern vs Köln match. **The session was started 5 days before the Bayern vs
Köln kickoff** (`2026-11-20T19:30:00Z` = Fri Nov 20 23:00 Tehran). The M1 + M2
windows are BOTH in the future + **could NOT run in this session** — the
production scheduler itself confirms the match is not yet live (`/healthz`
`sched_mode:IDLE / sched_reason:beyond-horizon / sched_live_now:0` — NOT a
sandbox-clock artefact; the production `/healthz` agrees with the session clock).
This is a **timing block, NOT a bug** (no stop-and-ask trigger per AGENTS.md §5 —
§5 covers risky irreversible actions, not a calendar mismatch). S27-cont ran the
**read-only pre-match baseline drift-check** instead: the Bayern page HTTP 200 /
125,656 bytes; the GSC surfaces byte-frozen (title/canonical/og/twitter/h1/meta-
description/JSON-LD/og:image/robots — byte-identical to §1.4.2, **DIFF 0**, no
drift since the S27 capture ~50 min earlier); the `.mkick`×1 + `.mcount`×1 +
`data-kickoff="2026-11-20T19:30:00Z"` PRESENT; the `.mlive`/`.mfin`/`.mscore`/
result block «نتیجه نهایی»/scorer block/live-status «در جریان» ALL ABSENT (Q4=A —
the scorer NEVER renders); the answer-first `id="answer"` = 1 DOM element; the
S25 F1 fix LIVE (`hero_is_div:"DIV"`); the version string NOT in the match HTML;
zero console errors at desktop 1440 + mobile 390; no horizontal scroll
(scrollWidth === clientWidth === innerWidth at both viewports). The render-hold
logic in `router.ts` (lines 720-724 + `seo/config.ts` `LIVE_PAGE_TTL:120` /
`SEO_PAGE_TTL:900`) confirmed by source inspection (the await count stays 3). NO
critical bug → NO code change → NO deploy → **NO cron scheduling** (the owner
chose option B, NOT option A; overriding the owner's explicit choice would
violate AGENTS.md's collision order — the owner's explicit instruction beats the
file). H1 stays OPEN. The owner re-fires option B on Nov 20: M1 at ~19:35 UTC
(kickoff + 5 min, clears the `LIVE_PAGE_TTL:120` render-hold) + M2 at ~21:35–
21:45 UTC (FT + the `SEO_PAGE_TTL:900` render-hold; FT ~21:15–21:25 UTC → visit
~21:40 UTC to be safe). The S27-cont record is at
`docs/mc/post-m10-hardening-report.md` §1.4.4 + DECISIONS decision 4. The
S27-cont prompt is self-contained + re-fireable verbatim at the Nov 20 windows.

**The prior S27 session (same day) — S27 is the live/finished lifecycle verification session (the H1 deferred work
from the S23 hardening report §1.2).** The session was started on 2026-11-15
(Sun Nov 15, 2026, Asia/Tehran) — **5 days before the Bayern vs Köln kickoff**
(`2026-11-20T19:30:00Z` = Fri Nov 20 23:00 Tehran). The live window (during the
match, after the 19:30 UTC kickoff) + the finished window (after FT + the 900s
render-hold) are BOTH in the future. The `/healthz` confirmed `sched_live_now:0`
(NO live matches) + the 30 homepage match links are ALL dated Nov 20+ (NO finished
matches in the pool to verify against). **S27 therefore ran the pre-match
baseline (the H1-upcoming re-verification + the byte-frozen GSC baseline that the
Nov 20 windows will be compared against) + documented the exact M1 [live] + M2
[finished] verification plan for Nov 20. NO code changes, NO deploy. H1 stays
OPEN.** The S27 record is at `docs/mc/post-m10-hardening-report.md` §1.4 + the 2
screenshots in `docs/assets/s27-lifecycle/`.

**The pre-match baseline (the Bayern vs Köln page, UPCOMING state — verified
2026-11-15T03:01Z via curl + the agent-browser, Chromium 0.43.0):**
- `/healthz` = `ok:true / version:13.258-mca11y / degraded:false / pool_matches:348 / sched_next_ko:2026-11-20T19:30:00.000Z / sched_next_wake:2026-11-20T18:30:00.000Z / sched_mode:IDLE / sched_live_now:0` — the S25 deploy is LIVE, NO live matches.
- The upcoming-state markers PRESENT: `.mkick`×1 + `.mcount`×1 + `data-kickoff="2026-11-20T19:30:00Z"`.
- The live/finished/scorer markers ABSENT: `.mlive`×0 + `.mfin`×0 + `.mscore`×0 + the result block «نتیجه نهایی»×0 + the scorer block×0 (Q4=A — the scorer NEVER renders).
- The answer-first briefing `id="answer"` PRESENT. The S25 F1 fix LIVE (the hero inner wrapper is a `<div>`, NOT a `<section>` — `hero_is_div:"DIV"`).
- The GSC surfaces byte-frozen (byte-identical to the S22/S23/S25 records): the title, canonical, og:title, twitter:title, h1, meta-description (the answer sentence), og:url, og:type, og:image, robots, the JSON-LD ×1 block. The version string NOT in the match page HTML.
- The device matrix: desktop 1440 + mobile 390 — BOTH zero console errors + no horizontal scroll (scrollWidth === clientWidth === innerWidth at both viewports). Screenshots: `docs/assets/s27-lifecycle/s27-desktop-1440-bayern-koln-prematch.png` + `s27-mobile-390-bayern-koln-prematch.png`.
- The render-hold logic in `router.ts` (lines 720-724 + `seo/config.ts` `LIVE_PAGE_TTL:120` / `SEO_PAGE_TTL:900`) confirmed by source inspection (the await count stays 3 — S27 is read-only, NO renderer touch).
- NO critical bug found → NO hotfix → NO deploy.

**The Nov 20 verification plan (DEFERRED — the H1-live + H1-finished windows):**
- **M1 (live, DURING the match, after the 19:30 UTC kickoff, before FT):** verify the `.mlive` pulse (the live dot + the «در جریان» aria-label) + the `.mscore` (the live score); the cron `*/10` tick refreshes the live overlay (the `LIVE_PAGE_TTL:120` render-hold — re-fetch within 120s); the scorer block ABSENT (Q4=A); the result block ABSENT (lives ONLY when finished); the GSC surfaces byte-frozen (the title may carry the FT score if the projection updates it — verify; if it changes, that is EXPECTED for a live→finished title update, NOT a byte-freeze violation). Zero console errors. Mobile 390 no horizontal scroll. The `sched_live_now` in `/healthz` should read `>0` during the window.
- **M2 (finished, AFTER FT + the 900s render-hold):** verify the `.mfin` «پایان بازی» status + the final `.mscore` + the result block «نتیجه نهایی» (the S07 projection gates it on the finished flag); the scorer block ABSENT (Q4=A — NEVER renders, even when finished); the GSC surfaces byte-frozen (or the title update verified if the projection carries the FT score — compare against the §1.4.2 baseline). Zero console errors. Mobile 390 no horizontal scroll.
- **The timing windows:** the live window opens at kickoff + the 120s render-hold (visit ≥2 min after kickoff). The finished window opens at FT + the 900s render-hold (visit ≥15 min after FT). The `sched_next_wake` is `2026-11-20T18:30:00Z` (the cron wakes 1 hour before kickoff to arm the live sweep).

**The H1 status:** H1-upcoming RE-VERIFIED (the pre-match baseline + the byte-frozen GSC baseline, 5 days closer to the match). H1-live + H1-finished remain DEFERRED to the Nov 20 windows. **H1 stays OPEN** until the live + finished marker verification runs. The owner's choice on how to run the Nov 20 windows (the S27 TLDR's A/B/C/D options) is the next decision.

**Standing laws honoured (unchanged):**
- The composer purity (no new inline JS — S27 is read-only).
- `buildMatchPage`'s await count stays exactly 3 (`hydrateMatchVenue`, `loadArchive`, `fullByCodeFor` — ADR-006; S27 is read-only, NO renderer touch).
- GSC surfaces + the answer sentence byte-frozen (verified — the §1.4.2 baseline).
- The homepage `#promoStrip`/`#tgHead`/`#tgPill`/`#tgPillGo` + the `#about`/`.pagesfoot` footer byte-frozen (decision 65 — verified by S23/S25; not re-checked in S27 to keep the read-only visit to the Bayern match page only).
- `wrangler deploy` FORBIDDEN (S27 is NO deploy; the production stays at the S25 deploy).
- The version bump law (the version stays `13.258-mca11y` — NO bump in S27).
- The cross-track SEO measurement window (Dec 4-8) is PROTECTED — the GSC surfaces are byte-frozen (S27 is read-only; NO deploy; NO code change).
- Zero credentials in any tracked file (the GitHub PAT was used ONLY for the one-shot docs-commit push, in the URL, never persisted in git config; the clone's `remote.origin.url` PAT was PURGED before the push via `git remote set-url origin https://github.com/assadigit/SportSignal.git`; `git config -l | grep ghp_` = zero matches).

## Current state (machine)

- **Version:** `13.258-mca11y` (`src/config.ts` VERSION / `package.json` version `13.258.0.0`; UNCHANGED by S27 — the S25 deploy version). The npm test baseline stays **3,583 OK** (3,573 baseline + 10 new S25 a11y assertions; S27 touches NO code — not re-run; `npx tsc --noEmit` clean [no code touched]; `git diff --check` clean).
- **Deploy:** Cloudflare Worker `ucl-notifier`, deployed via `npx wrangler versions deploy` (versioned deploy + instant rollback). Current production deployment `181285b8-c97d-4942-9d66-dafff2bd382a` (created 2026-11-15T02:38:53Z — the S25 a11y deep-dive; 100% traffic; the F1-F4 fixes LIVE; UNCHANGED by S27). Rollback: `npx wrangler rollback` restores the S22 + post-merge re-deploy (`ab1395ee` / `10c0a004` / `13.257-mcmatchcentre` — the previous deployment); the second rollback target is `88649642`/`b48bae21`/`13.255-seospell`.
- **Production hostnames:** `sportsignal.ir` (apex, the Custom Domain — the edge cache revalidates within the SWR=300 window) + `football.sportsignal.ir` (301s to apex except `/webhook`, `/api/`, `/admin`) + `ucl-notifier.sportsignal.workers.dev` (the workers.dev alias serving production traffic — NEVER treat as a scratch environment).
- **Branch:** `main` (canonical). HEAD = the S27-cont docs commit (the timing-block + drift-check record — see `git log` after the push; the prior S27 docs commit was `36ac23b`). `feat/match-centre` was merged at `c058035` on 2026-11-15 (the owner's instruction); S23 added `cb9f7b5` (the docs commit); S25 added the F1-F4 + audit commit; S27 added the pre-match baseline docs commit (`36ac23b`); S27-cont adds the timing-block + drift-check docs commit.
- **Commands:** `npm test` (tsc + the check scripts — must exit 0 before every push; the baseline is **3,583 OK** from S25; S27 touches NO code). **npm only, never `bun install`** (breaks `@resvg/resvg-wasm`; AGENTS §11). Port for local dev: `npx wrangler dev` (8787; `wrangler.dev.toml` is the local config — git-ignored). Deploy: `CLOUDFLARE_API_TOKEN=… CLOUDFLARE_ACCOUNT_ID=a796fdfe… npx wrangler versions upload` → `npx wrangler versions deploy --version-id <id> --percentage 100 --yes` (FORBIDDEN in S27 — the verification session; only if a critical bug is found).
- **Cron triggers:** `*/10 * * * *` + `27 */4 * * *` (re-armed; UNCHANGED by S27). The pool `pool_matches: 348` + the `sched_next_ko: 2026-11-20T19:30:00.000Z` (the Bayern vs Köln kickoff) + the `sched_next_wake: 2026-11-20T18:30:00.000Z` (the cron wakes 1 hour before kickoff to arm the live sweep) + `sched_live_now:0` (NO live matches until Nov 20).
- **Key folders:** `src/` (worker modules; `scripts/lib/worker-src.js` carries the bundle file ORDER — co-evolve when adding files; UNCHANGED by S27); `assets/` (immutable versioned client payload — UNCHANGED by S25/S27; the SW cache stays `sportsignal-v126` + the client bundle stays `public-13.80.js`); `docs/` (RUNBOOK, HANDOFF, specs, audits, `docs/mc/` the Match Centre milestone docs, `docs/audits/2026-11-15-s25-a11y-audit.md` the S25 audit, `docs/history/` session records); `docs/assets/s25-a11y/` (the S25 before/after screenshots); `docs/assets/s27-lifecycle/` (the S27 pre-match baseline screenshots — NEW).
- **Backups:** KV is live state; no routine file backups (RUNBOOK §5 has the KV key contracts). Never rename KV keys. KV schema is additive across versions (no renames, ever → rollback-safe).
- **Standing limits:** `_headers` sits at the 100-rule cap — every new pin needs a cap sweep. The cross-track SEO measurement window is Dec 4-8 (the GSC surfaces must stay byte-frozen through it — S25's body-only fixes comply; S27 is read-only; verified DIFF 0). Team-name spellings must NOT change before ~Dec 8 (the S1 M2 spelling fix is mid-measurement).

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
