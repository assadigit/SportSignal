# Keyword Research — 200 Phrase Bank

## Executive result

The attached `keyword-bank-200.csv` contains **exactly 200** curated phrases:

- Persian: 180
- English: 20
- Long-tail: 78
- Mid-tail: 115
- Short-tail: 7
- Exact strings observed in supplied GSC query export: 70
- Semantic expansion / English candidates without verified volume: 130

This is an **initial target bank**, not a claim that all 200 phrases have verified monthly search volume. No search-volume or keyword-difficulty number has been invented.

## Evidence levels

1. **GSC observed (exact query string):** exact phrase appears in the supplied `Queries.csv`. The CSV preserves that phrase's actual clicks, impressions, CTR and average position. These are SportSignal Search Console metrics only, not total Google market volume.
2. **Research candidate / semantic expansion:** a natural candidate derived from observed search intent, current SERP patterns, product scope and common query construction. It still needs validation in Google Ads Keyword Planner, Google Trends, autocomplete/SERP checks or expanded GSC data.

The public SERP review found Persian-language result patterns around «برنامه بازی‌های امشب لیگ قهرمانان اروپا»، next-match pages for specific clubs, and general fixtures/score services. See `SOURCE-RESEARCH.md`. These sources confirm query/topic patterns and competing page types, but do not provide independent keyword volumes.

## Search-intent clusters

| Cluster | Main intent | Best destination |
|---|---|---|
| Core discovery | Find important/interesting European games | Homepage |
| Today / tomorrow / this week | Discover selected fixtures by date | Existing date pages; persistent `/matches/tomorrow` |
| Selected club next match | Find when a chosen club plays next | Selected club page |
| Matchup/date | Find date, kickoff or result for a known pairing | Approved match detail page |
| Champions League / cups | Discover important UCL and knockout fixtures | UCL or approved competition page; match detail |
| Domestic leagues / derbies | Discover curated games in the five covered leagues or major rivalries | Homepage / competition page / match detail |
| English parallel SEO | Equivalent English-language discovery intent | Existing English equivalent page |

## Prioritization rules

- P1: directly supported by GSC impressions and strong product fit, or a very close high-value long-tail intent.
- P2: relevant, realistic query candidate requiring more validation or serving as secondary wording.
- P3: broad/competitive query, speculative demand, or lower near-term fit.

Priority is not keyword difficulty. It reflects product fit and early SEO opportunity.

## Important mapping rules

- Do not create one URL per phrase. Many variants map to the same page.
- All team-specific terms map only to team URLs for clubs on the manually selected club allowlist.
- Do not create a match URL for every possible pairing. A match page is allowed only when the match meets the editorial selection rules (selected club, independently important table/title race, major derby/rivalry, or important knockout tie).
- Query patterns about live scores, live status, TV/broadcast availability, betting, or lineups are outside the current product promise and should not be targeted unless the owner later adds the capability.
- The five domestic leagues are Premier League, La Liga, Serie A, Bundesliga and Ligue 1. UEFA Champions League has the highest editorial priority, even though domestic league sections are displayed before the Champions League section in the homepage list.
- The homepage should target the product's curated discovery proposition, not pretend to be a full schedule for every league/team.

## Required Session 2 validation by the agent

The agent must conduct a second, repository-aware keyword research phase before implementing keyword-driven changes:

1. Re-export/query all available Search Console data (prefer 16 months where accessible), with date, country, device, query and landing-page dimensions. Retrieve query/page combinations when available; distinguish privacy-suppressed queries.
2. Confirm the actual selected-club allowlist by reading the repo/config/admin source. Never assume every team appearing in the fixture provider is selected.
3. For each keyword cluster, inspect the current Persian Google SERP for Iran and the English SERP for the geographies with evidence in GSC. Do not choose a target country for English pages without evidence; document default test locales.
4. Use Google Ads Keyword Planner if an authorized account is available, with primary market Iran and Persian language for Persian terms. For English terms, evaluate countries separately rather than blending global estimates. Record volume ranges, date, location, language, network and source. If unavailable, say “volume unavailable”; do not use invented estimates.
5. Use Google Trends or Google autocomplete / related-search observations where available. Save date, locale, query and screenshot/export/source for repeatability.
6. Review top competitors only to understand intent and page format; do not clone their full-coverage/live-score positioning. Competitor examples found in initial SERP review include ScoreYab and Soot360.
7. Cluster synonyms and variants, detect intent overlap/cannibalization, and assign one primary URL target per cluster.
8. Produce a ranked final keyword map with evidence, priority, target URL, page type, language, intent, and explicit exclusion reason for irrelevant terms.
9. Keep the original 200-row bank as the seed list. Add/remove phrases only with documented evidence and preserve the original bank in version history.

## Deliverables from Session 2

- `keyword-research/KEYWORD-VALIDATION-REPORT.md`
- `keyword-research/VALIDATED-KEYWORD-MAP.csv`
- `keyword-research/SERP-SAMPLES.md`
- Updated `keyword-bank-200.csv` only if changed with reasons and provenance.

## Keyword metrics rules

- GSC impressions are not search volume.
- Average position is aggregated and not a fixed ranking for every user.
- Third-party volume and difficulty metrics are estimates; name the tool and date.
- Do not estimate traffic upside from volume alone. Show assumptions if scenario modelling is used.
- Do not call a term “high volume” without a source and geography/time period.
