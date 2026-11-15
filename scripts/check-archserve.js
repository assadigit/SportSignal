#!/usr/bin/env node
// scripts/check-archserve.js
// v13.259-archserve (docs/audits/2026-11-15-gsc-read.md §2): gates the
// finished-match archive serving — the fix for the GSC 404 cliff (159
// not-found URLs: the pool's 7-day retention dropped finished match pages
// while the 365-day seo_archive_v1 already held them).
//   1. BEHAVIOR — the REAL findArchivedMatchBySlug (eval-extracted from
//      src/seo/data.ts, the repo's harness style): production-shaped
//      archive records (pubMatch rows WITHOUT stage/roundRaw — the real
//      KV shape) resolve by slug, wrong-date/wrong-team/malformed slugs
//      miss, same-day duplicates resolve to the earliest kickoff
//      (mirroring findMatchBySlug), and the returned SeoMatch carries
//      archived:true with the row serving as BOTH raw and s.
//   2. WIRING — buildMatchPage consults the fallback AFTER the pool
//      lookup misses and BEFORE the notFound return; the archive load is
//      hoisted to the top (ONE loadArchive call in the body — the
//      related/form projections reuse it); the await count stays exactly
//      3 (loadArchive, hydrateMatchVenue, fullByCodeFor — ADR-006).
//   3. THE VENUE HONESTY GUARD — hydrateMatchVenue skips the home-ground
//      table for archived rows (stage/roundRaw do not survive the archive
//      shape; a neutral final could otherwise hydrate a WRONG home
//      stadium — the S-03/S-04 no-invented-data law). The FD-detail
//      branch (real provider data, KV-cached, fail-closed) stays.
//   4. SITEMAP MERGE — the matches-archive child lists the pool window
//      PLUS the 365-day archive (syncArchive's return value), deduped by
//      path, pool rows first; archived candidates hash through the same
//      matchHash ({raw: row, s: row}).
//   5. THE FREEZE GUARD — the change is additive: the title ladder, the
//      answer sentence and the JSON-LD builders in pages.ts are untouched
//      (the GSC measurement surfaces stay byte-frozen through the Dec 4-8
//      window; check-match-centre.js owns the deep gate — this is the
//      archserve-scoped guard).
"use strict";
const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");

let failures = 0;
function ok(msg) { console.log("OK   check-archserve: " + msg); }
function bad(msg) { console.error("FAIL check-archserve: " + msg); failures++; }
function read(rel) { return fs.readFileSync(path.join(root, rel), "utf8"); }
function check(cond, msg) { if (cond) ok(msg); else bad(msg); }

const dataSrc = read("src/seo/data.ts");
const pagesSrc = read("src/seo/pages.ts");
const filesSrc = read("src/seo/files.ts");

// the REAL slug builder (src/slugs.ts is a root leaf — requirable directly)
const { teamSlug, matchPath } = require(path.join(root, "src", "slugs.ts"));

// ---------- 1. behavior: the real findArchivedMatchBySlug ----------
const fnSrc = dataSrc.match(/export function findArchivedMatchBySlug\([\s\S]*?\n\}/);
if (!fnSrc) {
  bad("could not extract findArchivedMatchBySlug from src/seo/data.ts (restructured — update this check)");
} else {
  const js = fnSrc[0]
    .replace(/export function findArchivedMatchBySlug\(recs: any\[\], slug: string\): SeoMatch \| null \{/, "function findArchivedMatchBySlug(recs, slug) {")
    .replace(/let best: any = null;/, "let best = null;");
  let findArchivedMatchBySlug;
  try {
    findArchivedMatchBySlug = new Function("teamSlug", js + "\nreturn findArchivedMatchBySlug;")(teamSlug);
  } catch (e) {
    bad("findArchivedMatchBySlug failed to evaluate: " + e.message);
  }
  if (findArchivedMatchBySlug) {
    // the production KV shape (verified 2026-11-15 via the REST API read of
    // seo_archive_v1): pubMatch rows, NO stage/roundRaw/path, venue optional
    const mkRow = (home, away, iso, venue, id) => ({
      id: id || "4711", status: "FINISHED", utcDate: iso,
      homeTeam: { name: home }, awayTeam: { name: away },
      competition: { code: "CL" }, score: { home: 2, away: 1 },
      venue: venue || null, round: "League Phase", roundFa: null
    });
    const recs = [
      { m: mkRow("Real Madrid CF", "RB Leipzig", "2026-10-21T19:00:00Z", "Santiago Bernabéu"), fin: "2026-10-24T00:00:00Z" },
      { m: mkRow("Paris Saint-Germain FC", "FC Barcelona", "2026-10-20T19:00:00Z", "Parc des Princes"), fin: "2026-10-21T00:00:00Z" },
      // same-day duplicate: the EARLIER kickoff must win (findMatchBySlug parity)
      { m: mkRow("Real Madrid CF", "RB Leipzig", "2026-10-21T16:00:00Z", null), fin: "2026-10-24T00:00:00Z" },
      // malformed carriers must be skipped, never crash
      null,
      { fin: "2026-10-24T00:00:00Z" },
      { m: { homeTeam: { name: "x" }, utcDate: "2026-10-21T19:00:00Z" } }
    ];
    const slugOf = (r) => matchPath(r.homeTeam.name, r.awayTeam.name, r.utcDate).replace("/matches/", "");

    const hit = findArchivedMatchBySlug(recs, slugOf(recs[0].m));
    check(!!hit && hit.archived === true, "an archived match resolves by slug with archived:true");
    check(!!hit && hit.raw === hit.s && hit.raw === recs[2].m, "the archived row serves as BOTH raw and s (the earliest-kickoff duplicate won)");
    check(!!hit && String(hit.raw.status) === "FINISHED", "the archived row keeps its FINISHED status (the finished-state rendering path)");
    const dup = findArchivedMatchBySlug(recs, slugOf(recs[0].m));
    check(!!dup && dup.raw.utcDate === "2026-10-21T16:00:00Z", "same-day duplicates resolve to the earliest kickoff (findMatchBySlug parity)");

    const psgSlug = slugOf(recs[1].m);
    check(!!findArchivedMatchBySlug(recs, psgSlug), "a second archived match (PSG–Barcelona, the 854-impression page) resolves");
    check(findArchivedMatchBySlug(recs, psgSlug.replace("2026-10-20", "2026-11-20")) === null, "a wrong-date slug misses (no false positives)");
    check(findArchivedMatchBySlug(recs, "not-a-match-slug") === null, "a malformed slug misses");
    check(findArchivedMatchBySlug(recs, "arsenal-vs-chelsea-2026-10-21") === null, "an unarchived pairing misses (the T-06 404 contract holds)");
    check(findArchivedMatchBySlug([], "arsenal-vs-chelsea-2026-10-21") === null, "an empty archive misses (fail-closed)");
    check(findArchivedMatchBySlug(null, "arsenal-vs-chelsea-2026-10-21") === null, "a null archive misses (fail-closed)");
    ok("behavior: " + 9 + " slug-resolution cases verified against the production archive shape");
  }
}

// ---------- 2. wiring: buildMatchPage ----------
const bp = pagesSrc.indexOf("export async function buildMatchPage");
const bpEnd = pagesSrc.indexOf("\nexport ", bp + 10);
const body = pagesSrc.slice(bp, bpEnd);
const iLoad = body.indexOf("await loadArchive(");
const iPool = body.indexOf("findMatchBySlug(ctx, slug)");
const iFallback = body.indexOf("findArchivedMatchBySlug(archive, slug)");
const iHydrate = body.indexOf("await hydrateMatchVenue(");
check(iLoad !== -1 && iPool !== -1 && iFallback !== -1 && iHydrate !== -1 &&
  iLoad < iPool && iPool < iFallback && iFallback < iHydrate,
  "wiring: the archive loads FIRST, the pool lookup misses, THEN the fallback runs — all before venue hydration");
check(body.indexOf("notFound: true") > iFallback,
  "wiring: the notFound return sits AFTER the fallback (an archived match can no longer 404)");
const realAwaits = body.replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, "").match(/await\s+[A-Za-z]/g) || [];
check(realAwaits.length === 3,
  "the cost law: buildMatchPage keeps exactly 3 awaits (loadArchive, hydrateMatchVenue, fullByCodeFor) — found " + realAwaits.length);
check((body.match(/loadArchive\(/g) || []).length === 1,
  "the cost law: ONE loadArchive call in buildMatchPage (the hoisted read serves every consumer)");
check(/findArchivedMatchBySlug/.test(pagesSrc.slice(0, bp)) && /import \{[^}]*findArchivedMatchBySlug[^}]*\} from "\.\/data"/.test(pagesSrc),
  "wiring: findArchivedMatchBySlug is imported from ./data (no local re-implementation)");

// ---------- 3. the venue honesty guard ----------
const hv = dataSrc.slice(dataSrc.indexOf("export async function hydrateMatchVenue"));
check(/\(sm as any\)\.archived \? null : homeGround\(/.test(hv),
  "venue guard: hydrateMatchVenue skips the home-ground table for archived rows (no invented stadium for neutral finals)");
check(/const id = sm\.raw && sm\.raw\.id;/.test(hv) && /api\.football-data\.org\/v4\/matches\//.test(hv),
  "venue guard: the FD-detail branch (real provider data) stays available to archived rows");
check(/if \(sm\.s && sm\.s\.venue\) return sm;/.test(hv),
  "venue guard: rows that already carry a venue (archived at syncArchive time) hydrate nothing");

// ---------- 4. the sitemap merge ----------
const smBranch = filesSrc.slice(filesSrc.indexOf('kind === "matches-archive"'));
check(/const archRecs = await syncArchive\(env, ctx\);/.test(smBranch),
  "sitemap: the archive child consumes syncArchive's return (no second KV read)");
check(/const seenArch = new Set\(candidates\.map\(\(c\) => c\.path\)\);/.test(smBranch) &&
  /if \(seenArch\.has\(p\)\) continue;/.test(smBranch),
  "sitemap: archived rows dedupe against the pool window by path");
check(/matchHash\(\{ raw: row, s: row \} as any\)/.test(smBranch),
  "sitemap: archived candidates hash through the same matchHash ({raw,s} synthesis)");
// the OG image follows its page (the og:image URL a restored page emits must not 404)
const ogFn = filesSrc.slice(filesSrc.indexOf("export async function buildMatchOgPng"));
check(/let sm = findMatchBySlug\(ctx, slug\);/.test(ogFn) &&
  /findArchivedMatchBySlug\(archive, slug\)/.test(ogFn) &&
  ogFn.indexOf("findArchivedMatchBySlug(archive, slug)") < ogFn.indexOf("if (!sm) return null;"),
  "og image: buildMatchOgPng consults the archive fallback before returning null (a restored page's og:image serves)");
// v13.259.1-archttl: the immutable-surface render holds (the CPU-cliff mitigation)
const routerSrc = read("src/seo/router.ts");
check(/ARCHIVE_PAGE_TTL: 21600/.test(read("src/seo/config.ts")),
  "archttl: ARCHIVE_PAGE_TTL = 21600 (6h) declared in seo/config.ts");
check(/else if \(!sm\) pageHold\.v = SEO\.ARCHIVE_PAGE_TTL;/.test(routerSrc) &&
  routerSrc.indexOf("else if (!sm) pageHold.v") > routerSrc.indexOf("if (/IN_PLAY|LIVE|PAUSED/.test(st))"),
  "archttl: a successful render with a pool miss (archived, immutable) holds ARCHIVE_PAGE_TTL — after the live/upcoming branches");
check(/wantCached\("\/og" \+ path, 3600,/.test(routerSrc) &&
  /\/og\/match-/.test(routerSrc),
  "archttl: the CPU-heavy resvg OG route is edge-cached (wantCached, 1h hold) — fresh OG fetches stop being a crash lottery");
check(/const list = finishedRecent\(ctx, 30\);/.test(smBranch),
  "sitemap: the pool window (30d) still lists first — the archive extends, never replaces");
// matchHash stability on an archived row (eval-extracted, the repo's style)
const fnHash = filesSrc.match(/function matchHash\([\s\S]*?\n\}/);
const fnSha = filesSrc.match(/function sha1ish\([\s\S]*?\n\}/);
if (fnHash && fnSha) {
  const js = (fnSha[0] + "\n" + fnHash[0])
    .replace(/function sha1ish\(str: string\): string \{/, "function sha1ish(str) {")
    .replace(/function matchHash\(sm: SeoMatch\): string \{/, "function matchHash(sm) {");
  try {
    const matchHash = new Function("matchPath", js + "\nreturn matchHash;")(matchPath);
    const row = { utcDate: "2026-10-21T19:00:00Z", status: "FINISHED", venue: "Santiago Bernabéu", round: "League Phase", homeTeam: { name: "Real Madrid CF" }, awayTeam: { name: "RB Leipzig" }, competition: { code: "CL" }, score: { h: 1, a: 2 } };
    const h1 = matchHash({ raw: row, s: row });
    const h2 = matchHash({ raw: row, s: row });
    const rowV2 = Object.assign({}, row, { venue: null });
    check(h1 && h1 === h2 && h1 !== matchHash({ raw: rowV2, s: rowV2 }),
      "matchHash: stable for identical archived rows, changes when the venue changes (lastmod honesty)");
  } catch (e) {
    bad("matchHash failed to evaluate: " + e.message);
  }
} else {
  bad("could not extract matchHash/sha1ish from src/seo/files.ts (restructured — update this check)");
}

// ---------- 5. the freeze guard (archserve-scoped) ----------
check(/const tCore = "⚽ " \+ faName\(m\.homeTeam\) \+ " – " \+ faName\(m\.awayTeam\) \+ " \| ";/.test(pagesSrc),
  "freeze: the match title ladder core is untouched (byte-frozen through the Dec 4-8 window)");
check(/title = tCore \+ compFa \+ "، " \+ tDate \+ " \| اسپرت سیگنال";/.test(pagesSrc) &&
  /if \(title\.length > 65\) title = tCore \+ compFa \+ "، " \+ tDateShort \+ " \| اسپرت سیگنال";/.test(pagesSrc),
  "freeze: the SS-10 trim rungs are untouched");
check(/export function matchAnswerSentence\(/.test(pagesSrc) && !/archived/.test(pagesSrc.slice(pagesSrc.indexOf("export function matchAnswerSentence"), pagesSrc.indexOf("export function matchAnswerSentence") + 4000)),
  "freeze: matchAnswerSentence carries no archive-awareness (the answer sentence is state-driven, source-agnostic)");
check((pagesSrc.match(/const archive = await loadArchive\(ctx\.env\)\.catch/g) || []).length === 2,
  "wiring: exactly the two intended loadArchive call sites remain in pages.ts (buildMatchPage + buildTeamPage)");

if (failures) {
  console.error("check-archserve: " + failures + " failure(s)");
  process.exit(1);
} else {
  console.log("check-archserve: all checks passed");
}
