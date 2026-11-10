# SportSignal Match Centre — Implementation Orchestration Package

**Package:** v1.2  
**Prepared:** 10 November 2026  
**Repository:** https://github.com/assadigit/sportsignal

This package contains the approved product/design requirements and a complete milestone/session execution plan. Upload/extract its contents into the repository root before starting the coding agent.

## Mandatory reading order

1. `README.md`
2. `specification.md`
3. `decisions-register.md`
4. `engineering-guardrails.md`
5. `milestones-and-sessions.md`
6. `deployment-runbook.md`
7. `session-checkpoint-template.md`
8. `milestone-ledger-template.md`
9. `MATCH-CENTRE-EXECUTION-LOG-TEMPLATE.md`
10. `MATCH-CENTRE-RELEASE-REPORT-TEMPLATE.md`
11. `agent-prompt.md`
12. All images in `design-reference/`

## Execution design

There are **11 milestones and 23 focused sessions**:
- M0: repository, data, resource-cost and deployment audit only; no feature implementation.
- M1–M8: implement bounded page sections incrementally.
- M9: full-page resilience, SEO, accessibility, performance and regression audit.
- M10: release readiness, production deployment and post-deploy verification.

The archive retains all four visual exploration references from v1.0. The agent must execute sessions in order. Each completed session receives focused tests/audits, an atomic commit and a push to the approved feature branch. Each completed milestone receives a deployment to a verified safe preview/staging environment and smoke tests. Production promotion is gated at M10/S22 after S21 readiness checks and owner approval.

## Persistent repository records

The agent maintains:
- `MATCH-CENTRE-IMPLEMENTATION-AUDIT.md` — verified baseline and file-level plan.
- `MATCH-CENTRE-EXECUTION-LOG.md` — append-only session/test/commit/push/deploy history.
- `MATCH-CENTRE-MILESTONE-LEDGER.md` — statuses and approvals.
- `MATCH-CENTRE-RELEASE-REPORT.md` — final deployment, smoke tests, performance and rollback; create it from `MATCH-CENTRE-RELEASE-REPORT-TEMPLATE.md`.

Never store secrets or private environment values in these records.

## Source of truth

- `specification.md`: product/design behaviour.
- `decisions-register.md`: 99 locked decisions.
- `engineering-guardrails.md`: infrastructure and data constraints.
- `milestones-and-sessions.md`: session scopes, tests and gates.
- `deployment-runbook.md`: branch, commit, push, preview and production rules.
- `agent-prompt.md`: first-session agent prompt.

Generated design references communicate mood/composition only; written requirements take precedence.

## Dated audit context

The planning discussion referenced an API/data audit based on commit `e4973cc`, observation version `13.249-ranktip`, dated 9 November 2026. This is a historical snapshot, not proof of current HEAD or production behaviour. Locate the full report if present, and verify findings against the current repository and deployment configuration.

## Core principle

Build for the data SportSignal can reliably provide within the actual infrastructure budget. Default to zero incremental provider requests and zero incremental KV operations. Preserve unrelated functionality. Make every change reviewable, testable and reversible.
