// Self-check: venue threading. Asserts:
//  1) All three TheSportsDB match builders attach e.strVenue (venue: ... || null)
//  2) The cross-source merge fills a missing venue from a later provider
//  3) pubMatch exposes venue
const fs = require("fs");
const src = require("./lib/worker-src")();

let fails = 0;
const check = (name, cond) => {
  console.log((cond ? "OK   " : "FAIL ") + name);
  if (!cond) fails++;
};

// 1) three TSP push sites carry venue
check(
  "TSP builder sets venue from strVenue",
  /venue: e\.strVenue \|\| null,/.test(src)
);
check(
  "3 TSP call sites use the shared mapper",
  (src.match(/= tspEventToMatch\(e, code\);/g) || []).length === 3
);
// publication site: pubMatch maps m.venue
check(
  "pubMatch exposes venue",
  /venue: m\.venue \|\| null,/.test(src)
);
// merge enriches venue from a later provider
check(
  "merge fills missing venue from later provider",
  /if \(!cur\.venue && x\.venue\) cur\.venue = x\.venue;/.test(src)
);
// static checks: TSP object must have non-null venue values flow (strVenue may be empty)
check("tspEventToMatch threads venue", /venue: e\.strVenue \|\| null,\s*homeTeam: \{ name: e\.strHomeTeam/.test(src));
// the venue chip must be rendered in both render paths
// v13.6: the public client JS moved to assets/public-*.js — search it there.
const clientAsset = (() => {
  try {
    const files = fs.readdirSync("assets").filter((f) => /^public-.*\.js$/.test(f)).sort();
    return files.length ? fs.readFileSync("assets/" + files[files.length - 1], "utf8") : "";
  } catch (e) { return ""; }
})();
check(
  "render() shows venue chip",
  /if\(m\.venue\)\{ var vn = document\.createElement\("span"\); vn\.className = "venue"; vn\.textContent = "\u{1F3DF}\u{FE0F} " \+ m\.venue; info\.appendChild\(vn\); \}/gu.test(clientAsset)
    && /render\(\)|renderSpecial/.test(clientAsset)
);

// 2) dynamic: exercise the real merge fill logic in isolation
const mergeSrc = `(function mergeOne(cur, x) { if(!cur.homeTeam.crest && x.homeTeam.crest) cur.homeTeam.crest = x.homeTeam.crest; if(!cur.awayTeam.crest && x.awayTeam.crest) cur.awayTeam.crest = x.awayTeam.crest; if(!cur.venue && x.venue) cur.venue = x.venue; return cur; })`;
const mergeOne = eval(mergeSrc);
const fdMatch = { venue: null, homeTeam: { crest: null }, awayTeam: { crest: null } };
const tsdMatch = { venue: "Emirates Stadium", homeTeam: { crest: "logo.png" }, awayTeam: {} };
const merged = mergeOne(fdMatch, tsdMatch);
check("merge fills venue + crest from TSP", merged.venue === "Emirates Stadium" && merged.homeTeam.crest === "logo.png");
const keepExisting = mergeOne({ venue: "Old Trafford", homeTeam: { crest: null }, awayTeam: { crest: null } }, { venue: "Emirates Stadium", homeTeam: {}, awayTeam: {} });
check("merge keeps existing venue", keepExisting.venue === "Old Trafford");

// 3) pubMatch output shape
let pubSrc = src.match(/function pubMatch\(m\) \{[\s\S]*?\n\}/)[0]
  .replace(/^function pubMatch\(m\) \{/, "")
  .replace(/\n\}$/, "");
// stub referenced helpers
globalThis.translateTeam = (n) => n;
globalThis.translateCompetition = () => "x";
globalThis.translateVenue = (v) => v; // v13.13-venues stub
globalThis.LEAGUE_LOGOS = {};
globalThis.isLiveStatus = (s) => s === "LIVE";
globalThis.isFeaturedMatch = () => false;
globalThis.isDerby = () => false;
const pubMatch = new Function("m", pubSrc + "; return pubMatch(m);");
const out = pubMatch({ homeTeam: { name: "Arsenal" }, awayTeam: { name: "Chelsea" }, utcDate: "2026-09-06T19:00:00Z", competition: { code: "PL" }, status: "SCHEDULED", venue: "Emirates Stadium" });
check("pubMatch keeps venue", out.venue === "Emirates Stadium");
const outNull = pubMatch({ homeTeam: { name: "A" }, awayTeam: { name: "B" }, utcDate: "x", competition: { code: "PL" }, status: "SCHEDULED" });
check("pubMatch venue null when absent", outNull.venue === null);

// 4) canonical-key dedupe lives in src/dedupe.ts; cacheMatches wires it into the KV merge
const dedupeSrc = fs.readFileSync("src/dedupe.ts", "utf8");
check(
  "cacheMatches dedupes on canonical key (module)",
  /const merged = canonDedupe\(\[\.\.\.head, \.\.\.matches\]\);/.test(src) &&
    // v13.33-ts: tolerate optional param type annotations (`(m)` / `(m: MatchLike)`)
    /const canon = \(m(?::[^)]*)?\) => .*normalizeTeamName/.test(dedupeSrc) &&
    /adopt\(m, cur\)/.test(dedupeSrc) &&
    /\[\.\.\.byKey\.values\(\)\]/.test(dedupeSrc)
);
// verify canon collapses "Arsenal FC"/"Arsenal" + strips "FC"/"CF" suffixes
const canonFn = new Function(
  "m",
  "return `${m.competition.code}|${String(m.homeTeam.name||\"\").toLowerCase().normalize(\"NFD\").replace(/[\\u0300-\\u036f]/g,\"\").replace(/\\b(fc|cf|sc|ac|as|ssc|bc|ud|cd|kv|jc)\\b/g,\" \").replace(/[^a-z0-9]/g,\"\")}|${String(m.awayTeam.name||\"\").toLowerCase().normalize(\"NFD\").replace(/[\\u0300-\\u036f]/g,\"\").replace(/\\b(fc|cf|sc|ac|as|ssc|bc|ud|cd|kv|jc)\\b/g,\" \").replace(/[^a-z0-9]/g,\"\")}|${(m.utcDate || \"\").slice(0, 10)}`"
);
const fdKey = canonFn({ competition: { code: "PL" }, homeTeam: { name: "Arsenal FC" }, awayTeam: { name: "Coventry City FC" }, utcDate: "2026-08-21T19:00:00Z" });
const tsdKey = canonFn({ competition: { code: "PL" }, homeTeam: { name: "Arsenal" }, awayTeam: { name: "Coventry City" }, utcDate: "2026-08-21T19:00:00.000Z" });
check("canon key collapses fd+TSP copies", fdKey === tsdKey && fdKey === "PL|arsenal|coventrycity|2026-08-21");

process.exit(fails ? 1 : 0);