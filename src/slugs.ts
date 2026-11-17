// SportSignal — canonical slug layer (v13.80-canonical-hrefs).
// ONE home for the URL vocabulary of the public site: competition slugs,
// team slugs, and the match-path builder. Previously these lived in
// src/seo/config.ts (server-only); the client's public-13.x.js kept a
// PRIVATE copy of the algorithm WITHOUT the TEAM_SLUGS table, so its
// re-rendered match hrefs diverged from the server's canonical ones
// (chelsea-vs-tottenham-hotspur-… vs chelsea-vs-tottenham-…) and users
// clicked into 404s. The fix ships the canonical path IN the payload
// (pubMatch → `path`), so the client never guesses again. This module is
// the single source of truth both sides derive from — a root leaf (no
// imports, untyped params: the harness-safety convention for root src).
// seo/* imports it via real ES modules; the harness orders it before its
// consumers.

// Stable competition slugs (U-02: lowercase Latin, never change).
export const COMP_SLUGS: Record<string, string> = {
  CL: "champions-league",
  EL: "europa-league",
  ECL: "conference-league",
  PL: "premier-league",
  PD: "la-liga",
  SA: "serie-a",
  FL1: "ligue-1",
  BL1: "bundesliga",
  FA_CUP: "fa-cup",
  EFL_CUP: "efl-cup",
  CDR: "copa-del-rey",
  COPPA_ITALIA: "coppa-italia",
  DFB_POKAL: "dfb-pokal",
  HAZFI_CUP: "hazfi-cup",
  AL: "a-league",
  WC: "world-cup",
  EC: "euro",
  COPA: "copa-america",
  AFCON: "afcon",
  AFC: "afc-asian-cup",
  PGL: "persian-gulf-pro-league"
};

// Stable team slugs for the followed ("master") clubs — the teams that get
// pages ~99% of the time. Pool teams without an entry derive dynamically.
// CRITICAL: the client fallback in public-13.x.js must stay a FALLBACK —
// every payload row carries `path` computed through THIS table, and the
// canonical URL of a team page must never change (U-02).
export const TEAM_SLUGS: Record<string, string> = {
  "Arsenal FC": "arsenal",
  "Chelsea FC": "chelsea",
  "Manchester United FC": "manchester-united",
  "Manchester City FC": "manchester-city",
  "Liverpool FC": "liverpool",
  "FC Barcelona": "barcelona",
  "Real Madrid CF": "real-madrid",
  "Atl\u00E9tico Madrid": "atletico-madrid",
  "Inter Milan": "inter-milan",
  // S11 (Persian entity naming/metadata polish — route plan §7 no-op
  // tidiness fix): the LIVE canonical URLs for these two selected clubs are
  // PROVIDER-DERIVED (the football-data.org legal forms). The pinned
  // `inter-milan` / `atletico-madrid` entries above are DEAD (the provider
  // names "FC Internazionale Milano" / "Club Atlético de Madrid" miss the
  // pinned keys + fall through to teamSlug()'s NFD-strip derivation, which
  // produces the same kebab slug the explicit pin would). Adding the
  // provider-name keys here aligns the table with reality — the slug the
  // derivation produces IS the slug the explicit pin returns, so this is a
  // true no-op: zero URL change, zero byte-frozen surface change (the team
  // page's faName + the Persian name agreement hold — verified by the
  // route plan §7 audit + the new check-seo-persian-entities.js gate). The
  // dead `inter-milan` / `atletico-madrid` entries stay for the
  // sportscore/TSP short-form providers (they remain valid for the short
  // spellings — never dead code, just the alternate-key form).
  "Club Atl\u00E9tico de Madrid": "club-atletico-de-madrid",
  "FC Internazionale Milano": "internazionale-milano",
  "AC Milan": "ac-milan",
  "Paris Saint-Germain": "paris-saint-germain",
  "FC Bayern M\u00FCnchen": "bayern-munich",
  "Borussia Dortmund": "borussia-dortmund",
  "Tottenham Hotspur FC": "tottenham",
  "Everton FC": "everton",
  "Juventus": "juventus",
  "AS Roma": "roma",
  "Lazio": "lazio",
  "SS Lazio": "lazio",
  "Torino FC": "torino",
  "Olympique de Marseille": "marseille",
  "Melbourne Victory": "melbourne-victory",
  "Melbourne City": "melbourne-city",
  "Sydney FC": "sydney-fc",
  "Adelaide United": "adelaide-united",
  "Western Sydney Wanderers": "western-sydney-wanderers"
};

export function compSlug(code) {
  if (COMP_SLUGS[code]) return COMP_SLUGS[code];
  // Unknown codes derive a stable slug from their code.
  return String(code || "c").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "c";
}

// Tiny legal-form tokens stripped from team slugs (U-02 readability).
// Meaningful words (united, city, wanderers) are KEPT — only legal bits go.
const STRICT_STRIP = new Set(["fc", "cf", "afc", "ac", "sc", "if", "sk", "fk", "bk", "ss", "us", "ud", "cd", "as", "calcio"]);

export function teamSlug(name) {
  const fixed = TEAM_SLUGS[name];
  if (fixed) return fixed;
  let s = String(name || "");
  try { s = s.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); } catch (e) { /* older runtimes */ }
  s = s.toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  const words = s.split(/\s+/).filter(Boolean);
  const kept = words.filter((w) => !(STRICT_STRIP.has(w) && words.length > 1) && !/^\d{3,4}$/.test(w));
  const out = (kept.length ? kept : words).join("-");
  return (out || "team").slice(0, 60);
}

// The canonical match URL path. Server pages, the matches.json API, the
// sitemap, JSON-LD and the pubMatch `path` field ALL go through this one
// builder — one expression, zero divergence (v13.80's whole point).
export function matchPath(homeName, awayName, utcDate) {
  const d = String(utcDate || "").slice(0, 10);
  return `/matches/${teamSlug(homeName)}-vs-${teamSlug(awayName)}-${d}`;
}
