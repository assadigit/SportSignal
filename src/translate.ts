// SportSignal — team/competition translation (3-layer Farsi stack:
// admin override → AI-learned → static dict → fuzzy stem) and competition
// classification helpers. Owns the lazy dict caches + the AI-learned cache.


import { CONFIG } from "./config";
import { STAGE_FA } from "./tables";
import type { Env } from "./types";
import { normTeamKey } from "./teams";
import { buildFaTeamDict } from "./fa-dict";

var FA_TEAMS_DICT = null;
var FA_TEAMS_NORM = null;
var FA_TEAMS_STEM = null;
var FA_AI_CACHE = null;
export function translateTeam(englishName) {
  if (!FA_TEAMS_DICT) {
    FA_TEAMS_DICT = buildFaTeamDict();
    FA_TEAMS_NORM = new Map();
    FA_TEAMS_STEM = [];
    for (const [en, fa] of Object.entries(FA_TEAMS_DICT)) {
      FA_TEAMS_NORM.set(normTeamKey(en), fa);
      FA_TEAMS_STEM.push([normTeamKey(en).replace(/\d+/g, ""), fa]);
    }
  }
  if (FA_TEAMS_DICT[englishName]) return FA_TEAMS_DICT[englishName];
  const key = normTeamKey(englishName);
  if (!key) return englishName;
  // v12.x-admin-override: admin manual overrides take HIGHEST priority —
  // checked before the AI cache + the static dictionary + fuzzy matching.
  // Stored in fa_teams_ai.overrides (set via POST /api/fa-teams/override).
  if (FA_AI_CACHE && FA_AI_CACHE.size) {
    const aiHit = FA_AI_CACHE.get(key);
    if (aiHit) return aiHit;
  }
  const prov = key.replace(/\d+/g, "");
  if (prov.length >= 4) {
    let hit = null, hits = 0;
    for (const [d, fa] of FA_TEAMS_STEM) {
      if (d.length >= 4 && (prov.includes(d) || d.includes(prov))) {
        hit = fa;
        hits++;
      }
    }
    if (hits === 1) return hit;
  }
  return englishName;
}
export async function ensureFaAiCache(env: Env) {
  if (FA_AI_CACHE) return FA_AI_CACHE;
  FA_AI_CACHE = new Map();
  const rec = await env.STATE.get(CONFIG.KV_FA_TEAMS, "json").catch(() => null);
  // v12.x-admin-override: load admin manual overrides FIRST (they take
  // priority over AI-learned names — both stored in the same KV record).
  if (rec && rec.overrides && typeof rec.overrides === "object") {
    for (const [k, v] of Object.entries(rec.overrides)) {
      if (typeof v === "string" && v) FA_AI_CACHE.set(k, v);
    }
  }
  if (rec && rec.learned && typeof rec.learned === "object") {
    for (const [k, v] of Object.entries(rec.learned)) {
      if (typeof v === "string" && v) FA_AI_CACHE.set(k, v);
    }
  }
  return FA_AI_CACHE;
}
export function faAiCacheSize() {
  return FA_AI_CACHE ? FA_AI_CACHE.size : 0;
}
export function resetFaAiCache() {
  FA_AI_CACHE = null;
  FA_VENUE_CACHE = null;
}
// v13.13-venues: AI-learned Persian stadium/venue names. Loaded from
// KV_FA_VENUES (fa_venues_ai). The translateVenue function is the venue
// equivalent of translateTeam — returns the Persian name if known, else
// the English original (which the AI learner will pick up + translate).
var FA_VENUE_CACHE = null;
export async function ensureFaVenueCache(env: Env) {
  if (FA_VENUE_CACHE) return FA_VENUE_CACHE;
  FA_VENUE_CACHE = new Map();
  const rec = await env.STATE.get(CONFIG.KV_FA_VENUES, "json").catch(() => null);
  if (rec && rec.learned && typeof rec.learned === "object") {
    for (const [k, v] of Object.entries(rec.learned)) {
      if (typeof v === "string" && v) FA_VENUE_CACHE.set(k, v);
    }
  }
  return FA_VENUE_CACHE;
}
export function translateVenue(venue) {
  if (!venue || !FA_VENUE_CACHE) return venue || null;
  // Case-insensitive lookup (venue names come in varied casing from providers).
  const key = String(venue).toLowerCase().trim();
  if (FA_VENUE_CACHE.has(key)) return FA_VENUE_CACHE.get(key);
  // Try a normalized key (strip "Stadium", "Arena", common suffixes).
  const norm = key.replace(/\b(stadium|arena|park|ground|centre|center)\b/g, "").trim();
  if (norm && FA_VENUE_CACHE.has(norm)) return FA_VENUE_CACHE.get(norm);
  return venue;
}
export function faVenueCacheSize() {
  return FA_VENUE_CACHE ? FA_VENUE_CACHE.size : 0;
}
export function isValidFaName(fa) {
  if (typeof fa !== "string") return false;
  const v = fa.trim();
  if (v.length < 2 || v.length > 42) return false;
  if (!/[\u0621-\u064A\u0671-\u06D3]/.test(v)) return false;
  return /^[\u0600-\u06FF\u200C\s\-\u0640()\/]+$/.test(v);
}
export function translateCompetition(code) {
  const FA_COMPS = {
    "CL": "\u0644\u06CC\u06AF \u0642\u0647\u0631\u0645\u0627\u0646\u0627\u0646 \u0627\u0631\u0648\u067E\u0627",
    "PL": "\u0644\u06CC\u06AF \u0628\u0631\u062A\u0631 \u0627\u0646\u06AF\u0644\u06CC\u0633",
    "PD": "\u0644\u0627\u0644\u06CC\u06AF\u0627",
    "SA": "\u0633\u0631\u06CC\u200C\u0622",
    "FL1": "\u0644\u06CC\u06AF \u06CC\u06A9 \u0641\u0631\u0627\u0646\u0633\u0647",
    "EL": "\u0644\u06CC\u06AF \u0627\u0631\u0648\u067E\u0627",
    "ECL": "\u0644\u06CC\u06AF \u06A9\u0646\u0641\u0631\u0627\u0646\u0633 \u0627\u0631\u0648\u067E\u0627",
    "BL1": "\u0628\u0648\u0646\u062F\u0633\u0644\u06CC\u06AF\u0627",
    "FA_CUP": "\u062C\u0627\u0645 \u062D\u0630\u0641\u06CC \u0627\u0646\u06AF\u0644\u06CC\u0633",
    "EFL_CUP": "\u062C\u0627\u0645 \u0627\u062A\u062D\u0627\u062F\u06CC\u0647 \u0627\u0646\u06AF\u0644\u06CC\u0633 (\u06A9\u0627\u0631\u0627\u0628\u0627\u0626\u0648)",
    "CDR": "\u062C\u0627\u0645 \u062D\u0630\u0641\u06CC \u0627\u0633\u067E\u0627\u0646\u06CC\u0627",
    "COPPA_ITALIA": "\u062C\u0627\u0645 \u062D\u0630\u0641\u06CC \u0627\u06CC\u062A\u0627\u0644\u06CC\u0627",
    "DFB_POKAL": "\u062C\u0627\u0645 \u062D\u0630\u0641\u06CC \u0622\u0644\u0645\u0627\u0646",
    "AL": "\u0644\u06CC\u06AF \u0627\u0633\u062A\u0631\u0627\u0644\u06CC\u0627",
    "WC": "\u062C\u0627\u0645 \u062C\u0647\u0627\u0646\u06CC",
    "EC": "\u062C\u0627\u0645 \u0645\u0644\u062A\u200C\u0647\u0627\u06CC \u0627\u0631\u0648\u067E\u0627",
    "COPA": "\u06A9\u0648\u067E\u0627 \u0622\u0645\u0631\u06CC\u06A9\u0627",
    "AFCON": "\u062C\u0627\u0645 \u0645\u0644\u062A\u200C\u0647\u0627\u06CC \u0622\u0641\u0631\u06CC\u0642\u0627",
    "AFC": "\u062C\u0627\u0645 \u0645\u0644\u062A\u200C\u0647\u0627\u06CC \u0622\u0633\u06CC\u0627",
    "PGL": "\u0644\u06CC\u06AF \u0628\u0631\u062A\u0631 \u062E\u0644\u06CC\u062C \u0641\u0627\u0631\u0633",
    "HAZFI_CUP": "\u062C\u0627\u0645 \u062D\u0630\u0641\u06CC \u0627\u06CC\u0631\u0627\u0646"
  };
  return FA_COMPS[code] || code;
}
export function getCompetitionPriority(code) {
  return CONFIG.PRIORITY[code] || CONFIG.PRIORITY.DEFAULT;
}
export function isDomesticCup(code) {
  return Object.keys(CONFIG.DOMESTIC_CUP_IDS).includes(code);
}
export function isQuarterFinalOrLater(stage) {
  return CONFIG.LATE_STAGES.includes(stage);
}
export function faStageName(stage) {
  return STAGE_FA[String(stage || "").toUpperCase()] || null;
}
