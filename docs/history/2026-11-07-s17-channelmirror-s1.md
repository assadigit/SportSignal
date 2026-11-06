# 2026-11-07 — Session 17: Channel Mirror Session 1 (destination configuration + the durable idempotency foundation)

Wall-clock note (the repo's convention): this session ran 2026-11-07
(Tehran evening, the program day continuing from the S16 Session 0 audit
`c91db40`). Per the S16 hand-off, S17 executes **`TELEGRAM_CHANNEL_MIRROR_SPEC.md`
Session 1**: the runtime foundation — destination configuration, the
delivery seam's shared gate, and the destination-scoped durable idempotency
claim — **disabled by default, zero behavioral surface** until Session 2
wires the notification-family hooks.

## 1) Boot gates (all green)

- `git fetch` (fresh clone this session; `npm install`): origin `main` ==
  `c91db40` (the S16 close) — no web-UI push in between; tree clean at
  start; branch `main`.
- Read in full, in this order: `TELEGRAM_CHANNEL_MIRROR_SPEC.md` (all
  653 lines; PART VI Session 1 + PART IV §8–§11 are this session's
  rules), `docs/telegram-channel-mirror/DISCOVERY.md` (authoritative),
  `AGENTS.md`, `RUNBOOK.md` (§1/§2/§8/§11), the S16 note
  (`2026-11-07-s16-channelmirror-s0.md`), then the source surfaces to be
  touched: `src/types.ts`, `src/match-dedupe.ts` (the saveNotifiedMatch
  law being twinned), `src/config.ts`, `wrangler.toml` +
  `wrangler.dev.toml`, `scripts/lib/worker-src.js`, `db/users-schema.sql`,
  `package.json`, `CHANGELOG.md` head, `scripts/check-userstore.js` +
  `scripts/lib/mock-env.js` (the check-script pattern), and the
  `check-stats.js` release-wiring pin area.

## 2) What shipped (v13.230-channelbase)

**`src/channel-mirror.ts` (new module, nothing calls it yet — by design):**

- `channelDestinations(env)` — `[]` unless `TELEGRAM_CHANNEL_CHAT_ID`
  parses (numeric `-100…` preferred; `@username` accepted interim; a
  typo/garbage fails CLOSED — never a wrong-channel post), and `[]`
  under `SIM_NOTIFIED_KEY` (the simulate harness can never touch the
  channel). The one destination: `{key:"fa-football", chatId, publicUrl,
  locale:"fa", sport:"football", enabled}`. `publicUrl` only accepts
  `https://t.me/<name>` (trailing slash trimmed); malformed ⇒ unset ⇒ no
  CTA anywhere.
- `claimChannelEvent(env, dest, eventKey)` — the write-first gate:
  D1 `USERS_DB` `INSERT OR IGNORE INTO channel_posts_v1 …`; `changes>0`
  ⟺ newly claimed (send may proceed); an existing row (race / re-fire /
  stuck claim) OR a D1 failure ⇒ `false` — no claim, no send. The exact
  `saveNotifiedMatch` law, D1-not-KV for the v13.94 reason. **Misuse-
  proofing:** the dest must BE a currently-live destination (`key` AND
  `chatId` match `channelDestinations(env)`) — an unconfigured env can
  never claim even when handed a valid-looking dest; a missing USERS_DB
  binding is fail-closed too (the channel never falls back to KV for its
  anti-spam claim).
- `recordChannelState(env, dest, eventKey, state, errorClass?)` —
  post-send telemetry (`sent|failed|unreachable`; `sent_at` set only on
  `sent`; `attempts+1`; `last_error` a sanitized `[A-Za-z0-9-]` CLASS ≤40
  chars, never raw error/payload/token). Never throws into a send path.
- `pausedChannel(env)` / `markChannelPaused(env, reason)` /
  `markChannelResumed(env)` — the KV `channel_mirror_v1` pause marker,
  written ONLY on transitions (idempotent re-mark of the same reason =
  no write; a different reason = a real transition), breadcrumb shape
  `{paused, reason, at, resumed_at?}`; the read is isolate-memoized 60s
  TTL keyed by the STATE binding (cloned scopedEnvs share it), a KV read
  failure fails OPEN and is never memoized (the D1 claim — not this
  marker — owns at-most-once).
- `channelGate(env)` — the shared entry-point gate every Session-2 hook
  starts with: sim ⇒ unconfigured ⇒ paused, in that order, **zero
  KV/D1/subrequest ops before the answer** (the disabled-state contract).
- The five pure event-key builders (DISCOVERY §7.2's identity table):
  `channelEventKeyMatch` (the 9 private types → 7 channel keys via the
  **`-big` base-stage collapse** — `match-start-big`→`match-start`,
  `result-big`→`result`; unknown types fail closed to `null`),
  `channelEventKeyStatus` (`POSTPONED`/`CANCELLED`/`PAUSED`→`:ht`),
  `channelEventKeyDigest` (`morning|uclnight|night` + strict
  `YYYY-MM-DD` Tehran dateKey), `channelEventKeyWeekly` (strict
  `YYYY-Www`), `channelEventKeyCoronation` (`<code>:<triggerMatchKey>`).
  Never bare matchKey, never message text.

**State (all additive, rollback-safe):** `db/users-schema.sql` gains
`channel_posts_v1` verbatim from DISCOVERY §7.2 (PK `(dest_key,
event_key)`; states `claimed|sent|failed|unreachable`); `src/config.ts`
gains `KV_CHANNEL_MIRROR: "channel_mirror_v1"` (the KV-key contract
home) + `VERSION "13.230-channelbase"`; `src/types.ts` gains the two
optional Env fields; `wrangler.toml [vars]` ships both channel vars EMPTY
(NOT secrets — a public channel id/url is not a credential);
`wrangler.dev.toml` (tracked after all — its "git-ignored" header is
stale) mirrors them; `src/worker.ts` module map gains the line.

**Harness co-evolution (AGENTS §11 same-commit rule):**
`scripts/lib/worker-src.js` concat inserts `channel-mirror.ts` between
`composers.ts` and `cup-elim.ts` — after its actual v1 deps
(config/telegram/composers/match-dedupe), before its Session-2 importers
(cup-elim/stickers/digest-*/notify-*/cron-notify); no existing span
regex crosses that boundary (verified against every `===== src/` span in
the check scripts). New `scripts/check-channel-mirror.js` (in the
`package.json` test chain, right after `check-userstore.js`) — 100
checks covering the prompt's a–f matrix: (a) disabled-state zero-op
matrix with op-counting mocks, (b) claim idempotency + destination
scoping + non-live-dest rejection, (c) D1 failure injection (failWrites
/ failPrepare / missing binding), (d) the SIM full no-op, (e) the
table-driven identity table (18 keys + 16 malformed-input nulls + the
9→7 collapse), (f) pause-marker semantics (gate OFF when paused, back ON
after the resume transition, transition-only writes, sanitization, 60s
memo TTL with a Date.now-advancing owner-side-change test, fail-open
reads) — plus recordChannelState telemetry and the claim→sent→re-claim
lifecycle. `scripts/check-stats.js` gains the v13.230-channelbase LIVE
wiring pin (the v13.229 pin demoted to HISTORICAL, the house pattern).

**RUNBOOK:** new **§8b "D1 schema applies"** (the
`wrangler d1 execute sportsignal-users --remote --file=db/users-schema.sql`
procedure, idempotent-by-construction, with the v13.92→13.94→13.102→
13.230 table history) + the `channel_mirror_v1` row in the §8 live-keys
table.

## 3) End-of-session report (spec PART VII §17)

```text
SESSION: 1 + 17 — Channel Mirror Session 1 (destination configuration, delivery foundation, durable idempotency)
STATUS: complete
SCOPE COMPLETED:
- src/types.ts: TELEGRAM_CHANNEL_CHAT_ID? / TELEGRAM_CHANNEL_PUBLIC_URL? (the TEHRAN_TZ [vars] precedent)
- wrangler.toml [vars]: both, EMPTY by default (not secrets); wrangler.dev.toml mirrored (tracked file — stale git-ignore comment noted)
- src/channel-mirror.ts v1: channelDestinations / claimChannelEvent (D1 write-first, fail-closed) / recordChannelState / pausedChannel + markChannelPaused/markChannelResumed (transition-only writes) / channelGate / the five event-key builders (incl. the -big base-stage collapse)
- db/users-schema.sql: channel_posts_v1 appended (verbatim DISCOVERY §7.2 DDL; one comment line points at the identity table's real home)
- RUNBOOK §8b (the d1 apply procedure) + the channel_mirror_v1 KV-key row
- Harness same-commit co-evolution: worker-src.js order + check-channel-mirror.js (100 checks) + package.json chain + the check-stats v13.230 LIVE pin
- Version discipline: config 13.230-channelbase ~ package 13.230.0.0 ~ lock ~ CHANGELOG; check-version-sync green
- NO notification-family hooks (Session 2); no footer changes; no outbox dest field; no monitoring surfaces; no new cron/provider/polling
FILES CHANGED:
- src/channel-mirror.ts (new), scripts/check-channel-mirror.js (new)
- src/types.ts, src/config.ts, src/worker.ts, wrangler.toml, wrangler.dev.toml
- db/users-schema.sql, RUNBOOK.md, scripts/lib/worker-src.js, scripts/check-stats.js
- package.json, package-lock.json, CHANGELOG.md
TESTS:
- npm test — EXIT 0, 2,715 OK / 0 FAIL (2,614 baseline + 100 channel-mirror + 1 new wiring pin; exact arithmetic)
- node scripts/check-channel-mirror.js standalone — 100/100
- wrangler dev local smoke — / 200, /healthz real JSON (ok:false locally = no local cron ran; fields sane), /nope 404, /api/card/nope 404, /admin 200, ZERO channel mentions in the dev log (channel unconfigured = invisible)
COMMIT:
- 86fae94 (full: 86fae9418939061abb4f25d32d5bf6c60948200b) "feat: the Channel Mirror Session 1 — the destination configuration + the durable idempotency foundation, disabled by default (v13.230-channelbase)"
PUSH:
- origin main — verified with git ls-remote: refs/heads/main = 86fae9418939061abb4f25d32d5bf6c60948200b (one-shot token push; token never in git config)
DEPLOYMENT:
- deployed: npx wrangler deploy → ucl-notifier Version ID c3f6c0e8-2323-49bd-9201-d06c7aeb133e; both channel vars deployed EMPTY (disabled by default); both cron triggers intact (*/10 + 27 */4)
- D1 schema applied: wrangler d1 execute sportsignal-users --remote --file=db/users-schema.sql → channel_posts_v1 verified live (sqlite_master lists it alongside user_prefs/chats/chat_profiles/upd_dedupe/userstore_meta/notified_v1/notify_deliveries_v1; all prior tables intact)
POST-DEPLOY VERIFICATION:
- https://sportsignal.ir/healthz → version 13.230-channelbase, ok:true, outbox 0 (the degraded:true band is the PRE-EXISTING Friday kv_writes_day 709≥700 SOFT band, present at the pre-deploy baseline — not deploy-caused)
- ≥2 full cron ticks under v13.230: last_cron_age dropped ≤10 twice (3 → 1); kv_writes_day advanced at exactly the pre-deploy cadence (709→713→717, +4/tick)
- tailed one full tick (the 20:00 UTC scheduled event, captured live): "Execution completed", KV writes this tick: 3 (execution_lock + match_status_v1 + cron_status_v1 — the exact documented classes, ZERO channel writes), subrequests 25/50 (quiet profile), the private pipeline fully green (2 in-window matches processed, night-digest gates, "every fired stage of the last 48h covers its audience", "all 49 worthy matches have complete notifications"), and ZERO channel-mirror/channel_mirror/channel log lines (a --search channel tail across a second tick window: zero matches; an unfiltered tail control confirmed sparse-but-live connectivity)
- public site: / 200, /matches 200
CHANNEL STATE:
- configured-disabled — runtime foundation shipped, no events mirrored yet (vars empty; no hooks exist; the claim table is live but unwritten)
OWNER ACTION REQUIRED:
- none for Sessions 2–3
- Session 4 still needs: create the PUBLIC Telegram channel, choose the username, add @SportSignalAlertsBot as administrator with post permission, supply the chat id + public URL
- open product confirmations (any time, DISCOVERY §12): mirror the degradation alert? keep dice/cards/stickers/GIF in the channel? keep the trial footer?
RISKS / FOLLOW-UPS:
- DISCOVERY R1–R10 stand; nothing new observed. Residual notes: (1) the claim ledger is live but unwritten until Session 2 — a stuck-claim reconciliation surface only becomes real then (Session 3 scope); (2) wrangler.dev.toml is TRACKED despite its stale "git-ignored" header — kept consistent this session, worth a one-line header fix someday; (3) the sandbox reaped background processes during this session — the final npm test ran as one foreground invocation (the authoritative run)
NEXT SESSION:
- Session 2 — mirror every eligible notification family (the prompt below)
```

## 4) Next-session prompt (Session 2) — copy-paste ready

```text
You are the lead engineer continuing the SportSignal Telegram Channel
Mirror program (repo: https://github.com/assadigit/sportsignal, branch
main). This is SESSION 2 of the program: "Mirror all eligible
notification families".

MANDATORY READING BEFORE ANYTHING ELSE (in this order):
1. TELEGRAM_CHANNEL_MIRROR_SPEC.md (repo root) — the whole spec. PART VI
   defines this session; PART II §2 (include/exclude), §4 (content +
   the Persian/locale rules + required links), PART IV §7 (the
   integration principle) are its rules.
2. docs/telegram-channel-mirror/DISCOVERY.md — the Session 0 audit.
   Authoritative for: the 24-family inventory (§2), the 11
   mirror-eligible families, the six hook points (§7.4), the stage
   collapse (§7.3), the Persian variant discipline (§7.5), the failure
   policy (§7.6), the budget integration (§7.7).
3. AGENTS.md + RUNBOOK.md (§1, §2, §8, §8b, §11) +
   docs/history/2026-11-07-s17-channelmirror-s1.md (the S17 note — the
   foundation you are building on; its §2 documents every v1 seam:
   channelGate, claimChannelEvent, recordChannelState, the pause
   marker, the event-key builders).

SESSION 1 SHIPPED (v13.230-channelbase, deployed, disabled by default):
src/channel-mirror.ts with channelDestinations/channelGate/
claimChannelEvent/recordChannelState/pausedChannel/markChannelPaused/
markChannelResumed + the five event-key builders; D1 channel_posts_v1
APPLIED and verified live; [vars] TELEGRAM_CHANNEL_CHAT_ID /
TELEGRAM_CHANNEL_PUBLIC_URL empty in production; npm test 2,715 EXIT 0
(100 of them in scripts/check-channel-mirror.js). Read that module and
its check FIRST — Session 2 consumes exactly those seams.

SESSION 2 SCOPE (the mirror goes live in code; production stays
unconfigured ⇒ still zero surface until the owner sets the vars):
1. Wire the SIX hook points from DISCOVERY §7.4 — one single call at
   the event boundary, AFTER the private write-first gate succeeded,
   OUTSIDE any per-recipient loop; each hook: channelGate → per dest:
   claimChannelEvent → compose the Persian variant → send via the
   EXISTING src/telegram.ts senders (sendTelegram / sendPhotoBinary /
   sendDice / sendUclGifBanner / sendSticker — a channel destination is
   just another chat_id) → recordChannelState. Wrap every hook so a
   channel failure can NEVER throw into the private path:
   a. notify-engine.ts sendNotificationIfNeeded — the 7 engine types
      (claim right after saveNotifiedMatch persisted; send + state
      after the group loop). The kickoff-drain chain re-runs the
      function verbatim ⇒ deferred units carry their channel copy
      automatically, idempotently.
   b. digest-bigmatch.ts broadcastBigMatchKickoff / broadcastBigMatch
      Results — the -big types; the STAGE COLLAPSE makes the second
      claim of a stage a clean no-op (channelEventKeyMatch already
      implements it).
   c. notify-status.ts detectStatusChanges — per alert, after
      statusMapSaved (their own fail-closed gate); keys via
      channelEventKeyStatus.
   d. digest-morning / digest-uclnight / digest-night — ONE hook per
      Tehran edition (channelEventKeyDigest), NOT per chat; the
      per-chat KV marks stay private.
   e. digest-coronation.ts maybeNotifyTableToppers — per coronation
      event after the snapshot gate (channelEventKeyCoronation).
   f. digest-weekly.ts maybeSendWeeklyTables — the channel burst
      reusing the fa payload group, budget-reserved against
      WEEKLY_FANOUT_CAP (channelEventKeyWeekly; DISCOVERY §7.7).
2. The PERSIAN VARIANT (DISCOVERY §7.5): compose with
   channelEnv = { ...env, TEHRAN_TZ: "Asia/Tehran" } and lang = "fa"
   through the EXISTING formatters — never copy a rendered
   per-subscriber message. The night digest needs the ADDITIVE channel
   variant of buildNightDigestMessage (results list + elimination
   events WITHOUT the per-chat followed-team sentences; valuable-night
   gate = UCL night ∨ elimination — drop the desired-teams leg) with a
   BYTE-IDENTICAL private parity test (the check-admin-parity
   precedent). The UCL preview channel line order = plain kickoff order
   (no uclPreviewOrder priority pass). Keep the dice/cards/stickers/GIF
   (the owner-default; DISCOVERY §12 q3) and the trial footer (q4).
3. The CHANNEL FOOTER on every channel post: website
   https://sportsignal.ir + bot https://t.me/SportSignalAlertsBot
   (verify against the existing constant/config first), Persian,
   concise, consistent with the bot voice; avoid duplicate footer
   elements. The PRIVATE CTA: eligible public notification messages
   gain the channel link ONLY when TELEGRAM_CHANNEL_PUBLIC_URL is set
   (the dest.publicUrl seam) — byte-identical private output when unset
   (a parity test for both states).
4. Budget discipline (DISCOVERY §7.7): fanoutFetchCost gains +2 per
   unit when the channel is enabled; digest hooks respect their
   existing wall guards; NO new cron/provider/polling/subrequest
   classes. The completion blob may gain the compact notify.ch
   breadcrumb (sent/deferred/skipped/paused) — zero extra KV writes.
5. Test harness co-evolution IN THE SAME COMMIT (AGENTS hard rule):
   - scripts/lib/mock-env.js: the full-worker D1 mock must learn the
     channel_posts_v1 statement surface (INSERT OR IGNORE + UPDATE) —
     anything unrecognized throws, and the hooks WILL issue these now.
   - scripts/check-channel-mirror.js: extend with the eligibility
     matrix (every ✅ family produces a channel event; every ⛔ family
     never does — command replies, admin pages, heartbeats, migration,
     simulate, degradation), the one-post matrix (1 vs many subscribers
     → one post; zero recipients → no invented post; repeated ticks →
     no duplicate; engine+-big collapse → exactly one kickoff/result
     post; distinct stages separate; digest editions repeat only on a
     new dateKey/week), Persian determinism (identical output
     regardless of subscriber order/languages/timezones), and the
     footer/CTA parity tests.
   - The existing 2,715 checks stay green (private output byte-identical
     when unconfigured AND when configured).
   - Version discipline: bump src/config.ts VERSION + package.json +
     package-lock (npm install --package-lock-only) + CHANGELOG +
     the check-stats LIVE wiring pin (demote the v13.230 pin to
     HISTORICAL — the S17 pattern); SW stays v119 unless a
     client-referenced asset changes.
6. Validation before push (RUNBOOK §2 order): npm test (2,715 + new,
   EXIT 0) → wrangler dev local smoke (/, /healthz, /nope,
   /api/card/nope, /admin; channel still unconfigured = invisible;
   additionally smoke with TELEGRAM_CHANNEL_CHAT_ID set locally to a
   dummy -100 id: routes still real, healthz sane, and NO telegram
   fetch happens without an eligible event) → npx wrangler deploy →
   curl https://sportsignal.ir/healthz (new version, ok:true) → watch
   ≥2 full cron ticks (last_cron_age ≤10 twice; kv_writes_last_tick at
   the documented per-tick classes — the channel still adds ZERO
   writes while the vars stay empty) → tail one tick (zero unexpected
   channel logs) → verify the site + webhook still 200.
7. Git discipline: fetch the remote first; never force-push; commit
   scoped; push one-shot (git push https://x-access-token:<token>@…
   main — never persist tokens in git config); verify with git
   ls-remote.
8. End of session: write docs/history/<date>-s18-<name>.md with the
   PART VII §17 report (CHANNEL STATE: "configured-disabled — all
   families mirrored in code, zero events mirrored in production") +
   the complete copy-paste prompt for Session 3 (reliability +
   observability hardening: outbox dest field + drain update, stuck-
   claim reconciliation, pause classification end-to-end with failure
   injection, admin /status channel section + /api/audit extension,
   RUNBOOK channel-ops section, budget re-measure). Also refresh
   OWNER_TODO.md with an S18 bullet in Persian, and print the
   next-session prompt in your final reply.

CONSTANTS (from the owner, never committed to the repo): deploy needs
CLOUDFLARE_API_TOKEN in the shell; push needs the one-shot GitHub token.
No secrets/tokens in code, logs, commits, or docs — ever.

OUT OF SCOPE FOR SESSION 2: monitoring/admin surfaces beyond the
notify.ch breadcrumb (Session 3), the outbox dest field (Session 3),
stuck-claim reconciliation (Session 3), the channel itself (owner has
not created it — Session 4), any new cron/provider/polling, any
eligibility broadening beyond the follower-gate boundary (DISCOVERY §6).
ACCEPTANCE (spec PART VI Session 2): a fan-out to many subscribers
yields only one channel delivery per event; every inventoried family is
covered or has a documented exclusion; private bot output is not
otherwise changed (byte-identical when unconfigured).
```

## 5) Standing watch items (carried from S15/S16, unchanged — NOT this program's work)

The RUM TRUE multi-day confirm (11-07+ on both datasets, the human LCP
p75 re-quote), the KV read both layers (metered band + s15-kv-true-read),
GSC Pages ≈11-09+ (owner-side), PSG–Roma hero ride (Nov 25), the epoch
guard bump (~Nov 25), G-14 December, the 4-club MVP answer, and the KV
plan question. They ride the ordinary session cadence; the Channel
Mirror sessions do not touch them unless the owner asks.
