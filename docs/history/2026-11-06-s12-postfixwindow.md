# 2026-11-06 — Session 12: the post-fix window read + the standing watch + THE FARSI-BRAND SEO ROUND (v13.228-farsibrand)

Wall-clock note (the repo's convention): this session ran 2026-11-06
01:48–03:1x UTC (Tehran 05:18–06:4x on 11-06), directly after the S11
end-checkpoint (4d03dec / v13.227-rumzone, deploy 74b4218b). The session
label stays 2026-11-06, monotonic with S5–S11.

The S12 prompt's two halves both landed: (1) the post-fix reads — the RUM
window confirmed accruing on BOTH datasets through the deploy boundary, the
KV band read clean, all date-gated branches correctly N/A — and (2) the
owner's new standing directive, shipped as **v13.228-farsibrand**: every
SERP surface now renders the brand in Farsi as «اسپرت سیگنال», the
match-page titles carry the leading ⚽, and the meta descriptions follow.

## 1) Boot gates (all green, zero drift)

- `git fetch`: origin `main` == the S11 close (`4d03dec`) — no web-UI
  push, no rebase; tree clean.
- `npm test` → **EXIT 0, 2,612 OK / 0 FAIL** — exactly the v13.227 baseline.
- `npm run seo:check` vs production → **EXIT 0, PASS 255 / FAIL 0 /
  REPORTS 1** vs the prompt's 254/0/0 band — the honest deltas: +1 page
  (the live pool grew; the sweep fetched 287 URLs) and ONE benign report
  (the T-24 map-miss "data epoch" class that self-resolved once before —
  zero FAIL, so the band held on every hard line).
- **Epoch guard**: `check-hero-carousel.js` NOW =
  `2026-11-30T12:00:00Z` — UNEXPIRED (session ran 2026-11-06, 24 days
  clear of the 2026-11-30 15:00Z horizon; the ~2026-11-25 bump threshold
  not approached). No bump; the guard carries to S13 unchanged.

## 2) The RUM post-fix window read — 11-06 accruing on BOTH datasets (the send.to fix's first day)

The pull (`scripts/s12-rum-read.js` — the S11 method + the 11-06/11-07
day-probes; raw: `docs/history/2026-11-06-s12-rum-raw.json`, pulled
02:09:32 UTC):

| day | WebVitals | Pageloads |
|---|---|---|
| 2026-10-31 → 2026-11-04 | the pre-outage series unchanged (15 groups; the last full HUMAN window) | unchanged (14 groups) |
| 2026-11-05 | — (the permanently-unwitnessed hole, documented S11) | — |
| **2026-11-06** | **1 group: bot/desktop n=11, LCP p75 668 ms** | **3 groups: human/mobile n=11 + human/desktop n=1 + bot/desktop n=2** |
| 2026-11-07 | 0/0 (the UTC day had not rolled — expected) | 0/0 |

**Confirmation**: the send.to fix's first day IS accruing on BOTH
datasets — the pre-fix pull (S11, ~00:58 UTC) saw WV n=3 + PL n=3/n=2 land
~6 min after deploy; by 02:09 the same day had grown to WV n=11 + PL 14
visits; a post-v13.228-deploy probe (~02:55 UTC) read **WV bot/desktop
n=17 (LCP p75 692 ms) + PL human/mobile n=16 + human/desktop n=1 +
bot/desktop n=4** — the pipeline flows through the deploy boundary (the
beacon override survived on both templates; check-seo-lastmod #9 held it).

**The human LCP p75 re-quote: NOT yet possible** — "once n allows" was the
prompt's own gate, and n does not allow yet: the 11-06 WebVitals group is
bot-only (no human WV sample has landed post-fix; the day is ~5h old at
the last probe). The last full HUMAN window remains 10-31→11-04 (desktop
LCP p75 2.36 s / mobile 2.53 s). **The new-portrait-weight question
carries unchanged** — it needs fresh post-fix human windows, days not
hours; the multi-day window (11-06→…) opens as the days roll. S13 should
re-read with the same script shape and re-quote if a human group exists.

## 3) The KV band read (the standing watch) — clean both reads

| read | cron_status_v1.kv_writes_day | kv_writes_web_v1 | combined (healthz) |
|---|---|---|---|
| ~02:15 UTC (boot) | 60 | 54 (`{"d":"2026-11-06","n":54}`) | 114 |
| ~02:55 UTC (post-deploy) | 70 | 71 | 139–141 |

Both far under the 700 reference / 820 SOFT / 850 HARD lines — a fresh
UTC mid-day shape (the 00:00 reset cleared the Europa-Thursday burn; the
web meter's 54–71 includes the session's own two full seo:check sweeps,
~290 production pages each). Tick health at both reads: heartbeat/last_cron
2–10 min, subreq_last_tick 28–38 (< 42), outbox 0, `budget: null`, feed ok,
sched UPCOMING (next ko 2026-11-06T08:40Z). The pre-match notify breadcrumb
showed the featured clásico (Atlético–Barcelona, 11-08 20:00Z) entering
its window evaluation — 0 sent, correct (the 72h window opens later).

## 4) The date-gated branches (all correctly N/A this session)

- **The PSG–Roma newly-wired hero ride**: NOT due — the session ran
  2026-11-06, before the Nov 25 20:00Z fixture. The featured slate stays
  the single Atlético–Barcelona slide (Sun 11-08 20:00Z, both master ✓).
- **G-14**: NOT due — before 2026-12-01.
  `docs/ai-visibility-prompts.md` stands as S7 left it (the 2026-11 row,
  zero citations).
- **GSC Pages read**: due ≈ 2026-11-09+ — still future at session close;
  carried in OWNER_TODO §3.
- **The 4-club MVP alignment question** (Liverpool Barcola/Wirtz,
  Stuttgart Undav/El Khannouss, Napoli McTominay/De Bruyne, Como Nico
  Paz/Kean): **no owner answer arrived in the S12 prompt** — stays parked
  (§2c/§14; a `heroes:rotate` round only if the owner asks).

## 5) THE FIX — v13.228-farsibrand (the owner's S12 directive)

**The directive** (verbatim intent): the SEO page names must write the
brand in Farsi — «اسپرت سیگنال» — not the Latin `SportSignal` (a Latin
token inside an otherwise-Farsi title is a language mismatch for Farsi
queries); a football emoji where it genuinely helps; and a
meta-description work pass.

**The canonical spelling decision**: «اسپرت سیگنال» — the owner's own
spelling in the S12 message AND the owner-verified X display name
(x.com/sportsignalz, verified live 2026-11-05 21:33 UTC). The older
rendering «اسپورت‌سیگنال» (the Phase-1 `SEO.SITE_NAME_FA`) retires;
`SEO.SITE_NAME_FA` (→ JSON-LD Organization/WebSite `alternateName` on
every page), the llms.txt Farsi glosses and the about-page
name-introduction surfaces all align — ONE Farsi rendering everywhere the
site speaks Farsi.

**The title sweep** — 24 sites: the match pages' trim-ladder brand rungs
(tCore + the two 65-gated rungs), the four time-hub titles, the
teams/competitions index titles, the per-team/per-competition titles, the
/matches pagination, the static trust pages (about/contact mid-title
forms + privacy/terms/data/methodology/sitemap suffixes), the homepage,
and BOTH 404s (the page-shell 404 + the router's inline 404). Every
`| SportSignal` becomes `| اسپرت سیگنال`. The 65-char ladder is
structurally untouched — the brand is +2 chars (12 vs 10), so the longest
pairings drop the Gregorian parens one rung earlier; by design (the ≤65
invariant stays structural; the >75 backstop unchanged; verified live:
`⚽ سپاهان – ملوان | لیگ برتر خلیج فارس، ۱۵ آبان | اسپرت سیگنال` = 52).

**The ⚽ call** (the owner's "if you think it helps", made once,
documented): ONE ball, leading, on the FIXTURE surface only. A listing is
not a fixture — the hub/index/home/static titles stay text-only; the H1s
never carry it. The ⚽ rides bidi-correctly at the reading start of the
RTL title (worst case a renderer strips it in display; the token stays in
the HTML title and in og:title, where it renders in social/IM cards).

**The meta-description pass**: every description that named the brand
followed — the match-page short-desc fallback («…در اسپرت سیگنال.»), the
team/competition answer sentences (the answercard AND the desc share the
one source — one edit fixed both), the hub FAQ name-introductions
(«…بازی در برنامه اسپرت سیگنال است:»), the static pages' descriptions,
and the /matches answer. The FAQ_ABOUT answer + the about answercard
intro got the spelling fix (اسپرت سیگنال; the «(SportSignal)» pairing
stays — it explains the domain brand). **The about-page owner-verbatim
STORY keeps its Latin brand mentions BY DESIGN** (the story is the
owner's voice, verbatim; the page's title/desc/h1/answercard-intro carry
the Farsi rendering). Identifiers stay Latin everywhere: the bot handle,
the X handle, the domain, og:site_name, twitter:site.

**Versioning**: CONTENT_VERSION 2026-11-06T21:50:00Z →
2026-11-06T23:00:00Z (hand-written page text changed — the v13.215
precedent; the pages-family sitemap lastmod re-dates = the re-crawl
nudge for the new titles); NO asset renamed (the v13.39 rule does not
fire — every change rides served HTML); SW v117 → **v118** (the routine
served-HTML evict).

**Gates co-evolved**: the seo-check hub-FAQ count regex
(«…برنامه اسپرت سیگنال است» — the T-20 byte-agreement is source-shared);
the check-stats SW pin + the v13.228 release wiring gate (the v13.227
gate retired to a historical stub); the check-mc-heroes retirement pin
follows. `npm test` at the release commit: **EXIT 0, 2,613 OK / 0 FAIL**
(2,612 + the new wiring gate). Local smoke (wrangler dev 8787): healthz
JSON + homepage 200 + /about /matches/today /teams /competitions
/zzz-unknown all rendering «اسپرت سیگنال» + the beacon send.to override
intact in the served HTML.

## 6) Ship + live verification (the acceptance)

- **Release**: `8410f3c` (v13.228-farsibrand, tag `v13.228-farsibrand`) —
  pushed one-shot, verified `git ls-remote` (8410f3c on main + tag; the
  clean origin URL, no token persisted).
- **Deploy**: ONE (the session's single deploy) — version ID
  `694c470f-9d11-437b-9802-87389a8e3d40`, 2026-11-06 ~02:26 UTC.
- **healthz**: `ok:true`, **version 13.228-farsibrand**, ticks 2–3 min
  (watched ≥2 full ticks complete), outbox 0, feed ok, subreq 28.
- **Titles live** (curl, production): homepage «برنامه بازی‌های مهم فوتبال
  | تاریخ و ساعت شروع | اسپرت سیگنال»; a real live-pool fixture
  `/matches/sepahan-vs-malavan-2026-11-06` → «⚽ سپاهان – ملوان | لیگ
  برتر خلیج فارس، ۱۵ آبان | اسپرت سیگنال» (52 chars — the ladder dropped
  the Gregorian parens exactly as designed); `/about`, `/matches/today`
  (T-14 Jalali token intact), `/teams`, `/competitions`, the 404 — all
  «اسپرت سیگنال»; og:title carries the ⚽ + Farsi brand.
- **Browser (fresh session, agent-browser on the live site)**: title
  renders; **the beacon POST observed same-origin in the network log:
  `POST https://sportsignal.ir/cdn-cgi/rum (XHR) 204`**; the beacon attr
  carries the send.to override; 4 painted hero figures + 2 mobile ports,
  car ۱/۱, `heroArtFor` a function, 5 mrows; **zero console and page
  errors**. Screenshots:
  `docs/history/2026-11-06-s12-desktop-live.png` (default 1440×900) +
  `2026-11-06-s12-mobile-live.png` (390×844).
- **The two documented deploy transients, both self-healed**: one
  first-render 503 on `/matches/paris-saint-germain-vs-paris-2026-12-12`
  (the RUNBOOK §7b cold-cache dice — 200 on re-fetch, the per-colo hold
  populated) and three T-24 feed `<updated>` races on the day's Iranian
  fixtures (the 300s feed-cache window vs the sitemap lastmod — the
  check's own documented caveat; clean on the re-run after the window).
- **seo:check vs production (final)**: **EXIT 0 — PASS 254 / FAIL 0 /
  REPORTS 1**. The one report (surfaced, non-fatal):
  `/teams/borussia-monchengladbach` at 66 chars — the +2 brand delta put
  the ONE longest team name one char into the 66–75 pixel-risk band
  (was 64). A candidate re-cut for S13 (shorten the fixed team-title
  clause or give team titles their own ladder); NOT worth a second deploy
  this session.

## 7) Next-session prompt (S13)

Handed to the owner in chat at session close. Shape: boot gates (fetch/
rebase → npm test 2,613 → seo:check vs production → epoch guard — bump
the NOW constant FIRST if on/after ~2026-11-25) + **the RUM multi-day
read** (the s12-rum-read.js shape: confirm 11-06→onward days accruing on
BOTH datasets — the send.to fix's first multi-day window; re-quote the
human LCP p75 once a human WV group exists — the new-portrait-weight
question) + the KV band read + **the PSG–Roma (Nov 25) newly-wired hero
ride** if the session lands on/after that fixture (Dybala's portrait on
the featured carousel — the S10 §4 method; Roma → paulo-dybala.webp) +
G-14 if the month turned (first session on/after 2026-12-01) + the GSC
Pages read (due ≈ 2026-11-09+ — quote the numbers) + the 4-club MVP
alignment question (owner decision, parked) + the Gladbach 66-char
team-title report (decide: re-cut the fixed clause vs a team-title
ladder vs accept).
