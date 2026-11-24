# S23 — v13.280.0-teamtilecrests deploy record (2026-11-24)

> Agents: read AGENTS.md in the repo root first, and follow it for this whole task.

The owner's ask (verbatim): "Add club's logo/sigil (from API) in this page:
https://sportsignal.ir/teams". Branch `feat/team-tile-crests` (1 commit,
`d5da01e`), fast-forward merged onto `main` (`949c885 → d5da01e`, pushed,
ls-remote verified) — the release per RUNBOOK §2: fresh `npm test`
(**3,964 OK / 0 FAIL** — the v13.280 live wiring pin added; the v13.279 pin
demoted HISTORICAL with its four behavioral gates staying LIVE; the s20
version-triple pin evolved), the `wrangler dev --local` seeded smoke (6
tiles: 4 crest renders + 2 plain-tile fallbacks for crest-null teams;
ItemList 6 == 6; the competitions hub + /matches/today + / + /about all
200, zero .tlogo rows outside /teams), then `npx wrangler deploy`
2026-11-24 (a clean no-live window: sched_live_now 0, outbox 0) —
**Version ID `033a2156-9809-42ac-982f-cbcb5df8c051`**, bindings intact
(STATE KV, STATS_DB, USERS_DB, DRAIN_SELF, AI), triggers re-armed
(`*/10 * * * *`).

## Live verification (all this session, post-deploy)

| Check | Result |
|---|---|
| `/healthz` | `ok:true`, version `13.280.0-teamtilecrests`, `degraded:false`, outbox 0, heartbeat 3 min |
| `/teams` (fresh edge entry) | **79 tiles / 79 `.t.tlogo` rows / 79 crest `<img class="tc">`** — every tile's club crest renders (FD `crests.football-data.org/{id}.png`) |
| Crest URL probes | 4/4 sampled FD crest URLs → 200 |
| The `<img>` contract | `alt=""` + `loading="lazy" decoding="async" referrerpolicy="no-referrer"` + fixed `width="24" height="24"` + `onerror="this.remove()"` — decorative, zero-CLS, fail-soft |
| SS-13 visible==machine | ItemList `numberOfItems` 79 == 79 visible tiles; the crawlable anchor keeps its byte-exact `<a class="hubtile" href="/teams/{slug}">` shape |
| Freeze check | title + H1 byte-identical to the pre-release values («تیم‌های فوتبال دنبال‌شده — برنامه بازی‌ها | اسپرت سیگنال» / «تیم‌های دنبال‌شده») |
| Sibling surfaces | `/`, `/matches/today`, `/competitions`, `/teams/real-madrid`, the upcoming marquee match page, `/sitemap.xml`, `/robots.txt`, `/feed.xml` → all 200 |
| The .tlogo gate | `/competitions` hub: **0** `.tlogo` rows — the plain `.t` tiles are byte-identical (the CSS gate held) |
| R-13 workers.dev guard | `x-robots-tag: noindex, nofollow` intact on the workers.dev host |
| Bot post-deploy | healthz `ok:true`, `degraded:false`, outbox 0 |

The deploy evidence note: the origin (workers.dev) served the crests
immediately; the production hostname rode the documented `s-maxage=60,
stale-while-revalidate=300` edge hold (the S22 audit's known behavior) and
served the fresh entry within ~3 minutes of polling.

## Rollback reference

- Worker: `wrangler rollback` (previous 13.279.0-gsc404remediation,
  Version ID `2803a28f-9f23-4896-9fa9-05e49a779e65`).
- Git: revert of `d5da01e` on `main` (a single self-contained commit).
- No KV/D1 data change in this release (zero writes — read-only render).

Credentials used, not stored — session-local environment only; the owner
should rotate every token shared in chat after the session closes.
