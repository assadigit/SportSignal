# SportSignal — SEO + Google + AI-Search Visibility Spec

Version 1.0 · Written 2026-10-10 · Site: https://sportsignal.ir
Audience: an AI coding agent that will implement everything in this file.
Owner: Ali (non-technical; explain results in plain language, deliver complete working files, no placeholders).

---

## 0. CONFIGURATION BLOCK (read first, confirm values during Phase 0)

Anything marked AUTO-DETECT must be discovered from the codebase. Anything marked OWNER must be written into `OWNER_TODO.md` if it is unknown. Do not stop work for unknown values; use the stated default and list it under "Assumptions" in the final report.

```
SITE_URL                    = https://sportsignal.ir
CANONICAL_HOST              = sportsignal.ir            # no "www". www and http all 301 to https://sportsignal.ir
SITE_NAME                   = SportSignal
SITE_TAGLINE                = AUTO-DETECT from current homepage; if none, write one (max 70 chars)
PRIMARY_LANGUAGE            = AUTO-DETECT (fa or en)    # drives lang, dir, hreflang, og:locale
OTHER_LANGUAGES             = none                      # if the site already has more than one language, apply Section 11
TEXT_DIRECTION              = AUTO                      # rtl if fa, ltr if en
STORE_TIMES_AS              = UTC (ISO 8601)            # never store local times
DISPLAY_TIMEZONE            = AUTO                      # default Asia/Tehran if fa, otherwise UTC; use IANA names, never hardcode offsets
CALENDAR_DISPLAY            = gregorian                 # if fa, ALSO show Jalali (Shamsi) next to it; markup always uses Gregorian ISO 8601
CONTACT_EMAIL               = OWNER
SOCIAL_PROFILES             = OWNER (list of URLs; used in Organization.sameAs)
LOGO_PATH                   = AUTO-DETECT (needs a square logo, min 112x112 px, ideally 512x512 PNG)
OG_DEFAULT_IMAGE            = /og/default.png (1200x630) — create if missing
THEME_COLOR                 = AUTO-DETECT from existing CSS
DATA_SOURCE_NAME_AND_URL    = AUTO-DETECT (the API/feed the match data comes from; used for attribution and for the methodology page)
BIG_MATCH_DEFINITION        = AUTO-DETECT from code (how the app decides a match is "big"); document it in plain words on /methodology
ALLOW_AI_SEARCH_BOTS        = true     # OAI-SearchBot, Claude-SearchBot, PerplexityBot, DuckAssistBot, etc. (these power AI answers and citations)
ALLOW_AI_USER_BOTS          = true     # ChatGPT-User, Claude-User, Perplexity-User (fetch a page when a person asks about it)
ALLOW_AI_TRAINING_BOTS      = true     # GPTBot, ClaudeBot, Google-Extended, Applebot-Extended, CCBot, meta-externalagent, Amazonbot
FINISHED_MATCH_POLICY       = keep URL at HTTP 200, switch page to "result" mode, keep indexable, move to archive sitemap
FINISHED_MATCH_ARCHIVE_DAYS = 365      # after this, set noindex,follow only if the page has no unique content left
MIN_UPCOMING_MATCHES_FOR_TEAM_OR_COMPETITION_PAGE = 1   # below this, noindex,follow and leave out of the sitemap
INDEXNOW_ENABLED            = true     # pings Bing, Yandex and others when pages change (Google does not use it)
ANALYTICS                   = AUTO-DETECT; if none, recommend a privacy-friendly one in OWNER_TODO.md, do not install without approval
```

---

## 1. Mission, scope and success definition

**Mission:** make every public page of sportsignal.ir (1) crawlable, (2) indexable, (3) understandable by Google and by AI assistants (ChatGPT search, Claude, Perplexity, Gemini, Copilot, Google AI Overviews and AI Mode), and (4) fast and trustworthy.

**What the site is:** a vibe-coded site that shows when the next big football matches are played.

**Success means (all must be true at the end):**

1. The raw HTML response of every public page (no JavaScript executed) already contains the real content: title, H1, match names, dates, times, venues, competition, internal links, and JSON-LD.
2. `robots.txt`, `sitemap.xml`, canonical tags, status codes, redirects, hreflang (if relevant), and structured data are correct and pass the automated checks in Section 15.
3. Google Rich Results Test and Schema Markup Validator show zero errors for the structured data on sample pages.
4. Lighthouse mobile: Performance ≥ 90, SEO = 100, Accessibility ≥ 95, Best Practices ≥ 95, on home, a match page, a team page.
5. Core Web Vitals targets (Section 9) are met on a mobile lab test.
6. No instruction in this spec was skipped. Anything not done is listed in the report with the reason.

**Honest expectations to put in the final report:** nobody can guarantee rankings or AI citations. Google may show its own built-in sports fixtures widget for famous matches, so the realistic wins are (a) long-tail pages that answer "when is X vs Y", team and competition fixture pages, (b) being cited by AI assistants because the pages are fast, factual, fresh and clear. Indexing of a new or small site usually takes days to weeks.

---

## 2. Operating rules for the agent

1. Do Phase 0 (audit) first. Do not write feature code before `SEO_AUDIT.md` exists.
2. Do not change the visual design unless a requirement forces it (for example, adding a visible "last updated" line or a breadcrumb). Do not remove existing features.
3. Work in small, separate commits (one per phase). Every commit message says which requirement IDs it covers.
4. Never invent facts. No made-up match data, venues, TV channels, statistics, ratings, reviews, or authors. Show a field only if the data source provides it.
5. Never serve different content to search or AI bots than to people (no cloaking). Do not use user-agent-based "dynamic rendering".
6. Prefer the least invasive change that satisfies the requirement. If a requirement needs a big architecture change (see R-01), explain the options in plain language in the audit, pick one, and implement it.
7. Do not commit secrets. Do not add tracking or third-party scripts that were not already there without writing it in `OWNER_TODO.md`.
8. Everything you write for the owner (reports, TODO files) must be plain language. Short sentences. No unexplained jargon.
9. Every script you create must start with a clearly marked configuration block at the top (all editable values in one place) and must be complete and copy-paste runnable.
10. When this spec says "check current docs", fetch the current Google Search Central page for that topic before finalizing, because guidance changes.
11. Priority tags: **P0** = blocks indexing or correctness, must be done. **P1** = important. **P2** = good to have. **P3** = optional/low value. Do all P0 and P1. Do P2 unless it needs a risky change. P3 only if cheap.

---

## 3. Phase map (do in this order)

| Phase | Name | Output |
|---|---|---|
| 0 | Discovery and baseline audit | `SEO_AUDIT.md` |
| 1 | Rendering, URLs, status codes, redirects | Server-rendered HTML, clean URLs |
| 2 | Crawl files | robots.txt, sitemaps, icons, manifest, feeds, IndexNow |
| 3 | Page templates and on-page SEO | Titles, descriptions, headings, content blocks, internal links |
| 4 | Structured data | JSON-LD on all templates |
| 5 | Social sharing and icons | Open Graph, Twitter cards, generated share images |
| 6 | Performance, security, hosting | Core Web Vitals, headers, caching |
| 7 | AI / GEO layer | Answer-first blocks, machine-readable endpoints, bot policy |
| 8 | Automation and tests | `seo-check` script, CI hook, post-deploy pings |
| 9 | Verification, report, owner handoff | `SEO_IMPLEMENTATION_REPORT.md`, `OWNER_TODO.md` |

---

## 4. PHASE 0 — Discovery and baseline (P0)

Write all findings in `SEO_AUDIT.md`.

- [ ] **D-01** Identify the stack: framework, build tool, router type (hash `/#/` or real paths), hosting provider, CDN/WAF (for example Cloudflare), database or data source, how match data is fetched and updated.
- [ ] **D-02** Rendering test. Run `curl -s https://sportsignal.ir/ | head -200` and also view the page source. Answer: does the raw HTML contain real match names and dates, or only an empty `<div id="root">`? Record the answer. This decides R-01.
- [ ] **D-03** List every existing route, query parameter, and page type.
- [ ] **D-04** Record the current state of: robots.txt, sitemap, `<title>`, meta description, canonical, H1, status code for a made-up URL (should be 404), redirects (http, www), HTTPS certificate, response headers.
- [ ] **D-05** Find where the site is hosted (inside Iran or outside) and whether a firewall, CDN, bot-protection, or geo-blocking is active. Record any rule that could block Googlebot, Bingbot, or AI crawlers.
- [ ] **D-06** Run a baseline Lighthouse mobile test on home, one match page (or closest equivalent), and one list page. Save the scores.
- [ ] **D-07** Check for `noindex` anywhere (meta tag, `X-Robots-Tag` header, framework config, staging flags, WordPress "discourage search engines" setting).
- [ ] **D-08** Find the data model for teams, competitions, venues, matches. Note which fields exist (kickoff time, venue, city, country, round, TV channel, status, score). This decides what each page can honestly show.
- [ ] **D-09** Check for duplicate hosts or environments (staging, preview URLs, `*.pages.dev`, `*.vercel.app`, `*.workers.dev`) that are publicly crawlable. These must be `noindex` and canonicalized to production.
- [ ] **D-10** Produce a gap list: every requirement in this spec marked Done / Partial / Missing before you start.

**Stack decision table for R-01 (pick one, explain why in `SEO_AUDIT.md`):**

| Situation found | What to do |
|---|---|
| Already server-rendered (Next.js SSR/SSG, Nuxt SSR, Astro, Flask/Django/Laravel templates, WordPress) | Keep it. Verify with curl. Do not rebuild. |
| Client-only React/Vue/Vite SPA | Add server rendering or static pre-rendering. Preferred: migrate routes to a framework mode that renders HTML on the server (Next.js, Nuxt, Astro, or the SSR mode of the current meta-framework). Acceptable: build-time prerender plus incremental regeneration for match pages. Not acceptable: serving bots a different version. |
| Cloudflare Workers / edge | Render full HTML inside the Worker (template string or SSR framework adapter). Cache at the edge with short TTL. |
| WordPress | Use the existing SEO plugin (Yoast/Rank Math) for titles, canonicals, sitemaps; add custom JSON-LD only where the plugin cannot. Do not run two SEO plugins. |

---

## 5. PHASE 1 — Rendering, URLs, status codes, redirects

### 5.1 Rendering (P0)

- [ ] **R-01 (P0)** Every public page returns complete content in the first HTML response, with JavaScript disabled: `<title>`, meta tags, canonical, one `<h1>`, the match list or match details as real HTML text, internal links as real `<a href>`, and the JSON-LD. Reason: Googlebot can render JavaScript but later and less reliably; most AI crawlers do not run JavaScript at all, so a client-only page looks empty to them.
  **Acceptance:** `curl -s URL` contains the team names, date, time, venue, and `application/ld+json` for 10 random URLs.
- [ ] **R-02 (P0)** Real links only. Navigation, pagination, filters, and "next match" links use `<a href="/real/path">`. No `onclick`-only navigation, no `href="#"`, no `javascript:` links, no hash routing (`/#/match/1`). Use the History API / real paths.
- [ ] **R-03 (P0)** No content that appears only after a click, scroll, cookie banner choice, login, or IP/geo check. Lazy loading is allowed only for below-the-fold images and must not hide text content.
- [ ] **R-04 (P1)** Time-sensitive data (kickoff time, status) is rendered on the server on every request or at least every 5 minutes (incremental regeneration or short edge cache). Stale pages showing past matches as "upcoming" harm trust.

### 5.2 HTTPS, hosts, redirects (P0)

- [ ] **R-05 (P0)** Valid HTTPS certificate on `sportsignal.ir` and `www.sportsignal.ir`.
- [ ] **R-06 (P0)** Exactly one canonical origin: `https://sportsignal.ir`. Single-hop 301 redirects from `http://sportsignal.ir`, `http://www.sportsignal.ir`, `https://www.sportsignal.ir` to it. No redirect chains (max 1 hop). No redirect loops.
- [ ] **R-07 (P1)** HSTS header: `Strict-Transport-Security: max-age=31536000; includeSubDomains`. Do NOT add `preload` unless the owner approves in writing (hard to undo).
- [ ] **R-08 (P0)** Trailing-slash policy: pick one (default: no trailing slash except root) and 301 the other. Lowercase URLs only (301 uppercase to lowercase).
- [ ] **R-09 (P0)** No mixed content (all images, scripts, fonts over HTTPS).

### 5.3 Status codes (P0)

- [ ] **R-10 (P0)** Real HTTP status codes, also for dynamic routes and SPA fallbacks:
  - 200 for existing pages.
  - 404 with a helpful custom page for unknown URLs (unknown match slug, unknown team). Never return 200 with a "not found" message (soft 404).
  - 410 for content permanently removed on purpose.
  - 301 for permanent moves (for example if a slug changes). Keep old-slug redirects forever.
  - 5xx only for real server errors. For planned maintenance use 503 with `Retry-After`.
- [ ] **R-11 (P1)** Custom 404 page: has the site navigation, a link to home, to "today's matches", to the matches list; has `<meta name="robots" content="noindex">`.
- [ ] **R-12 (P1)** Conditional requests: send `ETag` and/or `Last-Modified`, answer `If-None-Match` / `If-Modified-Since` with 304 where the framework allows. Saves crawl budget.

### 5.4 Environment safety (P0)

- [ ] **R-13 (P0)** Production serves `index, follow`. Every non-production environment (staging, preview, localhost builds) serves `noindex, nofollow` via both `<meta name="robots">` and the `X-Robots-Tag` header, and ideally sits behind a password. Control it with one environment variable, and add a test that fails the deploy if production accidentally outputs `noindex`.
- [ ] **R-14 (P0)** Make sure no firewall/CDN rule, rate limit, geo-block, JS challenge, or "bot fight" feature blocks or challenges Googlebot, Bingbot, or the AI search bots in Section 12. Do not trust the user-agent string alone for security decisions; verified Googlebot is identified by reverse DNS or Google's published IP ranges. Record what you changed. If the setting lives in a dashboard you cannot reach, put exact click-by-click steps in `OWNER_TODO.md`.

### 5.5 URL design (P0/P1)

- [ ] **U-01 (P0)** Final URL map (adjust to existing routes only if they are already good, and 301 any URL you change):

| URL pattern | Page | Indexable | Notes |
|---|---|---|---|
| `/` | Home: next big matches (next 7–14 days) | Yes | Main landing page |
| `/matches` | All upcoming big matches | Yes | Paginated with crawlable links if long |
| `/matches/today`, `/matches/tomorrow`, `/matches/this-week`, `/matches/this-weekend` | Evergreen time hubs | Yes | Stable URLs that always show current data (they build authority over time). Do NOT create dated duplicates for them |
| `/matches/{home}-vs-{away}-{yyyy-mm-dd}` | One match page | Yes | Example: `/matches/real-madrid-vs-barcelona-2026-11-08` |
| `/competitions` and `/competitions/{slug}` | League/cup hub with its fixtures | Yes if threshold met | e.g. premier-league, la-liga, champions-league |
| `/teams` and `/teams/{slug}` | Team page with next matches (and recent results if data exists) | Yes if threshold met | |
| `/about` | Who runs the site, what it is | Yes | Trust page |
| `/methodology` | How "big matches" are chosen, where data comes from | Yes | Trust + unique value |
| `/contact` | Contact details | Yes | Trust page |
| `/privacy`, `/terms` | Legal | Yes (low priority) | |
| `/faq` | Real human FAQ, only if visible useful content exists | Optional | |
| `/data` | Documents calendar/feeds/JSON endpoints, licence, attribution | Yes (P2) | |
| `/sitemap` | Human sitemap page | Yes (P2) | |
| `/search`, `/admin`, `/api/*`, login pages | Internal | No | `noindex` and excluded from sitemap |

- [ ] **U-02 (P0)** Slugs: lowercase Latin letters, digits, hyphens. Even if the site language is Persian, use Latin slugs (transliterated or English team names). Reason: clean, shareable, stable. Slug never changes after publish; if it must, 301 the old one.
- [ ] **U-03 (P0)** One URL per piece of content. Query parameters (`?utm_*`, `?sort=`, `?ref=`, `?page=1`) must canonicalize to the clean URL. `?page=2` etc. is allowed for pagination with a self-referencing canonical and crawlable prev/next links (do not canonicalize page 2 to page 1).
- [ ] **U-04 (P1)** Anti-doorway rule: create a page only if it has unique useful content. A team or competition page that has no upcoming match and no unique content gets `noindex, follow` and is left out of the sitemap. Do not mass-generate near-identical pages (for example one page per minor league per day).
- [ ] **U-05 (P1)** Match lifecycle (follow `FINISHED_MATCH_POLICY`): scheduled → live → finished/postponed/cancelled. The URL stays HTTP 200 forever. The page content, the visible status, and the structured data `eventStatus` update to match. Never delete a match page just because the match has passed.

---

## 6. PHASE 2 — Crawl files

### 6.1 robots.txt (P0)

- [ ] **F-01 (P0)** Serve `/robots.txt` at the root, HTTP 200, `text/plain; charset=utf-8`. Use the template in Appendix A, generated from the config toggles. Rules:
  - Allow everything public. Do not block CSS, JS, images, fonts, or the API that the page needs to render (blocking them breaks rendering).
  - Disallow only: admin, login, internal search, `/api/` (only if the pages do not need it to render after Phase 1), and endless filter/sort parameter spaces.
  - Include the line `Sitemap: https://sportsignal.ir/sitemap.xml`.
  - `noindex` inside robots.txt does nothing; never use it there. Use meta robots or `X-Robots-Tag`.
  - Never combine `Disallow` with the wish to deindex a page (Google cannot see the `noindex` if it cannot crawl the page).
  - Important robots.txt behavior: a crawler follows only the most specific group that matches its name. If you create a group for a specific bot, repeat the shared `Disallow` lines inside it.
- [ ] **F-02 (P0)** AI bot policy exactly as in Section 12 (driven by the three toggles).
- [ ] **F-03 (P1)** Check that a CDN (for example Cloudflare "AI Crawl Control", "Block AI bots", or a "managed robots.txt") is not silently adding or overriding rules. The final public `https://sportsignal.ir/robots.txt` is what counts. Fetch it after deploy and compare with your file.

### 6.2 Sitemaps (P0)

- [ ] **F-04 (P0)** `/sitemap.xml` is a sitemap index pointing to child sitemaps:
  `/sitemaps/pages.xml` (home, hubs, about, methodology, contact, legal), `/sitemaps/competitions.xml`, `/sitemaps/teams.xml`, `/sitemaps/matches-upcoming.xml`, `/sitemaps/matches-archive.xml`.
- [ ] **F-05 (P0)** Sitemap rules:
  - Only canonical, indexable URLs that return HTTP 200. No redirected, noindex, 404, or parameter URLs.
  - Absolute URLs with `https://sportsignal.ir`.
  - Max 50,000 URLs and 50 MB uncompressed per file; split earlier at ~10,000 URLs.
  - `<lastmod>` = the real date of the last meaningful content change (ISO 8601 with timezone), for example when a kickoff time or status changed. Never set it to "now" on every build; Google learns to ignore dishonest `lastmod`.
  - Do not add `<priority>` or `<changefreq>` (Google ignores them).
  - Served as `application/xml`, UTF-8, regenerated automatically whenever match data changes (not by hand).
  - Do not use the old "sitemap ping" URL (retired by Google). Discovery happens via robots.txt and Search Console.
- [ ] **F-06 (P2)** If the site has more than one language, add `xhtml:link` hreflang alternates in the sitemap (see Section 11).
- [ ] **F-07 (P2)** Image sitemap entries only for unique, real images you own the rights to. Skip if there are none.

### 6.3 Icons and manifest (P1)

- [ ] **F-08 (P1)** `/favicon.ico` (48x48 or multiples of 48), plus `/favicon.svg` or PNGs at 192x192 and 512x512, plus `/apple-touch-icon.png` (180x180). The favicon must be square, readable at small size, and stable (do not change the URL often). Reference them in `<head>`.
- [ ] **F-09 (P2)** `/manifest.webmanifest` with name, short_name, start_url `/`, display `standalone`, icons 192 and 512, `theme_color`, `background_color`, `lang`, `dir`. Do not add a service worker that serves stale match data.
- [ ] **F-10 (P2)** `<meta name="theme-color">` and `<meta name="color-scheme">` matching the design.

### 6.4 Feeds and machine-readable files (P2)

- [ ] **F-11 (P2)** `/calendar.ics`: iCalendar feed of upcoming big matches (UID stable per match, DTSTART in UTC, SUMMARY, LOCATION, URL back to the match page, `LAST-MODIFIED`). Optional per-team feeds `/teams/{slug}.ics`.
- [ ] **F-12 (P2)** `/feed.xml`: Atom feed of the newest and changed matches (title, link, updated, summary).
- [ ] **F-13 (P2)** `/api/matches.json` (public, read-only, CORS `*`, rate-limited, cached): documented on `/data` with attribution and licence text. Use clear field names and ISO 8601 UTC times.
- [ ] **F-14 (P3)** `/llms.txt`: optional. Google states it needs no special AI file, and no major engine is confirmed to rank by it. If added, keep it small, auto-generated from the sitemap (site description + links to key pages), never hand-maintained. Do not spend more than 15 minutes on it.
- [ ] **F-15 (P3)** `/.well-known/security.txt` with contact and expiry date (OWNER supplies contact).

### 6.5 IndexNow (P1)

- [ ] **F-16 (P1)** If `INDEXNOW_ENABLED`: generate an IndexNow key, serve `https://sportsignal.ir/{key}.txt`, and after each deploy or data change POST the list of changed URLs to the IndexNow endpoint (`https://api.indexnow.org/indexnow`). Batch up to 10,000 URLs, only changed ones, no more than needed. This helps Bing, Yandex, and other participants discover changes fast. Google does not use IndexNow.
- [ ] **F-17 (P0, warning)** Do NOT use Google's Indexing API for normal pages. It is only intended for job postings and livestream pages. Misuse can cause trouble. Rely on sitemaps, internal links, and Search Console "Request indexing" for key URLs.

---

## 7. PHASE 3 — Page templates and on-page SEO

### 7.1 Required `<head>` on every page (P0)

Use the template in Appendix B. Required:

- [ ] **P-01** `<!doctype html>`, `<html lang="…" dir="…">` with the right language code (`fa` or `en`; use `fa-IR` in hreflang and og:locale `fa_IR`).
- [ ] **P-02** `<meta charset="utf-8">` as the first element in `<head>`.
- [ ] **P-03** `<meta name="viewport" content="width=device-width, initial-scale=1">` (never disable zoom).
- [ ] **P-04** Unique `<title>` per URL (see templates below).
- [ ] **P-05** Unique `<meta name="description">` per URL, 70–160 characters, written for humans, contains the key facts (teams, date, time, competition).
- [ ] **P-06** `<link rel="canonical" href="…">`, absolute URL, self-referencing on the clean URL, https, correct host, matches the sitemap URL and `og:url`.
- [ ] **P-07** `<meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1">` on indexable pages. `noindex, follow` on pages listed as non-indexable in U-01/U-04. Do NOT add `nosnippet` or `data-nosnippet` on core content (they reduce visibility in search and AI features).
- [ ] **P-08** Icons, manifest, theme-color links (F-08 to F-10).
- [ ] **P-09** Open Graph + Twitter tags (Section 10).
- [ ] **P-10** JSON-LD (Section 8).
- [ ] **P-11** hreflang links only if multi-language (Section 11).

### 7.2 Title and description templates (P0)

Keep titles around 50–60 characters (they may be cut by width, not by a fixed limit). Put the most important words first. Brand at the end. No keyword stuffing. Localize into the primary language; the wording below is the pattern.

| Page | Title pattern | Description pattern |
|---|---|---|
| Home | `Upcoming Big Football Matches — Dates & Kick-off Times | SportSignal` (fa example: `برنامه بازی‌های مهم فوتبال | تاریخ و ساعت شروع | SportSignal`) | One sentence: what the site shows + the next 1–2 biggest matches with date. |
| Match | `{Home} vs {Away} — {Competition}, {Date} | SportSignal` (fa example: `{میزبان} – {میهمان} | {مسابقات}، {تاریخ} | SportSignal`) | `{Home} play {Away} in {Competition} on {Date} at {Time} ({TZ}) at {Venue}, {City}. …` (only fields that exist) |
| Team | `{Team} Fixtures — Next Matches & Kick-off Times | SportSignal` | Next match + date + competition. |
| Competition | `{Competition} Fixtures — Upcoming Big Matches | SportSignal` | Upcoming key matches. |
| Today / tomorrow / week hubs | `Football Matches Today — {Absolute date} | SportSignal` | Count of matches + top match. Include the absolute date in the title text, generated at render time. |
| About / Methodology / Contact | `{Page name} | SportSignal` | One clear sentence. |
| 404 | `Page not found | SportSignal` | n/a, noindex |

Rules: no two indexable URLs share a title; no empty or default framework titles ("Vite App", "React App", "Document"); titles and descriptions come from data, not hardcoded in one place.

### 7.3 Body structure (P0/P1)

- [ ] **P-12 (P0)** Exactly one `<h1>` per page, describing the page (match page: "Home vs Away — Competition, Date"). Headings in order (h1 → h2 → h3), no skipped levels, not used just for styling.
- [ ] **P-13 (P0)** Semantic landmarks: `<header>`, `<nav>`, `<main>`, `<article>` (match page), `<section>`, `<footer>`. One `<main>` per page.
- [ ] **P-14 (P0)** Text is real text, not text inside images. Dates/times use `<time datetime="2026-11-08T20:00:00Z">…</time>` (the `datetime` attribute is ISO 8601; the visible text is human-friendly in the display timezone and says the timezone name).
- [ ] **P-15 (P1)** Every image has meaningful `alt` text (empty `alt=""` only for decorative images), explicit `width` and `height`, modern format (WebP/AVIF) with fallback if needed.
- [ ] **P-16 (P1)** Link text is descriptive ("Real Madrid vs Barcelona — 8 Nov"), never "click here" or bare "more". External links to official sources use normal `rel` (use `rel="nofollow sponsored"` only for paid/affiliate links; `rel="ugc"` for user content).
- [ ] **P-17 (P1)** Visible breadcrumbs on match, team, competition pages (Home › Competitions › La Liga › Match). Same trail in BreadcrumbList JSON-LD.
- [ ] **P-18 (P1)** Internal linking: every page reachable within 3 clicks from home through normal links. Match page links to both team pages, the competition page, the previous/next match of the same teams if any, and `/matches/today` or the relevant hub. Team and competition pages link to all their upcoming match pages. Footer links to About, Methodology, Contact, Privacy, Terms, Data.
- [ ] **P-19 (P1)** No orphan pages (a URL in the sitemap with zero internal links is an error).
- [ ] **P-20 (P2)** Human-readable `/sitemap` page.

### 7.4 Match page content blueprint (P0 for the first five items)

Each match page must contain, in this order, only data that really exists:

1. `<h1>`: `{Home} vs {Away} — {Competition}, {Date}`.
2. **Answer-first summary (1–2 plain sentences)** with all key facts. Example: "Real Madrid play Barcelona on Sunday 8 November 2026 at 21:00 (CET, Madrid time), 23:30 Tehran time, at the Santiago Bernabéu in La Liga." (This is the sentence AI assistants and search snippets will quote.)
3. **Key facts table** (`<table>` or `<dl>`): competition, round/matchday, date, kickoff in display timezone **and** UTC, venue, city, country, status (Scheduled/Live/Finished/Postponed/Cancelled), TV/streaming if the data source provides it.
4. **"Why this is a big match"**: 2–4 sentences generated from real data and the `BIG_MATCH_DEFINITION` (table positions, rivalry flag, stage of competition, title/relegation stakes). If you have no real data for a claim, leave it out.
5. **Last updated** line using `<time datetime>` and the source name.
6. Related links: both teams, competition, previous meeting/next match, today's hub.
7. If the match is finished: result mode (score, short factual summary from data) and the updated structured data.
8. Minimum meaningful text: aim for ≥ 120 words of unique, data-derived text per match page. Do not pad with filler.

### 7.5 Hub/list page content (P1)

- Home, `/matches`, today/tomorrow/this-week: a short unique intro (2–3 sentences, human-written, localized), the list of matches grouped by date, each item showing teams, competition, date, time with timezone, and a link to its page. Lists are HTML (`<ul>`/`<ol>` or table), not canvas or images.
- Pagination: crawlable links, self-canonical, no "infinite scroll only".
- Filters (competition, date): implemented as normal links to real, indexable hub URLs where a hub exists; otherwise as non-indexed parameters that canonicalize to the clean URL.

### 7.6 Trust pages (P1)

- [ ] **P-21** `/about`: who runs SportSignal (a real name or team/brand), what it does, how often it updates, how to contact.
- [ ] **P-22** `/methodology`: plain explanation of how a match is chosen as "big" (the actual logic from code), data sources, update frequency, how to report errors, correction policy.
- [ ] **P-23** `/contact`: working email (CONTACT_EMAIL).
- [ ] **P-24** `/privacy` and `/terms`: accurate to what the site really does (analytics, cookies). Owner must review legal text (put in OWNER_TODO).
- [ ] **P-25** Footer shows site name, year, link to these pages, optional social links.

---

## 8. PHASE 4 — Structured data (JSON-LD)

General rules (P0):

- Use JSON-LD in the initial HTML (`<script type="application/ld+json">`), not injected late by JavaScript.
- Markup must match what is visible on the page. Do not mark up hidden content, invented data, or fake ratings/reviews.
- Dates/times are ISO 8601 with timezone offset. Compute the offset from the UTC kickoff time and the venue's IANA timezone, never by hand.
- Absolute https URLs. Use stable `@id` values (`{page URL}#event`, `{SITE_URL}/#organization`, `{SITE_URL}/#website`).
- One `@graph` per page is fine.
- Google states that no special markup is needed for AI Overviews/AI Mode; structured data is for clear understanding and standard rich results, not an "AI trick". Rich results for football fixtures are not guaranteed because Google has its own sports data.

| Page | Types |
|---|---|
| Every page | `Organization` (name, url, logo as ImageObject, sameAs from SOCIAL_PROFILES, contactPoint if email is public), `WebSite` (name, alternateName if relevant, url, inLanguage). **Do not add `SearchAction`/sitelinks search box** (Google retired that feature). |
| Home, list and hub pages | `WebPage` or `CollectionPage` + `ItemList` of the listed matches (position, url, name) + `BreadcrumbList` |
| Match page | `SportsEvent` + `BreadcrumbList` (+ `WebPage` with `dateModified`) |
| Team page | `SportsTeam` (name, sport, url, logo only if licensed, sameAs official site/social only if verified) + `BreadcrumbList` |
| Competition page | `SportsOrganization` (name, sport, url, sameAs only if verified) + `ItemList` of upcoming matches + `BreadcrumbList` |
| About | `AboutPage`; Contact: `ContactPage` |
| FAQ (only if real visible FAQ) | `FAQPage` is allowed but Google shows FAQ rich results only for a few site types; add only if the visible FAQ is genuinely useful. P3 |

**SportsEvent required content** (see Appendix C for a full example):

- [ ] **S-01 (P0)** `name`, `startDate` (with offset), `location` (a `Place`/`StadiumOrArena` with `name` and `address` containing at least `addressLocality` and `addressCountry`), `url`, `description`, `sport` ("Football"), `homeTeam` and `awayTeam` (each a `SportsTeam` with `name`), `eventStatus`, `eventAttendanceMode` = `OfflineEventAttendanceMode`, `image` (at least one crawlable image URL), `organizer` (the competition as `SportsOrganization`).
- [ ] **S-02 (P0)** `eventStatus` is always correct: `EventScheduled`, `EventPostponed`, `EventRescheduled` (with `previousStartDate`), `EventCancelled`. Update it automatically from the data feed.
- [ ] **S-03 (P1)** Include `endDate` only if the data source provides it; do not guess.
- [ ] **S-04 (P1)** Include `offers` only if the page really links to a ticket seller and shows a real price/availability. Otherwise omit. No fake `AggregateRating` or `Review`.
- [ ] **S-05 (P1)** If an unknown field (for example venue address) is missing in the data, omit the property rather than inventing it. If a required property cannot be provided, still keep the visible page; skip only the invalid JSON-LD block and log it in the report.
- [ ] **S-06 (P0)** Validate sample pages with Google Rich Results Test and `validator.schema.org`; add a local JSON-LD validity check to the test script (Section 15).

---

## 9. PHASE 6 — Performance, security, hosting

### 9.1 Core Web Vitals targets (P1) — measured at the 75th percentile on mobile

- LCP (loading) ≤ 2.5 s · INP (responsiveness) ≤ 200 ms · CLS (layout shift) ≤ 0.1

Requirements:

- [ ] **PF-01** Initial HTML is fast: server TTFB ≤ 600 ms from a typical location; use edge/CDN caching for HTML with a short TTL, for example `Cache-Control: public, max-age=0, s-maxage=300, stale-while-revalidate=600` (tune to how often match data changes).
- [ ] **PF-02** Static assets have content-hashed filenames and `Cache-Control: public, max-age=31536000, immutable`.
- [ ] **PF-03** Brotli or gzip on HTML, CSS, JS, JSON, SVG, XML. HTTP/2 or HTTP/3 enabled.
- [ ] **PF-04** Images: responsive `srcset`/`sizes`, WebP/AVIF, explicit width/height, hero image not lazy-loaded and preloaded if it is the LCP element; below-the-fold images `loading="lazy"`.
- [ ] **PF-05** Fonts: self-hosted, subset (include Persian/Arabic glyph ranges if the site is Persian), `font-display: swap`, preload only the one or two critical files. No render-blocking third-party font CSS.
- [ ] **PF-06** JavaScript: initial JS ≤ ~150 KB gzipped for a content page; code-split by route; defer non-critical scripts; remove unused libraries; no long main-thread tasks (> 50 ms) on load; third-party scripts (analytics, ads, widgets) loaded `async`/`defer` after content.
- [ ] **PF-07** CSS: inline critical CSS or keep one small render-blocking file; remove unused CSS.
- [ ] **PF-08** No layout shift: reserve space for images, ads, embeds, banners. Cookie banners must not push content down after load (overlay or reserved space).
- [ ] **PF-09** Mobile-first parity: the mobile page has the same content, links, structured data, and meta tags as the desktop page (Google indexes the mobile version).
- [ ] **PF-10** No intrusive full-page interstitials or popups on landing.

### 9.2 Security and trust headers (P1)

- [ ] **SE-01** `Strict-Transport-Security` (see R-07).
- [ ] **SE-02** `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` limited to what is used, `X-Frame-Options: SAMEORIGIN` (or CSP `frame-ancestors 'self'`).
- [ ] **SE-03** A Content-Security-Policy that does not break the site (start in report-only mode if unsure). It must allow the JSON-LD inline script (use a nonce or hash).
- [ ] **SE-04** Never expose API keys, `.env`, source maps with secrets, `.git`, or admin panels publicly. Check `https://sportsignal.ir/.env`, `/.git/config` return 404.
- [ ] **SE-05** If the site collects cookies/analytics, show a consent notice appropriate for the audience (owner confirms; do not block content behind it).

### 9.3 Hosting notes for a .ir domain (P0 awareness)

- [ ] **H-01** A `.ir` domain is a country-code domain, so Google treats it as targeting Iran and this cannot be changed in Search Console. If the owner wants a global (non-Iran) audience, a `.com` is a business decision to put in `OWNER_TODO.md` (not an agent task).
- [ ] **H-02** If the server is physically inside Iran, check from outside Iran that the site loads fast and reliably (Googlebot and AI crawlers crawl from abroad). Use Search Console "Crawl stats" and "URL Inspection → Test live URL" for real evidence. If slow or unreachable, recommend an edge/CDN or hosting outside Iran in `OWNER_TODO.md`.
- [ ] **H-03** Some Google tools can be restricted for traffic coming from Iran. If the owner cannot reach them, list the workaround as "use a connection outside Iran for Search Console/Bing tools" in `OWNER_TODO.md` (no illegal or risky advice; just the neutral note).
- [ ] **H-04** If the site is Persian, text hygiene (P1): use Persian letters ی and ک (not Arabic ي and ك), use ZWNJ (نیم‌فاصله) correctly, pick one digit style consistently (Persian or Latin) and keep search/index fields normalized so both spellings match.

---

## 10. PHASE 5 — Social sharing, previews (P1)

- [ ] **SO-01** Open Graph on all indexable pages: `og:type` (`website`), `og:site_name`, `og:title`, `og:description`, `og:url` (= canonical), `og:locale` (`fa_IR` or `en_US`), `og:image`, `og:image:width`, `og:image:height`, `og:image:alt`.
- [ ] **SO-02** Twitter/X: `twitter:card` = `summary_large_image`, `twitter:title`, `twitter:description`, `twitter:image` (and `twitter:image:alt`).
- [ ] **SO-03** Share image 1200x630 PNG/JPG under 1 MB, absolute https URL, publicly crawlable (not blocked by robots.txt, not behind a firewall).
- [ ] **SO-04 (P2)** Auto-generate a per-match share image at build/request time (team names, competition, date, time; clean typography, SportSignal logo). Cache it. Fall back to `OG_DEFAULT_IMAGE`. Do not use team or league crests/logos or photos unless the owner confirms a licence; default to text and colours only.
- [ ] **SO-05 (P1)** Test that links preview correctly in messaging apps the audience uses (Telegram, WhatsApp, X) after deploy.

---

## 11. Multi-language handling (only if the site has or gets more than one language) (P1)

- Each language has its own URL space (`/fa/…` and `/en/…`, or separate subdomains). No language switching by cookie or IP only.
- Every language version has a self-referencing canonical (not pointing to another language).
- hreflang: reciprocal `<link rel="alternate" hreflang="fa-IR" href="…">` / `hreflang="en"` plus `x-default` on every version, matching the sitemap.
- No automatic redirect based on IP or `Accept-Language` that prevents crawlers or users from reaching a version. A visible language switcher with normal links is enough.
- Slugs stay Latin in both languages; titles, descriptions, headings, and body text are fully translated (no mixed-language pages).

If the site is single-language, set `lang` and `og:locale` correctly and skip hreflang.

---

## 12. PHASE 7 — AI / GEO layer ("appear in AI recommendations")

### 12.1 Reality check (put in the report)

Google's published guidance (May 2026) says AI Overviews and AI Mode build on normal Search ranking and quality systems, and that no special markup or "AI file" is required. Other assistants (ChatGPT search, Claude, Perplexity, Copilot) use their own crawlers and indexes and are reported to rely partly on web search indexes such as Bing's. So the strategy is: (1) be crawlable by all of them without JavaScript, (2) be factual, fresh, and easy to quote, (3) be a recognizable, trustworthy source, (4) be present in Google and Bing indexes.

### 12.2 AI crawler policy in robots.txt (P0)

- [ ] **G-01** Implement the toggles from Section 0 as follows (user-agent names current as of Oct 2026; re-check vendor docs before finalizing):

| Group | User-agents | Default |
|---|---|---|
| AI search crawlers (power citations in AI answers) | `OAI-SearchBot`, `Claude-SearchBot`, `PerplexityBot`, `DuckAssistBot` | Allow (`ALLOW_AI_SEARCH_BOTS=true`) |
| AI user-triggered fetchers (a person asked about a page) | `ChatGPT-User`, `Claude-User`, `Perplexity-User` | Allow (`ALLOW_AI_USER_BOTS=true`) |
| AI training crawlers | `GPTBot`, `ClaudeBot`, `Google-Extended`, `Applebot-Extended`, `CCBot`, `meta-externalagent`, `Amazonbot` | Allow (`ALLOW_AI_TRAINING_BOTS=true`) |
| Classic search | `Googlebot`, `Bingbot`, `Applebot`, `YandexBot` | Always allow |

- If a toggle is `true`, you do not need a separate group (the default `User-agent: *` group already allows them). If a toggle is `false`, add a group `User-agent: <name>` with `Disallow: /` for that set.
- `Google-Extended` is only a robots.txt control token for Gemini training/grounding use; Googlebot does the crawling. Blocking it does not remove the site from Google Search.
- Keep AI user fetchers allowed even when training bots are blocked, so people asking an assistant about a SportSignal page can still get it read.
- [ ] **G-02 (P1)** Verify after deployment that none of these agents gets 403/429/JS-challenge from the CDN/WAF: use the curl tests in Appendix F. Note that curl only tests user-agent rules; IP-based blocks show up only in Search Console live tests, so put that check in `OWNER_TODO.md`.

### 12.3 Content that AI systems can quote (P0/P1)

- [ ] **G-03 (P0)** Answer-first block at the top of every match page and every time hub (see 7.4 item 2). Plain sentences, all key facts, absolute date, time with timezone name.
- [ ] **G-04 (P0)** Absolute dates and times everywhere. Relative words ("tonight", "tomorrow") may be added next to an absolute date, never instead of it.
- [ ] **G-05 (P1)** Consistent entity names. Keep one canonical name per team/competition/venue in the data model plus a list of aliases (English, Persian, common short names, for example "Barça"). Show the main name in headings and the alias naturally once in text; also put it in schema `alternateName`. Never alternate spellings randomly.
- [ ] **G-06 (P1)** Freshness signals: visible "Last updated" with `<time datetime>`, schema `dateModified`, sitemap `lastmod`, HTTP `Last-Modified`. All four agree.
- [ ] **G-07 (P1)** Source attribution: "Data source: {DATA_SOURCE_NAME}" on match and hub pages, linking to the source when the licence allows. The owner must confirm the data licence (OWNER_TODO).
- [ ] **G-08 (P1)** `/methodology` explains what "big match" means in concrete criteria, so the site has a unique, citable point of view (the "signal"). Each match page shows its own reason (7.4 item 4) from real data.
- [ ] **G-09 (P1)** Identity and trust: About, Contact, editorial/correction policy (inside methodology), consistent brand name and logo everywhere, `Organization.sameAs` pointing to real profiles the owner controls.
- [ ] **G-10 (P2)** Machine-readable endpoints (F-11 to F-13), described on `/data` in plain text. These help assistants with browsing/tools fetch accurate fixtures.
- [ ] **G-11 (P2)** Images and video: Google says AI features can use them. Provide useful, original images (for example the generated match card), with alt text and descriptive filenames. No stock-photo filler.
- [ ] **G-12 (P2)** Bing readiness: Bing Webmaster Tools verified, sitemap submitted, IndexNow active (F-16). Brave and DuckDuckGo are reached through standard crawling; nothing special is needed.

### 12.4 What NOT to do for AI (P0)

- Do not generate hundreds of near-duplicate Q&A pages ("when is X vs Y" × every variation) to manipulate AI answers. Google treats this as spam.
- Do not "chunk" pages into tiny fragments or rewrite content in a special style for AI.
- Do not hide text for bots, use white-on-white text, or inject keywords in comments/alt text.
- Do not publish AI-generated filler without real data behind it.
- Do not rely on `llms.txt` as a strategy.
- Do not add a fake "author" with invented credentials.

### 12.5 Measuring AI visibility (P1)

- [ ] **G-13** Analytics: create a "AI assistants" referral group for referrers such as `chatgpt.com`, `chat.openai.com`, `perplexity.ai`, `claude.ai`, `gemini.google.com`, `copilot.microsoft.com`, `you.com`, `duckduckgo.com` (if an analytics tool is installed or approved).
- [ ] **G-14** Create `docs/ai-visibility-prompts.md` with 20 test prompts (in the site language and English), for example "When is the next Real Madrid vs Barcelona match?", "Big football matches this weekend", "{Team} next match date and time". Instructions for the owner to run them monthly in Google (AI Mode/AI Overviews), ChatGPT search, Perplexity, Claude, Gemini, Copilot, and log: cited? correct? Include a results table template.
- [ ] **G-15** In Google Search Console, if the account shows a "Generative AI" performance report or a "Search generative AI" setting (rolling out in 2026), make sure the site is NOT opted out and use the report. Put this in `OWNER_TODO.md`.

---

## 13. Search Console, Bing, and verification setup (owner + agent)

Agent tasks (P1):

- [ ] **V-01** Add support for verification without breaking anything: prefer the DNS TXT method (owner does it); if the owner chooses the HTML tag or file method, add the tag/file the owner provides. Never invent verification codes.
- [ ] **V-02** Make sure the sitemap URL and robots.txt are reachable, so the owner can submit them immediately.

Owner tasks go into `OWNER_TODO.md` with click-by-click plain steps (see Section 17).

---

## 14. Accessibility (supports parsing and quality) (P1)

- [ ] **A-01** Sufficient colour contrast (WCAG AA), visible focus states, keyboard-operable navigation.
- [ ] **A-02** Data tables use `<th scope>` and `<caption>`; lists use list tags; buttons are `<button>`, links are `<a>`.
- [ ] **A-03** `lang` attribute on any text in another language (for example an English team name inside Persian text may carry `lang="en"`).
- [ ] **A-04** Skip-to-content link; ARIA only where native HTML is not enough.

---

## 15. PHASE 8 — Automation and tests

Create `scripts/seo-check` (Node or Python, whichever the project uses) with a **CONFIGURATION BLOCK at the very top** (base URL, sample counts, thresholds, sitemap URL). Complete and runnable. It must:

- [ ] **T-01** Fetch `robots.txt`; fail if missing, if it blocks `/`, if it lacks the `Sitemap:` line, or if any AI toggle in config disagrees with the file.
- [ ] **T-02** Fetch the sitemap index and all child sitemaps; fail on invalid XML, > 50,000 URLs per file, non-https, wrong host, duplicate URLs, or missing `lastmod`.
- [ ] **T-03** For every sitemap URL (or a random sample of N plus all templates): HTTP 200; no redirect; response has no `noindex` (meta or header); canonical equals the URL; exactly one `<h1>`; unique `<title>` (flag duplicates and > 65 chars); meta description present and unique; `lang`/`dir` set; viewport present; OG/Twitter tags present; images have `alt`; at least 3 internal links; text content present with JavaScript disabled (raw HTML test).
- [ ] **T-04** Extract JSON-LD, parse it, assert required `SportsEvent` fields (S-01), valid ISO 8601 dates with offset, `eventStatus` valid, and that the visible team names, date, and venue also appear in the page text (consistency check).
- [ ] **T-05** Crawl internal links from home to depth 3; fail on any 404/5xx/redirect-chain, and on sitemap URLs with zero inbound links.
- [ ] **T-06** Check that an invented URL returns a true 404.
- [ ] **T-07** Check redirects: http→https, www→apex, uppercase→lowercase, trailing slash policy; each exactly one hop.
- [ ] **T-08** hreflang reciprocity check (only if multi-language).
- [ ] **T-09** Run Lighthouse CI (mobile) against home, a match page, a team page; fail below the thresholds in Section 1.
- [ ] **T-10** Production guard: fail the deploy if production HTML contains `noindex` or if a non-production environment lacks it (R-13).
- [ ] **T-11** After deploy: send changed URLs to IndexNow (F-16) and fetch `robots.txt` to confirm it is served as intended.
- [ ] **T-12** Schedule it (CI on every deploy, plus a daily run if the host supports cron). Output a plain-language summary: PASS/FAIL per check and the first 10 failing URLs.
- [ ] **T-13 (P1)** Data pipeline test: when a match's time, status, or venue changes in the data source, verify the page, JSON-LD, sitemap `lastmod`, and cache all update within the configured delay.

---

## 16. Anti-patterns (the agent must never do these)

1. Cloaking: different content for bots and people, or user-agent-based dynamic rendering.
2. Hidden text, keyword stuffing, doorway pages, scraped or auto-spun content, fake reviews/ratings/authors.
3. Blocking CSS, JS, images, or APIs needed to render in robots.txt.
4. Using `noindex` together with a robots.txt `Disallow` for the same URL.
5. Canonical tags pointing to a different page "to consolidate" without real duplication; canonical pointing to a redirected or noindex URL.
6. Hash-based routing for content pages; infinite scroll with no crawlable links; content only after a click.
7. Soft 404s (200 status with "not found" text) and redirecting every unknown URL to home.
8. Automatic IP/language redirects that stop crawlers from reaching content.
9. Putting everything behind a cookie wall, login, or JS challenge.
10. Dishonest `lastmod`, or sitemaps listing non-canonical URLs.
11. Using Google's Indexing API for normal pages; buying links; link-exchange schemes; comment spam.
12. Marking up content that is not visible, or markup for features you do not offer.
13. Adding `nosnippet` or `data-nosnippet` to core content.
14. Mass-producing "when is X vs Y" Q&A pages for AI manipulation.
15. Using team crests, league logos, or press photos without a licence.
16. Submitting HSTS preload without owner approval.

---

## 17. OWNER_TODO.md (agent must create this file in plain language)

Include these items, adapted to what the audit found, each with click-by-click steps and what success looks like:

1. **Google Search Console**: add property type "Domain" for `sportsignal.ir`, verify with the DNS TXT record at the domain registrar, submit `https://sportsignal.ir/sitemap.xml`, use URL Inspection → "Request indexing" for the home page, one match page, one team page. After 3–7 days check Indexing → Pages; after 2–4 weeks check Performance. Check Settings for any "Search generative AI" option and leave inclusion on.
2. **Bing Webmaster Tools**: sign in, import the site from Search Console (or verify), submit the sitemap, confirm IndexNow shows activity.
3. **Cloudflare/host dashboard checks** (if used): turn off any setting that blocks AI search bots or Googlebot; check "managed robots.txt" does not override yours; confirm no country blocks apply to crawlers.
4. **Contact/identity**: provide CONTACT_EMAIL, About text (who runs it), logo (square, 512x512), social profile URLs; create profiles with the same name "SportSignal" (X, Instagram, Telegram channel, LinkedIn page, YouTube if relevant) and link back to the site from each.
5. **Licences**: confirm you may display the match data you use and whether attribution is required; confirm you may use any crests/logos (default: none).
6. **Legal pages**: review Privacy and Terms text.
7. **Backlinks and mentions (the part no code can do)**: share the site in Persian/English football communities and Telegram channels, ask football bloggers and sports sites to link to the matches page, publish a weekly "big matches this week" post on social media with a link to `/matches/this-week`. Quality links from real sites matter; never buy links.
8. **Daily freshness**: keep the data updating automatically; broken or stale data hurts both Google and AI trust.
9. **Domain/market decision**: if you want a global audience, consider a non-Iran domain (explain the trade-off in two sentences).
10. **Monthly**: run the AI visibility prompts (`docs/ai-visibility-prompts.md`), check Search Console Pages and Core Web Vitals, and send the results to the agent for fixes.

---

## 18. Deliverables and final report

The agent must deliver:

1. All code changes, in small commits per phase.
2. `SEO_AUDIT.md` (Phase 0 findings, gap list, stack decision with reasoning).
3. `SEO_IMPLEMENTATION_REPORT.md` containing: a checklist of every requirement ID with status (Done / Partial / Skipped + reason); files changed; before/after Lighthouse numbers; the output of `scripts/seo-check`; Rich Results Test and Schema Validator results for 3 sample URLs; assumptions made; known risks; "what the owner must do next".
4. `OWNER_TODO.md` (Section 17).
5. `docs/ai-visibility-prompts.md` (G-14).
6. `scripts/seo-check` (T-01 to T-13) and the CI/cron hook.

**Definition of done:** every P0 and P1 item is Done or has a written, justified exception; `scripts/seo-check` passes against production; the report lists no unexplained gaps.

---

# APPENDICES

## Appendix A — robots.txt template (generate from config; example with all toggles = true)

```
# SportSignal robots.txt
User-agent: *
Allow: /
Disallow: /admin
Disallow: /login
Disallow: /search
Disallow: /api/
# (remove the /api/ line if pages need the API to render)

Sitemap: https://sportsignal.ir/sitemap.xml
```

If `ALLOW_AI_TRAINING_BOTS=false`, append (repeat any shared Disallow lines inside each group if you add specific Disallow rules):

```
User-agent: GPTBot
User-agent: ClaudeBot
User-agent: Google-Extended
User-agent: Applebot-Extended
User-agent: CCBot
User-agent: meta-externalagent
User-agent: Amazonbot
Disallow: /
```

If `ALLOW_AI_SEARCH_BOTS=false`, a group with `OAI-SearchBot`, `Claude-SearchBot`, `PerplexityBot`, `DuckAssistBot` and `Disallow: /`. If `ALLOW_AI_USER_BOTS=false`, a group with `ChatGPT-User`, `Claude-User`, `Perplexity-User` and `Disallow: /`.

## Appendix B — `<head>` template

```html
<!doctype html>
<html lang="fa" dir="rtl"> <!-- or lang="en" dir="ltr" -->
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{unique title}</title>
  <meta name="description" content="{unique description}">
  <link rel="canonical" href="https://sportsignal.ir{clean-path}">
  <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1">

  <link rel="icon" href="/favicon.ico" sizes="48x48">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="apple-touch-icon" href="/apple-touch-icon.png">
  <link rel="manifest" href="/manifest.webmanifest">
  <meta name="theme-color" content="{THEME_COLOR}">

  <meta property="og:type" content="website">
  <meta property="og:site_name" content="SportSignal">
  <meta property="og:title" content="{title}">
  <meta property="og:description" content="{description}">
  <meta property="og:url" content="https://sportsignal.ir{clean-path}">
  <meta property="og:locale" content="fa_IR">
  <meta property="og:image" content="https://sportsignal.ir/og/{id}.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="{alt}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="{title}">
  <meta name="twitter:description" content="{description}">
  <meta name="twitter:image" content="https://sportsignal.ir/og/{id}.png">

  <link rel="alternate" type="text/calendar" href="/calendar.ics" title="SportSignal calendar">
  <link rel="alternate" type="application/atom+xml" href="/feed.xml" title="SportSignal updates">

  <script type="application/ld+json">{ ...JSON-LD... }</script>
</head>
```

## Appendix C — JSON-LD example for a match page (illustrative data; replace with real data)

```json
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://sportsignal.ir/#organization",
      "name": "SportSignal",
      "url": "https://sportsignal.ir/",
      "logo": { "@type": "ImageObject", "url": "https://sportsignal.ir/logo-512.png", "width": 512, "height": 512 },
      "sameAs": []
    },
    {
      "@type": "WebSite",
      "@id": "https://sportsignal.ir/#website",
      "url": "https://sportsignal.ir/",
      "name": "SportSignal",
      "inLanguage": "fa-IR",
      "publisher": { "@id": "https://sportsignal.ir/#organization" }
    },
    {
      "@type": "SportsEvent",
      "@id": "https://sportsignal.ir/matches/example-fc-vs-sample-united-2026-11-08#event",
      "name": "Example FC vs Sample United",
      "description": "Example FC host Sample United in the Example League on 8 November 2026 at 21:00 (CET) at Example Stadium, Example City.",
      "url": "https://sportsignal.ir/matches/example-fc-vs-sample-united-2026-11-08",
      "sport": "Football",
      "startDate": "2026-11-08T21:00:00+01:00",
      "eventStatus": "https://schema.org/EventScheduled",
      "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",
      "location": {
        "@type": "StadiumOrArena",
        "name": "Example Stadium",
        "address": { "@type": "PostalAddress", "addressLocality": "Example City", "addressCountry": "ES" }
      },
      "homeTeam": { "@type": "SportsTeam", "name": "Example FC", "sport": "Football", "url": "https://sportsignal.ir/teams/example-fc" },
      "awayTeam": { "@type": "SportsTeam", "name": "Sample United", "sport": "Football", "url": "https://sportsignal.ir/teams/sample-united" },
      "organizer": { "@type": "SportsOrganization", "name": "Example League", "url": "https://sportsignal.ir/competitions/example-league" },
      "image": ["https://sportsignal.ir/og/example-fc-vs-sample-united-2026-11-08.png"],
      "mainEntityOfPage": "https://sportsignal.ir/matches/example-fc-vs-sample-united-2026-11-08"
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://sportsignal.ir/" },
        { "@type": "ListItem", "position": 2, "name": "Example League", "item": "https://sportsignal.ir/competitions/example-league" },
        { "@type": "ListItem", "position": 3, "name": "Example FC vs Sample United" }
      ]
    }
  ]
}
```

For a postponed match change `eventStatus` to `https://schema.org/EventPostponed`; for a new date use `EventRescheduled` plus `previousStartDate`; for cancelled use `EventCancelled`. Do not add `endDate`, `offers`, or ratings unless real data exists.

## Appendix D — sitemap examples

Index:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap><loc>https://sportsignal.ir/sitemaps/pages.xml</loc><lastmod>2026-10-10T08:00:00+00:00</lastmod></sitemap>
  <sitemap><loc>https://sportsignal.ir/sitemaps/matches-upcoming.xml</loc><lastmod>2026-10-10T08:00:00+00:00</lastmod></sitemap>
</sitemapindex>
```

Child:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://sportsignal.ir/matches/example-fc-vs-sample-united-2026-11-08</loc>
    <lastmod>2026-10-10T07:42:00+00:00</lastmod>
  </url>
</urlset>
```

## Appendix E — redirect and header requirements (translate to the actual host: nginx, Apache, Cloudflare rules, Next.js config, Worker code)

- `http://*` → `https://sportsignal.ir/$path` (301)
- `https://www.sportsignal.ir/*` → `https://sportsignal.ir/$path` (301)
- Uppercase path → lowercase path (301); trailing slash → no trailing slash (301, except `/`)
- Old URLs of renamed routes → new URLs (301, permanent)
- Headers on HTML: `Content-Type: text/html; charset=utf-8`, `Cache-Control` per PF-01, `ETag`, `Link: <https://sportsignal.ir/…>; rel="canonical"` optional, security headers per SE-01 to SE-03
- Headers on non-production: `X-Robots-Tag: noindex, nofollow`

## Appendix F — verification commands

```bash
# 1. Content visible without JavaScript (must show team names and an <h1>)
curl -s https://sportsignal.ir/matches/<some-slug> | grep -i -E "<h1|application/ld\+json|<title"

# 2. Status codes
curl -sI https://sportsignal.ir/ | head -n 1                       # expect 200
curl -sI https://sportsignal.ir/this-page-should-not-exist | head -n 1   # expect 404
curl -sI http://sportsignal.ir/ | grep -i -E "^HTTP|^location"      # expect 301 -> https://sportsignal.ir/
curl -sI https://www.sportsignal.ir/ | grep -i -E "^HTTP|^location" # expect 301 -> https://sportsignal.ir/

# 3. Crawl files
curl -s https://sportsignal.ir/robots.txt
curl -s https://sportsignal.ir/sitemap.xml | head -n 20

# 4. Bots not blocked by user-agent rules (expect 200, never 403/429/503 challenge pages)
for UA in "Googlebot/2.1 (+http://www.google.com/bot.html)" "bingbot/2.0" "OAI-SearchBot" "ChatGPT-User" "Claude-SearchBot" "Claude-User" "PerplexityBot" "Perplexity-User"; do
  echo "$UA -> $(curl -s -o /dev/null -w '%{http_code}' -A "$UA" https://sportsignal.ir/)"
done

# 5. Sensitive files must not be public (expect 404)
curl -sI https://sportsignal.ir/.env | head -n 1
curl -sI https://sportsignal.ir/.git/config | head -n 1
```

Note: step 4 proves only user-agent rules. IP-based blocks are only visible through Google Search Console "URL Inspection → Test live URL" and Bing Webmaster Tools "URL Inspection" (owner task).

External validators to run on sample pages: Google Rich Results Test (`https://search.google.com/test/rich-results`), Schema Markup Validator (`https://validator.schema.org`), PageSpeed Insights / Lighthouse, Google Search Console URL Inspection.

## Appendix G — Reference documentation the agent should consult (current versions)

- Google Search Central: SEO Starter Guide; robots.txt intro; Sitemaps overview; Canonicalization; Redirects; HTTP status codes; JavaScript SEO basics; Structured data general guidelines; Event structured data (`developers.google.com/search/docs/appearance/structured-data/event`); AI features and your website (generative AI optimization guide, May 2026); Core Web Vitals (web.dev/vitals); Page experience; Spam policies; Localized versions (hreflang).
- Schema.org: SportsEvent, SportsTeam, SportsOrganization, StadiumOrArena, EventStatusType.
- IndexNow documentation (`indexnow.org`).
- Vendor crawler docs: OpenAI (OAI-SearchBot, GPTBot, ChatGPT-User), Anthropic (ClaudeBot, Claude-SearchBot, Claude-User), Perplexity (PerplexityBot, Perplexity-User), Google (Google-Extended), Apple (Applebot, Applebot-Extended), Bing Webmaster guidelines.

If any reference conflicts with this spec, follow the current official documentation, apply the safest option, and record the conflict in the report.

*End of spec.*
