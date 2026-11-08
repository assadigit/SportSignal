# SportSignal --- Website Performance, Technical SEO & Optimization Specification

**Repository:** https://github.com/assadigit/SportSignal\
**Deployment:** Cloudflare Workers\
**Scope:** Website only --- desktop, mobile and tablet\
**Audience:** Global, multilingual\
**Execution:** Autonomous, sequential, multi-session\
**Primary goals:** Core Web Vitals, loading speed, technical and
international SEO, Google indexing, caching, bandwidth efficiency,
accessibility, security and reliability.

------------------------------------------------------------------------

## 1. Mission

Act as a senior frontend performance engineer, technical SEO specialist,
Cloudflare Workers engineer, accessibility auditor and software quality
engineer.

Audit, optimize and verify the existing SportSignal website. Improve
real-world performance, discoverability, accessibility, security and
reliability while preserving its existing design, visual identity,
content, routes and functionality.

This is an existing production application, not a redesign or rebuild.
Do not replace working features merely because another implementation
seems more convenient.

Use evidence and measurements to guide decisions. Do not promise Google
ranking improvements or treat Lighthouse scores as ranking guarantees.

## 2. Non-negotiable restrictions

### 2.1 Website only --- Telegram bot is strictly off-limits

The repository contains a website and a Telegram bot. Work exclusively
on the website.

**Never:** - Modify Telegram bot source code, handlers, commands,
messages, notifications, scheduling or workflows. - Change bot-specific
routes, API behavior, configuration, secrets, tokens or environment
variables. - Refactor shared code in a way that changes or could change
bot behavior. - Perform destructive tests or send test messages to the
production bot. - Modify bot files merely to make website tests pass.

During Phase 0, map website-only, bot-only and shared components,
including Worker entry points, routing, middleware, configuration,
bindings, environment variables and deployment behavior.

Prefer isolated website-only changes. A shared component may be changed
only when the agent can demonstrate that the change cannot alter
Telegram bot behavior. If that cannot be demonstrated, leave it
untouched, find an alternative or document the blocker.

A technically incomplete optimization is preferable to breaking the bot.

### 2.2 Preserve the website

Preserve the existing: - Branding, colors, typography and visual
identity. - Layouts, navigation, routes and content. - Responsive
behavior and existing device experience. - Animations, interactions and
user workflows. - Language selection and multilingual functionality. -
Website features and integrations.

Refactoring implementation details is allowed when justified, but
user-visible appearance and behavior must remain consistent. Do not
remove features to improve performance scores.

### 2.3 Autonomous permissions and safety

The agent is authorized to inspect and modify website-specific code,
optimize assets and dependencies, change safely isolated website
configuration, add tests and SEO resources, commit, push, deploy and
verify production without asking for approval between phases.

Autonomy does not override production safety. Never deploy an unverified
or potentially destructive change. If a change could affect the Telegram
bot, do not deploy it until safety is demonstrated.

### 2.4 Free-first approach

Prefer existing dependencies, browser-native capabilities, native
Cloudflare functionality, free Google tools and lightweight open-source
tools. Avoid paid services, unnecessary APIs, heavy third-party scripts
and unnecessary dependencies.

Google Search Console is available. Do not assume Google Analytics is
configured or accessible.

------------------------------------------------------------------------

## 3. Standards and measurable targets

### 3.1 Core Web Vitals

Use Google's good-performance thresholds:

  Metric                                     Target
  --------------------------------- ---------------
  Largest Contentful Paint (LCP)      ≤ 2.5 seconds
  Interaction to Next Paint (INP)          ≤ 200 ms
  Cumulative Layout Shift (CLS)               ≤ 0.1

Evaluate field data at the 75th percentile, segmented by mobile and
desktop where available. Test tablets separately for layout, touch
interaction and usability.

Clearly distinguish real-user field data from controlled lab
measurements. Do not claim field improvements when only Lighthouse or
lab tests were run.

### 3.2 Lighthouse objectives

Aim for: - Performance: 90--100. - Accessibility: 95--100. - Best
Practices: 95--100. - SEO: 95--100.

These are engineering objectives, not guarantees or reasons to
compromise functionality. Report actual results and explain limitations.

### 3.3 General engineering principles

Prefer measurable improvements, maintainability and native browser
capabilities. Minimize unnecessary JavaScript, main-thread work, network
requests and layout shifts. Preserve semantic HTML, browser
compatibility, progressive enhancement and search-engine accessibility.
Avoid speculative optimization and artificial Lighthouse score
manipulation.

------------------------------------------------------------------------

## 4. Persistent project documentation

Inspect existing documentation conventions before creating files. Avoid
duplicate or competing documentation systems.

Maintain:

### `WEB_OPTIMIZATION_PROGRESS.md`

-   Objectives and current phase.
-   Completed and pending phases.
-   Current implementation status.
-   Changes made and files modified.
-   Known issues, blockers and deferred work.
-   Latest commit hash and branch.
-   Production deployment reference, if applicable.
-   Verification date and next action.

### `WEB_OPTIMIZATION_AUDIT.md`

Preserve the original audit findings, baseline measurements, affected
URLs, evidence, severity and recommended fixes. Do not overwrite the
original baseline with later results.

### `WEB_OPTIMIZATION_RESULTS.md`

Record before-and-after measurements, test conditions, improvements,
regressions and remaining limitations.

Update the repository's existing changelog where appropriate. Do not
introduce multiple changelog systems.

At every phase boundary, update the progress tracker and produce a
complete, self-contained next-session prompt.

------------------------------------------------------------------------

## 5. Execution roadmap

Execute one phase per agent session, in order. Do not skip phases or
start the next phase in the same session.

  -----------------------------------------------------------------------
  Phase                   Name                    Purpose
  ----------------------- ----------------------- -----------------------
  0                       Reconnaissance          Understand repository,
                                                  architecture, isolation
                                                  and deployment

  1                       Comprehensive audit     Establish performance,
                                                  SEO, accessibility,
                                                  security and responsive
                                                  baselines

  2                       Frontend optimization   Improve CSS,
                                                  JavaScript, rendering
                                                  and dependencies

  3                       Assets and Core Web     Optimize images, fonts,
                          Vitals                  LCP, INP and CLS

  4                       Cloudflare and caching  Implement safe browser,
                                                  edge and response
                                                  caching

  5                       Technical and           Improve crawlability,
                          multilingual SEO        metadata, sitemap,
                                                  canonicalization and
                                                  hreflang

  6                       Accessibility and       Improve WCAG
                          security                conformance, browser
                                                  best practices and
                                                  website security

  7                       Final verification      Full regression,
                                                  production validation
                                                  and requirements
                                                  reconciliation
  -----------------------------------------------------------------------

The audit may reveal dependencies that justify adjusting the
implementation order. Document any adjustment and its reasoning; do not
silently skip requirements.

------------------------------------------------------------------------

## 6. Phase 0 --- Repository reconnaissance and architecture audit

**Discovery only. Do not modify application code or implement
optimizations.**

### 6.1 Repository inspection

Inspect the complete directory structure and relevant: - Package
manifests and lockfiles. - Build, development and deployment scripts. -
TypeScript and framework configuration. - Wrangler and Cloudflare
configuration. - Worker entry points, bindings and asset
configuration. - Routing and middleware. - Static assets and frontend
components. - CSS architecture and localization. - Existing SEO files
and metadata. - Tests, CI/CD and deployment workflows. - Existing
documentation.

Identify the actual framework, rendering strategy and architecture. Do
not infer them from language percentages.

### 6.2 Website architecture

Document request handling, HTML generation, static/server/client/hybrid
rendering, asset delivery, routing, navigation, data retrieval, API
dependencies, language selection, third-party resources and
service-worker/PWA behavior if present.

### 6.3 Cloudflare architecture

Inspect Worker routes, custom domains, asset bindings, cache behavior,
headers, compression, build/deployment workflow, environments and
preview deployment capability. Do not change production configuration
during reconnaissance.

### 6.4 Website/bot isolation map

Explicitly classify relevant files and components as: - Website-only. -
Telegram-bot-only. - Shared or potentially shared.

Identify every shared component that could affect bot behavior and
describe the safeguards required.

### 6.5 Phase 0 deliverables and acceptance

Produce: 1. Repository and application architecture report. 2. Website
request/rendering flow. 3. Website-versus-bot isolation map. 4.
Cloudflare and deployment workflow report. 5. Existing tests and quality
gates. 6. Technical limitations and risks. 7. Recommended phase
execution notes. 8. Initial `WEB_OPTIMIZATION_PROGRESS.md`.

Commit and push documentation changes. Do not modify application code. A
documentation-only phase does not require an unnecessary production
redeployment. Generate the complete Phase 1 session prompt. Do not begin
Phase 1.

------------------------------------------------------------------------

## 7. Phase 1 --- Comprehensive performance and SEO audit

**Audit first; do not implement speculative fixes.**

### 7.1 Performance baseline

Measure representative important routes and record: - Document response
time and TTFB. - FCP, LCP, CLS and INP where field data exists. - TBT
and Speed Index as lab diagnostics. - JavaScript execution and
main-thread workload. - CSS delivery and render-blocking resources. -
Request count and transferred bytes. - Image dimensions, formats and
sizes. - Font loading and third-party scripts. - DOM complexity and
layout/paint costs.

Identify the actual LCP element and the bottleneck on each
representative page.

### 7.2 Device coverage

Test representative viewport widths: - Desktop: 1440px and 1920px. -
Tablet: approximately 768px and 1024px. - Mobile: 360px, 390px and
430px.

Use realistic emulation and throttling. Inspect visual appearance,
usability and functionality.

### 7.3 Technical SEO

Audit: - robots.txt and XML sitemap. - HTTP status codes, redirects and
404 behavior. - Canonical URLs and meta robots. - Titles, descriptions
and heading hierarchy. - Semantic HTML and crawlable navigation. -
Internal links, broken links and orphan pages. - Duplicate content and
query-parameter variants. - Open Graph and social metadata. - Structured
data and mobile usability. - Whether important content is discoverable
without user interaction.

### 7.4 Multilingual SEO

Discover the actual supported languages and URL structure. Audit: -
Distinct crawlable URLs per language. - Reciprocal hreflang
annotations. - Self-referencing canonical URLs. - Correct
language/region tags. - x-default where appropriate. - Language-specific
titles and descriptions. - Mixed-language and duplicate pages. -
Language navigation and sitemap alternates. - Redirects or locale
detection that could prevent crawling.

Do not invent language versions or translations. Do not assume every
language exists on every route.

### 7.5 Google Search Console

If authenticated access is available, inspect: - Page indexing and
exclusion reports. - Sitemap processing. - Crawled/discovered but not
indexed URLs. - Canonical selection and crawl errors. - Core Web Vitals
and HTTPS reports. - Manual actions and security issues. - Search
performance data where meaningful.

Do not claim to have inspected Search Console if access is unavailable.
Document the limitation.

### 7.6 Accessibility and security audit

Use WCAG 2.2 AA as the target. Audit semantic structure, accessible
names, keyboard navigation, focus, contrast, forms, ARIA, screen-reader
behavior, touch targets and reduced motion.

Inspect HTTPS, security headers, CSP feasibility, external resources,
dependency vulnerabilities, exposed configuration and unnecessary public
endpoints. Do not change bot secrets or security configuration.

### 7.7 Findings and deliverables

Classify findings as Critical, High, Medium or Low. Every finding must
include problem, evidence, affected URL/component, user impact, SEO
impact where relevant, recommended fix, implementation risk and
priority.

Create `WEB_OPTIMIZATION_AUDIT.md`, preserve the original baseline and
update the progress tracker. Produce a prioritized implementation plan.
Commit and push documentation. Do not begin Phase 2 in this session.

------------------------------------------------------------------------

## 8. Phase 2 --- Frontend performance optimization

Optimize website-specific code based on Phase 1 evidence.

### CSS

Inspect unused and duplicate CSS, overrides, selectors, imports, large
stylesheets, render-blocking styles and responsive rules. Account for
dynamically generated classes and conditional states before removing
anything. Preserve the design.

### JavaScript

Inspect bundle sizes, duplicate/unused dependencies, event listeners,
long tasks, DOM updates, synchronous work, heavy initialization, polling
and third-party scripts.

Consider code splitting, deferred execution, dynamic imports, tree
shaking, event delegation and other appropriate techniques. Use Web
Workers only when justified. Do not add complexity without measurable
benefit.

### Rendering

Inspect the critical rendering path, HTML generation, above-the-fold
content, layout/paint costs, repeated rendering, hydration overhead and
client-rendering dependencies. Keep important public content
discoverable to search engines.

### Dependencies

Remove or replace dependencies only when they are genuinely unnecessary,
the replacement is lighter, behavior can be preserved and regression
testing is possible. Avoid unnecessary framework migrations.

### Acceptance

-   Existing website functionality passes regression tests.
-   No visual regressions on representative devices.
-   CSS/JS delivery or execution is measurably improved where
    applicable.
-   No new console errors or accessibility regressions.
-   Build and deployment succeed.
-   Telegram bot files, configuration and behavior remain untouched.

------------------------------------------------------------------------

## 9. Phase 3 --- Assets and Core Web Vitals

### 9.1 Images

Audit important images for format, dimensions, rendered size, file size,
compression, responsive delivery, loading priority and layout stability.

Where beneficial: - Use AVIF/WebP with suitable fallbacks. - Use
responsive `srcset` and `sizes`. - Serve appropriately sized assets. -
Lazy-load below-the-fold images. - Do not lazy-load the actual LCP
image. - Set explicit dimensions or aspect ratios. - Use
`fetchpriority="high"` only for a verified critical image.

Preserve image quality, logos, icons and brand assets.

### 9.2 Fonts

Inspect font formats, file sizes, weights, families, external requests
and layout shifts. Consider WOFF2, appropriate subsetting, removing
unused weights, local hosting and `font-display`. Preload only genuinely
critical fonts. Preserve typography.

### 9.3 LCP

Identify the actual LCP element. Investigate server response, resource
discovery, image loading, render delays, CSS and JavaScript
dependencies. Fix the real bottleneck rather than applying blanket
preload hints.

### 9.4 INP

Investigate long tasks, event handlers, unnecessary rendering,
interaction bundles and synchronous work. Preserve immediate feedback
and expected interaction behavior.

### 9.5 CLS

Investigate images without reserved dimensions, font swaps, injected
content, delayed data and unexpected expansion. Reserve layout space and
prevent unexpected movement.

### Acceptance

Demonstrate comparable before-and-after measurements. Test mobile,
desktop and tablet. Preserve functionality and visual consistency.

------------------------------------------------------------------------

## 10. Phase 4 --- Cloudflare and caching optimization

**Caching must reflect the actual architecture and freshness
requirements.**

### 10.1 Classify responses

Identify: - Static and fingerprinted assets. - HTML documents. - Public
JSON. - Dynamic match information. - User-specific or authenticated
responses. - Website API responses. - Bot-related routes and responses.

Do not apply a single policy globally.

### 10.2 Static assets

For genuinely content-hashed immutable assets, a policy such as the
following may be appropriate:

`Cache-Control: public, max-age=31536000, immutable`

Use shorter lifetimes and revalidation for non-fingerprinted assets.

### 10.3 HTML and dynamic data

Determine whether HTML can safely be cached. Consider browser cache,
edge cache, revalidation, stale-while-revalidate, deployment
invalidation and language-specific content.

Never publicly cache personalized, authenticated, sensitive or
request-dependent responses.

SportSignal contains time-sensitive sports information. Identify
freshness requirements for schedules, countdowns, live status and
scores. Avoid stale match information caused by excessive caching.

### 10.4 API caching

Cache only responses safe to share and valid for the intended TTL.
Evaluate Cache-Control, ETag, Last-Modified, conditional requests, TTL,
cache keys, query parameters, language variation, freshness and
invalidation.

### 10.5 Cloudflare-specific behavior

Inspect the current platform capabilities and configuration. Do not
assume Workers Cache API, other Workers caching behavior and zone-level
CDN caching are interchangeable.

Verify the selected mechanism works with the existing Worker
architecture. Avoid changes to bot routes or bot-specific cache
policies.

### 10.6 Compression and transport

Verify Brotli or other supported compression, avoid redundant
compression and inspect unnecessary redirects and resource hints.

### 10.7 Verification and acceptance

Use real HTTP requests to verify headers, cache status/HIT/MISS where
applicable, revalidation, fresh content after updates, language
isolation and absence of cross-user cache leakage.

Acceptance requires appropriate static caching, fresh dynamic data,
working invalidation, no public caching of private content, correct
website routes and no bot changes.

------------------------------------------------------------------------

## 11. Phase 5 --- Technical and multilingual SEO

### 11.1 Crawlability and indexability

Inspect all important public routes, status codes, robots.txt, sitemap,
canonical URLs, meta robots, internal links, redirects, duplicate
routes, crawlable navigation and JavaScript-rendered content.

Important public content must be accessible to crawlers. Do not expose
private or internal endpoints for indexing.

### 11.2 Metadata

Provide accurate, unique titles, descriptions, canonical URLs, Open
Graph titles/descriptions and suitable social preview images. Use
language-specific metadata. Avoid keyword stuffing and generic
duplicated metadata.

### 11.3 Structured data

Inspect actual content and use only genuinely applicable Schema.org
types and Google's supported structured data.

Potential types, only where justified: - WebSite. - Organization, only
when real organization details are established. - WebPage. -
BreadcrumbList, where applicable. - SportsEvent, only for pages
genuinely representing specific events with accurate event data.

Never invent ratings, reviews, organization details, locations, event
status, offers, dates or attendance. Structured data must match visible
page content. Validate it with appropriate tools.

### 11.4 Multilingual implementation

For each existing language version: - Use a distinct crawlable URL. -
Provide appropriate language metadata. - Add reciprocal hreflang
references. - Use self-referencing canonical URLs. - Include valid
language alternatives in sitemaps. - Ensure language navigation works. -
Keep translated metadata accurate. - Avoid mixed-language pages.

Use valid BCP 47 language/region tags. Do not assume every language
exists for every page. Do not force users or crawlers into one language
through IP-based redirects.

### 11.5 Sitemap and robots.txt

Sitemap must contain valid absolute canonical, indexable URLs; exclude
broken, redirected, private and noindex URLs; include appropriate
language alternatives; and update when pages change.

robots.txt must not block important pages or resources required for
rendering. Include the correct sitemap location. Remember robots.txt is
not access control.

### 11.6 Internal linking and Search Console

Fix broken links, redirect chains and orphaned indexable pages. Improve
discoverability without changing the visual design.

Use Search Console to verify sitemap processing, indexing, canonical
selection, crawl errors, page experience and search performance where
access exists. Request indexing when appropriate, but do not claim that
a request guarantees indexing.

### Acceptance

SEO resources are valid, language variants are discoverable, structured
data is accurate, and important public pages remain accessible to
Googlebot.

------------------------------------------------------------------------

## 12. Phase 6 --- Accessibility, security and best practices

### 12.1 Accessibility

Target WCAG 2.2 AA. Improve semantic HTML, heading hierarchy, landmarks,
keyboard access, focus indicators/order, accessible names, form labels,
contrast, screen-reader compatibility, touch targets, responsive
scaling, reduced motion and error identification.

Preserve the visual design. Prefer native semantic HTML over unnecessary
ARIA.

### 12.2 Security

Review website-specific: - HTTPS and HSTS where appropriate. -
X-Content-Type-Options. - Referrer-Policy. - Permissions-Policy. -
Content-Security-Policy. - Frame protection. - External script
policies. - Dependency vulnerabilities. - Information leakage.

Implement CSP carefully after identifying inline scripts, external
resources and required connections. Do not blindly break existing
features with an overly restrictive policy. Never expose secrets or
change Telegram bot security settings.

### 12.3 Browser best practices

Check console errors, failed requests, broken images/navigation, invalid
HTML, deprecated APIs, unhandled promise rejections, unexpected
redirects and third-party failures.

### Acceptance

No significant new accessibility, security or browser compatibility
regressions. Test all changes against the existing website.

------------------------------------------------------------------------

## 13. Phase 7 --- Comprehensive final verification

### 13.1 Functional regression

Test important website routes, navigation, language switching,
interactive components, match interfaces, countdowns, data loading,
error handling, responsive layouts and website-specific API
interactions.

Do not test the Telegram bot through production interactions or modify
its code.

Verify no bot-specific files/configuration/behavior were changed during
the project.

### 13.2 Device verification

Repeat desktop, tablet and mobile tests. Inspect layout, overflow, touch
interaction, typography, navigation, image rendering, loading and visual
stability.

### 13.3 Performance comparison

Repeat Lighthouse and browser performance tests under conditions
comparable to the original baseline.

Report original and final scores, absolute or percentage changes, field
Core Web Vitals where available, lab results, bottlenecks and
limitations. Never fabricate field data.

### 13.4 SEO verification

Verify robots.txt, sitemap, canonical URLs, hreflang, metadata,
structured data, status codes, redirects, indexability and Search
Console status where access exists.

### 13.5 Production verification

After final deployment, verify production response, important URLs,
headers, assets, language versions, caching, console errors and
regressions. A successful build alone does not prove production success.

### 13.6 Requirements reconciliation

Review this entire specification. Create a requirement-by-requirement
checklist using: - COMPLETED - PARTIALLY COMPLETED - NOT COMPLETED -
BLOCKED - NOT APPLICABLE

Every incomplete item requires an explanation. Never mark a requirement
complete without evidence.

### 13.7 Final report

Include: 1. Executive summary. 2. Original baseline. 3. Final
performance results. 4. Core Web Vitals comparison. 5. Technical and
multilingual SEO changes. 6. Accessibility and security improvements. 7.
Caching changes. 8. Device compatibility. 9. Regression results. 10.
Search Console findings and access limitations. 11. Outstanding issues
and deferred recommendations. 12. Commit history and deployment
references. 13. Final requirements checklist.

------------------------------------------------------------------------

## 14. Git, deployment and production safety

### 14.1 Before modifying files

Check current branch, working tree, uncommitted changes and user-owned
work. Inspect the current deployment baseline and confirm files are
within website scope.

Never reset, force-push, discard or overwrite unrelated user changes.

### 14.2 Incremental commits

Make focused changes and avoid enormous mixed-purpose commits. Follow
existing repository conventions.

Example messages: -
`docs: add website architecture and isolation audit` -
`perf: optimize critical CSS delivery` -
`perf: reduce unnecessary frontend JavaScript` -
`perf: optimize responsive image delivery` -
`perf: improve website cache policies` -
`seo: improve multilingual canonical and hreflang` -
`a11y: improve keyboard navigation and semantics`

### 14.3 Before pushing

Run applicable build, lint, type checks, unit/integration tests, website
regression tests and static analysis. Review the full diff. Confirm that
no Telegram bot files, secrets, configuration or behavior have been
changed.

### 14.4 Push, deploy and verify

After each successfully completed phase: 1. Commit changes. 2. Push to
the intended GitHub branch. 3. Confirm the push succeeded. 4. Deploy
production when application code, assets or runtime configuration
changed. 5. Verify the actual production deployment. 6. Record commit
hash and deployment reference.

Use the repository's existing Cloudflare workflow. Do not introduce a
second deployment mechanism unnecessarily.

Documentation-only phases require commit and push, but not an
unnecessary production redeployment.

Preview deployments may be used for pre-production verification if
available, but the authorized workflow is autonomous production
deployment after successful phase verification.

If deployment fails, investigate and resolve it before marking the phase
complete. If rollback is needed, use the safest available mechanism and
document it.

A deployment that includes an unchanged bot artifact may be acceptable
only when the agent has established that website changes cannot alter
bot behavior. Any uncertainty about shared behavior is a blocker.

------------------------------------------------------------------------

## 15. Mandatory multi-session handoff

Execute **one phase per session**. Do not automatically start the next
phase after completing the current one.

At the end of every phase: - Confirm objectives and acceptance
criteria. - Run relevant tests. - Confirm no new regressions. - Confirm
Telegram bot untouched. - Review Git diff. - Commit and push. - Deploy
and verify when application changes require it. - Update progress
tracker and changelog where appropriate. - Record incomplete work and
blockers. - Generate the next-session prompt.

### 15.1 Next-session prompt requirements

The prompt must be self-contained and ready to paste into a new agent
session. Include: 1. Repository URL and project identity. 2. Absolute
website-only and bot-protection rules. 3. Master specification and
progress-tracker filenames. 4. Completed phases and current status. 5.
Previous changes and modified files. 6. Latest commit hash and branch.
7. Deployment reference, if applicable. 8. Tests performed and results.
9. Known issues, blockers and deferred work. 10. Exact next phase and
its objectives/acceptance criteria. 11. Instruction to inspect current
Git state first. 12. Instruction to read the master specification and
tracker before acting. 13. Instruction not to repeat completed work. 14.
Instructions to commit, push, deploy and verify autonomously.

Do not provide a generic handoff such as "Continue with Phase 3."
Provide all operational context required to resume safely.

### 15.2 End-of-session report format

Use:

**Phase completed:** Number and name.\
**Work performed:** Specific changes and files.\
**Results:** Measurements, tests and findings.\
**Git:** Branch, commit hash and push status.\
**Deployment:** Status, reference and production verification.\
**Telegram bot protection:** Explicitly confirm: "NO Telegram bot files,
configuration or behavior were modified."\
**Outstanding issues:** Incomplete or deferred work.\
**Progress:** Completed and remaining phases.\
**Next-session prompt:** Complete copy-paste-ready prompt in a clearly
separated code block.

------------------------------------------------------------------------

## 16. Decision-making rules

1.  Evidence before implementation.
2.  Audit before optimization.
3.  Baseline before improvement.
4.  Small changes before large refactors.
5.  Test before deployment.
6.  Verify after deployment.
7.  Preserve existing behavior.
8.  Protect the Telegram bot absolutely.
9.  Prefer native Cloudflare capabilities.
10. Avoid unnecessary dependencies.
11. Avoid artificial Lighthouse optimization.
12. Never fabricate measurements.
13. Never claim ranking/indexing improvements without evidence.
14. Document important decisions.
15. Never silently skip requirements.
16. Never declare a phase complete while mandatory acceptance criteria
    remain unverified.
17. Never introduce a risky change just to finish a phase.
18. If a requirement is inapplicable, explain why.
19. If a measurement or access method is unavailable, state the
    limitation.
20. If a safe website-only implementation is impossible, leave the risky
    shared component untouched and document the blocker.

------------------------------------------------------------------------

## 17. Starting instructions

Begin with **PHASE 0 --- Repository reconnaissance and architecture
audit only**.

Your first actions: 1. Inspect repository and Git state. 2. Understand
the complete application architecture. 3. Identify the actual framework
and rendering strategy. 4. Map website and Telegram bot boundaries. 5.
Identify shared infrastructure and deployment risks. 6. Inspect
Cloudflare configuration and deployment workflow. 7. Identify existing
tests and quality gates. 8. Produce architecture and isolation
documentation. 9. Create/update the persistent progress tracker. 10.
Commit and push Phase 0 documentation. 11. Do not modify application
code. 12. Generate the complete Phase 1 session prompt. 13. Stop. Do not
start Phase 1 in this session.

## Final principle

The goal is not merely a high Lighthouse score. The goal is a genuinely
faster, more discoverable, accessible, efficient and reliable
SportSignal website that preserves its identity and functionality.

**Improve the website. Preserve the existing experience. Do not touch
the Telegram bot.**
