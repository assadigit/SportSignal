# Match Centre — Form Indicators Matrix (M5 gate)

**Session**: S13 (M5 gate) — the home/away performance metrics + the M5 gate (M5, session 2 of 2).
**Form renderer**: `src/seo/match-centre.ts` `matchFormHtml` (S12 — the W/D/L dots + the count summary + the season-record chip fallback + the latest-results list).
**Metrics renderer**: `src/seo/match-centre.ts` `matchMetricsHtml` (S13 — the numerical GF/GA/clean-sheets comparison).
**Data layer**: `src/seo/data.ts` `teamForm` + `teamSeasonRecord` (S12 feeds, byte-frozen) + `teamCompMetrics` (NEW S13 — the aggregation helper).
**Projections**: `src/seo/pages.ts` `matchFormInput` (S12) + `matchMetricsInput` (S13 — the pre-built-atoms projections).
**Specification**: §9 "Team form and recent results" + milestones-and-sessions.md M5/S12 + M5/S13 + decisions 28–36 (33/34/35 for the metrics).

This document is the M5 gate's form-indicators + performance-metrics documentation
deliverable (the M4 gate precedent — docs/mc/standings-window-matrix.md). It carries:

1. The S12 form indicators — the W/D/L dots, the count summary, the season-record
   chip fallback, the latest-results list, the participant-mark, the fail-closed gate.
2. The S13 metrics algorithm — the GF/GA standings provenance (audit grade A), the
   clean-sheet pool+archive aggregation (audit grade D), the minimum-sample gates,
   the sample-label policy, the missing-vs-zero law.
3. The fail-closed gates + the wiring (decision S13-1: the metrics ride INSIDE the
   `#mcentre-form` section — no new section anchor, no new nav destination).
4. Representative examples — the REAL renderer output (the same fixtures
   `scripts/check-match-centre.js` uses).

---

## 1. The S12 form indicators (the recap)

### The W/D/L dots (decisions 28/30/31)

Five compact, non-interactive circular W/D/L indicators per team (the `.fdot`
vocabulary — ب=برد م=مساوی ش=شکست, the letters inside the dots are the accessible
non-color cue, decoded by the `.formlegend` legend). Data: `teamForm(ctx, teamName,
archiveRows)` — the pool's FINISHED rows (~7-day retention) + the long-lived seo
archive (365-day retention, big matches), deduped on the sorted-pair+day key, the
**min-3 gate** (fewer than 3 finished results → no dots — a 2-dot "form" reads as
noise). DOM order oldest→newest so RTL renders the newest dot leftmost. The dots
carry NO title attribute on the match page (spec §9 "Non-interactive: no tooltip,
click or expand" — the hover-title text is promoted to the visible results list).

### The count summary + the season-record chip fallback (decision 28, the v13.88 behavior)

A dots side renders the W·D·L count summary («۴ برد · ۱ مساوی · ۰ شکست»). A side
with NO dots falls back to the season aggregate chip (`.fseason` — the
`teamSeasonRecord` richest-record lookup ACROSS competitions: position + W/D/L +
«از N بازی [compFa]»); a chip side carries NO results list (no fake per-match
granularity). The `<h2>` title switches from «فرم اخیر» to «وضعیت فصل» when EVERY
side falls back to the aggregate.

### The latest-results list (spec §9 "Latest five results")

A compact vertical list UNDER the dots (`.formresults`): each row = the W/D/L dot +
the opponent (`.fropp`) + the score (`.frscore`) + the date (`.frdate`, the D2
compact calendar «۱۵ آبان (۵ نوامبر)») — from the SAME `teamForm` return (zero new
data work). No match links (teamForm does not surface the fixture slug; the S11
"no team-page navigation" discipline).

### The participant-mark (decision 25, typography-only)

`.formteam.mcentre-form-participant` — font-weight:600 + #7dd3fc on the team names
via the page-shell S12 CSS rule (`#mcentre-form .formteam.mcentre-form-participant`),
scoped to `#mcentre-form`, NO background. The S13 metrics card rides inside the same
section, so the SAME rule applies to the metrics column team names (reused, never
duplicated).

---

## 2. The S13 metrics algorithm (specification §9 "Home/away performance")

### What is compared (decisions 33/35)

The NUMERICAL comparison — گل زده (goals scored) / گل خورده (goals conceded) /
کلین شیت (clean sheets) — the two participants compared side by side (the home
team column FIRST = right under native RTL; "home/away" = the two participants,
NOT home-only/away-only splits — the standings source carries full-season team
aggregates). **Numbers only** (decision 35: no decorative bars, charts or gradients
— the numerals are the comparison; the renderer emits no svg/canvas/gradient/
inline-style markup, the CSS block carries none either).

### GF/GA provenance (audit grade A — the fixture's OWN competition standings)

`teamCompMetrics(ctx, teamName, archiveRows, fullByCode, compCode)` looks the team
up in the **fixture's own competition standings rows** — THREE already-loaded
projections of the same `standings_cache_<CODE>` rows, in preference order, and
the chosen table's row for THIS team must carry the gf/ga aggregates (a row
without aggregates falls through to the next source; a team in no usable table →
null):

1. `fullByCode[compCode]` — the fullByCodeFor await (loaded by buildMatchPage for
   exactly `sm.s.competition.code`), the freshest full table. **The real-data
   discovery (the mcM5x preview smoke)**: the v13.89-stdetail `fullStandings`
   loader projects these rows WITHOUT gf/ga (pos/name/faName/played/won/draw/
   lost/points only), so this source's rows never carry the aggregates today —
   the row check falls through automatically, and a future loader that keeps
   the aggregates upgrades the metrics to full-table coverage with ZERO changes
   in teamCompMetrics.
2. `ctx.payload.standings[compCode]` — the top-8 compact (v12.16: "full per-team
   stats ride along" — gf/ga included).
3. `ctx.payload.ucl` — the FULL UCL league-phase table (CL fixtures only — the
   teamSeasonRecord third source; the compFa = `translateCompetition("CL")`).

The lookup is the **FIXTURE-competition lookup** — NOT the S12 season chip's
richest-record lookup ACROSS competitions (`teamSeasonRecord`): the two concerns
stay distinct, so a cup fixture against a league table never leaks league
aggregates in. Practical coverage today: the metrics render for the teams the
already-loaded projections carry with aggregates (the top-8 compact per league +
the full CL table); a team outside those tables (e.g. a bottom-half side not in
the top-8 compact) omits honestly — the one-sided rendering law.

### Clean-sheet aggregation (audit grade D — derivable, partial coverage)

Clean sheets count finished fixtures with 0 conceded **in the fixture's
competition**, from the SAME source merge `teamForm` reads:

- `ctx.pool` FINISHED rows (`raw.score.fullTime` + `raw.competition.code`),
- the ALREADY-LOADED archive rows (caller-passed; `m.score` + `m.competition.code`,
  the pubMatch shape),

deduped on the sorted-pair+day key (the teamForm key), filtered to
`compCode`, and gated by a **minimum sample**:

| csSample (the merge's team-sample size) | returns |
|---|---|
| < 3 | `cs: null, csSample: null` — the metric omits (a 1-2 game sample is noise; never a misleading count) |
| ≥ 3 | `cs` (the 0-conceded count) + `csSample` (the honest window size) |

The partial coverage (the tracked big-match universe only — the pool keeps finished
rows ~7 days, the archive keeps 365 days of BIG matches) is why the gate exists and
why the window note exists (below).

### The sample-label policy (decisions 33/34)

- ONE shared sample label per team column: **«در N بازی [compFa]»** where N = the
  standings row's OWN `played` count (unequal samples label honestly — played 11 vs
  10 renders «در ۱۱ بازی…» vs «در ۱۰ بازی…», each side its own count).
- The clean-sheet metric carries its own window note **«در N بازی»** ONLY when its
  sample MATERIALLY differs from the shared label's played count:
  `|csSample − played| ≥ 2`. A one-match lag between the standings snapshot and the
  newest finished round is timing noise (no note); two or more missing games is a
  genuinely smaller window (the note discloses it).

### The minimum-sample gates

Two independent gates:

1. **The side gate (GF/GA)** — a missing table / a team not in the table /
   pre-season (`started === false`) / a degenerate table (<2 teams) / `played = 0`
   / a missing gf|ga aggregate → the side returns NULL (the column omits entirely —
   a missing table is NOT zero; the other side still renders).
2. **The clean-sheet metric gate** — `csSample < 3` → `cs = null` (the side's
   clean-sheet cell renders the muted «—» marker, NOT a zero; when BOTH sides are
   below the gate the کلین شیت row omits entirely).

### The missing-vs-zero law (specification §16)

Missing is not zero — and the distinction is made VISIBLE:

| state | renders |
|---|---|
| the clean-sheet sample is insufficient (cs null) | the muted «—» marker (`.mcmnd`) |
| 0 clean sheets in a sufficient sample (a REAL zero) | «۰» — a plain number cell |
| gf 0 / ga 0 with played > 0 (the authoritative standings table) | «۰» — real zeroes |
| neither side has sufficient stats (both null) | the metrics block omits entirely (`""`) |

### The numerals + the vocabulary

`toFaDigits` everywhere (the S11 `.stpos`/`.stgd` precedent). The row labels:
گل زده / گل خورده / **کلین شیت** (the common Persian football-media loanword —
compact for the label column); the card title «مقایسه آمار فصل»; the corner header
«آمار» (the first column carries the metric names — a real `<th scope="col">`,
not an empty corner).

---

## 3. The fail-closed gates + the wiring (decision S13-1)

- **Both form sides empty AND both metric sides null** → the whole `#mcentre-form`
  section omits (the no-empty-cards law) → the فرم nav item stays filtered out (the
  adaptive Q9=B filter reads the same part).
- **The form card fails, the metrics render** (or vice versa) → the section
  survives on whichever card renders; the COMBINED form part
  (`formPartHtml = formHtml + metricsHtml`) feeds BOTH `matchNavHtml` and
  `matchCentreMain`, so the فرم nav item lights when EITHER card renders.
- **A one-sided metrics omission** (null side) → that side's column drops honestly
  (the data side still renders — never fabricated cells for the missing side).
- The metrics ride **INSIDE the `#mcentre-form` section, AFTER the two form
  sides** — a SIBLING `.card.mcentre-metrics` under the form card. NO new section
  anchor, NO new nav destination (the eleven-slot registry + the five nav
  destinations are unchanged).
- **Zero runtime cost** (the zero-runtime-cost law): the projection reads the
  already-loaded standings (fullByCodeFor await) + the already-loaded archive
  (loadArchive await) + the already-patched pool; `buildMatchPage`'s await count
  stays exactly 3; the composer stays the S02 pure leaf.

---

## 4. Representative examples (the REAL renderer output)

### 4.1 The mixed form case — home dots + away season chip (the REAL matchFormHtml)

Home (آرسنال): 4W·1D·0L dots + 3 visible results; away (اورتون): no dots → the
season-record chip fallback («ردیف ۲ ۶ب ۲م ۲ش از ۱۰ بازی لیگ برتر انگلیس»); the
title stays «فرم اخیر» (any side has dots):

```html
<div class="card formstrip"><h2>فرم اخیر</h2><p class="formlegend"><i class="fdot fw">ب</i>برد · <i class="fdot fd">م</i>مساوی · <i class="fdot fl">ش</i>شکست</p><div class="formrow"><span class="formteam mcentre-form-participant">آرسنال</span><span class="formdots"><i class="fdot fw">ب</i><i class="fdot fd">م</i><i class="fdot fw">ب</i><i class="fdot fw">ب</i><i class="fdot fw">ب</i></span><span class="formsum">۴ برد · ۱ مساوی · ۰ شکست</span></div><ul class="formresults"><li><i class="fdot fw">ب</i><span class="fropp">ولورهمپتون</span><b class="frscore">۲ – ۰</b><span class="frdate">۱۵ آبان (۵ نوامبر)</span></li><li><i class="fdot fd">م</i><span class="fropp">لیورپول</span><b class="frscore">۱ – ۱</b><span class="frdate">۸ آبان (۲۹ اکتبر)</span></li><li><i class="fdot fw">ب</i><span class="fropp">نیوکاسل</span><b class="frscore">۳ – ۱</b><span class="frdate">۱ آبان (۲۲ اکتبر)</span></li></ul><div class="formrow"><span class="formteam mcentre-form-participant">اورتون</span><span class="fseason"><b class="fspos">ردیف ۲</b><b class="fsw">۶</b>ب <b class="fsd">۲</b>م <b class="fsl">۲</b>ش<i class="fsplayed">از ۱۰ بازی لیگ برتر انگلیس</i></span></div></div>
```

### 4.2 The metrics — unequal samples + the material window note + the insufficient marker (the REAL matchMetricsHtml)

Arsenal: played 11, gf 28, ga 12, cs 4 in a 5-game window (|5 − 11| = 6 ≥ 2 → the
«در ۵ بازی» note); Man City: played 10 (the unequal-samples case — its own label),
gf 31, ga 15, csSample 2 < the min-3 gate → the muted «—»:

```html
<div class="card mcentre-metrics"><h2>مقایسه آمار فصل</h2><table class="mcmtable"><thead><tr><th class="mcmcorner" scope="col">آمار</th><th class="mcmteam" scope="col"><span class="formteam mcentre-form-participant">آرسنال</span><span class="mcmsample">در ۱۱ بازی لیگ برتر انگلیس</span></th><th class="mcmteam" scope="col"><span class="formteam mcentre-form-participant">منچستر سیتی</span><span class="mcmsample">در ۱۰ بازی لیگ برتر انگلیس</span></th></tr></thead><tbody><tr><th class="mcmlbl" scope="row">گل زده</th><td class="mcmnum">۲۸</td><td class="mcmnum">۳۱</td></tr><tr><th class="mcmlbl" scope="row">گل خورده</th><td class="mcmnum">۱۲</td><td class="mcmnum">۱۵</td></tr><tr><th class="mcmlbl" scope="row">کلین شیت</th><td class="mcmnum">۴ <span class="mcmnote">در ۵ بازی</span></td><td class="mcmnum mcmnd">—</td></tr></tbody></table></div>
```

### 4.3 The actual-zero clean sheet (the REAL matchMetricsHtml)

A team with 3+ samples and ZERO clean sheets (conceded in every game) — a REAL
zero renders «۰», never «—»:

```html
<tr><th class="mcmlbl" scope="row">کلین شیت</th><td class="mcmnum">۰</td><td class="mcmnum">۳</td></tr>
```

### 4.4 The one-sided omission (the REAL matchMetricsHtml)

The away side has no sufficient stats (missing table / team not in the table /
pre-season) → its column drops; the data side renders alone (1 team header + 3
number cells — no fabricated cells):

```html
<div class="card mcentre-metrics"><h2>مقایسه آمار فصل</h2><table class="mcmtable"><thead><tr><th class="mcmcorner" scope="col">آمار</th><th class="mcmteam" scope="col"><span class="formteam mcentre-form-participant">آرسنال</span><span class="mcmsample">در ۱۱ بازی لیگ برتر انگلیس</span></th></tr></thead><tbody><tr><th class="mcmlbl" scope="row">گل زده</th><td class="mcmnum">۲۸</td></tr><tr><th class="mcmlbl" scope="row">گل خورده</th><td class="mcmnum">۱۲</td></tr><tr><th class="mcmlbl" scope="row">کلین شیت</th><td class="mcmnum">۴</td></tr></tbody></table></div>
```

### 4.5 The fail-closed (both sides null)

`matchMetricsHtml({ home: null, away: null })` → `""` — the metrics block omits
entirely; the `#mcentre-form` section survives on the S12 dots/chip alone (the
فرم nav item logic unchanged).

### 4.6 The clean-sheet row omits (both sides below the gate)

Both sides' cs `""` → the کلین شیت row omits entirely (2 data rows remain — گل زده
+ گل خورده — never a row of «—» «—»).

---

## 5. The zero-runtime-cost law (the standing record)

`teamCompMetrics` is pure aggregation over the caller-passed ctx + archive rows;
`matchMetricsInput`/`matchMetricsSideInput` are pure string composition reading
the already-loaded data; `matchMetricsHtml` is a pure leaf renderer (zero imports/
KV/fetch/client-scripts). `buildMatchPage`'s await count stays exactly 3
(hydrateMatchVenue, loadArchive, fullByCodeFor). Zero new KV reads, zero new
fetches, zero new subrequests (ADR-006: no bundle rename, no sw.js bump, no new
assets). The scoped cost-law assertions in `scripts/check-match-centre.js` gate
all three layers.
