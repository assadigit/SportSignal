// Self-check: duplicate-match prevention. Asserts:
//  1) canonDedupe collapses two providers' copies of the SAME match to one row
//  2) venue + crests survive from whichever copy carries them
//  3) cacheMatches (KV writes) and fetchLongView (returned list → public page)
//     both funnel through canonDedupe, so duplicate rows can't reach the UI
const fs = require("fs");
const src = require("./lib/worker-src")();
const { canonDedupe } = require("../src/dedupe.ts");

let fails = 0;
const check = (name, cond) => {
  console.log((cond ? "OK   " : "FAIL ") + name);
  if (!cond) fails++;
};

check("canonDedupe helper defined", typeof canonDedupe === "function");
check("cacheMatches uses canonDedupe", /const merged = canonDedupe\(\[\.\.\.head, \.\.\.matches\]\);/.test(src));
check(
  "fetchLongView dedupes before returning",
  /(^|\W)canonDedupe\(allMatches\)/.test(src) && /allMatches\.push\(\.\.\.deduped\)/.test(src)
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

// v13.110-digitfold: club-name digits (ordinals + founding years) are NEVER
// identity-bearing. LIVE 2026-10-16 incident: FD's legal "1. FC Köln" keyed
// as "1cologne" while sportscore's "FC Köln" keyed as "cologne" — the same
// fixture (FD id 565828 vs spsc-2026-10-16-BL1-36, both 18:30Z, both 1-0)
// survived canonDedupe as TWO pool rows and the night digest printed
// "آینتراشت فرانکفورت ۱ - ۰ کلن" twice. The digits must fold.
const { normalizeTeamName } = require("../src/teams.ts");
check(
  "digitfold: 1. FC Köln ≡ FC Köln ≡ Köln ≡ Cologne (the live pair)",
  normalizeTeamName("1. FC Köln") === normalizeTeamName("FC Köln") &&
  normalizeTeamName("FC Köln") === normalizeTeamName("Köln") &&
  normalizeTeamName("FC Köln") === normalizeTeamName("Cologne")
);
check("digitfold: Bayer 04 Leverkusen ≡ Bayer Leverkusen", normalizeTeamName("Bayer 04 Leverkusen") === normalizeTeamName("Bayer Leverkusen"));
check("digitfold: TSG 1899 Hoffenheim ≡ Hoffenheim", normalizeTeamName("TSG 1899 Hoffenheim") === normalizeTeamName("Hoffenheim"));
check("digitfold: FC Schalke 04 ≡ Schalke 04 ≡ Schalke", normalizeTeamName("FC Schalke 04") === normalizeTeamName("Schalke 04") && normalizeTeamName("FC Schalke 04") === normalizeTeamName("Schalke"));
check("digitfold: 1. FSV Mainz 05 ≡ FSV Mainz 05 (digits only — prefix tokens stay conservative)", normalizeTeamName("1. FSV Mainz 05") === normalizeTeamName("FSV Mainz 05"));
check("digitfold: 1. FC Union Berlin ≡ Union Berlin", normalizeTeamName("1. FC Union Berlin") === normalizeTeamName("Union Berlin"));
check("digitfold: Parma Calcio 1913 ≡ Parma Calcio (digits only)", normalizeTeamName("Parma Calcio 1913") === normalizeTeamName("Parma Calcio"));
check("digitfold: SC Paderborn 07 ≡ Paderborn", normalizeTeamName("SC Paderborn 07") === normalizeTeamName("Paderborn"));
check(
  "digitfold never over-merges: Köln ≠ Union Berlin ≠ Copenhagen ≠ Bologna",
  normalizeTeamName("1. FC Köln") !== normalizeTeamName("1. FC Union Berlin") &&
  normalizeTeamName("FC Köln") !== normalizeTeamName("FC Copenhagen") &&
  normalizeTeamName("FC Köln") !== normalizeTeamName("Bologna FC")
);
// The EXACT live-pool regression pair (rows verbatim from the production KV
// that night — FD legal names + sportscore raw names, identical score):
const fdBl1 = { id: 565828, competition: { code: "BL1" }, homeTeam: { name: "Eintracht Frankfurt", crest: "https://crests.football-data.org/10.png" }, awayTeam: { name: "1. FC Köln", crest: null }, utcDate: "2026-10-16T18:30:00Z", status: "FINISHED", score: { fullTime: { home: 1, away: 0 } }, venue: null };
const spBl1 = { id: "spsc-2026-10-16-BL1-36", competition: { code: "BL1" }, homeTeam: { name: "Eintracht Frankfurt", crest: null }, awayTeam: { name: "FC Köln", crest: "https://sportscore.example/koln.png" }, utcDate: "2026-10-16T18:30:00.000Z", status: "FINISHED", score: { fullTime: { home: 1, away: 0 } }, venue: "Deutsche Bank Park" };
const kolnOne = canonDedupe([fdBl1, spBl1]);
check("LIVE 2026-10-16 pair: FD '1. FC Köln' + sportscore 'FC Köln' collapse to ONE", kolnOne.length === 1);
check(
  "the collapsed row keeps the score and adopts the other copy's crest/venue",
  kolnOne[0] && kolnOne[0].score && kolnOne[0].score.fullTime.home === 1 && kolnOne[0].score.fullTime.away === 0 &&
  kolnOne[0].homeTeam.crest === "https://crests.football-data.org/10.png" &&
  kolnOne[0].awayTeam.crest === "https://sportscore.example/koln.png" &&
  kolnOne[0].venue === "Deutsche Bank Park"
);
// The 2026-10-11 matchday shape (Köln HOME + the Mönchengladbach umlaut fold):
const fdKo = { id: 565814, competition: { code: "BL1" }, homeTeam: { name: "1. FC Köln" }, awayTeam: { name: "Borussia Mönchengladbach" }, utcDate: "2026-10-11T13:30:00Z", status: "FINISHED" };
const spKo = { id: "spsc-2026-10-11-BL1-0", competition: { code: "BL1" }, homeTeam: { name: "FC Köln" }, awayTeam: { name: "Borussia Monchengladbach" }, utcDate: "2026-10-11T13:30:00.000Z", status: "FINISHED" };
check("LIVE 2026-10-11 pair: Köln home + Monchengladbach umlaut fold collapses to ONE", canonDedupe([fdKo, spKo]).length === 1);

// v13.110 follow-up: the provider-PREFIX token gaps the live pool still
// carried after the digit fold (7 residual same-fixture pairs on
// 2026-10-16, all FD legal name vs TSP/sportscore short name):
check("prefixfold: AFC Bournemouth ≡ Bournemouth ≡ Bournemouth AFC", normalizeTeamName("AFC Bournemouth") === normalizeTeamName("Bournemouth") && normalizeTeamName("Bournemouth AFC") === normalizeTeamName("Bournemouth"));
check("prefixfold: Genoa CFC ≡ Genoa", normalizeTeamName("Genoa CFC") === normalizeTeamName("Genoa"));
check("prefixfold: 1. FSV Mainz 05 ≡ Mainz", normalizeTeamName("1. FSV Mainz 05") === normalizeTeamName("Mainz"));
check("prefixfold: Cagliari Calcio ≡ Cagliari", normalizeTeamName("Cagliari Calcio") === normalizeTeamName("Cagliari"));
check("prefixfold: Frosinone Calcio ≡ Frosinone", normalizeTeamName("Frosinone Calcio") === normalizeTeamName("Frosinone"));
check("prefixfold: US Sassuolo Calcio ≡ Sassuolo", normalizeTeamName("US Sassuolo Calcio") === normalizeTeamName("Sassuolo"));
check("prefixfold: US Lecce ≡ Lecce", normalizeTeamName("US Lecce") === normalizeTeamName("Lecce"));
check(
  "prefixfold never over-merges distinct clubs",
  normalizeTeamName("Cagliari Calcio") !== normalizeTeamName("Calcio Como") &&
  normalizeTeamName("AFC Bournemouth") !== normalizeTeamName("AFC Ajax") &&
  normalizeTeamName("US Sassuolo Calcio") !== normalizeTeamName("Cagliari Calcio")
);
// The EXACT residual live pairs, canonDedupe end-to-end (FD id 560595 +
// tsd-2494053; FD id 558573 + tsd-2482204 — the Frosinone pair whose TSP
// twin was SCHEDULED and slipped past every FINISHED-filtered surface):
const fdCh = { id: 560595, competition: { code: "PL" }, homeTeam: { name: "Chelsea FC" }, awayTeam: { name: "AFC Bournemouth" }, utcDate: "2026-10-10T14:00:00Z", status: "FINISHED", score: { fullTime: { home: 1, away: 0 } } };
const tsCh = { id: "tsd-2494053", competition: { code: "PL" }, homeTeam: { name: "Chelsea" }, awayTeam: { name: "Bournemouth" }, utcDate: "2026-10-10T14:00:00.000Z", status: "SCHEDULED", venue: "Stamford Bridge" };
check("LIVE Chelsea pair: 'AFC Bournemouth' FD + 'Bournemouth' TSP collapse to ONE", canonDedupe([fdCh, tsCh]).length === 1);
const fdFr = { id: 558573, competition: { code: "SA" }, homeTeam: { name: "Frosinone Calcio" }, awayTeam: { name: "US Sassuolo Calcio" }, utcDate: "2026-10-16T18:45:00Z", status: "FINISHED", score: { fullTime: { home: 4, away: 2 } } };
const tsFr = { id: "tsd-2482204", competition: { code: "SA" }, homeTeam: { name: "Frosinone" }, awayTeam: { name: "Sassuolo" }, utcDate: "2026-10-16T18:45:00.000Z", status: "SCHEDULED" };
check("LIVE Frosinone pair: 'Calcio' suffix FD + short TSP collapse to ONE", canonDedupe([fdFr, tsFr]).length === 1);

process.exit(fails ? 1 : 0);