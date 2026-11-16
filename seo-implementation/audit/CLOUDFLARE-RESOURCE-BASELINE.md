# Cloudflare Resource Baseline — Session 1 (16 November 2026)

> Agents: read AGENTS.md in the repo root first, and follow it for this whole task.

Free-tier usage baseline for the SportSignal Worker, recorded before any SEO-program
implementation work. Sources: `wrangler.toml` (verified against the live Cloudflare API),
`/healthz` live telemetry (2026-11-16), and the prior-session DECISIONS entries (CPU-cliff
record). Nothing in this file authorizes exceeding any limit.

## 1. Account and Workers

| Item | Value |
|---|---|
| Account | `a796fdfe71819812119b8a494d3d39c1` (dedicated account, migrated 2026-10-13) |
| Plan | **Workers Free** |
| Worker (production) | `ucl-notifier` (created 2026-10-13; last modified 2026-11-15 = the S28.1 deploy) |
| Worker (dormant) | `uefa-image-relay` (unrouted asset relay, 2026-10-25) |
| workers.dev subdomain | `sportsignal` → `ucl-notifier.sportsignal.workers.dev` (noindex-guarded alias) |
| Custom domain | `sportsignal.ir` (apex); `football.sportsignal.ir` 301s to apex except `/webhook`, `/api/`, `/admin` |

## 2. Bindings (from wrangler.toml, corroborated live)

| Binding | Type | Resource | Free-tier limit (Workers Free) |
|---|---|---|---|
| `STATE` | KV namespace | `c63588df02ae4bf1bfdc18d19c5b3631` | 100,000 reads/day; **1,000 writes/day (account-level)**; 1 GB storage |
| `STATS_DB` | D1 | `sportsignal-stats` (page-view counter) | 5M rows read/day; 100k writes/day |
| `USERS_DB` | D1 | `sportsignal-users` (bot user prefs) | same |
| `AI` | Workers AI | Farsi club-name translation | neuron-based quota |
| `DRAIN_SELF` | Service binding | self (kickoff drain chain) | n/a (internal) |

## 3. Scheduled triggers (verified via Cloudflare API, 2026-11-16)

| Cron | Purpose | Upstream cost (documented in code + RUNBOOK) |
|---|---|---|
| `*/10 * * * *` | the tick: bot + pool sweep (live sweep or full sweep every ~2h) | live tick ~15–25 subrequests; full sweep ~40–50 (FD 1–6 + TSP ~9 + sportscore with a hard 44-subrequest stop) |
| `27 */4 * * *` | far-cup probe | ~10 subrequests |

Free plan allows up to 5 cron triggers per account — **2 in use**. No per-match or unbounded jobs exist.

## 4. Measured live usage (2026-11-16, `/healthz`)

| Metric | Value | Limit | Headroom |
|---|---|---|---|
| KV writes/day (bot+state) | 117 (+57 web-path counter budget field) | 1,000/day account-level | ~8.5× |
| Subrequests last tick | 31 | ~50/invocation (free) | ~1.6× |
| Pool size | 324 matches (`matches_v13_tracked`) | KV value size 25 MB | n/a |
| Degraded flags | `degraded: false`, `sched_feed_ok: true` | — | healthy |
| Requests/day | not exposed by /healthz; Workers Free = 100,000/day | 100,000/day | historical sessions report no quota breaches on the dedicated account |

## 5. CPU — the known cliff (prior-session record, still standing)

- Free plan CPU limit: **10 ms/invocation**. Cold match-page renders run near this cliff;
  Cloudflare analytics showed **37 `exceededResources` in 3h** on v13.258 (2026-11-15) and
  **789 on Nov 10** — chronic and pre-existing, NOT caused by the SEO surfaces.
- Mitigation in place since v13.259.1-archttl (S28.1): `ARCHIVE_PAGE_TTL = 21600s` (6h
  render-hold for archived match pages) + a 1h edge hold on the resvg OG-PNG route.
- **Program guardrail:** every SEO session must state the render/KV cost of any change.
  No new request-time rendering loops, no per-URL KV reads beyond the existing bounded
  set (the SEO context = payload + overlay + pool + archive reads, all single-read).

## 6. Edge caching (verified live)

- HTML: `cache-control: public, max-age=0, s-maxage=60, stale-while-revalidate=300` +
  Cache API render-holds (900s default; 300s live pages; 120s live match pages; 6h archive).
- Sitemaps 600s; robots.txt 3600s; feed/calendar 300s; matches.json 60s(s-maxage 300).
- `/api/public-matches`: 60s edge + SWR client refresh (live response observed with
  `age: 52`, `cache-control: public, max-age=14400` — Cloudflare's default edge TTL on the
  cached JSON, noted as audit item C8, harmless for correctness).
- ETag/304 and `Last-Modified` (from `data-ss-generated`) verified working.

## 7. Rules the SEO program inherits (from AGENT-INSTRUCTIONS §6 + this baseline)

1. No per-match/per-card upstream fetches; no client polling; no new provider requests
   without a measured rationale.
2. No new databases/namespaces; reuse the KV payload path for any content change.
3. Any lifecycle/cleanup job must be bounded, idempotent, resumable — prefer the existing
   cron shell or a manual admin action.
4. Indexed-URL count is NOT a Worker cost metric — never mass-delete records for SEO.
5. Budget statements are mandatory in every session report (this file is the baseline).
