# Session: Match URL Lifecycle and Seasonal Indexing


## Objective
Implement a safe lifecycle for match detail URLs so the site does not continuously accumulate low-value indexable pages, while protecting successful historical assets.

## Required work
- Trace where match pages are created and how season/competition/match state is represented.
- Keep public page availability separate from search index eligibility and data storage deletion.
- Default: approved match pages may be indexed before and after the fixture, retaining final score and useful details through the relevant competition season.
- At season close, keep indexable pages with demonstrated ongoing GSC demand, meaningful external links, exceptional editorial value or useful historical intent. Reassess at next season close.
- Set low-value ordinary match pages to noindex after season close and remove them from sitemap/current fixture links; keep page directly accessible if data retention is inexpensive.
- Use 301 only to a genuine equivalent; use 404/410 for invalid or permanently removed pages without a replacement.
- Design the process as one bounded, idempotent, resumable seasonal batch/maintenance operation only if existing architecture needs it. No per-match cron.
- Do not delete database/provider records solely to reduce Google index count. Measure Worker CPU, KV/D1 operations and storage impact separately.

## Deliverables
- `seo-implementation/architecture/MATCH-LIFECYCLE-POLICY.md` with chosen thresholds and rationale;
- `seo-implementation/audit/MATCH-URL-CLASSIFICATION.csv` or a safe sample if full export not available;
- automated tests for indexability transitions.

## Acceptance criteria
A test fixture proves upcoming → completed → season-end ordinary noindex; marquee page retention; invalid URL response; correct sitemap removal; no robots blocking; no destructive data deletion. Resource impact is measured or explicitly unchanged.
