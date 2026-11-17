# SEO Program Session 13 — Structured Data + GSC Enhancement Validation

> Agents: read AGENTS.md in the repo root first, and follow it for this whole task.

- **Date:** 2026-11-17
- **Version shipped:** none (docs-only session — no runtime change, no version bump, no deploy). The live deployment stays at `13.267.0-persian-entities` (deployment `21efcee2-269a-4ad1-819c-b6027822607a` @100% — the Session 11 deploy).
- **Live before:** `13.267.0-persian-entities` (Session 11, deployment `21efcee2-269a-4ad1-819c-b6027822607a` @100% — UNCHANGED by the docs-only S12 session).
- **Status:** Completed (docs-only). The 13 "Missing field location" GSC Critical items + the 4 non-critical issue types are ALL the honest "missing recommended field" class — the schema type IS SportsEvent (confirmed from the GSC Events enhancement report); the MISSING-IS-NOT-ZERO law holds; NO code change, NO deploy.

## 1. Objective and scope

The structured-data errors + the GSC enhancement validation session of the
15-session SEO program (the route plan §10 — the phase file
`sportsignal-seo-implementation/phases/SESSION-13-STRUCTURED-DATA.md`). The
phase file's required work: (1) inspect the exact GSC enhancement report
behind the 13 "Missing field location" items; (2) identify the schema type +
the affected URLs (do not assume Event until confirmed); (3) inspect the
current JSON-LD + the visible content; (4) add only properties supported by
accurate source data — never invent stadium/venue/address; (5) use the correct
types for SportsEvent/Event — do not promise a rich result; (6) validate
representative pages with the Rich Results Test + the Schema Markup Validator
+ save the evidence.

The Dec 4-8 measurement freeze applies to the GSC-measured surfaces (all
title/H1 bytes + the team-name spellings + the date-hub empty-state copy on
`/matches/tomorrow`). Session 13's structured-data work is spelling-freeze-
aware: structured-data JSON-LD is machine-readable (NOT in the SERP snippet,
NOT a GSC-measured title/H1 byte) — safe under the freeze IF it does not touch
the byte-frozen title/H1/description/answer-sentence bytes (the same discipline
as the S11 og:type=article + SEO_EXTRA_ALIASES freeze-safe changes). Adding a
`location` property to a SportsEvent node where a true venue value exists is a
JSON-LD addition (machine-readable) — freeze-safe; NEVER invent a
stadium/venue/address (the MISSING-IS-NOT-ZERO law — Session 7 verified).

## 2. The inspection — the GSC Events enhancement report (the 13 "Missing field location" Critical items + 4 non-critical issue types)

The GSC "Events" enhancement report was inspected directly this session
(`docs/assets/gsc/sportsignal.ir-Events-2026-11-15.zip` → `Critical issues.csv`
+ `Non-critical issues.csv` + `Chart.csv` — copied to
`docs/assets/gsc/s13/`). The "Events" report is Google's enhancement report
for the Event/SportsEvent schema type. The schema type IS confirmed as
**SportsEvent** — the GSC "Events" report groups Event/SportsEvent, and the
live JSON-LD on the click-earner `/matches/barcelona-vs-manchester-city-2026-12-08`
emits `@type: SportsEvent` (verified — §3 below). The report shows ONE Critical
issue type + FOUR non-critical issue types:

| Issue | Severity | Items | The honest reason |
|---|---|---:|---|
| `Missing field 'location'` | Critical | 13 | the no-venue matches — NEITHER the home-ground table `src/grounds.ts` NOR the FD v4 detail call `hydrateMatchVenue` returned a venue; the `if (m.venue)` guard omits `location` (the MISSING-IS-NOT-ZERO law) |
| `Missing field 'address' (in 'location')` | Non-critical | 18 | the matches WITH a venue name (`StadiumOrArena.name`) but WITHOUT an address; the data source carries the venue NAME only, NOT the address |
| `Missing field 'endDate'` | Non-critical | 31 | the FD data does NOT carry the match end time; per the S-05 no-invented-data law, `endDate` is OMITTED (never fabricated) |
| `Missing field 'offers'` | Non-critical | 31 | SportSignal does NOT sell tickets / carry ticket data; per the S-04 no-fake-offers law, `offers` is OMITTED |
| `Missing field 'performer'` | Non-critical | 31 | for a team sport, the teams are already in `homeTeam`/`awayTeam`; adding player names as `performer` is NOT part of the page's content contract + would be filler |

ALL FIVE issue types are the honest "missing recommended field" class — NONE
is a real structured-data error. The 13 "Missing field location" Critical
items are Google's rich-result ELIGIBILITY warning (the Events rich result
recommends `location`), NOT a schema.org validation error. Google does NOT
penalize recommended-field absence. The Schema Markup Validator
(validator.schema.org — the authoritative schema.org validator) confirms BOTH
the with-venue match AND the no-venue match are schema.org-VALID — "no errors,
no warnings" on WebPage + BreadcrumbList + SportsEvent (§4 below): schema.org
treats `location`/`address`/`endDate`/`offers`/`performer` as RECOMMENDED, not
required — so the validator does not flag their absence.

Session 7's audit (S07-H3) verified the 13 items are the no-venue matches. This
session RE-CONFIRMED the schema type (SportsEvent — from the GSC Events report
filename + the live JSON-LD) + RE-VERIFIED the MISSING-IS-NOT-ZERO law holds
(the `if (m.venue)` guard in `jsonld.ts:149-154` + the fail-closed
`hydrateMatchVenue` in `data.ts:506-567` + the live no-venue matches — §3). The
inspection ALSO surfaced the 4 non-critical issue types (endDate/offers/
performer/address) — ALL the same honest "missing recommended field" class (no
source data for any of them).

## 3. The JSON-LD + the visible content inspected (the MISSING-IS-NOT-ZERO law re-verified)

### 3.1 The `sportsEventNode` builder (`src/seo/jsonld.ts:110-165`)
The SportsEvent node carries: `@type: SportsEvent`, `@id` (the match URL +
`#event`), `name`, `url`, `sport: "Football"`, `startDate` (the
`isoWithTehranOffset` — Tehran +03:30), `eventStatus`, `eventAttendanceMode`,
`homeTeam` + `awayTeam` (SportsTeam refs with `alternateName` arrays via
`seoTeamAltNames`), `organizer` (a SportsOrganization with the competition's
canonical URL + `sameAs` entity links), `mainEntityOfPage`, `image` (the
per-match OG PNG + the site default), `description` (the answer sentence). The
`location` property is emitted ONLY when `m.venue` is truthy:

```js
if (m.venue) {
  ev.location = { "@type": "StadiumOrArena", name: m.venue };
}
```
(the `if (m.venue)` guard, `jsonld.ts:149-154` — the MISSING-IS-NOT-ZERO law).
NO `endDate` / `offers` / `performer` / `aggregateRating` / `review` (the
S-03/S-04/S-05 honesty laws). The SportsEvent type is correct (NOT Event —
SportsEvent is the more-specific schema.org type).

### 3.2 The venue hydration (`src/seo/data.ts:506-567` — `hydrateMatchVenue`)
Fail-closed. Tries the deterministic home-ground table first (`src/grounds.ts`
— zero subrequests; lights the selected clubs' home stadiums), then the FD v4
detail call (`/v4/matches/{id}` — KV-cached 24h, 5s race guard, one attempt).
On any failure, leaves the match as-is (no venue — fail-closed; transient
failure ≠ "no venue" — no negative cache). The archive rows skip the
home-ground table (the `archived: true` flag — a neutral final could otherwise
hydrate a WRONG stadium). Numeric-FD-id gate (tsd-/spsc- rows skip straight
out — no detail endpoint).

### 3.3 The live JSON-LD verification
- **With-venue match** (`/matches/barcelona-vs-manchester-city-2026-12-08` —
  39 clicks / 477 impr, pos 3.62): the SportsEvent node carries
  `location: { @type: StadiumOrArena, name: "Camp Nou" }` (the home-ground
  table). `homeTeam.alternateName = ["بارسلونا", "بارسا"]` (the S11
  SEO_EXTRA_ALIASES GSC-evidenced short form). NO endDate/offers/performer.
  Saved: `docs/assets/gsc/s13/live-jsonld-with-venue-barcelona-vs-mancity-2026-12-08.json`.
- **No-venue matches** (6 sampled: `/matches/lazio-vs-lecce-2026-11-21`,
  `/matches/parma-vs-roma-2026-11-21`,
  `/matches/hull-city-vs-brighton-and-hove-albion-2026-11-22`,
  `/matches/sv-07-elversberg-vs-freiburg-2026-11-21`,
  `/matches/lille-osc-vs-olympique-lyonnais-2026-11-21`,
  `/matches/borussia-monchengladbach-vs-borussia-dortmund-2026-11-21`): ALL
  correctly OMIT the `location` property (the `if (m.venue)` guard) — the
  MISSING-IS-NOT-ZERO law holds in production. One saved:
  `docs/assets/gsc/s13/live-jsonld-no-venue-lazio-vs-lecce-2026-11-21.json`.

### 3.4 The existing gate coverage (NO new gate needed)
The existing `check-match-centre.js` S20 SportsEvent-facts gate (lines
4037-4038) ALREADY pins: `if (m.venue)` guard present + `ev.location =` present
+ `ev.description = why` present + `startDate: isoWithTehranOffset` +
`homeTeam: teamRef` + `awayTeam: teamRef` + `organizer:` + NO
`endDate:`/`offers:`/`aggregateRating:`/`review:` — the comment explicitly
states "the venue omits when absent — the MISSING-IS-NOT-ZERO law". The
`seo-check.js` T-04 live-audit gate checks the match page's @graph has a
SportsEvent node + all required fields + NO offers/aggregateRating. The
`check-match-centre.js` S16-Schema gate (lines 4089-4102) pins that SportsEvent
is the ONLY event-type node (no Event/Article/BlogPosting). The contract is
already covered comprehensively — adding a new `check-seo-structured-data.js`
gate would be redundant + a code change the docs-only discipline forbids.

## 4. The validation (the Schema Markup Validator)

The Schema Markup Validator (https://validator.schema.org/ — the authoritative
schema.org validator) was run via agent-browser on TWO representative match
pages:

| Page | WebPage | BreadcrumbList | SportsEvent |
|---|---|---|---|
| `/matches/barcelona-vs-manchester-city-2026-12-08` (with venue — Camp Nou) | no errors, no warnings | no errors, no warnings | no errors, no warnings |
| `/matches/lazio-vs-lecce-2026-11-21` (no venue) | no errors, no warnings | no errors, no warnings | no errors, no warnings |

Both pages pass validator.schema.org with **zero errors, zero warnings**.
Screenshots saved: `docs/assets/gsc/s13/smv-with-venue-barcelona-vs-mancity-2026-12-08.png`
+ `docs/assets/gsc/s13/smv-no-venue-lazio-vs-lecce-2026-11-21.png`. schema.org
treats `location`/`address`/`endDate`/`offers`/`performer` as RECOMMENDED (not
required) for SportsEvent — so the validator does NOT flag their absence.

The Rich Results Test (https://search.google.com/test/rich-results) was
reCAPTCHA-blocked for automated browser access (expected — Google blocks
automated access). The GSC Events enhancement report IS the batch Rich Results
Test result (GSC runs Google's rich-result parser across all crawled pages),
so the GSC report (§2) IS the Rich Results Test evidence. The owner should
re-run the Rich Results Test manually (in a non-automated browser) on the
representative pages to capture the per-page rich-result eligibility view.

## 5. The decision — docs-only (NO code change, NO deploy)

**NO real structured-data errors.** ALL the GSC Events enhancement report
items (1 Critical + 4 non-critical types) are the honest "missing recommended
field" class. The MISSING-IS-NOT-ZERO law holds. NO
`location`/`address`/`endDate`/`offers`/`performer` is added where no true
value exists. Google does NOT penalize recommended-field absence; fabricating
any would be a spec violation (MASTER-SEO-SPEC §6 — "Never fabricate an
address or use a generic placeholder. Only add schema matching visible page
content") + a data-integrity violation (the S-05 no-invented-data rule). The
SportsEvent type is correct (NOT Event). Rich results for SportsEvent are NOT
guaranteed (Google's rich-result eligibility is language/region-dependent; the
Persian/IR market may not be eligible for all rich-result types) — the
structured data is for entity grounding + the knowledge graph, NOT a
rich-result guarantee (per the phase file step 5: "do not promise a rich
result").

**No code change. No deploy.** Docs-only (the same discipline as Session 12
Option (b)). The decision + the freeze-coordination + the validation evidence
are recorded in `docs/DECISIONS.md` S13-1 / S13-2 / S13-3.

## 6. Files changed (docs-only — NO code, NO assets, NO version bump)

### Modified (docs)
- `docs/DECISIONS.md` — three new S13 entries prepended at the top (after the
  header): S13-1 (the 13 "Missing field location" Critical items + the 4
  non-critical issue types are ALL the honest "missing recommended field"
  class — the schema type IS SportsEvent; the MISSING-IS-NOT-ZERO law holds),
  S13-2 (the freeze-coordination — docs-only, no byte-frozen surface touched,
  no code/deploy/version bump; the existing gates already pin the SportsEvent
  contract), S13-3 (the validation evidence + the KV quota healthy at session
  close; no deploy).
- `seo-implementation/architecture/ROUTE-AND-CANONICAL-PLAN.md` — §10 a
  Session 13 sequencing note added (Session 13 = structured data; DONE —
  docs-only; the 13 items are the honest "missing recommended field" class).
- `docs/HANDOFF.md` — rewritten for Session 13.
- `CHANGELOG.md` — a Session 13 docs-only entry (no version bump).
- `sportsignal-seo-implementation/IMPLEMENTATION-TRACKER.md` — the Session 13
  row updated from "Not started" to "Completed (docs-only; no deploy by design
  — the 13 items are the honest 'missing recommended field' class; the
  MISSING-IS-NOT-ZERO law holds)".
- `seo-implementation/session-reports/SESSION-13.md` — this file.
- `seo-implementation/next-session-prompt.md` — the Session 14 start prompt
  (mobile performance + GSC monitoring + optional GA4).
- `docs/assets/gsc/s13/` — the validation evidence (the GSC Events CSVs + the
  live JSON-LD snapshots + the Schema Markup Validator screenshots + the
  README).

### NOT modified (the docs-only discipline)
- **NO `src/` file touched.** The `sportsEventNode` builder + the
  `hydrateMatchVenue` function + the `buildMatchPage` call site stay as-is
  (they are already correct).
- **NO `scripts/` file touched.** No new `check-seo-structured-data.js` gate
  (the existing `check-match-centre.js` S20 gate + the `seo-check.js` T-04
  live-audit gate already pin the SportsEvent contract + the
  MISSING-IS-NOT-ZERO law).
- **NO `assets/` file touched.**
- **NO version bump.** `src/config.ts` stays `13.267.0-persian-entities`;
  `package.json` stays `13.267.0.0`.
- **NO deploy.** The live deployment `21efcee2-269a-4ad1-819c-b6027822607a`
  @100% stays.

## 7. Tests

- `npm test` exit 0 — **3,720 OK** (the baseline; no new check added, no code
  changed — verified before the push). `npx tsc --noEmit` clean (no `src/`
  change).
- No new offline gate added (the prompt's docs-only discipline explicitly says
  "No code change" for the "no real errors" case). The existing
  `check-match-centre.js` S20 SportsEvent-facts gate + the `seo-check.js` T-04
  live-audit gate already pin the SportsEvent contract + the
  MISSING-IS-NOT-ZERO law.
- The structured-data state re-verified by the live JSON-LD extraction (§3.3)
  + the Schema Markup Validator (§4).

## 8. Deploy

**No deploy.** This is a docs-only session (the inspection found NO real
structured-data errors — the 13 items are the honest "missing recommended
field" class; the MISSING-IS-NOT-ZERO law holds). The live deployment stays at
`13.267.0-persian-entities` (deployment `21efcee2-269a-4ad1-819c-b6027822607a`
@100% — the Session 11 deploy; unchanged by the docs-only S13 session).

**Cloudflare budget of this change:** zero new KV reads (docs-only — no code,
no render path change); zero new KV writes; zero new subrequests; zero new
fetches; zero render-cost additions. The decision (docs-only) cannot worsen
the KV-read quota issue — it adds nothing to the runtime.

**Deploy-window check:** today is 2026-11-17 (the session close) — NOT Nov 20
(the Bayern–Köln S27 auto-verify windows: kickoff 19:30 UTC, M1 ~19:35, M2
~21:35-45 UTC; `sched_next_ko: 2026-11-20T19:30:00.000Z`). Moot for a
docs-only session (no deploy) — noted for the next session.

## 9. The KV read quota (healthy at session close)

The live `/healthz` at Session 13 close (2026-11-17, docs-only — no deploy):

```
{"ok":true,"heartbeat_age_min":4,"last_cron_age_min":4,"outbox_depth":0,
"pool_age_min":54,"pool_matches":324,"admin_alerts_ok":true,
"kv_writes_day":329,"kv_writes_web":151,"kv_budget":null,"degraded":false,
"subreq_last_tick":29,"kv_ops_last_tick":29,"sched_mode":"IDLE",
"sched_reason":"beyond-horizon","sched_live_sweep":"none",
"sched_poll_hint_sec":900,"sched_live_now":0,"sched_stale_live":0,
"sched_feed_ok":true,"sched_next_ko":"2026-11-20T19:30:00.000Z",
"sched_next_wake":"2026-11-20T18:30:00.000Z",
"version":"13.267.0-persian-entities"}
```

The KV quota is healthy (`ok:true` + `pool_matches:324` + `degraded:false` —
the reads are working; the data surfaces are rendering; the live JSON-LD on
the click-earner match + the 6 no-venue matches all rendered correctly). The
S13 decision (docs-only) has zero new KV reads, so it cannot worsen the quota
issue. The owner should continue to investigate the read-source (the 10-min
cron + public traffic + the bot may collectively exceed 100K reads/day); the
durable fix is a Workers Paid plan ($5/mo → 1M reads/day) — and per S12-1
axis 2, a Workers Paid plan is ALSO a prerequisite for any future `/en/` URL
architecture (the S12-1 revisit clause). Decision S13-3.

## 10. Commit SHAs

- The docs checkpoint: `seo(s13): the structured-data + GSC enhancement
  validation — the 13 "Missing field location" Critical items + the 4 non-
  critical issue types are ALL the honest "missing recommended field" class
  (the schema type IS SportsEvent; the MISSING-IS-NOT-ZERO law holds; no
  location/address/endDate/offers/performer added where no true value exists;
  the Schema Markup Validator confirms both the with-venue + no-venue match
  pages are schema.org-VALID; the existing gates already pin the SportsEvent
  contract) + the S13-1/S13-2/S13-3 DECISIONS entries + the SESSION-13 report
  + the HANDOFF/CHANGELOG/tracker updates + the Session 14 prompt — docs-only,
  no code change, no deploy"` (one commit; ls-remote verified).

Recorded in `sportsignal-seo-implementation/IMPLEMENTATION-TRACKER.md`
Session 13 row after the push.

## 11. Unresolved risks / open follow-ups

- **The Dec 4-8 freeze:** the competition/team/match/homepage title/H1 bytes +
  the team-name spellings + the date-hub empty-state copy are byte-frozen.
  After Dec 4, with a fresh 16-month GSC export, apply the parked S2 title-test
  winning pattern + decide the frozen-surface byte decisions (S09-3, S08,
  S07-H2, S06-H2, S06-H3). The S11 freeze-safe changes (og:type=article +
  SEO_EXTRA_ALIASES + TEAM_SLUGS no-op) are NOT reverted — they are durable.
  The S12 decision (Option (b)) touches NO byte-frozen surface. The S13
  inspection is read-only — NO byte-frozen surface touched.
- **The KV read quota:** healthy at S13 close (the quota had reset). Re-check
  at every session close until the owner resolves the daily-exceedance issue
  (investigate the read-source or upgrade to Workers Paid). A Workers Paid plan
  is ALSO the prerequisite for any future `/en/` URL architecture (S12-1 axis
  2).
- **The fresh 16-month GSC export (the program's top evidence request):**
  remains the top request — the existing 3-month snapshot is SUFFICIENT for the
  S13 decision (the 13 items are the no-venue matches; the MISSING-IS-NOT-ZERO
  law holds regardless of the window). The fresh export would validate the
  frozen-surface byte decisions post-Dec-4 (S09-3, S08, S07-H2, S06-H2, S06-H3)
  + the SEO_EXTRA_ALIASES future-additions + the S13-1 option (c) revisit (a
  curated stadium-lookup for the no-venue matches IF the owner wants to pursue
  Events rich-result eligibility) + any future EN re-litigation.
- **The Events rich-result eligibility (S13-1 option (c) revisit):** after Dec
  4-8, with a fresh GSC export, IF the owner wants to pursue the Events rich-
  result snippet (which would require `location` on the no-venue matches),
  evaluate a curated, per-entry-verified stadium-lookup (the home-ground table
  `src/grounds.ts` extended to cover the no-venue matches' home teams, OR a
  Wikidata sameAs stadium lookup) — ONLY where a true venue value exists + the
  provenance is verified per entry. NEVER fabricate. That session would add
  the `check-seo-structured-data.js` gate + the version bump + the deploy.
- **The Rich Results Test manual re-run:** the owner should re-run the Rich
  Results Test (https://search.google.com/test/rich-results) manually (in a
  non-automated browser) on the representative pages (the Barcelona–Man City
  match, the Lazio–Lecce match, a team page, a competition page, a hub) to
  capture Google's per-page rich-result eligibility view (the GSC Events
  report is the batch equivalent; a single-URL run gives the per-page detail).
- **The S10-2 follow-up (the homepage → team/competition spec §9 gap):**
  unchanged — a Session 14+ follow-up.
- **The S11 SEO_EXTRA_ALIASES extension — future additions:** unchanged —
  after Dec 4-8, with a fresh GSC export, add NEW GSC-observed Persian
  variants.
- **The S12 EN architecture decision (FINAL — Option (b)):** unchanged — a
  future re-litigation requires the three evidence axes.

## 12. Session 13 acceptance criteria (from the phase file)

The phase file (`sportsignal-seo-implementation/phases/SESSION-13-STRUCTURED-DATA.md`)
acceptance criteria: "No warnings/errors introduced; data matches visible
content; missing fields fixed only where true values exist; validation
evidence saved." The acceptance criteria map:

- ✅ **Inspect the exact GSC enhancement report behind the 13 "Missing field
  location" items** — DONE (§2). The GSC Events enhancement report
  (`docs/assets/gsc/sportsignal.ir-Events-2026-11-15.zip` → the Critical +
  Non-critical issues CSVs) inspected directly. The schema type IS confirmed
  as SportsEvent (the "Events" report groups Event/SportsEvent; the live
  JSON-LD emits `@type: SportsEvent`).
- ✅ **Identify schema type and affected URLs; do not assume Event until
  confirmed** — DONE (§2 + §3). The schema type IS SportsEvent (NOT Event —
  SportsEvent is the more-specific type). The affected URLs are the no-venue
  matches (the 13 "Missing field location" items) + the matches with a venue
  but no address (the 18 "address" items) + all 31 match URLs in the report
  (the endDate/offers/performer items).
- ✅ **Inspect current JSON-LD and visible content** — DONE (§3). The
  `sportsEventNode` builder + the `hydrateMatchVenue` function + the
  `buildMatchPage` call site inspected. The `location` property is emitted
  ONLY when a true venue value exists (the `if (m.venue)` guard — the
  MISSING-IS-NOT-ZERO law).
- ✅ **Add only properties supported by accurate source data. Never invent
  stadium/venue/address** — DONE (§5). NO properties added (the inspection
  found NO real errors; ALL items are the honest "missing recommended field"
  class). The MISSING-IS-NOT-ZERO law holds — never fabricate.
- ✅ **Use correct types for SportsEvent/Event if applicable and valid, but do
  not promise a rich result; check language/region eligibility** — DONE (§5).
  The SportsEvent type is correct (NOT Event). Rich results are NOT promised
  (the structured data is for entity grounding + the knowledge graph; the
  Persian/IR market may not be eligible for all rich-result types).
- ✅ **Validate representative pages with Rich Results Test and structured data
  validators** — DONE (§4). The Schema Markup Validator (validator.schema.org)
  confirms both the with-venue match (Barcelona–Man City) AND the no-venue
  match (Lazio–Lecce) are schema.org-VALID — "no errors, no warnings" on
  WebPage + BreadcrumbList + SportsEvent. The Rich Results Test was
  reCAPTCHA-blocked for automated access (the GSC Events report IS the batch
  Rich Results Test result). Validation evidence saved in
  `docs/assets/gsc/s13/` (the CSVs + the JSON-LD snapshots + the screenshots +
  the README).
- ✅ **No warnings/errors introduced** — TRIVIALLY SATISFIED (no code change;
  nothing introduced).
- ✅ **Data matches visible content** — VERIFIED (the SportsEvent description
  === the answer sentence === the visible briefing card atom — the
  `matchAnswerSentence` funnel, byte-frozen; the Session 7 F3 audit).
- ✅ **Missing fields fixed only where true values exist** — SATISFIED (the
  `location` is added ONLY where a venue exists; no venue is fabricated; the
  MISSING-IS-NOT-ZERO law holds).
- ✅ **Validation evidence saved** — DONE (`docs/assets/gsc/s13/`).

## 13. Handoff to Session 14

Session 14 owns the mobile performance + the GSC monitoring + the optional
GA4 decision (the route plan §10 — the phase file
`sportsignal-seo-implementation/phases/SESSION-14-PERFORMANCE-GSC-AND-OPTIONAL-GA4.md`).
The next-session prompt is in `seo-implementation/next-session-prompt.md`. The
standing constraints carry: the Dec 4-8 freeze; the Cloudflare free-tier
budget; the KV read quota (re-check at S14 close; a Workers Paid plan is the
durable fix AND the prerequisite for any future `/en/` re-litigation); the
S10-2 homepage → team/competition gap follow-up; the S11 SEO_EXTRA_ALIASES
extension (future additions after Dec 4-8 with a fresh GSC export); the S12 EN
architecture decision (FINAL — Option (b); a future re-litigation requires the
three evidence axes); the S13 Events rich-result eligibility revisit (option
(c) — a curated stadium-lookup for the no-venue matches, post-Dec-4, IF the
owner wants to pursue the Events rich-result snippet); do not start Session
15 work (the final regression) in Session 14.
