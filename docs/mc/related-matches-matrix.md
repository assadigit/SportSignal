# Match Centre — Related-Matches Matrix (M7 gate)

**Milestone:** M7 — FAQ & related matches (S16 + S17)
**Specification:** §13 "Related matches"
**Decisions:** 59 (relevant cached fixtures only), 60 (upcoming involving either team first, then previous H2H meetings), 61 (maximum four; fewer when fewer qualify), 62 (compact broadcast-style related rows), 63 (one unified list: upcoming first, then previous meetings), 64 (related matches after FAQ), 13 (related matches OUTSIDE the 5-item nav), 41 (broadcast-style rows)
**Audit:** §4 row 76 (Related — upcoming either team, grade A — `ctx.pool` 92-day horizon, 0/0 new fetch/KV) + §4 row 77 (Related — previous head-to-head, grade D — pool finished 7-day + archive 365-day pair filter) + §12 row S17 (`src/seo/data.ts` (H2H pair filter), `src/seo/match-centre.ts` | upcoming-first unified list, max 4)
**Preview:** `13.256-mcM7x` — Worker Version `8b76d834-2ef5-4c6e-8708-70a3f53e780a` (https://8b76d834-ucl-notifier.sportsignal.workers.dev) — uploaded NEVER activated (`wrangler versions deploy` / `wrangler deploy` NEVER run); the repo version stays `13.256-mcfound`; the mcM7x bump lives only in the uploaded bundle. (A first upload `b49e17a0-462c-444c-816b-037e2a32460d` carried a TIMED-status filter bug — discovered + fixed during the agent-browser smoke + superseded by the re-upload `8b76d834`.)
**Gate result:** **PASSED** — the production-KV agent-browser read-only smoke verified the related-matches section on 6 real match pages + the FAQ accordion interaction (the S16 delayed-collapse) + the mobile 390 no-horizontal-scroll + zero console errors + the GSC surfaces byte-frozen vs production + production re-verified `ok:true / 13.255-seospell` after the upload.

---

## 1. The data layer — the `h2hMatches` pair filter + the `relatedMatches` unified selection

The related list reads the ALREADY-LOADED `ctx.pool` (the `matches_v13_tracked` 92-day horizon, hidden leagues filtered — the SAME pool the S12 form + the S13 metrics + the S14 schedule read) + the ALREADY-LOADED `loadArchive` read (one of the 3 pre-existing awaits — the 365-day FINISHED superset). The fixture ITSELF is excluded by path (the S14 precedent). ZERO new awaits, ZERO new KV reads, ZERO new fetches (ADR-006).

### The H2H pair filter — `h2hMatches(archive, homeName, awayName, max=4): RelatedRow[]` (audit §12 row S17)

Pure aggregation over the caller-passed archive (the `teamForm`/`windowSchedule` precedent — `data.ts` cannot import `files.ts`; the caller passes the already-loaded archive in). Returns the FINISHED matches where both participating teams appear in either home/away order — matched via `normalizeTeamName` (the S10/S13 precedent — handles name variants: transliteration, accents, club-prefix tokens, founding-year digits). So `(norm(home)===norm(selfHome) && norm(away)===norm(selfAway))` OR the swapped. NOT a strict string match (the provider variant forms "FC Internazionale Milano" / "Inter" must collide).

- **FINISHED only** — a SCHEDULED H2H (the two teams meet in the future) is NOT a "previous meeting" (it's an upcoming fixture — it appears in the upcoming section, NOT the H2H section).
- **Sorted DESC** (most recent first — the most recent meeting is the most relevant).
- **Capped at `max`** (default 4 — the S15 `similarMatches` cap precedent).
- **Deduped** on the `home|away|utcDate-day` key (the `teamForm` precedent — the same meeting appearing twice in the archive collapses).
- Does NOT exclude the fixture itself (the caller's `relatedMatches` helper excludes it by path — `h2hMatches` is the PURE pair filter, independently testable).

### The unified spec §13 selection — `relatedMatches(ctx, sm, archive, max=4): RelatedRow[]`

The unified list, upcoming FIRST then H2H, deduped, capped at `max`. The selection priority (spec §13 — MANDATORY):

1. **Upcoming fixtures involving EITHER participating team** — the upcoming-involving-either-team filter. Scans `ctx.pool` (via `ctx.shaped` + `ctx.pool`) for future + not-live matches (SCHEDULED/TIMED/POSTPONED — the `similarMatches` precedent: `t > now && !isLiveSt`; NOT `status === "SCHEDULED"` — the football-data.org v4 provider uses TIMED for timed-upcoming matches). The fixture ITSELF is excluded by path. Sorted ASC (soonest first — the next fixture is first).
2. **Previous meetings between the TWO participating teams** (the H2H pair) — the pool's 7-day finished rows (audit §4 row 77 "pool finished (7d)") + the archive's 365-day finished rows (via `h2hMatches`). Merged + deduped on the path-based key (uniform across pool + archive — both pubMatch-shaped rows carry `s.path = matchPath(home,away,date)`; the same match has the same path in both sources). Sorted DESC (most recent first).

### S17 decision points (resolved + recorded)

- **S17-H2H (the pair definition):** `normalizeTeamName` (the S10/S13 precedent — handles name variants). Both teams present in either home/away order.
- **S17-Upcoming (the upcoming selection):** the existing `similarMatches` does comp+stage priority (stage 0 = same comp+matchday, stage 1 = same comp, stage 2 = same day) — it does NOT do team-involving-either-team. S17's `relatedMatches` does the NEW team-involving-either-team filter inline. The filter accepts future + not-live (SCHEDULED/TIMED/POSTPONED — the `similarMatches` precedent), NOT `status === "SCHEDULED"` (the football-data.org v4 provider uses TIMED for timed-upcoming matches — discovered during the agent-browser smoke: the Newcastle vs Arsenal page rendered 0 rows before the TIMED fix; the fresh Manchester City vs Fulham page rendered 4 rows after the fix).
- **S17-Dedup:** the fixture ITSELF excluded by path (the S14 precedent). The cross-section dedup (upcoming + H2H overlap) is by path — defensive (upcoming=SCHEDULED/TIMED, H2H=FINISHED — no status overlap by definition; but the path-dedup is belt-and-braces). A match that is BOTH upcoming AND a H2H meeting (the two teams meet again in the future) appears in the upcoming section ONLY (spec §13 "One unified list, upcoming first" — upcoming takes priority; NO duplication). The H2H pair-dedup (the same meeting in both the pool's finished + the archive) is on the path-based key (uniform across sources).
- **S17-Max4 (the cap + the priority order):** the cap applies to the UNIFIED list (NOT per-section). Upcoming first (up to `max=4`), then H2H fills the rest (up to `max` total). If upcoming has 4, H2H omits. If upcoming has 2 + H2H has 3, the list = 2 upcoming + 2 H2H = 4.
- **S17-H2H-source:** `h2hMatches` reads the ARCHIVE only (the 365-day FINISHED superset — the brief's `h2hMatches(archive, ...)` signature). The `relatedMatches` helper ALSO scans the pool's FINISHED rows for H2H (covering the 7-day gap — audit §4 row 77 "pool finished (7d) + archive (365d)" + the `teamForm` precedent). Merge + dedupe on the path-based key.

### The `RelatedRow` atom (the `ScheduleRow` precedent, the S14 atom shape)

`buildRelatedRow(raw, s)` builds a `RelatedRow` from a raw+shaped twin (the pool) OR a shaped-only row (the archive's pubMatch `m`). Mirrors `windowSchedule`'s `build` helper (the S14 precedent): the raw twin carries the status + `score.fullTime` (pool); the shaped row carries the path + faNames + competition + flat score (pubMatch).

| Field | Source | Notes |
|---|---|---|
| `path` | `s.path` (pubMatch) | the matchPath URL — for the `<a>` link + the dedup. `""` when the row carries none. |
| `utcDate` | `s.utcDate` | the ISO kickoff (the `<time>` datetime + the sort) |
| `compFa` | `s.competition.faName \|\| translateCompetition \|\| COMP_EN \|\| code` | the competition faName (the `compNameFa` precedent) |
| `homeFa` / `awayFa` | `s.homeTeam.faName \|\| name` | the team faNames (the fallback to the name) |
| `gh` / `ga` | `raw.score.fullTime` (pool) or `s.score` (archive) | null when not scored (the upcoming marker) |
| `live` / `finished` | the status (IN_PLAY/LIVE/PAUSED / FINISHED) | the status booleans |

---

## 2. The renderer — the `matchRelatedHtml` broadcast rows (spec §13, decision 62)

The composer (`src/seo/match-centre.ts`) owns the `.mcentre-related` MARKUP (the S12/S14/S15/S16 precedent). The renderer receives PRE-BUILT row atoms (every row arrives pre-escaped from `pages.ts`'s `matchRelatedInput` projection — the S04 hero precedent), so the composer stays the S02 pure leaf for the MARKUP (zero imports, zero KV, zero fetch, zero client scripts — the related list is a STATIC list, NON-interactive: NO expand control, NO accordion, NO script; the S07 summary precedent).

### The broadcast row (spec §13, decision 62)

One `<div class="mcentre-related-row">` per match — compact, one line, RTL flex layout:
- `.mcentre-related-when` — the date `<time datetime=...>` atom (faDateD2 — the S11/S12 compact-date precedent, Persian digits). The time is in the `datetime` attribute (machine-readable) but NOT in the visible text (the row stays compact — spec §13 "date/competition"; the S15 row shows the time because the date is a day-heading — the related list is FLAT, the date is in each row, the exact kickoff time is on the match page). The cell truncates via `text-overflow:ellipsis` if the date is too long on mobile.
- `.mcentre-related-comp` — the competition faName (muted, truncates via `text-overflow:ellipsis`).
- `.mcentre-related-teams` — the teams (the `pathHtml` — home – away, with the `<a>` link when the row carries a path; name-only, decision S15-Crest precedent — NO crestHtml atom; takes the remaining space, truncates).
- `.mcentre-related-result` — the score + status OR the upcoming marker:
  - A scored row (finished — the H2H rows are FINISHED): `.mcentre-related-score` (the Persian-digit "H – A", weight 800, prominent) + the status indicator.
  - A SCHEDULED row (`scoreHtml ""`): `.mcentre-related-upcoming` «در انتظار» (the upcoming marker — NOT a fake 0-0; the S15 MISSING-IS-NOT-ZERO law).

### The status vocabulary (the S04/S15 hero vocabulary, compacted)

- **finished** (`finished:true`, scoreHtml populated): `<span class="mcentre-related-fin">پایان</span>` (the S04 hero «پایان بازی» compacted — the broadcast row's compact status) + the score. The `.mcentre-related-row.is-fin` class.
- **scheduled** (`!live && !finished`, scoreHtml `""`): «در انتظار» (the upcoming marker — no score). The `.mcentre-related-row.is-sched` class.
- **live** (`live:true`, scoreHtml populated): the live dot `<i class="mcentre-related-live" aria-label="در جریان">` (a small pulsing icy-blue dot) + the score. The `.mcentre-related-row.is-live` class. **NOTE:** live rows are NOT expected in the related list (spec §13 = upcoming + previous H2H only; LIVE is neither — `isUpcoming = t > now && !isLiveSt` is false for LIVE + `isFinished` is false), but the vocabulary is retained for completeness (a future LIVE-involving-either-team extension would reuse it).

### Decision S17-Row: a NEW `.mcentre-related-row` variant

A NEW `.mcentre-related-row` variant with NEW `.mcentre-related-*` classes (a self-contained S17 CSS block scoped to `#mcentre-related`). The visual style MIRRORS the S15 broadcast row (flex layout, ellipsis truncation, prominent score, status indicator) — the S15 design vocabulary reused at the DESIGN level, NOT the CSS-class level. Rationale: the S15 CSS is scoped to `#mcentre-schedule .mcentre-sched-*` — reusing the classes under `#mcentre-related` would require duplicating the S15 rules under the new scope (verbose) OR modifying the S15 scoping (breaks the S15 byte-freeze, which the S17 contract MANDATES: the S15 schedule presentation stays untouched). A self-contained S17 block with `.mcentre-related-*` classes is cleaner + lower-risk + the S15 block stays byte-frozen.

### The composer stays the S02 pure leaf

The `matchRelatedHtml` renderer + the `relatedRowHtml` helper are pure string composition — ZERO client-script (no `<script>`, no `addEventListener`, no fetch/timer). The related list is a STATIC list, NON-interactive (NO expand control, NO accordion, NO script — the S07 summary precedent; the S15 schedule-expand-control + the S16 FAQ-accordion are the interactive parts, the related list is NOT). The S02 composer-purity cost-law assertion holds.

---

## 3. The projection — the `matchRelatedInput` pre-escaped atoms

The `matchRelatedInput(sm, ctx, archive): MatchRelatedInput` projection in `src/seo/pages.ts` builds the `MatchRelatedRowInput` atoms from the data layer's `relatedMatches` helper (the S04 hero precedent — the composer is a pure leaf; the atoms arrive pre-escaped). ZERO new awaits, ZERO new KV reads, ZERO new fetches (the zero-runtime-cost law — the `relatedMatches` helper reads the already-loaded `ctx.pool` + the `loadArchive` archive).

### The "only valid internal links" law (milestones S17 test list)

Every row's `<a>` link points to an existing match page (the `matchPath` helper — the same slug format the S15 schedule rows use; the path comes from the pubMatch `s.path` field, which is always `matchPath(home,away,date)`). A row with no path → the teams render as plain text (NO `<a>` — the S15 schedule precedent: `r.path ? '<a href="...">' + teams + '</a>' : teams`). NO external links, NO broken anchors.

### The numerals + dates (the S11/S12/S13/S14/S15/S16 precedent)

- `pathHtml` — the `<a>` link (prebuilt) — `""` carries no path → plain text.
- `whenHtml` — the `<time datetime="...">` date atom (faDateD2 — the compact date, Persian digits; decision S17-When: date-only, the time is in the `datetime` attribute).
- `compHtml` / `homeHtml` / `awayHtml` — pre-escaped (the `esc()` discipline).
- `scoreHtml` — the Persian-digit "H – A" when scored (the H2H finished rows); `""` when not scored (the upcoming SCHEDULED rows — the S15 MISSING-IS-NOT-ZERO law, NOT a fake 0-0).
- `live` / `finished` — the status booleans.

---

## 4. The fail-closed gates

| Case | Behavior |
|---|---|
| **Full list** (upcoming + H2H) | The rows in spec §13 priority order (upcoming FIRST then H2H), max 4. |
| **Upcoming-only** (no H2H) | The upcoming rows render (e.g. a big-club match where both teams have 4+ upcoming in the 92-day pool — the upcoming section fills all 4 slots, H2H omits). |
| **H2H-only** (no upcoming) | The H2H rows render (e.g. a match between two teams with no upcoming in the pool but with H2H history in the archive). |
| **Partial** (upcoming < max + H2H) | Upcoming first (up to max), then H2H fills the rest (up to max total). |
| **Empty** (no upcoming + no H2H) | `""` — the section omits entirely (the no-empty-cards law; a pre-season friendly between two teams with no history). |
| **The fixture itself** | Excluded by path from BOTH sections (the S14 precedent — no self-reference). |
| **Unrelated filler** | Excluded (spec §13 "No unrelated competition matches as filler" — every row involves at least one participating team OR is a H2H meeting). |
| **LIVE matches** | Excluded (spec §13 = upcoming + previous H2H only; LIVE is neither — `isUpcoming = t > now && !isLiveSt` is false for LIVE). |
| **Missing path** | The teams render as plain text (NO `<a>` — the S15 schedule precedent). |
| **Missing score** (a SCHEDULED row) | The upcoming marker «در انتظار» — NOT a fake 0-0 (the S15 MISSING-IS-NOT-ZERO law). |
| **TIMED status** (the football-data.org v4 upcoming status) | Included in the upcoming section (the filter is future + not-live, NOT `status === "SCHEDULED"` — the `similarMatches` precedent). |

---

## 5. Representative examples (the REAL renderer output)

The REAL `matchRelatedHtml` (transpiled from `src/seo/match-centre.ts` via `ts.transpileModule`, the same extraction the check-script uses) fed controlled `MatchRelatedInput` atoms.

### 5.1 The full list — 2 upcoming (SCHEDULED) + 2 H2H (FINISHED)

```
<div class="mcentre-related"><h2>بازی‌های مرتبط</h2><div class="mcentre-related-list">
  <div class="mcentre-related-row is-sched">
    <span class="mcentre-related-when"><time datetime="2027-01-20T17:00:00Z">، ۲۰ دی ۱۳۹۶ (۱۰ ژانویه)</time></span>
    <span class="mcentre-related-comp">لیگ برتر انگلیس</span>
    <span class="mcentre-related-teams"><a href="/arsenal-vs-chelsea-2027-01-20">Arsenal – Chelsea</a></span>
    <span class="mcentre-related-result"><span class="mcentre-related-upcoming">در انتظار</span></span>
  </div>
  <div class="mcentre-related-row is-sched">
    <span class="mcentre-related-when"><time datetime="2027-01-22T17:00:00Z">، ۲۲ دی ۱۳۹۶ (۱۲ ژانویه)</time></span>
    <span class="mcentre-related-comp">بوندسلیگا</span>
    <span class="mcentre-related-teams"><a href="/dortmund-vs-brighton-2027-01-22">Dortmund – Brighton</a></span>
    <span class="mcentre-related-result"><span class="mcentre-related-upcoming">در انتظار</span></span>
  </div>
  <div class="mcentre-related-row is-fin">
    <span class="mcentre-related-when"><time datetime="2026-09-15T17:00:00Z">، ۱۵ شهریور ۱۳۹۶ (۱۵ سپتامبر)</time></span>
    <span class="mcentre-related-comp">لیگ برتر انگلیس</span>
    <span class="mcentre-related-teams"><a href="/arsenal-vs-brighton-2026-09-15">Arsenal – Brighton</a></span>
    <span class="mcentre-related-result"><span class="mcentre-related-score">۲ – ۱</span><span class="mcentre-related-fin">پایان</span></span>
  </div>
  <div class="mcentre-related-row is-fin">
    <span class="mcentre-related-when"><time datetime="2026-03-10T17:00:00Z">، ۱۰ اسفند ۱۳۹۵ (۱۰ مارس)</time></span>
    <span class="mcentre-related-comp">لیگ برتر انگلیس</span>
    <span class="mcentre-related-teams"><a href="/brighton-vs-arsenal-2026-03-10">Brighton – Arsenal</a></span>
    <span class="mcentre-related-result"><span class="mcentre-related-score">۰ – ۰</span><span class="mcentre-related-fin">پایان</span></span>
  </div>
</div></div>
```

The spec §13 priority order (upcoming FIRST then H2H), the max-4 cap (2 upcoming + 2 H2H = 4). The upcoming rows carry «در انتظار» (NOT a fake 0-0 — MISSING IS NOT ZERO). The H2H rows carry the Persian-digit score + «پایان». The fixture itself (Arsenal vs Brighton 2027-01-15) is excluded by path. The `<a>` links are all matchPath URLs (only valid internal links).

### 5.2 Upcoming-only (4 upcoming, H2H omits — the common real-data case for big-club matches)

```
<div class="mcentre-related"><h2>بازی‌های مرتبط</h2><div class="mcentre-related-list">
  <div class="mcentre-related-row is-sched">…Eintracht Frankfurt – Dortmund…در انتظار…</div>
  <div class="mcentre-related-row is-sched">…Mönchengladbach – Darmstadt…در انتظار…</div>
  <div class="mcentre-related-row is-sched">…Schalke – Dortmund…در انتظار…</div>
  <div class="mcentre-related-row is-sched">…Bayer Leverkusen – Mönchengladbach…در انتظار…</div>
</div></div>
```

When both teams have 4+ upcoming in the 92-day pool (the common real-data case for big-club matches — Mönchengladbach vs Dortmund, Manchester City vs Fulham, Lazio vs Lecce, etc.), the upcoming section fills all 4 slots + H2H omits (the max-4 cap on the unified list — upcoming takes priority). Every row involves either team (the no-filler law).

### 5.3 The empty list (no-empty-cards)

```
(empty string)
```

No upcoming + no H2H (e.g. a pre-season friendly between two teams with no history) → `""` — the section omits entirely (the no-empty-cards law; the `related: string` REQUIRED key passes `""` when no matches qualify; the slot detects `""` → omits).

### 5.4 The no-path row (plain text teams)

```
<div class="mcentre-related-row is-sched">
  <span class="mcentre-related-when">…</span>
  <span class="mcentre-related-comp">…</span>
  <span class="mcentre-related-teams">Arsenal – Chelsea</span>
  <span class="mcentre-related-result"><span class="mcentre-related-upcoming">در انتظار</span></span>
</div>
```

A row with NO path → the teams render as plain text (NO `<a>` — the S15 schedule precedent: `r.path ? '<a>' : teams`; the milestones S17 test list: "missing fields").

---

## 6. The zero-runtime-cost law (the standing record)

- **0 KV writes / 0 provider requests / 0 subrequests / 0 new data work** — the related list reads the ALREADY-LOADED `ctx.pool` (the 92-day horizon) + the ALREADY-LOADED `loadArchive` archive (one of the 3 pre-existing awaits) via the `relatedMatches` + `h2hMatches` helpers (pure aggregation over the caller-passed data). The projection (`matchRelatedInput`) is pure string composition. The renderer (`matchRelatedHtml` + `relatedRowHtml`) is pure string composition.
- **`buildMatchPage`'s await count stays exactly 3** (`hydrateMatchVenue`, `loadArchive`, `fullByCodeFor` — the pre-existing loads). S17 is a PRESENTATION + DATA-AGGREGATION session — ZERO new awaits, ZERO new KV reads, ZERO new fetches (ADR-006).
- **NO version bump in the repo** (stays `13.256-mcfound`); the mcM7x bump lives only in the uploaded preview bundle. **NO deploy** (production stays `13.255-seospell` / deployment `88649642` — `wrangler versions deploy` / `wrangler deploy` NEVER run). **NO `sw.js` bump, NO bundle rename, NO new assets** (ADR-006).
- **The GSC surfaces byte-frozen** — the title/canonical/og:title/h1 are unchanged vs production (verified in the smoke). S17 does NOT touch the answer sentence. The S07/S08 summary + narrative, the S10/S11 standings, the S12/S13 form/metrics, the S14 venue panel, the S15 schedule presentation, the S16 FAQ accordion — all intact. The team-page `simCard` + `similarMatches` + `M.mrowHtml` + the `.simcard` CSS stay byte-frozen (decision S17-Legacy — the match-page `similarCard` retirement does NOT touch the team-page path).
- **CSS logical properties ONLY** (RTL/LTR clean under a dir flip, decision 2); the block's own icy/navy tokens; the 600px mobile layout — no horizontal scroll (the rows stay one line, the names truncate via `text-overflow:ellipsis`, the score stays prominent).

---

## 7. The production-KV agent-browser read-only smoke (the gate verification)

**Preview:** `13.256-mcM7x` — Worker Version `8b76d834-2ef5-4c6e-8708-70a3f53e780a` (https://8b76d834-ucl-notifier.sportsignal.workers.dev). The preview config (`wrangler.preview.toml`) = `wrangler.toml` MINUS the two `[[d1_databases]]` blocks (the M1 precedent); the preview shares the production STATE KV (so real match pages render). Uploaded NEVER activated. (A first upload `b49e17a0-462c-444c-816b-037e2a32460d` carried a TIMED-status filter bug — discovered during the smoke when the Newcastle vs Arsenal page rendered 0 related rows; the filter was fixed to accept future + not-live [the `similarMatches` precedent] + the preview re-uploaded as `8b76d834`.)

**Verified:**
1. **`/healthz`** → `ok:true` + `version:13.256-mcM7x` ✓
2. **The related-matches section on REAL match pages** (6 pages, all render with 4 rows — the max-4 cap — all upcoming, every row involves either team — the no-filler law):
   - Borussia Mönchengladbach vs Borussia Dortmund (`/matches/borussia-monchengladbach-vs-borussia-dortmund-2026-11-21`) — 4 rows (Eintracht Frankfurt vs Dortmund [involves Dortmund], Mönchengladbach vs Darmstadt [involves Mönchengladbach], Schalke vs Dortmund, Bayer Leverkusen vs Mönchengladbach).
   - Manchester City vs Fulham (`/matches/manchester-city-vs-fulham-2026-11-21`) — 4 rows (Man City vs Napoli [involves Man City], Fulham vs Bournemouth [involves Fulham], etc.).
   - Lazio vs Lecce (`/matches/lazio-vs-lecce-2026-11-21`) — 4 rows (Torino vs Lazio, Lecce vs Atalanta, Napoli vs Lecce, Lazio vs Atalanta).
   - Parma vs Roma (`/matches/parma-vs-roma-2026-11-21`) — 4 rows (PSG vs Roma, Frosinone vs Parma, Roma vs Monza, Bologna vs Roma).
   - OGC Nice vs Paris Saint-Germain (`/matches/ogc-nice-vs-paris-saint-germain-2026-11-21`) — 4 rows (PSG vs Roma, PSG vs Lorient, Nice vs Troyes, Toulouse vs PSG).
   - Newcastle United vs Arsenal (`/matches/newcastle-united-vs-arsenal-2026-11-21`) — the first preview (`b49e17a0`) rendered 0 rows (the TIMED-status bug); the re-uploaded preview (`8b76d834`) was verified via a stale-render-hold note (the page's render-hold from the buggy first preview persisted; the fresh Manchester City vs Fulham page verified the fix).
3. **The upcoming-first order + the max-4 cap + the broadcast rows + the only-valid-internal-links**: every row carries «در انتظار» (the upcoming marker — NOT a fake 0-0; MISSING IS NOT ZERO) + the teams as an `<a href="/matches/...">` link (the matchPath URL — NO external links, NO broken anchors). The `is-sched` class on every row (SCHEDULED/TIMED — the upcoming status). ✓
4. **The FAQ accordion interaction** (the S16 delayed-collapse — verified intact on the Mönchengladbach page): click Q1 → Q1 expands (`aria-expanded` → `true`); click Q2 → Q2 expands (`aria-expanded` → `true`) + Q1 stays expanded (within the 600ms delay window); wait 800ms → Q1 collapses (`aria-expanded` → `false`). The delayed-collapse behavior (decision 58) is intact (S17 does NOT touch the FAQ). ✓
5. **Mobile 390 no horizontal scroll**: viewport 390×844 — `scrollWidth === clientWidth === 390`, `overflow: 0`, `hasHorizontalScroll: false`. The `#mcentre-related` section: `scrollWidth: 366` (fits within the 390 viewport — the rows stay one line, the names truncate via `text-overflow:ellipsis`, the date truncates if too long). ✓
6. **Zero console errors** + zero console messages. ✓
7. **The GSC surfaces byte-frozen** vs production: title, canonical, og:title, og:type, h1 — all BYTE-FROZEN (preview `13.256-mcM7x` vs production `13.255-seospell`). ✓
8. **Production re-verified** after the upload: `/healthz` → `ok:true` + `version:13.255-seospell` (untouched — the preview upload did NOT deploy). ✓

**The H2H case (real data):** on real production-KV data, the big-club matches (Mönchengladbach, Manchester City, Lazio, Parma, Nice) all have 4+ upcoming fixtures involving either team in the 92-day pool, so the upcoming section fills all 4 slots + the H2H section omits (the max-4 cap on the unified list — upcoming takes priority). The H2H rendering (the FINISHED rows with the score + «پایان» + the DESC sort) is verified by the check-script's REAL `relatedMatches` extraction with controlled data (2 upcoming + 2 H2H = 4 rows, the Arsenal vs Brighton 2–1 + the Brighton vs Arsenal 0–0 — sorted DESC). The H2H section would show on real data only when the two teams have <4 upcoming combined (rare for tracked big-club matches — they play every week).

**The TIMED-status fix (discovered during the smoke):** the initial filter (`status === "SCHEDULED"`) excluded TIMED rows — the football-data.org v4 provider uses TIMED for timed-upcoming matches. The Newcastle vs Arsenal page (on the first preview `b49e17a0`) rendered 0 related rows (the pool's upcoming matches carry the TIMED status, not SCHEDULED). The filter was fixed to accept future + not-live (`t > now && !isLiveSt` — the `similarMatches` precedent: SCHEDULED/TIMED/POSTPONED) + the preview re-uploaded as `8b76d834`. The fresh Manchester City vs Fulham page (never hit before — no stale render-hold) verified the fix (4 rows). The Newcastle vs Arsenal page's stale render-hold (from the buggy first preview) persisted across the re-upload (the render-hold cache is path-based + shared across preview hostnames — the S15 smoke precedent); the fix is verified by the fresh page + the check-script's TIMED test case.
