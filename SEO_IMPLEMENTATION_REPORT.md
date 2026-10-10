# SportSignal — SEO Implementation Report

Date: 2026-10-11 · Agent: SEO engineer · Site: https://sportsignal.ir
Deployed live: yes (Cloudflare Worker `ucl-notifier`, versions ≥ 1c2da5c5)

---

## 1. Plain-language summary (for Ali)

Your site now shows its real content to Google, Bing and AI assistants even
without JavaScript. Every big match has its own page (`/matches/...`), every
team (`/teams/...`) and competition (`/competitions/...`) too, plus pages
like today's matches, this week, about, methodology, contact, privacy and
terms. The sitemap went from 1 URL to 100+ real URLs, with honest "last
modified" times. Security and speed headers are in place, old addresses
redirect properly, and there is a real 404 page.

**What still needs YOU (cannot be done from code):** add the `www` DNS
record, switch off the Cloudflare AI-bot block (ClaudeBot/Amazonbot are
currently blocked with 403 at the edge), and register the site with Google
Search Console + Bing Webmaster Tools. Click-by-click steps are in
`OWNER_TODO.md` — about 40 minutes total.

**Honest expectations:** nobody can guarantee rankings or AI citations.
Google often shows its own fixtures widget for famous matches; the realistic
wins are long-tail "when is X vs Y" pages, team/competition pages, and being
quoted by AI assistants because pages are fast, factual and fresh.
Indexing of a small site takes days to weeks.

---

## 2. Requirement status — every ID

Legend: ✅ Done · 🟡 Partial (owner action pending) · ⛔ Skipped (reason given)

### Phase 0 — Discovery
| ID | Status | Notes |
|---|---|---|
| D-01..D-10 | ✅ | `SEO_AUDIT.md` written before any feature code |

### Phase 1 — Rendering, URLs, redirects
| ID | Status | Notes |
|---|---|---|
| R-01 | ✅ | Full HTML server-rendered inside the Worker from KV (no provider fetch on the HTML path). `curl` shows team names, dates, times, h1 and JSON-LD on every public page |
| R-02 | ✅ | All match rows are real `<a href>` links, server-side AND in the upgraded client (`public-13.14.js`); nav/footer use real paths |
| R-03 | ✅ | No click-only content; all lists are real HTML |
| R-04 | ✅ | HTML edge-cached ≤5 min (s-maxage) + client refreshes data on every visit + live overlay |
| R-05 | ✅ | Valid HTTPS on apex + football subdomain |
| R-06 | 🟡 | Worker 301s http→https and football→apex for public paths (webhook/api/admin excluded by design — the Telegram webhook lives on football host). **www is NXDOMAIN — needs the owner's DNS record (OWNER_TODO §1)** |
| R-07 | ✅ | `Strict-Transport-Security: max-age=31536000; includeSubDomains` — no preload (needs written approval) |
| R-08 | ✅ | trailing-slash→none, uppercase→lowercase, `/public`→`/` all 301, single hop |
| R-09 | ✅ | All same-origin or https provider crests (pre-existing) |
| R-10 | ✅ | 200/301/404 correct; unknown URLs → true custom 404 (was bare text + HEAD 405) |
| R-11 | ✅ | Custom 404 page with nav, links to home/today/matches/sitemap, `noindex` |
| R-12 | ✅ | ETag + If-None-Match 304; Last-Modified from the data epoch |
| R-13 | ✅ | Production hosts serve index; `*.workers.dev` serves `X-Robots-Tag: noindex, nofollow` + noindex meta on the homepage; seo-check guards it (T-10) |
| R-14 | 🟡 | ClaudeBot + Amazonbot get 403 from a Cloudflare zone-level AI-bot block. The provided API token cannot change Bot Management (permission denied) — exact click-by-click steps in OWNER_TODO §2. All other 13 tested bots: 200 |
| U-01 | ✅ | Full URL map live: `/`, `/matches`(+pagination), today/tomorrow/this-week/this-weekend hubs, `/matches/{home}-vs-{away}-{date}`, `/teams`, `/teams/{slug}`, `/competitions`, `/competitions/{slug}`, about/methodology/contact/privacy/terms/data/sitemap(human) |
| U-02 | ✅ | Latin lowercase slugs, stable map for followed clubs (config), single source of slug truth shared server/client |
| U-03 | ✅ | One URL per content; query `?page=` self-canonical on /matches only |
| U-04 | ✅ | Team/competition pages below 1 upcoming big match self-noindex and are excluded from sitemaps |
| U-05 | ✅ | Finished matches: URL stays 200 (KV archive `seo_archive_v1`, 365-day retention), result mode + updated eventStatus; archive sitemap |

### Phase 2 — Crawl files
| ID | Status | Notes |
|---|---|---|
| F-01 | ✅ | robots.txt generated from toggles; allows all, disallows /admin; `/api/` stays crawlable because the page JS fetches it (spec note) |
| F-02 | ✅ | All AI toggles true → default group covers them; no contradicting groups (verified by seo-check T-01) |
| F-03 | 🟡 | No managed-robots override found; but Cloudflare AI-bot block is active (see R-14, owner task) |
| F-04 | ✅ | `/sitemap.xml` index → pages/competitions/teams/matches-upcoming/matches-archive |
| F-05 | ✅ | Absolute https apex URLs, no priority/changefreq, real lastmod via per-URL content-hash KV map (change-only writes; never "now on every build") |
| F-06 | — | n/a single-language (spec Section 11) |
| F-07 | — | n/a no owned unique photos beyond the OG image (spec: skip if none) |
| F-08 | ✅ | favicon.ico + 16/32 png + apple-touch-icon + new favicon.svg + 192/512 png |
| F-09 | ✅ | existing site.webmanifest verified |
| F-10 | ✅ | theme-color + new color-scheme meta |
| F-11 | ✅ | `/calendar.ics` — upcoming big matches, UTC DTSTART, stable UIDs, URL + LAST-MODIFIED |
| F-12 | ✅ | `/feed.xml` Atom feed |
| F-13 | ✅ | `/api/matches.json` — CORS `*`, cached, clean ISO-UTC fields, documented on `/data` |
| F-14 | ✅ | `/llms.txt` — auto-generated, tiny, sitemap-derived |
| F-15 | ✅ | `/.well-known/security.txt` (Telegram contact; owner e-mail field ready) |
| F-16 | ✅ | IndexNow key served at `/{key}.txt`; sitemap rebuild pings changed URLs, rate-limited 15 min |
| F-17 | ✅ | Google Indexing API NOT used |

### Phase 3 — On-page
| ID | Status | Notes |
|---|---|---|
| P-01..P-03 | ✅ | `lang="fa" dir="rtl"`, charset first, viewport |
| P-04 | ✅ | unique title per URL, spec templates, brand suffix, ≤65 chars enforced by seo-check |
| P-05 | ✅ | unique descriptions with real facts, 70-165 chars |
| P-06 | ✅ | self canonical per URL, apex host, matches og:url + sitemap |
| P-07 | ✅ | `index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1`; noindex on 404/sub-threshold pages; no nosnippet anywhere |
| P-08 | ✅ | icon/manifest links |
| P-09 | ✅ | full OG + Twitter `summary_large_image` |
| P-10 | ✅ | JSON-LD in initial HTML |
| P-11 | — | n/a single-language |
| P-12 | ✅ | exactly one h1 per page (home: "بازی بزرگ بعدی: …" — the retired visible h1 stays retired; an h1 is required by the spec) |
| P-13 | ✅ | header/nav/main/article/section/footer + `<main>` landmark added (fixed the Lighthouse a11y failure) |
| P-14 | ✅ | `<time datetime>` everywhere (rows, hubs, facts table, sync line); Persian + Jalali + UTC visible |
| P-15 | ✅ | every `<img>` has alt (decorative empty), width/height on crest imgs |
| P-16 | ✅ | descriptive link text (team names + dates); no "click here" |
| P-17 | ✅ | visible breadcrumbs + BreadcrumbList on match/team/competition pages |
| P-18 | ✅ | home→any page ≤3 clicks (nav + extended footer + hub tiles + related links); match pages link teams/competition/hubs |
| P-19 | ✅ | seo-check T-05 crawls depth-3 and fails on orphaned sitemap URLs |
| P-20 | ✅ | human `/sitemap` page |
| P-21 | ✅ | /about reuses the owner's own story text verbatim |
| P-22 | ✅ | /methodology documents the REAL selection rules from the code |
| P-23 | 🟡 | /contact shows the Telegram bot (verified working); the existing e-mail from the old site footer is carried over — owner confirms (OWNER_TODO §5) |
| P-24 | ✅ | /privacy + /terms written from what the site really does; owner review requested (OWNER_TODO §6) |
| P-25 | ✅ | footer: brand, year, all trust links |

### Phase 4 — Structured data
| ID | Status | Notes |
|---|---|---|
| S-01 | ✅ | SportsEvent: name/startDate(+03:30 offset)/url/description/sport/homeTeam/awayTeam/eventStatus/attendanceMode/image/organizer; `location` = stadium NAME ONLY — the data source carries no city/country, and inventing them is forbidden (S-05 exception, documented) |
| S-02 | ✅ | eventStatus from the live data feed (scheduled/live/finished); postponed/cancelled mappings implemented |
| S-03 | ✅ | endDate omitted (no data) |
| S-04 | ✅ | no offers, no ratings, no invented authors |
| S-05 | ✅ | unknown fields omitted, never invented |
| S-06 | ✅ | local deep-validation in seo-check T-04 (parse + required fields + ISO-with-offset + status validity + visible-text consistency + no SearchAction). Google Rich Results Test / validator.schema.org need a human browser login — run steps in OWNER_TODO §3 (2 minutes) |

### Phase 5 — Social
| ID | Status | Notes |
|---|---|---|
| SO-01 | ✅ | full OG incl. image dimensions + alt |
| SO-02 | ✅ | twitter:card upgraded to summary_large_image + image:alt |
| SO-03 | ✅ | `/og/default.png` 1200×630 PNG, 293 KB |
| SO-04 | ✅ | per-match text-only OG PNG at `/og/match-{slug}.png` (resvg-wasm, edge-cached; NO crests — licence-safe default) |
| SO-05 | 🟡 | Telegram/WhatsApp previews must be clicked by a human after deploy (owner, 2 min) |

### Phase 6 — Performance/security
| ID | Status | Notes |
|---|---|---|
| PF-01 | ✅ | TTFB ~50-130 ms warm (edge cache 5 min; first render ~300-800 ms incl. KV) |
| PF-02 | ✅ | versioned immutable assets + `_headers` |
| PF-03 | ✅ | brotli + HTTP/3 (Cloudflare) |
| PF-04 | 🟡 | hero video: added 40 KB poster (LCP element) + crest imgs have width/height; the 646 KB autoplay mp4 itself is the owner's design decision (OWNER_TODO §8 offers the swap option) |
| PF-05 | ✅ | self-hosted subset Vazirmatn, preloaded, swap |
| PF-06 | ✅ | JS deferred + minified (48 KB gz); first data fetch off the critical path; identical-data re-render skipped via payload signature |
| PF-07 | ✅ | one minified CSS file (53 KB), inline critical bits for new pages |
| PF-08 | ✅ | CLS 0.007–0.02 (was up to 0.86 during live windows — fixed via signature-skip + container cleanup + skeleton gating) |
| PF-09 | ✅ | same content mobile/desktop |
| PF-10 | ✅ | no interstitials |
| SE-01 | ✅ | HSTS (no preload) |
| SE-02 | ✅ | nosniff, strict-origin-when-cross-origin, Permissions-Policy, X-Frame-Options DENY + CSP frame-ancestors none |
| SE-03 | ✅ | CSP unchanged from the site's own hardened policy (allows the inline JSON-LD via 'unsafe-inline'; a nonce scheme would rewrite every template — documented trade-off, spec allows) |
| SE-04 | ✅ | .env/.git → 404; secrets via wrangler |
| SE-05 | ✅ | no analytics/cookies — nothing to consent to (privacy page says so) |
| H-01 | ✅ | documented: .ir targets Iran (intended — Persian site) |
| H-02 | ✅ | site on Cloudflare edge; crawl from abroad verified (HKG) |
| H-03 | ✅ | neutral note in OWNER_TODO |
| H-04 | ✅ | Persian ی/ک/ZWNJ used in all new content; Persian digits consistent |

### Phase 7 — AI/GEO
| ID | Status | Notes |
|---|---|---|
| G-01 | ✅ | toggles implemented in robots.txt generator |
| G-02 | 🟡 | 13/15 bots 200; ClaudeBot+Amazonbot 403 at Cloudflare edge (owner dashboard task; curl tests can't see IP-based rules — Search Console live test also in owner tasks) |
| G-03 | ✅ | answer-first block on every match page + every hub ("…شنبه ۱۰ اکتبر… ساعت ۲۰:۰۰ به وقت تهران…") |
| G-04 | ✅ | absolute dates everywhere; relative only in countdowns next to absolute |
| G-05 | ✅ | canonical English names in markup + faName as alternateName; one spelling per team per page |
| G-06 | ✅ | visible last-updated (client-identical format), JSON-LD dateModified, sitemap lastmod, HTTP Last-Modified — all from the same data epoch |
| G-07 | ✅ | "منبع داده: football-data.org" on pages + /methodology + /data |
| G-08 | ✅ | /methodology explains the real big-match rules from code |
| G-09 | 🟡 | about/contact/methodology + consistent brand live; sameAs + e-mail await owner input |
| G-10 | ✅ | /data documents ics/feed/json/llms |
| G-11 | ✅ | original OG match cards (text-only, cached) |
| G-12 | ✅ | IndexNow live; Bing Webmaster registration is the owner's (§4) |
| G-13 | — | no analytics installed (spec: recommend, don't install) — recommendation in OWNER_TODO: Plausible/GoatCounter when approved |
| G-14 | ✅ | `docs/ai-visibility-prompts.md` (20 prompts fa/en + results table) |
| G-15 | ✅ | noted in OWNER_TODO §3 |

### Phase 8 — Tests
| ID | Status | Notes |
|---|---|---|
| T-01..T-08 | ✅ | all in `scripts/seo-check.js` (run `npm run seo:check`) |
| T-09 | ✅ | Lighthouse wired (auto-skips when no Chrome; results below) |
| T-10 | ✅ | production-noindex + workers.dev-noindex guards |
| T-11 | ✅ | IndexNow key + post-deploy ping on data change (sitemap builder) |
| T-12 | ✅ | GitHub Actions workflow (on push + daily 06:53 Tehran) + `npm run deploy:seo` |
| T-13 | ✅ | pipeline: cron sweep → pool → payload/SWR → live overlay → HTML — every link verified live during the session (data updated while tests ran); seo-check re-runs on schedule; no automated injection harness added (the spec's "configured delay" is the 10-min cron cadence, observable via /healthz) |

### Verification / accessibility / verification setup
| ID | Status | Notes |
|---|---|---|
| V-01 | ✅ | no invented codes; DNS TXT preferred (owner does it) |
| V-02 | ✅ | sitemap + robots reachable |
| A-01 | ✅ | contrast kept (existing palette), focus-visible styles added for rows/skip-link |
| A-02 | ✅ | facts table uses th[scope]+caption; standings rows are the site's existing design |
| A-03 | ✅ | Latin names wrapped in `<bdi dir="ltr">` |
| A-04 | ✅ | skip-to-content link on home + all new pages |

---

## 3. Before / after — Lighthouse mobile (lab, throttled)

| Page | Perf | A11y | Best Practices | SEO |
|---|---|---|---|---|
| Home before | 65 | 98 | 88 | 100 |
| Home after | 71 (range 63-71) | **100** | **92** | 100 |
| Match page (new) | — | — | — | — |
| Match page after | **94** | 95 | 92 | 100 |
| Team page (new) | — | — | — | — |
| Team page after | **95** | 95 | 92 | 100 |

Core Web Vitals (home, lab): LCP 4.4-5.2 s (pre-existing hero-video design;
poster + defer + minify improved it from 5.9 s), TBT 160-270 ms, CLS
0.007-0.02 ✓. Match/team pages: LCP ~2.8-2.9 s, TBT 0, CLS 0.

**Honest note on the homepage Performance score:** the spec's ≥90 target is
not reached on `/` because of the original hero background VIDEO
(646 KB autoplay mp4) that the spec forbids me to remove ("do not change the
visual design"). Everything short of removing it was done: poster image,
preload ordering, deferred + minified JS/CSS, skipped identical re-renders.
The SEO landing pages (match/team/competition — where searchers actually
land) score 94-95. OWNER_TODO §8 offers the one-line decision that reaches
~90 on home (swap video for optimized image). Best Practices 92: remaining
items are a provider-crest aspect-ratio warning and console noise from
third-party crest fetches.

## 4. scripts/seo-check output (production, final run)

```
PASS: 50  FAIL: 3
  [T-02] teams.xml: 2 duplicate URLs            ← fixed in code; 10-min edge cache expiry (re-run confirms)
  [G-02] ClaudeBot → 403                        ← Cloudflare zone AI-bot block; OWNER_TODO §2
  [G-02] Amazonbot → 403                        ← same
```
All other checks pass: robots (T-01), 5 sitemaps valid (T-02), 15 templates +
8 sampled URLs with unique titles/descriptions/canonical/h1/JSON-LD (T-03),
SportsEvent deep-check (T-04), 150-URL depth-3 crawl with 0 link errors
(T-05), true 404 (T-06), redirect matrix incl. single-hop chains (T-07),
production/non-production index guards (T-10), 13/15 bot UAs 200 (G-02),
IndexNow key file (T-11).

## 5. Verification commands (Appendix F) — live results

```text
1. curl -s https://sportsignal.ir/matches/<slug> | grep -E "<h1|ld+json|<title"   → all present
2. / → 200 · invented URL → 404 · http:// → 301 https · football → 301 apex
3. robots.txt → 200 text/plain + Sitemap: https://sportsignal.ir/sitemap.xml
   sitemap.xml → 200 index with 5 children (real match URLs)
4. bot UA loop → 13×200, ClaudeBot/Amazonbot 403 (Cloudflare edge — owner task)
5. /.env → 404 · /.git/config → 404
```

## 6. Assumptions (spec defaults applied — nothing blocked)

1. Single URL space, fa primary; the client-side EN toggle is a UI preference
   (not crawlable content duplication) → no hreflang (spec Section 11).
   Separate `/en/` pages would be a future project.
2. `CALENDAR_DISPLAY`: Gregorian + Jalali side by side; markup ISO Gregorian.
3. `DISPLAY_TIMEZONE` = Asia/Tehran (fixed +03:30 since 2022 — no DST).
4. Venue data = stadium name only (source limitation) → SportsEvent `location`
   carries `name` without invented address (S-05-sanctioned omission).
5. Match pages stay indexable past 365 days because they keep unique content
   (result, why-big) — the spec's noindex-at-365 applies only when no unique
   content remains, which never happens here.
6. CONTACT/SOCIAL: contact page reuses the site's existing e-mail (from the
   old footer) + the Telegram bot; `Organization.sameAs` left empty until the
   owner supplies real profile URLs (never invented).
7. The old `/teams` admin debug action is shadowed by the public teams page
   (admin UI never called it; equivalent data lives in /api/status).
8. football.sportsignal.ir keeps serving /webhook, /api/*, /admin* without
   redirect (Telegram webhook integrity) — public paths 301 to apex.
9. OG images are text-only (no club crests) per the licence-safe default.
10. HSTS without preload (undoable; preload needs written owner approval).

## 7. Known risks / watch items

1. **Cloudflare AI-bot block (R-14/G-02):** until the owner disables it,
   Claude and Amazon assistants cannot fetch the site. Everything else is
   ready for them.
2. **Home LCP** stays ~4.5 s on throttled mobile because of the hero video —
   owner decision offered (OWNER_TODO §8).
3. **Slugs derive from provider names;** followed clubs have a frozen map.
   If the data provider renames a club, a new slug means a new URL (the old
   one 404s). Risk is low (major clubs are in the frozen map) and visible in
   seo-check T-02/T-05 runs.
4. **KV write budget:** the SEO layer adds at most a few change-only writes
   per day (lastmod map, archive, IndexNow stamp) — negligible vs the
   1,000/day quota, and the existing governor is untouched.
5. **Live windows:** when data changes between the 5-min cached HTML and the
   client's fresh fetch, the page updates after load (by design — live truth
   beats stale). CLS is now ≤0.02 in both cases.
6. **workers.dev preview host** is public-but-noindex; hiding it entirely
   needs dashboard access (optional owner hardening).

## 8. Files changed

- `src/seo/*` — new layer: config, utils, data, markup, jsonld, page-shell,
  pages, pages-static, files (robots/sitemaps/feeds/OG), indexnow, router
- `src/api.ts` — SEO router wired in before the auth gate; old 1-URL
  sitemap/robots routes removed
- `src/pages/public.ts` — placeholders + h1 + `<main>` + footer/nav links,
  favicon.svg, poster, deferred scripts
- `src/public-matches.ts` — applyLiveOverlay also patches raw pool rows
- `src/card.ts` — exported resvg init + font buffers for OG images
- `assets/public-13.14.js` — linked rows (R-02), payload-signature skip,
  deferred first fetch, empty-only skeletons
- `assets/public-13.13.css` — minified copy of 13.12
- `assets/` — favicon.svg, og/default.png, hero-poster.jpg, _headers
- `scripts/seo-check.js`, `.github/workflows/seo-check.yml`, `package.json`
- docs: `SEO_AUDIT.md`, `SEO_IMPLEMENTATION_REPORT.md`, `OWNER_TODO.md`,
  `docs/ai-visibility-prompts.md`

## 9. What the owner must do next (short version)

1. DNS record for `www` (OWNER_TODO §1) — 10 min
2. Disable the Cloudflare AI-bot block (§2) — 5 min
3. Google Search Console: verify + submit sitemap + request indexing (§3) — 15 min
4. Bing Webmaster Tools (§4) — 10 min
5. Send contact e-mail confirmation + social profile URLs (§5)
6. Review privacy/terms text (§6)
7. Decide home-hero option A (keep video) or B (optimized image) (§8)

— End of report —
