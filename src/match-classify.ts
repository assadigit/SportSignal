// SportSignal — the match CLASSIFICATION: notification eligibility
// (shouldNotify — the followed-team set), the big-match/featured/master-pair
// sets (BIG_MATCH_TEAMS/UEFA, masterTeamList-driven), THE shared hero
// expression (pickHeroMatch — ADR-001 website-as-truth, v13.73-herotruth),
// and the derby/rivalry tables. normAlias/TEAM_ALIASES live in teams.ts
// (v13.76 — the users↔matches import cycle is dead). Extracted from
// matches.ts in v13.76-matchsplit.
import { CONFIG } from "./config";
import { normalizeTeamName, normAlias } from "./teams";
import { isDomesticCup, isQuarterFinalOrLater } from "./translate";
import { masterTeamList, masterMemo, userFollowsSides } from "./users";
import { isLiveStatus } from "./match-model";

export function shouldNotify(match) {
  const compCode = match.competition.code;
  const normHome = normAlias(match.homeTeam.name);
  const normAway = normAlias(match.awayTeam.name);
  let c = CONFIG.__teamNorm;
  if (!c || c.sig !== CONFIG.BIG_TEAMS_BY_LEAGUE) {
    const all = new Set();
    const byLeague = {};
    for (const [lg, list] of Object.entries(CONFIG.BIG_TEAMS_BY_LEAGUE) as any) {
      const normList = new Set();
      for (const t of list) {
        const n = normalizeTeamName(t);
        normList.add(n);
        all.add(n);
      }
      byLeague[lg] = normList;
    }
    c = { sig: CONFIG.BIG_TEAMS_BY_LEAGUE, all, byLeague };
    CONFIG.__teamNorm = c;
  }
  if (compCode === "CL" || isDomesticCup(compCode)) {
    if (c.all.has(normHome) || c.all.has(normAway)) {
      return true;
    }
    if (isQuarterFinalOrLater(match.stage)) {
      return true;
    }
    return false;
  }
  const leagueTeams = c.byLeague[compCode];
  return !!(leagueTeams && (leagueTeams.has(normHome) || leagueTeams.has(normAway)));
}
var BIG_MATCH_TEAMS = [
  // England
  "Arsenal FC",
  "Chelsea FC",
  "Chelsea",
  "Manchester City FC",
  "Manchester United FC",
  "Liverpool FC",
  "Manchester City",
  "Manchester United",
  // Italy
  "AC Milan",
  "Inter Milan",
  "Milan",
  "Inter",
  // Spain
  "FC Barcelona",
  "Real Madrid CF",
  "Atl\xE9tico Madrid",
  "Barcelona",
  "Real Madrid",
  "Atletico Madrid",
  "Atleti",
  // Germany (BL1 now monitored + UEFA cups)
  "FC Bayern M\xFCnchen",
  "Bayern Munich",
  "Bayern M\xFCnchen",
  "Borussia Dortmund",
  "Dortmund",
  // Australia (A-League)
  "Melbourne Victory",
  "Melbourne City",
  "Sydney FC",
  "Western Sydney Wanderers",
  "Adelaide United"
];
var BIG_MATCH_UEFA = BIG_MATCH_TEAMS.concat(["Paris Saint-Germain", "PSG"]);
export function isFeaturedMatch(match) {
  const code = match.competition.code;
  const isUefa = code === "CL" || code === "EL" || code === "ECL" || isDomesticCup(code);
  const pool: any = isUefa ? BIG_MATCH_UEFA : BIG_MATCH_TEAMS;
  if (!pool.__normSet) pool.__normSet = new Set(pool.map(normalizeTeamName));
  const nset = pool.__normSet;
  return nset.has(normAlias(match.homeTeam.name)) && nset.has(normAlias(match.awayTeam.name));
}
export function isDomesticLeagueCode(code) {
  const by = CONFIG.BIG_TEAMS_BY_LEAGUE || {};
  return !!by[code] && code !== "CL" && code !== "EL" && code !== "ECL";
}
export function isMasterPair(match) {
  masterTeamList();
  const nset = masterMemo.normSet;
  return nset.has(normAlias(match.homeTeam.name)) && nset.has(normAlias(match.awayTeam.name));
}
// v13.100-priority: the DESIRED-TEAM PRIORITY TIER — the user's rule, one
// expression for every report surface (the bot's UCL night preview, the
// night digest's "your teams" section, the site's UCL card, the hero pick):
//   - BOTH sides desired (followed) ⇒ 2 — a clash of two followed clubs is
//     the night's headline (منچسترسیتی 🆚 پاری سن ژرمن leads, not trails)
//   - ONE side desired ⇒ 1
//   - neither ⇒ 0
//   - +1 when isFeaturedMatch (the curated big-vs-big list — PSG rides the
//     UEFA pool) — the tie-break INSIDE a tier: two both-followed pairs at
//     the same kickoff resolve to the curated marquee clash first (the
//     2026-10-14 lesson: City–PSG vs Roma–Real both 19:00Z, pool order put
//     Roma–Real first and the "most important game of the month" was last).
// Per-chat when (prefs, chatId) are given (the bot surfaces — each chat's
// own desired teams); master-level otherwise (the site surfaces — the
// settings-augmented list applySettings installs).
export function priorityTier(match, prefs?, chatId?) {
  let h = false, a = false;
  if (prefs && chatId != null) {
    const s = userFollowsSides(prefs, chatId, match);
    h = s.home; a = s.away;
  } else {
    masterTeamList();
    const nset = masterMemo.normSet;
    h = nset.has(normAlias(match.homeTeam.name));
    a = nset.has(normAlias(match.awayTeam.name));
  }
  return (h && a ? 2 : h || a ? 1 : 0) + (isFeaturedMatch(match) ? 1 : 0);
}
// v13.73-herotruth: THE single hero-selection expression (ADR-001,
// website-as-truth). The site's hero (public-matches.ts nextBig) and the
// bot's /featured MUST both call this — neither may re-implement the
// filter/sort. Semantics (unchanged from the site's v13.68 filter):
//   - hero-worthy = isFeaturedMatch(m) || isMasterPair(m) (BOTH teams big)
//   - exclude FINISHED
//   - live matches first (isLiveStatus), then by nearest kickoff
//     (live matches sort by their original kickoff time)
// v13.100-priority: SAME-KICKOFF ties (every UCL league-phase slot) now
// break by priorityTier — a curated big-vs-big clash (featured) outranks a
// followed-vs-followed pair, which outranks the rest of the tie. The
// 2026-10-14 case: Roma–Real and City–PSG both 19:00Z, both master pairs;
// stable pool order handed the hero to Roma–Real and the month's marquee
// game never led the site. Kickoff still dominates (the hero stays the
// NEXT big match, not the biggest one far away); the tier only orders the
// simultaneous.
// The bot's pre-13.73 copy diverged in 3 ways (unsorted live[0] pick,
// SCHEDULED|TIMED-only upcoming, inline live status set); this function
// ends that — one expression, two consumers, zero drift.
export function pickHeroMatch(matches) {
  const hero = (matches || [])
    .filter((m) => m.status !== "FINISHED" && (isFeaturedMatch(m) || isMasterPair(m)) && (isLiveStatus(m.status) || new Date(m.utcDate).getTime() > Date.now()))
    .sort((a, b) => (isLiveStatus(a.status) ? 0 : 1) - (isLiveStatus(b.status) ? 0 : 1) || new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime() || priorityTier(b) - priorityTier(a));
  return hero.length ? hero[0] : null;
}
export function hasSelectedTeam(match) {
  masterTeamList();
  const nset = masterMemo.normSet;
  return nset.has(normAlias(match.homeTeam.name)) || nset.has(normAlias(match.awayTeam.name));
}
export function isMasterClash(match) {
  return isDomesticLeagueCode(match.competition.code) && isMasterPair(match);
}
var DERBY_PAIRS = [
  // El Clásico
  ["Real Madrid CF", "FC Barcelona"],
  // Manchester derby
  ["Manchester City FC", "Manchester United FC"],
  // North London derby
  ["Arsenal FC", "Tottenham Hotspur FC"],
  // Merseyside derby
  ["Liverpool FC", "Everton FC"],
  // Derby della Madonnina
  ["AC Milan", "Inter Milan"],
  // Der Klassiker
  ["FC Bayern M\xFCnchen", "Borussia Dortmund"],
  // Madrid derby
  ["Atl\xE9tico Madrid", "Real Madrid CF"],
  // Le Classique
  ["Paris Saint-Germain", "Olympique de Marseille"],
  // v13.51-rivalries: the new named pairings join the derby machinery
  // too (top-box selection, week-ahead ⚔ marks) — they are derbies with
  // names, not a separate class.
  // North West Derby
  ["Liverpool FC", "Manchester United FC"],
  // Derby della Capitale
  ["AS Roma", "Lazio"],
  // Derby della Mole
  ["Juventus", "Torino FC"]
];
var DERBY_NORM = DERBY_PAIRS.map(function(p) {
  // v13.51: normAlias, not bare normalizeTeamName — the alias table folds
  // "Bayern Munich"/"FC Bayern München" onto ONE key, but the bare normalize
  // left DERBY_NORM on the other spelling (bayernmunich vs bayernmunchen),
  // so Der Klassiker silently never matched. Both sides now go through the
  // same folding.
  return [normAlias(p[0]), normAlias(p[1])];
});
export function isDerby(match) {
  // v13.51-rivalries: a derby pairing inside the Champions League is NOT a
  // derby — Real–Barça in the UCL is just a UCL match (the user's El Clásico
  // rule, applied to every pairing). Callers without a competition field
  // (tests) keep the pure pair-membership answer.
  if (match.competition && match.competition.code === "CL") return false;
  const h = normAlias(match.homeTeam.name);
  const a = normAlias(match.awayTeam.name);
  return DERBY_NORM.some((p) => h === p[0] && a === p[1] || h === p[1] && a === p[0]);
}
// v13.51-rivalries: the marquee pairings carry their OWN names — shown
// instead of the generic "Derby" tag wherever a derby is labelled. The pairs
// also stay in DERBY_PAIRS so the derby machinery (the top box, the week-ahead
// ⚔ marks) still sees them. Rules, per the product owner:
//   - NEVER in the Champions League — a Clásico/Klassiker in the UCL is just
//     a UCL match (any other competition — league or domestic cup — counts).
//   - Persian carries a name only where one is natively used: ال کلاسیکو for
//     Real–Barça. Every other rivalry name is English-only — fa consumers
//     drop the tag entirely rather than show English text.
var RIVALRY_PAIRS = [
  // [team A, team B, English name, Persian name ("" = English-only)]
  ["Real Madrid CF", "FC Barcelona", "El Clásico", "\u0627\u0644 \u06A9\u0644\u0627\u0633\u06CC\u06A9\u0648"],
  ["FC Bayern M\xFCnchen", "Borussia Dortmund", "Der Klassiker", ""],
  ["AC Milan", "Inter Milan", "Derby della Madonnina", ""],
  ["Liverpool FC", "Manchester United FC", "North West Derby", ""],
  ["Manchester City FC", "Manchester United FC", "Manchester Derby", ""],
  ["Arsenal FC", "Tottenham Hotspur FC", "North London Derby", ""],
  ["Paris Saint-Germain", "Olympique de Marseille", "Le Classique", ""],
  ["AS Roma", "Lazio", "Derby della Capitale", ""],
  ["Juventus", "Torino FC", "Derby della Mole", ""]
];
var RIVALRY_NORM = RIVALRY_PAIRS.map(function(p) {
  return [normAlias(p[0]), normAlias(p[1])];
});
// The rivalry name for this match in this language, or null (no named
// rivalry / a UCL meeting / an English-only name requested in fa).
export function rivalryName(match, lang) {
  if (match.competition && match.competition.code === "CL") return null;
  const h = normAlias(match.homeTeam.name);
  const a = normAlias(match.awayTeam.name);
  for (let i = 0; i < RIVALRY_NORM.length; i++) {
    const p = RIVALRY_NORM[i];
    if (h === p[0] && a === p[1] || h === p[1] && a === p[0]) {
      if (lang !== "fa") return RIVALRY_PAIRS[i][2];
      return RIVALRY_PAIRS[i][3] || null;
    }
  }
  return null;
}
