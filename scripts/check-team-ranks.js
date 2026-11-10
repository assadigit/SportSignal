// Self-check: the team competition-rank badge on the match cards (v13.254-rankbadge,
// docs/specs/team-rank-indicator.md §13). Asserts:
//  1) The server resolver exists + the applicability law (fixture's own
//     competition only; cups/knockout/pre-season never carry a rank)
//  2) Behavioral: the real teamRankSets/rankApplicable/attachTeamRanks
//     (eval-extracted from the concat) resolve, fold, gate and stamp correctly
//  3) The payload wiring (withTop rows + UCL spot rows carry the ranks)
//  4) The SEO SSR mirror (same KV caches, rankChipHtml in markup.ts) — the
//     pill rides the CREST inside the .logo wrapper (v13.254)
//  5) The client bundle renders the pill in BOTH card families; no rank ->
//     no badge at all; the hero carousel stays badge-free
//  6) The stylesheet rules (the anchored pill, the per-side outer-corner
//     mirror, the >=4.5:1 measured ink on the pill's own disc — recomputed
//     from the live tokens)
const fs = require("fs");
const path = require("path");
const src = require("./lib/worker-src")();

let fails = 0;
const check = (name, cond) => {
  console.log((cond ? "OK   " : "FAIL ") + name);
  if (!cond) fails++;
};
const read = (f) => fs.readFileSync(path.join(__dirname, "..", f), "utf8");

// ---------- 1) static: the resolver + the applicability law ----------
check("teamRankSets/rankApplicable/attachTeamRanks exported (public-matches.ts)",
  /export function teamRankSets\(stMap\) \{/.test(read("src/public-matches.ts")) &&
  /export function rankApplicable\(m\) \{/.test(read("src/public-matches.ts")) &&
  /export function attachTeamRanks\(p, m, rankSets\) \{/.test(read("src/public-matches.ts")));
check("the applicability law: domestic cups + the KO-only stage set gate (LEAGUE_PHASE/GROUP_STAGE stay eligible — spec §4)",
  /if \(isDomesticCup\(m\.competition\.code\)\) return false;/.test(src) &&
  /const RANK_KO_STAGES = new Set\(\["PLAYOFF_ROUND", "ROUND_OF_16", "ROUND_OF_32", "QUARTER_FINALS", "QUARTER_FINAL", "SEMI_FINALS", "SEMI_FINAL", "FINAL", "THIRD_PLACE", "FINAL_THIRD"\]\);/.test(src) &&
  /if \(stage && RANK_KO_STAGES\.has\(stage\)\) return false;/.test(src) &&
  /if \(!st \|\| st\.started === false \|\| !Array\.isArray\(st\.teams\) \|\| !st\.teams\.length\) continue;/.test(src));
check("the list rows stamp ranks through withTop; the UCL spot rows too",
  /const rankSets = teamRankSets\(stMap\);/.test(src) &&
  /return attachTeamRanks\(p, m, rankSets\);/.test(src) &&
  /matches: clBox\.map\(\(m\) => attachTeamRanks\(pubMatch\(m\), m, rankSets\)\)/.test(src));
check("no new fetch: the ranks read the SAME cache-only stMap (fetchStandings allowFetch=false stays the only standings read in the payload build)",
  (src.match(/fetchStandings\(env, c, false\)/g) || []).length === 1 &&
  !/fetchStandings\(env, c, true\)/.test(read("src/public-matches.ts")));

// ---------- 2) behavioral: the real functions, real normalizer ----------
const { normalizeTeamName } = require("../src/teams.ts");
const cfgStub = "var CONFIG = { DOMESTIC_CUP_IDS: { FA_CUP: 2055, EFL_CUP: 2139, CDR: 2079, COPPA_ITALIA: 2122, DFB_POKAL: 4555 } };";
const isDomCupSrc = src.match(/function isDomesticCup\(code\) \{[\s\S]*?\n\}/)[0];
const rankNormSrc = src.match(/const RANK_NORM_CACHE = new Map\(\);\nfunction rankNorm\(name\) \{[\s\S]*?\n\}/)[0];
const koStagesSrc = src.match(/const RANK_KO_STAGES = new Set\(\[[\s\S]*?\]\);/)[0];
const setsSrc = src.match(/function teamRankSets\(stMap\) \{[\s\S]*?\n\}/)[0];
const applSrc = src.match(/function rankApplicable\(m\) \{[\s\S]*?\n\}/)[0];
const attachSrc = src.match(/function attachTeamRanks\(p, m, rankSets\) \{[\s\S]*?\n\}/)[0];
new Function("normalizeTeamName",
  cfgStub + "\n" + isDomCupSrc + "\n" +
  rankNormSrc + "\n" + koStagesSrc + "\n" + setsSrc + "\n" + applSrc + "\n" + attachSrc + "\n" +
  "globalThis.teamRankSets = teamRankSets; globalThis.rankApplicable = rankApplicable; globalThis.attachTeamRanks = attachTeamRanks;"
)(normalizeTeamName);

const stMap = {
  PL: { started: true, teams: [
    { name: "Liverpool FC", pos: 1, points: 28 },
    { name: "Arsenal FC", pos: 3, points: 22 },
    { name: "Manchester United FC", pos: 14, points: 12 },
    { name: "Wolverhampton Wanderers", pos: 0, points: 4 },   // invalid pos — never a rank
    { name: "AFC Bournemouth", pos: 2.5 },                    // decimal — never a rank
    { name: "West Ham United FC", pos: "9", points: 11 }      // provider string — coerced
  ]},
  CL: { started: true, teams: [
    { name: "Aston Villa FC", pos: 5 },
    { name: "FC Barcelona", pos: 2 }
  ]},
  BL1: { started: false, teams: [ { name: "FC Bayern München", pos: 1 } ] } // pre-season
};
const sets = teamRankSets(stMap);
check("teamRankSets skips the pre-season table (started:false) and validates pos (0/2.5 rejected, \"9\" coerced)",
  !sets.BL1 && sets.PL && sets.PL.size === 4 && sets.PL.get("westhamunited") === 9 && sets.CL.size === 2);

const mk = (home, away, code, stage) => ({
  homeTeam: { name: home }, awayTeam: { name: away },
  competition: { code }, stage: stage || "REGULAR_SEASON", utcDate: "2026-11-14T20:00:00Z", status: "SCHEDULED"
});
const shape = (m) => ({ homeTeam: {}, awayTeam: {} });

// a PL fixture: both sides resolve (provider-name fold FC-vs-bare, two-digit pos, string pos)
let p = attachTeamRanks(shape(mk("Liverpool", "Manchester United", "PL")), mk("Liverpool", "Manchester United", "PL"), sets);
check("PL fixture: both ranks stamped (1 and 14) with the FC-folding name bridge",
  p.homeTeam.rank === 1 && p.awayTeam.rank === 14);
p = attachTeamRanks(shape(mk("West Ham United", "Everton FC", "PL")), mk("West Ham United", "Everton FC", "PL"), sets);
check("one-sided rank: the missing team suppresses only its own badge (never the opponent's)",
  p.homeTeam.rank === 9 && p.awayTeam.rank === undefined);
p = attachTeamRanks(shape(mk("FC Barcelona", "Aston Villa", "CL", "LEAGUE_PHASE")), mk("FC Barcelona", "Aston Villa", "CL", "LEAGUE_PHASE"), sets);
check("CL league-phase fixture carries league-phase positions (2 / 5)",
  p.homeTeam.rank === 2 && p.awayTeam.rank === 5);
p = attachTeamRanks(shape(mk("FC Barcelona", "Aston Villa FC", "CL", "LEAGUE_STAGE")), mk("FC Barcelona", "Aston Villa FC", "CL", "LEAGUE_STAGE"), sets);
check("CL LEAGUE_STAGE (the FD stage spelling) also ranks — the display-label trap avoided",
  p.homeTeam.rank === 2 && p.awayTeam.rank === 5);
// the phase gate: KO-stage rows never carry a rank (the appendTableOrPhase law)
p = attachTeamRanks(shape(mk("FC Barcelona", "Arsenal FC", "CL", "ROUND_OF_16")), mk("FC Barcelona", "Arsenal FC", "CL", "ROUND_OF_16"), sets);
check("CL knockout row (ROUND_OF_16): no rank", p.homeTeam.rank === undefined && p.awayTeam.rank === undefined);
p = attachTeamRanks(shape(mk("FC Barcelona", "Arsenal FC", "CL", "FINAL")), mk("FC Barcelona", "Arsenal FC", "CL", "FINAL"), sets);
check("CL FINAL: no rank", p.homeTeam.rank === undefined && p.awayTeam.rank === undefined);
p = attachTeamRanks(shape(mk("Liverpool", "Arsenal", "FA_CUP")), mk("Liverpool", "Arsenal", "FA_CUP"), sets);
check("domestic cup (FA_CUP): no rank — never a fallback from the domestic league", p.homeTeam.rank === undefined && p.awayTeam.rank === undefined);
p = attachTeamRanks(shape(mk("Liverpool", "Arsenal", "EL")), mk("Liverpool", "Arsenal", "EL"), sets);
check("EL fixture (no cached table): no rank — no invented positions", p.homeTeam.rank === undefined && p.awayTeam.rank === undefined);
p = attachTeamRanks(shape(mk("FC Bayern München", "Borussia Dortmund", "BL1")), mk("FC Bayern München", "Borussia Dortmund", "BL1"), sets);
check("pre-season table (started:false): no rank even for a table team", p.homeTeam.rank === undefined && p.awayTeam.rank === undefined);
check("rankApplicable: LEAGUE_PHASE/LEAGUE_STAGE/GROUP_STAGE/REGULAR_SEASON pass; KO stages + cups fail; missing competition fails",
  rankApplicable(mk("A", "B", "CL", "LEAGUE_PHASE")) === true &&
  rankApplicable(mk("A", "B", "CL", "LEAGUE_STAGE")) === true &&
  rankApplicable(mk("A", "B", "WC", "GROUP_STAGE")) === true &&
  rankApplicable(mk("A", "B", "PL")) === true &&
  rankApplicable(mk("A", "B", "CL", "SEMI_FINALS")) === false &&
  rankApplicable(mk("A", "B", "CL", "ROUND_OF_16")) === false &&
  rankApplicable(mk("A", "B", "EFL_CUP")) === false &&
  rankApplicable({ homeTeam: {}, awayTeam: {} }) === false);
check("null/absent stMap and rankSets never throw (the degraded path)",
  (() => { try { attachTeamRanks(shape(mk("A", "B", "PL")), mk("A", "B", "PL"), null); attachTeamRanks(shape(mk("A", "B", "PL")), mk("A", "B", "PL"), teamRankSets(null)); return true; } catch (e) { return false; } })());

// ---------- 3) the SEO SSR mirror (v13.254: the pill rides the crest) ----------
const mkSrc = read("src/seo/markup.ts");
const dtSrc = read("src/seo/data.ts");
check("SSR: seo/data.ts reads the same standings_cache_* keys and stamps through attachTeamRanks",
  /CONFIG\.KV_STANDINGS_CACHE \+ c/.test(dtSrc) &&
  /const rankSets = teamRankSets\(stMap\);/.test(dtSrc) &&
  /const shaped = pool\.map\(\(m\) => attachTeamRanks\(pubMatch\(m\), m, rankSets\)\);/.test(dtSrc));
check("SSR: rankChipHtml returns the dir=ltr #-prefixed pill span with the table-naming label + the data-tip the client tooltip reads (the # must not flip in RTL)",
  /function rankChipHtml\(t: any, m: any\): string \{/.test(mkSrc) &&
  mkSrc.includes('<span class="rankchip" title="') &&
  mkSrc.includes('"><span dir="ltr">#\' + toFaDigits(String(pos)) + "</span></span>"') &&
  /const cn = m && m\.competition \? compNameFa\(m\) : "";/.test(mkSrc) &&
  (new RegExp("\\u0631\\u062A\\u0628\\u0647 \" \\+ toFaDigits\\(String\\(pos\\)\\) \\+ \" \\u062F\\u0631 \\u062C\\u062F\\u0648\\u0644\" \\+ \\(cn \\? \" \" \\+ cn : \"\"\\)")).test(mkSrc));
check("SSR: logoHtml takes the badge and tucks it INSIDE the .logo wrapper (crest-anchored pill); BOTH sideHome and sideAway pass rankChipHtml to it",
  /export function logoHtml\(t: any, badge\?: string\): string \{/.test(mkSrc) &&
  (mkSrc.match(/logoHtml\(t, rankChipHtml\(t, m\)\)/g) || []).length === 2);
check("SSR: the name row is the PLAIN pre-badge .team markup for every team (the S40 team-r/.tn row retires; away keeps its [team, logo] DOM order)",
  mkSrc.includes('\'<div class="team">\' + nameHtml(teamName) + "</div></div>"') &&
  mkSrc.includes('\'<div class="side away"><div class="team">\' + nameHtml(teamName) + "</div>" + logoHtml') &&
  !/team-r/.test(mkSrc.replace(/\/\/[^\n]*/g, "")));
check("SSR: both list-row and spotitem callers pass the match for the label context",
  /sideHome\(m\.homeTeam, displayName\(m\.homeTeam\), m\)/.test(mkSrc) &&
  /sideAway\(m\.awayTeam, displayName\(m\.awayTeam\), m\)/.test(mkSrc));

// ---------- 4) the client bundle ----------
const pubTs = read("src/pages/public.ts");
const liveBundle = (pubTs.match(/\/(public-\d+\.\d+\.js)/) || [])[1];
check("the live bundle is referenced from the served HTML", !!liveBundle);
const bundle = liveBundle ? read("assets/" + liveBundle) : "";
check("client: BOTH card families build team blocks through teamRow — now the name-only row (render + spotItemNode)",
  /function teamRow\(e\)\{var r=document\.createElement\("div"\);r\.className="team";var n=curLang\(\)==="en"\?e\.name:e\.faName\|\|e\.name;return nameInto\(r,n\),r\}/.test(bundle) &&
  /u=teamRow\(n\.homeTeam\),s=teamRow\(n\.awayTeam\)/.test(bundle) &&
  /o=teamRow\(e\.homeTeam\),l=teamRow\(e\.awayTeam\)/.test(bundle) &&
  !/team-r/.test(bundle.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "")));
check("client: the pill is a #-prefixed dir=ltr span (the class stays .rankchip for the S38 tooltip engine) with localized digits + the table-naming accessible label + the data-tip",
  /n\.className="rankchip";var d=document\.createElement\("span"\);d\.setAttribute\("dir","ltr"\);d\.textContent="#"\+fmtNum\(r\);n\.appendChild\(d\)/.test(bundle) &&
  /ordNum\(r\)\+" in "\+\(l\?l\+" table":"the table"\)/.test(bundle) &&
  /\\u062C\\u062F\\u0648\\u0644"\+\(l\?" "\+l:""\)/.test(bundle) &&
  /setAttribute\("aria-label",i\)/.test(bundle) &&
  /setAttribute\("title",i\)/.test(bundle) &&
  /setAttribute\("data-tip",i\)/.test(bundle));
check("client: logo(e,badge) tucks the pill INSIDE the .logo wrapper and the onerror monogram swap re-appends it (the textContent wipe would drop it)",
  /function logo\(e,badge\)\{/.test(bundle) &&
  /badge&&a\.appendChild\(badge\),a\}/.test(bundle) &&
  /t\.onerror=function\(\)\{a\.textContent=monogram\(e\),badge&&a\.appendChild\(badge\)\}/.test(bundle));
check("client: BOTH card families pass the badge at their logo() calls (render + spotItemNode)",
  /logo\(n\.homeTeam,rankBadge\(n\.homeTeam,n\)\)/.test(bundle) &&
  /logo\(n\.awayTeam,rankBadge\(n\.awayTeam,n\)\)/.test(bundle) &&
  /logo\(e\.homeTeam,rankBadge\(e\.homeTeam,e\)\)/.test(bundle) &&
  /logo\(e\.awayTeam,rankBadge\(e\.awayTeam,e\)\)/.test(bundle));
check("client: the hero carousel's logo(side) stays badge-FREE (the spec scope law — the hero/mcard surfaces were never badge surfaces)",
  /logo\(side\)/.test(bundle) &&
  !/logo\(side,rankBadge/.test(bundle));
check("client: no rank -> no badge at all (rankBadge returns null before any element is built; the badge never renders 0/negative/NaN)",
  /if\(!\(r>=1&&Number\.isInteger\(r\)\)\)return null/.test(bundle));

// ---------- 4b) the tap+hover tooltip (S38, spec §11) ----------
check("tooltip: ONE delegated listener set — mouseover (hover) + capture-phase click (tap beats the card link) + Escape + scroll + resize",
  /document\.addEventListener\("mouseover",function\(e\)\{var t=e\.target&&e\.target\.closest\?e\.target\.closest\("\.rankchip"\):null/.test(bundle) &&
  /document\.addEventListener\("click",function\(e\)\{var t=e\.target&&e\.target\.closest\?e\.target\.closest\("\.rankchip"\):null/.test(bundle) &&
  /,true\);/.test(bundle) &&
  /e\.preventDefault\(\)/.test(bundle) &&
  /e\.key==="Escape"\|\|e\.key==="Esc"/.test(bundle) &&
  /window\.addEventListener\("scroll",function\(\)\{rankTipFor&&rankTipHide\(\)\},true\)/.test(bundle) &&
  /window\.addEventListener\("resize",function\(\)\{rankTipFor&&rankTipHide\(\)\}\)/.test(bundle));
check("tooltip: the (hover: none) guard — tap-only devices never double-fire the hover path",
  /window\.matchMedia\?window\.matchMedia\("\(hover: none\)"\):null/.test(bundle) &&
  /RANK_TIP_MQL&&RANK_TIP_MQL\.matches\)return/.test(bundle));
check("tooltip: ONE shared bubble — #rankTip in body, role=tooltip, data-tip/title text, aria-describedby while visible",
  /t\.id="rankTip",t\.className="ranktip",t\.setAttribute\("role","tooltip"\)/.test(bundle) &&
  /e\.getAttribute\("data-tip"\)\|\|e\.getAttribute\("title"\)\|\|""/.test(bundle) &&
  /e\.setAttribute\("aria-describedby","rankTip"\)/.test(bundle) &&
  /rankTipFor\.removeAttribute\("aria-describedby"\)/.test(bundle));
check("tooltip: viewport-clamped geometry — centered above, flipped below, arrow tracks the chip center via --ranktip-ax",
  /Math\.max\(8,Math\.min\(c-o\/2,n-o-8\)\)/.test(bundle) &&
  /p>=8\?\(t\.classList\.add\("up"\),t\.style\.top=Math\.round\(p\)\+"px"\):\(t\.classList\.add\("down"\),t\.style\.top=Math\.round\(a\.bottom\+u\)\+"px"\)/.test(bundle) &&
  /--ranktip-ax",Math\.round\(Math\.max\(12,Math\.min\(c-s,o-12\)\)\)\+"px"/.test(bundle));
check("tooltip: the native title strips on first interaction (no double tooltip); hover shows after a 200ms rest; tap toggles instantly",
  /function rankTipStrip\(e\)\{try\{e&&e\.getAttribute\("title"\)&&e\.removeAttribute\("title"\)\}catch\(d\)\{\}\}/.test(bundle) &&
  /setTimeout\(function\(\)\{rankTipTimer=0,t\.isConnected&&rankTipShow\(t\)\},200\)/.test(bundle) &&
  /rankTipFor===t\)\{rankTipHide\(\);return\}rankTipHide\(\),rankTipShow\(t\),rankTipPin=true/.test(bundle));
check("tooltip: every data re-render hides it (the poll/lang re-render detaches the chip the bubble points at)",
  /function rerenderAll\(\)\{rankTipHide\(\),applyView\(\)/.test(bundle));

// ---------- 5) the stylesheet (v13.254: the anchored crest pill) ----------
const shellTs = read("src/seo/page-shell.ts");
const liveCss = (pubTs.match(/\/(public-\d+\.\d+\.css)/) || [])[1];
const css = liveCss ? read("assets/" + liveCss) : "";
check("css: the anchored pill — absolute, bottom corner on the row's OUTER flank (home inline-start / away inline-end — ONE logical rule PER SIDE, direction-agnostic), ltr-isolated bold tabular digits, solid disc + thin border; .logo gains the anchor scope",
  css.includes(".match .side .logo{position:relative;overflow:visible}") &&
  css.includes(".rankchip{position:absolute;bottom:var(--rc-nub);z-index:2;--rc-nub:-4px;--rank-chip-bg:#0c1524;--rank-chip-border:#46648f;--rank-chip-ink:#edf3ff;display:inline-flex;align-items:center;justify-content:center;box-sizing:border-box;height:18px;min-width:18px;padding:0 4px;border-radius:9999px;background:var(--rank-chip-bg);border:1px solid var(--rank-chip-border);color:var(--rank-chip-ink);font-size:10px;font-weight:700;line-height:1;font-variant-numeric:tabular-nums}") &&
  css.includes(".rankchip>span{direction:ltr;unicode-bidi:isolate}") &&
  css.includes(".match .side .logo .rankchip{inset-inline-start:var(--rc-nub);inset-inline-end:auto}") &&
  css.includes(".match .side.away .logo .rankchip{inset-inline-end:var(--rc-nub);inset-inline-start:auto}") &&
  !/\.team\.team-r\{/.test(css) &&
  !/\.team\.team-r \.tn\{/.test(css) &&
  !/\.side \.logo\{overflow:visible\}/.test(css));
check("css: the size law — the base 18px pill, the #liveCard 28px-crest step-down (14px), the narrow-screen 37px-crest step (16px); the corner offset follows --rc-nub",
  css.includes("#liveCard .logo .rankchip{--rc-nub:-3px;height:14px;min-width:14px;padding:0 3px;font-size:8px}") &&
  css.includes("@media (max-width:600px){.match .side .logo .rankchip{height:16px;min-width:16px;padding:0 3px;font-size:9px;--rc-nub:-3px}}"));

// ---------- 5b) the contrast gate (the owner's >=4.5:1 bar) ----------
// v13.254: the pill paints its OWN solid disc, so the ink is measured against
// the disc background (dark + light) — the S40 row-surface compositing
// retired with the plain number. The tokens are PARSED from the live
// stylesheet, so a future re-tint recomputes.
function cLin(c) { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
function cLum(rgb) { return 0.2126 * cLin(rgb[0]) + 0.7152 * cLin(rgb[1]) + 0.0722 * cLin(rgb[2]); }
function cRatio(fg, bg) { const a = cLum(fg), b = cLum(bg); return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05); }
function cHex(s) { return [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)]; }
function cssHex(block, name) {
  const m = block.match(new RegExp("--" + name + ":(#[0-9a-fA-F]{6})"));
  return m ? cHex(m[1]) : null;
}
const chipBlock = (css.match(/\.rankchip\{([^}]*)\}/) || [])[1] || "";
const chipLightBlock = (css.match(/\[data-theme=light\] \.rankchip\{([^}]*)\}/) || [])[1] || "";
const chipInkD = cssHex(chipBlock, "rank-chip-ink");
const chipBgD = cssHex(chipBlock, "rank-chip-bg");
const chipInkL = cssHex(chipLightBlock, "rank-chip-ink");
const chipBgL = cssHex(chipLightBlock, "rank-chip-bg");
check("contrast: the pill's ink measures >=4.5:1 on its own solid disc (dark " + (chipInkD && chipBgD ? cRatio(chipInkD, chipBgD).toFixed(2) : "?") + ":1, light " + (chipInkL && chipBgL ? cRatio(chipInkL, chipBgL).toFixed(2) : "?") + ":1 — the badge paints its own surface)",
  chipInkD && chipBgD && chipInkL && chipBgL &&
  cRatio(chipInkD, chipBgD) >= 4.5 && cRatio(chipInkL, chipBgL) >= 4.5);
check("css: the .ranktip bubble — fixed, above-the-sticky-bar z-index, pointer-transparent, fade+rise, arrow states, light pair, reduced-motion",
  /\.ranktip\{--ranktip-bg:#0c1728;--ranktip-ink:#D6E9FA;position:fixed;left:0;top:0;z-index:70;/.test(css) &&
  /pointer-events:none/.test(css) &&
  /\.ranktip\.on\{opacity:1;visibility:visible;transform:none\}/.test(css) &&
  /\.ranktip::after\{content:"";position:absolute;left:var\(--ranktip-ax,50%\);transform:translateX\(-50%\);border:5px solid transparent;pointer-events:none\}/.test(css) &&
  /\.ranktip\.up::after\{top:100%;border-top-color:var\(--ranktip-bg\)\}/.test(css) &&
  /\.ranktip\.down::after\{bottom:100%;border-bottom-color:var\(--ranktip-bg\)\}/.test(css) &&
  /\[data-theme=light\] \.ranktip\{--ranktip-bg:#ffffff;--ranktip-ink:#31567c;/.test(css) &&
  /@media \(prefers-reduced-motion:reduce\)\{\.ranktip\{transition:none;transform:none\}\}/.test(css));
check("css: the SEO shell references the same stylesheet as the homepage",
  new RegExp("/" + (liveCss || "x").replace(/\./g, "\\.")).test(shellTs));

process.exit(fails ? 1 : 0);
