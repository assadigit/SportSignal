# Match Centre — Telegram Promotion Matrix (M8 gate)

**Milestone:** M8 — Telegram promotion (S18)
**Specification:** §14 "Telegram promotion" + §1 (position 11 — Featured Telegram promotion, after related matches, before the global footer) + §3 (section order) + §15 (Q3 = A — compose from existing verified assets, RESOLVED 2026-11-11)
**Decisions:** 65 (reuse the existing global footer), 66 (contextual Telegram channel promotion near page bottom), 67 (the preferred Persian headline «اسپورت‌سیگنال را در تلگرام دنبال کنید تا هیچ مسابقه مهمی را از دست ندهید.» + the optional supporting line about upcoming important matches), 68 (a FEATURED block, NOT a tiny banner; distinct background, supporting illustration, Telegram branding, ONE CTA), 69 (original football-themed illustration incorporating Telegram; no stock/oversized Telegram logo — Q3=A resolves to "compose from existing verified assets"), 70 (mobile full-width; illustration adapts above/alongside text; clear tappable CTA), 71 (show on every Match Centre lifecycle state — upcoming/live/finished), 72 (place after related matches + immediately before the global footer), 13 (the Telegram block is OUTSIDE the 5-item nav — خلاصه، جدول، فرم، بازی‌ها، ورزشگاه)
**Audit:** §4 row 78 (Telegram promotion — channel URL + assets, grade A — `TG_CHANNEL_URL` (public.ts:12) = `TELEGRAM_CHANNEL_PUBLIC_URL` (wrangler var) = `https://t.me/...`; 0/0 new fetch/KV) + §12 row S18 (`src/seo/match-centre.ts` — featured block, verified `TG_CHANNEL_URL`, one CTA) + §15 note 9 (the `_headers` 100-rule cap — the S18 inline-SVG path avoids the pin-vs-no-pin decision entirely)
**Preview:** `13.256-mcM8x` — Worker Version `017f7939-245f-41a2-9b6a-213c994a287e` (https://017f7939-ucl-notifier.sportsignal.workers.dev) — uploaded NEVER activated (`wrangler versions deploy` / `wrangler deploy` NEVER run — `wrangler.preview.toml` = `wrangler.toml` MINUS the two `[[d1_databases]]` blocks, gitignored; the preview shares the production STATE KV so real match pages render; the repo version string stays `13.256-mcfound`; the mcM8x bump lives only in the uploaded bundle via a temporary `src/config.ts` edit reverted immediately after the upload).
**Gate result:** **PASSED** — the production-KV agent-browser read-only smoke verified the Telegram promotion block on real match pages + the CTA href/accessibility/touch-target + the page order (related → telegram → footer-hook) + the mobile 390 full-width + no-horizontal-scroll + zero console errors + the GSC surfaces byte-frozen vs production + the homepage + footer byte-frozen + production re-verified `ok:true / 13.255-seospell` after the upload.

---

## 1. The S02 contract — the pre-existing slot + the pre-existing optional key

S18 consumes the S02 contract with NO contract change. The `mcentre-telegram` section slot ALREADY EXISTS in the `MC_SECTION_ORDER` registry (`src/seo/match-centre.ts` line 113), positioned AFTER `mcentre-related` + BEFORE `mcentre-footer-hook` — exactly specification §1 position 11 + decision 72 ("Place it after related matches and immediately before global footer"). The `bySlot` map already maps `"mcentre-telegram": parts.telegram || ""`. `MatchCentreParts.telegram?: string` is an OPTIONAL key (the S02 contract — line 133; optional like `faq?:`/`venue?:`/`schedule?:`, NOT required like `hero`/`summary`/`form`/`related`/`footerHook`). `buildMatchPage` previously omitted the `telegram` key; S18 ADDS the `telegram: telegramHtml` wiring (the S14 venue / S15 schedule / S16 faq precedent — an optional key FILLED for the first time). NO new slot, NO new interface field, NO new section anchor, NO reorder. The nav stays 5 items per decision 13 (the Telegram block is OUTSIDE the 5-item nav — the Q9=B adaptive filter unchanged; the telegram block never lights a nav destination; related + FAQ are also outside the nav).

## 2. The verified channel URL — the single source of truth (decision S18-URL)

The CTA `href` is read from `ctx.env.TELEGRAM_CHANNEL_PUBLIC_URL` at runtime (the wrangler var — the single source of truth). The verified canonical value is `https://t.me/SportSignalz` (`wrangler.toml` line 95 — capital S). The CTA `href` MUST equal exactly this value — NEVER the bot URL `https://t.me/SportSignalAlertsBot` (specification §14 "No separate bot promotion" + "Reuse the verified channel URL from the repository/configuration; never invent it"; decision 68 "one CTA").

| Surface | Constant | Value | Byte-frozen? |
|---|---|---|---|
| wrangler.toml (the wrangler var) | `TELEGRAM_CHANNEL_PUBLIC_URL` | `https://t.me/SportSignalz` | the source of truth (read by ctx.env at runtime) |
| Match Centre block CTA (S18) | `matchTelegramInput(ctx)` → `hrefHtml` | `ctx.env.TELEGRAM_CHANNEL_PUBLIC_URL` (verbatim) | reads the wrangler var at runtime — NEVER invented |
| Homepage `#tgHead` / `#promoStrip` / `#tgPill` (public.ts:12) | `TG_CHANNEL_URL` | `https://t.me/sportsignalz` (lowercase) | byte-frozen (decision 65 — a SEPARATE homepage surface; the match-centre block composes a NEW `.mcentre-telegram` variant, NOT a modification of the homepage surfaces) |

The audit §3/§4 claim that `public.ts:12` = `TELEGRAM_CHANNEL_PUBLIC_URL` was loose on case: the wrangler var is `https://t.me/SportSignalz` (capital S), the homepage constant is `https://t.me/sportsignalz` (lowercase). Both resolve to the same channel (Telegram URLs are case-insensitive). The match-centre block reads the wrangler var verbatim (capital S); the homepage keeps its own lowercase constant byte-frozen (decision 65 — the homepage `#promoStrip`/`#tgHead`/`#tgPill` surfaces are untouched; the S17 decision S17-Row precedent: the S15 design vocabulary reused at the DESIGN level, NOT the CSS-class level).

## 3. The Persian copy — decision 67 + specification §14 (verbatim)

The headline + the supporting line + the CTA label are the OWNER-EXACT strings (decision S18-Copy = ALWAYS — the supporting line is rendered as a fixed editorial subtitle on every lifecycle state, NOT conditional on an upcoming-match pool read; decision 71 consistency + the zero-runtime-cost law). These are composer-owned constants in `src/seo/match-centre.ts` (the `MC_VENUE_TITLE` precedent — static Persian strings live in the composer, NOT in the projection).

| Constant | Value (verbatim) | ZWNJ |
|---|---|---|
| `MC_TELEGRAM_HEADLINE` | `اسپورت‌سیگنال را در تلگرام دنبال کنید تا هیچ مسابقه مهمی را از دست ندهید.` | between اسپورت + سیگنال (U+200C); the space between مسابقه + مهمی is a normal space (NOT a ZWNJ) |
| `MC_TELEGRAM_SUPPORTING` | `از مسابقات بزرگ پیش‌رو باخبر بمانید.` | between پیش + رو (U+200C) |
| `MC_TELEGRAM_CTA_LABEL` | `عضویت در کانال تلگرام` | (no ZWNJ) — the `#tgHead` owner-exact aria-label (`public.ts` line ~756: "the accessible name stays the owner's exact «عضویت در کانال تلگرام»"; the formal, clear, featured-block CTA label — NOT the informal `#promoStrip .ps-fa` «عضو کانالمون شو» variant) |

## 4. The supporting illustration — Q3=A (compose from existing verified assets)

Decision 69 ("Original football-themed illustration incorporating Telegram; no stock/oversized Telegram logo") + Q3=A (RESOLVED 2026-11-11 = "compose from existing verified assets", NOT a new authored illustration). S18 composes from the EXISTING verified Telegram-brand assets:

- **The inline SVG** — the `#tgHead` verified circled-Telegram-mark path (`src/pages/public.ts` line ~756 — the existing verified channel-icon asset). Inlined at 56px (a featured-block illustration size — prominent but NOT oversized; decision 69 "no stock/oversized Telegram logo"). `aria-hidden="true"` (decorative). The `color: #7dd3fc` (icy blue) on the `.mcentre-telegram-art` container drives the `currentColor` the SVG picks up.
- **The football-themed atmosphere** — the CSS dark-navy/icy-blue stadium gradient (the existing design-system tokens: `#0f172a`/`#1e293b` dark navy gradient + the `rgba(125,211,252,.28)` icy-blue border + the radial icy-blue glow — the SAME family `.mfin`/`.mcount`/`.mvenue-map`/`.strow-me` use; specification §5 "Atmosphere: Subtle dark stadium image or texture for depth").

**Decision S18-Illustration = (a) inline SVG** (the `#tgHead` verified path) + the CSS dark-navy/icy-blue atmosphere. **Decision S18-Asset-pin = N/A** — the pure inline-SVG path (ADR-006 "prefer inline SEO-page `<style>`/`<svg>`"). Zero new asset file, zero `_headers` pin, zero `sw.js` bump, zero cap sweep (the `_headers` is at its 100-rule cap — audit §15 note 9; the inline path avoids the pin-vs-no-pin decision entirely). NO new authored illustration file (Q3=A — compose from existing verified assets ONLY; NO stock imagery, NO oversized Telegram logo).

## 5. The renderer + the projection — the S14 venue precedent (composer owns the constants; projection passes the single data atom)

### The renderer — `matchTelegramHtml(t: MatchTelegramInput): string` (`src/seo/match-centre.ts`)

The composer owns the static Persian constants (`MC_TELEGRAM_HEADLINE` / `MC_TELEGRAM_SUPPORTING` / `MC_TELEGRAM_CTA_LABEL`) + the static SVG markup (`MC_TELEGRAM_SVG`) — the `MC_VENUE_TITLE` / `MC_VENUE_VERIFIED_MARK` precedent. The renderer is a PURE LEAF for the telegram MARKUP (the S07 summary / S17 related precedent — the telegram block is NON-interactive, NO script; the CTA is a plain `<a target="_blank" rel="noopener noreferrer">`). DOM = the `.mcentre-telegram` featured block (the distinct dark navy/icy-blue background — decision 68) with TWO tracks: the `.mcentre-telegram-art` (the inline SVG illustration — Q3=A) + the `.mcentre-telegram-body` (the `.mcentre-telegram-head` headline + the `.mcentre-telegram-sub` supporting line [rendered ALWAYS — decision S18-Copy] + the ONE `.mcentre-telegram-cta` `<a>` [decision 68 "one CTA"; `target="_blank"` `rel="noopener noreferrer"` — the `#tgHead` precedent; the accessible name = the owner-exact «عضویت در کانال تلگرام» label; the touch target ≥44px — decision 70 / WCAG 2.5.8]).

Fail-closed: `!t.hrefHtml` → `""` (the section omits entirely — the no-empty-cards law; `TELEGRAM_CHANNEL_PUBLIC_URL` empty/missing → the block omits; otherwise it ALWAYS renders on every lifecycle state — decision 71).

### The projection — `matchTelegramInput(ctx: SeoCtx): MatchTelegramInput` (`src/seo/pages.ts`)

The ONLY data atom is `hrefHtml` — the verified channel URL (`esc(ctx.env.TELEGRAM_CHANNEL_PUBLIC_URL)`; `""` → the block omits). The headline + the supporting line + the CTA label + the SVG illustration are composer-owned constants (NOT projection atoms — the projection passes only the single data atom, exactly as the S14 `MatchVenueInput` passes only `nameHtml`). The signature takes ONLY `ctx` (what it uses: `ctx.env.TELEGRAM_CHANNEL_PUBLIC_URL`) — the S14 `matchVenueInput(sm)` "take only what you use" precedent (the telegram block is editorial — no match-specific data: the URL is global config, the copy is static editorial; the supporting line is ALWAYS rendered, NOT conditional on an upcoming-match `ctx.pool` read — decision S18-Copy + the zero-runtime-cost law).

```typescript
function matchTelegramInput(ctx: SeoCtx): MatchTelegramInput {
  const url = (ctx && ctx.env && ctx.env.TELEGRAM_CHANNEL_PUBLIC_URL) || "";
  return { hrefHtml: url ? esc(url) : "" };
}
```

### The wiring — `telegram: telegramHtml` (`src/seo/pages.ts` `buildMatchPage`)

```typescript
const telegramHtml = matchTelegramHtml(matchTelegramInput(ctx));
const main = matchCentreMain({
  // …hero, nav, summary, standings, form, venue, schedule, faq, related…
  telegram: telegramHtml,
  footerHook: related
});
```

NO script suffix (the telegram block is a STATIC featured card — contrast the S15 `schedule: scheduleHtml ? scheduleHtml + matchScheduleScript() : ""` + the S16 `faq: faqHtml ? faqHtml + matchFaqScript() : ""` which ride their parts via the ternary; the telegram part is the bare `matchTelegramHtml` output, NO script).

## 6. The cost law — ZERO new awaits, ZERO new KV reads, ZERO new fetches (ADR-006)

The channel URL is `ctx.env.TELEGRAM_CHANNEL_PUBLIC_URL` — a static config value (already bound on `ctx.env`, NOT a KV read, NOT a fetch). The illustration is inline SVG (zero asset fetch). The supporting line is ALWAYS rendered (no conditional `ctx.pool` read — decision S18-Copy). `buildMatchPage`'s await count stays exactly 3 (`hydrateMatchVenue`, `loadArchive`, `fullByCodeFor` — the pre-existing loads; the telegram block reads `ctx.env` ONLY). The composer purity: `matchTelegramHtml` is pure string composition — ZERO client-script, ZERO fetch, ZERO KV, ZERO timer (the S07 summary / S17 related precedent; the only inline-JS exceptions are the S04 countdown / S06 nav / S15 schedule / S16 FAQ — the telegram block is NOT one of them).

## 7. The CSS — `src/seo/page-shell.ts` (the S18 block, scoped to `#mcentre-telegram`)

Placed AFTER S17 (the related-matches list) + BEFORE S03 (the responsive/spacing/RTL foundation) — chronological session order: S04 → S05 → S06 → S07 → S08 → S11 → S12 → S13 → S14 → S15 → S16 → S17 → S18 → S03.

- **The featured background** (decision 68) — `linear-gradient(135deg,#0f172a 0%,#1e293b 100%)` (the dark navy gradient) + `border:1px solid rgba(125,211,252,.28)` (the icy-blue border) + `box-shadow` (the depth) + the `::before` radial icy-blue glow (the stadium atmosphere). The block's own icy/navy tokens (the SAME family `.mfin`/`.mcount`/`.mvenue-map`/`.strow-me` use).
- **The illustration art** — `.mcentre-telegram-art` carries `color:#7dd3fc` (the `currentColor` the inline SVG picks up) + `filter:drop-shadow(...)` (the glow).
- **The headline** — `.mcentre-telegram-head` carries `font-weight:800` (prominent — decision 68) + `color:#f1f5f9` (legible on the dark navy).
- **The CTA** — `.mcentre-telegram-cta` carries `min-height:44px` (decision 70 — the `#tgHead` 44px precedent / WCAG 2.5.8) + `background:linear-gradient(180deg,#7dd3fc 0%,#5ea0ff 100%)` (the icy-blue gradient) + `:hover`/`:active`/`:focus-visible` states.
- **Reduced-motion** — `@media (prefers-reduced-motion:reduce)` gates the CTA hover `transition` (reduced-motion = no animation — the S06/S15/S17 precedent; the telegram block is otherwise a STATIC featured card — NO pulse, NO glow, NO countdown).
- **Mobile ≤600px** — `flex-direction:column` (the illustration adapts ABOVE the text — decision 70) + `align-self:center` on the art + `align-self:stretch` on the CTA (full-width — decision 70). No horizontal scroll at 390px (the block is full-width, the CTA stretches).
- **CSS logical properties ONLY** (decision 2) — `margin-block-start`, `padding-block`, `padding-inline`, `inset-block-start`, `inset-inline-start`, `inline-size`, `block-size`. No physical left/right properties (RTL/LTR clean under a dir flip).

The homepage `#promoStrip`/`#tgHead`/`#tgPill` surfaces (`src/pages/public.ts`) stay byte-frozen (decision 65 — the S18 block is a NEW `.mcentre-telegram` variant, NOT a modification of the homepage surfaces). The `#about`/`.pagesfoot` footer stays byte-frozen (decision 65 reuse the existing footer — the telegram block is placed BEFORE the footer in the DOM, NOT a footer modification).

## 8. The lifecycle consistency — decision 71 (show on EVERY lifecycle state)

The telegram block renders on upcoming + live + finished match pages — it is NOT lifecycle-conditional (contrast the S15 schedule / S16 FAQ which can omit; the telegram block ALWAYS renders when the URL is present). The block is editorial, NOT data-driven: the URL is a static config value, the copy is static editorial. The projection reads `ctx.env` ONLY (NOT `sm` — no match-specific data). The check script's S18 lifecycle-consistency assertion verifies the block produces IDENTICAL markup regardless of the match lifecycle (the same `hrefHtml` atom produces the same markup on every match page).

**Smoke note:** the production pool currently carries only upcoming matches (the sandbox "today" < 2026-11-20, so every match in the pool is upcoming). Live + finished match pages are not in the current data. The lifecycle consistency is verified BY CONSTRUCTION: the projection `matchTelegramInput(ctx)` takes ONLY `ctx` (NO `sm`) — the block cannot differ by lifecycle. The agent-browser smoke verified the block renders identically on TWO real upcoming match pages (Arsenal vs Manchester City + Bayern Munich vs 1. Köln). The check script's S18 lifecycle-consistency assertion + the projection's signature (NO `sm` parameter) are the structural guarantee.

## 9. The fail-closed path — the no-empty-cards law

An EMPTY/missing `TELEGRAM_CHANNEL_PUBLIC_URL` → `hrefHtml ""` → `matchTelegramHtml` returns `""` → the `mcentre-telegram` section omits entirely (the no-empty-cards law — the `sectionHtml` helper skips empty/whitespace-only content; the S02 `telegram?: ""` path). The check script verifies all three fail-closed paths: (a) an EMPTY URL → `""`; (b) a MISSING `ctx.env` key → `""`; (c) a NULL `ctx` → `""` (the defensive `(ctx && ctx.env && ctx.env.TELEGRAM_CHANNEL_PUBLIC_URL) || ""` guard — the telegram block NEVER crashes the page).

## 10. The M8 gate — the production-KV agent-browser read-only smoke (PASSED)

The preview (`017f7939-245f-41a2-9b6a-213c994a287e` / `https://017f7939-ucl-notifier.sportsignal.workers.dev`) shares the production STATE KV (the `wrangler.preview.toml` keeps the production `STATE` KV `id = "c63588df…"`, MINUS the two optional `[[d1_databases]]` blocks — the mcM6x/mcM7x precedent), so real match pages render with real data.

### The smoke results

| Check | Result |
|---|---|
| (a) The block renders on real match pages | **PASS** — Arsenal vs Manchester City (upcoming) + Bayern Munich vs 1. Köln (upcoming): the `.mcentre-telegram` section + the `.mcentre-telegram-art` + the `.mcentre-telegram-body` + the headline + the supporting line + the CTA all present |
| (b) The CTA href + accessibility + touch target | **PASS** — `href="https://t.me/SportSignalz"` (the verified URL, capital S) + `target="_blank"` + `rel="noopener noreferrer"` + accessible name «عضویت در کانال تلگرام» + computed `height: 64px` (≥44px — decision 70 / WCAG 2.5.8) |
| (b') The no-bot-promotion law | **PASS** — the `mcentre-telegram` section contains 0 occurrences of `SportSignalAlertsBot` (the bot URL appears only in the pre-existing byte-frozen surfaces: the JSON-LD `sameAs`, the header `#topbar` CTA, the footer `srcline` — all untouched by S18) |
| (c) The page order (DOM order) | **PASS** — `mcentre-related` → `mcentre-telegram` → `mcentre-footer-hook` (spec §1 position 11 + decision 72 — AFTER related matches + BEFORE the footer-hook) |
| (d) Mobile 390 full-width + no-horizontal-scroll + illustration adapts | **PASS** — viewport 390: `flex-direction:column` (stacked — the illustration adapts ABOVE the text), the art `align-self:center`, the CTA `align-self:stretch` (full-width 332px within the `.page-col`), `scrollWidth === clientWidth === 390` (overflow 0 — no horizontal scroll), the CTA `height: 64px` (≥44px) |
| (e) Zero console errors | **PASS** — `agent-browser errors` + `agent-browser console` both empty on desktop + mobile |
| (f) The GSC surfaces byte-frozen vs production | **PASS** — `<title>` + `<link rel="canonical">` + `<h1>` identical (preview vs production `ucl-notifier.sportsignal.workers.dev`) |
| (g) The `#about`/`.pagesfoot` footer byte-frozen (decision 65) | **PASS** — the footer markup + the `.pagesfoot` CSS untouched; the homepage `diff` line count = 0 (byte-identical preview vs production) |
| (h) The homepage `#promoStrip`/`#tgHead`/`#tgPill` byte-frozen | **PASS** — the homepage preview === production BYTE-FOR-BYTE (`diff` line count = 0; the `#promoStrip` + `#tgHead` + `#tgPill` surfaces all present on both, unchanged) |
| Production re-verified after the upload | **PASS** — `https://ucl-notifier.sportsignal.workers.dev/healthz` → `ok:true / version:13.255-seospell / degraded:false` (production UNTOUCHED — `wrangler versions deploy` / `wrangler deploy` NEVER run) |
| Preview version | **PASS** — `https://017f7939-ucl-notifier.sportsignal.workers.dev/healthz` → `ok:true / version:13.256-mcM8x` (the mcM8x bump lives only in the uploaded bundle; the repo version string stays `13.256-mcfound`) |
| VLM visual verification | **PASS** — the GLM-5.3 vision model confirms the dark navy rounded card + the circular light-blue Telegram paper-plane icon + the headline + the supporting line + the light-blue rounded CTA «عضویت در کانال تلگرام», positioned after the related-matches list + before the footer (desktop full-page screenshot `docs/assets/s18-telegram/s18-desktop-full.png`) |

### The screenshots

- `docs/assets/s18-telegram/s18-desktop-full.png` — the desktop full-page screenshot (the telegram block near the bottom, after the related-matches list, before the footer).
- `docs/assets/s18-telegram/s18-mobile-390.png` — the mobile 390 viewport screenshot (the stacked layout: the SVG art centered above the headline + supporting + the full-width CTA).

## 11. The S18 decision points (resolved + recorded)

Recorded in the `matchTelegramHtml` renderer header comment (`src/seo/match-centre.ts`) + the `matchTelegramInput` projection header comment (`src/seo/pages.ts`) — the S12/S13/S14/S15/S16/S17 precedent.

| Decision | Resolution | Rationale |
|---|---|---|
| **S18-URL** | read `ctx.env.TELEGRAM_CHANNEL_PUBLIC_URL` at runtime (the wrangler var — single source of truth; verified value `https://t.me/SportSignalz`) | the wrangler var is the single source of truth; the homepage `public.ts:12` constant stays byte-frozen (a separate surface); NEVER the bot URL; NEVER invented (spec §14) |
| **S18-Copy** | render the supporting line ALWAYS (a fixed editorial subtitle; NOT conditional on a pool read) | decision 71 consistency + the zero-runtime-cost law; the supporting line is a generic editorial promise that is always true when the channel covers football; the headline + CTA label are the owner-exact strings |
| **S18-CTA-label** | «عضویت در کانال تلگرام» (the `#tgHead` owner-exact aria-label) | the formal, clear, featured-block CTA label (NOT the informal `#promoStrip .ps-fa` «عضو کانالمون شو» variant) |
| **S18-Illustration** | inline SVG (the `#tgHead` verified circled-Telegram-mark path) + the CSS dark-navy/icy-blue atmosphere | Q3=A — compose from existing verified assets; zero new asset file; the football-themed atmosphere is the design-system dark-navy gradient + the icy-blue glow (spec §5 "Atmosphere") |
| **S18-Asset-pin** | N/A (the pure inline-SVG path) | ADR-006 "prefer inline SEO-page `<style>`/`<svg>`"; zero `_headers` rule, zero `sw.js` bump, zero cap sweep (the `_headers` 100-rule cap — audit §15 note 9) |
| **S18-Mobile-layout** | stacked on mobile (column — illustration above, CTA full-width below) + alongside on desktop (row — illustration inline-start, body inline-end) | decision 70 "Full-width on mobile; illustration adapts above or alongside text"; no horizontal scroll at 390px |
| **S18-Script** | ZERO client-script (the static featured card precedent) | the S07 summary / S17 related precedent; the CTA is a plain `<a target="_blank">`; NO countdown/accordion/expand/pulse/glow; reduced-motion = no animation |

## 12. NOT MODIFIED (byte-frozen)

The GSC surfaces (title/meta description/canonical/og:title/Twitter/SportsEvent SHAPE/h1), the answer sentence (S18 does NOT touch it), the S07 facts-table venue cell, the S07/S08 summary + narrative, the S10 selection module, the S11 standings renderer, the S12 form renderer + the S13 metrics renderer + the team-page form path, the S14 `windowSchedule` helper + the venue panel, the S15 `matchScheduleHtml` renderer + the `matchScheduleScript`, the S16 `matchFaqHtml` renderer + the `matchFaqScript` + the `matchFaqInput` projection + the `buildMatchFaqItems` content module, the S17 `matchRelatedHtml` renderer + the `matchRelatedInput` projection + the `h2hMatches`/`relatedMatches` helpers, the hub `faqHtml()` renderer (markup.ts) + the `.faqcard` hub CSS, the nav's adaptive Q9=B filter + the 5 destinations (`MC_NAV_DESTS`), the homepage `#promoStrip`/`#tgHead`/`#tgPill`/`#tgPillGo` surfaces (`src/pages/public.ts`) + the `TG_CHANNEL_URL` constant (public.ts:12), the `#about`/`.pagesfoot` footer (`src/seo/page-shell.ts`), `scripts/lib/worker-src.js` (S18 adds NO new concat entry — `match-centre.ts`/`pages.ts` are already loaded), `src/config.ts` (the version string stays `13.256-mcfound`), the `wrangler.toml` (the `TELEGRAM_CHANNEL_PUBLIC_URL` var stays `https://t.me/SportSignalz` — S18 READS it, does NOT modify it), `assets/_headers` + `assets/sw.js` (zero new pinned asset — the inline-SVG path).

## 13. The tests — `scripts/check-match-centre.js` (the S18 assertion group)

The S18 assertion group (a-h subsections): (a) the contract — the renderer + the interface + the composer-owned constants + the projection signature + the imports + the verified URL (reads `wrangler.toml` `TELEGRAM_CHANNEL_PUBLIC_URL`); (b) the REAL renderer — the section wrapper + the verified CTA href + the no-bot-promotion + the headline/supporting/CTA-label exactness + the lifecycle consistency + the missing-URL fallback + the no-script; (c) the REAL projection — extracted via `extractFnSrc` + `ts.transpileModule` with a controllable `esc` stub (the present-URL + the missing-URL + the absent-key + the null-ctx fail-closed paths); (d) the wiring — the pre-existing `telegram?: string` OPTIONAL key + the pre-existing `mcentre-telegram` slot + NO new nav destination (`MC_NAV_DESTS` keeps 5) + the `telegram: telegramHtml` wiring; (e) the cost laws — the composer purity + the await count = 3 + the homepage byte-frozen; (f) the CSS — the placement (S17 < S18 < S03) + the featured background + the illustration art + the headline + the CTA touch target + the reduced-motion + the mobile + the logical properties + the footer byte-frozen; (g) the harness — NO new concat entry; (h) the page order — the registry carries `mcentre-related` → `mcentre-telegram` → `mcentre-footer-hook`.

The import-line regex co-evolution (the `matchTelegramHtml` + `type MatchTelegramInput` join the `pages.ts` → `./match-centre` import). `scripts/check-stats.js` is UNCHANGED (its lineage pins are historical — the S18 addition is additive, no pinned wiring string changed).

**Tests:** `npm test` exit 0 — 3,514 OK (baseline 3,490 + ~24 new check-match-centre S18 assertions across the a-h subsections), 0 failures; `tsc` clean; `git diff --check` clean.

---

**M8 is COMPLETE — the M8 gate PASSED.** The `mcentre-telegram` section now renders the specification §14 featured block on every match page (upcoming/live/finished — decision 71) with the verified channel URL (`https://t.me/SportSignalz`) + the decision 67 headline + the ONE CTA + the Q3=A composed illustration (the inline `#tgHead` verified SVG + the dark-navy/icy-blue atmosphere). The slot already detects it — no contract change; the nav stays 5 items per decision 13. NO version bump (stays `13.256-mcfound`), NO deploy (production stays `13.255-seospell` / deployment `88649642` — `wrangler versions deploy` / `wrangler deploy` NEVER run). **S19 is next** (M9/Integration & quality — S19–S20).
