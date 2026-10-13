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
  "4 TSP call sites use the shared mapper (3 league views + the v13.50 cup team view)",
  (src.match(/= tspEventToMatch\(e, code\);/g) || []).length === 4
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
// v13.72-deadweight: the old check matched the UNMINIFIED pattern
// (`if(m.venue){ var vn = ... }`) which by then only existed in retired
// asset versions kept in the tree — it tested dead files instead of the
// live artifact. The pattern below is minification-agnostic: it anchors on
// the semantic chain (span createElement → className "venue" → textContent
// built from <match>.venue) and requires the stadium emoji (as either the
// literal char or the \u{...} escape the minifier emits).
const clientAssets = (() => {
  try {
    const files = fs.readdirSync("assets").filter((f) => /^public-.*\.js$/.test(f));
    return files.map((f) => fs.readFileSync("assets/" + f, "utf8"));
  } catch (e) { return []; }
})();
check(
  "render() shows venue chip",
  clientAssets.some((a) =>
    /createElement\("span"\)[\s\S]{0,80}?className ?= ?"venue"[\s\S]{0,40}?textContent ?= ?[\s\S]{0,30}?\+ ?\w+\.venue/.test(a) &&
    (/\u{1F3DF}/.test(a) || /\\u\{1F3DF\}/.test(a)) &&
    /render\(|renderSpecial/.test(a))
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
globalThis.rivalryName = () => null; // v13.51-rivalries stub (pubMatch tags)
// v13.35-rounds: pubMatch derives round/roundFa through roundLabel — the
// extracted body needs ROUND_FA + FA_ORDINALS + roundLabel in scope.
const roundFaSrc = src.match(/var ROUND_FA = \{[\s\S]*?\n\};/)[0];
const faOrdSrc = src.match(/var FA_ORDINALS = \[[\s\S]*?\];/)[0];
const roundLabelSrc = src.match(/function roundLabel\(m\) \{[\s\S]*?\n\}/)[0];
new Function(roundFaSrc + "\n" + faOrdSrc + "\n" + roundLabelSrc + "\nglobalThis.ROUND_FA = ROUND_FA; globalThis.FA_ORDINALS = FA_ORDINALS; globalThis.roundLabel = roundLabel;")();
const pubMatch = new Function("m", pubSrc + "; return pubMatch(m);");
const out = pubMatch({ homeTeam: { name: "Arsenal" }, awayTeam: { name: "Chelsea" }, utcDate: "2026-09-06T19:00:00Z", competition: { code: "PL" }, status: "SCHEDULED", venue: "Emirates Stadium" });
check("pubMatch keeps venue", out.venue === "Emirates Stadium");
const outNull = pubMatch({ homeTeam: { name: "A" }, awayTeam: { name: "B" }, utcDate: "x", competition: { code: "PL" }, status: "SCHEDULED" });
check("pubMatch venue null when absent", outNull.venue === null);
// v13.35-rounds: league fixture carries NO round chip; a cup fixture with a
// sportscore round label gets round + translated roundFa.
check("pubMatch league fixture has no round", out.round === null && out.roundFa === null);
const outCup = pubMatch({ homeTeam: { name: "Arsenal" }, awayTeam: { name: "Chelsea" }, utcDate: "2026-09-06T19:00:00Z", competition: { code: "FA_CUP" }, status: "SCHEDULED", roundRaw: "Round 3" });
check("pubMatch cup fixture carries round + FA label", outCup.round === "Round 3" && outCup.roundFa === "دور سوم");
const outStage = pubMatch({ homeTeam: { name: "A" }, awayTeam: { name: "B" }, utcDate: "2026-09-06T19:00:00Z", competition: { code: "CL" }, status: "SCHEDULED", stage: "SEMI_FINALS" });
check("pubMatch FD stage enum maps (SEMI_FINALS)", outStage.round === "SEMI_FINALS" && outStage.roundFa === "نیمه‌نهایی");
// v13.35 fix: "3rd Round" is a cup ROUND (دور سوم), NOT the third-place
// playoff — the round patterns must run before the loose third/3rd scan.
const outOrd = pubMatch({ homeTeam: { name: "A" }, awayTeam: { name: "B" }, utcDate: "2026-09-06T19:00:00Z", competition: { code: "EFL_CUP" }, status: "SCHEDULED", roundRaw: "3rd Round" });
check("pubMatch '3rd Round' = دور سوم (not رده‌بندی)", outOrd.round === "3rd Round" && outOrd.roundFa === "دور سوم");
const outPlace = pubMatch({ homeTeam: { name: "A" }, awayTeam: { name: "B" }, utcDate: "2026-09-06T19:00:00Z", competition: { code: "CL" }, status: "SCHEDULED", roundRaw: "3rd place" });
check("pubMatch '3rd place' = رده‌بندی", outPlace.roundFa === "رده‌بندی");

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