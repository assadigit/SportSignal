# Telegram Channel Mirror — Session 0 Discovery

> **Session:** 0 (repository audit + implementation design) — documentation only, no runtime code.
> **Date:** 2026-11-07 (S16 of the 2026-11 work stream; the spec arrived mid-S15 as commit `c59091d`).
> **Spec:** `TELEGRAM_CHANNEL_MIRROR_SPEC.md` (repo root). PART III §5–6 defines this document.
> **Baseline at audit time:** `main` @ `2513ca0`, working tree clean, `npm test` **EXIT 0, 2,614 OK / 0 FAIL** (exactly the S15 documented baseline). Production: `v13.229-teamladder`.
> **Method:** every claim below was verified against current source (`grep -rn "api.telegram.org" src/` + every call site of `sendTelegram`/`sendTelegramDirect`/`sendPhotoBinary`/`sendDice`/`sendAnimation`/`sendUclGifBanner`/`sendSticker`/`editMessageText`), not against README/ARCHITECTURE prose. Where docs and code disagree, **code wins** and the disagreement is noted.

---

## 0. Executive summary

- **24 outgoing Telegram message families** were traced from origin to Bot API transport (§2). 11 are eligible public-notification families the channel should mirror; 13 are private/admin/operational and excluded.
- The whole product already funnels through **one transport module** (`src/telegram.ts` — 9 senders with shared retry/429-pause/pacing/dead-chat/outbox semantics) and **one write-first dedupe discipline**. The channel can be an *additional destination* at the notification-event boundary with **zero new schedulers, zero new polling, zero new providers**.
- The anti-spam ledger is **D1 `notified_v1`** (`USERS_DB`, PK `(match_key, ntype)`), NOT the KV `notified_matches_v6` blob the README/RUNBOOK still describe (that is the byte-identical legacy fallback when `USERS_DB` is unbound). Any channel design must follow the D1 pattern, not the KV one.
- Recommended architecture (§7): a small `src/channel-mirror.ts` module + a **new D1 table `channel_posts_v1`** (destination-scoped event claims, write-first) + **Wrangler `[vars]`** `TELEGRAM_CHANNEL_CHAT_ID` / `TELEGRAM_CHANNEL_PUBLIC_URL` (disabled by default) + one hook per existing notification family, composing a deterministic **Persian / Asia/Tehran** variant through the existing formatters.
- One deliberate identity decision (§7.3): the engine's `match-start` and the broadcast's `match-start-big` (likewise `result` / `result-big`) are **one logical stage** for the channel — at most one channel post per (match, stage), per the spec's "one corresponding channel post for that logical notification occurrence".

---

## 1. The notification pipeline in one page (verified)

One Worker (`ucl-notifier`), two cron triggers (`*/10 * * * *` + the lean `27 */4` far-cup probe — the probe never notifies). The 10-minute tick (`src/cron.ts` → `executeScheduledLogic`):

```text
install KV meter (wraps STATE.get/put/delete)
  → runPreflight        (applySettings, FA caches, budget governor SOFT 700/HARD 850, stale alert)
  → execution_lock      (240s TTL, write-first, fail-closed → no lock, no tick)
  → runUserPhase        (drainOutbox FIRST, 6h admin heartbeat, migration rounds, FA-AI, cap check)
      · if registered chats == 0 → “No users, skipping” → TICK ENDS (blob not written this path)
  → maybeSendWeeklyTables (Monday 01:30–06:00 Tehran window / KV-cursor continuation)
  → runPoolPhase        (fixture-aware sweep decision → matches, fullSweepThisTick, sched)
  → runNotifyPhase      (cron-notify.ts — see below)
  → runPoolMaintenance  (cup scans, far probe, stamp, standings)
  → runPublicPhase      (fingerprint, prewarm, live overlay)
  → completion blob     cron_status_v1 — the tick's LAST KV write (meter fold)
  → pingHealthcheck     (dead man's switch)
  → return { deferredUnits } → api.ts chains the kickoff-drain (fresh invocation
                                through the DRAIN_SELF service binding)
```

`runNotifyPhase` (`src/cron-notify.ts`) in order: `ensureBotMenu` → `detectStatusChanges` (postponed/cancelled + HT alerts) → `sendMatchNotifications` (the 7 per-match types) → `broadcastBigMatchKickoff` → `broadcastBigMatchResults` → `maybeSendUclNightPreview` → `maybeSendMorningDigest` → `maybeSendNightDigest` → `maybeNotifyTableToppers` (full sweeps only) → `auditNotifications` (+ `repairPerChatGaps`).

**All sends go through `src/telegram.ts`** (the only `api.telegram.org` callers in `src/` are telegram.ts's 9 senders, `users.ts` `getChat` profile enrichment, and `api.ts`'s admin webhook diagnostics). Bot API methods in use: `sendMessage`, `sendDice`, `sendPhoto` (binary multipart), `sendAnimation`, `sendSticker`, `setMyCommands`, `editMessageText`, `answerCallbackQuery`, `getChat`, `getWebhookInfo`, `getMe`, `setWebhook`. **No `sendMediaGroup`/`sendDocument`/`sendChatAction` anywhere.**

Transport semantics shared by every sender (`src/telegram.ts`): 40 ms global pacing (`TELEGRAM_MIN_SEND_GAP_MS`), global 429 pause (`TELEGRAM_PAUSE_UNTIL`, waits up to 8 s), `bumpSubrequest()` fetch-budget gate, dead-chat regex (`chat not found|blocked by the user|bot was kicked|deactivated` → `"dead"`), non-dead 4xx → hard fail *without* outbox, retries exhausted → `outboxPush` (text senders only; dice/sticker/animation are cosmetic and never outbox). Every text-bearing message gets `withTrialFooter` («نسخه آزمایشی.», `CONFIG.TRIAL_FOOTER`) at the **sender layer** — channel posts will inherit it unless deliberately suppressed.

---

## 2. THE COMPLETE NOTIFICATION INVENTORY (spec §5 table)

Legend — **Channel decision:** ✅ mirror · ⛔ exclude · ⚠️ decision documented in §6.

### 2.1 The per-match engine types (`src/notify-engine.ts`, `NOTIFICATION_CONFIGS` → `sendNotificationIfNeeded`, called per (match, type) unit from `sendMatchNotifications`)

Audience is always **follower subsets** (`userFollowsMatch` per chat, explicit prefs → master-list fallback). Per tz|lang group: `scopedEnv = {...env, TEHRAN_TZ: group.tz}`, `lang = group.lang || "fa"`. Message = `specialBanner(match, lang)` + formatter + (backfill) late tag + the v13.22 promo footer (`https://sportsignal.ir`). Dice (match-start only, fire-and-forget) → card `sendPhotoBinary(png, caption=message, parseMode=true)` → per-chat text fallback. Dedupe: **write-first `saveNotifiedMatch`** before any send; reservation `fanoutReservation` = full/lean/defer **before** the dedupe write. Horizon fence **[-26 h, +73 h]**, `shouldNotify` filter, urgency sort.

| # | Type | Eligibility (verified window) | Audience | Personalization | Dedupe key suffix |
|---|---|---|---|---|---|
| 1 | `pre-match-72h` | 68–72 h before kickoff (`isWithinBigMatchWindow`, `BIG_MATCH_NOTIFICATION_HOURS=72`, width 4 h) | chats following **BOTH** teams (`isBigMatch`) | tz + lang | `:pre-match-72h` |
| 2 | `pre-match-24h` | 20–24 h before | ≥1 side followed | tz + lang | `:pre-match-24h` |
| 3 | `pre-match-3h` | 2.5–3.5 h before | ≥1 side | tz + lang | `:pre-match-3h` |
| 4 | `pre-match-1h` | 0.75–1.5 h before | ≥1 side | tz + lang | `:pre-match-1h` |
| 5 | `pre-match-5min` | 0–10 min before | BOTH teams (`bigMatchOnly`) | tz + lang | `:pre-match-5min` |
| 6 | `match-start` | −1…+45 min (not FINISHED/POSTPONED/SUSPENDED/CANCELLED); backfill 45–180 min while live | ≥1 side | tz + lang (+ venue) | `:match-start` |
| 7 | `result` | FINISHED within 6 h (`POST_MATCH_NOTIFICATION_HOURS`); backfill ≤24 h | ≥1 side | tz + lang (+ standings line) | `:result` |

Backfill floors/maxes (`isBackfillEligible`, `src/match-windows.ts`): a missed window fires late (tagged «این یادآوری با تأخیر ارسال شد») while `hoursUntil` stays inside the type's floor…max. Expiry per type in `saveNotifiedMatch` (KV path) / 14-day prune (D1 path); the never-re-arm line: **a row exists ⟺ the (match, type) fired, ever** (`shouldSendNotification` consults the store unconditionally; `MEM_DEDUPE` per-isolate Set is seeded only on successful writes).

**Channel decision #1–7: ✅ mirror** — generic public match content; one channel post per (match, type) unit that actually fires (see §6 for the follower-gate consequence and §7.3 for the stage collapse).

### 2.2 The big-match broadcasts (`src/digest-bigmatch.ts`)

| # | Type | Eligibility | Audience | Notes |
|---|---|---|---|---|
| 8 | `match-start-big` | master big-match (`isMasterBigMatch` — both teams in `CONFIG.BIG_TEAMS_BY_LEAGUE`), `isMatchStartingNow`, not a `BOT_SILENT_LEAGUES` (AL) code | **ALL registered chats** (followers *and* non-followers — a follower of a master big match receives BOTH #6 and #8 today; verified in code + the audit's match-start/match-start-big equivalence group) | write-first `saveNotifiedMatch(..., "match-start-big")`, text-only (no card/dice), per-lang buckets |
| 9 | `result-big` | master big-match, FINISHED within 6 h, not AL | **non-followers only** (`userFollowsMatch(...) === null`) | `specialBanner` + `formatResultMessage`; write-first `"result-big"` |

**Channel decision #8–9: ✅ mirror, collapsed with the engine stage** — see §7.3: kickoff = ONE channel post whether it fired via #6, #8, or both; result likewise (#7/#9).

### 2.3 Status-change alerts (`src/notify-status.ts`, `detectStatusChanges`)

| # | Family | Eligibility | Audience | Dedupe |
|---|---|---|---|---|
| 10 | Postponed / Cancelled alert | `shouldNotify` match within ±(3d back/10d ahead); transition SCHEDULED/TIMED/POSTPONED → POSTPONED or CANCELLED vs the persisted map | ALL registered chats, per-lang buckets | **the status map itself** — KV `match_status_v1` (key `home\|away\|comp`, 14-day TTL, write-only-when-changed, **fail-closed**: a failed map save suppresses the alerts) |
| 11 | Half-time (PAUSED) alert | first transition into PAUSED, **master big matches only** | ALL registered chats, per-lang buckets | same status map (fail-closed) |

**Channel decision #10–11: ✅ mirror** — generic public football events; one post per (match, new status).

### 2.4 Digests and broadcasts

| # | Family | Origin / schedule | Audience | Dedupe (verified) | Content |
|---|---|---|---|---|---|
| 12 | Morning digest | `digest-morning.ts`; the first tick whose **tz-local hour == 9** for a chat's tz; only if that tz-local day has ≥1 master big match (not AL, not FINISHED) | per-chat (per tz bucket) | per-chat KV `digest_sent_<YYYY-MM-DD>_<chatId>` **mark-before-send**, TTL 36 h | `buildMorningDigestMessage` — today's big matches, ≤8 lines |
| 13 | UCL night preview | `digest-uclnight.ts`; window [first CL kickoff − 6 h, −10 min] (`UCL_PREVIEW_LEAD_MS/TAIL_MS`), tz-local date with ≥1 `CL` fixture; wall-guard ≥40 subrequests | per-chat (per tz bucket) | per-chat KV `uclnight_<dateKey>_<chatId>` mark-before-send, TTL 36 h | `sendUclGifBanner` (file_id-cached, KV `ucl_gif_fileid_v1` 90-day TTL) + `buildUclPreviewMessage` (fixture list, **per-chat priority order** by followed teams) |
| 14 | Night results digest | `digest-night.ts`; tz-local hour ≥20 or <6, tz-local matchday over (all resolved or >4 h stale-defended; stale-pool completeness guard; last-chance hours 23/5), ≥1 finished, **valuable night** = UCL night ∨ elimination event ∨ (per-chat) a desired team played | per-chat (per tz bucket) | per-chat KV `nightdigest_<dateKey>_<chatId>` mark-before-send, TTL 36 h | UCL GIF banner on CL nights + `buildNightDigestMessage` — **per-chat personalization**: followed-team won/lost sentences + current table rank (`userFollowsSides`) |
| 15 | Weekly league tables + week-ahead | `digest-weekly.ts`; Monday 01:30–06:00 **Tehran** (`WEEKLY_TABLES = {day:1, fromMin:90, toMin:360}`); **chunked fan-out** — KV cursor `weekly_tables_cursor_v1` (remove-before-send, 8-day TTL, 12-h freshness) + payload snapshot `weekly_tables_payload_v1` (rendered once/week) + week marker `weekly_tables_v1`; burst reservation `WEEKLY_FANOUT_CAP=44` | ALL registered chats (fa/en groups) | the cursor + week marker (write-first, fail-closed) | per league: `[sticker][table]` pair (v13.125 outbox pairs) then week-ahead message (`buildWeekAheadMessage`) |
| 16 | Coronation alert | `digest-coronation.ts`; **full sweeps only**; per domestic league: snapshot `table_top_v1:<code>` (top-10, 40-day TTL, write-only-when-changed, fail-closed) vs fresh standings; fires when a non-#1 side overtakes AND a just-finished (≤6 h) match involving new/old leader exists | ALL registered chats, per-lang buckets | the snapshot itself | `formatTableTopMessage` (fa/en) |

**Channel decision #12–16: ✅ mirror** — all are public football digests. Per-digest channel semantics in §6/§7 (edition identity = digest + Tehran-local date; the night digest needs a **channel variant** without per-chat sentences; the weekly burst needs its own budget treatment).

### 2.5 Operational / admin / private (all excluded)

| # | Family | Origin | Audience | Channel |
|---|---|---|---|---|
| 17 | 6-hourly «ربات سالم است» heartbeat | `cron-users.ts` (`heartbeat_sent_v1`) | admin chat only | ⛔ |
| 18 | Phase-error pages «خطای زمان‌بندی» | `monitoring.ts` `alertPhaseError` (1/30 min) | admin | ⛔ |
| 19 | KV-budget HARD page | `cron-preflight.ts` (`kv_budget_alert_v1`, 1/12 h) | admin | ⛔ |
| 20 | Stale-run alert («ربات برای N دقیقه خاموش بود») | `cron-preflight.ts` (`stale_alert_at`, 1/12 h) | admin | ⛔ |
| 21 | Provider degradation alert («همه منابع ناتوانستند…») | `providers.ts` all-sources-empty path, cooldown `NOTIFICATION_COOLDOWN_HOURS=6` (`degradation_alert_at`) | **all registered chats** | ⛔ operational/internal (spec §2 excludes diagnostics); flagged for the owner in §12 |
| 22 | Notification-gap audit reports ×2 | `notify-audit.ts` (`audit_alert_v1`, `perchat_alert_v1`, 1/6 h each) | admin | ⛔ |
| 23 | User-cap warning | `users.ts` `checkUserCap` (15/20/25 thresholds) | admin | ⛔ |
| 24 | Admin join/leave pages, `/status`, `/members`, `/broadcast`, admin-panel ops sends | `admin-bot.ts`, `bot.ts`, `admin-ops.ts` (POST-gated) | admin | ⛔ |
| — | Bot-command replies (`/start /help /teams /follow /next /featured /tables /timezone /lang /stop`, callback queries, `editMessageText` menus) | `bot.ts` webhook | one user | ⛔ (spec §2 explicit) |
| — | Migration broadcast («این ربات منسوخ شده…») | `migration.ts` (owner-triggered `/api/migrate/start`, rounds every 3 d for 14 d, `mig_sent_v1:<round>:<chat>`) | all chats | ⛔ about the bot itself, owner-triggered |
| — | `/api/simulate` dry-run | `simulate.ts` — runs the REAL engine against `SIM_NOTIFIED_KEY`/`SIM_PREFS_KEY` clones | real chats, sim state | ⛔ by construction (and the channel hook must hard-no-op under `SIM_*`, §10) |

**Verified facts, not assumptions:** every row above was located in current source; the private command replies all attach reply keyboards (`replyKeyboard(lang)`) — keyboards a channel cannot use anyway.

---

## 3. Flow descriptions for the main routes (spec deliverable 2)

**Route A — per-match unit (the 7 engine types).** `runNotifyPhase` → `sendMatchNotifications(env, matches)`: prime UCL participants → `getRegisteredChats` (**0 chats → return**; nothing selected, nothing mirrored) → `getUserPrefs` → filter `shouldNotify` × horizon → cleanup/tidy → `getNotifiedMatches` → sort (kickoff urgency → big → comp priority → kickoff) → per match: `matchChats = chats.filter(userFollowsMatch)` (**no followers → `noChats++`, unit never selected**) → `groupChatsByTz` → per config: `sendNotificationIfNeeded` → (window ∨ backfill) → `shouldSendNotification` (dedupe read) → `fanoutReservation` (full/lean/**defer** — defer writes nothing, next tick or the kickoff-drain retries) → **`saveNotifiedMatch` (write-first; fail ⇒ no send)** → per group: compose → dice → card → per-chat text fallback → per-chat delivery ledger (D1 `notify_deliveries_v1`) → dead-chat prune. The tick hands deferred units to `chainKickoffDrain` → `POST /api/kickoff-drain` (own invocation, fresh subrequest budget) → `runKickoffDrain` **re-runs `sendNotificationIfNeeded` verbatim** (every gate + dedupe re-checked).

**Route B — big-match broadcasts.** `broadcastBigMatchKickoff/Results`: candidates → `getRegisteredChats` (**0 ⇒ return**) → per match: `shouldSendNotification(..., "-big")` → `saveNotifiedMatch(..., "-big")` (write-first) → per tz|lang group `sendTelegram` text → delivery ledger → prune.

**Route C — status-change alerts.** `detectStatusChanges`: build `cur` map over `shouldNotify` matches → compare to `prev` (`match_status_v1`) → persist map only when changed (fail ⇒ suppress alerts) → per alert × per lang bucket `sendTelegram`.

**Route D — digests.** Morning/UCL-preview/night: per tz bucket → gate (hour/window/valuable) → **per chat**: KV mark (write-first) → [UCL GIF] → `sendTelegram`. Weekly: window/continuation gate → payload snapshot (standings fetched once) → budget-checked bursts, cursor remove-before-send. Coronation: full sweeps → per league snapshot diff + FT trigger → per lang bucket sends.

**Route E — outbox drain (every tick, FIRST in the user phase).** `drainOutbox`: read `pending_sends_v1` → split due (backoff 1/2/5/15/30/60 min) vs keep → **persist the keep-list FIRST (write-first; fail ⇒ abort drain)** → per due item: [sticker first, cleared on success] → `sendTelegramDirect` → success=drained / dead=dropped / else re-queue (≤6 attempts, then drop).

---

## 4. Composers and send functions to REUSE (spec deliverable 3)

**Composers (all take `(match, env, lang)` and are pure of user state):** `specialBanner`, `formatBigMatchMessage`, `format24HourMessage`, `format3HourMessage`, `format1HourMessage`, `format5MinMessage`, `formatMatchStartMessage`, `formatResultMessage` (+ `appendTableOrPhase`, `standingsLine`) — `src/composers.ts`. Digest builders: `buildMorningDigestMessage`, `buildUclPreviewMessage` (+ `uclPreviewLine`), `buildLeagueTableMessage`, `buildWeekAheadMessage`, `formatTableTopMessage`. Status alerts: the inline bilingual composers in `notify-status.ts`. **The night digest's `buildNightDigestMessage` is the ONE composer with per-chat state baked in (prefs/chatId → followed-team sentences + rank)** — needs an additive channel variant (§7.5). Formatting discipline: MarkdownV2 via `md.ts` (`mdEscape/mdBold/mdItalic/mdCode`); the channel reuses it verbatim.

**Senders (`src/telegram.ts`):** `sendTelegram` (text + optional inline keyboard), `sendPhotoBinary` (match cards, caption ≤1024, MarkdownV2), `sendDice` (⚽ kickoff), `sendUclGifBanner` (file_id-cached GIF), `sendSticker` (league logos from KV `stickers_v1`), `outboxPush`/`drainOutbox`/`sendTelegramDirect`. **A channel destination is just another `chat_id`** — all of these already accept one. Reply keyboards (`replyKeyboard`, bot-ui.ts) are only ever attached in private webhook replies — never in the cron paths, so nothing to strip for the channel.

**Time/locale plumbing:** `getJalaliDate/getJalaliTime/getNowTehran/zonedYmDHm` (`utils.ts`) read `env.TEHRAN_TZ`; the channel variant clones env with `TEHRAN_TZ: "Asia/Tehran"` and `lang: "fa"` — the exact pattern the digests already use per group.

---

## 5. Dedupe + outbox behavior today, precisely (spec deliverable 4)

1. **Primary ledger = D1 `USERS_DB.notified_v1`** (`src/match-dedupe.ts`, since v13.94): PK `(match_key, ntype)`; `saveNotifiedMatch` = `INSERT OR IGNORE`; `changes>0` ⟺ newly persisted (proceed) — atomic claim, race-free across isolates/drains. `changes=0` or a D1 error ⇒ `false` ⇒ the caller defers (fail-closed). KV `notified_matches_v6` is the byte-identical fallback when `USERS_DB` is unbound (local dev / harness) or `SIM_NOTIFIED_KEY` is set. `matchKey = normHome|normAway|utcDate[:16]`.
2. **Never-re-arm:** once a `(match_key, ntype)` row exists it never re-fires (expiry is hygiene only; D1 rows pruned 14 days past `expires_at`, probabilistically 2 %).
3. **Status alerts** dedupe on the `match_status_v1` map (fail-closed), **coronation** on `table_top_v1:<code>` snapshots (fail-closed), **digests** on per-chat `digest_sent_/uclnight_/nightdigest_<dateKey>_<chatId>` marks (mark-before-send), **weekly** on cursor + week marker, **migration** on per-round marks — all the same write-first law.
4. **Outbox** = KV `pending_sends_v1` (cap `KV_OUTBOX_MAX=200`, 7-day TTL, serialized pushes): entries `{text, chatId, keyboard?, sticker?, ts, attempts}`. Drain at every tick start, write-first keep-list, backoffs 1→60 min, **6 attempts then drop**, dead chats dropped. Text-path failures only (429 pause outliving 8 s, subrequest wall, 3 retries exhausted, transient 5xx/network). Non-dead 4xx (e.g. MarkdownV2 parse errors) never outbox — a permanent channel misconfiguration returning 400/403 would ride 6 outbox attempts then drop (§10 risk R6).
5. **Residual exactly-once window (documented, unchanged since v13.9):** a network timeout *after* Telegram accepted a send can leave the sender believing it failed → outbox retry → a duplicate is *possible* in that narrow window. The repo's standing trade-off is never-spam-first; the channel inherits it (§7.6).

---

## 6. Mirror / exclude decisions (spec deliverable 5)

| Family | Decision | Reason |
|---|---|---|
| 7 engine types (#1–7) | ✅ | generic public match content; occurrence = the (match, type) unit that fired |
| match-start-big / result-big (#8–9) | ✅ **collapsed to one kickoff/result post per match** (§7.3) | same logical stage, two delivery paths (followers + all/non-followers); spec: "at most one corresponding channel post for that logical notification occurrence" |
| Postponed/Cancelled/HT (#10–11) | ✅ | public match events; one post per (match, status transition) |
| Morning digest (#12) | ✅ | public; channel edition = Tehran-date 09:00; same content gate (≥1 master big match) |
| UCL night preview (#13) | ✅ | public; channel edition = Tehran-date, window unchanged; fixture list in plain kickoff order (drop the per-chat followed-teams ordering — the channel has no follows) |
| Night results digest (#14) | ✅ **channel variant** | public, but the private message is per-chat (followed-team sentences + rank). Channel variant = the same results list + elimination events, **without** per-team verdict sentences; valuable-night gate = UCL night ∨ elimination (drop the desired-teams leg) |
| Weekly tables + week-ahead (#15) | ✅ | public; channel burst reuses the fa payload snapshot; budget-reserved (§7.7) |
| Coronation (#16) | ✅ | public league headline |
| Degradation alert (#21) | ⛔ | operational/diagnostic, not football information (spec §2). *Owner may override — listed in §12* |
| Heartbeats, admin pages, audits, cap, migration, command replies, admin-ops, simulate | ⛔ | private / admin / operational (spec §2 exhaustive list) |

**Consequence to state explicitly (not a defect, a boundary):** because the private engine is follower-driven, *which* matches produce channel posts depends on the current subscriber base (a match nobody follows produces no reminders today, hence no channel post), and with **zero registered subscribers the tick stops before the notify phase entirely** ("No users, skipping") — the channel would be silent too. This matches the spec's "Zero recipients because the existing event is not selected → no invented channel-only notification". Broadening eligibility (e.g., mirror every `shouldNotify` match regardless of followers) is explicitly out of scope for this phase; noted in §12 for a future owner decision.

---

## 7. Recommended architecture (spec deliverables 6–7)

### 7.1 Destination configuration — Wrangler `[vars]`, disabled by default

```toml
# wrangler.toml [vars] (NOT secrets — a public channel id/URL is not a credential)
TELEGRAM_CHANNEL_CHAT_ID  = ""   # absent/empty ⇒ channel delivery OFF, zero behavior change
TELEGRAM_CHANNEL_PUBLIC_URL = "" # e.g. https://t.me/sportsignal_fa — unset ⇒ no channel CTA anywhere
```

`src/types.ts` gains optional `TELEGRAM_CHANNEL_CHAT_ID?`/`TELEGRAM_CHANNEL_PUBLIC_URL?` (the `TEHRAN_TZ` `[vars]` precedent). Destination model in the new module:

```ts
// src/channel-mirror.ts (proposed) — one active destination, extensible shape
{ key: "fa-football", chatId, publicUrl, locale: "fa", sport: "football", enabled }
```

`channelDestinations(env)` returns `[]` unless the chat id parses — every hook is then a no-op **before any KV/D1/subrequest is spent**. The numeric id (`-100…`) is preferred (stable); a `@username` is accepted by Telegram's `sendMessage` and is an acceptable interim value.

### 7.2 Event identity + the claim ledger — NEW D1 table (write-first, destination-scoped)

```sql
-- db/users-schema.sql (additive; applied with the repo's d1 procedure)
CREATE TABLE IF NOT EXISTS channel_posts_v1 (
  dest_key   TEXT NOT NULL,        -- "fa-football"
  event_key  TEXT NOT NULL,        -- see the identity table below
  claimed_at INTEGER NOT NULL,
  sent_at    INTEGER,              -- null = claimed/pending
  state      TEXT NOT NULL,        -- 'claimed' | 'sent' | 'failed' | 'unreachable'
  attempts   INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,                 -- sanitized CLASS only, never payload/token
  PRIMARY KEY (dest_key, event_key)
);
```

Why D1 and not KV: the v13.94 precedent — the anti-spam claim is the one write that must never be quota-starved; D1's separate 100k/day tier + atomic `INSERT OR IGNORE` give exactly the write-first, fail-closed, race-free claim the private path already enjoys. KV writes remain untouched except transient outbox pushes. `claimChannelEvent()` returns `false` on an existing row **or a D1 failure** — no claim, no send (fail-closed, same law as `saveNotifiedMatch`).

**Channel event identity (the spec's composite, derived from actual semantics):**

| Family | `event_key` | Edition component |
|---|---|---|
| 7 engine types | `match:<matchKey>:<type>` | none — never-re-arm, stages distinct by type |
| match-start-big / result-big | `match:<matchKey>:match-start` / `match:<matchKey>:result` | **base-stage collapse** (§7.3) |
| Postponed / Cancelled / HT | `match:<matchKey>:postponed` / `:cancelled` / `:ht` | the transition itself |
| Morning digest | `digest:morning:<tehran-dateKey>` | Tehran calendar date |
| UCL preview | `digest:uclnight:<tehran-dateKey>` | Tehran calendar date |
| Night digest | `digest:night:<tehran-dateKey>` | Tehran calendar date |
| Weekly tables | `digest:weekly:<isoWeekKey>` | ISO week (the private marker's own key) |
| Coronation | `coronation:<code>:<triggerMatchKey>` | the trigger fixture |

Never only `matchKey` (would suppress later stages); never raw message text (formatting changes would re-fire). Restart/isolate-proof by construction (D1, not memory). The private `notified_v1` contract is **untouched** — the two ledgers are disjoint by table and by key shape, so a channel claim can never suppress a private send or vice-versa.

### 7.3 The stage-collapse decision (kickoff/result, one post per stage)

Today a follower of a master big match receives **two** kickoff texts (#6 then #8 — verified: the broadcast sends to ALL chats, and the audit's equivalence group `match-start|match-start-big` exists precisely because both fire). For the channel, #6 and #8 are **one logical occurrence** (the kickoff of match X), so they share the claim key `match:<matchKey>:match-start`: whichever path fires first claims and posts; the second path's hook finds the claim and no-ops. Same for `result`/`result-big`. Different stages (72 h → 24 h → 3 h → 1 h → 5 min → kickoff → HT → result) remain separate posts, exactly as in the bot. If the owner later wants the channel to mirror *every* physical send rather than every logical occurrence, that is a one-line identity change (drop the collapse) — documented, reversible, not default.

### 7.4 Integration points — one hook call per logical event, never per recipient

Every hook is a **single call at the event boundary, after the private write-first gate succeeded, outside any per-recipient loop**; each composes the Persian variant, claims, sends, records state:

1. `sendNotificationIfNeeded` — immediately after `saveNotifiedMatch` persisted (claim) and again after the group loop (send + state update). Claim-before-private-fan-out means a CPU-kill mid-fan-out leaves a detectable *pending* claim (§7.6) rather than a silent loss. The kickoff-drain chain re-runs this function verbatim → deferred units carry their channel copy automatically, idempotently.
2. `broadcastBigMatchKickoff` / `broadcastBigMatchResults` — same pattern after their `saveNotifiedMatch(..., "-big")`; the collapse makes the second claim of a stage a clean no-op.
3. `detectStatusChanges` — per alert, after `statusMapSaved` (the alerts' own fail-closed gate).
4. `maybeSendMorningDigest` / `maybeSendUclNightPreview` / `maybeSendNightDigest` — once per Tehran edition, before/parallel to the per-chat loop (NOT per chat: the per-chat marks stay private).
5. `maybeNotifyTableToppers` — per coronation event, after the snapshot gate.
6. `maybeSendWeeklyTables` — a channel burst on the start tick (and continuation ticks while the cursor is live), reusing the fa payload group, budget-reserved (§7.7).

The channel hook **must hard-no-op under `env.SIM_NOTIFIED_KEY`** (the simulate harness must never post to the real channel) and when `channelDestinations(env)` is empty. It must never be called from `bot.ts`/`admin-bot.ts`/`admin-ops.ts` paths.

### 7.5 The Persian channel variant — deterministic, subscriber-order-independent

Compose with `channelEnv = { ...env, TEHRAN_TZ: "Asia/Tehran" }` and `lang = "fa"` through the **existing** formatters (§4) — never copy a rendered per-subscriber message. This is the exact discipline the digests already use per (tz, lang) group; the channel is simply one more (Asia/Tehran, fa) group that always exists. Timezone decision: **Asia/Tehran** — the established public-facing convention (`TEHRAN_TZ` var, the site's fa rendering, the weekly window, the default user tz). Private messages keep their per-user tz/lang untouched. The night digest needs the additive channel variant of `buildNightDigestMessage` (§6) — private output must remain byte-identical (parity test). The UCL preview line order for the channel = plain kickoff order (no `uclPreviewOrder` priority pass). **Trial footer:** `withTrialFooter` rides the sender layer, so channel posts carry «نسخه آزمایشی.» too — kept for voice consistency (owner may retire it globally later; suppressing it only for the channel would fork the sender — not recommended).

### 7.6 Failure policy — at-most-once bias, outbox reuse, pause on permanent errors

- **Claim → send → record.** Transient failure (429-outlasting-pause, subrequest wall, 5xx, network) ⇒ `outboxPush(env, text, channelChatId, null, sticker?)` with a **new optional `dest` field** on the entry (the v13.125 `sticker` additive-field precedent — old entries drain unchanged) so channel retries are distinguishable; the drain updates the claim row's state. Card failures fall back to text exactly like the per-chat private path; a failed text outboxes.
- **Ambiguity:** the residual timeout-after-accept window (§5.5) is inherited, not widened. A claim stuck `claimed` with no outbox entry and no `sent_at` past a grace window is **not** blindly re-sent (at-most-once bias, the owner's stated priority); it is surfaced by the stuck-claim reconciliation (Session 3: count + admin report + optional write-first repair exactly like `repairPerChatGaps`).
- **Permanent channel errors** (400 `chat not found`, 403 `need administrator rights`, `bot is not a member`): the dead-chat regex would classify `chat not found` as `"dead"` (silent drop) — the channel layer must instead classify, mark the claim `unreachable`, set the pause marker (KV `channel_mirror_v1`, written **only on state transitions**), and page the admin rate-limited. While paused, hooks skip sending (claims may still be recorded or skipped wholesale — Session 1 decision: record nothing, keep the failure class visible via the marker). Un-pause on config change detection or owner action.
- **Isolation:** every hook is wrapped so a channel failure can never throw into the private path (the digest/broadcast `try/catch` discipline), and channel sends are budget-accounted (§7.7) so they cannot starve private sends.

### 7.7 Budget integration (spec §12 constraints)

- `fanoutFetchCost` gains `+2` per unit when the channel is enabled (1 send + 1 fallback/outbox margin) — the reservation then defers the *whole* unit (private + channel together) before any dedupe write, preserving the v13.94 clean-deferral semantics. Deferral cost: a unit may land one tick later; already true under budget pressure today.
- Digest hooks respect their existing wall guards (`subrequestCount() < 40/42` precedents); the weekly channel burst rides its own reservation against `WEEKLY_FANOUT_CAP` and defers to continuation ticks like the private cursor does.
- **No new cron triggers, no extra provider fetches, no additional polling.** The channel composes from data already in the invocation (the engine's match object / the digest's already-built payload / the cached card PNG — `renderCardPngCached` is per-(match,lang) memoized, so the channel's fa card reuses the fa group's render with zero extra CPU).
- Telemetry rides the completion blob (`notify.ch = {sent, deferred, skipped, paused}` — compact-key convention; the blob is already the tick's last write → **zero extra KV writes for observability**). Detailed health (claim depth, oldest pending, last error class, last sent age) is **admin-only** (the `/status` card + `/api/audit`), sanitized — no chat id, no bodies, no tokens. **Public `/healthz` is unchanged** (a broken channel must not 503 the bot).

### 7.8 Validation + activation (Session 4, owner-gated)

Non-posting checks: `getChat(chat_id)` (bot can see the channel) + `getChatMember(chat_id, bot_id)` → role `administrator` with post permission — both non-posting, run once per version behind a KV flag (the `ensureBotMenu` pattern) or on-demand from the admin surface. First live post = the first naturally-occurring eligible event (no test post to the public channel without explicit owner approval, per the spec).

---

## 8. Estimated incremental resource cost (spec deliverable 8)

All numbers are per 10-minute tick, channel **enabled**, derived from the code paths above:

| Scenario | Channel events | D1 writes (claims+state) | KV writes | KV reads | Extra fetches (subrequests) |
|---|---|---|---|---|---|
| Quiet tick (nothing in window) | 0 | 0 | 0 | 0 | 0 |
| Normal tick, 1 reminder fires | 1 | 2 (claim + sent) | 0 | 0–1 (pause marker, isolate-memoized) | 1–2 (send ± fallback) |
| Match-night tick (2 simultaneous kickoffs + 1 result + HT) | ~4 | ~8 | 0 | 0–1 | ~5–9 |
| UCL night (preview + 3 kickoffs + HT + 3 results + night digest) | ~9 | ~18 | 0–2 (GIF caption path reuses `ucl_gif_fileid_v1` — already cached) | 0–1 | ~10–14 (cards+dice+text; reservation-accounted) |
| Weekly Monday burst | 1 edition (~15 sends) | ~2 + per-pair state | 0–2 (outbox only on transient failure) | 1 (stickers memo) | ~15 (7 stickers + 7 tables + week-ahead) |
| Any tick, channel **disabled** (vars absent) | — | 0 | 0 | 0 | 0 (hooks no-op before any op) |

Daily steady state (typical): **+0 KV writes** (claims are D1; KV only sees outbox pushes on transient Telegram failures and one-time pause-marker transitions) and a handful of D1 writes/day — negligible against both the KV 1,000/day discipline and D1's 100k/day tier. The meter/governor need **no threshold changes**; the completion blob's `kv_writes_day` definition is untouched (D1 writes were never KV-metered — the `notified_v1` precedent).

---

## 9. Risks, migration/versioning, backward compatibility (spec deliverable 9)

| # | Risk / concern | Severity | Mitigation (design) |
|---|---|---|---|
| R1 | KV quota — README/RUNBOOK describe a KV ledger, but the real ledger is D1; a channel design keyed on KV would re-introduce the v13.94 quota-death class | high if ignored | §7.2 D1 claim table; KV writes only on transient-failure outbox pushes |
| R2 | Subrequest ceiling — heavy UCL nights already brush the 46–48 fetch cap | medium | reservation accounting (§7.7): channel cost inside `fanoutFetchCost`; digest wall guards; clean deferrals |
| R3 | Stage collapse (§7.3) suppresses a *second* physical post a purist might expect | low | spec's own "at most one per logical occurrence"; reversible one-line identity change |
| R4 | Night-digest channel variant touches a composer with per-chat state | medium | additive variant + byte-identical private parity test (the `check-admin-parity` precedent) |
| R5 | Weekly channel burst (~15 sends) on the Monday window | medium | burst reservation vs `WEEKLY_FANOUT_CAP`; continuation across ticks; text-only lean fallback |
| R6 | Misconfigured channel (wrong id / lost admin) → dead-chat regex silently drops ("dead") or 6 doomed outbox retries | medium | §7.6 permanent-error classification + pause marker + rate-limited admin page; bounded attempts |
| R7 | Ambiguous timeout-after-accept duplicate | low (pre-existing) | inherited window, at-most-once bias on stuck claims, documented (never claimed "solved") |
| R8 | Concurrent tick + kickoff-drain both run a unit's hook | low | D1 `INSERT OR IGNORE` claim = atomic; the drain re-runs gates verbatim |
| R9 | The follower-gate consequence (§6): channel content tracks the current subscriber base; zero subscribers ⇒ silent channel | info | documented boundary; any broadening is an owner decision (out of scope) |
| R10 | Deployed-disabled vs live-verified conflation | process | Session reports must state CHANNEL STATE explicitly (the spec's end-of-session template already has the field) |

**Migration/versioning decisions:** all new state is additive (D1 table via `CREATE TABLE IF NOT EXISTS` appended to `db/users-schema.sql` + applied with the repo's `wrangler d1 execute` step; one optional KV key `channel_mirror_v1`; one optional outbox field `dest`). **No existing KV key is renamed, repurposed, or written differently.** Rollback: remove the two `[vars]` (or `npx wrangler rollback`) → old code ignores the table and field entirely; KV schema additive ⇒ rollback-safe by the RUNBOOK §4 doctrine. Version discipline per RUNBOOK §1 (config `VERSION` ↔ package.json ↔ CHANGELOG, `check-version-sync`).

**Test-harness changes required (spec deliverable 9, continued):** new module must be added to `scripts/lib/worker-src.js`'s concat order **in the same commit** (after its deps `config/telegram/composers/users/match-dedupe`, before its importers `notify-engine/digest-*/cron-notify`) — the harness silently skips missing files (`#seams` exists for exactly this); new `scripts/check-channel-mirror.js` added to the `npm test` chain in `package.json`; `src/worker.ts`'s module-map header comment updated (it is the "always-current condensed ARCHITECTURE.md").

---

## 10. Required test coverage (spec §14, mapped to the design)

New suite `scripts/check-channel-mirror.js` (+ targeted extensions to existing suites), all offline/deterministic, no real channel posts:

- **Eligibility/privacy:** every ✅ family in §2 produces a channel event; every ⛔ family does not (command replies, admin pages, heartbeats, migration, simulate, degradation); no chat ids/usernames/team-follow lists ever appear in a channel payload; `SIM_NOTIFIED_KEY` set ⇒ channel hook no-ops.
- **One-post:** 1 vs 1,000 subscribers → one post per event; zero recipients (no followers / no subscribers) → no invented post; repeated ticks/restarts → no duplicate (D1 claim persists); engine+`-big` collapse → exactly one kickoff/result post; distinct stages → separate posts; digest editions repeat only on a new dateKey/week.
- **Persian determinism:** channel output identical regardless of subscriber iteration order/languages/timezones (compose via channelEnv+fa, never copy); private messages byte-identical when the channel is unconfigured (the disabled-state parity check).
- **Transport/failures:** 429+retry_after honored (sender semantics reused); transient 5xx → outbox entry with `dest`; permanent 400/403 → `unreachable` + pause + admin page (rate-limited); paused channel skips sends without touching private sends; drain handles old (no-`dest`) and new entries; stuck `claimed` rows are reported, never blindly re-sent.
- **Resources:** no new cron triggers (assert `wrangler.toml [triggers]` unchanged); no provider fetch added (assert the channel module imports no provider); reservation includes the channel cost; blob counters ride `notify.ch`.
- **Regression:** the full existing suite (2,614 checks) stays green; version-sync three-way; `#seams` asserts the new module is in the harness order.

---

## 11. Session-by-session plan (spec deliverable 10, refined)

Refinement of the spec's PART VI against the actual code — same session boundaries, now concrete:

- **Session 1 — foundation (runtime code, disabled by default).** `src/channel-mirror.ts` v1: `channelDestinations`, `claimChannelEvent`, state recording, pause marker, SIM no-op; `types.ts` + `wrangler.toml [vars]` (+ `wrangler.dev.toml` note); `db/users-schema.sql` additive table + apply procedure documented in RUNBOOK; harness order + `check-channel-mirror.js` v1 (disabled-state: missing vars ⇒ zero code-path change, claim idempotency, failure classification units); version bump + CHANGELOG. No hooks yet — **zero behavioral surface** until Session 2. *Acceptance:* npm test green (existing 2,614 + new); deploy disabled; healthz unchanged.
- **Session 2 — mirror every eligible family.** Hooks 1–6 (§7.4) incl. the stage collapse; channel footer (site + bot links) on channel posts; channel CTA added to the private promo footer only when `TELEGRAM_CHANNEL_PUBLIC_URL` is set (shared helper, byte-identical when unset); night-digest channel variant + parity test; UCL preview plain order; weekly channel burst. *Acceptance:* §10 eligibility + one-post + Persian-determinism suites; private output unchanged (unconfigured AND configured runs).
- **Session 3 — reliability + observability hardening.** Outbox `dest` field + drain update; stuck-claim reconciliation; pause classification end-to-end with failure injection; admin `/status` channel section + `/api/audit` extension; `notify.ch` breadcrumb; RUNBOOK (§ channel ops: setup, validation, pause/unpause, rollback), ARCHITECTURE + worker.ts map, ADR if warranted; budget re-measure (quiet/normal/match-heavy fixtures). *Acceptance:* §10 transport/resource suites; full regression; deploy.
- **Session 4 — activation (owner-gated).** Owner creates the public channel, adds the bot as admin (post permission), supplies chat id + URL via `wrangler` vars/secret per the chosen mechanism; agent validates with `getChat`/`getChatMember`, confirms outbox clear, enables, then verifies the first naturally-occurring event end-to-end (log line + claim row + the channel post itself owner-confirmed). *Acceptance:* the spec's Definition of Done items 12–14 with the three states (code-complete / deployed-disabled / live-verified) explicitly separated.

---

## 12. Unresolved questions / owner decisions (spec §6 closing rule)

1. **Channel identity (Session 4):** public username/link, numeric chat id, and confirmation the bot is admin with post rights — owner-controlled; never guessed.
2. **Degradation alert (#21):** excluded as operational. Confirm, or tell us to mirror it (it is the only all-subscriber message not mirrored).
3. **Cosmetic fidelity:** keep the ⚽ dice, match-card images, league stickers, and the UCL GIF in the channel? Design default: **keep** (spec §4: preserve media "when the source notification uses them"); text-only is a config simplification if preferred.
4. **Trial footer** «نسخه آزمایشی.» rides the sender layer and would appear on channel posts. Default: keep (consistency). Retiring it is a separate global product decision.
5. **(Carried from S15, unrelated to this feature):** the KV plan question — which plan is the account actually on (the assumed 1k-write/100k-read walls were never enforced in the analytics). Not blocking any session above.

---

## 13. Facts vs assumptions (audit honesty)

**Verified facts:** everything in §1–§5 and the inventory table — traced in current source at `main`@`2513ca0` (file + function named per row); the D1-notified ledger, the transport semantics, the outbox contract, the windows, the follower gates, the "no users → tick ends" early return, the two-kickoff-messages-for-followers behavior, the per-chat night-digest personalization, `npm test` = 2,614/EXIT 0.

**Assumptions/recommendations (clearly labeled):** §7 in full is design (the spec asked for a recommended architecture, not an implemented one) — the D1 claim table, the `[vars]` names, the stage collapse, the `dest` outbox field, the pause marker, and the per-hook placement are engineering recommendations grounded in the verified facts and repo precedents (`v13.94`, `v13.102`, `v13.117`, `v13.125`), to be realized in Sessions 1–3. §8's numbers are derived from those code paths but are *estimates* until Session 3's measured fixtures. The live bot username (`@SportSignalAlertsBot`) is documented in the repo and matches the owner's brief; the spec still requires live verification (Session 4, `getMe`).
