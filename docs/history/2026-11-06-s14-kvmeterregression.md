# 2026-11-06 — Session 14: the first post-fix human WV sample + the KV meter regression finding

Wall-clock note (the repo's convention): this session ran 2026-11-06
~14:55–16:1x UTC (Tehran ~18:25–19:4x on 11-06), ~4h after the S13 close
(`abb1f92` / 11:00:42Z, no commits in between). The session label stays
2026-11-06, monotonic with S5–S13. Fresh clone this session (the token
scrubbed from git config per the AGENTS hard rule — one-shot push only).

## 1) Boot gates (all green; a five-run seo:check story, every transient direct-verified)

- `git fetch`: origin `main` == the S13 close (`abb1f92`) — no web-UI push,
  no rebase; tree clean.
- `npm test` → **EXIT 0, 2,614 OK / 0 FAIL** — exactly the v13.229 release
  baseline (2,613 + the v13.229 wiring gate).
- `npm run seo:check` vs production — **five runs** (the prompt's band was
  254/0/0 with the cold-render dice caveat):

| run (UTC) | PASS / FAIL / REPORTS | the story |
|---|---|---|
| 1 (~15:0x) | **255 / 0 / 1** EXIT 0 | no fails at all; the 1 report = the T-24 map-miss (below) |
| 2 (~15:2x) | 253 / **2** / 1 | F-M5: `/feed.xml` + `/api/matches.json` "never 304'd across 3 tries" |
| 3 (~15:3x) | 251 / **3** / 1 | `/competitions/persian-gulf-pro-league` 404 ×2 (ItemList child + direct) + the SS-16 feed cache-race on `sepahan-vs-malavan-2026-11-06` |
| 4 (~15:5x, settled) | 253 / **1** / 1 | only `/teams/lorient HTTP 503` — everything from run 3 settled |
| 5 (~16:0x, final) | **255 / 0 / 1** EXIT 0 | the stable band; matches run 1 exactly |

  Every FAIL direct-verified and matched a documented class — none is a
  regression:

  - **Run 2 — the F-M5 epoch-flip double.** The T-13 retry logic absorbs
    ONE data-epoch flip between the two fetches (`router.ts` v13.207
    comment: "a 200 + NEW tag is a legitimate content change — retry
    against it"); two consecutive flips fail the check. Friday afternoon
    pool churn is exactly that window (observed live: `/api/matches.json`
    ETag `ss-85c4be48e618` → `ss-5bd19fc7e736` within ~3 min). Direct
    verification with well-formed `If-None-Match` (all four machine
    surfaces, back-to-back): **304 on all four**, both the failing pair and
    the passing pair. Runs 3/4/5: T-13 fully green. (Forensics note: an
    early manual test that "showed" 200-on-stable-ETag was an artifact of a
    malformed `If-None-Match` header in the test itself — a garbage
    validator MUST get 200; the worker's weak comparison is intact.)
  - **Run 3 — the Sepahan–Malavan FT rotation caught mid-sweep.** The PGL
    match (the day's only PGL fixture, Tehran-evening kickoff) finished
    ~15:15–15:18 UTC and rotated out of the upcoming pool: `compsIndex`
    dropped the PGL → fresh renders of `/competitions/persian-gulf-pro-league`
    404 while cached copies of `/competitions` (s-maxage 60 + SWR 300 + the
    per-machine Cache API hold) still listed the tile — the check fetched
    the stale ItemList and the fresh child. Direct verification: the fresh
    (cache-busted) `/competitions` render lists **6 competitions, PGL
    gone**; the match page itself 200s; the good PGL page copy (rendered
    ~15:06) served stale at age 754 s; alternating 503/200/404/404/200
    across consecutive requests = per-reno cold renders (503
    exceededResources — the documented dice) vs stale copies (200) vs
    fresh renders (404). Run 4 (settled): ItemList == 6 == tiles ==
    children, all children 200. The SS-16 feed race on the same match
    (feed `<updated>` 14:56:37 vs sitemap lastmod 15:18:17) is the same
    rotation event — the check's own text ("re-run after the 300 s feed
    cache window if a live match just changed state — the known cache-race
    caveat") is the documented handling; runs 4/5: "all 30/28 feed
    entries' `<updated>` match their sitemap lastmod" ✓.
  - **Run 4 — the documented cold-render dice.** `/teams/lorient` 503 →
    direct-verified **200 ×3 with full HTML** (0.38 s → 0.10 s warming).
    Run 5: gone. Exactly the v13.186-seofix class (S13 saw it twice on
    dortmund pages).
  - **The band drift 254→255 PASS and 0→1 REPORT is data-driven, not
    drift in the checks.** The T-23 sweep count rode the live pool
    (279 → 279 → 279 → 275 → 276 swept URLs across the five runs — the
    Friday rotation); the T-24 map-miss report (2 feed entries outside the
    matches sitemap children — "the map-miss fallback — data epoch") is
    the documented 1–2-entry live-pool drift class that "rode every
    previous run" before it self-resolved on S9 (CHANGELOG v13.225 note;
    S9's equivalent read was itself 255/0/1). The hard lines held on every
    run: FAIL 0 except the direct-verified transients, all swept titles
    ≤ 65 chars (max 65, zero pixel-risk band titles), descriptions 50–165
    (max 165), uniqueness, per-match OG images.
- **Epoch guard**: `check-hero-carousel.js` NOW =
  `2026-11-30T12:00:00.000Z` — UNEXPIRED (session ran 2026-11-06, 19 days
  clear of the ~2026-11-25 bump threshold; the 2026-11-30 15:00Z horizon
  far away). No bump; the guard carries to S15 unchanged.

## 2) The RUM multi-day read — 11-06 still accruing on BOTH datasets + the FIRST post-fix human WV sample

The pull (`scripts/s14-rum-read.js` — the S13 method carried forward; raw:
`docs/history/2026-11-06-s14-rum-raw.json`, pulled 15:42:32 UTC):

| day | WebVitals | Pageloads |
|---|---|---|
| 2026-10-31 → 2026-11-04 | the pre-outage series unchanged (15 groups; the last full HUMAN window) | unchanged (14 groups) |
| 2026-11-05 | — (the permanently-unwitnessed hole, documented S11) | — |
| **2026-11-06** | **2 groups: bot/desktop n=41 LCP p75 692 ms + HUMAN/MOBILE n=1 LCP p75 1,964 ms** (S13's 10:18 read: bot-only n=24 / 784 ms — the day grew +75% and gained its first human sample) | **3 groups: human/mobile n=39 (was 22) + human/desktop n=1 + bot/desktop n=4 — 44 visits total (was 27)** |
| 2026-11-07 | 0/0 (the UTC day had not rolled — expected) | 0/0 |

**Confirmation**: the send.to fix's first UTC day (~15.7 h deep at the
read) kept accruing on BOTH datasets — WV n 24→42 (+75%), PL visits 27→44
(+63%, human/mobile 22→39) since S13's 10:18 read. The accrual did not
stall.

**The human LCP p75 re-quote: the S13 gate now PASSES — a human WV group
exists.** The first post-fix human data point: **2026-11-06 human/mobile,
n=1, LCP p75 1,964 ms** (INP p75 −1 — no interaction sample yet). The
honest framing: with n=1 the p75 IS that single visit's LCP, not a stable
quantile — but the first post-fix human sample sits **below** the pre-fix
full-window mobile p75 (2.53 s, 10-31→11-04; desktop 2.36 s). The
new-portrait-weight question stays OPEN pending real human windows (days,
not hours — the pre-fix baseline needs a comparable post-fix window);
S15 re-reads with this script shape.

**The 11-07 marker: 0/0 — expected.** The UTC day rolls at 00:00Z (~8 h
after the read). The TRUE multi-day window (11-07→onward) opens tonight;
S15's read is the confirm (this session cannot honestly claim it).

## 3) The KV band read — THE FINDING: the kv_writes_day meter REGRESSED mid-afternoon

The standing watch (RUNBOOK §8 method — REST reads + healthz):

| read (UTC) | cron_status_v1.kv_writes_day | kv_writes_web_v1 | combined (healthz) |
|---|---|---|---|
| ~10:20 / ~10:26 / ~11:05 (S13) | 361 / 365 / **397** | 159 / 159 / 180 | 520 / 524 / 577 |
| ~15:22 (S14 boot) | **321** | 238 | 559 |
| ~15:31 → 15:39 (4 samples) | **325** (stable, +4 per tick) | 238 | 563 |

**The regression**: the cron-side counter DROPPED from 397 (11:05) to a
~317 base (the 15:20 tick compounded 3+1+317=321) on the SAME `kv_day`
(2026-11-06). A since-midnight fold cannot decrease legitimately: between
11:05 and 15:22 at least 26 tick slots ran (heartbeat ≤3-min fresh at
every S14 read), each completed tick writing ≥2 KV entries (the lock put +
the completion blob) — ≥52 writes, plus the 14:30 full sweep (~25–30) —
so the 15:22 reading should be ≥ ~475. It read 321: **the meter
under-counts by ≥150 (best estimate ~165–180)**. The counter has been
compounding normally since (+4/tick at every sample).

**The mechanism (code-read, `src/cron.ts`)**: only the tick's completion
blob writes `cron_status_v1`, folding `kvWritesThisTick + 1 + prevBlob`
(line 190) on a prevBlob read near the tick's end (line 166). A
regression requires a tick whose prevBlob read returned an OLDER, LOWER
value than the live counter — i.e. KV eventual-consistency lag across
colos, plausibly amplified by overlapping ticks: **`LOCK_TIMEOUT` is 4
minutes (`config.ts:499`) while match-night ticks legitimately run 6.5+
min wall (RUNBOOK §7)** — the lock expires mid-tick exactly on busy
fixture windows (this afternoon's Sepahan–Malavan FT burst ~15:15–15:18).
The lag class was observed live at 1-write scale between S14's own
samples: the 15:20 tick wrote 321, the 15:30 tick's fold read prev=320
(4+1+320=325) — one write behind, ten minutes later. Over a full
afternoon with a full sweep + an FT fan-out + colo-hopping ticks, the
same lag at a burst scale is the regression vector.

**The impact**: the governor AND healthz read the metered value
(`cron-preflight.ts` folds cron + web for the SOFT 700 / HARD 850 lines —
`config.ts:532-533`; healthz's degraded band ≥700). With the meter ~170
low, the governor engages ~170 writes LATE vs the true burn. The true
combined burn by ~15:31 was ~750±30 (metered 563). Practical ceiling note:
the free tier is 1,000/day; the fail-closed backstops (the guarded lock
write that defers notifications on KV-write failure, dedupe write-first,
defer-to-next-tick) are the real wall protection — the Sep 14 outage
shaped them; the S9 Europa-Thursday 820 precedent is the highest TRUE
burn ever observed.

**The Friday-evening governor answer (the prompt's ask)**: the governor
NEVER engaged — `budget: null` at every read (S13's three + S14's five);
combined metered peak 577; every read far under the 700 reference / 820
SOFT / 850 HARD lines. And the evening itself is QUIET BY POOL: the day's
only Tehran-evening fixture (Sepahan–Malavan) finished ~15:15 UTC with a
quiet fan-out (breadcrumb `f:2, n:0, d:0`, outbox 0), and the scheduler
now shows `UPCOMING / next:21h` with **next kickoff 2026-11-07T12:30Z**
(Leeds–Tottenham) — no Friday-evening fixtures remain in the pool, so
tonight's burn is the quiet-tick baseline (~+35–45 by midnight): the true
combined burn ends the day ~790–800, under the 1,000 wall even with the
meter under-counting. Tick health at every S14 read: heartbeat/last_cron
1–9 min, outbox 0, `sched_feed_ok` true, degraded false.

**The S15+ candidate fix (a design decision, NOT a Friday-evening
hot-fix)**: a race-resistant fold (e.g. `max(prevRead, lastWrittenFloor)`
persisted separately, or moving the counter to D1 `UPDATE … SET n = n + 1`
— KV has no atomic increment) would close the class. Flagged for a calm
session (Monday+); the change touches the budget-governor path and
deserves its own gates. Until then: **read the meter knowing it under-counts
~170 today** — the S15 watch instruction.

## 4) The date-gated branches (all correctly N/A this session)

- **The PSG–Roma newly-wired hero ride**: NOT due — the session ran
  2026-11-06, 19 days before the Nov 25 20:00Z fixture. The featured
  slate stays the single Atlético–Barcelona slide (Sun 11-08 20:00Z —
  confirmed live in the tick breadcrumb `l:
  "clubatleticodemadrid|barcelona|2026-11-08T20:00"`). Dybala's portrait
  (Roma → paulo-dybala.webp) waits for a session on/after the fixture —
  the S10 §4 method.
- **G-14**: NOT due — before 2026-12-01.
  `docs/ai-visibility-prompts.md` stands as S7 left it (the 2026-11 row,
  zero citations).
- **GSC Pages read**: due ≈ 2026-11-09+ — still future at session close
  (2026-11-06); carried in OWNER_TODO §3. The first session on/after
  ~11-09 quotes the numbers.
- **The 4-club MVP alignment question** (Liverpool Barcola/Wirtz,
  Stuttgart Undav/El Khannouss, Napoli McTominay/De Bruyne, Como Nico
  Paz/Kean): **no owner answer arrived in the S14 prompt** — stays parked
  (§2c/§14; a `heroes:rotate` round only if the owner asks).

## 5) Ship (docs-only release — NO deploy)

- Changes: `scripts/s14-rum-read.js` (the S14 RUM read one-off, committed
  per the s10–s13 convention), `docs/history/2026-11-06-s14-rum-raw.json`
  (the raw pull), this session note, and the OWNER_TODO S14 bullet. No
  `src/` change → **no deploy** — production stays `v13.229-teamladder`
  (verified via healthz at every read; version ID
  `42fe03f8-4bac-4ef3-9a7b-13992d9f5e12` from S13 stands).
- `npm test` re-run at the release commit before the push (the AGENTS hard
  rule): **EXIT 0, 2,614 OK / 0 FAIL**.
- Pushed one-shot (token in the URL, never persisted in git config),
  verified with `git ls-remote`.

## 6) Next-session prompt (S15)

Handed to the owner in chat at session close. Shape: boot gates (fetch/
rebase → npm test 2,614 → seo:check vs production — the hard line is
FAIL 0; the stable band is 255/0/1-ish and data-driven (the PASS count
rides the live pool; the T-24 map-miss report is the documented live-pool
drift class); the documented transients, ALL re-run-before-diagnosing:
the cold-render 503 dice on a random cold page, the F-M5 epoch-flip
double on `/feed.xml`+`/api/matches.json` under pool churn, and the
match-rotation mid-sweep race (a finishing match rotating a league out of
`compsIndex` while cached index copies still list it — settles inside
~15 min) → epoch guard — bump the NOW constant FIRST if on/after
~2026-11-25, expires 2026-11-30 15:00Z) + **the RUM multi-day read**
(the s14-rum-read.js shape: confirm 11-07→onward days accruing on BOTH
datasets — the send.to fix's first TRUE multi-day window opens 00:00Z
2026-11-07; re-quote the human LCP p75 once a real human window exists —
the new-portrait-weight question; the first post-fix human sample is
11-06 mobile n=1 LCP 1,964 ms) + **the KV band read with the regression
lens** (the meter under-counted ~170 from the 11-06 afternoon regression
— check whether the regression recurs overnight; if it does, the race-
resistant fold / D1 atomic counter is the fix decision; the S9 820
precedent is the reference TRUE burn) + the PSG–Roma (Nov 25 20:00Z)
newly-wired hero ride if the session lands on/after that fixture
(Dybala's portrait on the featured carousel — the S10 §4 method) + G-14
if the month turned (first session on/after 2026-12-01) + the GSC Pages
read (due ≈ 2026-11-09+ — quote the numbers) + the 4-club MVP question
if answered.
