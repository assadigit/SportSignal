# HANDOFF — SportSignal

> Agents: read AGENTS.md in the repo root first, and follow it for this whole session.

## This session (S20 PLANNING — the all-matches day pages; 2026-11-18 — the audit + the spec, awaiting the implementation session)

**The objective (the owner's 2026-11-18 brief):** «بازی‌های امروز»
(`/matches/today`) and «بازی‌های فردا» (`/matches/tomorrow`) must show
ALL of the day's matches — never an empty page on days without marquee
fixtures — chronological, desired teams ranked higher. **PLANNED — the
implementation is the NEXT session (S20).**

- **The audit (docs/audits/2026-11-18-allmatches-day-pages.md):** the
  hubs ALREADY list every pool match big-first + chronological (the
  ranking law the owner asked for is shipped); the real gap is the DATA
  UNIVERSE — during FIFA windows the tracked competitions are empty
  (verified live: 0 rows Nov 18–19, the today page's honest empty state)
  while real football exists (44 friendlies incl. Iraq–IR Iran, 18 AFCON
  qualifiers, 9 CONCACAF NL, 8 UEFA NL on Nov 17; 4 Brasileirão matches
  Nov 18). Provider probes verified: FD free tier takes all 10 comps in
  ONE batched call (DED/PPL/ELC/BSA included); the sportscore intl slugs
  work but carry reversed duplicates, ghost rows, and youth/women noise
  (the hygiene law). The side-effect map confirms the new rows reach ONLY
  the time hubs + match pages (homepage/`/matches`/sitemap/teams/bot/
  goal-alerts all stay gated).
- **The spec (docs/specs/allmatches-day-pages.md):** M1 the FD four
  (`FD_DAYVIEW_COMPS`, `CONFIG.LEAGUES` untouched — admin-state trap);
  M2 the emptiness-gated senior-intl fill + hygiene + cadence parity;
  M3 the check gates + the seeded harness; M4 version 13.273.0-dayhub +
  deploy (outside the Nov 20 Bayern–Köln windows) + the live verify ON
  THE CURRENT BREAK (the Nov 18–19 window is the showcase scenario).
  DECISIONS S20-1…S20-6 recorded.
- **The next-session prompt lives in the owner chat** (self-contained:
  read AGENTS.md → the audit → the spec → build).

## This session (Telegram Alerts Track Session 19 — the live goal alerts; 2026-11-17 — DONE in code + deployed + version-verified live; the first natural goal alert lands Nov 20+ with the post-break fixture resumption)

**The objective (the owner's S19 brief):** per-user live goal alerts — goal
events detected from REAL score deltas in the existing LIVE sweep, fanned
out to team-following chats through the existing engine/transport, with the
subscription/persistence/distribution machinery behind them. **DONE.**

- **S19-M1 — the detection layer ✅.** `src/goal-alert.ts` (the
  `notify-status.ts` structural twin; one hook in `runNotifyPhase` after
  `detectStatusChanges`, own try/catch): the KV snapshot map
  `goal_snapshots_v1` (last-known scores of in-window LIVE matches,
  kickoff [−6h, +4h], a REAL score required — MISSING-IS-NOT-ZERO;
  write-only-when-changed, TTL 2d) + the delta law (score-side
  attribution; FIRST SIGHTING SEEDS NEVER FIRES; backward movement =
  correction, silent; a provider gap RETAINS the baseline — the next good
  sweep fires the missed goal(s) once, late, never a burst).
- **S19-M2 — the claim + the audience ✅.** The per-goal dedupe rides
  `notified_v1` verbatim (D1 write-first `INSERT OR IGNORE`; `ntype`
  `goal:<h>-<a>` — the score tuple AFTER the goal; at most one alert per
  tuple per match ever). The audience is the EXISTING team follows
  (`userFollowsMatch` one/both — EITHER side fans out; zero new
  subscription surface).
- **S19-M3 — the send path ✅.** The existing transport (retries/429/
  outbox/dead-chat + the per-chat delivery ledger) + cache-only cards
  (`cachedCardPng` — the v13.94.1 CPU-keeper law; text fallback per chat)
  + the compact Persian-first alert («گُل!» + teams + competition +
  «نتیجه: *۲-۰*» + «گلِ X», the «۲ گل برای X» variant, the en twin — never
  scorer names/minutes the sweep does not carry) + the TWO-LAYER
  WRITE-FIRST (reservation BEFORE any write; the D1 claim BEFORE any
  send; the snapshot advances only processed rows) + `GOAL_ALERT_MAX_UNITS`
  = 6/tick.
- **The honesty gate ✅.** Red-card alerts SCOPED OUT (DECISIONS S19-3 —
  no incident source on the wired providers; never fabricated). Channel
  goal posts + the scorer enrichment = S20 backlog (S19-5).
- **The gates ✅.** `check-s19-goalalert.js` (52 gates) wired into the
  `npm test` chain — **3,841 OK / 0 FAIL, exit 0**; `npx tsc --noEmit`
  clean; the harness `s19-goal-smoke.ts` **22/22** (the 0-0 → 1-0 → 2-0
  timeline, the re-sweep zero, the provider-gap no-burst recovery, the
  fail-closed D1 outage, EITHER-side fan-out, the engine composition
  regression) through the REAL `detectGoalEvents` + mock KV/D1 + a
  captured transport.
- **The deploy ✅ (version-verified live).** Deployment
  `7c54e223-b39f-4c9f-9bde-ea7d06047610` @100%; the live `/healthz`
  reports `version: 13.272.0-goalert`. Local boot smoke clean (workerd);
  the miniflare cron-test endpoint is blocked by a wrangler-4.50 sandbox
  bug (ScheduledController DataCloneError — tooling, documented in the
  session report §4). Bot surface read-verified (`getMe` + the webhook,
  0 pending). **Honest limit:** the Nov 14–19 international break means no
  live match exists until Fri Nov 20 19:30 UTC — the goal path is
  harness/gate/boot proven; the first natural production alert lands
  Nov 20+.

## Current state (machine)

- **Version:** `13.272.0-goalert` (`src/config.ts` / `package.json`
  `13.272.0.0`). npm test baseline **3,841 OK** (`npx tsc --noEmit` clean +
  58 check scripts — the S18 baseline 3,789 + the 52-gate
  `check-s19-goalalert.js`). The S19 harness: `npx tsx
  scripts/s19-goal-smoke.ts` (22/22 — manual, not in the test chain, the
  s17/s18 precedent).
- **Deploy:** Worker `ucl-notifier`, versioned deploys only. Current
  deployment `7c54e223-b39f-4c9f-9bde-ea7d06047610` (`13.272.0-goalert`;
  2026-11-17 ~20:05 UTC, @100%). Rollback chain: `0fad7482`
  (13.271.0-content, S18) → `62c3b14d` (13.270.0-faq, S17) → `2481f840`
  (13.269.0-entity-image, S16) → earlier (see the RUNBOOK). Rollback =
  `npx wrangler rollback`.
- **The KV read-quota exhaustion (the standing condition):** crossed
  ~11:05 UTC Nov 17 (the S17/S18 condition); `/healthz ok:false` +
  `pool_matches:0` until the UTC-midnight reset. **The post-reset
  verification COMPLETED 2026-11-18 ~11:19 UTC** (`ok:true` +
  `pool_matches:342` + `version: 13.272.0-goalert`; the S17 FAQ + S18
  editorial page-level checks all passed — the `seo(s17-verify)` commit +
  SESSION-17 §7 / SESSION-18 §6 / the S19 history §4 carry the evidence;
  the verification cron jobs self-deleted). The durable fix remains
  the owner's Workers Paid plan decision ($5/mo → 1M reads/day).
- **Production hostnames:** `sportsignal.ir` (apex Custom Domain),
  `football.sportsignal.ir` (301→apex except `/webhook`,`/api/`,`/admin`),
  `ucl-notifier.sportsignal.workers.dev` (noindex-guarded alias).
- **Branch:** `main`. Session 19 commits: `audit(s19)` (the audit doc) +
  `v13.272-goalert` (the code + the gates + the docs) + the docs close-out
  commit. The bot-track session reports live in `docs/history/`
  (`2026-11-17-s19-goalalerts.md`).
- **Commands:** `npm test` (must exit 0 before every push). **npm only,
  never `bun install`**. Local dev: `npx wrangler dev --config
  wrangler.dev.toml --port 8787 --local`. NOTE: the local D1 needs
  `npx wrangler d1 execute sportsignal-users --config wrangler.dev.toml
  --local --file=db/users-schema.sql` once after a state wipe; the S19
  seeder is `node scripts/s19-seed-local-kv.js <h> <a>`. The miniflare
  cron-test endpoint (—test-scheduled) is broken in this sandbox
  (wrangler 4.50 DataCloneError) — use the harness for tick logic.
  Deploy needs `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` in the
  env. Versioned deploy: `npx wrangler versions upload` → `npx wrangler
  versions deploy --version-id <id> --percentage 100 --yes`.
- **Cron triggers:** `*/10 * * * *` + `27 */4 * * *` (unchanged — the goal
  layer adds ZERO new schedulers).
- **Key folders:** `src/` (worker modules; `scripts/lib/worker-src.js`
  carries the bundle ORDER — goal-alert.ts sits after notify-audit.ts),
  `assets/` (immutable versioned client payload; SW `sportsignal-v126`,
  bundle `public-13.80.js`, stylesheet `public-13.87.css` — untouched by
  S19), `docs/` (RUNBOOK, HANDOFF, specs, audits, history), `docs/history/`
  (the bot-track session reports).
- **Standing limits:** the Dec 4-8 freeze holds (zero SEO/GEO surface bytes
  changed in S19 — pinned by the check gates); `_headers` at the 100-rule
  cap; **no deploys in the Nov 20 Bayern–Köln windows (M1 ~19:35 UTC, M2
  ~21:35-45 UTC — the first natural goal-alert window; watch, don't
  deploy)**; the KV read quota + the 10ms CPU cliff remain the owner's
  Workers Paid plan decision.

## The alerts track state

Session 19 ✅ Completed in code + deployed + version-verified live
(2026-11-17) — the live goal alerts (detection/claim/fan-out + the gates);
3,841 OK; the harness 22/22. Deployment `7c54e223…` @100%. The first
natural live verification window: Nov 20+ (the post-break fixtures).
Session 20 ⬜ NEXT — **RESEQUENCED by the owner (2026-11-18): the
all-matches day pages** (the audit + the spec are DONE — see the session
block at the top; the universe extension for «بازی‌های امروز/فردا»:
FD free-4 + the hygiene-filtered senior internationals, the emptiness
gated scan, the cadence parity; version 13.273.0-dayhub).
Session 21+ ⬜ — the OLD S20 preview moves here: the per-match
subscription UX (deep-links, `/follow match`), red-card alerts IF a real
source materializes, alert pacing/quiet-hours, the channel goal posts +
the scorer enrichment, the Workers AI enrichment ideas parked in
`docs/telegram-channel-mirror/ENRICHMENT.md`.

(The SEO follow-up track Sessions 16-18 are COMPLETE — see
`seo-implementation/session-reports/` + the FINAL-SEO-IMPLEMENTATION-REPORT;
the data-dependent gaps are the owner's next phase.)

## Open follow-ups

- **The post-quota-reset verification jobs — DONE (2026-11-18 ~11:19
  UTC):** the S17+S18 page-level live verification passed every check
  (FAQPage nodes, the editorial placement order, the byte-frozen
  title/H1, the with-venue 4-Q / no-venue 3-Q match pages) + the S19
  `/healthz ok:true` confirmation — the `seo(s17-verify)` docs commit;
  the self-deleting jobs removed from the scheduler.
- **The Nov 20+ first-natural-goal watch:** Bayern–Köln Friday 19:30 UTC —
  the first live goal alert under the new layer (with followed teams);
  check the D1 `notified_v1` `goal:*` rows + the delivery ledger after the
  match. No deploys in the M1/M2 windows.
- **The KV read-quota exhaustion (the owner decision)** — unchanged (the
  Workers Paid plan is the durable fix).
- **The wrangler-4.50 sandbox DataCloneError** on the miniflare
  scheduled-test endpoint (tooling; the harness covers tick logic; revisit
  if a future wrangler upgrade lands).
- The S21+ alerts backlog (per-match subscriptions, red cards IF a real
  source, quiet hours, channel goal posts, scorer enrichment) — moved
  from S20 by the owner's 2026-11-18 resequencing.
- The post-Dec-8 freeze-lift decisions + the remaining S15-close backlog
  (unchanged, owner-driven).

**Credentials used, not stored.** The GitHub + Cloudflare + Telegram +
football-data tokens were used across the S19/S20-planning sessions (the
clone, the push, the deploy, the API probes, the bot surface checks, the
KV pool read) — the owner should rotate them when development pauses.
