# Git, Push, Preview Deployment and Production Release Runbook

The user explicitly requests incremental milestones, commits, pushes and deployments. Routine session commits/pushes and milestone preview deployments are authorized after M0 branch/deploy planning is approved.

## 1. Branch safety

- Inspect branch, HEAD and working tree before every change.
- Preserve uncommitted user work; never reset, clean, overwrite or discard it.
- Follow repository branch conventions. If none exist, propose a dedicated branch such as `feat/match-centre` in M0.
- Do not work directly on production branch unless repository policy requires it and the owner approves.
- Check for other agents/automation modifying the same files or deploying concurrently.
- Never bypass branch protection, CI requirements or repository permissions.

The M0 audit must record the selected branch, merge strategy and permission status. The owner approves this execution plan before implementation.

## 2. Atomic commit and push policy

After each completed session:
1. Run session-specific checks.
2. Run `git diff --check` or the repository-equivalent whitespace check.
3. Review staged diff and `git status`.
4. Stage only session-owned files.
5. Create one focused atomic commit.
6. Record commit SHA and tests in `MATCH-CENTRE-EXECUTION-LOG.md`.
7. Push to the approved feature branch.

Suggested messages:
- `docs(match-centre): record implementation audit`
- `feat(match-centre): add responsive page shell`
- `feat(match-centre): implement lifecycle hero`
- `test(match-centre): cover standings windows`
- `fix(match-centre): handle stale schedule state`

Never commit secrets, `.env` files, private keys, generated dumps, unrelated formatting or user changes. Never force-push or bypass protections. If push fails due to permissions/conflicts, stop and report. Do not squash/rebase published history unless requested.

## 3. Incremental deployment policy

At the end of every milestone:
- Confirm all sessions in that milestone are complete.
- Confirm required checks pass.
- Ensure all session commits are pushed.
- Deploy the milestone state to the existing safe preview/staging environment.
- Run the milestone smoke-test matrix.
- Record environment, URL, deployment ID, commit SHA, timestamp, tests and outcome in the execution log and ledger.

Do not invent an environment name or command. Inspect the repository's Cloudflare Pages/Workers config, CI workflow and scripts during M0.

### If no safe preview exists
If the only configured deployment target is production:
- Do not deploy incomplete milestones.
- Report this in M0.
- Ask the owner once to select/provide a preview target or approve a safe staged-release mechanism.
- Continue with local verification and approved feature-branch commits, but do not silently expose partial UI.

## 4. Production release

Production deployment is permitted only at M10/S22, after:
- All milestones and required checks pass.
- M9 release-candidate preview and smoke/regression matrix pass.
- Correct production target and bindings/secrets are verified without revealing secret values.
- Last-known-good production deployment and rollback method are recorded.
- S21 readiness report is presented and the owner approves the production release.

After S21 approval, the S22 deployment is authorized; do not repeatedly ask for permission for the same release. Do not deploy partial milestones to production merely to meet a cadence. If an existing feature-flag/canary mechanism supports incremental production exposure, document and seek approval in M0; never invent a flag.

## 5. Preview/staging deployment verification

For each milestone preview:
- Open the deployed Match Centre route.
- Verify SSR content and cache behaviour where applicable.
- Test lifecycle states available in the environment.
- Check mobile/desktop and RTL/LTR.
- Verify hero portrait fallback.
- Verify missing data does not create empty cards, false zeroes or false no-match claims.
- Test navigation, schedule expansion, FAQ and Telegram CTA as implemented.
- Check global header/footer and at least one unrelated route.
- Inspect available error and Worker metrics.

For production, run critical smoke tests immediately after deploy, inspect available Cloudflare Worker/error/cache indicators and compare to M0 baseline where measurable. Do not create frequent monitoring probes or polling that increase cost.

## 6. Rollback

Before production deployment, record:
- Last-known-good commit and deployment ID.
- Exact supported rollback method for the current hosting/Cloudflare workflow.
- Whether rollback requires code-only, config or data/cache steps.
- Known compatibility/migration risks.

On critical regression:
1. Stop further deploys.
2. Preserve failing commit SHA and logs.
3. Use the verified rollback method.
4. Smoke-test recovery.
5. Record incident and corrective action.
6. Do not perform speculative schema/KV/cache mutations.

Never assume a Wrangler rollback command or a Cloudflare feature exists; verify current CLI/configuration and repository practices.

## 7. Required log fields

Every session: Session ID/title, date, milestone, starting/ending SHA, branch, files, behaviour, tests/results, RTL/mobile/desktop evidence, relevant data/cost audit, commit SHA, push result, blockers and next session.

Every deploy: milestone, environment, URL, deployment ID, timestamp, commit SHA, smoke tests, errors/metrics, rollback reference and outcome.
