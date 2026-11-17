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

## Session 17 — the image sitemap + the sitemap lastmod freshness

**The objective:** the machine-file enhancements that declare the images + the
freshness to Google without touching the HTML.

- **S17-M1 — the image sitemap (the P2-4 gap).** Add the `<image:image>` extension to
  the sitemap entries (the crest URL per team/competition/match page + the OG image URL
  per page). Declare the images to Google Image search. Freeze-safe (a machine-file
  extension — NOT a byte-frozen surface). The `<urlset>` gets the `image` namespace
  (`xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"`).
- **S17-M2 — the sitemap lastmod freshness for the upcoming matches (the P2-2 gap).**
  The upcoming matches' `lastmod` is stale (a match 3 days away has a 13-day-old
  lastmod). Refresh the `lastmod` on the pool tick when the data changes (the kickoff
  time, the venue, the status). The `check-seo-lastmod.js` gate already pins the
  lastmod discipline — extend it for the freshness re-touch. Freeze-safe (a sitemap
  field — NOT a byte-frozen surface).
- **New check gates:** `check-seo-image-sitemap.js` (the `<image:image>` extension on
  the sitemap entries; the image namespace) + the `check-seo-lastmod.js` extension (the
  freshness re-touch on the upcoming matches).
- **Version bump + deploy + verify live.**

## Session 18 — the FAQ + the content depth on the detail pages

**The objective:** the content + structured-data session that addresses the two biggest
content gaps (the P1-6 FAQ + the P1-1 content depth). This is the highest-leverage
CONTENT session.

- **S18-M1 — the FAQ structured data + the visible Q&A on the detail pages (the P1-6
  gap).** Add the `FAQPage` + `Question` + `Answer` structured data to the team +
  match pages (the "بازی بعدی X" / "بازی شروع چه ساعتی است" / "در چه ساعاتی پخش
  می‌شود" Q&A — NEVER a "where to watch" Q that implies a broadcast). The Q&A must be
  real (sourced from the fixture data) + Persian. The visible Q&A adds body content
  (which also addresses P1-1). Freeze-safe (an additive JSON-LD node + the visible
  Q&A BELOW the answer-sentence — NOT a byte-frozen surface).
- **S18-M2 — the editorial body content on the detail pages (the P1-1 gap).** Add a
  substantive editorial section to the team/competition/match pages BELOW the
  answer-sentence (the team's season narrative / form guide; the competition's
  structure / title race; the match preview / H2H history). Persian, original,
  E-E-A-T-grounded (cite the data source). This is the biggest single ranking lever
  available (the thin-content risk is likely the #1 reason the 412 indexed URLs earn
  only 250 clicks). Freeze-safe (additive body content BELOW the answer-sentence —
  NOT a byte-frozen surface). This session may be split across multiple pages.
- **New check gates:** `check-seo-faq.js` (the FAQPage on the detail pages; the real
  Q&A; the no-broadcast-claim rule) + `check-seo-content-depth.js` (the editorial body
  section; the minimum content depth per page class; the freeze-coordination — the body
  is BELOW the answer-sentence).
- **Version bump + deploy + verify live.**

## Session 19 — the lifecycle activation (the expired-matches noindex) — IF feasible

**The objective:** activate the S5 match-URL lifecycle mechanism for the PAST season's
expired matches (the P1-4 gap). The mechanism is shipped + test-proven but INERT.

- **S19-M1 — investigate the S5 mechanism + the FD `season.endDate` values.** The
  `SEASON_END_NOINDEX_ENABLED` flag is false + the `SEASON_END_DATES` map is empty.
  Determine whether the past season's expired matches (the 151 in the archive) can be
  noindexed NOW (the 2025-26 season is finished) without the FD `season.endDate` (use
  the match date — if the match date is in the past AND a configurable grace period has
  elapsed, noindex it). IF feasible: populate the config + set the flag + versioned
  deploy + verify live. IF NOT feasible (needs the FD data the owner must supply):
  defer to the next-session prompt.
- **New check gate:** `check-seo-lifecycle-active.js` (the expired matches are now
  noindex; the upcoming matches stay indexable).
- **Version bump + deploy + verify live.**

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
