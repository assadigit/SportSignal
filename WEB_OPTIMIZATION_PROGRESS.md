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
| **Current phase** | 5 COMPLETE (v13.208-lastmod — deployed 2026-11-04, the seo_lastmod_v1 eviction fix + F-L1 + F-H3 beacon + IndexNow drain + the R11 og:locale completion) — Phase 6 (Accessibility & security) NOT STARTED |
| **Branch** | `main` |
| **Latest commit** | `53f847e` (fix(seo-check): the T-03 without-replacement sampler) on top of `ed74342` (seo: the R11 og:locale:alternate removal) and `888f1ae` (`v13.208-lastmod` — the Phase 5 code round) — all pushed & verified via `git ls-remote`. CI: `888f1ae` green 68/0; `ed74342` RED on a diagnosed sampler self-collision (the T-03 with-replacement draw flagged one URL against itself — K10 protocol: root-caused, sampler fixed, `53f847e` green **77/0**, T-09 `/` perf 62) |
| **Production** | **`13.208-lastmod`** (= the Phase 5 state: hash-driven sitemap lastmods that actually persist across children + a map-derived sitemap index, the 404 without a fictional canonical, the CF Web Analytics beacon live on every public page — Phase 7's RUM source, IndexNow parking that drains, og:locale fa_IR only). SW v109; `_headers` still exactly 100 rules (Phase 5 touched no client asset) |
| **Production health at close-out** | `/healthz` → `ok:true`, `version:13.208-lastmod`, `degraded:true` (the LIVE-mode match-evening KV profile continued: `kv_writes_day` 783→840 vs the 850 hard cap — bot-side cadence; `kv_writes_web` 405→439 incl. the one-time sitemap-map convergence writes; resets UTC midnight), `outbox_depth` 0, ticks completing (`last_cron_age` 3–9 min across checks). |
| **Last verified** | 2026-11-04 (Phase 5: `npm test` 2,552 green; deploy verify + ticks; the 3-cycle lastmod stability matrix + index-ETag stability — RESULTS §16.1; seo:check production 65/0 + CI 77/0; the metadata/JSON-LD 24-page audit §16.8; IndexNow end-to-end HTTP 200 §16.5) |
| **Next action** | Phase 6 — Accessibility & security per AUDIT §8: F-M3/M3b contrast + hero-card accessible name (CSS rename ceremony), F-M6 touch targets, F-L3 skip-link order, CSP eval (R13-bounded). GSC (K5) still owner-blocked; the Web Analytics dashboard check (24–48 h) is the owner's F-H3 confirmation step |

## Phase roadmap (spec §5)

| Phase | Name | Status | Notes |
| :--- | :--- | :--- | :--- |
| 0 | Reconnaissance & architecture audit | ✅ **COMPLETED** (2026-11-04) | Docs only: `WEB_OPTIMIZATION_ARCHITECTURE.md` + this tracker. |
| 1 | Comprehensive audit (perf/SEO/a11y/security baselines) | ✅ **COMPLETED** (2026-11-04) | `WEB_OPTIMIZATION_AUDIT.md` created — **FROZEN BASELINE**. Headline: sub-pages excellent (LH 91–99, CLS 0, TTFB 45–80 ms warm); homepage mobile is the outlier (LH perf 49–65, lab LCP 9.2 s) — root cause F-C1: SSR hero card ships `display:none` (`src/pages/public.ts:525`), LCP art chains behind client JS. 1 Critical / 3 High / 6 Medium / 10 Low findings. |
| 2 | Frontend optimization (CSS/JS/rendering/deps) | ✅ **COMPLETED** (2026-11-04, final state `53b05ef` `v13.204-foldsplit`) | The three-release arc: `a5a805d` `v13.202-threaddiet` (F-M2 fold-split + idle-initTz + carWarm-on-load; F-M1 31 dead CSS rules; cap sweep #10, SW v105, K2 fixed) → `2c2d78b` `v13.203-warmdefer` (the fold-split reverted on **contaminated** after-deploy Lighthouse runs — executed while a local wrangler dev + browsers ate the sandbox CPU; clean re-measurement of the revert landed exactly on the v13.201 baseline, proving the contamination) → `53b05ef` `v13.204-foldsplit` (the fold-split re-applied byte-identical to v13.202's 13.66.js after the clean evidence; cap sweeps #11–#12, SW v107). Final verified results (two independent sessions, RESULTS §2–§3 + §8): **JS bootup 0.9–1.6 → 0.35–0.4 s, TTI 9.9 → 7.4–8.9 s**, TBT median ~unchanged (242–590 ms, within variance; the 629 ms render monolith → interleavable ≤356–771 ms tasks), CLS 0 kept, LCP still F-C1-bound (Phase 3). Optional X-card i18n prune deferred (K12). |
| 3 | Assets & Core Web Vitals | ✅ **COMPLETED** (2026-11-04, `738d969` `v13.205-lcpreveal` + `db84622` `v13.206-scenediet`) | The two-commit arc: the code session shipped F-C1 (SSR slide-1 reveal + `fetchpriority=high` scene preload + SSR portraits via the generated hero-coverage map) + F-H1 (21 self-hosted `/emblems/*.webp`, ~1.2 MB third-party retired, SHARED tables.ts with the proven bot-neutrality argument — independently re-verified) + F-H2 (stadium-lights 197→71 KB, PC-HUD 125→59 KB + lazy, bg 93→40 KB via 13.80.css) + F-M7 (og 301→91 KB) + font audit (honest no-trim) + F-M4 (square emblems). The reconciliation close-out found the ONE defect — the preload shipped the **264 KB effectively-lossless scene-4** (the "4.9 KB" claim was wrong) — and fixed it as v13.206 (scene-4-2.webp, 44 KB, q90 VLM-verified). Verified: lab LCP 9.2 s → **5.5 s median** (discovery fixed: load delay 1,440→21–33 ms, obsLCP = FCP, one run 658 ms; the ≤2.5 s target NOT met — the residual is the Fast-3G render-blocking chain weight, Phase 4+ candidate); desktop 95→**100** (LCP 1.4→0.9 s); sub-page 100; CLS 0; a11y/SEO/BP 100. Full record: RESULTS §9–§14. |
| 4 | Cloudflare & caching | ✅ **COMPLETED** (2026-11-04, `v13.207-condget`) | F-M5 fixed (the two root causes: the unchecked edge-cache HIT path + the strict ETag comparison that CF's in-transit weakening made unmatchable — weak-comparison comparator per RFC 9110 §13.1.2 + 304 branches on both `wantCached` paths); ETag on the 5 machine-file surfaces; F-H3 evaluated via API → owner-action-required (OWNER_TODO §11, token lacks the permission, beacon verified absent); F-L6/F-L7 evaluated with numbers and deferred (RESULTS §15.5). Freshness ladder byte-identical (R12), zero new KV writes (R2), `npm test` 2,539. |
| 5 | Technical & multilingual SEO | ✅ **COMPLETED** (2026-11-04, `888f1ae`+`ed74342`+`53f847e` `v13.208-lastmod`) | The spot-audit found a LIVE F-05-class regression the frozen audit had marked green: `computeLastmods` replaced the whole seo_lastmod_v1 map per child render — cross-child eviction → every render re-stamped its FULL URL set with the clock (94/94 teams + 144/144 upcoming at one millisecond, live-proven twice) + a KV write per render + full-list IndexNow pings. Fixed: merge + change-only writes + a map-derived sitemap index (pages=CONTENT_VERSION). F-L1 fixed (404 emits no canonical/og:url). F-H3 EXECUTED (the Web Analytics beacon manually inserted in both templates — auto-inject never reaches Worker HTML; /privacy disclosure added). IndexNow park-drain fixed. F-M8 DECIDED: keep the hub canonical (documented with evidence, RESULTS §16.2). R11 completed (og:locale:alternate en_US removed; stance pinned). Metadata/JSON-LD 24-page audit clean. GSC remains owner-blocked (K5, honest limitation recorded). |
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

### Phase 2 — 2026-11-04 (frontend optimization; the first code-touching phase)

- **`a5a805d` `v13.202-threaddiet`** — F-M2 + F-M1 per AUDIT §8:
  - **F-M2 (JS main-thread diet, `public-13.65.js` → `13.66.js`):** boot
    render chain split at the fold (above-fold trio in the fetch task;
    nine below-fold render groups drain one per idle slot via
    `__belowFoldQueue`/`__idleSlot`, reading module `DATA`); `initTz`
    deferred to the load-idle callback (the ~459-option picker build +
    ~900 `Intl.DateTimeFormat` label constructions leave the sync boot
    chain) with a lazy-build guard in `toggleTz()`; `carWarm` rides the
    window `load` event instead of DCL (no art-prefetch competition with
    the LCP fetch). Poll cadence untouched.
  - **F-M1 (conservative CSS dead-rule pass, `public-13.78.css` →
    `13.79.css`):** 31 provably-dead rules / 2,654 B retired; verified
    dead against every client-referencing surface + a 145-pattern
    dynamic-class audit + git history; no live/state/lang/theme/media
    variant touched.
  - **Full ADR-006 ceremony:** `_headers` +2 pins with **cap sweep #10**
    (expired `/public-13.44.css` + `/public-13.45.css` pins pruned, files
    stay on disk, still 100 rules); SW `sportsignal-v104` → `v105`;
    `src/config.ts` VERSION `13.202-threaddiet`; `package.json`
    `13.202.0.0`; **K2 fixed** (`package-lock.json` version field
    13.197.0.0 → 13.202.0.0 in this first code-touching commit);
    `check-stats`/`check-mc-heroes`/`check-hero-carousel` re-pinned (two
    new gate checks pin the fold-split contracts + the dead-rule
    retirements); `hero-coverage.ts` bundle pointer regenerated; parity
    baseline re-frozen.
- **Phase 2 close-out docs commit** — created
  `WEB_OPTIMIZATION_RESULTS.md` (before/after evidence), updated this
  tracker, added the `CHANGELOG.md` v13.202 entry.
- **Deploy:** production redeployed per spec §14.4 step 4 (client assets
  changed) and verified (healthz version flip, ticks, immutable pins,
  SW v105, functional/visual round, bot-side fields healthy).
- **`2c2d78b` `v13.203-warmdefer` — the contaminated revert (same day,
  ~35 min later):** a second session's after-deploy Lighthouse runs
  measured the fold-split 2–3× worse (mobile TBT 1,810–2,570 ms) and
  reverted it to byte-13.65 + the carWarm load-event edit
  (`public-13.66.js`→`13.67.js`, SW v106, cap sweep #11 evicting the
  expired `/public-13.46.css` pin). **The runs were contaminated** — a
  local `wrangler dev` (workerd) + browsers were consuming the sandbox
  CPU during the measurement window; the clean re-measurement of v13.203
  landed exactly on the v13.201 baseline (RESULTS §8 proves it with the
  3-run table).
- **`53b05ef` `v13.204-foldsplit` — the verified re-apply (~50 min
  later):** the fold-split bundle returned byte-identical to v13.202's
  `13.66.js` (`public-13.67.js`→`13.68.js`, SW v107, cap sweep #12
  evicting `/public-13.47.css`; 13.67.js/13.66.js deployed artifacts
  stay on disk pinned one SEO TTL). Re-verified clean in the SAME
  browser/conditions as the baseline: **JS bootup 0.4 s (vs 0.9–1.6
  baseline), TTI 7.9–8.9 s (vs 9.5–9.9)** — reproducing the close-out
  session's independent numbers (0.35 s / 7.4 s). `npm test` 2,527
  green; CI seo-check success; live functional round re-verified
  (below-fold idle groups all render, 0 skeletons, 0 console errors,
  tz 459 options + guard, fa↔en round-trip).

## Files modified in Phase 2

| File | Change |
| :--- | :--- |
| `assets/public-13.66.js` | NEW — the diet bundle (13.65.js stays on disk, immutable) |
| `assets/public-13.79.css` | NEW — the dead-rule-pass stylesheet (13.78.css stays on disk) |
| `assets/_headers` | +2 immutable pins, cap sweep #10 (−2 expired pins, still 100 rules) |
| `assets/sw.js` | CACHE v104 → v105 |
| `src/pages/public.ts`, `src/seo/page-shell.ts` | asset references → 13.66.js / 13.79.css (+ release comments) |
| `src/hero-coverage.ts` | bundle pointer → public-13.66.js |
| `src/config.ts` | VERSION → `13.202-threaddiet` |
| `package.json`, `package-lock.json` | 13.202.0.0 (K2 drift fixed) |
| `scripts/check-stats.js`, `check-mc-heroes.js`, `check-hero-carousel.js` | harness re-pins + 2 new gate checks |
| `scripts/fixtures/public-page-baseline.html` | parity baseline re-frozen |
| `assets/public-13.67.js` | NEW — the v13.203 revert bundle (13.65 + carWarm-on-load; deployed artifact, stays on disk) |
| `assets/public-13.68.js` | NEW — the v13.204 re-apply bundle (byte-identical to v13.202's 13.66.js — the FINAL Phase 2 bundle) |
| `assets/_headers` | +2 more immutable pins (13.67.js, 13.68.js), cap sweeps #11 (−13.46.css) + #12 (−13.47.css), still 100 rules |
| `assets/sw.js` | CACHE v105 → v106 → v107 |
| `WEB_OPTIMIZATION_RESULTS.md` | NEW — Phase 2 measurement record (this phase's spec §4 deliverable) + §8 the contamination arc |
| `WEB_OPTIMIZATION_PROGRESS.md` | UPDATED — status, verification log, Git log (this file) |
| `CHANGELOG.md` | v13.202-threaddiet entry |

### Phase 3 — 2026-11-04 (assets & Core Web Vitals; the two-commit reconciliation arc)

- **`738d969` `v13.205-lcpreveal`** — the code round (committed + pushed +
  deployed by a parallel session while the close-out session was reading
  the mandatory docs — the K13 interrupted-session pattern, second
  occurrence; recovery protocol applied: reconcile, no re-work):
  - **F-C1 (P0):** the SSR mirror ships the slide-1 presentation — `mc-clean`
    + SSR portraits in both `.mc-port` containers (either-team HERO_ART
    coverage, decided via the GENERATED hero-coverage map — the exact
    `heroArtFor` contract, drift-gated by check-hero-coverage) + a
    media-scoped (≤899px) `fetchpriority="high"` preload for the scene
    art. Server-side only, zero bundle edit. No-JS visitors get the
    complete card.
  - **F-H1:** `LEAGUE_LOGOS` (SHARED `src/tables.ts`) points all 21 codes
    at the local `/emblems/*.webp` pack (256×256, 4–23 KB) — ~1.2 MB of
    third-party PNGs retire from `/`; the bot-neutrality argument ships
    in the file header (card.ts's import is dead, no bot module reads
    `.emblem`, harness stubs value-indifferent) and was INDEPENDENTLY
    re-verified by the close-out session's greps. F-M4 rides along
    (square intrinsic ratio).
  - **F-H2:** stadium-lights 197→71 KB, PC-HUD 125→59 KB (+lazy),
    bg 93→40 KB via `public-13.79.css`→`13.80.css`; F-M7: og 301→91 KB;
    font audit: honest no-trim. Ceremony: +5 `_headers` pins, cap sweep
    #13 (−5 expired JS pins, still 100), SW v108, harness re-pins + 3
    new gates, parity re-freeze.
- **`db84622` `v13.206-scenediet`** — the close-out defect fix: the v13.205
  preload shipped the **264 KB effectively-lossless scene-4.webp** (the
  commit message's "4.9 KB" claim was factually wrong — the v13.182
  inpainting save). Proven by the clean pre-fix Lighthouse series
  (discovery fixed, simulated LCP stuck 6.1–7.4 s) and fixed with
  `/ui/mc/scene-4-2.webp` (q90/alpha95, 44,352 B, −83 %, VLM-verified
  visually indistinguishable at 2× zoom; q85 rejected for glow-core
  banding). Ceremony: rename inside the `/ui/mc/*` wildcard (no cap
  sweep needed), SW v109, pins re-pinned + 1 new size-ceiling gate,
  parity re-frozen, `npm test` 2,531.

## Files modified in Phase 3

| File | Change |
| :--- | :--- |
| `src/seo/router.ts` | F-C1: heroArtSrv (hero-coverage map), SSR portraits, mc-clean emit, the scene preload (+ the v13.206 scene-4-2 URL) |
| `src/pages/public.ts` | The `.mc-clean .mc-scene` rule → scene-4-2.webp + release comments; F-H2 img swaps + dimensions + lazy |
| `src/tables.ts` | F-H1: LEAGUE_LOGOS → 21 local `/emblems/*.webp` (SHARED — bot-neutrality argument in header) |
| `src/seo/page-shell.ts`, `src/pages/admin-css.ts`, `src/pages/login.ts` | stylesheet → 13.80.css; bg → bg-2.webp |
| `assets/emblems/*.webp` (21), `assets/ui/mc/scene-4-2.webp`, `assets/ui/stadium-lights-2.webp`, `assets/ui/sportsignal-pc-match-hud-2.webp`, `assets/bg-2.webp` | NEW art (re-encodes + the emblem pack) |
| `assets/og/default.png` | recompressed in place (301→91 KB) |
| `assets/_headers` | +5 pins, cap sweep #13 (100 rules) |
| `assets/sw.js` | CACHE v107 → v108 → v109 (+ header comments) |
| `src/config.ts`, `package.json`, `package-lock.json` | 13.205 → 13.206 |
| `scripts/check-stats.js`, `check-mc-heroes.js`, `check-hero-carousel.js` | re-pins + 4 new gates (3× v13.205 + 1× v13.206) |
| `scripts/phase3-emblems.js`, `phase3-reencode.js`, `phase3-render-check.ts` | the Phase 3 tooling (committed by the code session) |
| `scripts/fixtures/*-baseline.html` | parity re-frozen (×2) |
| `CHANGELOG.md` | v13.205 + v13.206 entries |
| `WEB_OPTIMIZATION_RESULTS.md` | §9–§14 — the Phase 3 before/after record (this phase's spec §4 deliverable) |
| `WEB_OPTIMIZATION_PROGRESS.md` | UPDATED — status, verification log, Git log (this file) |

### Phase 4 — 2026-11-04 (Cloudflare & caching; the F-M5 round)

- **`v13.207-condget`** — F-M5 (the P0) + the machine-file ETags, all in
  `src/seo/router.ts` (website-only, §3.1):
  - **The diagnosis (two root causes, both live-verified):** (1) the
    `wantCached` edge-cache HIT path returned the stored body
    unconditionally — no If-None-Match branch; (2) `withEtag` compared
    strict-equals, which can never match in production because CF's
    compression layer weakens the strong ETags in transit (Worker sends
    `"ss-…"`, client receives `W/"ss-…"` — verified on every compressed
    class; fonts/WebP keep strong tags).
  - **The fix:** `etagMatches` (weak comparison per RFC 9110 §13.1.2 —
    W/-strip, comma lists, `*`) + `notModified304` (strips
    content-length/encoding, carries the restored public cache-control)
    wired into BOTH `wantCached` paths — the HIT branch after the x-ss-cc
    restore, the fresh-render branch after the edge-cache store (the
    rendered 200 still serves the next unconditional visitor).
  - **Machine files:** `/sitemap.xml`, `/sitemaps/{kind}.xml`,
    `/feed.xml`, `/calendar.ics`, `/api/matches.json` now render through
    `withEtag` (epoch-stable bodies; robots/llms/security.txt + OG pngs
    deliberately etag-less).
  - **New gate** `scripts/check-conditional-gets.js` (8 checks incl. the
    7 behavior vectors + the R12 ladder literals + the strict-comparison
    regression guard), registered in `npm test` (2,531 → **2,539**);
    check-stats release-wiring re-pinned; VERSION/package ceremony; NO
    client asset changed (SW stays v109, `_headers` untouched at 100).
  - **F-H3:** API-evaluated → owner-action-required (OWNER_TODO §11; the
    token lacks Web Analytics permission; `/cdn-cgi/rum` 404 + zero
    `cloudflareinsights` in the served HTML prove the zone setup was
    never completed). F-L6/F-L7 evaluated with numbers, deferred
    (RESULTS §15.5).
  - **Production verify:** healthz flip + ticks; the 11-URL
    conditional-GET matrix all-304 (RESULTS §15.3, incl. the sitemap
    cache-window transition note §15.3a); the response-class policy
    table §15.4; homepage 200 = 46,359 B br vs 304 = 0 B.

## Files modified in Phase 4

| File | Change |
| :--- | :--- |
| `src/seo/router.ts` | F-M5: `etagMatches` + `notModified304` + the two `wantCached` 304 branches; `withEtag` refactored (stamps validators; the 304 decision moved to `wantCached`) and now wraps the 5 machine-file renders |
| `src/config.ts`, `package.json`, `package-lock.json` | VERSION → `13.207-condget` / 13.207.0.0 |
| `scripts/check-conditional-gets.js` | NEW — the 8-check conditional-GET gate |
| `scripts/seo-check.js` | NEW T-13 — the CI conditional-GET guard (etag presence ×5 + 304-on-replay per machine file, one retry for epoch flips; HTML 304 out of CI per the SWR-transient note) |
| `package.json` (test chain) | + check-conditional-gets registration |
| `scripts/check-stats.js` | the release-wiring check re-pinned (v13.207 title + VERSION/package regexes; SW pin stays v109) |
| `WEB_OPTIMIZATION_RESULTS.md` | §15 — the Phase 4 before/after record (this phase's spec §4 deliverable) |
| `WEB_OPTIMIZATION_PROGRESS.md` | UPDATED — status, verification log, Git log (this file) |
| `CHANGELOG.md` | v13.207-condget entry |
| `OWNER_TODO.md` | §11 NEW — the CF Web Analytics owner steps (F-H3); §2 status marker corrected to the K7 reality (all 15 bot UAs 200, verified 2026-11-04) |


### Phase 5 — 2026-11-04 (technical & multilingual SEO; the lastmod-honesty round)

- **`v13.208-lastmod`** — three commits: `888f1ae` (the code round),
  `ed74342` (the R11 og:locale completion), `53f847e` (the seo-check
  sampler fix). All website-only surfaces (§3.1):
  - **THE HEADLINE — the seo_lastmod_v1 cross-child eviction bug:** the
    Phase 5 "lastmod honesty" spot-audit found every sitemap child
    re-render stamping its FULL URL set with the render clock (live:
    94/94 teams + 144/144 upcoming at one render millisecond, advancing
    again across cache windows — the exact "now on every build" F-05
    forbids, plus a KV write per render and full-list IndexNow pings).
    Root cause: `computeLastmods` REPLACED the whole KV map with the
    calling child's candidates (each child evicted the others). Fix in
    `src/seo/files.ts`: MERGE (400-day stale prune on write) +
    strictly change-only writes; the sitemap INDEX now derives per-child
    `<lastmod>` from the per-URL family max (pages=CONTENT_VERSION)
    instead of `now` (the index ETag is now render-stable — proven
    `"ss-cd479d472db"` ×2). Post-fix live proof: teams kept 88/90 then
    67/92 stamps across fresh renders (only genuinely-changed URLs
    advanced on the LIVE match evening); upcoming kept 142/144, 139/144;
    competitions/archive re-rendered with identical stamps.
  - **F-L1:** the 404 builder no longer emits the fictional
    `canonical → /404` / `og:url → /404` (`HeadInput.path` optional;
    production-verified 0 canonical, 0 og:url, noindex intact).
  - **F-H3 EXECUTED** (the owner-step fallback, OWNER_TODO §11 step 6):
    this session's CF token HAS the Web Analytics read permission — the
    API showed the site EXISTS since 2026-10-13 (`auto_install:true`) but
    auto-injection never reaches Worker-rendered HTML (0 beacons live,
    `/cdn-cgi/rum` 404). The manual snippet (public token
    `fb7e7f1d…`) now rides BOTH HTML templates (public.ts + page-shell);
    `/privacy` gained the honest disclosure section; OWNER_TODO §11
    updated to done-by-code + the 24–48 h dashboard check. Phase 7's
    field-CWV source now exists.
  - **IndexNow drain:** rate-limited parked URLs never re-sent (expired
    unsend); the send path now merges the park (zero extra KV writes).
    End-to-end verified once: key file 200 + a manual POST → HTTP 200.
  - **F-M8 DECIDED (no code change):** `/matches?page=2+` KEEPS the hub
    canonical — sliding-window pagination is not a stable indexable
    entity; every page-2+ fixture is discoverable via per-match pages +
    sitemap (all 144 upcoming, not page 1's slice) + hubs + feed;
    evidence in RESULTS §16.2.
  - **R11 completed:** hreflang stays correctly absent (0 links, no en
    URLs); the homepage's leftover `og:locale:alternate=en_US` removed
    (implied a crawlable English variant that doesn't exist); stance
    pinned in the gate.
  - **Metadata/JSON-LD spot-audit:** 16 templates + 8 dynamic samples —
    unique titles/descs (except the deliberate page-2 pair), all
    canonicals self-referencing, all JSON-LD parses with the honest
    type set (SportsEvent fields all real). T-04 green in CI.
  - **GSC (K5):** still owner-blocked — no credentials; the honest
    limitation + the standing owner ask recorded (RESULTS §16.7).
- **Gates:** NEW `scripts/check-seo-lastmod.js` (12 checks: the
  merge/no-write/hash-change/stale-prune/index-derivation behavioral
  vectors + the F-L1/F-H3/IndexNow/R11 source contracts) registered in
  `npm test` → **2,552 checks, exit 0**; the public-page parity baseline
  re-frozen twice via the reviewed `--update` path (the beacon + the
  og:locale line — the only intended output changes); check-stats
  v13.208 release-wiring pin; NO client asset changed (13.68.js /
  13.80.css / SW v109 all stay).
- **CI:** `888f1ae` 68/0 green; `ed74342` RED → diagnosed as the T-03
  with-replacement sampler flagging ONE URL against itself (verified
  listed exactly once across children — K10 protocol: root-caused,
  fixed without replacement, `53f847e` **77/0** green, T-09 `/` perf 62).
- **Deploy:** two deploys (`e8fea8b9-…` then `5e22b84c-…` with the
  og:locale follow-up); healthz `13.208-lastmod` ≤15 s, `ok:true`,
  ticks completing; production seo:check 65/0 (CI 77/0); beacon live on
  every public page family; og:locale:alternate 0 occurrences.

## Files modified in Phase 5

| File | Change |
| :--- | :--- |
| `src/seo/files.ts` | THE FIX: `computeLastmods` merge + change-only write + 400d stale prune; `buildSitemapIndex` derives per-child lastmod from the map (drops the unused getSeoCtx call) |
| `src/seo/page-shell.ts` | F-L1: `HeadInput.path` optional, canonical/og:url conditional; F-H3: the Web Analytics beacon before `</body>` |
| `src/seo/pages-static.ts` | F-L1: `build404Page` passes no path; /privacy: the CF Web Analytics disclosure section + the updated summary line |
| `src/pages/public.ts` | F-H3: the beacon; R11: `og:locale:alternate=en_US` removed |
| `src/seo/indexnow.ts` | the parked-URL drain on the send path |
| `src/config.ts`, `package.json`, `package-lock.json` | VERSION → `13.208-lastmod` / 13.208.0.0 |
| `scripts/check-seo-lastmod.js` | NEW — the 12-check lastmod-honesty gate (extract+eval behavioral vectors) |
| `scripts/check-stats.js` | the v13.208 release-wiring pin (v13.207 → HISTORICAL) |
| `scripts/seo-check.js` | T-03 samples WITHOUT replacement (the self-collision false positive) |
| `scripts/fixtures/public-page-baseline.html` | re-frozen ×2 (the beacon; the og:locale line) |
| `WEB_OPTIMIZATION_RESULTS.md` | §16 — the Phase 5 record |
| `WEB_OPTIMIZATION_PROGRESS.md` | UPDATED — status, roadmap, this section, verification + git logs (this file) |
| `CHANGELOG.md` | v13.208-lastmod entry |
| `OWNER_TODO.md` | §11 → done-by-code + the 24–48 h dashboard check; the summary line |


## Known issues, blockers & deferred work

| # | Item | Type | Raised |
| :--- | :--- | :--- | :--- |
| K1 | KV write budget watch — at Phase 0 audit: 838/1000 (`degraded:true`); counter has since reset (Phase 1 audit: 18/1000, `degraded:false`). Not caused by this project; keep NOT adding web-side KV writes (R2). | Observation | Phase 0 |
| K2 | **RESOLVED (Phase 2)** — `package-lock.json` version field now 13.202.0.0, matching package.json (fixed in the first code-touching commit `a5a805d` per the plan). | Hygiene | Phase 0 |
| K12 | Phase 2 optional item **deferred by design**: the 18 documented inert X-card i18n keys were not pruned (optional/low-priority per AUDIT §8; kept the phase's diff surface minimal). Candidate for the next bundle-touching round. | Deferred | Phase 2 |
| K13 | Phase 2 session-interruption recovery: the code round (`a5a805d`) had been committed, pushed and deployed by an interrupted session; the close-out session reconciled (no re-work), verified acceptance end-to-end and completed the missing documentation. No duplicate commits. **Recurred in Phase 3** (`738d969` landed mid-docs-reading) — the recovery protocol held both times; treat it as the standing pattern for this program. | Resolved (×2) | Phase 2 |
| K15 | **Phase 3 LCP honesty:** the ≤ 2.5 s lab-LCP acceptance target is NOT met (median 5.5 s, from 9.2 s). The F-C1 discovery mechanics are proven fixed (load delay 1,440→21–33 ms, priority-hinted, discoverable, obsLCP = FCP); the residual is the Fast-3G simulated render-blocking chain weight (HTML 184 KB + CSS 135 KB + fonts + JS). Candidate Phase 4+ work: critical-chain diet. See RESULTS §10. | Open (documented) | Phase 3 |
| K16 | **Preload-asset-size lesson (Phase 3):** the v13.205 commit claimed a "4.9 KB" scene the file system said was 264 KB — a fetchpriority preload is only as good as the bytes it fronts. The v13.206 gate now pins the 30–50 KB ceiling so the lossless weight can never silently return. Always `stat()` the asset behind a preload claim. | Resolved (gate added) | Phase 3 |
| K17 | **The cross-cache-window audit lesson (Phase 5):** the seo_lastmod_v1 eviction bug was live for weeks while two audits and three optimization phases passed it — because every verification sampled within a single edge-cache window (the eviction only manifests ACROSS windows, when a foreign child renders in between). Any "X is stable/honest" claim about edge-cached derived state must be re-verified across at least one full TTL window with an interleaved foreign render. The new check-seo-lastmod gate pins the merge behavior; the live 3-cycle matrix is the template. | Lesson (gate added) | Phase 5 |
| K18 | **The sampler self-collision (Phase 5 CI):** `ed74342` reddened on "duplicate title: X (u & u)" — seo-check's T-03 sampled WITH replacement, so one URL drawn twice collided with itself in the seen-titles map. Root-caused (the URL was listed exactly once), fixed to draw without replacement (`53f847e`, green 77/0). Any future "duplicate" CI red should first be checked for a self-collision (same URL twice) before treating it as a site defect. | Resolved (sampler fixed) | Phase 5 |
| K14 | **Measurement-contamination incident (Phase 2, resolved same day):** the v13.203 revert shipped on Lighthouse runs taken while a local `wrangler dev` + browsers consumed the sandbox CPU (TBT appeared 2–3× worse); the clean re-measurement landed exactly on baseline and v13.204 re-applied the change. **The recorded lesson (RESULTS §8): kill every background process before any Lighthouse run; never ship a revert without a clean re-measurement of the reverted state; treat a surprising single-source regression as an artifact until reproduced.** | Resolved (lesson recorded) | Phase 2 |
| K3 | `package-lock.json.bak` is gitignored; npm-only toolchain (bun breaks resvg). | Constraint | Phase 0 |
| K4 | No staging environment — `wrangler dev` smoke is the only pre-prod gate (R8). | Constraint | Phase 0 |
| K5 | Google Search Console access NOT available (no credentials in session; owner completed DNS TXT verification 2026-10-11 per OWNER_TODO). Phase 5/7 needs owner-run reports or credentials. | Open question | Phase 0 |
| K6 | **RESOLVED (Phase 5, v13.208)** — the beacon now ships in both HTML templates (public.ts + page-shell.ts). The full API verification: the Web Analytics site existed since 2026-10-13 with `auto_install:true`, but automatic injection never reaches Worker-rendered HTML (0 beacons live, `/cdn-cgi/rum` 404) — the manual snippet (this session's token had the rum read permission) closed it. `/privacy` discloses it; OWNER_TODO §11 = done-by-code + the owner's 24–48 h dashboard check. **Phase 7 now has its RUM source** (data accumulates from deploy time). | Resolved | Phase 1 |
| K7 | ClaudeBot/Amazonbot 403 block from OWNER_TODO §2 (2026-10-11) is **resolved** — all 15 bot UAs return 200 (verified live 2026-11-04). | Resolved | Phase 1 |
| K8 | `wrangler.dev.toml` is git-tracked despite its header comment claiming git-ignored (resource IDs only, no secrets) — F-L2 hygiene note. | Hygiene | Phase 1 |
| K9 | **RESOLVED (Phase 4)** — F-M5 fixed in v13.207-condget: weak-comparison If-None-Match honored on both `wantCached` paths; curl-verified 304s on every cached class (RESULTS §15.3); the regression guard rides `npm test` (check-conditional-gets). | Resolved | Phase 1 |
| K10 | CI T-09 Lighthouse homepage gate (perf ≥ 40) is **flickering against the documented F-C1 variance** — observed 38 (fail) / 47 / 49 / 51 / 58 (pass) across five recent runs. Expect intermittent red CI until the Phase 3 LCP fix lands; a red T-09 on a docs-only commit is lab variance, not regression. | Observation | Phase 1 |
| K11 | The Phase 1 audit's own production traffic consumed ~33 web-side KV writes (SWR payload revalidations; `kv_writes_web` 0 → 33 during the session) — negligible vs the 1,000/day cap, noted for transparency; no persistent impact (counter resets daily). | Observation | Phase 1 |

## Telegram bot protection status

**Phase 3: NO Telegram bot files, configuration, secrets or behavior were
modified.** Verified by `git show --stat` review of both commits
(`738d969`: 47 files — assets, page templates, SEO shell/router, tables.ts
(the SHARED file carrying the bot-neutrality argument, independently
re-verified: card.ts's LEAGUE_LOGOS import is dead code, zero bot modules
read `.emblem`, the eval harness stubs the map empty), harness scripts,
fixtures, config, package files, changelog only; `db84622`: 13 files —
the scene re-encode + ceremony). Post-deploy healthz bot-side fields
healthy (heartbeat/last_cron fresh, `outbox_depth:0`, tick cadence
normal). No bot interactions were performed (no test messages, no token
use). The deploy shipped bot+web together per the single-artifact
architecture (R1); the bot-safety argument is the website-only diff +
full `npm test` green (2,531 checks incl. every bot suite).

## Verification log

| Date | Check | Result |
| :--- | :--- | :--- |
| 2026-11-04 | **Phase 5 session-start verification:** clone at `c45edc8` (clean, in sync — no K13 race); healthz `13.207-condget` = repo VERSION (kv_writes_day 783 — the R2 watch begins); `npm install` + `npm test` → exit 0, **2,539 checks** (the expected baseline) | ✅ |
| 2026-11-04 | **The lastmod eviction — pre-fix live evidence:** 94/94 teams + 144/144 upcoming + 6/6 comps + 21/21 archive each sharing ONE render-time millisecond; cross-window re-fetch ADVANCED the stamps (teams → 19:41:18.409, upcoming → 19:41:19.192) — the "now on every build" proof | ✅ (bug confirmed) |
| 2026-11-04 | **The lastmod fix — post-fix live stability (3 cycles):** C1 convergence (comps+archive one-time re-stamp as predicted); C2: teams kept 88/90, upcoming 142/144; C3: teams kept 67 + 25 honestly-changed (LIVE evening), upcoming 139/144, comps+archive identical; sitemap-index ETag render-stable (`"ss-cd479d472db"` ×2); index shows pages=CONTENT_VERSION + family maxima | ✅ |
| 2026-11-04 | `npm test` with the 12-check check-seo-lastmod gate + the new wiring pin → exit 0, **2,552 checks**; parity baseline re-frozen ×2 via the reviewed `--update` path (the 9-line beacon + the 1-line og:locale — the only intended output changes) | ✅ |
| 2026-11-04 | **wrangler dev smoke (R8):** healthz JSON, `/` 200+beacon, `/matches?page=2` → hub canonical, shell-404 (0 canonical, 0 og:url, noindex, beacon), `/privacy` disclosure, CONTENT_VERSION on the pages child; local 304 matrix (strong + weakened replays) | ✅ |
| 2026-11-04 | **Deploy ×2** (`e8fea8b9-…`, then `5e22b84c-…` with the og:locale follow-up): healthz `13.208-lastmod` ≤15 s, `ok:true`, outbox 0, ticks completing (3–9 min ages across checks) | ✅ |
| 2026-11-04 | **Production verification:** beacon ≥1 on every public family; 404 → 0 canonical/0 og:url/noindex; `/matches?page=2` → `/matches`; og:locale:alternate 0; /privacy disclosure live; IndexNow key file 200 + manual POST → **HTTP 200**; production `seo:check` **65/0** | ✅ |
| 2026-11-04 | **Metadata/JSON-LD audit (24 pages):** 16 templates + 8 dynamic samples — unique titles/descs (except the deliberate page-2 pair), self-canonicals everywhere, JSON-LD all-parse with the honest type set; hreflang 0 links (correct N/A) | ✅ |
| 2026-11-04 | **CI:** `888f1ae` green 68/0; `ed74342` RED (the T-03 sampler self-collision — "duplicate title: X (u & u)", the URL verified listed exactly once across children); root-caused + sampler fixed → `53f847e` **green 77/0**, T-09 `/` perf 62, `/matches/today` 97, `/teams` 96 | ✅ (K10 protocol exercised) |
| 2026-11-04 | `npm run seo:check` (production) with the NEW T-13 → **65 PASS / 0 FAIL** (all 9 T-13 assertions green: 4 machine files etag+304 + `/` etag; the HTML 304 half deliberately out of CI — the SWR transient, RESULTS §15.3a) | ✅ |
| 2026-11-04 | **CI seo-check on `f4f66f8` (the v13.207 code commit): SUCCESS first-try** — **68 PASS / 0 FAIL**; T-09 Lighthouse `/` perf 43 (inside the documented 43–65 K10 band, threshold 40), `/matches/today` 98, `/teams` 96 — no re-run needed | ✅ |
| 2026-11-04 | **Final conditional-GET matrix (post sitemap-window rollover): 44 PASS / 0 FAIL** — all 11 URLs (HTML ×5, sitemap index + 2 children, feed, calendar, matches.json): etag present + 304 on the delivered-etag replay + 200 on non-matching + ladder byte-identical; homepage 304 = 0 B vs 46,360 B br | ✅ |
| 2026-11-04 | **No-regression proof:** the homepage body is BYTE-IDENTICAL across the deploy (same 183,085 B, same ETag `W/"ss-d54f695f2a9cd"` pre- and post-deploy — the withEtag refactor changed zero HTML output); all Phase 3 structure markers present (scene-4-2, mc-clean, SSR portraits wiring, 13.68.js/13.80.css refs); ≥2 ticks verified (18:10 + 18:20 UTC, `last_cron_age` 1–3 min, outbox 0) | ✅ |
| 2026-11-04 | **Phase 4 session-start verification:** clone at `f74605e` (clean, in sync — no K13 race this time); healthz `13.206-scenediet` = repo VERSION; `npm install` + `npm test` → exit 0, **2,531 checks** (the expected baseline) | ✅ |
| 2026-11-04 | **F-M5 before-evidence (deployed v13.206):** conditional GET with the exact served ETag on `/matches/today` → **200 + full 27,983 B body** (twice; `cf-cache-status: HIT`, age 24) — the Phase 1 finding re-confirmed; plus the in-transit ETag weakening discovered (`"ss-…"` → `W/"ss-…"`) explaining why the old strict comparison could never match | ✅ |
| 2026-11-04 | **Response-class baseline (§10.1–10.7):** the 15-surface header matrix captured pre-change (immutable pins, HTML ladder, machine TTLs, API 60 s, no-store 404s/admin, brotli+zstd verified, the feed/ics compression-allowlist gap documented) | ✅ |
| 2026-11-04 | **F-H3 API evaluation:** token valid (zones/settings read) but `rum/site_info` GET → 10405 / POST → 10000 (no Web Analytics permission); `/cdn-cgi/rum` → 404; zero `cloudflareinsights` in the served HTML → owner-action-required, steps shipped as OWNER_TODO §11 | ✅ (documented) |
| 2026-11-04 | `npm test` on the v13.207 tree (router fix + 8-check gate + re-pin) | ✅ exit 0 — **2,539 checks** |
| 2026-11-04 | **wrangler dev smoke (R8):** `/healthz` JSON, `/` 200, `/nope` 404, `/api/card/nope` 404, `/admin` 200; **local 304 matrix all-green** (strong/weak/list/`*` forms on `/matches/today` + all 5 machine files; non-matching → 200); `seo:check:local` 56/1 (the 1 = a transient production 503 on a sampled match page, re-verified 200 ×3 immediately — K10-class, production still v13.206) | ✅ |
| 2026-11-04 | **Deploy `v13.207-condget`** (`npx wrangler deploy`, version `1d4ca832-…`): healthz flipped within 15 s; ticks completing (18:10 UTC tick, `last_cron_age` 1–2 min, outbox 0, `ok:true`); bot-side fields healthy | ✅ |
| 2026-11-04 | **Post-deploy conditional-GET matrix (11 URLs):** HTML ×5 + feed + calendar + matches.json → etag present + **304 on the delivered-etag replay** + 200 on non-matching; homepage 304 = 0 B vs 46,359 B br; sitemap family initially etag-less inside the pre-deploy 600 s cache window (§15.3a) → verified 304 after rollover | ✅ |
| 2026-11-04 | **Freshness ladder re-probe (R12):** every class byte-identical to the pre-change baseline (immutable 31536000, HTML `max-age=0, s-maxage=60, swr=300`, sitemaps 600, feed/ics 300, matches.json 60/300, API 60, robots 3600, 404 no-store, admin no-store) | ✅ |
| 2026-11-04 | **KV budget (R2):** zero new web-side KV writes (pure Cache API + headers); healthz `kv_writes_web` moved only with SWR revalidations; `kv_writes_day` 715→721 ≥ 700 → `degraded:true` (LIVE-mode match-evening bot cadence, pre-existing, resets UTC midnight — observation recorded, not caused by Phase 4) | ✅ |
| 2026-11-04 | **F-L6/F-L7 evaluations:** the JS tail = 40+6 files / 5.1 MB / zero wire cost / 43 `_headers` pins + 4 harness scripts + retention rule → deferred; early hints: zone off, no Link headers, win bounded ~TTFB ≈ ~1 % of lab LCP → not built (RESULTS §15.5) | ✅ (documented decisions) |
| 2026-11-04 | **Phase 3 session-start reconciliation:** `git fetch` revealed remote main moved `b6e1c46`→`738d969` (a parallel session had shipped the Phase 3 code round `v13.205-lcpreveal` + deployed mid-docs-reading — the K13 pattern again). Local fast-forwarded; production verified = `13.205-lcpreveal` (healthz, ok:true). No re-work performed (recovery protocol) | ✅ |
| 2026-11-04 | **Phase 3 code review (trust nothing):** `738d969` diff audited — the tables.ts bot-neutrality argument re-verified by independent greps (card.ts import dead, zero bot `.emblem` readers, harness stubs empty); the F-C1 router logic reads the GENERATED hero-coverage map (drift-gated); ceremony complete (+5 pins, sweep #13, SW v108). **One defect found:** the preload targets scene-4.webp at 263,812 B, not the claimed "4.9 KB" (the v13.182 lossless save) | ✅ (1 defect → v13.206) |
| 2026-11-04 | `npm install` + `npm test` on `738d969` | ✅ exit 0 — 2,530 checks |
| 2026-11-04 | **Pre-fix Lighthouse series (deployed v13.205, 5 clean mobile runs):** LCP 6.1–7.4 s BUT discovery proven fixed (load delay 21–33 ms vs audit 1,440 ms, requestDiscoverable/priorityHinted/eagerlyLoaded all true, obsLCP = obsFCP 1.5–2.5 s) — isolating the 264 KB scene-4 preload as the residual | ✅ (evidence for v13.206) |
| 2026-11-04 | v13.206 ceremony: scene-4-2.webp q90/alpha95 re-encode (44,352 B, VLM q-ladder reviewed at 2× zoom — q90 indistinguishable, q85 rejected for glow banding); references updated (public.ts rule, router preload, render-check, cardmock, fixtures); SW v109; pins + 1 new gate | ✅ |
| 2026-11-04 | `npm test` on `db84622` (after the parity --update re-freeze + the mc-heroes retirement gate re-pin) | ✅ exit 0 — **2,531 checks**, tsc 0 |
| 2026-11-04 | `wrangler dev` smoke (R8): 100 header rules parsed; `/healthz` JSON, `/` 200, `/nope` 404, `/api/card/nope` 404, `/admin` 200 (the seeded-KV render chase hit a wrangler-v4 CLI/dev storage split — file store vs sqlite — documented; the definitive render check moved to the post-deploy live HTML) | ✅ |
| 2026-11-04 | **Deploy `db84622`** (`npx wrangler deploy`, version bb078b03 + the header-comment re-deploy a469fc52): healthz `13.206-scenediet` ok:true; ticks completing (last_cron 4–10 min); outbox 0; kv_writes_day 602 | ✅ |
| 2026-11-04 | **Post-deploy asset/HTML verify:** scene-4-2.webp 200 + immutable; fresh HTML (after the 300 s render hold) ships the scene-4-2 preload + mc-clean rule + SSR portraits; SW live body md5-verified = v109 (`const CACHE` line — the line-8 header comment initially read as v108 was the historical-comment grep trap, fixed in the close-out commit); all v13.205 assets + retired files resolve | ✅ |
| 2026-11-04 | **After Lighthouse series (v13.206, 5 clean mobile runs):** LCP 4.6–6.4 s (median 5.5, from 9.2 s audit / 6.9 s pre-fix), TTI 6.2–7.6 s, CLS 0 (one 0.0012 micro-shift), obsLCP 658–2,500 ms; desktop perf 100 (LCP 0.9 s, was 1.4); `/matches/today` perf 100 (LCP 1.1 s); a11y/SEO/BP 100 everywhere | ✅ (K15: the ≤2.5 s target not met — documented) |
| 2026-11-04 | **Visual + functional round (production, agent-browser + VLM):** 7 audit viewports — no overflow, heights within fixture variance; mobile FA hero — scene-4-2 clean (no banding), portraits clean, layout intact; standings — 6 league boxes with local emblems crisp, RTL correct; EN round-trip fully Latin at DOM level (countdown 04/03/40, 20:00, "Sunday 8 November"); zero console errors. (One VLM pass hallucinated Persian digits in EN — disproven by DOM inspection, recorded as a VLM-reliability note) | ✅ |
| 2026-11-04 | CI seo-check on `738d969`: **failed T-09 `/` perf 36** (run taken ~2 min post-deploy, cold caches; the same run's advisory Lighthouse: `/` 65, sub-pages 97–98) — K10 class. CI on `db84622`: **failed on a crashed Lighthouse invocation + `/matches/today` 39-vs-40 flicker** (mid-deploy-transition; the same page measured perf 100 from the sandbox minutes later) — K10 class. Re-run triggered; verdict recorded in the Git log | ✅ (K10 documented; see below) |
| 2026-11-04 | `git fetch` + `git ls-remote` — remote main = `63a1d02` = local HEAD (no owner uploads since Phase 0) | ✅ |
| 2026-11-04 | Live `/healthz` version = repo `src/config.ts` VERSION = `13.201-carstack` (no divergence) | ✅ |
| 2026-11-04 | `npm install` + `npm test` (tsc + ~40 check scripts) | ✅ exit 0 — 2,525 checks OK, 0 failures |
| 2026-11-04 | Production timing suite: 16 routes × 3 runs (TTFB, wire bytes, headers, cache status) | ✅ recorded in AUDIT §1.1/§1.6 |
| 2026-11-04 | Lighthouse local (7 pages, mobile+desktop) + CI history (3 runs) | ✅ recorded in AUDIT §1.2 |
| 2026-11-04 | Viewport matrix 360–1920 (7 widths) + fa/en + carousel + countdown functional tests + VLM visual review | ✅ no overflow; all pass (AUDIT §2) |
| 2026-11-04 | Phase 2 close-out (parallel session): `npm test` on `a5a805d` re-verified 2,527 OK; CI seo-check success; Lighthouse ×5 clean (RESULTS §2–§3); VLM visual + functional round; deploy verify (healthz v13.202, SW v105, immutable pins live) | ✅ |
| 2026-11-04 | v13.203 revert: `npm test` 2,527 OK on `2c2d78b`; CI success; deploy verify (healthz v13.203); **clean re-measurement = baseline** (the contamination proof, RESULTS §8) | ✅ (but see K14) |
| 2026-11-04 | v13.204 re-apply (final): `npm test` 2,527 OK on `53b05ef`; CI seo-check **success**; deploy verify (healthz `13.204-foldsplit`, `ok:true`, `degraded:false`; 13.68.js 200 + immutable; HTML references 13.68/13.79; SW v107); clean Lighthouse ×3+desktop reproduced bootup 0.4 s / TTI 7.9–8.9 s; live functional round (idle groups render, 0 skeletons, 0 console errors, tz guard, fa↔en) | ✅ **Phase 2 final** |
| 2026-11-04 | Final docs commit `a04ace4` (docs-only, 3 .md files) CI: **failed twice on transient production data states, then SUCCESS on re-run** — run 1 (13:29): duplicate `matches/newcastle-united-vs-arsenal-2026-11-21` slug (a transient duplicate fixture in the KV pool mid-sweep; verified GONE from the sitemap + payload minutes later); run 2 (13:34): duplicate `teams/atalanta-bc` + two 503s on `teams/liverpool`/`teams/manchester-united` (transient crawl-window stress; all four pages verified 200 immediately after; healthz `ok:true` throughout); run 3 (13:44): **success** — 68 PASS / 0 FAIL. Same class as K10: transient data-state CI reds, not regressions (a docs-only commit cannot alter runtime behavior) | ✅ (after 2 transient reds, documented) |
| 2026-11-04 | `npm run seo:check` (production) | ✅ **56 PASS / 0 FAIL** |
| 2026-11-04 | JSON-LD extraction + validation on 5 page families | ✅ valid, content-matched (AUDIT §3.4) |
| 2026-11-04 | Redirect/404/canonical matrix (18 URLs) + internal links (157 found / 25 sampled) + sitemap spot-check (12 URLs) | ✅ all as documented (AUDIT §3) |
| 2026-11-04 | `npm audit --omit=dev` | ✅ 0 vulnerabilities |
| 2026-11-04 | Cloudflare zone settings read-only (brotli/http3/early_hints/0rtt/minify) | ✅ recorded in AUDIT §1.5 |
| 2026-11-04 | GSC inspection | ⛔ NOT PERFORMED — no credentials (documented per spec §7.5, AUDIT §5) |
| 2026-11-04 | Phase 1 push → GitHub Actions `seo-check`: `101024f` **success** (attempt 1); `b5f77a3` backfill commit **failed once on a flaky T-09 lab run** (homepage mobile perf 38 < 40 threshold — pure Lighthouse variance of the documented F-C1 range, docs-only commit, zero code changes) → **re-run (attempt 2) SUCCESS**: `/` perf 47 / seo 100 / a11y 100 / BP 93, sub-pages 93–97, **PASS: 68 FAIL: 0** | ✅ both commits CI-green after re-run |
| 2026-11-04 | **Phase 2 session-start reconciliation:** `git fetch` revealed remote main moved `ddb1ce1`→`a5a805d` (an interrupted Phase 2 session had already committed+pushed+deployed `v13.202-threaddiet`). Local fast-forwarded; production verified = `13.202-threaddiet` (healthz). No re-work performed (recovery protocol) | ✅ |
| 2026-11-04 | **Phase 2 code review (trust nothing):** `a5a805d` diff audited — render-chain split preserves `SYNC_TS`/`__SS_SIG__`/herokeep guards; below-fold groups read module `DATA`; CSS diff = exactly 31 selectors removed / 0 added, all references comment-only across templates/SEO/bundles/sw | ✅ |
| 2026-11-04 | `npm install` + `npm test` on `a5a805d` | ✅ exit 0 — **2,527 checks OK**, 0 failures (282 names, 0 failures) |
| 2026-11-04 | GitHub API: `seo-check` check-run on `a5a805d` → **completed / success**; T-09 `/` perf 50 (pass), `/matches/today` 94, `/teams` 94; **68 PASS / 0 FAIL** | ✅ |
| 2026-11-04 | `wrangler dev` smoke (R8): `/healthz` health JSON, `/` 200, `/nope` 404, `/api/card/nope` 404, `/admin` 200 | ✅ |
| 2026-11-04 | Production post-deploy: `/healthz` `13.202-threaddiet` `ok:true` ×2 reads (heartbeat/last_cron 3→6 min — ticks completing); `outbox:0`; `kv_writes_day` 387→400; `/public-13.66.js`+`/public-13.79.css` 200 HIT immutable; old 13.65/13.78 still immutable; swept 13.44.css default headers; `sw.js` v105 | ✅ |
| 2026-11-04 | **Phase 2 measurements (5 mobile runs + desktop + sub-page, Lighthouse 13.6.0 vs frozen audit baseline):** TTI 9.9→7.4 s, JS bootup 0.9→0.35 s, LCP 9.2→6.5 s (F-C1 still open), TBT median 242 ms (207–320) vs 250 ms, 629 ms render-chain long task eliminated (max ≤356 ms), CLS 0, a11y 100/BP 96, desktop 95, sub-page 99; initTz cold-build micro-benchmark 147–260 ms unthrottled (~0.6–1.0 s at 4× throttle — the deferred work) — full record in `WEB_OPTIMIZATION_RESULTS.md` | ✅ |
| 2026-11-04 | Functional round (live production): fa↔en toggle round-trip (immediate nav + async hero re-render); tz panel opens populated (459 options); tz change round-trip re-renders kickoff (Tehran ۲۳:۳۰ → NY ۱۵:۰۰ → restored, `ss_tz` cookie written/restored); lazy-build guard (cleared→open→459 rebuilt); single-slide day → arrows hidden (C10); below-fold idle queue fully drained (0 skeletons) | ✅ |
| 2026-11-04 | Viewport matrix 360–1920 (7 widths): no horizontal overflow; page heights identical to audit baseline at ≥768 px | ✅ |
| 2026-11-04 | VLM visual review (fa/en × mobile/tablet/desktop, above- + below-fold): hero card complete (portraits, LaLiga lockup, crests, Persian names, countdown, kickoff, venue); below-fold fully rendered; EN/LTR fully localized; no blank boxes or broken styling | ✅ |
| 2026-11-04 | Console errors: zero on `/`, `/matches/today`, `/teams` | ✅ |
| 2026-11-04 | GSC inspection | ⛔ NOT PERFORMED — no credentials (unchanged since Phase 1; documented per spec §7.5) |
| 2026-11-04 | **Session close-out:** `git fetch` + rev-parse — remote `main` = `ab7b7ab` = local HEAD (Phase 1 push fully confirmed on GitHub; local tracking ref had been stale because pushes use the one-time token URL) | ✅ |
| 2026-11-04 | GitHub API (authenticated): `seo-check` check-run on `ab7b7ab` → **completed / success** | ✅ |
| 2026-11-04 | GitHub API: open pull requests = **0**; branches = **`main` only** → nothing to merge (single-branch repo, no feature branches) | ✅ |
| 2026-11-04 | Live `/healthz` re-verified at close-out: version `13.201-carstack` = repo `src/config.ts` VERSION, `ok:true`, `degraded:false`, `kv_writes_day:134` — every commit after the deployed code (`f70fe81`) is documentation-only, so **no redeploy** per spec §14.4 | ✅ |
| 2026-11-04 | `npm test` re-run before the close-out push (docs-only diff) | ✅ exit 0 — 2,525 checks OK, 0 failures |
| 2026-11-04 | `CHANGELOG.md` updated with the Phases 0–1 documentation-milestone entry (marked no-version-change / no-product-change) | ✅ |

## Git & deployment log

| Phase | Commit | Push | Deploy | Production verify |
| :--- | :--- | :--- | :--- | :--- |
| 5 | `888f1ae` (`v13.208-lastmod` — the lastmod eviction fix + F-L1 + F-H3 beacon + IndexNow drain + F-M8 decision) + `ed74342` (seo: the R11 og:locale:alternate removal) + `53f847e` (fix(seo-check): the without-replacement sampler) + this docs commit | `main` @ GitHub (one-shot token pushes, verified via `git ls-remote`); CI: `888f1ae` 68/0, `ed74342` red-on-sampler-noise → root-caused → `53f847e` **77/0** | **DEPLOYED** (`npx wrangler deploy` ×2 — server code changed; versions `e8fea8b9-…` + `5e22b84c-…`) | `/healthz` → `13.208-lastmod`, `ok:true`, ticks completing, outbox 0; the 3-cycle lastmod stability matrix + stable index ETag; beacon live on every public page; 404 canonical-free; og:locale:alternate 0; bot-side fields healthy |
| 4 | `v13.207-condget` (the code: router F-M5 fix + machine-file ETags + the 8-check gate + ceremony) + the Phase 4 docs commit (results/tracker/changelog/owner-todo) | `main` @ GitHub (one-shot token push, verified via `git ls-remote`) | **DEPLOYED** (`npx wrangler deploy` — server code changed, spec §14.4 step 4; version `1d4ca832-…`) | `/healthz` → `13.207-condget`, `ok:true`, ticks completing, outbox 0; the 11-URL 304 matrix green; ladder byte-identical; bot-side fields healthy |
| 0 | `a9c87c0` + `00c2e9f` + `63a1d02` (docs + tracker hash backfills) | `main` @ GitHub, verified via `git ls-remote`; CI seo-check green on all | **NOT DEPLOYED** (docs-only) | n/a (production = repo code state, verified via `/healthz`) |
| 1 | `101024f` (audit) + `b5f77a3` (tracker hash backfill) + `63a1d02→b5f77a3` CI verification note | `main` @ GitHub (one-shot token pushes, verified via `git ls-remote` → `ab7b7ab` after the final CI-note commit) | **NOT DEPLOYED** (documentation-only phase — spec §14.4) | n/a (production unchanged = `13.201-carstack`, re-verified via `/healthz` after push: `ok:true`, `degraded:false`) |
| 1 (close-out) | `578126f` (changelog + tracker session-close) + this hash-backfill commit | `main` @ GitHub (one-shot token push, verified via `git ls-remote` → `578126f`; backfill pushed immediately after) | **NOT DEPLOYED** (documentation-only — spec §14.4; production already equals repo code) | `/healthz` re-verified: `13.201-carstack`, `ok:true`, `degraded:false` |
| 2 | `a5a805d` (`v13.202-threaddiet` — F-M2 bundle rename 13.65→13.66.js, F-M1 stylesheet rename 13.78→13.79.css, ADR-006 ceremony, K2 fix; committed+pushed by the interrupted session) + the close-out docs commit (results/tracker/changelog — this session) | `main` @ GitHub (one-shot token pushes, verified via `git ls-remote`; CI `seo-check` **success** on `a5a805d`, docs commit verified after push) | **DEPLOYED** (`npx wrangler deploy` — client assets changed, spec §14.4 step 4; deployed with the code commit) | `/healthz` → `13.202-threaddiet`, `ok:true`, `degraded:false`, ticks completing, assets+pins+SW v105 live, functional/visual round green, bot-side fields healthy |
| 3 | `738d969` (`v13.205-lcpreveal` — the code round, pushed+deployed by the parallel session) + `db84622` (`v13.206-scenediet` — the close-out defect fix) + this docs commit | `main` @ GitHub (one-shot token pushes, verified via `git ls-remote` → `db84622` + docs); CI seo-check on both code commits RED on first run (K10-class lab variance), **re-run SUCCESS 68/0** (`/` perf 43) | **DEPLOYED** (`npx wrangler deploy` ×2 — client assets changed; versions bb078b03 + a469fc52) | `/healthz` → `13.206-scenediet`, `ok:true`, `degraded:false`, ticks completing; scene-4-2 preload + mc-clean + SSR portraits live; `/emblems/*` live (0 external api-sports URLs); SW v109 md5-verified; all pins live; bot-side fields healthy |

---

## Next-session prompt

The complete, copy-paste-ready Phase 6 prompt is emitted at the end of the
Phase 5 session report (per repo convention; the authoritative master
specification is `SPORTSIGNAL_WEB_OPTIMIZATION_SPEC.md` §12 = Phase 6, and
the evidence-based targets live in `WEB_OPTIMIZATION_AUDIT.md` §6.1
(F-M3/F-M3b contrast + accessible name, F-M6 touch targets, F-L3 skip-link
order) + `WEB_OPTIMIZATION_RESULTS.md` §16 for the Phase 5 state this
phase builds on, and the K15/K16/K17/K18 lessons in this file).
