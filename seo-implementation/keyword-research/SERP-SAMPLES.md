# SERP Samples — Session 2 Evidence (formats, not rankings)

> Agents: read AGENTS.md in the repo root first, and follow it for this whole task.

- **Date of sampling:** 16 November 2026
- **Purpose:** document the result-page *formats* competing for each main cluster (Persian/Iran), and the curated-vs-full-coverage positioning difference, per the phase file. This file records what was actually observed, with the tool, date, locale, and the access limitations. **No Google rankings were directly observable from this environment** (see §1); positions cited anywhere in this session's outputs come from the GSC export (average position, aggregated).

## 1. Access limitations (recorded honestly, checked this session)

| Surface | Attempt | Result |
|---|---|---|
| Google web SERP (`google.com/search?q=…&hl=fa&gl=IR`) | direct curl + headless browser (agent-browser) | **Blocked — redirected to `google.com/sorry/` (CAPTCHA wall)** for the datacenter IP. No Google organic SERP HTML was sampled. |
| Google Suggest autocomplete (`suggestqueries.google.com`, `client=firefox&hl=fa&gl=IR`) | direct | **Works.** 20 head queries → 177 suggestions collected (EVIDENCE-LOG.md A2). Real Google demand-form evidence. |
| Google News RSS (`news.google.com/rss/search?q=…&hl=fa&gl=IR&ceid=IR:fa`) | direct | **Works.** 6 cluster queries sampled; returns the news-vertical items Google News carries for the topic in fa/IR (EVIDENCE-LOG.md A3). |
| Bing as a Google proxy (`bing.com/search?q=…&cc=IR&setlang=fa`) | direct + headless browser | **Not viable** — returns zero organic results for every Persian query from this vantage (JS challenge then "نتیجه‌ای ندارد"). Persian Bing serving is geo/IP-dependent and empty here. |
| DuckDuckGo HTML endpoint | direct | Blocked (no response). |
| Competitor pages (direct fetch) | curl | ScoreYab ✓, Soot360 ✓, 365Scores ✓ (JS app shell only). **TVeto ✗ — Cloudflare "One moment, please…" challenge**; its team-page format is documented from SOURCE-RESEARCH.md's prior observation. |

Consequence: the "who ranks" layer of SERP analysis is served by (a) GSC average positions for our own pages, and (b) the pack's SOURCE-RESEARCH.md SERP review (Nournews, Khabarpu, TVeto references). The *format* layer below is this session's own evidence.

## 2. Cluster-by-cluster format evidence

### 2.1 Next-match («بازی بعدی X») — the team-page cluster

- **Google Suggest (fa/IR, 2026-11-16):** the completion sets for the selected clubs are dominated by competition-qualified and opponent-qualified forms — «بازی بعدی بارسلونا در لیگ قهرمانان (اروپا)», «…در لالیگا», «…کی است / کیه / با کیست», «…و رئال مادرید / مقابل رئال مادرید», «برنامه بازی های بارسلونا ۲۰۲۶», «بازی بعدی آرسنال در لیگ برتر انگلیس / جام اتحادیه انگلیس / لیگ اروپا», «بازی بعدی لیورپول در جام حذفی», «بازی بعدی بایرن مونیخ در بوندسلیگا». Full lists in EVIDENCE-LOG.md A2.
  - Language-intent note: suggest collisions exist — «بازی بعدی اینتر» completes to اینتر *میامی* and اینترنت before/alongside اینترمیلان; «رئال» collides with رئال بتیس/سوسیداد in queries. Mapping must stay club-exact (the validated map maps only the selected club's intents to its team URL).
- **Google News RSS:** «بازی بعدی بارسلونا» → **0 news items**. The news vertical does NOT serve this intent — consistent with it being a fixture/team-page intent (TVeto team-page format per SOURCE-RESEARCH; likely Google's own sports module on mobile).
- **Competitor format (TVeto, from SOURCE-RESEARCH — blocked this session):** team page with upcoming matches, results, team stats (`tveto.com/team/بارسلونا/`). This is the page type the selected-club team pages compete with.
- **Our position reality (GSC):** «بازی بعدی بارسا» avg pos 9.97 / «بازی بعدی بارسلونا» 9.99 / «بازی بعدی بایرن مونیخ» 7.49 — the curated team page currently sits on page 1 bottom / page 2 top.
- **Curated-vs-full-coverage:** a curated team page can honestly win this intent — the answer is ONE next match with date/time, not a season grid. ScoreYab-style full fixture grids answer it too, but the differentiator (kickoff time in Tehran time, curation context) fits.

### 2.2 Today/tonight/tomorrow («بازی های امشب/فردا فوتبال») — the time-hub cluster

- **Google Suggest (fa/IR):** «بازی های امشب فوتبال» completes to «…اروپا», «…جام جهانی», «…چمپیونزلیگ», «…جهان», «…ایران», «…اروپا رئال مادرید» — the qualifier space users add. «بازی های فردا فوتبال» similar (اروپا/چمپیونزلیگ/جهان/ایران).
- **Google News RSS:** «بازی های امشب فوتبال» → 1 item; «برنامه بازی های لیگ قهرمانان اروپا» → 9 items — the topical schedule space is served by **dated daily news articles** (Khabarpu, Nournews, vista.ir) with Shamsi-dated headlines: «برنامه مسابقات فوتبال امروز یکشنبه ۲۴ آبان ۱۴۰۵؛ سه بازی مهم فوتبال اروپا؛ ساعت مسابقه انگلیس و اسپانیا». This is the dominant competing format for schedule-intent queries: fresh-dated news pages, not evergreen hubs.
- **Implication for the curated positioning:** the time hubs compete with daily news articles AND full-coverage fixture sites (ScoreYab's H1 is literally «نتایج زنده فوتبال امروز»). The curated differentiator: «سه بازی مهم» style honesty — the today/tomorrow pages list *selected important* matches with an honest empty state, which is exactly what the spec's empty-state copy does. Never claim completeness; never claim "no football exists".
- **Our position reality (GSC):** `/matches/tomorrow` 18 clicks / 218 impr / 8.26% CTR / pos 6.72 — the best CTR on the site; the honest-empty-state page wins its clicks.

### 2.3 UCL schedule («برنامه بازی های لیگ قهرمانان اروپا») — the competition cluster

- **Google Suggest:** year-qualified (۲۰۲۶/2026/۲۰۲۷/۲۰۲۵) and moment-qualified (امروز/امشب) completions + club-qualified («…بارسلونا») + men's («مردان») completions.
- **Google News RSS:** 9 items; sources = Khabarpu ×4, Nournews, vista.ir, دیجی‌کالا مگ — again dated news schedule articles. Note the current news cycle (international break / UEFA Nations League) shows how the topical space drifts to national teams during breaks — the site's evergreen UCL page is unaffected by the drift but competes with the news cycle only on UCL matchdays.
- **Competitor format (live fetch, 2026-11-16):** Soot360 — title «نتایج زنده فوتبال، برنامه بازی‌ها و جدول لیگ‌ها | سوت ۳۶۰», H1 «سوت ۳۶۰؛ نتایج زنده، برنامه بازی‌ها و جدول لیگ‌های فوتبال», description «نتایج زنده فوتبال، برنامه کامل بازی‌ها و جدول به‌روز لیگ برتر ایران، لیگ آزادگان و لیگ‌های معتبر ۳۰ کشور جهان…». Full-coverage + live-score + Iranian leagues. **Not our positioning** (and it demonstrates the crowded full-coverage space we deliberately avoid).
- **Our live UCL page format:** title «لیگ قهرمانان اروپا — برنامه بازی‌های بزرگ پیش‌رو | اسپرت سیگنال», H1 «برنامه بازی‌های لیگ قهرمانان اروپا» — the "بازی‌های بزرگ پیش‌رو" (big games ahead) framing is the curated differentiator, already live.
- **Our position reality (GSC):** the UCL query family sits at pos ~9.4-12.7; the competition page row shows 69 impr / 3 clicks.

### 2.4 Matchup/date («بارسلونا مقابل منچستر سیتی 2026») — the match-detail cluster

- **Google Suggest:** «بارسلونا مقابل منچستر سیتی» completes with year forms (2026/۲۰۲۶) and «کی است» — confirming the year-qualified matchup pattern. Arsenal–Real and Barcelona–PSG matchup forms also appear in suggest (club-pair next-match).
- **Google News RSS:** «بارسلونا مقابل منچستر سیتی» → 0 news items today (news items will appear in the matchweek window — the pack's SOURCE-RESEARCH documents the Nournews matchday-preview format).
- **Our position reality (GSC):** «بارسلونا مقابل منچستر سیتی 2026» pos 3.25 with 6 clicks; «بارسا پاریس ۲۰۲۶» pos 4.17 — **the match-detail template is the site's strongest ranking surface**, driven by exact-slug URLs matching the query's team-pair structure. This validates the conditional-matchup mapping rule more than any SERP sample could.

### 2.5 Domestic-league schedules («برنامه بازی های لالیگا» etc.)

- **Google Suggest:** «برنامه بازی های لالیگا» → today/week/1405-qualified completions; «برنامه بازی های لیگ برتر انگلیس» similar.
- **Competitor format (live fetch, 2026-11-16):** ScoreYab — title «نتایج زنده فوتبال ؛ برنامه بازی‌ها و لایو اسکور | اسکوریاب», H1 «نتایج زنده فوتبال امروز», meta «نتایج زنده فوتبال امروز ایران و جهان… برنامه بازی‌ها، ساعت شروع، وضعیت لحظه‌ای مسابقات…». 365Scores (fa fixtures page) — full-fixture discovery app (JS shell; format known: every match of every league).
- **Positioning difference (explicit):** both competitors promise *all matches + live status*; SportSignal's league pages list *selected important fixtures* of the league (the live `/competitions/la-liga` etc. already do this). The league-cluster queries map to the competition pages with the curated framing — never a promise of the full round.

### 2.6 English SERPs — not sampled, by rule

The phase instruction permits English SERP inspection only for geographies with GSC evidence. The export shows **no English-query evidence** (374/375 visible queries are Persian; the one Latin string is a club name; no country's impressions are attributable to English queries). English SERP sampling was therefore **not performed**, and the 20 English candidates remain evidence-led only (Session 12 will revisit with fresh GSC data).

## 3. Standing observations for implementation sessions

1. **The daily-news format owns topical schedule queries** — Khabarpu/Nournews/vista Shamsi-dated articles. The time hubs should stay honest evergreen pages (with Shamsi-dated titles, as `/matches/today` already does) rather than chasing news freshness.
2. **Full-coverage + live-score is a crowded, well-funded position** (ScoreYab, Soot360, 365Scores all occupy it) — the spec's guardrail against that positioning is corroborated by the SERP evidence; the curated "important games" frame is the open lane (no sampled competitor leads with curation).
3. **The next-match SERP has no news vertical** (0 news items) — a clean intent for the 13 selected team pages, currently underperforming (pos 7-10, CTR 0.69%) with a title-pattern test already parked in the repo.
4. **Autocomplete confirms the competition-qualified and year-qualified long-tails** — the map's P2 variant rows encode exactly these forms; on-page wording can absorb them without new URLs (one-URL rules §6.1 of the validation report).
