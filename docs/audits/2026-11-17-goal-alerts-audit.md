# Goal Alerts Audit — Session 19 (the Telegram Alerts Track, part 1)

> Agents: read AGENTS.md in the repo root first, and follow it for this whole task.

Date: 2026-11-17 (~19:00 UTC). Baseline: `main` @ `7a37619` (S18), `npm test`
EXIT 0 / **3,789 OK / 0 FAIL**, `npx tsc --noEmit` clean. The S17+S18
page-level live verification job was found MISSING from the scheduler (it never
fired); it was re-scheduled for 2026-11-18T00:20 UTC (after the KV-quota
reset) during this session's start. Live `/healthz` at 18:56 UTC: `ok:false` +
`pool_matches:0` + `version: 13.271.0-content` — the documented KV read-quota
exhaustion (crossed ~11:05 UTC; resets UTC midnight), NOT a failure; the
version proves the S18 deployment is serving @100%.

## 1. What the audit verified (against source, not docs)

- **Kickoff + full-time pushes ALREADY EXIST** (confirmed): the engine's
  `NOTIFICATION_CONFIGS` carries `match-start` (window −1…+45min + the
  45–180min live backfill leg) and `result` (FINISHED within 6h + 24h
  backfill), plus the `match-start-big` / `result-big` broadcasts
  (`digest-bigmatch.ts`). S19 must add ZERO regression here and must NOT
  rebuild them.
- **No goal / red-card events exist anywhere** (confirmed):
  `grep -rn "goal" src/` finds only the hero-portrait domain + the public
  live-scorer enrichment (`enrichLiveMatches` — the WEBSITE's scorer names,
  fetched from sportscore event detail, consumed only by the public payload,
  never by the notification pipeline).
- **The LIVE sweep is the fact source** (confirmed): `cron-pool.ts` runs
  `fetchLiveSweep` every tick in LIVE/PRE_MATCH/POST_MATCH modes — one narrow
  football-data ±2d call + sportscore yesterday/today for eligible leagues
  with an in-window pool match (the R6 narrowing), merged over the KV pool in
  memory. Live scores ride `match.score.fullTime.{home,away}`:
  - football-data v4 populates `fullTime` with the RUNNING score for live
    matches (verified against the repo's own readers: `monitoring.ts`
    `liveFingerprint`, `cron-public.ts` overlay `s` field, `notify-status.ts`
    HT alert — the site's whole live-score surface reads this shape; probed
    the API live 2026-11-17: no live matches exist mid-break, the finished
    matches confirm the `score.fullTime`/`halfTime` nesting).
  - sportscore maps in-play scores into `fullTime` and stores `null` for
    SCHEDULED rows (the pre-kickoff 0-0 trap is already guarded at the
    provider).
- **The dedupe ledger is D1 `notified_v1`, PK `(match_key, ntype)`**
  (confirmed): `ntype` is TEXT — per-goal claim keys extend the PK pattern
  with zero schema change (e.g. `goal:2-1`). The write-first gate
  (`saveNotifiedMatch` → `INSERT OR IGNORE`, `changes>0` ⟺ newly claimed,
  D1 failure ⟺ defer) is reusable verbatim.
- **The audience model is team follows** (confirmed): `user_prefs.teams` (D1
  via the `user-store.ts` seam, KV legacy fallback), resolved per chat by
  `userFollowsMatch` ("one"/"both"/null) with the master-list fallback for
  row-less chats. A goal event fans out to chats following EITHER side — no
  new subscription surface required.
- **The send path is complete** (confirmed): `sendTelegram` (3 retries, 429
  pause-wait, subrequest gate, dead-chat classification, dead-letter outbox
  on final failure), `cachedCardPng` / `renderCardPngCached` for cards,
  `groupChatsByTz` for tz|lang grouping, `pruneChats` for dead-chat removal.
- **The architectural precedent** (confirmed): `notify-status.ts`
  (`detectStatusChanges`) is the exact structural twin of goal detection — a
  KV prev-map vs the tick's fresh rows, write-only-when-changed, fail-closed
  (map save failed ⟹ alerts suppressed), per-event fan-out with per-lang
  buckets. The channel-mirror DISCOVERY §7 discipline (one hook per
  notification family at the event boundary, zero new schedulers/providers)
  governs the wiring.

## 2. The provider reality check (the honesty gate)

- **Goal alerts: FEASIBLE** from score deltas in the LIVE sweep. The tick's
  merged pool carries `score.fullTime` per live match; a per-match
  last-known-score snapshot + delta comparison at tick time yields goal
  events with side attribution (which of home/away incremented). The data
  carries NO scorer names, NO minutes, NO red-card/yellow-card flags on this
  tier — the alert text must never invent them.
- **Red-card alerts: NOT FEASIBLE with the wired providers.** football-data
  v4 free tier exposes no live incidents endpoint (verified: the wired
  surface is fixtures+scores only); the LIVE sweep's shape carries scores
  only; sportscore's wired day-fixture payload carries `status` +
  `home_score`/`away_score` (the incident/scorer detail the website's
  enrichment uses is a per-event detail fetch, NOT part of the sweep, and
  carries no card data either). **Decision: red-card alerts are scoped OUT
  with a DECISIONS entry (S19-3); never fabricated, never half-guessed.**
- **The S18 lesson applied:** this prompt's "verified facts" matched the repo
  (taxonomy, fan-out shape, cron cadence, persistence tier, D1 PK) — no
  numbering reconciliation needed this time. One adjustment: the scheduled
  S17+S18 page-level verification job was not in the scheduler; re-created.

## 3. Timing reality for verification

Mid-November 2026 is an international break: football-data returns ZERO
big-5/CL matches for Nov 14–19 (probed live); the club calendar resumes
Fri Nov 20 19:30 UTC (Bayern–Köln, the HANDOFF's no-deploy window). A live
end-to-end goal alert therefore CANNOT fire during this session — the code
path is proven by the seeded harness + the local wrangler-dev smoke + the
check gates; the first natural live goal lands Nov 20+ (outside this
session, honestly reported).

## 4. Design (what S19 builds)

One new module `src/goal-alert.ts` (the notify-status.ts structural twin)
hooked into `runNotifyPhase` after `detectStatusChanges`, before
`sendMatchNotifications`:

1. **Snapshot layer** — one compact KV key `goal_snapshots_v1`
   (`{ [matchKey]: {h, a, ts} }`, TTL 2 days, write-only-when-changed — the
   `match_status_v1` discipline). Population gate per match: kickoff inside
   [−6h, +4h] AND (LIVE/IN_PLAY/PAUSED or FINISHED) AND a REAL score
   (`score.fullTime.home/away != null`). MISSING-IS-NOT-ZERO: no real score
   ⟹ no snapshot row, no event — never a fake 0-0.
2. **Delta law** — first sighting seeds, never fires (an outage-recovery at
   2-0 is not 2 goal events). Subsequent ticks: `dh = h−ph`, `da = a−pa`.
   `dh>0 ∧ da=0` home goal; `da>0 ∧ dh=0` away goal; both >0 one combined
   event (the order is not in the data — never invented). Backward movement
   (score correction/disallowed goal) updates the baseline silently, fires
   nothing. Provider gap mid-match: the prev row is RETAINED (the match is
   in-window), so the next good sweep computes the delta from the
   last-known score — the missed goal(s) arrive late, never as a burst.
3. **Claim + send order (the two-layer write-first)** — per event: budget
   reservation (full/lean/defer, the v13.94 semantics) BEFORE any write;
   then the D1 per-goal claim `saveNotifiedMatch(match, "goal:<h>-<a>")`
   (fail ⟹ no send, baseline NOT advanced — the delta recomputes next
   tick); then the fan-out; the KV snapshot advances ONLY rows whose events
   were claimed or had no events (a deferred/failed claim keeps the OLD
   score so the next tick recomputes the same delta). The final KV put is
   write-only-when-changed; a failed put is safe (D1 claims block any
   double-send; unclaimed deltas retry).
4. **Fan-out** — audience = chats with `userFollowsMatch(...) !== null`
   (EITHER side; the Task 19-2 reuse of team follows), grouped by tz|lang,
   Persian-first compact alert («گُل!» headline, teams, competition, the
   score line in Persian digits, the scoring-side attribution, the multi-goal
   «دو گل!» variant), English twin for en chats, `withChannelCta`, the card
   from `cachedCardPng` ONLY (cache-only — the v13.94.1 CPU-keeper law for
   timing-critical bursts; text fallback per chat), dead-chat pruning, the
   existing outbox on transient failure. Per-tick unit cap (CONFIG) bounds
   the Saturday-slate worst case.

## 5. Budget statement (free tier)

- **KV reads:** +1/tick with live-scored matches in-window (the snapshot
  read), 0 on quiet ticks. The KV read quota is the chronic pain — the gate
  (live matches with real scores exist) means the cost is paid exactly when
  the product needs it.
- **KV writes:** ≤1/tick, ONLY when a score/status/entry actually changed
  (write-only-when-changed). Bounded by real goals + live-window
  entries/exits ≈ 30-60 writes on the busiest Saturday slate vs the
  1,000/day quota and the existing ~150-300/day burn — well inside.
- **D1 writes:** one per goal event (the claim) + the existing per-chat
  delivery ledger rows — a 3pm-Saturday burst of ~6 goals ≈ 6 claims +
  ledger rows, invisible against the 100k/day tier.
- **Subrequests:** the fan-out rides the SAME per-tick ~50 budget with the
  reservation gate BEFORE any claim (defer = clean, retried next tick from
  the retained baseline). Cache-only cards: no resvg renders on the goal
  path (the 10ms CPU cliff law).
- **CPU:** the detection pass is O(live matches) map compares; the compose
  is string building. No new sweep, no new cron, no new provider.

## 6. Out of scope (recorded, not built)

- Per-match subscriptions (`/follow match`, deep links) — S20 backlog.
- Channel-mirror goal posts — S20 backlog (the S19 brief's no-scope-creep
  rule; the claim-key shape `channelEventKeyMatch` extension is designed but
  not wired).
- Red-card alerts — scoped out (no real incident source; DECISIONS S19-3).
- Alert pacing / quiet hours — S20 preview items.
