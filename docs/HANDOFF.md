# HANDOFF — SportSignal

> Agents: read AGENTS.md in the repo root first, and follow it for this whole task.

## Session goal (S40, started 2026-11-09 — the owner's rank-number quieting round)

**Objective:** fix the league-standing number that OVERLAPS the club name on
the match cards, and make it low-key: a quiet plain number in the same row
as the club name — no circle, no border, no background, no icon — on the
name's center-facing side for BOTH teams, logical CSS/flex order only,
name truncates with ellipsis first, number `flex-shrink:0` never wraps,
11–12px regular tabular Persian digits, muted blue-gray ≥4.5:1 contrast
(measured), `title`+`aria-label` naming the table («رتبه ۳ در جدول لیگ
قهرمانان اروپا», fallback «رتبه ۳ در جدول»), no rank → render nothing.
Clear of the three-dot share menu. Verified at 360/768/1280px for every
card variant; before/after screenshots into `docs/assets/`.

**Milestones:** M1 recover the unpushed S39 drift (live serves
`public-13.77.js`/`13.84.css` that git lacks) + BEFORE screenshots ·
M2 the S40 implementation (client bundle + CSS + SSR twin + plumbing +
checks + docs) · M3 local QA matrix (seeded KV + agent-browser, 3 widths,
RTL/LTR, truncation, tooltip, light theme) · M4 deploy + live verify +
AFTER screenshots + handoff docs.

**Known going in:** live = v13.250-ranksup (S39: the chip became a
physical top-right superscript on the name — THIS is the overlap the owner
reports; that round was deployed but never pushed). S40 supersedes S39's
presentation entirely and numbers after it (13.251, 13.78.js, 13.85.css,
sw v124).

## Current state (after S38, v13.249-ranktip, 2026-11-09)

The S38 tooltip round is **done in code, tested, deployed and
live-verified** — see `docs/history/2026-11-09-s38-ranktip.md` for the
full record; the S37 rank-chip round before it lives in
`docs/history/2026-11-09-s37-rankchip.md`:

- Every rank chip on the match cards now explains itself on demand:
  **hover** (200ms rest) and **tap** (instant toggle) open a small dark
  bubble with the SAME localized label the badge carries as its
  accessible name — «رتبه ۶ در لیگ برتر انگلیس» / "6th in Premier
  League" — one delegated listener set + ONE shared `#rankTip` bubble,
  so the SSR badges and every client re-render are covered with zero
  per-chip wiring. Outside tap / Escape / scroll / re-render close it;
  the tap never navigates the card link.
- Assets renamed per ADR-006: public-13.75.js→13.76.js,
  public-13.82.css→13.83.css; `_headers` cap sweep #19 (the expired
  13.38.js + 13.50.css pins evicted, files on disk; still 100 rules);
  SW cache v122; heroes:sync regen; version 13.249.
- `scripts/check-team-ranks.js` grew 27 → 34 checks; `npm test` exit 0
  (2945 checks).

## Where things are

- Version: `13.249-ranktip` (package.json / src/config.ts / lockfile in sync).
- Deploy: `npx wrangler deploy` (worker `ucl-notifier`) — deployed
  2026-11-09, healthz ok, live tap+hover verified on the real payload.
- The design pack stays filed: spec `docs/specs/team-rank-indicator.md`
  (§11 = the S38 addendum), audit
  `docs/audits/2026-11-09-team-rank-indicator.md`, reference
  `docs/assets/team-rank-reference-match-cards-2026-11-09.jpg`, zip
  `docs/assets/sportsignal-team-rank-design-pack.zip`.

## Standing limits and reminders

- `_headers` sits at exactly 100 rules again — the NEXT +1 pin needs cap
  sweep #20 (next-oldest expired candidates after this round's
  13.38.js/13.50.css evictions: the JS pins 13.39.js/13.41.js, the CSS
  pins 13.51.css/13.52.css — grep check-stats first, every flip needs
  the co-evolution in the giant pins check).
- The EL/ECL rank limitation is deliberate (no new provider fetches) —
  see the S37 audit + DECISIONS before "fixing" it.
- The Telegram SVG cards (`src/card.ts`) deliberately carry NO rank chip;
  the hero/mcard surfaces stay badge-free by design.
- The tooltip's transient 4px crest kiss on desktop rows is documented
  (standard overlay semantics, pointer-transparent) — the gap-bump fix
  (10→16px) would need one more rename round; see the S38 history
  record's "Known notes".

## Next session candidates

- Continue the owner's standing SEO focus (README's WHERE TO CONTINUE note).
- If the owner asks: the tooltip gap/arrow polish round (one rename: the
  crest-clearing 16px gap + optionally a 6px arrow), rank chips on the
  Telegram SVG cards, or EL/ECL table coverage (see the S37 record).
