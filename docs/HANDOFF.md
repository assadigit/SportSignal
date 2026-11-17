# HANDOFF — SportSignal

> Agents: read AGENTS.md in the repo root first, and follow it for this whole session.

## This session (SEO Program Session 12 — EN architecture + hreflang decision; NINTH session, 2026-11-17, docs-only)

The EN architecture + hreflang decision session of the 15-session SEO
program (the route plan §8 + §10). **Decision: Option (b) — maintain the
single-language stance, FINAL.** SportSignal stays a single-language
(Persian-first) site. No `/en/` URL architecture. No hreflang. The
client-side `?lang=en` toggle (the EN button + the `html[lang="en"]` CSS
rules in `src/pages/public.ts`) stays as the ONLY English surface — a
runtime display toggle, NOT a URL architecture. **Docs-only session: no
code change, no version bump, no deploy.** The live deployment stays at
`13.267.0-persian-entities` (deployment `21efcee2-269a-4ad1-819c-b6027822607a`
@100% — the Session 11 deploy).

- **The decision (S12-1 — three independently-verified evidence axes, all
  decisive for (b)):**

  1. **English-query demand = ZERO (the decisive axis).** Re-verified
     this session directly from the 2026-11-15 GSC export
     (`sportsignal-seo-implementation/reference/sportsignal.ir-GSC-11-15.zip`
     → `Queries.csv`). Across **375 visible query rows** (23 clicks /
     4,289 impressions), **374 are Persian** (or Persian-with-a-club-name-
     token). The **1 Latin-only string is "kups"** (KuPS — the Finnish
     club Kuopion Palloseura, a one-off European-tie opponent; **1
     impression, 0 clicks**, pos 7). One mixed row "بازی como" ("بازی" =
     Persian "match" + "como" = the Italian club Como; 1 impression, 0
     clicks) is a Persian query with a club-name token. **ZERO full
     English queries** — no "Arsenal next match", "Champions League
     fixtures", "Barcelona next game" or any English phrase. The country
     evidence (Countries.csv) corroborates: Iran = **248 clicks / 8,774
     impressions** (98.4% of clicks, 92.8% of impressions); Afghanistan =
     1 click / 438 impressions (Persian-speaking — Dari); the top
     English-speaking countries (US 0/12 pos 22.67, UK 0/6 pos 10.33,
     Canada 0/3 pos 24.67, Ireland 0/2) collectively carry **0 clicks /
     ~23 impressions at poor positions** — Persian-diaspora users
     searching in Persian, NOT English queries. Mobile = 94.8% of clicks.
     The keyword map §5 held cluster (20 English rows) has zero
     GSC-observed demand. **The existing 3-month snapshot is SUFFICIENT**
     — zero demand is zero demand regardless of the window; a fresh
     16-month export would only strengthen the finding.

  2. **The localization cost against the Worker budget is NOT justified.**
     Building `/en/` URLs doubles the page count (~383 → ~766 sitemap
     URLs; every FA page gets an EN mirror). Each EN page render reads
     the SAME KV data (`getSeoCtx` = payload + pool + overlay), so **the
     KV read budget doubles** — and the 100,000 KV reads/day free-plan
     limit is **ALREADY exceeded DAILY** (Sessions 5-11). The 10ms
     CPU/invocation cliff is chronic (37 `exceededResources` in 3h on
     v13.258, 789 on Nov 10); doubling the page count doubles the
     cold-render exposure. The free-tier budget cannot absorb the
     doubling. A Workers Paid plan ($5/mo → 1M reads/day) is the
     prerequisite for any future `/en/` architecture.

  3. **The EN SERP is saturated** by high-authority English-native
     publishers (BBC Sport, ESPN, the Premier League / La Liga / Serie A
     / Bundesliga / Ligue 1 official sites, Flashscore, Sofascore). The
     curation differentiator («برنامه بازی‌های مهم فوتبال») does not
     translate to a competitive English advantage. The site's best-CTR
     surfaces (`/matches/tomorrow` 8.26% CTR; the Barcelona–Man City
     match page 8.18% CTR) are ALL Persian-query surfaces.

- **The spec §7 law:** "Do not emit hreflang for an absent or non-
  equivalent translation." Zero English URLs today = hreflang would be a
  spec violation. The route plan §8 stance is now FINAL (no longer
  "pending Session 12").

- **The EN/hreflang state re-verified (audit C2 holds):** a codebase
  `grep` for `hreflang` / `/en/` / `lang="en"` / `x-default` /
  `alternate.*hreflang` confirmed: zero hreflang emission; zero `/en/`
  URLs (the router `src/seo/router.ts` has no `/en/` branch — the
  route-family regex matches only the FA paths); the only `lang="en"`
  references are the client-side EN button + the `html[lang="en"]` CSS
  rules in `src/pages/public.ts` (the display toggle); every page ships
  `<html lang="fa" dir="rtl">` (page-shell.ts line 107); `og:locale=fa_IR`
  pinned (page-shell.ts line 71); `scripts/seo-check.js:461-463`
  codifies the single-language decision (T-08 — a LIVE-audit gate, NOT in
  the offline `npm test` chain; it passes).

- **The keyword map §2 English plan slots — RETIRED as active plan
  slots.** The per-class "English plan slot (Session 12)" lines (§2.1
  homepage, §2.2 matches hub, §2.3-2.6 the four time hubs, §2.7 team,
  §2.8-2.13 competitions, §2.15 match detail) stay in the map as the
  documented Option (a) contingency (what the EN titles/H1s WOULD be if a
  future session re-litigates and chooses Option (a)), but they are no
  longer "pending Session 12" slots. The keyword map is NOT edited (it is
  a Session 3 deliverable; the route plan §8 FINAL stance + the DECISIONS
  S12-1 entry are the governance record that retires them as active).

- **What I checked (verification):** the GSC Queries.csv / Countries.csv /
  Devices.csv extracted directly from the 2026-11-15 export zip (§2.1 —
  the 375 rows / 374 Persian / 1 Latin-only "kups" / the country +
  device breakdown); the codebase `grep` for hreflang/EN references (§3
  of the Session 12 report — zero hreflang, zero `/en/` URLs, the only
  `lang="en"` is the display toggle); `npm test` exit 0 (**3,720 OK** =
  the baseline; no new check added, no code changed — verified before the
  push; `npx tsc --noEmit` clean); the live `/healthz` at session close
  (`ok:true` + `pool_matches:324` + `kv_writes_day:178` + `degraded:false`
  + `version:13.267.0-persian-entities` — the KV quota is healthy; no
  deploy).

- **Byte-frozen (NOT changed — the Dec 4-8 freeze holds; the S12 session
  is docs-only):** the competition-page title/H1/description/answer
  (Session 9), the team-page title/H1/description/answer (Session 8), the
  match-page title/H1/description/answer-sentence (Session 7), the
  homepage title/H1 (Session 6), the date-hub empty-state copy on
  `/matches/tomorrow` (S06-H3), the team-name spellings in fa-dict.ts
  (the S1 M2 F3 spelling fix is LIVE and mid-measurement — judge ~Dec 8).
  The S11 freeze-safe changes (og:type=article + SEO_EXTRA_ALIASES +
  TEAM_SLUGS no-op) stay durable.

- **Cloudflare budget of this change:** zero new KV reads (docs-only — no
  code, no render path change); zero new KV writes; zero new subrequests;
  zero new fetches; zero render-cost additions. The decision (Option (b))
  cannot worsen the KV-read quota issue — it adds nothing to the runtime.

- **Decisions:** S12-1 (the EN architecture + hreflang decision — Option
  (b), FINAL, with the three evidence axes), S12-2 (the freeze-
  coordination — docs-only, no byte-frozen surface touched, no
  code/deploy/version bump), S12-3 (the KV read quota healthy at session
  close; no deploy). Details in `docs/DECISIONS.md`.

- **Next session (Session 13):** the structured data + GSC enhancement
  validation (the route plan §10 — the phase file
  `sportsignal-seo-implementation/phases/SESSION-13-STRUCTURED-DATA.md`).
  The next-session prompt is in `seo-implementation/next-session-prompt.md`.
  The fresh 16-month GSC export remains the program's top evidence request
  — but the existing 3-month snapshot is SUFFICIENT for the S12 decision
  (zero English-query demand is zero regardless of the window); the fresh
  export would validate the frozen-surface byte decisions post-Dec-4 +
  the SEO_EXTRA_ALIASES future-additions + any future EN re-litigation.

## Current state (machine)

- **Version:** `13.267.0-persian-entities` (`src/config.ts` / `package.json` `13.267.0.0`) — UNCHANGED by the docs-only S12 session. npm test baseline **3,720 OK** (`npx tsc --noEmit` clean + 55 check scripts — UNCHANGED; no new check added; verified before the push).
- **Deploy:** Worker `ucl-notifier`, versioned deploys only. Current deployment `21efcee2-269a-4ad1-819c-b6027822607a` (`13.267.0-persian-entities`; 2026-11-17, deployed @100% — the Session 11 deploy; UNCHANGED by the docs-only S12 session). Rollback chain: `12793863` (13.266.0-internallinks, Session 10) → `fc07b557` (13.265.0-competitions, Session 9) → `b313aada` (13.264.0-teampages, Session 8) → `3e3a65e7` (13.263.0-matchlinks, Session 7) → `7df40334` (13.262.0-homepage, Session 6) → `1d70129b` (13.261.0-matchlife, Session 5) → `7d92e633` (13.260.1-teamidx, Session 4) → `24c62781` (13.260.0-teamidx) → `c97ae70b` (byte-identical S28.1) → earlier. Rollback = `npx wrangler rollback`.
- **Production hostnames:** `sportsignal.ir` (apex Custom Domain), `football.sportsignal.ir` (301→apex except `/webhook`,`/api/`,`/admin`), `ucl-notifier.sportsignal.workers.dev` (noindex-guarded alias — HTML AND machine files since Session 4; never a scratch env).
- **Branch:** `main` (canonical; HEAD = the S12 docs checkpoint — ls-remote verified after the one-shot token push). Session 12 commit: `seo(s12): the EN architecture + hreflang decision — Option (b) maintain the single-language stance, FINAL …` (docs-only — DECISIONS S12-1/2/3 + ROUTE-AND-CANONICAL-PLAN §8 FINAL + the §10 sequencing row + the SESSION-12 report + the HANDOFF/CHANGELOG/tracker + the Session 13 prompt).
- **Commands:** `npm test` (must exit 0 before every push). **npm only, never `bun install`**. Local dev: `npx wrangler dev --config wrangler.dev.toml --port 8787 --local` (the dev config has no [ai] remote binding — safe without the token). Deploy needs `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID=a796fdfe…` in the env.
- **Cron triggers:** `*/10 * * * *` + `27 */4 * * *` (unchanged). Live healthz at Session 12 close: version `13.267.0-persian-entities` (unchanged — no deploy); the KV quota is healthy (`ok:true` + `pool_matches:324` + `kv_writes_day:178` + `degraded:false`); `sched_next_ko: 2026-11-20T19:30:00.000Z` (the Bayern–Köln S27 auto-verify window — days away; noted for the next session's deploy-window check).
- **Key folders:** `src/` (worker modules; `scripts/lib/worker-src.js` carries the bundle ORDER — co-evolve), `assets/` (immutable versioned client payload; SW `sportsignal-v126`, bundle `public-13.80.js`, stylesheet `public-13.87.css`), `docs/` (RUNBOOK, specs, audits, history), `sportsignal-seo-implementation/` (the SEO spec pack — owner's, tracker updated per session), `seo-implementation/` (the SEO program working tree: audits, keyword research, architecture, session reports, next-session prompts).
- **Backups:** KV is live state; no routine file backups (RUNBOOK §5 KV key contracts). Never rename KV keys.
- **Standing limits:** `_headers` at the 100-rule cap. **Cross-track SEO measurement window Dec 4-8: the GSC surfaces + team-name spellings stay byte-frozen through it.** The competition-page title/H1/description/answer ARE byte-frozen (Session 9 verified). The team-page title/H1/description/answer ARE byte-frozen (Session 8 verified). The match-page title/H1/description/answer-sentence ARE byte-frozen (Session 7 verified). The homepage title/H1 ARE byte-frozen (Session 6). The date-hub empty-state copy on `/matches/tomorrow` IS byte-frozen (the S06-H3 follow-up is post-Dec-4). The team-name spellings in fa-dict.ts ARE byte-frozen (the S1 M2 F3 spelling fix is LIVE and mid-measurement — judge ~Dec 8). The S11 changes (og:type=article + SEO_EXTRA_ALIASES + TEAM_SLUGS no-op) are NOT GSC-measured surfaces (machine-readable JSON-LD / non-title metadata) — safe under the freeze; durable. **The S12 decision (Option (b) — maintain the single-language stance) is FINAL; no `/en/` URLs, no hreflang; a future re-litigation requires the three evidence axes (English-query demand + Workers Paid plan + a competitive angle).** The S28 archive scope stays BIG matches only until the owner's A/B. Avoid deploys in the Nov 20 Bayern–Köln verification windows (M1 ~19:35 UTC, M2 ~21:35-45 UTC). Cloudflare free-tier budget: the 10ms CPU cliff on cold match renders is chronic; **the KV read quota (100,000/day free-plan) is exceeded DAILY** (it resets at UTC midnight but gets exceeded again during the day — Sessions 5-11 all closed with it exceeded; at Session 12 close it was healthy: `ok:true` + `pool_matches:324`) — investigate the read-source; a Workers Paid plan ($5/mo → 1M reads/day) is the durable fix AND the prerequisite for any future `/en/` URL architecture.

## Open follow-ups from the previous tracks (updated by Session 12)

- **Nov 20 (S27 option B):** the auto-verify workflow fires around Bayern–Köln; the owner re-fires the M1/M2 window sessions per the S27-cont record. (`sched_next_ko: 2026-11-20T19:30:00.000Z`.)
- **S24 (perf/CWV):** after Dec 8 — P1 hero `loading="lazy"`, P2 preconnect to crests.football-data.org, per-route CPU via GraphQL.
- **S26 (UI/UX iteration):** after S25 (done) — hero rendering, nav UX, FAQ discoverability, schedule density, telegram CTA. **S06-H4 (the visible curation copy) belongs here or in a dedicated UI round.**
- **S1/S2 SEO mini-track:** S1 spelling fix LIVE and mid-measurement (judge ~Dec 8); S2 title test parked — re-fire on/after Dec 4 with a fresh GSC export. **The program's Session 9/10/11 (competition/team pages + internal linking + Persian entity-naming) consumes the S2 title-test result after Dec 4 for the frozen-surface byte decisions (S09-3, S08, S07-H2, S06-H2).**
- **S25 follow-up smokes:** NVDA/VoiceOver + Safari/Firefox/Edge live confirmations (owner sessions needed).
- **C8 client-side staleness vector (Session 4):** the `/api/public-matches` zone-edge HIT stamp (`max-age=14400`) is browser-honored on the poll path — client-side fix or zone Cache Rule; owner decision.
- **KV read quota (Session 5/6/7/8/9/10/11/12, STILL OPEN):** the account's 100,000 KV reads/day free-plan limit is exceeded DAILY (it resets at UTC midnight but gets exceeded again during the day). Investigate the read-source; consider a Workers Paid plan ($5/mo → 1M reads/day). **Session 12 close: the quota is healthy** (`ok:true` + `pool_matches:324` + `degraded:false`; no deploy — docs-only session). **A Workers Paid plan is ALSO the prerequisite for any future `/en/` URL architecture** (the S12-1 axis 2 — the 2× KV-read demand).
- **Season-end lifecycle first run (Session 5, unchanged):** the mechanism is shipped + test-proven but INERT (flag false + empty dates map). To enable: confirm FD `season.endDate` values → populate `SEASON_END_DATES` → set `SEASON_END_NOINDEX_ENABLED = true` → versioned deploy → verify live. The first real transition is a May 2027 decision (after the 2026-27 season closes).
- **S10-2 follow-up (the homepage → team/competition spec §9 gap):** the homepage does NOT link directly to `/teams/<slug>` or `/competitions/<slug>` (spec §9 lists "Homepage → ... selected competition sections and selected team pages"). Closing it is a "link placement" change (in-scope per route plan §10) but touches the shared homepage standings/cups renderers (`markup.ts`) with visual side-effects — a Session 13+ follow-up.
- **S11 SEO_EXTRA_ALIASES extension — future additions:** after Dec 4-8, with a fresh 16-month GSC export, validate the alias coverage — add NEW GSC-observed Persian variants as further `SEO_EXTRA_ALIASES` entries (every alias cites its GSC evidence per the S-05 rule).
- **S12 EN architecture decision (FINAL — Option (b)):** a future session that wants to build `/en/` URLs must re-litigate ALL THREE evidence axes (English-query demand in a fresh 16-month GSC export + a Workers Paid plan in place + a demonstrated competitive angle against the English-native publishers). The keyword map §2 English plan slots stay as the documented Option (a) contingency.

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
Session 10 ✅ Completed / deployed (2026-11-17) — the `/teams` index tile ordering (the 13 selected clubs first) + the new `check-seo-internallinks.js` gate + the seeded render harness; 3,704 OK. Deployment `12793863…` @100%.
Session 11 ✅ Completed / deployed (2026-11-17) — the Persian entity-naming/metadata polish (og:type=article + SEO_EXTRA_ALIASES + TEAM_SLUGS no-op) + the new `check-seo-persian-entities.js` gate + the seeded render harness; 3,720 OK. Deployment `21efcee2…` @100%.
Session 12 ✅ Completed, docs-only, no deploy (2026-11-17) — the EN architecture + hreflang decision: **Option (b) — maintain the single-language stance, FINAL** (zero English-query demand [375 GSC rows; 374 Persian; the 1 Latin-only string "kups" = the Finnish club KuPS, 1 impression, 0 clicks; zero full English queries; Iran = 248 clicks / 8,774 impr = 98.4% of clicks] + the localization cost against the Worker budget not justified [2× KV-read on a quota already exceeded daily + 2× CPU-cliff exposure + the sitemap doubles] + the EN SERP saturated by high-authority English-native publishers). The route plan §8 stance updated to FINAL; the keyword map §2 English plan slots RETIRED as active plan slots (the documented Option (a) contingency stays); the S12-1/S12-2/S12-3 DECISIONS entries. No code change, no version bump, no deploy; npm test 3,720 OK (baseline unchanged).
`seo-implementation/next-session-prompt.md` holds the Session 13 start prompt
(structured data + GSC enhancement validation). Progress source of truth:
`sportsignal-seo-implementation/IMPLEMENTATION-TRACKER.md`.
