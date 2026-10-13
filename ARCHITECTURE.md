# SportSignal — Architecture

> The module map and dependency direction as of v13.79-docs (the
> code-hygiene/modularization session of 2026-10-13). The header comment in
> `src/worker.ts` is the always-current condensed version of this file; this
> document adds the reasoning and the rules that keep the graph healthy.

## The system in one paragraph

A Cloudflare Worker (`ucl-notifier`) with three entry surfaces — the
Telegram webhook (the bot), the public website (`sportsignal.ir`, served
from a KV payload), and two cron triggers (the `*/10` tick and the lean
`27 */4` far-cup probe) — fed by three football-data providers
(football-data.org, sportscore.com, thesportsdb.com + a Wikipedia PGL
fallback) into one KV match pool (`matches_v13_tracked`), which is the
single source of truth for notifications, the site, and the SEO pages.
D1 (`sportsignal-stats`) holds site statistics. KV (`STATE`) holds every
other contract (all keys versioned IN the key name; see ADR-004).

## Module map (root src/, ~40 files)

### Layer 0 — leaves (no src imports)

| Module | Owns |
| :--- | :--- |
| `config.ts` | VERSION + CONFIG — every KV key name (the live-state contract) |
| `types.ts` | the `Env` binding shape |
| `utils.ts` | digits/dates/auth-hash, the subrequest + KV-op meters, HTTP retry |
| `fa-dict.ts` | static Farsi team dictionary (translation layer 1) |
| `tables.ts` | static dictionaries: competitions/logos, provider id maps, CSP headers + `normAlias`/`TEAM_ALIASES` (team-name folding — v13.76) |
| `dedupe.ts` | `matchKey` + `canonDedupe` (row-level identity) |

### Layer 1 — match model (v13.76-matchsplit)

| Module | Owns |
| :--- | :--- |
| `match-model.ts` | the status vocabulary (`isLiveStatus`/`isMatchFinished`) + event→match format helpers |
| `match-windows.ts` | notification time windows + `isBackfillEligible` |
| `match-dedupe.ts` | the notified-match KV store + the write-first send gate |
| `match-classify.ts` | eligibility (`shouldNotify`), big-match/derby sets, **`pickHeroMatch`** (the shared hero expression — ADR-001) |

Direction: model → (nothing); windows → model; dedupe → windows;
classify → teams, users, model. **Acyclic by construction** — the
users↔matches cycle was killed in v13.76 by moving `normAlias` to teams.

### Layer 2 — providers (v13.74-providersplit)

| Module | Owns |
| :--- | :--- |
| `provider-breaker.ts` | the `prov_down_*` suspension circuit |
| `provider-wikipedia.ts` | the PGL standings fallback |
| `provider-sportscore.ts` | `sportScoreDay` + the day sweep (44-budget-stop) |
| `provider-tsp.ts` | the TSP event mapper + league-views sweep |
| `provider-fd.ts` | football-data range fetch + 429 suspension |
| `match-pool.ts` | the `matches_v13_tracked` pool read/write |
| `provider-cups.ts` | the big-team cup scan + the far-cup probe |
| `providers.ts` | the orchestrators: `fetchLongView` / `fetchLiveSweep` / `fetchMatchesFromAPI` |

Direction: clients → breaker/pool; cups → tsp+sportscore+pool;
orchestrators → everything. `providers.ts` is the ONLY file outsiders
import for sweeps (cron/admin-ops/public-matches import the
orchestrators; api imports the individual clients for its admin
debug routes).

### Layer 3 — output composers

| Module | Owns |
| :--- | :--- |
| `translate.ts` | 3-layer translation + competition helpers |
| `fa-ai.ts` | Workers AI Farsi-name learner (layer 2, KV-cached) |
| `telegram.ts` | Bot API senders: retry, 429 pause, dead-chat pruning, the outbox |
| `composers.ts` | message composers + the standings pipeline |
| `card.ts` / `card-fonts.ts` / `card-route.ts` | resvg-wasm match-card rendering |

### Layer 4 — products (digest/notify)

| Module | Owns |
| :--- | :--- |
| `digest-weekly.ts` | Monday league tables + week-ahead fixtures |
| `digest-morning.ts` | the 9am matchday digest (`digest_sent_*` dedupe) |
| `digest-bigmatch.ts` | big-match FT + kickoff broadcasts |
| `digest-coronation.ts` | table-top coronation alerts |
| `notify-engine.ts` | `NOTIFICATION_CONFIGS` + `sendNotificationIfNeeded` + the fan-out |
| `notify-status.ts` | `detectStatusChanges` (kickoff/HT/FT; fail-closed map) |
| `notify-audit.ts` | the notified-match gap audit (`/api/audit`) |

### Layer 5 — user-facing state

| Module | Owns |
| :--- | :--- |
| `users.ts` | chat registry / member profiles / prefs / the master team list |
| `admin.ts` | sessions, settings, clubs catalog, simulate fixtures |
| `admin-bot.ts` | the owner toolbelt (`/admin`, `/members`, `/status`, `/broadcast`) |
| `monitoring.ts` | the cron-status reader + phase-error alerts + `liveFingerprint` |
| `migration.ts` | bot-migration broadcast rounds |

### Layer 6 — surfaces

| Module | Owns |
| :--- | :--- |
| `bot-ui.ts` | the tappable-UI layer: reply keyboard, command normalizer, grids/pickers |
| `bot.ts` | `handleTelegramUpdate` — the webhook router (kept WHOLE: see ADR-005) |
| `public-matches.ts` | the `/api/public-matches` pipeline (cache+lock+enrich+shape) — deliberately unsplit (cohesive around the public payload contract) |
| `auth.ts` | admin login/logout/change-password (HMAC session cookie) |
| `public-swr.ts` | the public-matches SWR endpoint |
| `simulate.ts` | the /api/simulate dry-run harness |
| `admin-ops.ts` | the POST-gated admin operations table |
| `api.ts` | the fetch router: webhook, SEO, admin, api, scheduled |

### Layer 7 — the cron (v13.75-cronsplit)

| Module | Owns |
| :--- | :--- |
| `cron-preflight.ts` | settings/caches/status read + budget governor + stale alert |
| `cron-users.ts` | outbox drain, 6h heartbeat, migration, FA-AI, cap |
| `cron-pool.ts` | the sweep decision (quiet/live/full/92-day recovery) |
| `cron-maintenance.ts` | cup scans, far probe, pool stamp-advance, standings |
| `cron-notify.ts` | fan-out + broadcasts + digest + coronation + audit |
| `cron-public.ts` | liveChanged fingerprint, enrichment, prewarm, live overlay |
| `cron.ts` | the SHELL: the KV-write meter, the execution lock, phase sequencing, the completion blob |

The shell owns the meter and the completion blob **by design** (locked by
`#seams` since v13.47, reaffirmed v13.75): the blob must be the tick's LAST
KV write so the meter folds. The `cron_status_v1` reader in `monitoring.ts`
is the other half of that locked seam.

### The SEO subtree (`src/seo/`) — the modularization exemplar

Real ES modules, NOT part of the eval harness (see ADR-005): `router.ts`,
`files.ts`, `data.ts`, `markup.ts`, `page-shell.ts` + per-page modules.
New server features should follow this pattern when practical.

### The pages subtree (`src/pages/`)

Template-literal HTML: `admin.ts` (680 — teams editor/broadcast/members/
diagnostics; single template, harness-locked by check-stats), `login.ts`,
`public.ts` (the live site's fallback shell).

## Dependency rules

1. **Acyclic, layer-down only.** The one historical cycle (users↔matches)
   was killed in v13.76; `#matchsplit` locks it dead. If you need
   something from a layer above, invert the dependency (callback, param,
   or move the shared thing down).
2. **No re-export shims.** When a module splits, every importer is
   rewritten to the specific new module in the same commit. `#matchsplit`/
   `#digestnotify` verify the old file is GONE.
3. **Groups move together in the harness order** (ADR-005): the flat
   concat mirrors runtime order (phases before the cron shell; bot-ui
   before bot).
4. **KV key contracts live in `CONFIG`** — never hardcode a key outside
   it when adding new state (legacy stragglers are documented in
   `docs/history/`; the cron split kept every key byte-identical).

## Where to add things

- A new notification type → `notify-engine.ts` (`NOTIFICATION_CONFIGS`) +
  a formatter in `composers.ts` + window in `match-windows.ts`.
- A new provider → its own `provider-*.ts` (breaker-gated), wired in
  `providers.ts` orchestrators.
- A new bot command → the router chain in `bot.ts` (+ label in
  `bot-ui.ts` if button-tappable).
- A new cron phase → a `cron-*.ts` module + one call in the shell, in
  runtime order.
- A new public page → `src/seo/` (the exemplar), NOT a new api.ts route.
