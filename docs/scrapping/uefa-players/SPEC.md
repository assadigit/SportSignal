# UEFA Player Portrait Scraping — Specification v2

> **What this is.** The complete, battle-tested specification for collecting
> official UEFA player cutout portraits — written *after* two full production
> runs (the 36-player fixed roster collection, 2026-10-18, and the 96-club
> big-5-league hero MVP pre-seed, 2026-10-18) documented in
> [INSTRUCTIONS.md](INSTRUCTIONS.md). Everything in this spec was verified
> against the live uefa.com of October 2026; every "what didn't work" is
> recorded with the evidence.
>
> **Predecessor.** v1 is preserved at the repository root as
> `uefa-player-portraits.spec.md` (the original task spec for the 36-player
> collection). v2 keeps every hard rule of v1 and generalises the system to
> the open-ended **hero MVP library**: one star player per club, any club,
> scraped on first use.

---

## 1. Objective

Build and maintain a local library of official UEFA player cutout portraits:

1. **Fixed-roster collections** — a named list of players (e.g. the original
   36-player roster), each portrait verified against the requested person.
2. **The hero MVP library** — for any club that appears in SportSignal's hero
   section and has no portrait yet: select the club's star player (§7),
   scrape his official UEFA cutout **once**, publish it to the project
   assets, and serve it from the assets from then on. Never limited to a
   fixed set of clubs.

Non-negotiables (unchanged from v1):

- UEFA official sources only. No substitutions from other websites.
- Identity verified before acceptance. No fabricated assets, no placeholders.
- Honest manifests including failures. Partial results are never presented
  as complete.

## 2. Glossary

| Term | Meaning |
|---|---|
| **cutoff** | UEFA's transparent player cutout image (`img.uefa.com/imgml/TP/players/…/cutoff/{playerId}.webp`), 1080×1080 with alpha in all observed cases |
| **fallback avatar** | The opaque 324×324 JPG (`…/324x324/{playerId}.jpg`) shown when no cutoff exists — recorded, never published (no opaque/transparent mixing) |
| **asset season** | The year in the image URL path; `2027` = the 2026/27 competition season |
| **segment** | The competition number in the image URL path: UCL = `1`, UEL = `14`, UECL = `2019` (learned from live URLs, do not assume others) |
| **squad-path club** | A club in a current UEFA competition — its squad page is the identity anchor |
| **research-path club** | A club not in any current UEFA competition — discovery runs through researched profile URLs |
| **collection** | One roster file plus its own discovery/fetch state and manifest (the asset library itself is shared) |
| **state key** | Stable cache key for an entry: the club slug for hero entries, the player filename base for fixed rosters |

## 3. Source of truth

- Player identity, squad membership, DOB/nationality/position:
  `https://www.uefa.com/{competition}/clubs/…` pages.
- Images: `https://img.uefa.com/imgml/TP/players/{segment}/{season}/cutoff/{playerId}.webp`.
- Player IDs are **never enumerated or guessed**. They come from squad-page
  links or from researched canonical profile URLs recorded in the roster
  (provenance: the player's Wikipedia page or a documented web search).
- External evidence (web search, Wikipedia) is used for **research and
  corroboration only** — the accepted image always comes from UEFA.

## 4. Asset requirements (unchanged from v1 §8)

- Format: **lossless WebP with alpha**, canvas **512 × 512**, fully
  transparent background.
- Subject = visible content at alpha ≥ 8 (with a density trim that ignores
  near-transparent noise), scaled **to fit** a 460.8 px content box
  (≈ 5 % padding), horizontally centred, bottom-aligned to the shared
  baseline, **lanczos3 downscale only**.
- **Never** stretch, mirror, crop meaningfully, AI-enhance, upscale, or
  synthesize backgrounds. Sources smaller than the content box are placed at
  scale 1 and flagged for an owner decision.
- Filenames: stable ASCII kebab-case from the **player's name**
  (`florian-wirtz.webp`). Never derive filenames from club names.
- Layout: `assets/players/uefa/` (served at `/players/uefa/`), one manifest
  per collection (`manifest.json`, `manifest-heroes.json`, …), plus
  `hero-clubs.json` for the club → portrait map. Reproducibility files in
  `scripts/uefa-player-portraits/`, docs in `docs/`, originals in the
  gitignored `.cache/uefa-player-portraits/` (originals are shared across
  collections — same player ⇒ same bytes).

## 5. Discovery

### 5.1 Squad path (club in a current UEFA competition)

1. Fetch `https://www.uefa.com/{ucl|uel|uecl}/clubs/{clubId}--{slug}/squad/`.
   Club ids come from the competition clubs index pages
   (`/uefachampionsleague/clubs/` etc. — cached in the run cache); a club
   that dropped out of UCL qualifying appears in several indexes — prefer
   the highest competition, fall back to the others automatically.
2. Match the requested player by normalized name (accent/punctuation-folded;
   compact form handles `n-golo-kante` ↔ `ngolokante`; a documented alias
   list handles `Nico Paz` ↔ UEFA's `nicolas-paz`). Multiple same-name
   squad entries stay ambiguous until separated by DOB.
3. Fetch the player's canonical profile
   (`/{competition}/clubs/players/{id}--{slug}/`), parse name, club, DOB,
   nationality, position and the cutoff image URL.
4. Verify identity (§6) and record the cutoff candidate (the URL must carry
   the same player id as the profile — parser-drift guard).

**Learned page-template variance (cost us a debugging cycle — see
INSTRUCTIONS.md §4):** UCL-context profile titles are
`Name | Club | Competition | UEFA.com`; UEL/UECL-context titles omit the
club (`Name | UEFA Conference League 2026/27 | UEFA.com`). The club is then
recovered from the page's `/clubs/{id}--{slug}/` link. Cutoff and fallback
image URLs exist under all three segments (`1`, `14`, `2019`) — never
hard-code segment `1`.

### 5.2 Historical squad pages (observed, useful)

A club page fetched under a competition it is **not** currently registered
in can still serve its **last** participation's squad (Brighton's UEL page
served the 25/26 UEL squad including players not registered for 26/27
UECL). The discover loop already tries all three competition contexts for
every club hint — this yields players whose cutoffs exist in previous
seasons *in the correct club's kit*.

### 5.3 Research path (club not in any current UEFA competition)

1. The roster carries a researched `uefa_profile_url` per candidate —
   sourced from the player's Wikipedia page external links (preferred: an
   editorial link) or a documented web search (`site:uefa.com {player}`).
   Both the URL and its source are recorded in the roster.
2. Fetch the profile directly; the player id comes from the URL.
3. Identity verification **requires** an independent anchor: a DOB hint
   from research, or the recorded Wikipedia-page provenance of the URL —
   plus the name match on the profile.
4. The profile's observed club is fuzzy-checked against the requested club
   (§6.3). A mismatch means the cutoff will show another club's kit —
   the entry goes to `quality_review`, it is **never** auto-published.

### 5.4 Candidate fallback (hero collections)

Hero entries carry an ordered candidate list (the superstar first, then the
next-best 2–3 researched picks). The first candidate that resolves **with a
transparent cutoff in the target club's kit** wins; every earlier failure
is recorded in the manifest warnings. The published filename is derived
from the **chosen** candidate's name.

### 5.5 URL probing (bounded, documented)

- Standard collections probe seasons `2027, 2026, 2025` on the cutoff URL's
  own segment.
- Hero collections (deep probe) extend to `2027 … 2020` across **all three**
  segments, the player's observed competition segment first. That is at
  most 24 constructed URLs per player, tried newest-season-first, stopping
  at the first valid image.
- No arbitrary year sweeps. 404 = missing candidate, no retry.

## 6. Identity verification

1. **Name**: normalized match between the request, the squad listing and
   the profile (aliases recorded when UEFA lists a different short name).
2. **DOB**: exact match, or ≤ 400 days variance = data-entry difference
   (warning + external corroboration); > 400 days = hard ambiguity
   (possible namesake). DOB hints come from independent research, never
   from the UEFA profile being verified. Missing hint is tolerated **only**
   on the squad path (the squad page anchors the identity) or with recorded
   Wikipedia provenance for a researched profile URL.
3. **Club (hero collections)**: the profile's observed club must match the
   requested club (fuzzy: token subsets + alias table for UEFA short names
   like `Atleti`, `B. Dortmund`, `Paris`). Mismatch ⇒ `quality_review` with
   a KIT/CLUB MISMATCH warning — a portrait in the wrong club's kit is
   never published as that club's hero.
4. **Cross-collection**: different roster entries must never resolve to the
   same UEFA player id; identical source hashes across different players
   are flagged for manual review.
5. **Visual review**: every published portrait is reviewed on a contact
   sheet (kit colours/sponsor/manufacturer vs the labelled club; clipped
   heads; placeholders; opacity). VLM review is reliable for **kits** and
   unreliable for **face identification** — never accept or reject an
   identity based on a VLM's face claim alone.

## 7. Hero MVP selection policy

1. **Primary rule**: the club's most popular superstar — the player a
   neutral fan would name first.
2. **Doubt rule**: if no clear superstar, pick from the club's top 3–4
   players, grounded in research (current squad lists, league top-scorer
   tables, EA FC top ratings, season previews, fan-vote pieces). Record the
   research basis and the full candidate order in the roster.
3. **Asset fallback**: if the primary pick has no usable UEFA cutoff in the
   target club's kit, the next candidate is used (documented per entry).
   If no candidate qualifies, the club is honestly marked (no fake art).
4. Never pick a player who has left the club (verify against the current
   squad list when one exists).

## 8. Transport (network access)

Three modes, selected by `UEFA_FETCH_TRANSPORT`:

| Mode | Behaviour | When it works |
|---|---|---|
| `direct` (default) | Plain HTTPS from the running machine | Ordinary residential/office networks |
| `relay` | The scoped Cloudflare Worker relay (§8.1) | Datacenter IPs that Akamai/UEFA refuses (observed: sandbox egress → HTTP 403 "Access Denied" on both `www.uefa.com` and `img.uefa.com`) |
| `auto` | Direct first, relay fallback | Default for one-off runs |

### 8.1 The scoped relay worker

Source: `scripts/uefa-player-portraits/relay-worker.js` (the exact deployed
copy — kept deployed as `uefa-image-relay-temp` on the SportSignal
Cloudflare account). It forwards a single validated GET to exactly:

- `https://img.uefa.com/imgml/TP/players/**`
- `https://www.uefa.com/{ucl|uel|uecl}/clubs/**`

with the pipeline's honest User-Agent, manual redirects, `no-store`
responses, no credentials stored or forwarded. It is **not** an open proxy.
Deploy/runbook in [INSTRUCTIONS.md](INSTRUCTIONS.md) §3.

### 8.2 Politeness & failure handling (enforced in code)

- One request at a time; ≥ 1.1 s between requests to the same target host;
  constructed-probe sweeps add a 2.4 s pre-delay (learned the hard way —
  see INSTRUCTIONS.md §5).
- Honest `SportSignalPortraitPipeline/1.0` User-Agent; explicit 30 s
  timeouts; ≤ 3 redirects, each hop re-validated against the allowlist;
  10 MB download cap; ≤ 3 retries with exponential backoff + jitter;
  `Retry-After` honoured; 404 = missing candidate (no retry).
- **Access-denied handling**: on the first denial, back off 65 s and retry
  once; if denied again the host is marked blocked and the run stops for
  that host. Long batch runs additionally self-heal: up to 4 pauses of
  4–8 minutes with the block state cleared between them (UEFA's throttle
  windows observed in practice are minutes, not permanent). A *persistent*
  block still aborts the run — never hammer through a real denial.
- Downloads validated by content type **and** decoding: magic bytes, real
  image decode, expected alpha, plausible dimensions, non-placeholder
  content; atomic writes; sha256-logged for idempotent reruns.

## 9. Download validation & caching

- Accepted: the transparent cutoff of the player's own profile (any
  documented season/segment), validated per §8.2.
- Rejected: HTML masquerading as images, empty/fully-transparent images,
  opaque images (for cutoff candidates), implausibly small images.
- Originals cached in `.cache/uefa-player-portraits/originals/{key}.webp`,
  shared across collections; validated cache entries are reused without
  re-downloading (`--refresh` forces re-download).

## 10. Provenance & manifests

One manifest per collection, one entry per requested player **including
failures**, in roster order:

- `roster_index`, `requested_name`, `requested_club_label`,
  `chosen_player` (when a fallback candidate was published), `filename`,
  `status` ∈ `complete | missing | ambiguous | blocked | quality_review |
  deferred`
- `uefa_player_id`, `canonical_profile_url`, `identity_evidence`
  (UEFA name/nationality/DOB/position + disambiguation explanation +
  external corroboration), `observed_uefa_club`
- `hero` block (club slug, league, selection basis, chosen candidate,
  candidates considered) for hero collections
- full source/output metadata: URLs, asset season, competition, fetched-at,
  dimensions, alpha flag, sha256s, download transport, normalization record
  (subject bounds, applied scale ≤ 1, placement), warnings
- `deferred` entries carry an owner-decision record (`decided_at` +
  `reason`); validate accepts them as documented known-incomplete outcomes
  and fails on any other non-complete status

`hero-clubs.json` (hero collections): one entry per roster club with
`player`, `league`, `status`, `portrait_url` (only for complete), UEFA ids
and profile URL — the contract the hero frontend consumes.

## 11. Validation gate (per collection)

`cli.js validate --roster <file>` exits non-zero on any failure:

- roster/manifest integrity (order, uniqueness, kebab-case filenames,
  statuses), identity uniqueness, duplicate-hash detection
- library-aware file check: every `.webp` in the asset dir must belong to
  this roster or to a complete/deferred entry of another manifest present
  in the directory
- per-file: decode, 512 × 512, WebP, alpha, sha256 match, aspect-ratio
  preservation, no-upscale proof, full provenance chain
- hero collections: `hero-clubs.json` consistency (one club per entry,
  coherent statuses, portrait URLs only for complete)
- deferred entries require their decision record; any other unresolved
  entry fails the gate

## 12. The on-demand hero flow (runtime design)

**Current (v2, operator/agent-run):**

1. A club appears in the hero section with no portrait.
2. Check `assets/players/uefa/hero-clubs.json` → no complete entry.
3. Run the runbook: [INSTRUCTIONS.md](INSTRUCTIONS.md) §2 (research the
   MVP, add the club entry to `roster-heroes.json`, run the pipeline,
   validate, commit, push, deploy). First use scrapes; every later use
   serves the published asset — UEFA is hit exactly once per club.
4. Clubs that cannot be scraped honestly (no UEFA cutout in the right kit)
   are marked in the map; the hero layer renders without artwork (the
   existing `.hero-art` layer already degrades gracefully).

**Future (not built; design constraints recorded):** a fully automated
on-demand worker could fetch + store raw cutoffs (Cloudflare egress reaches
UEFA), but **identity verification, MVP selection and kit-consistency
review need judgment** — keep them in the agent/operator loop. The
`assets/hero/players/README.md` AI-artwork phase remains the fallback for
clubs UEFA will never have assets for.

## 13. Honesty & compliance rules

- No player substitution without documentation; no club-label rewriting;
  UEFA-observed data stored separately from requested labels.
- No credential, cookie or token ever enters the repository or logs.
- UEFA terms/robots respected: no auth bypass, no CAPTCHA solving, no
  scraping through challenge pages; stop on real access denials.
- **Rights (© UEFA)**: public availability ≠ redistribution permission.
  Assets are stored for internal use; before public redistribution
  (website, bot, social) permission must be sought from UEFA or the assets
  removed. The repo's source-code license does not cover these images.
  Every manifest carries this notice.

## 14. Acceptance criteria

- [ ] Every published portrait comes from verified official UEFA sources.
- [ ] Identity verified per §6 for every published portrait.
- [ ] Hero portraits show the target club's kit (or carry an explicit
      documented exception).
- [ ] All outputs: 512 × 512 lossless WebP with alpha, no stretching or
      upscaling, shared baseline.
- [ ] Manifests complete (including failures), `hero-clubs.json` coherent.
- [ ] Offline test gate green (`npm test`, includes
      `scripts/check-uefa-portraits.js`).
- [ ] Contact sheet reviewed; VLM kit review recorded for new batches.
- [ ] No secrets or unrelated changes in the diff; rights notice intact.

## Appendix A — learned URL patterns

| Pattern | Meaning |
|---|---|
| `img.uefa.com/imgml/TP/players/{seg}/{season}/cutoff/{id}.webp` | transparent cutout; `seg` ∈ {1=UCL, 14=UEL, 2019=UECL}; `season` = following year (2027 ⇒ 2026/27); observed 1080×1080 alpha |
| `img.uefa.com/imgml/TP/players/{seg}/{season}/324x324/{id}.jpg` | opaque fallback avatar (never published) |
| `www.uefa.com/{comp}/clubs/` | competition club index (ids+slugs, includes qualifying-round clubs) |
| `www.uefa.com/{comp}/clubs/{id}--{slug}/squad/` | current (or last-participation, §5.2) squad |
| `www.uefa.com/{comp}/clubs/players/{id}--{slug}/` | canonical player profile; also reachable un-slugged (`/players/{id}/`) via redirect |
| `www.uefa.com/teamsandplayers/…` | legacy profile URL form found in Wikipedia links — normalizes via redirect, not in the relay scope |

## Appendix B — failure catalogue (what didn't work)

See [INSTRUCTIONS.md](INSTRUCTIONS.md) §6 for the annotated war story:
direct datacenter fetch (403), real browser (403), search-engine page
reading (blocked/JS-only), VLM face identification (unreliable), roster
DOB hints (three were wrong, UEFA was right), segment-1-only assumptions
(broke UEL/UECL), fast probe sweeps (edge throttle), Jackson/Thauvin
(no cutoff exists at all).
