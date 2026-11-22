> Agents: read AGENTS.md in the repo root first, and follow it for this whole task.

# 2026-11-22 — S21: the Farsi site-name swap (v13.278.0-farsisitename)

## The owner-forced deploy (same day, ~14:05 UTC — DEPLOYED + LIVE-VERIFIED)

The S21 close had left the deploy riding the first quiet gap (~15:50-16:30
UTC). The owner then replied: "Do it, Deploy Push commit. Force deploy it."
— an explicit instruction that outranks the no-live-window discipline
(AGENTS.md §0 rule order: the owner's current-session instruction beats
project docs). Executed in a fresh session:

- Pre-deploy gate re-run on the clean clone: `bun install --frozen-lockfile`
  → `npm test` — exit 0, zero FAILs (the same green suite as the S21 close).
- Push state verified: GitHub `main` == local HEAD == `cec49e9`
  (the feature commit `4ab17b5` + the deploy-status docs correction).
- `wrangler deploy` (the dedicated-account API token, account
  `a796fdfe…`; credentials used, not stored): **Version ID
  `0f3fc73d-5fc0-4dc1-a326-c4edb6606db6`**, 2026-11-22 ~14:05 UTC
  (17:35 Tehran), commit `cec49e9`. All bindings intact (STATE KV,
  STATS_DB, USERS_DB, DRAIN_SELF, AI, the two channel vars); the
  `*/10 * * * *` cron re-armed; upload 4299 KiB (gzip 1481.6), startup 19 ms.
- Live smoke (all fetched fresh, cache-bypassed where needed):
  - `/healthz` → ok:true, `"version":"13.278.0-farsisitename"`, pool 508,
    outbox_depth 0, admin_alerts_ok true, degraded false, sched_mode LIVE
    (live:0 / started-unconfirmed:2 — the owner-forced window; no
    notification failures observed pre- or post-deploy).
  - `/` → og:site_name «اسپرت سیگنال»; WebSite + Organization JSON-LD
    `name`=«اسپرت سیگنال» / `alternateName`="SportSignal"; og:image:alt
    «اسپرت سیگنال — بازی‌های بزرگ فوتبال»; the two link-alternate titles
    («تقویم اسپرت سیگنال», «به‌روزرسانی‌های اسپرت سیگنال»).
  - `/teams`, `/matches/today` → og:site_name «اسپرت سیگنال»
    (today's `<title>` carries the brand rung: «بازی‌های فوتبال امروز —
    ۱ آذر (۲۲ نوامبر) | اسپرت سیگنال»).
  - The marquee match page `/matches/barcelona-vs-manchester-city-2026-12-08`
    → the unchanged 53-char brandless `<title>` (the SS-10 ladder, by
    design) + og:site_name «اسپرت سیگنال» — the swap rides Google's
    site-name signals, not the title.
  - `/feed.xml` → `<title>بازی‌های بزرگ فوتبال — اسپرت سیگنال»;
    `/calendar.ics` → `X-WR-CALNAME:بازی‌های بزرگ فوتبال — اسپرت سیگنال`
    with `PRODID:-//SportSignal//Fixtures//FA` correctly still Latin.
  - `/site.webmanifest` → name/short_name "SportSignal" (Latin, DECISIONS
    S21-1); `twitter:site` @sportsignalz; `sw.js` serves v128; the
    workers.dev host stays noindex (R-13).
- Edge-cache note (expected, no action): the homepage HTML served from the
  CF edge cache (`s-maxage=60, stale-while-revalidate=300`) for ~5 min
  post-deploy, then revalidated to the new render on its own. The SW v128
  bump evicts the client-side served-HTML copies on the visitors' next load.
- Not re-run to completion in this session: the full live `seo-check`
  T-01..T-13 crawler (depth-3 crawl + Lighthouse, exceeds the 5-min tool
  window); the swap surfaces above were verified directly instead.
- Rollback reference: redeploy the 13.277.0-clubdata upload
  (`7b254f47-2384-4d2e-87d3-dc5ad48c2092`) or `wrangler rollback` to the
  previous Version ID.

## The owner's ask (verbatim)

"The seo Title of pages of sport signal are like this:
بارسلونا – منچسترسیتی | لیگ قهرمانان اروپا، ۱۷ آذر - SportSignal
I want the english version of name becomes farsi in search and
'sportsignal' becomes ' اسپرت سیگنال ' ... in latin version : SportSignal
in farsi searches: اسپرت سیگنال"

## The measured diagnosis (live fetch 2026-11-22, before any edit)

- The LIVE match page `/matches/barcelona-vs-manchester-city-2026-12-08`
  serves `<title>⚽ بارسلونا – منچسترسیتی | لیگ قهرمانان اروپا، ۱۷ آذر</title>`
  — 53 chars, NO brand rung: the SS-10 65-char trim ladder drops the
  «| اسپرت سیگنال» rung on the long marquee titles (with it: 68 chars).
- The " - SportSignal" in the owner's SERP example is GOOGLE's site-name
  append. The signals Google read were all LATIN at the time:
  `WebSite` JSON-LD `name:"SportSignal"` (Google's PRIMARY site-name
  signal) + `og:site_name content="SportSignal"` on every page — while
  `inLanguage` is fa-IR and every title brand rung is already
  «اسپرت سیگنال» (v13.228-farsibrand).
- Live version at diagnosis: 13.277.0-clubdata (the repo HEAD, deploy
  7b254f47 of 2026-11-21).

## The swap (one commit, v13.278.0-farsisitename)

1. `src/seo/jsonld.ts` — BOTH `organizationNode()` + `websiteNode()`:
   `name: SEO.SITE_NAME_FA` + `alternateName: SEO.SITE_NAME` (per Google's
   site-name guidance: alternateName carries the other-language form).
2. `src/seo/page-shell.ts` — `og:site_name` renders `SEO.SITE_NAME_FA`;
   the feed/calendar link-alternate titles carry the Farsi brand.
3. `src/pages/public.ts` — the homepage template's `og:site_name`,
   `og:image:alt`, `twitter:image:alt` + the two link-alternate titles.
4. `src/seo/files.ts` — ICS `X-WR-CALNAME` + Atom `<title>`
   «بازی‌های بزرگ فوتبال — اسپرت سیگنال».
5. The Latin form keeps its own contexts (DECISIONS S21-1): the domain,
   the PWA install names, the ICS PRODID, llms.txt/llms-full.txt (English
   machine surfaces, already dual-named), twitter:site, the body copy.

## The gates + wiring

- SW cache v127 -> v128 (the routine served-HTML evict; no asset renamed).
- Version triple 13.277.0 -> 13.278.0; the check-stats LIVE pins + the
  NEW v13.278 wiring check (the swapped nodes, og:site_name, the Farsi
  head phrases, the PWA names staying Latin, the feeds, the PRODID); the
  check-s20 ride-forward pin; the check-mc-heroes SW pin.
- `check-admin-parity --update`: only the public baseline re-frozen.
- Freeze-safe: zero byte-frozen title/H1/description/answer bytes; the
  Dec 4-8 freeze holds; zero new KV-read/subrequest/CPU.

## Honest notes

- Google re-renders the SERP site name on its own re-crawl cadence — the
  live swap is verifiable immediately in the HTML/JSON-LD; the SERP flip
  itself takes days. No GSC metrics were fabricated.
- The PERSIAN-ALIAS PHASE-2 date-gate (HANDOFF) is untouched: this round
  changes JSON-LD/head metadata only, NOT the byte-frozen title/H1/
  description/answer surfaces the Dec 4-8 GSC measurement rides on.
