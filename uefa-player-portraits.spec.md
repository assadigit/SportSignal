# Specification: UEFA Player Portrait Collection

## 1. Objective

Collect official UEFA player cutout portraits for the 36 players listed below
and store consistently sized, high-quality local assets in:

https://github.com/assadigit/sportsignal

Use UEFA as the image source. Do not substitute images from other websites.

Deliver:
- 36 verified player portraits, where available.
- Uniform dimensions, format, transparent background, and visual framing.
- A machine-readable manifest containing identity and source provenance.
- A repeatable download/normalization script.
- A report identifying missing images, ambiguous identities, outdated kits,
  and insufficient source resolution.

Do not claim completion if any requested portrait remains unresolved.

## 2. Repository Access and Scope

The user will provide repository credentials separately.

Before implementation:
1. Read the repository's AGENTS.md and contribution instructions.
2. Inspect the framework, asset conventions, scripts, and package manager.
3. Check the working tree and preserve unrelated user changes.
4. Reuse existing tooling where practical.

Do not:
- Store credentials, authentication cookies, or tokens in the repository.
- Modify unrelated application functionality.
- Commit, push, create branches, or open a pull request without explicit
  user authorization.
- Assume that repository access credentials are needed for public UEFA images.

## 3. Asset Layout

Prefer the repository's established static asset convention.

If this is a web application with a public/ directory, use:

public/assets/players/uefa/
  ousmane-dembele.webp
  lamine-yamal.webp
  ...
  andraz-sporar.webp
  manifest.json

Otherwise, use the equivalent existing static asset directory. If no convention
exists, use:

assets/players/uefa/

Document the chosen directory and public URL prefix.

Keep reproducibility files outside the public asset directory:

scripts/uefa-player-portraits/   # implementation and input roster
docs/assets/uefa-player-portraits.md

Keep downloaded originals and temporary files in a gitignored working directory:

.cache/uefa-player-portraits/originals/

Use stable ASCII kebab-case filenames from the roster below. Never derive
filenames from club names or scraped text.

## 4. Requested Roster

Preserve order and supplied club labels exactly.
Names identify the requested person; clubs are context only.

| # | Supplied club label | Player | Asset filename |
|---|---|---|---|
| 1 | Paris Saint-Germain FC | Ousmane Dembélé | ousmane-dembele.webp |
| 2 | FC Barcelona | Lamine Yamal | lamine-yamal.webp |
| 3 | Aston Villa FC | Nicolas Jackson | nicolas-jackson.webp |
| 4 | VfB Stuttgart | Deniz Undav | deniz-undav.webp |
| 5 | Liverpool FC | Bradley Barcola | bradley-barcola.webp |
| 6 | Sporting Clube de Portugal | Luis Suárez 🇨🇴 | luis-suarez-colombia.webp |
| 7 | Arsenal FC | Bukayo Saka | bukayo-saka.webp |
| 8 | Real Madrid CF | Kylian Mbappé | kylian-mbappe.webp |
| 9 | Real Betis Balompié | Antony | antony.webp |
| 10 | FC Bayern München | Harry Kane | harry-kane.webp |
| 11 | FK Shakhtar Donetsk | Pedrinho | pedrinho.webp |
| 12 | Como 1907 | Nico Paz | nico-paz.webp |
| 13 | Manchester United FC | Bruno Fernandes | bruno-fernandes.webp |
| 14 | Villarreal CF | Georges Mikautadze | georges-mikautadze.webp |
| 15 | Club Atlético de Madrid | Julián Álvarez | julian-alvarez.webp |
| 16 | Club Brugge KV | Nicolò Tresoldi | nicolo-tresoldi.webp |
| 17 | Manchester City FC | Erling Haaland | erling-haaland.webp |
| 18 | Borussia Dortmund | Serhou Guirassy | serhou-guirassy.webp |
| 19 | Racing Club de Lens | Florian Thauvin | florian-thauvin.webp |
| 20 | AEK Athens | Luka Jović | luka-jovic.webp |
| 21 | RB Leipzig | Christoph Baumgartner | christoph-baumgartner.webp |
| 22 | Sabah FK | Veljko Simić | veljko-simic.webp |
| 23 | Feyenoord Rotterdam | Luciano Valente | luciano-valente.webp |
| 24 | FK Bodø/Glimt | Patrick Berg | patrick-berg.webp |
| 25 | AS Roma | Paulo Dybala | paulo-dybala.webp |
| 26 | PSV Eindhoven | Ricardo Pepi | ricardo-pepi.webp |
| 27 | Viking FK | Zlatko Tripić | zlatko-tripic.webp |
| 28 | Fenerbahçe SK | N’Golo Kanté | ngolo-kante.webp |
| 29 | FC Internazionale Milano | Lautaro Martínez | lautaro-martinez.webp |
| 30 | FC Porto | Diogo Costa | diogo-costa.webp |
| 31 | SK Slavia Praha | Lukáš Provod | lukas-provod.webp |
| 32 | SSC Napoli | Scott McTominay | scott-mctominay.webp |
| 33 | LASK Linz | Samuel Adeniran | samuel-adeniran.webp |
| 34 | Lille OSC | Ayase Ueda | ayase-ueda.webp |
| 35 | Galatasaray SK | Victor Osimhen | victor-osimhen.webp |
| 36 | ŠK Slovan Bratislava | Andraž Šporar | andraz-sporar.webp |

### Identity rules

- Do not replace a requested player with someone from the supplied club.
- Do not rewrite supplied club labels to match UEFA's current data.
- Store any UEFA-observed club separately.
- Normalize accents and punctuation for searching only; preserve display names.
- Luis Suárez means the Colombian player, not the Uruguayan namesake.
- Pedrinho requires explicit disambiguation using UEFA profile information and
  the Shakhtar context. If that context does not identify one person reliably,
  ask the user before accepting an image.
- Use full name, nationality, date of birth, and career/club history where
  available to resolve namesakes.
- Do not require every player to appear in the current Champions League:
  UEFA profiles in other competitions or historical seasons are acceptable
  fallback sources, provided the identity is verified.

## 5. Known Example and URL Interpretation

The user supplied this profile:

https://www.uefa.com/uefachampionsleague/clubs/players/250066886--ousmane-dembele/

And this image:

https://img.uefa.com/imgml/TP/players/1/2027/cutoff/250066886.webp

Treat these as discovery seeds, not proof that every player has the same
asset path.

The example suggests:

https://img.uefa.com/imgml/TP/players/1/{assetSeason}/cutoff/{playerId}.webp

Important:
- Verify the player ID against an actual UEFA profile.
- Treat assetSeason as an opaque UEFA asset-season identifier until its
  meaning is confirmed.
- Do not assume 2027 is available for all players.
- Do not assume that changing a year or file extension produces a valid image.
- Do not invent undocumented high-resolution query parameters.
- A successful HTTP response does not prove the asset is correct:
  decode it and inspect it for placeholders and wrong identities.

## 6. Discovery and Scraping Method

Use the least expensive reliable method first.

### Phase A: Resolve identities

For each player:
1. Search UEFA's player directory/search or publicly indexed UEFA profiles.
2. Locate the canonical UEFA profile.
3. Verify the person's identity.
4. Record the canonical profile URL and numeric UEFA player ID.

External search engines may help locate UEFA pages, but the accepted portrait
must come from an official UEFA image source.

Never enumerate random numeric player IDs.

### Phase B: Extract portrait candidates

First inspect the profile's ordinary HTML and structured data for:
- img src attributes.
- img srcset candidates.
- picture/source elements.
- Lazy-loading image attributes.
- Embedded JSON containing player portrait URLs.

Social preview images are discovery clues only. Do not accept banners, team
photos, or match photography as player cutouts.

If HTML does not expose the portrait:
1. Open the profile in a real browser.
2. Wait for the player portrait to load.
3. Inspect its DOM image element and currentSrc.
4. Inspect public image requests and public page data requests in the browser's
   network panel.
5. Record the exact UEFA-hosted image URL used by the page.

Do not invent API routes, selectors, or JSON field names. Discover them from
the actual page and keep extraction logic narrowly scoped to player portraits.

Reuse the public image URL for downloading instead of repeatedly launching
the browser.

### Phase C: Select the best source

Candidate preference:
1. Highest-resolution verified transparent UEFA cutout in the preferred
   coherent asset-season set.
2. Another verified UEFA cutout for the same player, with fallback season or
   competition recorded.
3. Unresolved, if UEFA has no acceptable cutout.

Prefer actual decoded pixel dimensions over assumptions based on URL names.

If the known cutoff URL pattern is useful, probe only a small, documented
set of season values supported by observed UEFA pages or asset URLs.
Do not sweep arbitrary year ranges.

Prefer a consistent portrait family across the roster. If an older portrait
or different kit is necessary, record that fact. Do not alter uniforms,
recolor kits, or fabricate current-club portraits.

### Phase D: Review before batch processing

Before fetching the full roster:
- Verify the Dembélé example.
- Verify one ordinary additional player.
- Verify one namesake or difficult case.
- Measure source dimensions and transparency.
- Confirm the normalization method works without degrading portraits.

Then process the remaining roster.

## 7. Network Behavior and Failure Handling

- Check applicable UEFA terms, robots directives, and image-use restrictions.
- Do not bypass authentication, CAPTCHAs, access controls, or anti-bot measures.
- Use an honest descriptive User-Agent where the HTTP client permits it.
- Default to one request at a time and at least one second between requests
  to the same host.
- Honor Retry-After and use exponential backoff with jitter.
- Retry transient network failures and 5xx responses at most three times.
- Treat 404 as a missing candidate, not an indefinitely retryable failure.
- Stop automated requests to an affected host on access-denied responses
  or challenge pages and report the blocker.
- Use explicit timeouts, bounded redirects, and download-size limits.
- Validate each redirect destination before following it.
- Download accepted images only from HTTPS img.uefa.com, unless another
  official UEFA image host is verified and documented.
- Never forward repository credentials to UEFA or image hosts.

Validate downloads by both content type and successful image decoding.
Reject HTML error pages, empty images, implausibly small images, and known
generic placeholders.

Use temporary files and atomic writes so failed downloads cannot leave
apparently valid final assets.

Cache originals and reuse validated downloads on subsequent runs.

## 8. Image Quality and Normalization

### Required output

- Format: lossless WebP with alpha transparency.
- Identical pixel width and height for all final portraits.
- Identical canvas background: transparent.
- Preserve source aspect ratio.
- No stretching, mirroring, AI enhancement, or background synthesis.
- No silent upscaling.
- Preserve the entire available head and shoulders.
- Do not remove watermarks or attribution marks.

### Select a realistic common size

Preferred canvas: 512 × 512 pixels.

This is a target, not permission to upscale smaller sources.

Before finalizing the target:
1. Measure source canvas and visible-subject dimensions for every player.
2. Determine whether the preferred target can be achieved without enlargement.
3. If some sources are too small, search for verified larger UEFA variants.
4. If larger sources do not exist, report affected players and ask the user
   whether to lower the common resolution or explicitly permit upscaling.

Do not silently reduce the entire collection because one source is poor.
Do not mark a visibly undersized portrait as satisfactory merely because it
has been padded to the target canvas.

### Framing

Use transparent cutouts from the same portrait family whenever possible.

For alpha-based normalization:
1. Detect visible content using a documented alpha threshold; ignore isolated
   near-transparent noise without deleting meaningful image content.
2. Compute the visible-subject bounding box.
3. Apply a uniform scale-to-fit operation within a content box that leaves
   approximately 5% padding around the output canvas.
4. Center horizontally and align the bottom of the visible subject to the
   shared content-box baseline.
5. Preserve all meaningful visible content; do not crop heads to force a fit.

This provides consistent canvas size and approximate framing. It does not
guarantee identical face scale when source crops differ.

Review a contact sheet for inconsistent face/head scale. Adjust only with
documented per-player framing overrides that preserve aspect ratio and
avoid enlargement or destructive cropping.

If a source has no usable transparency:
- Seek another official UEFA cutout first.
- Otherwise mark it unresolved and ask before performing background removal.
- Do not silently mix opaque photos with transparent cutouts.

Keep original bytes unchanged in the local cache.

## 9. Manifest

Create one manifest entry for every requested player, including failures.

Top-level fields:
- schema_version
- generated_at
- output_format
- target_width
- target_height
- entries

Each entry must contain:
- roster_index
- requested_name
- requested_club_label
- filename
- status: complete | missing | ambiguous | blocked | quality_review
- uefa_player_id, or null
- canonical_profile_url, or null
- identity_evidence: available full name, nationality, date of birth,
  and a concise explanation of disambiguation
- observed_uefa_club, or null
- source_image_url, or null
- source_asset_season, or null
- source_competition, or null
- fetched_at, or null
- source_width and source_height, or null
- source_has_alpha, or null
- source_sha256, or null
- output_width and output_height, or null
- output_sha256, or null
- normalization: source content bounds, applied scale, placement,
  and any framing override
- warnings: array of strings

For unresolved entries, use null for nonexistent asset metadata.
Never create a fake portrait file to make the count reach 36.

Different people must not accidentally map to the same UEFA player ID.
Flag identical source hashes across different players for manual review.

## 10. Implementation and Commands

Use the repository's existing language and tooling where practical.
Prefer existing image-processing dependencies. If none exist, choose a
maintained library supporting WebP, alpha inspection, and high-quality resizing.

Do not introduce a scraping service, database, or paid API for this task.

Provide a small command-line workflow with these operations:
- discover: resolve identities and source candidates without publishing assets.
- fetch: download verified originals to the cache.
- normalize: produce final local portraits and manifest.
- validate: verify the roster, files, image properties, and provenance.
- all: run the complete workflow.
- Single-player selection for troubleshooting.
- Explicit refresh option; otherwise reuse validated cached data.

The exact executable commands must be documented after inspecting the
repository. Do not guess package-manager commands in advance.

Implementation style:
- Separate identity resolution, downloading, normalization, and validation.
- Keep the roster as structured data rather than scattered conditionals.
- Use explicit statuses and actionable error messages.
- Avoid a large generic scraping framework.
- Keep manifest ordering stable and preserve roster order.

The documented validation command must return a nonzero exit status if any
entry is unresolved or any acceptance criterion fails.

## 11. Testing and Review

Use the repository's existing test framework where available.

Automated tests must cover:
- All 36 roster entries and unique filenames.
- Accent and punctuation handling.
- Namesake ambiguity.
- HTML or placeholder responses masquerading as image downloads.
- Missing assets, timeouts, rate limits, and bounded retries.
- Transparent image decoding.
- Aspect-ratio preservation.
- Common output dimensions.
- Refusal to upscale without explicit approval.
- Manifest entries for failures.
- Safe filenames and validated image-host redirects.
- Idempotent reruns without duplicate downloads or corrupted outputs.

Use local fixtures for tests; do not depend on live UEFA requests in ordinary
test runs.

Generate a contact sheet outside the published portrait directory.
Manually inspect every portrait for:
- Correct identity.
- Wrong/generic placeholder images.
- Clipped heads.
- Inconsistent scale or baseline.
- Opaque backgrounds.
- Blurriness.
- Old or unexpected kits.

Contact-sheet inspection supplements identity verification; it does not
replace profile evidence.

## 12. Rights and Usage

Public availability does not establish permission to redistribute images.

Record:
- UEFA as the source.
- Profile and image URLs.
- Retrieval date.
- Any applicable terms or usage guidance found.
- Whether reuse permission has been established or remains unverified.

Do not invent a license or declare the images copyright-free.
Do not apply the repository's source-code license to these images.

If redistribution is prohibited or permission remains a blocker for the
intended use, report it before publishing the assets. Do not claim this
collection is cleared for production or commercial use without evidence.

## 13. Acceptance Criteria

The task is complete only when:
- [ ] All 36 requested identities are verified.
- [ ] Exactly one accepted portrait exists for each requested player.
- [ ] Every portrait comes from a verified official UEFA image source.
- [ ] All final images share the approved dimensions and WebP format.
- [ ] All final images have usable alpha transparency.
- [ ] No portrait is stretched, silently enlarged, or destructively cropped.
- [ ] Filenames match the roster.
- [ ] A complete provenance manifest exists.
- [ ] No accidental duplicate identities or placeholder images remain.
- [ ] Contact-sheet review covers every player.
- [ ] The repeatable workflow and exact commands are documented.
- [ ] Relevant automated tests and validation pass.
- [ ] No secrets or unrelated repository changes are included.
- [ ] Rights and redistribution status are documented.

If any criterion cannot be met, deliver a partial-results report with the
affected players, evidence, attempted fallback methods, and the exact user
decision required. Do not present partial results as a completed collection.

## 14. Final Agent Report

Report:
1. Chosen repository asset directory and public URL prefix.
2. Successful portrait count out of 36.
3. Approved common dimensions and encoding settings.
4. Missing, ambiguous, blocked, or low-resolution entries.
5. Club-label mismatches and fallback-season/kit warnings.
6. Files changed.
7. Commands run and their results.
8. Rights/permission status.
9. Any decisions still required from the user.

Do not include credentials or session cookies in the report.
