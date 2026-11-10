# SportSignal Match Centre — Milestone Ledger

**Repository:** https://github.com/assadigit/sportsignal
**Baseline commit:** `114426b` ("Add files via upload", 2026-11-10) — live production `13.255-seospell` verified matching this tree
**Working branch:** `feat/match-centre` (proposed at the M0 gate; awaiting owner approval)
**Preview target:** None configured (verified — see audit §10; owner decision requested: Option A version previews + B local)
**Production target:** Worker `ucl-notifier` via `npx wrangler deploy` → `sportsignal.ir` (+ `football.sportsignal.ir`, `ucl-notifier.sportsignal.workers.dev` alias). Current deployment `88649642` / version `b48bae21` (2026-11-10T11:10:43Z). Rollback: `npx wrangler deployments list` → `npx wrangler rollback`.

## Current status
- Current milestone: M0 (complete — awaiting owner approval of the audit/branch/deploy plan)
- Current session: S01 (complete)
- Last completed session: S01 — architecture, data, cost and deployment audit (2026-11-11)
- Last completed milestone: M0 (deliverables produced; gate pending)
- Next action: Owner reviews `MATCH-CENTRE-IMPLEMENTATION-AUDIT.md` and approves the branch/preview/production plan; then S02 starts on `feat/match-centre`
- Production release: Not approved until S21 readiness gate

## Milestones

| Milestone | Status | Sessions | Commit SHAs | Preview deployment | Gate |
|---|---|---|---|---|---|
| M0 Discovery & execution plan | Complete (gate pending) | S00–S01 | — (M0 docs commit pending owner approval of branch plan) | None (audit only) | Owner audit approval required |
| M1 Page foundation | Not started | S02–S03 | — | Pending | Pending |
| M2 Hero & navigation | Not started | S04–S06 | — | Pending | Pending |
| M3 Summary & editorial system | Not started | S07–S09 | — | Pending | Pending |
| M4 Standings | Not started | S10–S11 | — | Pending | Pending |
| M5 Form & recent results | Not started | S12–S13 | — | Pending | Pending |
| M6 Venue & schedule | Not started | S14–S15 | — | Pending | Pending |
| M7 FAQ & related matches | Not started | S16–S17 | — | Pending | Pending |
| M8 Telegram promotion | Not started | S18 | — | Pending | Pending |
| M9 Integration & quality | Not started | S19–S20 | — | Release-candidate preview | Owner release approval required |
| M10 Release & verification | Not started | S21–S22 | — | Production release gate | Pending |

## Sessions

| Session | Status | Commit SHA | Push result | Tests | Notes |
|---|---|---|---|---|---|
| S00 | Complete | — | — | npm test baseline: exit 0, 2,961 OK, 0 failures | Package v1.2 extracted (README conflict → `MATCH-CENTRE-PACKAGE-README.md`); repo/design-system/docs audit; no code changes |
| S01 | Complete | — | — | npm test re-verified exit 0 | Data matrix, cost audit, dated-audit re-verification (scorers R2 corrected — finished scorers NOT in pool at HEAD), deploy/rollback/CI verified read-only; audit + ledger + log produced |
| S02 | Not started | — | — | — | Starting files listed in audit §16 |
| S03 | Not started | — | — | — | |
| S04 | Not started | — | — | — | Finished scorers omitted pending owner decision Q4 |
| S05 | Not started | — | — | — | Timezone decision Q1 pending |
| S06 | Not started | — | — | — | |
| S07 | Not started | — | — | — | Venue double-wording fix rides here (audit §5 R1) |
| S08 | Not started | — | — | — | |
| S09 | Not started | — | — | — | |
| S10 | Not started | — | — | — | |
| S11 | Not started | — | — | — | |
| S12 | Not started | — | — | — | |
| S13 | Not started | — | — | — | |
| S14 | Not started | — | — | — | Venue city/country decision Q2 pending |
| S15 | Not started | — | — | — | |
| S16 | Not started | — | — | — | |
| S17 | Not started | — | — | — | |
| S18 | Not started | — | — | — | Illustration decision Q3 pending |
| S19 | Not started | — | — | — | |
| S20 | Not started | — | — | — | Must re-verify title/meta/JSON-LD contracts (SEO measurement in flight) |
| S21 | Not started | — | — | — | |
| S22 | Not started | — | — | — | Production only after S21 + owner approval |

## Gate approvals

| Gate | Approval | Date | Notes |
|---|---|---|---|
| M0 audit / branch / deployment plan | Pending | — | Presented 2026-11-11 with 6 decision points (audit §15); preview-target question is runbook-mandated |
| M9 release-candidate review | Pending | — | |
| M10 production release | Pending | — | Last-known-good at audit time: deployment `88649642`, version `b48bae21` |

## Standing constraints carried into every session
- Zero incremental provider requests; zero incremental KV operations (default; exceptions only via guardrails §1 approval).
- No client polling/retry loops; no new dependencies; no schema/cache/data-contract expansion.
- Missing ≠ zero; no empty cards, fake zeroes, invented facts or misleading no-match statements.
- Persian-first native RTL; intentional English LTR.
- Harness co-evolution (`worker-src.js` + check scripts) in the same commit as any src signature/new-module change.
- Team-name spellings frozen until ~Dec 8 (S1 SEO measurement); match-page title/meta/canonical/JSON-LD preserved through M1.
- npm only (never `bun install`); `npm test` green before every push/deploy; one-shot token pushes; never force-push.

Update this ledger after every session and milestone. Never leave progress implicit in chat.
