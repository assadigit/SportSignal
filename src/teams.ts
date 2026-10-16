// Shared team-name normalizer (M1 first slice: test-first).
//
// One implementation, two deliberate policies. Consumed by:
//   - the esbuild Worker bundle via `import { ... } from "./teams"`
//   - scripts/check-dedupe.js, check-fa-dict.js, check-composers.js,
//     live-derby-test.js via `require("../src/teams.ts")` — Node ≥23
//     requires .ts directly (type stripping; this file uses erasable
//     syntax only: no enums/namespaces/param properties).
//
// v13.33-ts: migrated from plain JS to TypeScript. Types only — the
// normalizer logic is byte-identical to the v13.8 JS (the eval gate +
// check-dedupe guard behavior).
//
// Do NOT inline copies of these back into the worker or into a test script —
// that reintroduces the drift M7 removed. If you touch the token lists here,
// run `npm test` (all consumers are exercised).

const NORM_BASE_TOKENS: string = "fc|cf|sc|ac|as|ssc|bc|ud|cd|kv|jc|fk|nk|gnk|msk|sk|sl|rsc|bsc|jk|tc|pfc|sv|tsg";

// v13.8-dedupe: provider-transliteration fold. Some providers return the
// native spelling (München, Köln, Zenit), others the English exonym
// (Munich, Cologne, Zenit). After the accent strip, "münchen"→"munchen"
// but "munich" stays "munich" — DIFFERENT keys → the SAME fixture
// appeared twice in notifications (observed live: Elversberg vs Bayern).
// This table folds the known variant spellings to a single form so the
// dedupe key is stable across providers. Keep it SHORT + SPECIFIC — each
// entry is a verified provider-variant pair (over-folding would merge
// distinct teams).
const TRANSLIT_FOLDS: Record<string, string> = {
  "munchen": "munich",     // FC Bayern München (FD) vs Bayern Munich (TSP)
  "koln": "cologne",       // 1. FC Köln vs Cologne
  "sanktpauli": "stpauli", // FC St. Pauli variants
  "zenitsaintpetersburg": "zenit",       // Zenit Санкт-Петербург
  "zenitstpetersburg": "zenit",
  "sportingclubdeportugal": "sportingcp", // Sporting CP variants
  "sportinglisbon": "sportingcp",
  "shakhtardonetsk": "shakhtar",         // Shakhtar Donetsk
  "dinamokiev": "dynamokyiv",            // Dynamo Kyiv variants
  "redstarbelgrade": "redstar",          // Crvena Zvezda / Red Star
  "crvenazvezda": "redstar"
};

// normalizeTeamName is conservative (match identity/dedupe: never merges
// "Athletic Club" and "Racing Club"). normTeamKey adds club-prefix tokens so
// the FA dictionary can collapse provider variants ("AFC Bournemouth" ===
// "Bournemouth").
function normTeamName(name: string, extraTokens?: string): string {
  const tokens = extraTokens ? NORM_BASE_TOKENS + "|" + extraTokens : NORM_BASE_TOKENS;
  let s = String(name || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  // v13.8-dedupe: apply the transliteration fold AFTER the accent strip
  // (so München → munchen) but BEFORE token stripping + non-alphanumeric
  // removal (so the fold keys match the still-spaced form).
  for (const from in TRANSLIT_FOLDS) {
    s = s.replace(from, TRANSLIT_FOLDS[from]);
  }
  return s
    .replace(new RegExp("\\b(" + tokens + ")\\b", "g"), " ")
    // v13.110-digitfold: club-name digits are founding years / ordinals
    // ("1. FC Köln", "Bayer 04 Leverkusen", "TSG 1899 Hoffenheim",
    // "Schalke 04", "Parma Calcio 1913") — NEVER identity-bearing. The old
    // [^a-z0-9] strip kept them, so FD's legal "1. FC Köln" keyed as
    // "1cologne" while sportscore's "FC Köln" keyed as "cologne": the same
    // fixture survived canonDedupe as TWO rows (live 2026-10-16: the night
    // digest printed Eintracht Frankfurt 1-0 Köln twice) and sportscore
    // rows of digit-named clubs failed follow-matching. No two distinct
    // clubs in the tracked universe differ only by digits — the strip is
    // a pure fold.
    .replace(/[^a-z]/g, "");
}

function normalizeTeamName(name: string): string {
  return normTeamName(name, "");
}

function normTeamKey(name: string): string {
  return normTeamName(name, "afc|rcd|rc|deportivo|athletic|racing|club");
}

export { NORM_BASE_TOKENS, TRANSLIT_FOLDS, normTeamName, normalizeTeamName, normTeamKey, TEAM_ALIASES, normAlias };
// v13.76-matchsplit: TEAM_ALIASES + normAlias moved here from matches.ts —
// team-name alias folding belongs with normalizeTeamName/normTeamKey, and
// the move kills the users↔matches import cycle (the only cycle in the
// graph). Consumers: match-classify (shouldNotify/isMasterPair/isDerby/...),
// users, composers, admin, digest, public-matches.
var TEAM_ALIASES = {
  "clubatleticodemadrid": "atleticomadrid",
  "atleticodemadrid": "atleticomadrid",
  "internazionale": "intermilan",
  "internazionalemilano": "intermilan",
  // v13.102-bayernfix: the "bayernmunich"→"bayernmunchen" alias is REMOVED.
  // It predates the v13.8 TRANSLIT_FOLDS and now CONFLICTS with them: the
  // folds (inside normalizeTeamName) unify both spellings onto
  // "bayernmunich", but this alias then flipped every normAlias() consumer
  // back to "bayernmunchen" — while every set (master normSet, shouldNotify's
  // c.all, isFeaturedMatch, userFollowsMatch) is built with BARE
  // normalizeTeamName. Result: shouldNotify("FC Bayern München")=false for
  // BOTH spellings → Bayern fixtures vs non-master opponents silently never
  // notified (verified live: notified_v1 has ZERO bayern rows ever; found by
  // the v13.102 check-lifecycle harness when its Bayern–LASK fixture came
  // out unworthy). The v12.15 duplicate-chip purpose is already covered by
  // the fold: normalizeTeamName("Bayern Munich") ===
  // normalizeTeamName("FC Bayern München") === "bayernmunich".
  // v13.51-rivalries: FD's legal name "SS Lazio" folds to the short form the
  // rivalry table carries — without this fold the two spellings ("SS Lazio"
  // vs "Lazio") never meet in derby/rivalry matching.
  "sslazio": "lazio"
};
function normAlias(name) {
  const n = normalizeTeamName(name);
  return TEAM_ALIASES[n] || n;
}
