// Shared match-identity / de-duplication helpers (M1 slice #2).
//
// Pure logic, depends only on src/teams.js. Consumed by:
//   - src/worker.ts via `import { matchKey, canonDedupe } from "./dedupe.js"`
//   - scripts/check-dedupe.js and live-derby-test.js via require
// Do not inline copies back into worker.ts.
"use strict";

const { normalizeTeamName } = require("./teams.js");

// Stable identity key for a single match (used for notification tracking, NOT
// for cross-provider dedupe — that is canonDedupe's shorter key).
function matchKey(match) {
  return normalizeTeamName(match.homeTeam.name) + "|" + normalizeTeamName(match.awayTeam.name) + "|" + String(match.utcDate || "").slice(0, 16);
}

// Collapse two providers' copies of the SAME match to one row, keeping venue +
// crests from whichever copy carries them. Late copies (watch-order) win for
// the row body but adopt earlier venue/crest.
function canonDedupe(list) {
  const canon = (m) => `${m.competition.code}|${normalizeTeamName(m.homeTeam.name)}|${normalizeTeamName(m.awayTeam.name)}|${(m.utcDate || "").slice(0, 10)}`;
  const adopt = (cur, m) => {
    if (!cur.venue && m.venue) cur.venue = m.venue;
    if (!cur.homeTeam.crest && m.homeTeam.crest) cur.homeTeam.crest = m.homeTeam.crest;
    if (!cur.awayTeam.crest && m.awayTeam.crest) cur.awayTeam.crest = m.awayTeam.crest;
  };
  const byKey = new Map();
  for (const m of list) {
    const k = canon(m);
    const cur = byKey.get(k);
    if (cur) adopt(m, cur);
    byKey.set(k, m);
  }
  return [...byKey.values()];
}

module.exports = { matchKey, canonDedupe };
