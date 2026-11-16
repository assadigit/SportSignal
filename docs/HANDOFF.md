# HANDOFF — SportSignal

> Agents: read AGENTS.md in the repo root first, and follow it for this whole session.

## This session (SEO Program Session 6 — homepage, featured match and the one-month fixture window; THIRD implementation session, 2026-11-17)

The homepage session of the 15-session SEO program: the site's front door.
Reconciles the homepage's fixture window with the spec's "up to one month",
fixes a JS-only-navigation defect on the featured-match card, and makes the
curated-selection promise explicit in the DOM — all without touching the
byte-frozen GSC-measured title/H1 surfaces (the Dec 4-8 freeze holds).
**Deployed (versioned): `7df40334-7563-42ed-8808-32ccd711f938`**
(`13.262.0-homepage`) @ 100%. All phase acceptance criteria met
(SESSION-06.md).

- **The horizon reconciliation (the 92→30 DISPLAY split):** the spec
  (MASTER-SEO-SPEC §1/§2) says "up to one month" / "Show up to 30 days ahead".
  The code used 92 days on listing surfaces + 90 days on the homepage boxes +
  end-of-current-month on the payload `upcoming` array. Session 6 split the
  two concerns: a NEW `SEO.UPCOMING_DISPLAY_DAYS = 30` constant
  (`src/seo/config.ts`) is the DISPLAY window — the homepage topspot/uclspot
  boxes + the `/matches` hub + the payload `upcoming` array (the JSON-LD
  ItemList source). The 92-day horizon stays as the DATA/DISCOVERY window
  (`upcomingBig`/`upcomingFollowed` unchanged) — the KV pool fetch + the
  sitemap-upcoming child + `feed.xml` + `matches.json` carry the broad URL
  discovery set. Decision S06-H1 in `docs/DECISIONS.md`.
- **The hero-card carousel crawlability fix (D5/D6):** the homepage's
  featured-match card anchor shipped `href="#"` in SSR — the real
  `/matches/{slug}` URL was set client-side only (`public-13.80.js`
  `renderHeroSpot`), so the featured match was NOT crawlable without JS.
  Fixed: `buildHomePage` (`src/seo/router.ts`) sets the hero card anchor's SSR
  href to `M.matchHref(nextBig.s)` (slide 1); the client rewrites it per active
  slide (progressive enhancement). Same for the mobile `a.hero-mcard` anchor.
  NEW `carouselNavHtml()` — a sr-only `<nav>` with a real `<a href>` to EVERY
  carousel slide (slides 2-6), emitted when the carousel has ≥ 2 slides. Zero
  KV/fetch cost. Decision S06-H5.
- **The curated-selection promise (D3):** a NEW sr-only `<p>` with the
  curated-selection promise «از دیدارهای بزرگ لیگ برتر انگلیس، لالیگا، سری‌آ،
  بوندسلیگا و لیگ یک فرانسه تا حساس‌ترین رقابت‌های لیگ قهرمانان اروپا و
  جام‌های حذفی؛ اسپرت سیگنال مهم‌ترین بازی‌های پیش‌رو را گلچین و معرفی می‌کند.»
  — additive to the existing sr-only page-summary, no visible layout change.
  Decision S06-H4.
- **Byte-frozen (NOT changed — the Dec 4-8 freeze holds):** the homepage
  `<title>` «برنامه بازی‌های مهم فوتبال | تاریخ و ساعت شروع | اسپرت سیگنال» and
  the dynamic `<h1>` «بازی بزرگ بعدی: {home} – {away}» are byte-identical to
  the pre-S06 values (keyword map §2.1 "keep it; change scheduled: none before
  Dec 4-8"). The H1-vs-keyword-map-plan divergence is documented (decision
  S06-H2 — a post-Dec-4 decision; the live dynamic H1 captures the
  «بازی بعدی بارسا»/«بازی بعدی بایرن مونیخ» next-match query heads, real GSC
  demand). The dynamic meta description (next big match, Shamsi-first) is
  unchanged.
- **`/matches/tomorrow`:** STAYS indexable (C5 — verified live: `index, follow`
  post-deploy). The honest empty state is unchanged (the best-CTR surface at
  8.26% — do not regress). The spec's exact empty-state copy is a post-Dec-4
  refinement (decision S06-H3).
- **Featured-match logic (reported, NOT changed):** `pickHeroMatch` returns
  the highest-PRIORITY match in the 8-hour carousel envelope (v13.194, owner-
  approved) — a documented divergence from the spec's "nearest upcoming"
  (decision S06-H6). The carousel's 8-hour envelope IS the spec's "same
  day/night grouping"; the carousel's accessibility + crawlability ARE fixed.
- **Tests:** NEW `scripts/check-seo-homepage.js` (23 gates). `check-cups.js` +
  `live-derby-test.js` co-evolved (the `SEO.UPCOMING_DISPLAY_DAYS` stub for
  the eval slices; the live-derby-test m-out offset fixed to a deterministic
  10-day in-window value + the 2 box-length assertions updated for the 30-day
  window). **npm test baseline now 3,675 OK** (was 3,652; +23 from the new
  check). Version triple `13.262.0.0` / `13.262.0-homepage`. No client asset
  changed (SW v126, `public-13.80.js`, `public-13.87.css`, `_headers`
  untouched — a server-side release).
- **KV read quota (pre-existing, NOT caused by the deploy):** the live
  `/healthz` shows `ok:false` + `pool_matches:0` — the account's 100,000
  KV reads/day free-plan limit is STILL exceeded (Session 5 close had it
  exceeded; the quota resets at UTC midnight). The SSR-structural changes
  (title, H1, curation promise, canonical, robots) ARE verified live. The
  data-dependent surfaces (the hero card anchor's real match URL, the
  carousel nav, the 30-day boxes with matches) CANNOT be verified live while
  the quota is exceeded — they will self-verify once the quota resets (UTC
  midnight, ~5-6h from the deploy). The mechanism is INERT (Session 5 flag
  false) so the live behavior is byte-identical to Session 4/5 regardless of
  the quota. **The owner should investigate the read-source** (the 10-min
  cron + public traffic + the bot may collectively exceed 100K reads/day). A
  Workers Paid plan ($5/mo) raises the limit to 1M/day.

**Next:** the owner fires Session 7 (match-detail metadata) with
`seo-implementation/next-session-prompt.md`. A fresh GSC export (16 months,
URL-level) remains the top evidence request (unlocks the S06-H2 H1 decision,
the S06-H3 tomorrow empty-state refinement, and the M5 marquee-slug
refinement for the lifecycle).

## Current state (machine)

- **Version:** `13.262.0-homepage` (`src/config.ts` / `package.json` `13.262.0.0`). npm test baseline **3,675 OK** (`npx tsc --noEmit` clean + 51 check scripts; verified this session — was 3,652).
- **Deploy:** Worker `ucl-notifier`, versioned deploys only. Current deployment `7df40334-7563-42ed-8808-32ccd711f938` (`13.262.0-homepage`; 2026-11-17, deployed @100%). Rollback chain: `1d70129b` (13.261.0-matchlife, Session 5) → `7d92e633` (13.260.1-teamidx, Session 4) → `24c62781` (13.260.0-teamidx) → `c97ae70b` (byte-identical S28.1) → earlier. Rollback = `npx wrangler rollback`.
- **Production hostnames:** `sportsignal.ir` (apex Custom Domain), `football.sportsignal.ir` (301→apex except `/webhook`,`/api/`,`/admin`), `ucl-notifier.sportsignal.workers.dev` (noindex-guarded alias — HTML AND machine files since Session 4; never a scratch env).
- **Branch:** `main` (canonical; HEAD = the Session 6 code checkpoint `cb36c2d`, pending the close-out commit). Session 6 commits: `cb36c2d` (the homepage one-month window + carousel crawlability + curated-selection promise + tests + version bump) + the close-out.
- **Commands:** `npm test` (must exit 0 before every push). **npm only, never `bun install`**. Local dev: `npx wrangler dev --config wrangler.dev.toml` (8787; seed local KV via `npx wrangler kv key put --path <file> --local`). Deploy needs `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID=a796fdfe…` in the env.
- **Cron triggers:** `*/10 * * * *` + `27 */4 * * *` (unchanged). Live healthz: version `13.262.0-homepage` confirmed; `ok:false` + `pool_matches:0` due to the KV read quota (pre-existing, self-heals at UTC midnight); `degraded:false`; `kv_writes_day:0` (zero new writes — the Session 6 changes are SSR-only filters + string concatenation).
- **Key folders:** `src/` (worker modules; `scripts/lib/worker-src.js` carries the bundle ORDER — co-evolve), `assets/` (immutable versioned client payload; SW `sportsignal-v126`, bundle `public-13.80.js`, stylesheet `public-13.87.css`), `docs/` (RUNBOOK, specs, audits, history), `sportsignal-seo-implementation/` (the SEO spec pack — owner's, tracker updated per session), `seo-implementation/` (the SEO program working tree: audits, keyword research, architecture, session reports, next-session prompts).
- **Backups:** KV is live state; no routine file backups (RUNBOOK §5 KV key contracts). Never rename KV keys.
- **Standing limits:** `_headers` at the 100-rule cap. **Cross-track SEO measurement window Dec 4-8: the GSC surfaces + team-name spellings stay byte-frozen through it.** The homepage title/H1 ARE GSC-measured surfaces — Session 6 changed NEITHER (verified by the S06-9/S06-9a gates). The S28 archive scope stays BIG matches only until the owner's A/B. Avoid deploys in the Nov 20 Bayern–Köln verification windows (M1 ~19:35 UTC, M2 ~21:35-45 UTC). Cloudflare free-tier budget: the 10ms CPU cliff on cold match renders is chronic; **the KV read quota (100,000/day) is STILL exceeded** — investigate the read-source; a Workers Paid plan ($5/mo → 1M reads/day) is the durable fix.

## Open follow-ups from the previous tracks (updated by Session 6)

- **Nov 20 (S27 option B):** the auto-verify workflow fires around Bayern–Köln; the owner re-fires the M1/M2 window sessions per the S27-cont record.
- **S24 (perf/CWV):** after Dec 8 — P1 hero `loading="lazy"`, P2 preconnect to crests.football-data.org, per-route CPU via GraphQL.
- **S26 (UI/UX iteration):** after S25 (done) — hero rendering, nav UX, FAQ discoverability, schedule density, telegram CTA. **S06-H4 (the visible curation copy) belongs here or in a dedicated UI round — the sr-only promise is the SEO fix; visible copy is a UI decision.**
- **S1/S2 SEO mini-track:** S1 spelling fix LIVE and mid-measurement (judge ~Dec 8); S2 title test parked — re-fire on/after Dec 4 with a fresh GSC export. **The program's Session 8 (team pages) consumes the S2 title-test result.**
- **S25 follow-up smokes:** NVDA/VoiceOver + Safari/Firefox/Edge live confirmations (owner sessions needed).
- **C8 client-side staleness vector (Session 4):** the `/api/public-matches` zone-edge HIT stamp (`max-age=14400`) is browser-honored on the poll path — client-side fix or zone Cache Rule; owner decision.
- **KV read quota (Session 5, STILL OPEN):** the account's 100,000 KV reads/day free-plan limit is exceeded. Investigate the read-source; consider a Workers Paid plan ($5/mo → 1M reads/day). Self-heals at UTC midnight. **Session 6's data-dependent surfaces (hero card href with a real match URL, the carousel nav, the 30-day boxes with matches) self-verify once the quota resets.**
- **Season-end lifecycle first run (Session 5, unchanged):** the mechanism is shipped + test-proven but INERT (flag false + empty dates map). To enable: confirm FD `season.endDate` values → populate `SEASON_END_DATES` → set `SEASON_END_NOINDEX_ENABLED = true` → versioned deploy → verify live. The first real transition is a May 2027 decision (after the 2026-27 season closes).
- **S06 data-surface self-verify (Session 6, NEW):** once the KV quota resets (UTC midnight), re-verify live: (1) the homepage hero card anchor carries a real `/matches/{slug}` href (not `#`) when a hero exists; (2) the sr-only carousel nav is present when the carousel has ≥ 2 slides; (3) the homepage topspot/uclspot boxes show ≤ 30 days of matches; (4) the `/matches` hub shows ≤ 30 days. The SSR-structural changes (title, H1, curation promise, canonical, robots) are already verified live.

## SEO program state (the 15-session track)

Session 01 ✅ Completed / verified in production (2026-11-16) — audit + docs.
Session 02 ✅ Completed, docs-only, no deploy (2026-11-16) — 369-phrase map + one-URL rules; allowlist corrected to 13.
Session 03 ✅ Completed, docs-only, no deploy (2026-11-16) — the approved architecture (map, matrix, route plan).
Session 04 ✅ Completed / verified in production (2026-11-16) — the crawl/index foundation (C1/C6/C8); 3,628 OK.
Session 05 ✅ Completed / deployed (2026-11-17) — the match-URL lifecycle mechanism (INERT by default); 3,652 OK.
Session 06 ✅ Completed / deployed (2026-11-17) — the homepage one-month window + carousel crawlability + curated-selection promise (the 92→30 DISPLAY split; the hero-card SSR href + the sr-only carousel nav; the curated-selection sr-only paragraph; the title/H1 byte-frozen); 3,675 OK. Deployment `7df40334…` @100%.
`seo-implementation/next-session-prompt.md` holds the Session 7 start prompt
(match-detail metadata). Progress source of truth:
`sportsignal-seo-implementation/IMPLEMENTATION-TRACKER.md`.
