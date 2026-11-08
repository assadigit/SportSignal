# 2026-11-07 — Session 18: Channel Mirror Session 2 (all eligible notification families mirrored in code)

Wall-clock note (the repo's convention): this session ran 2026-11-07
Tehran late evening into 2026-11-08 (the program day continuing from the
S17 Session 1 foundation `293477a`; the deploy landed 2026-11-06 ~22:10
UTC — the sandbox clock runs behind the Tehran wall-clock convention the
history notes use). Per the S17 hand-off, S18 executes
**`docs/TELEGRAM_CHANNEL_MIRROR_SPEC.md` PART VI Session 2**: the mirror goes
live IN CODE — every mirror-eligible family wired to the Session-1
foundation — while production stays unconfigured ⇒ still ZERO surface
until the owner sets the vars.

## 1) Boot gates (all green)

- Fresh clone this session; `git fetch` (one-shot token URL): origin
  `main` == `293477a` (the S17 close) — no owner push in between; tree
  clean at start; branch `main`.
- Read in full, in order: `docs/TELEGRAM_CHANNEL_MIRROR_SPEC.md` (PART VI
  Session 2 + PART II §2/§4 + PART IV §7 are this session's rules),
  `docs/telegram-channel-mirror/DISCOVERY.md` (authoritative — §7.4 the
  hook points, §7.3 the stage collapse, §7.5 the Persian variant, §7.6
  the failure policy, §7.7 the budget), `AGENTS.md` + `docs/RUNBOOK.md`
  (§1/§2/§8/§8b/§11), the S17 note
  (`2026-11-07-s17-channelmirror-s1.md`), then every source surface to
  be hooked (notify-engine / digest-bigmatch / notify-status /
  digest-morning / digest-uclnight / digest-night / digest-coronation /
  digest-weekly / telegram / cron) plus the harness surfaces
  (`scripts/lib/worker-src.js`, `scripts/lib/mock-env.js`,
  `scripts/check-channel-mirror.js`, and every check that grabs or
  regexes the touched functions — found by grepping each function name
  across `scripts/*.js` BEFORE editing anything).

## 2) What shipped (v13.231-channelmirror)

**The six hook points (DISCOVERY §7.4) — one single call at the event
boundary, AFTER the private write-first gate succeeded, OUTSIDE any
per-recipient loop, each wrapped so a channel failure can NEVER throw
into the private path:**

1. **`src/notify-engine.ts` `sendNotificationIfNeeded`** (the 7 engine
   types): claim right after `saveNotifiedMatch` persisted (a CPU kill
   mid-fan-out leaves a detectable *pending* claim, not a silent loss),
   send + state after the group loop. The channel sender composes the
   fa/Asia-Tehran variant through the EXISTING formatter + promo footer,
   fires the cosmetic dice (match-start, non-lean), sends the fa card
   (`cachedCardPng` for the timing-critical types, `renderCardPngCached`
   otherwise — per-(match,lang) memoized) with the per-chat path's own
   text fallback. The kickoff-drain chain re-runs the function verbatim ⇒
   deferred units carry their channel copy automatically, idempotently.
2. **`src/digest-bigmatch.ts`** — both `-big` broadcasts, claim after
   `saveNotifiedMatch(..., "-big")`; **the stage collapse**
   (`channelEventKeyMatch`: match-start-big→match-start,
   result-big→result) makes the engine's earlier claim a clean no-op —
   one channel post per logical stage whichever path fired first.
   Text-only (the broadcast's own shape).
3. **`src/notify-status.ts` `detectStatusChanges`** — per alert after
   `statusMapSaved` (their own fail-closed gate): claim before the lang
   buckets, ONE fa post after them; keys `:postponed | :cancelled |
   `:ht`` via `channelEventKeyStatus`; the HT channel copy mirrors the
   fa bucket's composition + footer.
4. **The three Tehran edition digests** — ONE post per edition, NEVER
   per chat (the per-chat KV marks stay private), each exported with an
   explicit `nowMs` for deterministic harness testing:
   `mirrorMorningChannelPost` (the 9am Tehran wall gate + the
   master-big-match content gate run BEFORE the claim so an unclaimed
   edition is never burned), `mirrorUclNightChannelPost` (the same
   window + `subrequestCount() >= 40` wall guard, the fa GIF banner
   guarded `< 42`, the fixture list in **plain kickoff order** — no
   `uclPreviewOrder` priority pass; the channel has no follows),
   `mirrorNightChannelPost` (the night-over + stale-pool + ≥1-finished
   gates, then **the channel valuable-night gate = UCL night ∨
   elimination event — the per-chat desired-teams leg DROPPED**;
   the message is the ADDITIVE **`buildNightDigestChannelMessage`**:
   the same results list + elimination events WITHOUT the
   «بازی‌های شما» section; the private `buildNightDigestMessage` is
   byte-identical — pinned by the frozen-fixture parity test
   `scripts/fixtures/nightdigest-private-baseline.txt`, the
   check-admin-parity precedent).
5. **`src/digest-coronation.ts`** — per coronation event after the
   snapshot gate (`snapSaved` + prev + trigger found):
   `channelEventKeyCoronation(code, matchKey(trigger))`, ONE fa
   `formatTableTopMessage` post + footer (the coronation text's own
   football.sportsignal.ir link counts as the site link — only the bot
   line rides).
6. **`src/digest-weekly.ts` `serveChannelWeekly`** — the channel burst
   reusing the fa payload group as [sticker][table]×N + week-ahead
   (the private burst's own layout), budget-reserved against
   `WEEKLY_FANOUT_CAP` via the SAME `weeklyBurstCost` projection; the
   claim fires only AFTER the reservation passes (an unaffordable burst
   never burns the edition — the retry lane stays open); the footer
   rides the CLOSING message only (one channel event, one footer — no
   footer spam on N tables). Rides the start tick + continuation ticks
   while the cursor is live + a bounded Monday-window retry lane after
   the week marker is set.

**The shared runner (`src/channel-mirror.ts` v2):** `channelActive` /
`channelEnvFor` (`{...env, TEHRAN_TZ: "Asia/Tehran"}`) /
`appendChannelFooter` / `withChannelCta` / `takeChannelTickStats` /
`claimChannelPost` / `sendChannelPost` / `mirrorChannelPost`. Outcome
classification (Session-2 minimal; Session 3 completes the end-to-end
failure-injection matrix): `true`⇒sent; `"dead"`⇒unreachable + the pause
marker (`markChannelPaused("dead-chat")` — the channel is never
dead-chat-pruned); `false`⇒failed/transient (the text paths already
outbox inside `sendTelegram`; the stuck-claim reconciliation is
Session 3). The compact per-tick stats `{s,d,k,p}` ride the completion
blob's EXISTING put as `notify.ch` (null while unconfigured) — zero
extra KV writes.

**The channel footer (spec PART II §4):** every channel post ends with
the website (`https://sportsignal.ir`) + bot
(`https://t.me/SportSignalAlertsBot`) links — Persian, MarkdownV2-safe,
**duplicate-avoidance** (a message already carrying a sportsignal.ir
link — the v13.22 promo footer, the tables' football.sportsignal.ir —
gets only the missing bot line, riding as a plain continuation line;
fail-open at the ceilings, the withTrialFooter law). The URL constants
live in `config.ts` (`CHANNEL_SITE_URL`/`CHANNEL_BOT_URL`, the bot URL
mirroring the verified `MIGRATION_NEW_BOT_URL` spelling).

**The PRIVATE CTA:** `withChannelCta` adds the channel link to eligible
public notification messages ONLY when `TELEGRAM_CHANNEL_PUBLIC_URL` is
set (the `dest.publicUrl` seam); unset or malformed ⇒ the identity
function ⇒ byte-identical private output (the parity law — tested in
BOTH states). Applied at the composition boundary of every cron
notification family (the engine + repair leg, both broadcasts, status
alerts, the three digests, coronation, the weekly payload at render
time — per-lang, so the snapshot serves the right label; documented
caveat: a mid-week URL config change applies from the NEXT week's
snapshot).

**Budget discipline (DISCOVERY §7.7):** `fanoutFetchCost` gains exactly
`+2` per unit when `channelActive(env)` (the exact pre-13.231 cost when
not — clean deferrals unchanged); the digest hooks respect their
existing wall guards; NO new cron/provider/polling/subrequest classes
(pinned by source assertions).

**Harness co-evolution (the AGENTS same-commit rule):**
`scripts/lib/mock-env.js` learned the `channel_posts_v1` statement
surface (INSERT OR IGNORE + UPDATE — anything unrecognized still
throws). `scripts/check-channel-mirror.js` grew **100 → 202 checks**:
the g-section (hook-runner lifecycle + classification + isolation +
stats + the footer duplicate-avoidance table + the CTA parity in both
states), the h1–h8 family behavioral matrix (every ✅ family produces
exactly ONE channel event per logical occurrence: the engine with
dice/card/text, the stage collapse, status transitions incl. the
fail-closed map gate, the morning/UCL/night Tehran editions with
edition-repeat + quiet-day + window gates, coronation incl. the
snapshot fail-closed, the weekly burst incl. the
budget-blocked-never-burns-the-claim + closing-message-only footer),
the i-section exclusion matrix (bot/admin-bot/admin-ops/admin/migration/
monitoring/cron-users/cron-preflight/providers/notify-audit/users/
simulate NEVER reach the channel; the hooks live ONLY in the six
boundary modules + cron.ts's breadcrumb), and the k-section resource
assertions (+2 arithmetic, no new crons, the blob rider, the
claim-after-save / send-after-loop placement).
`check-no-miss` (3 eval scopes) + `check-mdstyle` gained identity/no-op
stubs for the new seams; `check-reliability` re-pinned the
`fanoutReservation(config, chatGroups, channelActive(env))` signature,
the `+2` line, the blob's `ch:` fold and the weekly start-tick segment;
`check-kickoff` re-pinned the reservation call regex;
`check-sameflow` re-pinned the night-digest per-chat send (now wrapped
in `withChannelCta`); `check-weekly-tables` stubbed
`withChannelCta`/`serveChannelWeekly`. `check-stats` demoted the
v13.230 pin to HISTORICAL and added the v13.231 LIVE wiring pin.

## 3) End-of-session report (spec PART VII §17)

```text
SESSION: 2 + 18 — Channel Mirror Session 2 (mirror all eligible notification families)
STATUS: complete
SCOPE COMPLETED:
- The six DISCOVERY §7.4 hook points wired (engine / -big broadcasts / status / morning+UCL+night editions / coronation / weekly burst), each one call at the event boundary, outside every per-recipient loop, wrapped for private-path isolation
- The Persian/Asia-Tehran variant through the EXISTING formatters (channelEnvFor; never a copied subscriber message); the night digest's additive channel variant (no per-chat sentences, valuable-night = UCL ∨ elimination); the UCL preview in plain kickoff order
- appendChannelFooter (website+bot links, duplicate-avoidance) on every channel post; withChannelCta on eligible private notifications ONLY when TELEGRAM_CHANNEL_PUBLIC_URL is set (byte-identical when unset — parity-tested in both states)
- Budget: fanoutFetchCost +2 when channelActive(env); digest wall guards respected; notify.ch rides the completion blob (zero extra KV writes); no new cron/provider/polling
- Harness same-commit co-evolution: mock-env channel_posts_v1 surface; check-channel-mirror 100→202 checks; no-miss/mdstyle/reliability/kickoff/sameflow/weekly re-pinned; check-stats v13.231 LIVE pin (v13.230 → HISTORICAL)
- Version discipline: config 13.231-channelmirror ~ package 13.231.0.0 ~ lock ~ CHANGELOG; SW stays v119 (server-side only)
FILES CHANGED:
- src/channel-mirror.ts (the v2 runner/footer/CTA/stats), src/notify-engine.ts, src/digest-bigmatch.ts, src/notify-status.ts, src/digest-morning.ts, src/digest-uclnight.ts, src/digest-night.ts (the additive channel variant), src/digest-coronation.ts, src/digest-weekly.ts, src/cron.ts (notify.ch), src/config.ts, src/worker.ts
- scripts/lib/mock-env.js, scripts/check-channel-mirror.js (+ scripts/fixtures/nightdigest-private-baseline.txt new), scripts/check-no-miss.js, scripts/check-mdstyle.js, scripts/check-reliability.js, scripts/check-kickoff.js, scripts/check-sameflow.js, scripts/check-weekly-tables.js, scripts/check-stats.js
- package.json, package-lock.json, CHANGELOG.md
TESTS:
- npm test — EXIT 0, 2,818 OK / 0 FAIL (2,715 baseline + 102 new channel-mirror checks + 1 new wiring pin; exact arithmetic)
- node scripts/check-channel-mirror.js standalone — 202/202
- npx tsc --noEmit — clean
- wrangler dev local smoke — unconfigured: / 200, /healthz real JSON (version 13.231-channelmirror; ok:false locally = no local cron ran, the S17-documented local state), /nope 404, /api/card/nope 404, /admin 200, zero runtime channel log lines (only the startup banner's [vars] table); CONFIGURED (wrangler --var TELEGRAM_CHANNEL_CHAT_ID:-1009998887776): routes still real, healthz sane, ZERO api.telegram.org fetches without an eligible event
COMMIT:
- a082450 (full: a082450a81375ef496ef5a80d1cd49888990a6a5) "feat: the Channel Mirror Session 2 — all eligible notification families mirrored in code, still disabled by default (v13.231-channelmirror)"
PUSH:
- origin main — verified with git ls-remote: refs/heads/main = a082450a81375ef496ef5a80d1cd49888990a6a5 (one-shot token push; token never in git config)
DEPLOYMENT:
- deployed: npx wrangler deploy → ucl-notifier Version ID e97f281c-8bff-41cd-9573-aac49bad7060; both channel vars deployed EMPTY (disabled by default); both cron triggers intact (*/10 + 27 */4)
POST-DEPLOY VERIFICATION:
- https://sportsignal.ir/healthz → version 13.231-channelmirror, ok:true, outbox 0 (the degraded:true band is the PRE-EXISTING kv_writes_day ≥700 SOFT class — 787 already at the first post-deploy read, before any v13.231 tick completed — not deploy-caused)
- ≥2 full cron ticks under v13.231: last_cron_age ≤10 twice (7 → 6); kv_writes_day advanced at the pre-deploy cadence; the completion blob's kv_writes_last_tick = 3–5, the exact documented per-tick classes (execution_lock + match_status_v1/live_overlay_v1 + cron_status_v1) — the channel adds ZERO writes while the vars stay empty
- the blob's notify.ch = null (the unconfigured contract) with the private pipeline green (f:2 in-window matches, the 48h coverage audit + "all 49 worthy matches" passing)
- tailed one full tick (the 22:30 UTC scheduled event, captured live): "Execution completed", KV writes this tick: 3 (execution_lock + live_overlay_v1 + cron_status_v1), subrequests quiet-profile, ZERO channel log lines across the tail window
- D1 channel_posts_v1 in production: 0 rows (zero events mirrored)
- public site: / 200, /matches 200; the webhook route answers (403 to an unsigned GET — the documented invalid-webhook prober class; the route is alive and rejecting)
CHANNEL STATE:
- configured-disabled — all families mirrored in code, zero events mirrored in production
OWNER ACTION REQUIRED:
- none for Session 3
- Session 4 still needs: create the PUBLIC Telegram channel, choose the username, add @SportSignalAlertsBot as administrator with post permission, supply the chat id + public URL
- open product confirmations (any time, DISCOVERY §12): mirror the degradation alert? keep dice/cards/stickers/GIF in the channel? keep the trial footer?
RISKS / FOLLOW-UPS:
- DISCOVERY R1–R10 stand. Residual notes: (1) the Session-2 outcome classification is minimal by design — "dead" pauses the destination, but a non-dead 400/403 (e.g. need-admin) classifies transient until Session 3's body-fingerprinting matrix; a misconfigured channel then costs ~1 doomed send per event (bounded, never private-path-affecting); (2) the weekly channel burst competes for budget after the private chats — the Monday-window retry lane covers it, but a permanently starved week loses that week's channel post (the same never-spam-outranks-never-miss trade the private weekly already makes); (3) the private CTA is baked into the weekly payload at render time — a mid-week URL config change applies from the next week's snapshot; (4) the notify.ch counters reset on take (per-tick) — a kickoff-drain invocation's channel stats surface only if the same isolate serves the next tick's blob (best-effort telemetry by design)
NEXT SESSION:
- Session 3 — reliability + observability hardening (the prompt below)
```

## 4) Next-session prompt (Session 3) — copy-paste ready

```text
You are the lead engineer continuing the SportSignal Telegram Channel
Mirror program (repo: https://github.com/assadigit/sportsignal, branch
main). This is SESSION 3 of the program: "Reliability + observability
hardening" (spec docs/TELEGRAM_CHANNEL_MIRROR_SPEC.md PART VI Session 3;
DISCOVERY §7.6/§7.7/§10 are the design under test).

MANDATORY READING BEFORE ANYTHING ELSE (in this order):
1. docs/TELEGRAM_CHANNEL_MIRROR_SPEC.md — the whole spec. PART VI defines
   this session; PART IV §10–§13 (the exactly-once reality, the outbox
   contract, the budget laws, the monitoring surface) are its rules.
2. docs/telegram-channel-mirror/DISCOVERY.md — §7.6 (the failure
   policy: at-most-once bias, outbox dest-field reuse, pause on
   permanent errors, isolation), §7.7 (budget), §10 (the required
   transport/failure/resource test coverage).
3. AGENTS.md + docs/RUNBOOK.md (§1, §2, §8, §8b, §11) +
   docs/history/2026-11-07-s17-channelmirror-s1.md (the foundation) +
   docs/history/2026-11-07-s18-channelmirror-s2.md (the S18 note — its
   §2 documents every Session-2 seam: the six hooks, the runner
   primitives claimChannelPost/sendChannelPost/mirrorChannelPost, the
   minimal outcome classification, the notify.ch breadcrumb, the
   parity fixtures).

SESSIONS 1–2 SHIPPED (v13.231-channelmirror, deployed e97f281c,
disabled by default — [vars] TELEGRAM_CHANNEL_CHAT_ID /
TELEGRAM_CHANNEL_PUBLIC_URL empty; D1 channel_posts_v1 live with 0
rows; npm test 2,818 EXIT 0, 102 of them the Session-2 family matrix in
scripts/check-channel-mirror.js). Read src/channel-mirror.ts + the six
hook sites (notify-engine / digest-bigmatch / notify-status /
digest-morning / digest-uclnight / digest-night / digest-coronation /
digest-weekly) and check-channel-mirror.js FIRST — Session 3 consumes
exactly those seams.

SESSION 3 SCOPE:
1. The OUTBOX DEST FIELD + the drain update (DISCOVERY §7.6 + spec
   PART IV §11): transient channel failures outbox through the
   EXISTING sendTelegram (they already do), but the entries are
   indistinguishable from private ones. Add the optional `dest` field
   to outboxPush entries (the v13.125 `sticker` additive-field
   precedent — old entries drain unchanged), set it from the channel
   send path, and make drainOutbox update the claim row's state when a
   dest-bearing entry drains (sent ⇒ recordChannelState 'sent';
   dead ⇒ unreachable + the pause marker). Cap/age/attempt semantics
   unchanged; the channel queue must never block the private queue.
2. STUCK-CLAIM RECONCILIATION (DISCOVERY §7.6): a claim row stuck
   'claimed'/'failed' with no outbox entry and no sent_at past a grace
   window is NOT blindly re-sent (at-most-once bias — the owner's
   stated priority). Build the reconciliation as a bounded, report-only
   surface first (the repairPerChatGaps precedent): count + oldest age
   + last error class per destination, surfaced admin-only. Any
   write-first repair (re-queue exactly the reconciled events) only if
   the evidence justifies it — document the decision either way.
3. PAUSE CLASSIFICATION END-TO-END WITH FAILURE INJECTION (the S18
   residual note 1): the Session-2 classifier only knows 'dead' ⇒
   unreachable+pause. Complete it: fingerprint the Telegram 400/403
   bodies (chat-not-found vs need-administrator-rights vs bot-not-a-
   member vs bad-request markdown) — the permanent classes pause the
   destination (rate-limited admin page, the existing alertPhaseError
   channel) and mark claims unreachable; the transient classes stay
   failed/outboxed. Failure-injection tests for every class through
   the REAL senders (the mock-env fetch dispatcher's onTelegram hook):
   429+retry_after, 5xx, network, permanent 400/403 per class, pause ⇒
   hooks skip without touching private sends, resume on config change
   (markChannelResumed), a paused channel never re-fires past claims.
4. ADMIN / STATUS CHANNEL SECTION + /api/audit EXTENSION (spec PART IV
   §13, admin-only, sanitized): configured/enabled state, claim depth +
   oldest pending age, last successful channel delivery time, recent
   retry/permanent counts, last error CLASS, paused + reason. The admin
   bot /status card gains the section; /api/audit gains the channel
   health block. NO channel internals in public /healthz (it stays
   unchanged); no chat ids, no bodies, no tokens anywhere.
5. RUNBOOK CHANNEL-OPS SECTION: setup (create the public channel, add
   the bot as admin with post permission, set the vars), validation
   (the non-posting getChat/getChatMember checks), pause/unpause
   semantics + the marker key, rollback (empty the vars; the claim
   table is additive/ignorable), the observed failure classes + their
   operator responses. Also document notify.ch's compact fields.
6. BUDGET RE-MEASURE (DISCOVERY §8 was estimates): offline fixtures
   through the REAL pipeline (quiet / normal 1-reminder / match-night /
   UCL night / weekly Monday) asserting the per-tick KV writes, D1
   writes and subrequest totals stay within the documented envelopes
   while the channel is configured — and ZERO delta while unconfigured.
   The governor/meters need NO threshold changes (verify, don't tune).
7. Test harness co-evolution IN THE SAME COMMIT (the hard rule): every
   new statement surface in mock-env; check-channel-mirror grows the
   transport/failure matrix (spec PART V §14's Transport/outbox/
   failures block — 429+retry_after, transient 5xx, permanent
   400/403 per class, missing config, channel failure never stops
   private sends, retry-after-restart, bounded retry/dead-letter,
   ambiguous timeout follows the documented policy, duplicate/out-of-
   order cron invocations); the existing 2,818 checks stay green.
   Version discipline: bump config VERSION + package.json + lock +
   CHANGELOG + the check-stats LIVE pin (demote v13.231 to HISTORICAL);
   SW stays v119 unless a client-referenced asset changes.
8. Validation before push (RUNBOOK §2 order): npm test → wrangler dev
   local smoke (unconfigured + a dummy -100 id) → npx wrangler deploy →
   curl healthz (new version, ok:true) → ≥2 full cron ticks (channel
   still unconfigured = zero channel writes) → tail one tick → site +
   webhook 200. Git discipline: fetch first, never force-push, scoped
   commit, one-shot push, ls-remote verify.
9. End of session: write docs/history/<date>-s19-<name>.md with the
   PART VII §17 report (CHANNEL STATE stays "configured-disabled —
   hardened, zero events mirrored in production") + the complete
   copy-paste prompt for Session 4 (production readiness + activation:
   owner-gated config validation via getChat/getChatMember, first
   naturally-occurring event verification, the three-state honesty).
   Also refresh docs/OWNER_TODO.md with an S19 bullet in Persian, and print
   the next-session prompt in your final reply.

CONSTANTS (from the owner, never committed to the repo): deploy needs
CLOUDFLARE_API_TOKEN in the shell; push needs the one-shot GitHub token.
No secrets/tokens in code, logs, commits, or docs — ever.

OUT OF SCOPE FOR SESSION 3: the channel itself (owner has not created
it — Session 4), any new cron/provider/polling, any eligibility
broadening beyond the follower-gate boundary (DISCOVERY §6), any
English/other-sport destination (spec PART IV §8). ACCEPTANCE (spec
PART VI Session 3): all new and existing tests pass; no unbounded
queue/retry loop/extra provider polling; channel failures provably
never block private sends; the observability surface is admin-only and
sanitized.
```

## 5) Standing watch items (carried from S15–S17, unchanged — NOT this program's work)

The RUM TRUE multi-day confirm, the KV read both layers, GSC Pages
(the owner-side crawl window), PSG–Roma hero ride (Nov 25), the epoch
guard bump (~Nov 25), G-14 December, the 4-club MVP answer, and the KV
plan question. They ride the ordinary session cadence; the Channel
Mirror sessions do not touch them unless the owner asks.
