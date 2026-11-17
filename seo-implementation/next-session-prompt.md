# SportSignal — Next-Session Prompt (the Telegram alerts track continues: S20; the SEO follow-up track's page-level verification rides the 00:20 UTC job)

Read AGENTS.md in the repo root first and follow it for the whole session.

## State at the S19 close (2026-11-17)

- The SEO follow-up track (S16-S18) is COMPLETE in code + deployed; the
  page-level live verification was BLOCKED by the Nov 17 KV read-quota
  exhaustion and rides the re-scheduled one-time job at
  **2026-11-18T00:20 UTC** (the original schedule was found missing from
  the scheduler during S19 and re-created). That job verifies `/healthz
  ok:true` + the FAQPage/editorial cards on the live team/competition/match
  pages and makes the `seo(s17-verify)` docs commit if all passes — check
  its result FIRST next session; if it failed, fix THAT before anything
  else.
- The Telegram alerts track opened with **S19 (the live goal alerts)** —
  DONE in code + deployed + version-verified live (`13.272.0-goalert`,
  deployment `7c54e223…` @100%): goal events from REAL score deltas in the
  LIVE sweep (the KV snapshot `goal_snapshots_v1` + the delta law:
  MISSING-IS-NOT-ZERO, first-sighting seeds, fail-closed provider gaps),
  the per-goal D1 claim `goal:<h>-<a>` in `notified_v1`, the EITHER-side
  team-follow fan-out through the existing transport (cache-only cards,
  Persian-first «گُل!» composition, the 6-unit/tick cap). Red-card alerts
  are SCOPED OUT (no incident source — DECISIONS S19-3). The session
  report: `docs/history/2026-11-17-s19-goalalerts.md`; the audit:
  `docs/audits/2026-11-17-goal-alerts-audit.md`.
- **The first natural live goal alert lands Nov 20+** (the international
  break runs through Nov 19; Bayern–Köln Friday Nov 20 19:30 UTC opens the
  window — ALSO the no-deploy M1/M2 windows). After that match: check D1
  `notified_v1` for `goal:*` rows + `notify_deliveries_v1` verdicts — the
  first production evidence of the layer.

## S20 (the next alerts session) — the preview, pick per owner priority

1. **The per-match subscription UX** — `/follow match <slug>` +
   deep-links (`t.me/SportSignalAlertsBot?start=match_…`); the audience
   model extends `userFollowsMatch` with a per-chat match-subscription
   store (D1, the user-store seam). This is the S19 brief's deferred
   Task 19-2 optional.
2. **The channel goal posts** — mirror the goal alerts to
   @SportSignalz (the claim-key shape extends `channelEventKeyMatch` with
   the tuple; DISCOVERY §7 discipline; DECISIONS S19-5).
3. **The scorer enrichment** — scorer names/minutes from the sportscore
   per-event detail the website already fetches (a per-match extra
   fetch — a budget decision; never invented, S19-5).
4. **Alert pacing / quiet-hours preferences** (the S20 preview item).
5. **Red-card alerts ONLY IF a real incident source is actually wired**
   (a new audit first; otherwise it stays scoped out — DECISIONS S19-3).

## Standing constraints (unchanged)

npm only; `npm test` exit 0 before every push (baseline **3,841 OK**);
versioned deploys only; the free-tier budget statement (KV reads
100k/day — the chronic exhaustion; KV writes 1,000/day; the 10ms CPU
cliff; ~50 subrequests/tick); the Dec 4-8 freeze holds; **no deploys in
the Nov 20 Bayern–Köln windows (M1 ~19:35 UTC, M2 ~21:35-45 UTC)**; no
secrets in commits; the commit convention for the alerts track follows
the bot/channel `v13.NNN-<tag>` form (the S19 precedent).

## Credentials

Credentials used across S14-S19, not stored. The owner supplies fresh
tokens per session; the 00:20 UTC job needs the current ones until it
completes.
