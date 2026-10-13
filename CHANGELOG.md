# Changelog

All notable changes to the UCL Notifier are documented here, newest first.
Version strings follow the value exposed by the live `/api/status` endpoint
(see `src/worker.ts` `VERSION`).

---

## [13.94-fanoutfix] — 2026-10-13 (the notification fan-out made wall-proof + quota-proof — "I get all 3, other users get 1")

User-reported, live-diagnosed with a retained `wrangler tail` (13:41Z→) + KV/D1 readbacks: the admin receives every notification flawlessly while other registered users receive none or only some ("another user received one of tonight's 3 matches, I received full 3"). All 4 chats probed alive via getChat — not a blocked/dead-chat problem. The live forensics found THREE interlocking root causes:

1. **The mid-flight fan-out death (the admin/others differential).** The runtime's ~50-subrequest ceiling is per-invocation and Cloudflare's accounting is coarser than the worker's fetch-only meter (the 15:30Z tick: meter read "50/48" while sportscore/standings/wikipedia calls were already rejected; the 15:40Z tick ran 30 fetches + 30 KV ops = 60 "true" and survived — per-colo variance we cannot see or rely on). The old notify guard could only stop BETWEEN matches (fetch counter > 38) — a fan-out it let through could die MID-FLIGHT: the roster-order-FIRST chats (the admin is chat #1) got their cards, the tail chats lost card + text fallback + outbox entry in one cascade, all under an already-persisted write-first dedupe record = PERMANENT silent loss for exactly those users.
2. **Whole matchdays lost to the wall.** Busy-tick compositions (full sweep + sportscore day-loop + cup scans + standings) burn 40-50 fetches before the notify phase — every in-window tick defers, the window closes, the type never fires for ANYONE. The audit held the evidence: 2026-10-09/10/10/11 gaps (Dortmund-Werder, Arsenal-Leeds, Chelsea-Bournemouth, Barca-Getafe, ManUtd-Tottenham, Liverpool-ManCity, Como-Roma, Sassuolo-Milan, Cagliari-Juventus — zero records, zero sends).
3. **The KV quota kills the write-first gate every evening.** The account-level daily quota (10048, measured live via REST probe at 17:15Z today) makes saveNotifiedMatch fail from ~14:00 UTC — every send defers; when the failure outlives the windows, whole evenings vanish (the same audit gaps). The cron path's writes passing today (while visitor writes failed) is per-colo enforcement variance, not a guarantee.

The fix (all three):

- **THE FAN-OUT RESERVATION** (`fanoutReservation` in notify-engine.ts): before ANY dedupe write, each (match, type) unit projects its worst-case cost (2 crest fetches/group + 2 sends/chat + the dice for match-start + margin) against the TRUE count (fetch + KV ops) and the new `SUBREQUEST_FANOUT_CAP: 46`. Verdicts: **full** (cards + text), **lean** (match-start only — must-fire semantics degrade to text-only, no cards/dice, when only the full fan-out cannot fit), **defer** (a CLEAN deferral — no dedupe write happened, so the next tick retries inside the same window; every window is ≥45min wide and the backfill legs cover the rest). A mid-flight death is now impossible by construction. The old between-matches guard is REMOVED.
- **Maintenance demoted below the product**: cron's phase order is now pool → **notify** → maintenance → public (was: maintenance before notify — the cup scans' ~12 fetches (429 retries) + standings refresh spent the budget a pending fan-out needed). runPoolMaintenance additionally skips busy ticks entirely (true count > `FANOUT_MAINT_MAX: 30`) — every step inside has its own marker/due-gate, so an idle tick picks the work up.
- **The notified-store on D1** (`notified_v1` table, binding USERS_DB): the write-first dedupe INSERT OR IGNORE against the (match_key, ntype) PRIMARY KEY — atomic check+write (the KV blob needed a whole-key read-modify-write), durable 24/7 on D1's separate 100k-writes/day tier regardless of the account KV quota. changes>0 = persisted → the fan-out proceeds (write-first preserved); changes=0 = already sent → skip; D1 failure → false → the send defers (fail-closed preserved). Legacy paths VERBATIM when USERS_DB is unbound or the sim override is set (notified_matches_v6 blob, SIM keys, byte-identical contracts). One-time KV→D1 import behind the `notified_migrated` marker in userstore_meta (self-healing, empty-after-marker means empty); the probabilistic cleanup (2%) keeps rows 14 days past their window (never-re-arm is absolute while a window could matter — the horizon fence never looks past ±3 days).
- **Per-chat outcome visibility**: the notify breadcrumb now carries `o` (sent/failed/dead per chat across the round) + `dk` (the deferred (match,type) keys, capped 12) — the old "at least one send landed" (anySuccess) blindness is exactly what hid the tail-chat losses from every log and counter.

Harness co-evolved in the same commit: check-reliability's #6 section rewritten for the reservation (the old guard must stay GONE; the verdicts; the true-count read; the lean degradation; the D1 store's INSERT OR IGNORE + fail-closed + sim isolation + marker semantics; the maintenance demotion + phase order); check-no-miss Section VI (behavioral, the REAL sliced functions): fanoutFetchCost math, the full/lean/defer verdicts at controlled budgets, the D1 dedupe round-trip + duplicate + fail-closed + KV-fallback + marker-less self-heal + empty-after-marker + sim isolation + the legacy KV path. Suite 1002 → 1042 green, tsc clean.

---

## [13.93-fullrec] — 2026-10-13 (full-table season chips + windows for every team)

The v13.88 handover item closed: bottom-half league sides (rank 9+) were invisible to the payload's top-8 standings compacts — their match-page season chip silently dropped and their team page had no standings window. Both now read the FULL cached tables (the same source the competition pages render since v13.89).

- `fullByCodeFor` (pages.ts): the shared cache-only loader — fullStandings per competition code, the payload shell's faName/emblem riding along. Match pages load ONE code (the match's comp); team pages ≤ 2 (derived from the team's OWN fixtures — the league always appears there; see the LIVE-QA lesson below). Fail-closed per code: a missing/stale cache → the payload path, exactly v13.88 behavior.
- `teamSeasonRecord`/`teamStandingsWindow` gain the optional `fullByCode` param (searched BEFORE the payload compacts — fresher + complete; the payload stays the fallback). Every league side gets its chip; every ranked team gets its window; the window's next-comp preference and top-3 clamping are unchanged (locked behaviorally).
- The season chip gains the standings-rank badge «ردیف ۲» (fspos) — the context that makes W/D/L counts readable at a glance; absent when pos is null (cup/UCL shells without pos).
- Styling polish: .strow-me gains an inline-start sky accent bar + hover lift; .fdot hover scale (1.14, 120ms); all disarmed under prefers-reduced-motion.
- Harness (same commit): 3 updated locks (the new signatures/wiring), 6+1 new v13.93 locks + 2 behavioral evals of the REAL functions (rank-14 chip from the full table; full-table-beats-stale-payload; both-miss fail-closed null; rank-12 window 10-14 with meIdx 2; cup-next fallback still finds the league; top-3 clamp from the full table; the richest-record regression). Suite 995 → 1002 green, tsc clean.
- TWO LIVE-QA iterations (found on the deployed pages, fixed same version): (1) the fullByCode code source for team pages was initially the payload comps — but a rank-9+ team is invisible in the top-8 compacts BY DEFINITION, so its league chip silently fell back to a 1-game UCL record; the codes now derive from the team's OWN fixtures (the league always appears there). (2) a standings_cache_CL exists (the 36-team UCL table) and recCodes ordered the next-fixture cup FIRST — the 1-game UCL record drowned the 9-game league season; teamSeasonRecord now collects candidates from all three sources and the RICHEST wins (most played; ties keep source order full → payload → ucl). LIVE-VERIFIED after both fixes: /teams/liverpool «ردیف ۹ ۲ب ۳م ۱ش از ۶ بازی لیگ برتر انگلیس» and /teams/manchester-united «ردیف ۱۳ ۱ب ۳م ۲ش از ۶ بازی لیگ برتر انگلیس» — both rank-9+ sides previously invisible. Match pages keep their 1-read budget (the match's comp only — a UCL match honestly shows the UCL record; the side's league record lives on its team page).

---

## [13.92-d1userstore] — 2026-10-13 (user data on D1 — quota-proof user writes)

Root cause measured live (GraphQL KV analytics + REST probes): the Workers free-plan KV write quota is ACCOUNT-level, and this account also hosts the sibling currena workers — by 14:00 UTC the two apps had written 631 (STATE) + 658 (RATES) = 1,289 keys, so every `put` fails with error 10048 until the midnight-UTC reset. That is Tehran prime time: every /timezone, /follow, /lang and /start tap failed (honestly surfaced since v13.91, but still failing). The v13.91 handover's candidate (a) is now shipped, following the v13.56 pageviews precedent.

- NEW `src/user-store.ts` — the user-data seam: user prefs / chat registry / chat profiles / Telegram update dedupe on a dedicated D1 database (`sportsignal-users`, binding USERS_DB; D1 free tier = a SEPARATE 100k writes/day). User actions are writable 24/7 regardless of the account-level KV quota. Per-row atomic upserts also kill the old whole-blob read-modify-write race (two concurrent users editing different rows used to clobber each other's prefs).
- Contract discipline: with USERS_DB unbound (local dev / eval harness / a missing binding) every function serves the EXACT legacy KV paths — byte-identical key contracts (user_prefs_v1 / telegram_users_v6 / user_profiles_v1 / upd_<id> TTL 600). Reads under D1: table first, legacy KV snapshot on D1 error (fail-open). Writes under D1: table only (a KV mirror would re-burn the quota we are escaping); failures return false so the v13.91 honest-failure UX keeps working.
- Migration: one-time KV→D1 backfill (scripts/backfill-userstore.js — parameterized D1 REST inserts, idempotent) + the `userstore_meta.migrated_at` marker. AFTER the marker, an empty `chats` table means EMPTY — a /stop-ed roster is never resurrected from the stale KV copy. A marker-less empty table self-heals once from the legacy snapshot (fresh-DB recovery). Semantics preserved verbatim: /stop prunes the registry only (prefs stay orphaned); /follow all wipes the row (lang+tz go too); admin clear-locks wipes the registry (prefs/profiles survive); upd dedupe stays write-first + availability-first.
- 13 write sites rewired through the seam: bot.ts (lang: registration, tf:all/tf:<n> team toggles, tz:reset/tz:<city> with the v13.91 guards, per-message profile upsert — now a single-row read + upsert, /start join, /stop, /follow all, /follow nums, /timezone reset/city, upd dedupe), users.ts (getRegisteredChats/getUserPrefs/getBotMembers/setUserLang delegate), notify-engine + digest-bigmatch dead-chat prunes, admin-ops clear-locks, admin-bot chatProfile.
- Behavior improvement (documented): a FAILED registration no longer dead-ends the welcome — the user flow continues and INSERT OR IGNORE retries on their next interaction (the old path threw and lost the welcome entirely).
- Harness co-evolution (same commit, RUNBOOK §11): worker-src concat gains user-store.ts before users.ts (module comment documents the position rule); check-join-flow / check-bot-edges / check-admin eval the REAL user-store source now (their stubs masked the [CHAT_ID] registry seed — the real semantics are locked: fresh registry seeds with the admin, /stop leaves the seed member in place); NEW scripts/check-userstore.js (mock D1): D1 round-trips, full-row replace, explicit-null shape parity, register/remove/prune/reset, updSeen new/dup/D1-error-proceeds, empty-after-marker no-resurrection, marker-less self-heal, D1 read-fail fallback, D1 write-fail honest false + NO KV mirror, sim isolation, legacy upd_ write-first. 963 → 965... plus the new file's 29 checks: suite total 994.
- The deferred live E2E (tz write-path, quota-blocked since v13.91) is now quota-free: D1 writes don't touch the KV limit.

---

## [13.91-tzquota] — 2026-10-13 (honest tz saves under KV quota pressure)

Live-E2E finding: the STATE namespace hits the free tier's 1,000-writes/day ceiling late in the day (healthz's kv_writes_day counter tracks only ~28% of real puts — a monitoring blind spot). When the quota is exhausted, every prefs write (timezone, teams, language) failed with a hanging spinner and nothing told the user why.

- tz save paths (the tz: callback AND /timezone <city>) now guard the prefs put: on failure the user gets an honest «⚠️ فعلاً ذخیره نشد — بعداً دوباره امتحان کنید» toast/message, and NO confirm view is ever rendered for a tz that was not persisted (write-first honesty extended to the failure branch).
- Harness: +2 behavioral checks (throwing-put env: the callback answers retry-later + sends no edit; the command warns + never claims success). 961 → 963.
- Known-issue documentation (worklog): the structural fix candidates are (a) migrating user_prefs_v1 to D1 (the v13.56 pageviews precedent — D1 free tier allows 100k writes/day), (b) instrumenting the uncounted put sites into kv_writes_day, or (c) reducing heartbeat cadence. Not addressed in this version.

---

## [13.90-tzonboard] — 2026-10-13 (timezone onboarding + the region picker with live local times)

The big one users asked for: a member in Sydney and a member in New York get their alerts at THEIR local hours. The timing engine was already per-tz (morning digest at 9am local, per-tz render groups) — but nobody was ever ASKED their tz, so everyone silently ran on Tehran time.

- Onboarding: the language tap on /start now follows the welcome with the timezone prompt (region picker) for every user with no tz set. Returning members get it on their next /start (once; a set tz never re-prompts — the lang: tap path and the /start path both check). Users who ignore it keep the Tehran default (fail-closed, zero behavior change for lurkers).
- The region picker: hub (🇮🇷 Tehran one-tap quick-pick with live time · 6 regions · reset) → region pages (43 cities across Europe/Middle East/East Asia/North+South America/Oceania). Every city button carries its LIVE local time (HH:mm, Persian digits for fa) — the self-confirming signal: tap the button whose clock matches yours. The current zone is ✅-marked.
- Select + confirm: tapping a city SAVES the tz immediately (write-first) and edits to the confirm view — zone + your local time + UTC offset, «✅ بله، درست است / Yes, correct» (finalizes, buttons removed) or «🔀 تغییر منطقه» (re-opens). tzok → the done text with the /timezone reminder.
- /timezone (the «زمان» reply-keyboard button) now opens the same hub; /timezone <city> and /timezone reset unchanged (35 new TZ_ALIASES: vienna/athens/riyadh/kuwait/seoul/shanghai/jakarta/chicago/denver/vancouver/mexico-city/sao-paulo/buenos-aires/lima/bogota/santiago/caracas/auckland/wellington + popular European inputs).
- The tz status now reads «منطقهٔ زمانی شما: Europe/London — ساعتِ شما: 14:32 (UTC+1)» — offset + live time always visible.
- Admin: the /members roster shows each member's zone (⏰ tz or «تهران (پیش‌فرض)») — the rollout is observable.
- FIXED two latent MarkdownV2 delivery bugs found by live-API QA: (1) BOT_STRINGS' single-escaped \! and \. produced no backslash at runtime → the post-language-tap welcome 400'd and NEVER DELIVERED (every new member's first welcome was silently lost since v13.72's slim-down); (2) the /timezone status tail carried raw «>» in «/timezone <city>» → 400 (no-arg /timezone never delivered since v13.49). Both double-escaped now; the new harness check locks the FULL reserved set (_*[]()~`>#+-=|{}.!) over every new tz text.
- Harness: +34 checks (69 in bot-edges: onboarding no-nag rules, region rendering, ✅ marks, live-time labels, back/fail-closed navigation, write-first confirm, tzok dismiss, real toFaDigits/escapeMarkdownCharacters slices, TZ_REGIONS 43-slug integrity + Telegram charset safety, offset correctness incl. the quarter-hour Kathmandu zone, MarkdownV2 cleanliness) + 4 reliability locks (tzr/tzok handlers, both prompt sites) + admin B11 updated for the prompt. 927 → 961.

---

## [13.89-stdetail] — 2026-10-13 (W·D·L columns, the honest full table, interaction polish)

- Standings tables gain the compact W·D·L column «ب-م-ش» («۶-۲-۱» per row, each count in its win/draw/loss hue, tabular digits, hover title «برد-مساوی-شکست») — BOTH the team-page window and the competition full table. Desktop-visible, hidden ≤600px (mobile keeps pos/name/pts). Fail-closed cell: rows without stats render «—».
- «جدول کامل» is now honest: competition pages read the FULL cached standings table (`fetchStandings(env, code, false)` — ONE cache-only KV read, allowFetch=false never touches a provider, the seo layer's reads-only-KV contract holds; fail-closed to the payload's top-8 compact when the cache is missing). The team window's «جدول کامل» link used to lead to a top-8 table.
- Full-table rows gain faName via the isolate-cached translateTeam (same mapping the payload uses); emblem/fa shell still rides the payload.
- Season chip clarity: «از ۸ بازی لالیگا» — the competition name rides the chip (mixed-source records like a UCL match with one side's La Liga record and the other's UCL record now read unambiguously).
- Interaction polish (a11y + detail): `:focus-visible` rings on every interactive surface; .hubtile hover lift (-1px); .stmore/.pagination hover states; prefers-reduced-motion disarms the lifts (the live-pulse rule already existed).
- Harness: 6 new checks (stWdlHtml in both tables, header count, full-table cache-only + async wiring, translateTeam mapping, chip comp name, styles + a11y + reduced-motion). 921 → 927.

## [13.88-formagg] — 2026-10-13 (the season-record fallback + form reaches team pages)

Closes the v13.87 handover item "the form strip is fail-closed-dark TODAY": the seo archive is still young, so match pages rendered NO form card at all. The standings snapshots the payload already carries (played/won/draw/lost per team) light the card honestly TODAY — zero new subrequests.

- `teamSeasonRecord(ctx, teamName)` (seo/data.ts): payload-only lookup (5 league compacts + PGL + the full UCL table), returns won/draw/lost/played/pos/points + comp identity, null when the team is in no table (fail-closed). No fetches, no KV — the data rides the payload the page already loaded.
- Match pages «فرم اخیر»: a side with no per-match dots falls back to its season chip («۶ برد · ۲ مساوی · ۱ شکست از ۹ بازی») — visually distinct from dots (flat pill, three count segments in the win/draw/loss hues, no fake per-match granularity). The card title honestly switches to «وضعیت فصل» when neither side has dots. Still fail-closed: no dots AND no record → no card.
- Team pages: the form card reaches them (the v13.87 deferred item) — «فرم اخیر {team}» with dots when ≥3 finished rows exist, else «وضعیت فصل {team}» with the season chip. buildTeamPage is async now (one bounded archive KV read per render, fail-closed — same contract as the match pages).
- Team answer sentences (and meta descriptions) now carry the standings position from the window's own snapshot row: «…با ۱۵ امتیاز در ردهٔ ۲ لیگ برتر انگلیس قرار دارد.» One source of truth (teamStandingsWindow's me-row), no extra reads.
- Shared renderer `formRowHtml` (one row = dots + summary OR season chip) for both pages; dot legend microcopy («ب برد · م مساوی · ش شکست») under any card that shows dots.
- Styling (inline page-shell block — no asset rename, ADR-006 respected): `.fseason` chip family (.fsw/.fsd/.fsl/.fsplayed, tabular digits), `.formlegend` with reduced-footprint dots.
- Harness: 7 new checks in check-stats (wiring, payload-only fail-closed, title switch, async team build + router await, answer position, styles) + a BEHAVIORAL eval of the real teamSeasonRecord (brace-matched extraction, TS stripped by exact-string drift locks): finds a PL row with its numbers, falls through to ucl.teams via normalizeTeamName's club-prefix folding, null for an unknown team.

## [13.87-formtable] — 2026-10-13 (the league-table window + the recent-form strip)

Both cards ride data the pages ALREADY hold (zero subrequests, fail-closed: no data \u2192 no card):

- Team pages (/teams/{slug}): the \u00ab\u062c\u062f\u0648\u0644\u00bb window \u2014 a 5-row standings neighborhood (2 above, the team highlighted via .strow-me, 2 below; clamped at the top when the team is top-3) from the payload's standings snapshots, with a \u00ab\u062c\u062f\u0648\u0644 \u06a9\u0627\u0645\u0644\u00bb link into the competition page (internal-linking + engagement). Picks the NEXT fixture's competition, falling back to any table containing the team (covers cup-next pages).
- Match pages: \u00ab\u0641\u0631\u0645 \u0627\u062e\u06cc\u0631\u00bb \u2014 both sides' last-5 W/D/L as \u0628/\u0645/\u0634 dots (green/gray/red, hover title with opponent + score + date) + a W\u00b7D\u00b7L count summary. From the pool's 30-day FINISHED rows; a side with <3 results drops out, both sides short \u2192 no card.
- Styling: .strow-me sky-accent highlight (the .mcount/.mvenue-map family), .stmore footer link, .formstrip/.formrow/.formdot .fw/.fd/.fl with tabular digits + reduced footprint on mobile.
- New data helpers: teamStandingsWindow + teamForm (seo/data.ts \u2014 content-additive; seo/* is NOT in the eval harness, so no worker-src changes; new static locks in check-stats).

## [13.86-groundsfix] — 2026-10-13 (QA-found name-form bugs: the hero match gains its venue)

**The QA finding that closed itself:** the live hero match page (Club Atlético de Madrid vs Manchester United) rendered with NO venue while the home-ground table held the Metropolitano — FD sends the full club-prefixed name, the v13.85 table keyed the short form, and `normalizeTeamName` never strips club prefixes. Inter home fixtures missed for the same reason (FD: "FC Internazionale Milano" vs key "Inter Milan").

- `grounds.ts`: map keys + lookups now fold through `normTeamKey` (strips club/afc/rcd/rc/deportivo/athletic/racing prefixes on BOTH sides) — the FD full form, the short form and the table key collapse to one key. Harness co-evolved in the same commit (check-venue evals the REAL normalizers now — the folding is the behavior under test; live-derby's grounds slice extends through curatedVenueFa).
- `TEAM_STADIUMS`: provider variant keys added ("Atlético Madrid", "FC Internazionale Milano"); the three followed clubs missing from v13.85 added — Tottenham (Tottenham Hotspur Stadium / ورزشگاه تاتنهام), Juventus (Allianz Stadium / ورزشگاه آلیانز تورین — distinct from Bayern's Arena), AS Roma (Stadio Olimpico / ورزشگاه المپیکو).
- `curatedVenueFa(venueEn)` (grounds.ts): reverse lookup for PROVIDER venues — a live-detail venue arriving as the English ground name ("Anfield") resolves to the curated Persian name, so one ground shows ONE Persian name everywhere. Before: live rows carried the AI-learned transliteration ("انفیلد", "ولد ترافورد") while scheduled rows of the same fixture showed the curated ("ورزشگاه آنفیلد"). Exact case-insensitive match, no suffix stripping — "Allianz Stadium" ≠ "Allianz Arena".
- pubMatch + the seo hydrate FD-detail path prefer `curatedVenueFa` → the dictionary → the raw string.
- Suite: 895 → 905 checks.

## [13.85-stadiumchip] — 2026-10-13 (venue chips everywhere + the sibling loop reaches team pages)

The v13.82 venue architecture had one blind spot: the home-ground table only
lit up the seo MATCH pages — the public payload rows (homepage lists, live
section, this-week) had no venue for scheduled matches, so the already-built
client venue chips stayed dark. This round routes the SAME table + gate into
pubMatch and extends the sibling-fixtures loop to team pages.

- **grounds.ts (new root module)**: the home-ground table lookup + the
  one-off-neutral gate, extracted from seo/data.ts's hydrateMatchVenue
  stage-0 — ONE source of truth consumed by BOTH the seo match pages
  (hydration) and pubMatch (the public payload). Bare-param style on purpose
  (harness module; strict:false — RUNBOOK §11: no new transform rules).
- **pubMatch adoption**: provider venue first (TSP/live-detail), then the
  home-ground table — fills-only, never overwrites. venueFa prefers the
  table's curated Persian name over the venue dictionary. One-off-neutral
  stages (FINAL/THIRD_PLACE; round "Final" but never semi/quarter/qualif)
  skip the table.
- **Client chips go bilingual**: public-13.25.js → public-13.26.js
  (rename-on-edit) — both venue-chip render paths (live rows + this-week)
  now show the curated Persian ground name in fa mode (venueFa || venue
  fallback) instead of English-only.
- **Team pages join the sibling loop**: /teams/{slug} gains the
  "بازی‌های مرتبط" card (similarMatches of the team's NEXT match, cap 6,
  canonical links, same simcard/simcount styles as match pages) — every
  team page now cross-links its matchday siblings (internal-linking loop).
- **Co-evolution**: worker-src order +grounds.ts (before public-matches,
  after config/teams); check-venue retargets (pubMatch fills-only pattern,
  chip fa-mode pattern, REAL-grounds eval with identity normalize stub) +
  3 new behavioral checks (table fills, FINAL skips, provider wins);
  live-derby prepends the grounds block; check-stats: homeGround stub for
  the path evals, gate checks retarget to grounds.ts, team-page simCard
  lock, public-13.26 pins (incl. the escaped-regex trap both 13.25 forms);
  parity fixtures re-baselined (public page script-src only).
- Suite 888 → 895.

---

## [13.84-admi18n] — 2026-10-13 (the orphan data-i keys: hStats/btnStats + core-13.10 rename)

QA finding from the v13.83 session, fixed as its own reviewed version: the
admin visit-stats card heading (`data-i="hStats"`) and its refresh button
(`data-i="btnStats"`) had NO I18N entries in the core asset — the LIVE admin
dashboard rendered the raw key strings "hStats"/"btnStats" in BOTH fa and en.
A template-side sweep proved these were the only orphans (data-i/data-p/T()
vs the dict); the sweep is now a permanent lock in check-stats so a future
key typo can't resurrect silently.

- **core-13.9.js → core-13.10.js** (rename-on-edit rule for immutable
  versioned assets): adds hStats/btnStats fa+en (fa wording matches the
  original template text: «📊 آمار بازدید» / «🔄 به‌روزرسانی آمار»; en:
  "📊 Visit Stats" / "🔄 Refresh stats"), and drops the dead `ver` fa/en
  dict keys — stale v12.33-xpost text, unread since the footer moved to the
  live `${VERSION}` interpolation.
- References updated in the same commit: admin composer, login.ts,
  public.ts, assets/_headers immutable pin; check-stats core pins retargeted
  (including the old "renamed from 13.8" homepage check) + the orphan sweep
  lock added.
- Parity fixtures re-baselined (--update, reviewed): the only diff per page
  is the script-src line core-13.9→core-13.10 (+1 byte); harness diff
  output attached to the worklog entry. Template bodies untouched.

---

## [13.83-admintplsplit] — 2026-10-13 (admin template split + shared styles + the parity harness)

Closes the last item from the hygiene session's "deliberately deferred"
list: the 683-line `pages/admin.ts` monolith and the ~2KB of byte-identical
inline CSS/JS triplicated across admin/login/public. The precondition was a
parity harness — this version ships it FIRST and proves the refactor under
it (RUNBOOK risk discipline: template surgery needs a byte guard).

- **Byte-parity harness** (`scripts/check-admin-parity.js` + frozen baselines
  in `scripts/fixtures/`): renders ADMIN_PAGE / LOGIN_PAGE / PUBLIC_PAGE from
  the pages blob (fixed stubs for VERSION/UCL_LOGO_CHIP so version bumps
  never invalidate the baseline) and byte-compares against the fixtures;
  `--update` is the deliberate, reviewed re-baseline path. Already caught a
  real trap on its first run: alphabetical eval put styles-shared.ts AFTER
  its consumers — template literals evaluate at declaration time, so the
  interpolation read `undefined`. The harness now orders dependency-first
  (ESM semantics), the same principle as the worker-src concat.
- **The split**: `admin.ts` 683 → 28-line composer over `admin-css.ts` (107),
  `admin-html.ts` (96, carries the `${VERSION}` footer), `admin-js.ts` (471)
  — output byte-identical (39942B = baseline 39942B).
- **Source-level dedupe** (`styles-shared.ts`): THEME_INIT_SCRIPT + FONT_FACES_STYLE,
  previously byte-identical inline in admin/login/public (~2KB of source),
  now authored once and interpolated at the same byte positions — output
  unchanged (login 6362B = 6362B, public 30051B = 30051B).
- **Visual parity pass** (agent-browser, wrangler dev seeded from the live KV
  snapshot): admin dashboard fa/dark desktop fingerprint (13 selectors × 10
  computed-style props) IDENTICAL before/after; light theme + mobile 390px
  identical (no overflow, members grid 96px/1fr/70px); homepage fingerprint
  identical; zero console errors on every pass.
- **Co-evolution** (same commit): check-stats.js retargets the stats-wiring
  regexes to admin-html/admin-js + new locks (thin composer ≤40 lines,
  styles-shared consumed by all three, split modules exist, harness in the
  test chain); test chain grows to 883 checks (871+12); worker.ts layer-map
  comment updated; README deferred list closed. worker-src.js concat needed
  no change (pages/*.ts ride readdirSync; harness keeps its own order).

---

## [13.82-matchday] — 2026-10-13 (venue hydration + map links + sibling fixtures)

Feature/fix round (worklog Task 48). QA found the v13.81 `.mvenue` element
was dead code — no provider supplies venue for SCHEDULED matches (FD's list
endpoint returns none; verified live: venue null on every upcoming row incl.
Emirates-hosted fixtures). This round makes the venue real, turns it into a
place (Maps), and adds the sibling-fixtures card.

- **Venue hydration** (`src/seo/data.ts` `hydrateMatchVenue`): the match-page
  render now hydrates the venue from the FD DETAIL endpoint (`/v4/matches/{id}`)
  — the one reliable source — before any venue consumer runs (answer sentence
  G-03, facts table, `.mvenue`, meta description all read `sm.s.venue`).
  Budget discipline: numeric-FD-id gate (tsd-/spsc- rows skip), ONE attempt,
  5s race guard (a slow FD can never hang the render), fail-closed on any
  error (page renders exactly as before), KV-cached 24h positive AND negative
  (`venue_v1_{id}` — a venue-less match re-checks at most once a day), and
  the page HTML cache means repeat views never re-fetch.
- **Venue → Maps link** (`src/seo/pages.ts` `venueMapLink`): the scoreboard
  `.mvenue` and the facts-table venue row are now Google-Maps search links
  (`maps/search/?api=1&query=<venue> stadium`, no API key) — pill styling
  consistent with `.mcount`, ↗ off-site indicator, sr-only label, hover/active
  states. Query uses the Latin venue name (Maps' index), link text stays
  Persian (`venueFa`).
- **Sibling-fixtures card** (`src/seo/data.ts` `similarMatches` + match page):
  "بازی‌های مرتبط" — same competition+stage (matchday number, round-string
  fallback for TSP/sportscore rows) first, then the competition's next
  fixtures, then same-UTC-day matches from other competitions; upcoming-only,
  self-excluded, deduped by pairing, kickoff-ordered, capped at 6; count chip
  in Persian digits. Every row links to its own match page canonically — the
  internal-linking loop the hub pages always had, now on every match
  destination.
- **Live-detail venue adoption** (`src/public-matches.ts`): `enrichLiveMatches`
  extracts `det.venue` from the detail fetch it already makes (zero extra
  subrequests — free data) and `applyLiveDetail` fills (never overwrites)
  `m.venue` → pubMatch maps it → live rows carry the stadium chip.
- `buildMatchPage` is now `async` (the hydration); the seo router awaits it.
- New KV key `venue_v1_{id}` (additive; RUNBOOK table updated).
- **Home-ground table** (`CONFIG.TEAM_STADIUMS`, 18 followed clubs → 16
  grounds, en + fa): FD's endpoints return no venue for regular matches
  (verified live on three CL fixtures — the docs' only venue example is a
  2018 final), so the deterministic source comes first: for league/group
  fixtures the venue IS the home team's stadium. Followed-team match pages
  get their venue instantly with zero subrequests; the FD-detail fetch now
  only covers long-tail home teams. One-off NEUTRAL stages (FINAL /
  THIRD_PLACE; roundRaw "Final" but never semi/quarter — those are
  two-legged) skip the table; a real provider venue always wins regardless.
  Shared grounds mapped per club (San Siro × Inter+Milan, AAMI Park × the
  Melbourne clubs).
- Harness: check-stats §11 — 22 new checks (hydration gates, map-link
  markup, facts-row link, similarMatches structure + async buildMatchPage,
  live-detail venue extraction + behavioral applyLiveDetail adoption eval,
  page-shell styles, stadium-table + neutral-gate + source-order locks).
  Suite 849 → 871 green.

## [13.81-matchpage] — 2026-10-13 (the match destination + growth loop)

Feature/styling round (worklog Task 47) — now that v13.80 made every match
link canonical, the destination they land on gets the "big match" treatment.

- **Match page scoreboard head** (server, `src/seo/pages.ts`): crests facing
  each other (64px, monogram fallback when a club has none), competition
  chip with emblem + round, big tabular-numeral kickoff time (or live score
  with a pulsing dot, or final score), Gregorian + Jalali date, venue, and
  a live Persian-digit countdown ("۳ روز و ۷ ساعت و ۱۲ دقیقه تا شروع")
  ticking every 30s via one tiny inline script — stops at kickoff.
- **Actions row** (growth loop): Google Calendar (kickoff +2h basic-format
  dates), WhatsApp, Telegram, and copy-link — every share carries the
  canonical match URL (`absUrl(path)`).
- **Styles** (page-shell inline block, no asset rename): `.matchhead`
  gradient card, `.mactions` pill buttons with hover/active states, live
  560px mobile stacking (grid-areas), `prefers-reduced-motion` guard on
  the live dot.
- **Homepage hero row is now a link** to the match page (public-13.25.js:
  `noLink` dropped from the hero `spotItemNode` call — share buttons stay
  siblings, so no nested interactives).
- **Shares from the homepage carry the match URL**: `shareUrl(e)` prefers
  the payload `path` (v13.80) — WhatsApp text, copy text and the Telegram
  `url` param all point at the match page; the calendar event title stays
  plain (URL rides in details).
- **EN-mode hero H1 fixed** (QA finding #2): `heroH1Sync()` rewrites the
  sr-only H1 from the live hero payload on every render — "Next big match:
  X – Y" in EN, Persian in FA (runs inside `renderHeroSpot`, so boot,
  language toggle and payload refresh all stay in sync).
- Asset ritual: public-13.24.js → **public-13.25.js** (rename-on-edit),
  `_headers` pin renamed, SW cache v28 → **v29**.
- Checks: 833 → 849 (16 new in check-stats §10: matchhead markup, countdown
  script, actions, calendar format, styles, mobile/reduced-motion guards,
  hero link, heroH1Sync, shareUrl wiring).

---

## [13.80-canonical-hrefs] — 2026-10-13 (one true match URL — fixes 404 links)

QA-driven bugfix (worklog Task 46; found by the agent-browser sweep in Task 45).

**The bug:** the server-rendered homepage linked matches with the canonical
`matchPath` (TEAM_SLUGS included: `chelsea-vs-tottenham-2026-10-24`), but the
client's re-render replaced every row's href with its own slugifier — which
had NO TEAM_SLUGS table — producing `chelsea-vs-tottenham-hotspur-…`,
`bayern-munchen-…`, `milan-vs-…`: dead links (404) on click, and dead hrefs
for any crawler that executes JS.

**The fix — one URL vocabulary, served instead of guessed:**

- `src/slugs.ts` (new root leaf): COMP_SLUGS, TEAM_SLUGS, STRICT_STRIP,
  compSlug, teamSlug, matchPath — MOVED out of `src/seo/config.ts` so the
  payload shaper can import them. seo/{data,files,jsonld,markup,pages}.ts
  now import from `../slugs`; seo/config keeps SEO + absUrl only (no
  re-export shim — ARCHITECTURE rule).
- `pubMatch` stamps `path: matchPath(...)` on every payload row (upcoming,
  finished, hero nextBig, topSpot, thisWeek, nextWeek, UCL, cups): the
  client receives the SAME URL the server pages, sitemap, JSON-LD and
  matches.json build.
- `public-13.24.js` (renamed from 13.23): `matchHref(e)` returns
  `e.path ||` (fallback slugifier kept ONLY for stale pre-13.80 cached
  payloads). SW cache bumped v27 → v28; `_headers` pin renamed.
- Harness co-evolution (same commit — ADR-005): worker-src.js order carries
  `slugs.ts` before `public-matches.ts`; check-venue + live-derby evals
  ride the slug block alongside pubMatch; check-stats gained a
  v13.80 section (16 new checks incl. behavioral: Tottenham/Bayern/AC-Milan
  slugs, matchHref path-preference, pubMatch path output).
- KV/payload contract: `path` is ADDITIVE (old clients ignore it; new
  clients fall back gracefully on old cached rows); payloadSig and the
  skip-rebuild handshake are untouched (id|status|score|utcDate only).

Checks: 817 → 833, all green; tsc clean.

---

## [13.79-docs] — 2026-10-13 (ARCHITECTURE.md + ADR-001..006 + README/RUNBOOK refresh)

Seventh hygiene phase (worklog Task 44 — the documentation deliverable).

- **ARCHITECTURE.md** (new): the full module map in 8 layers (leaves →
  match model → providers → composers → digest/notify products →
  user-facing state → surfaces → the cron shell + phases), the dependency
  rules (acyclic layer-down, no re-export shims, groups move together in
  the harness order, KV keys live in CONFIG), and "where to add things"
  for the five most common change types.
- **docs/adr/ADR-001..006** (new): the six decisions the mission named —
  website-as-truth (001), write-first dedupe (002), fail-closed KV (003),
  no-sweep-on-commands (004), eval-harness co-evolution (005, incl. why
  handleTelegramUpdate stays whole), versioned assets rename-on-edit (006).
- **README.md**: the module map now reflects the v13.74–v13.78 groups; the
  "deliberately deferred" list updated (cron split DONE; admin.ts source
  split + ~2 KB inline-CSS dedupe deferred with measurements — needs a
  visual-parity harness first; public-matches justified-as-is).
- **RUNBOOK.md**: saveNotifiedMatch pointer updated (matches.ts →
  match-dedupe.ts).

No code changes; suite unchanged.

## [13.78-botui] — 2026-10-13 (bot.ts 536 → bot-ui.ts 107 + the whole router)

Sixth hygiene phase (worklog Task 42). The tappable-UI layer
(replyKeyboard, normalizeCommand, the v13.49 grid/picker builders) moved
to `bot-ui.ts`; `handleTelegramUpdate` (the 416-line webhook router with
the command + callback chains) stays WHOLE in `bot.ts` — the
check-bot-edges eval slices span the builders→router boundary by content
markers (`// v13.49-buttons: shared message builders` →
`async function handleTelegramUpdate`), so splitting the chains inside
the handler would break the eval harness' contiguity assumptions. That
boundary is now documented and locked (#botui) instead of ignored.

- Harness co-evolution: bot-ui.ts sits immediately before bot.ts in the
  worker-src order; botBtnSeg re-anchored to span the whole bot group
  (bot-ui → cron-preflight) — the first run without this failed exactly
  the 4 #buttons checks, proving the segment was doing its job. +2 #botui
  locks (UI builders in bot-ui, router whole in bot.ts, order pinned).

Suite: 817 checks green (815 + 2 #botui locks).

## [13.77-digestnotify] — 2026-10-13 (digest.ts 559 + notifications.ts 516 → 7 modules)

Fifth hygiene phase (worklog Task 41). Two more god modules became groups
(byte-identical bodies — moves, not rewrites):

| Module | Lines | Owns |
| :--- | ---: | :--- |
| `digest-weekly.ts` | 153 | Monday league tables + week-ahead fixtures |
| `digest-morning.ts` | 125 | the 9am matchday digest (digest_sent_* dedupe) |
| `digest-bigmatch.ts` | 161 | big-match FT + kickoff broadcasts |
| `digest-coronation.ts` | 159 | table-top coronation alerts |
| `notify-engine.ts` | 318 | NOTIFICATION_CONFIGS + sendNotificationIfNeeded + the fan-out |
| `notify-status.ts` | 148 | detectStatusChanges (kickoff/HT/FT, fail-closed map) |
| `notify-audit.ts` | 81 | the notified-match gap audit |

- All importers rewritten to the specific module (cron, cron-notify, bot,
  admin-ops, simulate) — including the DYNAMIC import in admin-ops
  (/api/audit's `await import("./notifications")` → "./notify-audit").
- Harness co-evolution: worker-src.js order carries both groups where the
  two files sat; every dependency is grab-based (position-independent) or
  a content-span regex (#nospam6 spans within digest-morning.ts), so no
  segment re-anchors were needed. +4 #digestnotify locks on the real files.
- The write-first dedupe chain is untouched: notify-engine's
  saveNotifiedMatch gate, digest-bigmatch's persisted-before-send, and the
  mark-before-send morning digest all byte-identical.

Suite: 815 checks green (811 + 4 #digestnotify locks).

## [13.76-matchsplit] — 2026-10-13 (matches.ts 573 lines → 4 modules + normAlias→teams; the import cycle is dead)

Fourth hygiene phase (worklog Task 40). matches.ts carried four products:
the notified-match dedupe store, the notification time windows, the
classification/league sets, and the provider format helpers. Now a GROUP
(byte-identical bodies — moves, not rewrites):

| Module | Lines | Owns |
| :--- | ---: | :--- |
| `match-model.ts` | 57 | isLiveStatus/isMatchFinished/isPresumablyFinished + mapStageName/parseTSPDate |
| `match-windows.ts` | 108 | 24h/3h/1h/5min/match-start/post-match windows + isBackfillEligible |
| `match-dedupe.ts` | 209 | MEM_DEDUPE, getNotifiedMatches/saveNotifiedMatch, shouldSendNotification, cleanup |
| `match-classify.ts` | 208 | shouldNotify, BIG_MATCH_TEAMS/UEFA, isMasterPair, pickHeroMatch, derbies |
| `teams.ts` (existing) | +30 | TEAM_ALIASES + normAlias (joined normalizeTeamName/normTeamKey) |

- **The users↔matches import cycle — the only cycle in the graph — is
  dead**: users.ts now imports normAlias from teams.ts (a leaf); the match
  group imports users one-directionally (masterTeamList). teams.ts keeps
  its erasable-syntax-only discipline (check-dedupe/fa-dict/composers/
  live-derby require it directly via Node type-stripping).
- All 16 import statements rewritten to the specific module each consumer
  uses (no shim, no re-export layer; matches.ts deleted).
- Harness co-evolution: worker-src.js order array carries the match group
  where matches.ts sat (model → windows → dedupe → classify); every grab
  on these functions is position-independent (grabFn), so no segment
  re-anchors were needed. Added 4 #matchsplit locks reading the REAL
  files (import cycles only exist in real-module space): normAlias lives
  in teams.ts, users imports no match-* module, matches.ts is gone, the
  group is contiguous in the harness order.
- pickHeroMatch (the v13.73 shared hero expression) now lives in
  match-classify.ts — the existing #herotruth checks keep covering it
  (whole-src regexes).

Suite: 811 checks green (807 + 4 #matchsplit locks).

## [13.75-cronsplit] — 2026-10-13 (cron.ts 697 lines → shell + 6 phase modules)

Third hygiene phase (worklog Task 39). `executeScheduledLogic` was ONE
672-line function with ~12 interleaved phases; the sweep decision, the
notify fan-out and the public prewarm lived in the same closure as the
KV-write meter. Now a SHELL + six phase modules (byte-identical bodies —
moves, not rewrites; phase outputs cross the seam via returns + a ctx
object, destructured so every pinned identifier keeps its name):

| Module | Lines | Owns |
| :--- | ---: | :--- |
| `cron-preflight.ts` | 80 | settings, FA caches, status read, budget governor + page, stale alert |
| `cron-users.ts` | 83 | outbox drain, 6h heartbeat, migration, FA-AI learning, cap |
| `cron-pool.ts` | 105 | the sweep decision (quiet reuse / live sweep / full / 92-day recovery) |
| `cron-maintenance.ts` | 96 | cup scans, far probe, pool stamp-advance, standings refresh |
| `cron-notify.ts` | 113 | fan-out, kickoff/FT broadcasts, morning digest, coronation, audit |
| `cron-public.ts` | 137 | liveChanged fingerprint, enrichment, prewarm, live overlay |
| `cron.ts` (shell) | 188 | the meter, the execution lock, phase sequencing, completion blob |

- The meter + completion blob STAY in the shell — the #seams check from
  v13.47 codified that boundary ("cron.ts still owns the meter + blob"),
  and the blob must be the tick's LAST write to fold `kvWritesThisTick`.
  The cron_status_v1 reader staying in monitoring.ts is the same locked
  seam, not a split brain (both sides pinned by checks).
- Phase order = runtime order; the eval-harness concat places the six
  modules BEFORE the shell so the #quota1/#swrsolid order checks (prewarm
  and overlay logs before the blob fold) keep holding on positions.
- Harness co-evolution (same commit): worker-src.js order array carries
  the cron group between bot.ts and monitoring.ts; check-reliability
  `cronSeg`/`cronSeg52` re-anchored to span the whole group
  (cron-preflight → monitoring); the bot-segment boundaries (botSeg13,
  botBtnSeg, the #herotruth bot check in check-no-miss) re-anchored from
  cron.ts to cron-preflight.ts so they stay bot.ts-only. Added 5 new
  #cronsplit structural locks (shell-only meter+blob fold, six-phase
  sequencing, both early-returns, lock-after-meter).
- KV write ordering, the env.STATE monkey-patch metering and every
  fail-closed guard are byte-identical. KV key contracts untouched.

Suite: 807 checks green (802 + 5 #cronsplit locks).

## [13.74-providersplit] — 2026-10-13 (providers.ts 853 lines → 8 cohesive modules)

Second hygiene phase (worklog Task 38). `providers.ts` mixed two provider
clients, normalization, the circuit breaker and the pool merge with the
three sweep orchestrators. It is now a GROUP of single-responsibility
modules (byte-identical function bodies — moves, not rewrites):

| Module | Lines | Owns |
| :--- | ---: | :--- |
| `provider-breaker.ts` | 21 | the prov_down_* suspension circuit |
| `provider-wikipedia.ts` | 56 | the PGL standings fallback |
| `provider-sportscore.ts` | 107 | sportScoreDay + the day sweep (budget-stop, suspension) |
| `provider-tsp.ts` | 70 | the TSP event mapper + league-views sweep |
| `provider-fd.ts` | 73 | football-data range fetch + 429 suspension |
| `match-pool.ts` | 64 | the matches_v13_tracked pool read/write |
| `provider-cups.ts` | 214 | big-team cup scan + far-cup probe |
| `providers.ts` (orchestrators) | 322 | fetchLongView / fetchLiveSweep / fetchMatchesFromAPI |

- Dependency direction is acyclic and obvious: clients → breaker/pool;
  cups → tsp+sportscore+pool; orchestrators (providers.ts) → everything.
  Every importer updated to the specific module it uses (cron, api,
  composers, digest, public-matches, admin-ops, seo/data).
- `sportScoreDay` + `tspEventToMatch` gained exports (real cross-module
  importers now: cups + orchestrators).
- Harness co-evolution (same commit): worker-src.js order array carries
  the provider group contiguously before telegram.ts; check-reliability's
  `provSeg15` segment re-anchored to span the whole group
  (breaker → telegram) so the #cupscan/#poolbreak checks keep covering
  the split code. No signature changes — grabFn signatures untouched.
- KV key contracts untouched (prov_down_*, cup_scan_v1, cup_far_scan_v1,
  matches_v13_tracked, last_api_source, degradation_alert_at all intact).

Suite: 802 checks green on the first post-split run.

## [13.73-herotruth] — 2026-10-13 (the hero pick is ONE expression — v13.68 enforced by construction)

The audit found the v13.68 "website-as-truth" constraint was aspirational:
the bot's /featured re-implemented the site's hero selection and the two
copies had drifted in three ways — the bot picked an UNSORTED `live[0]`
when ≥2 hero matches were live (the site sorts live-first by nearest
kickoff), the bot restricted upcoming picks to SCHEDULED|TIMED (the site
only excludes FINISHED), and the bot inlined its own live status set
instead of `isLiveStatus()`. Two matches live at once = the bot and the
site could disagree about the hero — exactly what v13.68 forbids.

### The fix
- **`pickHeroMatch(matches)`** now lives in `matches.ts` as THE single
  shared hero-selection expression (featured-or-masterPair, not-FINISHED,
  live-first, nearest kickoff — byte-identical semantics to the site's
  v13.68 filter). Both consumers call it and neither may re-implement it:
  - `public-matches.ts` → `const heroMatch = pickHeroMatch(matches)`
    (feeds `nextBig`, the site hero).
  - `bot.ts` `/featured` → `const featured = pickHeroMatch(matches)`.
- Six new `#herotruth` checks in check-no-miss.js lock the contract:
  defined exactly once, both consumers use it, no private re-implementation
  survives, and the semantics regex pins the filter/sort expression.
- live-derby-test.js eval chain extended with the new grab (the harness
  co-evolution rule).

Edge-behavior note: /featured now matches the site in the rare cases
where the old copies disagreed (multiple simultaneous live hero matches;
non-SCHEDULED future hero picks) — that alignment IS the constraint.

Suite: 802 checks green (796 + 6 new).

## [13.72-deadweight] — 2026-10-13 (dead assets, dead code, dead branches — the hygiene sweep)

First phase of the code-hygiene/modularization session (mission brief:
docs/history/2026-10-13-NEXT-SESSION-CODE-HYGIENE.md; audit in the session
worklog Task 35). No behavior changes — every removal is grep-proven dead,
visual output identical.

### Dead assets (~1.1 MB pruned)
- Removed `assets/core-13.8.js` (replaced by core-13.9 at v13.65; three SW
  cache generations since) and every retired `public-13.12…13.22` js/css
  pair — referenced by no served HTML, only by `_headers` pins and comments.
  Precedent: v13.29 already did the same prune once.
- `_headers` rewritten to pin only the LIVE versions (core-13.9.js,
  public-13.23.js/css). Also dropped the dead `/public-13.8.js`,
  `/public-13.8.css` pins — those files didn't even exist.
- `sw.js` CACHE stays v27 (no client-referenced asset changed — removals
  need no bump, per the RUNBOOK §2 rule).

### Dead code in src/
- `users.ts`: `BOT_STRINGS` slimmed from ~108 lines / ~55 keys to the only
  4 keys ever read (`fa_/en_start_welcome`, `fa_/en_lang_set` — the bot's
  welcome path). The v12.x keys (help_body, teams_*, follow_*, tz_*) had
  zero readers since the composers began hardcoding their own strings.
- `api.ts`: the `/public` belt-and-braces fallback branch REMOVED — the SEO
  router 301s /public to / before that line ever runs, and the fallback
  served the raw template with 19 unreplaced `__SEO_*__` placeholders
  (placeholder soup) for non-GET requests. POST /public now gets the honest
  405. `PUBLIC_PAGE` import dropped with it.
- `admin-ops.ts`: three dead imports removed (fetchFootballData /
  fetchSportScore / fetchTheSportsDB — never called in the file).
- `notifications.ts`: dead `nowTehran` parameter removed from
  `sendNotificationIfNeeded` (never read in the body).
- `providers.ts`: dead `export` dropped from internal-only `sportScoreDay`.
- `pages/admin.ts`: dead `var TOKEN` (audit fix 8 leftover), 9 phantom
  selectors in the reduced-transparency rule (homepage-only classes copied
  from public CSS — only `.card,#topbar button` ever matched), 7 unused
  `:root` tokens, the stale X-status-card header mention, the unused
  `.uclsync` class marker.
- **Admin version-line fix (visible)**: the footer version line carried
  `data-i="ver"`, so `applyLang()` clobbered the live server-rendered
  `نسخه 13.71…` with the STALE v12.33 I18N string — the admin panel has
  been displaying "نسخه ۱۲.۳۳-xpost" for months. Hook removed; the line
  now shows the real VERSION.
- `pages/login.ts`: 11 unused `:root`/light tokens removed.
- `pages/public.ts`: duplicate `<meta name="color-scheme">` (emitted
  twice) collapsed to one; stale dotLottie tombstone comment condensed.
- `seo/page-shell.ts`: dead `.updatedline` rules removed (no element uses
  the class); stale comment claiming `/public-13.15.css` fixed.
- `seo/markup.ts`: dead `T.noMatches` / `T.more` dictionary keys removed.
- `cron.ts`: stale "X mirror" comment mentions removed (the X path died
  at 13.48-xtrim; only comments referenced it).

### Test-harness co-evolution (the §11 rule)
- `check-no-miss.js`: grab signature + call updated for the nowTehran
  param removal.
- `check-security.js`: the webhook-block slice boundary was the removed
  `/public` branch — re-anchored on the card-route marker.
- `check-venue.js`: the "render() shows venue chip" check matched the
  UNMINIFIED pattern that by now only existed in the retired asset files —
  it was testing dead files instead of the live artifact. Rewritten
  minification-agnostic (semantic chain: span → className "venue" →
  textContent built from `<match>.venue`, emoji as char or escape).
- Justified-kept: `CONFIG.KV_SCHEDULE_PREFIX` (documented tombstone), the
  10 `typeof X === "function"` guards in digest/notifications (they
  protect eval'd partial slices in check-weekly-tables/check-admin from
  ReferenceError — load-bearing for the harness, not noise), `.visitcount`
  inline CSS delta between public.ts and page-shell.ts (deliberate).

Suite: 796 checks green (tsc + 19 scripts) — count unchanged.

## [13.71-admintools] — 2026-10-13 (owner toolbelt inside Telegram)

The bot's owner (Alitagram, `env.CHAT_ID` — the identity 13.70-adminpulse
armed for the heartbeat/pages) previously had zero Telegram-side control:
member visibility lived only in the web admin card, and join/leave events
were invisible. The owner now gets:

### Owner-only commands (gated to `parseInt(env.CHAT_ID)`)
- **`/admin`** — the admin panel: command card + quick-tap inline buttons
  (`adm:members` / `adm:status` callbacks, same gating).
- **`/members`** — the member roster: names, @usernames, chat ids, Jalali
  join dates, language, team-follows — the same `getBotMembers()` data the
  web admin shows (KV profiles + the budget-gated getChat backfill),
  newest member first, truncated at 3600 chars so any roster size fits one
  message.
- **`/status`** — the live health card: the exact `/healthz` numbers
  (heartbeat age, last-completed-cron age, pool age + match count, outbox
  depth, KV write burn, admin-alerts layer) with a 🟢/🟡/🔴 verdict.
- **`/broadcast <text>`** — send a message to every registered chat. The
  body is MarkdownV2-escaped (renders verbatim — the admin's punctuation
  can't break the parse), capped at 3500 raw chars, and fanned out
  SEQUENTIALLY through the v13.69 paced/retried/outbox-backed sender. The
  owner gets a sent/queued/dead summary.

### Membership signals
- **Join pages**: the owner is paged the moment a NEW member joins — via
  `/start` or the language-picker registration path — with the member's
  name/@username (from the just-written KV profile), chat id, and the new
  total. Re-starts don't re-page; the owner joining himself doesn't page.
- **Leave pages**: a member's `/stop` pages the owner (a stranger's /stop
  is not a leave).

### Safety
- Gate-first: every admin branch checks `isAdminChat` before any send; a
  non-owner probe gets a plain denial and a console.warn (visibility into
  probing).
- Fail-closed: an unparseable `CHAT_ID` (the 13.70 dead-paging shape)
  disables every tool and every page — the same rule the alert paths
  follow; `/healthz admin_alerts_ok:false` already surfaces it.
- New gate `scripts/check-admin.js` (source + behavioral: the REAL
  admin-bot module and command/callback chains eval'd against a fake KV —
  denial, roster, status, broadcast fan-out/escape/accounting, join/leave
  pages, fail-closed). `check-join-flow.js` extended with join/leave-page
  assertions; both harnesses updated for the new chain calls.

## [13.70-adminpulse] — 2026-10-13 (the dead admin-paging layer: every admin alert silently disabled)

During the v13.69 verification, the `heartbeat_sent_v1` KV stamp turned out
to have **never existed** — nor `audit_alert_v1`. Those are the only two
stamps written INSIDE the `if (!isNaN(parseInt(env.CHAT_ID)))` guard; every
stamp written OUTSIDE the guard (`stale_alert_at`, `degradation_alert_at`,
the cron status blob) existed. The fingerprint: **the deployed `CHAT_ID`
secret does not parse as a number**, so every admin-facing alert path —
the 6h "ربات سالم است" heartbeat, `alertPhaseError` pages, KV-budget pages,
audit gap reports, user-cap warnings — has been silently disabled, with
healthz green throughout.

### The fix
1. **`/healthz` exposes `admin_alerts_ok`** (true iff `parseInt(env.CHAT_ID)`
   is a number) and flips the `degraded` band when false — a dead paging
   layer is now visible to external monitors.
2. **The heartbeat block logs LOUDLY** when CHAT_ID is unparseable (was
   silent — the exact "silently-swallowed failure" class from 13.55).
3. The `CHAT_ID` secret was re-set to the owner's numeric chat id
   (92788333 — the sole surviving member of the original single-chat
   registry `REGISTERED_CHATS_LIST`, first-joined user, only tz-customized
   prefs). Verification: the next tick wrote `heartbeat_sent_v1` for the
   first time and delivered the first real heartbeat message.

## [13.69-pacenotify] — 2026-10-13 (the burst-429 silent drop + the per-chat card fallback)

A reliability audit against the delivery guarantees found three concrete
missed-alert vectors in the send path, all sharing one shape: **the write-first
dedupe record persists BEFORE the send, so any send that dies outside the
retry/outbox machinery is lost forever.**

### The gaps
1. **429-pause silent drop** — `sendTelegram`/`sendTelegramDirect` opened the
   attempt loop with `if (Date.now() < TELEGRAM_PAUSE_UNTIL) return false;`
   That return bypassed the outbox push entirely. Trigger shape: the broadcast
   fan-out (`Promise.allSettled` over every chat) fires all sends in parallel;
   at ≥30 chats that's a guaranteed hit on Telegram's ~30 msg/s global limit →
   the first 429 sets the pause (1-10s) → every other in-flight send returns
   false on its next attempt with NO outbox entry → dedupe already recorded →
   those chats never get the alert.
2. **Partial card failure dropped users** — the card path marked the whole
   tz-group served when ONE chat's photo landed (`cardSent = some(true)`);
   chats whose photo failed got no text fallback and no retry. Compounded by
   `sendPhotoBinary` having ZERO retries (single attempt, no 429 handling).
3. **Outbox read-modify-write race** — several fan-out sends failing at once
   each ran `outboxPush` concurrently (read list → push → write list); the
   concurrent writes silently dropped each other's entries.

### The fix (v13.69-pacenotify)
1. **Bounded pause wait** (`waitTelegramPause`) — a live 429 pause is waited
   out (≤8s, Telegram's global-limit retry_after is 1-5s; pure wall-clock
   sleep, zero CPU). Only a pause that outlives the bound defers via the
   outbox — never a silent `return false` again. `sendTelegramDirect` returns
   false for the drain to re-queue (no outbox recursion). Subrequest-budget
   exhaustion now defers via the outbox too.
2. **Proactive pacing** (`paceTelegram`) — a 40ms floor between Telegram API
   calls (~25/s) in `sendTelegram`, `sendTelegramDirect`, `sendPhotoBinary`
   and `sendDice`, keeping every fan-out under the 30 msg/s global limit
   instead of tripping it reactively.
3. **Per-chat card fallback** — `cardResults` is judged per chat; every chat
   that did not CONFIRMEDLY receive the card (or is dead) gets its own text
   fallback send. A confirmed card delivery now also counts into the
   breadcrumb `notify.s` counts (card-only notifications were invisible).
4. **`sendPhotoBinary` retries** — 2 attempts with the same 429-pause/pacing
   semantics as the text senders.
5. **Serialized outbox pushes** — a per-isolate promise chain serializes
   `outboxPush` read-modify-write cycles (cross-isolate races stay bounded by
   KV last-write-wins, as before).
6. **`/healthz` pool freshness** — new `pool_age_min` + `pool_matches`
   fields; a missing pool or >180min age flips the `degraded` band (the
   13.55-epochflow "healthy pipeline, frozen data" class is now visible to
   external monitors).

## [13.55-epochflow] — 2026-09-30 (the frozen epoch: KV write quota exhausted + silently-swallowed put failures)

The user's report: *"آخرین به‌روزرسانی: چهارشنبه ۰۹:۱۱ صبح · ذخیره‌شده
(۷۴۸ دقیقه پیش)"* — last updated Wednesday 09:11, cached 748 minutes ago.
The pipeline LOOKED healthy (healthz ok, 2h sweeps clean, pool stamp fresh
at 18:01) but the served epoch (payload/snapshot `fetchedAt`) was frozen
at 05:41 for 12.5h.

### The root chain (exposed by the new put-failure logging)
1. **The KV namespace exhausted its 1,000 writes/day free-tier quota**
   (midday UTC, after a morning of browser-poll rebuild churn — the
   empty-view payload's 60s TTL meant every >60s-gap poll ran a full
   rebuild: lock + rate-limit + payload puts ≈ 3-4 writes per poll).
2. **Every put started failing with "KV put() limit exceeded for the day" —
   and every single one was swallowed by `.catch(() => {})`.** No payload
   writes, no snapshot writes, no standings-cache writes, no pool stamp
   writes. The cron status blob's single trickle-write still slipped
   through the best-effort enforcement, so healthz kept reporting
   `ok:true` — the perfect masquerade of a healthy pipeline.
3. The serve path then cycled: payload (60s TTL) expired → snapshot serve
   (frozen epoch 05:41) + a background rebuild that burned ~20-30 real
   subrequests on guaranteed-failing provider fetches (FD standings
   silently non-ok — a raw fetch with `res.ok=false` left no log; PGL's
   3-provider fallback chain with 800/1600ms retry sleeps — the 6.8s
   "healthy" rebuild wall time) before its writes died at the quota wall.
4. Header semantics did the rest: the badge is data-age-gated (13.54), so
   a >3h-old epoch shows "cached (Nm ago)" — with N growing all day.

### The fix
1. **Serve-path rebuilds are pure-KV now**: `fetchStandings(env, c, false)`
   (cache + per-code snapshot fallback only — zero provider fetches on any
   visitor-driven rebuild), and background refreshes pass `skipLongView`
   (the 92-day view can't finish in `ctx.waitUntil`'s ~30s and only burned
   budget). The 10-min cron tick owns ALL provider refreshes.
2. **One payload TTL (720s) for every write** — the empty-view 60s retry
   loop (the poll churn that burned the quota) is dead: a poll 61s after
   the last one now serves the payload inline with ZERO writes; only
   >10min gaps trigger one bounded rebuild.
3. **Put failures are LOGGED, never swallowed** (`public payload write
   failed: …`, `public snapshot write failed: …`, `degraded payload
   re-cache write failed: …`) — this entire bug class was invisible for
   12.5h because of the silence.
4. **The cron prewarm now SELF-FETCHES** (`SELF_PREWARM_URL`): the tick
   fires one fetch at its own public API — a fresh invocation with a full
   50-subrequest budget of its own, whose waitUntil rebuild lands the
   payload + snapshot writes reliably (the in-tick prewarm ran after the
   3-provider sweep, at ~40-50 real subrequests, so its writes died at
   CF's real ceiling). Meter-gated in-tick fallback preserved.
5. **Quiet-tick pool stamp-advance**: a tick that reuses the pool re-caches
   it with a fresh stamp whenever `fetchedAt` is >90min old (≤16
   writes/day) — the header clock stays fresh on the deepest break weeks
   and the pool TTL can never run out again (13.54.1's deadlock cannot
   reform even when sweeps legitimately return 0 matches).
6. **Quiet-tick standings-refresh phase** (2h marker-gated, 6h per-code
   freshness gates + jitter preserved): standings fetch authority moved off
   the serve path entirely.
7. **FD standings non-ok responses are VISIBLE now** (`Standings PL: FD
   HTTP 429`) and a 429 suspends the football-data circuit for 45min
   (mirror of fetchWithRetry F5) — no more silent quota-minute burn.
8. Live scorer enrichment moved into the tick (`enrichLiveMatches` on
   `liveChanged`, meter-gated) — self-fetch rebuilds never fetch.

### Expected daily KV-write budget (matchday): ~350-550 vs the 1,000 cap
(was ~1,000-1,400 on poll-days — the quota killer).

### Post-reset verification — 2026-10-01, browser-verified (the bug is closed)
- **The quota reset on schedule** (cron_status flipped to kv_day=2026-10-01
  at the 00:00Z tick; writes landing again).
- **The first visitor request after the reset (00:05:49Z) instantly wrote
  BOTH KV keys**: `public_matches_v1` (fetchedAt = the 22:50:33Z pool
  stamp) and `cache:snapshot:v1` — the first successful snapshot write in
  18.4h (frozen since 05:43). The second request served the fresh payload
  from KV: sub-second, no badge.
- **Self-healing confirmed across the evening**: stamp-advances landed at
  19:40, 21:20, and 22:50 (every ~90-100min as designed); the 19:00
  standings phase wrote all 7 league codes fresh (PL/PD/SA/BL1/FL1/CL
  36 teams/PGL 18 teams — FD fetches were always fine; only the writes
  had died).
- **Browser end-to-end (agent-browser, https://sportsignal.ir/)**: the
  header reads "آخرین به‌روزرسانی: پنجشنبه ۰۲:۲۰ شب" (Friday 02:20
  Tehran = the 22:50:33Z pool stamp) with **NO cached badge** (was:
  چهارشنبه ۰۹:۱۱ · ذخیره‌شده ۷۴۸ دقیقه پیش). All sections render —
  live/big-upcoming/UCL/next-week/جدول لیگ‌ها (7 leagues incl.
  پرسپولیس/استقلال)/cups/recent-results; zero page/console errors; mobile
  390px clean. Screenshots: `download/sportsignal-13.55-verified-healed.png`
  and `-mobile.png`.
- **Direct simulation of the self-fetch prewarm** confirmed the mechanism:
  serve 0.87s → the bg rebuild reads the fresh pool stamp → the only
  failure mode remaining was the exhausted quota itself (now reset).

### Watch items (carried to the next session)
1. First matchday (~Oct 9-10) under real load: self-fetch prewarm +
   standings phase + live overlay at matchday write volume.
2. `kv_writes_day` on a busy matchday (expect 350-550; soft-governor 700;
   hard cap 1,000).
3. TSP `eventsnextleague` non-iterable regression (harmless, caught by
   the tail; unfixed).

### Session close — 2026-10-10
v13.55-epochflow is the final build of this session: committed (f0a2385),
pushed to `assadigit/SportSignal`, deployed (worker version `a1a7a1fb`),
and live-verified. The user's next session continues with **SEO work** on
the public page.

---

## [13.54.1-poolbreak] — 2026-09-30 (the dead-pool deadlock: the site really WAS frozen)

Found live via `wrangler tail` while verifying 13.54 — the frozen stamp was
the symptom; underneath it the whole data pipeline had been dead since
2026-09-29 12:09Z (17h): **the pool KV key expired at its 24h TTL** and
nothing could repopulate it.

### The deadlock (every link confirmed in the live tail)
1. **The pool expired.** `cacheMatches` is change-only + the pool KV TTL is
   24h — during the international break nothing changed, no sweep wrote the
   pool, and the TTL ran out. (13.54's stamp-advance prevents this going
   forward, but it only fires on a sweep that returns ≥1 match.)
2. **Every tick full-swept.** The quiet-reuse gate requires a non-empty
   pool — with it empty, every 10-min tick ran the full 3-provider sweep.
3. **The sweep could not finish.** The concurrent fan-out (FD ~17 fetches +
   sportscore 27 day-calls + TSP ~10) crossed Cloudflare's real
   ~50-subrequest ceiling mid-flight — CF rejected the rest with "Too many
   subrequests" while the local meter still read 37/48 (fetchJSON bumped
   once per call but retried twice internally). TSP — the only source with
   FUTURE fixtures when FD's 10-day window legitimately sees nothing during
   a break — starved.
4. **0 matches → no pool write → repeat.** The tick's own log: FD 0
   (correct), sportscore/TSP budget-dead, "All API sources empty, falling
   back to cache" → cache EMPTY → 0 matches → `cacheMatches` skipped.
5. **The visitor long view can't rescue it.** Since v13.52 the 92-day long
   view runs only in `ctx.waitUntil`, which dies at ~30s — the multi-minute
   view never completes there. The 595-row pool from 2026-09-28 12:09Z was
   written by the LAST synchronous (pre-13.52) visitor long view. The site
   has been serving that pool's frozen snapshot ever since.

### The fix — budget-fit, prioritized, cron-owned recovery
- **Accurate meter**: `fetchJSON` bumps per ATTEMPT (like `fetchWithRetry`
  always did). The meter that every budget gate trusts no longer
  undercounts by up to 2×.
- **Budget-stopped fan-outs**: the sportscore full-sweep day-loop and the
  long view's cup/EL/ECL/BL1 sections stop hard at 44 metered — a partial
  sportscore sweep beats a dead tick (and the suspension check can't
  misfire on budget stops).
- **Sequential prioritized sweep**: `fetchMatchesFromAPI` runs
  FD → thesportsdb → sportscore with per-source meter gates (46/42/34)
  instead of `Promise.all` — FD and TSP ALWAYS complete, so the sweep
  always has something to cache; sportscore rides the leftover budget
  (the 10-min live sweep owns live detail on matchdays anyway).
- **Long view reordered futures-first**: FD's 92-day chunks → TSP
  next-event views → intl calls (~23 metered, always complete) BEFORE any
  sportscore day-calls.
- **Cron owns pool recovery**: an empty-pool or horizon-starved (<5 days of
  known fixtures — the nextWeek card's fuel) sweep runs the 92-day long
  view IN THE TICK, where it has the wall time to complete. This also
  re-enriches the horizon on long breaks (nextWeek no longer starves).
- With 13.54's stamp-advance the recovered pool's TTL is refreshed on
  every sweep — the deadlock cannot reform.

### Verified
- Suite: 576 OK checks (+7 #poolbreak wiring asserts), `npm test` exit 0;
  `tsc` clean. Local smoke: 13.54.1-poolbreak, routes real.
- Live: worker `91305a04`; the 05:40Z tick ran the pool-recovery long
  view end-to-end (FD chunks → TSP → intl → budget-stopped sportscore),
  the pool was rewritten, and the public API immediately served fresh
  fixtures with a current stamp and NO cached badge.


## [13.54-livestamp] — 2026-09-30 (the frozen "Last updated" stamp: healthy pipeline, lying header)

### The user's report
> "Investigate why the app and sportsignal.ir doesn't update:
> this is on header: **Last updated: Monday 15:39 · cached (1407m ago)**"

The header was telling the truth about one thing: that payload was old. It
was lying about the cause — healthz showed heartbeats every 10min and
sweep-sized ticks at the normal 38-fetch band, so it READ as healthy. (The
deeper truth found an hour later: those sweeps were completing but returning
0 matches with the pool already dead — see **13.54.1-poolbreak** above, which
found the actual data outage underneath this stamp fix.) Two change-only KV
gates froze every timestamp the site shows, so the break week read as a dead
system on top of a real one.

### Root chain (all links confirmed in source + live)
1. **The pool stamp froze.** `cacheMatches` is change-only (v13.31 KV
   budget) — during the international break fixtures sit `TIMED` for days,
   so every 2h full sweep merged a byte-identical pool and skipped the
   write. The pool's `fetchedAt` — which every public payload inherits as
   its `fetchedAt` (the header's "Last updated" clock) — stayed at
   2026-09-28T12:09Z = **دوشنبه ۱۵:۳۹ Tehran, to the minute**.
2. **The snapshot stamp froze the same way.** The 7-day snapshot's write
   is change-only too, so its `ts` sat at 2026-09-29T05:26Z while its
   content (and its `fetchedAt`) were equally frozen.
3. **Every quiet-gap visitor was badge-stamped degraded.** With sparse
   traffic the 12-min payload TTL expires between visits, so the
   snapshot-serve path — which unconditionally set `cached: true,
   cachedAt = <snapshot write time>` — ran on essentially EVERY request.
   The user watched "cached (1407m ago)" grow for a day and a half.

### The fix — stamps mean "last verified", badges mean "actually stale"
- **Pool stamp-advance** (`POOL_STAMP_REFRESH_MS` = 90min): a successful
  re-cache with unchanged content still rewrites the pool when its stamp
  is >90min old. The 2h sweep cadence makes every full sweep advance it
  (≤12 writes/day of the 1,000/day quota; real content changes keep their
  instant write; the HARD budget hold still gates everything). The stamp
  now means "the last sweep that verified this data" — exactly what the
  header claims to print.
- **The cached badge is DATA-age-gated** (`CACHED_BADGE_MS` = 3h):
  the snapshot-serve path (and the last-resort catch fallback) compute
  the badge from the **data epoch** (`fetchedAt` riding in the payload),
  not the KV write time. Healthy quiet days render **no badge**; only a
  real >3h data outage (dead/failing sweeps) shows it — with the DATA's
  age instead of a frozen write-time age.
- **Degraded serves stay honest**: the `liveSweepFailed || poolEmpty`
  path keeps its badge (that serve IS degraded) but ages it by the data
  epoch too.
- **Client untouched** (`public-13.12.js`): it already renders
  `fetchedAt` + the conditional badge — the semantics were fixed entirely
  server-side.

### Verified
- Suite: 569 OK checks (behavioral: fresh stamp + identical content → no
  rewrite; stale stamp + identical content → the stamp-advance fires;
  wiring: gate shape, badge threshold, epoch-based cachedAt, the removed
  unconditional badge). `npm test` exit 0.
- Local `wrangler dev` smoke: 13.54-livestamp, all routes real, fresh
  build stamps `fetchedAt: now` with no badge on healthy data.
- Live: worker `b37ccd66`; the first post-deploy requests served the old
  snapshot with the badge now showing the truthful DATA age (2468min);
  the stamp heals at the next full sweep (2h cadence) via the stamp
  advance → snapshot rewrite. Subrequest budget unchanged.


## [13.53-standsteady] — 2026-09-28 (the missing-tables bug + the API-call diet)

### The user's report
> "Sometimes a league table or something doesn't load — if there are 5 league
> tables, 2 of them might not load, but the others are fully loaded
> [«جدول هنوز در دسترس نیست»]. I have a hunch this is because API call
> overload, so the system gets limited. I think our system sends too much
> update request, while it's not needed. We need to reduce the update times,
> to avoid API call per day."

Both halves were real, and the second half was the first half's cause.

### Why tables went missing (root chain, all links severed)
1. **The FD standings rotation aligned with itself.** Prewarm sweeps run
   exactly every 2h = 12 × 10-min slots, and `12 % 3 = 0` — every cron
   prewarm landed in the SAME rotation slot, so the same 2 codes refreshed
   every time while the other 4 (of PL/PD/SA/BL1/FL1/CL) only got fetch
   opportunities from random visitor rebuilds. On quiet days a code could
   go 8h+ without one.
2. **KV TTL was 8h** (`standings_cache_*`): once the rotation starvation
   crossed 8h, the cache EXPIRED — and the next FD 429/timeout hit the
   null path: the box rendered «جدول هنوز در دسترس نیست».
3. **The snapshot fallback was PGL-only** (v13.34): every other code had
   no last-resort — which is exactly why the user saw PGL render while
   2 of the 5 league tables sat empty.
4. **The 10-min freshness gate churned hundreds of calls/day**: every
   payload rebuild re-hit FD for its rotation pair (~240+ standings
   calls/day under traffic) — the "too much update request" that gets
   the free tier rate-limited in the first place.

### The fix — tables stay, the call volume collapses
- **All-codes snapshot fallback** (the v13.34 PGL path, generalized):
  when ANY standings code (or the UCL card) has no live table, the 7-day
  snapshot's copy fills the box — tagged `stale`/`staleAsOf`. Read only
  on the miss path; zero KV cost on the happy path. `top3`/`top5` clash
  marking deliberately still uses live tables only.
- **Default freshness gate 10min → 6h** (`STANDINGS_FRESH_MS`), with a
  **per-code jitter** (`STAND_CODE_ORDER` × `STANDINGS_FRESH_JITTER_MS`
  = 17min) so the 6h expiries NEVER coincide — a rebuild fetches at most
  ~1 code. Callers that need post-FT freshness (result lines, weekly
  digest, coronation, `/api/standings`) pass `opts.freshMs = 6e5`
  (honored exactly, no jitter). Coronation now fetches fresh ONLY for
  leagues with a just-finished match (~80% fewer calls; identical
  detection semantics — a leader can only change via that league's FT).
- **FD rotation REMOVED, fetches SEQUENTIAL**: the alignment bug is gone
  by construction, and no rebuild can burst FD's 10 req/min window.
- **Standings KV TTL 8h → 24h** (`STANDINGS_CACHE_TTL`): the
  fetch-failed → cached fallback survives a full day of upstream
  429s/suspension. A day-old table beats an empty box.
- **FD standings respect the 429 penalty box** (`providerSuspended`) —
  calls into an exhausted quota-minute are wasted calls; skip to cache.
- **Live-detail enrichment (scorers) is PREWARM-only**: the serve-time
  overlay patches status/score/minute on every payload, and a goal fires
  `liveChanged` → the tick's prewarm re-enriches scorers within ~10min.
  Visitor rebuilds skip up to 4 FD calls + 5.6s of sleeps EACH (both API
  burn and latency during live windows).
- **R6 SHIPPED — sportscore live-sweep fan-out**: the live sweep now
  fetches only eligible leagues with a live/imminent ([-6h,+3h])/just-
  finished pool match (`fetchSportScore` gained `opts.slugs`). A league
  evening with no cup/EL/PGL match in flight: **0 sportscore calls**
  (was 18/tick ≈ 540-720/day); an EL Thursday: 4. Discovery stays the
  full sweep's job (every 2h, all slugs). BL1 stays eligible — when FD
  is suspended, sportscore is its only live source.
- **Snapshot un-frozen on break weeks**: the 7-day snapshot's refresh
  was gated on non-empty match lists — during international breaks a
  SUCCESSFUL sweep legitimately produces empty lists, so the snapshot
  froze at the last matchday's build and break-week visitors cycled an
  aging snapshot forever. Live evidence: the 2026-09-28 break still
  served the Sunday copy carrying the pre-13.53 missing-tables damage.
  The refresh is now gated on SWEEP SUCCESS (`!liveSweepFailed &&
  !poolEmpty`) — failure semantics preserved (a total-provider-failure
  build never overwrites the fallback), change-only writes, one healing
  write per break day.

### Expected daily API budget (matchday, vs before)
- sportscore: ~800 → ~280 (live sweeps 540-720 → 60-160; full sweeps
  unchanged at 216 — the correctness backbone)
- football-data: ~350 → ~80 (standings ~300 → ~40-60; sweeps unchanged)
- scorers enrichment: ~4/tick × visitor refreshes → ~4 per goal-window
  prewarm only

### Tests
- check-reliability +14 `#standsteady` wiring asserts (gate/jitter/TTL/
  rotation-gone/snapshot-fallback/UCL-card/suspension/prewarm-enrich/
  R6/coronation/fresh-callers).
- check-no-miss section S reworked: R6 behavioral (skip-with-no-eligible,
  EL narrows to [EL], far-future fixture → no call, imminent cup arms its
  slug) — the old "yesterday+today window" assert upgraded to assert the
  slugs filter rides it.
- check-cups: `snapUcl` stub for the UCL-card slice (pre-13.53 semantics
  under stCL=null preserved).
- `liveSeg` window 2400 → 4600 chars (fetchLiveSweep grew with R6).
- Full suite: tsc + 17 scripts, 558 OK checks, exit 0.

## [13.52-swrsolid] — 2026-09-16 (the "few minutes to load" bug: the visitor never waits, the live game never lies)

### The user's report
> "When you open sportsignal.ir after a while, it's like the APIs are just
> fetching at that time, which takes a few minutes to load — it seems there
> is no caching. Fixtures can easily be cached, but you can't cache a live
> game: if the game is over and the cache is not purged, it will still
> show as playing."

Both halves were real. Root cause chain (three links, all severed):

1. **Visitor-written payload TTL was 300s** — with sparse traffic (gaps
   between visitors > 5 min, i.e. almost every visit on this site) the KV
   key **expired before the next visitor arrived**, so the 10-min SWR
   grace window never operated and every visitor ran the *synchronous*
   rebuild. (Prewarm-written payloads had 720s — the grace worked only
   for them.)
2. **That synchronous rebuild called `fetchLongView`** — the 92-day view:
   10 football-data chunks each followed by a hard 2s sleep (FD free tier
   = 10 req/min → 429s → Retry-After waits), up to ~70 sportscore calls,
   TSP fan-out with 1.2s pacing. **Tens of seconds to minutes**, on the
   visitor's request. Its pool-reuse gate (`horizon > now+60d`) almost
   never passed mid-season, so this ran again and again.
3. **The 7-day snapshot** (built for exactly this) was reachable only
   via the `catch()` on total failure — and on live evenings the SWR
   window could serve a finished game as playing.

### The fix — fixtures cache, live never lies
- **Pool-first visitor rebuilds** (`fetchPublicMatches`): the visitor
  path reads the KV pool (refreshed by the cron full sweep every 2h —
  fixtures are slow-moving) and only falls back to `fetchLongView` when
  the pool itself is gone (cron dead >24h — the recovery path). The
  92-day long view no longer runs on any visitor's critical path.
- **One payload TTL: 720s** (was 720 prewarm / 300 visitor). The SWR
  stale-serve window (5–10 min) now actually functions for every write.
- **Snapshot promoted to the primary stale source** (`public-swr.ts`):
  payload expired/missing → serve the 7-day snapshot **instantly**
  (tagged `cached`/`cachedAt` — the page's existing indicator) and
  rebuild in the background. The synchronous rebuild now only happens on
  a true cold cache (no payload AND no snapshot: first deploy / KV wipe).
- **The live overlay** (`live_overlay_v1`, TTL 6h): the cron tick writes
  a tiny {id, teams, day, status, minute, score} row per live-or-recent
  match — the moment live data changes (goal / kickoff / HT / FT — the
  same `liveFingerprint` signal the prewarm gate uses), on full sweeps,
  and at least every 10 min while anything is live (minute freshness).
  The serve path reads it (one KV read) and **patches every payload it
  serves** — fresh, stale, or snapshot:
  - SCHEDULED → IN_PLAY/LIVE/PAUSED: status, score and minute patched in;
  - a FINISHED match is **purged from `upcoming`** and prepended to
    `finished` with its final score — the user's rule, verbatim;
  - `nextBig`, `topSpot`, weeks and `cups[].next` rows are patched too;
  - lookup is by match id first, then normalized team-pair + day
    (providers carry different ids for the same fixture between
    rebuilds).
- **Cost model** (the free-tier discipline): overlay writes ≤ ~12/day on
  sweep cadence + live-change events + ≤6/hour minute top-ups ≈ 40–60 on
  the busiest matchday, zero on quiet days; 2 KV ops per write; gated
  `subrequestCount() < 40` (the 21:40Z incident lesson) and held under
  the HARD budget governor (`budgetHard`); NOT gated on SOFT (correctness
  beats cosmetics; documented in-source). Serve path adds exactly one KV
  read per request.

### Accepted narrowing (documented)
The public payload's fixture horizon now follows the pool (~1–6 weeks
via FD +8d + TSP next-events) instead of the 92-day long view. The page's
own windows (thisWeek/nextWeek = 7+7 days, cups' next match) are fully
covered; the 90-day `topSpot` window simply shows fewer far-out rows.
Not worth the minutes-long visitor stalls it existed to prevent.

### Tests
- `check-no-miss.js` +9 behavioral (real `applyLiveOverlay` via the
  eval harness): FT purge from upcoming → finished head with final score
  + nulled minute; kickoff patch; by-pair fallback; nextBig/topSpot/
  cups/weeks patching; no-blob and unknown-row no-ops.
- `check-reliability.js` +11 `#swrsolid` wiring asserts (key + TTL
  declared; pool-first rebuild; overlay read + apply on the serve path;
  snapshot-before-sync ordering; cron write gate changed/full-sweep/
  10-min; `budgetHard` + subrequest gates; liveChanged hoist shared by
  prewarm and overlay; overlay writes fold before the completion blob).
  The 13.35 TTL assert co-evolved to the single-720 shape.
- `npm test` exit 0 (143 behavioral checks; also fixed a pre-existing date-drift failure in `live-derby-test.js` — the EOM-gated upcoming list dropped +3d fixtures in the last days of a month; found live 2026-09-28 on pristine 13.51 code, fixed with a month-aware `relOff` helper).
- Pool retention 2d → 7d (`cacheMatches`): under pool-first, the pool is
  the finished card's only source — a week of settled rows keeps the v12.5
  "7 days of results" intent. No extra fetches; the rows were already in
  KV. (Found while investigating: the current international break —
  leagues last played Sept 19-20, UCL MD2 is Oct 13-14 — made the empty
  `finished` card look like a bug; it was simply the truth, plus this
  retention gap. FD verified healthy by taping the 13:30Z full sweep:
  0 matches for Sept 26-Oct 6 is the correct answer for that window.)

### Live verification (2026-09-28, deployed Version 2d79f5cc)
- Local smoke first: the true-cold path (empty local KV + dead local FD
  token) reproduced the user's bug exactly — the synchronous long view
  burned >60s; with any cached state present: 0.83s → 0.004s.
- Live: first request after deploy paid a one-time 5.7s pool-first rebuild
  (the 7-day snapshot had expired in the quiet week); every request since
  = **0.3-0.7s**. Payload-expired requests now serve the snapshot
  instantly (tagged `cachedAt`, the page's existing cached indicator) with
  the rebuild in the background — verified in KV: snapshot preserved on
  empty-result days, empty payloads keep their 60s retry TTL.
- Ticks: 13:30Z full sweep completed 13:31:51 (5 writes, sweep-band
  subrequests); quiet ticks clean; healthz `ok:true` throughout;
  `live_overlay_v1` correctly absent on a no-live-matches day (the overlay
  write gate only fires when live rows exist within ±6h).

---

## [13.51.1-banner] — 2026-09-15 (docs & banner — same worker build as 13.51)

No worker-code change: `src/config.ts` stays `13.51-rivalries`, `package.json`
stays 13.51.0. This entry records the banner, the docs catch-up, and — most
important — the continuation note.

### The continuation note (the user's own words, kept verbatim)
> "I AM NOT SURE HOW RELIABLE TELEGRAM BOT IS. IF you want to work, work
> from here."

Recorded in the README (top-of-file callout + status section) so any future
session knows where to pick up: the next focus is **Telegram bot
reliability** — the delivery path (`src/bot.ts`, `src/telegram.ts`,
`src/notifications.ts`, outbox recovery in `src/cron.ts`). Baseline
measured at flag time: webhook `football.sportsignal.ir/webhook` healthy
(0 pending updates, no last error), outbox draining clean, same-day alert
deliveries. Related backlog: R6 (live-sweep sportscore fan-out — 18 fetches
per evening tick at the real subrequest cap's edge) and R7 (TSP `eventspast`
cup-result sweeps bounded to in-flight rows).

### The banner
- `docs/banner.png` — user-provided art (ChatGPT, 2026-09-15): dark stadium
  night, glowing wordmark, match-card + Telegram-notification mockups.
  Verified before shipping (vision-model review): wordmark spelled exactly
  "SportSignal", Persian glyphs well-formed, no visual defects. Optimized
  1774×887 → 1280×640 (~0.98 MB).
- The README renders it full-width above the title; the regeneration prompt
  that used to live in the banner slot is preserved in git history
  (`git show 759cec0:README.md`).

### README catch-up
- "Current build" line: 13.48-xtrim → 13.51-rivalries (had drifted three
  releases behind the shipped reality).
- Status section lists 13.49-buttons / 13.50-cupscan(+.1) / 13.51-rivalries
  with the 21:40Z real-cap incident note; next-up section = the
  continuation note + R6/R7.
- The bot table row links @SportSignalAlertsBot directly; the repo layout
  lists `docs/`.

### Deploy record (13.51-rivalries — the code this addendum ships beside)
13.51-rivalries was committed in the previous session but could not deploy
(no Cloudflare token available then). This session: `npm test` 135/135 →
local smoke (`wrangler dev`: healthz shape + version, `/` 200, 404s
correct, `/admin` 200) → `wrangler deploy` (Version
`5bc68c8f-eb6a-41ff-9557-0ee5a9a91d93`, bindings STATE/AI/TEHRAN_TZ
unchanged, cron `*/10` intact) → live-verified: healthz flipped to
13.51-rivalries `ok:true`; the first two post-deploy ticks completed clean
(23:10Z: +4 writes, 53 subrequests; 23:20Z: +4 writes, 69 subrequests;
outbox 0 both, budget null); Telegram webhook 0 pending, no errors.

---

## [13.51-rivalries] — 2026-09-15 (named rivalries: El Clásico, not "Derby")

### The user's ask
The system labelled Real Madrid–Barcelona as a generic "Derby". It isn't —
in La Liga (or the Copa del Rey) it's **El Clásico**; in the Champions
League it's *just a UCL match*. Same treatment for the other marquee
pairings, with names shown **in English only** — Persian keeps exactly one
translated name: ال کلاسیکو.

### The rivalry table (src/matches.ts)
`RIVALRY_PAIRS` + `rivalryName(match, lang)` — the named tag for the
match in that language, or null:
- Real Madrid–Barcelona → **El Clásico** (fa: ال کلاسیکو)
- Bayern–Dortmund → Der Klassiker
- Milan–Inter → Derby della Madonnina
- Liverpool–Man United → North West Derby
- Man United–Man City → Manchester Derby
- Arsenal–Tottenham → North London Derby
- PSG–Marseille → Le Classique
- Roma–Lazio → Derby della Capitale
- Juventus–Torino → Derby della Mole

Three rules encoded in the one function:
1. **Never in the UCL** (`competition.code === "CL"` → null). Applied to
   `isDerby()` too: a derby pairing in the Champions League is just a UCL
   match (it flows to the week-ahead "UCL duels" bucket instead of the
   derbies bucket, and the CL-blockbuster banner still applies on its own).
2. **fa gets only ال کلاسیکو** — every other name is English-only; fa
   consumers (specialBanner, the card, the site badge) drop the tag
   entirely for those pairs rather than show English text.
3. The pairs also stay in `DERBY_PAIRS`, so derby sorting/boxing keeps
   seeing them (Merseyside + the Madrid derby keep the generic tag).

### Latent bug fixed along the way: Der Klassiker never matched
`DERBY_NORM` normalized pair names with bare `normalizeTeamName`
(→ `bayernmunich`) while match names go through `normAlias` (→
`bayernmunchen` via the alias table) — Bayern–Dortmund could never be
detected as a derby. `DERBY_NORM` now goes through `normAlias` as well.
Also added the `sslazio → lazio` alias fold (FD's legal "SS Lazio" vs
the short "Lazio" the rivalry table carries).

### Surfaces updated
- `specialBanner` (all Telegram notifications: 24h/big/3h/1h/5min/start/
  result + the featured match + the X mirror): named banner replaces the
  generic "⚔️ Derby" line; fa shows only ال کلاسیکو.
- `pubMatch` (public-matches JSON): new `rivalry` (English name) and
  `rivalryFa` fields; `derby` stays for row styling/boxing.
- The match card (`src/card.ts`): the tag is now computed server-side
  from the match itself — the card also renders for the raw tracked pool
  (bot notification cards), which carries no `.derby` field, so the
  "⚔️ DERBY" text never appeared there at all. Named rivalries show the
  name (⚔️ El Clásico); fa cards show ال کلاسیکو only; UCL never tags.
- The public site (`assets/public-13.12.js`): `derbyLabel()` drives both
  badge spots — named badges replace the generic one (🔥 El Clásico), fa
  drops badges for English-only names (row keeps `.derby` styling).
- SW cache bumped v11 → v12 (the v13.39 rule: every asset-editing
  release bumps).

### Tests
`scripts/live-derby-test.js` — A2 section: every pair name (FD and TSP
spellings), the UCL exclusion (both `rivalryName` and `isDerby`), the
fa-only-Clásico rule, the SS Lazio fold, and the DERBY_NORM fix.
`check-venue` / `check-composers` got `rivalryName` stubs.

---

## [13.50-cupscan] — 2026-09-15 (the EFL Cup hole: coverage via the team view)

### The incident
The user missed Liverpool–Tottenham, EFL Cup R32 (2026-09-15 19:00Z).
Forensics: the fixture existed NOWHERE in the pool. Root cause chain
(all three providers checked live):
- **football-data.org**: EFL Cup is not on the free tier (by design).
- **sportscore**: the `efl-cup` competition feed returns zero matches on
  every date probed (every slug variant tried) — their EFL Cup data is
  simply absent in this window. (Coppa Italia, CDR etc. still flow.)
- **TheSportsDB**: the correct league (id 4570, verified via lookupleague)
  — but TSP's LEAGUE views silently regressed: `eventsnextleague` /
  `eventspastleague` now return exactly ONE event per league (the Premier
  League control returned 1 too), and `eventsseason`/`eventsround` are
  partial. Meanwhile the TEAM view (`eventsnext.php?id=<teamId>`) is
  complete: fixtures + live scores + strStatus. The Liverpool–Tottenham
  tie existed ONLY there.

### The fix
A bounded, marker-gated **team scan** on non-sweep ticks:
- `CUP_TEAM_TSP_IDS` (tables.ts): the 6 English big teams' TSP ids,
  verified live (Arsenal 133604, Chelsea 133610, Liverpool 133602,
  Man City 133613, Man United 133612, Tottenham 133616). These are the
  teams that make cup matches notify-worthy (`shouldNotify`:
  big-team-involvement for domestic cups) — so the scan covers exactly
  the alertable surface of EFL Cup + FA Cup R3.
- **maybeScanCupFixtures** (providers.ts): fetches each team's next
  events (paced 1.2s), filters to EFL_CUP/FA_CUP (idLeague 4570 + name
  map), dedupes against the pool by matchKey. ADDs append to the pool +
  the tick's in-memory view (pre-match windows fire). UPDATEs refresh
  status/score of existing rows (status-change detection → result alerts).
- **Marker `cup_scan_v1`**: ok = skip 5h; fail = back off 30 min; HOT
  window (a tracked cup match within [-1h, +4h]) = re-scan at most every
  30 min so live scores/FT flow at near-tick cadence. Never runs on
  full-sweep ticks (~42/48 fetch budget already spent); never runs under
  the SOFT governor; never on an empty pool.
- **cupEventToMatch**: the team-view mapper — tspEventToMatch plus the
  LIVE status vocabulary (NS/1H/HT/2H/ET/FT/AET/PEN → our SCHEDULED/
  LIVE/PAUSED/FINISHED) and score-stored-only-when-in-play (TSP shows
  0-0 pre-kickoff — same rule as the sportscore path).
- Cost: ~6 fetches + ~2 KV writes per scan (≤5 scans/day quiet, up to
  hourly during a cup evening) — well inside every measured budget.

### Known limits (documented, not hidden)
- Coverage = the 6 English big teams (the alertable surface). A
  Peterborough–Barnsley EFL Cup tie between two untracked teams is
  invisible (it is also not alertable — by design).
- Live scores/FT for cup matches flow through the TSP team view, which
  updates with a few minutes of lag. If sportscore's efl-cup feed ever
  returns, the existing near-sweep takes over with fresher data.
- The TSP team ids are hardcoded contracts (verified live 2026-09-15) —
  same house pattern as CUP_TSP_IDS.

### Tests
- check-cups.js: +7 behavioral checks on the real cupEventToMatch
  (NS/2H/HT/FT/AET/empty → status vocabulary + score gating + roundRaw).
- check-reliability.js: +11 #cupscan structural asserts (team table,
  team-view URL, EFL/FA filter, marker TTLs, fail backoff, hot window,
  empty-pool skip, cacheMatches persistence, cron gating, in-memory
  patches, row overlays).
- check-venue.js: TSP shared-mapper call-site count 3 → 4 (co-evolved).
- npm test exit 0 (519 OK lines, was 508).

---

## [13.49-buttons] — 2026-09-15 (the bot is tappable, not slash-only)

### The user report
"Telegram bot doesn't have buttons and works with slash commands."
Investigation: PARTIALLY TRUE — a persistent reply keyboard has existed
since v13.23-buttons, but it was attached only to /start, /featured and the
language callback. Every other reply sent a bare message, so the keyboard
was easy to lose (collapse it once, or join pre-v13.23 and never re-/start
— you never saw buttons again) and the per-user options (/teams selection,
/timezone) were number/city-typing flows.

### What changed
- **Every bot command reply now re-attaches the persistent reply keyboard**
  (a fresh keyboard message re-expands it if collapsed) — /stop, /help,
  /follow ×3, /timezone ×3, /next ×2, /tables fallback, unknown-command.
- **New keyboard button: Timezone** (fa "زمان" / en) alongside Teams,
  Language, Help, Stop; normalizeCommand maps the label to /timezone.
- **/teams is now a tappable inline grid**: every followable team is a
  button (✅ when followed; 2 per row; "همه تیم‌ها" resets to all). Tap →
  toggle → the message re-renders IN PLACE (editMessageText) so the marks
  never go stale. The numbered text list stays for /follow 1,3,7.
  Toggle semantics: in follow-all mode the FIRST tap starts a fresh
  selection with that team (never all-minus-one — that would silently
  REMOVE alerts); removing the last selected team is refused (min-one
  guard); tf:all preserves lang+tz.
- **/timezone is now tappable**: a quick-pick grid of 9 cities (Tehran,
  London, Paris, Berlin, New York, Los Angeles, Dubai, Sydney, Tokyo) +
  reset — resolved via the same TZ_ALIASES as the typed command; the
  message re-renders in place after each pick.
- **/help** gained the tap hint; telegram.ts gained `editMessageText`
  (single attempt, benign-error tolerant — a failed edit is cosmetic).

### Tests
- check-bot-edges.js: +13 behavioral tests (grid shape, tf:2 all-mode
  first-tap, in-place re-render, min-one guard, multi-select accumulate,
  tf:all lang+tz preservation, tz:london/reset/invalid, /timezone picker,
  real replyKeyboard/normalizeCommand extraction) — now 34 checks; the
  REAL grid builders are sliced into the eval (not stubs).
- check-join-flow.js: builders injected + stubs (toFaDigits,
  replyKeyboard); the numbered-list contract still asserted.
- check-reliability.js: +8 #buttons asserts (Timezone button + mapping,
  builders exist, tf:/tz: handlers, editMessageText sender, ≥10 keyboard
  attach sites, min-one guard).
- npm test exit 0 (508 OK lines, was 482).

---

## [13.48-xtrim] — 2026-09-15 (the X path is removed, not dormant)

### The decision (R4 of the reliability roadmap)
The X (Twitter) mirror was dead-in-practice: no X_* secrets were ever
set, `x_enabled_v1` was never written, and every tick since v12.33 has
taken the "X disabled" early return. Three options were weighed:

1. **Compile-time gating** (keep src/x.ts on disk, exclude it from the
   eval-concat bundle) — REJECTED. It breaks the no-drift test
   discipline: check-x-* would test code that never ships, the exact
   rot class the eval-extract harness exists to prevent. The call sites
   (cron X phase, six admin routes, admin UI card) would still have to
   be removed anyway.
2. **Documented deferral** (keep shipping it disabled) — REJECTED. The
   cost is not zero: six admin-reachable routes, OAuth 1.0a signing
   code, and 586 lines ship in every bundle, and every future release
   carries the coupling.
3. **Full removal** — CHOSEN. It is the house pattern (13.46-trim
   proved the guard-flip flow), git preserves the full history
   (docs/history/2026-09-13-NEXT-SESSION-X-INTEGRATION.md tells the
   story), and the restore path is documented in wrangler.toml +
   src/config.ts: revert this commit, set the X_* secrets via
   `wrangler secret put`, write `x_enabled_v1=1`.

### Removed
- `src/x.ts` (586 lines): OAuth 1.0a signing, budget/dedupe/pause
  governors, the Persian post composers, maybePostX/maybePostXWeekly.
- `scripts/check-x-signature.js` (192) + `scripts/check-x-budget.js`
  (315): their eval subjects no longer exist; dropped from the npm test
  chain (still 19 → 17 suites + tsc; 135 behavioral checks still pass —
  none of them tested X, they test the notification invariants).
- `scripts/verify-x-connection.js` (172): the standalone live-creds
  probe, orphaned with the path.
- The cron X phase (try/catch block after the Telegram coronation
  alerts) and the `tableToppersEvents` capture that existed only to
  feed it. `maybeNotifyTableToppers` (the TELEGRAM coronation feature)
  is untouched — #qc1 still locks its full-sweep gating.
- Six admin routes (`/admin/x-test`, `/api/x/status|phase|dry-run|
  enabled|clear-pause`) from admin-ops.ts, plus the admin panel's X
  status card (HTML + 7 JS handlers + boot call).
- `X_CONFIG` from config.ts (the KV-key contract keeps every live key;
  the x_* rows in RUNBOOK §5 now read "REMOVED at 13.48-xtrim") and the
  X_* fields from the Env type.
- Two dead imports api.ts had carried since 13.47 (X_CONFIG,
  getXStatus/xTestPost — leftovers of the split, never used there).

### Known dormant (deliberately untouched)
`assets/core-13.8.js` still carries 18 i18n keys (9 fa + 9 en) and the
stale `ver` footer string for the removed card. They are inert dict
entries in a LIVE public minified asset — not worth the blast radius of
editing the public bundle for zero functional gain. Same call as R2's
sw.js CACHE: leave the public asset alone, note it here.

### Tests
- New #xtrim suite in check-reliability.js (7 asserts): the concat has
  no x.ts segment, no X functions, no X_CONFIG, admin-ops has no X
  routes, the admin page has no card, cron has no X phase, and the
  harness order no longer ships x.ts.
- #seams X_CONFIG presence assert flipped to absence; #f10f re-scoped
  from xPostTweet's bump shape to the surviving telegram send-path
  bump (`if (bumpSubrequest()) return false;`) — the R1 fetch-only
  counter discipline is unchanged, minus the deleted site.
- worker-src.js order co-evolved in the SAME commit (x.ts out at
  position 15). npm test: exit 0, all suites green.

---

## [13.47-seams] — 2026-09-15 (modularization: the monolith gets seams)

### The theme
R3 of the reliability roadmap. Pure code movement — bodies moved
byte-identical, every export signature unchanged, zero behavior changes,
zero KV changes, zero asset changes (sw.js CACHE stays sportsignal-v11).
The eval harness (scripts/lib/worker-src.js) file list co-evolved in the
SAME commit (the harness silently skips missing files — a forgotten file
would pass every regex while a whole module went dark; the new #seams
asserts lock the order list itself).

### The splits
- `src/config.ts` (512→349) → + `src/tables.ts`: the static dictionaries
  (STAGE_EN/FA, COMP_EN, LEAGUE_LOGOS, provider id maps, CSP headers, the
  UCL starball) left the config module. config.ts keeps the KV-key
  contract (CONFIG), X_CONFIG tunables and VERSION — one file owns every
  live-state key.
- `src/cron.ts` (603→507) → + `src/monitoring.ts` (getCronStatus,
  alertPhaseError, liveFingerprint) + `src/migration.ts`
  (maybeBroadcastMigration — the mig_sent_v1 round broadcast, body moved
  verbatim). The tick keeps the meter/governor/lock/pool/completion blob:
  the #quota1 truemeter invariants are order-locked text, and phase
  extraction would be a rewrite of the quota guarantee (anti-goal —
  revisit only with failure-injection tests).
- `src/api.ts` (1101→312) → + `src/auth.ts` (admin login/logout/
  change-password — the stateless HMAC cookie block), `src/public-swr.ts`
  (the /api/public-matches SWR endpoint), `src/card-route.ts`
  (/api/card/:matchKey), `src/simulate.ts` (the SIMULATE_ROUTE entry +
  body, moved together), `src/admin-ops.ts` (ADMIN_OPS_ROUTES — 18
  admin/ops route entries + legacyGetAction, moved WITH their bodies so
  check-security's slice-based override guard keeps its adjacency).
  api.ts is now the router proper: dispatch + table spread + healthz +
  the dead man's switch scheduled handler.
- `src/types.ts` gains RouteCtx/RouteDef (shared by api/admin-ops/simulate
  — type-only, no runtime cycle).

### Why entries moved WITH bodies
check-security extracts the concat slice from the "/api/fa-teams/override"
string forward and asserts isValidFaName/isAdminAuthed within it — a thin
route entry in api.ts with the body in an earlier concat file would
silently break that guard. Moving whole entries keeps every slice-based
assertion self-contained.

### The 1101 (found live, fixed pre-release-window-close)
The first deploy of 13.47 threw `error 1101` on every request for ~90s
(17:51:30–17:53:00Z) — rolled back immediately; no tick was lost (the
17:50 tick completed pre-deploy; the 18:00 tick ran on the fixed build).
Root cause: the ADMIN_OPS_ROUTES entries were joined with an extra comma
on top of each entry's own trailing comma — 18 array ELISIONS
(`} },,`), i.e. 18 `undefined` elements; the dispatch loop read
`undefined.path` → TypeError on every request. Every gate missed it:
elisions are legal TypeScript (tsc green), the test harness only
regexes/evals-extracts text (holes invisible), esbuild parses elisions
fine. Two new gates: #seams zero-elision assert + entry/terminator count
lock in check-reliability.js, and a LOCAL SMOKE TEST step in RUNBOOK §2
(wrangler dev + curl /healthz before every deploy) — the gate that
would have caught it.

### Tests
+22 #seams asserts in check-reliability.js (harness order list contains
every new file; bot.ts→cron.ts marker adjacency for botSeg13; the
spreads; per-file slice ownership for tables/monitoring/migration/auth/
swr/card-route/admin-ops/simulate; cron.ts keeps the meter + completion
blob; api.ts keeps scheduled() + healthz). npm test exit 0 — 135
behavioral checks.

## [13.46-trim] — 2026-09-15 (tidy-up: dead code, landmines, and docs telling the truth)

### The theme
R2 of the reliability roadmap — a hygiene release. Zero behavior changes,
zero KV changes, zero asset-reference changes (sw.js CACHE stays
sportsignal-v11). Every deletion below was reference-verified (grep across
src/scripts/docs/assets) before the axe; every test guard that protected
dead code was flipped to an absence assert in the same commit, per the
house style (#1 sched decoy / #5 canary).

### Landmines removed
- `npm run refactor:verify` — DESTRUCTIVE and broken: the `--check` flag
  was never implemented, so the command re-ran the v12.33 extraction and
  OVERWROTE src/ from the stale bundle (verified live once, restored via
  git); its `||`/`&&` precedence was also broken. The whole extraction
  pipeline is retired: `scripts/refactor-extract.mjs`,
  `scripts/worker.bundle-v12.33.ts` (711KB — 2/3 of scripts/),
  `refactor-{fix-imports,prune-imports,client-core}.mjs`,
  `refactor-router-table.py`, and `extract-page-assets.mjs` (one-offs).
  History lives in git and this changelog.
- `bun.lock` — stale since v12.10 AND broken (missing @resvg/resvg-wasm, so
  a `bun install` produces a tree that can't render cards). npm is the
  repo's toolchain; `package-lock.json` is the canonical lockfile.
- Dead assets: `assets/Stadium-bg-1.jpeg` (2.0MB, referenced only by an
  X-banner intent note), `assets/Live.lottie` + `assets/loading.lottie`
  (dotLottie was removed in v13.4; the current live-dot is pure CSS).

### Dead code removed (all zero-caller, verified)
- `getCanonicalKickoff` / `updateCanonicalKickoffOnReschedule` (admin.ts)
  + `KV_KICKOFF_PREFIX` (config.ts) + admin.ts's now-orphaned `matchKey`
  import — the kickoff_v1: feature never wired (detectStatusChanges never
  called the helpers; windows always used the pool's utcDate). check-reliability
  #4 flipped to absence.
- `sendPhoto` (URL-based, telegram.ts — superseded by `sendPhotoBinary`
  v13.17) and the `sendTelegramWithKeyboard` alias (v13.2 merged it into
  sendTelegram's optional keyboard param).
- `getUserLang` (users.ts — the fa default made it dead).
- `UCL_BALL` (config.ts — 4KB starball variant with zero references;
  `UCL_LOGO_CHIP`/`UCL_STARBALL_D` stay, they're live in public.ts).
- x.ts's duplicate `NOTIFICATION_CONFIGS` table (a byte-duplicate of
  notifications.ts's live config; the eval concat had the var declared
  twice) + the 5 window fns and 7 formatters its imports dragged in.
  The LIVE x.ts imports stay: `isMatchFinished`, `isWithinPostMatchWindow`,
  `isMatchStartingNow`, `fetchStandings`, `isoWeekKey`, `weeklyTableCodes`.
- types.ts: the 14 extraction-era domain interfaces nobody imported
  (Match/TeamRef/StandingsTable/…). Env (+ LooseKV/WorkersAI) is the only
  contract the modules share — and it now documents `HEALTHCHECK_PING_URL`,
  which 13.45 reads but never declared.
- worker.ts's unused `CONFIG/VERSION/X_CONFIG` import.

### Docs now tell the truth
- **README.md** rewritten from v11.52-era claims (wrong alert model, wrong
  KV keys, `teams.js`/`dedupe.js` file refs, missing /healthz + governor +
  dead-man's-switch semantics) to the v13.46 architecture.
- **RUNBOOK.md** (new): operations — deploy/verify/rollback procedures,
  monitor + alert semantics (healthchecks.io cron-watch + UptimeRobot
  healthz poll + the degraded band), the healthz coverage matrix, missed/
  duplicate notification investigation playbooks, KV key table, measured
  profiles & budgets, and the safety invariants (write-first dedupe, no KV
  renames, eval-harness co-evolution rule).
- `NEXT-SESSION-X-INTEGRATION.md` (self-contradictory dates, pre-v13.0
  architecture) → `docs/history/`. `NEXT-SESSION-CONTINUATION.md` replaced
  by a thin pointer doc (CHANGELOG + RUNBOOK + worklog are the record now).
- `design-system/ucl-notifier/MASTER.md` header fixed: the UI lives in
  `src/pages/*.ts` + versioned assets, not in a monolithic worker.ts.

### Kept on purpose
- `KV_SCHEDULE_PREFIX` (config.ts) — documentation-only tripwire for the
  sched_v1:* TTL cleanup (~Sep-22).
- `scripts/verify-x-connection.js` (live X ops tool, standalone signing
  impl) and `scripts/fa-names-from-wikipedia.js` (data provenance for
  fa-dict.ts).

Tests: check-reliability #4 flipped to absence (3 asserts); npm test exit 0
(tsc clean, 135 behavioral checks, 19 scripts). No src signatures changed,
so worker-src.js order/transforms needed no edits.

---

## [13.45.1-sightlines] — 2026-09-15 (log-line truemeter: stored and logged must agree exactly)

- The 13.45 closing log line printed `KV ops this tick: ${kvOpsCount() + 1}`
  — but by the time the log runs, the completion blob's own put has ALREADY
  been counted by the wrapper, so the +1 double-counted it (live first tick:
  stored subreq_last_tick=27, logged 28). Same discipline 13.44.1 applied to
  the write meter: the log now prints the as-run count (blob put included,
  no +1) and agrees exactly with the stored blob fields. The healthcheck
  ping (post-completion, one more fetch) remains deliberately excluded, as
  documented in 13.45.

---

## [13.45-sightlines] — 2026-09-15 (see everything: true subrequest totals, dead man's switch, degraded band)

### The theme
Six observability/guard fixes, zero behavior changes on the notification
path. Everything previously invisible now has a number attached, and the
free external monitoring stack (healthchecks.io dead man's switch +
UptimeRobot healthz poll) goes live on the worker side.

### F10 — the subrequest counter was blind to KV ops + 5 fetch sites
- The counter only ever saw fetchJSON/fetchWithRetry/telegram/admin. Every
  STATE.get/delete and five raw fetch sites (x.ts xPostTweet, card.ts crest
  fetch, composers.ts standings + teams, users.ts getChat backfill) ran
  invisible — the notify-defer guard (>38) and the prewarm gate (<30) were
  deciding on fiction, and a busy sweep could sail past the real 50 ceiling.
- Fix: KV ops counted via a SECOND counter (bumpKvOp/kvOpsCount), wrapped
  with the same __orig pinning as the write meter; the five raw sites now
  bump with graceful fallbacks (placeholder crest / no standings this tick /
  backfill stops / X post returns budget-exhausted). The GATES keep their
  fetch-only semantics BY DESIGN — they were tuned on that number; the true
  total (fetches + KV ops) is the new sightline: completion-blob fields
  subreq_last_tick / kv_ops_last_tick, the closing log line, and healthz.
- Net effect: standings/crests/X-posts/getChats now contend for the budget
  honestly instead of hiding outside the meter.

### Dead man's switch (healthchecks.io)
- CF has no "cron didn't fire" alerting, and URL monitors can't see hung or
  CPU-killed ticks (the worker keeps serving 200s — the exact 2026-09-14
  shape: 49 dead ticks while healthz said ok). pingHealthcheck: success
  ping after every resolved tick (early returns are handled outcomes →
  success; a HUNG tick is instead caught by healthz's last_cron staleness
  → 503 → UptimeRobot — every failure class has exactly one watcher);
  /fail ping from the scheduled handler's catch with the error name in the
  POST body (verified live: path-suffix messages 400, the body form is
  accepted and surfaces in the alert + log). Fire-and-forget via
  ctx.waitUntil, counted against the subrequest budget (at cap it is
  skipped — the missed success ping covers that class), and a no-op
  without the HEALTHCHECK_PING_URL secret.

### healthz degraded band (additive)
- `degraded: true` while still HTTP 200: ages past 2 periods, outbox > 10,
  or the KV governor engaged. The 200/503 decision is byte-identical; new
  fields subreq_last_tick + kv_ops_last_tick join the payload.

### The NaN (W6)
- notificationCounts was missing "pre-match-5min": 0 — the config type
  exists, so every 5-min send incremented a missing key → NaN → JSON null
  in the tick blob's notify.s counters. One line.

### fa-ai marker gating (W7)
- KV_FA_LAST_RUN was written every 15-min cooldown even when there was
  nothing to learn (~96 writes/day = 9.6% of the 1,000/day free quota for
  a signal worth zero). The marker moved BELOW the emptiness check
  (write-first fail-backoff semantics preserved for real work), and an
  isolate-level empty-verdict cache keyed on the public payload ts keeps
  the empty path at one KV read per tick.

### Bot sweep guard (W8)
- /featured and /next used to re-run the FULL provider sweep when the pool
  was >10 min old — a user-typed command could burn ~100ms of CPU on a
  FETCH invocation (the exact poison behind the 2026-09-14 CPU kills,
  which 13.43 fixed for cron) plus unmetered KV pool writes. Bot commands
  now serve the KV pool (at most one full sweep / 2h old — the same
  semantics as cron's quiet period) and never sweep. fetchMatchesFromAPI
  is gone from bot.ts entirely (test-locked to stay gone).

### Tests
- check-reliability.js: +13 asserts (#f10a-#f10g, #hc1-#hc3, #n1,
  #fai1-#fai2, #w8) — including the file-level absence assert that bot.ts
  can never call fetchMatchesFromAPI again.

---

## [13.44.1-truemeter] — 2026-09-15 (the meter tells the truth: fold the completion blob + prewarm writes)

### The bug the live deploy exposed
- Deployed 13.44-quotaguard at 03:05Z and watched the first ticks live:
  the tail logged `KV writes this tick: 4` while the stored accumulator
  advanced by only 3; the next tick logged 2 and the meter advanced by 1.
  **The fold was structurally off by exactly one write per tick** — the
  completion blob computes the `kv_writes_day` value it persists BEFORE its
  own put executes (the wrapper counts the put as it runs, but the number
  was already frozen). The prewarm block ran AFTER the blob too, so its
  writes (~2–4 per full sweep) were counted in the log line but never folded
  either. Net effect: the stored meter undercounted ~144–165 writes/day
  (14–16% of quota), which silently ate the governor's safety buffer —
  HARD@850 would only have engaged at a true ~994, six writes from the line,
  and healthz would have reported 856/1000 at a true 1000.

### Fixed
- The completion blob is now the tick's FINAL KV write: the prewarm block
  runs BEFORE it (so its writes fold), and the fold adds `+ 1` for the
  blob's own put — the stored accumulator, `kv_writes_last_tick` and the
  closing `💾 KV writes this tick` log line now agree EXACTLY, verified live
  (log 2 = healthz +2). Anti-spam semantics untouched: the blob is still
  one write, never gated; the prewarm move only changes WHERE in the tick
  its writes happen (its own budget gate and failure handling unchanged;
  a mid-prewarm hard death now honestly leaves `last_cron` stale — the tick
  really didn't finish — instead of lying "completed").

---

## [13.44-quotaguard] — 2026-09-15 (the free-tier budget guarantee — never exceed the KV-write quota)

### The user's ask, answered with a measured budget model
- "Make sure this system NEVER exceeds the free tiers — we're just a Telegram
  bot that shows a few messages a day." Audited every free-tier dimension
  against the real code + live telemetry: **KV writes (1,000/day) is the ONLY
  binding constraint** — requests (~1.5–3k/day incl. cron 144 + prober noise,
  limit 100k; static assets are free and don't count), KV reads (~1.5–8k/day,
  limit 100k), deletes/lists (~0, limit 1k each), storage (MBs, limit 1GB),
  cron triggers (1 of 5), subrequests (0–23 of 50, hard-capped at 48 in code),
  CPU (fixed structurally by 13.43's throttle; the remaining thin margin is
  documented — the paid plan is the permanent ceiling-lift). The scandal the
  audit found: on a COMPLETELY QUIET day the worker still burned **~690 real
  writes/day (69%)** while its own meter reported only ~450 — the v13.38 meter
  started counting AFTER the lock put and the start-heartbeat put, blind to
  ~288 writes/day (29% of the quota). A busy matchday could have pushed the
  true total past 1,000 with healthz still showing green numbers.

### Fixed — the quiet-day floor cut ~45% (690 → ~380 true writes/day)
- **Canary injection REMOVED (audit F9)**: `cacheMatches` ran BEFORE the
  injection, so the canary never persisted — every tick minted a fresh +25h
  kickoff whose 24h/3h/1h windows NEVER opened, while burning a
  `canary_match_v1` write every tick (~144/day) plus notify-path reads for a
  phantom match. Dead feature, live cost. `buildCanaryMatch` deleted; old
  `canary_match_v1` keys expire via their own 7-day TTL.
- **The START-heartbeat put is RETIRED (~−144/day)**: its two jobs are
  covered for free — "the cron fired" is proven by the execution-lock put
  (`own:<now>:<uuid>`, TTL'd) and "the tick completed" by `last_cron` in the
  completion blob; healthz (13.43) requires BOTH, so a mid-tick death still
  flips `ok:false` within ~35min. Side benefit: the kv_writes_day accumulator
  now folds at exactly one point (the completion blob), removing the old
  mid-tick clobber window.
- **The KV-write meter now wraps the VERY FIRST action of the tick** — the
  lock put and every phase write are counted, so `kv_writes_day` /
  `kv_writes_last_tick` / healthz reflect the TRUE burn. Also fixed a latent
  v13.38 chaining bug: a warm isolate re-wrapped `env.STATE.put` every 10
  minutes, layering wrapper-on-wrapper forever; the meter now pins the
  pristine binding via `__origPut` (depth stays 1, degrades gracefully if the
  runtime hands out fresh binding objects).

### Fixed — the hard guarantee: a write-budget GOVERNOR (the meter now ACTS)
- Thresholds in CONFIG: **SOFT at 700** — the tick skips cosmetic writes
  (public-payload prewarm, FA-AI learning); **HARD at 850** — additionally
  holds the pool-cache write for that tick (env-scoped `KV_BUDGET_HOLD` flag;
  the existing pool keeps serving — fixtures are static, a slightly stale
  live score for a few ticks is worth ~150 writes of headroom) and pages the
  admin once/12h via a write-first, KV-mark-deduped Telegram alert.
- **NEVER gated: the anti-spam + monitoring set** — execution lock, completion
  status blob, dedupe records, outbox, match-status telemetry. A dedupe write
  that fails under REAL quota exhaustion already defers its send fail-closed
  (v13.42), so the worst case at the 1,000 line is deferred notifications +
  a paged admin — never spam, never a dead-looking bot.
- **Web-side guard**: past the HARD threshold, visitor-driven public-payload
  rebuilds (refresh-lock + rate-limit + payload + live-detail writes, ~3–7
  per refresh) are held and the cached payload served — bounds adversarial
  write amplification (a rotating-IP scraper could otherwise mint a few writes
  per lock expiry, thousands/day). The cron prewarm path is exempt (governed
  by the cron-side governor); a cold cache still rebuilds — the public page
  must never brick.
- The completion blob records which level was engaged (`budget:
  "soft"|"hard"|null`) and `/healthz` exposes `kv_budget` — one KV read (or
  one healthz poll) answers "why did the cosmetic writes stop today".

### Fixed — two audit findings that the governor made mandatory
- **F3 (dupe vector, closed)**: `broadcastBigMatchKickoff` /
  `broadcastBigMatchResults` called `saveNotifiedMatch` but did NOT gate the
  send on its return — the v13.42 fail-closed fix covered only the regular
  path. A KV-write failure (or a governor hold) during a big-match window
  would send unrecorded → duplicate broadcast next tick. Both now gate on
  the persisted save exactly like `sendNotificationIfNeeded`.
- **F5 (football-data 429)**: `fetchWithRetry` waited a fixed 1–2s and
  retried straight back into the same exhausted quota minute (FD free tier =
  10 req/min). It now honors the `Retry-After` header (capped at 15s so a
  long hint can't stall the tick), and football-data gains the missing
  provider-suspension circuit (mirror of sportscore's): a rate-limited main
  call suspends FD for PROVIDER_SUSPEND_MS and skips the intl calls this
  sweep — the pool + other providers cover.

### Kept exactly as-is
- Anti-spam framework untouched (dedupe/write-first/at-most-once paths only
  gained gates, never lost any); no KV keys renamed (only additive:
  `kv_budget_alert_v1`); no assets changed (SW cache stays
  `sportsignal-v11`); zero runtime dependencies; Favorites gate untouched.

### Tests
- check-reliability.js: #5 canary section flipped to REMOVAL asserts; the
  #nospam8 start-heartbeat assert flipped to RETIRED; new #quota1–#quota4
  wiring section (single cron_status_v1 put, meter-before-lock ordering,
  governor thresholds + soft/hard branches, web-side guard, F3 gating, F5
  Retry-After + FD circuit).
- check-no-miss.js: canary assert flipped; new behavioral section (QUOTA) —
  broadcast fail-closed under a failing KV (F3), pool-cache hold honored
  under the HARD flag, prewarm skipped under SOFT, Retry-After wait honored
  and capped, FD suspension set on 429 exhaustion.

---

---

## [13.43-cpukeeper] — 2026-09-14/15 (the CPU-limit outage killer + a healthz that can see it)

### Root cause of BOTH Sep-14 outages — identified with hard evidence
- Cloudflare GraphQL analytics + live `wrangler tail`: the account runs on the
  Workers **FREE plan (10ms CPU, rolling-average enforcement)**, while a full
  3-provider cron sweep burns **~93–124ms CPU**. During ACTIVE windows (any
  worthy FT keeps `isActiveTime` true for 8h) the cron re-swept on EVERY
  10-min tick — ~600ms CPU/hour dragged the rolling average over the limit and
  CF killed every tick at exactly 10ms CPU (`status=exceededResources`,
  `err=1`, cpu pinned at 10000μs): the **00:20→10:10Z outage (57 consecutive
  kills; result backfill only recovered 10:50Z)** and the **22:00Z+ outage
  (still active when 13.43 was cut — no notification since 20:11Z)**. The
  start-heartbeat kept advancing, so `/healthz` reported `ok:true` throughout.

### Fixed — sweep throttling with a live-freshness layer (the outage killer)
- Full sweeps now run **at most once per QUIET_SWEEP_MS (2h) — always**
  (previously: every tick during active windows, the CPU poison).
- Between full sweeps, an active tick runs the NEW **live sweep**
  (`fetchLiveSweep`): one narrow football-data call (±2 days — statuses +
  scores for everything near kickoff) + the sportscore yesterday/today sweep
  (BL1/EL/ECL/cup live data), merged OVER the cached KV pool **in memory** —
  no KV pool writes (the pool stays the last full sweep's snapshot). HT /
  POSTPONED / FT / match-start-backfill / 5-min windows all still evaluate at
  full 10-minute cadence from the merged pool. The live sweep never throws —
  a total provider failure returns the cached pool unchanged (identical to
  the quiet path's data source). Logs `pool=X fetched=Y (fd=A spsc=B)
  merged=Z live=N` for provider-pool miss visibility. `fetchFootballData` /
  `fetchSportScore` gained optional range opts (defaults unchanged).
- **The public-payload prewarm is gated** (measured live: a live tick WITH
  the ~100ms payload rebuild = 164ms CPU): it now runs only on full sweeps
  (2h) or when the live fingerprint (identity+status+score of every live-ish
  row) actually changed — a goal / HT / FT / newly-discovered fixture. Quiet
  and unchanged live ticks skip it entirely; visitors between rebuilds
  trigger the on-demand refresh (the pre-v13.35 path).
- **`reconcileSchedules` / the `sched_v1:` decoy is DELETED**: those records
  were never read back (the fire-leg was never built — the v13.42 lesson),
  and the decoy cost one KV read per worthy match per tick (174 reads/tick
  at removal ≈ 35–90ms CPU the free-plan budget couldn't afford). Recovery
  is covered for real by the `isBackfillEligible` legs + the outbox; old
  `sched_v1:` keys expire via their own 7-day TTL. No KV schema change.

### Fixed — healthz now requires tick COMPLETION (the monitoring hole)
- `ok` previously = heartbeat-fresh only. During both CPU-limit outages every
  tick wrote its start-heartbeat and died before completing — `ok:true` for
  hours while nothing was sent. Now `ok` requires BOTH the heartbeat ≤30min
  AND `last_cron` (written only at tick completion) ≤35min; response gains
  `last_cron_age_min`. A half-dead bot now pages external monitors.

### Kept exactly as-is (anti-spam framework untouched)
- Dedupe/write-first/at-most-once paths unchanged — the live sweep only
  changes WHERE match data comes from, feeding the same gated pipeline.
- `sched_v1` decoy writes, the broadcast dedupe gating gap and the
  football-data 429/Retry-After behavior are documented in the worklog for
  13.44; no KV keys renamed; no assets changed (SW cache stays
  `sportsignal-v11`); zero runtime dependencies.

### Tests
- check-reliability.js: new wiring asserts for the throttle branch, the live
  sweep (narrow FD range + sportscore window + no-KV-write merge), the
  prewarm gate (full sweeps OR changed live fingerprint) and the healthz
  completion gate; the old #1 section now asserts the sched_v1 decoy is GONE.
- check-no-miss.js: new behavioral section (CPUKEEPER) — the live merge
  updates a pool match SCHEDULED→IN_PLAY/PAUSED/FINISHED (HT/result/backfill
  windows still detect it), the 5-min window still evaluates on a live tick,
  a pool-missed live match is discovered (the Torino–Roma shape), the live
  sweep performs ZERO `STATE.put` calls, and the prewarm fingerprint is
  order-safe + reacts only to goals/status changes/new fixtures.

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

