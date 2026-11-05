# SportSignal — SEO/GEO Phase 2 Spec: the 100%-compliance program (SS-01 … SS-27)

**Lineage:** Phase 1 spec = `docs/SPORTSIGNAL_SEO_GEO_SPEC.md` (implemented, report in
`SEO_IMPLEMENTATION_REPORT.md`). The 2026-11-05 live audit (273 sitemap URLs, 22 crawler
UAs, machine files, headers, DNS, full `src/seo/` review — evidence:
`docs/history/2026-11-05-seo-audit/`) found the baseline verified-good and cataloged
**26 gaps (SS-01…SS-26)**. The owner then added one more rule (**SS-27, the Shamsi
calendar display rule**, below). This spec is the single source of truth for closing all
27 and is updated at every session checkpoint.

**Mission:** 100% compliance with classic SEO, GEO (Generative Engine Optimization) and
AI-SEO — so that ChatGPT, Perplexity, Google AI Overviews, Gemini and Claude can cite
and recommend SportSignal for Persian football fixtures — with zero regressions to the
bot, cron, admin or API surfaces.

**Working mode (owner directive, 2026-11-05):** the program runs over **multiple
sessions** (S1…S6 below), ordered by priority. The agent works autonomously inside a
session, **committing + pushing + deploying at mid-session and end-of-session
checkpoints** so nothing is ever lost, and at the end of each session hands the owner a
**prompt for the next session** generated from this spec (§6).

---

## 0) Read-first list (every session, before touching anything)

1. `AGENTS.md` — repo rules (credentials discipline, push protocol, gates).
2. This spec: §1 (governing rules), §3 (this session's gap register rows), §5 (tracker —
   what is already DONE, never redo it), §4 (session protocol).
3. Latest note in `docs/history/` (session hand-offs + live-verification evidence).
4. `RUNBOOK.md` for deploy/rollback.

---

## 1) Governing rules (non-negotiable, every session)

1. **Never invent data.** Every fact on a page comes from the KV pool/payload or a
   verifiable source. No made-up URLs, emails, quotes or stats. Unverifiable → omit.
2. **Persian typography**: Persian ی/ک, ZWNJ, Persian digits ۰-۹ in all UI text; Latin
   names inside `<bdi dir="ltr">` where the pattern already does this.
3. **CALENDAR_DISPLAY_v2 (SS-27, owner rule 2026-11-05):**
   - **Persian (fa) surfaces → Shamsi (Jalali) date FIRST, Gregorian in parentheses.**
     Canonical shapes (helpers live in `src/seo/utils.ts`: `toJalali`, `jalaliDateStr`,
     `jalaliWeekdayStr`; extend with the D-shapes below as needed):
     - **D1 full line** (H1 suffixes, dategroup headers, answer sentences):
       «شنبه ۱۵ آبان ۱۴۰۵ (۵ نوامبر ۲۰۲۶)» — Jalali weekday + day + month + year,
       Gregorian day + month + year in parens.
     - **D2 compact** (row kickdate, tiles, cards): «۱۵ آبان (۵ نوامبر)» — no year;
       add year only when the Gregorian year differs from the current Tehran year.
     - **D3 meta `<title>`**: Shamsi short + Gregorian short parens when the assembled
       title stays ≤ 65 chars after the SS-10 trim ladder (drop Gregorian parens → drop
       brand → shorten competition name, in that order). H1 always carries both.
   - **English (en) surfaces → Gregorian only, no Shamsi anywhere** (llms.txt,
     llms-full.txt, `enDate()` hints, `<time>` title attributes).
   - **Machine formats stay ISO-8601 Gregorian, untouched**: JSON-LD dates
     (SportsEvent.startDate etc.), `<time datetime>`, sitemap `<lastmod>`, feed.xml,
     calendar.ics, `/api/matches.json`, HTTP headers.
   - **SSR/client mirror agreement is mandatory**: any date shape change in
     `src/seo/*` must be mirrored byte-for-byte in the client render
     (`src/pages/public.ts` + the `assets/public-13.x.js` asset — bump the asset
     version per the public-13.62→13.63 precedent) so the payload-signature
     handshake (PF-06) keeps passing.
4. **KV write discipline**: STATE namespace lives under the account free-tier write
   quota. Any new KV write path must be change-only and bounded (the
   `computeLastmods` / `seo_lastmod_v1` pattern in `src/seo/files.ts`).
5. **CPU discipline**: SEO HTML is edge-cached (`SEO_PAGE_TTL`); no unbounded
   per-request work, no provider fetches on the HTML path. `getSeoCtx` stays the one
   KV read (+ pool).
6. **Versioned releases**: every change ships under an incrementing tag
   (`v13.211-<name>`, `v13.212-<name>`, … — take the next free number at commit time),
   `package.json` version bumped, one dated `CHANGELOG.md` entry per tag, and
   `SEO.CONTENT_VERSION` bumped **only** when hand-written page text changes.
7. **Do not break**: Telegram webhook (`/webhook` on `football.sportsignal.ir`),
   `/admin`, `/api/*`, cron, bot. The SEO router returns `null` for non-SEO paths.
8. **Gates before every deploy**: `npm test` (TypeScript + full check-* suite) green;
   after every deploy: `npm run seo:check` green against production + the per-item
   curl acceptance checks.
9. **Credentials**: never in the repo, logs, commit messages or this spec. The owner
   re-supplies per session. Push one-shot
   (`git push https://x-access-token:<TOKEN>@github.com/assadigit/SportSignal.git main`),
   never persist tokens in git config; verify with `git ls-remote`, not the stale
   tracking ref. Deploy with `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` passed as
   env vars to the single `npx wrangler deploy` invocation only.

---

## 2) Verified-good baseline (2026-11-05 audit — do NOT re-audit or regress)

- 273/273 sitemap URLs 200, unique titles/descriptions, self-canonical, one H1, valid
  JSON-LD, OG+Twitter complete, `lang="fa" dir="rtl"`, zero missing alt.
- All 22 crawler UAs admitted (GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot/-Web/-User,
  anthropic-ai, PerplexityBot/-User, Google-Extended, Applebot(-Extended), Bytespider,
  CCBot, Amazonbot, meta-externalagent, DuckAssistBot, Googlebot, bingbot, YandexBot,
  MistralAI-User, cohere-ai).
- Hosts/redirects clean (http→https, www→apex, trailing slash, `/public`,
  football. subdomain→apex, workers.dev disabled); machine files all 200 (robots,
  sitemap index + 5 children, llms.txt, feed, ics, matches.json, security.txt,
  BingSiteAuth, IndexNow key, webmanifest, favicons, OG PNGs).
- Headers: HSTS, CSP, XFO DENY, nosniff, referrer-policy, permissions-policy, HTTP/2 +
  brotli + h3, ETag/304, `s-maxage=60, swr=300` on HTML, immutable assets.
- GSC DNS-verified + indexed. Lighthouse: SEO 100 / A11y 96-100 / BP 96; perf desktop
  99, **home mobile 62-71 (LCP 6.4 s) — the only perf concern (SS-20)**.
- JSON-LD inventory valid everywhere (Organization+WebSite+WebPage+SportsEvent+
  BreadcrumbList on matches; +SportsTeam/ItemList on teams; +SportsOrganization on
  competitions; CollectionPage+ItemList on hubs). SportsEvent startDate uses `+03:30`.

---

## 3) The gap register (SS-01 … SS-27)

Format: **ID — gap (priority).** Evidence → Files → Fix spec → Acceptance. Items are
grouped by the session that owns them (§4). Status lives in the tracker (§5).

### P0 — content correctness

**SS-01 — Time hubs under-list matches (CRITICAL).**
- **Bug**: `/matches/today` + `/matches/tomorrow` render the empty state
  («مسابقه‌ای در راه نیست») and `ItemList numberOfItems: 0` whenever no *big* match
  (top-3 / derby / featured per `isBigForSeo`) falls on that Tehran day, while
  followed-team fixtures DO exist that day and appear on team/competition pages
  (evidence: 2026-11-05 Monaco–Nordsjaelland 23:30 Tehran, 2026-11-06 Everton–Coventry;
  both hubs showed zero — captured in Google's cache).
- **Files**: `src/seo/data.ts` (new selector), `src/seo/pages.ts` `buildHub` +
  `buildTodayPage/buildTomorrowPage/buildThisWeekPage/buildWeekendPage` + `hubTiles`.
- **Fix spec**: the KV pool (`matches_v13_tracked`) is already scoped to followed-team
  fixtures (providers.ts fetches followed-team matches) — it IS the universe team/comp
  pages use. Add `upcomingFollowed(ctx)` to `src/seo/data.ts`: same shape as
  `upcomingBig` (horizon 92d, `PLAYABLE_FUTURE`) but WITHOUT the big filter; sort big
  first (`isBigForSeo || s.big` → 0/1), then live-first, then kickoff time. `buildHub`
  switches its source to `upcomingFollowed(ctx).filter(def.filter)`. Big matches keep
  their badges (`.topbadge`/`.derbybadge` render from `s.big` in `mrowHtml`, which
  already handles non-big rows — team pages prove it). Answer sentence counts ALL
  listed matches («X بازی امروز در برنامه است»), names the top fixture
  («بزرگ‌ترین» when it is big, else «نزدیک‌ترین»), and may add «(Y بازی بزرگ)».
  De-«بزرگ» the hub titles/descs/tiles that now list everything (this-week/weekend
  titles «بازی‌های بزرگ فوتبال این هفته» → «بازی‌های فوتبال این هفته»; hubTiles
  descriptions likewise). `/matches` (the big-matches listing) stays `upcomingBig`
  unchanged. Empty state only when the pool genuinely has zero followed-team matches
  in the window.
- **Acceptance**: on a day with only non-big followed matches, `/matches/today` lists
  them; `ItemList.numberOfItems` == visible row count == answer-sentence count; big
  matches sort first with badges; `npm test` + `seo:check` green; live curl shows the
  day's real fixtures.

**SS-02 — Tomorrow hub H1 shows today's date (CRITICAL).**
- **Bug**: `buildHub` stamps every hub H1 with the render-time date; the tomorrow page
  title says «فردا — ۶ نوامبر» while the H1 says «فردا — ۵ نوامبر» (visible in
  Google's cache).
- **Files**: `src/seo/pages.ts` `HubDef` + `buildHub` + the four hub builders.
- **Fix spec**: add `anchor?: string` (ISO instant) to `HubDef`; `buildHub` uses
  `def.anchor ?? nowIso` for the H1 date. today → `now`; tomorrow → its own tomorrow
  instant; this-week → `now`; weekend → `win.start` (the Saturday). Add a seo-check
  assertion (hub title date token == H1 date token for today/tomorrow).
- **Acceptance**: live `/matches/tomorrow` H1 date == title date == actual Tehran
  tomorrow; `/matches/today` H1 == today; seo-check assertion green.

**SS-27 — Shamsi-first calendar display on all Persian surfaces (owner rule).**
- **Bug**: Persian pages render Gregorian as the primary date with Jalali in parens
  (e.g. hub H1 «— ۵ نوامبر ۲۰۲۶ (۱۵ آبان ۱۴۰۵)», `.mkickdate`, dategroup headers,
  match H1 `… ، ۲۸ اکتبر ۲۰۲۶` Gregorian-only) — inverted for the Iranian audience,
  and inconsistent across surfaces.
- **Files**: `src/seo/utils.ts` (add D1/D2 helpers: e.g. `faDateD1(iso)` = «شنبه ۱۵
  آبان ۱۴۰۵ (۵ نوامبر ۲۰۲۶)», `faDateD2(iso)` = «۱۵ آبان (۵ نوامبر)»; keep the old
  helpers for EN/machine paths); call sites: `src/seo/pages.ts` (hub H1/titles/answers
  L457/469/482/512/443, dategroup header L361, `.mkickdate` L134, match H1 L263,
  matches-page answer/desc L396/401, team/comp tiles L530/702, homepage hero/lists),
  `src/seo/markup.ts` (kickdate L391, `faHeroDate` usages, `lastUpdatedHtml`),
  `src/seo/pages-static.ts` (any fa dates), `src/seo/page-shell.ts` (footer), `src/seo/files.ts`
  (per-match OG PNG date text, if it renders a date — verify; llms.txt/feed/ics stay
  Gregorian per rule 3), plus the client mirrors `src/pages/public.ts` +
  `assets/public-13.x.js` (fmtHeroDate and friends — update both sides, bump asset
  version, keep PF-06 byte-for-byte agreement).
- **Fix spec**: apply CALENDAR_DISPLAY_v2 (§1.3) at every fa call site; en surfaces and
  machine formats untouched. Grep
  `faGregorianDate|faHeroDate|jalali|mkickdate|kickdate|dategroup` across `src/` +
  `assets/public-13.*.js` to find every site — the list above is the known map, not
  necessarily exhaustive. Watch the SS-10 ≤65-char title budget (D3 ladder).
- **Acceptance**: fresh sweep shows Shamsi-first + Gregorian parens on all fa pages
  (hubs, matches, teams, comps, statics, homepage); en/machine formats unchanged; SSR
  == client render (no hydration mismatch in the payload-signature check); titles
  still ≤ 65; `npm test` + `seo:check` green.

### P1 — indexation + GEO core

**SS-03 — Paginated `/matches` pages unindexable.** `?page=2/3` return 200 with
distinct content but canonical to `/matches` and duplicate its title.
Files: `src/seo/pages.ts` `buildMatchesPage`. Fix: for `page ≥ 2` canonical =
`https://sportsignal.ir/matches?page=<n>` (self-referencing), title gains « — صفحه ۲»
(Persian digits) before the brand, `og:url` follows canonical; `?page=1`/no param keep
canonical `/matches`. Acceptance: live curl of `?page=2` shows param canonical +
distinct title; `?page=1` still canonicals to `/matches`; seo-check asserts it.

**SS-04 — Organization.sameAs missing (entity island).** Files: `src/seo/jsonld.ts`
`organizationNode()` + `src/seo/config.ts`. Fix: `SEO.ORG_SAMEAS` config array =
`["https://t.me/SportSignalAlertsBot"]` (real, owned, live) consumed by
`organizationNode`; owner appends future profiles there without touching jsonld.ts.
Acceptance: every page's graph carries sameAs; seo-check T-01-style assertion.

**SS-05 — Team/competition entity grounding (highest-leverage GEO item).** Files:
`src/seo/jsonld.ts` `sportsTeamNode()/sportsOrganizationNode()` + new static map
`src/seo/entity-links.ts` (keyed by canonical English team name, provenance comments,
no render-time fetching). Fix: `sameAs` = [English Wikipedia article, optional
Wikidata entity] — **only URLs verified to exist** (fetch-and-confirm during the
session; rule §1.1 — no guessed URLs). Batch 1: the 6 competitions + the 20
highest-traffic teams; batch 2+ in later sessions. Unverifiable teams omit sameAs.
Acceptance: sampled pages carry sameAs links that all return 200; seo-check validates
map URLs against the live pages.

**SS-06 — FAQ content + FAQPage schema (AI-answer surface).** Files:
`src/seo/pages-static.ts` (methodology/about/data) + `src/seo/pages.ts` (hubs —
dynamic answers e.g. «چه بازی‌هایی امروز است؟» naming the day's real matches) +
`faqNode()` in `src/seo/jsonld.ts`. Fix: 4–6 real Persian Q&As per page, factual from
real data, visible text == FAQPage JSON-LD text exactly. Code comment: FAQ rich
results retired by Google (2023) — this is for AI citations. Acceptance: visible FAQ +
matching node on statics + hubs; hub answers reflect live data; no invention.

**SS-07 — llms.txt minimal; no llms-full.txt.** Files: `src/seo/files.ts`
(`buildLlmsTxt` + new `buildLlmsFullTxt`) + `src/seo/router.ts`. Fix: llms.txt adds
missing pages (/matches/tomorrow, /matches/this-weekend, /about, /contact, /privacy,
/terms, /sitemap), a brand/entity block (name, what the site is, Telegram bot URL),
data-update cadence. llms-full.txt: the full version — per-page-group descriptions
(match page contents, team page contents), full machine-data docs (matches.json
fields, ics, atom), football-data.org attribution, distilled FAQ. `text/plain;
charset=utf-8`, edge-cached. All content Gregorian-only (rule §1.3). Acceptance: both
200; every listed URL exists (seo-check link-validates llms entries).

**SS-08 — Site-wide data-source attribution.** Files: `src/seo/page-shell.ts`
(footer). Fix: every SEO page footer gains «منبع داده: football-data.org» linked to
`https://www.football-data.org/` (config has DATA_SOURCE_NAME/URL), small + secondary
color, below the fold. Acceptance: sweep shows it on all page types; valid HTML; no
CLS impact.

**SS-09 — Undeliverable security email (no MX).** Files: `src/seo/files.ts`
`buildSecurityTxt()` + contact page in `pages-static.ts` + `OWNER_TODO.md`. Fix (code
side): remove `mailto:security@sportsignal.ir` until mail exists; list working
channels (Telegram bot contact + note); OWNER_TODO documents the two options
(Cloudflare Email Routing free → security@ alias, or another deliverable address).
Acceptance: security.txt has no undeliverable address; OWNER_TODO updated with exact
dashboard steps.

### P2 — on-page & structured-data polish

**SS-10 — 13 match titles 66–74 chars (pixel-truncation risk).** `buildMatchPage`
title assembly: if > 65, drop brand suffix; if still > 65, competition → short Persian
name. Acceptance: fresh sweep zero titles > 65 (seo-check gate tightened from 75 →
report-mode at 65).
**SS-11 — 85 match descriptions 166–175 chars.** Trim template: drop the stadium
clause when it would exceed 165 (keep the UTC clause). Acceptance: sweep max 165.
**SS-12 — Two different 404s.** `src/seo/router.ts` (~L757 fallback): serve the full
`build404Page` for ALL 404s (unknown paths currently get a 647-byte minimal page),
keep noindex meta + `X-Robots-Tag: noindex, nofollow`. Acceptance: `/zzz-unknown`
returns the full 404 with nav links.
**SS-13 — `/teams` + `/competitions` lack ItemList.** Add ItemList of child links in
`buildTeamsIndexPage`/`buildCompetitionsIndexPage`. Acceptance: both carry ItemList
with correct counts.
**SS-14 — `/data` lacks Dataset schema.** Add Dataset node (name, description,
creator → Organization @id, distribution → DataDownload for matches.json / ics /
feed.xml with real media types + URLs, honest license/isAccessibleForFree) in
`buildDataPage`.
**SS-15 — SportsEvent.image uses generic OG.** Point `sportsEventNode().image` at
`absUrl("/og/match-<slug>.png")`.
**SS-16 — feed.xml restamps every entry `<updated>` per build.** Use the per-URL
lastmod map (`seo_lastmod_v1` family) for entry `updated`, fallback to the match's own
change timestamp; feed-level `<updated>` may stay the epoch.
**SS-17 — calendar.ics VEVENTs lack DTEND.** DTEND = kickoff + 2h with a comment
documenting the assumption (source carries no end time).
**SS-18 — `/admin` has no `X-Robots-Tag`.** Add `X-Robots-Tag: noindex, nofollow` to
admin responses (keep robots.txt Disallow).
**SS-19 — (optional) retired team pages 404.** Prefer **410 Gone** when the slug
matches the known retired-team pattern, IF it adds no KV read on the 404 path; else
keep plain 404. Do not add per-404 KV reads.

### P3 — performance + owner actions

**SS-20 — Home mobile LCP 6.4 s (hero background media).** Preference order:
(1) `fetchpriority="high"` preload of the hero poster/LCP image on mobile; (2) static
hero image on mobile instead of video/large art; (3) owner-approved hero redesign.
Measure with the repo lighthouse harness before/after; target LCP < 2.5 s mobile lab
or a documented owner decision.
**SS-21 — GSC: submit `https://sportsignal.ir/sitemap.xml`, watch Coverage + CWV**
(DNS verification already live). Owner task; keep OWNER_TODO exact click-paths current.
**SS-22 — Bing Webmaster Tools: add site (BingSiteAuth.xml live), submit sitemap.**
Owner task.
**SS-23 — Analytics decision.** Cloudflare Web Analytics is CSP-pre-allowed
(`static.cloudflareinsights.com`); Plausible/GoatCounter need a CSP edit if chosen.
**SS-24 — Owner review of /privacy + /terms; confirm contact details (ties to SS-09).**
**SS-25 — Once traffic accrues, GSC CWV report becomes the acceptance gate for SS-20.**
**SS-26 — When social profiles exist: append to `SEO.ORG_SAMEAS` (SS-04) + add
`twitter:site`.**

---

## 4) Session plan (priority order; boundaries S4/S5 are capacity-flexible)

| Session | Theme | Items (in-session order) | Checkpoints |
|---|---|---|---|
| **S1** | Hub content truth (P0) | Spec creation + audit evidence into repo; **SS-01**; **SS-02** | CP1 after SS-01 (commit+push+deploy+verify); CP2 after SS-02 (same) |
| **S2** | Calendar truth + indexation basics | **SS-27** (Shamsi-first, incl. client mirrors); **SS-03**; **SS-04**; **SS-08** | CP1 after SS-27; CP2 after SS-03; CP3 after SS-04+SS-08 |
| **S3** | Entity grounding + LLM files | **SS-05** batch 1 (6 comps + top-20 teams, verified only); **SS-07** (llms.txt + llms-full.txt); SS-05 batch 2 if capacity | CP1 after SS-05 b1; CP2 after SS-07 |
| **S4** | AI-answer surfaces + trust + schema | **SS-06** (FAQ + FAQPage); **SS-09**; **SS-12**; **SS-13**; **SS-14** | CP1 after SS-06; CP2 after SS-09+SS-12; CP3 after SS-13+SS-14 |
| **S5** | Meta/machine polish | **SS-10**; **SS-11**; **SS-15**; **SS-16**; **SS-17**; **SS-18**; **SS-19** (optional) | CP1 after SS-10+11 (sweep gate); CP2 after SS-15–18; CP3 after SS-19 |
| **S6** | Performance + owner + program close | **SS-20** (lighthouse before/after); SS-21–26 OWNER_TODO refresh; **final full-sitemap sweep** (audit method, fresh evidence); Phase-2 section in `SEO_IMPLEMENTATION_REPORT.md`; program close-out note | CP1 after SS-20; CP2 final sweep + docs |

Rules: items may be pulled forward if a session has capacity, never pushed past their
session without a note in the tracker; if context runs low mid-session, stop at the
next safe point, checkpoint, and hand off a continuation prompt.

---

## 5) Tracker (update at every checkpoint; statuses: OPEN → DONE → VERIFIED → OWNER)

| ID | Gap (short) | Session | Status | Tag | Evidence |
|---|---|---|---|---|---|
| SS-01 | Hubs under-list matches | S1 | VERIFIED | v13.211-hubtruth | live 2026-11-05: /matches/today 18 rows (was 0), noi==rows==answer 18; T-14 green |
| SS-02 | Tomorrow H1 wrong date | S1 | VERIFIED | v13.211-hubtruth | live 2026-11-05: tomorrow title/H1 both «۶ نوامبر ۲۰۲۶»; T-14 green |
| SS-27 | Shamsi-first display rule | S2 | VERIFIED | v13.212-shamsifirst | live 2026-11-05: T-15 sweep green (hubs/match/teams/comps/homepage); en+machine unchanged; SSR==client byte-verified |
| SS-03 | Pagination canonicals | S2 | VERIFIED | v13.213-pagecanon | live 2026-11-05: ?page=2 self-canonical + og:url + «— صفحه ۲» title; ?page=1 → /matches; T-16 green |
| SS-04 | Organization.sameAs | S2 | VERIFIED | v13.214-sameas | live 2026-11-05: every page graph carries sameAs=[t.me/SportSignalAlertsBot]; T-17 green |
| SS-05 | Team/comp entity links | S3 | VERIFIED (batches 1+2) | v13.216-entitylinks + v13.218-entitylinks2 | live 2026-11-06: 40 teams + 6 comps grounded, all URLs fetch-and-confirmed; T-18 green (193/0) |
| SS-06 | FAQ + FAQPage | S4 | VERIFIED | v13.219-faq | live 2026-11-06: T-20 green (3 statics + 4 hubs, byte-identical visible↔node; today-hub answer 36==rows==noi with real fixtures named) |
| SS-07 | llms.txt + llms-full.txt | S3 | VERIFIED | v13.217-llmsfull | live 2026-11-06: both files 200 text/plain UTF-8; 44 links validated; T-19 green |
| SS-08 | Footer attribution | S2 | VERIFIED | v13.215-attribution | live 2026-11-05: «منبع داده: football-data.org» on all page types; T-03 sweep green |
| SS-09 | security.txt email | S4 | VERIFIED | v13.220-secremail | live 2026-11-06: no mailto, Telegram Contact + Remarks; OWNER_TODO §12 Email Routing path; T-21 green |
| SS-10 | Title lengths ≤65 | S5 | VERIFIED | v13.222-titlesweep | live 2026-11-06: T-23 full sweep — 279 titles ≤65 (max 65), zero 66–75 band, all unique |
| SS-11 | Description ≤165 | S5 | VERIFIED | v13.222-titlesweep | live 2026-11-06: T-23 full sweep — 279 descs 50–165 (max 165); UTC clause never drops |
| SS-12 | One full 404 | S4 | VERIFIED | v13.220-secremail | live 2026-11-06: /zzz-unknown + deep + route-family 404s all serve the full 22KB shell, noindex meta + X-Robots-Tag; pure render (no KV on 404 path); T-21 green |
| SS-13 | ItemList on indexes | S4 | VERIFIED | v13.221-indexschema | live 2026-11-06: /teams 93==tiles + /competitions 7==tiles child-link ItemLists, sampled children 200; T-22 green |
| SS-14 | Dataset on /data | S4 | VERIFIED | v13.221-indexschema | live 2026-11-06: Dataset node — creator in-graph, isAccessibleForFree true, license /terms, 3 DataDownloads with live content-type match; T-22 green |
| SS-15 | SportsEvent.image per-match | S5 | VERIFIED | v13.223-machpolish | live 2026-11-06: T-23 — 166 match pages per-match OG in SportsEvent.image; 5 sampled PNGs 200 image/png |
| SS-16 | feed entry lastmod honesty | S5 | VERIFIED | v13.223-machpolish | live 2026-11-06: T-24 — all feed entries' <updated> == same-URL sitemap lastmod (curl-exact on 2); map-miss → data epoch (report mode) |
| SS-17 | ics DTEND | S5 | VERIFIED | v13.223-machpolish | live 2026-11-06: T-24 — all 87 VEVENTs DTEND == DTSTART+2h (curl-exact) |
| SS-18 | /admin X-Robots-Tag | S5 | VERIFIED | v13.223-machpolish | live 2026-11-06: T-24 — X-Robots-Tag on /admin(200)+/admin/login(302/401)+unknown(401); robots Disallow kept |
| SS-19 | 410 for retired teams | S5 | SKIPPED (optional; spec fallback) | — | honest 410 needs a 404-path KV read (archive) — forbidden by the item itself; SS-12 plain 404 stays (see 2026-11-06-s5 note) |
| SS-20 | Mobile LCP 6.4 s | S6 | OPEN | — | lighthouse harness |
| SS-21 | GSC sitemap submit | S6 | OWNER | — | OWNER_TODO.md |
| SS-22 | Bing WMT | S6 | OWNER | — | OWNER_TODO.md |
| SS-23 | Analytics decision | S6 | OWNER | — | OWNER_TODO.md |
| SS-24 | Privacy/terms review | S6 | OWNER | — | OWNER_TODO.md |
| SS-25 | CWV field gate | S6 | OWNER | — | OWNER_TODO.md |
| SS-26 | Social profiles → sameAs | S6 | OWNER | — | OWNER_TODO.md |

---

## 6) Session protocol + next-session prompt template

### 6.1 Protocol (every session)

1. **Boot**: read §0 list; `git fetch` + rebase if origin moved (owner sometimes
   pushes via web UI).
2. **Implement** this session's items in order. After each item: `npm test` (offline
   gates) + targeted local checks.
3. **Checkpoint** (= nothing gets lost): commit per tag (version bump + CHANGELOG
   entry) → one-shot push → `CLOUDFLARE_API_TOKEN=… CLOUDFLARE_ACCOUNT_ID=… npx
   wrangler deploy` → `npm run seo:check` against prod + the item's curl acceptance →
   append evidence (command + output digest) to the session's `docs/history/` note →
   update tracker (§5) + push.
4. **Minimum two checkpoints per session** (mid + end), more per the session table.
   A docs-only checkpoint (spec/tracker/OWNER_TODO) commits + pushes but need not
   redeploy.
5. **End of session**: write the `docs/history/<date>-s<N>-closeout.md` note (items
   done, tags, evidence digest, deviations), update this spec's tracker, push, and
   hand the owner the next-session prompt (below) in chat.
6. **Rollback** if a deploy breaks something: RUNBOOK.md procedure, then fix forward.

### 6.2 Next-session prompt template (fill from this spec; NEVER include credentials)

```md
# NEW SESSION — SportSignal SEO/GEO Phase 2: Session <N> (<theme>)

Repo: github.com/assadigit/SportSignal (Cloudflare Worker `ucl-notifier`,
https://sportsignal.ir, Telegram bot @SportSignalAlertsBot). Read AGENTS.md first,
then `docs/SPORTSIGNAL_SEO_GEO_SPEC_PHASE2.md` §1 (rules), §3 (this session's items),
§5 (tracker — never redo DONE/VERIFIED items), §4/§6 (protocol), and the latest
`docs/history/` note.

## State
- Last deployed tag: <tag>. Working tree clean on main at <sha>.
- Done so far: <items + tags>. In progress: <…>. Remaining: <…>.

## This session's items, in order
<item IDs with the fix spec + acceptance from §3, plus any session-specific notes
from the previous close-out>

## Protocol reminders
- Gates: npm test before every deploy; npm run seo:check + item curl checks after.
- Checkpoints: commit (tag + CHANGELOG) → push one-shot → wrangler deploy → verify →
  evidence into docs/history note → tracker update → push. Minimum mid + end.
- Calendar rule §1.3 applies to any new Persian text. Machine formats stay ISO.
- Credentials: supplied by the owner in chat; never in repo/logs/commits.

## Definition of done for this session
<the session's items VERIFIED live + evidence logged + tracker/spec/history updated
+ next-session prompt handed over>
```

---

## 7) Program definition of done (all sessions)

1. SS-01…SS-20 VERIFIED live with evidence; SS-21…SS-26 either done or parked in
   OWNER_TODO.md with exact click-paths (owner actions).
2. Final full-sitemap sweep (the audit's method): zero titles > 65, zero descriptions
   > 165, zero canonical mismatches, one H1 per page, all schema nodes present and
   valid, Shamsi-first everywhere in fa, Gregorian-only in en.
3. `npm test` + `npm run seo:check` green locally and against production.
4. Zero regressions: webhook, admin, bot, cron, /api/* untouched; KV write volume
   unchanged except bounded change-only paths; no new per-request provider fetches.
5. Docs current: CHANGELOG (one entry per tag), SEO_IMPLEMENTATION_REPORT.md Phase-2
   section mapping SS-01…SS-27 → status, OWNER_TODO.md, this spec's tracker final.
