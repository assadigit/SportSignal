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
