# Session 13 — Structured-Data + GSC Enhancement Validation Evidence

> Agents: read AGENTS.md in the repo root first, and follow it for this whole task.

This folder holds the validation evidence for SEO Session 13 (the structured-
data errors + the GSC enhancement validation — the route plan §10, the phase
file `sportsignal-seo-implementation/phases/SESSION-13-STRUCTURED-DATA.md`).

## 1. The GSC Events enhancement report (the source of the 13 "Missing field location" Critical items)

Source: `docs/assets/gsc/sportsignal.ir-Events-2026-11-15.zip` (the GSC
"Events" enhancement report for `sportsignal.ir`, snapshot 2026-11-15).
The "Events" report is Google's enhancement report for the Event/SportsEvent
schema type. The schema type IS confirmed as **SportsEvent** (the live JSON-LD
on the click-earner `/matches/barcelona-vs-manchester-city-2026-12-08` emits
`@type: SportsEvent` — see §2 below).

### `sportsignal.ir-Events-Critical-issues-2026-11-15.csv`
```
Issue,Validation,Items
Missing field 'location',Not Started,13
```
The 13 "Missing field location" Critical items. These are the no-venue matches
(matches where NEITHER the deterministic home-ground table `src/grounds.ts`
NOR the FD v4 detail call `hydrateMatchVenue` returned a venue). The
`sportsEventNode` builder emits the `location` property ONLY when `m.venue` is
truthy — the `if (m.venue)` guard (`src/seo/jsonld.ts:149-154`). The
MISSING-IS-NOT-ZERO law holds (Session 7 verified; re-confirmed this session
live — see §2). The 13 items are Google's rich-result ELIGIBILITY warning (the
Events rich result recommends `location`), NOT a schema.org validation error.

### `sportsignal.ir-Events-Noncritical-issues-2026-11-15.csv`
```
Issue,Validation,Items
Missing field 'endDate',Not Started,31
Missing field 'offers',Not Started,31
Missing field 'performer',Not Started,31
Missing field 'address' (in 'location'),Not Started,18
```
Four non-critical issue types — ALL the honest "missing recommended field"
class (no source data for any of them):
- `endDate` (31) — the FD data does NOT carry the match end time; per the
  S-05 no-invented-data law, `endDate` is OMITTED (never fabricated as
  startDate + 105min). The `eventStatus` field already reflects
  scheduled/finished/postponed/cancelled.
- `offers` (31) — SportSignal does NOT sell tickets / carry ticket data; per
  the S-04 no-fake-offers law, `offers` is OMITTED. The existing
  `check-match-centre.js` S20 gate + the `seo-check.js` T-04 live-audit gate
  pin the ABSENCE of `offers`/`aggregateRating`.
- `performer` (31) — for a team sport, the teams are already in
  `homeTeam`/`awayTeam` (SportsTeam nodes); adding player names as `performer`
  is NOT part of the page's visible content contract + would be filler.
- `address` (in location) (18) — the matches WITH a venue name (the `location`
  node is a `StadiumOrArena` with `name`) but WITHOUT an address; the data
  source carries the venue NAME only, NOT the address; per the
  MISSING-IS-NOT-ZERO law, the address is OMITTED.

### `sportsignal.ir-Events-Chart-2026-11-15.csv`
The daily Invalid/Valid Events count (2026-10-15 onward). The Invalid count
rose from 1 (Oct 15) to 13-16 (Nov 6-14) as more match pages entered the
report. The Valid count rose from 3 (Oct 15) to 16-18 (Nov 9-14).

## 2. The live JSON-LD snapshots (representative match pages)

### `live-jsonld-with-venue-barcelona-vs-manchester-city-2026-12-08.json`
The click-earner match (39 clicks / 477 impr, pos 3.62 — GSC-AUDIT-BASELINE).
The @graph = Organization + WebSite + WebPage + SportsEvent + BreadcrumbList.
The SportsEvent node carries `location: { @type: StadiumOrArena, name: "Camp
Nou" }` (the home-ground table `src/grounds.ts` lights Barcelona's home
deterministically — zero subrequests). The `homeTeam.alternateName` =
`["بارسلونا", "بارسا"]` (the S11 SEO_EXTRA_ALIASES GSC-evidenced short form).
NO `endDate` / `offers` / `performer` / `aggregateRating` (the S-03/S-04/S-05
honesty laws).

### `live-jsonld-no-venue-lazio-vs-lecce-2026-11-21.json`
A no-venue match (Lazio vs Lecce — neither the home-ground table nor the FD
detail call returned a venue). The SportsEvent node correctly OMITS the
`location` property (the `if (m.venue)` guard) — the MISSING-IS-NOT-ZERO law
holds. Also OMITS `endDate` / `offers` / `performer` / `aggregateRating`. The
node is otherwise well-formed (startDate, eventStatus, homeTeam, awayTeam,
organizer, description, image, mainEntityOfPage).

Six live no-venue matches were sampled (all correctly omit `location`):
`/matches/lazio-vs-lecce-2026-11-21`, `/matches/parma-vs-roma-2026-11-21`,
`/matches/hull-city-vs-brighton-and-hove-albion-2026-11-22`,
`/matches/sv-07-elversberg-vs-freiburg-2026-11-21`,
`/matches/lille-osc-vs-olympique-lyonnais-2026-11-21`,
`/matches/borussia-monchengladbach-vs-borussia-dortmund-2026-11-21`.

## 3. The Schema Markup Validator screenshots (validator.schema.org — the authoritative schema.org validator)

### `smv-with-venue-barcelona-vs-mancity-2026-12-08.png`
The validator.schema.org result for the with-venue match. Result:
- WebPage: no errors, no warnings, 1 item
- BreadcrumbList: no errors, no warnings, 1 item
- SportsEvent: no errors, no warnings, 1 item

### `smv-no-venue-lazio-vs-lecce-2026-11-21.png`
The validator.schema.org result for the no-venue match. Result:
- WebPage: no errors, no warnings, 1 item
- BreadcrumbList: no errors, no warnings, 1 item
- SportsEvent: no errors, no warnings, 1 item

Both pages pass validator.schema.org with **zero errors, zero warnings**.
schema.org treats `location` / `address` / `endDate` / `offers` / `performer`
as RECOMMENDED (not required) for SportsEvent — so the validator does NOT flag
their absence. The GSC "Missing field" items are Google's RICH-RESULT
ELIGIBILITY warnings (the Events rich result recommends these fields), NOT
schema.org validation errors.

## 4. The Rich Results Test (NOT run — reCAPTCHA-blocked)

The Rich Results Test (https://search.google.com/test/rich-results) was
reCAPTCHA-blocked for automated browser access (expected — Google blocks
automated access). The GSC Events enhancement report IS the batch Rich Results
Test result (GSC runs Google's rich-result parser across all crawled pages),
so the GSC report (§1 above) IS the Rich Results Test evidence. The owner
should re-run the Rich Results Test manually (in a non-automated browser) on
the representative pages to capture the per-page rich-result eligibility view.

## 5. The decision

ALL the GSC Events enhancement report items (1 Critical + 4 non-critical types)
are the honest "missing recommended field" class — NONE is a real structured-
data error. The MISSING-IS-NOT-ZERO law holds. NO `location` / `address` /
`endDate` / `offers` / `performer` is added where no true value exists. Google
does NOT penalize recommended-field absence; fabricating any would be a spec
violation (MASTER-SEO-SPEC §6) + a data-integrity violation (the S-05 rule).
**NO code change. NO deploy.** Docs-only (the same discipline as Session 12
Option (b)). Details in `docs/DECISIONS.md` S13-1 / S13-2 / S13-3.
