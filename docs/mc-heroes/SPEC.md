# mc-heroes — the standardized mobile featured-match image system

**Since v13.183-mchero.** The featured-match hero card (`.hero-mcard`, mobile)
renders player windows from ONE canonical specification. This file is the
operator runbook; the machine-checkable spec lives in
`scripts/mc-heroes/spec.json`, the single source of truth for what ships in
`scripts/mc-heroes/mc-heroes.json`, and the enforcement gate in
`scripts/check-mc-heroes.js` (part of `npm test`).

## Why this exists (the bug class it kills)

Before standardization, every new fixture's pictures were hand-cropped in an
image editor and hand-wired into `MC_ART`/`MC_GEOM`. The Bruno Fernandes bug
(v13.182): his library source was 413x464 (aspect 0.89 — wider than the
0.43-0.67 cover band), so the runtime fell back to `.mc-fit-w` contain —
smaller figure, anchored lower, hard-cut at the frame — visibly mismatched
next to Palmer. One wrong dimension anywhere in the chain produced a
mismatched pair. The fix round hand-crafted the window; this system makes
that hand-craft a one-command, self-verifying pipeline.

## The canonical spec (v13.182-mcmirror standard, decoded + machine-checkable)

Every `.mc-pre` window file:

| Constant | Value | Measured from |
|---|---|---|
| Window | **356 x 574** (aspect 0.6202 ±0.0008) | palmer/bruno |
| Crown row | **123** (21.43% of file height) | both |
| Head width | **91 px** (25.56%W — the widest opaque run in the head band, hair included) | palmer's own; bruno matched to it |
| Head center (home) | **55.6%W** (198 px — leans toward the card center) | palmer |
| Head center (away) | **44.0%W** (157 px — the mirror) | bruno |
| Figure bottom | **≥ row 534** (93% — dissolves inside the 66% fade, never floats) | all |
| Fade stop | **66%** (2.8 heads below the crown; override per pose with `--fade`) | the approved pair |
| Encoding | lossless WebP + alpha, lanczos3 | the library contract |

Both heads land 19.0cqw from the card's center axis — the symmetric mirror
pair the owner approved.

## The commands

```bash
npm run mc:measure -- assets/ui/mc/mc-port-palmer.webp   # measure any file
npm run mc:build            # (re)generate every registry file missing on disk
npm run mc:wire             # sync public.ts's MC_ART/MC_GEOM/MC_SIDE from the registry
npm run mc:check            # re-measure + verify every registry file
npm run mc:mock -- --all    # render card mocks of pairings for visual/VLM review
npm test                    # includes the mc-heroes gate (spec/round-trip/registry/wiring)
```

## Adding the next game's player (the 3-step flow)

1. **Add an entry** to `ENTRIES` in `scripts/mc-heroes/registry.js`:
   ```js
   "New Club FC": {
     kind: "canonical",
     file: "mc-port-<player>-h.webp", twin: "mc-port-<player>-a.webp",
     source: "assets/players/hero/<player>.webp",  // or a club-alternate path
     fade: 66,
     origin: "generated <date> at the v13.182 canonical spec",
   },
   ```
2. **`npm run mc:build`** — the ingest engine auto-detects the head
   (crown/chin/head width/head center from the alpha channel), scales to the
   spec, emits BOTH side variants, then **self-verifies the output**
   (dims/crown/head/cx/bottom re-measured; any breach deletes the file and
   fails). A source that can't fill the window is REJECTED with the reason
   ("source figure too short — pick a deeper shot from
   `assets/players/clubs/<league>/<club>/`") — that rejection is the guard
   that would have caught the Bruno bug before it shipped.
3. **`npm run mc:wire`** — regenerates the MC_ART / MC_GEOM / MC_SIDE /
   MC_HOME_SRC blocks in `src/pages/public.ts` (marked
   `/*MC-HEROES:AUTO-*/` — never hand-edit those), including the side-aware
   swap. Then `npm test`, bump the SW cache (`assets/sw.js`), commit.

Optional visual QA before shipping: `npm run mc:mock -- --pair "Club A,Club B"`
renders the pair at the real CSS geometry (fades included) for a VLM
"do the players match?" pass.

## How the runtime stays correct (the three locks)

1. **One code path.** Every registry file shares the exact geometry, so the
   card renders one `.mc-pre` look — no aspect-band guessing for wired clubs.
   The old classifier (`mcFitScan`'s 0.43-0.67 band + `.mc-fit-w`) remains
   ONLY as the fallback for unwired HERO_ART library clubs.
2. **Side-proof pairs.** Each club carries a home AND away variant
   (`-h`/`-a`, mirrored head centers). `MC_SIDE` + `MC_HOME_SRC` + the swap
   inside `mcFitScan` serve the right file per slot pre-load — a fixture
   flipping a club to the other side of the card can never render a head
   leaning off-center.
3. **The gate.** `npm test` re-proves on every run that (a) the pipeline
   still round-trips the approved palmer/bruno windows from their library
   sources (crown 123, head 91, cx 198/157), (b) every shipped file
   re-measures within tolerance, (c) public.ts is byte-in sync with the
   registry, (d) every MC_ART src and twin exists on disk. A non-conforming
   file cannot pass CI.

## Coverage (BIG_MATCH_TEAMS universe, 2026-10-26)

| Club | File (home) | Scale | Notes |
|---|---|---|---|
| Chelsea FC | mc-port-palmer | canonical 91px | approved v13.182, round-trip verified |
| Manchester United FC | mc-port-bruno-h | canonical | approved away file + generated home twin |
| Arsenal FC | mc-port-saka-h | canonical | NEW (pipeline-generated) |
| Manchester City FC | mc-port-haaland-h | canonical | NEW |
| FC Internazionale Milano | mc-port-lautaro-h | canonical | NEW |
| FC Bayern München | mc-port-kane-3-h | canonical | NEW — replaces the legacy kane-2 scale |
| FC Barcelona | mc-port-yamal-4 | **legacy 107px head** | source too shallow to canonicalize (391 of 420 rows); El Clasico pairs fine (both legacy) |
| Real Madrid CF | mc-port-mbappe-4 | **legacy 125px head** | same limitation |
| Tottenham Hotspur FC | art-tottenham-6 | art (34%W) | dormant — not in BIG_MATCH_TEAMS; kept + twinned |

**Unwired BIG clubs** (hero portrait too shallow / no windowable source yet —
they render the crest-only or library fallback, never a broken window):
Liverpool (Wirtz 358 rows), AC Milan (Pulisic 349), Atlético (Álvarez 370),
Dortmund (Guirassy 374), PSG (Dembélé 324). When a deeper source lands
(UEFA reshot / league platform fullBody), the 3-step flow wires them.

**Known limitation:** Barcelona/Real Madrid still ride the v13.180
legacy-scale windows (bigger heads). Cross-pairings against canonical clubs
(El Clasico vs Chelsea etc.) will show the scale difference. Re-window them
the day a deeper source for yamal/mbappe exists — `registry.js` entry change
+ `npm run mc:build`.

## Provenance & rights

Sources are the site's own portrait library (`assets/players/hero/`,
`assets/players/clubs/`) — UEFA official cutoffs and league-official
platforms, kit-verified, per `docs/scrapping/uefa-players/SPEC.md`. The
generated windows are bbox-crops of those manifest-pinned originals
(same contract as `/players/hero/`).
