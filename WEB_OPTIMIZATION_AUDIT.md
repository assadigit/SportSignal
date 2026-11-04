# SportSignal — Web Optimization · Phase 1 Comprehensive Audit (FROZEN BASELINE)

> **Project:** Website Performance, Technical SEO & Optimization (governed by
> `SPORTSIGNAL_WEB_OPTIMIZATION_SPEC.md` §7 = Phase 1).
> **Audit date:** 2026-11-04 (session, UTC) · **Repo state audited:** commit
> `63a1d02` (`main`), version `13.201-carstack` — verified identical to live
> production (`/healthz` → `version: "13.201-carstack"`, `ok:true`,
> `degraded:false`, `kv_writes_day: 18`, `kv_writes_web: 0`).
> **⚠ BASELINE FREEZE:** This document preserves the ORIGINAL Phase 1
> measurements. Later phases must NEVER overwrite these numbers — append
> addenda only (spec §4, §7.7).

---

## 0. Methodology and tools (what was actually measured)

| Measurement | Tool / conditions | Environment |
| :--- | :--- | :--- |
| TTFB + wire bytes, 16 representative routes × 3 runs | `curl -w` timing (HTTP/2, `--compressed`), edge POP **HKG** | Production `https://sportsignal.ir` |
| Raw vs. wire bytes, headers, cache status | `curl -H "Accept-Encoding: identity/br"` + `-D` | Production |
| Lab CWV (FCP/LCP/TBT/CLS/SI/TTI), LCP element + phase breakdown, network inventory | **Lighthouse 13.6.0 CLI** (local Chromium, default mobile throttling ≈ 4G 150ms/1.6Mbps, and `--preset=desktop`) | Against production |
| Independent lab source | GitHub Actions `seo-check` Lighthouse history (T-09 + advisory), 3 recent runs | GitHub runners |
| Rendering, functionality, viewport behavior | agent-browser (Playwright Chromium) + **VLM visual review** of screenshots at 360/390/430/768/1024/1440/1920 | Against production |
| SEO regression | `npm run seo:check` (production mode) | Local CLI → production |
| Field data (CrUX) | PageSpeed Insights API → **quota exceeded**; CrUX has no data for the origin | N/A — see F-H3 |
| Google Search Console | **No GSC credentials supplied in session** → NOT inspected (spec §7.5 honesty rule) | N/A — see §5 |
| Dependency vulnerabilities | `npm audit --omit=dev` | Local clone |
| Zone/transport settings | Cloudflare API (zone `88f0130c000907d5a1fa3520fa2eda08`) | Read-only |

**Lab vs. field disclaimer (spec §3.1):** ALL Core Web Vitals numbers below are
**controlled lab measurements** (Lighthouse local + CI). No field/RUM data was
available: PSI API quota was exhausted for the anonymous key, and CrUX returns
no data for `sportsignal.ir` (insufficient real-user traffic samples — normal
for a young site). INP is therefore **unmeasured**; TBT (250 ms lab) is the
closest available proxy. No field improvements are claimed anywhere in this
document.

**Baseline gates before auditing:** `npm install` + `npm test` → **exit 0,
2,525 checks OK** (matches Phase 0 count). Working tree clean (the known
`package-lock.json` version-field drift K2 was reverted, unchanged from Phase 0
handling).

---

## 1. Performance baseline (spec §7.1)

### 1.1 TTFB and wire weight — representative routes (production, 3 runs each)

All responses HTTP/2, `cf-cache-status: HIT` on warm runs, Brotli/zstd
compressed HTML. Wire bytes are compressed transfer sizes.

| Route | Status | TTFB (3 runs) | Wire bytes (compressed) |
| :--- | :--- | :--- | :--- |
| `/` (hero-heavy) | 200 | 54 / 61 / 55 ms (cold 418 ms) | 44.7 KB (zstd) / 42.7 KB (br) |
| `/matches` | 200 | 347 / 62 / 151 ms | 13.5 KB |
| `/matches/today` | 200 | 212 / 67 / 166 ms | 8.5 KB |
| `/matches/tomorrow` | 200 | 366 / 67 / 57 ms | 7.6 KB |
| `/teams` | 200 | 136 / 53 / 250 ms | 10.2 KB |
| `/competitions` | 200 | 161 / 63 / 46 ms | 7.7 KB |
| `/matches/pae-aek-vs-real-madrid-2026-11-04` | 200 | 799 / 70 / 67 ms (cold render) | 10.4 KB |
| `/teams/real-madrid` | 200 | 443 / 50 / 50 ms | 10.2 KB |
| `/competitions/champions-league` | 200 | 171 / 61 / 48 ms | 12.9 KB |
| `/api/public-matches` | 200 | 65 / 60 / 59 ms | 12.1–12.3 KB |
| `/api/card/575386` (SVG) | 200 | **cold 1,496 ms** → warm 56–61 ms | 25.4 KB |
| `/api/card/575386.png` | 200 | cold 264 ms / warm 86 ms | 105.2 KB |
| `/robots.txt` | 200 | 72 / 52 / 34 ms | 166 B |
| `/sitemap.xml` (index) | 200 | 77 / 55 / 45 ms | 223 B |
| `/sitemaps/pages.xml` | 200 | 54 / 56 / 68 ms | 265 B |
| `/sitemaps/matches-upcoming.xml` | 200 | 57 / 49 / 61 ms | 2.1 KB |
| `/feed.xml` (Atom) | 200 | 130 / 56 / 39 ms | 10.7 KB |
| `/calendar.ics` | 200 | 140 / 60 / 48 ms | 19.7 KB |

**Reading:** TTFB is excellent everywhere once the edge cache is warm
(45–80 ms from HKG; first-uncached renders 200–800 ms — the render-hold +
`s-maxage=60` architecture works). The card renderer's cold path (1.5 s SVG)
is within Workers CPU norms and cached 300 s afterward.

### 1.2 Lab Core Web Vitals (Lighthouse 13.6.0, default mobile throttling)

| Page | Perf | A11y | BP | SEO | FCP | LCP | TBT | CLS | SI | TTI |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `/` mobile | **65** | 96 | 96 | 100 | 2.3 s | **9.2 s** | 250 ms | **0** | 4.6 s | 9.9 s |
| `/` desktop | **95** | 100 | 96 | 100 | 0.6 s | 1.4 s | 10 ms | 0 | 1.3 s | 1.8 s |
| `/matches/today` mobile | 99 | — | — | — | 1.6 s | 1.6 s | 0 ms | 0 | 1.6 s | 1.6 s |
| `/teams` mobile | 99 | — | — | — | 1.6 s | 1.6 s | 0 ms | 0 | 1.6 s | 1.6 s |
| `/matches/{slug}` mobile | 99 | 95 | 100 | 100 | 1.6 s | 1.6 s | 0 ms | 0 | 1.6 s | — |
| `/teams/{slug}` mobile | 99 | 95 | 100 | 100 | 1.6 s | 1.6 s | 0 ms | 0.007 | 1.6 s | — |
| `/competitions/{slug}` mobile | 99 | 100 | 100 | 100 | 1.6 s | 1.6 s | 0 ms | 0 | 1.6 s | — |

**Independent source — GitHub Actions CI Lighthouse (T-09, mobile):**

| Run date (commit) | `/` perf | `/` a11y | `/` BP | `/matches/today` perf | `/teams` perf |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 2026-11-01 (`564c2b3`, schedule) | 58 | 100 | 93 | 95 | 95 |
| 2026-11-03 (`1437ddd`) | 49 | 96 | 93 | 93 | 91 |
| 2026-11-03 (`63a1d02`) | 51 (T-09) / 64 (advisory) | 96 | 93 | 97 / 91 | 95 / 98 |

The homepage mobile performance range **49–65** across all sources is stable
and reproducible; sub-pages are consistently 91–99. **The homepage is the
single performance outlier.**

### 1.3 The LCP element and its bottleneck (the audit's central finding)

**Mobile `/` — LCP element:** `div.hero-cards > a#heroMCard > div.mc-bg >
div.mc-scene` (the mobile featured-match hero card's scene background art,
412×315 CSS px, `/ui/mc/scene-2.webp`, 55 KB wire).

Lighthouse LCP phase breakdown (mobile):

| Phase | Duration |
| :--- | :--- |
| Time to first byte | 57 ms |
| **Resource load delay** | **1,440 ms** |
| Resource load duration | 223 ms |
| Element render delay | 180 ms |

**Root cause (verified in source + live DOM):** `src/pages/public.ts:525` —
the server-rendered hero card ships **`style="display:none"`**:

```html
<a class="hero-mcard" id="heroMCard" style="display:none" href="#" dir="ltr">
```

The card is revealed only after `public-13.65.js` (155 KB raw / 52 KB wire,
deferred) downloads, parses and executes the carousel builder. A
`display:none` element's CSS background is **not fetched and not painted**, so
the entire LCP chain is: HTML → CSS → deferred JS download+parse+execute →
carousel build → element unhide → scene WebP fetch (Lighthouse discovery
audit: `requestDiscoverable: false`, `priorityHinted: false`) → paint. In an
unthrottled live session the scene image request was observed at **4,865 ms**
after navigation start; under Lighthouse mobile throttling the chain lands at
9.2 s.

**Desktop `/` — LCP element:** `div.hero-bg > img.bg-lights`
(`stadium-lights-hero.png`, **197 KB PNG**, 1,335×593) at 1.4 s — within the
2.5 s target but carried by an oversized PNG (see F-H2).

**Sub-pages:** LCP is the SSR answer-card text block at 1.6 s (= FCP; no
image dependency) — the SSR-first architecture is proven fast when content is
not JS-gated.

### 1.4 Payload inventory (verified weights)

| Resource | Raw | Wire (br-class) | Cache policy |
| :--- | :--- | :--- | :--- |
| HTML `/` | **180,109 B** | 42.7 KB br / 44.7 KB zstd | `s-maxage=60, SWR=300` + ETag |
| `public-13.65.js` | **155,138 B** | 52.0 KB | immutable 1 y |
| `public-13.78.css` | **136,727 B** | 43.1 KB | immutable 1 y |
| `core-13.16.js` | **23,490 B** | 9.4 KB | immutable 1 y |
| `sw.js` | 61,149 B | 20.0 KB | `max-age=0, must-revalidate` |
| `stadium-lights-hero.png` | **197,054 B** | 197 KB (PNG, no re-compress) | immutable 1 y |
| `ui/sportsignal-pc-match-hud.png` | **124,713 B** | 124.7 KB | immutable 1 y |
| `bg.jpg` (body background, every page) | ~93 KB | 93 KB | (per `_headers`) |
| `hero-poster.jpg` | 39,799 B | 39.8 KB | 1 week |
| `logo.png` | 20,162 B | 20.2 KB | 1 day |
| `og/default.png` (social only) | 300,984 B | 301 KB | 1 day |
| Fonts (12 `@font-face`, all `font-display:swap`) | — | **229 KB / 10 files loaded on `/`** | 1 week |

**Fonts detail:** 3 preloaded (Peyda-Regular 29.2 KB, Peyda-ExtraBold 29.6 KB,
MorabbaVF 39.2 KB = 98 KB). Additionally loaded during page use: Peyda
Medium/SemiBold/Bold/Black (~29 KB each), Poppins-Bold/ExtraBold (~8 KB each),
ChakraPetch-Medium. All self-hosted WOFF2 — no external font origin.

### 1.5 Request count, third-party origins, DOM, main thread (mobile `/`)

- **104 requests, 2,424 KB wire** (Lighthouse, cold cache). Images: **82
  requests / 1,979 KB** — 81% of the bytes.
- **Image breakdown:** external `media.api-sports.io` league-logo PNGs **~15
  imgs / ~1.2 MB (89–157 KB each!)** for the standings/cup boxes; external
  `crests.football-data.org` crests **52 imgs / 235 KB**; local hero art
  (`/ui/mc/` 4 imgs 59 KB, `/ui/` HUD 122 KB, `/players/` 4, `/leagues/` 2);
  page decoration (stadium-lights 193 KB, bg.jpg 93 KB, hero-poster 40 KB,
  logo 20 KB).
- **Third-party origins (complete inventory):**
  `static.cloudflareinsights.com` (Web Analytics beacon — the only script),
  `cloudflareinsights.com` (connect), `crests.football-data.org` (imgs),
  `media.api-sports.io` (imgs). No other trackers, CDNs, fonts or scripts.
- **DOM complexity:** 3,420 nodes (mobile) — moderate, healthy.
- **Main thread:** bootup 0.9 s; **6 long tasks**; TBT 250 ms; TTI 9.9 s.
- **CSS delivery:** single stylesheet + 3 inline `<style>` blocks in head
  (fonts / footer-counter / flatglow-layer incl. `.mc-scene` art rules);
  render-blocking as designed; **unused CSS ≈ 30 KB (68.7% of
  `public-13.78.css` per Lighthouse usage analysis)** — see F-M1.
- **JS:** no unused-JS flag (hand-written vanilla is lean per-byte);
  execution cost is the carousel/polling init path.
- **CLS: 0 on every page** (lab) — the `__SS_SIG__` skip-identical-rebuild
  handshake does its job; explicit `width/height` on most imgs.
- **Compression/transport:** Brotli AND zstd served (curl negotiated zstd
  44.7 KB; br 42.7 KB); HTTP/2 + `alt-svc: h3` (HTTP/3 zone-enabled);
  `early_hints: off`, `0rtt: off`, `minify: off` (Worker owns markup) —
  verified via Cloudflare zone API.

### 1.6 Caching behavior verified live

| Class | Observed | Verdict |
| :--- | :--- | :--- |
| HTML `/` | `cf-cache-status: HIT`, `age: 14`, `s-maxage=60, swr=300`, ETag + Last-Modified | ✅ as documented |
| Versioned assets | `immutable, max-age=31536000`, HIT | ✅ |
| `/api/public-matches` | `max-age=60`, 59–65 ms warm | ✅ |
| `/api/card/{id}` | `max-age=300`, cold 1.5 s → warm 56 ms | ✅ |
| Conditional GET | **ETag served but `If-None-Match` returns 200 (no 304)** — tested immediate revalidation on `/matches/today` | ❌ F-M5 |
| `Vary` | none on HTML — correct (fa/en is client-side) | ✅ |

---

## 2. Device coverage (spec §7.2)

### 2.1 Viewport matrix (live, agent-browser)

| Viewport | scrollWidth == clientWidth | Page height | Overflow |
| :--- | :--- | :--- | :--- |
| 360×740 | ✅ 360 | 10,066 px | none |
| 390×844 | ✅ 390 | 10,029 px | none |
| 430×932 | ✅ 430 | 9,944 px | none |
| 768×1024 | ✅ 768 | 9,413 px | none |
| 1024×768 | ✅ 1024 | 8,456 px | none |
| 1440×900 | ✅ 1440 | 6,550 px | none |
| 1920×1080 | ✅ 1920 | 6,572 px | none |

**No horizontal overflow at any audited width.**

### 2.2 Visual review (VLM-assisted, screenshots on file)

- **390 px (mobile):** hero card renders correctly — player portraits
  (Atlético/Barça), crests + Persian team names, countdown tiles
  «۰۴ روز / ۱۸ ساعت / ۵۹ دقیقه», kickoff «جمعه ۱۷ آبان – ۲۰:۰۰» all clear.
  Minor: date line sits tight inside the hex panel (cosmetic, not cut off).
- **768 px (tablet):** full-width hero card, nav collapses cleanly to
  logo + 3 links + EN/timezone pill; all tappable with adequate spacing.
- **1440 px (desktop):** wide hero banner with flanking player art; two-column
  standings + match feed for RTL reading. Minor: standings column headers
  small/tight; one date string wraps awkwardly (cosmetic).

### 2.3 Functionality checks (live)

| Feature | Result |
| :--- | :--- |
| fa/en toggle (`#lbtn`) | ✅ switches `lang` fa↔en, `dir` rtl↔ltr, all `data-i` text, persists `localStorage.ucl_lang`; h1 becomes "Next big match: Club Atlético de Madrid – FC Barcelona" |
| Hero carousel arrows/dot (`#carLeft/#carRight/.car-dot`) | ✅ present, aria-labeled (مسابقه بعدی/قبلی), clickable; single-slide day → rotation correctly off (C10 behavior) |
| Countdowns | ✅ 45 live countdown elements ticking |
| Timezone dialog (`#sbtn` → `toggleTz()`) | ✅ opens (aria-expanded wired) |
| Theme | **always-dark by owner directive (v13.134-typelight)** — `toggleTheme()` remains in core JS but NO button ships on the public page (login/admin keep theirs). Light-mode CSS is dormant. Documented; do not "fix". |
| Keyboard | 99 focusable elements; skip link present (but 3rd in tab order — F-L3) |
| Service worker | `sw.js` served with `must-revalidate` (correct upgrade path) |
| Console errors | none during audits |

---

## 3. Technical SEO audit (spec §7.3)

`npm run seo:check` (production): **56 PASS / 0 FAIL.** Manual verification
below supplements it.

### 3.1 Crawl files

- **robots.txt:** `User-agent: * / Allow: / / Disallow: /admin` + sitemap
  pointer. `/api/` intentionally crawlable (page JS fetches it — documented).
  ✅
- **Sitemaps:** index → 5 children (pages 15 URLs, competitions 6, teams 94,
  matches-upcoming 153, matches-archive). All spot-checked URLs (12) → 200.
  `lastmod` is content-hash-derived (no "now on every build"). ✅
- **Bots:** all 15 tested UAs → 200 — including **ClaudeBot and Amazonbot**
  (the OWNER_TODO §2 Cloudflare AI-block issue from 2026-10-11 has been
  resolved by the owner — verified live today). IndexNow key file + BingSiteAuth
  serve 200. ✅

### 3.2 Status codes / redirects / 404

- `http→https` 301; `www.` → apex 301 (all paths); `football.` → apex 301
  (public paths only — webhook excluded by design); `/public` → `/` 301;
  trailing-slash → none 301; uppercase → lowercase 301. All single-hop. ✅
- Unknown routes → custom 404 (200-family content with nav + `noindex,
  nofollow` meta) — including unknown match/team/competition slugs. ✅
- `*.workers.dev` → 200 with `x-robots-tag: noindex, nofollow`. ✅

### 3.3 Canonicals, metadata, headings

- Self-referencing canonicals verified on `/`, `/matches`, `/matches/today`,
  `/teams`, `/teams/{slug}`, `/competitions/{slug}`, `/about`,
  `/matches/{slug}`. ✅
- `?page=2` on `/matches` → canonical to `/matches` (page 1) — deliberate
  de-dup; paginated items not independently canonical (F-M8, decision item).
- Unique, descriptive `<title>` + `meta description` + exactly one `<h1>` on
  all 12 sampled families; heading hierarchy h1→h2→h3 clean. ✅
- OG/social: complete set on `/` (type/title/description/url/image
  1200×630/locale `fa_IR` + alternate `en_US`/site_name); per-match OG images
  via `/og/match-{slug}.png`. ✅
- Meta robots: `index, follow, max-snippet:-1, max-image-preview:large,
  max-video-preview:-1`. ✅

### 3.4 Structured data (JSON-LD — parsed + validated)

| Page | Graph nodes | Verdict |
| :--- | :--- | :--- |
| `/` | Organization, WebSite, CollectionPage, ItemList (25 ListItems) | ✅ valid JSON; URLs match visible match links |
| `/matches/{slug}` | Organization, WebSite, WebPage, **SportsEvent** (startDate `2026-11-04T17:45:00.000+03:30`, EventScheduled, home/away teams), BreadcrumbList | ✅ matches visible content; no invented fields |
| `/teams/{slug}` | Organization, WebSite, **SportsTeam**, ItemList (9), BreadcrumbList | ✅ |
| `/competitions/{slug}` | Organization, WebSite, SportsOrganization, ItemList (45), BreadcrumbList | ✅ |
| `/matches/today` | Organization, WebSite, CollectionPage, ItemList (5), BreadcrumbList | ✅ |

### 3.5 Internal links / no-JS content

- 157 unique internal links discovered from 4 seed pages; 25 sampled → all
  200. No broken links found; no orphan families (all sitemap URLs linked
  from hubs).
- **SSR no-JS verification:** match lists, hero card shell, standings tables,
  h1, JSON-LD all present in raw `curl` HTML (no JS). The JS-gated hero card
  *art* is the one visual exception (F-C1) — text content (teams, countdown
  dates, kickoff) IS in the no-JS HTML. ✅ (with the F-C1 caveat)
- Duplicate content: single canonical surface; query variants collapse to
  canonical; no printer/mobile variants.

---

## 4. Multilingual SEO (spec §7.4) — the ACTUAL model, audited honestly

**What exists (verified):** fa is the SSR default on every page
(`<html lang="fa" dir="rtl">`); English is a **client-side toggle**
(`localStorage.ucl_lang` + `data-i` hooks in `core-13.16.js`) with **no en
URLs, no hreflang, no server-side locale negotiation**. `og:locale fa_IR` +
`og:locale:alternate en_US` are emitted. T-08 (seo:check) asserts the
single-language expectation.

- **No IP-based or Accept-Language redirects exist** — verified live from a
  Hong-Kong egress IP (fa served directly) and in the router source (host
  normalization only redirects scheme/host/case, never locale). ✅
- **Limitation (documented, not a defect to "fix"):** English content is
  invisible to crawlers (post-JS only) and unshareable as a URL. Per spec
  §11.4 and R11: do NOT invent en URLs/hreflang. Any future en-surface is an
  owner product decision, out of scope.
- Persian digits/dates localized correctly (faNum pipeline); `<title>`/meta
  descriptions are Persian and unique per page.

---

## 5. Google Search Console (spec §7.5) — ACCESS LIMITATION

**No GSC credentials were supplied in this session** (session credentials
cover GitHub, Cloudflare, Telegram, Workers AI, football-data.org only), and
GSC has no API access path via the provided Cloudflare account. **GSC was NOT
inspected; nothing is claimed from it.**

Known context (from `OWNER_TODO.md`, owner-dated 2026-10-11): DNS TXT
ownership verification **completed** (✅ per owner); sitemap submission and
"Request indexing" clicks were listed as owner follow-ups with **unknown
completion status**. Phase 5/7 should either request owner-run GSC reports
(Pages indexing, Sitemap processing, Core Web Vitals) or ask the owner to add
the verifying account's credentials to a future session.

---

## 6. Accessibility & security (spec §7.6)

### 6.1 WCAG 2.2 AA findings (Lighthouse + manual)

| Check | Result |
| :--- | :--- |
| Semantics/landmarks | `main#main`, nav, headings, skip link present ✅ |
| Reduced motion | 7 `prefers-reduced-motion` rules in CSS + 4 in template ✅ |
| `alt`/`aria-hidden` | decorative art `alt=""`+`aria-hidden` ✅; logos have alt ✅ |
| **Color contrast** | ❌ **7 failing nodes** — `.spotitem .countdown` (`#6082ab` on bg, 3.76:1 and a 1.24:1 variant), `.spotitem .side .team` (1.35:1), `.kickdate` (4.23:1) — WCAG AA needs 4.5:1 (F-M3) |
| **Accessible name** | ❌ `#heroMCard` label-content-name-mismatch (visible text not in acc. name) (F-M3b) |
| **Touch targets** | ⚠ 13/91 interactive elements < 44 px (nav links 34 px tall; `#lbtn` 34×34) (F-M6) |
| Keyboard | focusables reachable; skip link works but is **3rd** in tab order (F-L3) |
| Forms | public site is display-only (no public forms); share/timezone controls aria-labeled ✅ |
| `image-aspect-ratio` (BP) | ❌ standings/cup box `<img>` rendered at mismatched aspect (external logos) (F-M4) |

### 6.2 Security posture (verified live)

| Header / control | Value | Verdict |
| :--- | :--- | :--- |
| HSTS | `max-age=31536000; includeSubDomains` (no preload — deliberate) | ✅ |
| CSP | `default-src 'self'; script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https://cloudflareinsights.com; frame-ancestors 'none'` | ✅ present; `unsafe-inline` bounded by R13 (inline JSON-LD/theme-init/signature scripts) — Phase 6 evaluation only |
| X-Frame-Options / nosniff / Referrer / Permissions | DENY / nosniff / strict-origin-when-cross-origin / camera+mic+geo+payment off | ✅ |
| NEL / report-to | configured (cf-nel) | ✅ |
| TLS/transport | HTTPS enforced, HTTP/2+3, zstd+br | ✅ |
| Dependencies | `npm audit --omit=dev` → **0 vulnerabilities** | ✅ |
| Information leakage | `/healthz` public + CORS-open with operational detail (kv_writes, sched_mode) — documented design (RUNBOOK), no secrets; workers.dev noindex'd; static assets carry no security headers (cache-control only — acceptable for images) | ℹ note only |
| Repo hygiene | `wrangler.dev.toml` is git-**tracked** despite its header saying git-ignored (contains resource IDs only, no secrets — F-L2) | ℹ |

---

## 7. FINDINGS REGISTER (spec §7.7 classification)

Severity: **Critical** (blocks a core target) / **High** / **Medium** / **Low**.
Every finding: problem · evidence · affected component/URL · user impact ·
SEO impact · recommended fix · implementation risk · priority.

### F-C1 · CRITICAL — Homepage mobile LCP 9.2 s (lab) / Perf 49–65: LCP art is JS-gated

- **Problem:** The LCP element (hero card scene art `div.mc-scene`,
  `/ui/mc/scene-2.webp`) only loads after the full client-JS carousel build,
  because the SSR'd `#heroMCard` ships `style="display:none"`
  (`src/pages/public.ts:525`).
- **Evidence:** Lighthouse mobile LCP 9.2 s with phase breakdown TTFB 57 ms /
  **load delay 1,440 ms** / load 223 ms / render 180 ms; discovery audit
  `requestDiscoverable:false`; live unthrottled session fetched scene-2.webp
  at 4,865 ms; CI T-09 perf 49–58 across 3 runs.
- **Affected:** `/` (mobile primarily; desktop passes at 1.4 s).
- **User impact:** ~7 s of blank hero area on mid-range mobile before the
  featured match appears; TTI 9.9 s.
- **SEO impact:** Core Web Vitals (LCP) far above the 2.5 s "good" threshold
  on the highest-value page; crawlers see the text (SSR) but page experience
  signals suffer.
- **Recommended fix (Phase 3):** SSR-reveal the first hero slide (remove
  `display:none` from the SSR mirror; let the existing `__SS_SIG__` handshake
  prevent rebuild churn), and make the first slide's scene art an eagerly
  discoverable, `fetchpriority="high"` resource (preload `as=image` or convert
  the scene to an `<img>` in the SSR mirror). Keep carousel enhancement
  behavior identical.
- **Risk:** Website-only files (`src/pages/public.ts`, `public-13.65.js`) but
  harness-pinned (check-stats, check-hero-carousel, check-mc-heroes must be
  re-pinned same-commit) + ADR-006 rename ceremony for the JS asset. Medium
  process risk, zero bot risk.
- **Priority:** **P0 — the single highest-value fix in this project.**

### F-H1 · HIGH — ~1.2 MB of external league-logo PNGs from `media.api-sports.io`

- **Problem:** Standings/cup box emblems point at
  `https://media.api-sports.io/football/leagues/*.png` (89–157 KB each, ~15
  images ≈ 1.2 MB wire on `/`) — `LEAGUE_LOGOS` in `src/tables.ts` (SHARED
  file).
- **Evidence:** Lighthouse network inventory (top-request list); live HTML
  contains the URLs; local `/leagues/*.webp` (2–5 KB each) exist for only 6
  competitions.
- **Affected:** `/` (standings + cup boxes), all pages rendering standings.
- **User impact:** ~1.2 MB extra transfer on slow mobile; third-party origin
  availability + privacy (requests leak to api-sports.io).
- **SEO impact:** Indirect (LCP/TBT pressure from image queue).
- **Recommended fix (Phase 3):** self-host league emblems under
  `/leagues/` (extend the existing webp set to the full LEAGUE_LOGOS map).
- **Risk:** **`src/tables.ts` is SHARED (isolation map §3.3)** — the bot's
  resvg card path may consume the same dictionary (resvg SVG image support =
  PNG/JPEG, webp unclear). Bot-safety must be demonstrated (local card render
  equivalence) or the web payload must switch to a web-only dictionary in
  `src/seo/`/`src/pages/` (additive, zero bot surface). HIGH process risk →
  design carefully in Phase 3, do not rush.
- **Priority:** P1.

### F-H2 · HIGH — Heavy local raster art: stadium-lights PNG 197 KB (desktop LCP), PC-HUD PNG 125 KB, bg.jpg 93 KB

- **Problem:** PNG/JPEG decoration delivered at multiples of reasonable size;
  `img.bg-lights` (stadium-lights-hero.png) is the desktop LCP element.
- **Evidence:** wire table §1.4; desktop LCP node `img.bg-lights` 1,335×593.
- **Recommended fix (Phase 3):** re-encode as optimized WebP/AVIF with
  explicit dimensions (targets: lights ≤ 60 KB, HUD ≤ 60 KB, bg ≤ 40 KB) —
  pure asset replacement + ADR-006 rename + `_headers` pin + SW bump.
- **Risk:** visual-quality review required (glow gradients compress
  differently); zero bot risk (site-facing art only).
- **Priority:** P1.

### F-H3 · HIGH (measurement gap) — No field CWV / INP data exists

- **Problem:** CrUX empty for the origin; PSI API quota exhausted this
  session; GSC inaccessible → INP and field LCP/CLS are **unmeasured**; all
  numbers in this audit are lab.
- **Impact:** Phase 7 verification of "real-world" improvements is impossible
  without a data source.
- **Recommended fix (Phase 4/5, owner-visible):** the Cloudflare Web Analytics
  beacon is already the only third-party script — enable **Web Analytics
  CWV/INP collection** in the CF dashboard (free, no code change; RUM
  in-beacon) and/or owner-run GSC CWV report. Document as RUM source for
  Phase 7.
- **Risk:** none (dashboard toggle; beacon already allowed by CSP).
- **Priority:** P1 (cheap, unlocks honest Phase 7).

### F-M1 · MEDIUM — Unused CSS ≈ 30 KB (68.7%) in `public-13.78.css`

- **Evidence:** Lighthouse unused-CSS-rules audit (mobile `/`).
- **Caveat:** hand-written, no build step; dynamically-generated classes and
  state variants must be accounted for before ANY removal (spec §8 CSS).
- **Recommended fix (Phase 2):** manual dead-rule audit (保守 — conservative),
  single rename `public-13.79.css` with full ceremony; verify vs. all page
  families + both languages + live-match states.
- **Risk:** visual regression if a "dead" rule is actually state-triggered;
  mitigated by per-family visual diff. Medium.
- **Priority:** P2.

### F-M2 · MEDIUM — Main-thread: TBT 250 ms, 6 long tasks, TTI 9.9 s on `/`

- **Evidence:** §1.5. Carousel build + i18n dictionary + list render +
  countdown wiring all run at init.
- **Recommended fix (Phase 2):** defer non-above-fold init (share buttons,
  below-fold list enhancements) via `requestIdleCallback`/post-LCP
  scheduling; keep the poll cadence.
- **Risk:** behavior must stay identical (owner's interactions); measured
  wins only. Medium.
- **Priority:** P2.

### F-M3 / F-M3b · MEDIUM — WCAG contrast failures (7 nodes) + hero-card accessible name

- **Evidence:** §6.1 (`.spotitem` countdown/team/kickdate colors; `#heroMCard`
  label mismatch).
- **Recommended fix (Phase 6):** adjust the spot-card palette to ≥4.5:1 on
  the dark bg (design-preserving tint change in CSS); add
  `aria-label`/accessible name to `#heroMCard` matching its visible text.
- **Risk:** color tweak must keep the brand look (owner review); CSS rename
  ceremony. Low-medium.
- **Priority:** P2.

### F-M4 · MEDIUM — Standings/cup logo `<img>` aspect-ratio mismatch (BP flag)

- **Evidence:** Lighthouse `image-aspect-ratio` (stbox/cupbox imgs).
- **Recommended fix:** explicit `width`/`height` matching the rendered box —
  falls out naturally with F-H1 self-hosting (fixed-size local assets).
- **Priority:** P2 (rides along with F-H1).

### F-M5 · MEDIUM — ETag served but conditional GETs never 304

- **Evidence:** immediate `If-None-Match` revalidation on `/matches/today`
  returned 200 with full body (twice, `/` too). Contradicts
  SEO_IMPLEMENTATION_REPORT R-12 (worked at v14.0-seo era) — regression or
  edge-layer behavior change since the render-hold rework.
- **Impact:** repeat visits + crawlers re-download full HTML (~43 KB br each)
  — bandwidth waste, no freshness harm.
- **Recommended fix (Phase 4):** honor `If-None-Match` in the SEO router
  (304 branch before edge-cache fetch). Website-only (`src/seo/router.ts`).
- **Risk:** low (additive branch; seo:check guards).
- **Priority:** P2.

### F-M6 · MEDIUM — Touch targets < 44 px (nav links 34 px, lang button 34×34)

- **Evidence:** §6.1 measured at 390 px (13/91 elements).
- **Recommended fix (Phase 6):** CSS padding increase on `nav a`/`#lbtn`
  (visual footprint can stay similar via padding, not size).
- **Risk:** layout-sensitive header; needs visual diff. Low-medium.
- **Priority:** P2.

### F-M7 · LOW-MEDIUM — `og/default.png` 301 KB

- **Evidence:** §1.4. Social crawlers only, but 7× heavier than needed.
- **Fix (Phase 3):** recompress to ~100–120 KB. Priority P3.

### F-M8 · LOW-MEDIUM — `/matches?page=2+` canonicalizes to page 1

- **Evidence:** §3.3. Deliberate de-dup; paginated match lists not
  independently indexable.
- **Fix (Phase 5):** decide: keep (de-dup) or self-canonical per page (deep
  fixtures discoverable). Document decision; likely keep + ensure hub links
  crawlable (they are).
- **Priority:** P3.

### F-L1..F-L10 · LOW (informational)

- **L1:** 404 pages emit `canonical → /404` (harmless; meta noindex present;
  cosmetic cleanup in Phase 5).
- **L2:** `wrangler.dev.toml` is git-tracked though its header says
  git-ignored (contains resource IDs only — no secrets; hygiene note).
- **L3:** skip link is 3rd focusable (brand link, lang btn precede).
- **L4:** `package-lock.json` version-field drift 13.197↔13.201 (K2, known).
- **L5:** `/healthz` exposes operational detail publicly (documented design).
- **L6:** retained-asset tail: 89 old `public-13.*` + 6 `core-*` on disk
  (~85 MB) — never referenced = never downloaded, but deploy-size/`_headers`
  complexity (R14); Phase 4 cap-sweep candidate.
- **L7:** zone `early_hints` off (would need Worker `Link` headers; micro-win,
  optional).
- **L8:** theme toggle retired by owner directive (always dark) — documented;
  do not re-add.
- **L9:** GSC uninspected this session (see §5).
- **L10:** `bg.jpg` 93 KB loads on every page via `body:before` (rides F-H2).

### Positive baseline facts (for Phase 7 comparison)

TTFB 45–80 ms warm (edge HIT) · sub-pages Lighthouse 91–99 · **CLS 0
everywhere** · SEO score 100 on all pages · seo:check 56/56 · security
headers strong · npm audit 0 · all 15 bot UAs 200 · no viewport overflow
360–1920 · fa/en + RTL switching verified live · JSON-LD valid and
content-matched · robots/sitemaps/redirects/404/canonicals all correct ·
DOM 3,420 nodes · 12/12 `@font-face` use `font-display:swap` · zero
web-side KV writes (`kv_writes_web: 0`).

---

## 8. Prioritized implementation plan for Phases 2–6

> Sequencing rationale: the LCP fix (F-C1) is Phase 3 scope per the spec
> roadmap, but it is the single decisive win. Phase 2 (frontend code) lands
> first per roadmap order and its TBT/long-task work directly shortens the
> JS chain that F-C1 also depends on — they compound.

### Phase 2 — Frontend optimization (CSS/JS/rendering)

1. **JS main-thread diet (F-M2):** audit `public-13.65.js` init path;
   post-LCP/idle scheduling for below-fold wiring; keep behavior identical.
   One ADR-006 rename (`public-13.66.js`), `_headers` pin, SW bump, harness
   re-pin (check-stats/check-hero-carousel/check-mc-heroes), parity re-freeze.
2. **CSS dead-code pass (F-M1):** conservative manual audit of
   `public-13.78.css` (30 KB flagged); account for state/dynamic classes;
   rename to `public-13.79.css` with full ceremony; visual diff across all
   families × fa/en × live/upcoming states.
3. (Optional) prune the 18 documented inert X-card i18n keys.
- **Acceptance:** `npm test` 0; no visual regressions (agent-browser + VLM on
  the 7 viewports); TBT measurably reduced; no new console errors; bot
  untouched.

### Phase 3 — Assets & Core Web Vitals (contains the P0)

1. **F-C1 LCP fix:** SSR-reveal first hero slide + discoverable/priority
   scene art. Target: mobile `/` lab LCP ≤ 2.5 s, Perf ≥ 85.
2. **F-H2 image re-encodes:** stadium-lights (197→≤60 KB), PC-HUD
   (125→≤60 KB), bg.jpg (93→≤40 KB) as WebP; explicit dimensions.
3. **F-H1 league emblems self-host** (with the tables.ts bot-safety design
   from the finding; fallback = web-only dictionary). Also resolves F-M4.
4. **F-M7 OG image recompress**; font-weight usage audit (10 files/229 KB —
   trim unused Peyda weights if provably unused).
- **Acceptance:** before/after Lighthouse (mobile+desktop) recorded in
  `WEB_OPTIMIZATION_RESULTS.md`; `npm test` 0; ADR-006 ceremony per edit;
  wrangler dev smoke; deploy + healthz verify.

### Phase 4 — Cloudflare & caching

1. **F-M5:** 304 handling for conditional GETs (SEO router, website-only).
2. ETag/Last-Modified on machine files (sitemaps/feed/ics) if absent.
3. **F-H3:** enable CF Web Analytics CWV/RUM (owner-visible toggle) as the
   Phase 7 field-data source.
4. (Optional) F-L6 cap-sweep of provably-unreferenced old assets; F-L7
   early-hints evaluation.
- **Acceptance:** curl-verified 304s + unchanged freshness ladder (R12:
  s-maxage=60 HTML / 60 s API / render holds); **zero new KV writes** (R2);
  seo:check green.

### Phase 5 — Technical & multilingual SEO (verification + gap-fix)

1. F-M8 pagination canonical decision (documented).
2. F-L1 404-canonical cleanup; sitemap lastmod honesty spot-audit.
3. GSC: owner-run reports or credentials (indexing, sitemap processing, CWV);
  IndexNow ping verification.
4. Re-verify hreflang N/A stance (R11) — no en URLs to annotate.
- **Acceptance:** seo:check 56/56 (or more, never fewer); documented GSC
  outcome or limitation.

### Phase 6 — Accessibility & security

1. **F-M3/M3b:** contrast palette fixes + hero-card accessible name (CSS
   rename ceremony).
2. **F-M6:** touch-target sizing; **F-L3** skip-link tab order.
3. CSP hardening evaluation (R13-bounded; likely keep `unsafe-inline`,
   document).
4. Final WCAG 2.2 AA pass (keyboard, focus, SR semantics re-audit).
- **Acceptance:** Lighthouse a11y ≥ 98 on `/`; no visual regressions; headers
  unchanged-or-stronger.

### Cross-phase invariants (unchanged)

One phase per session · `npm test` 0 before every push · no bot-file diffs in
ANY commit (`git diff --stat` review) · docs-only phases push but don't
deploy · ADR-006 ceremony for every client-asset edit · no new web-side KV
writes · update `WEB_OPTIMIZATION_PROGRESS.md` + emit next-session prompt ·
never overwrite this frozen baseline.

---

*End of Phase 1 audit (frozen). Field-data addendum and post-phase
measurements belong in `WEB_OPTIMIZATION_RESULTS.md`, never here.*
