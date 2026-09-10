# Changelog

All notable changes to the UCL Notifier are documented here, newest first.
Version strings follow the value exposed by the live `/api/status` endpoint
(see `src/worker.ts` `VERSION`).

---

## [11.52] — 2026-08-19 (latest, deployed)

- **Bundesliga (BL1) data actually flows** — sportscore now fetches BL1 in the
  near scan and long view (football-data returns 0 BL1 fixtures; TheSportsDB is
  429-blocked on worker egress).
- Bayern gets an English alias (providers report "Bayern Munich", not
  "FC Bayern München").
- Gate: `scripts/check-bl1.js`.

## [11.51b] — 2026-08-19

- `getSettings` now merges default leagues with saved settings
  (BL1/Bundesliga survives old settings — fixes Bayern/Dortmund silently
  dropping out of fetch + notify).
- Gate: `scripts/check-league-union.js`.

## [11.51] — 2026-08-19

- UI/UX audit fixes: WCAG AA light-mode contrast for section headers / live
  chip / derby badge, reduced-transparency solid fallback across all glass
  surfaces, UCL spotlight shows a live countdown when fixtures are pending,
  lazy-loaded crest images, mobile topbar wraps instead of clipping, lighter
  UCL table track.

## [11.50] — 2026-08-19

- Desaturate the next-big-match card green (dark: muted gray-green gradient,
  light: soft mint) with softened borders.

## [11.49] — 2026-08-19

- Cap the UCL next-match query at the next 90 days (live matches kept) — the
  spotlight and UCL match list can no longer surface fixtures beyond the horizon.

## [11.48] — 2026-08-19

- UCL not-started blur overlay with live countdown over the league table.

## [11.47] — 2026-08-19

- Remove the breathing glow from the next-big-match card; replace with a solid,
  high-contrast green gradient + readable inner text (both themes, incl.
  reduced-motion fallback).

## [11.46] — 2026-08-19

- Strip Eastern-European / German / Turkish club prefixes in both name
  normalizers (FK NK GNK SK SL RSC BSC JK TC PFC MSK SV TSG) so provider
  variants resolve to Farsi; add ~35 alias keys for UCL clubs; `check-fa-dict`
  now covers 254 names (168 roster + 86 provider variants), 0 failures.

## [11.45] — 2026-08-19

- `FA_TEAMS` +99 entries for every UCL group / league-phase participant from
  2005–06 to 2024–25 (32 clubs) with provider aliases; `check-fa-dict` covers
  168 names.

## [11.44] — 2026-08-19

- Next-UCL-match spotlight card — separate gold container above the UCL table
  with a big Champions League emblem, team crests, countdown, venue and share
  row; server exposes `ucl.nbig` (live-first next CL fixture); `check-cups`
  asserts `nbig`.

## [11.43] — 2026-08-19

- Remove the duplicated internal UCL title inside the dedicated UCL card.

## [11.42] — 2026-08-19

- Smaller glow radius on the next-big-match card with breathing / pulsing
  animation; reduced-motion fallback matches.

## [11.41] — 2026-08-19

- Dedicated UCL card + full 36-team UCL table on the public page; CL pulled out
  of the generic cup order into its own payload (emblem, matchday, started flag,
  up to 10 upcoming CL fixtures, live-first); `check-cups.js` updated for the
  new `ucl` payload.

## [11.40] — 2026-08-19

- Kill duplicate rows at the source — shared `canonDedupe()` collapses
  same-match copies (football-data vs TheSportsDB ids) in both the KV write and
  the list returned to the public page; `check-dedupe.js` regression test.

## [11.39] — 2026-08-19

- Club logo + name stay one unit (`flex-wrap: nowrap`); next-big-match card glow
  is grass green across dark/light/reduced-motion; countdown bar fill green too.

## [11.38] — 2026-08-19

- Fix duplicate matches in the pool — `cacheMatches` dedupes on a canonical match
  key so football-data + TheSportsDB copies collapse to one (richest copy keeps
  venue/crests); glow pulse on the next-big-match card + stadium venue display
  (TheSportsDB `strVenue` threaded through all three builders, cross-source
  merge fills missing venues).

## [11.37] — 2026-08-19

- Fix missing cup / EL / ECL data — sportscore cron now fetches only
  fd-missing comps (EL/ECL + 4 cups, 24 calls) so cup fixtures survive the
  Cloudflare 50-subrequest/invocation cap; `fetchLongView` cup sweep stops at the
  first found fixture; diag endpoint reports the competition breakdown.

## [11.36] — 2026-08-19

- Full IANA timezone picker with search + live ticking countdown bar; wire cup
  fixtures via sportscore (EFL/CDR slugs); remove tier badge; classify
  UCL/EL/ECL as European leagues; logo sticks to club name in match rows.

---

## Unreleased / queued for next session

- **Onboarding regression gate** — `scripts/check-join-flow.js` (wired into
  `npm test`): verifies `/start`, idempotency, `/teams`, `/follow all`,
  `/follow 1,3`, invalid `/follow`, `/stop`, and unknown commands against the
  real webhook handler extracted from `src/worker.ts`. Live-verified against the
  deployed worker (simulated `/start` → registered a user in KV, `/stop` cleaned
  up).
- **Free-tier note** — fan-out to Telegram is one subrequest per recipient; the
  ceiling is Cloudflare's 50 subrequests/invocation, not per-user storage. Not an
  issue at current scale; `checkUserCap` is warn-only.
- **Candidate follow-ups** (from earlier audit/asks, not yet acted on unless
  stated): PGL reliability (sportscore primary + KV-snapshot fallback), FA Cup
  tier/round filtering, EL/ECL qualifying relabel, scheduled-score hygiene
  (null `score` unless FINISHED/LIVE/PAUSED), BL1 season-freshness guard.
