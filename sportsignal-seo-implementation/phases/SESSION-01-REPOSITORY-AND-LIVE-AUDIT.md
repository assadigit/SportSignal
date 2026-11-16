# Session: Repository, Production and Technical SEO Audit


## Objective
Inspect the existing repository, current production site, Cloudflare Worker setup and GSC property before any implementation.

## Required work
- Identify actual framework, rendering model (SSR/SSG/CSR/hybrid), routing, data provider, cache/storage, deployment branch/process, environment variables and test setup.
- Inspect Git status/branch/remotes and any concurrent work; do not overwrite it.
- Verify live homepage, match detail, selected team and competition URLs; inspect rendered HTML, response headers, canonical, robots, sitemap, metadata, JSON-LD, hreflang and mobile layout.
- Inspect exact GSC URL samples for 404/noindex/crawled-not-indexed/discovered-not-indexed if access is available. If not, record access limitation and do not infer URLs.
- Audit Worker CPU, request, KV/D1/storage, scheduled triggers and upstream provider calls. Record current baseline and known free-tier limit.
- Confirm current selected-club allowlist and competition definitions from code/config/admin; list all current team pages and match URL generation rules.
- Create a confirmed-vs-suspected issue register and risk map.

## Deliverables
- `seo-implementation/audit/REPOSITORY-AND-TECHNICAL-AUDIT.md`
- `seo-implementation/audit/URL-INVENTORY.csv`
- `seo-implementation/audit/CLOUDFLARE-RESOURCE-BASELINE.md`
- update tracker and prepare Session 2 prompt.

## Acceptance criteria
No code changes unless a minimal instrumentation or safe fix is explicitly necessary and documented. All important assumptions are either verified or marked unknown. The audit identifies the current page templates, selected-club source, routing, sitemap source and deploy workflow.
