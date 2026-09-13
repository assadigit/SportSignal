#!/usr/bin/env node
// refactor-extract.mjs — one-shot extraction of the bundled src/worker.ts into
// true ES modules. Line ranges are 1-indexed INCLUSIVE, verified against the
// v12.33-xpost bundle. Verbatim code moves — zero behavior change, except:
//   * rollup noise stripped (__name/__name2 decorators, import interop)
//   * `++SUBREQUEST_COUNT > SUBREQUEST_CAP` → `bumpSubrequest()` (imports are
//     read-only bindings, so the counter needs an owning-module accessor)
import fs from "node:fs";
import path from "node:path";

const SRC = "scripts/worker.bundle-v12.33.ts";
const OUT_DIR = "src";
const text = fs.readFileSync(SRC, "utf8");
const lines = text.split("\n");
const slice = (a, b) => lines.slice(a - 1, b).join("\n");

function unwrapPureName(code) {
  let out = "", i = 0;
  while (i < code.length) {
    const marker = code.indexOf("/* @__PURE__ */ __name", i);
    if (marker === -1) { out += code.slice(i); break; }
    out += code.slice(i, marker);
    let p = marker;
    while (p < code.length && code[p] !== "(") p++;
    let depth = 0, q = p, inStr = null, esc = false;
    for (; q < code.length; q++) {
      const c = code[q];
      if (esc) { esc = false; continue; }
      if (inStr) { if (c === "\\") esc = true; else if (c === inStr) inStr = null; continue; }
      if (c === '"' || c === "'" || c === "`") { inStr = c; continue; }
      if (c === "(") depth++;
      else if (c === ")") { depth--; if (depth === 0) break; }
    }
    const inner = code.slice(p + 1, q);
    let trim = inner.trimEnd();
    const m = trim.match(/,\s*"[^"]*"\s*$/);
    if (m) trim = trim.slice(0, trim.length - m[0].length);
    out += trim;
    i = q + 1;
  }
  return out;
}

function cleanServer(code) {
  let c = code;
  c = c.split("\n").filter((l) => !/^\s*__name2?\([^)]*\)\s*;?\s*$/.test(l)).join("\n");
  c = unwrapPureName(c);
  c = c.replace(/\(0,\s*import_teams\.([A-Za-z_$][\w$]*)\)/g, "$1");
  c = c.replace(/\(0,\s*import_dedupe\.([A-Za-z_$][\w$]*)\)/g, "$1");
  c = c.replace(/\bimport_teams\.([A-Za-z_$][\w$]*)/g, "$1");
  c = c.replace(/\bimport_dedupe\.([A-Za-z_$][\w$]*)/g, "$1");
  c = c.replace(/\/\* @__PURE__ \*\/ /g, "");
  // subrequest counter accessor (cross-module imports are read-only)
  c = c.replace(/if \(\+\+SUBREQUEST_COUNT > SUBREQUEST_CAP\) throw new Error\("Subrequest budget exhausted"\);/g,
    'if (bumpSubrequest()) throw new Error("Subrequest budget exhausted");');
  c = c.replace(/if \(\+\+SUBREQUEST_COUNT > SUBREQUEST_CAP\) return false;/g,
    "if (bumpSubrequest()) return false;");
  c = c.replace(/\n{3,}/g, "\n\n");
  return c.trim() + "\n";
}

// add `export` to top-level function declarations + listed consts
function addExports(code, constExports = []) {
  let c = code;
  c = c.replace(/^(async )?function /gm, (m) => "export " + m);
  for (const name of constExports) {
    c = c.replace(new RegExp(`^var ${name} = `, "m"), `export const ${name} = `);
  }
  return c;
}

const MODULES = [
  {
    file: "config.ts",
    ranges: [[107, 353], [495, 505], [1232, 1255], [1256, 1278], [2598, 2607], [3301, 3338], [4798, 4804], [1678, 1717], [1840, 1860], [2148, 2164], [5408, 5410]],
    header: `// SportSignal — central configuration & static data tables.
// Extracted verbatim from the v12.33-xpost bundle; KV keys and semantics are
// LIVE-STATE contracts — never rename casually.
export const VERSION = "12.33-xpost";
`,
    dropVersionVar: true,
    constExports: ["CONFIG", "STAGE_EN", "STAGE_FA", "LEAGUE_LOGOS", "COMP_EN", "PROVIDER_LEAGUE_MAP", "SPORTSCORE_SLUGS", "TSP_LEAGUE_IDS", "CUP_TSP_IDS", "PAGE_SEC_HEADERS", "UCL_STARBALL_D", "UCL_LOGO_CHIP", "UCL_BALL", "X_CONFIG"],
  },
  {
    file: "utils.ts",
    ranges: [[354, 494], [506, 510], [1729, 1768], [2298, 2335], [4786, 4797]],
    header: `// SportSignal — shared utilities: Persian digits, Jalali/English date-time
// localization, admin password hashing, subrequest budget, HTTP fetch helpers,
// JSON responses. Pure helpers only — no domain imports.
import { CONFIG } from "./config";

// Subrequest counter lives HERE (the owning module) — imported bindings are
// read-only, so consumers call bumpSubrequest() instead of ++SUBREQUEST_COUNT.
export function bumpSubrequest() {
  return ++SUBREQUEST_COUNT > SUBREQUEST_CAP;
}
`,
  },
  {
    file: "fa-dict.ts",
    ranges: [[515, 920]],
    header: `// SportSignal — the static Farsi team-name dictionary (layer 1 of the
// translation stack; layers 2/3 = AI-learned + admin overrides in translate.ts).
`,
  },
  {
    file: "translate.ts",
    ranges: [[511, 514], [921, 989], [1202, 1231], [1279, 1293], [2608, 2612]],
    header: `// SportSignal — team/competition translation (3-layer Farsi stack:
// admin override → AI-learned → static dict → fuzzy stem) and competition
// classification helpers. Owns the lazy dict caches + the AI-learned cache.
import { CONFIG, LEAGUE_LOGOS, COMP_EN } from "./config";
import { normTeamKey } from "./teams.js";
import { buildFaTeamDict } from "./fa-dict";
`,
  },
  {
    file: "fa-ai.ts",
    ranges: [[990, 1201]],
    header: `// SportSignal — Workers AI Farsi-name learner (layer 2 of the translation
// stack). Batches unknown Latin team names, validates Persian answers against
// the varzesh3 catalog, stores results in KV (fa_teams_ai.learned).
import { CONFIG } from "./config";
import { vlog } from "./utils";
import { normTeamKey } from "./teams.js";
import { translateTeam, resetFaAiCache } from "./translate";
`,
  },
  {
    file: "matches.ts",
    ranges: [[1294, 1550], [1551, 1587], [1588, 1677], [1718, 1728], [5105, 5110]],
    header: `// SportSignal — the match model rules: notification eligibility
// (shouldNotify), big-match/derby/master-pair classification, notification
// time windows, KV notified-match tracking, stage mapping, provider date parse.
import { CONFIG } from "./config";
import { normalizeTeamName } from "./teams.js";
import { matchKey } from "./dedupe.js";
`,
  },
  {
    file: "providers.ts",
    ranges: [[1769, 1787], [1788, 1839], [1861, 1932], [1933, 1967], [1968, 2005], [2006, 2147], [2165, 2225], [2226, 2297]],
    header: `// SportSignal — upstream data providers (football-data.org, sportscore,
// thesportsdb, Wikipedia PGL table), the multi-source merger with crest/venue
// adoption, provider circuit breaker and the KV match cache.
import { CONFIG, PROVIDER_LEAGUE_MAP, SPORTSCORE_SLUGS, TSP_LEAGUE_IDS, CUP_TSP_IDS } from "./config";
import { fetchJSON, fetchWithRetry, vlog, bumpSubrequest } from "./utils";
import { normalizeTeamName } from "./teams.js";
import { canonDedupe } from "./dedupe.js";
import { shouldNotify, isLiveStatus, mapStageName, parseTSPDate } from "./matches";
import { translateTeam } from "./translate";
import { getRegisteredChats } from "./users";
import { sendTelegram } from "./telegram";
`,
  },
  {
    file: "telegram.ts",
    ranges: [[2336, 2445]],
    header: `// SportSignal — Telegram Bot API senders with retry / 429 pause /
// dead-chat detection, plus callback_query answering.
import { CONFIG } from "./config";
import { vlog, bumpSubrequest } from "./utils";
`,
  },
  {
    file: "composers.ts",
    ranges: [[2446, 2597], [2613, 2837], [2874, 2882]],
    header: `// SportSignal — Telegram message composers (24h / big-match / 3h / 1h /
// 5min / kickoff / FT result + special banners) and the standings pipeline
// (fetch + KV cache + league-table text).
import { CONFIG, LEAGUE_LOGOS, STAGE_FA } from "./config";
import { toFaDigits, escapeMarkdownCharacters, getJalaliDate, getJalaliTime, getRelativeTimeUntilMatch, getEnglishDate, getEnglishTime, getEnglishRelative, vlog, fetchJSON } from "./utils";
import { normalizeTeamName } from "./teams.js";
import { translateTeam, translateCompetition, faStageName, enStageName, isDomesticCup } from "./translate";
import { isMatchFinished, isDomesticLeagueCode } from "./matches";
`,
  },
  {
    file: "digest.ts",
    ranges: [[2838, 2873], [2883, 3092], [3093, 3159], [3160, 3288]],
    header: `// SportSignal — scheduled digests & specials: weekly league tables,
// week-ahead fixtures, matchday morning digest, big-match FT broadcast, and
// the 👑 table-top coronation alerts.
import { CONFIG } from "./config";
import { toFaDigits, escapeMarkdownCharacters, getJalaliDate, getJalaliTime, getNowTehran, vlog } from "./utils";
import { normalizeTeamName } from "./teams.js";
import { matchKey } from "./dedupe.js";
import { translateTeam, translateCompetition } from "./translate";
import { shouldNotify, isMatchFinished, isWithinPostMatchWindow } from "./matches";
import { fetchStandings, standingsLine, buildLeagueTableMessage, specialBanner, formatResultMessage } from "./composers";
import { sendTelegram } from "./telegram";
import { getRegisteredChats, getUserPrefs, getUserLang, getUserTz, groupChatsByTz, getBotMembers } from "./users";
`,
  },
  {
    file: "x.ts",
    ranges: [[3339, 4016]],
    header: `// SportSignal — X (Twitter) automated profile: OAuth 1.0a HMAC-SHA1
// signing (crypto.subtle, no deps), budget governor, KV dedupe, 401/429/5xx
// handling, Persian post composers and the sweep orchestrator.
import { CONFIG, X_CONFIG, LEAGUE_LOGOS } from "./config";
import { vlog } from "./utils";
import { translateTeam, translateCompetition } from "./translate";
import { isMatchFinished, isWithinPostMatchWindow } from "./matches";
import { fetchStandings } from "./composers";
import { getRegisteredChats } from "./users";
`,
  },
  {
    file: "notifications.ts",
    ranges: [[3964, 4128], [4456, 4556]],
    header: `// SportSignal — the per-match notification engine: NOTIFICATION_CONFIGS
// window/formatter table, sendMatchNotifications fan-out with dead-chat
// pruning, and live status-change detection (kickoff/HT/FT events).
import { CONFIG } from "./config";
import { toFaDigits, getNowTehran } from "./utils";
import { matchKey } from "./dedupe.js";
import { translateTeam, translateCompetition } from "./translate";
import { isWithin24HourWindow, isWithinBigMatchWindow, isWithin3HourWindow, isWithin1HourWindow, isWithin5MinWindow, isMatchStartingNow, isWithinPostMatchWindow, isMatchFinished, getNotifiedMatches, saveNotifiedMatch, shouldSendNotification, cleanupExpiredNotifications, isLiveStatus } from "./matches";
import { format24HourMessage, formatBigMatchMessage, format3HourMessage, format1HourMessage, format5MinMessage, formatMatchStartMessage, formatResultMessage, standingsLine, specialBanner } from "./composers";
import { sendTelegram } from "./telegram";
import { getRegisteredChats, getUserPrefs, getUserLang, groupChatsByTz, userFollowsMatch, isBigMatch } from "./users";
`,
    constExports: ["NOTIFICATION_CONFIGS"],
  },
  {
    file: "users.ts",
    ranges: [[4129, 4218], [4225, 4339], [4340, 4455], [4557, 4577]],
    header: `// SportSignal — chat registry & user preferences: registered chats,
// bot member profiles, per-user prefs (teams / timezone / language), the
// followable master team list, tz resolution and per-tz grouping.
import { CONFIG } from "./config";
import { toFaDigits, getNowTehran } from "./utils";
import { normalizeTeamName } from "./teams.js";
import { translateTeam } from "./translate";
import { sendTelegram } from "./telegram";
`,
  },
  {
    file: "admin.ts",
    ranges: [[4578, 4611], [4806, 4918], [4919, 5039], [5040, 5086]],
    header: `// SportSignal — admin panel domain: session auth (PBKDF2 password hash +
// HttpOnly cookie sessions), bot settings (teams/leagues), the club-name
// autocomplete catalog and the /api/simulate dummy fixtures.
import { CONFIG } from "./config";
import { hashPassword, getAdminPassHash, timingSafeEqualStr, fetchJSON, vlog } from "./utils";
import { normalizeTeamName } from "./teams.js";
import { translateTeam } from "./translate";
import { shouldNotify } from "./matches";
`,
  },
  {
    file: "public-matches.ts",
    ranges: [[5087, 5104], [5111, 5160], [5161, 5407]],
    header: `// SportSignal — the public /api/public-matches pipeline: KV cache with
// refresh lock + per-IP rate limit, live enrichment (minute/scorers/venue),
// standings/cups/UCL/topSpot/week shaping and the 7-day snapshot fallback.
import { CONFIG, LEAGUE_LOGOS } from "./config";
import { vlog, fetchJSON } from "./utils";
import { normalizeTeamName } from "./teams.js";
import { matchKey } from "./dedupe.js";
import { translateTeam, translateCompetition, ensureFaAiCache } from "./translate";
import { shouldNotify, isLiveStatus, isMatchFinished } from "./matches";
import { fetchLongView, fetchStandings, getCachedMatches, providerSuspended } from "./providers";
import { applySettings } from "./admin";
`,
  },
  {
    file: "pages/public.ts",
    ranges: [[5411, 8243]],
    header: `// SportSignal — the public page template (RTL Persian UI: hero countdown,
// big-matches box, UCL card + table, standings grid, cups, live section).
// Everything between the backticks is CLIENT-side code (a string literal).
import { UCL_LOGO_CHIP, UCL_BALL } from "../config";
`,
    raw: true,
    wrap: (c) => c.trim().replace(/^var ([A-Z_]+) = /, "export const $1 = ") + "\n",
  },
  {
    file: "pages/login.ts",
    ranges: [[8244, 8320]],
    header: `// SportSignal — the /admin login page template.
`,
    raw: true,
    wrap: (c) => c.trim().replace(/^var ([A-Z_]+) = /, "export const $1 = ") + "\n",
  },
  {
    file: "pages/admin.ts",
    ranges: [[8321, 9019]],
    header: `// SportSignal — the /admin dashboard template (teams editor, broadcast,
// members, AI Farsi names, X status card, diagnostics).
`,
    raw: true,
    wrap: (c) => c.trim().replace(/^var ([A-Z_]+) = /, "export const $1 = ") + "\n",
  },
  {
    file: "bot.ts",
    ranges: [[9020, 9256]],
    header: `// SportSignal — Telegram webhook handler: /start /lang /stop /help /teams
// /follow /next /tables /timezone + callback_query language picker.
import { CONFIG } from "./config";
import { toFaDigits, escapeMarkdownCharacters, getJalaliTime, getEnglishTime } from "./utils";
import { normalizeTeamName } from "./teams.js";
import { translateTeam, translateCompetition } from "./translate";
import { shouldNotify } from "./matches";
import { fetchMatchesFromAPI } from "./providers";
import { sendTelegram, sendTelegramWithKeyboard, answerCallbackQuery } from "./telegram";
import { getRegisteredChats, getUserPrefs, getUserLang, setUserLang, getUserTz, masterTeamList, userFollowsMatch } from "./users";
import { sendLeagueTables, sendWeekAhead } from "./digest";
import { applySettings } from "./admin";
`,
  },
  {
    file: "cron.ts",
    ranges: [[4612, 4624], [4625, 4785]],
    header: `// SportSignal — the cron sweep (*/10 * * * *): stale-run alert, execution
// lock, quiet-period pool reuse, FA-AI learning, notification fan-out,
// digests, coronation alerts, X mirror, heartbeat.
import { CONFIG } from "./config";
import { toFaDigits, getNowTehran } from "./utils";
import { translateTeam } from "./translate";
import { shouldNotify, isLiveStatus } from "./matches";
import { maybeRunFaAi } from "./fa-ai";
import { fetchMatchesFromAPI, getCachedMatches } from "./providers";
import { sendTelegram } from "./telegram";
import { sendMatchNotifications, detectStatusChanges } from "./notifications";
import { maybeSendWeeklyTables, maybeSendMorningDigest, broadcastBigMatchResults, maybeNotifyTableToppers } from "./digest";
import { maybePostX } from "./x";
import { getRegisteredChats, checkUserCap } from "./users";
import { applySettings } from "./admin";
`,
  },
  {
    file: "api.ts",
    ranges: [[9257, 9998]],
    header: `// SportSignal — the HTTP router: webhook, public page + API, admin panel
// + APIs (settings / members / fa-teams / clubs / broadcast / simulate /
// sources / x), healthz / sitemap / robots, legacy GET action endpoints.
import { CONFIG, X_CONFIG, VERSION, PAGE_SEC_HEADERS } from "./config";
import { jsonResponse, resetSubrequestBudget, hashPassword, getAdminPassHash, timingSafeEqualStr, escapeMarkdownCharacters, getNowTehran } from "./utils";
import { normalizeTeamName, normTeamKey } from "./teams.js";
import { matchKey } from "./dedupe.js";
import { translateTeam, translateCompetition, resetFaAiCache, ensureFaAiCache } from "./translate";
import { maybeRunFaAi, collectUnknownTeamNames } from "./fa-ai";
import { isWithin24HourWindow, isWithin3HourWindow, isWithin1HourWindow, isMatchStartingNow, shouldNotify, getNotifiedMatches } from "./matches";
import { fetchStandings, fetchFootballData, fetchSportScore, fetchTheSportsDB, fetchLongView, fetchMatchesFromAPI, getCachedMatches } from "./providers";
import { sendTelegram } from "./telegram";
import { sendLeagueTables, sendWeekAhead, formatResultMessage } from "./composers";
import { sendMatchNotifications } from "./notifications";
import { getRegisteredChats, getBotMembers } from "./users";
import { validateWebhook, isAdminAuthed, getAdminCookieToken, getSettings, sanitizeSettings, syncUclSelection, canonicalizeTeams, getClubsCatalog, buildDummyMatches, applySettings } from "./admin";
import { fetchPublicMatches } from "./public-matches";
import { getCronStatus, executeScheduledLogic } from "./cron";
import { getXStatus, xTestPost } from "./x";
import { handleTelegramUpdate } from "./bot";
import { PUBLIC_PAGE } from "./pages/public";
import { LOGIN_PAGE } from "./pages/login";
import { ADMIN_PAGE } from "./pages/admin";
`,
    constExports: [],
    defaultExport: true,
  },
];

for (const mod of MODULES) {
  let body = mod.ranges.map(([a, b]) => slice(a, b)).join("\n");
  if (mod.dropVersionVar) body = body.replace(/^var VERSION = "[^"]+";\n/m, "");
  let content;
  if (mod.raw) {
    content = mod.header + "\n" + mod.wrap(body);
  } else {
    let cleaned = cleanServer(body);
    cleaned = addExports(cleaned, mod.constExports || []);
    if (mod.defaultExport) {
      cleaned = cleaned.replace(/^var worker_default = \{/m, "const worker_default = {");
      cleaned += "\nexport default worker_default;\n";
    }
    content = mod.header + "\n" + cleaned;
  }
  const dest = path.join(OUT_DIR, mod.file);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, content);
  console.log(`${mod.file}: ${content.split("\n").length} lines`);
}
console.log("\nDone — worker.ts entry file still needs replacing.");
