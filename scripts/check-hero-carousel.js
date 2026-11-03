// check-hero-carousel.js — v13.194-herocarousel: the hero CAROUSEL gate
// (SPORTSIGNAL_HERO_CAROUSEL_SPEC.md section 18).
//
// Part 1 SELECTION (behavioral, injected `now` — no wall-clock dependence):
// the pickHeroMatches slate contract: eligibility (pair-only, future, never
//   live/paused/finished, invalid dates out), the ONE 8-hour anchor window
//   (no chained windows, inclusive boundary), the six-slide cap with the
//   priorityTier ranking + deterministic identity tie-break, the
//   primary-first-then-chronological slide order, and the re-anchor when
//   the earliest slate member starts.
// Part 2 PAYLOAD + SSR + DEDUPE (source contracts): public-matches.ts ships
//   heroMatches + the nextBig alias and excludes the SELECTED six from the
//   secondary lists (overflow stays); applyLiveOverlay patches the slate
//   rows; the SSR router paints slide 1 into BOTH cards and the box slice
//   drops its first-row skip; the page carries the control bar + region.
// Part 3 CLIENT CONTROLLER (behavioral on the eval'd CAR module from the
//   live bundle, with a minimal DOM stub): slate build (heroMatches vs the
//   legacy nextBig fallback vs the EMPTY-array-is-really-empty rule), the
//   44px-threshold swipe gate, wrap-around, and (v13.195-carsides) the
//   PHYSICAL side arrows with direction-aware action + labels.
"use strict";
const fs = require("fs");
const path = require("path");
const src = require("./lib/worker-src")();

let fails = 0;
const check = (name, cond) => {
  console.log((cond ? "OK   " : "FAIL ") + name);
  if (!cond) fails++;
};
const read = (p) => fs.readFileSync(path.join(__dirname, "..", p), "utf8");

const untype = (s) => s.replace(/:\s*(number|string|boolean|any|Date|Map<[^>]*>)(\[\])?/g, "").replace(/\?([,)])/g, "$1");
const grab = (re) => { const m = src.match(re); return m ? untype(m[0]).replace(/\): string \{/g, ") {").replace(/\): boolean \{/g, ") {") : null; };

// The eval pieces: the check-priority set + the slate trio.
const teamsSrc = read("src/teams.ts");
const slugsSrc = read("src/slugs.ts");
const stripRec = (x) => String(x).replace(/: Record<string, string>/g, "");
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
  stripRec(slugsSrc.match(/export const TEAM_SLUGS[^=]*= \{[\s\S]*?\n\};/)[0].replace("export const", "var")),
  slugsSrc.match(/const STRICT_STRIP = new Set\(\[[\s\S]*?\]\);/)[0],
  slugsSrc.match(/export function teamSlug\([^)]*\) \{[\s\S]*?\n\}/)[0].replace("export ", ""),
  slugsSrc.match(/export function matchPath\([^)]*\) \{[\s\S]*?\n\}/)[0].replace("export ", ""),
  grab(/function heroMatchIdentity\([^)]*\) \{[\s\S]*?\n\}/),
  grab(/function pickHeroMatches\([^)]*\) \{[\s\S]*?\n\}/),
  grab(/function pickHeroMatch\([^)]*\) \{[\s\S]*?\n\}/),
];
if (pieces.some((p) => !p)) {
  console.log("MISSING PIECES:", pieces.map((p, i) => [i, !!p]).filter(([i, ok]) => !ok).map(([i]) => i));
  process.exit(1);
}

// The master-team settings mirror PRODUCTION (check-priority's stub: AS Roma
// is settings-added, the very mutation that made Roma-Real a master pair).
const SETTINGS_TEAMS = {
  PL: ["Arsenal FC", "Chelsea FC", "Manchester United FC", "Manchester City FC", "Liverpool FC", "Tottenham Hotspur FC"],
  PD: ["FC Barcelona", "Real Madrid CF", "Club Atlético de Madrid"],
  SA: ["FC Internazionale Milano", "AC Milan", "Juventus FC", "AS Roma"],
  FL1: ["Paris Saint-Germain FC"],
  BL1: ["FC Bayern München", "Borussia Dortmund"]
};
const ctx = eval("(() => { " + pieces.join("\n") + "; var BIG_TEAMS_BY_LEAGUE = " + JSON.stringify(SETTINGS_TEAMS) + "; var CONFIG = { BIG_TEAMS_BY_LEAGUE: BIG_TEAMS_BY_LEAGUE, __teamNorm: null, LATE_STAGES: [\"QUARTER_FINALS\",\"QUARTER_FINAL\",\"SEMI_FINALS\",\"FINAL\",\"THIRD_PLACE\"], DOMESTIC_CUP_IDS: { FA_CUP: 1, EFL_CUP: 1, CDR: 1, COPPA_ITALIA: 1, DFB_POKAL: 1 } }; return { priorityTier, pickHeroMatch, pickHeroMatches, isFeaturedMatch, isMasterPair }; })()");

// ---- fixtures: a fixed epoch (injected now) + real team names ----
const NOW = Date.parse("2026-11-05T12:00:00.000Z");
const at = (min) => new Date(NOW + min * 6e4).toISOString();
const mk = (h, a, koMin, status, code) => ({
  homeTeam: { name: h }, awayTeam: { name: a },
  utcDate: koMin == null ? null : at(koMin),
  status: status || "TIMED",
  competition: { code: code || "CL" }
});
const name = (m) => m.homeTeam.name + " v " + m.awayTeam.name;
const names = (list) => list.map(name).join(" | ");

console.log("\n=== 1. pickHeroMatches — the spec section 18 selection scenarios ===");

// 1. two ACE matches with identical kickoff: both included, one per slide
{
  const a = mk("Liverpool FC", "Real Madrid CF", 90); // featured + master = tier 3
  const b = mk("Tottenham Hotspur FC", "Chelsea FC", 90, "TIMED", "PL"); // master-only = tier 2
  const out = ctx.pickHeroMatches([a, b], NOW);
  check("S1 identical kickoff: both included (one match per slide)", out.length === 2 && out.includes(a) && out.includes(b));
  check("S1 the higher tier (Liverpool-Real, featured+master) leads", out[0] === a);
}

// 2. ACE matches 90 minutes apart: both included
{
  const out = ctx.pickHeroMatches([mk("Liverpool FC", "Real Madrid CF", 90), mk("Manchester City FC", "FC Barcelona", 180)], NOW);
  check("S2 90 minutes apart: both included", out.length === 2);
}

// 3. 90m1s apart: still included (the 90-minute band is NOT the limit)
{
  const out = ctx.pickHeroMatches([mk("Liverpool FC", "Real Madrid CF", 90), mk("Manchester City FC", "FC Barcelona", 180.017)], NOW);
  check("S3 90m+1s apart: both still included (the 8h slate governs)", out.length === 2);
}

// 4. 16:00 and 23:30 (7h30 apart): both included
{
  const out = ctx.pickHeroMatches([mk("Arsenal FC", "Chelsea FC", 10), mk("FC Bayern München", "Borussia Dortmund", 460, "TIMED", "BL1")], NOW);
  check("S4 the 16:00/23:30 example (7h30 span): both included", out.length === 2);
}

// 5. exactly 8 hours apart: both included (inclusive boundary)
{
  const out = ctx.pickHeroMatches([mk("Arsenal FC", "Chelsea FC", 10), mk("FC Bayern München", "Borussia Dortmund", 490, "TIMED", "BL1")], NOW);
  check("S5 exactly 8h apart: both included (inclusive)", out.length === 2);
}

// 6. 8h+1min after the anchor: excluded from THIS slate
{
  const out = ctx.pickHeroMatches([mk("Arsenal FC", "Chelsea FC", 10), mk("FC Bayern München", "Borussia Dortmund", 491, "TIMED", "BL1")], NOW);
  check("S6 8h01 after the anchor: excluded from the current slate", out.length === 1 && out[0].homeTeam.name === "Arsenal FC");
}

// 7. a chain cannot extend the slate past 8h from its anchor
{
  // anchor first, then +7h, then +8h30 — the third is OUTSIDE the original
  // envelope: a chain of fixtures never re-anchors the window.
  const chain = [mk("Arsenal FC", "Chelsea FC", 10), mk("Liverpool FC", "Real Madrid CF", 430), mk("Manchester City FC", "FC Barcelona", 520)];
  const out = ctx.pickHeroMatches(chain, NOW);
  check("S7 no chained windows: the 8h30 straggler stays out", out.length === 2);
}

// 8. a non-ACE match between two qualifiers never enters
{
  const filler = mk("LASK Linz", "Liverpool FC", 60); // one side only — NOT a pair
  const out = ctx.pickHeroMatches([mk("Arsenal FC", "Chelsea FC", 10), filler, mk("Liverpool FC", "Real Madrid CF", 120)], NOW);
  check("S8 a one-selected-team fixture between qualifiers is excluded", out.length === 2 && !out.includes(filler));
}

// 9. selected-vs-top5 shape does not qualify either (same rule)
{
  const sv = mk("Liverpool FC", "Everton FC", 60, "TIMED", "PL"); // Everton: neither master nor curated here
  const out = ctx.pickHeroMatches([mk("Arsenal FC", "Chelsea FC", 10), sv], NOW);
  check("S9 one-desired vs ordinary opponent: never a slide", out.length === 1 && !out.includes(sv));
}

// 10. live / paused / finished / past-kickoff candidates excluded
{
  const live = mk("Arsenal FC", "Chelsea FC", -30, "IN_PLAY");
  const paused = mk("Liverpool FC", "Real Madrid CF", -35, "PAUSED");
  const fin = mk("Manchester City FC", "FC Barcelona", -95, "FINISHED");
  const past = mk("FC Bayern München", "Borussia Dortmund", -1, "TIMED", "BL1");
  const ok = mk("FC Internazionale Milano", "AC Milan", 30, "TIMED", "SA");
  const out = ctx.pickHeroMatches([live, paused, fin, past, ok], NOW);
  check("S10 LIVE/PAUSED/FINISHED/past-kickoff never slate; the future one does", out.length === 1 && out[0] === ok);
}

// 11. invalid / missing kickoff dates are safely excluded
{
  const bad1 = mk("Arsenal FC", "Chelsea FC", null);
  const bad2 = mk("Liverpool FC", "Real Madrid CF", 90);
  bad2.utcDate = "not-a-date";
  const ok = mk("Manchester City FC", "FC Barcelona", 30);
  const out = ctx.pickHeroMatches([bad1, bad2, ok], NOW);
  check("S11 invalid/missing utcDate rows never slate (no NaN anchor)", out.length === 1 && out[0] === ok);
}

// 12. the highest-priority match is slide 1 even when it kicks off later
{
  const early = mk("AS Roma", "Juventus FC", 30, "TIMED", "SA"); // master pair, tier 2
  const late = mk("Manchester City FC", "Paris Saint-Germain FC", 300); // featured+master, tier 3
  const out = ctx.pickHeroMatches([early, late], NOW);
  check("S12 the highest-priority match leads even with a later kickoff", out.length === 2 && out[0] === late);
  check("S12 the rest follow chronological order", out[1] === early);
}

// 13. slides 2+ are chronological (kickoff asc), tier breaking equal kickoffs
{
  const a = mk("Tottenham Hotspur FC", "Chelsea FC", 60, "TIMED", "PL");   // master-only tier 2
  const b = mk("AS Roma", "Juventus FC", 120, "TIMED", "SA");              // master-only tier 2
  const c = mk("Manchester City FC", "FC Barcelona", 240);                  // featured+master tier 3
  const d = mk("Tottenham Hotspur FC", "Liverpool FC", 240, "TIMED", "PL"); // master-only tier 2, same kickoff as c
  const out = ctx.pickHeroMatches([a, b, c, d], NOW);
  check("S13 slide 1 = highest tier (City-Barcelona)", out[0] === c);
  check("S13 slides 2+ chronological with the tier tie-break at equal kickoff", names(out.slice(1)) === names([a, b, d]));
}

// 14. equal priority + equal kickoff: deterministic by canonical identity
{
  const x = mk("Arsenal FC", "Chelsea FC", 60);
  const y = mk("Liverpool FC", "Real Madrid CF", 60);
  const p = ctx.pickHeroMatches([x, y], NOW);
  const q = ctx.pickHeroMatches([y, x], NOW);
  check("S14 equal tier+kickoff: provider input order never decides", names(p) === names(q));
}

// 15. more than six eligible candidates: exactly six, strongest kept
{
  const cands = [];
  for (let i = 0; i < 8; i++) cands.push(mk("Arsenal FC", "Chelsea FC", 60 + i * 30, i === 0 ? "TIMED" : "TIMED", "CL"));
  // same pairing 8x would collapse identity-wise in real life; use distinct pairings
  const pairs = [
    ["Arsenal FC", "Chelsea FC"], ["Liverpool FC", "Real Madrid CF"], ["Manchester City FC", "FC Barcelona"],
    ["FC Bayern München", "Borussia Dortmund"], ["FC Internazionale Milano", "AC Milan"], ["Manchester United FC", "Tottenham Hotspur FC"],
    ["AS Roma", "Juventus FC"], ["Paris Saint-Germain FC", "Marseille"]
  ];
  const list = pairs.map((p2, i) => mk(p2[0], p2[1], 60 + i * 30, "TIMED", "CL"));
  const out = ctx.pickHeroMatches(list, NOW);
  check("S15 >6 candidates: never more than six slides", out.length === 6);
  // Arsenal-Chelsea (featured, tier 3) must survive the cap; the LAST
  // chronological pair (PSG-Marseille, tier 2, latest) is the first cut.
  check("S15 the cap keeps the strongest (featured Arsenal-Chelsea in)", out.some((m) => m.homeTeam.name === "Arsenal FC"));
  check("S15 the overflow pair is NOT selected (stays in the secondary lists)", !out.some((m) => m.homeTeam.name === "Paris Saint-Germain FC"));
}

// 16. the anchor re-anchors when the earliest match starts
{
  const a = mk("Arsenal FC", "Chelsea FC", 0);   // the original anchor
  const b = mk("Liverpool FC", "Real Madrid CF", 450); // 7h30 after a
  const c = mk("Manchester City FC", "FC Barcelona", 510); // 8h30 after a — outside
  const before = ctx.pickHeroMatches([a, b, c], NOW);
  check("S16a before: the 8h30 fixture is outside the a-anchored slate", before.length === 2);
  // +16 minutes: a has kicked off (excluded) — b becomes the anchor, c is
  // now only 1h after it: the slate re-anchors and c enters.
  const after = ctx.pickHeroMatches([a, b, c], NOW + 16 * 6e4);
  check("S16b after the anchor starts: the slate re-anchors on the next earliest", after.length === 2 && after.includes(b) && after.includes(c));
}

// 17. the pickHeroMatch compatibility wrapper = the slate primary
{
  const a = mk("AS Roma", "Lazio", 30, "TIMED", "SA");
  const b = mk("Manchester City FC", "Paris Saint-Germain FC", 300);
  check("S17 pickHeroMatch returns pickHeroMatches()[0] (the /featured lead)", ctx.pickHeroMatch([a, b]) === ctx.pickHeroMatches([a, b])[0]);
  check("S17 nothing eligible => null (no arbitrary fallback)", ctx.pickHeroMatch([mk("LASK Linz", "Liverpool FC", 60)]) === null);
}

console.log("\n=== 2. payload / SSR / dedupe contracts (source) ===");
const pmSrc = read("src/public-matches.ts");
const routerSrc = read("src/seo/router.ts");
const publicSrc = read("src/pages/public.ts");
const js61 = read("assets/public-13.64.js"); // v13.200-carsmooth: the bundle read follows the rename (the cross-slide choreography); was 13.63 since v13.199-mcspace: the read follows the rename (the variable name stays js61 — the historical pin idiom); 13.63 since v13.199-mcspace (the renderMCard FA-kickoff faNum edit), 13.62 since v13.197-mcdesktop
const core16 = read("assets/core-13.16.js");
const css76 = read("assets/public-13.77.css"); // v13.200-carsmooth: the stylesheet read follows the rename (the cross-slide keyframes + the sheen)

check("P1 public-matches builds heroMatches from the shared selector", /const heroList = pickHeroMatches\(matches\);/.test(pmSrc) && /const heroMatches = heroList\.map\(pubMatch\);/.test(pmSrc));
check("P1 nextBig is the heroMatches[0] compatibility alias", /const nextBig = heroMatches\[0\] \|\| null;/.test(pmSrc));
check("P1 the payload carries heroMatches", /heroMatches, nextBig, topSpot:/.test(pmSrc));
check("P2 applyLiveOverlay patches every heroMatches row", /if \(Array\.isArray\(data\.heroMatches\)\) data\.heroMatches\.forEach\(\(m\) => patch\(m\)\);/.test(pmSrc));
check("P3 the SELECTED six leave `upcoming` (no duplicate cards)", /upcoming: upcoming\.filter\(\(m\) => !topSpotKeys\.has\(String\(m\.id \|\| ""\) \+ "\|" \+ m\.utcDate\) && !heroKeys\.has\(String\(m\.id \|\| ""\) \+ "\|" \+ m\.utcDate\)\)\.map\(withTop\)/.test(pmSrc));
check("P3 the SELECTED six leave the topSpot box (addBox heroKeys gate)", /if \(topSpotKeys\.has\(k\) \|\| heroKeys\.has\(k\) \|\| topSpotPicked\.length >= 11\) return;/.test(pmSrc));
check("P3 the SELECTED six leave the UCL card (clBox)", /hasSelectedTeam\(m\) && !heroKeys\.has\(/.test(pmSrc));
check("P3 the SELECTED six leave the week lists", /thisWeek = matches\.filter\(\(m\) => \(shouldReport\(m\) \|\| isTopTeamInvolved\(m\)\) && !heroKeys\.has\(/.test(pmSrc) && /nextWeek = matches\.filter\(\(m\) => \(shouldReport\(m\) \|\| isTopTeamInvolved\(m\)\) && !heroKeys\.has\(/.test(pmSrc));
check("P3 the hero slate is declared BEFORE addBox consumes heroKeys (no TDZ)", pmSrc.indexOf("const heroKeys = new Set") < pmSrc.indexOf("const addBox = (m) =>"));
check("P4 SSR router paints slide 1 (heroMatches[0], nextBig alias fallback)", /const heroRow = \(Array\.isArray\(p\.heroMatches\) && p\.heroMatches\.length \? p\.heroMatches\[0\] : p\.nextBig\) \|\| null;/.test(routerSrc));
check("P4 SSR router feeds BOTH cards from the SAME hero row", /const heroHtml = nextBig \? M\.heroCardHtml\(nextBig\) : "";/.test(routerSrc) && /const mheroHtml = nextBig \? M\.mcardHtml\(nextBig\) : "";/.test(routerSrc));
check("P4 the topSpot SSR slice drops the retired first-row skip (hero now server-excluded)", /\.slice\(0, 10\);/.test(routerSrc) && !/\.slice\(1, 11\)/.test(routerSrc));
check("P5 the page carries the carousel region + control bar", /id="heroCarRegion" role="region" aria-roledescription="carousel"/.test(publicSrc) && /id="heroCar"/.test(publicSrc) && /id="carLeft"/.test(publicSrc) && /id="carRight"/.test(publicSrc) && /id="carDots"/.test(publicSrc) && /id="carCount"/.test(publicSrc) && /id="carSr"/.test(publicSrc));
check("P5 the play/pause control is RETIRED (owner: redundant)", !/id="carPlay"/.test(publicSrc) && !/carPlaySync/.test(js61) && !/userPaused/.test(js61) && !/CAR\.rmPlay/.test(js61));
check("P5 the arrows flank the players at the card's vertical centre", /\.hero-cards\{position:relative\}/.test(css76) && /#carLeft\{left:6px\}/.test(css76) && /#carRight\{right:6px\}/.test(css76) && /\.car-side\{[^}]*top:50%;transform:translateY\(-50%\)/.test(css76));
check("P5 controls live OUTSIDE the card anchors (no nested interactives)", publicSrc.indexOf('id="heroMCard"') < publicSrc.indexOf('id="carLeft"') && /<\/a>\n<!-- v13\.195-carsides \(owner: "the buttons are too big/.test(publicSrc) && /<div class="hero-cards">/.test(publicSrc) && publicSrc.indexOf('class="hero-cards">') < publicSrc.indexOf('id="bigHeroCard"'));
check("P5 the control bar is display:none by default (no dead no-JS controls)", /\.hero-car\{display:none/.test(css76) && /\.hero-car\.on\{display:flex/.test(css76));
check("P5 single-slide heroes keep the plain card (controls only at 2+)", /var on2=n>1;bar\.classList\.toggle\("on",on2\);sl&&sl\.classList\.toggle\("on",on2\);sr&&sr\.classList\.toggle\("on",on2\)/.test(js61));
check("P5 dots keep a 44x44 hit area; the side arrows are the owner's SMALLER 38px", /\.car-dot\{[^}]*width:44px;height:44px/.test(css76) && /\.car-side\{[^}]*width:38px;height:38px/.test(css76) && /@media \(max-width:899px\)\{\n  \.car-side\{width:34px;height:34px/.test(css76));
check("P5 the transition is the v13.200-carsmooth CROSS-SLIDE (owner: \u201cThe sliding carousel of concurrent matches are not smooth I want a smooth, a little delayed and exciting sliding animation\u201d) — the ghost exit + the staggered springy enter + the sheen, transform+opacity only, frames never move", /#heroSpot,#mcardSpot\{position:absolute;inset:0\}/.test(css76) && /\.car-ghost\{pointer-events:none;animation:car-exit \.42s cubic-bezier\(\.5,\.08,\.75,\.4\) both\}/.test(css76) && /@keyframes car-exit\{0%\{opacity:1;transform:none\}55%\{opacity:\.82\}100%\{opacity:0;transform:translateX\(calc\(var\(--car-dx,120px\) \* var\(--car-k,1\)\)\)\}\}/.test(css76) && /#heroSpot\.car-in,#mcardSpot\.car-in\{animation:car-enter \.64s cubic-bezier\(\.3,\.6,\.3,1\) \.11s both\}/.test(css76) && /\.hero-player\.player-away\.car-in\{animation-delay:\.06s\}/.test(css76) && /@keyframes car-enter\{0%\{opacity:0;transform:translateX\(calc\(var\(--car-dx,120px\) \* -1 \* var\(--car-k,1\)\)\) scale\(\.985\);animation-timing-function:cubic-bezier\(\.19,\.86,\.3,1\.045\)\}42%\{opacity:\.92\}100%\{opacity:1;transform:none\}\}/.test(css76) && /\.car-sheen\.run::after\{animation:car-sheen \.9s cubic-bezier\(\.36,\.18,\.24,1\) both\}/.test(css76) && /function carGhost\(dir\)\{try\{if\(carNoMotion\(\)\)return;var dx=carDx\(dir\);carLanes\(\)\.forEach/.test(js61) && /function carEnter\(dir\)\{try\{var dx=carDx\(dir\);carLanes\(\)\.forEach/.test(js61) && /function carSheen\(dir\)\{try\{var sh=document\.querySelector\("\.hero-cards \.car-sheen"\);if\(!sh\)return;var fwd=carDx\(dir\)>0/.test(js61) && /if\(fade\)\{carGhost\(dir\|\|1\);carSheen\(dir\|\|1\)\}renderHeroSpot\(\);updateBigBar\(\);try\{fitHeroNames\(\);fitMcNames\(\)\}catch\(x\)\{\}carSync\(\);if\(fade\)carEnter\(dir\|\|1\)\}/.test(js61) && /setProperty\("--car-dx",dx\+"px"\)/.test(js61) && /setProperty\("--car-k",L\.k\)/.test(js61));
check("P6 the i18n keys exist in BOTH dictionaries", ["carRegion", "carPrev", "carNext", "carPause", "carPlay", "carSlide", "carOf"].every((k) => new RegExp(k + ':"[^"]+"').test(core16.split("en:{")[0])) && ["carRegion", "carPrev", "carNext", "carPause", "carPlay", "carSlide", "carOf"].every((k) => new RegExp(k + ':"[^"]+"').test(core16.split("en:{")[1])));
check("P6 the client reads the slate (never rebuilds ACE from team lists)", /function carBuild\(\)\{var t=DATA\|\|\{\},rows=Array\.isArray\(t\.heroMatches\)\?t\.heroMatches:/.test(js61));
check("P6 barTarget serves the ACTIVE slide to every hero consumer", /var __c=carActive\(\);if\(__c\)return\{m:__c,big:!!__c\.big\};/.test(js61));
check("P6 reconciliation preserves the active slide by canonical href", /keep=carHref\(CAR\.list\[CAR\.idx\]\)/.test(js61) && /if\(keep\)for\(i=0;i<nl\.length;i\+\+\)if\(carHref\(nl\[i\]\)===keep\)\{ni=i;break\}/.test(js61));
check("P6 the 1s sweep drops started matches (the Live section owns them)", /function carRollTick\(\)/.test(js61) && /updateBigBar\(\)\{carRollTick\(\);/.test(js61));
check("P6 rotation is 6s + wrap + manual reset", /carGo\(CAR\.idx\+1,!1\)\},6e3\)/.test(js61) && /i=\(\(i%n\)\+n\)%n/.test(js61) && /if\(manual\)\{carAnnounce\(\);carArm\(\)\}/.test(js61));
check("P6 autoplay is DEFAULT-ON (owner round 2: \"Auto slide is not default on make it on\"): only the hidden tab pauses — the hover/focus/reduced-motion gates are RETIRED (a cursor over the hero or a focused arrow froze the rotation invisibly)", /function carPlayAllowed\(\)\{return CAR\.list\.length>1&&!CAR\.docHidden\}/.test(js61) && !/hoverPause/.test(js61) && !/focusPause/.test(js61) && !/CAR\.rm/.test(js61) && !/canHover/.test(js61) && !/rmq\./.test(js61) && /document\.addEventListener\("visibilitychange"/.test(js61));
check("P6 ALL slides' art warms when the slate is built (owner round 2: the first manual slide left the previous players painted — a cold src swap keeps the old bitmap)", /function carWarm\(/.test(js61) && /var pk=CAR\.list\.map\(carHref\)\.join\("\|"\);/.test(js61) && /nl\.map\(carHref\)\.join\("\|"\)\!==pk&&carWarm\(nl\)/.test(js61) && !/carPreload/.test(js61) && /DOMContentLoaded",function\(\)\{carWarm\(\)\}/.test(js61));
check("P6 the portrait swap is READY-GATED (hide at swap, fade in on decode — the wrong club's bitmap is never painted under the new names) with the reveal handlers attached BEFORE src (a warm-cache same-task-complete load never fires a late-attached onload — the mobile portraits could stay hidden on revisits)", /var same=im\.getAttribute\("src"\)===art\.src/.test(js61) && /node\.style\.transition="opacity \.22s ease",node\.style\.opacity="0",im\.onload=function\(\)\{ssPoseShift\(node,im\),node\.style\.opacity=""\}\}/.test(js61) && /ssDc&&ssDc\.then\?ssDc\.then\(ssShow,function\(\)\{\}\):\(im\.complete&&im\.naturalWidth\|\|\(im\.onload=ssShow\)\)/.test(js61) && /im\.onload=function\(\)\{im\.style\.opacity=""\};im\.onerror=function\(\)\{im\.remove\(\)\};im\.src=art\.src;im\.complete&&im\.naturalWidth&&\(im\.style\.opacity=""\);box\.appendChild\(im\)/.test(js61));
check("P6 v13.197-mcdesktop (owner: use the desktop player images on mobile too): putPort serves the heroArtFor() HERO_ART desktop library for BOTH cards — the MC_ART mobile-cutout priority + the .mc-fill class retire; carWarm warms the library portrait + baked cast only (no MC_ART/MC_SIDE busts)", /var art=heroArtFor\(sd\);if\(art&&art\.src\)/.test(js61) && !/var own=MC_ART\[/.test(js61) && !/var MC_ART=\{/.test(js61) && !/im\.className=own\?/.test(js61) && !/MC_SIDE\[own\.src\]/.test(js61));
check("P6 announcements are polite + user-triggered only", /id="carSr" class="sr-only" aria-live="polite"/.test(publicSrc) && /if\(manual\)\{carAnnounce\(\);carArm\(\)\}/.test(js61));
check("P6 swipe: >=40px horizontal-dominant, click suppressed, RTL-aware", /Math\.abs\(dx\)>=40&&Math\.abs\(dx\)>Math\.abs\(dy\)/.test(js61) && /CAR\.swipe=Date\.now\(\)/.test(js61) && /rtl\?dx>0:dx<0/.test(js61));
check("P6 the side arrows are direction-aware (RTL: left=forward), like swipe+keys", /carGo\(CAR\.idx\+\(carRtl\(\)\?1:-1\),!0\)/.test(js61) && /carGo\(CAR\.idx\+\(carRtl\(\)\?-1:1\),!0\)/.test(js61) && /var ll=rtl\?T\("carNext"\):T\("carPrev"\)/.test(js61) && /var rl=rtl\?T\("carPrev"\):T\("carNext"\)/.test(js61));
check("P6 the degraded/hero-less guard reads heroMatches (empty array = real empty)", /Array\.isArray\(t&&t\.heroMatches\)\?t\.heroMatches\.some\(ssOk\):ssOk\(t&&t\.nextBig\)/.test(js61));
check("P6 the legacy payload falls back to [nextBig]; empty heroMatches does not", /t\.nextBig&&ssOk\(t\.nextBig\)&&ssAND\(t\.nextBig\)\?\[t\.nextBig\]:\[\]/.test(js61));

console.log("\n=== 3. the client CAR controller (behavioral, DOM-stubbed) ===");
// Eval the CAR module + its bundle deps from the LIVE asset with a minimal
// DOM stub — the real controller code, not a re-implementation.
const bundle = js61;
const modStart = bundle.indexOf("/* ==== v13.194-herocarousel: THE HERO CAROUSEL controller");
const modEnd = bundle.indexOf("function barTarget(){");
if (modStart < 0 || modEnd < 0 || modEnd <= modStart) { console.log("FAIL CAR module not found in bundle"); process.exit(1); }
const carModule = bundle.slice(modStart, modEnd);
const matchHrefFn = bundle.match(/function matchHref\([^}]*\}\s*function nameInto/);
const matchHrefSrc = matchHrefFn ? matchHrefFn[0].replace(/\s*function nameInto[\s\S]*$/, "") : null;
if (!matchHrefSrc) { console.log("FAIL matchHref not extracted"); process.exit(1); }

// --- the DOM stub ---
function stubDoc() {
  const els = {};
  const mkEl = (id) => ({
    id: id, children: [], childElementCount: 0, attributes: {}, textContent: "", title: "",
    classList: (() => {
      const set = new Set();
      return {
        add: (c) => set.add(c),
        remove: (c) => set.delete(c),
        toggle: (c, on) => { on ? set.add(c) : set.delete(c); },
        contains: (c) => set.has(c),
        __set: set
      };
    })(),
    setAttribute(k, v) { this.attributes[k] = v; }, getAttribute(k) { return this.attributes[k] || null; },
    removeAttribute(k) { delete this.attributes[k]; },
    addEventListener() {}, appendChild(c) { this.children.push(c); this.childElementCount = this.children.length; return c; },
    querySelector() { return null; }, contains() { return false; },
    get onclick() { return this._onclick; }, set onclick(f) { this._onclick = f; },
    style: {}, dataset: {}, tagName: "DIV", offsetWidth: 0
  });
  ["heroCar", "carDots", "carCount", "carLeft", "carRight", "carSr", "heroCarRegion", "heroSpot", "mcardSpot", "bigHeroCard", "heroMCard"].forEach((id) => { els[id] = mkEl(id); els[id].children = []; });
  global.document = {
    getElementById: (id) => els[id] || null,
    documentElement: { dir: "rtl" },
    addEventListener() {}, defaultView: { getComputedStyle: () => ({ direction: "rtl" }) },
    visibilityState: "visible", createElement: () => mkEl("x")
  };
  global.window = { matchMedia: (q) => ({ matches: false, addEventListener() {} }) };
  global.localStorage = { getItem: () => "fa", setItem() {} };
  global.setTimeout = (fn) => 0; global.clearTimeout = () => {}; global.Image = function () { return {}; };
  return els;
}
const stubs = stubDoc();
// the bundle helpers the module reads at CALL time
const helpers = `
var I18N={fa:{carRegion:"دیدارهای ویژه",carPrev:"پیش",carNext:"بعد",carPause:"توقف",carPlay:"پخش",carSlide:"مسابقه",carOf:"از"},en:{carRegion:"Featured matches",carPrev:"Previous",carNext:"Next",carPause:"Pause",carPlay:"Resume",carSlide:"Match",carOf:"of"}};
function curLang(){return "fa";}
function T(k){return I18N.fa[k]||k;}
var FA_D="۰۱۲۳۴۵۶۷۸۹";
function faNum(e){return String(e).replace(/[0-9]/g,function(a){return FA_D[a]})}
function fmtNum(e){return faNum(e)}
function matchHref(e){return e.path||("/matches/x")}
var DATA={upcoming:[],finished:[],heroMatches:[],nextBig:null,topSpot:null};
function __setD(d){DATA=d}
var MC_ART={},MC_CREST={},MC_WL={};
var HERO_ART_STUB={"A":{src:"/players/hero/a.webp"},"C":{src:"/players/hero/c.webp"},"E":{src:"/players/hero/e.webp"}};
function heroArtFor(sd){return sd&&HERO_ART_STUB[sd.name]||null}
function renderHeroSpot(){global.__rendered=(global.__rendered||0)+1}
function updateBigBar(){global.__ubb=(global.__ubb||0)+1}
function fitHeroNames(){}
function fitMcNames(){}
`;
const carCtx = eval("(() => {" + helpers + matchHrefSrc + carModule + "; return { CAR, __setD, carBuild, carOk, carPair, carHref, carFilter, carReconcile, carGo, carRollTick, carActive, carPlayAllowed, carArm, carWarm, carInit, carSync }; })()");

const M = (h, a, koMin, extra) => Object.assign({
  homeTeam: { name: h, faName: h }, awayTeam: { name: a, faName: a },
  utcDate: new Date(NOW + koMin * 6e4).toISOString(), status: "TIMED",
  competition: { code: "CL" }, pair: true, big: true, path: "/matches/" + h + "-vs-" + a
}, extra || {});

// C1: heroMessages array drives the slate (<=6, ok re-checked)
{
  carCtx.__setD({ heroMatches: [M("A", "B", 60), M("C", "D", 120), M("E", "F", 180)] });
  const list = carCtx.carBuild();
  check("C1 the slate builds from heroMatches in server order", list.length === 3 && list[0].homeTeam.name === "A");
}

// C2: a legacy payload (no heroMatches) falls back to [nextBig]
{
  carCtx.__setD({ nextBig: M("A", "B", 60) });
  const list = carCtx.carBuild();
  check("C2 legacy payload: [nextBig] is the single-slide fallback", list.length === 1 && list[0].homeTeam.name === "A");
}

// C3: heroMatches:[] is a REAL empty slate — a stale nextBig never resurrects
{
  carCtx.__setD({ heroMatches: [], nextBig: M("A", "B", 60) });
  check("C3 heroMatches:[] never falls back to stale nextBig", carCtx.carBuild().length === 0);
}

// C4: an overlay-patched live/finished row is dropped client-side
{
  carCtx.__setD({ heroMatches: [M("A", "B", 60, { status: "IN_PLAY" }), M("C", "D", 120)] });
  const list = carCtx.carBuild();
  check("C4 a row the overlay flipped to IN_PLAY never rides the rotation", list.length === 1 && list[0].homeTeam.name === "C");
}

// C5: reconciliation keeps the active slide by identity across a refresh
{
  carCtx.__setD({ heroMatches: [M("A", "B", 60), M("C", "D", 120), M("E", "F", 180)] });
  carCtx.carReconcile();
  carCtx.CAR.idx = 2; // visitor is on slide 3 (E v F)
  // refresh arrives: same slate, different array instance + one new first row
  carCtx.__setD({ heroMatches: [M("Z", "Y", 30), M("A", "B", 60), M("C", "D", 120), M("E", "F", 180)] });
  carCtx.carReconcile();
  check("C5 the active match survives a refresh by canonical href", carCtx.CAR.list[carCtx.CAR.idx] && carCtx.CAR.list[carCtx.CAR.idx].homeTeam.name === "E");
}

// C6: the active match disappearing rolls to the NEW PRIMARY (slide 1)
{
  carCtx.__setD({ heroMatches: [M("A", "B", 60), M("C", "D", 120)] });
  carCtx.carReconcile();
  carCtx.CAR.idx = 1; // active = C v D
  carCtx.__setD({ heroMatches: [M("A", "B", 60)] }); // C v D left the slate
  carCtx.carReconcile();
  check("C6 active gone => the new primary, index reset", carCtx.CAR.idx === 0 && carCtx.CAR.list.length === 1);
}

// C7/C8/C9: the 1s expiry sweep — a FAKE CLOCK drives the kickoff passage
// (carOk reads Date.now(); the fixtures ride a controllable now).
const realNow = Date.now;
let fakeNow = realNow();
Date.now = () => fakeNow;
const Mf = (h, a, msOffset, extra) => Object.assign({
  homeTeam: { name: h, faName: h }, awayTeam: { name: a, faName: a },
  utcDate: new Date(fakeNow + msOffset).toISOString(), status: "TIMED",
  competition: { code: "CL" }, pair: true, big: true, path: "/matches/" + h + "-vs-" + a
}, extra || {});

// C7: the 1s sweep drops a started ACTIVE match immediately + re-renders
{
  carCtx.__setD({ heroMatches: [Mf("A", "B", 3e4), Mf("C", "D", 36e5)] }); // A kicks off in 30s
  carCtx.carReconcile();
  check("C7a setup: both slides live, bar on", carCtx.CAR.list.length === 2 && stubs.heroCar.classList.contains("on"));
  global.__rendered = 0;
  carCtx.CAR.idx = 0; // visitor watching A
  fakeNow += 61e3; // the clock crosses A's kickoff (no payload refresh yet)
  carCtx.carRollTick();
  check("C7 a kicked-off active match rolls off within the tick", carCtx.CAR.list.length === 1 && carCtx.CAR.list[0].homeTeam.name === "C" && global.__rendered >= 1);
}

// C8: non-active expiries only shrink the list (no re-render churn)
{
  carCtx.__setD({ heroMatches: [Mf("A", "B", 3e4), Mf("C", "D", 36e5)] });
  carCtx.carReconcile();
  carCtx.CAR.idx = 1; // active = C (still future)
  global.__rendered = 0;
  fakeNow += 61e3; // A expires under the visitor's feet — not visible
  carCtx.carRollTick();
  check("C8 a non-active expiry drops silently (no re-render)", carCtx.CAR.list.length === 1 && carCtx.CAR.list[0].homeTeam.name === "C" && global.__rendered === 0);
}

// C9: the slate empties => the no-hero lifecycle (carSync hides the bar)
{
  carCtx.__setD({ heroMatches: [Mf("A", "B", 3e4), Mf("C", "D", 6e4)] });
  carCtx.carReconcile();
  check("C9a setup: the bar is on with two slides", stubs.heroCar.classList.contains("on"));
  fakeNow += 121e3; // both kickoffs pass
  carCtx.carRollTick();
  check("C9 all slides expired => empty carousel, controls hide", carCtx.CAR.list.length === 0 && !stubs.heroCar.classList.contains("on"));
}
Date.now = realNow;

// C10 (v13.196-carlive): autoplay is DEFAULT-ON for everyone — the
// hover/focus/reduced-motion gates are RETIRED (they froze the rotation
// invisibly, which the owner read as autoplay-off); the hidden tab is
// the only pause left.
{
  carCtx.__setD({ heroMatches: [M("A", "B", 60)] });
  carCtx.carReconcile();
  check("C10 single slide: no rotation", !carCtx.carPlayAllowed());
  carCtx.__setD({ heroMatches: [M("A", "B", 60), M("C", "D", 120)] });
  carCtx.carReconcile();
  check("C10 two slides: rotation allowed (default-on, owner round 2)", carCtx.carPlayAllowed());
  check("C10 the pause flags are retired (pointer/focus/motion never freeze it)", !("hoverPause" in carCtx.CAR) && !("focusPause" in carCtx.CAR) && !("rm" in carCtx.CAR) && !("canHover" in carCtx.CAR));
  carCtx.CAR.docHidden = true;
  check("C10 hidden-tab pause (the only one left)", !carCtx.carPlayAllowed());
  carCtx.CAR.docHidden = false;
  check("C10 back visible => rotation resumes", carCtx.carPlayAllowed());
}

// C11: carFilter drops the slate rows from a legacy secondary list
{
  carCtx.__setD({ heroMatches: [M("A", "B", 60)] });
  carCtx.carReconcile();
  const rows = [{ path: "/matches/A-vs-B" }, { path: "/matches/X-vs-Y" }];
  const out = carCtx.carFilter(rows);
  check("C11 the client dedupe twin drops slate rows by canonical href", out.length === 1 && out[0].path === "/matches/X-vs-Y");
}

// C12: wrap-around navigation in both directions
{
  carCtx.__setD({ heroMatches: [M("A", "B", 60), M("C", "D", 120), M("E", "F", 180)] });
  carCtx.carReconcile();
  carCtx.CAR.idx = 2;
  global.__rendered = 0;
  carCtx.carGo(carCtx.CAR.idx + 1, true); // past the end -> wraps to 0
  check("C12 next wraps last -> first", carCtx.CAR.idx === 0);
  carCtx.carGo(carCtx.CAR.idx - 1, true); // before the start -> wraps to last
  check("C12 prev wraps first -> last", carCtx.CAR.idx === 2);
}

// C13 (v13.195-carsides): the side arrows are PHYSICAL; their action
// flips with direction (the stub document is RTL) - the left arrow
// advances, the right arrow goes back, and the labels follow.
{
  carCtx.__setD({ heroMatches: [M("A", "B", 60), M("C", "D", 120), M("E", "F", 180)] });
  carCtx.carInit();
  check("C13a setup: the side arrows + bar are on with 3 slides", stubs.carLeft.classList.contains("on") && stubs.carRight.classList.contains("on") && stubs.heroCar.classList.contains("on"));
  carCtx.CAR.idx = 0;
  stubs.carLeft.onclick(); // RTL: left = FORWARD
  check("C13 RTL: the left arrow advances", carCtx.CAR.idx === 1);
  stubs.carRight.onclick(); // RTL: right = BACK
  check("C13 RTL: the right arrow goes back", carCtx.CAR.idx === 0);
  check("C13 RTL: the left arrow carries the NEXT label", stubs.carLeft.getAttribute("aria-label") === "بعد");
  check("C13 RTL: the right arrow carries the PREVIOUS label", stubs.carRight.getAttribute("aria-label") === "پیش");
}

// C14 (v13.196-carlive): ALL slides' art warms the moment the slate is
// built (owner round 2: the first manual slide left the previous
// players painted — a cold src swap keeps the old bitmap, so the warm
// must cover every slide, portraits + baked casts); a SAME-slate slide
// change does NOT re-warm, a CHANGED slate re-warms.
{
  let warmed = [];
  global.Image = function () { const im = {}; Object.defineProperty(im, "src", { set: (v) => warmed.push(v), get: () => "" }); return im; };
  carCtx.__setD({ heroMatches: [M("A", "B", 60), M("C", "D", 120)] });
  carCtx.carReconcile();
  check("C14 the whole slate's art warms on build (both slides' portraits + casts)", warmed.length >= 4 && warmed.includes("/players/hero/a.webp") && warmed.includes("/players/hero/a.cast.webp") && warmed.includes("/players/hero/c.webp") && warmed.includes("/players/hero/c.cast.webp"));
  warmed.length = 0;
  carCtx.carGo(carCtx.CAR.idx + 1, true); // slide change, SAME slate
  check("C14 a same-slate slide change does not re-warm", warmed.length === 0);
  carCtx.__setD({ heroMatches: [M("A", "B", 60), M("C", "D", 120), M("E", "F", 180)] });
  carCtx.carReconcile();
  check("C14 a changed slate re-warms (the new slide's art included)", warmed.length >= 6 && warmed.includes("/players/hero/e.webp") && warmed.includes("/players/hero/e.cast.webp"));
}

console.log(fails ? `\n${fails} FAIL` : "\nAll hero-carousel checks passed");
process.exit(fails ? 1 : 0);
