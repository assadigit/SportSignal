# HANDOFF — SportSignal

> Agents: read AGENTS.md in the repo root first, and follow it for this whole session.

## This session (SEO Program Session 13 — Structured Data + GSC Enhancement Validation; TENTH session, 2026-11-17, docs-only)

The structured-data errors + the GSC enhancement validation session of the
15-session SEO program (the route plan §10 — the phase file
`sportsignal-seo-implementation/phases/SESSION-13-STRUCTURED-DATA.md`).
**Decision: the 13 "Missing field location" GSC Critical items + the 4 non-
critical issue types are ALL the honest "missing recommended field" class —
the schema type IS SportsEvent (confirmed from the GSC Events enhancement
report); the MISSING-IS-NOT-ZERO law holds; NO code change, NO deploy.**
Docs-only session — the same discipline as Session 12 Option (b).

- **The inspection (the GSC Events enhancement report):** the GSC "Events"
  enhancement report (`docs/assets/gsc/sportsignal.ir-Events-2026-11-15.zip`
  → `Critical issues.csv` + `Non-critical issues.csv` — copied to
  `docs/assets/gsc/s13/`) was inspected directly. The "Events" report is
  Google's enhancement report for the Event/SportsEvent schema type. The
  schema type IS confirmed as **SportsEvent** (the live JSON-LD on the
  click-earner `/matches/barcelona-vs-manchester-city-2026-12-08` emits
  `@type: SportsEvent`). The report shows ONE Critical issue type + FOUR
  non-critical issue types, ALL the honest "missing recommended field" class:

  | Issue | Severity | Items | The honest reason |
  |---|---|---:|---|
  | `Missing field 'location'` | Critical | 13 | the no-venue matches — NEITHER the home-ground table `src/grounds.ts` NOR the FD v4 detail call `hydrateMatchVenue` returned a venue; the `if (m.venue)` guard omits `location` (the MISSING-IS-NOT-ZERO law) |
  | `Missing field 'address' (in 'location')` | Non-critical | 18 | the matches WITH a venue name but WITHOUT an address; the data source carries the venue NAME only |
  | `Missing field 'endDate'` | Non-critical | 31 | the FD data does NOT carry the match end time; per the S-05 no-invented-data law, OMITTED |
  | `Missing field 'offers'` | Non-critical | 31 | SportSignal does NOT sell tickets / carry ticket data; per the S-04 no-fake-offers law, OMITTED |
  | `Missing field 'performer'` | Non-critical | 31 | the teams are already in `homeTeam`/`awayTeam`; adding player names as `performer` is NOT part of the page's content contract + would be filler |

  NONE is a real structured-data error. The 13 "Missing field location"
  Critical items are Google's rich-result ELIGIBILITY warning (the Events
  rich result recommends `location`), NOT a schema.org validation error.
  Google does NOT penalize recommended-field absence.

- **The JSON-LD + the venue hydration inspected (the MISSING-IS-NOT-ZERO law
  re-verified):** the `sportsEventNode` builder (`src/seo/jsonld.ts:110-165`)
  emits the `location` property ONLY when `m.venue` is truthy — the
  `if (m.venue)` guard (lines 149-154). The `hydrateMatchVenue` function
  (`src/seo/data.ts:506-567`) is fail-closed (tries the deterministic
  home-ground table first → then the FD v4 detail call, KV-cached 24h, 5s race
  guard → on any failure, leaves the match without a venue). Live-verified:
  the with-venue match (Barcelona–Man City) carries `location: Camp Nou`;
  6 no-venue matches (Lazio–Lecce, Parma–Roma, Hull–Brighton, Elversberg–
  Freiburg, Lille–Lyon, 'Gladbach–Dortmund) all correctly OMIT `location`.

- **The existing gate coverage (NO new gate needed):** the existing
  `check-match-centre.js` S20 SportsEvent-facts gate (lines 4037-4038) pins
  the `if (m.venue)` guard + `ev.location =` + the absence of
  `endDate`/`offers`/`aggregateRating`/`review` (the S-03/S-04/S-05 honesty
  laws) — the comment explicitly states "the venue omits when absent — the
  MISSING-IS-NOT-ZERO law". The `seo-check.js` T-04 live-audit gate + the
  `check-match-centre.js` S16-Schema gate (SportsEvent is the ONLY event-type
  node) also cover the contract. No new `check-seo-structured-data.js` gate.

- **The validation (the Schema Markup Validator):** validator.schema.org (the
  authoritative schema.org validator) run via agent-browser on TWO
  representative match pages — BOTH pass with "no errors, no warnings" on
  WebPage + BreadcrumbList + SportsEvent (schema.org treats
  `location`/`address`/`endDate`/`offers`/`performer` as RECOMMENDED, not
  required). Screenshots + JSON-LD snapshots saved in `docs/assets/gsc/s13/`.
  The Rich Results Test was reCAPTCHA-blocked for automated access (the GSC
  Events report IS the batch Rich Results Test result).

- **What I checked (verification):** the GSC Events enhancement report CSVs
  (§2 of the Session 13 report — the 13 Critical + the 4 non-critical issue
  types); `src/seo/jsonld.ts` (the `sportsEventNode` builder + the
  `if (m.venue)` guard); `src/seo/data.ts` (the fail-closed
  `hydrateMatchVenue`); the live JSON-LD on a with-venue match (Barcelona–Man
  City — `location: Camp Nou`) + 6 no-venue matches (all correctly omit
  `location`); the existing `check-match-centre.js` S20 gate + the
  `seo-check.js` T-04 gate (the SportsEvent contract is already pinned); the
  Schema Markup Validator on 2 representative pages (both schema.org-VALID);
  `npm test` exit 0 (**3,720 OK** = the baseline; no new check added, no code
  changed — verified before the push; `npx tsc --noEmit` clean); the live
  `/healthz` at session close (`ok:true` + `pool_matches:324` +
  `kv_writes_day:329` + `degraded:false` + `version:13.267.0-persian-entities`
  — the KV quota is healthy; no deploy).

- **Byte-frozen (NOT changed — the Dec 4-8 freeze holds; the S13 session is
  docs-only):** the competition-page title/H1/description/answer (Session 9),
  the team-page title/H1/description/answer (Session 8), the match-page
  title/H1/description/answer-sentence (Session 7), the homepage title/H1
  (Session 6), the date-hub empty-state copy on `/matches/tomorrow` (S06-H3),
  the team-name spellings in fa-dict.ts (the S1 M2 F3 spelling fix is LIVE and
  mid-measurement — judge ~Dec 8). The S11 freeze-safe changes
  (og:type=article + SEO_EXTRA_ALIASES + TEAM_SLUGS no-op) stay durable. The
  S12 decision (Option (b)) stays FINAL. The S13 inspection is read-only — NO
  byte-frozen surface touched, NO JSON-LD addition, NO JSON-LD removal.

- **Cloudflare budget of this change:** zero new KV reads (docs-only — no
  code, no render path change); zero new KV writes; zero new subrequests;
  zero new fetches; zero render-cost additions. The decision (docs-only)
  cannot worsen the KV-read quota issue — it adds nothing to the runtime.

- **Decisions:** S13-1 (the 13 "Missing field location" Critical items + the
  4 non-critical issue types are ALL the honest "missing recommended field"
  class — the schema type IS SportsEvent; the MISSING-IS-NOT-ZERO law holds;
  no location/address/endDate/offers/performer added where no true value
  exists), S13-2 (the freeze-coordination — docs-only, no byte-frozen surface
  touched, no code/deploy/version bump; the existing gates already pin the
  SportsEvent contract), S13-3 (the validation evidence + the KV quota healthy
  at session close; no deploy). Details in `docs/DECISIONS.md`.

- **Next session (Session 14):** the mobile performance + the GSC monitoring +
  the optional GA4 decision (the route plan §10 — the phase file
  `sportsignal-seo-implementation/phases/SESSION-14-PERFORMANCE-GSC-AND-OPTIONAL-GA4.md`).
  The next-session prompt is in `seo-implementation/next-session-prompt.md`.

## Current state (machine)

- **Version:** `13.267.0-persian-entities` (`src/config.ts` / `package.json` `13.267.0.0`) — UNCHANGED by the docs-only S13 session. npm test baseline **3,720 OK** (`npx tsc --noEmit` clean + 55 check scripts — UNCHANGED; no new check added; verified before the push).
- **Deploy:** Worker `ucl-notifier`, versioned deploys only. Current deployment `21efcee2-269a-4ad1-819c-b6027822607a` (`13.267.0-persian-entities`; 2026-11-17, deployed @100% — the Session 11 deploy; UNCHANGED by the docs-only S12 + S13 sessions). Rollback chain: `12793863` (13.266.0-internallinks, Session 10) → `fc07b557` (13.265.0-competitions, Session 9) → `b313aada` (13.264.0-teampages, Session 8) → `3e3a65e7` (13.263.0-matchlinks, Session 7) → `7df40334` (13.262.0-homepage, Session 6) → `1d70129b` (13.261.0-matchlife, Session 5) → `7d92e633` (13.260.1-teamidx, Session 4) → `24c62781` (13.260.0-teamidx) → `c97ae70b` (byte-identical S28.1) → earlier. Rollback = `npx wrangler rollback`.
- **Production hostnames:** `sportsignal.ir` (apex Custom Domain), `football.sportsignal.ir` (301→apex except `/webhook`,`/api/`,`/admin`), `ucl-notifier.sportsignal.workers.dev` (noindex-guarded alias — HTML AND machine files since Session 4; never a scratch env).
- **Branch:** `main` (canonical; HEAD = the S13 docs checkpoint — ls-remote verified after the one-shot token push). Session 13 commit: `seo(s13): the structured-data + GSC enhancement validation — the 13 "Missing field location" Critical items + the 4 non-critical issue types are ALL the honest "missing recommended field" class …` (docs-only — DECISIONS S13-1/2/3 + ROUTE-AND-CANONICAL-PLAN §10 note + the SESSION-13 report + the HANDOFF/CHANGELOG/tracker + the validation evidence + the Session 14 prompt).
- **Commands:** `npm test` (must exit 0 before every push). **npm only, never `bun install`**. Local dev: `npx wrangler dev --config wrangler.dev.toml --port 8787 --local` (the dev config has no [ai] remote binding — safe without the token). Deploy needs `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID=a796fdfe…` in the env.
- **Cron triggers:** `*/10 * * * *` + `27 */4 * * *` (unchanged). Live healthz at Session 13 close: version `13.267.0-persian-entities` (unchanged — no deploy); the KV quota is healthy (`ok:true` + `pool_matches:324` + `kv_writes_day:329` + `degraded:false`); `sched_next_ko: 2026-11-20T19:30:00.000Z` (the Bayern–Köln S27 auto-verify window — days away; noted for the next session's deploy-window check).
- **Key folders:** `src/` (worker modules; `scripts/lib/worker-src.js` carries the bundle ORDER — co-evolve), `assets/` (immutable versioned client payload; SW `sportsignal-v126`, bundle `public-13.80.js`, stylesheet `public-13.87.css`), `docs/` (RUNBOOK, specs, audits, history), `sportsignal-seo-implementation/` (the SEO spec pack — owner's, tracker updated per session), `seo-implementation/` (the SEO program working tree: audits, keyword research, architecture, session reports, next-session prompts), `docs/assets/gsc/s13/` (the Session 13 validation evidence).
- **Backups:** KV is live state; no routine file backups (RUNBOOK §5 KV key contracts). Never rename KV keys.
- **Standing limits:** `_headers` at the 100-rule cap. **Cross-track SEO measurement window Dec 4-8: the GSC surfaces + team-name spellings stay byte-frozen through it.** The competition-page title/H1/description/answer ARE byte-frozen (Session 9 verified). The team-page title/H1/description/answer ARE byte-frozen (Session 8 verified). The match-page title/H1/description/answer-sentence ARE byte-frozen (Session 7 verified). The homepage title/H1 ARE byte-frozen (Session 6). The date-hub empty-state copy on `/matches/tomorrow` IS byte-frozen (the S06-H3 follow-up is post-Dec-4). The team-name spellings in fa-dict.ts ARE byte-frozen (the S1 M2 F3 spelling fix is LIVE and mid-measurement — judge ~Dec 8). The S11 changes (og:type=article + SEO_EXTRA_ALIASES + TEAM_SLUGS no-op) are NOT GSC-measured surfaces (machine-readable JSON-LD / non-title metadata) — safe under the freeze; durable. **The S12 decision (Option (b) — maintain the single-language stance) is FINAL; no `/en/` URLs, no hreflang; a future re-litigation requires the three evidence axes.** **The S13 inspection is read-only — the 13 "Missing field location" GSC Critical items + the 4 non-critical issue types are ALL the honest "missing recommended field" class; the MISSING-IS-NOT-ZERO law holds; the SportsEvent JSON-LD is correct; no code change, no deploy.** The S28 archive scope stays BIG matches only until the owner's A/B. Avoid deploys in the Nov 20 Bayern–Köln verification windows (M1 ~19:35 UTC, M2 ~21:35-45 UTC). Cloudflare free-tier budget: the 10ms CPU cliff on cold match renders is chronic; **the KV read quota (100,000/day free-plan) is exceeded DAILY** (it resets at UTC midnight but gets exceeded again during the day — Sessions 5-11 all closed with it exceeded; at Session 12 + 13 close it was healthy: `ok:true` + `pool_matches:324`) — investigate the read-source; a Workers Paid plan ($5/mo → 1M reads/day) is the durable fix AND the prerequisite for any future `/en/` URL architecture.

## Open follow-ups from the previous tracks (updated by Session 13)

- **Nov 20 (S27 option B):** the auto-verify workflow fires around Bayern–Köln; the owner re-fires the M1/M2 window sessions per the S27-cont record. (`sched_next_ko: 2026-11-20T19:30:00.000Z`.)
- **S24 (perf/CWV):** after Dec 8 — P1 hero `loading="lazy"`, P2 preconnect to crests.football-data.org, per-route CPU via GraphQL. **This is the Session 14 scope.**
- **S26 (UI/UX iteration):** after S25 (done) — hero rendering, nav UX, FAQ discoverability, schedule density, telegram CTA. **S06-H4 (the visible curation copy) belongs here or in a dedicated UI round.**
- **S1/S2 SEO mini-track:** S1 spelling fix LIVE and mid-measurement (judge ~Dec 8); S2 title test parked — re-fire on/after Dec 4 with a fresh GSC export. **The program's Session 9/10/11 (competition/team pages + internal linking + Persian entity-naming) consumes the S2 title-test result after Dec 4 for the frozen-surface byte decisions (S09-3, S08, S07-H2, S06-H2).**
- **S25 follow-up smokes:** NVDA/VoiceOver + Safari/Firefox/Edge live confirmations (owner sessions needed).
- **C8 client-side staleness vector (Session 4):** the `/api/public-matches` zone-edge HIT stamp (`max-age=14400`) is browser-honored on the poll path — client-side fix or zone Cache Rule; owner decision.
- **KV read quota (Session 5/6/7/8/9/10/11/12/13, STILL OPEN):** the account's 100,000 KV reads/day free-plan limit is exceeded DAILY (it resets at UTC midnight but gets exceeded again during the day). Investigate the read-source; consider a Workers Paid plan ($5/mo → 1M reads/day). **Session 13 close: the quota is healthy** (`ok:true` + `pool_matches:324` + `degraded:false`; no deploy — docs-only session). **A Workers Paid plan is ALSO the prerequisite for any future `/en/` URL architecture** (the S12-1 axis 2 — the 2× KV-read demand).
- **Season-end lifecycle first run (Session 5, unchanged):** the mechanism is shipped + test-proven but INERT (flag false + empty dates map). To enable: confirm FD `season.endDate` values → populate `SEASON_END_DATES` → set `SEASON_END_NOINDEX_ENABLED = true` → versioned deploy → verify live. The first real transition is a May 2027 decision (after the 2026-27 season closes).
- **S10-2 follow-up (the homepage → team/competition spec §9 gap):** the homepage does NOT link directly to `/teams/<slug>` or `/competitions/<slug>` (spec §9 lists "Homepage → ... selected competition sections and selected team pages"). Closing it is a "link placement" change (in-scope per route plan §10) but touches the shared homepage standings/cups renderers (`markup.ts`) with visual side-effects — a Session 14+ follow-up.
- **S11 SEO_EXTRA_ALIASES extension — future additions:** after Dec 4-8, with a fresh 16-month GSC export, validate the alias coverage — add NEW GSC-observed Persian variants as further `SEO_EXTRA_ALIASES` entries (every alias cites its GSC evidence per the S-05 rule).
- **S12 EN architecture decision (FINAL — Option (b)):** a future session that wants to build `/en/` URLs must re-litigate ALL THREE evidence axes (English-query demand in a fresh 16-month GSC export + a Workers Paid plan in place + a demonstrated competitive angle against the English-native publishers). The keyword map §2 English plan slots stay as the documented Option (a) contingency.
- **S13 Events rich-result eligibility revisit (S13-1 option (c)):** after Dec 4-8, with a fresh GSC export, IF the owner wants to pursue the Events rich-result snippet (which would require `location` on the no-venue matches), evaluate a curated, per-entry-verified stadium-lookup (the home-ground table `src/grounds.ts` extended to cover the no-venue matches' home teams, OR a Wikidata sameAs stadium lookup) — ONLY where a true venue value exists + the provenance is verified per entry. NEVER fabricate. That session would add the `check-seo-structured-data.js` gate + the version bump + the deploy.
- **S13 Rich Results Test manual re-run:** the owner should re-run the Rich Results Test (https://search.google.com/test/rich-results) manually (in a non-automated browser) on the representative pages (the Barcelona–Man City match, the Lazio–Lecce match, a team page, a competition page, a hub) to capture Google's per-page rich-result eligibility view (the GSC Events report is the batch equivalent; a single-URL run gives the per-page detail).

## SEO program state (the 15-session track)

Session 01 ✅ Completed / verified in production (2026-11-16) — audit + docs.
Session 02 ✅ Completed, docs-only, no deploy (2026-11-16) — 369-phrase map + one-URL rules; allowlist corrected to 13.
Session 03 ✅ Completed, docs-only, no deploy (2026-11-16) — the approved architecture (map, matrix, route plan).
Session 04 ✅ Completed / verified in production (2026-11-16) — the crawl/index foundation (C1/C6/C8); 3,628 OK.
Session 05 ✅ Completed / deployed (2026-11-17) — the match-URL lifecycle mechanism (INERT by default); 3,652 OK. Deployment `1d70129b…` @100%.
Session 06 ✅ Completed / deployed (2026-11-17) — the homepage one-month window + carousel crawlability + curated-selection promise; 3,675 OK. Deployment `7df40334…` @100%.
Session 07 ✅ Completed / deployed (2026-11-17) — the match-detail footer-hook team-link gating + the metadata audit; 3,676 OK. Deployment `3e3a65e7…` @100%.
Session 08 ✅ Completed / deployed (2026-11-16) — the selected-club team-page @graph WebPage node + the new `check-seo-teampages.js` gate; 3,685 OK. Deployment `b313aada…` @100%.
Session 09 ✅ Completed / deployed (2026-11-17) — the competition-page @graph CollectionPage node + the date-hub/empty-state verification + the new `check-seo-competitionpages.js` gate + the seeded render harness; 3,694 OK. Deployment `fc07b557…` @100%.
Session 10 ✅ Completed / deployed (2026-11-17) — the `/teams` index tile ordering (the 13 selected clubs first) + the new `check-seo-internallinks.js` gate + the seeded render harness; 3,704 OK. Deployment `12793863…` @100%.
Session 11 ✅ Completed / deployed (2026-11-17) — the Persian entity-naming/metadata polish (og:type=article + SEO_EXTRA_ALIASES + TEAM_SLUGS no-op) + the new `check-seo-persian-entities.js` gate + the seeded render harness; 3,720 OK. Deployment `21efcee2…` @100%.
Session 12 ✅ Completed, docs-only, no deploy (2026-11-17) — the EN architecture + hreflang decision: **Option (b) — maintain the single-language stance, FINAL**. No code change, no version bump, no deploy; npm test 3,720 OK (baseline unchanged).
Session 13 ✅ Completed, docs-only, no deploy (2026-11-17) — the structured-data + GSC enhancement validation: **the 13 "Missing field location" GSC Critical items + the 4 non-critical issue types (endDate 31 / offers 31 / performer 31 / address-in-location 18) are ALL the honest "missing recommended field" class — the schema type IS SportsEvent (confirmed from the GSC Events enhancement report + the live JSON-LD); the MISSING-IS-NOT-ZERO law holds (the `if (m.venue)` guard in `jsonld.ts:149-154` + the fail-closed `hydrateMatchVenue` in `data.ts:506-567` + 6 live no-venue matches verified); the Schema Markup Validator confirms both the with-venue + no-venue match pages are schema.org-VALID (no errors, no warnings); the existing gates (`check-match-centre.js` S20 + `seo-check.js` T-04) already pin the SportsEvent contract**. The S13-1/S13-2/S13-3 DECISIONS entries; the validation evidence in `docs/assets/gsc/s13/`. No code change, no version bump, no deploy; npm test 3,720 OK (baseline unchanged).
`seo-implementation/next-session-prompt.md` holds the Session 14 start prompt
(mobile performance + GSC monitoring + optional GA4). Progress source of
truth: `sportsignal-seo-implementation/IMPLEMENTATION-TRACKER.md`.
