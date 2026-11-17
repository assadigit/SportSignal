# SportSignal SEO Program — PROJECT COMPLETE (the 15-session close-out handoff)

Read AGENTS.md in the repo root first and follow it for the whole session.

## Status: the 15-session SportSignal SEO implementation program is COMPLETE

Session 15 (the final regression + the production QA + the handoff) is DONE
(2026-11-17, docs-only — the regression is CLEAN; no deploy). The route plan
§10 sequencing (Sessions 1-15) is DONE. **There is no Session 16.** The
implementation work is complete; the residual work is owner-driven follow-ups.

This file is the "project complete" handoff (the phase file's deliverable:
"the last session handoff prompt (or explicit 'project complete' handoff if
no further session is needed)"). If the owner wants to pursue any of the
residual follow-ups below, a fresh session prompt would be written for that
specific follow-up (one of the options in §3).

## 1. What was delivered (the 15-session summary)

The full-program report is `seo-implementation/FINAL-SEO-IMPLEMENTATION-REPORT.md`.
The per-session chain:

| S | Outcome | Deploy / version | Test count |
|---:|---|---|---:|
| 1 | audit + docs | `c97ae70b` (`13.259.1`) | 3,615 |
| 2 | docs-only; 369-phrase map | none | 3,615 |
| 3 | docs-only; the architecture | none | 3,615 |
| 4 | the crawl/index foundation (C1/C6/C8) | `7d92e633` (`13.260.1`) | 3,628 |
| 5 | the match-URL lifecycle (INERT) | `1d70129b` (`13.261.0`) | 3,652 |
| 6 | the homepage window + carousel crawlability | `7df40334` (`13.262.0`) | 3,675 |
| 7 | the match-detail footer-hook team-link gating | `3e3a65e7` (`13.263.0`) | 3,676 |
| 8 | the team-page @graph WebPage node | `b313aada` (`13.264.0`) | 3,685 |
| 9 | the competition-page @graph CollectionPage node | `fc07b557` (`13.265.0`) | 3,694 |
| 10 | the /teams tile ordering (13 selected first) | `12793863` (`13.266.0`) | 3,704 |
| 11 | the Persian entity-naming/metadata polish | `21efcee2` (`13.267.0`) | 3,720 |
| 12 | docs-only; the EN decision — Option (b), FINAL | none | 3,720 |
| 13 | docs-only; the structured-data validation | none | 3,720 |
| 14 | the preconnect + the GSC monitoring view + the GA4 DEFER | `a4cc2982` (`13.268.0`) | 3,738 |
| 15 | docs-only; the final regression — CLEAN, no deploy | none (stays `a4cc2982`) | 3,738 |

**Live production:** `https://sportsignal.ir` — deployment
`a4cc2982-c6fa-493f-907b-e71d89c1f33f` @100% = `13.268.0-perf-preconnect`.

## 2. The final regression verdict (Session 15)

The regression is CLEAN. `npm test` exit 0 (3,738 OK; `npx tsc --noEmit`
clean). The live crawl of 19 HTML pages + 4 machine files: every page 200 +
the correct canonical/robots/title/H1/description/JSON-LD/preconnect + ZERO
hreflang. The MISSING-IS-NOT-ZERO law holds. The 13-club allowlist + the C1
disposition hold (4 non-selected slugs verified noindex,follow). The /teams
tile ordering holds. The no-fake-offers / no-invented-data law holds. The
Cloudflare budget is healthy (`ok:true` + `pool_matches:324` +
`kv_writes_day:403` + `subreq_last_tick:31`). The byte-frozen surfaces are
unchanged (git clean — the session runs before Dec 9, the Dec 4-8 freeze
HOLDS). No deploy (docs-only).

## 3. The owner's options (the residual follow-ups — owner-driven)

The program's implementation work is complete. These are owner-driven
follow-ups that need owner input/data. **If the owner wants to pursue any of
these, paste the matching option below into a fresh session with the
credentials — a new session prompt would be written for that specific
follow-up.** The full backlog is in
`seo-implementation/FINAL-SEO-IMPLEMENTATION-REPORT.md` §5.

### Option A — the post-Dec-8 freeze-lift decisions (needs the fresh 16-month GSC export)

After Dec 8, with a fresh 16-month GSC export, the owner may revisit the
byte-frozen surfaces: the S2 title-test re-fire; the S06-H3 date-hub
empty-state copy; the S1 spelling-fix judgement (judge ~Dec 8); the S11
SEO_EXTRA_ALIASES extension (new GSC-observed Persian variants); the S13-1
option (c) Events rich-result eligibility revisit (the curated stadium-lookup
— ONLY where a true venue value exists; NEVER fabricate). **The owner should
supply the fresh 16-month GSC export (with the URL-level page samples + the
queries×pages matrix + the enhancement/Critical-issues CSVs + the Core Web
Vitals report) — the program's top evidence request.**

### Option B — the CrUX / PageSpeed Insights data (needs a Google API key OR the owner-supplied data)

The owner should supply the CrUX / PageSpeed Insights data for
sportsignal.ir (the mobile LCP / INP / CLS per URL class — the S14
preconnect's post-deploy measurement) OR a Google API key for the CrUX API.
The structural analysis (the render path + the KV-read count + the CPU cliff)
is the current fallback.

### Option C — the Workers Paid plan ($5/mo) — the durable infrastructure fix

The owner should decide on the Workers Paid plan ($5/mo → 1M KV reads/day +
30s CPU limit). This is the durable fix for: the chronic KV read-quota
exhaustion (100,000/day free-plan — exceeded daily at S5-S9; healthy at
S10-S15 close); the chronic 10ms CPU cliff (the C7 audit — 4,832
exceededResources over Nov 16-17); AND the prerequisite for any future `/en/`
URL architecture (the S12-1 axis 2); AND the GA4 budget priority (the S14-3
decision).

### Option D — the S14 Cloudflare beacon extension to SEO pages (the GA4 alternative)

The homepage ships the Cloudflare Web Analytics cookieless beacon; the SEO
pages (`src/seo/page-shell.ts`) do NOT. A future session could extend the
beacon to the SEO pages (one-line `<script>` in the `pageShell` head —
cookieless, deferred via `type="module"`, freeze-safe) IF the owner wants the
per-page-class RUM WITHOUT the GA4 consent burden. This is the recommended
path per `docs/specs/GA4-EVALUATION.md` §6.

### Option E — the product/UX follow-ups (S26 + S10-2 + S25)

S26 (UI/UX iteration: hero rendering, nav UX, FAQ discoverability, schedule
density, telegram CTA — S06-H4 belongs here); S10-2 (the homepage →
team/competition spec §9 gap — the homepage does NOT link directly to
`/teams/<slug>` or `/competitions/<slug>`; a "link placement" change that
touches the shared homepage renderers with visual side-effects); S25 follow-up
smokes (NVDA/VoiceOver + Safari/Firefox/Edge live confirmations — owner
sessions needed).

### Option F — the season-end lifecycle first run (May 2027)

The S5 match-URL lifecycle mechanism is shipped + test-proven but INERT (the
`SEASON_END_NOINDEX_ENABLED` flag is false + the `SEASON_END_DATES` map is
empty). To enable: confirm FD `season.endDate` values → populate
`SEASON_END_DATES` → set `SEASON_END_NOINDEX_ENABLED = true` → versioned deploy
→ verify live. The first real transition is a May 2027 decision (after the
2026-27 season closes).

### Option G — the S12 EN re-litigation gate (FINAL — only if all three axes flip)

A future session that wants to build `/en/` URLs must re-litigate ALL THREE
evidence axes: (1) English-query demand in a fresh 16-month GSC export; (2) a
Workers Paid plan in place (the 2× KV-read demand); (3) a demonstrated
competitive angle against the English-native publishers. The keyword map §2
English plan slots stay as the documented Option (a) contingency.

## 4. The standing monitoring cadence (the GSC monitoring view)

The `seo-implementation/GSC-MONITORING-VIEW.md` defines the cadence: weekly
for the top 4 page classes (the homepage, the match-detail, the selected-team,
the competition); monthly for the full snapshot; post-Dec-8 for the
freeze-lift measurement. The standing health checks (every session / every
deploy) are in the FINAL-SEO-IMPLEMENTATION-REPORT.md §6.3.

## 5. Credentials

Credentials used across Sessions 14 + 15, not stored. **The owner should
rotate the GitHub + Cloudflare tokens** (they were shared across multiple
turns).
