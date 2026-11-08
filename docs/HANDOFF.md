# HANDOFF — SportSignal

> Agents: read AGENTS.md in the repo root first, and follow it for this whole task.

## Current state (after S34, v13.245-arrowcta, 2026-11-08)

The S34 owner round is **done in code, tested and deployed** — see
`docs/history/2026-11-08-s34-arrowcta.md` for the full record:

- The pill heading carries the owner's GROWN sentence
  «عضو کانالمون شو تا بازیهای مهم رو از دست ندی!» (14px/800, at most
  TWO lines via `-webkit-line-clamp:2`; EN mirror "Join our channel so
  you never miss the big matches!", explicit `dir` on both spans).
- A sky-blue curved SVG ARROW (`.tgp-arrow`) rides between the pill
  body and the blue mark, NUDGING toward the mark (1.35s infinite,
  translateX+opacity only); `html[dir="ltr"]` mirrors it for EN.
- The blue Telegram mark grew 46 → 58px (glyph 27 → 34px).
- Memory key re-keyed `sp_pill_joined3` → `sp_pill_joined4` (one-shot
  reset: S33-era tap verdicts are ignored once).
- Everything else from S33 rides unchanged (grass surface, five-line
  rotator, no-dismiss ADR-007, 74px body, 20% scroll gate).

## Where things are

- Version: `13.245-arrowcta` (package.json / src/config.ts / lockfile in sync).
- `npm test` exit 0 (2907 checks) as of the S34 close.
- Deploy: `npx wrangler deploy` (worker `ucl-notifier`, assets+worker together).

## Standing limits and reminders

- Desktop (≥601px) stays frozen except owner-named items; the pill is
  phones-only (`<=600px`), same as S30-S33.
- `_headers` is at exactly 100 rules — the NEXT +1 rule needs cap
  sweep #18 (evict the next expired pin; remember check-stats pins
  most old JS pins as required — grep before evicting).
- The pill rotation's EN lines (and now the EN heading mirror) are the
  sessions' own translations; the owner has not reviewed them.
- The legacy `#joinSticky` markup stays but never shows live (its
  observer target `#bigHeroCard` is a 0-height anchor) — do not
  "fix" it without asking; the owner has not reported anything.

## Next session candidates

- Nothing pending from S34. If the owner wants the arrow restyled
  (colour/size/curvature), the glyph lives inline in
  `src/pages/public.ts` (search `tgp-arrow`); keep the nudge on the
  inner `g.tgp-ain` — the root svg carries the LTR mirror.
