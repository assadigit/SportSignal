# Agent Beginning Prompt — SportSignal Match Centre

You are the implementation agent for SportSignal Match Centre:

https://github.com/assadigit/sportsignal

The owner requests a milestone-driven, incremental workflow: focused sessions, tests, audits, atomic commits, pushes and deployments. This is not one large coding task.

## Mandatory reading order

Read completely:
1. `README.md`
2. `specification.md`
3. `decisions-register.md`
4. `engineering-guardrails.md`
5. `milestones-and-sessions.md`
6. `deployment-runbook.md`
7. `session-checkpoint-template.md`
8. `milestone-ledger-template.md`
9. Every image in `design-reference/`

If `MATCH-CENTRE-MILESTONE-LEDGER.md` or `MATCH-CENTRE-EXECUTION-LOG.md` already exists, read them too.

## Mandatory first action: M0 audit only

Start S00 then S01. Do not implement Match Centre features during these sessions.

Inspect current HEAD/branch/working tree; route and SSR path; design system/components/fonts/icons/header/footer; verified data fields and provenance; cache/freshness; provider/KV/subrequest/CPU/payload costs; tests/scripts/CI; preview/staging/production configuration; environment bindings and rollback path. Locate the dated API/data audit if present and verify its findings against current HEAD.

Create:
- `MATCH-CENTRE-IMPLEMENTATION-AUDIT.md`
- `MATCH-CENTRE-MILESTONE-LEDGER.md`
- `MATCH-CENTRE-EXECUTION-LOG.md`

The audit must contain current architecture/file paths, data-availability matrix, cache/freshness behaviour, cost-sensitive paths, baseline checks, proposed feature branch/commit plan, verified preview/production deploy process, rollback plan, file-by-file milestones, risks and unknowns.

**Stop after M0. Present the audit and deployment plan for owner approval before S02.** Ask only material questions repository inspection cannot answer.

## After M0 approval

Follow `milestones-and-sessions.md` exactly: M0 through M10, S00 through S22, in order.

For each session:
1. Read package and latest ledger/log.
2. Inspect `git status`, branch and HEAD.
3. Declare the single-session scope, files, acceptance criteria, tests and audits.
4. Implement only that scope.
5. Run the required tests/audit and review diff.
6. Update execution log and milestone ledger.
7. Create an atomic commit and push to the approved feature branch.
8. At the end of a milestone, deploy to existing safe preview/staging and run smoke tests.
9. Record SHA, push result, deployment ID/URL and outcomes.
10. Stop at approval gates.

Routine session commits/pushes and milestone preview deployments are authorized after the M0 plan is approved. Do not ask repeatedly for permission for these same routine operations.

## Production safety

Do not expose a partially implemented page to production. Production deployment occurs at S22 only after S21 readiness checks and owner approval. If no safe preview exists and the only target is production, stop and ask once for the target strategy. If a verified existing feature-flag/canary mechanism supports safer incremental exposure, document it in M0 and seek approval; never invent one.

## Non-negotiable constraints

- Written specification is authoritative; generated images are exploratory.
- Respect all 99 locked decisions.
- Preserve unrelated functionality and user changes.
- No global redesign; reuse the existing SportSignal design system.
- Default to zero incremental provider requests and zero incremental KV operations.
- No client polling/retry loops or unnecessary dependencies.
- Missing data is not zero; distinguish partial, unavailable, not applicable and stale-but-usable.
- Never invent scores, scorers, venue, broadcasts, predictions, fixtures or Telegram URLs.
- No empty cards, fake zeroes, blank charts or misleading no-match statements.
- Persian-first native RTL; intentional English LTR.
- Never expose secrets in code, commits, logs or reports.
- Never bypass branch protection or force-push.
- Do not claim tests, performance gains, audits or deployments that did not happen.

## Context-loss recovery

If your agent context is lost, resume from `MATCH-CENTRE-MILESTONE-LEDGER.md`, the latest `MATCH-CENTRE-EXECUTION-LOG.md` entry and Git history. Identify the next incomplete Session ID. Do not rely on chat memory, repeat completed work or skip undocumented work.

## Expected first response

After S00/S01, provide documents read, architecture/data/cost findings, audit report, actual baseline test results, branch/deploy/rollback plan, file-by-file milestone plan, risks and the exact approval needed to begin S02. **Do not write feature code before approval.**
