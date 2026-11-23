#!/usr/bin/env node
// scripts/check-seo-redirects.js
// v13.279-gsc404 (P1): gates the frozen legacy-URL 301 map.
//   1. THE FREEZE — the exact 14-entry map content (12 provider name/date
//      variant match forms + the seeded cup-tie's date/name form + the
//      magdeburg team-page duplicate) pinned key-by-key; any change to the
//      map must consciously update this gate in the same commit.
//   2. SHAPE — every key is a /matches/{slug} or /teams/{slug} path; every
//      target is the same family; every target parses as a valid match slug
//      or team slug (no bare/relative/external targets).
//   3. CHAIN SAFETY — no target is itself a map key (zero redirect chains);
//      key ≠ target for every entry (a map entry that "redirects" to itself
//      would be an infinite loop).
//   4. WIRING — the router consults LEGACY_URL_REDIRECTS BEFORE any render
//      and emits 301 + Location + Cache-Control: public, max-age=31536000
//      (permanent map → one-year cache; ~0 CPU — cliff pressure DOWN).
//   5. TARGET EXISTENCE — the 12 variant-twin targets are verified against
//      the production archive (the live 200 twins, audit-verified
//      2026-11-23/24; the two seeded cup-tie targets are verified by the
//      P3 seed gate + check-seo-archivescope). Offline, the frozen
//      expected-slug list IS the verified-200 registry; live existence is
//      re-verified by the post-deploy probe (the remediation report's
//      acceptance list).
"use strict";
const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");

let failures = 0;
function ok(msg) { console.log("OK   check-seo-redirects: " + msg); }
function bad(msg) { console.error("FAIL check-seo-redirects: " + msg); failures++; }
function check(cond, msg) { if (cond) ok(msg); else bad(msg); }

const slugsSrc = fs.readFileSync(path.join(root, "src", "slugs.ts"), "utf8");
const routerSrc = fs.readFileSync(path.join(root, "src", "seo", "router.ts"), "utf8");
const { teamSlug, matchPath, LEGACY_URL_REDIRECTS } = require(path.join(root, "src", "slugs.ts"));

// ---------- 1. the freeze ----------
const FROZEN_MAP = {
  "/matches/manchester-united-vs-tottenham-hotspur-2026-10-10": "/matches/manchester-united-vs-tottenham-2026-10-10",
  "/matches/chelsea-vs-tottenham-hotspur-2026-10-24": "/matches/chelsea-vs-tottenham-2026-10-24",
  "/matches/milan-vs-internazionale-milano-2026-10-31": "/matches/ac-milan-vs-internazionale-milano-2026-10-31",
  "/matches/bayern-munchen-vs-borussia-dortmund-2026-10-31": "/matches/bayern-munich-vs-borussia-dortmund-2026-10-31",
  "/matches/bayern-munchen-vs-rb-leipzig-2026-10-17": "/matches/bayern-munich-vs-rb-leipzig-2026-10-17",
  "/matches/freiburg-vs-bayern-munchen-2026-10-25": "/matches/freiburg-vs-bayern-munich-2026-10-25",
  "/matches/sassuolo-vs-milan-2026-10-11": "/matches/sassuolo-vs-ac-milan-2026-10-11",
  "/matches/valencia-vs-real-madrid-2026-11-08": "/matches/valencia-vs-real-madrid-2026-11-07",
  "/matches/barcelona-vs-deportivo-alaves-2026-11-01": "/matches/barcelona-vs-deportivo-alaves-2026-10-31",
  "/matches/levante-vs-club-atletico-de-madrid-2026-11-01": "/matches/levante-vs-club-atletico-de-madrid-2026-10-31",
  "/matches/olympique-lyonnais-vs-angers-sco-2026-10-31": "/matches/olympique-lyonnais-vs-angers-sco-2026-11-01",
  "/matches/ogc-nice-vs-stade-rennais-2026-10-31": "/matches/ogc-nice-vs-stade-rennais-2026-10-30",
  "/matches/bayern-munich-vs-magdeburg-2026-10-27": "/matches/bayern-munich-vs-1-magdeburg-2026-10-28",
  "/teams/magdeburg": "/teams/1-magdeburg"
};
{
  const keys = Object.keys(LEGACY_URL_REDIRECTS);
  check(keys.length === 14, "the map carries exactly the 14 frozen entries (found " + keys.length + ")");
  let same = true;
  for (const k of Object.keys(FROZEN_MAP)) {
    if (LEGACY_URL_REDIRECTS[k] !== FROZEN_MAP[k]) { same = false; bad("map entry drifted: " + k); }
  }
  check(same, "every frozen entry matches the live map byte-for-byte (hash-frozen)");
}

// ---------- 2. shape ----------
const MATCH_SLUG = /^([a-z0-9]+(?:-[a-z0-9]+)*)-vs-([a-z0-9]+(?:-[a-z0-9]+)*)-(\d{4}-\d{2}-\d{2})$/;
{
  let shapeOk = true;
  for (const [k, v] of Object.entries(LEGACY_URL_REDIRECTS)) {
    if (!/^\/(matches|teams)\/[a-z0-9-]+$/.test(k) || !/^\/(matches|teams)\/[a-z0-9-]+$/.test(v)) { shapeOk = false; bad("non-family path in map: " + k + " → " + v); }
    if (k === v) { shapeOk = false; bad("self-redirect (infinite loop): " + k); }
    if (k.startsWith("/matches/") !== v.startsWith("/matches/")) { shapeOk = false; bad("family mismatch: " + k + " → " + v); }
    if (k.startsWith("/matches/") && (!MATCH_SLUG.test(k.slice(10)) || !MATCH_SLUG.test(v.slice(10)))) { shapeOk = false; bad("malformed match slug in map: " + k); }
  }
  check(shapeOk, "shape: every key/target is a well-formed /matches/{slug} or /teams/{slug} path, no self-redirects, families match");
}

// ---------- 3. chain safety ----------
{
  const keySet = new Set(Object.keys(LEGACY_URL_REDIRECTS));
  const chained = Object.values(LEGACY_URL_REDIRECTS).filter((v) => keySet.has(v));
  check(chained.length === 0, "chain safety: no redirect target is itself a map key (zero chains)");
}

// ---------- 4. wiring ----------
{
  const iMap = routerSrc.indexOf("LEGACY_URL_REDIRECTS[path]");
  const i301 = routerSrc.indexOf("max-age=31536000");
  const iRender = routerSrc.indexOf("const renderPage =");
  check(iMap !== -1 && i301 !== -1 && iMap < iRender,
    "wiring: the router consults the map BEFORE the HTML render family (early intercept)");
  check(/status: 301/.test(routerSrc.slice(routerSrc.indexOf("function legacyRedirect"), routerSrc.indexOf("function legacyRedirect") + 600)) &&
    /location: absUrl\(target\)/.test(routerSrc.slice(routerSrc.indexOf("function legacyRedirect"), routerSrc.indexOf("function legacyRedirect") + 600)),
    "wiring: the emission is 301 + Location(absUrl) — permanent, not 302");
  check(/"cache-control": "public, max-age=31536000"/.test(routerSrc), "wiring: Cache-Control public, max-age=31536000 (the frozen-map discipline)");
  check(/import \{ LEGACY_URL_REDIRECTS, GONE_COMP_SLUGS \} from "\.\.\/slugs";/.test(routerSrc),
    "wiring: the map is imported from src/slugs.ts (one source of truth, no local copies)");
  // the map must be declared in slugs.ts (the freeze home)
  check(/export const LEGACY_URL_REDIRECTS: Record<string, string> = \{/.test(slugsSrc),
    "wiring: the map is declared as the frozen exported constant in slugs.ts");
}

// ---------- 5. the verified-200 target registry ----------
// The 12 variant twins verified live at audit (2026-11-23/24) — the exact
// archived rows (re-verified against the production blob this session; the
// levante twin is 2026-10-31, live-verified 200 — the audit brief's 10-30
// row was a transcription slip, corrected + documented in the remediation
// report). The two P3 seed targets are gated by check-seo-archivescope +
// the seed script's own assertions.
const VERIFIED_TARGETS = new Set([
  "manchester-united-vs-tottenham-2026-10-10", "chelsea-vs-tottenham-2026-10-24",
  "ac-milan-vs-internazionale-milano-2026-10-31", "bayern-munich-vs-borussia-dortmund-2026-10-31",
  "bayern-munich-vs-rb-leipzig-2026-10-17", "freiburg-vs-bayern-munich-2026-10-25",
  "sassuolo-vs-ac-milan-2026-10-11", "valencia-vs-real-madrid-2026-11-07",
  "barcelona-vs-deportivo-alaves-2026-10-31", "levante-vs-club-atletico-de-madrid-2026-10-31",
  "olympique-lyonnais-vs-angers-sco-2026-11-01", "ogc-nice-vs-stade-rennais-2026-10-30",
  "bayern-munich-vs-1-magdeburg-2026-10-28", // P3 seed target
  "borussia-dortmund-vs-sv-werder-bremen-2026-10-27" // P3 seed canonical (serves directly, no map entry needed)
]);
{
  let allTargetsKnown = true;
  for (const v of Object.values(LEGACY_URL_REDIRECTS)) {
    if (v.startsWith("/matches/") && !VERIFIED_TARGETS.has(v.slice(9))) { allTargetsKnown = false; bad("target not in the verified registry: " + v); }
  }
  check(allTargetsKnown, "every match target is an audit-verified twin or a P3 seed canonical (the no-invented-redirects law)");
  // no blanket redirects: every target is a concrete twin
  check(!Object.values(LEGACY_URL_REDIRECTS).some((v) => v === "/" || v === "/matches" || v === "/teams"),
    "no blanket redirects to / or hub pages (only verified equivalents)");
}

if (failures) {
  console.error("check-seo-redirects: " + failures + " failure(s)");
  process.exit(1);
} else {
  console.log("check-seo-redirects: all checks passed");
}
