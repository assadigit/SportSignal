# 2026-11-06 — Session 13: the multi-day window read + the Gladbach decision shipped (v13.229-teamladder)

Wall-clock note (the repo's convention): this session ran 2026-11-06
~10:05–11:1x UTC (Tehran ~13:35–14:4x on 11-06), directly after the S12
end-checkpoint (fb8ceb3 / v13.228-farsibrand, deploy 694c470f). The session
label stays 2026-11-06, monotonic with S5–S12.

## 1) Boot gates (all green; one documented dice-fail)

- `git fetch`: origin `main` == the S12 close (`fb8ceb3`) — no web-UI push,
  no rebase; tree clean (fresh clone this session, the token scrubbed from
  git config per the AGENTS hard rule).
- `npm test` → **EXIT 0, 2,613 OK / 0 FAIL** — exactly the v13.228 baseline.
- `npm run seo:check` vs production → two runs, both **PASS 254 / FAIL 1 /
  REPORTS 1** vs the prompt's 254/0/1 band: the single FAIL was the
  documented cold-render dice (v13.186-seofix lines 88–97 — a cold SSR
  route 503s "exceededResources" through both retries), and it landed on a
  DIFFERENT page each run (`…dortmund-vs-augsburg-2026-12-12` then
  `…dortmund-vs-real-betis-balompie-2026-11-04`); BOTH direct-verified 200
  with full HTML after the sweep. The band's hard lines held on every
  check; the one REPORT was the expected Gladbach 66 (the session's own
  subject).
- **Epoch guard**: `check-hero-carousel.js` NOW =
  `2026-11-30T12:00:00Z` — UNEXPIRED (session ran 2026-11-06, 19 days
  clear of the ~2026-11-25 bump threshold; the 2026-11-30 15:00Z horizon
  far away). No bump; the guard carries to S14 unchanged.

## 2) The RUM multi-day read — 11-06 still accruing on BOTH datasets (the send.to fix's first day, deep)

The pull (`scripts/s13-rum-read.js` — the S12 method with the day-probes
carried forward; raw: `docs/history/2026-11-06-s13-rum-raw.json`, pulled
10:18:51 UTC):

| day | WebVitals | Pageloads |
|---|---|---|
| 2026-10-31 → 2026-11-04 | the pre-outage series unchanged (15 groups; the last full HUMAN window) | unchanged (14 groups) |
| 2026-11-05 | — (the permanently-unwitnessed hole, documented S11) | — |
| **2026-11-06** | **1 group: bot/desktop n=24, LCP p75 784 ms** (S12's 02:55 read: n=17 / 692 ms — the day kept accruing ~7.5h past the v13.228 deploy boundary) | **3 groups: human/mobile n=22 (was 16) + human/desktop n=1 + bot/desktop n=4 — 27 visits total (was 21)** |
| 2026-11-07 | 0/0 (the UTC day had not rolled — expected; the first true multi-day marker) | 0/0 |

**Confirmation**: the send.to fix's first day IS accruing on BOTH datasets
and did not stall — between the S12 (~02:55) and S13 (10:18) reads the WV
bot group grew n=17→24 (+41%) and the human/mobile pageloads 16→22 (+38%).
The multi-day window (11-06→onward) opens tonight when 11-07 rolls; S14
should re-read with this same script shape.

**The human LCP p75 re-quote: STILL not possible** — the prompt's own gate
("once a human WV group exists") does not pass: the 11-06 WebVitals day is
bot-only. Humans ARE visiting (23 human pageloads by 10:18) but none has
produced a WebVitals event yet. The last full HUMAN window remains
10-31→11-04 (desktop LCP p75 2.36 s / mobile 2.53 s). **The
new-portrait-weight question carries to S14 unchanged** — it needs fresh
post-fix HUMAN WV windows, days not hours.

## 3) The KV band read (the standing watch) — clean, one artifact explained

| read (UTC) | cron_status_v1.kv_writes_day | kv_writes_web_v1 | combined (healthz) |
|---|---|---|---|
| ~10:20 (boot) | 361 | 159 | 520 |
| ~10:26 | 365 | 159 | 524 |
| ~11:05 (post-deploy watch) | 397 | 180 | 577 |

All far under the 700 reference / 820 SOFT / 850 HARD lines; the governor
never engaged (`kv_budget: null` throughout). Tick health at every read:
heartbeat/last_cron 2–10 min, outbox 0, feed ok. One artifact: the 10:20
read showed `degraded: true` from **poolAgeMin 209 > 180** — the v13.118
fixture-aware scheduler legitimately lets the pool age toward its mode
interval on a quiet Friday morning; the next full sweep refreshed it (age
1 min) and degraded returned false. Not an incident — a band-calibration
sighting (the 180-min degraded band predates the 6h IDLE sweep interval).
The post-deploy full-sweep tick read subreq 94 (fetches + KV ops + 1 — a
busy-but-complete tick; S12's 28–38 were quiet ticks). Friday's evening
fixtures will grow the counters; the governor handles the ceiling by
design (the S9 Europa-Thursday 820 precedent), and the counters reset at
00:00Z.

## 4) THE DECISION — v13.229-teamladder (the Gladbach 66-char report)

**The evidence base**: computed ALL 96 team-title lengths from the live
/teams ItemList — Gladbach (66) is the ONLY title in the 66–75 pixel-risk
band, three clear of the next-longest (دپورتیوو لاکرونیا, 63); everything
else ≤ 62.

**The decision: the LADDER.** Shorten-the-fixed-clause fell because it
churns 96 titles for a one-page problem; accept fell because it leaves a
standing report on every future boot (this repo keeps its bands clean).
The ladder is the established SS-10 method (the match pages have trimmed
on rungs since v13.222):

```ts
let title = name + " — برنامه بازی بعدی و ساعت شروع | اسپرت سیگنال";
if (title.length > 65) title = name + " — برنامه بازی و ساعت شروع | اسپرت سیگنال";
```

The >65 rung drops the least-essential qualifier «بعدی » (5 chars). The
rung title stays honest — the H1 is «برنامه بازی‌های X» (the whole
upcoming schedule, not only the next match) and the answer sentence
(answercard AND meta description, one source) still leads with «بازی بعدی».
The unique core (the team name) never drops — the match ladder's
date-token rule, mirrored; a hypothetical longer name still >65 on the
rung reaches the seo-check >75 hard backstop, never a mangled title.
**Exactly one production title changes: Gladbach 66 → 61.**

**The in-session honesty correction**: the first CHANGELOG draft claimed
the teams-family sitemap lastmod "re-dates AUTOMATICALLY via the
content-hash map" — WRONG on the mechanism: the teams hash is
`sha1ish(name + upcomingBig + next.utcDate)` (files.ts) — DATA-keyed, so a
title-only change does NOT re-date it. Corrected in a5b1ee7 (CHANGELOG +
the v13.229 gate text). The re-crawl rides the ordinary cadence — exactly
the S12 precedent (v13.228 changed all 96 team title renderings with no
teams-family re-date either), and Gladbach's next fixture rotation moves
the hash within days regardless.

**Versioning**: CONTENT_VERSION NOT bumped (no hand-written static page
text changed); NO asset renamed (the v13.39 rule does not fire — the
change rides served HTML); SW v118 → **v119** (the routine served-HTML
evict: stale SWR/offline-fallback team pages carrying the 66-char title
leave the cache).

**Gates co-evolved**: the check-stats SW pin (v119 positive + v118
negative + the round description) + the mc-heroes retirement SW pin (the
second SW pin the first npm test run caught) + the v13.229 release wiring
gate (the v13.228 gate retired to a historical stub). `npm test` at the
release commit: **EXIT 0, 2,614 OK / 0 FAIL** (2,613 + the new wiring
gate). Local smoke (wrangler dev 8787): worker boots, healthz JSON
renders, pages render (team pages need live KV pool data — the local 404
is expected; the acceptance was always post-deploy).

## 5) Ship + live verification (the acceptance)

- **Release**: `2b55421` (v13.229-teamladder) + `a5b1ee7` (the honesty
  correction) — pushed one-shot, verified `git ls-remote` (a5b1ee7 on
  main; the clean origin URL, no token persisted).
- **Deploy**: ONE — version ID `42fe03f8-4bac-4ef3-9a7b-13992d9f5e12`,
  2026-11-06 ~10:29 UTC.
- **healthz**: `ok:true`, **version 13.229-teamladder**, ticks watched
  ≥3 completions across the session (last_cron observed dropping 2 min
  repeatedly), outbox 0, degraded false, beacon route probe 404-on-junk
  (the RUNBOOK §3.5 healthy signature — the route answers and validates).
- **The title live**: `/teams/borussia-monchengladbach` →
  «بروسیا مونشن‌گلادباخ — برنامه بازی و ساعت شروع | اسپرت سیگنال» —
  **61 chars** (was 66), og:title matches (61), the ETag rotated
  (`ss-12fec273a218` → `ss-0279374fa1ff`). A full-clause control
  (رئال سوسیداد, 63) renders the unchanged full clause. The old copy
  served from the Cache API hold (SEO_PAGE_TTL 900s) for ~15 min
  post-deploy — the documented per-colo hold, expired and re-rendered.
- **seo:check vs production (final)**: **EXIT 0 — PASS 254 / FAIL 0 /
  zero report-mode findings** — "all 297 swept titles ≤ 65 chars (max 65)
  — zero pixel-risk band titles (SS-10)". The Gladbach report is GONE;
  the band is now cleaner than the prompt's own 254/0/1.

## 6) The date-gated branches (all correctly N/A this session)

- **The PSG–Roma newly-wired hero ride**: NOT due — the session ran
  2026-11-06, before the Nov 25 20:00Z fixture. The featured slate stays
  the single Atlético–Barcelona slide (Sun 11-08 20:00Z). Dybala's
  portrait (Roma → paulo-dybala.webp) waits for a session on/after the
  fixture — the S10 §4 method.
- **G-14**: NOT due — before 2026-12-01.
  `docs/ai-visibility-prompts.md` stands as S7 left it (the 2026-11 row,
  zero citations).
- **GSC Pages read**: due ≈ 2026-11-09+ — still future at session close;
  carried in OWNER_TODO §3.
- **The 4-club MVP alignment question** (Liverpool Barcola/Wirtz,
  Stuttgart Undav/El Khannouss, Napoli McTominay/De Bruyne, Como Nico
  Paz/Kean): **no owner answer arrived in the S13 prompt** — stays parked
  (§2c/§14; a `heroes:rotate` round only if the owner asks).

## 7) Next-session prompt (S14)

Handed to the owner in chat at session close. Shape: boot gates (fetch/
rebase → npm test 2,614 → seo:check vs production — the new band is
254/0/0, with the documented cold-render dice caveat → epoch guard — bump
the NOW constant FIRST if on/after ~2026-11-25, expires 2026-11-30
15:00Z) + **the RUM multi-day read** (the s13-rum-read.js shape: confirm
11-07→onward days accruing on BOTH datasets — the send.to fix's first
true multi-day window; re-quote the human LCP p75 once a human WV group
exists — the new-portrait-weight question) + the KV band read (Friday
evening's governor behavior worth a look) + **the PSG–Roma (Nov 25)
newly-wired hero ride** if the session lands on/after that fixture
(Dybala's portrait on the featured carousel — the S10 §4 method) + G-14
if the month turned (first session on/after 2026-12-01) + the GSC Pages
read (due ≈ 2026-11-09+ — quote the numbers) + the 4-club MVP question
if answered.
