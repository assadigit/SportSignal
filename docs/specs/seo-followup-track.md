# SEO Follow-up Track Spec — the data-independent, freeze-safe gap fixes (Sessions 16-19)

> Agents: read AGENTS.md in the repo root first, and follow it for this whole task.

- **Date:** 2026-11-17 (the day after the Session 15 final regression + the gap-and-SWOT audit).
- **Author:** the SEO implementation agent.
- **Scope:** a multi-session track that fixes the gaps from the
  `docs/audits/2026-11-17-seo-gap-and-swot-audit.md` that are (a) NOT blocked on the
  GSC / GA4 data (the site is fresh — the GSC needs a few months to accumulate; GA4 is
  unavailable) AND (b) NOT blocked on the Workers Paid plan (the owner has not yet
  decided) AND (c) freeze-safe (the Dec 4-8 freeze holds — the byte-frozen
  title/H1/description/answer-sentence bytes are NOT touched).
- **Out of scope (blocked, deferred to the post-data / post-Dec-8 / post-paid-plan
  sessions):** P0-1 (the CWV measurement — needs the CrUX key); P0-2 (the before/after
  GSC — needs the fresh export + a few months); P0-3 (the 10ms CPU cliff — needs the
  Workers Paid plan); P1-5 (the pagination decision — needs the fresh GSC); P2-3 (the
  non-selected-team allowlist re-eval — needs the fresh GSC + the paid plan); P3-2
  (the off-page SEO — owner-driven); P3-3 (the content-class expansion — needs the
  paid plan); the post-Dec-8 freeze-lift byte decisions (the S2 title-test, the S1
  spelling-fix judgement, the S11 SEO_EXTRA_ALIASES extension, the S13-1 Events
  rich-result revisit).
- **Correction from the gap audit:** the gap audit's P2-1 (the Cloudflare beacon is
  homepage-only) was WRONG — the beacon IS on every SEO page (the page-shell.ts
  includes the `beacon.min.js` with `send.to: /cdn-cgi/rum`; live-verified: 4 beacon
  references on the match/team pages). The per-page-class cookieless RUM is already
  in place. P2-1 is NOT a gap — removed from this track.

## The freeze-safety rule (carries into every session of this track)

The Dec 4-8 measurement freeze holds (the sessions run before Dec 9). The byte-frozen
surfaces — the homepage title/H1 (S6), the match-page title/H1/description/answer-
sentence (S7), the team-page title/H1/description/answer (S8), the competition-page
title/H1/description/answer (S9), the date-hub empty-state copy on `/matches/tomorrow`
(S06-H3), the team-name spellings in `fa-dict.ts` (the S1 M2 F3 fix — mid-measurement)
— are NOT touched. Every change in this track is ADDITIVE (a JSON-LD field, a visible
nav element, a machine-file extension, a router redirect, body content BELOW the
answer-sentence) or a freeze-safe metadata field. The freeze-coordination is pinned by
a check gate in every session.

## Session 16 — the entity-grounding parity + the visible breadcrumbs + the /teams.xml soft-404 fix

**The objective:** fix the three small, freeze-safe, high-signal technical gaps in one
batch.

- **S16-M1 — the match-page SportsTeam `sameAs` parity (the P1-2 gap).** The
  `sportsEventNode` builder (`src/seo/jsonld.ts`) emits the homeTeam + awayTeam
  SportsTeam nodes with `name` + `sport` + `url` + `alternateName` but NO `sameAs`.
  The `sportsTeamNode` builder (the team-page path) enriches the same SportsTeam with
  `sameAs` (Wikipedia + Wikidata). Add the `sameAs` to the homeTeam/awayTeam nodes in
  `sportsEventNode`, sourced from the SAME verified links lookup that `sportsTeamNode`
  uses. The match page is the click-earner page type — the entity grounding should be
  consistent. Freeze-safe (a JSON-LD field — NOT a byte-frozen surface).
- **S16-M2 — the visible breadcrumb nav on the detail pages (the P1-3 gap).** Every
  detail page ships a `BreadcrumbList` JSON-LD node but NO visible breadcrumb nav. Add
  a visible `<nav aria-label="breadcrumb">` to the match/team/competition pages,
  mirroring the JSON-LD trail (homepage → hub → competition/team → match). The visible
  breadcrumb enables the breadcrumb rich-result (which requires visible markup) + the
  user wayfinding + the visible-internal-link graph. Freeze-safe (an additive nav
  element — NOT a byte-frozen surface; the anchor wording is additive, diff-verified).
- **S16-M3 — the `/teams.xml` soft-404 redirect (the P3-1 gap).** The URL
  `/teams.xml` (without the `/sitemaps/` prefix) returns 200 with an HTML page (a soft
  404). Add a 301 redirect from the non-`/sitemaps/` `.xml` requests to the correct
  `/sitemaps/<name>.xml` (or a 404 if no match). Freeze-safe (a router redirect — NOT
  a byte-frozen surface).
- **New check gates:** `check-seo-entity-parity.js` (the match-page SportsTeam `sameAs`
  = the team-page SportsTeam `sameAs`; the parity across the page types) +
  `check-seo-breadcrumbs.js` (the visible `<nav aria-label="breadcrumb">` on the detail
  pages; the trail mirrors the JSON-LD BreadcrumbList; the freeze-coordination).
- **Version bump:** 13.268.0 → 13.269.0-... (per the repo convention).
- **Deploy + verify live.**

## Session 17 — the FAQ on the detail pages (the P1-6 gap)

**The objective:** add the `FAQPage` structured data + the visible Q&A to the
team + match detail pages. **The S17 investigation (post-S16) corrected two
more audit gaps** — see the corrections below — so S17 is now the FAQ session
(the image sitemap moved to S16; the lastmod + the lifecycle are NOT gaps).

- **The S17 investigation corrections (2 more audit gaps were verification
  errors):**
  - **P2-2 (the sitemap lastmod freshness) — NOT a gap.** The `matchHash`
    (`src/seo/files.ts`) captures `utcDate, status, venue, round, team names,
    competition.code, score` — the lastmod updates when ANY of these change
    (the F-04/F-05 lastmod-honesty rule). A stale lastmod on an unchanged
    match is HONEST by design (the audit misread it as a freshness bug).
  - **P1-4 (the expired-matches lifecycle) — NOT a gap to fix NOW.** The
    archive matches are ALL from the CURRENT 2026-27 season (Oct 8 – Nov 15,
    2026), which ends ~May 2027. The `isSeasonEndedOrdinary` check requires
    `now > SEASON_END_DATES[code]` (the season must close). Activating now
    with past dates would over-noindex the recent 2026-27 results; with future
    dates would noindex nothing. The mechanism is correctly INERT until May
    2027 (the designed post-season cleanup). The audit's P1-4 was a
    misunderstanding of the S5 mechanism's purpose.
  - **Running total: 5 of 18 audit gaps were verification errors** (P1-3
    breadcrumb, P2-1 beacon, P3-1 /teams.xml, P1-4 lifecycle, P2-2 lastmod).
    The audit's verification methodology was insufficient for a Persian site
    (English greps) + didn't check the HTTP status / the designed behavior.

- **S17-M1 — the FAQPage structured data + the visible Q&A on the team page.**
  Add the `FAQPage` + `Question` + `Answer` JSON-LD node + a visible Q&A
  section BELOW the answer-sentence. The Q&A is real (sourced from the team's
  fixture data): "بازی بعدی بارسلونا کی است؟" (the next fixture), "بازی‌های
  بارسلونا در کدام لیگ است؟" (the competition), "ساعت بازی به وقت تهران؟"
  (the kickoff time). NEVER a "where to watch" Q (the no-broadcast-claims law).
  Freeze-safe (an additive JSON-LD node + the visible Q&A BELOW the
  answer-sentence — NOT a byte-frozen surface).

- **S17-M2 — the FAQPage structured data + the visible Q&A on the match page.**
  The same for the match page: "بازی X – Y چه ساعتی شروع می‌شود؟" (the kickoff),
  "این بازی در کدام ورزشگاه است؟" (the venue, if present), "این بازی در کدام
  لیگ است؟" (the competition). Real + Persian + data-sourced.

- **New check gate:** `check-seo-faq.js` (the FAQPage on the detail pages; the
  real Q&A; the no-broadcast-claim rule; the freeze-coordination — the Q&A is
  BELOW the answer-sentence).

- **Version bump + deploy + verify live.**

## Session 18 — the content depth on the detail pages (the P1-1 gap — the biggest ranking lever)

**STATUS (2026-11-17, S18): DONE in code + deployed (13.271.0-content, deployment 0fad7482 @100%) + version-verified live; the page-level live verification rides the S17 00:20 UTC job after the KV-quota reset — see seo-implementation/session-reports/SESSION-18.md.**

**The objective:** add substantive editorial body content to the team/competition/match
detail pages. This is the highest-leverage CONTENT session (the thin-content risk is
likely the #1 reason the 412 indexed URLs earn only 250 clicks).

- **S18-M1 — the editorial body content on the team/competition/match pages.** Add a
  substantive editorial section BELOW the answer-sentence (the team's season narrative
  / form guide; the competition's structure / title race; the match preview / H2H
  history). Persian, original, E-E-A-T-grounded (cite the data source). Freeze-safe
  (additive body content BELOW the answer-sentence — NOT a byte-frozen surface). This
  session may be split across multiple pages (the team page first, then the
  competition, then the match).
- **New check gate:** `check-seo-content-depth.js` (the editorial body section; the
  minimum content depth per page class; the freeze-coordination — the body is BELOW
  the answer-sentence; the original-content rule — no scraped/aggregated text).
- **Version bump + deploy + verify live.**

## The data-dependent gaps (deferred — NOT in this track)

The following gaps are BLOCKED on the GSC/GA4 data (the site is fresh — GSC needs a
few months; GA4 unavailable) OR the Workers Paid plan OR the post-Dec-8 freeze-lift.
They are NOT in this track — they are the owner's next phase:

- **P0-1 (the CWV measurement)** — needs the CrUX / PageSpeed Insights data OR a
  Google API key (the owner supplies).
- **P0-2 (the before/after GSC)** — needs the fresh 16-month GSC export (a few months
  of data accumulation first).
- **P0-3 (the 10ms CPU cliff)** — needs the Workers Paid plan ($5/mo — the owner
  decision).
- **P1-5 (the pagination decision)** — needs the fresh GSC data for the `?page=N`
  URLs.
- **P2-3 (the non-selected-team allowlist re-eval)** — needs the fresh GSC data + the
  Workers Paid plan.
- **P3-2 (the off-page SEO)** — owner-driven (the Telegram channel + the digital PR).
- **P3-3 (the content-class expansion — player/standings/H2H pages)** — needs the
  Workers Paid plan.
- **The post-Dec-8 freeze-lift byte decisions** (the S2 title-test, the S1
  spelling-fix judgement, the S11 SEO_EXTRA_ALIASES extension, the S13-1 Events
  rich-result revisit) — need the fresh GSC data + the freeze to lift (Dec 9+).

## The standing constraints (carry into every session)

- npm only (never `bun install`); `npm test` exit 0 before every push; versioned
  deploys only; the Cloudflare free-tier budget (KV writes ≤ 1,000/day; ~50
  subrequests/tick; the 10ms CPU cliff — every change states its budget); no new
  per-request fetches; no client polling; no unbounded cron.
- The freeze-safety rule (above) — the byte-frozen surfaces are NOT touched.
- No deploys in the Nov 20 Bayern–Köln S27 auto-verify windows (M1 ~19:35 UTC, M2
  ~21:35-45 UTC — check the date before the deploy).
- The commit-message convention: `seo(s16): …`, `seo(s17): …`, etc. The one-shot token
  push; the ls-remote verify. No secrets in the commits.

## The acceptance criteria

Every session: (a) `npm test` exit 0 (the new check gates wired into the chain); (b)
the local wrangler-dev smoke; (c) the versioned deploy; (d) the live verification (the
changed contract confirmed on the live site); (e) the HANDOFF/CHANGELOG/DECISIONS/
tracker updates; (f) the commit + the one-shot token push (ls-remote verified).
