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
// BATCH 1 (this file, 2026-11-06): the 6 competitions (CL, PL, PD, SA,
// FL1, BL1) + the 20 highest-priority teams — the followed-team priority
// list (src/config.ts BIG_TEAMS_BY_LEAGUE + the master clubs in
// src/slugs.ts TEAM_SLUGS, A-League excluded as site-hidden). Batch 2
// (more pool teams) extends TEAM_ENTITY_LINKS in a later pass under the
// SAME fetch-and-confirm rule.
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
