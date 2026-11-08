# SportSignal — Web Optimization · Phase 0 Architecture & Isolation Report

> **Project:** Website Performance, Technical SEO & Optimization
> (governed by `SPORTSIGNAL_WEB_OPTIMIZATION_SPEC.md` — the master spec).
> **Phase:** 0 — Repository reconnaissance and architecture audit (discovery
> only; no application code was modified for this report).
> **Audit date:** 2026-11-04 · **Repo state audited:** commit `f39ce2b`
> (`main`), version `13.201-carstack` — identical to the live production
> deployment at time of audit (`/healthz` → `version: "13.201-carstack"`).
> **Prepared for:** Phases 1–7 of the master spec. This file is a living
> reference; update it only when architecture facts change.

---

## 1. Repository and application architecture report

### 1.1 What this actually is (the framework question, answered factually)

**There is no web framework.** SportSignal is a single **Cloudflare Worker**
(name `ucl-notifier`, entry `src/worker.ts` → thin re-export of `src/api.ts`)
written in **TypeScript with zero runtime framework** — no React, no Next.js,
no Vue, no Astro, no server framework. The constraints that shaped this are
documented in `README.md` §"Tech stack and why": the Workers free-tier
~10 ms rolling CPU budget makes every millisecond count; wrangler's esbuild
bundles ~40 modules from one entry; the only runtime dependency is
`@resvg/resvg-wasm` (SVG→PNG for match cards).

- **Language:** TypeScript 5 (`tsc --noEmit` is the type gate; strict).
- **Bundler/deploy:** Wrangler 4 (`npx wrangler deploy`), esbuild inside,
  `nodejs_compat` flag, `CompiledWasm` rule for resvg.
- **Rendering strategy (website):** **server-side HTML string rendering with
  progressive enhancement** —
  1. Every public page is rendered in the Worker from KV data as an HTML
     string (template literals, no virtual DOM), served with
     `cache-control: public, max-age=0, s-maxage=60, stale-while-revalidate=300`
     and an edge copy in the Cache API (`src/seo/router.ts` `wantCached`).
  2. The homepage is the `PUBLIC_PAGE` template (`src/pages/public.ts`) with
     `__SEO_*__` placeholders replaced server-side from the exact same KV
     payload (`public_matches_v1`) the client fetches — so the no-JS HTML is
     fully populated (hero card, lists, standings) and search engines see the
     content without executing JavaScript.
  3. Client JavaScript (`assets/core-13.16.js` + `assets/public-13.65.js`,
     hand-written vanilla, `defer`) re-renders lists, drives the hero
     carousel, the fa/en toggle, the theme toggle, countdowns, and polls
     `/api/public-matches` (~60 s cadence per open tab, scheduler-guided).
     A `__SS_SIG__` FNV-1a payload-signature handshake lets the client SKIP
     rebuilding identical lists (no post-load layout churn).
  4. A service worker (`assets/sw.js`, cache `sportsignal-v104`) does
     network-first navigations, cache-first static assets, SWR for the main
     page HTML.
- **Language/locale model:** Persian-first, `lang="fa" dir="rtl"` is baked in
  the template; the fa/en switch is **client-side only** (localStorage
  `ucl_lang` + `data-i` i18n hooks in `core-13.16.js`). There are **no
  separate English URLs and no `hreflang` annotations anywhere** — a hard
  fact for the Phase 5 multilingual audit (the spec forbids inventing
  language versions that don't exist).
- **Two surfaces, one artifact:** the same Worker serves (a) the **Telegram
  bot** (webhook `/webhook`, cron ticks, notification engine) and (b) the
  **public website** `https://sportsignal.ir` (+ `football.sportsignal.ir`
  which also carries the webhook). This single-artifact property is THE
  central deployment risk of this whole optimization project — see §3.

### 1.2 Module map (root `src/`, ~45 files, ~26k LOC; per `ARCHITECTURE.md` v13.79 + verified)

| Layer | Modules | Consumers |
| :--- | :--- | :--- |
| 0 — leaves | `config.ts` (VERSION + CONFIG = every KV key contract), `types.ts` (Env), `utils.ts` (digits/dates/auth-hash/subrequest+KV meters/HTTP retry), `slugs.ts` (URL vocabulary: COMP_SLUGS/TEAM_SLUGS/matchPath), `fa-dict.ts`, `tables.ts` (dictionaries + CSP headers + normAlias/TEAM_ALIASES), `dedupe.ts`, `scheduler.ts` (fixture-aware activity modes) | everyone |
| 1 — match model | `match-model.ts` (status vocabulary), `match-windows.ts` (notification windows), `match-dedupe.ts` (notified ledger + write-first send gate), `match-classify.ts` (eligibility, big-match sets, **`pickHeroMatch`** — the ADR-001 shared hero seam, `isSiteHiddenMatch`) | bot + website |
| 2 — providers | `provider-breaker/-wikipedia/-sportscore/-tsp/-fd`, `match-pool.ts`, `provider-cups.ts`, `providers.ts` (orchestrators) | cron + public payload + seo + admin |
| 3 — composers | `translate.ts` (3-layer fa translation), `fa-ai.ts` (Workers AI learner), `telegram.ts` (Bot API senders/outbox), `composers.ts` (messages + `fetchStandings`), `card.ts`/`card-fonts.ts`/`card-route.ts` (resvg match cards) | bot + website |
| 4 — products | `digest-weekly/-morning/-night/-bigmatch/-coronation/-uclnight`, `notify-engine/-status/-audit` | bot only |
| 5 — user state | `users.ts`, `user-store.ts` (D1 seam), `admin.ts` (sessions/settings), `admin-bot.ts` (owner toolbelt), `monitoring.ts`, `migration.ts` | bot + admin |
| 6 — surfaces | `bot-ui.ts`, `bot.ts` (`handleTelegramUpdate` — kept whole per ADR-005), `public-matches.ts` (the public payload pipeline), `auth.ts`, `public-swr.ts`, `simulate.ts`, `admin-ops.ts`, `api.ts` (the fetch router), `stats.ts` (D1 visit beacon), `kv-webmeter.ts` (web-side KV write meter), `kickoff-drain.ts` | mixed (see §3) |
| 7 — cron | `cron-preflight/-users/-pool/-maintenance/-notify/-public` + `cron.ts` (shell: meter/lock/completion blob) | bot (prewarms website payload) |
| SEO subtree | `src/seo/` — `router.ts`, `files.ts`, `data.ts`, `markup.ts`, `jsonld.ts`, `page-shell.ts`, `pages.ts`, `pages-static.ts`, `config.ts`, `indexnow.ts`, `utils.ts`. Real ES modules, **NOT part of the eval harness** | website only |
| Pages subtree | `src/pages/` — `public.ts` (1145 lines, the live site template), `login.ts`, `admin.ts` (thin) + `admin-css/-html/-js`, `styles-shared.ts` | website only |

### 1.3 Key config artifacts

- **`wrangler.toml`** — worker `ucl-notifier`, `main = "src/worker.ts"`,
  `compatibility_date = "2025-11-04"`, `nodejs_compat`, WASM rule for
  resvg, **`[assets] directory = "./assets"` with
  `not_found_handling = "none"`** (static assets are served by the platform
  BEFORE the Worker runs), KV binding `STATE`
  (`c63588df02ae4bf1bfdc18d19c5b3631`), D1 `STATS_DB`
  (`sportsignal-stats`) + D1 `USERS_DB` (`sportsignal-users`), cron triggers
  `*/10 * * * *` + `27 */4 * * *`, self service binding `DRAIN_SELF`
  (kickoff drain chain, error-1042 workaround), var `TEHRAN_TZ`, AI binding.
  Secrets (`BOT_TOKEN`, `API_TOKEN`, `ADMIN_TOKEN`, `ADMIN_PASS`,
  `WEBHOOK_SECRET`, `HEALTHCHECK_PING_URL`, `CHAT_ID`) live in wrangler
  secrets — never in the repo.
- **`wrangler.dev.toml`** — local-only dev variant (git-ignored via
  `.git/info/exclude`): no AI binding, no triggers.
- **`assets/_headers`** — 1019 lines, **100 `Cache-Control` rules**: a week
  for fonts/favicons, a day for logo/manifest, and immutable
  `max-age=31536000` pins for every live versioned asset (rule cap 100;
  expired pins are pruned by "cap sweeps" documented in CHANGELOG).
- **`tsconfig.json`** — the tsc gate used by `npm test`.
- **`.github/workflows/seo-check.yml`** — the ONLY CI: on push to `main` +
  daily 03:23 UTC, runs `scripts/seo-check.js` against production
  (blocking) + best-effort Lighthouse for `/`, `/matches/today`, `/teams`
  (performance/seo/accessibility/best-practices). **CI never deploys.**

---

## 2. Website request/rendering flow (deliverable 2)

### 2.1 Request routing order (fetch handler, `src/api.ts`)

Static assets in `assets/` are served first by Workers Static Assets
(platform layer — the Worker never sees those requests unless the file is
missing, `not_found_handling = "none"`). Everything else hits
`handleFetchRequest` in this exact order:

1. `POST /webhook` — **Telegram webhook** (secret-validated via
   `validateWebhook`), handled in `ctx.waitUntil` → `handleTelegramUpdate`.
   **BOT.**
2. `/admin/login|logout|change-password` — admin auth flows (HMAC cookie).
   **WEBSITE (owner tooling).**
3. `GET /api/public-matches` — **the website's data API**
   (`public-swr.ts`): KV-cached payload (12-min TTL) with
   stale-while-revalidate (fresh <5 min inline; stale 5–10 min serve +
   background rebuild; expired → 7-day snapshot + rebuild; true cold →
   pool-first synchronous rebuild), live-overlay patching, plus an edge
   Cache API layer (60 s) because the client polls every 60 s.
   Response: `cache-control: public, max-age=60`.
4. `GET /api/visit` — cookieless page-view beacon → D1 `STATS_DB`
   (`stats.ts`, runs in `waitUntil`). **WEBSITE.**
5. `POST /api/kickoff-drain` — the self-service-binding deferred fan-out
   (WEBHOOK_SECRET-guarded). **BOT-internal.**
6. **`handleSeoRequest`** (`src/seo/router.ts`) — **every public page and
   machine file of the website.** Returns `null` for non-SEO paths so the
   bot/admin flow is untouched. **WEBSITE.**
7. `/api/card/:matchKey` — SVG/PNG match cards. **SHARED** (bot `sendPhoto`
   + website OG images).
8. Admin gate: everything under `/admin` or `/api/*` (except the earlier
   routes) requires an admin session or `Authorization: Bearer ADMIN_TOKEN`.
9. `POST_GATE_ROUTES` ordered table: `ADMIN_OPS_ROUTES`, `/admin` (page),
   `/healthz` (public CORS-open health JSON), `/api/members`,
   `/api/standings`, `/api/status`, `/api/stats`, `/api/sources`,
   `/api/simulate`, `/api/webhook/info`, `/api/bot/info`,
   `/api/webhook/setup`, then `"*"` → `legacyGetAction` (legacy GET
   `?action=` endpoints). 405 tail for unmatched non-GET.
10. `scheduled` handler: `*/10` tick = `executeScheduledLogic` (the notify
    pipeline + public payload prewarm + live overlay write) + kickoff drain
    chaining; `27 */4` = lean far-cup probe.

### 2.2 The SEO router surface (the website's page inventory)

Host/path normalization first: `football.sportsignal.ir` → 301 apex
(**except** `/webhook`, `/api/*`, `/admin` — the bot paths must never
redirect), `www.sportsignal.ir` → 301 apex (every path), http → https on
production hosts, `/public` → `/`, trailing-slash and case normalization
(`BingSiteAuth.xml` exempt — Bing needs exact-case 200).

Machine files: `/robots.txt` (toggle-driven), `/llms.txt`,
`/.well-known/security.txt`, `/BingSiteAuth.xml`, `/{IndexNow key}.txt`,
`/sitemap.xml` (index) + `/sitemaps/{pages|competitions|teams|matches-upcoming|matches-archive}.xml`,
`/calendar.ics`, `/feed.xml` (Atom), `/api/matches.json` (public JSON),
`/og/match-{slug}.png` (per-match OG images).

HTML pages (all server-rendered from the KV pool/payload via
`getSeoCtx`, all edge-cached with per-page render holds — 15 min default,
5 min for live-ish surfaces, 2 min live match pages, sitemap 10 min):

- `/` — homepage (the `PUBLIC_PAGE` template; fresh hold 300 s)
- `/matches` (+ `?page=`), `/matches/today`, `/matches/tomorrow`,
  `/matches/this-week`, `/matches/this-weekend`, `/matches/{slug}`
- `/teams`, `/teams/{slug}`, `/competitions`, `/competitions/{slug}`
- `/about`, `/methodology`, `/contact`, `/privacy`, `/terms`, `/data`,
  `/sitemap` (human)
- Custom 404: cheap static 404 for unknown route families (scanner-probe
  CPU guard, `no-store`), full rendered 404 for known families.

Every HTML response carries security headers (see §6) and
`cache-control: public, max-age=0, s-maxage=60, stale-while-revalidate=300`
+ ETag (`withEtag`).

### 2.3 Data flow for the website

```
3 providers (football-data.org / sportscore / thesportsdb + Wikipedia fallback)
   │  (cron */10 tick: quiet/live/full sweep split, 2h full cadence)
   ▼
KV pool `matches_v13_tracked` (92-day fixture horizon, ~500 matches)
   │  (cron-public phase: enrichment + prewarm + live overlay)
   ▼
public-matches.ts pipeline ──► KV `public_matches_v1` (12-min TTL payload)
   │                                   │
   ├──► /api/public-matches (SWR, 60s edge)   ── client polls
   ├──► SEO pages (seo/data.ts reads same KV keys + pool) ── SSR HTML
   └──► /api/card/:matchKey (SVG/PNG), /og/match-*.png
```

- **Language selection:** client-side toggle only (fa default, `en` via
  localStorage `ucl_lang`, `data-i` hooks; digits/dates localized). SSR
  output is always Persian/RTL. No locale URLs, no `hreflang`.
- **Third-party resources:** **none on the page** except the Cloudflare Web
  Analytics beacon (allowed in CSP since v13.188: `static.cloudflareinsights.com`).
  No external fonts (self-hosted WOFF2: Peyda, Morabba, Vazirmatn, Poppins,
  Chakra Petch), no CDN scripts, no trackers.
- **PWA:** `site.webmanifest` + `sw.js` (cache `sportsignal-v104`):
  skipWaiting + claim, network-first navigations, cache-first static
  (fonts/images), SWR main HTML. `CACHE` bumps ONLY when client-referenced
  assets change (ADR-006) — server-side src changes never bump it.
- **Client payload today (v13.201):** HTML ~180 KB (Brotli on the wire),
  `public-13.65.js` 155 KB (hand-written, no build step),
  `public-13.78.css` 137 KB, `core-13.16.js` 23 KB, 3 preloaded WOFF2
  fonts, plus the immutable-pinned hero/player/crest WebP art under
  `/ui/`, `/players/`, `/leagues/`.

---

## 3. Website-versus-bot isolation map (deliverable 3)

**The bot and the website share ONE Worker, ONE KV namespace, ONE deploy
artifact.** There is no way to deploy a website change without redeploying
the bot runtime. Therefore every optimization must be classified against
this map BEFORE editing, and shared-component edits need a demonstrated
bot-safety argument (spec §2.1). The spec's Telegram-bot-protection rule
maps onto this table.

### 3.1 Website-only (safe to modify; still subject to regression gates)

| Component | Notes |
| :--- | :--- |
| `src/seo/**` (11 modules) | The SSR page surface. Real ES modules, outside the eval harness. |
| `src/pages/public.ts`, `login.ts`, `admin.ts` + `admin-css/-html/-js`, `styles-shared.ts` | Page templates. `public.ts` is harness-pinned by `check-stats` (byte-level structure checks) — edits must co-evolve that suite. |
| `src/public-swr.ts` | The `/api/public-matches` SWR endpoint. |
| `src/stats.ts` | Visit beacon + D1 stats (admin card + public counter). |
| `src/slugs.ts` | URL vocabulary — consumed by public payload + SEO; **bot does not import it** (verified). |
| `src/grounds.ts` | Venue enrichment for the public payload + SEO pages (+ bot venue translation via `translate.ts` reads the curated table — treat as shared-adjacent). |
| `src/auth.ts` | Admin login/logout (owner tooling on the web surface). |
| `src/kv-webmeter.ts` | Wraps `STATE.put/delete` on fetch invocations to count web-side writes. Metering only — but it wraps the SAME pristine binding the cron meter uses; changes here affect both meters' correctness. Modify only with both meters in mind. |
| `assets/public-*.js/css`, `assets/core-*.js`, `assets/sw.js`, `/fonts/*`, `/ui/*`, `/og/*`, favicons, `site.webmanifest`, `/leagues/*`, `/players/*` (site-facing art) | Client payload. **Every edit = version rename + `_headers` pin + harness re-pin + SW bump (ADR-006).** `assets/bot/ucl-night.gif` is a LIVE BOT ASSET — do not touch (README "UCL nights"). |
| `.github/workflows/seo-check.yml`, `scripts/seo-check.js` | Website QA tooling. |
| SEO KV keys (`seo_lastmod_v1`, `seo_indexnow_v1`) + D1 `STATS_DB` | Website-owned state. |

### 3.2 Telegram-bot-only (STRICTLY off-limits)

| Component | Notes |
| :--- | :--- |
| `src/bot.ts` | `handleTelegramUpdate` — kept whole (ADR-005). |
| `src/bot-ui.ts` | Reply keyboards, pickers, command normalizer. |
| `src/telegram.ts` | Bot API senders, retry/429/outbox/dead-chat pruning + `BOT_MENU_*`. |
| `src/notify-engine.ts`, `notify-status.ts`, `notify-audit.ts` | The 7 notification types, status-change detection, gap audit. |
| `src/digest-weekly/-morning/-night/-bigmatch/-coronation/-uclnight.ts` | Digest products. |
| `src/cron.ts` + `cron-preflight/-users/-pool/-maintenance/-notify` (+ the `cron-public` *writes* it performs) | The tick. `cron-public.ts` prewarms the website payload — it is the shared seam; treat as bot-owned (its write cadence feeds the KV budget governor). |
| `src/match-dedupe.ts`, `match-windows.ts` | The anti-spam ledger + send gates (ADR-002/003 — never touch without failure-injection tests). |
| `src/kickoff-drain.ts` | Deferred fan-out chain. |
| `src/users.ts`, `user-store.ts`, `admin-bot.ts`, `migration.ts`, `stickers.ts`, `cup-elim.ts` | User registry, owner toolbelt, bot migration, sticker pack, elimination detector. |
| `/webhook` route + `WEBHOOK_SECRET`, `BOT_TOKEN`, `CHAT_ID` | The webhook surface + secrets. |
| `assets/bot/*`, `assets/stickers/*` | Bot media (incl. the live `ucl-night.gif`). |
| D1 `USERS_DB` | Bot user data. |
| KV: `notified_matches_v6`, `pending_sends_v1`, `execution_lock`, `user_prefs_v1`, `telegram_users_v6`, `user_profiles_v1`, `upd_*`, `ucl_gif_fileid_v1`, `prov_down_*`, `cron_status_v1` heartbeat/ledger keys | Live-state contracts (RUNBOOK §5). **Never rename.** |

### 3.3 Shared / potentially shared (the risk register — edit only with a demonstrated bot-safety argument)

| Shared component | Both sides use it for | Safeguard required before any change |
| :--- | :--- | :--- |
| **`src/match-classify.ts` — `pickHeroMatch`** | ADR-001: website hero AND bot `/featured`//`next` call the SAME expression; also `shouldNotify`/`shouldReport` gate every bot push | **Do not modify.** Any change alters bot output. `#herotruth` checks lock it. |
| **`src/config.ts`** | VERSION + every KV key both sides read/write | Key names are contracts (ADR-002/003). VERSION bump discipline: `check-version-sync.js`. |
| **`src/utils.ts`** | Digit/date formatting (fa digits feed BOTH bot messages and website payload), auth-hash, subrequest meter, HTTP retry | Behavior-identical refactor proof + full `npm test` (both bot and web checks eval this file). |
| **`src/tables.ts`** | Dictionaries + **CSP header constants** used by pages; provider id maps; normAlias used by bot + payload | CSP edits = website-only effect but live in a shared file — prove byte-identical effect on bot imports. |
| **`src/translate.ts` + `fa-ai.ts` + `fa-dict.ts`** | 3-layer Farsi translation for bot messages AND public payload AND SEO pages | Same-function consumers on both sides; `check-fa-dict`/`check-fasync` pin behavior. |
| **`src/composers.ts`** | Bot message composers + `fetchStandings` (used by `/api/standings` + SEO competition pages) | Split edits by function; standings path is web-facing, composers are bot-facing. |
| **`src/public-matches.ts`** | The public payload pipeline — feeds the website, SEO pages, and the admin panel; `pubMatch` stamps canonical paths | Harness-heavy (check-venue, live-derby, check-consolidated…). `pickHeroMatch` calls from here are ADR-001. |
| **`src/card.ts`/`card-route.ts`** | Match cards: bot `sendPhoto` + website OG/`/api/card` | Both consumers render from the same composer; visual edits change bot messages too. |
| **`src/match-pool.ts` + `providers.ts` + `provider-*.ts`** | The data layer: cron sweeps (bot) AND serve-path rebuilds (web) AND SEO fallbacks | Sweep cadence/behavior changes alter bot data freshness → treat as bot-affecting. |
| **`src/scheduler.ts`** | Fixture-aware modes consumed by cron-pool (bot tick) AND `public-matches` pollHint (web) | Decision-layer purity is locked by `check-scheduler`. |
| **`src/match-model.ts`, `dedupe.ts`, `teams.ts`, `monitoring.ts` (`getCronStatus` used by `/healthz`), `api.ts` route table, `worker.ts`, `admin-ops.ts`, `simulate.ts`** | Shared plumbing/routing | Route-table conservation asserts (`#seams`, zero-elision lock) exist precisely because of the 1101 incident. |
| **KV namespace `STATE`** | One namespace for both; **account-level 1,000 writes/day free-tier cap** | Any added web-side KV write burns the SAME daily quota the bot's anti-spam ledger needs (governor SOFT 700/HARD 850). kv-webmeter counts web share. |
| **The deploy artifact** | `npx wrangler deploy` ships bot+web together | The website-phase acceptance rule: a deploy with website changes is allowed ONLY with the safety argument that bot behavior is unchanged (spec §14.4). |

### 3.4 Practical isolation rules derived from this map

1. **Prefer `src/seo/**`, `src/pages/**`, `assets/**` (site-facing) and
   `scripts/**`** — the provably website-only surfaces.
2. A change to any §3.3 row must ship with: (a) byte/behavior-equivalence
   argument for the bot consumer, (b) full `npm test` green (both harness
   families), (c) route-table conservation where applicable.
3. **Never** add web-invocation KV writes without counting them against the
   daily budget (the governor + `kv-writes-web` meter already exist).
4. When a desired optimization would require touching bot-side code
   (e.g. anything under §3.2), STOP and document a blocker instead
   (spec decision rule 20).

---

## 4. Cloudflare and deployment workflow report (deliverable 4)

- **Platform:** Cloudflare Workers (dedicated account since v13.95 —
  account-level KV quota was the root cause of the 10048 lockouts).
  Zone `sportsignal.ir`, custom domains `sportsignal.ir` +
  `football.sportsignal.ir` on the Worker; `www.sportsignal.ir` attached
  only to answer 301. Also reachable at
  `https://ucl-notifier.sportsignal.workers.dev` (serves with
  `x-robots-tag: noindex, nofollow` — R-13 env safety, verified live).
- **Bindings:** KV `STATE`; D1 `STATS_DB`; D1 `USERS_DB`; AI; service
  binding `DRAIN_SELF` (self-reference for the kickoff drain); var
  `TEHRAN_TZ`.
- **Cron:** `*/10 * * * *` (the tick) + `27 */4 * * *` (far-cup probe).
- **Asset delivery:** Workers Static Assets from `./assets`, served before
  the Worker; per-path `Cache-Control` via `assets/_headers` (100-rule cap,
  immutable pins for versioned assets, fonts 1 week, bot GIF pinned as a
  live asset).
- **Edge caching (website HTML/API):** Cache API with synthetic keys
  (`https://edge-internal.sportsignal.ir/...`), render-hold TTLs decoupled
  from the public `s-maxage=60` (v13.97-seocpu: the stored copy carries the
  hold in its own cache-control + the public header in `x-ss-cc`, restored
  on hit). Live surfaces hold 120 s; default pages 900 s; sitemaps 600 s;
  `/api/public-matches` 60 s.
- **Compression:** Brotli at the edge for HTML and static assets (verified
  live: `content-encoding: br` on `/` and `/public-13.78.css`).
- **Deployment workflow (RUNBOOK §2 — law since the 1101 incident):**
  1. `npm install` (npm ONLY — `bun install` breaks resvg-wasm resolution)
  2. `npm test` — MUST exit 0 (tsc + ~40 check scripts, 2,525 checks)
  3. Local smoke: `npx wrangler dev --port 8787` + curl `/healthz`, `/`,
     `/nope`, `/api/card/nope`, `/admin` (runtime-only failure class)
  4. `npx wrangler deploy` (needs `CLOUDFLARE_API_TOKEN` env — never stored)
  5. Post-deploy: `/healthz` version flip → watch ≥2 ticks complete
     (`last_cron_age_min` ≤ 10 twice) → dead-man's-switch ping cadence
  6. Rollback: `npx wrangler rollback` (~90 s, KV schema is additive so
     rollback is safe)
- **No staging/preview environment in current practice.** `wrangler dev`
  (miniflare) is the pre-production gate. (Wrangler Versions/preview URLs
  exist as platform capability but are not part of the repo's workflow —
  introducing them is optional and must not become a second deploy
  mechanism per spec §14.4.)
- **CI:** `seo-check.yml` — push-to-main + daily production SEO regression
  (blocking) + Lighthouse (advisory). CI does NOT deploy; deploys are
  operator-run `wrangler deploy` from a local clone.
- **Version discipline:** `src/config.ts` VERSION ↔ `package.json` ↔
  CHANGELOG top entry must agree on `major.minor`
  (`check-version-sync.js` inside `npm test`). Observed drift at audit
  time: `package-lock.json` still carries `13.197.0.0` in its version
  field (the owner's "Add files via upload" commit f39ce2b did not refresh
  it; `npm install` rewrites it locally). Cosmetic-only; note for a later
  hygiene commit.
- **Monitoring:** healthchecks.io dead man's switch (per completed tick) +
  UptimeRobot `/healthz` poller + in-band `degraded` band + 6 h admin
  heartbeat. `/healthz` semantics: 503 on stale heartbeat (>30 min) /
  stale completion (>35 min) / outbox ≥ 50.

---

## 5. Existing tests and quality gates (deliverable 5)

| Gate | What it does | When it runs |
| :--- | :--- | :--- |
| `npm test` | `tsc --noEmit` + ~40 `scripts/check-*.js` suites. **2,525 checks, 0 failures at audit time** (282 eval'd name checks). Includes: version-sync, weekly-tables, sticker-outbox, bl1, cups, dedupe, fa-dict, fasync, consolidated, join-flow, userstore, admin (+admin-parity with frozen HTML fixtures), mdstyle, league-union, venue, notify-windows, standings-bl1, live-derby, bot-edges, **security** (`check-security.js`), composers, reliability, no-miss, stats (pins the public page structure), nightdigest, uclnight, priority, trueduels, pervchat, lifecycle, sameflow, kickoff, scheduler, uefa-portraits, hero-coverage, hero-clubs, mc-heroes, hero-carousel | before every push/deploy |
| Eval harness | `scripts/lib/worker-src.js` concatenates the REAL `src/*.ts` in a fixed order (imports stripped, exports de-moduled, types erased) — what's tested is literally what ships. **ADR-005: any file split/rename must co-evolve the harness order in the SAME commit.** `src/seo/**` and `src/pages/**` are outside the concat (pages are appended raw). | inside npm test |
| `npm run seo:check` / `seo:check:local` | `scripts/seo-check.js` — production (or local wrangler-dev) SEO regression: robots, sitemaps, canonicals, hreflang expectations, JSON-LD, headers, redirects, 404s, OG images… | CI (push + daily) + `deploy:seo` |
| Lighthouse | CI best-effort on `/`, `/matches/today`, `/teams` (4 categories) | CI advisory |
| `check-security.js` | Security-header/security-posture assertions | npm test |
| Local smoke | wrangler dev + curl of the five probe routes | pre-deploy (RUNBOOK §2 law) |
| Post-deploy verify | healthz version + 2 ticks + ping cadence | every deploy |

**Implication for this project:** any change to `src/pages/public.ts`
structure, asset filenames, or `src/*.ts` shared signatures will trip
harness pins (`check-stats`, `check-hero-carousel`, `check-mc-heroes`,
`check-venue`, etc.). Budget for re-pinning in the same commit, exactly as
the repo's own releases do (see CHANGELOG entries: "_headers +1 pin (cap
sweep #N)… check-stats re-pinned… parity baseline re-frozen").

---

## 6. Technical limitations and risks (deliverable 6)

| # | Risk / limitation | Impact on this project | Mitigation |
| :--- | :--- | :--- | :--- |
| R1 | **Single deploy artifact** — website and bot ship together | Every website deploy is also a bot redeploy; spec §14.4 allows it only with a demonstrated cannot-alter-bot argument | Keep changes inside §3.1 surfaces; run FULL `npm test` (bot suites included); route-table conservation checks; when in doubt, document a blocker |
| R2 | **KV 1,000 writes/day account cap** (measured 838 at audit time, governor soft 700) — the anti-spam ledger shares this budget | New web-side caching/feature work must not add KV writes; `degraded:true` was already live at audit (writes 838) | Use Cache API (already in place), D1 (separate quota) for new counters; never add per-request KV puts |
| R3 | **~10 ms rolling CPU budget** (free plan) — healthz/404/seo-render CPU kills are a documented incident class | Perf work that ADDS server render cost is dangerous; the 404-cheap-path + render-hold patterns exist precisely for this | Keep render cost flat or lower; exploit the existing Cache API holds; measure via `/healthz` + CF GraphQL |
| R4 | **ADR-006 rename-on-edit ceremony** for client assets (rename + `_headers` pin (100-rule cap) + SW `CACHE` bump + harness re-pin + parity re-freeze) | Frontend asset optimization (Phase 2/3) has a high per-change process cost; batch edits into few renames | Follow the release ritual exactly as CHANGELOG models it; one rename per phase where possible |
| R5 | **Eval-harness co-evolution** (ADR-005) — file splits must update `worker-src.js` same-commit; `handleTelegramUpdate` must stay whole | Refactors of shared modules are constrained; silent coverage loss if botched | Prefer additive, in-place edits; never split bot-facing modules |
| R6 | **KV keys are contracts** — renames re-fire the world's notifications | Any caching/state work must reuse existing keys or introduce NEW keys (additive) | New keys only; document them in the phase report |
| R7 | **`public-matches.ts` deliberately unsplit** (857 lines, cohesion around payload contract — reaffirmed audit finding) | Phase 2 "reduce JS" does not apply server-side here; client bundle is hand-written with no build step (no tree-shaking) | Client-side: manual dead-code audit + measured wins only; respect "no rewrites" house rule |
| R8 | **No staging env** — local wrangler dev is the only pre-prod gate | Production verification burden on every phase | Keep the smoke-test ritual; use `seo:check:local` against wrangler dev |
| R9 | **Repo is PUBLIC** — no secrets in repo/logs/commits (AGENTS.md hard rule; a live token was once found in it) | Session tokens (GitHub/Cloudflare/bot) must NEVER be written into committed files or push URLs in docs | One-shot push URLs (`git push https://x-access-token:<token>@… main`), never persist in git config; scrub logs |
| R10 | **Owner sometimes pushes via web UI** ("Add files via upload") | Local main can be behind; pushing blind can clobber owner work | `git fetch <url> main` + rebase before push; verify with `git ls-remote`, never the stale tracking ref |
| R11 | **fa/en is client-side only** — no en URLs, no hreflang | Phase 5 multilingual audit must NOT invent language versions; the "multilingual SEO" surface is honestly limited to `<html lang>`, og:locale, and the toggle's UX | Document as a finding; only additive fixes (e.g. `og:locale:alternate` already present) |
| R12 | **Time-sensitive data** (live scores, countdowns) vs caching | Phase 4 must preserve the freshness ladder (s-maxage=60 HTML, 60 s API, live-page render holds, SWR overlay) — over-caching freezes scores | Classify every response class before touching TTLs (spec §10.1) |
| R13 | **CSP allows `'unsafe-inline'`** script/style (needed for inline JSON-LD, theme-init, signature script) | Phase 6 CSP hardening is bounded; a nonce/strict CSP would touch the template's inline scripts — website-only but high regression surface | Treat as measured, risk-weighted improvement; don't break the page for a header |
| R14 | **Heavy retained-asset tail** — 89 old `public-13.*` versions + 6 `core-*` on disk (~85 MB assets total, 66 MB player portraits) | Bandwidth cost is only on fetch (immutable + never referenced = never downloaded), but deploy size/`_headers` complexity grows | Cap-sweep pattern exists; deletion requires grep-proven unreferenced + retention rule (one SEO TTL) — a candidate Phase 4 item, low priority |

---

## 7. Recommended phase execution notes (deliverable 7)

- **Phase 1 (audit) — measure first, exactly as the spec demands.**
  Representative routes: `/` (hero-heavy), `/matches`, `/matches/today`,
  `/teams`, `/competitions`, one `/matches/{slug}` page, one `/teams/{slug}`
  page, `/api/public-matches`, `/api/card/...`, plus `/robots.txt`,
  `/sitemap.xml`, `/feed.xml`, `/calendar.ics`. Record: TTFB (observed
  ~0.8 s from the audit location, edge HIT), HTML weight (~180 KB raw /
  br on wire), the client payload triad (`public-13.65.js` 155 KB,
  `public-13.78.css` 137 KB, `core-13.16.js` 23 KB), font preloads (3
  WOFF2), hero art (WebP under `/ui/`, `/players/`), the LCP element per
  page (likely the hero card art or headline), CLS from the
  skip-identical-rebuild handshake, INP on the carousel/toggle
  interactions. Tools already available: `npm run seo:check`, CI
  Lighthouse, agent-browser, curl timing. Produce
  `WEB_OPTIMIZATION_AUDIT.md` with severity ratings.
- **Phase 2 (frontend)** — the client bundle is hand-written vanilla JS
  with **no build step**; there is no tree-shaker. Wins must come from
  manual audit (dead code, dormant i18n keys — note the documented 18
  inert X-card keys), listener hygiene, and render-path work — each
  following ADR-006 (rename + pins + SW bump + harness re-pin in ONE
  commit). CSS: 137 KB main sheet + substantial inline-style layers in the
  page template; the repo treats `public-*.css` as immutable-pinned.
- **Phase 3 (assets/CWV)** — hero/crest/player WebP are already
  optimized by the portrait pipeline (512×512 lossless WebP with alpha,
  VLM-audited). Check LCP image priority (the hero card is SSR'd — verify
  `fetchpriority`/preload state), font subsetting/`font-display` (3
  preloads today), and the countdown/hero CLS budget. Any art change
  follows the pipeline docs (`docs/mc-heroes/SPEC.md`,
  `docs/scrapping/uefa-players/`).
- **Phase 4 (caching)** — the architecture is already sophisticated
  (immutable pins, Cache API render holds, SWR API, SW). Audit for gaps:
  the 100-rule `_headers` cap, `Vary` correctness, `Age`/`cf-cache-status`
  behavior, stale-while-revalidate on HTML, missing `ETag` on machine
  files, and the retained-asset tail (R14). Any added edge caching must
  respect R2 (no new KV writes) and R12 (freshness ladder).
- **Phase 5 (SEO)** — a prior SEO project (see `SEO_AUDIT.md` baseline +
  `SEO_IMPLEMENTATION_REPORT.md`, shipped v14.0-seo → v13.97-seocpu)
  already delivered the SSR page surface, sitemaps, structured data,
  canonicalization, 404s, IndexNow, security headers. Phase 5 is therefore
  a **verification + gap-fix pass**, not a build: validate every page
  family, metadata uniqueness, JSON-LD validity, sitemap freshness/lastmod
  honesty, and the R11 language-model limits. Do not re-implement what
  exists; do not fabricate `hreflang` for a toggle that has no URLs.
- **Phase 6 (a11y/security)** — `check-security.js` + live headers already
  cover HSTS/nosniff/referrer/permissions/CSP/frame-ancestors. Audit WCAG
  2.2 AA for real (contrast on the dark theme, focus order, touch targets,
  the RTL carousel controls, reduced motion — already partially handled).
  CSP hardening is bounded by R13.
- **Phase 7 (final verification)** — repeat baselines under identical
  conditions; full regression (site + `npm test`); produce the
  requirement-by-requirement checklist; update `CHANGELOG.md` per repo
  convention (single changelog system only).
- **Cross-phase invariants (from the spec + repo):** one phase per
  session; `npm test` green before every push; no bot-file diffs in ANY
  commit (verify with `git diff --stat` review); deploy only when
  application code/assets/config changed — a docs-only phase (like this
  one) commits + pushes but does NOT redeploy; update
  `WEB_OPTIMIZATION_PROGRESS.md` at every phase boundary and emit the
  next-session prompt.

---

*End of Phase 0 report. The living status tracker is
`WEB_OPTIMIZATION_PROGRESS.md`. The original baseline measurements for
Phases 1+ will live in `WEB_OPTIMIZATION_AUDIT.md` (Phase 1 deliverable —
not yet created; nothing has been measured-and-frozen yet beyond the
facts above).*
