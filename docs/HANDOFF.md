# HANDOFF — SportSignal

> Agents: read AGENTS.md in the repo root first, and follow it for this whole task.

## Current state (after S35, v13.246-fullbar, 2026-11-08)

The S35 owner round is **done in code, tested and deployed** — see
`docs/history/2026-11-08-s35-fullbar.md` for the full record:

- The S34 nudging arrow is RETIRED outright (markup, CSS, keyframes,
  reduced-motion kill).
- The sticky bar is now FULL-WIDTH edge-to-edge: `bottom:0` +
  `inset-inline:0`, 16px top corners, square bottom corners flush at
  the screen edge; the height grows to
  `calc(74px + env(safe-area-inset-bottom,0px))` so the grass fills
  the iPhone home-indicator strip.
- The 58px blue Telegram mark rides `position:absolute` ON the grass
  at the inline end (no transparent seam at the screen edge); the
  text lane is reserved by `padding-inline-end:84px`.
- The heading is the owner's reworded sentence «با عضویت در کانال،
  بازی مهم بعدی رو از دست نده!» (EN mirror "Join the channel and
  don't miss the next big match!") — now matching the top promo
  bar's headline word-for-word.
- Memory key re-keyed `sp_pill_joined4` → `sp_pill_joined5`
  (one-shot reset: S34-era tap verdicts are ignored once).
- Everything else from S33/S34 rides unchanged (grass surface,
  five-line rotator, no-dismiss ADR-007, 74px body, 20% scroll
  gate, 58px mark + 34px glyph).

## Where things are

- Version: `13.247-cyanglow` (package.json / src/config.ts / lockfile in sync).
- `npm test` exit 0 (2908 checks) as of the S36 close.
- Deploy: `npx wrangler deploy` (worker `ucl-notifier`, assets+worker together).

## Standing limits and reminders

- Desktop (≥601px) stays frozen except owner-named items; the bar is
  phones-only (`<=600px`), same as S30-S34.
- `_headers` is at exactly 100 rules — the NEXT +1 rule needs cap
  sweep #18 (evict the next expired pin; remember check-stats pins
  most old JS pins as required — grep before evicting).
- The bar rotation's EN lines (and the EN heading mirror) are the
  sessions' own translations; the owner has not reviewed them.
- The legacy `#joinSticky` markup stays but never shows live (its
  observer target `#bigHeroCard` is a 0-height anchor) — do not
  "fix" it without asking; the owner has not reported anything.

## Next session candidates

- Nothing pending from S35. If the owner wants the bar taller, the
  geometry lives in the `#tgPill` rule in `src/pages/public.ts`
  (search `tgpPill{`); the 74px content zone + safe-area law is
  pinned by the v13.246 check in `scripts/check-stats.js`.
