# S41 — the S40 re-verification round (no code change)

> Agents: read AGENTS.md in the repo root first, and follow it for this whole task.

**Date:** 2026-11-09 · **Status:** Done and verified live (verification-only
session — zero code changes) · **Spec:** `docs/specs/team-rank-indicator.md` §12

## Why this session exists

The owner re-sent the S40 directive verbatim ("Fix the league-standing number
that overlaps the club name … make it low-key … quiet plain number in the
same row as the club name"). The repo and the live site already carry the S40
implementation (v13.251-ranknum, pushed + deployed + live-verified by the S40
session). Per AGENTS.md honesty rules this session did NOT trust the S40
record: it re-ran the full verification from scratch, against the live site,
with independent tooling. **Everything passed. No fix was needed.**

## What was re-verified (all against https://sportsignal.ir live)

- **Deploy state:** `GET /healthz` → `"version":"13.251-ranknum"`, ok, not
  degraded. The homepage serves `public-13.78.js` + `public-13.85.css` (the
  S40 assets) with the SSR `rankchip` spans already in the HTML.
- **Offline gates:** fresh `npm install` + `npm test` → exit 0, **2948 OK
  checks**, including `check-team-ranks.js` (36 checks: flank order, labels
  in both renderers, plain-number stylesheet contract, and the permanent
  modeled contrast gate — dark 6.58/6.32:1, light 5.06/4.94:1, all ≥4.5:1).
- **Overlap sweep (agent-browser, live, DOM rects):** 76 chips (62 spot + 6
  featured green-border + 8 list rows) at **360 / 768 / 1280px in BOTH fa/RTL
  and en/LTR** → **zero overlaps** with the name box, the logo, the central
  `.kick` time block and the three-dot `.sharewrap` menu; zero clipped.
- **Flank order:** logical DOM order home `[name,num]` / away `[num,name]`
  (38/38 sides), visually center-facing in RTL **and** LTR (76/76, zero
  violations) — logical order only, no physical left/right anywhere.
- **Truncation:** at 360px exactly the three longest names on the page
  (منچستریونایتد، اسپورتینگ لیسبون، بروسیا مونشن‌گلادباخ) truncate with a
  clean ellipsis while their numbers stay intact; 29 two-digit Persian ranks
  (۱۴/۱۷/۱۸/۲۰…) never move, wrap or clip.
- **No-rank rule:** 78 team slots on the page, 76 chips → the 2 rank-less
  teams render the plain `.team` markup, zero empty elements.
- **Styles (computed on live):** 11px, weight 400, `tabular-nums`, ink
  `#94a3b8` (dark) — plain text, no circle/border/background.
- **Accessibility:** `title` + `aria-label` + `data-tip` name the table
  («رتبه ۶ در جدول لیگ برتر انگلیس» live sample; EN: "6th in Premier League
  table").
- **Real-pixel contrast (new measurement, sharper than S40's):** sampled the
  background directly above/below each chip inside the team row, across 5
  animation frames × 2 themes: **dark static worst 5.67:1 — PASS** (the
  reachable theme; boot script forces `data-theme=dark` on every load).
- **VLM visual review** of the featured-card close-up and the mobile cards
  close-up: no collisions, plain quiet numbers, clean ellipsis, nothing
  clipped.
- Console: zero errors during the whole session.

## Two known notes discovered by the sharper measurement (documented, deliberate non-changes)

1. **Light theme (unreachable) measures 4.45:1 worst** (vs the 4.5:1 bar) on
   the bluest glow spots — but the light theme is dead code for users: the
   page boot script hard-codes `data-theme="dark"`, `#tbtn` is not in the
   DOM and `toggleTheme()` is never bound. Recorded in DECISIONS.md: fix the
   light ink (one tone darker, e.g. `#52637c` ≈ 4.9:1 vs the worst measured
   surface) ONLY if/when the light theme ever ships.
2. **The featured cards' pre-existing green shimmer** (v13.66-flatglow,
   `--feat-tint`/`--feat-glow` + the animated `::before` band) transiently
   dips the number's effective contrast to ~3.4–3.8:1 for the fraction of a
   second the band sweeps over it. It washes over EVERY content element on
   those 6 cards (the white club names dip too, staying >7:1), predates this
   feature, and is card decoration outside this task's scope ("do not change
   card layout, colors or content outside this number"). Left as is.

## Evidence filed

`docs/assets/s41-rankverify/` — 8 live screenshots (full page + card area at
360/768/1280px, plus two close-ups: the featured green-border card and the
mobile card stack). The S40 before/after sets remain in
`docs/assets/s40-ranknum/`.

## What changed in the repo

Documentation only: this record, the HANDOFF rewrite, a CHANGELOG entry, and
two DECISIONS entries (the two known notes above). No worker, asset, or code
change — nothing to deploy; the live site already runs the verified fix.
