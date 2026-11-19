# HANDOFF — SportSignal

> Agents: read AGENTS.md in the repo root first, and follow it for this whole session.

## This session (S20 — the all-matches day pages; 2026-11-18/19 — BUILT + GATED + DEPLOYED @100% + the mid-session dayhub fix `13.273.1-dayhub` + the post-fill live verification MEASURED (§2a): the today hub lists 7 rows on the FIFA-window break day — DONE)

**The objective (the owner's 2026-11-18 brief):** «بازی‌های امروز»
(`/matches/today`) and «بازی‌های فردا» (`/matches/tomorrow`) must show
ALL of the day's matches — never an empty page on days without marquee
fixtures — chronological, desired teams ranked higher. **DONE — deployed
2026-11-18 ~13:21 UTC (versioned `0346be4d…` @100%, version
`13.273.0-dayhub`), then REDEPLOYED same day as `13.273.1-dayhub` after
the ~14:10 UTC first full sweep live-proved the fill's original slot dead
(0 intl rows, meter ≥44 — see M4.5 below)**, outside the Nov 20 Bayern–Köln
no-deploy windows. The ranking law was already shipped (the hubs list
every pool match big-first + chronological — the audit's §1 finding); S20
widened the DATA UNIVERSE, not the page builders.

- **M1 — the FD four + the Persian names ✅** (commit `f10ba4f`):
  `CONFIG.FD_DAYVIEW_COMPS = [DED,PPL,ELC,BSA]` appended ONLY to the FD
  fetch URLs (`provider-fd.ts` — the ONE URL site for the full sweep AND
  the live sweep, so in-flight Brasileirão statuses ride the same call —
  and `providers.ts fetchLongView`). Same single batched FD call — +0
  subrequests (re-verified live this session: 10 comps, errorCode none).
  `CONFIG.LEAGUES` UNTOUCHED (the admin-state trap — check-gated).
  FA_COMPS + the 8 new codes + COMP_EN twins + the curated fa-dict
  national-team seed (~110 entries, every key a live-verified PROVIDER
  name form: «IR Iran»→ایران, «Turkiye»→ترکیه, «Czechia Republic»→چک …).
- **M2 — the international fill ✅** (commit `4cbe6f3`): new
  `src/provider-intl.ts` — the emptiness-gated scan ([today−1d, tomorrow]
  × 4 intl slugs, ONLY when no CLUB match kicks off in [now−1d, now+1d];
  the FD-4 codes deliberately don't count — BSA plays THROUGH windows;
  club days pay ZERO extra calls; the 44-metered stop is the backstop) +
  the HYGIENE LAW (`sanitizeIntlRows`: the senior-men filter incl. the
  provider's live-verified "(w)" women's form + the unordered-pair+date
  collapse keeping the most-progressed status — the reversed-dupe/ghost/
  youth classes die BEFORE the pool). Wired: the fill in
  `fetchMatchesFromAPI`, the live-sweep sanitize, `SS_LIVE_ELIGIBLE` + 4,
  the cron-pool cadence relevance (window days sweep like matchdays), the
  reuse-guard extension. Zero page-builder changes.
- **M3 — the gates + the harness ✅** (commit `60c0fed`):
  `check-s20-dayhubs.js` (46 gates, static + behavioral — the REAL
  translateCompetition + the REAL provider-intl module eval'd whole)
  wired into `npm test` (3,841 → **3,887 OK / 0 FAIL, exit 0**; tsc
  clean). `s20-dayhub-smoke.ts` **34/34** (club-day ordering, break-day
  hygiene incl. the reversed-dupe collapse + the ghost's finished row not
  rendering as upcoming, dead-day honesty, the side-effect map, the
  goal-alert zero-audience skip — no claim, baseline advances).
  `s20-seed-local-kv.js` the local break-day seeder.
- **M4 — version + deploy + verify ✅ (partial — see below):** the
  version triple + the check-stats LIVE pins + the check-s19 pin
  ride-forward + the CHANGELOG entry (commit `60c0fed`). LOCAL
  wrangler-dev smoke with the seeded break-day pool: `/healthz
  13.273.0-dayhub + ok:true + pool_matches:5`; `/matches/today` 200 with
  **5 rows** (Cruzeiro–Palmeiras + Flamengo–Paranaense with «سری آ برزیل»،
  عراق–ایران «بازی دوستانه ملی»، دانمارک–نروژ «لیگ ملت‌های اروپا»،
  آمریکا–مکزیک «لیگ ملت‌های کونکاکاف» — the answer card «۵ بازی امروز در
  برنامه است. نزدیک‌ترین: عراق – ایران …»); `/matches/tomorrow` 200
  honest-empty; the homepage 200. DEPLOYED `0346be4d-a641-4775-b4ee-f1bad29e36d0`
  @100% (2026-11-18 ~13:21 UTC — before Nov 20 by 2 days). LIVE verified
  immediately: `/healthz ok:true + version 13.273.0-dayhub` + healthy
  ticks (subreq_last_tick 31, degraded false); homepage + `/matches` +
  `/sitemap.xml` unchanged (no new-comp rows); the pre-fill day pages
  still the honest empty state (the pool was last swept at ~14:10 UTC by
  the ORIGINAL code — the gated fill runs only inside a FULL sweep, and
  that first sweep live-proved the fill's post-fan-out slot DEAD: FD 6 +
  TSP 8 + the club day fan-out 27 + a standings refresh left the meter
  ≥44, so the fill's own 44-stop fired at 0 calls — +53 FD-4 rows landed,
  ZERO intl rows on a provably-open gate day).
- **M4.5 — the dayhub fix (`13.273.1-dayhub`, this session) ✅:** the fill
  moves BETWEEN TSP and the sportscore CLUB fan-out (the only budget slot
  with headroom — when the gate is open, the fan-out's own [now−1d,
  now+1d] window is provably empty of club matches; its ~27 calls still
  run after the fill, bounded by the same 44-stop) + the gate feeds on
  `opts.clubContext` (the tick's cached pool rows, already in memory at
  cron-pool — ZERO new KV reads) so sportscore-only club rows (PGL) close
  it exactly like FD/TSP rows. Gates re-pinned (check-s20 wiring gate +
  check-reliability's sequential-sources gate carry the fill hook; the
  version pins 13.273.0 → 13.273.1 across the triple + the check-stats
  LIVE pins + the S19 ride-forward), `npm test` **3,887 OK / 0 FAIL,
  exit 0**, tsc clean, harness **34/34** against the REAL re-wired code.
  Redeployed versioned `13.273.1-dayhub` during the IDLE window — the
  fill's first real production run = the next full sweep, **~20:10 UTC**
  (the 6h IDLE discovery cadence from the ~14:10 UTC sweep).
  **The post-fill live verification (MEASURED 2026-11-19 00:48 UTC —
  done, in §2a):** the fill ran in production on BOTH post-fix sweeps
  (the ~20:1x UTC window [Nov 17–19] — proven by the pool-backed
  `/matches/iraq-vs-ir-iran-2026-11-17` 200 with real content — and the
  ~23:41 UTC window [Nov 18–20]); `/matches/today` (Tehran Nov 19)
  lists **7 rows** (the six Brasileirão fixtures «سری آ برزیل» + the
  fill's «بازی دوستانه ملی» row Western Springs–Tonga) with the answer
  card «امروز ۷ بازی …» — NOT the empty state, on a FIFA-window break
  day; pool 342 → 395 → **451**; `/matches/tomorrow` 6 rows (3 BSA +
  Bayern–Köln + 2 more); `/matches/usa-vs-haiti-2026-11-18` 200
  (FINISHED — kept its page, never lists as upcoming);
  homepage//matches/sitemap re-checked with ZERO new-comp rows (the
  side-effect map held); hygiene live-clean (no youth/women/ghost
  rows render);

## Current state (machine)

- **Version:** `13.273.1-dayhub` (`src/config.ts` / `package.json`
  `13.273.1.0`). npm test baseline **3,887 OK / 0 FAIL, exit 0**
  (`npx tsc --noEmit` clean + 59 check scripts — the S19 baseline 3,841 +
  the 46-gate `check-s20-dayhubs.js`). The S20 harness: `npx tsx
  scripts/s20-dayhub-smoke.ts` (34/34 — manual, not in the test chain,
  the s17/s18/s19 precedent). The local seeder: `node
  scripts/s20-seed-local-kv.js`.
- **Deploy:** Worker `ucl-notifier`, versioned deploys only. Current
  deployment `81b1d4f0-e5b6-4293-909c-cf5d93690131`
  (`13.273.1-dayhub`; 2026-11-18 ~14:47 UTC, @100%; post-deploy `/healthz`
  `ok:true` + the new version + healthy ticks, all surfaces 200). Rollback
  chain: `0346be4d` (13.273.0-dayhub, S20 M4) → `7c54e223`
  (13.272.0-goalert, S19) → `0fad7482` (13.271.0-content, S18)
  → `62c3b14d` (13.270.0-faq, S17) → earlier (see the RUNBOOK). Rollback =
  `npx wrangler rollback`.
- **Production hostnames:** `sportsignal.ir` (apex Custom Domain),
  `football.sportsignal.ir` (301→apex except `/webhook`,`/api/`,`/admin`),
  `ucl-notifier.sportsignal.workers.dev` (noindex-guarded alias).
- **Branch:** `main`. Session 20 commits: `s20-m1` (`f10ba4f`) +
  `s20-m2` (`4cbe6f3`) + `v13.273-dayhub` (`60c0fed`, the gates + the
  harness + the version triple) + the docs close-out commit (`5f5f2b4`) +
  the dayhubfix commit (`14f6e9d`, `13.273.1`) + the §2a post-fill
  evidence commit (the session report's measured close-out). The session
  report: `docs/history/2026-11-18-s20-dayhubs.md` (§2a = the measured
  post-fill evidence).
- **Commands:** `npm test` (must exit 0 before every push). **npm only,
  never `bun install`**. Local dev: `npx wrangler dev --config
  wrangler.dev.toml --port 8787 --local` (the local D1 needs `npx wrangler
  d1 execute sportsignal-users --config wrangler.dev.toml --local
  --file=db/users-schema.sql` once after a state wipe). The miniflare
  cron-test endpoint (—test-scheduled) is broken in this sandbox
  (wrangler 4.50 DataCloneError) — use the harness for tick logic.
  Deploy needs `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` in the
  env. Versioned deploy: `npx wrangler versions upload` → `npx wrangler
  versions deploy --version-id <id> --percentage 100 --yes`.
- **Cron triggers:** `*/10 * * * *` + `27 */4 * * *` (unchanged — S20 adds
  ZERO new schedulers).
- **Key folders:** `src/` (worker modules; `scripts/lib/worker-src.js`
  carries the bundle ORDER — `provider-intl.ts` sits after
  `provider-sportscore.ts`), `assets/` (immutable versioned client
  payload; SW `sportsignal-v126`, bundle `public-13.80.js`, stylesheet
  `public-13.87.css` — untouched by S20), `docs/` (RUNBOOK, HANDOFF,
  specs, audits, history).
- **Standing limits:** the Dec 4-8 freeze HOLDS (S20 changed zero
  byte-frozen SEO/GEO surfaces, zero client assets — check-gated); `_headers`
  at the 100-rule cap (no new pins — no new assets); **no deploys during
  the Nov 20 Bayern–Köln windows (M1 ~19:35 UTC, M2 ~21:35-45 UTC — the
  first natural goal-alert windows: watch, don't deploy)**; the KV read
  quota + the 10ms CPU cliff remain the owner's Workers Paid plan
  decision. The fill's budget: +0 FD subrequests, ≤12 gated sportscore
  calls only on window days, pool worst case ~230KB (under the 331KB
  slim norm).

## The alerts track state

Session 19 ✅ Completed + deployed + version-verified live (2026-11-17).
Session 20 ✅ **Completed + deployed @100% (2026-11-18) + post-fill verified
live (2026-11-19) — the all-matches day pages** (the audit + the spec +
the four milestones + the gates + the harness + the deploy + the
mid-session dayhubfix `13.273.1` + the MEASURED §2a: the today hub
listing 7 rows on the FIFA-window break day, pool 451, both fill runs
proven via pool-backed intl pages; the first natural goal window Nov 20
will also be the first goal-alert run over the widened universe — BSA
Friday matches now ride the same FD live sweep).
Session 21+ ⬜ — the OLD S20 preview moves here: the per-match
subscription UX (deep-links, `/follow match`), red-card alerts IF a real
source materializes, alert pacing/quiet-hours, the channel goal posts +
the scorer enrichment, the Workers AI enrichment ideas parked in
`docs/telegram-channel-mirror/ENRICHMENT.md`.

(The SEO follow-up track Sessions 16-18 are COMPLETE — see
`seo-implementation/session-reports/` + the FINAL-SEO-IMPLEMENTATION-REPORT;
the data-dependent gaps are the owner's next phase.)

## Open follow-ups

- ~~The S20 post-fill live verification~~ **DONE** (measured 2026-11-19
  00:48 UTC, §2a of the session report: both fill runs proven, 7 rows on
  the break-day today hub, pool 451, three intl match pages 200, the
  side-effect map re-checked clean; both verifier cron jobs deleted).
- **The Nov 20+ first-natural-goal watch:** Bayern–Köln Friday 19:30 UTC —
  the first live goal alert under the S19 layer (with followed teams);
  now ALSO the first goal window over the widened universe. Check the D1
  `notified_v1` `goal:*` rows + the delivery ledger after the match. No
  deploys in the M1/M2 windows.
- **The KV read-quota exhaustion (the owner decision)** — unchanged (the
  Workers Paid plan is the durable fix).
- **The wrangler-4.50 sandbox DataCloneError** on the miniflare
  scheduled-test endpoint (tooling; the harness covers tick logic).
- The S21+ alerts backlog (per-match subscriptions, red cards IF a real
  source, quiet hours, channel goal posts, scorer enrichment).
- The post-Dec-8 freeze-lift decisions + the remaining S15-close backlog
  (unchanged, owner-driven).

**Credentials used, not stored.** The GitHub + Cloudflare + Telegram +
football-data tokens were used across the S19/S20 sessions (the clone,
the push, the deploy, the API probes, the live verification) — the owner
should rotate them when development pauses.



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

