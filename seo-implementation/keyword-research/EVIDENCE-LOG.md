# Evidence Log — Session 2 Keyword Validation

> Agents: read AGENTS.md in the repo root first, and follow it for this whole task.

Every evidence source used by `KEYWORD-VALIDATION-REPORT.md`, `VALIDATED-KEYWORD-MAP.csv` and `SERP-SAMPLES.md`, with tool, date, and locale — so every row can be re-verified or refreshed later. **No search-volume tool was available; no volume/CPC/difficulty number exists in this session's outputs.**

## A. Primary data

### A1. GSC export (the only demand-metrics source)

- **File:** `sportsignal-seo-implementation/reference/sportsignal.ir-GSC-11-15.zip` (extracted and inspected in full; do not rely on the baseline summary alone).
- **Property:** `sportsignal.ir`; search type Web (text-based); export filter label "Last 3 months"; exported 2026-11-15.
- **Contents used:** Queries.csv (375 rows; sums 23 clicks / 4,289 impressions), Pages.csv (413 rows; 251 / 9,699), Countries.csv (250 / 9,465), Devices.csv (250 / 9,465), Chart-2.csv (35 daily rows 2026-10-10→2026-11-13; last-28-day sum 239 / 9,301 — matches `GSC-AUDIT-BASELINE.md`), Chart.csv (index counts), Critical issues CSVs (159 not-found / 34 noindex / 32 crawled-not-indexed / 10 discovered-not-indexed / 13 missing-field-location).
- **Caveats carried into every use:** site impressions ≠ market volume; avg position is aggregated; row totals do not reconcile across reports; 55.8% of page impressions / 90.8% of page clicks are NOT attributed to any visible query (privacy threshold + row truncation, not decomposable from the export).
- **Not available:** live GSC access (no API credentials supplied in Session 1 or 2). URL-level page samples behind the index-issue counts remain unknown. A fresh export (ideally 16 months, with the queries×pages matrix and URL samples) is the program's top evidence request.

### A2. Google Suggest autocomplete — real Google, fa/IR

- **Tool:** `suggestqueries.google.com/complete/search?client=firefox&hl=fa&gl=IR` (public autocomplete endpoint).
- **Date:** 2026-11-16. **Locale:** hl=fa, gl=IR. **Method:** one request per head query, 0.6s spacing, responses parsed as JSON.
- **What it proves / doesn't:** a returned completion is a real query form typed by users in that locale — it validates query *shapes*, never volumes. 39 new rows in the validated map carry `evidence_class=Autocomplete-validated` from this source.
- **Raw completions (all 20 heads, 177 suggestions):**

  - **بازی بعدی بارسلونا**
    - بازی بعدی بارسلونا
    - بازی بعدی بارسلونا در لیگ قهرمانان
    - بازی بعدی بارسلونا در لالیگا
    - بازی بعدی بارسلونا کی است
    - بازی بعدی بارسلونا در لیگ قهرمانان اروپا
    - بازی بعدی بارسلونا و رئال مادرید
    - بازی بعدی بارسلونا با کیست
    - بازی بعدی بارسلونا در چمپیونزلیگ
    - بازی بعدی بارسلونا کیه
    - بازی بعدی بارسلونا مقابل رئال مادرید
  - **بازی بعدی رئال مادرید**
    - بازی بعدی رئال مادرید
    - بازی بعدی رئال مادرید و بارسلونا
    - بازی بعدی رئال مادرید کی است
    - بازی بعدی رئال مادرید در لیگ قهرمانان اروپا
    - بازی بعدی رئال مادرید در لالیگا
    - بازی بعدی رئال مادرید در لیگ قهرمانان
    - بازی بعدی رئال مادرید در چمپیونزلیگ
    - بازی بعدی رئال مادرید کیه
    - بازی بعدی رئال مادرید با کیست
    - بازی بعدی رئال مادرید و بارسلونا کی است
  - **بازی بعدی بایرن مونیخ**
    - بازی بعدی بایرن مونیخ
    - بازی بعدی بایرن مونیخ در لیگ قهرمانان
    - بازی بعدی بایرن مونیخ در لیگ قهرمانان اروپا
    - بازی بعدی بایرن مونیخ و پاری سن ژرمن
    - بازی بعدی بایرن مونیخ و رئال مادرید
    - بازی بعدی بایرن مونیخ با کیست
    - بازی بعدی بایرن مونیخ و پاریس
    - بازی بعدی بایرن مونیخ در بوندسلیگا
    - بازی بعدی بایرن مونیخ و بارسلونا
    - بازی های بعدی بایرن مونیخ
  - **بازی بعدی لیورپول**
    - بازی بعدی لیورپول
    - بازی بعدی لیورپول در لیگ قهرمانان اروپا
    - بازی بعدی لیورپول در لیگ برتر انگلیس
    - بازی بعدی لیورپول در لیگ قهرمانان
    - بازی بعدی لیورپول و رئال مادرید
    - بازی بعدی لیورپول در لیگ
    - بازی بعدی لیورپول در جام اتحادیه
    - بازی بعدی لیورپول در جام حذفی
    - بازی بعدی لیورپول مقابل رئال مادرید
    - بازی بعدی لیورپول و بارسلونا
  - **بازی بعدی منچستر سیتی**
    - بازی بعدی منچستر سیتی
    - بازی بعدی منچستر سیتی در لیگ قهرمانان اروپا
    - بازی بعدی منچستر سیتی در لیگ برتر انگلیس
    - بازی بعدی منچستر سیتی کی است
    - بازی بعدی منچستر سیتی در لیگ قهرمانان
    - بازی بعدی منچستر سیتی و بارسلونا
    - بازی بعدی منچستر سیتی در لیگ
    - بازی بعدی منچستر سیتی و رئال مادرید
    - بازی بعدی منچستر سیتی در لیگ برتر
    - بازی بعدی منچستر سیتی در جام حذفی
  - **بازی بعدی اینتر**
    - بازی بعدی اینتر میامی
    - بازی بعدی اینتر
    - بازی بعدی اینتر میامی کی است
    - بازی بعدی اینترمیلان
    - بازی بعدی اینترنت
    - بازی بعدی اینتر میامی و النصر
    - بازی بعدی اینتر در لیگ قهرمانان اروپا
    - بازی بعدی اینتر میامی در لیگز کاپ
    - بازی بعدی اینترنت میامی
  - **بازی بعدی پاری سن ژرمن**
    - بازی بعدی پاری سن ژرمن
    - بازی بعدی پاری سن ژرمن در لیگ قهرمانان اروپا
    - بازی بعدی پاری سن ژرمن در لیگ قهرمانان
    - بازی بعدی پاری سن ژرمن و بارسلونا
    - بازی بعدی پاری سن ژرمن و بایرن مونیخ
    - بازی های بعدی پاری سن ژرمن
    - تاریخ بازی بعدی پاری سن ژرمن
    - بازی بعدی رئال و پاری سن ژرمن
  - **بازی بعدی آرسنال**
    - بازی بعدی آرسنال
    - بازی بعدی آرسنال در لیگ قهرمانان اروپا
    - بازی بعدی آرسنال در لیگ برتر انگلیس
    - بازی بعدی آرسنال در لیگ قهرمانان
    - بازی بعدی آرسنال در لیگ
    - بازی بعدی آرسنال در لیگ برتر
    - بازی بعدی آرسنال در جام اتحادیه انگلیس
    - بازی بعدی آرسنال و رئال مادرید
    - بازی بعدی آرسنال در لیگ اروپا
    - بازی بعدی آرسنال و منچستر سیتی
  - **بازی بعدی دورتموند**
    - بازی بعدی دورتموند
    - بازی بعدی دورتموند در لیگ قهرمانان اروپا
    - بازی های بعدی دورتموند
  - **برنامه بازی های بارسلونا**
    - برنامه بازی های بارسلونا
    - برنامه بازی های بارسلونا در لالیگا
    - برنامه بازی های بارسلونا ۲۰۲۶
    - برنامه بازی های بارسلونا در لیگ قهرمانان اروپا
    - برنامه بازی های بارسلونا در فصل جدید
    - برنامه بازی های بارسلونا در چمپیونزلیگ
    - برنامه بازی های بارسلونا در لیگ قهرمانان اروپا 2026
    - برنامه بازی های بارسلونا در لیگ قهرمانان
    - برنامه بازی های بارسلونا ورزش سه
    - برنامه بازی های بارسلونا 2026
  - **برنامه بازی های لیگ قهرمانان اروپا**
    - برنامه بازی های لیگ قهرمانان اروپا
    - برنامه بازی های لیگ قهرمانان اروپا 2026
    - برنامه بازی های لیگ قهرمانان اروپا ۲۰۲۶
    - برنامه بازی های لیگ قهرمانان اروپا ۲۰۲۷
    - برنامه بازی های لیگ قهرمانان اروپا امروز
    - برنامه بازی های لیگ قهرمانان اروپا امشب
    - برنامه بازی های لیگ قهرمانان اروپا مردان
    - برنامه بازی های لیگ قهرمانان اروپا بارسلونا
    - برنامه بازی های لیگ قهرمانان اروپا 2027
    - برنامه بازی های لیگ قهرمانان اروپا 2025
  - **بازی های امشب فوتبال**
    - بازی های امشب فوتبال اروپا
    - بازی های امشب فوتبال
    - بازی های امشب فوتبال جام جهانی
    - بازی های امشب فوتبال چمپیونزلیگ
    - بازی های امشب فوتبال جهان
    - بازی های امشب فوتبال ایران
    - بازی های امشب فوتبالی
    - بازی های امشب فوتبال اروپا رئال مادرید
    - بازی های امشب فوتبال لیگ برتر
    - بازی های امشب فوتبال لیگ ملت های اروپا
  - **بازی های فردا فوتبال**
    - بازی های فردا فوتبال
    - بازی های فردا فوتبال لیگ برتر ایران
    - بازی های فردا فوتبال اروپا
    - بازی های فردا فوتبال لیگ برتر
    - بازی های فردا فوتبال ایران
    - بازی های فردا فوتبال جهان
    - بازی های فردا فوتبالی
    - بازی های فردا فوتبال جام جهانی
    - بازی های فردا فوتبال جام جهانی ۲۰۲۶
    - بازی های فوتبال فردا شب
  - **بازی های مهم فوتبال اروپا**
    - بازی های مهم فوتبال اروپا امشب
    - بازی های مهم فوتبال اروپا
    - بازی های مهم امروز فوتبال اروپا
    - بازی های مهم این هفته فوتبال اروپا
    - برنامه بازی های مهم امروز فوتبال اروپا
  - **برنامه بازی های لالیگا**
    - برنامه بازی های لالیگا
    - برنامه بازی های لالیگا اسپانیا
    - برنامه بازی های لالیگا ۲۰۲۶
    - برنامه بازی های لالیگا 2026
    - برنامه بازی های لالیگا 2027
    - برنامه بازی های لالیگا ۲۰۲۷
    - برنامه بازی های لالیگا ۲۰۲۶ ۲۰۲۷
    - برنامه بازی های لالیگا ۲۰۲۵
    - برنامه بازی های لالیگا رئال مادرید
    - برنامه بازی های لالیگا بارسلونا
  - **بارسلونا مقابل منچستر سیتی**
    - بارسلونا مقابل منچستر سیتی
    - بارسلونا مقابل منچستر سیتی ضربات پنالتی
    - بارسلونا مقابل منچستر سیتی ۲۰۲۵
    - بارسلونا مقابل منچستر سیتی گزارش فارسی
    - بارسلونا مقابل منچستر سیتی امروز
    - بارسلونا مقابل منچستر سیتی 2015
    - بارسلونا مقابل منچستر سیتی کی است
    - بارسلونا مقابل منچستر سیتی یونایتد
    - بارسلونا مقابل منچستر سیتی ۴ ۰
    - بارسلونا مقابل منچستر سیتی دوستانه
  - **ساعت بازی بارسلونا**
    - ساعت بازی بارسلونا
    - ساعت بازی بارسلونا امشب انتن
    - ساعت بازی بارسلونا و رئال مادرید
    - ساعت بازی بارسلونا امروز
    - ساعت بازی بارسلونا امشب پخش زنده
    - ساعت بازی بارسلونا و والنسیا
    - ساعت بازی بارسلونا پاریس
    - ساعت بازی بارسلونا امشب به وقت ایران
    - ساعت بازی بارسلونا و پاریسن ژرمن
    - ساعت بازی بارسلونا و سویا
  - **بازی های این هفته فوتبال**
    - بازی های این هفته فوتبال
    - بازی های این هفته فوتبال ایران
    - بازی های این هفته فوتبال اروپا
    - بازی های این هفته فوتبال لیگ برتر
    - بازی های این هفته فوتبال جهان
    - برنامه بازی های این هفته فوتبال
    - بازی های مهم این هفته فوتبال
    - خلاصه بازی های این هفته فوتبال جهان
    - بازی های مهم این هفته فوتبال اروپا
    - نتیجه بازی های این هفته فوتبال
  - **برنامه بازی های لیگ برتر انگلیس**
    - برنامه بازی های لیگ برتر انگلیس
    - برنامه بازی های لیگ برتر انگلیس امروز
    - برنامه بازی های لیگ برتر انگلیس ۲۰۲۵
    - برنامه بازی های امشب لیگ برتر انگلیس
    - برنامه کامل بازی های لیگ برتر انگلیس
    - برنامه بازی های باقیمانده لیگ برتر انگلیس
    - جدول و برنامه بازی های لیگ برتر انگلیس
    - برنامه بازی های این هفته لیگ برتر انگلیس
    - برنامه بازیهای لیگ برتر انگلیس ۲۰۲۴
    - برنامه و ساعت بازی های این هفته لیگ برتر انگلیس
  - **بازی های امروز فوتبال**
    - بازی های امروز فوتبال
    - بازی های امروز فوتبال ایران
    - بازی های امروز فوتبال جهان
    - بازی های امروز فوتبال لیگ برتر
    - بازی های امروز فوتبالی
    - بازی های امروز فوتبال اروپا
    - بازی های امروز فوتبال لیگ برتر ایران
    - بازی های امروز فوتبال ۳۶۰
    - بازی های امروز فوتبال اسیا
    - بازی های امروز فوتبال برتر

### A3. Google News RSS — news-vertical format evidence, fa/IR

- **Tool:** `news.google.com/rss/search?q=…&hl=fa&gl=IR&ceid=IR:fa`. **Date:** 2026-11-16.
- **What it proves:** which publishers/formats Google News carries per topic in fa/IR (the news-vertical layer of the SERP). Not a ranking or volume source.

  - **برنامه بازی های لیگ قهرمانان اروپا** — 9 items
    - لیگ ملت‌های اروپا؛ نتایج بازی‌های مهم، جدول رده‌بندی و برنامه هفته ششم • دیجی‌کالا مگ - دیجی‌کالا
    - برنامه مسابقات فوتبال امروز یکشنبه ۲۴ آبان ۱۴۰۵؛ سه بازی مهم فوتبال اروپا؛ ساعت مسابقه انگلیس و اسپانیا - نورنیوز
    - برنامه بازی‌های فوتبال امشب ۲۴ آبان؛ شب حساس لیگ ملت‌های ارو|راهبرد فردا - خبرپو
    - برنامه فوتبال امروز یکشنبه 24 آبان 1405؛ 3 دیدار مهم لیگ ملت|شایانیوز - خبرپو
    - فوتبال جمعه ۲۲ آبان؛ نبردهای ملی اروپا و دیدارهای دوستانه در برنامه هستند │ وضعیت پخش تلویزیونی ایران هنوز مشخص نیست - v
    - sources: دیجی‌کالا, نورنیوز, خبرپو, خبرپو, vista.ir, خبرپو, vista.ir, vista.ir, vista.ir
  - **بازی بعدی بارسلونا** — 0 items
  - **بازی های امشب فوتبال** — 1 items
    - Watch: Pep Guardiola’s press conference ahead of Bournemouth clash - Manchester City FC
    - sources: Manchester City FC
  - **برنامه بازی های لالیگا** — 0 items
  - **بارسلونا مقابل منچستر سیتی** — 0 items
  - **بازی های مهم فوتبال اروپا** — 23 items
    - لیگ ملت‌های اروپا؛ نتایج بازی‌های مهم، جدول رده‌بندی و برنامه هفته ششم • دیجی‌کالا مگ - دیجی‌کالا
    - پخش زنده بازی اسپانیا و انگلیس در لیگ ملت‌های اروپا - خبرگزاری دانشجو | SNN.IR
    - یک‌طرفه‌ترین برد‌های تاریخ لیگ قهرمانان؛ با حضور رئال مادرید، لیورپول و کومو! - فوتبال ۳۶۰
    - شنبه ای فوتبالی با شبکه سه سیما - Tv3.ir
    - خلاصه بازی اسپانیا 2-3 انگلیس - فوتبالی
    - sources: دیجی‌کالا, خبرگزاری دانشجو | SNN.IR, فوتبال ۳۶۰, Tv3.ir, فوتبالی, نورنیوز, خبرپو, صبح فوتبالی, صبح فوتبالی, پلیکان مدیا

### A4. Competitor pages (formats only — positioning never cloned)

Fetched live 2026-11-16 via curl (desktop UA):

| Site | Status | Observed format (title / H1 / meta) |
|---|---|---|
| scoreyab.com | 200, SSR HTML | title «نتایج زنده فوتبال ؛ برنامه بازی‌ها و لایو اسکور \| اسکوریاب»; H1 «نتایج زنده فوتبال امروز»; meta promises all results/fixtures/leagues — full-coverage live-score positioning |
| soot360.com | 200, SSR HTML | title «نتایج زنده فوتبال، برنامه بازی‌ها و جدول لیگ‌ها \| سوت ۳۶۰»; H1 «سوت ۳۶۰؛ نتایج زنده، برنامه بازی‌ها و جدول لیگ‌های فوتبال»; meta: 30 countries + Iranian leagues + UCL — full-coverage live-score positioning |
| 365scores.com/fa/football/match-fixtures | 200, JS app shell | full-fixture discovery app; no SSR content to quote |
| tveto.com/team/بارسلونا/ | **blocked** (Cloudflare challenge) | team-page format documented from SOURCE-RESEARCH.md (upcoming matches, results, team stats) |

### A5. Live sportsignal.ir surfaces (mapping cross-checks, 2026-11-16)

| Surface | Observed |
|---|---|
| `/teams/barcelona`, `/teams/internazionale-milano`, `/teams/club-atletico-de-madrid` | title «X — برنامه بازی بعدی و ساعت شروع \| اسپرت سیگنال»; H1 «برنامه بازی‌های X» — the parked title-test surface |
| `/matches/today` | title «بازی‌های فوتبال امروز — ۲۵ آبان (۱۶ نوامبر) \| اسپرت سیگنال»; H1 Shamsi-first date — time-hub format |
| `/competitions/champions-league` | title «لیگ قهرمانان اروپا — برنامه بازی‌های بزرگ پیش‌رو \| اسپرت سیگنال»; H1 «برنامه بازی‌های لیگ قهرمانان اروپا» |
| `/competitions/dfb-pokal` | title «جام حذفی آلمان — برنامه بازی‌های بزرگ پیش‌رو» — the only cup competition page live |
| sitemap `/sitemaps/teams.xml` | 87 URLs; all 13 selected-club slugs present incl. provider-derived `internazionale-milano` and `club-atletico-de-madrid` (the pinned `inter-milan`/`atletico-madrid` values in `TEAM_SLUGS` are NOT the served URLs for these two clubs) |

### A6. Repository source (HEAD 76327b5, verified 2026-11-16)

| Fact | Location | Value |
|---|---|---|
| Selected-club allowlist | `src/config.ts:38-100` `BIG_TEAMS_BY_LEAGUE` | **13 European clubs** (PL 5, PD 3, SA 2, FL1 1, BL1 2) + EL/ECL repeat-lists (11) + A-League 5 (site-hidden via `SITE_HIDDEN_LEAGUES`, `config.ts:32`) |
| Admin overlay | `src/admin.ts:56-79` `getSettings` | KV `bot_settings_v1` overlay + `clubs_catalog` canonicalization; SEO router returns before `applySettings` (request flow), so SEO uses compiled defaults unless cron mutated the isolate |
| Match eligibility | `src/match-classify.ts:162-174` `shouldReport` + `src/seo/data.ts:112-122` `isBigForSeo` | selected club (league lists) OR QF+ (CL/cups) for shouldReport; **plus top-3 standings of the competition** for SEO — the automated "important table race" route behind 66% of observed match-detail rows |
| Team-page generation (C1) | `src/seo/data.ts:276-310` `teamsIndex` | both sides of every eligible pool match — 87 live URLs incl. non-selected clubs |
| Slug pins | `src/slugs.ts:45-70` `TEAM_SLUGS` | 26 pinned famous-club slugs; provider-name divergence for Inter/Atlético (see A5) |

## B. Access limitations (tested, not assumed)

| Surface | Test | Outcome |
|---|---|---|
| Google organic SERP | curl + headless browser, `hl=fa&gl=IR` | CAPTCHA wall (`/sorry/`) — datacenter IP; **no Google SERP HTML sampled this session** |
| Bing fa/IR | curl + headless browser, `cc=IR&setlang=fa` | zero organic results for every Persian query from this vantage — not usable as a Google proxy |
| DuckDuckGo HTML | curl | no response |
| TVeto | curl | Cloudflare challenge |
| Keyword Planner / Trends / any volume tool | — | **no credentials/account supplied → volume unavailable everywhere (never invented)** |

## C. Evidence tagging scheme (the map's columns)

- `evidence_class`: `GSC-observed` (exact string present in Queries.csv of the 2026-11-15 export; `gsc_*` columns are re-derived site metrics) · `Autocomplete-validated` (Google Suggest fa/IR 2026-11-16) · `Research-candidate` (semantic expansion from seed bank v1.0 or Session 2, demand unvalidated).
- `search_volume`: universally `unavailable — no volume tool access (never invented)`. GSC impressions are site impressions, never treated as volume.
- `status`: `Retain–active` · `Retain–passive` (URL pattern already captures; no active work) · `Hold` (no eligible URL exists today) · `Excluded — <reason>` (broadcast / lineup / ticket / non-selected club / navigational).
- `geography`: fa rows → Iran (per GSC country report); en rows → "no evidenced geography" (zero English-query rows in the export).

## D. Re-verification recipe (for a future session with the same tools)

1. Re-run the 20 autocomplete heads with `hl=fa&gl=IR` (list in A2) — diff against A2 to detect intent drift.
2. Re-run the 6 Google News RSS queries (list in A3) — check whether the news-format dominance on schedule queries persists outside international breaks.
3. Re-fetch ScoreYab/Soot360/365Scores titles (A4) and the 6 sportsignal.ir surfaces (A5) — formats move slowly; titles are the fastest signal.
4. With a fresh GSC export: re-derive the intent buckets (validation report §3.3), the selected-13 team-page table (§3.4), and the privacy gap (§3.2); then re-score P1/P2 rows against the new `gsc_*` columns using the same rules (validation report §8).
