# DECISIONS — decision history (add only, never rewrite)

Format: date · decision · options considered · reason · who · revisit when.
(Adopted with the universal AGENTS.md rules on 2026-11-08; this file is new —
earlier decisions live in README §"Architecture decisions" and docs/adr/.)

## 2026-11-09 — Team rank badge placement: beside the name, outer flank (S37)

- **Decision:** the rank chip sits immediately beside the team NAME (never on
  the crest), on the name's outer flank (between name and crest), as
  `[badge, name]` on home `.team` and `[name, badge]` on away `.team` with
  logical `justify-content` — direction-agnostic for RTL/LTR, and centered as
  a group under the crest on the mobile stacked layout.
- **Options:** (a) outer flank of the name (chosen), (b) inner flank toward
  the kickoff column (spec forbids: "do not let it drift toward the central
  time/date area"), (c) beside the crest (spec's default warning: crowded).
- **Reason:** the spec's "outer side of the team's area" resolves to the crest
  side in this 3-column layout; hugging the name keeps the identity-row law
  ("name and badge read as one compact row"). Decided by the agent per the
  design pack; revisit if the owner dislikes the crest-adjacent slot.

## 2026-11-09 — Rank resolution reuses appendTableOrPhase's applicability law (S37)

- **Decision:** a badge shows only when the code is not a domestic cup, the
  stage is NOT in the explicit KO-only set (PLAYOFF_ROUND/ROUND_OF_16/32/
  QUARTER_FINAL(S)/SEMI_FINAL(S)/FINAL/THIRD_PLACE — STAGE_EN's vocabulary),
  and the code has a LIVE (non `started:false`) table in `stMap` — the bot's
  `appendTableOrPhase` law, corrected to an explicit set: `faStageName`'s
  STAGE_FA also carries LEAGUE_STAGE/LEAGUE_PHASE display labels, and league-
  phase fixtures MUST rank (spec §4). CL league-phase positions show; CL
  KO-stage rows and all domestic cups hide.
- **Options:** (a) reuse the bot's stage gate (chosen), (b) also parse
  `roundRaw` for sportscore KO rows, (c) show CL league-phase rank on KO rows
  as "final league-phase standing".
- **Reason:** one rule for both surfaces; the repo's own semantics (README
  "do not assume … the repository is the source of truth"). (b) would diverge
  from the bot; (c) risks ambiguity a bare number cannot carry. Revisit if
  the owner asks for KO-phase ranks.

## 2026-11-09 — The rank tooltip content reuses the accessible-name string, competition name included (S38)

- **Decision:** the tooltip shows the exact localized label the badge
  already carries as `aria-label` — «رتبه ۳ در لیگ برتر انگلیس» /
  "3rd in Premier League" — i.e., the owner's requested pattern («رتبه در
  پریمیرلیگ») WITH the rank digit and the site-standard competition name
  (the payload's `faName`: لیگ برتر انگلیس، لیگ قهرمانان اروپا، …), not a
  new short-form dictionary.
- **Options:** (a) reuse the aria-label string (chosen), (b) the owner's
  literal short form without the digit («رتبه در لیگ برتر انگلیس»), (c) a
  bespoke per-competition nickname map (پریمیرلیگ، …).
- **Reason:** one string = one translation surface, already S37-tested in
  both languages; the digit makes the bubble self-contained; (c) adds a
  second naming of every competition the site already names one way.
  Decided by the agent; revisit if the owner prefers the short form.

## 2026-11-09 — One delegated listener set + one shared bubble; tap beats the card link (S38)

- **Decision:** hover (200ms rest) + tap (instant toggle, outside
  tap/Escape/scroll to close) ride ONE document-level delegated listener
  set (capture-phase click, the sharewrap-closer precedent) and ONE reused
  `#rankTip` bubble in `body`. Tapping the badge `preventDefault()`s the
  card-link navigation (the tooltip IS the tap's purpose; the card body
  still navigates). `(hover: none)` devices skip the hover path so the
  tap-emulated mouseover never double-fires. The chip gains no
  `tabindex` — ~60 badges would flood the tab order; screen-reader a11y
  stays on `aria-label` + `aria-describedby` while visible.
- **Options:** (a) delegated + shared bubble (chosen), (b) per-chip
  listeners + inline bubble per badge (rebind on every re-render/lang
  switch, ~120 extra nodes), (c) native `title` only (invisible on touch —
  the owner's exact complaint).
- **Reason:** delegation survives the poll re-renders and language flips
  for free; a single fixed-position bubble is trivially viewport-clamped
  in both directions. Decided by the agent.
