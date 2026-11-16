# HANDOFF — SportSignal

> Agents: read AGENTS.md in the repo root first, and follow it for this whole session.

## This session (SEO Program Session 8 — selected-club team pages and allowlist; FIFTH implementation session, 2026-11-16)

The selected-club team-page session of the 15-session SEO program: the
`/teams/{slug}` family (keyword map §2.7; 13 selected clubs; 127 team URLs
generated only 16 clicks from 2,456 impressions at 0.65% CTR in the baseline
— the C1 disposition already noindexed the 74 non-selected team URLs in
Session 4; Session 8 owns the CONTENT of the 13 selected-club team pages
those match-detail footer-hook links point to). The Dec 4-8 measurement
freeze applies to the team-page title/H1 bytes (the parked S2 title test
reads GSC on Dec 4 — Session 8 owns the content + the structural JSON-LD,
NOT the title bytes pre-gate). **Deployed (versioned): `b313aada-04cf-4c0d-bdc9-2ca7527114dd`** (`13.264.0-teampages`) @ 100%. All phase acceptance criteria met
(SESSION-08.md).

- **The audit (read-first, no code):** `buildTeamPage` (`src/seo/pages.ts`) is
  already complete against the phase file + the keyword map §2.7 + the spec
  §2/§9: the title ladder (the byte-frozen template + the v13.229-teamladder
  >65 rung), the H1 («برنامه بازی‌های X»), the answer sentence (leads with
  «بازی بعدی X» when there is a next match — the GSC query head «بازی بعدی
  بارسا» 179 impr / pos 9.97), the meta description (derived from the answer,
  sliced to 165), the content blocks (the upcoming fixtures list «بازی‌های
  پیش‌روی X», the standings window card with the competition link, the
  form/season record card, the recent results «نتایج اخیر», the related-matches
  card), the internal links (crawlable `<a href>` match URLs via
  `dateGroupedRows` → `mrowHtml` → `matchHref` → the canonical
  `/matches/{home}-vs-{away}-{YYYY-MM-DD}`), the indexable rule (the C1
  disposition: `isSelectedTeam(entry.name) && upcoming.length >=
  SEO.MIN_UPCOMING_FOR_INDEX`), the team-name overrides (the S1 M2 F3 spelling
  fix in `src/seo/team-names.ts`), and the teams.xml 13-row filter (Session 4).
  ALL present + correct + byte-frozen. NO further content changes pre-Dec-4.
- **The ONE code change — the team-page @graph WebPage node (S8):** the team
  page was the lone page-class without a WebPage/CollectionPage node in its
  JSON-LD @graph. Every other page-class emits one (the match page via
  `JL.webPageNode`; the hubs + the `/teams` index + the `/competitions` index
  via `JL.collectionPageNode`). The spec contract (the Session 8 prompt Step 3:
  "the @graph carries Organization + WebSite + WebPage + BreadcrumbList") now
  holds: `buildTeamPage`'s `jsonldNodes` gains `JL.webPageNode(path,
  ctx.fetchedAt, { name: "برنامه بازی‌های " + name })` between `siteNodes()`
  and `sportsTeamNode`. STRUCTURAL JSON-LD hygiene only — the byte-frozen
  title/H1/description/answer are untouched (the Dec 4-8 freeze holds —
  verified by the new `check-seo-teampages.js` freeze gates). The competition
  detail page has the SAME gap (deferred to Session 9 — competition pages are
  Session 9's scope; the prompt's Step 6 standing constraint forbids starting
  Session 9 work this session). Decision S08-1 in `docs/DECISIONS.md`.
- **The new check gate — `scripts/check-seo-teampages.js`:** 8 offline gates
  pinned to the `buildTeamPage` function body: (1) the WebPage node is in the
  `jsonldNodes` array; (2) NO SportsEvent node; (3) the byte-frozen title
  ladder + the >65 rung; (4) the byte-frozen H1; (5) the answer sentence leads
  with «بازی بعدی X» (next match) / «برنامه بازی‌های X در اسپرت سیگنال» (no next
  match); (6) the indexable rule (the C1 disposition); (7) the crawlable
  upcoming-matches rows + the recent-results block (spec §9); (8) the @graph
  node order. Wired into the `npm test` chain after `check-seo-crawlindex.js`.
- **Byte-frozen (NOT changed — the Dec 4-8 freeze holds):** the team-page
  `<title>`, `<h1>`, meta description, answer sentence, and the team-name
  spellings. The match-page title/H1/description/answer (Session 7). The
  homepage title/H1 (Session 6). The WebPage node is NOT a GSC-measured surface
  (machine-readable JSON-LD, invisible to the SERP snippet) — safe under the
  freeze. Decision S08-2.
- **What I checked (verification):** `npm test` exit 0 (**3,685 OK** = baseline
  3,676 + 9 from the new `check-seo-teampages.js` gates; `npx tsc --noEmit`
  clean); local `wrangler dev` smoke (worker boots, `/healthz` 200, the SEO
  router resolves `/teams/barcelona` to the 404 data-path on empty local KV —
  correct, no code error); the tsx render harness (`scripts/s8-team-smoke.ts`
  — a seeded SeoCtx with Barcelona + an upcoming El Clásico) renders the team
  page with the @graph `Organization, WebSite, WebPage, SportsTeam, ItemList,
  BreadcrumbList`, the title «بارسلونا — برنامه بازی بعدی و ساعت شروع |
  اسپرت سیگنال», the H1 «برنامه بازی‌های بارسلونا», the self-canonical
  `https://sportsignal.ir/teams/barcelona`, robots `index, follow`, and a
  crawlable `<a href="/matches/barcelona-vs-real-madrid-2026-11-23">` —
  14/14 assertions pass. Decision S08-1.
- **The KV read quota (pre-existing, NOT a code issue):** STILL exceeded at
  Session 8 close (live `/healthz` 2026-11-16 19:59 UTC: `ok:false` +
  `pool_matches:0` + `pool_age_min:-1`). The team-page data surfaces (the
  upcoming approved matches list, the competition chips, the recent/final
  results) CANNOT be live-verified while the quota is exceeded — they
  self-verify once the quota resets at UTC midnight. The SSR-structural change
  (the WebPage node) is verified by the offline gates + the tsx harness. The
  owner should investigate the read-source; a Workers Paid plan ($5/mo → 1M
  reads/day) is the durable fix. Decision S08-3.
- **Cloudflare budget of this change:** zero new KV reads (the `webPageNode`
  call is an in-memory object literal built from `path` + `ctx.fetchedAt`
  already in scope); zero new KV writes (`kv_writes_day:0`); zero new
  subrequests; zero new fetches; zero render-cost additions (the node is a
  small object appended to an existing array). Well within the free-tier
  budget.
- **Decisions:** S08-1 (the WebPage node), S08-2 (the audit confirms the
  content is already complete — no further content changes pre-Dec-4),
  S08-3 (the KV read quota STILL exceeded). Details in `docs/DECISIONS.md`.
- **Next session (Session 9):** the competition pages (the
  `/competitions/{slug}` family — keyword map §2.8-2.13; the same WebPage-node
  gap exists on the competition detail page — Session 9 owns it). The
  next-session prompt is in `seo-implementation/next-session-prompt.md`. A
  fresh GSC export (16 months, URL-level) remains the top evidence request
  (unlocks the S2 team-page title-test result that Session 8 consumes after
  Dec 4, the S07-H2 match-page title/H1 byte decisions, the S07-H4 `og:type`

## Current state (machine)

- **Version:** `13.264.0-teampages` (`src/config.ts` / `package.json` `13.264.0.0`). npm test baseline **3,685 OK** (`npx tsc --noEmit` clean + 52 check scripts — the +1 is the new `check-seo-teampages.js`; verified this session — was 3,676).
- **Deploy:** Worker `ucl-notifier`, versioned deploys only. Current deployment `b313aada-04cf-4c0d-bdc9-2ca7527114dd` (`13.264.0-teampages`; 2026-11-16, deployed @100%). Rollback chain: `3e3a65e7` (13.263.0-matchlinks, Session 7) → `7df40334` (13.262.0-homepage, Session 6) → `1d70129b` (13.261.0-matchlife, Session 5) → `7d92e633` (13.260.1-teamidx, Session 4) → `24c62781` (13.260.0-teamidx) → `c97ae70b` (byte-identical S28.1) → earlier. Rollback = `npx wrangler rollback`.
- **Production hostnames:** `sportsignal.ir` (apex Custom Domain), `football.sportsignal.ir` (301→apex except `/webhook`,`/api/`,`/admin`), `ucl-notifier.sportsignal.workers.dev` (noindex-guarded alias — HTML AND machine files since Session 4; never a scratch env).
- **Branch:** `main` (canonical; HEAD = `24f0889` — the Session 8 code checkpoint + close-out in one commit; ls-remote verified). Session 8 commit: `24f0889` (the team-page @graph WebPage node + the check-seo-teampages.js gate + version bump + the report/tracker/handoff/decisions + the Session 9 prompt).
- **Commands:** `npm test` (must exit 0 before every push). **npm only, never `bun install`**. Local dev: `npx wrangler dev --port 8787` (needs `CLOUDFLARE_API_TOKEN` in env for the remote AI binding). Deploy needs `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID=a796fdfe…` in the env.
- **Cron triggers:** `*/10 * * * *` + `27 */4 * * *` (unchanged). Live healthz at Session 8 close (2026-11-16 19:59 UTC): version `13.263.0-matchlinks` (the S8 deploy lands after this read); `ok:false` + `pool_matches:0` + `pool_age_min:-1` due to the KV read quota (pre-existing, self-heals at UTC midnight); `degraded:false`; `kv_writes_day:0` (zero new writes — the Session 8 change is a structural JSON-LD node, an in-memory object literal).
- **Key folders:** `src/` (worker modules; `scripts/lib/worker-src.js` carries the bundle ORDER — co-evolve), `assets/` (immutable versioned client payload; SW `sportsignal-v126`, bundle `public-13.80.js`, stylesheet `public-13.87.css`), `docs/` (RUNBOOK, specs, audits, history), `sportsignal-seo-implementation/` (the SEO spec pack — owner's, tracker updated per session), `seo-implementation/` (the SEO program working tree: audits, keyword research, architecture, session reports, next-session prompts).
- **Backups:** KV is live state; no routine file backups (RUNBOOK §5 KV key contracts). Never rename KV keys.
- **Standing limits:** `_headers` at the 100-rule cap. **Cross-track SEO measurement window Dec 4-8: the GSC surfaces + team-name spellings stay byte-frozen through it.** The team-page title/H1/description/answer ARE GSC-measured surfaces — Session 8 changed NEITHER (verified by the new `check-seo-teampages.js` freeze gates). The match-page title/H1/description/answer-sentence ARE GSC-measured surfaces — Session 7 changed NEITHER. The homepage title/H1 ARE GSC-measured surfaces — Session 6 changed NEITHER. The WebPage node is NOT a GSC-measured surface (machine-readable JSON-LD) — safe under the freeze. The S28 archive scope stays BIG matches only until the owner's A/B. Avoid deploys in the Nov 20 Bayern–Köln verification windows (M1 ~19:35 UTC, M2 ~21:35-45 UTC). Cloudflare free-tier budget: the 10ms CPU cliff on cold match renders is chronic; **the KV read quota (100,000/day) is STILL exceeded** — investigate the read-source; a Workers Paid plan ($5/mo → 1M reads/day) is the durable fix.

## Open follow-ups from the previous tracks (updated by Session 8)

- **Nov 20 (S27 option B):** the auto-verify workflow fires around Bayern–Köln; the owner re-fires the M1/M2 window sessions per the S27-cont record.
- **S24 (perf/CWV):** after Dec 8 — P1 hero `loading="lazy"`, P2 preconnect to crests.football-data.org, per-route CPU via GraphQL.
- **S26 (UI/UX iteration):** after S25 (done) — hero rendering, nav UX, FAQ discoverability, schedule density, telegram CTA. **S06-H4 (the visible curation copy) belongs here or in a dedicated UI round.**
- **S1/S2 SEO mini-track:** S1 spelling fix LIVE and mid-measurement (judge ~Dec 8); S2 title test parked — re-fire on/after Dec 4 with a fresh GSC export. **The program's Session 8 (team pages) consumes the S2 title-test result.**
- **S25 follow-up smokes:** NVDA/VoiceOver + Safari/Firefox/Edge live confirmations (owner sessions needed).
- **C8 client-side staleness vector (Session 4):** the `/api/public-matches` zone-edge HIT stamp (`max-age=14400`) is browser-honored on the poll path — client-side fix or zone Cache Rule; owner decision.
- **KV read quota (Session 5/6, STILL OPEN):** the account's 100,000 KV reads/day free-plan limit is exceeded. Investigate the read-source; consider a Workers Paid plan ($5/mo → 1M reads/day). Self-heals at UTC midnight. **Session 7's data-dependent surface (the rendered match-page footer-hook with the team-link gating) self-verifies once the quota resets.**
- **Season-end lifecycle first run (Session 5, unchanged):** the mechanism is shipped + test-proven but INERT (flag false + empty dates map). To enable: confirm FD `season.endDate` values → populate `SEASON_END_DATES` → set `SEASON_END_NOINDEX_ENABLED = true` → versioned deploy → verify live. The first real transition is a May 2027 decision (after the 2026-27 season closes).
- **S06 data-surface self-verify (Session 6):** once the KV quota resets (UTC midnight), re-verify live: (1) the homepage hero card anchor carries a real `/matches/{slug}` href; (2) the sr-only carousel nav is present when ≥ 2 slides; (3) the homepage boxes show ≤ 30 days; (4) the `/matches` hub shows ≤ 30 days. The SSR-structural changes are already verified live.
- **S07 data-surface self-verify (Session 7):** once the KV quota resets (UTC midnight), re-verify live: (1) a match page between two SELECTED clubs (e.g. Barcelona vs Man City) renders the footer-hook «تیم‌ها» line with BOTH team names as `<a href="/teams/...">` links; (2) a match page between one selected + one non-selected club renders the selected team as `<a href>` + the non-selected team as plain text; (3) a match page between two non-selected clubs (the top-3-standings route, e.g. Atalanta vs Kairat) renders BOTH team names as plain text (NO `<a href="/teams/...">`); (4) the competition link + the date links are unchanged. The SSR-structural change (the code gating) is verified by the check gates (3,676 OK).
- **S08 data-surface self-verify (Session 8, NEW):** once the KV quota resets (UTC midnight), re-verify live: (1) a selected-club team page WITH upcoming matches (e.g. `/teams/barcelona`) renders 200 + `index, follow` + the @graph carries a `WebPage` node (the `@type` array includes `WebPage`) + the byte-frozen title «بارسلونا — برنامه بازی بعدی و ساعت شروع | اسپرت سیگنال» + the byte-frozen H1 «برنامه بازی‌های بارسلونا» + the upcoming-matches block with crawlable `<a href>` match rows + the recent-results block; (2) a selected-club team page with ZERO upcoming matches renders 200 + `noindex, follow` + the self-canonical unchanged + the full content (the noindex-must-stay-crawlable law); (3) a NON-selected team page (e.g. `/teams/atalanta`) renders 200 + `noindex, follow` + the self-canonical unchanged (the C1 disposition — NOT robots-blocked, NOT 404). The SSR-structural change (the WebPage node) is verified by the `check-seo-teampages.js` offline gates + the tsx render harness (14/14 assertions pass); the live data-surface self-verify confirms the rendered bytes once the quota resets.
- **S09 scope note (the competition-page WebPage node):** the competition detail page (`buildCompetitionPage`, `src/seo/pages.ts`) has the SAME @graph gap the team page had (no WebPage/CollectionPage node). Session 9 owns the competition pages and should add the WebPage node there for parity (one-line `JL.webPageNode(...)` or `JL.collectionPageNode(...)` in its `jsonldNodes`). NOT done in Session 8 — the prompt's Step 6 standing constraint forbids starting Session 9 work this session.

## SEO program state (the 15-session track)

Session 01 ✅ Completed / verified in production (2026-11-16) — audit + docs.
Session 02 ✅ Completed, docs-only, no deploy (2026-11-16) — 369-phrase map + one-URL rules; allowlist corrected to 13.
Session 03 ✅ Completed, docs-only, no deploy (2026-11-16) — the approved architecture (map, matrix, route plan).
Session 04 ✅ Completed / verified in production (2026-11-16) — the crawl/index foundation (C1/C6/C8); 3,628 OK.
Session 05 ✅ Completed / deployed (2026-11-17) — the match-URL lifecycle mechanism (INERT by default); 3,652 OK.
Session 06 ✅ Completed / deployed (2026-11-17) — the homepage one-month window + carousel crawlability + curated-selection promise; 3,675 OK. Deployment `7df40334…` @100%.
Session 07 ✅ Completed / deployed (2026-11-17) — the match-detail footer-hook team-link gating (spec §9 / C1 disposition) + the metadata audit (title/H1/meta/OG/JSON-LD/answer-sentence funnel verified correct + byte-frozen; date/time/timezone verified; the 13 GSC "Missing field location" items verified against the MISSING-IS-NOT-ZERO law); 3,676 OK. Deployment `3e3a65e7…` @100%.
Session 08 ✅ Completed / deployed (2026-11-16) — the selected-club team-page @graph WebPage node (structural JSON-LD hygiene — the team page was the lone page-class without one; the byte-frozen title/H1/description/answer untouched) + the audit (content + indexability + internal links verified already complete) + the new `check-seo-teampages.js` gate (8 gates); 3,685 OK. Deployment `b313aada-04cf-4c0d-bdc9-2ca7527114dd` @100%. Commit `24f0889` (ls-remote verified).
`seo-implementation/next-session-prompt.md` holds the Session 9 start prompt
(competition pages). Progress source of truth:
`sportsignal-seo-implementation/IMPLEMENTATION-TRACKER.md`.
