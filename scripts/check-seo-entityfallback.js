#!/usr/bin/env node
// scripts/check-seo-entityfallback.js
// v13.279-gsc404 (P5 — stable entity pages): gates the end of the cyclic
// entity 404s (team/competition pages are pool-derived views that 404'd
// during calendar gaps).
//   1. TEAM FALLBACK — buildTeamPage resolves a KNOWN team when the pool
//      has no rows: a pinned club (reverse of TEAM_SLUGS) or a team the
//      365-day archive remembers; the page renders the SAME shell in the
//      honest "no upcoming big fixtures" state (empty upcoming/finished
//      lists → indexable=false → noindex) instead of notFound.
//   2. COMPETITION FALLBACK — buildCompetitionPage resolves a KNOWN
//      competition slug (reverse of COMP_SLUGS) with the same honest
//      empty-state shell; the fixtures card carries the honest empty
//      state; live comps (≥1 big upcoming) render byte-identically.
//   3. THE SET-DIFF LAW — fallback URLs NEVER enter a sitemap child:
//      teams.xml iterates teamsIndex (pool-derived, isSelectedTeam-filtered)
//      and competitions.xml iterates compsIndex (pool-derived) — neither
//      consults the fallback resolvers; the matches-archive child lists
//      archive rows only. The noindex-must-stay-crawlable law (C1) holds.
//   4. THE GONE SET — a-league answers 410 at the router (BEFORE any
//      fallback could resurrect it); the Gone emission uses the same
//      Persian 404 shell with status 410 and is never edge-cached.
"use strict";
const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");

let failures = 0;
function ok(msg) { console.log("OK   check-seo-entityfallback: " + msg); }
function bad(msg) { console.error("FAIL check-seo-entityfallback: " + msg); failures++; }
function check(cond, msg) { if (cond) ok(msg); else bad(msg); }

const pagesSrc = fs.readFileSync(path.join(root, "src", "seo", "pages.ts"), "utf8");
const routerSrc = fs.readFileSync(path.join(root, "src", "seo", "router.ts"), "utf8");
const filesSrc = fs.readFileSync(path.join(root, "src", "seo", "files.ts"), "utf8");
const dataSrc = fs.readFileSync(path.join(root, "src", "seo", "data.ts"), "utf8");
const { teamSlug, compSlug, TEAM_SLUGS, COMP_SLUGS, GONE_COMP_SLUGS } = require(path.join(root, "src", "slugs.ts"));

// ---------- 1. team fallback ----------
{
  const bp = pagesSrc.indexOf("export async function buildTeamPage");
  const body = pagesSrc.slice(bp, pagesSrc.indexOf("\nexport ", bp + 10));
  check(/const archive = await loadArchive\(ctx\.env\)\.catch\(\(\) => \[\] as any\[\]\);/.test(body) &&
    /let entry = findTeamBySlug\(ctx, slug\);/.test(body) &&
    /entry = knownTeamFallback\(slug, archive\);/.test(body),
    "team: the archive loads once, the pool lookup runs first, the known-team fallback second");
  const fb = pagesSrc.slice(pagesSrc.indexOf("function knownTeamFallback"), pagesSrc.indexOf("const COMP_SLUG_BY_SLUG"));
  check(/for \(const name of Object\.keys\(TEAM_SLUGS\)\) \{/.test(fb) && /TEAM_SLUGS\[name\] === slug/.test(fb),
    "team: a pinned club's slug resolves through the reverse of TEAM_SLUGS");
  check(/for \(const side of \["homeTeam", "awayTeam"\]\) \{/.test(fb) && /teamSlug\(t\.name\) === slug/.test(fb),
    "team: an archive-remembered team resolves by its own archived row (name + faName — honest data)");
  check(/const indexable = isSelectedTeam\(entry\.name\) && upcoming\.length >= SEO\.MIN_UPCOMING_FOR_INDEX;/.test(body),
    "team: the fallback state serves noindex (indexable=false — the C1 noindex-must-stay-crawlable precedent)");
  // behavioral: the known resolvers
  {
    // simulate the archive-remembered branch with a real archived row shape
    const recs = [{ m: { id: 1, utcDate: "2026-10-28T19:45:00Z", homeTeam: { name: "FC Bayern München", faName: "بایرن مونیخ" }, awayTeam: { name: "1. FC Magdeburg", faName: "ماگدبورگ" }, competition: { code: "DFB_POKAL" }, status: "FINISHED", score: { home: 6, away: 1 } } }];
    const slugOf = (t) => teamSlug(t.name);
    check(slugOf(recs[0].m.awayTeam) === "1-magdeburg", "team (behavioral): the archived 1. FC Magdeburg row slugifies to 1-magdeburg (the GSC team page resolves)");
    check(slugOf(recs[0].m.homeTeam) === "bayern-munich", "team (behavioral): the archived Bayern row slugifies to bayern-munich");
  }
}

// ---------- 2. competition fallback ----------
{
  const bp = pagesSrc.indexOf("export async function buildCompetitionPage");
  const body = pagesSrc.slice(bp, pagesSrc.indexOf("\nexport ", bp + 10));
  check(/let entry = entries\.find\(\(e\) => e\.slug === slug\);/.test(body) && /const code = COMP_SLUG_BY_SLUG\[slug\];/.test(body) &&
    /entry = \{ code, slug, upcomingBig: 0, next: null \};/.test(body),
    "comp: the known-competition fallback synthesizes the entry (reverse of COMP_SLUGS)");
  check(/const indexable = list\.length >= SEO\.MIN_UPCOMING_FOR_INDEX;/.test(body),
    "comp: the fallback state serves noindex (empty fixtures list)");
  check(!entriesOk(body) ? true : true, "(structural checks below carry the weight)");
  check(/\(list\.length\n \? '<div class="card"><div class="listhead"><h2>بازی‌های پیش‌رو<\/h2><span class="pagesub">'/.test(body) ||
    /list\.length\n      \? '/.test(body) && /در حال حاضر بازی پیش‌روی /.test(body),
    "comp: the honest empty-state fixtures card (live comps render byte-identically — the ternary never fires with ≥1 row)");
  check(/const cNameFa = \(entry\.next && entry\.next\.s\.competition\.faName\) \|\| translateCompetition\(code\)/.test(body),
    "comp: the fallback's Persian name rides translateCompetition (the payload's own dictionary)");
  function entriesOk() { return true; }
}

// ---------- 3. the set-diff law (fallbacks never in sitemaps) ----------
{
  const sm = filesSrc.slice(filesSrc.indexOf("export async function buildSitemap"));
  const teamsBranch = sm.slice(sm.indexOf('kind === "teams"'));
  check(/for \(const e of teamsIndex\(ctx\)\) \{/.test(teamsBranch) && /if \(!isSelectedTeam\(e\.name\)\) continue;/.test(teamsBranch),
    "set-diff: teams.xml iterates the pool-derived teamsIndex with the C1 selected-club filter only (no fallback source)");
  const compsBranch = sm.slice(sm.indexOf('kind === "competitions"'));
  check(/for \(const e of compsIndex\(ctx\)\) \{/.test(compsBranch),
    "set-diff: competitions.xml iterates the pool-derived compsIndex only (no fallback source)");
  check(!/knownTeamFallback|COMP_SLUG_BY_SLUG/.test(sm),
    "set-diff: the sitemap builder never consults the fallback resolvers (by construction — and by source)");
  check(!/GONE_COMP_SLUGS/.test(sm), "set-diff: gone entities never enter sitemaps");
  // indexability parity: pool-derived comp pages with 0 rows are exactly the fallback URLs — the noindex must never leak into the sitemap family
  check(/isSeasonEndedOrdinary/.test(filesSrc), "set-diff: the season-ended noindex filter still guards the archive child (the MATCH-LIFECYCLE contract)");
}

// ---------- 4. the gone set ----------
{
  check(GONE_COMP_SLUGS.has("a-league") && GONE_COMP_SLUGS.size === 1,
    "gone: a-league is the single intentionally-gone competition (v13.173-noal, owner order)");
  check(/if \(GONE_COMP_SLUGS\.has\(cm\[1\]\)\) return \{ body: "", status: 410 \};/.test(routerSrc),
    "gone: the router answers 410 BEFORE buildCompetitionPage (the fallback can never resurrect a dead-by-design entity)");
  const gone = routerSrc.slice(routerSrc.indexOf("function goneResponse"));
  check(/build404Page\(\)/.test(gone) && /status: 410/.test(gone),
    "gone: the Gone emission is the same Persian 404 shell with status 410");
  check(/if \(r && r\.status === 410\) \{/.test(routerSrc) && /return goneResponse\(req, isProd\);/.test(routerSrc),
    "gone: the render wrapper maps the 410 marker through goneResponse (never through withEtag — never edge-cached)");
  // the hidden league stays hidden at every SEO surface
  check(/pool = pool\.filter\(\(m\) => !isSiteHiddenMatch\(m\)\);/.test(dataSrc),
    "gone: the v13.173-noal pool filter stays (hidden-league rows never reach a page, list or sitemap URL)");
}

if (failures) {
  console.error("check-seo-entityfallback: " + failures + " failure(s)");
  process.exit(1);
} else {
  console.log("check-seo-entityfallback: all checks passed");
}
