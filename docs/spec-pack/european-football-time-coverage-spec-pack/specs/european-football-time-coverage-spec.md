# Spec: European Football Kickoff-Time Coverage

**Version:** 1.0  
**Status:** Draft for implementation  
**Reference timezone:** `Asia/Baku`  
**Default window:** 13:00–02:00 Baku time, crossing midnight

## 1. Objective

Provide a documented, consistent time range for monitoring, filtering, or presenting the usual kickoff times for major European football competitions in Baku local time. The range should remain sensible as European countries move between standard time and daylight-saving time.

## 2. Product requirement

The application should support a default **European football coverage window of 13:00–02:00 Asia/Baku**.

Interpretation:

- Earliest default start: 13:00, inclusive.
- Latest default boundary: 02:00 on the following date, exclusive for a continuous session.
- The window wraps over midnight.
- Do not hardcode different window boundaries solely because Europe changes clocks. Use the same Baku-time default year-round, and convert every fixture according to its actual kickoff instant and timezone rules.

This is a product-level operating window, not a claim that UEFA mandates these hours or that every European match must occur within them.

## 3. Competition scope

### 3.1 Baseline reference scope

Use these competitions as representative examples when checking the window:

- UEFA Champions League (UCL)
- UEFA Europa League (UEL)
- UEFA Europa Conference League (UECL)
- English Premier League
- Spanish La Liga
- Italian Serie A
- German Bundesliga
- French Ligue 1

### 3.2 Expandable scope

The application may also cover other European domestic divisions, national cups, women's competitions, qualifying rounds, youth competitions, and other UEFA competitions. The data source/configuration determines what is included; the time-window spec must not silently restrict competition scope.

### 3.3 Exhaustiveness warning

A time window alone cannot guarantee that all fixtures from every European competition are represented. Lower divisions and special fixtures may be scheduled outside the reference window. Full coverage depends on the match-data provider, configured competitions, and ingestion completeness.

## 4. Recommended coverage table

| Use case | Recommended Baku-time setting | Meaning |
|---|---:|---|
| Default recurring kickoff-time filter | 13:00–02:00 | Include kickoffs at/after 13:00 or before 02:00 on Baku's local clock. |
| One continuous football-night session | 13:00 on date D to 02:00 on date D+1 | A continuous interval of 13 hours, with the end on the following calendar date. |
| Expected quiet interval | 02:00–13:00 | Usually lower activity for mainstream European club kickoffs; not a guaranteed match-free interval. |
| Full fixture ingestion | No time-of-day exclusion | Fetch and retain all fixtures returned by configured competitions, then label any outside the recommended window if useful. |

## 5. Required behavior

1. Use `Asia/Baku` as the canonical display and user-facing filter timezone unless the user explicitly chooses another timezone.
2. Store timestamps as UTC instants or as provider timestamps with an explicit offset. Do not store an ambiguous local date/time without timezone metadata.
3. Convert each fixture to Baku local time before applying any Baku-time window rule.
4. Preserve the provider's original kickoff instant and event status.
5. Handle midnight crossing and the associated date change correctly.
6. Do not assume that European summer time always means the same UTC offset for every country. The UK and continental Europe have different offsets from UTC even when their daylight-saving periods align.
7. Avoid treating the example table in `docs/competition-kickoff-reference.md` as a complete list of all allowed times.
8. Keep full-schedule and out-of-window fixtures discoverable. The default window is guidance/filtering, not a data-ingestion deletion rule.

## 6. Non-goals

- Claiming there are absolutely no matches outside the recommended window.
- Replacing the fixture provider's actual schedules with inferred kickoff times.
- Predicting fixtures for competitions that are not included by the data provider.
- Treating every country's football association or league as following one shared schedule.
- Filtering match end-times using the kickoff-time boundaries.

## 7. User-facing wording

Preferred:

> Recommended European football kickoff window: 13:00–02:00 Baku time. This is a practical coverage range, not an absolute limit; some fixtures may occur outside it.

Avoid:

> All European matches take place between 13:00 and 02:00.

Avoid claims such as “there are absolutely no matches between 02:00 and 13:00.”

## 8. Source references

- UEFA Champions League 2026/27 regulations, Article 25: https://documents.uefa.com/r/Regulations-of-the-UEFA-Champions-League-2026/27/Article-25-Stadium-announcements-and-kick-off-times-Online
- European summer-time schedule for 2027–2031: https://eur-lex.europa.eu/eli/C/2026/1660/oj/eng
- UK clock-change dates: https://www.gov.uk/when-do-the-clocks-change
- IANA Time Zone Database: https://www.iana.org/time-zones
