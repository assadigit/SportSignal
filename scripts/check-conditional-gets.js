// scripts/check-conditional-gets.js
// v13.207-condget (web-optimization Phase 4, F-M5): gates the conditional-GET
// contract of src/seo/router.ts — the two F-M5 root causes must never return:
//   1. the edge-cache HIT path returning the full body to a matching
//      If-None-Match (no 304 branch), and
//   2. the strict `inm.trim() === tag` comparison, which can never match in
//      production because Cloudflare's compression layer weakens our strong
//      ETags in transit (client receives W/"ss-…", replays W/"ss-…").
// Also pins: ETag on the five machine-file surfaces, the 304 header hygiene,
// and the R12 freshness-ladder literals (untouched by the 304 work).
const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");

const src = fs.readFileSync(path.join(root, "src/seo/router.ts"), "utf8");
const files = fs.readFileSync(path.join(root, "src/seo/files.ts"), "utf8");

let failures = 0;
function ok(msg) { console.log("OK   check-conditional-gets: " + msg); }
function bad(msg) { console.error("FAIL check-conditional-gets: " + msg); failures++; }

// --- 1. the weak-comparison helper exists and is list/`*`/W\-aware ---
const fnMatch = src.match(/function etagMatches\(inm: string, tag: string \| null\): boolean \{[\s\S]*?\n\}/);
if (!fnMatch) bad("etagMatches helper not found in src/seo/router.ts");
else {
  const body = fnMatch[0];
  const hasWeak = /replace\(\s*\/\^W\\\/\s*\/i\s*,\s*""\s*\)/.test(body);
  const hasList = /inm\.split\(","\)/.test(body);
  const hasStar = /"\*"/.test(body);
  if (hasWeak && hasList && hasStar) ok("etagMatches: weak (W/) + comma-list + `*` comparison present");
  else bad("etagMatches lost weak/list/star semantics (weak=" + hasWeak + " list=" + hasList + " star=" + hasStar + ")");
}

// --- 2. behavior test of the comparator (extracted + evaluated, the repo's
//        check style): the seven F-M5-relevant vectors ---
if (fnMatch) {
  try {
    const js = fnMatch[0]
      .replace(/function etagMatches\(inm: string, tag: string \| null\): boolean \{/, "function etagMatches(inm, tag) {")
      .replace(/const opaque = \(s: string\) =>/, "const opaque = (s) =>");
    const etagMatches = new Function(js + "; return etagMatches;")();
    const vectors = [
      ['"ss-abc"', '"ss-abc"', true, "strong match"],
      ['W/"ss-abc"', '"ss-abc"', true, "weakened replay (the production reality)"],
      ['"ss-x", "ss-abc"', '"ss-abc"', true, "comma list"],
      ['*', '"ss-abc"', true, "star"],
      ['  "ss-abc"  ', '"ss-abc"', true, "whitespace"],
      ['"ss-other"', '"ss-abc"', false, "different validator"],
      ['"ss-abc"', null, false, "absent stored validator"],
    ];
    let vOk = 0;
    for (const [inm, tag, want, label] of vectors) {
      const got = etagMatches(inm, tag);
      if (got === want) vOk++;
      else bad('etagMatches vector "' + label + '" returned ' + got + " (wanted " + want + ")");
    }
    if (vOk === vectors.length) ok("etagMatches behavior: " + vOk + "/" + vectors.length + " vectors correct");
  } catch (e) {
    bad("etagMatches could not be evaluated for the behavior test: " + e.message);
  }
}

// --- 3. the HIT path: the 304 branch must run BEFORE the body is returned ---
const hitBlock = src.match(/const hit = await caches\.default\.match\(cacheKey\);[\s\S]*?return new Response\(hit\.body/);
if (!hitBlock) bad("edge-cache HIT path not found (wantCached was restructured — update this check)");
else {
  const b = hitBlock[0];
  const has304 = b.includes("etagMatches(inmHit") && b.includes("notModified304(h)");
  // the x-ss-cc restore must precede the 304 (the 304 needs the PUBLIC header)
  const restoreFirst = b.indexOf('h.set("cache-control", orig)') < b.indexOf("notModified304(h)");
  if (has304 && restoreFirst) ok("HIT path: If-None-Match → 304 after the public cache-control restore, before the body");
  else bad("HIT path 304 branch missing or ordered wrong (has304=" + has304 + " restoreFirst=" + restoreFirst + ")");
}

// --- 4. the MISS path: conditional treatment after the edge-cache store ---
const missTail = src.match(/ctx\.waitUntil\(caches\.default\.put[\s\S]*?\n  \};/);
if (!missTail) bad("wantCached store/tail not found (restructured — update this check)");
else {
  const b = missTail[0];
  if (b.includes("etagMatches(inmMiss") && b.includes("notModified304(res.headers)"))
    ok("MISS path: If-None-Match → 304 after the render+store (fresh 200 still cached)");
  else bad("MISS path conditional branch missing");
}

// --- 5. the old strict comparison must stay dead (the regression guard:
//        matches the original `if (inm && inm.trim() === tag)` CODE, not the
//        v13.207 comments that describe it) ---
if (/if\s*\(\s*inm\s*&&\s*inm\.trim\(\)\s*===\s*tag/.test(src)) bad("the strict ETag equality check is BACK — production 304s would break again (CF weakens ETags in transit)");
else ok("no strict ETag equality code anywhere (the F-M5 root cause stays dead)");

// --- 6. ETag on the five machine-file surfaces ---
const machine = [
  ["sitemap index", /return wantCached\("\/sitemap\.xml"[\s\S]*?return withEtag\(xml, F\.sitemapHeaders/],
  ["sitemap child", /return wantCached\("\/sitemaps\/" \+ kind \+ "\.xml"[\s\S]*?return withEtag\(xml, F\.sitemapHeaders/],
  ["calendar.ics", /return wantCached\("\/calendar\.ics"[\s\S]*?return withEtag\(ics/],
  ["feed.xml", /return wantCached\("\/feed\.xml"[\s\S]*?return withEtag\(xml/],
  ["matches.json", /return wantCached\("\/api\/matches\.json"[\s\S]*?return withEtag\(json/],
];
let mOk = 0;
for (const [label, re] of machine) {
  if (re.test(src)) mOk++;
  else bad("machine file " + label + " lost its withEtag wrap");
}
if (mOk === machine.length) ok("all 5 machine-file surfaces (sitemap index/children, feed, calendar, matches.json) carry ETag");

// --- 7. 304 header hygiene: no body-transport headers on the body-less reply ---
if (/h\.delete\("content-length"\)/.test(src) && /h\.delete\("content-encoding"\)/.test(src))
  ok("notModified304 strips content-length/content-encoding");
else bad("notModified304 no longer strips body-transport headers");

// --- 8. the R12 freshness ladder is byte-identical (the 304 work must not
//        touch a single TTL — live scores must never freeze) ---
const ladder = [
  ["HTML public ladder", /"cache-control": "public, max-age=0, s-maxage=60, stale-while-revalidate=300"/, src],
  ["matches.json ladder", /"cache-control": "public, max-age=60, s-maxage=300"/, src],
  ["feed/calendar TTL", /"cache-control": "public, max-age=300"/, src],
  ["render-hold store", /h\.set\("cache-control", "public, s-maxage=" \+ Math\.max\(60, Math\.floor\(holdTtl\)\)\)/, src],
  ["sitemap TTL (files.ts)", /"cache-control": "public, max-age=" \+ ttl/, files],
];
let lOk = 0;
for (const [label, re, where] of ladder) {
  if (re.test(where)) lOk++;
  else bad("freshness-ladder literal changed/missing: " + label);
}
if (lOk === ladder.length) ok("R12 freshness ladder intact (HTML s-maxage=60 + holds, API 60/300, sitemaps, feed/calendar)");

if (failures) { console.error("check-conditional-gets: " + failures + " failure(s)"); process.exit(1); }
