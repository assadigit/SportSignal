# Session 1 — Repository, Production and Technical SEO Audit

> Agents: read AGENTS.md in the repo root first, and follow it for this whole task.

- **Date:** 16 November 2026
- **Session:** SEO Implementation Program, Session 1 of 15 (spec pack v1.0, `sportsignal-seo-implementation/`)
- **Auditor:** SEO implementation agent (per `AGENT-INSTRUCTIONS.md`)
- **Method:** direct repository inspection (fresh clone), live production verification over HTTPS (curl + rendered-browser check at 1440px and 390px), Cloudflare API corroboration, and cross-verification of the supplied GSC export against `GSC-AUDIT-BASELINE.md`.
- **Code changes:** **None.** Session 1 is audit-only per the phase acceptance criteria ("No code changes unless a minimal instrumentation or safe fix is explicitly necessary and documented" — none was).

---

## 1. Repository identity and state (verified)

| Fact | Verified value |
|---|---|
| Remote (actual, verified via `git remote -v`) | `https://github.com/assadigit/SportSignal.git` (GitHub normalizes `assadigit/sportsignal`; same repository, public) |
| Default branch | `main` |
| HEAD at session start | `9f971e2d2260af5b7ee6d7e526f49f3504150fa4` ("Add files via upload" — the owner's zip upload; adds only `sportsignal-seo-implementation.zip`) |
| Working tree at clone | clean — **no uncommitted concurrent-agent work to preserve** |
| Other branches | `chore/tidy-root` (0 commits ahead of `main` — dormant, fully based on main), `feat/match-centre` (**merged** into `main` at `c058035`, 2026-11-15) |
| Open GitHub issues | #3 only — the S27-lifecycle auto-verify workflow tracker (benign, self-updating) |
| Spec archive | `sportsignal-seo-implementation.zip` (2,047,920 bytes) at repo root, added by `9f971e2`; listing inspected before extraction; extracted to `sportsignal-seo-implementation/` (30 files) — the folder did **not** previously exist, so no owner/agent edits were at risk; nothing was flattened over root files |
| Reference materials | `sportsignal-seo-implementation/reference/sportsignal.ir-GSC-11-15.zip` and `reference/homepage-screenshot.png` both present and inspected |

## 2. Framework, rendering model, test setup (verified)

- **Runtime:** Cloudflare Worker `ucl-notifier`, TypeScript, **zero web framework** (hand-rolled router; wrangler/esbuild bundles from `src/worker.ts`, a thin re-export of `src/api.ts`).
- **Rendering model:** **Server-side rendered HTML from KV state** — the SEO layer (`src/seo/data.ts:1-4`) reads only KV (`public_matches_v1` payload + `matches_v13_tracked` pool + `live_overlay_v1` + snapshot fallback); **no upstream provider fetch happens on page requests**. The client bundle (`assets/public-*.js`) progressively enhances and re-renders from `/api/public-matches` (SWR). A signature handshake (`__SS_SIG__`, `src/seo/router.ts:88-101`) lets the client skip identical rebuilds.
- **Test setup:** `npm test` = `tsc --noEmit` + 48 check scripts (eval-extract the real bundled source); plus `npm run seo:check` (live end-to-end verifier T-01…T-25 against production). Baseline reported by the previous session: 3,615 OK.
- **Deploy setup:** see §13.

## 3. Public routing table (verified in code + live)

Entry flow: `worker.fetch` → `handleFetchRequest` (`src/api.ts:297-380`): `/webhook` → admin auth routes → `/api/public-matches` → `/api/visit` → `/api/kickoff-drain` → **`handleSeoRequest`** (`src/seo/router.ts:456-798`) → `/api/card/*` → admin-gated `/admin*`+`/api/*` (all `/admin*` responses carry `x-robots-tag: noindex, nofollow`, `src/api.ts:403-409`).

Host/path normalization (all verified live, §12): `football.sportsignal.ir` → apex 301 (except `/webhook`, `/api/`, `/admin`); `www.` → apex 301; http → https 301 (prod hosts); trailing slash → 301; uppercase path → 301 lowercase; `/public` → `/` 301.

| Route | Builder | Notes (all verified live unless stated) |
|---|---|---|
| `/` | `buildHomePage` (`router.ts:107-375`) | 200; Persian title/desc; self-canonical; robots `index, follow…` |
| `/matches` (+`?page=N`, 50/page) | `buildMatchesPage` (`pages.ts:1419-1458`) | 200; `?page=2` self-canonical verified |
| `/matches/today` | `buildTodayPage` (`pages.ts:1561-1573`) | 200; Tehran-day anchored title |
| `/matches/tomorrow` | `buildTomorrowPage` (`pages.ts:1575-1587`) | 200, permanent, **empty state verified live** (no selected matches on 2026-11-17): «بازی‌ای برای فردا ثبت نشده است…» FAQ + «مسابقه‌ای در راه نیست» + links to today/this-week |
| `/matches/this-week`, `/matches/this-weekend` | `buildThisWeekPage`/`buildWeekendPage` (`pages.ts:1589-1621`) | 200; both indexable |
| `/matches/{home}-vs-{away}-{YYYY-MM-DD}` | `buildMatchPage` (`pages.ts:1022-1379`) | 200; SportsEvent JSON-LD; archived fallback (§6) |
| `/teams`, `/teams/{slug}` | `buildTeamsIndexPage`/`buildTeamPage` (`pages.ts:1624-1665, 1950-2059`) | 200; noindex when 0 upcoming |
| `/competitions`, `/competitions/{slug}` | `buildCompetitionsIndexPage`/`buildCompetitionPage` (`pages.ts:2062-2101, 2138-2201`) | 200; 404 when no upcoming pool rows; noindex when 0 upcoming |
| `/about`, `/methodology`, `/contact`, `/privacy`, `/terms`, `/data`, `/sitemap` (human) | `pages-static.ts` | 200; all indexable |
| `sitemap.xml` + `/sitemaps/{pages,competitions,teams,matches-upcoming,matches-archive}.xml` | `files.ts` | 200; see §7 |
| `robots.txt` | `files.ts:96-120` | 200; see §8 |
| `feed.xml` (Atom), `calendar.ics`, `/api/matches.json`, `llms.txt`, `llms-full.txt`, `/.well-known/security.txt`, `/BingSiteAuth.xml`, `/{indexnow-key}.txt`, `/og/match-{slug}.png` | `files.ts` / `router.ts` | machine files; feed/llms/og verified 200 |
| `/healthz` | `api.ts` POST_GATE_ROUTES | 200; version + scheduler telemetry |
| `/api/public-matches` | `public-swr.ts` | 200; edge-cached SWR |
| Custom 404 | `build404Page` (`pages-static.ts:284-312`) | verified: invented URL → **404** status, `noindex, follow` meta, links home/today/matches/sitemap |

## 4. Data and cache architecture (verified)

- **KV `STATE`** (id `c63588df…`): pool `matches_v13_tracked` (324 matches at audit time), payload `public_matches_v1` (TTL 720s), `live_overlay_v1`, `cache:snapshot:v1` (7d), `seo_archive_v1` (365d finished-match archive, TTL 400d), `seo_lastmod_v1`, `seo_indexnow_v1`, settings `bot_settings_v1`, `clubs_catalog`, FA-AI name caches, `standings_cache_<CODE>`.
- **D1:** `STATS_DB` (page-view counter, isolated from the KV 1k-writes/day free quota) and `USERS_DB` (bot user prefs).
- **Workers AI binding `AI`:** incremental Farsi club-name translation (`fa_teams_ai`), runs on payload rebuilds.
- **Service binding `DRAIN_SELF`:** kickoff fan-out drain chain (fresh subrequest budget).
- **Public pipeline:** `/api/public-matches` = Cache API edge hit (60s) → KV fresh (<5min) → stale-serve + background rebuild (SWR) → 7-day snapshot fallback → cold synchronous rebuild. Live rows patched from `live_overlay_v1`.
- **Upstream providers** (cron-driven only, never per-page): football-data.org (`provider-fd.ts`, free-tier key), sportscore (`provider-sportscore.ts`, hard 44-subrequest budget stop), thesportsdb (`provider-tsp.ts`), Wikipedia PGL standings fallback (`provider-wikipedia.ts`). Measured live: `subreq_last_tick: 31`; full sweeps ~40-50 subrequests (documented in code comments, `provider-sportscore.ts:76-101`).
- **Prewarm:** `cron-public.ts` rebuilds the payload on full sweeps / live changes when ≥555s stale.

## 5. Selected-club allowlist and team pages (verified — key spec area)

- **Code default** `CONFIG.BIG_TEAMS_BY_LEAGUE` (`src/config.ts:38-100`) — the season's selected clubs (14 European + 5 site-hidden A-League clubs for the bot):
  - **Premier League:** Arsenal, Chelsea, Manchester United, Manchester City, Liverpool
  - **La Liga:** Barcelona, Real Madrid, Atlético Madrid
  - **Serie A:** Inter, Milan
  - **Ligue 1:** Paris Saint-Germain
  - **Bundesliga:** Bayern München, Borussia Dortmund
  - (EL/ECL lists repeat the 11 European clubs; AL is site-hidden from SEO.)
- **Admin overlay:** `getSettings` (`src/admin.ts:56-79`) overlays KV `bot_settings_v1` per league over the defaults and canonicalizes against the `clubs_catalog`; `applySettings` mutates runtime `CONFIG`. **Nuance (verified):** the SEO router returns before `applySettings` runs in the request flow (`api.ts:349` vs `api.ts:369`), so SEO page generation uses the compiled defaults unless the isolate's CONFIG was mutated earlier by cron preflight/payload rebuild — in practice the deployed selection equals the code default list above (corroborated: the live sitemap's match set is exactly selected-club fixtures).
- **Team page generation — CONFIRMED GAP vs the owner's model:** `teamsIndex` (`src/seo/data.ts:276-310`) generates team pages for **both sides of every upcoming big pool match** (slug-deduped), not from the selected-club allowlist. Live sitemap `teams.xml` today: **87 team URLs**, including non-selected opponents (`/teams/1-koln`, `/teams/fulham`, `/teams/lecce`, `/teams/sv-07-elversberg`, `/teams/parma`, `/teams/leeds-united`, `/teams/ogc-nice`, …). This is the direct mechanism behind the GSC finding (127 team URLs, 16 clicks, 0.65% CTR) and is exactly what spec Sessions 8 (team pages) and 3 (keyword-to-URL) must address. **Do not blindly delete** — the spec requires demand/backlink review first (MASTER-SEO-SPEC §2 "Team pages").
- **Match eligibility:** a pool match is "big" when it involves a selected club (`shouldReport`), meets derby/LATE_STAGES cup rules (`config.ts:172-179`), or is a manual admin exception. Verified live: upcoming sitemap = selected-club fixtures (Bayern–Köln, Man City–Fulham, Gladbach–Dortmund, Chelsea–Leeds, Nice–PSG, Roma–Parma …). A-League rows are site-hidden (`config.ts:32`).

## 6. Match URL generation and lifecycle (verified)

- **Slug pattern:** `/matches/{teamSlug(home)}-vs-{teamSlug(away)}-{YYYY-MM-DD}` (`src/slugs.ts:102-105`; pinned `TEAM_SLUGS` table for 26 famous clubs). Lookup `findMatchBySlug` (`src/seo/data.ts:344-357`) matches exact slugs + UTC day; earliest kickoff wins on same-day duplicates.
- **Lifecycle today:** pool rows ~7-day post-finish retention → **S28 archive serve** (deployed 2026-11-15, v13.259): `findArchivedMatchBySlug` serves finished match pages from the 365-day `seo_archive_v1` KV archive (`pages.ts:1030-1043`), with the S28.1 CPU mitigation `ARCHIVE_PAGE_TTL = 21600s` (6h render-hold, `seo/config.ts:91-97`, `router.ts:736`). The per-match OG PNG route follows the same fallback with a 1h edge hold.
- **Sitemap `matches-archive`** child lists the 30-day pool window **plus** the 365-day archive (deduped): **151 URLs today**; `matches-upcoming`: **123 URLs** (92-day horizon, uncapped).

## 7. Sitemap (verified live, 2026-11-16)

- `/sitemap.xml` = sitemap index, 5 children, `max-age=600` + ETag:
  - `pages.xml` — 15 URLs (/, 5 time hubs, /matches, /teams, /competitions, /about, /methodology, /contact, /privacy, /terms, /data, /sitemap)
  - `competitions.xml` — 7 URLs (bundesliga, premier-league, serie-a, ligue-1, la-liga, champions-league, dfb-pokal)
  - `teams.xml` — 87 URLs
  - `matches-upcoming.xml` — 123 URLs
  - `matches-archive.xml` — 151 URLs
  - **Total: 383 URLs.**
- **lastmod semantics (honest by design):** KV map `seo_lastmod_v1` advances `t` only when a content hash changes (match hash = utcDate|status|venue|round|teams|comp|score, `files.ts:175-179`); writes are change-only; children merge (never replace) the map (`files.ts:144-173`); IndexNow pings only changed URLs, 15-min rate limit with parked-URL drain (`indexnow.ts`).
- Static pages lastmod = `SEO.CONTENT_VERSION` = `2026-11-06T23:00:00Z`.

## 8. robots.txt (verified live)

```
User-agent: *
Allow: /
Disallow: /admin
Sitemap: https://sportsignal.ir/sitemap.xml
```
`/api/` deliberately crawlable (the page JS refreshes from it). No AI-bot blocks active (all three toggles true, `seo/config.ts:44-46`).

## 9. Canonical, redirects, hreflang, language architecture (verified live)

- **Canonical:** self-canonical on every page type (page-shell `src/seo/page-shell.ts:33,40`; homepage hardcoded `src/pages/public.ts:54`; `/matches?page=N≥2` keeps the query — verified live). The 404 emits **no** canonical (by design, F-L1).
- **Redirects (all verified live, single-hop 301):** http→https, www→apex, football→apex, trailing-slash, uppercase→lowercase, `/public`→`/`.
- **hreflang: NONE — confirmed.** Zero occurrences in `src/`; the EN/FA toggle is **client-side only** (`assets/public-13.80.js` `curLang()`); every page ships `<html lang="fa" dir="rtl">`. `scripts/seo-check.js:461-463` codifies the single-language decision (T-08). Spec Session 12 (English SEO + hreflang) will have to decide between `/en/` URLs or maintaining the single-language stance — **no English URL structure exists today**.
- **Environment safety:** non-production hosts (workers.dev, localhost) get `x-robots-tag: noindex, nofollow` + noindex meta (verified live on `ucl-notifier.sportsignal.workers.dev`). Minor gap noted: sitemap/feed/calendar/matches.json/llms files do not carry the non-prod `x-robots-tag` (only HTML, robots.txt, BingSiteAuth do) — low severity, candidate for Session 4.

## 10. Structured data (verified)

- Every page emits one JSON-LD `@graph` (`src/seo/jsonld.ts`): Organization + WebSite (`inLanguage: fa-IR`) everywhere; BreadcrumbList everywhere; SportsEvent (match pages, with eventStatus mapping, homeTeam/awayTeam SportsTeam refs with Persian alternateName, organizer sameAs, per-match OG image); CollectionPage/ItemList (lists, capped 50); FAQPage (hubs — visible/FAQ parity enforced); SportsTeam with verified Wikipedia/Wikidata sameAs; SportsOrganization (competitions); Dataset (on /data).
- **GSC "Missing field 'location'" (13 items) root cause CONFIRMED:** `SportsEvent.location` is emitted **only when a venue is known** (`jsonld.ts:149-154` — `{ "@type": "StadiumOrArena", name: m.venue }`). Venue comes from the provider row, the followed-clubs home-ground table, or the KV-cached FD detail fetch; archived rows additionally skip the home-ground table (venue honesty, `data.ts:441-445`). No address/geo is fabricated (the spec's no-invented-data law is already implemented). Fix path for Session 13: increase venue coverage from real sources only — never placeholder addresses.
- Verified live: Bayern–Köln match page emits StadiumOrArena; homepage emits CollectionPage + ItemList(25).

## 11. Indexability rules per page type (verified)

| Page type | robots meta | Rule |
|---|---|---|
| Homepage, hubs (today/tomorrow/this-week/this-weekend), /matches, /teams, /competitions, static pages | `index, follow…` | always indexable — **including empty hub days** (honest empty state; deliberate thin-content tradeoff) |
| Match detail | `index, follow…` | always (pool or archive row must exist, else 404) |
| Team page | `noindex, follow` when 0 upcoming | `MIN_UPCOMING_FOR_INDEX = 1` (`seo/config.ts:62`) |
| Competition page | `noindex, follow` when 0 upcoming; 404 when no pool rows | same threshold |
| 404 | `noindex, follow` + `x-robots-tag` | always |
| /admin* | `x-robots-tag: noindex, nofollow` | always |
| workers.dev / non-prod hosts | `x-robots-tag: noindex, nofollow` | environment guard R-13 |

## 12. Live production verification (2026-11-16, all performed this session)

| Check | Result |
|---|---|
| `/healthz` | 200; `version: "13.259.1-archttl"` — **identical to repo HEAD's `src/config.ts` VERSION (13.259.1-archttl) → production and repository are in sync**; `kv_writes_day: 117`, `subreq_last_tick: 31`, `pool_matches: 324`, `degraded: false` |
| Homepage SSR HTML | 245,720 bytes; Persian title «برنامه بازی‌های مهم فوتبال \| تاریخ و ساعت شروع \| اسپرت سیگنال»; dynamic meta description (next big match Liverpool–Man Utd, Shamsi-first date); self-canonical; `index, follow…`; exactly one sr-only `<h1>`; OG/Twitter complete; `lang="fa" dir="rtl"` |
| Rendered (browser, 1440px) | Title/H1 match SSR; hero countdown live; section order **domestic leagues first, UCL after** (matches spec); 202 links, 37 match links; **zero console errors** |
| Rendered (browser, 390px) | `scrollWidth 390 = innerWidth 390` — **no horizontal scroll**; mobile HUD card present |
| Headers | `cache-control: public, max-age=0, s-maxage=60, stale-while-revalidate=300`; weak ETag + 304 support; HSTS (no preload); CSP; `x-frame-options: DENY`; nosniff; referrer-policy; permissions-policy |
| Redirect matrix | http→https 301; www→apex 301; football→apex 301; `/matches/`→`/matches` 301; `/Matches`→`/matches` 301; `/public`→`/` 301 (all single-hop) |
| 404 behavior | invented URL → HTTP 404 + `noindex, follow` + helpful Persian 404 shell |
| workers.dev | 200 + `x-robots-tag: noindex, nofollow` (environment guard live) |
| Sitemaps | index + 5 children, 383 URLs, all 200; honest lastmods |
| robots.txt | as §8 |
| Machine files | `/og/match-….png` 200 (image/png); `/llms.txt` 200; `/feed.xml` 200; `/api/public-matches` 200 (edge-cached) |
| Reference screenshot | inspected (VLM + cross-checked against live HTML): current presentation — RTL Persian, hero = Liverpool vs Manchester United (matches the live meta description), match-list sections, standings sidebar. VLM-claimed elements NOT present in live HTML (polls, predictions nav, live-results copy block) — treated as model noise, disproven by grep |

**GSC live access:** not available to this agent (no Search Console API credential supplied). Per the phase instructions, the URL samples behind the 159 404 / 34 noindex / 32 crawled-not-indexed / 10 discovered-not-indexed counts were **not** inferred; only the supplied 2026-11-15 export (counts, no URL lists) was used, and its numbers were re-verified against the original CSVs (see the session report).

## 13. Deployment workflow (verified)

- **Mechanism (RUNBOOK §2 + HANDOFF):** `npm install` → `npm test` (must exit 0) → `npx wrangler dev` local smoke on src changes → **versioned deploy**: `CLOUDFLARE_API_TOKEN=… CLOUDFLARE_ACCOUNT_ID=a796fdfe… npx wrangler versions upload` → `npx wrangler versions deploy --version-id <id> --percentage 100 --yes` (instant rollback via `npx wrangler rollback`). Push is manual per the git discipline (fetch remote first, one-shot token URL push, verify with `ls-remote`).
- **Current production deployment:** `79688dbf-3807-4dbf-a491-b79e32190e68` = `13.259.1-archttl` (S28.1), 100% traffic — matches repo HEAD.
- **Production hostnames:** `sportsignal.ir` (Custom Domain), `football.sportsignal.ir` (301s to apex except webhook/api/admin), `ucl-notifier.sportsignal.workers.dev` (alias, noindex-guarded).
- **Secrets:** `BOT_TOKEN`, `CHAT_ID`, `API_TOKEN` (football-data.org), `ADMIN_TOKEN`, `ADMIN_PASS`, `WEBHOOK_SECRET`, `HEALTHCHECK_PING_URL` — server-side via `wrangler secret`; none in the repo (verified by scan of tracked files).
- **CI:** one GitHub workflow — `.github/workflows/s27-lifecycle-verify.yml` (the Nov 20 auto-verify, self-firing).

## 14. Confirmed-vs-suspected issue register

### Confirmed (evidence in hand)

| # | Issue | Evidence | Spec sessions affected |
|---|---|---|---|
| C1 | Team pages are generated for both sides of every eligible match (87 in sitemap incl. non-selected clubs), not from the selected-club allowlist | `data.ts:276-310`; live sitemap; GSC 127 team URLs / 0.65% CTR | S3, S8 |
| C2 | No hreflang, no EN URLs; EN is a client-side toggle only | grep of `src/`; `seo-check.js:461-463`; live HTML | S12 |
| C3 | SportsEvent `location` missing when venue unknown → GSC 13 missing-location items | `jsonld.ts:149-154`; GSC Critical issues-2 | S13 |
| C4 | 159 not-found URLs (Nov 15 export) — pool 7-day retention cliff; **already mitigated in production** by S28 archive serve (2026-11-15), 151 archive URLs now 200 + in sitemap | `pages.ts:1030-1043`; live archive sitemap; prior session docs | S5 (lifecycle policy formalization) |
| C5 | Empty hub pages (incl. `/matches/tomorrow`) remain indexable with thin content | `pages.ts:1551`; verified live empty state | S9 (empty-state/date-page policy) |
| C6 | Non-prod `x-robots-tag` gap on machine files (sitemaps/feed/calendar/matches.json/llms) | `router.ts` header application points | S4 (low severity) |
| C7 | Free-plan 10ms CPU cliff on cold match-page renders (chronic, pre-existing; 37 exceededResources in 3h observed 2026-11-15; 789 on Nov 10) — mitigated by 6h archive render-hold | prior session DECISIONS entry; `seo/config.ts:91-97` | all implementation sessions (guardrail) |
| C8 | `/api/public-matches` served with `cache-control: public, max-age=14400` at the edge (Cloudflare default on the cached JSON) — longer than the code's 60s intent; harmless for correctness (SWR client) but noted | live header | S4 (optional normalization) |

### Suspected / to validate later (no action without evidence)

| # | Item | Why uncertain |
|---|---|---|
| S1 | Which of the 87 current team URLs have external demand/backlinks (affects the noindex/redirect/keep decision) | requires GSC URL-level + backlink data (Session 2/8) |
| S2 | Whether Google honors the `?page=2` canonical consolidation | needs GSC page-level data |
| S3 | Team-page title pattern performance («X — برنامه بازی بعدی…» vs the «بازی بعدی X» query intent) | the repo's own parked S2 title test (Dec 4 gate) overlaps — coordinate |
| S4 | 32 crawled-not-indexed / 10 discovered-not-indexed URL identities | GSC export has counts only, no URL samples |

### Verified as NOT an issue (spec assumptions checked)

- Sitemap does not contain noindex/redirect/404 URLs by construction (children draw only live pool/archive sets).
- robots.txt does not block anything consequential (`/admin` only).
- Homepage claims curated importance (not full-coverage) in title/copy — matches positioning guardrails.
- No per-page upstream fetches; no client polling beyond the SWR refresh; cron jobs bounded (2 triggers).
- `/matches/tomorrow` empty state is honest (verified live on a genuinely empty day).

## 15. Risk map and standing constraints for the program

1. **Measurement freeze (cross-track):** GSC-measured surfaces must stay byte-frozen through the **Dec 4–8, 2026 window** (the repo's M2 spelling measurement); team-name spellings must not change before ~Dec 8. Sessions 2–3 (research/mapping, no code) are safe; implementation sessions must schedule surface changes after the freeze or scope them to non-frozen surfaces.
2. **Nov 20 lifecycle windows:** the S27 auto-verify workflow fires around Bayern–Köln (kickoff 2026-11-20T19:30Z). Avoid concurrent deploys in those windows.
3. **Cloudflare free tier:** KV writes measured 117/day (limit 1,000/day account-level); subrequests 31/tick (ceiling ~50); CPU cliff C7. Any SEO feature must be KV-read-cheap and render-cheap.
4. **`_headers` 100-rule cap** in `assets/` — new asset pins need a cap sweep.
5. **SEO layer reads only KV** — keyword-driven content changes must flow through the payload/pool builders, not new request-time fetches.
6. **npm only** (never `bun install`); `npm test` must exit 0 before every push; versioned deploys only.

## 16. Phase-plan implications (Session 1 conclusion)

The repository's real architecture **matches the spec pack's assumptions** (curated selection model, SSR Worker, KV-only SEO reads, sitemap machinery, robots, canonicals, environment guards all present and verified live). The 15-session sequence stands as written. Adjustments informed by this audit:

- Session 2 (keyword validation) must treat the **14 selected European clubs** (§5) as the only team-page keyword targets, and must cross-reference the repo's own parked title-test plan (S3 above).
- Session 3's keyword-to-URL mapping inherits the C1 decision (team page scope) as its central architecture question.
- Session 4 has two small confirmed items ready (C6, C8) beyond the spec's standard checklist.
- Session 12 must resolve the EN-architecture question from a zero-hreflang baseline (C2).
- Session 13's structured-data work has a precise, already-implemented venue-honesty constraint (C3).
- Session 5 inherits a working 365-day archive serve (C4) — its job is the policy/threshold formalization (`MATCH-LIFECYCLE-POLICY.md`), not new plumbing.

*All facts above were verified in this session against the repository at `9f971e2` and the live production site unless explicitly marked as suspected or as prior-session records.*
