# 2026-11-17 — Session 19: Goal Alerts (the Telegram alerts track, part 1 — the live goal alerts + the subscription/persistence/distribution machinery)

> Agents: read AGENTS.md in the repo root first, and follow it for this whole task.

Wall-clock note: the session ran 2026-11-17 ~18:55–20:30 UTC (Tehran
evening). Per the owner's S19 prompt; the audit is
`docs/audits/2026-11-17-goal-alerts-audit.md` (committed first, `b47558b`).

## 0. Session start reconciliation

- Baseline verified: fresh clone, `main` @ `7a37619` (the S18 close), `npm
  install`, **`npm test` EXIT 0 / 3,789 OK / 0 FAIL**, `npx tsc --noEmit`
  clean.
- **The S17+S18 page-level live verification job was found MISSING from the
  scheduler** (the 2026-11-18T00:20 UTC job the S17/S18 reports scheduled —
  it never fired and no result exists). It was RE-CREATED during this
  session's start — first as a one-time 00:20 UTC job, then (when the cron
  scheduler's clock proved to run ~3.5h ahead of real UTC — external
  authorities GitHub/Telegram both confirm the sandbox clock) as a pair of
  self-deleting jobs: a 30-min poller + a one-time backup trigger whose fire
  time lands after the real UTC-midnight KV reset under every clock
  interpretation. The job verifies `/healthz ok:true` + the FAQPage/editorial
  cards on the live pages and makes the `seo(s17-verify)` docs commit if all
  pass. Live
  `/healthz` at session start: `ok:false` + `pool_matches:0` + `version:
  13.271.0-content` — the documented KV read-quota exhaustion (crossed
  ~11:05 UTC Nov 17; resets UTC midnight), NOT a failure; the version proved
  the S18 deployment was serving @100%.
- The prompt's "verified facts" matched the repo audit exactly (taxonomy,
  fan-out shape, cron cadence, persistence tiers, D1 PK) — no numbering
  reconciliation needed this time (the S18-4 contrast).

## 1. What S19 built (the three milestones, one module)

`src/goal-alert.ts` (the `notify-status.ts` structural twin — the
event-boundary notification precedent; one hook in `runNotifyPhase` right
after `detectStatusChanges`, before the engine, own try/catch):

- **S19-M1 — the detection layer.** One compact KV map `goal_snapshots_v1`
  (`{ [matchKey]: {h, a, d} }`): the last-known score of every in-window
  LIVE match (kickoff inside [−6h, +4h], a REAL `score.fullTime` required).
  MISSING-IS-NOT-ZERO: no real score → no row, no event, never a fake 0-0
  (the sportscore pre-kickoff 0-0 trap stays dead at this layer too).
  Write-only-when-changed (the `match_status_v1` discipline), TTL 2 days.
  The delta law: fresh live score vs snapshot → goal events with score-side
  attribution; FIRST SIGHTING SEEDS, NEVER FIRES (an outage-recovered 2-0 is
  not 2 goal events); BACKWARD movement (a provider correction) advances the
  baseline silently; a provider gap mid-match RETAINS the prev row (and a
  match absent from the sweep entirely keeps its in-window row) so the next
  good sweep fires the missed goal(s) once, late — never a burst.
- **S19-M2 — the claim + the audience.** The per-goal dedupe rides
  `notified_v1` VERBATIM (the D1 write-first `INSERT OR IGNORE`; zero schema
  change — `ntype` is TEXT) with the ntype `goal:<h>-<a>` — the score tuple
  AFTER the goal: a 2-1 then 3-1 match alerts twice; a re-sweep of the same
  3-1 alerts zero times; at most one alert per score tuple per match ever.
  The audience is the EXISTING team-follow subscriptions
  (`userFollowsMatch` one/both): a goal fans out to chats following EITHER
  side — zero new subscription surface, zero new bot commands.
- **S19-M3 — the send path.** The existing transport (`sendTelegram`:
  retries, 429 pause-wait, subrequest gate, dead-letter outbox, dead-chat
  classification → `pruneChats`) + the per-chat delivery ledger
  (`notify_deliveries_v1`). The card from `cachedCardPng` ONLY (cache-only —
  the v13.94.1 CPU-keeper law; a cache miss degrades to text, never a fresh
  resvg render on a goal burst). The compact Persian-first alert —
  «⚽️ *گُل!*» + the bold teams line (🆚) + the italic competition + «نتیجه:
  *۲\-۰*» in Persian digits + the «✳️ گلِ X» side attribution, the «۲ گل برای
  X» multi-goal variant, the both-sides variant crediting both WITHOUT
  inventing an order, and the English twin for `en` chats — never scorer
  names or minutes (the sweep carries neither). `withChannelCta` rides it
  (identity while unconfigured… the channel IS configured in production, so
  the channel-link CTA rides the goal alerts like every other notification —
  the parity law, no channel POST is made; that's S20 backlog).

**TWO-LAYER WRITE-FIRST (the core invariant):** the budget reservation
(full/lean/defer, the v13.94 semantics — lean = text-only applies to every
goal unit since the text IS the payload) runs BEFORE any write; the D1 claim
persists BEFORE any send (a failed claim = no send + the baseline NOT
advanced, so the delta recomputes next tick); the KV snapshot advances ONLY
rows whose events were fully processed (deferred/cap-exceeded/claim-failed
events keep the OLD score). A failed snapshot put is safe by construction:
persisted D1 claims block any double-send and unclaimed deltas retry. Cap:
`GOAL_ALERT_MAX_UNITS = 6` goal fan-outs per tick (audience-size-sorted) —
the tail rides the next tick with an accurate score line.

## 2. The honesty gate (the red-card scoping)

**Red-card alerts are SCOPED OUT (DECISIONS S19-3).** The audit verified
against the wired providers: football-data v4 free tier exposes fixtures +
scores only (no live incidents endpoint); the LIVE sweep's shape carries
scores only; sportscore's wired day-fixture payload carries status +
scores (the per-event detail the WEBSITE's scorer enrichment uses carries
no card data and is not part of the sweep). No real incident source → no
red-card alerts, never fabricated, never half-guessed. Channels: S20
backlog (DECISIONS S19-5) with the per-match subscription UX
(DECISIONS S19-7 note).

## 3. The gates + the harness

- `scripts/check-s19-goalalert.js` — 52 gates (STATIC: the cron-notify
  wiring + own try/catch, the claim through `saveNotifiedMatch`, the
  two-layer order, the write-only-when-changed snapshot store, the cap, the
  cache-only card law, the EITHER-side audience, zero new
  schedulers/providers (`crons` unchanged `*/10` + `27 */4`, the module
  fetches NOTHING), the version triple, no red-card fabrication; BEHAVIORAL:
  the REAL `liveScoreOf` / `buildGoalSnapshots` / `diffGoalEvents` /
  `goalNtype` / `goalFanoutVerdict` / `formatGoalAlert` extracted from the
  concatenated worker source with stubbed seams — the check-kickoff
  pattern). Wired into the `npm test` chain: **3,789 → 3,841 OK, exit 0**;
  `npx tsc --noEmit` clean.
- `scripts/s19-goal-smoke.ts` — the seeded end-to-end harness (the
  s17-faq-smoke/s18-content-smoke pattern), **22/22**: the 0-0 → 1-0 → 2-0
  timeline through the REAL `detectGoalEvents` with the mock KV/D1 (the
  scripts/lib/mock-env.js statement surface) + a captured Telegram
  transport — the exact alert sequence (one per goal, the accurate score
  line each time), the EITHER-side fan-out (a home-only follower receives
  the away goal too; a non-follower receives nothing), the re-sweep zero,
  the provider-error gap (no alerts during, the baseline retained, exactly
  ONE goal on recovery — not a burst), the fail-closed D1 outage (nothing
  sent; the next healthy tick re-derives it exactly once), the null-score
  MISSING-IS-NOT-ZERO seeding, the engine composition regression
  («مسابقه شروع شد» + «نتیجه نهایی ۴\-۱» unchanged), and the compact-map
  sanity.
- `scripts/s19-seed-local-kv.js` — the LOCAL-only wrangler-dev seeder (the
  s18-seed-local-kv.js pattern): a pool with ONE live match (kickoff ~2h
  past — inside the goal window, OUTSIDE the engine's match-start window so
  only the goal layer can fire) + a follower chat in the local USERS_DB.

## 4. The deploy + the verification (what was verified live vs via harness)

- Version bump `13.271.0-content` → **`13.272.0-goalert`** (the version
  triple: `src/config.ts` + `package.json` + the refreshed lock (the K2
  gate caught the stale lock — reinstalled) + the `check-stats.js` LIVE
  pins + the CHANGELOG entry).
- Local wrangler-dev smoke: `/healthz` 200 with `version:
  13.272.0-goalert` + `ok:true` + `pool_matches:1` (the seeded live pool
  read through the real KV binding) + the homepage 200 — **the worker boots
  clean in the real workerd runtime with the new module graph.** The
  miniflare cron-test endpoint (`--test-scheduled` →
  `/cdn-cgi/handler/scheduled`) is BLOCKED in this sandbox by a wrangler
  4.50 proxy bug (`DataCloneError: Could not serialize object of type
  "ScheduledController"` — the scheduled handler never receives the event;
  reproduced with and without `[triggers]` in the dev config; the temporary
  trigger addition was reverted). This is LOCAL TOOLING, not worker code —
  production cron fires through Cloudflare's real scheduler, and the tick
  logic is proven by the 22/22 harness through the REAL
  `detectGoalEvents`.
- Versioned deploy per RUNBOOK §2 (after a fresh `git fetch` — no remote
  drift): `npx wrangler versions upload` → `versions deploy --version-id
  7c54e223-b39f-4c9f-9bde-ea7d06047610 --percentage 100 --yes`
  (2026-11-17 ~20:05 UTC; outside the Nov 20 Bayern–Köln windows).
- **Live-verified (deploy level):** `/healthz` reports `version:
  13.272.0-goalert` — the new version IS serving production traffic at
  100%; the homepage serves 200. The `ok:false` + `pool_matches:0` fields
  were the STILL-ACTIVE KV read-quota exhaustion at deploy time — **the
  post-reset confirmation (2026-11-18 ~11:19 UTC): `/healthz` `ok:true` +
  `pool_matches:342` + `version: 13.272.0-goalert`** — the deploy-level
  verification is complete (the `seo(s17-verify)` docs commit records it
  together with the S17/S18 page-level checks).
- **Bot surface (read-only, no messages sent):** `getMe` ok (the bot is
  alive); `getWebhookInfo` ok — the webhook `https://football.sportsignal.ir/webhook`,
  0 pending updates, no errors (the command surface incl. `/follow` is
  wired to the new deployment).
- **Honest limits:** the Nov 14–19 international break means ZERO live
  matches until Fri Nov 20 19:30 UTC (probed football-data live: 0 big-5/CL
  matches Nov 14–19; the club calendar resumes Bayern–Köln Friday). A live
  end-to-end goal alert therefore CANNOT fire during this session — the
  code path is proven by the harness + the check gates + the boot smoke;
  the first natural production goal lands Nov 20+ (the owner can watch for
  «گُل!» during Friday's match). The `/follow`-in-a-test-chat interaction
  needs the owner's own chat (commands arrive via the webhook when the
  owner types them — not drivable from here); the existing kickoff/result
  pushes are regression-proven at the composition level (harness PART 6)
  and structurally (the engine's `NOTIFICATION_CONFIGS` + reservation call
  byte-untouched, pinned by the new check gate).

## 5. Cloudflare budget (the statement)

- **KV reads:** +1 per tick WITH live-scored in-window matches (the
  snapshot read), **0 on quiet ticks** (the cheap gate builds the candidate
  row set before any read). The chronic 100k/day read pressure is not
  worsened on quiet ticks and the cost lands exactly when the product needs
  it.
- **KV writes:** ≤1 per tick, ONLY when a score/status/window membership
  actually changed (write-only-when-changed). Bounded by real goals +
  live-window entries/exits ≈ **30–60 writes on the busiest Saturday
  slate** vs the 1,000/day free quota and the existing ~150–300/day burn —
  well inside; the SOFT(700)/HARD(850) governors still hold via the tick's
  existing meter.
- **D1 (USERS_DB):** 1 write per goal event (the claim) + the per-chat
  ledger rows (the v13.102 discipline) — a 3pm-Saturday burst of ~6 goal
  units ≈ 6 claims + ledger rows, invisible against the 100k/day tier.
- **Subrequests:** the fan-out rides the SAME per-tick ~50 budget with the
  reservation BEFORE any claim (defer = clean, unclaimed, retried next
  tick from the retained baseline). Worst case per goal unit: 2 sends per
  chat (photo + text fallback) + 2 margin; 6 units × the roster ≪ the cap;
  overflow defers. Cards are cache-only: zero fetches, zero resvg renders
  (the 10ms CPU cliff law).
- **CPU:** the detection pass is O(live matches) map compares; the
  composition is string building. No new sweep, no new cron, no new
  provider, no client asset renamed (the SW cache stays `sportsignal-v126`
  — server-side only).

## 6. Decisions (details in docs/DECISIONS.md S19-1…S19-6)

- **S19-1** the snapshot store: one compact KV key (`goal_snapshots_v1`,
  the `match_status_v1` discipline) — not the live overlay (that is the
  public serve path's blob, gated on budget/headroom) and not the pool row
  (the pool is the full-sweep snapshot, not per-tick state).
- **S19-2** the event model: one alert per (tick, match, delta-side) keyed
  by the post-goal score tuple; multi-goal same-side ticks count honestly
  («۲ گل برای X»); both-sides ticks credit both without inventing an order.
- **S19-3** red-card alerts scoped OUT (no incident source on the wired
  providers — never fabricated). Revisit when a real incident source is
  wired.
- **S19-4** goals fire from LIVE rows only: a LIVE→FINISHED score delta
  does not fire (the FT push lands within minutes; post-FT provider
  corrections would otherwise fake goals); a FINISHED flicker back to LIVE
  is a first-sighting seed, never an event.
- **S19-5** channel-mirror goal posts + the sportscore scorer enrichment
  (scorer names/minutes on the alert) = S20 backlog.
- **S19-6** the alert shape: compact HT-alert-style (no promo footer — the
  goal is a live moment; `withChannelCta` rides it per the parity law),
  cache-only cards, lean/defer semantics for every goal unit, the 6-unit
  per-tick cap.

## 7. Handoff

- Deployed + version-verified live (`7c54e223…` @100%). The KV-quota reset
  (UTC midnight) + the re-scheduled 00:20 UTC job complete the S17+S18
  page-level verification; the first natural goal alert lands Nov 20+
  (Bayern–Köln Friday 19:30 UTC — also the no-deploy window M1 ~19:35).
- S20 preview (context, not started): the per-match subscription UX
  (deep-links, `/follow match`), red-card alerts IF a real source
  materializes, alert pacing/quiet-hours preferences, the channel goal
  posts + the scorer enrichment, the Workers AI enrichment ideas parked in
  `docs/telegram-channel-mirror/ENRICHMENT.md`.

Credentials used, not stored.
