# SportSignal Match Centre — M0 Implementation Audit (S00 + S01)

**Audit date:** 2026-11-11
**Audited commit:** `114426b` ("Add files via upload", 2026-11-10) on branch `main`
**Working tree at audit end:** only the extracted v1.2 package files + the three M0 deliverables (this file, the ledger, the execution log)
**Package:** `SportSignal-Match-Centre-Implementation-Package-v1.2 (1).zip` (6,487,078 bytes, kept intact at repo root; it is git-tracked, uploaded by the owner)
**Method:** full source inspection (`src/**`, `scripts/lib/worker-src.js`, `wrangler.toml`, `wrangler.dev.toml`, `package.json`, `.github/workflows`, `docs/RUNBOOK.md`, `AGENTS.md`, `design-system/ucl-notifier/MASTER.md`, the dated `SPORTSIGNAL-API-DATA-AUDIT.md`), read-only GitHub/Cloudflare API queries, 4 read-only production GETs, `npm install` + full `npm test` run. No production mutation, no provider/KV stress tests, no deploys, no pushes.

---

## 1. Package extraction record (S00)

- Archive inspected before extraction: 16 entries, all expected documents present — `specification.md`, `decisions-register.md` (99 decisions), `engineering-guardrails.md`, `milestones-and-sessions.md`, `deployment-runbook.md`, `agent-prompt.md`, `session-checkpoint-template.md`, `milestone-ledger-template.md`, `MATCH-CENTRE-EXECUTION-LOG-TEMPLATE.md`, `MATCH-CENTRE-RELEASE-REPORT-TEMPLATE.md`, `implementation-plan.md`, package `README.md`, and all four `design-reference/*.png` images (1.6–1.9 MB each, all readable, analyzed visually).
- No enclosing folder inside the archive; contents extracted directly into the repository root.
- **One filename conflict, resolved without data loss:** the archive's `README.md` (3,240 B, the package's own orchestration readme) vs. the repository's existing `README.md` (34,137 B, the SportSignal project readme with the owner's banner and continuation notes). The package README was extracted as **`MATCH-CENTRE-PACKAGE-README.md`**; the repository README is untouched. All 15 other files extracted under their own names; no other conflicts existed.
- The ZIP is preserved untouched at the repo root per instruction.
- The four visual references were inspected (VLM-assisted). Recorded interpretation notes: generated images show a highlighted standings row background and a match-list "tabs" treatment — locked decision #25 (typography-only participant highlight, no row background) and the spec's five-destination sticky nav take precedence, as the package README states ("written requirements take precedence").

## 2. Verified current architecture

One Cloudflare Worker, **`ucl-notifier`** (TypeScript, zero framework, no build step — wrangler/esbuild bundles from `src/worker.ts`, a thin re-export entry). Version discipline: `src/config.ts` `VERSION` = `13.255-seospell` = `package.json` `13.255.0.0` = top `CHANGELOG.md` entry (enforced by `scripts/check-version-sync.js` in `npm test`).

**Entry surfaces (all served by the same artifact):**
1. Telegram webhook (`src/bot.ts` router) — not touched by Match Centre.
2. Public website — `src/api.ts` routes between the SEO router (`src/seo/router.ts`) and the legacy/admin paths; static assets served by Workers Static Assets **before** the worker runs.
3. Two cron triggers (`*/10 * * * *` tick + `27 */4` far-cup probe).

**The Match Centre route exists today:** `/matches/{home-slug}-vs-{away-slug}-{YYYY-MM-DD}`, routed in `src/seo/router.ts` (`renderPage`, line ~717) → `buildMatchPage()` in `src/seo/pages.ts` (line 269). The canonical path builder is `matchPath()` in `src/slugs.ts` — the single URL vocabulary also used by the payload `path` field, sitemap, JSON-LD and `matches.json`.

**Current match page composition (what M1–M8 will rework):** `matchHeadHtml` (grid scoreboard head, v13.81) + `matchActionsHtml` (calendar/ICS + Maps links) + `matchHeadScript` (inline JS) + `whyBigHtml` (answer-first "why big" card) + facts table (رقابت/مرحله/تاریخ/ورزشگاه/نام‌های دیگر/وضعیت/نتیجه) + `formStripHtml` (W/D/L dots + season record, v13.87/13.93) + `similarMatches` card (بازی‌های مرتبط, v13.82) + result block + related-links card — all wrapped in `pageShell()`.

**Data assembly (SSR, `src/seo/data.ts` `getSeoCtx`, one object per render):**
- `public_matches_v1` payload (+ `live_overlay_v1` patched in; `cache:snapshot:v1` as degraded fallback)
- `matches_v13_tracked` pool (raw rows, slimmed at write to a strict whitelist: `id, utcDate, status, venue, stage, matchday, round, roundRaw, roundFa, minute, scorers, homeTeam/awayTeam {name, crest, faName}, competition {code, faName, emblem}, score.fullTime` — **no halfTime**, v13.111-quotaslim; ~331 KB blob, 7-day row retention, 24 h TTL)
- 7 × `standings_cache_<CODE>` (PL, PD, SA, BL1, FL1, CL, PGL) — cache-only reads
- `fa_teams_ai` / `fa_venues_ai` (isolate-cached after first hit)
- site-hidden leagues filtered (v13.173-noal); ranks attached from standings (v13.248)
- `buildMatchPage` additionally: `hydrateMatchVenue` (curated home-ground table first — zero subrequests; else ONE FD detail fetch per match per 24 h, KV-cached positive-and-negative in `venue_v1_<id>`, 5 s race guard, fail-closed), `loadArchive` (one bounded read of `seo_archive_v1`, 365-day big-match archive), `fullByCodeFor` (one cache-only standings read for the fixture's competition).
- Edge caching: Cache-API render holds per page — default 900 s; live match page 120 s; upcoming lapses at kickoff+120 s; finished 900 s (`v13.97-seocpu`). HTML ships `cache-control: public, max-age=0, s-maxage=60, stale-while-revalidate=300` + ETag.

**Where new public pages go:** `src/seo/` (the documented exemplar — ARCHITECTURE.md "Where to add things"), NOT a new `api.ts` route. Match Centre work stays inside the existing `/matches/{slug}` route — no new route, no data-contract expansion required.

## 3. Design system inventory (what M1–M8 must reuse)

- **Source of truth:** `design-system/ucl-notifier/MASTER.md` + the live CSS `assets/public-13.87.css` (the version the SEO shell references; the site's newest CSS generation).
- **Colors (dark default):** `--bg #0f172a`, `--card #1e293b`, `--text #e2e8f0`, `--muted #94a3b8`, `--border #334155`, `--accent #2563eb/#1d4ed8`, `--link #93c5fd`, `--score #4ade80`, `--danger #f87171`; light theme via `[data-theme="light"]`. The spec's "icy blue" maps to the existing `#7dd3fc`/`#5ea0ff` sky-accent family already used by `.mcount`, `.mvenue-map`, `.strow-me`, `.fspos`.
- **Fonts (self-hosted, no CDN):** Morabba variable (250–900) for headings/display; Peyda 400–900 (FaNum editions — Persian digits default) for body; registered by `FONT_FACES_STYLE` (`src/pages/styles-shared.ts`), preloaded by the SEO shell. `tabular-nums` on scores/points. Retired Vazirmatn files stay on disk only for stale-cache retention.
- **Shell:** `src/seo/page-shell.ts` — `buildHead()` (canonical/robots/OG/Twitter/JSON-LD/icons/manifest) + `pageShell()` (global header `#topbar` with brand + `mainnav` + Telegram bot CTA, `.page-col` 760 px centered column, skip-link, footer `#about` with nav + data-source + social line + visit counter, RUM beacon). **Reuse as-is** (spec §3: existing global header first / decision 65: existing footer).
- **Reusable components already in the codebase:** `.matchhead/.mteam/.mcrest/.mcenter/.mscore/.mkick/.mlive/.mdot` (scoreboard head), `.mrow/.match` + `mrowHtml()` (broadcast-style match rows), `.stwin/.strow/.strow-me` + `buildStandingsWindowHtml()` (standings table, team pages), `.fdot .fw/.fd/.fl` + `formRowHtml()` (W/D/L dots + legend + season chip), `.facts` table, `.mchip/.mact` pills/actions, `.crumbs` breadcrumbs, `.dategroup` day headers, `.faqcard` (visible FAQ pattern on hub pages), hero-portrait SSR lookup `heroArtSrv()` in `seo/router.ts` (111 wired clubs from `HERO_COVERAGE_RAW`, `/players/hero/*.webp`), crest fallback `.mcrest-mono`, `rankChipHtml` (#N rank pill).
- **Assets & versioning law (ADR-006):** `assets/public-*.js/css` are immutable + rename-on-edit + `_headers` pin + `sw.js` CACHE bump **only when client-referenced assets change**. `_headers` is at its 100-rule cap (AGENTS §11 standing limit) — a new pinned asset requires a cap sweep. The Match Centre is server-rendered: prefer the existing SEO-page inline `<style>`/`<script>` pattern (page-shell already carries the page-specific block) to avoid asset renames entirely.
- **Homepage Telegram surfaces (reference for M8):** `TG_CHANNEL_URL = "https://t.me/sportsignalz"` (`src/pages/public.ts:12`; same value as the `TELEGRAM_CHANNEL_PUBLIC_URL` wrangler var — a public non-secret), `#promoStrip` (promo region with join button), `#tgHead` (header icon), `#tgPill` sticky mobile CTA with the grass background image.
- **Timezone capability:** SEO pages render Tehran time + UTC note server-side (`fullWhenHtml`, `SEO.DISPLAY_TZ_LABEL`). The homepage client bundle carries a full manual TZ picker (`TZ_ALL` + Persian region names, localStorage-persisted). No auto visitor-local conversion exists on any surface today — see §15 decisions for S05.

## 4. Data-availability matrix (verified at HEAD `114426b`)

Legend: **A** available now · **B** stored but needs a serve-path change · **C** live-only · **D** derivable at zero cost · **E** absent · **F** authoring required. Cost = incremental provider requests / KV ops per match-page render vs. today.

| Match Centre section | Data | Class | Verified source | Incremental cost | Failure/freshness behaviour |
|---|---|---|---|---|---|
| Hero — competition identity | code/faName/emblem | A | pool row → `pubMatch` (emblem + `LEAGUE_LOGOS` fallback) | 0 / 0 | emblem null → omit crest, keep name (no empty frame) |
| Hero — teams, crests | name/faName/crest + rank | A | `pubMatch` + `attachTeamRanks` (standings already read) | 0 / 0 | crest null/onerror → monogram fallback `.mcrest-mono` |
| Hero — score & lifecycle | `score.fullTime`, status, minute | A | pool + `live_overlay_v1` patched in `getSeoCtx` | 0 / 0 | stale-live guards (195-min span) everywhere; overlay ≤10 min fresh; live page hold 120 s |
| Hero — kickoff/date | `utcDate` ISO UTC | A | pool row | 0 / 0 | server renders Jalali+Gregorian, Tehran time + UTC note today; visitor-local see §15 |
| Scorers — LIVE | `scorers[]` | C | `public_matches_v1` upcoming rows (FD detail enrichment at prewarm; `live_detail_<id>` 90 s KV) — the payload is already loaded by `getSeoCtx`; match by id/pair+day | 0 / 0 | enrichment is cron-owned (~10 min after a goal); 90 s KV TTL; render only when present |
| Scorers — FINISHED | — | **E** | **Not available at zero cost — correction of the dated audit, see §5** | — | omit scorer block (spec §16: no scorers → keep score, omit list) |
| Half-time score | — | E (history) | dropped by the pool slim (`match-pool.ts` whitelist keeps `score.fullTime` only); FD list/detail carries it but detail fetches are venue-scoped today | — | omit the row (spec example: no HT → omit) |
| Standings — five-row neighbourhoods | full tables (pos/name/faName/crest/points/played/won/draw/lost/gf/ga/gd) | A | `standings_cache_<CODE>` ×7 already read by `getSeoCtx`; `teamStandingsWindow()` exists (team pages) | 0 / 0 | pre-season (`started:false`)/missing table → drop section fail-closed; cups/KO → not applicable; 24 h cache freshness appropriate |
| Team form — five W/D/L | last-5 finished results | A | `teamForm()`: pool finished rows (7 d) + `seo_archive_v1` (365 d, big matches), deduped, min-3 gate | 0 / 0 (archive already read once per render) | <3 rows → no dots (fail-closed, existing gate) |
| Latest five results (opponent/score/date/comp + link) | same rows | A | `teamForm()` rows + `matchPath()` links | 0 / 0 | link only when the match page exists (pool/archive rows carry `path`) |
| Home/away performance — goals for/against | season aggregates | A | `standings_cache_<CODE>` `gf`/`ga` (full competition sample, `played` count for labels) | 0 / 0 | honest sample label = `played`; missing table → omit |
| Home/away performance — clean sheets | derivable | D | pool finished (7 d) + archive (365 d): count fixtures with 0 conceded | 0 / 0 | **partial coverage** (tracked universe only) → minimum-sample gate + shared sample-window label (decision 33/34); omit when insufficient |
| Venue — stadium name (fa/en) | curated + provider | A | `TEAM_STADIUMS` (curated, `config.ts`), `homeGround()` gate (neutral finals excluded), provider venue, FD-detail hydration (KV 24 h, ≤1 fetch/match/day, fail-closed) | 0 / 0 (fetch already happens today on this route) | hydration failure → no venue row, page unaffected |
| Venue — city/country | — | **E** | no source: `TEAM_STADIUMS` carries `{en, fa}` only; no provider field retained; dated audit §5.7 confirms | — | **omit** (spec §16) unless the owner approves authoring a curated city table — see §15 |
| Weekly schedule (7-day window) | fixtures ±3.5 d around match date | A | `ctx.pool` (92-day horizon, hidden leagues filtered) + `payload.thisWeek/nextWeek` | 0 / 0 | tracked-universe coverage → the discreet coverage note is mandatory; empty ≠ "no matches" (spec §11) |
| FAQ content | — | **F** | no content source exists; must be manually authored, facts-only | 0 / 0 | answerable questions only; no FAQPage schema (decision 57) |
| Related — upcoming (either team) | fixtures | A | `teamMatches()`-style pool filter; `similarMatches()` exists (comp+stage → comp → same-day, upcoming only, capped) | 0 / 0 | omit when none qualify (no filler, decision 61) |
| Related — previous head-to-head | finished pair meetings | D | pool finished (7 d) + archive (365 d) pair filter | 0 / 0 | partial coverage → omit when none; max 4 combined, upcoming first |
| Telegram promotion | channel URL + assets | A | `TG_CHANNEL_URL` (`public.ts:12`) = `TELEGRAM_CHANNEL_PUBLIC_URL` (wrangler var) = `https://t.me/sportsignalz` | 0 / 0 | reuse verified URL; illustration asset must be authored (§15) |
| Player portraits (face-off) | 111 wired clubs | A | `HERO_COVERAGE_RAW` → `heroArtSrv()` SSR lookup; `/players/hero/*.webp` | 0 / 0 | both-or-neither (decisions 7/8); no retries |
| Global header/footer | shell | A | `pageShell()` | 0 / 0 | untouched |

**Bottom line:** every proposed section is implementable at **zero incremental provider requests and zero incremental KV operations** — all sections compute from `ctx` (payload + pool + standings caches + archive) that `getSeoCtx`/`buildMatchPage` already read today. The only genuinely missing data is: finished scorers, HT score, venue city/country, and FAQ/illustration content (authoring, not fetching).

## 5. Verification of the dated audit (`SPORTSIGNAL-API-DATA-AUDIT.md`, commit `e4973cc`)

Changes `e4973cc..HEAD` touch only 8 src files (`config.ts` version, `hero-coverage.ts`, `pages/public.ts`, `seo/jsonld.ts`, `seo/markup.ts`, `seo/page-shell.ts`, `seo/pages.ts`, `seo/team-names.ts`) — the data pipeline (`public-matches.ts`, `match-pool.ts`, `providers.ts`, `cron-*.ts`) is unchanged, so the audit's infrastructure findings carry over. Re-verified individually:

| Dated-audit claim | Verified at HEAD |
|---|---|
| R1 duplicated «ورزشگاه ورزشگاه…» venue wording | **CONFIRMED, still live** — reproduced on the production match page 2026-11-11 («ورزشگاه ورزشگاه آلیانز آرنا» in the answer card + JSON-LD description). Root cause unchanged: `seo/pages.ts:70` prepends «ورزشگاه » while curated `venueFa` values already begin with «ورزشگاه». Zero-cost string fix candidate for the S07/S14 surface. |
| R2 "FT scorers retained in pool rows" | **NOT SUPPORTED at current HEAD — corrected.** Every pool-write path was traced: `cacheMatches` is called only from `fetchMatchesFromAPI`/`fetchLongView` (provider list rows — FD v4 list, sportscore, TSP all carry no scorers), `provider-cups` (sportscore rows), and the quiet-tick stamp-advance (re-writes the **pre-merge** `poolRef`, not enriched rows). `enrichLiveMatches` runs in the cron public phase **after** the pool write and mutates only the tick's in-memory rows; the live overlay carries no scorers; `pubMatch` empties `scorers` for non-live rows; archive rows are `pubMatch`-shaped (scorers `[]`). Therefore finished-match scorers are **not** in `matches_v13_tracked` and cannot be surfaced without either an approved exception (e.g. piggybacking scorers onto the existing venue-detail fetch/cache — a data-contract change requiring owner approval per guardrails §1) or new provider requests (prohibited by default). M2/S04 must treat finished scorers as unavailable: score-only finished hero, scorer block omitted. |
| R3 standings window via existing reads | **Confirmed** — `fullByCodeFor` read already happens in `buildMatchPage`; `teamStandingsWindow` reusable; getSeoCtx reads all 7 standings caches. |
| R4 related fixtures grouped by round | **Confirmed** — `similarMatches` stage-0 candidates carry `matchday`/`roundRaw`. |
| R5 form home/away split + GF/GA | **Confirmed** — form rows + standings aggregates available; clean sheets derivable with sample gates (matrix §4). |
| R6 half-time score | **Confirmed unavailable** — pool slim drops `score.halfTime`; live_detail TTL 90 s; historical HT needs pool growth (rejected by default). |
| R7 hero portraits on the match head | **Confirmed feasible** — `heroArtSrv` exists; 111 wired clubs; both-or-neither per spec. |
| Pool ~331 KB / ~490 rows; 10 ms CPU rolling; 1,000 KV writes/day; 50 subrequest fetch ceiling; FD 10 req/min | **Confirmed** from source + RUNBOOK §7 (measured profiles); healthz right now: `kv_writes_day 636`, `subreq_last_tick 41`, `sched_mode IDLE`. |
| SEO pages never trigger provider sweeps | **Confirmed** — `seo/data.ts` header: "Reads ONLY KV… never triggers provider sweeps"; standings reads are cache-only; the ONLY provider fetch on the match-page path is the venue-detail hydration (existing, bounded, fail-closed). |

## 6. Infrastructure / resource-cost audit (match-page path)

**KV reads per match-page render (happy path, all pre-existing):** `public_matches_v1` + `live_overlay_v1` (read twice: `loadPayload` + `getSeoCtx` pool patch) + `matches_v13_tracked` + 7 × `standings_cache_<CODE>` + `fa_teams_ai`/`fa_venues_ai` (isolate-cached) + `seo_archive_v1` + 1 × standings (fullByCode) + 0–1 `venue_v1_<id>` ≈ **12–14 reads** — unchanged by Match Centre if all new sections render from `ctx` (the plan). KV ops do **not** count toward the 50-fetch subrequest ceiling (measured in RUNBOOK §7); the only fetch on this path is the venue detail (≤1 per match per 24 h, KV-cached positive and negative).

**KV writes from page renders (pre-existing, must not grow):** archive `syncArchive` (change-only) and the D1 visit beacon (separate 100k/day quota). Match Centre adds **zero** writes.

**CPU (free plan 10 ms rolling average — the binding constraint):** the pool JSON.parse (~331 KB) dominates; the render itself is string concatenation. The Cache-API render holds (900/120 s) are the structural protection (RUNBOOK §7b). Match Centre adds HTML string-building on an already-paid render — keep it O(pool) with no new parses; the render-hold logic in `router.ts` (live 120 s / upcoming kickoff+120 s / finished 900 s) must be preserved exactly.

**HTML payload:** current production match page measured **45,187 bytes** (HTTP 200, TTFB ~1.4 s from this session's location; edge cache `s-maxage=60`). Target: keep the Match Centre page in the same order of magnitude (the M9 gate compares against this baseline).

**Production state (verified read-only 2026-11-11):** `sportsignal.ir/healthz` → `ok:true`, `version 13.255-seospell` (= HEAD — live matches the audited tree), IDLE mode. Worker serves **two** production hostnames (`sportsignal.ir`, `football.sportsignal.ir`; the latter 301s to apex except `/webhook`, `/api/`, `/admin`). Bindings verified without values: secrets `ADMIN_PASS, ADMIN_TOKEN, API_TOKEN, BOT_TOKEN, CHAT_ID, WEBHOOK_SECRET`; `AI`, `DRAIN_SELF→ucl-notifier`, `STATE` KV, `STATS_DB`/`USERS_DB` D1, plain-text `TEHRAN_TZ` + channel vars. (`HEALTHCHECK_PING_URL`, listed in RUNBOOK §1, is not currently present as a binding — noted, no action needed.)

## 7. Tests, checks and baseline results

- **Commands (from `package.json`, recorded not guessed):** `npm test` = `npx tsc --noEmit` + `node scripts/check-version-sync.js` + 45 further `check-*.js`/`live-derby-test.js` scripts. `npm run seo:check` (production SEO regression; also the CI workflow's payload). Dev: `npx wrangler dev` (port 8787; `wrangler.dev.toml` is the local config — git-ignored). Deploy: `npm run deploy` = `wrangler deploy`. **npm only — never `bun install`** (breaks `@resvg/resvg-wasm`; AGENTS §11).
- **Baseline run (this session):** `npm install` (npm 11.19.1 / node 24.22.2; install-scripts for esbuild/sharp withheld by npm — not needed by the suite) → **`npm test` exit code 0, 2,961 `OK` lines, zero failures.** This is the M0 baseline; every session must re-run it before commit.
- **Harness co-evolution law (RUNBOOK §11, AGENTS §11):** the check scripts eval-extract the REAL bundled source via `scripts/lib/worker-src.js` (file order + TS→JS transform rules). **Any new `src/*.ts` module or signature change requires the `worker-src.js` order/transform update in the SAME commit**, plus a new `scripts/check-match-centre.js` wired into the `package.json` test chain for the new logic (standings windows, narrative triggers, schedule windows, resilience states).
- **Version law:** any deploy moves `src/config.ts VERSION`, `package.json` version and `CHANGELOG.md` together (codename suffix house style, e.g. `13.256-mcshell`).
- **CI (`.github/workflows/seo-check.yml`):** runs `scripts/seo-check.js` against **production** — on push, daily 03:23 UTC, and manual dispatch; plus best-effort Lighthouse. Two findings: (a) the `on: push` trigger's branch filter reads `branches: ain]` — a mangled value that matches no branch, so **push-triggered CI is effectively dead**; CI runs schedule/manual only; (b) CI does NOT run `npm test` — the local suite is the only code gate (RUNBOOK §12 says the same). No branch protection exists on `main` (verified via GitHub API — "Branch not protected"); the token in use has admin/push. A stale remote branch `origin/chore/tidy-root` exists (root tidy-up, `f7d5910`).

## 8. Git workflow, environments and rollback (verified)

- **Deploy ≠ push.** Deploys are manual: RUNBOOK §2 ritual = `npm install` → `npm test` (exit 0) → `npx wrangler dev` local smoke (`/healthz` + `/`) → `npx wrangler deploy` (needs `CLOUDFLARE_API_TOKEN` in the operator shell, never in the repo) → §3 post-deploy verification (healthz version, ≥2 clean ticks, RUM). Fetch remote + `ls-remote` verify at BOTH the push and deploy gates (S18b lesson).
- **Push convention (AGENTS §14 hard rules):** one-shot push URL (`git push https://x-access-token:<token>@… <branch>`), tokens never persisted in git config; `npm test` before every push; `git fetch` first (the owner sometimes uploads via the web UI — HEAD `114426b` is itself an "Add files via upload"). Never force-push; never bypass protections.
- **Preview/staging: NONE exists.** Verified: one worker, two production hostnames, no second environment, `previews_enabled: false` on both domains, no Workers Builds/git integration. The workers.dev subdomain IS enabled and serving the same production deployment (`ucl-notifier.sportsignal.workers.dev` → 200, same version) — it is an alias of production, **not** a preview. Per `deployment-runbook.md` §3 this must be reported and the owner asked once for the target strategy — see §10.
- **Rollback (verified mechanism, RUNBOOK §4):** `npx wrangler deployments list` → `npx wrangler rollback` (restores the previous version). Current deployment `88649642` (version `b48bae21`, 2026-11-10T11:10:43Z); previous `2b4b974b` (version `69985183`, 2026-11-10T04:40:36Z). KV schema is additive across versions (no renames, ever) → rollback-safe; forward-fix alternative: `git checkout <last-good> && npx wrangler deploy`. Rollback is code-only; no data/cache steps required for Match Centre changes (no schema/KV-contract changes planned).

## 9. Proposed branch, commit and push workflow (for owner approval)

1. **Feature branch: `feat/match-centre`**, cut from `main` at `114426b`. All S00–S22 work lands there. `main` stays deployable at all times; production only receives M10/S22.
2. **One atomic commit per completed session** (`deployment-runbook.md` §2): message style `docs(match-centre): …`, `feat(match-centre): add responsive page shell`, `test(match-centre): cover standings windows`, `fix(match-centre): …`. Stage only session-owned files; `git diff --check`; review the diff; update the execution log + ledger inside the same commit.
3. **Push after every session** to `origin/feat/match-centre` with the one-shot token URL; verify via `ls-remote`. `npm test` must exit 0 before every push. The owner reviews the branch at milestone gates (and may merge via PR or ask for a fast-forward merge at M10 — merge strategy decision below).
4. **M0 deliverables commit** (this audit + ledger + execution log + the extracted package files): one `docs(match-centre): extract v1.2 package and record M0 audit` commit on `feat/match-centre` after owner review of this report (per instruction: do not push until the branch strategy is approved).
5. **Hotfix rule:** if a production regression is ever traced to a Match Centre commit that reached `main`, fix-forward on the branch or roll back via `wrangler rollback` first (§8).

## 10. Preview / staging deployment strategy (owner decision required)

There is **no safe preview environment today**; `deployment-runbook.md` §3 forbids inventing one. Options, verified against the actual Cloudflare state:

- **Option A (recommended): Workers version previews.** `npx wrangler versions upload` (wrangler 4.x is the repo's toolchain) publishes an immutable version **without** activating it and returns a preview URL on the verified-enabled workers.dev subdomain (`https://<hash>-ucl-notifier.sportsignal.workers.dev`). Smoke tests hit the preview URL; production traffic is untouched; the version doubles as an instant rollback point. Caveats (documented, acceptable for read-only smoke tests): the preview version binds the **same production KV/D1** (a page view writes exactly what a normal page view writes — visit beacon + change-only archive sync — nothing more; no cron triggers run on it; never run admin/simulate/broadcast actions against it).
- **Option B (always, in addition): local verification.** `npx wrangler dev` + the full check-script suite per session, per RUNBOOK §2 — already the repo's de-facto process and the per-session gate regardless of A.
- **Option C (not recommended): a dedicated staging worker + its own KV.** Real isolation but new infrastructure, empty state (no production data → nothing to smoke-test against), cron complications, and it violates "no unnecessary dependencies" in spirit.

**Ask (one time, per the runbook): approve Option A (+B) as the milestone preview mechanism, or choose another target.** Until answered, milestones deploy to preview only in the sense of B (local) + the feature branch.

## 11. Production release and rollback procedure (proposed)

- **Production happens once, at S22**, after the M9 release-candidate review, the S21 readiness report and explicit owner approval (`milestones-and-sessions.md` M10 gate). No partial page ever reaches production.
- **S21 readiness includes:** full `npm test` green; local + preview smoke matrix (upcoming/live/finished routes, RTL/LTR, mobile/desktop, missing-data states, unrelated routes); version triple-sync (`13.25x-mc*`); recorded last-known-good deployment id + rollback command; deploy-time `git fetch` + `ls-remote` re-verification; CHANGELOG entry.
- **S22:** RUNBOOK §2 ritual verbatim → §3 verification (healthz version match, two clean ticks, RUM beacon 204) → the match-centre smoke matrix → record target, deployment id, timestamp, SHA in the ledger/log → produce `MATCH-CENTRE-RELEASE-REPORT.md` from the template.
- **Rollback on critical regression:** stop deploys → `npx wrangler rollback` (verified supported, §8) → smoke-test recovery → record the incident in the execution log. No speculative KV/cache mutations (KV contracts are untouched by this feature).

## 12. Session-by-session file change plan (S02–S22)

Architecture decision (consistent with the SEO-subtree exemplar and reviewability): the Match Centre renderer lives in **one new module `src/seo/match-centre.ts`** (imported by `pages.ts`'s `buildMatchPage`, which keeps owning head/SEO/JSON-LD/shell assembly), plus **`src/seo/editorial.ts`** for the narrative engine (S08/S09) and **`src/seo/faq-content.ts`** for authored FAQ copy (S16). Data-window helpers (schedule window, H2H, clean-sheet aggregation) extend `src/seo/data.ts`. Every new module lands with its `scripts/lib/worker-src.js` order entry **and** its check script in the same commit. CSS/JS ride the page-shell inline pattern (no asset renames, no `sw.js` bumps).

| Session | Primary files | Nature |
|---|---|---|
| S02 shell + semantic anchors | `src/seo/match-centre.ts` (new), `src/seo/pages.ts` (delegate), `scripts/lib/worker-src.js`, `scripts/check-match-centre.js` (new) + `package.json` test chain | route-shell restructure, semantic section anchors, header/footer reuse, zero new data |
| S03 responsive/RTL foundation | `src/seo/match-centre.ts`, `src/seo/page-shell.ts` (inline style block extension) | tokens/breakpoints from `public-13.87.css`, two-column→one-column collapse, LTR adaptation |
| S04 hero identity/lifecycle | `src/seo/match-centre.ts` | competition header, face-off (home right/away left RTL), central scoreboard, «میزبان/میهمان», upcoming/live/finished variants |
| S05 portraits + timezone/date | `src/seo/match-centre.ts` (+ reuse `heroArtSrv`) | both-or-neither portraits; kickoff/date rendering + visitor-local decision (§15 Q1) |
| S06 sticky nav + back-to-top | `src/seo/match-centre.ts` (inline JS) | five destinations, scroll tracking, offset, reduced motion |
| S07 facts panel + editorial layout | `src/seo/match-centre.ts`, `src/seo/pages.ts` (facts rows source) | label/value rows, omit-missing, open layout (no card), venue double-wording fix rides here (§5 R1) |
| S08 narrative engine | `src/seo/editorial.ts` (new), `src/seo/data.ts` (inputs), `scripts/check-editorial.js` (new) + worker-src order + package.json | registry, triggers, thresholds, exclusions, deterministic variant pick, priority ranking |
| S09 Persian copy + fallback | `src/seo/editorial.ts` | variants, lifecycle wording, factual fallback paragraph |
| S10 standings windows | `src/seo/data.ts` (two-team window + merge/ellipsis), `src/seo/match-centre.ts` | five-row neighbourhoods, overlap merge, ellipsis, no intervening rows |
| S11 standings presentation | `src/seo/match-centre.ts` | رتبه/تیم/بازی/تفاضل/امتیاز; typography-only highlight (decision 25 — differs from team pages' `.strow-me` background, document in code); five columns on mobile |
| S12 W/D/L + latest results | `src/seo/match-centre.ts` (reuse `teamForm`) | circles + lists, links only to existing pages, stacking |
| S13 home/away metrics | `src/seo/data.ts` (clean-sheet aggregation + sample labels), `src/seo/match-centre.ts` | GF/GA from standings; clean sheets from pool+archive with gates |
| S14 venue + schedule selection | `src/seo/data.ts` (7-day window helper), `src/seo/match-centre.ts` | venue panel (name only — §15 Q2), 48 h emphasis, coverage-note data |
| S15 schedule presentation | `src/seo/match-centre.ts` (inline JS) | date groups, broadcast rows, «نمایش روزهای بعد», one note |
| S16 FAQ | `src/seo/faq-content.ts` (new), `src/seo/match-centre.ts` (accordion JS) | authored content + delayed-collapse accordion |
| S17 related matches | `src/seo/data.ts` (H2H pair filter), `src/seo/match-centre.ts` | upcoming-first unified list, max 4 |
| S18 Telegram promotion | `src/seo/match-centre.ts`, one authored static asset (illustration, §15 Q3) | featured block, verified `TG_CHANNEL_URL`, one CTA |
| S19 resilience integration | `scripts/check-match-centre.js` (state matrix) | full/partial/stale/unavailable/N-A across lifecycle |
| S20 SEO/a11y/perf/regression | `scripts/seo-check.js` (match-page additions if needed), audit docs | schema/visible-facts consistency, CWV/CPU/size vs. M0 baseline, RTL/LTR matrix |
| S21 release readiness | `MATCH-CENTRE-RELEASE-REPORT.md` (from template), ledger/log | readiness evidence, rollback record |
| S22 production deploy | none (ops) | RUNBOOK §2 ritual + §3 verification + smoke matrix + report completion |

## 13. Risks, limitations and unknowns

1. **CPU budget (highest structural risk).** The free plan's 10 ms rolling average has three documented kill classes; the match-page render is the heaviest per-request class today. Mitigations: zero new KV reads/parses, keep additions O(ctx), preserve the render-hold logic exactly, and measure (M9) against the 45 KB / TTFB baseline. Per-route CPU is NOT instrumented — only class profiles (RUNBOOK §7/7b); stated as a measurement limitation.
2. **Cross-track SEO measurement in flight.** The S1/S2 SEO track is mid-measurement: the Nov 6 title change needs clean weeks until Dec 4, and team-name spellings must not change before ~Dec 8 (HANDOFF). Match Centre reworks the match page's *body*, but `<title>`, meta description, canonical, JSON-LD, breadcrumbs and the answer-first sentence are measurement surfaces — M1/S02 must preserve them byte-for-byte (restructure below the fold first), and S20 must re-verify them. Flagged to the owner: confirm the Match Centre body rework does not contaminate the GSC baseline.
3. **Finished scorers unavailable** (§5 correction). The finished hero shows score + «پایان بازی» only; the scorer block is omitted unless the owner approves the bounded venue-detail piggyback exception (§15 Q4).
4. **Venue city/country unavailable** — omit or author a curated table (§15 Q2).
5. **Tracked-universe coverage.** Pool/archive/standings cover the followed/big-match universe (6 leagues + cups + PGL). The schedule coverage note, sample-window labels on form/clean-sheet stats, and the omit-when-empty rules exist precisely for this; never claim completeness.
6. **No branch protection / effectively-dead push CI** (§7). The process compensates: feature branch + per-session `npm test` + owner review at gates. Optionally the owner may later protect `main`.
7. **Concurrent-agent risk.** HANDOFF shows the owner works with multiple agents and uploads via the web UI. Mitigation: `git fetch` + working-tree inspection at every session start (already the checkpoint rule); M0 ends with a clean, documented tree.
8. **workers.dev alias is production.** `ucl-notifier.sportsignal.workers.dev` serves live traffic; never treat it as a scratch environment. Option A preview URLs (§10) are distinct (per-version, unactivated).
9. **`_headers` 100-rule cap** — avoid new pinned static assets; if the S18 illustration is added under `assets/`, decide pin vs. no-pin explicitly.
10. **Unknowns not resolvable by inspection:** none blocking. The four §15 questions are product decisions, not blockers; S02 can start once the plan is approved and Q1/Q2 answered (Q3/Q4 can be deferred to their sessions).

## 14. Genuine blockers

None. The audit found no repository fact that prevents starting M1. One runbook-mandated ask (preview target, §10) and three content/design decisions (§15) need owner input; none blocks S02–S06.

## 15. Owner decisions requested at the M0 gate

1. **Kickoff timezone rendering (S05, decision 93).** Existing capability is server-rendered Tehran time + UTC note; the homepage has a manual TZ picker. Options: (A) keep Tehran + UTC note as today (recommended — zero risk, existing pattern, no JS); (B) add a small inline progressive-enhancement script converting to the visitor's local timezone via built-in `Intl` (no dependency), Tehran fallback. A/B — recommend B only if the owner wants strict literal compliance with "visitor-local".
2. **Venue city/country (S14, spec §10).** (A) Show stadium name only, omit city/country (spec §16 resilience; recommended — zero cost, zero invention); (B) author a curated static city table for the covered clubs (zero runtime cost, ~111 entries, needs owner-verified data).
3. **Telegram illustration (S18, decision 69).** (A) Compose the featured block from existing verified assets (channel icon SVG + existing stadium art) (recommended); (B) author a new original football-themed illustration asset (an authored static file, no provider cost).
4. **Finished scorers exception (S04/S19, guardrails §1).** (A) Keep finished scorers omitted (recommended — respects the zero-exception default; the dated audit's premise was corrected in §5); (B) approve a bounded exception: piggyback scorer extraction onto the existing per-match venue-detail fetch/KV cache (data-contract change to `venue_v1_<id>`, partial coverage, fail-closed) — requires the guardrails §1 approval package.
5. **Preview target (§10).** Option A/B/C as laid out — recommend A + B.
6. **Merge strategy for M10.** (A) Owner merges `feat/match-centre` → `main` via PR at the M10 gate (recommended — no branch protection exists, a PR gives a final review point); (B) agent fast-forwards `main` after approval.

## 16. Recommended exact starting files for S02

1. `src/seo/match-centre.ts` — new module: the Match Centre section composer (semantic section anchors: hero, nav, summary/briefing+facts, standings, form, venue, schedule, faq, related, telegram, footer-hook) rendering from `ctx` only.
2. `src/seo/pages.ts` — `buildMatchPage` delegates its `main` assembly to the new module; head/title/description/JSON-LD/breadcrumb contracts preserved byte-for-byte (risk #2).
3. `scripts/lib/worker-src.js` — add `seo/match-centre.ts` to the concat order (before `seo/pages.ts` consumers, inside the existing seo group).
4. `scripts/check-match-centre.js` — new check script (S02 scope: shell structure, anchors present, header/footer reuse, no new KV reads — asserted by source inspection like sibling checks) + `package.json` test-chain wiring + `CHANGELOG.md` entry (version moves at deploy time only).
5. `MATCH-CENTRE-EXECUTION-LOG.md` / `MATCH-CENTRE-MILESTONE-LEDGER.md` — S02 checkpoint entries.

---

*Audit produced under the v1.2 implementation package. No secrets, tokens or private values appear in this file. Credentials supplied for repository/Cloudflare access were used for read-only verification only, are stored outside the repository, and are never committed.*
