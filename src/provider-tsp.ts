// SportSignal — thesportsdb provider: the ONE event→match mapper
// (tspEventToMatch) + the league-views sweep with the eventsday fallback
// (fetchTheSportsDB). tspEventToMatch is exported for provider-cups
// (cupEventToMatch wraps it). Extracted from providers.ts in
// v13.74-providersplit.
import { CONFIG } from "./config";
import { PROVIDER_LEAGUE_MAP, TSP_LEAGUE_IDS, CUP_TSP_IDS } from "./tables";
import type { Env } from "./types";
import { fetchJSON } from "./utils";
import { mapStageName, parseTSPDate } from "./matches";

// v13.2: ONE thesportsdb event → match mapper (was duplicated ×3 across
// fetchLongView + fetchTheSportsDB's two branches). Identical field mapping.
export function tspEventToMatch(e, code) {
  return {
    id: "tsd-" + e.idEvent,
    utcDate: parseTSPDate(e.dateEvent, e.strTime, e.strTimestamp),
    status: /finished|completed/i.test(e.strStatus || "") ? "FINISHED" : "SCHEDULED",
    stage: mapStageName(e.strRound || e.intRound),
    // v13.35-rounds: keep the RAW round text ("3rd Round", "Quarter-finals")
    // — mapStageName is LOSSY ("3rd Round" collapses to THIRD_PLACE, which
    // would mislabel a cup's third round as the رده‌بندی playoff). roundLabel
    // prefers roundRaw and only falls back to the (lossy) stage.
    roundRaw: e.strRound || e.intRound || "",
    competition: { code },
    venue: e.strVenue || null,
    homeTeam: { name: e.strHomeTeam, crest: e.strHomeTeamBadge || null },
    awayTeam: { name: e.strAwayTeam, crest: e.strAwayTeamBadge || null },
    score: { fullTime: { home: parseInt(e.intHomeScore) || 0, away: parseInt(e.intAwayScore) || 0 } }
  };
}
export async function fetchTheSportsDB(env: Env) {
  const matches = [];
  const monitored = new Set([...CONFIG.LEAGUES, "EL", "ECL", ...Object.keys(CONFIG.DOMESTIC_CUP_IDS), ...Object.keys(CONFIG.INTL_COMPETITIONS)]);
  let tsdbCalls = 0;
  const pace = () => tsdbCalls++ > 0 ? new Promise((r) => setTimeout(r, 1200)) : Promise.resolve();
  for (const [code, leagueId] of Object.entries(Object.assign({}, TSP_LEAGUE_IDS, CUP_TSP_IDS))) {
    if (!monitored.has(code)) continue;
    await pace();
    const data = await fetchJSON("https://www.thesportsdb.com/api/v1/json/3/eventsnextleague.php?id=" + leagueId);
    for (const e of data && data.events || []) {
      if ((e.strSport || "").toLowerCase() !== "soccer") continue;
      const m = tspEventToMatch(e, code);
      if (!m.utcDate) continue;
      matches.push(m);
    }
  }
  if (!matches.length) {
    const from = new Date(Date.now() - CONFIG.FALLBACK_DAYS_PAST * 864e5);
    const to = new Date(Date.now() + CONFIG.FALLBACK_DAYS_FUTURE * 864e5);
    for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split("T")[0];
      await pace();
      try {
        const data = await fetchJSON("https://www.thesportsdb.com/api/v1/json/3/eventsday.php?d=" + dateStr);
        for (const e of data && data.events || []) {
          const code = PROVIDER_LEAGUE_MAP[e.strLeague];
          if (!code || !monitored.has(code)) continue;
          if ((e.strSport || "").toLowerCase() !== "soccer") continue;
          const m = tspEventToMatch(e, code);
          if (!m.utcDate) continue;
          matches.push(m);
        }
      } catch (e) {
        console.error(`\u274C TSP day sweep ${dateStr} failed: ${e.message}`);
      }
    }
  }
  return matches;
}
