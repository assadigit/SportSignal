#!/usr/bin/env node
// scripts/check-seo-entity-parity.js
// SEO Follow-up Track Session 16 (S16-M1 — the entity-grounding parity,
// the P1-2 gap fix). The match-page SportsEvent homeTeam/awayTeam
// SportsTeam nodes now carry the same verified-map `sameAs` (Wikipedia +
// Wikidata) as the team-page SportsTeam node (sportsTeamNode). The match
// page is the click-earner page type; the entity grounding is now
// consistent across the page types.
//
// Freeze-safe: the `sameAs` is a JSON-LD field (NOT a byte-frozen
// title/H1/description/answer-sentence byte). Pure static-map lookup
// (zero new KV-read/subrequest/CPU — rule §1.5).
"use strict";
const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");

let failures = 0;
let oks = 0;
function ok(msg) { oks++; console.log("OK   check-seo-entity-parity: " + msg); }
function bad(msg) { console.error("FAIL check-seo-entity-parity: " + msg); failures++; }

const jsonldSrc = fs.readFileSync(path.join(root, "src", "seo", "jsonld.ts"), "utf8");

// 1. teamRef exists + builds a SportsTeam node (the match-page homeTeam/awayTeam).
if (/function teamRef\s*\(\s*name\s*:\s*string\s*\)/.test(jsonldSrc)) ok("teamRef exists (the match-page homeTeam/awayTeam SportsTeam builder)");
else bad("teamRef function not found");

// 2. teamRef looks up TEAM_ENTITY_LINKS[name] + adds sameAs (the S16-M1 fix).
if (/teamRef[\s\S]*?const links = TEAM_ENTITY_LINKS\[name\][\s\S]*?if \(links && links\.length\) node\.sameAs = links/.test(jsonldSrc)) ok("S16-M1: teamRef looks up TEAM_ENTITY_LINKS[name] + adds sameAs (the entity-grounding parity)");
else bad("S16-M1: teamRef does NOT add the TEAM_ENTITY_LINKS sameAs — the match-page SportsTeam nodes are bare (the P1-2 gap NOT fixed)");

// 3. sportsTeamNode (the team-page path) uses the SAME links source (TEAM_ENTITY_LINKS).
if (/function sportsTeamNode[\s\S]*?const links = TEAM_ENTITY_LINKS\[entry\.name\][\s\S]*?if \(links && links\.length\) node\.sameAs = links/.test(jsonldSrc)) ok("sportsTeamNode uses the same TEAM_ENTITY_LINKS source (the parity foundation — the team-page + the match-page share the same verified map)");
else bad("sportsTeamNode does NOT use TEAM_ENTITY_LINKS (the parity foundation is broken)");

// 4. TEAM_ENTITY_LINKS is imported in jsonld.ts.
if (/import\s*\{[^}]*TEAM_ENTITY_LINKS[^}]*\}\s*from\s*["']\.\/entity-links["']/.test(jsonldSrc)) ok("TEAM_ENTITY_LINKS is imported from ./entity-links (the verified static map — pure lookup, no fetching)");
else bad("TEAM_ENTITY_LINKS is NOT imported in jsonld.ts");

// 5. sportsEventNode uses teamRef for BOTH homeTeam + awayTeam.
if (/homeTeam:\s*teamRef\(/.test(jsonldSrc) && /awayTeam:\s*teamRef\(/.test(jsonldSrc)) ok("sportsEventNode uses teamRef for BOTH homeTeam + awayTeam (the parity applies to both competitors)");
else bad("sportsEventNode does NOT use teamRef for both homeTeam + awayTeam");

// 6. The freeze-coordination: the sameAs is a JSON-LD field — NOT a byte-frozen surface.
//    Scoped to the teamRef function body only (from `function teamRef` to the next
//    `function`/`export function` declaration).
const teamRefBody = (jsonldSrc.match(/function teamRef[\s\S]*?(?=\n(?:export )?function )/) || [""])[0];
if (teamRefBody && !/(<h[1-6]|<title|<meta name="description"|pageh1|heroH1)/i.test(teamRefBody)) ok("the freeze-coordination: teamRef adds a JSON-LD field ONLY — no byte-frozen title/H1/description HTML touched (scoped to the teamRef body)");
else bad("the freeze-coordination: teamRef appears to touch a byte-frozen HTML surface (review needed — body: " + teamRefBody.slice(0, 120) + "…)");

// 7. The organizer (SportsOrganization) sameAs is intact (the S13/S14 contract — re-verified).
if (/organizerLinks\s*&&\s*organizerLinks\.length\s*\?\s*\{\s*sameAs:\s*organizerLinks\s*\}/.test(jsonldSrc)) ok("the organizer SportsOrganization sameAs is intact (the SS-05 contract — the competition entity grounding unchanged)");
else bad("the organizer SportsOrganization sameAs contract regressed");

if (failures) { console.error("\ncheck-seo-entity-parity: " + failures + " failure(s)"); process.exit(1); }
console.log("OK   check-seo-entity-parity: all " + oks + " entity-grounding-parity gates passed (S16-M1: the match-page SportsTeam sameAs = the team-page SportsTeam sameAs; the TEAM_ENTITY_LINKS verified map; the freeze-coordination; the organizer contract intact)");
