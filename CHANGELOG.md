# Changelog

All notable changes to the UCL Notifier are documented here, newest first.
Version strings follow the value exposed by the live `/api/status` endpoint
(see `src/worker.ts` `VERSION`).

## [12.20-uxpolish] — 2026-09-13 (leaner bot alerts, real countdown + progress bar, badge tokens, wide 2-column layout, sticky CTA)

User asks: remove the notification text noise ("🔔 یادآوری ۲۴ ساعته …", "📱
یادآوری بعدی: ۳ ساعت قبل از بازی" and "generally remove all kind of these text
that do not add any value and feel repetitive"); fix the countdown timer to
calculate real d/h/m/s and bind the progress bar to the actual time remaining;
darken the top-of-table badge for WCAG AA contrast; a wide-viewport layout at
≥1440px; a sticky Telegram join CTA; a proper 44px share toggle with a visible
label + three-dot icon; named badge color tokens; a visible "updated X minutes
ago" stamp. (The Tailwind-flavored suggestions were implemented with this
stack's own primitives — CSS custom properties + a plain CSS media query.)

- **Leaner bot messages**: every repeated no-value line is gone — the 🔔
  24-hour boilerplate and all "📱 یادآوری بعدی / اعلام بعدی" footers (24h,
  big-match, 3h, 1h), the 🔥/🎯 hype lines, the 📺/🏃 kickoff fillers, and the
  weekly digest's "start & result are sent automatically" footer. Each message
  now ends after its facts: teams, competition, date, time, ⏳ countdown.
- **Countdown fixed (data-binding bug)**: the clock renders zero-padded
  day/hour/minute/second values — the old unpadded format could render
  "1:1:5"-style garbage that read like repeating placeholder "1"s. The
  progress bar now fills with the TIME REMAINING (rem / 14-day horizon): full
  ≥2 weeks out, draining to 0% at kickoff, so bar and label agree at both
  ends. The old `1-rem/14d` formula rendered a match one day away ~93% full —
  reading as "already done". The fake fixed 42% idle width became a low 12%
  standby strip.
- **Badge color tokens** (not Tailwind — CSS custom properties): `--badge-top`,
  `--badge-hot`, `--badge-derby`, `--badge-league`, `--badge-live` defined for
  dark + light themes and referenced by `.topbadge`, `.derbybadge`, `.comp`,
  `.livechip .dot`. The top-of-table badge is now solid `#B03A2E` with its
  white text (6.02:1 — WCAG AA pass; the old gradient sampled #D06E07 at
  3.55:1).
- **≥1440px two-column grid**: `body` becomes a 2-column grid (max-width
  1400px); the topbar, hero header, countdown hero card and footer span both
  columns; the section cards flow two-per-row. Below 1440px the 760px single
  column is untouched.
- **Sticky Telegram join CTA**: once the hero join button scrolls out of view
  (past, not merely below), a fixed bottom bar with the Telegram plane +
  label appears — `env(safe-area-inset-bottom)` padded on phones, and
  `body.joinsticky` adds bottom clearance so it never covers content. Hides
  again when the hero button returns to view.
- **Share toggle rebuilt**: a labeled pill — horizontal ⋯ three-dot icon +
  «اشتراک‌گذاری»/"Share" text — min 44×44px tap target (was 24px), tooltip
  kept, still at the row's inline-end (logical properties, RTL/LTR-safe). The
  option buttons grew 24→34px.
- **Visible auto-update proof**: the API already stamped `fetchedAt` on every
  payload — the page now renders it as «آخرین به‌روزرسانی: X دقیقه پیش» /
  "Last updated: X min ago" under the subtitle (Persian digits in fa), aging
  live every second, refreshed on each fetch.
- Version bump everywhere: `VERSION` const, the six page-dict `ver` strings +
  the admin static footer, `package.json` 12.20.0; new `check-v1220.js` suite
  (51 assertions); the rolling version-gate checks updated
  (check-weekly-report H1–H3, check-fa-ai C11b–d, check-v1218 G1–G3 + the E2
  share-glyph assertion).

## [12.19-tzsettings] — 2026-09-12 (timezone settings behind a gear icon, fully bilingual zone names, every GMT offset)

User asks: "Hide this behind a setting icon, next to darkmode/lightmode" (the
timezone select + search were permanent topbar clutter); "make sure it has all
GMT times, for example i didn't find Tehran +3:30"; "In farsi, it must show
farsi GMT names, in English, show english."

- **Settings-gear popover**: the timezone search + select moved out of the
  topbar into ONE ⚙️ button next to the dark/light toggle. A click opens a
  compact glass popover (full-width search + full-width select — far bigger
  touch targets than the old 100px sliver); picking a zone re-renders all
  times instantly and closes the panel. ✕, the gear again, an outside click
  or Esc also close it. `aria-expanded`/`aria-controls` track state; the gear
  rotates 90° while open.
- **Every GMT time**: the list is the full IANA set (`Intl.supportedValuesOf`)
  PLUS the complete fixed-offset ladder Etc/GMT-14 … Etc/GMT+14 (IANA sign
  inverted), so every pure GMT offset from −14 to +14 is selectable. Offsets
  are computed from the zone data itself — Tehran **+3:30**, Kathmandu
  +5:45, Eucla +8:45, Chatham +12:45 are always exact.
- **⭐ Popular group**: UTC, Tehran, Dubai, Istanbul, London, Paris, Berlin,
  New York, Los Angeles pinned at the very top — Tehran +3:30 is now one
  glance away instead of 80 entries deep inside Asia.
- **Fully bilingual labels**: a hand-transliterated Farsi dictionary covers
  every IANA region + city (430+ entries, incl. the Argentina/Indiana/
  Kentucky/North_Dakota subtrees and their legacy aliases). In fa mode the
  options read «آسیا/تهران گرینویچ+۳:۳۰» (Persian digits, GMT = گرینویچ);
  in en mode "Asia/Tehran GMT+3:30". Language switch rebuilds the options.
- **Search matches both scripts**: «تهران», "tehran", "3:30" and "۳:۳۰" all
  find Asia/Tehran; the search box also localizes (placeholder via i18n).

## [12.18-weeknext] — 2026-09-11 (VS slot removed entirely, UCL club crests, next-week takeover, +35% PC crests, share behind a toggle, varzesh3 grounding)

User asks (one batch): remove the divider line that replaced the VS emoji
("it's just visual noise. remove it fully"); a Workers-AI API token for
external use + varzesh3.com/leagues as the Farsi-name directory; round club
logos in the UCL table; the Friday problem — by Friday every game of the
Iranian week has kicked off so the box was a wall of turned-off matches
("I want to see this week matches like on Monday… but also it's pointless
to see all turned off matches in Friday — find a smart solution"); club
logos +35% bigger on PC; and the share options hidden behind a single
toggle icon on both PC and mobile ("not very frequently used feature and
produces visual noise").

- **No separator at all**: unplayed match rows render ONLY the two team
  sides (🆚 emoji → hairline divider → nothing, per the user's two-step
  ask); the middle slot exists exclusively for real scores
  (finished/live). All `.vs` CSS retired.
- **UCL round club crests**: every row of the Champions League table now
  carries the club's round crest (19px circle, same visual language as the
  match rows), resolved server-side against the 123-club KV catalog —
  a KV-ONLY read, no refresh fetch in the public path (frugality kept);
  catalog misses render text-only rows exactly as before.
- **Next-week takeover (the Friday fix)**: the payload now carries
  `nextWeek` (the Saturday→Friday AFTER the current week, same pool —
  zero extra API calls). `renderWeek` keeps "this week" semantics while
  anything is still ahead (dimmed past games below the upcoming ones),
  and when the current week is exhausted — late Friday — the card
  switches to next week's fixtures with the header «📅 هفته بعد»
  (hWeekNext i18n). Language switch re-renders the week + UCL cards via a
  new public onLang hook so the dynamic header survives trText.
- **PC crests +35%**: `.logo` 38px → 51px (monogram fallback scales to
  22px); phones keep their own 46px rule.
- **Share behind a toggle**: the WhatsApp/Telegram/Email/Calendar/Copy row
  is hidden everywhere (PC hover-reveal + always-on-touch both retired)
  behind ONE compact share-nodes glyph button; a click expands the options
  (aria-expanded tracks state), a second click collapses them.
- **varzesh3 grounding (the user's directory)**: new
  `scripts/varzesh3-catalog.js` scrapes the varzesh3.com league tables
  (UCL, PL, La Liga, Serie A, Bundesliga, Ligue 1, Iranian PGL, UEL, UECL
  — 193 clubs) and pushes them to KV `varzesh3_clubs_v1` via the
  Cloudflare API (local script — zero Worker subrequests). The AI learner
  now grounds translations: the varzesh3 rosters ride in the prompt
  ("return EXACTLY that spelling") and every accepted answer SNAPS to the
  catalog's exact spelling (space/ZWNJ-insensitive match). The provided
  Workers-AI REST token is stored in `.env` (CLOUDFLARE_AI_TOKEN — AI runs
  only; KV writes keep the older token).
- **Hygiene**: `/api/fa-teams` stats now report the varzesh3 catalog size;
  new `scripts/check-v1218.js` (42 assertions); check-fa-ai.js section A
  updated to the "fully removed" contract; check-weekly-report.js anchors
  fixed for the crest if/else + nextWeek; check-cups.js neutralizes the
  crest await for its sync harness.

---

## [12.17-fai] — 2026-09-15 (faded VS divider, expired games in «در این هفته», incremental AI Farsi club names)

User asks (one batch): the 🆚 emoji between team names is mis-aligned and
noisy — replace it with a low-key symbol or a faded line; the «در این
هفته» box must render games whose kickoff passed as "turned off"
(expired); and a creative way to translate ALL clubs to their Farsi names
— research requested, Cloudflare Workers AI suggested as the incremental
engine (translate → store in DB → show Farsi next sessions).

- **Faded VS divider**: the 🆚 emoji is retired everywhere. In the match
  rows (upcoming list, big-matches box, hero, this-week box, UCL box) the
  "vs" slot now renders as a hair-thin **faded vertical line** (1px × 20px,
  `background:currentColor`, opacity .32 — .55 on hover), perfectly
  centered and RTL-safe; finished/live rows still show the score in the
  same slot. Text contexts (share text, cups card, admin match list) use a
  low-key en-dash " – " separator. The decorative divider is aria-hidden.
- **Expired week games**: `renderWeek()` marks every game whose kickoff
  ran out (FINISHED, or kickoff older than 90s without a score) with the
  `past` state — the whole entry dims (opacity .48) and desaturates, crests
  gray out, and the time chip becomes a muted «⌛ پایان‌یافته» (wkdone)
  pill instead of a fresh kickoff time. Live games are never past. Order:
  live → upcoming (soonest first) → past (most recent at the bottom).
- **Incremental Farsi club names (research → shipped)**: providers offer
  no Farsi locale; Wikipedia interlinks are high-quality but rate-limited;
  the shipped design is the user's suggestion — **Cloudflare Workers AI**
  (`[ai]` binding, llama-3.3-70b with llama-3.1-8b fallback), one batched
  call for up to 16 currently-unknown names, strict JSON prompt, and a
  validation gate (Persian letters only, 2–42 chars, no Latin leakage).
  Valid pairs are stored in KV `fa_teams_ai` under normalized keys and
  served FOREVER; rejected/missing answers cool down 12h before re-asking.
  `translateTeam()` layers: static dict → AI cache → stem fallback (the
  static Varzesh3 dict always wins). The learner runs from the cron (every
  10-min tick, throttled to one round / 15 min, zero AI calls when all
  names are known) and opportunistically on public page hits
  (`ctx.waitUntil`) — the NEXT payload build (≤5 min) shows the Farsi
  names. Telegram notifications translate through the same cache.
- **Admin**: `GET /api/fa-teams` (stats / `?run=1` force / `?forget=NAME`
  correction) + a «🧠 ترجمه هوشمند نام باشگاه‌ها» card — learned/pending
  counts, a scrolling sample of learned pairs (fa ← latin key), the 🔄
  force-run button and a forget-a-bad-translation input. 12 fai i18n keys
  in the login+admin dicts (fa+en).
- **Hygiene**: graceful `ai-disabled` degrade when the binding is absent;
  KV-only reads in the hot path; version gates updated in
  check-weekly-report.js / check-uniform.js / live-derby-test.js; new
  `scripts/check-fa-ai.js` (49 assertions: divider CSS + DOM sites, week
  past-state + i18n, layering/priority, validation, collector, learner
  e2e with a stubbed AI, cooldowns, wiring, admin card, versions).

---

## [12.16-weekly] — 2026-09-15 (weekly report round: full UCL league table, week-ahead digest, unmissable derby/UCL banners, bot members directory, «در این هفته» box, dark-mode default, bigger mobile crests, API frugality, Iranian top-8 fix)

User asks (one batch): a detailed UCL league table (only points were shown —
add matches played, goals scored etc.); a Telegram weekly report with the
league tables AND the coming week's fixtures; derbies and both-selected UCL
duels emphasised so nobody misses them; an admin panel list of every account
that joined the bot (telegram ids + slugs); dark mode as the UI default;
club crests ~50% bigger on mobile; the Iranian league showing top 8 like
every other league (was top 5); and API thrift (no more ~144 provider sweeps
a day).

- **Detailed UCL table**: the Champions League card is a COMPLETE league
  table now — `# | team | MP | W | D | L | GF | GA | GD | Pts` in the
  standard order, with a sticky header row (two-line-capable Persian labels).
  football-data already serves every stat (`playedGames/won/draw/lost/
  goalsFor/goalsAgainst/goalDifference`); the standings cache, the public
  payload and `renderUcl()` all carry them through. The W/D/L/GF/GA middle
  columns fold away on phones (≤600px), leaving `# | team | MP | GD | Pts`;
  missing stats render as "—" (old cache shape) and GD falls back to GF−GA.
  UCL top-8 rows keep the ⭐-style `top3` tint (qualification zone).
- **Weekly report round**: the end-of-week digest (Monday 01:30–06:00
  Tehran, once per ISO week) now appends the **week-AHEAD fixtures** of the
  followed teams (7 days, straight from the KV pool — zero extra API calls):
  derbies LEAD with ⚔️🔥 + bold, both-selected UCL duels follow with 🏆🔥,
  then the rest with ⚽, capped with a "+N more" tail; one message per chat,
  ONE week flag for both deliveries (an all-failed run retries next tick).
- **Unmissable emphasis banners**: EVERY bot notification for a qualifying
  match is prefixed with a banner — `⚔️🔥 *دربی حساس* 🔥⚔️` for derbies and
  `🏆🔥 *دوئل بزرگ لیگ قهرمانان اروپا* 🏆` when both sides are selected UCL
  clubs (Telegram bold; ordinary matches get nothing).
- **Bot members directory**: `GET /api/members` (admin-gated) + a new
  «👥 اعضای ربات» card in the admin panel listing every chat that /start-ed
  the bot with its **telegram id, @username (slug)**, display name/group
  title and join date. Profiles are captured from incoming updates
  (best-effort); members who never messaged are backfilled on demand via
  `getChat` (≤40 per call, cached into KV `user_profiles_v1` so each member
  is fetched at most once). Loads at boot + (re)login; 🔄 re-fetches;
  re-renders on language switch.
- **«در این هفته» box**: new public card showing the CURRENT Iranian week
  (Saturday→Friday) — every followed/top-3 match of this week in kickoff
  order, live first; played games keep their final score; hidden when the
  week has no followed games. Computed from the same pool (zero extra API
  calls), capped at 16 rows.
- **Dark mode is the DEFAULT** on all three pages (public/login/admin): the
  boot script + `initTheme()` fall back to `"dark"` (no stored preference →
  dark; the toggle still persists the choice).
- **Mobile club crests ~53% bigger**: 30px → 46px circles (`.logo`), team
  names wrap beneath — they were too small to read.
- **API frugality**: the cron still ticks every 10 min, but the full provider
  sweep only runs when it MATTERS — a followed match is live, kicks off
  within 1h, or ended <8h ago; quiet periods reuse the KV match pool (sweeps
  at most every 2h instead of ~144×/day). Pre-match reminders keep firing
  from the pool. A provider circuit breaker suspends sportscore for 45 min
  after a fully-failed sweep (it is currently serving a bot challenge)
  instead of burning subrequests on every tick.
- **Iranian league top-8 (root cause found)**: TheSportsDB's free tier
  truncates `lookuptable` to 5 rows — that preview WAS the PGL table (every
  other league comes from football-data, which is why they showed 8). New
  chain: sportscore (bot-challenged, may recover) → **Wikipedia's per-season
  PGL table template** (ALL 18 teams with W/D/L/GF/GA, anonymous-friendly) →
  TheSportsDB accepted ONLY when not truncated (≥8 rows). The site grid now
  shows the same top-8 for Iran as for every other league, with full stats.
- **Tests**: new `scripts/check-weekly-report.js` (48 assertions: table
  columns/order/fold/i18n, banners, week-ahead, members, frugality, PGL
  chain, this-week box, dark default, crests, versions);
  `check-weekly-tables.js` gained the week-ahead delivery scenarios;
  `check-cups.js`/`live-derby-test.js` stub the new this-week dependencies;
  `check-uniform.js` tracks the 12.16 version. Full `npm test` green.

## [12.15-uniform] — 2026-09-15 (uniform club names + automatic UCL selection)

User ask: the same club was stored under two names ("FC Bayern München" /
"Bayern Munich") — uniform them; and every club added in any league should
be automatically selected for the Champions League too (so its UCL matches
surface).

- Root cause: the code DEFAULT for BL1 shipped both spellings, and the
  name-normalizer could never fold the English exonym "Munich" onto the
  German "München". Fix: one default name; `bayernmunich→bayernmunchen`
  alias; `canonicalizeTeams()` folds every stored list onto the EXACT
  catalog name (KV clubs catalog when present, normAlias dedupe otherwise)
  on BOTH the read path (cron + admin + public) and the save path.
- `syncUclSelection()`: CL = CL-explicit ∪ all leagues — every followed club
  is auto-selected for the UCL; the admin add-flow mirrors it with a toast,
  the CL box shows the auto-selection hint, and the duplicate guard is
  variant-proof ("Bayern Munich" is recognized as "FC Bayern München").

---

## [12.14-clubs] — 2026-09-15 (admin panel club-name autocomplete backed by a pre-downloaded clubs catalog)

User ask: when adding clubs, the admin had to guess the exact provider name —
typing "Roma" while football-data labels the club "AS Roma" (or "Inter Milan"
vs "FC Internazionale Milano") would silently never match a fixture side.
Request: pre-download a database of clubs from the same API, so typing "Ro…"
autocompletes and confirms the catalog has the club.

- **Clubs catalog in KV (`clubs_catalog`)**: `refreshClubsCatalog()` pre-downloads
  the roster of every covered competition from the SAME providers the matcher
  reads — football-data `/v4/competitions/{code}/teams` (CL, PL, PD, SA, FL1,
  BL1; sequential, ≤6 authed GETs, per-code failure-tolerant) plus the
  A-League from sportscore standings (fd doesn't serve it). A club in several
  competitions dedupes into ONE entry with multiple league badges and the
  merged shortName/tla/crest. Auto-refreshed when missing or older than 14
  days (CLUBS_STALE_MS); `?refresh=1` forces a rebuild.
- **`GET /api/clubs?q=&hint=` (admin-gated)**: prefix-scored search over the
  catalog — exact name > exact shortName > name prefix > shortName prefix >
  tla exact > substring, with a +0.6 bump for the league box the admin is
  typing in. Diacritics/punctuation fold ("atletico" finds "Club Atlético de
  Madrid"). No `q` → catalog meta (count + fetchedAt) for the panel's meta
  line. Never a raw 500 (audit-fix-6 pattern).
- **Admin panel autocomplete**: every "add club" input is now a combobox —
  typing ≥2 chars (170ms debounce) queries `/api/clubs` and renders a
  dropdown of up to 8 suggestions (crest, exact name, short name, league
  badges); ↑/↓ navigate, Enter picks the pre-highlighted first row ("type Ro,
  press Enter" stores Roma), Esc closes. Picking a suggestion adds the chip
  with the EXACT provider name immediately (+ duplicate guard), so a stored
  team can never again be a name variant the matcher won't see. Free-typed
  names still work via the add button — the catalog is a guardrail, not a
  gate. Plus: a catalog meta line («فهرست باشگاه‌ها: N باشگاه — بروزرسانی:
  date») and a 🔄 refresh button in the settings card.
- i18n: 10 new keys (acHint, acNone, acAdd, acDup, btnClubs, clubsMeta,
  clubsNone, mClubs, clubsErr) in fa+en on all three page dicts; version
  labels bumped to ۱۲.۱۴ / v12.14.
- New self-check `scripts/check-clubs.js` (23 assertions): catalog dedupe/
  merge/AL/KV write, search ranking (hint bump, tla, diacritics fold, empty
  and degraded cases), and route/wiring presence. Wired into `npm test`.

---

## [12.13-ordergrid] — 2026-09-15 (league tables 3-per-row on PC / 2 on mobile; big-matches box above the UCL box)

User ask: league tables on PC must show THREE columns per row (like
[A][B][C] / [E][F][G]) and two on mobile — the auto-fit grid packed four
leagues per row; and the UCL games box must sit BELOW the other big matches
(reading order: [next big match countdown and teams] → [big upcoming
matches] → [big upcoming UCL matches]).

- **Standings grid fixed**: `.grid4` is now explicit —
  `grid-template-columns:repeat(2,1fr)` base (mobile) and
  `@media (min-width:601px){...repeat(3,1fr)}` (PC). The page caps at 760px,
  so desktop renders the 6 leagues as two tidy rows of three ~233px boxes;
  phones keep two per row. The old `repeat(auto-fit,minmax(150px,1fr))`
  (which packed 4 per row on desktop) is retired.
- **Section reorder**: `#topspotCard` («🔥 مسابقات بزرگ پیش‌رو» — big upcoming
  matches) now sits between the hero card and `#uclSpotCard` («🔥 مسابقات مهم
  لیگ قهرمانان اروپا» — big upcoming UCL matches): hero (countdown + its
  match) → big domestic/overall big matches → UCL matches → UCL standings →
  league tables → tournaments → recent results. Pure HTML template move; the
  JS renderers are id-based and order-independent, so behavior (hero = box
  slot 1, caps, dedup, wait states) is unchanged.
- Version labels bumped to ۱۲.۱۳ / v12.13 across the public/login/admin
  i18n dicts.

## [12.12-bigfocus] — 2026-09-15 (big-only page: view toggle & upcoming list retired, 10-match box, 8-match UCL box with selected-only filter, no A-League, dark scrollbars)

User ask: remove the «فقط بازی‌های بزرگ / همه بازی‌ها» toggle (big-only must be
the default and only mode), remove the now-redundant «📅 مسابقات پیش‌رو» card,
«مسابقات بزرگ پیش‌رو» shows up to 10 next matches, the UCL box shows up to 8
matches ("two important today, two important tomorrow") and only games where
at least one side is a selected club (Sabah FK vs SK Slavia Praha is noise),
remove the Australia league from the league tables, and fix the scrollbar
rendering light in dark mode.

- **View toggle retired**: the `.viewtoggle` HTML/CSS, `setView()`, the `VIEW`
  variable and the `ucl_view` localStorage preference are all gone — the page
  is permanently big-only. `applyView()` shrinks to rendering the finished
  card (the week's selected-team results).
- **«📅 مسابقات پیش‌رو» card retired**: with the toggle gone it only ever held
  the redundant "همه در جعبه بالا هستند" note. `renderSections`/`catOf`/
  `CAT_CUPS` and the `.msec`/`.ucl-matches` CSS are removed with it; the hero
  card + the topspot box + the UCL box ARE the upcoming presentation.
- **Big-matches box × 10**: the server picks up to ELEVEN true big matches
  (A/B/C + selected-vs-top-5 fallback, strict kickoff order); slot 1 goes to
  the hero card (the countdown's match) and «🔥 مسابقات بزرگ پیش‌رو» shows the
  remaining up to TEN.
- **Generalized UCL box × 8**: `ucl.matches` now carries up to EIGHT upcoming
  CL fixtures in kickoff order (live first) where ≥1 side is a SELECTED club —
  the both-unselected noise (Sabah FK 🆚 SK Slavia Praha) never boxes. The old
  single-headline `nbig` pick chain is retired; `renderUclSpot()` renders the
  box with the same `spotItemNode` rows as the topspot box + hero (uniform),
  hides the card when empty, and keeps the pre-draw wait state. The «🏆 لیگ
  قهرمانان اروپا» card drops its all-fixtures list (the noise source) and is
  standings-only now.
- **A-League out of the league tables**: `standCodes` loses `AL` (5 European
  leagues + PGL remain, 6 boxes); the client grid list and `FLAGS` follow. AL
  stays in the notify config and the settings-driven weekly Telegram digest.
- **Dark-mode scrollbars**: `color-scheme:dark` on `:root` and
  `color-scheme:light` on `[data-theme="light"]` (all three pages) — native
  scrollbars and form controls now match the active theme instead of always
  rendering light.

## [12.11-uniform] — 2026-09-15 (streamlined: no special boxes around matches — uniform rows everywhere)

User ask: "The UI is inconsistent, some matches have a different border
around them, such as manchester united vs city, but there isn't any border
around liverpool, manchester city that is somehow equally important. Remove
this box around them, and make all streamlined."

- **`.match.derby` chrome retired**: derby rows (Man Utd–City, Atlético–Real,
  Marseille–PSG …) used to carry an amber border + amber→violet gradient +
  glow while equally big non-derbies (Liverpool–Man City, Roma–Inter) stayed
  plain. Every match row now renders IDENTICALLY — same padding, same thin
  separator, same hover. The `derby` class stays in the DOM (inert) and the
  «دربی» badge pill in the info row still carries the label, now calm
  (glow animation dropped, margin made RTL-safe like `topbadge`).
- **Golden `.topspot` box chrome retired**: the hero card (countdown + its
  match) and the «🔥 مسابقات بزرگ پیش‌رو» box are plain standard `.card`
  sections now, visually identical to every other card on the page — no
  golden borders, no gradient wash, no pulsing glow. The 🔥 headings and the
  countdown bar still carry the "big match" signal.
- **UCL gold chrome retired too**: `.uclspot` (next big UCL match card) and
  `.uclcard` (UCL list card) drop their golden borders, yellow-tint
  backgrounds and the `uclspot-glow` pulse — they were the last boxes that
  set certain matches apart visually. The container classes stay in the HTML
  as inert hooks (reduced-transparency selector unchanged); the
  `.uclspot-logo/info/wait` layout rules are untouched.
- **Hero card structure unchanged (v12.10)**: the countdown bar and its match
  remain ONE stuck unit at the very top; `barTarget()` logic, view dedupe,
  legacy `{next}` handling and the idle state are untouched — this is purely
  a presentation unification. `renderHeroSpot()` now always sets
  `card bighero` (no conditional `topspot` class).

## [12.10-herobox] — 2026-09-15 (hero card: the countdown bar and its match are ONE box at the top)

User ask: the page's countdown bar (⚡ تا بازی بزرگ بعدی) counts to the next
big match, but that match rendered in the big-matches box further down —
"the next bigmatch is not stick to it (but it must …) the next and closest
upcoming match, which happens to have a countdown, [should be] separated in
a box (on top) from other matches".

- **Hero card**: the countdown bar now lives INSIDE a new card at the very
  top (right below the view toggle), with its own match stuck directly
  under it — the closest upcoming big match (the big-matches box's slot 1,
  live entries leading). The bar keeps driving label/clock/fill every
  second; the match below it is rendered by the new `renderHeroSpot()`.
- **One pick, two views**: new `barTarget()` is the single source of truth
  both the countdown bar and the hero card agree on — box top → far
  `nextBig` fallback → nearest big upcoming → plain `upcoming[0]`. The card
  under the countdown is always EXACTLY the match being counted down to,
  so the bar can never point at a card rendered elsewhere on the page.
  When no big match exists at all, the hero gracefully degrades to the
  plain next match with the "⏳ تا مسابقه بعدی" fallback label.
- **Box separation**: the «🔥 مسابقات بزرگ پیش‌رو» box now presents the
  REMAINING big matches (slots 2–6) — the headline is visually separated
  from the other matches, exactly as requested. Total big-match capacity
  is unchanged (1 hero + 5 box = 6). `spotItemNode()` extracted so hero
  and box entries share one rendering path (badges, live chip, venue,
  share row included).
- **No duplication**: `applyView()` filters the hero's match out of the
  upcoming list (the far `nextBig` fallback card formerly rendered at the
  head of the upcoming list — `renderSpecial` — is retired; the hero IS
  its presentation now, stuck to the countdown).
- **Styling**: `.bighero .bigbar` renders flush inside the card (no own
  chrome — the card provides it) with a soft divider to the match; the
  hero takes the amber `topspot` glow when the target really is a big
  match, neutral glass otherwise. Bonus fix: `updateBigBar`'s idle gate no
  longer ignores a box top when `upcoming` happens to be empty.

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
