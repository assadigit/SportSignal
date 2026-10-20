// Self-check: the DESIRED-TEAM PRIORITY (v13.100-priority) — the user's rule:
// "first show matches that both sides are desired teams, then one side"
// (+ the curated featured clash breaking the both-sides ties), applied to
// every report surface:
//   1) priorityTier — the ONE shared tier expression (match-classify.ts):
//      per-chat when (prefs, chatId) given, master/settings level otherwise,
//      2=both-sides followed, 1=one side, +1 featured (curated big-vs-big).
//   2) pickHeroMatch — same-kickoff ties break by the tier (the 2026-10-14
//      lesson: City–PSG vs Roma–Real both 19:00Z — pool order had handed the
//      site hero to Roma–Real and the month's marquee game never led).
//   3) uclPreviewOrder — the UCL night preview's per-chat ordering.
//   4) wiring pins: the night digest's "your teams" sort, the site's UCL
//      card sort, the fan-out's per-lang line memoization.
"use strict";
const fs = require("fs");
const path = require("path");
const src = require("./lib/worker-src")();

let fails = 0;
const check = (name, cond) => {
  console.log((cond ? "OK   " : "FAIL ") + name);
  if (!cond) fails++;
};

const untype = (s) => s.replace(/:\s*(number|string|boolean|any|Date|Map<[^>]*>)(\[\])?/g, "").replace(/\?([,)])/g, "$1");
const grab = (re) => { const m = src.match(re); return m ? untype(m[0]).replace(/\): string \{/g, ") {").replace(/\): boolean \{/g, ") {") : null; };

// The eval pieces: the full normalize chain, the master machinery, the
// per-chat follow helpers, and the new tier + hero + order expressions.
const cfgSrc = fs.readFileSync("src/config.ts", "utf8");
const teamsSrc = fs.readFileSync("src/teams.ts", "utf8");
const pieces = [
  grab(/var NORM_BASE_TOKENS = "[^"]*";/) || teamsSrc.match(/const NORM_BASE_TOKENS: string = "[^"]*";/)[0].replace("const NORM_BASE_TOKENS: string", "var NORM_BASE_TOKENS"),
  grab(/var TRANSLIT_FOLDS = \{[\s\S]*?\n\};/) || teamsSrc.match(/const TRANSLIT_FOLDS: Record<string, string> = \{[\s\S]*?\n\};/)[0].replace("const TRANSLIT_FOLDS: Record<string, string>", "var TRANSLIT_FOLDS"),
  grab(/function normTeamName\([^)]*\): string \{[\s\S]*?\n\}/),
  grab(/function normalizeTeamName\([^)]*\): string \{[\s\S]*?\n\}/),
  grab(/var TEAM_ALIASES = \{[\s\S]*?\n\};/),
  grab(/function normAlias\([^)]*\) \{[\s\S]*?\n\}/),
  grab(/function isDomesticCup\([^)]*\) \{[\s\S]*?\n\}/),
  grab(/function isQuarterFinalOrLater\([^)]*\) \{[\s\S]*?\n\}/),
  grab(/function isLiveStatus\([^)]*\) \{[\s\S]*?\n\}/),
  grab(/var BIG_MATCH_TEAMS = \[[\s\S]*?\];/),
  grab(/var BIG_MATCH_UEFA = [\s\S]*?;/),
  grab(/function isFeaturedMatch\([^)]*\) \{[\s\S]*?\n\}/),
  grab(/var masterMemo = \{[\s\S]*?\};/),
  grab(/function masterTeamList\([^)]*\) \{[\s\S]*?\n\}/),
  grab(/function userFollowsMatch\([^)]*\) \{[\s\S]*?\n\}/),
  grab(/function userFollowsSides\([^)]*\) \{[\s\S]*?\n\}/),
  grab(/function isMasterPair\([^)]*\) \{[\s\S]*?\n\}/),
  grab(/function priorityTier\([^)]*\) \{[\s\S]*?\n\}/),
  grab(/function pickHeroMatch\([^)]*\) \{[\s\S]*?\n\}/),
  grab(/function uclPreviewOrder\([^)]*\) \{[\s\S]*?\n\}/),
];
if (pieces.some((p) => !p)) {
  console.log("MISSING PIECES:", pieces.map((p, i) => [i, !!p]).filter(([i, ok]) => !ok).map(([i]) => i));
  process.exit(1);
}
// The CONFIG stub mirrors PRODUCTION (the saved admin settings add AS Roma —
// the very mutation applySettings performs, which made Roma–Real a master
// pair and produced the original bug).
const SETTINGS_TEAMS = {
  PL: ["Arsenal FC", "Chelsea FC", "Manchester United FC", "Manchester City FC", "Liverpool FC", "Tottenham Hotspur FC"],
  PD: ["FC Barcelona", "Real Madrid CF", "Club Atlético de Madrid"],
  SA: ["FC Internazionale Milano", "AC Milan", "Juventus FC", "AS Roma"],
  FL1: ["Paris Saint-Germain FC"],
  BL1: ["FC Bayern München", "Borussia Dortmund"]
};
const ctx = eval("(() => { " + pieces.join("\n") + "; var BIG_TEAMS_BY_LEAGUE = " + JSON.stringify(SETTINGS_TEAMS) + "; var CONFIG = { BIG_TEAMS_BY_LEAGUE: BIG_TEAMS_BY_LEAGUE, __teamNorm: null, LATE_STAGES: [\"QUARTER_FINALS\",\"QUARTER_FINAL\",\"SEMI_FINALS\",\"SEMI_FINAL\",\"FINAL\",\"THIRD_PLACE\"], DOMESTIC_CUP_IDS: { FA_CUP: 1, EFL_CUP: 1, CDR: 1, COPPA_ITALIA: 1, DFB_POKAL: 1 } }; return { priorityTier, pickHeroMatch, uclPreviewOrder, isFeaturedMatch, isMasterPair, masterTeamList }; })()");

const mk = (h, a, ko, status) => ({ homeTeam: { name: h }, awayTeam: { name: a }, utcDate: ko, status: status || "TIMED", competition: { code: "CL" } });
// v13.102: DYNAMIC kickoffs (now-anchored) — the original fixed 2026-10-14
// dates were a time bomb: the suite's "future" fixtures stopped being future
// the moment the real clock crossed 19:00Z on 2026-10-14 and the hero checks
// flipped red with zero code changes. Ordering logic is date-independent.
const isoIn = (h) => new Date(Date.now() + h * 36e5).toISOString();
const KO1 = isoIn(1.5);
const KO2 = isoIn(3);

// ===== 1) priorityTier — the ONE expression =====
console.log("\n=== 1. priorityTier (master level, production-shaped settings) ===");
check("tier: both-sides followed = 2 (Roma–Real with settings)", ctx.priorityTier(mk("AS Roma", "Real Madrid CF", KO2)) === 2);
check("tier: both-sides followed + featured = 3 (City–PSG)", ctx.priorityTier(mk("Manchester City FC", "Paris Saint-Germain FC", KO2)) === 3);
check("tier: one side = 1 (LASK–Liverpool)", ctx.priorityTier(mk("LASK Linz", "Liverpool FC", KO1)) === 1);
check("tier: neither = 0 (Feyenoord–Como)", ctx.priorityTier(mk("Feyenoord Rotterdam", "Como 1907", KO1)) === 0);
check("tier: featured pair nobody follows = 1 (curated marquee still ranks)", ctx.priorityTier({ homeTeam: { name: "Melbourne Victory" }, awayTeam: { name: "Sydney FC" }, utcDate: KO2, status: "TIMED", competition: { code: "PL" } }) === 1);
console.log("\n=== 2. priorityTier (per-chat prefs) ===");
const prefs = {
  "111": { teams: ["Manchester City FC", "Paris Saint-Germain FC", "Liverpool FC"] }, // explicit desired teams
  "222": { teams: [] } // falls back to the master list
};
check("tier per-chat: both explicit + featured = 3 (City–PSG, chat 111)", ctx.priorityTier(mk("Manchester City FC", "Paris Saint-Germain FC", KO2), prefs, "111") === 3);
check("tier per-chat: one explicit side = 1 (LASK–Liverpool, chat 111)", ctx.priorityTier(mk("LASK Linz", "Liverpool FC", KO1), prefs, "111") === 1);
check("tier per-chat: neither explicit = 0 (Roma–Real, chat 111)", ctx.priorityTier(mk("AS Roma", "Real Madrid CF", KO2), prefs, "111") === 0);
check("tier per-chat: master fallback for empty teams (Roma–Real, chat 222) = 2", ctx.priorityTier(mk("AS Roma", "Real Madrid CF", KO2), prefs, "222") === 2);

// ===== 3) pickHeroMatch — the same-kickoff tie-break =====
console.log("\n=== 3. pickHeroMatch (the 2026-10-14 hero lesson) ===");
{
  const romaReal = mk("AS Roma", "Real Madrid CF", KO2);
  const cityPsg = mk("Manchester City FC", "Paris Saint-Germain FC", KO2);
  check("hero: same kickoff — featured City–PSG beats master-only Roma–Real (pool order Roma first)", ctx.pickHeroMatch([romaReal, cityPsg]) === cityPsg);
  check("hero: same kickoff — order-independent (City first input too)", ctx.pickHeroMatch([cityPsg, romaReal]) === cityPsg);
  const cityPsgLater = mk("Manchester City FC", "Paris Saint-Germain FC", isoIn(5));
  check("hero: kickoff still dominates (earlier master pair beats later featured)", ctx.pickHeroMatch([romaReal, cityPsgLater]) === romaReal);
  const romaRealLive = mk("AS Roma", "Real Madrid CF", KO2, "IN_PLAY");
  // v13.153-heronext: the hero NEVER shows the rolling ball (the owner's
  // directive: "do not show the current result in hero; just show the next
  // good match, next hour or next day") — live entries are excluded, the
  // pick rolls to the next FUTURE hero-worthy kickoff.
  check("hero: LIVE never heroes (v13.153-heronext — rolls to the next future match)", ctx.pickHeroMatch([cityPsg, romaRealLive]) === cityPsg);
  const romaRealPaused = mk("AS Roma", "Real Madrid CF", KO2, "PAUSED");
  check("hero: PAUSED never heroes either (every live status is excluded)", ctx.pickHeroMatch([cityPsg, romaRealPaused]) === cityPsg);
  const cityPsgDone = mk("Manchester City FC", "Paris Saint-Germain FC", KO2, "FINISHED");
  check("hero: FINISHED never heroes (falls to the next one)", ctx.pickHeroMatch([cityPsgDone, romaReal]) === romaReal);
  check("hero: nothing hero-worthy => null (no arbitrary fallback)", ctx.pickHeroMatch([mk("Feyenoord Rotterdam", "Como 1907", KO1)]) === null);
}

// ===== 4) uclPreviewOrder — the per-chat preview ordering =====
console.log("\n=== 4. uclPreviewOrder (the user's exact ask) ===");
{
  // Tonight's real 9-game slate (2026-10-14), kickoff order as the pool
  // carries it — City–PSG LAST (the exact complaint).
  const slate = [
    mk("LASK Linz", "Liverpool FC", KO1),
    mk("Feyenoord Rotterdam", "Como 1907", KO1),
    mk("Real Betis Balompié", "FC Porto", KO2),
    mk("AS Roma", "Real Madrid CF", KO2),
    mk("ŠK Slovan Bratislava", "VfB Stuttgart", KO2),
    mk("FK Bodø/Glimt", "Borussia Dortmund", KO2),
    mk("Aston Villa FC", "Fenerbahçe SK", KO2),
    mk("FK Shakhtar Donetsk", "PAE AEK", KO2),
    mk("Manchester City FC", "Paris Saint-Germain FC", KO2)
  ];
  const ordered = ctx.uclPreviewOrder(slate, prefs, "111");
  const name = (m) => m.homeTeam.name;
  check("preview order: City–PSG leads for a City+PSG+Liverpool chat", name(ordered[0]) === "Manchester City FC");
  check("preview order: then the one-side Liverpool game (20:15)", name(ordered[1]) === "LASK Linz");
  check("preview order: then the unfollowed rest by kickoff (Feyenoord 16:45 first)", name(ordered[2]) === "Feyenoord Rotterdam");
  check("preview order: all 9 present (no drops)", ordered.length === 9);
  check("preview order: input array NOT mutated (shared across chats)", name(slate[8]) === "Manchester City FC" && name(slate[0]) === "LASK Linz");
  // The master-fallback chat (no explicit teams): Roma–Real is both-sides
  // (settings) and City–PSG is both+featured — City first, Roma second.
  const ordered222 = ctx.uclPreviewOrder(slate, prefs, "222");
  check("preview order (master fallback): City–PSG first, Roma–Real second", name(ordered222[0]) === "Manchester City FC" && name(ordered222[1]) === "AS Roma");
  check("preview order (master fallback): then the one-side games by kickoff", name(ordered222[2]) === "LASK Linz" && name(ordered222[3]) === "FK Bodø/Glimt");
}

// ===== 5) wiring pins on the real sources =====
console.log("\n=== 5. wiring pins (real source) ===");
const nightSrc = fs.readFileSync("src/digest-night.ts", "utf8");
const uclSrc = fs.readFileSync("src/digest-uclnight.ts", "utf8");
const pubSrc = fs.readFileSync("src/public-matches.ts", "utf8");
const clsSrc = fs.readFileSync("src/match-classify.ts", "utf8");

check("wiring: night digest 'your teams' sorts by per-chat tier first", /mine\.sort\(\(a, b\) => priorityTier\(b, prefs, chatId\) - priorityTier\(a, prefs, chatId\) \|\| new Date\(a\.utcDate\)\.getTime\(\) - new Date\(b\.utcDate\)\.getTime\(\)\)/.test(nightSrc));
check("wiring: preview fan-out orders per chat (uclPreviewOrder(ucl, prefs, c))", /uclPreviewOrder\(ucl, prefs, c\)/.test(uclSrc));
check("wiring: preview lines memoized once per match per lang (lineFor cache)", /const lineCache = new Map\(\); \/\/ lang -> Map\(matchKey -> line\)/.test(uclSrc) && /line = uclPreviewLine\(envTz, mt, lang\)/.test(uclSrc));
check("wiring: the shared per-lang message cache is GONE (per-chat bodies now)", !/msgByLang/.test(uclSrc));
check("wiring: preview imports the shared tier (no private re-implementation)", /import \{ priorityTier \} from "\.\/match-classify";/.test(uclSrc));
check("wiring: site UCL card sorts live-first, then tier, then kickoff", /const clBox = clMatches\.filter\(\(m\) => hasSelectedTeam\(m\)\)\.sort\(\(a, b\) => \(isLiveStatus\(a\.status\) \? 0 : 1\) - \(isLiveStatus\(b\.status\) \? 0 : 1\) \|\| priorityTier\(b\) - priorityTier\(a\) \|\| new Date\(a\.utcDate\)\.getTime\(\) - new Date\(b\.utcDate\)\.getTime\(\)\)\.slice\(0, 8\)/.test(pubSrc));
check("wiring: priorityTier reads per-chat teams via userFollowsSides", /const s = userFollowsSides\(prefs, chatId, match\);/.test(clsSrc));
check("wiring: priorityTier exported from match-classify (one definition)", /export function priorityTier\(match, prefs\?, chatId\?\)/.test(clsSrc));

console.log(fails ? `\n${fails} FAIL` : "\nAll priority checks passed");
process.exit(fails ? 1 : 0);
