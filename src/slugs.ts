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
  // v13.279-gsc404 (P4 — slug-stability folding): a name that is a KNOWN
  // VARIANT of a pinned club (or of the 1-magdeburg fixture family) resolves
  // to that club's pinned slug instead of deriving a fresh one — pre-v13.80
  // minted duplicate URL forms (chelsea-vs-tottenham-hotspur-… vs
  // chelsea-vs-tottenham-…) and the providers still disagree on name forms
  // (FD "Tottenham Hotspur FC" vs sportscore "Tottenham Hotspur"; "Milan"
  // vs "AC Milan"; "Magdeburg" vs "1. FC Magdeburg"). Every pair below is a
  // provider-verified variant observed in the GSC 2026-11-23 export
  // (220 not-found URLs; 12 confirmed variant forms). The fold NEVER
  // changes a pinned club's canonical slug — the alias resolves THROUGH
  // the TEAM_SLUGS table (U-02 stability holds; gated by
  // check-seo-slugfold.js). The fold table + the derive live INLINE (flat,
  // indented blocks only) so the narrow harness evals that extract this
  // single function keep working verbatim — the self-contained convention.
  const slugFoldKey = (s) => {
    let t = String(s || "");
    try { t = t.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); } catch (e) { /* older runtimes */ }
    return t.toLowerCase().replace(/[^a-z0-9]/g, "");
  };
  const FOLD = {
    "tottenhamhotspur": "Tottenham Hotspur FC",   // sportscore/TSP short form → pinned "tottenham"
    "bayernmunchen": "FC Bayern M\u00FCnchen",     // TSP native spelling → pinned "bayern-munich"
    "bayernmunich": "FC Bayern M\u00FCnchen",      // English exonym form → pinned "bayern-munich"
    "milan": "AC Milan",                           // the sassuolo-vs-milan-2026-10-11 mint source → pinned "ac-milan"
    "1fcmagdeburg": "1. FC Magdeburg",             // FD legal form → derived "1-magdeburg" (stable)
    "magdeburg": "1. FC Magdeburg"                 // short form → SAME derived slug (the /teams/magdeburg duplicate)
  };
  const foldedName = FOLD[slugFoldKey(name)];
  if (foldedName) {
    const pinned = TEAM_SLUGS[foldedName];
    if (pinned) return pinned;
    name = foldedName; // the 1. FC Magdeburg family derives from the legal form
  }
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

// ---------------------------------------------------------------------------
// v13.279-gsc404 — the frozen legacy-URL redirect map (P1) and the
// intentionally-gone entity sets (P2/P5).
//
// ORIGIN of the 12 match entries: the GSC 2026-11-23 export's 12 confirmed
// "variant URL" not-founds — pre-v13.80 client-side href minting (the public
// JS slugifier had no TEAM_SLUGS table and no NFD accent strip, so
// "Tottenham Hotspur" → tottenham-hotspur, "Bayern München" → bayern-munchen,
// "Milan" → milan) plus provider date variance (valencia-…-2026-11-08 for the
// 11-07 kickoff; ogc-nice-…-10-31 for the 10-30 kickoff; olympique-lyonnais
// date ±1). Each target below is the verified live-200 canonical twin (audit
// re-probe 2026-11-23/24, table P1). The map is FROZEN — changes go through
// check-seo-redirects.js, which pins the exact key set + chain-safety +
// target shape. One team-page duplicate rides the same map:
// /teams/magdeburg → /teams/1-magdeburg (the short Magdeburg form's page;
// P4's fold makes both names derive "1-magdeburg" going forward).
// Redirects are 301 + Cache-Control: public, max-age=31536000 — the maps are
// permanent by design (a variant form will never again be canonical).
export const LEGACY_URL_REDIRECTS: Record<string, string> = {
  // --- provider name variants (pre-v13.80 minting + provider short forms) ---
  "/matches/manchester-united-vs-tottenham-hotspur-2026-10-10": "/matches/manchester-united-vs-tottenham-2026-10-10",
  "/matches/chelsea-vs-tottenham-hotspur-2026-10-24": "/matches/chelsea-vs-tottenham-2026-10-24",
  "/matches/milan-vs-internazionale-milano-2026-10-31": "/matches/ac-milan-vs-internazionale-milano-2026-10-31",
  "/matches/bayern-munchen-vs-borussia-dortmund-2026-10-31": "/matches/bayern-munich-vs-borussia-dortmund-2026-10-31",
  "/matches/bayern-munchen-vs-rb-leipzig-2026-10-17": "/matches/bayern-munich-vs-rb-leipzig-2026-10-17",
  "/matches/freiburg-vs-bayern-munchen-2026-10-25": "/matches/freiburg-vs-bayern-munich-2026-10-25",
  "/matches/sassuolo-vs-milan-2026-10-11": "/matches/sassuolo-vs-ac-milan-2026-10-11",
  // --- provider date variance (kickoff date ±1 in the provider's local
  // form). NOTE (live-verified 2026-11-23, this session): the Levante–Atléti
  // twin is the 2026-10-31 archived row — the audit brief's table said
  // 2026-10-30 but the live probe answered 404 on -10-30 / 200 on -10-31
  // (the archived row: Levante UD vs Club Atlético de Madrid, 2026-10-31,
  // La Liga) — recorded in the remediation report.
  "/matches/valencia-vs-real-madrid-2026-11-08": "/matches/valencia-vs-real-madrid-2026-11-07",
  "/matches/barcelona-vs-deportivo-alaves-2026-11-01": "/matches/barcelona-vs-deportivo-alaves-2026-10-31",
  "/matches/levante-vs-club-atletico-de-madrid-2026-11-01": "/matches/levante-vs-club-atletico-de-madrid-2026-10-31",
  "/matches/olympique-lyonnais-vs-angers-sco-2026-10-31": "/matches/olympique-lyonnais-vs-angers-sco-2026-11-01",
  "/matches/ogc-nice-vs-stade-rennais-2026-10-31": "/matches/ogc-nice-vs-stade-rennais-2026-10-30",
  // --- the P3 lost cup ties' non-canonical GSC forms (date/name variance on
  // the seeded 2026-10-28 DFB-Pokal Bayern–Magdeburg fixture) ---
  "/matches/bayern-munich-vs-magdeburg-2026-10-27": "/matches/bayern-munich-vs-1-magdeburg-2026-10-28",
  // --- the team-page duplicate (P4 collapse) ---
  "/teams/magdeburg": "/teams/1-magdeburg"
};

// P5/P2: entity pages the owner has intentionally killed serve 410 (faster
// index removal than 404 — the a-league hiding is v13.173-noal, owner order
// 2026-10-24; a 410 states the death explicitly). Everything else in
// COMP_SLUGS is a KNOWN competition and gets the P5 fallback shell
// (200 + noindex) when the pool has no rows for it.
export const GONE_COMP_SLUGS = new Set(["a-league"]);
