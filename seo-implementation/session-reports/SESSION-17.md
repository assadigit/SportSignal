# SEO Follow-up Track Session 17 — The FAQ Structured Data + the Visible Q&A on the Detail Pages

> Agents: read AGENTS.md in the repo root first, and follow it for this whole task.

- **Date:** 2026-11-17
- **Version shipped:** `13.270.0-faq`.
- **Live before:** `13.269.0-entity-image` (Session 16, deployment `2481f840-b7da-4093-a4b7-db4c7888f90e` @100%).
- **Spec:** `docs/specs/seo-followup-track.md` §Session 17 (the P1-6 gap from
  `docs/audits/2026-11-17-seo-gap-and-swot-audit.md`).
- **Status:** Completed in code + deployed + version-verified live
  (`/healthz` reports `13.270.0-faq`). The page-level live verification
  (the FAQPage on the live pages) was blocked at deploy time by the KV
  read-quota exhaustion (the chronic account issue — NOT the S17 change; the
  differential proof in §7) and completes at the UTC-midnight quota reset via
  the scheduled verification job.

## 1. Objective and scope

The P1-6 gap fix: the `FAQPage` + `Question` + `Answer` structured data existed
ONLY on the date hubs — the team + match detail pages (the click-earner page
types that earn the «بازی بعدی X» queries) had none. S17 adds the FAQPage
node + the visible Q&A to BOTH detail pages — real (fixture-sourced), Persian,
NEVER a "where to watch" Q (the no-broadcast-claims law), freeze-safe
(additive — BELOW the answer-sentence; the byte-frozen
title/H1/description/answer-sentence bytes untouched — the git diff proves it:
the ONLY removed lines in `pages.ts` are the extended import + the extended
main-assembly tail; `faq-content.ts` has ZERO removed lines).

## 2. What S17 found before building (the audit P1-6 correction)

The gap audit's P1-6 said the detail pages have NO FAQ. The S17 investigation
found the **match page already HAS a visible FAQ** — the Match Centre S16
accordion (commit `c14c58a`, live since Nov 14: the kickoff / venue-conditional
/ competition / timezone Q&A). What it deliberately lacked was the `FAQPage`
JSON-LD node (the "S16-Schema: OMIT" decision — spec §12 "No FAQPage schema
solely to pursue Google FAQ rich results", Google having retired them in
August 2023). The **team page** had NO FAQ at all (neither visible nor
machine). So the real work: M1 = author the team Q&A + the visible section +
the node; M2 = wire the match-page node from the EXISTING authored source.
P1-6 stands (the FAQPage node was genuinely missing on both) — the correction
is recorded in DECISIONS S17-2.

## 3. S17-M1 — the team page (buildTeamPage)

- **The authored content** (`buildTeamFaqItems` in `src/seo/faq-content.ts` —
  the module's ownership extends from the match Q&A to the team Q&A):
  1. «بازی بعدی [team] کی است؟» — the next fixture (the date + the
     competition + the Tehran time). ALWAYS (the #1 GSC-observed query
     pattern; an empty window answers honestly «ثبت نشده است…» — the hub
     empty-state precedent).
  2. «بازی‌های [team] در کدام لیگ است؟» — the DISTINCT competitions the
     team's OWN upcoming fixtures name (league + cup both named honestly,
     joined with «و»). CONDITIONAL (omits on the empty window — the
     no-fabrication discipline).
  3. «ساعت بازی بعدی [team] به وقت تهران چند است؟» — the Tehran kickoff +
     the UTC pointer (TRUE — every match page carries «زمان جهانی»).
     CONDITIONAL on a next fixture.
- **The visible section**: `M.faqHtml(teamFaq)` — the hub faqcard pattern
  (`.card.prose.faqcard` + `.faqq`/`.faqa`), the LAST section of `main`
  (AFTER the schedule/standings/form/results/related cards — the match page's
  FAQ-after-related placement; zero new CSS). BELOW the answer-sentence (the
  freeze rule).
- **The FAQPage node**: `teamFaq.length ? JL.faqNode(teamFaq) : null` inside
  the @graph (after the optional ItemList, before the BreadcrumbList — the
  hub order). ONE source array feeds BOTH the visible section and the node —
  the **T-20 byte-identical contract** (harness-verified: the JSON-LD
  Question names === the visible `.faqq` h3 texts, byte-for-byte).
- Reads ONLY the already-loaded `teamMatches` list — zero new
  awaits/KV/fetches.

## 4. S17-M2 — the match page (buildMatchPage)

The match page's @graph now carries `faqHtml ? JL.faqNode(buildMatchFaqItems(sm)) : null`
(after the SportsEvent, before the BreadcrumbList). The node is fed from the
**SAME `buildMatchFaqItems(sm)` array that feeds the visible accordion**
(`matchFaqInput` → `matchFaqHtml`) — byte-identical q/a, one source
(harness-verified against the rendered accordion). This is the
**owner-authorized GEO emit path** the Match Centre S16-Schema omit decision
itself anticipated («the SAME authored content could feed a future FAQPage
node if the owner authorizes the GEO emit path»): the S17 spec IS that
authorization. NOT a SERP play — a GEO surface so AI answer engines quote the
EXACT visible Q&A with a citation. The three `check-match-centre.js` gates
that pinned the omit decision are re-pinned to the emit contract (see §5).

## 5. The check gates + the test suite

- **NEW `check-seo-faq.js` (15 gates)**: the reused byte-frozen `faqNode`
  helper; the `buildTeamFaqItems` export; the REAL behavior via the
  ts.transpileModule extraction (the 3 spec Qs, the fixture-facts answer, the
  multi-competition «و» join, the honest empty answer, the Q2/Q3 omission,
  the degenerate guard); the buildTeamPage wiring (the T-20 one-source
  contract); the freeze-coordination (the Q&A BELOW the answer-sentence + the
  byte-frozen title/H1/answer-lead unchanged); the buildMatchPage wiring (the
  GEO emit + the unchanged accordion); the no-broadcast-claim rule (scoped to
  the executable code — the module header QUOTES the law, which is not a
  claim); the MISSING-IS-NOT-ZERO venue law; the no-SportsEvent-on-team-page
  law. Wired into the `npm test` chain.
- **The re-pinned gates** (the supersession, each documented in-place):
  - `check-match-centre.js` (g): the no-FAQPage assertion → the emit
    assertion (`faqHtml ? JL.faqNode(buildMatchFaqItems(sm)) : null`).
  - `check-match-centre.js` S20 (a1): the 4-node @graph contract → the 5-node
    contract (+ faqNode; still NO itemListNode/collectionPageNode/datasetNode).
  - `check-match-centre.js` S20 (c1): the no-FAQPage type-uniqueness gate →
    the emit + still NO Article/BlogPosting/Event; the naive `indexOf("]")`
    extraction (which truncated inside the `/<[^>]+>/` regex) replaced with
    the S20(a1) bracket-depth match.
  - `check-match-centre.js` (a): the S16 import pin accepts the extended
    `buildTeamFaqItems` import.
  - `check-stats.js`: the v13.82 similar-matches pin accepts the extended
    main-assembly tail (`simCard +` — the strip still rides the page).
  - `check-seo-performance.js`: the S14 version-band regex extended
    (`26[89]|2[7-9][0-9]|[3-9][0-9]{2}`) — the S14/S16 form did not
    anticipate 13.270+ (a latent under-match that first bit at this bump; the
    invariant is unchanged: >= 13.268.0).
- **`npm test` exit 0 — 3,773 OK** (the S16 baseline 3,757 + 15 new FAQ
  gates + the re-pinned gates re-counted). `npx tsc --noEmit` clean.
- **The version triple** bumped together (`check-version-sync` green):
  `src/config.ts` `13.270.0-faq` + `package.json`/`package-lock.json`
  `13.270.0.0` + the `check-stats.js` LIVE pins (the v13.254-rankbadge
  VERSION + CHANGELOG-heading pin + the v13.258-mca11y wiring pin +
  the S17 comment block).

## 6. The verification (what I ran)

- `npm test` exit 0 (3,773 OK) + `npx tsc --noEmit` clean.
- **The seeded render harness** (`scripts/s17-faq-smoke.ts`, the s9/s10/s11
  pattern) — **26/26 assertions** against the REAL builders:
  `/teams/barcelona` (the 3-Q FAQPage + the exact Q1 «بازی بعدی بارسلونا کی
  است؟» + the visible faqcard BELOW the answercard + the T-20 byte-identical
  contract + no broadcast claims + the byte-frozen title/H1 + no SportsEvent);
  the with-venue match page (the 4-Q FAQPage + Camp Nou + the T-20 vs the
  accordion + the SportsEvent intact); the no-venue match page (3 Qs — the
  venue Q omits, MISSING-IS-NOT-ZERO); the empty team window (1 honest Q).
- The freeze-safety diff: `git diff` shows ZERO removed byte-frozen
  expressions (the two extended lines are the import + the main-assembly
  tail; `faq-content.ts` purely additive).
- The local wrangler-dev smoke: the worker boots; the homepage 200;
  `/healthz` 503 = the designed local-dev degraded state (NOT a 500/1101);
  the team page 404s locally only because the local KV has no pool (the REAL
  renders verified by the harness — the S16 smoke precedent).
- The versioned deploy + the live verification: §7 below.

## 7. The deploy + the live verification

- Deployed via `npx wrangler versions upload` + `npx wrangler versions deploy
  --version-id 62c3b14d-7dae-42e5-8d47-06d21d53176a --percentage 100 --yes`
  (versioned deploys only; outside the Nov 20 Bayern–Köln windows — the
  session ran Nov 17, ~12:10 UTC).
- **Live-verified (the deploy level):** the live `/healthz` reports
  `version: 13.270.0-faq` — the new version IS serving production traffic at
  100%.
- **The live page-level verification — BLOCKED at deploy time by the KV
  read-quota exhaustion, completion scheduled.** The account's KV namespace
  crossed the free-tier 100,000-reads/day limit at ~11:05 UTC on Nov 17 (the
  Workers KV analytics: 112,086 reads by 12:00 UTC; the 12:00 hour collapsed
  to 54 reads — denied). The S16 session's live verification (11:05 UTC)
  landed minutes BEFORE the exhaustion; the S17 deploy (12:10 UTC) landed
  after. From the exhaustion until the UTC-midnight reset, the KV-sourced
  routes degrade: `/healthz` reports `ok:false` + `pool_matches:0` + the KV
  fields -1/null, and the SEO detail pages 404 (the pool read fails → the
  empty ctx → notFound). **The differential proof this is NOT the S17
  change:** the PREVIOUS deployment (`2481f840…`, the S16 version that was
  live-verified healthy this morning) shows the IDENTICAL state right now
  (`ok:false`, `pool_matches:0`, `/teams/barcelona` 404) — the condition is
  the documented chronic quota issue (the S15 HANDOFF: "exceeded DAILY at
  Sessions 5-9; healthy at Sessions 10-15 close" — those closings all ran
  early UTC; today it exhausted by 11:05 UTC under peak traffic). The S17
  change touches zero KV wiring (pure string composition; the freeze-safety
  diff shows the two extended lines only).
- **The scheduled completion:** a one-shot verification job fires at
  2026-11-18T00:20 UTC (after the UTC-midnight quota reset + the 00:10 cron
  tick that repopulates the pool) to verify the live `/healthz` `ok:true` +
  the FAQPage on the live team page + a with-venue match page + the
  no-venue omission, then finalize §7 with the evidence + the
  `seo(s17-verify)` docs commit. The S17 status until then: **deployed +
  version-verified live; the page-level FAQ verification completes at the
  quota reset** (the code path itself is proven by the 26/26 seeded-harness
  assertions against the REAL builders + the 3,773-gate suite).

## 8. Cloudflare budget

Zero new KV reads/writes, zero new subrequests, zero new Worker CPU, zero new
cron paths. The FAQ is pure string composition on already-loaded data (the
team's `teamMatches` list + the match's already-loaded fields + the static
formatters). No client asset renamed (the SW cache stays `sportsignal-v126` +
the client bundle stays `public-13.80.js` — server-side only).

## 9. Decisions

- **S17-1 — the team-page FAQ content + placement** (the 3 spec Qs; the
  honest multi-competition answer; the honest empty answer; the faqcard as
  the LAST section of main — the match page's FAQ-after-related placement).
  Details in `docs/DECISIONS.md`.
- **S17-2 — the match-page FAQPage emit (the supersession of the Match
  Centre S16-Schema omit)** — the owner-authorized GEO emit path, fed from
  the SAME authored array as the visible accordion (the T-20 contract). The
  three pinned gates re-pinned. Details in `docs/DECISIONS.md`.
- **S17-3 — the P1-6 audit correction** (the match page HAD a visible FAQ
  since Nov 14; the gap was the FAQPage NODE — now on both detail pages).

## 10. What S17 did NOT do (out of scope)

- The competition-page FAQ (the S17 spec scopes M1/M2 to the team + match
  pages; the competition page may gain one in a future session — S18's
  content-depth session touches the same builder).
- The gap-audit doc amendment (the 5 corrected gaps) — a future docs-only
  pass (DECISIONS S16-3 notes it; unchanged).
- The `sportsignal-seo-implementation/IMPLEMENTATION-TRACKER.md` — the
  15-session program tracker stays CLOSED (the S16 precedent; the follow-up
  track records live in the spec + these session reports).
