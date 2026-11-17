# GSC Monitoring View — SportSignal

> Agents: read AGENTS.md in the repo root first, and follow it for this whole task.

SEO Program Session 14 deliverable (route plan §10 + the phase file
`SESSION-14-PERFORMANCE-GSC-AND-OPTIONAL-GA4.md`). This is a DOCUMENTATION
deliverable — a per-page-class GSC monitoring view (the URL-pattern × the
clicks/impressions/CTR/position + the page-class performance over time) +
the monitoring cadence + the GSC report URL/filter set the owner should
check. No dashboard tool is built — a markdown report + the GSC filter
instructions is sufficient (the phase file's item 5).

## 1. The baseline (the 2026-11-15 GSC export — 16-month window)

The baseline is the existing GSC export
(`sportsignal-seo-implementation/reference/sportsignal.ir-GSC-11-15.zip`
→ `Pages.csv`, `Devices.csv`, `Countries.csv`). The window is the 16-month
GSC retention (the default "Last 16 months" filter — Jan 2025 → Nov 15
2026). The export is the program's top evidence request; a FRESH export
(ideally 16 months, with URL-level page samples + the queries×pages matrix
+ the enhancement/Critical-issues CSVs + the Core Web Vitals report) remains
the standing request for the post-Dec-8 sessions.

### 1.1 The page-class aggregation (the 2026-11-15 Pages.csv — 412 URLs)

| Page class | URL pattern | Clicks | Impressions | URLs | Avg position |
|---|---|---:|---:|---:|---:|
| Match detail | `/matches/<slug>-<date>` | 192 | 6,356 | 262 | 8.3 |
| Date hub — tomorrow | `/matches/tomorrow` | 18 | 218 | 1 | 6.7 |
| Homepage | `/` | 8 | 267 | 1 | 9.1 |
| Team detail | `/teams/<slug>` | 16 | 2,456 | 127 | 8.0 |
| Competition detail | `/competitions/<slug>` | 6 | 161 | 6 | 7.3 |
| Matches hub | `/matches` | 3 | 100 | 1 | 5.8 |
| Matches pagination | `/matches?page=N` | 3 | 32 | 2 | 4.8 |
| Date hub — today | `/matches/today` | 2 | 26 | 1 | 7.6 |
| Teams index | `/teams` | 0 | 24 | 1 | 5.5 |
| Competitions index | `/competitions` | 0 | 10 | 1 | 4.7 |
| **Total (site)** | | **250** | **9,465** | **412** | **8.4** |

Note: the `/matches/tomorrow` + `/matches/today` date-hub URLs are NOT match-
detail pages (they are date hubs that list the day's matches). They are
broken out separately because their performance is tracked under the
"selected-team page performance" + "homepage and /matches/tomorrow"
measurement items (spec §11). The `/matches?page=N` pagination URLs are the
`?page=` query variant of the matches hub (route plan §2.1).

### 1.2 The device breakdown (the 2026-11-15 Devices.csv)

| Device | Clicks | Impressions | CTR | Avg position |
|---|---:|---:|---:|---:|
| Mobile | 237 | 9,145 | 2.59% | 8.62 |
| Desktop | 9 | 197 | 4.57% | 11.98 |
| Tablet | 4 | 123 | 3.25% | 7.87 |

**Mobile = 94.8% of clicks** (237 / 250). Mobile-first is the right priority
(the Session 14 mobile-performance work targets this audience). The Desktop
CTR (4.57%) is higher than Mobile (2.59%) but the volume is negligible
(9 clicks). The Tablet segment is negligible (4 clicks).

### 1.3 The country breakdown (the 2026-11-15 Countries.csv — top 5)

| Country | Clicks | Impressions | CTR | Avg position |
|---|---:|---:|---:|---:|
| Iran | 248 | 8,774 | 2.83% | 8.43 |
| Afghanistan | 1 | 438 | 0.23% | 11.22 |
| Pakistan | 1 | 5 | 20% | 9.20 |
| Germany | 0 | 50 | 0% | 11.28 |
| Turkey | 0 | 30 | 0% | 10.97 |

**Iran = 98.4% of clicks** (248 / 250). The Persian-speaking diaspora
(Germany 50 impr / Netherlands / UK — the S12 evidence) shows impressions
but ZERO clicks at poor positions (11.28) — Persian-diaspora searches, not
English queries (the S12-1 axis 1 evidence that closed the EN architecture
decision as Option (b), FINAL).

## 2. The per-page-class monitoring view (the GSC filter instructions)

For each page class, the owner opens GSC → Search Results → and applies the
URL filter. The table below gives the exact GSC filter + the baseline metric
to compare against.

### 2.1 Match detail — `/matches/<slug>-<date>`

- **GSC filter:** Page → `https://sportsignal.ir/matches/*` (the wildcard
  matches every match-detail URL). To EXCLUDE the date hubs + the hub +
  the pagination, add a second filter: Page → `https://sportsignal.ir/matches/today` →
  "is not" + `https://sportsignal.ir/matches/tomorrow` → "is not" +
  `https://sportsignal.ir/matches` → "is not" (exact) + `https://sportsignal.ir/matches?page=*` →
  "is not". Or simpler: use the regex filter `\/matches\/[a-z].*-202[56]-` (the
  match-detail slug always ends with the ISO date `-YYYY-MM-DD`).
- **Baseline (2026-11-15):** 192 clicks / 6,356 impr / 262 URLs / avg pos 8.3
- **Top URLs (the click-earners):** `barcelona-vs-manchester-city-2026-12-08`
  (39/477, pos 3.62 — the #1 page), `paris-saint-germain-vs-barcelona-2026-10-20`
  (35/854, pos 7.06), `real-madrid-vs-rb-leipzig-2026-10-21` (19/388, pos 9.82),
  `barcelona-vs-aston-villa-2026-11-03` (17/175, pos 6.56).
- **Watch for:** the URL count (262 → should grow as new matches are crawled);
  the avg position (8.3 → should improve as the pages earn authority); the CTR
  per URL (the top pages have 8-10% CTR — the long tail is near 0%).

### 2.2 Homepage — `/`

- **GSC filter:** Page → `https://sportsignal.ir/` (exact).
- **Baseline (2026-11-15):** 8 clicks / 267 impr / avg pos 9.1
- **Watch for:** the homepage title/H1 are byte-frozen through Dec 4-8
  (Session 6). The post-Dec-8 position + CTR is the measurement that tells
  whether the curated-selection promise + the carousel crawlability (Session 6)
  + the one-month window are earning the homepage its query. The homepage
  should be the #2 page class by clicks after the match-detail (the 8 clicks
  is low relative to the 267 impressions — the CTR is 3%, below the
  match-detail top pages' 8-10%).

### 2.3 Selected-team detail — `/teams/<slug>`

- **GSC filter:** Page → `https://sportsignal.ir/teams/*` (the wildcard
  matches every team-detail URL; the `/teams` index is excluded because it
  has no trailing slug). Only the 13 SELECTED clubs are indexable
  (`isSelectedTeam` — Session 4); the other 74 are `noindex, follow`.
- **Baseline (2026-11-15):** 16 clicks / 2,456 impr / 127 URLs / avg pos 8.0
- **Top URLs:** `teams/barcelona` (4/564, pos 9.36), `teams/real-madrid`
  (3/178, pos 7.55). The remaining 125 URLs average < 1 click each.
- **Watch for:** the team-page title/H1 bytes are byte-frozen through Dec 4-8
  (Session 8). The post-Dec-8 CTR per URL (the 2,456 impressions at 0.65%
  CTR is LOW — the team pages earn impressions but few clicks; the Persian
  entity-naming polish [Session 11] + the @graph WebPage node [Session 8] are
  the levers). The Barcelona page (564 impr) is the #1 team impression-
  earner — its post-Dec-8 performance is the proxy for the Persian alias
  work (the «بارسا» alternateName).

### 2.4 Competition detail — `/competitions/<slug>`

- **GSC filter:** Page → `https://sportsignal.ir/competitions/*` (excludes
  the `/competitions` index).
- **Baseline (2026-11-15):** 6 clicks / 161 impr / 6 URLs / avg pos 7.3
- **Top URLs:** `competitions/champions-league` (3/69, pos 9.9),
  `competitions/la-liga` (2/66, pos 7.38), `competitions/ligue-1` (1/3,
  pos 7.33). `premier-league` (0/14), `serie-a` (0/5), `bundesliga` (0/4)
  earn impressions but no clicks.
- **Watch for:** the competition-page title/H1 bytes are byte-frozen through
  Dec 4-8 (Session 9). The @graph CollectionPage node (Session 9) is the
  lever. The Champions League + La Liga pages are the #1 + #2 competition
  pages — their post-Dec-8 performance is the proxy for the CollectionPage
  work.

### 2.5 Date hubs — `/matches/tomorrow` + `/matches/today`

- **GSC filter:** Page → `https://sportsignal.ir/matches/tomorrow` (exact) +
  a second report for `https://sportsignal.ir/matches/today` (exact).
- **Baseline (2026-11-15):** tomorrow 18 clicks / 218 impr / pos 6.72; today
  2 clicks / 26 impr / pos 7.62.
- **Watch for:** the `/matches/tomorrow` empty-state copy is byte-frozen
  through Dec 4-8 (the S06-H3 follow-up). The tomorrow page is the #4 URL by
  clicks (18) — its CTR (8.26%) is the highest of any page class. The
  "بازی فردا" / "بازی‌های فردا" query intent is the date-hub's natural
  audience. The post-Dec-8 position + CTR is the measurement that tells
  whether the empty-state copy + the date-hub @graph are earning the page.

### 2.6 Matches hub + pagination — `/matches` + `/matches?page=N`

- **GSC filter:** Page → `https://sportsignal.ir/matches` (exact) + a second
  report for `https://sportsignal.ir/matches?page=*` (the pagination
  wildcard).
- **Baseline (2026-11-15):** hub 3 clicks / 100 impr / pos 5.82; pagination
  3 clicks / 32 impr / 2 URLs / pos 4.8.
- **Watch for:** the `?page=N` pagination indexability (the S2 title-test
  parked item — route plan §10). The hub's position (5.82) is better than
  the match-detail avg (8.3) — the hub earns its impressions at a stronger
  position. The pagination URLs at pos 4.8 are the strongest position of any
  page class — watch whether they stay indexable (the canonical + the
  robots meta are the gate).

### 2.7 Index pages — `/teams` + `/competitions`

- **GSC filter:** Page → `https://sportsignal.ir/teams` (exact) +
  `https://sportsignal.ir/competitions` (exact).
- **Baseline (2026-11-15):** teams-index 0 clicks / 24 impr / pos 5.5;
  competitions-index 0 clicks / 10 impr / pos 4.7.
- **Watch for:** the `/teams` index tile ordering (the 13 selected clubs
  first — Session 10) + the `/competitions` index. These earn impressions
  but no clicks — the index pages are navigation surfaces, not query targets.
  The position (5.5 / 4.7) is strong; the CTR (0%) suggests the SERP snippet
  does not match the query intent. The post-Dec-8 sessions should evaluate
  whether the index pages need a query-targeted title (the S2 title-test
  parked item).

## 3. The monitoring cadence

- **Weekly (the top 4 page classes):** match-detail, homepage, date-hub
  tomorrow, selected-team detail. The owner opens GSC → Search Results →
  sets the date filter to "Last 7 days" → applies the per-class URL filter
  (§2.1-2.5) → records the clicks / impressions / CTR / avg position. The
  weekly cadence catches the match-URL lifecycle (the INERT season-end
  mechanism — Session 5) + the fresh-match crawl cadence (the homepage
  one-month window — Session 6). **The weekly check takes ~5 minutes** (4
  filter applications + the numbers recorded).
- **Monthly (the full snapshot):** the owner exports the GSC Search Results
  CSV (Page + Query + Device + Country) for the "Last 28 days" window. This
  is the month-over-month comparison. The export replaces the 2026-11-15
  baseline as the new reference point. **The monthly check takes ~15
  minutes** (the export + the page-class aggregation + the comparison).
- **Post-Dec-8 (the freeze lift):** the FIRST full 16-month GSC export after
  Dec 8 is the measurement that tells whether the byte-frozen surfaces (the
  S1 spelling fix + the S6-S9 title/H1 ladders) held or improved their GSC
  metrics. This is the S2 title-test re-fire + the S1 spelling-fix judgement
  (the ~Dec 8 window the freeze was protecting). The owner should export the
  16-month GSC Search Results CSV + the queries×pages matrix + the
  enhancement/Critical-issues CSVs + the Core Web Vitals report on Dec 9
  (or the first business day after Dec 8).

## 4. The GSC report URLs / filter sets (the owner's checklist)

1. **Search Results (the default):** https://search.google.com/search-console
   → select `sportsignal.ir` → Search Results. Set the date filter + the
   URL filter per §2. Export the CSV for the monthly snapshot.
2. **Pages report:** Search Results → the "Pages" tab (the URL-level
   breakdown). This is the §2.1-2.7 source.
3. **Queries report:** Search Results → the "Queries" tab (the query-level
   breakdown). The query×page matrix (the "Queries" × "Pages" cross-tab) is
   the S2 title-test evidence + the Persian-alias coverage check (the
   «بارسا» / «بازی بعدی بارسا» GSC evidence — Session 11).
4. **Devices report:** Search Results → the "Devices" tab. The Mobile =
   94.8% baseline (§1.2) is the reference. Watch the Mobile CTR + the Mobile
   avg position (the mobile-first audience).
5. **Countries report:** Search Results → the "Countries" tab. The Iran =
   98.4% baseline (§1.3) is the reference. The Persian-diaspora impressions
   (Germany / Netherlands / UK) are the S12 EN-decision evidence — watch
   whether they convert to clicks (they should NOT, per Option (b) FINAL).
6. **Enhancement reports (the structured data):** Search Console →
   Enhancements → "Events" (the SportsEvent schema — Session 13). The 13
   "Missing field location" Critical items + the 4 non-critical issue types
   are the honest "missing recommended field" class (the S13-1 decision).
   Watch whether the count changes (a future Events rich-result eligibility
   pursuit is the S13-1 option (c) revisit, post-Dec-4).
7. **Coverage report:** Search Console → Pages (the indexing snapshot). The
   "Indexed" vs "Crawled - currently not indexed" vs "Discovered -
   currently not indexed" breakdown. The 13 selected clubs are indexed; the
   74 non-selected are `noindex, follow` (the C1 disposition). Watch whether
   new match URLs enter the "Indexed" bucket within 2-3 days of their
   publish (the match-URL lifecycle — Session 5).

## 5. What this monitoring view is NOT

- It is NOT a dashboard tool. It is a markdown report + the GSC filter
  instructions (the phase file's item 5: "a markdown report + the GSC filter
  instructions is sufficient").
- It is NOT a Core Web Vitals report. The CWV data (LCP / INP / CLS per URL
  class) lives in the Chrome UX Report (CrUX) / PageSpeed Insights — the
  Session 14 mobile-performance audit (the SESSION-14 report §2) attempted
  the CrUX API + the PageSpeed Insights API; both were quota-blocked without
  an API key. The structural analysis (the render path + the KV-read count +
  the CPU cliff) is the fallback. The owner should supply the CrUX /
  PageSpeed Insights data for sportsignal.ir if accessible (the program's
  top evidence request — the post-Dec-8 sessions).
- It is NOT a GSC export. The 2026-11-15 export is the baseline; a FRESH
  export (the post-Dec-8 measurement) is the standing request. This report
  defines the VIEW + the CADENCE — the owner runs the exports per §3.
