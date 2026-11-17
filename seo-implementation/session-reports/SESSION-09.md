# SEO Program Session 09 — Competition Pages, Date Pages and Empty States

> Agents: read AGENTS.md in the repo root first, and follow it for this whole task.

- **Date:** 2026-11-17
- **Version shipped:** `13.265.0-competitions` (`package.json` `13.265.0.0`)
- **Live before:** `13.264.0-teampages` (Session 8, deployment `b313aada-04cf-4c0d-bdc9-2ca7527114dd` @100%)
- **Status:** Completed / deployed (versioned). The KV read quota is STILL exceeded (pre-existing, NOT a code issue — self-heals at UTC midnight).

## 1. Objective and scope

The competition-page session of the 15-session SEO program: the
`/competitions/{slug}` family (keyword map §2.8-2.13; 7 live competition
pages: PL, PD, SA, FL1, BL1, UCL, DFB-Pokal) + the date hub pages
(`/matches/today`, `/matches/tomorrow`, `/matches/this-week`,
`/matches/this-weekend`) + the empty-state behavior. Sessions 1-8 produced the
audit, the validated keyword map, the approved architecture blueprint, the
deployed crawl/index foundation (C1/C6/C8 live), the match-URL lifecycle
mechanism (shipped INERT), the homepage one-month window + carousel
crawlability + curated-selection promise, the match-detail footer-hook
team-link gating + the metadata audit, and the selected-club team-page @graph
WebPage node + the check-seo-teampages.js gate.

The Dec 4-8 measurement freeze applies to the competition-page title/H1 bytes
(the actual byte change is a post-Dec-4 decision with a fresh GSC export —
Session 9 owns them but defers the bytes). Per the keyword map §2.8-2.13:
"live pattern «{لیگ} — برنامه بازی‌های بزرگ پیش‌رو | اسپرت سیگنال» + standings
table + answer sentence with next big match. Keep; the curated framing
(«بازی‌های بزرگ پیش‌رو») is the differentiator vs the full-coverage
competitors. No change before the gates."

## 2. Findings (the competition-page + date-hub surfaces traced — Task 1-audit)

The audit (read-first) confirms `buildCompetitionPage` (`src/seo/pages.ts:2196`)
is already complete against the keyword map §2.8-2.13 + the spec §2/§9. Every
required surface is present + correct + byte-frozen:

- **The title (byte-frozen, keyword map §2.8-2.13):** `cNameFa + " — برنامه
  بازی‌های بزرگ پیش‌رو | اسپرت سیگنال"`. The curated framing «بازی‌های بزرگ
  پیش‌رو» is the differentiator vs the full-coverage competitors (SERP-SAMPLES
  §2.3/§2.5). The title leads with the competition name; the GSC intent leads
  with «برنامه بازی های {لیگ}» — the answer sentence carries the next-match
  head (see below).
- **The H1 (byte-frozen, keyword map §2.8-2.13):** `"برنامه بازی‌های " +
  esc(String(cNameFa))` — the whole upcoming schedule.
- **The answer sentence:** leads with «نزدیک‌ترین بازی بزرگ {لیگ}: {home} –
  {away}، {date} ساعت {time} به وقت تهران.» when there is a next match (the
  GSC query head «برنامه بازی های لیگ قهرمانان اروپا» 14 impr / pos 9.36 + the
  league-schedule heads «برنامه بازی های لالیگا» / «بازی‌های لیگ برتر
  انگلیس»), OR «بازی‌های بزرگ پیش‌روی {لیگ} در اسپرت سیگنال — به وقت تهران.»
  when no fixture is queued.
- **The meta description:** derived from the answer sentence, sliced to 165.
  Honest: promises the next match + the schedule, never live scores, TV
  channels, lineups, or minute-by-minute (spec §2 product constraints).
- **The content blocks (spec §2 "Keep the current fairly complete competition
  page experience"):** (1) the answercard; (2) the full standings table
  (`fullStandings` — one cache-only KV read, fail-closed to the payload's
  compact top-8); (3) «بازی‌های پیش‌رو» — the upcoming fixtures list with the
  count. No filler text (spec §2 "Do not add filler text to match a word
  count").
- **The internal links (spec §9 "Competition page → upcoming approved matches
  and team pages"):** the upcoming-matches block renders crawlable `<a href>`
  match URLs via `dateGroupedRows` → `M.mrowHtml` → `M.matchHref` → `matchPath`
  (the canonical `/matches/{home}-vs-{away}-{YYYY-MM-DD}`). The breadcrumb
  links home → `/competitions` → the competition. All crawlable `<a href>`; no
  JS-only navigation; no `href="#"` placeholders.
- **The JSON-LD @graph (THE ONE GAP):** the competition detail page emitted
  `siteNodes()` (Organization + WebSite) + `sportsOrganizationNode`
  (SportsOrganization) + `itemListNode` (ItemList, when indexable) +
  `breadcrumbNode` (BreadcrumbList). **NO WebPage/CollectionPage node** — the
  competition detail page was the lone competition-family page without one.
  The `/competitions` index + the `/matches` hub + the time hubs emit
  `JL.collectionPageNode`; the team page + the match page emit
  `JL.webPageNode`. The spec contract (the Session 9 prompt Step 3: "the
  @graph carries Organization + WebSite + WebPage + BreadcrumbList") was
  non-conformant for the competition detail page. **No SportsEvent** — the
  competition page is not an event; a SportsEvent would require a fabricated
  fixture-on-this-page (the MISSING-IS-NOT-ZERO law holds). This gap is the
  ONE code change this session.
- **The indexable rule (the route plan §5 + the INDEXABILITY-MATRIX
  competition rows):** `const indexable = list.length >=
  SEO.MIN_UPCOMING_FOR_INDEX;` (MIN_UPCOMING_FOR_INDEX=1; a competition page
  is indexable when ≥1 upcoming approved match in that competition; `noindex,
  follow` at 0 upcoming; 404 when no pool rows at all — `compsIndex` returns
  no entry for that slug). The noindex competition page stays crawlable
  (linked from `/competitions`) — same law as teams.
- **The competition-name aliases (the `translateCompetition` map):** the
  `sportsOrganizationNode` carries `alternateName: translateCompetition(code)
  || undefined` — the natural Persian competition-name alias in the
  machine-readable JSON-LD (not stuffed into the title). The body copy uses
  `cNameFa` (the faName from the data). Natural; no keyword stuffing.

### The date-hub pages (verified correct — NO code change)

`buildHub` (`src/seo/pages.ts:1512`) already emits
`JL.collectionPageNode(def.path, def.h1, ctx.fetchedAt)` + `JL.itemListNode`
+ `JL.faqNode` + `JL.breadcrumbNode` in its `jsonldNodes`; the hubs are
self-canonical + indexable (the C5 decision: empty hubs stay indexable —
`/matches/tomorrow` is the site's best-CTR surface at 8.26% WITH an honest
empty state). The empty-state behavior is correct: a hub with zero upcoming
matches renders «مسابقه‌ای در راه نیست» in the list (via `dateGroupedRows`
returning the empty-state `<div>`) + the FAQ answers honestly («در برنامه فعلی
اسپرت سیگنال بازی‌ای برای {crumb} ثبت نشده است؛ به‌محض اعلام برنامه بازی‌های
جدید، همین صفحه به‌روزرسانی می‌شود.») + the answer sentence uses `def.desc`.
The H1 date rides the hub's own anchor day (never the bare render instant —
the tomorrow page never says today's date).

The S06-H3 follow-up (the tomorrow-empty-state refinement to the spec's
suggested Persian copy «برای فردا مسابقه مهمی در میان دیدارهای منتخب اسپرت
سیگنال ثبت نشده است. برنامه بازی‌های مهم روزهای آینده را بررسی کنید.») is a
post-Dec-4 decision with a fresh GSC export — documented, NOT changed this
session (the empty-state copy is a GSC-measured surface on `/matches/tomorrow`
— byte-frozen through Dec 4-8). Decision S09-2.

## 3. Files changed

### Modified (runtime)
- `src/seo/pages.ts` — `buildCompetitionPage`'s `jsonldNodes` array gains
  `JL.collectionPageNode(path, "برنامه بازی‌های " + String(cNameFa),
  ctx.fetchedAt)` between `siteNodes()` and `sportsOrganizationNode`.
  Structural JSON-LD hygiene only; the byte-frozen title/H1/description/answer
  are untouched.

### Modified (tests)
- `scripts/check-seo-competitionpages.js` — NEW. 8 offline gates pinned to the
  `buildCompetitionPage` function body: (1) the CollectionPage node is in the
  `jsonldNodes` array; (2) NO SportsEvent node; (3) the byte-frozen title
  template; (4) the byte-frozen H1; (5) the answer sentence leads with
  «نزدیک‌ترین بازی بزرگ {لیگ}» (next match) / «بازی‌های بزرگ پیش‌روی {لیگ} در
  اسپرت سیگنال» (no next match); (6) the indexable rule (the route plan §5);
  (7) the crawlable upcoming-matches rows + the full standings table (spec §2
  + §9); (8) the @graph node order. Wired into the `npm test` chain after
  `check-seo-teampages.js`.
- `scripts/s9-competition-smoke.ts` — NEW. A seeded tsx render harness: a
  SeoCtx with one upcoming PL fixture (Arsenal vs Liverpool, both selected
  clubs) renders `/competitions/premier-league` and asserts 30 properties
  (the @graph CollectionPage node + its @id/url/name/inLanguage/dateModified/
  isPartOf; NO SportsEvent; the @graph node order; the byte-frozen title/H1;
  the answer lead; the indexable rule; the self-canonical; the crawlable
  `<a href>` match row; the upcoming-matches heading; the SportsOrganization
  node; the ItemList node; the BreadcrumbList node). 30/30 assertions pass.
- `scripts/check-stats.js` — the v13.254-rankbadge + v13.258-mca11y
  release-wiring pins ride forward to `13.265.0.0` + the new
  `check-seo-competitionpages.js` existence + the test-chain regex (the
  VERSION + CHANGELOG assertions update to `13.265.0-competitions`).

### Modified (docs + version)
- `src/config.ts` — `VERSION` `13.264.0-teampages` → `13.265.0-competitions`.
- `package.json` — `version` `13.264.0.0` → `13.265.0.0`; the `test` script
  chain gains `&& node scripts/check-seo-competitionpages.js`.
- `package-lock.json` — resynced via `npm install`.
- `CHANGELOG.md` — the `# v13.265.0-competitions` entry (the session's
  narrative).
- `docs/HANDOFF.md` — rewritten for Session 9.
- `docs/DECISIONS.md` — S09-1 (the CollectionPage node), S09-2 (the audit
  confirms the date-hub + empty-state behavior is already correct — the
  S06-H3 refinement is post-Dec-4), S09-3 (the competition-page title/H1
  bytes ARE byte-frozen — the actual byte change is a post-Dec-4 decision
  with a fresh GSC export), S09-4 (the KV read quota STILL exceeded).
- `sportsignal-seo-implementation/IMPLEMENTATION-TRACKER.md` — the Session 09
  row (Completed / deployed).
- `seo-implementation/session-reports/SESSION-09.md` — this file.
- `seo-implementation/next-session-prompt.md` — the Session 10 start prompt
  (internal linking + nav).

### No client asset changed
SW stays `sportsignal-v126`; the client bundle stays `public-13.80.js`; the
stylesheet stays `public-13.87.css`. The change is server-side-only (the
RUNBOOK §2 rule) — the CollectionPage node is rendered server-side in the
JSON-LD `<script>` block; no client asset renamed.

## 4. The implementation decisions

- **S09-1 — the competition-page @graph CollectionPage node.**
  `buildCompetitionPage` gains `JL.collectionPageNode(path, "برنامه بازی‌های "
  + String(cNameFa), ctx.fetchedAt)`. The @graph is now Organization + WebSite
  + CollectionPage + SportsOrganization + ItemList (when indexable) +
  BreadcrumbList — matching the spec Step-3 contract. CollectionPage is the
  accurate type: the page's primary content is a collection of that
  competition's upcoming fixtures (the `itemListNode` when indexable) + the
  full standings table — the `sportsOrganizationNode` already carries the
  competition-entity semantics, so the page-level node describes the
  collection, not the entity. This mirrors the Session 8 team-page fix (the
  team page gained `webPageNode`; the competition detail page gains
  `collectionPageNode` for parity with its sibling pages). Structural JSON-LD
  hygiene only (the CollectionPage node is machine-readable, invisible to the
  SERP snippet — does NOT contaminate the Dec 4-8 GSC measurement). Zero
  KV/fetch/CPU cost (in-memory object literal). Verified by the new
  `check-seo-competitionpages.js` 8 gates + the seeded tsx render harness
  (`scripts/s9-competition-smoke.ts` — 30/30 assertions pass).
- **S09-2 — the audit confirms the date-hub + empty-state behavior is already
  correct (the S06-H3 refinement is post-Dec-4).** `buildHub` already emits
  the CollectionPage node + the ItemList + the FAQ + the Breadcrumb; the hubs
  are self-canonical + indexable (the C5 decision); the empty-state copy is
  honest. The S06-H3 follow-up (the tomorrow-empty-state refinement to the
  spec's suggested Persian copy) is a post-Dec-4 decision with a fresh GSC
  export — documented, NOT changed (the empty-state copy is a GSC-measured
  surface on `/matches/tomorrow` — byte-frozen through Dec 4-8). No code change
  to the date hubs.
- **S09-3 — the competition-page title/H1 bytes ARE byte-frozen (the actual
  byte change is a post-Dec-4 decision with a fresh GSC export).** The
  competition-page title + H1 + meta description + answer sentence + the
  competition-name spellings are ALL GSC-measured surfaces byte-frozen through
  Dec 4-8. Session 9 owns them but defers the bytes — the actual byte change
  is a post-Dec-4 decision with a fresh 16-month GSC export (the program's top
  evidence request — it would validate the competition-page title/H1 against
  the actual query surface). The CollectionPage node (S09-1) is NOT a
  GSC-measured surface — safe under the freeze. Verified by the
  `check-seo-competitionpages.js` freeze gates (gates 3 + 4 pin the
  byte-frozen title template + the H1).
- **S09-4 — the KV read quota is STILL exceeded at Session 9 close
  (pre-existing, NOT a code issue).** Live `/healthz` at Session 9 close
  (2026-11-16 23:50 UTC): `ok:false` + `pool_matches:0` + `pool_age_min:-1`.
  The competition-page data surfaces (the upcoming matches list, the full
  standings table, the rendered CollectionPage node on a detail page WITH
  upcoming matches) CANNOT be live-verified while the quota is exceeded —
  they self-verify once the quota resets at UTC midnight. The SSR-structural
  change (the CollectionPage node) is verified by the offline gates + the tsx
  render harness (30/30). The deploy is safe regardless of the quota state.
  The owner should investigate the read-source; a Workers Paid plan ($5/mo →
  1M reads/day) is the durable fix.

## 5. Tests

- `npm test` exit 0. **Baseline 3,685 OK → 3,694 OK** (the +9 = the new
  `check-seo-competitionpages.js` 8 gates + 1 summary line; `npx tsc --noEmit`
  clean).
- The new `check-seo-competitionpages.js` standalone: 8/8 gates pass.
- The seeded tsx render harness (`scripts/s9-competition-smoke.ts` — a seeded
  SeoCtx with Arsenal vs Liverpool + an upcoming PL fixture) renders the
  competition page and asserts: (1) the @graph `Organization, WebSite,
  CollectionPage, SportsOrganization, ItemList, BreadcrumbList`; (2) the
  CollectionPage `@id` = `/competitions/premier-league#webpage` + `url` +
  `inLanguage: fa-IR` + `isPartOf: #website` + `dateModified` + the name
  carries «برنامه بازی‌های»; (3) NO SportsEvent; (4) the @graph node order;
  (5) the byte-frozen title; (6) the byte-frozen H1; (7) the answer leads with
  «نزدیک‌ترین بازی بزرگ»; (8) robots `index, follow`; (9) the self-canonical;
  (10) a crawlable `<a href="/matches/arsenal-vs-liverpool-…">`; (11) the
  upcoming-matches heading; (12) the SportsOrganization node (Premier League);
  (13) the ItemList (numberOfItems = 1); (14) the BreadcrumbList. **30/30
  assertions pass.**
- Local `wrangler dev` smoke (miniflare local mode): worker boots cleanly;
  `/healthz` 200; the `/competitions` index renders 200 + the CollectionPage
  node + the byte-frozen title «رقابت‌های فوتبال — لیگ‌ها و جام‌ها | اسپرت
  سیگنال»; `/competitions/premier-league` returns 404 on the empty local KV
  (correct — `compsIndex` returns no entry when the pool is empty; this
  mirrors the pre-existing production KV-quota issue, NOT a code error).

## 6. Deploy

Versioned deploy via the repo's established ritual (RUNBOOK §2): `npm test`
(exit 0) → local `wrangler dev` smoke (worker boots) → `npx wrangler versions
upload` (Version ID `fc07b557-8f7e-4408-859d-5901e9ac9cbf`) → `npx wrangler
versions deploy --version-id fc07b557-8f7e-4408-859d-5901e9ac9cbf
--percentage 100 --yes` → live verify. **Deployed:
`fc07b557-8f7e-4408-859d-5901e9ac9cbf` (`13.265.0-competitions`) @ 100%.**
Live `/healthz` confirms version `13.265.0-competitions`. The deployment ID is
recorded in `docs/HANDOFF.md` + the tracker.

**Cloudflare budget of this change:** zero new KV reads (the
`collectionPageNode` call is an in-memory object literal built from `path` +
`ctx.fetchedAt` + `cNameFa` already in scope); zero new KV writes
(`kv_writes_day:0`); zero new subrequests; zero new fetches; zero
render-cost additions (a small object appended to an existing array). Well
within the free-tier budget.

**Deploy-window check:** today is 2026-11-16/17 (the deploy landed at 23:50
UTC 2026-11-16) — NOT Nov 20 (the Bayern–Köln S27 auto-verify windows:
kickoff 19:30 UTC, M1 ~19:35, M2 ~21:35-45 UTC). Safe to deploy.

**Live verify (2026-11-16 23:51 UTC, pre-quota-reset):** `/healthz` version =
`13.265.0-competitions` ✓; `ok:false` + `pool_matches:0` + `pool_age_min:-1`
(the KV read quota is STILL exceeded — pre-existing, NOT a code issue;
self-heals at UTC midnight); `kv_writes_day:0` (zero new writes);
`/competitions` index returns 200 + the byte-frozen title + the
CollectionPage node in the JSON-LD ✓. The competition detail page
(`/competitions/premier-league`) returns 404 (correct — the data-path:
`compsIndex` returns no entry when the pool is empty; mirrors the Session 8
team-page 404 on the empty pool).

**Live data-surface verify (2026-11-17 00:02 UTC, POST-quota-reset — the S09
data-surface self-verify is COMPLETE):** the KV quota reset at UTC midnight
(2026-11-17 00:01 UTC: `ok:true` + `pool_matches:324` + `pool_age_min:81`).
Live verification of `/competitions/premier-league` (a competition WITH
upcoming matches): HTTP 200 ✓; robots `index, follow` ✓ (indexable, ≥1
upcoming); the @graph carries a `CollectionPage` node (`@id` =
`https://sportsignal.ir/competitions/premier-league#webpage`, name
«برنامه بازی‌های لیگ برتر انگلیس», `inLanguage: fa-IR`, `isPartOf:
https://sportsignal.ir/#website`) ✓; the @graph node order
`Organization → WebSite → CollectionPage → SportsOrganization → ItemList →
BreadcrumbList` ✓ (exactly as pinned by `check-seo-competitionpages.js` gate
8); the byte-frozen title «لیگ برتر انگلیس — برنامه بازی‌های بزرگ پیش‌رو |
اسپرت سیگنال» ✓; the byte-frozen H1 «برنامه بازی‌های لیگ برتر انگلیس» ✓;
the self-canonical `https://sportsignal.ir/competitions/premier-league` ✓;
crawlable `<a href="/matches/…">` match rows ✓ (5 real PL fixtures incl.
`manchester-city-vs-fulham-2026-11-21`, `bournemouth-vs-nottingham-forest-2026-11-21`,
`chelsea-vs-leeds-united-2026-11-21`); the full standings table (`class="stbox"`)
✓; the `SportsOrganization` + `ItemList` + `BreadcrumbList` nodes ✓.
`/competitions/champions-league` (second competition): HTTP 200 ✓; the
CollectionPage node ✓; the byte-frozen title «لیگ قهرمانان اروپا — برنامه
بازی‌های بزرگ پیش‌رو | اسپرت سیگنال» ✓; crawlable match hrefs ✓
(`galatasaray-vs-aston-villa-2026-11-24`, `bod-glimt-vs-lask-linz-2026-11-24`).
The `/competitions` INDEX shows the empty-state «رقابتی در برنامه پیش‌رو نیست.»
— a stale CF cache (HIT, age ~750s, cached during the KV quota outage when the
pool was empty; `s-maxage=60` + `stale-while-revalidate=300` will revalidate it
within the window; NOT an S9 code issue — the detail pages prove the pool has
big matches). **The S09 data-surface self-verify is COMPLETE.**

## 7. The KV read quota (pre-existing, STILL OPEN)

The account's 100,000 KV reads/day free-plan limit was exceeded at Session 5
close and was STILL exceeded at Session 6/7/8/9 close. Live `/healthz` at
Session 9 close (2026-11-16 23:50 UTC): `ok:false` + `pool_matches:0` +
`pool_age_min:-1` — the pool is unreadable. This is a pre-existing
infrastructure issue, NOT a code issue (KV was already failing before the
Session 5 deploy served traffic). The worker tail shows `"Settings read
failed: KV get() limit exceeded for the day"`. Self-heals at UTC midnight
(quota reset). The owner should investigate the read-source (the 10-min cron
+ public traffic + the bot may collectively exceed 100K reads/day); the
durable fix is a Workers Paid plan ($5/mo → 1M reads/day).

**Session 9 implication:** the competition-page data surfaces (the upcoming
matches list, the full standings table, the rendered CollectionPage node on a
detail page WITH upcoming matches) CANNOT be live-verified while the quota is
exceeded — they self-verify once the quota resets at UTC midnight. The
SSR-structural change (the CollectionPage node) is verified by the
`check-seo-competitionpages.js` offline gates + the tsx render harness (30/30
assertions pass on a seeded ctx). The deploy is safe regardless of the quota
state — the code change has zero new KV reads (it cannot worsen the quota
issue).

## 8. Commit SHAs

- The code checkpoint: `29c270f` — `seo(s09): the competition-page @graph
  CollectionPage node + the check-seo-competitionpages.js gate + version bump`
  (the CollectionPage node in `buildCompetitionPage`, the new check script, the
  seeded render harness, the version bump, the check-stats pins, the CHANGELOG
  entry, the report/tracker/handoff/decisions, the Session 10 prompt — one
  commit; ls-remote verified — remote main = `29c270f6b982ea391bd3ef51d66030a841ac41dd`).

Recorded in `sportsignal-seo-implementation/IMPLEMENTATION-TRACKER.md`
Session 09 row after the push.

## 9. Unresolved risks / open follow-ups

- **The S09 data-surface self-verify** (COMPLETE — 2026-11-17 00:02 UTC,
  post-quota-reset): `/competitions/premier-league` + `/competitions/champions-league`
  render 200 + the @graph CollectionPage node + the byte-frozen title/H1 +
  the crawlable match hrefs + the standings table — verified live. The
  `/competitions` INDEX empty-state is a stale CF cache from the KV quota
  outage (revalidates within the `stale-while-revalidate` window; NOT an S9
  code issue).
- **The competition-page title/H1 byte change (S09-3):** after Dec 4-8, with
  a fresh 16-month GSC export, decide whether to adjust the competition-page
  title/H1 bytes against the actual query surface (the «بازی‌های لیگ برتر
  انگلیس» / «برنامه سری‌آ» / «بازی‌های لالیگا» competition-schedule heads).
- **The S06-H3 follow-up (the tomorrow empty-state refinement):** after Dec
  4-8, with a fresh GSC export, decide whether to refine the empty-state copy
  on `/matches/tomorrow` to the spec's suggested Persian copy.
- **The Dec 4-8 freeze:** the competition-page title/H1 bytes are byte-frozen.
  After Dec 4, apply the parked S2 title-test winning pattern (if any) to the
  team pages (Session 8's deferred work), then decide the competition-page
  title/H1 bytes (Session 9's deferred work). A fresh 16-month GSC export is
  the top evidence request (unlocks the S09-3 competition-page title/H1 byte
  decision, the S08 team-page title-test result, the S07-H2 match-page
  title/H1 byte decisions, the S07-H4 `og:type` decision, the S06-H2 homepage
  H1 decision, the S06-H3 tomorrow empty-state refinement, the M5
  marquee-slug refinement).
- **The KV read quota:** STILL exceeded at S9 close. Re-check at every session
  close until the owner resolves it (investigate the read-source or upgrade to
  Workers Paid).

## 10. Session 9 acceptance criteria (from the phase file)

- ✅ **Audit the competition-page data fields and content (read-first, no
  code)** — the audit confirms `buildCompetitionPage` is already complete
  against the keyword map §2.8-2.13 + the spec §2/§9 (the title, the H1, the
  answer sentence, the meta description, the content blocks, the internal
  links, the indexable rule, the competition-name aliases). All present +
  correct + byte-frozen. No filler text added.
- ✅ **Add the WebPage/CollectionPage node to the competition-page @graph (the
  Session 8-noted gap)** — `JL.collectionPageNode(path, "برنامه بازی‌های " +
  String(cNameFa), ctx.fetchedAt)` added to `buildCompetitionPage`'s
  `jsonldNodes`. Structural JSON-LD hygiene, freeze-safe, zero KV cost.
- ✅ **Unique title/H1/meta per competition page based on accurate competition,
  upcoming fixture and recent result** — verified: the title + H1 + answer
  sentence + meta description are all derived from `cNameFa` + the next match
  (`faName(next.s.homeTeam)` + `faName(next.s.awayTeam)` + `faDateD1` +
  `faTime`). The Dec 4-8 freeze applies — no byte change this session (S09-3).
- ✅ **Natural Persian competition-name aliases in body copy only where
  relevant** — the `translateCompetition` map rides the
  `sportsOrganizationNode` `alternateName`; the body copy uses `cNameFa`. No
  keyword stuffing in titles.
- ✅ **Ensure competition pages answer next-match intent with upcoming
  approved matches + the standings table** — the answer sentence leads with
  «نزدیک‌ترین بازی بزرگ {لیگ}: …» when there is a next match; the upcoming
  matches list + the full standings table are present and crawlable.
- ✅ **Preserve useful content; no filler word-count expansion** — no filler
  added (spec §2 "Keep the current fairly complete competition page
  experience"; "Do not add filler text to match a word count").
- ✅ **Do not target live score, broadcast channel, lineup or minute-by-minute
  intent** — the meta description + the answer sentence promise the next match
  + the schedule, never live scores, TV channels, lineups, or minute-by-minute.
- ✅ **Make links from competition pages to selected matches and team pages
  consistent** — the upcoming-matches block renders crawlable `<a href>` match
  URLs (dateGroupedRows → mrowHtml → matchHref → matchPath, the canonical).
- ✅ **The date-hub pages: verify the content + the indexability + the
  canonical are correct per state** — `buildHub` already emits the
  CollectionPage node + the ItemList + the FAQ + the Breadcrumb; the hubs are
  self-canonical + indexable (the C5 decision); the empty-state copy is
  honest. No code change (S09-2).
- ✅ **Representative competitions verification** — the seeded tsx render
  harness renders `/competitions/premier-league` (a competition WITH upcoming
  matches: 200 + `index, follow` + the CollectionPage node + the byte-frozen
  title/H1 + the crawlable match rows + the standings table + the ItemList).
  The empty-state (0 upcoming → `noindex, follow`) + the no-pool-rows (404)
  behaviors are verified by the indexable rule gate (gate 6) + the local
  smoke (404 on empty KV).

## 11. Handoff to Session 10

Session 10 owns the internal linking + navigation relationships (tile order,
anchor wording per the cannibalization checklist — keyword map §3 + the route
plan §10). The next-session prompt is in
`seo-implementation/next-session-prompt.md`. The standing constraints carry:
the Dec 4-8 freeze; the Cloudflare free-tier budget; the KV read quota
(re-check at S10 close); do not start Session 11+ work in Session 10.
