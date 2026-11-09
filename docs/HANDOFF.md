# HANDOFF — SportSignal

> Agents: read AGENTS.md in the repo root first, and follow it for this whole task.

## Current state (after S40, v13.251-ranknum, 2026-11-09)

The S40 quieting round is **done in code, tested, deployed and
live-verified** — see `docs/history/2026-11-09-s40-ranknum.md` for the
full record; the S38/S37 rounds before it live in
`docs/history/2026-11-09-s38-ranktip.md` / `s37-rankchip.md`:

- The league-standing number no longer overlaps the club name (the
  never-pushed S39 superscript was the root cause — recovered and
  superseded). It is now a quiet PLAIN NUMBER in the name's own row on
  the center-facing flank (home [name,num] / away [num,name], logical
  order), 11px regular tabular Persian digits, `flex-shrink:0`; the NAME
  truncates with an ellipsis first; a measured ≥4.5:1 muted blue-gray
  ink (dark #94a3b8 / light #5b6b82 — the contrast is a permanent gate
  in `check-team-ranks.js`); the label names the table («رتبه ۳ در جدول
  لیگ قهرمانان اروپا», fallback «رتبه ۳ در جدول»); no rank renders
  nothing. The S38 tap+hover tooltip rides along unchanged.
- Assets renamed per ADR-006: public-13.76.js→13.78.js,
  public-13.83.css→13.85.css (13.77/13.84 were the unpushed S39 names —
  those files are recovered into `assets/` as retention copies);
  `_headers` cap sweep #20 (the expired 13.39.js + 13.51.css pins
  evicted, files on disk; still 100 rules); SW cache v124; heroes:sync
  regen; version 13.251. `npm test` exit 0 (2948 checks,
  check-team-ranks 36).

## Where things are

- Version: `13.251-ranknum` (package.json / src/config.ts / lockfile in sync).
- Deploy: `npx wrangler deploy` (worker `ucl-notifier`) — deployed
  2026-11-09 (version 5e50aec9), healthz ok, live-verified at 360/768/
  1280px (zero overlaps, clean ellipsis truncation on the longest names,
  tooltip live-tapped).
- The design pack stays filed: spec `docs/specs/team-rank-indicator.md`
  (§12 = the S40 addendum), audit
  `docs/audits/2026-11-09-team-rank-indicator.md`, screenshots
  `docs/assets/s40-ranknum/` (before ×4, after-local ×6, after-live ×4).

## Standing limits and reminders

- `_headers` sits at exactly 100 rules again — the NEXT +1 pin needs cap
  sweep #21 (next-oldest expired candidates after this round's
  13.39.js/13.51.css evictions: the JS pin 13.41.js, the CSS pin
  13.52.css — grep check-stats first, every flip needs the co-evolution
  in the giant pins check).
- The EL/ECL rank limitation is deliberate (no new provider fetches) —
  see the S37 audit + DECISIONS before "fixing" it.
- The Telegram SVG cards (`src/card.ts`) deliberately carry NO rank
  number; the hero/mcard surfaces stay number-free by design.
- The recovered S39 assets (`public-13.77.js`/`13.84.css`) stay in
  `assets/` forever (retention); they ride default cache headers.

## Next session candidates

- Continue the owner's standing SEO focus (README's WHERE TO CONTINUE note).
- If the owner asks: rank numbers on the Telegram SVG cards, or EL/ECL
  table coverage (see the S37 record), or the tooltip polish round noted
  in S38 (the 16px crest-clearing gap).
