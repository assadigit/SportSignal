# Master SEO Specification — اسپرت سیگنال

## 0. Execution principle

Audit first, keyword-research second, URL/keyword strategy third, then implement in controlled sessions. Do not treat this document as proof that an implementation flaw exists. The repository, the rendered production site, and current GSC reports are authoritative for technical decisions.

## 1. Locked product decisions from the owner

- Brand in Persian: **اسپرت سیگنال**.
- Product value: curated selection and notification of the most important/compelling European football matches.
- Audience: major-club supporters, serious football fans and casual fans who do not want to miss big games.
- Competitions: Premier League, La Liga, Serie A, Bundesliga, Ligue 1, Champions League, Europa League, Conference League and selected domestic cups.
- Champions League has the highest editorial priority.
- Homepage list ordering: domestic leagues first, then Champions League, then other covered competitions/cups.
- Current match selection is manual: manually selected key clubs per league; fixtures of those clubs against selected or non-selected clubs are eligible. Other non-selected-team matches are included only by exception when important (e.g. a team is in a decisive title/table race), or because it is a major derby/historic rivalry, or an important knockout stage (especially semi-final/final).
- Selected-club list is stable for the season (owner selected “fixed per season”). It should be manageable via an existing admin surface and/or simple configuration; do not build a heavy admin subsystem for SEO alone.
- No dedicated indexable page for every team. Only selected clubs have indexable team pages.
- Ordinary matches between two non-selected teams must not receive separate match pages unless independently important.
- Match detail pages are already fairly complete. Preserve their useful information and focus on unique metadata, accurate data, crawlability and lifecycle.
- Upcoming fixture horizon: up to one month.
- Featured hero match: nearest upcoming match (not the highest-rated future match). If several selected fixtures occur in the same day/night grouping, allow a carousel of those matches.
- Current short “why important” tags already appear. Preserve; do not add redundant tag systems.
- Result and match details are in scope. Live status/minute-by-minute updates are out of scope.
- Broadcast/TV-channel discovery is out of scope for now.
- Telegram channel and Telegram bot are current distribution channels. A mobile app is future scope only.
- `/matches/tomorrow` is a permanent route. If no selected match exists, show a meaningful empty state and do not imply there are no football matches anywhere.
- Persian is primary; English SEO should be improved in parallel.
- Current URL/language architecture is to be preserved unless the audit demonstrates a real defect. Correct reciprocal hreflang/canonical relationships are required for genuine language equivalents.
- GA4 is not currently installed; evaluate as an optional late phase, not an automatic must-have.
- User has a free Cloudflare Workers plan. Preserve existing low-resource architecture and do not add per-match provider fetches, client polling, unbounded cron jobs, or unnecessary storage/cost.

## 2. Target page architecture

Map each keyword intent to the most appropriate existing canonical URL. Do not create URLs just to accommodate every variant.

### Homepage

Primary: important/selected football matches in Europe, the editorial curation differentiator, covered competitions, Telegram channels/bot. Keep claims factual and concise. H1, title, meta description, visible hero text and internal anchor wording must be consistent.

Suggested Persian working copy (agent may refine based on actual UI and validated keyword research):

**H1:** مهم‌ترین بازی‌های فوتبال اروپا را از دست ندهید

**Supporting copy:** از دیدارهای بزرگ لیگ برتر انگلیس، لالیگا، سری آ، بوندس‌لیگا و لیگ یک فرانسه تا حساس‌ترین رقابت‌های لیگ قهرمانان اروپا و جام‌های حذفی؛ اسپرت سیگنال مهم‌ترین بازی‌های پیش‌رو را گلچین و معرفی می‌کند.

Do not claim all matches are covered. Say selected/important matches.

### Featured fixture hero

- Select the nearest upcoming fixture from the editorially approved set.
- If multiple highlighted fixtures share the same relevant day/night group, allow carousel navigation.
- Keep the card accessible, crawlable through a regular anchor link, and useful without JavaScript where the framework permits.
- Do not fabricate countdown, match date, status or timezone.

### Match listings

- Show curated matches only.
- Display domestic competition sections before the Champions League section, while preserving UCL editorial emphasis elsewhere.
- Show up to 30 days ahead using the existing data/cache path.
- No new provider request per match card or per visitor.
- Section labels and badges should not imply the page lists every match in the competition.

### `/matches/tomorrow`

- Keep a stable canonical route.
- Show only selected matches for tomorrow.
- If empty, show the Persian empty-state copy:
  > برای فردا مسابقه مهمی در میان دیدارهای منتخب اسپرت سیگنال ثبت نشده است. برنامه بازی‌های مهم روزهای آینده را بررسی کنید.
- Provide a crawlable link to the matches hub or current upcoming fixtures.
- Never fabricate a match or make a false global claim that there is no football tomorrow.
- Audit whether `/matches/today`, `/matches/this-week`, `/matches/this-weekend`, paginated lists and query parameter URLs deserve indexation. Do not index thin date variations just because they exist.

### Match detail pages

Allow only approved fixtures as described by the selection model. Keep unique match content and existing useful information. Ensure title, H1, description, match teams, competition, date/time and result are consistent. Timezone and date must be correct. Do not target live status, broadcast channels or betting queries.

### Team pages

Only selected-club pages are indexable. Use an authoritative allowlist. If a non-selected team currently has a `/teams/{slug}` URL, audit demand, internal links, backlinks and duplicates before applying noindex/redirect/404. Do not blindly delete pages. Never create a page per provider team.

### Competition pages

Indexable core pages: five domestic leagues and Champions League. Other UEFA cups and domestic cups may be indexable only when the current page contains enough unique, useful and maintained content. No empty/thin competition pages.

## 3. Match and team URL eligibility

Create a single source of truth for page eligibility:

- `selectedClub`: team is on the season's curated allowlist;
- `manualMatchException`: approved derby, historic rivalry, important table/title race, or other editorially approved exceptional match;
- `importantKnockout`: approved high-stage knockout tie, especially semifinal/final;
- `competitionEligible`: competition has a meaningful landing page and adequate content.

Do not let generic provider fixtures bypass eligibility. Match URL creation, sitemap inclusion, navigation/internal linking and `index` state should use the same rules or well-tested derived selectors.

## 4. Index lifecycle for match pages

The business concern is avoiding an unbounded number of low-value indexable match URLs, while preserving meaningful search assets. Do not mass-delete pages or assume an indexed URL count directly consumes Cloudflare Worker CPU.

Separate three concerns:
1. Search index eligibility.
2. Public page availability/history.
3. Data retention/storage/runtime cost.

### Default lifecycle policy (implement only after verifying current data model)

**Phase A — Upcoming fixture:** An approved match page may be indexable when it has a stable URL and meaningful match information. It must be in the sitemap only if canonical and intended for search.

**Phase B — Recently completed:** Preserve final score and useful match details. Keep indexable until the end of the relevant competition season. Do not remove a page immediately after kickoff or final whistle if it has active search demand.

**Phase C — Season-end review:** Run one bounded, season-level cleanup/review (or use the existing deployment/data-management job; do not create per-match cron jobs). Evaluate each completed match URL:
- Keep indexable longer when there is evidence of continuing organic clicks/impressions, valuable external links, distinctive evergreen interest, or explicit editorial value (example: a major Barcelona–Manchester City tie).
- Otherwise, keep the page accessible if data retention is inexpensive and set `noindex` after the season closes; remove it from XML sitemap and current internal fixture listings.
- A `noindex` page must remain crawlable so Google can see the directive. Do not block it in robots.txt at the same time.
- Reevaluate retained exceptional pages at the next season close. Do not keep them indefinitely by default.

**Phase D — Invalid/duplicate page:** Use a 301 only when there is a true equivalent destination. Use 404/410 when content is gone and no suitable replacement exists. Do not redirect arbitrary deleted matches to the homepage or competition page.

### Thresholds

Do not invent arbitrary indexability cutoffs until the agent reviews the available GSC history. Propose transparent thresholds using GSC clicks/impressions, backlinks (if available), page uniqueness and owner editorial judgement. Record chosen thresholds in `MATCH-LIFECYCLE-POLICY.md` before implementing. Use the owner-approved seasonal default; flag any departure for explicit justification in the session report.

## 5. Technical SEO requirements

Audit and verify:
- HTTP to HTTPS and host normalization;
- canonical tags and duplicate aliases;
- robots.txt access and exclusions;
- XML sitemap contents, status, lastmod semantics and stale URLs;
- pagination and query parameter indexability;
- 404/410/redirect/5xx behaviour;
- page rendering and crawlable internal links;
- mobile rendering, metadata, H1 and content visibility;
- structured data accuracy and report-specific errors;
- hreflang/canonical reciprocity for Persian/English equivalents;
- response headers, caching and Cloudflare Worker constraints.

Sitemaps should include only canonical, indexable URLs intended for Google Search. Do not include `noindex`, redirected or 404 URLs.

## 6. Structured data

Inspect current JSON-LD and the exact GSC enhancement report before changing it. The exported issue “Missing field location” (13 items) does not identify its schema type. If it is Event markup, validate whether an actual physical stadium/location is known. Never fabricate an address or use a generic placeholder. Only add schema matching visible page content and current Google eligibility guidelines. Validate with Rich Results Test and inspect Search Console after deployment.

## 7. Persian and English SEO

- Use natural Persian club and competition names consistently.
- Keep an alias dictionary for common spelling/transliteration variants only if supported by actual query data or user language. Do not stuff every alias into titles.
- In Persian content, the brand is written «اسپرت سیگنال».
- English text must be idiomatic and adapted to English query intent, not machine-translated word-for-word.
- Use self-referencing canonical per language URL; alternate hreflang sets must include all available versions and return links.
- Do not emit hreflang for an absent or non-equivalent translation.
- Preserve existing URL patterns unless Session 1 proves the implementation is wrong and migration impact is understood.

## 8. Titles, meta descriptions and on-page language

- Unique title and H1 per indexable page.
- Include team pair / club / competition and date where natural and materially helpful.
- Avoid keyword stuffing and generic duplicate descriptions.
- Ensure the visible main title and key page content support the title link; Google may rewrite title links using prominent on-page text and link anchors.
- Meta description should accurately summarize the specific page; do not promise live scores or TV info.
- Do not add filler text to match a word count.

## 9. Internal links

Use crawlable HTML links:
- Homepage → current featured match, selected competition sections and selected team pages.
- Selected team page → upcoming approved matches and competition pages.
- Match detail page → both selected/important team pages and its competition page when those pages exist.
- Competition page → selected matches in that competition.
- Date pages → selected match details and the persistent matches hub.

Do not generate a link to an unindexable/thin team page simply because the team exists in the provider database.

## 10. Cloudflare free-tier guardrails

- Inspect existing Worker limits/usage and current cache/data strategy before modifying.
- Reuse existing cached fixtures, KV/D1 or other configured storage paths; do not introduce a new database or provider solely for SEO.
- Do not add client polling or per-page upstream fetches.
- Do not add unbounded or per-match cron jobs.
- Any season-end review must be bounded, idempotent, resumable and compatible with the existing resource budget. Prefer a manual admin/config action or a bounded batch in an existing job if that is how the project is designed.
- Avoid dynamic rendering work that materially increases Worker CPU, memory, KV operations or provider requests.
- Report measured or estimated resource impact for every new runtime operation.
- SEO indexing count and Worker compute are not the same metric. Keep old pages unindexed only for search quality; manage storage/runtime separately.

## 11. Measurement

Baseline is in `GSC-AUDIT-BASELINE.md`. Use GSC as the primary source. GA4 is optional and belongs in Session 14 only after checking that no analytics is already configured and reviewing privacy/consent requirements.

Monitor:
- clicks, impressions, CTR and average position;
- query-to-page relationships where available;
- selected-team page performance;
- match-page performance and query intent;
- homepage and `/matches/tomorrow`;
- indexed/crawled/not-indexed pages by page type;
- sitemap submitted/indexed counts;
- mobile and Iran performance;
- English page performance separately;
- Core Web Vitals if report/access is available.

Compare equivalent windows and note seasonality. Do not attribute changes to an algorithm update without evidence.
