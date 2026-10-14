// Self-check: v13.101-trueduels — the CURATED true-big-duel list and the
// big-duel/derby-code-name banner discipline. The user's report (2026-10-14
// UCL night): "psg vs manchester city and real vs rome are both called as
// big duels of UCL" — the banner leaned on the SETTINGS-driven master pair,
// so a settings-added AS Roma made Real–Roma a "دوئل بزرگ". The fix's pins:
//
//   1. isTrueBigDuel — BOTH sides must sit in the hand-tuned elite list
//      (City–PSG, Barça–Real…). Elite-vs-second-grade (Real–Roma) is NOT a
//      big duel. Settings cannot create big duels.
//   2. specialBanner — the CL big-duel line fires for TRUE big duels only;
//      derby CODE NAMES promote (fa + en) and now ALSO in the Champions
//      League (the user's ask: "promote derbies with their code names such
//      as el classico"); everything else stays banner-free ("leave the rest
//      as they are").
//   3. Source wiring — specialBanner no longer consults isMasterPair; the
//      card passes allowUcl; the site default callers keep the v13.51 UCL
//      suppression.
const src = require("./lib/worker-src")();

function grabFn(sig) {
  const i = src.indexOf(sig);
  if (i < 0) throw new Error("missing " + sig);
  const open = src.indexOf("{", i);
  let depth = 0, j = open;
  let state = 0, tplExprDepth = 0;
  const stack = [];
  while (j < src.length) {
    const ch = src[j], next = src[j + 1] || "";
    if (state === 0) {
      if (ch === "/" && next === "/") { state = 1; j += 2; continue; }
      if (ch === "/" && next === "*") { state = 2; j += 2; continue; }
      if (ch === '"') { stack.push(0); state = 3; j++; continue; }
      if (ch === "'") { stack.push(0); state = 4; j++; continue; }
      if (ch === "`") { stack.push(0); state = 5; j++; continue; }
      if (ch === "{") depth++;
      else if (ch === "}") { depth--; if (depth === 0) break; }
      if (ch === "\\" && next === "u" && src[j + 2] === "{") {
        const end = src.indexOf("}", j + 3);
        if (end > 0) { j = end + 1; continue; }
      }
    } else if (state === 1) { if (ch === "\n") state = 0; }
    else if (state === 2) { if (ch === "*" && next === "/") { state = 0; j += 2; continue; } }
    else if (state === 3) { if (ch === "\\") { j += 2; continue; } if (ch === '"') state = stack.pop(); }
    else if (state === 4) { if (ch === "\\") { j += 2; continue; } if (ch === "'") state = stack.pop(); }
    else if (state === 5) {
      if (ch === "\\") { j += 2; continue; }
      if (ch === "`") { state = stack.pop(); j++; continue; }
      if (ch === "$" && next === "{") { state = 6; tplExprDepth = 1; j += 2; continue; }
    } else if (state === 6) {
      if (ch === "{") tplExprDepth++;
      else if (ch === "}") { tplExprDepth--; if (tplExprDepth === 0) state = 5; }
      else if (ch === '"') { stack.push(6); state = 3; }
      else if (ch === "'") { stack.push(6); state = 4; }
      else if (ch === "`") { stack.push(6); state = 5; }
      else if (ch === "\\") j++;
    }
    j++;
  }
  return src.slice(i, j + 1);
}
function grabVarBalanced(name) {
  const i = src.indexOf("var " + name + " =");
  if (i < 0) throw new Error("missing var " + name);
  const eq = src.indexOf("=", i);
  let depth = 0, j = eq;
  for (; j < src.length; j++) {
    const ch = src[j];
    if (ch === "{") depth++;
    else if (ch === "}") { depth--; if (depth < 0) break; }
    else if (ch === ";" && depth === 0) break;
  }
  return src.slice(i, j + 1);
}

let failed = 0;
let passed = 0;
const check = (name, cond) => {
  console.log((cond ? "OK   " : "FAIL ") + name);
  if (cond) passed++; else failed++;
};

// --- Real deps: the alias block + the full true-duel/derby machinery ---
const { normalizeTeamName, normAlias } = require("../src/teams.ts");
// The CONFIG the master machinery would read — DELIBERATELY poisoned with
// AS Roma everywhere (the live 2026-10-14 settings shape): the whole point
// is that isTrueBigDuel must not care.
const CONFIG = {
  BIG_TEAMS_BY_LEAGUE: {
    PL: ["Arsenal FC", "Chelsea FC", "Liverpool FC", "Manchester City FC", "Manchester United FC"],
    PD: ["FC Barcelona", "Real Madrid CF", "Atlético Madrid", "AS Roma"],
    SA: ["Inter Milan", "AC Milan", "Juventus", "AS Roma"],
    CL: ["AS Roma", "Manchester City FC", "Paris Saint-Germain"]
  }
};
const masterMemo = { sig: null, list: null, normSet: null };
function masterTeamList() {
  const seen = new Set();
  const out = [];
  for (const list of Object.values(CONFIG.BIG_TEAMS_BY_LEAGUE)) {
    for (const t of list) {
      if (!seen.has(t)) { seen.add(t); out.push(t); }
    }
  }
  masterMemo.list = out;
  masterMemo.normSet = new Set(out.map(normalizeTeamName));
  masterMemo.sig = CONFIG.BIG_TEAMS_BY_LEAGUE;
  return out;
}
eval([
  grabVarBalanced("TRUE_DUEL_ELITE"),
  grabFn("function isTrueBigDuel(match)"),
  grabVarBalanced("DERBY_PAIRS"),
  grabVarBalanced("DERBY_NORM"),
  grabFn("function isDerby(match)"),
  grabVarBalanced("RIVALRY_PAIRS"),
  grabVarBalanced("RIVALRY_NORM"),
  grabFn("function rivalryName(match, lang, allowUcl)"),
  grabFn("function specialBanner(match, lang)")
].join("\n"));

const m = (h, a, code) => ({ homeTeam: { name: h }, awayTeam: { name: a }, competition: { code } });
const BIG_FA = "\u062F\u0648\u0626\u0644 \u0628\u0632\u0631\u06AF \u0644\u06CC\u06AF \u0642\u0647\u0631\u0645\u0627\u0646\u0627\u0646 \u0627\u0631\u0648\u067E\u0627\u0654";

// ---------- 1) isTrueBigDuel: the curated elite list ----------
check("true duel: City\u2013PSG (FD legal names)", isTrueBigDuel(m("Manchester City FC", "Paris Saint-Germain", "CL")) === true);
check("true duel: City\u2013PSG (short spellings, PSG alias)", isTrueBigDuel(m("Manchester City", "PSG", "CL")) === true);
check("true duel: Bar\u00E7a\u2013Real", isTrueBigDuel(m("FC Barcelona", "Real Madrid CF", "CL")) === true);
check("true duel: Real\u2013Bayern", isTrueBigDuel(m("Real Madrid", "FC Bayern M\u00FCnchen", "CL")) === true);
check("true duel: Madonnina clubs are both elite", isTrueBigDuel(m("AC Milan", "FC Internazionale Milano", "CL")) === true);
check("true duel: Juventus\u2013Inter (FD legal names)", isTrueBigDuel(m("Juventus", "FC Internazionale Milano", "CL")) === true);
check("true duel: Arsenal\u2013Chelsea (unnamed elite pairing)", isTrueBigDuel(m("Arsenal FC", "Chelsea FC", "CL")) === true);
// THE REPORT: Real\u2013Roma must NOT be a big duel (Roma = second grade).
check("NOT a true duel: Real\u2013Roma (the 2026-10-14 report)", isTrueBigDuel(m("Real Madrid CF", "AS Roma", "CL")) === false);
check("NOT a true duel: Roma\u2013City (one side second grade)", isTrueBigDuel(m("AS Roma", "Manchester City FC", "CL")) === false);
check("NOT a true duel: Der Klassiker clubs (Dortmund second grade \u2014 code name is its promotion)", isTrueBigDuel(m("FC Bayern M\u00FCnchen", "Borussia Dortmund", "CL")) === false);
check("NOT a true duel: Madrid derby (Atl\u00E9tico second grade)", isTrueBigDuel(m("Club Atl\u00E9tico de Madrid", "Real Madrid CF", "CL")) === false);
check("NOT a true duel: A-League bigs never reach the UCL banner", isTrueBigDuel(m("Melbourne Victory", "Sydney FC", "CL")) === false);
// Settings-proof: with Roma installed in EVERY league of the master config
// (the live settings shape), the verdict must not move.
masterTeamList();
check("settings-proof: a settings-added Roma still makes NO big duel", isTrueBigDuel(m("Real Madrid CF", "AS Roma", "CL")) === false && isTrueBigDuel(m("AS Roma", "Lazio", "CL")) === false);
check("settings-proof: City\u2013PSG stays a big duel under any settings", isTrueBigDuel(m("Manchester City FC", "Paris Saint-Germain", "CL")) === true);

// ---------- 2) specialBanner: the 2026-10-14 night, replayed ----------
// City\u2013PSG — the month's marquee: big-duel line, no derby tag.
const bCityPsgFa = specialBanner(m("Manchester City FC", "Paris Saint-Germain", "CL"), "fa");
check("banner fa: City\u2013PSG carries the big-duel line", bCityPsgFa.indexOf(BIG_FA) > -1);
check("banner fa: City\u2013PSG has NO derby tag (not a pairing)", bCityPsgFa.indexOf("\u062F\u0631\u0628\u06CC") === -1);
check("banner en: City\u2013PSG = Champions League blockbuster", specialBanner(m("Manchester City FC", "Paris Saint-Germain", "CL"), "en").indexOf("Champions League blockbuster") > -1);
// Real\u2013Roma — the false positive of 2026-10-14: NOTHING now.
check("banner fa: Real\u2013Roma is banner-free (the fix)", specialBanner(m("Real Madrid CF", "AS Roma", "CL"), "fa") === "");
check("banner en: Real\u2013Roma is banner-free", specialBanner(m("Real Madrid CF", "AS Roma", "CL"), "en") === "");
// Bar\u00E7a\u2013Real in the UCL: the CODE NAME promotes (allowUcl) AND the
// big-duel line rides along — code name first.
const bClasicoCl = specialBanner(m("FC Barcelona", "Real Madrid CF", "CL"), "fa");
check("banner fa: UCL Cl\u00E1sico promotes \u0627\u0644 \u06A9\u0644\u0627\u0633\u06CC\u06A9\u0648 (the code-name ask)", bClasicoCl.indexOf("\u0627\u0644 \u06A9\u0644\u0627\u0633\u06CC\u06A9\u0648") > -1);
check("banner fa: UCL Cl\u00E1sico ALSO carries the big-duel line", bClasicoCl.indexOf(BIG_FA) > -1);
check("banner fa: code name leads the big-duel line", bClasicoCl.indexOf("\u0627\u0644 \u06A9\u0644\u0627\u0633\u06CC\u06A9\u0648") < bClasicoCl.indexOf(BIG_FA));
check("banner en: UCL Cl\u00E1sico = El Cl\u00E1sico + blockbuster", (function (b) { return b.indexOf("El Cl\u00E1sico") > -1 && b.indexOf("Champions League blockbuster") > -1; })(specialBanner(m("FC Barcelona", "Real Madrid CF", "CL"), "en")));
// Klassiker in the UCL: code name only (Dortmund second grade \u2192 no big-duel line).
const bKlassikerCl = specialBanner(m("FC Bayern M\u00FCnchen", "Borussia Dortmund", "CL"), "fa");
check("banner fa: UCL Klassiker promotes \u06A9\u0644\u0627\u0633\u06CC\u06A9\u0631 \u0622\u0644\u0645\u0627\u0646", bKlassikerCl.indexOf("\u06A9\u0644\u0627\u0633\u06CC\u06A9\u0631 \u0622\u0644\u0645\u0627\u0646") > -1);
check("banner fa: UCL Klassiker carries NO big-duel line", bKlassikerCl.indexOf("\u062F\u0648\u0626\u0644") === -1);
// Madonnina in the UCL: both elite \u2192 code name + big duel.
const bMadonninaCl = specialBanner(m("AC Milan", "Inter Milan", "CL"), "fa");
check("banner fa: UCL Madonnina promotes \u062F\u0631\u0628\u06CC \u0645\u06CC\u0644\u0627\u0646", bMadonninaCl.indexOf("\u062F\u0631\u0628\u06CC \u0645\u06CC\u0644\u0627\u0646") > -1);
check("banner fa: UCL Madonnina also a big duel (both elite)", bMadonninaCl.indexOf(BIG_FA) > -1);
// Capitale in the UCL: code name promotes even for a non-elite derby.
check("banner fa: UCL Capitale promotes \u062F\u0631\u0628\u06CC \u0631\u0645 (no big-duel line)", (function (b) { return b.indexOf("\u062F\u0631\u0628\u06CC \u0631\u0645") > -1 && b.indexOf("\u062F\u0648\u0626\u0644") === -1; })(specialBanner(m("AS Roma", "SS Lazio", "CL"), "fa")));
// Domestic (non-CL) banners: code names only, never the big-duel line.
check("banner fa: La Liga Madrid derby promotes \u062F\u0631\u0628\u06CC \u0645\u0627\u062F\u0631\u06CC\u062F", specialBanner(m("Club Atl\u00E9tico de Madrid", "Real Madrid CF", "PD"), "fa").indexOf("\u062F\u0631\u0628\u06CC \u0645\u0627\u062F\u0631\u06CC\u062F") > -1);
check("banner fa: Merseyside promotes \u062F\u0631\u0628\u06CC \u0645\u0631\u0633\u06CC\u200C\u0633\u0627\u06CC\u062F", specialBanner(m("Everton FC", "Liverpool FC", "PL"), "fa").indexOf("\u062F\u0631\u0628\u06CC \u0645\u0631\u0633\u06CC\u200C\u0633\u0627\u06CC\u062F") > -1);
check("banner fa: Serie A Derby d'Italia promotes \u062F\u0631\u0628\u06CC \u0627\u06CC\u062A\u0627\u0644\u06CC\u0627", specialBanner(m("Juventus", "FC Internazionale Milano", "SA"), "fa").indexOf("\u062F\u0631\u0628\u06CC \u0627\u06CC\u062A\u0627\u0644\u06CC\u0627") > -1);
check("banner en: North West Derby keeps its name", specialBanner(m("Liverpool FC", "Manchester United FC", "PL"), "en").indexOf("North West Derby") > -1);
// A marquee-vs-rest UCL game (LASK\u2013Liverpool, the 2026-10-14 slate): nothing.
check("banner fa: LASK\u2013Liverpool is banner-free (leave the rest as they are)", specialBanner(m("LASK", "Liverpool FC", "CL"), "fa") === "");
check("banner fa: a plain league game is banner-free", specialBanner(m("Levante UD", "FC Barcelona", "PD"), "fa") === "");
// MarkdownV2 lint: no unescaped reserved characters ride along with the
// new names (El Derbi Madrile\u00F1o, Derby d'Italia\u2026).
const allBanners = [bCityPsgFa, bClasicoCl, bKlassikerCl, bMadonninaCl,
  specialBanner(m("Club Atl\u00E9tico de Madrid", "Real Madrid CF", "PD"), "en"),
  specialBanner(m("Juventus", "FC Internazionale Milano", "SA"), "en"),
  specialBanner(m("Everton FC", "Liverpool FC", "PL"), "en")].join("\n");
check("banner lint: no MarkdownV2 reserved chars in any banner", !/[\[\]\(\)~`>#+\-=|{}\.!_]/.test(allBanners));
check("banner lint: code-name lines are bolded (\u2694\uFE0F *name*)", /^\u2694\uFE0F \*[^*]+\*$/.test(bClasicoCl.split("\n")[0]));

// ---------- 3) source wiring pins ----------
const bannerSlice = src.slice(src.indexOf("function specialBanner(match, lang)"), src.indexOf("function specialBanner(match, lang)") + 1600);
check("wiring: specialBanner no longer consults isMasterPair", !/isMasterPair/.test(bannerSlice));
check("wiring: specialBanner calls isTrueBigDuel", bannerSlice.indexOf("isTrueBigDuel") > -1);
check("wiring: the banner passes allowUcl to rivalryName", bannerSlice.indexOf('"fa", true') > -1);
const cardSrc = require("fs").readFileSync(__dirname + "/../src/card.ts", "utf8");
check("wiring: card tag passes allowUcl (UCL cards promote code names)", cardSrc.indexOf('rivalryName(match, "en", true)') > -1 && cardSrc.indexOf('rivalryName(match, en ? "en" : "fa", true)') > -1);
const pmSrc = require("fs").readFileSync(__dirname + "/../src/public-matches.ts", "utf8");
check("wiring: site payload keeps the DEFAULT rivalryName (v13.51 UCL suppression intact)", pmSrc.indexOf('rivalry: rivalryName(m, "en") || null') > -1 && pmSrc.indexOf('rivalryFa: rivalryName(m, "fa") || null') > -1);
check("wiring: TRUE_DUEL_ELITE is Roma-free / Dortmund-free / Atl\u00E9tico-free", !/Roma|Dortmund|Atl/.test(grabVarBalanced("TRUE_DUEL_ELITE")));

console.log(failed ? failed + " FAILURES" : "true-duel invariants OK (" + passed + " checks)");
process.exit(failed ? 1 : 0);
