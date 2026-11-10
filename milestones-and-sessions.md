# SportSignal Match Centre — Milestones & Chunked Session Plans

**Execution sequence:** M0 → M10  
**Session count:** 23  
**Rule:** One focused session at a time. Complete and record it before starting the next.

## A. Operating model

- A **milestone** is a coherent product increment with an acceptance gate and preview/staging deployment.
- A **session** is one bounded implementation or audit chunk with specific tests and a handoff record.
- Sessions run sequentially. Do not skip or merge sessions simply to finish faster.
- M0 is audit-only. No feature code before the owner approves the audit, branch strategy and deployment plan.
- Every completed session must be tested, audited where relevant, committed atomically and pushed to the approved feature branch.
- Every completed milestone must be deployed to an existing safe preview/staging environment and smoke-tested.
- Production is only promoted after the M10 release gate; do not expose a partially implemented page to production.

### Session completion definition
A session is complete only when its scope is implemented, relevant existing checks pass, focused tests cover positive and missing-data states, the diff is reviewed, logs are updated, an atomic commit is created and pushed, and the next session is recorded. Failed required tests must be fixed or explicitly marked as blockers; never report them as passed.

## B. Milestone map

| Milestone | Outcome | Sessions | Deployment checkpoint |
|---|---|---|---|
| M0 — Discovery & execution plan | Verified repository/data/cost/deployment audit | S00–S01 | No feature deployment |
| M1 — Page foundation | Route shell, page structure, responsive and RTL/LTR foundation | S02–S03 | Preview |
| M2 — Hero & navigation | Lifecycle hero, teams, time, sticky nav and controls | S04–S06 | Preview |
| M3 — Summary & editorial system | Facts panel, deterministic narrative engine and copy | S07–S09 | Preview |
| M4 — Standings | Unified standings table and context windows | S10–S11 | Preview |
| M5 — Form & recent results | W/D/L, latest results and performance comparison | S12–S13 | Preview |
| M6 — Venue & schedule | Verified venue panel and seven-day fixtures | S14–S15 | Preview |
| M7 — FAQ & related matches | Useful FAQs and relevant related fixtures | S16–S17 | Preview |
| M8 — Telegram promotion | Featured channel promotion | S18 | Preview |
| M9 — Integration & quality | Resilience, SEO, accessibility, regression and cost audit | S19–S20 | Release-candidate preview |
| M10 — Release & verification | Production readiness, deploy and post-deploy checks | S21–S22 | Production gate |

## C. Session plans

## M0 — Discovery and execution plan

### S00 — Session bootstrap, repository safety and product reconciliation
**Goal:** Establish baseline without changing feature code.

Tasks:
- Read the complete package and inspect all visual references.
- Inspect `git status`, current branch, HEAD, recent relevant commits and local changes.
- Identify existing branch, commit, CI and deployment conventions.
- Identify whether other agents or automations are editing the same repository.
- Identify current Match Centre route and likely code ownership.
- Record available lint/typecheck/test/build scripts by inspecting project files; do not guess commands.

Audit/tests:
- Record baseline branch, commit SHA and working-tree status.
- No production mutation, no deployment, no provider/KV load tests.

Deliverables:
- Start `MATCH-CENTRE-IMPLEMENTATION-AUDIT.md`.
- Initialize `MATCH-CENTRE-MILESTONE-LEDGER.md`.
- Initialize `MATCH-CENTRE-EXECUTION-LOG.md`.

**Gate:** Continue to S01. No implementation.

### S01 — Architecture, data, cost and deployment audit
**Goal:** Verify what can be built from current data and determine safe deployment workflow.

Tasks:
- Trace route, SSR, data assembly and relevant components.
- Map verified fields and provenance for match, teams, competition, kickoff/timezone, score/status, scorers, standings, form, venue, similar matches, FAQ and Telegram channel URL.
- Trace cache/freshness semantics and failure behaviour.
- Identify provider calls, KV reads/writes, subrequests, CPU-sensitive parsing and payload sizes on this route.
- Locate the dated API/data audit, if present, and verify its findings against current HEAD.
- Inspect preview/staging/production environments, branch-to-deploy mapping, bindings/secrets, smoke-test capability and rollback mechanism.
- Identify which locked requirements can be met without backend changes.

Tests/audit:
- Run only safe existing local checks; record exact commands and outcomes.
- No provider/KV stress tests or production data mutation.
- Record unknowns rather than guessing.

Deliverables:
- Complete `MATCH-CENTRE-IMPLEMENTATION-AUDIT.md`.
- File-by-file implementation plan.
- Verified branch, preview and production deployment plan with rollback details.
- Updated milestone ledger.

**M0 gate — owner approval required:** Present audit, cost/risk analysis, branch/deploy plan and proposed file changes. Wait before S02. Ask only for blockers repository inspection cannot resolve.

---

## M1 — Page foundation

### S02 — Route shell and semantic structure
**Goal:** Establish page structure without global redesign.

Scope:
- Match Centre page shell and semantic section anchors.
- Reuse global header/footer.
- Centered editorial content container.
- Existing loading/SSR conventions only.
- No new data fetching.

Tests:
- Route works for representative existing match states.
- SSR outputs useful content.
- Global header/footer remain intact.
- No unrelated route regression.

Commit/push: one atomic shell commit after checks pass.

### S03 — Responsive, spacing and RTL/LTR foundation
**Goal:** Apply existing design system to responsive Match Centre composition.

Scope:
- Existing typography, tokens, components and breakpoints reused.
- Native Persian RTL; deliberate English LTR adaptation.
- Adaptive two-column/one-column structure and adaptive spacing.
- Avoid hard-coded dimensions until actual content and repo conventions are inspected.

Tests:
- Mobile, intermediate and desktop screenshots.
- Long Persian team/competition names.
- Overflow, wrapping, focus and layout stability.
- Existing build/lint/type checks.

**M1 gate:** Review diff/screenshots; deploy preview; smoke-test SSR, route, header/footer and unrelated navigation. Record URL, deployment ID, commit SHA and test evidence.

---

## M2 — Hero and navigation

### S04 — Hero identity and lifecycle
**Goal:** Implement competition/team/score hierarchy.

Scope:
- Compact competition header.
- Home team right, away team left in RTL.
- Balanced teams; subtle «میزبان» / «میهمان» labels.
- Central scoreboard.
- Upcoming, live and finished variants.

Tests: all three states, missing competition crest/name, missing team crest/name, no empty frames or invented facts.

### S05 — Portrait fallback, timezone and date
**Goal:** Implement both-or-neither portraits and localized kickoff information.

Scope:
- Existing portrait source only.
- If either portrait is missing or fails, hide both.
- On mobile, both portraits side-by-side above the scoreboard.
- Visitor-local timezone, 24-hour time, localized full date.

Tests: both/one/neither portrait; image error; local midnight crossover; Persian/English numeral formatting; verify no extra provider requests or retries.

### S06 — Sticky navigation and back-to-top
**Goal:** Complete navigation interactions.

Scope:
- Five destinations only: خلاصه، جدول، فرم، بازی‌ها، ورزشگاه.
- Sticky horizontal navigation; native RTL scrolling.
- Active section tracking, immediate active state and smooth scroll with correct offset.
- Small floating back-to-top after meaningful scroll.
- Reduced-motion support.

Tests: keyboard/focus, manual selection, scroll tracking, sticky offset, reduced motion, mobile/desktop.

**M2 gate:** Lifecycle + navigation matrix passes; preview deployment and smoke tests completed.

---

## M3 — Summary and editorial system

### S07 — Facts panel and editorial layout
**Goal:** Build open editorial briefing/facts composition.

Scope:
- No repeated Summary heading before briefing.
- Desktop briefing beside compact facts panel; mobile briefing first.
- Persian label/value rows with dividers; omit missing facts.

Tests: complete and partial facts, long labels/values, RTL/LTR, no empty placeholders.

### S08 — Deterministic narrative engine
**Goal:** Implement rules and eligibility logic.

Scope:
- Central category registry and global priority ranking.
- Explicit triggers, samples, exclusions and factual source fields.
- One primary narrative + optional distinct secondary.
- Stable deterministic variant selection.
- No AI, network calls or expensive per-match processing.

Tests:
- Unit tests for every trigger and boundary.
- Competing narrative priority.
- Insufficient sample and missing data.
- Stable output across repeated calls.
- Lifecycle eligibility.
- No unsupported competitive stakes or fabricated statistics.

### S09 — Persian copy and factual fallback
**Goal:** Complete manually authored copy and editorial QA.

Scope:
- Multiple natural Persian variants per supported category.
- Figures only when they materially help and are already available.
- Concise factual fallback paragraph if useful; otherwise omit.
- No generic filler or duplicate stat chips.

Tests: grammar, RTL punctuation, factual equivalence across variants, no repeated/contradictory facts; review upcoming/live/finished examples.

**M3 gate:** Provide trigger matrix and rendered examples; preview deployment; verify SSR and no extra fetch/KV work.

---

## M4 — Standings

### S10 — Standings selection/window logic
**Goal:** Implement five-row context windows from already available standings.

Scope: find each participating team's row; form neighbourhoods; merge overlap/touch; insert ellipsis between separated windows; never fetch intervening rows.

Tests: adjacent, overlapping, touching, distant, missing team, short table, no extra KV/provider calls.

### S11 — Standings presentation
**Goal:** Build agreed table.

Scope: رتبه، تیم، بازی، تفاضل، امتیاز; typography-only participant highlighting; static table; all five columns visible on mobile.

Tests: narrow mobile, long names, RTL/LTR, numeric formatting, semantic table/accessibility.

**M4 gate:** Preview deployment; verify range logic and five-column mobile fit.

---

## M5 — Form and recent results

### S12 — W/D/L indicators and latest results
**Goal:** Implement traditional form and recent-results lists.

Scope:
- Five compact, non-interactive circular W/D/L indicators.
- Accessible labels; color is not the only cue.
- Desktop side-by-side; mobile home first then away.
- Up to five actual results; link only to an existing Match Centre route.

Tests: 0–5 results, all outcomes, missing fields, link validity, keyboard/accessibility, mobile stacking.

### S13 — Home/away performance metrics
**Goal:** Numerical comparison of goals scored, goals conceded and clean sheets.

Scope:
- Competition-specific data.
- Honest shared sample label per team.
- Disclose metric-specific sample variation only when material.
- Numbers only; no decorative bars/charts.

Tests: minimum samples, unequal samples, missing vs actual zero, partial dataset, no incremental provider/KV operations.

**M5 gate:** Preview deployment; verify data provenance, sample labels and mobile layout.

---

## M6 — Venue and weekly schedule

### S14 — Venue and schedule data selection
**Goal:** Select existing cached data only.

Scope:
- Verified stadium/city/country.
- Seven-day period anchored to selected match date.
- Same-day matches; next 48 hours emphasized.
- Remaining days ready for expansion.

Tests: missing/partial venue, timezone/date boundaries, empty/partial schedule; empty data must not mean no matches.

### S15 — Schedule presentation and expansion
**Goal:** Implement daily fixture rows and one expand control.

Scope:
- Localized date headings.
- Kickoff, competition, crests/team names, score/upcoming marker and status.
- One «نمایش روزهای بعد» control.
- One discreet coverage note; no per-date expanders.

Tests: initial 48h, chronological expansion, keyboard interaction, missing crest/status, partial/stale/empty data, mobile readability.

**M6 gate:** Preview deployment; smoke-test schedule and timezone boundaries.

---

## M7 — FAQ and related matches

### S16 — FAQ
**Goal:** Useful editorial FAQ with delayed-collapse behaviour.

Scope: answerable questions only; multiple answers may remain open briefly; previously opened answers collapse after a short delay; keyboard and reduced-motion support.

Tests: single/multiple open, rapid toggles, delay behaviour, long answers, no FAQPage schema solely for rich results.

### S17 — Related matches
**Goal:** Unified relevant match list.

Scope: up to four; upcoming involving either team first; previous head-to-head meetings next; no unrelated filler; cached data only.

Tests: priority order, duplicates, 0–4 rows, missing fields, only valid internal links.

**M7 gate:** Preview deployment; verify FAQ interaction and related match order.

---

## M8 — Telegram promotion

### S18 — Featured channel promotion
**Goal:** Add the agreed Telegram block.

Scope:
- Featured dark navy/icy-blue visual.
- Original football-themed illustration or verified existing asset.
- One CTA to repository-verified channel URL; no separate bot promo.
- Every lifecycle state.
- Full-width adaptive mobile layout.
- Immediately before existing footer, after related matches.

Tests: exact verified URL, CTA accessibility/touch target, desktop/mobile, missing illustration fallback, footer unaffected.

**M8 gate:** Preview deployment; verify CTA destination and page order.

---

## M9 — Integration and quality

### S19 — Resilience and lifecycle integration
**Goal:** Validate partial/stale/failing data across the entire page.

Tests:
- Full, partial, stale, unavailable and not-applicable data.
- Upcoming/live/finished lifecycle.
- Missing scorers, HT score, venue, portraits, crests and competition crest.
- Empty schedule without false no-match statement.
- Fewer-than-five results and insufficient standings/form data.
- Existing safe provider/cache failure simulation.
- No client retries or polling.

### S20 — SEO, accessibility, performance and regression audit
**Goal:** Cross-cutting quality gate.

Tasks/tests:
- Visible facts and schema consistency.
- Keep answer-first context and facts table distinct; avoid repetition.
- No unsupported schema/FAQ markup.
- Keyboard, focus, reduced motion, labels and contrast.
- Full RTL/LTR and mobile/intermediate/desktop regression.
- Existing lint/typecheck/test/build suite.
- SSR output and unrelated-route smoke tests.
- Compare Worker CPU, KV/provider/subrequests, HTML size, TTFB and CWV to M0 baseline where measurable. Clearly state unavailable measurements.

**M9 gate:** Release-candidate review, full preview smoke/regression matrix and owner approval for M10 production release.

---

## M10 — Release

### S21 — Release readiness and rollback verification
**Goal:** Prepare safe production release.

Tasks:
- Verify all prior gates and complete diff.
- Confirm production build, bindings/secrets (without exposing values), correct environment and last-good deployment.
- Verify documented rollback mechanism.
- Run production-equivalent build and release candidate smoke tests.
- Prepare release notes and release report.

**Gate:** Present readiness evidence and receive production release approval.

### S22 — Production deployment and post-deploy verification
**Goal:** Release and verify completed feature.

Tasks:
- Deploy using the repository's verified workflow.
- Record target, deployment ID, timestamp and commit SHA.
- Smoke-test upcoming/live/finished routes, SSR, RTL/mobile, nav, primary sections, Telegram URL and footer.
- Inspect available Worker/cache/error/performance indicators.
- If a critical regression appears, stop and execute the documented rollback.

Deliverables: `MATCH-CENTRE-RELEASE-REPORT.md`, completed ledger and execution log with all commit SHAs, push results, preview URLs and production deployment details.

## D. Cross-session handoff

At the start of every session:
1. Read this package and the current ledger/log.
2. Inspect `git status`, branch and HEAD.
3. Identify the next incomplete Session ID from the ledger—not from chat memory.
4. Confirm prior commit and tests.
5. Declare the one-session scope, expected files, acceptance criteria and required tests.

At the end:
1. Run tests and audits.
2. Review diff and status.
3. Update execution log and ledger.
4. Commit and push according to `deployment-runbook.md`.
5. At milestone end, deploy preview/staging and smoke-test.
6. Record deployment details and next session.
7. Stop at approval gates.

If agent context is lost, resume from repository documents, Git history and logs. Never repeat completed work or skip undocumented work.
