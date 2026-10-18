# SportSignal — the Fixture-Aware Scheduler (v13.118-fixsched)

> The operator contract for the match-aware backend activity modes, the
> stale-live guards (the 4 AM screenshot bug), the polling policy table, the
> fallback behavior and the operational controls. Code: `src/scheduler.ts`
> (the pure decision layer) + `src/cron-pool.ts` (the wiring). Tests:
> `scripts/check-scheduler.js` (~110 checks; the task's 16 required
> scenarios). The Baku-time reference lives in
> `docs/spec-pack/european-football-time-coverage-spec-pack/`.

## 1. The problem this solves

Two defects shared one root cause — **the backend's activity was decoupled
from the actual fixture calendar**:

1. **Unnecessary workload.** The 10-min cron tick is fixed (Cloudflare cron
   triggers are static config — they cannot be rescheduled from inside a
   Worker), and the full 3-provider sweep ran every 2h **around the clock**
   even when no relevant fixture existed for days. Worse, a stuck provider
   row (a match whose final status was never confirmed — the sportscore
   day-window rolls at UTC midnight for EL/ECL/cups/PGL; provider outages
   leave `IN_PLAY` behind) kept `isActiveTime` true **forever**: every tick
   ran a live sweep, 24/7, for a match that had ended hours ago.
2. **The 4 AM screenshot bug.** Matches rendered as "playing" 6–7 hours
   after they finished. Three compounding layers: the pool kept the stale
   `IN_PLAY` row, the live overlay (6h TTL, ±6h window) re-patched it into
   every served payload, and nothing — `pubMatch`, the `upcoming` filter,
   the hero pick, the client — ever compared the row's kickoff against the
   clock.

## 2. The mode layer (`src/scheduler.ts`)

Pure functions (`computeFixtureSignal` / `decideActivity`) turn the
**consolidated tier** (`shouldReport` — the existing important-match
definition, UNCHANGED) into a mode + policy. Deterministic, stateless,
mock-clock-friendly; the tick recomputes from KV every 10 minutes, which is
what makes restarts, deploys and missed timers self-healing.

| Mode | Condition (fixture-first) | Full sweep cadence | Live sweep | Client pollHint |
| :--- | :--- | :--- | :--- | :--- |
| `LIVE` | live status on a plausibly-live row (kickoff within 195min), **or** kickoff passed while status is still SCHEDULED/TIMED (the Mode-D fixture fallback) | 2h | every tick | 60s |
| `POST_MATCH` | FINISHED within 195min (confirmation), or live-status row between 195–240min past kickoff (unconfirmed finish) | 2h | every tick | 90s |
| `PRE_MATCH` | kickoff within 60min (`ACTIVE_WINDOW_AHEAD_MS`) | 2h | every tick | 60s |
| `UPCOMING` (soon) | kickoff within 6h | 2h | ~20min slots (`:00/:20/:40`) | 120s |
| `UPCOMING` (far) | next kickoff within 48h | 2h | none | 300s |
| `IDLE` | nothing relevant within 48h **and** the feed is trusted (a *successful* empty sweep is a legitimate empty calendar) | **6h discovery** | none | **900s** |
| `DEGRADED` | the feed failed recently (`feed_fail_v1`, TTL 12h — a FAILED sweep is never "no football") | 2h inside the 13:00–02:00 Baku fallback window, 4h outside | slots inside the window | 120s / 300s |

Notable properties:

- **Zombies** (live status, kickoff > 195+45min past) are counted for
  observability but **never re-arm sweeps** — the old 24/7 runaway engine.
  The pool write reconciles them to FINISHED (last-known score kept).
- **The Baku fallback window is a fallback, never a filter**: Asia/Baku is
  UTC+4 year-round (no DST since 1991) so the 13:00–02:00 window is pure
  minute-of-day arithmetic (the v13.116-tzproof doctrine — no Intl, no colo
  quirks). Valid fixtures outside it are processed identically (scenario 13);
  real fixture data always overrides the window.
- **European DST** shifts a fixture's UTC instant, never our arithmetic: every
  comparison is an epoch-ms diff against the provider-supplied instant
  (scenarios 10–11).
- The pre-match activation window, the 195min post-match confirmation window
  and the important-match definition reuse the **existing** CONFIG constants
  (`ACTIVE_WINDOW_AHEAD_MS`, `ACTIVE_WINDOW_BEHIND_MS`) — one doctrine.

## 3. The stale-live guards (four independent layers)

| Layer | Where | What |
| :--- | :--- | :--- |
| Serve: payload build | `public-matches.ts` `fetchPublicMatches` | `reconcileStaleLive(matches)` downgrades implausible live rows **before** every consumer shapes them (upcoming/finished filters, hero, topSpot, cups, UCL, week lists) |
| Serve: row shaping | `public-matches.ts` `pubMatch` | emits `FINISHED` (minute nulled, scorers dropped, **last-known score kept**) for any live row past the span |
| Serve: overlay | `public-matches.ts` `applyLiveOverlay` | sanitizes every served payload (fresh KV / stale SWR / 7-day snapshot) and **heals stale overlay rows** — the pre-fix blob that used to re-animate finished matches can no longer win over fresher data |
| Durable | `match-pool.ts` `cacheMatches` + `cron-public.ts` overlay write | the pool persists the downgrade **after the 45min confirmation grace** (span+grace = 240min); the overlay is *written* healed |

A genuinely long match (extra time, penalties — up to ~150min of football)
never trips the 195min span; only implausible rows do. The overlay TTL
(6h) and the ±6h window are unchanged — they just can't serve a lie anymore.

## 4. Frontend + API polling (section 7)

- The payload now carries **`pollHint`** (seconds) + **`schedMode`** — the
  client (`assets/public-13.27.js`) reads it through a 5s master tick and
  polls at the backend's cadence: 60s live/pre-match, 900s idle, 60s
  fallback when no hint rides along. A tab left open on a quiet day drops
  from 1440 polls/day to ~96.
- The client also carries a local twin of the stale-live guard
  (`__sanitizeData`) — belt and braces for any cache layer that outlives the
  server guard.
- Concurrent requests remain deduplicated by the existing SWR refresh lock +
  60s edge-cache layer (scenario 15) — untouched.

## 5. Observability

- **`/healthz`**: `sched_mode`, `sched_reason`, `sched_live_sweep`,
  `sched_poll_hint_sec`, `sched_live_now`, `sched_stale_live`,
  `sched_feed_ok`, `sched_next_ko`, `sched_next_wake` (zero extra KV reads —
  the verdict rides `cron_status_v1.sched`).
- **`cron_status_v1.sched`** (compact keys): `m` mode, `r` reason, `ls`
  live-sweep policy, `ph` poll hint, `nk` next kickoff epoch, `wa` next wake
  epoch, `lv` live rows, `sn` stale rows, `fo` feed-ok.
- Tick logs: every mode **transition** logs `🔄 Scheduler: A → B (reason) —
  next kickoff …, next wake …`; quiet-tick logs carry the mode inline.
- The reconcile guards log `🧹 Stale-live reconcile: N …` /
  `🧹 Pool reconcile: N …` when they act.

## 6. Configuration (all in `CONFIG`, flat keys per convention)

| Key | Default | Meaning |
| :--- | :--- | :--- |
| `SCHED_MAX_LIVE_SPAN_MS` | 195min | the plausibility span (= `ACTIVE_WINDOW_BEHIND_MS`); beyond it a live status is stale |
| `SCHED_CONFIRM_GRACE_MS` | 45min | POST_MATCH confirmation grace before the pool persists the downgrade |
| `SCHED_UPCOMING_SOON_MS` | 6h | the "within N hours" refresh tier (slot cadence) |
| `SCHED_IDLE_HORIZON_MS` | 48h | a known fixture beyond this still rides the 2h maintenance cadence |
| `SCHED_IDLE_DISCOVERY_MS` | 6h | IDLE fixture-discovery cadence (the far-cup probe keeps its own 4h cron) |
| `SCHED_DEGRADED_IN_MS` / `_OUT_MS` | 2h / 4h | feed-fail fallback cadences (inside / outside the Baku window) |
| `SCHED_FEED_FAIL_MS` | 12h | how long a feed failure keeps DEGRADED armed |
| `BAKU_WINDOW_OPEN_MIN` / `_CLOSE_MIN` | 780 / 120 | the 13:00–02:00 Asia/Baku fallback window (spec pack) |
| `KV_FEED_FAIL` | `feed_fail_v1` | the feed-failure marker key (TTL-bounded) |

## 7. Failure & recovery semantics

- **A failed sweep ≠ an empty schedule.** All-sources-empty writes
  `feed_fail_v1` (12h TTL); a successful non-empty sweep deletes it.
  DEGRADED is conservative but bounded (2h/4h cadences, slot-gated live
  sweeps — never uncontrolled high-frequency requests).
- **Restart / missed timers**: the verdict is recomputed from KV on every
  tick (pool + marker + last-sweep) — nothing lives only in memory. The
  execution lock (single-flight) and the SWR refresh lock prevent duplicate
  jobs across concurrent invocations.
- **Postponed / rescheduled fixtures**: the signal recomputes per tick; a
  POSTPONED row with a future slot counts toward next-kickoff discovery but
  never arms the pre-match/soon/started windows (scenario 8).

## 8. Measured effect

- Full sweeps on a no-fixture day: **12/day → 4/day** (IDLE 6h discovery).
- Stuck-live rows: **144 live sweeps/day → 0** after the 45min grace (the
  runaway killer); display fixed instantly by the serve guards.
- Idle-tab polls: **1440/day → ~96/day** (60s → 900s pollHint).
- Matchday behavior is UNCHANGED where it matters: LIVE/PRE_MATCH keep the
  10-min live-sweep cadence and the 60s client poll (the existing latency
  contract); the within-6h tier *gains* the ~20min status refresh (better
  postponement detection) — a deliberate, bounded increase.
- Live before/after healthz captures: `docs/SCHEDULER.md` §9 (deploy day).

## 9. Rollback

`npx wrangler rollback` (RUNBOOK §2) — the change is additive: one new
module, one new KV key (`feed_fail_v1`, TTL-bounded), new payload fields
(`pollHint`/`schedMode` — additive), new healthz fields (additive), new
`cron_status_v1.sched` blob field (additive). No KV schema renames; the
asset rename (`public-13.26.js` → `public-13.27.js`) is cache-busting only.
