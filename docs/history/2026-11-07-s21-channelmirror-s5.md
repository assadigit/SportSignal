# 2026-11-07 — Session 21: Channel Mirror ACTIVATION (the owner gate opened; the destination went live)

Wall-clock note (the repo's convention): this session ran 2026-11-07 Tehran
late afternoon into night (the sandbox clock — 2026-11-07T12:2x–…Z — runs
behind the Tehran wall-clock convention the history notes use). Per the
S20 hand-off, S21 executes the ACTIVATION half of
**`TELEGRAM_CHANNEL_MIRROR_SPEC.md` PART VI Session 4** with **PART V §15**
(the three-state honesty rule) and **DISCOVERY §7.8** (the non-posting
validation design). The S20 readiness half had closed owner-gated (channel
not yet created); this session arrived WITH the owner's values.

## 1) Boot gates (all green)

- Working tree at `main`@`8274766` (the S20 close), clean at start;
  `git fetch` (one-shot token URL): origin `main` == `8274766` — no
  owner push in between, no concurrent-session race (the S18b/S19b
  fetch-first discipline held at every later gate too).
- Read in full, in this order: `TELEGRAM_CHANNEL_MIRROR_SPEC.md` (PART VI
  Session 4 + PART V §15 + PART VIII), `DISCOVERY.md` (§7.8, §7.6, §10),
  `AGENTS.md` + `RUNBOOK.md` (§1, §2 incl. the fetch-before-DEPLOY line,
  §3, §8, §8b, §11, §13), the program history notes (S17, S18, S18b,
  S18c, S19, S19b, S20 — the S20 §6 prompt IS this session's instruction
  sheet), then the consuming seams in source: `src/channel-mirror.ts`
  (channelDestinations / the claim ledger / the pause marker),
  `src/telegram.ts` (the chan ctx / outbox dest / drain branch),
  `wrangler.toml [vars]`, `OWNER_TODO.md`.
- Read-only identity checks with the session-supplied bot token (never
  committed, never logged in full): `getMe` → bot id `8988731008`,
  username `@SportSignalAlertsBot` (matches `CONFIG.CHANNEL_BOT_URL` and
  the S20 record); `getWebhookInfo` →
  `https://football.sportsignal.ir/webhook`, 0 pending updates, no last
  error — the private pipeline healthy before anything was touched.

## 2) The owner gate — OPENED (the four S20 asks, answered by values)

The owner supplied, in one message: **"I made the bot admin"** + the
public link **`t.me/sportsignalz`** (plus the session credentials —
Cloudflare API token/account id, the one-shot GitHub token; the
football-data token unchanged in the existing secret). The gate's four
S20 items: (1) public channel created ✓, (2) public username chosen ✓,
(3) bot administrator with post permission ✓ (owner statement, then
verified below), (4) link supplied ✓ (the numeric id was NOT supplied —
resolved non-postingly per the S20 prediction).

## 3) The non-posting validation battery (DISCOVERY §7.8 — all green, zero posts)

| Check | Result |
|---|---|
| `getMe` | ok, bot id `8988731008`, `@SportSignalAlertsBot` — the documented identity |
| `getChat(@sportsignalz)` | ok, `result.type == "channel"`, **numeric id `-1003654328600`** (the stable preferred `-100…` form), username `SportSignalz`, Persian football title «اسپرت سیگنال \| فوتبال‌های مهم پیش رو», description links sportsignal.ir |
| `getChatMember(-1003654328600, 8988731008)` | ok, **`status: "administrator"` + `can_post_messages: true`** (also edit/delete/invite) — the RUNBOOK §13.1 post-permission requirement met |
| Public preview `t.me/s/SportSignalz` | HTTP 200, the channel title, only the 3 service messages (created/photo/name) — a fresh channel, zero posts (nothing to collide with; no test post sent per the spec) |

No posting check touched the channel's message flow. The predicted
failure classes (RUNBOOK §13.4: chat-not-found / need-administrator-rights
/ bot-not-a-member) did not fire.

## 4) The activation release (v13.233-channelactivate — CONFIG, not code)

The runtime code is EXACTLY the shipped v13.232-channelhardening — zero
`src/` behavioral diff. The release is the destination configuration plus
the version/harness discipline every config-visible change requires:

- **`wrangler.toml [vars]`**: `TELEGRAM_CHANNEL_CHAT_ID = "-1003654328600"`,
  `TELEGRAM_CHANNEL_PUBLIC_URL = "https://t.me/SportSignalz"` — PUBLIC
  values, not secrets (spec PART IV §9 / DISCOVERY §7.1), with the
  activation provenance in the comment. Rollback to disabled: empty both
  vars + redeploy (RUNBOOK §13.6).
- **Version three-way**: `src/config.ts` VERSION
  `13.233-channelactivate` ↔ `package.json` `13.233.0.0` (lock refreshed
  via npm install — the check-version-sync gate) ↔ the new CHANGELOG
  head entry.
- **Harness co-evolution (the same-commit rule)**: `check-stats` demotes
  the v13.232 LIVE pin to HISTORICAL and adds the **v13.233 LIVE
  activation pin** (the three-way + the SET vars + SW v119 + the two
  cron triggers unchanged + the CHANGELOG head);
  `check-channel-mirror`'s k-section "[vars] still EMPTY" check flips to
  assert the ACTIVATED destination values (malformed values still fail
  closed in `channelDestinations` — the pinned unit tests stand).
- SW CACHE stays `sportsignal-v119` — no client-referenced asset changed.

**The gate battery:** `npm test` — **EXIT 0, 2,889 OK / 0 FAIL** (the
canonical 2,888 + 1 new v13.233 activation pin); `check-channel-mirror`
standalone 270/270; `tsc --noEmit` clean; BOTH local smokes green —
unconfigured (`wrangler.dev.toml`, empty vars: routes 200/404 as
documented, healthz real JSON `version 13.233-channelactivate`, ok:false
locally = the documented no-local-cron state, zero channel runtime
lines) AND **configured with the REAL id** (`--var
TELEGRAM_CHANNEL_CHAT_ID:-1003654328600 --var
TELEGRAM_CHANNEL_PUBLIC_URL:https://t.me/SportSignalz`: routes still
real, healthz sane, **ZERO `api.telegram.org` fetches without an
eligible event** — the disabled-contract proof WITH a live destination).

## 5) The deployment + post-deploy verification (RUNBOOK §2/§3)

`git fetch` immediately before `npx wrangler deploy` (remote unmoved);
deploy → **Version ID `dbc10b80-2bbe-4476-920a-41f016c0b0c6`**, both
channel vars live in the deploy banner, both cron triggers intact
(`*/10 * * * *` + `27 */4 * * *`), bindings unchanged.

| Check | Result |
|---|---|
| `GET /healthz` (immediately + after ticks) | `version 13.233-channelactivate`, `ok:true`, outbox 0, `degraded:false`, `sched_mode LIVE` |
| Deployed vars (Workers settings API) | `TELEGRAM_CHANNEL_CHAT_ID = -1003654328600`, `TELEGRAM_CHANNEL_PUBLIC_URL = https://t.me/SportSignalz` — deployed-ENABLED, exactly as intended |
| First ticks under the activated config | the **13:00Z + 13:10Z ticks**: `notify.ch` flipped **from `null` to `{s:0,d:0,k:0,p:0}`** — the configured-and-active contract, quiet (no eligible event yet); private pipeline green (`f:2` in-window, per-chat audit "all 49 worthy matches complete") |
| Tailed tick (the 13:10Z, captured live) | "Execution completed at 13:10:22.097Z", KV writes this tick **2** (`execution_lock` + `cron_status_v1` — the documented quiet classes), subrequests 0/48 used by the notify phase, **zero channel/mirror log lines**, zero exceptions |
| D1 `channel_posts_v1` (remote) | 0 rows at activation — the ledger clean before the first event |
| Site + webhook | `/` 200, `/matches` 200, bare webhook GET → 403 (alive and rejecting) |

## 6) The first naturally-occurring event (the spec's activation proof — VERIFIED end-to-end)

**No test post was ever sent** (the spec's rule + the owner's S20 choice
"wait for the natural event"). The pool at activation time held two
worthy in-window matches (Man Utd–Aston Villa, kickoff 2026-11-08T16:30Z;
Atlético–Barcelona, kickoff 2026-11-08T20:00Z — the S20-predicted
candidate) — the Villa side qualifies via the current-UCL-participant
rule, Atléti–Barça as a big-vs-big; nothing else tonight reaches the
strict `shouldNotify` tier (Forest–City: Forest not desired + not a UCL
participant; Valencia–Real: Valencia outside the PD desired list;
BL1 has no desired teams at all).

**The event: Man Utd–Aston Villa `pre-match-24h`, window opening
2026-11-07T16:30Z.** The tailed 16:30Z tick found the unit in window,
but the fan-out reservation deferred it (budget 28 used) and chained the
kickoff drain: *"Chaining the kickoff drain for 1 deferred unit(s):
manchesterunited|astonvilla|2026-11-08T16:30:pre-match-24h"* — the
v13.117 deferral discipline, unchanged by the activation. The drain
invocation (~16:30:29Z, a fresh subrequest budget through DRAIN_SELF)
then ran the unit verbatim — the private fan-out AND the channel copy
(the S18 wiring: deferred units carry their channel copy automatically):

| Evidence | Result |
|---|---|
| The drain invocation's log (tailed live) | "📤 Sent PRE-MATCH-24H notification for match 560639" + "Kickoff drain (depth 0): processed 1, sent 1, missing 0, still-deferred 0" — the private delivery green; **zero channel-mirror warn lines** (the success path is silent by design — the ledger IS the record) |
| **D1 `channel_posts_v1` row #1** | `dest_key: "fa-football"`, `event_key: "match:manchesterunited\|astonvilla\|2026-11-08T16:30:pre-match-24h"`, **`state: "sent"`**, `sent_at` = 2026-11-07T16:30:29Z, `attempts: 1`, `last_error: null` |
| **The channel post itself** (the public preview page `t.me/s/SportSignalz`, the agent-side sight check) | «📅 یکشنبه ۱۷ آبان ۱۴۰۵ ⏰ ۲۰:۰۰ منچستریونایتد 🆚 استون ویلا لیگ برتر انگلیس — مشاهده جدول لیگ‌ها و مهمترین بازی‌های پیش رو: https://sportsignal.ir 🤖 ربات: https://t.me/SportSignalAlertsBot نسخه آزمایشی.» — Persian, Asia/Tehran date/time, the required site+bot footer, the trial footer (the documented DISCOVERY §12.4 default) |
| The completion blob | `notify.ch` flipped `null` → `{s:0,d:0,k:0,p:0}` at the 13:00Z activation tick (the configured contract). This first event's counters accumulated inside the DRAIN invocation (kickoff-drain.ts never writes the completion blob — by construction the blob reflects the main tick), so its s:1 lives in the claim row + the visible post; the next channel event firing inside a main tick (e.g. Atléti–Barça 24h at ~20:00Z tonight) will carry `{s:1,…}` in the blob. Documented, not a defect |
| The pause marker `channel_mirror_v1` | ABSENT (KV 404) — never paused, zero permanent classes, zero admin pages |
| The post-event ticks | the 16:40Z tick completed normally (healthz `ok:true`, outbox 0, `last_cron_age_min` 3, ch quiet — the claim suppresses re-fires exactly as designed); the private pipeline green throughout (outbox 0, the per-chat audit line, the webhook 403-to-GET posture, the site 200) |

The owner-visible proof: **the post is live on
`https://t.me/SportSignalz`** — the channel's first content post after
the three service messages.

## 7) End-of-session report (spec PART VII §17)

```text
SESSION: 4 + 21 — Channel Mirror ACTIVATION (the S20 hand-off executed; the program's final gate)
STATUS: complete — the activation verified end-to-end on the first naturally-occurring event
SCOPE COMPLETED:
- The mandatory reading battery + the boot gates (fetch, clean tree, bot identity, webhook health)
- The owner gate OPENED: the public Persian football channel @SportSignalz + the bot-admin statement + the link (the numeric id resolved non-postingly)
- The DISCOVERY §7.8 non-posting validation battery: getChat → type "channel" + id -1003654328600; getChatMember → administrator + can_post_messages true; the public preview page 200 — all green, zero posts
- The activation release v13.233-channelactivate (CONFIG, not code): both [vars] set in wrangler.toml (public values, not secrets), the version three-way, the harness pins co-evolved (check-stats v13.233 LIVE pin + the v13.232 demotion; check-channel-mirror k-section flip)
- The full gate battery: npm test 2,889 EXIT 0; check-channel-mirror 270/270; tsc clean; both local smokes (unconfigured + the REAL id — zero telegram fetches without an eligible event)
- The deploy (fetch-first): dbc10b80, both vars live, both cron triggers intact; healthz ok:true at 13.233-channelactivate
- ≥2 full ticks observed under the activated config (20+ ticks 13:00Z–16:40Z via the blob; the 13:10Z quiet tick AND the 16:30Z event tick tailed live) — ch flipped null → {s:0,…} at 13:00Z (the configured contract)
- THE FIRST NATURALLY-OCCURRING EVENT VERIFIED END-TO-END: Man Utd–Aston Villa pre-match-24h at 16:30:29Z — the tick deferral + kickoff-drain chain (tailed), the D1 claim row state 'sent', the Persian post live on t.me/s/SportSignalz (owner-visible), zero failure/pause lines, the private delivery green in the same drain
- The three-state verdict recorded (§8) + the S22 hand-off (monitor-only)
FILES CHANGED:
- wrangler.toml (the two [vars] + the activation provenance comment)
- src/config.ts (VERSION 13.233-channelactivate), package.json + package-lock.json (13.233.0.0), CHANGELOG.md (the v13.233 head entry)
- scripts/check-stats.js (the v13.233 LIVE activation pin + the v13.232 HISTORICAL demotion), scripts/check-channel-mirror.js (the k-section [vars] check flip)
- docs/history/2026-11-07-s21-channelmirror-s5.md (this note), OWNER_TODO.md (the S21 bullet, Persian)
TESTS:
- npm test — EXIT 0, 2,889 OK / 0 FAIL (the canonical 2,888 + 1 new v13.233 activation pin)
- node scripts/check-channel-mirror.js standalone — 270/270
- npx tsc --noEmit — clean
- wrangler dev local smokes — unconfigured + configured(the REAL id): both green, zero telegram fetches without an eligible event
COMMIT:
- <SHA-filled-in-the-final-reply> "feat: the Channel Mirror ACTIVATION — the owner gate satisfied, the destination live (v13.233-channelactivate)"
PUSH:
- origin main — one-shot token push, verified with git ls-remote (the final reply)
DEPLOYMENT:
- npx wrangler deploy → ucl-notifier Version ID dbc10b80-2bbe-4476-920a-41f016c0b0c6; both channel vars live (deploy banner + the Workers settings API); both cron triggers intact
POST-DEPLOY VERIFICATION:
- healthz: version 13.233-channelactivate, ok:true, outbox 0, degraded:false, sched_mode LIVE
- ≥2 full ticks (20+ observed 13:00Z–16:40Z; two tailed live); the completion blob ch null → {s:0,…} → the first event's claim row + post
- D1 channel_posts_v1: 1 row, state 'sent' — the first mirrored event in production
- The pause marker absent; the site / + /matches 200; the webhook 403-to-GET
CHANNEL STATE:
- ACTIVE AND VERIFIED (deployed-enabled; the first naturally-occurring event delivered and owner-visible; the three-state verdict in §8)
OWNER ACTION REQUIRED:
- none for the mirror program. Optional confirmations still open (DISCOVERY §12): mirror the degradation alert? keep the dice/cards/stickers/GIF cosmetics? keep the trial footer? — any time, none blocking
RISKS / FOLLOW-UPS:
- The blob-vs-drain nuance documented in §6 (a channel event riding the kickoff drain shows its counters in the drain invocation, not the main tick's blob — the claim row is the authoritative record; the next in-tick event will populate the blob's s:1)
- Tonight's natural continuation: Atléti–Barça pre-match-24h at ~20:00Z (23:30 Tehran) — expect claim row #2 + a second post; if it defers to a drain again, same evidence shape
- DISCOVERY R1–R10 stand; the follower-gate boundary (R9) observed live tonight: no BL1/Valencia–Real/Forest–City channel posts because no follower audience exists for them — the channel mirrors the bot's audience, by design
- The S14 KV meter-regression "counter honesty" item re-observed in passing (kv_writes_day 296→324 across the window — the documented stale-fold class, not a channel concern)
NEXT SESSION:
- S22 (optional, monitor-only): watch the first match-night cohort (Atléti–Barça 24h/3h/1h/5min/match-start/result + the night digest gate), confirm the stage-collapse (one kickoff post per match), the outbox-dest lane, and the /api/audit channel block; no code changes expected unless a permanent class fires (RUNBOOK §13.4)
```

## 8) The three-state verdict (PART V §15 — never conflated)

- **code-complete: YES** — Sessions 1–3 shipped the full mirror
  (v13.230/13.231/13.232), re-verified this session at 2,889 checks.
- **deployed-ENABLED (no longer disabled): YES** — `dbc10b80`
  (13.233-channelactivate, 100%), both channel vars live and verified via
  the Workers settings API.
- **live-channel-verified: YES** — the first naturally-occurring eligible
  event (Man Utd–Aston Villa pre-match-24h, 2026-11-07T16:30:29Z) is
  verified end-to-end: the tailed deferral+drain chain, the D1 claim row
  `state:'sent'`, and the Persian post itself live on
  `https://t.me/SportSignalz`. No test post was ever sent; the claim is
  grounded in a real production notification event.

The program the spec defined is COMPLETE: the mirror is built, hardened,
deployed, activated, and verified live.

## 9) Standing watch items (carried, unchanged — NOT this program's work)

The RUM TRUE multi-day confirm, the KV read both layers, GSC Pages, the
PSG–Roma hero ride (Nov 25), the epoch guard bump (~Nov 25), G-14
December, the 4-club MVP answer, the KV plan question, and the S14 KV
meter-regression "counter honesty" item. The three S16 product
confirmations (degradation-alert mirror? dice/cards/stickers/GIF? trial
footer?) remain open — DISCOVERY §12.
