# SEO Program Session 06 — Homepage, Featured Match and the One-Month Fixture Window

> Agents: read AGENTS.md in the repo root first, and follow it for this whole task.

**Date:** 2026-11-17 (session run 2026-11-16 16:30-18:00 UTC) · **Session:** 6 of 15
**Outcome:** **Done and deployed — the homepage's fixture window is reconciled to the spec's "up to one month", the featured-match card is crawlable without JS, and the curated-selection promise is explicit in the DOM; the byte-frozen GSC-measured title/H1 surfaces are untouched (the Dec 4-8 freeze holds).**
**Predecessor:** Session 05 (`1d70129b-fff3-459b-9fa3-c5f8bd571b12`, `13.261.0-matchlife`, 3,652 OK)
**Current live:** `13.262.0-homepage`, deployment `7df40334-7563-42ed-8808-32ccd711f938` @100%

---

## 1. Objective and scope

The homepage is the site's front door: the surface that orients every visitor and crawler to the curated fixture coverage. Session 6 turns to the homepage — the curated-selection promise, the featured match, the one-month fixture window, the carousel, and crawlable anchor links — per the phase file `SESSION-06-HOMEPAGE-FEATURED-MATCH-AND-WINDOW.md` and MASTER-SEO-SPEC §1/§2.

**In scope:** the homepage title/H1/meta copy verification (frozen); the curated-selection promise; the featured-match logic verification; the carousel accessibility + crawlability; the one-month window reconciliation; the `/matches/tomorrow` honest empty state verification; crawlable anchor links on every fixture card.

**Out of scope:** match-detail metadata (Session 7); team-page content (Session 8); competition/date pages (Session 9); hreflang/EN (Session 12); structured data (Session 13); the H1 byte change (a post-Dec-4 decision — decision S06-H2); the `/matches/tomorrow` empty-state copy refinement (a post-Dec-4 decision — decision S06-H3); the featured-match priority-vs-nearest behavior change (a product decision — decision S06-H6).

---

## 2. Findings (the homepage surfaces traced — Task 2-a)

The homepage renders from a hand-rolled SSR HTML template (`src/pages/public.ts`) plus server-side placeholder fills (`src/seo/router.ts:buildHomePage`). The homepage is the ONE page that loads client JS (`assets/public-13.80.js` + `core-13.16.js` + `public-13.87.css`); every other SEO page is complete server HTML. Five concrete divergences from MASTER-SEO-SPEC §1/§2 were found:

- **D1 (horizon):** the spec says "up to one month" / "Show up to 30 days ahead" (§1 line 20 / §2 line 59). The code used 92 days on the listing surfaces (`upcomingBig`/`upcomingFollowed` in `src/seo/data.ts:188, 210`), 90 days on the homepage boxes (`src/public-matches.ts:705` topspot `lgPool`, `:786` uclspot `clMatches`), and a third value (end-of-current-month, `src/public-matches.ts:665-674`) on the payload's `upcoming` array. Only `calendar.ics` matched the spec (30 days, `src/seo/files.ts:320`).
- **D2 (H1):** the spec §2 line 42 suggests `مهم‌ترین بازی‌های فوتبال اروپا را از دست ندهید`. The live dynamic H1 is `بازی بزرگ بعدی: {home} – {away}` (or the fallback `بازی‌های بزرگ فوتبال`) — `src/seo/router.ts:93-96`, injected sr-only at `:254-256`. The H1 is a GSC-measured surface (frozen through Dec 4-8).
- **D3 (curated-selection promise):** the spec §2 line 44 suggests an explicit curated-selection promise. The homepage had no such copy — only a sr-only page-contents summary `در این صفحه: بازی بزرگ بعدی، بازی‌های زنده، ...` (`router.ts:256`).
- **D4 (`/matches/tomorrow` empty state):** the spec §2 line 68 copy `برای فردا مسابقه مهمی در میان دیدارهای منتخب اسپرت سیگنال ثبت نشده است...` vs the live `در برنامه فعلی اسپرت سیگنال بازی‌ای برای فردا ثبت نشده است؛ به‌محض اعلام برنامه بازی‌های جدید، همین صفحه به‌روزرسانی می‌شود.` (`src/seo/pages.ts:1526`). The live copy is honest (scoped to SportSignal's program) but less precise about curation.
- **D5/D6 (hero card crawlability):** the hero card anchor shipped `href="#"` in SSR (`src/pages/public.ts:867` PC, `:994` mobile). The real `/matches/{slug}` URL was set CLIENT-SIDE ONLY (`assets/public-13.80.js:157` `renderHeroSpot`, `:192` `renderMCard`). The carousel reuses the single anchor per active slide — non-active slides had NO crawlable href in the DOM at any time. The list rows (mrowHtml/spotItemHtml) WERE crawlable (`markup.ts:191, 426`). This was a JS-only-navigation defect on the featured-match card (spec §2 "crawlable through a regular anchor link" violation).

**Verified correct (no divergence):** the domestic-first-then-UCL ordering is structural (the topspot card precedes the uclspot card in `public.ts`; the segregation is enforced upstream by `isDomesticLeagueCode` vs `code === "CL"`). The `/matches/tomorrow` hub stays indexable (`indexable: true` unconditional in `buildHub`, `pages.ts:1559`). The list rows are real crawlable `<a href="/matches/{slug}">` anchors. The `isMarqueeMatch`/`isSeasonEndedOrdinary`/`HeadInput.noindex` machinery from Session 5 is present and wired. The homepage ships exactly ONE `<h1>` (sr-only, P-12).

---

## 3. Files changed

### New files
- `scripts/check-seo-homepage.js` — the 23-gate offline check (the horizon constant, the homepage boxes, the upcoming array, the /matches hub, the data-horizon-preserved, the hero-card crawlability, the carousel nav, the curation promise, the title/H1 frozen, the robots/canonical no-regression, the zero-resource).

### Modified (runtime)
- `src/seo/config.ts` — NEW `UPCOMING_DISPLAY_DAYS: 30` (the DISPLAY window constant; documented in the comment block).
- `src/public-matches.ts` — NEW `import { SEO } from "./seo/config"`; the topspot `lgPool` + the uclspot `clMatches` filters: `90 * 864e5` → `SEO.UPCOMING_DISPLAY_DAYS * 864e5`; the payload `upcoming` array: the `eom` (end-of-current-month) variable → `displayHorizon` (`now + SEO.UPCOMING_DISPLAY_DAYS * 864e5`); the `eom` definition removed.
- `src/seo/pages.ts` — `buildMatchesPage`: `const all = upcomingBig(ctx)` → a 30-day filter on `upcomingBig(ctx)` via `SEO.UPCOMING_DISPLAY_DAYS` (the DISPLAY window; `upcomingBig` stays 92 for discovery).
- `src/seo/router.ts` — NEW `carouselNavHtml(heroMatches)` helper (sr-only `<nav>` with `<a href>` to every carousel slide, emitted when ≥ 2 slides); `buildHomePage`: NEW `heroHref` (`M.matchHref(nextBig.s)`) + `CURATION_PROMISE` const + `carouselNav` injection; the H1/supporting-copy injection extended (the curated-selection promise sr-only `<p>` + the carousel nav, additive to the existing sr-only page-summary); the PC hero card anchor unhide: `href="#"` → `href="heroHref"`; the mobile hero-mcard anchor unhide: `href="#"` → `href="heroHref"`.

### Modified (tests)
- `scripts/check-cups.js` — NEW `globalThis.SEO = { UPCOMING_DISPLAY_DAYS: 30 }` stub (the eval'd cups block now references `SEO.UPCOMING_DISPLAY_DAYS`).
- `scripts/live-derby-test.js` — NEW `const SEO = { UPCOMING_DISPLAY_DAYS: 30 }` stub in all 4 `fetchPM` eval strings (lines 274, 334, 379, 405); the `m-out` test fixture offset: "1st of next month" (28-31 days, borderline under the 30-day window) → `now + 10 * 864e5` (deterministic, in-window); the 2 Scenario-1 box-length assertions updated for the 30-day window (`box.length === 3` → `=== 2`; `boxIds[2] === "m-far"` → `!boxIds.includes("m-far")` — the far derby is now excluded from the 30-day display window); the Scenario-1 + Scenario-2 comments updated.
- `scripts/check-stats.js` — the version-pin blocks updated: `13.261.0-matchlife` → `13.262.0-homepage` (the VERSION + CHANGELOG regexes); `13.261.0.0` → `13.262.0.0` (the `pkg.version` pin) + the `check-seo-homepage.js` existence check + the test-chain regex `check-match-centre.js && check-seo-homepage.js`.
- `package.json` — `version` `13.261.0.0` → `13.262.0.0`; the test chain: `&& node scripts/check-seo-homepage.js` appended after `check-match-centre.js`.
- `package-lock.json` — synced via `npm install` (root + `packages[""]` → `13.262.0.0`).
- `CHANGELOG.md` — the `# v13.262.0-homepage` entry (newest first).

### Modified (docs — this close-out commit)
- `docs/HANDOFF.md` — the Session 6 rewrite.
- `docs/DECISIONS.md` — the S06-H1 through S06-H6 decisions.
- `sportsignal-seo-implementation/IMPLEMENTATION-TRACKER.md` — the Session 06 row.
- `seo-implementation/next-session-prompt.md` — the Session 7 start prompt.

---

## 4. Implementation decisions and deviations

- **S06-H1 — the 92→30 DISPLAY split** (`docs/DECISIONS.md`): the 92-day horizon is the DATA/DISCOVERY window (pool fetch + sitemap + feed + API — broad URL discovery); the 30-day horizon is the DISPLAY window (homepage boxes + `/matches` hub + the payload `upcoming` array that feeds the JSON-LD ItemList). `upcomingBig`/`upcomingFollowed` stay at 92; the display surfaces narrow to 30.
- **S06-H2 — the H1 byte-frozen** (`docs/DECISIONS.md`): the live dynamic H1 `بازی بزرگ بعدی: {home} – {away}` is byte-frozen through Dec 4-8. The keyword-map §2.1 plan H1 `مهم‌ترین بازی‌های فوتبال اروپا را از دست ندهید`-family is a post-Dec-4 decision. The live dynamic H1 captures the «بازی بعدی بارسا»/«بازی بعدی بایرن مونیخ» next-match query heads (real GSC demand).
- **S06-H3 — the `/matches/tomorrow` empty-state copy stays** (`docs/DECISIONS.md`): the current copy is honest; the hub is the best-CTR surface (8.26%); the spec's exact copy is a post-Dec-4 refinement.
- **S06-H4 — the curated-selection promise rides as a NEW sr-only paragraph** (`docs/DECISIONS.md`): additive to the existing sr-only page-summary; no visible layout change (the phase file "Preserve homepage layout"). Visible copy is a UI decision for a later round.
- **S06-H5 — the hero-card carousel crawlability fix** (`docs/DECISIONS.md`): the SSR href = `M.matchHref(nextBig.s)` (slide 1); the sr-only carousel nav covers slides 2-6. Zero KV/fetch cost.
- **S06-H6 — the featured-match logic NOT changed** (`docs/DECISIONS.md`): `pickHeroMatch` returns the highest-PRIORITY match in the 8-hour envelope (v13.194, owner-approved) — a documented divergence from the spec's "nearest upcoming". The carousel's accessibility + crawlability (the actual Session 6 ask) ARE fixed.

**Deviations from the phase file:** the phase file says "Update Persian and English title/H1/meta copy". The keyword map §2.1 says "keep it; change scheduled: none before Dec 4-8" for the title, and the Dec 4-8 freeze applies to the H1. So the "update" for the homepage is VERIFICATION + the curated-selection promise (a NEW sr-only paragraph, not a title/H1 change) + the horizon reconciliation + the crawlability fix. The actual title/H1 byte change is a post-Dec-4 decision (S06-H2). This is the spec-and-keyword-map-aligned reading of the phase file's "update" — the freeze takes precedence per the inherited constraint.

---

## 5. Tests and exact outcomes

- `npx tsc --noEmit` — clean (exit 0).
- `npm test` — **3,675 OK** (was 3,652; +23 from the new `check-seo-homepage.js`). The chain exits 0. The `check-cups.js` + `live-derby-test.js` co-evolution verified (the `SEO.UPCOMING_DISPLAY_DAYS` stub + the deterministic m-out offset + the 30-day-window box assertions).
- `scripts/check-seo-homepage.js` — 23 gates, all pass (the horizon constant, the homepage boxes, the upcoming array, the /matches hub, the data-horizon-preserved, the hero-card crawlability PC + mobile, the carousel nav helper + wiring, the curation promise const + copy + injection, the title/H1 byte-frozen, the robots/canonical no-regression, the zero-resource).
- Local `wrangler dev` smoke (`http://localhost:8787/`) — HTTP 200, 163063 bytes; the title byte-frozen; the H1 fallback («بازی‌های بزرگ فوتبال» — no hero, no local KV data); the curation promise present; the canonical `https://sportsignal.ir/`; the robots `noindex, nofollow` (local non-prod, correct). The hero card stays hidden (`display:none`, `href="#"`) — expected with no KV data (the href + carousel nav verify on the live site with data).

---

## 6. Checkpoints with commit SHAs and push status

- **`cb36c2d`** — `seo(s06): the homepage one-month window + carousel crawlability + curated-selection promise (version 13.262.0-homepage)` — the code + tests + version bump + CHANGELOG. Pushed to `main` (verified: `git ls-remote` → `cb36c2d4e9cb377c0df84cd5428ff65fed906c8c`). One-shot token push; no force; fetch-before-push confirmed (`b7f85e8` → `cb36c2d` fast-forward, no concurrent work).
- **(this commit)** — `seo(s06): session close-out — the report, tracker, handoff, decisions + Session 7 prompt` — the docs. (SHA recorded post-push.)

---

## 7. Deployed environment, deployment ID/URL and verification results

- **Deploy:** Worker `ucl-notifier`, versioned. `CLOUDFLARE_API_TOKEN=… CLOUDFLARE_ACCOUNT_ID=a796fdfe… npx wrangler versions upload` → Version ID `7df40334-7563-42ed-8808-32ccd711f938` (preview `https://7df40334-ucl-notifier.sportsignal.workers.dev`) → `npx wrangler versions deploy --version-id 7df40334-7563-42ed-8808-32ccd711f938 --percentage 100 --yes` → SUCCESS @100%.
- **Live `/healthz`:** `version: "13.262.0-homepage"` ✓; `ok:false` + `pool_matches:0` (the KV read quota — pre-existing, NOT caused by the deploy); `kv_writes_day:0` (zero new writes — the Session 6 changes are SSR-only filters + string concatenation); `degraded:false`.
- **Live homepage (`https://sportsignal.ir/`):** HTTP 200; the title byte-frozen `برنامه بازی‌های مهم فوتبال | تاریخ و ساعت شروع | اسپرت سیگنال` ✓; the H1 fallback `بازی‌های بزرگ فوتبال` (no hero — KV quota); the **curation promise present** «از دیدارهای بزرگ لیگ برتر انگلیس، لالیگا، سری‌آ، بوندسلیگا و لیگ یک فرانسه تا حساس‌ترین رقابت‌های لیگ قهرمانان اروپا و جام‌های حذفی؛ اسپرت سیگنال مهم‌ترین بازی‌های پیش‌رو را گلچین و معرفی می‌کند.» ✓ (verified on the prod apex AND the version-preview URL); the canonical `https://sportsignal.ir/` ✓; the robots `index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1` ✓ (indexable on prod); the existing sr-only page-summary preserved (additive change).
- **Live `/matches/tomorrow`:** HTTP 200; `index, follow` ✓ (STAYS indexable — C5 holds, no regression); self-canonical; the Shamsi-anchored H1 `بازی‌های فوتبال فردا — سه‌شنبه ۲۶ آبان ۱۴۰۵ (۱۷ نوامبر ۲۰۲۶)` ✓.
- **Live `/matches` hub:** HTTP 200; `index, follow` ✓; the H1 `بازی‌های بزرگ فوتبال پیش‌رو` ✓.
- **NOT verified live (the KV quota limitation):** the hero card anchor's real `/matches/{slug}` href (no hero while the quota is exceeded — the card stays hidden); the sr-only carousel nav (no carousel while no hero matches); the 30-day boxes with matches (empty while the quota is exceeded). **These self-verify once the KV quota resets at UTC midnight (~5-6h from the deploy).** This is a pre-existing infrastructure issue, NOT a code issue — the SSR code is verified by the `check-seo-homepage.js` gates + the local smoke.

---

## 8. Cloudflare/runtime effects or why unchanged

- **Zero new KV writes** (live `/healthz` `kv_writes_day:0`): the horizon change is a filter on already-loaded lists; the carousel nav + curation promise are string concatenation from the existing `p.heroMatches` payload rows; the `/matches` hub 30-day filter is a filter on `upcomingBig(ctx)` (already-loaded `ctx.shaped`). No new KV reads, no new fetches, no new awaits.
- **No client asset changed:** SW `sportsignal-v126`, `public-13.80.js`, `public-13.87.css`, `_headers` untouched — a server-side release. The carousel nav + curation promise are SSR HTML injections (the client JS leaves these nodes alone — they live outside every container the JS re-renders).
- **The 10ms CPU cliff:** unchanged (no new render cost — the SSR additions are O(1) string concatenation per carousel slide, bounded at 6 slides).
- **The KV read quota:** STILL exceeded (pre-existing). The deploy does not increase read pressure (zero new reads). The owner should investigate the read-source (the 10-min cron + public traffic + the bot).

---

## 9. Unresolved risks and blockers

- **The KV read quota (pre-existing, STILL OPEN):** the account's 100,000 KV reads/day free-plan limit is exceeded. The data-dependent surfaces (hero card href, carousel nav, 30-day boxes) self-verify once the quota resets at UTC midnight. The durable fix is a Workers Paid plan ($5/mo → 1M reads/day) OR reducing the read-source. **This is NOT a Session 6 blocker** — the SSR-structural changes are verified live; the data surfaces are verified by the check-seo-homepage.js gates + the local smoke + (once the quota resets) the live self-verify.
- **The featured-match priority-vs-nearest divergence (S06-H6):** `pickHeroMatch` returns the highest-PRIORITY match in the 8-hour envelope (v13.194, owner-approved) — NOT the spec's "nearest upcoming". Flagged for owner awareness. NOT changed this session (owner-approved behavior; changing it is a product decision). **Owner question (A/B/C/D):** (A) keep the v13.194 priority behavior (recommended — owner-approved, captures the "biggest match tonight" intent); (B) change to the spec's "nearest upcoming" (earliest kickoff in the envelope); (C) keep priority but document the envelope as "the day/night block" explicitly; (D) other.
- **The H1 byte change (S06-H2):** deferred past Dec 4-8. A fresh 16-month GSC export would validate whether the dynamic H1 (captures the next-match query heads) or the keyword-map plan H1 (the branding/positioning line) performs better. The owner decides after the gate.
- **The `/matches/tomorrow` empty-state copy refinement (S06-H3):** deferred past Dec 4-8 (the hub is the best-CTR surface — do not regress). The spec's exact copy is a candidate.
- **The visible curation copy (S06-H4):** the sr-only curation promise is the SEO fix (in the DOM, Google reads it). A VISIBLE curation copy is a UI decision (Session 26 or a dedicated UI round) — the phase file "Preserve homepage layout" applies.

---

## 10. Tracker status

`sportsignal-seo-implementation/IMPLEMENTATION-TRACKER.md` — the Session 06 row updated: state = Completed/deployed; commits = `cb36c2d` + the close-out; deploy = `7df40334…` @100%; validation = 3,675 OK + live-verified (SSR structural) + data surfaces self-verify at UTC midnight; handoff prompt path = `seo-implementation/next-session-prompt.md`.

---

## 11. Next session number and objective

**Session 7 — match-detail metadata** (phase file `SESSION-07-MATCH-DETAIL-SEO.md`): the match-detail page's unique title/description/H1, the answer-sentence funnel, the SportsEvent JSON-LD, the related/h2h/schedule blocks, the venue, the 365-day archive serve. The match-page title/description/H1 bytes are frozen through Dec 4-8 (Session 7 owns them) — Session 7 may refine metadata WITHIN the frozen template, and after Dec 4-8 apply the title/H1 test results. The next-session prompt is at `seo-implementation/next-session-prompt.md`.
