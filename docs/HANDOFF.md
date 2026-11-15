# HANDOFF — SportSignal

> Agents: read AGENTS.md in the repo root first, and follow it for the whole session.

## This session (S23 — post-M10 hardening: live/finished lifecycle verification + bug hunt + UI/UX + perf brainstorm, FIRED 2026-11-15)

**S23 opens the post-M10 hardening track.** The M10 milestone is CLOSED — the
Match Centre ships to production (deployment `ab1395ee` / version `10c0a004` /
`13.257-mcmatchcentre`, created 2026-11-15T00:53:22Z — the post-merge re-deploy
from `main` at `c058035`; byte-identical to the S22 deploy `4280f40f`/`898b454c`).
S23 is a **DISCOVERY + DOCUMENTATION session** — it produces a hardening report
(`docs/mc/post-m10-hardening-report.md`), NOT a code deploy.

**The one-session scope (declared before touching code):**
- **H1 — the live/finished lifecycle verification (the #1 gap from the S20
  gate).** The Bayern vs Köln kickoff is `2026-11-20T19:30:00Z` (Fri Nov 20
  23:00 Tehran). **This session runs BEFORE the kickoff** (today is Sun Nov 15,
  2026). H1 therefore DOCUMENTS the verification PLAN + the markers to check
  (the `.mlive` pulse, the `.mfin` «پایان بازی» status, the scorer block
  omission [Q4=A], the result block «نتیجه نهایی» riding ONLY when finished)
  + DEFERS the live/finished verification to a follow-up session after Nov 20.
- **H2 — the bug hunt + edge-case exploration** via the agent-browser: the 6
  leagues (CL, PL, PD, SA, FL1, BL1) + the cup competitions; the degenerate
  data states (missing venue, missing standings, missing form, missing
  portraits, missing competition crest, fewer-than-five results, empty
  schedule); the device matrix (mobile 390, 768, 1024, desktop 1440); the a11y
  spot-checks (keyboard, screen-reader labels, focus traps, color contrast);
  the RTL/LTR flip; the console errors. Document EVERY finding in the report.
- **H3 — the hardening report + the follow-up session proposals**:
  `docs/mc/post-m10-hardening-report.md` + the proposed S24 (perf/CWV), S25
  (a11y deep-dive), S26 (UI/UX iteration).

**Standing laws in force for S23:**
- The composer purity (S04 countdown / S06 nav / S15 schedule / S16 FAQ are
  the ONLY inline-JS exceptions — S23 adds NO new script unless a fix requires it).
- `buildMatchPage`'s await count stays exactly 3 (`hydrateMatchVenue`,
  `loadArchive`, `fullByCodeFor` — ADR-006) — S23 does NOT touch the renderer
  code UNLESS a critical bug is found.
- GSC surfaces + the answer sentence byte-frozen — S23 does NOT touch them.
- The homepage `#promoStrip`/`#tgHead`/`#tgPill`/`#tgPillGo` + the
  `#about`/`.pagesfoot` footer byte-frozen (decision 65).
- Fail-closed everywhere; logical CSS properties only; responsive + RTL/LTR
  clean; mobile 390 no horizontal scroll; the CTA touch target ≥44px (decision 70).
- `wrangler deploy` FORBIDDEN (use `wrangler versions deploy`); `main` is the
  canonical branch. IF a fix is needed, cut a `fix/post-m10-hardening` branch
  from `main` + the fix + a fresh `wrangler versions upload` + deploy; NEVER
  force-push or rewrite published git history.
- Production deploys need NEW owner approval (the S22 approval does NOT carry
  forward). IF a critical bug is found, STOP + present the bug + the proposed
  fix + the deploy plan to the owner.

**Data provenance:** S23 is a DISCOVERY + DOCUMENTATION session. The read-only
exploration (curl + the agent-browser) writes only the visit beacon + the
change-only archive sync (exactly what a normal page view writes — nothing
more). The await count stays exactly 3. NO credentials needed for the read-only
exploration beyond the agent-browser.

**Deliverables:** (1) `docs/mc/post-m10-hardening-report.md` (PRIMARY); (2)
screenshots in `docs/assets/s23-hardening/`; (3) the ledger/log/CHANGELOG
updates; (4) ONE atomic commit (docs only — UNLESS a critical bug fix lands).

## Current state (machine)

- **Version:** `13.257-mcmatchcentre` (`src/config.ts` VERSION / `package.json`
  version `13.257.0.0`; kept in sync by `scripts/check-version-sync.js` +
  `scripts/check-stats.js` version-wiring pins; codename suffix is house style).
- **Deploy:** Cloudflare Worker `ucl-notifier`, deployed via
  `npx wrangler versions deploy` (versioned deploy + instant rollback). Current
  production deployment `ab1395ee-1a0f-47d1-8d3a-20d3d428d863` / version
  `10c0a004-ad27-46d6-aa11-33e40ab13b1b` (created 2026-11-15T00:53:22Z — the
  post-merge re-deploy from `main` at `c058035`; byte-identical to the S22 deploy
  `4280f40f`/`898b454c`). Rollback: `npx wrangler rollback` restores the S22
  deploy (`4280f40f`/`898b454c`/`13.257-mcmatchcentre` — byte-identical to the
  current deploy); the second rollback target is `88649642`/`b48bae21`/
  `13.255-seospell` (the pre-Match-Centre deployment).
- **Production hostnames:** `sportsignal.ir` (apex, the Custom Domain) +
  `football.sportsignal.ir` (301s to apex except `/webhook`, `/api/`, `/admin`)
  + `ucl-notifier.sportsignal.workers.dev` (the workers.dev alias serving
  production traffic — NEVER treat as a scratch environment).
- **Branch:** `main` (canonical — the `feat/match-centre` branch was merged at
  `c058035` on 2026-11-15 per the owner's instruction). HEAD = `28ad836` (the
  post-merge re-deploy record). `feat/match-centre` is in sync at `28ad836`.
- **Commands:** `npm test` (tsc + the check scripts — must exit 0 before every
  push; the baseline is 3,573 OK / 0 failures). **npm only, never `bun install`**
  (breaks `@resvg/resvg-wasm`; AGENTS §11). Port for local dev: `npx wrangler dev`
  (8787; `wrangler.dev.toml` is the local config — git-ignored). Deploy:
  `CLOUDFLARE_API_TOKEN=… CLOUDFLARE_ACCOUNT_ID=a796fdfe… npx wrangler versions
  upload` → `npx wrangler versions deploy --version-id <id> --percentage 100 --yes`.
- **Cron triggers:** `*/10 * * * *` + `27 */4 * * *` (re-armed automatically via
  `wrangler versions deploy`). The pool `pool_matches: 490` + the
  `sched_next_ko: 2026-11-20T19:30:00.000Z` (the Bayern vs Köln kickoff) survived
  the deploy.
- **Key folders:** `src/` (worker modules; `scripts/lib/worker-src.js` carries
  the bundle file ORDER — co-evolve when adding files); `assets/` (immutable
  versioned client payload); `docs/` (RUNBOOK, HANDOFF, specs, audits,
  `docs/mc/` the Match Centre milestone docs, `docs/history/` session records);
  `docs/assets/` (screenshots — the `sNN-<name>/sNN-<viewport>-<subject>.png`
  convention).
- **Backups:** KV is live state; no routine file backups (RUNBOOK §5 has the KV
  key contracts). Never rename KV keys. KV schema is additive across versions
  (no renames, ever → rollback-safe).
- **Standing limits:** `_headers` sits at the 100-rule cap — every new pin needs
  a cap sweep. The cross-track SEO measurement window is Dec 4-8 (the GSC
  surfaces must stay byte-frozen through it). Team-name spellings must NOT
  change before ~Dec 8 (the S1 M2 spelling fix is mid-measurement).

## Previous sessions (the S02-S22 Match Centre track — CLOSED at M10)

The full session-by-session record lives in `MATCH-CENTRE-EXECUTION-LOG.md` +
`MATCH-CENTRE-MILESTONE-LEDGER.md`. The M10 production release report lives in
`MATCH-CENTRE-RELEASE-REPORT.md`. The M9 release-candidate review is at
`docs/mc/m9-release-candidate-review.md`; the S21 readiness doc is at
`docs/mc/m10-release-readiness.md`.

The S1/S2 SEO track (the team-name spelling fix + the title test) is parked at
the Dec 4 GSC gate (HANDOFF note preserved below for continuity).

### S1/S2 SEO track (parked at the Dec 4 GSC gate)

- **S1** ✅ closed (2026-11-10) — F3 spelling fix `13.255-seospell` (Leipzig
  «لایپزیگ», Nordsjælland «نورشلان», Roma «رم» + «آ س رم») is LIVE and
  mid-measurement (judge ~Dec 8). T-25 internal-link check wired into
  `scripts/seo-check.js`. Full record: `docs/history/2026-11-10-s1-seo-quickwins.md`.
- **S2** — title test («X مقابل Y» on half the match pages). **Parked 2026-11-10**
  (fired 24 days early, no GSC export). **Re-fire the unchanged S2 start prompt
  on/after Dec 4, 2026** with the fresh GSC export attached. Do NOT change
  team-name spellings before its ~Dec 8 read.
- **S3** — where-to-watch CLOSED (no Iran/Afghanistan source); lineups = owner
  decision (plan Q2).

## Next sessions (the post-M10 hardening track — proposed by S23)

S23 proposes (in the hardening report):
- **S24 — the perf/CWV review** — instrument the per-route CPU via the
  Cloudflare GraphQL API + review the CWV/RUM data from the Cloudflare Web
  Analytics beacon + optimize the 125-130KB HTML payload if the LCP is poor.
- **S25 — the a11y deep-dive** — axe-core + WAVE + NVDA/JAWS screen-reader
  testing + the full WCAG-AA audit.
- **S26 — the UI/UX iteration** — the owner's vibe-coding design rounds: the
  hero portrait rendering, the nav UX, the FAQ discoverability, the schedule
  density, the telegram CTA placement.
- **S27 (conditional, after Nov 20)** — the live/finished lifecycle
  verification that H1 defers (verify the `.mlive` pulse + the `.mfin` «پایان
  بازی» status + the result block against REAL live/finished matches in
  production).
