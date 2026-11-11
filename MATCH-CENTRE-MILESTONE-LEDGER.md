# SportSignal Match Centre — Milestone Ledger

**Repository:** https://github.com/assadigit/sportsignal
**Baseline commit:** `114426b` ("Add files via upload", 2026-11-10) — live production `13.255-seospell` verified matching this tree
**Working branch:** `feat/match-centre` (owner-approved 2026-11-11; cut from `main` at `114426b`)
**Preview target:** Option A + B approved 2026-11-11 — `npx wrangler versions upload` per-version preview URLs on the workers.dev subdomain for milestone smoke tests, plus `npx wrangler dev` local verification every session (audit §10)
**Production target:** Worker `ucl-notifier` via `npx wrangler deploy` → `sportsignal.ir` (+ `football.sportsignal.ir`, `ucl-notifier.sportsignal.workers.dev` alias). Current deployment `88649642` / version `b48bae21` (2026-11-10T11:10:43Z). Rollback: `npx wrangler deployments list` → `npx wrangler rollback`.

## Current status
- Current milestone: M1 — Page foundation (in progress)
- Current session: S03 (next to start)
- Last completed session: S02 — route shell and semantic structure (2026-11-11)
- Last completed milestone: M0 — complete and **owner-approved 2026-11-11** (blanket approval of the presented audit/branch/deploy plan; all six §15 decision points resolved with the recommended options — see the M0 gate decision record below)
- Next action: S03 — responsive, spacing and RTL/LTR foundation, on `feat/match-centre` (audit §16 row S03)
- Production release: Not approved until S21 readiness gate; production deploy only at S22

## M0 gate decision record (owner approval, 2026-11-11)

Owner message: "Approve. give me the session for next session. commit push and update change logs." — blanket approval of the M0 plan as presented. The six decision points (audit §15) resolve to their recommended options:

| # | Decision | Resolution (recommended option adopted) |
|---|---|---|
| Q1 | Kickoff timezone rendering (S05, decision 93) | **A — Tehran time + UTC note as today** (no new JS; owner may still switch to B — visitor-local `Intl` enhancement — any time before S05) |
| Q2 | Venue city/country (S14) | **A — stadium name only**, city/country omitted (zero invention; a curated table can be authorized later, before S14) |
| Q3 | Telegram illustration (S18, decision 69) | **A — compose from existing verified assets** (channel icon + existing stadium art) |
| Q4 | Finished scorers (S04/S19, guardrails §1) | **A — finished scorers stay omitted** (zero-exception default holds; the bounded venue-detail piggyback was NOT approved) |
| Q5 | Preview target (audit §10) | **A + B — Workers version previews (`wrangler versions upload`, never activated) + local `wrangler dev` every session**; read-only smoke tests only, same-KV caveat respected, no admin/simulate/broadcast against previews |
| Q6 | Merge strategy (M10) | **A — owner merges `feat/match-centre` → `main` via PR** at the M10 gate (agent never merges/pushes `main` unless separately instructed) |

Override rule: Q1–Q4 are product choices tied to S05/S14/S18/S04 respectively; the owner may override any of them before that session lands without re-opening M0. Q5/Q6 are process choices now in force.

## Milestones

| Milestone | Status | Sessions | Commit SHAs | Preview deployment | Gate |
|---|---|---|---|---|---|
| M0 Discovery & execution plan | Complete — **approved 2026-11-11** | S00–S01 | `82ee82b` (extraction + audit) + approval docs commit | None (audit only) | Approved 2026-11-11 (blanket; Q1–Q6 recommended options) |
| M1 Page foundation | In progress — S02 complete | S02–S03 | S02: see Sessions table below | Pending (first preview after S03) | Pending |
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
| S00 | Complete | `82ee82b` | Pushed to `origin/feat/match-centre` 2026-11-11, `ls-remote` verified | npm test baseline: exit 0, 2,961 OK, 0 failures | Package v1.2 extracted (README conflict → `MATCH-CENTRE-PACKAGE-README.md`); repo/design-system/docs audit; no code changes |
| S01 | Complete | `82ee82b` | Pushed to `origin/feat/match-centre` 2026-11-11, `ls-remote` verified | npm test re-verified exit 0 | Data matrix, cost audit, dated-audit re-verification (scorers R2 corrected — finished scorers NOT in pool at HEAD), deploy/rollback/CI verified read-only; audit + ledger + log produced |
| S02 | Complete | `9e6c0c1` | Pushed to `origin/feat/match-centre` 2026-11-11 via the one-shot token URL; `git ls-remote` verified (`9e6c0c193d…` = local HEAD; remote URL clean — token never persisted) | npm test exit 0 — 2,979 OK (baseline 2,961 + 18 new check-match-centre), 0 failures | Route shell + semantic section anchors; GSC surfaces byte-proven against a base-commit render diff (3 lifecycle states + 15 unrelated routes); zero new data work; no deploy |
| S03 | Not started | — | — | — | |
| S04 | Not started | — | — | — | Finished scorers omitted (Q4 = A, approved 2026-11-11) |
| S05 | Not started | — | — | — | Kickoff rendering: Tehran + UTC note (Q1 = A, approved 2026-11-11; owner may switch to B before S05) |
| S06 | Not started | — | — | — | |
| S07 | Not started | — | — | — | Venue double-wording fix rides here (audit §5 R1) |
| S08 | Not started | — | — | — | |
| S09 | Not started | — | — | — | |
| S10 | Not started | — | — | — | |
| S11 | Not started | — | — | — | |
| S12 | Not started | — | — | — | |
| S13 | Not started | — | — | — | |
| S14 | Not started | — | — | — | Venue: stadium name only, city/country omitted (Q2 = A, approved 2026-11-11) |
| S15 | Not started | — | — | — | |
| S16 | Not started | — | — | — | |
| S17 | Not started | — | — | — | |
| S18 | Not started | — | — | — | Telegram block composed from existing verified assets (Q3 = A, approved 2026-11-11) |
| S19 | Not started | — | — | — | |
| S20 | Not started | — | — | — | Must re-verify title/meta/JSON-LD contracts (SEO measurement in flight) |
| S21 | Not started | — | — | — | |
| S22 | Not started | — | — | — | Production only after S21 + owner approval |

## Gate approvals

| Gate | Approval | Date | Notes |
|---|---|---|---|
| M0 audit / branch / deployment plan | **Approved** | 2026-11-11 | Blanket approval of the presented plan; Q1–Q6 resolved with recommended options (decision record above); branch `feat/match-centre`, preview A+B, merge via PR at M10 |
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
