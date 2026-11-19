# SportSignal — Persian Club Alias & Match-Intent SEO Specification

**Project:** SportSignal — https://sportsignal.ir/  
**Repository:** https://github.com/assadigit/sportsignal  
**Document type:** Product, SEO research, content and implementation specification  
**Version:** 1.0  
**Prepared:** 2026-11-19  
**Primary market:** Persian-speaking football audience, with Iran as the primary locale  
**Primary language:** Persian (`fa-IR`)  
**Status:** Research and implementation specification; repository facts and experiment gates must be re-verified before changes

---

## 1. Executive summary

SportSignal should better match the way Persian-speaking football fans search for clubs and fixtures. A single club is often searched using its official Persian name, a short nickname, a colloquial name, a joined or separated spelling, or an alternative transliteration.

Examples:

- `بارسلونا` and `بارسا`
- `رئال مادرید` and `رئال`
- `منچسترسیتی`، `منچستر سیتی` and `من سیتی`
- `بایرن مونیخ` and `بایرن`
- `اینتر میلان` and `اینتر`

The desired outcome is **one well-maintained canonical destination per club**, with the relevant aliases and natural-language query patterns represented appropriately in its existing content and SEO data. The same principle applies to real, covered fixtures: different ways of describing the same matchup should resolve to the same canonical match destination.

This is not a request to generate a page for every alias, spelling, club combination or keyword. It is not a request to stuff keywords into page titles, headings or hidden text. SportSignal's existing product scope, selected-team allowlist, fixture eligibility, canonical URLs, cache/resource constraints and existing SEO experiments remain authoritative.

### Success criteria

1. Relevant Persian aliases resolve to the correct existing club entity.
2. Club aliases do not create duplicate indexable URLs.
3. Existing club pages naturally address high-value intents such as next match, kickoff time, upcoming fixtures, competition context and verified results.
4. Matchup searches using aliases of either club resolve to the correct existing covered fixture, when one exists.
5. Ambiguous aliases do not lead to false entity matches.
6. Keyword decisions are labelled by evidence quality; no search volume or demand is fabricated.
7. The implementation preserves SportSignal's current architecture, product scope and operational limits.
8. Existing SEO measurement freezes and deployment restrictions are respected.

---

## 2. Scope and non-goals

### In scope

- Persian club-name alias research and maintenance.
- Colloquial names, common spelling variants and transliteration variations.
- Club-specific next-match and upcoming-fixture queries.
- Match date and kickoff-time queries.
- Club-versus-club / fixture matchup queries.
- Competition-qualified club queries.
- Completed-match result and score queries, where reliable data exists.
- Relevant standing, recent-form and recent-result queries when those subjects are already supported by the page.
- Canonical URL mapping and internal-link consistency.
- Visible, natural Persian copy and appropriate structured data, where supported by the current implementation.
- An additive keyword research dataset and regression tests.

### Out of scope

Do not expand SportSignal into a product it does not currently provide. Unless repository inspection proves the product has changed, do not target or create content promising:

- Live video or TV broadcasting (`پخش زنده` as a streaming service).
- Video highlights or downloadable match footage (`خلاصه ویدیویی`).
- Betting, odds, gambling or predictions.
- Ticket sales or venue recommendations.
- Transfer news or general football news coverage.
- Starting-lineup predictions, injury reporting or other unsupported editorial products.
- A general-purpose, exhaustive live-score service if that is outside the current product strategy.

A user may search for a match while it is live. That does not authorize claims about video streaming or functionality SportSignal does not provide.

---

## 3. Mandatory repository-first workflow

Before implementation, inspect the actual checked-out repository and production output. Do not rely exclusively on this document or on previous summaries.

1. Read the repository-root `AGENTS.md` and follow its instructions.
2. Inspect the current Git branch, working tree, uncommitted changes and recent relevant commits. Do not overwrite another contributor's work.
3. Inspect the current SEO handoff, decisions, implementation tracker, keyword research, keyword-to-URL map, cannibalization register and the latest SEO session reports. Locate the current authoritative files; paths listed in older documents may have moved.
4. Re-check the current selected-team allowlist and canonical team IDs/slugs.
5. Inspect the existing team-page and match-page rendering paths, metadata builders, FAQ generation, JSON-LD, canonical tags, sitemap inclusion rules and internal-link generation.
6. Inspect current data sources and caching paths. Do not assume a fixture, score, competition or result is present without verifying the data contract.
7. Review the live website's representative Persian pages and compare rendered HTML with the source implementation.
8. Check the current status of all SEO measurement freezes, experiment windows and deployment restrictions before editing any visible, measured surface.

### Previously reported repository research inventory — verify it

Earlier project research was reported to include:

- A 369-row validated keyword collection.
- 198 exact GSC-observed query records.
- 38 Google Autocomplete-validated variations.
- 133 additional research candidates.
- A selected set of 13 club pages.
- A Barcelona-heavy next-match query cluster.

These are **leads to verify**, not permission to assume the files still exist, that the counts remain current, or that the data is complete. Locate the original exports and source documents. Report the actual row counts, dates, definitions and limitations. Do not silently combine, overwrite or relabel the existing keyword dataset.

Previously reported GSC examples included a strong Barcelona/`بارسا` next-match cluster and a Barcelona-versus-Manchester-City query. Verify the exact query, date range, page, clicks, impressions and filters in the source export before using those figures in a decision or report. GSC impressions for SportSignal are not estimates of total Iranian Google search volume.

---

## 4. Priority model and club coverage

The initial working priority is:

- **A++:** Barcelona and Real Madrid.
- **A+:** Bayern Munich, Manchester City, Arsenal, Liverpool, Inter Milan and AC Milan.
- **A:** Paris Saint-Germain, Manchester United, Borussia Dortmund, Atlético Madrid and Chelsea.

These tiers are **implementation priorities**, not claims about nationwide monthly search volume. Reassess them using current first-party GSC evidence, valid autocomplete/SERP evidence, product coverage and the current team-page allowlist.

The current selected-team allowlist is authoritative for dedicated club-page eligibility. The agent must re-read it from the source of truth. Do not add teams to the allowlist, create team pages or broaden the product's coverage as a side effect of alias research.

### 4.1 Initial alias research table

Treat the following as candidate aliases to validate. Preserve the canonical spelling used by the existing product and provider mapping.

| Club | Canonical Persian display name (candidate) | Alias / spelling candidates | Initial priority | Notes |
|---|---|---|---|---|
| FC Barcelona | بارسلونا | بارسا، بارسلونا، بارسلنا | A++ | `بارسا` is a key colloquial candidate; validate each spelling independently. |
| Real Madrid | رئال مادرید | رئال، رئال‌مادرید، رئال مادرید | A++ | `رئال` is a strong contextual alias, but still validate collision handling. |
| Bayern Munich | بایرن مونیخ | بایرن، بایرن‌مونیخ | A+ | Preserve the established Persian display form. |
| Manchester City | منچسترسیتی | من سیتی، منچستر سیتی، منچسترسیتی | A+ | `من سیتی` is an important colloquial form. |
| Arsenal | آرسنال | ارسنال | A+ | Joined spelling and omission of initial alef-with-madda should be treated as a query variant, not a separate page. |
| Liverpool | لیورپول | لیورپول | A+ | No distinct alias assumed without evidence. |
| Inter Milan | اینتر میلان | اینتر، اینترمیلان | A+ | `اینتر` is ambiguous; resolve only with football context/entity evidence. |
| AC Milan | آث میلان | آ.ث. میلان، میلان، آث‌میلان | A+ | `میلان` is ambiguous with the city and other entities. |
| Paris Saint-Germain | پاری سن ژرمن | پاری‌سن‌ژرمن، پاریسن ژرمن، پی‌اس‌جی، PSG | A | Validate Latin acronym and Persian forms. `پاریس` alone is ambiguous. |
| Manchester United | منچستر یونایتد | منچستریونایتد، من یونایتد | A | `منچستر` alone is not a safe alias. |
| Borussia Dortmund | دورتموند | بروسیا دورتموند، بوروسیا دورتموند | A | Validate both common Persian transliterations. |
| Atlético Madrid | اتلتیکو مادرید | اتلتیکو | A | `اتلتیکو` may need context where more than one club/meaning is possible. |
| Chelsea | چلسی | چلسی | A | Verify whether there are any meaningful query variants before adding them. |

The table is not a final accepted alias registry. The implementation must distinguish:

- A verified colloquial alias.
- An observed spelling variation.
- A candidate that needs more evidence.
- An ambiguous phrase that should not be automatically assigned.
- A misspelling that may be useful for research but should not be published as preferred copy.

Do not add a candidate to production normalization merely because it appears in this table.

### 4.2 Additional teams

Do not expand the initial 13-club scope automatically. The agent may document additional clubs as future research candidates only if current GSC, product coverage or an explicit owner decision justifies them. Any allowlist expansion requires a separate, explicit decision and review of operational consequences.

---

## 5. Persian search-intent taxonomy and keyword bank

Research and classify queries by intent. The examples below are expansion seeds, not proof that each exact phrase has search demand. Generate variants only when they are linguistically natural and supported by data or clearly labelled as research candidates.

### 5.1 Club identity and alias intent

Examples:

- بارسا
- بارسلونا
- رئال
- رئال مادرید
- بایرن
- بایرن مونیخ
- من سیتی
- منچسترسیتی
- اینتر
- اینتر میلان
- پی اس جی
- پاری سن ژرمن

Use the alias as an alternate way to refer to the canonical club, not as a separate entity or page.

### 5.2 Next match / next fixture intent

Examples:

- بازی بعدی بارسا
- بازی بعدی بارسلونا
- بازی بعد رئال
- بازی بعدی رئال مادرید
- بازی بعدی من سیتی
- بازی‌های بعدی بایرن
- بازی‌های آینده لیورپول
- برنامه بازی‌های آرسنال
- برنامه بازی‌های اینتر
- نزدیک‌ترین بازی بارسلونا
- بارسلونا امروز بازی دارد
- رئال مادرید امشب بازی دارد

Natural-language formulations to research:

- `[club] کی بازی دارد؟`
- `[club] کی بازی می‌کند؟`
- `بازی بعدی [club] کی است؟`
- `بازی بعد [club] چه زمانی است؟`
- `برنامه بازی‌های [club] چیست؟`
- `بازی بعدی [club] با کی است؟`

### 5.3 Kickoff time and date intent

Examples:

- ساعت بازی بارسلونا امشب
- ساعت بازی بارسا
- بازی بارسا امشب ساعت چند است؟
- بازی رئال مادرید چه ساعتی است؟
- تاریخ بازی بعدی رئال
- بازی بعدی بایرن چه روزی است؟
- ساعت بازی آرسنال فردا
- من سیتی کی بازی دارد؟
- بازی بعدی لیورپول چه زمانی است؟
- ساعت بازی اینتر میلان

Time expressions to research include `امشب`، `امروز`، `فردا`، `دیشب`، `چه روزی`، `چه ساعتی`، `ساعت چند`، `کی` and `چه زمانی`. They must be rendered only when the associated fixture data supports the statement.

### 5.4 Upcoming-fixture and schedule intent

Examples:

- بازی‌های آینده بارسلونا
- برنامه بازی‌های رئال
- بازی‌های پیش‌روی بایرن مونیخ
- برنامه بازی‌های منچسترسیتی
- بازی‌های بعدی آرسنال
- مسابقات آینده لیورپول
- برنامه مسابقات اینتر

Do not manufacture an exhaustive schedule if the page only has a limited fixture window. Make the time range clear where necessary.

### 5.5 Club-versus-club / matchup intent

Examples:

- بازی بارسا با بایرن
- بازی بارسلونا و بایرن مونیخ
- بارسلونا مقابل رئال مادرید
- بازی رئال و منچسترسیتی کی است؟
- ساعت بازی آرسنال و لیورپول
- تاریخ بازی اینتر و میلان
- بازی بعدی لیورپول مقابل بایرن

Research natural connectors and word order:

- `با`
- `و`
- `مقابل`
- `برابر`
- `در برابر`
- Club A before Club B and Club B before Club A, where natural.

Do not generate every mathematical combination of all club aliases. Prioritize actual fixtures that are within SportSignal's coverage, GSC-observed matchups and validated query suggestions. An alias pair must resolve to the same fixture only when the fixture's canonical participants and date/competition identify that exact match.

### 5.6 Competition-qualified club intent

Examples:

- بازی بعدی بارسلونا در لیگ قهرمانان
- بازی بعدی رئال در لالیگا
- برنامه بازی‌های بایرن در بوندسلیگا
- بازی بعدی منچسترسیتی در لیگ برتر انگلیس
- بازی بعدی اینتر در سری آ
- برنامه بازی‌های چلسی در لیگ برتر

Associate a competition phrase with a club only when current competition membership and fixture data support it. A team page can answer a club-plus-competition query; a competition page should own broad competition-only intent. Do not imply a club participates in a competition when it does not.

### 5.7 Completed match / result intent

Examples:

- نتیجه بازی بارسلونا
- نتیجه بازی بارسا و بایرن
- بازی رئال مادرید چند چند شد؟
- نتیجه بازی امشب لیورپول
- نتیجه بازی دیشب آرسنال
- بازی منچسترسیتی برد یا باخت؟

Only answer after a match is confirmed complete and a verified result is available. Do not show a completed-result answer for a postponed, abandoned, not-started or in-progress match. Clearly distinguish full-time, extra time and penalties where the underlying data supports it.

### 5.8 Standings, points, form and recent results

Examples:

- جدول لیگ بارسلونا
- جایگاه رئال مادرید در لالیگا
- وضعیت بارسلونا در جدول
- امتیازات بایرن مونیخ
- عملکرد اخیر آرسنال
- نتایج اخیر لیورپول
- وضعیت اینتر در سری آ
- رده‌بندی تیم‌ها در لیگ قهرمانان

Use existing standings, form and recent-result content. Do not add a new table or duplicate page solely for keyword coverage.

### 5.9 Excluded or unsupported examples

Unless the product has verifiably added the relevant capability, exclude or do not promise:

- پخش زنده بازی بارسلونا
- ساعت پخش زنده
- از کدام شبکه بازی پخش می‌شود؟
- خلاصه ویدیویی بازی بارسلونا
- دانلود خلاصه بازی
- ترکیب احتمالی بارسلونا
- پیش‌بینی نتیجه / شرط‌بندی
- خرید بلیت بازی
- اخبار نقل‌وانتقالات بارسلونا

Record excluded queries in the research file when they appear in data, with a clear exclusion reason. Do not target them with misleading snippets or page copy.

---

## 6. Evidence and research methodology

Each keyword/alias record must have an explicit evidence class:

1. **GSC-observed** — the exact query exists in an identifiable Google Search Console export or authorized current GSC result. Record date range, page, clicks and impressions where available.
2. **Autocomplete-validated** — the exact phrase was returned by an identifiable Google Autocomplete research run. Record locale, date and seed query.
3. **SERP-observed** — the phrase or intent was observed in relevant search results. Record the query, date, locale and relevant result pattern.
4. **Research candidate** — a plausible Persian expansion that has not been validated. It must not be presented as proven demand.
5. **Excluded** — unsupported, misleading, ambiguous or outside the product scope. Record the reason.

### Rules

- Never invent monthly search volume, CPC, keyword difficulty or ranking data.
- If a metric is unavailable, use `not available` or an empty field; do not estimate it from impressions.
- GSC impressions are impressions for SportSignal's own property in a particular date range and filter context. They are not total-market search volume.
- Preserve exact query text as observed. Normalized forms may be stored in separate fields.
- Preserve source file and source row/query references where practical.
- Record data collection date and locale for autocomplete/SERP research.
- Do not overwrite the original validated keyword map or source export. Create additive files and document their relationship to the original dataset.
- Deduplicate only after preserving the original evidence records. Distinct observed queries may normalize to the same canonical intent and should remain traceable.

### Suggested machine-readable columns

`keyword,normalized_keyword,club_id,canonical_club_name,matched_alias,canonical_url,intent,evidence_class,evidence_source,evidence_date,locale,gsc_clicks,gsc_impressions,search_volume,volume_source,priority,ambiguity_status,implementation_status,exclusion_reason,notes`

Use stable club IDs and existing canonical paths from the repository. Do not invent new slugs in the CSV.

---

## 7. Canonical URL and entity rules

### 7.1 One club, one canonical destination

All approved aliases map to the existing canonical club entity and its existing canonical URL.

Illustrative examples only; verify actual slugs in the repository:

- `بارسا` → Barcelona canonical team URL.
- `بارسلونا` → the same Barcelona canonical team URL.
- `رئال` → Real Madrid canonical team URL.
- `رئال مادرید` → the same Real Madrid canonical team URL.
- `من سیتی` → Manchester City canonical team URL.
- `منچسترسیتی` → the same Manchester City canonical team URL.

Do not create alias URLs such as `/teams/barsa`, `/teams/real` or `/teams/man-city` unless a separate, explicitly approved product/URL decision requires them. No such decision is implied by this specification.

### 7.2 Match URLs

Different wordings of the same real, covered fixture should resolve to the same canonical match URL. Do not create hypothetical fixture URLs, alias-specific match URLs or pages for fixtures that do not satisfy the existing coverage/eligibility rules.

### 7.3 Ambiguity and entity resolution

Treat the following as potentially ambiguous:

- `اینتر`: Inter Milan, Inter Miami or another meaning.
- `میلان`: AC Milan or the city/other entity.
- `منچستر`: Manchester City or Manchester United.
- `پاریس`: Paris Saint-Germain or Paris as a city.
- `اتلتیکو`: may require a competition or full-name context.

A normalization function must not map ambiguous short strings globally without context. Prefer exact known entity IDs, full names, competition/fixture context or explicit page context. If safe resolution is impossible, leave the query unresolved rather than assigning the wrong club.

### 7.4 Canonical and indexation integrity

Preserve:

- Existing canonical URL decisions.
- Existing redirect policy.
- Existing index/noindex rules.
- Existing sitemap inclusion rules.
- Existing selected-team eligibility.
- Existing match lifecycle and page eligibility.

Do not create duplicate URLs to target spelling variants. Do not use query parameters, fragments or alternate slugs as keyword landing pages.

---

## 8. Alias data model and normalization design

Inspect the current entity and provider-normalization architecture before choosing an implementation. Prefer a small, static, typed alias map if it fits the existing codebase.

A conceptual record may include:

- Canonical internal club ID.
- Existing canonical provider/entity identity.
- Existing canonical URL/slug.
- Canonical Persian display name.
- Approved primary colloquial alias.
- Approved secondary aliases.
- Alternative spellings.
- Evidence class and source reference.
- Priority.
- Ambiguity status and resolution notes.

### Important separation

SEO alias handling must remain separate from provider identity normalization unless repository inspection proves a shared abstraction is safe. Do not change provider team names, IDs, fixture matching, team canonicalization or URL generation simply to accommodate a Persian query spelling.

### Text normalization

Investigate the safest existing approach to:

- Arabic/Persian `ي` and `ی`.
- Arabic/Persian `ك` and `ک`.
- ZWNJ/half-space versus ordinary space or joined forms.
- Repeated whitespace.
- Punctuation and dots in forms such as `آ.ث.`.
- Persian and Arabic numerals, only where they affect relevant query matching.
- Latin acronyms such as `PSG` when context supports them.

Do not over-normalize in ways that merge different clubs or unrelated words. Preserve the original query text in analytics/research records even if a normalized comparison key is used internally.

---

## 9. On-page content requirements

### 9.1 Canonical names remain primary

Keep the canonical club name in:

- Main H1 and page title, subject to existing SEO experiment rules.
- Official fixture cards and match scoreboards.
- Canonical URLs.
- Primary visible labels.
- Official structured-data `name` values.

Aliases are supporting language, not replacements for the canonical entity identity.

### 9.2 Natural alias inclusion

Where editorially appropriate, include a primary alias naturally in an introductory sentence, short context paragraph or relevant FAQ. Examples of possible phrasing (rewrite to fit the actual page and avoid repetition):

- `بارسلونا (بارسا) در دیدار پیش‌روی خود ...`
- `رئال مادرید که بسیاری از هواداران آن را رئال می‌نامند ...`
- `منچسترسیتی یا من سیتی در بازی بعدی خود ...`
- `بایرن مونیخ در مسابقه بعدی ...`

Do not mechanically inject these exact sentences into every page. If a phrase sounds unnatural, omit it. Use only as many aliases as make the page genuinely clearer to readers.

### 9.3 FAQ usage

FAQ questions may reflect natural search language, for example:

- بازی بعدی بارسا چه زمانی است؟
- رئال مادرید چه روزی بازی دارد؟
- من سیتی در بازی بعدی خود با کدام تیم روبه‌رو می‌شود؟
- نتیجه آخرین بازی بایرن مونیخ چه شد؟

Answers must be driven by current, accurate page data. Do not hardcode a date, time, opponent, competition or score. Reuse the existing FAQ content source and existing rendering/JSON-LD contract; do not create inconsistent duplicate content sources.

Do not add FAQ questions just to repeat synonyms. Keep questions useful, distinct and answerable.

### 9.4 Match-detail pages

A matchup page may use the canonical names in the main heading/scoreboard and natural aliases in supporting copy where useful. Do not enumerate every alias combination. Do not let aliases alter participant identity or fixture matching.

### 9.5 No keyword stuffing or hidden copy

Do not:

- Repeat aliases in lists solely for ranking.
- Add invisible, off-screen or hidden keyword blocks.
- Put huge keyword strings in meta descriptions.
- Create doorway pages for misspellings.
- Add boilerplate FAQs that do not answer a real user question.
- Make unsupported claims about broadcast, highlights, lineups or results.

---

## 10. Metadata and structured data

Before changing metadata, verify current page templates, title/H1 conventions and experiment status.

Potential changes after approval may include a modest, natural alias mention in a description or supporting copy when it improves clarity. Do not append every alias to titles or H1s. Metadata should remain readable and accurately describe page content.

If the existing `SportsTeam` JSON-LD implementation supports `alternateName` appropriately, evaluate adding a small, curated list of approved aliases. Preserve the canonical official `name` and entity identity. Structured data is a semantic aid, not a ranking guarantee; do not promise a rich result or ranking improvement because of it.

Ensure structured data matches visible page content and existing site conventions. Do not add unsupported properties, duplicate entities or misleading FAQ structured data. Preserve the current localization and canonical URL behaviour.

---

## 11. Internal linking and keyword-to-URL mapping

Build or extend a keyword-to-URL map for the selected clubs and relevant covered matches.

Rules:

1. All approved club aliases map to one existing canonical team URL.
2. Club-plus-competition queries map to the existing team page when it answers the query; broad competition queries map to the relevant competition page.
3. Matchup queries map to the existing canonical match page only when that specific fixture is real and eligible.
4. Completed-result queries map to a page that contains a verified final result.
5. Internal links use canonical names as anchor text most of the time. Colloquial anchors may be used naturally where appropriate.
6. Avoid excessive exact-match anchor repetition.
7. Do not cross-link ambiguous short names without enough context.
8. Record conflicts and cannibalization risks instead of resolving them by creating a new page.

One search intent should have one primary canonical destination. Where two existing pages appear to target the same intent, document the conflict and follow the repository's established keyword-to-URL/cannibalization policy.

---

## 12. Measurement freeze and rollout controls

Earlier project context reported a freeze on GSC-measured team-page surfaces through a December 4–8, 2026 measurement gate, with team-page title changes scheduled only after the gate. The agent must verify this against the latest authoritative repository handoff and experiment records.

**Do not treat the dates in this document as an automatic release authorization.** Verify the current gate status and the measurement evidence first.

If the freeze is still active:

- Research, documentation, additive keyword files, code design and safe tests may proceed where they do not alter frozen output.
- Do not change frozen titles, H1s, meta descriptions, visible team-name spellings or other measured page bytes.
- Do not deploy changes that affect frozen surfaces.
- Clearly identify any preparatory code that is not enabled in production.

If the gate has passed:

- Read the final measurement report.
- Record the actual outcome and decision.
- Confirm which surfaces are released for change.
- Make only changes allowed by that decision.
- Preserve the previous baseline and change history.

Check for concurrent agent work, release freezes and deployment coordination before committing or deploying. Do not assume that a date alone means another agent has finished.

---

## 13. Technical and operational constraints

SportSignal has an existing TypeScript/Cloudflare Worker architecture. Verify the current implementation rather than relying on assumptions. Preserve the current framework and rendering architecture.

Do not add:

- New football data-provider calls.
- Per-team or per-match upstream fetches.
- Client-side polling.
- New cron jobs.
- Unnecessary KV reads or writes.
- Duplicate fixture/team data stores.
- Heavy dependencies for a static alias map.
- Framework migrations or broad refactors.
- Expensive computation on every request when a static lookup suffices.

Prefer static, typed, deterministic data and existing page-builder inputs. Preserve current caching, CPU, KV and provider-request constraints. Follow repository rules for generated files, public asset versioning, tests and deployment.

Do not change unrelated UI, match behaviour, notification behaviour, language switching or other features.

---

## 14. Testing and acceptance criteria

Add tests using the repository's existing conventions. At minimum, verify:

### Alias and entity integrity

- Every approved alias maps to exactly one intended canonical club when unambiguous.
- Each approved alias maps to the current canonical team ID and URL.
- Ambiguous aliases are not globally misassigned.
- Unapproved research candidates are not silently enabled in production.
- Normalization handles tested Persian/Arabic character and spacing variants without merging unrelated entities.
- Alias handling does not mutate provider identity or fixture matching.

### URL and indexation integrity

- No alias-specific duplicate team URLs are generated.
- Canonical tags remain correct.
- Redirect, index/noindex and sitemap behaviour remain correct.
- Match aliases resolve only to existing eligible fixtures.
- No hypothetical or ineligible match page is generated.

### Content and data integrity

- Main headings and visible canonical names remain correct.
- Alias copy is natural, limited and not duplicated excessively.
- Dates, times, opponents, competitions and results come from verified current data.
- A completed result is not shown for an upcoming, postponed, abandoned or in-progress fixture.
- FAQ visible content and structured data remain synchronized under the existing implementation contract.
- Structured data uses the canonical entity name and only supported alternate names.

### Regression and localization

- Persian RTL output remains correct on desktop and mobile.
- English/LTR pages and language switching remain unchanged.
- Existing fixture, standings, recent-form, results and match-detail functionality remains intact.
- Existing cache and resource constraints are preserved.
- Frozen title/H1/meta output remains unchanged while the gate is active.

Run the repository's established test suite and type checks. Previously referenced commands included `npm test` and `npx tsc --noEmit`; verify package scripts and project instructions before using them. Follow the current smoke-test and production-verification process. Do not claim tests passed unless they were actually run and the output was inspected.

---

## 15. Deliverables

### A. Research report

Create a dated report containing:

- Actual repository/GSC source files used.
- Data date ranges and locale.
- Verified club alias dictionary.
- GSC-observed queries and page mappings.
- Autocomplete/SERP observations.
- Research candidates and excluded queries.
- Intent clusters and representative Persian phrases.
- Ambiguous terms and their handling.
- Priority rationale.
- Gaps and uncertainties.

### B. Additive machine-readable keyword data

Create a new CSV rather than overwriting existing source files. Use the suggested columns in Section 6, adapting names only when the repository has an established schema. Preserve traceability to original records.

### C. Implementation

Subject to the measurement gate and repository decisions:

- A maintainable alias dictionary or extension to the existing equivalent.
- Safe alias resolution with ambiguity handling.
- Natural alias coverage in relevant existing Persian pages.
- FAQ improvements only where useful and answerable.
- Appropriate structured-data enhancement if supported.
- Internal-link and keyword-to-URL updates.
- Regression tests.

### D. Final implementation report

Report:

- What was inspected.
- What already existed.
- What was missing.
- Which aliases were accepted, deferred or excluded.
- Which intents gained coverage.
- Which canonical URLs are affected.
- Files changed.
- Tests actually run and results.
- Freeze/gate status and how it was respected.
- Deployment/commit status.
- Known limitations and next steps.

---

## 16. Working principles

- Inspect before assuming.
- Verify current repository facts before relying on this document's historical notes.
- Extend before duplicating.
- Evidence before keyword decisions.
- One entity and one intent destination; no alias doorway pages.
- Natural Persian before keyword density.
- Accurate football information before SEO claims.
- Preserve the selected-team allowlist and current product scope.
- Preserve unrelated features and concurrent contributors' work.
- Keep the implementation small, maintainable and resource-conscious.
- Be explicit about uncertainty and unavailable search-volume data.
- Do not deploy or change frozen SEO surfaces without the required gate approval.

**Definition of done:** an Iranian football fan can search using a supported colloquial or canonical club name and find the correct, genuinely useful SportSignal team or match page, without creating duplicate pages, misleading promises or regressions.
