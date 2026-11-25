# S25 — v13.282.0-enparity deploy + verification (2026-11-25)

The owner's directive: "In farsi: everything farsi; in english: english."
Two live defects measured on the EN homepage before this release:

1. **The visit counter stayed Farsi in EN mode.** The footer
   `#visitCount` labels («بازدید امروز:» …) had no `data-i` hooks, and
   the `/api/visit` beacon IIFE was language-blind — `faNum()` always
   formatted fa-IR digits; the live stats box (`#statsBox` — «📊 آمار
   بازدید زنده», six stat rows, countries table) rendered Persian
   labels + Persian numerals in every mode.
2. **Nine footer internal-page links stayed Persian in EN mode**
   (`/matches` «بازی‌ها», `/matches/today`, `/teams`, `/competitions`,
   `/methodology`, `/data`, `/privacy`, `/terms`, `/sitemap`) — no
   `data-i` hooks; only navHome/navAbout/navContact translated.

## The change (client-side only; zero KV/D1/SEO-frozen byte changes)

- **core-13.16.js → core-13.17.js** (ADR-006 rename): 28 new dictionary
  keys in BOTH languages (nav* link labels, navAriaLabel, skipContent,
  hStatsLive, vcLoading, the vc*Lbl counter labels, the st* stats-box
  strings, srcAttrib). `applyLang()` gains `trAria()` (the new
  `data-ia` aria-label hook) + dispatches the `sslangchange`
  CustomEvent.
- **public.ts**: data-i/data-ia hooks on the footer nav, the four
  counter label spans, the stats card h2 + loading label, the
  src-attrib line, the skip link; the beacon IIFE rewritten
  language-aware — `vn()` (fa-IR digits in FA / Latin en-US in EN),
  `L()` (core dictionary with an inline fallback pair for the
  parse-time race), EN country names via `Intl.DisplayNames` from the
  payload's `c.code` (fallback `c.name`), the percent sign follows the
  language (٪ / %), the memoized payload + `sslangchange` listener
  re-render both surfaces on every mid-session toggle.
- **admin.ts / login.ts**: core reference follows the rename.
- **assets/_headers**: `/core-13.17.js` pinned immutable; cap sweep #22
  evicted the expired `/public-13.47.js` pin (the +1 pin pushed the
  file to 101 rules; the FILE stays on disk per the retention rule).
- **sw.js**: cache `sportsignal-v128` → `v129` (the routine evict).
- **Checks**: check-stats (the core rename reads + the new pin + the
  v13.282 LIVE wiring pin + v13.281 demoted to HISTORICAL), the SW
  v129 chain (check-stats + check-mc-heroes), check-s20-dayhubs'
  version triple, check-a11y's skip-link search (the data-i prefix
  match), check-seo-performance/check-hero-carousel reads; the parity
  fixtures re-baselined (`check-admin-parity --update`) for the
  intended template change.

## Verification

- `npm test`: **exit 0** (tsc + all 78 check scripts) after the
  re-baseline + the check co-evolution.
- Local `wrangler dev` (8787): healthz JSON + homepage 200;
  `/core-13.17.js` served with the immutable pin; `/api/visit` returns
  JSON for a browser UA (204 for bots, unchanged).
- Deploy: `npx wrangler deploy` (account a796fdfe71819812119b8a494d3d39c1,
  version d6e34a56-a358-4ee1-83c6-ddeee7f42dd1, 2 new assets:
  /core-13.17.js + /sw.js). `git ls-remote` verified HEAD == origin/main
  immediately before (the S18b lesson).
- Post-deploy healthz: `version: 13.282.0-enparity`, `ok: true`,
  heartbeat 8m, last_cron 8m, outbox 0. (`degraded: true` = the
  PRE-EXISTING kv_writes_day 729 early-warning band — this release adds
  ZERO KV writes; resets at UTC midnight.)
- Edge propagation: the homepage HTML rode the internal
  `SEO_PAGE_TTL` 900s hold — the fresh bytes (core-13.17.js + hooks +
  beacon) served ~8 minutes post-deploy (age reset observed; the zone
  purge API is not in this token's scope, no purge endpoint exists —
  the wait was the documented path).
- **Live EN mode (agent-browser, localStorage `ucl_lang=en`)**: footer
  nav "Home | Matches | Today's Matches | Teams | Competitions | About
  | Methodology | Contact | Data | Privacy | Terms | Sitemap"; counter
  "Views today: 1,234 · Visitors yesterday: 8,901 · Visitors this
  month: 23,456 · Total views: 1,234,567" (Latin digits — stubbed
  payload; the headless UA is bot-classed so the live beacon 204s);
  stats box "🔴 Online now / Views today / … / Today's visitors by
  country / Country/Visitors/Share / 🇮🇷 Iran 61% / 🇬🇧 United Kingdom
  19%"; "Data source: football-data.org"; "Skip to content".
- **Live mid-session toggle (EN→FA via #lbtn)**: counter re-renders
  «بازدید امروز: ۱٬۲۳۴ …» (fa-IR digits + ٬ separator), stats box fully
  Persian with «🇮🇷 ایران / 🇬🇧 انگلستان» + «٪», nav «خانه | بازی‌ها |
  …», h2 «📊 آمار بازدید زنده», dir=rtl — and back to EN cleanly.
  Screenshots: `docs/assets/s282-enparity/{en,fa}-footer-live.png`.
- The known accepted residual (documented in CHANGELOG.md): the
  sr-only «بازی مهم» featured-match badge inside the public-13.80.js
  client rebuild + the sr-only SEO paragraphs stay Persian in EN
  (invisible; the bundle rename round is the fix path when the next
  13.8x bundle change happens); the SEO sub-pages (/matches, /teams, …)
  remain Farsi-only server-rendered by design.

## Owner note

No action needed — the EN/FA parity is live on https://sportsignal.ir.
The headless-browser counter "—" placeholders in the screenshots are
the bot-classing of the test UA; real browsers fill the numbers.
