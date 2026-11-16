# GSC Snapshot and SEO Audit Baseline — 15 November 2026

## Source files

Original file: `reference/sportsignal.ir-GSC-11-15.zip` (included unchanged). Website screenshot: `reference/homepage-screenshot.png`.

GSC property in export: `sportsignal.ir`. Search type: Web (text-based). Export filter label: Last 3 months. Export snapshot date: 15 November 2026.

## Data completeness warning

The export does **not** provide a complete three-month daily performance series. `Chart-2.csv` contains 35 daily rows from 10 October through 13 November 2026. The last 28 full days available in that chart are 17 October–13 November 2026.

The row totals from Queries, Pages, Countries and Devices do not reconcile. Treat each report as a separate, partial export; do not sum them into a single site total or infer a missing-query distribution.

- Chart-2 (daily performance) 28-day sum: 239 clicks, 9,301 impressions, 2.57% CTR.
- Queries.csv: 375 visible query rows, 23 clicks and 4,289 impressions across those rows. Query tables may omit anonymized queries and export only top rows.
- Pages.csv: 413 visible URL rows, 251 clicks and 9,699 impressions across those rows.
- Countries.csv and Devices.csv: each sum to 250 clicks and 9,465 impressions.

## Daily trend from available chart

| Period | Days | Clicks | Impressions | CTR | Impressions/day | Clicks/day |
|---|---:|---:|---:|---:|---:|---:|
| 12–24 Oct 2026 | 13 | 89 | 2,284 | 3.90% | 175.7 | 6.85 |
| 25 Oct–6 Nov 2026 | 13 | 89 | 4,222 | 2.11% | 324.8 | 6.85 |
| 7–13 Nov 2026 | 7 | 72 | 2,959 | 2.43% | 422.7 | 10.29 |

Interpretation: impressions/day increased across the observed periods. Clicks/day increased in the final week. This is an encouraging early visibility signal, not evidence of long-term trend or a confirmed ranking improvement. The filter says Last 3 months, but daily data is only 35 days.

## Page-type aggregation from Pages.csv

| Page type | URLs | Clicks | Impressions | CTR from rows |
|---|---:|---:|---:|---:|
| Match detail pages (`/matches/{slug}`) | 268 | 213 | 6,611 | 3.22% |
| Matches hub (`/matches`) | 1 | 3 | 100 | 3.00% |
| Team pages (`/teams/{slug}`) | 127 | 16 | 2,456 | 0.65% |
| Competition pages (`/competitions/{slug}`) | 6 | 6 | 161 | 3.73% |
| Homepage | 1 | 8 | 267 | 3.00% |
| Other URLs | 10 | 5 | 104 | 4.81% |

Important finding: 127 team URLs generated only 16 clicks from 2,456 impressions (0.65% CTR). The owner's decision is now to keep dedicated, indexable team pages only for manually selected clubs, not all teams in the football data provider.

Match-detail pages are the primary source of page-row clicks. Keep the current fairly complete match page experience; first fix targeting, eligibility, metadata, canonical/indexing and lifecycle. Do not add generic filler content.

## Useful GSC query signals (exact query examples)

| Query | Clicks | Impressions | Avg position |
|---|---:|---:|---:|
| بازی بعدی بارسا | 0 | 179 | 9.97 |
| بازی بعدی بارسلونا | 0 | 105 | 9.99 |
| بارسلونا مقابل منچستر سیتی 2026 | 6 | 103 | 3.25 |
| تاریخ بازی بارسلونا و منچستر سیتی | 2 | 20 | 3.70 |
| بازی بارسلونا و منچستر سیتی کی است | 0 | 17 | 6.06 |
| بازی بعدی بایرن مونیخ | 0 | 37 | 7.49 |
| بازی بعدی لیورپول | 0 | 24 | 7.21 |
| بازی بعدی آرسنال | 0 | 14 | 9.14 |
| برنامه بازی های لیگ قهرمانان اروپا | 0 | 14 | 9.36 |
| آتالانتا مقابل کایرات | 0 | 329 | 12.36 |
| موناکو مقابل نورشلان | 1 | 244 | 12.82 |
| منچستر یونایتد مقابل آ اس رم | 0 | 210 | 12.35 |

These are actual strings in the supplied GSC query export, but their impressions are **site impressions**, not market-wide search volumes. Some matchup queries may relate to a one-off fixture that is not appropriate for a future URL unless it passes SportSignal's editorial match-selection rules.

## Useful page examples

| URL | Clicks | Impressions | CTR | Position |
|---|---:|---:|---:|---:|
| `/matches/barcelona-vs-manchester-city-2026-12-08` | 39 | 477 | 8.18% | 3.62 |
| `/matches/paris-saint-germain-vs-barcelona-2026-10-20` | 35 | 854 | 4.10% | 7.06 |
| `/matches/real-madrid-vs-rb-leipzig-2026-10-21` | 19 | 388 | 4.90% | 9.82 |
| `/matches/tomorrow` | 18 | 218 | 8.26% | 6.72 |
| `/matches/barcelona-vs-aston-villa-2026-11-03` | 17 | 175 | 9.71% | 6.56 |
| `/teams/barcelona` | 4 | 564 | 0.71% | 9.36 |
| `/teams/real-madrid` | 3 | 178 | 1.69% | 7.55 |
| `/matches/atalanta-vs-kairat-almaty-2026-11-05` | 2 | 351 | 0.57% | 12.09 |
| `/matches/manchester-united-vs-roma-2026-11-03` | 2 | 283 | 0.71% | 11.05 |

Do not alter successful URLs or page templates blindly. `/matches/tomorrow` has demonstrated value and must remain a useful persistent page with an honest empty state when there are no selected fixtures.

## Device and country

- Mobile: 237 clicks, 9,145 impressions, 2.59% CTR (from Devices.csv).
- Desktop: 9 clicks, 197 impressions, 4.57% CTR.
- Tablet: 4 clicks, 123 impressions, 3.25% CTR.
- Iran: 248 clicks, 8,774 impressions, 2.83% CTR (from Countries.csv).

Mobile accounts for 94.8% of the device-report clicks and 96.6% of its impressions. Iran is the dominant observed country. This supports mobile-first implementation and Persian-first prioritization, while retaining English SEO work in parallel.

## Indexing snapshot

`Chart.csv` latest snapshot date: 9 November 2026.

- Indexed: 659.
- Not indexed: 237.

The separate critical-issues report shows:

| Reason | URLs |
|---|---:|
| Not found (404) | 159 |
| Excluded by noindex | 34 |
| Crawled – currently not indexed | 32 |
| Discovered – currently not indexed | 10 |
| Blocked by robots.txt | 1 |
| Page with redirect | 1 |
| Server error (5xx) | 0 |

Do not treat all 404s as defects. Classify each URL by whether it is a real match, invalid/duplicate, internally linked, present in a sitemap, or has a relevant replacement. No bulk redirects.

A separate Critical issues CSV reports 13 items with `Missing field 'location'`. The originating enhancement/schema type is not stated in the exported snippet; do not assume it is Event markup until the report details and page HTML identify the source.

## Missing reports / unverified items

Not included in the supplied export:
- full sitemap submission/processing details;
- robots.txt content;
- Core Web Vitals report;
- HTTPS report;
- Manual Actions report;
- Security Issues report;
- exact affected URLs for indexing reasons;
- detailed examples for the `location` structured-data error;
- complete live HTML/source review.

`Metadata.csv` says `Sitemap: All known pages`; this does not provide the actual XML sitemap list or confirm successful sitemap processing.

## Audit implications

1. Protect match detail pages that already attract clicks.
2. Review team indexability and keep only manually selected clubs as indexable team pages.
3. Investigate all 159 404s by URL pattern and links; do not redirect indiscriminately.
4. Investigate 32 crawled-not-indexed and 10 discovered-not-indexed URLs against page value and template quality.
5. Inspect the 13 missing-location items before touching structured data.
6. Preserve `/matches/tomorrow` and implement a useful empty state.
7. Build the keyword strategy around long-tail next-match, matchup/date, selected team and curated fixture intent.
8. Verify current production code and GSC live reports before implementing any proposed fix.
