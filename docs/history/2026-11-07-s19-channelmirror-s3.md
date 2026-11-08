# 2026-11-07 — Session 19: Channel Mirror Session 3 (reliability + observability hardening)

Wall-clock note (the repo's convention): this session ran 2026-11-07
Tehran pre-dawn into morning (the program day continuing from the S18c
re-verification; the sandbox clock — 2026-11-07T00:xx–02:00Z — runs
behind the Tehran wall-clock convention the history notes use). Per the
S18/S18c hand-off, S19 executes **`docs/TELEGRAM_CHANNEL_MIRROR_SPEC.md` PART
VI Session 3**: the outbox `dest` field + the drain update, the
stuck-claim reconciliation, the pause classification end-to-end with
failure injection, the admin observability surface, the RUNBOOK
channel-ops section, and the budget re-measure. Production stays
unconfigured ⇒ still ZERO behavioral surface.

## 1) Boot gates (all green)

- Fresh clone this session; `npm install`; `git fetch` (one-shot token
  URL): origin `main` == `c0a325c` (the S18c close) — no owner push in
  between; tree clean at start; branch `main`.
- Read in full, in this order: `docs/TELEGRAM_CHANNEL_MIRROR_SPEC.md` (all
  654 lines; PART VI Session 3 + PART IV §10–§13 are this session's
  rules), `docs/telegram-channel-mirror/DISCOVERY.md` (§7.6 the failure
  policy, §7.7 the budget, §10 the required coverage),
  `AGENTS.md` + `docs/RUNBOOK.md` (§1/§2/§8/§8b/§11), the S17 note, the S18
  note (its §2 documents every Session-2 seam this session consumes),
  the S18b race note (the fetch-before-DEPLOY lesson — formalized into
  RUNBOOK §2 this session), and the S18c verification addendum.
- Then every source surface to be touched: `src/channel-mirror.ts`,
  `src/telegram.ts` (the outbox + the senders), the eight hook files,
  `src/admin-bot.ts`, `src/admin-ops.ts`, `src/cron.ts`, and the harness
  surfaces (`scripts/lib/worker-src.js`, `scripts/lib/mock-env.js`,
  `scripts/check-channel-mirror.js`, `scripts/check-reliability.js`,
  `scripts/check-sameflow.js`, `scripts/check-stats.js` — each grepped
  for every pinned regex touching the changed functions BEFORE editing).

## 2) What shipped (v13.232-channelhardening)

**1. The OUTBOX DEST FIELD + the drain update (DISCOVERY §7.6 + spec
PART IV §11):** `outboxPush` entries may carry an optional `dest`
`{k: destKey, e: eventKey}` — the v13.125 `sticker` additive-field
precedent; pre-v13.232 entries drain EXACTLY as before (pinned by
test). The channel send path threads a channel ctx through the REAL
senders — `sendTelegram`/`sendTelegramDirect` gain an optional 5th
argument (private callers untouched), so every transient channel retry
the transport queues is distinguishable from a private one.
`drainOutbox` reports each dest-bearing entry's outcome to the
**channel-drain hook** (`setChannelDrainHook` — a dependency inversion
registered at channel-mirror module scope; telegram.ts stays
channel-agnostic and the concat's one-way layering holds): sent ⇒ the
claim row goes `sent` (the retry-after-restart proof — the KV list IS
the persistence); dead/permanent ⇒ unreachable + the pause marker; a
permanent class DROPS the entry instead of riding 6 doomed attempts;
the 6-attempt dead-letter records `outbox-exhausted`. Cap/age/attempt
semantics unchanged; the hook is try/catch'd — a channel telemetry
failure can never break the private drain (pinned).

**2. The pause classification, end-to-end (the S18 residual note 1
closed):** `classifyTelegramFailure(status, body)` fingerprints the
Telegram 400/403 bodies into sanitized classes. The PERMANENT set —
`chat-not-found` / `need-administrator-rights` / `bot-not-a-member` /
`dead-chat` / `bad-request-markdown` — pauses the destination (a real
transition: the KV marker + a rate-limited admin page through the
alertPhaseError pattern, the sanitized CLASS only) and marks the claim
`unreachable`. Transient/unknown classes (`rate-limited`, `server-error`,
`network`, `bad-request`) stay `failed`/outboxed on the bounded retries.
The pause marker now records the chatId it paused under (internal —
never surfaced): a marker pinned to a DIFFERENT id than the currently
configured one is a STALE pause — the gate opens (the config-change
un-pause path; an operator fixing a wrong id is not stuck), while the
same id stays paused and a pre-v13.232 chatId-less marker keeps pausing
(conservative). `markChannelResumed` remains the explicit owner action.

**3. The stuck-claim reconciliation, report-only (DISCOVERY §7.6):**
claims stuck `claimed`/`failed` with no `sent_at`, no in-flight outbox
entry and an age past a 30-minute grace window are counted + aged +
class-labeled per destination — surfaced admin-only. At-most-once bias:
they are NEVER blindly re-sent (pinned: the next hook invocation on a
stuck event finds the row and no-ops). **The repair decision,
documented:** a write-first repair lane (re-queue exactly the reconciled
events, the repairPerChatGaps shape) was evaluated and DECLINED — unlike
the private repair (which re-sends inside open time windows against a
per-chat delivery ledger that PROVES non-delivery), a channel claim
cannot prove the post never landed: the residual timeout-after-accept
window means a re-queue can duplicate. A human reading `/api/audit`
decides per-event; owner-approved manual re-queue tooling is a Session 4
question.

**4. The admin observability surface (spec PART IV §13, sanitized — no
chat ids, no bodies, no tokens):** the admin bot `/status` card gains
the channel section via `channelStatusSection` (configured state, last
successful delivery age, pending count + oldest age, last error CLASS,
paused + reason, the stuck warning line; the single honest
«پیکربندی‌نشده» line when unconfigured, at ZERO ops);
`/api/audit` gains the `channel` health block via
`channelHealthSnapshot` (bounded: two aggregate SELECTs + ONE LAZY
stuck-candidate SELECT that only runs when the aggregates say a
candidate exists + the outbox read + the pause-marker read; a D1 failure
degrades to honest nulls, never a 500). The PUBLIC `/healthz` is
unchanged by contract.

**5. The budget re-measure (DISCOVERY §8 was estimates — now
measured):** five full-worker scenarios (quiet / normal 1-reminder /
match-night / UCL night / weekly Monday) each run TWICE through the REAL
`executeScheduledLogic` against identical fixtures/clocks — configured
vs unconfigured — with per-run KV-put, D1-statement and fetch counters
(the m-section of check-channel-mirror). Results:
- **Unconfigured: ZERO delta on every axis** (KV writes, D1 statements,
  fetches, telegram sends — identical to the byte).
- Quiet configured: 0 channel ops. Normal 1-reminder: +1 post, +2 D1
  writes, +0 KV, +1 fetch. Match-night (2 kickoffs + HT + 2 results +
  the night digest): 6 events, ≤13 D1 ops (incl. the stage-collapse
  no-op claims), +2 KV, +9 fetches. UCL night (2×24h-backfill + preview
  + 2 kickoffs + 2 results + night digest): 8 events, ≤18 D1, +2 KV,
  +8 fetches. Weekly Monday: +1 edition, ≤4 D1, +0-2 KV, +1-5 sends.
- **The one measured correction to DISCOVERY §8:** the channel's result
  compositions add ≤2 KV writes on result-heavy nights (the composers'
  standings snapshots — `standings_snap_*`) — the estimate said 0.
  Still far under every budget wall; the governor/meters needed NO
  threshold changes (verified, not tuned).
- Harness note: the full-worker clock needed a per-scenario
  sleep-advances-the-mock-clock wrapper so 429/pause waits terminate
  deterministically (the frozen-clock infinite-wait trap).

**6. RUNBOOK:** the new **§13 "Channel-mirror operations"** (setup with
post permission, the non-posting validation, the failure-class table
with operator responses, pause/unpause semantics + the marker key, the
stuck reconciliation, rollback, the measured budget), the §8
`channel_mirror_v1` row updated (chatId pinning + stale detection + the
page), and **the S18b lesson formalized as a §2 line**: fetch the remote
immediately BEFORE `npx wrangler deploy`, not only before the push.

## 3) End-of-session report (spec PART VII §17)

```text
SESSION: 3 + 19 — Channel Mirror Session 3 (reliability + observability hardening)
STATUS: complete
SCOPE COMPLETED:
- The outbox dest field (the v13.125 sticker precedent) + the channel ctx through the REAL senders + the drain-side claim-row updates via the registered channel-drain hook (sent/dead/permanent/dropped; permanent classes drop instead of 6 doomed attempts; outbox-exhausted dead-letters)
- The pause classification end-to-end: classifyTelegramFailure's fingerprint table; the 5 permanent classes pause + unreachable + the rate-limited admin page; transient/unknown stay failed/outboxed; the pause marker's chatId + stale-on-config-change detection; markChannelResumed
- The stuck-claim reconciliation, report-only (count + oldest age + last class, admin-only, at-most-once — the repair lane evaluated and DECLINED, decision documented in src/channel-mirror.ts + this note)
- The admin surfaces: the /status channel section (channelStatusSection) + /api/audit's channel block (channelHealthSnapshot) — sanitized, bounded, admin-only; the public /healthz untouched
- The budget re-measure through the REAL pipeline (5 scenarios × configured/unconfigured): ZERO delta unconfigured; the envelopes hold configured (the one correction: ≤2 KV standings snapshots on result-heavy nights); no governor/meter changes
- RUNBOOK §13 (channel ops) + §2 (the fetch-before-DEPLOY line) + §8 (the marker row) + OWNER_TODO S19 (Persian)
- Harness co-evolution in the SAME commit: mock-env (3 health SELECTs + the failure-injection fetch verdicts), worker-src.js (the generalized Promise-typed transform rules), check-channel-mirror 202→270, check-reliability/check-sameflow re-pinned, check-stats v13.232 LIVE pin (v13.231 → HISTORICAL)
FILES CHANGED:
- src/telegram.ts (classifyTelegramFailure + the chan ctx + outboxPush dest + the drain channel branch + setChannelDrainHook), src/channel-mirror.ts (the drain hook + the permanent classes + the runner classification + the marker chatId + the page + channelHealthSnapshot/channelStatusSection)
- src/notify-engine.ts, src/digest-bigmatch.ts, src/notify-status.ts, src/digest-morning.ts, src/digest-uclnight.ts, src/digest-night.ts, src/digest-coronation.ts, src/digest-weekly.ts (the sender closures thread the ctx)
- src/admin-bot.ts (/status section), src/admin-ops.ts (/api/audit block), src/config.ts, src/worker.ts
- scripts/lib/mock-env.js, scripts/lib/worker-src.js, scripts/check-channel-mirror.js, scripts/check-reliability.js, scripts/check-sameflow.js, scripts/check-stats.js
- package.json, package-lock.json, CHANGELOG.md, docs/RUNBOOK.md, docs/OWNER_TODO.md
TESTS:
- npm test — EXIT 0, 2,888 OK / 0 FAIL (exactly 2,818 + 68 new channel-mirror l/m checks + 1 v13.232 stats pin + 1 sameflow allowlist self-check)
- node scripts/check-channel-mirror.js standalone — 270/270
- npx tsc --noEmit — clean
- wrangler dev local smoke, UNCONFIGURED — / 200, /healthz real JSON (version 13.232-channelhardening; ok:false locally = the documented no-local-cron state), /nope 404, /api/card/nope 404, /admin 200, /matches 200, zero runtime channel log lines (only the startup banner's [vars] rows)
- wrangler dev local smoke, CONFIGURED (--var TELEGRAM_CHANNEL_CHAT_ID:-1009998887776 + a test URL) — routes still real, healthz sane, ZERO api.telegram.org fetches without an eligible event, zero channel-mirror runtime lines
COMMIT:
- 01490c3 (full: 01490c3763706ffd542c9dc2795e357499bec861) "feat: the Channel Mirror Session 3 — reliability + observability hardening, still disabled by default (v13.232-channelhardening)"
PUSH:
- origin main — verified with git ls-remote: refs/heads/main = 01490c3763706ffd542c9dc2795e357499bec861 (one-shot token push; token never in git config)
DEPLOYMENT:
- deployed: npx wrangler deploy → ucl-notifier Version ID 86f48d91-d917-43fd-913a-5795fe95b65e (the latest, 100%); both channel vars deployed EMPTY (verified via the Workers settings API); both cron triggers intact (*/10 + 27 */4)
POST-DEPLOY VERIFICATION:
- https://sportsignal.ir/healthz → version 13.232-channelhardening, ok:true, outbox 0, degraded:false
- ≥2 full cron ticks under v13.232 (01:30Z + 01:40Z): last_cron_age dropped ≤10 twice (2 → 9 → 2); kv_writes_day advanced at the pre-deploy cadence (40 → 43 → 46, +3/tick)
- the completion blob: kv_writes_last_tick 3, subreq_last_tick 31 (quiet profile), notify.ch = null (the unconfigured contract), the private pipeline green (f:2 in-window matches)
- tailed one full tick (the 01:50Z scheduled event, captured live): "Execution completed"; KV writes this tick: 4 — execution_lock + matches_v13_tracked + live_overlay_v1 + cron_status_v1 (the documented classes, ZERO channel writes); true subrequests 33/50 (fetches 0); ZERO channel/mirror log lines across the tail window
- D1 channel_posts_v1 (remote): 0 rows — zero events mirrored in production
- public site: / 200, /matches 200; the webhook 403 to a bare GET (alive and rejecting)
CHANNEL STATE:
- configured-disabled — hardened, zero events mirrored in production
OWNER ACTION REQUIRED:
- none for the program's remaining engineering work
- Session 4 (the final session) needs the owner-controlled Telegram setup: create the PUBLIC channel, choose the username, add @SportSignalAlertsBot as administrator WITH post permission, supply the chat id + public URL
- the three S16 product confirmations remain open (mirror the degradation alert? keep dice/cards/stickers/GIF? keep the trial footer?)
RISKS / FOLLOW-UPS:
- DISCOVERY R1–R10 stand; the §8 estimates are now measurements (the ≤2 KV standings-snapshot correction documented). Residual notes: (1) the weekly channel table retries ride BARE (the channel text path's outbox entries don't carry the sticker pair — the payload-beats-flourish rule; documented in RUNBOOK §13); (2) the pause page is per-isolate rate-limited (a fresh isolate can re-page within 30 min — bounded to one page per pause transition per isolate); (3) the reconciliation's lazy stuck scan only fires when the aggregate says a candidate exists — an operator querying /api/audit sees the honest aggregate first; (4) the channel's standings-snapshot KV writes on result-heavy nights are now MEASURED (+2/night class) — revisit only if the KV plan question (S15) resolves to a real quota.
NEXT SESSION:
- Session 4 — production readiness + activation (the prompt below)
```

## 4) Next-session prompt (Session 4) — copy-paste ready

```text
You are the lead engineer continuing the SportSignal Telegram Channel
Mirror program (repo: https://github.com/assadigit/sportsignal, branch
main). This is SESSION 4 of the program — the FINAL session:
"Production readiness + activation" (spec docs/TELEGRAM_CHANNEL_MIRROR_SPEC.md
PART VI Session 4 + PART V §15's definition of done; DISCOVERY §7.8 is
the validation design).

MANDATORY READING BEFORE ANYTHING ELSE (in this order):
1. docs/TELEGRAM_CHANNEL_MIRROR_SPEC.md — the whole spec. PART VI Session 4
   + PART V §15 (the definition of done: the three states —
   code-complete / deployed-disabled / live-channel-verified — must be
   separated honestly, never conflated) are this session's rules.
2. docs/telegram-channel-mirror/DISCOVERY.md — §7.8 (the non-posting
   validation: getChat/getChatMember), §7.6 (the failure policy you will
   now see live if anything is misconfigured), §10 (the coverage that
   must stay green).
3. AGENTS.md + docs/RUNBOOK.md — §1, §2 (incl. the fetch-before-DEPLOY
   line), §8, §8b, §11, AND §13 (the channel-ops section S19 shipped:
   setup, validation, the failure-class table, pause/unpause, rollback,
   the measured budget).
4. docs/history/2026-11-07-s17-channelmirror-s1.md +
   docs/history/2026-11-07-s18-channelmirror-s2.md +
   docs/history/2026-11-07-s18b-channelmirror-race.md +
   docs/history/2026-11-07-s18c-channelmirror-reverify.md +
   docs/history/2026-11-07-s19-channelmirror-s3.md (the S19 note — its
   §2 documents every Session-3 seam: the drain hook, the permanent
   classes, the reconciliation, the admin surfaces, the measured
   budget).

SESSIONS 1–3 SHIPPED (v13.232-channelhardening; live deployment
86f48d91 from main@01490c3; disabled by default — [vars]
TELEGRAM_CHANNEL_CHAT_ID / TELEGRAM_CHANNEL_PUBLIC_URL verified EMPTY in
production; D1 channel_posts_v1 live with 0 rows; npm test 2,888 EXIT 0,
68 of them the Session-3 transport/failure/budget matrix in
scripts/check-channel-mirror.js). Read src/channel-mirror.ts +
src/telegram.ts (the outbox dest + the chan ctx) + RUNBOOK §13 FIRST —
Session 4 consumes exactly those seams.

SESSION 4 SCOPE (owner-gated — if the owner has NOT created the channel
/ supplied the values, do NOT fake activation: run the readiness checks,
deploy in the safe disabled state, and report exactly what remains):
1. OWNER GATE: confirm the owner has (a) created the PUBLIC Persian
   channel, (b) added @SportSignalAlertsBot as administrator WITH post
   permission, (c) supplied the numeric chat id (-100… preferred) and
   the public https://t.me/… URL. If any piece is missing, STOP at the
   readiness report (below) and hand back.
2. CONFIG VALIDATION (non-posting, DISCOVERY §7.8): with the values in
   hand, run the non-posting Bot API checks — getChat(chat_id) (the bot
   can see the channel; the response's type is "channel") +
   getChatMember(chat_id, <bot id from getMe>) → role "administrator"
   with the post-messages permission. Do this from a one-off script or
   wrangler dev --var (NEVER a committed token; the values themselves
   are public [vars], not secrets). If validation fails: report the
   exact class (the RUNBOOK §13 table predicts each), do NOT enable.
3. ENABLE: set the two [vars] in wrangler.toml [vars] (or the
   dashboard), npx wrangler deploy (FETCH THE REMOTE FIRST — RUNBOOK
   §2), then verify healthz + the deployed vars via the Workers
   settings API.
4. FIRST EVENT VERIFICATION (the spec's rule — no fake test post): the
   first NATURALLY-OCCURRING eligible event must be verified end-to-end:
   the tick logs (the channel send), the D1 claim row (channel_posts_v1
   gains its first row — state 'sent'), the notify.ch breadcrumb
   flipping from null to {s:1,…}, and the channel post itself
   (owner-confirmed visible in the channel — ask the owner to look).
   Observe ≥2 full ticks after enabling; tail one; confirm the private
   pipeline is untouched (the f/s counters, the site, the webhook).
5. THE THREE-STATE HONESTY (PART V §15): the final report must state
   code-complete (Sessions 1–3), deployed-disabled (the state until the
   vars are set), and live-channel-verified (only after step 4's
   evidence) as SEPARATE states with the evidence for each. Never claim
   live verification without the first-event proof.
6. If anything in the first events hits a permanent class (the §13
   table), use the new surfaces to diagnose: /api/audit's channel block
   + the /status section + the pause marker; fix, resume
   (markChannelResumed or the config change), and re-verify.
7. Validation before push (RUNBOOK §2 order): npm test (2,888+, EXIT 0)
   → the local smokes (unconfigured + the REAL channel id — with the
   REAL id configured locally, still ZERO telegram fetches without an
   eligible event) → fetch-then-deploy → healthz (new version, ok:true)
   → ≥2 full cron ticks (now WITH channel events if any fire: the
   documented per-tick budgets in RUNBOOK §13.7) → tail one tick →
   site + webhook 200. Git discipline: fetch first, never force-push,
   scoped commit, one-shot push, ls-remote verify.
8. End of program: write docs/history/<date>-s20-<name>.md with the
   PART VII §17 report (CHANNEL STATE: the honest three-state verdict)
   + refresh docs/OWNER_TODO.md with an S20 bullet in Persian + print the
   closing summary in your final reply. The program's spec is then
   COMPLETE unless the owner opens follow-ups (the DISCOVERY §12
   questions: the degradation-alert mirror, the cosmetic fidelity
   confirmations, the future English/other-sport destinations).

CONSTANTS (from the owner, never committed to the repo): deploy needs
CLOUDFLARE_API_TOKEN in the shell; push needs the one-shot GitHub token.
The channel chat id + public URL arrive from the owner this session —
they are PUBLIC [vars] (writable in wrangler.toml), never secrets; the
bot token stays in the existing secret mechanism. No secrets/tokens in
code, logs, commits, or docs — ever.

OUT OF SCOPE FOR SESSION 4: any new notification family or eligibility
broadening beyond the follower-gate boundary (DISCOVERY §6 — that is a
future owner decision, not this session), any English/other-sport
destination (spec PART IV §8), any admin UI for channel management, any
test post to the public channel without explicit owner approval.
ACCEPTANCE (spec PART VI Session 4 + PART V §15): configuration
validated non-postingly; delivery enabled only after validation; the
first naturally-occurring event verified end-to-end (log + claim row +
breadcrumb + owner-visible post); the three states reported separately;
every check green.
```

## 5) Standing watch items (carried from S15–S18, unchanged — NOT this program's work)

The RUM TRUE multi-day confirm, the KV read both layers, GSC Pages
(the owner-side crawl window), PSG–Roma hero ride (Nov 25), the epoch
guard bump (~Nov 25), G-14 December, the 4-club MVP answer, and the KV
plan question (which the S19 budget measurement now touches directly —
the +2/night standings-snapshot class is negligible on any plan). They
ride the ordinary session cadence; the Channel Mirror sessions do not
touch them unless the owner asks.
