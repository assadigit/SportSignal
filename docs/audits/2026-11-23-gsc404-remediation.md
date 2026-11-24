# GSC 404 Remediation — the deploy + live verification record (v13.279.0-gsc404remediation)

> Agents: read AGENTS.md in the repo root first, and follow it for this whole task.

Date: 2026-11-23 (~22:30–23:30 UTC; the 21-key completion ~00:05 UTC 2026-11-24).
What this records: the **owner-approved deploy** of the GSC 404 remediation
(merge → push → deploy → the three one-time KV writes → the full live
re-probe). The fix-phase code itself was built, gated and branch-pushed in
the previous session (`fix/gsc-404-remediation`, 7 commits, `npm test` green
3,963 checks, wrangler-dev smoke-verified — recorded in the v13.279.0
CHANGELOG entry). This document records the execution and the live evidence.

Owner approval (this session, verbatim): "I approve, Push commit merge deploy."

## 1. The deploy sequence (all steps run in order, each verified)

| Step | Evidence |
|---|---|
| Branch state verified | `origin/fix/gsc-404-remediation` = `c58a814` = local HEAD; working tree clean; `origin/main` = `ba90b8a` |
| Full suite re-run | `npm test` EXIT 0, **3,963 OK / 0 FAIL** (same count as the branch gate) |
| Merge | fast-forward `ba90b8a → c58a814` on `main`; `git push` → `origin/main` = `c58a814` (ls-remote verified) |
| No-live window | `/healthz` pre-deploy: `sched_live_now: 0`, next kickoff `2026-11-24T20:00Z` (~21h out), outbox 0, degraded false |
| Deploy | `npx wrangler deploy` 2026-11-23 ~22:33 UTC — **Version ID `2803a28f-9f23-4896-9fa9-05e49a779e65`**, triggers re-armed (`*/10 * * * *`), all bindings intact (STATE KV, STATS_DB, USERS_DB, DRAIN_SELF, AI) |
| Version flip | `/healthz` post-deploy: `"version": "13.279.0-gsc404remediation"` |
| Bot post-deploy | healthz @ ~23:20 UTC: `ok:true`, `degraded:false`, heartbeat/cron age 6 min, outbox 0, `kv_writes_day: 630` (writes succeeding), pool 510 |

## 2. The three one-time KV writes (each preceded by a fresh backup)

Pre-write backup (AGENTS.md §6, fresh right now): `/home/z/work/backups-2026-11-23/`
— `seo_archive_v1-20261123-224058.json` (180 rows, 129 KB) +
`matches_v13_tracked-20261123-224058.json` (510 rows, 210 KB), both parse-verified.

1. **`seed-lost-cup-ties --write`** — the 2 lost DFB-Pokal Round-2 ties seeded
   (Bayern 6–1 1. FC Magdeburg 2026-10-28; Dortmund 3–2 Werder Bremen
   2026-10-27): blob 180 → 182 rows + both per-match keys.
2. **`backfill-archive-keys --write`** — 171 per-match keys for the pre-existing
   archive rows (the P2-B lite path's bounded lookups).
3. **`backfill-smallmarket-archive --write`** — 340 FD-verified candidates in
   the GSC window written to the blob (182 → 522 rows). The session tool's
   10-minute window killed the process **during the key-writing phase**
   (~319 of 340 keys written; the blob write itself completed first, so no
   partial-blob state). The remaining keys were completed at ~00:03 UTC
   (quota-safe post-midnight window; see §5) — blob-fallback
   correctness was unaffected in the interim (rows without keys resolve via
   `loadArchiveMatch`'s blob fallback; the keys are the CPU-cost
   optimization only).

KV write budget note: the worker's own counter read 516 writes at 22:40 UTC
and 630 at ~23:20 UTC — the bot's writes kept succeeding throughout the
script legs; no quota lockout was observed (outbox 0, degraded false at
every check).

## 3. The live re-probe (the remediation report Step 5)

Probed by family (the composition of the GSC 220-404 finding):

| Family | Expect | Result |
|---|---|---|
| A — the frozen 301 map (all 14 entries) | 301 → mapped target | **14/14 PASS** (incl. the Levante–Atlético twin `…-11-01 → …-10-31`, the corrected audit row) |
| B — the 2 seeded cup ties | 200 | **PASS** both |
| C — `a-league` (the Gone set) | 410 + noindex | **PASS** (`x-robots-tag: noindex, nofollow`) |
| D — pattern-valid stranger slugs | 410 | **PASS** (2/2) |
| E — malformed slug | 404 | **PASS** |
| G — core surfaces (`/`, `/healthz`, `/matches/today`, `/teams/tottenham`) | 200 | **PASS** (4/4) |
| P5 spot — `/teams/1-magdeburg` fallback shell | 200 + noindex | **PASS** (`<meta name="robots" content="noindex, follow">` — the C1 crawlable precedent) |
| Upcoming match page (`/matches/real-madrid-vs-psv-2026-11-24`) | 200 + indexable | **PASS** (`index, follow, max-snippet:-1…`) |
| workers.dev guard (R-13) | noindex | **PASS** (`x-robots-tag: noindex, nofollow` on the workers.dev host) |

**The paced archive-child sweep (family F): all 641 URLs render 200.**
The sweep ran the full `sitemaps/matches-archive.xml` list (641 URLs, ~3/s
paced). During the sustained pass, 107 URLs — all **still-in-pool
recently-finished rows** (INTL_FR friendlies, BSA, DED, SA; finished
2026-11-17..22) — intermittently answered 503. Three recovery passes
(slow re-probe 1.5s pace → 2-try retry → spot checks) brought **every one
of them to 200**; each 503 was the documented free-tier CPU cliff
(`exceededResources` on the pool-HIT full-context render — the path P6
deliberately leaves unchanged, since it is the live/upcoming render), not
a content failure and not a deploy regression. Human- and Googlebot-paced
traffic plus the `s-maxage=60, stale-while-revalidate=300` edge hold keep
that class invisible in production; the sweep itself was an artificial
hammering. A P6-style lite render for pool-HIT *finished* rows is a
future optimization candidate, recorded here as a watch item (not scope of
this remediation).

**The sitemap sweep (paced):**

| Child | URLs | Notes |
|---|---|---|
| `sitemap.xml` (index) | 5 children | robots.txt points at it (verified) |
| `sitemaps/pages.xml` | 15 | |
| `sitemaps/competitions.xml` | 7 | **a-league absent** (gone entities never enter sitemaps — live-verified) |
| `sitemaps/teams.xml` | 13 | |
| `sitemaps/matches-upcoming.xml` | 105 | |
| `sitemaps/matches-archive.xml` | 641 | both seeded cup ties listed; blob(522)+recent-finished-pool merge |

## 4. What this means for the GSC 404 export

- The **141 dead small-market URLs** (the PRIMARY driver): served from the
  365-day archive — 200, back in the sitemap child.
- The **12 provider-variant match URLs + the cup-tie GSC form + the
  `/teams/magdeburg` duplicate**: frozen 301s to their canonical twins
  (immutable, cacheable, header-only — no KV/render cost).
- The **2 lost cup ties**: seeded and 200.
- The **cyclic-404 entity pages**: stable fallback shells at 200 + noindex
  (crawlable, never in sitemaps); `a-league` answers 410.
- **True strangers** (pattern-valid, no row anywhere): 410 — faster index
  removal than 404.
- The residuals (PGL/EL/ECL/cup rows outside the FD free-tier window):
  drain as 410 under Option B, per the audit's documented residual class.

Google's re-crawl happens on its own cadence (days); the remediation
removes every 404 mechanism the audit found. The next GSC export read
will quantify the drain.

## 5. The key completion (post-midnight)

At ~00:03 UTC 2026-11-24 (after the UTC quota-day rollover, the
quota-safe window), `backfill-archive-keys --write` re-ran: it read the
blob, diffed against the existing per-match keys and wrote **103 missing
keys** — more than the smallmarket interrupt's ~21 leftovers, because in
the interim the runtime's new all-FINISHED archive scope (P2-B) merged
~128 further in-pool finished rows into the blob during the sweep window
(blob 522 → 650 rows), and their key-writes had not all landed. Final
invariant, live-verified: **641 per-match keys = 641 unique archive slugs**
(650 blob rows − 9 same-day duplicate-slug rows, where the earliest-kickoff
row keeps the slug's key by design — the PGL rescheduled fixtures: e.g.
`persepolis-vs-paykan-2026-11-20` appears as two rows, one key). The
archive sitemap child lists the same 641 URLs. (Run transcript recorded in
docs/history/2026-11-23-s22-gsc404remediation-deploy.md.)

## 6. Rollback reference

- Worker: `wrangler rollback` (previous: 13.278.0-farsisitename,
  Version ID `0f3fc73d-5fc0-4dc1-a326-c4edb6606db6`).
- KV: restore `seo_archive_v1` from
  `/home/z/work/backups-2026-11-23/seo_archive_v1-20261123-224058.json`
  (180 rows); delete the `seo_archive_v1/m/*` keys written by the scripts
  (they TTL out at 370d regardless). The git revert is the 7-commit
  reversal of `c58a814` on `main`.

Credentials used, not stored — session-local env file outside the repo;
the owner should rotate every token shared in chat after the session
closes.

## 7. Honest limits

- `wrangler dev` smoke was NOT re-run in this session — it was run in the
  *previous* session on the identical tree (`c58a814`, fast-forward merged
  unchanged); this session re-ran `npm test` (3,963 green) plus the full
  live probe above instead.
- The literal GSC 220-URL export was not stored in the repo (it lived in
  the owner's audit brief); the re-probe covers the same URL families by
  construction (all 14 redirect-map entries + seeded ties + gone +
  strangers + malformed + core surfaces + the FULL 641-URL archive child,
  which is a superset of the 141 dead small-market URLs).
- The 503-transient class (§3 family F) — documented above with its
  pre-existing cause and the recovery evidence.
