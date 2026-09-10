# Changelog

All notable changes to the UCL Notifier are documented here, newest first.
Version strings follow the value exposed by the live `/api/status` endpoint
(see `src/worker.ts` `VERSION`).

---

## [12.9-weeklytables] — 2026-09-14 (end-of-week league tables in Telegram + /tables + admin force-send)

User ask: "I want telegram bot to show the table fixtures of selected leagues
at the end of the week; to test this, send league tables to bot now."

- **Weekly digest**: every Monday 01:30–06:00 Tehran (after the last European
  Sunday kickoff — La Liga's late slot ends ~01:20 Tehran), the cron delivers
  one Telegram message per selected league with its full table. Once per ISO
  week (`weekly_tables_v1` KV flag); the flag is set only when something was
  delivered, so an API outage / subrequest-capped run retries on the next
  10-min tick (standings are KV-cached by then) — the digest is never lost.
- **Selected leagues** = admin-settings leagues (`CONFIG.LEAGUES` after
  applySettings — currently CL, PL, PD, SA, FL1) + PGL (the Iranian league the
  user curated onto the site's standings grid). Adding BL1/AL in settings
  automatically joins them to the digest. Not-started tables (A-League
  pre-season) are skipped; CL's 36-team Swiss table is capped to the top 10.
- **Message format**: MarkdownV2, Persian digits, sequential rank renumbering
  (providers return tied positions — two teams on pos 6 — which reads like a
  data bug in chat), leader bolded, ⭐ marks the user's selected teams
  (normAlias-matched), footer points at football.sportsignal.ir.
- **On demand**: new `/tables` (also `/جدول`) bot command sends the same
  digest immediately to the requesting chat; new admin action
  `GET /send-tables` (Bearer ADMIN_TOKEN or admin session cookie) force-sends
  to every registered chat for testing — it does NOT consume the weekly slot.
- `/help` and the `/start` welcome now document `/tables`.
- **Data check (user: "check the showing leagues results")**: pulled every
  `standings_cache_*` from live KV — Hull City in the PL top 3 is NOT
  corruption: Hull appears in the 2026-27 PL fixtures (Chelsea–Hull 12 Sep,
  Newcastle–Hull 19 Sep), i.e. a promoted side in form. Duplicate `pos` values
  are the provider's tie convention (fixed for chat by renumbering; the site
  grid keeps provider positions).
- Version 12.9-weeklytables; ver strings fa/en × 3 page dicts; package 12.9.0.

---

## [12.8-bigmatch] — 2026-09-14 (big-match LOGIC — true big matches only, closest on top, countdown follows slot 1)

User ask, paraphrased: "in مسابقات بزرگ پیش‌رو I see Liverpool vs Fulham which is
not a big match — what's the logic?" The user's definition of a big match:
A: two selected teams play each other; B: the match that changes the 1st
position in the table; C: derbies; and only when none of those is around, a
selected team against a TOP-5 side of that league ("if Tottenham is not
selected but in the top 5 and Chelsea plays it, I want to know"). Always the
closest upcoming match on top, and the countdown belongs to it.

- **Qualification tightened (the Liverpool–Fulham rule)**: the box's fallback
  tier is no longer "any fixture with ≥1 selected team, then featured
  pairings". It is now a selected team vs a TOP-5 side of that league
  (isSelVsTop5, per current standings) — and nothing else. A/B/C
  (selected-vs-selected, both-top-3 summit clashes, derbies) fill the six
  slots first, the fallback tops up whatever is left; featured-only pairings
  no longer box.
- **Strict kickoff order**: the v12.7 band/tier ranking (live > ≤7-day
  matchweek > far; clash > derby > selected > featured within a band) is
  replaced by a single comparator — kickoff ascending. Live matches lead
  (their kickoff is in the past), then the closest upcoming match is ALWAYS
  on top. The derbies follow in kickoff order instead of jumping the queue.
- **The countdown belongs to the top match**: updateBigBar now targets the
  TOP BOX's slot 1 (topSpot.matches[0], legacy topSpot.next tolerated for
  ≤3-min stale KV) before nextBig — the page's one live countdown counts
  down to the closest big match the box leads with. Box empty → the old
  nextBig → first-big-upcoming → upcoming[0] chain applies.
- **Paris FC name fix** (audit backlog): the fa-dict stem fallback folded
  "Paris FC" (normKey "paris") onto "parissaintgermain" — the promoted
  Ligue 1 club rendered as پاری‌سن‌ژرمن (PSG) in Persian. Exact dict entry
  "Paris FC" → «پاری‌اف‌سی» wins before any fallback; "SC Paderborn 07" →
  «پادربورن» joins too (both clubs are visible on the current page).
- **Tests**: live-derby-test.js scenarios rewritten to the v12.8 contract —
  single-selected vs non-top-5 never boxes and stays in the upcoming list;
  new scenario 3b stubs PL standings and proves the fallback tier (selected
  vs top-5 boxes) AND the strict kickoff order (the closest fallback leads
  even over a core derby, topSpot.next = box top = countdown target).
- **Big-view empty state**: with every big match now boxed, the default
  "فقط بازی‌های بزرگ" view can legitimately have an empty upcoming list —
  instead of the stark "مسابقه‌ای در راه نیست" right below a 6-entry card it
  now says «بازی بزرگ دیگری در راه نیست — همه در جعبه بالا هستند» /
  "No other big match ahead — they're all in the box above" (new boxAll key,
  public-page fa/en dicts; T() key-fallback keeps other pages safe).
- Version 12.8-bigmatch; ver strings fa/en × 3 page dicts; package 12.8.0.

---

## [12.7-bigbox] — 2026-09-14 (🔥 مسابقات بزرگ پیش‌رو — the TOP BOX becomes a six-match card)

User ask, paraphrased: the "🔥 مسابقه بزرگ بعدی لیگ‌های داخلی" single-match card
becomes "🔥 مسابقات بزرگ پیش‌رو" — a box holding the closest big upcoming
matches (up to 6), so the Madrid derby (Atlético–Real Madrid) and the
Manchester derby can sit in the SAME box; a match that is both a derby and a
رقابت برای صدر جدول must show BOTH tags.

- **Up to SIX consolidated entries**: the TOP BOX pick pipeline (lgPool →
  single `topSpotNext`) is replaced by a ranked selection — big matches
  (selected-vs-selected clashes, derbies, genuine both-top-3 table clashes)
  get a 4-slot guarantee, the remaining slots fill with the nearest
  ≥1-selected fixtures, then featured (both-big) pairings. Display order:
  live > inside the ≤7-day matchweek > farther out; within a band
  clash > derby/top > selected > featured, then kickoff — so an imminent
  selected match still leads the card (the v12.4 headline semantics are
  preserved for slot 1) while the derbies are consolidated behind it.
- **Both tags, independently**: every box entry renders the 🔥 دربی badge AND
  the 🔥 صدر جدول badge independently — a fixture that is a derby and a
  top-of-the-table clash (e.g. a 1st-vs-2nd Clásico) shows both, never
  either/or. Each entry mirrors the uclspot row (live score, LIVE chip,
  minute, venue, per-entry share row) wrapped in a new `.spotitem` entry with
  soft dividers; share/calendar icons reveal per entry on hover/focus.
- **Payload**: `topSpot.matches` (array, ≤6) joins the legacy `topSpot.next`
  (kept for ≤5-min stale-KV compatibility — the client accepts both shapes).
  All box fixtures are excluded from the upcoming list (the box IS their
  presentation, v12.3 rule), and upcoming's "nearest big match" fallback card
  now skips a nextBig the box already presents (no duplicate presentation).
- **i18n**: hLgNext fa/en retitled («🔥 مسابقات بزرگ پیش‌رو» / "🔥 Big Upcoming
  Matches"); ver strings → 12.7 across the 3 page dicts.
- Version 12.7-bigbox; ver strings fa/en × 3 page dicts.

---

## [12.6-hazfi] — 2026-09-10 (جام حذفی ایران joins the cups card)

User ask, verbatim: "add جام حذفی ایران to this box [the 🏆 جام‌های حذفی card]".

- **Hazfi box lives in the cups grid now** (an 🇮🇷 ایران country group after
  انگلستان/اسپانیا/ایتالیا, same pattern as the other domestic cups):
  HAZFI_CUP joins cupOrder + countryOf("IR"), the client renders a 4th country
  group, and the fa/en dicts gain cIR. Emblem (leagues/719.png) and the Persian
  name (جام حذفی ایران) reuse the existing assets the retired Iran card used.
- **Real fixture source wired — sportscore `iran-cup`**: slug verified live
  against the fixtures API (2026-01-13: Foolad Hormozgan 0-2 Esteghlal Tehran,
  Shams Azar Qazvin 3-0 Tractor S.C. — genuine Hazfi 1404 results). The long-view
  cup day-sweep (10-day lookahead, stops at each cup's first fixture) now
  includes it, so the box fills itself the moment the 1405 R1 draw publishes;
  until then it shows the same honest "برنامه‌ای هنوز اعلام نشده" as the FA Cup
  and Copa del Rey boxes (the new season genuinely hasn't been drawn).
- **Display-only by design**: HAZFI_CUP is NOT added to DOMESTIC_CUP_IDS nor the
  near-scan slug filter — Hazfi matches never notify, never join the
  upcoming/finished lists, and the cron subrequest budget stays flat; the only
  extra cost is the long-view cup sweep (4 → 5 cups, worst case +10 day-calls
  while the cup is empty, mirroring the existing FA/CDR pattern).
- Version 12.6-hazfi; ver strings fa/en × 3 page dicts.

## [12.5-iranres] — 2026-09-10 (Iran table joins the league grid + Recent Results carries the week)

Two user asks, verbatim: "move iranian league to other leagues [the standings grid] ...
add iranian league table to it. and remove this [the Iran card]" and "نتایج اخیر shows
empty but it must show the recent results for example this weeks CL matches (which
their results were notified in telegram)".

- **Iran card retired; PGL table moved into the league-standings grid**: the
  #standings grid4 now renders 7 boxes (PL, PD, SA, FL1, BL1, AL, PGL) from one
  d.standings payload — standings.PGL is built server-side from the same
  KV-backed sportscore table the old card used (compact top-8, same
  emblem/flag). The dedicated card (iranHead, collapse button, Hazfi box) is
  fully removed: HTML, CSS (.iranHead/.collapsebtn),
  renderIran/initIran/toggleIran/iranHidden, the 'iran' payload key, the fa/en
  dict keys and the boot/rerender calls. PGL stays out of standCodes, so top-3
  badge semantics (domestic leagues only) are untouched. The Hazfi cup box was
  retired with the card (no fixtures announced — nothing to show).
- **Recent Results fixed (was always empty)**: the finished-results window was
  12 HOURS — every morning after a matchday the card emptied, so this week's CL
  results (the exact ones the bot notified on Telegram) never showed. Now:
  - fetchLongView sweeps 7 days of past matches (was the bot's 2-day near
    window). Still 10 ten-day FD chunks — the first chunk simply starts
    earlier — so the subrequest count is unchanged.
  - the finished filter keeps its notification semantics (shouldNotify ||
    top-3 involved) but extends 12h → 7 days and 5 → 12 rows, newest first.
  - withTop now stamps p.sel (≥1 selected team — "big for THIS user", the
    v12.4 box rule); the finished card's big-only-view filter accepts it, so a
    notified single-selected CL result (e.g. Real Madrid vs Leipzig) can never
    vanish behind the big view. Upcoming big-view semantics unchanged.
- Version 12.5-iranres; ver strings fa/en × 3 page dicts.

## [12.4-clprox] — 2026-09-10 (CL BOX proximity rule — far pairings yield to near selected-team matches)

The user's rule, verbatim: "when a selected-vs-selected CL pairing is far away
(even weeks or months) the CL box should prioritize matches that AT LEAST one
party of match is one of selected teams — FOR EXAMPLE: REAL MADRID VS LEIPZIG."
Live case that triggered it: through the Sep 10 → Oct 13 CL calendar gap the
CL BOX counted down 33 days to the selected-vs-selected Atlético–ManUtd
pairing while ManUtd–Sabah kicked off in minutes — an imminent single-selected
fixture was crowded out by a distant two-selected derby.

- **CL BOX (`ucl.nbig`) pick order rewritten**: live selected-vs-selected >
  live ≥1-selected > live both-big > selected-vs-selected within 7 days (its
  matchweek — the v12.3 "TOP CL GAME" rule, preserved) > earliest ≥1-selected
  match (kickoff order; the two-selected game still wins equal kickoffs) >
  earliest both-big pairing > plain next fixture with the neutral label. So
  "Real Madrid vs Leipzig" (only Real Madrid selected) headlines while the
  two-selected derby is weeks/months out, the derby takes the box back inside
  its matchweek, and a distant derby still headlines when it is the only
  remaining match involving a selected team.
- **TOP BOX mirrors the rule** ("repurposed for matches/teams"): while the
  domestic selected-vs-selected clash is far away, the box headlines the
  earliest domestic fixture with ≥1 selected team; the far clash stays in the
  upcoming list leading its league section (m.clash sort) whenever it is
  inside the end-of-month window. Near/live clashes keep the box exactly as
  in v12.3, and the headline fixture is still excluded from the list (the box
  IS its presentation).
- **`nbig.big` label widened**: a headline involving a selected team is "big"
  for this user (drives the 🔥 "مسابقه بزرگ بعدی" label); only the plain
  both-unselected fallback keeps the neutral "next UCL match" wording.
- **CL BOX live rendering parity** (`renderUclSpot`): a live headline now
  shows the score + LIVE chip instead of a countdown (mirrors `renderTopSpot`)
  plus the 🔥 derby badge — the proximity rule can legitimately put a followed
  team's live game in the box.
- Verified with a 21-scenario harness that evals the real extracted selection
  code (far/near/boundary/tie/live/empty cases for both boxes).

---

## [12.3-topbox] — 2026-09-10 (TOP BOX — selected-vs-selected headline rule)

The user's rule, verbatim: "TOP CL GAME: when two selected teams play together
→ in the CL BOX. TOP LEAGUE (internal leagues): when two selected teams play
together → in the TOP BOX." A domestic-league fixture where BOTH sides are
selected teams (e.g. the Manchester derby) is a headline match — it must
present at the TOP of the upcoming matches, not 3rd/4th in kickoff order.

- **TOP BOX added**: a new `card topspot` ("🔥 مسابقه بزرگ بعدی لیگ‌های
  داخلی") renders directly above the games list (below the UCL spot = CL
  BOX). Its headline fixture is the nearest selected-vs-selected domestic
  league clash (live first, then kickoff, 90-day horizon). The headline
  fixture is excluded from the upcoming list — the box IS its presentation —
  so the derby can never appear "buried at 3rd/4th priority" again.
- **CL BOX rule tightened** (`ucl.nbig`): the UCL spot headline now prefers a
  selected-vs-selected CL pairing, then any featured (big-pool) pairing, then
  the next UCL fixture with the neutral label. `nextBig`/bigbar likewise count
  a selected-vs-selected pairing as featured.
- **Remaining clashes stay visible**: further selected-vs-selected fixtures
  keep their list slots, carry a new `m.clash` flag, lead their section
  (stable sort), and are never filtered out of the big-only view.
- **Provider legal-name aliases** (root cause found while wiring the rule):
  football-data returns "Club Atlético de Madrid" and "FC Internazionale
  Milano", which never normalized to the selected lists' short forms
  ("Atlético Madrid", "Inter Milan") — Atlético/Inter matches, big/derby
  flags and notifications silently missed those clubs (the Madrid & Milan
  derbies were even un-badged in the live API). A small match-side alias map
  (`TEAM_ALIASES`/`normAlias`) now folds provider variants onto the
  selected-list keys in `shouldNotify`, `isFeaturedMatch`, `isDerby`,
  `isMasterBigMatch` and `userFollowsMatch`; the FA dictionary gains exact
  entries so the Persian names render (اتلتیکو مادرید / اینتر میلان).
- **Gates**: live-derby-test now evals the alias/master helpers, asserts
  FD-legal-name derby/notification/featured detection, and runs a new
  scenario 3 covering the TOP BOX pick, list exclusion, clash flags and
  nextBig preference; check-cups stubs `isMasterPair`. 10/10 gates green.

---

## [12.2-topclash] — 2026-09-10 (v12.1 regression hotfix)

Two user-reported regressions of the 12.1 future-plan release, fixed live.

- **"Virtually every match badged 🔥 صدر جدول" fixed**: 12.1 flagged ANY
  fixture involving a top-3 side — with 6 leagues × 3 sides that stamped the
  badge on 41 of 50 upcoming cards (live evidence) and flooded the default
  big-only view. The concepts are now split: a top-3 side's fixtures still
  JOIN the schedule (the original inclusion ask, e.g. an unselected
  Newcastle), but the badge, the "🔥 رقابت‌های صدر جدول" section and the
  big-view filter are reserved for genuine top-of-the-table clashes — BOTH
  sides inside the top 3 (e.g. Roma 1st vs Inter 2nd). Single-top fixtures
  render as regular league games.
- **Next-big-match box back on top**: the UCL spot card ("🔥 مسابقه بزرگ
  بعدی لیگ قهرمانان اروپا") sat BELOW the games list; the badge flood
  buried it between the upcoming sections and the UCL card. The card now
  renders above the games list (static HTML reorder) — it is the headline
  fixture of the page, games follow it. The renderSpecial fallback (no big
  match inside the month window) still pins the nearest big match on top of
  the list.
- **Duplicate match cards fixed** (amplified the flood — 10 pairings showed
  twice): providers report the same fixture with kickoffs ~a day apart (FD
  day-N evening vs TSP day-N+1 default slot, 19–31h observed). The dedupe
  key carried the UTC date, so both copies survived. `canonDedupe`
  (`src/dedupe.js`) gains a pairing-proximity pass: same competition +
  same ordered pairing within 48h collapses to one row, keeping the earlier
  kickoff (the authoritative slot in every observed pair) and adopting
  venue/crests from the dropped copy; identical non-empty ids (the same
  provider fixture drifted/rescheduled — observed 53h apart) merge
  regardless of distance with the fresher copy winning. The near-scan pool
  (`fetchMatchesFromAPI`) is deduped before notifications too, killing the
  double "match started" risk. Real distinct meetings of the same ordered
  pairing are weeks apart, so the window cannot over-merge.
  `scripts/check-dedupe.js` gains 9 assertions covering the new passes.
- Live result: KV pool 811 → 710 matches, 101 → 0 duplicate pairings; the
  public page serves 42 unique cards with exactly 2 صدر جدول badges
  (Paris FC–Lyon, Roma–Inter) and a 3-card big view.
- `src/dedupe.js` normalized CRLF→LF (worker.ts was already LF; mixed
  endings broke exact-match edits).

---

## [12.1-futureplan] — 2026-09-10 (برنامه آتی — future-plan fixes)

User-reported product fixes, tagged `Future-plan fix` / `Future-plan ask` in source.

- **False "match started" alerts fixed**: the match-start window opened 45
  minutes BEFORE kickoff (`MATCH_START_WINDOW_MINUTES: 45`), so a 22:30
  kickoff was announced "🚨 بازی شروع شد!" at 21:45. `isMatchStartingNow`
  now fires only after the real kickoff (−1 min clock-skew grace … +20 min
  catch-up so the 10-minute cron always lands inside the window) and never
  for finished/postponed/suspended/cancelled fixtures. KV dedupe still keeps
  it to one message per match.
- **"All Champions League games marked big" fixed**: the UCL spot headline
  ("🔥 مسابقه بزرگ بعدی لیگ قهرمانان اروپا") featured ANY next CL fixture —
  live evidence: Fenerbahçe–Roma (`big: false`) was presented as a big match.
  The spot now features the next CL pairing of two big clubs
  (`isFeaturedMatch`); when none is on the horizon it falls back to the next
  fixture and the client shows the neutral "مسابقه بعدی" headline (driven by
  `nbig.big`).
- **Top-of-the-table competition (رقابت‌های صدر جدول)**: the top 3 of each
  country's current league (PL, PD, SA, FL1, BL1, AL) now join the schedule
  even when neither club is a selected team — e.g. a top-3 Newcastle side
  outside the English selection. The page gains a dedicated "🔥 رقابت‌های
  صدر جدول" section plus a per-card 🔥 badge; top-of-the-table fixtures also
  surface in the "big matches" view and in recent results. Pre-season
  (unstarted) tables are ignored; team-name normalization is memoized per
  sweep so CPU cost stays flat.
- **League tables hardening**: standings no longer blank out when
  football-data 429s (the fixture sweep spends most of the 10 req/min free
  budget). Failed refreshes now serve the last good table, and at most 2 FD
  tables refresh per sweep via a clock-derived time-sliced rotation (no
  extra KV writes). Ligue 1 (FL1) joins the site's league tables.
- **Club badges**: crest images now load with `referrerpolicy=no-referrer`;
  a failed or missing crest renders a clean two-letter club monogram
  instead of a bare ⚽.
- **Share/calendar icons**: shown only while hovering (or keyboard-focusing)
  a match card on precision pointers; touch devices keep them always
  visible (`@media (hover:hover) and (pointer:fine)`).
- Test gates updated: check-notify-windows asserts the post-kickoff window;
  check-cups stubs `isFeaturedMatch` and now generates fixture dates
  relative to "now" (its 3 old failures were stale hardcoded 2026-09 dates,
  not code bugs).
- Version 12.1-futureplan; page i18n gains `hUclNextAny` / `boxTop` /
  `topBadge`; subtitle updated to mention the new section.

---

## [12.0-hardened] — 2026-09-10 (audit remediation)

Full-stack audit remediation — all 17 findings from the Phase 1–5 audit
(repo: assadigit/SportSignal). Every change is tagged `Audit fix N` in source.

**Critical reliability (the live error-1101 outage):**
- Webhook responds **200 OK immediately**; all command processing moved to
  `ctx.waitUntil` background (`handleTelegramUpdate`). Telegram can no longer
  drop/timeout slow webhooks.
- **`update_id` dedupe** (KV, 10-min TTL) — Telegram re-deliveries are no-ops;
  handler errors are swallowed (no 500 → no infinite re-delivery loop);
  non-message updates are tolerated.
- **Subrequest budget**: soft counter (cap 48, reset per invocation) in
  `fetchJSON`/`fetchWithRetry`/`sendTelegram`; Cache API (5-min TTL) on
  sportscore/TheSportsDB day feeds (cache hits cost 0 subrequests); sportscore
  cron range 4→3 dates; fetchLongView EL/ECL/BL1 sweep 10→7 days and fully
  failure-tolerant; TSP day-sweep only when per-league calls came up empty;
  `/next` reuses the cron's ≤10-min KV pool instead of a live sweep.
- **Public API outage fixed**: `/api/public-matches` single-flight refresh lock
  (45s) + per-IP courtesy limit (60s) + stale-serve + route try/catch with a
  degraded empty shape — never a raw 500 again.
- **KV writes ≤ ~500/day** (was 1,008–1,152 vs 1,000 free cap): heartbeat +
  last_cron consolidated into `cron_status_v1` (legacy fallback readers), no
  lock delete (TTL expiry), `last_api_source` written only on change, match
  cache skipped when the merged pool is unchanged, notification cleanup once
  per hour.

**High:**
- CPU: `shouldNotify`/`isFeaturedMatch`/`masterTeamList`/`userFollowsMatch` now
  use identity-invalidated normalized Set caches; `translateTeam` builds its
  ~600-entry dict once with Map indexes (was: rebuilt per call).
- `saveNotifiedMatch` KV put is failure-tolerant (one write can no longer abort
  a run's remaining notifications).
- Admin sessions: cookie now carries a random session id (`admin_sess_<id>`,
  12h TTL) — **ADMIN_TOKEN never leaves the server** (was: cookie value AND
  localStorage). Client authenticates via HttpOnly cookie; re-login takes the
  admin password.
- Execution lock is ownership-verified (`own:<ts>:<uuid>` write + read-back).

**Medium/Low:** timing-safe compares (webhook secret, Bearer, password, PBKDF2);
429s pause all sends ≤10s instead of blocking sleeps; `/timezone` replies escape
underscores (MarkdownV2 fix); `/api/status` masks chat ids; `/api/diag-fd` no
longer leaks the API key tail; `getNowTehran` reimplemented deterministically
(formatToParts; wall-clock-as-UTC convention preserved); verbose per-item logs
gated behind `LOG_VERBOSE`.

Gates: all 10 scripts pass (check-cups' 3 failures are pre-existing, unchanged);
`live-derby-test` extraction updated for the `fetchPublicMatches(env, req)`
signature. fd retry attempts 3→2; TSP fallback window -2/+4 → -1/+2 days.

## [11.52] — 2026-08-19

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
