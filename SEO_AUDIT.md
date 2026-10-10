# SportSignal — SEO Baseline Audit (Phase 0)

Date: 2026-10-10 · Auditor: SEO agent · Site: https://sportsignal.ir
Written BEFORE any feature code was changed, as required by the spec (Phase 0 first).

Plain-language summary: your site is a Cloudflare Worker that shows one page.
The page looks good in a browser, but for Google and AI assistants it looks
almost empty: the match list is filled in later by JavaScript, and most AI
crawlers do not run JavaScript. There is no separate page for any match, team
or competition. The sitemap lists only one URL. Two AI bots (ClaudeBot,
Amazonbot) are blocked by a Cloudflare setting. This audit records all of it;
the next phases fix it.

---

## D-01 — Stack

| Item | Finding |
|---|---|
| Framework | Cloudflare Worker (plain TypeScript, no web framework), entry `src/worker.ts` → `src/api.ts` router |
| Build / deploy | Wrangler 4 (`wrangler deploy`), repo `assadigit/SportSignal`, worker name `ucl-notifier`, version 13.55 |
| Router type | Real paths (no hash routing). Ordered route table `POST_GATE_ROUTES` + pre-gate branches |
| Hosting | Cloudflare (zone `sportsignal.ir`, account `REDACTED-CLOUDFLARE-ACCOUNT-ID`) |
| CDN/WAF | Cloudflare proxy (orange cloud). No WAF/firewall rules readable with the provided token |
| Domains | Worker Custom Domains: `sportsignal.ir` AND `football.sportsignal.ir` (both serve the same worker). Also reachable at `ucl-notifier.sedanama-ir.workers.dev` (public, 200) |
| Database | Cloudflare KV namespace `STATE` (id 432ecae8…) — caches, settings, user list |
| Match data | 3 providers merged: football-data.org (primary, API_TOKEN secret), sportscore, thesportsdb (fallbacks). Cron sweep every 10 min fills a 92-day fixture pool in KV (`matches_v13_tracked`) |
| Public data pipeline | `/api/public-matches` (SWR-cached KV payload + live overlay blob) → consumed client-side by the page JS |
| Other features (must not break) | Telegram bot (webhook at `https://football.sportsignal.ir/webhook`, alert bot @SportSignalAlertsBot), admin panel at `/admin`, match-card SVG/PNG route `/api/card/:matchKey`, `/healthz` monitor, Workers AI Farsi-name learning |
| Cron | `*/10 * * * *` (sweep + prewarm + notifications) |
| Static assets | Workers Static Assets from `assets/` (self-hosted Vazirmatn fonts, favicons, PWA manifest, `public-13.12.css/js`, `core-13.8.js`, `sw.js` service worker, `bg.jpg`, `hero-stage.mp4`) |

## D-02 — Rendering test (decides R-01)

`curl -s https://sportsignal.ir/` returns ~40 KB HTML. Findings in the RAW HTML (no JavaScript):

- Title: EXISTS — `مسابقات پیش‌رو — اعلان‌دهنده مسابقات` (static, same for the whole site, no brand)
- Meta description: EXISTS (Persian, generic)
- Canonical: EXISTS but points to `https://football.sportsignal.ir/` — wrong host per spec config (must be `sportsignal.ir`)
- `<h1>`: **MISSING** (no h1 anywhere; sections use h2/h3)
- Match names, dates, times, venues: **MISSING** — all sections are skeleton placeholders filled by JS after `fetch("/api/public-matches")`
- Internal links: only `/`, `#about`, `#contact`, Telegram links — no real content links
- JSON-LD: one minimal `WebSite` entity only (url = football host)
- Conclusion: **client-rendered content**. R-01 FAILS today. Google can render JS (late), but Claude/Perplexity-style crawlers see an empty page.

## D-03 — Current routes / page types

| Route | Type | Status |
|---|---|---|
| `/`, `/public` | Public HTML page (identical) | 200 |
| `/admin` (+/login, /logout, /change-password) | Admin (auth) | 200/401 |
| `/webhook` | Telegram webhook (secret-validated) | 200/403 |
| `/api/public-matches` | Public JSON API | 200 |
| `/api/card/:matchKey` | Public SVG/PNG match card | 200 |
| `/api/members`, `/api/standings`, `/api/status`, `/api/sources`, `/api/bot/info`, `/api/webhook/info`, `/api/webhook/setup`, `/api/simulate`, legacy GET `?action=` endpoints | Admin/ops JSON | 200/401 |
| `/healthz` | Public health JSON | 200/503 |
| `/sitemap.xml`, `/robots.txt` | Crawl files | 200 |
| anything else | GET → bare `404 Not Found` text; HEAD → `405` | wrong 404 handling |

No match pages, no team pages, no competition pages, no hub pages, no about/methodology/contact/privacy/terms pages exist.

## D-04 — Crawl-file / meta / status-code state (live checks 2026-10-10)

| Check | Current state | Spec target |
|---|---|---|
| robots.txt | `User-agent: * / Allow: /` + Sitemap → **football.sportsignal.ir** | Sitemap must point to apex; add AI policy groups, disallow admin |
| sitemap.xml | 1 URL (football host), uses `changefreq`+`priority` (Google ignores) | Sitemap index + child sitemaps, apex URLs, real `lastmod` |
| `<title>` | Exists, static, no brand, one page only | Unique per URL with brand |
| meta description | Exists, static, generic | Unique per URL with facts |
| canonical | → football host (single page) | → apex, self, per URL |
| H1 | **None** | Exactly one per page |
| Unknown URL (GET) | `404` bare text (no helpful page, no links, no noindex meta) | Custom 404 with nav + noindex |
| Unknown URL (HEAD) | `405` | should mirror GET |
| `http://sportsignal.ir/` | **200, no redirect** (Always-Use-HTTPS off) | 301 → https |
| `https://www.sportsignal.ir/` | **NXDOMAIN (no DNS record)** | 301 → apex |
| Trailing slash `/public/` | 405/404 (inconsistent) | 301 policy |
| Uppercase path | not handled | 301 → lowercase |
| HTTPS cert | Valid on apex + football subdomain (Cloudflare edge) | OK |
| Headers | CSP (self + unsafe-inline), `x-frame-options: DENY`, `x-content-type-options: nosniff`, `referrer-policy: no-referrer`, `cache-control: no-store` | Needs: HSTS (R-07/SE-01), `strict-origin-when-cross-origin` (SE-02), edge cache policy (PF-01), ETag (R-12) |
| `.env`, `/.git/config` | 404 (good) | OK |

## D-05 — Hosting / firewall / bot accessibility

- Site is fully on Cloudflare (proxied). No geo-block observed; all tested bot UAs from Hong Kong PoP got 200 — EXCEPT:
  - **ClaudeBot → 403** and **Amazonbot → 403** (Cloudflare-generated block page, no worker headers). This is Cloudflare's zone-level AI-bot blocking (default on free plans). The provided API token cannot read/write Bot Management or Firewall rules → owner must turn it off in the dashboard (exact steps in OWNER_TODO) because the spec sets `ALLOW_AI_TRAINING_BOTS = true`.
- The API token CAN read zone settings (e.g. `always_use_https: off`, `min_tls: 1.0`) and Workers, but NOT DNS records, Bot Management, or firewall rules.
- `ucl-notifier.sedanama-ir.workers.dev` is publicly reachable (200) — a duplicate host that must serve noindex (D-09/R-13).

## D-06 — Baseline Lighthouse (mobile, live site, 2026-10-10)

| Page | Perf | A11y | Best Practices | SEO |
|---|---|---|---|---|
| Home `/` | **65** | 98 | 88 | 100 |
| Match page | n/a — does not exist yet | | | |
| Team page | n/a — does not exist yet | | | |

Home details: LCP 5.9 s (hero video/bg image), FCP 2.5 s, TBT 280 ms, CLS 0.045, Speed Index 5.1 s, TTI 6.0 s. Failing audits include image-delivery (1.4 MB savings), cache policy (1.0 MB), render-blocking (160 ms), unminified/unused CSS+JS, main-thread 3.9 s, image aspect ratio, console errors, and **missing `<main>` landmark** (A11y 98). Lighthouse "SEO 100" passes only its basic checks — it cannot see the missing server-rendered content, the single-URL sitemap, or the missing h1.

## D-07 — noindex scan

No `noindex` found anywhere (meta, headers, code) — nothing is accidentally hidden. Production currently serves indexable (but empty-looking) HTML.

## D-08 — Data model (what pages can honestly show)

Per-match fields available from the pipeline (`pubMatch`): id, homeTeam{name, faName, crest}, awayTeam{...}, utcDate (ISO UTC), competition{code, faName, emblem}, status (SCHEDULED/TIMED/IN_PLAY/PAUSED/LIVE/FINISHED/POSTPENDED/CANCELLED…), round + roundFa, minute + scorers (live), big/derby/rivalry flags, venue (stadium NAME only), venueFa, score{fullTime{home,away}}.

NOT available anywhere in the data source: city, country, TV channels, ticket prices, attendance, endDate, officials. → Match pages and SportsEvent JSON-LD must omit those (S-05), documented here.

Competitions monitored: CL, PL, PD, SA, FL1, BL1 (+ EL, ECL, domestic cups FA_CUP/EFL_CUP/CDR/COPPA_ITALIA/DFB_POKAL/HAZFI, INTL: WC/EC/COPA/AFCON/AFC, AL). Standings available for PL/PD/SA/BL1/FL1/CL/PGL.

"Big match" logic (for /methodology, G-08) — actual code rules:
1. A match is followed/"big" if it is in a monitored competition AND (a) at least one team is in that league's big-team list (see `CONFIG.BIG_TEAMS_BY_LEAGUE` — e.g. PL: Arsenal, Chelsea, Man Utd, Man City, Liverpool; PD: Barcelona, Real Madrid, Atlético; …), or (b) for cups/CL: any big team from any list plays, or the stage is quarter-final or later.
2. Extra public-page boosts: both teams in the league's top-3 ("top table clash"), a named derby/rivalry (El Clásico, Der Klassiker, …), or a followed team vs a top-5 team.

## D-09 — Duplicate hosts / environments

| Host | Reachable | Canonical emitted | Risk |
|---|---|---|---|
| `https://sportsignal.ir` | 200 | football host | duplicate-content host mismatch (spec wants apex canonical) |
| `https://football.sportsignal.ir` | 200 | itself | second public origin; webhook lives here |
| `https://ucl-notifier.sedanama-ir.workers.dev` | **200** | football host | must be noindex (R-13) |
| `https://www.sportsignal.ir` | NXDOMAIN | — | needs DNS + 301 (owner) |

## D-10 — Gap list (status BEFORE work starts)

Legend: ✅ Done · 🟡 Partial · ❌ Missing

| Area | Status |
|---|---|
| D-01…D-10 | this document ✅ |
| R-01 server-rendered content | ❌ |
| R-02 real links | 🟡 (nav uses real `<a>`, but no content links exist) |
| R-03 no click-only content | ✅ (no login/cookie walls; skeleton-only content is the R-01 problem) |
| R-04 freshness | 🟡 (client refreshes every visit; HTML itself is static empty shell) |
| R-05 HTTPS certs | ✅ |
| R-06 single canonical origin + redirects | ❌ (http 200, www NXDOMAIN, football host also public) |
| R-07 HSTS | ❌ |
| R-08 trailing slash / lowercase | ❌ |
| R-09 mixed content | ✅ (all same-origin; CSP `img-src https:` used for provider crests — external images over https only) |
| R-10 real status codes | 🟡 (404 is bare text; HEAD→405; no soft-404s though) |
| R-11 custom 404 page | ❌ |
| R-12 ETag/Last-Modified | ❌ (no-store) |
| R-13 environment safety | ❌ (workers.dev public, no guard) |
| R-14 firewall/bot blocks | 🟡 (ClaudeBot/Amazonbot 403 at edge — owner dashboard fix) |
| U-01 URL map | ❌ (only `/` exists) |
| U-02 Latin slugs | ❌ |
| U-03 one URL per content | 🟡 (`/` and `/public` serve identical HTML; football host too) |
| U-04 anti-doorway | n/a → will apply to new pages |
| U-05 match lifecycle | ❌ (no match pages exist) |
| F-01 robots.txt | 🟡 (exists, wrong sitemap host, no admin/api disallow, no AI groups — all toggles true so default group suffices for allows) |
| F-02 AI bot policy | 🟡 (robots allows all by default; but edge blocks 2 training bots — D-05) |
| F-03 CDN robots override check | 🟡 (no managed robots.txt; but AI-bot block exists — R-14) |
| F-04 sitemap index + children | ❌ |
| F-05 sitemap rules | ❌ |
| F-06 hreflang sitemap | n/a (single language) |
| F-07 image sitemap | n/a (no owned unique images yet) |
| F-08 icons | ✅ (favicon.ico, 16/32, apple-touch-icon, 512 png; favicon.svg missing) |
| F-09 manifest | ✅ (site.webmanifest) |
| F-10 theme-color + color-scheme | 🟡 (theme-color yes; color-scheme meta missing) |
| F-11 calendar.ics | ❌ |
| F-12 feed.xml | ❌ |
| F-13 /api/matches.json | 🟡 (/api/public-matches exists but undocumented, not CORS-open, not shaped for machines) |
| F-14 llms.txt | ❌ (optional P3) |
| F-15 security.txt | ❌ |
| F-16 IndexNow | ❌ |
| F-17 no Google Indexing API | ✅ (not used — keep it that way) |
| P-01 lang/dir | ✅ (fa/rtl correct) |
| P-02 charset first | ✅ |
| P-03 viewport | ✅ |
| P-04 unique titles | ❌ (one static title) |
| P-05 unique descriptions | ❌ |
| P-06 canonical | 🟡 (exists but wrong host; one page) |
| P-07 robots meta | ❌ (absent — defaults to index, fine for the one page; must be explicit per page) |
| P-08 icon links | ✅ |
| P-09 OG/Twitter | 🟡 (present but weak: summary card, 512 logo image, wrong og:url host) |
| P-10 JSON-LD | 🟡 (WebSite only; no Organization, no SportsEvent) |
| P-11 hreflang | n/a (single language) |
| P-12 exactly one h1 | ❌ (zero h1) |
| P-13 landmarks | 🟡 (header/nav/footer exist; **no `<main>`**) |
| P-14 real text + `<time>` | ❌ (no server text; client uses no `<time>` elements) |
| P-15 image alt/width/height | 🟡 (decorative svg ok; provider crest imgs via JS need alt) |
| P-16 descriptive link text | 🟡 |
| P-17 breadcrumbs | ❌ |
| P-18 internal linking | ❌ (no content links at all) |
| P-19 no orphans | n/a (no sitemap URLs) |
| P-20 human /sitemap page | ❌ |
| P-21 /about | 🟡 (about text lives in footer of home; no page) |
| P-22 /methodology | ❌ |
| P-23 /contact | 🟡 (Telegram links only; no email known) |
| P-24 /privacy /terms | ❌ |
| P-25 footer links | 🟡 (footer nav minimal) |
| S-01 SportsEvent | ❌ |
| S-02 eventStatus | ❌ |
| S-03 endDate | ✅ by omission (data has none — will omit) |
| S-04 offers/ratings honesty | ✅ (none present — will keep none) |
| S-05 omit unknown fields | — will apply |
| S-06 validation | ❌ |
| SO-01 Open Graph | 🟡 |
| SO-02 Twitter cards | 🟡 (summary, not large image) |
| SO-03 share image | ❌ (no 1200x630 og image) |
| SO-04 per-match share image | 🟡 (card route exists with crests; spec default is text-only og images) |
| SO-05 test previews | pending deploy |
| PF-01 fast HTML/TTFB | 🟡 (TTFB 80 ms good; but `no-store` and no edge cache) |
| PF-02 hashed assets | 🟡 (versioned filenames public-13.12.*, immutable — good; but `_headers` lists old 13.8 names) |
| PF-03 compression | ✅ (brotli observed), HTTP/3 advertised |
| PF-04 images | ❌ (bg.jpg 94 KB unoptimized + 646 KB hero mp4 autoplay = LCP 5.9 s; crests lack width/height) |
| PF-05 fonts | ✅ (self-hosted, subset, preload) |
| PF-06 JS budget | 🟡 (~150 KB total gz, code not split, 1.0 s bootup, 3.9 s main-thread) |
| PF-07 CSS | 🟡 (one 112 KB file, unused CSS 28 KB, render-blocking) |
| PF-08 layout shift | ✅ 0.045 (skeletons reserve space) |
| PF-09 mobile parity | ✅ (responsive, same content) |
| PF-10 no interstitials | ✅ |
| SE-01 HSTS | ❌ |
| SE-02 headers | 🟡 (nosniff+XFO ✅; referrer-policy should be strict-origin-when-cross-origin; Permissions-Policy missing) |
| SE-03 CSP | 🟡 (exists, allows inline JSON-LD via unsafe-inline — acceptable, no breakage) |
| SE-04 no secrets public | ✅ (.env/.git 404; secrets via wrangler only) |
| SE-05 consent notice | ✅ (no analytics/cookies at all — nothing to consent to; documented in privacy page) |
| H-01 .ir ccTLD awareness | ✅ (documented; Iran targeting is intended — Persian UI) |
| H-02 host outside Iran | ✅ (Cloudflare edge; crawls from abroad work — verified from HKG) |
| H-03 Google tools from Iran | — (owner note) |
| H-04 Persian text hygiene | 🟡 (existing dict uses ی/ک/ZWNJ correctly; new content must follow) |
| G-01 robots AI policy | 🟡 (default allow; edge blocks 2 bots) |
| G-02 verify bots unblocked | ❌ (ClaudeBot/Amazonbot 403) |
| G-03 answer-first blocks | ❌ |
| G-04 absolute dates | 🟡 (client uses relative countdowns; server text missing) |
| G-05 consistent entity names | 🟡 (3-layer fa translation exists; alternateName missing in schema) |
| G-06 freshness signals | 🟡 (visible "last updated" exists client-side; no schema dateModified/lastmod agreement) |
| G-07 source attribution | ❌ |
| G-08 methodology page | ❌ |
| G-09 identity/trust pages | ❌ |
| G-10 machine endpoints | ❌ |
| G-11 original images | 🟡 (match card exists for Telegram; og images missing) |
| G-12 Bing readiness | ❌ (IndexNow off, no BWT) |
| G-13 AI referral analytics | n/a (no analytics installed — recommend in OWNER_TODO) |
| G-14 ai-visibility-prompts.md | ❌ |
| G-15 GSC generative-AI setting | — (owner task) |
| V-01 verification support | ❌ (no DNS/HTML tag hooks; DNS TXT preferred — owner) |
| V-02 sitemap/robots reachable | 🟡 (reachable but wrong host inside) |
| A-01 contrast/focus/keyboard | 🟡 (98 Lighthouse; check contrast + focus in new pages) |
| A-02 table semantics | ❌ (client tables lack th scope/caption) |
| A-03 lang on foreign text | ❌ (Latin names inside fa text unmarked) |
| A-04 skip link | ❌ |
| T-01…T-13 seo-check | ❌ (no script exists) |

---

## Stack decision for R-01 (required by the spec)

Situation found: **Cloudflare Worker serving a static HTML shell + client-side JS data fetch.**
Spec table says: *"Cloudflare Workers / edge → Render full HTML inside the Worker (template string or SSR framework adapter). Cache at the edge with short TTL."*

Decision: **render full HTML inside the existing Worker** using its template-string pattern (no new framework, no rebuild). Reasons:

1. The worker already owns the domain, the KV data, and the fast path (12-min KV payload + live overlay). Rendering HTML there adds ~0 network cost.
2. The interactive page stays exactly as it is — the server will pre-fill the same containers with real content; the existing JS then refreshes them with live data on load (progressive enhancement). Design unchanged, feature removal: none.
3. New pages (match/team/competition/hubs/trust) are server-rendered HTML strings in the same style, sharing the existing CSS and fonts.
4. HTML responses will be edge-cached ~5 min via the Workers Cache API (PF-01) with ETag support (R-12). Data comes from KV only — no provider fetches on the HTML path (protects TTFB and API quota).

Rejected alternatives: migrating to Next.js/Astro (huge change, new hosting, violates "least invasive"); bot-based dynamic rendering (forbidden by the spec); build-time prerender alone (match data changes; worker render + KV is already the freshest path).

## Assumptions (spec defaults applied — nothing blocked)

1. `PRIMARY_LANGUAGE = fa`, `dir = rtl`, `og:locale = fa_IR`, `DISPLAY_TIMEZONE = Asia/Tehran` (site default). Site also offers a client-side EN toggle — that is a UI preference, NOT a separate crawlable language; per spec Section 11 a single-language site just sets `lang` and skips hreflang. (Separate /en/ URL spaces would be a future project; listed as a risk/option, not done — least invasive.)
2. `CALENDAR_DISPLAY`: Gregorian + Jalali both shown next to each other on pages (markup uses ISO Gregorian only).
3. `SITE_TAGLINE` (from homepage, existing): «مسابقات پیش‌رو، رقابت‌های صدر جدول و نتایج تیم‌های منتخب — به‌روزرسانی خودکار».
4. `CONTACT_EMAIL` = unknown → pages point to the Telegram bot (@SportSignalAlertsBot) as the working contact channel; OWNER_TODO asks for a real email + social profiles (used later in `Organization.sameAs`).
5. `ALLOW_AI_SEARCH_BOTS / USER_BOTS / TRAINING_BOTS = true` (spec defaults) — robots.txt default-allow; ClaudeBot/Amazonbot edge block needs an owner dashboard toggle (D-05).
6. `FINISHED_MATCH_POLICY`: match URLs stay 200 forever, switch to result mode, then archive sitemap; `FINISHED_MATCH_ARCHIVE_DAYS = 365`.
7. `MIN_UPCOMING_MATCHES_FOR_TEAM_OR_COMPETITION_PAGE = 1`.
8. `INDEXNOW_ENABLED = true` (Bing/Yandex; key generated by agent, stored as a Worker secret-safe constant).
9. `ANALYTICS`: none installed — recommendation only in OWNER_TODO (per spec: do not install without approval).
10. `DATA_SOURCE_NAME_AND_URL`: football-data.org (primary) + sportscore + thesportsdb (fallbacks) — used for attribution text and /methodology.
11. `LOGO_PATH`: `assets/android-chrome-512x512.png` (512×512, exists). A dedicated 1200×630 OG default image will be created.
12. `THEME_COLOR`: `#0f172a` (existing meta).
13. Canonical host = `sportsignal.ir`. `football.sportsignal.ir` will 301 to the apex for public pages (it must keep serving `/webhook`, `/api/*`, `/admin*` without redirect — the Telegram webhook lives there and POST redirects would break the bot).

## What only the owner can do (details in OWNER_TODO.md later)

- Add `www` DNS record (CNAME → worker or Cloudflare redirect) so `https://www` can 301 to apex. The API token provided cannot manage DNS.
- Turn OFF the Cloudflare "Block AI bots" setting (ClaudeBot/Amazonbot 403).
- Search Console + Bing Webmaster verification (DNS TXT), sitemap submission.
- Supply contact email, social profile URLs, review legal text.
- Confirm data licence / attribution requirements.

— End of Phase 0 audit —
