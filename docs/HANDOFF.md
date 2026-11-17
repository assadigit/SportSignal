# HANDOFF — SportSignal

> Agents: read AGENTS.md in the repo root first, and follow it for this whole session.

## This session (SEO Program Session 11 — Persian entity naming/metadata polish; EIGHTH implementation session, 2026-11-17)

The Persian entity-naming/metadata-polish session of the 15-session SEO
program: spelling-freeze-aware — the alternateName JSON-LD aliases + the
non-title metadata (og:type, og:locale) + the TEAM_SLUGS no-op tidiness
fix are NOT GSC-measured surfaces (machine-readable JSON-LD / non-title
metadata) — safe under the Dec 4-8 freeze IF they do not touch the
byte-frozen title/H1/description/answer-sentence bytes.
**Deployed (versioned): `21efcee2-269a-4ad1-819c-b6027822607a`**
(`13.267.0-persian-entities`) @ 100%. All phase acceptance criteria met
(SESSION-11.md — to be written next).

- **The THREE freeze-safe changes (S11 — route plan §10 + the keyword map
  §2.1-2.15 + spec §7/§8):**

  1. **og:type=article on the 3 detail page types (the S07-H4 follow-up).**
     `buildMatchPage` + `buildTeamPage` + `buildCompetitionPage`
     (`src/seo/pages.ts`) now pass `ogType: "article"` to `buildHead`.
     Hubs/index pages (the homepage, `/matches` hub, the 4 time hubs,
     `/teams` index, `/competitions` index) keep the default
     `og:type=website` (they pass NO `ogType` — the `page-shell.ts`
     default stands). og:type is a `<meta>` tag in `<head>` — NOT in the
     SERP snippet, NOT a GSC-measured surface (machine-readable metadata).
     The byte-frozen title/H1/description/answer-sentence bytes are
     untouched (the Dec 4-8 freeze holds). Verified live: the match page
     `/matches/barcelona-vs-villarreal-2026-11-22` carries
     `og:type=article`; the team page `/teams/barcelona` carries
     `og:type=article`; the competition page `/competitions/la-liga`
     carries `og:type=article`; the homepage `/` carries `og:type=website`
     (the default).

  2. **The SEO_EXTRA_ALIASES map — the GSC-observed Persian short-form
     aliases (the S1 M2 alternateName discipline, extended to the
     GSC-observed short form for a non-overridden selected club).**
     `src/seo/team-names.ts` gains a new `SEO_EXTRA_ALIASES` map keyed by
     `normTeamKey()`; `seoTeamAltNames` now consults it and appends the
     aliases to the JSON-LD alternateName array (machine-readable,
     invisible to the SERP snippet). The first entry is the Barcelona
     «بارسا» alias — GSC evidence: 179 impressions for «بازی بعدی بارسا»
     in `sportsignal-seo-implementation/GSC-AUDIT-BASELINE.md` (the
     2026-11-15 export). The alias rides BOTH the match-page
     `SportsEvent.homeTeam.alternateName` AND the team-page
     `SportsTeam.alternateName` (both nodes call `seoTeamAltNames`). The
     visible faName/SEO name bytes («بارسلونا» in the title/H1/answer/
     breadcrumbs) stay byte-frozen — only the JSON-LD alternateName gains
     the alias. Verified live: the match page
     `/matches/barcelona-vs-villarreal-2026-11-22`
     `SportsEvent.homeTeam.alternateName = ["بارسلونا", "بارسا"]` + the
     team page `/teams/barcelona` `SportsTeam.alternateName =
     ["بارسلونا", "بارسا"]`. The S-05 no-invented-data rule holds: every
     alias cites its GSC evidence (the impression count + the query
     string in the per-alias comment). The S1 M2 / F3 override layer
     (Leipzig «لایپزیگ»/«لایپزیش», Nordsjaelland «نورشلان»/«نوردشیلند»,
     Roma «رم»/«آ س رم») stays byte-frozen through Dec 4-8 — verified by
     the existing `check-seo-teamnames.js` gate (the type-strip regex
     extended to handle the new `: Record<string, string[]> =`
     annotation; the 7 override cases + the 4 control teams pass
     byte-identical).

  3. **The TEAM_SLUGS no-op tidiness fix (route plan §7 — the live
     provider-derived slugs for Inter + Atlético are now EXPLICIT pins).**
     `src/slugs.ts` `TEAM_SLUGS` gains `"Club Atlético de Madrid":
     "club-atletico-de-madrid"` + `"FC Internazionale Milano":
     "internazionale-milano"` — the live canonical URLs that the
     football-data.org provider names produce through `teamSlug()`'s
     NFD-strip derivation. The pinned values match the derivation output
     EXACTLY (true no-op: zero URL change, zero byte-frozen surface
     change); the explicit pins align the table with reality (the dead
     `inter-milan` / `atletico-madrid` entries stay for the sportscore/
     TSP short-form providers). Verified by the new
     `check-seo-persian-entities.js` gate (the explicit pins + the no-op
     proof: `teamSlug("FC Internazionale Milano") === "internazionale-
     milano"`; `teamSlug("Club Atlético de Madrid") === "club-atletico-
     de-madrid"`).

- **The new check gate — `scripts/check-seo-persian-entities.js`:** 15
  offline gates pinning: (1) og:type=article on the 3 detail page types;
  (2) og:type=website default on the hubs/index pages (incl. buildHub +
  buildHomePage); (3) og:locale=fa_IR pinned in page-shell.ts; (4) the
  SEO_EXTRA_ALIASES map exists + Barcelona «بارسا» alias (with the GSC
  evidence comment); (5) seoTeamAltNames consults SEO_EXTRA_ALIASES; (6)
  the Barcelona behavior (faName=«بارسلونا» byte-frozen, altName=null,
  altNames=[«بارسلونا», «بارسا»]); (7) the Barcelona short-form provider
  name resolves the same alias (normTeamKey folds); (8) Leipzig (the S1 M2
  / F3 override case) unchanged; (9) Chelsea (a non-overridden selected
  club with NO GSC-evidenced short form) — altNames=[«چلسی»]; (10)
  jsonld.ts wired (sportsEventNode + sportsTeamNode consult
  seoTeamAltNames); (11) the byte-frozen title/H1 ladders (match S7 +
  team S8 + competition S9) are byte-identical; (12) TEAM_SLUGS carries
  the explicit pins for the live provider-derived slugs; (13) the
  explicit pins match the derivation output (the no-op proof); (14)
  fa-dict.ts unchanged (the dictionary spellings stay — the
  SEO_EXTRA_ALIASES extension lives in src/seo/team-names.ts only).
  Wired into the `npm test` chain after `check-seo-internallinks.js`.

- **The seeded render harness — `scripts/s11-persian-entities-smoke.ts`:**
  a seeded SeoCtx with 4 upcoming matches (Barcelona/Leipzig, Real
  Madrid/Inter, Arsenal/Bayern, Chelsea/AC Milan) renders the match page
  (Barcelona vs RB Leipzig — exercises BOTH the Barcelona «بارسا» alias
  AND the Leipzig override) + the team page (Barcelona — exercises the
  SportsTeam.alternateName) + the competition page (La Liga — exercises
  the og:type=article + the SportsOrganization.alternateName) + the
  homepage (exercises the og:type=website default) + the /teams index
  (exercises the og:type=website hub pattern) + the TEAM_SLUGS no-op
  tidiness fix. **34/34 assertions pass.**

- **Byte-frozen (NOT changed — the Dec 4-8 freeze holds):** the
  competition-page title/H1/description/answer (Session 9), the
  team-page title/H1/description/answer (Session 8), the match-page
  title/H1/description/answer-sentence (Session 7), the homepage title/H1
  (Session 6), the date-hub empty-state copy on /matches/tomorrow
  (S06-H3). The team-name spellings in fa-dict.ts (the S1 M2 F3 spelling
  fix + the non-selected team dictionary) are byte-frozen — the
  SEO_EXTRA_ALIASES extension lives in `src/seo/team-names.ts` only (the
  scope law from S1 M2 holds: nothing outside `src/seo/` references the
  override layer; the bot/cards/digests render from fa-dict.ts and stay
  byte-identical — verified by the existing `check-seo-teamnames.js`
  scope-law gate). Decision S11-4.

- **What I checked (verification):** `npm test` exit 0 (**3,720 OK** =
  baseline 3,704 + 16 from the new `check-seo-persian-entities.js` gates
  + summary; `npx tsc --noEmit` clean); the new
  `check-seo-persian-entities.js` standalone (15/15 gates pass); the
  existing `check-seo-teamnames.js` (still passes — the 7 override cases
  + the 4 control teams byte-identical after the S11 SEO_EXTRA_ALIASES
  extension); the seeded tsx render harness (`scripts/s11-persian-entities-smoke.ts`
  — 34/34 assertions pass); local `wrangler dev` smoke (worker boots
  cleanly; `/healthz` 503 + `pool_matches:0` on the empty local KV —
  expected; the homepage renders `og:type=website` + the byte-frozen
  title; `/teams/barcelona` + `/competitions/la-liga` return 404 on the
  empty local KV — same as Session 8/9/10 local smoke). Live: version
  `13.267.0-persian-entities` on `/healthz` ✓ (ok:true + pool_matches:324
  + kv_writes_day:153 — the KV quota had reset at UTC midnight; healthy
  at deploy); the match page `/matches/barcelona-vs-villarreal-2026-11-22`
  renders `og:type=article` + the `SportsEvent.homeTeam.alternateName =
  ["بارسلونا", "بارسا"]` (the GSC-evidenced short form rides the JSON-LD
  array) + the byte-frozen title `⚽ بارسلونا – ویارئال | لالیگا، ۱ آذر (۲۲
  نوامبر) | اسپرت سیگنال` unchanged ✓; the team page `/teams/barcelona`
  renders `og:type=article` + the `SportsTeam.alternateName =
  ["بارسلونا", "بارسا"]` + the byte-frozen title `بارسلونا — برنامه بازی
  بعدی و ساعت شروع | اسپرت سیگنال` unchanged ✓; the competition page
  `/competitions/la-liga` renders `og:type=article` + the byte-frozen
  title `لالیگا — برنامه بازی‌های بزرگ پیش‌رو | اسپرت سیگنال` unchanged ✓;
  the homepage `/` renders `og:type=website` (the default) + the
  byte-frozen title `برنامه بازی‌های مهم فوتبال | تاریخ و ساعت شروع | اسپرت
  سیگنال` unchanged ✓. **The S11 data-surface self-verify is COMPLETE.**

- **The KV read quota (healthy at deploy; the daily-exceedance issue
  continues):** Live `/healthz` at Session 11 deploy (2026-11-17 02:35
  UTC): `ok:true` + `pool_matches:324` + `pool_age_min:55` +
  `kv_writes_day:153` + `degraded:false`. The KV quota had reset at UTC
  midnight (early UTC). The S11 data-surface self-verify is COMPLETE.
  The owner should continue to investigate the read-source (the quota
  gets exceeded DAILY during peak traffic); a Workers Paid plan ($5/mo →
  1M reads/day) remains the durable fix. Decision S11-5.

- **Cloudflare budget of this change:** zero new KV reads (the
  og:type=article pin + the SEO_EXTRA_ALIASES lookup + the TEAM_SLUGS
  pin are all in-memory operations on data already in scope); zero new
  KV writes (`kv_writes_day:153` at deploy — unchanged by the S11
  change); zero new subrequests; zero new fetches; zero render-cost
  additions (a small `ogType: "article"` string in the buildHead call
  + a small SEO_EXTRA_ALIASES map lookup in seoTeamAltNames + a
  constant-time TEAM_SLUGS lookup). Well within the free-tier budget.

- **Decisions:** S11-1 (the og:type=article on the 3 detail page types —
  the S07-H4 follow-up), S11-2 (the SEO_EXTRA_ALIASES map +
  Barcelona «بارسا» alias — the GSC-evidenced short-form alias), S11-3
  (the TEAM_SLUGS no-op tidiness fix — route plan §7), S11-4 (the
  freeze-coordination: the alternateName JSON-LD aliases + the non-title
  metadata are NOT GSC-measured surfaces; the byte-frozen title/H1/
  description/answer-sentence bytes are untouched), S11-5 (the KV quota
  healthy at deploy). Details in `docs/DECISIONS.md`.

- **Next session (Session 12):** the EN architecture + hreflang decision
  (the route plan §8 — Session 12 decides between (a) `/en/` URL
  architecture with genuinely localized pages + reciprocal hreflang, or
  (b) maintaining the single-language stance; the decision needs
  evidence Session 12 must gather itself — English-query demand in a
  fresh GSC export, EN SERP formats, the localization cost against the
  Worker budget). The next-session prompt is in
  `seo-implementation/next-session-prompt.md`. A fresh GSC export (16
  months, URL-level) remains the top evidence request.

## Current state (machine)

- **Version:** `13.267.0-persian-entities` (`src/config.ts` / `package.json` `13.267.0.0`). npm test baseline **3,720 OK** (`npx tsc --noEmit` clean + 55 check scripts — the +1 is the new `check-seo-persian-entities.js`; verified this session — was 3,704).
- **Deploy:** Worker `ucl-notifier`, versioned deploys only. Current deployment `21efcee2-269a-4ad1-819c-b6027822607a` (`13.267.0-persian-entities`; 2026-11-17, deployed @100%). Rollback chain: `12793863` (13.266.0-internallinks, Session 10) → `fc07b557` (13.265.0-competitions, Session 9) → `b313aada` (13.264.0-teampages, Session 8) → `3e3a65e7` (13.263.0-matchlinks, Session 7) → `7df40334` (13.262.0-homepage, Session 6) → `1d70129b` (13.261.0-matchlife, Session 5) → `7d92e633` (13.260.1-teamidx, Session 4) → `24c62781` (13.260.0-teamidx) → `c97ae70b` (byte-identical S28.1) → earlier. Rollback = `npx wrangler rollback`.
- **Production hostnames:** `sportsignal.ir` (apex Custom Domain), `football.sportsignal.ir` (301→apex except `/webhook`,`/api/`,`/admin`), `ucl-notifier.sportsignal.workers.dev` (noindex-guarded alias — HTML AND machine files since Session 4; never a scratch env).
- **Branch:** `main` (canonical; HEAD = `037ef33` — the Session 11 code checkpoint; ls-remote verified). Session 11 commit: `seo(s11): the Persian entity-naming/metadata polish — spelling-freeze-aware (the og:type=article on the 3 detail page types [the S07-H4 follow-up] + the SEO_EXTRA_ALIASES map carrying the GSC-evidenced Persian short-form aliases [the Barcelona «بارسا» alias] + the TEAM_SLUGS no-op tidiness fix [route plan §7]) + the new check-seo-persian-entities.js gate + the seeded render harness + version bump`.
- **Commands:** `npm test` (must exit 0 before every push). **npm only, never `bun install`**. Local dev: `npx wrangler dev --config wrangler.dev.toml --port 8787 --local` (the dev config has no [ai] remote binding — safe without the token). Deploy needs `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID=a796fdfe…` in the env.
- **Cron triggers:** `*/10 * * * *` + `27 */4 * * *` (unchanged). Live healthz at Session 11 close: version `13.267.0-persian-entities`; the KV quota had reset at UTC midnight (2026-11-17 02:35 UTC: `ok:true` + `pool_matches:324` + `pool_age_min:55`); `degraded:false`; `kv_writes_day:153` (unchanged by the S11 change — zero new writes; the S11 changes are in-memory og:type=article + SEO_EXTRA_ALIASES lookup + TEAM_SLUGS pin). **The S11 data-surface self-verify is COMPLETE** (post-quota-reset): the match page `/matches/barcelona-vs-villarreal-2026-11-22` renders `og:type=article` + `SportsEvent.homeTeam.alternateName = ["بارسلونا", "بارسا"]`; the team page `/teams/barcelona` renders `og:type=article` + `SportsTeam.alternateName = ["بارسلونا", "بارسا"]`; the competition page `/competitions/la-liga` renders `og:type=article`; the homepage renders `og:type=website` (the default); all byte-frozen titles unchanged.
- **Key folders:** `src/` (worker modules; `scripts/lib/worker-src.js` carries the bundle ORDER — co-evolve), `assets/` (immutable versioned client payload; SW `sportsignal-v126`, bundle `public-13.80.js`, stylesheet `public-13.87.css`), `docs/` (RUNBOOK, specs, audits, history), `sportsignal-seo-implementation/` (the SEO spec pack — owner's, tracker updated per session), `seo-implementation/` (the SEO program working tree: audits, keyword research, architecture, session reports, next-session prompts).
- **Backups:** KV is live state; no routine file backups (RUNBOOK §5 KV key contracts). Never rename KV keys.
- **Standing limits:** `_headers` at the 100-rule cap. **Cross-track SEO measurement window Dec 4-8: the GSC surfaces + team-name spellings stay byte-frozen through it.** The competition-page title/H1/description/answer ARE byte-frozen (Session 9 verified; Session 11 did not touch them). The team-page title/H1/description/answer ARE byte-frozen (Session 8 verified). The match-page title/H1/description/answer-sentence ARE byte-frozen (Session 7 verified). The homepage title/H1 ARE byte-frozen (Session 6). The date-hub empty-state copy on `/matches/tomorrow` IS byte-frozen (the S06-H3 follow-up is post-Dec-4). The team-name spellings in fa-dict.ts ARE byte-frozen (the S1 M2 F3 spelling fix is LIVE and mid-measurement — judge ~Dec 8). The S11 changes (og:type=article + SEO_EXTRA_ALIASES + TEAM_SLUGS no-op) are NOT GSC-measured surfaces (machine-readable JSON-LD / non-title metadata) — safe under the freeze. The S28 archive scope stays BIG matches only until the owner's A/B. Avoid deploys in the Nov 20 Bayern–Köln verification windows (M1 ~19:35 UTC, M2 ~21:35-45 UTC). Cloudflare free-tier budget: the 10ms CPU cliff on cold match renders is chronic; **the KV read quota (100,000/day free-plan) is exceeded DAILY** (it resets at UTC midnight but gets exceeded again during the day — Sessions 5-10 all closed with it exceeded at end-of-day; at Session 11 deploy it had just reset at UTC midnight: `ok:true` + `pool_matches:324`) — investigate the read-source; a Workers Paid plan ($5/mo → 1M reads/day) is the durable fix.

## Open follow-ups from the previous tracks (updated by Session 11)

- **Nov 20 (S27 option B):** the auto-verify workflow fires around Bayern–Köln; the owner re-fires the M1/M2 window sessions per the S27-cont record.
- **S24 (perf/CWV):** after Dec 8 — P1 hero `loading="lazy"`, P2 preconnect to crests.football-data.org, per-route CPU via GraphQL.
- **S26 (UI/UX iteration):** after S25 (done) — hero rendering, nav UX, FAQ discoverability, schedule density, telegram CTA. **S06-H4 (the visible curation copy) belongs here or in a dedicated UI round.**
- **S1/S2 SEO mini-track:** S1 spelling fix LIVE and mid-measurement (judge ~Dec 8); S2 title test parked — re-fire on/after Dec 4 with a fresh GSC export. **The program's Session 9/10/11 (competition/team pages + internal linking + Persian entity-naming) consumes the S2 title-test result after Dec 4 for the frozen-surface byte decisions (S09-3, S08, S07-H2, S06-H2).**
- **S25 follow-up smokes:** NVDA/VoiceOver + Safari/Firefox/Edge live confirmations (owner sessions needed).
- **C8 client-side staleness vector (Session 4):** the `/api/public-matches` zone-edge HIT stamp (`max-age=14400`) is browser-honored on the poll path — client-side fix or zone Cache Rule; owner decision.
- **KV read quota (Session 5/6/7/8/9/10/11, STILL OPEN):** the account's 100,000 KV reads/day free-plan limit is exceeded DAILY (it resets at UTC midnight but gets exceeded again during the day). Investigate the read-source; consider a Workers Paid plan ($5/mo → 1M reads/day). **Session 11's data-surface self-verify is COMPLETE** (the quota had reset at UTC midnight 2026-11-17 02:35 UTC; the live pages confirm the og:type=article + the alternateName «بارسا» alias + the byte-frozen titles).
- **Season-end lifecycle first run (Session 5, unchanged):** the mechanism is shipped + test-proven but INERT (flag false + empty dates map). To enable: confirm FD `season.endDate` values → populate `SEASON_END_DATES` → set `SEASON_END_NOINDEX_ENABLED = true` → versioned deploy → verify live. The first real transition is a May 2027 decision (after the 2026-27 season closes).
- **S10-2 follow-up (the homepage → team/competition spec §9 gap):** the homepage does NOT link directly to `/teams/<slug>` or `/competitions/<slug>` (spec §9 lists "Homepage → ... selected competition sections and selected team pages"). Closing it is a "link placement" change (in-scope per route plan §10) but touches the shared homepage standings/cups renderers (`markup.ts`) with visual side-effects — a Session 12+ follow-up (the EN/hreflang session or a dedicated internal-link pass).

## SEO program state (the 15-session track)

Session 01 ✅ Completed / verified in production (2026-11-16) — audit + docs.
Session 02 ✅ Completed, docs-only, no deploy (2026-11-16) — 369-phrase map + one-URL rules; allowlist corrected to 13.
Session 03 ✅ Completed, docs-only, no deploy (2026-11-16) — the approved architecture (map, matrix, route plan).
Session 04 ✅ Completed / verified in production (2026-11-16) — the crawl/index foundation (C1/C6/C8); 3,628 OK.
Session 05 ✅ Completed / deployed (2026-11-17) — the match-URL lifecycle mechanism (INERT by default); 3,652 OK. Deployment `1d70129b…` @100%.
Session 06 ✅ Completed / deployed (2026-11-17) — the homepage one-month window + carousel crawlability + curated-selection promise; 3,675 OK. Deployment `7df40334…` @100%.
Session 07 ✅ Completed / deployed (2026-11-17) — the match-detail footer-hook team-link gating + the metadata audit; 3,676 OK. Deployment `3e3a65e7…` @100%.
Session 08 ✅ Completed / deployed (2026-11-16) — the selected-club team-page @graph WebPage node + the new `check-seo-teampages.js` gate; 3,685 OK. Deployment `b313aada…` @100%.
Session 09 ✅ Completed / deployed (2026-11-17) — the competition-page @graph CollectionPage node + the date-hub/empty-state verification + the new `check-seo-competitionpages.js` gate + the seeded render harness; 3,694 OK. Deployment `fc07b557…` @100%.
Session 10 ✅ Completed / deployed (2026-11-17) — the `/teams` index tile ordering (the 13 selected clubs first — the ONE explicit S10 decision; the sort rides in buildTeamsIndexPage, the presentation layer, so teamsIndex stays the raw unfiltered generator per the Session 4 C1 law) + the new `check-seo-internallinks.js` gate (9 gates) + the seeded render harness (`scripts/s10-internallinks-smoke.ts` — 29/29 assertions pass); 3,704 OK. Deployment `12793863…` @100%.
Session 11 ✅ Completed / deployed (2026-11-17) — the Persian entity-naming/metadata polish (spelling-freeze-aware — og:type=article on the 3 detail page types [the S07-H4 follow-up — spec §8 + keyword map §2.7/2.8-2.13/2.15] + the SEO_EXTRA_ALIASES map carrying the GSC-evidenced Persian short-form aliases [the Barcelona «بارسا» alias — GSC evidence: 179 impressions for «بازی بعدی بارسا» in GSC-AUDIT-BASELINE.md; the alias rides the JSON-LD alternateName array ONLY — the visible faName/SEO name bytes stay byte-frozen through Dec 4-8] + the TEAM_SLUGS no-op tidiness fix [route plan §7 — the live provider-derived slugs for Inter + Atlético are now EXPLICIT pins; zero URL change, zero byte-frozen surface change]) + the new `check-seo-persian-entities.js` gate (15 gates) + the seeded render harness (`scripts/s11-persian-entities-smoke.ts` — 34/34 assertions pass); 3,720 OK. Deployment `21efcee2…` @100%.
`seo-implementation/next-session-prompt.md` holds the Session 12 start prompt
(EN architecture + hreflang decision). Progress source of truth:
`sportsignal-seo-implementation/IMPLEMENTATION-TRACKER.md`.
