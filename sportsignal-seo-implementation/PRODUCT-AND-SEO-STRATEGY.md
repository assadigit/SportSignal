# Product and SEO Strategy — اسپرت سیگنال

## 1. Product definition

**اسپرت سیگنال is a curated football-match discovery and notification service.** Its purpose is to help people discover and avoid missing the most important and compelling football matches in Europe.

It is not a complete fixture catalogue, a live-score product, a betting service, or a broadcaster directory.

Persian positioning:

> اسپرت سیگنال مهم‌ترین بازی‌های فوتبال اروپا را گلچین و معرفی می‌کند تا مخاطبان مسابقات بزرگ، حساس و جذاب را از دست ندهند.

English positioning (working copy; validate naturalness with English SERP research):

> SportSignal helps fans discover the most important and compelling football matches across Europe, so they do not miss the games worth watching.

Use the Persian brand name **«اسپرت سیگنال»** in Persian copy. Use **SportSignal** in English copy.

## 2. Audience

The service serves a combination of:

1. Fans of major European clubs who want to follow their team's important fixtures.
2. Serious football followers who care about title races, derbies, knockout rounds and major European ties.
3. Casual viewers who do not follow every league but want to know which games are worth watching.
4. People who want convenient match reminders and announcements through the website, Telegram channel and Telegram bot.

An app is a future product direction, not a current SEO promise.

## 3. Competition coverage

Primary domestic leagues:

- Premier League (England)
- La Liga (Spain)
- Serie A (Italy)
- Bundesliga (Germany)
- Ligue 1 (France)

European competitions:

- UEFA Champions League — highest editorial priority.
- UEFA Europa League.
- UEFA Conference League.

Domestic cups (where covered):

- FA Cup
- Copa del Rey
- Coppa Italia
- DFB-Pokal
- Other relevant European domestic cups when the site actually curates them.

**Competition coverage does not mean every match in a competition is listed.** The site curates selected fixtures.

## 4. Match selection model

The editorial selection model has four routes into coverage:

### A. Selected clubs (core selection mechanism)

The site owner manually selects the most important clubs in each covered league. The selected-club set is fixed for the season. A selected club's fixtures against other selected clubs and against non-selected clubs are eligible for coverage.

Maintain this list in a manageable configuration/admin surface if one already exists or can be supported simply. Prefer an admin-managed list plus a configuration fallback/seed. Do not build a heavy new administration subsystem solely for SEO. The list must be stable during a season; changes should be intentional and logged.

### B. Important non-selected-club matches

A match involving no selected club can still be covered when it becomes independently important, e.g. a Leicester City title-race / top-of-table scenario. Use a manual editorial exception, optionally assisted by simple verified table/competition signals. The final include/exclude decision remains deliberate; do not invent a fully automated match quality model.

### C. Major derbies / historic rivalries

The site aims to cover Europe's most important derbies and historic rivalries, including the North West England derby example identified by the owner. This is an explicit exception path even if the clubs are not on the selected-club list.

### D. Important knockout stages

Cover important knockout fixtures, especially semi-finals and finals, with attention to the Champions League and selected domestic/European cups.

Do not treat all knockout games, every derby, or every match between famous clubs as automatically index-worthy. Use editorial selection and page-quality rules.

## 5. Homepage behaviour and content order

- The featured match is the **nearest upcoming selected/approved match** (owner choice: next by kickoff).
- If multiple featured matches belong to the same day/night grouping, the hero may show them in a carousel. Do not rotate unrelated matches simply to add motion.
- In the match-list section, show domestic leagues first in this order (subject to current UI): Premier League, La Liga, Serie A, Bundesliga, Ligue 1; then Champions League; then other European competitions/cups. The Champions League retains the highest editorial importance and can still receive prominent treatment in the hero or an explicit featured module.
- Show the selected/curated fixture window up to **one month ahead**. Keep queries/cache bounded; do not fetch upstream per card or per page.
- Existing short reason-tags are already shown (e.g. derby / competition importance); preserve and improve only if audit supports it.

## 6. Page eligibility

### Homepage

Primary discovery page for curated important matches. It should state clearly that matches are selected, not a complete programme of every fixture.

### Match detail pages

Keep the current match detail experience largely intact; the owner says the current pages are already fairly complete. Prioritize crawlability, unique title/H1/meta, data accuracy, useful context, and lifecycle handling over adding generic text.

Create a match detail URL only for:
- a selected club's covered fixture;
- a manually approved major derby/rivalry;
- a manually approved important title-race/table match;
- a relevant important knockout tie.

Do **not** create a match detail page for an ordinary fixture between two non-selected clubs (e.g. an ordinary Atalanta vs Napoli fixture) merely because the fixture exists in a provider feed.

### Team pages

Only owner-selected clubs should have dedicated indexable team pages. Do not expose an indexable page for every team present in the underlying provider/database. Keep the selected-club allowlist as the authority for team page generation and sitemap inclusion.

### Competition pages

Indexable competition pages should be limited to genuinely important competitions with useful distinct content. Core candidates are the five domestic leagues listed above and the Champions League. Europa League, Conference League and domestic cups may have pages only when there is enough distinct, maintained content; do not publish thin template pages just because a competition exists in data.

### Time-window pages

Preserve `/matches/tomorrow` as a permanent route with useful dynamic content. The site only lists curated matches, so an empty state is required when there are no selected matches tomorrow. It must not imply that no football matches exist worldwide. Recommended Persian message:

> برای فردا مسابقه مهمی در میان دیدارهای منتخب اسپرت سیگنال ثبت نشده است. برنامه بازی‌های مهم روزهای آینده را بررسی کنید.

Equivalent English copy:

> No selected high-priority matches are scheduled for tomorrow. Explore the important fixtures coming up over the next few days.

Audit `/matches/today`, `/matches/this-week`, `/matches/this-weekend`, pagination and any other time-window routes before deciding their indexability. Do not create a new indexable landing page for every date.

## 7. Information and feature promises

Current product capabilities to reflect only if verified in the code:
- selected upcoming fixtures and schedule;
- match date and kickoff time;
- match details;
- final results and match context;
- competition/team standings where current UI/data provides them;
- Telegram channel and Telegram bot announcements.

Do not promise live match status, minute-by-minute events, live score polling, streaming links, TV channel listings or a currently available mobile app.

## 8. Languages

- Persian is the primary SEO market now.
- English SEO should be improved in parallel, but with a smaller, evidence-led scope.
- Preserve the existing URL/language architecture unless Session 1 proves it is broken. If there is no robust English structure, evaluate `/en/` rather than imposing a new structure blindly.
- Each language page must have genuinely localized visible content and correct reciprocal hreflang/canonical relationships.
- Persian and English pages are alternate language versions, not duplicated pages with only navigation translated.

## 9. Positioning guardrails

Avoid positioning the product as:
- complete football fixtures for every league and team;
- live football scores;
- live match centre / minute-by-minute tracker;
- TV/broadcast discovery;
- betting tips or predictions.

The differentiator is editorial curation: **the important games, not every game.**
