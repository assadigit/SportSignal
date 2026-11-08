# HANDOFF — SportSignal

> Agents: read AGENTS.md in the repo root first, and follow it for this whole task.

## Current state (after S33, v13.244-grasspill, 2026-11-08)

The S33 owner round is **done in code, tested and deployed** — see
`docs/history/2026-11-08-s33-grasspill.md` for the full record:

- The mobile floating pill now carries the owner's grass photograph
  (`assets/bg-sticky-bottom-mobile-grass.jpg`, day-fresh cache rule)
  melted into the green surface with edge fading (`.tgp-bg`/`.tgp-fade`).
- The pill text is the fixed heading «عضو کانالمون شو» over the FIVE
  owner-worded rotating sub-headlines (3.2s, fade+rise+de-blur).
- The x close is REPLACED by the blue glowing Telegram mark
  (`#tgPillGo`); the pill has NO dismiss (ADR-007); memory key
  `sp_pill_joined3` (30-day silence after any channel tap).
- The repo root tidy-up rode the `chore/tidy-root` branch (PR merged):
  loose root screenshots/spec zips live in `docs/assets/` now.

## Where things are

- Version: `13.244-grasspill` (package.json / src/config.ts / lockfile in sync).
- `npm test` exit 0 (2906 checks) as of the S33 close.
- Deploy: `npx wrangler deploy` (worker `ucl-notifier`, assets+worker together).

## Standing limits and reminders

- Desktop (≥601px) stays frozen except owner-named items; the pill is
  phones-only (`<=600px`), same as S30-S32.
- `_headers` is at exactly 100 rules — the NEXT +1 rule needs cap
  sweep #18 (evict the next expired pin; remember check-stats pins
  most old JS pins as required — grep before evicting).
- The pill rotation's EN lines are the session's own translations;
  the owner has not reviewed them.
- The legacy `#joinSticky` markup stays but never shows live (its
  observer target `#bigHeroCard` is a 0-height anchor) — do not
  "fix" it without asking; the owner has not reported anything.

## Next session candidates

- Nothing pending from S33. If the owner wants the EN sub-headline
  wording changed or a dismiss path back, see the rollback notes in
  ADR-007 and the history file above.
