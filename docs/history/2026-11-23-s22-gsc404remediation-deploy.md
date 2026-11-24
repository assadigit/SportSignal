> Agents: read AGENTS.md in the repo root first, and follow it for this whole task.

# 2026-11-23/24 — S22: the GSC 404 remediation deploy (v13.279.0-gsc404remediation)

## The owner-approved deploy (2026-11-23 ~22:30 UTC — DEPLOYED + LIVE-VERIFIED)

The fix-phase session had left the tree BUILT+GATED on
`fix/gsc-404-remediation` awaiting the owner's Step-4 checkpoint. The owner
replied: "I approve, Push commit merge deploy." Executed in this session, in
the deploy-plan order (merge → push → test → no-live-window deploy →
live-verify → the three KV writes → the full re-probe):

- **Branch/merge/push:** `origin/fix/gsc-404-remediation` = `c58a814`
  (ls-remote verified, all 7 commits already pushed). Full suite re-run:
  `npm test` exit 0, **3,963 OK / 0 FAIL**. Fast-forward merge
  `ba90b8a → c58a814` on `main`; push → `origin/main` = `c58a814`
  (ls-remote verified).
- **No-live window:** pre-deploy `/healthz`: `sched_live_now: 0`, next
  kickoff `2026-11-24T20:00Z` (~21h out — the UCL matchday), outbox 0,
  degraded false. Ideal quiet gap.
- **Deploy:** `npx wrangler deploy` 2026-11-23 ~22:33 UTC — **Version ID
  `2803a28f-9f23-4896-9fa9-05e49a779e65`**, commit `c58a814`. All bindings
  intact (STATE KV, STATS_DB, USERS_DB, DRAIN_SELF, AI, the channel vars);
  the `*/10 * * * *` cron re-armed; upload 4310 KiB (gzip 1484), startup
  29 ms.
- **Version flip + bot health:** `/healthz` post-deploy:
  `"version":"13.279.0-gsc404remediation"`; at ~23:20 UTC `ok:true`,
  `degraded:false`, heartbeat/cron age 6 min, outbox 0, pool 510,
  `kv_writes_day: 630` (writes succeeding — no quota lockout from the
  script legs).

## The three one-time KV writes (fresh pre-write backup first)

Backup (AGENTS.md §6): `/home/z/work/backups-2026-11-23/` —
`seo_archive_v1-20261123-224058.json` (180 rows) +
`matches_v13_tracked-20261123-224058.json` (510 rows), both parse-verified.

1. `seed-lost-cup-ties --write` — the 2 lost DFB-Pokal Round-2 ties seeded
   (blob 180 → 182, both per-match keys written).
2. `backfill-archive-keys --write` — 171 per-match keys (pre-existing rows).
3. `backfill-smallmarket-archive --write` — 340 FD-verified candidates →
   blob 182 → 522 rows. **Interrupt:** the session tool's 10-minute command
   window killed the process during the key phase (~319/340 keys; the blob
   write itself completed first — no partial-blob state). The key completion
   ran ~00:03 UTC 2026-11-24 via a `backfill-archive-keys --write` re-run
   (idempotent diff — writes only missing keys; the fresh UTC quota day made
   it quota-safe): **103 keys written** — the interrupt's ~21 leftovers plus
   ~82 rows the runtime's new all-FINISHED scope had meanwhile merged into
   the blob during the sweep window without their keys landing. Final
   live-verified invariant: blob 650 rows → **641 unique slugs = 641
   per-match keys = the 641-URL archive sitemap child** (9 same-day
   duplicate-slug rows — earliest-kickoff keeps the key, by design). Interim
   correctness was unaffected (blob fallback).

## The live re-probe (Step 5) — all families pass

All 14 frozen 301-map entries → 301 → mapped targets (Levante twin
`…-11-01 → …-10-31` included); both seeded cup ties → 200; `a-league` →
410 + noindex; pattern-valid strangers → 410; malformed slug → 404;
`/`, `/healthz`, `/matches/today`, `/teams/tottenham` → 200; the
`/teams/1-magdeburg` fallback shell → 200 + `noindex, follow`;
`/matches/real-madrid-vs-psv-2026-11-24` → 200 + indexable; workers.dev
stays `noindex, nofollow`. **The paced archive-child sweep: 641/641 URLs
render 200.** Sitemap children: pages 15 / competitions 7 (a-league
absent) / teams 13 / upcoming 105 / archive 641.

The 503-transient note (honest): during the sustained sweep, 107
still-in-pool recently-finished rows intermittently 503'd (the documented
free-tier CPU cliff on the pool-HIT full-context render — unchanged by
design; P6 lite-weights only the pool-miss path). Every URL recovered to
200 across the three recovery passes. Not a regression; a P6-style lite
render for pool-HIT finished rows is a recorded watch item.

Full details: `docs/audits/2026-11-23-gsc404-remediation.md`.

## Rollback

`wrangler rollback` (previous: 13.278.0-farsisitename, Version ID
`0f3fc73d-5fc0-4dc1-a326-c4edb6606db6`); KV restore from the 22:40 UTC
backup; the script keys TTL out at 370d; git revert = the 7-commit
reversal of `c58a814`.

Credentials used, not stored (session-local env file outside the repo);
the owner should rotate every token shared in chat after the session.
