# 2026-11-05 — SEO/GEO Phase-2 Session 2: calendar truth + indexation basics (SS-27, SS-03, SS-04, SS-08)

Session scope per `docs/SPORTSIGNAL_SEO_GEO_SPEC_PHASE2.md` §4 (S2). This
note carries each checkpoint's live evidence; the close-out digest is at
the bottom.

## CP1 — SS-27 Shamsi-first calendar display (v13.212-shamsifirst)

Commits `db35ad5` (tag v13.212-shamsifirst) + `a7c1eb0` (retention fix:
`git mv` had deleted the retired `assets/public-13.70.js`; restored
byte-identical to f27f13b per the immutable-pin convention — an edge-cached
HTML still referencing it resolves). Deploys `97ff5fcf` → `510704ba`.

What shipped (spec §1.3 / §3/SS-27):

- `src/seo/utils.ts`: the D-shapes — `faDateD1` «شنبه ۱۵ آبان ۱۴۰۵ (۵
  نوامبر ۲۰۲۶)», `faDateD1Jalali`/`faDateD1Greg` halves, `faDateD2` «۱۵
  آبان (۵ نوامبر)» (years join only when the Gregorian year differs from
  the current Tehran year), `faDateD2W` (D2 + the owner-designed hero
  weekday), `faFullDateTime` (the list-row bare date). Pure math — no
  Intl on the Jalali side, no render-time fetching.
- Server call sites: `src/seo/pages.ts` (all answer sentences, hub H1
  suffixes + titles, dategroup headers, `.mkickdate`, match H1, the D3
  ≤65-char title ladder (drop parens → drop brand → shorten comp), team/comp
  tiles, matches-page answer/desc), `src/seo/markup.ts` (hero `.time-date`,
  spotitem `.kickdate`, cups `.cupdate`, `ucl-next`, `fullWhenHtml`,
  `faFullDateHtml`), `src/seo/router.ts` (homepage meta description).
- Client mirror: `assets/public-13.70.js` → **`public-13.71.js`** —
  `fmtDate` (rows/cups), `fmtHeroDate(e, noWd)` (hero clock-pod / kickdate),
  `renderUcl`'s ucl-next; new `FA_GREG` array maps Gregorian months through
  the SITE's no-ezafe vocabulary (CLDR fa wide forms are «ژانویهٔ»/«مَی» —
  they would have broken the byte mirror) and en-GB numeric days are
  un-padded. SW `sportsignal-v111` → **`v112`** (the v13.39 rule);
  `src/hero-coverage.ts` regenerated; `scripts/fixtures/public-page-baseline.html`
  re-baselined (check-admin-parity `--update`).
- Deliberate scope decisions: the mobile HUD card's Latin-digit Jalali date
  line untouched (the explicit v13.170-mcv3 owner instruction 8); the
  per-match OG PNG stays Gregorian (all-English card — verified); bot
  digest surfaces untouched (already Jalali-leading, not SEO surfaces).
- Gates: seo-check **T-14 re-based** on the Jalali day+month token (the
  SS-02 anchor-day agreement survives the shape change); new **T-15**
  Shamsi-first sweep (hub H1s D1, every dategroup header D1, answer
  sentences, match H1 D2 + facts-table D1, llms.txt Gregorian-only,
  matches.json ISO). check-stats: the v13.212 wiring pin (VERSION + package
  13.212.0.0 + SW v112 + /public-13.71.js), homepage script-tag pin → 13.71,
  the bundle reads in check-a11y / check-hero-carousel / check-mc-heroes →
  13.71, the mc-heroes SW retirement pin → v112.

### Evidence (live, 2026-11-05 after deploy 510704ba)

- `npm test` → exit 0, **2,594 OK / 0 fail** (2,593 at S1 + the new wiring
  check; incl. the re-baselined admin-parity and the byte-agreement mirrors).
- SSR/client byte-for-byte agreement verified locally across same-year,
  year-boundary (2027-01-03, 2027-02-05, 2027-03-25) and single-digit-day
  instants for all three mirror surfaces (hero `.time-date`,
  `.kickdate` D2, row/cups `fmtDate`) — 10/10 OK.
- `npm run seo:check` vs production → **PASS 86 / FAIL 0** (71 at S1; +15
  from T-15 and the re-based T-14). T-14: today title/H1 Jalali dates agree
  «۱۴ آبان», 18 rows == numberOfItems == answer count; tomorrow «۱۵ آبان»,
  5/5/5.
- `curl https://sportsignal.ir/matches/today`:
  `<title>بازی‌های فوتبال امروز — ۱۴ آبان (۵ نوامبر) | SportSignal</title>`;
  `<h1>…امروز — پنجشنبه ۱۴ آبان ۱۴۰۵ (۵ نوامبر ۲۰۲۶)</h1>`;
  dategroup `پنجشنبه ۱۴ آبان ۱۴۰۵ (۵ نوامبر ۲۰۲۶)`; answer «نزدیک‌ترین:
  ترابوزان‌اسپور – فرایبورگ (لیگ کنفرانس اروپا)، پنجشنبه ۱۴ آبان ۱۴۰۵
  (۵ نوامبر ۲۰۲۶) ساعت ۲۱:۱۵ به وقت تهران.»
- `/matches/tomorrow`: title «— ۱۵ آبان (۶ نوامبر)», H1 «جمعه ۱۵ آبان
  ۱۴۰۵ (۶ نوامبر ۲۰۲۶)» (the SS-02 anchor intact under the new shapes).
- `/matches/1-fsv-mainz-05-vs-bayern-munich-2026-11-07`: H1 «ماینس – بایرن
  مونیخ | بوندسلیگا، ۱۶ آبان (۷ نوامبر)»; title same + brand (52 chars,
  ≤65); `.mkickdate` «۱۶ آبان (۷ نوامبر)»; facts `<time
  datetime="2026-11-07T14:30:00Z">شنبه ۱۶ آبان ۱۴۰۵</time>
  <span class="jdate">(۷ نوامبر ۲۰۲۶)</span>، ساعت ۱۸:۰۰ به وقت تهران».
- `/teams` + `/competitions` tiles: «بازی بعدی: ماینس – بایرن مونیخ، ۱۶
  آبان (۷ نوامبر)»; team answer «بازی بعدی بایرن مونیخ: … شنبه ۱۶ آبان
  ۱۴۰۵ (۷ نوامبر ۲۰۲۶) ساعت ۱۸:۰۰ به وقت تهران.»; comp answer «جمعه ۱۵
  آبان ۱۴۰۵ (۶ نوامبر ۲۰۲۶) ساعت ۲۳:۰۰».
- Homepage: `.time-date` «یکشنبه ۱۷ آبان (۸ نوامبر)»; `.kickdate` «۳۰ آبان
  (۲۱ نوامبر)» / «۱ آذر (۲۲ نوامبر)» (the D2 canonical, weekday dropped);
  meta description «…لالیگا، ۱۷ آبان (۸ نوامبر) ساعت ۲۳:۳۰ به وقت
  تهران.»; `src="/public-13.71.js"`.
- en/machine unchanged: `/api/matches.json` `"kickoff_utc":
  "2026-11-07T14:30:00Z"`; JSON-LD `"startDate":"2026-11-07T14:30:00.000+03:30"`;
  sitemap `<lastmod>2026-11-04T19:46:00.943Z`; llms.txt carries zero Shamsi
  month names.
- Assets: `/public-13.71.js` 200; `/public-13.70.js` 200 (retention);
  `/sw.js` `const CACHE = "sportsignal-v112"`.

**SS-27 status: VERIFIED.**

## CP2 — SS-03 pagination canonicals (v13.213-pagecanon)

Commit `2e2780c` (tag v13.213-pagecanon), deploy `37a1a0fb`. Server-side
only — no client asset changed (bundle public-13.71.js / stylesheet
public-13.81.css / SW sportsignal-v112 stay).

What shipped (spec §3/SS-03): `buildMatchesPage` derives
`canonPath = /matches?page=N` for N ≥ 2 → self-referencing canonical +
`og:url` follows (both from `buildHead`'s canonical), title gains « —
صفحه N» (Persian digits) before the brand; `?page=1`/bare keep canonical
`/matches`; out-of-range pages clamp to the last real page and canonicalize
to it; the CollectionPage JSON-LD url/@id ride canonPath; the router's
per-key cache keeps each page's head under its own canonical. seo-check
gains **T-16**.

### Evidence (live, 2026-11-05 after deploy 37a1a0fb)

- `npm test` → exit 0, **2,595 OK / 0 fail**.
- `curl 'https://sportsignal.ir/matches?page=2'`:
  `<title>بازی‌های بزرگ فوتبال پیش‌رو — تاریخ و ساعت شروع — صفحه ۲ |
  SportSignal</title>`;
  `<link rel="canonical" href="https://sportsignal.ir/matches?page=2">`;
  `<meta property="og:url" content="https://sportsignal.ir/matches?page=2">`.
- `?page=1`: title unsuffixed, canonical `https://sportsignal.ir/matches`.
- `?page=3`: «— صفحه ۳» + self-canonical `?page=3`.
- `npm run seo:check` vs production → **PASS 92 / FAIL 0** (T-16: all six
  assertions green — ?page=1 canonical / no suffix; ?page=2 self-canonical /
  og:url follows / «— صفحه ۲» suffix / title distinct).

**SS-03 status: VERIFIED.**

## CP3 — SS-04 Organization.sameAs (v13.214-sameas) + SS-08 footer attribution (v13.215-attribution)

Commits `0b6b1f6` (tag v13.214-sameas) + `4c4edd3` (tag v13.215-attribution),
one combined deploy `b95804bf` (both items green together — the CP3
combination the session plan allows). Server-side/HTML only — no client
asset changed (bundle public-13.71.js / stylesheet public-13.81.css / SW
sportsignal-v112 stay).

**SS-04** (spec §3/SS-04): new `SEO.ORG_SAMEAS` array in
`src/seo/config.ts` = `["https://t.me/SportSignalAlertsBot"]` consumed by
`organizationNode()` (`src/seo/jsonld.ts`) — every page graph carries
`sameAs`; the owner appends future profiles in config.ts only. seo-check
gains **T-17** (Organization node on `/`, `/matches/today` + a sampled
match page must carry the Telegram URL; every sameAs entry must be a real
profile URL shape).

**SS-08** (spec §3/SS-08): every SEO page footer gains «منبع داده:
football-data.org» linked to `https://www.football-data.org/` from the
existing `SEO.DATA_SOURCE_NAME`/`DATA_SOURCE_URL` — the `pageShell` footer
(`src/seo/page-shell.ts`, the `.srcline` vocabulary: small + secondary,
below the fold) + the homepage footer (`src/pages/public.ts`,
`.src-attrib` under `.foot-base`). `SEO.CONTENT_VERSION` bumped to
`2026-11-05T12:00:00Z` (hand-written page text changed on every page type
— the honest-lastmod F-05 rule; the static-pages sitemap lastmod advances).
seo-check **T-03** now sweeps the attribution on every template + sampled
sitemap URL.

### Evidence (live, 2026-11-05 after deploy b95804bf)

- `npm test` → exit 0, **2,597 OK / 0 fail** (13.214 state: 2,596; 13.215
  state: 2,597).
- SS-04: `curl https://sportsignal.ir/` graph carries
  `"sameAs":["https://t.me/SportSignalAlertsBot"]`; T-17 green on `/`,
  `/matches/today` and `/matches/1-fsv-mainz-05-vs-bayern-munich-2026-11-07`.
- SS-08: `curl` shows the attribution on every page type — `/`
  (`منبع داده: <a href="https://www.football-data.org/" …>football-data.org</a>`),
  `/matches`, `/matches/today|tomorrow|this-week|this-weekend`, `/teams`,
  `/competitions`, `/about`, `/methodology`, `/contact`, `/privacy`,
  `/terms`, `/data`, `/sitemap` + sampled match/team pages.
- `npm run seo:check` vs production → **PASS 118 / FAIL 0** (92 at CP2;
  +26 = the T-03 attribution sweep across 15 templates + sampled sitemap
  URLs + T-17's 3 assertions). One transient during the first post-deploy
  run (`/teams/psv` + four statics serving their ≤300 s stale-while-
  revalidate copies) cleared on the re-run once the SWR window lapsed.
- Sitemap lastmod honesty: the static pages' lastmod advanced to the new
  CONTENT_VERSION only (the F-05 semantics — content actually changed).

**SS-04 status: VERIFIED.**
**SS-08 status: VERIFIED.**

## S2 close-out

All four session items VERIFIED live: SS-27 (v13.212-shamsifirst +
a7c1eb0 retention fix), SS-03 (v13.213-pagecanon), SS-04
(v13.214-sameas), SS-08 (v13.215-attribution). Five deploys total
(97ff5fcf → 510704ba → 37a1a0fb → b95804bf). npm test 2,593 → 2,597;
seo:check 71 → 118 assertions, all green. No deviations from the session
plan beyond the deliberate scope notes recorded above (the mcard's
Latin-digit date line per owner instruction 8; the OG PNG stays an
all-English card; bot digests untouched). One operational lesson: a
version-bump helper script crossed its read/write paths and briefly
clobbered `src/config.ts` with the SEO config — caught by `npm test`
(tsc) before any commit, restored from HEAD, re-applied correctly; the
wiring gates (check-version-sync) held.

Next (S3, per spec §4): **SS-05 batch 1** (entity grounding — sameAs for
the 6 competitions + top-20 teams, verified URLs only, the new
`src/seo/entity-links.ts` static map) + **SS-07** (llms.txt expansion +
llms-full.txt).
