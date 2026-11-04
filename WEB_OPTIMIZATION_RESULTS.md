# SportSignal — Web Optimization · Phase 2 Results (Before/After Measurements)

> **Persistent results file** required by `SPORTSIGNAL_WEB_OPTIMIZATION_SPEC.md` §4
> (record before-and-after measurements, test conditions, improvements,
> regressions and remaining limitations — NEVER into the frozen
> `WEB_OPTIMIZATION_AUDIT.md`).
> **Phase 2 change under test:** commit `a5a805d`
> (`v13.202-threaddiet` — F-M2 JS main-thread diet + F-M1 conservative CSS
> dead-rule pass, per AUDIT §8 Phase 2 plan).
> **Measured by:** the Phase 2 close-out session, 2026-11-04.
> **Conditions:** production `https://sportsignal.ir` (HTTP/2, edge-cached),
> Lighthouse 13.6.0 CLI (the audit's version) with headless Chrome for
> Testing 143, default mobile throttling (4× CPU slowdown, Fast 3G) unless
> noted. Lab measurements only — no field/CrUX data exists yet (F-H3,
> Phase 4 scope).

---

## 1. What changed (the treatment)

| Asset | Before (13.201-carstack) | After (13.202-threaddiet) | Δ raw |
| :--- | :--- | :--- | :--- |
| Client bundle | `public-13.65.js` — 155,138 B | `public-13.66.js` — 158,619 B | +3,481 B (idle-sequencer + guards + comments) |
| Stylesheet | `public-13.78.css` — 136,727 B | `public-13.79.css` — 135,354 B | −1,373 B (31 dead rules, 2,654 B incl. comments) |
| Service worker | `sportsignal-v104` | `sportsignal-v105` | cache-evict rename |
| `_headers` | 100 rules | 100 rules (cap sweep #10: `/public-13.44.css` + `/public-13.45.css` pins pruned, files retained) | +2 pins −2 pins |

**F-M2 (JS main-thread diet), user-invisible by construction:**

1. **Boot render chain split at the fold** — in `load()` after the payload
   fetch, the above-fold trio (`updateBigBar`/`renderHeroSpot`/
   `fitHeroNames` — hero card + countdown + name fit) stays in the fetch
   task; the nine below-fold render groups (favbar/finished, standings,
   cups, ucl, uclspot, topspot, week, live, skeleton-drop) drain one group
   per idle slot via the new `__belowFoldQueue`/`__idleSlot`
   (`requestIdleCallback`, timeout 1200 ms; `setTimeout(0)` fallback).
   Groups read module `DATA` (never a stale captured payload), preserve
   order, and a thrown group no longer skips the rest of the chain.
2. **`initTz` deferred off the sync boot chain** — the timezone picker
   build (`Intl.supportedValuesOf` scan + 459 `<option>` elements +
   ~900 `Intl.DateTimeFormat` label constructions) now runs at the head
   of the load-idle callback; `toggleTz()` gained a lazy-build guard
   (`tzsel` with zero options → synchronous `initTz()`) so the panel can
   never open unpopulated (browser-verified: cleared → open → 459
   rebuilt).
3. **`carWarm` moved from DOMContentLoaded to window `load`** — the
   all-slides art prefetch no longer competes with the LCP art fetch on
   a throttled link (slate-change warm + next-slide preload remain the
   primary paths).
4. Poll cadence untouched (`__pollTick` 5 s, `tickBigBar` 1 s).

**F-M1 (CSS dead-code pass):** 31 provably-dead selectors retired —
`.bb-end`, the `.bigcard`/`.bigcard-head` family incl. `[data-theme=light]`
+ reduced-motion variants, `.uclspot-logo`/`.ucl-head`/`.ucl-emblem`, the
`.empty.loading-empty` trio, `.hero-mcard .t-icon`/`.v-icon`,
`.mc-port img.mc-fill`. Every removal was verified dead against every
client-referencing surface (page templates, all 11 `src/seo` modules, both
JS bundles, live production HTML of 4 page families) + a dynamic-class
audit of all 145 `className`/`classList` construction patterns + git
history. Conservative by design: the Lighthouse 68.7% "unused" figure is
mostly other pages'/other states' rules — page-scoped, not dead; no live,
state, lang, theme or media-variant rule touched; no `@keyframes`
orphaned.

---

## 2. Homepage `/` mobile — lab Core Web Vitals (Lighthouse 13.6.0)

**Before** = frozen Phase 1 audit baseline (AUDIT §1.2, production
13.201-carstack). **After** = 5 runs against production 13.202-threaddiet
(2026-11-04), median with min–max range:

| Metric | Before (frozen baseline) | After (median of 5) | Verdict |
| :--- | :--- | :--- | :--- |
| Performance score | 65 (cross-source range 49–65) | **68** (64–72) | improved |
| FCP | 2.3 s | 2.2 s (2.2–2.7) | ~same |
| **LCP** | **9.2 s** | **6.5 s (5.9–6.9)** | **−2.7 s** (see honesty note) |
| **TBT** | **250 ms** | **242 ms (207–320)** | modest (see §3) |
| **TTI** | **9.9 s** | **7.4 s (7.1–7.9)** | **−2.5 s** |
| **JS bootup** (`bootup-time`) | **0.9 s** | **0.35 s (0.3–0.4)** | **−0.55 s** |
| Speed Index | 4.6 s | 3.8 s (2.9–4.1) | improved |
| CLS | 0 | 0 (max 0.0002) | preserved |
| Long tasks | 6 (audit run) | 11–15, max 356 ms | restructured (§3) |

**Honesty notes:**

- **LCP is still F-C1's problem** (root cause = SSR hero ships
  `display:none`; the art chains behind client JS — Phase 3 scope). The
  9.2 → 6.5 s movement is partly real (the `carWarm` DCL→load change
  removes the art-prefetch competition with the LCP fetch) and partly
  run-to-run/data variance; it must NOT be claimed as the F-C1 fix. The
  2.5 s "good" target remains unmet until Phase 3.
- **TBT median 242 ms vs 250 ms is within lab variance** — the honest,
  structural claim is in §3: the single render-chain long task is gone,
  replaced by interleavable ≤356 ms tasks, and the FCP→TTI window shrank
  2.5 s. TBT as a scalar is a noisy summary of that structure.
- Different fixture day than the audit (data-driven render cost differs);
  both sides measured against live production with identical tooling.

## 3. Long-task structure + the deferred-work receipt (F-M2 evidence)

- **Before (audit §1.5):** 6 long tasks, TBT 250 ms, TTI 9.9 s, "bootup
  0.9 s"; the previous session's pre-change runs additionally captured a
  single **~629 ms render-chain long task** after the payload fetch (the
  concrete F-M2 finding the split targets).
- **After (5 runs):** 11–15 long tasks, largest 250–356 ms, attributed to
  the bundle's post-LCP carousel/render window; the 629 ms monolith is
  gone — the chain now yields between groups (rIC slots), keeping the
  window responsive.
- **Direct micro-benchmark of the deferred `initTz` work (production
  page, unthrottled desktop CPU, 3 cold runs):** **147 / 260 / 229 ms**
  (median ~230 ms) to build 459 options + 449 `tzInfo` labels (~900
  `Intl.DateTimeFormat` constructions). Under Lighthouse's 4× mobile
  throttle this was ~0.6–1.0 s of boot-window main-thread blocking — now
  scheduled after `load()` in idle time, outside the FCP→TTI window,
  which is exactly the JS-bootup 0.9 → 0.35 s and TTI 9.9 → 7.4 s
  movement above.
- **Wire weights (immutable, br-class on the wire):** 13.66.js serves at
  158,619 B raw (52–55 KB br on the wire, HIT) — +3.5 KB raw for the
  sequencer; 13.79.css 135,354 B raw (~43 KB br).

## 4. Sub-pages + desktop (regression watch)

| Page / mode | Before (frozen baseline) | After (2026-11-04) |
| :--- | :--- | :--- |
| `/` desktop | perf 95 · FCP 0.6 s · LCP 1.4 s · TBT 10 ms · TTI 1.8 s | perf 95 · FCP 0.6 s · LCP 1.4 s · TBT 10 ms · TTI 1.8 s |
| `/matches/today` mobile | perf 99 · LCP 1.6 s · TBT 0 | perf 99 · LCP 1.6 s · TBT 9 ms |
| `/` mobile a11y / BP (Lighthouse) | 96 / 96 | **100 / 96** |
| CI T-09 (push `a5a805d`) | — | `/` perf **50** (pass, within F-C1 variance), `/matches/today` 94, `/teams` 94; **68 PASS / 0 FAIL** |

Sub-pages were already excellent and are unchanged — no regressions.

## 5. Functional + visual regression round (production, live)

- **Viewport matrix (7 audit widths, live):** no horizontal overflow at
  360/390/430/768/1024/1440/1920; page heights 10,085 / 10,047 / 9,964 /
  9,413 / 8,456 / 6,550 / 6,572 px — **identical to the audit baseline at
  ≥768 px** (mobile deltas are fixture-data differences, not layout).
- **VLM spot review (fa + en, mobile/tablet/desktop, above- + below-fold):**
  hero card renders complete (Atlético/Barça portraits, LaLiga lockup,
  crests, Persian names, countdown tiles «۰۴ روز / ۰۷ ساعت / ۰۶ دقیقه»,
  kickoff «۲۰:۰۰» + «پنجشنبه ۱۷ آبان», venue); below-fold fully rendered
  (all idle-queue sections populated — match cards with crests/names/
  times, top-spot badges, standings); EN/LTR renders fully localized
  («CLUB ATLÉTICO DE MADRID», English countdown/date, «فا» toggle). No
  blank boxes, no broken styling. (Screenshots on file from the session.)
- **Functional round:** fa↔en toggle (immediate nav translation + async
  hero/list re-render — matches audit §2.3 behavior); tz panel opens
  populated (459 options); **tz change round-trip re-renders kickoff time
  correctly (Tehran «۲۳:۳۰» → New York «۱۵:۰۰» → restored, `ss_tz` cookie
  written/restored)**; lazy-build guard verified (options cleared → open →
  459 rebuilt); single-slide day → carousel arrows correctly hidden (C10);
  below-fold sections all rendered with 0 skeletons left after idle drain.
- **Console:** zero errors/warnings on `/`, `/matches/today`, `/teams`.
- **`wrangler dev` smoke (R8):** `/healthz` health JSON (not 500/1101),
  `/` 200, `/nope` 404, `/api/card/nope` 404, `/admin` 200.

## 6. Production + bot verification (post-deploy)

- `/healthz`: `ok:true`, `version:13.202-threaddiet`, heartbeat/last_cron
  ≤ 6 min across two reads (ticks completing), `outbox_depth:0`,
  `kv_writes_day` 387→400 (normal tick cadence, well under the 700 soft
  governor), `degraded:false`.
- Assets live: `/public-13.66.js` + `/public-13.79.css` → 200, edge HIT,
  `Cache-Control: public, max-age=31536000, immutable`; old
  `public-13.65.js`/`public-13.78.css` still resolve immutable
  (retention rule); swept-pin files (`public-13.44.css`) resolve on
  default headers (files stay on disk); `sw.js` → `sportsignal-v105`.
- Curl timing from the measurement sandbox (adds transit vs the audit's
  location): `/` TTFB 76–128 ms warm HIT; `/matches/today` 92–194 ms;
  `/api/public-matches` 155 ms warm HIT.
- **Telegram bot:** zero bot files in the Phase 2 commit (verified by
  `git show --stat a5a805d`); bot-side healthz fields (heartbeat, cron,
  outbox) healthy post-deploy. No bot interactions were performed.
- **Gates:** `npm test` exit 0 — **2,527 checks, 0 failures** on `a5a805d`
  (re-verified locally in the close-out session); CI `seo-check` on
  `a5a805d` → completed/success.

## 7. Remaining limitations + observations for later phases

1. **F-C1 (P0, Phase 3):** homepage mobile LCP still 5.9–6.9 s lab — the
   SSR-reveal + priority scene-art fix is the decisive remaining win; the
   Phase 2 TBT/TTI work directly shortens the JS chain it lands on.
2. **TBT floor:** the remaining ~200–320 ms is the synchronous carousel
   build + hero render + image-decode attribution — inherent to the
   current design; further reduction rides Phase 3 (LCP/asset priority)
   rather than more scheduling.
3. **Optional Phase 2.3 (deferred by design):** the 18 documented inert
   X-card i18n keys were NOT pruned (optional per the plan; keeping the
   phase's diff surface minimal). Candidate for the next bundle-touching
   round.
4. **API cache observation (no change, for Phase 4 F-M5 context):**
   `/api/public-matches` serves `Cache-Control: public, max-age=60` on
   MISS but `public, max-age=14400` on the HIT copy (the v13.97 render-hold
   design — the stored copy carries the hold; public freshness rides
   `age`). Phase 2 touched no API files; recorded so Phase 4 doesn't
   misread it as a regression.
5. **Lab-only evidence:** all numbers above are lab (Lighthouse/curl);
   field CWV/INP remain unmeasured pending F-H3 (CF Web Analytics RUM,
   Phase 4).

---

*Frozen baseline reference: `WEB_OPTIMIZATION_AUDIT.md` (Phase 1 — never
overwritten). Phase status: `WEB_OPTIMIZATION_PROGRESS.md`.*

---

## 8. The v13.203 → v13.204 measurement-contamination arc (Phase 2, same day)

> **Honesty record.** The same-day sequence below is preserved verbatim so
> future sessions never repeat the mistake — and never trust a single noisy
> measurement source.

1. **v13.202 shipped the fold-split** (§1–§6 above). CI green, VLM visual
   pass, functional pass, `npm test` 2,527.
2. **A second session ran after-deploy Lighthouse runs and measured it
   2–3× WORSE** (mobile TBT 1,810 / 2,370 / 2,570 ms vs the 300–1,060 ms
   baseline; JS-bundle long-task totals 2,389–2,802 ms) and **reverted the
   fold-split** as `v13.203-warmdefer` (`2c2d78b`; bundle byte-13.65 plus
   only the `carWarm` load-event deferral). The revert's release comments
   claimed per-group layout passes + rIC-timeout forcing as root cause.
3. **The contamination proof:** the revert session then re-measured
   v13.203 **under clean conditions** (all background processes killed —
   the earlier after-deploy runs had executed while a local `wrangler dev`
   (workerd) + browsers consumed the sandbox CPU) and landed **exactly on
   the v13.201 baseline**:

   | Run (mobile, clean, Chrome 156) | Perf | LCP | TBT | bootup | TTI | long tasks | JS-bundle ms | max task |
   | :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- |
   | v13.201 baseline ×3 | 52/60/66 | 5.9–6.5 s | 1,060/590/300 | 0.9–1.6 s | 9.5–9.9 s | 8–14 | 533–926 | 296–629 |
   | v13.203 revert ×3 | 59/64/49 | 6.1–7.3 s | 650/340/1,020 | 1.3–1.4 s | 9.3–10.2 s | 9–13 | 660–887 | 447–584 |

   The revert restored the baseline byte-for-byte, so the two rows are
   statistically identical — meaning the "2–3× regression" seen in step 2
   was **sandbox CPU contention during the measurement window, not the
   code**. The structural "root cause" in the revert commit message was
   wrong.
4. **v13.204-foldsplit re-applied the fold-split byte-identical to
   v13.202's `13.66.js`** (`53b05ef`, `public-13.68.js`; SW v107; cap
   sweep #12 evicting the expired `/public-13.47.css` pin; the
   `13.67.js`/`13.66.js` deployed artifacts stay on disk pinned one SEO
   TTL). Re-verified clean (same browser as the baseline rows above):

   | Run (mobile, clean, Chrome 156) | Perf | LCP | TBT | bootup | TTI | long tasks | JS-bundle ms | max task |
   | :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- |
   | v13.204 re-apply ×3 | 61/54/57 | 6.0–7.7 s | 420/1,140/590 | **0.4 s** | **7.9–8.9 s** | 11–19 | 1,093–1,414 | 572–771 |
   | v13.204 desktop ×1 | 93 | 1.4 s | 140 ms | **0.2 s** | 1.9 s | 3 | 295 | 295 |

   **The improvement reproduced in a second, independent session/browser:**
   JS bootup **0.9–1.6 s → 0.4 s** (mobile) and **0.5 → 0.2 s** (desktop);
   TTI **9.9 → 7.9–8.9 s** (mobile). TBT median is unchanged within
   variance (590 vs 590 ms) — the honest claim is structural (bootup/TTI +
   the monolith → interleavable tasks), consistent with §2–§3. The higher
   JS-bundle long-task *totals* reflect per-group task attribution (more
   tasks above the 50 ms threshold each carry attribution), not more
   user-facing blocking (TTI/bootup improved).
5. **Final state (Phase 2 close):** production runs
   **`13.204-foldsplit`** (= the fold-split bundle + the F-M1 CSS pass +
   `carWarm` load-event deferral). CI seo-check **success** on `53b05ef`;
   `npm test` **2,527 checks, 0 failures**; live functional round
   re-verified post-re-apply (all below-fold idle groups render —
   topSpot 10 / uclSpot 8 / weekBox 16 / finished 6 children, 0 skeletons,
   0 console errors, tz picker 459 options + open/close + lazy-build
   guard, fa↔en round-trip, hero cards visible); healthz
   `ok:true, version:13.204-foldsplit, degraded:false`.

**Lesson recorded (for every later phase):** kill every background
process (dev servers, browsers, VLM calls) before any Lighthouse run;
treat a surprising single-source regression as a measurement artifact
until a clean re-run reproduces it; never ship a revert without a clean
re-measurement of the reverted state.


---

# PHASE 3 — Assets & Core Web Vitals (F-C1 + F-H1 + F-H2 + F-M7 + F-M4)

> **Change under test:** `738d969` `v13.205-lcpreveal` (the Phase 3 round —
> shipped + deployed by the code session) **+ `db84622` `v13.206-scenediet`**
> (the reconciliation close-out: the scene-4 re-encode defect fix).
> **Measured by:** the Phase 3 close-out session, 2026-11-04.
> **Conditions:** production `https://sportsignal.ir`, Lighthouse 13.6.0 CLI,
> headless Chrome 156, default mobile throttling (4× CPU, Fast 3G simulated),
> quiet sandbox (the K14 lesson applied — every run series preceded by a
> process check). Lab measurements only (F-H3 unchanged — no field source).

## 9. What changed (the treatment)

| Finding | Change | Commit |
| :--- | :--- | :--- |
| **F-C1 (P0)** | SSR ships the slide-1 presentation: `mc-clean` + SSR portraits in both `.mc-port` containers (when either hero team has HERO_ART coverage, decided via the GENERATED hero-coverage map — the exact `heroArtFor` contract, drift-gated) + a media-scoped (≤899px) `fetchpriority="high"` preload for the scene art. Server-side only, zero bundle edit. | v13.205 |
| **F-C1 defect fix** | The v13.205 preload pointed at the **264 KB effectively-lossless** `scene-4.webp` (the v13.182 inpainting save — the commit message's "4.9 KB" claim was wrong). Re-encoded as `scene-4-2.webp` **44,352 B (−83 %)**, q90/alpha95, VLM-verified visually indistinguishable at 2× zoom (glow band + crowd-edge crops; q85 rejected for glow-core banding). | v13.206 |
| **F-H1** | `LEAGUE_LOGOS` (SHARED `src/tables.ts`, bot-neutrality argument in the file header — verified by the close-out session's independent grep audit: card.ts's import is dead, no bot module reads `.emblem`, harness stubs value-indifferent) points all 21 codes at the local `/emblems/*.webp` pack (256×256, 4–23 KB each). **~1.2 MB of third-party `media.api-sports.io` PNGs retire from `/`.** Also resolves **F-M4** (square intrinsic ratio). | v13.205 |
| **F-H2** | `/ui/stadium-lights-2.webp` 197→71 KB (q68/aq68 — the ≤60 KB target yielded to preserve visual identity on the ~97 %-semi-transparent gradient content); `/ui/sportsignal-pc-match-hud-2.webp` 125→59 KB (q86) now `loading="lazy"` (phones never fetch the PC-only frame); `/bg-2.webp` 93→40 KB (q63) via the `public-13.79.css`→`13.80.css` rename; explicit dimensions on both hero imgs. | v13.205 |
| **F-M7** | `og/default.png` 301→91 KB (palette PNG, in place — 1-day freshness rule). | v13.205 |
| **Font audit** | Honest **no-trim**: all ten homepage font files serve live rules (Peyda 400–900 all used; MorabbaVF already one-file variable). | v13.205 |

## 10. Homepage `/` mobile — lab Core Web Vitals

**Baselines:** the frozen Phase 1 audit (v13.201, LCP 9.2 s), the Phase 2
final (v13.204, RESULTS §2/§8) and the close-out session's own **pre-fix
series against deployed v13.205** (5 runs, 16:00 UTC — isolating the
scene-4 defect). **After** = 5 runs against v13.206 (16:10–16:20 UTC):

| Metric | Audit (v13.201) | Phase 2 (v13.204) | v13.205 pre-fix (5 runs) | **v13.206 after (5 runs)** |
| :--- | :--- | :--- | :--- | :--- |
| Performance | 49–65 | 61/54/57 + 68 median (§2) | 0.50–0.57 | **0.51–0.61** |
| **LCP (simulated)** | **9.2 s** | 5.9–7.7 s | 6.1–7.4 s (median 6.9) | **4.6–6.4 s (median 5.5)** |
| **LCP resource load delay** | **1,440 ms** | — | **21–33 ms** | **21–30 ms** |
| Observed LCP (= FCP) | ~4.9 s+ (scene fetched at 4,865 ms unthrottled) | — | 1,501–2,450 ms | **658–2,500 ms** |
| TBT | 250 ms | 420–1,140 ms | 410–610 ms | 770–1,320 ms |
| TTI | 9.9 s | 7.4–8.9 s | 7.5–8.6 s | 6.2–7.6 s |
| JS bootup | 0.9 s | 0.35–0.4 s | 0.3–0.4 s | 0.2–0.6 s |
| CLS | 0 | 0 (max 0.0002) | 0 | 0 (one run 0.0012, unattributed micro-shift) |

**The F-C1 mechanics are proven fixed** (Lighthouse's own LCP-discovery
insight): `requestDiscoverable: true`, `priorityHinted: true`
(fetchpriority=high applied), `eagerlyLoaded: true` — vs the audit's
`requestDiscoverable: false` + 1,440 ms load delay. The scene paints with
first paint (observed LCP = observed FCP in every run, one run at 658 ms).

**Honesty notes:**

- **The ≤ 2.5 s lab-LCP target is NOT met** (median 5.5 s). The discovery
  half of F-C1 is fixed (33 ms load delay, priority-hinted, discoverable);
  what remains is Lantern's Fast-3G simulation of the render-blocking
  critical chain itself: HTML 184 KB + CSS 135 KB + 3 preloaded fonts
  (~98 KB) + the 44 KB scene on a 1.6 Mbps link, plus the 4× CPU
  simulation of the boot chain. On unthrottled/4G-class connections the
  paint lands at 0.7–2.5 s (observed). Further lab-LCP reduction needs
  critical-chain weight work (HTML/CSS diet or prioritization — a natural
  Phase 4+ candidate), not more discovery fixes.
- **TBT 770–1,320 ms** is within the documented historical envelope
  (Phase 2 §8 recorded 420–1,140 ms on v13.204; the quiet 410–610 window
  of the pre-fix series was a calm-data period ~10 minutes earlier — live
  matches were starting around 17:45 UTC). Median TTI improved 7.5–8.6 →
  6.2–7.6 s.
- The v13.205 pre-fix series (6.1–7.4 s) vs Phase 2 (5.9–7.7 s): the
  264 KB preload ate the discovery win — the one defect the reconciliation
  audit found (see §12).

## 11. Sub-pages + desktop + regression watch

| Page / mode | Audit baseline | Phase 2 | **Phase 3 (v13.206)** |
| :--- | :--- | :--- | :--- |
| `/` desktop | perf 95 · LCP 1.4 s · TBT 10 ms | perf 95 · LCP 1.4 s | **perf 100 · FCP 0.3 s · LCP 0.9 s · TBT 100 ms · TTI 1.3 s · CLS 0.011** (the F-H2 re-encodes: bg-lights 197→71 KB) |
| `/matches/today` mobile | perf 99 · LCP 1.6 s | perf 99 · LCP 1.6 s | **perf 100 · LCP 1.1 s · TBT 0 · CLS 0** |
| a11y / SEO / BP (both) | 96–100 | 100 / 100 / 96 | **100 / 100 / 100** |

Desktop CLS 0.011 (was 0): an unattributed micro-shift + a 0.0001
font-swap — 9× below the 0.1 "good" threshold; recorded for the Phase 7
comparison rather than treated as a regression.

## 12. The reconciliation arc (honesty record)

The Phase 3 code round (`738d969`) was committed, pushed and deployed by a
parallel session while the close-out session was reading the mandatory
docs (the K13 interrupted-session pattern, second occurrence). The
close-out session's recovery protocol: **reconcile (no re-work) →
independently audit every claim → verify acceptance → complete the missing
documentation.** The audit found exactly one defect: the "scene-4 4.9 KB"
claim in the v13.205 commit message vs the real **263,812 B**
effectively-lossless file the preload shipped — proven by the clean 5-run
pre-fix series (discovery fixed, simulated LCP stuck at 6.1–7.4 s) and
fixed as `v13.206-scenediet` with the full ADR-006 ceremony. **Lesson:**
a fetchpriority preload is only as good as the bytes it fronts — always
`stat()` the asset behind a preload claim before believing the commit
message.

## 13. Functional + visual + production verification (v13.206)

- **Gates:** tsc EXIT 0; `npm test` EXIT 0 — **2,531 checks, 0 failures**
  (2,530 + the new v13.206 size-ceiling gate); `check-version-sync` green;
  parity baselines re-frozen (check-admin-parity byte-identical).
- **wrangler dev smoke (R8):** 100 header rules parsed; `/healthz` JSON,
  `/` 200, `/nope` 404, `/api/card/nope` 404, `/admin` 200.
- **Live DOM verification (agent-browser, production):** scene =
  `scene-4-2.webp` in the `.mc-scene` computed style; `mc-clean` on the
  anchor; 2 SSR portraits; **14 local `/emblems/*` imgs, 0 external
  api-sports requests**; EN toggle round-trip fully Latin at the DOM level
  (countdown `04/03/40`, kickoff `20:00`, "Sunday 8 November") — the
  LTR/RTL contract unchanged.
- **Viewport matrix (7 audit widths):** no horizontal overflow at
  360/390/430/768/1024/1440/1920; page heights 9,362/8,424/6,465/6,488 px
  at ≥768 — within fixture-data variance of the Phase 2 baseline
  (9,413/8,456/6,550/6,572).
- **VLM visual review:** mobile FA hero — scene-4-2 clean (no banding/
  blocking in the glow gradients or crowd), portraits cleanly faded,
  layout intact; standings — all 6 league boxes show the local emblems
  crisply, RTL rows correct, no broken images; desktop hero crop — HUD
  frame aligned, countdown in-card, clean portrait fades. (One VLM pass
  hallucinated Persian digits in EN mode — DOM inspection disproved it;
  recorded as a VLM-reliability note, DOM checks stay authoritative for
  text content.)
- **Console:** zero messages/errors on `/` (FA + EN).
- **CI:** the push-run on `738d969` failed T-09 at `/` perf 36 (taken
  ~2 min post-deploy, cold edge caches; the same run's advisory Lighthouse
  measured `/` 65); the push-run on `db84622` failed on a crashed
  Lighthouse invocation + `/matches/today` 39-vs-40 flicker (measured
  mid-deploy-transition; the same page measured perf 100 / LCP 1.1 s from
  the close-out sandbox minutes later). Both are the documented K10
  variance class — re-run verdict recorded in the tracker.
- **Production post-deploy:** `/healthz` → `13.206-scenediet`, `ok:true`,
  `degraded:false`, `outbox_depth:0`, ticks completing (`last_cron_age_min`
  4–10 across reads), `kv_writes_day` 602 (< 700 soft cap);
  `/ui/mc/scene-4-2.webp` 200 + immutable; SW `const CACHE =
  "sportsignal-v109"` live (body md5-verified against the repo file);
  fresh HTML (after the 300 s render hold) ships the scene-4-2 preload +
  the mc-clean rule; all v13.205 assets (13.80.css, the two hero-art
  webps, bg-2.webp, /emblems/*) immutable-pinned; retired assets still
  resolve (retention rule).
- **Telegram bot:** zero bot files in either Phase 3 commit (verified by
  `git show --stat` review); bot-side healthz fields healthy post-deploy;
  no bot interactions performed.

## 14. Remaining limitations (for Phase 4+)

1. **Lab LCP floor:** the remaining ~5.5 s simulated LCP is the
   render-blocking chain's weight on Fast 3G (HTML 184 KB + CSS 135 KB +
   fonts + JS), not discovery. Candidates: HTML diet (the 145-line
   release-comment history rides every response), critical-CSS evaluation,
   or splitting the page inline style — all Phase 4+ scope, weighed
   against R4 (ceremony cost) and the "no rewrites" house rule.
2. **F-H3 unchanged:** still no field CWV/INP source (Phase 4: enable CF
   Web Analytics RUM).
3. **K10 stands:** the T-09 CI gate remains a single-run lab measurement
   against live production — it flickered red twice during Phase 3 on
   variance-class runs (36 and 39, both < 40 threshold, both with healthy
   same-run advisory numbers). The K10 note stays open until the gate is
   re-based on a calmer measurement or the F-C1 residual work lands.
4. **stadium-lights-2.webp is 71 KB**, above the audit's ≤60 KB target —
   the honest yield documented in v13.205 (visual-identity floor of the
   soft-gradient content).

## 15. Phase 4 — Cloudflare & caching (v13.207-condget, 2026-11-04)

> The caching phase per `WEB_OPTIMIZATION_AUDIT.md` §8: F-M5 (the P0 —
> conditional-GET 304s), ETag on the machine files, F-H3 (CF Web Analytics
> RUM), the F-L6/F-L7 evidence-gated evaluations, and the spec §10.1–10.7
> response-class policy verification. All curl evidence below was taken
> against production unless noted.

### 15.1 What changed (the treatment)

| Item | Change | Commit |
| :--- | :--- | :--- |
| **F-M5 (P0)** | `wantCached` (src/seo/router.ts, website-only §3.1) honors `If-None-Match` on **both** paths: the edge-cache HIT branch (after the `x-ss-cc` public-header restore, before the body) and the fresh-render branch (after the edge-cache store — the rendered 200 still serves the next unconditional visitor). New `etagMatches` helper implements RFC 9110 §13.1.2 **weak** comparison (`W/`-prefix stripping, comma lists, `*`); new `notModified304` strips `content-length`/`content-encoding` and carries the same public `cache-control` the 200 would. | v13.207 |
| **Machine-file ETags** | `/sitemap.xml`, `/sitemaps/{kind}.xml`, `/feed.xml`, `/calendar.ics`, `/api/matches.json` now route their renders through `withEtag` (bodies are epoch-stable — the honest `<lastmod>` map rides the content hash). `robots.txt`/`llms.txt`/`security.txt` (tiny, static, 1 h TTL) and `/og/match-*.png` stay etag-less deliberately. | v13.207 |
| **`withEtag` refactor** | The 304 decision moved out of `withEtag` into `wantCached` (it needs the final response, hit or miss); `withEtag` now only stamps ETag (+ Last-Modified from `data-ss-generated` on HTML). | v13.207 |
| **New gate** | `scripts/check-conditional-gets.js` — 8 checks: the weak/list/star comparator, 7 behavior vectors (incl. the weakened replay), the HIT/MISS branch order (public-CC restore BEFORE the 304), the 5 machine-file etag wraps, the strict-comparison regression guard, and the R12 freshness-ladder literals. Registered in `npm test`. PLUS `seo-check.js` **T-13** (the CI guard): ETag presence on the 4 machine files + `/`, 304-on-replay per machine file (one retry absorbs epoch flips; the HTML 304 half stays out of CI — the platform SWR window can transiently 200, RESULTS §15.3a). | v13.207 |
| **F-H3** | API-evaluated; **owner-action-required** — exact dashboard steps shipped as `OWNER_TODO.md` §11 (see §15.5 below). | docs |
| **F-L6 / F-L7** | Evaluated with numbers, deliberately not built (§15.5). | docs |

Ceremony: no client asset changed → no `_headers` edit (still exactly 100
rules), no SW bump (stays `sportsignal-v109` per ADR-006), bundle stays
`public-13.68.js` / stylesheet `public-13.80.css`. VERSION
`13.207-condget`, package `13.207.0.0`, check-stats release-wiring
re-pinned.

### 15.2 The two F-M5 root causes (live evidence)

1. **The edge-cache HIT path never checked `If-None-Match`.** `wantCached`
   returned the stored body unconditionally. Phase 1 audit evidence: an
   immediate revalidation on `/matches/today` (and `/`) returned 200 with
   the full body. Re-confirmed against deployed v13.206 at session start:
   `If-None-Match: "ss-0bf4150c6601"` (the exact tag just served) → **200,
   27,983-byte body, `cf-cache-status: HIT`, age 24**.
2. **The strict comparison could never match in production.** The Worker
   emits strong validators (`etag: "ss-0bf4150c6601"`), but Cloudflare's
   compression layer **weakens them in transit** — the client receives
   `etag: W/"ss-0bf4150c6601"` (verified on `/`, `/matches/today`,
   `/teams`, `/api/matches.json`, the JS/CSS static assets; fonts and
   WebP art keep strong etags because they are served uncompressed).
   Browsers and curl replay the weakened form, and the old
   `inm.trim() === tag` check compares `W/"ss-…"` against `"ss-…"` — a
   guaranteed mismatch. (The strong-form 304s observed after the fix prove
   the platform itself performs strict strong-vs-strong comparisons at the
   zone-cache layer, so the weak-aware comparator is what makes
   delivered-etag replays work end to end.)

### 15.3 Before/after — the conditional-GET matrix (production)

**Before (v13.206):** conditional GET with the exact served ETag →
`200` + full body on every surface (re-verified at session start on
`/matches/today`, twice, matching the Phase 1 audit).

**After (v13.207, deployed 2026-11-04 ~18:05 UTC):** replay the delivered
ETag verbatim (what every real client does), expect 304 with a 0-byte body:

| URL | Class | Delivered ETag | Replay → | Non-matching → |
| :--- | :--- | :--- | :--- | :--- |
| `/` | HTML | `W/"ss-d54f695f2a9cd"` | **304** | 200 |
| `/matches/today` | HTML | `W/"ss-af0dd2f96aaf"` | **304** | 200 |
| `/teams` | HTML | `W/"ss-8a5215fb843a"` | **304** | 200 |
| `/matches` | HTML | `W/"ss-cfe99e7213319"` | **304** | 200 |
| `/about` | HTML | `W/"ss-1e8448d1543e"` | **304** | 200 |
| `/sitemap.xml` | sitemap | `W/"ss-ea9795152df"` | **304** (post-window, §15.3a) | 200 |
| `/sitemaps/pages.xml` | sitemap | `W/"ss-8b21226160f"` | **304** (post-window) | 200 |
| `/sitemaps/teams.xml` | sitemap | `W/"ss-3e706c2f274a"` | **304** (post-window) | 200 |
| `/feed.xml` | feed | `"ss-199fddc82151"` | **304** | 200 |
| `/calendar.ics` | ics | `"ss-c486e44d44c4"` | **304** | 200 |
| `/api/matches.json` | JSON | `W/"ss-61abd869e782"` | **304** | 200 |

**Body saving:** homepage 200 = 46,359–46,360 B (br on the wire) vs
304 = **0 B** — a repeat visit with a matched validator re-downloads
nothing. Final matrix rerun once the sitemap window had fully rolled:
**44 PASS / 0 FAIL** across all 11 URLs (etag present + 304 replay +
200 on non-matching + ladder byte-identical on every row).

**Local (wrangler dev) full-form matrix:** strong / weak `W/` / comma-list
/ `*` forms all 304 on `/matches/today` + all five machine files;
non-matching → 200 with body; the 304 carries the byte-identical public
ladder. (The `*` form is Worker-side only in production — the zone cache
layer answers before the Worker for hot objects.)

**§15.3a — the sitemap cache-window note (the honest wart):** the first
post-deploy matrix run showed the three sitemap surfaces still etag-less —
their **pre-deploy zone-cache + Cache API copies (600 s TTL, etag-less
v13.206 renders)** were still inside their window (the session's own
pre-deploy probes had populated them). feed.xml/calendar.ics (300 s) had
already rolled over. After the 600 s window elapsed the sitemaps served
fresh v13.207 renders with ETags and 304 on replay (table above). No
action needed — the transition is inherent to in-place cache TTLs and
self-resolves; recorded so a future reader of the first-run logs isn't
confused.

**Platform-layer notes (documented, outside Worker control):** (1) the
zone cache in front of the Worker serves hot HTML from its own copy within
`s-maxage=60` (+ the 300 s SWR window) and answers conditionals with
strict strong-form comparison — one transient weak-form 200 was observed
on `/matches/today` while its edge object sat at age 188 s inside the SWR
window; fresh-object states 304 the same request. (2) 304s are
body-savings only — the freshness ladder is unchanged, so live scores
still refresh exactly as before (R12, §15.4).

### 15.4 Response-class policy verification (spec §10.1–10.7, v13.207)

| Class (§10.1) | Surface | Policy (live-verified) | Status |
| :--- | :--- | :--- | :--- |
| Fingerprinted static (§10.2) | `/public-13.68.js`, `/public-13.80.css`, `/ui/mc/scene-4-2.webp` | `public, max-age=31536000, immutable` + zone-cache HIT | ✅ unchanged |
| Fonts | `/*.woff2` | `public, max-age=604800` (1 week, non-fingerprinted) | ✅ unchanged |
| HTML (§10.3) | `/`, `/matches*`, `/teams*`, `/competitions*`, static pages | `public, max-age=0, s-maxage=60, stale-while-revalidate=300` + ETag (+Last-Modified) + render holds (300 s `/`, 900 s default, 120 s live, upcoming = ko+120 s) | ✅ byte-identical ladder |
| Machine files | `/sitemap.xml` + children (600 s), `/feed.xml`, `/calendar.ics` (300 s) | public TTLs + **ETag (new)** | ✅ TTLs unchanged |
| Public JSON (§10.4) | `/api/matches.json` | `public, max-age=60, s-maxage=300` + CORS + **ETag (new)** | ✅ unchanged |
| Website API | `/api/public-matches` | `public, max-age=60` (SWR overlay + 60 s edge) | ✅ unchanged |
| Plain text | `/robots.txt`, `/llms.txt`, `/security.txt` | `public, max-age=3600` | ✅ unchanged |
| 404s | unknown routes | `no-store` (scanner-probe CPU guard) — never cached, never 304 | ✅ unchanged |
| Private/auth | `/admin*`, `/api/*` admin routes | `no-store, no-cache, must-revalidate` — **no public caching of private content** | ✅ verified |
| Redirects | www/http → apex | 301, `public, max-age=3600` | ✅ unchanged |
| Compression (§10.6) | HTML/CSS/JS/JSON/XML/robots | `br` (44,296 B homepage), `gzip`, or `zstd` per Accept-Encoding | ✅ verified all three |
| Compression gap | `/feed.xml` (9.3 KB), `/calendar.ics` (19.5 KB) | served **identity** — `application/atom+xml`/`text/calendar` are outside CF's platform compression allowlist; both files are small and machine-consumed; a Worker-side `CompressionStream` would add streaming complexity for a micro-win | 📝 documented, not built |
| `Vary` correctness (§10.4) | all SEO surfaces | no `Vary` needed: SSR output is identical for every `Accept-Language`/`Accept-Encoding` (fa-only SSR, platform negotiates compression post-response) | ✅ verified |
| `Age`/`cf-cache-status` (§10.7) | HTML | zone-cache `HIT` + `age` within s-maxage+SWR; Cache-API hits serve the render holds | ✅ verified |
| KV budget (R2) | — | **zero new KV writes** (the fix is pure Cache API + response headers); healthz `kv_writes_web` tracked the session's SWR revalidations only | ✅ |
| Freshness ladder (R12) | every class | **byte-identical to the Phase 3 close-out** (re-probed post-deploy, table above) | ✅ |

### 15.5 F-H3 / F-L6 / F-L7 — the evaluation records

**F-H3 (CF Web Analytics RUM) — owner-action-required.** API evidence: the
session's Cloudflare token authenticates (zones read, settings read —
`early_hints` is `off`/editable) but the Web Analytics endpoints reject
it (`accounts/{id}/rum/site_info` GET → 10405 "Method not allowed for this
authentication scheme"; POST create → 10000 "Authentication error" — the
token lacks the Web Analytics permission). `/cdn-cgi/rum` answers 404 and
the served HTML contains **zero** `cloudflareinsights` occurrences — the
zone setup was never completed (the v13.188 CSP entries were
future-proofing only). The beacon is *not* injected by the platform today.
**Action shipped:** `OWNER_TODO.md` §11 — the exact 7-step dashboard path
(account → Analytics & Logs → Web Analytics → Add a site → automatic
setup), a 10-minute curl self-test (`grep -c cloudflareinsights`), and the
fallback instruction (if automatic injection does not reach
Worker-rendered HTML, hand the snippet to the next session for a
website-only template insertion). Phase 7 field data depends on this.

**F-L6 (retained-asset tail) — evaluated, deferred.** The live tail is 40
old `public-13.*.js` bundles (5.0 MB) + 6 `core-*` (144 KB) — ~5.1 MB, not
the R14 headline's ~85 MB (that figure is the whole `assets/` dir, 66 MB
of which is the live player-portrait libraries). The tail has **zero wire
cost** (immutable + unreferenced = never downloaded; verified: the live
templates reference exactly `public-13.68.js` + `core-13.16.js`). The
blast radius of deletion: 43 old-bundle pins in `_headers`, historical
references across `check-stats`/`check-hero-carousel`/`check-mc-heroes`/
`check-scheduler`, and the repo's own retention rule (retired bundles stay
on disk one SEO TTL so an ancient cached HTML re-fetching one still
resolves). A deploy-size-only cosmetic win against that surface —
**deferred**; revisit only if deploy size becomes a real constraint.

**F-L7 (103 Early Hints) — evaluated, not built.** The zone setting is
`off` (API-verified; it is editable with this token). Without origin
`Link` response headers the toggle is a no-op, and the Worker emits none —
our preload `<link>` tags sit in the first KB of the document, discovered
at parse time. The honest bound on the win: ~TTFB (45–80 ms warm edge
hits) ≈ ~1 % of the current 5.5 s lab LCP (K15 residual), against the cost
of a new response-header surface that must mirror the media-scoped F-C1
preload exactly (or risk double-fetches) and ride the ADR-006 ceremony.
**Verdict: not worth building now; the toggle stays off** (a no-op anyway
without Link headers).

### 15.6 Gates + verification (v13.207)

- **Gates:** tsc EXIT 0; `npm test` EXIT 0 — **2,539 checks, 0 failures**
  (2,531 + the 8 new conditional-gets checks); `check-version-sync` green;
  `npm run seo:check` (production, with the new T-13) → **65 PASS /
  0 FAIL** (the 9 T-13 assertions: 4 machine files etag+304 + `/` etag;
  T-09 Lighthouse skipped locally — no chrome — but CI ran it: `/` perf
  43, sub-pages 98/96).
- **wrangler dev smoke (R8):** `/healthz` JSON, `/` 200, `/nope` 404,
  `/api/card/nope` 404, `/admin` 200; local 304 matrix all-green
  (§15.3); `seo:check:local` 56 PASS / 1 transient production 503 on a
  sampled match page (re-verified 200 ×3 immediately — the documented
  K10-class crawl-window blip, not a regression; production was still
  v13.206 at that moment).
- **Deploy:** `npx wrangler deploy` (version `1d4ca832-…`), healthz
  flipped to `13.207-condget` within 15 s; ticks completing
  (`last_cron_age` 1–2 min, outbox 0, `ok:true`).
- **KV watch (observation, not caused by this phase):** the post-deploy
  window rode a LIVE-mode match evening — `kv_writes_day` 715→721
  (≥ 700 soft cap → `degraded:true`, `ok:true` throughout; hard cap 850;
  counter resets UTC midnight). Zero of those writes come from the
  website changes (R2); the match-evening write profile is the documented
  bot-side cadence.
- **Bot protection:** no bot files in the diff (5 files + 1 new script —
  router/config/package/harness only); the SEO router returns `null` for
  `/webhook`, `/api/*` (except matches.json) and `/admin*` before any
  changed line executes; full `npm test` (every bot suite) green;
  bot-side healthz fields healthy post-deploy.

## 16. Phase 5 — Technical & multilingual SEO (v13.208-lastmod, 2026-11-04)

The verification + gap-fix phase per AUDIT §8. Commits: `888f1ae` (the code
round), `ed74342` (the R11 og:locale completion), `53f847e` (the seo-check
sampler fix). Deploy: version `5e22b84c-…` (the second of two; `e8fea8b9-…`
was superseded within minutes by the og:locale follow-up). healthz flipped
to `13.208-lastmod` ≤ 15 s after each deploy; ticks completing throughout
(`last_cron_age` 3–9 min, `outbox_depth` 0, `ok:true`).

### 16.1 The headline finding — the seo_lastmod_v1 cross-child eviction bug (F-05 "now on every build", live)

The Phase 5 lastmod-honesty spot-audit found a **live regression the Phase 1
audit had marked green**: every sitemap child's full URL set carried the
RENDER CLOCK, not content-change times.

**Live evidence (pre-fix):**
- 19:24 fetches: 94/94 teams at `19:24:09.220Z`, 6/6 competitions at
  `19:24:10.125Z`, 144/144 upcoming at `19:24:11.114Z`, 21/21 archive at
  `19:24:12.171Z` — whole-child sets sharing one render-time millisecond
  (each stamp group = my sequential curl pacing, ~1 s apart).
- Cross-window re-fetch at 19:41 (after the 600 s edge TTL lapsed): teams
  re-stamped to `19:41:18.409Z`, upcoming to `19:41:19.192Z` — the stamps
  ADVANCE on every render. Under honest hash-driven lastmod, the 94 team
  timestamps would be spread across days/weeks (whenever each team's next
  match last changed); the probability of all 94 changing in one millisecond
  is zero.
- The `pages` child was the only honest one (15 × `2026-10-11T00:00:00Z` =
  CONTENT_VERSION — the hand-written stamp).

**Root cause (code):** `computeLastmods` (src/seo/files.ts) built `next`
from ONLY the calling child's candidates and `put` the whole map — the four
data children (teams / competitions / matches-upcoming / matches-archive)
each **evicted every other child's entries**. The next render of any child
therefore saw its full URL set as "new" (absent from the map) → re-stamped
everything with `now` → wrote the map → returned the full set as
`changedUrls` to IndexNow. The old write condition
(`changed.length || prevKeys !== candidates.length`) fired on EVERY
cross-child interleaving — a web-side KV write per child render (R2
pressure) and a KV-write race window (two renders ~0.8 s apart can converge
to either write). The Phase 1 audit's §3.1 "no now on every build ✅" was
sampled within single cache windows — the eviction only manifests across
them, which is why three sessions missed it.

**The fix (v13.208):** MERGE, never replace — `next` starts from `prev`
(entries older than the 400-day retention pruned on write, bounding growth
against the 365-day match archive), candidates update/add, and the write is
strictly change-only. The sitemap INDEX now derives each child's
`<lastmod>` from the per-URL family max in the same map (`pages` →
CONTENT_VERSION; `/teams/`, `/competitions/`, `/matches/` family prefixes;
the two match children share the `/matches/` max — a match changing state
moves between them, so both legitimately change together) instead of `now`
on every render. An empty/unreadable map degrades to fresh stamps (the old
behavior).

**Live proof (post-fix), the three-cycle matrix:**
- Cycle 1 (19:46, post-deploy): competitions re-stamped once (6 ×
  `19:46:00.210Z`) and archive once (21 × `19:46:01.878Z`) — the predicted
  one-time convergence (their entries had been evicted by the pre-fix
  renders). teams/upcoming still served their pre-fix cached copies.
- Cycle 2 (19:52, after those caches lapsed): teams render kept **88/90**
  old stamps (`19:41:18.409Z`) and re-stamped only 2 (live-evening
  next-match changes); upcoming kept **142/144**. Under the old code both
  renders would have re-stamped 100%.
- Cycle 3 (20:03, full windows lapsed): teams kept 67, re-stamped 25
  (23:33 Tehran — matches finishing flip many teams' `next` context;
  honest change-driven churn), upcoming kept 139/144; competitions and
  archive re-rendered post-expiry with **identical** stamps. The sitemap
  index ETag is now render-stable: `"ss-cd479d472db"` across consecutive
  fetches (the old `now`-stamped index churned its ETag every render).
- Gate: `scripts/check-seo-lastmod.js` — 12 checks (the merge / no-change
  no-write / hash-change / stale-prune / index-derivation behavioral
  vectors via the repo's extract+eval harness style, + the F-L1/F-H3/
  IndexNow/R11 source contracts), registered in `npm test`.

**R2 side effect (positive):** child re-renders without changes no longer
write KV. Pre-fix, every child render = 1 `seo_lastmod_v1` put (plus
potential park writes from full-list "changed" IndexNow calls); post-fix,
writes are change-only. Observed `kv_writes_web` 405 → 439 over the session
window (which included the one-time convergence writes + SWR
revalidations); steady-state should be strictly lower.

### 16.2 F-M8 — the pagination canonical DECISION (documented, no code change)

**Decision: KEEP.** `/matches?page=2+` continues to canonicalize to
`/matches` — the deliberate de-dup, now with the evidence on record:

- **Live state verified:** `/matches?page=2` → 200, `canonical →
  https://sportsignal.ir/matches`, title/description identical to page 1
  (the de-dup signal set is coherent: same canonical + same metadata).
- **The pagination nav is crawlable plain links** (`<a href="/matches?page=N">`,
  no JS dependency) — deep pages are traversable by any crawler that
  chooses to follow them; the canonical tells it which URL represents the
  hub.
- **Everything on pages 2+ is discoverable via stable canonical URLs:**
  every upcoming big match has its own page and ALL of them ride the
  `matches-upcoming` sitemap child (144 URLs at audit time — not just
  page 1's slice), plus the time hubs (today/tomorrow/this-week/
  this-weekend), team pages, competition pages and the Atom feed. No
  orphaned content exists behind the pagination.
- **Why not self-canonical:** the paginated list is a sliding window over
  a live-ranked upcoming set — `?page=2` is not a stable entity (its
  content shifts as matches finish; totalPages itself shrinks on match
  evenings). Indexing unstable fragments creates index churn and soft-404
  risk when pages disappear, and would additionally require unique
  titles/descriptions per page (spec §11.2) for content that deliberately
  duplicates page 1's. The site's indexable surface is the per-match
  pages + hubs; `/matches` is the hub. Google's modern pagination guidance
  (self-canonical per page) targets stable paginated sequences, which this
  is not.

### 16.3 F-L1 — the 404-canonical cleanup (fixed)

The 404 builder passed the fictional `path: "/404"` to `buildHead`,
emitting `canonical → https://sportsignal.ir/404` (a URL that 404s itself)
and the same fictional `og:url`. `HeadInput.path` is now optional;
URL-less pages emit NO canonical and NO og:url. Production-verified:
`/teams/nonexistent-xyz` → 404 with 0 canonical, 0 og:url, meta noindex +
`x-robots-tag: noindex, nofollow`, links home, beacon present. (The
scanner-path cheap 404 never had a canonical.) Gate: check-seo-lastmod #9.

### 16.4 F-H3 — the Cloudflare Web Analytics beacon (the owner-step fallback, executed)

Phase 4 left this owner-action-required; Phase 5 closed it:

- **API verification (this session's token HAS the Web Analytics read
  permission — Phase 4's did not):** `accounts/{id}/rum/site_info/list` →
  the site EXISTS: `site_tag 08a51fd8…`, `auto_install: true`, zone
  ruleset enabled, created 2026-10-13 (zone-setup day). So the owner DID
  complete the dashboard step three weeks ago.
- **Why no data ever flowed:** automatic injection never reaches
  Worker-rendered HTML — live-verified again this session: 0
  `cloudflareinsights` occurrences in the served homepage/match pages,
  `/cdn-cgi/rum` → 404. The K6-predicted scenario exactly.
- **The fix (OWNER_TODO §11 step 6, executed with the full ceremony):**
  the manual snippet (token `fb7e7f1d…` — public by design, it rides every
  served page exactly like INDEXNOW_KEY) inserted before `</body>` in BOTH
  HTML templates — the homepage (`src/pages/public.ts`) and every
  SEO-shell page (`src/seo/page-shell.ts`, which covers match/team/
  competition/hub/trust pages + the full 404). Cookieless, aggregate-only
  RUM; CSP-allowed since v13.188 (`script-src static.cloudflareinsights.com`
  + `connect-src cloudflareinsights.com`). `/privacy` gained the honest
  disclosure section («آنالیتیکس کلادفلر (بدون کوکی)») and its summary line
  was rewritten to name both measurement tools. The admin/login pages
  deliberately carry no beacon (owner tooling, noindex).
- **Production-verified:** `curl -s https://sportsignal.ir/ | grep -c
  cloudflareinsights` → ≥ 1 on every public page family. **Phase 7's
  field-CWV source now exists**; the owner checks the Web Vitals p75
  dashboard 24–48 h from now (OWNER_TODO §11 updated to reflect the
  done-by-code state).
- Residual risk documented: if Cloudflare ever starts auto-injecting into
  Worker responses (a platform change), pages would double-count RUM —
  detectable as two beacon scripts in the page source; the mitigation is
  disabling the zone's auto-install toggle (the manual snippet is then the
  single source).

### 16.5 IndexNow — the end-to-end story, verified once (F-16/T-11)

- **Key file:** `/6f1c2ab9d84e53a7c0b5e2f8a3d6c4b1.txt` → 200, body = the
  exact key (T-11 green in CI and in this session's production run).
- **Endpoint round-trip:** a manual POST to `api.indexnow.org/indexnow`
  with `{host, key, keyLocation, urlList:["https://sportsignal.ir/"]}`
  (the homepage — a URL that genuinely changed this deploy) → **HTTP 200
  (accepted)**. Key, key location and host all validate end-to-end.
- **The wiring (code):** the SEO router calls `pingIndexNowIfChanged` with
  each child's `changedUrls`; the 15-min rate-limit stamp + park list
  bound the cadence. **Defect found + fixed:** the parked list was never
  re-read on the send path — rate-limited "changed" URLs expired unsend.
  The send now drains the park into `urlList` (zero extra KV writes — R2;
  duplicates bounded by the park's 1 h TTL; IndexNow pings are idempotent
  recrawl hints). Gate: check-seo-lastmod #10.
- With the eviction fix, `changedUrls` is now genuinely small (real
  content changes only) instead of full-URL-set noise.

### 16.6 R11/hreflang — the N/A stance re-verified + one inconsistency closed

- **hreflang: 0 links** on every page family (correct — there are no `en`
  URLs to annotate; `en` is a client-side localStorage toggle in
  `core-13.16.js`, no `?lang=`/`/en/` routes exist).
- **og:locale: `fa_IR`** on every page family.
- **Found + fixed:** the homepage still carried
  `og:locale:alternate=en_US` (a pre-program leftover; the shell pages
  never had it) — an alternate-locale hint implies a crawlable English
  variant that does not exist. Removed (`ed74342`); production-verified 0
  occurrences. The stance is now pinned: check-seo-lastmod #12 (fa_IR in
  both templates + no og:locale:alternate). No hreflang was added, no
  language versions invented (spec §11.4).

### 16.7 GSC (K5) — the honest limitation

No Google Search Console credentials exist in this session (the
Cloudflare/GitHub tokens cannot access GSC). The owner completed DNS TXT
verification 2026-10-11 (OWNER_TODO §3) but has not supplied report access
or run the requested reports. **What Phase 5 could NOT verify:**
indexation counts, sitemap processing status, canonical selection as seen
by Google, crawl errors, and search performance. The site-side facts that
GSC would confirm are all verified directly (crawl files, canonicals,
status codes, JSON-LD validity — this section + §16.8); the missing piece
is Google's own view. **Standing ask (unchanged, owner action):** either
grant a GSC user read-only access for the next session, or run the three
reports (Indexing → Pages; Sitemaps; Performance) and share the outcome —
needed for Phase 7's final report.

### 16.8 Metadata uniqueness + JSON-LD validity spot-audit (verified, not rebuilt)

16 templates + 8 dynamic samples (2 per family: upcoming/archive match
pages, team pages, competition pages), all 200:

- **Titles unique** across every URL except the deliberate
  `/matches` ↔ `/matches?page=2` de-dup pair (§16.2). Dynamic pages carry
  fixture-specific titles (dates, team names).
- **Descriptions unique** with the same single deliberate exception;
  70–165 chars everywhere (T-03 asserts ≥ 50).
- **Canonicals:** 15/15 templates self-referencing; all 8 dynamic samples
  self-referencing; `?page=2` → hub (§16.2); 404 → none (§16.3).
- **JSON-LD:** every page parses; `@graph` types are the honest set —
  Organization + WebSite everywhere; CollectionPage/ItemList on hubs;
  WebPage + **SportsEvent** + BreadcrumbList on match pages (startDate
  ISO-8601 with Tehran offset, eventStatus mapped from real status, real
  teams/organizer, venue only when the data has one — no invented fields);
  SportsTeam/SportsOrganization on team/competition pages. T-04 deep-check
  green in CI.
- **Robots:** production `index, follow` everywhere public; noindex only
  on the 404 (correct).

### 16.9 Gates + verification (v13.208)

- **Gates:** tsc EXIT 0; `npm test` EXIT 0 — **2,552 checks** (2,539 + 12
  new check-seo-lastmod + 1 new check-stats release-wiring pin); the
  public-page parity baseline re-frozen twice via the reviewed
  `--update` path (the 9-line beacon diff, then the 1-line og:locale
  removal — the only intended output changes).
- **wrangler dev smoke (R8):** `/healthz` JSON, `/` 200 + beacon,
  `/matches?page=2` canonical → `/matches`, the shell-404 (no canonical,
  no og:url, noindex, beacon), `/privacy` disclosure, sitemap index with
  CONTENT_VERSION on the pages child; local 304 matrix intact (strong +
  weakened ETag replays → 304).
- **CI:** `888f1ae` green (68/0); `ed74342` RED — root-caused to the
  T-03 sampler sampling one URL twice (a self-collision "duplicate title:
  X (u & u)"; the URL verified listed exactly once across all children);
  sampler fixed to draw without replacement (`53f847e`) and that run is
  green: **77 PASS / 0 FAIL** — the acceptance target met. CI Lighthouse:
  `/` perf 62, `/matches/today` 97, `/teams` 96 (T-09 threshold ≥ 40).
- **Production seo:check (this session, with the fixed sampler):**
  **65 PASS / 0 FAIL** (count is data-state dependent; CI's independent
  draw saw 77 — both ≥ the 56 floor).
- **Deploy + ticks:** two deploys (`e8fea8b9`, then `5e22b84c` with the
  og:locale follow-up); healthz `13.208-lastmod`, `ok:true` throughout;
  ticks completing (`last_cron_age` 3–9 min across four checks, outbox 0).
- **KV watch:** `kv_writes_day` 783 → 840 over the session (LIVE match
  evening — the documented bot-side cadence; hard cap 850, resets UTC
  midnight); `kv_writes_web` 405 → 439 including the one-time sitemap-map
  convergence writes. Zero NEW steady-state web write classes were added
  (R2); the eviction fix strictly reduces them.
- **Bot protection:** no bot files in any diff (13 files: src/seo/**,
  src/pages/public.ts, src/config.ts VERSION, scripts, fixtures, package
  files, docs); the SEO router returns `null` for `/webhook`, `/api/*`
  (except matches.json) and `/admin*` before any changed line executes;
  full `npm test` (every bot suite) green; bot-side healthz fields healthy
  post-deploy (heartbeat/last_cron fresh, outbox 0, tick cadence normal).
