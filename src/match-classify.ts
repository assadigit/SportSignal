// SportSignal — the match CLASSIFICATION: notification eligibility
// (shouldNotify — the strict individual tier; shouldReport — the
// consolidated tier; v13.109-consolidated), the big-match/featured/master-pair
// sets (BIG_MATCH_TEAMS/UEFA, masterTeamList-driven), THE shared hero
// expression (pickHeroMatch — ADR-001 website-as-truth, v13.73-herotruth),
// the UCL-participant set (the Liverpool–Porto exception), and the
// derby/rivalry tables. normAlias/TEAM_ALIASES live in teams.ts
// (v13.76 — the users↔matches import cycle is dead). Extracted from
// matches.ts in v13.76-matchsplit.
import { CONFIG } from "./config";
import { normalizeTeamName, normAlias } from "./teams";
import { isDomesticCup, isQuarterFinalOrLater } from "./translate";
import { masterTeamList, masterMemo, userFollowsSides } from "./users";
import { isLiveStatus } from "./match-model";

// v13.109-consolidated: THE TWO ELIGIBILITY TIERS.
//
// The user's rule (2026-10-16): one-big-club league fixtures — Strasbourg–PSG,
// Brentford–Liverpool, Man City–Ipswich — are NOT worth an individual
// picture notification; they belong ONLY in the consolidated "بازی‌های هفته
// آینده" week-ahead digest. Individual notifications are for:
//   1. BOTH clubs in the desired per-league lists (big-vs-big), OR
//   2. one desired + the opponent is a CURRENT UCL participant (the
//      "champions of their leagues" exception — Liverpool–Porto when Porto
//      rides the UCL; in-league shape: PSG–Monaco, Bayern–Leverkusen), OR
//   3. a NAMED derby with at least one desired side (El Clásico, North
//      London, Le Classique… — the bot's own v13.51/v13.101 derby-promotion
//      product line keeps its individual fixtures), OR
//   4. the cup tier, unchanged: CL + domestic cups (FA Cup…) and EL/ECL
//      KNOCKOUT rounds (QF+) stay either-desired — an elimination tie with
//      a desired side is worth watching however small the opponent
//      (the user's FA-Cup Liverpool–Ipswich example).
// shouldReport keeps the OLD either-desired semantics for every CONSOLIDATED
// surface (week-ahead digest, pool retention, website lists, /next, SEO)
// so those matches stay listed — just never pushed one-by-one.
//
// The UCL-participant set: primed once per cold isolate by
// primeUclParticipants (notify-engine.ts) from the CL standings KV cache
// (the 36-team league-phase table — authoritative) ∪ the pool's CL fixtures
// (same spellings as the matches being classified — zero aliasing risk).
// Unprimed/null = the exception is inert (fail toward digest-only, never
// toward extra notifications).
var UCL_PARTICIPANTS = null;
export function setUclParticipants(names) {
  const set = new Set();
  for (const n of Array.isArray(names) ? names : []) {
    if (!n) continue;
    // BOTH foldings per name: normAlias folds the 4 legal-name aliases
    // (SS Lazio→lazio…) while bare normalizeTeamName keeps the unfolded
    // key — a standings "Lazio" and a pool "SS Lazio" meet either way.
    set.add(normAlias(n));
    set.add(normalizeTeamName(n));
  }
  UCL_PARTICIPANTS = set;
}
export function clearUclParticipants() {
  UCL_PARTICIPANTS = null;
}
export function uclPrimed() {
  return UCL_PARTICIPANTS !== null;
}
export function uclParticipantCount() {
  return UCL_PARTICIPANTS ? UCL_PARTICIPANTS.size : 0;
}
export function isUclParticipant(name) {
  return !!(UCL_PARTICIPANTS && UCL_PARTICIPANTS.has(normAlias(name)));
}

function teamNormCache() {
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
  return c;
}

// THE INDIVIDUAL-notification tier (the engine's per-match picture
// messages, HT/postponement alerts, the audit universe). Strict per
// v13.109 — see the tier table above.
export function shouldNotify(match) {
  const compCode = match.competition.code;
  const normHome = normAlias(match.homeTeam.name);
  const normAway = normAlias(match.awayTeam.name);
  const c = teamNormCache();
  if (compCode === "CL" || isDomesticCup(compCode)) {
    // The cup tier, UNCHANGED: any desired side, or a QF+ stage (an
    // elimination tie stands on its own drama — FA Cup Liverpool–Ipswich).
    if (c.all.has(normHome) || c.all.has(normAway)) return true;
    if (isQuarterFinalOrLater(match.stage)) return true;
    return false;
  }
  if ((compCode === "EL" || compCode === "ECL") && isQuarterFinalOrLater(match.stage)) {
    // v13.109: EL/ECL KNOCKOUT rounds keep the old either-desired rule
    // (their league PHASE falls to the strict league tier below — a
    // marquee-vs-minnow group game is exactly the noise this change
    // removes). Parity with the pre-v13.109 verdict by construction.
    const lt = c.byLeague[compCode];
    return !!(lt && (lt.has(normHome) || lt.has(normAway)));
  }
  // The strict LEAGUE tier (domestic leagues + EL/ECL league phase).
  const leagueTeams = c.byLeague[compCode];
  if (!leagueTeams) return false;
  const homeDesired = leagueTeams.has(normHome);
  const awayDesired = leagueTeams.has(normAway);
  if (homeDesired && awayDesired) return true; // big-vs-big
  // One desired + the opponent a CURRENT UCL participant (champions-of-
  // their-leagues class: Monaco, Leverkusen, Atalanta…).
  if (homeDesired && isUclParticipant(match.awayTeam.name)) return true;
  if (awayDesired && isUclParticipant(match.homeTeam.name)) return true;
  // A NAMED derby with a desired side — the bot promotes these by code
  // name (v13.51/v13.101); demoting them to a digest line would contradict
  // that product line. Neither-side-desired derbies (Roma–Lazio) stay
  // digest-only — parity with the old either-desired verdict.
  if ((homeDesired || awayDesired) && isDerby(match)) return true;
  return false;
}

// THE CONSOLIDATED tier — the exact pre-v13.109 either-desired semantics.
// Consumers: the week-ahead digest ("بازی‌های هفته آینده"), pool retention
// (cron-pool's active-window cadence), the website's upcoming/finished/
// this-week/next-week lists, the bot's /next, SEO pages. One-desired
// fixtures live HERE — listed everywhere, pushed nowhere.
export function shouldReport(match) {
  const compCode = match.competition.code;
  const normHome = normAlias(match.homeTeam.name);
  const normAway = normAlias(match.awayTeam.name);
  const c = teamNormCache();
  if (compCode === "CL" || isDomesticCup(compCode)) {
    if (c.all.has(normHome) || c.all.has(normAway)) return true;
    if (isQuarterFinalOrLater(match.stage)) return true;
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
// v13.101-trueduels: the CURATED true-big-duel list — the user's rule: a
// "دوئل بزرگ لیگ قهرمانان اروپا" is the EUROPEAN ARISTOCRACY meeting ITSELF
// (Barcelona–Real Madrid, City–PSG…), never a marquee-vs-second-grade
// fixture (Real Madrid–Roma: Roma is second grade compared to Real). The
// master list is FOLLOWERS' business — it grows with every /follow and with
// the admin panel's saved teams (a settings-added AS Roma is exactly what
// made Real–Roma a "big duel" on 2026-10-14); THIS list is hand-tuned and
// settings-proof. Derby pairings that are not both-elite (Der Klassiker,
// the Madonnina, Le Classique…) stay out on purpose — their promotion is
// their CODE NAME, not the big-duel banner. Edit the list to tune the
// banner; nothing else changes when a club is added or removed here.
var TRUE_DUEL_ELITE = [
  // Spain
  "Real Madrid CF",
  "FC Barcelona",
  // England
  "Arsenal FC",
  "Chelsea FC",
  "Liverpool FC",
  "Manchester City FC",
  "Manchester United FC",
  // Germany
  "FC Bayern M\xFCnchen",
  // France
  "Paris Saint-Germain",
  "PSG",
  // Italy
  "AC Milan",
  "Inter Milan",
  "Juventus"
];
// Both sides in the curated elite list (normAlias-folded, memoized once —
// the BIG_MATCH_UEFA __normSet pattern). Deliberately NOT settings-driven.
export function isTrueBigDuel(match) {
  const pool: any = TRUE_DUEL_ELITE;
  if (!pool.__normSet) pool.__normSet = new Set(TRUE_DUEL_ELITE.map(normAlias));
  const s = pool.__normSet;
  return s.has(normAlias(match.homeTeam.name)) && s.has(normAlias(match.awayTeam.name));
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
  ["Juventus", "Torino FC"],
  // v13.101-trueduels: the Derby d'Italia joins the derby machinery (it
  // is a named rivalry like the rest — the boxing/⚔ marks must see it).
  // Derby d'Italia
  ["Juventus", "Inter Milan"]
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
//   - the BOT promotes the code name even when they meet in the Champions
//     League (v13.101-trueduels, the user's ask: "bot must promote derbies
//     with their code names such as el classico") — that opt-in lives in
//     rivalryName's third parameter (allowUcl); the DEFAULT callers (the
//     site's boxing/badges) keep the v13.51 suppression: in the UCL a
//     pairing competes as a UCL match on the site.
//   - every pairing carries a Persian code name now (دربی میلان، کلاسیکر
//     آلمان…) — fa consumers promote the native name instead of dropping
//     the tag (ال کلاسیکو keeps its existing spelling).
var RIVALRY_PAIRS = [
  // [team A, team B, English name, Persian name]
  ["Real Madrid CF", "FC Barcelona", "El Clásico", "\u0627\u0644 \u06A9\u0644\u0627\u0633\u06CC\u06A9\u0648"],
  ["FC Bayern M\xFCnchen", "Borussia Dortmund", "Der Klassiker", "\u06A9\u0644\u0627\u0633\u06CC\u06A9\u0631 \u0622\u0644\u0645\u0627\u0646"],
  ["AC Milan", "Inter Milan", "Derby della Madonnina", "\u062F\u0631\u0628\u06CC \u0645\u06CC\u0644\u0627\u0646"],
  ["Liverpool FC", "Manchester United FC", "North West Derby", "\u062F\u0631\u0628\u06CC \u0634\u0645\u0627\u0644 \u063A\u0631\u0628 \u0627\u0646\u06AF\u0644\u06CC\u0633"],
  ["Manchester City FC", "Manchester United FC", "Manchester Derby", "\u062F\u0631\u0628\u06CC \u0645\u0646\u0686\u0633\u062A\u0631"],
  ["Arsenal FC", "Tottenham Hotspur FC", "North London Derby", "\u062F\u0631\u0628\u06CC \u0634\u0645\u0627\u0644 \u0644\u0646\u062F\u0646"],
  ["Paris Saint-Germain", "Olympique de Marseille", "Le Classique", "\u0644\u0648 \u06A9\u0644\u0627\u0633\u06CC\u06A9"],
  ["AS Roma", "Lazio", "Derby della Capitale", "\u062F\u0631\u0628\u06CC \u0631\u0645"],
  ["Juventus", "Torino FC", "Derby della Mole", "\u062F\u0631\u0628\u06CC \u062A\u0648\u0631\u06CC\u0646"],
  // v13.101-trueduels: the three pairings whose code names existed but
  // never reached the label — the Madrid derby and the Merseyside derby
  // showed the generic "Derby" tag (they were in DERBY_PAIRS, not here),
  // and the Derby d'Italia was nowhere at all.
  ["Atl\xE9tico Madrid", "Real Madrid CF", "El Derbi Madrile\u00F1o", "\u062F\u0631\u0628\u06CC \u0645\u0627\u062F\u0631\u06CC\u062F"],
  ["Liverpool FC", "Everton FC", "Merseyside Derby", "\u062F\u0631\u0628\u06CC \u0645\u0631\u0633\u06CC\u200C\u0633\u0627\u06CC\u062F"],
  ["Juventus", "Inter Milan", "Derby d'Italia", "\u062F\u0631\u0628\u06CC \u0627\u06CC\u062A\u0627\u0644\u06CC\u0627"]
];
var RIVALRY_NORM = RIVALRY_PAIRS.map(function(p) {
  return [normAlias(p[0]), normAlias(p[1])];
});
// The rivalry name for this match in this language, or null (no named
// rivalry / a UCL meeting for a default caller).
// v13.101-trueduels: the third parameter (allowUcl) lifts the Champions
// League suppression for the BOT's promotion surfaces — the user's rule:
// "bot must promote derbies with their code names such as el classico"; a
// Clásico in a UCL shirt is still El Clásico. The DEFAULT stays suppressed:
// the site's boxing/badges keep the v13.51 product decision (in the UCL a
// pairing competes as a UCL match on the site).
export function rivalryName(match, lang, allowUcl?) {
  if (match.competition && match.competition.code === "CL" && !allowUcl) return null;
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
