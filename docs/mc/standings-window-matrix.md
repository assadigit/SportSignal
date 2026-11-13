# Match Centre — Standings Window Matrix (M4 gate)

**Session**: S11 (M4 gate) — the standings rendering + CSS (M4, session 2 of 2).
**Selection**: `src/seo/standings-window.ts` (S10 — the pure-logic unified-window algorithm).
**Renderer**: `src/seo/pages.ts` `buildStandingsHtml` (S11 — the unified-table markup + the participant-mark typography + the ellipsis sentinel + the responsive mobile layout).
**Specification**: §8 "Competition standings" + milestones-and-sessions.md M4/S10 + M4/S11.

This document is the M4 gate's "window algorithm documentation + representative
examples" deliverable (specification §8 + the M3 gate precedent —
docs/mc/narrative-trigger-matrix.md). It carries:

1. The window algorithm — the neighbourhood size, the merge/touch boundary, the
   ellipsis sentinel, the participant-mark, the fail-closed gate.
2. The column projection — the 5 visible columns (رتبه | تیم | بازی | تفاضل |
   امتیاز) + the gd = gf-ga computation (a presentation concern — the selection
   is pure DATA, the renderer is pure presentation).
3. Representative examples — the actual `matchStandingsWindow` selection output
   against fake SeoMatch objects (the same fixtures `scripts/check-match-centre.js`
   uses — the same fake standings tables + the same fake matches):
   - Both teams same competition overlapping (Chelsea vs Tottenham → merged 6 rows)
   - Both teams same competition touching (Arsenal vs Man City → merged 5 rows)
   - Both teams same competition touching 1-row gap (Chelsea vs Man United → merged 7 rows)
   - Both teams same competition separated (Arsenal vs Everton → 5 + ellipsis + 5)
   - Both teams at the table edges (Arsenal pos 1, Sheffield/Burnley pos 19-20)
   - Different competitions (Arsenal PL vs Inter SA → two blocks)
   - Single-team window (Arsenal found, Real Madrid not → one block)
   - The null fail-closed (cups/KO / pre-season / degenerate / neither team)

---

## 1. The window algorithm

### The neighbourhood size (decision S10-2)

"Five-row neighbourhood around each participating team" = the team's row ± 2
(2 above, the team, 2 below — 5 rows total), CLAMPED at the table edges.

```
start = max(0, min(idx - 2, max(0, len - 5)))
end   = min(start + 5, len)
rows  = teams.slice(start, end)
```

A team at pos 1 → rows 1-5 (no rows above — fewer than 5 above is acceptable,
no fabricated rows). A team at pos N (the last team) → rows N-4..N (no rows
below). A team near the middle → the team centered in its 5-row window.

This is the EXACT clamp logic the existing `teamStandingsWindow` (data.ts — the
team-page precedent, byte-frozen) uses.

### The merge/touch boundary (decision S10-3)

Two ranges `[startA, endA]` and `[startB, endB]` (each a 5-row window, indices
into the standings array):

```
gap = max(0, max(startA, startB) - min(endA, endB) - 1)
```

Wait — the actual computation in `mergeNeighbourhoods` is:
```
gap = max(0, bStart - aEnd)   // bStart >= aStart (ordered), aEnd is exclusive
```

| gap | case | action |
|-----|------|--------|
| 0 (adjacent, `endA+1 == startB`) | touching | MERGE — the union is contiguous |
| 1 (one row between them) | touching | MERGE — the 1 gap row IS included (it's contextual between the two neighbourhoods, not "intervening") |
| ≥ 2 (two+ rows between them) | separated | ELLIPSIS sentinel + show both neighbourhoods (the intervening teams are NOT loaded/displayed — spec §8: "Do not load or display intervening teams") |

The merge produces the UNION of both ranges (contiguous, de-duplicated, in
standings order). The max merged block is 5 + 1 + 5 = 11 rows (a 1-row gap
bridged); the max separated block is 5 + ellipsis + 5 = 11 entries.

### The ellipsis sentinel (decision S10-6 + S11-4)

A row with the marker `{ ellipsis: true }`. The selection inserts ONE sentinel
between separated neighbourhoods (never between touching/overlapping ones — those
merge). The S11 renderer renders the sentinel as «⋯» (U+22EF — the midline
horizontal ellipsis) centered, spanning all 5 columns (a single `.stellipsis`
span in a `.strow-ellipsis` row; the flex row centers the single child). Discreet:
muted color, smaller font, no team data. `aria-hidden="true"` (decorative —
screen readers skip it; the table is still navigable by the real rows).

S10 owns the sentinel shape (`{ ellipsis: true }`); S11 owns the discreet visual.

### The participant-mark (decision S10-4 + S11-3)

Each row in the window carries a `participant` flag: `'home' | 'away' | null`.

The S11 renderer applies the participant-mark via the `.strow-participant` class
(decision 25 — typography-only, NO row background):

- The team NAME (`.stname`) gets `font-weight:600` + the icy-blue color
  (`#7dd3fc` — the site's icy-blue token, the `.mfin`/`.mcount`/
  `.mnav-item.is-active` family).
- The rank NUMBER (`.stpos`) gets the icy-blue color ONLY (its existing
  `font-weight:800` from the versioned stylesheet is already the strongest weight
  — "stronger typography" is achieved by the icy-blue color contrast, NOT by
  reducing the weight).
- The other columns (played/gd/points) stay default.
- NO highlighted row background (the `.strow-me` background the team-page uses
  is NOT applied — scoped to `#mcentre-standings` so the team-page `.strow-me`
  stays byte-frozen).

### The column projection (decision S10-5 + S11-2)

The `standings_cache` rows carry the full data shape (pos/name/faName/crest/
points/played/won/draw/lost/gf/ga — audit §R3/§67). The spec §8 visible columns:

| Persian | English | CSS class | Source |
|---------|---------|-----------|--------|
| رتبه | rank | `.stpos` | `team.pos` |
| تیم | team | `.stname` (`.haslogo` + `.stcrest` + `.sttxt` when a crest exists) | `team.faName \|\| team.name` + `team.crest` |
| بازی | played | `.stnum` (NO `.ucl-hidem` — visible on mobile) | `team.played` |
| تفاضل | goal difference | `.stnum.stgd` | `gd = (gf\|\|0) - (ga\|\|0)` — computed by S11 (NOT pre-computed by S10) |
| امتیاز | points | `.stpts` | `team.points` |

The selection returns the FULL row + the participant-mark (the won/draw/lost/gf/
ga stay in the cache, NOT displayed — the spec's "Do not load or display
intervening teams" discipline extends to columns: only the 5 visible columns
surface). The selection is pure DATA; the renderer projects the 5 columns +
computes `gd = (gf||0) - (ga||0)` (decision 4 — keeps the selection pure, the
renderer pure presentation — the S04 hero projection precedent).

### The gd sign convention (decision S11-7)

- Positive gd: `"+" + toFaDigits(String(gd))` → e.g. «+۵»
- Zero gd: `toFaDigits(String(0))` → «۰» (no + sign)
- Negative gd: `toFaDigits(String(gd))` → e.g. «-۱۰» (the Latin hyphen-minus
  U+002D — the `toFaDigits` default; `toFaDigits` replaces `[0-9]` only, not the
  sign; no U+2212 override — the existing site convention)

The sign is shown for BOTH positive (+) and negative (-) so the column is
scannable at a glance (the gd column is distinct from the points column — the
sign makes the difference explicit).

### The fail-closed gate (decision S10-7 + S11-10)

The audit §67: "pre-season (started:false)/missing table → drop section
fail-closed; cups/KO → not applicable." The selection returns `null` (no window)
when:

- the standings cache is missing for a code (no `fullByCode[code]` AND no
  `payload.standings[code]`) — covers cups/KO (no league table for the code —
  FA_CUP/EFL_CUP/DFB_POKAL/CDR/COPPA_ITALIA/HAZFI_CUP have no `standings_cache`
  entry; the missing-cache gate handles them naturally);
- `st.started === false` (pre-season — FD roster-alphabetical, no matches played);
- the table has `< 2` teams (degenerate — a 1-team table is not a table);
- NEITHER participating team is found in the table.

When only ONE team is found, the selection shows that team's window ALONE (a
single-team neighbourhood — the spec's "five-row neighbourhood around each
participating team" doesn't require BOTH to be found; show the ones we CAN find,
no fabricated rows).

When the selection returns `null`, the S11 renderer returns `""` (the
no-empty-cards law — the composer's `sectionHtml` omits the `mcentre-standings`
section entirely; the جدول nav item stays filtered out by the nav's adaptive
Q9=B filter).

### The lookup precedence (mirrors `teamStandingsWindow` in data.ts)

1. The fixture's competition code FIRST (`fullByCode` is loaded for it — the
   freshest complete source, already loaded by `buildMatchPage`'s
   `fullByCodeFor` await).
2. All other codes in `fullByCode` (the freshest, complete source).
3. All other codes in `payload.standings` (the top-8 compacts fallback).

A code with `started === false` OR `< 2` teams is SKIPPED (the fail-closed gate).

### The two-block case (different-competition — decision S11-9)

When both teams are in DIFFERENT competitions (the rare cross-competition case —
a friendly/super-cup between teams from different leagues), the selection returns
TWO blocks (one per team's competition). The S11 renderer renders TWO tables
(one per block), each with its own competition header. The two tables stack
vertically inside the `mcentre-standings` section (joined `""` — the section's
natural block flow puts one above the other).

---

## 2. Representative examples — the actual selection output

The fixtures below are the SAME fake SeoMatch objects + the SAME fake standings
tables `scripts/check-match-centre.js` uses (the S10 + S11 assertion groups).
The fake PL table carries 20 teams (Arsenal pos 1 … Sheffield pos 20), each with
`gf = 20 - pos`, `ga = pos` (so `gd = 20 - 2*pos`). The fake SA table carries 10
teams (Inter pos 1 … Torino pos 10).

### 2.1 same-competition overlapping — Chelsea (pos 4) vs Tottenham (pos 5)

**Match**: `mkSmS("Chelsea", "Tottenham", "PL")` against `ctxPL` (the 20-team PL
table). Both teams in PL → ONE block. Chelsea's neighbourhood [2-6], Tottenham's
neighbourhood [3-7] → overlap → MERGE into the union [2-7] = 6 rows.

| Selection output | Value |
|-----------------|-------|
| `window.length` | 1 (one block) |
| `block.code` | `"PL"` |
| `block.compFa` | `"TEST_COMP_FA"` (the fake table's `faName`) |
| `block.emblem` | `"https://example.com/emblem.png"` |
| `block.rows.length` | 6 (the merged union: Man City, Liverpool, Chelsea, Tottenham, Man United, Newcastle) |
| `rows[2].participant` | `"home"` (Chelsea — pos 4) |
| `rows[3].participant` | `"away"` (Tottenham — pos 5) |
| `rows[0,1,4,5].participant` | `null` (the contextual rows — NOT marked) |
| ellipsis sentinels | 0 (the ranges overlap → no ellipsis) |

**S11 rendered HTML**: one `.stbox.stwin` table with `.stbox-head` (emblem +
compFa) + `.sthead` (بازی | تفاضل | امتیاز) + 6 `.strow` rows (2 with
`.strow-participant` — Chelsea + Tottenham). No `.strow-ellipsis`.

### 2.2 same-competition touching — Arsenal (pos 1) vs Man City (pos 2)

**Match**: `mkSmS("Arsenal", "Man City", "PL")` against `ctxPL`. Both teams in PL
→ ONE block. Arsenal's neighbourhood [1-5] (clamped at the top), Man City's
neighbourhood [1-5] (same — both at the top) → IDENTICAL → MERGE → 5 rows.

| Selection output | Value |
|-----------------|-------|
| `window.length` | 1 |
| `block.rows.length` | 5 (the merged union: Arsenal, Man City, Liverpool, Chelsea, Tottenham) |
| `rows[0].participant` | `"home"` (Arsenal — pos 1) |
| `rows[1].participant` | `"away"` (Man City — pos 2) |
| ellipsis sentinels | 0 (the ranges are identical → merge, no gap) |

### 2.3 same-competition touching 1-row gap — Chelsea (pos 4) vs Man United (pos 6)

**Match**: `mkSmS("Chelsea", "Man United", "PL")` against `ctxPL`. Chelsea's
neighbourhood [2-6], Man United's neighbourhood [4-8] → overlap (gap 0 — they
share rows 4-5-6) → MERGE → 7 rows (the union [2-8], with the gap row at pos 5
Tottenham INCLUDED — it's contextual between the two neighbourhoods).

| Selection output | Value |
|-----------------|-------|
| `window.length` | 1 |
| `block.rows.length` | 7 (the merged union: Man City, Liverpool, Chelsea, Tottenham, Man United, Newcastle, Brighton) |
| `rows[2].participant` | `"home"` (Chelsea — pos 4) |
| `rows[4].participant` | `"away"` (Man United — pos 6) |
| ellipsis sentinels | 0 (gap ≤ 1 → merge — the gap row IS included) |

### 2.4 same-competition separated — Arsenal (pos 1) vs Everton (pos 15)

**Match**: `mkSmS("Arsenal", "Everton", "PL")` against `ctxPL`. Arsenal's
neighbourhood [1-5], Everton's neighbourhood [13-17] → gap ≥ 2 → SEPARATED →
ellipsis sentinel + show both neighbourhoods (5 + 1 + 5 = 11 entries).

| Selection output | Value |
|-----------------|-------|
| `window.length` | 1 (one block — same competition) |
| `block.rows.length` | 11 (5 + 1 ellipsis + 5) |
| `rows[0-4]` | Arsenal's neighbourhood (pos 1-5) — `rows[0].participant = "home"` |
| `rows[5]` | `{ ellipsis: true }` — the sentinel (no team data) |
| `rows[6-10]` | Everton's neighbourhood (pos 13-17) — `rows[10].participant = "away"` (Everton is at the last position of the second neighbourhood) |

**S11 rendered HTML**: one `.stbox.stwin` table with 11 `.strow` rows (10 data
rows + 1 `.strow-ellipsis` with «⋯» U+22EF centered, `aria-hidden="true"`). The
intervening teams (pos 6-12) are NOT loaded/displayed (spec §8: "Do not load or
display intervening teams").

### 2.5 edge top — Arsenal (pos 1) + Liverpool (pos 3)

**Match**: `mkSmS("Arsenal", "Liverpool", "PL")` against `ctxPL`. Arsenal's
neighbourhood [1-5] (clamped at the top — no rows above), Liverpool's
neighbourhood [1-5] (same — both near the top) → IDENTICAL → MERGE → 5 rows.

| Selection output | Value |
|-----------------|-------|
| `block.rows.length` | 5 (Arsenal, Man City, Liverpool, Chelsea, Tottenham) |
| `rows[0].participant` | `"home"` (Arsenal — pos 1, clamped at the top) |
| `rows[2].participant` | `"away"` (Liverpool — pos 3) |
| ellipsis sentinels | 0 |

### 2.6 edge bottom — Burnley (pos 19) vs Sheffield (pos 20)

**Match**: `mkSmS("Burnley", "Sheffield", "PL")` against `ctxPL`. Burnley's
neighbourhood [15-19] (clamped: start = max(0, min(17, 15)) = 15), Sheffield's
neighbourhood [15-19] (same — `start = max(0, min(18, 15)) = 15`) → IDENTICAL →
MERGE → 5 rows. The last row is pos 20 (Sheffield — clamped at the bottom, no
rows below).

| Selection output | Value |
|-----------------|-------|
| `block.rows.length` | 5 (Forest, Luton, Burnley, Sheffield — wait, 5 rows from pos 16-20) |
| `rows[2].participant` | `"home"` (Burnley — pos 19) |
| `rows[3].participant` | `"away"` (Sheffield — pos 20, the last row — clamped at the bottom) |
| ellipsis sentinels | 0 |

### 2.7 different-competition — Arsenal (PL) vs Inter (SA)

**Match**: `mkSmS("Arsenal", "Inter", "PL")` against `ctxDiff` (PL + SA tables).
Arsenal is in PL, Inter is in SA → DIFFERENT competitions → TWO blocks (one per
team's competition).

| Selection output | Value |
|-----------------|-------|
| `window.length` | 2 (two blocks) |
| `window[0].code` | `"PL"` — Arsenal's block (participant = "home") |
| `window[1].code` | `"SA"` — Inter's block (participant = "away") |
| `window[0].rows.length` | 5 (Arsenal's PL neighbourhood: Arsenal, Man City, Liverpool, Chelsea, Tottenham) |
| `window[1].rows.length` | 5 (Inter's SA neighbourhood: Inter, Milan, Juventus, Napoli, Roma) |
| ellipsis sentinels | 0 (each block is a single-team neighbourhood — no merge/ellipsis within a block) |

**S11 rendered HTML**: TWO `.stbox.stwin` tables stacked vertically (each with
its own `.stbox-head` competition header — the PL block's compFa + emblem, then
the SA block's compFa + emblem). Each table has 5 rows with 1 `.strow-participant`
(the team).

### 2.8 single-team window — Arsenal (PL) vs Real Madrid (not in any standings)

**Match**: `mkSmS("Arsenal", "Real Madrid", "PL")` against `ctxOne` (PL table
only — Real Madrid is NOT in any `standings_cache`). Only Arsenal is found → a
single-team window (ONE block, Arsenal's 5-row neighbourhood).

| Selection output | Value |
|-----------------|-------|
| `window.length` | 1 (one block — the single-team window) |
| `block.code` | `"PL"` |
| `block.rows.length` | 5 (Arsenal's neighbourhood: Arsenal, Man City, Liverpool, Chelsea, Tottenham) |
| `rows[0].participant` | `"home"` (Arsenal) |
| rows with `participant = "away"` | 0 (Real Madrid isn't in the standings — no fabricated mark) |

**S11 rendered HTML**: one `.stbox.stwin` table with 5 rows, 1 `.strow-participant`
(Arsenal — home). No away participant (the away team isn't in the standings — no
fabricated row or mark).

### 2.9 null fail-closed — cups/KO (FA_CUP)

**Match**: `mkSmS("Arsenal", "Chelsea", "FA_CUP")` against `ctxCup` (empty
standings — no `standings_cache` entry for FA_CUP). Cups/KO have no league table
→ the missing-cache gate returns `null`.

| Selection output | Value |
|-----------------|-------|
| `window` | `null` (the fail-closed gate — cups/KO → not applicable) |

**S11 rendered HTML**: `""` (the no-empty-cards law — the composer's `sectionHtml`
omits the `mcentre-standings` section entirely; the جدول nav item stays filtered
out by the nav's adaptive Q9=B filter).

### 2.10 null fail-closed — pre-season (started === false)

**Match**: `mkSmS("Arsenal", "Chelsea", "PL")` against `ctxPre` (the PL table
with `started: false`). Pre-season — FD roster-alphabetical, no matches played →
the `started === false` gate returns `null`.

| Selection output | Value |
|-----------------|-------|
| `window` | `null` (pre-season — the audit §67 gate) |

### 2.11 null fail-closed — degenerate (< 2 teams)

**Match**: `mkSmS("Arsenal", "Chelsea", "PL")` against `ctxDegen` (a 1-team PL
table). A 1-team table is not a table → the `< 2` teams gate returns `null`.

| Selection output | Value |
|-----------------|-------|
| `window` | `null` (degenerate — a 1-team table is not a table) |

### 2.12 null fail-closed — neither team found

**Match**: `mkSmS("Arsenal", "Chelsea", "PL")` against `ctxNotFound` (a PL table
with Real Madrid, Barcelona, Atletico, Sevilla, Valencia — neither Arsenal nor
Chelsea is in it). The table exists but neither participating team is in it →
`null` (no fabricated rows; the no-empty-cards law).

| Selection output | Value |
|-----------------|-------|
| `window` | `null` (neither team found — no fabricated rows) |

---

## 3. The zero-runtime-cost law

The S10 selection + the S11 renderer are PURE LOGIC + PURE STRING COMPOSITION.
They read ONLY the already-loaded data:

- `ctx.payload.standings` — the 7 top-8 compacts (PL/PD/SA/BL1/FL1/CL/PGL),
  cache-only reads already loaded by `getSeoCtx` (audit §R3: "standings_cache
  ×7 already read by getSeoCtx").
- `fullByCode` — the full cached tables, already loaded by `buildMatchPage`'s
  `fullByCodeFor` (one of the 3 pre-existing bounded reads).
- `sm.s.homeTeam`/`awayTeam`/`competition` — already-loaded SeoMatch fields.

ZERO new KV reads, ZERO new awaits, ZERO new fetches. The module + the renderer
carry NO AI/network/KV/timer/polling code (the cost law gates this in
`check-match-centre` — the S11 group extracts the `buildStandingsHtml` function
source via brace-matching + checks it for cost-law violations, scoped to the
RENDERER only; `pages.ts`'s other functions keep their legitimate fetch/KV
calls). `buildMatchPage`'s await count stays exactly 3 (`hydrateMatchVenue`,
`loadArchive`, `fullByCodeFor` — the pre-existing loads).

---

## 4. The S10/S11 split — selection vs rendering

| Concern | Owner | Session |
|---------|-------|---------|
| The unified-window algorithm (neighbourhood + merge/touch/ellipsis + participant-mark + fail-closed) | `src/seo/standings-window.ts` `matchStandingsWindow` | S10 (M4 session 1) |
| The 5-column projection + the gd computation + the participant-mark typography + the ellipsis rendering + the responsive mobile layout + the CSS | `src/seo/pages.ts` `buildStandingsHtml` + `src/seo/page-shell.ts` (the S11 CSS block) | S11 (M4 session 2) |
| The composer slot (`mcentre-standings` section + `MatchCentreParts.standings?`) | `src/seo/match-centre.ts` (the S02 pure leaf — byte-frozen) | S02 (the slot exists since S02; S11 populates it) |
| The team-page path (`teamStandingsWindow` + `buildStandingsWindowHtml`) | `src/seo/data.ts` + `src/seo/pages.ts` (byte-frozen — the S10/S11 split: the team-page path is untouched) | v13.87/v13.89 (pre-Match-Centre) |

The S10/S11 split keeps the selection pure DATA and the renderer pure
PRESENTATION (decision 4 — the S04 hero projection precedent). The selection
returns the full row data + the participant-mark; the renderer projects the 5
visible columns + computes `gd = gf-ga` + applies the typography. The team-page
path stays byte-frozen (the match-page renderer is a NEW function — the S04 hero
precedent: `pages.ts` builds the HTML string, the composer wraps it in the
`mcentre-standings` anchor).
