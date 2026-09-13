// Shared team-name normalizer (M1 first slice: test-first).
//
// One implementation, two deliberate policies. Consumed by:
//   - src/worker.ts   (the esbuild bundle) via `import { ... } from "./teams.js"`
//   - scripts/check-dedupe.js, check-fa-dict.js, live-derby-test.js via
//     `require("../src/teams.js")`
//
// Do NOT inline copies of these back into worker.ts or into a test script —
// that reintroduces the drift M7 removed. If you touch the token lists here,
// run `npm test` (all three consumers are exercised).
"use strict";

const NORM_BASE_TOKENS = "fc|cf|sc|ac|as|ssc|bc|ud|cd|kv|jc|fk|nk|gnk|msk|sk|sl|rsc|bsc|jk|tc|pfc|sv|tsg";

// v13.8-dedupe: provider-transliteration fold. Some providers return the
// native spelling (München, Köln, Zenit), others the English exonym
// (Munich, Cologne, Zenit). After the accent strip, "münchen"→"munchen"
// but "munich" stays "munich" — DIFFERENT keys → the SAME fixture
// appeared twice in notifications (observed live: Elversberg vs Bayern).
// This table folds the known variant spellings to a single form so the
// dedupe key is stable across providers. Keep it SHORT + SPECIFIC — each
// entry is a verified provider-variant pair (over-folding would merge
// distinct teams).
var TRANSLIT_FOLDS = {
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
function normTeamName(name, extraTokens) {
  var tokens = extraTokens ? NORM_BASE_TOKENS + "|" + extraTokens : NORM_BASE_TOKENS;
  var s = String(name || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  // v13.8-dedupe: apply the transliteration fold AFTER the accent strip
  // (so München → munchen) but BEFORE token stripping + non-alphanumeric
  // removal (so the fold keys match the still-spaced form).
  for (var from in TRANSLIT_FOLDS) {
    s = s.replace(from, TRANSLIT_FOLDS[from]);
  }
  return s
    .replace(new RegExp("\\b(" + tokens + ")\\b", "g"), " ")
    .replace(/[^a-z0-9]/g, "");
}

function normalizeTeamName(name) {
  return normTeamName(name, "");
}

function normTeamKey(name) {
  return normTeamName(name, "afc|rcd|rc|deportivo|athletic|racing|club");
}

module.exports = { NORM_BASE_TOKENS, TRANSLIT_FOLDS, normTeamName, normalizeTeamName, normTeamKey };
