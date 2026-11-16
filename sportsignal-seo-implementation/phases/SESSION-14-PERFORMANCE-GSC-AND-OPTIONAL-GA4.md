# Session: Mobile Performance, GSC Monitoring and Optional GA4


## Objective
Improve mobile performance and establish measurement without exceeding the free Cloudflare plan.

## Required work
- Audit real mobile Core Web Vitals / PageSpeed evidence where accessible.
- Optimize only measured bottlenecks; preserve the existing visual design and football imagery.
- Reuse image optimization/caching patterns; avoid new runtime fetches.
- Verify Core Web Vitals and critical routes after changes.
- Establish a GSC monitoring view/report for homepage, match, selected-team, competition and date pages.
- Evaluate GA4 as optional: first check existing analytics, privacy/legal/consent setup and performance impact. Do not install it automatically if configuration/consent is unclear. Document pros/cons and request owner approval in the report if necessary.

## Acceptance criteria
Mobile checks improve or do not regress; Worker usage remains inside current free plan; monitoring plan exists; GA4 decision recorded as installed only if safe and authorized.
