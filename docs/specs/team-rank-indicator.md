> Agents: read AGENTS.md in the repo root first, and follow it for this whole task.

# SportSignal — Team Competition Rank Indicator

**Document type:** Design brief + UI/implementation specification  
**Project:** [assadigit/sportsignal](https://github.com/assadigit/sportsignal)  
**Feature scope:** Match cards only  
**Primary reference:** [`references/current-match-cards.jpg`](references/current-match-cards.jpg)

---

## 1. Design brief

### Objective

Add a tiny circular indicator to each team's area in a match card. It communicates that team's position in the competition relevant to that specific fixture—for example, a club's Premier League position on a Premier League fixture, or its UEFA Champions League league-phase position on a Champions League fixture.

The indicator must add useful context at a glance without making the existing match cards feel busier. It is supporting metadata, not a new visual feature that competes with club crests, team names, kickoff time, or competition labels.

### Core design principle

**Make the rank easy to notice when someone looks for it, but quiet enough that it does not attract attention first.**

The existing match-card design is the source of truth. Preserve its layout, visual hierarchy, colors, typography, spacing, card treatments, and existing information. The only visible change should be the addition of a small rank circle beside each team's name.

### Decisions already made

| Question | Decision |
|---|---|
| Placement | Use the most natural, conventional placement. Recommended default: immediately beside the team name, on the outer side of that team's area. |
| Badge content | The rank number only. No `#`, ordinal suffix, label, icon, or abbreviation. |
| Competition coverage | Any competition and phase that has a meaningful, official ranking for that team. |
| Both teams | Show an independent rank indicator for each team when data exists for each. |
| Visual prominence | Small but readable. Prefer the restrained, slightly contrasting treatment described below—not an almost invisible treatment. |
| Scope | Match cards only. Do not redesign the page or other components. |

---

## 2. Visual concept

### Recommended appearance

A small circular badge, approximately **22 × 22 CSS pixels** on normal mobile layouts:

- **Shape:** True circle, fixed width and height, `aspect-ratio: 1 / 1`.
- **Fill:** Muted, translucent slate/navy blue. It should be only slightly more distinct than the card background.
- **Border:** A thin, low-contrast cool-blue border, approximately 1px.
- **Number:** Pale icy blue or soft off-white; medium-to-semibold weight; centered both vertically and horizontally.
- **Typography:** Use the existing application font. Do not introduce a new font.
- **Number sizing:** Approximately 11–12px for one- and two-digit ranks; keep two-digit values legible without changing the circle into an oval.
- **Spacing:** About 5–7px from the team name, adjusted to the existing card rhythm.

Suggested starting values only—prefer existing design tokens if the repository already defines suitable equivalents:

```css
.rank-indicator {
  width: 22px;
  height: 22px;
  min-width: 22px;
  aspect-ratio: 1 / 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(164, 196, 226, 0.30);
  border-radius: 50%;
  background: rgba(124, 164, 202, 0.14);
  color: #D6E9FA;
  font-size: 11px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  line-height: 1;
  flex: 0 0 auto;
}
```

Treat these as visual starting points, not permission to introduce a separate styling system. Adapt the values to the existing palette and tokens after inspecting the code.

### Visual restrictions

Do **not** use:

- Bright green, red, yellow, or team-specific colors to encode rank.
- Club-colored fills, flags, extra icons, crowns, arrows, or labels.
- Glow, neon edges, gradients, strong shadows, or a 3D treatment.
- A pill, capsule, or large chip instead of a circle.
- A background panel around the team name and badge.
- A `#` prefix, `th`, `st`, or any text other than the rank number.

Rank is informational, not a performance score. Do not imply that first place is a success state or a low position is an alert state through color.

### Hierarchy

The visual priority must remain:

1. Club crest and team identity.
2. Kickoff time/date or live match information.
3. Competition and existing match metadata.
4. Rank indicator as quiet supporting information.

The badge must never become more visually prominent than the team name or crest.

---

## 3. Placement and alignment

### Primary placement

Place the circle **inline with the team name**, immediately beside it. Do not place it beside the crest by default: the crest is already a strong visual anchor, and attaching another element there risks making the upper part of the team block feel crowded.

Use the outer side of each team's area—the side farther from the central kickoff-time column—when the card layout allows it naturally:

- Team block on the visual left: badge sits just outside the name, toward the left edge of the card.
- Team block on the visual right: badge sits just outside the name, toward the right edge of the card.

The name and badge should read as one compact, centered team-identity row. Keep the badge vertically centered with the text. Do not let it drift toward the match's central time/date area.

### RTL and LTR are mandatory

The reference screenshot uses Persian/RTL content. The implementation must also work in English/LTR.

- Preserve the current team-name alignment and direction.
- Position the badge according to the **visual side of the team block**, not by blindly applying the same `left`, `right`, `before`, or `after` rule to both teams.
- In RTL, do not allow both badges to move toward the same logical edge or toward the center of the card.
- In LTR, preserve the same visual symmetry: each badge remains on the outside of its team area.
- Use the project's existing direction/localization mechanism and logical CSS properties where appropriate. Avoid hard-coded global direction overrides.
- The rank number itself must remain correctly ordered and centered. Use the app's existing locale-aware number formatting: Persian numerals in Persian UI if that is the established convention, Western numerals in English UI if that is the established convention.

### Long team names and narrow screens

- Keep the existing team-name font size and styling wherever possible.
- The badge must not overlap the name, crest, or central match information.
- Do not let the badge shrink into an unreadable shape; use `flex-shrink: 0` or the equivalent.
- If space is tight, reduce the badge very slightly (for example, to 20px below a narrow-screen breakpoint) and use a compact 4–5px gap before reducing team-name legibility.
- Preserve the existing wrapping behavior. Do not truncate a team name merely to fit the badge unless that is already the card's established behavior.
- Check both one-digit and two-digit positions (for example, 1, 9, 10, and 20).

---

## 4. Competition and ranking rules

The number must represent the team's position in the **competition associated with that exact match**, not simply the team's position in its domestic league.

### Required behavior

1. **Use the fixture's competition.** For a Premier League fixture, show the team's current Premier League position. For a Champions League league-phase fixture, show its current Champions League league-phase position.
2. **Both teams are independent.** Resolve each team's position in the same fixture competition and relevant season/phase. The two values may differ.
3. **Support every competition with a meaningful official ranking.** This can include domestic leagues, continental league phases, group tables, round-robin competitions, and other competitions with an official table.
4. **Respect the competition phase.** A league-phase position, group position, knockout seed, and final tournament position are not interchangeable.
5. **Do not invent or infer a position.** If no applicable official ranking exists or the data is unavailable, do not render a badge for that team.
6. **Never use a fallback from another competition.** For example, do not show a club's domestic league rank on a domestic cup or Champions League knockout fixture just because its domestic rank is available.

### Phase-specific guidance

| Competition situation | Display rule |
|---|---|
| Domestic league/table | Show the team's current position in that league. |
| Champions League league phase | Show the team's current overall league-phase position. |
| Group-stage competition | Show the team's position in its group only when the group context is clear from existing match information, or show an official overall competition position if one exists. Do not present a group rank as though it were an overall rank. |
| Round-robin competition | Show the current official table position. |
| Knockout-only cup or knockout round with no active official table | Hide the badge. Do not substitute domestic league position or draw seeding. |
| Knockout phase where the competition still provides a meaningful, official ranking | Show it only if the ranking source explicitly defines it as the applicable position for that phase. |
| Missing, invalid, or unresolved rank | Hide that team's badge. Never show `0`, `-`, `?`, or a fabricated placeholder. |

### Important group-stage caveat

A plain number-only circle cannot explain whether `2` means second in Group A, second in the entire competition, or second in a league phase. Therefore, display group positions only when the existing card already makes the relevant group context clear, or when the competition provides an unambiguous overall ranking. Do not add a group label solely to support this feature; that would violate the minimal-design goal.

### Data validity

- Rank must be a positive integer within the valid range for that official table.
- Use the correct competition, season, and phase identifiers when resolving the position.
- A missing rank is `null`/unavailable—not zero.
- Do not use hard-coded sample ranks in production.
- If the source data is stale or its freshness cannot be established, follow the repository's existing freshness rules. Do not silently present an unrelated or old rank as current.

---

## 5. Rendering and interaction behavior

### Rendering

- Each team gets its own optional rank indicator.
- If both ranks exist, render both.
- If only one rank exists, render only that team's badge; do not hide the valid badge just because the opponent's rank is missing.
- If neither rank exists, render neither. The original card must look exactly as it does today.
- The badge must not change the match card's overall height, the position of the kickoff column, or the alignment of the club crests.

### Interaction

This is a passive information label, **not a button**. It must not introduce a click action, navigation, or a new interaction flow.

For accessibility, provide a localized accessible name that explains the number and its context—for example, “Liverpool: 3rd in Premier League” or its Persian equivalent. Keep the visible content number-only. Use the site's existing accessibility and tooltip conventions if they already exist; do not add a permanent visible label.

---

## 6. Responsive and visual QA requirements

Test the feature against the supplied screenshot and the real application at these sizes:

- Narrow mobile: 320–360px CSS viewport width.
- Typical mobile: 375–430px.
- Tablet and desktop widths used by the existing match-card layout.

Verify all of the following:

- Persian/RTL layout: both badges sit on the outer side of their respective team names and away from the central kickoff column.
- English/LTR layout: the visual arrangement remains symmetrical and natural.
- One-digit and two-digit values remain centered and legible.
- Long club names do not collide with badges or central match information.
- Cards with one rank, two ranks, and no ranks all look intentional.
- Existing highlighted cards, standard cards, competition pills, venue pills, and other metadata retain their current appearance.
- No page-level spacing, card height, or unrelated component changes are introduced.

Do not add extra visual states for top-four, relegation, qualification, or last place in this first version.

---

## 7. Repository implementation instructions

Before changing code, inspect the repository and trace the existing match-card implementation. Do not assume a framework, component name, API, data provider, or data shape from this document.

### Inspect first

1. Locate the match-card component and the two team-identity blocks.
2. Identify the existing team and fixture data models.
3. Trace how each fixture's competition, season, and phase are represented.
4. Find whether standings/rank data already exists in the frontend, backend, API responses, or a cache.
5. Identify how Persian/RTL and English/LTR direction and numeral localization are currently handled.
6. Find existing design tokens and card-specific styles that should be reused.

### Implementation principles

- Keep the change tightly scoped to match cards and the team-name row.
- Reuse existing standings data and data-fetching/caching mechanisms wherever possible.
- Do not introduce one request per card or one request per team (avoid N+1 network/API calls).
- Do not add a new data provider or large dependency without demonstrating that the existing architecture cannot support the feature.
- If rank data does not currently reach the match-card layer, explain the smallest appropriate data-flow change before implementing it.
- Keep the rank tied to the fixture's competition and the correct season/phase.
- Use a small reusable component only if it fits the repository's existing component conventions.
- Use existing localization utilities for accessible labels and numeral formatting.
- Avoid global CSS selectors, global direction changes, or broad refactors.
- Preserve all unrelated functionality and existing visual states.
- Do not rework the card, redesign the team block, or change the page background as part of this task.

### Suggested conceptual data contract

This is a description of the information the UI needs, **not a requirement to introduce this exact schema**. Adapt it to the repository's existing models:

```ts
interface TeamCompetitionRank {
  position: number;          // Positive, official table position
  competitionId: string;
  seasonId: string;
  phaseId?: string | null;   // League phase, group stage, etc.
  groupId?: string | null;  // Needed when the position is group-specific
  asOf?: string | null;      // Source timestamp/date, if available
}
```

The match-card UI should receive a validated position that is already resolved for that match's competition context. It should not guess the competition or calculate standings in the presentation component.

---

## 8. Acceptance criteria

The task is complete only when all of these are true:

- [ ] A small circular, number-only rank badge appears beside each team's name when a meaningful rank exists for the match's competition.
- [ ] Both teams can display different positions on the same card.
- [ ] The badge uses a restrained neutral slate/icy-blue treatment and is readable without drawing more attention than the team identity.
- [ ] The badge sits toward the outside of each team area, away from the central kickoff column.
- [ ] Persian/RTL and English/LTR layouts both work correctly.
- [ ] The rank refers to the fixture's competition and correct season/phase—not a convenient but unrelated domestic ranking.
- [ ] Unsupported, missing, invalid, or ambiguous rankings are omitted cleanly.
- [ ] A missing rank for one team does not suppress the other team's valid rank.
- [ ] No extra API request is made for every card/team; existing cache/data flow is reused or extended appropriately.
- [ ] Existing card design, responsive behavior, and unrelated site functionality are preserved.
- [ ] Tests or documented manual QA cover one-digit ranks, two-digit ranks, missing ranks, long names, RTL, and LTR.

---

## 9. Explicit non-goals

Do not include any of the following in this task:

- League tables, standings panels, or new competition pages.
- Rank movement (up/down arrows), trend indicators, or points totals.
- Team-form indicators, badges, flags, or additional metadata.
- New filters, sorting, tooltips that add persistent UI, or click interactions.
- Color-coding rank quality or highlighting qualification/relegation positions.
- A redesign of match cards, team crests, kickoff display, competition pills, or the page background.
- Any change outside the match-card feature unless a narrowly scoped data-flow adjustment is essential and justified.

---

## 10. Definition of success

At first glance, the match cards should look almost identical to the supplied reference. On a second glance, users should be able to pick up each team's competition position instantly. The feature should feel like it was always part of the card—not like another badge or decoration was added later.

---

## 11. S38 addendum — the tap + hover tooltip (owner-directed, 2026-11-09)

> Supersedes ONE line of §9: the owner explicitly asked for the tooltip
> ("Ok now add a TAP, mouse hover tool tip that shows what it means for
> example: رتبه در پریمیرلیگ / رتبه در لیگ قهرمانان"). Everything else in
> §9's non-goals stays in force. The interaction remains transient — never
> persistent UI.

### Goal

The bare number cannot say WHAT it ranks. A small dark tooltip bubble — the
same localized label the badge already carries as its accessible name
(`«رتبه ۳ در لیگ برتر انگلیس»` / `"3rd in Premier League"`) — appears:

- **Mouse hover** (hover-capable devices): after a 200ms rest on the circle,
  centered above the chip; hides the moment the pointer leaves.
- **Tap** (`(hover: none)` touch devices): instantly on tapping the circle;
  stays until an outside tap, `Escape`, or any scroll.
- The badge still is not a button: a tap shows the tooltip instead of
  navigating the card link (the card body navigates exactly as before).

### Rules

- ONE delegated listener set on `document` (capture-phase click) — works for
  the SSR badges AND every client re-render; zero per-chip wiring, nothing
  to rebind on language switch or poll re-render (the site's sharewrap
  closer is the precedent pattern).
- The bubble is ONE reused `#rankTip` element in `document.body`
  (`position:fixed`, geometry from `getBoundingClientRect`, clamped to the
  viewport, flips below when there is no room above; the arrow tracks the
  chip's center). Direction-agnostic geometry — RTL and LTR share one rule.
- The native `title` is stripped on first interaction (no double tooltip);
  the text rides `data-tip` (SSR + client); `aria-label` stays for screen
  readers; `aria-describedby="rankTip"` links the bubble while visible.
- No new tab stops: the chip stays a `<span>` (the page's ~60 badges must
  not flood the keyboard tab order; the a11y name already ships via
  `aria-label`).
- The tooltip closes on every data re-render (`rerenderAll()` hides it — a
  re-rendered list detaches the chip the bubble points at).
- Visual: restrained elevated-slate bubble in the badge's own ink family
  (`--ranktip-*` tokens, light-theme pair, `prefers-reduced-motion` honored,
  z-index above the sticky bar, `pointer-events:none`).
- Zero backend/data changes: the label is derived from the SAME payload
  fields S37 already resolves (`rank` + the fixture's own competition name).
