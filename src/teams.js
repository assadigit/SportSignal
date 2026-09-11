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

// normalizeTeamName is conservative (match identity/dedupe: never merges
// "Athletic Club" and "Racing Club"). normTeamKey adds club-prefix tokens so
// the FA dictionary can collapse provider variants ("AFC Bournemouth" ===
// "Bournemouth").
function normTeamName(name, extraTokens) {
  var tokens = extraTokens ? NORM_BASE_TOKENS + "|" + extraTokens : NORM_BASE_TOKENS;
  return String(name || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(new RegExp("\\b(" + tokens + ")\\b", "g"), " ")
    .replace(/[^a-z0-9]/g, "");
}

function normalizeTeamName(name) {
  return normTeamName(name, "");
}

function normTeamKey(name) {
  return normTeamName(name, "afc|rcd|rc|deportivo|athletic|racing|club");
}

module.exports = { NORM_BASE_TOKENS, normTeamName, normalizeTeamName, normTeamKey };
