# 2026-11-07 — Session 16: Channel Mirror Session 0 (the repository audit + implementation design)

Wall-clock note (the repo's convention): this session ran 2026-11-07
(Tehran afternoon), the first session after the S15 close (`2513ca0`,
2026-11-06 17:46 UTC). Per the S15 hand-off, S16 leads with the owner's
new program: **`docs/TELEGRAM_CHANNEL_MIRROR_SPEC.md` Session 0** — the
repository audit and implementation design for the one-way public Persian
Telegram channel that mirrors the bot's public notifications.
Documentation only; no runtime code; no deploy.

## 1) Boot gates (all green)

- `git fetch`: origin `main` == `2513ca0` (the S15 close) — no web-UI
  push in between; tree clean at start; branch `main`.
- `npm install` (fresh sandbox) + `npm test` → **EXIT 0, 2,614 OK /
  0 FAIL** — exactly the v13.229 baseline S15 documented.
- Read in full, in this order: `docs/TELEGRAM_CHANNEL_MIRROR_SPEC.md` (653
  lines), `AGENTS.md`, `README.md`, `docs/ARCHITECTURE.md`, `docs/RUNBOOK.md`,
  `docs/SCHEDULER.md`, `docs/OWNER_TODO.md`, the S15 hand-off
  (`2026-11-06-s15-audit.md` — which flagged this session's charter),
  the six ADRs' titles/decisions, `package.json`, `wrangler.toml`,
  `wrangler.dev.toml`, `db/users-schema.sql`, `CHANGELOG.md` head, and
  the `src/worker.ts` module map.

## 2) The audit method (complete, per spec PART III §5)

- `grep -rn "api.telegram.org" src/` — the full Bot-API surface: 9
  senders in `telegram.ts`, `getChat` (users.ts profile enrichment), and
  the admin webhook diagnostics in `api.ts`. Nothing else.
- Every call site of `sendTelegram` / `sendTelegramDirect` /
  `sendPhotoBinary` / `sendDice` / `sendAnimation` / `sendUclGifBanner` /
  `sendSticker` / `editMessageText` enumerated and traced to its origin
  (24 families total).
- Deep read of the whole notification path: `notify-engine.ts`,
  `cron-notify.ts`, `match-dedupe.ts`, `match-windows.ts`,
  `match-classify.ts`, `notify-status.ts`, `digest-bigmatch.ts`,
  `digest-morning.ts`, `digest-night.ts`, `digest-uclnight.ts`,
  `digest-weekly.ts`, `digest-coronation.ts`, `telegram.ts` (complete),
  `cron.ts`, `cron-users.ts`, `cron-preflight.ts`, `kickoff-drain.ts`,
  `api.ts` (router + scheduled), `monitoring.ts`, `bot.ts`,
  `admin-bot.ts`, `migration.ts`, `notify-audit.ts`, `simulate.ts`,
  `users.ts`, `dedupe.ts`, `md.ts`, `types.ts`, `config.ts`,
  `stickers.ts`, `providers.ts` (degradation alert), and
  `scripts/lib/worker-src.js` (harness order).

## 3) The deliverable

**`docs/telegram-channel-mirror/DISCOVERY.md`** — the Session 0 discovery
document with everything PART III §6 requires:

1. the complete notification inventory (24 families, each with origin,
   eligibility, audience, personalization, composer, transport, dedupe,
   retry, schedule, and the channel include/exclude decision);
2. flow descriptions for the five main routes (engine unit, broadcasts,
   status alerts, digests, outbox drain);
3. the exact composers/senders to reuse;
4. the precise dedupe + outbox behavior (including the fact the live
   ledger is D1 `notified_v1`, not the KV blob the older docs describe);
5. mirror/exclude decisions with reasons (11 families mirrored, the rest
   excluded);
6. the deterministic Persian/Asia-Tehran channel variant design (incl.
   the night-digest personalization trap);
7. the recommended architecture: `src/channel-mirror.ts` + D1
   `channel_posts_v1` claims + `[vars]` `TELEGRAM_CHANNEL_CHAT_ID` /
   `TELEGRAM_CHANNEL_PUBLIC_URL`, disabled by default;
8. the per-tick KV/D1/subrequest budget table;
9. risks, migration/versioning, backward-compat, harness changes;
10. the refined session plan (Sessions 1–4) + the open owner questions.

Key design decisions documented in it: destination-scoped event identity
(never bare `matchKey`, never message text), the kickoff/result
**stage collapse** (engine `match-start` + broadcast `match-start-big` =
ONE channel post — the spec's "at most one per logical occurrence"),
at-most-once bias on ambiguous failures with stuck-claim reconciliation,
pause-on-permanent-channel-error, and the outbox `dest` additive field
(the v13.125 `sticker` precedent).

## 4) End-of-session report (spec PART VII §17)

```text
SESSION: 0 + 16 — Channel Mirror Session 0 (repository audit + implementation design)
STATUS: complete
SCOPE COMPLETED:
- Read the entire spec + all repo operating docs (AGENTS/README/ARCHITECTURE/RUNBOOK/SCHEDULER/ADRs/history)
- Traced every outgoing Telegram message family from origin to Bot API transport (24 families)
- Verified dedupe/outbox/retry/reservation/drain-chain behavior against source (not docs)
- Produced docs/telegram-channel-mirror/DISCOVERY.md (all 10 PART III §6 deliverables)
- Refined the session plan; documented event identity, stage collapse, fa/tz variant, failure policy
FILES CHANGED:
- docs/telegram-channel-mirror/DISCOVERY.md (new)
- docs/history/2026-11-07-s16-channelmirror-s0.md (this note)
- docs/OWNER_TODO.md (the S16 bullet)
TESTS:
- npm test — EXIT 0, 2,614 OK / 0 FAIL (docs-only session; the suite re-run at the release commit per the AGENTS hard rule)
COMMIT:
- 2160576 (full: 21605769ca97aea7dd0cc17b419d7a64922addf6) "docs: the Channel Mirror Session 0 discovery …" (+ this SHA-fill follow-up commit)
PUSH:
- origin main — verified with git ls-remote: refs/heads/main = 21605769ca97aea7dd0cc17b419d7a64922addf6
DEPLOYMENT:
- not applicable — documentation-only (per the spec: no deploy of a docs-only change)
POST-DEPLOY VERIFICATION:
- not applicable (production stays v13.229-teamladder, untouched)
CHANNEL STATE:
- disabled (no channel exists yet; no runtime code changed)
OWNER ACTION REQUIRED:
- none yet for Sessions 1–3; Session 4 needs: create the public channel, choose the username,
  add @SportSignalAlertsBot as admin with post permission, supply chat id + public URL
- open product confirmations (any time): mirror the degradation alert? keep dice/cards/stickers/GIF? keep the trial footer?
RISKS / FOLLOW-UPS:
- all Session-0 risks documented in DISCOVERY.md §9 (R1–R10); the follower-gate boundary (§6) is the one product-level nuance the owner should read
NEXT SESSION:
- Session 1 — destination configuration + durable idempotency foundation (see the prompt below)
```

## 5) Next-session prompt (Session 1) — copy-paste ready

```text
You are the lead engineer continuing the SportSignal Telegram Channel
Mirror program (repo: https://github.com/assadigit/sportsignal, branch
main). This is SESSION 1 of the program: "Destination configuration,
delivery foundation and durable idempotency".

MANDATORY READING BEFORE ANYTHING ELSE (in this order):
1. docs/TELEGRAM_CHANNEL_MIRROR_SPEC.md (repo root) — the whole spec. PART VI
   defines this session; PART IV §8–§11 are its rules.
2. docs/telegram-channel-mirror/DISCOVERY.md — the completed Session 0
   audit. It is authoritative for: the notification inventory, the
   verified dedupe/outbox behavior (D1 notified_v1, NOT the KV blob),
   the event-identity design, and the architecture you are building.
3. AGENTS.md + docs/RUNBOOK.md (§1 access map, §2 deploy procedure, §8 KV ops,
   §11 never-do list) + docs/history/2026-11-07-s16-channelmirror-s0.md
   (the S16 note — boot gates + this prompt's provenance).

SESSION 1 SCOPE (runtime code, disabled by default — zero behavioral
surface until Session 2):
1. src/types.ts: add optional Env fields TELEGRAM_CHANNEL_CHAT_ID? and
   TELEGRAM_CHANNEL_PUBLIC_URL? (strings; the TEHRAN_TZ [vars] precedent).
2. wrangler.toml [vars]: add both, empty by default (NOT secrets — a
   public channel id/url is not a credential). Note wrangler.dev.toml.
3. New module src/channel-mirror.ts v1, per DISCOVERY §7:
   - channelDestinations(env): [] unless TELEGRAM_CHANNEL_CHAT_ID parses;
     the destination shape {key:"fa-football", chatId, publicUrl,
     locale:"fa", sport:"football", enabled}.
   - claimChannelEvent(env, dest, eventKey): D1 USERS_DB INSERT OR IGNORE
     into the NEW table channel_posts_v1 (dest_key, event_key, claimed_at,
     sent_at, state, attempts, last_error; PK (dest_key, event_key));
     changes>0 = newly claimed; existing row or D1 failure => false
     (fail-closed — no claim, no send, exactly the saveNotifiedMatch law).
     MUST hard-no-op when env.SIM_NOTIFIED_KEY is set (the simulate
     harness must never touch the channel) and when destinations are [].
   - recordChannelState(env, dest, eventKey, state, errorClass?) — updates
     sent_at/state/attempts; telemetry must never break a send path.
   - The pause marker (KV channel_mirror_v1, written ONLY on state
     transitions) + pausedChannel(env) (isolate-memoized read).
4. db/users-schema.sql: append the CREATE TABLE IF NOT EXISTS
   channel_posts_v1 (verbatim from DISCOVERY §7.2). Document the apply
   step (wrangler d1 execute sportsignal-users) in RUNBOOK — follow how
   the repo recorded the v13.94 notified_v1 introduction.
5. NO notification-family hooks in this session (those are Session 2).
   The module may export the future hook signature with a
   not-yet-called body only if tests need it; otherwise leave unwired.
6. Test harness co-evolution IN THE SAME COMMIT (AGENTS hard rule):
   - scripts/lib/worker-src.js: insert "channel-mirror.ts" in the concat
     order AFTER its dependencies (config, telegram, composers, users,
     match-dedupe are all before it) and BEFORE notify-engine/digest
     modules. Check #seams still passes.
   - New scripts/check-channel-mirror.js v1, added to the npm test chain
     in package.json. Cover at minimum:
     a. missing/empty TELEGRAM_CHANNEL_CHAT_ID => channelDestinations []
        and every entry point a no-op BEFORE any KV/D1/subrequest op;
     b. claim idempotency: second claim of the same (dest,event_key)
        returns false; a different event_key claims fine;
     c. D1 failure injection => claim returns false (fail-closed);
     d. SIM_NOTIFIED_KEY set => full no-op;
     e. the event-key builders from DISCOVERY §7.2's identity table
        (match:<matchKey>:<type>, the -big base-stage collapse keys,
        status-transition keys, digest:<name>:<tehran-dateKey> keys,
        coronation keys) — pure functions, table-driven;
     f. pause marker semantics (paused => send path off, unpaused on
        transition).
   - Version discipline: bump src/config.ts VERSION + package.json
     (e.g. 13.230.x-channelbase) + CHANGELOG entry; check-version-sync
     must pass.
7. Validation before push (RUNBOOK §2 order): npm test (existing 2,614 +
   new checks, EXIT 0) → wrangler dev local smoke (/, /healthz, /nope,
   /api/card/nope, /admin — routes real, healthz JSON sane, channel
   unconfigured = invisible) → npx wrangler deploy → curl
   https://sportsignal.ir/healthz (new version, ok:true) → watch ≥2 full
   cron ticks (last_cron_age ≤10 twice; kv_writes_last_tick unchanged
   from baseline — the channel must add ZERO writes while disabled) →
   tail one tick for unexpected channel logs (there must be none).
8. Git discipline: fetch the remote first (the owner sometimes uploads
   via web UI — S15 hit exactly that); never force-push; commit scoped;
   push one-shot (git push https://x-access-token:<token>@… main — never
   persist tokens in git config); verify with git ls-remote.
9. End of session: write docs/history/2026-11-07-s17-<name>.md (or the
   next calendar day if the session crosses midnight UTC) with the
   PART VII §17 report (SESSION/STATUS/SCOPE/FILES/TESTS/COMMIT/PUSH/
   DEPLOYMENT/POST-DEPLOY/CHANNEL STATE: "configured-disabled — runtime
   foundation shipped, no events mirrored yet"/OWNER ACTION/RISKS) +
   the complete copy-paste prompt for Session 2 (mirror all eligible
   families per DISCOVERY §7.4's six hook points, the stage collapse,
   the Persian variant, the channel footer + private CTA when
   configured, the night-digest channel variant with byte-identical
   private parity). Also refresh docs/OWNER_TODO.md with an S17 bullet in
   Persian, and print the next-session prompt in your final reply.

CONSTANTS (from the owner, never committed to the repo): deploy needs
CLOUDFLARE_API_TOKEN in the shell; push needs the one-shot GitHub token.
No secrets/tokens in code, logs, commits, or docs — ever.

OUT OF SCOPE FOR SESSION 1: mirroring any notification family, footer
changes, outbox `dest` field changes, monitoring surfaces, the channel
itself (owner has not created it), any new cron/provider/polling.
ACCEPTANCE (spec PART VI Session 1): missing channel config has zero
effect on existing bot behavior; one event identity cannot enqueue
multiple channel deliveries; existing private delivery passes all
regression tests.
```

## 6) Standing watch items (carried from S15, unchanged — NOT this program's work)

The RUM TRUE multi-day confirm (11-07+ on both datasets, the human LCP
p75 re-quote), the KV read both layers (metered band + s15-kv-true-read),
GSC Pages ≈11-09+ (owner-side), PSG–Roma hero ride (Nov 25), the epoch
guard bump (~Nov 25), G-14 December, the 4-club MVP answer, and the KV
plan question. They ride the ordinary session cadence; the Channel
Mirror sessions do not touch them unless the owner asks.
