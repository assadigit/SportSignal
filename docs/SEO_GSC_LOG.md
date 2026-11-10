# SEO / Search Console change log

> Agents: read AGENTS.md in the repo root first, and follow it for this whole task.

Every SEO-facing change to sportsignal.ir gets one row here: date, what
changed, which pages, and the baseline it started from. **No log entry means
it did not happen.** This is the measurement-discipline backbone of
`docs/specs/seo-growth-plan-v2.md` (its §5 rules: one change per group of
pages, 3–4 week waits, control groups, same-position comparisons).

Owner routine (plan §9): export Search Console (last 28 days) weekly, send
the zip to the agent; also export Indexing → Pages and Links monthly.

---

## Baseline (recorded 2026-11-10, from `docs/audits/2026-11-10-gsc-audit.md`)

Source export: `sportsignal_ir-Performance-on-Search-2026-11-10.zip`,
window 2026-10-10 → 2026-11-07. The site is ~4 weeks old; treat all numbers
as early signals.

| Metric | Value |
|---|---|
| Clicks / impressions / CTR (4 weeks) | 190 / 6,945 / 2.74% |
| Oct 10–31 (22 days) | 133 clicks, 3,986 impressions, 3.34% (≈6 clicks/day, 181 impressions/day) |
| Nov 1–7 (7 days) — **the KPI baseline** | 57 clicks, 2,959 impressions, 1.93%, avg position 9.5 (≈8.1 clicks/day, 423 impressions/day) |
| Share of visible impressions at positions 1–10 | 33.7% |
| Click rate at positions 8–10 | ≈0.9% (8 of 923) |
| Pages with ≥1 click | 55 of 315 |
| Match pages | 225 pages · 5,827 impressions (82%) · 165 clicks · 2.83% |
| Team pages | 73 pages · 833 impressions (12%) · 5 clicks · 0.60% |
| Hubs (today/tomorrow/this-weekend) | 3 pages · 123 impressions · 10 clicks · 8.1% |
| Homepage | 1 page · 203 impressions · 7 clicks · 3.45% |
| Competition pages | 5 pages · 35 impressions · 1 click · 2.9% |
| Country / device | Iran 91% · mobile 96.8% of impressions |
| Query spelling mismatches (F3) | «لایپزیگ» 337 impr · «نورشلان» 275 · «آ س رم» 210 |

KPI targets live in the plan §7 (3-month targets: 15 clicks/day, 800
impressions/day, 50% of visible impressions at positions 1–10, 120 pages
with a click).

## Known changes before this log existed (context only — from the audit F11)

| Date | Change | Pages |
|---|---|---|
| 2026-10-11 | Full SEO layer (SSR pages, canonicals, sitemap, SportsEvent markup) | all |
| 2026-11-04 | AI bots unblocked (robots.txt) | all |
| 2026-11-06 | v13.228-farsibrand: leading ⚽ + Farsi brand «اسپرت سیگنال» in match titles; one team-title shortening | match + team titles |

The Nov 6 title change gets its clean 4-week read on **about Dec 4** — that
export is the gate for the S2 title test (plan §8).

## Change log (append below — one row per change)

| Date | What changed | Pages affected | Baseline at change time |
|---|---|---|---|
| 2026-11-10 | **M2 — F3 spelling fix (v13.255-seospell).** SEO surface now uses the searcher spelling for three clubs: RB Leipzig «لایپزیگ» (alt «لایپزیش»), FC Nordsjælland «نورشلان» (alt «نوردشیلند»), AS Roma keeps «رم» + alt «آ س رم». Titles, H1, meta descriptions, answer sentences, scoreboard, JSON-LD alternateName (both spellings); the dictionary spelling shown once (match-page «نام‌های دیگر» facts row, team-page .altnote). List rows + bot/cards/digests unchanged. | Every match/team/hub/index page that names these clubs (currently: all RB Leipzig match pages + /teams/rb-leipzig, all AS Roma match pages + /teams/roma, the finished Monaco–Nordsjælland page; more as fixtures enter the windows). Non-affected pages byte-identical (verified by two-server diff). | The F3 baseline: Leipzig 337 impr, Nordsjælland 275, Roma 210 (4 weeks, Oct 10–Nov 7). Query examples: «روت‌وایس اسن مقابل آربی لایپزیگ» (142 impr, pos ~12), «موناکو مقابل نورشلان» (275, pos ~12.5), «منچستر یونایتد مقابل آ س رم» (210, pos ~11). Judge on/after ~Dec 8 (4-week wait, plan §5.2) — same-position comparisons only. |
| 2026-11-10 | **M3 — F7 internal-link coverage check (T-25) + broadcast/lineup investigation (report only).** Added the T-25 section to `scripts/seo-check.js`: every match in the next 14 days must have ≥3 internal links from the home/hub/team/competition/matches-list surfaces (the F7 invariant — orphaned upcoming fixtures do not climb). The check crawls the real link graph as Googlebot sees it (caches source pages, counts href occurrences of each match URL). **No rendering code changed** — the invariant already holds in production: verified live on 2026-11-10, 21/21 upcoming 14-day matches have ≥3 links (most have 4: /matches + both team pages + the competition page; the 3 UCL matches on Nov 24 have 5, also linked from the homepage). Broadcaster/lineup investigation → `docs/audits/2026-11-10-broadcast-lineup-data.md` (report only, no build). | `scripts/seo-check.js` (T-25 added; no src/ change, no worker deploy). The check is live-only (run `node scripts/seo-check.js`); it does not run in the offline `npm test` chain. | The F7 baseline: 184 of 225 match pages had under 20 impressions each (4 weeks, Oct 10–Nov 7); a few big pages got hundreds. The internal-link count is a coverage invariant, not a single-page metric — re-run T-25 before each deploy that touches the SEO rendering or the homepage/hub/team/competition listings. The broadcaster/lineup verdict (S3 "where to watch" closed — no Iran-audience source; lineups owner-decision) is recorded in DECISIONS. |
