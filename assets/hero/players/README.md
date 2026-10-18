# Future Hero Player Artwork Directory

This directory is reserved for future generated player cutouts. **Do not add
or generate player images during the current Hero implementation task.**

When the artwork phase is approved, create one canonical transparent PNG for
each supported team, depicting one approved representative player from that
team. The selected player should face the camera, with a clearly visible
face and a mostly front-facing upper body. Each team's artwork may use a
different confident, natural pose from the shared pose library below.

- Source canvas: **1024 × 1536 px** (portrait 2:3)
- Format: PNG with true alpha transparency
- One player, no background, no UI, no watermark, and no invented readable
  badge/sponsor text
- Same cinematic art direction, lighting family, subject scale, and crop
  across the catalog
- Different `poseId` values across teams when practical; avoid identical
  poses for both teams in a featured matchup where possible
- **Do not create left-facing/right-facing variants and do not mirror the
  image in CSS.** The same front-facing artwork can be placed on either
  side of the Hero.

## Pose library (`poseId`)

| `poseId` | Description |
|---|---|
| `arms-crossed` | confident, calm |
| `hand-on-chest` | subtle badge-area gesture (no real crest needed) |
| `one-hand-raised` | restrained greeting |
| `hands-on-hips` | assertive stance |
| `fist-near-chest` | subtle celebration |
| `relaxed-ready` | arms relaxed, focused expression |

## Naming + integration contract

- Stable filename based on the provider team name slug,
  e.g. `fc-barcelona.png`, `fc-bayern-munchen.png` (sanitized, never a
  localized display name).
- Runtime integration: the homepage's client script (`assets/public-*.js`)
  exposes the `HERO_ART` lookup at the top of the hero builders —

  ```js
  var HERO_ART = {
    // "FC Barcelona": { src: "/assets/hero/players/fc-barcelona.png",
    //                   alt: "", poseId: "arms-crossed" },
  };
  ```

  A team is looked up by its exact provider name (or `faName` fallback).
  An EMPTY mapping is the valid default: the `.hero-art` layer only
  renders when both/one side resolves (no reserved blank space, no broken
  `<img>`, and the Hero is visually complete without any artwork).
- `poseId` lives in this mapping only (catalog metadata for auditing pose
  variety); the runtime never depends on it.
- Artwork is decorative (`aria-hidden`), anchored to the outer edges of the
  Hero on desktop (>900px), hidden on narrower viewports, and never
  horizontally mirrored.
