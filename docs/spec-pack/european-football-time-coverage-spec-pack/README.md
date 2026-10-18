# European Football Kickoff Time Coverage

**Documentation pack version:** 1.0  
**Prepared:** 18 October 2026  
**Primary reference timezone:** `Asia/Baku` (UTC+04:00 year-round)  
**Status:** Ready for repository review and implementation planning

## Purpose

Define a consistent, season-aware reference for the usual kickoff-time window of major European football and UEFA club competitions, displayed in Baku local time.

The recommended default is a **recurring 13:00–02:00 Baku-time window**, crossing midnight. This is a practical operational window, not a UEFA rule and not a guarantee that every European fixture will fall inside it.

## Files in this pack

- `specs/european-football-time-coverage-spec.md` — product requirements, scope, assumptions, and non-goals.
- `specs/kickoff-window-filter-spec.md` — precise time-window and cross-midnight behavior.
- `docs/baku-timezone-and-daylight-saving.md` — timezone conversion and seasonal rules.
- `docs/competition-kickoff-reference.md` — representative kickoff slots converted to Baku time.
- `tests/acceptance-tests.md` — examples and acceptance criteria for implementation and QA.
- `AGENT_IMPLEMENTATION_PROMPT.md` — prompt for a coding agent to inspect the repository and implement without assuming its architecture.

## Core decisions

1. Use the IANA timezone `Asia/Baku` for presentation and local-time filtering.
2. Keep kickoff timestamps as real instants (preferably UTC) in storage; convert for display and filtering.
3. Treat the default time band as **13:00 inclusive through 02:00 the following day exclusive** when constructing one continuous football-night session.
4. When filtering by recurring time-of-day, match kickoffs at or after 13:00 **or** before 02:00 Baku time.
5. Never discard otherwise valid fixtures merely because they fall outside the default window. The schedule provider remains the source of truth.
6. Label the range as a practical coverage recommendation, not an official universal schedule.

## Important scope limitation

“Every European league” can include many countries, divisions, cups, youth competitions, women's competitions, postponed matches, and unusual kickoff times. No fixed time interval can guarantee exhaustive coverage of all of them. The spec therefore distinguishes the normal operational window from full fixture ingestion.

## Official references

- UEFA Champions League 2026/27 regulations, Article 25: https://documents.uefa.com/r/Regulations-of-the-UEFA-Champions-League-2026/27/Article-25-Stadium-announcements-and-kick-off-times-Online
- European Union official summer-time schedule notice (2027–2031): https://eur-lex.europa.eu/eli/C/2026/1660/oj/eng
- UK government clock-change dates: https://www.gov.uk/when-do-the-clocks-change
- IANA Time Zone Database: https://www.iana.org/time-zones
