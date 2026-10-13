# 🛠 SportSignal Runbook — Operations, Verification & Incident Response

> Applies to **v13.45+** (sightlines). The README describes the product; this file
> describes how to operate it. Everything here was learned the hard way — read
> before deploying, before debugging, and before touching `src/`.

Live: **https://sportsignal.ir** · Worker `ucl-notifier` · KV namespace `STATE`
(id `c63588df02ae4bf1bfdc18d19c5b3631`) · cron `*/10 * * * *` UTC · repo `main` only.

> **v13.95-accountmigration:** the deployment moved to a DEDICATED Cloudflare
> account on 2026-10-13 (was: shared with currena — the account-level KV write
> quota collision behind the error-10048 lockouts). New resource IDs:
> account `a796fdfe71819812119b8a494d3d39c1` · KV `STATE`
> `c63588df02ae4bf1bfdc18d19c5b3631` (preview `3d0548d6a5ef48679bb85d90db8dcfce`)
> · D1 stats `b371048b-4ae0-4ea5-9519-1d308390b700` · D1 users
> `c64064ff-aa78-4c73-80cd-e2805d550a5b` · workers.dev subdomain `sportsignal`
> (https://ucl-notifier.sportsignal.workers.dev). Secrets `WEBHOOK_SECRET`,
> `ADMIN_TOKEN`, `ADMIN_PASS` were REGENERATED during the move (secret values
> are write-only — the old ones were never recoverable). `API_TOKEN`
> (football-data.org) must be re-set by the operator if not yet done:
> `CLOUDFLARE_API_TOKEN=<token> CLOUDFLARE_ACCOUNT_ID=a796fdfe71819812119b8a494d3d39c1 npx wrangler secret put API_TOKEN`.

---

## 1. Access map

| What | Where | Notes |
| :--- | :--- | :--- |
| Code | this repo, `main` | `npm install` → done; no build step (wrangler bundles TS directly) |
| Deploys | `npx wrangler deploy` | needs `CLOUDFLARE_API_TOKEN` env; the token is NOT stored in the repo |
| Secrets | `npx wrangler secret list` / `secret put` | `BOT_TOKEN`, `ADMIN_TOKEN`, `ADMIN_PASS`, `API_TOKEN`, `WEBHOOK_SECRET`, `HEALTHCHECK_PING_URL`, optional `X_*` |
| KV state | REST API (see §8) | **`wrangler kv key get` CLI returns "Value not found" for keys that exist — always use the REST API** |
| Analytics | CF GraphQL `workersInvocationsAdaptive` | CPU/subrequest/outcome per invocation |
| Tail | `npx wrangler tail ucl-notifier` | quirks in §3 |
| Admin panel | `/admin` (login → HMAC cookie) | Bearer `ADMIN_TOKEN` for API calls |
| Monitors | healthchecks.io + UptimeRobot | user-owned accounts, see §5 |

**Version discipline:** `src/config.ts` `VERSION`, `package.json` version, and the
top `CHANGELOG.md` entry must agree on `major.minor` — `scripts/check-version-sync.js`
enforces it inside `npm test`. Codename suffix on VERSION (e.g. `13.45.1-sightlines`)
is the house style.

---

## 2. Deploy procedure

```sh
npm install          # node_modules is not committed
npm test             # MUST exit 0 — tsc --noEmit + 19 check scripts + 135 behavioral
                     # checks that eval-extract the REAL source (see §9 invariants)
npx wrangler dev --port 8787 &   # LOCAL SMOKE TEST — never skip on src changes:
curl -s http://127.0.0.1:8787/healthz   # must return the health JSON (not 500/1101)
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8787/   # 200
kill %1
# Why: tsc and every test regex parse/scan text — they cannot see runtime-only
# failures (the 2026-09-15 1101: 18 array elisions in ADMIN_OPS_ROUTES were
# legal TS, regex-invisible, and killed every request; caught only by the
# post-deploy healthz curl 90s after deploy + rollback).
npx wrangler deploy
```

Then do §3 (post-deploy verification). Never deploy with a red suite; never deploy
src changes without the matching `scripts/lib/worker-src.js` order/transform update
if signatures or files changed (the eval harness must co-evolve in the SAME commit).

`sw.js` `CACHE` is only bumped when **client-referenced assets change**
(`assets/core-*.js`, `public-*.js/css`, fonts). Server-side src changes do NOT
require a cache bump.

---

## 3. Post-deploy verification (do all of this)

1. **healthz immediately** — version must be the new one:

   ```sh
   curl -s https://sportsignal.ir/healthz
   ```

   Field semantics (see also §5, §6):

   | Field | Healthy | Meaning |
   | :--- | :--- | :--- |
   | `ok` | `true` (HTTP 200) | `heartbeat_age ≤ 30m` AND `last_cron_age ≤ 35m` AND `outbox_depth < 50`; else HTTP 503 |
   | `heartbeat_age_min` | ≤ 20 | minutes since a tick STARTED (`heartbeat`) |
   | `last_cron_age_min` | ≤ 25 | minutes since a tick COMPLETED (`last_cron` — the real liveness proof) |
   | `outbox_depth` | 0–2 | undelivered Telegram sends in `pending_sends_v1` |
   | `kv_writes_day` | < 700 | true measured writes today (incl. the completion blob's own put) |
   | `degraded` | `false` | the early-warning band (200 stays green): ages > 2 periods, or outbox > 10, or writes ≥ 700 |
   | `subreq_last_tick` | 24–32 quiet | true subrequest total of the last tick (fetches + KV ops) — see §7 profiles |
   | `kv_ops_last_tick` | ≈ `subreq` | the KV-binding share of that total |
   | `version` | = deployed | |

2. **Watch ≥2 full ticks complete.** Ticks run at `:00 :10 :20 :30 :40 :50` UTC.
   `last_cron_age_min` must drop to ≤10 twice in a row. Confirm the write meter
   advanced by the expected amount (quiet tick = exactly **2** writes:
   `execution_lock` + `cron_status_v1`).

3. **Tail quirks (learned 2026-09-15):**
   - Envelopes arrive at invocation **COMPLETION**, not start — a 6+ minute
     match-night tick lands in the tail minutes after the clock tick.
   - Tail sessions self-exit after ~7–10 min (code 0); plan windows accordingly
     and prefer healthz (`last_cron`) as the completion authority.
   - Expect noise: an invalid-webhook prober (~1/min, 403s) and occasional
     vulnerability scanners (`/.env` etc.) — not incidents.

4. **External dead man's switch (healthchecks.io)** — after deploy, confirm the
   check's ping log shows fresh pings at the tick cadence (user account). The
   burn test pattern (safe to re-run once): `GET {url}/fail` registers a fail;
   `POST {url}/fail` with a text body carries the error message into the alert.
   Path-suffix messages (`/fail/SomeMessage`) return 400 and do NOT register.
   One success ping per completed tick (lock-skips ping too — a skip means the
   cron fired and was handled). Recovery alert lands on the first post-incident
   success ping.

---

## 4. Rollback

```sh
npx wrangler deployments list     # find the previous Version ID
npx wrangler rollback            # rolls back to the previous deployment
```

KV schema is additive across versions (no renames, ever) → rollback is safe;
newer blob fields (`subreq_last_tick`, `kv_ops_last_tick`, …) are simply absent
and older code ignores them. The one ordering rule: **13.44.1+ writes the
completion blob LAST (prewarm moved before the fold)** — rolling back below
13.44.1 restores the prewarm-after-fold ordering (undercounted meter), not a
correctness issue for notifications.

If the worker is wedged and rollback is unclear: `npx wrangler deploy` from the
last known-good tag (`git checkout <tag> && npx wrangler deploy`) — deploy is
always forward-fixable.

---

## 5. Monitoring & alert semantics

Three watchers, deliberately disjoint failure classes:

| Watcher | Watches | Alert means | Cadence |
| :--- | :--- | :--- | :--- |
| **healthchecks.io** (dead man's switch) | the cron itself — `HEALTHCHECK_PING_URL` secret; success ping fires via `ctx.waitUntil` after each tick resolves, `/fail` POST (error name in body) in the scheduled-handler catch | cron never fired / worker hard-down / tick threw — **the class URL polling cannot see** (a hung or CPU-killed tick still serves healthz 200) | cron `*/10 * * * *` UTC, **grace 20 min** (match-night ticks legitimately run 6+ min wall; skips ping too) |
| **UptimeRobot** (or any HTTP poll) | `GET /healthz` — expect 200 | worker down / 503 tripped: heartbeat > 30m OR last_cron > 35m OR outbox ≥ 50 | 5 min, email alerts |
| **`degraded: true`** (in-band) | the early-warning band on every healthz read | trending toward 503: ages > 2 periods, outbox > 10, or `kv_writes_day ≥ 700` (SOFT governor) | every read |

Also in-band: the bot's own 6-hourly "✅ alive" heartbeat to the admin chat
(`heartbeat_sent_v1`), and the notification-gap audit (admin alert, rate-limited 1/6h
via `audit_alert_v1`) which found the Sep-13/14 outage casualties.

**Interpreting an UptimeRobot DOWN:** first `curl -s https://sportsignal.ir/healthz`
yourself. `ok:false` → read the three fields; `heartbeat` stale but `last_cron`
fresh = a tick started but none completed recently (CPU kills or long ticks —
check CF analytics for `exceededResources`); both stale = cron/worker dead → check
the hc.io check too. `outbox_depth` high = Telegram-side outage (see §10).
`degraded:true` with `ok:true` = watch, don't page.

**Interpreting a healthchecks.io DOWN:** the ping didn't arrive within 20 min of
the scheduled tick. Check: CF dashboard cron triggers, worker errors (analytics),
`/healthz` (if it still serves 200 with stale `last_cron`, ticks are dying
mid-run — look for `exceededResources` and recent deploys).

**Post-incident:** the first successful tick pings recovery automatically; no
manual reset needed. Verify `notified_matches_v6` gained the expected records for
anything that fired during the incident, and check the audit log line
("N notification gaps found out of M worthy matches") for casualties (see §9).

---

## 6. healthz coverage matrix (what it does NOT tell you)

Covered: heartbeat (tick start), last_cron (tick completion — the 13.43 fix),
outbox depth, true KV-write burn, degraded band, subrequest totals (13.45),
version, CORS-enabled for external dashboards.

**Not covered (known blind spots, all deliberate or accepted):**
- **KV-quota deferral**: if the write fails, the notification is skipped
  fail-closed (dedupe must persist before send) — healthz stays green. Symptom =
  a gap in `notified_matches_v6` for a match that was in-window. Investigate via
  §9.
- **Version drift** between live and repo — compare `version` against
  `CHANGELOG.md` top entry.
- **Provider death**: the KV pool keeps serving; staleness shows only as an old
  sweep in the tick logs / `last_api_source`. `/api/status` exposes the source.
- **Telegram outage**: visible only once outbox grows (depth > 10 → degraded).
- A **hung tick** between start and completion: `heartbeat` fresh, `last_cron`
  aging — this window is exactly what the 20-min-grace dead man's switch covers.

---

## 7. Known profiles & budgets (measured, not modeled)

| Profile | KV writes | True subrequests | CPU | Notes |
| :--- | :--- | :--- | :--- | :--- |
| Quiet tick | **2** (lock + completion blob) | 25–28 (≈25 KV ops; 0–3 fetches) | ~50 ms | pool reuse, 173+ worthy matches scanned |
| Active match-evening tick | 2–5 | **71–73** (≈46–48 KV ops + ~25 fetches) | ~50–100 ms | live sweep merged over pool; measured 2026-09-15 18:30Z |
| Full sweep (every `QUIET_SWEEP_MS` = 2h) | +8–15 (pool store) | **94 measured** (51 KV ops + 43 fetches; 2026-09-15 18:50Z) | ~100 ms | completed clean — see the enforcement note below |
| Match-night tick | 2–8 | varies | ~100 ms | **wall time up to 6.5+ min** (serialized via `execution_lock`) while healthz serves 200 |
| Web request (page/API) | 0–4 | 1–10 | 0.3–6 ms (prober) / ~25–100 ms (public-matches build) | public payload TTLs 300/720s; snapshot fallback on failure |
| Daily KV burn | — | — | — | measured 280–660/day on 2026-09-15 (matchday); free tier 1,000; governor SOFT 700 / HARD 850 |

**Subrequest enforcement (measured live, 2026-09-15):** a full-sweep tick
at a TRUE combined count of **94** (and an active-evening tick at 73) both
ran to completion — Cloudflare's 50-subrequest limit does **NOT count KV
operations**. The in-code gates (prewarm `<30`, notify-defer `>38`) sit on
the FETCH-only counter on purpose: that is the number CF actually meters.
`subreq_last_tick` in the blob/healthz is the combined SIGHTLINE (fetches +
KV ops + 1) — watch it for anomalies, but do not "fix" numbers above 50;
they are healthy. A tick that genuinely exceeds ~48 FETCHES is the real
failure class (watch the closing log line's `true subrequest total` split).

**Governor rules (never bypass):** SOFT (700) sheds cosmetic writes (public
prewarm, FA-AI learning); HARD (850) also holds the pool-cache write + pages the
admin once/12h. **The anti-spam set (dedupe records, outbox, execution lock,
status blob) is NEVER gated** — spam prevention beats budget pressure.

**CPU:** free plan = 10 ms rolling average. The Sep-14 outages (3 kill bursts,
48 total) were full-sweeps-per-tick on pre-13.43 code; 13.43 capped sweeps at
1/2h + cheap live sweeps between. If `exceededResources` reappears in analytics,
find which tick class is hot FIRST (tail + analytics), then fix that class.

---

## 8. KV operations

Read/write state via the REST API (the `wrangler kv key get` CLI is broken in the
sandbox — "Value not found" for existing keys):

```sh
curl -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  "https://api.cloudflare.com/client/v4/accounts/{account_id}/storage/kv/namespaces/c63588df02ae4bf1bfdc18d19c5b3631/values/<KEY>"
```

**Live keys (the contracts that matter):**

| Key | Writer | Purpose |
| :--- | :--- | :--- |
| `cron_status_v1` | every tick (final write) | heartbeat/last_cron ts, kv_writes_day, subreq/kv_ops_last_tick, notify breadcrumb `f/n/d/s/l`, budget |
| `telegram_users_v6` / `user_prefs_v1` / `user_profiles_v1` | bot + cron | registered chats, tz prefs, member profiles |
| `notified_matches_v6` | notifications (write-first, before send) | per-match×type sent records (the dedupe) |
| `pending_sends_v1` | telegram send failures | outbox, drained at tick start, 6 attempts max, exponential backoff |
| `matches_v13_tracked` | provider sweeps | the match pool (600+ matches incl. long-view) |
| `match_status_v1` | notifications | per-match status snapshots for change detection |
| `live_detail_` + `venue_v1_` | live enrichment (cron prewarm) + match-page renders | `live_detail_{fdId}`: scorer/minute/venue detail for live matches (TTL 90s, refetch-guarded); `venue_v1_{fdId}` (13.82): `{v:name\|null}` venue cache, 24h TTL positive AND negative, written ONLY from the match-page render path (fail-closed — any error renders the page without venue) |
| `public_matches_v1` + `cache:snapshot:v1` | public pipeline | live public payload (12-min TTL) + 7-day stale-serve source (the snapshot serves instantly when the payload expires — v13.52) |
| `live_overlay_v1` | cron tick (v13.52) | the live overlay: {id, teams, day, status, minute, score} rows for live/just-finished matches, written on every live change + full sweeps + ≥10-min top-ups while live (TTL 6h); the serve path patches it into every public response — a FINISHED game is purged from the live lists immediately |
| `fa_teams_ai` / `fa_venues_ai` / `fa_ai_last_run` | FA-AI learner (gated ≥15 min apart, marker only when work exists since 13.45) | AI-learned Persian names |
| `execution_lock` | tick start | overlap guard, `LOCK_TIMEOUT` 240s |
| `bot_settings_v1`, `clubs_catalog`, `varzesh3_clubs_v1`, `standings_*`, `weekly_tables_v1`, `last_api_source`, `heartbeat_sent_v1`, `audit_alert_v1`, `migration_v1`, `upd_<id>` (bot dedupe, TTL 600s) | various | settings/catalogs/audit |
| `x_*` (`x_enabled_v1` …) | REMOVED at 13.48-xtrim | none live (X never ran); see wrangler.toml restore note |
| `cup_scan_v1` | EFL/FA Cup team-scan marker (13.50) | "ok:<ts>"/"fail:<ts>"; ok = skip 5h, fail = 30-min backoff; hot window re-scans ≤30 min |

**Orphans (self-cleaning or inert — do not "clean up" without checking TTLs):**
`sched_v1:*` (156 keys, 7-day TTLs expire ~2026-09-22), `canary_match_v1` (TTL),
legacy never-read: `REGISTERED_CHATS_LIST`, standalone `heartbeat`,
`last_full_sweep`, `matches_v3/v4_store`. Deleting them is safe but pointless —
they cost reads nothing.

---

## 9. Investigate a MISSED notification

The invariant chain (where a send can die, in order):

1. **Pool** — was the match in `matches_v13_tracked`? (provider gap → §7 sweep
   cadence; check `last_api_source` + the sweep line in tick logs)
2. **Horizon** — notifications consider matches in **[-26h, +73h]** around now.
3. **Windows** — 7 types: `pre-match-72h` (big-match only, both-teams-followed),
   `pre-match-24h`, `pre-match-3h`, `pre-match-1h`, `pre-match-5min` (big only),
   `match-start` (+5 min grace after kickoff), `result` (post-match window);
   plus `match-start-big` / `result-big` broadcasts. Backfill floors/maxes cover
   ticks missed while a match was in-window.
4. **Dedupe write (write-first, fail-closed)** — `saveNotifiedMatch` must
   persist to `notified_matches_v6` BEFORE any send; a failed write = NO send
   (this is why quota pressure silences instead of spamming).
5. **Send** — `sendTelegram` ×3 retries → failure lands in `pending_sends_v1`.
6. **Outbox drain** — write-first too; 6 attempts then drop (dead-chat pruning).

Procedure:
```sh
# 1. Is there a sent-record for the match? key = normHome|normAway|utcDate[:16]:<type>
curl .../values/notified_matches_v6 | jq '.[] | select(.key | contains("elche"))'
# 2. Tick evidence: notify breadcrumb in the completion blob
curl .../values/cron_status_v1 | jq .notify
#    f=fired n=new d=deferred s=per-type sent l=last processed match
# 3. Gap audit: tail one tick — "N notification gaps found out of M worthy matches"
#    (Sep-13/14 CPU-kill outages left 6 such gaps: 24h/3h/1h/start legs missed,
#     results still delivered by post-match legs — the expected degradation mode)
```

If the record EXISTS but the user got nothing → Telegram-side (check outbox, bot
block status). If the record is ABSENT and the match was in-window → the write
failed or the tick died mid-run (cross-check `exceededResources` in analytics and
the hc.io ping log for that timestamp).

## 10. Investigate a DUPLICATE notification

The chain makes true duplicates near-impossible (write-first + MEM_DEDUPE seeded
only on successful KV put + outbox write-first). If one is reported:
1. Confirm it's not two DIFFERENT types (e.g. `match-start` then `result`) or
   two matches (derby + big broadcast overlap is intentional).
2. Check whether the duplicate came from the admin simulate/test path (labeled
   in the message) or a bot command reply.
3. Read `notified_matches_v6` for that match — two records with the SAME type
   and timestamps seconds apart = real duplicate → suspect an isolate boundary
   (MEM_DEDUPE is per-isolate) + a KV read miss; escalate to code inspection of
   `saveNotifiedMatch` (match-dedupe.ts) before touching anything.

---

## 11. Safety invariants (the "never do" list)

- **Never** weaken write-first dedupe (send-before-persist) — spam is worse than
  silence; the whole design trades missed sends under quota pressure for
  zero duplicates.
- **Never** rename/delete KV keys without a migration plan — the blob formats are
  versioned in the KEY NAME (`*_v6` etc.); orphans self-clean via TTL.
- **Never** edit `src/` signatures without co-evolving `scripts/lib/worker-src.js`
  (21-file concat order + transform rules) and the grabFn/grabVar regex asserts in
  the check scripts — **in the same commit**. The tests eval REAL source; if they
  pass while testing different code than you shipped, they are lying.
- **Never** let `npm test` pass with the version three-way out of sync.
- **No new runtime deps** (the one runtime dep, `@resvg/resvg-wasm`, is bundled
  via wrangler rules and must stay lockfile-covered — use npm, the repo's
  toolchain; `bun install` produces a broken lockfile).
- **Never** run `node scripts/refactor-extract.mjs` variants against the repo
  (removed in 13.46-trim — the extraction pipeline was one-way history).
- Subrequest ceiling is **50/invocation**; in-code gates keep fetch-tuned
  semantics (`<30` prewarm, defer notify `>38`) while the TRUE total is now
  measured (`subreq_last_tick`). Don't re-base the gates on the true total
  without sweep-tick evidence that the true total approaches the ceiling.

---

## 12. Sandbox/CI gotchas (environment-specific)

- The `CLOUDFLARE_API_TOKEN` lives in the operator's shell only — if a session
  dies, ask the user for it again; it is never in the repo.
- `wrangler kv key get` CLI lies (see §8) — REST API only.
- Tail quirks (§3): completion-time envelopes, ~7–10 min session life.
- No CI runs anything — `npm test` is a local gate, run it before every deploy.
- `npm test` includes `live-derby-test.js` (behavioral simulation, no network) —
  it must keep passing; it is the anti-regression for the public pipeline.
