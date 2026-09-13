# NEXT SESSION — SportSignal Continuation (UI/UX · Bot · Perf · SWOT · Security · Debt)

> **This is the current handoff doc** (supersedes `NEXT-SESSION-X-INTEGRATION.md`,
> which is historical — its X integration SHIPPED in v12.33 `src/x.ts`).

Handoff date: 2026-09-13 · Handed off from: **v13.6-assets** (commit 74d50f0 + wrap commit)
Live: https://football.sportsignal.ir (Cloudflare Worker `ucl-notifier`)

Everything below is context + instructions for the next development session.
The copy-paste prompt is in the **PROMPT** section at the bottom.

---

## 1. Project identity (current, v13.6)

- **Product**: SportSignal — Persian/RTL football match-tracker site + bilingual
  Telegram bot + automated X (Twitter) profile.
- **Runtime**: Cloudflare Worker `ucl-notifier`, cron `*/10 * * * *`, KV binding
  `STATE` (id in `wrangler.toml`), Workers AI binding `AI` (Farsi name learning).
- **Architecture (v13.6, THE BIG CHANGE)**: the old 10,002-line single-file
  `src/worker.ts` is gone. Now **21 ES modules** — `src/worker.ts` is a thin
  entry re-exporting `src/api.ts`. Module map lives in `README.md`. No build
  step beyond wrangler's esbuild bundling; no framework; no runtime npm deps.
- **Client payload (v13.6)**: public HTML is ~37KB; the 92KB CSS + 98KB app JS
  + 16KB shared core live in `assets/public-13.6.css`, `assets/public-13.6.js`,
  `assets/core-13.6.js` (immutable, 1-year cache, cache-bust by renaming).
  `assets/core-13.6.js` is the source of truth for the shared I18N + theme/lang
  helpers (the old `src/pages/client-core.ts` is retired). Extraction script
  kept for provenance: `scripts/extract-page-assets.mjs`.
- **Data**: api-sports.io (`FD_API_TOKEN`) + sportscore + thesportsdb
  multi-source merge, provider circuit breaker, 7-day KV snapshot fallback.
- **Delivery**: Telegram `@SportSignalAlertsBot` (id 8988731008) — bilingual
  fa/en, 24h/3h/1h/kickoff/HT/FT/coronation/weekly-tables/morning-digest
  notifications, KV exactly-once dedupe. X profile via OAuth 1.0a
  (`src/x.ts`, KV budget governor, dry-run mode, admin X card).
- **UI**: RTL Persian, Vazirmatn woff2, Persian numerals, Jalali dates,
  dark-mode default, CSS live-beep chips (Lottie CDN player was removed in
  v13.4 — it was CSP-blocked AND the wrong package, never worked).
  Admin panel `/admin/login` (`ADMIN_TOKEN`/`ADMIN_PASS`), `WEBHOOK_SECRET`
  on `/webhook`.
- **Quality gates**: `npm test` = `tsc --noEmit` (**0 errors**) +
  `check-version-sync.js` + 13 behavior check scripts (147 assertions, all
  green). Eval-based test harness loads the multi-file source via
  `scripts/lib/worker-src.js`.

## 2. Repo & environment mechanics

- Repo: `/home/z/my-project/workspace/SportSignal` (git; GitHub
  `assadigit/SportSignal`, **private**, branch `main`). GitHub push token,
  Cloudflare API token + account id are supplied by the user in chat —
  **never commit them** (see `.gitignore`: `tokens.txt` etc.).
- Deploy: `cd /home/z/my-project/workspace/SportSignal && CLOUDFLARE_API_TOKEN=<token> CLOUDFLARE_ACCOUNT_ID=<account> npx wrangler deploy`.
  Rollback: `npx wrangler rollback`. Version list: `npx wrangler deployments list`.
- **Habit (non-negotiable)**: deploy after each significant change, verify
  live (curl `/healthz`, `/api/status`, page markers; agent-browser at
  1440px + 390px; check `dev.log`-style console errors), THEN move on.
- Version discipline: `VERSION` in `src/config.ts` + package.json +
  CHANGELOG entry, gated by `scripts/check-version-sync.js` inside `npm test`.
- **KV schemas are sacred** (live users depend on them):
  `telegram_users_v6`, `notified_matches_v6`, `user_prefs_v1`, `fa_teams_ai`,
  `public_matches_v1`, `cache:snapshot:v1`, `table_top_v1:<league>`,
  `x_post_v1:*`, `x_budget_v1:*`, `x_daily_v1:*`, `x_pause_v1`,
  `x_last_error_v1`, settings keys. Never rename/re-shape without a migration.
- Cron ceiling: 50 subrequests/invocation (guard: `SUBREQUEST_CAP=48`).
- Shared worklog: `/home/z/my-project/worklog.md` — READ the tail first,
  APPEND a `--- / Task ID / Agent / Task / Work Log / Stage Summary` section
  when done. CHANGELOG.md in the repo: newest-first (top).

## 3. Open items per focus area

### A. UI/UX tweaks
- Verify which of the old 7-item backlog (CHANGELOG § 12.32-backlog) is still
  open vs already absorbed by 12.x-maintenance: hero date under the time chip,
  mobile time between crests, 5+ «بیشتر» results, new-leader Telegram alerts,
  corner watermark crescents, smaller bar clock, bigger logo.
- Known good state to preserve: fa↔en toggle + `dir` flip, theme toggle,
  dark default, tz popover with searchable IANA list, no horizontal scroll at
  390px, zero console errors (verified E2E at v13.6).
- Ideas not yet acted on: prefers-reduced-motion for live-beep/breath
  animations, `content-visibility` for long match lists, focus-visible
  outlines on interactive rows, skeleton instead of spinner.

### B. Telegram bot — flawless pass
- Systematic per-command verification: `/start` (lang picker, idempotent),
  `/lang`, `/teams`, `/follow` + invalid input, `/stop`, unknown commands —
  `scripts/check-join-flow.js` gates the happy paths; add gates for edge cases.
- Error paths: 429 retry/pause behavior, provider-down degradation alerts,
  per-chat tz digest dedupe, user cap warning.
- Live checks: `getWebhookInfo` (secret set, 0 pending), simulate a real
  update via `/api/simulate` (uses CLONED env since v13.5 — safe), inspect KV
  `telegram_users_v6` after.
- X path is additive — never let an X failure break the Telegram sweep
  (already try/caught; keep it that way).

### C. Performance / caching
- **sw.js CACHE name was never bumped after v13.6** — pre-13.6 asset entries
  are orphaned in clients' SW caches until the next SW version bump. Bump the
  cache name + verify the SW still installs/fetches correctly.
- HTML is ~37KB (from 241KB) — remaining wins: inline-critical CSS audit,
  font preload coverage (Regular + Bold preloaded; others?), consider
  `stale-while-revalidate` on `/api/public-matches`, KV snapshot TTL tuning,
  cron sweep latency (subrequest budget headroom).
- CF auto-brotli applies; asset URLs are immutable — safe to prefetch.

### D. SWOT (fresh)
- The original SWOT (worklog Task ID 1) targeted the 10k-line bundle; most
  weaknesses are now fixed. Do a FRESH SWOT of the 21-module codebase before
  touching anything — strengths (gates, dedupe, circuit breaker, docs),
  weaknesses (router if-chain, eval harness, `: any` escape hatches),
- opportunities (route table, structured logging, R2 for assets, queues),
  threats (KV schema drift, test brittleness to symbol renames, single-region
  KV latency, free-tier ceilings).

### E. Security review
- Admin auth: cookie/token handling on `/admin/*` (verify `ADMIN_TOKEN`
  compare — timing-safe?, cookie flags: HttpOnly/Secure/SameSite).
- Webhook: `X-Telegram-Bot-Api-Secret-Token` enforced (403 without it — keep).
- CSP headers on all pages (script-src 'self' — the unpkg removal was
  CSP-driven; verify no regressions after asset split).
- **XSS surface**: AI-learned/admin-override Farsi team names and provider
  data are interpolated into HTML — audit every interpolation for escaping.
- Secrets: `npx wrangler secret list` audit; confirm no secret ever appears
  in logs, KV, or client assets; `.dev.vars`/tokens.txt stay gitignored.
- Rate limiting on public API + refresh lock (present — verify coverage on
  new asset routes).

### F. Technical debt (documented, ranked)
1. `src/api.ts` fetch router = ~45-branch if-chain → route table
   (map of path → handler). Works today; refactor is churn risk — do it with
   the full test gate green at every step.
2. Eval-based test harness (`scripts/lib/worker-src.js`) is brittle to symbol
   renames — currently green; any rename must update the transforms.
3. tsc reached 0 partly via `: any`/`Record<string, any>` annotations —
   tighten to real types incrementally (never trade behavior for types;
   v13.3's await-cast bug is the cautionary tale, caught by the eval gate).
4. `src/dedupe.js` + `src/teams.js` are still plain JS — migrate to TS.
5. Version string sync (config.ts + package.json; gated) — consider single
   source of truth.
6. Changelog date column has historical inconsistencies (12.x-maintenance
   dated 09-13 above 12.33-xpost dated 09-15) — cosmetic, optional fix.
7. Candidate follow-ups from the v12-era backlog: PGL reliability (sportscore
   primary + KV-snapshot fallback), FA Cup tier/round filtering, EL/ECL
   qualifying relabel, scheduled-score hygiene (null `score` unless
   FINISHED/LIVE/PAUSED), BL1 season-freshness guard.

## 4. PROMPT (copy-paste into the next session)

> **Project**: SportSignal — Persian/RTL football match-tracker on a Cloudflare
> Worker, live at https://football.sportsignal.ir.
>
> **Repo**: clone `https://github.com/assadigit/SportSignal` (private) to
> `/home/z/my-project/workspace/SportSignal` with the GitHub token I give you.
> **First read `/home/z/my-project/worklog.md` (tail first) and
> `NEXT-SESSION-CONTINUATION.md` in the repo** — they contain the full state,
> mechanics, KV-schema constraints, and open-items list.
>
> **What exists (v13.6)**: 21 ES modules (thin `src/worker.ts` entry →
> `src/api.ts`; module map in README.md), extracted immutable client assets
> (`assets/public-13.6.css/js`, `assets/core-13.6.js` — public HTML ~37KB,
> was 241KB), bilingual Telegram bot `@SportSignalAlertsBot` + X profile
> (`src/x.ts`, OAuth 1.0a), KV `STATE` + cron `*/10 * * * *`, Workers AI Farsi
> translation, admin panel `/admin/login`. Gates: `npm test` = tsc (0 errors)
> + version-sync + 13 behavior checks — must stay exit 0.
>
> **THE TASK — a continuation pass across six areas, in this order:**
> 0. Start with a **quick fresh SWOT** of the modular codebase (the original
>    SWOT of the old 10k-line bundle is in worklog Task ID 1 — most of it is
>    fixed; find what's TRUE NOW) — then plan from evidence, not memory.
> 1. **UI/UX tweaks**: audit the old 7-item backlog in CHANGELOG § 12.32-backlog
>    against what 12.x-maintenance already fixed; fix what remains + verify
>    fa↔en toggle, theme, 390px no-hscroll, zero console errors.
> 2. **Telegram bot flawless**: systematic per-command + error-path
>    verification (see handoff §3B), add check-scripts for uncovered edges,
>    verify webhook + KV user state live; use `/api/simulate` (cloned-env,
>    safe) for live-ish tests.
> 3. **Performance/caching**: bump `sw.js` CACHE name (orphaned pre-13.6
>    entries), audit font preloads, consider SWR on `/api/public-matches`,
>    measure cron sweep subrequest headroom.
> 4. **Security review**: admin cookie flags + timing-safe compare, webhook
>    secret, CSP after the asset split, XSS audit of AI-learned/provider team
>    names interpolated into HTML, `wrangler secret list` audit, rate-limit
>    coverage. Fix what you find; document what you accept.
> 5. **Minimize technical debt**: the ranked list is in handoff §3F — api.ts
>    if-chain → route table (gate green at every step), tighten `: any`
>    annotations to real types (types-only, eval-gate-safe; remember the
>    v13.3 await-cast lesson), migrate `dedupe.js`/`teams.js` to TS.
>
> **Constraints**: deploy after each significant change and verify live
> (`CLOUDFLARE_API_TOKEN=<I'll give you> CLOUDFLARE_ACCOUNT_ID=<I'll give you> npx wrangler deploy`;
> curl /healthz + /api/status + page markers; agent-browser 1440px + 390px);
> `npm test` exit 0 before every deploy; never rename/re-shape KV keys
> (`telegram_users_v6`, `notified_matches_v6`, `user_prefs_v1`, `fa_teams_ai`,
> `public_matches_v1`, `cache:snapshot:v1`, `table_top_v1:*`, `x_*`); never
> commit secrets; keep zero runtime npm deps; bump VERSION + package.json +
> CHANGELOG together (version-sync gate); append a Task section to
> `/home/z/my-project/worklog.md` when done; push to GitHub + refresh the zip
> backup (`git archive --format=zip -o SportsSignal-<version>.zip HEAD`) at
> the end.
