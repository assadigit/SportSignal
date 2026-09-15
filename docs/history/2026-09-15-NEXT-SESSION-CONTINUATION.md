# Next-Session Continuity (thin pointer — v13.46+)

This file was the frozen hand-off doc (last real content: v13.6-era). The
record now lives in three places, in this order:

1. **[`CHANGELOG.md`](CHANGELOG.md)** — what happened, version by version,
   newest first. The authoritative history of behavior changes.
2. **[`RUNBOOK.md`](RUNBOOK.md)** — how to operate: deploy/verify/rollback,
   monitoring + alert semantics, incident playbooks (missed/duplicate
   notifications), KV contracts, measured budgets, safety invariants.
3. **The dev worklog** (outside the repo, at `/home/z/my-project/worklog.md`
   in the build sandbox) — the append-only session log with live-verification
   evidence. Not shipped; read it if resuming inside the sandbox.

Quick resume checklist for a new session:

- Repo clean on `main`? `git log --oneline -3` and compare against the live
  `curl https://sportsignal.ir/healthz` `version` field (drift = un-deployed
  commits or un-pushed deploy).
- `npm install && npm test` → exit 0 before anything else.
- Read RUNBOOK §1 (access map) and §11 (the never-do list) before editing.
- The eval-harness rule: src signature changes must co-evolve
  `scripts/lib/worker-src.js` in the same commit (RUNBOOK §2).

Archived session notes: [`docs/history/`](docs/history/).
