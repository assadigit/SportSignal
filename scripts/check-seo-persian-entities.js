#!/usr/bin/env node
// scripts/check-seo-persian-entities.js
// SEO Program Session 11 (Persian entity naming/metadata polish —
// spelling-freeze-aware: the alternateName JSON-LD aliases + the
// non-title metadata [og:type, og:locale] + the TEAM_SLUGS no-op tidiness
// fix are NOT GSC-measured surfaces; the byte-frozen title/H1/description/
// answer-sentence bytes are untouched).
//
// The Session 11 scope (route plan §10 + keyword map §2.1-2.15 + the
// spec §7/§8 Persian + English SEO discipline):
//   1. og:type=article on the 3 DETAIL page types (match/team/competition)
//      + the og:type=website DEFAULT on hubs/index pages stays (the S07-H4
//      follow-up — og:type is a <meta> in <head>, NOT a GSC-measured
//      surface; the byte-frozen title/H1/description/answer are untouched).
//   2. og:locale=fa_IR on every page (the existing pin in page-shell.ts —
//      re-verified here so a regression is caught).
//   3. The SEO_EXTRA_ALIASES map carries ADDITIONAL Persian alternateName
//      aliases (the GSC-observed short-form / variant spellings the audit
//      surfaced for selected clubs NOT already in SEO_TEAM_NAME_OVERRIDES).
//      The aliases ride the JSON-LD alternateName array ONLY (machine-
//      readable, invisible to the SERP snippet) — the visible faName / SEO
//      name bytes stay byte-frozen (the Dec 4-8 freeze holds).
//   4. The Barcelona «بارسا» alias — GSC evidence: 179 impressions for
//      «بازی بعدی بارسا» in GSC-AUDIT-BASELINE.md. The alias rides the
//      JSON-LD alternateName array for BOTH the match-page SportsEvent
//      homeTeam/awayTeam refs AND the team-page SportsTeam node.
//   5. The byte-frozen surfaces (the title/H1/description/answer-sentence
//      bytes for the match/team/competition/homepage pages) are NOT
//      changed — the freeze-coordination gate.
//   6. The TEAM_SLUGS no-op tidiness fix — the live provider-derived slugs
//      for Inter + Atlético (internazionale-milano / club-atletico-de-
//      madrid) are now EXPLICIT pins (the derivation produced them all
//      along; the explicit pins align the table with reality — zero URL
//      change). Route plan §7.
"use strict";
const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");

let failures = 0;
let oks = 0;
function ok(msg) { oks++; console.log("OK   check-seo-persian-entities: " + msg); }
function bad(msg) { console.error("FAIL check-seo-persian-entities: " + msg); failures++; }

const pagesSrc = fs.readFileSync(path.join(root, "src", "seo", "pages.ts"), "utf8");
const pageShellSrc = fs.readFileSync(path.join(root, "src", "seo", "page-shell.ts"), "utf8");
const slugsSrc = fs.readFileSync(path.join(root, "src", "slugs.ts"), "utf8");

// Helper: locate a top-level function body in pages.ts (between the
// `export ... function fnName(` signature and the next `export ` line).
function fnBody(src, fnName) {
  const fnStart = src.indexOf("export async function " + fnName + "(");
  const altStart = src.indexOf("export function " + fnName + "(");
  const start = fnStart >= 0 ? fnStart : altStart;
  if (start < 0) return null;
  let end = src.indexOf("\nexport ", start + 1);
  if (end < 0) end = src.length;
  return src.slice(start, end);
}

// ============================================================
// 1. og:type=article on the 3 DETAIL page types (S07-H4 follow-up)
// ============================================================
const detailFns = [
  { name: "buildMatchPage", label: "match-detail" },
  { name: "buildTeamPage", label: "team-detail" },
  { name: "buildCompetitionPage", label: "competition-detail" }
];
let detailOgOk = true;
for (const { name, label } of detailFns) {
  const body = fnBody(pagesSrc, name);
  if (!body) { bad("could not locate " + name + " in pages.ts"); detailOgOk = false; continue; }
  // the buildHead call inside the function body must carry ogType: "article"
  // (locate the buildHead call, then check ogType inside its argument)
  const headIdx = body.indexOf("buildHead({");
  if (headIdx < 0) { bad(name + " lost its buildHead({}) call"); detailOgOk = false; continue; }
  // find the matching }) for the buildHead call (scan forward for the jsonldNodes: array —
  // the ogType sits before jsonldNodes in the HeadInput shape)
  const jsonldIdx = body.indexOf("jsonldNodes:", headIdx);
  if (jsonldIdx < 0) { bad(name + " lost its jsonldNodes array (the @graph assembly)"); detailOgOk = false; continue; }
  const headBlock = body.slice(headIdx, jsonldIdx);
  if (!/ogType:\s*"article"/.test(headBlock)) {
    bad("S11/S07-H4: " + name + " (" + label + ") must pass ogType: \"article\" to buildHead (the detail-page article type — spec §8 + keyword map §2.7/2.8-2.13/2.15)");
    detailOgOk = false;
  }
}
if (detailOgOk) ok("S11/S07-H4: og:type=article on the 3 detail page types (buildMatchPage + buildTeamPage + buildCompetitionPage — spec §8 + keyword map §2.7/2.8-2.13/2.15)");

// ============================================================
// 2. og:type=website DEFAULT on hubs/index pages (no ogType passed → the default)
// ============================================================
const hubFns = [
  { name: "buildMatchesPage", label: "/matches hub" },
  { name: "buildTeamsIndexPage", label: "/teams index" },
  { name: "buildCompetitionsIndexPage", label: "/competitions index" }
];
let hubOgOk = true;
for (const { name, label } of hubFns) {
  const body = fnBody(pagesSrc, name);
  if (!body) { bad("could not locate " + name + " in pages.ts"); hubOgOk = false; continue; }
  const headIdx = body.indexOf("buildHead({");
  if (headIdx < 0) { bad(name + " lost its buildHead({}) call"); hubOgOk = false; continue; }
  const jsonldIdx = body.indexOf("jsonldNodes:", headIdx);
  if (jsonldIdx < 0) { bad(name + " lost its jsonldNodes array"); hubOgOk = false; continue; }
  const headBlock = body.slice(headIdx, jsonldIdx);
  // the hub/index pages must NOT pass ogType (the default "website" stays)
  if (/ogType:/.test(headBlock)) {
    bad("S11: " + name + " (" + label + ") passes ogType — must NOT (the default og:type=website stays for hubs/index pages — spec §8)");
    hubOgOk = false;
  }
}
if (hubOgOk) ok("S11: og:type=website default on hubs/index pages (buildMatchesPage + buildTeamsIndexPage + buildCompetitionsIndexPage pass NO ogType — the page-shell default \"website\" stands)");

// the time hubs go through buildHub (the shared hub builder) — verify it
// too passes no ogType (the default website)
const hubBody = fnBody(pagesSrc, "buildHub");
if (hubBody) {
  const headIdx = hubBody.indexOf("buildHead({");
  const jsonldIdx = hubBody.indexOf("jsonldNodes:", headIdx);
  if (headIdx >= 0 && jsonldIdx >= 0) {
    const headBlock = hubBody.slice(headIdx, jsonldIdx);
    if (/ogType:/.test(headBlock)) {
      bad("S11: buildHub (the time-hub builder) passes ogType — must NOT (the default og:type=website stays for /matches/today + /tomorrow + /this-week + /this-weekend)");
      hubOgOk = false;
    } else {
      ok("S11: og:type=website default on the time hubs (buildHub passes NO ogType — the default \"website\" stands for /matches/today + /tomorrow + /this-week + /this-weekend)");
    }
  }
}

// the homepage renders through router.ts buildHomePage — verify it does NOT
// emit an og:type override either (the homepage is the site root, og:type=website)
const routerSrc = fs.readFileSync(path.join(root, "src", "seo", "router.ts"), "utf8");
if (/ogType:\s*"article"/.test(routerSrc)) {
  bad("S11: buildHomePage in router.ts emits ogType=article — must NOT (the homepage is og:type=website — spec §8)");
  hubOgOk = false;
}
if (hubOgOk) ok("S11: og:type=website on the homepage (buildHomePage in router.ts passes NO ogType — the default \"website\" stands)");

// ============================================================
// 3. og:locale=fa_IR on every page (the existing page-shell pin)
// ============================================================
if (!/og:locale.*fa_IR/.test(pageShellSrc)) {
  bad("S11: page-shell.ts lost the og:locale=fa_IR meta tag (the Persian locale pin)");
} else {
  ok("S11: og:locale=fa_IR pinned in page-shell.ts (every page carries the Persian locale — spec §7 Persian-first)");
}

// ============================================================
// 4. SEO_EXTRA_ALIASES map exists in team-names.ts + Barcelona «بارسا» alias
// ============================================================
const tnSrc = fs.readFileSync(path.join(root, "src", "seo", "team-names.ts"), "utf8");
let aliasMapOk = true;
if (!/const SEO_EXTRA_ALIASES/.test(tnSrc)) {
  bad("S11: team-names.ts lost the SEO_EXTRA_ALIASES map (the GSC-observed short-form aliases)");
  aliasMapOk = false;
}
// the Barcelona «بارسا» alias (the GSC evidence: 179 impressions for «بازی بعدی بارسا»)
if (!/fcbarcelona:\s*\["بارسا"\]/.test(tnSrc) || !/barcelona:\s*\["بارسا"\]/.test(tnSrc)) {
  bad("S11: team-names.ts SEO_EXTRA_ALIASES lost the Barcelona «بارسا» alias (the GSC-observed short form — GSC-AUDIT-BASELINE.md 179 impressions for «بازی بعدی بارسا»)");
  aliasMapOk = false;
}
// the GSC evidence comment (the S-05 no-invented-data rule)
if (!/179 impressions/.test(tnSrc) || !/بازی بعدی بارسا/.test(tnSrc)) {
  bad("S11: team-names.ts SEO_EXTRA_ALIASES lost the GSC evidence comment (the S-05 no-invented-data rule — the alias must cite its GSC evidence)");
  aliasMapOk = false;
}
if (aliasMapOk) ok("S11: SEO_EXTRA_ALIASES map present + Barcelona «بارسا» alias (GSC evidence: 179 impressions for «بازی بعدی بارسا» — the S-05 no-invented-data rule holds)");

// ============================================================
// 5. seoTeamAltNames consults SEO_EXTRA_ALIASES (the runtime wiring)
// ============================================================
if (!/const extra = t && t\.name \? SEO_EXTRA_ALIASES\[normTeamKey\(t\.name\)\] : null;/.test(tnSrc)) {
  bad("S11: seoTeamAltNames does NOT consult SEO_EXTRA_ALIASES (the runtime wiring — the alias must ride the JSON-LD alternateName array)");
} else {
  ok("S11: seoTeamAltNames consults SEO_EXTRA_ALIASES (the alias rides the JSON-LD alternateName array — machine-readable, invisible to the SERP snippet)");
}

// behavior: eval the real team-names.ts + verify the Barcelona «بارسا» alias output
const { normTeamKey } = require(path.join(root, "src", "teams.ts"));
const stripped = tnSrc
  .replace(/^import\s+\{[^}]+\}\s+from\s+"[^"]+";\n/m, "")
  .replace(/^export interface[\s\S]*?\n\}\n/m, "")
  .replace(/: Record<string, SeoTeamNameOverride> =/, " =")
  .replace(/: Record<string, string\[\]> =/, " =")
  .replace(/\(t: any\): string \| null \{/g, "(t) {")
  .replace(/\(t: any\): string\[\] \{/g, "(t) {")
  .replace(/\(t: any\): string \{/g, "(t) {")
  .replace(/const out: string\[\] = \[\];/, "const out = [];")
  .replace(/^export (function|const)/gm, "$1");
const factory = new Function("normTeamKey", stripped +
  "\nreturn { seoTeamFaName, seoTeamAltName, seoTeamAltNames, SEO_TEAM_NAME_OVERRIDES, SEO_EXTRA_ALIASES };");
const { seoTeamFaName, seoTeamAltName, seoTeamAltNames, SEO_EXTRA_ALIASES } = factory(normTeamKey);

// Barcelona (the FC Barcelona full provider name)
const barca = { name: "FC Barcelona", faName: "بارسلونا" };
const barcaFa = seoTeamFaName(barca);
const barcaAlt = seoTeamAltName(barca);
const barcaAlts = seoTeamAltNames(barca);
let barcaBehaviorOk = true;
if (barcaFa !== "بارسلونا") { bad("S11: Barcelona faName drifted («" + barcaFa + "» — must stay «بارسلونا» [byte-frozen, the visible SEO name])"); barcaBehaviorOk = false; }
if (barcaAlt !== null) { bad("S11: Barcelona gained an seoTeamAltName («" + barcaAlt + "» — must stay null [Barcelona has NO override, only the JSON-LD alias])"); barcaBehaviorOk = false; }
if (JSON.stringify(barcaAlts) !== JSON.stringify(["بارسلونا", "بارسا"])) {
  bad("S11: Barcelona seoTeamAltNames = " + JSON.stringify(barcaAlts) + " — must be [\"بارسلونا\",\"بارسا\"] (the SEO name first, then the NEW GSC-observed short-form alias)");
  barcaBehaviorOk = false;
}
if (barcaBehaviorOk) ok("S11: Barcelona behavior — faName=«بارسلونا» (byte-frozen), altName=null (no override), altNames=[«بارسلونا», «بارسا»] (the GSC-evidenced short form rides the JSON-LD array)");

// Barcelona short-form provider name (the bare "Barcelona" — folds to the same alias)
const barcaShort = { name: "Barcelona", faName: "بارسلونا" };
const barcaShortAlts = seoTeamAltNames(barcaShort);
if (JSON.stringify(barcaShortAlts) !== JSON.stringify(["بارسلونا", "بارسا"])) {
  bad("S11: Barcelona short-form provider name altNames = " + JSON.stringify(barcaShortAlts) + " — must be [\"بارسلونا\",\"بارسا\"] (the alias resolves for the bare \"Barcelona\" spelling too — normTeamKey folds)");
} else {
  ok("S11: Barcelona short-form provider name resolves the same alias (normTeamKey folds \"FC Barcelona\" → fcbarcelona + \"Barcelona\" → barcelona — both keys carry «بارسا»)");
}

// control: Leipzig (override case — the alias must NOT leak into Leipzig)
const leipzig = { name: "RB Leipzig", faName: "لایپزیش" };
const leipzigAlts = seoTeamAltNames(leipzig);
if (JSON.stringify(leipzigAlts) !== JSON.stringify(["لایپزیگ", "لایپزیش"])) {
  bad("S11: Leipzig seoTeamAltNames drifted (" + JSON.stringify(leipzigAlts) + " — must stay [\"لایپزیگ\",\"لایپزیش\"] [the S1 M2 / F3 spelling-fix discipline holds])");
} else {
  ok("S11: Leipzig (the S1 M2 / F3 override case) unchanged — altNames=[«لایپزیگ», «لایپزیش»] (the override layer stays byte-frozen through Dec 4-8)");
}

// control: Chelsea (a non-overridden selected club — altNames must stay [faName] only when no extra alias)
const chelsea = { name: "Chelsea FC", faName: "چلسی" };
const chelseaAlts = seoTeamAltNames(chelsea);
if (JSON.stringify(chelseaAlts) !== JSON.stringify(["چلسی"])) {
  bad("S11: Chelsea seoTeamAltNames drifted (" + JSON.stringify(chelseaAlts) + " — must stay [\"چلسی\"] [no override + no GSC-evidenced alias → single-name altNames only])");
} else {
  ok("S11: Chelsea (a non-overridden selected club with NO GSC-evidenced short form) — altNames=[«چلسی»] (single-name; no alias leak)");
}

// ============================================================
// 6. jsonld.ts: the SportsEvent + SportsTeam nodes carry the override-aware alternateName
// (S1 M2 wiring — re-verified here so a regression is caught)
// ============================================================
const jsonldSrc = fs.readFileSync(path.join(root, "src", "seo", "jsonld.ts"), "utf8");
let jsonldWiringOk = true;
if (!/seoTeamAltNames\(m\.homeTeam\)/.test(jsonldSrc) || !/seoTeamAltNames\(m\.awayTeam\)/.test(jsonldSrc)) {
  bad("S11: jsonld.ts sportsEventNode lost the seoTeamAltNames call (the match-page team refs must carry the alias)");
  jsonldWiringOk = false;
}
if (!/seoTeamAltNames\(entry\)/.test(jsonldSrc)) {
  bad("S11: jsonld.ts sportsTeamNode lost the seoTeamAltNames call (the team-page SportsTeam node must carry the alias)");
  jsonldWiringOk = false;
}
if (jsonldWiringOk) ok("S11: jsonld.ts wired (sportsEventNode + sportsTeamNode consult seoTeamAltNames — the Barcelona «بارسا» alias rides BOTH the match-page team refs AND the team-page SportsTeam node)");

// ============================================================
// 7. the byte-frozen surfaces (title/H1/description/answer) are NOT changed
// (the freeze-coordination gate — re-verifies the S7/S8/S9/S6 byte-frozen
// surfaces stay byte-identical)
// ============================================================
let freezeOk = true;
// match-page title ladder (S7 byte-frozen)
const matchBody = fnBody(pagesSrc, "buildMatchPage");
if (matchBody) {
  if (!/const tCore = "⚽ " \+ faName\(m\.homeTeam\) \+ " – " \+ faName\(m\.awayTeam\) \+ " \| ";/.test(matchBody)) {
    bad("S11/freeze: the match-page title ladder drifted (the S7 byte-frozen tCore «⚽ homeTeam – awayTeam | » — the Dec 4-8 freeze holds)");
    freezeOk = false;
  }
}
// team-page title ladder (S8 byte-frozen)
const teamBody = fnBody(pagesSrc, "buildTeamPage");
if (teamBody) {
  if (!/let title = name \+ " — برنامه بازی بعدی و ساعت شروع \| اسپرت سیگنال";/.test(teamBody)) {
    bad("S11/freeze: the team-page title ladder drifted (the S8 byte-frozen template — the Dec 4-8 freeze holds)");
    freezeOk = false;
  }
  if (!/if \(title\.length > 65\) title = name \+ " — برنامه بازی و ساعت شروع \| اسپرت سیگنal";/.test(teamBody) &&
      !/if \(title\.length > 65\) title = name \+ " — برنامه بازی و ساعت شروع \| اسپرت سیگنال";/.test(teamBody)) {
    bad("S11/freeze: the team-page >65 title rung drifted (the v13.229-teamladder trim — the Dec 4-8 freeze holds)");
    freezeOk = false;
  }
  if (!/h1: "برنامه بازی‌های " \+ esc\(name\)/.test(teamBody)) {
    bad("S11/freeze: the team-page H1 drifted (the S8 byte-frozen H1 «برنامه بازی‌های X»)");
    freezeOk = false;
  }
}
// competition-page title (S9 byte-frozen)
const compBody = fnBody(pagesSrc, "buildCompetitionPage");
if (compBody) {
  if (!/const title = cNameFa \+ " — برنامه بازی‌های بزرگ پیش‌رو \| اسپرت سیگنال";/.test(compBody)) {
    bad("S11/freeze: the competition-page title drifted (the S9 byte-frozen title «X — برنامه بازی‌های بزرگ پیش‌رو | اسپرت سیگنال»)");
    freezeOk = false;
  }
}
if (freezeOk) ok("S11/freeze: the byte-frozen title/H1 ladders (match S7 + team S8 + competition S9) are byte-identical (the Dec 4-8 freeze holds — og:type + the alias are NOT GSC-measured surfaces)");

// ============================================================
// 8. TEAM_SLUGS no-op tidiness fix — the live provider-derived slugs for
// Inter + Atlético are now EXPLICIT pins (route plan §7)
// ============================================================
let slugPinOk = true;
if (!/"Club Atl\u00E9tico de Madrid": "club-atletico-de-madrid"/.test(slugsSrc) &&
    !/"Club Atl\\u00E9tico de Madrid": "club-atletico-de-madrid"/.test(slugsSrc)) {
  bad("S11/§7: TEAM_SLUGS lost the explicit pin for \"Club Atlético de Madrid\" → \"club-atletico-de-madrid\" (the live canonical URL identity — the no-op tidiness fix aligns the table with reality)");
  slugPinOk = false;
}
if (!/"FC Internazionale Milano": "internazionale-milano"/.test(slugsSrc) &&
    !/"FC Internazionale Milano": "internazionale-milano"/.test(slugsSrc)) {
  bad("S11/§7: TEAM_SLUGS lost the explicit pin for \"FC Internazionale Milano\" → \"internazionale-milano\" (the live canonical URL identity — the no-op tidiness fix aligns the table with reality)");
  slugPinOk = false;
}
if (slugPinOk) ok("S11/§7: TEAM_SLUGS carries the explicit pins for the live provider-derived slugs (Inter=«internazionale-milano», Atlético=«club-atletico-de-madrid» — the route plan §7 no-op tidiness fix; zero URL change)");

// behavior: verify the explicit pin matches the derivation output (the no-op proof)
const { teamSlug, TEAM_SLUGS } = require(path.join(root, "src", "slugs.ts"));
const interDerived = teamSlug("FC Internazionale Milano");
const interPinned = TEAM_SLUGS["FC Internazionale Milano"];
const atletiDerived = teamSlug("Club Atlético de Madrid");
const atletiPinned = TEAM_SLUGS["Club Atlético de Madrid"];
if (interDerived !== interPinned || interDerived !== "internazionale-milano") {
  bad("S11/§7: Inter slug mismatch — derived «" + interDerived + "» vs pinned «" + interPinned + "» (the no-op tidiness fix must produce the same slug the derivation does)");
  slugPinOk = false;
}
if (atletiDerived !== atletiPinned || atletiDerived !== "club-atletico-de-madrid") {
  bad("S11/§7: Atlético slug mismatch — derived «" + atletiDerived + "» vs pinned «" + atletiPinned + "» (the no-op tidiness fix must produce the same slug the derivation does)");
  slugPinOk = false;
}
if (slugPinOk) ok("S11/§7: the explicit pins match the derivation output (Inter=«internazionale-milano», Atlético=«club-atletico-de-madrid» — true no-op, zero URL change, zero byte-frozen surface change)");

// ============================================================
// 9. fa-dict.ts unchanged (the S11 SEO_EXTRA_ALIASES extension lives in
// src/seo/team-names.ts only — the scope law from S1 M2 holds)
// ============================================================
const { buildFaTeamDict } = require(path.join(root, "src", "fa-dict.ts"));
const FA_TEAMS = buildFaTeamDict();
let faDictOk = true;
if (FA_TEAMS["FC Barcelona"] !== "بارسلونا") { bad("S11/scope: fa-dict.ts FC Barcelona drifted («" + FA_TEAMS["FC Barcelona"] + "» — must stay «بارسلونا» [the dictionary spelling — the bot/cards/digests render from it])"); faDictOk = false; }
if (FA_TEAMS["RB Leipzig"] !== "لایپزیش") { bad("S11/scope: fa-dict.ts RB Leipzig drifted (the S1 M2 / F3 dict spelling — the display surfaces must not change)"); faDictOk = false; }
// the SEO_EXTRA_ALIASES «بارسا» alias must NOT leak into fa-dict.ts (the scope law)
const seoLeak = Object.values(FA_TEAMS).filter((v) => v === "بارسا");
if (seoLeak.length) { bad("S11/scope: fa-dict.ts carries «بارسا» (the SEO alias must stay in src/seo/team-names.ts — the bot/cards/digests render from fa-dict.ts and must NOT show the alias)"); faDictOk = false; }
if (faDictOk) ok("S11/scope: fa-dict.ts unchanged (the dictionary spellings stay — the SEO_EXTRA_ALIASES extension lives in src/seo/team-names.ts only; the bot/cards/digests render from fa-dict.ts and stay byte-identical)");

if (failures) { console.error("\ncheck-seo-persian-entities: " + failures + " failure(s)"); process.exit(1); }
console.log("OK   check-seo-persian-entities: all " + oks + " Persian entity-naming gates passed (S11 og:type=article on detail pages, og:locale=fa_IR, SEO_EXTRA_ALIASES + Barcelona «بارسا» alias, the byte-frozen title/H1 ladders unchanged, the TEAM_SLUGS no-op tidiness fix, the fa-dict.ts scope law)");
