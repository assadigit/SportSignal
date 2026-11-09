# HANDOFF — SportSignal

> Agents: read AGENTS.md in the repo root first, and follow it for this whole task.

## Current state (after S41, 2026-11-09 — verification-only session)

The S40 quiet-plain-number round (v13.251-ranknum) remains the live truth,
and S41 re-verified it end to end against the live site with independent
tooling — **zero code changes were needed**; see
`docs/history/2026-11-09-s41-rankverify.md` for the full record:

- The league-standing number is a quiet PLAIN NUMBER in the name's own row on
  the center-facing flank (home [name,num] / away [num,name], logical order),
  11px regular tabular Persian digits, `flex-shrink:0`; the NAME truncates
  with an ellipsis first; muted blue-gray ink (dark `#94a3b8` / light
  `#5b6b82`, the contrast gate is permanent in `check-team-ranks.js`); the
  label names the table («رتبه ۳ در جدول لیگ قهرمانان اروپا», fallback
  «رتبه ۳ در جدول»); no rank renders nothing. The S38 tap+hover tooltip
  rides along unchanged.
- S41 re-verification (all live): `npm test` exit 0 (2948 checks); 76 chips
  at 360/768/1280px in fa/RTL AND en/LTR — zero overlaps (name, logo, kick
  block, three-dot menu), zero clipped; flank order correct in both
  directions; the three longest names truncate cleanly at 360px with intact
  two-digit numbers; real-pixel dark-theme contrast worst 5.67:1 (PASS);
  VLM close-up reviews clean; console clean.

## Where things are

- Version: `13.251-ranknum` (package.json / src/config.ts / lockfile in sync).
  Live worker runs it (`/healthz` `"version":"13.251-ranknum"`, ok).
- Deploy: `npx wrangler deploy` (worker `ucl-notifier`) — last deployed by S40
  (2026-11-09); S41 deployed nothing (no code change) but verified the live
  result at 360/768/1280px.
- Design pack: spec `docs/specs/team-rank-indicator.md` (§12 = the S40
  addendum), audit `docs/audits/2026-11-09-team-rank-indicator.md`,
  screenshots `docs/assets/s40-ranknum/` (S40 before/after) and
  `docs/assets/s41-rankverify/` (S41 live re-verification set).

## Standing limits and reminders

- `_headers` sits at exactly 100 rules — the NEXT +1 pin needs cap sweep #21
  (next-oldest expired candidates: the JS pin 13.41.js, the CSS pin
  13.52.css — grep check-stats first, every flip needs the co-evolution in
  the giant pins check).
- **Light theme is unreachable code** (boot script forces `data-theme=dark`;
  no `#tbtn` in the DOM, `toggleTheme()` never bound). Its rank ink
  `#5b6b82` measures 4.45:1 real-pixel worst on the bluest glow spots —
  below the 4.5:1 bar but user-invisible; fix it only if the light theme
  ever ships (DECISIONS 2026-11-09, S41).
- **The featured-card green shimmer** (v13.66) transiently dips the number to
  ~3.4–3.8:1 while the band sweeps over it (it washes every element on those
  cards; the white names stay >7:1). Pre-existing card decoration, out of
  the rank-number's scope — left as is (DECISIONS 2026-11-09, S41).
- The EL/ECL rank limitation is deliberate (no new provider fetches) — see
  the S37 audit + DECISIONS before "fixing" it.
- The Telegram SVG cards (`src/card.ts`) deliberately carry NO rank number;
  the hero/mcard surfaces stay number-free by design.
- The recovered S39 assets (`public-13.77.js`/`13.84.css`) stay in `assets/`
  forever (retention); they ride default cache headers.

## Next session candidates

- Continue the owner's standing SEO focus (README's WHERE TO CONTINUE note).
- If the owner asks: rank numbers on the Telegram SVG cards, or EL/ECL table
  coverage (see the S37 record), or the tooltip polish round noted in S38
  (the 16px crest-clearing gap).
