# 2026-11-07/08 — S19b: the SECOND Session-3 deployment race (incident note + the canonical S19's independent re-verification)

> **What this note is:** the honest record of a SECOND concurrent-session
> race on the Channel Mirror program — this time on Session 3 — its
> detection, and the independent re-verification of the canonical S19 from
> a fresh checkout. It is deliberately SHORT and additive, the S18b
> precedent: the canonical Session-3 report is
> `docs/history/2026-11-07-s19-channelmirror-s3.md` (commit `01490c3`,
> pushed + `b2c87c4` for the report's SHA fill-in). No runtime code
> changed in this note's commit; no deploy is needed (documentation-only —
> the RUNBOOK §2 doctrine).

## 1) The timeline (UTC, from git + the deployment record)

| When | What |
|---|---|
| 00:0x | this session cloned `main` at `c0a325c` (the S18c close) and began implementing Session 3 — in parallel with the agent that produced the canonical S19 |
| ~00:5x | this session's implementation (`13.232-channelhard`, npm test 2,895 EXIT 0 on its own tree, both local smokes green) reached its pre-commit review |
| 01:21:06 | **the canonical S19 deployed live** (`86f48d91`, `13.232-channelhardening`) |
| ~01:2x | the canonical S19 committed + pushed (`01490c3` feat, `b2c87c4` docs) |
| ~03:0x | **the race detected — at the pre-commit `git fetch`** (the AGENTS hard rule), BEFORE this session's commit, push or ANY deploy: `HEAD..FETCH_HEAD` = the canonical S19. The S18b lesson (formalized into RUNBOOK §2 by the canonical S19 itself) worked exactly as designed — this time the stale clone never reached `npx wrangler deploy` |
| ~03:0x–03:3x | this session: preserved its implementation (`git stash` + a 2,283-line patch extracted to the sandbox — never pushed, never deployed), checked out the canonical `main`, and re-ran the full verification battery below |

## 2) Production impact: NONE (by construction, this time)

The racing implementation was **never pushed and never deployed** — the
S18b failure mode (a stale-clone deploy drifting live off `main`) was
prevented by the fetch discipline at the exact step it was missing last
time. During the whole window production ran only the canonical builds
(`13.231-channelmirror` → `13.232-channelhardening`), both
disabled-by-default, with the channel vars verified EMPTY throughout.

## 3) The independent re-verification of the canonical S19 (all green, re-run this session from the canonical tree `b2c87c4`)

| Check | Result |
|---|---|
| `npm test` (the canonical tree, as checked out) | **EXIT 0, 2,888 OK / 0 FAIL** — exactly the canonical S19 report's number |
| `node scripts/check-channel-mirror.js` standalone | **270/270** |
| `npx tsc --noEmit` | clean |
| Production `GET /healthz` | `version 13.232-channelhardening`, `ok:true`, outbox 0, `degraded:false`, subreq quiet-profile |
| Deployed `[vars]` (Workers settings API) | `TELEGRAM_CHANNEL_CHAT_ID=""`, `TELEGRAM_CHANNEL_PUBLIC_URL=""` — deployed-disabled, exactly as shipped |
| Latest deployment | `86f48d91` (100%, 2026-11-07T01:21Z, from `main`@`01490c3`) — nothing deployed since; this note is docs-only |
| ≥2 full cron ticks | `last_cron_age` 7 → 7 (≤10 twice+); `kv_writes_day` advancing at the quiet cadence |
| Completion blob `cron_status_v1` | `kv_writes_last_tick` 2 (quiet: `execution_lock` + `cron_status_v1`), `subreq_last_tick` 28–29, **`notify.ch = null`** (the unconfigured contract) |
| Tailed one full tick (the 03:30Z scheduled event, captured live) | "Execution completed"; KV writes this tick: **2** (the documented classes, ZERO channel writes); true subrequests 29/50 (fetches 0); **zero channel/mirror log lines** across the tail window |
| D1 `channel_posts_v1` (remote) | **0 rows** — zero events mirrored in production, still |
| Site + webhook | `/` 200, `/matches` 200, bare webhook GET → 403 (alive and rejecting) |

## 4) The racing implementation (never pushed — the record)

A second, independently derived Session 3 (`13.232-channelhard`, distinct
codename suffix) exists only in this session's sandbox: `git stash
stash@{0}` + the extracted patch (2,283 lines). Its independently
converging design choices worth recording for any future comparison
(both implementations hit the same walls from the same spec):

- the same outbox `dest` additive-field precedent, but with
  `{k: destKey, e: eventKey}` field names and a **registered
  channel-drain hook** (`setChannelDrainHook`) instead of the canonical
  seam — two independent solutions to the same layering constraint
  (telegram.ts must stay channel-agnostic; the repo's import graph is
  deliberately acyclic);
- the same `classifyTelegramFailure` fingerprint table, but THREE
  permanent pause classes (dead-chat / need-admin / not-a-member) where
  the canonical ships FIVE (adding chat-not-found and bad-request-markdown
  as pause classes) — a genuine design divergence the owner may want to
  rule on someday (the canonical's is live; the racing tree's
  bad-markdown-is-payload-not-destination reading is preserved in the
  stash if ever revisited);
- the same 30-minute stuck-claim grace, report-only, repair declined;
- the same budget fixtures (5 scenarios × configured/unconfigured) with
  converging measurements (match-night 5–6 events / 13 D1 / ~7–9
  fetches; the ≤2-KV standings-snapshot correction the canonical
  documented appeared in the racing tree's runs too).

## 5) Standing state after this note

- `main` = the canonical S19 (`01490c3` + `b2c87c4`) + this note.
- Live = `86f48d91` from `main`@`01490c3`; channel vars EMPTY in
  production → **CHANNEL STATE: configured-disabled — hardened, zero
  events mirrored in production.**
- The racing implementation (`13.232-channelhard`) exists only in this
  session's sandbox (stash + extracted patch); it is NOT in the repo and
  NOT live — the S18b disposition, applied one step earlier.
- **Session 4 proceeds from the canonical S19's hand-off** (the complete
  prompt in `2026-11-07-s19-channelmirror-s3.md` §4): production
  readiness + activation — the owner-gated config validation, the first
  naturally-occurring event verification, the three-state honesty.

## 6) The lesson, one line (unchanged from S18b, now proven)

`git fetch` before EVERY publish-shaped action — commit-review, push and
deploy — catches the race at whichever boundary it approaches first.
S18b caught it at the push (40 minutes too late for the deploy); S19b
caught it at the pre-commit fetch, before any production surface was
touched. The RUNBOOK §2 line the canonical S19 shipped is the standing
rule.
