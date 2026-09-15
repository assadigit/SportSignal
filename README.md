# ⚽ SportSignal — Persian Football Match Notifier (Cloudflare Worker)

> **Current build:** v13.46-trim · full history in [`CHANGELOG.md`](CHANGELOG.md)
> **Operating it?** Read [`RUNBOOK.md`](RUNBOOK.md) — deploy/verify/rollback,
> monitoring semantics, and incident playbooks.

SportSignal is a serverless Telegram bot + web page that delivers timely,
Persian-localized football alerts (UCL + Europe's big leagues) to registered
chats — countdowns, kickoff/result cards, weekly tables — built on
**Cloudflare Workers** (free tier), KV state, and the **Football-Data.org V4**
API with two fallback providers.

- **Live:** https://sportsignal.ir — the public match page (RTL, fa/en toggle)
- **Bot:** message `/start` on Telegram to join; per-user teams + timezone
- **Ops liveness:** `GET /healthz` (JSON; 503 pages external monitors — see RUNBOOK)

---

## How it works

The Worker runs on a `*/10 * * * *` UTC cron (plus a Telegram webhook and
the web routes). Each tick:

1. **Drains the outbox** (`pending_sends_v1`) — Telegram sends that exhausted
   their 3 retries are re-sent with backoff, write-first.
2. **Refreshes the match pool** — a full 3-provider sweep at most every 2h
   (quiet periods; active match windows get a cheap *live* sweep between full
   ones — the v13.43 CPU fix). 600+ matches incl. long-view fixtures live in KV.
3. **Fans out notifications** — 7 per-match types over the pool:
   `pre-match-72h` (big matches, both-teams-followed), `24h`, `3h`, `1h`,
   `5min` (big only), `match-start`, `result` — plus `match-start-big` /
   `result-big` broadcasts. Horizon ≈ **[-26h, +73h]** with backfill floors,
   so ticks lost while a match was in-window self-heal.
4. **Anti-spam is fail-closed, everywhere** — a send only happens AFTER its
   dedupe record persists to `notified_matches_v6` (write-first); a failed KV
   write suppresses the send (silence beats spam). Dedupe key:
   `normHome|normAway|utcDate[:16]:<type>`, plus a per-isolate MEM_DEDUPE set
   seeded only on successful puts.
5. **Meters itself** — true KV-write count/day (governor: SOFT 700 sheds
   cosmetic writes, HARD 850 also holds the pool write + pages the admin;
   the anti-spam set is never gated), true subrequest totals per tick
   (fetches + KV ops), and a completion blob (`cron_status_v1`) that
   `/healthz` reads.
6. **Pings the dead man's switch** — one healthchecks.io ping per completed
   tick via `HEALTHCHECK_PING_URL` (missing/failed ticks alert via Telegram;
   the cron class that URL polling cannot see).

Auxiliary legs: FA-AI name learner (Workers AI + varzesh3 grounding,
batched, gated), weekly league-tables digest (Monday 01:30–06:00 Tehran),
morning digest, notification-gap audit with rate-limited admin alerts,
public payload prewarm, and an optional X (Twitter) profile (default OFF).

## Repository layout

```
src/
  worker.ts        entry — thin re-export of api.ts (fetch + scheduled)
  types.ts         the Env contract (KV binding, secrets, AI binding)
  config.ts        VERSION, CONFIG (KV keys = live-state contracts), X_CONFIG,
                   static tables (teams, leagues, cups, UCL logo path)
  utils.ts         digits/dates/auth-hash/subrequest+kv-op meters/HTTP retry
  fa-dict.ts       static Farsi team dictionary (translation layer 1)
  translate.ts     3-layer translation + competition helpers (AI/admin/dict)
  fa-ai.ts         Workers AI Farsi-name learner (layer 2, KV-cached)
  matches.ts       windows, eligibility, notified-record KV (write-first)
  providers.ts     football-data / sportscore / thesportsdb chain + circuits
  telegram.ts      Bot API senders (retry / 429 pause / dead-chat / outbox)
  composers.ts     message + card composers, standings pipeline
  digest.ts        weekly tables / morning digest / big-match broadcasts
  x.ts             X (Twitter) profile: OAuth 1.0a, budget, dedupe (default off)
  notifications.ts per-match notification engine + status-change detection
  users.ts         chat registry / member profiles / prefs / master list
  admin.ts         sessions / settings / clubs catalog / simulate fixtures
  public-matches.ts /api/public-matches pipeline (cache+lock+enrich+shape)
  bot.ts           Telegram webhook handler (/start /lang /follow /next …)
  cron.ts          the */10 tick (phases; meter; governor; dead man's switch)
  api.ts           HTTP router + healthz + admin auth + card PNG route
  pages/           PUBLIC / LOGIN / ADMIN HTML templates (shell only)
assets/            versioned client payload (core-*.js, public-*.js/css —
                   immutable, cache-bust by renaming), fonts, sw.js, icons
scripts/           the self-check suite (npm test) — eval-extracts REAL
                   source via scripts/lib/worker-src.js; verify-x-connection.js
                   and fa-names-from-wikipedia.js are standalone ops tools
design-system/     visual design MASTER doc (intent; implementation wins)
docs/history/      archived session notes
```

## Secrets (wrangler, never in vars)

`BOT_TOKEN`, `API_TOKEN` (football-data), `ADMIN_TOKEN`, `ADMIN_PASS`,
`WEBHOOK_SECRET`, `HEALTHCHECK_PING_URL` (optional — absent = no-op), and
the X set if the profile is ever enabled: `X_API_KEY`, `X_API_SECRET`,
`X_ACCESS_TOKEN`, `X_ACCESS_TOKEN_SECRET`, `X_ENABLED`, `X_DRY_RUN`.
`TEHRAN_TZ=Asia/Tehran` is a plain var. The Workers AI binding (`[ai]`) and
the `STATE` KV binding are in `wrangler.toml`.

## Bot commands (Persian-first; /help in-bot)

| Command | Action |
| :--- | :--- |
| `/start` | Join & receive notifications (idempotent) |
| `/stop` | Leave |
| `/teams` | Followable teams with Persian names + numbers |
| `/follow 1,3,7` / `follow all` | Follow teams |
| `/next` | Upcoming matches for your teams (from the KV pool) |
| `/featured` | Today's big matches |
| `/timezone london` / `reset` | Set / reset your timezone |
| `/lang` | fa/en picker (persists to `user_prefs_v1`) |

## Testing & deploying

```sh
npm install
npm test          # tsc --noEmit + 19 check scripts; 135 behavioral checks
                  # that eval-extract the REAL src (no drift between tested
                  # and shipped code). Must exit 0 before every deploy.
npm run deploy    # = npx wrangler deploy (needs CLOUDFLARE_API_TOKEN)
```

House rules (enforced by tests + RUNBOOK invariants): version three-way sync
(`config.ts` VERSION ↔ `package.json` ↔ CHANGELOG top entry); any src
signature change co-evolves `scripts/lib/worker-src.js` order/transforms in
the SAME commit; KV keys are live-state contracts (no renames); one runtime
dep (`@resvg/resvg-wasm`, bundled WASM via wrangler rules — use npm, the
repo's toolchain).

## Monitoring (the $0 stack)

- **healthchecks.io** dead man's switch — cron `*/10` UTC, 20-min grace,
  Telegram alerts; the Worker pings on every completed tick and `/fail`s
  with the error name on caught exceptions.
- **UptimeRobot** (or any poller) — `GET /healthz` every 5 min; 503 means
  stale heartbeat (>30m) or stale completion (>35m) or outbox ≥ 50.
- **In-band** — `degraded: true` on healthz is the early-warning band;
  the bot heartbeats to the admin chat every 6h; the gap audit alerts
  (rate-limited) on notification losses.

See RUNBOOK §5 for the full alert-semantics matrix (which watcher catches
which failure class) and §6 for the known blind spots.
