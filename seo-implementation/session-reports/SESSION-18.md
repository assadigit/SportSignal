# SEO Follow-up Track — Session 18 Report: the editorial body content on the detail pages (the P1-1 gap fix)

> Read AGENTS.md in the repo root first. This report follows the SESSION-15/16/17 pattern.

## 0. Session start reconciliation (the numbering adjustment)

The S18 owner prompt arrived with an assumed numbering (P1-7 BreadcrumbList +
P1-8 internal links). Task 18-0's own rule governs: the repo's audit file is the
truth. `docs/audits/2026-11-17-seo-gap-and-swot-audit.md` numbers the gaps
**P1-1 … P1-6 only** — there is no P1-7/P1-8. Both prompt-assumed items were
already shipped:

- **Visible breadcrumbs**: `M.breadcrumbsHtml` (`<nav aria-label="مسیر صفحه"><ol>/<li>` + `aria-current="page"`, P-17) live on every page class since the SEO sessions; the S16 investigation already corrected the audit's P1-3 ("no visible breadcrumb") as a verification error (5 of 18 audit gaps were verification errors; 6 with S17-3).
- **Internal linking**: the team-page related card (v13.85), the standings window (v13.87/93), the match-page related-matches block (Match Centre S17), hub grids, footer hooks — all live, and `check-seo-internallinks.js` gates them.

So S18 executed the repo's real next open item per the track spec §Session 18 +
`seo-implementation/next-session-prompt.md`: **P1-1 — the content depth on the
team + competition detail pages** (the highest-leverage CONTENT session: the
thin-content risk is the likely #1 reason 412 indexed URLs earn 250 clicks).
This is recorded as DECISIONS S18-4.

## 1. Baseline (verified before any edit)

Clone at the S17 checkpoint (`d7cadc7`). `npm install` + `npm test` exit 0
(3,773 OK) + `npx tsc --noEmit` clean + the S17 harness `s17-faq-smoke.ts`
26/26. Live: `/healthz` reported `version: 13.270.0-faq` (the S17 deployment
`62c3b14d…` @100%) — the page-level live check was (and stays) blocked by the
Nov 17 KV read-quota exhaustion (`ok:false`, `pool_matches:0`, the SEO detail
pages 404 — the documented chronic condition, NOT the S17 change; the S17
report §7 has the differential + the scheduled 00:20 UTC verification job).

## 2. S18-M1 — the editorial body card on the team page

New module `src/seo/editorial.ts` (the `faq-content.ts` S17 sibling discipline:
one file one responsibility — never pages.ts bloat). `buildTeamEditorialHtml`
composes «وضعیت فصل X» from ONLY the arguments buildTeamPage already holds
(stw/meRow/finished/upcoming — zero new awaits/KV/fetches):

- P1 (CONDITIONAL on the standings row): pos + points + played + W/D/L from the
  SAME snapshot row the window renders + the honest position bands (صدر/صدرنشین‌ها/بخش
  بالایی/انتهای جدول — no promotion/relegation claims; the pool carries no zone data).
- P2 (CONDITIONAL on the finished list): the team's OWN finished matches,
  newest-first, pairs + scores (flat `s.score` first — the pubMatch flatten;
  the raw `fullTime` nesting + the flat archive shape as fallbacks).
- P3 (CONDITIONAL on a next fixture): the queued count + the next pair + the
  distinct competitions (no restating of the answer sentence's time facts).
- ALWAYS: the h2 + the honest lead + the E-E-A-T source note (football-data.org,
  the footer srcline's Persian mirror, `.editorsrc`).
- MISSING-IS-NOT-ZERO: absent data omits the paragraph — never «نامعلوم»/«نامشخص».

Placement: BELOW the answer card + ABOVE the S17 faqcard (the content, then
the Q&A — the S18 brief's directive; the faqcard stays the LAST section).

## 3. S18-M2 — the editorial body card on the competition page

`buildCompetitionEditorialHtml` composes «تصویر کلی X»: the title-race read
(the leader + the second-place gap + the 2nd/3rd names from the SAME rows the
visible table renders) + the coverage note (the page's honest scope + the
recorded count). A cup with no standings table degrades to the coverage note
alone (no fabricated table). Placement: AFTER the standings block, BEFORE the
fixtures list.

## 4. The match page takes NO new prose (DECISIONS S18-3)

The Match Centre S08 narrative engine + the facts table + the S16/S17 FAQ
accordion already give the match page editorial depth; the audit's P1-1 named
the team/competition pages. No match-page bytes changed (the freeze surface
untouched).

## 5. The gate + the harness

- `check-seo-content-depth.js` — 15 gates (the module contract, the REAL
  builders via ts.transpileModule extraction with stubbed helpers, the
  placement order on both pages, the freeze-coordination, the
  original-content rule, the zero-runtime-cost law) — wired into the `npm
  test` chain (3,773 → 3,789 OK with the re-pinned LIVE version check).
- `scripts/s18-content-smoke.ts` — the seeded render harness (the s17
  pattern): **29/29**. Covers the full editorial card + the placement order +
  the S17 FAQ regression (the FAQPage node + the T-20 byte-identical faqcard
  under the new neighbor) + the byte-frozen title/H1 + the honest degradations
  (no standings / no finished / the cup no-table path).
- `scripts/s18-seed-local-kv.js` — the LOCAL-only wrangler-dev KV seeder
  (miniflare state; production was never touched).

## 6. The deploy + the live verification

- Version bump `13.270.0-faq` → `13.271.0-content` (the version triple +
  the `check-stats.js` LIVE pins + the CHANGELOG entry; the
  `check-seo-performance.js` band already accepts >= 13.268.0).
- Local wrangler-dev smoke (the seeded KV): `/healthz` reports
  `13.271.0-content`; `/teams/barcelona` + `/competitions/la-liga` render
  HTTP 200 with the editorial card in the pinned order + the FAQPage node +
  the byte-frozen title/H1 verified in the served HTML.
- Deployed via `npx wrangler versions upload` + `versions deploy --version-id
  0fad7482-3e36-43ea-a2d8-b78b1b6247a7 --percentage 100 --yes`
  (2026-11-17 ~13:05 UTC; outside the Nov 20 Bayern–Köln windows).
- **Live-verified (the deploy level):** `/healthz` reports
  `version: 13.271.0-content` — the new version IS serving production traffic
  at 100%.
- **The page-level live verification — BLOCKED by the KV read-quota
  exhaustion at deploy time, COMPLETED at the reset (2026-11-18 ~11:19
  UTC; the `seo(s17-verify)` commit).** The live evidence (the same pages
  the harness pins, against production after the UTC-midnight reset):
  `/teams/barcelona` HTTP 200 with the editorial card «وضعیت فصل بارسلونا»
  in the pinned order `answercard` < `editorialcard` < `faqcard`
  (byte offsets 76460 < 92954 < 93478 in the served HTML) + the S17
  FAQPage node + the byte-frozen title/H1 unchanged;
  `/competitions/la-liga` HTTP 200 with the editorial card «تصویر کلی
  لالیگا» in the pinned order answercard < standings (`stbox`) <
  editorialcard < the fixtures list («بازی‌های پیش‌رو») (82939 < 83175 <
  89937 < 90554) + the byte-frozen title «لالیگا — برنامه بازی‌های بزرگ
  پیش‌رو | اسپرت سیگنال»; the editorial body itself carries the title-race
  read with LIVE standings (صدر: بارسلونا ۳۳ امتیاز + the 3-point gap +
  رئال مادرید/اتلتیکو مادرید 2nd/3rd — the live table differs from the
  seed's, as expected: the pinned contract is the STRUCTURE, the data rides
  the same rows the visible table renders) + the coverage note + the
  football-data.org source note. **S18 status: deployed + version-verified
  live + page-verified live.**

## 7. Cloudflare budget

Zero new KV reads/writes, zero new subrequests, zero new Worker CPU, zero new
cron paths. The editorial is pure string composition on already-loaded data.
No client asset renamed (the SW cache stays `sportsignal-v126` + the client
bundle stays `public-13.80.js` — server-side only).

## 8. Decisions

- **S18-1** — the module home: a NEW `src/seo/editorial.ts` (never pages.ts
  bloat; the faq-content.ts S17 precedent).
- **S18-2** — the placement: BELOW the answer-sentence, ABOVE the faqcard /
  BEFORE the fixtures list (the content, then the Q&A).
- **S18-3** — the match page takes NO new prose (the S08 narrative + the
  facts table + the FAQ already cover it; P1-1 named the team/competition
  pages).
- **S18-4** — the numbering reconciliation (the prompt's P1-7/P1-8 do not
  exist in the repo's audit; both already shipped; S18 = the real P1-1).
Details in `docs/DECISIONS.md`.

## 9. Handoff

P1-1 is CLOSED for the team + competition pages (the two page classes the
audit named). The data-dependent gaps (P0-1/P0-2/P0-3/P1-5/P2-3) + the
post-Dec-8 freeze-lift decisions remain the owner's next phase, per the track
spec. Credentials used, not stored.
