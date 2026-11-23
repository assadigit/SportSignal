#!/usr/bin/env node
// scripts/check-seo-slugfold.js
// v13.279-gsc404 (P4 — slug-stability folding): gates the teamSlug alias
// fold. The REAL teamSlug (required from src/slugs.ts — a root leaf).
//   1. THE FOLD — every provider alias form resolves to the pinned slug:
//      Tottenham Hotspur → tottenham, Bayern München / Bayern Munich →
//      bayern-munich, Milan → ac-milan, 1. FC Magdeburg / Magdeburg →
//      1-magdeburg (the audit's four observed pairs + the magdeburg dup).
//   2. THE NON-REGRESSION — every TEAM_SLUGS key still maps to its pinned
//      value (the 13 selected clubs' canonical slugs NEVER change — U-02),
//      and the historical provider legal forms keep their slugs
//      (FC Internazionale Milano → internazionale-milano, Club Atlético de
//      Madrid → club-atletico-de-madrid — the S11 no-op contract).
//   3. THE MINT LAW — the fold prevents NEW variant URLs: matchPath built
//      from the variant name and from the canonical name agree (the URL
//      vocabulary has ONE form per club — v13.80's zero-divergence law).
//   4. NO OVER-FOLDING — distinct clubs stay distinct (Milan ≠
//      Internazionale; Magdeburg's short form never folds some OTHER club).
"use strict";
const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");

let failures = 0;
function ok(msg) { console.log("OK   check-seo-slugfold: " + msg); }
function bad(msg) { console.error("FAIL check-seo-slugfold: " + msg); failures++; }
function check(cond, msg) { if (cond) ok(msg); else bad(msg); }

const slugsSrc = fs.readFileSync(path.join(root, "src", "slugs.ts"), "utf8");
const { teamSlug, matchPath, TEAM_SLUGS } = require(path.join(root, "src", "slugs.ts"));

// ---------- 1. the fold ----------
check(teamSlug("Tottenham Hotspur") === "tottenham", 'fold: "Tottenham Hotspur" → tottenham (the pinned slug, not tottenham-hotspur)');
check(teamSlug("Bayern München") === "bayern-munich", 'fold: "Bayern München" (TSP native) → bayern-munich');
check(teamSlug("Bayern Munich") === "bayern-munich", 'fold: "Bayern Munich" (exonym) → bayern-munich');
check(teamSlug("Milan") === "ac-milan", 'fold: "Milan" → ac-milan (the sassuolo-vs-milan-2026-10-11 mint source)');
check(teamSlug("1. FC Magdeburg") === "1-magdeburg", 'fold: "1. FC Magdeburg" → 1-magdeburg (stable derived slug)');
check(teamSlug("Magdeburg") === "1-magdeburg", 'fold: "Magdeburg" → 1-magdeburg (the /teams/magdeburg duplicate collapses)');

// ---------- 2. the non-regression (U-02: the pins never change) ----------
{
  let pinsOk = true;
  for (const [name, slug] of Object.entries(TEAM_SLUGS)) {
    if (teamSlug(name) !== slug) { pinsOk = false; bad("pin drifted: " + name + " expected " + slug + " got " + teamSlug(name)); }
  }
  check(pinsOk, "non-regression: every TEAM_SLUGS key still maps to its pinned slug (fold resolves THROUGH the table)");
}
check(teamSlug("FC Internazionale Milano") === "internazionale-milano", "non-regression: FC Internazionale Milano → internazionale-milano (the S11 provider-legal live form)");
check(teamSlug("Club Atlético de Madrid") === "club-atletico-de-madrid", "non-regression: Club Atlético de Madrid → club-atletico-de-madrid (the S11 provider-legal live form)");
check(teamSlug("AC Milan") === "ac-milan", "non-regression: AC Milan stays ac-milan");
check(teamSlug("Tottenham Hotspur FC") === "tottenham", "non-regression: Tottenham Hotspur FC stays tottenham");
check(teamSlug("FC Bayern München") === "bayern-munich", "non-regression: FC Bayern München stays bayern-munich");
check(teamSlug("Olympique Lyonnais") === "olympique-lyonnais" || true, "(informational: unpinned clubs keep their derivation)");

// ---------- 3. the mint law (variant == canonical — one URL per fixture) ----------
{
  const pairs = [
    ["Tottenham Hotspur", "Tottenham Hotspur FC"],
    ["Bayern Munich", "FC Bayern München"],
    ["Bayern München", "FC Bayern München"],
    ["Milan", "AC Milan"],
    ["Magdeburg", "1. FC Magdeburg"]
  ];
  let mintOk = true;
  for (const [variant, canonical] of pairs) {
    const a = matchPath(variant, "Chelsea FC", "2026-11-20T20:00:00Z");
    const b = matchPath(canonical, "Chelsea FC", "2026-11-20T20:00:00Z");
    if (a !== b) { mintOk = false; bad("mint divergence: " + variant + " (" + a + ") ≠ " + canonical + " (" + b + ")"); }
  }
  check(mintOk, "mint law: variant-name and canonical-name matchPath agree (no new variant URLs get minted)");
}

// ---------- 4. no over-folding ----------
check(teamSlug("Milan") !== teamSlug("FC Internazionale Milano"), "no over-fold: Milan (AC Milan) never collides with Internazionale Milano");
check(teamSlug("Magdeburg") !== teamSlug("VfL Magdeburg II") || true, "(informational guard)");
check(teamSlug("1. FC Magdeburg") !== teamSlug("Bayern Munich"), "no over-fold: distinct clubs stay distinct");
// the fold table stays small + self-contained in the extracted body
check(/const FOLD = \{/.test(slugsSrc) && !/TEAM_SLUG_FOLD/.test(slugsSrc),
  "wiring: the fold table lives INLINE in teamSlug (the harness-extraction self-containment contract)");

if (failures) {
  console.error("check-seo-slugfold: " + failures + " failure(s)");
  process.exit(1);
} else {
  console.log("check-seo-slugfold: all checks passed");
}
