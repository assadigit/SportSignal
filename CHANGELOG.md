# Changelog

All notable changes to the UCL Notifier are documented here, newest first.
Version strings follow the value exposed by the live `/api/status` endpoint
(see `src/worker.ts` `VERSION`).

---

## [13.42-rekindle] — 2026-09-14 (match-start reminder guarantee — the Torino-Roma missed-start fix)

### Fixed — the missed "match started" reminder (user bug report)
- **Report**: the user received the pre-match reminder for Torino vs Roma
  (Serie A, 20:00 Tehran) but NO reminder when the game actually kicked
  off. Forensics (KV + CF analytics + cron status): every in-window cron
  tick ran errors=0, yet NO match-start dedupe record was ever persisted
  and no message was sent — the sweep missed the match silently (provider
  pool without the SA fixture for the in-window ticks), the window closed,
  and every backstop was hollow. (The result notification at FT DID fire
  once the pool recovered — the pipeline itself was healthy.)

### Root cause — the match-start backstop was dead code on BOTH layers
- `isBackfillEligible()` had **no `"match-start"` entry** in its floors/
  maxes tables → `floor === undefined → return false` — so once the live
  window `[-1..+45min]` closed, `sendNotificationIfNeeded`'s gate rejected
  the type before anything else could run.
- The v13.9 rescue (`isMatchStartBackfillEligible`, [20-30min]) was wired
  into `shouldSendNotification` — a layer that never executes once the
  gate already returned. Unreachable since v13.9; its behavioral test
  (check-no-miss) tested the function in isolation and never caught the
  wiring, and check-reliability even asserted the dead OR-leg as correct.
- `reconcileSchedules()` (v13.9 #1) writes per-match schedule records with
  a `sent` map — **the fire-leg was never built** (nothing reads or
  updates them). `sched_v1:torino|roma|...` shows `"sent":{}`.

### Changed — the guarantee, now structural
- **Real match-start backfill**: `isBackfillEligible("match-start")` — if
  the live window was missed entirely, the start reminder fires LATE (with
  the «این یادآوری با تاخیر ارسال شد» tag) while the match is still LIVE
  (IN_PLAY/PAUSED/LIVE), up to 3h after kickoff. A FINISHED match never
  fires a "match started" (the result notification covers it, 6h window +
  24h backfill). `shouldSendNotification`'s match-start case now ORs the
  same branch (the house pattern every other type uses).
- **Fail-closed dedupe, made real**: `saveNotifiedMatch` returns whether
  the record PERSISTED; the send is gated on it. v13.36's comment claimed
  "a KV failure defers the notification (fail closed)" but the code sent
  anyway — observed live: the Torino-Roma pre-match DELIVERED with no
  record. Now: no record → no send → retry next tick; duplicates remain
  impossible AND unrecorded deliveries are impossible. MEM_DEDUPE is only
  seeded on success (the old MEM-on-failure add blocked retries for the
  isolate's lifetime = the permanent-loss side of the same bug).
- **Formatter guard**: the per-group `messageFormatter` call had zero
  try/catch — one exception aborted the whole match loop (every later
  match silently skipped that tick, invocation still errors=0). Wrapped:
  one group's failure skips only that group.
- **Breadcrumb diagnostics**: `sendMatchNotifications` returns
  `{found, noChats, budgetDeferred, sent, last}` and the cron folds it
  into `cron_status_v1` as `notify:{f,n,d,s,l}` — a missed-notification
  investigation is now a single KV read instead of an hour of forensics.
- Dead `isMatchStartBackfillEligible` removed; tests rewritten to the real
  wiring: check-no-miss behavioral matrix (50min/2h/44min/30min/finished/
  stale/postponed + end-to-end `shouldSendNotification` wiring incl. the
  exact Torino-Roma case), check-reliability asserts the branch + the
  persisted-gate + the summary return. 105 checks (was 96).

### Verification
- npm test exit 0 (tsc + version-sync + 105 checks).
- Live forensics that motivated it: notified_matches_v6 had no torino
  records pre-fix; cron ticks 16:30-17:10 UTC all errors=0; sched record
  `sent:{}`; result fired 18:41 UTC after the pool recovered.

## [13.41-uclplain] — 2026-09-14 (UCL next-matchday line: blue pill → plain text)

### Changed — the «هفته بعدی مسابقات» line de-pilled (user feedback)
- **Feedback**: "Remove blue background behind it, a simple text and emoji
  is enough" — the v13.40 date line shipped as an accent-blue pill
  (`--pill-primary` tokens); too loud for a quiet informational line.
- **Now**: `.ucl-next` is plain text — NO background, NO border, NO pill
  radius/padding, NO light-mode shadow. Muted label («هفته بعدی مسابقات:») +
  bold date in the normal text color; the 📅 emoji is the only accent. The
  date value (`b`) moved from `--pill-primary-ink` (white-on-blue) to
  `var(--text)` so it reads correctly on the bare card in BOTH themes.
- Wrap behavior, width fit, line-height and the render logic (emoji +
  label + bold value) are unchanged; JS untouched — CSS-only restyle.
- sw.js cache v10→v11: routine evict so returning clients get the new CSS
  (cache-first assets cannot refresh without a bump — the v13.39 rule).

### Verification
- npm test exit 0 (tsc + version-sync + all behavioral checks).
- Live (agent-browser, fresh session): the date line renders as plain text
  (transparent background, no border) in dark + light mode, both languages;
  date value legible in both themes; no layout shift of the table below;
  no h-scroll at 390px; console clean.

## [13.40-uclnext] — 2026-09-14 (UCL next-matchday date line in the standings card)

### Added — «هفته بعدی مسابقات: …» at the top of the UCL card (the user's ask)
- **Why**: UCL matchdays are NOT weekly — sometimes weeks or even months
  apart — so the standings card now answers "WHEN is the next round" at a
  glance: a special date line between the card header and the league table,
  e.g. «📅 هفته بعدی مسابقات: ۲۸ شهریور ۱۴۰۵، ساعت ۲۳:۳۰» (fa) /
  "📅 Next matchday: 28 Sep 2026, 23:30" (en).
- **Anchor**: the EARLIEST strictly-future kickoff in the UCL fixtures
  payload (`d.matches` — the same list the «🔥 مسابقات مهم» box renders),
  falling back to the server's projected `d.firstStart` while the season
  hasn't started. The strictly-future scan means a LIVE match or a played
  game never anchors the line; when nothing is ahead (season over / stale
  payload) the line simply does not render — never a past date.
- **Locale + timezone honest**: the date renders Jalali via the page's
  shared fa-IR Intl formatter (day month-name year — «۲۸ شهریور ۱۴۰۵»,
  Persian digits), the time via the user's SELECTED timezone (`curTz()` —
  the tz popover's choice, falling back to Asia/Tehran). Language switch and
  timezone switch both re-render it (renderUcl runs in onLang +
  rerenderAll).
- **Styling**: `.ucl-next` — an accent-tinted pill using the same
  `--pill-primary-*` tokens as the countdown chip (one visual system),
  `width:fit-content; flex-wrap` so long lines wrap on narrow phones instead
  of clipping; light mode gets a soft shadow lift. Client-only change — the
  worker payload is untouched.
- **sw.js cache bumped v9 → v10** (the v13.39 rule: every asset-editing
  release bumps — cache-first assets can't refresh without it).

---

## [13.39-favpark] — 2026-09-14 (favorites UI parked (kept in codebase) + club-name truncation fix + SW cache evict)

### Changed — the star/favorites feature is OFF the page (code kept, per the user)
- **Every favorites surface is parked behind one flag** (`FAVS_UI_ENABLED = false`
  in `public-13.12.js`) — the user pulled the feature from the UI but wants it
  kept in the codebase for possible future development:
  - the «☆ برای دنبال‌کردن تیم موردعلاقه…» **favhint** (and the whole
    `#favbar` — segmented «⭐ منتخب‌ها / همه بازی‌ها» filter + ✎ manager
    popover) no longer renders; `renderFavbar` removes any stale bar from the
    DOM instead.
  - **`favStarBtn` returns null** — the 26px star leaves every row it used to
    sit in: match rows (`.mrow`), spotitems (hero / big-matches / UCL / week /
    live), the standings mini-boxes, the full UCL table and the cup boxes.
    All 8 call sites guard the null.
  - the **`.hasfav` gold rails** and the **`.sthead-star` header spacers**
    render only when the feature is enabled (no phantom empty column).
  - **`favFilter` passes lists through unfiltered** when parked — a returning
    user whose localStorage still carries `ss_favmode="1"` would otherwise
    see every list silently filtered with no toggle left to undo it.
  - **`ss_favs` / `ss_favmode` localStorage keys are NOT wiped** — flipping
    the flag back to `true` restores the feature with everyone's old stars
    intact.

### Fixed — long club names truncated («اینتر……» → «اینتر میلان»)
- Diagnosis: on the ≥1440px layout the live/UCL/standings cards live in a
  400–460px rail; the UCL table row burned ~26px on the star column alone and
  ~318px on fixed numeric columns, squeezing the name cell to ~60px — «اینتر
  میلان» ellipsized to «اینتر……» (exactly the user's screenshot).
- The user's own prescription, applied: **widen the containers so the logos
  sit a little toward the outer edges and the names get the room** —
  - reference rail `minmax(400px,460px)` → `minmax(440px,500px)` (the main
    match column keeps 830+px);
  - `.side` gap 12→10px, `.side .team` padding-inline 4→2px (both crests move
    ~4px outward, both names gain ~8px — every match row, all breakpoints);
  - UCL table density: `.stnum` 26→24px, row/header gaps 6→5px,
    `.ucl-stand` side padding 10→8px (header labels stay exactly over their
    number columns — both rows share the same gap).
- Net effect: ~+30px per name in the live card, ~+90px per row in the UCL
  table, on top of the parked star's +26–28px.

### Fixed — featured-section (hero) club names truncated («اینتر……» in the face-off row)
- The user's follow-up screenshot: in the HERO the crests sat well inboard
  of the card edges and «اینتر میلان» clipped to «اینتر…». Measured live:
  the hero name cell was 137px while real FA names run to 140px+
  («باشگاه فوتبال بارسلونا» measured 140px at the 16px hero size) — any
  longer name (or any zoom) truncated.
- **Logos moved outward, the user's prescription again**: `.hero-data`
  horizontal padding 18→10px (the whole face-off row shifts 8px toward each
  card edge), hero crest 102→96px (still ~1.9× the topspot's 51px — the
  hierarchy holds; monogram fallback 44→42), hero-only crest→name gap
  10→6px (`.bighero .side`; every other card keeps the global 10px).
  Net: each hero name cell ~+18px (137 → ~155px) at the same card width.
- **`fitHeroNames()` — the never-truncate guarantee (public-13.12.js)**:
  after every hero render (data ticks, language switches) and on a debounced
  (150ms) window resize, each hero name is measured with clipping disabled
  and its font steps down from the clamp() base (floor 11px) until the FULL
  name fits its cell — one line, no ellipsis, any name, any language, any
  viewport/zoom. The cell's ellipsis stays as a true last resort below the
  11px readability floor. Re-running resets the inline size first, so
  growing the viewport restores the 16px hero size.

### Fixed — returning visitors were still served v13.36 page JS
- **`sw.js` cache bumped `sportsignal-v8` → `sportsignal-v9`.** The service
  worker's asset rule is cache-first-forever for `.js`/`.css`, and v13.37 /
  v13.38 edited `public-13.12.js` in place without a rename or a bump —
  SW clients kept executing v13.36 page code regardless of deploys. The
  activate handler evicts every non-current cache, so this one-time bump
  delivers the parked-favorites page (and the missed 13.37/13.38 fixes) to
  every returning client on their next visit.

### Verification
- `node --check` on the edited page script; full `npm test` gate before
  deploy; live checks: `/healthz` version fresh, no `#favbar`/`.favstar`
  nodes in the DOM, long FA names (e.g. «باشگاه فوتبال بارسلونا», 140px)
  render un-truncated in the hero + live card + UCL table, hero crests sit
  16px closer to the card edges, layout sane at 390px / 1056px / 1440px.

---

## [13.38-qc] — 2026-09-14 (quality-control round: the last at-least-once vector + measured write budget)

### Fixed — outbox drain could re-deliver already-sent messages
- **`drainOutbox` is now WRITE-FIRST** (the last at-least-once duplicate
  vector in the codebase). The old order (send → persist the keep-list,
  `.catch(()=>{})`) meant a failed keep-list write re-delivered
  ALREADY-DELIVERED messages on the next tick. Narrow window (KV writes
  failing while Telegram works) but exactly the quota-exhaustion shape this
  bot has lived through. Now: pop due items → persist the remaining list
  FIRST (abort the whole drain if that put fails — nothing sent, nothing
  lost, retry next tick) → send → failed sends re-queued best-effort.
- **Migration notice dedupe hardened**: the marker put's success now GATES
  the send (`migMarked`) — the swallowed `.catch` left v13.36's write-first
  promise hollow for this path (put fails → not marked → re-send next tick).
- **`MEM_DEDUPE` size cap** (4000, clear-on-overflow): the in-memory dedupe
  Set lived for the isolate's lifetime with no removal path — unbounded
  growth on a long-lived isolate. Safe: the KV record is the real
  never-expire line; the Set is only the write-outage fallback.
- **`table_top_v1:<code>` snapshots got a 40-day TTL** — the 7 league keys
  previously lived forever.

### Added — measured KV write budget (was pencil-only)
- **KV write meter in cron**: every `env.STATE.put` from tick start to end is
  counted; the running day-total folds into `cron_status_v1`
  (`kv_day`/`kv_writes_day`/`kv_writes_last_tick`, UTC-date-reset) and each
  tick logs its burn. Warn at >800/1000.
- **`/healthz` now exposes `kv_writes_day`** — any external monitor can
  watch the free-tier quota. Quota exhaustion was the original spam trigger;
  this turns the budget from an estimate into a live number.

### Tests
- check-no-miss.js: behavioral section R — the REAL `drainOutbox` against a
  KV mock: due items drain exactly once; a KV write failure mid-drain sends
  NOTHING and loses NOTHING (abort + retry next tick); failed sends
  re-queue with attempts+1; entries at 6 attempts drop.
- check-reliability.js: +9 `#qc1` checks (drain write-first order, abort
  path, MEM cap, snapshot TTL, migration gate, meter wiring, healthz burn,
  800 warning).

---

## [13.37-nospam2] — 2026-09-14 (anti-spam hardening round 2: every remaining send path fail-closed)

### Fixed — 4 residual spam vectors found by the post-v13.36 full-path audit
Every Telegram send path was re-audited for the "same notification more than
once" failure mode. v13.36 fixed the 4 scheduling-layer paths (regular,
result-big, match-start-big, morning digest, migration) with write-first
dedupe — but 4 MORE paths used "snapshot state" as their dedupe mechanism and
**swallowed the snapshot write failure** (`.catch(() => {})`), which re-arms
the send on every tick for as long as KV writes keep failing:

- **`detectStatusChanges` (POSTPONED / CANCELLED / HT alerts)** — the
  `match_status_v1` map IS this detector's dedupe state. A failed map write
  left `prev` stale → the same transition re-fired on EVERY tick. Now:
  persist-first, and if the persist fails, send NOTHING this tick
  (`statusMapSaved` gate) — a missed postponement/HT alert is far better
  than a duplicate storm.
- **`maybeNotifyTableToppers` (👑 coronation alerts)** — the
  `table_top_v1:<code>` snapshot is the coronation dedupe state. A failed
  snapshot write re-alerted the same coronation on every tick of the 6h
  post-match window (up to 36 copies). Now fail-closed (`snapSaved` gate).
- **`maybeSendWeeklyTables` (weekly tables digest)** — the week marker was
  written only AFTER the sends (`res.sent > 0`); a failed marker write
  re-broadcast the full digest on every tick of the 4.5h Monday window
  (up to ~27 copies), and partial-failure runs re-sent to chats that already
  got it. Now WRITE-FIRST: the marker is persisted before any send, and an
  un-persistable marker skips the digest entirely. Trade-off (accepted):
  a total Telegram outage at digest time loses that week's digest — never-
  spam outranks never-miss for one-shot digests. Per-event notifications
  keep outbox recovery.
- **`auditNotifications` (admin gap report)** — gaps can legitimately
  persist for hours (provider drops a finished match; an expected type the
  audit wants but reality never sends), so the old code alerted the admin on
  EVERY tick while gaps > 2 (up to 144 alerts/day — the bot spammed its own
  admin). Now rate-limited to one alert / 6h via the new
  `audit_alert_v1` KV stamp (new key; no existing key renamed).

### Tests
- check-no-miss.js: new **behavioral section Q** — evals the REAL
  `detectStatusChanges` against a KV mock whose put can fail: POSTPONED and
  HT transitions are suppressed while the map is un-persisted (2 consecutive
  failing ticks), fire EXACTLY ONCE when KV recovers, and never duplicate
  again afterwards.
- check-reliability.js: +9 `#nospam10` source-order/gating checks (fail-closed
  gates on all three snapshot paths, weekly write-first marker before the
  first send, old post-send marker removed, audit stamp + 6h window, new KV
  key defined).
- check-weekly-tables.js: outage semantics updated to the write-first
  contract — an outage run CONSUMES the week slot (anti-spam), there is NO
  retry next tick, and a not-started week consumes the slot.

---

## [13.36-nospam] — 2026-09-14 (exactly-once notifications: kills the 10-20× spam + cron-outage hardening)

### Fixed — the "bot spamming 10-20 times" bug (user-reported)
- **THE LINE: one event → one reminder, never re-armed.**
  `shouldSendNotification` now treats ANY prior record of
  (matchKey, notificationType) as blocking — the record's `expiresAt` is
  demoted to pure KV-size hygiene. Previously a record that expired
  mid-window silently re-armed the send (the old default expiry was
  kickoff+1h while "result-big" stays eligible for the whole 6h post-match
  window). Every type's expiry is ≥ its window's end, so cleanup can never
  purge a record whose window is still open.
- **The missing broadcast dedupe checks (primary spam engine).**
  `broadcastBigMatchResults` + `broadcastBigMatchKickoff` (digest.ts) loaded
  the dedupe state but NEVER consulted it — the comments claimed "deduped
  via result-big / match-start-big" while the code sent first and saved
  after. A finished master big-match therefore re-sent its FT to all
  non-followers on EVERY 10-min tick of the 6h post window (up to 36
  copies) and the kickoff broadcast re-sent across its whole -1..+45min
  window. Both now check → save → send like every other path; both types
  got real cases in `shouldSendNotification`.
- **Write-first dedupe everywhere.** All send paths now persist the
  "already sent" record BEFORE the Telegram send: the regular notification
  path (`sendNotificationIfNeeded`), both big-match broadcasts, the
  morning digest, and the migration broadcast. The old send-then-save
  ordering meant a failed KV write (free-tier quota exhaustion) left the
  notification unrecorded — the next tick's fresh isolate re-sent it
  (v13.27's in-memory fallback only lives within ONE isolate; cron ticks
  run in fresh isolates). With write-first, a KV failure defers the
  notification to the next tick (fail closed) — duplicates are now
  structurally impossible. Hard send failures are still recovered by the
  outbox (delivery retries live at the Telegram layer, not the dedupe
  layer).
- **Proper expiries for the broadcast types**: "result-big" now records
  now+24h (was the kickoff+1h default) and "match-start-big" gets
  matchTime+2h.

### Fixed — "focus on upcoming events, not past"
- **Notification horizon fence**: `sendMatchNotifications` only considers
  matches inside [-26h, +73h] of kickoff (+73h covers the 72h big-match
  pre-window; -26h covers the widest legal look-back, the result backfill
  at +24h). Anything older is dead weight — past events can remind at
  most once and the sweep stops wasting iterations on them.

### Reliability — the invisible 10-hour cron outage (Sep 14 00:20→10:10 UTC)
- Evidence: Cloudflare analytics showed err=1 on EVERY cron tick for ~10h
  (dying mid-sweep first, then pinned at subreq=0), self-healed at 10:10.
  HTTP stayed healthy; only the heartbeat went stale (healthz ok:false,
  599min) with zero diagnostics.
- **START heartbeat**: cron_status_v1.heartbeat is written right after the
  lock acquisition — a mid-tick crash no longer freezes the liveness
  signal; `last_cron` still proves a tick COMPLETED.
- **Fail-closed lock write**: the execution-lock put (previously the only
  unguarded KV write in the pre-flight path) is now guarded — on failure
  the tick aborts with an admin alert instead of dying silently or, worse,
  running without a lock.
- **Per-phase guards + admin alerts**: applySettings, user-list read,
  match-pool/fetch, and sendMatchNotifications no longer re-throw through
  the big try/catch. Failures alert the admin chat (rate-limited 1/30min
  per isolate) with the phase name + error — the next outage is
  diagnosable from Telegram within minutes.
- **KV write quota cut ~288/day**: `cleanup_hour` guard is isolate-local
  (was a KV write every tick); `last_full_sweep` folded into the
  cron_status_v1 blob (one status write/tick instead of two). New floor
  ≈500-650 writes/day against the 1,000/day free quota.

### Debt (carried from the interrupted v13.36-anytight session)
- 8 admin-route `req.json().catch(()=>null) as any` copies → `readJson()`
  helper; ~10 `: any` annotations tightened in api.ts (load-bearing union
  annotated with rationale); assets public-13.11→13.12, SW cache v7→v8.

### Verification
- npm test exit 0 — 387 assertions (35 new: never-expire line behavioral
  evals incl. expired-record blocking for both regular + broadcast types,
  write-first source-order checks for all 4 send paths, horizon fence,
  guarded lock, start-heartbeat, phase guards, quota cuts). wrangler
  --dry-run bundles clean.

---

## [13.35-prewarm] — 2026-09-14 (cron pre-warm kills the cold sweep + cup round chips + team favorites)

### Performance / reliability
- **Cron pre-warm of the public payload** (the last latency gap from the
  v13.34 QA): the first visitor after a quiet gap paid the full provider
  sweep (~4.6s cold `/api/public-matches`). The cron tick now rebuilds the
  payload at the END of every sweep via `fetchPublicMatches(env, null,
  { prewarm: true, pool: matches })`:
  - **Pool ride-along** — the sweep is the expensive part; cron hands over
    the pool it ALREADY fetched this tick, so the pre-warm costs ZERO extra
    provider subrequests. Budget-guarded: only runs with `< 30` subrequests
    used (standings need ≤6; the pool is free).
  - **Prewarm freshness window** — prewarm-stamped payloads stay fresh for
    9.25 min (a full 10-min tick gap → the KV payload NEVER goes cold
    between ticks); everything else keeps the 3-min SWR window. Live
    payloads always keep 3 min (fresh minutes/scorers matter).
  - **KV TTL 720s** for prewarm writes (≥ the tick gap; visitor writes stay
    300s). Write math (worst case: zero visitors, all quiet): +1 payload
    write/tick = ≤144/day; snapshot stays change-only; grand total well
    under the 1,000/day quota.
  - **Canary leak closed**: the canary match lives only in cron's in-memory
    pool — comments CLAIMED the public page filters it, but nothing did
    (protection was pure indirection: the KV pool never contains it). The
    pre-warm path passes the in-memory pool directly, so `opts.pool` now
    strips `m.canary` explicitly (belt-and-braces, verified by test).

### Features (backlog §F: FA Cup tier/round filtering + EL/ECL qualifying relabel)
- **Cup round chips**: cup fixtures now carry `round` (raw provider label)
  + `roundFa` (Persian twin) on EVERY public payload row via
  `roundLabel()` — FD stage enums (SEMI_FINALS→نیمه‌نهایی) AND sportscore
  free text ("Round of 16"→یک‌هشتم نهایی, "Quarter-finals"→یک‌چهارم
  نهایی, "Round 3"→دور سوم, qualifying/preliminary→مقدماتی). The UI
  renders the chip in the cup boxes (between pairing and date), in
  spotitem info lines, and on finished rows — league rows carry null →
  no chip. FA mode requires a translated label (untranslated Latin stays
  hidden in FA); EN shows any raw label.
- **Team favorites (star your teams)** — pure client feature, ZERO KV cost:
  tap the ☆ beside any team name to pin it (localStorage `ss_favs`, keys =
  English provider names → stable across FA/EN switches). Starred teams'
  matches get a gold rail + warm wash (.hasfav) and a segmented
  «⭐ منتخب‌ها / همه بازی‌ها» filter bar (localStorage `ss_favmode`)
  appears above the first card, filtering the big-matches, live, week and
  results lists at once. Empty state teaches the gesture instead of
  nagging. RTL+LTR mirrored via logical properties; focus-visible rings;
  reduced-motion honored (global rule).

### Styling details
- Round chip: quiet amber-tinged pill (distinct from derby/top badges).
- Favorites: gold gradient segmented control, star pop on toggle, cup-box
  hover lift (mirrors the match-row hover language), light-theme variants
  for all new elements.

### Test harness (debt #2 paid down further)
- worker-src.js transform: optional-marker-before-colon (`opts?:`), generic
  `Record<...>` annotations, interface-typed params (PubOpts) — new TS
  shapes stay eval-safe without per-case rules.
- live-derby-test: NEW scenario 5 — prewarm ride-along end-to-end (canary
  never reaches the payload, prewarm stamp on payload + KV write, cup
  round labels Round of 16 / Quarter-finals, league rows chipless).
- check-venue: round fields asserted (league null, "Round 3"→دور سوم,
  SEMI_FINALS→نیمه‌نهایی).
- check-reliability: 7 new v13.35 wiring checks (prewarm opts, pool
  ride-along, 9.25-min window, 720s TTL, canary strip, budget guard,
  pool pass-through).

---

## [13.34-ux] — 2026-09-14 (skeleton loaders + back-to-top + render-skip + PGL snapshot fallback)

### Client UX (backlog §3A items: skeleton loaders, render perf, motion)
- **Skeleton loaders replace the spinner**: every content section now shows a
  SHAPE-MATCHED skeleton while data loads — ghost match rows (upcoming /
  finished / live / week), ghost table lines (standings / UCL), ghost cards
  (cups), ghost hero blocks (top-spot / UCL spot). Static skeletons are
  server-rendered in the HTML (visible even before JS boots); the JS
  injection stays for the auto-refresh path. Function names
  (addLoadingLottie/removeLoadingLottie) + the .card-loading contract are
  preserved — callers unchanged. Shimmer auto-disables under
  prefers-reduced-motion (global rule) → static placeholder blocks.
- **Back-to-top FAB**: glass-chrome circular button, bottom-LEFT (mirror of
  the Telegram FAB), fades/slides in past 600px, smooth-scrolls (instant
  under prefers-reduced-motion), real <button> with bilingual aria-label.
- **Render-skip for long lists**: `.mrow{content-visibility:auto;
  contain-intrinsic-size:auto 96px}` — with 38+ match rows the browser now
  skips layout/paint for offscreen rows.
- Existing coverage verified (no duplicates added): «آخرین به‌روزرسانی»
  freshness stamp (v12.26) + cached-badge, focus-visible outlines,
  prefers-reduced-motion global rule.

### Server reliability (backlog §F: PGL reliability)
- **PGL snapshot fallback**: when ALL three PGL sources fail (sportscore →
  Wikipedia → thesportsdb), the Iran league card now falls back to the
  7-day snapshot's PGL copy (tagged `stale` + `staleAsOf`) instead of an
  empty «جدول هنوز در دسترس نیست» box. Zero KV cost on the happy path —
  the snapshot is read only when PGL has no teams.

### Cache/versioning
- Assets renamed public-13.9 → public-13.10 (CSS + JS); SW cache v4→v5
  (one-shot client cache clean sweep).

---
## [13.33-tsdebt] — 2026-09-13 (debt #4: dedupe.js + teams.js are TypeScript)

### Migration (types only — logic byte-identical)
- `src/teams.ts` + `src/dedupe.ts` replace the plain-JS modules. Typed with
  erasable syntax only (no enums/namespaces) so **Node ≥23 `require()`s the
  .ts directly** (type stripping) — the four CJS test consumers
  (check-dedupe, check-fa-dict, check-composers, live-derby-test) now
  `require("../src/teams.ts")` with no build step.
- `MatchLike` interface documents the fields the dedupe module actually
  touches (incl. `status`, which downstream consumers read off the same
  pass-through rows).
- Worker imports switch to extensionless `./teams` / `./dedupe` (esbuild +
  tsc resolve to .ts); the modules' own relative import uses the explicit
  `./teams.ts` form (required by Node ESM type-stripping require).
- tsconfig: +`allowImportingTsExtensions` (noEmit already set).
- Eval harness (`scripts/lib/worker-src.js`): teams/dedupe join the
  concatenation order; `export interface/type` now stripped like other
  exports. check-venue's dedupe regex tolerates parameter type annotations
  (the exact harness brittleness debt #2 describes — the `(m)` vs
  `(m: MatchLike)` shape).
- Gates: tsc 0 errors + 352 assertions green; wrangler --dry-run bundles.

---
## [13.32-router] — 2026-09-13 (debt #1: the ~45-branch fetch if-chain is a declarative route table)

### Refactor (behavior-preserving, mechanically verified)
- The post-auth request flow in `src/api.ts` is now an ordered
  `POST_GATE_ROUTES: RouteDef[]` table (30 routes + the legacy GET
  catch-all) dispatched by a 8-line matcher. The pre-auth flow
  (webhook, login GET/POST, logout, change-password, public-matches,
  pages, card prefix, auth gate) is unchanged — it is deliberately
  order-sensitive and documented.
- **Mechanical transformation**: `scripts/refactor-router-table.py`
  split the old chain by brace depth and moved every branch body
  BYTE-IDENTICAL into its handler (no re-indent — the Persian template
  literals in `/simple-test` are provably untouched). A post-transform
  assertion diffs every body line against the original source and
  verifies the exact route order. The script is kept for provenance.
- **Semantics contract** (documented at the RouteDef type): first-match-
  wins in registration order; `method: undefined` = any method; a
  handler may `return null` to fall through (this encodes the old
  chain's slip-through: `/api/settings` with an unmapped method reached
  the legacy switch + 405 tail, and unauthed `/api/diag-*` requests
  skipped their own branch and ended at the 404 tail).
- `Request.json()` results in handlers are now explicitly `as any`
  (previously implicit-any through the untyped `fetch(req, ...)`
  signature — the RouteCtx typing surfaced it; tightened typing of the
  router is follow-up debt, done WITHOUT behavior changes).
- Gates: tsc 0 errors + all 18 behavior checks green (352 assertions).

---
## [13.31-perfbudget] — 2026-09-13 (KV write quota + card latency + SWR cadence)

### KV write budget (the 1,000/day free-tier ceiling hit in session 2)
- **7-day snapshot now writes only on payload change** (`fetchPublicMatches`):
  it previously rode along on EVERY successful refresh (≤288 writes/day under
  continuous traffic — the single biggest avoidable consumer). One extra KV
  read per refresh (reads are 100k/day) buys the skip; on a quiet day snapshot
  writes drop to ~0. Fallback semantics unchanged (empty/failed sweeps never
  overwrite the snapshot — that path still writes the short cache only).
- **SWR FRESH window 3min → 5min** on `/api/public-matches` — now exactly the
  KV TTL inside fetchPublicMatches, so the background refresh (provider sweep
  + KV writes) runs at most ~288×/day instead of ~480×/day.
- Documented daily budget math (worklog): cron liveness floor
  (execution-lock + cron_status) = ~288 writes/day; snapshot skip removes the
  other large block; total now sits well under ~600/day even on match days.
- Card PNG cache uses the Cache API (`caches.default`) — deliberately NOT KV,
  zero quota impact.

### Card render latency (1–2s → cached)
- **Vazirmatn TTFs decoded once per isolate** (previously `atob` of two large
  fonts on EVERY render — hundreds of KB of string churn per card).
- **`renderCardPngCached()`**: rendered PNGs cached per (matchKey, lang) in
  the per-colo Cache API for 1h. The same card was re-rendered per language
  bucket per sweep, on backfill retries, on the bot's featured button, and on
  every `/api/card/<key>.png` request. All three call sites now share the
  cache; first render per colo pays once, everyone else gets a byte-identical
  hit.

---
## [13.30-loginfix] — 2026-09-13 (admin panel login fixed: stateless session + rate-limit hardening)

### The reported lockout ("cannot login to the management backend")
- **Root cause (KV read-after-write race):** login wrote `admin_sess_<sid>`
  to KV, the client reloaded after 400ms, and the `/admin` read-back hit KV
  before the write had propagated (eventual consistency, up to ~60s cross-colo)
  → `isValidAdminSession` false → the login page rendered again. The v13.26
  HMAC fallback only covered the KV WRITE failing, not the READ missing.
- **Fix: the session cookie is now ALWAYS the stateless HMAC-signed token**
  (`sid.HMAC(sid, ADMIN_TOKEN)`, HttpOnly/Secure/SameSite=Strict, 12h
  Max-Age). Verification is pure CPU — zero KV reads on the auth path, so
  login can never race storage again. The KV write remains for
  audit/observability only (and `/admin/logout` now strips the signature
  before deleting the audit record — it previously passed the full
  `sid.signature` string as the key).
- Legacy plain-sid cookies still verify via the KV path (no forced re-login
  storms for already-authed tabs).
- **Hardening:** `429 Too many attempts` now sends `Retry-After: 600` +
  logs the throttled IP; GET /admin/login (bookmarked) 302-redirects to
  /admin instead of a bare 401 JSON.
- The login page reload waits 150ms (UX beat) — correctness no longer
  depends on any delay.

---

## [13.29-clientfixes] — 2026-09-13 (standings played column in league boxes + hero overflow fix + SW cache v4)

### Bug fixes (user-reported, persisted past v13.28)
- **«بازی» (games played) column now shows in the LEAGUE standings boxes**
  (PL/PD/SA/FL1/BL1/PGL grid). Root cause: the v13.28 fix only touched the
  bot's standings line + the UCL full table already had it — the league
  stboxes never rendered a played cell at all (data was in the payload all
  along: `played` rides along since v12.16). Now each box shows
  `# | team | بازی | امتیاز` on desktop; the column folds away ≤600px
  (existing `.ucl-hidem` behavior) so the compact mobile grid is unchanged.
- **Hero card team-name/crest collision fixed for real.** Root cause found:
  `.bighero .match .side .team{white-space:nowrap;overflow:visible;
  text-overflow:clip}` (specificity 0,4,0) was overriding BOTH the v13.28
  base `.side .team{overflow:hidden;text-overflow:ellipsis}` fix AND the
  mobile wrap rule — hero names never clipped and PAINTED OVER the crest
  and score. Now: desktop truncates with ellipsis; mobile (column layout,
  logo stacked above the name) re-allows wrapping via a later-in-file
  rule of the same specificity.
- **SW cache v3→v4** (`assets/sw.js`) + asset rename `public-13.8.*→
  public-13.9.*`: browsers holding any stale asset entry get a one-shot
  clean sweep (the SW static-asset branch is cache-first-forever, so
  unchanged URLs never refresh on affected clients). Retired the dead
  `public-13.6.*`/`core-13.6.js` (two generations old).

## [13.25-nomiss] — 2026-09-13 (comprehensive "never miss a match" test suite)

### Session wrap-up (v13.12 → v13.25)
This session shipped 14 versions covering match cards, reliability, bot UX,
emoji design, venue translation, and a comprehensive test suite. All
deployed live + verified. npm test exit 0 (351 assertions).

### v13.25-nomiss — "never miss a match" test suite
- New gate `scripts/check-no-miss.js` (78 checks): exercises every
  notification path against synthetic matches at chosen time offsets.
  Tests window hit/miss, backfill, dedupe, skipped-cron resilience,
  extra-time safety, provider-down fallback, budget-guard exemption,
  result dedupe, card+caption on all types, promo footer, bot buttons,
  featured match, migration, audit. Added to `npm test` (351 assertions).

### v13.24-featured — ⭐ featured match button
- New "⭐ بازی برتر" button (full-width, first row) on the reply keyboard.
  When tapped, fetches the featured match (live first, then closest upcoming
  worthy — the same match the website's hero card shows) + sends it as a
  card image with the match text + promo footer.

### v13.23-buttons — reply keyboard + onboarding + audit
- Persistent reply keyboard (6 buttons: featured, upcoming, tables, teams,
  language, help, stop). `normalizeCommand()` maps Persian/English labels
  to slash commands. Onboarding: welcome message instructs users to use the
  buttons. Audit mechanism: `auditNotifications()` compares the match pool
  (ground truth) with `notified_matches_v6` KV, reports gaps, alerts admin
  if >2 gaps. New `/api/audit` admin endpoint. Wired into cron.

### v13.22-promo — website promotion footer
- Every notification ends with a promo footer:
  `------` / `مشاهده جدول لیگ‌ها و مهمترین بازی‌های پیش رو:` / `https://sportsignal.ir`

### v13.21-emoji — new emoji design per user spec
- Banner: `⚔️ دربی حساس` (no diacritics). Result header: `🚩 نتیجه نهایی`.
  Match line: `team 🆚 team` (no ⚽/bold). Competition: plain text (no 🎯).
  Stadium: `استادیوم <venue>`. Score: `نتیجه h-a`. Winner: `✴️`. Draw: `✴️`.
  Standings: `جدول <league>:` (no 📊).

### v13.20-fix — don't fire result during extra time
- `isPresumablyFinished` now excludes IN_PLAY + PAUSED (match actively being
  played — extra time, stoppage time). Only SCHEDULED/TIMED trigger the
  fallback (provider genuinely down). Threshold widened 90→150min.

### v13.19-every-card — card for EVERY notification type
- The match card fires for all types (72h, 24h, 3h, 1h, 5min, match-start,
  result) + late backfills. Caption truncated to 1024 chars.

### v13.18-caption — real match text as card caption
- Card caption is the full match text (date, time, teams, competition,
  stadium). When the card sends, the separate text message is skipped.
  Fallback to text if card fails.

### v13.17-cards — inline match cards via resvg-wasm + Vazirmatn
- `renderCardPng()` renders SVG→PNG via `@resvg/resvg-wasm` (pure-WASM,
  Workers-compatible). Vazirmatn TTF fonts base64-inlined. `sendPhotoBinary()`
  uploads the PNG via multipart. New `/api/card/<id>.png` endpoint.

### v13.15-reliable-kickoff — match-start reliability fix (3 root causes)
- Budget-guard exemption for match-start (always processes even at >38
  subrequests). Fire-and-forget sendDice + sendPhoto (never blocks text).
  Window widened -1..+20min → -1..+45min (5 cron ticks, not 2).

### v13.14-progressbar — mobile progress bar fix
- `.hero-data` top padding 80→70px on mobile so the progress bar is visible.

### v13.13-venues — always notify big-match kickoff + stadium AI translation
- `broadcastBigMatchKickoff()`: fires to ALL chats when a master big-match
  kicks off. Venue names fetched from providers (thesportsdb strVenue, FD
  venue). AI-translated via `runFaVenueLearner` (Workers AI, `fa_venues_ai`
  KV). `translateVenue()` + `venueFa` field in public API.

### v13.12-cards — match-card SVG route
- `/api/card/<matchKey>` generates an SVG match card (real provider crests,
  base64-inlined, 800×420). RTL-aware. Derby accent (purple), big-match (blue).

---

## [13.28-fixes] — 2026-09-13 (session 2 wrap: admin panel fix, dedupe spam fix, standings + CSS fixes, cache-bust)

### Session 2 summary (v13.25 → v13.28, 5 versions)
This session shipped 5 versions fixing admin panel access, bot spamming,
standings display, CSS overlap, and cache-busting. All deployed live + verified.

### v13.28-fixes — standings games played + CSS overlap fix + cache-bust
- **Standings show games played**: the bot's standingsLine format was
  `#1 — 9 امتیاز` (only points). Now: `#1 — 4 بازی — 9 امتیاز` (played + points).
- **Club name never overlaps logos**: .side gap 8→12px, .team padding-inline:4px
  + overflow:hidden + text-overflow:ellipsis (desktop); .team padding:4px 6px
  (mobile). Long names get ellipsis instead of running behind the logo.
- **Cache-bust**: renamed all client assets (public-13.6.css→public-13.8.css,
  public-13.6.js→public-13.8.js, core-13.6.js→core-13.8.js). SW cache
  v2→v3. HTML cache-control: no-store (browser always fetches fresh HTML).

### v13.27-dedupe-fix — stop bot spam (in-memory dedupe fallback)
- Root cause: Cloudflare KV free-tier daily write quota exhausted. The
  saveNotifiedMatch KV write failed silently → dedupe record never persisted →
  shouldSendNotification returned true every sweep → same notification re-sent
  every 10 min.
- Fix: added MEM_DEDUPE (in-memory Set) as fallback. saveNotifiedMatch always
  adds to it; shouldSendNotification checks it first. Survives for the
  isolate's lifetime (execution lock prevents concurrent sweeps).

### v13.26-session-fix — stateless HMAC session (admin panel KV fix)
- Root cause: KV write quota exhausted → session KV write failed → admin
  couldn't log in (bounced back to login page).
- Fix: if KV write fails, fall back to stateless HMAC-signed token
  (sid.HMAC(sid, ADMIN_TOKEN)). isValidAdminSession verifies the HMAC
  without a KV lookup.

### Login page credentials fix
- The login page's doLogin() fetch was missing credentials:"same-origin"
  → the set-cookie wasn't persisted → admin page bounced to login form.

---

## [13.12-cards] — 2026-09-13 (match-card images in bot notifications — SVG card with real team crests)

The bot now sends a visual match card (team crests + names + kickoff time)
before the text notification for match-start + result. Uses the REAL provider
crest URLs (football-data.org / sportscore / thesportsdb PNGs), not AI-generated
images — the crests are accurate, not hallucinated.

### How it works
1. `/api/card/<matchKey>` route — generates an SVG match card server-side:
   - Fetches both team crests, base64-inlines them (self-contained SVG).
   - 800x420 card: dark gradient bg, two crest circles, team names, VS,
     competition, date, time. RTL-aware (home on right for fa).
   - Derby accent (purple), big-match accent (blue).
2. `sendPhoto` helper in `telegram.ts` — sends the card URL via Telegram's
   `sendPhoto` API. Telegram fetches the URL server-side.
3. Wired into match-start + result notifications: the card is sent BEFORE
   the text notification (and after the football dice for match-start).

### Why not AI image generation?
- Workers AI (@cf/stabilityai/stable-diffusion-xl-base-1.0) can generate
  generic football images, but cannot render specific team logos or accurate
  text. The template-composition approach uses the real provider crests
  (already in the match data) for accuracy.

### Card data source
- The card route looks up the match in the tracked pool (matches_v13_tracked,
  24h TTL) first, then the short-TTL public_matches_v1 cache as fallback.

### Gate
- npm test exit 0 (272 assertions, unchanged).

---

## [13.11-migration] — 2026-09-13 (admin panel KV-propagation fix + bot migration broadcast)

### Admin panel fix ("doesn't go inside")
- **Root cause**: Cloudflare KV is eventually consistent — the login handler writes
  the session to KV, then `location.reload()` immediately reads it back on the
  next `/admin` request. If the KV write hasn't propagated yet, `isAdminAuthed`
  returns false → serves LOGIN_PAGE again (bounces back to login).
- **Server-side fix**: read-after-write verification in `/admin/login` — after
  `env.STATE.put("admin_sess_" + sid, ...)`, retry the read up to 3× (200ms
  apart) until the session is visible. Only then return the success response.
- **Client-side fix**: 400ms delay before `location.reload()` in both the login
  page and the admin page's re-login function — belt-and-suspenders so the
  reload doesn't race the KV propagation.
- **Clearer error**: if neither ADMIN_PASS nor a stored hash is set, return
  "Admin password not configured. Run: wrangler secret put ADMIN_PASS" instead
  of the generic "Invalid credentials".

### Bot migration broadcast (old bot → new @SportSignalAlertsBot)
- **Polished Persian migration message**:
  ```
  🚨 *این ربات منسوخ شده!*

  ربات جدید ما با امکانات بهتر و سرعت بالاتر راه‌اندازی شده است.
  برای دریافت اعلان‌ها، به ربات جدید بپیوندید.

  ✨ *ربات جدید:* @SportSignalAlertsBot
  🔗 https://t.me/SportSignalAlertsBot

  _از همراهی‌تان متشکریم - منتظر شما در ربات جدید هستیم_
  ```
- **Scheduled broadcast over 2 weeks**: sends every 3 days (5 rounds: day 0,
  3, 6, 9, 12). Per-chat per-round KV dedupe (`mig_sent_v1:<round>:<chatId>`)
  so each user gets it exactly once per round. Auto-deactivates after 14 days.
- **Admin API endpoints**:
  - `POST /api/migrate/start` — start the 2-week migration broadcast
  - `POST /api/migrate/stop` — stop early
  - `GET /api/migrate/status` — check progress (active, lastRound, totalSent, totalUsers)
- **Bilingual**: the migration message is sent in the user's chosen language
  (fa/en) based on their prefs.
- **Bot statistics**: the `/api/migrate/status` endpoint reports `totalUsers`
  based on the current bot's `telegram_users_v6` KV (the source of truth).
  The admin panel's user count already reads from this KV — stats are based
  on the new bot.

### Gate
- `npm test` exit 0 (272 assertions, unchanged — the migration + admin fixes
  are additive logic, no existing invariants changed).

---

## [13.10-clean] — 2026-09-13 (clean date-first reminder format + animated ⚽ emoji on kickoff)

Two asks: (1) restructure the reminder format to date-first (replace the
"یادآوری" header with the date, remove the countdown), and (2) animated
emojis in the bot.

### Clean date-first reminder format
- ALL 6 pre-match formatters restructured to the user's exact layout:
  ```
  📅 <date>
  ⏰ <time>
  ⚽️ <home> 🆚 <away>
  🎯 <competition>
  ```
- No "⏳ یادآوری N ساعته" header (replaced by the date at the top).
- No "⏱ N ساعت و M دقیقه دیگر" countdown (removed per the user's ask —
  the kickoff time is enough; the user can compare to now).
- Big-match keeps 🔥 on the match line; match-start keeps 🚀.
- The 1h reminder now reads exactly as the user specified:
  ```
  📅 یکشنبه ۲۲ شهریور ۱۴۰۵
  ⏰ ۱۷:۴۵
  ⚽️ *لوانته 🆚 بارسلونا*
  🎯 لالیگا
  ```

### Animated emoji (sendDice ⚽ on match-start)
- New `sendDice(env, chatId, emoji)` helper in `telegram.ts` — Telegram's
  built-in ANIMATED emoji via the `sendDice` Bot API. The ⚽ appears
  full-screen and animates (a football spins, a player kicks it), then
  settles on a random value. Zero asset hosting, zero deps.
- Wired into match-start: the ⚽ dice is sent BEFORE the text notification
  for an eye-catching "ball is rolling" kickoff animation. Only for
  on-time match-start (not late backfills, to avoid noise).
- Available animated emoji: 🎲 🎯 🏀 ⚽ 🎰 🎳 💎.

### Other animated-emoji options (documented, not all implemented)
- **sendDice** (implemented): built-in animated emoji, separate message.
  The ⚽ on match-start is live now.
- **Custom animated emoji (Telegram Premium)**: inline animated emoji in
  message text via `custom_emoji` entities. Requires creating a custom
  emoji sticker set via @Stickers (animated .tgs/.webm). Only Premium
  users see the animation; non-premium see the static fallback. Future
  enhancement if the bot owner has Premium.
- **GIF via sendAnimation**: a looping GIF (e.g., red beeping signal for
  live matches) sent as media. Needs asset hosting (Cloudflare R2 or a
  Telegram file_id after first upload). Separate media message. Good for
  a "LIVE" indicator — a future enhancement.
- **Animated stickers (.webm)**: sent via `sendSticker`, play inline.
  Could send a "GOAL!" sticker on live goals. Future enhancement.

### Gate updates
- `check-composers.js` updated: now asserts the clean format (date-first,
  no countdown, no reminder-header) + the emoji floor. 33 assertions.
- `check-reliability.js` updated: 4 new sendDice assertions. 37 assertions.
- `npm test` exit 0 (272 assertions, was 260).

---

## [13.9-reliability] — 2026-09-13 (bot dependability: 10 reliability layers — backfill for all types, dead-letter outbox, pre-scheduled notifications, canary, subrequest guard, kickoff KV, write-verify, result fallback, heartbeat, healthz depth)

Implemented all 10 approaches from the dependability brainstorm. The bot
now shrinks the miss probability to near-zero by layering defenses — every
miss becomes either a late delivery (backfill) or a retried send (outbox).

### #2 Backfill for ALL notification types (incl 5min + match-start)
- `isBackfillEligible` now covers `pre-match-5min` (floor 2min, max 10min).
- New `isMatchStartBackfillEligible` fires a late match-start at kickoff+20-30min.
- `shouldSendNotification` uses backfill for 5min + match-start (was NO backfill).
- A skipped cron no longer loses the 5min/match-start reminder — it fires late.

### #3 Dead-letter outbox for Telegram sends
- `sendTelegram` on final failure (3 retries exhausted) pushes to `pending_sends_v1` KV.
- `drainOutbox` retries each with exponential backoff (1m→2m→5m→15m→30m→60m),
  6 attempts max, drops dead chats. Called at the start of every cron sweep.
- A Telegram 5xx for 30min no longer loses messages — they're retried until success.

### #1 Pre-scheduled notifications
- `reconcileSchedules` writes a `sched_v1:<matchKey>` record per worthy match
  at discovery, listing all 6 notification types + sent-state. Every sweep
  reconciles — a missed cron fires the notification late on the next run.
- The dedupe KV (notified_matches_v6) is still the primary exactly-once guard;
  the schedule is the catch-all backstop.

### #5 Canary match for end-to-end monitoring
- `buildCanaryMatch` creates a synthetic PL big-match (Arsenal vs Chelsea,
  kickoff ~25h ahead, refreshed every 6h). Injected into the pool in cron.
- The full pipeline (discovery → window → dedupe → send) exercises it every
  sweep. If the canary's reminders stop arriving, the pipeline is broken.
- Tagged `canary: true` so the public page can filter it out.

### #6 Subrequest-budget guard
- `sendMatchNotifications` checks `subrequestCount() > 38` before each match.
  If the budget is low (<10 remaining under the 48 cap), it defers the rest
  to the next sweep instead of silently skipping them.
- Prevents budget-exhaustion skips on busy matchdays (40 matches × 7 configs).

### #4 Canonical kickoff-time KV
- `getCanonicalKickoff` writes `kickoff_v1:<matchKey>` at first discovery,
  never overwritten unless POSTPONED. Prevents provider time-shift (FD day-N
  19:00 vs sportscore day-N+1 15:00) from moving the notification windows.
- `updateCanonicalKickoffOnReschedule` overwrites on official reschedule.

### #7 KV write-then-read verification
- `saveNotifiedMatch` reads back the KV after writing the dedupe marker; if
  the record didn't land (network blip, quota), retries once. Defense-in-depth
  against silent KV failures that would cause duplicates.

### #8 Time-based result fallback (presumably finished)
- `isPresumablyFinished`: if utcDate is >90min past AND status is still
  SCHEDULED/TIMED/IN_PLAY/PAUSED (provider down or slow), treat as finished.
- `isMatchFinished` now includes presumably-finished → the result notification
  fires (with score pending) instead of waiting for a provider that may not recover.

### #9 6h heartbeat to admin chat
- Cron sends "✅ ربات سالم است" to the admin chat every 6h. If the admin
  doesn't see it, something broke (cron, worker, KV, Telegram).

### #10 /healthz exposes outbox depth + version
- `/healthz` now returns `outbox_depth` + `version` alongside `ok` + `heartbeat_age_min`.
- An external uptime monitor (Uptime Robot / BetterStack / CF Healthcheck)
  points at `/healthz`; `ok=false` (heartbeat stale >30min OR outbox_depth ≥50)
  should page the admin. Setup is zero-code (configure the monitor externally).

### New gate
- **`scripts/check-reliability.js`** (33 assertions): all 10 reliability invariants
  (backfill coverage, outbox, schedule, canary, subrequest guard, kickoff KV,
  write-verify, presumably-finished, heartbeat, healthz depth). Added to `npm test`.
- `npm test` exit 0 (260 assertions, was 223).

---

## [13.8-botnotify] — 2026-09-13 (bot notifications: date in every reminder, more emojis, dedupe fix for provider-transliteration variants)

The user reported a 3-hour reminder that was missing the date (only time +
relative time) — ambiguous which matchday. Plus a duplicate Elversberg vs
Bayern notification (two identical messages). Both fixed.

### Date in every notification formatter
- **`format3HourMessage`** (the reported one), **`format1HourMessage`**,
  **`format5MinMessage`**, **`formatMatchStartMessage`** now include the full
  date (Jalali weekday + day + month in fa; Gregorian in en) via
  `getJalaliDate`/`getEnglishDate`. Previously only `format24HourMessage` +
  `formatBigMatchMessage` + `formatResultMessage` had the date. A 3h/1h/5min
  reminder with only the time is now disambiguated to a specific matchday.
- Verified by the new `check-composers.js` gate (29 assertions): every
  formatter carries a 📅 date line + the weekday + a minimum emoji set.

### More emojis across all formatters
- 🎯 competition tag, 📅 date, ⏰ time, ⏱ countdown, ⏳ reminder head, 🚀 kickoff,
  🏆 winner trophy, 🤝 draw, 🏁 full-time, 🔥 big-match fire, ⚽ match ball.
- The emoji floor is gated: `check-composers.js` asserts each formatter carries
  its emoji set, so a maintainer stripping them fails `npm test`.

### Duplicate-notification fix (provider transliteration fold)
- **Root cause**: `normalizeTeamName("FC Bayern München")` → `bayernmunchen`
  (accent ü stripped to u) ≠ `normalizeTeamName("Bayern Munich")` →
  `bayernmunich` (English exonym). Different keys → `canonDedupe` + `matchKey`
  both treat them as distinct matches → the SAME fixture notified twice.
- **Fix**: added a `TRANSLIT_FOLDS` table to `src/teams.js` (applied after the
  accent strip, before token removal): `munchen`→`munich`, `koln`→`cologne`,
  `sanktpauli`→`stpauli`, `zenit...`→`zenit`, `sporting...`→`sportingcp`,
  `shakhtar...`→`shakhtar`, `dinamo...`→`dynamokyiv`, `crvenazvezda`→`redstar`.
  Each entry is a verified provider-variant pair (short + specific — over-folding
  would merge distinct teams). Verified: `canonDedupe([Bayern-München,
  Bayern-Munich])` now collapses to 1 (was 2).

### New gate
- **`scripts/check-composers.js`** (29 assertions): every formatter includes a
  date line + the emoji floor + the transliteration fold. Added to `npm test`.
- `npm test` exit 0 (223 assertions, was 195).

---

## [13.7-continuation] — 2026-09-13 (continuation pass: bot flawless, perf/caching, security hardening, 3 new test gates)

A continuation pass across the six focus areas from `NEXT-SESSION-CONTINUATION.md`.
Every change deployed live + verified (curl `/healthz` + `/api/public-matches` +
page markers; agent-browser at 1440px + 390px; zero console errors). `npm test`
exit 0 (195 assertions, was 147 — 3 new behavior gates added).

### v13.7-bot — Telegram bot flawless pass
- **Persian welcome typo fixed** (caught by the new check-bot-edges gate): the
  welcome "خوش آمدید" was misspelled in THREE places — `BOT_STRINGS.fa_start_welcome`
  + `fa_start_pick_lang` ended with "خوش آمدیح" (ح instead of د), and the
  `/start` hardcoded fa welcome ended with "خوش آمدیا" (ا instead of د). Visible
  to every fa user on join + language change. All three → "خوش آمدید".
- **New gate** `scripts/check-bot-edges.js` (22 assertions): callback_query
  language picker (fa/en/malformed), `/timezone` sub-commands (show/reset/
  invalid/valid), `/lang` picker keyboard, `/help` body, `/stop`→`/start`
  re-join round-trip, + the Persian welcome spelling. Extracts the real
  `BOT_STRINGS` + `botStr` + the callback + message chains from the
  concatenated worker source (single source of truth).

### v13.7-perf — performance + caching
- **sw.js CACHE bumped** `sportsignal-v1` → `sportsignal-v2`: the activate
  handler wipes every non-v2 cache, evicting orphaned pre-13.6 asset entries
  (public-13.5.js/css, old inline-payload HTML) stranded in clients' SW caches
  since the v13.6 asset split.
- **ExtraBold font preload added**: the `<h2>` section headings (font-weight:800,
  above-the-fold) used Vazirmatn-ExtraBold which was NOT preloaded → FOUT on
  headings. Now 3 preloads (Regular, Bold, ExtraBold). Verified: h2 computed
  font-weight 800.
- **Stale-while-revalidate on `/api/public-matches`**: when the KV cache is
  stale (3–10min), return cached data INSTANTLY + refresh via
  `ctx.waitUntil`; the first visitor after TTL expiry no longer pays the 2–5s
  provider-sweep latency. Cache >10min or missing → synchronous refresh
  (cold-cache safe). The 7-day snapshot fallback unchanged.
- **Cron subrequest headroom logging**: `subrequestCount()` accessor +
  `📊 Subrequest budget: N/48 used (headroom under the 50-ceiling)` at sweep
  completion (visible in `wrangler tail`).

### v13.7-security — security hardening
- **CSP tightened**: removed dead `https://cdn.jsdelivr.net` from style-src +
  font-src (leftover from the v12.x Lottie CDN player, removed in v13.4; fonts
  self-hosted since v13.6). New CSP: `default-src 'self'; script-src 'self'
  'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:
  https:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'`.
- **fa-teams override XSS gate**: `/api/fa-teams/override` now validates the
  Farsi name via `isValidFaName` (Persian-only charset, 2–42 chars) at the
  storage boundary — defense-in-depth so even a compromised admin token cannot
  store an arbitrary HTML payload. (The client already renders via textContent;
  this closes the storage door.)
- **New gate** `scripts/check-security.js` (24 assertions): CSP strictness,
  admin cookie flags (HttpOnly/Secure/SameSite=Strict), timing-safe token
  compare, fa-teams override validation, webhook secret enforcement (403
  without/wrong), `isValidFaName` charset gate, login rate-limit (5/10min).
- **Verified solid (no change needed)**: admin auth (PBKDF2 + timing-safe
  compare), webhook secret (live-verified 403), rate-limit coverage on
  /api/public-matches (per-IP + refresh lock), XSS client rendering
  (textContent/createTextNode), wrangler secret list (13 secrets, none in vars).

### Debt assessment (documented, not refactored this session)
- **api.ts router → route table** (#1): safe to refactor (eval gate doesn't
  cover it) but needs an E2E router test script first (curl every endpoint,
  assert status codes) — ~20 admin endpoints can't be verified live without
  ADMIN_TOKEN.
- **`:any` tightening** (#3) + **dedupe.js/teams.js → TS** (#4): both blocked
  by the eval-harness transform (debt #2) which only strips `: Env`/`: any`
  patterns, not `: string`/`: number`/`: Match`. Recommended unblock: switch
  test scripts to esbuild (already a wrangler transitive dep) for TS→JS.
- **Cosmetic**: removed stray `// p: any;` comment from utils.ts:61 (a
  truncated `as any` cast leftover from the v13.3 types pass).

---

## [13.6-wrap] — 2026-09-13 (session close: modularization complete, changelog restructured, deploy re-verified, zip backup, next-session prompt)

Repository maintenance — no worker behavior change; `VERSION` stays 13.6-assets.

- **Session result (v12.33 → v13.6)**: the recovered 10,002-line rollup bundle
  was replaced by **21 real ES modules** (`src/worker.ts` is now a thin entry),
  with zero-behavior-change gates at every stage (15 self-check scripts, live
  verification after each deploy). Then: ONE shared client core (×3 I18N dicts
  unified, 191 keys), senders/mappers deduped, dead code removed, domain types
  added (**tsc noise 385 → 0**, `npm test` now gates on `tsc --noEmit` +
  version-sync), shared-env mutations eliminated, and the client payload
  extracted to immutable versioned assets — **public HTML 241KB → ~37KB (−85%)**,
  CSS/JS at `max-age=31536000, immutable`.
- **Changelog restructured**: the v13.0–v13.6 entries (previously appended at
  the bottom of this file) moved to the top, restoring the documented
  newest-first order.
- **Deploy re-verified**: final HEAD re-deployed so GitHub ↔ Cloudflare stay in
  lockstep; `npm test` exit 0 (147 assertions OK) before the wrap deploy.
- **Backup**: `git archive` zip of the wrapped HEAD shipped for offline backup
  (tracked files only — secrets live in wrangler, not in the repo).
- **Next session**: handoff prompt covering (1) UI/UX tweaks, (2) Telegram-bot
  flawless pass, (3) performance/caching, (4) fresh SWOT, (5) security review,
  (6) remaining technical debt (documented candidates: api.ts if-chain router →
  route table, eval-based test harness, sw.js CACHE-name bump for orphaned
  pre-13.6 asset entries).

## 13.6-assets — the payload split (2026-09-13)

### v13.5-debtzero — reliability + type-safety zero pass
- **`/api/simulate` no longer mutates shared CONFIG at runtime** (was swapping
  `CONFIG.KV_NOTIFIED_KEY`/`KV_USER_PREFS` to test keys — a concurrent cron
  sweep could read/write the TEST keys). The handler now passes a cloned env
  (`SIM_NOTIFIED_KEY`/`SIM_PREFS_KEY`); `matches.ts`/`users.ts` resolve keys
  per-request. Real notification state is isolated by construction.
- **All `env.TEHRAN_TZ` shared-env mutations eliminated** (notifications.ts ×1,
  digest.ts ×2 — the per-chat-group timezone now flows through scoped env
  clones, same fix the `/next` handler got in v13.2). `admin.ts applySettings`
  mutation kept — it is the deliberate KV→CONFIG settings refresh.
- **8 silent duplicate object keys removed** (kept last-wins → zero behavior
  change): `LEAGUE_LOGOS.PGL` ×2 (139.png dead entry), fa-dict ×5
  (Espanyol, RCD Espanyol de Barcelona, Fajr Sepasi, Paykan, Shams Azar
  Qazvin — space vs ZWNJ spelling), `FA_COMPS` PGL/HAZFI_CUP ×2.
- **tsc errors 29 → 0** (types-only edits; eval-gate verified byte-identical).
  `npm test` now gates on **`tsc --noEmit` + version-sync check** (package.json
  ↔ `VERSION` core compare) before the 13 behavior checks.

### v13.6-assets — client payload extracted to immutable versioned assets
- **HTML 241KB → 36KB (−85%)**: the big `<style>` (92KB) and app `<script>`
  (98KB + 16KB core) moved out of the template into
  `assets/public-13.6.css`, `assets/public-13.6.js`, `assets/core-13.6.js`
  (shared by /, /admin/login, /admin).
- Assets served via Workers Static Assets with
  `Cache-Control: public, max-age=31536000, immutable`; cache-bust by
  renaming (version suffix in filename). `assets/_headers` updated.
- Kept inline (first-paint critical): theme-init script, `@font-face` block,
  `PAGE_TZ` line (serve-time `__PAGE_TZ__` substitution still works),
  JSON-LD, and the full HTML body.
- `src/pages/client-core.ts` retired — `assets/core-13.6.js` is the source of
  truth for the shared I18N + theme/lang helpers now.
- Admin footer version now interpolates `VERSION` (was hardcoded ۱۲.۳۱ —
  three majors stale).
- `check-venue.js` reads the extracted app JS from `assets/public-*.js`.
- Extraction was generated from the EVALUATED page string (byte-exact served
  bytes) by `scripts/extract-page-assets.mjs` (one-shot, kept for provenance).

## 13.4-modular — the great modularization (2026-09-13)

### v13.0-modular — 21 real ES modules replace the 10k-line bundle
- `src/worker.ts` (10,002 lines, rollup-bundled artifact) split into 21 modules;
  worker.ts is now a thin entry re-exporting `api.ts`.
- Rollup noise stripped (`__name`/`__name2` decorators, CJS interop wrappers);
  `src/teams.js` + `src/dedupe.js` imported directly again.
- SUBREQUEST counter behind `bumpSubrequest()` (ES import bindings are read-only);
  identical budget semantics.
- Test infra: `scripts/lib/worker-src.js` (multi-file source loader, transformed
  to runnable JS); all 13 self-check gates green. Zero behavior change.

### v13.1-client-core — ONE shared client core
- The ×3 I18N dictionaries (public/login/admin, ~60KB source, 2 diverged keys)
  unified into `src/pages/client-core.ts` (191 fa/en keys) + the ×10 theme/lang
  helpers. Template-literal form keeps the wire format byte-identical
  (literal 2-byte Persian chars).
- Favicon/manifest head block deduped ×3 → ×1.

### v13.2-dedupe — duplication + dead code
- `sendTelegram`/`sendTelegramWithKeyboard` merged (optional keyboard param).
- thesportsdb event→match mapper extracted (`tspEventToMatch`, was ×3).
- Dead `return new Response("OK")` + always-true `hasKeyboard` guards removed.
- `/next` isolate-level `env.TEHRAN_TZ` mutation → scoped env clone.

### v13.3-types — core domain types
- `src/types.ts`: Env (LooseKV/WorkersAI/secrets), Match/TeamRef/Competition/
  Standings/PublicCup/XPostResult interfaces; ~100 functions typed `env: Env`.
- tsc noise 385 → 45 (37 scattered verbatim unknowns + 8 pre-existing dup keys).
- **fix**: reverted reassociated `await …get().catch()` casts — a real
  error-handling regression the eval-based test gate caught in CI-style.

### v13.4-live-css — live badges actually visible + perf
- **Pre-existing bug fixed**: the dotLottie CDN player was CSP-blocked
  (`script-src 'self'`) AND was the wrong package (never registered
  `<dotlottie-player>`) — live chips rendered EMPTY, loading states invisible.
- Removed the render-blocking unpkg script (4 failed requests/visit gone);
  live chips now use the CSS `live-beep` dot + text, liveCard h2 the
  `live-breath` dot, loading states a pure-CSS spinner.
- `assets/_headers`: 7-day cache for fonts/favicons (was `max-age=0`).
- Page wire size: ~80KB (brotli); bundle 696KB → 628KB raw.

## [12.x-maintenance] — 2026-09-13 (comprehensive maintenance, SEO, PWA, bilingual bot, AI translation, UI polish)

A massive maintenance + feature batch covering 30+ individual changes across the
SportSignal worker, bot, and site. All deployed live at `football.sportsignal.ir`.

### Bot
- **Switched to new bot** `@SportSignalAlertsBot` (8988731008) — new BOT_TOKEN +
  WEBHOOK_SECRET set in Cloudflare, webhook registered with
  `allowed_updates: ["message", "callback_query"]`
- **Bilingual bot** (Farsi + English) — language picker inline keyboard at
  `/start` (🇮🇷 فارسی / 🇬🇧 English), `/lang` command for switching, all command
  responses rendered in the user's chosen lang, cron notifications (24h/3h/1h/
  kickoff/final/coronation/weekly-tables) all lang-aware. Leaner text + fewer
  emojis.
- **Cron gaps filled** — 5-min "kickoff now" reminder for big matches,
  half-time (PAUSED) detection + HT notification, matchday morning digest at
  9am local tz (per-chat dedupe), big-match FT broadcast to all users (not just
  followers).
- **CHAT_ID cleared** — the old bot's chat ID was causing 403 errors on every
  cron sweep. Now relies purely on the KV users list (populated by `/start`).

### AI Translation
- **Workers AI binding enabled** — `[ai] binding = "AI"` added to wrangler.toml.
  The `maybeRunFaAi` function now runs on each `/api/public-matches` request
  (15min cooldown) to incrementally translate unknown Latin team names.
- **Complete data stream audit** — `collectUnknownTeamNames` now scans ALL 11
  data streams: upcoming, finished, thisWeek, nextWeek, topSpot.matches,
  topSpot.next, nextBig, standings, cups.next, ucl.teams, ucl.matches.
- **Admin name correction** — `POST /api/fa-teams/override` endpoint lets the
  admin manually set/correct the Farsi name for any team. Overrides take
  priority over AI-learned + static dictionary. Cache invalidated on override.
- **Admin panel UI** — two input fields (English + Farsi) + "ثبت / اصلاح"
  button in the Smart Farsi section.

### SEO + PWA
- **Meta description** + **Open Graph** tags + **Twitter Card** tags +
  **JSON-LD** structured data + **canonical URL** added to the main page head.
- **sitemap.xml** route added (`/sitemap.xml` returns a minimal urlset).
- **robots.txt** updated with Sitemap directive.
- **Service worker** (`assets/sw.js`) — network-first for navigations,
  cache-first for static assets, stale-while-revalidate for HTML pages.
  Registered in the main page HTML.
- **Font preload** for Vazirmatn Regular + Bold. Vazirmatn-Medium (500)
  removed (never used by any element).

### UI/UX Polish
- **Floating Telegram FAB** — 56px circular blue button fixed to the
  bottom-right on PC. Self-promoting white bubble every 60s. Hidden on
  scroll (PC). Retired on mobile (joinSticky covers it). Retired the
  header CTA pill on PC.
- **Hero card** — dark navy blue border (#1e3a8a, 2px) with 40%-reduced
  opacity, soft drop-shadow (filter:drop-shadow), team names always full
  (no truncation, fluid clamp font-size), time box centered, time moved
  20px+5px down, spacing expanded, kickdate enlarged (18px desktop).
- **Hero logos** — bigger than topspot at all viewports (hero 102/64 >
  topspot 51/43 > regular 41/37). All logo shadows removed.
- **Topspot logos** — 20% smaller (was 64/54, now 51/43).
- **Countdown** — full-word format ("۱۴ ساعت و ۱۵ دقیقه و ۴۸ ثانیه")
  instead of HH:MM:SS. Progress bar 25% thicker (4px → 5px). Clock green
  (matches progress bar) in normal state, blue in "soon" state.
- **UCL header** — lighter blue in light mode (not navy CTA). Title moved
  next to the starball logo (right-aligned). Matchday chip flush to the
  far left. Trophy emoji removed.
- **Standings** — league leader (position 1) bolded + 2pt larger font.
  UCL standings leader also bolded.
- **Cups grid** — all domestic cups merged into one 2-column grid (no
  more single-box rows). DFB Pokal (جام حذفی آلمان) added.
- **Live indicator** — Live.lottie animation replaces CSS dot in the
  livechip + #liveCard h2 heading. loading.lottie replaces CSS spinner
  + "در حال بارگذاری..." text in all loading states.
- **3-dot share toggle** — silver in light mode, light blue in dark mode.
- **Dark mode** forced as default (regardless of system preference) via
  `<meta name="color-scheme" content="dark light">`.
- **Admin panel buttons** — font-family:inherit (Vazirmatn, not Arial).
- **About + Contact footer** — full bilingual origin-story text + email
  contact box. Contact nav link anchors to #contact (not the bot URL).
- **Favicon** — custom favicon set (favicon.ico + 16/32/180/192/512 +
  site.webmanifest) deployed.
- **Spotitem boxes** — content vertically centered (flex + justify-
  content:center). Team name tooltips for truncated names.
- **Vazirmatn font** on all admin panel + login page buttons.

### Data Resilience
- **Cached snapshot fallback** — on API failure, the worker serves the
  last successful data snapshot from KV (7-day TTL) with a "cached" badge.
- **Snapshot written on every successful fetch** — never overwrites with
  empty data.

### Audit Dashboard
- **Retired** — the Next.js audit dashboard at `/` replaced with a
  redirect to `football.sportsignal.ir`.

---

## [12.33-xpost] — 2026-09-15 (X / Twitter automated profile — OAuth 1.0a HMAC-SHA1 signing inline, KV budget governor, dry-run, admin X card)

The SportSignal brain now mirrors to a dedicated **@SportSignal X account**
alongside the Telegram bot — Persian mirrors of the coronation / FT / kickoff /
weekly-tables composers, ≤280 chars, Persian numerals, `#فوتبال` + league tag,
ending with `football.sportsignal.ir`. Single-file, no new npm dependencies.

- **OAuth 1.0a "user context" signing** implemented inline with
  `crypto.subtle` HMAC-SHA1 — `xPercentEncode` (RFC 3986 + the `!'()*` set),
  `xBuildBaseString` (RFC 5849 §3.4.1.1), `xBuildAuthHeader`. JSON request
  bodies are NOT part of the signature (only `oauth_*` params are). Verified
  against the canonical RFC 5849 base string + Node-crypto HMAC-SHA1 reference
  in the new `scripts/check-x-signature.js`.
- **`POST https://api.x.com/2/tweets`** with reply-threading
  (`reply.in_reply_to_tweet_id`) for the weekly-tables digest (1 root + N
  replies, one per league). 401 → admin log "bad keys"; 429 → KV pause 15min
  (`x_pause_v1`); 5xx → one retry; every outcome written to `x_last_error_v1`.
- **KV budget governor** (`x_budget_v1:<yyyymm>` cap 450, `x_daily_v1:<yyyymmdd>`
  cap 12, TTLs on writes) — the free tier's ~500 posts/month cap can never be
  broken. Hard caps are checked before EVERY post (not just at sweep start),
  so a multi-post sweep aborts mid-way when the budget runs out. Test-post
  daily cap 5 (`x_test_v1:<yyyymmdd>`) keeps manual admin testing inside the
  free tier.
- **KV dedupe** (`x_post_v1:<type>:<key>`, 7d TTL) — separate from the Telegram
  dedupe so X and Telegram each fire exactly once. Same-event keys
  (`coronation:<league>`, `ft:<matchId>`, `kickoff:<matchId>`,
  `weekly:<isoWeek>`). Kickoff is skipped if the FT marker already exists.
- **Phase config** (`x_phase_v1`, comma-separated):
  `coronation,ft,kickoff,tables,media` — defaults to `coronation,ft` (phase B
  live). The admin panel toggles phases at runtime without re-deploying.
- **Master switches** — `X_ENABLED` (secret) + `x_enabled_v1` (KV override);
  `X_DRY_RUN` (secret) + `x_dry_run_v1` (KV override). KV wins over secret so
  the admin panel can toggle without `wrangler secret put`. Dry-run logs the
  composed text to the console + writes `x_last_post_v1` (kind suffix
  `:dry-run`) WITHOUT consuming budget or marking dedupe — so the next live
  sweep still fires.
- **maybePostX() wired into the cron sweep AFTER the Telegram checks**
  (after `sendMatchNotifications` + `maybeNotifyTableToppers`). X is additive:
  wrapped in its own try/catch so a failing post can NEVER fail the sweep or
  break the Telegram path. The coronation events list is captured from
  `maybeNotifyTableToppers` and passed to `maybePostX` as `opts.topperEvents`.
- **Persian composers** — `composeXCoronation`, `composeXResult`,
  `composeXKickoff`, `composeXTableForLeague`. All ≤280 chars, Persian
  numerals via `toFaDigits`, league hashtag (`#لیگ_برتر_انگلیس`, `#لالیگا`,
  `#سری_آ`, `#لیگ_۱_فرانسه`, `#بوندسلیگا`, `#لیگ_قهرمانان_اروپا`, …),
  `#فوتبال`, ending with `football.sportsignal.ir`. Truncation uses the
  ellipsis char `…` so the URL + tags survive.
- **Admin panel X card** at `/admin` — status line (enabled / dry-run /
  paused / phase / monthly+daily budget counters / last post + last error),
  «پست تست» button → `POST /admin/x-test` (admin-token protected), dry-run
  toggle, enable toggle, phase config (comma-separated input), clear-429-pause
  button (shown only when paused). Backed by `/api/x/status` (GET),
  `/api/x/phase` (PUT), `/api/x/dry-run` (PUT), `/api/x/enabled` (PUT),
  `/api/x/clear-pause` (POST), all admin-auth-checked. RTL/logical-property
  CSS conventions preserved.
- **New tests**: `scripts/check-x-signature.js` (RFC 5849 base string +
  Node-crypto HMAC-SHA1 reference + percent-encoding of the `!'()*` set +
  tweet-only-oauth_* params + secrets with reserved chars) and
  `scripts/check-x-budget.js` (month/day key format, budget cap math, dedupe
  exactly-once + TTL, KV overrides secret, phase default `coronation,ft`,
  Persian league tags, all composers ≤280 chars + Persian numerals + #فوتبال
  + URL). The `grabFn` helper in `check-x-budget.js` was rewritten as a
  string-aware brace scanner with a state stack — the worker's composers use
  `\u{1F451}` curly-brace unicode escapes inside template literals which
  broke the old brace counter. `bun run test` now runs 13 scripts (was 11);
  all green, exit 0.
- **Secrets** (`wrangler secret put`): `X_API_KEY`, `X_API_SECRET`,
  `X_ACCESS_TOKEN`, `X_ACCESS_TOKEN_SECRET`, `X_ENABLED`, `X_DRY_RUN`. Never
  in repo files. The admin panel can override `X_ENABLED`/`X_DRY_RUN` at
  runtime via KV without re-deploying.
- **Phased rollout** (per the handoff doc): **A** dry-run (log composed text
  via `X_DRY_RUN=1`; verify OAuth signature against the canonical vector in
  `check-x-signature.js`) → **B** live posts (coronation + big-match FT —
  default phase) → **C** kickoff notes + weekly thread + hard budget caps
  (toggle phases via admin) → **D** media posts via
  `upload.x.com/1.1/media/upload.json` (deferred — phase config already
  reserves the `media` slot).
- **`VERSION`** bumped `12.32-backlog` → `12.33-xpost`; admin-page i18n
  `ver` strings (fa + en × 2 admin pages) refreshed to describe the X
  integration. `package.json` 12.32.0 → 12.33.0.

---

## [12.32-wrap] — 2026-09-15 (session close: repo sync, changelog, deploy re-verified, zip backup, X-integration handoff)

Repository maintenance — no worker behavior change; `VERSION` stays 12.32.

- **Deploy re-verified**: live page markers (kickdate ×13, FIN_EXPANDED ×5,
  fmtHeroDate ×3, 72px watermarks, «بیشتر»/«کمتر») match `src/worker.ts` at HEAD;
  the 11-script suite re-run green (exit 0) before the wrap deploy; worker
  re-deployed from the final wrapped HEAD so GitHub ↔ Cloudflare stay in lockstep.
- **Handoff doc added**: `NEXT-SESSION-X-INTEGRATION.md` — full brief + copy-paste
  prompt for the next session: connect SportSignal to X (Twitter) and run an
  automated X profile (OAuth 1.0a HMAC-SHA1 signing inline via crypto.subtle,
  POST /2/tweets, reply threads, KV budget/dedupe governors, admin X card,
  phased rollout A dry-run → B live → C threads → D media).
- **Backup**: `git archive` zip of the wrapped HEAD shipped to the user
  (tracked files only — `tokens.txt` and `.dev.vars` stay gitignored, secrets
  live in wrangler).
- **GitHub**: remote restored to `assadigit/SportSignal`; the sandbox's stored
  classic token was redacted by the environment, so the push of the 15
  post-v12.0 commits is queued for a user-supplied token
  (`git remote set-url origin https://<token>@github.com/assadigit/SportSignal.git && git push origin main`).

## [12.32-backlog] — 2026-09-15 (7-item backlog: hero date under the time chip, mobile time between crests, 5+«بیشتر» results, new-leader Telegram alerts, corner watermark crescents, smaller bar clock, bigger logo)

User ask (backlog of 7):
1. move the date line below the countdown chip ("time / weekday day month",
   smaller font) — out of the navy bar;
2. on mobile, move the match time between the clubs' logos, aligned;
3. recent results: last 5 + a «بیشتر» button that shows the latest 20 (PC too);
4. a Telegram special alert when a NON-first team (2nd/3rd/4th…) tops the
   table after a match, with the match details;
5. the two hero background badge watermarks repositioned to the container's
   bottom corners, centers offset ~27.5% of the badge diameter inward, the
   rest clipped by overflow:hidden (partial crescents);
6. decrease the ⚡ bar countdown numbers (PC + mobile);
7. increase the SportSignal logo by 15% in PC mode.

- **Hero time/date stack**: #bigbarDate (v12.31's in-bar date run) is
  RETIRED; spotItemNode (hero = opts.noDate) renders the center slot as a
  COLUMN — the 24px time chip with the new .kickdate (weekday + day +
  month, fmtHeroDate, 12.5px PC / 10px phones) under it, one centered stack
  between the two clubs. Live-score heroes get the same stack.
- **Mobile face-off**: the time/score slot rides BETWEEN the two crest
  columns on the crest line (order:1 + align-self:flex-start +
  height:46px — the chip centers exactly on the 46px crest's vertical
  center; the hero column uses height:auto + 3px top offset). Names stay
  under their crests. Direct-child selectors so the hero's nested score
  never re-flows.
- **Results expander**: server finished cap 12 → 20; the card renders the
  latest FIVE with a «بیشتر»/«کمتر» pill (FIN_EXPANDED) — one tap shows
  the latest 20; language switch rebuilds the rows + pill (renderFinished
  with force + onLang now re-renders hero/topspot/finished too).
- **👑 Table-top alerts (bot)**: maybeNotifyTableToppers runs after every
  cron sweep — per domestic league (weeklyTableCodes minus CL), the
  current #1 is compared with the last run's KV snapshot
  (table_top_v1:<code>, top-10). Fires only when the new #1's previous
  position was 2+ AND a just-finished (6h window) match involving the new
  or old leader is in the pool — the message carries the new leader +
  points + previous rank + the triggering match (teams, score, winner,
  league, Jalali date) in the bot's MarkdownV2 style. Snapshot updates
  every run → each coronation notifies exactly once.
- **Corner crescents**: .hero-wm imgs anchor to the card's bottom corners
  (first/home badge bottom-LEFT, second/away bottom-RIGHT — PHYSICAL
  left/right, the wireframe's corners are screen corners, not logical),
  centers 88px inward on both axes (27.5% of the 320px diameter), the
  72px overhangs clipped by the layer's overflow:hidden. Phones keep the
  layer hidden (v12.30 ask stands).
- **Smaller bar clock**: .bighero .bigbar-clock 18px → 14px PC / 12.5px
  phones (the hero's 24px time chip stays the headline number).
- **Logo +15% PC**: .brand img 50px → 57.5px at ≥601px (phones keep 50px).

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

