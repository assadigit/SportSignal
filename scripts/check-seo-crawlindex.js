#!/usr/bin/env node
// scripts/check-seo-crawlindex.js
// SEO Program Session 4 (C1/C6/C8 — the crawl/index/sitemap foundation):
// offline gates for the three confirmed-issue fixes.
//   1. C1 BEHAVIOR — the selected-club allowlist predicate (src/seo/data.ts
//      isSelectedTeam) resolves the REAL normalizeTeamName/normAlias pairing
//      on the 13 config clubs AND the provider-legal variants
//      ("FC Internazionale Milano", "Club Atlético de Madrid", both Bayern
//      spellings), rejects non-selected pool teams (incl. site-hidden
//      A-League clubs — AL is not part of the SEO selected 13), and rebuilds
//      when the admin overlay replaces CONFIG.BIG_TEAMS_BY_LEAGUE (the
//      teamNormCache sig law).
//   2. C1 WIRING — teams.xml filters to the allowlist BEFORE any candidate
//      row is pushed (a noindex URL can never enter the child sitemap);
//      buildTeamPage's indexable rule = selected AND >= MIN_UPCOMING.
//   3. C1 SCOPE LAW — teamsIndex still generates BOTH sides of every
//      eligible fixture (the /teams tiles + match-page «تیم‌ها» links are
//      the crawl path that keeps the noindexed URLs readable by Google).
//   4. C6 WIRING — the non-prod x-robots-tag guard exists, is applied to
//      the seven machine-file routes OUTSIDE wantCached (post-cache, so a
//      workers.dev render can never stamp noindex into an edge copy served
//      to production), and short-circuits on isProd (production untouched).
//   5. C8 — the /api/public-matches edge response declares s-maxage=60
//      alongside max-age=60 (the observed max-age=14400 edge-stamp fix).
//   6. THE CRAWLABILITY LAW — robots.txt still disallows ONLY /admin (a
//      noindex target must never be robots-blocked).
"use strict";
const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");

let failures = 0;
let oks = 0;
function ok(msg) { oks++; console.log("OK   check-seo-crawlindex: " + msg); }
function bad(msg) { console.error("FAIL check-seo-crawlindex: " + msg); failures++; }

// ---- 1. eval-extract the REAL isSelectedTeam from src/seo/data.ts ----
const { normalizeTeamName, normAlias } = require(path.join(root, "src", "teams.ts"));
const { CONFIG } = require(path.join(root, "src", "config.ts"));
const dataSrc = fs.readFileSync(path.join(root, "src", "seo", "data.ts"), "utf8");
const c1Start = dataSrc.indexOf("const SEO_SELECTED_LEAGUES");
const c1End = dataSrc.indexOf("// Teams index — every pool team");
if (c1Start < 0 || c1End < 0 || c1End <= c1Start) {
  bad("isSelectedTeam block not found in src/seo/data.ts (marker moved?)");
  process.exit(1);
}
const c1Block = dataSrc.slice(c1Start, c1End)
  .replace(/^export /gm, "")
  .replace(/: \{ sig: any; norms: Set<string> \} \| null/, "")
  .replace(/\(name: string\): boolean/, "(name)")
  .replace(/new Set<string>\(\)/g, "new Set()")
  .replace(/ as string\[\]/g, "");
const c1Factory = new Function("CONFIG", "normalizeTeamName", "normAlias",
  c1Block + "\nreturn { isSelectedTeam, SEO_SELECTED_LEAGUES };");
const { isSelectedTeam, SEO_SELECTED_LEAGUES } = c1Factory(CONFIG, normalizeTeamName, normAlias);

// the selected set draws from the domestic league keys only
if (JSON.stringify(SEO_SELECTED_LEAGUES) === JSON.stringify(["PL", "PD", "SA", "FL1", "BL1"])) {
  ok("selected set draws from the 5 domestic league keys (PL/PD/SA/FL1/BL1 — AL excluded, EL/ECL are duplicate names)");
} else {
  bad("SEO_SELECTED_LEAGUES changed: " + JSON.stringify(SEO_SELECTED_LEAGUES));
}

// behavior: every config club matches (via its own name)
const configNames = [];
for (const lg of ["PL", "PD", "SA", "FL1", "BL1"]) configNames.push(...CONFIG.BIG_TEAMS_BY_LEAGUE[lg]);
let selOk = true;
for (const n of configNames) {
  if (!isSelectedTeam(n)) { bad(`config club ${n} NOT selected by the predicate`); selOk = false; }
}
if (selOk) ok("all " + configNames.length + " selected clubs (the 13) match the predicate");
if (configNames.length !== 13) bad("expected 13 domestic-league clubs, found " + configNames.length);

// behavior: provider-legal name variants fold onto the config keys
const variants = [
  ["FC Internazionale Milano", true],   // the provider-derived canonical slug (route plan §7)
  ["Internazionale", true],
  ["Club Atlético de Madrid", true],    // the provider-derived canonical slug (route plan §7)
  ["Atlético de Madrid", true],
  ["Bayern Munich", true],              // transliteration fold (TSP/sportscore form)
  ["FC Bayern München", true],          // FD legal name
  ["Paris Saint-Germain FC", true],
  ["Fulham FC", false],
  ["1. FC Köln", false],
  ["Como 1907", false],
  ["SS Lazio", false],
  ["Juventus FC", false],
  ["Real Sociedad de Fútbol", false],
  ["Tottenham Hotspur FC", false],
  ["Melbourne Victory", false],         // AL — site-hidden, NOT part of the SEO selected 13
  ["Sydney FC", false],
  ["Heart of Midlothian FC", false],
  ["AS Roma", false]
];
let varOk = true;
for (const [name, want] of variants) {
  const got = isSelectedTeam(name);
  if (got !== want) { bad(`isSelectedTeam(${JSON.stringify(name)}) = ${got}, want ${want}`); varOk = false; }
}
if (varOk) ok("provider-variant folding correct on all " + variants.length + " cases (incl. the two provider-derived canonical slugs; A-League clubs rejected)");

// behavior: the admin-overlay rebuild (the teamNormCache sig law)
const overlay = JSON.parse(JSON.stringify(CONFIG.BIG_TEAMS_BY_LEAGUE));
overlay.PL = overlay.PL.concat(["Everton FC"]);
const origTeams = CONFIG.BIG_TEAMS_BY_LEAGUE;
try {
  CONFIG.BIG_TEAMS_BY_LEAGUE = overlay;
  if (isSelectedTeam("Everton FC")) {
    ok("predicate rebuilds on CONFIG.BIG_TEAMS_BY_LEAGUE replacement (admin overlay takes effect without redeploy)");
  } else {
    bad("predicate did NOT rebuild after the admin overlay replaced CONFIG.BIG_TEAMS_BY_LEAGUE");
  }
  if (!isSelectedTeam("Fulham FC")) ok("overlay rebuild keeps non-selected teams rejected");
  else bad("overlay rebuild broke the rejection side");
} finally {
  CONFIG.BIG_TEAMS_BY_LEAGUE = origTeams;
}
if (!isSelectedTeam("Everton FC") && isSelectedTeam("Arsenal FC")) ok("memo restored after overlay test (sig re-check verified both directions)");

// ---- 2. C1 wiring: the sitemap filter + the indexable rule ----
const filesSrc = fs.readFileSync(path.join(root, "src", "seo", "files.ts"), "utf8");
const pagesSrc = fs.readFileSync(path.join(root, "src", "seo", "pages.ts"), "utf8");
let wiringOk = true;
if (!/import \{[^}]*isSelectedTeam[^}]*\} from "\.\/data";/.test(filesSrc)) { bad("files.ts lost the isSelectedTeam import"); wiringOk = false; }
const teamsBranch = filesSrc.slice(filesSrc.indexOf('kind === "teams"'), filesSrc.indexOf('kind === "competitions"'));
if (!teamsBranch.includes("if (!isSelectedTeam(e.name)) continue;")) { bad("teams sitemap branch lost the allowlist filter"); wiringOk = false; }
if (teamsBranch.indexOf("if (!isSelectedTeam(e.name)) continue;") > teamsBranch.indexOf("candidates.push")) { bad("teams filter must run BEFORE candidates.push (no noindex URL may enter the child)"); wiringOk = false; }
if (!/import \{[^}]*isSelectedTeam[^}]*\} from "\.\/data";/.test(pagesSrc)) { bad("pages.ts lost the isSelectedTeam import"); wiringOk = false; }
if (!pagesSrc.includes("const indexable = isSelectedTeam(entry.name) && upcoming.length >= SEO.MIN_UPCOMING_FOR_INDEX;")) { bad("buildTeamPage indexable rule lost the selected-club test"); wiringOk = false; }
// the OTHER indexable sites (competition page) must be untouched by C1
if (!pagesSrc.includes("const indexable = list.length >= SEO.MIN_UPCOMING_FOR_INDEX;")) { bad("competition-page indexable rule was unexpectedly changed (out of C1 scope)"); wiringOk = false; }
if (wiringOk) ok("C1 wiring: teams.xml filters to the allowlist before any row is pushed; team-page indexable = selected AND >=1 upcoming; competition rule untouched");

// ---- 3. the scope law: teamsIndex keeps generating both sides ----
const teamsIndexFn = dataSrc.slice(dataSrc.indexOf("export function teamsIndex"), dataSrc.indexOf("export interface CompEntry"));
let scopeOk = true;
if (!teamsIndexFn.includes('for (const side of ["homeTeam", "awayTeam"] as const)')) { bad("teamsIndex no longer iterates both sides — the crawl path for noindexed URLs is broken"); scopeOk = false; }
if (teamsIndexFn.includes("isSelectedTeam")) { bad("teamsIndex itself must NOT filter by the allowlist (it powers the /teams tiles + match-page links)"); scopeOk = false; }
if (scopeOk) ok("scope law: teamsIndex still generates BOTH sides of every eligible fixture (the crawl path for the noindexed URLs)");

// ---- 4. C6 wiring: the non-prod machine-file guard ----
const routerSrc = fs.readFileSync(path.join(root, "src", "seo", "router.ts"), "utf8");
let c6Ok = true;
if (!/function guardNonProdMachineFile\(res: Response, isProd: boolean\): Response \{/.test(routerSrc)) { bad("guardNonProdMachineFile helper missing from router.ts"); c6Ok = false; }
if (!routerSrc.includes("if (isProd || res.headers.get(\"x-robots-tag\")) return res;")) { bad("guard must short-circuit on isProd (production responses untouched)"); c6Ok = false; }
const c6Routes = [
  ["/llms.txt route guarded", 'path === "/llms.txt"', "guardNonProdMachineFile(new Response("],
  ["/llms-full.txt route guarded post-cache", 'path === "/llms-full.txt"', "guardNonProdMachineFile(await wantCached("],
  ["/sitemap.xml route guarded post-cache", 'path === "/sitemap.xml"', "guardNonProdMachineFile(await wantCached("],
  ["sitemaps/{kind}.xml route guarded post-cache", "smMatch", "guardNonProdMachineFile(await wantCached("],
  ["/calendar.ics route guarded post-cache", 'path === "/calendar.ics"', "guardNonProdMachineFile(await wantCached("],
  ["/feed.xml route guarded post-cache", 'path === "/feed.xml"', "guardNonProdMachineFile(await wantCached("],
  ["/api/matches.json route guarded post-cache", 'path === "/api/matches.json"', "guardNonProdMachineFile(await wantCached("]
];
for (const [label, routeMarker, guardMarker] of c6Routes) {
  const i = routerSrc.indexOf(routeMarker);
  const seg = i >= 0 ? routerSrc.slice(i, i + 1200) : "";
  if (!seg.includes(guardMarker)) { bad(`${label} (missing ${guardMarker.slice(0, 40)}…)`); c6Ok = false; }
}
if (c6Ok) ok("C6 wiring: all 7 machine-file routes guarded (6 post-cache outside wantCached, llms.txt direct); guard short-circuits on isProd");

// production hosts unchanged (the guard's isProd source of truth)
if (routerSrc.includes('PRODUCTION_HOSTS: ["sportsignal.ir", "football.sportsignal.ir"]') ||
    fs.readFileSync(path.join(root, "src", "seo", "config.ts"), "utf8").includes('PRODUCTION_HOSTS: ["sportsignal.ir", "football.sportsignal.ir"]')) {
  ok("isProd source of truth unchanged (sportsignal.ir + football.sportsignal.ir are production)");
} else {
  bad("PRODUCTION_HOSTS changed unexpectedly — C6 must not alter the production-host list");
}

// ---- 5. C8: the public-matches shared-cache TTL declaration ----
const swrSrc = fs.readFileSync(path.join(root, "src", "public-swr.ts"), "utf8");
if (swrSrc.includes('"cache-control": "public, max-age=60, s-maxage=60"')) {
  ok("C8: /api/public-matches declares s-maxage=60 alongside max-age=60 (the 14400 edge-stamp normalization)");
} else {
  bad("public-swr.ts lost the s-maxage=60 edge TTL declaration");
}

// ---- 6. the crawlability law: robots.txt blocks only /admin ----
// The law concerns the DEFAULT group (User-agent: *) — the toggle-gated
// AI-bot groups below the `if (!(SEO.ALLOW_AI_TRAINING_BOTS...` line target
// specific AI crawlers only (all three toggles are true today) and never
// Google. The unconditional part must carry exactly one Disallow: /admin.
const robotsFn = filesSrc.slice(filesSrc.indexOf("function robotsTxt"), filesSrc.indexOf("function robotsTxt") + 1600);
const unconditional = robotsFn.slice(0, robotsFn.indexOf("if (!(SEO.ALLOW_AI_TRAINING_BOTS"));
const disallows = unconditional.match(/Disallow: [^\\"]+/g) || [];
if (disallows.length === 1 && disallows[0] === "Disallow: /admin") {
  ok("crawlability law: the default robots group disallows only /admin (no noindex target can become robots-blocked)");
} else {
  bad("robots.txt default group changed: Disallows = " + JSON.stringify(disallows) + " — a noindex target MUST stay crawlable");
}

if (failures) { console.error("FAIL check-seo-crawlindex: " + failures + " failure(s)"); process.exit(1); }
console.log("OK   check-seo-crawlindex: all " + oks + " crawl/index foundation gates passed (C1 behavior+wiring+scope, C6 guard, C8 TTL, robots law)");
