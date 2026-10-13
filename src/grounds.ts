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
import { normTeamKey } from "./teams";

// v13.86-groundsfix: the map keys + the lookups fold through normTeamKey
// (NOT the bare normalizeTeamName). normalizeTeamName leaves club-prefix
// tokens intact ("Club Atlético de Madrid" → clubatleticodemadrid ≠ the
// table key atleticodemadrid) — that name-form drift left TODAY'S hero
// match page venue-less while the table held the ground. normTeamKey
// strips the club-prefix tokens (club/afc/rcd/rc/deportivo/athletic/
// racing) on BOTH sides, so the FD full form, the short form and the
// table key all fold to one key.
let cache = null;

function table() {
  if (!cache || cache.sig !== CONFIG.TEAM_STADIUMS) {
    cache = { sig: CONFIG.TEAM_STADIUMS, map: new Map() };
    for (const name in CONFIG.TEAM_STADIUMS) {
      cache.map.set(normTeamKey(name), CONFIG.TEAM_STADIUMS[name]);
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
  return table().get(normTeamKey(homeName)) || null;
}

// v13.86-groundsfix: reverse lookup for PROVIDER venues — a live-detail /
// TSP / sportscore venue arriving as the English ground name ("Anfield")
// resolves to the table's CURATED Persian name, so one ground shows ONE
// Persian name everywhere. Before this, live rows carried the AI-learned
// dictionary transliteration ("انفیلد", "ولد ترافورد") while scheduled rows
// of the same fixture showed the curated form ("ورزشگاه آنفیلد") — two
// names for one ground on the same page. Matching is exact
// case-insensitive on the full English name — NO suffix stripping, so
// "Allianz Stadium" (Turin) and "Allianz Arena" (Munich) stay distinct.
let vCache = null;

export function curatedVenueFa(venueEn) {
  if (!venueEn) return null;
  if (!vCache || vCache.sig !== CONFIG.TEAM_STADIUMS) {
    vCache = { sig: CONFIG.TEAM_STADIUMS, map: new Map() };
    for (const k in CONFIG.TEAM_STADIUMS) {
      const g = CONFIG.TEAM_STADIUMS[k];
      if (g && g.en && g.fa) vCache.map.set(String(g.en).toLowerCase().trim(), g.fa);
    }
  }
  return vCache.map.get(String(venueEn).toLowerCase().trim()) || null;
}
