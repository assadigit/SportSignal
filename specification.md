# SportSignal Match Centre — Product & Visual Specification

**Version:** 1.0  
**Date:** 10 November 2026  
**Repository:** https://github.com/assadigit/sportsignal  
**Status:** Approved design direction; implementation must begin with repository audit.

---

## 1. Product intent

Build a premium, distinctive, mobile-first Match Centre for SportSignal. It should be a useful entry point into match, team and competition information—not merely a score display or generic metadata dashboard.

Primary audience: Persian-speaking football fans, especially mobile users in Iran. Persian is the primary experience and must be designed natively in RTL. English is an intentional LTR adaptation, not a mirrored afterthought.

The page must remain useful for upcoming and finished matches even when live data is unavailable, delayed or stale. Live information is an optional bonus, not a core product dependency.

Primary goals:
- Clear match identity and lifecycle.
- Useful competition, team-form and fixture context.
- Strong editorial hierarchy without fabricated drama.
- Excellent mobile readability and native RTL behaviour.
- Good organic-search usefulness and a contextual Telegram-channel conversion point.
- Minimal incremental infrastructure cost.

## 2. Non-negotiable design direction

### Visual language
- Deep charcoal / midnight navy backgrounds.
- White primary text and muted-grey supporting text.
- Restrained icy-blue accent for active navigation, links, selected states and important interactions.
- Semantic green/grey/red only for football outcomes where appropriate.
- Thin, subtle dividers; avoid boxing every section into a card.
- Compact components for data-heavy content; generous spacing for editorial content.
- Subtle cinematic stadium atmosphere in the hero.

Avoid:
- Excessive gradients, glow, decorative lighting or gaming HUD styling.
- Overly rounded cards, borders around every component, visual clutter.
- Decorative charts, bars, icons or badges without a functional purpose.
- Large promotional treatments that compete with the match.
- Generic dashboard aesthetics.

### Existing design system
Inspect the current repository and reuse existing fonts, colors, spacing, buttons, icons, navigation, loading patterns and components wherever practical. This is controlled evolution, not a global redesign. Do not introduce a new font or dependency without repository evidence and justification.

## 3. Page structure

Use this order:
1. Existing global website header.
2. Match hero.
3. Sticky horizontal section navigation.
4. Editorial briefing and match facts.
5. Competition standings.
6. Team form and recent results.
7. Venue information.
8. Weekly fixture schedule.
9. FAQ.
10. Related matches.
11. Featured Telegram promotion.
12. Existing global footer.

The page is adaptive. Sections should contract, rearrange or disappear according to data availability. Do not create empty placeholders merely to preserve symmetry.

## 4. Responsive composition

### Desktop
- Centered editorial content area.
- Hero and major editorial sections use the full content width.
- Selective two-column composition where it improves hierarchy and readability.
- Keep information-dense sections full-width.
- No dedicated sidebar.
- Collapse to one column relatively early at intermediate widths rather than squeezing content.

### Mobile
- Deliberate single-column flow.
- Native Persian RTL, including logical ordering and horizontal navigation behaviour.
- No cramped desktop layout squeezed into a phone.
- Compact spacing for tables and fixtures; generous spacing for editorial content.
- No unnecessary horizontal scrolling.
- Preserve readability of team names and statistics.

Tablet/intermediate breakpoints must be selected after inspecting the existing design system and testing real content. Do not invent exact pixel values before repository inspection.

## 5. Match hero

The hero is the visual anchor. It communicates competition, teams, score/status and essential kickoff information.

### Competition identity
- Compact competition crest and name in a restrained line above the teams.
- Secondary to the teams and score.
- Omit the crest if unavailable; do not show an empty image frame.

### Team identity and order
- Balanced face-off: equal prominence for both teams.
- In Persian RTL, home team on the right and away team on the left.
- Show subtle «میزبان» and «میهمان» labels near the respective teams.
- Crests and names both clearly visible.
- No additional team color coding or decorative distinction.

### Scoreboard
- Central, dominant score.
- Strong display numerals.
- Clear lifecycle status.
- Same core identity across upcoming, live and finished states.

### Atmosphere
- Subtle dark stadium image or texture for depth.
- Restrained lighting and contrast.
- Foreground names, crests and score remain highly legible.
- No overpowering floodlights, excessive glow or promotional-banner appearance.

### Player portraits
- Where the existing system already provides applicable portraits, use a cinematic face-off only when both portraits are available.
- If either portrait is missing or fails to load, hide both and use the central scoreboard with crests and names.
- Do not add provider requests or retries to complete the portrait composition.
- Mobile: portraits, when both exist, appear side by side in the upper hero area above the scoreboard. Without both, use the no-portrait central scoreboard.

### Lifecycle states
**Upcoming**
- Prominent kickoff time near the central scoreboard.
- Localized full date.
- No continuously updating countdown or timer dependency.

**Live**
- Show score and status in the hero.
- Do not add a separate live strip, event timeline, minute component or extra live statistics.
- Use only existing cached live information; do not poll.

**Finished**
- Final score is dominant.
- Clear «پایان بازی» status.
- Available verified scorers appear below the hero, grouped by team.
- Do not fabricate result commentary.

### Date and time
- Convert to visitor-local timezone using existing project capabilities.
- 24-hour format.
- Persian numerals in Persian UI; appropriate localized numerals in English.
- Full localized date in the hero.
- Account for timezone conversions that cross a calendar date.
- Do not add a dependency solely for formatting if existing capabilities suffice.

## 6. Sticky section navigation

Five primary destinations:
- خلاصه
- جدول
- فرم
- بازی‌ها
- ورزشگاه

Rules:
- Sticky horizontal navigation immediately below hero.
- Same basic model on desktop and mobile; no vertical sidebar or duplicate navigation.
- Native RTL horizontal scrolling on mobile.
- Readable Persian labels; no tiny fixed tabs.
- Subtle icy-blue active underline.
- Active destination updates as the user scrolls.
- Selecting a destination immediately activates it and smoothly scrolls to the section.
- Account for sticky-nav height so headings are not obscured.
- Respect reduced-motion preferences.
- Do not link to empty sections; keep the agreed primary navigation stable and use compact section fallback where appropriate.

## 7. Editorial briefing and facts

### Briefing placement and appearance
- Prominent editorial block immediately after navigation.
- No additional repeated heading such as «خلاصه».
- Open editorial layout, not a prominent card background.
- Use typography, spacing and subtle dividers.

### Deterministic narrative library
This is a football-commentator-style narrative system, not generic templated filler and not per-match AI.

Possible categories:
- Winning streak / losing streak.
- Unbeaten run.
- Repeated draws.
- Title-race implications.
- Chasing the league leader.
- Protecting first place.
- European qualification battle.
- Relegation pressure.
- Home dominance / away struggles.
- Significant recent-form reversal.

Every narrative category must define:
- Explicit deterministic trigger conditions.
- Meaningful thresholds and minimum sample sizes.
- Exclusions to avoid misleading claims.
- Multiple manually written Persian wording variants.
- Deterministic variant selection based on stable match/team data; wording must not randomly change between page visits.
- Factual evidence and source fields.
- Position in a centrally defined editorial priority hierarchy.

Display one primary storyline and optionally one distinct secondary storyline. Never force a second.

A global priority hierarchy was selected. The precise order must be documented centrally and must not override fixture relevance or factual validity. Potential categories include championship/title implications, relegation pressure, qualification battles, significant streaks/form and home/away performance. Final ordering must be justified in the content rules.

Threshold examples discussed (not production defaults): three consecutive wins/losses, five unbeaten, four draws in the last five. Do not blindly copy these examples; inspect available data and define defensible thresholds.

Lifecycle wording:
- Upcoming: pre-match form and competition context.
- Live: retain the pre-match briefing; do not regenerate frequently.
- Finished: verified result and significance when data exists.

Use figures only when they materially strengthen the narrative and are already available without extra provider requests, KV operations or expensive computation. Avoid duplicating prominent figures elsewhere.

If no narrative qualifies, show one concise factual editorial paragraph if useful, combining verified facts naturally. If no useful paragraph can be made, omit the briefing. Never use generic filler or unsupported predictions.

### Facts panel
- Desktop: larger briefing column alongside a compact facts panel.
- Mobile: briefing first, facts underneath.
- Compact Persian label/value rows with subtle horizontal dividers.
- No individual tiles, decorative icons or unnecessary backgrounds.
- Omit missing values.

## 8. Competition standings

Use one unified competition table.

Visible columns:
| رتبه | تیم | بازی | تفاضل | امتیاز |

Context:
- Show a five-row neighbourhood around each participating team.
- Merge overlapping or touching ranges.
- Use a discreet ellipsis when ranges are separated.
- Do not load or display intervening teams.
- Highlight participating team names and rank numbers with stronger typography and icy-blue text.
- No highlighted row background.
- Static table: no expandable rows, team-page navigation or extra controls.

Mobile:
- Keep all five columns visible.
- Optimize padding and typography.
- No horizontal scrolling or hidden columns.
- Team names must remain readable.

## 9. Team form and recent results

### Form indicators
- Five compact circular W/D/L indicators per team.
- Restrained green, grey and red semantics.
- Accessible labels; never rely on color alone.
- Non-interactive: no tooltip, click or expand.

### Layout
Desktop: two balanced columns, home team on the right and away team on the left in RTL.
Mobile: home team first, away team underneath; stack both lists, no tabs or horizontal scrolling.

### Latest five results
- Up to five available results per team.
- Compact vertical list.
- Opponent and score prominent.
- Date and competition secondary.
- W/D/L outcome.
- Link to the corresponding Match Centre page only when one exists.

### Home/away performance
Compare teams side by side for:
- Goals scored.
- Goals conceded.
- Clean sheets.

Use competition-specific data and honest sample-size labels. One shared sample-window label per team's statistics is sufficient unless a metric uses a materially different sample. Numbers remain the focus; no decorative bars or charts. Omit insufficient statistics rather than presenting zeroes or misleading values.

## 10. Venue
A compact information panel with verified stadium name, city and country. No large stadium photo, decorative background image, embedded map or external navigation link. If unavailable, follow shared resilience rules.

## 11. Weekly fixture schedule

Use a seven-day window anchored to the selected match date.

- Group fixtures under localized date headings.
- Compact broadcast-style rows: kickoff time, competition, team crests/names, central score or upcoming indicator, status where available.
- Emphasize the next 48 hours.
- Remaining days initially collapsed.
- One control: «نمایش روزهای بعد», revealing remaining days chronologically.
- No individual date expanders.
- Show available fixtures and one discreet coverage note explaining that the schedule reflects currently available data and may not include every match.
- Never say «بدون مسابقه» merely because the dataset is empty.
- Only existing cached data; no extra provider fetch.

## 12. FAQ
- Compact editorial FAQ near the bottom.
- Only genuinely useful, answerable questions.
- No fabricated or keyword-stuffed content.
- Expandable answers.
- Multiple answers may remain open briefly when a new answer opens; previously opened answers collapse after a short delay, allowing comparison without abrupt layout changes.
- No FAQPage schema solely to pursue Google FAQ rich results.

## 13. Related matches
Placed after FAQ, before Telegram promotion.

Selection priority:
1. Upcoming fixtures involving either participating team.
2. Previous meetings between the two participating teams, if available.

- One unified list, upcoming first then previous meetings.
- Maximum four matches; fewer if fewer qualify.
- No unrelated competition matches as filler.
- Compact broadcast-style rows: date/competition, crests/team names, score or upcoming indicator, status.
- Existing cached data only.

## 14. Telegram promotion
A featured promotional block immediately after related matches and before the existing global footer.

Suggested Persian headline:
«اسپورت‌سیگنال را در تلگرام دنبال کنید تا هیچ مسابقه مهمی را از دست ندهید.»

Optional supporting line:
«از مسابقات بزرگ پیش‌رو باخبر بمانید.»

Design:
- More prominent than an ordinary banner.
- Distinct but consistent dark navy/icy-blue background.
- Original football-themed illustration incorporating Telegram.
- One destination: Telegram channel; one clear CTA.
- No separate bot promotion.
- Full-width on mobile; illustration adapts above or alongside text.
- Show consistently on upcoming, live and finished Match Centre pages.
- Reuse the verified channel URL from the repository/configuration; never invent it.

## 15. Interaction and accessibility
- Gentle functional transitions for navigation, accordions and expandable schedule.
- No continuous decorative animation.
- Respect reduced-motion preferences.
- Small floating back-to-top control after meaningful downward scrolling; accessible touch target; return to hero.
- Accessible focus states and labels.
- RTL and LTR both intentional.
- Semantic status colors are never the only communication channel.
- Reuse existing loading patterns.
- Image failure uses available crests or branded placeholders without extra retries.

## 16. Shared resilience rules

Distinguish:
- Available.
- Partially available.
- Temporarily unavailable.
- Not applicable.
- Stale but usable.

Rules:
- Show stale cached data with small contextual freshness labels.
- Never imply stale data was freshly verified.
- Missing is not zero.
- Keep meaningful section identity with a discreet compact fallback when appropriate.
- Omit nonessential unavailable sections.
- Adapt layout to available content.
- No large empty cards, fake zeroes, blank charts, empty image frames or excessive warnings.
- No client retries/polling for missing data.
- One unavailable dataset must not break the whole page.

Examples:
- No scorers: keep score, omit event list.
- No venue: omit venue details.
- No HT score: omit row.
- Fewer than five results: show available count and honest sample window.
- One missing hero portrait: hide both portraits.
- Empty schedule dataset: do not claim there are no fixtures.
- Stale cached data: show it with a data-specific freshness cue where useful.

## 17. SEO and content integrity
- Preserve answer-first match context and facts table as distinct elements; reduce repeated result sentences.
- FAQs should be visible and genuinely useful; do not add FAQPage schema solely for rich results.
- SEO/schema must reflect visible verified facts.
- Partial data does not automatically mean noindex.
- No AI-specific markup.
- Never invent broadcast availability, venue details, predictions, stats, events or fixture coverage.

## 18. Engineering constraints
See `engineering-guardrails.md`. The default is zero incremental provider requests and zero incremental KV operations. Preserve SSR/cache architecture and inspect the current HEAD before implementation.
