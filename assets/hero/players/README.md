# Hero Player Artwork — the real contract (v13.121-portraits, updated v13.130)

> **v13.131-playerpresence update:** `HERO_ART` now serves **alpha-trimmed
> canvases** from the NEW directory `assets/players/hero/<slug>.webp`
> (served at `/players/hero/<slug>.webp`). These are bbox-crops of the
> manifest-pinned `assets/players/uefa/<slug>.webp` originals (same
> players, same initial-UEFA bytes — the sha256 freeze in
> `scripts/check-stats.js` still pins the `/players/uefa/` files).
> Rationale: the 512×512 square canvases wasted up to half of the narrow
> player lane on transparent margins; the trimmed canvases let the figure
> fill the lane at the v13.130 size (78% height) so the club jersey reads
> clearly. Regeneration: re-crop from the uefa originals after any
> `portraits:normalize` run (alpha-bbox + 2px pad, lossless webp).
> The `/players/uefa/` collection below remains the provenance source
> of truth.

> **Superseded contract (v13.120-hero era, obsolete):** this directory was
> reserved for *generated* player cutouts — one 1024 × 1536 (2:3) transparent
> PNG per team from a shared `poseId` pose library. **No such images were ever
> created.** The hero phase shipped with `HERO_ART` empty by design, and the
> generated-PNG contract is retired. This README now documents the contract
> that actually shipped.

## 1. Where the artwork comes from

The hero's player artwork is the **official UEFA cutoff portrait collection**
landed in commit `44e9906` (2026-10-18):

- Assets: `assets/players/uefa/<player-slug>.webp` · served at
  `/players/uefa/<player-slug>.webp` (worker `[assets]`).
- Pipeline + provenance: `scripts/uefa-player-portraits/` —
  `assets/players/uefa/manifest.json` records per portrait: canonical UEFA
  profile URL, image URL, retrieval date, SHA-256, normalization record.
  Full docs: `docs/assets/uefa-player-portraits.md`.
- Collection status: **34 of 36 complete** (the 2026/27 UCL 36-club roster,
  one representative player each). Two deferred by owner decision
  2026-10-18 — Nicolas Jackson (Aston Villa) and Florian Thauvin (Lens):
  UEFA publishes no transparent cutout for either. Re-check mid-season:
  `node scripts/uefa-player-portraits/cli.js fetch --refresh` then
  `npm run portraits:normalize && npm run portraits:validate`.
- Hero coverage: **`HERO_ART` ships 33 of the 34** — the one kit-mismatch
  portrait is excluded (owner decision 2026-10-18: no kit mismatch allowed;
  see §3). Every shipped portrait was visually kit-verified 2026-10-18.

| Property | Value |
|---|---|
| Format | WebP, **lossless**, alpha transparency |
| Canvas | **512 × 512 px** (square — NOT the retired 2:3 portrait canvas) |
| Background | fully transparent |
| Framing | shared content box, horizontally centred, bottom baseline |
| Filenames | stable ASCII kebab-case **player** slugs (`ousmane-dembele.webp`) — never derived from club names |

## 2. Runtime integration (`HERO_ART` in `assets/public-*.js`)

The homepage's client script exposes the `HERO_ART` lookup at the top of the
hero builders — `heroArtFor()` resolves a team, `heroArt()` fills the two
flank `<img>` slots of the static `.hero-art` layer and toggles `.has`.

- **Keys are the exact football-data.org provider team names** as they arrive
  on the match rows (`e.name`; `e.faName` is the lookup fallback) — e.g.
  `"Paris Saint-Germain FC"`, `"FC Barcelona"`, `"Club Atlético de Madrid"`.
  FD is the first-priority provider in the pool merge, so a followed-club
  fixture carries the FD spelling. Cross-check names against
  `CONFIG.BIG_TEAMS_BY_LEAGUE` / `src/match-classify.ts`.
- Entry shape: `{ src, alt }` — `src` points at `/players/uefa/<slug>.webp`,
  `alt` is `""` (the layer is decorative, `aria-hidden="true"`).
- `poseId` is **dropped** — a pose catalog is meaningless for real
  photographs; no runtime code ever read it.
- An EMPTY mapping is a valid state: the `.hero-art` layer only renders when
  one/both sides resolve. Unmapped teams keep the crest-only look (no
  reserved blank space, no broken `<img>` element, no CLS — the layer is
  absolutely positioned and reserves nothing).
- Artwork is anchored to the outer edges of the hero on desktop (>900px),
  hidden on narrower viewports, and **never horizontally mirrored** (same
  photo can sit on either flank).
- **v13.122-heroart geometry (the owner's reference mockup, 2026-10-19):**
  the `.hero-art` layer is a **`.herowrap` sibling of the card** (not a
  child — the card's `overflow:hidden` would clip the breakout), painted at
  `z-index:2`: in front of the card shell, below the `z:3` data surface.
  Figures are **full-height flanks** — `height:112%` of the card
  (901–1439px) / `122%` (≥1440px), bottom anchored at the card's bottom
  edge, 1% inset from the outer edges — so each head pops **slightly above
  the card's top edge** (the 3D breakout; `herowrap` carries a 46px top
  margin ≥901px so the pop clears the sync line). `heroArt()`'s layer query
  resolves the card scope first, then falls back to `.herowrap .hero-art`
  (the moved layer).
- **v13.123-fadepill bottom crossfade (owner ask, 2026-10-19):** the jersey
  end **crossfades into the card** (premium melt) via a per-portrait
  `data-fade` tier rendered from an optional `fade` field on the `HERO_ART`
  entry:
  - *default* (31 entries + the uniform-bottom ones): eased mask
    `0 → .34@7% → .7@15% → 1@26%` up from the box bottom — bright kit
    melts through its last ~60px into the stage floor.
  - *`fade:"hi"`* (`lamine-yamal` — his white shorts end ~89% of the box
    with only dark legs below; the owner flagged him looking "stray"):
    the shorts fade out over their OWN height `0 → .06@5% → .16@11% →
    .8@17% → 1@27%` — top of the shorts at 80% strength, mid at ~48%,
    their bottom edge at 16% (a ≤20-lum step vs the card) — the white
    dims away before the portrait's own edge, no crop line.
  - *`fade:"deep"`* (`veljko-simic` — bright kit ends ~70%, everything
    below is near-invisible against the dark stage): ramp completes by
    40% up so the visible torso sinks into shadow instead of cropping at
    the shirt hem.
  Tier assignment is measured, not guessed: bottom-region luminance scan
  of all 34 portraits (scripts/…/alpha analysis, 2026-10-19) — only Yamal
  (step 106 @ 88%) and Šimić (bright ends 69.5%) needed custom tiers;
  Baumgartner's mild step (75 @ 93%) already dissolves under the default
  ramp. Adding a portrait: run the same scan; a uniform bright-to-bottom
  figure needs no `fade` field.

## 3. Kit verification (2026-10-18, owner rule: no kit mismatch allowed)

All 34 portraits were visually audited against the 2026/27 kits of their
`HERO_ART` club keys (crest, manufacturer, shirt sponsor, colours —
 cross-checked against kit archives/club announcements). Result: **exactly
one kit mismatch**.

| Team (FD name) | Portrait | Finding |
|---|---|---|
| `"Lille OSC"` | `ayase-ueda.webp` | **EXCLUDED** — shows his **Feyenoord** kit (30–31 Aug 2026 transfer to Lille confirmed; UEFA had not reshot him). Crest-only fallback for Lille until UEFA publishes a Lille cutoff |
| `"ŠK Slovan Bratislava"` | `andraz-sporar.webp` | **KEPT** — the manifest's earlier "Olimpija kit" warning was a false alarm: the portrait is a genuine Slovan kit (royal blue, adidas, `niké je tipovanie`, double-cross-on-three-hills crest; Olimpija wear green/white Puma). His July 2026 Olimpija transfer is real, but his UCL registration and this cutoff remain Slovan. Manifest + identity-evidence corrected 2026-10-18 |

Re-add Lille when UEFA reshots Ueda: `cli.js fetch --refresh` + kit
re-verification, then restore the one-line `HERO_ART` entry (33→34) and
update the pin count in `scripts/check-stats.js`.

## 4. Rights (the standing constraint)

`docs/assets/uefa-player-portraits.md` §7: **redistribution permission is NOT
established** — UEFA is the source, the manifest carries full provenance, and
the repository's source-code licence does NOT apply to these images. Any
change to how prominently they are displayed needs an explicit owner decision;
the empty-mapping fallback is always available and is a designed, tested state.


## v13.126-herolook addendum (2026-10-19)

The rendering geometry changed with the desired-look hero: the figures now
ride as section-level `.hero-player` zones flanking the glass card (heads
above its top edge, bodies crossing its side edges; one CSS rule covers the
whole collection — every portrait shares the uniform 460px alpha band, see
public-13.29.css). The COLLECTION contract above is unchanged: same files,
same manifest, same kit-audit rules. `heroArt()` still applies the optional
per-portrait `data-fade` tier from HERO_ART (the new design uses a single
bottom-fade mask, so the tiers ride as data only).
