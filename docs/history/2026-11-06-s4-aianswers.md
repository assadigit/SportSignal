# 2026-11-06 — SEO/GEO Phase-2 Session 4: AI-answer surfaces + trust + schema (SS-06, SS-09, SS-12, SS-13, SS-14)

Session scope per `docs/SPORTSIGNAL_SEO_GEO_SPEC_PHASE2.md` §4 (S4). This
note carries each checkpoint's live evidence; the close-out digest is at
the bottom. (Wall-clock note: the session's deploys were executed
2026-11-05 ~12:20–13:40 UTC — the repo's session dating stays monotonic
with the S3 note.)

## CP1 — SS-06: FAQ content + FAQPage schema (v13.219-faq)

Commit `5583973` (tag v13.219-faq), deploy
`d905e4c1-793a-459e-860b-bb49a18a7442`. Server-side only — no client asset
changed (bundle public-13.71.js / stylesheet public-13.81.css / SW
sportsignal-v112 stay).

What shipped (spec §3/SS-06):

- NEW `faqNode()` (`src/seo/jsonld.ts`) — the FAQPage node — and
  `faqHtml()` (`src/seo/markup.ts`) — the visible `.faqcard` block (plain
  `<h3 class="faqq">` + `<p class="faqa">` under one `<h2>`, nothing
  hidden). Code comment records the rationale: Google retired FAQ rich
  results (2023) — this is an AI-citation surface, not SERP enrichment.
- The byte-identity contract: ONE q/a array per surface feeds BOTH
  renderers, so visible text == FAQPage JSON-LD text exactly (answers are
  plain text — no inner markup — precisely so `esc()` and
  `JSON.stringify` decode to the identical string).
- Statics (`src/seo/pages-static.ts`): `/about`, `/methodology`, `/data`
  gain 5 hand-written factual Persian Q&As each — every answer restates
  facts the site already documents (the pages' own text, the real machine
  files, the real bot, the real attribution); rule §1.1: nothing invented,
  no dates hand-rolled.
- Hubs (`src/seo/pages.ts` `buildHub`): the DYNAMIC FAQ. Q1
  «امروز/فردا/این هفته/آخر هفته چه بازی‌هایی است؟» answered from the same
  `upcomingFollowed` list the page renders — naming the window's real
  matches with `faDateD2`/`faTime` (capped at 8 named + «N بازی دیگر»);
  empty windows answer honestly («ثبت نشده است»). Q2
  «بزرگ‌ترین/نزدیک‌ترین بازی … چیست؟» names the top fixture with `faDateD1`
  (only when one exists). Plus three factual Q&As (Tehran tz + Shamsi/
  Gregorian, ~10-min cadence, where the full schedule lives) — 5 on a
  normal day, 4 on an empty one (within the spec's 4–6).
- `SEO.CONTENT_VERSION` → `2026-11-06T16:00:00Z` (statics' hand-written
  text changed — F-05; the pages sitemap lastmod advances with it).
- seo-check **T-20**: the 3 statics + all 4 hubs — visible FAQ present,
  4–6 Q&As, byte-identity visible↔node, hub answer count == visible rows
  == ItemList.numberOfItems, top-match FAQ date == first dategroup's
  Jalali token, empty-window honesty.

### Evidence (live, 2026-11-06 after deploy d905e4c1)

- `npm test` → exit 0 (2,600-class suite green; the v13.219 wiring pin
  added, the v13.218 pin retired to HISTORICAL).
- Local render sanity (esbuild harness, fake pool of 4 + an empty pool):
  /about /methodology /data + all 4 hubs render 5 (weekend/empty: 4)
  visible Q&As each, node counts match, **byte-identical True** on every
  surface; the empty today hub answers «بازی‌ای … ثبت نشده است» with
  exactly 4 Q&As.
- `curl https://sportsignal.ir/{about,methodology,data,matches/today}` —
  each serves 5 `.faqq` items (post-deploy; the pages had flipped past
  their edge-cache window by the time of the check).
- `/matches/today` full parse: FAQPage node 5 Q&As; **Q1 answer names the
  day's REAL matches** — «امروز ۳۶ بازی در برنامه SportSignal است: آث
  میلان – فرنتس‌واروش (لیگ اروپا)، ۱۴ آبان (۵ نوامبر) ساعت ۲۱:۱۵؛ شمس‌آذر
  – صنعت نفت آبادان (لیگ برتر خلیج فارس)…» — count ۳۶ == 36 visible
  rows == ItemList.numberOfItems 36; byte-identical True.
- `npm run seo:check` vs production → **PASS 219 / FAIL 0** (193 at S3;
  +26 = T-20's assertions across the 7 surfaces). One transient on the
  first run: T-05's /teams/juventus answered 503 (the known cold-render
  CPU-blip class — v13.186-seofix) and passed 200 on re-verify 30 s
  later; the re-run is the 219/0 above.

**SS-06 status: VERIFIED.**

## CP2 — SS-09 + SS-12: honest security.txt + one full 404 (v13.220-secremail)

Commit `0836f73` (tag v13.220-secremail), deploy
`62a57604-faa9-464a-b320-d1197ed77510`. Server-side only — no client asset
changed, no indexed page text changed (NO CONTENT_VERSION bump: the 404 is
noindex and security.txt is a machine file).

What shipped (spec §3/SS-09 + SS-12):

- **SS-09** — `buildSecurityTxt()` (`src/seo/files.ts`) drops
  `Contact: mailto:security@sportsignal.ir` (the domain has no MX — the
  address was undeliverable; rule §1.1: never list an unreachable
  contact). The Telegram bot Contact stays + a `Remarks:` note that a
  security@ mailbox will be added once it exists. The contact page
  references no email (verified) — untouched. `OWNER_TODO.md` gains §12:
  the exact Cloudflare Email Routing click-path for a free `security@`
  alias (Email → Email Routing → enable → Routing rules → Create address
  `security` → real destination inbox → verification email → Save), plus
  the re-enable instruction; §5's stale claim that the contact page
  displays an atomicmail.io email is corrected.
- **SS-12** — ONE full 404 for every HTML-ish unknown path.
  `build404Page()` drops its unused `ctx` parameter (a PURE static render:
  no KV reads, no pool map) — which is what lets the router serve the
  full shell for scanner garbage without re-introducing the v13.97-seocpu
  CPU kill. The unknown-path branch (previously the 647-byte minimal
  page), the unknown-sitemap-kind fallback and the unknown-team/comp/match
  404s all serve the full page; the old known-family flow's SECOND
  `getSeoCtx` fetch on the 404 path is gone too. noindex meta +
  `X-Robots-Tag: noindex, nofollow` stay on every 404.
- seo-check **T-21**: `/zzz-unknown` + a deep unknown path +
  `/teams/zzz-unknown` must answer 404 with the full shell (mainnav +
  today/sitemap links + pagesfoot) + both noindex signals; security.txt
  must carry no `mailto:` while keeping the Telegram contact.

### Evidence (live, 2026-11-06 after deploy 62a57604)

- `npm test` → exit 0 (**2,602 OK** / 0 fail; the v13.220 wiring pin
  added, the v13.219 pin retired to HISTORICAL).
- `curl https://sportsignal.ir/.well-known/security.txt` → the five-field
  body: Telegram Contact + Expires + Preferred-Languages + Canonical +
  Remarks — **no mailto line**.
- `curl -D- https://sportsignal.ir/zzz-unknown` → HTTP 404,
  `x-robots-tag: noindex, nofollow`, **22,175 bytes** (was 647) — the full
  shell: mainnav, the pagenotfound links (home/today/matches/sitemap),
  pagesfoot; `<meta name="robots" content="noindex, follow">` present.
- `/deep/nested/unknown-page`, `/teams/zzz-unknown` AND the
  vulnerability-probe class (`/bin/.env`) → all 404 + the same full
  22,175-byte shell (the probe pays only the pure static render — no KV,
  the v13.97-seocpu contract kept).
- `npm run seo:check` vs production → **PASS 232 / FAIL 0** (219 at CP1;
  +13 = T-21's assertions: 4 per 404 path × 3 + the security.txt check).

**SS-09 + SS-12 status: VERIFIED.**

## CP3 — SS-13 + SS-14: ItemList on the indexes + Dataset on /data (v13.221-indexschema)

Commit `3bcd9cf` (tag v13.221-indexschema), deploy
`bc55ffdd-a4d7-416d-9cfe-13a7dfe7269d`. Server-side only — JSON-LD-only
change (no visible text changed → NO CONTENT_VERSION bump, the
v13.213/v13.214 precedent).

What shipped (spec §3/SS-13 + SS-14):

- **SS-13** — NEW `linkItemList()` (`src/seo/jsonld.ts`): the hub ItemList
  pattern over CHILD PAGES (numberOfItems + ListItem position/name/url).
  Wired as `teamList` in `buildTeamsIndexPage` + `compList` in
  `buildCompetitionsIndexPage` (`src/seo/pages.ts`) — the names are the
  SAME strings the visible tiles render (the comp name replicates the
  tile's own `cName` expression), so the machine list and the visible grid
  describe one another exactly.
- **SS-14** — NEW `datasetNode()` (`src/seo/jsonld.ts`) wired into
  `buildDataPage`: name + honest description (attribution required,
  football-data.org base data), `url`, `isAccessibleForFree: true`,
  `license` → `/terms` (where the attribution requirement actually lives),
  `creator` → the Organization `@id` already in every graph, and
  `distribution` → three DataDownloads — `/api/matches.json`
  (application/json), `/calendar.ics` (text/calendar), `/feed.xml`
  (application/atom+xml) — the real media types the routes serve.
- seo-check **T-22**: both indexes carry the child-link ItemList with
  numberOfItems == visible tiles == element count, sampled children answer
  200 (graceful pass on an honest empty universe); `/data` carries the
  Dataset whose creator resolves in-graph, isAccessibleForFree true,
  on-site license, and each distribution's encodingFormat matches the
  LIVE content type of its URL.

### Evidence (live, 2026-11-06 after deploy bc55ffdd)

- `npm test` → exit 0 (2,602-class suite green; the v13.221 wiring pin
  added, the v13.220 pin retired to HISTORICAL).
- Local render sanity (esbuild): /teams 6==6 tiles, /competitions 3==3,
  /data Dataset creator resolves in-graph + 3 distributions + FAQ intact.
- `curl https://sportsignal.ir/teams` →
  `"@type":"ItemList","name":"تیم‌های دنبال‌شده","numberOfItems":91` (93 by
  the seo:check run minutes later — live data moved, both counts matched
  their own page's tiles at fetch time);
  `/competitions` → `"numberOfItems":7`.
- `/data` — the S2/S3 edge-cache lesson bit ONE more time, in a new shape:
  the version went live at 12:47:00 but a pre-deploy render had been
  cached at 12:42:57 with the 900 s hold, so /data served the CP2 copy
  until 12:57:57 (curl `age: 855` + `date:` headers proved it — waiting,
  not debugging). After expiry: `"@type":"Dataset"` present,
  `"isAccessibleForFree":true`, `"license":"https://sportsignal.ir/terms"`,
  `"creator":{"@id":"https://sportsignal.ir/#organization"}` + the three
  encodingFormats.
- One check-side bug found and fixed during the run: T-22's tile-count
  regex demanded the closing quote right after the `/teams/` prefix
  (slugs follow the prefix — the count was always 0); check-side only,
  committed with this close-out.
- `npm run seo:check` vs production → **PASS 243 / FAIL 0** (232 at CP2;
  +11 = T-22's assertions).

**SS-13 + SS-14 status: VERIFIED.**

## S4 close-out

All five session items VERIFIED live: SS-06 (v13.219-faq — the FAQ
AI-answer surface, byte-identical visible↔FAQPage on 3 statics + 4 hubs
with live-data answers), SS-09 + SS-12 (v13.220-secremail — honest
security.txt without the undeliverable mailto + ONE full 404 on every
HTML-ish unknown path, pure render, no KV on the 404 path), SS-13 + SS-14
(v13.221-indexschema — child-link ItemLists on both indexes + the Dataset
node on /data). Three deploys (d905e4c1 → 62a57604 → bc55ffdd). npm test
2,600 → 2,602; seo:check 193 → 243 assertions, all green. Deviations
from the session plan: none.

Operational notes for S5:
- The edge-cache flip lesson now has a second recorded shape: a cache
  entry stored MINUTES BEFORE a deploy holds the OLD render for its full
  ≤900 s window even after every other route has flipped — when a
  specific page lags a deploy, read its `age`/`date` response headers
  before debugging (12:42:57-store vs 12:47:00-deploy this session).
- One transient T-05 503 on a cold team render (the v13.186-seofix class)
  cleared on the 30 s re-run — not a regression.
- The workers.dev host shares the worker's Cache API keys
  (`edge-internal.sportsignal.ir`) — it cannot be used as a cache-bypass
  view of a route.
- T-20's hub FAQ is generated per render from `upcomingFollowed` — on
  genuinely empty windows the hub carries 4 Q&As (spec-compliant), and
  the empty-day answer is asserted honest by T-20.

Next (S5, per spec §4): **SS-10** (title trim ladder ≤65), **SS-11**
(description ≤165), **SS-15** (per-match SportsEvent.image),
**SS-16** (feed entry lastmod honesty), **SS-17** (ics DTEND),
**SS-18** (/admin X-Robots-Tag), **SS-19** (410 for retired teams,
optional).


