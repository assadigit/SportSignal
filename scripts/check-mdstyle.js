// check-mdstyle.js — v13.106-mdstyle / v13.107-plaintimes: the MarkdownV2
// rich-formatting gate.
//
// Every styled message surface, BEHAVIORALLY: build the REAL message from
// the concatenated worker source, prove it parses under the shared
// entity-aware validator (scripts/lib/mdv2.js), and assert the intended
// entity is present (bold match header / italic competition label) while
// match-day TIMES and DATES render PLAIN (v13.107: no code span, no italic
// — the user's readability ask). FAIL-FORM by construction:
//   - an unescaped reserved char anywhere outside code spans = red build
//   - a missing entity (a "styled" surface that lost its styling) = red build
//   - an adversarial team name breaking an entity span = red build
//
// Surfaces covered (the v13.106 inventory):
//   1. src/md.ts unit semantics (escape/bold/italic/code roundtrips)
//   2. composer formatters: 24h / bigmatch / 3h / 1h / 5min / match-start /
//      result — fa + en, including ADVERSARIAL team names (parens, dots,
//      dashes, underscores)
//   3. digest-morning / digest-night / digest-uclnight / digest-weekly
//   4. notify-status: HT alert + postponement/cancellation alert
//   5. users.ts BOT_STRINGS welcome (fa + en) — bold title, referral links
//   6. bot.ts /help (code-span commands) + /next (bold teams, italic comp,
//      PLAIN date+time) through the REAL message command chain
//   7. source contracts: every sender still pins parse_mode MarkdownV2;
//      the UCL GIF caption stays plain (the v13.96.1 lesson); md.ts is
//      registered in the harness concat after utils.ts
//
// NOTE: no "use strict" — the sloppy-mode eval leaks grabbed function
// declarations to module scope (the check-weekly-tables pattern).
const fs = require("fs");
const src = require("./lib/worker-src")();
const { mdv2Safe, mdv2Entities } = require("./lib/mdv2");

let failed = 0;
const check = (name, cond) => {
  console.log((cond ? "OK   " : "FAIL ") + name);
  if (!cond) failed++;
};

// --- string-aware brace-balanced slice (template literals + regexes safe) ---
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

// =====================================================================
// 0) the md.ts unit (REAL source, eval'd together)
// =====================================================================
eval([
  // the md module's escape-regex vars (line grabs — the functions below
  // close over them)
  (src.match(/var MDV2_RESERVED = "[^"]*";/) || ["FAIL-MDV2-RESERVED"])[0],
  (src.match(/var MDV2_ESCAPE_SRC = [^\n]*;/) || ["FAIL-MDV2-SRC"])[0],
  (src.match(/var MDV2_ESCAPE_RE = [^\n]*;/) || ["FAIL-MDV2-RE"])[0],
  grabFn("function mdEscape(text)"),
  grabFn("function mdBold(text)"),
  grabFn("function mdItalic(text)"),
  grabFn("function mdCode(text)")
].join("\n"));

const ADV = "Ali (X). B-Team_FC ~q~ >gt #h +p -d =e |p {c} [x] !i `bt` \\bs *s";
const escAdv = mdEscape(ADV);
check("mdEscape escapes EVERY reserved char (incl * ` backslash)", mdv2Safe(escAdv) && escAdv.includes("\\(") && escAdv.includes("\\.") && escAdv.includes("\\*") && escAdv.includes("\\`"));
check("mdEscape roundtrips (strip escapes = original)", escAdv.replace(/\\(.)/g, "$1") === ADV);
check("mdBold wraps ESCAPED content", mdBold("Arsenal (X)") === "*Arsenal \\(X\\)*" && mdv2Safe(mdBold("Ali (X).")));
check("mdItalic wraps ESCAPED content", mdItalic("Champions League — League Phase") === "_Champions League — League Phase_" && mdv2Safe(mdItalic("B. Team (X)")));
check("mdCode keeps content RAW", mdCode("19:00") === "`19:00`" && mdCode("13.106-mdstyle") === "`13.106-mdstyle`");

// the validator itself, FAIL-FORM (the parse-400 graveyard shapes)
check("validator FAILS a raw paren (v13.90 roster shape)", !mdv2Safe("تهران (پیش‌فرض)"));
check("validator FAILS a raw dot (v13.90 status shape)", !mdv2Safe("13.105-membersearch"));
check("validator FAILS a raw > (v13.71 panel shape)", !mdv2Safe("/broadcast <متن>"));
check("validator FAILS an unclosed bold", !mdv2Safe("*bold text"));
check("validator FAILS an unclosed code span", !mdv2Safe("`19:00"));
check("validator FAILS an unclosed italic", !mdv2Safe("_italic text"));
check("validator FAILS a trailing lone backslash", !mdv2Safe("text\\"));
check("validator passes a fully-escaped body", mdv2Safe("سلام \\(تست\\)\\."));
check("validator passes bold + code + italic composition", mdv2Safe("*آرسنال* \\u2014 `۲۱:۰۰` \\u2014 _لیگ قهرمانان_"));

// =====================================================================
// 1) the composer formatters (fa + en + adversarial identities)
// =====================================================================
// the module-scope CONFIG: eval'd grabbed functions resolve THIS (module
// scope shadows globalThis for sloppy eval) — every key they read is here.
const CONFIG = {
  KV_STANDINGS_CACHE: "standings_cache_", KV_STANDINGS_SNAP: "standings_snap_",
  KV_MATCHES_KEY: "matches_v13_tracked", KV_MATCH_STATUS: "match_status_v1",
  WEEK_AHEAD_DAYS: 7,
  BIG_TEAMS_BY_LEAGUE: { PL: ["Arsenal FC", "Liverpool FC"] }
};
const COMP_EN = { PL: "Premier League", BL1: "Bundesliga", CL: "Champions League" };
const STAGE_FA = { GROUP_STAGE: "مرحله گروهی" };
function toFaDigits(s) { return String(s).replace(/[0-9]/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[+d]); }
function getJalaliDate() { return "سه‌شنبه ۲۱ مهر ۱۴۰۵"; }
// Tehran-aware stubs: the digest builders format times through the REAL
// Intl, so the stubs must agree with the fixture instants (17:30Z = 21:00,
// 16:45Z = 20:15, 19:00Z = 22:30 Tehran).
function getJalaliTime(d) { const t = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Tehran" }).format(new Date(d)); return toFaDigits(t); }
function getEnglishDate() { return "Tuesday, 13 October 2026"; }
function getEnglishTime(d) { return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Tehran" }).format(new Date(d)); }
function enStageName(s) { return s ? "Group stage" : null; }
function translateTeam(n) { return n; }
function translateCompetition(c) { return COMP_EN[c] || c; }
function translateVenue(v) { return v; }
function isDomesticCup() { return false; }
function isDerby() { return false; }
function rivalryName() { return null; }
function isTrueBigDuel() { return false; }
function isMasterPair() { return false; }
function normAlias(n) { return String(n || "").toLowerCase().replace(/\s+/g, ""); }
async function fetchStandings() { return null; }
async function standingsLine() { return null; }
function faStageName() { return null; }
const kv = { async get() { return null; }, async put() { }, async delete() { } };
const env = { STATE: kv, TEHRAN_TZ: "Asia/Tehran", API_TOKEN: "x" };

// escapeMarkdownCharacters: local stub with the EXACT source semantics
// (the utils regex carries a raw backtick in its char class — the slicer
// treats that as a template opener, so the established pattern — used by
// check-composers — is a local twin; the md.ts entities are the REAL grabs).
function escapeMarkdownCharacters(s) { return String(s).replace(/([\[\]\(\)~`>#+\-=|{}\.!_])/g, "\\$1"); }
eval([
  grabFn("function format24HourMessage(match, env, lang)"),
  grabFn("function formatBigMatchMessage(match, env, lang)"),
  grabFn("function format3HourMessage(match, env, lang)"),
  grabFn("function format1HourMessage(match, env, lang)"),
  grabFn("function format5MinMessage(match, env, lang)"),
  grabFn("function formatMatchStartMessage(match, env, lang)"),
  grabFn("async function formatResultMessage(match, env, lang)"),
  grabFn("async function appendTableOrPhase(env, match, message, lang)"),
  grabFn("function specialBanner(match, lang)")
].join("\n"));

// kickoff ~3 days ahead at 17:30Z (= 21:00 Tehran): inside every window the
// gated builders check (/next's future filter, week-ahead's WEEK_AHEAD_DAYS)
// while the Tehran-aware time stubs keep rendering ۲۱:۰۰ / 21:00.
const ko = new Date(Date.now() + 3 * 864e5);
ko.setUTCHours(17, 30, 0, 0);
const faMatch = {
  id: 561001,
  homeTeam: { name: "Arsenal FC" },
  awayTeam: { name: "FC Barcelona" },
  competition: { code: "PL" },
  utcDate: ko.toISOString(),
  status: "SCHEDULED",
  stage: "REGULAR_SEASON",
  score: { fullTime: { home: null, away: null } }
};
const finMatch = Object.assign({}, faMatch, { status: "FINISHED", score: { fullTime: { home: 2, away: 1 } } });
// the adversarial twin: every reserved char a provider name could carry
const advMatch = Object.assign({}, faMatch, {
  id: 561002,
  homeTeam: { name: "Ali (X). United" },
  awayTeam: { name: "B-Team_FC" },
  competition: { code: "CL" },
  stage: "GROUP_STAGE"
});

(function composerGates() {
  const surfaces = [
    ["24h", format24HourMessage(faMatch, env, "fa")],
    ["bigmatch", formatBigMatchMessage(faMatch, env, "fa")],
    ["3h", format3HourMessage(faMatch, env, "fa")],
    ["1h", format1HourMessage(faMatch, env, "fa")],
    ["5min", format5MinMessage(faMatch, env, "fa")],
    ["match-start", formatMatchStartMessage(faMatch, env, "fa")]
  ];
  for (const [name, msg] of surfaces) {
    const ent = mdv2Entities(msg);
    check(name + " (fa) parses under the entity-aware gate", mdv2Safe(msg));
    check(name + " (fa) match header is ONE BOLD span with both teams", ent.bold.length >= 1 && ent.bold.some((b) => b.includes("Arsenal FC") && b.includes("FC Barcelona")));
    check(name + " (fa) kickoff time is PLAIN text — no code span (v13.107)", msg.includes("⏰ ۲۱:۰۰") && ent.code.length === 0);
    check(name + " (fa) competition label is ITALIC", ent.italic.length >= 1 && ent.italic.some((c) => c.includes("Premier League")));
    check(name + " (fa) date line is PLAIN + first — no italic (v13.107)", msg.startsWith("📅 سه‌شنبه ۲۱ مهر ۱۴۰۵") && !ent.italic.some((c) => c.includes("مهر")));
  }
  // en mirror (one surface deep — the rhythm is lang-independent)
  const en24 = format24HourMessage(faMatch, env, "en");
  check("24h (en) parses + entities (bold/italic) + PLAIN time (v13.107)", mdv2Safe(en24) && mdv2Entities(en24).bold.some((b) => b.includes("Arsenal FC")) && en24.includes("⏰ 21:00") && mdv2Entities(en24).code.length === 0 && mdv2Entities(en24).italic.some((c) => c.includes("Premier League")));
  // the adversarial identity: entities must wrap the ESCAPED name
  const adv = formatBigMatchMessage(advMatch, env, "fa");
  const advEnt = mdv2Entities(adv);
  check("adversarial team names parse inside entities (parens/dots/underscore)", mdv2Safe(adv));
  check("adversarial bold span carries the escaped name", advEnt.bold.some((b) => b.includes("Ali \\(X\\)\\.") && b.includes("B\\-Team\\_FC")));
  check("adversarial italic comp/stage parse-safe", advEnt.italic.some((c) => c.includes("Champions League")) && mdv2Safe(adv));
})();

(async () => {
  // the result card
  const res = await formatResultMessage(finMatch, env, "fa");
  const resEnt = mdv2Entities(res);
  check("result (fa) parses under the entity-aware gate", mdv2Safe(res));
  check("result head is BOLD", res.includes("*نتیجه نهایی*"));
  check("result team names are BOLD", resEnt.bold.some((b) => b.includes("Arsenal FC")) && resEnt.bold.some((b) => b.includes("FC Barcelona")));
  check("result score is a BOLD span (۲\\-۱)", resEnt.bold.some((b) => b === "۲\\-۱"));
  check("result competition is ITALIC, date is PLAIN (v13.107)", resEnt.italic.some((c) => c.includes("Premier League")) && res.includes("📅 سه‌شنبه ۲۱ مهر ۱۴۰۵") && !resEnt.italic.some((c) => c.includes("مهر")));
  const resEn = await formatResultMessage(finMatch, env, "en");
  check("result (en) parses + bold score", mdv2Safe(resEn) && mdv2Entities(resEn).bold.some((b) => b === "2\\-1"));

  // =====================================================================
  // 2) the digest builders
  // =====================================================================
  // --- morning digest ---
  eval([
    grabFn("async function buildMorningDigestMessage(env, matches, lang)")
  ].join("\n"));
  const morning = await buildMorningDigestMessage(env, [faMatch, finMatch], "fa");
  const mEnt = mdv2Entities(morning);
  check("morning digest (fa) parses", mdv2Safe(morning));
  check("morning digest header is BOLD", morning.includes("*بازی‌های بزرگ امروز:*"));
  check("morning digest lines: bold teams + PLAIN time + italic comp (v13.107)", mEnt.bold.some((b) => b.includes("Arsenal FC")) && morning.includes("۲۱:۰۰") && mEnt.code.length === 0 && mEnt.italic.some((c) => c.includes("Premier League")));

  // --- night digest (rankCache prefilled -> zero standings fetches) ---
  // untype strips the inner TS annotations (let msg: string) the plain
  // eval can't parse (the check-nightdigest idiom). The module-level deps
  // (ftScore/teamRank/findTeamRow + the Jalali calendar arrays) are grabbed
  // alongside — the same idiom check-nightdigest uses.
  const untype = (x) => x.replace(/:\s*(string|number|boolean|any|Date|Map<[^>]*>)(\[\])?/g, "").replace(/\?([,)])/g, "$1");
  globalThis.userFollowsMatch = (prefs, chatId, m) => (m.homeTeam.name === "Arsenal FC" ? "one" : null);
  globalThis.userFollowsSides = () => ({ home: true, away: false });
  globalThis.priorityTier = () => 1;
  eval([
    (src.match(/var JALALI_MONTHS_FA = \[[\s\S]*?\];/) || [""])[0],
    (src.match(/var WEEKDAYS_FA = \[[^\]]*\];/) || [""])[0],
    (src.match(/var WEEKDAYS_EN = \[[^\]]*\];/) || [""])[0],
    (src.match(/var MONTHS_EN = \[[^\]]*\];/) || [""])[0],
    grabFn("function toJalaliParts(gy, gm, gd)"),
    grabFn("function jalaliDateFa(y, m, d)"),
    grabFn("function englishDateYmd(y, m, d)"),
    untype(grabFn("function ftScore(m)")),
    untype(grabFn("async function teamRank(env, code")),
    untype(grabFn("function findTeamRow(data")),
    // v13.110-digitfold: the builder now collapses same-pairing duplicates
    // (the 2026-10-16 double Frankfurt–Köln line). collapsePairings calls
    // normalizeTeamName — injected as the REAL module fold under a UNIQUE
    // scoped name so the later globalThis.normalizeTeamName stubs (the
    // notify-status + bot sections) stay authoritative for their own
    // direct-eval consumers.
    "var __nightCollapseNorm = require('../src/teams.ts').normalizeTeamName;",
    untype(grabFn("function collapsePairings(list)")).replace(/normalizeTeamName/g, "__nightCollapseNorm"),
    // v13.113-cupcover: the elimination section renderer rides the same
    // eval scope (its free refs — translateTeam/translateCompetition/
    // toFaDigits/escapeMarkdownCharacters/mdItalic — resolve through this
    // module scope at call time).
    untype(grabFn("function renderEliminationSection(eliminations, en)")),
    untype(grabFn("async function buildNightDigestMessage(env, nightMatches, lang, prefs, chatId, rankCache, nightYmd, eliminations)"))
  ].join("\n"));
  // v13.113-cupcover: the builder's elimKeys computation (which rows the
  // elimination section owns) reads normalizeTeamName — resolved at CALL
  // time through this stub (the REAL fold rides collapsePairings as
  // __nightCollapseNorm; identical to the notify-status section's stub).
  globalThis.normalizeTeamName = (n) => String(n || "").toLowerCase();
  const prefs = { "42": { lang: "fa", teams: ["Arsenal FC"] } };
  const rankCache = new Map([["PL", null]]);
  const nightMatches = [finMatch, Object.assign({}, faMatch, { id: 561003, homeTeam: { name: "Newcastle United FC" }, awayTeam: { name: "Everton FC" }, status: "FINISHED", score: { fullTime: { home: 0, away: 3 } } })];
  const night = await buildNightDigestMessage(env, nightMatches, "fa", prefs, 42, rankCache, { y: 2026, m: 10, d: 13 });
  const nEnt = mdv2Entities(night);
  check("night digest (fa) parses", mdv2Safe(night));
  check("night digest header is BOLD with the Jalali date", night.includes("*🌙 خلاصه نتایج شب —") && nEnt.bold.some((b) => b.includes("خلاصه نتایج شب")));
  check("night digest followed-team verdict carries a BOLD team + BOLD score", nEnt.bold.some((b) => b.includes("Arsenal FC")) && nEnt.bold.some((b) => b === "۲ \\- ۱"));
  check("night digest 'نتایج شب' group label is ITALIC", nEnt.italic.some((c) => c.includes("Premier League")));
  check("night digest other-result score is BOLD", nEnt.bold.some((b) => b === "۰ \\- ۳"));

  // --- v13.113-cupcover: the elimination section through the REAL builder ---
  // the "always cover elimination cups" surface: the loser line renders
  // (❌ + ADVERSARIAL names escaped, the aggregate PLAIN-escaped fa digits),
  // the competition label is ITALIC like the results groups, the eliminated
  // pairing stays OUT of نتایج شب (one line only), and it all still parses.
  const elimMatch = Object.assign({}, advMatch, { id: 700002, competition: { code: "FA_CUP" }, stage: "3RD_ROUND", status: "FINISHED", score: { fullTime: { home: 2, away: 0 } } });
  const elimEv = { code: "FA_CUP", home: "Ali (X). United", away: "B-Team_FC", loser: "B-Team_FC", winner: "Ali (X). United", final: false, agg: { w: 3, l: 1 } };
  const rndRow = Object.assign({}, faMatch, { id: 700004, homeTeam: { name: "Newcastle United FC" }, awayTeam: { name: "Everton FC" }, status: "FINISHED", score: { fullTime: { home: 0, away: 3 } } });
  const nightElim = await buildNightDigestMessage(env, [elimMatch, rndRow], "fa", prefs, 42, rankCache, { y: 2026, m: 11, d: 7 }, [elimEv]);
  const neEnt = mdv2Entities(nightElim);
  check("night digest elimination section (fa, adversarial) parses", mdv2Safe(nightElim));
  check("night digest elimination line names the loser (حذف شد + مقابل)", nightElim.includes("حذف شد") && nightElim.includes("مقابل"));
  check("night digest elimination comp label is ITALIC with escaped content (_FA\\_CUP_)", nightElim.includes("_FA\\_CUP_"));
  check("night digest elimination aggregate renders PLAIN + fa digits (مجموع)", nightElim.includes("مجموع") && nightElim.includes("۳ \\- ۱"));
  check("night digest eliminated pairing leaves نتایج شب (the loser appears ONCE)", (nightElim.match(/B\\-Team\\_FC/g) || []).length === 1);
  check("night digest the un-followed league row still rides نتایج شب", nightElim.includes("Newcastle United FC"));

  // --- UCL night preview ---
  eval([
    grabFn("function uclPreviewLine(env, mt, lang)"),
    grabFn("function buildUclPreviewMessage(env, uclMatches, lang, y, m, d, lineBuilder)")
  ].join("\n"));
  const uclFixtures = [
    { homeTeam: { name: "Arsenal FC" }, awayTeam: { name: "Shakhtar Donetsk" }, utcDate: "2026-10-14T16:45:00Z", competition: { code: "CL" }, status: "TIMED" },
    { homeTeam: { name: "Inter Milan" }, awayTeam: { name: "FC Bayern München" }, utcDate: "2026-10-14T19:00:00Z", competition: { code: "CL" }, status: "TIMED" }
  ];
  const uclFa = buildUclPreviewMessage(env, uclFixtures, "fa", 2026, 10, 14);
  const uEnt = mdv2Entities(uclFa);
  check("UCL preview (fa) parses", mdv2Safe(uclFa));
  check("UCL preview header is BOLD", uEnt.bold.some((b) => b.includes("شب لیگ قهرمانان اروپا")));
  check("UCL preview fixture lines: BOLD teams + PLAIN time (v13.107)", uEnt.bold.some((b) => b.includes("Arsenal FC")) && uEnt.bold.some((b) => b.includes("Shakhtar Donetsk")) && uclFa.includes("۲۰:۱۵") && uEnt.code.length === 0);

  // --- week ahead ---
  const waPool = { fetchedAt: new Date().toISOString(), matches: [faMatch] };
  const waEnv = { STATE: { async get(k, arg) { if (arg === "json") return waPool; return JSON.stringify(waPool); }, async put() { } }, TEHRAN_TZ: "Asia/Tehran" };
  globalThis.CONFIG = Object.assign(globalThis.CONFIG || {}, { KV_MATCHES_KEY: "matches_v13_tracked", WEEK_AHEAD_DAYS: 7 });
  globalThis.shouldNotify = () => true;
  globalThis.shouldReport = () => true; // v13.109: buildWeekAheadMessage reads the consolidated tier
  // v13.113-alquiet: the week-ahead builder also reads the bot-silent gate
  // (AL rows never ride the robot's weekly message).
  globalThis.isBotSilentLeague = () => false;
  globalThis.isDerby = () => false;
  globalThis.isMasterPair = () => false;
  globalThis.getCachedMatches = async () => [];
  globalThis.translateTeam = translateTeam;
  globalThis.translateCompetition = translateCompetition;
  globalThis.toFaDigits = toFaDigits;
  globalThis.COMP_EN = COMP_EN;
  globalThis.escapeMarkdownCharacters = escapeMarkdownCharacters;
  globalThis.mdBold = mdBold; globalThis.mdItalic = mdItalic; globalThis.mdCode = mdCode; globalThis.mdEscape = mdEscape; // v13.107: /next's plain date+time resolve mdEscape through the new-Function chain scope
  eval([grabFn("async function buildWeekAheadMessage(env, lang)")].join("\n"));
  const wa = await buildWeekAheadMessage(waEnv, "fa");
  const wEnt = mdv2Entities(wa);
  check("week-ahead (fa) parses", mdv2Safe(wa));
  check("week-ahead header is BOLD", wa.includes("*بازی‌های هفته آینده*"));
  check("week-ahead lines: bold teams + PLAIN time + italic comp (v13.107)", wEnt.bold.some((b) => b.includes("Arsenal FC")) && wa.includes("۲۱:۰۰") && wEnt.code.length === 0 && wEnt.italic.some((c) => c.includes("Premier League")));

  // =====================================================================
  // 3) notify-status: HT + postponement (entity-styled alerts)
  // =====================================================================
  globalThis.CONFIG = Object.assign(globalThis.CONFIG, { KV_MATCH_STATUS: "match_status_v1" });
  globalThis.normalizeTeamName = (n) => String(n || "").toLowerCase();
  globalThis.getRegisteredChats = async () => [555];
  globalThis.getUserPrefs = async () => ({});
  globalThis.isMasterBigMatch = () => true;
  const HT_SENT = [];
  globalThis.sendTelegram = async (_e, text, chatId) => { HT_SENT.push({ text, chatId }); return true; };
  eval([grabFn("async function detectStatusChanges(env, matches)")].join("\n"));
  // a REAL status map (Map-backed mock): transitions need a persisted
  // prior status, exactly like the live tick cycle
  const stStore = new Map();
  const stEnv = { STATE: { async get(k, arg) { const v = stStore.get(k); if (arg === "json") return v ? JSON.parse(v) : null; return v === undefined ? null : v; }, async put(k, v) { stStore.set(k, String(v)); } } };
  const ko = new Date(Date.now() - 30 * 60e3).toISOString();
  const htMatch = { homeTeam: { name: "Real Madrid CF" }, awayTeam: { name: "Liverpool FC" }, competition: { code: "PL" }, utcDate: ko, status: "SCHEDULED", score: { fullTime: { home: 1, away: 1 } } };
  await detectStatusChanges(stEnv, [htMatch]); // tick 1: baseline SCHEDULED persisted
  htMatch.status = "PAUSED";
  await detectStatusChanges(stEnv, [htMatch]); // tick 2: SCHEDULED -> PAUSED = HT
  const ht = HT_SENT.find((s) => s.text.includes("استراحت"));
  check("HT alert sent (status transition)", !!ht);
  if (ht) {
    const hEnt = mdv2Entities(ht.text);
    check("HT alert parses under the entity-aware gate", mdv2Safe(ht.text));
    check("HT alert teams are BOLD + score is BOLD", hEnt.bold.some((b) => b.includes("Real Madrid CF") && b.includes("Liverpool FC")) && hEnt.bold.some((b) => b === "۱\\-۱"));
    check("HT alert competition is ITALIC", hEnt.italic.some((c) => c.includes("Premier League")));
  }
  const postMatch = { homeTeam: { name: "Ali (X). United" }, awayTeam: { name: "B-Team_FC" }, competition: { code: "CL" }, utcDate: ko, status: "SCHEDULED", score: { fullTime: { home: null, away: null } } };
  await detectStatusChanges(stEnv, [postMatch]); // tick 1: baseline
  postMatch.status = "POSTPONED";
  await detectStatusChanges(stEnv, [postMatch]); // tick 2: the transition
  const post = HT_SENT.find((s) => s.text.includes("به تعویق افتاد"));
  check("postponement alert sent with adversarial names", !!post && mdv2Safe(post.text));
  if (post) {
    const pEnt = mdv2Entities(post.text);
    check("postponement alert teams BOLD + comp ITALIC (adversarial parse-safe)", pEnt.bold.some((b) => b.includes("Ali \\(X\\)\\.")) && pEnt.italic.some((c) => c.includes("Champions League")));
  }

  // =====================================================================
  // 4) BOT_STRINGS welcome (fa + en): bold title + referral links
  // =====================================================================
  const bsStart = src.indexOf("var BOT_STRINGS = {");
  const bsEnd = src.indexOf("function userFollowsMatch", bsStart);
  const botStrApi = new Function(src.slice(bsStart, bsEnd) + "\n; return { botStr };")();
  for (const lang of ["fa", "en"]) {
    const wl = botStrApi.botStr(lang, "start_welcome");
    const wlEnt = mdv2Entities(wl);
    check(lang + " welcome parses under the entity-aware gate", mdv2Safe(wl));
    check(lang + " welcome title is a BOLD entity", wlEnt.bold.length >= 1 && (lang === "fa" ? wlEnt.bold[0].includes("به SportSignal خوش آمدید") : wlEnt.bold[0].includes("Welcome to SportSignal")));
    check(lang + " welcome keeps both referral links", wl.includes("https://t\\.me/SportSignalAlertsBot") && wl.includes("football\\.sportsignal\\.ir"));
    check(lang + " lang_set parses", mdv2Safe(botStrApi.botStr(lang, "lang_set")));
  }

  // =====================================================================
  // 5) /help + /next through the REAL message command chain
  // =====================================================================
  const usStart = src.indexOf("// ===== src/user-store.ts =====");
  const usEnd = src.indexOf("// ===== src/users.ts =====");
  const userStoreSrc = src.slice(usStart, usEnd);
  const bs2Start = src.indexOf("var BOT_STRINGS = {");
  const bs2End = src.indexOf("function userFollowsMatch", bs2Start);
  const botStrSrc = src.slice(bs2Start, bs2End).replace(/\n\s*$/, "");
  const bldStart = src.indexOf("// v13.49-buttons: shared message builders");
  const bldEnd = src.indexOf("async function handleTelegramUpdate");
  const buildersSrc = src.slice(bldStart, bldEnd);
  const chainStart = src.indexOf('if (text === "/start") {');
  const chainEnd = src.indexOf('} catch (error) {', chainStart);
  const msgChain = src.slice(chainStart, chainEnd).replace(/\n\s*$/, "");

  function makeStore() {
    const m = new Map();
    return {
      async get(k, arg) { const v = m.get(k); if (arg === "json") return v ? JSON.parse(v) : null; return v === undefined ? null : v; },
      async put(k, v) { m.set(k, v); },
      async delete(k) { m.delete(k); }
    };
  }
  const STUB_TEAMS = ["Alpha FC", "Beta SC", "Gamma United"];
  let sent = [];
  globalThis.CONFIG = { KV_USERS_KEY: "telegram_users_v6", KV_USER_PREFS: "user_prefs_v1", KV_USER_PROFILES: "user_profiles_v1", KV_MATCHES_KEY: "matches_v13_tracked" };
  globalThis.masterTeamList = () => STUB_TEAMS;
  globalThis.normalizeTeamName = (n) => String(n);
  globalThis.translateTeam = (n) => String(n);
  globalThis.translateCompetition = (c) => String(c);
  globalThis.replyKeyboard = (lang) => ({ keyboard: [], resize_keyboard: true });
  globalThis.normalizeCommand = (text) => text;
  globalThis.sendTelegram = async (_e, msg, id, kb) => { sent.push({ msg, id, kb }); return true; };
  globalThis.getUserPrefs = async (e) => (await e.STATE.get(globalThis.CONFIG.KV_USER_PREFS, "json")) || {};
  globalThis.getRegisteredChats = async (e) => { const raw = await e.STATE.get(globalThis.CONFIG.KV_USERS_KEY); return raw ? JSON.parse(raw) : []; };
  globalThis.applySettings = async () => ({});
  globalThis.shouldNotify = () => true;
  globalThis.shouldReport = () => true; // v13.109: the /next filter reads the consolidated tier
  globalThis.userFollowsMatch = () => "both";
  globalThis.getUserTz = (p, c, e) => (p[String(c)] && p[String(c)].tz) || e.TEHRAN_TZ;
  globalThis.getJalaliDate = getJalaliDate;
  globalThis.getJalaliTime = getJalaliTime;
  globalThis.getEnglishDate = getEnglishDate;
  globalThis.getEnglishTime = getEnglishTime;

  const handler = new Function("text", "chatId", "env", "return (async () => { " + botStrSrc + "\n" + buildersSrc + "\n" + userStoreSrc + "\n" + msgChain + "\n })();");

  // /help — fa
  let hEnv = { STATE: makeStore(), BOT_TOKEN: "t", CHAT_ID: "0", TEHRAN_TZ: "Asia/Tehran" };
  await hEnv.STATE.put(globalThis.CONFIG.KV_USER_PREFS, JSON.stringify({ "42": { lang: "fa" } }));
  sent = [];
  await handler("/help", 42, hEnv);
  const helpFa = sent.length === 1 ? sent[0].msg : "";
  const hfEnt = mdv2Entities(helpFa);
  check("/help (fa) parses under the entity-aware gate", !!helpFa && mdv2Safe(helpFa));
  check("/help (fa) header is BOLD", helpFa.includes("*راهنما*"));
  check("/help (fa) commands are MONOSPACE code spans", hfEnt.code.filter((c) => c.startsWith("/")).length >= 10 && hfEnt.code.includes("/start") && hfEnt.code.includes("/featured"));
  check("/help (fa) keeps the command-label layout", helpFa.includes("\\-"));
  // /help — en
  await hEnv.STATE.put(globalThis.CONFIG.KV_USER_PREFS, JSON.stringify({ "42": { lang: "en" } }));
  sent = [];
  await handler("/help", 42, hEnv);
  const helpEn = sent.length === 1 ? sent[0].msg : "";
  check("/help (en) parses + code-span commands + BOLD header", !!helpEn && mdv2Safe(helpEn) && helpEn.includes("*Help*") && mdv2Entities(helpEn).code.includes("/teams"));

  // /next — fa (pool with two upcoming matches)
  const nEnv = { STATE: makeStore(), BOT_TOKEN: "t", CHAT_ID: "0", TEHRAN_TZ: "Asia/Tehran" };
  await nEnv.STATE.put(globalThis.CONFIG.KV_USER_PREFS, JSON.stringify({ "42": { lang: "fa", teams: ["Alpha FC"] } }));
  await nEnv.STATE.put(globalThis.CONFIG.KV_MATCHES_KEY, JSON.stringify({ fetchedAt: new Date().toISOString(), matches: [faMatch, finMatch] }));
  sent = [];
  await handler("/next", 42, nEnv);
  const nextFa = sent.length === 1 ? sent[0].msg : "";
  const nfEnt = mdv2Entities(nextFa);
  check("/next (fa) parses under the entity-aware gate", !!nextFa && mdv2Safe(nextFa));
  check("/next (fa) header is BOLD", nextFa.includes("*بازی‌های پیش‌رو:*"));
  check("/next (fa) lines: bold teams + italic comp + PLAIN time (v13.107)", nfEnt.bold.some((b) => b.includes("Arsenal FC")) && nfEnt.italic.some((c) => c.includes("PL")) && nextFa.includes("۲۱:۰۰") && nfEnt.code.length === 0);

  // =====================================================================
  // 6) source contracts (the formatting strategy, pinned)
  // =====================================================================
  const tgSrc = fs.readFileSync("src/telegram.ts", "utf8");
  check("sendTelegram pins parse_mode MarkdownV2", /parse_mode: "MarkdownV2"/.test(tgSrc));
  check("editMessageText pins parse_mode MarkdownV2", /parse_mode: "MarkdownV2"/.test(tgSrc));
  const animSeg = (tgSrc.match(/export async function sendAnimation[\s\S]*?\n\}/) || [""])[0];
  check("sendAnimation caption stays PLAIN (no parse_mode — the v13.96.1 lesson)", !/parse_mode/.test(animSeg));
  const harnessSrc = fs.readFileSync("scripts/lib/worker-src.js", "utf8");
  check("md.ts registered in the harness concat after utils.ts", harnessSrc.indexOf('"md.ts"') > harnessSrc.indexOf('"utils.ts"') && harnessSrc.indexOf('"md.ts"') < harnessSrc.indexOf('"teams.ts"'));
  check("every composer formatter imports the md builders (v13.107: mdEscape for plain times/dates)", /import \{ mdBold, mdItalic, mdEscape \} from "\.\/md";/.test(fs.readFileSync("src/composers.ts", "utf8")));

  console.log(failed ? failed + " FAILURES" : "mdstyle OK");
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error("ERROR", e); process.exit(1); });
