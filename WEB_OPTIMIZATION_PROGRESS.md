# SportSignal — Web Optimization Progress Tracker

> **Persistent tracker** required by `SPORTSIGNAL_WEB_OPTIMIZATION_SPEC.md` §4.
> Updated at every phase boundary. Do not create competing status documents.
> Architecture facts and the website/bot isolation map live in
> `WEB_OPTIMIZATION_ARCHITECTURE.md` (Phase 0 deliverable — read it before
> editing anything). The frozen Phase 1 baseline lives in
> `WEB_OPTIMIZATION_AUDIT.md` (never overwrite it).

---

## Current status

| Field | Value |
| :--- | :--- |
| **Current phase** | 1 COMPLETE — Phase 2 (Frontend optimization) NOT STARTED |
| **Branch** | `main` |
| **Latest commit** | Phase 1 docs commit (hash recorded in the Git log below after push) |
| **Production** | `13.201-carstack` (= repo `63a1d02` at audit time; NOT redeployed for Phase 1 — documentation-only phase) |
| **Production health at audit** | `/healthz` → `ok:true`, `degraded:false`, `kv_writes_day: 18` (counter reset since Phase 0; no incident), `kv_writes_web: 0`, pool 519 matches, sched UPCOMING. |
| **Last verified** | 2026-11-04 (Phase 1 audit + `npm test` green, 2,525 checks) |
| **Next action** | Phase 2 — frontend optimization per `WEB_OPTIMIZATION_AUDIT.md` §8 (JS main-thread diet + conservative CSS dead-code pass, full ADR-006 ceremony) |

## Phase roadmap (spec §5)

| Phase | Name | Status | Notes |
| :--- | :--- | :--- | :--- |
| 0 | Reconnaissance & architecture audit | ✅ **COMPLETED** (2026-11-04) | Docs only: `WEB_OPTIMIZATION_ARCHITECTURE.md` + this tracker. |
| 1 | Comprehensive audit (perf/SEO/a11y/security baselines) | ✅ **COMPLETED** (2026-11-04) | `WEB_OPTIMIZATION_AUDIT.md` created — **FROZEN BASELINE**. Headline: sub-pages excellent (LH 91–99, CLS 0, TTFB 45–80 ms warm); homepage mobile is the outlier (LH perf 49–65, lab LCP 9.2 s) — root cause F-C1: SSR hero card ships `display:none` (`src/pages/public.ts:525`), LCP art chains behind client JS. 1 Critical / 3 High / 6 Medium / 10 Low findings. |
| 2 | Frontend optimization (CSS/JS/rendering/deps) | ⬜ NOT STARTED | Plan in AUDIT §8: defer below-fold JS init (F-M2), conservative CSS dead-code pass (F-M1, 30 KB flagged), one ADR-006 rename + pins + SW bump + harness re-pin per edit. |
| 3 | Assets & Core Web Vitals | ⬜ | Contains the P0: F-C1 SSR-reveal hero + priority scene art (target lab LCP ≤ 2.5 s); F-H2 image re-encodes; F-H1 self-host league emblems (tables.ts = SHARED — bot-safety design required); F-M7 OG recompress; font-weight audit. |
| 4 | Cloudflare & caching | ⬜ | F-M5 304 handling; ETag on machine files; F-H3 enable CF Web Analytics RUM (field-data source for Phase 7); optional cap-sweep (F-L6). No new KV writes (R2); freshness ladder intact (R12). |
| 5 | Technical & multilingual SEO | ⬜ | Verification + gap-fix: F-M8 pagination canonical decision, F-L1 404 canonical cleanup, GSC owner access or owner-run reports. fa/en stays client-toggle (R11). |
| 6 | Accessibility & security | ⬜ | F-M3 contrast fixes, F-M3b hero accessible name, F-M6 touch targets, F-L3 skip-link order; CSP eval bounded by R13. |
| 7 | Final verification & requirements reconciliation | ⬜ | Repeat baselines identically; requirements checklist per spec §13.6; field data via CF Web Analytics RUM if enabled in Phase 4. |

## Changes made (cumulative log)

### Phase 0 — 2026-11-04 (documentation only)

- **Created** `WEB_OPTIMIZATION_ARCHITECTURE.md` — repository/application
  architecture, website request/rendering flow, website-vs-bot isolation
  map, Cloudflare + deployment workflow report, tests & quality gates,
  risks/limitations, phase execution notes.
- **Created** `WEB_OPTIMIZATION_PROGRESS.md` (this file).
- **No application code, assets, configuration or bot files were modified.**
  (A local `npm install` refreshed `package-lock.json`'s version field from
  `13.197.0.0` → `13.201.0.0`; it was **reverted** to keep the Phase 0
  commit documentation-only. The drift is a pre-existing repo inconsistency
  from the owner's upload commit `f39ce2b` — noted in
  `WEB_OPTIMIZATION_ARCHITECTURE.md` §4 for a later hygiene pass.)

### Phase 1 — 2026-11-04 (audit only; no application code changed)

- **Created** `WEB_OPTIMIZATION_AUDIT.md` — the frozen comprehensive baseline
  (spec §7.7): performance (curl timing suite ×16 routes ×3 runs; Lighthouse
  local mobile+desktop on 7 pages; CI Lighthouse history ×3 runs; LCP root
  cause with source-line evidence), device coverage (7 viewports + VLM visual
  review + live functional tests), technical SEO (seo:check 56/56 + manual
  verification of robots/sitemaps/redirects/404/canonicals/JSON-LD/internal
  links), multilingual model documented honestly (fa SSR + client en toggle,
  no hreflang, no IP redirects — verified), GSC access limitation documented
  (no credentials — NOT inspected), WCAG 2.2 AA findings, security posture,
  findings register (F-C1 Critical; F-H1..H3 High; F-M1..M6 Medium;
  F-L1..L10 Low), and the prioritized Phases 2–6 implementation plan.
- **Updated** `WEB_OPTIMIZATION_PROGRESS.md` (this file).
- **No application code, assets, configuration or bot files were modified.**
  (Same `package-lock.json` version-field drift reverted again after
  `npm install`; tree committed clean.)

## Files modified in Phase 1

| File | Change |
| :--- | :--- |
| `WEB_OPTIMIZATION_AUDIT.md` | NEW — Phase 1 frozen baseline audit (spec §7 deliverable) |
| `WEB_OPTIMIZATION_PROGRESS.md` | UPDATED — status, verification log, Git log (this file) |

## Known issues, blockers & deferred work

| # | Item | Type | Raised |
| :--- | :--- | :--- | :--- |
| K1 | KV write budget watch — at Phase 0 audit: 838/1000 (`degraded:true`); counter has since reset (Phase 1 audit: 18/1000, `degraded:false`). Not caused by this project; keep NOT adding web-side KV writes (R2). | Observation | Phase 0 |
| K2 | `package-lock.json` version field drift (13.197.0.0 vs package.json 13.201.0.0). Cosmetic; fix in the first code-touching commit (Phase 2). | Hygiene | Phase 0 |
| K3 | `package-lock.json.bak` is gitignored; npm-only toolchain (bun breaks resvg). | Constraint | Phase 0 |
| K4 | No staging environment — `wrangler dev` smoke is the only pre-prod gate (R8). | Constraint | Phase 0 |
| K5 | Google Search Console access NOT available (no credentials in session; owner completed DNS TXT verification 2026-10-11 per OWNER_TODO). Phase 5/7 needs owner-run reports or credentials. | Open question | Phase 0 |
| K6 | No field CWV/INP data source exists (CrUX empty; PSI quota blocked) — **F-H3**: enable Cloudflare Web Analytics RUM (owner-visible, free, beacon already allowed by CSP) so Phase 7 has field data. | Measurement gap | Phase 1 |
| K7 | ClaudeBot/Amazonbot 403 block from OWNER_TODO §2 (2026-10-11) is **resolved** — all 15 bot UAs return 200 (verified live 2026-11-04). | Resolved | Phase 1 |
| K8 | `wrangler.dev.toml` is git-tracked despite its header comment claiming git-ignored (resource IDs only, no secrets) — F-L2 hygiene note. | Hygiene | Phase 1 |
| K9 | If-None-Match returns 200 not 304 (F-M5) — contradicts prior SEO report R-12; Phase 4 fix in `src/seo/router.ts`. | Defect | Phase 1 |

## Telegram bot protection status

**Phase 1: NO Telegram bot files, configuration, secrets or behavior were
modified.** The audit was read-only against production + local clone; the
only committed changes are two documentation files. Verified by
`git diff --stat` review of the Phase 1 commit (documents only). The
isolation map (`WEB_OPTIMIZATION_ARCHITECTURE.md` §3) remains the
authoritative reference for every later phase. (Note: F-H1's league-emblem
self-hosting touches SHARED `src/tables.ts` — Phase 3 must produce the
bot-safety argument BEFORE any edit there.)

## Verification log

| Date | Check | Result |
| :--- | :--- | :--- |
| 2026-11-04 | `git fetch` + `git ls-remote` — remote main = `63a1d02` = local HEAD (no owner uploads since Phase 0) | ✅ |
| 2026-11-04 | Live `/healthz` version = repo `src/config.ts` VERSION = `13.201-carstack` (no divergence) | ✅ |
| 2026-11-04 | `npm install` + `npm test` (tsc + ~40 check scripts) | ✅ exit 0 — 2,525 checks OK, 0 failures |
| 2026-11-04 | Production timing suite: 16 routes × 3 runs (TTFB, wire bytes, headers, cache status) | ✅ recorded in AUDIT §1.1/§1.6 |
| 2026-11-04 | Lighthouse local (7 pages, mobile+desktop) + CI history (3 runs) | ✅ recorded in AUDIT §1.2 |
| 2026-11-04 | Viewport matrix 360–1920 (7 widths) + fa/en + carousel + countdown functional tests + VLM visual review | ✅ no overflow; all pass (AUDIT §2) |
| 2026-11-04 | `npm run seo:check` (production) | ✅ **56 PASS / 0 FAIL** |
| 2026-11-04 | JSON-LD extraction + validation on 5 page families | ✅ valid, content-matched (AUDIT §3.4) |
| 2026-11-04 | Redirect/404/canonical matrix (18 URLs) + internal links (157 found / 25 sampled) + sitemap spot-check (12 URLs) | ✅ all as documented (AUDIT §3) |
| 2026-11-04 | `npm audit --omit=dev` | ✅ 0 vulnerabilities |
| 2026-11-04 | Cloudflare zone settings read-only (brotli/http3/early_hints/0rtt/minify) | ✅ recorded in AUDIT §1.5 |
| 2026-11-04 | GSC inspection | ⛔ NOT PERFORMED — no credentials (documented per spec §7.5, AUDIT §5) |

## Git & deployment log

| Phase | Commit | Push | Deploy | Production verify |
| :--- | :--- | :--- | :--- | :--- |
| 0 | `a9c87c0` + `00c2e9f` + `63a1d02` (docs + tracker hash backfills) | `main` @ GitHub, verified via `git ls-remote`; CI seo-check green on all | **NOT DEPLOYED** (docs-only) | n/a (production = repo code state, verified via `/healthz`) |
| 1 | `docs: add comprehensive performance/SEO/a11y baseline audit` (WEB_OPTIMIZATION_AUDIT.md + this tracker) | `main` @ GitHub (one-shot token push, verified via `git ls-remote`) | **NOT DEPLOYED** (documentation-only phase — spec §14.4) | n/a (production unchanged = `13.201-carstack`, re-verified via `/healthz` after push) |

---

## Next-session prompt

The complete, copy-paste-ready Phase 2 prompt is emitted at the end of the
Phase 1 session report (per repo convention; the authoritative master
specification is `SPORTSIGNAL_WEB_OPTIMIZATION_SPEC.md` §8 = Phase 2, and the
evidence-based plan is `WEB_OPTIMIZATION_AUDIT.md` §8).
