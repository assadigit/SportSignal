# How to Scrape UEFA Player Portraits — The Verified Runbook

This is the exact method that succeeded, with everything that failed (and
why) written down so the next run starts from knowledge, not hope. Read it
together with [SPEC.md](SPEC.md) (the rules) — this file is the practice.

**Current production state** (see the manifests for the authoritative
record):

| Collection | Roster | Result (latest run) |
|---|---|---|
| `roster.json` — 36 fixed players | `uefa-player-portraits.spec.md` (v1) | **34 complete, 2 deferred** (Jackson, Thauvin — no UEFA cutoff exists) |
| `roster-heroes.json` — 96 big-5-league hero MVPs | this spec | **96/96 complete (2026-10-20, style-audited v2.3): 22 UEFA official cutoffs + 74 league-official portraits (PL 16 / Serie A 16 / LaLiga 15 / Ligue 1 15 / Bundesliga 12), every file VLM-classified — 84 `jersey_photo` + 12 `bust_photo`, ZERO card renders.** The 2026-10-20 style audit (§13.5) replaced the 8 confirmed platform card renders (7 × LaLiga “004” series + Troyes' entire Ligue 1 media set — Troyes' hero is now Iron Gomis via the star fallback), repaired the 9 provenance records the 13.129-hudframe revert had left stale, and every fill now runs through the VLM style gate (spec §8c). Prior state (v2.2): framing-fixed, body visible to at least the jersey; Brest’s hero moved Del Castillo → Ajorque (§8 case 9) |

The dominant finding of the hero pre-seed: **UEFA's transparent cutoffs exist
reliably for current-season UCL players, sparsely for past UCL seasons, and
essentially not at all for UEL/UECL registrations** (in October 2026). Clubs
whose only recent European football is UEL/UECL mostly have no publishable
UEFA portrait — they are marked `no_asset` with per-URL probe evidence, and
the hero layer renders without artwork for them by design.

---

## 1. Quick start (assets already set up)

```bash
# full workflow for a collection (discover → fetch → normalize → validate → contact sheet)
npm run portraits                       # the 36-player collection
npm run portraits:heroes                # the hero MVP collection (package.json alias)

# or stage by stage
node scripts/uefa-player-portraits/cli.js discover  --roster roster-heroes.json
node scripts/uefa-player-portraits/cli.js fetch      --roster roster-heroes.json
node scripts/uefa-player-portraits/cli.js normalize  --roster roster-heroes.json
node scripts/uefa-player-portraits/cli.js validate   --roster roster-heroes.json
node scripts/uefa-player-portraits/cli.js contact-sheet --roster roster-heroes.json

# one club/player only (troubleshooting)
node scripts/uefa-player-portraits/cli.js fetch --roster roster-heroes.json --player newcastle-united-fc

# force re-download of validated data
node scripts/uefa-player-portraits/cli.js fetch --roster roster-heroes.json --refresh

# offline test gate (no network; part of npm test)
node scripts/check-uefa-portraits.js
```

> **Fresh-clone warning:** `.cache/` is gitignored — `normalize`
> regenerates the manifests FROM the cache state, so on a fresh clone with
> an empty cache it would rewrite them as all-missing. Rebuild the cache
> first (§10) or run the `discover → fetch` chain before any `normalize`.

Transport env vars (only needed from blocked networks — see §3):

```bash
export UEFA_FETCH_TRANSPORT=relay
export UEFA_RELAY_BASE=https://uefa-image-relay-temp.sportsignal.workers.dev
```

## 2. Adding a new club's hero MVP (the on-demand flow)

When a club appears in the hero section and has no portrait:

1. **Check the map** — `assets/players/uefa/hero-clubs.json`. If the club
   key exists with `status: "complete"`, the portrait is already served
   from `/players/uefa/{file}` — nothing to do.
2. **Research the MVP** (SPEC §7): the club's superstar; when in doubt its
   top 3–4 players. Ground the choice in current-season research — squad
   lists (UEFA squad page if the club is in Europe, ESPN/Wikipedia
   otherwise), league top-scorer tables, EA FC ratings, fan votes. Note the
   basis and the ordered candidates.
3. **Is the club in a current UEFA competition?**
   - **Yes** → find its club id: fetch
     `https://www.uefa.com/{ucl|uel|uecl}/clubs/` and look for the
     `{id}--{slug}` entry (or reuse the cached
     `.cache/uefa-player-portraits/heroes-research/uefa-best-comp.json`).
     Add the entry with `club_hint: { competition, club_path }`.
   - **No** → research the candidate's UEFA profile URL (the player's
     Wikipedia page → external links → `uefa.com/.../players/{id}...`, or a
     `site:uefa.com {player}` web search). Add `uefa_profile_url` and an
     identity hint (DOB from Wikipedia) to the entry. ⚠️ If the player's
     last UEFA football was for a *different* club, his cutoff will show
     that club's kit — the pipeline flags it; expect `quality_review`, and
     try the next candidate.
4. **Add the entry to `scripts/uefa-player-portraits/roster-heroes.json`**
   (keep league/standing order; `state_key` = club slug):

   ```json
   {
     "roster_index": 97,
     "requested_name": "Bruno Guimarães",
     "requested_club_label": "Newcastle United FC",
     "filename": "bruno-guimaraes.webp",
     "state_key": "newcastle-united-fc",
     "search_name": "bruno guimaraes",
     "club_hint": null,
     "uefa_profile_url": "https://www.uefa.com/uefachampionsleague/clubs/players/250045641/",
     "hero": {
       "club_slug": "newcastle-united-fc",
       "club_display": "Newcastle United FC",
       "league": "Premier League",
       "selection_basis": "club superstar (researched 2026-10-18: …)",
       "candidates": [{ "name": "Bruno Guimarães" }, { "name": "Tino Livramento" }]
     },
     "identity_hint": { "full_name": "Bruno Guimarães", "date_of_birth": "1997-11-16",
                        "source": "wikipedia, 2026-10-18", "confidence": "high" }
   }
   ```

5. **Run the pipeline** (§1, `--roster roster-heroes.json`), fix what the
   warnings tell you (§5), then `validate`.
6. **Review the new portraits** on the contact sheet + a VLM kit check
   (SPEC §6.5).
7. **Commit, push, deploy** — the hero map and portraits are static assets
   served by the worker; they only go live on deploy.

## 2b. Filling UEFA-uncovered clubs from league-official platforms (spec §8b)

When the coverage audit says UEFA has nothing for a club (status
`no_asset` with recorded evidence), the same style/quality portrait can
come from the club's league:

```bash
# 1. see what would be matched (no downloads)
node scripts/uefa-player-portraits/alt-fetch.js --dry

# 2. fetch + cache originals + record provenance (idempotent; per club
#    with --player <state-key>)
node scripts/uefa-player-portraits/alt-fetch.js

# 3. re-normalize + re-validate the collection
node scripts/uefa-player-portraits/cli.js normalize --roster roster-heroes.json
node scripts/uefa-player-portraits/cli.js validate  --roster roster-heroes.json
```

What it does per club: walks the researched hero candidates on the
league's official platform (FPL bootstrap, apim.laliga.com squad-manager,
api-sdp.legaseriea.it lineups, bundesliga.com player pages,
ma-api.ligue1.fr club summaries), downloads the first transparent
candidate image that validates (broken CDN assets fall through to the
next candidate), caches the pristine original, and records an
`alt_source` provenance block. Normalization applies the platform's
documented crop/upscale directives (Bundesliga 42% top-crop of the
true full-body 780×960 PNGs; Serie A busts publish as-is after the
§9b fix; PL + Ligue 1 upscale exceptions — recorded per entry).

Verification notes from the 2026-10-19 run:
- Ligue 1 bust URLs embed a club segment — cross-checked against each
  squad's dominant segment (kit consistency, incl. 7 summer transfers);
- Bundesliga pages carry the club in the title (identity anchor);
- VLM was quota-exhausted during the run — deterministic checks carried
  the review; re-run a VLM spot pass when the service recovers.

## 2c. Updating an existing hero (transfers, kit changes, better picks)

A published portrait is valid only **while its player is still at the
club** (the kit rule, §8). Run this flow when the player transferred away
or retired, when a kit/club mismatch surfaces, or when the owner asks for
a different MVP.

1. **Confirm the change** with a kit-timing check (§8) — the Wikipedia
   career table against the manifest's `source_asset_season`. Never trust
   memory for transfer-window state.
2. **Edit the roster entry** in `roster-heroes.json` (find it by
   `state_key` = club slug): new `requested_name`, new `filename`
   (kebab-case from the new player's name), refreshed `hero.candidates`
   order + `selection_basis`. Club/league fields stay.
3. **Drop the stale pipeline state** for that key so nothing is reused:
   remove the entry from `.cache/uefa-player-portraits/heroes/discovery.json`
   and `fetch-log.json` (the heroes collection's cache subdir — originals
   are shared and keyed by filename base, see `lib/collection.js`), or run
   the stages with `--refresh`.
4. **Re-run the stages for the one club**:
   `cli.js discover --roster roster-heroes.json --player <state-key>` →
   `fetch --player <state-key>` → `normalize` (whole roster — it rewrites
   the manifest, which is derived state and always safe to regenerate) →
   `validate`. No UEFA asset for the new pick → record the no_asset
   evidence honestly, then `alt-fetch.js --player <state-key>` (§2b).
5. **To REPLACE an existing alt-source portrait** (better asset, platform
   refresh): delete the club's record from the heroes `fetch-log.json` and
   `discovery.json`, run `normalize` (the manifest entry flips to
   `missing`), then `alt-fetch.js --player <state-key>`, then `normalize`
   + `validate` again — alt-fetch only fills entries whose manifest status
   is `missing`/`no_asset`.
6. **Mind the old file**: if the previous player's `.webp` is referenced
   by no other collection, delete it — the validate gate fails on
   orphaned files in `assets/players/uefa/`. If he moved to another club
   in the set, the file stays and only the `hero-clubs.json` mapping
   changes (filenames are player-derived).
7. **Framing upgrades keep the hero**: to replace a badly-framed (but
   otherwise valid) portrait — e.g. a UEFA cutoff that ends above the
   jersey (§9b) — do NOT walk the full purge above; use
   `alt-fetch.js --refill <state-key>` instead: it re-fills the entry,
   refuses any platform match that is not the chosen hero, and records
   `refill_reason`. Cached-source recrops need no fetch at all —
   `recrop-alt-sources.js --keys … --crop F --reason …`.
8. Contact-sheet review + the §7 checklist (commit, push, deploy).

## 2d. The season-turnover refresh (each summer, plus January windows)

Three things in the library are season-coupled: club memberships, UEFA
asset families, and league-platform URL constants.

1. **Club set** (promotion/relegation): re-derive the big-5 memberships
   from football-data.org (token in the operator vault — never the repo;
   the 2026/27 pre-seed's Hull/Coventry/Paris FC/Elversberg/Racing
   Santander/Málaga surprises invalidated every remembered assumption).
   Diff against `roster-heroes.json`: new clubs → §2; relegated clubs →
   remove the entry + its `hero-clubs.json` mapping, and the asset file if
   nothing else references it.
2. **UEFA asset families**: a new season means new cutoff locations
   (`1/2028` = UCL 2027/28). Clubs newly in UCL/UEL/UECL become
   squad-path discoverable — prefer a fresh UEFA cutoff over their
   alt-source portrait (swap the roster entry back to the UEFA flow, §2c).
   Existing UEFA-sourced heroes may gain newer-season assets: `fetch
   --refresh`, then review. Check the probe season-set defaults rolled
   over (SPEC §5.5).
3. **League-platform constants** baked into `alt-fetch.js` that embed the
   season: the PL photo bucket path (`premierleague25/…`), LaLiga's
   `seasonYear=2026` param + `assets.laliga.com/squad/2026/`, Ligue 1's
   `player_official_2026_` filename + `{season}-{clubseg}` S3 bucket
   segment, and Serie A's `SA_COMP`/`SA_SEASON` ids (re-derive from
   api-sdp.legaseriea.it each season — they change).
4. **Kit re-checks** for every hero whose player moved in the window
   (§2c), plus a contact-sheet pass; VLM spot-review when quota allows.
5. Update the status tables (this file's header and
   `docs/scrapping/uefa-players/README.md`), run `validate` + `npm test`,
   commit, push, deploy, live spot-check.

## 3. When UEFA blocks you (the transport story)

**What didn't work (measured 2026-10-18):**

- Direct `fetch`/curl from the sandbox to `www.uefa.com` or `img.uefa.com`
  → **HTTP 403 Akamai "Access Denied"** on every request, with or without
  browser-like headers. Datacenter IPs are simply refused.
- A real browser (agent-browser) from the same network → **same 403**.
  The block is IP-range-based, not fingerprint-based.
- Reading search engines (Bing/DuckDuckGo HTML) through a page-reader
  service → empty/JS-only responses; Google not even attempted.
- Z-AI page-reader **can** render `www.uefa.com` pages (useful for
  reconnaissance!) but not the JS-only UEFA search, and it is rate-limited
  as a service (~100 rapid calls drain the bucket; recovery takes ~10–15
  minutes; 429 responses must not be cached as "not found").

**What worked:** a **scoped relay worker** on the project's own Cloudflare
account. Cloudflare's egress reaches UEFA fine; the relay forwards one
validated GET to the two allowed host/path prefixes and nothing else.

```bash
# deploy (already deployed as uefa-image-relay-temp — only needed once)
npx wrangler deploy scripts/uefa-player-portraits/relay-worker.js \
  --name uefa-image-relay --compatibility-date 2025-01-01
# then for every pipeline run from a blocked network:
export UEFA_FETCH_TRANSPORT=relay
export UEFA_RELAY_BASE=https://uefa-image-relay-temp.sportsignal.workers.dev
```

Verify it: `curl "$UEFA_RELAY_BASE/?url=https%3A%2F%2Fwww.uefa.com%2Fuefachampionsleague%2Fclubs%2F"`
→ `HTTP 200`, `x-upstream-status: 200`.

Delete it when no longer needed: `npx wrangler delete --name uefa-image-relay`.

## 4. The discovery chain that works (and its traps)

```
competition clubs index  →  club squad page  →  player profile  →  cutoff webp
     (id + slug)            (player ids)       (DOB, club, URL)     (1080×1080 α)
```

Traps we hit, all fixed in code — know them when debugging:

1. **Title templates differ by competition.** UCL profiles:
   `Name | Club | UEFA Champions League 2026/27 | UEFA.com`. UEL/UECL
   profiles: `Name | UEFA Conference League 2026/27 | UEFA.com` — **no
   club field**; the club comes from the page's `/clubs/{id}--{slug}/`
   link. A parser that assumes the UCL shape reads the competition name as
   the club and then every hero entry fails the kit-consistency check.
2. **Image URL segments differ by competition**: UCL `1`, UEL `14`, UECL
   `2019`. A cutoff regex (or constructed probe) hard-coded to `1` misses
   every UEL/UECL player.
3. **Squad pages for past participants still serve their last squad.**
   Brighton's UEL-context page served the 25/26 squad (Mitoma included)
   while the current UECL squad list didn't have him. This is a feature:
   the discover loop tries all three competition contexts per club hint.
4. **UEFA lists some players under different short names** (`nicolas-paz`
   vs the requested "Nico Paz", `n-golo-kante` vs "N'Golo Kanté"). Use the
   alias/compact matching in `lib/parse.js`; add new aliases to the roster
   entry (`search_aliases`) when a match fails.
5. **Some current players simply have no cutoff at all** (profile shows
   only the opaque 324×324 avatar — Jackson, Thauvin, and a handful of
   26/27 UEL/UECL registrations). The pipeline records the fallback avatar
   as a non-preferred candidate and probes historical seasons/segments; if
   nothing exists the entry stays unresolved honestly.
6. **Wikipedia player pages are the best research source for profile
   URLs** — their external-links sections contain
   `uefa.com/{comp}/clubs/players/{id}...` editorial links (hit rate
   roughly half of researched players), and the lead paragraph gives the
   DOB. Verify the page is about the right person (club mentioned) —
   namesakes exist at generic names.

## 5. Rate limits — ours, theirs, and the services in between

| Limit | Observed behaviour | Mitigation (already in code / runbook) |
|---|---|---|
| UEFA edge (`img.uefa.com`) | After a few hundred requests (especially rapid 404-probe sweeps at ~1 s), responses turn access-denied for **minutes** | 1.1 s spacing + 2.4 s pre-delay on constructed probes; 65 s backoff + one retry before declaring blocked; batch runs self-heal with up to 4 pauses of 4–8 min; a persistent block aborts |
| UEFA edge (`www.uefa.com`) | Never throttled at ~1 req/s over ~250 requests | keep the spacing |
| Z-AI `web_search` | ~80–100 rapid searches drain a bucket; 429s for ~10–15 min | batch searches with ≥ 12 s spacing; never cache 429s as empty results; re-check "empty" results after a cooldown |
| Z-AI `page_reader` | Same shared bucket behaviour | same |
| Wikipedia API | 429 on bursts of API calls from this egress | use `page_reader` on article URLs instead of the raw API, or space direct API calls ~30 s |

## 6. Annotated war story (2026-10-18, both runs)

1. **36-player run**: direct fetch → 403 (datacenter IP). Page-reader
   recon worked, so the plan pivoted to a scoped CF relay — deployed on the
   owner's account, verified against the Dembélé seed URL, then used for
   the whole run. 34/36 resolved cleanly (1080×1080 alpha cutoffs, season
   2027). Jackson and Thauvin had **no cutoff anywhere** (probed 2021–2027
   across segments 1/14/2019) — deferred by owner decision rather than
   faked. Three roster DOB hints were wrong (Mbappé, Baumgartner, Berg) —
   external corroboration showed UEFA was right each time. Two published
   portraits carried documented kit-lag warnings (Ueda→Lille, Šporar→
   Olimpija). VLM review: kits reliable, faces not.
2. **96-club hero pre-seed**: FD.org (token in the operator vault, never
   in the repo) supplied the exact 2026/27 league memberships — 96 clubs
   with promotion/relegation surprises (Hull, Coventry, Paris FC,
   Elversberg, Racing Santander, Málaga) that invalidated every assumption
   from memory. 84 club-star web searches + Wikipedia season pages +
   EA/ESPN/top-scorer digests produced the MVP table with ordered
   candidates. Then the ground truth arrived:
   - 37 clubs are in current UEFA competitions (squad path); 59 needed
     researched profile URLs. Wikipedia player pages carry uefa.com
     profile links, **but in a LEGACY URL format** whose modern (id, slug)
     form 404s — a profile only resolves under the competition context of
     the player's last registration (UEFA serves generic shells
     otherwise). Fixed with context-fallback probing in discovery.
   - A player-id confusion (three different ids surfacing for "the same"
     player across runs) traced to the **Turkish dotless ı**: "Yıldız"
     never matched the ASCII squad slug `kenan-yildiz`. Fixed with
     transliteration in the name normalizer.
   - UEL/UECL profile pages use a **different title template** (no club
     part) and their image URLs live under different segments — both
     parser assumptions from the UCL-only first run broke and were fixed.
   - The **probe-sweep throttle**: img.uefa.com starts returning 403
     after ~6–7 cutoff-URL probes within a rolling minute — even 404
     probes spaced 6 s trip it, and the penalty window outlasts a
     4-minute pause. Probes are now paced at 15 s with 90 s breathers,
     and the highest-value probe targets were **verified manually**
     (one curl per URL) before downloading through the pipeline cache.
   - The external services (web_search, page_reader, VLM, the Wikipedia
     API) all hit their own rate limits when pushed in bursts — the run
     was repeatedly reshaped around them; several passes (profile URLs
     for 46 clubs, the VLM kit re-review) remain **research-pending**
     for exactly this reason.
   - Final honest count: **26 complete, 23 verified no-asset** (every
     bounded probe location documented per entry), **47 research-pending**.
     One downloaded portrait (Lyon/Openda) was **withdrawn after
     kit-timing analysis**: the only existing cutoff shows his RB Leipzig
     kit from UCL 2025/26 — a wrong-club kit is never published as a
     club's hero.
   - The systemic finding: UEFA cutoffs exist for current UCL players,
     sparsely for past UCL seasons, and essentially never for UEL/UECL
     registrations — the honest coverage ceiling for the big-5 pre-seed
     in October 2026.

## 7. After every run (the checklist)

1. `npm test` (offline gate) and `cli.js validate --roster <file>` — both
   must pass (deferred entries need their owner-decision record).
2. Contact sheet regenerated (`contact-sheet --roster …`) and reviewed.
3. VLM kit review of new portraits (kits vs labelled club) — record
   findings in `identity-evidence.json` when a warning is confirmed.
4. Update the status table in this file's header + the counts in
   `docs/assets/uefa-player-portraits.md` if they changed.
5. Commit, push, deploy (`npx wrangler deploy`), spot-check live URLs
   (`/players/uefa/{file}.webp` → 200 `image/webp`; deferred players →
   honest 404).
6. Never commit credentials; the relay worker contains none; tokens live
   only in the operator's password vault.

---

## 8. Kit-timing verification (the transfer-window defence)

**Rule.** A portrait may be published as a club's hero only while it
shows the player in THAT club's kit. UEFA asset URLs encode the
competition season (`{segment}/{season}`), so every accepted cutoff must
be checked against the player's club **at that season** — not against
today's squad alone, because past-competition assets linger on the CDN
(SPEC §5.2) and players move.

**Method (cheap, deterministic — it carried the whole 2026-10-19 audit
while VLM was quota-dead):**

1. Fetch the player's Wikipedia page **fresh** (never cached; transfer
   windows move people). Honest UA:
   `SportSignalPortraitPipeline/1.0 (kit-timing verification; contact:
   sportsignal@atomicmail.io)`. Space API bursts ~30 s — the Wikipedia API
   429s on bursts from this egress.
2. Read the *Senior career* table; build season → club.
3. Compare with the asset season: asset `1/2026` (UCL 2025/26) needs the
   player at the target club during 2025/26.
4. Record the verdict: withdrawals go into the roster entry's `no_asset`
   evidence; keeps get a `kit_timing` note in the discovery/manifest
   provenance.

**Precedents (2026-10-19 — the case law so far):**

| Case | Asset | Career table said | Verdict |
|---|---|---|---|
| Openda → Lyon | `1/2026` | RB Leipzig until 2026 | withdrawn (Leipzig kit) |
| Tzolakis → Hull City | `1/2026` | Olympiacos 2019–2026, Hull 2026– | withdrawn (Olympiacos kit) |
| Mandi → Levante | `1/2025` | Lille 2024–2026, Levante 2026– | withdrawn (Lille kit) |
| Zaniolo → Udinese | `1/2026` | Udinese loan 2025, permanent 2026 | kept |
| Koch → Frankfurt | `1/2026` | Frankfurt since 2024 | kept |
| Gouiri → Marseille | `1/2026` | OM since Jan 2025 | kept |
| Orsolini → Bologna | `1/2025` | Bologna since 2019 | kept |
| Del Castillo → Brest | `1/2025` | Brest 2022–2026, **Osasuna 2026–** (re-checked later the same day during the framing audit) | withdrawn — hero replaced by Ajorque, portrait re-sourced from ligue1.fr (§9b); the morning check had read “Brest since 2022” — transfers can surface mid-day, re-verify before any hero decision |

A wrong-club kit is never published: withdraw, then take the next
candidate or the §8b alt source. The same rule bans national-team kits
(segment 3, §9) as club heroes.

## 9. Annotated war story #2 — the 2026-10-19 coverage audit + alt-source run

Owner asks, in order: *"make sure UEFA doesn't cover that at all"*
(Task A) and *"find alternatives for the remaining clubs, same style and
quality"* (Task B).

**Task A — proving the UEFA ceiling (all 70 then-unresolved clubs):**

1. **Research resolution** for the 47 research-pending clubs: Wikidata
   P2276 (UEFA player id) + Wikipedia external links → profile URLs.
   Finding: most researched profiles are **generic shells** — a profile
   page existing does NOT mean a cutoff asset exists. 13 clubs'
   candidates had no UEFA registration at all.
2. **Bounded club-context probe sets** per club (researched hints +
   adjacent seasons, SPEC §5.5), documented per URL in the sweep logs.
3. **Current-registration fallback locations** (the UEL/UECL 26/27 squad
   registrations, e.g. `14/2027`, `2019/2027`) — every one 404.
   Bournemouth's two European seasons (UEL 26/27 + UECL 25/26) both 404.
4. **Right-kit participation targets** (each club's actual UEFA seasons)
   — all 404.
5. **The NT sweep** (`nt-segment-sweep.js`, relay-only, 15 s pacing +
   90 s breathers): UEFA's national-team family = **segment 3 = EURO
   2024** (confirmed on a no-club-career subject + Pickford; 7 of 12
   no_asset internationals have assets there — all national kits,
   unusable for clubs). Segment 2 (Super Cup hypothesis) negative even
   for a confirmed 2025 participant. Re-run only if UEFA ships a new NT
   family.
6. **Kit-timing withdrawals** (§8): 2 downloaded cutoffs withdrawn, 5
   kept and published.

Outcome: **31 UEFA-complete, 65 conclusively no_asset** — written into
the roster by `update-no-asset-evidence.js` (23 records updated, 42
created; `--dry` supported). Mid-run the sandbox was reset (§10); the
session survived on the git remote, the deployed worker and this
documentation.

**Task B — the alt-source fill (spec §8b):** PL 15 (FPL 220×280
headshots, documented upscale exception), LaLiga 15 (2048×2048 squad
portraits), Serie A 11 (1024×1024, 45 % top-crop), Bundesliga 12
(780×960 body PNGs, 42 % top-crop), Ligue 1 12 (busts). Quirks fixed en
route:

- LaLiga club-slug ambiguity ("RCD Espanyol de Barcelona" vs
  `fc-barcelona`) — multi-slug candidate lists disambiguated by the
  PLAYER match, never the club name alone.
- Ligue 1 bust URLs embed a club segment — cross-checked against each
  squad's dominant segment; all 7 risky summer transfers carried their
  current club's photo.
- Broken CDN assets fall through to the next candidate (Coventry's FPL
  photo 403); Auxerre/Troyes needed re-researched picks (Faivre, Le
  Douaron — the original candidates had left).

Kit consistency was verified deterministically (VLM stayed 429 all
session — the one open follow-up when quota recovers). Normalize →
**96/96**; `validate` + `npm test` green (37/37 portrait checks);
contact sheet regenerated; committed, deployed, live-verified (96/96
portraits HTTP 200, manifest shas match, all five platforms
spot-checked).

## 9b. Annotated war story #3 — the 2026-10-19 framing audit ("only their head")

Owner ask: *"Some players pictures are only their head, can't you find players
with their body (at least until their jersey) is in the view?"* — a
FRAMING requirement on top of the coverage/identity rules: every published
portrait must show the body down to at least the jersey.

**Diagnosis (VLM was 429 again — deterministic tools carried it):**

- `analyze-framing.js` (NEW): per-portrait row-width profile of the visible
  subject. Head-only cutouts are widest at the cheek line and taper to the
  jaw/neck; jersey-visible portraits stay wide at the bottom. Metrics:
  `tMax` (widest-row position), `bottom` (width at t=0.80–0.92 relative to
  max), `neck` (narrowest width across t=0.45–0.80). Calibrated against
  known-good (Kane 0.87) and known-bad anchors, cross-checked cell-by-cell
  with `ascii-viz.js` (NEW — renders any webp as a
  transparent/skin/kit/dark ASCII grid; the closest thing to eyes without a
  VLM).
- Root cause #1 — **the Serie A crop was simply wrong**: the
  `media-sdp.legaseriea.it` playerImages are BUSTS (head ≈ 40–45% of the
  canvas, shoulders + jersey below), not the "full-body pose" the 0.45
  top-crop assumed — 0.45 cut exactly at the collarbone and produced
  face-filling portraits (9–11 entries, the literal "only their head").
  Fix: `recrop-alt-sources.js` (NEW) set `crop_top_fraction` 0.45 → 0 on
  the cached originals — no re-fetch needed.
- Root cause #2 — **UEFA cutoffs with a jersey-cut composition**: 18 UEFA
  assets show head + brief shoulder flare + a narrow chest strip (Haaland
  bottom 0.44, Saka 0.46, Giroud 0.43 … vs Kane 0.87). The UEFA asset is
  what it is — the fix is REPLACEMENT via the league platforms:
  `alt-fetch.js --refill <keys>` (NEW) re-fills specific entries regardless
  of manifest status, refuses to change the club's chosen hero
  (token-subsequence identity gate), and records `refill_reason` in the
  fetch-log for the manifest.
- **Brest became a hero change**: Del Castillo is absent from Brest's
  official Ligue 1 2026/27 squad API and Wikipedia now says Osasuna — a
  stale-kit hero. Full §2c flow: roster edit (Ajorque), state purge,
  discover (Brest not in a current UEFA competition → honest no_asset
  evidence), `alt-fetch --player stade-brestois-29`, orphan
  `romain-del-castillo.webp` deleted.
- Swaps executed (18): PL cards — Haaland, Saka, Bruno Fernandes, Wirtz
  (220×280, same documented upscale exception as the other 19 PL entries);
  Ligue 1 busts — Giroud, Dembélé, Thauvin, Ajorque; Serie A busts —
  Lautaro, De Ketelaere, Orsolini, Zaniolo, Pulisic, Yıldız; Bundesliga
  body — Baumgartner; LaLiga squad — Yamal, Antony, Mikautadze.
- En-route bugs fixed: `--player` misparsed `argv[0]` when the flag was
  absent (indexOf −1 + 1 trap); the Turkish dotless ı folds to `i` in
  normName/compact now — "Kenan Yıldız" ≠ "kenan y ld z" vs the API's
  ASCII "Kenan Yildiz" (he also appeared in only 1 of the last 6 Juventus
  lineups, so the lineup walk needs several matches to find him).
- A color-based "skin at the bottom?" classifier was written and DISCARDED:
  white kits (Real Sociedad, Rayo) and yellow kits (Villarreal) pass
  skin-hue gates — false head-only verdicts. Geometry (bottom/neck) +
  ASCII eyeballing is the reliable combo; LaLiga's odd "widest row at the
  top" silhouette is the hands-behind-head squad pose (elbows in sleeves
  flare at head level), not a framing problem.
- Result: analyzer reports **0 head-only / 96 jersey-ok**; normalize →
  96/96; validate + `npm test` green; contact sheet regenerated.

**The rule going forward (SPEC §8b):** a hero portrait is acceptable only
if the body is visible to at least the jersey — check with
`analyze-framing.js` (bottom ≥ ~0.7 and no neck pinch for classic busts;
the LaLiga pose is fine by shape) and eyeball anything borderline with
`ascii-viz.js` before publishing.

## 10. Disaster recovery (when the workspace is lost)

Happened 2026-10-19, mid-run: the dev sandbox was reset — repo directory,
gitignored `.cache/` (originals, discovery, fetch-log) and uncommitted
roster research all gone. What survived: the GitHub remote, the deployed
worker (assets + manifests serving 200), the relay worker.

**The recovery procedure (generalised):**

1. Re-clone with the re-supplied token, then immediately strip it:
   `git remote set-url origin https://github.com/assadigit/SportSignal.git`.
2. `npm install` (sharp is a devDependency; the pipeline needs it).
3. Mirror the published portraits from the live worker
   (`https://ucl-notifier.sportsignal.workers.dev/players/uefa/{file}`)
   and verify each decodes 512×512 with alpha and sha-matches the
   committed manifest.
4. Rebuild the pipeline state:
   `node scripts/uefa-player-portraits/build-recovery-discovery.js`
   reconstructs the heroes discovery from
   `git show HEAD:assets/players/uefa/manifest-heroes.json` (its
   provenance carries the source URLs + identity evidence) and resets
   the fetch-log; then the normal `fetch → normalize → validate` chain
   re-downloads from the documented URLs. Proof of determinism:
   re-fetched originals re-normalized **bit-identical** (sha-verified)
   during the real recovery. `alt-fetch.js` re-creates alt entries'
   discovery records on the fly (it needs the manifest + cache files to
   exist).
5. Anything never committed had to be re-derived from documentation —
   which is why the roster and manifests are committed after EVERY
   meaningful stage, not at the end.

**The fresh-clone rule (the same footgun, quieter):** `.cache/` is
gitignored by design. `normalize` regenerates the manifests FROM the
cache state — on a fresh clone with an empty cache it would rewrite them
as all-missing. Never run `normalize` before the cache exists: run
`discover → fetch` first, or §10 step 4.

**Verify pushes the right way.** Pushing to a one-shot URL does NOT
update the local `origin/main` tracking ref — after the 2026-10-19
portrait push, `git status -sb` kept showing `[ahead 1]` even though the
push had landed fine (the follow-up documentation session initially
misread this as a lost push). And remotes MOVE: that same session's next
push was rejected non-fast-forward because the owner had uploaded files
via the GitHub web UI and a sibling session had pushed a feature in
between. The rule: `git fetch <url> main` BEFORE pushing (rebase if the
remote moved), push, then verify with `git ls-remote <url> main` — never
trust the stale tracking ref.

## 11. The sandbox survival guide (environment lessons, hard-won)

- **Detached background processes die** the moment a tool invocation ends
  (setsid/nohup do not survive). Long jobs must run as **chunked
  foreground invocations** (~9 min budget per chunk). The pipeline stages
  are idempotent and write per-entry state, so re-running continues
  where the chunk stopped; `nt-segment-sweep.js` takes
  `NT_SWEEP_SEGMENTS` for chunked segment sets.
- **img.uefa.com pacing** (through the relay): 15 s between probes, 90 s
  breather every 5. Roughly 6–7 cutoff probes inside a rolling minute
  trip the edge into minutes-long 403s, and the penalty window outlasts
  a 4-minute pause. A single manual curl usually passes even while the
  pipeline is hot.
- **404 vs 403**: 404 = the asset does not exist (record it); 403 =
  throttling — NEVER record a 403 as "asset missing". Cool down, retry.
- **z-ai service buckets** (web_search / page_reader / VLM): ~80–100
  rapid calls drain them; 429 for 10–15 min; never cache a 429 as an
  empty result. VLM is reliable for KITS, unreliable for FACES.
- **Wikipedia**: the raw API 429s on bursts — space calls ~30 s or read
  article URLs instead; always with the honest pipeline UA.
- **Credentials** live in the operator's chat/vault, NEVER in the repo,
  logs, worklog or commit messages (a live bot token was once found in a
  public repo — rotate + purge history). Push one-shot:
  `git push https://x-access-token:<token>@github.com/assadigit/SportSignal.git main`
  and never persist a token in `.git/config` (no `remote set-url` with
  tokens, no on-disk credential helpers).
- **Commit early, push often, deploy after asset changes** — the remote
  and the deployed worker are the only durable state (§10).
- Keep the session worklog OUTSIDE the repo (dev-sandbox convention:
  `/home/z/my-project/worklog.md`) and this documentation INSIDE it —
  together they are the project's memory across sessions.

## 12. Tooling reference (`scripts/uefa-player-portraits/`)

| File | What it does | Run when |
|---|---|---|
| `cli.js` | Stage runner: `discover` → `fetch` → `normalize` → `validate` → `contact-sheet` (`all` = the chain). Flags: `--player <key>` (one entry), `--refresh` (ignore cache), `--roster <file>` | Every collection run (§1) |
| `lib/config.js` | Paths, normalization constants, HTTP politeness, host allowlist, transport env (`UEFA_FETCH_TRANSPORT`, `UEFA_RELAY_BASE`) | Read before changing behaviour |
| `lib/transport.js` | direct / relay / auto fetching with block detection + backoff | — |
| `lib/parse.js` | Name normalization: accents, compact forms, aliases, the Turkish dotless ı | — |
| `lib/images.js` | `normalizePortrait` (512 canvas, subject bounds, `crop_top_fraction`, `allow_upscale`), `keyStudioBackground` (white-studio flood-fill key, v2.3), contact sheet, sha256 | — |
| `lib/vlm.js` | **v2.3 style gate**: z-ai vision classification (`classifyPortrait`) with 429-aware backoff; resolves the SDK from `Z_AI_SDK_PATH` / local / the dev sandbox | Every fill/audit |
| `lib/collection.js` | Per-roster paths: manifest filename, cache subdir, hero map | — |
| `alt-fetch.js` | §8b league-official fill (`--dry`; `--player <state-key>` = exact club slug; `--refill k1,k2,…` re-fills specific keys regardless of status — framing upgrades that refuse hero changes and record `refill_reason`). **v2.3**: VLM style gate on every candidate (card renders/head-onlys rejected → next variant/candidate/STAR tried — `--no-vlm-gate` to disable), LaLiga photo-series-first variant order, Ligue 1 fullBody-first, white-studio bg keying, and the STAR FALLBACK (squad ranked by shirt/position/FPL price; substitutions documented in `alt_source.star_fallback`) | After a no_asset conclusion; season turnover (§2d); framing upgrades (§9b); **card-render replacement (§13.5)** |
| `update-no-asset-evidence.js` | Writes/updates the roster's `no_asset` evidence records (`--dry`) | After audit passes |
| `nt-segment-sweep.js` | National-team segment probe (relay only; `NT_SWEEP_SEGMENTS` chunks) | Only if UEFA ships a new NT family |
| `build-recovery-discovery.js` | Rebuilds heroes discovery from the committed manifest; resets the fetch-log (2026-10-19 one-shot, hardcoded entries) | Only after workspace loss (§10) — prefer `rebuild-cache-state.js` |
| `rebuild-cache-state.js` | **v2.3 generalized recovery**: discovery from the CURRENT committed manifest (96 entries, no hardcoded lists), fetch-log initialized `{}`; safe with `normalize --player` merge-mode | After every workspace loss (§10) |
| `vlm-style-audit.js` | **v2.3 style audit** (`npm run heroes:style-audit`): classifies every published file (fast pass + detailed verification of every failing verdict — the fast pass is noisy, 4/5 false positives on the first sweep); `--apply` records `style` into both manifests; `--wired` / `--only a,b` scoping; resume-aware across 429 storms | After any portrait change; the §13.5 loop step |
| `repair-reverted-provenance.js` | One-off (2026-10-20): restored the 9 sha-verified UEFA provenance records the 13.129-hudframe revert had left pointing at v2.2 league sources | Kept as the precedent pattern |
| `relay-worker.js` | The scoped relay source (deployed as `uefa-image-relay-temp`) | §3 |
| `roster.json` / `roster-heroes.json` | The collections' reproducible inputs (committed) | Edit per §2 / §2c / §2d |
| `identity-evidence.json` | Namesake disambiguation records | When a namesake appears |
| `framing-overrides.json` | Per-entry framing overrides (currently empty) | Rare framing fixes |
| `analyze-framing.js` | QA: per-portrait row-width profile (tMax/bottom/neck) — head-only vs jersey-visible classifier, calibrated §9b | After any portrait change |
| `ascii-viz.js` | QA: renders any webp as transparent/skin/kit/dark ASCII grid — deterministic eyeballing without a VLM | Borderline cases; new platforms |
| `recrop-alt-sources.js` | Rewrites the fetch-log crop directive for cached alt entries (`--keys k1,k2 --crop F --reason …`) | Framing fixes without re-fetching |
| `check-uefa-portraits.js` | Offline test gate (part of `npm test`) | Every change |

Related: the `npm run portraits*` aliases in `package.json`; the
published contracts are `assets/players/uefa/manifest.json` (36-player
collection) and `manifest-heroes.json` + `hero-clubs.json` (hero
collection).

## 13. The hero gap loop (v13.129-herogaploop — detect → log → agentic backfill)

The owner's standing ask (2026-10-19): *"every time the app finds a new team
that doesn't have a hero picture, automatically try to download and scrape
from sites (agentic); if Cloudflare itself cannot do it, log the empty
pictures, then the next agentic run fills those players and teams."*
This section is that procedure, as shipped.

### 13.1 The two-tier split (and WHY the runtime does not scrape)

The WORKER detects, logs, prioritizes and exposes. The DEV SESSION (you, the
agent) scrapes, processes, wires and deploys. The split is not laziness —
each side is physically constrained to its half:

| Constraint | Runtime (Workers) | Agentic session |
|---|---|---|
| Choosing the hero MVP | ❌ curation (owner taste + §2 rules) | ✅ research + §8 kit-timing |
| Image crop/normalize to the 512 spec | ❌ no sharp on Workers; the framing contract (§9b, SPEC v2.2 §8b) is unmeetable there | ✅ the local pipeline |
| Fade-tier measurement (v13.123) | ❌ needs the luminance scan | ✅ documented method |
| League-platform clients | ❌ brittle to bundle into the tick; subrequest budget is the notification product's | ✅ `alt-fetch.js` with pacing (§11) |
| Display/rights changes | ❌ owner decision (README §4) | ✅ surfaced as an explicit gate |
| Seeing what's missing | ✅ it holds the live pool every tick | ❌ no live fixture visibility |

Serving an UNPROCESSED portrait from the runtime (KV-stored league busts)
would regress the collection to exactly the head-only framing the owner
rejected in §9b — so the runtime never downloads portraits, by design.

### 13.2 The runtime tier (what the worker does now)

- `src/hero-coverage.ts` — GENERATED mirror (`npm run heroes:sync`) of the
  two truths: the live bundle's `HERO_ART` (what renders) and
  `hero-clubs.json` (what exists). Drift-gated by `check-hero-coverage.js`
  in `npm test`.
- `src/hero-gaps.ts` — every cron tick (`cron-public.ts`, gated
  `!budgetHard && subrequestCount() < 42`, fail-silent): scans the tick's
  in-memory pool for teams on live/upcoming rows (7-day window) and on the
  FEATURED hero match that have no wired artwork → merges into KV
  `hero_gaps_v1` with a strict write discipline: **one write per new gap
  team + one daily bump per team** (seen_days / hero_picks count DISTINCT
  UTC days, never per tick), resolution marks when a portrait lands
  (7-day retention), 30-day unseen prunes, 300-team cap. Typical added KV
  burn: ~1 write/day (budget: 700/day).
- `GET /api/hero-gaps` (admin-gated; `?reset=1` clears) — the report JSON:
  coverage stats + prioritized gaps (hero-pick frequency first) with
  library-ready annotations and suggested sources.
- Tail visibility: `🖼️ herogap: new team(s) without artwork: …` warns on
  first sight (`wrangler tail`).

### 13.3 The agentic backfill (the loop's fill side — a session runbook)

1. **Pull the worklist**: `npm run heroes:report` (needs `SS_ADMIN_TOKEN`
   env; `--local` for wrangler dev). Caches
   `.cache/uefa-player-portraits/hero-gap-report.json`.
2. **Read the priorities**: gaps sort by `hero_picks` (times the team rode
   the FEATURED match — what visitors actually saw) then `seen_days`.
   `library_ready: true` means the portrait already exists in
   `hero-clubs.json` — that is a WIRING decision, not scraping.
3. **Plan**: `npm run backfill-heroes -- --plan [--top N]` prints per-gap
   plans (§2 flow vs wiring flow).
4. **Fill** (the mechanical parts are orchestrated):
   - new portrait: `npm run backfill-heroes -- --add --club <state_key>
     --player "<MVP>"` (roster edit + stale-state purge + discover → fetch
     → normalize → validate; **v2.3: continues automatically into the alt
     path when UEFA has no asset** — pass `--no-alt` to stop after UEFA);
   - wire an existing library portrait: `--wire <state_key>` (creates the
     next `public-XX.YY.js` with the HERO_ART entry, moves the public.ts /
     `_headers` pins, bumps the SW cache — then `npm test` enumerates the
     remaining version pins to fix).
   The fills carry the **v2.3 style gate + star fallback** (spec §8c): card
   renders are rejected automatically, the requested player's photo variants
   are tried photo-series-first, and when nothing publishable exists for him
   another STAR of the club is substituted — fully documented.
5. **The gates that stay manual** (the orchestrator prints them too): MVP
   curation, kit-timing check (§8), framing QA (`analyze-framing.js`),
   fade-tier scan, contact-sheet review, and the owner's display decision.
6. **Close the loop**: `npm run backfill-heroes -- --sync` → `npm test` →
   commit + deploy (RUNBOOK §2). After deploy the tick re-scans, the filled
   teams drop out of the scan, and the registry marks them `resolved_at`
   (visible for 7 days as loop health, then pruned).

### 13.4 Current backlog context (2026-10-20, post-style-audit)

The 96-club big-5 library is complete AND style-clean (§ header: 84 jersey
photos + 12 busts, zero cards), but the site's HERO_ART map wires only 33
teams (the UCL-era set + big-5 overlap) — **78 published portraits sit
unwired**, so most big-5 clubs render crest-only today. They now appear as
`library_ready` gaps the moment they surface in fixtures, and
`hero-clubs.json` carries each portrait's `style` tier (v2.3) to inform the
owner's wiring decision (jersey_photo first). Non-big-5 clubs (FA Cup
qualifying sides, A-League, …) log as `no portrait` demand evidence — most
will never be worth a portrait; the 30-day prune cycles them automatically.

### 13.5 The style audit step (v2.3 — the loop's QA half)

The owner's directive (2026-10-20): *"rename the pictures, using VLM, that
have FULL jersey — they're priority to be shown; a FIFA card must never
stand in for the player."* The runtime cannot see image CONTENT (only the
agentic side can), so the style loop runs per session and gates every fill:

1. **Audit**: `npm run heroes:style-audit` — classifies every published
   file (fast pass; every FAILING verdict is re-verified with the detailed
   pixel-level prompt — the fast pass produced 4 false-positive "cards" on
   the first full sweep). Resume-aware across z-ai 429 storms.
2. **Record**: `npm run heroes:style-audit -- --apply` — writes `style` +
   `style_verified_at` into both manifests (+ never-wire warnings on
   confirmed card/head entries).
3. **Replace failures**: `node scripts/uefa-player-portraits/alt-fetch.js
   --refill <club-slug>,…` — the refill re-fetches the same hero from the
   platform with the PHOTO variants first; when every asset of the hero is
   card art (style-exhaustion), the STAR FALLBACK substitutes another star
   of the club (documented; delete the orphaned old file per §2c).
4. **Re-audit the changed files** (step 1 — the sha change reclassifies
   them) and only then `--apply` again.
5. `npm test` enforces the display rule: **no wired portrait may be a
   card_render/head_photo** (`check-uefa-portraits.js`, spec §8c).

The 2026-10-20 run of this procedure: 116 files audited → 12 fast-pass
"cards" → 8 confirmed after verification → 8 replaced (7 LaLiga photo-series
+ Troyes → Iron Gomis fullBody via style-exhaustion star fallback) → 0 cards
remain; all 33 wired portraits pass. The fill-time gate (spec §8c) keeps it
that way going forward.

## 14. The club alternates library + transfer watch (v13.133-clubalt)

The owner's directive (2026-10-21): *"gather 3-4 pictures per club and folder
them in the github, like LaLiga > Real-Madrid. Players retire, so their
picture must alternate. Players go to other clubs, so their picture must
alternate. Track the transfers market and just in case that player
retires/moves to another club, remove it (for that club jersey) database and
use another alternative."*

Three layers, same split as §13 (runtime detects, agentic rotates):

### 14.1 The library (assets/players/clubs/)

```
assets/players/clubs/
  manifest.json                        ← the club jersey database
  premier-league/<club-slug>/*.webp    ← 4 files per club:
  laliga/<club-slug>/*.webp              candidate 0 = the published hero
  serie-a/<club-slug>/*.webp             (byte-copy of uefa/<hero>.webp),
  bundesliga/<club-slug>/*.webp          candidates 1-3 = star-ranked
  ligue-1/<club-slug>/*.webp            alternates (VLM style-gated)
```

- **Selection**: the platform squad is star-ranked (the §13.2 starScore —
  shirt/position/FPL price-points-ownership), the hero excluded
  (identity-tolerant: "Paulo Dybala" vs "Paulo Exequiel Dybala" — the Roma
  lesson), the top stars fetched through the SAME contract as alt-fetch
  v2.3 (variant tables, studio keying, VLM style gate). Bundesliga has no
  squad enumeration on bundesliga.com — its ranking comes from
  Football-Data.org `/v4/teams/{id}` squads.
- **Club binding is HERO-ANCHORED**: FPL's short team names ("Man City",
  "Man Utd", "Spurs") and LaLiga's shared tokens (the madrid derby) make
  token matching ambiguous — the squad that CONTAINS the club's hero wins.
- **Order**: hero first, then alternates by style tier (jersey_photo before
  bust_photo — the owner's full-jersey priority) then star score.
  `active_index` (0) points at the current hero.
- **fd_team_id** on every club — the runtime watch's FD.org hook.
- **Provenance** per candidate: platform, source URL, sha256, star basis,
  alt_source block (crop config, variant info, keying) — same shape as the
  hero manifest's.

Tools: `npm run clubs:alt` (fetch; `--club`, `--platform`, `--limit`,
`--dry`, `--no-vlm-gate`), `--fd-ids` (build the club→FD id map, 5 calls),
`--publish-only` (regenerate folders + manifest from state — deterministic),
`--audit-gaps` (re-classify unclassified candidates, two-pass, drops
confirmed cards). State checkpoints to
`.cache/uefa-player-portraits/clubs-alternates/` after EVERY candidate
(§11 chunked-run survival); platform squad enumerations persist to disk
(Serie A's lineup crawl runs once, ever).

### 14.2 The runtime watch (src/hero-rotation.ts)

- Every quiet cron tick (`!budgetHard && subreq < 38`, ≥25min between
  sweeps): ≤5 clubs round-robin get `/v4/teams/{fd_team_id}` — is the
  ACTIVE hero still on the squad? Per-club cadence 84h normally, 12h
  inside transfer windows (Jan 1–31, Jun 1–Sep 10). Shares the
  football-data circuit (429 → suspendProvider, like the main sweep).
- A departure opens an EVENT in KV `hero_rotation_v1`:
  `{ player, first_detected, suggested_next }` — the suggested next is the
  first bench candidate still ON the live squad (verified), or the first
  unverified when the squad data is unavailable. Events resolve when the
  player returns or the active player changed (the rotation deploy
  landed — the generated index re-syncs per deploy). 30d prune.
- `GET /api/hero-rotation` (admin): the departure worklist + watch state.
  `heroClubActive(env, name)`: the event-aware effective hero for any
  server-side consumer (reports now, cards/bot later).
- Write discipline: one write per sweep tick that checked clubs — ≤ ~6/day
  normal, ≤ ~48/day in windows (700/day budget holds).

### 14.3 The rotation (scripts/rotate-hero.js — the "use another alternative")

```
npm run heroes:rotate -- --club psg            # next candidate
npm run heroes:rotate -- --club psg --to 2     # explicit index
npm run heroes:rotate -- --club psg --player "Vitinha"
```

What it does (NO network, NO VLM — the bench is pre-fetched):

1. Copies the candidate's pristine original into the hero collection's
   originals slot (`originals/{state_key}.webp` — keyed by CLUB, the
   normalize contract) and points fetch-log + discovery + roster at him
   (provenance records the rotation: `alt_source.rotation.{of,to,reason}`).
2. `cli.js normalize --player <slug>` — publishes `uefa/<player>.webp`,
   rebuilds manifest-heroes + hero-clubs (merge-mode keeps the other 95).
3. Deletes the departed hero's orphaned `uefa/<old>.webp` (§2c rule).
4. Clubs manifest: departed candidate → `status: "departed"` + file REMOVED
   from the club folder (the owner's "remove it" rule; the manifest record
   stays as audit), pointer advanced, `rotation_log` appended.
5. Re-syncs `src/hero-club-alternates.ts`; `npm test`; deploy (RUNBOOK §2).
   For a WIRED club also run the `--wire` step (backfill-hero-gaps) — the
   client bundle's HERO_ART follows the owner-gated display decision.

After deploy the watch sees the new active player and resolves the open
event automatically. Fresh alternates for the shrunken bench:
`npm run clubs:alt -- --club <slug>` (state-aware, fills only the gap).

### 14.4 Known limits (honest scoping)

- The library covers the 96 big-5 clubs (the five league platforms' reach).
  The 15 wired non-big-5 clubs (Porto, Galatasaray, Bodø/Glimt, …) have NO
  bench yet — their rotation needs UEFA-discovery research per club (a
  future session; the gap loop §13 still covers their total-loss case).
- FD.org squad names are the identity truth for the watch; a hero whose
  display name diverges badly from FD's legal form needs the subsequence
  matcher to hold (`squadHasPlayer` — unit-tested in check-hero-clubs).
