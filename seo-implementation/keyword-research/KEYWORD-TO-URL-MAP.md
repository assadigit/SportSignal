# Keyword-to-URL Map — Session 3 (Final Mapping and SEO Architecture)

> Agents: read AGENTS.md in the repo root first, and follow it for this whole task.

- **Date:** 16 November 2026
- **Session:** SEO Implementation Program, Session 3 of 15 (phase file: `sportsignal-seo-implementation/phases/SESSION-03-KEYWORD-TO-URL-ARCHITECTURE.md`)
- **Author:** SEO implementation agent (per `AGENT-INSTRUCTIONS.md`)
- **Code changes:** **None.** Planning/documentation session per the phase file and the start prompt. Everything here is the blueprint Sessions 4-13 implement; any code change believed necessary appears here only as a PROPOSAL with its Cloudflare free-tier budget.
- **Inputs (authoritative, not re-audited):** `VALIDATED-KEYWORD-MAP.csv` (369 unique rows, Session 2 verification-pass state), `KEYWORD-VALIDATION-REPORT.md` (§6 one-URL rules, §6.2 cannibalization register, §8 priorities, §10 inputs), `../audit/REPOSITORY-AND-TECHNICAL-AUDIT.md` (Session 1, C1-C8/S1-S4), `../audit/CLOUDFLARE-RESOURCE-BASELINE.md`, the 2026-11-15 GSC export, and this session's live spot-checks (§7 below).
- **Companion deliverables:** `../architecture/INDEXABILITY-MATRIX.csv` (per-route-class disposition) and `../architecture/ROUTE-AND-CANONICAL-PLAN.md` (canonical strategy, pagination, C1 disposition plan, top-3-route decision, hreflang stance).

---

## 1. What this document decides

Session 2 validated 369 unique phrases and encoded a one-URL-per-intent mapping law. This document converts that law into the **final keyword-to-URL mapping**: one primary intent cluster per canonical URL class, the representative phrases per cluster, the Persian title/H1/meta plan per class (a PLAN — nothing frozen changes before the Dec 4-8 gates), English plan slots (Session 12), and the **owner rule** that decides which URLs of each class may exist at all.

Derivation discipline: every count in this document was machine-derived this session from the validated map and the GSC export (scripts: `scripts/s03_analyze_map.py`, `s03_c1_evidence.py` logic re-run; outputs preserved in the session report §5). Nothing was hand-computed; no volume/CPC/difficulty number exists anywhere (no volume tool has ever been available in this program — GSC impressions are site impressions).

### 1.1 The mapping in one table (URL class → primary cluster)

Machine-derived from the 369-row validated map (retained rows only, status `Retain–active`/`Retain–passive`):

| # | URL class (canonical URL) | Primary intent cluster | Map rows | of which GSC-observed | GSC clicks / impr (map rows) | Owner rule (existence) |
|---|---|---|---:|---:|---|---|
| 1 | `/` Homepage | Curated-discovery / «برنامه بازی‌های مهم فوتبال» | 18 | 0 | 0 / 0 | Always exists |
| 2 | `/matches` Matches hub | 30-day window / paginated full list | 3 | 0 | 0 / 0 | Always exists |
| 3 | `/matches/today` | Time-qualified: امروز/امشب | 35 | 23 | 0 / 68 | Always exists (honest empty state) |
| 4 | `/matches/tomorrow` | Time-qualified: فردا | 11 | 7 | 0 / 11 | Always exists — permanent route (spec) |
| 5 | `/matches/this-week` | Time-qualified: این هفته | 5 | 2 | 0 / 2 | Always exists (honest empty state) |
| 6 | `/matches/this-weekend` | Time-qualified: آخر هفته | 4 | 1 | 0 / 1 | Always exists (honest empty state) |
| 7 | `/teams/{slug}` × 13 selected clubs | Next-match / club schedule («بازی بعدی X», «برنامه بازی‌های X») | 100 | 84 | 1 / 697 | **Selected-club allowlist only** (13 clubs) |
| 8 | `/competitions/champions-league` | UCL schedule («برنامه بازی های لیگ قهرمانان اروپا») | 27 | 7 | 0 / 22 | Core competition set |
| 9 | `/competitions/premier-league` | League schedule: لیگ برتر انگلیس | 7 | 3 | 0 / 4 | Core competition set |
| 10 | `/competitions/la-liga` | League schedule: لالیگا | 5 | 3 | 0 / 7 | Core competition set |
| 11 | `/competitions/serie-a` | League schedule: سری آ | 2 | 0 | 0 / 0 | Core competition set |
| 12 | `/competitions/bundesliga` | League schedule: بوندسلیگا | 3 | 1 | 0 / 1 | Core competition set |
| 13 | `/competitions/ligue-1` | League schedule: لیگ یک فرانسه | 3 | 1 | 0 / 2 | Core competition set |
| 14 | `/competitions/dfb-pokal` | German cup schedule (colloquial جام حذفی آلمان) | 3 | 0 | 0 / 0 | Cup page — already live, demand unvalidated |
| 15 | `/matches/{home}-vs-{away}-{YYYY-MM-DD}` | Matchup + date/time + result («X مقابل Y», «تاریخ بازی X و Y», «نتیجه…») | 86 | 47 | 13 / 1,440 | **Conditional editorial coverage** (see §4) |
| 16 | *(Held — no URL today)* EL / ECL / FA Cup / Copa del Rey / Coppa Italia clusters | — | 7 hold rows | — | — | **Session 9 decides** — never a thin page before then |
| 17 | *(Held)* English clusters | — | 20 hold rows | — | — | **Session 12** — no English URL today |

Note on the GSC columns: they are the sums of the *map rows'* site metrics (the visible-query sample), not the full page-side totals from Pages.csv. Page-side totals per class (from the export, Session 2-verified): match detail 264 URLs / 190 clicks / 6,338 impr; teams 127 URLs / 16 clicks / 2,456 impr; `/matches/tomorrow` 18 clicks / 218 impr / 8.26% CTR (the site's best CTR); homepage 8 / 267; competition pages 6 / 161. Both views agree on the shape: **match-detail pages carry the clicks; tomorrow is the best-CTR surface; team pages under-convert everywhere (0.69% selected / 0.62% non-selected)**.

**Confirmation required by the phase file — no page exists solely for a keyword variant:** verified. Every URL class above exists for a product purpose defined by the owner rules (curation window, permanent route, allowlist, core competition set, editorial coverage) — the keyword clusters are assigned to pages that exist for those purposes, never the reverse. The 369-row map's integrity checks (Session 2 §12: 0 hypothetical match URLs, 0 non-allowlist team targets, 0 retained rows without an existing-URL-type target) plus this session's re-run (0 duplicates, 0 placeholders) confirm it from the map side. Spelling/ZWNJ/digit variants are absorbed by on-page wording per cluster, never by new URLs — the one-URL law, restated as a build constraint for Sessions 6-11.

---

## 2. Per-class mapping detail (cluster → representative phrases → metadata plan → owner rule)

Format per class: the primary cluster, representative retained phrases (Persian; GSC-observed marked ●, autocomplete ◆, candidate ○), the title/H1/meta PLAN (Persian today + English plan slot for Session 12), and the owner rule. **Every metadata line below is a PLAN: GSC-measured surfaces are byte-frozen through the Dec 4-8, 2026 gates; implementation of any title/metadata change is scheduled AFTER them (§6).**

### 2.1 `/` — Homepage

- **Primary cluster:** Curated important-match discovery — «برنامه بازی‌های مهم فوتبال» (the live title's own pattern; P1).
- **Representative phrases:** ○ «برنامه بازی‌های مهم فوتبال» (P1, the only homepage P1) · ○ «مهم‌ترین بازی‌های فوتبال اروپا» · ○ «بازی‌های مهم فوتبال اروپا» · ○ «مسابقات مهم فوتبال اروپا» · ○ «بازی‌های حساس فوتبال اروپا» (all P2 positioning anchors, seed-derived, no observed demand) · derby-discovery rows (rule 6: «دربی های مهم فوتبال اروپا» family → homepage).
- **Persian metadata plan (current → planned):** the live title «برنامه بازی‌های مهم فوتبال | تاریخ و ساعت شروع | اسپرت سیگنال» already owns the cluster; keep it. H1 is a single sr-only «مهم‌ترین بازی‌های فوتبال اروپا را از دست ندهید»-family line (spec §2 suggestion) — verify visible/H1/title agreement in Session 6 only. Meta description is dynamic (next big match, Shamsi-first) — keep. **Change scheduled: none before Dec 4-8** (the homepage is a GSC-measured surface: 8 clicks / 267 impr in the export).
- **English plan slot (Session 12):** title family "Today's Most Important Football Matches | Kickoff Times | SportSignal"; no URL until Session 12 decides the EN architecture (ROUTE-AND-CANONICAL-PLAN §8).
- **Owner rule:** always exists; the unqualified discovery intent + brand. **Never competes for time-qualified queries** (one-URL rule 1) — no امروز/امشب/فردا wording in title/H1.

### 2.2 `/matches` — Matches hub (+ `?page=N`)

- **Primary cluster:** The complete curated window — «بازی‌های فوتبال اروپا در هفته آینده» / «برنامه بازی فوتبال در یک ماه آینده» (P1/P2 long-tails) + paginated browsing intent.
- **Representative phrases:** ○ «فهرست بازی‌های منتخب فوتبال اروپا» · ○ «برنامه بازی فوتبال در یک ماه آینده» (P1) · ○ «بازی‌های فوتبال اروپا در هفته آینده».
- **Persian metadata plan:** live title «بازی‌های بزرگ فوتبال پیش‌رو — تاریخ و ساعت شروع | اسپرت سیگنال» (+ « — صفحه N» suffix for `?page=N≥2`, Persian digits) — keep; it is distinct from the homepage's pattern and honest about curation. The homepage-vs-hub cannibalization pair (register row 5) resolves: homepage = unqualified «برنامه بازی‌های مهم فوتبال»; `/matches` = the full forward window + pagination.
- **English plan slot:** "Upcoming Big Football Matches — Dates & Kickoff Times | SportSignal".
- **Owner rule:** always exists. `?page=N` policy (canonical self per page ≥2, indexable, capped by content) is decided in ROUTE-AND-CANONICAL-PLAN §4 — not re-litigated here.

### 2.3-2.6 The four time hubs

| Hub | Primary cluster (time qualifier) | Representative phrases | Page-side GSC |
|---|---|---|---|
| `/matches/today` | امروز / امشب | ● «ساعت مسابقه فوتبال امروز» (15 impr) · ○ «بازی‌های مهم امشب» (P1) · ○ «بازی‌های مهم امروز فوتبال» (P1) · ○ «امشب چه بازی مهمی داریم» (P1) · ◆ «بازی های امشب فوتبال اروپا» | 2 clicks / 26 impr / 7.69% CTR |
| `/matches/tomorrow` | فردا | ● 7 observed strings · ○ «بازی‌های مهم فردا فوتبال» (P1) · ○ «فردا چه بازی مهمی داریم» (P1) · ◆ «بازی های فردا فوتبال اروپا» | **18 clicks / 218 impr / 8.26% CTR — the site's best CTR surface** |
| `/matches/this-week` | این هفته | ○ «بازی‌های مهم این هفته فوتبال اروپا» (P1) · ◆ «بازی های این هفته فوتبال اروپا» | (in the 6-URL time/route group: 9 clicks / 161 impr) |
| `/matches/this-weekend` | آخر هفته | ○ «بازی‌های مهم آخر هفته اروپا» · ○ «بازی‌های شنبه/یکشنبه فوتبال اروپا» (P3) | (same group) |

- **Persian metadata plan:** the live Shamsi-anchored titles («بازی‌های فوتبال امروز — ۲۵ آبان (۱۶ نوامبر) | اسپرت سیگنال» family, verified live) already match the SERP format that wins this space (SERP-SAMPLES §2.2: dated daily news articles) while staying evergreen hubs. Keep the pattern; no change before the gates. The UCL-tonight exception (one-URL rule 3) is encoded on the UCL page, not here — «برنامه بازی های لیگ قهرمانان اروپا امشب» belongs to `/competitions/champions-league`.
- **English plan slots:** "Today's Football Matches — {Shamsi/Gregorian date} | SportSignal" etc. (Session 12).
- **Owner rule:** all four always exist with honest empty states (C5 decision: stay indexable — ROUTE-AND-CANONICAL-PLAN §5). `/matches/tomorrow` is spec-permanent. The homepage never competes for these qualifiers (rule 1).

### 2.7 `/teams/{slug}` — the 13 selected-club team pages

- **Primary cluster per club:** Next-match + club schedule — «بازی بعدی X» / «برنامه بازی‌های X» (+ club+competition, club+امشب, club+weekday forms).
- **The 13 canonical URLs (live slugs, Session 2-verified; the Inter/Atlético provider-derived slugs are the URL identity — see ROUTE-AND-CANONICAL-PLAN §7):**

| URL | Map rows | GSC-observed strings | Map-row clicks/impr | Page-side impr (export) |
|---|---:|---:|---|---:|
| `/teams/barcelona` | 45 | 42 | 1 / 432 | 564 |
| `/teams/real-madrid` | 11 | 9 | 0 / 10 | 178 |
| `/teams/bayern-munich` | 9 | 7 | 0 / 79 | 37* |
| `/teams/internazionale-milano` | 3 | 2 | 0 / 44 | 44* |
| `/teams/arsenal` | 7 | 4 | 0 / 43 | 43 |
| `/teams/liverpool` | 6 | 3 | 0 / 34 | 26 |
| `/teams/manchester-city` | 5 | 3 | 0 / 22 | 22 |
| `/teams/paris-saint-germain` | 5 | 3 | 0 / 9 | ~9 |
| `/teams/borussia-dortmund` | 3 | 1 | 0 / 8 | 8* |
| `/teams/ac-milan` | 2 | 2 | 0 / 7 | ~28 |
| `/teams/club-atletico-de-madrid` | 1 | 1 | 0 / 4 | 4 |
| `/teams/manchester-united` | 2 | 2 | 0 / 4 | ~1-11 |
| `/teams/chelsea` | 1 | 1 | 0 / 1 | ~1 |

\* map-row and page-side counts differ where the visible-query sample and the Pages report attribute demand differently (privacy threshold); both are recorded, neither is inflated. Barcelona + Real Madrid = 64% of selected-club team impressions (Session 2 §3.4).

- **Representative phrases:** ● «بازی بعدی بارسا» (179 impr, pos 9.97) · ● «بازی بعدی بارسلونا» (105) · ● «بازی های بعدی بارسلونا» (26) · ● «برنامه بازی های بارسلونا» (18) · ◆ «بازی بعدی بارسلونا در لیگ قهرمانان» · ◆ «بازی بعدی آرسنال در لیگ برتر انگلیس» · ● «بازی بعدی بایرن مونیخ» (37) — the full per-club evidence is the map's `Team page — selected club` rows (100 retained).
- **Persian metadata plan:** live title «X — برنامه بازی بعدی و ساعت شروع | اسپرت سیگنال», H1 «برنامه بازی‌های X». The observed intent leads with «بازی بعدی X»; the title leads with the club name. **The wording decision is the repo's parked team-page title test (Dec 4 GSC gate) — this blueprint explicitly schedules ALL team-page title work after that gate and does not pre-decide its outcome.** What Session 8 may do before the gate: nothing on titles; after the gate: apply the test's winning pattern, then the Session 8 scope (content depth, internal links).
- **English plan slot:** "{Club} — Next Match & Upcoming Fixtures | SportSignal" (Session 12).
- **Owner rule:** **the selected-club allowlist is the authority** (13 clubs; `CONFIG.BIG_TEAMS_BY_LEAGUE`, season-stable, admin-overlayable). Non-selected clubs never get team URLs — the C1 disposition for the 74 existing non-selected URLs is ROUTE-AND-CANONICAL-PLAN §6 (this section only fixes the 13 keepers).

### 2.8-2.13 Competition pages (5 leagues + UCL + DFB-Pokal)

- **Primary cluster per competition:** the league/UCL schedule family — «برنامه بازی های {لیگ}» (+ امروز/امشب/هفته variants, which belong HERE by rule 3, not to the time hubs).
- **Representative phrases:** ● «برنامه بازی های لیگ قهرمانان اروپا» (14 impr, pos 9.36) · ◆ «برنامه بازی های لیگ قهرمانان اروپا امشب» · ● «بازی بعدی آرسنال در لیگ برتر انگلیس» (→ team page by rule 2 — the club-dominant override) · ◆ «برنامه بازی های لیگ برتر انگلیس امروز» · ◆ «برنامه بازی های لالیگا» · ○ «بازی های مهم لیگ یک فرانسه» · ○ DFB-Pokal candidates («برنامه جام حذفی آلمان» family — live page, demand unvalidated).
- **Persian metadata plan:** live pattern «{لیگ} — برنامه بازی‌های بزرگ پیش‌رو | اسپرت سیگنال» + standings table + answer sentence with next big match. Keep; the curated framing («بازی‌های بزرگ پیش‌رو») is the differentiator vs the full-coverage competitors (SERP-SAMPLES §2.3/§2.5). No change before the gates.
- **English plan slots:** "Champions League — Upcoming Big Fixtures | SportSignal" etc. (Session 12).
- **Owner rule:** indexable core = the five domestic leagues + UCL (spec §2 "Competition pages"). DFB-Pokal is live and stays; **no new competition page is created in this program without Session 9's content-threshold decision** (the EL/ECL/FA-Cup/Copa/Coppa holds). The competition-page 0-upcoming rules (404 when no pool rows / noindex at 0 upcoming — `MIN_UPCOMING_FOR_INDEX = 1`) carry into the indexability matrix as-is.

### 2.15 `/matches/{home}-vs-{away}-{YYYY-MM-DD}` — Match detail (conditional)

- **Primary cluster:** the matchup family — «X مقابل Y» / «X و Y» + date/time/result qualifiers (rule 4), post-match result queries (rule 5).
- **Representative phrases:** ● «بارسلونا مقابل منچستر سیتی 2026» (6 clicks / 103 impr / pos 3.25 — the site's best query) · ● «تاریخ بازی بارسلونا و منچستر سیتی» (2 clicks) · ● «آتالانتا مقابل کایرات» (329 impr, passive) · ● «موناکو مقابل نورشلان» (244, passive) · ● «سانتاندر مقابل رئال مادرید» (1 click / 62) · ◆ «بارسلونا مقابل منچستر سیتی کی است» · result-form rows («نتیجه بازی X و Y» → post-match).
- **Why this is the strongest surface:** 86 retained conditional rows carry 13 clicks / 1,440 impressions in the visible-query sample; page-side, match detail = 264 GSC URLs / 190 clicks / 6,338 impressions — most of the site's clicks. The exact-slug URL pattern (team-pair + date) matches the query structure directly (SERP-SAMPLES §2.4).
- **Persian metadata plan:** live title ladder (⚽ pairing | competition، date | brand, ≤65 chars), H1 with both calendars, answer sentence, SportsEvent JSON-LD, 365-day archive serve. Keep the template; Session 7 refines metadata within it. No change before the gates.
- **English plan slot:** pairing-led "⚽ {Home} – {Away} | {Competition}, {date} | SportSignal" (Session 12).
- **Owner rule (the eligibility law — matches MASTER-SEO-SPEC §3 exactly):** a match URL exists only when the fixture passes editorial coverage:
  1. **selected club** — either side is on the 13-club allowlist (`shouldReport`: league lists; CL/cups also QF+), or
  2. **top-3-standings route** — either side sits in the competition's top-3 (`isBigForSeo`, the automated "independently important" implementation — **decision: STAYS; see ROUTE-AND-CANONICAL-PLAN §3**), or
  3. **derby/historic rivalry** (owner-curated; all listed derbies involve a selected club today), or
  4. **important knockout** (QF+ for CL/cups in `shouldReport`; SF/final emphasis per spec).
  No URL is ever created for a hypothetical fixture (rule 4's "conditional" status); lifecycle (pool → 365-day archive → season-end review) is Session 5's scope.

---

## 3. Cluster assignment rules (inherited, restated as build law)

Session 2's one-URL rules are inherited verbatim — they are already encoded in the validated map's `target_url` column and this session re-verified 0 violations. Restated for the implementers:

1. **Time-qualified → time hub** (امروز/امشب→today; فردا→tomorrow; این هفته→this-week; آخر هفته→this-weekend). Homepage never competes.
2. **Club-dominant → team page** (any query naming exactly ONE selected club, incl. club+competition, club+امشب, club+weekday). Overridden only by rule 4 when BOTH clubs are named.
3. **Competition-dominant → competition page** (league/UCL-qualified incl. league+امشب). UCL-tonight belongs to the UCL page, not the today hub.
4. **Both-clubs → match detail, conditional** on editorial coverage. No hypothetical URLs.
5. **Result queries → match detail** (post-match; final scores served honestly; no live promise).
6. **Derbies → each covered edition's match page; derby-discovery → homepage.**
7. **English → Session 12** (no URL today; plan slots only).

**Deviations from the inherited law: none.** No evidence appeared this session that would justify one; the live spot-checks (§7) confirmed the assumptions the law was built on.

The cannibalization watchlist (7 resolved overlaps — KEYWORD-VALIDATION-REPORT §6.2) carries forward unchanged into Sessions 6-10 as the regression checklist whenever a title/H1/anchor changes: time-hubs-vs-homepage, team-vs-UCL, team-vs-match, UCL-vs-today, homepage-vs-matches, team-vs-league, DFB-Pokal-vs-UCL.

---

## 4. Match-detail conditional eligibility — the coverage decision

The phase file asks for the fate of the top-3-standings route. The evidence:

- **184 of 264 (70%)** observed match-detail GSC rows involve no selected club — they exist via `isBigForSeo`'s top-3 route (Session 2 verification-pass count; corrected from 174/66%).
- Those rows are not noise: the passive P1 one-offs («آتالانتا مقابل کایرات» 329 impr, «موناکو مقابل نورشلان» 244, «منچستر یونایتد مقابل آ اس رم» 210) are exactly this route's URLs, and they carry real impressions at pos 12+.
- The alternative (restricting match URLs to selected-club fixtures only) would orphan ~70% of the observed match-detail demand and contradict PRODUCT-AND-SEO-STRATEGY §4.B ("important non-selected-club matches … table/title race … simple verified table/competition signals").

**Decision (recorded in docs/DECISIONS.md): the top-3-standings route STAYS as the de-facto implementation of "independently important match" (product route B).** It is bounded (top-3 of covered competitions only), automated from verified standings (the `stMap` cache), and produces the URLs the demand evidence shows. Sessions 5/7 inherit it as eligibility law. The owner may narrow it later with a manual-exception overlay — a product decision, not an SEO one; flagged in the session report §9.

---

## 5. Held clusters (no URL today — explicit non-mapping)

| Held cluster | Rows | Honest current answer | Deciding session |
|---|---|---|---|
| UEFA Europa League («بازی های مهم لیگ اروپا» etc.) | 2 | No competition page; EL matches enter via the conditional match rule + homepage's other-competitions section | 9 |
| UEFA Conference League | 1 | same | 9 |
| FA Cup («جام حذفی انگلیس») | 2 + 2 knockout-tie holds | same (final/SF queries → match detail when the tie is known and covered) | 9 |
| Copa del Rey («کوپا دل ری») | 1 | same | 9 |
| Coppa Italia («جام حذفی ایتالیا») | 1 | same | 9 |
| English clusters (20 rows) | 20 | Zero English-query evidence (374/375 visible queries Persian; the 1 Latin string is a club name); EN is a client-side toggle with zero hreflang | 12 |
| Out-of-scope qualifiers (جام جهانی/ایران/جهان time queries) | 3 | Documented holds — the product covers European club football | — |

These are deliberately NOT mapped to URLs. Creating thin competition pages for them would violate MASTER-SEO-SPEC §2 ("No empty/thin competition pages") and the phase's "no page solely for a keyword variant" law.

---

## 6. Freeze coordination (the schedule constraint on every planned change)

- **GSC-measured surfaces + team-name spellings: byte-frozen through Dec 4-8, 2026.** This includes all live titles/H1s listed above as "current". The blueprint PLANS; implementation of any frozen-surface change happens after the gates.
- **Team-page title work:** scheduled strictly AFTER the Dec 4 gate (the repo's parked S2/M2 title test reads GSC on Dec 4; Session 8 consumes its result).
- **Nov 20 Bayern–Köln windows (kickoff 19:30 UTC):** no deploys in the S27 auto-verify windows (M1 ~19:35, M2 ~21:35-45 UTC).
- **Session sequencing note for implementers:** Sessions 4-5 (technical foundation, lifecycle) touch canonical/sitemap/noindex machinery — none of which alters frozen title bytes; the first sessions that may change frozen surfaces (6-8) are scheduled by the tracker against the December gates.

---

## 7. Live cross-check performed this session (the "reviewed against existing routes" criterion)

Spot-verification only (the phase file forbids wholesale re-audit). Performed 2026-11-16 against `https://sportsignal.ir`, recorded in the session report §5:

| Check | Result | Confirms |
|---|---|---|
| `/sitemaps/teams.xml` | 200, **87 URLs = 13 selected + 74 non-selected**, all 13 selected slugs present (incl. `internazionale-milano`, `club-atletico-de-madrid`) | C1 evidence base |
| `/teams/fulham`, `/teams/lecce` (non-selected) | 200, **indexable**, self-canonical, standard team title/H1 | C1 live confirmation: non-selected URLs are fully indexable today |
| `/teams`, `/competitions` index pages | 200, indexable, self-canonical, tile grids + ItemList | the index-page disposition input (ROUTE-AND-CANONICAL-PLAN §5) |
| `/matches?page=2`, `?page=3` | 200, self-canonical WITH the query, indexable, « — صفحه N» title suffix | current pagination policy (§4 of the route plan) |
| `/matches/this-week`, `/matches/this-weekend` | 200, indexable, self-canonical, Shamsi-anchored H1 | hub states |
| Sitemap children | pages 15 / competitions 7 / teams 87 / upcoming 123 / archive 151 = 383 total | Session 1 counts unchanged |
| Source re-checks at HEAD `4d93541` | `isBigForSeo` (`src/seo/data.ts:114-122`), `teamsIndex` both-sides loop (`src/seo/data.ts:276-310`), `shouldReport` (`src/match-classify.ts:161-174`), `MIN_UPCOMING_FOR_INDEX = 1` (`src/seo/config.ts:62`), pagination canonical (`src/seo/pages.ts:1419-1458`), team-page title (`src/seo/pages.ts:2030-2032`), match-title ladder (`src/seo/pages.ts:1060-1085`), homepage title (`src/seo/router.ts:147`), `TEAM_SLUGS` pins (`src/slugs.ts:45-70`) | every code citation in the three deliverables |

No divergence between the blueprint's assumptions and the live routes was found. One nuance added to the record: the non-selected team URLs currently in the sitemap but ABSENT from GSC (19 of 87) are zero-visible-impression URLs in a partial export — absence from the report is not proof of zero demand (recorded in the C1 table, ROUTE-AND-CANONICAL-PLAN §6).

---

## 8. Acceptance criteria check (phase file)

| Criterion | Status |
|---|---|
| One primary keyword/intent cluster per canonical URL | **Met** — §1.1 table: 15 URL classes, one primary cluster each, machine-derived from the 369-row map |
| Mapping covers homepage, date routes, `/matches`, pagination policy, 5 leagues + UCL + DFB-Pokal, 13 team pages, match-detail (conditional) | **Met** — §2 (all classes incl. the `?page=N` pointer to the route plan) |
| Fate of every current route class (87-URL teams sitemap, non-selected team URLs, `?page=N`, empty hubs, `/teams`+`/competitions` index) | **Met** — INDEXABILITY-MATRIX.csv (every class × disposition × evidence × session) + ROUTE-AND-CANONICAL-PLAN §4-§7 |
| Indexable/noindex/redirect/removed per class with evidence; no blind deletion; noindex stays crawlable | **Met** — matrix + route plan (C1 per-URL table with GSC demand; robots.txt never blocks a noindex target) |
| Overlaps resolved per one-URL rules; deviations documented | **Met** — §3; zero deviations |
| Content/metadata map Persian and English separately (plan only; freeze respected; EN = slots) | **Met** — §2 per-class plans + EN slots; §6 freeze schedule |
| No page solely for a keyword variant | **Met** — §1.1 confirmation (both map-side integrity checks and owner-rule-side verification) |
| Every indexable URL class has purpose, target intent, owner rule, canonical strategy | **Met** — this file (purpose/intent/owner rule) + ROUTE-AND-CANONICAL-PLAN (canonical strategy per class) |
| Team and match eligibility follows the editorial allowlist/exception model | **Met** — §2.7 (13-club allowlist) + §2.15/§4 (four-route coverage incl. the top-3 decision) |
| Plan reviewed against existing routes | **Met** — §7 live cross-checks + source re-verification |
