// scripts/check-seo-lastmod.js
// v13.208-lastmod (web-optimization Phase 5): gates the sitemap-lastmod
// honesty contract of src/seo/files.ts + the F-L1/F-H3/IndexNow cleanups.
//   1. computeLastmods MERGES the seo_lastmod_v1 map across children — the
//      v13.207-and-earlier code REPLACED the whole map with the calling
//      child's candidates, so each of the 5 children evicted every other
//      child's entries and the next render of any child re-stamped its FULL
//      URL set with the render clock (live-verified 2026-11-04: 94/94 teams
//      + 144/144 upcoming at one render-time millisecond) — the "now on
//      every build" class F-05 forbids, plus a KV write per render and
//      full-list IndexNow pings.
//   2. Writes are strictly change-only (the old `prevKeys !== candidates
//      .length` clause fired on every cross-child interleaving).
//   3. buildSitemapIndex derives per-child <lastmod> from the honest map
//      (family max) instead of `now` on every render.
//   4. F-L1: the 404 builder emits NO canonical / og:url (path?: string).
//   5. F-H3: the Cloudflare Web Analytics beacon rides both HTML templates
//      (page-shell + homepage) with the /privacy disclosure.
//   6. IndexNow drains the parked list on the send path (old code parked
//      rate-limited URLs forever — they expired unsend).
const fs = require("fs");
const path = require("path");
const root = path.resolve(__dirname, "..");

const filesSrc = fs.readFileSync(path.join(root, "src", "seo", "files.ts"), "utf8");
const shellSrc = fs.readFileSync(path.join(root, "src", "seo", "page-shell.ts"), "utf8");
const staticSrc = fs.readFileSync(path.join(root, "src", "seo", "pages-static.ts"), "utf8");
const publicSrc = fs.readFileSync(path.join(root, "src", "pages", "public.ts"), "utf8");
const nowSrc = fs.readFileSync(path.join(root, "src", "seo", "indexnow.ts"), "utf8");

let failures = 0;
function ok(msg) { console.log("OK   check-seo-lastmod: " + msg); }
function bad(msg) { console.error("FAIL check-seo-lastmod: " + msg); failures++; }

// ---- extraction helpers (the repo's eval-harness check style) ----
function grab(re) {
  const m = filesSrc.match(re);
  return m ? m[0] : null;
}
function stripTypes(src) {
  return src
    .replace(/async function computeLastmods\(env: Env, candidates: \{ path: string; hash: string \}\[\]\): Promise<\{ map: Record<string, string>; changed: string\[\] \}> \{/, "async function computeLastmods(env, candidates) {")
    .replace(/async function lastmodMap\(env: Env\): Promise<Record<string, \{ h: string; t: number \}>> \{/, "async function lastmodMap(env) {")
    .replace(/function xmlEsc\(s: any\): string \{/, "function xmlEsc(s) {")
    .replace(/export async function buildSitemapIndex\(env: Env\): Promise<string> \{/, "async function buildSitemapIndex(env) {")
    .replace(/const next: Record<string, \{ h: string; t: number \}> = \{\};/, "const next = {};")
    .replace(/const outIso: Record<string, string> = \{\};/, "const outIso = {};")
    .replace(/const changed: string\[\] = \[\];/, "const changed = [];")
    .replace(/const kids: \{ file: string; lastmod: string \}\[\] = \[/, "const kids = [")
    .replace(/\(prefix: string\): string => \{/, "(prefix) => {");
}

const SEO = { KV_SEO_LASTMOD: "seo_lastmod_v1", SITE_URL: "https://sportsignal.ir", CONTENT_VERSION: "2026-10-11T00:00:00Z" };

// in-memory KV stub; puts are recorded so change-only discipline is testable
function mkEnv(initial) {
  const store = new Map(Object.entries(initial || {}));
  const puts = [];
  return {
    env: {
      STATE: {
        async get(k) { return store.has(k) ? store.get(k) : null; },
        async put(k, v) { puts.push(k); store.set(k, JSON.parse(v)); }
      }
    },
    puts, store
  };
}

(async () => {
  const fnCompute = grab(/async function computeLastmods\([\s\S]*?\n\}/);
  const fnMap = grab(/async function lastmodMap\([\s\S]*?\n\}/);
  const fnXmlEsc = grab(/function xmlEsc\([\s\S]*?\n\}/);
  const fnIndex = grab(/export async function buildSitemapIndex\([\s\S]*?\n\}/);
  if (!fnCompute || !fnMap || !fnXmlEsc || !fnIndex) {
    bad("could not extract computeLastmods/lastmodMap/xmlEsc/buildSitemapIndex from src/seo/files.ts (restructured — update this check)");
  } else {
    const js = stripTypes(fnMap + "\n" + fnXmlEsc + "\n" + fnCompute + "\n" + fnIndex);
    let computeLastmods, buildSitemapIndex;
    try {
      ({ computeLastmods, buildSitemapIndex } = new Function("SEO", js + "; return { computeLastmods, buildSitemapIndex };")(SEO));
    } catch (e) {
      bad("extracted functions failed to evaluate: " + e.message);
    }
    if (computeLastmods) {
      // --- 1. cross-child MERGE: a foreign child's render must not evict ---
      try {
        const T0 = Date.now() - 864e5; // yesterday — inside the 400d freshness
        const { env, puts, store } = mkEnv({ seo_lastmod_v1: { urls: { "/teams/a": { h: "th1", t: T0 } } } });
        const r = await computeLastmods(env, [{ path: "/competitions/c", hash: "ch1" }]);
        const stored = (store.get("seo_lastmod_v1") || {}).urls || {};
        // r.map covers THIS child's candidates only; the MERGE is what the
        // stored KV map keeps — the old code dropped /teams/a here.
        const merged = Object.prototype.hasOwnProperty.call(stored, "/teams/a") &&
          stored["/teams/a"].t === T0 &&
          Object.prototype.hasOwnProperty.call(stored, "/competitions/c") &&
          Object.keys(r.map).join(",") === "/competitions/c" &&
          r.changed.length === 1 && r.changed[0] === "/competitions/c";
        if (merged) ok("cross-child MERGE: teams entry survives a competitions render (the eviction bug stays dead)");
        else bad("cross-child merge failed: map=" + JSON.stringify(r.map) + " changed=" + JSON.stringify(r.changed));
        if (puts.length === 1) ok("one KV write for one genuinely-changed URL (change-only discipline)");
        else bad("expected exactly 1 put, saw " + puts.length);
      } catch (e) { bad("merge vector threw: " + e.message); }

      // --- 2. unchanged re-render: zero writes, ts preserved ---
      try {
        const T0 = Date.now() - 864e5;
        const { env, puts } = mkEnv({ seo_lastmod_v1: { urls: { "/teams/a": { h: "th1", t: T0 } } } });
        const r = await computeLastmods(env, [{ path: "/teams/a", hash: "th1" }]);
        if (r.changed.length === 0 && puts.length === 0 && r.map["/teams/a"] === new Date(T0).toISOString())
          ok("unchanged re-render: no KV write, lastmod preserved (no now-on-every-build)");
        else bad("unchanged re-render wrote or re-stamped: changed=" + JSON.stringify(r.changed) + " puts=" + puts.length);
      } catch (e) { bad("no-change vector threw: " + e.message); }

      // --- 3. hash change advances ONLY the changed URL's ts ---
      try {
        const Ta = Date.now() - 2 * 864e5, Tb = Date.now() - 864e5;
        const { env } = mkEnv({ seo_lastmod_v1: { urls: { "/teams/a": { h: "th1", t: Ta }, "/teams/b": { h: "th2", t: Tb } } } });
        const before = Date.now();
        const r = await computeLastmods(env, [
          { path: "/teams/a", hash: "th9" },
          { path: "/teams/b", hash: "th2" }
        ]);
        const aT = Date.parse(r.map["/teams/a"]);
        const bT = Date.parse(r.map["/teams/b"]);
        if (r.changed.length === 1 && r.changed[0] === "/teams/a" && aT >= before && bT === Tb)
          ok("hash change: only the changed URL's lastmod advances (sibling untouched)");
        else bad("hash-change vector wrong: changed=" + JSON.stringify(r.changed) + " aT=" + aT + " bT=" + bT);
      } catch (e) { bad("hash-change vector threw: " + e.message); }

      // --- 4. stale entries (>400d) pruned on write ---
      try {
        const now = Date.now();
        const staleT = now - 401 * 864e5;
        const { env, store } = mkEnv({ seo_lastmod_v1: { urls: {
          "/teams/stale": { h: "s", t: staleT },
          "/teams/keep": { h: "k", t: now - 864e5 }
        } } });
        await computeLastmods(env, [
          { path: "/teams/keep", hash: "k" },
          { path: "/teams/new", hash: "n" }
        ]);
        const stored = (store.get("seo_lastmod_v1") || {}).urls || {};
        if (!Object.prototype.hasOwnProperty.call(stored, "/teams/stale") &&
          Object.prototype.hasOwnProperty.call(stored, "/teams/keep") &&
          Object.prototype.hasOwnProperty.call(stored, "/teams/new"))
          ok("400-day stale entries pruned on write (bounded map growth)");
        else bad("stale prune failed: stored keys=" + Object.keys(stored).join(","));
      } catch (e) { bad("stale-prune vector threw: " + e.message); }

      // --- 5. sitemap index: family-derived lastmod, not `now` ---
      try {
        const T = Date.UTC.bind(Date);
        const { env } = mkEnv({ seo_lastmod_v1: { urls: {
          "/teams/a": { h: "1", t: T(2026, 10, 4, 10, 0, 0) },
          "/teams/b": { h: "1", t: T(2026, 10, 4, 12, 0, 0) },
          "/competitions/c": { h: "1", t: T(2026, 10, 3, 9, 0, 0) },
          "/matches/x": { h: "1", t: T(2026, 10, 4, 15, 0, 0) }
        } } });
        const xml = await buildSitemapIndex(env);
        const entry = (f) => (xml.match(new RegExp("<loc>[^<]*/sitemaps/" + f + "\\.xml</loc><lastmod>([^<]+)</lastmod>")) || [])[1];
        const pages = entry("pages"), teams = entry("teams"), comps = entry("competitions");
        const upc = entry("matches-upcoming"), arc = entry("matches-archive");
        const nSitemap = (xml.match(/<sitemap>/g) || []).length;
        if (nSitemap === 5 &&
          pages === SEO.CONTENT_VERSION &&
          teams === "2026-11-04T12:00:00.000Z" &&
          comps === "2026-11-03T09:00:00.000Z" &&
          upc === "2026-11-04T15:00:00.000Z" && arc === "2026-11-04T15:00:00.000Z")
          ok("sitemap index lastmod: per-child family max from the honest map (pages=CONTENT_VERSION, no render-clock stamp)");
        else bad("index derivation wrong: pages=" + pages + " teams=" + teams + " comps=" + comps + " upc=" + upc + " arc=" + arc + " n=" + nSitemap);
      } catch (e) { bad("index vector threw: " + e.message); }

      // --- 6. empty map fallback: still valid ISO stamps ---
      try {
        const { env } = mkEnv({});
        const xml = await buildSitemapIndex(env);
        const stamps = [...xml.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].map((m) => Date.parse(m[1]));
        if (stamps.length === 5 && stamps.every((t) => !isNaN(t) && t > Date.UTC(2026, 0, 1)))
          ok("empty-map fallback: index degrades to fresh ISO stamps (all parseable)");
        else bad("empty-map fallback produced unparseable stamps: " + stamps.join(","));
      } catch (e) { bad("fallback vector threw: " + e.message); }
    }
  }

  // ---- source-level contracts ----
  // 7. the eviction-bug write amplifier clause is dead (code pattern, not
  //    the explanatory comment that names it)
  if (!/const prevKeys = Object\.keys\(prev\)\.length;/.test(filesSrc) && /if \(changed\.length\) \{/.test(filesSrc) && /const staleCutoff = now - 400 \* 864e5;/.test(filesSrc))
    ok("computeLastmods source: change-only write + the 400d stale-prune present; prevKeys clause gone");
  else bad("computeLastmods source drifted (prevKeys present or write condition changed)");

  // 8. F-L1: the 404 emits no canonical / og:url
  const b404 = (staticSrc.match(/export function build404Page\([\s\S]*?\n\}/) || [""])[0];
  if (/path\?: string/.test(shellSrc) &&
    /if \(canonical\) s \+= '<link rel="canonical"/.test(shellSrc) &&
    /if \(canonical\) s \+= '<meta property="og:url"/.test(shellSrc) &&
    b404 && !/path: "\/404"/.test(b404) && !/path: "\/404"/.test(staticSrc))
    ok("F-L1: HeadInput.path optional + conditional canonical/og:url; the 404 builder passes no fictional /404 path");
  else bad("F-L1 regression: canonical emission no longer conditional, or /404 path is back");

  // 9. F-H3: the Web Analytics beacon on BOTH HTML templates + disclosure
  const beacon = /<script type="module" src="https:\/\/static\.cloudflareinsights\.com\/beacon\.min\.js" data-cf-beacon='\{"token": "[0-9a-f]+"\}'><\/script>/.source;
  if (new RegExp(beacon).test(shellSrc) && new RegExp(beacon.replace("<\\/script>", "<\\\\/script>")).test(publicSrc) &&
    /آنالیتیکس کلادفلر/.test(staticSrc))
    ok("F-H3: CF Web Analytics beacon present in page-shell + homepage with the /privacy disclosure");
  else bad("F-H3: beacon missing from a template or the privacy disclosure is gone");

  // 10. IndexNow drain: parked URLs join the next send
  if (/toSend = Array\.from\(new Set\(list\.concat\(\(parked && parked\.urls\) \|\| \[\]\)\)\)/.test(nowSrc) &&
    /urlList: toSend/.test(nowSrc))
    ok("IndexNow: the parked list drains into the next send (rate-limited URLs no longer expire unsend)");
  else bad("IndexNow drain missing — parked URLs die unsend again");

  if (failures) { console.error("check-seo-lastmod: " + failures + " failure(s)"); process.exit(1); }
})();
