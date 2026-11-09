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
