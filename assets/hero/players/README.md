# Hero Player Artwork — the real contract (v13.121-portraits)

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
  margin ≥901px so the pop clears the sync line). Bottom fade: mask over
  the first 16% of the box. `heroArt()`'s layer query resolves the card
  scope first, then falls back to `.herowrap .hero-art` (the moved layer).

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
