# Next-Session Prompt — Codebase Hygiene, Modularization & System-Design Pass

> Paste-ready hand-off authored at the close of the v13.71-admintools session
> (2026-10-13). The previous session closed reliability gaps (v13.69–v13.71).
> This session is about the CODEBASE itself: clean code, modularization,
> dead-code removal, front-end styling hygiene, and documented decisions.

---

## The prompt (paste this into the new session)

### Project context

**SportSignal** — a football match-notification ecosystem:

- **Telegram bot** `@SportSignalAlertsBot` (kickoff/FT/live/result alerts for
  followed teams + big-match picks, Persian/English, per-user timezone).
- **Website** https://sportsignal.ir — the single source of truth for the
  "big match" hero; the bot's `/featured` and `/next` must always match it.
- Runs entirely on **Cloudflare Workers** (worker name `ucl-notifier`):
  - Webhook handler for Telegram updates (`/webhook`, secret-gated).
  - Cron triggers: `*/10 * * * *` (notify pipeline) + every 4h (pool sweep).
  - KV namespace `STATE` (match pool, user prefs, dedupe, profiles, outbox).
  - D1 `STATS_DB` (site visitor stats — not on the bot critical path).
  - football-data.org + sportscore providers (429-retry + circuit-breaker).
  - X (Twitter) auto-posting with monthly/daily budgets.
  - Match-card image rendering (`@resvg/resvg-wasm`), OG image routes, SEO
    sitemap/robots/JSON-LD, `/admin` web panel (HMAC cookie login),
    healthchecks.io pings.

### Access (credentials)

```
GitHub repo:   https://github.com/assadigit/SportSignal.git
GitHub token:  REDACTED-GITHUB-TOKEN
Clone to:      /home/z/sportsignal   (clone URL with token:
               https://assadigit:<token>@github.com/assadigit/SportSignal.git)

Cloudflare API token:  [REDACTED:cf_api_token — rotate via the Cloudflare dashboard; a later-session token was live here 2026-10-13 → 2026-10-18]
Cloudflare account:    [REDACTED:cf_account_id — recoverable from the dashboard or any session handoff]
Deploy:                CLOUDFLARE_API_TOKEN=<cf token> CLOUDFLARE_ACCOUNT_ID=<acc id> npm run deploy

Telegram bot:  @SportSignalAlertsBot
Bot token:     [REDACTED:bot_token — 2026-10-18 session found this 2026-10-13 handoff still carrying the LIVE token in a public repo; rotate via @BotFather /revoke, then set the new BOT_TOKEN via wrangler secret put]
Webhook:       https://football.sportsignal.ir/webhook
Admin/owner:   Alitagram, Telegram chat id 92788333 (secret CHAT_ID on the worker)
```

### Current state at hand-off (verify, don't trust)

- Version **13.71.0 / `13.71-admintools`**, commit `6012789`, main pushed &
  deployed; `curl -s https://sportsignal.ir/healthz` → `ok:true`,
  `degraded:false`, `version:"13.71-admintools"`, `admin_alerts_ok:true`.
- `npm test` → **796 checks, 0 failures** (tsc + 19 check scripts that eval
  REAL source — see "eval-harness rule" below).
- Bot has 4 registered users; cron clean; outbox empty; webhook 0 pending.
- Resume checklist: repo clean on main? `git log --oneline -3` matches
  healthz `version`? `npm install && npm test` exits 0? Then proceed.

### Mandatory reading (in this order, BEFORE any code)

1. `/home/z/my-project/worklog.md` — the append-only dev worklog
   (Tasks 32–34 cover v13.69–v13.71; read them to know what NOT to regress).
2. `RUNBOOK.md` — especially §1 (access map), §2 (deploy procedure),
   §9 (test invariants), §11 (the never-do list), §12 (sandbox gotchas).
3. `CHANGELOG.md` top entries — version-by-version behavioral history.
4. `README.md` — product description.

### Session mission

**Phase 0 (mandatory, before touching anything): full codebase audit +
SWOT analysis.** Produce a written audit: strengths, weaknesses,
opportunities, threats — with concrete evidence (file/line counts, coupling
map, duplication findings, dead-code candidates, dependency risks, test
coverage shape, deploy/runbook gaps). Rank findings by impact × risk.
Then work the findings **in phases, highest priority first**. No approval
needed between phases: complete a phase → verify (tests + local smoke +
deploy + live healthz) → log it → next phase.

**The focus areas:**

1. **Clean code & tidying** — consistent style, naming, dead branches,
   commented-out code, stale TODOs, misleading names.
2. **Modularization** — split the god modules (see table below) into
   cohesive units; clarify module boundaries; make the dependency graph
   acyclic and obvious.
3. **God-module extraction** — the big monoliths, with their multiple
   responsibilities, need surgical splitting.
4. **System-design & software-engineering best practices** — dependency
   direction, separation of concerns (transport vs domain vs data), error
   handling taxonomy, single-responsibility functions, no hidden side
   effects, explicit contracts between modules.
5. **Dead code removal** — unused exports, orphaned assets (e.g.
   `assets/core-13.8.js` coexisting with `core-13.9.js`,
   `public-13.12.css/js` vs `public-13.13.css`), unreferenced helpers,
   legacy migration shims whose epoch has passed.
6. **Front-end styling hygiene** — the site's CSS lives inline in TS
   template literals (`src/pages/*.ts`, `src/seo/*`). Tidy, dedupe,
   consolidate; keep the visual output byte-identical where possible.
7. **Documentation of decisions & rules** — add an architecture doc
   (module map + dependency direction), decision records (ADR-style:
   context → decision → consequences) for the big standing decisions
   (website-as-truth, write-first dedupe, fail-closed KV, no-sweep-on-
   commands, eval-harness, versioned asset scheme), and refresh
   README/RUNBOOK to match the new module layout as you go.

**Measured starting point (from the 2026-10-13 survey):**

| God module | Lines | Responsibilities mixed |
| :--- | ---: | :--- |
| `src/providers.ts` | 853 | 2 provider clients + normalization + circuit breaker + pool merge |
| `src/cron.ts` | 697 | sweep + notify + digest + X-posting + heartbeat + stats, all phases |
| `src/pages/admin.ts` | 683 | admin HTML + inline CSS + inline JS in one template literal |
| `src/public-matches.ts` | 649 | site data assembly + hero truth + SWR + rendering glue |
| `src/matches.ts` | 556 | match classification + notify windows + league/team sets |
| `src/digest.ts` | 555 | weekly tables + weekly summary, two products in one |
| `src/bot.ts` | 539 | webhook routing + every command + callback queries |
| `src/notifications.ts` | 513 | the notify engine (fine-grained, but tangled with telegram.ts) |
| `src/admin-ops.ts`, `src/composers.ts`, `src/config.ts`, `src/api.ts` | 400–484 each | each mixes ≥2 concerns |

Root `src/*.ts`: 10,112 lines / 36 files. `src/seo/` + `src/pages/`:
4,132 lines. `scripts/`: 4,304 lines / 21 files. Note `src/seo/` is the
GOOD example of modularization already in the repo — follow its pattern.

### Hard constraints — NEVER regress these

- **v13.68 website-as-truth:** `/featured` + `/next` must keep matching the
  site hero (`isFeaturedMatch || isMasterPair`, live-first, nearest kickoff).
  If you move this logic, it must stay a SINGLE shared expression used by
  both the site and the bot.
- **v13.69 delivery guarantees:** Telegram pacing (40ms floor), bounded
  pause-wait, outbox deferral on pause/budget, per-chat card fallback with
  text fallback, photo retry, serialized outbox push. Exactly-once kickoff/
  FT alerts: no duplicates, no misses (write-first dedupe is sacred).
- **v13.70 admin-alerts layer:** `admin_alerts_ok` healthz field; CHAT_ID
  secret = 92788333 must keep working (heartbeat, pages).
- **v13.71 admin tools:** `/admin`, `/members`, `/status`, `/broadcast`,
  join/leave owner pages — gated to CHAT_ID, fail-closed, denial to others.
- **v13.45 no-sweep-on-commands:** bot commands must NEVER trigger provider
  sweeps (CPU-kill protection).
- **Eval-harness rule:** the check scripts eval REAL source extracted via
  `scripts/lib/worker-src.js`. ANY signature/module-layout change in `src/`
  MUST co-evolve `scripts/lib/worker-src.js` (concat order + transform
  rules) and the grabFn/grabVar regex asserts **in the same commit**.
  Refactors are exactly where this rule bites — budget real time for it.
- **Version discipline:** `src/config.ts` VERSION + `package.json` version +
  top CHANGELOG entry must agree on `major.minor` (check-version-sync
  enforces it). Bump for every phase you ship.
- **No new runtime deps** (only `@resvg/resvg-wasm`; keep lockfile npm-made).
- **Subrequest ceiling 50/invocation** — keep the fetch-tuned gates.
- **KV key contracts are load-bearing** (`*_v6` versioned names, write-first
  dedupe, fail-closed patterns) — never rename without a migration plan.
- **No behavior changes**: this is a refactor/hygiene session. Every phase
  must keep the 796 checks green (renames/extracts may ADD checks) and the
  site visually identical (screenshot-compare the hero + list pages if
  touching CSS).

### Workflow protocol (per phase)

1. `TodoWrite` plan with Task IDs before starting.
2. Read the worklog first; append a worklog entry per phase (Task 35+) to
   `/home/z/my-project/worklog.md` using the existing template
   (`--- / Task ID / Agent / Task / Work Log / Stage Summary`).
3. Phase → `npm test` green → local smoke (`npx wrangler dev --port 8787`,
   healthz + `/` + webhook 403 check) → deploy → live healthz + webhook +
   one cron tick verified → commit (version bumped, CHANGELOG entry,
   worklog appended) → push → next phase.
4. If a phase would break a constraint above, STOP that phase, document
   why in the worklog, and pick the next-highest finding instead.
5. Update the docs (module map / ADRs / RUNBOOK sections) as part of the
   phase that changes them — docs are deliverables, not an afterthought.

### Definition of done for the session

- Written audit + SWOT at the top of the session log (worklog Task 35).
- Every god module either split (with the split documented) or explicitly
  justified as-is in the audit.
- Dead code + dead assets removed (with grep-proof of non-reference before
  each removal).
- Front-end styling consolidated/tidied with visual-output parity.
- Architecture doc + decision records committed; README/RUNBOOK refreshed.
- All phases deployed; live healthz green at the final version; full test
  suite green; worklog complete through the last task ID.

---

## Operational notes for the new session (not part of the paste)

- The worklog at `/home/z/my-project/worklog.md` is the primary continuity
  record; Tasks 32–34 are the most recent. This file is the mission brief.
- Deploy evidence from last session: v13.71 deploy `b74b5ee4`, 796 checks
  green, announcement message_id 737 delivered to the owner.
- Live `/broadcast` was deliberately never exercised against real users —
  if the refactor touches `admin-bot.ts` or `telegram.ts`, verify broadcast
  locally with a fake token (see worklog Task 33 local E2E pattern).
- KV inspection: use the REST API, never `wrangler kv key get` (it lies —
  RUNBOOK §1).
