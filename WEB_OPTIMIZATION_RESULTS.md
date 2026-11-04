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
