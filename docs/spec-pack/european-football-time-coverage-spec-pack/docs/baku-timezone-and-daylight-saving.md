# Documentation: Baku Timezone and European Daylight Saving

**Canonical Baku timezone:** `Asia/Baku`  
**Baku offset:** UTC+04:00 year-round under the current rules

## 1. The key rule

Do not implement football kickoff times by adding one fixed number of hours to every European fixture. Convert the actual kickoff instant to `Asia/Baku` using a timezone database.

Europe uses multiple timezones. The UK and continental Europe may change clocks on the same dates, but their UTC offsets remain different.

## 2. Representative UTC offsets and Baku conversion

| Source timezone/abbreviation | Typical UTC offset in European summer time | Typical Baku display difference | Typical UTC offset in European winter time | Typical Baku display difference |
|---|---:|---:|---:|---:|
| UK: BST / GMT | BST UTC+01:00 | Add 3 hours | GMT UTC+00:00 | Add 4 hours |
| Central Europe: CEST / CET | CEST UTC+02:00 | Add 2 hours | CET UTC+01:00 | Add 3 hours |
| Eastern Europe: EEST / EET | EEST UTC+03:00 | Add 1 hour | EET UTC+02:00 | Add 2 hours |

These offsets are representative for the listed regions, not a complete map of every European country. Some countries do not use daylight saving time, and rules may change.

## 3. UEFA Champions League example

The 2026/27 UEFA Champions League regulations say league-phase matches are generally scheduled at 21:00 CET, with designated fixtures at 18:45 CET; exceptions are possible. In practical European wall-clock scheduling, these are the familiar 21:00 and 18:45 Central European slots.

Converted to Baku wall-clock time:

| Central European local kickoff | During CEST (UTC+02:00) | During CET (UTC+01:00) |
|---|---:|---:|
| 18:45 | 20:45 Baku | 21:45 Baku |
| 21:00 | 23:00 Baku | 00:00 next day in Baku |

The `00:00` example falls on the next calendar day in Baku. Preserve the actual converted date.

## 4. UK Premier League example

A 20:00 UK local kickoff converts as follows:

| UK local time | Baku kickoff |
|---|---:|
| 20:00 BST (UTC+01:00) | 23:00 same day |
| 20:00 GMT (UTC+00:00) | 00:00 next day |

This is a representative late midweek slot, not a promise that every Premier League match uses it.

## 5. Seasonal clock changes

In the UK, clocks generally move forward on the last Sunday in March and back on the last Sunday in October. The EU's official notice lists these dates for 2027–2031:

| Year | Summer time begins | Summer time ends |
|---|---|---|
| 2026 | 29 March | 25 October |
| 2027 | 28 March | 31 October |
| 2028 | 26 March | 29 October |
| 2029 | 25 March | 28 October |
| 2030 | 31 March | 27 October |
| 2031 | 30 March | 26 October |

Use this table as explanatory documentation only. Production logic should rely on IANA timezone data rather than hardcoding these dates. Check the timezone database and official sources when updating this document.

## 6. Recommended technical approach

1. Parse the fixture kickoff as an instant, preferably from an ISO-8601 timestamp with `Z` or an explicit offset.
2. Store it in UTC or as an equivalent timezone-aware instant.
3. Render the instant in `Asia/Baku` when displaying kickoff time.
4. Apply 13:00–02:00 coverage logic only after conversion to Baku local time.
5. Preserve both the instant and the converted Baku date/time for downstream display/debugging if useful.
6. Never infer the source timezone solely from the club's country if the fixture provider already supplies an offset or timezone.

## 7. References

- UEFA Champions League 2026/27 regulations, Article 25: https://documents.uefa.com/r/Regulations-of-the-UEFA-Champions-League-2026/27/Article-25-Stadium-announcements-and-kick-off-times-Online
- EU official summer-time schedule notice, covering 2027–2031: https://eur-lex.europa.eu/eli/C/2026/1660/oj/eng
- UK government clock-change dates: https://www.gov.uk/when-do-the-clocks-change
- IANA Time Zone Database: https://www.iana.org/time-zones
