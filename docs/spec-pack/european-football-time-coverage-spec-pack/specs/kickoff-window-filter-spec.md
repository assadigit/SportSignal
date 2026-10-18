# Spec: Kickoff-Time Window and Cross-Midnight Filtering

**Version:** 1.0  
**Canonical timezone:** `Asia/Baku`  
**Default recurring window:** 13:00–02:00

## 1. Why there are two interpretations

A time range from 13:00 to 02:00 crosses midnight. Applications commonly need two related but different behaviors:

1. A **recurring time-of-day filter**, which selects kickoff times within the clock-time band on any calendar date.
2. A **continuous football-night session**, which starts on one date and ends at 02:00 the next date.

Do not mix these concepts implicitly.

## 2. Recurring time-of-day filter

After converting a fixture's kickoff to `Asia/Baku`, let its local wall-clock time be `t`.

Include the fixture in the default time-of-day filter when:

```text
t >= 13:00 OR t < 02:00
```

Boundary details:

- 12:59:59 — outside the default time-of-day filter.
- 13:00:00 — included.
- 23:59:59 — included.
- 00:00:00 — included.
- 01:59:59 — included.
- 02:00:00 — outside the default time-of-day filter.

This recurring filter can select fixtures on both sides of midnight while preserving each fixture's actual calendar date in the UI.

## 3. Continuous session interval

For a session anchored to Baku local calendar date `D`, define:

```text
start = D at 13:00 Asia/Baku
end   = D + 1 calendar day at 02:00 Asia/Baku
interval = [start, end)
```

Include a kickoff when `start <= kickoffInstant < end`.

Use a timezone-aware date-time library for the construction and comparison. Since `Asia/Baku` is UTC+04:00 year-round, its current civil-time conversion is stable, but a timezone database should still be used rather than manual offset arithmetic.

## 4. Full fixture feed versus optional filter

The time window must not be the only criterion for retrieving or retaining fixtures.

Required:

- Ingest or request fixtures using the competition/date filters supported by the provider.
- Retain valid provider fixtures even when they fall outside 13:00–02:00.
- Apply the time window only to UI filtering, monitoring scope, notification scope, or a clearly named optional feature.
- If an event is outside the window, it may carry a derived label such as `outside_recommended_window`; it must not be deleted or rewritten.

If product requirements explicitly say notifications should be limited to the recommended window, apply the filter to notification delivery only and keep the fixture available elsewhere.

## 5. Local date handling

- Store/retain the true kickoff instant.
- Convert the instant to `Asia/Baku` to display the Baku date and time.
- Do not change the actual fixture date just because it belongs to a football-night session that began the previous evening.
- If a feature groups fixtures by a session date, label it clearly (for example, “Football night: Monday”) rather than silently changing the fixture's local calendar date.

## 6. Sorting

Sort fixtures by absolute kickoff instant, ascending. Do not sort only by the displayed clock string, because a list spanning midnight would otherwise order 00:30 before 21:00 incorrectly.

## 7. Invalid or missing kickoff timezone

- If the provider supplies an ISO-8601 timestamp with `Z` or an explicit offset, parse it as an instant.
- If the provider supplies a timestamp plus a valid IANA venue timezone, interpret the local date/time in that timezone.
- If neither offset nor reliable timezone is available, do not guess silently. Mark the fixture's kickoff timezone as unresolved and exclude it from Baku-time window comparisons until resolved, while keeping it visible if product policy permits.

## 8. Suggested configuration

Prefer configuration over scattering constants through the codebase:

```yaml
football_time_coverage:
  display_timezone: Asia/Baku
  default_start_local: "13:00"
  default_end_local: "02:00"
  end_boundary: exclusive
  cross_midnight: true
  apply_to_fixture_ingestion: false
  apply_to_notifications: false
```

This YAML is illustrative. Adapt to the repository's established configuration format rather than adding a new configuration system without inspecting the codebase.
