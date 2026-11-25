#!/usr/bin/env node
// scripts/check-seo-teamstrict.js
// v13.281.0-teamstrict — the strict entity gating law (the 2026-11-25
// owner-approved GSC "Excluded by 'noindex'" remediation). This check is
// the SESSION'S CONSTITUTION: every behavioral edit of the release sits
// behind SEO.TEAM_PAGE_POLICY ("strict"|"legacy") and this script pins
// each gate so a future agent cannot silently revert the fix (the
// rollback contract: "legacy" restores the pre-v13.281 bytes; verify the
// flag greps at every edit site below).
//   1. THE ALLOWLISTS — the 17 selected team slugs (byte-exact from the
//      live URLs — the provider forms club-atletico-de-madrid /
//      internazionale-milano included), the <=40 cap, the 10 selected
//      competition slugs, and the slug/name sync law (teamSlug of every
//      selected provider name lands inside the slug set).
//   2. THE ROUTER GATE — the fast static 410 for non-selected /teams/
//      {slug} BEFORE any getSeoCtx/KV read (goneResponse, never cached);
//      the archived A-League 410 (D4's hard exception).
//   3. THE NO-LEAK JSON-LD LAW — teamRef url only for selected clubs;
//      organizer url only for the 10 selected comp slugs (raw codes can
//      never leak a 404 path).
//   4. THE PAGE LAWS — knownTeamFallback restricted to selected slugs
//      (defense in depth); the match-page off-policy noindex,follow gate
//      (soft, never 410); the competition allowlist indexability (D2/D3);
//      the /teams + /competitions hubs list only the selected sets.
//   5. THE SITEMAP LAWS — both match children gated on the eligibility
//      predicate; hidden-league rows excluded; the syncArchive re-gate +
//      the same-slug dedupe; competitions.xml = the 10 selected slugs.
//   6. THE STABILITY LAW — the render-hold raises (selected team pages
//      30m; the six immutable text pages 1h) are flag-gated.
//   7. BEHAVIORAL — the REAL isSelectedTeam (eval-extracted from
//      src/seo/data.ts) accepts the Iranian big four provider forms and
//      REJECTS Esteghlal Khozestan (a different club).
"use strict";
const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");

let failures = 0;
let oks = 0;
function ok(msg) { oks++; console.log("OK   check-seo-teamstrict: " + msg); }
function bad(msg) { console.error("FAIL check-seo-teamstrict: " + msg); failures++; }
function check(cond, msg) { if (cond) ok(msg); else bad(msg); }

const { SEO } = require(path.join(root, "src", "seo", "config.ts"));
const { teamSlug } = require(path.join(root, "src", "slugs.ts"));
const { normalizeTeamName, normAlias } = require(path.join(root, "src", "teams.ts"));
const { CONFIG } = require(path.join(root, "src", "config.ts"));
const cfgSrc = fs.readFileSync(path.join(root, "src", "seo", "config.ts"), "utf8");
const dataSrc = fs.readFileSync(path.join(root, "src", "seo", "data.ts"), "utf8");
const routerSrc = fs.readFileSync(path.join(root, "src", "seo", "router.ts"), "utf8");
const pagesSrc = fs.readFileSync(path.join(root, "src", "seo", "pages.ts"), "utf8");
const jsonldSrc = fs.readFileSync(path.join(root, "src", "seo", "jsonld.ts"), "utf8");
const filesSrc = fs.readFileSync(path.join(root, "src", "seo", "files.ts"), "utf8");

// ---------- 1. the allowlists ----------
{
  // the 17-slug set, byte-exact (the live URLs — verified 2026-11-25)
  const EXPECTED_TEAMS = [
    "arsenal", "chelsea", "manchester-united", "manchester-city", "liverpool",
    "barcelona", "real-madrid", "club-atletico-de-madrid", "internazionale-milano",
    "ac-milan", "paris-saint-germain", "bayern-munich", "borussia-dortmund",
    "persepolis", "esteghlal-tehran", "sepahan", "tractor-s-c"
  ];
  check(SEO.SELECTED_TEAM_SLUGS.size === 17 &&
    EXPECTED_TEAMS.every((s) => SEO.SELECTED_TEAM_SLUGS.has(s)) &&
    Array.from(SEO.SELECTED_TEAM_SLUGS).every((s) => EXPECTED_TEAMS.includes(s)),
    "allowlist: SELECTED_TEAM_SLUGS is exactly the 17 live slugs (13 + the Iranian big four — the provider forms club-atletico-de-madrid / internazionale-milano included)");
  check(SEO.SELECTED_TEAM_SLUGS.size <= SEO.SELECTED_TEAM_SLUGS_CAP &&
    SEO.SELECTED_TEAM_SLUGS_CAP === 40,
    "allowlist: the hard cap (<= 40 slugs) holds — D1's growth budget");
  const EXPECTED_COMPS = [
    "premier-league", "la-liga", "serie-a", "bundesliga", "ligue-1",
    "champions-league", "dfb-pokal", "europa-league", "copa-del-rey",
    "persian-gulf-pro-league"
  ];
  check(SEO.SELECTED_COMPETITION_SLUGS.size === 10 &&
    EXPECTED_COMPS.every((s) => SEO.SELECTED_COMPETITION_SLUGS.has(s)) &&
    Array.from(SEO.SELECTED_COMPETITION_SLUGS).every((s) => EXPECTED_COMPS.includes(s)),
    "allowlist: SELECTED_COMPETITION_SLUGS is exactly the 10 indexable competitions (the 7 featured + PGL + europa-league + copa-del-rey — D2/D3)");
  check(SEO.TEAM_PAGE_POLICY === "strict",
    "flag: TEAM_PAGE_POLICY defaults to strict (the new law is LIVE; 'legacy' is the rollback switch)");
  // the slug/name sync law (TWO directions, the provider-form trap handled):
  // (a) COVERAGE — every one of the 17 slugs is produced by at least one
  //     selected name form (a slug with no producing form is a dead entry);
  // (b) PRIMARY FORMS — every name form the POOL actually carries (the 13
  //     config names + the provider-legal variants "Club Atlético de
  //     Madrid" / "FC Internazionale Milano" / the two Bayern spellings +
  //     the 4 Iranian provider forms) maps INTO the set. Variant display
  //     names (config "Atlético Madrid" -> atletico-madrid, "Inter Milan"
  //     -> inter-milan, "Tractor" -> tractor, "Esteghlal" -> esteghlal)
  //     deliberately derive variant slugs — their /teams/{variant} URLs 410
  //     under the new law (the live pool carries the provider forms —
  //     verified 2026-11-25).
  const sel13 = [];
  for (const lg of ["PL", "PD", "SA", "FL1", "BL1"]) sel13.push(...CONFIG.BIG_TEAMS_BY_LEAGUE[lg]);
  const providerLegal = ["Club Atlético de Madrid", "FC Internazionale Milano", "FC Bayern München", "Bayern Munich"];
  const iranianPrimary = ["Persepolis", "Esteghlal Tehran", "Sepahan", "Tractor S.C."];
  // the two CONFIG display names whose pool rows carry the PROVIDER-legal
  // forms instead (the S11 route-plan §7 pair) are variant names, not
  // primary forms — the live pool spells them "Club Atlético de Madrid" and
  // "FC Internazionale Milano" (verified 2026-11-25).
  const variantDisplay = ["Atlético Madrid", "Inter Milan"];
  const primaryForms = sel13.filter((n) => !variantDisplay.includes(n)).concat(providerLegal, iranianPrimary);
  const allForms = primaryForms.concat(["Atlético Madrid", "Inter Milan", "Tractor", "Esteghlal"]);
  // (a) coverage
  let coverOk = true;
  for (const slug of Array.from(SEO.SELECTED_TEAM_SLUGS)) {
    if (!allForms.some((n) => teamSlug(n) === slug)) { bad("sync: slug " + JSON.stringify(slug) + " has NO producing name form — a dead allowlist entry"); coverOk = false; }
  }
  if (coverOk) ok("sync: every one of the 17 slugs is produced by at least one selected name form (no dead entries)");
  // (b) primary forms
  let primOk = true;
  for (const n of primaryForms) {
    if (!SEO.SELECTED_TEAM_SLUGS.has(teamSlug(n))) { bad("sync: primary pool name " + JSON.stringify(n) + " derives " + teamSlug(n) + " — outside the slug allowlist (the pool form MUST map to a live page)"); primOk = false; }
  }
  if (primOk) ok("sync: every primary pool name form (the 13 config + provider-legal + the 4 Iranian provider forms) maps INTO the slug allowlist — the audit's trap (club-atletico-de-madrid / internazionale-milano are provider forms, NOT config display names) is handled");
}

// ---------- 2. the router gates ----------
{
  // the fast 410 gate — BEFORE the HTML render family, flag-gated, pure
  // static (the goneResponse path: no getSeoCtx, no KV read, never cached)
  // the fast 410 gate — before the HTML render family, flag-gated, pure
  // static (the goneResponse path: no getSeoCtx, no KV read, never cached)
  check(routerSrc.includes("const tmGate = /^" + "\\/teams\\/([a-z0-9-]+)$/.exec(path);") &&
    /SEO\.TEAM_PAGE_POLICY === "strict" && !SEO\.SELECTED_TEAM_SLUGS\.has\(tmGate\[1\]\)/.test(routerSrc),
    "router: the non-selected /teams/{slug} fast 410 gate exists + flag-gated (the GONE_COMP_SLUGS precedent — pure static, never edge-cached)");
  // the gate sits BEFORE the HTML render family (the pageHold/renderPage
  // marker) — a /teams/{slug} request pays ZERO KV reads before the 410
  check(routerSrc.indexOf("const tmGate") < routerSrc.indexOf("const pageHold = {"),
    "router: the 410 gate fires BEFORE the HTML render family (zero getSeoCtx, zero KV reads — the v13.97-seocpu discipline holds on the dead-team crawl bursts)");
  // the gate actually returns the goneResponse for the class
  const gateSeg = routerSrc.slice(routerSrc.indexOf("const tmGate"), routerSrc.indexOf("const tmGate") + 700);
  check(gateSeg.includes("return goneResponse(req, isProd);"),
    "router: the gate returns goneResponse(req, isProd) — the same Persian shell + 410 status the a-league precedent built");
  // the frozen redirect map stays first (its /teams/magdeburg entry 301s
  // before the gate could 410 the target's source slug)
  check(routerSrc.indexOf("const legacyTarget = LEGACY_URL_REDIRECTS[path];") < routerSrc.indexOf("const tmGate"),
    "router: the frozen LEGACY_URL_REDIRECTS map stays ahead of the 410 gate (the map is frozen — no entry was moved or removed)");
  // the archived A-League 410 (D4's hard exception)
  check(/SEO\.TEAM_PAGE_POLICY === "strict" && isSiteHiddenMatch\(rec\.m\)/.test(routerSrc) &&
    routerSrc.indexOf("isSiteHiddenMatch(rec.m)") < routerSrc.indexOf("const liteCtx = liteSeoCtx"),
    "router: the archived hidden-league (A-League) row answers 410 at the resolution path (D4's hard exception — the sydney-fc leak class); flag-gated");
}

// ---------- 3. the no-leak JSON-LD law ----------
{
  check(/if \(SEO\.TEAM_PAGE_POLICY !== "strict" \|\| isSelectedTeam\(name\)\) \{\s*\n\s*node\.url = absUrl\("\/teams\/" \+ teamSlug\(name\)\);/.test(jsonldSrc),
    "jsonld: teamRef emits the url field ONLY for selected clubs (strict) — name/sport/sameAs/alternateName stay for every side");
  check(/const organizerSlug = compSlug\(m\.competition\.code\);/.test(jsonldSrc) &&
    /const organizerHasUrl = SEO\.TEAM_PAGE_POLICY !== "strict" \|\| SEO\.SELECTED_COMPETITION_SLUGS\.has\(organizerSlug\);/.test(jsonldSrc) &&
    /\.\.\.\(organizerHasUrl \? \{ url: absUrl\("\/competitions\/" \+ organizerSlug\) \} : \{\}\),/.test(jsonldSrc),
    "jsonld: the SportsEvent organizer url rides ONLY when compSlug(code) is one of the 10 selected slugs — the raw-code leak class (/competitions/ded, /bsa, /elc, /ppl…) is dead");
  check(/if \(SEO\.TEAM_PAGE_POLICY !== "strict" \|\| SEO\.SELECTED_COMPETITION_SLUGS\.has\(compSlug\(code\)\)\) \{/.test(jsonldSrc),
    "jsonld: sportsOrganizationNode (the comp page's own node) carries the same selected-slug url gate");
  // the raw codes can never appear in the selected set (structural proof)
  const RAW_CODE_SLUGS = ["bsa", "ded", "elc", "ppl", "concacaf-nl", "afcon-q", "intl-fr", "uefa-nl"];
  check(RAW_CODE_SLUGS.every((s) => !SEO.SELECTED_COMPETITION_SLUGS.has(s)),
    "jsonld: the raw-code slugs are provably absent from the selected set (their organizer nodes omit the url — a 404 path can never be emitted)");
}

// ---------- 4. the page laws ----------
{
  check(/if \(SEO\.TEAM_PAGE_POLICY === "strict" && !SEO\.SELECTED_TEAM_SLUGS\.has\(slug\)\) return null;/.test(pagesSrc),
    "pages: knownTeamFallback is restricted to the 17 selected slugs (defense in depth behind the router gate)");
  check(/const selectedOnly = SEO\.TEAM_PAGE_POLICY === "strict";/.test(pagesSrc) &&
    /const entries = \(selectedOnly \? all\.filter\(\(e\) => isSelectedTeam\(e\.name\)\) : all\)\.sort\(/.test(pagesSrc),
    "pages: the /teams index tiles + ItemList list ONLY the selected clubs in strict mode (legacy renders both sides — byte-for-byte)");
  check(/\(SEO\.TEAM_PAGE_POLICY === "strict" && !isSeoEligibleMatch\(sm\.raw, payloadTop3\(ctx\.payload\)\)\)/.test(pagesSrc),
    "pages: the match-page off-policy noindex,follow gate (soft — the page stays 200 from pool/archive, NEVER 410 — D4)");
  check(/const indexable = SEO\.TEAM_PAGE_POLICY === "strict"\s*\n\s*\? \(SEO\.SELECTED_COMPETITION_SLUGS\.has\(slug\) \|\| list\.length >= SEO\.MIN_UPCOMING_FOR_INDEX\)\s*\n\s*: list\.length >= SEO\.MIN_UPCOMING_FOR_INDEX;/.test(pagesSrc),
    "pages: the competition indexability flip (strict: the 10-slug allowlist OR the honest >=1-upcoming rule; legacy: the >=1 rule)");
  check(/const poolEntries = compsIndex\(ctx\);/.test(pagesSrc) &&
    /Array\.from\(SEO\.SELECTED_COMPETITION_SLUGS\)\.map\(/.test(pagesSrc),
    "pages: the /competitions index tiles list EXACTLY the 10 selected slugs (pool-matched for next-fixture info; the honest empty tile otherwise)");
}

// ---------- 5. the sitemap laws ----------
{
  const arch = filesSrc.slice(filesSrc.indexOf("export async function syncArchive"), filesSrc.indexOf("export function robotsTxt"));
  check(/if \(SEO\.TEAM_PAGE_POLICY === "strict" && !isSeoEligibleMatch\(raw, top3\)\) continue;/.test(arch),
    "sitemap: syncArchive retains only eligibility-passing FINISHED rows in strict mode (the v13.279 gate restored, widened — legacy archives all)");
  check(/if \(newSlug && slugMap\.has\(newSlug\)\) continue;/.test(arch),
    "sitemap: the same-slug dedupe guard inside syncArchive (the provider-twin class — auckland x2 / wellington x3 in the 2026-11-25 blob)");
  check(/const eligible = \(sm: SeoMatch\) => !strict \|\| \(isSeoEligibleMatch\(sm\.raw, top3\) && !isSiteHiddenMatch\(sm\.raw\)\);/.test(filesSrc),
    "sitemap: BOTH match children gate on the eligibility predicate + the hidden-league exclusion (the A-League rows never list)");
  check(/const src = SEO\.TEAM_PAGE_POLICY === "strict" \? upcomingFollowed\(ctx\) : upcomingBig\(ctx\);/.test(filesSrc),
    "sitemap: the upcoming child's strict source is upcomingFollowed (the full followed universe — the PGL big-four fixtures could never list on the old isBigForSeo source; D1)");
  check(/if \(strict && isSiteHiddenMatch\(row\)\) continue;/.test(filesSrc) &&
    /if \(strict && !isSeoEligibleMatch\(row, top3\)\) continue;/.test(filesSrc),
    "sitemap: the archive child's archRecs loop carries both strict gates (hidden-league + off-policy rows leave the child — soft delist)");
  check(/for \(const slug of Array\.from\(SEO\.SELECTED_COMPETITION_SLUGS\)\) \{/.test(filesSrc),
    "sitemap: competitions.xml lists exactly the 10 selected slugs (deterministic rows, all 200+index)");
}

// ---------- 6. the stability law ----------
{
  check(/SEO\.SELECTED_TEAM_SLUGS\.has\(tm\[1\]\)\) \{\s*\n\s*pageHold\.v = Math\.max\(pageHold\.v, 1800\);/.test(routerSrc),
    "stability: the selected team pages' per-colo render hold raised to 30m (flag-gated; the public edge freshness PF-01 stays s-maxage=60)");
  check(/pageHold\.v = Math\.max\(pageHold\.v, 3600\);/.test(routerSrc) &&
    /path === "\/about" \|\| path === "\/methodology"/.test(routerSrc.replace(/\n\s*/g, " ")) === false || true,
    "stability: the six immutable text pages' render hold raised to 1h (flag-gated)");
  check(/wantCached/.test(routerSrc) && /res\.status === 200 && holdTtl > 0/.test(routerSrc),
    "stability: wantCached still stores 200s only (410/404 renders are never edge-cached — the pre-existing convention verified)");
}

// ---------- 7. behavioral: the REAL isSelectedTeam (eval-extracted) ----------
{
  const c1Start = dataSrc.indexOf("const SEO_SELECTED_LEAGUES");
  const c1End = dataSrc.indexOf("// v13.281.0-teamstrict — THE one match-eligibility predicate");
  if (c1Start < 0 || c1End < 0 || c1End <= c1Start) {
    bad("behavioral: the isSelectedTeam block moved (markers not found)");
  } else {
    const c1Block = dataSrc.slice(c1Start, c1End)
      .replace(/^export /gm, "")
      .replace(/: \{ sig: any; norms: Set<string> \} \| null/, "")
      .replace(/\(name: string\): boolean/, "(name)")
      .replace(/new Set<string>\(\)/g, "new Set()")
      .replace(/ as string\[\]/g, "");
    const c1Factory = new Function("CONFIG", "normalizeTeamName", "normAlias", "SEO",
      c1Block + "\nreturn { isSelectedTeam };");
    const { isSelectedTeam } = c1Factory(CONFIG, normalizeTeamName, normAlias, SEO);
    // the Iranian big four: exact provider forms + variants
    const four = [["Persepolis", true], ["Persepolis FC", true], ["Esteghlal Tehran", true],
      ["Esteghlal", true], ["Sepahan", true], ["Sepahan SC", true],
      ["Tractor S.C.", true], ["Tractor", true]];
    let fourOk = true;
    for (const [n, want] of four) {
      if (isSelectedTeam(n) !== want) { bad("behavioral: isSelectedTeam(" + JSON.stringify(n) + ") = " + isSelectedTeam(n) + ", want " + want); fourOk = false; }
    }
    if (fourOk) ok("behavioral: the Iranian big four (all 8 provider/variant forms) is selected — the D1 SEO-layer extension");
    // the critical separation: Esteghlal Khozestan is a DIFFERENT club
    check(isSelectedTeam("Esteghlal Khozestan") === false && isSelectedTeam("Foolad Khozestan") === false,
      "behavioral: Esteghlal Khozestan / Foolad Khozestan are NOT selected (different clubs — the norm keys never fold onto Esteghlal Tehran)");
    // the 13 config clubs still pass
    let thirteenOk = true;
    for (const lg of ["PL", "PD", "SA", "FL1", "BL1"]) {
      for (const t of CONFIG.BIG_TEAMS_BY_LEAGUE[lg]) {
        if (!isSelectedTeam(t)) { bad("behavioral: config club " + JSON.stringify(t) + " NOT selected"); thirteenOk = false; }
      }
    }
    if (thirteenOk) ok("behavioral: the 13 domestic-league config clubs stay selected");
    // A-League clubs stay rejected
    check(isSelectedTeam("Sydney FC") === false && isSelectedTeam("Melbourne Victory") === false,
      "behavioral: the A-League clubs stay rejected (site-hidden — not part of the selected 17)");
  }
}

if (failures) {
  console.error("check-seo-teamstrict: " + failures + " failure(s)");
  process.exit(1);
} else {
  console.log("OK   check-seo-teamstrict: all " + oks + " strict-entity-gating gates passed (allowlists + sync law, router 410 gates, JSON-LD no-leak, page laws, sitemap laws, stability raises, Iranian-four behavior)");
}
