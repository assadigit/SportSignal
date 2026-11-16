# Session: Crawl, Index, Canonical and Sitemap Foundation


## Objective
Implement only confirmed foundational crawl/indexation defects.

## Required work
- Normalize HTTP/HTTPS and host variants based on current production evidence.
- Fix incorrect canonical tags, duplicate aliases and redirect chains/loops only where verified.
- Ensure robots.txt does not block URLs whose noindex directives Google must read.
- Make XML sitemaps list only canonical, intended-to-index, 200-status URLs.
- Remove redirected, noindex, invalid and non-canonical URLs from sitemap output.
- Verify date/pagination/query parameter routes and their canonical/indexability rules from Session 3.
- Fix internal links to 404 URLs where identified.

## Deliverables
- code changes for confirmed issues;
- `seo-implementation/audit/CRAWL-INDEX-CHANGELOG.md`;
- pre/post sitemap URL counts and samples.

## Acceptance criteria
Build and tests pass; canonical, robots and sitemap behaviour verified on preview/production; no bulk redirects or mass deindexing without URL-level evidence.
