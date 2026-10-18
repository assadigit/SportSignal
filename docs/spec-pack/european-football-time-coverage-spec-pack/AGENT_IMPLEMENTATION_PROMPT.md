# Agent Prompt: Implement European Football Kickoff-Time Coverage

You are working in an existing football application/repository. Implement the attached European football kickoff-time coverage requirements only after inspecting the repository's existing architecture and behavior.

## Read first

Read every file in this pack:

1. `README.md`
2. `specs/european-football-time-coverage-spec.md`
3. `specs/kickoff-window-filter-spec.md`
4. `docs/baku-timezone-and-daylight-saving.md`
5. `docs/competition-kickoff-reference.md`
6. `tests/acceptance-tests.md`

## Required workflow

1. Inspect the repository before deciding where or how to implement this feature.
2. Identify how fixture timestamps are fetched, stored, normalized, displayed, sorted, and filtered today.
3. Identify the timezone/date-time library already used by the project. Reuse it if suitable; do not add a new dependency without explaining why it is needed.
4. Summarize the relevant current implementation and any conflicts with the spec before editing code.
5. Implement the default Baku-time coverage behavior using `Asia/Baku` and the exact boundary rules in the specs.
6. Keep fixture ingestion separate from optional time-window filtering. Never discard otherwise valid fixtures just because they fall outside 13:00–02:00.
7. Preserve correct local dates when conversion crosses midnight.
8. Add or update automated tests for timezone conversion, daylight-saving differences, cross-midnight windows, inclusive/exclusive boundaries, sorting, and fixtures outside the window.
9. Run the relevant test suite, lint, and type checks that the repository supports. Report any checks that cannot be run and why.
10. Update repository documentation in its existing style and location. Avoid duplicating documents if equivalent docs already exist; reconcile them carefully.

## Constraints

- Do not assume the language, framework, directory layout, or test runner before inspecting the repository.
- Do not refactor unrelated features or redesign the UI unless implementation requires a minimal UI change.
- Do not hardcode seasonal clock-change dates or use fixed-hour arithmetic when timezone-aware conversion is available.
- Do not represent 13:00–02:00 as an official UEFA rule or as a guarantee covering every European fixture.
- Do not silently hide or delete out-of-window fixtures from full schedule views.
- Do not overwrite unrelated work, reset other agents' changes, or revert commits you did not create.
- If other agents are working in parallel, inspect the latest repository state and avoid conflicts. Do not assume your local branch is the only active source of changes.
- Do not deploy, push, commit, or modify production data unless the user explicitly asks for those actions.

## Final report

When finished, report:

- What files and behavior changed.
- How the Baku-time range is interpreted.
- What test commands were run and their results.
- Any remaining limitations, particularly data-provider coverage and out-of-window fixtures.
- Any assumptions you had to make after repository inspection.
