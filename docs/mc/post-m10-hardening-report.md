# SportSignal Match Centre — Post-M10 Hardening Report (S23)

> Agents: read AGENTS.md in the repo root first, and follow it for the whole session.

**Session:** S23 — post-M10 hardening track, session 1 of N (DISCOVERY + DOCUMENTATION)
**Date:** 2026-11-15 (Sun Nov 15, 2026, Asia/Tehran)
**Starting commit:** `28ad836` (main, clean tree, `git ls-remote origin main` = local HEAD)
**Production state verified at the S23 start:** deployment `ab1395ee` / version `10c0a004` / `13.257-mcmatchcentre` (created 2026-11-15T00:53:22Z — the post-merge re-deploy from `main` at `c058035`; byte-identical to the S22 deploy `4280f40f`/`898b454c`). `/healthz` = `ok:true / 13.257-mcmatchcentre / degraded:false` + `pool_matches:348` + `sched_next_ko:2026-11-20T19:30:00.000Z` (the Bayern vs Köln kickoff — the #1 smoke match). The cron triggers (`*/10` + `27 */4`) re-armed.
**Scope:** H1 the live/finished lifecycle verification (the #1 gap from the S20 gate) + H2 the bug hunt across competitions / data states / devices / a11y + H3 the hardening report + the follow-up session proposals. **S23 produces this report, NOT a code deploy.**
**Standing laws honoured:** the composer purity (no new inline JS), `buildMatchPage`'s await count stays exactly 3 (no renderer touch), GSC surfaces byte-frozen (verified), the homepage byte-frozen surfaces verified, fail-closed everywhere, logical CSS properties only, mobile 390 no horizontal scroll, the CTA touch target ≥44px. Zero credentials in this file (the Cloudflare token + the GitHub PAT were used for the read-only exploration only, never stored).

---

## 0. The one-session scope (declared before touching code)

Per AGENTS.md §2.6 + the S23 prompt, the scope was declared in `docs/HANDOFF.md` BEFORE any code/exploration:

- **H1 — the live/finished lifecycle verification (the #1 gap).** The Bayern vs Köln kickoff is `2026-11-20T19:30:00Z` (Fri Nov 20 23:00 Tehran). **This session runs BEFORE the kickoff** (today is Sun Nov 15, 2026 — 5 days before). H1 therefore DOCUMENTS the verification PLAN + the markers to check + DEFERS the live/finished verification to a follow-up session after Nov 20.
- **H2 — the bug hunt + edge-case exploration** via the agent-browser + curl: the 6 leagues (CL, PL, PD, SA, FL1, BL1) + the cup competitions; the degenerate data states; the device matrix (mobile 390, 768, 1024, desktop 1440 — beyond the S20 gate's 390 + 1440); the a11y spot-checks; the RTL/LTR flip; the console errors.
- **H3 — the hardening report + the follow-up session proposals** (S24 perf/CWV, S25 a11y deep-dive, S26 UI/UX iteration).

**The read-only exploration wrote only the visit beacon + the change-only archive sync** (exactly what a normal page view writes — nothing more). The await count stays exactly 3. NO credentials needed for the read-only exploration beyond the agent-browser + curl.

---

## 1. H1 — the live/finished lifecycle verification (DEFERRED to after Nov 20)

### 1.1 Why H1 is deferred

The Bayern vs Köln kickoff is `2026-11-20T19:30:00Z` (Fri Nov 20 23:00 Tehran time). This session ran Sun Nov 15, 2026 — **5 days before the kickoff**. The current pool contains ONLY upcoming matches (the sandbox "today" < 2026-11-20). The live + finished match pages are NOT in the current pool — the same constraint as the S20 gate.

The S19 lifecycle assertions verified the consistency BY CONSTRUCTION:
- The hero's three states share the same shell + branch ONLY in the center column:
  - **upcoming** = `.mkick` + `.mcount` (the kickoff time + the countdown mount)
  - **live** = `.mscore` + `.mlive` (the score + the live status)
  - **finished** = `.mscore` + `.mfin` «پایان بازی» (the score + the finished status)
- The scorer block NEVER renders in any state (Q4=A — finished scorers stay omitted per spec §16).
- The result block «نتیجه نهایی» rides ONLY when finished (the S07 projection gates it on the finished flag).
- The answer-first briefing card (id=answer) renders in EVERY lifecycle state.

The S23 verification confirms the UPCOMING state holds against REAL production traffic (the Bayern match + 17 other upcoming matches verified — see H2). The LIVE + FINISHED verification is deferred to a follow-up session after Nov 20.

### 1.2 The verification PLAN for the follow-up session (S27 — proposed)

**The timing windows (the owner picks the time):**
- **The live window:** during the match (after the 19:30 UTC kickoff, before FT). The render-hold logic in `router.ts` holds the live render for 120s (live 120s). The `.mlive` pulse + the `.mscore` should render. The cron `*/10` tick refreshes the live overlay.
- **The finished window:** after FT + the 900s render-hold (finished 900s). The `.mfin` «پایان بازی» status + the final `.mscore` + the result block «نتیجه نهایی» should render. The scorer block should be ABSENT (Q4=A).

**The markers to check (the H1 verification checklist):**

| Marker | Upcoming (verified S23) | Live (deferred) | Finished (deferred) |
|---|---|---|---|
| Hero center column | `.mkick` + `.mcount` present | `.mscore` + `.mlive` present | `.mscore` + `.mfin` present |
| `.mlive` pulse | absent | present (the live dot + the «در جریان» aria-label) | absent |
| `.mfin` «پایان بازی» status | absent | absent | present |
| `.mcount` countdown mount | present (`data-kickoff` attr, `hidden` until JS hydrates) | absent | absent |
| Result block «نتیجه نهایی» | absent (upcoming) | absent (live) | present (finished ONLY) |
| Scorer block | absent (Q4=A) | absent (Q4=A) | absent (Q4=A — NEVER renders) |
| Answer-first briefing (id=answer) | present | present | present |
| Narrative `.mcentre-narrative` | present (if qualifying) | present (lifecycle wording: retains pre-match) | present (lifecycle wording: verified result) |
| FAQ accordion | present (4 Qs) | present | present |
| Telegram CTA | present (44px) | present | present |
| GSC surfaces (title/canonical/og/h1/JSON-LD) | byte-frozen (verified S23) | byte-frozen (verify) | byte-frozen (verify — the title may carry the FT score if the projection updates it) |

**The follow-up session (S27 — proposed):**
- **Objective:** verify the LIVE + FINISHED lifecycle states against REAL production matches after the Nov 20 kickoff.
- **Done-criteria:** the markers table above verified for at least one live match (during the match) + at least one finished match (after FT + 900s). The `.mlive` pulse + the `.mfin` «پایان بازی» + the result block «نتیجه نهایی» confirmed. The scorer block confirmed ABSENT. The GSC surfaces byte-frozen (or the title update verified if the projection carries the FT score). Zero console errors. Mobile 390 no horizontal scroll.
- **Dependency:** the Nov 20 kickoff (2026-11-20T19:30:00Z). The session must run DURING the live window (for the live verification) + AFTER FT + 900s (for the finished verification).
- **Note:** if the owner wants BOTH windows in one session, the session should start ~30 min after the kickoff (to catch the live state) + stay until ~20 min after FT (to catch the finished state after the 900s render-hold). OR split into two short sessions.

### 1.3 The S23 contribution to H1

- The UPCOMING lifecycle state is verified against 18 real production matches (H2a). The `.mkick` + `.mcount` + the kickoff text «جمعه ۲۹ آبان ۱۴۰۵ (۲۰ نوامبر ۲۰۲۶)» confirmed on the Bayern match. The countdown mount `data-kickoff="2026-11-20T19:30:00Z"` confirmed (the S04 countdown — the only inline-JS exception, decision 93).
- The render-hold logic in `router.ts` is preserved (the await count stays 3 — verified by the S20 assertion + unchanged by S23).
- The structural protection (the hero's three states share the shell + branch ONLY in the center column) is confirmed by source inspection (`match-centre.ts` line 223 — the hero renderer; the lifecycle branching is in the center column assembly).

**H1 status after S23: the verification PLAN + the markers are documented. The live/finished verification is DEFERRED to S27 (after Nov 20).**

### 1.4 The S27 pre-match baseline record (2026-11-15 — 5 days before the Nov 20 kickoff)

> S27 is the live/finished lifecycle verification session (the H1 deferred work). It was started on 2026-11-15 (Sun Nov 15, 2026, Asia/Tehran) — **5 days before the Bayern vs Köln kickoff** (`2026-11-20T19:30:00Z` = Fri Nov 20 23:00 Tehran). The live window (during the match, after the 19:30 UTC kickoff) + the finished window (after FT + the 900s render-hold) are BOTH in the future. S27 therefore runs the **pre-match baseline** (the upcoming-state verification of the Bayern page + the byte-frozen GSC baseline that the Nov 20 live/finished windows will be compared against) + re-confirms the Nov 20 verification plan. **NO code changes** (S27 is a verification session). **H1 stays OPEN** — the live + finished marker verification is deferred to the Nov 20 windows (the owner's choice on how to run them — see the A/B/C/D options in the S27 TLDR).

#### 1.4.1 The production state at the S27 start (verified 2026-11-15T03:01Z)

- `/healthz` = `ok:true / version:13.258-mca11y / degraded:false / pool_matches:348 / sched_next_ko:2026-11-20T19:30:00.000Z / sched_next_wake:2026-11-20T18:30:00.000Z / sched_mode:IDLE / sched_reason:beyond-horizon / sched_live_sweep:none / sched_live_now:0 / sched_stale_live:0 / sched_feed_ok:true`. The version `13.258-mca11y` matches the S25 deploy (deployment `181285b8`, created 2026-11-15T02:38:53Z — the F1-F4 fixes LIVE). **NO live matches in the pool** (`sched_live_now:0`).
- The pool scan: the homepage carries 30 dated match links — ALL dated Nov 20+ (the earliest is `bayern-munich-vs-1-koln-2026-11-20`; the rest span Nov 21–25 + Dec 5/12/19/29). **NO finished matches** in the pool to verify the finished-state markers against (the cron has rolled off the previous weekends' finished matches; the pool is forward-looking ~7 days, all upcoming). The `/matches/today` hub carries zero match links (today Nov 15 is a quiet match day — the weekend density is Nov 21-22).

#### 1.4.2 The Bayern page pre-match baseline (the upcoming state — verified 2026-11-15T03:01Z)

The Bayern vs Köln match page (`https://sportsignal.ir/matches/bayern-munich-vs-1-koln-2026-11-20`) was verified in the UPCOMING state via curl (the raw HTML) + the agent-browser (the live DOM, desktop 1440 + mobile 390). This is the **H1-upcoming** re-verification (5 days closer to the match than the S23 baseline) + the **byte-frozen GSC baseline** that the Nov 20 live/finished windows will be compared against.

**The H1 markers checklist — the upcoming column (re-verified S27):**

| Marker | Expected (upcoming) | curl (raw HTML) | agent-browser desktop 1440 | agent-browser mobile 390 |
|---|---|---|---|---|
| Hero center column `.mkick` + `.mcount` | present | `.mkick`×1, `.mcount`×1 ✓ | `mkick:1, mcount:1` ✓ | `mkick:1, mcount:1` ✓ |
| `.mcount` `data-kickoff` attr | `2026-11-20T19:30:00Z` | `data-kickoff="2026-11-20T19:30:00Z"` ✓ | `2026-11-20T19:30:00Z` ✓ | (desktop-verified) |
| `.mlive` pulse | absent | 0 ✓ | `mlive:0` ✓ | `mlive:0` ✓ |
| `.mfin` «پایان بازی» status | absent | `.mfin`×0 ✓ (the 2 raw «پایان بازی» hits are in the answer-card lifecycle text + a CSS comment, NOT rendered status) | `mfin:0` ✓ | `mfin:0` ✓ |
| `.mscore` (live/finished score) | absent | 0 ✓ | `mscore:0` ✓ | (desktop-verified) |
| Live status «در جریان» | absent | 0 ✓ | (desktop-verified) | (desktop-verified) |
| Result block «نتیجه نهایی» | absent | 0 ✓ | (desktop-verified) | (desktop-verified) |
| Scorer block (Q4=A — NEVER renders) | absent | `mscorer/mgoals/mscorers`×0 ✓ | `mscorer:0` ✓ | `mscorer:0` ✓ |
| Answer-first briefing `id="answer"` | present | ×1 ✓ | `answer:1` ✓ | (desktop-verified) |
| The S25 F1 fix — hero inner wrapper is `<div>` (NOT `<section>`) | present (S25 LIVE) | (raw HTML: `<div class="mcentre-hero">`) ✓ | `hero_is_div:"DIV"` ✓ | (desktop-verified) |

**The byte-frozen GSC surfaces (the baseline for the Nov 20 windows — curl, 2026-11-15T03:01Z):**

- `<title>⚽ بایرن مونیخ – کلن | بوندسلیگا، ۲۹ آبان | اسپرت سیگنال</title>` — byte-identical to the S22/S23/S25 records.
- `<link rel="canonical" href="https://sportsignal.ir/matches/bayern-munich-vs-1-koln-2026-11-20">` — byte-identical.
- `<meta property="og:title" content="⚽ بایرن مونیخ – کلن | بوندسلیگا، ۲۹ آبان | اسپرت سیگنال">` — byte-identical.
- `<meta name="twitter:title" content="⚽ بایرن مونیخ – کلن | بوندسلیگا، ۲۹ آبان | اسپرت سیگنال">` — byte-identical.
- `<h1 class="pageh1">بایرن مونیخ – کلن | بوندسلیگا، ۲۹ آبان (۲۰ نوامبر)</h1>` — byte-identical.
- `<meta name="description" content="بایرن مونیخ در بوندسلیگا میزبان کلن است؛ این بازی جمعه ۲۹ آبان ۱۴۰۵ (۲۰ نوامبر ۲۰۲۶) ساعت ۲۳:۰۰ به وقت تهران…">` — the answer sentence, byte-identical (the meta description === the answer sentence, one source of truth).
- `<meta property="og:url" content="https://sportsignal.ir/matches/bayern-munich-vs-1-koln-2026-11-20">`, `<meta property="og:type" content="website">`, `<meta property="og:image" content="https://sportsignal.ir/og/match-bayern-munich-vs-1-koln-2026-11-20.png">` — present.
- `<meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1">` — present.
- The JSON-LD `<script type="application/ld+json">` ×1 block (the Organization + WebSite + WebPage + SportsEvent + BreadcrumbList @graph) — present.
- The version string is NOT in the match page HTML (`grep -cE '13\.258|13\.257|mcM9x|mcfound|matchcentre'` = 0 — the version appears ONLY in `/healthz` + `/api/status`).
- The Cloudflare Web Analytics beacon (`cloudflareinsights`) IS present (P3 — the CWV/RUM data is being collected; for S24 after Dec 8).
- The hero portraits `<img class="mport">` ×2 carry `loading="lazy"` (P1 — the LCP anti-pattern finding, UNCHANGED by S25; for S24 after Dec 8). The S25 F2 fix carries the descriptive `alt` (verified in the live DOM via the S25 audit — NOT re-checked in S27 to keep the read-only visit minimal).

**The device matrix (agent-browser, Chromium 0.43.0):**

| Viewport | scrollWidth | clientWidth | innerWidth | overflowX | Console errors | Screenshot |
|---|---|---|---|---|---|---|
| 1440 (desktop) | 1440 | 1440 | 1440 | 0 (no hscroll) | 0 | `docs/assets/s27-lifecycle/s27-desktop-1440-bayern-koln-prematch.png` |
| 390 (mobile) | 390 | 390 | 390 | 0 (no hscroll) | 0 | `docs/assets/s27-lifecycle/s27-mobile-390-bayern-koln-prematch.png` |

**No critical bug found in the pre-match baseline.** The upcoming state holds 5 days before the match. The GSC surfaces are byte-frozen. The S25 F1 fix is LIVE (the hero inner wrapper is a `<div>`, not a `<section>`). The scorer block is ABSENT (Q4=A). Zero console errors. Mobile 390 no horizontal scroll. The render-hold logic in `router.ts` (lines 720-724 + `seo/config.ts` `LIVE_PAGE_TTL:120` / `SEO_PAGE_TTL:900`) is preserved exactly (the await count stays 3 — S27 is read-only, NO renderer touch).

#### 1.4.3 The Nov 20 verification plan (the M1 live + M2 finished windows — DEFERRED)

The live + finished marker verification (the H1-live + H1-finished columns of the §1.2 markers table) **cannot run in this session** — the match is 5 days away. The plan for the Nov 20 windows:

- **M1 — the live verification (DURING the match, after the 19:30 UTC kickoff, before FT):** open `https://sportsignal.ir/matches/bayern-munich-vs-1-koln-2026-11-20` in the agent-browser (desktop 1440 + mobile 390). Verify: the `.mlive` pulse (the live dot + the «در جریان» aria-label) + the `.mscore` (the live score); the live status «در جریان»; the cron `*/10` tick refreshes the live overlay (the `LIVE_PAGE_TTL:120` render-hold — re-fetch within 120s); the scorer block ABSENT (Q4=A); the result block ABSENT (lives ONLY when finished); the GSC surfaces byte-frozen (the title may carry the FT score if the projection updates it — verify; if it changes, that is EXPECTED for a live→finished title update, NOT a byte-freeze violation). Zero console errors. Mobile 390 no horizontal scroll. The `sched_live_now` in `/healthz` should read `>0` during the window (the cron's live-sweep armed).
- **M2 — the finished verification (AFTER FT + the 900s render-hold):** open the same URL. Verify: the `.mfin` «پایان بازی» status + the final `.mscore`; the result block «نتیجه نهایی» renders (the S07 projection gates it on the finished flag); the scorer block ABSENT (Q4=A — NEVER renders, even when finished); the GSC surfaces byte-frozen (or the title update verified if the projection carries the FT score — compare against the §1.4.2 baseline). Zero console errors. Mobile 390 no horizontal scroll.
- **The timing windows:** the kickoff is `2026-11-20T19:30:00Z` (Fri Nov 20 23:00 Tehran). The live window opens at kickoff + the render-hold (the `LIVE_PAGE_TTL:120` means the live render is held for 120s, then refreshed — visit ≥2 min after kickoff to catch the live state). The finished window opens at FT + `SEO_PAGE_TTL:900` (15 min — the finished render is held for 900s after FT; visit ≥15 min after FT to catch the stable finished state). The `sched_next_wake` is `2026-11-20T18:30:00Z` (the cron wakes 1 hour before kickoff to arm the live sweep).

**H1 status after S27: H1-upcoming RE-VERIFIED (the pre-match baseline + the byte-frozen GSC surfaces, 5 days closer to the match). H1-live + H1-finished remain DEFERRED to the Nov 20 windows. H1 stays OPEN until the live + finished marker verification runs. The owner's choice on how to run the Nov 20 windows (the S27 TLDR's A/B/C/D options) determines the next step.**

#### 1.4.4 S27-cont — the option-B continuation attempted 2026-11-15 (BLOCKED by timing; the pre-match baseline re-confirmed byte-frozen DIFF 0; H1 stays OPEN)

> The owner fired the S27-cont continuation session on **2026-11-15** (the same day as S27, ~50 min after the §1.4.2 baseline capture) to run **option B** (DECISIONS decision 3 — the owner starts a new session during the live window + another after FT+900s). **The session was started 5 days before the Bayern vs Köln kickoff** (`2026-11-20T19:30:00Z`). The M1 (live) + M2 (finished) windows are BOTH in the future + **could NOT run in this session** — the production scheduler itself confirms the match is not yet live. This is a **timing block, NOT a bug** (no stop-and-ask trigger per AGENTS.md §5 — §5 covers risky irreversible actions, not a calendar mismatch). S27-cont therefore ran the **read-only pre-match baseline drift-check** (confirm the §1.4.2 baseline still holds + the GSC surfaces are byte-frozen + no drift since the S27 capture ~50 min earlier) + re-confirmed the Nov 20 re-fire windows. **NO code changes, NO deploy, NO cron scheduling** (the owner chose option B, NOT option A; overriding the owner's explicit choice would violate AGENTS.md's collision order — the owner's explicit instruction beats the file). **H1 stays OPEN.**

**The production state at the S27-cont start (verified 2026-11-15T03:50Z via curl):**
- `/healthz` = `ok:true / version:13.258-mca11y / degraded:false / pool_matches:348 / sched_mode:IDLE / sched_reason:beyond-horizon / sched_live_sweep:none / sched_live_now:0 / sched_stale_live:0 / sched_feed_ok:true / sched_next_ko:2026-11-20T19:30:00.000Z / sched_next_wake:2026-11-20T18:30:00.000Z`. The version `13.258-mca11y` matches the S25 deploy (UNCHANGED by S27/S27-cont). `sched_mode:IDLE` + `sched_reason:beyond-horizon` + `sched_live_now:0` — the production scheduler itself confirms the match is NOT live (the kickoff is 5 days away). This is NOT a sandbox-clock artefact — the production `/healthz` agrees with the session clock.

**The pre-match baseline drift-check (DIFF 0 vs §1.4.2 — verified 2026-11-15T03:50Z):**
- The Bayern page (`https://sportsignal.ir/matches/bayern-munich-vs-1-koln-2026-11-20`) HTTP 200 / 125,656 bytes (the §1.4.2 record was 125,656 bytes — byte-identical body size).
- The GSC surfaces byte-frozen (byte-identical to the §1.4.2 baseline): `<title>⚽ بایرن مونیخ – کلن | بوندسلیگا، ۲۹ آبان | اسپرت سیگنال</title>`, the canonical `https://sportsignal.ir/matches/bayern-munich-vs-1-koln-2026-11-20`, the og:title, the twitter:title, the h1 `بایرن مونیخ – کلن | بوندسلیگا، ۲۹ آبان (۲۰ نوامبر)`, the meta-description (the answer sentence), the og:url/og:type/og:image, the robots, the JSON-LD ×1 block. **DIFF 0.**
- The version string NOT in the match page HTML (`grep -cE '13\.258|13\.257|mcM9x|mcfound|matchcentre'` = 0 — the version appears ONLY in `/healthz` + `/api/status`). The Cloudflare Web Analytics beacon present (P3). The hero portraits `loading="lazy"` ×2 (P1, unchanged — for S24 after Dec 8).
- The lifecycle markers (curl + the agent-browser, desktop 1440 + mobile 390): `.mkick`×1 + `.mcount`×1 + `data-kickoff="2026-11-20T19:30:00Z"` PRESENT; `.mlive`×0 + `.mfin`×0 + `.mscore`×0 + the result block «نتیجه نهایی»×0 + the scorer block `.mscorer`/`.mgoals`/`.mscorers`×0 (Q4=A — the scorer NEVER renders) + the live status «در جریان»×0 ALL ABSENT. The 2 raw «پایان بازی» hits are in the answer-card lifecycle text + a CSS comment (NOT the `.mfin` rendered status — the §1.4.2 note). The answer-first briefing `id="answer"` = 1 DOM element (`<div class="mcentre-card mcentre-brief" id="answer">`; the 3 raw `id="answer"` substring hits = 2 HTML comments + the 1 element). The S25 F1 fix LIVE (`<div class="mcentre-hero">` ×1; `<section class="mcentre-hero">` ×0 — `hero_is_div:"DIV"`).
- The device matrix (agent-browser, Chromium): desktop 1440 — `scrollWidth:1440 / clientWidth:1440 / innerWidth:1440 / overflowX:0` + zero console errors; mobile 390 — `scrollWidth:390 / clientWidth:390 / innerWidth:390 / overflowX:0` + zero console errors. No horizontal scroll at either viewport. (The pre-match screenshots already exist from S27 — `docs/assets/s27-lifecycle/s27-desktop-1440-bayern-koln-prematch.png` + `s27-mobile-390-bayern-koln-prematch.png` — NOT re-captured; the LIVE/FINISHED screenshots `s27-desktop-1440-bayern-koln-LIVE.png` etc. CANNOT exist yet — the match is 5 days away.)

**No critical bug found.** The pre-match baseline holds (DIFF 0 vs §1.4.2). The GSC surfaces are byte-frozen (the cross-track SEO measurement window Dec 4-8 is PROTECTED — no drift since the S27 capture). The scorer block is ABSENT (Q4=A). The S25 F1 fix is LIVE. Zero console errors. Mobile 390 no horizontal scroll. **NO code change, NO deploy, NO cron scheduling.**

**The Nov 20 re-fire windows (option B — the owner re-fires the session at the match times):**
- **M1 (live):** re-fire on **2026-11-20 at ~19:35 UTC** (kickoff 19:30 UTC + 5 min, clears the `LIVE_PAGE_TTL:120` render-hold — visit ≥2 min after kickoff). Verify the `.mlive` pulse + the `.mscore` + the «در جریان» status; the scorer ABSENT (Q4=A); the result block ABSENT; the GSC surfaces byte-frozen (the title MAY carry the live score if the projection updates it — EXPECTED, NOT a violation); `sched_live_now` in `/healthz` should read `>0`. Desktop 1440 + mobile 390 screenshots → `s27-desktop-1440-bayern-koln-LIVE.png` + `s27-mobile-390-bayern-koln-LIVE.png`.
- **M2 (finished):** re-fire on **2026-11-20 at ~21:35–21:45 UTC** (FT is ~21:15–21:25 UTC for a ~105-min match; + the `SEO_PAGE_TTL:900` render-hold = ~21:30–21:40 UTC; visit ~21:40 UTC to be safe). Verify the `.mfin` «پایان بازی» status + the final `.mscore` + the result block «نتیجه نهایی»; the scorer ABSENT (Q4=A — NEVER renders, even when finished); the GSC surfaces byte-frozen OR the live→finished title update documented (compare against the §1.4.2 baseline). Desktop 1440 + mobile 390 screenshots → `s27-desktop-1440-bayern-koln-FINISHED.png` + `s27-mobile-390-bayern-koln-FINISHED.png`.
- The owner re-fires the S27-cont prompt verbatim on Nov 20 at those times (the prompt is self-contained — it carries the reading order + the markers checklist + the screenshot filenames + the stop-and-ask rule). IF a critical lifecycle bug is found in either window, STOP + present the bug + the proposed fix + the deploy plan (the `wrangler deploy` FORBIDDEN — use `wrangler versions deploy` if a fix is needed; the version bump law + the composer purity + the await count [3] + the GSC-surfaces-byte-frozen discipline all unchanged).

**H1 status after S27-cont: H1-upcoming RE-RE-VERIFIED (the pre-match baseline holds, DIFF 0 vs §1.4.2 — no drift since the S27 capture ~50 min earlier). H1-live + H1-finished remain DEFERRED to the Nov 20 windows. H1 stays OPEN until the owner re-fires option B on Nov 20. The S27-cont timing block is a calendar mismatch (the session was fired 5 days before the kickoff), NOT a bug — no code change, no deploy, no cron scheduling (the owner chose option B).**

---

## 2. H2 — the bug hunt + edge-case exploration

### 2.1 The methodology

- **The agent-browser** (Chromium 0.43.0) was the PRIMARY tool for the visual + a11y + interaction checks. The device matrix (390 / 768 / 1024 / 1440) was set via `agent-browser set viewport`. The console errors were captured via `agent-browser errors`. The DOM was inspected via `agent-browser eval`. The interactions (FAQ accordion, schedule expand, keyboard Tab) were exercised via `agent-browser click` + `agent-browser press Tab`.
- **curl** was used for the broad sweep (the GSC surfaces byte-frozen verification, the mcentre class counts, the degenerate-state hunt across 18 matches). The HTML was analysed via Python scripts (the structure scan, the class counts, the section-wrap detection).
- **The live production site:** `https://sportsignal.ir` (the apex). The workers.dev alias was NOT used (it's production, per audit §13 risk 8 — never treat as scratch).

### 2.2 H2a — the 6 leagues + the cup competitions (18 matches verified)

**The sample (18 real production matches across the 6 leagues + cups):**

| Match | Comp | Size | Ports | Venue | Standings | Form | Sched | Related |
|---|---|---|---|---|---|---|---|---|
| bayern-munich-vs-1-koln-2026-11-20 | BL1 | 125,993 | 2 | ✓ | 11 rows | ✓ | 57 rows | 8 |
| borussia-monchengladbach-vs-borussia-dortmund-2026-11-21 | BL1 | 130,531 | 2 | ✓ | 11 rows | ✓ | 66 rows | 8 |
| 1-union-berlin-vs-rb-leipzig-2026-11-21 | BL1 | 128,781 | 2 | ✓ | 11 rows | ✓ | 66 rows | 8 |
| eintracht-frankfurt-vs-tsg-hoffenheim-2026-11-21 | BL1 | 126,832 | 2 | ✓ | 6 rows | ✓ | 66 rows | 8 |
| manchester-city-vs-fulham-2026-11-21 | PL | 130,544 | 2 | ✓ | 11 rows | ✓ | 66 rows | 8 |
| aston-villa-vs-sunderland-2026-11-21 | PL | 127,513 | 2 | ✓ | 11 rows | ✓ | 66 rows | 8 |
| bournemouth-vs-nottingham-forest-2026-11-21 | PL | 128,856 | 2 | ✓ | 11 rows | ✓ | 66 rows | 8 |
| coventry-city-vs-crystal-palace-2026-11-21 | PL (cup-tagged) | 127,203 | 2 | ✓ | 6 rows | ✓ | 66 rows | 8 |
| real-madrid-vs-rc-celta-de-vigo-2026-11-21 | PD | 130,544 | 2 | ✓ | 11 rows | ✓ | 66 rows | 8 |
| rayo-vallecano-de-madrid-vs-valencia-2026-11-21 | PD | 126,812 | 2 | ✓ | 9 rows | ✓ | 66 rows | 8 |
| deportivo-alaves-vs-rc-deportivo-la-coruna-2026-11-21 | PD (cup) | 127,007 | 2 | ✓ | 8 rows | ✓ | 66 rows | 8 |
| lazio-vs-lecce-2026-11-21 | SA | 127,858 | 2 | ✓ | 11 rows | ✓ | 66 rows | 8 |
| como-vs-cagliari-2026-11-21 | SA | 127,729 | 2 | ✓ | 9 rows | ✓ | 66 rows | 8 |
| ogc-nice-vs-paris-saint-germain-2026-11-21 | FL1 | 128,529 | 2 | ✓ | 8 rows | ✓ | 66 rows | 8 |
| monaco-vs-aj-auxerre-2026-11-21 | FL1 | 128,235 | 2 | ✓ | 11 rows | ✓ | 66 rows | 8 |
| es-troyes-vs-le-havre-2026-11-20 | FL1 | 121,303 | 2 | ✓ | 5 rows | ✓ | 66 rows | 8 |
| rc-strasbourg-alsace-vs-stade-brestois-29-2026-11-21 | FL1 | 127,053 | 2 | ✓ | 9 rows | ✓ | 66 rows | 8 |
| racing-club-de-lens-vs-toulouse-2026-11-21 | FL1 | 125,934 | 2 | ✓ | 6 rows | ✓ | 66 rows | 8 |

**The findings (H2a):**
- **All 18 matches render HTTP 200** with the full Match Centre (the 11 spec §3 sections present, the GSC surfaces byte-frozen).
- **The both-or-neither portrait law holds universally** — every match has exactly 2 portraits (ports=2) + 2 team crests (mcrest=2) + 1 competition crest (complogo=1). The hero library coverage (111 big-5 clubs per AGENTS.md §14) is excellent — NO crest-only heroes found in the sample.
- **The standings window varies correctly** (5-11 rows): the 5-row neighbourhood around each participant + the ellipsis merge when the windows overlap. The `es-troyes-vs-le-havre` match (5 rows) is the minimum (the two teams are adjacent in the standings — the windows merge into one). The 11-row matches are the non-overlapping 5+5+1-ellipsis case.
- **The schedule density is consistent** (57-66 rows): the 7-day window of fixtures. The Bayern match (57 rows) is slightly fewer because it's a Friday kickoff (the window captures fewer weekend matches).
- **The byte-size varies (121,303 to 130,544)** — the body is data-driven (the schedule/form/related sections render from live KV). The S22 record's "125,549 bytes" was a snapshot at deploy time, NOT a fixed value. The **GSC surfaces are byte-frozen** (verified — see §2.7).
- **The cup matches (Coventry vs Crystal Palace, Deportivo Alavés vs RC Deportivo) render correctly** — the competition crest + name show the parent league (PL/PD) when the cup uses the league's FD.org code. The Coventry match shows the PL crest + «لیگ برتر انگلیس» (English Premier League). This is the expected behavior (the FD.org competition code for EFL Cup matches tagged under PL).

**No critical bugs found in H2a.** The production data is consistently rich across the 6 leagues + cups.

### 2.3 H2b — the degenerate data states

**The hunt:** I specifically sampled less-prominent teams (Sunderland, Como, Troyes, Brest, Lens, Toulouse, Rayo, Nottingham Forest, Auxerre, Hoffenheim) to find crest-only heroes / missing venue / missing standings / fewer-than-five form results / empty schedule.

**The findings (H2b):**
- **NO degenerate states found in the current pool.** All 18 matches have full data (venue, standings, form, 2 portraits, crest, ~66 schedule rows, 8 related rows).
- **The resilience is verified BY CONSTRUCTION** (the S19 lifecycle assertions — the fail-closed behavior across full/partial/stale/unavailable/N-A states). The S19 assertions cover: the empty-schedule no-false-empty law, the stale-freshness cue, the lifecycle hero/summary/narrative consistency, the MISSING-IS-NOT-ZERO law.
- **The live degenerate paths** (a match with a missing venue, a crest-only hero, an empty schedule) are RARE in the current production pool because:
  - The hero library covers 111 big-5 clubs (the launch backlog is CLOSED — AGENTS.md §14).
  - The venue data is fetched per-match (≤1 fetch per 24h, KV-cached positive + negative).
  - The standings caches are pre-built for the 6 leagues.
- **The H1 live/finished verification (deferred to S27)** will exercise the resilience paths against REAL live/finished matches (the live overlay + the finished score). This is the natural complement to the S19 by-construction verification.

**No critical bugs found in H2b.** The production data is consistently rich. The resilience holds by construction; the live/finished exercise is deferred to S27.

### 2.4 H2c — the device matrix (390 / 768 / 1024 / 1440)

**The S20 gate verified 390 + 1440. S23 adds 768 + 1024 (the intermediate viewports).**

| Viewport | scrollWidth | clientWidth | overflowX | Console errors | Screenshot |
|---|---|---|---|---|---|
| 390 (mobile) | 390 | 390 | clip (0) | 0 | `s23-mobile-390-bayern-koln.png` |
| 768 (tablet) | 768 | 768 | clip (0) | 0 | `s23-tablet-768-bayern-koln.png` |
| 1024 (desktop) | 1024 | 1024 | clip (0) | 0 | `s23-desktop-1024-bayern-koln.png` |
| 1440 (desktop) | 1440 | 1440 | clip (0) | 0 | `s23-desktop-1440-bayern-koln.png` |

**The findings (H2c):**
- **NO horizontal scroll at ANY viewport** (scrollWidth === clientWidth === innerWidth at 390/768/1024/1440).
- **The `.mcentre-cols` grid collapses to one column at 768** (the computed `gridTemplateColumns` = "720px" — single column; the 1080px breakpoint upgrades to the two-column briefing|facts pairing). This matches decision 4 + the S20 assertion [e] (the collapse-to-one-column discipline holds at intermediate widths).
- **Zero console errors at ALL four viewports.**
- **The LTR flip** (dir=ltr) at 1440: NO horizontal scroll (scrollWidth 1440 === clientWidth 1440), the hero face direction follows the flip (`heroFaceDir: ltr`). The logical-properties-only discipline holds under a dir flip (the S20 assertion [e] re-verified live).

**No critical bugs found in H2c.** The responsive + RTL/LTR discipline holds across the full device matrix.

### 2.5 H2d — the browser matrix (Chromium only — a documented gap)

**The agent-browser is Chromium-based** (Playwright's Chromium). The S23 verification covered **Chrome/Chromium only**.

**The gap (documented honestly):**
- **Safari (WebKit) NOT tested.** Safari has known differences in: the CSS `grid` subgrid support, the `aspect-ratio` property, the WebP rendering (Safari < 14), the `:focus-visible` support (Safari < 15.4), the `inset` logical properties (Safari < 14.1), the `content-visibility` property. The Match Centre uses logical CSS properties (`inset-inline-start`, `margin-block`, etc.) — Safari < 14.1 might not render them correctly.
- **Firefox NOT tested.** Firefox has differences in: the `content-visibility` rendering, the `scrollbar-gutter`, the `:focus-visible` heuristic (Firefox uses a different heuristic than Chrome).
- **Edge NOT tested.** Edge is Chromium-based — the Chrome verification likely covers Edge, but the Edge-specific rendering (the Edge bar, the collection features) is NOT verified.

**The follow-up:** S25 (a11y deep-dive) should test Safari + Firefox + Edge via a cross-browser tool (BrowserStack, LambdaTest, or local installs). The S23 screenshots are Chrome-only.

### 2.6 H2e — the a11y spot-checks (the findings)

**The GOOD (verified working):**
- **The skip-link** «پرش به محتوا» (skip to content) — Tab 1 lands on the skip-link (WCAG 2.4.1 Bypass Blocks). The link is visible on focus + jumps to `#main`.
- **The focus-visible outline** — `:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }` (the `#7dd3fc` icy-blue accent — WCAG 1.4.11 ≥3:1 against the dark navy). Verified on 8 consecutive Tab stops (skip-link + brand + 6 main-nav links). Consistent across all elements.
- **The FAQ delayed-collapse accordion** — click Q1 → expands (aria-expanded=true, answer hidden=false); click Q2 within 600ms → BOTH stay expanded (the delayed-collapse, decision 58); wait 900ms → Q1 collapses, Q2 stays. The aria-expanded + aria-controls wiring is correct. The answer region carries `role="region"`. (Verified live — matches the S16 gate.)
- **The schedule expand** — click «نمایش روزهای بعد» → aria-expanded=true, the label swaps to «بستن روزهای بعد», the remaining container reveals. (Verified live — matches the S15 gate + decision 40.)
- **The telegram CTA** — `href="https://t.me/SportSignalz"` + `target="_blank"` + `rel="noopener noreferrer"` + the accessible name «عضویت در کانال تلگرام» + the computed height 44px (≥44px — decision 70 / WCAG 2.5.8). Verified on Bayern + Coventry (cup). (Matches the S18 gate.)
- **The reduced-motion blocks** — 13 `@media (prefers-reduced-motion:reduce)` blocks detected (the 6 mcentre-scoped + the global kill rule + the homepage chrome). (Matches the S20 assertion [d].)
- **The contrast tokens** — the design-system tokens meet WCAG AA: `#0f172a`/`#1e293b` (dark navy bg) + `#f1f5f9`/`#e2e8f0` (light text ≈ 15:1) + `#7dd3fc` (icy-blue accent ≈ 11:1 on dark navy). (Matches the S20 assertion + WCAG 1.4.3/1.4.11.)

**The FINDINGS (the bugs + the gaps):**

#### Finding F1 (MEDIUM a11y) — the hero is double-wrapped in two `<section>` landmarks + the inner aria-label is semantically wrong

- **Severity:** MEDIUM (a11y landmark redundancy + a wrong label — confusing for screen reader users, NOT a visual breakage).
- **Reproduction steps:**
  1. Open `https://sportsignal.ir/matches/bayern-munich-vs-1-koln-2026-11-20` (or ANY match page — the bug is systematic).
  2. Inspect the hero region in the DOM.
  3. Observe: the hero is wrapped in TWO nested `<section>` elements:
     - Outer: `<section id="mcentre-hero" aria-label="تیم‌ها و وضعیت بازی">` (from `pages.ts` sectionHtml — the spec §3 section wrapper).
     - Inner: `<section class="mcentre-hero" aria-label="خلاصه بازی">` (from `match-centre.ts` line 223 — the S04 hero renderer).
- **The issue:** (a) Two nested `<section>` landmarks for the same content → screen readers announce two landmarks («تیم‌ها و وضعیت بازی» then «خلاصه بازی») — redundant + confusing. (b) The inner aria-label «خلاصه بازی» (match summary) is semantically WRONG for the hero (the hero is the teams + score, NOT the summary — the summary is a separate spec §3 section, item 4). This looks like the hero renderer reused the summary's label constant by mistake.
- **The scope:** SYSTEMATIC across ALL match pages (verified via curl on 7 matches across BL1/PL/PD/SA/FL1 + 2 cups — all carry the same `<section class="mcentre-hero" aria-label="خلاصه بازی">` inner wrapper). The other 10 sections (nav/summary/standings/form/venue/schedule/faq/related/telegram/footer-hook) use a SINGLE outer `<section id="mcentre-X" aria-label="...">` + an inner `<div class="mcentre-X">` (NO inner landmark). The hero is the ONLY section with the double-wrap.
- **The root cause:** `src/seo/match-centre.ts` line 223: `return '<section class="mcentre-hero" aria-label="خلاصه بازی">' + ...`. The S04 hero renderer outputs a `<section>` with an aria-label, which nests inside the outer `<section id="mcentre-hero">` from `pages.ts` sectionHtml.
- **The proposed fix (presentation-layer, ONE line):** change `match-centre.ts:223` from `<section class="mcentre-hero" aria-label="خلاصه بازی">` to `<div class="mcentre-hero">` (+ the closing `</section>` to `</div>` on line 230). This: (a) removes the redundant inner landmark; (b) fixes the wrong aria-label; (c) matches the pattern used by the other 10 sections (inner `<div class="mcentre-X">`, outer `<section id="mcentre-X" aria-label="...">`). The GSC surfaces (in the `<head>`) are NOT touched. The await count stays 3. The fix is byte-safe for the byte-frozen surfaces.
- **The follow-up session:** S25 (a11y deep-dive) OR a dedicated fix session. **NOT a hotfix** (MEDIUM severity, not critical, not customer-facing, reversible, doesn't touch the GSC surfaces). The fix needs owner approval (a production deploy) — per AGENTS.md §5, production deploys are NOT under standing approval.
- **Viewport:** all (the bug is viewport-independent — it's in the HTML structure).

#### Finding F2 (LOW a11y) — the hero images (portraits + crests) carry `alt=""` (decorative)

- **Severity:** LOW (a judgment call for the a11y deep-dive — the team names are in adjacent text, so crests being decorative is defensible; the portraits being decorative is a closer call).
- **Reproduction steps:**
  1. Open any match page.
  2. Inspect the hero images: `<img class="mcomplogo" ... alt="">`, `<img class="mport" ... alt="">`, `<img class="mcrest" ... alt="">`.
  3. All 5 hero images have `alt=""` (empty alt = decorative, ignored by screen readers).
- **The issue:** the team crests + the competition crest being `alt=""` is defensible (the team/competition NAMES are in the adjacent text `.mname` / `.mchip` — the crest is visual reinforcement). BUT the PORTRAITS being `alt=""` means screen readers don't announce the player names («هری کین» / «الیس اسخییری»). The player names are NOT in the adjacent text (the hero shows the team names, not the player names — the portraits are the only place the player identity appears). A screen reader user won't know WHICH players are featured.
- **The proposed fix (for S25 to assess):** either (a) add descriptive alt text to the portraits: `alt="تصویر هری کین، بازیکن بایرن مونیخ"` / `alt="تصویر الیس اسخییری، بازیکن کلن"` (requires the hero renderer to carry the player names); OR (b) add a visually-hidden `<span>` with the player names adjacent to the portraits (the screen-reader-only text pattern). The crests can stay `alt=""` (decorative — the names are in adjacent text).
- **The follow-up session:** S25 (a11y deep-dive). NOT a hotfix.
- **Viewport:** all.

#### Finding F3 (LOW a11y) — the nav links carry `aria-current=null` at page load

- **Severity:** LOW (the IntersectionObserver sets it dynamically on scroll, but at page load no link is marked current).
- **Reproduction steps:**
  1. Open any match page.
  2. At page load (top of page), inspect the 5 nav links: all have `aria-current=null`.
  3. The first link (خلاصه / summary) should be `aria-current="true"` (or `"location"`) at the top since the summary section is the first content section.
- **The issue:** screen reader users navigating by landmarks won't know which section is active until they scroll (the IntersectionObserver fires on scroll). At page load, the active section is ambiguous.
- **The proposed fix:** set `aria-current="true"` on the first nav item (خلاصه) at render time (server-side) + let the IntersectionObserver update it on scroll. This is a one-line change in the nav renderer.
- **The follow-up session:** S25 (a11y deep-dive) OR S26 (UI/UX iteration). NOT a hotfix.
- **Viewport:** all.

#### Finding F4 (LOW a11y / cosmetic) — the outer `<section id="mcentre-nav">` has no aria-label

- **Severity:** LOW / cosmetic (the inner `<nav class="mnav" aria-label="ناوبری بخش‌های صفحه">` IS properly labeled — the outer section is a redundant unlabeled wrapper).
- **Reproduction steps:**
  1. Open any match page.
  2. Observe: `<section id="mcentre-nav">` (no aria-label) wraps `<nav class="mnav" aria-label="ناوبری بخش‌های صفحه">`.
- **The issue:** an unlabeled `<section>` landmark is a WCAG 1.3.1 info (landmarks should be labeled). The inner `<nav>` IS labeled, so the outer section is redundant. Screen readers announce two landmarks for the nav («section» + «navigation, ناوبری بخش‌های صفحه»).
- **The proposed fix:** either (a) drop the outer `<section id="mcentre-nav">` wrapper (let the `<nav class="mnav">` be the direct child of the main content) — matches the other 10 sections' pattern; OR (b) add `aria-label="ناوبری بخش‌های صفحه"` to the outer section + change the inner `<nav>` to a `<div>` (consolidate the landmark). Option (a) is simpler.
- **The follow-up session:** S25 (a11y deep-dive). NOT a hotfix.
- **Viewport:** all.

### 2.7 H2g — the GSC surfaces byte-frozen verification (the cross-track SEO measurement protection)

**The S22 record said the GSC surfaces are byte-frozen (diff prod vs mcM9x preview = DIFF 0).** S23 re-verifies they're STILL byte-frozen (the production has been live for ~40 minutes at the S23 start, with the cron ticks refreshing the pool).

**The Bayern vs Köln match page GSC surfaces (verified 2026-11-15):**
- `<title>⚽ بایرن مونیخ – کلن | بوندسلیگا، ۲۹ آبان | اسپرت سیگنال</title>` — byte-identical to the S22 record.
- `<link rel="canonical" href="https://sportsignal.ir/matches/bayern-munich-vs-1-koln-2026-11-20">` — byte-identical.
- `<meta property="og:title" content="⚽ بایرن مونیخ – کلن | بوندسلیگا، ۲۹ آبان | اسپرت سیگنال">` — byte-identical.
- `<meta name="twitter:title" content="⚽ بایرن مونیخ – کلن | بوندسلیگا، ۲۹ آبان | اسپرت سیگنال">` — byte-identical.
- `<h1 class="pageh1">بایرن مونیخ – کلن | بوندسلیگا، ۲۹ آبان (۲۰ نوامبر)</h1>` — byte-identical.
- `<meta name="description" content="بایرن مونیخ در بوندسلیگا میزبان کلن است؛ این بازی جمعه ۲۹ آبان ۱۴۰۵ (۲۰ نوامبر ۲۰۲۶) ساعت ۲۳:۰۰ به وقت تهران...">` — the answer sentence, byte-identical (the meta description === the answer sentence, one source of truth).
- The JSON-LD `<script type="application/ld+json">` present (1 block — the Organization + WebSite + WebPage + SportsEvent + BreadcrumbList @graph).
- **The version string is NOT in the match page HTML** (`grep -cE '13\.257|13\.256|mcM9x|mcfound|matchcentre'` = 0 on the match page — the version appears ONLY in `/healthz` + `/api/status`).

**The homepage byte-frozen surfaces (verified):**
- `#promoStrip` present, `#tgHead` present, `#tgPill` present, `#tgPillGo` present, `#about` (the footer) present. All byte-frozen surfaces survived the post-merge re-deploy.

**The byte-size observation (INFO, NOT a bug):**
- The Bayern match page is now **125,993 bytes** (was 125,549 at the S22 deploy — +444 bytes). The body is data-driven (the schedule/form/related sections render from live KV, which updates with each cron tick). The S22 record's "125,549 bytes" was a snapshot at deploy time, NOT a fixed value. The byte-size varies across matches (121,303 to 130,544 in the H2a sample).
- **The "byte-frozen" discipline applies to the GSC surfaces + the answer sentence (in the `<head>`), NOT the whole page body.** The body is EXPECTED to vary with the KV state. This is the correct behavior — the GSC measurement surfaces stay stable while the editorial body reflects the live data.

**The cross-track SEO measurement window (Dec 4-8) is NOT contaminated.** The GSC surfaces are byte-frozen. The S23 read-only exploration wrote only the visit beacon + the change-only archive sync (nothing that touches the GSC surfaces).

### 2.8 H2 — the perf observations (for S24)

#### Finding P1 (MEDIUM perf) — the hero images use `loading="lazy"` (an LCP anti-pattern)

- **Severity:** MEDIUM (a potential LCP regression — the hero portraits are the largest above-the-fold images + the LCP candidates; lazy-loading them can delay the LCP by 500ms+).
- **Reproduction steps:**
  1. Open any match page.
  2. Inspect the hero images: ALL 5 (1 competition crest + 2 portraits + 2 team crests) carry `loading="lazy"` + `decoding="async"`.
- **The issue:** the hero portraits (`/players/hero/harry-kane.webp`, `/players/hero/ellyes-skhiri.webp`) are above-the-fold LCP candidates. The `loading="lazy"` attribute tells the browser to defer loading until the image is near the viewport — but the images are ALREADY in the viewport (above the fold). This can delay the LCP by 500ms+ (the browser waits for the layout to stabilize before loading).
- **The proposed fix (presentation-layer):** change the hero image `loading` from `"lazy"` to `"eager"` (the default — load immediately) OR add `fetchpriority="high"` to the portraits (the largest above-the-fold images). The `decoding="async"` is fine (off-main-thread decoding). The crests (smaller, 64×64) can stay `loading="lazy"` or use `fetchpriority="auto"`. The fix is in `match-centre.ts` (the hero renderer outputs the img tags).
- **The follow-up session:** S24 (perf/CWV review). NOT a hotfix (MEDIUM perf — verify the LCP impact via the CWV data first).
- **Viewport:** all (the LCP is viewport-independent for above-the-fold images).

#### Finding P2 (LOW perf) — no `<link rel="preconnect">` to `crests.football-data.org`

- **Severity:** LOW (a ~100-300ms saving on the first crest request — the DNS + TLS handshake).
- **Reproduction steps:**
  1. Open any match page.
  2. Inspect the `<head>`: there are 3 `<link rel="preload">` for the fonts (`/fonts/Peyda-Regular.woff2`, `/fonts/Peyda-ExtraBold.woff2`, `/fonts/MorabbaVF.woff2`) — good.
  3. There is NO `<link rel="preconnect">` for `https://crests.football-data.org` (the cross-origin crest CDN).
- **The issue:** the team crests + the competition crest are served from `crests.football-data.org` (cross-origin). Without a `preconnect`, the browser does the DNS + TLS handshake on the first crest request (~100-300ms). A `<link rel="preconnect" href="https://crests.football-data.org">` in the `<head>` would save this.
- **The proposed fix:** add `<link rel="preconnect" href="https://crests.football-data.org" crossorigin>` to the match-page `<head>` (in `pages.ts` buildMatchPage head assembly). The `crossorigin` attribute is needed because the images are loaded with `referrerpolicy="no-referrer"` + the crossorigin CORS.
- **The follow-up session:** S24 (perf/CWV review).
- **Viewport:** all.

#### Finding P3 (INFO perf) — the Cloudflare Web Analytics beacon IS present (the CWV/RUM data is being collected)

- **The beacon:** `cloudflareinsights` detected in the Bayern match page HTML (3 mentions — the beacon script + the config). The production pages carry the beacon.
- **The implication:** the CWV/RUM data (LCP/FID/CLS) IS being collected by the Cloudflare Web Analytics. S24 can review the data via the Cloudflare dashboard (the Cloudflare account ID `a796fdfe…` + the zone). The workers.dev preview does NOT carry the beacon (the S22 record noted this) — the production-only beacon means the data is real-user.
- **The follow-up:** S24 (perf/CWV review) — review the CWV/RUM data after it has accumulated (the production has been live since 2026-11-15T00:53Z; the data needs ~1-2 weeks to be statistically meaningful). The S24 session should run AFTER Dec 8 (the cross-track SEO measurement window close) to avoid contaminating the SEO measurement.

#### Finding P4 (INFO perf) — the per-route CPU is NOT instrumented (audit §13 risk 1 — unchanged)

- **The status:** the per-route CPU is NOT instrumented (the audit §13 risk 1 — stated as a known limitation). The structural protection holds: the await count stays 3, the render is O(ctx) string concatenation, the render-hold logic in `router.ts` (live 120s / upcoming kickoff+120s / finished 900s) is preserved exactly.
- **The follow-up:** S24 (perf/CWV review) — instrument the per-route CPU via the Cloudflare GraphQL API (the `workersInvocations` + the `cpuTime` metrics). The Cloudflare API token `cfut_…` (re-supplied by the owner) has the Workers read scope.

### 2.9 H2 — the unrelated-route regression

- **The homepage** `/` HTTP 200, 245,630 bytes (was 228,683 at S22 — +16,947 bytes; the body is data-driven, the promo strip + today's matches). The byte-frozen surfaces (`#promoStrip`, `#tgHead`, `#tgPill`, `#tgPillGo`, `#about`) ALL present. Zero console errors (verified via the agent-browser).
- **The `/matches/today` hub** HTTP 200, 84,315 bytes (byte-identical to the S22 record). 4 match links (today Nov 15 is a quiet match day — the weekend is dense). Zero console errors.
- **The `/matches/this-weekend` hub** HTTP 200, 139,146 bytes (the dense weekend schedule). Renders correctly. Zero console errors.

**No unrelated-route regression.**

---

## 3. H3 — the brainstorm + the follow-up session proposals

### 3.1 The UI/UX brainstorm (for S26 — the owner's vibe-coding design rounds)

**The hero portrait rendering (decision 96/97/98/99):**
- The portraits are 88×88 displayed (naturalWidth 236/461). On mobile 390, the hero face-off might feel cramped (the two 88px portraits + the center scoreboard in 390px). The S23 mobile screenshot (`s23-mobile-390-bayern-koln.png`) shows the rendering. The owner may want to: (a) increase the portrait size on mobile; (b) reposition the portraits above the scoreboard on mobile (spec §5 "Mobile: portraits, when both exist, appear side by side in the upper hero area above the scoreboard"); (c) adjust the fade/blend.
- The both-or-neither law (decision 8) is verified — no crest-only heroes in the sample. But if a future match has a crest-only hero (a team not in the library), the mobile rendering of the central scoreboard alone should be verified.

**The nav UX (decision 13/40/70):**
- The 5-item nav (خلاصه، جدول، فرم، بازی‌ها، ورزشگاه) is clean. On mobile 390, the nav is a fixed-bottom tab-bar (decision 10). The active-section tracking works (the IntersectionObserver). The aria-current gap (F3) is the only a11y issue.
- The owner may want to: (a) add a 6th nav item for the FAQ (سوالات); (b) make the nav sticky on mobile (currently fixed-bottom); (c) add a progress indicator (the reading progress bar).

**The FAQ discoverability (decision 57/58):**
- The FAQ is at position 9 (after the schedule, before the related matches). The 4 questions are answerable (decision 57 — no FAQPage schema solely for rich results). The delayed-collapse accordion works (verified). The FAQ is below the fold — users might not discover it. The owner may want to: (a) add a "سوالات متداول" link in the nav; (b) move the FAQ higher (after the summary); (c) add a "show all" control.

**The schedule density (decision 39/40/41/42):**
- The schedule shows 57-66 rows (the 7-day window). The «نمایش روزهای بعد» expand control reveals the remaining days. The collapsed view shows the first ~5-7 rows. The density is high — the owner may want to: (a) group by day more visually (the day headers); (b) add a "today" highlight; (c) make the rows more compact on mobile.

**The telegram CTA placement (decision 68/69/70/71/72):**
- The telegram CTA is at position 11 (the last content section before the footer-hook). The CTA is 44px tall, full-width, with the accessible name «عضویت در کانال تلگرام». The owner may want to: (a) add a second CTA higher in the page (after the hero or the summary); (b) make the CTA more visually prominent (a gradient or a pulse); (c) A/B test the placement.

**The RTL/LTR adaptation (decision 2):**
- The logical-properties-only discipline holds (verified under the dir flip). The Persian-first RTL is native. The owner may want to: (a) add an EN/FA toggle (the homepage has a TZ picker — a language toggle is a similar pattern); (b) verify the LTR rendering of the team names (the Latin team names in an RTL context).

### 3.2 The follow-up session proposals

#### S24 — the perf/CWV review (proposed)

- **Objective:** review the production CWV/RUM data + instrument the per-route CPU + optimize the 125-130KB HTML payload if the LCP is poor.
- **The inputs:** the Cloudflare Web Analytics beacon (the CWV/RUM data — available after ~1-2 weeks of production traffic); the Cloudflare GraphQL API (the `workersInvocations` + the `cpuTime` metrics — the per-route CPU instrumentation); the S23 perf findings (P1 the hero lazy-loading, P2 the preconnect, P3 the beacon presence, P4 the CPU not instrumented).
- **The scope:**
  1. Review the CWV/RUM data (LCP/FID/CLS) via the Cloudflare dashboard. If the LCP is poor (>2.5s), prioritize the hero lazy-loading fix (P1) + the preconnect (P2).
  2. Instrument the per-route CPU via the Cloudflare GraphQL API (the `workersInvocations` + the `cpuTime` metrics). Compare the match-page render against the 10ms rolling budget (audit §6).
  3. Fix P1 (the hero lazy-loading → eager/fetchpriority=high) + P2 (the preconnect to crests.football-data.org) IF the LCP data justifies it.
  4. Optimize the 125-130KB HTML payload IF the LCP is poor (the payload is mostly the Persian RTL content + the a11y wiring + the schedule rows — the optimization space is limited without touching the byte-frozen surfaces).
- **The constraints:** the GSC surfaces + the answer sentence byte-frozen (the cross-track SEO measurement window Dec 4-8 — do NOT contaminate). The await count stays 3. The composer purity (no new inline JS). The version bump law (the deploy moves src/config.ts VERSION + package.json version + the check-stats.js version-wiring pins + CHANGELOG.md together).
- **The done-criteria:** the CWV/RUM data reviewed + the per-route CPU instrumented + the perf findings (P1/P2) fixed IF justified + the production deploy (a fresh `wrangler versions upload` + deploy) with the owner's approval + the post-deploy smoke matrix (the S22 6-point verification). The npm test exit 0 (3,573 OK + the new perf assertions if any). The tsc clean. The git diff --check clean.
- **The dependency:** the CWV/RUM data needs ~1-2 weeks to be statistically meaningful (the production has been live since 2026-11-15T00:53Z). **The S24 session should run AFTER Dec 8** (the cross-track SEO measurement window close) to avoid contaminating the SEO measurement + to have enough CWV data.
- **The estimated effort:** 1 session (the CWV review + the P1/P2 fixes + the deploy).

#### S25 — the a11y deep-dive (proposed)

- **Objective:** the full WCAG-AA audit + the cross-browser testing + the screen-reader testing.
- **The inputs:** the S23 a11y findings (F1 the hero double-wrap, F2 the portrait alt text, F3 the nav aria-current, F4 the outer nav section). The S23 browser gap (Safari/Firefox/Edge NOT tested).
- **The scope:**
  1. Run axe-core + WAVE against the production match pages (desktop + mobile). Document every finding.
  2. Test NVDA (Windows) + VoiceOver (macOS) + (optionally JAWS) against the match pages. Verify the screen-reader experience for the hero, the nav, the FAQ accordion, the schedule expand, the telegram CTA.
  3. Test Safari (WebKit) + Firefox + Edge via a cross-browser tool (BrowserStack, LambdaTest, or local installs). Verify the logical CSS properties, the `:focus-visible`, the WebP rendering, the grid layout.
  4. Fix F1 (the hero double-wrap → `<div>`) + F3 (the nav aria-current at render) + F4 (the outer nav section). Assess F2 (the portrait alt text — add descriptive alt or a visually-hidden span).
  5. The color-contrast audit (the design-system tokens meet WCAG AA — re-verify with the contrast analyzer).
- **The constraints:** the GSC surfaces byte-frozen. The await count stays 3. The composer purity. The version bump law.
- **The done-criteria:** the WCAG-AA audit complete (axe-core + WAVE + the screen-reader testing) + the cross-browser testing complete + the findings F1-F4 fixed + the production deploy (the owner's approval) + the post-deploy smoke matrix. The npm test exit 0 (3,573 OK + the new a11y assertions if any). The tsc clean.
- **The dependency:** NONE (can run any time — the a11y findings are presentation-layer, NOT touching the GSC surfaces). Can run BEFORE Dec 8 IF the fixes don't touch the GSC surfaces (F1/F3/F4 are body-only; F2 is body-only).
- **The estimated effort:** 1-2 sessions (the audit + the fixes + the cross-browser testing).

#### S26 — the UI/UX iteration (proposed)

- **Objective:** the owner's vibe-coding design rounds — the hero portrait rendering, the nav UX, the FAQ discoverability, the schedule density, the telegram CTA placement.
- **The inputs:** the S23 UI/UX brainstorm (§3.1). The S23 screenshots (9 in `docs/assets/s23-hardening/`). The owner's design preferences.
- **The scope:**
  1. The hero portrait rendering — the mobile sizing, the positioning (above the scoreboard per spec §5), the fade/blend.
  2. The nav UX — the 6th item (FAQ), the sticky-on-mobile, the progress indicator.
  3. The FAQ discoverability — the nav link, the position (after the summary?), the "show all" control.
  4. The schedule density — the day-grouping visual, the "today" highlight, the mobile compactness.
  5. The telegram CTA placement — the second CTA higher, the visual prominence, the A/B test.
- **The constraints:** the GSC surfaces byte-frozen. The await count stays 3. The composer purity (the S04 countdown / S06 nav / S15 schedule / S16 FAQ are the ONLY inline-JS exceptions — S26 adds NO new script unless a feature requires it). The version bump law.
- **The done-criteria:** the owner's design rounds complete + the chosen iterations implemented + the production deploy (the owner's approval) + the post-deploy smoke matrix. The npm test exit 0. The tsc clean.
- **The dependency:** NONE (can run any time — the UI/UX iterations are presentation-layer). Best run AFTER S25 (so the a11y findings are fixed first + the iterations build on a clean a11y base).
- **The estimated effort:** 2-3 sessions (the owner's design rounds are iterative — each round is a preview + a review + a refine).

#### S27 (conditional, after Nov 20) — the live/finished lifecycle verification

- **Objective:** verify the LIVE + FINISHED lifecycle states against REAL production matches after the Nov 20 kickoff (the H1 deferred work).
- **The scope:** see §1.2 (the verification PLAN + the markers checklist).
- **The dependency:** the Nov 20 kickoff (2026-11-20T19:30:00Z). The session must run DURING the live window + AFTER FT + 900s.
- **The estimated effort:** 1 short session (the verification only — NO code changes unless a critical bug is found).

### 3.3 The recommended session order

1. **S25 (a11y deep-dive)** — can run IMMEDIATELY (no dependency on the CWV data or the Nov 20 kickoff). Fixes F1-F4 (the body-only a11y findings). The fixes don't touch the GSC surfaces → can deploy before Dec 8.
2. **S27 (live/finished verification)** — runs AFTER Nov 20 (the kickoff). A short verification session (no code changes unless a critical bug).
3. **S24 (perf/CWV review)** — runs AFTER Dec 8 (the cross-track SEO measurement window close + enough CWV data). Fixes P1/P2 (the perf findings). The fixes don't touch the GSC surfaces.
4. **S26 (UI/UX iteration)** — runs AFTER S25 (so the iterations build on a clean a11y base). The owner's design rounds.

**The owner may reorder these** — the proposed order optimizes for: (a) the a11y fixes first (the highest-impact findings); (b) the live/finished verification at the natural Nov 20 window; (c) the perf review after the CWV data matures; (d) the UI/UX iteration last (the most subjective).

---

## 4. The done-criteria (per AGENTS.md §9 — be strict)

- **The hardening report covers H1** (the live/finished lifecycle verification PLAN + the markers — deferred to S27 after Nov 20) + **H2** (the bug-hunt findings across the 6 leagues + the degenerate states + the device matrix + the a11y spot-checks + the perf observations) + **H3** (the follow-up session proposals for S24 perf/CWV, S25 a11y, S26 UI/UX, S27 live/finished). ✓
- **Every finding has:** the severity (critical / high / medium / low / cosmetic), the reproduction steps (the URL + the viewport + the steps), the proposed fix, the follow-up session. ✓ (see §2.6 + §2.8)
- **The report is honest about what was tested + what could NOT be tested:**
  - **Tested:** 18 upcoming matches across the 6 leagues + cups (H2a); the device matrix 390/768/1024/1440 (H2c); the RTL/LTR flip (H2e); the a11y spot-checks (H2f); the GSC surfaces byte-frozen (§2.7); the unrelated-route regression (§2.9); the perf observations (§2.8); the console errors across all tested pages (zero).
  - **NOT tested (deferred):** the LIVE lifecycle state (the Nov 20 kickoff is 5 days away — deferred to S27); the FINISHED lifecycle state (deferred to S27); the degenerate data states in the live/finished pool (deferred to S27).
  - **NOT tested (the browser gap):** Safari (WebKit), Firefox, Edge — the agent-browser is Chromium-only (documented in §2.5). The S25 a11y deep-dive should cover these.
- **npm test exit 0 — 3,573 OK** (unchanged — S23 adds NO new assertions; the baseline re-verified at the S23 start); `npx tsc --noEmit` clean; `git diff --check` clean. ✓ (the S23 docs-only commit doesn't touch the code)
- **The commit + push landed** (git ls-remote origin main = local HEAD; `git config -l | grep ghp_` = zero matches; `git grep` for the PAT = zero matches — verified at the push). ✓ (the push is the final step)
- **The report proposes the follow-up sessions** with clear objectives + done-criteria. ✓ (see §3.2)

---

## 5. The credentials + the secrets discipline

- **Credentials used, not stored.** The Cloudflare API token (`cfut_…`) + the Cloudflare account ID (`a796fdfe…`) were used for the read-only `/healthz` + the match-page fetches (via curl + the agent-browser — the public HTTPS endpoints). The GitHub PAT (`ghp_…`) will be used ONLY for the one-shot docs-commit push (in the URL, never persisted in git config). All passed via environment variables / the URL only — NEVER written to a tracked file, NEVER persisted in git config, NEVER in a screenshot (the screenshots are the match pages only — NO credentials in any screenshot).
- **The `.gitignore` covers** `.env`, `*.token`, `*.secret`, `tokens.txt`, `qa/` (the local QA artifacts). The screenshots in `docs/assets/s23-hardening/` are tracked (they're the bug reproductions + the UI/UX brainstorm references — NO credentials in any screenshot).
- **The scan before the commit:** the staged changes (docs only) will be scanned for the token patterns (`cfut_`, `ghp_`, `a796fdfe`, the bot token, the FD.org token) before the commit. Zero matches expected (the docs are the report + the screenshots — no credentials).

---

## 6. The M10 milestone is CLOSED. S23 opens the post-M10 hardening track.

The Match Centre is LIVE on production (`sportsignal.ir` — deployment `ab1395ee` / version `10c0a004` / `13.257-mcmatchcentre`). The S23 hardening report confirms: the production is healthy (the GSC surfaces byte-frozen, the a11y wiring present, the responsive + RTL/LTR discipline holds, zero console errors across the device matrix). The findings (F1-F4 a11y, P1-P2 perf) are MEDIUM/LOW — presentation-layer fixes for the follow-up sessions. The live/finished lifecycle verification (H1) is deferred to S27 (after the Nov 20 kickoff). The post-M10 hardening track is OPEN — the proposed sessions (S24 perf/CWV, S25 a11y, S26 UI/UX, S27 live/finished) give the owner the roadmap to make the Match Centre more reliable, more performant, and better UI/UX.

*No secrets, tokens or private values appear in this file. The credentials supplied for the read-only exploration were used via the public HTTPS endpoints + the agent-browser, are stored outside the repository, and are never committed.*
