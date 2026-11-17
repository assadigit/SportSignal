# SportSignal SEO Follow-up Track — Next-Session Prompt (Session 18: the content depth on the detail pages — the P1-1 gap, the biggest ranking lever)

Read AGENTS.md in the repo root first and follow it for the whole session.

You are the implementation agent for the SportSignal SEO follow-up track, Session 18: the editorial body content on the team + competition + match detail pages (the P1-1 gap from `docs/audits/2026-11-17-seo-gap-and-swot-audit.md` — the highest-leverage CONTENT session: the thin-content risk is the likely #1 reason the 412 indexed URLs earn only 250 clicks). The spec plan is `docs/specs/seo-followup-track.md` §Session 18. Session 17 (the FAQ structured data + the visible Q&A on the team + match pages) is DONE — deployed `13.270.0-faq` (deployment `62c3b14d-7dae-42e5-8d47-06d21d53176a` @100%), npm test 3,773 OK; the page-level live verification completes at the KV-quota reset (the scheduled 2026-11-18T00:20 UTC job — check its result in `seo-implementation/session-reports/SESSION-17.md` §7 + the HANDOFF before you start; if it failed, fix THAT first).

## The context (read in this order)

1. `AGENTS.md` (the repo root — the operating contract).
2. `docs/specs/seo-followup-track.md` (the multi-session spec — Session 18 = the content depth).
3. `docs/audits/2026-11-17-seo-gap-and-swot-audit.md` (the gap audit — P1-1 is the content-depth gap; note 6 of 18 audit gaps now carry corrections — see DECISIONS S16-3 + S17-3).
4. `seo-implementation/session-reports/SESSION-17.md` (the S17 report — the FAQ session; your session builds on its patterns: the faq-content.ts authoring discipline, the T-20 one-source contract, the freeze-coordination, the seeded harness).
5. `docs/HANDOFF.md` + `docs/DECISIONS.md` (the current state — S17 deployed).
6. The source: `src/seo/pages.ts` (the team/competition/match builders — where the editorial body goes), `src/seo/narrative.ts` (the Match Centre S08 deterministic narrative engine — the "why this match matters" precedent for data-sourced editorial), `src/seo/faq-content.ts` (the authored-content module — the S17 extension pattern), `src/seo/page-shell.ts`.

## The objective

Add substantive editorial body content BELOW the answer-sentence on the
team/competition/match detail pages: the team's season narrative / form guide;
the competition's structure / title race; the match preview / H2H history.
Persian, original (NO scraped/aggregated text — the original-content rule),
E-E-A-T-grounded (cite the data source: football-data.org). Freeze-safe
(additive body content BELOW the answer-sentence — NOT a byte-frozen
title/H1/description/answer-sentence byte; the Dec 4-8 freeze holds).

**The scope note (the spec's own words):** "This session may be split across
multiple pages (the team page first, then the competition, then the match)."
If the full three-page pass does not fit one session, do the TEAM page first
(the biggest query class), ship it verified, and hand the competition + match
pages to a Session 18b.

## The milestones

- **S18-M1 — the editorial body section on the team page.** A substantive
  Persian editorial section BELOW the answer-sentence (the team's season so
  far: the standings position narrative, the form, the upcoming run — sourced
  from the already-loaded data: `teamMatches`, `teamStandingsWindow`,
  `teamFormCardHtml`'s archive, `fullByCode`). Original prose composed from
  the real fields (the narrative.ts deterministic-template precedent — never
  scraped text, never invented facts). Coordinate the placement with the S17
  faqcard (the last section of main): the editorial body goes BEFORE the FAQ
  (the content, then the Q&A) — re-verify the S17 gates still pass after the
  reposition if you move the faqcard.
- **S18-M2 (if it fits the session) — the competition page + the match page.**
  The competition's structure / title race (from the standings + the code);
  the match preview (the H2H from the archive + the rivalry metadata the
  narrative engine already reads). Same laws.
- **New check gate:** `check-seo-content-depth.js` (the editorial body
  section; the minimum content depth per page class; the freeze-coordination
  — the body is BELOW the answer-sentence; the original-content rule — no
  scraped/aggregated text markers).
- **A seeded render harness** (the s17-faq-smoke.ts pattern) asserting the
  REAL rendered editorial content on the seeded pages.
- **Version bump:** 13.270.0-faq → 13.271.0-content (per the repo convention;
  update the version triple + the `check-stats.js` LIVE pins + the
  `check-seo-performance.js` band if needed — it now accepts >= 13.268.0).
- **Deploy + verify live:** `npm test` exit 0 → the harness → the local
  wrangler dev smoke → the versioned deploy → verify the live pages.

## The standing constraints (carry into the session)

- npm only; `npm test` exit 0 before every push; versioned deploys only; the
  Cloudflare free-tier budget (state your budget: the editorial content is
  string composition on already-loaded data → zero new KV-read/subrequest/CPU
  — anything that needs a new load MUST be argued in DECISIONS first); no new
  per-request fetches; no client polling.
- The freeze-safety rule: the byte-frozen surfaces are NOT touched. The body
  content is ADDITIVE (BELOW the answer-sentence).
- **The KV read-quota reality (NEW — from the S17 session):** the quota
  exhausts under peak traffic (Nov 17: crossed 100k by ~11:05 UTC). Schedule
  your LIVE verification accordingly — early UTC (before ~09:00) or after the
  UTC-midnight reset; if the live pages 404 with `/healthz ok:false` +
  `pool_matches:0`, that is the quota, NOT your change (verify with the
  differential: the previous deployment shows the same state; the analytics
  evidence pattern is in the SESSION-17 report §7).
- No deploys in the Nov 20 Bayern–Köln S27 auto-verify windows (M1 ~19:35
  UTC, M2 ~21:35-45 UTC — check the date first).
- The commit convention: `seo(s18): …`. The one-shot token push + the
  ls-remote verify. No secrets in the commits. Rotate the tokens if the owner
  supplies fresh ones (the S14-S17 tokens were used across four sessions).
- The original-content rule: the editorial prose is COMPOSED from the real
  data fields (deterministic templates over the loaded values — the
  narrative.ts precedent) — never scraped, never aggregated, never invented.
  The no-broadcast-claims law + the MISSING-IS-NOT-ZERO law hold.

## The deliverables

- The editorial body content (the page-builder changes + the authored content
  module — extend `narrative.ts` or a new `content-*.ts` module; one file one
  responsibility; do NOT bloat `pages.ts`).
- The `check-seo-content-depth.js` gate wired into the `npm test` chain.
- The seeded render harness (`scripts/s18-content-smoke.ts`).
- The version bump + the `check-stats.js` LIVE pin update.
- The SESSION-18 report + the HANDOFF/CHANGELOG/DECISIONS updates + the
  next-session prompt.
- The commit + the one-shot token push (ls-remote verified) + the versioned
  deploy + the live verification.

## After S18

The data-dependent gaps (P0-1 CWV, P0-2 before/after GSC, P0-3 CPU cliff,
P1-5 pagination, P2-3 allowlist) are the owner's next phase (need the fresh
GSC data + the Workers Paid plan + the post-Dec-8 freeze-lift) — see
`docs/specs/seo-followup-track.md` §"The data-dependent gaps". The audit doc
amendment (the 6 corrected gaps) remains a docs-only follow-up.

## Credentials

Credentials used across S14-S17, not stored. The owner should rotate the
GitHub + Cloudflare tokens before starting S18 (the S17 verification job also
uses the current ones — rotate after it completes).
