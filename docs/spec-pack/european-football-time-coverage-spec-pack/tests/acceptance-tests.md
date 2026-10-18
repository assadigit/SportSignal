# Acceptance Tests: European Football Kickoff-Time Coverage

These tests define expected behavior for a feature that filters or presents kickoff times using the default Baku-time window.

## A. Timezone conversion

| ID | Given | Expected result |
|---|---|---|
| TZ-01 | Fixture timestamp is supplied as an ISO-8601 instant with `Z` | Parse as an instant and render in `Asia/Baku`. |
| TZ-02 | Fixture starts at 21:00 in a Central European city while that city's timezone is on CEST (UTC+02:00) | Render as 23:00 in Baku on the same local calendar date. |
| TZ-03 | Fixture starts at 21:00 in a Central European city while that city's timezone is on CET (UTC+01:00) | Render as 00:00 in Baku on the next calendar date. |
| TZ-04 | Fixture starts at 20:00 UK local time during BST (UTC+01:00) | Render as 23:00 Baku time. |
| TZ-05 | Fixture starts at 20:00 UK local time during GMT (UTC+00:00) | Render as 00:00 Baku time on the next day. |
| TZ-06 | Source timezone/offset is missing and cannot be resolved reliably | Do not guess an offset; mark timezone unresolved and do not apply the Baku-time filter as though it were known. |

## B. Recurring time-of-day filter boundaries

Filter uses `kickoffBakuTime >= 13:00 OR kickoffBakuTime < 02:00`.

| ID | Baku kickoff time | Included by default filter? |
|---|---:|---|
| WIN-01 | 12:59 | No |
| WIN-02 | 13:00 | Yes |
| WIN-03 | 18:00 | Yes |
| WIN-04 | 23:59 | Yes |
| WIN-05 | 00:00 | Yes |
| WIN-06 | 01:59 | Yes |
| WIN-07 | 02:00 | No |

## C. Continuous session boundaries

For a session anchored on date D, interval is `[D 13:00 Asia/Baku, D+1 02:00 Asia/Baku)`.

| ID | Kickoff instant in Baku | Expected result |
|---|---|---|
| SES-01 | D at 12:59 | Excluded |
| SES-02 | D at 13:00 | Included |
| SES-03 | D at 23:59 | Included |
| SES-04 | D+1 at 00:30 | Included in the D session; retain D+1 as the fixture's actual Baku calendar date |
| SES-05 | D+1 at 01:59:59 | Included |
| SES-06 | D+1 at 02:00 | Excluded |

## D. Data integrity

| ID | Scenario | Expected result |
|---|---|---|
| DATA-01 | Valid fixture kickoff is 12:15 Baku time | Fixture remains in storage/full schedule even if excluded from the default window. |
| DATA-02 | Valid fixture kickoff is 02:30 Baku time | Fixture remains in storage/full schedule; it is outside the recommended window. |
| DATA-03 | Two fixtures occur at 21:00 and 00:30 over midnight | Sort by actual kickoff instant, not by time string alone. |
| DATA-04 | One fixture is outside the window but belongs to a configured competition | Do not delete, mutate, or silently hide it from unfiltered schedule views. |
| DATA-05 | European daylight-saving clock changes occur | The fixture conversion uses timezone database rules; no manually hardcoded seasonal offset is required. |

## E. User-facing language

| ID | Scenario | Expected result |
|---|---|---|
| UX-01 | Showing the recommended range | Wording clearly says “recommended” or “typical” and identifies Baku time. |
| UX-02 | Describing 02:00–13:00 | Describe as a generally quieter interval, not an absolutely match-free interval. |
| UX-03 | Displaying a fixture whose Baku time crosses midnight | Show its actual Baku date and time correctly. |

## Definition of done

- All tests above pass or are mapped to existing automated tests that provide equivalent coverage.
- Window constants/configuration are not scattered across the codebase.
- Tests cover both DST and standard-time examples.
- Full fixture ingestion is not restricted to the default time window.
- Documentation clearly states the difference between a recurring time-of-day filter and a continuous session.
