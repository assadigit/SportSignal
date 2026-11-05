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
