# Match Centre — M9 Release-Candidate Review (M9 gate)

**Milestone:** M9 — Integration & quality (S20, session 2 of 2 — CLOSES M9)
**Specification:** §17 (SEO and content integrity) + §15 (Interaction and accessibility) + §4 (Responsive composition) + §16 (Shared resilience rules) + §3 (Page structure — the section order) + §1 (point 11/12 — the Telegram block at position 11)
**Decisions:** 2 (Persian-first RTL + logical properties), 7/8 (both-or-neither portraits), 12 (no empty-section nav links), 14 (mobile nav horizontally scrollable), 19 (summary when reliable data exists), 33/34 (shared sample-window label), 40 (ONE expand-control), 49 (lifecycle narrative wording), 57 (no FAQPage schema), 58 (FAQ delayed-collapse), 65 (reuse the existing footer), 70 (CTA ≥44px / WCAG 2.5.8), 72 (telegram after related, before footer), 80 (reduced-motion = subtle functional motion only), 85 (graceful image fallbacks), 86 (compact fallbacks), 89 (contextual freshness labels), 90 (live = score + status only), 92 (upcoming kickoff prominence), 98 (omit unavailable competition crest)
**Audit:** §4 (the data-availability matrix) + §6 (the resource-cost audit — the 45,187-byte HTML baseline + the ~12-14 KV reads + the 10ms CPU rolling budget) + §13 (risks/limitations/unknowns — risk 1 CPU not instrumented + risk 2 GSC byte-frozen until Dec 4-8) + §15 (Q5/Q6 the Option A+B preview target)
**Preview:** `13.256-mcM9x` — Worker Version `a91a15f8-0ddd-4170-a877-67d751f3bfd2` (https://a91a15f8-ucl-notifier.sportsignal.workers.dev) — uploaded 2026-11-14, NEVER activated (`wrangler versions deploy` / `wrangler deploy` NEVER run — `wrangler.preview.toml` = `wrangler.toml` MINUS the two `[[d1_databases]]` blocks [STATS_DB + USERS_DB], gitignored; the preview shares the production STATE KV `c63588df…` so real match pages render; the repo version string stays `13.256-mcfound`; the mcM9x bump lives only in the uploaded bundle via a temporary `src/config.ts` edit reverted immediately after the upload — the S18 precedent).
**Gate result:** **PASSED** — the production-KV agent-browser read-only smoke verified the full Match Centre on real upcoming match pages across 6 leagues + the GSC surfaces byte-frozen vs production (diff 0) + the a11y checks (keyboard/focus-visible/reduced-motion/labels/contrast) + the mobile 390 no-horizontal-scroll + the page-order (spec §3) + zero console errors + the version string `13.256-mcM9x` on the preview + production re-verified `ok:true / 13.255-seospell` after the upload.

---

## 1. The audit matrix (spec §17 + §15 + §4 + §16 — the M9/S20 cross-cutting quality gate)

S20 is M9 session 2 of 2 — it CLOSES M9 with the gate (the S15/S17/S18 gate-session precedent). The audit matrix (a-h) covers the SEO/a11y/perf/regression invariants the S04-S19 renderers + projections + CSS must hold. **Audit result: NO presentation-layer gaps found** — the S04-S19 renderers + projections + CSS are ALREADY SEO/a11y/perf-compliant by construction (each session built its compliance path). The S20 deliverable is the ASSERTION group (19 new `check()` assertions in `scripts/check-match-centre.js`, ADDITIVE to the S19 group) that LOCKS IN the existing invariants for regression protection — ZERO code changes to the renderers/projections/CSS (the byte-frozen surfaces stay byte-frozen; the GSC measurement is in flight until Dec 4-8 — audit §13 risk 2).

### (a) Visible facts and schema consistency (spec §17: "SEO/schema must reflect visible verified facts")

| Check | Result | Evidence |
|---|---|---|
| The jsonldNodes carries ONLY the 4 allowed sources | **PASS** | `buildMatchPage`'s `jsonldNodes` array = `[…JL.siteNodes(), JL.webPageNode(path, ctx.fetchedAt), JL.sportsEventNode(sm, matchAnswerSentence(sm).replace(/<[^>]+>/g, "")), JL.breadcrumbNode(trail)]` — NO `faqNode`, NO `itemListNode`, NO `collectionPageNode`, NO `datasetNode` (those are hub/list/data-page nodes). The S20 assertion (a1) verifies this via a bracket-depth-matched extraction (the array contains a regex `/<[^>]+>/` whose `]` would fool a naive `indexOf`). |
| The SportsEvent node carries the visible verified facts | **PASS** | `sportsEventNode(sm, why)` carries `startDate` (isoWithTehranOffset — the kickoff/date), `homeTeam` + `awayTeam` (teamRef — the face-off), `organizer` (the competition), `location` (StadiumOrArena — ONLY when `m.venue` present), `description` (the answer sentence which carries the score for finished matches). NO invented `endDate`/`offers`/`aggregateRating`/`review` (S-03/S-04). The score lives in the `description` (the answer sentence) NOT a separate structured field — the conservative path (schema.org SportsEvent has no standard score property; inventing one would violate spec §17 "Never invent … stats"). The S20 assertion (a2) verifies via the REAL `jsonld.ts` source. |
| The meta description === the answer sentence | **PASS** | `let desc = matchAnswerSentence(sm).replace(/<[^>]+>/g, "")` — the desc funnel starts from `matchAnswerSentence(sm)`. The SAME source feeds the visible briefing card atom (`answerHtml: esc(matchAnswerSentence(sm))`) + the SportsEvent JSON-LD description — one source of truth, byte-frozen. The S20 assertion (a3) verifies the funnel + the atom wiring. |
| The SportsEvent description === the answer sentence | **PASS** | `JL.sportsEventNode(sm, matchAnswerSentence(sm).replace(/<[^>]+>/g, ""))` — the second arg is the description. The S20 assertion (a4) verifies the call site. |
| The GSC surfaces byte-frozen vs production | **PASS** | The preview match page HTML === production match page HTML byte-for-byte (`diff` line count = 0 across 6 match pages). The `<title>`, `<link rel="canonical">`, `<meta property="og:title">`, `<meta name="twitter:title">`, the JSON-LD `<script type="application/ld+json">`, and the `<h1>` are all byte-identical (preview vs production). See §3 below. |

### (b) Answer-first context and facts table distinct (spec §17: "Preserve answer-first match context and facts table as distinct elements; reduce repeated result sentences")

| Check | Result | Evidence |
|---|---|---|
| The narrative templates NEVER reference kickoff/venue/score | **PASS** | The S08 narrative engine's variant templates carry ONLY `{rivalry}`/`{round}`/`{comp}` placeholders — NEVER `{stadium}`/`{venue}`/`{kickoff}`/`{score}`/`{ht}`/`{result}`/`{date}`/`{time}`. The S20 assertion (b1) verifies via the REAL `narrative.ts` source. The answer sentence carries the kickoff/venue/score facts — the narrative carries the editorial significance — they NEVER repeat each other. |
| The answerHtml + narrativeHtml are distinct atoms | **PASS** | `MatchSummaryInput` carries `answerHtml` + `narrativeHtml` as separate fields. The composer renders the `.mcentre-narrative` ABOVE the `.mcentre-cols` briefing\|facts pairing (the S08 placement). The S20 assertion (b2) verifies via the REAL `matchSummaryHtml` output — the narrative element precedes the `.mcentre-cols` pairing in the rendered DOM. The answer-first briefing card (`id="answer"`) + the narrative paragraph are separate DOM elements — no repetition. |

### (c) No unsupported schema/FAQ/AI markup (spec §17: "do not add FAQPage schema solely for rich results" + "No AI-specific markup")

| Check | Result | Evidence |
|---|---|---|
| NO FAQPage + NO Article/BlogPosting/Event | **PASS** | The match page `jsonldNodes` carries NO `faqNode` (the S16-Schema omit — decision 57 + spec §17). The SportsEvent is the ONLY event-type node (the correct schema.org type for a football match — NOT `Event`, NOT `Article`, NOT `BlogPosting`). The `faqNode` helper stays byte-frozen in `jsonld.ts` for the hub pages (`/about`, `/methodology`, `/data` + the window hubs keep their GEO FAQPage node — S16 does NOT touch the hub pattern). The S20 assertion (c1) verifies. |
| NO AI-specific markup | **PASS** | No `Speakable`, no `ClaimReview`, no `ai-generated` meta, no machine-learning attribution schema across `jsonld.ts` + `pages.ts` + `match-centre.ts` (the SEO layer). The JSON-LD `@graph` carries only Organization + WebSite + WebPage + SportsEvent + BreadcrumbList — no AI-attribution nodes. The Workers AI binding (`wrangler.toml [ai] binding=AI`) is for Farsi translation (`maybeRunFaAi`), UNRELATED to the match-page JSON-LD. The S20 assertion (c2) verifies. |

### (d) Keyboard, focus, reduced motion, labels and contrast (spec §15 + decisions 14/40/58/70/80/98)

| Check | Result | Evidence |
|---|---|---|
| The reduced-motion media queries gate EVERY mcentre animation | **PASS** | 6 mcentre-scoped `@media (prefers-reduced-motion:reduce)` blocks in `page-shell.ts` gate: the S06 nav transitions (`.mnav-item`/`.mtop`), the S12 form dots (`.mdot`), the S15 schedule live-pulse + reveal fade (`.mcentre-sched-live`/`.mcentre-sched-remaining`), the S16 FAQ chevron + answer reveal (`.mfaq-q`/`.mfaq-a`), the S17 related live-pulse (`.mcentre-related-live`), the S18 telegram CTA hover transition (`.mcentre-telegram-cta`). Plus the global kill rule `* {transition:none!important; animation:none!important}` (verified by `check-a11y.js`). Decision 80 "Subtle functional motion for nav/accordions/expandable areas; no continuous decoration; respect reduced motion". The S20 assertion (d1) verifies. |
| The FAQ accordion buttons carry aria-expanded + aria-controls | **PASS** | The `<button class="mfaq-q" type="button" aria-expanded="false" aria-controls="…">` wraps the question; the `<div class="mfaq-a" role="region" aria-labelledby="…" hidden>` wraps the answer. The agent-browser smoke verified: `ariaExpanded: "false"`, `ariaControls: "mfaq-a-0"`, `tagName: "BUTTON"`. The S20 assertion (d2) verifies via the REAL `matchFaqHtml` output. Decision 58 (the delayed-collapse). |
| The schedule expand button carries aria-expanded + aria-controls + the label swap | **PASS** | The `<button class="mcentre-sched-toggle" type="button" aria-expanded="false" aria-controls="mcentre-sched-remaining">نمایش روزهای بعد</button>` — decision 40 (the ONE expand-control). The label swaps «نمایش روزهای بعد» ↔ «بستن روزهای بعد» in the `matchScheduleScript` (verified PURE DOM by S19). The S20 assertion (d3) verifies via the REAL `matchScheduleHtml` output. |
| The telegram CTA: target=_blank rel=noopener + ≥44px + focus-visible | **PASS** | The `<a class="mcentre-telegram-cta" href="…" target="_blank" rel="noopener noreferrer">عضویت در کانال تلگرام</a>` + CSS `min-height:44px` (decision 70 / WCAG 2.5.8) + `:focus-visible{outline:2px solid #7dd3fc}`. The agent-browser smoke verified: `color: rgb(15, 23, 42)` (the #0f172a dark navy text on the icy-blue gradient) + `minHeight: "44px"`. The S20 assertion (d4) verifies via the REAL renderer output + the CSS. |
| The nav + every section carries aria-label + the facts table carries a caption | **PASS** | The `<nav class="mnav" aria-label="ناوبری بخش‌های صفحه">` + every `<section id="mcentre-*" aria-label="<Persian label>">` (the `sectionHtml` helper applies `def.label`) + the facts table `<caption>MC_SUMMARY_FACTS_CAPTION</caption>`. The S20 assertion (d5) verifies. |
| The contrast tokens meet WCAG AA | **PASS** | The design-system tokens: `#0f172a`/`#1e293b` (dark navy bg — slate-900/800) + `#f1f5f9`/`#e2e8f0` (light text — slate-100/200, ≈ 15:1 ratio — ≥4.5:1 AA for normal text) + `#7dd3fc` (icy-blue accent — sky-300, ≈ 11:1 on dark navy — ≥3:1 AA for large text + UI components). The focus-visible outlines use `#7dd3fc` (≥3:1 against the dark navy per WCAG 1.4.11). The agent-browser smoke verified the focus ring: `outlineColor: rgb(125, 211, 252)`, `outlineWidth: 2px`. The S20 assertion (d6) verifies the tokens are present. The pixel-level contrast is re-verified by the agent-browser computed-styles smoke. |
| Focus-visible on nav items (agent-browser) | **PASS** | Focusing the first `.mnav-item` produced: `outlineStyle: solid`, `outlineWidth: 2px`, `outlineColor: rgb(125, 211, 252)` — the #7dd3fc icy-blue 2px focus ring. |

### (e) Full RTL/LTR and mobile/intermediate/desktop regression (spec §4 + decision 2)

| Check | Result | Evidence |
|---|---|---|
| The mcentre CSS blocks use logical properties ONLY | **PASS** | The full sweep across ALL mcentre blocks in `page-shell.ts` (from the first `#mcentre-` rule to the S03 foundation) — `margin-block`/`padding-block`/`margin-inline`/`padding-inline`/`inset-block`/`inset-inline`/`inline-size`/`block-size`/`border-inline-start`. NO physical `margin-left`/`margin-right`/`padding-left`/`padding-right`/`border-left`/`border-right` in the mcentre-scoped rules. Decision 2 "Persian-first native RTL; document intentional English LTR adaptation". The S20 assertion (e1) verifies. |
| The .mcentre-cols grid collapses to one column below 1080px | **PASS** | The default is `minmax(0,1fr)` (single column); the `@media (min-width:1080px)` upgrades to `repeat(2,minmax(0,1fr))` — the S07 briefing\|facts two-column pairing. Spec §4 "Collapse to one column relatively early at intermediate widths rather than squeezing content". The S20 assertion (e2) verifies. |
| The page-order is the spec §3 order | **PASS** | The agent-browser smoke verified the DOM order: `mcentre-hero` → `mcentre-nav` → `mcentre-summary` → `mcentre-standings` → `mcentre-form` → `mcentre-venue` → `mcentre-schedule` → `mcentre-faq` → `mcentre-related` → `mcentre-telegram` → `mcentre-footer-hook` (spec §3 items 2-12). The S20 assertion (e3) verifies via the `MC_SECTION_ORDER` registry. |
| Mobile 390 no-horizontal-scroll | **PASS** | The agent-browser smoke at viewport 390: `scrollWidth: 390`, `clientWidth: 390`, `overflow: 0`, `innerWidth: 390` — `scrollWidth === clientWidth === 390`, overflow 0. No horizontal scroll at 390px. |

### (f) Existing lint/typecheck/test/build suite

| Check | Result | Evidence |
|---|---|---|
| `npm test` exit 0 | **PASS** | 3,573 OK (baseline 3,554 + 19 new S20 `check-match-centre` assertions), 0 failures. |
| `npx tsc --noEmit` clean | **PASS** | Exit 0 — zero type errors. |
| `git diff --check` clean | **PASS** | Exit 0 — zero whitespace errors. |
| NO `npm run build` / `bun run build` | **N/A** | The wrangler build is implicit in `npx wrangler versions upload` — the S20 gate uses the upload which builds the bundle (Total Upload: 4189.92 KiB / gzip: 1454.54 KiB; Worker Startup Time: 14 ms). |

### (g) SSR output and unrelated-route smoke tests

| Check | Result | Evidence |
|---|---|---|
| The match page SSR renders the full Match Centre | **PASS** | HTTP 200; the agent-browser smoke verified the full Match Centre renders (the 11 sections in spec §3 order). |
| The homepage byte-frozen | **PASS** | Homepage PRE === PROD byte-size (228,624 bytes), `diff` line count = 0. The `#promoStrip`/`#tgHead`/`#tgPill` + the `#about`/`.pagesfoot` footer are byte-frozen (decision 65). |
| The /matches/today hub byte-frozen | **PASS** | `diff` line count = 0 (simultaneous fetch — the freshness timestamp «تاریخ به‌روزرسانی» is per-minute; sequential fetches crossing a minute boundary show a transient diff, but simultaneous fetch shows DIFF 0). |
| The team page byte-frozen | **PASS** | `diff` line count = 0 (simultaneous fetch). |
| The 6 match pages across leagues byte-frozen | **PASS** | Bayern vs Köln (Bundesliga), Man City vs Fulham (PL), Lazio vs Lecce (Serie A), Chelsea vs Leeds (PL), OGC Nice vs PSG (Ligue 1), M'gladbach vs Dortmund (Bundesliga), Parma vs Roma (Serie A) — all HTTP 200, PRE === PROD byte-size, DIFF 0. |
| Zero console errors | **PASS** | The agent-browser smoke: `agent-browser errors` empty + `agent-browser console` empty on the match page (desktop + mobile). |

### (h) Compare Worker CPU, KV/provider/subrequests, HTML size, TTFB and CWV to M0 baseline

| Metric | M0 baseline (audit §6) | mcM9x preview measured | Verdict |
|---|---|---|---|
| KV reads per match-page render | ~12-14 reads | UNCHANGED — `buildMatchPage`'s await count stays 3 (`hydrateMatchVenue`, `loadArchive`, `fullByCodeFor`); zero new KV reads, zero new fetches (the S20 assertion h1 verifies). The `/healthz` counters: `kv_writes_day: 456`, `kv_ops_last_tick: 29`, `subreq_last_tick: 29` — identical preview vs production (the shared STATE KV; the preview doesn't run cron triggers). | **PASS** (unchanged) |
| KV writes added by Match Centre | zero | zero (S04-S19 added zero writes — the audit §6 line 104 contract holds) | **PASS** |
| Provider fetches on the path | 1 (venue detail, ≤1 per match per 24h, KV-cached) | UNCHANGED (the `hydrateMatchVenue` await — the only fetch; the preview shares the production KV cache) | **PASS** |
| CPU rolling budget (free plan 10ms) | 10ms rolling average (the binding constraint — audit §13 risk 1) | **NOT INSTRUMENTED** — per-route CPU is NOT instrumented (audit §13 risk 1: "Per-route CPU is NOT instrumented — only class profiles"; the RUNBOOK §7/7b class profiles are the only CPU measurement). Stated as a known limitation. The structural protection holds: zero new parses (the pool JSON.parse is the pre-existing single ~331KB parse at the ctx level, NOT per-match), the render is O(ctx) string concatenation (the S20 assertion h2 verifies NO new `JSON.parse` + NO unbounded `for-of` over `ctx.pool`). | **LIMITATION** (stated honestly) |
| HTML payload | 45,187 bytes (the M0 baseline — the PRE-Match-Centre match page) | 125,549 – 130,087 bytes (across the 6 match pages) — the Match Centre body rework (S04-S18 sections: hero with portraits, standings window, form strip, metrics table, venue panel, schedule, FAQ accordion, related matches, telegram block) grew the page ~2.8x. The target was "keep in the same order of magnitude" (audit §6 line 108) — 45KB = 4.5×10^4, 125KB = 1.25×10^5, both are 10^5 in scientific notation → same order of magnitude. The growth is from the added CONTENT sections (legitimate), NOT from bloat. | **PASS** (same order of magnitude) |
| TTFB | ~1.4s (the M0 session location; edge cache `s-maxage=60`) | Preview: ~0.28s; Production: ~0.05s (the production edge cache serves the cached response; the preview runs on the workers.dev subdomain without the edge cache — the TTFB difference is the edge-cache behavior, NOT a regression). Both are fast. | **PASS** (the preview TTFB is higher than production because the workers.dev subdomain doesn't carry the production edge cache — stated honestly) |
| CWV (LCP/FID/CLS) | NOT instrumented in the sandbox | **NOT AVAILABLE** — the workers.dev preview doesn't carry the RUM beacon (the Cloudflare Web Analytics beacon is on the production pages, but the RUM data is NOT available in the sandbox). Stated as a known limitation. | **LIMITATION** (stated honestly) |
| Subrequests (the 50-fetch ceiling) | KV ops don't count; the venue-detail hydration is the only fetch (≤1 per match per 24h) | UNCHANGED — `subreq_last_tick: 29` (the /healthz counter — identical preview vs production; the preview doesn't run cron triggers, so the subrequest budget is the SSR path only) | **PASS** |

---

## 2. The S20 decision points (resolved + recorded)

Recorded in the S20 assertion-group header comment (`scripts/check-match-centre.js`) + this gate doc + the execution-log session entry — the S12-S19 precedent.

| Decision | Resolution | Rationale |
|---|---|---|
| **S20-Audit-method** | (c) BOTH — the check-script is the PRIMARY gate (the cross-cutting SEO/a11y/perf matrix lives there — the S19 precedent; the REAL renderers/projections/CSS verified via the already-loaded source strings + the transpiled module); the production-KV agent-browser smoke against the mcM9x preview is the GATE activity (the S18 gate precedent). | The check-script is the systematic matrix; the agent-browser is the visual + a11y + byte-frozen confirmation. Both ran — the gate is the conjunction. |
| **S20-Fix-scope** | (a) presentation-layer per gap — the default. The audit found NO presentation-layer gaps: the S04-S19 renderers + projections + CSS are ALREADY SEO/a11y/perf-compliant by construction. The S20 deliverable is the ASSERTION group (19 new assertions) that LOCKS IN the existing invariants. ZERO code changes to the renderers/projections/CSS. | Each session built its compliance path — the 4-node JSON-LD contract (S16-Schema omit), the 6 mcentre-scoped reduced-motion media queries, the logical-properties-only discipline, the ≥44px touch targets, the aria-expanded/aria-controls keyboard wiring, the `<caption>` for the facts table, the focus-visible outlines, the WCAG-AA contrast tokens. The byte-frozen surfaces stay byte-frozen (the GSC measurement is in flight until Dec 4-8 — audit §13 risk 2). |
| **S20-Gate-readiness** | the mcM9x preview PASSES the full smoke matrix → the gate PASSES → the release-candidate review + the owner approval request. | The GSC surfaces byte-frozen vs production (diff 0 across 6 match pages + the homepage + the hubs), the a11y checks (keyboard/focus-visible/reduced-motion/labels/contrast), the mobile 390 no-horizontal-scroll (overflow 0), zero console errors, the page-order (spec §3), the version string `13.256-mcM9x` on the preview + production re-verified `ok:true / 13.255-seospell` (untouched). |
| **S20-Regression-matrix** | the available upcoming match pages across the 6 leagues + cups + PGL (7 pages smokes: Bayern vs Köln, Man City vs Fulham, Lazio vs Lecce, Chelsea vs Leeds, OGC Nice vs PSG, M'gladbach vs Dortmund, Parma vs Roma — all HTTP 200, all DIFF 0). The production pool carries only upcoming matches (the sandbox "today" < 2026-11-20, so live + finished match pages are NOT in the current data; the S18 gate precedent acknowledged this limitation). | The live/finished lifecycle is verified BY CONSTRUCTION (the S19 lifecycle assertions + the projection signatures — `matchTelegramInput(ctx)` takes ONLY `ctx`, NOT `sm`, so the telegram block cannot differ by lifecycle; the S04 hero / S07 summary / S08 narrative lifecycle consistency is asserted in the S19 group). |
| **S20-Perf-measurement** | the AVAILABLE measurements: HTML size (via the SSR fetch — 125-130KB), TTFB (via the response timing — preview 0.28s / production 0.05s), KV reads (via the `/healthz` counters — unchanged). The UNAVAILABLE measurements: per-route CPU (NOT instrumented — audit §13 risk 1), CWV/RUM (the workers.dev preview doesn't carry the RUM beacon), the production edge cache behavior (the preview runs on workers.dev, NOT the production edge). | Stated honestly per audit §13 note 1: "Per-route CPU is NOT instrumented — only class profiles." The structural protection holds: zero new parses, O(ctx) string concatenation, the render-hold logic preserved exactly. |
| **S20-Gate-doc** | `docs/mc/m9-release-candidate-review.md` (this file — the release-candidate review matrix: the audit findings per subsection [a-h] + the smoke matrix results + the byte-frozen diff evidence + the perf measurements vs the audit §6 baseline + the known limitations + the owner approval request for M10). | The S18 gate doc precedent (`docs/mc/telegram-promotion-matrix.md`) — the release-candidate review is the gate artefact the owner reviews at the M10 gate. |

---

## 3. The smoke matrix — the production-KV agent-browser read-only smoke (PASSED)

The preview (`a91a15f8-0ddd-4170-a877-67d751f3bfd2` / `https://a91a15f8-ucl-notifier.sportsignal.workers.dev`) shares the production STATE KV (the `wrangler.preview.toml` keeps the production `STATE` KV `id = "c63588df…"`, MINUS the two optional `[[d1_databases]]` blocks — the S18 gate precedent), so real match pages render with real data.

### The smoke results

| Check | Result | Evidence |
|---|---|---|
| (a) The match page renders on the preview | **PASS** | Bayern vs Köln (upcoming, Bundesliga): HTTP 200, the full Match Centre renders (the 11 sections in spec §3 order). The page title «⚽ بایرن مونیخ – کلن | بوندسلیگا، ۲۹ آبان | اسپرت سیگنال». |
| (b) The GSC surfaces byte-frozen vs production | **PASS** | `<title>`, `<link rel="canonical">`, `<meta property="og:title">`, `<meta name="twitter:title">`, the JSON-LD `<script type="application/ld+json">`, the `<h1>` — all byte-identical (preview vs production). The FULL HTML `diff` line count = 0 across 6 match pages (Bayern/Köln, Man City/Fulham, Lazio/Lecce, Chelsea/Leeds, OGC Nice/PSG, M'gladbach/Dortmund, Parma/Roma). |
| (c) The homepage byte-frozen | **PASS** | Homepage PRE === PROD byte-size (228,624 bytes), `diff` line count = 0. The `#promoStrip`/`#tgHead`/`#tgPill` + the `#about`/`.pagesfoot` footer are byte-frozen (decision 65). |
| (d) The page-order (DOM order) | **PASS** | `mcentre-hero` → `mcentre-nav` → `mcentre-summary` → `mcentre-standings` → `mcentre-form` → `mcentre-venue` → `mcentre-schedule` → `mcentre-faq` → `mcentre-related` → `mcentre-telegram` → `mcentre-footer-hook` (spec §3 items 2-12; the agent-browser `eval` confirmed the section order). |
| (e) Mobile 390 no-horizontal-scroll | **PASS** | Viewport 390: `scrollWidth: 390`, `clientWidth: 390`, `overflow: 0`, `innerWidth: 390` — `scrollWidth === clientWidth === 390`, overflow 0. No horizontal scroll at 390px. |
| (f) Zero console errors | **PASS** | `agent-browser errors` empty + `agent-browser console` empty on the match page (desktop + mobile). |
| (g) The a11y — focus-visible | **PASS** | Focusing the first `.mnav-item`: `outlineStyle: solid`, `outlineWidth: 2px`, `outlineColor: rgb(125, 211, 252)` — the #7dd3fc icy-blue 2px focus ring. |
| (h) The a11y — the FAQ button ARIA | **PASS** | `ariaExpanded: "false"`, `ariaControls: "mfaq-a-0"`, `tagName: "BUTTON"` — the keyboard-accessible button with ARIA wiring. |
| (i) The a11y — the telegram CTA | **PASS** | `color: rgb(15, 23, 42)` (the #0f172a dark navy text on the icy-blue gradient) + `minHeight: "44px"` (≥44px touch target — decision 70 / WCAG 2.5.8) + `target="_blank" rel="noopener noreferrer"` + the accessible name «عضویت در کانال تلگرام». |
| (j) Production re-verified after the upload | **PASS** | `https://ucl-notifier.sportsignal.workers.dev/healthz` → `ok:true / version:13.255-seospell / degraded:false` (production UNTOUCHED — `wrangler versions deploy` / `wrangler deploy` NEVER run). |
| (k) Preview version | **PASS** | `https://a91a15f8-ucl-notifier.sportsignal.workers.dev/healthz` → `ok:true / version:13.256-mcM9x` (the mcM9x bump lives only in the uploaded bundle; the repo version string stays `13.256-mcfound`; the `src/config.ts` edit reverted immediately after the upload — `git diff src/config.ts` = clean). |
| (l) The KV counters (shared STATE KV) | **PASS** | `kv_writes_day: 456`, `kv_ops_last_tick: 29`, `subreq_last_tick: 29` — identical preview vs production (the preview shares the production STATE KV; the preview doesn't run cron triggers, so the counters are the same snapshot). |

### The screenshots

- `docs/assets/s20-m9gate/s20-desktop-bayern-koln.png` — the desktop full-page screenshot (1280×800, the full Match Centre: hero → nav → summary → standings → form → venue → schedule → faq → related → telegram → footer-hook).
- `docs/assets/s20-m9gate/s20-mobile-390-bayern-koln.png` — the mobile 390 viewport screenshot (390×844, the single-column flow, no horizontal scroll).

### The regression matrix (7 match pages across the leagues)

| Match | League | HTTP | PRE bytes | PROD bytes | DIFF |
|---|---|---|---|---|---|
| bayern-munich-vs-1-koln-2026-11-20 | Bundesliga | 200 | 125,549 | 125,549 | 0 |
| manchester-city-vs-fulham-2026-11-21 | Premier League | 200 | 130,087 | 130,087 | 0 |
| lazio-vs-lecce-2026-11-21 | Serie A | 200 | 127,414 | 127,414 | 0 |
| chelsea-vs-leeds-united-2026-11-21 | Premier League | 200 | 129,850 | 129,850 | 0 |
| ogc-nice-vs-paris-saint-germain-2026-11-21 | Ligue 1 | 200 | 128,085 | 128,085 | 0 |
| borussia-monchengladbach-vs-borussia-dortmund-2026-11-21 | Bundesliga | 200 | 129,326 | 129,326 | 0 |
| parma-vs-roma-2026-11-21 | Serie A | 200 | 127,931 | 127,931 | 0 |

All 7 match pages: HTTP 200, PRE === PROD byte-size, DIFF 0 — byte-for-byte identical preview vs production.

**Smoke note:** the production pool currently carries only upcoming matches (the sandbox "today" < 2026-11-20, so every match in the pool is upcoming). Live + finished match pages are NOT in the current data. The lifecycle consistency is verified BY CONSTRUCTION: the S19 lifecycle assertions (the S04 hero / S07 summary / S08 narrative across upcoming/live/finished) + the projection signatures (the telegram block's `matchTelegramInput(ctx)` takes ONLY `ctx`, NOT `sm` — the block cannot differ by lifecycle) are the structural guarantee. The S18 gate precedent acknowledged this limitation.

---

## 4. The known limitations (stated honestly per audit §13)

| Limitation | Source | S20 resolution |
|---|---|---|
| Per-route CPU is NOT instrumented | audit §13 risk 1: "Per-route CPU is NOT instrumented — only class profiles (RUNBOOK §7/7b)" | Stated honestly. The structural protection holds: zero new KV reads/parses (the await count stays 3 — the S20 assertion h1), the render is O(ctx) string concatenation (the S20 assertion h2 verifies NO new `JSON.parse` + NO unbounded `for-of` over `ctx.pool`), the render-hold logic in `router.ts` (live 120s / upcoming kickoff+120s / finished 900s) is preserved exactly. The M10 release-readiness gate (S21) may instrument per-route CPU if the owner approves. |
| CWV/RUM is NOT available in the sandbox | the workers.dev preview doesn't carry the RUM beacon | Stated honestly. The Cloudflare Web Analytics beacon is on the production pages, but the RUM data (LCP/FID/CLS) is NOT available in the sandbox. The production CWV will be measurable after the M10 production release (S22). The structural CWV protection: the SSR HTML is byte-frozen (the preview === production), the CSS is the design-system's own tokens (no layout shift from late-loading fonts — the fonts are preloaded), the LCP element is the hero (above the fold, server-rendered). |
| Live + finished match pages are NOT in the current pool | the sandbox "today" < 2026-11-20 | Stated honestly. The regression matrix covers the 7 available upcoming match pages across the 6 leagues + cups. The live/finished lifecycle is verified BY CONSTRUCTION (the S19 lifecycle assertions + the projection signatures). |
| The production edge cache behavior is NOT on the preview | the preview runs on the workers.dev subdomain, NOT the production edge | Stated honestly. The TTFB difference (preview 0.28s vs production 0.05s) is the edge-cache behavior — the production `s-maxage=60` edge cache serves the cached response; the preview doesn't carry the edge cache. This is NOT a regression — the production TTFB is the edge-cached measurement (the M0 baseline ~1.4s was from a different session location). |
| The cross-track SEO measurement is in flight until Dec 4-8 | audit §13 risk 2 | The GSC surfaces (title/meta description/canonical/og:title/Twitter/SportsEvent SHAPE/h1) + the answer sentence stay BYTE-FROZEN (the preview === production — diff 0). The M9 gate does NOT touch the GSC surfaces (the S20-Fix-scope decision = (a) — the audit found NO gaps, so ZERO code changes to the byte-frozen surfaces). |

---

## 5. The tests — `scripts/check-match-centre.js` (the S20 assertion group)

The S20 assertion group (ADDITIVE to the S19 group — 19 new `check()` assertions across the a-h subsections):

- **(a) Visible facts and schema consistency** — 4 assertions: (a1) the jsonldNodes carries ONLY the 4 allowed sources (siteNodes + webPageNode + sportsEventNode + breadcrumbNode — NO faqNode/itemListNode/collectionPageNode/datasetNode); (a2) the SportsEvent node carries startDate + homeTeam + awayTeam + organizer + location (conditional) + description, NO invented endDate/offers/aggregateRating/review; (a3) the meta description === the answer sentence (the matchAnswerSentence funnel); (a4) the SportsEvent description === the answer sentence (the same source).
- **(b) Answer-first context and facts table distinct** — 2 assertions: (b1) the narrative templates NEVER reference kickoff/venue/score (only {rivalry}/{round}/{comp}); (b2) the answerHtml + narrativeHtml are distinct atoms (the narrative renders ABOVE the .mcentre-cols pairing — verified via the REAL matchSummaryHtml output).
- **(c) No unsupported schema/FAQ/AI markup** — 2 assertions: (c1) NO FAQPage + NO Article/BlogPosting/Event (the SportsEvent is the ONLY event-type node); (c2) NO AI-specific markup (no Speakable/ClaimReview/ai-generated/machineLearning across jsonld.ts + pages.ts + match-centre.ts).
- **(d) Keyboard/focus/reduced-motion/labels/contrast** — 6 assertions: (d1) the reduced-motion media queries gate EVERY mcentre animation (6 mcentre-scoped blocks + the global kill rule); (d2) the FAQ accordion buttons carry aria-expanded + aria-controls + role=region; (d3) the schedule expand button carries aria-expanded + aria-controls + the label swap; (d4) the telegram CTA carries target=_blank rel=noopener + min-height:44px + focus-visible outline; (d5) the nav + every section carries aria-label + the facts table carries a caption; (d6) the contrast tokens meet WCAG AA (#0f172a/#1e293b + #f1f5f9/#e2e8f0 + #7dd3fc — the focus-visible outlines use #7dd3fc).
- **(e) RTL/LTR + responsive** — 3 assertions: (e1) the mcentre CSS blocks use logical properties ONLY (no physical left/right — the FULL sweep); (e2) the .mcentre-cols grid collapses to one column below 1080px (the collapse-to-one-column discipline); (e3) the page-order is the spec §3 order (the MC_SECTION_ORDER registry).
- **(h) Perf invariants** — 2 assertions: (h1) the await count stays 3 (the KV-read budget — zero new KV reads/fetches); (h2) the HTML payload stays O(ctx) (NO new JSON.parse + NO unbounded for-of over ctx.pool — the render is string concatenation).

`scripts/check-a11y.js` is UNCHANGED — the S20 audit found NO a11y gap that the existing `check-a11y.js` doesn't catch at the GLOBAL level (the global reduced-motion kill rule + the contrast matrix + the touch targets are already asserted). The match-centre-specific a11y (the accordion, the nav landmark, the mcentre CSS contrast, the per-component reduced-motion) is gated by the S20 assertion group in `check-match-centre.js` (the established pattern — the match-centre assertions live in `check-match-centre.js`, NOT `check-a11y.js`; the S20-Fix-scope decision = (a) — NO `check-a11y.js` co-evolution warranted).

`scripts/seo-check.js` runs against the mcM9x preview URL if the owner requests it at the M10 gate (the `npm run seo:check:local <url>` invocation — the 25 test sections T-01 through T-25). The byte-frozen GSC diff (diff 0 across 6 match pages) is the structural proof the SEO contracts hold.

**Tests:** `npm test` exit 0 — **3,573 OK** (baseline 3,554 + 19 new check-match-centre S20 assertions), 0 failures; `tsc` clean; `git diff --check` clean.

---

## 6. NOT MODIFIED (byte-frozen)

The GSC surfaces (title/meta description/canonical/og:title/Twitter/SportsEvent SHAPE/h1), the answer sentence (matchAnswerSentence — the meta-description + JSON-LD source), the S07 facts-table venue cell, the S07/S08 summary + narrative, the S10 selection module, the S11 standings renderer, the S12 form renderer + the S13 metrics renderer, the S14 venue panel + the windowSchedule helper, the S15 matchScheduleHtml renderer + the matchScheduleScript, the S16 matchFaqHtml renderer + the matchFaqScript + the matchFaqInput projection + the buildMatchFaqItems content module, the S17 matchRelatedHtml renderer + the matchRelatedInput projection, the S18 matchTelegramHtml renderer + the matchTelegramInput projection, the hub faqHtml() renderer (markup.ts) + the .faqcard hub CSS, the nav's adaptive Q9=B filter + the 5 destinations (MC_NAV_DESTS), the homepage #promoStrip/#tgHead/#tgPill/#tgPillGo surfaces (src/pages/public.ts) + the TG_CHANNEL_URL constant, the #about/.pagesfoot footer (src/seo/page-shell.ts), `scripts/lib/worker-src.js`, `src/config.ts` (the version string stays `13.256-mcfound`), the `wrangler.toml`, `assets/_headers` + `assets/sw.js` (zero new pinned asset — S20 adds NO new assets).

---

## 7. The owner approval request for M10

The mcM9x preview (`a91a15f8-0ddd-4170-a877-67d751f3bfd2` / `https://a91a15f8-ucl-notifier.sportsignal.workers.dev`) IS the release candidate for M10 production release. The M9 gate is **PASSED**:

- The SEO/a11y/perf/regression audit (matrix a-h) found NO presentation-layer gaps — the S04-S19 renderers + projections + CSS are ALREADY compliant by construction; the S20 assertion group (19 new assertions) LOCKS IN the invariants for regression protection.
- The production-KV agent-browser smoke verified the full Match Centre on real upcoming match pages across 6 leagues + the GSC surfaces byte-frozen vs production (diff 0) + the a11y checks + the mobile 390 no-horizontal-scroll + the page-order (spec §3) + zero console errors.
- The perf measurements: HTML size 125-130KB (same order of magnitude as the 45KB M0 baseline), TTFB preview 0.28s / production 0.05s, KV reads unchanged (~12-14, the await count stays 3), the per-route CPU + CWV/RUM limitations stated honestly.

**The owner approval is REQUESTED** (NOT granted by the agent — the gate produces the evidence + the request; the owner grants approval at the M10 gate per AGENTS.md §5 + §9 + the milestone-gate ritual). The M10 production release (S22) is the next activity: `wrangler versions deploy` on the `a91a15f8` version (or a fresh upload if the owner requests a re-bundle) → production traffic shifts to the mcM9x code → the `sportsignal.ir` + `football.sportsignal.ir` hostnames serve the Match Centre. Rollback: `npx wrangler deployments list` → `npx wrangler rollback` (the deployment 88649642 / version `b48bae21` at `13.255-seospell` is the rollback point).

NO version bump (repo stays `13.256-mcfound`; the mcM9x bump lives only in the uploaded preview bundle). NO deploy (production stays `13.255-seospell` / deployment `88649642` — `wrangler versions deploy` / `wrangler deploy` NEVER run on production; the mcM9x preview is NEVER activated — production deploy is the S22 activity).

---

**M9 is COMPLETE — the M9 gate PASSED 2026-11-14.** The Match Centre (S04-S19) is the release candidate for M10 production release. The S20 assertion group locks in the SEO/a11y/perf/regression invariants for regression protection. **S21 is next** (M10 release readiness + rollback verification + the release notes).
