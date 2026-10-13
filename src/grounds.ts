// SportSignal — home-ground venue resolution (v13.85-stadiumchip).
// Extracted from seo/data.ts's hydrateMatchVenue stage-0 so TWO consumers
// share ONE table + ONE gate: the seo match pages (venue hydration) and
// pubMatch (the public payload — lights up the venue chips on the homepage
// lists). Root module: seo/data.ts imports DOWN into it (allowed direction);
// public-matches.ts imports sideways (root→root).
// Style note: bare params/returns on purpose — this is a harness module
// (worker-src concat); TS annotations here would need new transform rules
// (RUNBOOK §11). strict:false makes the bare forms legal TS.
import { CONFIG } from "./config";
import { normalizeTeamName } from "./teams";

// Lazy normalizeTeamName-keyed map over CONFIG.TEAM_STADIUMS. Rebuilt when
// the table object identity changes — same cache contract as the old
// inline cache in seo/data.ts. Shape: { en, fa } per club.
let cache = null;

function table() {
  if (!cache || cache.sig !== CONFIG.TEAM_STADIUMS) {
    cache = { sig: CONFIG.TEAM_STADIUMS, map: new Map() };
    for (const name in CONFIG.TEAM_STADIUMS) {
      cache.map.set(normalizeTeamName(name), CONFIG.TEAM_STADIUMS[name]);
    }
  }
  return cache.map;
}

// One-off NEUTRAL stages: finals / third-place games. The administrative
// home team doesn't host there. roundRaw "Final" counts, but never
// "semi"/"quarter"/"qualif" (two-legged home-and-away ties).
export function isOneOffNeutral(stageRaw, roundRaw) {
  const s = String(stageRaw || "");
  const r = String(roundRaw || "");
  return s === "FINAL" || s === "THIRD_PLACE" || (/final/i.test(r) && !/semi|quarter|qualif/i.test(r));
}

// The home team's ground for a league/group fixture; null when the table
// doesn't cover the club or the stage is one-off neutral. Callers must
// treat it as a FALLBACK (fills-only) — a provider venue always wins.
export function homeGround(homeName, stageRaw, roundRaw) {
  if (!homeName) return null;
  if (isOneOffNeutral(stageRaw, roundRaw)) return null;
  return table().get(normalizeTeamName(homeName)) || null;
}
