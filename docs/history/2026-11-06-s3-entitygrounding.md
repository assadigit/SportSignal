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

**SS-05 batch 1 status: VERIFIED.** (Batch 2 below — capacity remained.)

## CP2 — SS-07: llms.txt expansion + llms-full.txt (v13.217-llmsfull)

Commit `4b7f526` (tag v13.217-llmsfull), deploy
`0ac6b109-ba3b-4149-9943-26bccb3695b7`. Server-side only — no client asset
changed (bundle public-13.71.js / stylesheet public-13.81.css / SW
sportsignal-v112 stay).

What shipped (spec §3/SS-07):

- `buildLlmsTxt` (`src/seo/files.ts`): the full page set (15 pages — the
  seven previous + tomorrow/this-weekend/about/contact/privacy/terms/
  sitemap) + the brand/entity block (what SportSignal is, the Telegram
  bot URL, the football-data.org source, the ~10-min pool cadence + ~1-min
  page cache, a pointer to the full file) + the machine-files section.
- NEW `buildLlmsFullTxt`: the entity block; the big-match selection rules;
  per-page-group descriptions (home, 5 hubs, match pages with the URL
  pattern + a real example, team pages, competition pages, info pages);
  full machine-data docs (every `/api/matches.json` field incl. real
  status values, calendar.ics VEVENT semantics, feed.xml shape, sitemap
  family); the football-data.org attribution (matching the live footer);
  an 8-Q&A distilled factual FAQ; a citing-SportSignal note. All English
  + Gregorian-only; concrete URLs are markdown links, patterns are code
  spans (the T-19 link contract).
- Serving: `/llms-full.txt` joins `PUBLIC_FILE_ROUTES`,
  `text/plain; charset=utf-8`, edge-cached via `wantCached`+`withEtag`
  (the v13.207 F-M5 machine-file discipline). First-draft placement of
  the handler BEFORE the `wantCached` declaration tripped tsc TS2448 —
  caught pre-commit (the S2 read/write-order lesson's second catch),
  moved after the declaration.
- The `/data` page lists the new file; `SEO.CONTENT_VERSION` bumped to
  `2026-11-06T12:00:00Z` (F-05: that page's hand-written text changed).
- seo-check: **T-19** (both files 200 as text/plain UTF-8; every
  markdown-listed URL exists — 44 links across both files, internal via
  fetchRaw + external via a paced/retrying fetcher) + T-15 extended to
  llms-full.txt (Gregorian-only). Folded in from CP1: the T-15 ISO-8601
  regex now accepts optional fractional seconds.

### Evidence (live, 2026-11-06 after deploy 0ac6b109)

- `npm test` → exit 0, **2,599 OK / 0 fail** (2,598 at CP1 + the v13.217
  wiring pin).
- `curl https://sportsignal.ir/llms.txt` → HTTP 200,
  `content-type: text/plain; charset=utf-8`,
  `cache-control: public, max-age=3600`; body carries the entity block,
  all 15 page links + the four machine-file links.
- `curl https://sportsignal.ir/llms-full.txt` → HTTP 200 + the same
  headers + `etag: "ss-d5ac5b3a246e"`; conditional GET with the ETag →
  **304**. Body: 143 lines, the sections per spec.
- Local render lint (esbuild harness): zero Shamsi month names in either
  file; 44 markdown links, 23 unique URLs, zero malformed; bare-domain
  `https://sportsignal.ir` confirmed 200 (no redirect), t.me +
  football-data.org confirmed 200.
- `/data` (after the ≤900 s SWR window): lists
  `/llms-full.txt — مستندات کامل ماشین‌خوان…`; the pages sitemap
  `<lastmod>` advanced to `2026-11-06T12:00:00Z` and ONLY that (F-05).
- `npm run seo:check` vs production → **PASS 189 / FAIL 0** (142 at CP1;
  +47 = T-19's 46 link assertions + the two content-type checks −
  overlaps). All T-18 assertions still green.

**SS-07 status: VERIFIED.**

## CP3 — SS-05 batch 2: 20 more grounded clubs (v13.218-entitylinks2)

Commit `039d4f1` (tag v13.218-entitylinks2), deploy
`7a27891e-14ae-4710-a6a0-b55ef660d40f`. Server-side only — no client
asset changed. Shipped per the session plan's "batch 2 if capacity"
clause (capacity remained after CP2).

`TEAM_ENTITY_LINKS` gains: SSC Napoli, Aston Villa FC, Newcastle United
FC, Atalanta BC, RB Leipzig, Bayer 04 Leverkusen, Villarreal CF, Real
Sociedad de Fútbol (+ Real Sociedad), Athletic Club (+ Athletic Bilbao),
Valencia CF, FC Porto, Sporting Clube de Portugal (+ Sporting CP), PSV (+
PSV Eindhoven), Olympique Lyonnais, AS Monaco FC (+ AS Monaco), Bologna
FC 1909 (+ Bologna), Real Betis Balompié (+ Real Betis), RC Celta de Vigo
(+ Celta Vigo), VfB Stuttgart, SV Werder Bremen (+ Werder Bremen) —
**40 grounded teams + the 6 competitions**.

Same fetch-and-confirm round: every article title is the canonical enwiki
form (the API redirects list came back EMPTY for all 20 — none is a
#REDIRECT page; where the club's legal name differs from the article
title — Athletic Club→Athletic_Bilbao, Real Betis Balompié→Real_Betis,
PSV→PSV_Eindhoven, Sporting Clube de Portugal→Sporting_CP — the article
title is what ships); QIDs from enwiki pageprops cross-checked via
`wbgetentities` (label + enwiki sitelink == the listed article); every
`wikidata.org/wiki/<QID>` fetched 200 + non-redirect (three transient
429s cleared on paced retry); every map key matched against the live
page's SportsTeam node name before shipping. seo-check T-18 additionally
samples up to 2 batch-2 pages per run.

### Evidence (live, 2026-11-06 after deploy 7a27891e)

- `npm test` → exit 0, **2,600 OK / 0 fail**.
- `curl` of the batch-2 pages (each after its ≤900 s SWR window — the
  pages flipped one by one over ~16 minutes, the expected edge-cache
  behavior, no action needed): ssc-napoli →
  `["https://en.wikipedia.org/wiki/SSC_Napoli","https://www.wikidata.org/wiki/Q2641"]`;
  aston-villa → Aston_Villa_F.C./Q18711; bayer-04-leverkusen →
  Bayer_04_Leverkusen/Q104761; athletic-club → Athletic_Bilbao/Q8687;
  valencia → Valencia_CF/Q10333; psv → PSV_Eindhoven/Q11938; monaco →
  AS_Monaco_FC/Q180305; real-betis-balompie → Real_Betis/Q8723.
- `npm run seo:check` vs production → **PASS 193 / FAIL 0** (189 at CP2;
  +4 = T-18's batch-2 sampling: ssc-napoli + aston-villa, both URL
  pairs re-verified live).

**SS-05 batch 2 status: VERIFIED.**

## S3 close-out

All session items VERIFIED live: SS-05 batches 1+2
(v13.216-entitylinks + v13.218-entitylinks2 — 40 teams + 6 comps
grounded, all URLs fetch-and-confirmed this session) and SS-07
(v13.217-llmsfull — llms.txt expanded + llms-full.txt). Three deploys
(dda35a2d → 0ac6b109 → 7a27891e). npm test 2,597 → 2,600; seo:check
118 → 193 assertions, all green. Deviations from the session plan:
none — batch 2 executed under the plan's capacity clause. Two latent
check-side bugs found and fixed along the way (the T-15 ISO-8601 `.mmm`
regex strictness; the first-draft llms-full handler placement caught by
tsc TS2448). Operational notes: Wikipedia/Wikidata rate-limit bursts
(429) need paced retries — now built into T-18/T-19; team/comp HTML
pages flip to the new graph only after their ≤900 s edge-cache window —
waiting, not debugging, is the correct response (the S2 lesson,
confirmed twice more this session).

Next (S4, per spec §4): **SS-06** (FAQ content + FAQPage schema),
**SS-09** (security.txt email), **SS-12** (one full 404), **SS-13**
(ItemList on /teams + /competitions), **SS-14** (Dataset on /data).
