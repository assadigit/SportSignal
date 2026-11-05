# 2026-11-06 — SEO/GEO Phase-2 Session 3: entity grounding + LLM files (SS-05, SS-07)

Session scope per `docs/SPORTSIGNAL_SEO_GEO_SPEC_PHASE2.md` §4 (S3). This
note carries each checkpoint's live evidence; the close-out digest is at
the bottom.

## CP1 — SS-05 batch 1: team/competition entity grounding (v13.216-entitylinks)

Commit `dcb1f8c` (tag v13.216-entitylinks), deploy
`dda35a2d-6713-4399-af04-4dd87d66efbe`. Server-side only — no client asset
changed (bundle public-13.71.js / stylesheet public-13.81.css / SW
sportsignal-v112 stay).

What shipped (spec §3/SS-05):

- NEW `src/seo/entity-links.ts` — the static verified map:
  `TEAM_ENTITY_LINKS` (keyed by the canonical English team name exactly as
  the provider pool emits it — FD's legal forms today, e.g. «FC
  Internazionale Milano», «Club Atlético de Madrid», «Juventus FC», «Paris
  Saint-Germain FC» — plus the known provider-variant spellings that key
  the same club, per TEAM_SLUGS/config) and `COMP_ENTITY_LINKS` (keyed by
  the COMP_EN canonical name — the map key and the node name can never
  disagree). Every entry = `[English Wikipedia article, Wikidata entity]`.
- `src/seo/jsonld.ts` — `sportsTeamNode()` + `sportsOrganizationNode()` +
  the match pages' `SportsEvent.organizer` node consume the map (pure
  static lookup, NO render-time fetching, rule §1.5). Unverifiable teams
  omit sameAs (rule §1.1).
- seo-check **T-18**: the 6 competition pages + the batch-1 team pages
  live in today's sitemap (up to 6 sampled) must carry sameAs with the
  Wikipedia+Wikidata pair, and EVERY sameAs URL is re-verified live: 200 +
  final URL identical + the served page's own `<link rel="canonical">`
  points back (rejects #REDIRECT articles, which answer 200 but are
  redirect pages). Wikipedia/Wikidata 429s get a dedicated pacer (700ms)
  + retries.

The fetch-and-confirm round (rule §1.1, all during this session):

- 6/6 competition Wikipedia URLs verified 200 + final==listed + canonical
  self. QIDs via the enwiki MediaWiki `action=query&prop=pageprops&
  ppprop=wikibase_item` API (never memory), cross-checked via
  `wbgetentities` (label + enwiki sitelink URL == the listed article), and
  each `wikidata.org/wiki/<QID>` fetched 200 + non-redirect.
- 20/20 team Wikipedia URLs verified the same way. THREE canonical-form
  corrections the round caught: `Juventus_F.C.`, `Paris_Saint-Germain_F.C.`
  and `Torino_F.C.` are #REDIRECT pages on enwiki (HTTP 200, but
  `wgRedirectedFrom` + the page canonical point at the undotted titles) —
  the map carries the canonical `Juventus_FC`, `Paris_Saint-Germain_FC`,
  `Torino_FC` forms instead. One transient Wikidata 429 (Q9617) cleared on
  retry — the rate-limit behavior T-18 now defends against.
- Batch 1 team selection (no GSC access this session): the followed-team
  priority list — config `BIG_TEAMS_BY_LEAGUE` (13 clubs) + the
  master-club bench in `TEAM_SLUGS` (Tottenham, Everton, Juventus, Roma,
  Lazio, Torino, Marseille) = 20; A-League clubs excluded
  (`SITE_HIDDEN_LEAGUES`). All 20 had live pages in today's teams sitemap.

### Evidence (live, 2026-11-06 after deploy dda35a2d)

- `npm test` → exit 0, **2,598 OK / 0 fail** (2,597 at S2 + the v13.216
  wiring pin).
- Node-builder sanity (esbuild-bundle harness): grounded team
  («Club Atlético de Madrid» →
  `["https://en.wikipedia.org/wiki/Atl%C3%A9tico_Madrid","https://www.wikidata.org/wiki/Q8701"]`),
  ungrounded team (Ferencvarosi TC → no sameAs key), comp CL grounded / comp
  EL (not in batch 1) omitted, match-page organizer carries the pair.
- `curl https://sportsignal.ir/competitions/{champions-league,premier-league,
  la-liga,serie-a,ligue-1,bundesliga}` — every SportsOrganization node now
  carries its pair, e.g. champions-league:
  `"sameAs":["https://en.wikipedia.org/wiki/UEFA_Champions_League","https://www.wikidata.org/wiki/Q18756"]`.
  (champions-league + premier-league initially served ≤900 s edge-cache
  copies — the S2 stale-while-revalidate lesson, NOT a bug: both turned
  green ~10 min later with no action.)
- `curl https://sportsignal.ir/teams/{arsenal,barcelona,
  internazionale-milano,bayern-munich,juventus,marseille}` — every
  SportsTeam node carries its pair keyed by the EXACT pool name, e.g.
  `"name":"FC Internazionale Milano"` → the Inter_Milan/Q631 pair;
  `/teams/ferencvarosi-tc` correctly carries NO sameAs (unverified → omit).
- `curl https://sportsignal.ir/matches/1-fsv-mainz-05-vs-bayern-munich-2026-11-07`
  — `"organizer":{… "name":"Bundesliga" … "sameAs":[
  "https://en.wikipedia.org/wiki/Bundesliga","https://www.wikidata.org/wiki/Q82595"]}`.
- `npm run seo:check` vs production → **PASS 142 / FAIL 0** (118 at S2;
  +24 = T-18's live URL re-verifications across the 6 comps + 6 sampled
  team pages). One pre-existing latent check bug found and fixed during
  the run: T-15's ISO-8601 regex rejected valid millisecond stamps
  (`2026-11-05T17:45:00.000Z` — first upcoming match today) — introduced
  v13.212, data-dependent (git-checked: the same run against v13.215's
  deployed data would have failed identically); the regex now accepts
  optional `.mmm`. The fix is check-side only and ships in the CP2 commit.

**SS-05 batch 1 status: VERIFIED.** (Batch 2 — more pool teams — remains
for later capacity, per the session plan.)
