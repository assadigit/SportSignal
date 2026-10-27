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
     kind: "canonical",          // or "legacy-scale" + head: <px> when the
                                  // source is too shallow for 91px (every
                                  // figure must still reach the 534 fade floor)
     file: "mc-port-<player>-h.webp", twin: "mc-port-<player>-a.webp",
     source: "assets/players/hero/<player>.webp",  // or a club-alternate path
     fade: 66,                    // just below the figure's measured crest
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

## Coverage (BIG_MATCH_TEAMS universe, 2026-10-27)

| Club | File (home) | Scale | Notes |
|---|---|---|---|
| Chelsea FC | mc-port-palmer | canonical 91px | approved v13.182, round-trip verified |
| Manchester United FC | mc-port-bruno-h | canonical | approved away file + generated home twin |
| Arsenal FC | mc-port-saka-h | canonical | pipeline-generated |
| Manchester City FC | mc-port-haaland-h | canonical | pipeline-generated |
| FC Internazionale Milano | mc-port-lautaro-h | canonical | pipeline-generated |
| FC Bayern München | mc-port-kane-3-h | canonical | replaces the legacy kane-2 scale |
| **Liverpool FC** | **mc-port-barcola-h** | **canonical 91px** | v13.184: Barcola (the UCL-roster Liverpool rep) — the ONE Liverpool source deep enough for a true 91px window (460-row figure at a 95px head, downscale 0.96x); fade 62 (crest bottom ~60%H) |
| **AC Milan** | **mc-port-pulisic-h** | **legacy-scale 111px** | v13.184: Milan is outside the 2026/27 UCL roster — the club library is the photo home; Pulisic is the manifest's active rep; fade 72 (crest bottom ~70%H) |
| **Club Atlético de Madrid** | **mc-port-alvarez-h** | **legacy-scale 104px** | v13.184: Álvarez (UCL-roster rep); fade 66 (crest bottom ~63-65%H) |
| **Borussia Dortmund** | **mc-port-guirassy-2-h** | **canonical 91px** | v13.185: Guirassy RE-WINDOWED at the true canonical spec from the official Bundesliga full-body PNG (`serhou-guirassy-fullbody.webp`, 780×960 transparent, dfl-obj-00278s — VLM-verified front-facing photo, arms crossed); fade 68 (grid-VLM crest bottom 66%); replaces the v13.184 back-view legacy-scale 103px window (guirassy-h/-a stay on disk, immutable-pin) |
| **Paris Saint-Germain FC** | **mc-port-dembele-h** | **legacy-scale 119px** | v13.184: Dembélé (UCL-roster rep, Ballon d'Or-era star); fade 63 (crest bottom ~61-62%H); his pointing arm dissolves into the by-design center blend |
| FC Barcelona | mc-port-yamal-4 | **legacy 107px head** | v13.187: the laliga.com full-body hunt CLOSED — no windowable source exists (see the La Liga depth note); stays legacy |
| Real Madrid CF | mc-port-mbappe-4 | **legacy 125px head** | v13.187: same closure — no windowable source (334 of 420 rows) |
| Tottenham Hotspur FC | art-tottenham-6 | art (34%W) | dormant — not in BIG_MATCH_TEAMS; kept + twinned |

**Every BIG_MATCH_TEAMS + PSG club is wired** (v13.184 — the owner's
"no crest-only big clubs" directive: all desired clubs carry BOTH the club
logo in the crest slots and player windows). Liverpool and Dortmund are
CANONICAL (v13.184 / v13.185); Milan/Atlético/PSG ride legacy-scale heads at
111/104/119px — each SMALLER than the shipped yamal-4 (36.1%W) / mbappe-4
(40.1%W) legacy heads, and every one is a DOWNSCALE of its source (no
upscale, crisp). Cross-pairings legacy-vs-canonical show the scale
difference (the same known limitation as Barcelona/Real Madrid below).
**The Bundesliga depth note (v13.185):** the club library's Bundesliga
alternates are 0.42 top-crops of official 780×960 full-body PNGs — the
depth the mc window needs is IN the originals on `assets.bundesliga.com`.
Any legacy-scale Bundesliga club upgrades the same way Dortmund did: fetch
the body PNG (the §8b accessor pattern), publish it as
`<player>-fullbody.webp` in the club folder, flip the registry entry to
`kind: "canonical"` with new immutable file names, `mc:build` + `mc:wire`.

**The La Liga depth note (v13.187) — the path does NOT reproduce, checked
and closed with evidence.** The Bundesliga upgrade was attempted for
Barcelona (Yamal) + Real Madrid (Mbappé) on 2026-10-27 and stopped at the
source hunt: **laliga.com has no full-body player PNGs.** The evidence:

1. **The photo system is waist-up.** The laliga.com player pages (title-
   verified `Lamine Yamal Nasraoui Ebana LALIGA EA SPORTS | LALIGA`,
   `en-GB/player/kylian-mbappe-lottin`) expose a `photos` object with four
   variants under `assets.laliga.com/squad/2026/t{team}/p{player}/{size}/
   p{player}_t{team}_2026_{series}_{variant}_000.png`: **004** (the known
   EA-FC card render), **001** (the "tall" 1024×1113 / 2048×2225
   transparent PNG), **002** (JPG), **003** (square 2048×2048 transparent
   PNG). A URL-space probe (series 0–3 × variants 000–006) found exactly
   ONE unlisted extra — series-0 variant 001 — another waist-up pose.
   Five images per player, all waist-up or renders. There is no
   `/player/*-body.png` family (404 on every Bundesliga-style pattern).
2. **The geometry deficit.** The deepest available figure (Yamal s1v1,
   2048×2225, head 539px) spans **4.06 head-widths below the crown = 369
   output rows at the 91px canonical head — 51 rows short of the 420-row
   floor** (`min_figure_span_out_rows`). Mbappé: 3.1–3.9 heads = 283–354
   rows. The control: the official Bundesliga full-body PNG spans
   **5.26 heads = 479 rows** — that is what a windowable source looks
   like. The current library sources (391/334 rows) remain the BEST
   available for both clubs — the La Liga tall PNGs are strictly worse.
3. **Hard cuts, not natural ends.** Both tall variants end at the image
   bottom with full-opacity runs (alpha-255, 853/1176px wide at the final
   row) — the figure is cropped mid-jersey (VLM bottom-strip read:
   "cropped horizontally through the lower part of the striped jersey" /
   "through the lower torso and waist"). The Bundesliga original's feet
   run to its bottom edge naturally.
4. **Style + identity pass, depth fails.** The tall variants ARE real
   front-facing photos of the right players in club kit, no overlays
   (Yamal: high-confidence identity read; Mbappé: same-person verdict vs
   the kit-verified library source — the "Vinícius/Trent" first guesses
   were appearance-only misfires, the documented v13.185 class). They
   would pass every Dortmund-style gate EXCEPT the depth guard — which
   exists precisely so a waist-up cutout is never forced into a window
   it cannot fill (the >1.6x no-upscale rule's sibling).

Per the v13.187 brief: **Barcelona/Real Madrid keep their legacy windows,
the registry entries stay untouched, and no La Liga asset ships.** The day
laliga.com starts serving true full-body cutouts (or a deeper league-
official source appears), re-run the hunt from this note's URL pattern —
the Dortmund runbook then applies unchanged.

**Known limitation:** Barcelona/Real Madrid still ride the v13.180
legacy-scale windows (bigger heads). Cross-pairings against canonical clubs
(El Clasico vs Chelsea etc.) will show the scale difference. Re-window them
the day a deeper source for yamal/mbappe exists — `registry.js` entry change
+ `npm run mc:build`. (v13.187 update: the laliga.com hunt is CHECKED and
CLOSED — see the La Liga depth note above; laliga.com serves waist-up
cutouts only, so the legacy windows remain the best available treatment
until a genuine full-body source appears.)

## Provenance & rights

Sources are the site's own portrait library (`assets/players/hero/`,
`assets/players/clubs/`) — UEFA official cutoffs and league-official
platforms, kit-verified, per `docs/scrapping/uefa-players/SPEC.md`. The
generated windows are bbox-crops of those manifest-pinned originals
(same contract as `/players/hero/`). The Dortmund full-body original
(v13.185) is the league-official `assets.bundesliga.com` body PNG,
page-title-verified on the player's own Bundesliga profile, archived
uncropped as `serhou-guirassy-fullbody.webp`.
