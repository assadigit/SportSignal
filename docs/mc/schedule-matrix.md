# Match Centre — Schedule Matrix (M6 gate)

**Milestone:** M6 — Venue & weekly schedule (S14 + S15)
**Specification:** §11 "Weekly fixture schedule"
**Decisions:** 39 (the 7-day anchor + the daily groups + the 48h emphasis + the remaining-days expansion), 40 (one «نمایش روزهای بعد» control, no per-date expanders), 41 (broadcast-style rows), 42 (one discreet coverage note; never imply empty dataset means no matches)
**Audit:** §4 row 74 (grade A — `ctx.pool` 92-day horizon + `payload.thisWeek/nextWeek`, 0/0 new fetch/KV) + §12 row S15 (`src/seo/match-centre.ts` [inline JS] | date groups, broadcast rows, «نمایش روزهای بعد», one note)
**Preview:** `13.256-mcM6x` — Worker Version `78a389a5-37b4-4d51-9da1-9ab0a5398d22` (https://78a389a5-ucl-notifier.sportsignal.workers.dev) — uploaded NEVER activated (`wrangler versions deploy` / `wrangler deploy` NEVER run); the repo version stays `13.256-mcfound`; the mcM6x bump lives only in the uploaded bundle.
**Gate result:** **PASSED** — the production-KV agent-browser read-only smoke verified the schedule section on 6 real match pages + the expand-control interaction (click + keyboard) + the mobile 390 no-horizontal-scroll + zero console errors + the GSC surfaces byte-frozen vs production + production re-verified `ok:true / 13.255-seospell` after the upload.

---

## 1. The S14 data layer — the `windowSchedule` aggregation helper

The schedule reads the ALREADY-LOADED `ctx.pool` (the `matches_v13_tracked` 92-day horizon, hidden leagues filtered — the SAME pool the S12 form + the S13 clean-sheet reads use) + `payload.thisWeek/nextWeek` (the homepage's views of the same pool, deduped on the teamForm key `home|away|utcDate-day`). The fixture ITSELF is excluded by path (the `pubMatch` shape always carries a path — no self-reference in its own schedule).

### The 7-day window anchor (decision 39, audit §4 row 74 grade A)

The window is ±3.5 days around the fixture's kickoff (`sm.s.utcDate` — 302400000 ms each side). Only matches within `[fixtureDate − 3.5d, fixtureDate + 3.5d]` are collected. The data is computed from the ALREADY-LOADED `ctx.pool` rows — ZERO new awaits, ZERO new KV reads, ZERO new fetches (ADR-006). The `windowSchedule(ctx, fixtureDate, fixturePath)` helper is a pure aggregation function in `src/seo/data.ts` (the `teamForm`/`teamCompMetrics` precedent — `data.ts` cannot import `files.ts`; the caller passes the already-loaded ctx in).

### The Tehran-day grouping (spec §11 "Group fixtures under localized date headings")

The day grouping uses the Tehran calendar day (`tehranDayKey` — `Asia/Tehran`, the `SEO.DISPLAY_TZ`). The grouping produces three buckets:

- **`sameDay`** — the fixture's Tehran calendar day (excl. the fixture itself; takes precedence). 0–1 groups.
- **`next48h`** — the 48h AFTER the fixture's kickoff on OTHER days (the emphasized window — spec §11 "Emphasize the next 48 hours"). same-day matches do NOT leak into next48h (sameDay takes precedence). 0–2 groups.
- **`remaining`** — the rest of the 7-day window (before the fixture on other days, or >48h after — for S15's «نمایش روزهای بعد» expand control). 0+ groups.

### The no-false-empty law (decision 42 + audit §4 row 74)

The discreet tracked-universe coverage note is MANDATORY when the section is present (`windowSchedule.coverageNote` is always `true` when the window is anchored). An EMPTY window (`sameDay`/`next48h`/`remaining` all empty) still renders the coverage note — NEVER «بدون مسابقه» (spec §11: "Never say «بدون مسابقه» merely because the dataset is empty"). The coverage note is the antidote to a false «no matches» message — the section is present with the note, explaining the tracked-universe limitation. A window that can't be anchored (no fixture date — the degenerate guard; every match carries a `utcDate`, so this is the only null case) → `coverageNote:false` → the section omits entirely.

### The row atoms (the S14 forward-compatible projection)

`windowSchedule` produces `ScheduleRow` atoms (`path`/`utcDate`/`compCode`/`compFa`/`homeFa`/`awayFa`/`gh`/`ga`/`live`/`finished`/`minute`). The `matchScheduleInput` projection in `src/seo/pages.ts` pre-builds the `MatchScheduleRowInput` atoms (PRE-ESCAPED — the composer is a pure leaf, the S04 hero precedent):

- `pathHtml` — the match link `<a>` (prebuilt) — `""` when the row carries no path.
- `timeHtml` — the kickoff time `<time datetime=...>` (faTime, Persian digits — the S05 hero precedent).
- `compHtml` — the competition faName (escaped; the `compFa` fallback: `s.competition.faName || translateCompetition || COMP_EN || code`).
- `homeHtml` / `awayHtml` — the home/away team faName (escaped).
- `scoreHtml` — the score "H – A" (Persian digits) — `""` when not scored (S15's upcoming marker — MISSING IS NOT ZERO; a SCHEDULED match is never a fake 0-0).
- `live` / `finished` — the status booleans (IN_PLAY|LIVE|PAUSED / FINISHED).

---

## 2. The S15 presentation — the broadcast rows + the date headings + the expand control

S15 EXTENDS the S14 `matchScheduleHtml` renderer (in `src/seo/match-centre.ts`) to consume the S14 day-group atoms. The atoms are byte-frozen (S14's `windowSchedule` + the `MatchScheduleInput` projection — S15 EXTENDS the renderer, NOT the atoms).

### The broadcast row (spec §11, decision 41)

One `<div class="mcentre-sched-row">` per match — compact, one line, RTL flex layout:
- `.mcentre-sched-time` — the kickoff time (the `<time>` atom, fixed width, tabular digits).
- `.mcentre-sched-comp` — the competition faName (muted, truncates via `text-overflow:ellipsis`).
- `.mcentre-sched-teams` — the teams (the `pathHtml` — home – away, with the `<a>` link when the row carries a path; takes the remaining space, truncates).
- `.mcentre-sched-result` — the score + status OR the upcoming marker:
  - A scored row (live or finished): `.mcentre-sched-score` (the Persian-digit "H – A", weight 800, prominent) + the status indicator.
  - A SCHEDULED row (`scoreHtml ""`): `.mcentre-sched-upcoming` «در انتظار» (the upcoming marker — NOT a fake 0-0; the S14 MISSING-IS-NOT-ZERO law).

**Decision S15-Crest: NAME-ONLY.** Spec §11 "team crests/names" allows either; the S14 atoms carry NO `crestHtml` (only `homeHtml`/`awayHtml`/`pathHtml` carry the names). The name-only path is the lower-risk option — NO S14 atom/projection co-evolution. A future crest atom would require co-evolving the S14 atoms + the S14 projection assertions.

### The status vocabulary (the S04 hero vocabulary, compacted)

- **live** (`live:true`, scoreHtml populated): the live dot `<i class="mcentre-sched-live" aria-label="در جریان">` (a small pulsing icy-blue dot; the S04 hero `.mscore` aria-label «در جریان») + the score. The `.mcentre-sched-row.is-live` class (a subtle background tint).
- **finished** (`finished:true`, scoreHtml populated): `<span class="mcentre-sched-fin">پایان</span>` (the S04 hero «پایان بازی» compacted — the broadcast row's compact status) + the score.
- **scheduled** (`!live && !finished`, scoreHtml `""`): «در انتظار» (the upcoming marker — no score).

### The date headings (spec §11 "Group fixtures under localized date headings", decision S15-Date)

One `<h3 class="mcentre-sched-date">` per day group with the `dateHtml` (`faDateD2` — the S11/S12 compact-date precedent). **Decision S15-Date:** the heading renders CONSISTENTLY for ALL day groups (sameDay + next48h + remaining) — NO special «امروز» label. sameDay = the fixture's Tehran calendar day, NOT necessarily "today" — «امروز» would be misleading when the fixture is not today; the `faDateD2` heading is always accurate. An EMPTY group (`rows.length === 0`) → `""` (the no-empty-cards law — a bare date heading with no rows omits).

### The next48h emphasis (spec §11 "Emphasize the next 48 hours", decision S15-Emphasis)

The next48h groups are wrapped in `<div class="mcentre-sched-soon">` — a subtle icy-blue `border-inline-start:2px solid rgba(125,211,252,.5)` (the visual emphasis). The sameDay + remaining groups render un-emphasized. When next48h is empty, the wrapper omits (the no-empty-cards law).

### The «نمایش روزهای بعد» expand control (decision 40, the milestones S15 test list)

ONE `<button class="mcentre-sched-toggle" type="button" aria-expanded="false" aria-controls="mcentre-sched-remaining">نمایش روزهای بعد</button>` — renders ONLY when there are remaining groups (`hasRemaining`). NO per-date expanders (decision 40: "One control reveals remaining days; no per-date expanders"). The remaining container `<div id="mcentre-sched-remaining" class="mcentre-sched-remaining" hidden>` starts collapsed (`hidden` attribute — removed from layout + tab order + the accessibility tree). Keyboard-accessible (a `<button>` — inherently focusable + Enter/Space activates it).

The inline `matchScheduleScript()` in `src/seo/pages.ts` (the S06 `matchNavScript` / S04 `matchHeadScript` precedent — rides the schedule part via the `buildMatchPage` ternary `schedule: scheduleHtml ? scheduleHtml + matchScheduleScript() : ""`) toggles on click:
- the remaining container's `hidden` attribute (`box.hidden = true/false`),
- the button's `aria-expanded` (`"true"` ↔ `"false"`),
- the button's label («نمایش روزهای بعد» ↔ «بستن روزهای بعد»).

Pure DOM — no imports, no fetch, no timer, no polling (the S06 Q13=A precedent). Reduced-motion = instant (the CSS fade-in on expand is gated by the `prefers-reduced-motion:reduce` media query; the script itself does no motion). The handler no-ops when the button isn't found (`if(!btn)return` — a degenerate page with no schedule section).

### The coverage note at the end (decision S15-Note)

The discreet tracked-universe coverage note rides at the END of the schedule section (AFTER the rows + the expand control + the remaining container). Spec §11 "one discreet coverage note" with no placement constraint; the note qualifies the rows above it. The S14 `.mcentre-schedule-note` CSS (muted, `.75rem`, the bordered pill) stays byte-frozen.

### The composer stays the S02 pure leaf

S15 EXTENDS `matchScheduleHtml` to produce the rows + the date headings + the expand-control MARKUP — but the composer carries ZERO client-script (no `<script>`, no `addEventListener`, no fetch/timer). The inline JS rides `pages.ts`'s `matchScheduleScript` (appended to the schedule part in `buildMatchPage`). The `scheduleRowHtml` + `scheduleGroupHtml` helpers are pure string composition. The S14 composer-purity cost-law assertion holds (co-evolved message: the composer produces the markup, the script lives in pages.ts).

---

## 3. The fail-closed gates

| Case | Behavior |
|---|---|
| **Full window** (sameDay + next48h + remaining) | The rows + the date headings + the next48h emphasis + the expand control + the collapsed remaining container + the coverage note at the end. |
| **Partial** (some groups empty) | The present groups render; the empty groups omit. The expand control renders ONLY when `remaining` is non-empty. The `.mcentre-sched-soon` wrapper renders ONLY when `next48h` is non-empty. |
| **Empty window** (all groups empty, `coverageNote:true`) | The coverage note ALONE — NO rows, NO button, NO remaining container (byte-identical to S14's empty-window case — the no-false-empty law: NEVER «بدون مسابقه»). |
| **Degenerate guard** (`coverageNote:false` — no fixture date) | `""` — the section omits entirely (every match carries a `utcDate`, so this is the only null case). |
| **Missing status** (a SCHEDULED row — `scoreHtml ""`) | The upcoming marker «در انتظار» — NOT a fake 0-0 (the S14 MISSING-IS-NOT-ZERO law). |
| **Missing crest** (decision S15-Crest: name-only) | The teams render via `homeHtml`/`awayHtml`/`pathHtml` (the names) — NO crest `<img>` markup. |
| **Stale/live overlay** | The live-overlay guards — a LIVE row renders the live dot + the score; a FINISHED row renders «پایان» + the score; a SCHEDULED row renders «در انتظار». |

---

## 4. Representative examples (the REAL renderer output)

The REAL `matchScheduleHtml` (transpiled from `src/seo/match-centre.ts` via `ts.transpileModule`, the same extraction the check-script uses) fed controlled `MatchScheduleInput` atoms.

### 4.1 The full window — sameDay (finished) + next48h (scheduled, emphasized) + remaining (live, collapsed)

```
<div class="mcentre-schedule"><h2>بازی‌های هفته</h2>
  <h3 class="mcentre-sched-date">، ۱۴ آذر (۴ دسامبر)</h3>
  <div class="mcentre-sched-rows">
    <div class="mcentre-sched-row is-fin">
      <span class="mcentre-sched-time"><time datetime="2026-11-29T15:00:00Z">15:00</time></span>
      <span class="mcentre-sched-comp">لیگ برتر انگلیس</span>
      <span class="mcentre-sched-teams"><a href="/liverpool-vs-chelsea-2026-11-29">Liverpool – Chelsea</a></span>
      <span class="mcentre-sched-result"><span class="mcentre-sched-score">۲ – ۱</span><span class="mcentre-sched-fin">پایان</span></span>
    </div>
  </div>
  <div class="mcentre-sched-soon">
    <h3 class="mcentre-sched-date">، ۱۵ آذر (۵ دسامبر)</h3>
    <div class="mcentre-sched-rows">
      <div class="mcentre-sched-row is-sched">
        <span class="mcentre-sched-time"><time datetime="2026-11-30T17:30:00Z">17:30</time></span>
        <span class="mcentre-sched-comp">بوندسلیگا</span>
        <span class="mcentre-sched-teams"><a href="/dortmund-vs-leverkusen-2026-11-30">Dortmund – Leverkusen</a></span>
        <span class="mcentre-sched-result"><span class="mcentre-sched-upcoming">در انتظار</span></span>
      </div>
    </div>
  </div>
  <button class="mcentre-sched-toggle" type="button" aria-expanded="false" aria-controls="mcentre-sched-remaining">نمایش روزهای بعد</button>
  <div id="mcentre-sched-remaining" class="mcentre-sched-remaining" hidden>
    <h3 class="mcentre-sched-date">، ۱۷ آذر (۷ دسامبر)</h3>
    <div class="mcentre-sched-rows">
      <div class="mcentre-sched-row is-live">
        <span class="mcentre-sched-time"><time datetime="2026-12-02T19:30:00Z">19:30</time></span>
        <span class="mcentre-sched-comp">بوندسلیگا</span>
        <span class="mcentre-sched-teams"><a href="/bayern-vs-leipzig-2026-12-02">Bayern – Leipzig</a></span>
        <span class="mcentre-sched-result"><span class="mcentre-sched-score">۱ – ۰</span><i class="mcentre-sched-live" aria-label="در جریان"></i></span>
      </div>
    </div>
  </div>
  <p class="mcentre-schedule-note">این برنامه بر اساس داده‌های موجود نمایش داده می‌شود و ممکن است شامل تمام بازی‌ها نباشد.</p>
</div>
```

The chronological order (sameDay → next48h → remaining), the next48h emphasis wrapper, the single expand button, the collapsed remaining container (`hidden`), the coverage note at the end. The finished row (Liverpool vs Chelsea 2–1, «پایان»), the scheduled row (Dortmund vs Leverkusen, «در انتظار»), the live row (Bayern vs Leipzig 1–0, the live dot).

### 4.2 The empty window (no-false-empty) — the coverage note ALONE

```
<div class="mcentre-schedule"><h2>بازی‌های هفته</h2><p class="mcentre-schedule-note">این برنامه بر اساس داده‌های موجود نمایش داده می‌شود و ممکن است شامل تمام بازی‌ها نباشد.</p></div>
```

An EMPTY window (all groups empty) renders the coverage note ALONE — NO rows, NO button, NO remaining container. NEVER «بدون مسابقه» (spec §11). Byte-identical to S14's empty-window case (S15 preserves the S14 no-false-empty behavior).

### 4.3 sameDay only (no next48h, no remaining → no button, no soon wrapper)

```
<div class="mcentre-schedule"><h2>بازی‌های هفته</h2>
  <h3 class="mcentre-sched-date">، ۱۴ آذر</h3>
  <div class="mcentre-sched-rows"><div class="mcentre-sched-row is-fin">…Liverpool – Chelsea…۲ – ۱…پایان…</div></div>
  <p class="mcentre-schedule-note">…</p>
</div>
```

Only sameDay present → the sameDay rows + the coverage note. NO `.mcentre-sched-soon` wrapper (next48h empty), NO expand button (remaining empty). The partial dataset renders the present groups.

### 4.4 sameDay + next48h but no remaining (no button)

```
<div class="mcentre-schedule"><h2>بازی‌های هفته</h2>
  <h3 class="mcentre-sched-date">، ۱۴ آذر</h3>…Liverpool – Chelsea…۲ – ۱…پایان…
  <div class="mcentre-sched-soon"><h3 class="mcentre-sched-date">، ۱۵ آذر</h3>…Dortmund – Leverkusen…در انتظار…</div>
  <p class="mcentre-schedule-note">…</p>
</div>
```

sameDay + next48h present, remaining empty → the rows + the next48h emphasis + the coverage note. NO expand button (remaining empty — `hasRemaining` is false). The expand control renders ONLY when there are remaining groups.

### 4.5 The degenerate guard (coverageNote:false → "")

```
(empty string)
```

A window that can't be anchored (no fixture date — `coverageNote:false`) → `""` — the section omits entirely. Every match carries a `utcDate`, so this is the only null case (the S14 degenerate guard, preserved by S15).

### 4.6 Multiple remaining groups (chronological expansion)

```
<div class="mcentre-schedule"><h2>بازی‌های هفته</h2>
  <button class="mcentre-sched-toggle" type="button" aria-expanded="false" aria-controls="mcentre-sched-remaining">نمایش روزهای بعد</button>
  <div id="mcentre-sched-remaining" class="mcentre-sched-remaining" hidden>
    <h3 class="mcentre-sched-date">، ۱۶ آذر</h3>…Atletico – Barcelona…در انتظار…
    <h3 class="mcentre-sched-date">، ۱۷ آذر</h3>…Bayern – Leipzig…۱ – ۰…(live dot)…
    <h3 class="mcentre-sched-date">، ۱۸ آذر</h3>…PSG – Marseille…۳ – ۲…پایان…
  </div>
  <p class="mcentre-schedule-note">…</p>
</div>
```

When sameDay + next48h are empty but remaining has multiple groups, the expand button renders right after the `<h2>` (the only content before the collapsed remaining container). The remaining groups render in chronological order (the `windowSchedule` grouping preserves the day order — the milestones S15 test list: "chronological expansion"). Clicking the button reveals all three remaining day groups.

---

## 5. The zero-runtime-cost law (the standing record)

- **0 KV writes / 0 provider requests / 0 subrequests / 0 new data work** — the schedule reads the ALREADY-LOADED `ctx.pool` via the S14 `windowSchedule` helper (pure aggregation over the caller-passed ctx). The projection (`matchScheduleInput`) is pure string composition. The renderer (`matchScheduleHtml` + `scheduleRowHtml` + `scheduleGroupHtml`) is pure string composition. The inline script (`matchScheduleScript`) is pure DOM (no fetch/timer/polling/imports).
- **`buildMatchPage`'s await count stays exactly 3** (`hydrateMatchVenue`, `loadArchive`, `fullByCodeFor` — the pre-existing loads). S15 is a PRESENTATION session — ZERO new awaits, ZERO new KV reads, ZERO new fetches (ADR-006).
- **NO version bump in the repo** (stays `13.256-mcfound`); the mcM6x bump lives only in the uploaded preview bundle. **NO deploy** (production stays `13.255-seospell` / deployment `88649642` — `wrangler versions deploy` / `wrangler deploy` NEVER run). **NO `sw.js` bump, NO bundle rename, NO new assets** (ADR-006).
- **The GSC surfaces byte-frozen** — the title/canonical/og:title are unchanged vs production (verified in the smoke). The S14 R1 venue-clause fix is the last answer-sentence change; S15 does NOT touch the answer sentence.
- **CSS logical properties ONLY** (RTL/LTR clean under a dir flip, decision 2); the block's own icy/navy tokens; the 600px mobile layout — no horizontal scroll (the rows stay one line, the names truncate, the score stays prominent).

---

## 6. The production-KV agent-browser read-only smoke (the gate verification)

**Preview:** `13.256-mcM6x` — Worker Version `78a389a5-37b4-4d51-9da1-9ab0a5398d22` (https://78a389a5-ucl-notifier.sportsignal.workers.dev). The preview config (`wrangler.preview.toml`) = `wrangler.toml` MINUS the two `[[d1_databases]]` blocks (the M1 precedent); the preview shares the production STATE KV (so real match pages render). Uploaded NEVER activated.

**Verified:**
1. **`/healthz`** → `ok:true` + `version:13.256-mcM6x` ✓
2. **The schedule section on REAL match pages** (6 pages, all render with rows + date headings + expand control + coverage note):
   - Arsenal vs Man City (`/matches/arsenal-vs-manchester-city-2026-11-29`) — 84 rows, 7 day groups, the expand button + the collapsed remaining container (57 remaining rows).
   - Everton vs Liverpool (`/matches/everton-vs-liverpool-2026-11-29`) — 84 rows, 7 day groups.
   - Dortmund vs Leverkusen (`/matches/borussia-dortmund-vs-bayer-04-leverkusen-2026-11-29`) — 84 rows, 8 day groups.
   - PSG vs Roma (`/matches/paris-saint-germain-vs-roma-2026-11-25`) — 79 rows, 8 day groups (the CL third source via `payload.ucl`).
   - Sabah vs Barcelona (`/matches/sabah-vs-barcelona-2026-11-25`) — 79 rows, 8 day groups (the CL page).
   - Real Madrid vs PSV (`/matches/real-madrid-vs-psv-2026-11-24`) — 85 rows, 7 day groups.
3. **The expand-control interaction** (Arsenal vs Man City): click → the remaining container reveals (`hidden` removed), `aria-expanded` → `"true"`, the label swaps «نمایش روزهای بعد» → «بستن روزهای بعد» (57 remaining rows revealed). Click again → collapses (label → «نمایش روزهای بعد», `aria-expanded` → `"false"`, `hidden` restored). ✓
4. **The keyboard interaction**: focus the button + press Enter (native) → expands (the same toggle — the button is keyboard-accessible, `aria-expanded` toggles, the label swaps). ✓
5. **Mobile 390 no horizontal scroll**: viewport 390×844 — `scrollWidth === clientWidth === 390`, `hasHorizontalScroll:false`, 0 overflow rows (the names truncate via `text-overflow:ellipsis`). Verified both collapsed + expanded (the 57 remaining rows revealed, still no horizontal scroll). ✓
6. **Zero console errors** + zero console messages. ✓
7. **The GSC surfaces byte-frozen** vs production: title, canonical, og:title — all BYTE-FROZEN (preview `13.256-mcM6x` vs production `13.255-seospell`). ✓
8. **Production re-verified** after the upload: `/healthz` → `ok:true` + `version:13.255-seospell` (untouched — the preview upload did NOT deploy). ✓

**The no-false-empty case (DFB Pokal cup pages):** the current production-KV universe has no cup matches in the 7-day windows of the tracked matches (every tracked match has ~80 matches in its window). The no-false-empty case (empty window → coverage note alone) is covered by the check-script's REAL-renderer assertion (the empty-window exact-match, byte-identical to S14) + the degenerate-guard assertion (coverageNote:false → ""). The nav-filter behavior (the `بازی‌ها` nav item lights only when the schedule part is non-empty — the adaptive Q9=B filter) is gated by the check-script assertions; on real data, every tracked match's window is populated, so the nav item lights on every match page.

**DISCOVERY (the S13 render-hold precedent):** the SEO router's render-hold cache key is path-based (shared across production + preview hostnames, ≤900s hold). A first attempt to smoke `/newcastle-united-fc-vs-arsenal-fc-2026-11-21` (a slug constructed from the public-matches API's full team names) returned a stale 404 — the actual match-page URLs use the `/matches/` prefix + the simplified slug format (discovered via the homepage's match links). The final smoke used the correct `/matches/` URLs; every page rendered fresh on the first hit (no stale render-hold interference on the correct paths).
