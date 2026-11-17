# HANDOFF — SportSignal

> Agents: read AGENTS.md in the repo root first, and follow it for this whole session.

## This session (SEO Program Session 10 — internal linking + navigation relationships; SEVENTH implementation session, 2026-11-17)

The internal-linking session of the 15-session SEO program: the cross-page
link graph refinement (tile order, anchor wording per the cannibalization
checklist — keyword map §3 + the route plan §2.3/§10 + MASTER-SEO-SPEC §9).
The Dec 4-8 measurement freeze applies to the GSC-measured surfaces (all
title/H1 bytes + the team-name spellings + the date-hub empty-state copy on
/matches/tomorrow). Anchor text in `<a href>` link text is NOT a GSC-measured
surface (it's not in the SERP snippet) — but the visible link text IS
user-facing, so any anchor change is diff-verified + recorded in DECISIONS.md.
Session 10's work is markup-only (the route plan §10) — safe under the freeze.
**Deployed (versioned): `12793863-ff39-49af-a5f7-e1cf0b5ccc28`**
(`13.266.0-internallinks`) @ 100%. All phase acceptance criteria met
(SESSION-10.md).

- **The ONE code change — the `/teams` index tile ordering (S10 — route plan
  §2.3 + §10):** `buildTeamsIndexPage` (`src/seo/pages.ts`) now sorts the
  `teamsIndex(ctx)` return so the 13 selected clubs (`isSelectedTeam`) lead the
  `/teams` index tile grid + the linkItemList JSON-LD, with the
  chronological-by-next-kickoff tiebreaker WITHIN each group. Cosmetic only —
  the non-selected tiles stay (the crawlability law: a noindex page stays
  crawlable so Google can read the directive; the 74 non-selected team URLs
  keep their internal links from the `/teams` index tiles + the match-page
  footer-hook). Zero KV cost (in-memory isSelectedTeam check on data already in
  scope). The visible==machine contract holds (the tile grid + the linkItemList
  JSON-LD consume the same sorted `entries` array — SS-13). The sitemap
  `teams.xml` membership is unaffected (the isSelectedTeam filter is
  post-iteration in `files.ts`). **The sort rides in the PRESENTATION layer
  (buildTeamsIndexPage), NOT in teamsIndex itself** — the Session 4 C1 law
  (`check-seo-crawlindex.js`) requires `teamsIndex` to generate BOTH sides
  unfiltered (the sitemap teams.xml filter + the team-page indexable rule apply
  isSelectedTeam; teamsIndex stays the raw chronological generator that powers
  the `/teams` tiles for ALL teams so the noindex stays crawlable). The route
  plan §2.3 named this "Session 10's call, cosmetic only" — the call is YES
  (the 13 indexable team pages lead the grid; the non-selected tiles follow as
  the crawl path). Decision S10-1 in `docs/DECISIONS.md`.

- **The audit (read-first, no code) — the cross-page internal-link graph
  traced:** every internal-link surface verified crawlable `<a href>` (no
  JS-only navigation, no `href="#"` placeholders in the tile grids): the
  homepage hero-card anchor + the sr-only carousel nav (S6), the match-page
  footer-hook «تیم‌ها» line + the competition link + the date links (S7, the
  isSelectedTeam gating intact), the team-page upcoming-matches block + the
  standings-window `.stmore` link (S8), the competition-page upcoming-matches
  block + the full standings table (S9), the `/teams` + `/competitions` index
  tile grids + the linkItemList JSON-LD (SS-13 visible==machine), the date-hub
  hubTiles() shortcut grid (all 4 sibling hubs), the `/matches` paginated hub,
  + the breadcrumbs on every page (home → section → page). The anchor wording
  is already aligned with the destination page's H1 intent. The cannibalization
  checklist (keyword map §3 — the 7 resolved overlaps) is NOT worsened. The
  ONE spec §9 gap the audit surfaced: the homepage does NOT link directly to
  `/teams/<slug>` or `/competitions/<slug>` (spec §9 lists them). Closing it is
  a "link placement" change (in-scope per route plan §10) but touches the shared
  homepage standings/cups renderers (`markup.ts`) with visual side-effects —
  documented as a Session 11+ follow-up (decision S10-2), NOT changed this
  session.

- **The new check gate — `scripts/check-seo-internallinks.js`:** 9 offline
  gates: (1) the buildTeamsIndexPage selected-clubs-first sort (the S10
  decision); (2) the C1-regression assertion (teamsIndex itself must NOT
  reference isSelectedTeam); (3) the /teams index visible==machine contract
  (SS-13); (4) the /competitions index visible==machine contract; (5)
  crawlable `<a href>` in the team-page + competition-page + date-hub match
  lists (dateGroupedRows); (6) the hubTiles() cross-hub nav (all 4 sibling
  hubs); (7) the breadcrumb discipline (every page class carries a trail); (8)
  the S7 footer-hook team-link gating regression pin; (9) the S6 homepage
  hero-card anchor regression pin. Wired into the `npm test` chain after
  `check-seo-competitionpages.js`.

- **The seeded render harness — `scripts/s10-internallinks-smoke.ts`:** a
  seeded SeoCtx with 4 upcoming matches (Arsenal/Juventus, Barcelona/Roma,
  Chelsea/Lazio, Bayern/Torino) renders the `/teams` index + the
  `/matches/this-week` hub + the `/matches/arsenal-vs-juventus` match page and
  asserts the selected-clubs-first tile order + the visible==machine contract
  (the linkItemList mirrors the tiles) + crawlable hrefs + the hubTiles
  cross-hub nav + the S7 footer-hook gating (Arsenal linked, Juventus plain
  text). **29/29 assertions pass.**

- **Byte-frozen (NOT changed — the Dec 4-8 freeze holds):** the
  competition-page title/H1/description/answer (Session 9), the team-page
  title/H1/description/answer (Session 8), the match-page title/H1/description/
  answer (Session 7), the homepage title/H1 (Session 6), the date-hub
  empty-state copy on /matches/tomorrow (S06-H3). The `/teams` index title/H1
  are unchanged («تیم‌های فوتبال دنبال‌شده — برنامه بازی‌ها | اسپرت سیگنال» /
  «تیم‌های دنبال‌شده»). The teamsIndex sort is NOT a GSC-measured surface (it
  reorders tiles, not the page's title/H1/description/answer). The anchor text
  in the tiles is the team name (unchanged). The linkItemList JSON-LD is
  machine-readable (invisible to the SERP snippet). Safe under the freeze.
  Decision S10-3.

- **What I checked (verification):** `npm test` exit 0 (**3,704 OK** = baseline
  3,694 + 10 from the new `check-seo-internallinks.js` gates + summary; `npx
  tsc --noEmit` clean); the new `check-seo-internallinks.js` standalone (9/9
  gates pass); the seeded tsx render harness (`scripts/s10-internallinks-smoke.ts`
  — 29/29 assertions pass); local `wrangler dev` smoke (worker boots, `/healthz`
  200 + version `13.266.0-internallinks`, `/teams` index renders the byte-frozen
  title + the empty-state on local empty KV, `/matches/this-week` hub renders
  the hubTiles + the breadcrumb, `/competitions` index renders the byte-frozen
  title). Live: version `13.266.0-internallinks` on `/healthz` ✓ (ok:true +
  pool_matches:324 + kv_writes_day:72 — the KV quota had reset at UTC midnight;
  healthy at deploy); `/teams` index renders 87 tiles (13 selected + 74
  non-selected) with the 13 selected clubs leading + the linkItemList
  numberOfItems=87 mirrors the tile order (visible==machine, SS-13) + the
  byte-frozen title unchanged ✓; `/competitions/premier-league` 200 + the
  byte-frozen title + the CollectionPage node (S9 unchanged) ✓. **The S10
  data-surface self-verify is COMPLETE.**

- **The KV read quota (healthy at deploy; the daily-exceedance issue
  continues):** Live `/healthz` at Session 10 deploy (2026-11-17 01:10 UTC):
  `ok:true` + `pool_matches:324` + `pool_age_min:50` + `kv_writes_day:72` +
  `degraded:false`. The KV quota had reset at UTC midnight (early UTC). The S10
  data-surface self-verify is COMPLETE. The owner should continue to investigate
  the read-source (the quota gets exceeded DAILY during peak traffic); a
  Workers Paid plan ($5/mo → 1M reads/day) remains the durable fix. Decision
  S10-4.

- **Cloudflare budget of this change:** zero new KV reads (the isSelectedTeam
  check is an in-memory Set membership lookup on data already in scope); zero
  new KV writes (`kv_writes_day:72` at deploy — unchanged by the S10 change);
  zero new subrequests; zero new fetches; zero render-cost additions (a
  comparator function on an already-iterated array). Well within the
  free-tier budget.

- **Decisions:** S10-1 (the /teams index tile ordering — the 13 selected clubs
  first; the sort rides in the presentation layer), S10-2 (the audit findings —
  every surface crawlable; the homepage → team/competition spec §9 gap documented
  as a Session 11+ follow-up), S10-3 (the freeze-coordination: markup-only +
  the Dec 4-8 freeze holds), S10-4 (the KV quota healthy at deploy). Details in
  `docs/DECISIONS.md`.

- **Next session (Session 11):** the Persian entity naming/metadata polish
  (spelling-freeze-aware — post-Dec-8 for frozen surfaces; the route plan §10).
  The next-session prompt is in `seo-implementation/next-session-prompt.md`. A
  fresh GSC export (16 months, URL-level) remains the top evidence request.

## Current state (machine)

- **Version:** `13.266.0-internallinks` (`src/config.ts` / `package.json` `13.266.0.0`). npm test baseline **3,704 OK** (`npx tsc --noEmit` clean + 54 check scripts — the +1 is the new `check-seo-internallinks.js`; verified this session — was 3,694).
- **Deploy:** Worker `ucl-notifier`, versioned deploys only. Current deployment `12793863-ff39-49af-a5f7-e1cf0b5ccc28` (`13.266.0-internallinks`; 2026-11-17, deployed @100%). Rollback chain: `fc07b557` (13.265.0-competitions, Session 9) → `b313aada` (13.264.0-teampages, Session 8) → `3e3a65e7` (13.263.0-matchlinks, Session 7) → `7df40334` (13.262.0-homepage, Session 6) → `1d70129b` (13.261.0-matchlife, Session 5) → `7d92e633` (13.260.1-teamidx, Session 4) → `24c62781` (13.260.0-teamidx) → `c97ae70b` (byte-identical S28.1) → earlier. Rollback = `npx wrangler rollback`.
- **Production hostnames:** `sportsignal.ir` (apex Custom Domain), `football.sportsignal.ir` (301→apex except `/webhook`,`/api/`,`/admin`), `ucl-notifier.sportsignal.workers.dev` (noindex-guarded alias — HTML AND machine files since Session 4; never a scratch env).
- **Branch:** `main` (canonical; HEAD = `<S10-SHA>` — the Session 10 code checkpoint + the close-out; ls-remote verified). Session 10 commit: `seo(s10): the /teams index tile ordering — the 13 selected clubs first (the ONE explicit S10 decision — route plan §2.3 + §10) + the check-seo-internallinks.js gate + the s10-internallinks-smoke.ts render harness + version bump`.
- **Commands:** `npm test` (must exit 0 before every push). **npm only, never `bun install`**. Local dev: `npx wrangler dev --config wrangler.dev.toml --port 8787 --local` (the dev config has no [ai] remote binding — safe without the token). Deploy needs `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID=a796fdfe…` in the env.
- **Cron triggers:** `*/10 * * * *` + `27 */4 * * *` (unchanged). Live healthz at Session 10 close: version `13.266.0-internallinks`; the KV quota had reset at UTC midnight (2026-11-17 01:10 UTC: `ok:true` + `pool_matches:324` + `pool_age_min:50`); `degraded:false`; `kv_writes_day:72` (unchanged by the S10 change — zero new writes; the S10 change is a presentation-layer sort). **The S10 data-surface self-verify is COMPLETE** (post-quota-reset): `/teams` index renders 87 tiles (13 selected + 74 non-selected) with the 13 selected clubs leading + the linkItemList numberOfItems=87 mirrors the tile order (visible==machine, SS-13) + the byte-frozen title unchanged; `/competitions/premier-league` 200 + the byte-frozen title + the CollectionPage node (S9 unchanged).
- **Key folders:** `src/` (worker modules; `scripts/lib/worker-src.js` carries the bundle ORDER — co-evolve), `assets/` (immutable versioned client payload; SW `sportsignal-v126`, bundle `public-13.80.js`, stylesheet `public-13.87.css`), `docs/` (RUNBOOK, specs, audits, history), `sportsignal-seo-implementation/` (the SEO spec pack — owner's, tracker updated per session), `seo-implementation/` (the SEO program working tree: audits, keyword research, architecture, session reports, next-session prompts).
- **Backups:** KV is live state; no routine file backups (RUNBOOK §5 KV key contracts). Never rename KV keys.
- **Standing limits:** `_headers` at the 100-rule cap. **Cross-track SEO measurement window Dec 4-8: the GSC surfaces + team-name spellings stay byte-frozen through it.** The competition-page title/H1/description/answer ARE byte-frozen (Session 9 verified; Session 10 did not touch them). The team-page title/H1/description/answer ARE byte-frozen (Session 8 verified). The match-page title/H1/description/answer-sentence ARE byte-frozen (Session 7 verified). The homepage title/H1 ARE byte-frozen (Session 6). The date-hub empty-state copy on `/matches/tomorrow` IS byte-frozen (the S06-H3 follow-up is post-Dec-4). The `/teams` index title/H1 are unchanged by Session 10. The teamsIndex sort is NOT a GSC-measured surface (it reorders tiles, not the title/H1). The S28 archive scope stays BIG matches only until the owner's A/B. Avoid deploys in the Nov 20 Bayern–Köln verification windows (M1 ~19:35 UTC, M2 ~21:35-45 UTC). Cloudflare free-tier budget: the 10ms CPU cliff on cold match renders is chronic; **the KV read quota (100,000/day free-plan) is exceeded DAILY** (it resets at UTC midnight but gets exceeded again during the day — Sessions 5-9 all closed with it exceeded at end-of-day; at Session 10 deploy it had just reset at UTC midnight: `ok:true` + `pool_matches:324`) — investigate the read-source; a Workers Paid plan ($5/mo → 1M reads/day) is the durable fix.

## Open follow-ups from the previous tracks (updated by Session 10)

- **Nov 20 (S27 option B):** the auto-verify workflow fires around Bayern–Köln; the owner re-fires the M1/M2 window sessions per the S27-cont record.
- **S24 (perf/CWV):** after Dec 8 — P1 hero `loading="lazy"`, P2 preconnect to crests.football-data.org, per-route CPU via GraphQL.
- **S26 (UI/UX iteration):** after S25 (done) — hero rendering, nav UX, FAQ discoverability, schedule density, telegram CTA. **S06-H4 (the visible curation copy) belongs here or in a dedicated UI round.**
- **S1/S2 SEO mini-track:** S1 spelling fix LIVE and mid-measurement (judge ~Dec 8); S2 title test parked — re-fire on/after Dec 4 with a fresh GSC export. **The program's Session 9/10 (competition/team pages + internal linking) consumes the S2 title-test result after Dec 4 for the frozen-surface byte decisions (S09-3, S08, S07-H2, S06-H2).**
- **S25 follow-up smokes:** NVDA/VoiceOver + Safari/Firefox/Edge live confirmations (owner sessions needed).
- **C8 client-side staleness vector (Session 4):** the `/api/public-matches` zone-edge HIT stamp (`max-age=14400`) is browser-honored on the poll path — client-side fix or zone Cache Rule; owner decision.
- **KV read quota (Session 5/6/7/8/9/10, STILL OPEN):** the account's 100,000 KV reads/day free-plan limit is exceeded DAILY (it resets at UTC midnight but gets exceeded again during the day). Investigate the read-source; consider a Workers Paid plan ($5/mo → 1M reads/day). **Session 10's data-surface self-verify is COMPLETE** (the quota had reset at UTC midnight 2026-11-17 01:10 UTC; the `/teams` index renders 87 tiles with the 13 selected clubs leading + the linkItemList numberOfItems=87 mirrors the tile order — verified live).
- **Season-end lifecycle first run (Session 5, unchanged):** the mechanism is shipped + test-proven but INERT (flag false + empty dates map). To enable: confirm FD `season.endDate` values → populate `SEASON_END_DATES` → set `SEASON_END_NOINDEX_ENABLED = true` → versioned deploy → verify live. The first real transition is a May 2027 decision (after the 2026-27 season closes).
- **S10-2 follow-up (the homepage → team/competition spec §9 gap):** the homepage does NOT link directly to `/teams/<slug>` or `/competitions/<slug>` (spec §9 lists "Homepage → ... selected competition sections and selected team pages"). Closing it is a "link placement" change (in-scope per route plan §10) but touches the shared homepage standings/cups renderers (`markup.ts`) with visual side-effects — a Session 11+ follow-up (the Persian/entity naming session or a dedicated internal-link pass).

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
`seo-implementation/next-session-prompt.md` holds the Session 11 start prompt
(Persian entity naming/metadata polish). Progress source of truth:
`sportsignal-seo-implementation/IMPLEMENTATION-TRACKER.md`.
