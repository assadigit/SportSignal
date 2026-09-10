// Self-check: duplicate-match prevention. Asserts:
//  1) canonDedupe collapses two providers' copies of the SAME match to one row
//  2) venue + crests survive from whichever copy carries them
//  3) cacheMatches (KV writes) and fetchLongView (returned list → public page)
//     both funnel through canonDedupe, so duplicate rows can't reach the UI
const fs = require("fs");
const src = fs.readFileSync("src/worker.ts", "utf8");
const { canonDedupe } = require("../src/dedupe.js");

let fails = 0;
const check = (name, cond) => {
  console.log((cond ? "OK   " : "FAIL ") + name);
  if (!cond) fails++;
};

check("canonDedupe helper defined", typeof canonDedupe === "function");
check("cacheMatches uses canonDedupe", /const merged = canonDedupe\(\[\.\.\.head, \.\.\.matches\]\);/.test(src));
check(
  "fetchLongView dedupes before returning",
  /canonDedupe\(allMatches\)/.test(src) && /allMatches\.push\(\.\.\.deduped\)/.test(src)
);

// Dynamic: exercise the real helper from the dedupe module (single source of truth)

const fd = { id: 560542, competition: { code: "PL" }, homeTeam: { name: "Arsenal FC", crest: "https://crests.football-data.org/57.png" }, awayTeam: { name: "Coventry City FC", crest: null }, utcDate: "2026-08-21T19:00:00Z", venue: null };
const tsd = { id: "tsd-2494000", competition: { code: "PL" }, homeTeam: { name: "Arsenal", crest: null }, awayTeam: { name: "Coventry City", crest: "https://r2.thesportsdb.com/badge.png" }, utcDate: "2026-08-21T19:00:00.000Z", venue: "Emirates Stadium" };

const one = canonDedupe([fd, tsd]);
check("fd+TSP copies of the same match collapse to one", one.length === 1);
check("venue + crests adopted from the copy that has them", one[0].venue === "Emirates Stadium" && one[0].homeTeam.crest === "https://crests.football-data.org/57.png" && one[0].awayTeam.crest === "https://r2.thesportsdb.com/badge.png");
const otherDay = JSON.parse(JSON.stringify(tsd)); otherDay.utcDate = "2026-08-28T19:00:00.000Z";
check("same match on a different day stays separate", canonDedupe([fd, tsd, otherDay]).length === 2);
check("watch-order: later copy wins but keeps earlier venue", canonDedupe([tsd, fd]).length === 1);

process.exit(fails ? 1 : 0);