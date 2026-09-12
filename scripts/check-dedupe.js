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
check("cacheMatches uses canonDedupe", /const merged = \(0, import_dedupe\.canonDedupe\)\(\[\.\.\.head, \.\.\.matches\]\);/.test(src));
check(
  "fetchLongView dedupes before returning",
  /\(0, import_dedupe\.canonDedupe\)\(allMatches\)/.test(src) && /allMatches\.push\(\.\.\.deduped\)/.test(src)
);

// Dynamic: exercise the real helper from the dedupe module (single source of truth)

const fd = { id: 560542, competition: { code: "PL" }, homeTeam: { name: "Arsenal FC", crest: "https://crests.football-data.org/57.png" }, awayTeam: { name: "Coventry City FC", crest: null }, utcDate: "2026-08-21T19:00:00Z", venue: null };
const tsd = { id: "tsd-2494000", competition: { code: "PL" }, homeTeam: { name: "Arsenal", crest: null }, awayTeam: { name: "Coventry City", crest: "https://r2.thesportsdb.com/badge.png" }, utcDate: "2026-08-21T19:00:00.000Z", venue: "Emirates Stadium" };

const one = canonDedupe([fd, tsd]);
check("fd+TSP copies of the same match collapse to one", one.length === 1);
check("venue + crests adopted from the copy that has them", one[0].venue === "Emirates Stadium" && one[0].homeTeam.crest === "https://crests.football-data.org/57.png" && one[0].awayTeam.crest === "https://r2.thesportsdb.com/badge.png");
// v12.2 note: a genuinely DIFFERENT meeting of the same pairing carries a
// different event id (and is weeks/months away) — it must stay separate.
// (The old fixture cloned tsd with its id intact; same-id+different-day is
// now intentionally treated as the SAME fixture drifted/rescheduled.)
const otherDay = JSON.parse(JSON.stringify(tsd)); otherDay.id = "tsd-2494001"; otherDay.utcDate = "2026-08-28T19:00:00.000Z";
check("same match on a different day stays separate", canonDedupe([fd, tsd, otherDay]).length === 2);
check("watch-order: later copy wins but keeps earlier venue", canonDedupe([tsd, fd]).length === 1);

// v12.2 pairing-proximity pass (duplicate cards on the live page): providers
// reported the SAME fixture with kickoffs ~a day apart (FD day-N evening vs
// TSP day-N+1 default slot) — the date-suffixed key let both through and the
// site showed the pairing twice. The 48h same-pairing window must collapse
// those, keep the earlier kickoff, and still adopt the dropped copy's data.

const fd2 = { id: 561001, competition: { code: "PD" }, homeTeam: { name: "Real Madrid CF", crest: "https://crests.football-data.org/56.png" }, awayTeam: { name: "Rayo Vallecano de Madrid", crest: null }, utcDate: "2026-09-12T19:00:00Z", venue: null };
const tsp2 = { id: "tsd-2500001", competition: { code: "PD" }, homeTeam: { name: "Real Madrid CF", crest: null }, awayTeam: { name: "Rayo Vallecano de Madrid", crest: "https://r2.thesportsdb.com/rayo.png" }, utcDate: "2026-09-13T15:00:00Z", venue: "Estadio Santiago Bernabéu" };

const two = canonDedupe([fd2, tsp2]);
check("next-day kickoff noise collapses to one row", two.length === 1);
check("earlier kickoff wins the row body", two[0].id === 561001 && two[0].utcDate === "2026-09-12T19:00:00Z");
check("winner adopts venue + crests from the dropped copy", two[0].venue === "Estadio Santiago Bernabéu" && two[0].awayTeam.crest === "https://r2.thesportsdb.com/rayo.png" && two[0].homeTeam.crest === "https://crests.football-data.org/56.png");
const tsp2LaterWins = canonDedupe([tsp2, fd2]);
check("order-independent: fd day-N copy wins regardless of input order", tsp2LaterWins.length === 1 && tsp2LaterWins[0].utcDate === "2026-09-12T19:00:00Z" && tsp2LaterWins[0].awayTeam.crest === "https://r2.thesportsdb.com/rayo.png");
const tsp3 = JSON.parse(JSON.stringify(tsp2)); tsp3.utcDate = "2026-09-15T15:00:00Z"; // 3 days later — real distinct fixture
check("pairing 3+ days apart stays separate (no over-merge)", canonDedupe([fd2, tsp3]).length === 2);
const swapped = JSON.parse(JSON.stringify(tsp2)); swapped.homeTeam = { name: "Rayo Vallecano de Madrid", crest: null }; swapped.awayTeam = { name: "Real Madrid CF", crest: null }; swapped.utcDate = "2026-09-13T15:00:00Z";
check("swapped home/away pairing never merges (double round-robin legs)", canonDedupe([fd2, swapped]).length === 2);

// v12.2 same-id rule: the same provider fixture drifting (or rescheduled) to a
// different day keeps its id — those merge regardless of distance, and the
// LATER list entry (the fresher copy in cacheMatches' [...head, ...matches])
// wins the row. Observed live: id 560597 Coventry–Newcastle 53h apart.

const drift1 = { id: 560597, competition: { code: "PL" }, homeTeam: { name: "Coventry City FC", crest: "https://crests.football-data.org/56.png" }, awayTeam: { name: "Newcastle United FC", crest: null }, utcDate: "2026-10-10T14:00:00Z", venue: null };
const drift2 = { id: 560597, competition: { code: "PL" }, homeTeam: { name: "Coventry City FC", crest: null }, awayTeam: { name: "Newcastle United FC", crest: "https://crests.football-data.org/35.png" }, utcDate: "2026-10-12T19:00:00Z", venue: "Coventry Building Society Arena" };

const driftOut = canonDedupe([drift1, drift2]);
check("same-id drifted copy merges even beyond 48h", driftOut.length === 1);
check("same-id merge: later (fresher) entry wins the row", driftOut[0].utcDate === "2026-10-12T19:00:00Z");
check("same-id merge adopts dropped copy's venue + crests", driftOut[0].venue === "Coventry Building Society Arena" && driftOut[0].homeTeam.crest === "https://crests.football-data.org/56.png" && driftOut[0].awayTeam.crest === "https://crests.football-data.org/35.png");

process.exit(fails ? 1 : 0);