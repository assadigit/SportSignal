# SportSignal — Featured Hero Carousel Specification

**Status:** Ready for implementation  
**Scope:** Public website hero (`sportsignal.ir`)  
**Primary surfaces:** Desktop and mobile  
**Architecture:** Existing Cloudflare Worker + TypeScript + vanilla client JavaScript; no new frontend framework

---

## 1. Objective

Replace the current single-match featured hero with a responsive, one-match-per-slide carousel.

The carousel must surface the important matches that belong to the same upcoming football session, even when their kickoffs are not simultaneous. A Champions League night may have several marquee matches at the same kickoff; a busy European matchday may also have ACE matches spread across the afternoon and evening.

The carousel must preserve SportSignal's defining promise:

> It is better to miss one notification than to spam.

For the website, this means **show more of the genuinely important matches without weakening the existing eligibility threshold or turning the hero into a general fixtures feed.**

## 2. Confirmed product decisions

| Decision | Requirement |
|---|---|
| Slide content | One complete match per slide. Never combine multiple fixtures into one slide. |
| Concurrent matches | Matches within a 90-minute kickoff window count as concurrent / near-concurrent fixtures, but each remains its own slide. |
| Wider matchday range | ACE matches may appear together even when their kickoffs are several hours apart, up to an 8-hour total kickoff span. |
| Primary slide | The most important eligible match appears first, even if another eligible match starts earlier. |
| Remaining slides | After the primary match, order the remaining selected matches chronologically. |
| Maximum slides | Six matches. Never render more than six slides. |
| Automatic rotation | Enabled by default when there are at least two slides; rotate every 6 seconds (within the requested 5–7 second range). |
| Manual navigation | Previous / next controls, pagination indicators, keyboard support, and touch swipe on mobile. |
| Desktop layout | Preserve the large existing hero presentation. Show one complete slide at a time, with clear navigation and indicators. |
| Mobile layout | Preserve the existing mobile hero card design. Show one complete slide at a time, with clear navigation and indicators. |
| Adjacent-slide preview | Do not show a clipped or partial neighboring slide. |
| Kickoff lifecycle | A match leaves the upcoming hero when it starts / is no longer future. When the feed reports it as live, the existing Live section owns it. |

## 3. Definition of an ACE / hero-eligible match

Do not introduce a new subjective score, AI classifier, league-wide popularity rule, or broader fallback just for the carousel.

Reuse the repository's current hero eligibility rule:

```ts
isFeaturedMatch(match) || isMasterPair(match)
```

In the current code these predicates mean, in practical terms:

- `isFeaturedMatch(match)`: both clubs belong to the existing curated big-match set for the relevant competition type.
- `isMasterPair(match)`: both clubs are in the existing master / desired-team set.

A match must also satisfy the existing hero lifecycle conditions:

- Its kickoff is in the future.
- It is not `FINISHED`.
- It is not live according to the existing `isLiveStatus()` logic (`LIVE`, `IN_PLAY`, or `PAUSED`).
- It has not been excluded by the existing site-hidden-league filtering.

**Do not** promote a match into the hero merely because it is inside the 8-hour window. The time window is only a grouping envelope for matches that already qualify as ACE matches.

**Do not** use broad website-list criteria such as `shouldReport`, one selected team versus a top-five team, or a normal fixture involving only one selected team as a carousel fallback. Those matches may remain in the existing secondary sections, but they are not automatically hero-worthy.

The public match payload already carries a `pair` boolean representing the existing hero-worthy `isFeaturedMatch || isMasterPair` condition. Reuse that authoritative server-side classification where suitable; do not independently recreate the team lists in browser code.

## 4. Matchday slate selection algorithm

### 4.1 Time basis

Use each fixture's canonical `utcDate` timestamp for all comparisons. The 90-minute and 8-hour thresholds must be timezone-independent.

The user's selected display timezone changes the time/date shown on each slide, but **must not change which matches belong to the carousel**. Do not group by a browser-local calendar date; a valid 8-hour session may cross midnight in a user's timezone.

### 4.2 The 90-minute concurrent band

For product terminology and tests, fixtures whose kickoffs are no more than **90 minutes apart** are considered concurrent / near-concurrent.

They still render as individual slides. There is no multi-fixture slide and no requirement to add a special concurrency badge.

### 4.3 The 8-hour session envelope

Build one active hero slate as follows:

1. Collect all future, non-live, non-finished, site-visible ACE candidates.
2. Find the earliest kickoff among those candidates. This is the slate's **time anchor**.
3. Include candidates whose kickoff is at or after the anchor and no more than **8 hours (480 minutes) after it**. The 8-hour boundary is inclusive.
4. Do not use rolling / chained windows. A chain such as 16:00 → 23:30 → 00:30 must not expand the slate to more than 8 hours from its original anchor.
5. When the earliest candidate starts or otherwise ceases to qualify, recompute the slate using the next earliest remaining eligible candidate as the new anchor.

This is intended to include fixtures such as **16:00 and 23:30** (7 hours 30 minutes apart), provided both are ACE matches.

A fixture 8 hours and 1 minute after the slate anchor is outside the current slate. It can enter a later slate once earlier candidates have started / ceased to qualify and the anchor is recalculated.

### 4.4 Maximum of six slides and deterministic selection

If the 8-hour slate contains six or fewer candidates, keep all of them.

If it contains more than six:

1. Rank all candidates by the existing `priorityTier(match)` in descending order.
2. Break equal-priority ties by earlier kickoff first.
3. Break any remaining tie deterministically using the repository's canonical match identity (for example the canonical match key / stable match path); never rely on incidental provider-array order.
4. Keep the first six candidates from that ranking.

The six selected candidates become the carousel slides. Any additional ACE fixtures remain available in their existing secondary website sections; do not silently drop them from the rest of the page.

### 4.5 Slide order

After the six (or fewer) candidates have been selected:

- **Slide 1:** the candidate with the highest `priorityTier`; ties use earlier kickoff and then the deterministic identity tie-breaker.
- **Slides 2 onward:** sort the other selected candidates by kickoff ascending. If kickoffs tie, use `priorityTier` descending and then the deterministic identity tie-breaker.

This distinction is intentional: the strongest ACE match leads the carousel even if it starts later than another match; the rest of the carousel then follows kickoff order.

Do not invent an additional importance score. The current `priorityTier` is the source of truth for importance. When two fixtures have the same tier, the earlier kickoff is the deterministic fallback.

### 4.6 Pseudocode contract

The implementation may use different internal names, but it must be behaviorally equivalent to:

```ts
function pickHeroCarouselMatches(matches, now = Date.now()) {
  const eligible = (matches || []).filter((m) =>
    m.status !== "FINISHED" &&
    !isLiveStatus(m.status) &&
    (isFeaturedMatch(m) || isMasterPair(m)) &&
    Date.parse(m.utcDate) > now
  );

  if (!eligible.length) return [];

  const earliestKickoff = Math.min(...eligible.map((m) => Date.parse(m.utcDate)));
  const inSlate = eligible.filter((m) => {
    const kickoff = Date.parse(m.utcDate);
    return kickoff >= earliestKickoff && kickoff - earliestKickoff <= 8 * 60 * 60 * 1000;
  });

  const bestFirst = [...inSlate].sort((a, b) =>
    priorityTier(b) - priorityTier(a) ||
    Date.parse(a.utcDate) - Date.parse(b.utcDate) ||
    stableMatchIdentity(a).localeCompare(stableMatchIdentity(b))
  );

  const selected = bestFirst.slice(0, 6);
  if (selected.length <= 1) return selected;

  const primary = selected[0];
  const rest = selected.slice(1).sort((a, b) =>
    Date.parse(a.utcDate) - Date.parse(b.utcDate) ||
    priorityTier(b) - priorityTier(a) ||
    stableMatchIdentity(a).localeCompare(stableMatchIdentity(b))
  );

  return [primary, ...rest];
}
```

This is a behavioral contract, not a mandate to copy the sample literally. Reuse the repository's existing normalized match identity and invalid-date guards rather than adding a new identity system.

## 5. Example outcomes

### Example A — simultaneous UCL matches

| Match | Kickoff | Result |
|---|---:|---|
| Liverpool vs Real Madrid | 22:30 | Included if ACE-eligible |
| Manchester City vs Barcelona | 22:30 | Included if ACE-eligible |
| Bayern vs PSG | 22:30 | Included if ACE-eligible |

Each match receives its own slide. The highest-priority match is slide 1; the others follow chronological order (with deterministic tie-breaking for identical kickoff times).

### Example B — matches across the same evening

| Match | Kickoff | Result |
|---|---:|---|
| ACE match A | 16:00 | Included; establishes the 8-hour anchor |
| ACE match B | 19:00 | Included |
| ACE match C | 23:30 | Included; 7h30 after anchor |

The most important of the selected fixtures leads, even if it is not the 16:00 match. The other two follow kickoff order.

### Example C — outside the session envelope

| Match | Kickoff | Result |
|---|---:|---|
| ACE match A | 16:00 | Included; establishes anchor |
| ACE match B | 23:30 | Included; within 8 hours |
| ACE match C | 00:01 next day | Excluded from this slate; 8h01 after anchor |

Match C remains eligible for a later slate after the anchor advances.

### Example D — ordinary fixture inside the window

An ordinary match involving only one selected club, or a selected club versus a top-five opponent that does not satisfy either existing hero predicate, is **not** added merely because it kicks off between two ACE matches.

### Example E — more than six ACE candidates

The selector keeps the six strongest candidates according to `priorityTier` (ties favor earlier kickoffs), then puts the most important first and orders the other five chronologically. Candidates beyond the six-slide cap remain in their existing secondary sections.

## 6. Desktop and mobile presentation

### 6.1 Shared carousel, two existing card presentations

The current page has distinct desktop and mobile hero-card structures:

- Desktop: `#bigHeroCard` / `#heroSpot`, including the current PC HUD artwork, countdown cells, progress track, team art and background composition.
- Mobile: `#heroMCard` / `#mcardSpot`, including the current mobile HUD, stadium scene, portrait ports, match time/date and countdown tiles.

Keep both visual systems. Do not replace them with a generic shared card or redesign their art as part of this task.

There must be **one logical carousel controller and one shared active slide index**. The desktop card and mobile card are two responsive renderings of the same active match, not two independent carousels that can drift out of sync.

Only the card for the current responsive breakpoint should be visible and exposed to keyboard / assistive-technology navigation. Do not create duplicate visible cards, duplicate active links, or duplicate DOM IDs.

### 6.2 One complete slide at a time

- Show one full hero card at a time on desktop and mobile.
- Do not show a partial next/previous card, side peek, or multi-card grid.
- Keep the existing hero's visual prominence and overall placement.
- Preserve the existing match-page link behavior: activating the card opens that specific match's canonical `path` / match URL.
- Keep carousel controls outside the clickable match-card anchor. Never nest buttons or other interactive controls inside the card's `<a>` element.

### 6.3 Visual navigation cues

When there are multiple slides, show:

- Previous and next arrow controls.
- A visible pagination indicator for each slide (maximum six).
- A textual position indicator such as `2 / 5` so users can tell how many matches are featured and where they are.
- A pause / play control for automatic rotation.

These controls must remain clear and usable at both breakpoints. They must not cover team names, crests, kickoff time, venue, or countdown values.

When there is only one slide, hide carousel navigation, pagination, counter and pause/play controls. The match remains a normal hero card.

### 6.4 Responsive placement and touch targets

- Desktop: retain the large existing composition. Place navigation where it is visually obvious but does not obstruct the PC HUD or portraits. Keep the pagination and slide count close enough to the hero to clearly communicate that more featured matches are available.
- Mobile: retain the current mobile card proportions and layout. Place controls in a compact row immediately below the card, not over important content. Avoid adding horizontal page overflow.
- All actionable controls must have at least a 44 × 44 CSS-pixel hit area.
- Keep labels, arrows and indicator order correct for both RTL Persian and LTR English.
- Do not use a neighboring-slide peek as the “more slides” signal; the arrows, pagination and count provide that signal.

### 6.5 Slide transition

Use a restrained, short transition (a simple fade is preferred, approximately 180–250 ms). Do not introduce a dramatic 3D carousel, large horizontal card movement, or layout reflow.

The transition must not cause the page or hero to jump vertically. Keep the hero's existing desktop/mobile geometry stable when team names or venue lengths vary.

## 7. Automatic rotation and manual control

### 7.1 Default behavior

- Start automatic rotation when the carousel has at least two slides.
- Use a fixed **6-second** interval.
- Advance one slide at a time and wrap from the last slide back to the first.
- Manual previous/next and pagination navigation must also wrap at the ends.
- Do not rotate at all when there is only one slide.

### 7.2 Pause and resume

Provide an explicit pause / play button so the visitor can stop automatic movement at any time.

Pause automatic rotation while:

- The pointer is hovering over the carousel on desktop.
- Keyboard focus is anywhere inside the carousel controls or active slide.
- The document/tab is hidden.
- The visitor has explicitly pressed Pause.

Resume after hover/focus leaves only when the visitor has not explicitly paused it. A manual slide change resets the six-second interval; it must not trigger an immediate second change.

On touch devices, a swipe is a manual slide change and resets the interval. The explicit pause control remains available.

### 7.3 Reduced motion

Respect `prefers-reduced-motion: reduce`:

- Disable automatic rotation by default for that visitor.
- Remove/disable slide transition animation.
- Keep manual navigation fully functional.
- A visitor may explicitly start rotation using the play control.

Do not rely on motion alone to communicate that the slide changed.

## 8. Navigation interactions

- Previous / next buttons change exactly one slide.
- Pagination controls jump directly to the selected slide.
- Mobile supports horizontal swipe with a sensible threshold (approximately 40 px); small incidental drags must not change slides.
- A recognized swipe must not activate the underlying match-card link.
- Do not interfere with vertical page scrolling or browser gestures.
- Keyboard: Tab reaches the controls in a sensible order; Enter / Space activates buttons; arrow keys navigate slides when focus is within the carousel, with direction-aware behavior for RTL / LTR.
- Direction-sensitive arrows and swipe interpretation must be tested in both `dir="rtl"` and `dir="ltr"`.
- Do not move keyboard focus automatically when a slide changes. Keep focus on the control the visitor activated.

## 9. Countdown and match content lifecycle

Every slide must show the data for its own match, not a mixture of one slide's content and another slide's countdown.

When the active slide changes, update all relevant fields together:

- Home and away team names.
- Team crests and the appropriate desktop/mobile player artwork.
- Competition identity / logo.
- Kickoff time and match date.
- Venue, where available, with the existing fallback behavior where it is not.
- Desktop countdown (`#hcD`, `#hcH`, `#hcM`) and mobile countdown (`#mcD`, `#mcH`, `#mcM`).
- Desktop countdown progress track and its accessible value.
- Screen-reader countdown text.
- Match-card link and canonical match path.

The existing countdown must count down to the **currently active slide's kickoff**. It must not continue counting down to the original slide-1 match after the visitor navigates to another slide.

Do not create duplicate copies of the fixed countdown IDs in hidden slides. Reuse / update the existing responsive card DOM or use an equally safe pattern with unique IDs. The existing one-second countdown update must read the active match from the carousel state.

Continue to use provider status as the authority for LIVE / IN_PLAY / PAUSED. When the provider reports a match as live, remove it from the upcoming carousel and let the existing Live section render it.

Do not infer a LIVE state from kickoff time alone. If a provider is temporarily late to update status, the hero must still stop treating a past kickoff as a future upcoming fixture, but the client must not fabricate a live score or live state.

Finished matches must never return to the upcoming hero. Postponement / cancellation behavior should follow the repository's existing match-status policy; do not invent a new lifecycle in this feature.

## 10. Data refresh and carousel stability

The public page already polls `/api/public-matches`. Use the existing payload and polling lifecycle; do not add another polling loop, provider request, cron task, KV key, or database table for the carousel.

On each successful payload refresh:

1. Read the latest `heroMatches` array.
2. Reconcile it with the current carousel state by canonical match identity, not by array index.
3. If the currently active match still exists, preserve it as the active match so the regular page refresh does not unexpectedly jump the visitor back to slide 1.
4. If the active match has started, become live/finished, disappeared from the eligible selection, or been removed by the six-slide cap, select the current first slide and reset the rotation timer.
5. Update pagination count and active indicator immediately.
6. If the list becomes empty, hide the hero and carousel controls using the existing no-hero behavior.
7. If the list becomes one item, show the ordinary single hero and remove carousel-only controls.

Do not reset the active slide to the first slide on every 60-second data refresh. Do not reset the autoplay timer on countdown ticks.

Retain the current degraded-payload / last-good-render guard. A failed or incomplete API refresh must not flash the entire hero open/closed, erase the last valid slide, or blank the page. Distinguish a genuinely valid empty `heroMatches: []` from an older payload that does not contain the `heroMatches` field.

## 11. API payload and compatibility

The existing `/api/public-matches` response exposes a single `nextBig` hero match. Extend it with a server-selected array:

```ts
{
  heroMatches: PublicMatch[], // ordered, zero to six items
  nextBig: PublicMatch | null // compatibility alias for heroMatches[0]
}
```

Requirements:

- Each `heroMatches` item uses the same public match shape produced by the existing `pubMatch()` mapping (including canonical `path`, team names, competition data, status, `pair`, venue and score fields already present).
- The server is authoritative for candidate eligibility, 8-hour windowing, maximum-six selection and slide order. The browser must not rebuild ACE eligibility from team lists.
- Keep `nextBig` as an alias of `heroMatches[0]` for backward compatibility with existing client consumers, current server markup, and older cached / deployed clients during the transition.
- For a legacy payload where `heroMatches` is absent, the new client may fall back to `[nextBig]` if `nextBig` is valid.
- If `heroMatches` is present and is an empty array, treat that as a real empty result; do not fall back to stale `nextBig`.
- Do not add a new KV schema or persistent match state. The array is derived from the current filtered match pool.

## 12. Server-rendered first paint and existing markup

The current hero is deliberately rendered server-side for a valid no-JavaScript first paint and then mirrored by the client renderer. Preserve this contract.

- The server-rendered initial hero must be slide 1 (the primary / most important selected match).
- Update both desktop `heroCardHtml()` and mobile `mcardHtml()` using the same slide-1 match.
- Keep the existing desktop and mobile card templates, art and countdown data contract.
- Keep the page usable when JavaScript is unavailable: show the primary match as a normal static hero link. Carousel controls should not appear as dead / nonfunctional controls without a working client controller.
- On client hydration, the first rendered slide must match the server-rendered slide to avoid a visible flash or content swap.
- Keep the one real match link per responsive hero card and preserve the existing canonical URL behavior.

## 13. Persian / English, RTL / LTR, timezone and theme requirements

- Persian remains the default language.
- All new control labels, accessible names, pause/play strings, slide counts and announcements must have Persian and English translations.
- Keep Morabba for headings and Peyda for body text, using the existing typography system.
- Preserve the existing `fa-IR` / Jalali date behavior and selected-timezone conversion.
- Preserve the current number-format contract of each existing card variant; do not accidentally change the desktop or mobile countdown digit conventions as part of this feature.
- Keep the desktop and mobile hero internally `dir="ltr"` where currently required for the HUD geometry, while localizing text and control direction correctly around it.
- Correctly mirror the controls for the English LTR toggle and Persian RTL default.
- Preserve existing dark/light theme behavior and use existing design tokens. Do not introduce a new unrelated palette, glow system, or visual redesign.

## 14. Accessibility requirements

Implement the carousel as an accessible interactive region:

- Give the carousel a localized accessible name (for example, “Featured matches” / `دیدارهای ویژه`).
- Use appropriate carousel / slide semantics (`role="region"`, `aria-roledescription="carousel"`, and slide grouping / `aria-roledescription="slide"` where appropriate).
- Give Previous, Next, Pause and Play buttons explicit localized accessible labels.
- Mark the current pagination control with `aria-current` or an equivalent accessible state.
- Make the active slide understandable as “Match X of Y” to assistive technology.
- Do not announce every automatic slide change repeatedly. Keep the carousel's live announcement behavior quiet during autoplay; announce user-triggered navigation politely.
- Ensure hidden responsive duplicates and inactive slide content are not tabbable or exposed to assistive technology.
- Maintain visible focus indicators and sufficient contrast.
- Respect reduced-motion behavior described above.

## 15. Match duplication and secondary sections

The hero must not cause duplicate fixture cards elsewhere on the same page.

- Exclude the currently selected carousel slide match keys from upcoming secondary lists where those same fixtures would otherwise be repeated (including applicable big-match / UCL / upcoming presentations).
- Do not remove live or finished renderings from their existing lifecycle sections.
- Matches omitted only because the carousel reached its six-slide cap must remain available in their appropriate existing secondary section.
- Do not otherwise reorder or redesign the `topspot`, UCL, live, upcoming, standings, cups, or finished sections in this task.

Use canonical match identity consistently when removing duplicates; do not compare only team display names.

## 16. Performance and implementation constraints

- No new frontend framework or carousel dependency.
- No new API endpoint, provider call, scheduled job, KV key, D1 table, or persistent carousel state.
- Do not load all six player-art variants eagerly if that would materially increase first paint. Prioritize the active slide's art; preload only what is needed for a smooth next transition.
- Avoid layout shift when a new slide has longer club names, missing venue, or missing crest. Reuse the existing truncation / fallback behavior.
- Avoid duplicating countdown timers or listeners per slide. Use one controller and one timer lifecycle.
- Keep event listeners scoped to the carousel and cleanly handle state changes when the match list shrinks or becomes empty.
- Maintain the project's immutable asset/cache-busting convention: when changing version-pinned public JS or CSS, create the next appropriate versioned asset filename and update the references in `src/pages/public.ts`. Do not edit a pinned asset in place and assume all visitors will receive it.

## 17. Likely implementation touchpoints

Inspect the current branch before editing; filenames / asset versions may have advanced since this spec was prepared.

| Area | Current repository location | Expected responsibility |
|---|---|---|
| Hero eligibility and priority | `src/match-classify.ts` | Reuse `isFeaturedMatch`, `isMasterPair`, `priorityTier`; add the multi-match selector and preserve a compatible single-match helper. |
| Public payload | `src/public-matches.ts` | Produce `heroMatches` and the `nextBig` compatibility alias from the filtered match pool. |
| Public page markup | `src/pages/public.ts` | Add carousel control markup around the existing desktop/mobile hero; retain the existing cards and static IDs. |
| Server hero rendering | `src/seo/markup.ts` | Keep `heroCardHtml()` and `mcardHtml()` aligned for the first slide / no-JS view. |
| Client carousel and render lifecycle | Current version-pinned `assets/public-*.js` | Own active slide, auto-rotation, interaction, desktop/mobile synchronization, countdown target, payload reconciliation and live updates. |
| Shared translations | Current version-pinned `assets/core-*.js` (or the current authoritative i18n source if moved) | Add Persian / English control strings and accessible labels. |
| Hero styles | Current version-pinned `assets/public-*.css` | Responsive controls, states, focus, reduced motion and transition styling. |
| Regression coverage | Existing `scripts/` test conventions and `package.json` test command | Add focused selector / payload / lifecycle / UI-contract checks. |

Read `AGENTS.md`, `ARCHITECTURE.md`, and the current hero-related comments before implementation. The current repository documents `pickHeroMatch()` as a shared hero expression used by the website and Telegram `/featured`. Prefer a shared multi-match selector (for example `pickHeroMatches()`) with `pickHeroMatch()` retained as a compatibility wrapper returning the primary item, so the first hero match and `/featured` remain aligned. **Expected limited side effect:** `/featured` still returns one match, but its lead may change to the new highest-priority match within the active 8-hour slate. Do not alter scheduled Telegram notification eligibility, delivery timing, deduplication, broadcast rules, or send paths.

## 18. Testing requirements

Add focused tests following the existing plain Node test style. The selector should be testable with an injected `now` value; avoid dependence on real wall-clock timing.

### Selection tests

1. Two ACE matches with identical kickoff: both are included; one match per slide.
2. ACE matches 90 minutes apart: both are included.
3. ACE matches 90 minutes and 1 millisecond apart: both are still included if they fall within the 8-hour slate; the 90-minute band is not the overall inclusion limit.
4. ACE matches at 16:00 and 23:30: both are included (7h30 span).
5. ACE matches exactly 8 hours apart: both are included.
6. ACE match 8 hours and 1 minute after the anchor: excluded from the current slate.
7. A chain of fixtures cannot extend the total slate beyond 8 hours from the earliest anchor.
8. A match that is not ACE-eligible is excluded even when it is between two qualifying matches.
9. One-selected-team / selected-vs-top-five-only matches do not enter the hero unless they satisfy the existing hero predicate.
10. Live, paused, finished and past-kickoff candidates are excluded.
11. A match removed by site-hidden-league filtering cannot enter the carousel.
12. The highest-priority eligible match is slide 1 even when it kicks off later than another selected match.
13. After slide 1, remaining selected matches are ordered chronologically.
14. Equal priority and equal kickoff produce deterministic order independent of provider input order.
15. More than six eligible candidates never produce more than six slides; overflow is still available in secondary lists.
16. When the current slate's earliest match starts / becomes live, the next earliest eligible candidate becomes the new anchor and the slate is recalculated.
17. Invalid / missing kickoff dates are safely excluded.

### Payload and rendering tests

1. `/api/public-matches` returns `heroMatches` as an ordered array with zero to six public-match rows.
2. `nextBig` equals `heroMatches[0]` or `null` when there is no hero.
3. Legacy payload with no `heroMatches` can still render `nextBig` as one slide.
4. Explicit `heroMatches: []` does not resurrect a stale `nextBig`.
5. Server-rendered desktop and mobile hero both show the primary match on first paint.
6. Server and client renderers remain consistent for club names, crests, league, kickoff, date and venue.
7. Only the active match's canonical link is used by the active card.
8. Selected carousel matches are not duplicated in secondary upcoming sections; overflow matches are not lost.

### Interaction and lifecycle QA

Test at minimum:

- Desktop wide viewport and narrow laptop viewport.
- Mobile narrow viewport and a larger phone viewport.
- Persian RTL and English LTR.
- Dark and light themes.
- One slide, two slides, and six slides.
- Autoplay at six seconds, wrap-around, manual next / previous and direct indicator selection.
- Pause / resume, hover pause, focus pause, hidden-tab pause, and reduced-motion behavior.
- Touch swipe in both directions without opening the match link or blocking vertical scroll.
- Countdown correctness after switching slides and after a payload refresh.
- Current slide retained across a normal data refresh; removed active match falls back cleanly to the new primary.
- Match status changing to LIVE removes it from the hero and shows it in the existing Live section.
- No hero / valid empty payload and API failure / degraded payload behavior.
- No duplicated IDs, nested interactive controls, layout shift, horizontal overflow, console errors or repeated event listeners.

Run the project's full `npm test` command (including TypeScript checks), plus `npm run seo:check` and the local SEO check when a local Worker is available. Do not deploy to production as part of implementation unless separately requested.

## 19. Acceptance criteria

The feature is complete only when all of the following are true:

- [ ] More than one qualifying ACE match in the active 8-hour slate produces a carousel.
- [ ] Simultaneous UCL fixtures appear as separate slides.
- [ ] ACE fixtures at 16:00 and 23:30 can both appear in the same carousel.
- [ ] A non-ACE match is never added just because it falls inside the time window.
- [ ] The highest-priority match is always slide 1.
- [ ] The remaining selected matches are chronological.
- [ ] The carousel never exceeds six slides.
- [ ] Desktop and mobile show one complete slide at a time, with no adjacent preview.
- [ ] Arrows, indicators, slide count and pause/play clearly communicate that more matches are available.
- [ ] Autoplay advances every six seconds and remains manually controllable.
- [ ] RTL Persian and LTR English work correctly.
- [ ] The active slide's team data, match link, kickoff, date, venue and countdown always belong to the same fixture.
- [ ] A match leaves the upcoming hero when it starts; provider-reported live status is shown through the existing Live section.
- [ ] The existing visual design, responsive artwork, server-rendered first paint, last-good rendering guard and page sections remain intact.
- [ ] No notification spam behavior, scheduled Telegram notification logic, or new infrastructure is introduced.
- [ ] All required tests and checks pass.

## 20. Implementation guardrails for the coding agent

1. Read `AGENTS.md`, `ARCHITECTURE.md`, the current implementation and related tests before changing code.
2. Treat this as an extension of the existing hero system, not a fresh carousel component dropped into the page.
3. Keep eligibility and ranking server-authoritative and based on the existing curated predicates.
4. Keep the desktop and mobile cards visually intact; only their active match data and carousel controls should change.
5. Preserve the server/client rendering mirror and the existing degraded-payload protections.
6. Do not edit immutable version-pinned JS/CSS files in place; follow the current asset versioning convention.
7. Add regression tests before considering the change complete.
8. Do not deploy or change unrelated site sections as part of this task.
