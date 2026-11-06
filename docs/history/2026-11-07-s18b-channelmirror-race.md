# 2026-11-06/07 — S18b: the Session-2 deployment race (incident note + the live restoration)

> **What this note is:** the honest record of a concurrent-session race on
> the Channel Mirror Session 2, its detection, and the restoration of the
> live worker to `main`. It is deliberately SHORT and additive — the
> canonical Session-2 report is
> `docs/history/2026-11-07-s18-channelmirror-s2.md` (commit `917947a`).
> No runtime code changed in this note's commit; no deploy was needed
> (documentation-only — the RUNBOOK §2 doctrine).

## 1) The timeline (all UTC, from `wrangler deployments list` + git)

| When | What |
|---|---|
| 20:39 | S17 close (`293477a`) — the Session-1 foundation both sessions built on |
| ~21:47 | a second Session-2 agent cloned `main` at `293477a` (this sandbox) and began implementing — in parallel with the agent that produced the canonical S18 |
| 21:57:48 | the canonical S18 deployed live (`e97f281c`, `13.231-channelmirror`) |
| 22:35–22:38 | the canonical S18 committed + pushed to `main` (`a082450` feat, `917947a` docs/report/Session-3 hand-off) |
| 22:42:20 | **the race artifact:** the parallel agent (working from its pre-push clone, suite green at 2,780 on its own implementation `13.231-channelhooks`) deployed `6bb7e9ab` — live drifted off `main` for ~51 minutes |
| ~23:10 | the parallel agent's pre-push `git fetch` (the AGENTS hard rule) surfaced the moved remote → it STOPPED before any push (never force-pushed, never overwrote the canonical work) |
| 23:33:11 | **the restoration:** redeploy from `main`@`917947a` (`0996fced`, `13.231-channelmirror`) — live === `main` again |

## 2) Production impact: NONE (verified, not assumed)

- Both implementations are **disabled-by-default** (both `[vars]` empty
  throughout) with structurally identical zero-op gates — the drift was a
  code/version divergence, not a behavioral one. During the whole window:
  - `https://sportsignal.ir/healthz` stayed `ok:true` at every sampled
    instant (both versions), ticks completed on cadence, and the per-tick
    KV writes stayed at the documented quiet classes (+2..+3/tick:
    `execution_lock` + `cron_status_v1` + occasional overlay/rotation).
  - **D1 `channel_posts_v1`: 0 rows** across the entire window (verified
    post-restoration) — no channel claim was ever made by either version;
    **zero channel-mirror log lines** in a tailed tick; zero telegram
    fetches in the local dummy-id smoke.
- The site (`/`, `/matches`) and the webhook (403 to bare GETs — the
  documented posture) answered normally throughout.

## 3) The restoration procedure (what the parallel agent did)

1. `git fetch <remote> main` before ANY push — the AGENTS.md hard rule —
   which surfaced `HEAD..FETCH_HEAD` = the canonical S18.
2. Preserved its own uncommitted implementation (`git stash`, kept in the
   sandbox for the session's life; a 1,925-line patch was extracted). It
   was **never pushed** — pushing a second, divergent Session 2 on top of
   the canonical one would have forked the program's history; the
   canonical S18 (2,818 checks green, re-verified from a clean checkout)
   stands.
3. Checked out `917947a`, re-ran the full suite from that tree
   (**EXIT 0, 2,818 OK — exactly the S18 report's number**), then
   `npx wrangler deploy` → `0996fced`.
4. Post-restoration verification: healthz `ok:true` /
   `version 13.231-channelmirror`; **two full ticks** with
   `last_cron_age ≤ 10` twice (2 → 1) and the normal write cadence; the
   site + webhook 200/403 as documented.

## 4) The lesson (one line, now part of the operating discipline)

The RUNBOOK's fetch-first rule was obeyed at PUSH time and caught the
race — but the DEPLOY had already happened 40 minutes earlier. **A
long-running session must `git fetch` immediately before `npx wrangler
deploy` too**, not only before the push: deploy from a stale clone is a
silent overwrite of whatever the repo (and any concurrent session) shipped
in between. (Added to the standing watch items below; a RUNBOOK §2 line
is a Session-3-adjacent docs edit if the owner wants it formalized.)

## 5) Standing state after this note

- `main` = the canonical S18 (`917947a`) + this note.
- Live = `0996fced` from `main`@`917947a` (this note is docs-only and
  intentionally NOT deployed — `npx wrangler deploy` is unnecessary for a
  documentation-only commit, per the spec's PART I rule).
- The parallel implementation (`13.231-channelhooks`) exists only in the
  racing session's sandbox (stash + extracted patch); it is NOT in the
  repo and NOT live. If the owner ever wants to compare the two
  implementations, the racing session's log carries the full design
  (same spec, same DISCOVERY, independently derived — including a
  weekly-burst budget-ordering analysis that both implementations
  converged on from opposite directions).
- **Session 3 proceeds from the canonical S18's hand-off** (the prompt in
  `2026-11-07-s18-channelmirror-s2.md`): the outbox `dest` field + drain
  update, stuck-claim reconciliation, pause classification end-to-end
  with failure injection, the admin `/status` channel section +
  `/api/audit` extension, the RUNBOOK channel-ops section, and the
  budget re-measure.
