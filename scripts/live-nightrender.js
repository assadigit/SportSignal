// live-nightrender.js — v13.110-digitfold live verification: render the
// REAL buildNightDigestMessage over the LIVE production KV pool's rows for
// the Tehran night of 2026-10-16 (the exact night of the user's duplicate
// report). Uses the REAL translation layer (cold-isolate mode: static FA
// dict, no KV AI cache) so the output is the actual Persian digest text.
// The RAW pool rows are passed straight in (the worst case — the unhealed
// KV snapshot a quiet tick would read): collapsePairings must render each
// pairing ONCE.
"use strict";
const fs = require("fs");
const src = require("./lib/worker-src")();

const untype = (s) => s.replace(/:\s*(string|number|boolean|any|Date|Map<[^>]*>)(\[\])?/g, "").replace(/\?([,)])/g, "$1");
const grabSrc = (re) => {
  const m = src.match(re);
  return m ? untype(m[0]) : null;
};
// brace-balanced slicer (the check-mdstyle grabFn idiom)
function grabFn(sig) {
  const i = src.indexOf(sig);
  if (i < 0) throw new Error("missing " + sig);
  const open = src.indexOf("{", i);
  let depth = 0, j = open, state = 0, tplExprDepth = 0;
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

// pure-render stubs (no follows → everything lands in "نتایج شب")
globalThis.userFollowsMatch = () => null;
globalThis.userFollowsSides = () => ({ home: false, away: false });
globalThis.priorityTier = () => 0;
globalThis.fetchStandings = async () => null;

const pieces = [
  "(() => {",
  // utils + jalali
  grabSrc(/function toFaDigits\([^)]*\) \{[\s\S]*?\n\}/),
  grabSrc(/function escapeMarkdownCharacters\([^)]*\) \{[\s\S]*?\n\}/),
  (src.match(/var JALALI_MONTHS_FA = \[[\s\S]*?\];/) || [])[0],
  (src.match(/var WEEKDAYS_FA = \[[^\]]*\];/) || [])[0],
  (src.match(/var WEEKDAYS_EN = \[[^\]]*\];/) || [])[0],
  (src.match(/(?:const|var) MONTHS_EN = \[[^\]]*\];/) || [])[0],
  grabSrc(/function toJalaliParts\([^)]*\) \{[\s\S]*?\n\}/),
  grabSrc(/function jalaliDateFa\([^)]*\) \{[\s\S]*?\n\}/),
  grabSrc(/function englishDateYmd\([^)]*\) \{[\s\S]*?\n\}/),
  // md entities
  (src.match(/var MDV2_RESERVED = "[^"]*";/) || [])[0],
  (src.match(/var MDV2_ESCAPE_SRC = [^\n]*;/) || [])[0],
  (src.match(/var MDV2_ESCAPE_RE = [^\n]*;/) || [])[0],
  grabSrc(/function mdEscape\([^)]*\) \{[\s\S]*?\n\}/),
  grabSrc(/function mdBold\([^)]*\) \{[\s\S]*?\n\}/),
  grabSrc(/function mdItalic\([^)]*\) \{[\s\S]*?\n\}/),
  // teams (the REAL normalizer — the deployed fold)
  grabSrc(/const NORM_BASE_TOKENS[^\n]*;/) || (src.match(/var NORM_BASE_TOKENS[^\n]*;/) || [])[0],
  grabSrc(/const TRANSLIT_FOLDS = \{[\s\S]*?\n\};/) || (src.match(/var TRANSLIT_FOLDS = \{[\s\S]*?\n\};/) || [])[0],
  grabSrc(/function normTeamName\([^)]*\)[^\n]*\{[\s\S]*?\n\}/),
  grabSrc(/function normalizeTeamName\([^)]*\)[^\n]*\{[\s\S]*?\n\}/),
  grabSrc(/function normTeamKey\([^)]*\)[^\n]*\{[\s\S]*?\n\}/),
  // the REAL translation layer (cold-isolate: static dict only)
  grabSrc(/function buildFaTeamDict\(\) \{[\s\S]*?\n\}/),
  "var FA_TEAMS_DICT = null; var FA_TEAMS_NORM = null; var FA_TEAMS_STEM = null; var FA_AI_CACHE = null; var FA_AI_OVERRIDE_KEYS = null;",
  grabSrc(/function translateTeam\(englishName\) \{[\s\S]*?\n\}/),
  grabSrc(/function translateCompetition\([^)]*\) \{[\s\S]*?\n\}/),
  // digest-night
  grabSrc(/function ftScore\([^)]*\) \{[\s\S]*?\n\}/),
  grabSrc(/function collapsePairings\([^)]*\) \{[\s\S]*?\n\}/),
  grabSrc(/async function teamRank\([^)]*\) \{[\s\S]*?\n\}/),
  grabSrc(/function findTeamRow\([^)]*\) \{[\s\S]*?\n\}/),
  grabSrc(/async function buildNightDigestMessage\([^)]*\) \{[\s\S]*?\n\}/),
  "return buildNightDigestMessage;",
  "})()"
];
const missing = pieces.map((p, i) => (p ? null : i)).filter((x) => x != null);
if (missing.length) { console.error("missing pieces:", missing); process.exit(1); }
const buildNight = eval(pieces.join("\n"));

(async () => {
  const blob = JSON.parse(fs.readFileSync(process.argv[2] || "/tmp/pool2.json", "utf8"));
  const ms = blob.matches;
  console.log("pool:", blob.fetchedAt, "source:", blob.source, "rows:", ms.length);
  const OFF = 3.5 * 3600e3; // Asia/Tehran
  const want = process.argv[3] || "2026-10-16";
  const night = ms.filter((m) => {
    const t = new Date(m.utcDate).getTime();
    if (isNaN(t)) return false;
    const d = new Date(t + OFF);
    const k = d.getUTCFullYear() + "-" + String(d.getUTCMonth() + 1).padStart(2, "0") + "-" + String(d.getUTCDate()).padStart(2, "0");
    return k === want;
  });
  console.log("raw " + want + " Tehran-night rows:", night.length);
  for (const m of night) console.log("  RAW:", m.competition.code, "|", m.homeTeam.name, "vs", m.awayTeam.name, "|", m.status, "| id:", m.id);
  const msg = await buildNight({ TEHRAN_TZ: "Asia/Tehran" }, night, "fa", { "9": {} }, 9, new Map(), { y: 2026, m: 10, d: 16 });
  console.log("\n===== RENDERED NIGHT DIGEST (real builder, real FA dict) =====\n");
  console.log(msg);
  console.log("\n===== ASSERTIONS =====");
  const count = (s, re) => (s.match(re) || []).length;
  const ymd = want.split("-");
  const checks = [
    ["Frankfurt renders ONCE", count(msg, /فرانکفورت/g) === 1],
    ["کلن renders ONCE", count(msg, /کلن/g) === 1],
    ["فروزینونه renders ONCE", count(msg, /فروزینونه/g) === 1],
    ["ساسولو renders ONCE", count(msg, /ساسولو/g) === 1],
    ["header Jalali date present", msg.includes("جمعه ۲۴ مهر ۱۴۰۵")],
    ["MarkdownV2 parse-safe", require("./lib/mdv2").mdv2Safe(msg)]
  ];
  let fails = 0;
  for (const [n, ok] of checks) { console.log((ok ? "OK   " : "FAIL ") + n); if (!ok) fails++; }
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error("ERROR", e); process.exit(1); });
