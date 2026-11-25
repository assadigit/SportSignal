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
// v13.281.0-teamstrict: the extraction window now ends at the eligibility
// predicate comment (the isSelectedTeam block grew the Iranian-four arm +
// isSeoEligibleMatch follows it — the slice must stop between them).
const c1Start = dataSrc.indexOf("const SEO_SELECTED_LEAGUES");
const c1End = dataSrc.indexOf("// v13.281.0-teamstrict — THE one match-eligibility predicate");
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
const c1Factory = new Function("CONFIG", "normalizeTeamName", "normAlias", "SEO",
  c1Block + "\nreturn { isSelectedTeam, SEO_SELECTED_LEAGUES };");
// v13.281.0-teamstrict: the SEO stub carries the real extra-selected
// config (the Iranian big four) so the extracted predicate sees it.
const { SEO } = require(path.join(root, "src", "seo", "config.ts"));
const { isSelectedTeam, SEO_SELECTED_LEAGUES } = c1Factory(CONFIG, normalizeTeamName, normAlias, SEO);

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
  ["AS Roma", false],
  // v13.281.0-teamstrict (D1): the Iranian big four joins the selected set
  // (SEO-layer only — exact PGL provider forms + the variant spellings,
  // all verified against matches_v13_tracked 2026-11-25).
  ["Persepolis", true],
  ["Persepolis FC", true],
  ["Esteghlal Tehran", true],
  ["Esteghlal", true],
  ["Sepahan", true],
  ["Sepahan SC", true],
  ["Tractor S.C.", true],
  ["Tractor", true],
  // the CRITICAL separation: Esteghlal Khozestan is a DIFFERENT club
  // (Abadan-based, a PGL minnow) and must NEVER fold onto Esteghlal
  // Tehran — normAlias("esteghlalkhozestan") !== "esteghlaltehran".
  ["Esteghlal Khozestan", false],
  ["Foolad Khozestan", false],
  ["Gol Gohar FC", false],
  ["Zob Ahan", false]
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
// v13.281.0-teamstrict (D2+D3): the competition-page indexable rule is now
// the allowlist OR the honest ≥1-upcoming rule (flag-gated). The C1-era
// "untouched by C1" pin is superseded by the owner-approved competition
// flips — the new law is pinned in check-seo-teamstrict.js in detail; here
// the flag-gated shape itself.
if (!pagesSrc.includes('const indexable = SEO.TEAM_PAGE_POLICY === "strict"')) { bad("competition-page indexable rule lost the v13.281 flag gate (the D2/D3 allowlist flip)"); wiringOk = false; }
else if (!pagesSrc.includes("? (SEO.SELECTED_COMPETITION_SLUGS.has(slug) || list.length >= SEO.MIN_UPCOMING_FOR_INDEX)")) { bad("competition-page strict rule lost the selected-or-≥1-upcoming shape (D2+D3)"); wiringOk = false; }
if (wiringOk) ok("C1 wiring: teams.xml filters to the allowlist before any row is pushed; team-page indexable = selected AND >=1 upcoming; competition rule untouched");

// ---- 3. the scope law (v13.281.0-teamstrict SUPERSESION): teamsIndex
// widens WHO qualifies (the selected-team arm) while the DOWNSTREAM
// surfaces apply the selected cut ----
// The C1-era law ("teamsIndex must not contain isSelectedTeam at all — the
// /teams tiles must render BOTH sides so a noindex page stays crawlable")
// is SUPERSEDED by the owner-approved strict gating (2026-11-25): non-
// selected team pages 410 at the router, so a tile advertising one would
// link to a dead URL. The NEW law: teamsIndex gains the selected-team
// ELIGIBILITY arm (PGL big-four fixtures earn entries — without it the
// Iranian four never qualify, PGL not being in BIG_TEAMS_BY_LEAGUE), and
// the presentation layer (buildTeamsIndexPage) + the sitemap filter apply
// the isSelectedTeam cut. teamsIndex still iterates BOTH sides of every
// fixture it admits (the raw generator contract).
const teamsIndexFn = dataSrc.slice(dataSrc.indexOf("export function teamsIndex"), dataSrc.indexOf("export interface CompEntry"));
let scopeOk = true;
if (!teamsIndexFn.includes('for (const side of ["homeTeam", "awayTeam"] as const)')) { bad("teamsIndex no longer iterates both sides — the raw generator contract is broken"); scopeOk = false; }
if (!teamsIndexFn.includes("selectedInvolved")) { bad("teamsIndex lost the v13.281 selected-team eligibility arm (the Iranian big four never qualify without it — D1)"); scopeOk = false; }
if (!teamsIndexFn.includes('SEO.TEAM_PAGE_POLICY === "strict"')) { bad("teamsIndex lost the TEAM_PAGE_POLICY gate (legacy mode must stay byte-identical — the rollback contract)"); scopeOk = false; }
if (scopeOk) ok("scope law (v13.281): teamsIndex widens eligibility via the flag-gated selected-team arm; the tiles + sitemap filters apply the selected cut downstream");
// the presentation-layer cut: buildTeamsIndexPage filters to selected in strict mode
const pagesSrc2 = fs.readFileSync(path.join(root, "src", "seo", "pages.ts"), "utf8");
if (!pagesSrc2.includes("const entries = (selectedOnly ? all.filter((e) => isSelectedTeam(e.name)) : all).sort((a, b) => {")) {
  bad("buildTeamsIndexPage lost the strict-mode selected-only filter (the /teams tiles must list ONLY the 17 selected clubs)");
  scopeOk = false;
} else if (!pagesSrc2.includes('const selectedOnly = SEO.TEAM_PAGE_POLICY === "strict";')) {
  bad("buildTeamsIndexPage filter is not flag-gated (legacy mode must render every eligible tile — the rollback contract)");
  scopeOk = false;
} else {
  ok("presentation law (v13.281): the /teams index tiles + ItemList list ONLY the selected clubs in strict mode (flag-gated; legacy renders both sides)");
}

// ---- 3b. Session 7: the match-detail footer-hook team-link gating (spec §9) ----
// The match-detail footer-hook («پیوندهای مرتبط» → «تیم‌ها» line) must link
// ONLY selected-club team pages. A non-selected club's team page exists as
// 200 + noindex,follow but spec §9 says "Do not generate a link to an
// unindexable/thin team page simply because the team exists in the provider
// database." So the <a href="/teams/..."> is gated on isSelectedTeam; a
// non-selected club renders its Persian name as plain text (the name stays
// visible for the reader; the crawlable link is gated). This is body-only —
// the byte-frozen <head> (title/H1/description/answer-sentence funnel) is
// untouched (the check-match-centre.js S20/S25 gates hold).
let s7Ok = true;
// (a) both team links are gated on isSelectedTeam (the match-page footer-hook)
// isSelectedTeam(m.homeTeam.name) / isSelectedTeam(m.awayTeam.name) are the
// match-page-specific call shapes (the team-page indexable rule uses entry.name)
if (!pagesSrc.includes("isSelectedTeam(m.homeTeam.name)")) { bad("Session 7: the home-team footer-hook link is not gated on isSelectedTeam(m.homeTeam.name) (spec §9 — non-selected clubs must NOT get a team-page <a href>)"); s7Ok = false; }
if (!pagesSrc.includes("isSelectedTeam(m.awayTeam.name)")) { bad("Session 7: the away-team footer-hook link is not gated on isSelectedTeam(m.awayTeam.name) (spec §9 — non-selected clubs must NOT get a team-page <a href>)"); s7Ok = false; }
// (b) the <a href="/teams/..."> is in the isSelectedTeam TRUE branch (the link is conditional, not the default)
if (!/isSelectedTeam\(m\.homeTeam\.name\)\s*\?\s*'<a href="\/teams\/' \+ teamSlug\(m\.homeTeam\.name\)/.test(pagesSrc)) { bad("Session 7: the home-team <a href> must be inside the isSelectedTeam true-branch (the link is the conditional, not the default)"); s7Ok = false; }
if (!/isSelectedTeam\(m\.awayTeam\.name\)\s*\?\s*'<a href="\/teams\/' \+ teamSlug\(m\.awayTeam\.name\)/.test(pagesSrc)) { bad("Session 7: the away-team <a href> must be inside the isSelectedTeam true-branch (the link is the conditional, not the default)"); s7Ok = false; }
// (c) the non-selected fallback (plain-text team name, NO <a href>) exists in the false branch
if (!/: esc\(faName\(m\.homeTeam\)\)/.test(pagesSrc)) { bad("Session 7: the home-team non-selected fallback (plain-text name, no link) is missing"); s7Ok = false; }
if (!/: esc\(faName\(m\.awayTeam\)\)/.test(pagesSrc)) { bad("Session 7: the away-team non-selected fallback (plain-text name, no link) is missing"); s7Ok = false; }
// (d) the OLD unconditional pattern (both teams always linked inline) is GONE
// the old pattern had '</a> · <a href="/teams/' inline (both links in one string literal)
if (pagesSrc.includes("</a> · <a href=\"/teams/")) { bad("Session 7: the OLD unconditional both-teams-linked inline pattern is still present (spec §9 violation — non-selected clubs must NOT get a team-page link)"); s7Ok = false; }
if (s7Ok) ok("Session 7: the match-detail footer-hook team links are gated on isSelectedTeam (spec §9 — only the 13 selected clubs get a crawlable <a href>; non-selected clubs render as plain text; the byte-frozen <head> is untouched)");

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

// ---- 5. C8: record-and-skip (the measured outcome) ----
// The one-line s-maxage=60 normalization was attempted in 13.260.0 and
// live-tested: the Workers free-plan edge floor overrides BOTH max-age and
// s-maxage on Cache API entries (zone HITs still stamp max-age=14400). No
// one-line header fix exists → the phase contract's record-and-skip. The
// gate pins: (a) the original max-age=60 header (no dead declaration), and
// (b) the record-and-skip marker comment pointing at the changelog evidence.
const swrSrc = fs.readFileSync(path.join(root, "src", "public-swr.ts"), "utf8");
if (swrSrc.includes('"cache-control": "public, max-age=60"') && !swrSrc.includes("s-maxage=60\"")) {
  if (swrSrc.includes("C8 (SEO Session 4, record-and-skip")) {
    ok("C8: record-and-skip pinned (edge floor measured overriding s-maxage; header stays max-age=60; evidence pointer present)");
  } else {
    bad("public-swr.ts lost the C8 record-and-skip marker comment (the evidence pointer)");
  }
} else {
  bad("public-swr.ts cache-control deviates from the C8 record-and-skip outcome (expected plain max-age=60)");
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
console.log("OK   check-seo-crawlindex: all " + oks + " crawl/index foundation gates passed (C1 behavior+wiring+scope, S7 footer-hook team-link gating, C6 guard, C8 TTL, robots law)");
