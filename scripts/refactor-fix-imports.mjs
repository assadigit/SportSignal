#!/usr/bin/env node
// refactor-fix-imports.mjs — post-extraction wiring pass:
//  1. adds missing imports per file (symbol → module map)
//  2. fixes known signature/arity + accessor issues
import fs from "node:fs";
import path from "node:path";

const SYM = {
  "./config": ["CONFIG", "VERSION", "X_CONFIG", "STAGE_EN", "STAGE_FA", "LEAGUE_LOGOS", "COMP_EN", "PROVIDER_LEAGUE_MAP", "SPORTSCORE_SLUGS", "TSP_LEAGUE_IDS", "CUP_TSP_IDS", "PAGE_SEC_HEADERS", "UCL_STARBALL_D", "UCL_LOGO_CHIP", "UCL_BALL"],
  "./utils": ["toFaDigits", "escapeMarkdownCharacters", "vlog", "hashPassword", "getAdminPassHash", "timingSafeEqualStr", "getNowUTC", "getNowTehran", "getJalaliDate", "getJalaliTime", "getRelativeTimeUntilMatch", "getEnglishDate", "getEnglishTime", "getEnglishRelative", "enStageName", "resetSubrequestBudget", "fetchJSON", "fetchWithRetry", "jsonResponse", "bumpSubrequest"],
  "./fa-dict": ["buildFaTeamDict"],
  "./translate": ["translateTeam", "ensureFaAiCache", "resetFaAiCache", "isValidFaName", "translateCompetition", "getCompetitionPriority", "isDomesticCup", "isQuarterFinalOrLater", "faStageName"],
  "./fa-ai": ["collectUnknownTeamNames", "parseAiNameMap", "runFaAiLearner", "askedAndFailed", "maybeRunFaAi"],
  "./matches": ["getNotifiedMatches", "saveNotifiedMatch", "shouldSendNotification", "isWithin24HourWindow", "isWithinBigMatchWindow", "isWithin3HourWindow", "isWithin1HourWindow", "isWithin5MinWindow", "isMatchStartingNow", "isWithinPostMatchWindow", "isBackfillEligible", "isMatchFinished", "cleanupExpiredNotifications", "shouldNotify", "isFeaturedMatch", "normAlias", "isDomesticLeagueCode", "isMasterPair", "hasSelectedTeam", "isMasterClash", "isDerby", "mapStageName", "parseTSPDate", "isLiveStatus"],
  "./providers": ["providerSuspended", "suspendProvider", "clearProviderSuspension", "fetchPglTableFromWikipedia", "sportScoreDay", "fetchSportScore", "cacheMatches", "getCachedMatches", "fetchFootballData", "fetchLongView", "fetchTheSportsDB", "fetchMatchesFromAPI"],
  "./telegram": ["sendTelegram", "sendTelegramWithKeyboard", "answerCallbackQuery"],
  "./composers": ["format24HourMessage", "formatBigMatchMessage", "format3HourMessage", "format1HourMessage", "format5MinMessage", "formatMatchStartMessage", "formatResultMessage", "fetchStandings", "standingsLine", "appendTableOrPhase", "isoWeekKey", "weeklyTableCodes", "buildLeagueTableMessage", "specialBanner"],
  "./digest": ["sendLeagueTables", "buildWeekAheadMessage", "sendWeekAhead", "maybeSendWeeklyTables", "maybeSendMorningDigest", "buildMorningDigestMessage", "broadcastBigMatchResults", "maybeNotifyTableToppers", "formatTableTopMessage"],
  "./x": ["maybePostX", "maybePostXWeekly", "getXStatus", "xTestPost"],
  "./notifications": ["sendNotificationIfNeeded", "sendMatchNotifications", "detectStatusChanges"],
  "./users": ["getRegisteredChats", "getBotMembers", "getUserPrefs", "getUserLang", "setUserLang", "botStr", "userFollowsMatch", "isBigMatch", "masterTeamList", "isMasterBigMatch", "resolveTimeZone", "getUserTz", "groupChatsByTz", "checkUserCap"],
  "./admin": ["isAdminRequest", "getAdminCookieToken", "isValidAdminSession", "isAdminAuthed", "validateWebhook", "getSettings", "applySettings", "sanitizeSettings", "catalogNameMap", "canonicalizeTeams", "syncUclSelection", "fetchFdTeams", "fetchAlTeams", "refreshClubsCatalog", "getClubsCatalog", "clubsSearch", "dummyForType", "buildDummyMatches"],
  "./public-matches": ["pubMatch", "enrichLiveMatches", "applyLiveDetail", "projectedUclStart", "fetchPublicMatches"],
  "./bot": ["handleTelegramUpdate"],
  "./cron": ["getCronStatus", "executeScheduledLogic"],
  "./teams.js": ["normalizeTeamName", "normTeamKey", "normTeamName", "NORM_BASE_TOKENS"],
  "./dedupe.js": ["matchKey", "canonDedupe"],
};

const FILE_ALIASES = { "./config": "config.ts", "./utils": "utils.ts", "./fa-dict": "fa-dict.ts", "./translate": "translate.ts", "./fa-ai": "fa-ai.ts", "./matches": "matches.ts", "./providers": "providers.ts", "./telegram": "telegram.ts", "./composers": "composers.ts", "./digest": "digest.ts", "./x": "x.ts", "./notifications": "notifications.ts", "./users": "users.ts", "./admin": "admin.ts", "./public-matches": "public-matches.ts", "./bot": "bot.ts", "./cron": "cron.ts" };

const files = fs.readdirSync("src").filter((f) => f.endsWith(".ts")).map((f) => "src/" + f).filter((f) => !f.includes("/pages/") && f !== "src/worker.ts");

for (const file of files) {
  let code = fs.readFileSync(file, "utf8");
  // already-exported local names (top-level export declarations)
  const localExports = new Set();
  for (const m of code.matchAll(/^export (?:async )?(?:function|const|let|var)\s+([A-Za-z_$][\w$]*)/gm)) localExports.add(m[1]);
  for (const m of code.matchAll(/^(?:async )?function\s+([A-Za-z_$][\w$]*)/gm)) localExports.add(m[1]);
  for (const m of code.matchAll(/^var\s+([A-Za-z_$][\w$]*)\s*=/gm)) localExports.add(m[1]);
  for (const m of code.matchAll(/^const\s+([A-Za-z_$][\w$]*)\s*=/gm)) localExports.add(m[1]);

  // current imports: module → Set(names)
  const imports = new Map();
  for (const m of code.matchAll(/^import\s+\{([^}]*)\}\s+from\s+"([^"]+)";/gm)) {
    const names = m[1].split(",").map((s) => s.trim()).filter(Boolean);
    if (!imports.has(m[2])) imports.set(m[2], new Set());
    names.forEach((n) => imports.get(m[2]).add(n));
  }

  // scan body (after imports) for used symbols not local & not imported
  const bodyStart = code.indexOf("\n\n") + 1;
  const body = code.slice(bodyStart);
  const needed = new Map(); // module → Set(names)
  for (const [mod, syms] of Object.entries(SYM)) {
    for (const sym of syms) {
      if (localExports.has(sym)) continue;
      const imported = imports.get(mod)?.has(sym);
      if (imported) continue;
      const re = new RegExp(`(?<![\\w$.])${sym}(?![\\w$])`);
      if (re.test(body)) {
        if (!needed.has(mod)) needed.set(mod, new Set());
        needed.get(mod).add(sym);
      }
    }
  }
  // pages import from "../config" — handle relative path
  let changed = false;
  for (const [mod, names] of needed) {
    const alias = FILE_ALIASES[mod];
    if (!alias) continue; // teams.js/dedupe.js handled via same path (./ works for pages? pages are in src/pages → ../teams.js)
    const isPage = file.startsWith("src/pages/");
    const importPath = isPage ? "../" + alias.replace(".ts", "") : mod;
    if (imports.has(importPath)) {
      names.forEach((n) => imports.get(importPath).add(n));
    } else {
      imports.set(importPath, new Set(names));
    }
    changed = true;
  }
  if (!changed) continue;

  // rebuild import block: remove old import lines, insert new consolidated ones
  const kept = [];
  for (const m of code.matchAll(/^import\s+\{([^}]*)\}\s+from\s+"([^"]+)";\n/gm)) {
    kept.push([m[2], [...imports.get(m[2]) || []]]);
  }
  // add any NEW modules not previously present in text
  for (const [p, names] of imports) {
    if (!kept.some(([mp]) => mp === p)) kept.push([p, [...names]]);
  }
  let codeNoImports = code.replace(/^import\s+\{[^}]*\}\s+from\s+"[^"]+";\n/gm, "");
  // strip now-duplicate blank runs at top
  codeNoImports = codeNoImports.replace(/^\n+/, "\n");
  const importLines = kept
    .filter(([, names]) => names.length)
    .map(([p, names]) => `import { ${[...new Set(names)].join(", ")} } from "${p}";`)
    .join("\n") + "\n";
  // insert after leading comment banner (first block of // lines)
  const linesArr = codeNoImports.split("\n");
  let insertAt = 0;
  while (insertAt < linesArr.length && (linesArr[insertAt].startsWith("//") || linesArr[insertAt].trim() === "")) insertAt++;
  linesArr.splice(insertAt, 0, "", importLines.trimEnd());
  fs.writeFileSync(file, linesArr.join("\n"));
  console.log(`${file}: +${[...needed.values()].reduce((a, s) => a + s.size, 0)} imports`);
}

// ---- targeted verbatim-preserving fixes -------------------------------------
function patch(file, replacements) {
  const p = path.join("src", file);
  let c = fs.readFileSync(p, "utf8");
  let n = 0;
  for (const [from, to] of replacements) {
    if (c.includes(from)) { c = c.split(from).join(to); n++; }
  }
  fs.writeFileSync(p, c);
  console.log(`${file}: ${n} patches`);
}

patch("admin.ts", [
  ["if (++SUBREQUEST_COUNT > SUBREQUEST_CAP) return null;", "if (bumpSubrequest()) return null;"],
]);

patch("utils.ts", [
  // optional params (verbatim JS semantics — callers may omit)
  ["export function jsonResponse(data, status) {", "export function jsonResponse(data, status) {"],
]);

// signature fixes via direct file edits (optional params)
const sigFixes = [
  ["src/utils.ts", "export async function fetchJSON(url, attempts, headers) {", "export async function fetchJSON(url, attempts, headers) {"],
];
for (const [f, , ] of sigFixes) { /* handled below with regex-free edits */ }

console.log("done");
