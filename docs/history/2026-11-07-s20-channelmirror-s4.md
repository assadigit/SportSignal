# 2026-11-07 — Session 20: Channel Mirror Session 4 (production readiness — the owner gate stayed closed)

Wall-clock note (the repo's convention): this session ran 2026-11-07
Tehran mid-afternoon (the sandbox clock — 2026-11-07T12:0x–12:4xZ — runs
behind the Tehran wall-clock convention the history notes use). Per the
S19 hand-off, S20 executes **`TELEGRAM_CHANNEL_MIRROR_SPEC.md` PART VI
Session 4** (production readiness + activation, owner-gated) with
**PART V §15** (the three-state definition of done) as the honesty rule
and **DISCOVERY §7.8** as the validation design.

## 1) Boot gates (all green)

- Fresh clone this session; `npm install`; `git fetch` (one-shot token
  URL): origin `main` == `b404e6c` (the S19b close) — no owner push in
  between; tree clean at start; branch `main`.
- Read in full, in this order: `TELEGRAM_CHANNEL_MIRROR_SPEC.md` (all
  654 lines; PART VI Session 4 + PART V §15 + PART VIII — the
  owner-provided values table, never guessed), `docs/telegram-channel-mirror/DISCOVERY.md`
  (§7.8 the non-posting validation, §7.6 the failure policy, §10 the
  coverage that must stay green, §12 the open owner questions),
  `AGENTS.md` + `RUNBOOK.md` (§1, §2 incl. the fetch-before-DEPLOY line,
  §3, §8, §8b, §11, §13 — the channel-ops section), the six program
  history notes (S17, S18, S18b, S18c, S19, S19b — the S19 §2 documents
  every Session-3 seam this session consumes; the S19b §4 records the
  3-vs-5 permanent-class divergence), then the consuming seams in
  source: `src/channel-mirror.ts` (all 861 lines),
  `src/telegram.ts` (`classifyTelegramFailure`, the `chan` ctx, the
  outbox `dest` field, the drain's channel branch), `wrangler.toml`
  `[vars]`, `OWNER_TODO.md`.
- Read-only identity checks with the session-supplied bot token (never
  committed, never logged in full): `getMe` → bot id `8988731008`,
  username `@SportSignalAlertsBot` — matches `CONFIG.CHANNEL_BOT_URL`
  and the verified `MIGRATION_NEW_BOT_URL` spelling; `getWebhookInfo` →
  `https://football.sportsignal.ir/webhook`, 0 pending updates, no last
  error — the private pipeline's webhook healthy before anything else
  was touched.

## 2) The owner gate — asked directly, answered, CLOSED

Session 4's precondition (spec PART VI + PART VIII, RUNBOOK §13.1) is
owner-controlled: the PUBLIC Persian channel must exist, the bot must be
its administrator with post permission, and the chat id + public URL
must arrive from the owner. This session put the gate to the owner as
four direct questions (channel URL/@username · numeric chat id ·
bot-admin state · first-event policy). The returned answers:

- **Channel URL: "Not created yet"** — no `https://t.me/…` link and no
  `@username` arrived. This is the load-bearing answer: with no
  destination there is nothing to resolve, validate, or enable.
- Numeric chat id: "Don't know — resolve it" (nothing to resolve the id
  FROM — moot without a username).
- Bot admin: "Yes — admin + post" (moot while the channel does not
  exist — `getChatMember` needs a chat; recorded, not resolvable).
- First-event policy: "Wait for natural event" — the spec's own default
  (no test post to the public channel without explicit owner approval).

Per the session rule (the S19 §4 hand-off): the owner has NOT supplied
the values ⇒ **do NOT fake activation** — STOP at the readiness report,
keep production in the safe disabled state, report exactly what remains.
Nothing was guessed, probed or invented (spec PART VIII); no test post
was sent; no vars were set; no deploy was needed (§5 below). The
contradictory-looking admin answer needs no resolution: the absence of
any channel URL/id closes the gate either way.

## 3) The readiness battery (all green — the S19b verification shape)

| Check | Result |
|---|---|
| `npm install` → `npm test` (the canonical tree `b404e6c`) | **EXIT 0, 2,888 OK / 0 FAIL** — exactly the canonical S19/S19b number (docs-only commits since `01490c3` changed nothing behavioral) |
| `node scripts/check-channel-mirror.js` standalone | **270/270** |
| `npx tsc --noEmit` | clean |
| `wrangler dev` local smoke, UNCONFIGURED | `/` 200, `/healthz` real JSON `version 13.232-channelhardening` (ok:false locally = the documented no-local-cron state), `/nope` 404, `/api/card/nope` 404, `/admin` 200, `/matches` 200, ZERO channel runtime lines (only the startup banner's `[vars]` rows), ZERO `api.telegram.org` fetches |
| `wrangler dev` local smoke, CONFIGURED (`--var TELEGRAM_CHANNEL_CHAT_ID:-1009998887776` + a test URL — the S18c/S19 dummy-id pattern; no real id exists) | routes still real, healthz sane, ZERO channel-mirror runtime lines, **ZERO `api.telegram.org` fetches without an eligible event** — the disabled-contract proof WITH a destination configured |
| Production `GET /healthz` | `version 13.232-channelhardening`, `ok:true`, outbox 0, `degraded:false`, `sched_mode PRE_MATCH` |
| Deployed `[vars]` (Workers settings API) | `TELEGRAM_CHANNEL_CHAT_ID=""`, `TELEGRAM_CHANNEL_PUBLIC_URL=""` — deployed-disabled, exactly as shipped |
| Latest deployment | `86f48d91-d917-43fd-913a-5795fe95b65e` (100%, 2026-11-07T01:21Z, from `main`@`01490c3`) — **nothing deployed since; live has NOT drifted** |
| D1 `channel_posts_v1` (remote) | **0 rows** — zero events mirrored in production, still |
| ≥2 full cron ticks | the **12:30Z tick tailed LIVE**: "Starting scheduled execution 12:30:14" → "Execution completed 12:30:27"; KV writes this tick **2** (`execution_lock` + `cron_status_v1` — the documented quiet classes, ZERO channel writes); true subrequests **7/50** (fetches 0); **zero channel/mirror log lines**. The lean **12:27 far-cup probe** also fired in the window ("added 0, scanned 0" — never notifies, by design). The **12:40Z tick** via the completion blob: `last_cron` 12:40:15, healthz `last_cron_age_min` 2 (≤10 twice across the window), `kv_writes_last_tick` 5, `subreq_last_tick` 9 |
| Completion blob `notify` | **`notify.ch = null` on every read** (the unconfigured contract), private pipeline green (`f:2` in-window matches; last processed `clubatleticodemadrid|barcelona|2026-11-08T20:00`) |
| Site + webhook | `/` 200, `/matches` 200, bare webhook GET → 403 (alive and rejecting) |

## 4) The three-state verdict (PART V §15 — never conflated)

- **code-complete: YES.** Sessions 1–3 shipped the full mirror —
  v13.230-channelbase (destination config + the D1 claim ledger),
  v13.231-channelmirror (all eligible families hooked, the Persian
  variant, the footer/CTA parity), v13.232-channelhardening (the
  transport/failure/budget matrix, the admin surfaces) — re-verified
  from the canonical tree this session at 2,888 checks green.
- **deployed-disabled: YES — and this is the CORRECT state, not a
  defect.** Live = `86f48d91` (13.232-channelhardening, 100%), both
  channel vars EMPTY, D1 claim ledger 0 rows, `notify.ch` null, the
  private pipeline untouched (f-counters green, outbox 0, site +
  webhook normal). Verified again this session.
- **live-channel-verified: NO.** The owner has not created the channel.
  No activation happened, no test post was sent, and no claim is made
  about live channel delivery. What remains is exactly the owner-side
  setup in the report below — then S21 activates and verifies.

## 5) End-of-session report (spec PART VII §17)

```text
SESSION: 4 + 20 — Channel Mirror Session 4 (production readiness + activation — owner-gated)
STATUS: partially complete — readiness verification COMPLETE; activation BLOCKED on the owner gate (by design, not by defect)
SCOPE COMPLETED:
- The mandatory reading battery + the boot gates (fetch, clean tree, bot identity, webhook health)
- The owner gate asked directly (channel URL / chat id / admin state / first-event policy) — no channel values arrived; the gate stays closed; nothing guessed, nothing enabled, no test post
- The full readiness battery re-run from the canonical tree (npm test 2,888 EXIT 0; channel-mirror 270/270; tsc clean; both local smokes incl. the dummy-id configured smoke with zero telegram fetches)
- Production re-verified deployed-disabled: healthz ok:true, vars EMPTY, deployment 86f48d91 undrifted, D1 0 rows, two full ticks (one tailed live — 2 KV writes of the documented classes, 7/50 subreq, zero channel lines) + the far-cup probe intact, notify.ch null, site+webhook 200/403
- The three-state verdict recorded honestly (§4) + the S21 activation hand-off prompt written (§6)
FILES CHANGED:
- docs/history/2026-11-07-s20-channelmirror-s4.md (this note)
- OWNER_TODO.md (the S20 bullet, Persian)
TESTS:
- npm test — EXIT 0, 2,888 OK / 0 FAIL (exactly the canonical S19 arithmetic)
- node scripts/check-channel-mirror.js standalone — 270/270
- npx tsc --noEmit — clean
- wrangler dev local smokes — unconfigured + configured(dummy -100 id): both green, zero telegram fetches without an eligible event
COMMIT:
- docs-only (this note + the OWNER_TODO S20 bullet); the SHA is recorded in the final reply and verifiable via git ls-remote — the b2c87c4 SHA-fill follow-up pattern was deliberately not spent a second commit on
PUSH:
- origin main — one-shot token push, verified with git ls-remote (see the final reply / ls-remote output)
DEPLOYMENT:
- not applicable — documentation-only session (the spec PART I rule + the S18b/S19b doctrine): zero runtime changes existed to deploy; production ALREADY IS the safe disabled state (86f48d91, vars empty — re-verified in §3), so no needless Worker deployment was made
POST-DEPLOY VERIFICATION:
- n/a for a deploy; the §3 production battery stands in: healthz ok:true, ≥2 full ticks (one tailed), blob ch:null, D1 0 rows, site+webhook 200/403
CHANNEL STATE:
- deployed-disabled — hardened; the owner gate remains closed (channel not created); zero events mirrored in production
OWNER ACTION REQUIRED (the only four things left, ~5 minutes, RUNBOOK §13.1):
- 1) create the PUBLIC Persian Telegram channel; 2) choose its public username (the https://t.me/… link); 3) add @SportSignalAlertsBot as ADMINISTRATOR with the "Post messages" permission; 4) send the link (or @username) to the next session — the numeric -100… id is optional, the non-posting getChat check resolves it from the link
RISKS / FOLLOW-UPS:
- DISCOVERY R1–R10 stand; nothing new observed this session. One standing-item re-observation: the S14 KV meter-regression class is still live (kv_writes_day read 296 → 301 → 222 → 310 across the battery window — the documented stale-fold undercount, not a channel concern; the "counter honesty" item rides the ordinary cadence)
- The three S16 product confirmations remain open (mirror the degradation alert? keep dice/cards/stickers/GIF? keep the trial footer?) — any time, DISCOVERY §12
NEXT SESSION:
- S21 — Channel Mirror ACTIVATION (only when the owner supplies the values; the complete prompt in §6)
```

## 6) Next-session prompt (S21 — activation, copy-paste ready)

```text
You are the lead engineer continuing the SportSignal Telegram Channel
Mirror program (repo: https://github.com/assadigit/sportsignal, branch
main). This is the ACTIVATION session — S21 (the Session-4 readiness
ran as S20 and closed owner-gated: TELEGRAM_CHANNEL_MIRROR_SPEC.md
PART VI Session 4 + PART V §15; DISCOVERY §7.8 is the validation
design; RUNBOOK §13 is the ops manual).

PRECONDITION (the owner gate — run this session ONLY with these in
hand): the owner has supplied (a) the public channel's https://t.me/…
URL or @username (the numeric -100… id optionally — getChat resolves it
from the username) and (b) the statement that @SportSignalAlertsBot is
administrator with the Post messages permission. If the values did NOT
arrive, stop at this line and re-run the S20 readiness battery instead
(docs/history/2026-11-07-s20-channelmirror-s4.md §3) — never fake
activation.

MANDATORY READING BEFORE ANYTHING ELSE (in this order):
1. TELEGRAM_CHANNEL_MIRROR_SPEC.md — PART VI Session 4 + PART V §15 +
   PART VIII (owner-provided values; never guess).
2. docs/telegram-channel-mirror/DISCOVERY.md — §7.8 (the non-posting
   validation), §7.6 (the failure policy), §10 (the coverage).
3. AGENTS.md + RUNBOOK.md — §1, §2 (incl. the fetch-before-DEPLOY
   line), §8, §8b, §11, §13 (setup / validation / the failure-class
   table / pause-unpause / rollback / the measured budget).
4. docs/history/2026-11-07-s20-channelmirror-s4.md (the S20 readiness
   note — the battery shape + the three-state verdict) + the S19 note
   (its §2 documents every Session-3 seam this session consumes).
5. src/channel-mirror.ts + src/telegram.ts (the chan ctx + the outbox
   dest + the drain branch) + wrangler.toml [vars].

SESSIONS 1–4 SHIPPED (v13.232-channelhardening live as 86f48d91 from
main@01490c3; deployed-disabled — both [vars] verified EMPTY; D1
channel_posts_v1 live with 0 rows; npm test 2,888 EXIT 0, 270 of them
the channel matrix; the S20 readiness battery all green at
2026-11-07T12:4xZ).

S21 SCOPE (every step gated on the previous one):
1. OWNER GATE: the channel URL/@username (+ optional -100… id) from the
   owner. Never guess; never a placeholder (spec PART VIII).
2. VALIDATION (non-posting, DISCOVERY §7.8 — one-off curls with the
   session shell's BOT_TOKEN, never a committed token):
   - getMe → the bot id (expected 8988731008, @SportSignalAlertsBot).
   - getChat(<@username or id>) → ok, result.type == "channel"; the
     response's result.id IS the numeric -100… chat id (record it —
     the preferred stable form for the var).
   - getChatMember(<id>, 8988731008) → status "administrator" AND
     can_post_messages true. If anything fails: report the exact class
     (the RUNBOOK §13.4 table predicts each — chat-not-found /
     need-administrator-rights / bot-not-a-member / dead-chat /
     bad-request-markdown), do NOT enable.
   - Sanity: the channel must be PUBLIC (a resolvable t.me/<name>
     username) and Persian/football per the owner's description.
3. ENABLE: write BOTH values into wrangler.toml [vars]
   (TELEGRAM_CHANNEL_CHAT_ID = "<-100…>", TELEGRAM_CHANNEL_PUBLIC_URL =
   "https://t.me/…") — PUBLIC values, NOT secrets (spec §9). Then the
   RUNBOOK §2 order: npm test (2,888 EXIT 0 — the parity law holds
   configured too) → the local smokes (unconfigured + THE REAL id —
   still ZERO telegram fetches without an eligible event) → git fetch
   immediately before deploy → npx wrangler deploy → verify healthz
   (version, ok:true) + the deployed vars via the Workers settings API.
4. FIRST EVENT (the spec's rule — no test post; the owner chose "wait
   for the natural event" at the S20 gate): observe ≥2 full cron ticks
   with the channel live; tail one (budgets: RUNBOOK §13.7). The first
   NATURALLY-OCCURRING eligible event must be verified end-to-end: the
   tick log (the channel send line), the D1 claim row
   (channel_posts_v1's first row — state 'sent'), the completion blob's
   notify.ch flipping from null to {s:1,…}, and the channel post itself
   owner-visible (ask the owner to look; the public t.me/s/<name>
   preview page serves as the agent-side sight check). At S20's close
   the likely first candidate was the Atlético–Barcelona pre-match-24h
   (window opening 2026-11-07T20:00Z, kickoff 2026-11-08T20:00Z) —
   re-verify against the CURRENT pool at session time, not this note.
   If a permanent class fires (RUNBOOK §13.4): diagnose via
   /api/audit's channel block + the /status section + the pause marker;
   fix; resume (markChannelResumed or the config-change path); re-
   verify.
5. THE THREE-STATE HONESTY (PART V §15): the final report states
   code-complete / deployed-enabled / live-channel-verified as
   SEPARATE states with the evidence for each. Never claim live
   verification without the first-event proof.
6. Confirm the private pipeline is untouched throughout (the f/s
   counters, outbox 0, the site 200, the webhook 403-to-GET posture).
7. End of session: write docs/history/<date>-s21-channelmirror-s5.md
   with the PART VII §17 report (CHANNEL STATE: active-and-verified, or
   the honest blocker) + refresh OWNER_TODO.md with an S21 bullet in
   Persian + print the closing summary. Git discipline: fetch first,
   never force-push, scoped commit, one-shot push, ls-remote verify.

CONSTANTS (from the owner, never committed to the repo): deploy needs
CLOUDFLARE_API_TOKEN in the shell; push needs the one-shot GitHub
token; the bot token stays in the existing secret mechanism; the
channel id/URL are PUBLIC [vars] (writable in wrangler.toml), never
secrets. No secrets/tokens in code, logs, commits, or docs — ever.

OUT OF SCOPE: any new notification family or eligibility broadening
beyond the follower-gate boundary (DISCOVERY §6), any English/other-
sport destination (spec PART IV §8), any admin UI for channel
management, any test post to the public channel without explicit owner
approval. ACCEPTANCE (spec PART VI Session 4 + PART V §15):
configuration validated non-postingly; delivery enabled only after
validation; the first naturally-occurring event verified end-to-end
(log + claim row + breadcrumb + owner-visible post); the three states
reported separately; every check green.
```

## 7) Standing watch items (carried from S15–S19, unchanged — NOT this program's work)

The RUM TRUE multi-day confirm, the KV read both layers, GSC Pages
(the owner-side crawl window), PSG–Roma hero ride (Nov 25), the epoch
guard bump (~Nov 25), G-14 December, the 4-club MVP answer, and the KV
plan question. Plus the S14 KV meter-regression "counter honesty" item
(re-observed this session, §5 — unchanged class). They ride the
ordinary session cadence; the Channel Mirror sessions do not touch them
unless the owner asks.
