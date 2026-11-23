#!/usr/bin/env node
// scripts/check-seo-archivescope.js
// v13.279-gsc404 (P2-B — the owner-approved archive-scope widening + the
// P6 lite path): gates the THREE mechanisms that end the 404 cliff.
//   1. SCOPE — syncArchive retains EVERY FINISHED tracked match: the
//      big-gate line (isBigForSeo || s.big) is GONE from the retention
//      loop; FINISHED-only + the 365-day retention + the change-only blob
//      write discipline hold exactly as before (write rate ~1/sweep).
//   2. PER-MATCH KEYS — every new row writes seo_archive_v1/m/{slug} once
//      (bounded by the finished-match count; earliest-kickoff guard on
//      same-slug duplicates); loadArchiveMatch resolves a slug through the
//      ONE ~1KB key with the blob as the legacy fallback; the OG route
//      consults it too.
//   3. THE LITE PATH — the router's match-slug family dispatches BEFORE
//      the shared getSeoCtx: pool-hit → the full frozen path; pool-miss →
//      loadArchiveMatch → buildMatchPage(preloaded) (no blob parse, no
//      340-row shaping, no 7-standings read); a pattern-valid slug with
//      no row anywhere answers 410 (the true-stranger class) and a
//      malformed slug keeps the 404.
//   4. THE COST LAW — buildMatchPage still awaits exactly its three loads
//      on the full path (loadArchive, hydrateMatchVenue, fullByCodeFor);
//      the lite path skips the first by preloading the resolved rec.
"use strict";
const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");

let failures = 0;
function ok(msg) { console.log("OK   check-seo-archivescope: " + msg); }
function bad(msg) { console.error("FAIL check-seo-archivescope: " + msg); failures++; }
function check(cond, msg) { if (cond) ok(msg); else bad(msg); }

const filesSrc = fs.readFileSync(path.join(root, "src", "seo", "files.ts"), "utf8");
const routerSrc = fs.readFileSync(path.join(root, "src", "seo", "router.ts"), "utf8");
const pagesSrc = fs.readFileSync(path.join(root, "src", "seo", "pages.ts"), "utf8");
const dataSrc = fs.readFileSync(path.join(root, "src", "seo", "data.ts"), "utf8");

// ---------- 1. scope ----------
{
  const fn = filesSrc.slice(filesSrc.indexOf("export async function syncArchive"), filesSrc.indexOf("export function robotsTxt")).replace(/\/\/[^\n]*/g, ""); // comments stripped — the gate tests CODE, not the rationale comments
  check(/if \(!raw \|\| !raw\.utcDate \|\| raw\.status !== "FINISHED"\) continue;/.test(fn),
    "scope: FINISHED-only retention (the pool-reconciliation statuses stay ineligible until settled)");
  check(!/isBigForSeo|s\.big/.test(fn),
    "scope: the big-gate is GONE from syncArchive — every finished tracked match is retained (P2-B)");
  check(/const cutoff = Date\.now\(\) - \(SEO\.FINISHED_MATCH_ARCHIVE_DAYS - 5\) \* 864e5;/.test(fn),
    "scope: the 365-day retention window is unchanged (U-05)");
  check(/if \(added\.length \|\| list\.length !== full\.length\) await saveArchive\(env, list\);/.test(fn),
    "scope: the change-only blob write discipline holds (adds or retention-prunes only)");
  check(!/isBigForSeo/.test(fn),
    "scope: no big-gate residue anywhere in syncArchive (comments stripped — the gate tests code)");
}

// ---------- 2. per-match keys ----------
{
  check(/export const ARCHIVE_KEY_PREFIX = "seo_archive_v1\/m\/";/.test(filesSrc),
    "keys: the per-match key prefix seo_archive_v1/m/ is the exported constant");
  check(/env\.STATE\.put\(archiveMatchKey\(slug\), JSON\.stringify\(rec\), \{ expirationTtl: 370 \* 86400 \}\)/.test(filesSrc),
    "keys: new rows write their key once with a 370d TTL (self-expiring just past the 365d retention)");
  check(/if \(added\.length\) \{/.test(filesSrc.slice(filesSrc.indexOf("export async function syncArchive"))),
    "keys: key writes are BOUNDED by the rows this sweep added (no unbounded scans)");
  const fnLoad = filesSrc.slice(filesSrc.indexOf("export async function loadArchiveMatch"));
  check(/const rec = await env\.STATE\.get\(archiveMatchKey\(slug\), "json"\)/.test(fnLoad),
    "keys: loadArchiveMatch reads the ONE ~1KB key first");
  check(/const list = await loadArchive\(env\);/.test(fnLoad) && /archiveRowSlug\(r\.m\) === slug/.test(fnLoad),
    "keys: legacy rows resolve through the blob fallback (pre-key rows keep serving)");
  // the OG route consults the bounded lookup
  const ogFn = filesSrc.slice(filesSrc.indexOf("export async function buildMatchOgPng"));
  check(/const rec = await loadArchiveMatch\(env, slug\)\.catch/.test(ogFn),
    "keys: the OG PNG route resolves archived slugs through the per-match key (no multi-MB parse on the image path either)");
}

// ---------- 3. the lite path ----------
{
  const iDispatch = routerSrc.indexOf("const rawPool = await loadRawPool(env);");
  const iCtx = routerSrc.indexOf("const seoCtx = await getSeoCtx(env);");
  check(iDispatch !== -1 && iCtx !== -1 && iDispatch < iCtx,
    "lite: the match-slug family dispatches BEFORE the shared getSeoCtx (the pool-miss render never pays the context build)");
  check(/const rawPool = await loadRawPool\(env\);\n/.test(routerSrc) && /const poolHit = matchInPoolBySlug\(rawPool\.rows, mm\[1\]\);/.test(routerSrc),
    "lite: ONE raw pool read + presence detection (matchInPoolBySlug — the findMatchBySlug matcher)");
  check(/const rec = await F\.loadArchiveMatch\(env, mm\[1\]\);/.test(routerSrc),
    "lite: the pool miss resolves the per-match archive key");
  check(/const liteCtx = liteSeoCtx\(env, rawPool\.rows, rawPool\.fetchedAt\);/.test(routerSrc) && /await buildMatchPage\(liteCtx, mm\[1\], rec\)/.test(routerSrc),
    "lite: the archived render runs through liteSeoCtx + the preloaded rec (no blob, no shaping)");
  check(/if \(\/\^\(\[a-z0-9-\]\+\)-vs-\(\[a-z0-9-\]\+\)-\(\\d\{4\}-\\d\{2\}-\\d\{2\}\)\$\/\.test\(mm\[1\]\)\)/.test(routerSrc) &&
    /return \{ body: "", status: 410 \};/.test(routerSrc),
    "lite: a pattern-valid slug with no row anywhere answers 410 (the true-stranger class); malformed slugs fall to the 404");
  check(/const MATCH_HUB_SEGMENTS = new Set\(\["today", "tomorrow", "this-week", "this-weekend"\]\);/.test(routerSrc),
    "lite: the time-hub segments stay excluded from the match dispatch (hub paths render through the shared ctx)");
  // data-layer helpers
  check(/export function matchInPoolBySlug\(poolRows: any\[\], slug: string\)/.test(dataSrc) &&
    /export function liteSeoCtx\(env: Env, poolRows: any\[\], fetchedAt: string \| null\): SeoCtx/.test(dataSrc) &&
    /export async function loadRawPool\(env: Env\)/.test(dataSrc),
    "lite: the data-layer helpers exist with the documented contract");
}

// ---------- 4. the cost law ----------
{
  const bp = pagesSrc.indexOf("export async function buildMatchPage");
  const bpEnd = pagesSrc.indexOf("\nexport ", bp + 10);
  const body = pagesSrc.slice(bp, bpEnd);
  const realAwaits = body.replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, "").match(/await\s+[A-Za-z]/g) || [];
  check(realAwaits.length === 3,
    "cost law: buildMatchPage keeps exactly 3 awaits in source (loadArchive, hydrateMatchVenue, fullByCodeFor — the lite path skips the first by preloading) — found " + realAwaits.length);
  check(/const archive = preloaded && preloaded\.m \? \[preloaded\] : await loadArchive\(ctx\.env\)\.catch\(\(\) => \[\] as any\[\]\);/.test(body),
    "cost law: the preloaded branch replaces the blob read (the multi-MB parse leaves the lite page path)");
  check(/if \(preloaded && preloaded\.m && preloaded\.m\.utcDate\) \{/.test(body) && /sm = \{ raw: preloaded\.m, s: preloaded\.m, archived: true \};/.test(body),
    "cost law: the preloaded rec serves as BOTH raw and s with archived:true (findArchivedMatchBySlug parity)");
  const liteCtxFn = dataSrc.slice(dataSrc.indexOf("export function liteSeoCtx"));
  check(/payload: \{ standings: \{\} \}/.test(liteCtxFn) && /pool: rows, shaped: rows/.test(liteCtxFn),
    "cost law: liteSeoCtx carries the raw rows on both sides + an empty standings shell (no payload loads, no 7 standings reads)");
  // pageHold: the archived lite render holds ARCHIVE_PAGE_TTL
  check(/pageHold\.v = SEO\.ARCHIVE_PAGE_TTL;\n        return \{ body: r\.html, status: 200 \};/.test(routerSrc),
    "cost law: the lite render holds ARCHIVE_PAGE_TTL (6h — the immutable-history render hold)");
}

if (failures) {
  console.error("check-seo-archivescope: " + failures + " failure(s)");
  process.exit(1);
} else {
  console.log("check-seo-archivescope: all checks passed");
}
