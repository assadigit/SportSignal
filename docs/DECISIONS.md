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

## 2026-11-09 — The unpushed S39 round (v13.250-ranksup): recover the static assets as retention files, supersede the rest (S40)

- **Decision:** live serves `public-13.77.js` + `public-13.84.css` + sw v123
  from an S39 session ("ranksup": the chip parked as a physical top-right
  superscript on the `.tn` name box — `top:-8px;right:-8px`, the exact
  overlap the owner then reported) that was **deployed but never pushed**.
  S40 recovers the two asset files verbatim from the live server into
  `assets/` (the retention rule: stale SW-v123-cached clients keep
  referencing them, so every future deploy must keep serving them), numbers
  the new round AFTER the deployed one (13.251, 13.78.js, 13.85.css, sw
  v124), and lets the S40 markup/style completely replace S39's
  presentation. No attempt is made to reconstruct S39's worker-side source
  or its `_headers`/check-script state (unrecoverable — the deployed worker
  bundle and headers are not introspectable byte-for-byte; a fake
  "faithful" recovery would be guesswork and would break `npm test` at that
  commit).
- **Options:** (a) recover static assets + supersede (chosen), (b) full S39
  reconstruction commit then S40 on top (rejected: worker source and
  headers unrecoverable, checks would fail at that commit), (c) ignore the
  drift and number S40 as 13.250 (rejected: version would go backwards on
  `/api/status` and the live 13.77.js/13.84.css names would collide with
  new content).
- **Reason:** the retention files are the only live-only artifacts that must
  survive future deploys; everything else S39 touched is overwritten by the
  owner's new directive anyway. Decided by the agent; documented per
  AGENTS.md §2.2 ("pick up where the last session stopped").
- **Revisit:** none needed — S40 deploys over it; rollback path is
  `git revert` of S40 (repo state 13.249 + retention files, a
  live-verified look).

## 2026-11-09 — The rank number rides the name's CENTER-FACING flank as a plain text span (S40)

- **Decision:** the standing renders as a quiet plain number (no circle,
  border, background or icon) in the name's own flex row — home
  `[name,num]` / away `[num,name]` in logical DOM order — so it sits on
  the side of the name facing the card's center for both teams in both
  directions with zero physical left/right CSS. The name (`.tn`) gains
  nowrap+ellipsis; the number is `flex-shrink:0`, never wraps.
- **Options:** (a) center-facing plain number (chosen, the owner's
  directive), (b) keep the S37 outer-flank slot as a plain number
  (rejected: the owner explicitly asked for the center-facing side), (c)
  repair the S39 superscript (rejected: the owner asked for the same-row
  treatment, and the superscript's overhang is what collided with the
  name and the share menu).
- **Reason:** supersedes the 2026-11-09 outer-flank decision (S37) and
  the never-pushed S39 superscript; the plain span needs no positioning
  context at all, so the overlap class of bugs is structurally gone.
  Decided by the owner; recorded by the agent.

## 2026-11-09 — The rank label names the table; the fallback keeps the digit (S40)

- **Decision:** `title`/`aria-label`/`data-tip` read «رتبه N در جدول
  <competition>» ("Nth in <competition> table"); when the fixture carries
  no competition object the label falls back to «رتبه N در جدول» /
  "Nth in the table" — the digit STAYS in the fallback (the owner's
  example pattern «رتبه ۳ در جدول لیگ قهرمانان اروپا» includes it, and
  the visible number is self-explanatory only with the table context).
- **Options:** (a) digit in the fallback (chosen), (b) the owner's
  literal fallback words without the digit («رتبه در جدول») — the tooltip
  would then name neither the rank nor the table it belongs to.
- **Reason:** one string shape in both renderers; the S38 tooltip shows
  the same label. Decided by the agent (safe reading of the owner's
  fallback wording); revisit if the owner prefers the digit-less form.

## 2026-11-09 — The rank ink: dark #94a3b8, light #5b6b82 — measured, gated (S40)

- **Decision:** the number's muted blue-gray ink is `#94a3b8` (dark
  theme, the site's own `--muted` value as a dedicated `--rank-chip-ink`
  token) and `#5b6b82` (light theme — one step darker than the light
  `--muted` `#64748b`, which measures 4.44:1 on the light row composite
  and fails the owner's ≥4.5:1 bar). The WCAG ratios are recomputed from
  the live stylesheet tokens on every `npm test` run (check-team-ranks.js
  §5b), compositing page bg (+glow worst case) → `.card` glass → row
  surface.
- **Options:** (a) dedicated token pair with the gate (chosen), (b)
  `var(--muted)` per theme (rejected: fails in light), (c) the S39
  72%-alpha whisper ink (rejected: ~3.4:1, fails).
- **Reason:** the owner set a measurable bar; the gate keeps it measured.
  Decided by the agent.
