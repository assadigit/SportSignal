# UEFA Player Portrait Collection

Generated assets: `assets/players/uefa/` · Public URL prefix: `/players/uefa/`
Pipeline: `scripts/uefa-player-portraits/` · This document: `docs/assets/uefa-player-portraits.md`

Status: **34 of 36 portraits complete; 2 deferred by owner decision
(2026-10-18)** — Nicolas Jackson and Florian Thauvin: UEFA publishes no
transparent cutout for either player; see
[Deferred entries](#deferred-entries).

---

## 1. What this is

A reproducible pipeline that collects the official UEFA player cutout
portraits for a fixed 36-player roster (see `uefa-player-portraits.spec.md`
at the repository root), verifies each player's identity against their
canonical UEFA profile, and normalises every accepted portrait to one common
canvas:

| Property | Value |
|---|---|
| Format | WebP, **lossless**, alpha transparency |
| Canvas | **512 × 512 px** (identical for all portraits) |
| Background | fully transparent |
| Framing | visible subject (alpha ≥ 8) scaled-to-fit a 460.8 px content box (≈5 % padding), horizontally centred, subject bottom aligned to the shared baseline |
| Scaling | downscale-only (lanczos3); **never upscaled**, never stretched, no cropping of meaningful content |
| Filenames | stable ASCII kebab-case from the roster (`ousmane-dembele.webp` … `andraz-sporar.webp`) |
| Provenance | `assets/players/uefa/manifest.json` — one entry per requested player, including failures |

Source images are the transparent `cutoff` WebP assets UEFA serves from
`https://img.uefa.com/imgml/TP/players/1/{assetSeason}/cutoff/{playerId}.webp`,
discovered from each player's own `www.uefa.com` profile page (asset season
`2027` = the 2026/27 season). Original downloads are preserved unchanged in
the gitignored cache `.cache/uefa-player-portraits/originals/`.

## 2. Commands

```bash
# full workflow (discover -> fetch -> normalize -> validate -> contact sheet)
npm run portraits

# individual stages
npm run portraits:discover        # resolve identities + candidates (no assets published)
npm run portraits:fetch           # download verified originals to the cache
npm run portraits:normalize       # produce final portraits + manifest.json
npm run portraits:validate        # verify everything; exit 1 on any unresolved entry
npm run portraits:contact-sheet   # rebuild docs/assets/uefa-player-portraits-contact-sheet.png

# single player troubleshooting / explicit refresh
node scripts/uefa-player-portraits/cli.js discover --player pedrinho
node scripts/uefa-player-portraits/cli.js fetch --player luis-suarez-colombia --refresh

# offline test gate (no network; also part of `npm test`)
node scripts/check-uefa-portraits.js
```

`fetch` and `discover` reuse validated cached data; `--refresh` re-downloads.

## 3. Method (how the pipeline works)

1. **Discover** — For each roster player the pipeline loads the UEFA squad
   page of the labelled club (`https://www.uefa.com/<competition>/clubs/<club>/squad/`,
   UCL context first, then UEL/UECL as fallbacks), matches the player by
   name (accent/punctuation-safe normalisation, known aliases, compact
   hyphenation matching — e.g. UEFA lists Kanté as `n-golo-kante`), then
   fetches the matched player's canonical profile and parses name, club,
   country, date of birth, position and the transparent cutoff image URL.
   Player IDs are **only** ever taken from squad-page links — the pipeline
   never enumerates numeric IDs.
2. **Identity verification** — the UEFA profile must expose a readable name
   and DOB. The DOB is compared against the roster's identity hints:
   exact match, or a variance of ≤ 400 days is treated as a data-entry
   difference between sources (recorded as a warning + externally
   corroborated); a larger gap stays a hard ambiguity. Namesake cases
   (Luis Suárez COL vs URU; the spec-flaged Pedrinho) are additionally
   resolved with recorded external evidence in
   `scripts/uefa-player-portraits/identity-evidence.json`.
   During the initial run every portrait was also reviewed visually (see
   §5) — kit colours/crests/sponsors cross-checked against the labelled
   club.
3. **Fetch** — only the cutoff candidate of the player's own profile is
   accepted. When a profile exposes no cutoff, the known cutoff URL pattern
   is probed with a small documented season set (2027, 2026, 2025 — plus
   historical seasons where a player's UEFA history justified it). Every
   download is validated by content type, magic bytes, successful decoding,
   alpha presence, plausible dimensions and non-placeholder content, then
   written atomically and logged with SHA-256 for idempotent reruns.
4. **Normalise** — alpha-threshold subject detection (threshold 8, with a
   row/column density trim that ignores isolated near-transparent noise),
   uniform scale-to-fit inside the 5 % content box, horizontal centring,
   bottom-baseline placement, lanczos3 downscale, lossless WebP output.
   Sources smaller than the content box are placed **without upscaling**
   and flagged (none occurred in this collection: all 34 sources are
   1080 × 1080).
5. **Validate** — roster integrity, file presence, per-image decoding
   (512 × 512, WebP, alpha), aspect-ratio preservation, no-upscale proof,
   provenance hosts, unique player IDs, duplicate-hash detection, manifest
   completeness. **Exits non-zero if any entry is unresolved or any check
   fails.** Documented exception: entries deferred by an explicit owner
   decision (status `deferred` + a manifest deferral record) are accepted as
   known-incomplete and reported as a note (currently: 34 complete +
   2 deferred → exit 0).

## 4. Transport (network access)

Default (`UEFA_FETCH_TRANSPORT=auto`, the default) fetches UEFA directly.
Some network vantage points (e.g. datacenter IP ranges) are refused by
UEFA's CDN edge (Akamai HTTP 403 "Access Denied"). For those, the pipeline
falls back to a **scoped relay worker** deployed on this repository's own
Cloudflare account:

- Worker name: `uefa-image-relay-temp`
- Source: `scripts/uefa-player-portraits/relay-worker.js` (exact deployed copy)
- Scope: `GET https://img.uefa.com/imgml/TP/players/**` and
  `GET https://www.uefa.com/<ucl|uel|uecl>/clubs/**` only — not an open proxy;
  manual redirects; honest `SportSignalPortraitPipeline/1.0` User-Agent;
  no credentials stored or forwarded.
- Configuration: `UEFA_RELAY_BASE=https://uefa-image-relay-temp.sportsignal.workers.dev`
  (already the documented value for re-runs from restricted networks).

Politeness: one request at a time, ≥ 1.1 s between requests to the same
host, explicit timeouts (30 s), bounded redirects (3, each hop validated
against the allowlist), 10 MB download cap, at most three retries with
exponential backoff + jitter, `Retry-After` honoured, 404 = missing
candidate (no retry), access-denied responses stop all automated requests
on that transport and are reported.

The manifest records `download_transport` per entry (`direct` or `relay`);
`source_image_url` is always the official UEFA URL.

## 5. Review findings (initial run, 2026-10-18)

- **All 34 accepted portraits**: 1080 × 1080 source, transparent, kit
  consistent with the labelled club (Dembélé-PSG, Yamal-Barcelona,
  Saka-Arsenal, Kane-Bayern, Guirassy-Dortmund, McTominay-Napoli (EA7),
  Adeniran-LASK (black/white stripes), Simić-Sabah (Bank Respublika
  sponsor), Tripić-Viking (Lyse sponsor), Osimhen-Galatasaray, …).
- **Unexpected kits (2, documented in manifest warnings)**:
  - `ayase-ueda.webp` — shows his **Feyenoord** kit (UEFA had not reshot
    him after his 30 Aug 2026 transfer to Lille).
  - `andraz-sporar.webp` — shows an **NK Olimpija Ljubljana** kit (July
    2026 free transfer) while his UEFA squad registration/profile still
    lists ŠK Slovan Bratislava.
- **DOB data-entry variances (3, all resolved in UEFA's favour by external
  evidence)**: Mbappé (UEFA 20/12/1998 ✓), Baumgartner (1/8/1999 ✓),
  Berg (24/11/1997 ✓) — the roster hints were wrong, UEFA was right.
- **Face/head scale**: all subjects fill the same content-box height and
  share the bottom baseline (verified programmatically). Head sizes still
  vary because UEFA's source crops differ (tight head-and-shoulders vs
  wider waist-up poses). This is the documented limitation of
  bbox-normalisation; per-player `framing-overrides.json` exists
  (currently empty) if a specific adjustment is ever wanted — any entry
  there must document a `reason` and cannot upscale.
- **No placeholders, no wrong identities, no opaque backgrounds, no
  clipped heads** were found in the 34 accepted assets (visual review of
  every portrait + the contact sheet; see acceptance checks in
  `scripts/check-uefa-portraits.js`).

## 6. Deferred entries

| Player | Status | Evidence |
|---|---|---|
| Nicolas Jackson (#3) | `deferred` (owner decision 2026-10-18) — no transparent UEFA cutout exists | Profile (Aston Villa, UCL 2026/27) shows only an opaque 324×324 JPG avatar with `fallback-image="generic-head"`. Cutoff URL pattern probed for seasons 2023–2027 across the observed competition segments (UCL `1`, UEL `14`, UECL `2019`): all 404. Other competition-context profile pages return generic shells. |
| Florian Thauvin (#19) | `deferred` (owner decision 2026-10-18) — no transparent UEFA cutout exists | Same pattern (Lens profile, opaque avatar only; cutoffs 404 for all probed seasons 2021–2027). |

Per the specification (§8) the pipeline does **not** mix opaque photos with
transparent cutouts and does **not** perform background removal without an
explicit user decision. **Owner decision (2026-10-18): defer both players**
rather than substitute the players, use the low-resolution opaque photos, or
perform background removal. The decision is recorded per entry in the
manifest (`deferral` record: `decided_at` + `reason`), and `validate` accepts
it as a documented known-incomplete outcome. If UEFA later publishes cutouts
for these players (assets sometimes appear during the season), re-run
`npm run portraits:fetch --refresh` and the entries return to `complete` on
the next run.

## 7. Rights and usage

- Source: **UEFA** — official `www.uefa.com` player profiles and
  `img.uefa.com` cutoff assets. Retrieval date per entry: `fetched_at`.
- UEFA.com footer: "© 1998-2026 UEFA. All rights reserved. The UEFA word,
  the UEFA logo and all marks related to UEFA competitions, are protected
  by trademarks and/or copyright of UEFA. No use for commercial purposes
  may be made of such trademarks. Use of UEFA.com signifies your agreement
  to the Terms and Conditions and Privacy Policy."
- **Redistribution permission is NOT established.** Public availability of
  the portraits does not grant redistribution rights. These assets are
  stored for internal use by the SportSignal project; before any public
  redistribution (website, bot, social), permission must be sought from
  UEFA or the assets removed. Do not apply the repository's source-code
  licence to these images.
- The manifest records profile URL, image URL, retrieval date and SHA-256
  per portrait for full provenance.

## 7b. The hero MVP collection (roster-heroes.json)

A second collection shares this asset library: one star player per club of
the big-5 leagues 2026/27 (96 clubs, `scripts/uefa-player-portraits/roster-heroes.json`),
published as `manifest-heroes.json` plus the club → portrait map
`hero-clubs.json` (the contract for the hero frontend). Its full
specification, runbook and the recorded failure catalogue live in
**`docs/scrapping/uefa-players/`** (README + SPEC v2 + INSTRUCTIONS).
Status (2026-10-18): 26 complete, 23 verified no-asset (documented probe
evidence), 47 research-pending; `npm run portraits:heroes` re-runs it.

## 8. Repository layout

```
assets/players/uefa/                 # published portraits + manifest.json (served at /players/uefa/)
scripts/uefa-player-portraits/
  roster.json                        # the 36-player input roster (authoritative order + labels)
  identity-evidence.json             # recorded external corroboration (namesakes, DOB variances, kits)
  framing-overrides.json             # optional documented per-player framing overrides (empty)
  relay-worker.js                    # scoped Cloudflare Worker used from restricted networks
  fixtures/                          # offline test fixtures
  lib/{config,transport,parse,images}.js
  discover.js fetch.js normalize.js validate.js cli.js
scripts/check-uefa-portraits.js      # offline test gate (part of npm test)
docs/assets/uefa-player-portraits-contact-sheet.png
.cache/uefa-player-portraits/        # gitignored: originals/, discovery.json, fetch-log.json
```

## 9. Regenerating / updating

Re-running `npm run portraits` reuses the cached originals and is
idempotent (identical output hashes). To pick up newly published UEFA
assets (e.g. if cutouts appear for Jackson/Thauvin, or kits are reshot):

```bash
node scripts/uefa-player-portraits/cli.js fetch --refresh
npm run portraits:normalize && npm run portraits:validate
```
