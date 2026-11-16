# Keyword Validation Report — Session 2

> Agents: read AGENTS.md in the repo root first, and follow it for this whole task.

- **Date:** 16 November 2026
- **Session:** SEO Implementation Program, Session 2 of 15 (dedicated keyword session)
- **Author:** SEO implementation agent (per `AGENT-INSTRUCTIONS.md` §5 keyword-research contract)
- **Code changes:** **None.** Analysis/documentation only, per the phase file. No deploy (no runtime change).
- **Companion files:** `VALIDATED-KEYWORD-MAP.csv` (374 rows), `SERP-SAMPLES.md`, `EVIDENCE-LOG.md`

---

## 1. Executive summary

The 200-phrase seed bank was validated against the original GSC export, expanded to **374 evidence-tagged phrases** (202 GSC-observed exact strings, 39 Google-autocomplete-validated variants, 133 research candidates), clustered, and mapped to exactly one existing URL type per landing intent. Every volume field is honestly **"unavailable"** — no Keyword Planner/Trends access existed this session, and the spec's never-invent rule was applied without exception.

The five findings that matter most for Session 3:

1. **The selected-club allowlist contains 13 European clubs, not 14** (machine-verified from `src/config.ts`; the "14" in the Session 1 report and the Session 2 start prompt is a miscount). One correction, zero ambiguity: PL 5 + La Liga 3 + Serie A 2 + Ligue 1 1 + Bundesliga 2 = 13.
2. **Next-match intent is the strongest team-page demand** and it is heavily concentrated: the Barcelona cluster alone (بارسلونا/بارسا/بارسل spellings) accounts for ~546 of ~712 visible next-match impressions (77%); Bayern (65), Inter (44), Milan (28), Liverpool (26), Arsenal (43 incl. ارسنال variant) follow; Chelsea and Manchester United show almost no visible next-match demand (1 impr each).
3. **The top-clicking query in the entire export is a broadcast-intent query we deliberately do not target** («مکان تماشای بولونیا درمقابل مونتزا», 8 clicks). Broadcast/lineup/ticket intents total ~345 impressions and 8 of the 23 attributed clicks — all excluded by the mapping rules, all documented.
4. **Non-selected-team demand is real but shallow** (~102 visible next-match impressions across 10+ clubs, ~1,297 page impressions across 114 non-selected team URLs, 8 clicks, 0.62% CTR). It is flagged as the C1/S1 question for Session 3 — not solved here.
5. **The team-page CTR problem is universal, not selection-driven**: the 13 selected clubs' team pages convert at 0.69% vs 0.62% for the 114 non-selected ones — both poor. This corroborates the repo's parked team-page title test (Dec 4 GSC gate) as the right measurement and warns Session 3 against expecting a selection change alone to fix team-page performance.

## 2. Method and evidence inventory (full detail in EVIDENCE-LOG.md)

| Evidence source | Coverage | Date | Locale params |
|---|---|---|---|
| GSC export (`reference/sportsignal.ir-GSC-11-15.zip`, 13 CSVs) | 375 query rows, 413 page rows, countries, devices, 35-day chart, index counts | exported 2026-11-15, filter "Last 3 months" | property `sportsignal.ir`, Web |
| Google Suggest (autocomplete API) | 20 Persian head queries → 177 suggestions | 2026-11-16 | `hl=fa&gl=IR` |
| Google News RSS | 6 cluster queries (news-vertical format evidence) | 2026-11-16 | `hl=fa&gl=IR&ceid=IR:fa` |
| Live competitor pages (format-only inspection) | ScoreYab, Soot360, 365Scores (TVeto blocked by Cloudflare challenge) | 2026-11-16 | n/a |
| Live sportsignal.ir page titles (mapping cross-check) | 6 pages (team ×3, today, UCL, DFB-Pokal) + teams sitemap (87 slugs) | 2026-11-16 | production |
| Repo source (`src/config.ts`, `src/admin.ts`, `src/match-classify.ts`, `src/slugs.ts`, `src/seo/data.ts`) | allowlist, overlay, eligibility rules, slug pins | 2026-11-16 | HEAD `76327b5` |

**Not available this session (recorded, never fabricated):** live GSC access (no API credentials — a fresh export with URL-level page samples is still the program's biggest evidence gap), Google Ads Keyword Planner, Google Trends, direct Google SERP HTML (CAPTCHA-walled from the sandbox IP — see SERP-SAMPLES.md §1), Bing as a Persian SERP proxy (returned zero results for all Persian queries from this vantage), and any third-party volume/difficulty tool. **No search volume, CPC, or difficulty number appears anywhere in this session's outputs.**

## 3. GSC re-query: segmentation and privacy gap

All numbers re-derived from the raw CSVs this session (they reconcile with `GSC-AUDIT-BASELINE.md`).

### 3.1 Language and geography

- **Queries.csv:** 375 visible rows — **374 Persian-script, 1 Latin** (`kups`, 1 impression, a Finnish club name). There is **zero evidence of English-query demand** in the export. English work therefore stays evidence-led candidates only (Session 12), with no target geography.
- **Countries.csv (250 clicks / 9,465 impressions):** Iran 248 clicks / 8,774 impressions (**99.2% of clicks, 92.7% of impressions**). The next-largest, Afghanistan (438 impr, 1 click), is Dari-speaking — same content audience. All other countries are ≤50 impressions (Germany 50, Turkey 30, Sweden 28, UAE 17, Saudi 16, US 12 …), consistent with Persian-speaking diaspora, not English demand.
- **Devices.csv:** Mobile 237/9,145 (**94.8% of clicks, 96.6% of impressions**). (Note: the Session 2 start prompt's "96.6% of impressions from Iran" conflates the two reports — 96.6% is the mobile impression share; the Iran impression share is 92.7%. The strategic conclusion is unchanged: Persian-first, mobile-first.)

### 3.2 Privacy suppression (quantified)

The Queries report attributes only 23 clicks / 4,289 impressions; the Pages report carries 251 clicks / 9,699 impressions. The gap — **55.8% of impressions and 90.8% of clicks are not attributed to any visible query** — is the combined effect of Google's privacy threshold and top-row truncation and cannot be decomposed further from the export. Two consequences for this program: (a) the visible query set is a *sample* of demand, biased toward rarer, longer queries; (b) click-level conclusions drawn from visible queries (like finding #3 above) are directionally valid but numerically partial. The brand term «اسپرت سیگنال» does not appear in any visible row — brand demand is unmeasured, not absent.

### 3.3 Intent buckets across all 375 visible queries

| Intent bucket | Queries | Clicks | Impressions | Treatment |
|---|---:|---:|---:|---|
| Matchup-general («X مقابل Y») | 58 | 10 | 1,658 | Match detail (conditional) |
| Next-match («بازی بعدی X») | 72 | 1 | 712 | Team page — selected clubs only |
| Standings-vs («جایگاه‌های X درمقابل Y») | 32 | 0 | 677 | Passive (match-detail URL pattern already captures) |
| Time-window (امشب/امروز/فردا/هفته…) | 41 | 0 | 83 | Time hubs |
| Schedule («برنامه…», «کنداکتور…») | 26 | 0 | 104 | Team/competition/time-hub by qualifier |
| Time-info (ساعت/زمان/تاریخ…) | 18 | 0 | 45 | Team page or time hub |
| League/UCL heads | 6 | 0 | 10 | Competition pages |
| Other (club-name-only, navigational, noise) | 69 | 2 | 426 | Case-by-case; mostly non-selected-club demand |
| **Excluded: broadcast** («مکان تماشای», «ساعت پخش») | 15 | **8** | 268 | Excluded — no TV/broadcast product |
| **Excluded: lineups** («ترکیب») | 3 | 0 | 56 | Excluded — no lineup product |
| **Excluded: tickets** («بلیت») | 1 | 0 | 21 | Excluded — no ticketing product |

The export contains **no live-score, no betting** query in the visible set; broadcast (268 impr) is the only excluded intent with demonstrated clicks. All excluded-intent queries are documented as rows in the map with explicit reasons.

### 3.4 Page-side segmentation (Pages.csv, 413 rows)

| Page type | URLs | Clicks | Impressions | CTR |
|---|---:|---:|---:|---:|
| Match detail | 264 | 190 | 6,338 | 3.00% |
| Team pages | 127 | 16 | 2,456 | 0.65% |
| — of which **13 selected-club URLs** (all 13 present) | 13 | 8 | 1,159 | 0.69% |
| — of which **114 non-selected URLs** | 114 | 8 | 1,297 | 0.62% |
| Homepage | 1 | 8 | 267 | 3.00% |
| `/matches/tomorrow` | 1 | 18 | 218 | 8.26% |
| `/matches/today` | 1 | 2 | 26 | 7.69% |
| this-week / this-weekend / /matches / ?page=2,3 | 6 | 9 | 161 | 5.59% |
| Competition pages (6) | 6 | 6 | 161 | 3.73% |
| Static/other | 7 | 2 | 62 | 3.23% |

Two structural facts for Session 3:

- **174 of the 264 match-detail rows (66%) involve no selected club.** They exist because the current implementation's `isBigForSeo` (`src/seo/data.ts:112-122`) adds any fixture where either side sits in the competition's **top-3 standings** — the automated "important table race" route (product-strategy route B). This is a real, live editorial mechanism, not a bug; the keyword map treats those match URLs as legitimate *conditional* targets (pattern-based, never hypothetical).
- **Team-page demand concentrates in 2 of 13 clubs:** Barcelona (564 impr) + Real Madrid (178) = 64% of all selected-club team impressions. Seven of the thirteen selected clubs have ≤25 team-page impressions each.

## 4. Allowlist verification (the ONLY team-page targets)

Re-verified this session from source (HEAD `76327b5`), not from memory:

- **`CONFIG.BIG_TEAMS_BY_LEAGUE` (`src/config.ts:38-100`) — 13 European clubs:** Arsenal, Chelsea, Manchester United, Manchester City, Liverpool (PL); Barcelona, Real Madrid, Atlético Madrid (PD); Inter Milan, AC Milan (SA); Paris Saint-Germain (FL1); FC Bayern München, Borussia Dortmund (BL1). The EL/ECL lists repeat 11 of them; the A-League list (5 clubs) is site-hidden (`SITE_HIDDEN_LEAGUES`, `config.ts:32`).
- **Correction recorded:** the Session 1 audit and the Session 2 start prompt say "14 European clubs" — the machine count is **13**. Recommend Session 3 and later docs use 13. (Logged in `docs/DECISIONS.md`.)
- **Admin overlay nuance re-verified** (`src/admin.ts:56-79`): `getSettings` overlays KV `bot_settings_v1` over the defaults and canonicalizes against `clubs_catalog`; the SEO router returns before `applySettings` runs in the request flow, so SEO surfaces use the compiled defaults unless cron preflight mutated the isolate's CONFIG earlier. Live behavior equals the code default list (corroborated by the live sitemap's match set).
- **Canonical team slugs (live sitemap, 2026-11-16):** `/teams/barcelona`, `/teams/real-madrid`, `/teams/club-atletico-de-madrid`, `/teams/arsenal`, `/teams/chelsea`, `/teams/manchester-united`, `/teams/manchester-city`, `/teams/liverpool`, `/teams/internazionale-milano`, `/teams/ac-milan`, `/teams/paris-saint-germain`, `/teams/bayern-munich`, `/teams/borussia-dortmund`. **Slug-divergence note for Session 3:** Inter and Atlético serve at *provider-derived* slugs (`internazionale-milano`, `club-atletico-de-madrid`), not the pinned `TEAM_SLUGS` values (`inter-milan`, `atletico-madrid` — `src/slugs.ts:45-70`), because the provider names differ from the pinned keys. This is a URL-identity question (Session 3/8), **not** a spelling change; the Dec 8 spelling freeze is untouched.
- **Live team-page title pattern (the parked S2/M2 test surface):** «X — برنامه بازی بعدی و ساعت شروع | اسپرت سیگنال», H1 «برنامه بازی‌های X». The observed query intent («بازی بعدی X») leads with the intent phrase, the title leads with the club name. The map deliberately targets the *intent* to this template and leaves title-wording decisions to the parked measurement (Dec 4 gate) — no contradiction introduced.

## 5. Seed-bank validation results (keyword-bank-200.csv)

| Check | Result |
|---|---|
| Row count | 200 ✓ (180 fa / 20 en; 78 long / 115 mid / 7 short) |
| The 70 "GSC observed" claims | **70/70 verified present in Queries.csv** (exact strings, after normalizing only Arabic-ی/ك and ZWNJ) with matching metrics ✓ |
| Evidence separation (exact vs candidate) | Preserved and *strengthened*: the validated map carries an explicit `evidence_class` column (GSC-observed / Autocomplete-validated / Research-candidate) + `evidence_source` with tool+date |
| Ineligible targets in the seed | **6 rows re-mapped:** rows 78/80-84 targeted "Selected team page only" for Napoli, Roma, Brighton, Como, Galatasaray, Tottenham — non-selected clubs. All six now carry `Excluded — non-selected club` with the demand evidence preserved (C1/S1 input). |
| Over-generic targets | The seed's fuzzy targets ("Homepage or matches hub", "Homepage / /matches/today", "UCL landing page or approved competition landing page") were all resolved to exactly one URL type (see §6 rules) |
| FA-cup/EL/ECL/Copa/Coppa rows | Re-mapped honestly: no competition pages exist for those competitions → `Hold — no dedicated competition URL (Session 9 decides)`, secondary capture via the homepage's other-competitions section; knockout-stage queries (finals/SF) → match-detail-conditional (they pass the LATE_STAGES rule when reached) |
| Metrics corrections | All 70 GSC rows re-derived from the raw export (the map's `gsc_*` columns supersede the bank's); zero discrepancies beyond spelling-variant collapse |

The seed bank itself is **left unchanged** (version-history preservation per KEYWORD-RESEARCH.md §9); the validated map supersedes it as the working artifact.

## 6. Clustering, one-URL rules, and cannibalization register

### 6.1 One-URL-per-intent rules (the mapping law for Session 3)

1. **Time-qualified → time hub.** امروز/امشب → `/matches/today`; فردا → `/matches/tomorrow`; این هفته → `/matches/this-week`; آخر هفته → `/matches/this-weekend`. The homepage never competes for time-qualified queries (it keeps unqualified discovery + brand).
2. **Club-dominant.** Any query naming exactly one selected club (next match, schedule, time, club+competition, club+weekday, club+امشب) → that club's team page. One URL per club per intent family.
3. **Competition-dominant.** League/UCL-qualified queries (incl. league+امشب like «بازی های لالیگا امروز») → the competition page. UCL-tonight («…لیگ قهرمانان اروپا امشب») → `/competitions/champions-league`, not the today hub.
4. **Both-clubs (matchup) → match detail, conditional.** «X و Y» / «X مقابل Y» (+ تاریخ/زمان/ساعت/کی/سال) → `/matches/{home}-vs-{away}-{YYYY-MM-DD}` **only when the fixture passes editorial selection** (selected club, top-3-standings route, derby, QF+ knockout). No URL is ever created for a hypothetical fixture; the map encodes this as `Match detail (conditional)`.
5. **Result queries** («نتیجه بازی X و Y») → match detail (post-match; the product serves final scores honestly; no live-score promise).
6. **Derbies** → each covered edition's match page (all listed derbies involve a selected club → they are covered fixtures); derby-*discovery* queries («دربی های مهم فوتبال اروپا») → homepage.
7. **English** → `English — future (Session 12)`; no URL today.

### 6.2 Cannibalization register (watchlist for Sessions 3-9)

| Risk | Surfaces that could compete | Resolution encoded in the map |
|---|---|---|
| Time hubs vs homepage | `/matches/today` vs `/` for امشب queries | Rule 1: time hubs own all time-qualified queries |
| Team page vs UCL page | «بازی بعدی بارسلونا در لیگ قهرمانان اروپا» (3 plausible targets) | Rule 2: club-qualified → team page |
| Team page vs match page | «بازی بعدی بارسلونا و رئال مادرید» | Both-clubs named → match detail (when covered); single-club next-match → team page |
| UCL page vs today hub | «برنامه بازی های لیگ قهرمانان اروپا امشب» | Rule 3: competition-dominant → UCL page |
| Homepage vs /matches | «برنامه بازی‌های مهم فوتبال» | Homepage (the live homepage title already owns this pattern); `/matches` owns paginated/30-day-window intents |
| Team page vs league page | «بازی بعدی آرسنال در لیگ برتر انگلیس» | Rule 2: club-dominant → team page |
| DFB-Pokal vs UCL page | German-cup queries (new candidates) | `/competitions/dfb-pokal` — the only cup with a live page |

### 6.3 The C1/S1 non-selected-team demand question (flagged, NOT solved)

Documented evidence now in the map (9 `Non-selected-team demand (C1 evidence)` rows + 6 re-mapped seed rows + the 114-URL page-side finding): visible next-match demand exists for Brighton (22 impr), Como (21+44), Roma (17), Malavan (13, Iranian club), Fajr Sepasi (13, Iranian club), Fenerbahçe (5), Betis (4), Napoli (4), Copenhagen (22), Twente (16), Getafe (9)… — but it converts at 0.62% CTR today and none of these clubs can receive team pages under the owner's allowlist decision. Iranian-club demand (Malavan, Fajr Sepasi, Persepolis impressions) is *out of product scope entirely* (European club football only). Session 3 must decide what happens to the 87-URL teams sitemap (keep/noindex/redirect per-URL with demand evidence); this map supplies the per-club demand table for that decision.

## 7. Validated map statistics (VALIDATED-KEYWORD-MAP.csv)

| Dimension | Values |
|---|---|
| **Total rows** | **374** (≥ 200 required) — 200 seed-annotated + 174 expansion |
| Evidence class | 202 GSC-observed (all with re-derived site metrics) · 39 Autocomplete-validated (Google Suggest fa-IR, 2026-11-16) · 133 Research-candidate |
| Language | 354 fa · 20 en |
| Geography | fa → Iran (GSC country report) · en → "no evidenced geography" |
| Status | 303 Retain–active · 14 Retain–passive (URL pattern captures; no active work) · 33 Hold (no eligible URL today) · 24 Excluded (broadcast 8, lineup 2, ticket 1, non-selected club 12, navigational 1) |
| Priority | P1 43 (40 retained + 3 excluded demand markers) · P2 243 · P3 88 |
| Target types (retained) | Match detail (conditional) 92 · Team page–selected club 102 · Time hubs 55 · Competition pages 50 · Homepage 18 (+7 secondary) · Matches hub 3 · English–future 20 |
| **Integrity checks** | 0 keywords on non-allowlist team URLs · 0 retained keywords without a target · 0 GSC-observed rows lacking metrics · 0 volumes invented |

## 8. Revised priority list (proposal for Session 3 sequencing)

Priorities reflect **product fit + observed evidence**, never difficulty (no difficulty data exists). Changes from the seed bank are marked.

### P1 — observed demand heads, target exists today (40 retained)

- **Time hubs:** the tomorrow family (justified by `/matches/tomorrow`: 18 clicks / 218 impr / 8.26% CTR — the site's best CTR surface) and the today family («ساعت مسابقه فوتبال امروز» 15 impr, «بازی‌های مهم امشب» cluster).
- **Team pages — the observed heads:** «بازی بعدی بارسا» (179 impr) / «بازی بعدی بارسلونا» (105) / Barcelona schedule cluster; «بازی بعدی بایرن مونیخ» (37); «بازی بعدی لیورپول» (24); «بازی بعدی اینترمیلان»/«بازی بعدی اینتر» (22+22); «بازی بعدی منچستر سیتی» (17); «بازی بعدی آرسنال» (14).
- **Matchup heads with clicks or 20+ impressions on covered fixtures:** «بارسلونا مقابل منچستر سیتی 2026» (6 clicks / 103 impr / pos 3.25 — the site's best query), «تاریخ بازی بارسلونا و منچستر سیتی» (2 clicks / pos 3.7), the Atalanta–Kairat / Monaco–Nordsjaelland / RWE–Leipzig / Trabzonspor–Freiburg one-offs (100-329 impr each — passive P1s validating the URL pattern), «سانتاندر مقابل رئال مادرید» (1 click / 62).
- **UCL page:** «برنامه بازی های لیگ قهرمانان اروپا» (14 impr) + the autocomplete-confirmed امشب/امروز variants.
- **Homepage:** «برنامه بازی‌های مهم فوتبال» only (the live title's own pattern). *(Changed: the other 5 core-cluster P1s → P2 — no observed demand; positioning anchors.)*

### P2 — observed variants, autocomplete confirmations, realistic secondary wording (243)

All spelling/ZWNJ/word-order/digit variants of P1 heads (GSC shows the demand fragments across variants: برنامه بازی های/بازیهای/بازی‌های بارسلونا…), club schedules for the remaining selected clubs, league competition heads (لیگ برتر انگلیس 11 impr, لالیگا 5, بوندسلیگا, لیگ ۱ فرانسه), this-week/weekend hubs, matchup-date variants, result queries for covered fixtures, «برنامه چمپیونزلیگ» (colloquial), «نیس رن» (2 clicks — non-selected one-off).

### P3 — unvalidated candidates, holds, passive patterns (88)

Core discovery heads without evidence, EL/ECL/FA-Cup/Copa/Coppa holds (Session 9), DFB-Pokal new candidates (live page, demand unvalidated), day-of-week generic queries, standings-vs/timeline/stats passive exemplars, all 20 English candidates, out-of-scope documentation rows.

## 9. Limitations and honesty notes

1. **No market volumes anywhere.** GSC columns are *site* metrics (impressions our pages earned), not search demand; positions are aggregates. No traffic-upside modelling was attempted.
2. **35-day chart only** (10 Oct – 13 Nov 2026): the "Last 3 months" filter label overstates the daily-data window; all trend statements are snapshot statements. The 28-day sum (239 clicks / 9,301 impr) matches the baseline exactly.
3. **Privacy gap (55.8% impr / 90.8% clicks unattributed)** — see §3.2. A fresh GSC export (ideally 16 months, URL-level page samples, and the queries×pages matrix) remains the single highest-value evidence upgrade the owner can provide; it would also unlock the S1/S4 URL-identity questions.
4. **Google SERP format evidence is indirect.** Direct google.com SERPs are CAPTCHA-walled from this sandbox; Bing returned zero Persian results from this vantage; TVeto is Cloudflare-challenged. SERP formats were therefore documented from Google Suggest (real Google, fa/IR), Google News RSS (real Google News, fa/IR), and live competitor pages — see SERP-SAMPLES.md for per-cluster notes and the exact access limitations. Positions from GSC stand in as Google-side evidence of who outranks us.
5. **Autocomplete ≠ volume.** Suggest data validates that a query *form* is typed by real users in the fa/IR locale; it says nothing about frequency. All 39 autocomplete rows are tagged accordingly.
6. **The map is a snapshot.** Coverage (top-3 standings route) changes with the tables; matchup "conditional" targets inherit that flux by design.

## 10. Feeds into Session 3 (keyword-to-URL architecture) — inputs ready

1. The **374-row validated map** with one-URL rules (§6.1) and the cannibalization register (§6.2).
2. The **C1 decision pack**: 13-club team-target list with live slugs (incl. the Inter/Atlético slug divergence), the 114-URL non-selected demand table, the both-sides-generation mechanism (`seo/data.ts:276-310`), and the 0.69%/0.62% CTR comparison.
3. The **match-eligibility fact** that 66% of match-detail GSC rows come from the top-3-standings route — Session 3 should decide whether that route stays (it is the de-facto "independently important match" implementation) and say so in the architecture doc.
4. The **parked-measurement coordination**: team-page title pattern (Dec 4 gate) and spelling freeze (Dec 8) — this map's targeting does not require touching either surface; Session 3's architecture must schedule any team-page title work after the gates.
5. **Holds queue for Session 9:** EL/ECL/FA Cup/Copa del Rey/Coppa Italia competition-page decisions, each with the honest current answer (homepage section only).

## 11. Acceptance criteria check (phase file)

| Criterion | Status |
|---|---|
| ≥ 200 candidate phrases documented with evidence class, language, geography, intent, tail length, target page type, priority, status | **Met — 374 rows**, every column populated |
| Volume populated ONLY where a named source + location/time basis exists | **Met — every volume field reads "unavailable — no volume tool access (never invented)"**; GSC site metrics kept in separate, clearly-labeled columns |
| No keyword assigned to an ineligible URL type | **Met — 0 non-allowlist team URLs, 0 hypothetical match URLs (all match targets conditional), 0 retained rows without an existing-URL-type target** |
| Exact GSC strings kept strictly separate from candidates | **Met — `evidence_class` + `evidence_source` columns** |
| Exclusions with explicit reasons | **Met — 24 excluded rows (broadcast/lineup/ticket/non-selected/navigational)** |
| Cluster synonyms → one landing intent; cannibalization identified | **Met — §6 rules + register** |
| Tracker + session report + next-session prompt | Done (see tracker row 02, `../session-reports/SESSION-02.md`, `../next-session-prompt.md`) |
