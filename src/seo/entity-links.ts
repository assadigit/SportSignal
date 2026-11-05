// SportSignal — entity grounding map (SS-05, Phase-2 spec §3).
//
// The sameAs URLs for the SportsTeam / SportsOrganization nodes: the entity
// grounding that lets LLMs, knowledge panels and search engines connect our
// pages to the canonical web entities (GEO: an ungrounded site is an island
// no answer engine can cite with confidence).
//
// DESIGN (spec §3/SS-05):
// - A PURE STATIC MAP, keyed by the canonical English name exactly as the
//   provider pool emits it (plus the known provider-variant spellings that
//   key the same club), consumed by jsonld.ts at render time. NO
//   render-time fetching, ever (rule §1.5 — the HTML path stays KV-read
//   only). A team/competition whose URLs are not in this map simply omits
//   sameAs (rule §1.1: unverifiable → omit, never guess).
// - every entry = [English Wikipedia article, Wikidata entity]. Those are
//   the two canonical neutral identity hubs; fan sites, aggregator pages
//   and official sites (licence/contract-shy, often geo-redirecting) are
//   deliberately NOT used.
//
// PROVENANCE (rule §1.1 — fetch-and-confirm, 2026-11-06 session S3):
// - Each Wikipedia URL was fetched with redirect following: HTTP 200 AND
//   final URL identical to the listed URL AND the served page's own
//   <link rel="canonical"> points back at the listed URL. A #REDIRECT
//   article (HTTP 200 but a soft redirect page) is a FAIL and is not
//   listed — e.g. en.wikipedia.org/wiki/Juventus_F.C. is a redirect page
//   whose canonical is /wiki/Juventus_FC, so the undotted form is the one
//   this map carries. Percent-encoded forms are used where the title has
//   non-ASCII characters (Atl%C3%A9tico_Madrid) — the exact ASCII form
//   that was confirmed.
// - Wikidata QIDs were NOT taken from memory: they came from the English
//   Wikipedia MediaWiki API (action=query&prop=pageprops&
//   ppprop=wikibase_item) of the verified article, cross-checked via
//   wbgetentities (label + enwiki sitelink URL == the listed article),
//   and each https://www.wikidata.org/wiki/<QID> URL was itself fetched
//   and confirmed 200 + non-redirect.
//
// BATCH 1 (2026-11-06): the 6 competitions (CL, PL, PD, SA, FL1, BL1) +
// the 20 highest-priority teams — the followed-team priority list
// (src/config.ts BIG_TEAMS_BY_LEAGUE + the master clubs in
// src/slugs.ts TEAM_SLUGS, A-League excluded as site-hidden).
// BATCH 2 (same session, capacity remained): 20 more pool clubs with live
// team pages — the biggest Serie A / PL / La Liga / Bundesliga / Ligue 1
// contenders plus Porto, Sporting CP and PSV (40 grounded teams total).
// Later batches extend TEAM_ENTITY_LINKS under the SAME fetch-and-confirm
// rule.
//
// VERIFICATION RE-RUN RULE: URLs can rot (articles get renamed → the old
// title becomes a #REDIRECT). seo-check T-18 live-validates a sample
// against production; before adding entries, re-confirm. If an entry ever
// fails confirmation, DELETE it (omit sameAs) rather than linking a
// redirect.

// Teams: keyed by the canonical English team name (the provider pool's
// name — football-data.org's legal forms today) + the known provider
// variants (sportscore/TSP short forms) that denote the same club.
// Variant keys share one entry so whichever spelling the pool carries,
// the grounding resolves.
export const TEAM_ENTITY_LINKS: Record<string, string[]> = {
  // ---- Premier League (followed) ----
  "Arsenal FC": [
    "https://en.wikipedia.org/wiki/Arsenal_F.C.",
    "https://www.wikidata.org/wiki/Q9617"
  ],
  "Chelsea FC": [
    "https://en.wikipedia.org/wiki/Chelsea_F.C.",
    "https://www.wikidata.org/wiki/Q9616"
  ],
  "Manchester United FC": [
    "https://en.wikipedia.org/wiki/Manchester_United_F.C.",
    "https://www.wikidata.org/wiki/Q18656"
  ],
  "Manchester City FC": [
    "https://en.wikipedia.org/wiki/Manchester_City_F.C.",
    "https://www.wikidata.org/wiki/Q50602"
  ],
  "Liverpool FC": [
    "https://en.wikipedia.org/wiki/Liverpool_F.C.",
    "https://www.wikidata.org/wiki/Q1130849"
  ],
  // ---- La Liga (followed) ----
  "FC Barcelona": [
    "https://en.wikipedia.org/wiki/FC_Barcelona",
    "https://www.wikidata.org/wiki/Q7156"
  ],
  "Real Madrid CF": [
    "https://en.wikipedia.org/wiki/Real_Madrid_CF",
    "https://www.wikidata.org/wiki/Q8682"
  ],
  // FD's legal form + the sportscore/TSP short form + the grounds-table
  // form — three keys, one club (normTeamKey folds all three).
  "Club Atlético de Madrid": [
    "https://en.wikipedia.org/wiki/Atl%C3%A9tico_Madrid",
    "https://www.wikidata.org/wiki/Q8701"
  ],
  "Atlético Madrid": [
    "https://en.wikipedia.org/wiki/Atl%C3%A9tico_Madrid",
    "https://www.wikidata.org/wiki/Q8701"
  ],
  "Atlético de Madrid": [
    "https://en.wikipedia.org/wiki/Atl%C3%A9tico_Madrid",
    "https://www.wikidata.org/wiki/Q8701"
  ],
  // ---- Serie A (followed) ----
  // FD's legal form + the short form (TEAM_SLUGS/other providers).
  "FC Internazionale Milano": [
    "https://en.wikipedia.org/wiki/Inter_Milan",
    "https://www.wikidata.org/wiki/Q631"
  ],
  "Inter Milan": [
    "https://en.wikipedia.org/wiki/Inter_Milan",
    "https://www.wikidata.org/wiki/Q631"
  ],
  "AC Milan": [
    "https://en.wikipedia.org/wiki/AC_Milan",
    "https://www.wikidata.org/wiki/Q1543"
  ],
  "Juventus FC": [
    "https://en.wikipedia.org/wiki/Juventus_FC",
    "https://www.wikidata.org/wiki/Q1422"
  ],
  "Juventus": [
    "https://en.wikipedia.org/wiki/Juventus_FC",
    "https://www.wikidata.org/wiki/Q1422"
  ],
  "AS Roma": [
    "https://en.wikipedia.org/wiki/AS_Roma",
    "https://www.wikidata.org/wiki/Q2739"
  ],
  "SS Lazio": [
    "https://en.wikipedia.org/wiki/SS_Lazio",
    "https://www.wikidata.org/wiki/Q2609"
  ],
  "Lazio": [
    "https://en.wikipedia.org/wiki/SS_Lazio",
    "https://www.wikidata.org/wiki/Q2609"
  ],
  "Torino FC": [
    "https://en.wikipedia.org/wiki/Torino_FC",
    "https://www.wikidata.org/wiki/Q2768"
  ],
  // ---- Ligue 1 (followed) ----
  // FD's current form + the classic short form (TEAM_SLUGS, older FD).
  "Paris Saint-Germain FC": [
    "https://en.wikipedia.org/wiki/Paris_Saint-Germain_FC",
    "https://www.wikidata.org/wiki/Q483020"
  ],
  "Paris Saint-Germain": [
    "https://en.wikipedia.org/wiki/Paris_Saint-Germain_FC",
    "https://www.wikidata.org/wiki/Q483020"
  ],
  "Olympique de Marseille": [
    "https://en.wikipedia.org/wiki/Olympique_de_Marseille",
    "https://www.wikidata.org/wiki/Q132885"
  ],
  // ---- Bundesliga (followed) ----
  "FC Bayern München": [
    "https://en.wikipedia.org/wiki/FC_Bayern_Munich",
    "https://www.wikidata.org/wiki/Q15789"
  ],
  "Borussia Dortmund": [
    "https://en.wikipedia.org/wiki/Borussia_Dortmund",
    "https://www.wikidata.org/wiki/Q41420"
  ],
  // ---- Premier League (master-club bench) ----
  "Tottenham Hotspur FC": [
    "https://en.wikipedia.org/wiki/Tottenham_Hotspur_F.C.",
    "https://www.wikidata.org/wiki/Q18741"
  ],
  "Everton FC": [
    "https://en.wikipedia.org/wiki/Everton_F.C.",
    "https://www.wikidata.org/wiki/Q5794"
  ],

  // ---- batch 2 (2026-11-06, same fetch-and-confirm round): the biggest
  // remaining pool clubs with live team pages today — Serie A / PL / La
  // Liga / Bundesliga / Ligue 1 contenders + the CL regulars Porto,
  // Sporting CP and PSV. Same rules: FD legal name + provider variants
  // as keys; article titles are the CANONICAL enwiki forms (the API
  // redirects list was empty for every one of these — none is a
  // #REDIRECT page; e.g. Athletic Club's article title IS Athletic
  // Bilbao, Real Betis Balompié's IS Real Betis). ----
  "SSC Napoli": [
    "https://en.wikipedia.org/wiki/SSC_Napoli",
    "https://www.wikidata.org/wiki/Q2641"
  ],
  "Aston Villa FC": [
    "https://en.wikipedia.org/wiki/Aston_Villa_F.C.",
    "https://www.wikidata.org/wiki/Q18711"
  ],
  "Newcastle United FC": [
    "https://en.wikipedia.org/wiki/Newcastle_United_F.C.",
    "https://www.wikidata.org/wiki/Q18716"
  ],
  "Atalanta BC": [
    "https://en.wikipedia.org/wiki/Atalanta_BC",
    "https://www.wikidata.org/wiki/Q1886"
  ],
  "RB Leipzig": [
    "https://en.wikipedia.org/wiki/RB_Leipzig",
    "https://www.wikidata.org/wiki/Q702455"
  ],
  "Bayer 04 Leverkusen": [
    "https://en.wikipedia.org/wiki/Bayer_04_Leverkusen",
    "https://www.wikidata.org/wiki/Q104761"
  ],
  "Villarreal CF": [
    "https://en.wikipedia.org/wiki/Villarreal_CF",
    "https://www.wikidata.org/wiki/Q12297"
  ],
  "Real Sociedad de Fútbol": [
    "https://en.wikipedia.org/wiki/Real_Sociedad",
    "https://www.wikidata.org/wiki/Q10315"
  ],
  "Real Sociedad": [
    "https://en.wikipedia.org/wiki/Real_Sociedad",
    "https://www.wikidata.org/wiki/Q10315"
  ],
  "Athletic Club": [
    "https://en.wikipedia.org/wiki/Athletic_Bilbao",
    "https://www.wikidata.org/wiki/Q8687"
  ],
  "Athletic Bilbao": [
    "https://en.wikipedia.org/wiki/Athletic_Bilbao",
    "https://www.wikidata.org/wiki/Q8687"
  ],
  "Valencia CF": [
    "https://en.wikipedia.org/wiki/Valencia_CF",
    "https://www.wikidata.org/wiki/Q10333"
  ],
  "FC Porto": [
    "https://en.wikipedia.org/wiki/FC_Porto",
    "https://www.wikidata.org/wiki/Q128446"
  ],
  "Sporting Clube de Portugal": [
    "https://en.wikipedia.org/wiki/Sporting_CP",
    "https://www.wikidata.org/wiki/Q75729"
  ],
  "Sporting CP": [
    "https://en.wikipedia.org/wiki/Sporting_CP",
    "https://www.wikidata.org/wiki/Q75729"
  ],
  "PSV": [
    "https://en.wikipedia.org/wiki/PSV_Eindhoven",
    "https://www.wikidata.org/wiki/Q11938"
  ],
  "PSV Eindhoven": [
    "https://en.wikipedia.org/wiki/PSV_Eindhoven",
    "https://www.wikidata.org/wiki/Q11938"
  ],
  "Olympique Lyonnais": [
    "https://en.wikipedia.org/wiki/Olympique_Lyonnais",
    "https://www.wikidata.org/wiki/Q704"
  ],
  "AS Monaco FC": [
    "https://en.wikipedia.org/wiki/AS_Monaco_FC",
    "https://www.wikidata.org/wiki/Q180305"
  ],
  "AS Monaco": [
    "https://en.wikipedia.org/wiki/AS_Monaco_FC",
    "https://www.wikidata.org/wiki/Q180305"
  ],
  "Bologna FC 1909": [
    "https://en.wikipedia.org/wiki/Bologna_FC_1909",
    "https://www.wikidata.org/wiki/Q1893"
  ],
  "Bologna": [
    "https://en.wikipedia.org/wiki/Bologna_FC_1909",
    "https://www.wikidata.org/wiki/Q1893"
  ],
  "Real Betis Balompié": [
    "https://en.wikipedia.org/wiki/Real_Betis",
    "https://www.wikidata.org/wiki/Q8723"
  ],
  "Real Betis": [
    "https://en.wikipedia.org/wiki/Real_Betis",
    "https://www.wikidata.org/wiki/Q8723"
  ],
  "RC Celta de Vigo": [
    "https://en.wikipedia.org/wiki/RC_Celta_de_Vigo",
    "https://www.wikidata.org/wiki/Q8749"
  ],
  "Celta Vigo": [
    "https://en.wikipedia.org/wiki/RC_Celta_de_Vigo",
    "https://www.wikidata.org/wiki/Q8749"
  ],
  "VfB Stuttgart": [
    "https://en.wikipedia.org/wiki/VfB_Stuttgart",
    "https://www.wikidata.org/wiki/Q4512"
  ],
  "SV Werder Bremen": [
    "https://en.wikipedia.org/wiki/SV_Werder_Bremen",
    "https://www.wikidata.org/wiki/Q51976"
  ],
  "Werder Bremen": [
    "https://en.wikipedia.org/wiki/SV_Werder_Bremen",
    "https://www.wikidata.org/wiki/Q51976"
  ]
};

// Competitions: keyed by the COMP_EN canonical English name (the exact
// string sportsOrganizationNode stamps as the node's name), so the node
// name and the grounding key can never disagree.
export const COMP_ENTITY_LINKS: Record<string, string[]> = {
  "Champions League": [
    "https://en.wikipedia.org/wiki/UEFA_Champions_League",
    "https://www.wikidata.org/wiki/Q18756"
  ],
  "Premier League": [
    "https://en.wikipedia.org/wiki/Premier_League",
    "https://www.wikidata.org/wiki/Q9448"
  ],
  "La Liga": [
    "https://en.wikipedia.org/wiki/La_Liga",
    "https://www.wikidata.org/wiki/Q324867"
  ],
  "Serie A": [
    "https://en.wikipedia.org/wiki/Serie_A",
    "https://www.wikidata.org/wiki/Q15804"
  ],
  "Ligue 1": [
    "https://en.wikipedia.org/wiki/Ligue_1",
    "https://www.wikidata.org/wiki/Q13394"
  ],
  "Bundesliga": [
    "https://en.wikipedia.org/wiki/Bundesliga",
    "https://www.wikidata.org/wiki/Q82595"
  ]
};
