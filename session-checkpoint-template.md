# Match Centre — Agent Session Start and Checkpoint Template

Use this at the beginning and end of every agent session.

## Start-of-session checklist
- [ ] Read `README.md`.
- [ ] Read relevant `specification.md` sections and `decisions-register.md`.
- [ ] Read `engineering-guardrails.md`.
- [ ] Read `milestones-and-sessions.md` and `deployment-runbook.md`.
- [ ] Read `MATCH-CENTRE-MILESTONE-LEDGER.md` and the latest execution-log entries.
- [ ] Inspect `git status`, current branch and HEAD.
- [ ] Confirm unrelated changes are safe.
- [ ] Identify next incomplete Session ID from the ledger.
- [ ] State one-session scope, expected files, acceptance criteria, tests and audit before editing.

## Session declaration

```text
MATCH CENTRE — SESSION START
Session ID: Sxx
Milestone: Mx
Title:
Current branch:
Starting commit SHA:
Working-tree status:
Previous session status:
Single-session scope:
Expected files:
Acceptance criteria:
Required tests:
Required audit:
Milestone deployment expected:
```

## End-of-session checkpoint

```text
MATCH CENTRE — SESSION COMPLETE
Session ID: Sxx
Milestone: Mx
Completed scope:
Files changed:
Behaviour delivered:
Tests/checks run and outcomes:
RTL/mobile/desktop verification:
Data/cache/provider/KV/CPU audit:
Performance observations:
Known limitations:
Commit SHA:
Push branch/result:
Milestone preview URL/deployment ID (if applicable):
Smoke-test result:
Next Session ID:
Approval needed:
```

## Rules
- Writing code alone does not complete a session.
- Never mark failed or unrun tests as passed.
- Do not begin the next session before logging the checkpoint.
- When context is lost, read repository ledger/log and Git history; do not rely on chat memory.
