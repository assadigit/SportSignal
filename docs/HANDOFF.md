# HANDOFF — SportSignal

> Agents: read AGENTS.md in the repo root first, and follow it for this whole session.

## This session (SEO Program Session 7 — match detail template and metadata; FOURTH implementation session, 2026-11-17)

The match-detail session of the 15-session SEO program: the site's primary
click surface (264 GSC URLs / 190 clicks / 6,338 impressions). Audits the
match-detail metadata (title/H1/meta/OG/JSON-LD/answer-sentence funnel —
all verified correct + byte-frozen through Dec 4-8), verifies the
date/time/timezone (`isoWithTehranOffset` + both calendars), verifies the
13 GSC "Missing field location" items (the MISSING-IS-NOT-ZERO law holds),
and makes ONE code change: the footer-hook team-link gating on
`isSelectedTeam` (spec §9 / the C1 disposition — only the 13 selected
clubs get a crawlable `<a href>`; non-selected clubs render as plain text).
**Deployed (versioned): `3e3a65e7-cebb-4fee-8354-8c3dd13d6f07`**
(`13.263.0-matchlinks`) @ 100%. All phase acceptance criteria met
(SESSION-07.md).

- **The footer-hook team-link gating (the spec §9 / C1 disposition):**
  the match-detail footer-hook («پیوندهای مرتبط» → «تیم‌ها» line) previously
  linked BOTH teams' pages unconditionally — `<a href="/teams/{slug}">` for
  both sides, regardless of whether the team is on the 13-club selected
  allowlist. Per spec §9: "Do not generate a link to an unindexable/thin
  team page simply because the team exists in the provider database" + the
  C1 disposition (Session 4: only 13 selected clubs get indexable team
  pages; non-selected clubs get `noindex, follow`). Session 7 gates the
  `<a href="/teams/...">` on `isSelectedTeam(m.homeTeam.name)` /
  `isSelectedTeam(m.awayTeam.name)` — the SAME predicate that gates the
  team-page indexable rule + the sitemap teams.xml filter. A selected club
  renders `<a href="/teams/{slug}">{name}</a>`; a non-selected club renders
  its Persian name as plain text. This is BODY-ONLY — the byte-frozen
  `<head>` is untouched. Decision S07-H1 in `docs/DECISIONS.md`.
- **The metadata audit (read-first, no byte changes):** the match-title
  ladder (⚽ pairing | competition، date | brand, ≤65 chars — the keyword
  map §2.15 plan), the H1 with both calendars, the meta-description ===
  answer-sentence === SportsEvent-JSON-LD-description funnel (one
  `matchAnswerSentence` source), the SportsEvent `startDate`
  (`isoWithTehranOffset`), the SportsEvent `location` (MISSING-IS-NOT-ZERO),
  the @graph 5-node contract, the per-match OG image, the 365-day archive
  serve, the related/h2h/schedule blocks. ALL verified correct + byte-frozen.
  The Dec 4-8 freeze applies to the match-page title/description/H1 bytes —
  Session 7 owns them but the actual byte change is a post-Dec-4 decision
  with a fresh GSC export. Decision S07-H2.
- **The 13 GSC "Missing field location" items (spec §6):** verified against
  the actual match-page JSON-LD — the SportsEvent `location` omits when
  `m.venue` is absent (the `if (m.venue)` guard). The 13 items are the
  no-venue matches (Google's informational warning). Per spec §6: "Never
  fabricate an address or use a generic placeholder." The current behavior
  is CORRECT — NO change. Decision S07-H3.
- **The date/time/timezone verification:** the SportsEvent `startDate` =
  `isoWithTehranOffset(m.utcDate)` (Tehran +03:30 fixed since 2022, from
  wall-clock delta — the venue tz is NOT in the data, never invented). The
  display is Tehran-time + Jalali (H1 = `faDateD2`, hero = `faDateD1`,
  facts-table = `fullWhenHtml`). All correct — no change.
- **`og:type` stays `"website"` (S07-H4):** deferred to a post-Dec-4
  decision — the match page doesn't carry a clean "published" date for
  `article:published_time`. The OG data is already unique per match.
- **Byte-frozen (NOT changed — the Dec 4-8 freeze holds):** the match-page
  `<title>`, `<h1>`, meta description, `matchAnswerSentence`, and the
  SportsEvent JSON-LD description are byte-identical to the pre-S07 values.
  The `check-match-centre.js` S20/S25 byte-freeze gates hold (verified by
  `npm test`).
- **Tests:** NEW Session 7 gate in `scripts/check-seo-crawlindex.js`
  (section 3b, 7 assertions). **npm test baseline now 3,676 OK** (was
  3,675; +1 from the new gate). Version triple `13.263.0.0` /
  `13.263.0-matchlinks`. No client asset changed (SW v126,
  `public-13.80.js`, `public-13.87.css`, `_headers` untouched — a
  server-side release).
- **KV read quota (pre-existing, NOT caused by the deploy):** the live
  `/healthz` shows `ok:false` + `pool_matches:0` — the account's 100,000
  KV reads/day free-plan limit is STILL exceeded (Session 5/6 close had it
  exceeded; the quota resets at UTC midnight). The SSR-structural change
  (the worker boots, the router, the /healthz version bump) IS verified
  live. The data-dependent surface (the rendered match-page footer-hook
  with the team-link gating) CANNOT be verified live while the quota is
  exceeded — it self-verifies once the quota resets (UTC midnight, ~5h
  from the deploy). The mechanism is INERT (Session 5 flag false) so the
  live behavior is byte-identical to Session 4/5/6 regardless of the
  quota. **The owner should investigate the read-source.** A Workers Paid
  plan ($5/mo) raises the limit to 1M/day.

**Next:** the owner fires Session 8 (selected-club team pages) with
`seo-implementation/next-session-prompt.md`. A fresh GSC export (16 months,
URL-level) remains the top evidence request (unlocks the S07-H2 match-page
title/H1 byte decisions, the S07-H4 `og:type` decision, the S06-H2 homepage
H1 decision, the S06-H3 tomorrow empty-state refinement, and the M5
marquee-slug refinement for the lifecycle).

## Current state (machine)

- **Version:** `13.263.0-matchlinks` (`src/config.ts` / `package.json` `13.263.0.0`). npm test baseline **3,676 OK** (`npx tsc --noEmit` clean + 51 check scripts; verified this session — was 3,675).
- **Deploy:** Worker `ucl-notifier`, versioned deploys only. Current deployment `3e3a65e7-cebb-4fee-8354-8c3dd13d6f07` (`13.263.0-matchlinks`; 2026-11-17, deployed @100%). Rollback chain: `7df40334` (13.262.0-homepage, Session 6) → `1d70129b` (13.261.0-matchlife, Session 5) → `7d92e633` (13.260.1-teamidx, Session 4) → `24c62781` (13.260.0-teamidx) → `c97ae70b` (byte-identical S28.1) → earlier. Rollback = `npx wrangler rollback`.
- **Production hostnames:** `sportsignal.ir` (apex Custom Domain), `football.sportsignal.ir` (301→apex except `/webhook`,`/api/`,`/admin`), `ucl-notifier.sportsignal.workers.dev` (noindex-guarded alias — HTML AND machine files since Session 4; never a scratch env).
- **Branch:** `main` (canonical; HEAD = the Session 7 code checkpoint `7e2503b`, pending the close-out commit). Session 7 commits: `7e2503b` (the footer-hook team-link gating + the Session 7 gate + version bump) + the close-out.
- **Commands:** `npm test` (must exit 0 before every push). **npm only, never `bun install`**. Local dev: `npx wrangler dev --port 8787` (needs `CLOUDFLARE_API_TOKEN` in env for the remote AI binding). Deploy needs `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID=a796fdfe…` in the env.
- **Cron triggers:** `*/10 * * * *` + `27 */4 * * *` (unchanged). Live healthz: version `13.263.0-matchlinks` confirmed; `ok:false` + `pool_matches:0` due to the KV read quota (pre-existing, self-heals at UTC midnight); `degraded:false`; `kv_writes_day:0` (zero new writes — the Session 7 change is a body-only SSR conditional).
- **Key folders:** `src/` (worker modules; `scripts/lib/worker-src.js` carries the bundle ORDER — co-evolve), `assets/` (immutable versioned client payload; SW `sportsignal-v126`, bundle `public-13.80.js`, stylesheet `public-13.87.css`), `docs/` (RUNBOOK, specs, audits, history), `sportsignal-seo-implementation/` (the SEO spec pack — owner's, tracker updated per session), `seo-implementation/` (the SEO program working tree: audits, keyword research, architecture, session reports, next-session prompts).
- **Backups:** KV is live state; no routine file backups (RUNBOOK §5 KV key contracts). Never rename KV keys.
- **Standing limits:** `_headers` at the 100-rule cap. **Cross-track SEO measurement window Dec 4-8: the GSC surfaces + team-name spellings stay byte-frozen through it.** The match-page title/H1/description/answer-sentence ARE GSC-measured surfaces — Session 7 changed NEITHER (verified by the check-match-centre.js S20/S25 byte-freeze gates). The homepage title/H1 ARE GSC-measured surfaces — Session 6 changed NEITHER. The S28 archive scope stays BIG matches only until the owner's A/B. Avoid deploys in the Nov 20 Bayern–Köln verification windows (M1 ~19:35 UTC, M2 ~21:35-45 UTC). Cloudflare free-tier budget: the 10ms CPU cliff on cold match renders is chronic; **the KV read quota (100,000/day) is STILL exceeded** — investigate the read-source; a Workers Paid plan ($5/mo → 1M reads/day) is the durable fix.

## Open follow-ups from the previous tracks (updated by Session 7)

- **Nov 20 (S27 option B):** the auto-verify workflow fires around Bayern–Köln; the owner re-fires the M1/M2 window sessions per the S27-cont record.
- **S24 (perf/CWV):** after Dec 8 — P1 hero `loading="lazy"`, P2 preconnect to crests.football-data.org, per-route CPU via GraphQL.
- **S26 (UI/UX iteration):** after S25 (done) — hero rendering, nav UX, FAQ discoverability, schedule density, telegram CTA. **S06-H4 (the visible curation copy) belongs here or in a dedicated UI round.**
- **S1/S2 SEO mini-track:** S1 spelling fix LIVE and mid-measurement (judge ~Dec 8); S2 title test parked — re-fire on/after Dec 4 with a fresh GSC export. **The program's Session 8 (team pages) consumes the S2 title-test result.**
- **S25 follow-up smokes:** NVDA/VoiceOver + Safari/Firefox/Edge live confirmations (owner sessions needed).
- **C8 client-side staleness vector (Session 4):** the `/api/public-matches` zone-edge HIT stamp (`max-age=14400`) is browser-honored on the poll path — client-side fix or zone Cache Rule; owner decision.
- **KV read quota (Session 5/6, STILL OPEN):** the account's 100,000 KV reads/day free-plan limit is exceeded. Investigate the read-source; consider a Workers Paid plan ($5/mo → 1M reads/day). Self-heals at UTC midnight. **Session 7's data-dependent surface (the rendered match-page footer-hook with the team-link gating) self-verifies once the quota resets.**
- **Season-end lifecycle first run (Session 5, unchanged):** the mechanism is shipped + test-proven but INERT (flag false + empty dates map). To enable: confirm FD `season.endDate` values → populate `SEASON_END_DATES` → set `SEASON_END_NOINDEX_ENABLED = true` → versioned deploy → verify live. The first real transition is a May 2027 decision (after the 2026-27 season closes).
- **S06 data-surface self-verify (Session 6):** once the KV quota resets (UTC midnight), re-verify live: (1) the homepage hero card anchor carries a real `/matches/{slug}` href; (2) the sr-only carousel nav is present when ≥ 2 slides; (3) the homepage boxes show ≤ 30 days; (4) the `/matches` hub shows ≤ 30 days. The SSR-structural changes are already verified live.
- **S07 data-surface self-verify (Session 7, NEW):** once the KV quota resets (UTC midnight), re-verify live: (1) a match page between two SELECTED clubs (e.g. Barcelona vs Man City) renders the footer-hook «تیم‌ها» line with BOTH team names as `<a href="/teams/...">` links; (2) a match page between one selected + one non-selected club renders the selected team as `<a href>` + the non-selected team as plain text; (3) a match page between two non-selected clubs (the top-3-standings route, e.g. Atalanta vs Kairat) renders BOTH team names as plain text (NO `<a href="/teams/...">`); (4) the competition link + the date links are unchanged. The SSR-structural change (the code gating) is verified by the check gates (3,676 OK).

## SEO program state (the 15-session track)

Session 01 ✅ Completed / verified in production (2026-11-16) — audit + docs.
Session 02 ✅ Completed, docs-only, no deploy (2026-11-16) — 369-phrase map + one-URL rules; allowlist corrected to 13.
Session 03 ✅ Completed, docs-only, no deploy (2026-11-16) — the approved architecture (map, matrix, route plan).
Session 04 ✅ Completed / verified in production (2026-11-16) — the crawl/index foundation (C1/C6/C8); 3,628 OK.
Session 05 ✅ Completed / deployed (2026-11-17) — the match-URL lifecycle mechanism (INERT by default); 3,652 OK.
Session 06 ✅ Completed / deployed (2026-11-17) — the homepage one-month window + carousel crawlability + curated-selection promise; 3,675 OK. Deployment `7df40334…` @100%.
Session 07 ✅ Completed / deployed (2026-11-17) — the match-detail footer-hook team-link gating (spec §9 / C1 disposition) + the metadata audit (title/H1/meta/OG/JSON-LD/answer-sentence funnel verified correct + byte-frozen; date/time/timezone verified; the 13 GSC "Missing field location" items verified against the MISSING-IS-NOT-ZERO law); 3,676 OK. Deployment `3e3a65e7…` @100%.
`seo-implementation/next-session-prompt.md` holds the Session 8 start prompt
(selected-club team pages). Progress source of truth:
`sportsignal-seo-implementation/IMPLEMENTATION-TRACKER.md`.
