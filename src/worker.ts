var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// src/teams.js
var require_teams = __commonJS({
  "src/teams.js"(exports, module) {
    "use strict";
    var NORM_BASE_TOKENS = "fc|cf|sc|ac|as|ssc|bc|ud|cd|kv|jc|fk|nk|gnk|msk|sk|sl|rsc|bsc|jk|tc|pfc|sv|tsg";
    function normTeamName(name, extraTokens) {
      var tokens = extraTokens ? NORM_BASE_TOKENS + "|" + extraTokens : NORM_BASE_TOKENS;
      return String(name || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(new RegExp("\\b(" + tokens + ")\\b", "g"), " ").replace(/[^a-z0-9]/g, "");
    }
    __name(normTeamName, "normTeamName");
    function normalizeTeamName2(name) {
      return normTeamName(name, "");
    }
    __name(normalizeTeamName2, "normalizeTeamName");
    function normTeamKey2(name) {
      return normTeamName(name, "afc|rcd|rc|deportivo|athletic|racing|club");
    }
    __name(normTeamKey2, "normTeamKey");
    module.exports = { NORM_BASE_TOKENS, normTeamName, normalizeTeamName: normalizeTeamName2, normTeamKey: normTeamKey2 };
  }
});

// src/dedupe.js
var require_dedupe = __commonJS({
  "src/dedupe.js"(exports, module) {
    "use strict";
    var { normalizeTeamName: normalizeTeamName2 } = require_teams();
    function matchKey2(match) {
      return normalizeTeamName2(match.homeTeam.name) + "|" + normalizeTeamName2(match.awayTeam.name) + "|" + String(match.utcDate || "").slice(0, 16);
    }
    __name(matchKey2, "matchKey");
    function canonDedupe2(list) {
      const canon = /* @__PURE__ */ __name((m) => `${m.competition.code}|${normalizeTeamName2(m.homeTeam.name)}|${normalizeTeamName2(m.awayTeam.name)}|${(m.utcDate || "").slice(0, 10)}`, "canon");
      const adopt = /* @__PURE__ */ __name((cur, m) => {
        if (!cur.venue && m.venue) cur.venue = m.venue;
        if (!cur.homeTeam.crest && m.homeTeam.crest) cur.homeTeam.crest = m.homeTeam.crest;
        if (!cur.awayTeam.crest && m.awayTeam.crest) cur.awayTeam.crest = m.awayTeam.crest;
      }, "adopt");
      const byKey = /* @__PURE__ */ new Map();
      for (const m of list) {
        const k = canon(m);
        const cur = byKey.get(k);
        if (cur) adopt(m, cur);
        byKey.set(k, m);
      }
      const byPair = /* @__PURE__ */ new Map();
      const out = [];
      for (const m of [...byKey.values()]) {
        const pk = `${m.competition.code}|${normalizeTeamName2(m.homeTeam.name)}|${normalizeTeamName2(m.awayTeam.name)}`;
        const cur = byPair.get(pk);
        const t = Date.parse(m.utcDate || "");
        const tc = cur ? Date.parse(cur.utcDate || "") : NaN;
        const sameId = !!(m.id && cur && cur.id === m.id);
        const near = !!cur && !isNaN(t) && !isNaN(tc) && Math.abs(t - tc) <= 48 * 36e5;
        if (cur && (sameId || near)) {
          if (sameId || t < tc) {
            adopt(m, cur);
            out[out.indexOf(cur)] = m;
            byPair.set(pk, m);
          } else {
            adopt(cur, m);
          }
          continue;
        }
        out.push(m);
        byPair.set(pk, m);
      }
      return out;
    }
    __name(canonDedupe2, "canonDedupe");
    module.exports = { matchKey: matchKey2, canonDedupe: canonDedupe2 };
  }
});

// src/worker.ts
var import_teams = __toESM(require_teams());
var import_dedupe = __toESM(require_dedupe());
var __defProp2 = Object.defineProperty;
var __name2 = /* @__PURE__ */ __name((target, value) => __defProp2(target, "name", { value, configurable: true }), "__name");
var VERSION = "12.33-xpost";
var CONFIG = {
  API_URL: "https://api.football-data.org/v4/matches",
  API_RETRY_ATTEMPTS: 2,
  API_RETRY_DELAY: 1e3,
  LEAGUES: ["CL", "PL", "PD", "SA", "FL1", "BL1"],
  // Season-dependent cup phase windows (review/update each August): EL/ECL are
  // in the qualifying phase until their league phase starts (late Sep); the FA
  // Cup's big clubs enter at the First Round Proper (~early Nov). sportscore's
  // fixture list exposes no round field, so cups are classified by calendar.
  CUP_PHASE_WINDOWS: { EURO_LL_START: "2026-09-28T00:00:00Z", FA_ROUND1: "2026-11-09T00:00:00Z" },
  BIG_TEAMS_BY_LEAGUE: {
    "PL": [
      "Arsenal FC",
      "Chelsea FC",
      "Manchester United FC",
      "Manchester City FC",
      "Liverpool FC"
    ],
    "PD": [
      "FC Barcelona",
      "Real Madrid CF",
      "Atl\xE9tico Madrid"
    ],
    "SA": [
      "Inter Milan",
      "AC Milan"
    ],
    "FL1": [
      "Paris Saint-Germain"
    ],
    // v12.15: ONE exact provider name per club. "Bayern Munich" (a
    // pre-12.x variant spelling) duplicated "FC Bayern M\u00FCnchen" in the
    // admin chips — the exact duplicate the user reported. Variant names
    // are now folded onto the catalog name by canonicalizeTeams() instead
    // of being stored side by side.
    "BL1": [
      "FC Bayern M\xFCnchen",
      "Borussia Dortmund"
    ],
    "AL": [
      "Melbourne Victory",
      "Melbourne City",
      "Sydney FC",
      "Adelaide United",
      "Western Sydney Wanderers"
    ],
    "EL": [
      "Arsenal FC",
      "Chelsea FC",
      "Manchester United FC",
      "Manchester City FC",
      "Liverpool FC",
      "FC Barcelona",
      "Real Madrid CF",
      "Atl\xE9tico Madrid",
      "Inter Milan",
      "AC Milan",
      "Paris Saint-Germain"
    ],
    "ECL": [
      "Arsenal FC",
      "Chelsea FC",
      "Manchester United FC",
      "Manchester City FC",
      "Liverpool FC",
      "FC Barcelona",
      "Real Madrid CF",
      "Atl\xE9tico Madrid",
      "Inter Milan",
      "AC Milan",
      "Paris Saint-Germain"
    ]
  },
  DOMESTIC_CUP_IDS: {
    "FA_CUP": 2055,
    // football-data FA Cup (was 2018 = Euro Championship — cups never fetched!)
    "EFL_CUP": 2139,
    // Carabao Cup (Football League Cup)
    "CDR": 2079,
    // Copa del Rey (was 2013 = Brasileirão Série A)
    "COPPA_ITALIA": 2122,
    // Coppa Italia (was 2022 = Austrian Playoffs)
    "DFB_POKAL": 4555
    // DFB Pokal (German Cup)
  },
  // International tournaments (world/continental cups). Fetched near-term only and
  // shown in the app only while in process (a fixture on the horizon). Kept OUT of
  // LEAGUES: national teams never match the followed clubs, so they can't notify.
  INTL_COMPETITIONS: {
    "WC": 2e3,
    // FIFA World Cup
    "EC": 2018,
    // UEFA Euro
    "COPA": 2029,
    // Copa América
    "AFCON": 2088,
    // Africa Cup of Nations
    "AFC": 2092
    // AFC Asian Cup
  },
  LATE_STAGES: [
    "QUARTER_FINALS",
    "QUARTER_FINAL",
    "SEMI_FINALS",
    "SEMI_FINAL",
    "FINAL",
    "THIRD_PLACE"
  ],
  PRIORITY: {
    "CL": 1,
    "EL": 2,
    "ECL": 3,
    "PL": 4,
    "PD": 5,
    "SA": 6,
    "FL1": 7,
    "FA_CUP": 8,
    "EFL_CUP": 9,
    "CDR": 10,
    "COPPA_ITALIA": 11,
    "DEFAULT": 12
  },
  // FIXED: Wider windows to account for cron timing
  PRE_MATCH_NOTIFICATION_HOURS: 24,
  BIG_MATCH_NOTIFICATION_HOURS: 72,
  REMINDER_3_HOURS: 3,
  REMINDER_1_HOUR: 1,
  // Future-plan fix: MATCH_START_WINDOW_MINUTES (45) is REMOVED — it opened
  // the "match started" window 45 minutes BEFORE kickoff, so a 22:30 match
  // was announced as live from 21:45. isMatchStartingNow() now fires only
  // after the real kickoff (see its comment).
  POST_MATCH_NOTIFICATION_HOURS: 6,
  // 24h — cache is used only when ALL providers fail, so staleness is fine and
  // helps the bot survive a weekend API outage without missing matches
  CACHE_STALE_TTL: 86400,
  TELEGRAM_RETRY_ATTEMPTS: 3,
  KV_USERS_KEY: "telegram_users_v6",
  KV_MATCHES_KEY: "matches_v13_tracked",
  KV_NOTIFIED_KEY: "notified_matches_v6",
  KV_SETTINGS_KEY: "bot_settings_v1",
  KV_LAST_SOURCE: "last_api_source",
  KV_STANDINGS_SNAP: "standings_snap_",
  KV_STANDINGS_CACHE: "standings_cache_",
  KV_PUBLIC_MATCHES: "public_matches_v1",
  // v12.x-resilience: long-TTL (7 day) snapshot of the last successful
  // public-matches build. Read ONLY when the live fetch fails (or returns
  // an empty pool) so the page can still render last week's fixtures with
  // a subtle "cached data" indicator instead of empty cards.
  KV_PUBLIC_SNAPSHOT: "cache:snapshot:v1",
  KV_PUBLIC_SNAPSHOT_TTL: 7 * 24 * 60 * 60,
  KV_USER_PREFS: "user_prefs_v1",
  // v12.16: bot-member profiles (telegram username/"slug" + first name + join
  // date), captured from every incoming message and backfilled via getChat
  // when the admin opens the members card. Keyed by chat id.
  KV_USER_PROFILES: "user_profiles_v1",
  KV_MATCH_STATUS: "match_status_v1",
  KV_LIVE_DETAIL: "live_detail_",
  // v12.9: end-of-week league-tables digest. KV_WEEKLY_TABLES stores the ISO
  // week key ("2026-W37") of the last delivered digest; WEEKLY_TABLES is the
  // delivery window — Monday 01:30–06:00 Tehran, i.e. after the LAST European
  // Sunday kickoff wraps (La Liga's late slot ends ~01:20 Tehran) and before
  // the morning — the "end of the week's work" for football.
  KV_WEEKLY_TABLES: "weekly_tables_v1",
  WEEKLY_TABLES: { day: 1, fromMin: 90, toMin: 360 },
  // Fallback API providers (used only when the primary API fails)
  FALLBACK_DAYS_PAST: 1,
  FALLBACK_DAYS_FUTURE: 2,
  KNOWN_LEAGUE_CODES: [
    "CL",
    "PL",
    "PD",
    "SA",
    "FL1",
    "BL1",
    "EL",
    "ECL",
    "FA_CUP",
    "EFL_CUP",
    "CDR",
    "COPPA_ITALIA",
    "DFB_POKAL"
  ],
  // v12.14: club-name autocomplete catalog for the admin panel's "add club"
  // inputs. The roster is pre-downloaded from the SAME providers the matcher
  // uses (football-data /teams + sportscore for the A-League) and cached in
  // KV; /api/clubs serves prefix matches so the panel stores the EXACT API
  // name ("AS Roma", not a guessed "Roma"). Stale after 14 days (rosters
  // move in windows, not daily).
  KV_CLUBS_CATALOG: "clubs_catalog",
  CLUBS_STALE_MS: 12096e5,
  // v12.17: AI-learned Farsi club names (Workers AI, binding "AI" in
  // wrangler.toml). Layer 2 of the translation stack — the static FA_TEAMS
  // dict always wins; names the dict misses (UCL's 36-team table brings clubs
  // from 16+ countries — SK Slavia Praha, Viking FK, PAE AEK…) are learned
  // INCREMENTALLY: one batched AI call for whatever is currently unknown,
  // results validated + stored in KV, then served forever (the user's
  // "translate → store in db → show Farsi next sessions" design). A failed
  // or rejected name cools down FA_AI_FAIL_RETRY_MS before being re-asked;
  // the learner itself runs at most every FA_AI_RUN_EVERY_MS and only when
  // unknown names exist — zero AI calls when everything is translated.
  KV_FA_TEAMS: "fa_teams_ai",
  KV_FA_LAST_RUN: "fa_ai_last_run",
  FA_AI_MAX_BATCH: 16,
  FA_AI_RUN_EVERY_MS: 9e5,
  FA_AI_FAIL_RETRY_MS: 432e5,
  // v12.18: varzesh3.com directory (the user's pointer) — canonical Persian
  // club names scraped from varzesh3 league tables by
  // scripts/varzesh3-catalog.js and pushed here via the Cloudflare API. The
  // AI learner uses it as GROUNDING: candidate names ride in the prompt and
  // accepted answers snap to the exact varzesh3 spelling. KV-only read in the
  // worker — zero extra fetches.
  KV_V3_CATALOG: "varzesh3_clubs_v1",
  // ✅ UPDATED: Bumped version after TTL fix
  KV_LAST_CRON: "last_cron_execution",
  KV_HEARTBEAT: "heartbeat",
  KV_EXECUTION_LOCK: "execution_lock",
  LOCK_TIMEOUT: 24e4,
  DATE_RANGE_DAYS: 10,
  DAYS_IN_PAST: 2,
  DAYS_IN_FUTURE: 8,
  LONG_VIEW_DAYS: 92,
  NOTIFICATION_COOLDOWN_HOURS: 6,
  EXECUTION_FREQUENCY_MINUTES: 10,
  // v12.16 (API frugality, the user's ask): the cron still ticks every 10 min
  // but the full provider sweep only runs when it MATTERS — a followed match
  // is live, kicks off within 1h, or ended <8h ago (result pending). Quiet
  // periods re-sweep at most every QUIET_SWEEP_MS; pre-match reminders keep
  // firing from the KV pool (fixtures are known days ahead).
  QUIET_SWEEP_MS: 2 * 60 * 60 * 1e3,
  ACTIVE_WINDOW_AHEAD_MS: 60 * 60 * 1e3,
  ACTIVE_WINDOW_BEHIND_MS: 8 * 60 * 60 * 1e3,
  // v12.16: week-ahead fixtures section of the weekly digest — days covered.
  WEEK_AHEAD_DAYS: 7,
  // v12.16: provider circuit breaker — when a provider fails across a whole
  // sweep (sportscore is currently serving a bot challenge), suspend it for
  // this long instead of burning subrequests on every 10-min tick.
  PROVIDER_SUSPEND_MS: 45 * 60 * 1e3,
  // Time constants
  ONE_HOUR_MS: 60 * 60 * 1e3,
  TWO_HOURS_MS: 2 * 60 * 60 * 1e3,
  ONE_DAY_MS: 24 * 60 * 60 * 1e3,
  // A-League Men season start (review each year): sportscore serves the prior
  // season's final table in pre-season, so before this date AL standings are
  // zeroed and shown as not-started rather than presenting a stale table.
  SEASON_STARTS: { AL: "2026-10-17T00:00:00Z" }
};
function toFaDigits(str) {
  const FA_DIGIT_MAP = { "0": "\u06F0", "1": "\u06F1", "2": "\u06F2", "3": "\u06F3", "4": "\u06F4", "5": "\u06F5", "6": "\u06F6", "7": "\u06F7", "8": "\u06F8", "9": "\u06F9" };
  return str.replace(/[0-9]/g, (w) => FA_DIGIT_MAP[w] || w);
}
__name(toFaDigits, "toFaDigits");
__name2(toFaDigits, "toFaDigits");
function escapeMarkdownCharacters(text) {
  return text.replace(/([\[\]\(\)~`>#\+\-=|{}\.!_])/g, "\\$1");
}
__name(escapeMarkdownCharacters, "escapeMarkdownCharacters");
__name2(escapeMarkdownCharacters, "escapeMarkdownCharacters");
var LOG_VERBOSE = false;
function vlog(...args) {
  if (LOG_VERBOSE) console.log(...args);
}
__name(vlog, "vlog");
__name2(vlog, "vlog");
async function hashPassword(pass, salt) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(pass), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: enc.encode(salt), iterations: 1e5, hash: "SHA-256" }, key, 256);
  return [...new Uint8Array(bits)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(hashPassword, "hashPassword");
__name2(hashPassword, "hashPassword");
async function getAdminPassHash(env) {
  return await env.STATE.get("admin_pass_hash", "json").catch(() => null);
}
__name(getAdminPassHash, "getAdminPassHash");
__name2(getAdminPassHash, "getAdminPassHash");
function timingSafeEqualStr(a, b) {
  const enc = new TextEncoder();
  const ab = enc.encode(String(a == null ? "" : a));
  const bb = enc.encode(String(b == null ? "" : b));
  const len = Math.max(ab.length, bb.length);
  let diff = ab.length === bb.length ? 0 : 1;
  for (let i = 0; i < len; i++) diff |= (ab[i] || 0) ^ (bb[i] || 0);
  return diff === 0;
}
__name(timingSafeEqualStr, "timingSafeEqualStr");
__name2(timingSafeEqualStr, "timingSafeEqualStr");
function getNowUTC() {
  return /* @__PURE__ */ new Date();
}
__name(getNowUTC, "getNowUTC");
__name2(getNowUTC, "getNowUTC");
function getNowTehran(env) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: env.TEHRAN_TZ || "Asia/Tehran",
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).formatToParts(/* @__PURE__ */ new Date());
  const p = {};
  for (const x of parts) p[x.type] = x.value;
  const hh = p.hour === "24" ? "00" : p.hour;
  return /* @__PURE__ */ new Date(`${p.year}-${p.month}-${p.day}T${hh}:${p.minute}:${p.second}Z`);
}
__name(getNowTehran, "getNowTehran");
__name2(getNowTehran, "getNowTehran");
function getJalaliDate(utcDateStr, env) {
  const date = new Date(utcDateStr);
  const dateOpt = { timeZone: env.TEHRAN_TZ, day: "numeric", month: "long", year: "numeric", weekday: "long" };
  const parts = new Intl.DateTimeFormat("fa-IR", dateOpt).formatToParts(date);
  const get = /* @__PURE__ */ __name((t) => {
    const p = parts.find((x) => x.type === t);
    return p ? p.value : "";
  }, "get");
  return `${get("weekday")} ${get("day")} ${get("month")} ${get("year")}`;
}
__name(getJalaliDate, "getJalaliDate");
__name2(getJalaliDate, "getJalaliDate");
function getJalaliTime(utcDateStr, env) {
  const date = new Date(utcDateStr);
  const timeOpt = {
    timeZone: env.TEHRAN_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  };
  const time = new Intl.DateTimeFormat("fa-IR", timeOpt).format(date);
  return toFaDigits(time);
}
__name(getJalaliTime, "getJalaliTime");
__name2(getJalaliTime, "getJalaliTime");
function getRelativeTimeUntilMatch(matchUtcDate, _env) {
  const now = getNowUTC();
  const matchDate = new Date(matchUtcDate);
  const diffMs = matchDate.getTime() - now.getTime();
  const diffHours = Math.floor(diffMs / (1e3 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);
  const diffMinutes = Math.floor(diffMs / (1e3 * 60));
  if (diffDays > 0) {
    return `${toFaDigits(diffDays.toString())} \u0631\u0648\u0632 \u0648 ${toFaDigits((diffHours % 24).toString())} \u0633\u0627\u0639\u062A \u062F\u06CC\u06AF\u0631`;
  } else if (diffHours > 0) {
    return `${toFaDigits(diffHours.toString())} \u0633\u0627\u0639\u062A \u0648 ${toFaDigits((diffMinutes % 60).toString())} \u062F\u0642\u06CC\u0642\u0647 \u062F\u06CC\u06AF\u0631`;
  } else if (diffMinutes > 0) {
    return `${toFaDigits(diffMinutes.toString())} \u062F\u0642\u06CC\u0642\u0647 \u062F\u06CC\u06AF\u0631`;
  } else {
    return "\u0628\u0647 \u0632\u0648\u062F\u06CC";
  }
}
__name(getRelativeTimeUntilMatch, "getRelativeTimeUntilMatch");
__name2(getRelativeTimeUntilMatch, "getRelativeTimeUntilMatch");
// v12.x-bilingual-bot: English Gregorian date / time / relative-time helpers
// (mirror of getJalaliDate / getJalaliTime / getRelativeTimeUntilMatch for
// English users). Used by the cron composers when lang === "en".
function getEnglishDate(utcDateStr, env) {
  const date = new Date(utcDateStr);
  const opts = { timeZone: env.TEHRAN_TZ, weekday: "long", day: "numeric", month: "long", year: "numeric" };
  return new Intl.DateTimeFormat("en-GB", opts).format(date);
}
__name(getEnglishDate, "getEnglishDate");
__name2(getEnglishDate, "getEnglishDate");
function getEnglishTime(utcDateStr, env) {
  const date = new Date(utcDateStr);
  const opts = { timeZone: env.TEHRAN_TZ, hour: "2-digit", minute: "2-digit", hour12: false };
  return new Intl.DateTimeFormat("en-GB", opts).format(date);
}
__name(getEnglishTime, "getEnglishTime");
__name2(getEnglishTime, "getEnglishTime");
function getEnglishRelative(matchUtcDate) {
  const now = getNowUTC();
  const matchDate = new Date(matchUtcDate);
  const diffMs = matchDate.getTime() - now.getTime();
  const diffHours = Math.floor(diffMs / (1e3 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);
  const diffMinutes = Math.floor(diffMs / (1e3 * 60));
  if (diffDays > 0) return `${diffDays}d ${diffHours % 24}h to go`;
  if (diffHours > 0) return `${diffHours}h ${diffMinutes % 60}m to go`;
  if (diffMinutes > 0) return `${diffMinutes}m to go`;
  return "soon";
}
__name(getEnglishRelative, "getEnglishRelative");
__name2(getEnglishRelative, "getEnglishRelative");
// v12.x-bilingual-bot: English stage names for cup competitions
// (mirror of STAGE_FA for lang === "en").
var STAGE_EN = {
  "PLAYOFF_ROUND": "Playoff",
  "ROUND_OF_16": "Round of 16",
  "QUARTER_FINALS": "Quarter-finals",
  "QUARTER_FINAL": "Quarter-final",
  "SEMI_FINALS": "Semi-finals",
  "SEMI_FINAL": "Semi-final",
  "FINAL": "Final",
  "THIRD_PLACE": "Third-place play-off"
};
__name2(STAGE_EN, "STAGE_EN");
function enStageName(stage) {
  return STAGE_EN[String(stage || "").toUpperCase()] || null;
}
__name(enStageName, "enStageName");
__name2(enStageName, "enStageName");
var FA_TEAMS_DICT = null;
var FA_TEAMS_NORM = null;
var FA_TEAMS_STEM = null;
var FA_AI_CACHE = null;
function buildFaTeamDict() {
  const FA_TEAMS = {
    // Premier League 2025-26
    "Arsenal FC": "\u0622\u0631\u0633\u0646\u0627\u0644",
    "Aston Villa FC": "\u0627\u0633\u062A\u0648\u0646 \u0648\u06CC\u0644\u0627",
    "AFC Bournemouth": "\u0628\u0648\u0631\u0646\u0645\u0648\u062B",
    "Brentford FC": "\u0628\u0631\u0646\u062A\u0641\u0648\u0631\u062F",
    "Brighton & Hove Albion FC": "\u0628\u0631\u0627\u06CC\u062A\u0648\u0646",
    "Chelsea FC": "\u0686\u0644\u0633\u06CC",
    "Crystal Palace FC": "\u06A9\u0631\u06CC\u0633\u062A\u0627\u0644 \u067E\u0627\u0644\u0627\u0633",
    "Everton FC": "\u0627\u0648\u0631\u062A\u0648\u0646",
    "Fulham FC": "\u0641\u0648\u0644\u0627\u0645",
    "Hull City AFC": "\u0647\u0627\u0644 \u0633\u06CC\u062A\u06CC",
    "Ipswich Town FC": "\u0627\u06CC\u067E\u0633\u0648\u06CC\u0686",
    "Leeds United FC": "\u0644\u06CC\u062F\u0632",
    "Leicester City FC": "\u0644\u0633\u062A\u0631",
    "Liverpool FC": "\u0644\u06CC\u0648\u0631\u067E\u0648\u0644",
    "Manchester City FC": "\u0645\u0646\u0686\u0633\u062A\u0631\u0633\u06CC\u062A\u06CC",
    "Manchester United FC": "\u0645\u0646\u0686\u0633\u062A\u0631\u06CC\u0648\u0646\u0627\u06CC\u062A\u062F",
    "Newcastle United FC": "\u0646\u06CC\u0648\u06A9\u0627\u0633\u0644",
    "Nottingham Forest FC": "\u0646\u0627\u062A\u06CC\u0646\u06AF\u0647\u0627\u0645 \u0641\u0627\u0631\u0633\u062A",
    "Southampton FC": "\u0633\u0627\u0648\u062A\u200C\u0647\u0645\u067E\u062A\u0648\u0646",
    "Tottenham Hotspur FC": "\u062A\u0627\u062A\u0646\u0647\u0627\u0645",
    "West Ham United FC": "\u0648\u0633\u062A\u200C\u0647\u0645",
    "Wolverhampton Wanderers FC": "\u0648\u0644\u0648\u0631\u0647\u0645\u067E\u062A\u0648\u0646",
    "Burnley FC": "\u0628\u0631\u0646\u0644\u06CC",
    "Middlesbrough FC": "\u0645\u06CC\u062F\u0644\u0632\u0628\u0631\u0648",
    "Sunderland AFC": "\u0633\u0627\u0646\u062F\u0631\u0644\u0646\u062F",
    "Oxford United FC": "\u0622\u06A9\u0633\u0641\u0648\u0631\u062F \u06CC\u0648\u0646\u0627\u06CC\u062A\u062F",
    "Derby County FC": "\u062F\u0631\u0628\u06CC \u06A9\u0627\u0646\u062A\u06CC",
    "Norwich City FC": "\u0646\u0648\u0631\u06CC\u0686 \u0633\u06CC\u062A\u06CC",
    "Sheffield Wednesday FC": "\u0634\u0641\u06CC\u0644\u062F \u0648\u0646\u0632\u062F\u06CC",
    "Portsmouth FC": "\u067E\u0648\u0631\u062A\u0633\u0645\u0648\u062B",
    "Blackburn Rovers FC": "\u0628\u0644\u06A9\u0628\u0631\u0646",
    "Millwall FC": "\u0645\u06CC\u0644\u0648\u0627\u0644",
    "Preston North End FC": "\u067E\u0631\u0633\u062A\u0648\u0646",
    "Queens Park Rangers FC": "\u06A9\u0648\u06CC\u06CC\u0646\u0632 \u067E\u0627\u0631\u06A9 \u0631\u0646\u062C\u0631\u0632",
    "Swansea City AFC": "\u0633\u0648\u0627\u0646\u0633\u06CC",
    "Bristol City FC": "\u0628\u0631\u06CC\u0633\u062A\u0648\u0644 \u0633\u06CC\u062A\u06CC",
    "Coventry City FC": "\u06A9\u0627\u0648\u0646\u062A\u0631\u06CC",
    "Stoke City FC": "\u0627\u0633\u062A\u0648\u06A9 \u0633\u06CC\u062A\u06CC",
    "Luton Town FC": "\u0644\u0648\u062A\u0648\u0646 \u062A\u0627\u0648\u0646",
    "West Bromwich Albion FC": "\u0648\u0633\u062A \u0628\u0631\u0648\u0645\u0648\u06CC\u0686",
    "Watford FC": "\u0648\u0627\u062A\u0641\u0648\u0631\u062F",
    "Cardiff City FC": "\u06A9\u0627\u0631\u062F\u06CC\u0641",
    "Sheffield United FC": "\u0634\u0641\u06CC\u0644\u062F \u06CC\u0648\u0646\u0627\u06CC\u062A\u062F",
    "Wigan Athletic FC": "\u0648\u06CC\u06AF\u0627\u0646",
    "Birmingham City FC": "\u0628\u06CC\u0631\u0645\u0646\u06AF\u0627\u0645",
    "Charlton Athletic FC": "\u0686\u0627\u0631\u0644\u062A\u0648\u0646",
    "Reading FC": "\u0631\u062F\u06CC\u0646\u06AF",
    "Bradford City AFC": "\u0628\u0631\u062F\u0641\u0648\u0631\u062F",
    "Peterborough United FC": "\u067E\u06CC\u062A\u0631\u0628\u0648\u0631\u0648",
    "Salford City FC": "\u0633\u0627\u0644\u0641\u0648\u0631\u062F",
    "Mansfield Town FC": "\u0645\u0646\u0632\u0641\u06CC\u0644\u062F",
    // La Liga 2025-26
    "FC Barcelona": "\u0628\u0627\u0631\u0633\u0644\u0648\u0646\u0627",
    "Real Madrid CF": "\u0631\u0626\u0627\u0644 \u0645\u0627\u062F\u0631\u06CC\u062F",
    "Atl\xE9tico Madrid": "\u0627\u062A\u0644\u062A\u06CC\u06A9\u0648 \u0645\u0627\u062F\u0631\u06CC\u062F",
    "Club Atl\xE9tico de Madrid": "\u0627\u062A\u0644\u062A\u06CC\u06A9\u0648 \u0645\u0627\u062F\u0631\u06CC\u062F",
    "Atl\xE9tico de Madrid": "\u0627\u062A\u0644\u062A\u06CC\u06A9\u0648 \u0645\u0627\u062F\u0631\u06CC\u062F",
    "Athletic Club": "\u0627\u062A\u0644\u062A\u06CC\u06A9 \u0628\u06CC\u0644\u0628\u0627\u0626\u0648",
    "Athletic Bilbao": "\u0627\u062A\u0644\u062A\u06CC\u06A9 \u0628\u06CC\u0644\u0628\u0627\u0626\u0648",
    "Real Sociedad": "\u0631\u0626\u0627\u0644 \u0633\u0648\u0633\u06CC\u062F\u0627\u062F",
    "Real Betis": "\u0631\u0626\u0627\u0644 \u0628\u062A\u06CC\u0633",
    "Villarreal CF": "\u0648\u06CC\u0627\u0631\u0626\u0627\u0644",
    "Sevilla FC": "\u0633\u0648\u06CC\u0627",
    "Valencia CF": "\u0648\u0627\u0644\u0646\u0633\u06CC\u0627",
    "Deportivo Alav\xE9s": "\u0622\u0644\u0648\u0633",
    "Getafe CF": "\u062E\u062A\u0627\u0641\u0647",
    "Girona FC": "\u062E\u06CC\u0631\u0648\u0646\u0627",
    "CA Osasuna": "\u0627\u0648\u0633\u0627\u0633\u0648\u0646\u0627",
    "RC Celta de Vigo": "\u0633\u0644\u062A\u0627\u0648\u06CC\u06AF\u0648",
    "RCD Mallorca": "\u0645\u0627\u06CC\u0648\u0631\u06A9\u0627",
    "Rayo Vallecano": "\u0631\u0627\u06CC\u0648 \u0648\u0627\u06CC\u06A9\u0627\u0646\u0648",
    "Rayo Vallecano de Madrid": "\u0631\u0627\u06CC\u0648 \u0648\u0627\u06CC\u06A9\u0627\u0646\u0648",
    "Elche CF": "\u0627\u0644\u0686\u0647",
    "Elche": "\u0627\u0644\u0686\u0647",
    "RCD Espanyol": "\u0627\u0633\u067E\u0627\u0646\u06CC\u0648\u0644",
    "RCD Espanyol de Barcelona": "\u0627\u0633\u067E\u0627\u0646\u06CC\u0648\u0644",
    "Espanyol": "\u0627\u0633\u067E\u0627\u0646\u06CC\u0648\u0644",
    "Real Sociedad de F\xFAtbol": "\u0631\u0626\u0627\u0644 \u0633\u0648\u0633\u06CC\u062F\u0627\u062F",
    "Stade Rennais FC 1901": "\u0631\u0646",
    "Real Valladolid CF": "\u0648\u0627\u06CC\u0627\u062F\u0648\u0644\u06CC\u062F",
    "Legan\xE9s": "\u0644\u06AF\u0627\u0646\u0633",
    "UD Las Palmas": "\u0644\u0627\u0633 \u067E\u0627\u0644\u0645\u0627\u0633",
    "Espanyol": "\u0627\u0633\u067E\u0627\u0646\u06CC\u0648\u0644",
    "RCD Espanyol de Barcelona": "\u0627\u0633\u067E\u0627\u0646\u06CC\u0648\u0644",
    "Levante UD": "\u0644\u0648\u0627\u0646\u062A\u0647",
    "SD Huesca": "\u0647\u0648\u0626\u0633\u06A9\u0627",
    "UD Almer\xEDa": "\u0622\u0644\u0645\u0631\u06CC\u0627",
    // Serie A 2025-26
    "Inter Milan": "\u0627\u06CC\u0646\u062A\u0631 \u0645\u06CC\u0644\u0627\u0646",
    "Inter": "\u0627\u06CC\u0646\u062A\u0631 \u0645\u06CC\u0644\u0627\u0646",
    "FC Internazionale Milano": "\u0627\u06CC\u0646\u062A\u0631 \u0645\u06CC\u0644\u0627\u0646",
    "Internazionale": "\u0627\u06CC\u0646\u062A\u0631 \u0645\u06CC\u0644\u0627\u0646",
    "AC Milan": "\u0622\u062B \u0645\u06CC\u0644\u0627\u0646",
    "Juventus FC": "\u06CC\u0648\u0648\u0646\u062A\u0648\u0633",
    "SSC Napoli": "\u0646\u0627\u067E\u0648\u0644\u06CC",
    "AS Roma": "\u0631\u0645",
    "Lazio": "\u0644\u0627\u062A\u0632\u06CC\u0648",
    "Atalanta BC": "\u0622\u062A\u0627\u0644\u0627\u0646\u062A\u0627",
    "Fiorentina": "\u0641\u06CC\u0648\u0631\u0646\u062A\u06CC\u0646\u0627",
    "Bologna FC 1909": "\u0628\u0648\u0644\u0648\u0646\u06CC\u0627",
    "Torino FC": "\u062A\u0648\u0631\u06CC\u0646\u0648",
    "AS Monaco FC": "\u0645\u0648\u0646\u0627\u06A9\u0648",
    "Udinese Calcio": "\u0627\u0648\u062F\u06CC\u0646\u0632\u0647",
    "Genoa CFC": "\u062C\u0646\u0648\u0627",
    "Parma Calcio 1913": "\u067E\u0627\u0631\u0645\u0627",
    "Como 1907": "\u06A9\u0648\u0645\u0648",
    "US Lecce": "\u0644\u0686\u0647",
    "Cagliari Calcio": "\u06A9\u0627\u0644\u06CC\u0627\u0631\u06CC",
    "Hellas Verona": "\u0647\u0644\u0627\u0633 \u0648\u0631\u0648\u0646\u0627",
    "Pisa SC": "\u067E\u06CC\u0632\u0627",
    "Sassuolo Calcio": "\u0633\u0627\u0633\u0648\u0644\u0648",
    "Empoli FC": "\u0627\u0645\u067E\u0648\u0644\u06CC",
    "AC Monza": "\u0645\u0648\u0646\u062A\u0632\u0627",
    "Venezia FC": "\u0648\u0646\u06CC\u0632",
    "Spezia Calcio": "\u0627\u0633\u067E\u062A\u0632\u06CC\u0627",
    "US Cremonese": "\u06A9\u0631\u0645\u0648\u0646\u0632\u0647",
    // Ligue 1 2025-26
    "Paris Saint-Germain": "\u067E\u0627\u0631\u06CC\u200C\u0633\u0646\u200C\u0698\u0631\u0645\u0646",
    "PSG": "\u067E\u0627\u0631\u06CC\u200C\u0633\u0646\u200C\u0698\u0631\u0645\u0646",
    // v12.8 (audit backlog "Paris FC name fix"): the stem fallback folded
    // "Paris FC" (normKey "paris") onto "parissaintgermain" — the promoted
    // club rendered as PSG in Persian. Exact entry wins before any fallback.
    "Paris FC": "\u067E\u0627\u0631\u06CC\u200C\u0627\u0641\u200C\u0633\u06CC",
    "Olympique de Marseille": "\u0645\u0627\u0631\u0633\u06CC",
    "Olympique Lyonnais": "\u0644\u06CC\u0648\u0646",
    "Lille OSC": "\u0644\u06CC\u0644",
    "OGC Nice": "\u0646\u06CC\u0633",
    "AS Monaco": "\u0645\u0648\u0646\u0627\u06A9\u0648",
    "Stade Rennais FC": "\u0631\u0646",
    "RC Lens": "\u0644\u0627\u0646\u0633",
    "Toulouse FC": "\u062A\u0648\u0644\u0648\u0632",
    "Montpellier HSC": "\u0645\u0648\u0646\u067E\u0644\u06CC\u0647",
    "FC Nantes": "\u0646\u0627\u0646\u062A",
    "RC Strasbourg Alsace": "\u0627\u0633\u062A\u0631\u0627\u0633\u0628\u0648\u0631\u06AF",
    "Stade de Reims": "\u0631\u0646\u0633",
    "AJ Auxerre": "\u0627\u06A9\u0633\u0631",
    "Angers SCO": "\u0627\u0646\u0698\u0647",
    "Stade Brestois 29": "\u0628\u0631\u0633\u062A",
    "Le Havre AC": "\u0644\u0648 \u0622\u0648\u0631",
    "FC Metz": "\u0645\u062A\u0632",
    // Bundesliga 2025-26 (CL/EL/ECL opponents)
    "FC Bayern M\xFCnchen": "\u0628\u0627\u06CC\u0631\u0646 \u0645\u0648\u0646\u06CC\u062E",
    "Bayern Munich": "\u0628\u0627\u06CC\u0631\u0646 \u0645\u0648\u0646\u06CC\u062E",
    "Borussia Dortmund": "\u062F\u0648\u0631\u062A\u0645\u0648\u0646\u062F",
    // v12.8: promoted BL1 side now visible on the public page
    "SC Paderborn 07": "\u067E\u0627\u062F\u0631\u0628\u0648\u0631\u0646",
    "RB Leipzig": "\u0644\u0627\u06CC\u067E\u0632\u06CC\u0634",
    "Bayer 04 Leverkusen": "\u0628\u0627\u06CC\u0631\u0644\u0648\u0631\u06A9\u0648\u0632\u0646",
    "Bayer Leverkusen": "\u0628\u0627\u06CC\u0631\u0644\u0648\u0631\u06A9\u0648\u0632\u0646",
    "Eintracht Frankfurt": "\u0622\u06CC\u0646\u062A\u0631\u0627\u062E\u062A \u0641\u0631\u0627\u0646\u06A9\u0641\u0648\u0631\u062A",
    "VfB Stuttgart": "\u0627\u0634\u062A\u0648\u062A\u06AF\u0627\u0631\u062A",
    "Melbourne Victory": "\u0645\u0644\u0628\u0648\u0631\u0646 \u0648\u06CC\u06A9\u062A\u0648\u0631\u06CC",
    "Melbourne City": "\u0645\u0644\u0628\u0648\u0631\u0646 \u0633\u06CC\u062A\u06CC",
    "Sydney FC": "\u0633\u06CC\u062F\u0646\u06CC",
    "Western Sydney Wanderers": "\u0648\u0633\u062A\u0631\u0646 \u0633\u06CC\u062F\u0646\u06CC \u0648\u0627\u0646\u062F\u0631\u0631\u0632",
    "Adelaide United": "\u0622\u062F\u0644\u0627\u06CC\u062F \u06CC\u0648\u0646\u0627\u06CC\u062A\u062F",
    "Central Coast Mariners": "\u0633\u0646\u062A\u0631\u0627\u0644 \u06A9\u0648\u0626\u0633\u062A \u0645\u0627\u0631\u06CC\u0646\u0631\u0632",
    "Brisbane Roar": "\u0628\u0631\u06CC\u0632\u0628\u0646",
    "SC Freiburg": "\u0641\u0631\u0627\u06CC\u0628\u0648\u0631\u06AF",
    "Borussia M\xF6nchengladbach": "\u0628\u0631\u0648\u0633\u06CC\u0627 \u0645\u0648\u0646\u0634\u0646\u200C\u06AF\u0644\u0627\u062F\u0628\u0627\u062E",
    "VfL Wolfsburg": "\u0648\u0648\u0644\u0641\u0633\u0628\u0648\u0631\u06AF",
    "1. FC Union Berlin": "\u06CC\u0648\u0646\u06CC\u0648\u0646 \u0628\u0631\u0644\u06CC\u0646",
    "1. FC Heidenheim 1846": "\u0647\u0627\u06CC\u062F\u0646\u0647\u0627\u06CC\u0645",
    "FC Augsburg": "\u0622\u06AF\u0633\u0628\u0648\u0631\u06AF",
    "Holstein Kiel": "\u0647\u0648\u0644\u0634\u062A\u0627\u06CC\u0646 \u06A9\u06CC\u0644",
    "SV Werder Bremen": "\u0648\u0631\u062F\u0631 \u0628\u0631\u0645\u0646",
    "VfL Bochum": "\u0628\u0648\u062E\u0648\u0645",
    "1. FSV Mainz 05": "\u0645\u0627\u06CC\u0646\u0633",
    "SV Darmstadt 98": "\u062F\u0627\u0631\u0645\u0634\u062A\u0627\u062A",
    "FC St. Pauli": "\u0633\u0646\u062A \u067E\u0627\u0626\u0648\u0644\u06CC",
    "SSV Ulm 1846": "\u0627\u0648\u0644\u0645",
    "Hamburger SV": "\u0647\u0627\u0645\u0628\u0648\u0631\u06AF",
    "1. FC K\xF6ln": "\u06A9\u0644\u0646",
    "Hannover 96": "\u0647\u0627\u0646\u0648\u0641\u0631",
    // Champions League / Europa / Conference regulars
    "Ajax": "\u0622\u0698\u0627\u06A9\u0633",
    "Ajax Amsterdam": "\u0622\u0698\u0627\u06A9\u0633",
    "AFC Ajax": "\u0622\u0698\u0627\u06A9\u0633",
    "FC Porto": "\u067E\u0648\u0631\u062A\u0648",
    "Porto": "\u067E\u0648\u0631\u062A\u0648",
    "SL Benfica": "\u0628\u0646\u0641\u06CC\u06A9\u0627",
    "Benfica": "\u0628\u0646\u0641\u06CC\u06A9\u0627",
    "Sporting CP": "\u0627\u0633\u067E\u0648\u0631\u062A\u06CC\u0646\u06AF",
    "Sporting Lisbon": "\u0627\u0633\u067E\u0648\u0631\u062A\u06CC\u0646\u06AF",
    "Sporting Lisboa": "\u0627\u0633\u067E\u0648\u0631\u062A\u06CC\u0646\u06AF",
    "PSV": "\u067E\u06CC\u200C\u0627\u0633\u200C\u0648\u06CC",
    "Feyenoord": "\u0641\u0627\u06CC\u0646\u0648\u0631\u062F",
    "Club Brugge KV": "\u0628\u0631\u0648\u0698",
    "Celtic FC": "\u0633\u0644\u062A\u06CC\u06A9",
    "Rangers FC": "\u0631\u0646\u062C\u0631\u0632",
    "Galatasaray": "\u06AF\u0627\u0644\u0627\u062A\u0627\u0633\u0631\u0627\u06CC",
    "Galatasaray SK": "\u06AF\u0627\u0644\u0627\u062A\u0627\u0633\u0631\u0627\u06CC",
    "Fenerbah\xE7e": "\u0641\u0646\u0631\u0628\u0627\u063A\u0686\u0647",
    "Olympiacos FC": "\u0627\u0644\u0645\u067E\u06CC\u0627\u06A9\u0648\u0633",
    "Olympiacos": "\u0627\u0644\u0645\u067E\u06CC\u0627\u06A9\u0648\u0633",
    "Panathinaikos": "\u067E\u0627\u0646\u0627\u062A\u06CC\u0646\u0627\u06CC\u06A9\u0648\u0633",
    "FC Dynamo Kyiv": "\u062F\u06CC\u0646\u0627\u0645\u0648 \u06A9\u06CC\u0641",
    "Dynamo Kyiv": "\u062F\u06CC\u0646\u0627\u0645\u0648 \u06A9\u06CC\u0641",
    "Dynamo Kiev": "\u062F\u06CC\u0646\u0627\u0645\u0648 \u06A9\u06CC\u0641",
    "FC Shakhtar Donetsk": "\u0634\u0627\u062E\u062A\u0627\u0631 \u062F\u0648\u0646\u062A\u0633\u06A9",
    "Shakhtar Donetsk": "\u0634\u0627\u062E\u062A\u0627\u0631 \u062F\u0648\u0646\u062A\u0633\u06A9",
    "Shakhtar": "\u0634\u0627\u062E\u062A\u0627\u0631 \u062F\u0648\u0646\u062A\u0633\u06A9",
    "FC Red Bull Salzburg": "\u0633\u0627\u0644\u0632\u0628\u0648\u0631\u06AF",
    "Red Bull Salzburg": "\u0633\u0627\u0644\u0632\u0628\u0648\u0631\u06AF",
    "Salzburg": "\u0633\u0627\u0644\u0632\u0628\u0648\u0631\u06AF",
    "SK Sturm Graz": "\u0627\u0634\u062A\u0648\u0631\u0645 \u06AF\u0631\u0627\u062A\u0633",
    "Sturm Graz": "\u0627\u0634\u062A\u0648\u0631\u0645 \u06AF\u0631\u0627\u062A\u0633",
    "AZ Alkmaar": "\u0622\u0632\u062F \u0622\u0644\u06A9\u0645\u0627\u0631",
    "FC Twente": "\u062A\u0648\u0626\u0646\u062A\u0647",
    "BSC Young Boys": "\u06CC\u0627\u0646\u06AF \u0628\u0648\u06CC\u0632",
    "Young Boys": "\u06CC\u0627\u0646\u06AF \u0628\u0648\u06CC\u0632",
    "FC Basel": "\u0628\u0627\u0632\u0644",
    "Basel": "\u0628\u0627\u0632\u0644",
    "GNK Dinamo Zagreb": "\u062F\u06CC\u0646\u0627\u0645\u0648 \u0632\u0627\u06AF\u0631\u0628",
    "Dinamo Zagreb": "\u062F\u06CC\u0646\u0627\u0645\u0648 \u0632\u0627\u06AF\u0631\u0628",
    "FK Crvena zvezda": "\u0633\u062A\u0627\u0631\u0647 \u0633\u0631\u062E \u0628\u0644\u06AF\u0631\u0627\u062F",
    "Red Star Belgrade": "\u0633\u062A\u0627\u0631\u0647 \u0633\u0631\u062E \u0628\u0644\u06AF\u0631\u0627\u062F",
    "Crvena Zvezda": "\u0633\u062A\u0627\u0631\u0647 \u0633\u0631\u062E \u0628\u0644\u06AF\u0631\u0627\u062F",
    "FC Copenhagen": "\u06A9\u067E\u0646\u0647\u0627\u06AF\u0646",
    "FC K\xF8benhavn": "\u06A9\u067E\u0646\u0647\u0627\u06AF\u0646",
    "K\xF8benhavn": "\u06A9\u067E\u0646\u0647\u0627\u06AF\u0646",
    "Kobenhavn": "\u06A9\u067E\u0646\u0647\u0627\u06AF\u0646",
    "Copenhagen": "\u06A9\u067E\u0646\u0647\u0627\u06AF\u0646",
    "FC Midtjylland": "\u0645\u06CC\u062F\u06CC\u0648\u0644\u0646\u062F",
    "FCSB": "\u0627\u0633\u062A\u0648\u0627 \u0628\u062E\u0627\u0631\u0633\u062A",
    "CFR Cluj": "\u0633\u06CC\u200C\u0627\u0641\u200C\u0622\u0631 \u06A9\u0644\u0648\u062C",
    "Trabzonspor": "\u062A\u0631\u0627\u0628\u0648\u0632\u0627\u0646\u200C\u0627\u0633\u067E\u0648\u0631",
    "Besiktas JK": "\u0628\u0634\u06CC\u06A9\u062A\u0627\u0634",
    "Be\u015Fikta\u015F JK": "\u0628\u0634\u06CC\u06A9\u062A\u0627\u0634",
    "Be\u015Fikta\u015F": "\u0628\u0634\u06CC\u06A9\u062A\u0627\u0634",
    "Besiktas": "\u0628\u0634\u06CC\u06A9\u062A\u0627\u0634",
    "PAOK FC": "\u067E\u06CC\u200C\u0627\u06CC\u200C\u0627\u0648\u200C\u06A9\u06CC",
    "PAOK": "\u067E\u06CC\u200C\u0627\u06CC\u200C\u0627\u0648\u200C\u06A9\u06CC",
    "RSC Anderlecht": "\u0622\u0646\u062F\u0631\u0644\u062E\u062A",
    "Anderlecht": "\u0622\u0646\u062F\u0631\u0644\u062E\u062A",
    "Royal Antwerp FC": "\u0622\u0646\u062A\u0648\u0631\u067E",
    "Royal Antwerp": "\u0622\u0646\u062A\u0648\u0631\u067E",
    "Antwerp": "\u0622\u0646\u062A\u0648\u0631\u067E",
    "Slavia Prague": "\u0627\u0633\u0644\u0627\u0648\u06CC\u0627 \u067E\u0631\u0627\u06AF",
    "Sparta Prague": "\u0627\u0633\u067E\u0627\u0631\u062A\u0627 \u067E\u0631\u0627\u06AF",
    "FC Viktoria Plzen": "\u0648\u06CC\u06A9\u062A\u0648\u0631\u06CC\u0627 \u067E\u0644\u0632\u0646",
    "Ferencv\xE1rosi TC": "\u0641\u0631\u0646\u062A\u0633\u200C\u0648\u0627\u0631\u0648\u0634",
    "Ferencv\xE1ros": "\u0641\u0631\u0646\u062A\u0633\u200C\u0648\u0627\u0631\u0648\u0634",
    "Ferencvaros": "\u0641\u0631\u0646\u062A\u0633\u200C\u0648\u0627\u0631\u0648\u0634",
    "Ferencv\xE1rosi": "\u0641\u0631\u0646\u062A\u0633\u200C\u0648\u0627\u0631\u0648\u0634",
    "Legia Warsaw": "\u0644\u06AF\u06CC\u0627 \u0648\u0631\u0634\u0648",
    "Rak\xF3w Cz\u0119stochowa": "\u0631\u0627\u06A9\u0648\u0641",
    "Shamrock Rovers FC": "\u0634\u0627\u0645\u0631\u0648\u06A9 \u0631\u0627\u0648\u0631\u0632",
    "FK Partizan": "\u067E\u0627\u0631\u062A\u06CC\u0632\u0627\u0646",
    "Partizan": "\u067E\u0627\u0631\u062A\u06CC\u0632\u0627\u0646",
    "Ludogorets Razgrad": "\u0644\u0648\u062F\u0648\u06AF\u0648\u0631\u062A\u0633",
    "Ludogorets": "\u0644\u0648\u062F\u0648\u06AF\u0648\u0631\u062A\u0633",
    "NK Maribor": "\u0645\u0627\u0631\u06CC\u0628\u0648\u0631",
    "Maribor": "\u0645\u0627\u0631\u06CC\u0628\u0648\u0631",
    "APOEL FC": "\u0622\u067E\u0648\u0626\u0644",
    "HJK Helsinki": "\u0647\u0644\u0633\u06CC\u0646\u06A9\u06CC",
    "FK \u017Dalgiris": "\u0698\u0627\u0644\u06AF\u06CC\u0631\u06CC\u0633",
    "FC Zurich": "\u0632\u0648\u0631\u06CC\u062E",
    "FC Z\xFCrich": "\u0632\u0648\u0631\u06CC\u062E",
    "Z\xFCrich": "\u0632\u0648\u0631\u06CC\u062E",
    "S\xF8nderjyskE": "\u0633\u0648\u0646\u062F\u06CC\u0631\u06CC\u0633\u06A9\u0647",
    "IF Elfsborg": "\u0627\u0644\u0641\u0633\u0628\u0648\u0631\u06AF",
    "Djurg\xE5rdens IF": "\u062F\u06CC\u0648\u0631\u06AF\u0627\u0631\u062F\u0646",
    // UCL participants 2005-06 -> 2024-25 (20-season history coverage)
    "M\xE1laga CF": "\u0645\u0627\u0644\u0627\u06AF\u0627",
    "Malaga CF": "\u0645\u0627\u0644\u0627\u06AF\u0627",
    "FC Schalke 04": "\u0634\u0627\u0644\u06A9\u0647",
    "Schalke 04": "\u0634\u0627\u0644\u06A9\u0647",
    "TSG Hoffenheim": "\u0647\u0648\u0641\u0646\u200C\u0647\u0627\u06CC\u0645",
    "TSG 1899 Hoffenheim": "\u0647\u0648\u0641\u0646\u200C\u0647\u0627\u06CC\u0645",
    "1899 Hoffenheim": "\u0647\u0648\u0641\u0646\u200C\u0647\u0627\u06CC\u0645",
    "Hoffenheim": "\u0647\u0648\u0641\u0646\u200C\u0647\u0627\u06CC\u0645",
    "FC Girondins de Bordeaux": "\u0628\u0648\u0631\u062F\u0648",
    "Bordeaux": "\u0628\u0648\u0631\u062F\u0648",
    "Standard Li\xE8ge": "\u0627\u0633\u062A\u0627\u0646\u062F\u0627\u0631\u062F \u0644\u06CC\u0698",
    "KRC Genk": "\u062E\u0646\u06A9",
    "Genk": "\u062E\u0646\u06A9",
    "KAA Gent": "\u062E\u0646\u062A",
    "Gent": "\u062E\u0646\u062A",
    "AEK Athens": "\u0622\u0626\u06A9 \u0622\u062A\u0646",
    "AEK": "\u0622\u0626\u06A9 \u0622\u062A\u0646",
    "PFC CSKA Moscow": "\u0632\u0633\u06A9\u0627 \u0645\u0633\u06A9\u0648",
    "CSKA Moscow": "\u0632\u0633\u06A9\u0627 \u0645\u0633\u06A9\u0648",
    "FC Zenit Saint Petersburg": "\u0632\u0646\u06CC\u062A \u0633\u0646\u200C\u067E\u062A\u0631\u0632\u0628\u0648\u0631\u06AF",
    "Zenit Saint Petersburg": "\u0632\u0646\u06CC\u062A \u0633\u0646\u200C\u067E\u062A\u0631\u0632\u0628\u0648\u0631\u06AF",
    "Zenit": "\u0632\u0646\u06CC\u062A \u0633\u0646\u200C\u067E\u062A\u0631\u0632\u0628\u0648\u0631\u06AF",
    "FC Spartak Moscow": "\u0627\u0633\u067E\u0627\u0631\u062A\u0627\u06A9 \u0645\u0633\u06A9\u0648",
    "Spartak Moscow": "\u0627\u0633\u067E\u0627\u0631\u062A\u0627\u06A9 \u0645\u0633\u06A9\u0648",
    "FC Lokomotiv Moscow": "\u0644\u0648\u06A9\u0648\u0645\u0648\u062A\u06CC\u0648 \u0645\u0633\u06A9\u0648",
    "Lokomotiv Moscow": "\u0644\u0648\u06A9\u0648\u0645\u0648\u062A\u06CC\u0648 \u0645\u0633\u06A9\u0648",
    "FC Rubin Kazan": "\u0631\u0648\u0628\u06CC\u0646 \u06A9\u0627\u0632\u0627\u0646",
    "Rubin Kazan": "\u0631\u0648\u0628\u06CC\u0646 \u06A9\u0627\u0632\u0627\u0646",
    "FC Rostov": "\u0631\u0648\u0633\u062A\u0648\u0641",
    "Rostov": "\u0631\u0648\u0633\u062A\u0648\u0641",
    "FC Krasnodar": "\u06A9\u0631\u0627\u0633\u0646\u0648\u062F\u0627\u0631",
    "Krasnodar": "\u06A9\u0631\u0627\u0633\u0646\u0648\u062F\u0627\u0631",
    "SK Rapid Wien": "\u0631\u0627\u067E\u06CC\u062F \u0648\u06CC\u0646",
    "Rapid Wien": "\u0631\u0627\u067E\u06CC\u062F \u0648\u06CC\u0646",
    "FK Austria Wien": "\u0622\u0633\u062A\u0631\u06CC\u0627 \u0648\u06CC\u0646",
    "Austria Wien": "\u0622\u0633\u062A\u0631\u06CC\u0627 \u0648\u06CC\u0646",
    "Grasshopper Club Z\xFCrich": "\u06AF\u0631\u0627\u0633\u200C\u0647\u0627\u067E\u0631",
    "Grasshopper": "\u06AF\u0631\u0627\u0633\u200C\u0647\u0627\u067E\u0631",
    "FC Thun": "\u062A\u0648\u0646",
    "Thun": "\u062A\u0648\u0646",
    "AaB Aalborg": "\u0622\u0644\u0628\u0648\u0631\u06AF",
    "Aalborg BK": "\u0622\u0644\u0628\u0648\u0631\u06AF",
    "Aalborg": "\u0622\u0644\u0628\u0648\u0631\u06AF",
    "FC Nordsj\xE6lland": "\u0646\u0648\u0631\u062F\u0634\u06CC\u0644\u0646\u062F",
    "Nordsj\xE6lland": "\u0646\u0648\u0631\u062F\u0634\u06CC\u0644\u0646\u062F",
    "Unirea Urziceni": "\u0627\u0648\u0646\u06CC\u0631\u0626\u0627 \u0627\u0648\u0631\u0632\u06CC\u0686\u0646\u06CC",
    "FC O\u021Belul Gala\u021Bi": "\u0627\u0648\u062A\u0644\u0648\u0644 \u06AF\u0627\u0644\u0627\u062A\u0633\u06CC",
    "O\u021Belul Gala\u021Bi": "\u0627\u0648\u062A\u0644\u0648\u0644 \u06AF\u0627\u0644\u0627\u062A\u0633\u06CC",
    "AEL Limassol": "\u0622\u0626\u0644 \u0644\u06CC\u0645\u0627\u0633\u0648\u0644",
    "AEL": "\u0622\u0626\u0644 \u0644\u06CC\u0645\u0627\u0633\u0648\u0644",
    "Anorthosis Famagusta": "\u0622\u0646\u0648\u0631\u062A\u0648\u0633\u06CC\u0633",
    "Anorthosis": "\u0622\u0646\u0648\u0631\u062A\u0648\u0633\u06CC\u0633",
    "Rosenborg BK": "\u0631\u0648\u0632\u0646\u0628\u0648\u0631\u06AF",
    "Rosenborg": "\u0631\u0648\u0632\u0646\u0628\u0648\u0631\u06AF",
    "Molde FK": "\u0645\u0648\u0644\u062F\u0647",
    "Molde": "\u0645\u0648\u0644\u062F\u0647",
    "Malm\xF6 FF": "\u0645\u0627\u0644\u0645\u0648",
    "Malmo": "\u0645\u0627\u0644\u0645\u0648",
    "Malm\xF6": "\u0645\u0627\u0644\u0645\u0648",
    "Malmo FF": "\u0645\u0627\u0644\u0645\u0648",
    "Maccabi Haifa FC": "\u0645\u06A9\u0627\u0628\u06CC \u062D\u06CC\u0641\u0627",
    "Maccabi Haifa": "\u0645\u06A9\u0627\u0628\u06CC \u062D\u06CC\u0641\u0627",
    "Maccabi Tel Aviv FC": "\u0645\u06A9\u0627\u0628\u06CC \u062A\u0644\u200C\u0622\u0648\u06CC\u0648",
    "Maccabi Tel Aviv": "\u0645\u06A9\u0627\u0628\u06CC \u062A\u0644\u200C\u0622\u0648\u06CC\u0648",
    "Lech Pozna\u0144": "\u0644\u062E \u067E\u0648\u0632\u0646\u0627\u0646",
    "Lech Poznan": "\u0644\u062E \u067E\u0648\u0632\u0646\u0627\u0646",
    "\u0160K Slovan Bratislava": "\u0627\u0633\u0644\u0648\u0627\u0646 \u0628\u0631\u0627\u062A\u06CC\u0633\u0644\u0627\u0648\u0627",
    "Slovan Bratislava": "\u0627\u0633\u0644\u0648\u0627\u0646 \u0628\u0631\u0627\u062A\u06CC\u0633\u0644\u0627\u0648\u0627",
    "M\u0160K \u017Dilina": "\u0698\u06CC\u0644\u06CC\u0646\u0627",
    "\u017Dilina": "\u0698\u06CC\u0644\u06CC\u0646\u0627",
    "FK Artmedia Bratislava": "\u0622\u0631\u062A\u0645\u062F\u06CC\u0627 \u0628\u0631\u0627\u062A\u06CC\u0633\u0644\u0627\u0648\u0627",
    "Artmedia Bratislava": "\u0622\u0631\u062A\u0645\u062F\u06CC\u0627 \u0628\u0631\u0627\u062A\u06CC\u0633\u0644\u0627\u0648\u0627",
    "NK Olimpija Ljubljana": "\u0627\u0644\u0645\u067E\u06CC\u062C\u0627 \u0644\u06CC\u0648\u0628\u0644\u06CC\u0627\u0646\u0627",
    "Olimpija Ljubljana": "\u0627\u0644\u0645\u067E\u06CC\u062C\u0627 \u0644\u06CC\u0648\u0628\u0644\u06CC\u0627\u0646\u0627",
    "Debreceni VSC": "\u062F\u0628\u0631\u0633\u0646",
    "Debrecen": "\u062F\u0628\u0631\u0633\u0646",
    "FC BATE Borisov": "\u0628\u0627\u062A\u0647 \u0628\u0648\u0631\u06CC\u0633\u0648\u0641",
    "BATE Borisov": "\u0628\u0627\u062A\u0647 \u0628\u0648\u0631\u06CC\u0633\u0648\u0641",
    "BATE": "\u0628\u0627\u062A\u0647 \u0628\u0648\u0631\u06CC\u0633\u0648\u0641",
    "FC Sheriff Tiraspol": "\u0634\u0631\u06CC\u0641 \u062A\u06CC\u0631\u0627\u0633\u067E\u0648\u0644",
    "Sheriff Tiraspol": "\u0634\u0631\u06CC\u0641 \u062A\u06CC\u0631\u0627\u0633\u067E\u0648\u0644",
    "Qaraba\u011F FK": "\u0642\u0631\u0647\u200C\u0628\u0627\u063A",
    "Qaraba\u011F": "\u0642\u0631\u0647\u200C\u0628\u0627\u063A",
    "Karabakh": "\u0642\u0631\u0647\u200C\u0628\u0627\u063A",
    "FC Astana": "\u0622\u0633\u062A\u0627\u0646\u0647",
    "Astana": "\u0622\u0633\u062A\u0627\u0646\u0647",
    "SC Braga": "\u0628\u0631\u0627\u06AF\u0627",
    "Braga": "\u0628\u0631\u0627\u06AF\u0627",
    "\u0130stanbul Ba\u015Fak\u015Fehir": "\u0628\u0627\u0634\u0627\u06A9\u200C\u0634\u0647\u0631",
    "Istanbul Basaksehir": "\u0628\u0627\u0634\u0627\u06A9\u200C\u0634\u0647\u0631",
    "Basaksehir": "\u0628\u0627\u0634\u0627\u06A9\u200C\u0634\u0647\u0631",
    "Bursaspor": "\u0628\u0648\u0631\u0633\u0627\u0627\u0633\u067E\u0648\u0631",
    "PFC CSKA Sofia": "\u0632\u0633\u06A9\u0627 \u0635\u0648\u0641\u06CC\u0647",
    "CSKA Sofia": "\u0632\u0633\u06A9\u0627 \u0635\u0648\u0641\u06CC\u0647",
    "PFC Levski Sofia": "\u0644\u0641\u0633\u06A9\u06CC \u0635\u0648\u0641\u06CC\u0647",
    "Levski Sofia": "\u0644\u0641\u0633\u06A9\u06CC \u0635\u0648\u0641\u06CC\u0647",
    // Iran — Persian Gulf Pro League (TheSportsDB names)
    "Persepolis": "\u067E\u0631\u0633\u067E\u0648\u0644\u06CC\u0633",
    "Esteghlal": "\u0627\u0633\u062A\u0642\u0644\u0627\u0644",
    "Sepahan": "\u0633\u067E\u0627\u0647\u0627\u0646",
    "Tractor": "\u062A\u0631\u0627\u06A9\u062A\u0648\u0631",
    "Foolad Khuzestan": "\u0641\u0648\u0644\u0627\u062F \u062E\u0648\u0632\u0633\u062A\u0627\u0646",
    "Gol Gohar Sirjan": "\u06AF\u0644\u200C\u06AF\u0647\u0631 \u0633\u06CC\u0631\u062C\u0627\u0646",
    "Gol Gohar": "\u06AF\u0644\u200C\u06AF\u0647\u0631 \u0633\u06CC\u0631\u062C\u0627\u0646",
    "Chadormalu": "\u0686\u0627\u062F\u0631\u0645\u0644\u0648",
    "Fajr Sepasi": "\u0641\u062C\u0631 \u0633\u067E\u0627\u0633\u06CC",
    "Kheybar Khorramabad": "\u062E\u06CC\u0628\u0631 \u062E\u0631\u0645\u200C\u0622\u0628\u0627\u062F",
    "Malavan": "\u0645\u0644\u0648\u0627\u0646",
    "Esteghlal Khuzestan": "\u0627\u0633\u062A\u0642\u0644\u0627\u0644 \u062E\u0648\u0632\u0633\u062A\u0627\u0646",
    "Paykan": "\u067E\u06CC\u06A9\u0627\u0646",
    "Shams Azar Qazvin": "\u0634\u0645\u0633 \u0622\u0630\u0631",
    "Shams Azar": "\u0634\u0645\u0633 \u0622\u0630\u0631",
    "Aluminium Arak": "\u0622\u0644\u0648\u0645\u06CC\u0646\u06CC\u0648\u0645 \u0627\u0631\u0627\u06A9",
    "Zob Ahan": "\u0630\u0648\u0628\u200C\u0622\u0647\u0646",
    "Mes Rafsanjan": "\u0645\u0633 \u0631\u0641\u0633\u0646\u062C\u0627\u0646",
    // Australia A-League (Wikipedia-sourced via scripts/fa-names-from-wikipedia.js)
    "Perth Glory": "\u067E\u0631\u062B \u06AF\u0644\u0648\u0631\u06CC",
    "Wellington Phoenix": "\u0648\u0644\u06CC\u0646\u06AF\u062A\u0648\u0646 \u0641\u06CC\u0646\u06CC\u06A9\u0633",
    "Newcastle Jets": "\u0646\u06CC\u0648\u06A9\u0627\u0633\u0644 \u062C\u062A\u0633",
    "Western United FC": "\u0648\u0633\u062A\u0631\u0646 \u06CC\u0648\u0646\u0627\u06CC\u062A\u062F",
    "Macarthur FC": "\u0645\u06A9\u0627\u0631\u062B\u0631",
    "Auckland FC": "\u0627\u0648\u06A9\u0644\u0646\u062F",
    // Iran PGL — remaining teams (Wikipedia-sourced)
    "Foolad": "\u0641\u0648\u0644\u0627\u062F \u062E\u0648\u0632\u0633\u062A\u0627\u0646",
    "Foolad Khozestan": "\u0641\u0648\u0644\u0627\u062F \u062E\u0648\u0632\u0633\u062A\u0627\u0646",
    "Fajr Sepasi": "\u0641\u062C\u0631 \u0633\u067E\u0627\u0633\u06CC",
    "Sanat Naft": "\u0635\u0646\u0639\u062A \u0646\u0641\u062A \u0622\u0628\u0627\u062F\u0627\u0646",
    "Sanat-Naft": "\u0635\u0646\u0639\u062A \u0646\u0641\u062A \u0622\u0628\u0627\u062F\u0627\u0646",
    "Shams Azar Qazvin": "\u0634\u0645\u0633\u200C\u0622\u0630\u0631",
    "Chadormalu SC": "\u0686\u0627\u062F\u0631\u0645\u0644\u0648",
    "Paykan": "\u067E\u06CC\u06A9\u0627\u0646",
    "Mes Shahr Babak FC": "\u0645\u0633 \u0634\u0647\u0631\u0628\u0627\u0628\u06A9",
    "Nassaji Mazandaran": "\u0646\u0633\u0627\u062C\u06CC \u0645\u0627\u0632\u0646\u062F\u0631\u0627\u0646",
    "Esteghlal Khozestan": "\u0627\u0633\u062A\u0642\u0644\u0627\u0644 \u062E\u0648\u0632\u0633\u062A\u0627\u0646"
  };
  return FA_TEAMS;
}
__name(buildFaTeamDict, "buildFaTeamDict");
__name2(buildFaTeamDict, "buildFaTeamDict");
function translateTeam(englishName) {
  if (!FA_TEAMS_DICT) {
    FA_TEAMS_DICT = buildFaTeamDict();
    FA_TEAMS_NORM = /* @__PURE__ */ new Map();
    FA_TEAMS_STEM = [];
    for (const [en, fa] of Object.entries(FA_TEAMS_DICT)) {
      FA_TEAMS_NORM.set((0, import_teams.normTeamKey)(en), fa);
      FA_TEAMS_STEM.push([(0, import_teams.normTeamKey)(en).replace(/\d+/g, ""), fa]);
    }
  }
  if (FA_TEAMS_DICT[englishName]) return FA_TEAMS_DICT[englishName];
  const key = (0, import_teams.normTeamKey)(englishName);
  if (!key) return englishName;
  const normHit = FA_TEAMS_NORM.get(key);
  if (normHit) return normHit;
  if (FA_AI_CACHE && FA_AI_CACHE.size) {
    const aiHit = FA_AI_CACHE.get(key);
    if (aiHit) return aiHit;
  }
  const prov = key.replace(/\d+/g, "");
  if (prov.length >= 4) {
    let hit = null, hits = 0;
    for (const [d, fa] of FA_TEAMS_STEM) {
      if (d.length >= 4 && (prov.includes(d) || d.includes(prov))) {
        hit = fa;
        hits++;
      }
    }
    if (hits === 1) return hit;
  }
  return englishName;
}
__name(translateTeam, "translateTeam");
__name2(translateTeam, "translateTeam");
async function ensureFaAiCache(env) {
  if (FA_AI_CACHE) return FA_AI_CACHE;
  FA_AI_CACHE = /* @__PURE__ */ new Map();
  const rec = await env.STATE.get(CONFIG.KV_FA_TEAMS, "json").catch(() => null);
  if (rec && rec.learned && typeof rec.learned === "object") {
    for (const [k, v] of Object.entries(rec.learned)) {
      if (typeof v === "string" && v) FA_AI_CACHE.set(k, v);
    }
  }
  return FA_AI_CACHE;
}
__name(ensureFaAiCache, "ensureFaAiCache");
__name2(ensureFaAiCache, "ensureFaAiCache");
function resetFaAiCache() {
  FA_AI_CACHE = null;
}
__name(resetFaAiCache, "resetFaAiCache");
__name2(resetFaAiCache, "resetFaAiCache");
function isValidFaName(fa) {
  if (typeof fa !== "string") return false;
  const v = fa.trim();
  if (v.length < 2 || v.length > 42) return false;
  if (!/[\u0621-\u064A\u0671-\u06D3]/.test(v)) return false;
  return /^[\u0600-\u06FF\u200C\s\-\u0640()\/]+$/.test(v);
}
__name(isValidFaName, "isValidFaName");
__name2(isValidFaName, "isValidFaName");
function collectUnknownTeamNames(data) {
  const out = /* @__PURE__ */ new Set();
  const addName = /* @__PURE__ */ __name((n) => {
    const s = String(n || "").trim();
    if (!s || s.length > 48) return;
    if (/[\u0600-\u06FF]/.test(s)) return;
    if (translateTeam(s) !== s) return;
    out.add(s);
  }, "addName");
  if (!data) return [...out];
  if (data.ucl && Array.isArray(data.ucl.teams)) data.ucl.teams.forEach((t) => addName(t && t.name));
  if (data.standings && typeof data.standings === "object") {
    Object.values(data.standings).forEach((st) => {
      if (st && Array.isArray(st.teams)) st.teams.forEach((t) => addName(t && t.name));
    });
  }
  const pools = [
    Array.isArray(data.upcoming) ? data.upcoming : [],
    Array.isArray(data.finished) ? data.finished : [],
    Array.isArray(data.thisWeek) ? data.thisWeek : []
  ];
  if (data.topSpot && Array.isArray(data.topSpot.matches)) pools.push(data.topSpot.matches);
  if (data.topSpot && data.topSpot.next) pools.push([data.topSpot.next]);
  if (data.nextBig) pools.push([data.nextBig]);
  for (const pool of pools) {
    for (const m of pool) {
      if (!m) continue;
      if (m.homeTeam) addName(m.homeTeam.name);
      if (m.awayTeam) addName(m.awayTeam.name);
    }
  }
  return [...out];
}
__name(collectUnknownTeamNames, "collectUnknownTeamNames");
__name2(collectUnknownTeamNames, "collectUnknownTeamNames");
function parseAiNameMap(raw, batch) {
  if (!raw) return null;
  const cleaned = String(raw).replace(/```(?:json)?/gi, "").trim();
  let parsed = null;
  try {
    parsed = JSON.parse(cleaned);
  } catch (e) {
    parsed = null;
  }
  if (parsed == null) {
    const a = cleaned.indexOf("{"), b = cleaned.lastIndexOf("}");
    if (a >= 0 && b > a) {
      try {
        parsed = JSON.parse(cleaned.slice(a, b + 1));
      } catch (e) {
        parsed = null;
      }
    }
  }
  if (parsed == null) {
    const a = cleaned.indexOf("["), b = cleaned.lastIndexOf("]");
    if (a >= 0 && b > a) {
      try {
        parsed = JSON.parse(cleaned.slice(a, b + 1));
      } catch (e) {
        parsed = null;
      }
    }
  }
  if (parsed == null || typeof parsed !== "object") return null;
  const sources = Array.isArray(parsed) ? parsed : [parsed].concat(Object.values(parsed).filter((v) => v && typeof v === "object"));
  const flat = {};
  for (const name of batch) {
    for (const src of sources) {
      if (typeof src[name] === "string") {
        flat[name] = src[name];
        break;
      }
    }
    if (flat[name] === void 0 && Array.isArray(parsed)) {
      for (const row of parsed) {
        if (!row || typeof row !== "object") continue;
        const id = row.name || row.club || row.input || row.en;
        if (typeof id === "string" && id.trim() === name) {
          const fa = row.fa || row.farsi || row.persian || row.translation || row.translated || row.fa_name;
          if (typeof fa === "string") {
            flat[name] = fa;
            break;
          }
        }
        if (typeof row[name] === "string") {
          flat[name] = row[name];
          break;
        }
      }
    }
  }
  return Object.keys(flat).length ? flat : null;
}
__name(parseAiNameMap, "parseAiNameMap");
__name2(parseAiNameMap, "parseAiNameMap");
async function runFaAiLearner(env, names, force) {
  if (!env || !env.AI) return { ok: false, skipped: "ai-disabled", learned: 0, failed: 0, pending: (names || []).length };
  const rec = await env.STATE.get(CONFIG.KV_FA_TEAMS, "json").catch(() => null) || { v: 1, learned: {}, failed: {} };
  if (!rec.learned) rec.learned = {};
  if (!rec.failed) rec.failed = {};
  const now = Date.now();
  const pending = (names || []).filter((n) => {
    const k = (0, import_teams.normTeamKey)(n);
    if (!k || rec.learned[k]) return false;
    if (force) return true;
    const failTs = parseInt(rec.failed[k]) || 0;
    return !(failTs && now - failTs < CONFIG.FA_AI_FAIL_RETRY_MS);
  });
  if (!pending.length) return { ok: true, learned: 0, failed: 0, pending: 0, totalLearned: Object.keys(rec.learned).length };
  const batch = pending.slice(0, CONFIG.FA_AI_MAX_BATCH);
  const v3 = await env.STATE.get(CONFIG.KV_V3_CATALOG, "json").catch(() => null);
  const normFa = /* @__PURE__ */ __name((s) => String(s || "").replace(/[\s\u200c]/g, ""), "normFa");
  const v3Norm = /* @__PURE__ */ new Map();
  let v3Hint = "";
  if (v3 && Array.isArray(v3.clubs) && v3.clubs.length) {
    const byLeague = {};
    for (const c of v3.clubs) {
      if (!c || !c.n) continue;
      v3Norm.set(normFa(c.n), c.n);
      (byLeague[c.c || "other"] = byLeague[c.c || "other"] || []).push(c.n);
    }
    v3Hint = Object.entries(byLeague).map(([lg, names2]) => lg + ": " + names2.join(", ")).join(" | ");
    if (v3Hint.length > 2600) v3Hint = v3Hint.slice(0, 2600);
  }
  const sys = 'You translate football (soccer) club names to Persian (Farsi) as used by Iranian sports media. Reply with ONLY a minified JSON object mapping every EXACT input name to its Persian name. Use the established common short form (e.g. "Sporting CP"\u2192"\u0627\u0633\u067E\u0648\u0631\u062A\u06CC\u0646\u06AF \u0644\u06CC\u0633\u0628\u0648\u0646", "SK Slavia Praha"\u2192"\u0627\u0633\u0644\u0627\u0648\u06CC\u0627 \u067E\u0631\u0627\u06AF", "PAE AEK"\u2192"\u0622\u06CC\u06A9 \u0622\u062A\u0646"). Transliterate unknown clubs phonetically. NEVER use Latin letters. No markdown, no explanations.' + (v3Hint ? "\nCanonical Persian club names from varzesh3.com (the reference Iranian sports media) \u2014 when a club appears below, return EXACTLY that spelling: " + v3Hint : "");
  const user = JSON.stringify(batch);
  let raw = null, model = null, rawDump = null;
  for (const m of ["@cf/meta/llama-3.3-70b-instruct-fp8-fast", "@cf/meta/llama-3.1-8b-instruct"]) {
    try {
      const r = await env.AI.run(m, { messages: [{ role: "system", content: sys }, { role: "user", content: user }], max_tokens: 1200 });
      try {
        rawDump = JSON.stringify(r).slice(0, 400);
      } catch (e) {
        rawDump = String(r).slice(0, 400);
      }
      raw = r && (r.choices && r.choices[0] && r.choices[0].message && r.choices[0].message.content || r.choices && r.choices[0] && r.choices[0].text || r.response || r.text || (typeof r === "string" ? r : null));
      if (raw) {
        model = m;
        break;
      }
    } catch (e) {
      console.warn("FA-AI model " + m + " failed: " + e.message);
    }
  }
  const map = parseAiNameMap(raw, batch);
  let learned = 0, failed = 0;
  for (const name of batch) {
    const k = (0, import_teams.normTeamKey)(name);
    if (!k) continue;
    const fa = map ? map[name] : null;
    if (isValidFaName(fa)) {
      const snap = v3Norm.get(normFa(fa));
      rec.learned[k] = snap || String(fa).trim();
      delete rec.failed[k];
      learned++;
    } else {
      rec.failed[k] = String(now);
      failed++;
    }
  }
  rec.ts = now;
  await env.STATE.put(CONFIG.KV_FA_TEAMS, JSON.stringify(rec)).catch(() => {
  });
  resetFaAiCache();
  const out = { ok: true, learned, failed, model, pending: pending.length - batch.length, asked: batch.length, totalLearned: Object.keys(rec.learned).length };
  if (askedAndFailed(out)) out.rawHead = rawDump || (raw ? String(raw).slice(0, 160) : "(no model output)");
  return out;
}
__name(runFaAiLearner, "runFaAiLearner");
__name2(runFaAiLearner, "runFaAiLearner");
function askedAndFailed(out) {
  return out && out.asked > 0 && out.learned === 0;
}
__name(askedAndFailed, "askedAndFailed");
__name2(askedAndFailed, "askedAndFailed");
async function maybeRunFaAi(env, force) {
  try {
    if (!env || !env.AI) return { ok: false, skipped: "ai-disabled" };
    if (!force) {
      const last = parseInt(await env.STATE.get(CONFIG.KV_FA_LAST_RUN).catch(() => null)) || 0;
      if (last && Date.now() - last < CONFIG.FA_AI_RUN_EVERY_MS) return { ok: true, skipped: "cooldown", sinceMin: Math.round((Date.now() - last) / 6e4) };
    }
    await env.STATE.put(CONFIG.KV_FA_LAST_RUN, String(Date.now()), { expirationTtl: Math.ceil(CONFIG.FA_AI_FAIL_RETRY_MS / 1e3) }).catch(() => {
    });
    await ensureFaAiCache(env);
    const cached = await env.STATE.get(CONFIG.KV_PUBLIC_MATCHES, "json").catch(() => null);
    const names = cached && cached.data ? collectUnknownTeamNames(cached.data) : [];
    if (!names.length) return { ok: true, learned: 0, failed: 0, pending: 0, totalLearned: FA_AI_CACHE ? FA_AI_CACHE.size : 0 };
    const res = await runFaAiLearner(env, names, force);
    console.log(`\u{1F9E0} FA-AI learner: asked=${res.asked || 0} learned=${res.learned || 0} rejected=${res.failed || 0} pending=${res.pending || 0} model=${res.model || "-"}`);
    return res;
  } catch (e) {
    console.error("FA-AI learner failed: " + e.message);
    return { ok: false, error: e.message };
  }
}
__name(maybeRunFaAi, "maybeRunFaAi");
__name2(maybeRunFaAi, "maybeRunFaAi");
function translateCompetition(code) {
  const FA_COMPS = {
    "CL": "\u0644\u06CC\u06AF \u0642\u0647\u0631\u0645\u0627\u0646\u0627\u0646 \u0627\u0631\u0648\u067E\u0627",
    "PL": "\u0644\u06CC\u06AF \u0628\u0631\u062A\u0631 \u0627\u0646\u06AF\u0644\u06CC\u0633",
    "PD": "\u0644\u0627\u0644\u06CC\u06AF\u0627",
    "SA": "\u0633\u0631\u06CC\u200C\u0622",
    "FL1": "\u0644\u06CC\u06AF \u06CC\u06A9 \u0641\u0631\u0627\u0646\u0633\u0647",
    "EL": "\u0644\u06CC\u06AF \u0627\u0631\u0648\u067E\u0627",
    "ECL": "\u0644\u06CC\u06AF \u06A9\u0646\u0641\u0631\u0627\u0646\u0633 \u0627\u0631\u0648\u067E\u0627",
    "BL1": "\u0628\u0648\u0646\u062F\u0633\u0644\u06CC\u06AF\u0627",
    "FA_CUP": "\u062C\u0627\u0645 \u062D\u0630\u0641\u06CC \u0627\u0646\u06AF\u0644\u06CC\u0633",
    "EFL_CUP": "\u062C\u0627\u0645 \u0627\u062A\u062D\u0627\u062F\u06CC\u0647 \u0627\u0646\u06AF\u0644\u06CC\u0633 (\u06A9\u0627\u0631\u0627\u0628\u0627\u0626\u0648)",
    "CDR": "\u062C\u0627\u0645 \u062D\u0630\u0641\u06CC \u0627\u0633\u067E\u0627\u0646\u06CC\u0627",
    "COPPA_ITALIA": "\u062C\u0627\u0645 \u062D\u0630\u0641\u06CC \u0627\u06CC\u062A\u0627\u0644\u06CC\u0627",
    "DFB_POKAL": "\u062C\u0627\u0645 \u062D\u0630\u0641\u06CC \u0622\u0644\u0645\u0627\u0646",
    "PGL": "\u0644\u06CC\u06AF \u0628\u0631\u062A\u0631 \u062E\u0644\u06CC\u062C \u0641\u0627\u0631\u0633",
    "HAZFI_CUP": "\u062C\u0627\u0645 \u062D\u0630\u0641\u06CC \u0627\u06CC\u0631\u0627\u0646",
    "AL": "\u0644\u06CC\u06AF \u0627\u0633\u062A\u0631\u0627\u0644\u06CC\u0627",
    "WC": "\u062C\u0627\u0645 \u062C\u0647\u0627\u0646\u06CC",
    "EC": "\u062C\u0627\u0645 \u0645\u0644\u062A\u200C\u0647\u0627\u06CC \u0627\u0631\u0648\u067E\u0627",
    "COPA": "\u06A9\u0648\u067E\u0627 \u0622\u0645\u0631\u06CC\u06A9\u0627",
    "AFCON": "\u062C\u0627\u0645 \u0645\u0644\u062A\u200C\u0647\u0627\u06CC \u0622\u0641\u0631\u06CC\u0642\u0627",
    "AFC": "\u062C\u0627\u0645 \u0645\u0644\u062A\u200C\u0647\u0627\u06CC \u0622\u0633\u06CC\u0627",
    "PGL": "\u0644\u06CC\u06AF \u0628\u0631\u062A\u0631 \u062E\u0644\u06CC\u062C \u0641\u0627\u0631\u0633",
    "HAZFI_CUP": "\u062C\u0627\u0645 \u062D\u0630\u0641\u06CC \u0627\u06CC\u0631\u0627\u0646"
  };
  return FA_COMPS[code] || code;
}
__name(translateCompetition, "translateCompetition");
__name2(translateCompetition, "translateCompetition");
var LEAGUE_LOGOS = {
  "CL": "https://media.api-sports.io/football/leagues/2.png",
  "EL": "https://media.api-sports.io/football/leagues/3.png",
  "ECL": "https://media.api-sports.io/football/leagues/848.png",
  "PL": "https://media.api-sports.io/football/leagues/39.png",
  "PD": "https://media.api-sports.io/football/leagues/140.png",
  "SA": "https://media.api-sports.io/football/leagues/135.png",
  "FL1": "https://media.api-sports.io/football/leagues/61.png",
  "BL1": "https://media.api-sports.io/football/leagues/78.png",
  "PGL": "https://media.api-sports.io/football/leagues/139.png",
  "AL": "https://media.api-sports.io/football/leagues/188.png",
  "FA_CUP": "https://media.api-sports.io/football/leagues/45.png",
  "EFL_CUP": "https://media.api-sports.io/football/leagues/41.png",
  "CDR": "https://media.api-sports.io/football/leagues/143.png",
  "COPPA_ITALIA": "https://media.api-sports.io/football/leagues/137.png",
  "DFB_POKAL": "https://media.api-sports.io/football/leagues/4540.png",
  "PGL": "https://media.api-sports.io/football/leagues/290.png",
  "HAZFI_CUP": "https://media.api-sports.io/football/leagues/719.png",
  "WC": "https://media.api-sports.io/football/leagues/1.png",
  "EC": "https://media.api-sports.io/football/leagues/4.png",
  "COPA": "https://media.api-sports.io/football/leagues/9.png",
  "AFCON": "https://media.api-sports.io/football/leagues/79.png",
  "AFC": "https://media.api-sports.io/football/leagues/77.png"
};
var COMP_EN = {
  "CL": "Champions League",
  "EL": "Europa League",
  "ECL": "Conference League",
  "PL": "Premier League",
  "PD": "La Liga",
  "SA": "Serie A",
  "FL1": "Ligue 1",
  "BL1": "Bundesliga",
  "FA_CUP": "FA Cup",
  "EFL_CUP": "EFL Cup",
  "CDR": "Copa del Rey",
  "COPPA_ITALIA": "Coppa Italia",
  "DFB_POKAL": "DFB Pokal",
  "PGL": "Persian Gulf Pro League",
  "HAZFI_CUP": "Hazfi Cup",
  "AL": "A-League",
  "WC": "World Cup",
  "EC": "European Championship",
  "COPA": "Copa Am\xE9rica",
  "AFCON": "Africa Cup of Nations",
  "AFC": "AFC Asian Cup"
};
function getCompetitionPriority(code) {
  return CONFIG.PRIORITY[code] || CONFIG.PRIORITY.DEFAULT;
}
__name(getCompetitionPriority, "getCompetitionPriority");
__name2(getCompetitionPriority, "getCompetitionPriority");
function isDomesticCup(code) {
  return Object.keys(CONFIG.DOMESTIC_CUP_IDS).includes(code);
}
__name(isDomesticCup, "isDomesticCup");
__name2(isDomesticCup, "isDomesticCup");
function isQuarterFinalOrLater(stage) {
  return CONFIG.LATE_STAGES.includes(stage);
}
__name(isQuarterFinalOrLater, "isQuarterFinalOrLater");
__name2(isQuarterFinalOrLater, "isQuarterFinalOrLater");
async function getNotifiedMatches(env) {
  try {
    const data = await env.STATE.get(CONFIG.KV_NOTIFIED_KEY, "json");
    return data || {};
  } catch (error) {
    console.log("No notified matches found, starting fresh");
    return {};
  }
}
__name(getNotifiedMatches, "getNotifiedMatches");
__name2(getNotifiedMatches, "getNotifiedMatches");
async function saveNotifiedMatch(env, match, notificationType, notifiedMatches) {
  const now = Date.now();
  const matchTime = new Date(match.utcDate).getTime();
  const key = (0, import_dedupe.matchKey)(match);
  let expiresAt;
  switch (notificationType) {
    case "pre-match-24h":
    case "pre-match-3h":
    case "pre-match-1h":
      expiresAt = matchTime + CONFIG.ONE_HOUR_MS;
      break;
    case "match-start":
      expiresAt = matchTime + CONFIG.TWO_HOURS_MS;
      break;
    case "result":
      expiresAt = now + CONFIG.ONE_DAY_MS;
      break;
    default:
      expiresAt = matchTime + CONFIG.ONE_HOUR_MS;
  }
  if (!notifiedMatches[key]) {
    notifiedMatches[key] = [];
  }
  notifiedMatches[key] = notifiedMatches[key].filter((n) => now < n.expiresAt);
  notifiedMatches[key].push({
    matchId: key,
    notifiedAt: now,
    expiresAt,
    matchDate: match.utcDate,
    notificationType
  });
  const allNotifications = Object.values(notifiedMatches).flat();
  const overallExpiresAt = allNotifications.length > 0 ? Math.max(...allNotifications.map((n) => n.expiresAt)) : now + CONFIG.ONE_DAY_MS;
  const ttlSeconds = Math.ceil((overallExpiresAt - now) / 1e3);
  vlog(`\u{1F4BE} Saving notification: match=${key}, type=${notificationType}, total_tracked=${Object.keys(notifiedMatches).length}, ttl=${ttlSeconds}s`);
  try {
    await env.STATE.put(
      CONFIG.KV_NOTIFIED_KEY,
      JSON.stringify(notifiedMatches),
      { expirationTtl: ttlSeconds > 0 ? ttlSeconds : 3600 }
    );
  } catch (e) {
    console.error("Notification state save failed (continuing): " + e.message);
  }
}
__name(saveNotifiedMatch, "saveNotifiedMatch");
__name2(saveNotifiedMatch, "saveNotifiedMatch");
async function shouldSendNotification(env, match, notificationType, notifiedMatches) {
  const now = Date.now();
  const key = (0, import_dedupe.matchKey)(match);
  if (notifiedMatches[key]) {
    const existingNotification = notifiedMatches[key].find(
      (n) => n.notificationType === notificationType && now < n.expiresAt
    );
    if (existingNotification) {
      const timeAgo = ((now - existingNotification.notifiedAt) / CONFIG.ONE_HOUR_MS).toFixed(1);
      console.log(`\u23ED\uFE0F Skipping ${notificationType} for match ${key}: Already sent ${timeAgo}h ago`);
      return false;
    }
  }
  switch (notificationType) {
    case "pre-match-72h":
      return isWithinBigMatchWindow(match, env) || isBackfillEligible(match, "pre-match-72h", env);
    case "pre-match-24h":
      return isWithin24HourWindow(match, env) || isBackfillEligible(match, "pre-match-24h", env);
    case "pre-match-3h":
      return isWithin3HourWindow(match, env) || isBackfillEligible(match, "pre-match-3h", env);
    case "pre-match-1h":
      return isWithin1HourWindow(match, env) || isBackfillEligible(match, "pre-match-1h", env);
    case "pre-match-5min":
      return isWithin5MinWindow(match, env);
    case "match-start":
      return isMatchStartingNow(match, env);
    case "result":
      return isMatchFinished(match) && isWithinPostMatchWindow(match, env) || isBackfillEligible(match, "result", env);
    default:
      return false;
  }
}
__name(shouldSendNotification, "shouldSendNotification");
__name2(shouldSendNotification, "shouldSendNotification");
function isWithin24HourWindow(match, _env) {
  const now = getNowUTC();
  const matchTime = new Date(match.utcDate);
  if (matchTime <= now) return false;
  const hoursUntilMatch = (matchTime.getTime() - now.getTime()) / CONFIG.ONE_HOUR_MS;
  return hoursUntilMatch <= 24 && hoursUntilMatch >= 20;
}
__name(isWithin24HourWindow, "isWithin24HourWindow");
__name2(isWithin24HourWindow, "isWithin24HourWindow");
function isWithinBigMatchWindow(match, _env) {
  const now = getNowUTC();
  const matchTime = new Date(match.utcDate);
  if (matchTime <= now) return false;
  const hoursUntilMatch = (matchTime.getTime() - now.getTime()) / CONFIG.ONE_HOUR_MS;
  return hoursUntilMatch <= CONFIG.BIG_MATCH_NOTIFICATION_HOURS && hoursUntilMatch >= CONFIG.BIG_MATCH_NOTIFICATION_HOURS - 4;
}
__name(isWithinBigMatchWindow, "isWithinBigMatchWindow");
__name2(isWithinBigMatchWindow, "isWithinBigMatchWindow");
function isWithin3HourWindow(match, _env) {
  const now = getNowUTC();
  const matchTime = new Date(match.utcDate);
  if (matchTime <= now) return false;
  const hoursUntilMatch = (matchTime.getTime() - now.getTime()) / CONFIG.ONE_HOUR_MS;
  return hoursUntilMatch <= 3.5 && hoursUntilMatch >= 2.5;
}
__name(isWithin3HourWindow, "isWithin3HourWindow");
__name2(isWithin3HourWindow, "isWithin3HourWindow");
function isWithin1HourWindow(match, _env) {
  const now = getNowUTC();
  const matchTime = new Date(match.utcDate);
  if (matchTime <= now) return false;
  const hoursUntilMatch = (matchTime.getTime() - now.getTime()) / CONFIG.ONE_HOUR_MS;
  return hoursUntilMatch <= 1.5 && hoursUntilMatch >= 0.75;
}
__name(isWithin1HourWindow, "isWithin1HourWindow");
__name2(isWithin1HourWindow, "isWithin1HourWindow");
// v12.x-cron-gaps: 5-minute "kickoff now" reminder window. Fires for BIG
// matches only (both teams big), 1-10 minutes before kickoff. The 10-min
// width matches the cron tick cadence so the sweep catches the window at
// least once (worst case the reminder lands ~1 min before kickoff).
function isWithin5MinWindow(match, _env) {
  const now = getNowUTC();
  const matchTime = new Date(match.utcDate);
  if (matchTime <= now) return false;
  const minutesUntilMatch = (matchTime.getTime() - now.getTime()) / (60 * 1e3);
  return minutesUntilMatch > 0 && minutesUntilMatch <= 10;
}
__name(isWithin5MinWindow, "isWithin5MinWindow");
__name2(isWithin5MinWindow, "isWithin5MinWindow");
function isMatchStartingNow(match, _env) {
  const now = getNowUTC();
  const matchTime = new Date(match.utcDate);
  const minutesSinceKickoff = (now.getTime() - matchTime.getTime()) / (60 * 1e3);
  if (minutesSinceKickoff < -1 || minutesSinceKickoff > 20) return false;
  const status = String(match.status || "").toUpperCase();
  return status !== "FINISHED" && status !== "POSTPONED" && status !== "SUSPENDED" && status !== "CANCELLED" && status !== "CANCEL";
}
__name(isMatchStartingNow, "isMatchStartingNow");
__name2(isMatchStartingNow, "isMatchStartingNow");
function isWithinPostMatchWindow(match, _env) {
  if (!isMatchFinished(match)) return false;
  const now = getNowUTC();
  const matchTime = new Date(match.utcDate);
  const hoursSinceMatch = (now.getTime() - matchTime.getTime()) / CONFIG.ONE_HOUR_MS;
  return hoursSinceMatch <= CONFIG.POST_MATCH_NOTIFICATION_HOURS;
}
__name(isWithinPostMatchWindow, "isWithinPostMatchWindow");
__name2(isWithinPostMatchWindow, "isWithinPostMatchWindow");
function isBackfillEligible(match, type, _env) {
  const now = getNowUTC();
  const matchTime = new Date(match.utcDate);
  if (type === "result") {
    if (!isMatchFinished(match)) return false;
    const hoursSince = (now.getTime() - matchTime.getTime()) / CONFIG.ONE_HOUR_MS;
    return hoursSince > CONFIG.POST_MATCH_NOTIFICATION_HOURS && hoursSince <= 24;
  }
  if (matchTime <= now) return false;
  const hoursUntil = (matchTime.getTime() - now.getTime()) / CONFIG.ONE_HOUR_MS;
  const floors = { "pre-match-24h": 3.5, "pre-match-3h": 1.5, "pre-match-1h": 10 / 60, "pre-match-72h": CONFIG.BIG_MATCH_NOTIFICATION_HOURS - 24 };
  const maxes = { "pre-match-24h": 24, "pre-match-3h": 3.5, "pre-match-1h": 1.5, "pre-match-72h": CONFIG.BIG_MATCH_NOTIFICATION_HOURS };
  const floor = floors[type];
  const max = maxes[type];
  if (floor === void 0) return false;
  return hoursUntil <= max && hoursUntil > floor;
}
__name(isBackfillEligible, "isBackfillEligible");
__name2(isBackfillEligible, "isBackfillEligible");
function isMatchFinished(match) {
  return match.status === "FINISHED";
}
__name(isMatchFinished, "isMatchFinished");
__name2(isMatchFinished, "isMatchFinished");
async function cleanupExpiredNotifications(env) {
  const hourStamp = Math.floor(Date.now() / 36e5);
  const lastCleanup = parseInt(await env.STATE.get("cleanup_hour").catch(() => null)) || 0;
  if (lastCleanup === hourStamp) return;
  const notifiedMatches = await getNotifiedMatches(env);
  const now = Date.now();
  let cleanedCount = 0;
  for (const [matchId, notifications] of Object.entries(notifiedMatches)) {
    const validNotifications = notifications.filter((n) => now < n.expiresAt);
    if (validNotifications.length !== notifications.length) {
      cleanedCount += notifications.length - validNotifications.length;
      if (validNotifications.length > 0) {
        notifiedMatches[matchId] = validNotifications;
      } else {
        delete notifiedMatches[matchId];
      }
    }
  }
  if (cleanedCount > 0) {
    const allNotifications = Object.values(notifiedMatches).flat();
    const maxExpiry = allNotifications.length > 0 ? Math.max(...allNotifications.map((n) => n.expiresAt)) : now + 36e5;
    const ttl = Math.max(3600, Math.ceil((maxExpiry - now) / 1e3));
    try {
      await env.STATE.put(
        CONFIG.KV_NOTIFIED_KEY,
        JSON.stringify(notifiedMatches),
        // ✅ Must be string for KV
        { expirationTtl: ttl }
      );
    } catch (e) {
      console.error("Notification cleanup write failed: " + e.message);
    }
    console.log(`\u{1F9F9} Cleaned up ${cleanedCount} expired notifications`);
  }
  await env.STATE.put("cleanup_hour", String(hourStamp), { expirationTtl: 2 * 36e5 }).catch(() => {
  });
}
__name(cleanupExpiredNotifications, "cleanupExpiredNotifications");
__name2(cleanupExpiredNotifications, "cleanupExpiredNotifications");
function shouldNotify(match) {
  const compCode = match.competition.code;
  const normHome = normAlias(match.homeTeam.name);
  const normAway = normAlias(match.awayTeam.name);
  let c = CONFIG.__teamNorm;
  if (!c || c.sig !== CONFIG.BIG_TEAMS_BY_LEAGUE) {
    const all = /* @__PURE__ */ new Set();
    const byLeague = {};
    for (const [lg, list] of Object.entries(CONFIG.BIG_TEAMS_BY_LEAGUE)) {
      const normList = /* @__PURE__ */ new Set();
      for (const t of list) {
        const n = (0, import_teams.normalizeTeamName)(t);
        normList.add(n);
        all.add(n);
      }
      byLeague[lg] = normList;
    }
    c = { sig: CONFIG.BIG_TEAMS_BY_LEAGUE, all, byLeague };
    CONFIG.__teamNorm = c;
  }
  if (compCode === "CL" || isDomesticCup(compCode)) {
    if (c.all.has(normHome) || c.all.has(normAway)) {
      return true;
    }
    if (isQuarterFinalOrLater(match.stage)) {
      return true;
    }
    return false;
  }
  const leagueTeams = c.byLeague[compCode];
  return !!(leagueTeams && (leagueTeams.has(normHome) || leagueTeams.has(normAway)));
}
__name(shouldNotify, "shouldNotify");
__name2(shouldNotify, "shouldNotify");
var BIG_MATCH_TEAMS = [
  // England
  "Arsenal FC",
  "Chelsea FC",
  "Chelsea",
  "Manchester City FC",
  "Manchester United FC",
  "Liverpool FC",
  "Manchester City",
  "Manchester United",
  // Italy
  "AC Milan",
  "Inter Milan",
  "Milan",
  "Inter",
  // Spain
  "FC Barcelona",
  "Real Madrid CF",
  "Atl\xE9tico Madrid",
  "Barcelona",
  "Real Madrid",
  "Atletico Madrid",
  "Atleti",
  // Germany (BL1 now monitored + UEFA cups)
  "FC Bayern M\xFCnchen",
  "Bayern Munich",
  "Bayern M\xFCnchen",
  "Borussia Dortmund",
  "Dortmund",
  // Australia (A-League)
  "Melbourne Victory",
  "Melbourne City",
  "Sydney FC",
  "Western Sydney Wanderers",
  "Adelaide United"
];
var BIG_MATCH_UEFA = BIG_MATCH_TEAMS.concat(["Paris Saint-Germain", "PSG"]);
function isFeaturedMatch(match) {
  const code = match.competition.code;
  const isUefa = code === "CL" || code === "EL" || code === "ECL" || isDomesticCup(code);
  const pool = isUefa ? BIG_MATCH_UEFA : BIG_MATCH_TEAMS;
  if (!pool.__normSet) pool.__normSet = /* @__PURE__ */ new Set(pool.map(import_teams.normalizeTeamName));
  const nset = pool.__normSet;
  return nset.has(normAlias(match.homeTeam.name)) && nset.has(normAlias(match.awayTeam.name));
}
__name(isFeaturedMatch, "isFeaturedMatch");
__name2(isFeaturedMatch, "isFeaturedMatch");
var TEAM_ALIASES = {
  "clubatleticodemadrid": "atleticomadrid",
  "atleticodemadrid": "atleticomadrid",
  "internazionale": "intermilan",
  "internazionalemilano": "intermilan",
  // v12.15: the English exonym "Bayern Munich" folds to the German legal
  // name — NFD diacritics-folding turns München into "Munchen", not
  // "Munich", so without this alias the SAME club could sit twice in a
  // selected-teams list (the reported duplicate) and never match the other
  // spelling's fixtures.
  "bayernmunich": "bayernmunchen"
};
function normAlias(name) {
  const n = (0, import_teams.normalizeTeamName)(name);
  return TEAM_ALIASES[n] || n;
}
__name(normAlias, "normAlias");
__name2(normAlias, "normAlias");
function isDomesticLeagueCode(code) {
  const by = CONFIG.BIG_TEAMS_BY_LEAGUE || {};
  return !!by[code] && code !== "CL" && code !== "EL" && code !== "ECL";
}
__name(isDomesticLeagueCode, "isDomesticLeagueCode");
__name2(isDomesticLeagueCode, "isDomesticLeagueCode");
function isMasterPair(match) {
  masterTeamList();
  const nset = _masterMemo.normSet;
  return nset.has(normAlias(match.homeTeam.name)) && nset.has(normAlias(match.awayTeam.name));
}
__name(isMasterPair, "isMasterPair");
__name2(isMasterPair, "isMasterPair");
function hasSelectedTeam(match) {
  masterTeamList();
  const nset = _masterMemo.normSet;
  return nset.has(normAlias(match.homeTeam.name)) || nset.has(normAlias(match.awayTeam.name));
}
__name(hasSelectedTeam, "hasSelectedTeam");
__name2(hasSelectedTeam, "hasSelectedTeam");
function isMasterClash(match) {
  return isDomesticLeagueCode(match.competition.code) && isMasterPair(match);
}
__name(isMasterClash, "isMasterClash");
__name2(isMasterClash, "isMasterClash");
var DERBY_PAIRS = [
  // El Clásico
  ["Real Madrid CF", "FC Barcelona"],
  // Manchester derby
  ["Manchester City FC", "Manchester United FC"],
  // North London derby
  ["Arsenal FC", "Tottenham Hotspur FC"],
  // Merseyside derby
  ["Liverpool FC", "Everton FC"],
  // Derby della Madonnina
  ["AC Milan", "Inter Milan"],
  // Der Klassiker
  ["FC Bayern M\xFCnchen", "Borussia Dortmund"],
  // Madrid derby
  ["Atl\xE9tico Madrid", "Real Madrid CF"],
  // Le Classique
  ["Paris Saint-Germain", "Olympique de Marseille"]
];
var DERBY_NORM = DERBY_PAIRS.map(function(p) {
  return [(0, import_teams.normalizeTeamName)(p[0]), (0, import_teams.normalizeTeamName)(p[1])];
});
function isDerby(match) {
  const h = normAlias(match.homeTeam.name);
  const a = normAlias(match.awayTeam.name);
  return DERBY_NORM.some((p) => h === p[0] && a === p[1] || h === p[1] && a === p[0]);
}
__name(isDerby, "isDerby");
function mapStageName(stage) {
  const s = String(stage || "").toLowerCase();
  if (s.includes("quarter")) return "QUARTER_FINALS";
  if (s.includes("semi")) return "SEMI_FINALS";
  if (s.includes("final")) return "FINAL";
  if (s.includes("third") || s.includes("3rd")) return "THIRD_PLACE";
  return "REGULAR_SEASON";
}
__name(mapStageName, "mapStageName");
__name2(mapStageName, "mapStageName");
var PROVIDER_LEAGUE_MAP = {
  "Premier League": "PL",
  "English Premier League": "PL",
  "La Liga": "PD",
  "Spanish La Liga": "PD",
  "Serie A": "SA",
  "Italian Serie A": "SA",
  "Ligue 1": "FL1",
  "French Ligue 1": "FL1",
  "Bundesliga": "BL1",
  "German Bundesliga": "BL1",
  "Champions League": "CL",
  "UEFA Champions League": "CL",
  "Europa League": "EL",
  "UEFA Europa League": "EL",
  "Conference League": "ECL",
  "UEFA Conference League": "ECL",
  "FA Cup": "FA_CUP",
  "English FA Cup": "FA_CUP",
  "EFL Cup": "EFL_CUP",
  "Carabao Cup": "EFL_CUP",
  "English League Cup": "EFL_CUP",
  "Copa del Rey": "CDR",
  "Spanish Copa del Rey": "CDR",
  "Coppa Italia": "COPPA_ITALIA",
  "Italian Coppa Italia": "COPPA_ITALIA",
  "World Cup": "WC",
  "UEFA Euro": "EC",
  "European Championship": "EC",
  "Copa America": "COPA",
  "Copa Am\xE9rica": "COPA",
  "Africa Cup of Nations": "AFCON",
  "Asian Cup": "AFC",
  "AFC Asian Cup": "AFC",
  "Persian Gulf Pro League": "PGL",
  "Iranian Persian Gulf Pro League": "PGL",
  "Iran Pro League": "PGL",
  "Iranian Persian Gulf Cup": "PGL",
  "Hazfi Cup": "HAZFI_CUP"
};
function parseTSPDate(dateStr, timeStr, tsStr) {
  if (tsStr) {
    const d2 = new Date(tsStr);
    if (!isNaN(d2.getTime())) return d2.toISOString();
  }
  if (!dateStr) return null;
  const d = /* @__PURE__ */ new Date(dateStr + "T" + (timeStr || "12:00:00") + "Z");
  return isNaN(d.getTime()) ? null : d.toISOString();
}
__name(parseTSPDate, "parseTSPDate");
__name2(parseTSPDate, "parseTSPDate");
var SUBREQUEST_COUNT = 0;
var SUBREQUEST_CAP = 48;
function resetSubrequestBudget() {
  SUBREQUEST_COUNT = 0;
}
__name(resetSubrequestBudget, "resetSubrequestBudget");
__name2(resetSubrequestBudget, "resetSubrequestBudget");
async function fetchJSON(url, attempts, headers) {
  attempts = attempts || 2;
  if (++SUBREQUEST_COUNT > SUBREQUEST_CAP) throw new Error("Subrequest budget exhausted");
  const canCache = !headers && typeof caches !== "undefined" && caches.default;
  const cacheKey = canCache ? new Request(url, { method: "GET" }) : null;
  if (cacheKey) {
    try {
      const hit = await caches.default.match(cacheKey);
      if (hit) return await hit.json();
    } catch (e) {
    }
  }
  for (let i = 1; i <= attempts; i++) {
    try {
      const res = await fetch(url, { headers: headers || {} });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      if (cacheKey) {
        try {
          await caches.default.put(cacheKey, new Response(JSON.stringify(data), { headers: { "content-type": "application/json", "cache-control": "max-age=300" } }));
        } catch (e) {
        }
      }
      return data;
    } catch (e) {
      if (i < attempts) await new Promise((r) => setTimeout(r, 800 * i));
      else throw e;
    }
  }
  return null;
}
__name(fetchJSON, "fetchJSON");
__name2(fetchJSON, "fetchJSON");
async function providerSuspended(env, key) {
  const until = parseInt(await env.STATE.get("prov_down_" + key).catch(() => null)) || 0;
  return Date.now() < until;
}
__name(providerSuspended, "providerSuspended");
__name2(providerSuspended, "providerSuspended");
async function suspendProvider(env, key, ms) {
  const ttl = Math.ceil((ms || CONFIG.PROVIDER_SUSPEND_MS) / 1e3) + 60;
  await env.STATE.put("prov_down_" + key, String(Date.now() + (ms || CONFIG.PROVIDER_SUSPEND_MS)), { expirationTtl: ttl }).catch(() => {
  });
}
__name(suspendProvider, "suspendProvider");
__name2(suspendProvider, "suspendProvider");
async function clearProviderSuspension(env, key) {
  await env.STATE.delete("prov_down_" + key).catch(() => {
  });
}
__name(clearProviderSuspension, "clearProviderSuspension");
__name2(clearProviderSuspension, "clearProviderSuspension");
async function fetchPglTableFromWikipedia(env) {
  try {
    const y = (/* @__PURE__ */ new Date()).getUTCFullYear();
    const m = (/* @__PURE__ */ new Date()).getUTCMonth() + 1;
    const startYear = m >= 7 ? y : y - 1;
    const nextYY = String((startYear + 1) % 100).padStart(2, "0");
    const season = startYear + "\u2013" + nextYY;
    const page = "Template:" + season + " Persian Gulf Pro League table";
    const u = "https://en.wikipedia.org/w/api.php?action=parse&prop=wikitext&format=json&formatversion=2&page=" + encodeURIComponent(page);
    const data = await fetchJSON(u, 1, { "User-Agent": "SportSignalBot/1.0 (football.sportsignal.ir)" });
    const wt = data && data.parse && data.parse.wikitext ? String(data.parse.wikitext) : "";
    if (!wt) return null;
    const orderMatch = wt.match(/team_order\s*=\s*([A-Z]{2,4}(?:\s*,\s*[A-Z]{2,4})*)/);
    if (!orderMatch) return null;
    const codes = orderMatch[1].split(",").map((s) => s.trim()).filter(Boolean);
    const teams = [];
    const stat = /* @__PURE__ */ __name((code, key) => {
      const m2 = wt.match(new RegExp("\\|" + key + "_" + code + "\\s*=\\s*(-?\\d+)"));
      return m2 ? parseInt(m2[1]) : null;
    }, "stat");
    const nameOf = /* @__PURE__ */ __name((code) => {
      const m2 = wt.match(new RegExp("\\|name_" + code + "\\s*=\\s*\\[\\[[^\\]|]*\\|([^\\]]+)\\]\\]"));
      if (m2) return m2[1];
      const m3 = wt.match(new RegExp("\\|name_" + code + "\\s*=\\s*\\[\\[([^\\]|]+)\\]\\]"));
      return m3 ? m3[1] : code;
    }, "nameOf");
    for (let i = 0; i < codes.length; i++) {
      const c = codes[i];
      const w = stat(c, "win"), d = stat(c, "draw"), l = stat(c, "loss"), gf = stat(c, "gf"), ga = stat(c, "ga");
      if (w == null || d == null || l == null) continue;
      teams.push({
        name: nameOf(c),
        pos: i + 1,
        points: w * 3 + d,
        played: w + d + l,
        won: w,
        draw: d,
        lost: l,
        gf: gf == null ? null : gf,
        ga: ga == null ? null : ga,
        gd: gf != null && ga != null ? gf - ga : null
      });
    }
    if (teams.length < 8) return null;
    return { matchday: null, started: true, source: "wikipedia", teams };
  } catch (e) {
    console.error("PGL wikipedia table failed: " + e.message);
    return null;
  }
}
__name(fetchPglTableFromWikipedia, "fetchPglTableFromWikipedia");
__name2(fetchPglTableFromWikipedia, "fetchPglTableFromWikipedia");
var SPORTSCORE_SLUGS = {
  "CL": "uefa-champions-league",
  "EL": "uefa-europa-league",
  "ECL": "uefa-europa-conference-league",
  "PL": "english-premier-league",
  "PD": "spanish-la-liga",
  "SA": "italian-serie-a",
  "FL1": "french-ligue-1",
  "BL1": "bundesliga",
  "PGL": "iran-pro-league",
  "AL": "australia-a-league",
  "FA_CUP": "fa-cup",
  "EFL_CUP": "efl-cup",
  "CDR": "copa-del-rey",
  "COPPA_ITALIA": "coppa-italia",
  // v12.6: the Iranian Hazfi Cup (جام حذفی ایران) — slug verified live against
  // the fixtures API (2026-01-13: Foolad Hormozgan 0-2 Esteghlal Tehran, Shams
  // Azar Qazvin 3-0 Tractor S.C.). Display-only: never added to the near-scan
  // slug filter, so the cron/bot budget and notification semantics are flat.
  "HAZFI_CUP": "iran-cup"
};
async function sportScoreDay(code, slug, dateStr, acc) {
  const data = await fetchJSON("https://sportscore.com/api/v1/fixtures/?sport=football&date=" + dateStr + "&competition=" + slug + "&limit=200");
  let added = 0;
  for (const e of data && data.matches || []) {
    const utcDate = e.time ? new Date(e.time).toISOString() : null;
    if (!utcDate) continue;
    const dedupeKey = code + "|" + e.home + "|" + e.away + "|" + utcDate.slice(0, 16);
    if (acc.seen.has(dedupeKey)) continue;
    acc.seen.add(dedupeKey);
    added++;
    const status = e.status === "finished" ? "FINISHED" : e.status === "live" ? "LIVE" : "SCHEDULED";
    const inPlay = status !== "SCHEDULED";
    acc.list.push({
      id: "spsc-" + dateStr + "-" + code + "-" + acc.list.length,
      utcDate,
      status,
      stage: mapStageName(""),
      roundRaw: e.round_name || e.round || e.stage || "",
      competition: { code },
      homeTeam: { name: e.home, crest: e.home_logo || null },
      awayTeam: { name: e.away, crest: e.away_logo || null },
      // sportscore supplies a 0-0 default score for scheduled matches — never
      // store a pre-kickoff score in the shared pool (it would leak into UI/bot).
      score: inPlay ? { fullTime: { home: parseInt(e.home_score) || 0, away: parseInt(e.away_score) || 0 } } : null
    });
  }
  return added;
}
__name(sportScoreDay, "sportScoreDay");
__name2(sportScoreDay, "sportScoreDay");
async function fetchSportScore(env) {
  const matches = [];
  const seen = /* @__PURE__ */ new Set();
  if (await providerSuspended(env, "sportscore")) {
    console.log("\u23ED\uFE0F sportscore suspended (recent sweep failed) \u2014 skipping day sweep");
    return matches;
  }
  const inSeason = /* @__PURE__ */ __name((code) => {
    const s = CONFIG.SEASON_STARTS && CONFIG.SEASON_STARTS[code];
    return !s || /* @__PURE__ */ new Date() >= new Date(s);
  }, "inSeason");
  const slugs = Object.fromEntries(
    Object.entries(SPORTSCORE_SLUGS).filter(
      ([code]) => code === "EL" || code === "ECL" || code === "BL1" || code === "FA_CUP" || code === "EFL_CUP" || code === "CDR" || code === "COPPA_ITALIA" || code === "PGL" || code === "AL" && inSeason(code)
    )
  );
  if (!Object.keys(slugs).length) return matches;
  const from = new Date(Date.now() - 864e5);
  const to = new Date(Date.now() + 1 * 864e5);
  const acc = { list: matches, seen };
  let calls = 0, failures = 0;
  for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split("T")[0];
    for (const [code, slug] of Object.entries(slugs)) {
      calls++;
      try {
        await sportScoreDay(code, slug, dateStr, acc);
      } catch (e) {
        failures++;
        console.error(`\u274C sportscore day ${code} ${dateStr} failed: ${e.message}`);
      }
    }
  }
  if (calls > 0 && failures === calls) {
    console.error("\u26A0\uFE0F sportscore: all " + calls + " day-calls failed \u2014 suspending provider");
    await suspendProvider(env, "sportscore");
  }
  return matches;
}
__name(fetchSportScore, "fetchSportScore");
__name2(fetchSportScore, "fetchSportScore");
__name2(fetchJSON, "fetchJSON");
async function cacheMatches(env, matches, source) {
  if (!matches || !matches.length) return;
  try {
    const existing = await env.STATE.get(CONFIG.KV_MATCHES_KEY, "json").catch(() => null);
    const cutoff = Date.now() - 2 * 864e5;
    const head = (existing && Array.isArray(existing.matches) ? existing.matches : []).filter((m) => new Date(m.utcDate || 0).getTime() > cutoff);
    const merged = (0, import_dedupe.canonDedupe)([...head, ...matches]);
    if (existing && Array.isArray(existing.matches) && JSON.stringify(merged) === JSON.stringify(existing.matches)) {
      return;
    }
    await env.STATE.put(
      CONFIG.KV_MATCHES_KEY,
      JSON.stringify({ fetchedAt: (/* @__PURE__ */ new Date()).toISOString(), source, matches: merged }),
      { expirationTtl: CONFIG.CACHE_STALE_TTL }
    );
  } catch (e) {
    console.error("Match cache write failed: " + e.message);
  }
}
__name(cacheMatches, "cacheMatches");
__name2(cacheMatches, "cacheMatches");
async function getCachedMatches(env) {
  try {
    const data = await env.STATE.get(CONFIG.KV_MATCHES_KEY, "json");
    if (data && Array.isArray(data.matches) && data.matches.length) {
      console.log("Using cached matches from " + data.source + " (" + data.fetchedAt + ")");
      return data.matches;
    }
  } catch (e) {
    console.error("Match cache read failed: " + e.message);
  }
  return [];
}
__name(getCachedMatches, "getCachedMatches");
__name2(getCachedMatches, "getCachedMatches");
async function fetchFootballData(env) {
  const dateFrom = new Date(Date.now() - CONFIG.DAYS_IN_PAST * 864e5).toISOString().split("T")[0];
  const dateTo = new Date(Date.now() + CONFIG.DAYS_IN_FUTURE * 864e5).toISOString().split("T")[0];
  const fdLeagues = CONFIG.LEAGUES.filter((c) => !["EL", "ECL"].includes(c));
  console.log(`\u{1F4C5} Date range: ${dateFrom} to ${dateTo} (${CONFIG.DATE_RANGE_DAYS} days total)`);
  const allMatches = [];
  const seen = /* @__PURE__ */ new Set();
  const pushUnique = /* @__PURE__ */ __name((list) => {
    for (const m of list) {
      if (!seen.has(m.id)) {
        seen.add(m.id);
        allMatches.push(m);
      }
    }
  }, "pushUnique");
  try {
    const u = `${CONFIG.API_URL}?competitions=${fdLeagues.join(",")}&dateFrom=${dateFrom}&dateTo=${dateTo}`;
    const m = await fetchWithRetry(u, env.API_TOKEN, "Leagues+CL");
    console.log(`\u2705 Leagues+CL: ${m.length} matches`);
    pushUnique(m);
  } catch (error) {
    console.error(`\u274C Failed to fetch league matches:`, error.message);
  }
  for (const [code, id] of Object.entries(CONFIG.INTL_COMPETITIONS)) {
    try {
      const u = `${CONFIG.API_URL}?competitions=${id}&dateFrom=${dateFrom}&dateTo=${dateTo}`;
      const m = await fetchWithRetry(u, env.API_TOKEN, "Intl " + code);
      pushUnique(m.map((match) => match.competition ? { ...match, competition: { ...match.competition, code } } : match));
      console.log(`\u2705 Intl ${code}: ${m.length} matches`);
    } catch (e) {
      console.error(`\u274C Intl ${code} fetch failed: ${e.message}`);
    }
  }
  console.log(`\u2705 Found ${allMatches.length} matches total`);
  return allMatches;
}
__name(fetchFootballData, "fetchFootballData");
__name2(fetchFootballData, "fetchFootballData");
async function fetchLongView(env) {
  const cached = await env.STATE.get(CONFIG.KV_MATCHES_KEY, "json").catch(() => null);
  const fresh = cached && cached.fetchedAt && Date.now() - new Date(cached.fetchedAt).getTime() < 6 * 36e5;
  const horizon = cached && Array.isArray(cached.matches) && cached.matches.length ? Math.max(0, ...cached.matches.map((m) => new Date(m.utcDate || 0).getTime())) : 0;
  if (fresh && horizon > Date.now() + 60 * 864e5) return cached.matches;
  const fdLeagues = CONFIG.LEAGUES.filter((c) => !["EL", "ECL"].includes(c));
  const allMatches = [];
  const seen = /* @__PURE__ */ new Set();
  const pushUnique = /* @__PURE__ */ __name((list) => {
    for (const m of list) {
      if (!seen.has(m.id)) {
        seen.add(m.id);
        allMatches.push(m);
      }
    }
  }, "pushUnique");
  const pastDays = Math.max(CONFIG.DAYS_IN_PAST, 7);
  const start = Date.now() - pastDays * 864e5;
  for (let i = 0; i < Math.ceil((CONFIG.LONG_VIEW_DAYS + pastDays) / 10); i++) {
    const f = new Date(start + i * 10 * 864e5).toISOString().split("T")[0];
    const t = new Date(start + (i + 1) * 10 * 864e5).toISOString().split("T")[0];
    const u = `${CONFIG.API_URL}?competitions=${fdLeagues.join(",")}&dateFrom=${f}&dateTo=${t}`;
    try {
      const m = await fetchWithRetry(u, env.API_TOKEN, `Long chunk ${i + 1}`);
      console.log(`\u{1F50D} Long view chunk ${i + 1} (${f}..${t}): ${m.length} matches`);
      pushUnique(m);
    } catch (e) {
      console.error(`\u274C Long view chunk ${i + 1} failed: ${e.message}`);
    }
    await new Promise((r) => setTimeout(r, 2e3));
  }
  const uefaAcc = { list: allMatches, seen };
  if (await providerSuspended(env, "sportscore")) {
    console.log("\u23ED\uFE0F sportscore suspended \u2014 skipping long-view cup/EL/ECL/BL1 sweeps");
  } else {
    const cupSlugs = [["FA_CUP", SPORTSCORE_SLUGS.FA_CUP], ["EFL_CUP", SPORTSCORE_SLUGS.EFL_CUP], ["CDR", SPORTSCORE_SLUGS.CDR], ["COPPA_ITALIA", SPORTSCORE_SLUGS.COPPA_ITALIA], ["HAZFI_CUP", SPORTSCORE_SLUGS.HAZFI_CUP]];
    const cupDone = {};
    let ssCalls = 0, ssFails = 0;
    for (let i = 0; i < 10; i++) {
      const dateStr = new Date(Date.now() + i * 864e5).toISOString().split("T")[0];
      for (const [cc, slug] of cupSlugs) {
        if (cupDone[cc]) continue;
        ssCalls++;
        try {
          const n = await sportScoreDay(cc, slug, dateStr, uefaAcc);
          if (n > 0) cupDone[cc] = true;
        } catch (e) {
          ssFails++;
          console.error(`\u274C Long view cup ${cc} failed: ${e.message}`);
        }
      }
    }
    for (let i = 0; i < 7; i++) {
      const dateStr = new Date(Date.now() + i * 864e5).toISOString().split("T")[0];
      ssCalls++;
      try {
        await sportScoreDay("EL", SPORTSCORE_SLUGS.EL, dateStr, uefaAcc);
      } catch (e) {
        ssFails++;
        console.error(`\u274C Long view EL failed: ${e.message}`);
      }
      ssCalls++;
      try {
        await sportScoreDay("ECL", SPORTSCORE_SLUGS.ECL, dateStr, uefaAcc);
      } catch (e) {
        ssFails++;
        console.error(`\u274C Long view ECL failed: ${e.message}`);
      }
      ssCalls++;
      try {
        await sportScoreDay("BL1", SPORTSCORE_SLUGS.BL1, dateStr, uefaAcc);
      } catch (e) {
        ssFails++;
        console.error(`\u274C Long view BL1 failed: ${e.message}`);
      }
    }
    if (ssCalls > 0 && ssFails === ssCalls) {
      console.error("\u26A0\uFE0F sportscore long-view: all " + ssCalls + " calls failed \u2014 suspending provider");
      await suspendProvider(env, "sportscore");
    }
  }
  if (uefaAcc.list.length !== 0) {
    const uefaCount = uefaAcc.list.filter((m) => m.competition.code === "EL" || m.competition.code === "ECL").length;
    console.log(`\u{1F50D} Long view EL/ECL (sportscore): ${uefaCount} matches`);
  }
  let tsdbCalls = 0;
  const paceT = /* @__PURE__ */ __name(() => tsdbCalls++ > 0 ? new Promise((r) => setTimeout(r, 1200)) : Promise.resolve(), "paceT");
  for (const [code, leagueId] of Object.entries(Object.assign({}, TSP_LEAGUE_IDS, CUP_TSP_IDS))) {
    await paceT();
    try {
      const data = await fetchJSON("https://www.thesportsdb.com/api/v1/json/3/eventsnextleague.php?id=" + leagueId);
      for (const e of data && data.events || []) {
        if ((e.strSport || "").toLowerCase() !== "soccer") continue;
        const utcDate = parseTSPDate(e.dateEvent, e.strTime, e.strTimestamp);
        if (!utcDate) continue;
        pushUnique({
          id: "tsd-" + e.idEvent,
          utcDate,
          status: /finished|completed/i.test(e.strStatus || "") ? "FINISHED" : "SCHEDULED",
          stage: mapStageName(e.strRound || e.intRound),
          competition: { code },
          venue: e.strVenue || null,
          homeTeam: { name: e.strHomeTeam, crest: e.strHomeTeamBadge || null },
          awayTeam: { name: e.strAwayTeam, crest: e.strAwayTeamBadge || null },
          score: { fullTime: { home: parseInt(e.intHomeScore) || 0, away: parseInt(e.intAwayScore) || 0 } }
        });
      }
    } catch (e) {
      console.error(`\u274C Long view TSP ${code} failed: ${e.message}`);
    }
  }
  const intlFrom = new Date(Date.now() - CONFIG.DAYS_IN_PAST * 864e5).toISOString().split("T")[0];
  const intlTo = new Date(Date.now() + Math.max(3, 10 - CONFIG.DAYS_IN_PAST) * 864e5).toISOString().split("T")[0];
  for (const [code, id] of Object.entries(CONFIG.INTL_COMPETITIONS)) {
    try {
      const u = `${CONFIG.API_URL}?competitions=${id}&dateFrom=${intlFrom}&dateTo=${intlTo}`;
      const m = await fetchWithRetry(u, env.API_TOKEN, "Intl " + code);
      pushUnique(m.map((match) => match.competition ? { ...match, competition: { ...match.competition, code } } : match));
      console.log(`\u{1F50D} Long view intl ${code}: ${m.length} matches`);
    } catch (e) {
      console.error(`\u274C Long view intl ${code} failed: ${e.message}`);
    }
  }
  if (allMatches.length) {
    const deduped = (0, import_dedupe.canonDedupe)(allMatches);
    allMatches.length = 0;
    allMatches.push(...deduped);
  }
  if (allMatches.length && !allMatches.some(shouldNotify)) {
    const pool = await getCachedMatches(env);
    if (pool.some(shouldNotify)) {
      console.log("\u26A0\uFE0F Live long pool has 0 followed-team matches \u2014 reusing cached pool");
      return pool;
    }
  }
  if (allMatches.length) {
    await cacheMatches(env, allMatches, "football-data+longview");
  }
  return allMatches;
}
__name(fetchLongView, "fetchLongView");
__name2(fetchLongView, "fetchLongView");
var TSP_LEAGUE_IDS = {
  "PL": 4328,
  "BL1": 4331,
  "SA": 4332,
  "EL": 4481,
  // verified via thesportsdb lookupleague
  "PGL": 4742
  // Iran Persian Gulf Pro League (display-only, never in fd leagues URL)
};
var CUP_TSP_IDS = {
  "EFL_CUP": 4570,
  // English League Cup (Plymouth/Exeter etc.)
  "CDR": 4483,
  // Copa del Rey (R1 not published before ~Nov → honest empty until then)
  "COPPA_ITALIA": 4506
  // Coppa Italia (Parma/Catania R64 ...)
};
async function fetchTheSportsDB(env) {
  const matches = [];
  const monitored = /* @__PURE__ */ new Set([...CONFIG.LEAGUES, "EL", "ECL", ...Object.keys(CONFIG.DOMESTIC_CUP_IDS), ...Object.keys(CONFIG.INTL_COMPETITIONS)]);
  let tsdbCalls = 0;
  const pace = /* @__PURE__ */ __name(() => tsdbCalls++ > 0 ? new Promise((r) => setTimeout(r, 1200)) : Promise.resolve(), "pace");
  for (const [code, leagueId] of Object.entries(Object.assign({}, TSP_LEAGUE_IDS, CUP_TSP_IDS))) {
    if (!monitored.has(code)) continue;
    await pace();
    const data = await fetchJSON("https://www.thesportsdb.com/api/v1/json/3/eventsnextleague.php?id=" + leagueId);
    for (const e of data && data.events || []) {
      if ((e.strSport || "").toLowerCase() !== "soccer") continue;
      const utcDate = parseTSPDate(e.dateEvent, e.strTime, e.strTimestamp);
      if (!utcDate) continue;
      matches.push({
        id: "tsd-" + e.idEvent,
        utcDate,
        status: /finished|completed/i.test(e.strStatus || "") ? "FINISHED" : "SCHEDULED",
        stage: mapStageName(e.strRound || e.intRound),
        competition: { code },
        venue: e.strVenue || null,
        homeTeam: { name: e.strHomeTeam, crest: e.strHomeTeamBadge || null },
        awayTeam: { name: e.strAwayTeam, crest: e.strAwayTeamBadge || null },
        score: { fullTime: { home: parseInt(e.intHomeScore) || 0, away: parseInt(e.intAwayScore) || 0 } }
      });
    }
  }
  if (!matches.length) {
    const from = new Date(Date.now() - CONFIG.FALLBACK_DAYS_PAST * 864e5);
    const to = new Date(Date.now() + CONFIG.FALLBACK_DAYS_FUTURE * 864e5);
    for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split("T")[0];
      await pace();
      try {
        const data = await fetchJSON("https://www.thesportsdb.com/api/v1/json/3/eventsday.php?d=" + dateStr);
        for (const e of data && data.events || []) {
          const code = PROVIDER_LEAGUE_MAP[e.strLeague];
          if (!code || !monitored.has(code)) continue;
          if ((e.strSport || "").toLowerCase() !== "soccer") continue;
          const utcDate = parseTSPDate(e.dateEvent, e.strTime, e.strTimestamp);
          if (!utcDate) continue;
          matches.push({
            id: "tsd-" + e.idEvent,
            utcDate,
            status: /finished|completed/i.test(e.strStatus || "") ? "FINISHED" : "SCHEDULED",
            stage: mapStageName(e.strRound || e.intRound),
            competition: { code },
            venue: e.strVenue || null,
            homeTeam: { name: e.strHomeTeam, crest: e.strHomeTeamBadge || null },
            awayTeam: { name: e.strAwayTeam, crest: e.strAwayTeamBadge || null },
            score: { fullTime: { home: parseInt(e.intHomeScore) || 0, away: parseInt(e.intAwayScore) || 0 } }
          });
        }
      } catch (e) {
        console.error(`\u274C TSP day sweep ${dateStr} failed: ${e.message}`);
      }
    }
  }
  return matches;
}
__name(fetchTheSportsDB, "fetchTheSportsDB");
__name2(fetchTheSportsDB, "fetchTheSportsDB");
async function fetchMatchesFromAPI(env) {
  const sources = [
    { name: "football-data", fn: fetchFootballData },
    { name: "sportscore", fn: fetchSportScore },
    { name: "thesportsdb", fn: fetchTheSportsDB }
  ];
  const merged = /* @__PURE__ */ new Map();
  const used = [];
  await Promise.all(sources.map((s) => (async () => {
    try {
      console.log("Trying API source: " + s.name);
      const m = await s.fn(env);
      if (m && m.length) {
        used.push(s.name);
        for (const x of m) {
          const k = `${x.competition.code}|${(0, import_teams.normalizeTeamName)(x.homeTeam.name)}|${(0, import_teams.normalizeTeamName)(x.awayTeam.name)}|${(x.utcDate || "").slice(0, 10)}`;
          const cur = merged.get(k);
          if (!cur) {
            merged.set(k, x);
          } else {
            if (!cur.homeTeam.crest && x.homeTeam.crest) cur.homeTeam.crest = x.homeTeam.crest;
            if (!cur.awayTeam.crest && x.awayTeam.crest) cur.awayTeam.crest = x.awayTeam.crest;
            if (!cur.venue && x.venue) cur.venue = x.venue;
          }
        }
        console.log(`\u2705 Source ${s.name} contributed ${m.length} matches (pool ${merged.size})`);
      }
    } catch (e) {
      console.error(`\u274C Source ${s.name} failed: ` + e.message);
    }
  })()));
  let matches = (0, import_dedupe.canonDedupe)([...merged.values()]);
  let usedSource = used.join("+");
  if (matches.length && !matches.some(shouldNotify)) {
    const pool = await getCachedMatches(env);
    if (pool.some(shouldNotify)) {
      console.log("\u26A0\uFE0F Live pool has 0 followed-team matches \u2014 reusing cached pool");
      matches = pool;
      usedSource += "+cache";
    }
  }
  if (!matches.length) {
    console.error("\u274C All API sources empty, falling back to cache");
    matches = await getCachedMatches(env);
    if (matches.length) usedSource = "cache";
    try {
      const lastAlert = parseInt(await env.STATE.get("degradation_alert_at").catch(() => null)) || 0;
      if (Date.now() - lastAlert > CONFIG.NOTIFICATION_COOLDOWN_HOURS * CONFIG.ONE_HOUR_MS) {
        const chats = await getRegisteredChats(env);
        const msg = "\u26A0\uFE0F *\u0647\u0634\u062F\u0627\u0631:* \u0647\u0645\u0647 \u0645\u0646\u0627\u0628\u0639 \u0646\u0627\u0645\u062A\u0648\u0627\u0646\u0633\u062A\u0646\u062F \u062F\u0627\u062F\u0647 \u0647\u0627 \u0631\u0627 \u0628\u06AF\u06CC\u0631\u0646\u062F\u060C \u0627\u0632 \u06A9\u0627\u0634 (\u06F2\u06F4 \u0633\u0627\u0639\u062A) \u0627\u0633\u062A\u0641\u0627\u062F\u0647 \u0645\u06CC\u200C\u0634\u0648\u062F. \u0627\u06AF\u0631 \u0645\u0634\u06A9\u0644 \u0627\u062F\u0627\u0645\u0647 \u062F\u0627\u0634\u062A\u060C \u0633\u0627\u06CC\u0631 \u0645\u0646\u0627\u0628\u0639 \u0631\u0627 \u0628\u0631\u0631\u0633\u06CC \u06A9\u0646\u06CC\u062F.";
        await Promise.allSettled(chats.map((c) => sendTelegram(env, msg, c)));
        await env.STATE.put("degradation_alert_at", String(Date.now())).catch(() => {
        });
      }
    } catch (alertErr) {
      console.error("Degradation alert failed: " + alertErr.message);
    }
  } else {
    await cacheMatches(env, matches, usedSource);
  }
  if (usedSource) {
    const prevSource = await env.STATE.get(CONFIG.KV_LAST_SOURCE).catch(() => null);
    if (prevSource !== usedSource) {
      await env.STATE.put(CONFIG.KV_LAST_SOURCE, usedSource).catch(() => {
      });
    }
  }
  console.log(`\u{1F4CA} Total matches found: ${matches.length} (source: ${usedSource})`);
  return matches;
}
__name(fetchMatchesFromAPI, "fetchMatchesFromAPI");
__name2(fetchMatchesFromAPI, "fetchMatchesFromAPI");
async function fetchWithRetry(url, apiToken, label) {
  for (let attempt = 1; attempt <= CONFIG.API_RETRY_ATTEMPTS; attempt++) {
    if (++SUBREQUEST_COUNT > SUBREQUEST_CAP) throw new Error("Subrequest budget exhausted");
    try {
      vlog(`${label} - Attempt ${attempt}/${CONFIG.API_RETRY_ATTEMPTS}`);
      const res = await fetch(url, {
        headers: { "X-Auth-Token": apiToken }
      });
      vlog(`${label} Status: ${res.status} ${res.statusText}`);
      if (!res.ok) {
        const errorText = await res.text();
        if (res.status === 429) {
          const waitTime = CONFIG.API_RETRY_DELAY * attempt;
          console.log(`Rate limited, waiting ${waitTime}ms...`);
          await new Promise((resolve) => setTimeout(resolve, waitTime));
          continue;
        }
        if (res.status === 400) {
          console.log(`\u274C Bad request for ${label}: ${errorText.substring(0, 200)}`);
          return [];
        }
        throw new Error(`HTTP ${res.status}: ${errorText.substring(0, 100)}`);
      }
      const data = await res.json();
      return data.matches || [];
    } catch (error) {
      console.error(`${label} Attempt ${attempt} failed:`, error.message);
      if (attempt < CONFIG.API_RETRY_ATTEMPTS) {
        await new Promise((resolve) => setTimeout(resolve, CONFIG.API_RETRY_DELAY * Math.pow(2, attempt)));
      } else {
        throw error;
      }
    }
  }
  return [];
}
__name(fetchWithRetry, "fetchWithRetry");
__name2(fetchWithRetry, "fetchWithRetry");
var TELEGRAM_PAUSE_UNTIL = 0;
async function sendTelegram(env, text, chatId) {
  for (let attempt = 1; attempt <= CONFIG.TELEGRAM_RETRY_ATTEMPTS; attempt++) {
    if (Date.now() < TELEGRAM_PAUSE_UNTIL) return false;
    if (++SUBREQUEST_COUNT > SUBREQUEST_CAP) return false;
    try {
      const res = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: "MarkdownV2"
        })
      });
      if (res.ok) {
        vlog(`\u2705 Telegram sent to ${chatId}`);
        return true;
      }
      const error = await res.text();
      console.error(`Telegram error (attempt ${attempt}/${CONFIG.TELEGRAM_RETRY_ATTEMPTS}):`, error);
      if (res.status === 429) {
        const retryAfter = parseInt(res.headers.get("retry-after") || "2");
        TELEGRAM_PAUSE_UNTIL = Math.max(TELEGRAM_PAUSE_UNTIL, Date.now() + Math.min(Math.max(retryAfter, 1), 10) * 1e3);
        if (attempt < CONFIG.TELEGRAM_RETRY_ATTEMPTS) {
          await new Promise((r) => setTimeout(r, 1500));
        }
        continue;
      }
      if (res.status >= 400 && res.status < 500) {
        return /chat not found|blocked by the user|bot was kicked|deactivated/i.test(error) ? "dead" : false;
      }
    } catch (error) {
      console.error(`Telegram network error (attempt ${attempt}/${CONFIG.TELEGRAM_RETRY_ATTEMPTS}):`, error.message);
    }
    if (attempt < CONFIG.TELEGRAM_RETRY_ATTEMPTS) {
      await new Promise((r) => setTimeout(r, 1e3 * attempt));
    }
  }
  return false;
}
__name(sendTelegram, "sendTelegram");
__name2(sendTelegram, "sendTelegram");
// v12.x-bilingual-bot: send a MarkdownV2 message WITH an inline keyboard
// (used by /start and /lang to show the language picker). Same retry/pause
// logic as sendTelegram. The keyboard arg is a Telegram
// InlineKeyboardMarkup object: {inline_keyboard: [[{text, callback_data}]]}.
async function sendTelegramWithKeyboard(env, text, chatId, keyboard) {
  for (let attempt = 1; attempt <= CONFIG.TELEGRAM_RETRY_ATTEMPTS; attempt++) {
    if (Date.now() < TELEGRAM_PAUSE_UNTIL) return false;
    if (++SUBREQUEST_COUNT > SUBREQUEST_CAP) return false;
    try {
      const res = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: "MarkdownV2",
          reply_markup: keyboard
        })
      });
      if (res.ok) {
        vlog(`\u2705 Telegram (keyboard) sent to ${chatId}`);
        return true;
      }
      const error = await res.text();
      console.error(`Telegram keyboard error (attempt ${attempt}/${CONFIG.TELEGRAM_RETRY_ATTEMPTS}):`, error);
      if (res.status === 429) {
        const retryAfter = parseInt(res.headers.get("retry-after") || "2");
        TELEGRAM_PAUSE_UNTIL = Math.max(TELEGRAM_PAUSE_UNTIL, Date.now() + Math.min(Math.max(retryAfter, 1), 10) * 1e3);
        if (attempt < CONFIG.TELEGRAM_RETRY_ATTEMPTS) {
          await new Promise((r) => setTimeout(r, 1500));
        }
        continue;
      }
      if (res.status >= 400 && res.status < 500) {
        return /chat not found|blocked by the user|bot was kicked|deactivated/i.test(error) ? "dead" : false;
      }
    } catch (error) {
      console.error(`Telegram network error (keyboard attempt ${attempt}/${CONFIG.TELEGRAM_RETRY_ATTEMPTS}):`, error.message);
    }
    if (attempt < CONFIG.TELEGRAM_RETRY_ATTEMPTS) {
      await new Promise((r) => setTimeout(r, 1e3 * attempt));
    }
  }
  return false;
}
__name(sendTelegramWithKeyboard, "sendTelegramWithKeyboard");
__name2(sendTelegramWithKeyboard, "sendTelegramWithKeyboard");
// v12.x-bilingual-bot: answer a callback_query (dismisses the loading
// spinner on the inline button the user just tapped). Optional text shows
// a small toast to the user.
async function answerCallbackQuery(env, callbackQueryId, text) {
  try {
    if (++SUBREQUEST_COUNT > SUBREQUEST_CAP) return false;
    const res = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/answerCallbackQuery`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ callback_query_id: callbackQueryId, text: text || "", show_alert: false })
    });
    if (!res.ok) console.error("answerCallbackQuery failed:", await res.text());
    return res.ok;
  } catch (e) {
    console.error("answerCallbackQuery network error:", e.message);
    return false;
  }
}
__name(answerCallbackQuery, "answerCallbackQuery");
__name2(answerCallbackQuery, "answerCallbackQuery");
function format24HourMessage(match, env, lang) {
  const en = lang === "en";
  const homeTeam = en ? match.homeTeam.name : translateTeam(match.homeTeam.name);
  const awayTeam = en ? match.awayTeam.name : translateTeam(match.awayTeam.name);
  const competition = en ? (COMP_EN[match.competition.code] || match.competition.code) : translateCompetition(match.competition.code);
  const dateStr = en ? getEnglishDate(match.utcDate, env) : getJalaliDate(match.utcDate, env);
  const timeStr = en ? getEnglishTime(match.utcDate, env) : getJalaliTime(match.utcDate, env);
  const stage = en
    ? (enStageName(match.stage) || (match.stage ? match.stage.replace(/_/g, " ") : "Group stage"))
    : (STAGE_FA[String(match.stage || "").toUpperCase()] || (match.stage ? match.stage.replace(/_/g, " ") : "\u0645\u0631\u062D\u0644\u0647 \u06AF\u0631\u0648\u0647\u06CC"));
  const timeUntil = en ? getEnglishRelative(match.utcDate) : getRelativeTimeUntilMatch(match.utcDate, env);
  let message = `*${escapeMarkdownCharacters(competition)}*`;
  if (match.competition.code === "CL" || isDomesticCup(match.competition.code) || match.stage !== "REGULAR_SEASON") {
    message += ` \\- ${escapeMarkdownCharacters(stage)}`;
  }
  message += `\n${escapeMarkdownCharacters(dateStr)}\n\n`;
  const vs = en ? " vs " : " \u{1F19A} ";
  message += `\u26BD *${escapeMarkdownCharacters(homeTeam)}${vs}${escapeMarkdownCharacters(awayTeam)}*\n`;
  message += `${escapeMarkdownCharacters(timeStr)}\n`;
  message += `${escapeMarkdownCharacters(timeUntil)}`;
  return message;
}
__name(format24HourMessage, "format24HourMessage");
__name2(format24HourMessage, "format24HourMessage");
function formatBigMatchMessage(match, env, lang) {
  const en = lang === "en";
  const homeTeam = en ? match.homeTeam.name : translateTeam(match.homeTeam.name);
  const awayTeam = en ? match.awayTeam.name : translateTeam(match.awayTeam.name);
  const competition = en ? (COMP_EN[match.competition.code] || match.competition.code) : translateCompetition(match.competition.code);
  const dateStr = en ? getEnglishDate(match.utcDate, env) : getJalaliDate(match.utcDate, env);
  const timeStr = en ? getEnglishTime(match.utcDate, env) : getJalaliTime(match.utcDate, env);
  const timeUntil = en ? getEnglishRelative(match.utcDate) : getRelativeTimeUntilMatch(match.utcDate, env);
  const stage = en
    ? (enStageName(match.stage) || (match.stage ? match.stage.replace(/_/g, " ") : ""))
    : (STAGE_FA[String(match.stage || "").toUpperCase()] || (match.stage ? match.stage.replace(/_/g, " ") : ""));
  const bigLabel = en ? "*Big match:* " : "*\u0628\u0627\u0632\u06CC \u0628\u0632\u0631\u06AF:* ";
  const vs = en ? " vs " : " \u{1F19A} ";
  let message = `${bigLabel}${escapeMarkdownCharacters(homeTeam)}${vs}${escapeMarkdownCharacters(awayTeam)}`;
  message += `\n*${escapeMarkdownCharacters(competition)}*`;
  if (match.competition.code === "CL" || isDomesticCup(match.competition.code) || match.stage !== "REGULAR_SEASON") {
    message += ` \\- ${escapeMarkdownCharacters(stage)}`;
  }
  message += `\n${escapeMarkdownCharacters(dateStr)}\n${escapeMarkdownCharacters(timeStr)}\n${escapeMarkdownCharacters(timeUntil)}`;
  return message;
}
__name(formatBigMatchMessage, "formatBigMatchMessage");
__name2(formatBigMatchMessage, "formatBigMatchMessage");
function format3HourMessage(match, env, lang) {
  const en = lang === "en";
  const homeTeam = en ? match.homeTeam.name : translateTeam(match.homeTeam.name);
  const awayTeam = en ? match.awayTeam.name : translateTeam(match.awayTeam.name);
  const competition = en ? (COMP_EN[match.competition.code] || match.competition.code) : translateCompetition(match.competition.code);
  const timeStr = en ? getEnglishTime(match.utcDate, env) : getJalaliTime(match.utcDate, env);
  const timeUntil = en ? getEnglishRelative(match.utcDate) : getRelativeTimeUntilMatch(match.utcDate, env);
  const head = en ? "*3 hours to kickoff*" : "*\u06CC\u0627\u062F\u0622\u0648\u0631\u06CC \u06F3 \u0633\u0627\u0639\u062A\u0647*";
  const vs = en ? " vs " : " \u{1F19A} ";
  let message = `${head}\n\n`;
  message += `\u26BD *${escapeMarkdownCharacters(homeTeam)}${vs}${escapeMarkdownCharacters(awayTeam)}*\n`;
  message += `${escapeMarkdownCharacters(competition)}\n`;
  message += `${escapeMarkdownCharacters(timeStr)}\n`;
  message += `${escapeMarkdownCharacters(timeUntil)}`;
  return message;
}
__name(format3HourMessage, "format3HourMessage");
__name2(format3HourMessage, "format3HourMessage");
function format1HourMessage(match, env, lang) {
  const en = lang === "en";
  const homeTeam = en ? match.homeTeam.name : translateTeam(match.homeTeam.name);
  const awayTeam = en ? match.awayTeam.name : translateTeam(match.awayTeam.name);
  const competition = en ? (COMP_EN[match.competition.code] || match.competition.code) : translateCompetition(match.competition.code);
  const timeStr = en ? getEnglishTime(match.utcDate, env) : getJalaliTime(match.utcDate, env);
  const timeUntil = en ? getEnglishRelative(match.utcDate) : getRelativeTimeUntilMatch(match.utcDate, env);
  const head = en ? "*1 hour to kickoff*" : "*\u06CC\u0627\u062F\u0622\u0648\u0631\u06CC \u06F1 \u0633\u0627\u0639\u062A\u0647*";
  const vs = en ? " vs " : " \u{1F19A} ";
  let message = `${head}\n\n`;
  message += `\u26BD *${escapeMarkdownCharacters(homeTeam)}${vs}${escapeMarkdownCharacters(awayTeam)}*\n`;
  message += `${escapeMarkdownCharacters(competition)}\n`;
  message += `${escapeMarkdownCharacters(timeStr)}\n`;
  message += `${escapeMarkdownCharacters(timeUntil)}`;
  return message;
}
__name(format1HourMessage, "format1HourMessage");
__name2(format1HourMessage, "format1HourMessage");
// v12.x-cron-gaps: lean 5-minute reminder for BIG matches only. Lean
// text per the user's "reduce noise" ask: one ⚽ on the match line, no
// per-line emojis.
function format5MinMessage(match, env, lang) {
  const en = lang === "en";
  const homeTeam = en ? match.homeTeam.name : translateTeam(match.homeTeam.name);
  const awayTeam = en ? match.awayTeam.name : translateTeam(match.awayTeam.name);
  const competition = en ? (COMP_EN[match.competition.code] || match.competition.code) : translateCompetition(match.competition.code);
  const timeStr = en ? getEnglishTime(match.utcDate, env) : getJalaliTime(match.utcDate, env);
  const head = en ? "*Kickoff in 5 min*" : "*\u06F5 \u062F\u0642\u06CC\u0642\u0647 \u062A\u0627 \u0634\u0631\u0648\u0639*";
  const vs = en ? " vs " : " \u{1F19A} ";
  let message = `${head}\n\n`;
  message += `\u26BD *${escapeMarkdownCharacters(homeTeam)}${vs}${escapeMarkdownCharacters(awayTeam)}*\n`;
  message += `${escapeMarkdownCharacters(competition)}\n`;
  message += `${escapeMarkdownCharacters(timeStr)}`;
  return message;
}
__name(format5MinMessage, "format5MinMessage");
__name2(format5MinMessage, "format5MinMessage");
function formatMatchStartMessage(match, env, lang) {
  const en = lang === "en";
  const homeTeam = en ? match.homeTeam.name : translateTeam(match.homeTeam.name);
  const awayTeam = en ? match.awayTeam.name : translateTeam(match.awayTeam.name);
  const competition = en ? (COMP_EN[match.competition.code] || match.competition.code) : translateCompetition(match.competition.code);
  const timeStr = en ? getEnglishTime(match.utcDate, env) : getJalaliTime(match.utcDate, env);
  const head = en ? "*Kickoff*" : "*\u0628\u0627\u0632\u06CC \u0634\u0631\u0648\u0639 \u0634\u062F\\!*";
  const vs = en ? " vs " : " \u{1F19A} ";
  let message = `${head}\n\n`;
  message += `\u26BD *${escapeMarkdownCharacters(homeTeam)}${vs}${escapeMarkdownCharacters(awayTeam)}*\n`;
  message += `${escapeMarkdownCharacters(competition)}\n`;
  message += `${escapeMarkdownCharacters(timeStr)}`;
  return message;
}
__name(formatMatchStartMessage, "formatMatchStartMessage");
__name2(formatMatchStartMessage, "formatMatchStartMessage");
async function formatResultMessage(match, env, lang) {
  const en = lang === "en";
  const homeTeam = en ? match.homeTeam.name : translateTeam(match.homeTeam.name);
  const awayTeam = en ? match.awayTeam.name : translateTeam(match.awayTeam.name);
  const competition = en ? (COMP_EN[match.competition.code] || match.competition.code) : translateCompetition(match.competition.code);
  const dateStr = en ? getEnglishDate(match.utcDate, env) : getJalaliDate(match.utcDate, env);
  const head = en ? "*Full time*" : "*\u0646\u062A\u06CC\u062C\u0647 \u0646\u0647\u0627\u06CC\u06CC*";
  const vs = en ? " vs " : " \u{1F19A} ";
  let message = `${head}\n\n`;
  message += `\u26BD *${escapeMarkdownCharacters(homeTeam)}${vs}${escapeMarkdownCharacters(awayTeam)}*\n`;
  message += `${escapeMarkdownCharacters(competition)}\n`;
  message += `${escapeMarkdownCharacters(dateStr)}\n\n`;
  if (match.score.fullTime.home !== null && match.score.fullTime.away !== null) {
    const h = en ? match.score.fullTime.home.toString() : toFaDigits(match.score.fullTime.home.toString());
    const a = en ? match.score.fullTime.away.toString() : toFaDigits(match.score.fullTime.away.toString());
    message += `*${h}\\-${a}*`;
    if (match.score.fullTime.home > match.score.fullTime.away) {
      const won = en ? `${escapeMarkdownCharacters(homeTeam)} won` : `\u2705 ${escapeMarkdownCharacters(homeTeam)} \u0628\u0631\u0646\u062F\u0647 \u0634\u062F`;
      message += `\n${won}`;
    } else if (match.score.fullTime.home < match.score.fullTime.away) {
      const won = en ? `${escapeMarkdownCharacters(awayTeam)} won` : `\u2705 ${escapeMarkdownCharacters(awayTeam)} \u0628\u0631\u0646\u062F\u0647 \u0634\u062F`;
      message += `\n${won}`;
    } else {
      const draw = en ? "Draw" : "\u0645\u0633\u0627\u0648\u06CC";
      message += `\n${draw}`;
    }
  } else {
    const noScore = en ? "Score not available" : "\u0646\u062A\u06CC\u062C\u0647 \u062F\u0631 \u062F\u0633\u062A\u0631\u0633 \u0646\u06CC\u0633\u062A";
    message += `${noScore}`;
  }
  return await appendTableOrPhase(env, match, message, lang);
}
__name(formatResultMessage, "formatResultMessage");
__name2(formatResultMessage, "formatResultMessage");
var STAGE_FA = {
  "PLAYOFF_ROUND": "\u067E\u0644\u06CC\u200C\u0622\u0641 \u0645\u0631\u062D\u0644\u0647 \u062D\u0630\u0641\u06CC",
  "ROUND_OF_16": "\u06CC\u06A9\u200C\u0647\u0634\u062A\u0645 \u0646\u0647\u0627\u06CC\u06CC",
  "QUARTER_FINALS": "\u06CC\u06A9\u200C\u0686\u0647\u0627\u0631\u0645 \u0646\u0647\u0627\u06CC\u06CC",
  "QUARTER_FINAL": "\u06CC\u06A9\u200C\u0686\u0647\u0627\u0631\u0645 \u0646\u0647\u0627\u06CC\u06CC",
  "SEMI_FINALS": "\u0646\u06CC\u0645\u0647\u200C\u0646\u0647\u0627\u06CC\u06CC",
  "SEMI_FINAL": "\u0646\u06CC\u0645\u0647\u200C\u0646\u0647\u0627\u06CC\u06CC",
  "FINAL": "\u0641\u06CC\u0646\u0627\u0644",
  "THIRD_PLACE": "\u0631\u062F\u0647\u200C\u0628\u0646\u062F\u06CC"
};
function faStageName(stage) {
  return STAGE_FA[String(stage || "").toUpperCase()] || null;
}
__name(faStageName, "faStageName");
__name2(faStageName, "faStageName");
async function fetchStandings(env, code, allowFetch = true) {
  const cacheKey = CONFIG.KV_STANDINGS_CACHE + code;
  const cached = await env.STATE.get(cacheKey, "json").catch(() => null);
  if (cached && cached.ts && Date.now() - cached.ts < 6e5) return cached.data;
  if (!allowFetch) return cached && cached.data && Array.isArray(cached.data.teams) && cached.data.teams.length ? cached.data : null;
  let out = null;
  try {
    if (code === "EL" || code === "ECL") {
      const slug = SPORTSCORE_SLUGS[code];
      if (slug && !await providerSuspended(env, "sportscore")) {
        try {
          const data = await fetchJSON("https://sportscore.com/api/v1/standings/?sport=football&competition=" + slug);
          const table = data && data.tables && data.tables[0] && data.tables[0].rows || [];
          if (table.length) {
            out = { matchday: null, teams: table.map((r) => ({ name: r.team, pos: r.pos, points: r.pts, played: r.pld != null ? r.pld : r.played, won: r.w != null ? r.w : r.won, draw: r.d != null ? r.d : r.drawn, lost: r.l != null ? r.l : r.lost, gf: r.gf, ga: r.ga })) };
            await clearProviderSuspension(env, "sportscore");
          }
        } catch (e) {
        }
      }
    } else if (code === "PGL") {
      const ps = SPORTSCORE_SLUGS.PGL;
      if (ps && !await providerSuspended(env, "sportscore")) {
        try {
          const data = await fetchJSON("https://sportscore.com/api/v1/standings/?sport=football&competition=" + ps);
          const table = data && data.tables && data.tables[0] && data.tables[0].rows || [];
          if (table.length >= 8) {
            out = { matchday: null, started: table.some((r) => parseInt(r.pts) > 0), teams: table.map((r) => ({ name: r.team, pos: r.pos, points: r.pts, played: r.pld != null ? r.pld : r.played, won: r.w != null ? r.w : r.won, draw: r.d != null ? r.d : r.drawn, lost: r.l != null ? r.l : r.lost, gf: r.gf, ga: r.ga })) };
            await clearProviderSuspension(env, "sportscore");
          }
        } catch (e) {
        }
      }
      if (!out) out = await fetchPglTableFromWikipedia(env);
      if (!out) {
        for (const season of ["2026-2027", "2025-2026"]) {
          try {
            const data = await fetchJSON("https://www.thesportsdb.com/api/v1/json/3/lookuptable.php?l=4742&s=" + season);
            const rows = data && data.table || [];
            if (rows.length >= 8) {
              out = { matchday: 0, started: rows.some((r) => parseInt(r.intPlayed) > 0), teams: rows.map((r) => ({ name: r.strTeam, pos: parseInt(r.intRank) || 0, points: parseInt(r.intPoints) || 0, played: parseInt(r.intPlayed) || 0, won: parseInt(r.intWin) || 0, draw: parseInt(r.intDraw) || 0, lost: parseInt(r.intLoss) || 0, gf: parseInt(r.intGoalsFor) || 0, ga: parseInt(r.intGoalsAgainst) || 0 })) };
              break;
            }
          } catch (e) {
          }
        }
      }
    } else if (code === "AL") {
      const slug = SPORTSCORE_SLUGS.AL;
      if (slug && !await providerSuspended(env, "sportscore")) {
        try {
          const data = await fetchJSON("https://sportscore.com/api/v1/standings/?sport=football&competition=" + slug);
          const table = data && data.tables && data.tables[0] && data.tables[0].rows || [];
          if (table.length) {
            const sStart = CONFIG.SEASON_STARTS && CONFIG.SEASON_STARTS.AL;
            const notStarted = sStart && /* @__PURE__ */ new Date() < new Date(sStart);
            out = notStarted ? { matchday: null, started: false, teams: table.map((r, i) => ({ name: r.team, pos: i + 1, points: 0 })) } : { matchday: null, started: table.some((r) => parseInt(r.pts) > 0), teams: table.map((r) => ({ name: r.team, pos: r.pos, points: r.pts, played: r.pld != null ? r.pld : r.played, won: r.w != null ? r.w : r.won, draw: r.d != null ? r.d : r.drawn, lost: r.l != null ? r.l : r.lost, gf: r.gf, ga: r.ga })) };
          }
        } catch (e) {
        }
      }
    } else {
      const headers = { "X-Auth-Token": env.API_TOKEN };
      const res = await fetch("https://api.football-data.org/v4/competitions/" + code + "/standings", { headers });
      if (res.ok) {
        const data = await res.json();
        const season = data.season;
        const table = data.standings && data.standings[0] && data.standings[0].table || [];
        const seasonEnded = season && season.endDate && new Date(season.endDate) < /* @__PURE__ */ new Date();
        const notStarted = seasonEnded || season && season.startDate && new Date(season.startDate) > /* @__PURE__ */ new Date();
        if (notStarted) {
          const tRes = await fetch("https://api.football-data.org/v4/competitions/" + code + "/teams", { headers });
          let zeroRows = null;
          if (tRes.ok) {
            const tData = await tRes.json();
            const roster = (tData.teams || []).slice().sort((a, b) => a.name.localeCompare(b.name));
            zeroRows = roster.map((t, i) => ({ name: t.name, pos: i + 1, points: 0 }));
          }
          out = {
            matchday: 0,
            started: false,
            teams: zeroRows || table.map((r) => ({ name: r.team.name, pos: r.position, points: 0 }))
          };
        } else {
          out = {
            matchday: season ? season.currentMatchday : null,
            started: true,
            // v12.16: full detail per team (the UCL card now renders MP/W/D/L/
            // GF/GA/GD columns); football-data serves all of it.
            teams: table.map((r) => ({
              name: r.team.name,
              pos: r.position,
              points: r.points,
              played: r.playedGames != null ? r.playedGames : r.played,
              won: r.won,
              draw: r.draw,
              lost: r.lost,
              gf: r.goalsFor,
              ga: r.goalsAgainst,
              gd: r.goalDifference
            }))
          };
        }
      }
      if (!out && code === "BL1") {
        const slug = SPORTSCORE_SLUGS.BL1;
        if (slug) {
          const data = await fetchJSON("https://sportscore.com/api/v1/standings/?sport=football&competition=" + slug);
          const table = data && data.tables && data.tables[0] && data.tables[0].rows || [];
          out = { matchday: null, started: false, teams: table.map((r, i) => ({ name: r.team, pos: i + 1, points: 0 })) };
        }
      }
    }
  } catch (e) {
    console.error("Standings fetch failed for " + code + ": " + e.message);
  }
  if (out && out.teams.length) {
    await env.STATE.put(cacheKey, JSON.stringify({ ts: Date.now(), data: out }), { expirationTtl: 28800 }).catch(() => {
    });
    return out;
  }
  if (cached && cached.data && Array.isArray(cached.data.teams) && cached.data.teams.length) return cached.data;
  return null;
}
__name(fetchStandings, "fetchStandings");
__name2(fetchStandings, "fetchStandings");
async function standingsLine(env, match, lang) {
  const en = lang === "en";
  const code = match.competition.code;
  const fresh = await fetchStandings(env, code);
  if (!fresh || !fresh.teams.length) return null;
  const snapKey = CONFIG.KV_STANDINGS_SNAP + code;
  const old = await env.STATE.get(snapKey, "json").catch(() => null);
  await env.STATE.put(snapKey, JSON.stringify(fresh)).catch(() => {
  });
  const lines = [];
  for (const team of [match.homeTeam, match.awayTeam]) {
    const row = fresh.teams.find((x) => (0, import_teams.normalizeTeamName)(x.name) === (0, import_teams.normalizeTeamName)(team.name));
    if (!row) continue;
    const prev = old && old.teams && old.teams.find((x) => (0, import_teams.normalizeTeamName)(x.name) === (0, import_teams.normalizeTeamName)(team.name));
    let delta = "";
    if (prev) {
      const d = prev.pos - row.pos;
      const dStr = en ? Math.abs(d).toString() : toFaDigits(Math.abs(d).toString());
      const upArrow = "\u2191";
      const downArrow = "\u2193";
      const emDash = "\u2014";
      delta = d > 0 ? " \\(" + upArrow + dStr + "\\)" : d < 0 ? " \\(" + downArrow + dStr + "\\)" : " \\(" + emDash + "\\)";
    }
    const teamName = en ? row.name : translateTeam(row.name);
    const posStr = en ? row.pos.toString() : toFaDigits(row.pos.toString());
    const ptsStr = en ? row.points.toString() : toFaDigits(row.points.toString());
    const rankWord = en ? "#" : "\u0631\u062A\u0628\u0647 ";
    const ptsWord = en ? " pts" : " \u0627\u0645\u062A\u06CC\u0627\u0632";
    lines.push("\u2022 " + escapeMarkdownCharacters(teamName) + ": " + rankWord + posStr + " \u2014 " + ptsStr + ptsWord + delta);
  }
  if (!lines.length) return null;
  const compName = en ? (COMP_EN[code] || code) : translateCompetition(code);
  const tblWord = en ? "Table " : "\u{1F4CA} \u062C\u062F\u0648\u0644 ";
  return "\n\n" + tblWord + escapeMarkdownCharacters(compName) + ":\n" + lines.join("\n");
}
__name(standingsLine, "standingsLine");
__name2(standingsLine, "standingsLine");
async function appendTableOrPhase(env, match, message, lang) {
  const en = lang === "en";
  const faStage = faStageName(match.stage);
  const enStage = enStageName(match.stage);
  if (isDomesticCup(match.competition.code) || faStage || enStage) {
    const phaseWord = en ? "This was a knockout match" : "\u2694\uFE0F \u0627\u06CC\u0646 \u0645\u0633\u0627\u0628\u0642\u0647 \u062F\u0631 \u0645\u0631\u062D\u0644\u0647 \u062D\u0630\u0641\u06CC \u0628\u0648\u062F";
    const stageName = en ? enStage : faStage;
    return message + "\n\n" + phaseWord + (stageName ? ": " + stageName : "");
  }
  return message + (await standingsLine(env, match, lang) || "");
}
__name(appendTableOrPhase, "appendTableOrPhase");
__name2(appendTableOrPhase, "appendTableOrPhase");
function isoWeekKey(d) {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = (t.getUTCDay() + 6) % 7;
  t.setUTCDate(t.getUTCDate() - dayNum + 3);
  const isoYear = t.getUTCFullYear();
  const firstThu = new Date(Date.UTC(isoYear, 0, 4));
  const fDayNum = (firstThu.getUTCDay() + 6) % 7;
  firstThu.setUTCDate(firstThu.getUTCDate() - fDayNum + 3);
  const week = 1 + Math.round((t.getTime() - firstThu.getTime()) / 6048e5);
  return isoYear + "-W" + String(week).padStart(2, "0");
}
__name(isoWeekKey, "isoWeekKey");
__name2(isoWeekKey, "isoWeekKey");
function weeklyTableCodes() {
  const order = ["PL", "PD", "SA", "BL1", "FL1", "PGL", "AL", "CL"];
  const picked = new Set([].concat(CONFIG.LEAGUES || [], ["PGL"]));
  return order.filter((c) => picked.has(c));
}
__name(weeklyTableCodes, "weeklyTableCodes");
__name2(weeklyTableCodes, "weeklyTableCodes");
function buildLeagueTableMessage(code, st, opts, lang) {
  const en = lang === "en";
  const isCL = code === "CL";
  const teams = (st.teams || []).slice().sort((a, b) => (a.pos || 0) - (b.pos || 0) || (b.points || 0) - (a.points || 0));
  const shown = isCL ? teams.slice(0, 10) : teams;
  const sel = new Set((CONFIG.BIG_TEAMS_BY_LEAGUE[code] || []).map((t) => normAlias(t)));
  const compName = en ? (COMP_EN[code] || code) : translateCompetition(code);
  const lines = shown.map((t, i) => {
    const numStr = en ? String(i + 1) : toFaDigits(String(i + 1));
    const ptsStr = en ? String(t.points == null ? 0 : t.points) : toFaDigits(String(t.points == null ? 0 : t.points));
    const ptsWord = en ? " pts" : " \u0627\u0645\u062A\u06CC\u0627\u0632";
    const teamName = en ? t.name : translateTeam(t.name);
    const row = numStr + "\\. " + escapeMarkdownCharacters(teamName) + (sel.has(normAlias(t.name)) ? " \u2B50" : "") + " \u2014 " + ptsStr + ptsWord;
    return i === 0 ? "*" + row + "*" : row;
  });
  let head = (en ? "\u{1F4CA} *" : "\u{1F4CA} *\u062C\u062F\u0648\u0644 ") + escapeMarkdownCharacters(compName) + "*";
  if (st.matchday) head += en ? " \u2014 Matchday " + String(st.matchday) : " \u2014 \u0647\u0641\u062A\u0647 " + toFaDigits(String(st.matchday));
  if (opts && opts.label) head += " \u2014 " + opts.label;
  let msg = head + "\n\n" + lines.join("\n");
  if (isCL && teams.length > shown.length) {
    const moreStr = en ? "+ " + String(teams.length - shown.length) + " more" : "\n\u2026 " + toFaDigits(String(teams.length - shown.length)) + " \u062A\u06CC\u0645 \u0628\u0639\u062F\u06CC";
    msg += "\n" + moreStr;
  }
  const footer = en ? "\n\nFull table: football\\.sportsignal\\.ir" : "\n\n\u{1F4CA} \u062C\u062F\u0648\u0644 \u06A9\u0627\u0645\u0644: football\\.sportsignal\\.ir";
  msg += footer;
  return msg;
}
__name(buildLeagueTableMessage, "buildLeagueTableMessage");
__name2(buildLeagueTableMessage, "buildLeagueTableMessage");
async function sendLeagueTables(env, chatIds, opts, lang) {
  const lng = lang === "en" ? "en" : "fa";
  const out = { leagues: [], sent: 0, failed: 0 };
  if (!Array.isArray(chatIds) || !chatIds.length) {
    out.error = "no chats";
    return out;
  }
  const messages = [];
  for (const code of weeklyTableCodes()) {
    let st = null;
    try {
      st = await fetchStandings(env, code, true);
    } catch (e) {
      st = null;
    }
    if (!st || !Array.isArray(st.teams) || !st.teams.length) {
      out.leagues.push({ code, ok: false, reason: "unavailable" });
      continue;
    }
    if (st.started === false) {
      out.leagues.push({ code, ok: false, reason: "not-started" });
      continue;
    }
    messages.push({ code, text: buildLeagueTableMessage(code, st, opts, lng) });
    out.leagues.push({ code, ok: true, rows: code === "CL" ? Math.min(10, st.teams.length) : st.teams.length, matchday: st.matchday || null });
  }
  for (const chatId of chatIds) {
    for (const m of messages) {
      if (await sendTelegram(env, m.text, chatId)) out.sent++;
      else out.failed++;
    }
  }
  return out;
}
__name(sendLeagueTables, "sendLeagueTables");
__name2(sendLeagueTables, "sendLeagueTables");
function specialBanner(match, lang) {
  const en = lang === "en";
  const parts = [];
  if (isDerby(match)) parts.push(en ? "\u2694\uFE0F *Derby*" : "\u2694\uFE0F *\u062F\u0631\u0628\u06CC\u0654 \u062D\u0633\u0627\u0633\u0654*");
  if (match.competition && match.competition.code === "CL" && isMasterPair(match)) parts.push(en ? "*Champions League blockbuster*" : "*\u062F\u0648\u0626\u0644 \u0628\u0632\u0631\u06AF \u0644\u06CC\u06AF \u0642\u0647\u0631\u0645\u0627\u0646\u0627\u0646 \u0627\u0631\u0648\u067E\u0627\u0654*");
  return parts.length ? parts.join("\n") + "\n\n" : "";
}
__name(specialBanner, "specialBanner");
__name2(specialBanner, "specialBanner");
async function buildWeekAheadMessage(env, lang) {
  const en = lang === "en";
  let pool = await env.STATE.get(CONFIG.KV_MATCHES_KEY, "json").catch(() => null);
  let matches = pool && Array.isArray(pool.matches) ? pool.matches : [];
  if (!matches.length) matches = await getCachedMatches(env);
  const now = Date.now();
  const to = now + CONFIG.WEEK_AHEAD_DAYS * 864e5;
  const worthy = matches.filter((m) => shouldNotify(m) && new Date(m.utcDate).getTime() >= now - 36e5 && new Date(m.utcDate).getTime() < to);
  if (!worthy.length) return null;
  const byKick = /* @__PURE__ */ __name((a, b) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime(), "byKick");
  const derbies = worthy.filter((m) => isDerby(m)).sort(byKick);
  const uclDuels = worthy.filter((m) => !isDerby(m) && m.competition && m.competition.code === "CL" && isMasterPair(m)).sort(byKick);
  const rest = worthy.filter((m) => !derbies.includes(m) && !uclDuels.includes(m)).sort(byKick).slice(0, 10);
  const fmtLine = /* @__PURE__ */ __name((m, mark) => {
    const locale = en ? "en-GB" : "fa-IR";
    const weekday = new Intl.DateTimeFormat(locale, { weekday: "long", timeZone: env.TEHRAN_TZ || "Asia/Tehran" }).format(new Date(m.utcDate));
    const time = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: env.TEHRAN_TZ || "Asia/Tehran" }).format(new Date(m.utcDate));
    const timeStr = en ? time : toFaDigits(time);
    const home = en ? m.homeTeam.name : translateTeam(m.homeTeam.name);
    const away = en ? m.awayTeam.name : translateTeam(m.awayTeam.name);
    const comp = en ? (COMP_EN[m.competition.code] || m.competition.code) : translateCompetition(m.competition.code);
    const vs = en ? " vs " : " \u{1F19A} ";
    return mark + escapeMarkdownCharacters(home) + vs + escapeMarkdownCharacters(away) + " \u2014 " + weekday + " " + timeStr + " \u2014 " + escapeMarkdownCharacters(comp);
  }, "fmtLine");
  const lines = [];
  for (const m of derbies) lines.push("*" + fmtLine(m, "\u2694\uFE0F ") + "*");
  for (const m of uclDuels) lines.push("*" + fmtLine(m, "") + "*");
  for (const m of rest) lines.push(fmtLine(m, ""));
  const extraCount = worthy.length - derbies.length - uclDuels.length - rest.length;
  const head = en ? "*Matches this week*\n\n" : "*\u0628\u0627\u0632\u06CC\u200C\u0647\u0627\u06CC \u0647\u0641\u062A\u0647 \u0622\u06CC\u0646\u062F\u0647*\n\n";
  let msg = head + lines.join("\n");
  if (extraCount > 0) {
    const extraStr = en ? "\n+ " + String(extraCount) + " more matches" : "\n\u2026 \u0648 " + toFaDigits(String(extraCount)) + " \u0628\u0627\u0632\u06CC \u062F\u06CC\u06AF\u0631";
    msg += extraStr;
  }
  return msg;
}
__name(buildWeekAheadMessage, "buildWeekAheadMessage");
__name2(buildWeekAheadMessage, "buildWeekAheadMessage");
async function sendWeekAhead(env, chatIds, lang) {
  const out = { sent: 0, failed: 0, text: null };
  if (!Array.isArray(chatIds) || !chatIds.length) return out;
  let text = null;
  try {
    text = await buildWeekAheadMessage(env, lang);
  } catch (e) {
    console.error("week-ahead build failed: " + e.message);
  }
  if (!text) return out;
  out.text = text;
  for (const chatId of chatIds) {
    if (await sendTelegram(env, text, chatId)) out.sent++;
    else out.failed++;
  }
  return out;
}
__name(sendWeekAhead, "sendWeekAhead");
__name2(sendWeekAhead, "sendWeekAhead");
async function maybeSendWeeklyTables(env, chatIds) {
  const t = getNowTehran(env);
  if (t.getUTCDay() !== CONFIG.WEEKLY_TABLES.day) return null;
  const mins = t.getUTCHours() * 60 + t.getUTCMinutes();
  if (mins < CONFIG.WEEKLY_TABLES.fromMin || mins >= CONFIG.WEEKLY_TABLES.toMin) return null;
  const week = isoWeekKey(t);
  const done = await env.STATE.get(CONFIG.KV_WEEKLY_TABLES).catch(() => null);
  if (done === week) return null;
  // v12.x-bilingual-bot: group chats by lang so each user gets the
  // digest + week-ahead in their own lang. Defensive: getUserPrefs may
  // be undefined in the test harness (check-weekly-tables.js).
  const prefs = typeof getUserPrefs === "function" ? await getUserPrefs(env) : {};
  const langGroups = new Map();
  for (const c of chatIds) {
    const p = prefs[String(c)] || {};
    const lng = p.lang === "en" ? "en" : "fa";
    if (!langGroups.has(lng)) langGroups.set(lng, []);
    langGroups.get(lng).push(c);
  }
  let res = { leagues: [], sent: 0, failed: 0 };
  let weekAheadAgg = { sent: 0, failed: 0, skipped: true };
  for (const [lng, group] of langGroups) {
    const label = lng === "en" ? "End of week" : "\u067E\u0627\u06CC\u0627\u0646 \u0647\u0641\u062A\u0647";
    const r = await sendLeagueTables(env, group, { label }, lng);
    res.sent += r.sent; res.failed += r.failed;
    res.leagues = res.leagues.concat(r.leagues);
    const wa = await sendWeekAhead(env, group, lng);
    weekAheadAgg.sent += wa.sent; weekAheadAgg.failed += wa.failed;
    if (wa.text) weekAheadAgg.skipped = false;
  }
  res.weekAhead = weekAheadAgg;
  if (res.sent > 0 || weekAheadAgg.sent > 0) await env.STATE.put(CONFIG.KV_WEEKLY_TABLES, week).catch(() => {
  });
  return res;
}
__name(maybeSendWeeklyTables, "maybeSendWeeklyTables");
__name2(maybeSendWeeklyTables, "maybeSendWeeklyTables");
// v12.x-cron-gaps: matchday morning digest. Fires ONCE per chat per day at
// 9am local time. Lists today's master big matches (both teams big) in the
// user's lang. Per-chat dedupe via KV `digest_sent_<YYYY-MM-DD>_<chatId>`.
// Designed to coexist with the existing weekly tables digest; it's much
// leaner (one line per match, no full tables) and fires every day (the
// weekly tables only fire Monday morning Tehran).
async function maybeSendMorningDigest(env, chatIds) {
  const out = { sent: 0, skipped: 0, noMatches: 0 };
  if (!Array.isArray(chatIds) || !chatIds.length) return out;
  const prefs = typeof getUserPrefs === "function" ? await getUserPrefs(env) : {};
  // Build the per-tz "is it 9am here?" lookup once. Each tz bucket is
  // processed independently so a Sydney 9am fires ~6 hours before Tehran's.
  const byTz = /* @__PURE__ */ new Map();
  for (const c of chatIds) {
    const tz = (typeof getUserTz === "function" ? getUserTz(prefs, c, env) : env.TEHRAN_TZ) || env.TEHRAN_TZ || "Asia/Tehran";
    if (!byTz.has(tz)) byTz.set(tz, []);
    byTz.get(tz).push(c);
  }
  for (const [tz, tzChats] of byTz) {
    let hour = -1, dateKey = null;
    try {
      const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: tz, hour12: false,
        year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit"
      }).formatToParts(/* @__PURE__ */ new Date());
      const p = {};
      for (const x of parts) p[x.type] = x.value;
      const hh = p.hour === "24" ? "00" : p.hour;
      hour = parseInt(hh, 10);
      dateKey = p.year + "-" + p.month + "-" + p.day;
    } catch (e) {
      continue;
    }
    if (hour !== 9) continue;
    if (!dateKey) continue;
    // Pull the latest pool (KV first; falls back to the in-memory cron pool).
    let pool = await env.STATE.get(CONFIG.KV_MATCHES_KEY, "json").catch(() => null);
    let matches = pool && Array.isArray(pool.matches) ? pool.matches : [];
    if (!matches.length) matches = await getCachedMatches(env).catch(() => []);
    if (!Array.isArray(matches) || !matches.length) continue;
    // Today's big matches (in this tz). "Today" = midnight-to-midnight local.
    // Build the tz-local midnight as a UTC instant using the format above.
    let dayStart = 0, dayEnd = 0;
    try {
      const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: tz, hour12: false,
        year: "numeric", month: "2-digit", day: "2-digit"
      }).formatToParts(/* @__PURE__ */ new Date());
      const p = {};
      for (const x of parts) p[x.type] = x.value;
      dayStart = Date.UTC(parseInt(p.year, 10), parseInt(p.month, 10) - 1, parseInt(p.day, 10), 0, 0, 0);
      dayEnd = dayStart + 24 * 60 * 60 * 1e3;
    } catch (e) {
      continue;
    }
    const todayBig = matches.filter((m) =>
      m && m.competition && m.competition.code &&
      isMasterBigMatch(m) &&
      m.status !== "FINISHED" &&
      (function () { const tt = new Date(m.utcDate).getTime(); return tt >= dayStart && tt < dayEnd; })()
    ).sort((a, b) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime());
    if (!todayBig.length) continue;
    // Per-chat send with dedupe. Use the original env.TEHRAN_TZ for time
    // rendering in the user's lang (the matches are at UTC instants; the
    // time displayed is whatever tz the user has set).
    const originalTz = env.TEHRAN_TZ;
    try {
      env.TEHRAN_TZ = tz;
      for (const c of tzChats) {
        const dedupeKey = "digest_sent_" + dateKey + "_" + c;
        const already = await env.STATE.get(dedupeKey).catch(() => null);
        if (already) { out.skipped++; continue; }
        const lang = (prefs[String(c)] && prefs[String(c)].lang) === "en" ? "en" : "fa";
        const msg = await buildMorningDigestMessage(env, todayBig, lang);
        const r = await sendTelegram(env, msg, c);
        if (r === true) {
          out.sent++;
          await env.STATE.put(dedupeKey, String(Date.now()), { expirationTtl: 36 * 60 * 60 }).catch(() => {});
        } else if (r === "dead") {
          // Mark as sent too — don't retry a dead chat all 9am hour.
          await env.STATE.put(dedupeKey, String(Date.now()), { expirationTtl: 36 * 60 * 60 }).catch(() => {});
        }
      }
    } finally {
      env.TEHRAN_TZ = originalTz;
    }
  }
  if (out.sent) console.log(`\u{1F4C5} Morning digest sent=${out.sent} skipped=${out.skipped}`);
  return out;
}
__name(maybeSendMorningDigest, "maybeSendMorningDigest");
__name2(maybeSendMorningDigest, "maybeSendMorningDigest");
async function buildMorningDigestMessage(env, matches, lang) {
  const en = lang === "en";
  const head = en ? "*Today's big matches:*\n\n" : "*\u0628\u0627\u0632\u06CC\u200C\u0647\u0627\u06CC \u0628\u0632\u0631\u06AF \u0627\u0645\u0631\u0648\u0632:*\n\n";
  const lines = [];
  for (const m of matches.slice(0, 8)) {
    const home = en ? m.homeTeam.name : translateTeam(m.homeTeam.name);
    const away = en ? m.awayTeam.name : translateTeam(m.awayTeam.name);
    const comp = en ? (COMP_EN[m.competition.code] || m.competition.code) : translateCompetition(m.competition.code);
    const time = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: env.TEHRAN_TZ || "Asia/Tehran" }).format(new Date(m.utcDate));
    const timeStr = en ? time : toFaDigits(time);
    const vs = en ? " vs " : " \u{1F19A} ";
    lines.push("\u26BD " + escapeMarkdownCharacters(home) + vs + escapeMarkdownCharacters(away) + " \u2014 " + timeStr + " \u2014 " + escapeMarkdownCharacters(comp));
  }
  let msg = head + lines.join("\n");
  if (matches.length > 8) {
    const extra = matches.length - 8;
    const extraStr = en ? "\n+ " + String(extra) + " more" : "\n\u2026 \u0648 " + toFaDigits(String(extra)) + " \u0628\u0627\u0632\u06CC \u062F\u06CC\u06AF\u0631";
    msg += extraStr;
  }
  return msg;
}
__name(buildMorningDigestMessage, "buildMorningDigestMessage");
__name2(buildMorningDigestMessage, "buildMorningDigestMessage");
// v12.x-cron-gaps: big-match FT broadcast. The existing "result" config
// only fires for users following at least one team in the match \u2014 so a
// UCL blockbuster (Real Madrid vs Man City) only notifies users who
// follow either side. This broadcast fills the gap: for any finished
// master-big-match in the post-match window, FT is sent to every
// registered chat that didn't already get it via the regular result
// path. Uses a separate "result-big" notification type so the dedupe
// map doesn't double-count against the existing "result" entry.
async function broadcastBigMatchResults(env, matches) {
  const out = { sent: 0, failed: 0, dead: 0, matches: 0 };
  try {
    if (!Array.isArray(matches) || !matches.length) return out;
    const candidates = matches.filter((m) =>
      m && isMatchFinished(m) && isWithinPostMatchWindow(m, env) && isMasterBigMatch(m)
    );
    if (!candidates.length) return out;
    const chatIds = await getRegisteredChats(env);
    if (!chatIds.length) return out;
    const prefs = typeof getUserPrefs === "function" ? await getUserPrefs(env) : {};
    const notifiedMatches = await getNotifiedMatches(env);
    const deadChats = [];
    const originalTz = env.TEHRAN_TZ;
    for (const match of candidates) {
      out.matches++;
      // Users who follow at least one team in the match already get the
      // "result" notification via the regular path \u2014 skip them here.
      const nonFollowers = chatIds.filter((c) => {
        const f = (typeof userFollowsMatch === "function" ? userFollowsMatch(prefs, c, match) : null);
        return f === null;
      });
      if (!nonFollowers.length) continue;
      const groups = (typeof groupChatsByTz === "function" ? groupChatsByTz(nonFollowers, prefs, env) : [{ tz: env.TEHRAN_TZ, lang: "fa", chats: nonFollowers }]);
      let anySuccess = false;
      try {
        for (const g of groups) {
          env.TEHRAN_TZ = g.tz;
          const lang = g.lang || "fa";
          const message = specialBanner(match, lang) + await formatResultMessage(match, env, lang);
          const sendResults = await Promise.allSettled(
            g.chats.map((chatId) => sendTelegram(env, message, chatId))
          );
          sendResults.forEach((r, i) => {
            if (r.status === "fulfilled" && r.value === "dead") deadChats.push(g.chats[i]);
          });
          if (sendResults.some((r) => r.status === "fulfilled" && r.value === true)) anySuccess = true;
        }
      } finally {
        env.TEHRAN_TZ = originalTz;
      }
      if (anySuccess) {
        await saveNotifiedMatch(env, match, "result-big", notifiedMatches);
        out.sent++;
      }
    }
    if (deadChats.length) {
      const keep = chatIds.filter((c) => !deadChats.includes(c));
      await env.STATE.put(CONFIG.KV_USERS_KEY, JSON.stringify(keep)).catch(() => {});
      out.dead = deadChats.length;
    }
    if (out.sent) console.log(`\u{1F4E4} result-big broadcast: ${out.sent} big-match FTs to non-followers`);
  } catch (e) {
    console.error("Big-match result broadcast failed: " + e.message);
  }
  return out;
}
__name(broadcastBigMatchResults, "broadcastBigMatchResults");
__name2(broadcastBigMatchResults, "broadcastBigMatchResults");
// v12.32 (the user's ask): "When a team that is not in the first place, such
// as a team that is second, third, or fourth in the table, reaches the top
// of the table, a special notification should be sent in the Telegram bot.
// For example, if Liverpool is second in the table and Manchester City is
// first. If Liverpool beats Newcastle, it reaches the top of the table, the
// bot sends a notification that Liverpool has reached the top of the table
// after this match [match details]" \u2014 maybeNotifyTableToppers runs after
// every cron sweep, for each domestic league with a table: the current #1
// is compared against the LAST RUN's snapshot (KV "table_top_v1:<code>",
// top-10 rows). A change fires ONLY when (a) the new #1 was NOT #1 before
// (its previous position is 2+, any non-first slot), and (b) a just-
// finished match (within the 6h post-match window) involving the new OR
// the old leader is in the pool \u2014 THAT match's details ride the message
// (teams, score, competition, date). Without such a match the change is
// API jitter / season reset and the snapshot just updates silently. The
// snapshot updates EVERY run, so each genuine coronation notifies exactly
// once. Recipients: every registered chat (a league-wide headline, like
// the weekly tables digest \u2014 not a per-team-follow event).
async function maybeNotifyTableToppers(env, matches) {
  const out = { sent: 0, failed: 0, events: [] };
  const chatIds = await getRegisteredChats(env);
  if (!Array.isArray(chatIds) || !chatIds.length) return out;
  if (!Array.isArray(matches) || !matches.length) return out;
  for (const code of weeklyTableCodes().filter((c) => c !== "CL")) {
    let st = null;
    try {
      st = await fetchStandings(env, code, true);
    } catch (e) {
      st = null;
    }
    if (!st || !Array.isArray(st.teams) || !st.teams.length) continue;
    if (st.started === false) continue;
    const sorted = st.teams.slice().sort((a, b) => (a.pos || 999) - (b.pos || 999) || (b.points || 0) - (a.points || 0));
    const newLeader = sorted[0];
    if (!newLeader) continue;
    const snapKey = "table_top_v1:" + code;
    const prev = await env.STATE.get(snapKey, "json").catch(() => null);
    await env.STATE.put(snapKey, JSON.stringify({ ts: Date.now(), top: sorted.slice(0, 10).map((t) => ({ name: t.name, pos: t.pos, points: t.points })) })).catch(() => {
    });
    if (!prev || !Array.isArray(prev.top) || !prev.top.length) continue;
    const oldLeader = prev.top.find((t) => t.pos === 1);
    if (!oldLeader) continue;
    if (normAlias(oldLeader.name) === normAlias(newLeader.name)) continue;
    const prevRowOfNew = prev.top.find((t) => normAlias(t.name) === normAlias(newLeader.name));
    if (!prevRowOfNew) continue;
    if (prevRowOfNew.pos === 1) continue;
    const involved = (m, teamName) => {
      if (!m || !m.competition || m.competition.code !== code) return false;
      if (!isMatchFinished(m) || !isWithinPostMatchWindow(m, env)) return false;
      return normAlias(m.homeTeam.name) === normAlias(teamName) || normAlias(m.awayTeam.name) === normAlias(teamName);
    };
    const trigger = matches.find((m) => involved(m, newLeader.name)) || matches.find((m) => involved(m, oldLeader.name));
    if (!trigger) continue;
    // v12.x-bilingual-bot: render + send per-lang so each user gets the
    // coronation in their own lang. Falls back to "fa" if no prefs entry.
    const prefs = typeof getUserPrefs === "function" ? await getUserPrefs(env) : {};
    const langBuckets = new Map();
    for (const c of chatIds) {
      const p = prefs[String(c)] || {};
      const lng = p.lang === "en" ? "en" : "fa";
      if (!langBuckets.has(lng)) langBuckets.set(lng, []);
      langBuckets.get(lng).push(c);
    }
    let ok = 0;
    for (const [lng, bucket] of langBuckets) {
      const text = await formatTableTopMessage(env, code, newLeader, prevRowOfNew, trigger, lng);
      if (!text) continue;
      for (const chatId of bucket) {
        const r = await sendTelegram(env, text, chatId);
        if (r === true) ok++;
        else if (r !== "dead") out.failed++;
      }
    }
    out.sent += ok;
    out.events.push({ code, leader: newLeader.name, prevPos: prevRowOfNew.pos, match: trigger.id || null, sent: ok });
    console.log(`\u{1F451} Table-top alert [${code}]: ${translateTeam(newLeader.name)} (prev #${prevRowOfNew.pos}) overtakes ${translateTeam(oldLeader.name)} \u2014 sent to ${ok}/${chatIds.length}`);
  }
  return out;
}
__name(maybeNotifyTableToppers, "maybeNotifyTableToppers");
__name2(maybeNotifyTableToppers, "maybeNotifyTableToppers");
async function formatTableTopMessage(env, code, newLeader, prevRow, trigger, lang) {
  try {
    const en = lang === "en";
    const league = en ? (COMP_EN[code] || code) : translateCompetition(code);
    const home = en ? trigger.homeTeam.name : translateTeam(trigger.homeTeam.name);
    const away = en ? trigger.awayTeam.name : translateTeam(trigger.awayTeam.name);
    const leaderName = en ? newLeader.name : translateTeam(newLeader.name);
    const esc = escapeMarkdownCharacters;
    const pts = newLeader.points == null ? 0 : newLeader.points;
    const ptsStr = en ? String(pts) : toFaDigits(String(pts));
    const prevPosStr = en ? String(prevRow.pos) : toFaDigits(String(prevRow.pos));
    const dateStr = en ? getEnglishDate(trigger.utcDate, env) : getJalaliDate(trigger.utcDate, env);
    const vs = en ? " vs " : " \u{1F19A} ";
    const head = en ? `*New leader: ${esc(league)}*\n\n` : `*\u0635\u062F\u0631 \u062C\u062F\u0648\u0644 ${esc(league)} \u062A\u063A\u06CC\u06CC\u0631 \u06A9\u0631\u062F*\n\n`;
    let message = head;
    const reachedLine = en
      ? `${esc(leaderName)} reached the top of ${esc(league)} with ${ptsStr} pts \u2014 previous position: ${prevPosStr}\n\n`
      : `${esc(leaderName)} \u0628\u0627 ${ptsStr} \u0627\u0645\u062A\u06CC\u0627\u0632 \u0628\u0647 \u0635\u062F\u0631 \u062C\u062F\u0648\u0644 ${esc(league)} \u0631\u0633\u06CC\u062F \u2014 \u0631\u062A\u0628\u0647 \u0642\u0628\u0644\u06CC: ${prevPosStr}\n\n`;
    message += reachedLine;
    message += `\u26BD *${esc(home)}${vs}${esc(away)}*\n`;
    message += `${esc(league)}\n`;
    message += `${esc(dateStr)}\n`;
    const h = trigger.score && trigger.score.fullTime && trigger.score.fullTime.home, a = trigger.score && trigger.score.fullTime && trigger.score.fullTime.away;
    if (h !== null && h !== void 0 && a !== null && a !== void 0) {
      const hStr = en ? String(h) : toFaDigits(String(h));
      const aStr = en ? String(a) : toFaDigits(String(a));
      message += `*${hStr}\\-${aStr}*`;
      if (h > a) {
        const won = en ? `${esc(home)} won` : `\n\u2705 ${esc(home)} \u0628\u0631\u0646\u062F\u0647 \u0634\u062F`;
        message += `\n${won}`;
      } else if (h < a) {
        const won = en ? `${esc(away)} won` : `\n\u2705 ${esc(away)} \u0628\u0631\u0646\u062F\u0647 \u0634\u062F`;
        message += `\n${won}`;
      } else {
        const draw = en ? "Draw" : "\u0645\u0633\u0627\u0648\u06CC";
        message += `\n${draw}`;
      }
    }
    const footer = en ? `\n\nFull table: football\\.sportsignal\\.ir` : `\n\n\u{1F4CA} \u062C\u062F\u0648\u0644 \u06A9\u0627\u0645\u0644: football\\.sportsignal\\.ir`;
    message += footer;
    return message;
  } catch (e) {
    console.error("Table-top message build failed: " + e.message);
    return null;
  }
}
__name(formatTableTopMessage, "formatTableTopMessage");
__name2(formatTableTopMessage, "formatTableTopMessage");
// =================== v12.33-xpost: X (Twitter) automated profile ===================
// Persian mirror of the Telegram composers (coronation > FT > kickoff > weekly
// tables) posted to the @SportSignal X account. OAuth 1.0a HMAC-SHA1 signing is
// implemented inline with crypto.subtle — NO external deps. Posts are gated by
// (a) X_ENABLED master switch (secret + KV override x_enabled_v1), (b) X_DRY_RUN
// log-only mode (secret + KV override x_dry_run_v1), (c) monthly budget cap 450
// + daily ~12 (KV counters), (d) KV dedupe x_post_v1:<type>:<key> (separate
// from Telegram dedupe so X and Telegram each fire exactly once), (e) phase
// config x_phase_v1 (coronation, ft, kickoff, tables, media — defaults to phase
// B: coronation,ft). 401 → admin log; 429 → KV pause 15min; 5xx → one retry. X
// runs AFTER the Telegram checks in executeScheduledLogic and is wrapped in
// try/catch so a failing post can never fail the sweep.
var X_CONFIG = {
  KV_PHASE: "x_phase_v1",
  // comma-separated: coronation,ft,kickoff,tables,media
  KV_BUDGET_PREFIX: "x_budget_v1:",
  // + yyyymm — monthly automated posts counter
  KV_DAILY_PREFIX: "x_daily_v1:",
  // + yyyymmdd — daily automated posts counter
  KV_TEST_PREFIX: "x_test_v1:",
  // + yyyymmdd — admin test-post counter
  KV_DEDUPE_PREFIX: "x_post_v1:",
  // + <type>:<key> — exactly-once per event
  KV_LAST_POST: "x_last_post_v1",
  // JSON {ts, text, id, kind}
  KV_LAST_ERROR: "x_last_error_v1",
  // JSON {ts, status, error}
  KV_PAUSE: "x_pause_v1",
  // RFC-3339 timestamp until which X is paused (429 backoff)
  KV_DRY_RUN: "x_dry_run_v1",
  // "1" overrides secret X_DRY_RUN=0; "0" overrides secret X_DRY_RUN=1
  KV_ENABLED: "x_enabled_v1",
  // same override pattern for X_ENABLED
  MONTHLY_CAP: 450,
  // safety margin under X free-tier 500/month
  DAILY_CAP: 12,
  TEST_DAILY_CAP: 5,
  DEDUPE_TTL_SEC: 7 * 86400,
  // 7 days
  DAILY_TTL_SEC: 36 * 3600,
  PAUSE_TTL_SEC: 900,
  // 15 minutes (429 backoff)
  RETRY_5XX: 1,
  POST_CHAR_LIMIT: 280,
  DEFAULT_PHASE: "coronation,ft",
  // phase B by default once live (X_DRY_RUN=0)
  API_BASE: "https://api.x.com",
  TWEET_PATH: "/2/tweets"
};
__name(X_CONFIG, "X_CONFIG");
function xPercentEncode(s) {
  return encodeURIComponent(String(s)).replace(/[!'()*]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());
}
__name(xPercentEncode, "xPercentEncode");
__name2(xPercentEncode, "xPercentEncode");
async function xHmacSha1Base64(keyStr, baseStr) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(keyStr),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(baseStr));
  const bytes = new Uint8Array(sig);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}
__name(xHmacSha1Base64, "xHmacSha1Base64");
__name2(xHmacSha1Base64, "xHmacSha1Base64");
function xRandomNonce() {
  const buf = new Uint8Array(32);
  crypto.getRandomValues(buf);
  let hex = "";
  for (let i = 0; i < buf.length; i++) hex += buf[i].toString(16).padStart(2, "0");
  return hex;
}
__name(xRandomNonce, "xRandomNonce");
__name2(xRandomNonce, "xRandomNonce");
// Build the OAuth 1.0a base string for tests + signing. `opts` allows the
// RFC 5849 test vector to pin nonce/timestamp + supply extra (non-oauth)
// query/form params; production passes {}.
async function xBuildBaseString(method, url, allParams) {
  const sortedKeys = Object.keys(allParams).sort();
  const paramString = sortedKeys.map((k) => xPercentEncode(k) + "=" + xPercentEncode(allParams[k])).join("&");
  return method.toUpperCase() + "&" + xPercentEncode(url) + "&" + xPercentEncode(paramString);
}
__name(xBuildBaseString, "xBuildBaseString");
__name2(xBuildBaseString, "xBuildBaseString");
// Build the OAuth 1.0a Authorization header. env carries the 4 keys; opts
// may pin nonce/timestamp + carry extraParams for tests.
async function xBuildAuthHeader(method, url, env, opts) {
  opts = opts || {};
  const consumerKey = env.X_API_KEY;
  const consumerSecret = env.X_API_SECRET || "";
  const token = env.X_ACCESS_TOKEN;
  const tokenSecret = env.X_ACCESS_TOKEN_SECRET || "";
  const oauthParams = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: opts.nonce || xRandomNonce(),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: String(opts.timestamp != null ? opts.timestamp : Math.floor(Date.now() / 1e3)),
    oauth_token: token,
    oauth_version: "1.0"
  };
  const allParams = Object.assign({}, oauthParams, opts.extraParams || {});
  const baseString = await xBuildBaseString(method, url, allParams);
  const signingKey = xPercentEncode(consumerSecret) + "&" + xPercentEncode(tokenSecret);
  const signature = await xHmacSha1Base64(signingKey, baseString);
  oauthParams.oauth_signature = signature;
  return "OAuth " + Object.keys(oauthParams).map((k) => xPercentEncode(k) + '="' + xPercentEncode(oauthParams[k]) + '"').join(", ");
}
__name(xBuildAuthHeader, "xBuildAuthHeader");
__name2(xBuildAuthHeader, "xBuildAuthHeader");
async function xIsEnabled(env) {
  const kvVal = await env.STATE.get(X_CONFIG.KV_ENABLED).catch(() => null);
  if (kvVal === "1") return true;
  if (kvVal === "0") return false;
  return env.X_ENABLED === "1" || env.X_ENABLED === "true";
}
__name(xIsEnabled, "xIsEnabled");
__name2(xIsEnabled, "xIsEnabled");
async function xIsDryRun(env) {
  const kvVal = await env.STATE.get(X_CONFIG.KV_DRY_RUN).catch(() => null);
  if (kvVal === "1") return true;
  if (kvVal === "0") return false;
  return env.X_DRY_RUN === "1" || env.X_DRY_RUN === "true";
}
__name(xIsDryRun, "xIsDryRun");
__name2(xIsDryRun, "xIsDryRun");
async function xGetPhase(env) {
  const v = await env.STATE.get(X_CONFIG.KV_PHASE).catch(() => null);
  if (v && typeof v === "string" && v.trim()) {
    return v.split(",").map((s) => s.trim()).filter(Boolean);
  }
  return X_CONFIG.DEFAULT_PHASE.split(",").map((s) => s.trim()).filter(Boolean);
}
__name(xGetPhase, "xGetPhase");
__name2(xGetPhase, "xGetPhase");
function xHasPhase(phase, list) {
  return Array.isArray(list) && list.indexOf(phase) !== -1;
}
__name(xHasPhase, "xHasPhase");
__name2(xHasPhase, "xHasPhase");
function xMonthKey() {
  const d = /* @__PURE__ */ new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}${m}`;
}
__name(xMonthKey, "xMonthKey");
__name2(xMonthKey, "xMonthKey");
function xDayKey() {
  const d = /* @__PURE__ */ new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}
__name(xDayKey, "xDayKey");
__name2(xDayKey, "xDayKey");
async function xBudgetCheck(env) {
  const mk = X_CONFIG.KV_BUDGET_PREFIX + xMonthKey();
  const dk = X_CONFIG.KV_DAILY_PREFIX + xDayKey();
  const monthly = parseInt(await env.STATE.get(mk).catch(() => null)) || 0;
  const daily = parseInt(await env.STATE.get(dk).catch(() => null)) || 0;
  if (monthly >= X_CONFIG.MONTHLY_CAP) return { ok: false, reason: "monthly-cap", monthlyUsed: monthly, dailyUsed: daily };
  if (daily >= X_CONFIG.DAILY_CAP) return { ok: false, reason: "daily-cap", monthlyUsed: monthly, dailyUsed: daily };
  return { ok: true, monthlyUsed: monthly, dailyUsed: daily };
}
__name(xBudgetCheck, "xBudgetCheck");
__name2(xBudgetCheck, "xBudgetCheck");
async function xBudgetIncr(env) {
  const mk = X_CONFIG.KV_BUDGET_PREFIX + xMonthKey();
  const dk = X_CONFIG.KV_DAILY_PREFIX + xDayKey();
  const monthly = (parseInt(await env.STATE.get(mk).catch(() => null)) || 0) + 1;
  const daily = (parseInt(await env.STATE.get(dk).catch(() => null)) || 0) + 1;
  await env.STATE.put(mk, String(monthly), { expirationTtl: 35 * 86400 }).catch(() => {
  });
  await env.STATE.put(dk, String(daily), { expirationTtl: X_CONFIG.DAILY_TTL_SEC }).catch(() => {
  });
  return { monthly, daily };
}
__name(xBudgetIncr, "xBudgetIncr");
__name2(xBudgetIncr, "xBudgetIncr");
async function xPauseUntil(env, seconds) {
  const until = new Date(Date.now() + seconds * 1e3).toISOString();
  await env.STATE.put(X_CONFIG.KV_PAUSE, until, { expirationTtl: Math.max(seconds, 60) }).catch(() => {
  });
}
__name(xPauseUntil, "xPauseUntil");
__name2(xPauseUntil, "xPauseUntil");
async function xIsPaused(env) {
  const until = await env.STATE.get(X_CONFIG.KV_PAUSE).catch(() => null);
  if (!until) return false;
  const t = new Date(until).getTime();
  return t > Date.now();
}
__name(xIsPaused, "xIsPaused");
__name2(xIsPaused, "xIsPaused");
async function xSetLastPost(env, info) {
  await env.STATE.put(X_CONFIG.KV_LAST_POST, JSON.stringify(Object.assign({ ts: Date.now() }, info))).catch(() => {
  });
}
__name(xSetLastPost, "xSetLastPost");
__name2(xSetLastPost, "xSetLastPost");
async function xSetLastError(env, status, error) {
  await env.STATE.put(X_CONFIG.KV_LAST_ERROR, JSON.stringify({ ts: Date.now(), status, error: String(error || "").slice(0, 280) })).catch(() => {
  });
}
__name(xSetLastError, "xSetLastError");
__name2(xSetLastError, "xSetLastError");
async function xDedupeCheck(env, key) {
  const k = X_CONFIG.KV_DEDUPE_PREFIX + key;
  const v = await env.STATE.get(k).catch(() => null);
  return !v;
}
__name(xDedupeCheck, "xDedupeCheck");
__name2(xDedupeCheck, "xDedupeCheck");
async function xDedupeMark(env, key) {
  const k = X_CONFIG.KV_DEDUPE_PREFIX + key;
  await env.STATE.put(k, String(Date.now()), { expirationTtl: X_CONFIG.DEDUPE_TTL_SEC }).catch(() => {
  });
}
__name(xDedupeMark, "xDedupeMark");
__name2(xDedupeMark, "xDedupeMark");
// POST /2/tweets. Returns {ok, id, status, error}. Handles 401/403/429/5xx
// per spec. 401/403 → log admin alert + refuse; 429 → KV pause 15min; 5xx → 1
// retry; every outcome written to x_last_error_v1.
async function xPostTweet(env, text, inReplyTo) {
  const url = X_CONFIG.API_BASE + X_CONFIG.TWEET_PATH;
  const bodyObj = inReplyTo ? { text, reply: { in_reply_to_tweet_id: String(inReplyTo) } } : { text };
  const body = JSON.stringify(bodyObj);
  let attempt = 0;
  while (attempt <= X_CONFIG.RETRY_5XX) {
    attempt++;
    let auth, res;
    try {
      auth = await xBuildAuthHeader("POST", url, env, {});
      res = await fetch(url, {
        method: "POST",
        headers: { Authorization: auth, "Content-Type": "application/json" },
        body
      });
    } catch (e) {
      if (attempt > X_CONFIG.RETRY_5XX) {
        await xSetLastError(env, 0, "network:" + e.message);
        return { ok: false, status: 0, error: "network:" + e.message };
      }
      continue;
    }
    if (res.ok) {
      let data = null;
      try {
        data = await res.json();
      } catch (e) {
      }
      const id = data && data.data && data.data.id ? String(data.data.id) : null;
      return { ok: true, status: 201, id };
    }
    const status = res.status;
    const errText = await res.text().catch(() => "");
    if (status === 401) {
      await xSetLastError(env, 401, "unauthorized — bad X OAuth keys: " + errText.slice(0, 200));
      return { ok: false, status: 401, error: "unauthorized" };
    }
    if (status === 403) {
      await xSetLastError(env, 403, "forbidden — check app permissions: " + errText.slice(0, 200));
      return { ok: false, status: 403, error: "forbidden" };
    }
    if (status === 429) {
      const retryAfter = parseInt(res.headers.get("retry-after") || "900") || 900;
      await xPauseUntil(env, Math.min(retryAfter, X_CONFIG.PAUSE_TTL_SEC * 4));
      await xSetLastError(env, 429, "rate-limited — paused for " + retryAfter + "s");
      return { ok: false, status: 429, error: "rate-limited" };
    }
    if (status >= 500 && attempt <= X_CONFIG.RETRY_5XX) {
      await xSetLastError(env, status, "5xx retry: " + errText.slice(0, 200));
      continue;
    }
    await xSetLastError(env, status, "x-error: " + errText.slice(0, 200));
    return { ok: false, status, error: "http-" + status };
  }
  return { ok: false, status: 0, error: "retry-exhausted" };
}
__name(xPostTweet, "xPostTweet");
__name2(xPostTweet, "xPostTweet");
// Composed Persian posts — mirror the Telegram composers but stripped of
// MarkdownV2 escapes (X has no markdown), ≤280 chars, with `#فوتبال` + a
// league tag, ending with `football.sportsignal.ir`.
function xLeagueTag(code) {
  const tags = {
    PL: "\u0644\u06CC\u06AF_\u0628\u0631\u062A\u0631_\u0627\u0646\u06AF\u0644\u06CC\u0633",
    PD: "\u0644\u0627\u0644\u06CC\u06AF\u0627",
    SA: "\u0633\u0631\u06CC_\u0622",
    FL1: "\u0644\u06CC\u06AF_\u06F1_\u0641\u0631\u0627\u0646\u0633\u0647",
    BL1: "\u0628\u0648\u0646\u062F\u0633\u0644\u06CC\u06AF\u0627",
    CL: "\u0644\u06CC\u06AF_\u0642\u0647\u0631\u0645\u0627\u0646\u0627\u0646_\u0627\u0631\u0648\u067E\u0627",
    EL: "\u0644\u06CC\u06AF_\u0627\u0631\u0648\u067E\u0627",
    ECL: "\u0644\u06CC\u06AF_\u06A9\u0646\u0641\u0631\u0627\u0646\u0633",
    FA_CUP: "\u062C\u0627\u0645_\u062D\u0630\u0641\u06CC_\u0627\u0646\u06AF\u0644\u06CC\u0633",
    EFL_CUP: "\u062C\u0627\u0645_\u0627\u06CC_\u0627\u0641_\u0627\u0644",
    CDR: "\u06A9\u0648\u067E\u0627_\u062F\u0644_\u0631\u06CC",
    COPPA_ITALIA: "\u06A9\u0648\u067E\u0627_\u0627\u06CC\u062A\u0627\u0644\u06CC\u0627"
  };
  return tags[code] ? "#" + tags[code] : "";
}
__name(xLeagueTag, "xLeagueTag");
__name2(xLeagueTag, "xLeagueTag");
function xUrl() {
  return "football.sportsignal.ir";
}
__name(xUrl, "xUrl");
__name2(xUrl, "xUrl");
function xTruncate(s, max) {
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + "\u2026";
}
__name(xTruncate, "xTruncate");
__name2(xTruncate, "xTruncate");
function composeXCoronation(env, code, newLeader, prevRow, trigger) {
  const league = translateCompetition(code);
  const team = translateTeam(newLeader.name);
  const home = trigger && trigger.homeTeam ? translateTeam(trigger.homeTeam.name) : "";
  const away = trigger && trigger.awayTeam ? translateTeam(trigger.awayTeam.name) : "";
  const date = trigger && trigger.utcDate ? getJalaliDate(trigger.utcDate, env) : "";
  const pts = newLeader.points == null ? 0 : newLeader.points;
  const prevPos = prevRow && prevRow.pos != null ? prevRow.pos : 2;
  const tag = xLeagueTag(code);
  let score = "";
  const h = trigger && trigger.score && trigger.score.fullTime && trigger.score.fullTime.home;
  const a = trigger && trigger.score && trigger.score.fullTime && trigger.score.fullTime.away;
  if (h != null && a != null) score = " | " + toFaDigits(String(h)) + "-" + toFaDigits(String(a));
  let text = `\u{1F451} \u0635\u062F\u0631 \u062C\u062F\u0648\u0644 ${league} \u0639\u0648\u0636 \u0634\u062F
${team} \u0628\u0627 ${toFaDigits(String(pts))} \u0627\u0645\u062A\u06CC\u0627\u0632 \u0628\u0647 \u0635\u062F\u0631 \u0631\u0633\u06CC\u062F (\u0631\u062A\u0628\u0647 \u0642\u0628\u0644\u06CC: ${toFaDigits(String(prevPos))})
\u26BD ${home} \u2694\uFE0F ${away}${score}
\u{1F3C6} ${league}${date ? " | " + date : ""}
${xUrl()} #\u0641\u0648\u062A\u0628\u0627\u0644${tag ? " " + tag : ""}`;
  return xTruncate(text, X_CONFIG.POST_CHAR_LIMIT);
}
__name(composeXCoronation, "composeXCoronation");
__name2(composeXCoronation, "composeXCoronation");
function composeXResult(env, match) {
  const home = translateTeam(match.homeTeam.name);
  const away = translateTeam(match.awayTeam.name);
  const league = translateCompetition(match.competition.code);
  const date = getJalaliDate(match.utcDate, env);
  const tag = xLeagueTag(match.competition.code);
  const h = match.score && match.score.fullTime && match.score.fullTime.home;
  const a = match.score && match.score.fullTime && match.score.fullTime.away;
  let verdict = "";
  if (h != null && a != null) {
    if (h > a) verdict = "\n\u2705 " + home + " \u0628\u0631\u0646\u062F\u0647 \u0634\u062F";
    else if (h < a) verdict = "\n\u2705 " + away + " \u0628\u0631\u0646\u062F\u0647 \u0634\u062F";
    else verdict = "\n\u{1F91D} \u0645\u0633\u0627\u0648\u06CC";
  }
  const score = h != null && a != null ? toFaDigits(String(h)) + "-" + toFaDigits(String(a)) : "?";
  let text = `\u{1F3C1} \u0646\u062A\u06CC\u062C\u0647 \u0646\u0647\u0627\u06CC\u06CC
\u26BD ${home} \u2694\uFE0F ${away}
\u{1F4CA} ${score}${verdict}
\u{1F3C6} ${league} | ${date}
${xUrl()} #\u0641\u0648\u062A\u0628\u0627\u0644${tag ? " " + tag : ""}`;
  return xTruncate(text, X_CONFIG.POST_CHAR_LIMIT);
}
__name(composeXResult, "composeXResult");
__name2(composeXResult, "composeXResult");
function composeXKickoff(env, match) {
  const home = translateTeam(match.homeTeam.name);
  const away = translateTeam(match.awayTeam.name);
  const league = translateCompetition(match.competition.code);
  const time = getJalaliTime(match.utcDate, env);
  const date = getJalaliDate(match.utcDate, env);
  const tag = xLeagueTag(match.competition.code);
  let text = `\u26BD \u0628\u0627\u0632\u06CC \u0628\u0632\u0631\u06AF
${home} \u2694\uFE0F ${away}
\u{1F3C6} ${league}
\u{1F5D0} ${date} | ${time}
${xUrl()} #\u0641\u0648\u062A\u0628\u0627\u0644${tag ? " " + tag : ""}`;
  return xTruncate(text, X_CONFIG.POST_CHAR_LIMIT);
}
__name(composeXKickoff, "composeXKickoff");
__name2(composeXKickoff, "composeXKickoff");
function composeXTableForLeague(env, code, st) {
  const league = translateCompetition(code);
  const teams = (st.teams || []).slice().sort((a, b) => (a.pos || 0) - (b.pos || 0) || (b.points || 0) - (a.points || 0));
  const shown = code === "CL" ? teams.slice(0, 8) : teams.slice(0, 5);
  const tag = xLeagueTag(code);
  const rows = shown.map((t, i) => `${toFaDigits(String(i + 1))}. ${translateTeam(t.name)} \u2014 ${toFaDigits(String(t.points == null ? 0 : t.points))} \u0627\u0645\u062A\u06CC\u0627\u0632`);
  let head = `\u{1F4CA} \u062C\u062F\u0648\u0644 ${league}`;
  if (st.matchday) head += " (\u0647\u0641\u062A\u0647 " + toFaDigits(String(st.matchday)) + ")";
  let text = head + "\n" + rows.join("\n") + "\n" + xUrl() + " #\u0641\u0648\u062A\u0628\u0627\u0644" + (tag ? " " + tag : "");
  return xTruncate(text, X_CONFIG.POST_CHAR_LIMIT);
}
__name(composeXTableForLeague, "composeXTableForLeague");
__name2(composeXTableForLeague, "composeXTableForLeague");
// Central post-or-dry-run. Bumps the budget + dedupe marker ONLY on a real
// success; dry-run still records lastPost for the admin card but does NOT
// consume budget or dedupe (so the next live sweep will still fire).
async function xSendOrDryRun(env, text, inReplyTo, kind, dedupeKey) {
  const dry = await xIsDryRun(env);
  if (dry) {
    console.log(`\u{1F426} X DRY-RUN [${kind}]${inReplyTo ? " reply\u2192" + inReplyTo : ""}: ${text}`);
    await xSetLastPost(env, { text, kind: kind + ":dry-run", id: null });
    return { ok: true, dryRun: true, id: null };
  }
  const r = await xPostTweet(env, text, inReplyTo);
  if (r.ok) {
    await xBudgetIncr(env);
    await xSetLastPost(env, { text, kind, id: r.id });
    if (dedupeKey) await xDedupeMark(env, dedupeKey);
    console.log(`\u{1F426} X posted [${kind}] id=${r.id}: ${text}`);
    return r;
  }
  console.log(`\u{1F426} X post FAILED [${kind}] status=${r.status} err=${r.error}`);
  return r;
}
__name(xSendOrDryRun, "xSendOrDryRun");
__name2(xSendOrDryRun, "xSendOrDryRun");
// Orchestrator. Called from executeScheduledLogic AFTER the Telegram checks.
// opts.topperEvents = the events list returned by maybeNotifyTableToppers.
async function maybePostX(env, matches, opts) {
  opts = opts || {};
  const out = { sent: 0, dryRun: 0, skipped: 0, errors: [] };
  if (!(await xIsEnabled(env))) {
    console.log("\u{1F426} X disabled \u2014 skipping");
    return out;
  }
  if (await xIsPaused(env)) {
    console.log("\u{1F426} X paused (429 backoff) \u2014 skipping");
    return out;
  }
  const phase = await xGetPhase(env);
  const dry = await xIsDryRun(env);
  const budget = await xBudgetCheck(env);
  if (!budget.ok) {
    console.log(`\u{1F426} X budget hit (${budget.reason}) \u2014 skipping; monthly=${budget.monthlyUsed} daily=${budget.dailyUsed}`);
    if (!dry) await xSetLastError(env, 0, "budget-cap:" + budget.reason + " monthly=" + budget.monthlyUsed + " daily=" + budget.dailyUsed);
    return out;
  }
  console.log(`\u{1F426} X sweep start: phase=[${phase.join(",")}] dryRun=${dry ? 1 : 0} monthly=${budget.monthlyUsed}/${X_CONFIG.MONTHLY_CAP} daily=${budget.dailyUsed}/${X_CONFIG.DAILY_CAP}`);
  const matchKey = (m) => String(m.id || (m.homeTeam && m.homeTeam.name) + "|" + (m.awayTeam && m.awayTeam.name) + "|" + m.utcDate);
  if (xHasPhase("coronation", phase) && Array.isArray(opts.topperEvents) && opts.topperEvents.length) {
    for (const ev of opts.topperEvents) {
      const dedupeKey = "coronation:" + ev.code;
      if (!(await xDedupeCheck(env, dedupeKey))) {
        out.skipped++;
        continue;
      }
      let st = null;
      try {
        st = await fetchStandings(env, ev.code, false);
      } catch (e) {
        st = null;
      }
      if (!st || !Array.isArray(st.teams) || !st.teams.length) {
        out.skipped++;
        continue;
      }
      const sorted = st.teams.slice().sort((a, b) => (a.pos || 999) - (b.pos || 999));
      const newLeader = sorted[0];
      if (!newLeader) continue;
      const trigger = (matches || []).find((m) => m && ev.match != null && m.id === ev.match) || null;
      const fallbackTrigger = trigger || {
        homeTeam: { name: ev.leader || "" },
        awayTeam: { name: "" },
        competition: { code: ev.code },
        utcDate: (/* @__PURE__ */ new Date()).toISOString(),
        score: { fullTime: { home: null, away: null } }
      };
      const prevRow = { name: newLeader.name, pos: ev.prevPos != null ? ev.prevPos : 2, points: null };
      const text = composeXCoronation(env, ev.code, newLeader, prevRow, fallbackTrigger);
      const b2 = await xBudgetCheck(env);
      if (!b2.ok) {
        out.skipped++;
        break;
      }
      const r = await xSendOrDryRun(env, text, null, "coronation:" + ev.code, dedupeKey);
      if (r.ok) {
        out.sent++;
        if (r.dryRun) out.dryRun++;
      } else {
        out.errors.push({ kind: "coronation", status: r.status, error: r.error });
      }
      break;
    }
  }
  if (xHasPhase("ft", phase) && Array.isArray(matches) && matches.length) {
    const ftMatches = matches.filter((m) => isMatchFinished(m) && isWithinPostMatchWindow(m, env) && isMasterBigMatch(m));
    ftMatches.sort((a, b) => getCompetitionPriority(a.competition.code) - getCompetitionPriority(b.competition.code) || new Date(b.utcDate).getTime() - new Date(a.utcDate).getTime());
    let ftPosted = 0;
    for (const m of ftMatches) {
      const dedupeKey = "ft:" + matchKey(m);
      if (!(await xDedupeCheck(env, dedupeKey))) {
        out.skipped++;
        continue;
      }
      const b = await xBudgetCheck(env);
      if (!b.ok) {
        out.skipped++;
        break;
      }
      const text = composeXResult(env, m);
      const r = await xSendOrDryRun(env, text, null, "ft:" + matchKey(m), dedupeKey);
      if (r.ok) {
        out.sent++;
        if (r.dryRun) out.dryRun++;
        ftPosted++;
      } else {
        out.errors.push({ kind: "ft", status: r.status, error: r.error });
        break;
      }
      if (ftPosted >= 3) break;
    }
  }
  if (xHasPhase("kickoff", phase) && Array.isArray(matches) && matches.length) {
    const koMatches = matches.filter((m) => isMatchStartingNow(m, env) && isMasterBigMatch(m));
    let koPosted = 0;
    for (const m of koMatches) {
      const dedupeKey = "kickoff:" + matchKey(m);
      if (!(await xDedupeCheck(env, dedupeKey))) {
        out.skipped++;
        continue;
      }
      const ftKey = "ft:" + matchKey(m);
      if (!(await xDedupeCheck(env, ftKey))) {
        out.skipped++;
        continue;
      }
      const b = await xBudgetCheck(env);
      if (!b.ok) {
        out.skipped++;
        break;
      }
      const text = composeXKickoff(env, m);
      const r = await xSendOrDryRun(env, text, null, "kickoff:" + matchKey(m), dedupeKey);
      if (r.ok) {
        out.sent++;
        if (r.dryRun) out.dryRun++;
        koPosted++;
      } else {
        out.errors.push({ kind: "kickoff", status: r.status, error: r.error });
        break;
      }
      if (koPosted >= 2) break;
    }
  }
  if (xHasPhase("tables", phase)) {
    try {
      const r = await maybePostXWeekly(env);
      out.sent += r.sent;
      out.dryRun += r.dryRun;
      out.skipped += r.skipped;
      if (r.error) out.errors.push({ kind: "tables", error: r.error });
    } catch (e) {
      out.errors.push({ kind: "tables", error: e.message });
    }
  }
  console.log(`\u{1F426} X sweep done: sent=${out.sent} dryRun=${out.dryRun} skipped=${out.skipped} errors=${out.errors.length}`);
  return out;
}
__name(maybePostX, "maybePostX");
__name2(maybePostX, "maybePostX");
async function maybePostXWeekly(env) {
  const out = { sent: 0, dryRun: 0, skipped: 0, error: null };
  const t = getNowTehran(env);
  if (t.getUTCDay() !== CONFIG.WEEKLY_TABLES.day) return out;
  const mins = t.getUTCHours() * 60 + t.getUTCMinutes();
  if (mins < CONFIG.WEEKLY_TABLES.fromMin || mins >= CONFIG.WEEKLY_TABLES.toMin) return out;
  const week = isoWeekKey(t);
  const dedupeKey = "weekly:" + week;
  if (!(await xDedupeCheck(env, dedupeKey))) {
    out.skipped++;
    return out;
  }
  const codes = weeklyTableCodes();
  const texts = [];
  for (const code of codes) {
    let st = null;
    try {
      st = await fetchStandings(env, code, true);
    } catch (e) {
      st = null;
    }
    if (!st || !Array.isArray(st.teams) || !st.teams.length) continue;
    if (st.started === false) continue;
    texts.push({ code, text: composeXTableForLeague(env, code, st) });
  }
  if (!texts.length) {
    out.error = "no-tables";
    return out;
  }
  const root = texts[0];
  const r0 = await xSendOrDryRun(env, root.text, null, "tables:" + root.code + ":root", null);
  if (!r0.ok) {
    out.error = r0.error || "root-failed";
    return out;
  }
  out.sent++;
  if (r0.dryRun) out.dryRun++;
  let rootId = r0.id;
  for (let i = 1; i < texts.length; i++) {
    const b = await xBudgetCheck(env);
    if (!b.ok) {
      out.skipped += texts.length - i;
      break;
    }
    const r = await xSendOrDryRun(env, texts[i].text, rootId, "tables:" + texts[i].code, null);
    if (r.ok) {
      out.sent++;
      if (r.dryRun) out.dryRun++;
      if (r.id) rootId = r.id;
    } else {
      out.error = r.error || "reply-failed";
      break;
    }
  }
  await xDedupeMark(env, dedupeKey);
  return out;
}
__name(maybePostXWeekly, "maybePostXWeekly");
__name2(maybePostXWeekly, "maybePostXWeekly");
async function getXStatus(env) {
  const enabled = await xIsEnabled(env);
  const dryRun = await xIsDryRun(env);
  const paused = await xIsPaused(env);
  const phase = await xGetPhase(env);
  const mk = X_CONFIG.KV_BUDGET_PREFIX + xMonthKey();
  const dk = X_CONFIG.KV_DAILY_PREFIX + xDayKey();
  const monthly = parseInt(await env.STATE.get(mk).catch(() => null)) || 0;
  const daily = parseInt(await env.STATE.get(dk).catch(() => null)) || 0;
  const lastPost = await env.STATE.get(X_CONFIG.KV_LAST_POST, "json").catch(() => null);
  const lastError = await env.STATE.get(X_CONFIG.KV_LAST_ERROR, "json").catch(() => null);
  return {
    enabled,
    dryRun,
    paused,
    phase,
    monthlyCap: X_CONFIG.MONTHLY_CAP,
    dailyCap: X_CONFIG.DAILY_CAP,
    monthlyUsed: monthly,
    dailyUsed: daily,
    lastPost: lastPost || null,
    lastError: lastError || null
  };
}
__name(getXStatus, "getXStatus");
__name2(getXStatus, "getXStatus");
async function xTestPost(env) {
  if (!(await xIsEnabled(env))) return { ok: false, error: "X is disabled (X_ENABLED=0 or x_enabled_v1=0)" };
  const dk = X_CONFIG.KV_TEST_PREFIX + xDayKey();
  const testCount = parseInt(await env.STATE.get(dk).catch(() => null)) || 0;
  if (testCount >= X_CONFIG.TEST_DAILY_CAP) return { ok: false, error: "test daily cap reached (" + X_CONFIG.TEST_DAILY_CAP + ")" };
  const text = `\u{1F9EA} \u067E\u0633\u062A \u062A\u0633\u062A SportSignal \u2014 \u0641\u0648\u062A\u0628\u0627\u0644 \u0627\u0631\u0648\u067E\u0627 \u0631\u0627 \u062F\u0646\u0628\u0627\u0644 \u06A9\u0646\u06CC\u062F
${xUrl()} #\u0641\u0648\u062A\u0628\u0627\u0644`;
  const dry = await xIsDryRun(env);
  if (dry) {
    console.log(`\u{1F426} X TEST DRY-RUN: ${text}`);
    await xSetLastPost(env, { text, kind: "test:dry-run", id: null });
    await env.STATE.put(dk, String(testCount + 1), { expirationTtl: X_CONFIG.DAILY_TTL_SEC }).catch(() => {
    });
    return { ok: true, dryRun: true, text };
  }
  const r = await xPostTweet(env, text, null);
  if (r.ok) {
    await env.STATE.put(dk, String(testCount + 1), { expirationTtl: X_CONFIG.DAILY_TTL_SEC }).catch(() => {
    });
    await xSetLastPost(env, { text, kind: "test", id: r.id });
    return { ok: true, id: r.id, text };
  }
  return { ok: false, status: r.status, error: r.error };
}
__name(xTestPost, "xTestPost");
__name2(xTestPost, "xTestPost");
var NOTIFICATION_CONFIGS = [
  {
    // Mode B (priority): only fires for users following BOTH teams
    type: "pre-match-72h",
    windowCheck: isWithinBigMatchWindow,
    messageFormatter: formatBigMatchMessage,
    requiresFuture: true,
    bigMatchOnly: true
  },
  {
    type: "pre-match-24h",
    windowCheck: isWithin24HourWindow,
    messageFormatter: format24HourMessage,
    requiresFuture: true
  },
  {
    type: "pre-match-3h",
    windowCheck: isWithin3HourWindow,
    messageFormatter: format3HourMessage,
    requiresFuture: true
  },
  {
    type: "pre-match-1h",
    windowCheck: isWithin1HourWindow,
    messageFormatter: format1HourMessage,
    requiresFuture: true
  },
  {
    // v12.x-cron-gaps: 5-minute "kickoff now" reminder. BIG matches only
    // (both teams in master team list). Lean text per the user's "reduce
    // noise" ask.
    type: "pre-match-5min",
    windowCheck: isWithin5MinWindow,
    messageFormatter: format5MinMessage,
    requiresFuture: true,
    bigMatchOnly: true
  },
  {
    type: "match-start",
    windowCheck: isMatchStartingNow,
    messageFormatter: formatMatchStartMessage,
    // ✅ FIX Bug #2: must be false — isMatchStartingNow allows up to 5 min AFTER
    // kick-off as a grace window. requiresFuture:true was short-circuiting the
    // entire notification the moment the clock ticked past the scheduled start time.
    requiresFuture: false
  },
  {
    type: "result",
    windowCheck: /* @__PURE__ */ __name2((match, env) => isWithinPostMatchWindow(match, env), "windowCheck"),
    messageFormatter: formatResultMessage,
    requiresFuture: false
  }
];
async function sendNotificationIfNeeded(match, config, chatGroups, env, nowTehran, counts, notifiedMatches, deadChats) {
  const matchTime = new Date(match.utcDate);
  const isFuture = matchTime > /* @__PURE__ */ new Date();
  const isFinished = isMatchFinished(match);
  if (config.requiresFuture && !isFuture) return;
  if (config.type === "result" && !isFinished) return;
  let late = false;
  if (!config.windowCheck(match, env)) {
    if (!isBackfillEligible(match, config.type, env)) return;
    late = true;
  }
  const shouldSend = await shouldSendNotification(env, match, config.type, notifiedMatches);
  if (!shouldSend) return;
  const originalTz = env.TEHRAN_TZ;
  let anySuccess = false;
  try {
    for (const g of chatGroups) {
      env.TEHRAN_TZ = g.tz;
      const lang = g.lang || "fa";
      let message = specialBanner(match, lang) + await config.messageFormatter(match, env, lang);
      if (late) message += "\n\n" + (lang === "en" ? "This reminder was sent late" : "\u0627\u06CC\u0646 \u06CC\u0627\u062F\u0622\u0648\u0631\u06CC \u0628\u0627 \u062A\u0623\u062E\u06CC\u0631 \u0627\u0631\u0633\u0627\u0644 \u0634\u062F");
      const sendResults = await Promise.allSettled(
        g.chats.map((chatId) => sendTelegram(env, message, chatId))
      );
      sendResults.forEach((r, i) => {
        if (r.status === "fulfilled" && r.value === "dead") deadChats.push(g.chats[i]);
      });
      if (sendResults.some((r) => r.status === "fulfilled" && r.value === true)) anySuccess = true;
    }
  } finally {
    env.TEHRAN_TZ = originalTz;
  }
  if (anySuccess) {
    await saveNotifiedMatch(env, match, config.type, notifiedMatches);
    counts[config.type]++;
    console.log(`\u{1F4E4} Sent ${config.type.toUpperCase()} notification for match ${match.id}`);
  }
}
__name(sendNotificationIfNeeded, "sendNotificationIfNeeded");
__name2(sendNotificationIfNeeded, "sendNotificationIfNeeded");
async function sendMatchNotifications(env, matches) {
  const chatIds = await getRegisteredChats(env);
  if (chatIds.length === 0) {
    console.log("\u274C No users to notify");
    return;
  }
  const prefs = await getUserPrefs(env);
  const notifyMatches = matches.filter(shouldNotify);
  if (notifyMatches.length === 0) {
    console.log("\u2705 No matches meet the notification criteria");
    return;
  }
  await cleanupExpiredNotifications(env);
  const notifiedMatches = await getNotifiedMatches(env);
  console.log(`\u{1F4E8} Found ${notifyMatches.length} matches to potentially notify`);
  notifyMatches.sort((a, b) => {
    const bigA = isMasterBigMatch(a) ? 1 : 0;
    const bigB = isMasterBigMatch(b) ? 1 : 0;
    if (bigA !== bigB) return bigB - bigA;
    const priorityDiff = getCompetitionPriority(a.competition.code) - getCompetitionPriority(b.competition.code);
    if (priorityDiff !== 0) return priorityDiff;
    return new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime();
  });
  const nowTehran = getNowTehran(env);
  console.log(`\u{1F552} Current Tehran time: ${nowTehran.toLocaleString("fa-IR")}`);
  const notificationCounts = {
    "pre-match-72h": 0,
    "pre-match-24h": 0,
    "pre-match-3h": 0,
    "pre-match-1h": 0,
    "match-start": 0,
    "result": 0
  };
  const deadChats = [];
  for (const match of notifyMatches) {
    const matchChats = chatIds.filter((c) => userFollowsMatch(prefs, c, match));
    if (!matchChats.length) continue;
    const chatGroups = groupChatsByTz(matchChats, prefs, env);
    const matchTime = new Date(match.utcDate);
    console.log(`
\u{1F3AF} Processing: ${translateTeam(match.homeTeam.name)} vs ${translateTeam(match.awayTeam.name)}`);
    console.log(`   Match time: ${matchTime.toLocaleString("fa-IR")}`);
    console.log(`   Status: ${match.status}`);
    for (const config of NOTIFICATION_CONFIGS) {
      if (config.bigMatchOnly) {
        const both = matchChats.filter((c) => isBigMatch(match, prefs, c));
        if (!both.length) continue;
        const bigGroups = groupChatsByTz(both, prefs, env);
        await sendNotificationIfNeeded(match, config, bigGroups, env, nowTehran, notificationCounts, notifiedMatches, deadChats);
        continue;
      }
      await sendNotificationIfNeeded(match, config, chatGroups, env, nowTehran, notificationCounts, notifiedMatches, deadChats);
    }
  }
  if (deadChats.length) {
    const keep = chatIds.filter((c) => !deadChats.includes(c));
    console.log(`\u{1F5D1}\uFE0F Pruning dead chats: ${deadChats.join(", ")}`);
    await env.STATE.put(CONFIG.KV_USERS_KEY, JSON.stringify(keep)).catch(() => {
    });
  }
  console.log(`
\u{1F4CA} Notification Summary:`);
  console.log(`   24-hour: ${notificationCounts["pre-match-24h"]}`);
  console.log(`   3-hour: ${notificationCounts["pre-match-3h"]}`);
  console.log(`   1-hour: ${notificationCounts["pre-match-1h"]}`);
  console.log(`   Match-start: ${notificationCounts["match-start"]}`);
  console.log(`   Results: ${notificationCounts["result"]}`);
  const totalSent = Object.values(notificationCounts).reduce((a, b) => a + b, 0);
  console.log(`   Total: ${totalSent}`);
}
__name(sendMatchNotifications, "sendMatchNotifications");
__name2(sendMatchNotifications, "sendMatchNotifications");
async function getRegisteredChats(env) {
  try {
    const chats = await env.STATE.get(CONFIG.KV_USERS_KEY);
    if (chats) {
      const parsed = JSON.parse(chats);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (error) {
    console.error("Invalid users KV data:", error.message);
  }
  const fallback = parseInt(env.CHAT_ID);
  return isNaN(fallback) ? [] : [fallback];
}
__name(getRegisteredChats, "getRegisteredChats");
__name2(getRegisteredChats, "getRegisteredChats");
async function getBotMembers(env) {
  const chats = await getRegisteredChats(env);
  const profiles = await env.STATE.get(CONFIG.KV_USER_PROFILES, "json").catch(() => null) || {};
  const members = chats.map((id) => {
    const p = profiles[String(id)] || {};
    return { id, username: p.username || null, first_name: p.first_name || null, title: p.title || null, joined: p.joined || null };
  });
  let backfilled = 0;
  const missing = members.filter((m) => !m.username && !m.first_name && !m.title);
  for (const m of missing) {
    if (backfilled >= 40) break;
    try {
      const res = await fetch("https://api.telegram.org/bot" + env.BOT_TOKEN + "/getChat?chat_id=" + encodeURIComponent(m.id));
      const d = await res.json();
      if (d && d.ok && d.result) {
        const c = d.result;
        m.username = c.username || null;
        m.first_name = c.first_name || null;
        m.title = c.title || null;
        profiles[String(m.id)] = { username: m.username, first_name: m.first_name, title: m.title, joined: m.joined || (/* @__PURE__ */ new Date()).toISOString() };
        backfilled++;
      }
    } catch (e) {
    }
  }
  if (backfilled > 0) {
    await env.STATE.put(CONFIG.KV_USER_PROFILES, JSON.stringify(profiles)).catch(() => {
    });
  }
  members.sort((a, b) => String(a.id).localeCompare(String(b.id)));
  return { count: members.length, backfilled, members };
}
__name(getBotMembers, "getBotMembers");
__name2(getBotMembers, "getBotMembers");
async function getUserPrefs(env) {
  try {
    return await env.STATE.get(CONFIG.KV_USER_PREFS, "json") || {};
  } catch (e) {
    return {};
  }
}
__name(getUserPrefs, "getUserPrefs");
__name2(getUserPrefs, "getUserPrefs");
// v12.x-bilingual-bot: get the user's language preference. Defaults to
// "fa" (Persian) since the existing user base is Persian. Reads from KV
// user_prefs[chatId].lang.
async function getUserLang(env, chatId) {
  try {
    const prefs = await env.STATE.get(CONFIG.KV_USER_PREFS, "json");
    const p = prefs && prefs[String(chatId)];
    if (p && (p.lang === "fa" || p.lang === "en")) return p.lang;
  } catch (e) {
  }
  return "fa";
}
__name(getUserLang, "getUserLang");
__name2(getUserLang, "getUserLang");
// v12.x-bilingual-bot: set the user's language preference. Writes to KV
// user_prefs[chatId].lang. Preserves the existing teams + tz fields.
async function setUserLang(env, chatId, lang) {
  const clean = lang === "en" ? "en" : "fa";
  try {
    const prefs = await getUserPrefs(env);
    const key = String(chatId);
    const cur = prefs[key] || {};
    prefs[key] = { teams: cur.teams || [], tz: cur.tz || null, lang: clean };
    await env.STATE.put(CONFIG.KV_USER_PREFS, JSON.stringify(prefs));
    return true;
  } catch (e) {
    console.error("setUserLang failed: " + e.message);
    return false;
  }
}
__name(setUserLang, "setUserLang");
__name2(setUserLang, "setUserLang");
// v12.x-bilingual-bot: bilingual bot command/notification strings.
// Keys are "<lang>_<key>" (e.g. "fa_start_welcome", "en_help_body"). Use
// botStr(lang, key) to fetch the right string for the user's lang.
// Persian text is stored as \uXXXX escapes (per the repo convention).
// MarkdownV2 specials (.!-) are pre-escaped as \. \! \- so the strings
// can be sent as MarkdownV2 without further processing.
var BOT_STRINGS = {
  "fa_start_welcome": "\u2705 \u0628\u0647 SportSignal \u062E\u0648\u0634 \u0622\u0645\u062F\u06CC\u062D\!\n\u0627\u0639\u0644\u0627\u0646 \u0645\u0633\u0627\u0628\u0642\u0627\u062A \u0645\u0647\u0645 \u0631\u0627 \u0627\u0632 \u062F\u0633\u062A \u0646\u062F\u0647\u06CC\u062F\.",
  "en_start_welcome": "Welcome to SportSignal\!\nNever miss the big matches\.",
  "fa_start_pick_lang": "\u26BD \u0628\u0647 SportSignal \u062E\u0648\u0634 \u0622\u0645\u062F\u06CC\u062D\n\u0628\u0631\u0627\u06CC \u0627\u0646\u062A\u062E\u0627\u0628 \u0632\u0628\u0627\u0646\u060C /lang \u0631\u0627 \u0628\u0641\u0631\u0633\u062A\u06CC\u062F\.",
  "en_start_pick_lang": "Welcome to SportSignal\nSend /lang to choose your language\.",
  "fa_lang_prompt": "\u0632\u0628\u0627\u0646 \u0631\u0628\u0627\u062A \u0631\u0627 \u0627\u0646\u062A\u062E\u0627\u0628 \u06A9\u0646\u06CC\u062F:",
  "en_lang_prompt": "Choose your language:",
  "fa_lang_set": "\u2705 \u0632\u0628\u0627\u0646 \u0631\u0628\u0627\u062A \u0641\u0627\u0631\u0633\u06CC \u0634\u062F\.",
  "en_lang_set": "Bot language set to English\.",
  "fa_help_body": "/start \u2014 \u0639\u0636\u0648\u06CC\u062A\n/teams \u2014 \u0644\u06CC\u0633\u062A \u062A\u06CC\u0645\u200C\u0647\u0627\n/follow 1,3,7 \u2014 \u0627\u0646\u062A\u062E\u0627\u0628 \u062A\u06CC\u0645\n/follow all \u2014 \u0647\u0645\u0647 \u062A\u06CC\u0645\u200C\u0647\u0627\n/next \u2014 \u0628\u0627\u0632\u06CC\u200C\u0647\u0627\u06CC \u067E\u06CC\u0634\u200C\u0631\u0648\n/tables \u2014 \u062C\u062F\u0648\u0644\u200C\u0647\u0627\n/timezone london \u2014 \u062A\u0646\u0638\u06CC\u0645 \u0632\u0645\u0627\u0646\n/lang \u2014 \u062A\u063A\u06CC\u06CC\u0631 \u0632\u0628\u0627\u0646\n/stop \u2014 \u0627\u0646\u0635\u0631\u0627\u0641",
  "en_help_body": "/start \u2014 Join\n/teams \u2014 List teams\n/follow 1,3,7 \u2014 Pick teams\n/follow all \u2014 All teams\n/next \u2014 Upcoming matches\n/tables \u2014 League tables\n/timezone london \u2014 Set timezone\n/lang \u2014 Change language\n/stop \u2014 Unsubscribe",
  "fa_stop": "\u274C \u0627\u0632 \u062F\u0631\u06CC\u0627\u0641\u062A \u067E\u06CC\u0627\u0645 \u062E\u0627\u0631\u062C \u0634\u062F\u06CC\u062F\.",
  "en_stop": "You have been unsubscribed\. Use /start to return\.",
  "fa_teams_header": "\u062A\u06CC\u0645\u200C\u0647\u0627\u06CC \u0642\u0627\u0628\u0644 \u062F\u0646\u0628\u0627\u0644\u200C\u06A9\u0631\u062F\u0646:",
  "en_teams_header": "Teams you can follow:",
  "fa_teams_follow_all": "\u0647\u0645\u0647 \u062A\u06CC\u0645\u200C\u0647\u0627 \u062F\u0646\u0628\u0627\u0644 \u0645\u06CC\u200C\u0634\u0648\u0646\u062F\.",
  "en_teams_follow_all": "Following all teams.",
  "fa_teams_n_selected": "\u062A\u0639\u062F\u0627\u062F \u062A\u06CC\u0645 \u0627\u0646\u062A\u062E\u0627\u0628\u06CC: ",
  "en_teams_n_selected": "Selected teams: ",
  "fa_teams_footer": "\u0627\u0646\u062A\u062E\u0627\u0628: /follow 1,3,7\n\u0647\u0645\u0647: /follow all",
  "en_teams_footer": "Pick: /follow 1,3,7\nAll: /follow all",
  "fa_follow_all_set": "\u2705 \u0647\u0645\u0647 \u062A\u06CC\u0645\u200C\u0647\u0627 \u062F\u0646\u0628\u0627\u0644 \u0645\u06CC\u200C\u0634\u0648\u0646\u062F\.",
  "en_follow_all_set": "Following all teams.",
  "fa_follow_invalid": "\u26A0\uFE0F \u0634\u0645\u0627\u0631\u0647 \u0646\u0627\u0645\u0639\u062A\u0628\u0631 \u0627\u0633\u062A\.",
  "en_follow_invalid": "Invalid number. Use /teams to see the list.",
  "fa_follow_set_header": "\u2705 \u062A\u06CC\u0645\u200C\u0647\u0627\u06CC \u0627\u0646\u062A\u062E\u0627\u0628\u06CC \u0634\u0645\u0627:",
  "en_follow_set_header": "Your selected teams:",
  "fa_follow_set_footer": "\u0628\u0631\u0627\u06CC \u062A\u063A\u06CC\u06CC\u0631\u060C /follow all \u06CC\u0627 \u0634\u0645\u0627\u0631\u0647\u200C\u0647\u0627\u06CC \u062C\u062F\u06CC\u062F \u0631\u0627 \u0628\u0641\u0631\u0633\u062A\u06CC\u062F\.",
  "en_follow_set_footer": "To change: /follow all or new numbers.",
  "fa_next_header": "\u0628\u0627\u0632\u06CC\u200C\u0647\u0627\u06CC \u067E\u06CC\u0634\u200C\u0631\u0648:",
  "en_next_header": "Upcoming matches:",
  "fa_next_empty": "\u062F\u0631 \u062D\u0627\u0644 \u062D\u0627\u0636\u0631 \u0628\u0627\u0632\u06CC \u067E\u06CC\u0634\u200C\u0631\u0648\u06CC \u0628\u0631\u0627\u06CC \u062A\u06CC\u0645\u200C\u0647\u0627\u06CC \u062F\u0646\u0628\u0627\u0644\u200C\u0634\u062F\u0647 \u0634\u0645\u0627 \u0648\u062C\u0648\u062F \u0646\u062F\u0627\u0631\u062F\.",
  "en_next_empty": "No upcoming matches for your followed teams right now.",
  "fa_tables_unavailable": "\u26A0\uFE0F \u062C\u062F\u0648\u0644\u200C\u0647\u0627 \u0641\u0639\u0644\u0627\u064B \u062F\u0631 \u062F\u0633\u062A\u0631\u0633 \u0646\u06CC\u0633\u062A\.",
  "en_tables_unavailable": "Tables are not available right now\. Please try again in a few minutes\.",
  "fa_tz_current": "\u23F0 \u0645\u0646\u0637\u0642\u0647 \u0632\u0645\u0627\u0646\u06CC \u0634\u0645\u0627: ",
  "en_tz_current": "Your timezone: ",
  "fa_tz_change_hint": "\n\u0628\u0631\u0627\u06CC \u062A\u063A\u06CC\u06CC\u0631: /timezone london",
  "en_tz_change_hint": "\nChange: /timezone london",
  "fa_tz_reset": "\u2705 \u0645\u0646\u0637\u0642\u0647 \u0632\u0645\u0627\u0646\u06CC \u0634\u0645\u0627 \u0628\u0647 \u067E\u06CC\u0634\u200C\u0641\u0631\u0636 \u0628\u0627\u0632\u06AF\u0634\u062A: ",
  "en_tz_reset": "Timezone reset to default: ",
  "fa_tz_invalid": "\u26A0\uFE0F \u0645\u0646\u0637\u0642\u0647 \u0632\u0645\u0627\u0646\u06CC \u0646\u0627\u0645\u0639\u062A\u0628\u0631 \u0627\u0633\u062A\.",
  "en_tz_invalid": "Invalid timezone.",
  "fa_tz_invalid_hint": "\n\u0645\u062B\u0627\u0644: /timezone london \u06CC\u0627 /timezone Europe/London",
  "en_tz_invalid_hint": "\nExample: /timezone london or /timezone Europe/London",
  "fa_tz_set": "\u2705 \u0645\u0646\u0637\u0642\u0647 \u0632\u0645\u0627\u0646\u06CC \u0634\u0645\u0627 \u062A\u063A\u06CC\u06CC\u0631 \u06A9\u0631\u062F: ",
  "en_tz_set": "Timezone set: ",
  "fa_tz_set_note": "\n\u067E\u06CC\u0627\u0645\u200C\u0647\u0627 \u0627\u0632 \u0627\u06CC\u0646 \u067E\u0633 \u0628\u0631 \u0627\u0633\u0627\u0633 \u0633\u0627\u0639\u062A \u0645\u062D\u0644\u06CC \u0627\u0631\u0633\u0627\u0644 \u0645\u06CC\u200C\u0634\u0648\u0646\u062F\.",
  "en_tz_set_note": "\nMessages will be sent in your local time.",
  "fa_unknown": "\u{1F4DD} \u062F\u0633\u062A\u0648\u0631 \u0646\u0627\u0634\u0646\u0627\u062E\u062A\u0647 \u0627\u0633\u062A\u060C \u0627\u0632 /help \u0627\u0633\u062A\u0641\u0627\u062F\u0647 \u06A9\u0646\u06CC\u062F\.",
  "en_unknown": "Unknown command\. Use /help\.",
  "fa_late": "\u0627\u06CC\u0646 \u06CC\u0627\u062F\u0622\u0648\u0631\u06CC \u0628\u0627 \u062A\u0623\u062E\u06CC\u0631 \u0627\u0631\u0633\u0627\u0644 \u0634\u062F",
  "en_late": "This reminder was sent late",
  "fa_3h_reminder": "\u06CC\u0627\u062F\u0622\u0648\u0631\u06CC \u06F3 \u0633\u0627\u0639\u062A\u0647",
  "fa_1h_reminder": "\u06CC\u0627\u062F\u0622\u0648\u0631\u06CC \u06F1 \u0633\u0627\u0639\u062A\u0647",
  "fa_match_start": "\u0628\u0627\u0632\u06CC \u0634\u0631\u0648\u0639 \u0634\u062F\!",
  "fa_match_final": "\u0646\u062A\u06CC\u062C\u0647 \u0646\u0647\u0627\u06CC\u06CC",
  "fa_match_winner": " \u0628\u0631\u0646\u062F\u0647 \u0634\u062F",
  "fa_match_draw": "\u0645\u0633\u0627\u0648\u06CC",
  "fa_no_score": "\u0646\u062A\u06CC\u062C\u0647 \u062F\u0631 \u062F\u0633\u062A\u0631\u0633 \u0646\u06CC\u0633\u062A",
  "fa_home_label": "\u0645\u06CC\u0632\u0628\u0627\u0646",
  "fa_full_table": "\n\n\u{1F4CA} \u062C\u062F\u0648\u0644 \u06A9\u0627\u0645\u0644: football\.sportsignal\.ir",
  "fa_table_matchday": " \u2014 \u0647\u0641\u062A\u0647 ",
  "fa_table_pts": " \u0627\u0645\u062A\u06CC\u0627\u0632",
  "fa_table_more": "\n\u2026 ",
  "fa_table_after": " \u062A\u06CC\u0645 \u0628\u0639\u062F\u06CC",
  "fa_week_ahead_more": "\n\u2026 ",
  "fa_week_ahead_other": " \u0628\u0627\u0632\u06CC \u062F\u06CC\u06AF\u0631",
  "fa_week_ahead_header": "\u{1F4C5} *\u0628\u0627\u0632\u06CC\u200C\u0647\u0627\u06CC \u0647\u0641\u062A\u0647 \u0622\u06CC\u0646\u062F\u0647*",
  "fa_coronation_header": "\u{1F451} *\u0635\u062F\u0631 \u062C\u062F\u0648\u0644 ",
  "fa_coronation_changed": " \u062A\u063A\u06CC\u06CC\u0631 \u06A9\u0631\u062F*\n\n",
  "fa_coronation_reached": " \u0628\u0627 ",
  "fa_coronation_points": " \u0627\u0645\u062A\u06CC\u0627\u0632 \u0628\u0647 \u0635\u062F\u0631 \u062C\u062F\u0648\u0644 ",
  "fa_coronation_prev": " \u0631\u0633\u06CC\u062F \u2014 \u0631\u062A\u0628\u0647 \u0642\u0628\u0644\u06CC: ",
  "fa_big_match_header": "\u26A1 *\u0628\u0627\u0632\u06CC \u0628\u0632\u0631\u06AF:* ",
  "fa_phase_playoff": "\n\n\u2694\uFE0F \u0627\u06CC\u0646 \u0645\u0633\u0627\u0628\u0642\u0647 \u062F\u0631 \u0645\u0631\u062D\u0644\u0647 \u062D\u0630\u0641\u06CC \u0628\u0648\u062F",
  "fa_default_stage": "\u0645\u0631\u062D\u0644\u0647 \u06AF\u0631\u0648\u0647\u06CC",
  "fa_comp_dash": " \\\\- ",
  "en_3h_reminder": "3 hours to kickoff",
  "en_1h_reminder": "1 hour to kickoff",
  "en_match_start": "Kickoff",
  "en_match_final": "Full time",
  "en_match_winner": " won",
  "en_match_draw": "Draw",
  "en_no_score": "Score not available",
  "en_home_label": "Host",
  "en_full_table": "\n\nFull table: football\.sportsignal\.ir",
  "en_table_matchday": " \u2014 Matchday ",
  "en_table_pts": " pts",
  "en_table_more": "\n+ ",
  "en_table_after": " more teams",
  "en_week_ahead_more": "\n+ ",
  "en_week_ahead_other": " more matches",
  "en_week_ahead_header": "Matches this week",
  "en_coronation_header": "New leader: ",
  "en_coronation_reached": " reached the top of ",
  "en_coronation_points": " with ",
  "en_coronation_pts_suffix": " pts",
  "en_coronation_prev": " \u2014 previous position: ",
  "en_big_match_header": "Big match: ",
  "en_phase_playoff": "\n\nThis was a knockout match",
  "en_default_stage": "Group stage",
  "en_comp_dash": " \\- ",
  "fa_tables_label": "\u062C\u062F\u0648\u0644 \u0641\u0639\u0644\u06CC",
  "en_tables_label": "Current table",
  "fa_weekly_label": "\u067E\u0627\u06CC\u0627\u0646 \u0647\u0641\u062A\u0647",
  "en_weekly_label": "End of week"
};
__name2(BOT_STRINGS, "BOT_STRINGS");
function botStr(lang, key) {
  const k = (lang === "en" ? "en_" : "fa_") + key;
  return BOT_STRINGS[k] != null ? BOT_STRINGS[k] : BOT_STRINGS["fa_" + key] || "";
}
__name(botStr, "botStr");
__name2(botStr, "botStr");
function userFollowsMatch(prefs, chatId, match) {
  const p = prefs[String(chatId)];
  const nh = normAlias(match.homeTeam.name);
  const na = normAlias(match.awayTeam.name);
  let home = false, away = false;
  if (p && Array.isArray(p.teams) && p.teams.length) {
    home = p.teams.some((t) => (0, import_teams.normalizeTeamName)(t) === nh);
    away = p.teams.some((t) => (0, import_teams.normalizeTeamName)(t) === na);
  } else {
    masterTeamList();
    home = _masterMemo.normSet.has(nh);
    away = _masterMemo.normSet.has(na);
  }
  return home && away ? "both" : home || away ? "one" : null;
}
__name(userFollowsMatch, "userFollowsMatch");
__name2(userFollowsMatch, "userFollowsMatch");
function isBigMatch(match, prefs, chatId) {
  return userFollowsMatch(prefs, chatId, match) === "both";
}
__name(isBigMatch, "isBigMatch");
__name2(isBigMatch, "isBigMatch");
var _masterMemo = { sig: null, list: null, normSet: null };
function masterTeamList() {
  if (_masterMemo.sig !== CONFIG.BIG_TEAMS_BY_LEAGUE) {
    const seen = /* @__PURE__ */ new Set();
    const out = [];
    for (const list of Object.values(CONFIG.BIG_TEAMS_BY_LEAGUE)) {
      for (const t of list) {
        if (!seen.has(t)) {
          seen.add(t);
          out.push(t);
        }
      }
    }
    _masterMemo.sig = CONFIG.BIG_TEAMS_BY_LEAGUE;
    _masterMemo.list = out;
    _masterMemo.normSet = /* @__PURE__ */ new Set(out.map(import_teams.normalizeTeamName));
  }
  return _masterMemo.list;
}
__name(masterTeamList, "masterTeamList");
__name2(masterTeamList, "masterTeamList");
function isMasterBigMatch(match) {
  masterTeamList();
  const nset = _masterMemo.normSet;
  return nset.has(normAlias(match.homeTeam.name)) && nset.has(normAlias(match.awayTeam.name));
}
__name(isMasterBigMatch, "isMasterBigMatch");
__name2(isMasterBigMatch, "isMasterBigMatch");
var TZ_ALIASES = {
  tehran: "Asia/Tehran",
  london: "Europe/London",
  paris: "Europe/Paris",
  berlin: "Europe/Berlin",
  madrid: "Europe/Madrid",
  rome: "Europe/Rome",
  amsterdam: "Europe/Amsterdam",
  istanbul: "Europe/Istanbul",
  moscow: "Europe/Moscow",
  dubai: "Asia/Dubai",
  doha: "Asia/Qatar",
  "new-york": "America/New_York",
  toronto: "America/Toronto",
  "los-angeles": "America/Los_Angeles",
  sydney: "Australia/Sydney",
  melbourne: "Australia/Melbourne",
  brisbane: "Australia/Brisbane",
  adelaide: "Australia/Adelaide",
  canberra: "Australia/Canberra",
  canbera: "Australia/Canberra",
  // user's typo — accept both
  perth: "Australia/Perth",
  bangkok: "Asia/Bangkok",
  "kuala-lumpur": "Asia/Kuala_Lumpur",
  singapore: "Asia/Singapore",
  "hong-kong": "Asia/Hong_Kong",
  tokyo: "Asia/Tokyo"
};
__name2(TZ_ALIASES, "TZ_ALIASES");
function resolveTimeZone(input) {
  const raw = String(input || "").trim().toLowerCase().replace(/\s+/g, "-");
  const candidate = TZ_ALIASES[raw] || raw.replace(/(^|[\/_])[a-z]/g, (m) => m.toUpperCase());
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: candidate });
    return candidate;
  } catch (e) {
    return null;
  }
}
__name(resolveTimeZone, "resolveTimeZone");
__name2(resolveTimeZone, "resolveTimeZone");
function getUserTz(prefs, chatId, env) {
  const p = prefs[String(chatId)];
  return p && typeof p.tz === "string" && p.tz ? p.tz : env.TEHRAN_TZ;
}
__name(getUserTz, "getUserTz");
__name2(getUserTz, "getUserTz");
function groupChatsByTz(chatIds, prefs, env) {
  // v12.x-bilingual-bot: each group now carries a `lang` field ("fa" or
  // "en") so the cron composers render the message in the user's lang.
  // Chats are grouped by `${tz}|${lang}` so a tz with mixed langs splits
  // into one group per lang (rendered once per lang, sent per group).
  const map = /* @__PURE__ */ new Map();
  for (const c of chatIds) {
    const tz = getUserTz(prefs, c, env);
    const lang = (prefs[String(c)] && prefs[String(c)].lang) === "en" ? "en" : "fa";
    const key = tz + "|" + lang;
    if (!map.has(key)) map.set(key, { tz, lang, chats: [] });
    map.get(key).chats.push(c);
  }
  return [...map.values()];
}
__name(groupChatsByTz, "groupChatsByTz");
__name2(groupChatsByTz, "groupChatsByTz");
__name2(masterTeamList, "masterTeamList");
async function detectStatusChanges(env, matches) {
  try {
    const prev = await env.STATE.get(CONFIG.KV_MATCH_STATUS, "json") || {};
    const cur = {};
    const now = Date.now();
    const alerts = [];
    // v12.x-cron-gaps: half-time (PAUSED) alerts for BIG matches only.
    // Tracked separately from postponement/cancellation alerts so they get
    // their own bilingual "HT: Team A [score] - [score] Team B" message
    // and only fire when a SCHEDULED/TIMED/IN_PLAY match first transitions
    // to PAUSED (HT). One fire per status transition (the KV status map
    // flips to PAUSED so a subsequent IN_PLAY \u2192 PAUSED, e.g. after extra
    // time, won't re-fire).
    const htAlerts = [];
    for (const m of matches) {
      if (!shouldNotify(m)) continue;
      const t = new Date(m.utcDate).getTime();
      if (t < now - 3 * 864e5 || t > now + 10 * 864e5) continue;
      const status = m.status || "SCHEDULED";
      const key = (0, import_teams.normalizeTeamName)(m.homeTeam.name) + "|" + (0, import_teams.normalizeTeamName)(m.awayTeam.name) + "|" + m.competition.code;
      cur[key] = status;
      const old = prev[key];
      if (old && old !== status && (status === "POSTPONED" || status === "CANCELLED") && (old === "SCHEDULED" || old === "TIMED" || old === "POSTPONED")) {
        alerts.push({ m, status });
      }
      // v12.x-cron-gaps: PAUSED \u2192 half-time alert. BIG matches only.
      // Trigger only on the FIRST transition into PAUSED from a non-PAUSED
      // state (so we don't fire on every PAUSED\u2194IN_PLAY flicker).
      if (old && old !== status && status === "PAUSED" && old !== "PAUSED" && isMasterBigMatch(m)) {
        htAlerts.push({ m, status });
      }
    }
    await env.STATE.put(CONFIG.KV_MATCH_STATUS, JSON.stringify(cur), { expirationTtl: 14 * 86400 }).catch(() => {
    });
    if (alerts.length) {
      const chats = await getRegisteredChats(env);
      // v12.x-bilingual-bot: send the alert in each user's lang.
      const prefs = typeof getUserPrefs === "function" ? await getUserPrefs(env) : {};
      const langBuckets = new Map();
      for (const c of chats) {
        const p = prefs[String(c)] || {};
        const lng = p.lang === "en" ? "en" : "fa";
        if (!langBuckets.has(lng)) langBuckets.set(lng, []);
        langBuckets.get(lng).push(c);
      }
      for (const a of alerts) {
        for (const [lng, bucket] of langBuckets) {
          const en = lng === "en";
          const home = en ? a.m.homeTeam.name : translateTeam(a.m.homeTeam.name);
          const away = en ? a.m.awayTeam.name : translateTeam(a.m.awayTeam.name);
          const comp = en ? (COMP_EN[a.m.competition.code] || a.m.competition.code) : translateCompetition(a.m.competition.code);
          const vs = en ? " vs " : " \u{1F19A} ";
          const teams = escapeMarkdownCharacters(home) + vs + escapeMarkdownCharacters(away) + " (" + escapeMarkdownCharacters(comp) + ")";
          const msg = a.status === "CANCELLED"
            ? (en ? "\u274C *Match cancelled:* " + teams : "\u274C *\u0628\u0627\u0632\u06CC \u0644\u063A\u0648 \u0634\u062F:* " + teams)
            : (en ? "*Match postponed:* " + teams : "\u{1F550} *\u0628\u0627\u0632\u06CC \u0628\u0647 \u062A\u0639\u0648\u06CC\u0642 \u0627\u0641\u062A\u0627\u062F:* " + teams);
          await Promise.allSettled(bucket.map((c) => sendTelegram(env, msg, c)));
        }
      }
    }
    // v12.x-cron-gaps: HT alerts broadcast to ALL registered chats (it's a
    // big-match highlight, not a per-team-follow event). Grouped by lang so
    // each user gets the HT message in their lang.
    if (htAlerts.length) {
      const chats = await getRegisteredChats(env);
      const prefs = typeof getUserPrefs === "function" ? await getUserPrefs(env) : {};
      const langBuckets = new Map();
      for (const c of chats) {
        const p = prefs[String(c)] || {};
        const lng = p.lang === "en" ? "en" : "fa";
        if (!langBuckets.has(lng)) langBuckets.set(lng, []);
        langBuckets.get(lng).push(c);
      }
      for (const a of htAlerts) {
        const m = a.m;
        const home = m.homeTeam.name;
        const away = m.awayTeam.name;
        const sH = m.score && m.score.fullTime && m.score.fullTime.home != null ? m.score.fullTime.home : null;
        const sA = m.score && m.score.fullTime && m.score.fullTime.away != null ? m.score.fullTime.away : null;
        const comp = COMP_EN[m.competition.code] || m.competition.code;
        for (const [lng, bucket] of langBuckets) {
          const en = lng === "en";
          const hName = en ? home : translateTeam(home);
          const aName = en ? away : translateTeam(away);
          const compName = en ? comp : translateCompetition(m.competition.code);
          const hStr = sH == null ? "?" : (en ? String(sH) : toFaDigits(String(sH)));
          const aStr = sA == null ? "?" : (en ? String(sA) : toFaDigits(String(sA)));
          const head = en ? "*Half time*" : "*\u0627\u0633\u062A\u0631\u0627\u062D\u062A*";
          const vs = en ? " - " : " \u2014 ";
          const msg = head + "\n\n\u26BD *" + escapeMarkdownCharacters(hName) + vs + escapeMarkdownCharacters(aName) + "*\n" + escapeMarkdownCharacters(compName) + "\n*" + hStr + "\\-" + aStr + "*";
          await Promise.allSettled(bucket.map((c) => sendTelegram(env, msg, c)));
        }
      }
      console.log(`\u{1F680} HT alerts sent for ${htAlerts.length} big matches`);
    }
  } catch (e) {
    console.error("Status change detection failed: " + e.message);
  }
}
__name(detectStatusChanges, "detectStatusChanges");
__name2(detectStatusChanges, "detectStatusChanges");
async function checkUserCap(env, count) {
  try {
    for (const lv of [15, 20, 25]) {
      if (count < lv) continue;
      const key = "cap_warn_" + lv;
      const last = parseInt(await env.STATE.get(key).catch(() => null)) || 0;
      if (Date.now() - last < 7 * 864e5) continue;
      await env.STATE.put(key, String(Date.now())).catch(() => {
      });
      const adminChat = parseInt(env.CHAT_ID);
      if (!isNaN(adminChat)) {
        await sendTelegram(env, "\u26A0\uFE0F *\u0647\u0634\u062F\u0627\u0631 \u0638\u0631\u0641\u06CC\u062A:* " + toFaDigits(String(count)) + " \u06A9\u0627\u0631\u0628\u0631 \u062B\u0628\u062A\u200C\u0646\u0627\u0645 \u06A9\u0631\u062F\u0647\u200C\u0627\u0646\u062F. \u062D\u062F \u0639\u0645\u0644\u06CC \u0631\u0627\u06CC\u06AF\u0627\u0646 \u0637\u0628\u0642\u0647 \u0639\u0628\u0648\u0631\u06CC ~\u06F2\u06F0-\u06F2\u06F5 \u06A9\u0627\u0631\u0628\u0631 \u0627\u0633\u062A \u2014 \u0628\u0627\u0644\u0627\u062A\u0631 \u0627\u0632 \u0622\u0646 \u0627\u0639\u0644\u0627\u0646\u200C\u0647\u0627 \u0645\u0645\u06A9\u0646 \u0627\u0633\u062A \u062D\u0630\u0641 \u0634\u0648\u0646\u062F. \u067E\u0644\u0627\u0646 \u067E\u0631\u062F\u0627\u062E\u062A\u06CC Workers \u0631\u0627 \u062F\u0631 \u0646\u0638\u0631 \u0628\u06AF\u06CC\u0631\u06CC\u062F.", adminChat);
      }
    }
  } catch (e) {
    console.error("Cap check failed: " + e.message);
  }
}
__name(checkUserCap, "checkUserCap");
__name2(checkUserCap, "checkUserCap");
__name2(getRegisteredChats, "getRegisteredChats");
function isAdminRequest(req, env) {
  if (!env.ADMIN_TOKEN) return false;
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) return false;
  return timingSafeEqualStr(authHeader.slice(7), env.ADMIN_TOKEN);
}
__name(isAdminRequest, "isAdminRequest");
__name2(isAdminRequest, "isAdminRequest");
function getAdminCookieToken(req) {
  const m = (req.headers.get("Cookie") || "").match(/(?:^|;\s*)admin_auth=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}
__name(getAdminCookieToken, "getAdminCookieToken");
__name2(getAdminCookieToken, "getAdminCookieToken");
async function isValidAdminSession(env, req) {
  const sid = getAdminCookieToken(req);
  if (!sid || !/^[a-f0-9]{32,80}$/i.test(sid)) return false;
  const val = await env.STATE.get("admin_sess_" + sid).catch(() => null);
  return !!val;
}
__name(isValidAdminSession, "isValidAdminSession");
__name2(isValidAdminSession, "isValidAdminSession");
async function isAdminAuthed(req, env) {
  return isAdminRequest(req, env) || await isValidAdminSession(env, req);
}
__name(isAdminAuthed, "isAdminAuthed");
__name2(isAdminAuthed, "isAdminAuthed");
function validateWebhook(req, env) {
  if (!env.WEBHOOK_SECRET) return false;
  const secretToken = req.headers.get("X-Telegram-Bot-Api-Secret-Token");
  return timingSafeEqualStr(secretToken, env.WEBHOOK_SECRET);
}
__name(validateWebhook, "validateWebhook");
__name2(validateWebhook, "validateWebhook");
async function getCronStatus(env) {
  try {
    const s = await env.STATE.get("cron_status_v1", "json").catch(() => null);
    if (s && s.heartbeat) return s;
  } catch (e) {
  }
  const hb = parseInt(await env.STATE.get(CONFIG.KV_HEARTBEAT).catch(() => null)) || 0;
  const lc = parseInt(await env.STATE.get(CONFIG.KV_LAST_CRON).catch(() => null)) || 0;
  const src = await env.STATE.get(CONFIG.KV_LAST_SOURCE).catch(() => null);
  return { heartbeat: hb ? String(hb) : "0", last_cron: lc ? String(lc) : "0", api_source: src || null };
}
__name(getCronStatus, "getCronStatus");
__name2(getCronStatus, "getCronStatus");
async function executeScheduledLogic(env) {
  resetSubrequestBudget();
  await applySettings(env);
  await ensureFaAiCache(env).catch(() => {
  });
  const NOW = Date.now();
  const prevStatus = await getCronStatus(env);
  console.log(`
\u{1F680} Starting scheduled execution at ${new Date(NOW).toISOString()}`);
  try {
    const lastCron = parseInt(prevStatus.last_cron) || 0;
    const lastStale = parseInt(await env.STATE.get("stale_alert_at").catch(() => null)) || 0;
    if (lastCron && NOW - lastCron > 30 * 6e4 && NOW - lastStale > 12 * 36e5) {
      await env.STATE.put("stale_alert_at", String(NOW)).catch(() => {
      });
      const gapMin = Math.round((NOW - lastCron) / 6e4);
      const adminChat = parseInt(env.CHAT_ID);
      if (!isNaN(adminChat)) {
        await sendTelegram(env, "\u26A0\uFE0F *\u0631\u0628\u0627\u062A \u0628\u0631\u0627\u06CC " + toFaDigits(String(gapMin)) + " \u062F\u0642\u06CC\u0642\u0647 \u062E\u0627\u0645\u0648\u0634 \u0628\u0648\u062F* \u2014 \u0627\u0639\u0644\u0627\u0646\u200C\u0647\u0627\u06CC \u0622\u0646 \u0628\u0627\u0632\u0647 \u0645\u0645\u06A9\u0646 \u0627\u0633\u062A \u0627\u0632 \u062F\u0633\u062A \u0631\u0641\u062A\u0647 \u0628\u0627\u0634\u0646\u062F. \u0627\u06A9\u0646\u0648\u0646 \u062F\u0648\u0628\u0627\u0631\u0647 \u0641\u0639\u0627\u0644 \u0634\u062F.", adminChat);
      }
    }
  } catch (e) {
    console.error("Stale alert failed: " + e.message);
  }
  const lockValue = await env.STATE.get(CONFIG.KV_EXECUTION_LOCK).catch(() => null);
  if (lockValue) {
    const lockTime = parseInt(String(lockValue).replace(/^own:/, "")) || 0;
    if (lockTime && NOW - lockTime < CONFIG.LOCK_TIMEOUT) {
      console.log("\u23ED\uFE0F Execution already in progress, skipping");
      return;
    }
  }
  const lockOwner = "own:" + NOW + ":" + crypto.randomUUID();
  await env.STATE.put(CONFIG.KV_EXECUTION_LOCK, lockOwner, {
    expirationTtl: Math.ceil(CONFIG.LOCK_TIMEOUT / 1e3)
  });
  const lockCheck = await env.STATE.get(CONFIG.KV_EXECUTION_LOCK).catch(() => null);
  if (lockCheck !== lockOwner) {
    console.log("\u23ED\uFE0F Lock claimed by a concurrent run, skipping");
    return;
  }
  try {
    const chatIds = await getRegisteredChats(env);
    console.log(`\u{1F465} Registered users: ${chatIds.length}`);
    try {
      const fa = await maybeRunFaAi(env);
      if (fa && fa.ok && fa.learned) console.log(`\u{1F9E0} FA-AI: ${fa.learned} new Persian names learned (${fa.totalLearned} total)`);
    } catch (e) {
      console.error("FA-AI cron step failed: " + e.message);
    }
    await checkUserCap(env, chatIds.length);
    if (chatIds.length === 0) {
      console.log("\u274C No users, skipping");
      return;
    }
    try {
      const wt = await maybeSendWeeklyTables(env, chatIds);
      if (wt) console.log(`\u{1F4CA} Weekly tables digest: leagues=${wt.leagues.filter((l) => l.ok).length} sent=${wt.sent} failed=${wt.failed}`);
    } catch (e) {
      console.error("Weekly tables digest failed: " + e.message);
    }
    const cachedPool = await getCachedMatches(env);
    const isActiveTime = cachedPool.some((m) => {
      if (!shouldNotify(m)) return false;
      if (isLiveStatus(m.status)) return true;
      const ko = new Date(m.utcDate).getTime();
      if (m.status === "FINISHED") return NOW - ko < CONFIG.ACTIVE_WINDOW_BEHIND_MS;
      return ko > NOW && ko - NOW < CONFIG.ACTIVE_WINDOW_AHEAD_MS;
    });
    const lastSweep = parseInt(await env.STATE.get("last_full_sweep").catch(() => null)) || 0;
    const sweepFresh = lastSweep && NOW - lastSweep < CONFIG.QUIET_SWEEP_MS;
    let matches;
    if (!isActiveTime && sweepFresh && cachedPool.length) {
      matches = cachedPool;
      console.log(`\u{1F50C} Quiet period \u2014 reusing KV pool (${matches.length} matches, last sweep ${Math.round((NOW - lastSweep) / 6e4)} min ago); pre-match reminders still fire from the pool`);
    } else {
      console.log("\n\u{1F4E1} Fetching matches from API...");
      matches = await fetchMatchesFromAPI(env);
      await env.STATE.put("last_full_sweep", String(NOW)).catch(() => {
      });
    }
    console.log(`\u{1F4CA} Total matches received: ${matches.length}`);
    await detectStatusChanges(env, matches);
    const worthyMatches = matches.filter(shouldNotify);
    console.log(`\u{1F3AF} Matches meeting notification criteria: ${worthyMatches.length}`);
    const now = /* @__PURE__ */ new Date();
    const upcomingMatches = worthyMatches.filter((m) => new Date(m.utcDate) > now).sort((a, b) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime()).slice(0, 10);
    if (upcomingMatches.length > 0) {
      console.log(`
\u{1F4C5} Upcoming matches (next 10):`);
      for (const match of upcomingMatches) {
        const matchTime = new Date(match.utcDate);
        const hoursUntil = (matchTime.getTime() - now.getTime()) / CONFIG.ONE_HOUR_MS;
        console.log(`  ${translateTeam(match.homeTeam.name)} vs ${translateTeam(match.awayTeam.name)}`);
        console.log(`    ${matchTime.toLocaleString("fa-IR")} (${hoursUntil.toFixed(1)}h from now)`);
      }
    }
    await sendMatchNotifications(env, matches);
    // v12.x-cron-gaps: big-match FT broadcast — users who follow neither
    // team in a master-big-match still get the FT result (Real Madrid vs
    // Man City, etc.). Additive; own try/catch so a failure here can
    // never break the rest of the sweep.
    try {
      const bb = await broadcastBigMatchResults(env, matches);
      if (bb && bb.sent) console.log(`\u{1F4E4} Big-match FT broadcast: ${bb.sent}/${bb.matches} (dead=${bb.dead})`);
    } catch (e) {
      console.error("Big-match FT broadcast step failed: " + e.message);
    }
    // v12.x-cron-gaps: matchday morning digest at 9am local tz. Fires once
    // per chat per day; per-chat KV dedupe. Own try/catch.
    try {
      const md = await maybeSendMorningDigest(env, chatIds);
      if (md && md.sent) console.log(`\u{1F4C5} Morning digest: sent=${md.sent} skipped=${md.skipped}`);
    } catch (e) {
      console.error("Morning digest step failed: " + e.message);
    }
    // v12.32 (the user's ask): table-top coronation alerts \u2014 a non-first
    // team (2nd/3rd/4th\u2026) overtaking the leader after a fresh full-time
    // result gets its own special Telegram message. Own try/catch (a
    // failure here must never break the result/pre-match notifications).
    // v12.33-xpost: the events list is captured so the X mirror runs AFTER
    // Telegram (X is additive — wrapped in its own try/catch below).
    let tableToppersEvents = [];
    try {
      const tt = await maybeNotifyTableToppers(env, matches);
      if (tt && tt.events && tt.events.length) {
        tableToppersEvents = tt.events;
        console.log(`\u{1F451} Table-top alerts: ${tt.events.map((e) => e.code + ":" + e.leader).join(", ")} (sent ${tt.sent}, failed ${tt.failed})`);
      }
    } catch (e) {
      console.error("Table-top detection failed: " + e.message);
    }
    // v12.33-xpost: X (Twitter) automated profile \u2014 Persian mirror of the
    // Telegram composers (coronation > FT > kickoff > weekly tables). Additive:
    // wrapped in try/catch so a failing post can NEVER fail the sweep.
    try {
      const xr = await maybePostX(env, matches, { topperEvents: tableToppersEvents });
      if (xr && (xr.sent || xr.dryRun)) console.log(`\u{1F426} X sweep: sent=${xr.sent} dryRun=${xr.dryRun} skipped=${xr.skipped} errors=${xr.errors.length}`);
    } catch (e) {
      console.error("X post step failed: " + e.message);
    }
    try {
      await env.STATE.put("cron_status_v1", JSON.stringify({
        heartbeat: String(NOW),
        last_cron: String(NOW)
      }));
    } catch (e) {
      await env.STATE.put(CONFIG.KV_HEARTBEAT, NOW.toString()).catch(() => {
      });
      await env.STATE.put(CONFIG.KV_LAST_CRON, NOW.toString()).catch(() => {
      });
    }
    console.log(`
\u2705 Execution completed at ${(/* @__PURE__ */ new Date()).toISOString()}`);
  } catch (error) {
    console.error(`\u274C Fatal error in scheduled logic:`, error);
    throw error;
  }
}
__name(executeScheduledLogic, "executeScheduledLogic");
__name2(executeScheduledLogic, "executeScheduledLogic");
function jsonResponse(data, status) {
  return new Response(JSON.stringify(data, null, 2), {
    status: status || 200,
    headers: {
      "content-type": "application/json",
      "x-content-type-options": "nosniff",
      "x-frame-options": "DENY",
      "referrer-policy": "no-referrer"
    }
  });
}
__name(jsonResponse, "jsonResponse");
var PAGE_SEC_HEADERS = {
  "content-type": "text/html; charset=utf-8",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "referrer-policy": "no-referrer",
  "content-security-policy": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; img-src 'self' data: https:; font-src 'self' https://cdn.jsdelivr.net; connect-src 'self'; frame-ancestors 'none'"
};
__name2(jsonResponse, "jsonResponse");
async function getSettings(env) {
  const defaults = {
    timezone: env.TEHRAN_TZ || "Asia/Tehran",
    teams: CONFIG.BIG_TEAMS_BY_LEAGUE,
    leagues: CONFIG.LEAGUES
  };
  try {
    const saved = await env.STATE.get(CONFIG.KV_SETTINGS_KEY, "json");
    if (!saved || !saved.timezone) return defaults;
    const teams = {};
    for (const [lg, list] of Object.entries(defaults.teams)) teams[lg] = saved.teams && Array.isArray(saved.teams[lg]) ? saved.teams[lg] : list;
    const leagues = [.../* @__PURE__ */ new Set([...Array.isArray(defaults.leagues) ? defaults.leagues : [], ...Array.isArray(saved.leagues) ? saved.leagues : []])];
    let cat = null;
    try {
      cat = await env.STATE.get(CONFIG.KV_CLUBS_CATALOG, "json");
    } catch (e) {
      cat = null;
    }
    return { ...defaults, ...saved, teams: syncUclSelection(canonicalizeTeams(teams, cat)), leagues };
  } catch (e) {
    console.error("Settings read failed: " + e.message);
    return defaults;
  }
}
__name(getSettings, "getSettings");
__name2(getSettings, "getSettings");
async function applySettings(env) {
  const s = await getSettings(env);
  env.TEHRAN_TZ = s.timezone;
  CONFIG.BIG_TEAMS_BY_LEAGUE = s.teams;
  CONFIG.LEAGUES = s.leagues;
  return s;
}
__name(applySettings, "applySettings");
__name2(applySettings, "applySettings");
function sanitizeSettings(body) {
  const s = { timezone: "Asia/Tehran", teams: {}, leagues: [] };
  if (typeof body.timezone === "string" && body.timezone.trim()) s.timezone = body.timezone.trim();
  if (Array.isArray(body.leagues)) {
    s.leagues = body.leagues.map((x) => String(x).trim().toUpperCase()).filter((x) => x && CONFIG.KNOWN_LEAGUE_CODES.includes(x));
  }
  if (body.teams && typeof body.teams === "object") {
    for (const [league, teams] of Object.entries(body.teams)) {
      if (Array.isArray(teams)) {
        s.teams[league] = [...new Set(teams.map((t) => String(t).trim()).filter((t) => t && t.length <= 40))];
      }
    }
  }
  return s;
}
__name(sanitizeSettings, "sanitizeSettings");
__name2(sanitizeSettings, "sanitizeSettings");
function catalogNameMap(cat) {
  const map = /* @__PURE__ */ new Map();
  const clubs = cat && Array.isArray(cat.clubs) && cat.clubs || [];
  for (const c of clubs) {
    const k = normAlias(String(c.n || ""));
    if (k && !map.has(k)) map.set(k, c.n);
  }
  for (const c of clubs) {
    const s = String(c.s || "").trim();
    if (!s) continue;
    const k = normAlias(s);
    if (k && !map.has(k)) map.set(k, c.n);
  }
  return map;
}
__name(catalogNameMap, "catalogNameMap");
__name2(catalogNameMap, "catalogNameMap");
function canonicalizeTeams(teams, cat) {
  const map = catalogNameMap(cat);
  const out = {};
  for (const [lg, list] of Object.entries(teams || {})) {
    if (!Array.isArray(list)) {
      out[lg] = [];
      continue;
    }
    const seen = /* @__PURE__ */ new Set();
    const clean = [];
    for (const t of list) {
      const raw = String(t || "").trim();
      if (!raw) continue;
      const k = normAlias(raw);
      if (!k || seen.has(k)) continue;
      seen.add(k);
      clean.push(map.get(k) || raw);
    }
    out[lg] = clean;
  }
  return out;
}
__name(canonicalizeTeams, "canonicalizeTeams");
__name2(canonicalizeTeams, "canonicalizeTeams");
function syncUclSelection(teams) {
  const out = {};
  for (const [lg, list] of Object.entries(teams || {})) out[lg] = Array.isArray(list) ? list : [];
  const seen = /* @__PURE__ */ new Map();
  for (const t of out.CL || []) {
    const k = normAlias(t);
    if (k && !seen.has(k)) seen.set(k, t);
  }
  for (const [lg, list] of Object.entries(out)) {
    if (lg === "CL") continue;
    for (const t of list) {
      const k = normAlias(t);
      if (k && !seen.has(k)) seen.set(k, t);
    }
  }
  out.CL = [...seen.values()];
  return out;
}
__name(syncUclSelection, "syncUclSelection");
__name2(syncUclSelection, "syncUclSelection");
var FD_TEAMS_CODES = ["CL", "PL", "PD", "SA", "FL1", "BL1"];
async function fetchFdTeams(env, code) {
  if (++SUBREQUEST_COUNT > SUBREQUEST_CAP) return null;
  try {
    const res = await fetch("https://api.football-data.org/v4/competitions/" + code + "/teams", {
      headers: { "X-Auth-Token": env.API_TOKEN }
    });
    if (!res.ok) {
      console.log("clubs catalog " + code + ": HTTP " + res.status + " (skipped)");
      return null;
    }
    const data = await res.json();
    return data && Array.isArray(data.teams) && data.teams || null;
  } catch (e) {
    console.log("clubs catalog " + code + " failed: " + e.message);
    return null;
  }
}
__name(fetchFdTeams, "fetchFdTeams");
__name2(fetchFdTeams, "fetchFdTeams");
async function fetchAlTeams() {
  try {
    const data = await fetchJSON("https://sportscore.com/api/v1/standings/?sport=football&competition=" + SPORTSCORE_SLUGS.AL);
    const rows = data && data.tables && data.tables[0] && data.tables[0].rows || [];
    return rows.map((r) => ({ name: r.team, shortName: "", tla: "", crest: "" }));
  } catch (e) {
    console.log("clubs catalog AL failed: " + e.message);
    return null;
  }
}
__name(fetchAlTeams, "fetchAlTeams");
__name2(fetchAlTeams, "fetchAlTeams");
async function refreshClubsCatalog(env) {
  const byKey = /* @__PURE__ */ new Map();
  const addTeam = /* @__PURE__ */ __name((t, league) => {
    const name = String(t && t.name || "").trim();
    if (!name || name.length > 40) return;
    const k = (0, import_teams.normalizeTeamName)(name);
    if (!k) return;
    const cur = byKey.get(k);
    if (cur) {
      if (league && !cur.l.includes(league)) cur.l.push(league);
      return;
    }
    const short = String(t.shortName || "").trim();
    const tla = String(t.tla || "").trim().toUpperCase();
    const crest = String(t.crest || "");
    byKey.set(k, {
      n: name,
      s: short && short !== name ? short : "",
      t: tla.length === 2 || tla.length === 3 ? tla : "",
      l: league ? [league] : [],
      c: crest.startsWith("http") ? crest : ""
    });
  }, "addTeam");
  const lg = Array.isArray(CONFIG.LEAGUES) ? CONFIG.LEAGUES : [];
  const tm = CONFIG.BIG_TEAMS_BY_LEAGUE && typeof CONFIG.BIG_TEAMS_BY_LEAGUE === "object" ? Object.keys(CONFIG.BIG_TEAMS_BY_LEAGUE) : [];
  const wanted = [.../* @__PURE__ */ new Set([...lg, ...tm, ...FD_TEAMS_CODES])];
  for (const code of FD_TEAMS_CODES) {
    if (wanted.includes(code)) {
      const teams = await fetchFdTeams(env, code);
      if (teams) for (const t of teams) addTeam(t, code);
    }
  }
  if (wanted.includes("AL")) {
    const al = await fetchAlTeams();
    if (al) for (const t of al) addTeam(t, "AL");
  }
  const clubs = [...byKey.values()].sort((a, b) => a.n.localeCompare(b.n));
  const cat = { fetchedAt: (/* @__PURE__ */ new Date()).toISOString(), count: clubs.length, clubs };
  if (clubs.length) {
    await env.STATE.put(CONFIG.KV_CLUBS_CATALOG, JSON.stringify(cat)).catch((e) => console.error("clubs catalog write failed: " + e.message));
  }
  console.log(`\u{1F3E2} Clubs catalog: ${clubs.length} clubs from ${wanted.join(",")}`);
  return cat;
}
__name(refreshClubsCatalog, "refreshClubsCatalog");
__name2(refreshClubsCatalog, "refreshClubsCatalog");
async function getClubsCatalog(env, force) {
  let cat = null;
  try {
    cat = await env.STATE.get(CONFIG.KV_CLUBS_CATALOG, "json");
  } catch (e) {
  }
  const stale = !cat || !Array.isArray(cat.clubs) || !cat.clubs.length || !cat.fetchedAt || Date.now() - new Date(cat.fetchedAt).getTime() > CONFIG.CLUBS_STALE_MS;
  if (force || stale) {
    try {
      const fresh = await refreshClubsCatalog(env);
      if (fresh && fresh.count) cat = fresh;
    } catch (e) {
      console.error("clubs catalog refresh failed: " + e.message);
    }
  }
  return cat || { fetchedAt: null, count: 0, clubs: [] };
}
__name(getClubsCatalog, "getClubsCatalog");
__name2(getClubsCatalog, "getClubsCatalog");
function clubsSearch(cat, q, hint) {
  const norm = /* @__PURE__ */ __name((s) => String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, ""), "norm");
  const nq = norm(q);
  if (!nq) return [];
  const scored = [];
  for (const c of cat.clubs || []) {
    const nn = norm(c.n), ns = norm(c.s), nt = norm(c.t);
    let score = 0;
    if (nn === nq) score = 5;
    else if (ns === nq) score = 4.5;
    else if (nn.startsWith(nq)) score = 4;
    else if (ns.startsWith(nq)) score = 3.5;
    else if (nt === nq) score = 3.2;
    else if (nn.includes(nq)) score = 2;
    else if (ns.includes(nq)) score = 1.5;
    else continue;
    if (hint && c.l && c.l.includes(hint)) score += 0.6;
    scored.push({ score, item: c });
  }
  scored.sort((a, b) => b.score - a.score || a.item.n.localeCompare(b.item.n));
  return scored.slice(0, 8).map((x) => ({ name: x.item.n, short: x.item.s, tla: x.item.t, leagues: x.item.l, crest: x.item.c }));
}
__name(clubsSearch, "clubsSearch");
__name2(clubsSearch, "clubsSearch");
function dummyForType(type) {
  const now = Date.now();
  const H = 36e5;
  const M = 6e4;
  const offsets = {
    "pre-match-24h": 23 * H,
    // 24h window (20–24h before)
    "pre-match-3h": 3 * H,
    // 3h window (2.5–3.5h before)
    "pre-match-1h": 1 * H,
    // 1h window (0.75–1.5h before)
    "match-start": 5 * M,
    // match-start window (−5..+45min)
    "result": -1 * H
    // result (≤6h after)
  };
  const finished = type === "result";
  return {
    id: "sim-" + type,
    utcDate: new Date(now + offsets[type]).toISOString(),
    status: finished ? "FINISHED" : "SCHEDULED",
    stage: "REGULAR_SEASON",
    competition: { code: "PL" },
    homeTeam: { name: "Arsenal FC" },
    awayTeam: { name: "Chelsea FC" },
    score: { fullTime: finished ? { home: 2, away: 1 } : { home: null, away: null } }
  };
}
__name(dummyForType, "dummyForType");
__name2(dummyForType, "dummyForType");
function buildDummyMatches() {
  const base = ["pre-match-24h", "pre-match-3h", "pre-match-1h", "match-start", "result"].map(dummyForType);
  base.push({ ...dummyForType("pre-match-1h"), id: "sim-probe-mixed", homeTeam: { name: "Arsenal FC" }, awayTeam: { name: "Brentford FC" } });
  base.push({ ...dummyForType("pre-match-3h"), id: "sim-probe-none", homeTeam: { name: "Bournemouth FC" }, awayTeam: { name: "Wolves FC" } });
  base.push({ ...dummyForType("pre-match-1h"), id: "sim-probe-el", competition: { code: "EL" }, homeTeam: { name: "Manchester United FC" }, awayTeam: { name: "FCSB" } });
  base.push({ ...dummyForType("pre-match-1h"), id: "sim-probe-ecl", competition: { code: "ECL" }, homeTeam: { name: "Chelsea FC" }, awayTeam: { name: "Panathinaikos FC" } });
  base.push({ ...dummyForType("pre-match-24h"), id: "sim-probe-el-24h", utcDate: new Date(Date.now() + 23 * 36e5).toISOString(), competition: { code: "EL" }, homeTeam: { name: "Manchester United FC" }, awayTeam: { name: "AS Roma" } });
  base.push({ ...dummyForType("result"), id: "sim-probe-knockout", competition: { code: "CL" }, stage: "QUARTER_FINALS", homeTeam: { name: "Arsenal FC" }, awayTeam: { name: "Real Madrid CF" } });
  base.push({ ...dummyForType("pre-match-1h"), id: "sim-probe-cup", competition: { code: "FA_CUP" }, stage: "ROUND_OF_16", homeTeam: { name: "Chelsea FC" }, awayTeam: { name: "Liverpool FC" } });
  base.push({ ...dummyForType("pre-match-24h"), id: "sim-probe-backfill-24h", utcDate: new Date(Date.now() + 10 * 36e5).toISOString() });
  base.push({ ...dummyForType("pre-match-3h"), id: "sim-probe-backfill-3h", utcDate: new Date(Date.now() + 2 * 36e5).toISOString() });
  base.push({ ...dummyForType("pre-match-1h"), id: "sim-probe-bigmatch", utcDate: new Date(Date.now() + 71 * 36e5).toISOString(), homeTeam: { name: "Arsenal FC" }, awayTeam: { name: "Liverpool FC" } });
  base.push({ ...dummyForType("pre-match-1h"), id: "sim-probe-bigmatch-none", utcDate: new Date(Date.now() + 71 * 36e5).toISOString(), homeTeam: { name: "Luton Town FC" }, awayTeam: { name: "Rotherham United FC" } });
  return base;
}
__name(buildDummyMatches, "buildDummyMatches");
__name2(buildDummyMatches, "buildDummyMatches");
function pubMatch(m) {
  return {
    id: m.id || null,
    homeTeam: { name: m.homeTeam.name, faName: translateTeam(m.homeTeam.name), crest: m.homeTeam.crest || null },
    awayTeam: { name: m.awayTeam.name, faName: translateTeam(m.awayTeam.name), crest: m.awayTeam.crest || null },
    utcDate: m.utcDate,
    competition: { code: m.competition.code, faName: translateCompetition(m.competition.code), emblem: m.competition.emblem || LEAGUE_LOGOS[m.competition.code] || null },
    status: m.status,
    minute: isLiveStatus(m.status) && m.minute != null ? m.minute : null,
    scorers: isLiveStatus(m.status) ? (m.scorers || []).map((s) => ({ minute: s.minute, type: s.type, scorer: s.scorer, team: s.team })) : [],
    big: isFeaturedMatch(m),
    derby: isDerby(m),
    venue: m.venue || null,
    score: (isLiveStatus(m.status) || m.status === "FINISHED") && m.score && m.score.fullTime ? m.score.fullTime : null
  };
}
__name(pubMatch, "pubMatch");
__name2(pubMatch, "pubMatch");
function isLiveStatus(status) {
  const s = String(status || "").toUpperCase();
  return s === "LIVE" || s === "IN_PLAY" || s === "PAUSED";
}
__name(isLiveStatus, "isLiveStatus");
__name2(isLiveStatus, "isLiveStatus");
async function enrichLiveMatches(env, matches) {
  const live = matches.filter((m) => isLiveStatus(m.status) && /^\d+$/.test(String(m.id)));
  for (const m of live.slice(0, 4)) {
    try {
      const key = CONFIG.KV_LIVE_DETAIL + m.id;
      const cached = await env.STATE.get(key, "json").catch(() => null);
      if (cached) {
        applyLiveDetail(m, cached);
        continue;
      }
      const d = await fetchJSON("https://api.football-data.org/v4/matches/" + m.id, 2, { "X-Auth-Token": env.API_TOKEN });
      const det = d && d.match ? d.match : d;
      if (!det) continue;
      const detail = {
        minute: det.minute != null ? det.minute : null,
        scorers: (det.scorers || []).map((s) => ({
          minute: s.minute != null ? s.minute : null,
          type: s.type || "GOAL",
          scorer: s.scorer && s.scorer.name ? s.scorer.name : null,
          team: s.team && s.team.name ? s.team.name : null
        }))
      };
      if (det.score && det.score.fullTime) {
        detail.scoreFullTime = { home: det.score.fullTime.home, away: det.score.fullTime.away };
      }
      await env.STATE.put(key, JSON.stringify(detail), { expirationTtl: 90 }).catch(() => {
      });
      applyLiveDetail(m, detail);
    } catch (e) {
      console.error("Live detail fail for " + m.id + ": " + e.message);
    }
    await new Promise((r) => setTimeout(r, 1400));
  }
  return matches;
}
__name(enrichLiveMatches, "enrichLiveMatches");
__name2(enrichLiveMatches, "enrichLiveMatches");
function applyLiveDetail(m, detail) {
  if (detail.minute != null) m.minute = detail.minute;
  if (detail.scorers) m.scorers = detail.scorers;
  if (detail.scoreFullTime) m.score = { fullTime: detail.scoreFullTime };
}
__name(applyLiveDetail, "applyLiveDetail");
__name2(applyLiveDetail, "applyLiveDetail");
function projectedUclStart() {
  const now = /* @__PURE__ */ new Date();
  const y = now.getUTCMonth() >= 9 ? now.getUTCFullYear() + 1 : now.getUTCFullYear();
  return new Date(Date.UTC(y, 8, 15, 19, 0, 0));
}
__name(projectedUclStart, "projectedUclStart");
async function fetchPublicMatches(env, req) {
  const cached = await env.STATE.get(CONFIG.KV_PUBLIC_MATCHES, "json").catch(() => null);
  if (cached && cached.ts && Date.now() - cached.ts < 18e4) return cached.data;
  await applySettings(env);
  await ensureFaAiCache(env).catch(() => {
  });
  const lockVal = parseInt(await env.STATE.get("pub_refresh_lock").catch(() => null)) || 0;
  const lockFresh = !!(lockVal && Date.now() - lockVal < 45e3);
  if (lockFresh && cached && cached.data) return cached.data;
  const ip = req && req.headers && req.headers.get("CF-Connecting-IP") || "";
  const rlKey = ip ? "pub_rl_" + ip.replace(/[^0-9a-fA-F:.]/g, "") : null;
  if (rlKey) {
    const rl = await env.STATE.get(rlKey).catch(() => null);
    if (rl && cached && cached.data) return cached.data;
  }
  let matches = null;
  let liveSweepFailed = false;
  try {
    if (!lockFresh) {
      await env.STATE.put("pub_refresh_lock", String(Date.now()), { expirationTtl: 45 }).catch(() => {
      });
    }
    if (rlKey) {
      await env.STATE.put(rlKey, String(Date.now()), { expirationTtl: 60 }).catch(() => {
      });
    }
    matches = await fetchLongView(env);
    await enrichLiveMatches(env, matches);
  } catch (e) {
    console.error("Public provider sweep failed (serving stale): " + e.message);
    liveSweepFailed = true;
    if (cached && cached.data) return cached.data;
    matches = await getCachedMatches(env);
  }
  const now = Date.now();
  const standCodes = ["PL", "PD", "SA", "BL1", "FL1"];
  const FD_STAND_ROTATION = ["PL", "PD", "SA", "BL1", "FL1", "CL"];
  const fdSlot = Math.floor(Date.now() / 6e5) % 3;
  const fdAllowed = new Set(FD_STAND_ROTATION.slice(fdSlot * 2, fdSlot * 2 + 2));
  const compact = /* @__PURE__ */ __name((st) => st && st.teams.length ? {
    started: st.started !== false,
    // v12.16: full per-team stats ride along (played/won/draw/lost/gf/ga/gd —
    // fd and the PGL Wikipedia fallback serve them; sources without stats
    // simply carry undefined and the UI renders "—").
    teams: st.teams.slice(0, 8).map((t) => ({ pos: t.pos, name: t.name, faName: translateTeam(t.name), points: t.points, played: t.played, won: t.won, draw: t.draw, lost: t.lost, gf: t.gf, ga: t.ga, gd: t.gd != null ? t.gd : t.gf != null && t.ga != null ? t.gf - t.ga : null }))
  } : null, "compact");
  const stMap = {};
  await Promise.all(standCodes.concat(["CL", "PGL"]).map((c) => fetchStandings(env, c, c === "PGL" || fdAllowed.has(c)).catch(() => null).then((v) => {
    stMap[c] = v || null;
  })));
  const stPL = stMap.PL, stPD = stMap.PD, stSA = stMap.SA, stBL = stMap.BL1, stFL = stMap.FL1, stCL = stMap.CL, stPGL = stMap.PGL;
  const normCache = /* @__PURE__ */ new Map();
  const norm = /* @__PURE__ */ __name((name) => {
    let v = normCache.get(name);
    if (v === void 0) {
      v = (0, import_teams.normalizeTeamName)(name);
      normCache.set(name, v);
    }
    return v;
  }, "norm");
  const top3 = {};
  for (const c of standCodes) {
    const st = stMap[c];
    if (st && st.started !== false && Array.isArray(st.teams)) {
      top3[c] = new Set(st.teams.slice(0, 3).map((t) => norm(t.name)));
    }
  }
  const isTopTeamInvolved = /* @__PURE__ */ __name((m) => {
    const set = top3[m.competition.code];
    if (!set) return false;
    return set.has(norm(m.homeTeam.name)) || set.has(norm(m.awayTeam.name));
  }, "isTopTeamInvolved");
  const isTopTable = /* @__PURE__ */ __name((m) => {
    const set = top3[m.competition.code];
    if (!set) return false;
    return set.has(norm(m.homeTeam.name)) && set.has(norm(m.awayTeam.name));
  }, "isTopTable");
  const top5 = {};
  for (const c of standCodes) {
    const st = stMap[c];
    if (st && st.started !== false && Array.isArray(st.teams)) {
      top5[c] = new Set(st.teams.slice(0, 5).map((t) => norm(t.name)));
    }
  }
  const isSelName = /* @__PURE__ */ __name((name) => {
    masterTeamList();
    return _masterMemo.normSet.has(normAlias(name));
  }, "isSelName");
  const isSelVsTop5 = /* @__PURE__ */ __name((m) => {
    const set = top5[m.competition.code];
    if (!set) return false;
    const selHome = isSelName(m.homeTeam.name);
    const selAway = isSelName(m.awayTeam.name);
    if (!selHome && !selAway) return false;
    return selHome && set.has(norm(m.awayTeam.name)) || selAway && set.has(norm(m.homeTeam.name));
  }, "isSelVsTop5");
  const withTop = /* @__PURE__ */ __name((m) => {
    const p = pubMatch(m);
    p.top = isTopTable(m);
    p.clash = isMasterClash(m);
    p.sel = hasSelectedTeam(m);
    return p;
  }, "withTop");
  const eom = new Date(now);
  eom.setMonth(eom.getMonth() + 1, 0);
  eom.setHours(23, 59, 59, 999);
  const liveRank = /* @__PURE__ */ __name((m) => isLiveStatus(m.status) ? 0 : 1, "liveRank");
  const select = /* @__PURE__ */ __name((pool) => ({
    upcoming: pool.filter((m) => (shouldNotify(m) || isTopTeamInvolved(m)) && m.status !== "FINISHED" && (isLiveStatus(m.status) || new Date(m.utcDate).getTime() > now) && new Date(m.utcDate).getTime() <= eom.getTime()).sort((a, b) => liveRank(a) - liveRank(b) || new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime()).slice(0, 50),
    // v12.5: "نتایج اخیر" must carry the whole week — the old 12-hour window
    // emptied the card every morning after a matchday, so this week's CL
    // results (the exact ones the bot notified on Telegram) never showed.
    // 7 days covers the weekend league round + midweek continental rounds;
    // newest first. v12.32: cap raised 12 \u2192 20 \u2014 the client's \xAB\u0628\u06CC\u0634\u062A\u0631\xBB
    // expander shows the latest 20 (5 by default; PC and phones alike).
    finished: pool.filter((m) => (shouldNotify(m) || isTopTeamInvolved(m)) && m.status === "FINISHED" && now - new Date(m.utcDate).getTime() < 7 * 864e5).sort((a, b) => new Date(b.utcDate).getTime() - new Date(a.utcDate).getTime()).slice(0, 20)
  }), "select");
  let { upcoming, finished } = select(matches);
  const BOX_NEAR_MS = 7 * 864e5;
  const lgPool = matches.filter((m) => m.status !== "FINISHED" && isDomesticLeagueCode(m.competition.code) && (isLiveStatus(m.status) || new Date(m.utcDate).getTime() > now && new Date(m.utcDate).getTime() <= now + 90 * 864e5)).sort((a, b) => liveRank(a) - liveRank(b) || new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime());
  const bigLgOf = /* @__PURE__ */ __name((m) => isMasterClash(m) || isDerby(m) || isTopTable(m), "bigLgOf");
  const byKick = /* @__PURE__ */ __name((a, b) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime(), "byKick");
  const lgBig = lgPool.filter((m) => bigLgOf(m)).sort(byKick);
  const lgRest = lgPool.filter((m) => !bigLgOf(m) && isSelVsTop5(m)).sort(byKick);
  const topSpotPicked = [];
  const topSpotKeys = /* @__PURE__ */ new Set();
  const addBox = /* @__PURE__ */ __name((m) => {
    const k = String(m.id || "") + "|" + m.utcDate;
    if (topSpotKeys.has(k) || topSpotPicked.length >= 11) return;
    topSpotKeys.add(k);
    topSpotPicked.push(m);
  }, "addBox");
  lgBig.slice(0, 11).forEach(addBox);
  lgRest.forEach(addBox);
  const topSpotList = topSpotPicked.sort(byKick);
  const topSpotNext = topSpotList[0] || null;
  const featured = matches.filter((m) => m.status !== "FINISHED" && (isFeaturedMatch(m) || isMasterPair(m)) && (isLiveStatus(m.status) || new Date(m.utcDate).getTime() > Date.now())).sort((a, b) => (isLiveStatus(a.status) ? 0 : 1) - (isLiveStatus(b.status) ? 0 : 1) || new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime());
  const nextBig = featured.length ? pubMatch(featured[0]) : null;
  const standings = {};
  standCodes.forEach((c) => {
    standings[c] = Object.assign({ code: c, name: COMP_EN[c] || c, faName: translateCompetition(c), emblem: LEAGUE_LOGOS[c] || null }, compact(stMap[c]));
  });
  standings.PGL = Object.assign({ code: "PGL", name: COMP_EN.PGL || "Persian Gulf Pro League", faName: translateCompetition("PGL"), emblem: LEAGUE_LOGOS.PGL || null }, compact(stPGL));
  const tierOf = /* @__PURE__ */ __name((code) => CONFIG.INTL_COMPETITIONS[code] ? "gold" : code === "CL" ? "gold" : code === "EL" ? "silver" : code === "ECL" ? "bronze" : "domestic", "tierOf");
  const countryOf = /* @__PURE__ */ __name((code) => ({ "FA_CUP": "EN", "EFL_CUP": "EN", "CDR": "ES", "COPPA_ITALIA": "IT", "DFB_POKAL": "DE", "HAZFI_CUP": "IR" })[code] || null, "countryOf");
  const cupOrder = ["EL", "ECL", ...Object.keys(CONFIG.INTL_COMPETITIONS), "FA_CUP", "EFL_CUP", "CDR", "COPPA_ITALIA", "DFB_POKAL", "HAZFI_CUP"];
  const EURO_LL_START = +new Date(CONFIG.CUP_PHASE_WINDOWS.EURO_LL_START);
  const FA_ROUND1 = +new Date(CONFIG.CUP_PHASE_WINDOWS.FA_ROUND1);
  const cupsRaw = cupOrder.map((code) => {
    const next = matches.filter((m) => {
      if (m.competition.code !== code) return false;
      if (m.status === "FINISHED") return false;
      if (!(isLiveStatus(m.status) || new Date(m.utcDate).getTime() > Date.now())) return false;
      if (code === "FA_CUP" && new Date(m.utcDate).getTime() < FA_ROUND1) return false;
      return true;
    }).sort((a, b) => (isLiveStatus(a.status) ? 0 : 1) - (isLiveStatus(b.status) ? 0 : 1) || new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime())[0];
    const qualifying = !!(next && (code === "EL" || code === "ECL") && new Date(next.utcDate).getTime() < EURO_LL_START);
    return {
      code,
      name: COMP_EN[code] || code,
      faName: translateCompetition(code),
      emblem: LEAGUE_LOGOS[code] || null,
      tier: tierOf(code),
      country: countryOf(code),
      next: next ? pubMatch(next) : null,
      qualifying
    };
  });
  const cups = cupsRaw.filter((c) => !(CONFIG.INTL_COMPETITIONS[c.code] && !c.next));
  const clMatches = matches.filter((m) => m.competition.code === "CL" && m.status !== "FINISHED" && (isLiveStatus(m.status) || new Date(m.utcDate).getTime() > Date.now() && new Date(m.utcDate).getTime() <= Date.now() + 90 * 864e5)).sort((a, b) => (isLiveStatus(a.status) ? 0 : 1) - (isLiveStatus(b.status) ? 0 : 1) || new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime()).slice(0, 16);
  const clBox = clMatches.filter((m) => hasSelectedTeam(m)).slice(0, 8);
  const uclStarted = stCL ? stCL.started !== false : true;
  const clubsCat = await env.STATE.get(CONFIG.KV_CLUBS_CATALOG, "json").catch(() => null);
  const crestMap = /* @__PURE__ */ new Map();
  if (clubsCat && Array.isArray(clubsCat.clubs)) {
    for (const c of clubsCat.clubs) {
      if (c && c.n && c.c) crestMap.set((0, import_teams.normTeamKey)(c.n), c.c);
    }
  }
  const crestOf = /* @__PURE__ */ __name((n) => n ? crestMap.get((0, import_teams.normTeamKey)(n)) || null : null, "crestOf");
  const ucl = {
    emblem: LEAGUE_LOGOS.CL || null,
    matchday: stCL ? stCL.matchday : null,
    started: uclStarted,
    // Pre-draw: count down to the projected league-phase kickoff instead of
    // showing nothing; real first fixture wins the moment it exists.
    firstStart: !uclStarted && !clMatches.length ? projectedUclStart().toISOString() : null,
    // v12.16: FULL detail per team — the UCL card is a complete league table
    // now (MP / W / D / L / GD / Pts columns), not just points.
    // v12.18: + crest (the round club logo the user asked for).
    teams: stCL ? stCL.teams.map((t) => ({ pos: t.pos, name: t.name, faName: translateTeam(t.name), crest: crestOf(t.name), points: t.points, played: t.played, won: t.won, draw: t.draw, lost: t.lost, gf: t.gf, ga: t.ga, gd: t.gd != null ? t.gd : t.gf != null && t.ga != null ? t.gf - t.ga : null })) : null,
    matches: clBox.map(pubMatch)
  };
  const tNow = getNowTehran(env);
  const daysSinceSat = (tNow.getUTCDay() + 1) % 7;
  const tehranWallMs = Date.UTC(tNow.getUTCFullYear(), tNow.getUTCMonth(), tNow.getUTCDate(), tNow.getUTCHours(), tNow.getUTCMinutes());
  const offsetMs = tehranWallMs - Date.now();
  // v12.51: thisWeek is now a 7-day window from NOW (not from Saturday).
  // Was Saturday-based which meant mid-week users only saw the remaining
  // days of the Persian week, not a full 7-day lookahead.
  const weekStart = Date.now();
  const weekEnd = weekStart + 7 * 864e5;
  const thisWeek = matches.filter((m) => (shouldNotify(m) || isTopTeamInvolved(m)) && new Date(m.utcDate).getTime() >= weekStart && new Date(m.utcDate).getTime() < weekEnd).sort((a, b) => liveRank(a) - liveRank(b) || new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime()).slice(0, 16);
  const nextWeek = matches.filter((m) => (shouldNotify(m) || isTopTeamInvolved(m)) && new Date(m.utcDate).getTime() >= weekEnd && new Date(m.utcDate).getTime() < weekEnd + 7 * 864e5).sort((a, b) => liveRank(a) - liveRank(b) || new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime()).slice(0, 16);
  const data = { upcoming: upcoming.filter((m) => !topSpotKeys.has(String(m.id || "") + "|" + m.utcDate)).map(withTop), finished: finished.map(withTop), nextBig, topSpot: { next: topSpotNext ? withTop(topSpotNext) : null, matches: topSpotList.map(withTop) }, thisWeek: thisWeek.map(withTop), nextWeek: nextWeek.map(withTop), standings, cups, ucl, fetchedAt: null };
  const poolMeta = matches ? await env.STATE.get(CONFIG.KV_MATCHES_KEY, "json").catch(() => null) : null;
  data.fetchedAt = poolMeta && poolMeta.fetchedAt || (/* @__PURE__ */ new Date()).toISOString();
  // v12.x-resilience: snapshot fallback. If the live sweep failed OR the
  // pool came back empty (no matches at all from the API), try the long-TTL
  // snapshot in KV \u2014 a stale week of fixtures is still better than empty
  // cards. The data is tagged with `cached: true` + `cachedAt` so the page
  // can show a subtle "cached data" indicator to the user. The 5-min KV
  // cache (above) is still the fast path; this is the last-resort fallback.
  // NOTE: we do NOT fall back when the live sweep succeeded but the upcoming
  // list is empty (e.g. matches exist but all are far-out or unfollowed) \u2014
  // that case still has standings/UCL/cups to render and should NOT use the
  // stale snapshot.
  const poolEmpty = !matches || (Array.isArray(matches) && matches.length === 0);
  if ((liveSweepFailed || poolEmpty) && CONFIG.KV_PUBLIC_SNAPSHOT) {
    const snap = await env.STATE.get(CONFIG.KV_PUBLIC_SNAPSHOT, "json").catch(() => null);
    if (snap && snap.data && (snap.data.upcoming || snap.data.finished || snap.data.topSpot || snap.data.ucl || snap.data.standings)) {
      const stale = Object.assign({}, snap.data, { cached: true, cachedAt: snap.ts ? new Date(snap.ts).toISOString() : snap.data.fetchedAt });
      // Re-write the short-TTL cache too so the next visitor in the next 5
      // min doesn't all hammer the failing API again \u2014 they all get the
      // stale snapshot from the short cache.
      await env.STATE.put(CONFIG.KV_PUBLIC_MATCHES, JSON.stringify({ ts: Date.now(), data: stale }), { expirationTtl: 60 }).catch(() => {});
      return stale;
    }
  }
  if (upcoming.length || finished.length) {
    await env.STATE.put(CONFIG.KV_PUBLIC_MATCHES, JSON.stringify({ ts: Date.now(), data }), { expirationTtl: 300 }).catch(() => {
    });
    // v12.x-resilience: refresh the 7-day snapshot ONLY when the live sweep
    // succeeded with real data \u2014 otherwise we'd overwrite the snapshot
    // with empty arrays and lose the fallback.
    if (CONFIG.KV_PUBLIC_SNAPSHOT) {
      await env.STATE.put(CONFIG.KV_PUBLIC_SNAPSHOT, JSON.stringify({ ts: Date.now(), data }), { expirationTtl: CONFIG.KV_PUBLIC_SNAPSHOT_TTL || (7 * 24 * 60 * 60) }).catch(() => {
      });
    }
  } else {
    await env.STATE.put(CONFIG.KV_PUBLIC_MATCHES, JSON.stringify({ ts: Date.now(), data }), { expirationTtl: 60 }).catch(() => {
    });
  }
  return data;
}
__name(fetchPublicMatches, "fetchPublicMatches");
__name2(fetchPublicMatches, "fetchPublicMatches");
var UCL_STARBALL_D = "m293.4 123.4c-0.2 0.5-0.7 0.8-1.3 0.9-12.6 1.5-26.0-0.3-31.2-1.1-8.6-8.6-18.0-18.2-24.9-26.6-0.7-0.9-0.7-2.1-0.1-3.0 9.8-13.7 18.8-24.6 22.6-28.9 10.9-2.4 21.7-4.5 29.0-4.8 0.6-0.0 1.1 0.2 1.4 0.7 9.4 13.1 16.2 25.7 18.4 30.3-4.3 11.6-9.5 23.4-14.0 32.5zm-12.0 22.2c-7.0 11.7-12.2 18.7-13.9 20.8-2.3 3.2-8.2 11.7-17.3 20.3-0.6 0.5-1.3 0.9-2.1 0.9-11.4 0.5-22.0-0.3-26.1-1.2-3.5-1.4-11.6-5.1-21.3-10.4-0.8-0.5-1.3-1.4-1.3-2.3 0.5-7.5 2.9-18.1 5.0-29.3 5.2-9.1 10.5-19.5 16.1-28.0 0.6-0.9 1.7-1.3 2.7-1.0 16.7 4.5 31.1 8 37.0 9.3 8.0 9.3 15.8 15.9 21.1 19.9 0.3 0.3 0.4 0.7 0.2 1.1zm-100.8 16.2c-0.8 0.5-1.9 0.5-2.7-0.1-7.3-5.1-15.9-11.7-23.1-18.4-4.3-7.3-7.5-16.6-9.8-24.5-0.1-0.5-0.0-1.1 0.3-1.5 8.1-9.9 17.8-17.8 21.9-20.8 9.2 3.9 19.7 7.4 28.9 10.5 0.9 0.3 1.6 1.2 1.7 2.1 1.3 16.4 4.3 29.6 5.1 34.6-3.4 3.7-12.4 12.0-22.1 18.0zm-40.3-64.3c-1.2-7.7-2.0-15.8-2.1-19.5-0.2-8.6 1.2-16.2 2.7-23.2 0.3-1.2 0.9-2.2 1.7-3.0 4.6-4.2 12.9-11.6 18.1-15.0 4.9-3.2 18.7-7.6 24.3-9.2 1.1-0.3 2.3 0.2 2.8 1.2 0.7 1.2 1.4 2.4 2.1 3.6 4.5 6.9 9.4 12.9 11.4 15.5-2.7 10.9-3.9 23.1-4.4 33.4-0.1 1.0-0.7 1.8-1.6 2.2-14.3 5.6-25.2 10.0-28.8 11.6-9.8 0.4-19.2 2.1-25.6 3.2-0.4 0.1-0.9-0.2-0.9-0.7zm72.3-74.8c0.4-0.6 1.0-1.0 1.8-1.1 14.7-1.9 28.2-2.2 33.4-2.1 9.4 6.3 18.6 14.5 26.0 22.4 0.5 0.6 0.6 1.4 0.2 2.0-5.2 8.2-12.9 16.1-16.2 19.5-12.4 2.9-25.6 7.2-36.3 10.7-1.0 0.3-2.2-0.0-2.8-0.9-8.1-11.8-13.3-21.9-15.3-25.7 2.2-9.8 5.3-18.6 9.3-24.9zm98.5 96.8c-0.3 0.1-0.6-0.1-0.6-0.4-0.6-12.1-1.7-23.9-2.3-28.2 0.0-10.5-1.7-21.3-3.4-29.3-0.1-0.3 0.2-0.5 0.5-0.5 9.9 2.0 13.1 5.7 13.1 5.7-5.2-11.7-12.8-20.6-21.0-27.3-7.0-14.7-15.1-21.5-15.1-21.5 0.7 3.2 0.2 6.9-1.0 10.7-0.1 0.2-0.3 0.4-0.6 0.2-13.4-6.6-27.3-9.6-32.7-10.3-8.0-3.9-16.8-6.5-23.9-8.4-0.2-0.1-0.2-0.3-0.1-0.4 9.5-7.8 18.2-9.8 18.2-9.8-15.4-0.6-28.7 2.2-39.7 6.4-16.6-1.3-27.1 1.6-27.1 1.6s4.6 5.5 6.4 8.5c0.2 0.4 0.1 0.8-0.2 1.1-10.4 7.2-17.9 15.1-20.8 18.4-3.3 0.4-9.0 1.2-13.9 2.5-0.2 0.0-0.4-0.1-0.3-0.3 5.0-11.8 10.4-18.4 10.4-18.4s-32.0 22.7-38.0 63.4c0 0 2.6-7.2 11.5-18.2 0.1-0.1 0.3-0.1 0.4 0.1 2.5 5.6 5.4 10.5 6.9 12.8-4.9 7.9-8.3 16.5-10.4 23.5-0.1 0.2-0.3 0.4-0.5 0.5-7.4 2.8-9.3 5.5-9.3 5.5 1.2 3.9 3.4 7.8 6.3 11.4 0.2 0.3 0.4 0.7 0.4 1.1-0.8 17.4 4.8 28.8 4.8 28.8 1.3-6.1 3.8-12.0 6.9-17.5 0.1-0.2 0.4-0.3 0.6-0.1 7.3 5.8 14.9 10.9 17.9 12.7 1.5 4.0 6.0 14.2 11.9 24.7 0.1 0.2 0.0 0.5-0.2 0.6-7.1 2.6-14.4 3.8-21.1 2.1 0 0 8.1 10.0 32.9 14.3 6.9 8.1 15.3 14.9 25.1 17.2 0 0-2.9-3.2-3.6-14.9-0.0-0.2 0.2-0.4 0.4-0.4 6.1 0.1 14.4 0.2 22.1-0.3 2.7 2.1 8.6 6.8 14.3 9.8 0.3 0.1 0.3 0.6 0.0 0.7-10.1 6.1-16.8 6.6-16.8 6.6 45.7 1.0 73.2-28.8 73.2-28.8-7.5 4.9-16.2 8.0-24.9 9.9-0.3 0.1-0.5-0.2-0.5-0.5 1.6-7.8 1.2-15.3 1.0-17.9 10.8-2.7 20.3-7.5 27.3-12.5 0.1-0.1 0.3-0.1 0.50 2.9 2.0 5.4 4.3 7.9 8.1 0 0 4.7-6.7 6.4-22.2 11.7-15.3 13.5-31.0 13.5-31.0-2.9 4.6-7.4 7.9-12.6 10.3zm-90.5 151.2c-19.6 0-37.4 8.8-48.3 21.7l3.4 4.2c9.9-12.2 26.6-20.7 44.8-20.7 18.2 0 35.0 8.4 44.8 20.7l3.4-4.2c-10.9-12.9-28.6-21.7-48.3-21.7zm-45.9 2.7c-1.3 1.0-2.8 1.6-4.1 1.4-1.7-0.2-2.7-0.9-4.4-2.9l-9.6-11.8-5.2 4.2 10.5 12.9c2.2 2.7 4.8 4.2 7.8 4.5 0.4 0.0 0.7 0.1 1.1 0.1 2.9 0.0 5.6-1.0 8.2-3.1 2.9-2.4 4.5-5.1 4.9-8.4 0.3-3.0-0.6-5.8-2.8-8.5l-10.5-12.9-5.2 4.2 9.6 11.8v0c1.7 2.0 2.1 3.2 2.0 4.9-0.1 1.3-0.9 2.7-2.2 3.7zm35.5-37.2-16.8 3.4c-0.8 0.2-1.4 0.5-1.8 1.1-0.4 0.6-0.5 1.3-0.3 2.0l3.3 16.5c0.5 2.7 1.7 4.6 3.6 5.7 1.2 0.7 2.7 1.1 4.3 1.1 0.90 1.8-0.1 2.7-0.3l10.5-2.1-1.3-6.2-10.2 2.1c-2.1 0.4-2.8 0.2-3.2-2.2l-0.4-1.8 11.8-2.4-1.2-6.1-11.8 2.4-0.9-4.4 12.9-2.6-1.3-6.2zm32.7 9.0 10.1 2.6 1.6-6.1-10.4-2.7c-5.7-1.5-9.6 0.7-10.9 6.0l-4.2 16.3c-0.2 0.8-0.1 1.5 0.2 2.1 0.3 0.6 0.9 1.0 1.7 1.2l3.8 1.0 2.7-10.5 11.7 3.0 1.6-6.1-11.7-3.0 0.5-1.7c0.6-2.3 1.3-2.5 3.4-2.0zm52.2 14.9 3.6-4.4c-1.8-1.8-3.6-3.5-5.5-5.1-19.9-17.1-45.6-26.6-72.5-26.6-26.9 0-52.6 9.4-72.5 26.6-1.9 1.6-3.8 3.4-5.5 5.1l3.6 4.4c1.8-1.8 3.7-3.6 5.6-5.3 18.9-16.3 43.3-25.2 68.9-25.2s50.0 8.9 68.9 25.2c2.0 1.7 3.8 3.4 5.6 5.3zm-27.1 21.7 1.2-4.0-5.0-3.7 4.0-2.9 2.3 1.7 2.6-8.8-15.2 9.8-6.2-3.5 23.9-15.4c0.9-0.6 2.2-1.1 3.8 0.1l1.0 0.8c1.6 1.2 1.4 2.7 1.1 3.6l-7.9 27.3-5.5-5.0zm-112.5 129.1h-17.6v-13.5h10.5l4.3 3.7h0.1v-13.8h-0.1l-4.3 3.7h-10.5v-11.8h17l4.9 5.3h0.1l-0.6-11.7h-36.3v0.1l3.3 4.0v36.3l-3.3 4.0v0.1h37.8l0.9-13.4h-0.1l-6.2 7.0zm6.7-89.8 12.5 31.8h7.0l11.6-32.2 2.0 28.0-4.4 4.0v0.1h19.0v-0.1l-3.7-4.0-2.7-36.3 2.9-4.0v-0.1h-15.8l-10.7 29.8-11.6-29.8h-16.0v0.1l3.2 4.0-1.9 36.3-3.9 4.0v0.1h15.6v-0.1l-3.9-4.0 0.8-27.7zm-52.5 89.7h-15.3v-33.9l4.2-4.0v-0.1h-18.9v0.1l3.3 4.0v36.3l-3.3 3.9v0.2h35.5l1.7-14.0h-0.1l-7.0 7.5zm-34.2-58.1v0.1h18.0v-0.1l-3.3-4.0v-36.3l3.3-4.0v-0.1h-18.0v0.1l3.2 4.0v13.5h-16.0v-13.5l3.2-4.0v-0.1h-18.0v0.1l3.3 4.0v36.3l-3.3 4.0v0.1h18.0v-0.1l-3.2-4.0v-15.7h16.0v15.7l-3.2 4.0zm280.9 58.1h-17.6v-13.5h10.5l4.3 3.7h0.1v-13.8h-0.1l-4.3 3.7h-10.5v-11.8h17.0l4.9 5.3h0.1l-0.6-11.7h-36.3v0.1l3.3 4.0v36.3l-3.3 4.0v0.1h37.8l0.9-13.4h-0.1l-6.2 7.0zm-161.9-11.3-5.3-17.7-6.2 17.7h11.5zm15.8 13.7 3.7 4.0v0.1h-19.1v-0.1l3.7-4.0-2.0-7.0h-15.8l-2.4 7.0 3.5 4.0v0.1h-15.0v-0.1l3.5-4.0 13.8-36.3-2.6-4.0v-0.1h15.2l13.7 40.5zm-183.2-66.2c-9.2 0-15.0-9.3-15.0-17.3 0-9.9 5.4-16.3 13.0-16.3 2.0 0 4.0 0.2 5.8 0.7l6.9 8.5h0.1l-0.5-14.1c-2.0-0.8-6.3-1.8-11.6-1.8-16.4 0-25.7 11.1-25.7 23.9 0 12.7 9.0 23.8 24.5 23.8 4.2 0 10.3-1.4 14.5-4.6l0.6-7.4h-0.1c-3.6 2.8-8.7 4.5-12.6 4.5zm256.9 5.8-3.2-4.0v-36.3l3.2-4.0v-0.1h-18.0v0.1l3.3 4.0v36.3l-3.3 4.0v0.1h18.0v-0.1zm-39.5 43.7 4.4 4.0v8.4c-1.4 1.6-3.9 3.0-7.2 3.0-7.9 0-12.1-9.6-12.1-17.7 0-8.8 4.4-16.2 13.6-16.2 2.5 0 5.2 0.2 7.4 1.0l7.1 7.6h0.1l-0.4-12.2c-4.1-2.1-9.0-3.0-14.0-3.0-15.0 0-25.7 9.2-25.7 24.4 0 12.7 8.2 23.3 20.9 23.3 5.6 0 10.7-1.3 15.4-4.7l5.6 4.7h0.1v-18.4l3.5-4.0v-0.1h-18.8v0.1zm-11.7-65.3c1.4 0.4 3.0 0.6 4.7 0.6 6.2 0 8.9-3.4 8.9-8.4 0-5.9-3.5-8.7-9.9-8.7h-3.7v16.5zm-11.4 17.5v-36.3l-3.3-4.0v-0.1h21.2c12.8 0 18.7 5.8 18.7 14.7 0 9.2-7.0 14.9-16.5 14.9-3.1 0-6.3-0.2-8.6-0.8v11.6l4.7 4.0v0.1h-19.4v-0.1l3.3-4.0zm106.6-14.9c0-7.7-2.9-20.1-12.8-20.1-7.9 0-10.2 7.9-10.2 13.2 0 7.8 3.2 20.4 12.8 20.4 6.8 0 10.2-6.5 10.2-13.6zm-11.9 20.6c-14.0 0-23.0-11.5-23.0-24.5 0-13.4 10.4-23.2 23.3-23.2 14.3 0 23.5 11.2 23.5 24.0 0 14.6-11.1 23.7-23.8 23.7zm-14.9 18.5 3.7 4.0v25.4c0 7.3-3.6 9.1-9.5 9.1-5.9 0-9.5-1.7-9.5-9.1v-25.4l3.7-4.0v-0.1h-18.4v0.1l3.3 4.0v25.4c0 12.2 6.2 16.6 19.5 16.6 12.1 0 18.2-4.2 18.2-16.3v-25.8l3.2-4.0v-0.1h-14.2v0.1zm85.2 5.5c0-3.2-2.4-5.6-5.5-5.6-3.1 0-5.5 2.4-5.5 5.6 0 3.2 2.4 5.6 5.5 5.6 3.0 0 5.5-2.4 5.5-5.6zm1.4 0c0 3.9-3.1 6.7-6.8 6.7-3.7 0-6.8-2.8-6.8-6.7 0-3.8 3.1-6.7 6.8-6.7 3.7 0 6.8 2.8 6.8 6.7zm-6.8-0.5c1.0 0 1.9-0.1 1.9-1.2 0-1.0-0.9-1.1-1.7-1.1h-1.6v2.4h1.4zm1.1 0.9 2.2 3.4h-1.3l-2.0-3.4h-1.4v3.4h-1.2v-7.7h3.0c1.8 0 2.7 0.7 2.7 2.2 0 1.4-0.9 2.0-2.0 2.1zm-2.9-70.4 4.3 4.0v23.6l-18.1-27.8h-16.3v0.1l3.3 4.0v36.3l-3.3 4.0v0.1h14.9v-0.1l-4.4-4.0v-29.6l22.6 33.7h8.5v-40.5l3.3-4.0v-0.1h-14.8v0.1zm45.5 17.0c-8.1-2.3-10.6-3.2-10.6-7.0 0-4.3 5.6-5.1 9.1-5.1 3.0 0 5.7 0.3 8.2 1.1l6.8 7.3h0.1l-0.6-12.6c-4.2-1.6-8.7-2.5-13.8-2.5-10.7 0-20.9 3.7-20.9 14.2 0 6.8 4.7 10.9 15.0 13.7 7.9 2.2 11.8 3.6 11.8 7.6 0 4.6-5.9 5.6-9.9 5.6-3.3 0-6.3-0.5-8.8-1.3l-6.8-8.4h-0.1l0.5 13.4c4.7 2.1 10.3 2.9 15.6 2.9 11.4 0 21.0-4.8 21.0-14.4 0-9.1-6.3-11.7-16.6-14.6zm-309.7 9.6h11.5l-5.3-17.7-6.2 17.7zm-1.3 17.8h-15.0v-0.1l3.5-4.0 13.8-36.3-2.6-4.0v-0.1h15.2l13.7 40.5 3.7 4.0v0.1h-19.1v-0.1l3.7-4.0-2.0-7.0h-15.8l-2.4 7.0 3.5 4.0v0.1z";
var UCL_LOGO_CHIP = '<svg viewBox="117 0 206 204" aria-hidden="true" focusable="false"><path fill="#3b5fad" d="' + UCL_STARBALL_D + '"/></svg>';
var UCL_BALL = '<svg viewBox="117 0 206 204" aria-hidden="true" focusable="false"><circle cx="220" cy="102" r="103" fill="#0e2058"/><path fill="#ffffff" d="' + UCL_STARBALL_D + '"/></svg>';
var PUBLIC_PAGE = `<!doctype html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta name="theme-color" content="#0f172a">
<meta name="apple-mobile-web-app-title" content="SportSignal">
<meta name="application-name" content="SportSignal">
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta name="theme-color" content="#0f172a">
<meta name="apple-mobile-web-app-title" content="SportSignal">
<meta name="application-name" content="SportSignal">
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta name="theme-color" content="#0f172a">
<meta name="apple-mobile-web-app-title" content="SportSignal">
<meta name="application-name" content="SportSignal">
<!-- v12.x-live-lottie: the dotLottie player web component — renders the
     Live.lottie animation (a pulsing "LIVE" badge) used as the live-chip
     for live-broadcasting games. Loaded from the LottieFiles CDN. The
     <dotlottie-player> custom element is used in the livechip + the
     #liveCard h2 heading. -->
<script src="https://unpkg.com/@lottiefiles/lottie-player@latest/dist/lottie-player.js"></script>
<meta name="description" content="\u0645\u0633\u0627\u0628\u0642\u0627\u062A \u067E\u06CC\u0634\u200C\u0631\u0648\u060C \u0631\u0642\u0627\u0628\u062A\u200C\u0647\u0627\u06CC \u0635\u062F\u0631 \u062C\u062F\u0648\u0644 \u0648 \u0646\u062A\u0627\u06CC\u062C \u062A\u06CC\u0645\u200C\u0647\u0627\u06CC \u0645\u0646\u062A\u062E\u0628 \u2014 \u0628\u0647\u200C\u0631\u0648\u0632\u0631\u0633\u0627\u0646\u06CC \u062E\u0648\u062F\u06A9\u0627\u0631">
<meta property="og:type" content="website">
<meta property="og:title" content="SportSignal \u2014 \u0645\u0633\u0627\u0628\u0642\u0627\u062A \u067E\u06CC\u0634\u200C\u0631\u0648">
<meta property="og:description" content="\u0645\u0633\u0627\u0628\u0642\u0627\u062A \u067E\u06CC\u0634\u200C\u0631\u0648\u060C \u0631\u0642\u0627\u0628\u062A\u200C\u0647\u0627\u06CC \u0635\u062F\u0631 \u062C\u062F\u0648\u0644 \u0648 \u0646\u062A\u0627\u06CC\u062C \u062A\u06CC\u0645\u200C\u0647\u0627\u06CC \u0645\u0646\u062A\u062E\u0628">
<meta property="og:url" content="https://football.sportsignal.ir/">
<meta property="og:image" content="https://football.sportsignal.ir/android-chrome-512x512.png">
<meta property="og:locale" content="fa_IR">
<meta property="og:locale:alternate" content="en_US">
<meta property="og:site_name" content="SportSignal">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="SportSignal \u2014 \u0645\u0633\u0627\u0628\u0642\u0627\u062A \u067E\u06CC\u0634\u200C\u0631\u0648">
<meta name="twitter:description" content="\u0645\u0633\u0627\u0628\u0642\u0627\u062A \u067E\u06CC\u0634\u200C\u0631\u0648\u060C \u0631\u0642\u0627\u0628\u062A\u200C\u0647\u0627\u06CC \u0635\u062F\u0631 \u062C\u062F\u0648\u0644 \u0648 \u0646\u062A\u0627\u06CC\u062C \u062A\u06CC\u0645\u200C\u0647\u0627\u06CC \u0645\u0646\u062A\u062E\u0628">
<meta name="twitter:image" content="https://football.sportsignal.ir/android-chrome-512x512.png">
<link rel="canonical" href="https://football.sportsignal.ir/">
<link rel="preload" href="/fonts/Vazirmatn-Regular.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/fonts/Vazirmatn-Bold.woff2" as="font" type="font/woff2" crossorigin>
<script type="application/ld+json">{"@context":"https://schema.org","@type":"WebSite","name":"SportSignal","alternateName":"\u0627\u0633\u067E\u0648\u0631\u062A \u0633\u06CC\u06AF\u0646\u0627\u0644","url":"https://football.sportsignal.ir/","description":"\u0645\u0633\u0627\u0628\u0642\u0627\u062A \u067E\u06CC\u0634\u200C\u0631\u0648\u060C \u0631\u0642\u0627\u0628\u062A\u200C\u0647\u0627\u06CC \u0635\u062F\u0631 \u062C\u062F\u0648\u0644 \u0648 \u0646\u062A\u0627\u06CC\u062C \u062A\u06CC\u0645\u200C\u0647\u0627\u06CC \u0645\u0646\u062A\u062E\u0628","inLanguage":["fa","en"]}<\/script>
<script>try{var t=localStorage.getItem("ucl_theme")||"dark",l=localStorage.getItem("ucl_lang")||"fa",d=document.documentElement;d.setAttribute("data-theme",t);d.setAttribute("lang",l);d.setAttribute("dir",l==="en"?"ltr":"rtl");}catch(e){}<\/script>
<title data-i="title">\u0645\u0633\u0627\u0628\u0642\u0627\u062A \u067E\u06CC\u0634\u0631\u0648 \u2014 \u0627\u0639\u0644\u0627\u0646\u200C\u062F\u0647\u0646\u062F\u0647 \u0645\u0633\u0627\u0628\u0642\u0627\u062A</title>
<style>@font-face{font-family:Vazirmatn;src:url('/fonts/Vazirmatn-Regular.woff2') format('woff2');font-weight:400;font-display:swap}@font-face{font-family:Vazirmatn;src:url('/fonts/Vazirmatn-SemiBold.woff2') format('woff2');font-weight:600;font-display:swap}@font-face{font-family:Vazirmatn;src:url('/fonts/Vazirmatn-Bold.woff2') format('woff2');font-weight:700;font-display:swap}@font-face{font-family:Vazirmatn;src:url('/fonts/Vazirmatn-ExtraBold.woff2') format('woff2');font-weight:800;font-display:swap}</style>
<style>
:root{color-scheme:dark;--bg:#0f172a;--card:#1e293b;--field:#0f172a;--text:#e2e8f0;--muted:#94a3b8;--border:#334155;--accent:#2563eb;--accent-strong:#1d4ed8;--link:#93c5fd;--score:#4ade80;--countdown:#93c5fd;--countdown-bg:rgba(96,165,250,.12);--danger:var(--t-danger);--chip:#334155;--hover:rgba(148,163,184,.08);--footer:#94a3b8;--glass:rgba(30,41,59,.55);--glass-border:rgba(148,163,184,.16);--glass-hi:rgba(255,255,255,.07);--glass-shadow:0 8px 32px rgba(0,0,0,.35);--glow1:rgba(37,99,235,.17);--glow2:rgba(29,78,216,.11);--scrim:rgba(2,6,23,.62);--rowsurf:rgba(15,23,42,.42);--t-primary:#2563eb;--t-success:#15803d;--t-success-ink:#4ade80;--t-success-soft:rgba(34,197,94,.14);--t-success-line:rgba(34,197,94,.35);--t-warning:#b45309;--t-highlight:#7e22ce;--t-danger:#f87171;--t-neutral:#334155;--t-neutral-soft:rgba(148,163,184,.14);--badge-top:#b45309;--badge-hot:var(--t-warning);--badge-derby:var(--t-highlight);--badge-league:var(--t-neutral);--badge-live:var(--t-success-ink);--nav-link:#cbd5e1;--nav-link-hover:#f1f5f9;--pill-primary-bg:var(--accent);--pill-primary-ink:#fff;--pill-primary-line:rgba(255,255,255,.22);--pill-hype-bg:linear-gradient(90deg,var(--badge-hot),var(--badge-derby));--pill-hype-ink:#fff;--pill-hype-line:rgba(255,255,255,.18);--pill-neutral-bg:rgba(148,163,184,.16);--pill-neutral-ink:#e2e8f0;--pill-neutral-line:rgba(148,163,184,.28)}
[data-theme="light"]{color-scheme:light;--bg:#f8fafc;--card:#ffffff;--field:#f8fafc;--text:#0f172a;--muted:#64748b;--border:#e2e8f0;--accent:#2563eb;--accent-strong:#1d4ed8;--link:#1d4ed8;--score:#15803d;--countdown:#2563eb;--countdown-bg:rgba(37,99,235,.1);--danger:var(--t-danger);--chip:#e2e8f0;--hover:rgba(15,23,42,.045);--footer:#64748b;--glass:rgba(255,255,255,.62);--glass-border:rgba(15,23,42,.08);--glass-hi:rgba(255,255,255,.7);--glass-shadow:0 8px 32px rgba(15,23,42,.08);--glow1:rgba(37,99,235,.09);--glow2:rgba(96,165,250,.08);--scrim:rgba(248,250,252,.78);--rowsurf:rgba(241,245,249,.72);--t-primary:#2563eb;--t-success:#15803d;--t-success-ink:#15803d;--t-success-soft:rgba(21,128,61,.12);--t-success-line:rgba(21,128,61,.32);--t-warning:#b45309;--t-highlight:#7e22ce;--t-danger:#dc2626;--t-neutral:#e2e8f0;--t-neutral-soft:rgba(15,23,42,.05);--badge-top:#b45309;--badge-hot:var(--t-warning);--badge-derby:var(--t-highlight);--badge-league:var(--t-neutral);--badge-live:var(--t-success-ink);--nav-link:#334155;--nav-link-hover:#0f172a;--pill-primary-bg:var(--accent);--pill-primary-ink:#fff;--pill-primary-line:rgba(255,255,255,.22);--pill-hype-bg:linear-gradient(90deg,var(--badge-hot),var(--badge-derby));--pill-hype-ink:#fff;--pill-hype-line:rgba(255,255,255,.18);--pill-neutral-bg:rgba(15,23,42,.08);--pill-neutral-ink:#1e293b;--pill-neutral-line:rgba(15,23,42,.16)}
html{overflow-x:hidden;scroll-behavior:smooth}/* v12.23 (the user's bug report): the floodlight sweep once rode an UNCLIPPED .card.bighero::after translating to \xB1140% of the card \u2014 every pass (6.5s, faster when urgent) widened the DOCUMENT's scrollable width, so a scrollbar popped in and out and the page visibly "heartbeat" every few seconds (a slide flash on phones). Every animated layer is now clipped inside its card; this root clip is the hard net so no fx can ever widen the page again. */
body{font-family:'Vazirmatn',system-ui,sans-serif;background-color:var(--bg);color:var(--text);max-width:760px;margin:0 auto;padding:24px 20px 36px;line-height:1.6;-webkit-font-smoothing:antialiased;transition:background .25s,color .25s}body::before{content:"";position:fixed;inset:0;z-index:-1;background:radial-gradient(900px 520px at 88% -8%,var(--glow1),transparent 60%),radial-gradient(820px 620px at -12% 32%,var(--glow2),transparent 60%),linear-gradient(var(--scrim),var(--scrim)),url('/bg.jpg') center/cover no-repeat}
#topbar{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:10px;position:relative}
#topbar button{background:var(--glass);-webkit-backdrop-filter:blur(10px) saturate(1.3);backdrop-filter:blur(10px) saturate(1.3);color:var(--text);border:1px solid var(--glass-border);border-radius:10px;padding:8px 14px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;transition:border-color .15s,transform .15s cubic-bezier(.16,1,.3,1),background .15s}
#topbar button:hover{border-color:var(--accent);background:var(--hover)}
/* v12.27: the cluster's icon buttons are FLAT (transparent, borderless) \u2014 the shell is the chrome \u2014 so their hover swaps a soft fill instead of a border. */
.tb-btns button:hover{border-color:transparent;background:var(--hover)}
.tb-btns button:active{transform:scale(.94)}
#topbar button:active{transform:scale(.96)}
/* v12.24 (the user's ask): the top bar is a real WEBSITE HEADER \u2014 the
   SportSignal logo pinned to the start corner, the settings icons + the
   Telegram CTA grouped at the opposite end: [settings icons] [telegram
   cta] \xB7\xB7\xB7 [logo]. Fixed width/height attrs on the img so the header can
   never shift while loading; the logo png is served from the worker's
   assets directory.
   v12.25: the white plate was retired for the transparent png.
   v12.26 (the user's ask): "in darkmode it turns to a white sillohuette.
   fix this. show the given logo in both light and dark mode" \u2014 the
   TWO-variant swap is RETIRED (the white remap logo-light.png deleted);
   the uploaded logo.png now rides BOTH themes unchanged (its own navy +
   white inks read on dark, its navy reads on light). PC size TRIMMED by
   40% per the ask: 84px \u2192 50px (phones already 50px \u2014 one size fits all). */
.brand{display:inline-flex;align-items:center;text-decoration:none;flex-shrink:0}
.brand img{display:block;height:50px;width:auto;transition:transform .15s cubic-bezier(.16,1,.3,1)}
/* v12.32 (the user's ask): "increase the size of sportsignal logo by 15% in
   pc mode" \u2014 phones keep the compact 50px header height, >=601px the logo
   grows to 57.5px (50 x 1.15); width rides width:auto, so the mark scales
   proportionally with its raster. */
@media (min-width:601px){.brand img{height:57.5px}}
.brand:hover img{transform:none}
/* v12.27 (review items 3+7): the UTILITY CLUSTER \u2014 the settings gear, the
   language switch and the theme toggle live in ONE visually grouped control
   (.tb-btns: 6px internal gap, a subtle glass shell) anchored to the LOGICAL
   inline-end of the header, opposite the logo \u2014 inset-inline-start:auto on
   the .head-actions group (logical properties only, so an LTR flip stays
   correct). The old margin-inline-start:auto on .tb-btns itself is retired:
   it shoved the buttons away from the CTA with an uneven gap that read as
   accidental. Each icon button keeps a 44\xD744px hit area (min-width/height,
   icon visually unchanged) per the touch-target minimum. */
.head-actions{display:flex;align-items:center;flex-wrap:wrap;gap:8px;margin-inline-start:auto}
/* v12.52-mobile-header: Telegram icon button — hidden on desktop, shown
   on mobile where the text CTA is too wide. Uses the same glass button
   styling as the other icon buttons. */
#tgbtn{display:none;align-items:center;justify-content:center;background:var(--glass);-webkit-backdrop-filter:blur(10px) saturate(1.3);backdrop-filter:blur(10px) saturate(1.3);color:var(--text);border:1px solid var(--glass-border);border-radius:10px;width:40px;height:40px;cursor:pointer;transition:border-color .15s,transform .15s cubic-bezier(.16,1,.3,1)}
#tgbtn:hover{border-color:var(--accent);background:var(--hover)}
#tgbtn:active{transform:scale(.96)}
#topbar .cta{margin-top:0}
#topbar .sync{flex:1 1 100%;margin:2px 0 0}
.tb-btns{display:inline-flex;align-items:center;gap:6px;padding:3px;border-radius:14px;background:var(--hover);border:1px solid var(--glass-border)}
.tb-btns button{min-width:44px;min-height:44px;display:inline-flex;align-items:center;justify-content:center;padding:4px 10px;font-size:16px;line-height:1;background:transparent;border:none}
/* v12.19 (the user's ask): the timezone search + select were permanent topbar
   clutter \u2014 they now hide behind ONE settings-gear button next to the theme
   toggle. The popover is a glass card with a full-width search + select (far
   bigger touch targets than the old 100px sliver); picking a zone, the \u2715,
   the gear again, an outside click or Esc closes it. */
#tzpanel{display:none;position:absolute;top:calc(100% + 10px);inset-inline-end:0;z-index:60;width:min(340px,calc(100vw - 40px));flex-direction:column;gap:8px;background:var(--glass);-webkit-backdrop-filter:blur(12px) saturate(1.4);backdrop-filter:blur(12px) saturate(1.4);border:1px solid var(--glass-border);border-radius:14px;padding:12px;box-shadow:var(--glass-shadow),inset 0 1px 0 var(--glass-hi)}
#tzpanel.open{display:flex}
.tz-head{display:flex;align-items:center;justify-content:space-between;font-size:13px;font-weight:700}
#tzclose{background:none;border:none;color:var(--muted);font-size:15px;line-height:1;cursor:pointer;padding:2px 8px;border-radius:8px;font-family:inherit;transition:color .15s,background .15s}
#tzclose:hover{color:var(--text);background:var(--hover)}
#sbtn[aria-expanded="true"]{transform:rotate(90deg);border-color:var(--accent)}
#tzfilter{background:var(--field);color:var(--text);border:1px solid var(--border);border-radius:10px;padding:9px 11px;font-size:13px;font-family:inherit;width:100%;box-sizing:border-box;transition:border-color .15s}
#tzsel{background:var(--field);color:var(--text);border:1px solid var(--border);border-radius:10px;padding:10px 11px;font-size:13px;font-weight:600;font-family:inherit;cursor:pointer;width:100%;box-sizing:border-box;transition:border-color .15s}
/* v12.x-tz-search-fix: when the select becomes a listbox (size>1 via
   the render function), let it grow to fit the visible rows instead of
   staying at one-line dropdown height. */
#tzsel[size]{height:auto;max-height:280px;overflow-y:auto}
#tzsel:hover{border-color:var(--accent)}
#tzfilter:focus,#tzsel:focus{border-color:var(--accent);outline:none}
:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
h1{font-size:27px;font-weight:800;margin:0 0 6px;letter-spacing:-.01em}
.sub{color:var(--muted);font-size:13.5px;margin:0 0 6px}
.sub a{color:var(--link);text-decoration:none;border-bottom:1px solid transparent;transition:border-bottom-color .15s}
.sub a:hover{border-bottom-color:var(--link)}
/* v12.20: proof for the "auto-updated" claim \u2014 the payload's fetchedAt stamp,
   aged live ("\u06F2 \u062F\u0642\u06CC\u0642\u0647 \u067E\u06CC\u0634" / "2 min ago"). */
.sync{font-size:11.5px;opacity:.9;margin:0 0 4px;font-variant-numeric:tabular-nums}
.cta{display:inline-flex;align-items:center;gap:8px;margin-top:14px;background:var(--accent);color:#fff;font-size:13px;font-weight:600;padding:10px 18px;border-radius:999px;text-decoration:none;transition:background .15s,transform .15s cubic-bezier(.16,1,.3,1),box-shadow .15s}
.cta:hover{background:var(--accent-strong);transform:translateY(-1px);box-shadow:0 6px 16px rgba(37,99,235,.2)}
/* v12.20 (the user's ask): the join CTA vanishes once you scroll into the match
   list \u2014 this sticky bottom bar brings it back (safe-area aware on phones;
   hides again the moment the hero button is back in view). */
#joinSticky{position:fixed;bottom:0;left:0;right:0;z-index:70;display:none;justify-content:center;padding:10px 16px calc(10px + env(safe-area-inset-bottom,0px));background:var(--glass);-webkit-backdrop-filter:blur(14px) saturate(1.4);backdrop-filter:blur(14px) saturate(1.4);border-top:1px solid var(--glass-border);box-shadow:0 -8px 28px rgba(2,6,23,.45);text-decoration:none}
#joinSticky.show{display:flex}
#joinSticky .js-inner{display:inline-flex;align-items:center;gap:9px;background:var(--accent);color:#fff;font-size:13px;font-weight:700;padding:12px 22px;border-radius:999px;transition:background .15s,transform .15s cubic-bezier(.16,1,.3,1)}
#joinSticky .js-inner:hover{background:var(--accent-strong);transform:translateY(-1px)}
#joinSticky svg{flex-shrink:0}
body.joinsticky{padding-bottom:88px}
/* v12.x-tg-fab: a floating Telegram FAB for PC view — a 56px circular
   button in Telegram brand blue (#229ED9) with the white paper-plane
   logo. Fixed to the bottom-RIGHT corner in BOTH Farsi (RTL) and
   English (LTR) — per the user's explicit ask (must be right for both
   English and Farsi). Uses the physical right:24px (not the logical
   inset-inline-start which would flip to left in LTR). Hidden on
   mobile (the #joinSticky bottom bar covers the mobile CTA). The
   header CTA pill (#topbar .cta) is retired on PC; this FAB replaces
   it. The tooltip + aria-label are static Telegram in both
   languages. A subtle pulse animation (2.6s, ease-in-out, infinite)
   draws the eye without being annoying. The FAB has a soft drop
   shadow (filter:drop-shadow follows the circle, unlike box-shadow
   which can render as a square on overflow:hidden + border-radius
   elements — same fix as the hero logos). */
#tgFab{position:fixed;bottom:24px;right:24px;z-index:65;display:none;align-items:center;justify-content:center;width:56px;height:56px;border-radius:50%;background:#229ED9;text-decoration:none;cursor:pointer;filter:drop-shadow(0 3px 8px rgba(34,158,217,.35)) drop-shadow(0 1px 3px rgba(0,0,0,.2));transition:transform .15s cubic-bezier(.16,1,.3,1),filter .15s;animation:tgFab-pulse 2.6s ease-in-out infinite}
#tgFab:hover{transform:scale(1.08);filter:drop-shadow(0 5px 12px rgba(34,158,217,.5)) drop-shadow(0 2px 5px rgba(0,0,0,.25))}
#tgFab:active{transform:scale(.96)}
#tgFab svg{flex-shrink:0;filter:drop-shadow(0 1px 2px rgba(0,0,0,.3))}
@keyframes tgFab-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.05)}}

/* v12.x-fab-promo: a white promotional bubble that appears next to the
   Telegram FAB every ~60s to promote the bot. The bubble shows a
   bilingual message ("عضویت در ربات تلگرام، برای دنبال کردن مسابقات
   مهم" / "Join the Telegram bot, never miss a match") in a white
   rounded pill. The bubble fades in, holds for ~5s, then fades out.
   The cycle repeats every 60s. The bubble sits to the LEFT of the FAB
   (above-left, anchored to the FAB's top-left corner). A small
   triangle points to the FAB. The bubble uses a CSS animation with a
   60s cycle (5s visible, 55s hidden). */
#tgFab::after{content:attr(data-promo);position:absolute;bottom:50%;right:100%;margin-right:10px;margin-bottom:0;white-space:nowrap;background:#fff;color:#0f172a;font-size:13px;font-weight:700;padding:8px 16px;border-radius:12px;box-shadow:0 4px 16px rgba(0,0,0,.18);opacity:0;pointer-events:none;transform:translateY(50%) translateX(8px);transition:opacity .4s ease,transform .4s ease;filter:none}
#tgFab::before{content:"";position:absolute;bottom:50%;right:100%;margin-right:-2px;margin-bottom:-6px;width:0;height:0;border-style:solid;border-width:6px 0 6px 8px;border-color:transparent transparent transparent #fff;opacity:0;pointer-events:none;transform:translateY(50%);transition:opacity .4s ease}
#tgFab.promo-show::after{opacity:1;transform:translateY(50%) translateX(0)}
#tgFab.promo-show::before{opacity:1}
/* v12.x-tg-fab: hide the FAB on mobile — the #joinSticky bottom bar
   covers the mobile CTA. Show it only on PC (min-width:601px). */
@media (min-width:601px){#tgFab{display:inline-flex}}
/* v12.x-tg-fab: retire the header CTA pill on PC — the FAB replaces it.
   The #tgbtn icon (already display:none on desktop, display:flex on
   mobile) is unaffected. Mobile keeps the #joinSticky bar. */
@media (min-width:601px){#topbar .cta{display:none}}
/* v12.12: the .viewtoggle block is retired (the page is always big-only) */
.bigbar{margin:14px 0 4px;background:var(--glass);-webkit-backdrop-filter:blur(12px) saturate(1.4);backdrop-filter:blur(12px) saturate(1.4);border:1px solid var(--glass-border);border-radius:16px;padding:12px 16px;box-shadow:var(--glass-shadow),inset 0 1px 0 var(--glass-hi)}
/* v12.38-hero: Fix 3 — the label + clock + percentage now group TOGETHER
   on the same side of the row (was space-between, which parked the label
   at the opposite edge from the values it describes). justify-content:
   flex-end groups them at the inline-end (left in RTL, right in LTR); the
   label sits directly adjacent to the .bb-end group with a small gap
   matching the gap already used between the percentage and the timer. */
.bigbar-top{display:flex;align-items:center;justify-content:flex-end;gap:8px;font-size:13px;font-weight:600;color:var(--muted);margin-bottom:8px}
/* v12.24: the clock and the new PROGRESS PERCENT chip group at the row's
   end \u2014 the percent makes the bar's base explicit (0% far out \u2192 100% at
   kickoff) instead of a mystery fill. */
.bb-end{display:inline-flex;align-items:center;gap:8px;min-width:0}
/* v12.32 (the user's ask): the navy bar's #bigbarDate run is RETIRED \u2014 the
   kickoff weekday+date moved OUT of the bar, down under the hero's big time
   chip (the .kickdate rule in the .kick block below: the time over
   "weekday day month", the date one step smaller). The bar itself is back to
   label + clock + percent + track, nothing else. */
/* v12.38-hero: Fix 1+4+5: the progress bar + percentage badge now track the
   FINAL 24 HOURS before kickoff (not the old 14-day window) so the fill and
   the countdown clock always agree. The percentage badge also switches to
   the NEUTRAL pill token (was blue, low-contrast) with a visible period
   suffix "۲۴" / "24h" so the percentage is never ambiguous. Reduced to
   11px/700 so the kickoff-time pill reads as the primary headline number. */
.bigbar-pct{display:none !important}
.bigbar-pct:empty{display:none}
.bigbar-clock{font-weight:700;color:#22c55e;font-variant-numeric:tabular-nums}
/* v12.x-green-clock (the user's ask): the hero countdown clock is now GREEN
   (matches the .bigbar-fill progress bar gradient #22c55e → #16a34a). Was
   var(--countdown) (light blue #93c5fd dark / #2563eb light). Green keeps
   the clock visually unified with the progress bar that fills under it. */
[data-theme="light"] .bigbar-clock{color:#16a34a}
/* v12.39-minbar: the track is a THIN 4px hairline, flush at the bottom of
   the .bigbar container — minimal, integrated into the container rather
   than a heavy 14px rectangle. Fully rounded (border-radius:999px) so the
   ends are pill-shaped. The heavy inset shadow is retired. */
.bigbar-track{position:relative;height:5px;border-radius:999px;background:rgba(148,163,184,.18);overflow:hidden;margin-top:2px}
[data-theme="light"] .bigbar-track{background:rgba(15,23,42,.08)}
/* v12.39-minbar: the fill is the same thin 4px line, fully rounded, with a
   subtle gradient + a soft glow. The animated stripes + the fuse-tip ::after
   pseudo-element are retired (they added visual weight the user didn't
   want). The fill now reads as a clean minimal progress line. */
.bigbar-fill{position:absolute;top:0;left:0;height:100%;width:0%;border-radius:999px;background:linear-gradient(90deg,#22c55e,#16a34a);box-shadow:0 0 6px rgba(34,197,94,.22);transition:width .7s cubic-bezier(.16,1,.3,1)}
.bigbar-fill.live{background:linear-gradient(90deg,#f59e0b,#ef4444);box-shadow:0 0 8px rgba(239,68,68,.28);animation:bigbar-pulse 1.2s ease-in-out infinite}
.bigbar-fill.idle{width:12%}
@keyframes bigbar-pulse{0%,100%{opacity:1}50%{opacity:.7}}
/* v12.10/v12.11 HERO CARD: the countdown bar lives INSIDE the hero card,
   flush \u2014 with its own match right below it, so the bar and the match read
   as ONE unit. v12.11: the card is a PLAIN standard .card \u2014 no golden
   chrome, identical to every other section (streamlined, per the user). */
/* v12.27 (review item 1): the countdown bar gets its scrim BACK \u2014 it was
   transparent since v12.26, so the clock + the \u06F8\u06F8\u066A percent chip sat directly
   on the video/crest artwork. A soft horizontal gradient plate guarantees
   contrast for the bar's live text ("no live text ever sits directly on the
   high-contrast part of the crest artwork"). */
/* v12.42-livesection: the hero's .bigbar background is now TRANSPARENT
   (was a navy gradient scrim — the user's ask: "there is a background
   rectangle which I don't like — it's white-ish"). The bar sits directly
   on the hero card's own background, with no separate container. The
   border-bottom divider is also retired — the thin 4px track is the
   only divider. padding adjusted for the label/clock/pct row + track. */
.bighero .bigbar{margin:0 0 12px;padding:2px 2px 8px;background:transparent;border:none;border-radius:0;box-shadow:none;-webkit-backdrop-filter:none;backdrop-filter:none}
[data-theme="light"] .bighero .bigbar{background:transparent}
.bighero .bigbar-clock{text-shadow:0 1px 10px rgba(2,6,23,.55)}
[data-theme="light"] .bighero .bigbar-clock{text-shadow:0 1px 8px rgba(248,250,252,.9)}
/* v12.38-hero: the hero's .bigbar-pct already inherits the neutral pill token
   from the base rule above; the old blue override (rgba(96,165,250,.22)) is
   retired. The neutral token has enough contrast on the hero's dark scrim
   in both themes. */
/* v12.22 (the user's ask): the countdown hero is the page's ADRENALINE box \u2014
   "css js effects, making it excitement, adrenalin, and evoking emotions",
   not just a color change. It is now a STAGE, and nothing else on the page
   behaves like it: an emerald spotlight gradient + border, a heartbeat glow
   that lub-dubs, a floodlight sweep washing over the teams, embers rising
   from the bottom, a white-hot FUSE TIP burning at the draining edge of the
   bar, a per-second tick pop on the clock (now 18px/800), and the two sides
   entering the stage from their own edges. The intensity ESCALATES toward
   kickoff via [data-urgent] (set by updateBigBar): far = calm emerald
   breathing; soon (\u226424h) = amber + faster pulse; final (\u226460min) = red alarm
   heartbeat + pulsing label; live = the red stage around the live bar.
   Every layer is an opacity/transform animation (compositor friendly) and
   the global prefers-reduced-motion rule silences all of them. */
/* v12.53: min-height so the hero card doesn't collapse when .hero-data is
   position:absolute (the data layer is now absolute to center the content).
   240px on phones gives enough room for the match row + countdown bar.
   Desktop gets a larger min-height via the media query below. */
.card.bighero{position:relative;overflow:hidden;border-radius:16px;margin:0;min-height:200px;border-color:rgba(30,58,138,.6);border-width:2px;background-image:radial-gradient(130% 100% at 50% -30%,rgba(52,211,153,.18),transparent 55%),linear-gradient(168deg,rgba(6,95,70,.34),rgba(2,6,23,.14))}
[data-theme="light"] .card.bighero{border-color:rgba(30,58,138,.6);border-width:2px;background-image:radial-gradient(130% 100% at 50% -30%,rgba(16,185,129,.20),transparent 55%),linear-gradient(168deg,rgba(209,250,229,.70),rgba(255,255,255,.30))}
/* v12.27 (review item 1): HERO CLIP \u2014 the card itself now clips everything to
   its own 16px radius (overflow:hidden). Before, only the inner layers clipped
   themselves at 15px \u2014 a 1px-radius mismatch at the corners, and (the real
   report) WebKit renders a FILTERED child escaping border-radius+overflow
   clipping in some versions, so the crest artwork could paint outside the
   card's rounded corners. The card-level clip is the guarantee. Because a
   child's outer box-shadow would also be clipped, the heartbeat AURA moved to
   a wrapper that owns the OUTER glow (.herowrap::before) while the card's
   ::before keeps the inner emerald wash; updateBigBar mirrors data-urgent on
   the wrapper so the escalation ladder drives both. The crest imgs' brightness
   filter moved onto the .hero-wm LAYER (a filtered container clips its own
   children \u2014 the imgs themselves stay unfiltered). */
.herowrap{position:relative;margin:14px 0}
.card.bighero{filter:drop-shadow(0 4px 16px rgba(0,0,0,.36))}
.herowrap::before{content:"";position:absolute;inset:0;border-radius:16px;pointer-events:none;box-shadow:0 0 40px rgba(5,150,105,.24);opacity:.4;animation:hero-heart 2.6s ease-in-out infinite}
.card.bighero::before{content:"";position:absolute;inset:0;border-radius:16px;pointer-events:none;box-shadow:inset 0 0 64px rgba(16,185,129,.10);opacity:.4;animation:hero-heart 2.6s ease-in-out infinite}
@keyframes hero-heart{0%,100%{opacity:.35}8%{opacity:.9}16%{opacity:.5}24%{opacity:.75}36%{opacity:.35}}
/* v12.26 (the user's ask): the hero is a VIDEO STAGE now \u2014 the user's own
   clip plays as the deepest layer behind the next big match, with the exact
   layer ladder the user specified:
     A. DEEPEST  .hero-video  \u2014 the looping muted mp4 (z:0), under a light
        theme-aware scrim (data keeps its own plates, v12.27)
     B.          .hero-wm    \u2014 the faded club crests (z:1)
     C.          .hero-fx    \u2014 the css effects: sweep + embers (z:2)
     D. SURFACE  .hero-data  \u2014 the actual data: countdown bar + the match
        row (z:3, position:relative \u2014 above every fx layer)
   The video (768\xD7254 h264, 7.2s, no audio) is served from the worker's
   [assets] directory as /hero-stage.mp4: autoplay+ muted + loop + playsinline
   (autoplay-safe everywhere), object-fit:cover (crops to the card).
   v12.28 (the user's report: "Video still doesnt play. (it's just a picture)
   - on chrome"): the stage was tuned so dim (video .42 + a .58 scrim \u2014 the
   clip's own motion is subtle, ~4% per-channel frame deltas) that a PLAYING
   video was indistinguishable from a still, and reduced-motion users got an
   explicit pause. Now: the video runs at .78 with only a light .38/.18 scrim
   (the live text keeps its own plates \u2014 the bar's v12.27 gradient, the
   rowsurf boxes), motion is actually PERCEIVABLE, and the boot kicker no
   longer pauses the stage for prefers-reduced-motion (the user's twice-
   repeated explicit ask: it must autoplay; the CSS fx still respect the
   media query). */
.hero-video{position:absolute;inset:0;z-index:0;border-radius:16px;overflow:hidden;pointer-events:none;background:transparent}
/* v12.30 (the user's ask): "add a 30% dark navy overlay on the video of the
   next upcoming match + some gaussian blur just a touch" \u2014 the stage was
   competing with the data on top of it (the user's phone report: "the
   header of upcoming match in mobile looks distracting. disorganized and
   messy with a lot of noise"). The scrim becomes a FLAT 30% dark-navy veil
   (rgba(2,6,23,.30) \u2014 the old .38/.18 gradient retired), and the clip
   itself gets a TOUCH of gaussian blur (2.5px) with a 1.06 scale so the
   blur's edge smear never paints inside the clipped card. Motion stays
   perceivable (v12.28's autoplay work untouched \u2014 large-scale movement
   survives a 2.5px blur easily); the stage now reads as ONE calm navy
   backdrop the data sits on, not a rival beside it. Light theme keeps
   its white veil (a navy fill would muddy the light card), same flat cut. */
.hero-video video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.78;filter:blur(2.5px) saturate(1.18) brightness(1.02);transform:scale(1.06)}
.hero-video::after{content:"";position:absolute;inset:0;background:rgba(2,6,23,.30)}
[data-theme="light"] .hero-video::after{background:rgba(248,250,252,.42)}
/* v12.50: hero-data is vertically centered — the match row + the countdown
   bar sit in the MIDDLE of the hero card, not aligned to the top. */
.hero-data{position:absolute;inset:0;z-index:3;display:flex;flex-direction:column;justify-content:center;gap:12px;padding:80px 18px 18px}
/* v12.23: the sweep MOVED from .card.bighero::after (unclipped \u2014 the heartbeat-scrollbar bug) into the already-clipped .hero-fx layer, so the light band can wash over the stage but never escape the card. Same gradient, same rhythm. v12.26: the fx layer sits ABOVE the video + crests and BELOW the data (the user's ladder: video < logos < css effects < data). */
.hero-fx::after{content:"";position:absolute;inset:0;pointer-events:none;background:linear-gradient(115deg,transparent 32%,rgba(255,255,255,.05) 44%,rgba(255,255,255,.13) 50%,rgba(255,255,255,.05) 56%,transparent 68%);transform:translateX(-140%);animation:hero-sweep 6.5s cubic-bezier(.55,0,.45,1) infinite}
@keyframes hero-sweep{0%{transform:translateX(-140%)}42%,100%{transform:translateX(140%)}}
.hero-fx{position:absolute;inset:0;z-index:2;border-radius:16px;overflow:hidden;pointer-events:none}
.hero-fx i{position:absolute;bottom:-8px;width:5px;height:5px;border-radius:50%;background:radial-gradient(circle,rgba(110,231,183,.95),rgba(52,211,153,0) 70%);opacity:0;animation:hero-ember 7s linear infinite}
.hero-fx i:nth-child(1){left:16%;animation-duration:6.5s}
.hero-fx i:nth-child(2){left:46%;width:4px;height:4px;animation-delay:2.3s;animation-duration:8.2s}
.hero-fx i:nth-child(3){left:78%;animation-delay:4.6s;animation-duration:7.4s}
@keyframes hero-ember{0%{transform:translateY(0) translateX(0);opacity:0}12%{opacity:.75}70%{opacity:.3}100%{transform:translateY(-200px) translateX(16px);opacity:0}}
/* v12.32 (the user's ask): "decrease the size of countdown numbers in both
   pc and mobile" \u2014 the bar's clock (1 day 02:43:44) drops from the v12.28
   display size (18px) back to a quiet label-class 14px PC / 12.5px phones
   (the <=600px block below); the bar reads label, clock, track \u2014 and the
   HERO'S OWN headline number stays the big one (the 24px time chip in the
   match row, untouched). */
.bighero .bigbar-clock{font-size:14px;font-weight:800;letter-spacing:.01em}
#bigbarClock.tick{animation:hero-tick .34s cubic-bezier(.34,1.56,.64,1)}
@keyframes hero-tick{0%{transform:scale(1)}35%{transform:scale(1.055);filter:brightness(1.4)}100%{transform:scale(1)}}
/* v12.39-minbar: the .bigbar-fill::after fuse-tip pseudo-element is RETIRED
   — it was the white-hot burning edge of the old 14px striped bar. The new
   4px minimal line has no fuse tip; the fill's own gradient + soft glow are
   the whole visual. */
.bighero .team{font-size:16px;font-weight:800}
/* v12.x-hero-nowrap (the user's ask): 'In Top-big-incoming-box (single
   featured) the clubs never, whatever long they're, should never be in
   two row, always one row' AND 'never truncate the club's name — always
   mention full name of club in same row'. The hero's team names are
   forced to a SINGLE line via white-space:nowrap (no wrapping) with NO
   truncation (no overflow:hidden, no text-overflow:ellipsis). Instead,
   the font-size is FLUID via clamp(9px, 2.5vw, 16px) so the longest
   names (e.g. 'Manchester United FC', ~20 chars) fit on one row even on
   a 390px phone (each team column ~140px; at 9-10px the full name
   fits). On desktop the clamp maxes at 16px (the normal hero size).
   Specificity (0,3,1) beats both .bighero .team (0,2,1) and
   .match .side .team (0,3,0). */
.bighero .match .side .team{white-space:nowrap;overflow:visible;text-overflow:clip;overflow-wrap:normal;word-wrap:normal;min-width:0;font-size:clamp(9px,2.5vw,16px)}
/* v12.x-no-logo-shadow (the user's ask): 'Remove the shadows behind all
   club teams logos it created noise.' All logo drop-shadows + ring
   shadows are RETIRED — the hero crests, the topspot crests, and any
   other .logo elements now render flat with just their circular border
   + background plate (no filter:drop-shadow, no box-shadow ring). The
   crest image + the navy circle plate remain; only the shadow noise
   is gone. Dark + light mode both clean. */
.bighero .logo{filter:none}
[data-theme="light"] .bighero .logo{filter:none}
#topspotCard .spotitem .logo{box-shadow:none;filter:none;width:43px;height:43px;font-size:20px}
/* v12.x-topspot-promoted (the user's ask): the big upcoming matches box is
   a PROMOTED section (right below the hero) — its club crests are LARGER
   than the regular match boxes (51px desktop / 46px mobile) to mark the
   promotion. 64px desktop / 54px mobile, between the regular 51/46 and
   the hero's 102/46. Font-size scales for the monogram fallback (28/24).
   The soft shadow switched from box-shadow to filter:drop-shadow() (same
   fix as the hero — avoids the overflow:hidden + border-radius
   square-shadow Chromium bug). The 1px ring stays as box-shadow (zero-blur
   box-shadow respects border-radius). */
@media (min-width:601px){#topspotCard .spotitem .logo{width:51px;height:51px;font-size:22px}}
/* v12.24 (the user's ask): the countdown hero's team crests DOUBLE on PC
   (51px \u2192 102px, the monogram fallback scales with the circle) \u2014 the
   face-off reads like a big-match poster. Phones keep their own 46px size
   from the mobile block below. */
@media (min-width:601px){.bighero .logo{width:102px;height:102px;font-size:44px}}
.bighero .match .side{animation:hero-side .5s cubic-bezier(.16,1,.3,1) both}
.bighero .match .side:first-child{--sx:34px}
.bighero .side.away{--sx:-34px}
[dir="ltr"] .bighero .match .side:first-child{--sx:-34px}
[dir="ltr"] .bighero .side.away{--sx:34px}
@keyframes hero-side{from{opacity:0;transform:translateX(var(--sx,20px))}to{opacity:1;transform:none}}
/* v12.23: the clubs' EXPANDED crests, faded to a watermark, sit in the
   background of the next big upcoming match \u2014 "[faded logo big on
   background] [club logo] club name". One giant crest per club, anchored
   behind that club's half of the row, far under the content (z:1 \u2014 below
   the fx and the row itself, above the video), clipped inside the card and
   pointer-transparent. The layer is STATIC markup (like the embers) so
   re-renders never disturb it; renderHeroSpot \u2192 heroWm() swaps the two
   crest srcs.
   v12.24 (the user's ask): the crests went 320px at .40.
   v12.25: reduced by 30% \u2192 .28. A soft radial SCRIM behind the card's
   center plus a gentle text-shadow on the team names keep the countdown
   and names fully readable (WCAG contrast preserved).
   v12.26 (the user's ask \u2014 "reduce the opacity of background logos by 30%
   (it's still too visible)"): .28 \u2192 .196 on BOTH themes (phones too),
   same 320px/210px canvas \u2014 one more honest 30% cut. */
.hero-wm{position:absolute;inset:0;z-index:1;border-radius:16px;overflow:hidden;pointer-events:none;filter:brightness(1.28) saturate(1.05)}
/* v12.28 (the user's ask): crest watermarks another 20% fainter (.196 \u2192 .157)
   so they read as background texture, never competition for the stage. */
/* v12.32 (the user's ask): the crest watermarks LEFT their mid-card slots for
   the card's BOTTOM CORNERS \u2014 the first team's badge anchors to the
   bottom-LEFT corner, the second team's to the bottom-RIGHT. Each circle's
   center sits 88px inward from its corner on BOTH axes (27.5% of its own
   320px diameter), so the top + inner-facing arc stay visible while the
   rest of the circle extends 72px past the side edge and the bottom edge;
   the layer's overflow:hidden (above) clips those overhangs away \u2014 the
   full circle reads as a partial crescent hugging each corner. The offsets
   are PHYSICAL left/right (the wireframe's corners line up with the
   screen's edges, not with text direction \u2014 checked: nothing else in this
   container relies on overflowing it; the layer holds only these two imgs
   + the scrim, and the card itself already clips at its 16px radius). */
/* v12.46-herofix: the watermark images are SWAPPED to match the team
   positions. In RTL (Persian), the first .side (home) is on the RIGHT
   (inline-start), so the first watermark (home crest) must also be on
   the RIGHT. Was using inset-inline-end (LEFT in RTL) → was swapped.
   Now:
   - img:first-child (home crest) → inset-inline-start (RIGHT in RTL, LEFT in LTR)
   - img:last-child (away crest) → inset-inline-end (LEFT in RTL, RIGHT in LTR)
   This matches the team logos' positions in both directions. */
.hero-wm img{position:absolute;width:320px;height:320px;object-fit:contain;opacity:.157;transform:none}
.hero-wm img:first-child{inset-inline-start:-72px;bottom:-72px;top:auto}
.hero-wm img:last-child{inset-inline-end:-72px;bottom:-72px;top:auto}
.hero-wm::after{content:"";position:absolute;inset:0;background:radial-gradient(58% 62% at 50% 58%,rgba(2,6,23,.32),transparent 72%)}
[data-theme="light"] .hero-wm::after{background:radial-gradient(58% 62% at 50% 58%,rgba(248,250,252,.38),transparent 72%)}
[data-theme="light"] .hero-wm img{opacity:.157}
[data-theme="light"] .hero-wm{filter:none}
.bighero .team{text-shadow:0 1px 12px rgba(2,6,23,.65)}
[data-theme="light"] .bighero .team{text-shadow:0 1px 12px rgba(255,255,255,.8)}
/* v12.30 (the user's phone report \u2014 the hero header read "distracting and
   messy"): the crest watermarks are a PC atmosphere; on a ~350px phone
   card the two 210px ghosts sat right behind the face-off names and the
   big time number and fought them for attention. The whole layer is OFF
   below 601px now (the old phone-size rule is retired with it); the flat
   navy veil + blur is the phone stage's only backdrop. PC keeps the
   atmospheric .157 pair untouched. */
@media (max-width:600px){.hero-wm{display:none}}
/* v12.23: the face-off entrance slides each side in from its own edge \u2014 the
   \xB134px overshoot once briefly widened the page on every hero re-render
   (another heartbeat-scrollbar source); the row now clips it, and the \u22EF
   share popover (in the info line, OUTSIDE .match) is unaffected. */
.bighero .match{overflow:hidden;gap:24px}
/* escalation ladder: soon (≤24h) → blue; final (≤60min) & live → red alarm.
   v12.x-blue-urgent-border (the user's ask): the 'soon' border was amber
   (#fbbf24/.5) — the user said 'remove the yellow/green-ish border around
   the section, instead use a blue one'. Changed to the site's --accent
   blue (#2563eb/.55) for the 'soon' state. The final/live red alarm stays
   (that's the urgency escalation, not a color preference). */
#bigHeroCard[data-urgent="soon"]{border-color:rgba(30,58,138,.6);border-width:2px}
#bigHeroCard[data-urgent="soon"]::before{box-shadow:inset 0 0 70px rgba(245,158,11,.09);animation-duration:1.7s}
.herowrap[data-urgent="soon"]::before{box-shadow:0 0 46px rgba(245,158,11,.26);animation-duration:1.7s}
#bigHeroCard[data-urgent="soon"] .hero-fx::after{animation-duration:4.2s}
#bigHeroCard[data-urgent="soon"] .bigbar-clock{color:#60a5fa}
#bigHeroCard[data-urgent="soon"] .hero-fx i{background:radial-gradient(circle,rgba(253,224,71,.95),rgba(245,158,11,0) 70%)}
[data-theme="light"] #bigHeroCard[data-urgent="soon"] .bigbar-clock{color:#2563eb}
#bigHeroCard[data-urgent="final"],#bigHeroCard[data-urgent="live"]{border-color:rgba(239,68,68,.55)}
#bigHeroCard[data-urgent="final"]::before,#bigHeroCard[data-urgent="live"]::before{box-shadow:inset 0 0 84px rgba(239,68,68,.11)}
.herowrap[data-urgent="final"]::before,.herowrap[data-urgent="live"]::before{box-shadow:0 0 52px rgba(239,68,68,.28)}
#bigHeroCard[data-urgent="final"] .hero-fx::after{animation-duration:3s}
#bigHeroCard[data-urgent="final"]::before{animation-duration:1.1s}
.herowrap[data-urgent="final"]::before{animation-duration:1.1s}
#bigHeroCard[data-urgent="live"]::before{animation-duration:.9s}
.herowrap[data-urgent="live"]::before{animation-duration:.9s}
#bigHeroCard[data-urgent="live"] .hero-fx::after{animation-duration:2.2s}
#bigHeroCard[data-urgent="final"] .bigbar-clock,#bigHeroCard[data-urgent="live"] .bigbar-clock{color:#f87171}
#bigHeroCard[data-urgent="final"] .hero-fx i,#bigHeroCard[data-urgent="live"] .hero-fx i{background:radial-gradient(circle,rgba(252,165,165,.95),rgba(239,68,68,0) 70%)}
#bigHeroCard[data-urgent="final"] #bigbarLabel{animation:hero-label .9s ease-in-out infinite}
@keyframes hero-label{0%,100%{opacity:1}50%{opacity:.55}}
[data-theme="light"] #bigHeroCard[data-urgent="final"] .bigbar-clock,[data-theme="light"] #bigHeroCard[data-urgent="live"] .bigbar-clock{color:#dc2626}
/* v12.27 (review item 10): the LIVE chip rides the SUCCESS tokens (soft fill,
   ink text, line border) \u2014 the theme-aware pair replaces the light override. */
.livechip{display:inline-flex;align-items:center;gap:6px;background:var(--t-success-soft);color:var(--t-success-ink);border:1px solid var(--t-success-line);border-radius:999px;padding:2px 10px;font-size:12px;font-weight:700;margin:0 6px;vertical-align:middle}
.livechip .dot{width:8px;height:8px;border-radius:50%;background:var(--badge-live);animation:live-beep 1.1s ease-in-out infinite}
/* v12.x-live-lottie: the Live.lottie animation (a pulsing "LIVE" badge)
   replaces the CSS-animated dot + "در حال برگزاری" text in the livechip
   and the #liveCard h2 heading. The <dotlottie-player> element renders
   the .lottie file (served from /Live.lottie). Sized to match the chip:
   40x16px in the livechip, 56x22px in the h2 heading. The autoplay +
   loop attributes keep the animation running. The background stays
   transparent so it blends into the chip / heading plate. */
dotlottie-player.live-lottie{display:inline-block;width:40px;height:16px;vertical-align:middle}
.livechip dotlottie-player.live-lottie{width:40px;height:16px}
#liveCard h2 dotlottie-player.live-lottie{width:56px;height:22px;vertical-align:middle;margin-inline-end:4px}
@keyframes live-beep{0%,100%{box-shadow:0 0 0 0 rgba(34,197,94,.35);transform:scale(1)}50%{box-shadow:0 0 0 6px rgba(34,197,94,0);transform:scale(1.15)}}
/* v12.44-livepolish: the liveCard heading carries a BREATHING GREEN LIGHT
   — a 12px green dot that pulses softly (opacity + box-shadow + scale),
   conveying "these games are now playing" at a glance. Uses a slower 2s
   rhythm (vs the 1.1s livechip beep) so it reads as a calm breath, not
   an alarm. The 🔴 emoji in the heading is replaced by this dot via JS
   (renderLive strips the emoji and injects the .live-breath span). */
.live-breath{display:inline-block;width:12px;height:12px;border-radius:50%;background:#22c555;box-shadow:0 0 0 0 rgba(34,197,94,.5);animation:live-breath 2s ease-in-out infinite;vertical-align:-1px;margin-inline-end:8px;flex-shrink:0}
@keyframes live-breath{0%,100%{opacity:.5;box-shadow:0 0 0 0 rgba(34,197,94,.4);transform:scale(.85)}50%{opacity:1;box-shadow:0 0 12px 4px rgba(34,197,94,.25);transform:scale(1.15)}}
#liveCard h2{display:flex;align-items:center}
/* v12.45-compact-live: compact the liveCard's spotitems ~50% — smaller logos
   (28px vs 51px), tighter padding, hide the share button + the info line
   (the league badge is the only context needed for live matches; the
   share + full info line is overkill when there are 3-20 live matches
   stacked). The score + team names are the essential data. */
#liveCard .spotitem{padding:1px 0;border-bottom:1px solid var(--border)}
#liveCard .spotitem:last-child{border-bottom:none}
#liveCard .match{padding:2px 0;gap:6px}
#liveCard .logo{width:28px;height:28px;font-size:12px;border-radius:50%}
#liveCard .logo img{width:100%;height:100%;object-fit:contain}
#liveCard .team{font-size:12px;font-weight:700}
#liveCard .kick{flex:0 0 72px;gap:1px}
#liveCard .kick .score{font-size:14px;flex:0 0 auto}
#liveCard .uclspot-info{display:none}
#liveCard .sharewrap{display:none}
.bighero .sharewrap{display:none}
.lmin{display:inline-block;background:rgba(37,99,235,.12);color:var(--accent);border-radius:6px;padding:1px 7px;font-size:12px;font-weight:700;vertical-align:middle}
[data-theme="light"] .lmin{background:rgba(37,99,235,.1)}
.scorers{flex:1 1 100%;margin-top:8px;display:flex;flex-direction:column;gap:4px;font-size:12.5px;color:var(--muted)}
.scorers .srow{display:flex;align-items:center;gap:4px;flex-wrap:wrap}
/* v12.11: the .match.derby box rule is RETIRED \u2014 derby rows (Man Utd\u2013City,
   Atl\xE9tico\u2013Real, Marseille\u2013PSG \u2026) carried an amber border + amber\u2192violet
   gradient while equally big non-derbies (Liverpool\u2013Man City, Roma\u2013Inter)
   stayed plain. Per the user's ask every match row is now IDENTICAL: no
   border, no gradient, no glow. The "derby" class stays in the DOM (inert)
   and the \xAB\u062F\u0631\u0628\u06CC\xBB badge pill in the info row carries the label. */
/* v12.38-hero: Fix 5 — semantic pill tokens. The derby badge now uses the
   --pill-hype-* token (was a one-off gradient; formalized). The league badge
   (.comp) and the percentage badge (.bigbar-pct) use the --pill-neutral-*
   token. The CTA button + the hero's kickoff-time pill use --pill-primary-*.
   A shared token system lets users learn "this color always means this kind
   of information" instead of decoding each badge individually. */
.derbybadge{display:inline-flex;align-items:center;gap:4px;background:var(--pill-hype-bg);color:var(--pill-hype-ink);border:1px solid var(--pill-hype-line);border-radius:999px;padding:2px 10px;font-size:11.5px;font-weight:800;margin-inline-start:6px;vertical-align:middle}
.bigcard{border:2px solid rgba(52,211,153,.38);border-radius:16px;padding:14px 16px 6px;margin:14px 0;background:radial-gradient(120% 160% at 15% 0%,rgba(16,185,129,.20),transparent 55%),linear-gradient(135deg,#064e3b,#065f46 55%,#047857);box-shadow:0 0 10px rgba(5,150,105,.16),0 8px 26px rgba(0,0,0,.35),var(--glass-shadow),inset 0 1px 0 rgba(255,255,255,.16);color:#fff}
.bigcard .match{border-bottom-color:rgba(255,255,255,.16)}
.bigcard .match:hover{background:rgba(255,255,255,.08)}
.bigcard .team,.bigcard .info{color:#ecfdf5}
.bigcard .comp{background:rgba(255,255,255,.16);color:#fff}
.bigcard .countdown{background:rgba(255,255,255,.2);color:#fff}
.bigcard .venue{background:rgba(255,255,255,.14);color:#fff}
.bigcard .logo{background:rgba(0,0,0,.28);border-color:rgba(255,255,255,.35)}
[data-theme="light"] .bigcard{background:linear-gradient(135deg,#ecfdf5,#d1fae5 55%,#a7f3d0);border-color:rgba(5,150,105,.42);color:#064e3b;box-shadow:0 8px 24px rgba(5,150,105,.16),var(--glass-shadow),inset 0 1px 0 rgba(255,255,255,.85)}
[data-theme="light"] .bigcard .match{border-bottom-color:rgba(5,46,22,.14)}
[data-theme="light"] .bigcard .match:hover{background:rgba(255,255,255,.4)}
[data-theme="light"] .bigcard .team,[data-theme="light"] .bigcard .info{color:#064e3b}
[data-theme="light"] .bigcard .comp{background:rgba(5,46,22,.14);color:#052e16}
[data-theme="light"] .bigcard .countdown{background:rgba(5,46,22,.16);color:#052e16}
[data-theme="light"] .bigcard .venue{background:rgba(5,46,22,.12);color:#052e16}
[data-theme="light"] .bigcard .logo{background:rgba(255,255,255,.55);border-color:rgba(5,46,22,.18)}
.bigcard-head{font-size:13px;font-weight:800;color:var(--accent);margin-bottom:4px}
.bigcard .bigcard-head{color:#a7f3d0}
[data-theme="light"] .bigcard-head{color:var(--accent-strong)}
[data-theme="light"] .bigcard .bigcard-head{color:#047857}
/* v12.12: the .msec section rules are retired with renderSections (the
   \xAB\u0645\u0633\u0627\u0628\u0642\u0627\u062A \u067E\u06CC\u0634\u200C\u0631\u0648\xBB list card is gone; the boxes are the presentation). */
.card{background:var(--glass);-webkit-backdrop-filter:blur(16px) saturate(1.4);backdrop-filter:blur(16px) saturate(1.4);border:1px solid var(--glass-border);border-radius:16px;padding:18px;margin:14px 0;box-shadow:var(--glass-shadow),inset 0 1px 0 var(--glass-hi)}
/* v12.11: the UCL gold chrome is RETIRED too \u2014 .uclcard (UCL list) and
   .uclspot (next big UCL match) were the last golden boxes around matches;
   they are plain .card sections now, uniform with everything else. The
   container classes stay in the HTML (inert hooks + reduced-transparency
   selector) and .uclspot-logo/info/wait below remain as layout rules. */
.uclspot-logo{width:72px;height:72px;object-fit:contain;display:block;margin:4px auto 12px;filter:drop-shadow(0 2px 8px rgba(0,0,0,.35))}
.uclspot-info{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:8px;font-size:12.5px;color:var(--muted);text-align:center}
.uclspot-wait{display:flex;flex-direction:column;align-items:center;gap:6px;padding:12px 0 8px}
/* v12.21 (the user's ask): the UCL box is DEDICATED to the Champions League \u2014
   it now carries the UCL brand: the starball mark on a white chip inside a
   navy gradient header plate, a deep-navy glass body with a faint star-tile
   watermark and a UCL-blue border, so it reads instantly as the
   competition's own box and nothing else on the page looks like it. The UCL
   standings card shares the plate + border + watermark on the standard glass
   body. Light theme keeps the navy identity (light navy-tinted body).
   Brand colors are literals, the same way .bigcard carries its greens. */
/* v12.x-matchday-pos (the user's ask): the matchday chip ('هفته ۱') must be
   flush to the FAR LEFT edge of the UCL header (the user drew a black
   rectangle at the far left to show the desired position). Previously
   margin-inline-start:auto left a ~72px gap because flex gap:10px
   interfered with the auto-margin free-space absorption. Switched to
   justify-content:space-between — the first DOM child (logo) sits at the
   inline-start (RIGHT in RTL), the last DOM child (matchday chip) sits at
   the inline-end (LEFT in RTL, flush to the edge), and the title text
   floats in the center between them. The margin-inline-start:auto on the
   chip is retired (space-between handles the distribution). */
.uclh2{display:flex;align-items:center;gap:10px}
/* v12.x-ucl-title-next-to-logo: the title text sits NEXT TO the starball
   logo (at the inline-start), NOT in the center. The title span gets
   margin-inline-end:auto so ALL free space goes after the title — this
   groups the logo + title together at the start and pushes the matchday
   chip (.ucl-md) to the far inline-end. Removed justify-content:space-
   between (it conflicted with the auto-margin approach — space-between
   distributes free space between all items, keeping the title in the
   center). flex:0 1 auto so the title doesn't stretch. */
.uclh2 > span[data-i]{text-align:end;flex:0 1 auto;min-width:0;margin-inline-end:auto}
.ucl-logo{flex-shrink:0;width:34px;height:34px;border-radius:50%;background:#fff;display:inline-flex;align-items:center;justify-content:center;box-shadow:0 2px 10px rgba(2,6,23,.45),inset 0 0 0 1px rgba(14,32,88,.10)}
.ucl-logo svg{width:29px;height:29px;display:block}
.ucl-logo.sm{width:26px;height:26px}
.ucl-logo.sm svg{width:22px;height:22px}
.uclspot-ball{width:64px;height:64px;margin:0 auto;filter:drop-shadow(0 4px 14px rgba(0,0,0,.45))}
.uclspot-ball svg{width:100%;height:100%;display:block}
#uclSpotCard h2{font-size:19px;color:#fff;background:linear-gradient(135deg,#0e2058,#1b3480);border-color:rgba(126,161,245,.30);border-inline-start-color:#7ea1f5}
.uclcard h2{color:#fff;background:linear-gradient(135deg,#0e2058,#1b3480);border-color:rgba(126,161,245,.30);border-inline-start-color:#7ea1f5}
#uclSpotCard{background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0%200%2048%2048'%3E%3Cpath fill='%23ffffff' fill-opacity='.028' d='M24%2015L26%2021.2%2032.6%2021.2%2027.3%2025.1%2029.3%2031.3%2024%2027.4%2018.7%2031.3%2020.7%2025.1%2015.4%2021.2%2022%2021.2Z'/%3E%3C/svg%3E"),linear-gradient(168deg,rgba(27,52,128,.72),rgba(13,28,71,.80));background-repeat:repeat,no-repeat;background-size:54px 54px,100% 100%;border-color:rgba(126,161,245,.26)}
.uclcard{background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0%200%2048%2048'%3E%3Cpath fill='%23ffffff' fill-opacity='.028' d='M24%2015L26%2021.2%2032.6%2021.2%2027.3%2025.1%2029.3%2031.3%2024%2027.4%2018.7%2031.3%2020.7%2025.1%2015.4%2021.2%2022%2021.2Z'/%3E%3C/svg%3E");background-repeat:repeat;background-size:54px 54px;border-color:rgba(126,161,245,.22)}
[data-theme="light"] #uclSpotCard{background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0%200%2048%2048'%3E%3Cpath fill='%230e2058' fill-opacity='.04' d='M24%2015L26%2021.2%2032.6%2021.2%2027.3%2025.1%2029.3%2031.3%2024%2027.4%2018.7%2031.3%2020.7%2025.1%2015.4%2021.2%2022%2021.2Z'/%3E%3C/svg%3E"),linear-gradient(168deg,rgba(226,234,255,.94),rgba(201,216,248,.90));border-color:rgba(23,42,105,.22)}
[data-theme="light"] .uclcard{background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0%200%2048%2048'%3E%3Cpath fill='%230e2058' fill-opacity='.04' d='M24%2015L26%2021.2%2032.6%2021.2%2027.3%2025.1%2029.3%2031.3%2024%2027.4%2018.7%2031.3%2020.7%2025.1%2015.4%2021.2%2022%2021.2Z'/%3E%3C/svg%3E");border-color:rgba(23,42,105,.16)}
/* v12.35-uclfix: light-mode override for the UCL h2 plates. The base
   [data-theme="light"] h2 rule (specificity 0,1,1) was overriding .uclcard h2
   and #uclSpotCard h2 (also 0,1,1) because it came later in the cascade —
   replacing the navy gradient with rgba(15,23,42,.04) (near-white) while
   keeping color:#fff, producing white-on-near-white unreadable text. These
   rules have specificity (0,2,1) so they WIN.
   v12.x-light-ucl (the user's ask): in LIGHT mode the dark navy
   (#0e2058 → #1b3480) background acts as a CTA — it grabs attention from
   the hero card. Switched to a LIGHTER blue gradient (#dbeafe → #bfdbfe,
   blue-100 → blue-200) with dark navy TEXT (#0f172a) so the UCL headers
   read as soft brand-tinted plates, not loud CTAs. Dark mode keeps the
   navy gradient + white text. */
[data-theme="light"] .uclcard h2,[data-theme="light"] #uclSpotCard h2{color:#0f172a;background:linear-gradient(135deg,#dbeafe,#bfdbfe);border-color:rgba(37,99,235,.22);border-inline-start-color:#3b82f6}
/* v12.11: the .topspot golden box chrome is RETIRED \u2014 the hero card and the
   big-matches box are plain .card sections now, uniform with every other
   card on the page (the \u{1F525} heading carries the "big" signal; per the user
   no match or box gets a special border). No element carries the class
   anymore \u2014 the rules and glow keyframes below were removed with it. */
/* v12.7/v12.8 multi-match TOP BOX: up to six TRUE big matches (strict kickoff
   order \u2014 closest on top) stacked in the card \u2014 .spotitem wraps one entry
   (teams row + info + share). v12.25: the entry is a boxed unit (border +
   gap below separates it from the next entry \u2014 see the match-box rules). */
.spotitem .match{margin:0 0 6px}
/* v12.17: \xAB\u062F\u0631 \u0627\u06CC\u0646 \u0647\u0641\u062A\u0647\xBB expired games \u2014 kickoff passed \u2192 the entry renders
   "turned off": dimmed + slightly desaturated (score/time still readable,
   but clearly no longer ahead). Live entries are NEVER past. */
.spotitem.past{opacity:.48;filter:saturate(.55)}
.spotitem.past:hover{opacity:.72}
.spotitem.past .match{animation:none}
.spotitem.past .logo{filter:grayscale(.5)}
.spotitem.past .score{opacity:.85}
/* \u231B expired chip (kickoff passed, score not in payload yet) \u2014 muted, flat */
.wkdone{color:var(--muted);font-weight:700;font-size:11.5px;background:var(--t-neutral-soft);border-radius:999px;padding:3px 10px;display:inline-block;margin-left:6px}
.ucl-head{display:flex;align-items:center;gap:8px;font-weight:800;font-size:14.5px;margin-bottom:8px}
.ucl-emblem{width:26px;height:26px;border-radius:6px;flex-shrink:0}
/* v12.35-uclfix: the matchday chip now lives INSIDE the h2.uclh2 (same row as
   the title), not in a separate .ucl-head div below. White text on the navy
   gradient h2 plate, with a semi-transparent white pill background for
   visual separation. */
/* v12.50: the matchday chip sits at the END of the h2 (after the logo +
   title), pushed to the far edge. v12.x-matchday-pos: the push is now via
   justify-content:space-between on the .uclh2 (see above) instead of
   margin-inline-start:auto (which left a gap). The order is: [logo]
   [title] ... [matchday]. */
.uclh2 .ucl-md{font-size:12px;color:rgba(255,255,255,.92);font-weight:700;background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.22);border-radius:999px;padding:2px 10px;flex-shrink:0;white-space:nowrap;margin-left:0;margin-inline-end:0}
/* v12.x-light-ucl: the matchday chip needs dark ink + a darker pill on the
   lighter blue h2 plate in light mode (the white-on-translucent-white pill
   was designed for the navy plate). */
[data-theme="light"] .uclh2 .ucl-md{color:#1e3a8a;background:rgba(37,99,235,.12);border-color:rgba(37,99,235,.28)}
.ucl-md{margin-left:auto;font-size:11.5px;color:var(--muted);font-weight:600}
.ucl-stand-wrap{position:relative;margin-top:10px}
/* v12.27 (review item 2): the star tiles sit strictly BEHIND the table now \u2014
   the .ucl-stand container's body is opaque enough (was rgba(30,41,59,.45))
   that the watermark cannot read through the rows, and the tiles themselves
   were dimmed another ~45% (.05\u2192.028 dark, .07\u2192.04 light). The star is
   purely decorative (no favorite-league toggle behind it), so it stays a
   background layer \u2014 the functional UCL brand is the small .ucl-logo chip in
   the headings. */
.ucl-stand{max-height:360px;overflow-y:auto;border:1px solid var(--border);border-radius:12px;padding:6px 10px;background:rgba(15,23,42,.72)}
[data-theme="light"] .ucl-stand{background:rgba(248,250,252,.78)}
.ucl-stand-wrap .stnot-overlay{top:6px;left:6px;right:6px;bottom:6px;background:rgba(2,6,23,.6)}
[data-theme="light"] .ucl-stand-wrap .stnot-overlay{background:rgba(248,250,252,.7)}
/* v12.21 (the user's ask): the section titles were 15px plain text \u2014 easy
   to skim past and "not clear what they are about at first glance". Every
   card h2 is now a SECTION PLATE: bigger and bolder on its own tinted
   background with a 4px accent edge, so each box announces itself. The two
   flagship headers run one size larger with themed plates \u2014 hot amber for
   the big-matches box, UCL navy + starball for the Champions League boxes
   (rules in the UCL block above). */
h2{font-size:17px;font-weight:800;line-height:1.55;letter-spacing:-.005em;margin:0 0 14px;padding:9px 14px;background:rgba(148,163,184,.09);border:1px solid rgba(148,163,184,.15);border-inline-start:4px solid var(--accent);border-radius:12px}
[data-theme="light"] h2{background:rgba(15,23,42,.04);border-color:rgba(15,23,42,.09)}
#topspotCard h2{font-size:19px;background:rgba(59,95,173,.12);border-color:rgba(59,95,173,.3);border-inline-start-color:#3b5fad}
[data-theme="light"] #topspotCard h2{background:rgba(59,95,173,.06);border-color:rgba(59,95,173,.2)}
/* v12.25 (the user's ask \u2014 "alignment, alignment alignment"): every
   fixture is ONE self-contained MATCH BOX. The old hairline divider sat
   BETWEEN a row's teams and its OWN info line \u2014 the kickoff time read
   as if it belonged to the row BELOW (the user's exact misattribution
   report: "sometimes you incorrectly think the game match time belong
   to a row, but actually it belongs to upper row"). The divider is
   retired: .mrow/.spotitem are real bordered boxes \u2014 teams row + info
   chips live INSIDE the box, boxes are separated by a gap, and hover
   highlights the whole unit. Nothing can leak across a row boundary
   anymore:
   \u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510
   \u2502 A        [ match info ]        B \u2502
   \u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518
   \u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510
   \u2502 C        [ match info ]        D \u2502
   \u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518 */
.mrow,.spotitem{position:relative;border:1px solid var(--border);border-radius:14px;padding:10px 12px;margin:0 0 10px;background:var(--rowsurf);transition:background .15s,border-color .15s;display:flex;flex-direction:column;justify-content:center}
.mrow:last-child,.spotitem:last-child{margin-bottom:0}
.mrow:hover,.spotitem:hover{filter:brightness(1.07);border-color:rgba(37,99,235,.4)}
/* v12.47-nospotbox: the hero's .spotitem is STRIPPED of its container styling
   — no border, no background, no border-radius, no padding. The hero card
   itself is the container; a bordered box inside it was "a container inside
   a container" (visual noise, the user's ask). The match row + info line
   + share button stay — just the box chrome is gone. */
.bighero .spotitem{border:none;background:none;border-radius:0;padding:0;margin:0}
.match{display:flex;align-items:center;gap:12px;padding:2px 0;border-radius:10px;animation:rise .35s cubic-bezier(.16,1,.3,1) both;animation-delay:calc(var(--i,0)*40ms)}
.stable .match{animation:none}
/* v12.23 (the user's ask \u2014 "everything must be aligned"): both sides share
   the row EXACTLY 50/50 (flex-basis 0, was auto \u2014 content-width bases made
   the score's x position wander per row); the score below is a FIXED
   CENTERED SLOT, so every scored row on the page carries its result at the
   same x line and team columns line up across rows and cards. */
.side{display:flex;align-items:center;gap:8px;flex:1 1 0;min-width:0;flex-wrap:nowrap}
.side .team{flex:1;min-width:0}
.side.away .team{text-align:end}
/* v12.18: PC crests +35% (38px \u2192 51px, the user's ask) \u2014 the monogram
   fallback scales with the circle. Phones keep their own 46px size below. */
.logo{width:41px;height:41px;border-radius:50%;background:var(--bg);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:18px;overflow:hidden;flex-shrink:0}
.logo img{width:100%;height:100%;object-fit:contain}
.team{flex:1;font-weight:700;font-size:14.5px}
/* v12.18: the "vs" slot is GONE for unplayed matches \u2014 first the \u{1F19A} emoji
   (mis-aligned noise), then the hairline divider (still noise, per the user).
   v12.25: unplayed rows carry the KICKOFF TIME in the center slot (.kick);
   finished/live rows keep the score element in the middle (.score). */
.score{font-weight:800;font-size:17px;color:var(--score);flex:0 0 92px;text-align:center;white-space:nowrap;font-variant-numeric:tabular-nums}
/* v12.44-livepolish: when the .score is inside .kick (column layout), the
   92px flex-basis would apply to the HEIGHT, stretching the score to 92px
   tall and misaligning it with the team names. Override: inside .kick, the
   score gets flex:0 0 auto so it's only as tall as its content, and the
   .kick's justify-content:center vertically centers it against the sides. */
.kick .score{flex:0 0 auto}
/* v12.27 (review item 6): the WINNER's digit is unmistakable \u2014 the winning
   number renders as a <b> (weight 900 + a soft success glow) while the
   losing number dims to .55; a draw keeps both plain. The pairing is now
   READ, not inferred. */
.score b{font-weight:900;text-shadow:0 0 12px rgba(74,222,128,.45)}
[data-theme="light"] .score b{text-shadow:0 0 10px rgba(21,128,61,.25)}
.score .lose{font-weight:600;opacity:.55}
.score .sep{opacity:.5;font-weight:600}
/* v12.25 (the user's ask): the kickoff TIME owns the CENTER slot of every
   unplayed row \u2014 "A [match info] B" \u2014 on the exact x line the score takes
   on live/finished rows (both slots 92px PC / 80px phones, so team columns
   align across EVERY fixture on the page). The time can never be misread
   as another row's: it sits between its own two teams, inside its own
   box. */
/* v12.40-datebelow: the .kick slot is now a COLUMN for every spotitem
   (was horizontal row) — the time chip on top, the .kickdate below.
   flex-direction:column + gap:4px stacks them cleanly. The hero keeps
   its own larger gap (6px) via the .bighero .kick override below. */
/* v12.61: the .kick column (time over date) was centered with the .side's
   center, but the TIME (top element) appeared higher than the team name.
   Added a margin-top of 7px (~half the kickdate height) to push the .kick
   down so the countdown time aligns with the team name's vertical level. */
.kick{flex:0 0 92px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;min-width:0;margin-top:7px}
.kick .countdown{margin:0;font-size:13px;padding:4px 12px}
/* v12.28 (the user's ask \u2014 "<span class="countdown">\u{1F552} \u06F1\u06F9:\u06F0\u06F0</span> this
   must be bigger for next big upcoming match. make it considerably
   larger"): the hero's kickoff chip is the NEXT BIG MATCH's headline
   number. Scoped to the hero card ONLY (every other box keeps the 13px
   chip): the hero's center slot auto-sizes \u2014 the chip dictates its own
   width, the two sides flex around it \u2014 and the chip jumps to DISPLAY
   size: 24px PC / 20px phones, weight 800, tabular digits, riding its own
   soft plate + hairline ring + drop shadow so it pops off the video stage
   while the countdown color keeps the system hue. The hero's LIVE score
   takes the same display treatment (one headline system per card), and
   the hero's info line (comp logo + derby badge) runs one step larger
   under it. v12.31: the share \u22EF to the box's top corner. v12.32: the
   hero's date line moved AGAIN \u2014 out of the navy bar, UNDER the big time
   chip: the .kick slot becomes a COLUMN [time chip over .kickdate
   \u2014 "weekday day month", 12.5px PC, one step smaller per the user's
   sketch "19 / weekday 22 month"], so the time and its date read as ONE
   centered stack between the two clubs. */
.bighero .kick{flex:0 0 auto;flex-direction:column;gap:6px;margin-top:20px;align-self:center}
/* v12.32: the date line under the hero's time chip \u2014 plain rows never
   carry it (their weekday/date stays in the info line); the hero's stack
   is [big time / smaller date]. */
/* v12.41-datecolor: the .kickdate now uses the same --countdown color as
   the .countdown time chip above it (was var(--text) — black, while the
   time was blue; the user's ask: 'must be same color'). Both the time and
   its date now read in the same blue hue, visually unified. */
.kickdate{font-size:11px;font-weight:700;color:var(--countdown);text-align:center;font-variant-numeric:tabular-nums;white-space:nowrap}
.bighero .kickdate{font-size:18px;font-weight:800;text-shadow:0 1px 10px rgba(2,6,23,.55)}
[data-theme="light"] .bighero .kickdate{text-shadow:0 1px 8px rgba(248,250,252,.9)}
/* v12.38-hero: Fix 2 + Fix 5 — the hero's kickoff-time pill is bumped to
   28px/900 PC (was 24px/800) so it's clearly the largest, most prominent
   number on the card. It now uses the --pill-primary-* token (blue bg +
   white ink) matching the CTA button, establishing a semantic color
   system: primary = action/headline, hype = derby, neutral = info. The
   mid-band (601-900px) scales to 20px, phones keep 18px. */
.bighero .kick .countdown{font-size:28px;font-weight:900;padding:8px 22px;border-radius:14px;line-height:1;font-variant-numeric:tabular-nums;background:var(--pill-primary-bg);color:var(--pill-primary-ink);box-shadow:inset 0 0 0 1px var(--pill-primary-line),0 6px 24px rgba(37,99,235,.32);text-shadow:0 1px 14px rgba(2,6,23,.5);display:flex;align-items:center;justify-content:center}
[data-theme="light"] .bighero .kick .countdown{box-shadow:inset 0 0 0 1px var(--pill-primary-line),0 6px 20px rgba(37,99,235,.22);text-shadow:0 1px 10px rgba(255,255,255,.5)}
.bighero .score{font-size:24px;flex:0 0 auto;padding:0 8px}
.bighero .uclspot-info{font-size:13.5px}
.bighero .info{font-size:13.5px}
/* v12.28: the NARROW-PC band (601\u2013900px) \u2014 the 2x hero crests (102px) plus
   the (now big) time chip squeezed the name columns to ~50\u201399px there, so
   names like Manchester United wrapped even before this release. Mid-band
   scale: crest 56px, chip 18px, hero names 13px \u2192 each name keeps ~125px,
   one line (measured: "Manchester United" \u2248114px). \u2265901px the full poster
   treatment (102px crest + 24px chip) has room again. */
@media (min-width:601px) and (max-width:900px){
/* v12.x-hero-bigger: hero logos 72px in the mid-band (vs topspot 64px)
   so the featured match stays bigger than the list below. Was 56px
   (smaller than the topspot's 64px — the reverse of the hierarchy). */
.bighero .logo{width:72px;height:72px;font-size:32px}
.bighero .kick .countdown{font-size:20px;padding:6px 16px;border-radius:12px}
.bighero .score{font-size:20px}
.bighero .team{font-size:13px}
}
/* v12.x-kick-5px-pc: move the time box 5px further down on PC (≥901px).
   The base margin-top is 20px (applies to all viewports). On desktop
   only, bump to 25px (+5px) per the user's ask. Mobile + mid-band
   keep 20px. */
@media (min-width:901px){.bighero .kick{margin-top:25px}}
/* v12.23 (the user's ask): the finished card's info line now matches the
   spot boxes' .uclspot-info exactly \u2014 one centered chip line under every
   match row on the page (same flex/wrap/gap/font), so all cards read as
   one aligned system instead of two different row styles. */
.info{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:8px;font-size:12.5px;color:var(--muted);margin-top:6px;text-align:center}
/* v12.38-hero: Fix 5 — .comp (league badge) now uses the --pill-neutral-*
   token, matching the percentage badge. Was var(--badge-league) (solid
   grey); now the soft neutral bg + line + ink for a consistent system. */
.comp{display:inline-block;background:var(--pill-neutral-bg);color:var(--pill-neutral-ink);border:1px solid var(--pill-neutral-line);border-radius:999px;padding:3px 10px;font-size:11px;margin-inline-start:6px;font-weight:600}
.complogo{width:14px;height:14px;border-radius:3px;vertical-align:-2.5px;margin-inline-end:5px}
.countdown{color:var(--countdown);font-weight:700;font-size:11.5px;background:var(--countdown-bg);border-radius:999px;padding:3px 10px;display:inline-block;margin-left:6px}
.venue{display:inline-block;background:var(--t-neutral-soft);border-radius:999px;padding:3px 10px;font-size:11px;margin-left:6px;font-weight:600;color:var(--text)}
/* v12.13: the standings grid is EXPLICIT, per the user's ask \u2014 2 columns on
   phones, 3 columns everywhere else (the page caps at 760px, so 3 boxes/row
   at ~233px each, two tidy rows for the 6 leagues). The old auto-fit
   minmax(150px,1fr) packed FOUR boxes per row on desktop. */
.grid4{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
@media (min-width:601px){.grid4{grid-template-columns:repeat(3,minmax(0,1fr))}}
.stbox{position:relative;background:var(--glass);-webkit-backdrop-filter:blur(12px) saturate(1.3);backdrop-filter:blur(12px) saturate(1.3);border:1px solid var(--glass-border);border-radius:12px;padding:10px 12px;box-shadow:var(--glass-shadow),inset 0 1px 0 var(--glass-hi);min-width:0}
.stbox-head{display:flex;align-items:center;gap:6px;font-size:12.5px;font-weight:800;margin-bottom:6px;min-width:0}
.stbox-head img{width:20px;height:20px;border-radius:3px;flex-shrink:0}
/* v12.37-pclogo: on PC (≥1440px, the wide-rail layout) the league emblem
   images in the standings card headers are doubled (20px → 40px = +100%,
   the user's ask). Phones + tablets keep the 20px size. */
@media (min-width:1440px){.stbox-head img{width:40px;height:40px;border-radius:5px}}
.strow{display:flex;align-items:center;gap:6px;font-size:11.5px;padding:2.5px 0;border-bottom:1px dashed var(--border)}
.strow:last-child{border-bottom:none}
/* v12.27 (review item 4): the compact boxes carry a COLUMN HEADER for the
   points number (\xAB\u0627\u0645\u062A\u06CC\u0627\u0632\xBB / \xABPts\xBB) \u2014 the full UCL table already labels every
   column; the same data type is no longer unlabeled in the mini grids. The
   header row rides the same 6px-gap flex line the rows use, so the label
   sits exactly over the numbers column (stpts gets a fixed 34px end-aligned
   slot to lock the pair). */
.sthead{display:flex;align-items:center;gap:6px;padding:0 2px 3px;border-bottom:1px solid var(--border)}
.sthead-fill{flex:1}
.sthead-p{font-size:9.5px;font-weight:700;color:var(--muted);min-width:34px;text-align:end;flex-shrink:0}
.stpos{width:16px;text-align:center;font-weight:800;color:var(--muted);flex-shrink:0}
.stpos.top3{color:var(--accent)}
/* v12.x-bold-top1: the leader (position 1) of each league is bolded —
   the entire row (position number + team name + points) gets a heavier
   font-weight so the table leader stands out at a glance. The font-size
   is also 2 units larger (11.5px → 13.5px) for the leader's name. */
.strow.top1{font-weight:800;font-size:13.5px}
.strow.top1 .stname{font-weight:800;font-size:13.5px}
.strow.top1 .stpts{font-weight:800}
.strow.top1 .stpos{font-weight:800}
.stname{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
/* v12.18: UCL rows carry a ROUND club crest (the user's ask) \u2014 same circle
   language as the match rows, miniaturized for the dense table. */
.stname.haslogo{display:flex;align-items:center;gap:5px;overflow:hidden}
.stname.haslogo .sttxt{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.stlogo{width:19px;height:19px;border-radius:50%;background:var(--bg);border:1px solid var(--border);object-fit:contain;flex-shrink:0}
.stpts{font-weight:800;flex-shrink:0;min-width:34px;text-align:end;font-variant-numeric:tabular-nums}
/* v12.16: the UCL card is a COMPLETE league table \u2014 MP/W/D/L/GF/GA/GD/Pts
   stat columns + a sticky header row; the W/D/L/GF/GA middle columns fold
   away on phones (\u2264600px), leaving # | team | MP | GD | Pts. */
.stnum{width:26px;text-align:center;flex-shrink:0;font-variant-numeric:tabular-nums;color:var(--muted)}
.strow.uclhead{position:sticky;top:0;background:var(--bg);border-bottom:1px solid var(--border);z-index:1;font-weight:700}
.strow.uclhead .stnum{font-size:9.5px;font-weight:700;color:var(--muted);line-height:1.3}
.strow.uclhead .stpts{font-size:10px;color:var(--muted)}
@media (max-width:600px){.ucl-hidem{display:none}}
.stempty{color:var(--muted);font-size:11.5px;padding:4px 0}
.stnot-overlay{position:absolute;top:38px;left:8px;right:8px;bottom:8px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;background:rgba(2,6,23,.52);-webkit-backdrop-filter:blur(7px) saturate(1.2);backdrop-filter:blur(7px) saturate(1.2);border-radius:10px;text-align:center;z-index:2;box-shadow:inset 0 1px 0 var(--glass-hi)}
[data-theme="light"] .stnot-overlay{background:rgba(248,250,252,.6)}
.stnot-ovl-label{font-size:12px;font-weight:800;color:var(--text)}
.stnot-ovl-timer{font-size:10.5px;font-weight:700;color:var(--countdown);background:var(--countdown-bg);border-radius:999px;padding:2px 10px;font-variant-numeric:tabular-nums}
.cupgrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
.cupbox{background:var(--glass);-webkit-backdrop-filter:blur(12px) saturate(1.3);backdrop-filter:blur(12px) saturate(1.3);border:1px solid var(--glass-border);border-radius:12px;padding:10px 12px;box-shadow:var(--glass-shadow),inset 0 1px 0 var(--glass-hi)}
.cupbox-head{display:flex;align-items:center;gap:6px;font-size:12.5px;font-weight:800;margin-bottom:4px}
.cupbox-head img{width:18px;height:18px;border-radius:4px}
.cupgroup-title{margin:12px 0 6px;font-size:12.5px;font-weight:800;color:var(--muted);display:flex;align-items:center;gap:6px}
.cupgroup-title:first-child{margin-top:0}
.cupmatch{font-size:11.5px;line-height:1.7}
.cupmatch .teams{font-weight:700}
.cupdate{color:var(--muted);font-size:11px}
.cupdate .live-tag{color:var(--t-success-ink);font-weight:700}
/* v12.31 (the user's ask): "the '...' button caused match time and day not
   be perfectly aligned on center, we need to relocate this '...' to
   somewhere else like top corner (left or right) based on RTL/LTR". The \u22EF
   was a flex item INSIDE the centered info line \u2014 its 44px footprint
   pushed the weekday/date text off the box's true center. The toggle now
   owns the match box's TOP INLINE-END corner (position:absolute on
   .mrow/.spotitem, which are position:relative since this release \u2014
   logical inset-inline-end mirrors RTL/LTR automatically: left corner on
   the fa page, right corner on the en page). The 16px dots icon is
   CORNER-ANCHORED (padding-block-start/inset-inline-end offsets, not
   centered) so on PC it clears the round crest that hugs that corner \u2014
   a crest's square corner is empty space, the circle's ink starts
   ~10px in along the diagonal; the centered hit area (44\xD744) may overlap
   the crest's empty corner harmlessly (the crest is not interactive).
   Phones have the corner fully free (face-off crests are centered in
   their half-width columns). The info line centers across the FULL row
   width again; the popover unfolds under the corner dots as before. */
.sharewrap{position:absolute;top:0;inset-inline-end:0;z-index:6;width:44px;height:44px}
.sharetoggle{display:inline-flex;align-items:flex-start;justify-content:flex-end;width:44px;height:44px;padding-block-start:8px;padding-inline-end:4px;border-radius:14px;background:transparent;border:none;cursor:pointer;font-family:inherit;color:#93c5fd;transition:color .15s,background .15s}
/* v12.x-dots-color (the user's ask): the 3-dot share toggle is LIGHT BLUE
   in dark mode (#93c5fd — matches the site's --link/--countdown) and
   SILVER in light mode (#9ca3af — gray-400, reads as silver on white).
   The hover state still brightens to var(--text) for feedback. */
[data-theme="light"] .sharetoggle{color:#9ca3af}
.sharetoggle:hover{color:var(--text);background:var(--hover)}
.sharetoggle:active{transform:scale(.88)}
.sharetoggle:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.sharetoggle svg{display:block;fill:currentColor}
.share{display:none;position:absolute;top:40px;inset-inline-end:0;align-items:center;gap:5px;background:var(--card);border:1px solid var(--border);border-radius:12px;padding:6px;box-shadow:0 12px 32px rgba(2,6,23,.45),inset 0 1px 0 var(--glass-hi);z-index:7}
.sharewrap.open .share{display:inline-flex}
.share a,.share button{display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:10px;background:var(--chip);border:1px solid var(--border);padding:0;cursor:pointer;font-family:inherit;color:var(--muted);text-decoration:none;transition:transform .15s,background .15s}
.share a:hover,.share button:hover{transform:translateY(-1px);background:var(--hover)}
.share a:active,.share button:active{transform:scale(.9)}
.share svg{display:block}
/* v12.31 (the user's ask): "remove the 3d-gradient vibe of \u0635\u062F\u0631 \u062C\u062F\u0648\u0644 use less
   3d effect, more 2d colors. (3d is visual noise)". The v12.29 metallic
   trophy plate (vertical highlight\u2192deep-gold gradient + inset sheen + amber
   glow + engraved text-light) is RETIRED \u2014 the badge is a FLAT 2D pill now.
   v12.34-pastel (the user's ask): the saturated amber #fbbf24 was too loud
   \u2014 it grabbed the eye too much. Switched to a PASTEL yellow field
   (#fef9c3 \u2014 Tailwind yellow-100) with a deeper pastel edge (#fde68a
   \u2014 yellow-200, replaces the --badge-top dark-gold outline) and the same
   dark engraved ink (#451a03 \u2014 reads on both themes). opacity:.92 keeps
   the pill from screaming on glass surfaces. \u{1F3C6} stays (v12.29):
   leading the table = lifting the cup, but quietly now. */
.topbadge{display:inline-flex;align-items:center;background:#fef9c3;color:#451a03;border-radius:999px;padding:2px 10px;font-size:11.5px;font-weight:800;margin-inline-start:6px;vertical-align:middle;border:1px solid #fde68a;opacity:.92}
#msg{text-align:center;color:var(--muted);font-size:13px;padding:12px}
.empty{color:var(--muted);text-align:center;padding:24px;font-size:14px}
/* v12.56: loading animation — a subtle spinner shown while cards fetch
   new data. The .card-loading class is added to content containers (e.g.
   #standings, #topSpot, #finished) while load() is in progress. The
   existing content fades to .4 opacity + a spinner appears centered.
   v12.x-loading-lottie: the CSS spinner is RETIRED — replaced by the
   loading.lottie animation (a 500x500 Lottie, shown at 48x48px). The
   Lottie player is injected via JS (addLoadingLottie helper) when the
   .card-loading class is added, and removed when it's removed. The
   ::after pseudo-element is now transparent (no border spinner). */
.card-loading{position:relative;min-height:60px;opacity:.4;transition:opacity .25s;pointer-events:none}
.card-loading::after{content:"";position:absolute;top:50%;left:50%;width:48px;height:48px;margin:-24px 0 0 -24px;opacity:1;z-index:10;background:transparent}
.card-loading dotlottie-player.loading-lottie{position:absolute;top:50%;left:50%;width:48px;height:48px;margin:-24px 0 0 -24px;z-index:10;opacity:1;pointer-events:none}
@keyframes card-spin{to{transform:rotate(360deg)}}
/* v12.x-loading-lottie: the .empty loading state (initial load) now
   shows the loading.lottie animation centered instead of the 'در حال
   بارگذاری...' text. The text is kept for screen readers (sr-only)
   but the Lottie animation is the visual. */
.empty.loading-empty{position:relative;min-height:80px;padding:24px;display:flex;align-items:center;justify-content:center}
.empty.loading-empty dotlottie-player.loading-lottie{width:48px;height:48px}
.empty.loading-empty .sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
/* v12.32 (the user's ask): the «بیشتر» expander under the finished card's
   first five rows \u2014 one tap shows the latest 20 (server cap), the pill
   flips to «کمتر» to collapse. Same pill on PC and phones. */
.finmore{display:flex;align-items:center;justify-content:center;gap:6px;width:fit-content;margin:12px auto 2px;padding:7px 20px;border-radius:999px;background:var(--chip);border:1px solid var(--border);color:var(--muted);font-family:inherit;font-size:12.5px;font-weight:700;cursor:pointer;transition:color .15s,background .15s,transform .15s cubic-bezier(.16,1,.3,1)}
.finmore:hover{color:var(--text);background:var(--hover);transform:translateY(-1px)}
.finmore:active{transform:scale(.96)}
.finmore:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
/* v12.26 (the user's ask): "the \u062A\u0645\u0627\u0633 \u0628\u0627 \u0645\u0627 and \u062F\u0631\u0628\u0627\u0631\u0647 \u0645\u0627 must be right
   aligned. currently they're center aligned" \u2014 the footer block (and the
   nav rows that carry \u062F\u0631\u0628\u0627\u0631\u0647/\u062A\u0645\u0627\u0633, header + phone footer) align to the
   START edge now: right in the RTL fa page (left in the EN ltr mirror),
   the natural reading edge \u2014 no longer dead-center. */
/* v12.34-pastel: the About + Contact blocks at the foot of the page
   (the user's ask). About carries the SportSignal origin story (fa+en);
   Contact carries the bug-hunt / suggestion email sportsignal@atomicmail.io.
   Both sit in the footer's #about anchor block. */
.aboutbox,.contactbox{margin:0 0 16px;padding:14px 16px;border:1px solid var(--border);border-radius:12px;background:var(--card)}
.aboutbox h3,.contactbox h3{font-size:14.5px;font-weight:800;color:var(--text);margin:0 0 8px;display:flex;align-items:center;gap:8px}
.aboutbox p,.contactbox p{font-size:13px;line-height:1.85;color:var(--muted);margin:0 0 8px}
.aboutbox p:last-child,.contactbox p.contact-cta{margin:0}
.contactbox .contact-cta{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-top:6px}
.contactbox .contact-cta a{font-weight:800;color:var(--link);text-decoration:none;padding:6px 14px;border:1px solid var(--border);border-radius:999px;font-size:13px;background:var(--bg);transition:background .15s,border-color .15s}
.contactbox .contact-cta a:hover{background:var(--hover);border-color:var(--link)}
.contactbox .contact-email{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:13px;color:var(--text);direction:ltr;display:inline-block}
.aboutbox .about-tag{font-size:14.5px;font-weight:800;color:var(--text);line-height:1.6;margin:0 0 12px;padding:8px 12px;border-inline-start:3px solid var(--link);background:var(--bg);border-radius:0 8px 8px 0}
footer{text-align:start;color:var(--footer);font-size:12px;margin-top:28px;line-height:2}
footer a{color:var(--link);text-decoration:none}
footer a:hover{text-decoration:underline}
/* v12.25 (the user's ask): the \xAB\u062E\u0627\u0646\u0647 \u062F\u0631\u0628\u0627\u0631\u0647 \u062A\u0645\u0627\u0633\xBB nav \u2014 PCs get it in the
   header, phones get the same three links at the top of the footer. All
   three are REAL destinations: home reloads, about anchors to the
   footer's identity block (id="about"), contact opens the Telegram bot \u2014
   the site's contact channel.
   v12.26 (the user's ask): the nav rows align to the START edge (right on
   the RTL page) \u2014 hugging the logo on PC, right-aligned in the footer \u2014
   no longer centered. */
.mainnav{display:none}
.footnav{display:none}
@media (min-width:601px) and (max-width:1439px){
.mainnav{display:flex;order:3;flex:1 1 100%;justify-content:flex-start;align-items:center;gap:2px}
}
@media (min-width:1440px){
.mainnav{display:flex;flex:1 1 auto;justify-content:flex-start;align-items:center;gap:2px;min-width:0}
}
.mainnav a{color:var(--nav-link);text-decoration:none;font-size:13.5px;font-weight:700;padding:8px 16px;border-radius:10px;transition:color .15s,background .15s;white-space:nowrap}
.mainnav a:hover{color:var(--nav-link-hover);background:var(--hover)}
@media (max-width:600px){
.footnav{display:flex;justify-content:flex-start;align-items:center;gap:2px;flex-wrap:wrap;margin:0 0 8px}
.footnav a{color:var(--link);text-decoration:none;font-size:13px;font-weight:700;padding:4px 12px;border-radius:8px}
.footnav a:hover{text-decoration:underline}
}
@media (max-width:600px){
body{padding:16px 12px 28px;background-attachment:scroll}
h1{font-size:23px}
.sub{font-size:12.5px}
/* v12.26: the header CTA is a COMPACT pill now (it lives in the website
   header, not a hero block) \u2014 the old full-width hero button rule is
   retired; the sticky bottom join bar still covers scroll-time CTA. */
#topbar .cta{font-size:11.5px;padding:8px 12px;gap:6px}
.head-actions{gap:6px}
#topbar{margin-bottom:8px}
/* v12.52-mobile-header: on mobile, the header shows 3 icon buttons (lang,
   theme, Telegram) grouped on the LEFT + the logo on the RIGHT. The text
   CTA button is hidden (the Telegram icon button replaces it). The
   timezone button (⚙️) is hidden on mobile (it's a desktop power-user
   feature; the timezone is also in the admin panel). The 3 buttons sit
   in the .tb-btns container with a glass background + rounded corners. */
#topbar .cta{display:none}
#tgbtn{display:flex}
#sbtn{display:none}
.tb-btns{display:inline-flex;gap:4px;padding:4px;background:var(--glass);-webkit-backdrop-filter:blur(10px) saturate(1.3);backdrop-filter:blur(10px) saturate(1.3);border:1px solid var(--glass-border);border-radius:12px}
.card{padding:13px 9px}
h2{font-size:15.5px;padding:8px 12px}
#topspotCard h2,#uclSpotCard h2{font-size:17px}
/* v12.28 (the user's ask): "find out why the place is limited in mobile
   mode, so a club name like Manchester United, became two rows, which is
   ugly. (i think it's because of padding and spacing.)" \u2014 diagnosis: the
   horizontal A [time] B row inside a 314px phone box (body 2\xD712 + card
   2\xD710 + spotitem 2\xD710 + match 2\xD76 + 2\xD78px gaps + the fixed 80px time
   slot + 2\xD746px crests + 2\xD78px side gaps) left each name column ~55px \u2014
   even \xAB\u0645\u0646\u0686\u0633\u062A\u0631\u06CC\u0648\u0646\u0627\u06CC\u062A\u062F\xBB wrapped. Fix \u2014 the phone row becomes a FACE-OFF:
   both sides ride one line as COLUMNS (crest above its centered name \u2014
   a name now gets ~half the row, never a 55px sliver), and the time/
   score slot moves to its OWN centered line BELOW via flex order (the
   v12.25 rule "the time sits with ITS two teams" survives vertically:
   both teams sandwich it). Padding trimmed around the row (card 10\u21929,
   match 10px 6px\u21926px 2px, gap 8\u21926) buys back more name width; the hero's
   big 20px chip centers on that same full-width line.
   v12.32 (the user's ask): "in mobile view, move the match time, between
   the clubs' logos. and align with them" \u2014 the time/score slot is BACK
   ON the crest line: order:1 slots it BETWEEN the two side columns (DOM
   order [home][time][away] \u2192 visual home|time|away), align-self:flex-start
   + height:46px centers the chip exactly on the crest's vertical center
   line (the crest is 46px tall on phones), and the names stay under their
   crests. The hero's kick COLUMN ([chip + date]) rides the same slot with
   height:auto + a 3px top offset so its BIG chip centers on the crest
   line (chip \u224838px, (46-38)/2 \u22484px); its .kickdate follows below into
   the names' band, centered between the two name columns. */
.match{flex-wrap:wrap;gap:6px;padding:6px 2px}
.match .side{order:1;flex-direction:column;align-items:center;gap:3px}
.match .side .team{flex:0 0 auto;width:100%;min-width:0;text-align:center;font-size:13px;word-wrap:break-word;overflow-wrap:anywhere}
.match .side.away{flex-direction:column-reverse}
/* v12.32: direct children only (the hero's score is NESTED inside its .kick
   column \u2014 the old descendant selector would have re-flowed it). */
/* v12.54: separated .match>.kick (column: time over date) from
   .match>.score (row: "2 - 2" on one line). Was sharing one rule with
   flex-direction:column which stacked the score digits vertically. */
.match>.kick{order:1;flex:0 0 auto;align-self:center;height:auto;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;margin-top:0;min-width:0}
.match>.score{order:1;flex:0 0 auto;align-self:center;height:auto;display:flex;flex-direction:row;align-items:center;justify-content:center;margin-top:0;min-width:0;white-space:nowrap}
.bighero .match>.kick{height:auto;margin-top:3px;gap:4px}
.logo{width:37px;height:37px;font-size:16px}
/* v12.x-hero-bigger (the user's ask): the hero (featured single box) logos
   must be BIGGER than the topspot list logos (54px mobile) + the regular
   box logos (46px mobile) — the featured match is more important and
   imminent. The hero logos are now 64px on mobile (vs 54px topspot, 46px
   regular). Specificity (0,2,0) beats the .logo (0,1,0) base + the
   #topspotCard .spotitem .logo (1,2,0) is a different selector so no
   conflict. Desktop keeps the 102px hero (already bigger than the 64px
   topspot). */
.bighero .logo{width:64px;height:64px;font-size:28px}
.score{font-size:15px}
.kick .countdown{font-size:11.5px;padding:3px 9px}
.bighero .kick .countdown{font-size:20px;padding:6px 16px;border-radius:12px}
.bighero .kickdate{font-size:14px}
.bighero .bigbar-clock{font-size:12.5px}
.bighero .score{font-size:20px}
.bighero .uclspot-info,.bighero .info{font-size:12.5px}
/* v12.30 (the user's phone report \u2014 "the header of upcoming match in
   mobile looks distracting. disorganized and messy with a lot of
   noise"): the phone hero sheds its noise layers and gains real
   breathing room \u2014
     \xB7 the bar's decorative percent chip is OFF (it is aria-hidden
       garnish; the label + clock + track carry the story, and the freed
       ~56px stops the top row pinching on a 390px screen)
     \xB7 every seam gets air: more space under the bar, a taller gap
       before the big time number, room under the info chips so nothing
       is crammed against the card's edge (the VLM review of the user's
       screenshot flagged exactly those cramped seams)
   With the crest ghosts gone (the .hero-wm rule above) and the navy
   veil + blur calming the video, the phone hero is one quiet stack with
   a single hierarchy: bar \u2192 face-off \u2192 the big time number \u2192 info. The
   v12.28 display-size time chip (20px) and the face-off columns are
   untouched \u2014 the ask is less noise, not a smaller headline. */
.bighero .bigbar-pct{display:none}
/* v12.57: min-height only on mobile — the video stage needs room on
   phones. On PC the card sizes to its content (no excess space). */
/* v12.57: min-height only on mobile — the video stage needs room on
   phones. On PC the card also gets a min-height so the video/watermark
   background is visible even when the heroSpot is empty, but smaller
   than mobile (200px vs 240px) to avoid excessive empty space. */
.card.bighero{min-height:200px}
.bighero .bigbar{margin-bottom:0;padding:2px 2px 4px}
/* v12.32: retired .bighero .kick{margin-top:8px} \u2014 the kick column now sits
   BETWEEN the crests (rule above: margin-top:3px centers its chip on the
   46px crest line), not on its own line below the face-off. */
.bighero .uclspot-info{margin-top:10px;gap:6px}
/* v12.47-nospotbox: retired the old .bighero .spotitem padding — the
   spotitem is now borderless + backgroundless (see the v12.47 rule
   above), so the padding that framed the old box is gone too. The
   match row + info + share sit directly on the hero card's own
   surface, no inner container. */
.bighero .spotitem{padding:0}
.mrow,.spotitem{padding:8px 10px}
.info{font-size:11px;line-height:1.7}
#topbar button{padding:7px 12px}
#tzpanel{width:min(320px,calc(100vw - 24px))}
/* v12.27: phones keep the cluster's 44\xD744px hit areas \u2014 the base .tb-btns button rule applies unchanged below 600px. */
}
/* v12.21 (the user's ask): the v12.20 auto-placed two-per-row grid read as
   RANDOM on PC \u2014 shared grid rows dragged shorter cards down to ragged Y
   offsets (a ~500px hole opened under the UCL box, the standings pair
   started ~2100px below its column neighbor, and the results card sat alone
   in the last row). The \u22651440px layout now follows a REAL grid with
   hierarchy: full-width chrome (topbar \u2192 hero \u2192 countdown hero \u2192 footer), a
   MAIN column (inline start) carrying every match box, and a reference RAIL
   with the three table boxes \u2014 each column stacks flush, no shared rows, no
   holes. setWide() (page script) regroups the cards into #wideMain/#wideSide
   at the breakpoint and restores the exact single-column DOM order below
   it; the hero centers above the full-width countdown, whose match row is
   capped to a readable width. */
@media (min-width:1440px){
body{max-width:1400px;display:grid;grid-template-columns:minmax(0,1fr) minmax(400px,460px);column-gap:28px;row-gap:14px;align-items:start}
/* v12.24: the WEBSITE header spans the full chrome row \u2014 logo pinned to
   the start corner, settings + Telegram CTA at the other end (the old
   centered-controls bar + hero title block are retired). */
#topbar{margin-bottom:0}
#heroSpot{max-width:880px;margin:0 auto}
#wideMain,#wideSide{display:flex;flex-direction:column;gap:14px}
#wideMain>*,#wideSide>*{margin:0}
#wideSide .grid4{grid-template-columns:repeat(2,minmax(0,1fr))}
footer{margin-top:0}
#topbar,.herowrap,footer{grid-column:1/-1}
}
@keyframes rise{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}.bigcard{box-shadow:0 0 10px rgba(5,150,105,.16),0 8px 26px rgba(0,0,0,.35),var(--glass-shadow),inset 0 1px 0 rgba(255,255,255,.16)}}
@media (prefers-reduced-transparency:reduce){body{background:var(--bg)}.card,#topbar button,.bigbar,.stbox,.cupbox,.uclcard,.uclspot,#tzsel,#tzfilter,#tzpanel,#joinSticky{background:var(--card);-webkit-backdrop-filter:none;backdrop-filter:none;box-shadow:0 1px 2px rgba(15,23,42,.05)}}
</style>
</head>
<body>
<!-- v12.24 (the user's ask): a real WEBSITE header \u2014 the uploaded SportSignal
     logo rides the start corner ("Like websites logo"), the settings icons
     and the Telegram CTA group on the opposite end:
     [settings icons etc] [telegram cta button] \xB7\xB7\xB7\xB7 [logo].
     The old \xAB\u26BD \u0627\u0639\u0644\u0627\u0646\u200C\u062F\u0647\u0646\u062F\u0647 \u0645\u0633\u0627\u0628\u0642\u0627\u062A\xBB h1 and its subtitle are RETIRED per the
     ask; the v12.20 sync stamp becomes the header's quiet second row. The
     tz popover still anchors to this bar (same ids, same wiring \u2014 only the
     chrome around them changed). -->
<header id="topbar">
<!-- v12.26 (the user's ask): "in darkmode it turns to a white sillohuette.
     fix this. show the given logo in both light and dark mode" \u2014 the white
     remap variant is RETIRED; the uploaded transparent png rides BOTH themes
     (its navy + white inks read on dark, its navy on light), 40% SMALLER on
     PC per the ask (84px \u2192 50px, phones already 50px); the classic
     \xAB\u062E\u0627\u0646\u0647 \u062F\u0631\u0628\u0627\u0631\u0647 \u062A\u0645\u0627\u0633\xBB nav rides the header's start side on PC (phones get
     it in the footer) \u2014 v12.26 right-aligned with the logo, not centered. -->
<a class="brand" href="/" aria-label="SportSignal"><img src="/logo.png" alt="SportSignal" width="146" height="50" referrerpolicy="no-referrer"></a>
<nav class="mainnav" aria-label="\u0646\u0627\u0648\u0628\u0631\u06CC \u0627\u0635\u0644\u06CC"><a href="/" data-i="navHome">\u062E\u0627\u0646\u0647</a><a href="#about" data-i="navAbout">\u062F\u0631\u0628\u0627\u0631\u0647</a><a href="#contact" data-i="navContact">\u062A\u0645\u0627\u0633</a></nav>
<div class="head-actions"><a class="cta" href="https://t.me/SportSignalAlertsBot" target="_blank" rel="noopener" data-i="join">\u0639\u0636\u0648\u06CC\u062A \u062F\u0631 \u0631\u0628\u0627\u062A \u062A\u0644\u06AF\u0631\u0627\u0645</a><span class="tb-btns"><button id="sbtn" onclick="toggleTz()" aria-expanded="false" aria-controls="tzpanel" title="\u0645\u0646\u0637\u0642\u0647 \u0632\u0645\u0627\u0646\u06CC" aria-label="\u0645\u0646\u0637\u0642\u0647 \u0632\u0645\u0627\u0646\u06CC">\u2699\uFE0F</button><button id="lbtn" onclick="switchLang()"></button><button id="tbtn" onclick="toggleTheme()"></button><a id="tgbtn" href="https://t.me/SportSignalAlertsBot" target="_blank" rel="noopener" class="icon-tg" aria-label="Telegram" title="Telegram"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg></a></span></div>
<div id="tzpanel" role="group" aria-label="\u0645\u0646\u0637\u0642\u0647 \u0632\u0645\u0627\u0646\u06CC"><div class="tz-head"><span data-i="tzTitle">\u{1F30D} \u0645\u0646\u0637\u0642\u0647 \u0632\u0645\u0627\u0646\u06CC</span><button id="tzclose" onclick="toggleTz()" title="\u0628\u0633\u062A\u0646" aria-label="\u0628\u0633\u062A\u0646">\u2715</button></div><input id="tzfilter" type="search" placeholder="\u062C\u0633\u062A\u062C\u0648\u06CC \u06A9\u0634\u0648\u0631 \u06CC\u0627 \u0634\u0647\u0631\u2026" data-p="tzSearch" aria-label="\u062C\u0633\u062A\u062C\u0648\u06CC \u06A9\u0634\u0648\u0631 \u06CC\u0627 \u0634\u0647\u0631"><select id="tzsel" title="\u0645\u0646\u0637\u0642\u0647 \u0632\u0645\u0627\u0646\u06CC" aria-label="\u0645\u0646\u0637\u0642\u0647 \u0632\u0645\u0627\u0646\u06CC"></select></div>
<!-- v12.20: visible PROOF for the auto-update claim. v12.26: the sync line
     prints the TRUTHFUL absolute stamp of the last real API refresh \u2014
     \xAB\u0622\u062E\u0631\u06CC\u0646 \u0628\u0647\u200C\u0631\u0648\u0632\u0631\u0633\u0627\u0646\u06CC: \u062C\u0645\u0639\u0647 \u06F2\u06F1:\u06F3\u06F0 \u0634\u0628\xBB (weekday + time + period word) \u2014
     rendered by renderSync()/fmtStamp() from the payload's fetchedAt. -->
<p class="sub sync" id="lastSync" role="status" aria-live="polite"></p>
</header>
<!-- v12.12: the view toggle is RETIRED \u2014 the page is permanently big-only
     (\xAB\u0641\u0642\u0637 \u0628\u0627\u0632\u06CC\u200C\u0647\u0627\u06CC \u0628\u0632\u0631\u06AF\xBB, the user's default). The hero card + the topspot
     box + the UCL box ARE the upcoming presentation. -->
<!-- v12.10/v12.11 HERO CARD: the countdown bar and ITS match are ONE card at
     the very top \u2014 the closest upcoming big match (the big-matches box's
     slot 1, the match the countdown tracks) sits STUCK to the bar, separated
     from the other big matches in the box below (user ask: the next big
     match must be stuck to its countdown). v12.11: the card is a PLAIN
     standard card \u2014 same glass/border as every other section \u2014 and its match
     row is styled like any other match row (no special box; streamlined).
     #bigbar keeps its id \u2014 updateBigBar drives label/clock/fill every
     second; #heroSpot is filled by renderHeroSpot from the SAME barTarget()
     pick, so the card under the countdown is always exactly the match being
     counted down to. -->
<!-- v12.27 (review item 1): .herowrap \u2014 the clip host's shell. The card
     inside carries overflow:hidden (clips the video/crest/fx layers to its
     16px radius), while this wrapper's ::before owns the OUTER heartbeat
     aura (a child's outer box-shadow would be clipped by the card). updateBigBar
     mirrors data-urgent here so the escalation ladder keeps driving both. -->
<div class="herowrap">
<div class="card bighero" id="bigHeroCard" style="display:none">
<!-- v12.26 (the user's ask): layer A \u2014 the VIDEO STAGE, deepest of the four:
     video \u203A background logos \u203A css effects \u203A actual data. The user's own
     7.2s clip loops muted+autoplay+playsinline from /hero-stage.mp4
     (worker [assets]), clipped + scrimmed so the data above stays king;
     a prefers-reduced-motion user keeps autoplay too (v12.28 \u2014 the user's
     twice-repeated ask outweighs the media query for this one element). -->
<div class="hero-video" aria-hidden="true"><video src="/hero-stage.mp4" autoplay muted loop playsinline preload="auto" tabindex="-1" disablepictureinpicture referrerpolicy="no-referrer"></video></div>
<!-- v12.22: the hero stage's ember layer \u2014 static markup OUTSIDE #heroSpot
     so it survives every re-render, clipped to the card, pointer-transparent. -->
<div class="hero-fx" aria-hidden="true"><i></i><i></i><i></i></div>
<!-- v12.23 (the user's ask): the clubs' EXPANDED, faded crests behind the
     stage \u2014 "[faded logo big on background] [club logo] club name". Static
     layer OUTSIDE #heroSpot (like the ember layer) so re-renders never
     disturb it; renderHeroSpot \u2192 heroWm() swaps the two crest srcs per
     match; a club without a crest hides its watermark. -->
<div class="hero-wm" aria-hidden="true"><img alt="" referrerpolicy="no-referrer" onerror="this.style.display='none'"><img alt="" referrerpolicy="no-referrer" onerror="this.style.display='none'"></div>
<!-- v12.26: layer D \u2014 the DATA SURFACE. The countdown bar and its match row
     ride ONE positioned layer (z:3) above the video (z:0), the crests (z:1)
     and the css fx (z:2) \u2014 exactly the user's ladder. -->
<div class="hero-data">
<!-- v12.46-herofix: the match row (heroSpot) rides ABOVE the countdown bar
     (the user's ask: "move this loading to below team names"). The bigbar
     now sits BELOW the match row, not above it. A ⚽ football emoji is
     prepended to the bigbar label for visual identity. -->
<div id="heroSpot"></div>
<div id="bigbar" class="bigbar">
<div class="bigbar-top"><span id="bigbarLabel" data-i="barNext">\u26A1 \u062A\u0627 \u0628\u0627\u0632\u06CC \u0628\u0632\u0631\u06AF \u0628\u0639\u062F\u06CC</span><span class="bb-end"><span id="bigbarClock" class="bigbar-clock">--:--:--</span><span id="bigbarPct" class="bigbar-pct" aria-hidden="true"></span></span></div>
<div class="bigbar-track" id="bigbarTrack" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><div id="bigbarFill" class="bigbar-fill"></div></div>
</div>
</div>
</div>
</div>
<!-- v12.3/v12.4/v12.7/v12.8 TOP BOX (league), per the user's rules: TOP CL GAME (two
     selected teams in the Champions League) \u2192 the UCL BOX below; big DOMESTIC
     matches (derbies like the Madrid derby, top-of-the-table clashes and
     selected-vs-selected clashes like the Manchester derby) \u2192 THIS box,
     heading the games list so a derby can never sit 3rd/4th in kickoff order.
     v12.7: the card consolidates the big upcoming matches (user's ask \u2014
     Atl\xE9tico\u2013Real Madrid and the Manchester derby in the SAME box); a match
     that is BOTH a derby and a top-of-the-table clash shows BOTH tags.
     v12.8: only TRUE big matches qualify (A: two selected teams / B: both
     sides top-3 / C: derby; fallback when A/B/C run short: a selected team
     vs a TOP-5 side of that league \u2014 never a routine selected fixture like
     Liverpool\u2013Fulham) and the order is STRICTLY kickoff \u2014 closest upcoming
     on top, live first.
     v12.10: slot 1 \u2014 the countdown's own match \u2014 now lives in the HERO CARD
     at the very top (bar + match stuck together, per the user's ask); THIS
     box presents the REMAINING big matches. Box fixtures are
     excluded from the upcoming list below \u2014 this box IS their presentation.
     Hidden when nothing qualifies \u2014 or when the hero took the only entry.
     v12.11: plain .card \u2014 no golden chrome; entries are uniform match rows.
     v12.12: capacity raised \u2014 up to TEN entries (11 picked server-side,
     slot 1 = the hero; the user's ask).
     v12.13: THIS box now sits BETWEEN the hero and the UCL box (user's ask \u2014
     order: [next big match countdown and teams] \u2192 [big upcoming matches] \u2192
     [big upcoming UCL matches]). -->
<!-- v12.42-livesection: the LIVE section — matches currently playing/broadcasting
     (whether 1 or 20), with a special LIVE badge. The card auto-hides when no
     matches are live (display:none via renderLive). Matches stay here as long
     as the match status is LIVE/IN_PLAY/PAUSED. -->
<div class="card" id="liveCard" style="display:none">
<h2 data-i="hLive">\u{1F534} \u0645\u0633\u0627\u0628\u0642\u0627\u062A \u0632\u0646\u062F\u0647</h2>
<div id="liveMatches"><div class="empty loading-empty"><dotlottie-player class="loading-lottie" src="/loading.lottie" autoplay loop background="transparent" aria-hidden="true"></dotlottie-player><span class="sr-only" data-i="loading">\u062F\u0631 \u062D\u0627\u0644 \u0628\u0627\u0631\u06AF\u0630\u0627\u0631\u06CC...</span></div></div>
</div>
<div class="card" id="topspotCard" style="display:none">
<h2 data-i="hLgNext" id="topSpotTitle">\u{1F525} \u0645\u0633\u0627\u0628\u0642\u0627\u062A \u0628\u0632\u0631\u06AF \u067E\u06CC\u0634\u200C\u0631\u0648</h2>
<div id="topSpot"><div class="empty loading-empty"><dotlottie-player class="loading-lottie" src="/loading.lottie" autoplay loop background="transparent" aria-hidden="true"></dotlottie-player><span class="sr-only" data-i="loading">\u062F\u0631 \u062D\u0627\u0644 \u0628\u0627\u0631\u06AF\u0630\u0627\u0631\u06CC...</span></div></div>
</div>
<!-- v12.2: the UCL box sits above the games list (was below it). v12.4: while
     the selected-vs-selected CL pairing is far away the box headlines the
     nearest CL match with \u22651 selected team (live scores too).
     v12.12: the box is GENERALIZED (the user's ask) \u2014 up to EIGHT upcoming
     CL fixtures in kickoff order (live first; "two today, two tomorrow"),
     and ONLY matches with \u22651 SELECTED club (Sabah FK vs SK Slavia Praha is
     noise). Same spotitem rows as every other box (v12.11 uniform). Hidden
     when nothing qualifies; the pre-draw wait state counts to the projected
     first kickoff.
     v12.13: moved BELOW the big-matches box (user's ask \u2014 the domestic big
     matches outrank the UCL ones in reading order; hero \u2192 topspot \u2192 uclspot). -->
<div class="card uclspot" id="uclSpotCard">
<!-- v12.21 (the user's ask): the UCL-dedicated box carries the brand \u2014 the
     starball on its white chip inside the navy plate. data-i moved to the
     INNER span so trText() can never clobber the logo. -->
<h2 id="uclSpotTitle" class="uclh2"><span class="ucl-logo" aria-hidden="true">${UCL_LOGO_CHIP}</span><span data-i="hUclNext">\u{1F525} \u0645\u0633\u0627\u0628\u0642\u0627\u062A \u0645\u0647\u0645 \u0644\u06CC\u06AF \u0642\u0647\u0631\u0645\u0627\u0646\u0627\u0646 \u0627\u0631\u0648\u067E\u0627</span></h2>
<div id="uclSpot"><div class="empty loading-empty"><dotlottie-player class="loading-lottie" src="/loading.lottie" autoplay loop background="transparent" aria-hidden="true"></dotlottie-player><span class="sr-only" data-i="loading">\u062F\u0631 \u062D\u0627\u0644 \u0628\u0627\u0631\u06AF\u0630\u0627\u0631\u06CC...</span></div></div>
</div>
<!-- v12.16: \xAB\u062F\u0631 \u0627\u06CC\u0646 \u0647\u0641\u062A\u0647\xBB \u2014 the CURRENT Iranian week (Saturday\u2192Friday)
     agenda: every followed/top-3 game of this week in one box, live first,
     then kickoff order; games already played this week keep their final
     score. Zero extra API calls (same pool as the big boxes); hidden when
     the week has no followed games. -->
<div class="card" id="weekCard" style="display:none">
<h2 data-i="hWeek" id="weekTitle">\u{1F4C5} \u062F\u0631 \u0627\u06CC\u0646 \u0647\u0641\u062A\u0647</h2>
<div id="weekBox"><div class="empty loading-empty"><dotlottie-player class="loading-lottie" src="/loading.lottie" autoplay loop background="transparent" aria-hidden="true"></dotlottie-player><span class="sr-only" data-i="loading">\u062F\u0631 \u062D\u0627\u0644 \u0628\u0627\u0631\u06AF\u0630\u0627\u0631\u06CC...</span></div></div>
</div>
<!-- v12.12: the \xAB\u{1F4C5} \u0645\u0633\u0627\u0628\u0642\u0627\u062A \u067E\u06CC\u0634\u200C\u0631\u0648\xBB list card is RETIRED \u2014 with the view
     toggle gone (always big-only) it only ever held the redundant "\u0647\u0645\u0647 \u062F\u0631
     \u062C\u0639\u0628\u0647 \u0628\u0627\u0644\u0627 \u0647\u0633\u062A\u0646\u062F" note; the hero card + the topspot box + the UCL box
     ARE the upcoming presentation (the user's ask). -->

</div>
<div class="card uclcard" id="uclCard">
<h2 class="uclh2"><span class="ucl-logo sm" aria-hidden="true">${UCL_LOGO_CHIP}</span><span data-i="hUcl">\u{1F3C6} \u0644\u06CC\u06AF \u0642\u0647\u0631\u0645\u0627\u0646\u0627\u0646 \u0627\u0631\u0648\u067E\u0627</span></h2>
<div id="ucl"><div class="empty loading-empty"><dotlottie-player class="loading-lottie" src="/loading.lottie" autoplay loop background="transparent" aria-hidden="true"></dotlottie-player><span class="sr-only" data-i="loading">\u062F\u0631 \u062D\u0627\u0644 \u0628\u0627\u0631\u06AF\u0630\u0627\u0631\u06CC...</span></div></div>
</div>
<div class="card" id="standingsCard">
<h2 data-i="hStandings">\u{1F4CA} \u062C\u062F\u0648\u0644 \u0644\u06CC\u06AF\u200C\u0647\u0627</h2>
<div id="standings"><div class="empty loading-empty"><dotlottie-player class="loading-lottie" src="/loading.lottie" autoplay loop background="transparent" aria-hidden="true"></dotlottie-player><span class="sr-only" data-i="loading">\u062F\u0631 \u062D\u0627\u0644 \u0628\u0627\u0631\u06AF\u0630\u0627\u0631\u06CC...</span></div></div>
</div>
<div class="card" id="cupsCard">
<h2 data-i="hCups">\u{1F3C6} \u062A\u0648\u0631\u0646\u0645\u0646\u062A\u200C\u0647\u0627</h2>
<div id="cups"><div class="empty loading-empty"><dotlottie-player class="loading-lottie" src="/loading.lottie" autoplay loop background="transparent" aria-hidden="true"></dotlottie-player><span class="sr-only" data-i="loading">\u062F\u0631 \u062D\u0627\u0644 \u0628\u0627\u0631\u06AF\u0630\u0627\u0631\u06CC...</span></div></div>
</div>

</div>
<!-- v12.5: the Iran card is gone \u2014 the PGL table lives inside the league
     standings grid above (#standings), per the user's request. -->
<div class="card" id="finishedCard">
<h2 data-i="hFinished">\u{1F3C1} \u0646\u062A\u0627\u06CC\u062C \u0627\u062E\u06CC\u0631</h2>
<div id="finished"><div class="empty loading-empty"><dotlottie-player class="loading-lottie" src="/loading.lottie" autoplay loop background="transparent" aria-hidden="true"></dotlottie-player><span class="sr-only" data-i="loading">\u062F\u0631 \u062D\u0627\u0644 \u0628\u0627\u0631\u06AF\u0630\u0627\u0631\u06CC...</span></div></div>
</div>
<footer id="about"><nav class="footnav" aria-label="\u0646\u0627\u0648\u0628\u0631\u06CC \u0627\u0635\u0644\u06CC"><a href="/" data-i="navHome">\u062E\u0627\u0646\u0647</a><a href="#about" data-i="navAbout">\u062F\u0631\u0628\u0627\u0631\u0647</a><a href="#contact" data-i="navContact">\u062A\u0645\u0627\u0633</a></nav>
<div class="aboutbox">
<h3 data-i="hAbout">\u{1F4D8} \u062F\u0631\u0628\u0627\u0631\u0647 SportSignal</h3>
<p data-i="aboutTag" class="about-tag">\u0642\u0631\u0627\u0631 \u0646\u06CC\u0633\u062A \u0647\u0631 \u0645\u0633\u0627\u0628\u0642\u0647\u200C\u0627\u06CC \u0631\u0627 \u0628\u0628\u06CC\u0646\u06CC\u061B \u0641\u0642\u0637 \u0646\u0628\u0627\u06CC\u062F \u0628\u0627\u0632\u06CC \u0645\u0647\u0645 \u0631\u0627 \u0627\u0632 \u062F\u0633\u062A \u0628\u062F\u0647\u06CC.</p>
<p data-i="aboutP1">\u0645\u0646 \u0647\u0645\u06CC\u0634\u0647 \u0641\u0648\u062A\u0628\u0627\u0644 \u0631\u0627 \u062F\u0648\u0633\u062A \u062F\u0627\u0634\u062A\u0645\u060C \u0627\u0645\u0627 \u0646\u0647 \u0622\u0646\u200C\u0642\u062F\u0631 \u06A9\u0647 \u062A\u06A9\u200C\u062A\u06A9 \u0645\u0633\u0627\u0628\u0642\u0627\u062A \u0631\u0627 \u062F\u0646\u0628\u0627\u0644 \u06A9\u0646\u0645 \u06CC\u0627 \u0647\u0631 \u0647\u0641\u062A\u0647 \u0628\u0627\u0632\u06CC\u200C\u0647\u0627\u06CC \u0644\u06CC\u06AF \u062F\u0627\u062E\u0644\u06CC \u0631\u0627 \u0628\u0628\u06CC\u0646\u0645. \u0686\u06CC\u0632\u06CC \u06A9\u0647 \u0647\u0645\u06CC\u0634\u0647 \u0628\u0631\u0627\u06CC\u0645 \u0645\u0647\u0645 \u0628\u0648\u062F\u060C \u067E\u06CC\u062F\u0627 \u06A9\u0631\u062F\u0646 \u0628\u0627\u0632\u06CC\u200C\u0647\u0627\u06CC \u0628\u0632\u0631\u06AF \u0628\u0648\u062F\u061B \u0627\u0644\u200C\u06A9\u0644\u0627\u0633\u06CC\u06A9\u0648\u060C \u062F\u0631\u0628\u06CC\u200C\u0647\u0627\u06CC \u062D\u0633\u0627\u0633 \u0644\u06CC\u06AF \u0628\u0631\u062A\u0631 \u0627\u0646\u06AF\u0644\u06CC\u0633\u060C \u0634\u0628\u200C\u0647\u0627\u06CC \u0628\u0632\u0631\u06AF \u0644\u06CC\u06AF \u0642\u0647\u0631\u0645\u0627\u0646\u0627\u0646 \u0627\u0631\u0648\u067E\u0627 \u0648 \u0647\u0631 \u0645\u0633\u0627\u0628\u0642\u0647\u200C\u0627\u06CC \u06A9\u0647 \u0627\u0631\u0632\u0634 \u0648\u0642\u062A \u06AF\u0630\u0627\u0634\u062A\u0646 \u062F\u0627\u0634\u062A\u0647 \u0628\u0627\u0634\u062F.</p>
<p data-i="aboutP2">\u0645\u0634\u06A9\u0644 \u0627\u06CC\u0646 \u0628\u0648\u062F \u06A9\u0647 \u0631\u0627\u0647 \u0633\u0627\u062F\u0647\u200C\u0627\u06CC \u0628\u0631\u0627\u06CC \u067E\u06CC\u062F\u0627 \u06A9\u0631\u062F\u0646 \u0627\u06CC\u0646 \u0628\u0627\u0632\u06CC\u200C\u0647\u0627 \u0648\u062C\u0648\u062F \u0646\u062F\u0627\u0634\u062A. \u06CC\u0627 \u0628\u0627\u06CC\u062F \u0627\u067E\u0644\u06CC\u06A9\u06CC\u0634\u0646\u200C\u0647\u0627\u06CC\u06CC \u0646\u0635\u0628 \u0645\u06CC\u200C\u06A9\u0631\u062F\u0645 \u06A9\u0647 \u067E\u0631 \u0627\u0632 \u0627\u0639\u0644\u0627\u0646\u060C \u062E\u0628\u0631 \u0648 \u062D\u0627\u0634\u06CC\u0647 \u0628\u0648\u062F\u0646\u062F\u060C \u06CC\u0627 \u0633\u0627\u0639\u062A\u200C\u0647\u0627 \u062F\u0631 \u0633\u0627\u06CC\u062A\u200C\u0647\u0627\u06CC \u0648\u0631\u0632\u0634\u06CC \u0645\u06CC\u200C\u06AF\u0634\u062A\u0645 \u062A\u0627 \u0628\u0641\u0647\u0645\u0645 \u0628\u0627\u0632\u06CC \u0645\u0647\u0645 \u0628\u0639\u062F\u06CC \u06A9\u06CC \u0648 \u06A9\u062C\u0627\u0633\u062A.</p>
<p data-i="aboutP3">SportSignal \u0627\u0632 \u0647\u0645\u06CC\u0646\u200C\u062C\u0627 \u0634\u0631\u0648\u0639 \u0634\u062F.</p>
<p data-i="aboutP4">\u06CC\u06A9 \u067E\u0644\u062A\u0641\u0631\u0645 \u0633\u0627\u062F\u0647 \u0648 \u0645\u0646\u062A\u062E\u0628 \u0628\u0631\u0627\u06CC \u067E\u06CC\u062F\u0627 \u06A9\u0631\u062F\u0646 \u0645\u0633\u0627\u0628\u0642\u0627\u062A \u0645\u0647\u0645\u061B \u0628\u062F\u0648\u0646 \u063A\u0631\u0642 \u0634\u062F\u0646 \u062F\u0631 \u0627\u062E\u0628\u0627\u0631 \u0648 \u062D\u0627\u0634\u06CC\u0647\u200C\u0647\u0627. \u0641\u0642\u0637 \u0628\u0627\u0632\u06CC\u200C\u0647\u0627\u06CC\u06CC \u06A9\u0647 \u0648\u0627\u0642\u0639\u0627\u064B \u0627\u0631\u0632\u0634 \u062F\u06CC\u062F\u0646 \u062F\u0627\u0631\u0646\u062F.</p>
<p data-i="aboutP5">\u0686\u0648\u0646 \u0628\u0627\u0632\u06CC\u200C\u0647\u0627\u06CC \u0628\u0632\u0631\u06AF \u0641\u0648\u062A\u0628\u0627\u0644 \u0641\u0642\u0637 \u06F9\u06F0 \u062F\u0642\u06CC\u0642\u0647 \u0645\u0633\u0627\u0628\u0642\u0647 \u0646\u06CC\u0633\u062A\u0646\u062F\u061B \u0644\u062D\u0638\u0647\u200C\u0647\u0627\u06CC\u06CC \u0647\u0633\u062A\u0646\u062F \u06A9\u0647 \u0645\u06CC\u0644\u06CC\u0648\u0646\u200C\u0647\u0627 \u0646\u0641\u0631 \u0631\u0627\u060C \u0641\u0627\u0631\u063A \u0627\u0632 \u0627\u06CC\u0646\u06A9\u0647 \u06A9\u062C\u0627 \u0632\u0646\u062F\u06AF\u06CC \u0645\u06CC\u200C\u06A9\u0646\u0646\u062F\u060C \u0628\u0647 \u0647\u0645 \u0648\u0635\u0644 \u0645\u06CC\u200C\u06A9\u0646\u0646\u062F.</p>
<p data-i="aboutP6">\u0641\u0631\u0642\u06CC \u0646\u0645\u06CC\u200C\u06A9\u0646\u062F \u0627\u0632 \u0627\u06CC\u0631\u0627\u0646 \u0628\u0627\u0634\u06CC\u060C \u0627\u0633\u062A\u0631\u0627\u0644\u06CC\u0627 \u06CC\u0627 \u0698\u0627\u067E\u0646. \u0648\u0642\u062A\u06CC \u0631\u0626\u0627\u0644 \u0645\u0627\u062F\u0631\u06CC\u062F \u0648 \u0628\u0627\u0631\u0633\u0644\u0648\u0646\u0627 \u0628\u0647 \u0645\u0635\u0627\u0641 \u0647\u0645 \u0645\u06CC\u200C\u0631\u0648\u0646\u062F\u060C \u0647\u0645\u0647 \u0645\u06CC\u200C\u062F\u0627\u0646\u06CC\u0645 \u06A9\u0647 \u06CC\u06A9 \u0628\u0627\u0632\u06CC \u0645\u0647\u0645 \u062F\u0631 \u0631\u0627\u0647 \u0627\u0633\u062A.</p>
<p data-i="aboutP7">SportSignal \u0633\u0627\u062E\u062A\u0647 \u0634\u062F \u062A\u0627 \u06A9\u0645\u06A9 \u06A9\u0646\u062F \u0622\u0646 \u0644\u062D\u0638\u0647\u200C\u0647\u0627 \u0631\u0627 \u0627\u0632 \u062F\u0633\u062A \u0646\u062F\u0647\u06CC.</p>
</div>
<div class="contactbox" id="contact">
<h3 data-i="hContact">\u{1F4E7} \u062A\u0645\u0627\u0633 \u0628\u0627 \u0645\u0627</h3>
<p data-i="contactP1">\u0627\u06AF\u0631 \u067E\u06CC\u0634\u0646\u0647\u0627\u062F\u06CC\u060C \u0627\u0646\u062A\u0642\u0627\u062F\u06CC\u060C \u06AF\u0632\u0627\u0631\u0634 \u0628\u0627\u06AF (Bug Hunt) \u06CC\u0627 \u0647\u0631 \u0646\u0648\u0639 \u0628\u0627\u0632\u062E\u0648\u0631\u062F\u06CC \u062F\u0627\u0631\u06CC\u062F\u060C \u062E\u0648\u0634\u062D\u0627\u0644 \u0645\u06CC\u200C\u0634\u0648\u0645 \u0622\u0646 \u0631\u0627 \u0628\u0627 \u0645\u0646 \u062F\u0631 \u0645\u06CC\u0627\u0646 \u0628\u06AF\u0630\u0627\u0631\u06CC\u062F.</p>
<p data-i="contactP2">\u0647\u0631 \u067E\u06CC\u0627\u0645 \u0631\u0627 \u0645\u06CC\u200C\u062A\u0648\u0627\u0646\u06CC\u062F \u0628\u0647 \u0627\u06CC\u0646 \u0622\u062F\u0631\u0633 \u0627\u06CC\u0645\u06CC\u0644 \u0627\u0631\u0633\u0627\u0644 \u06A9\u0646\u06CC\u062F:</p>
<div class="contact-cta"><a href="mailto:sportsignal@atomicmail.io" class="contact-email">sportsignal@atomicmail.io</a></div>
</div>
</div>
<div><span data-i="madeWith">\u0633\u0627\u062E\u062A\u0647\u200C\u0634\u062F\u0647 \u0628\u0627 \u2764\uFE0F</span> \u2014 <a href="/admin" data-i="adminLink">\u0648\u0631\u0648\u062F \u0645\u062F\u06CC\u0631\u06CC\u062A</a> \u2014 <a href="https://t.me/SportSignalAlertsBot" target="_blank" rel="noopener" data-i="botLink">\u0631\u0628\u0627\u062A \u062A\u0644\u06AF\u0631\u0627\u0645</a></div></footer>
<!-- v12.20 (the user's ask): sticky Telegram join CTA \u2014 the hero button
     scrolls away with the header; once the user is past it, this bottom bar
     keeps the primary call-to-action one tap away (safe-area padded). -->
<a id="joinSticky" href="https://t.me/SportSignalAlertsBot" target="_blank" rel="noopener" aria-label="\u062A\u0644\u06AF\u0631\u0627\u0645"><span class="js-inner"><svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="#fff" d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg><span data-i="join">\u0639\u0636\u0648\u06CC\u062A \u062F\u0631 \u0631\u0628\u0627\u062A \u062A\u0644\u06AF\u0631\u0627\u0645</span></span></a>
<!-- v12.x-tg-fab: a floating Telegram FAB for PC view — a circular
     Telegram-brand-blue button with the paper-plane logo, fixed to
     the bottom-RIGHT corner in Farsi (RTL) and bottom-LEFT in English
     (LTR). Encourages users to follow the bot. Hidden on mobile (the
     #joinSticky bottom bar covers mobile CTA). The header CTA pill is
     retired on PC (see the #topbar .cta{display:none} rule below); this
     FAB replaces it. The tooltip + aria-label carry the join-i18n
     string so the language toggle updates it. -->
<a id="tgFab" href="https://t.me/SportSignalAlertsBot" target="_blank" rel="noopener" aria-label="Telegram" title="Telegram" data-promo="\u0628\u0631\u0627\u06CC \u062F\u0633\u062A \u0646\u062F\u0627\u062F\u0646 \u0645\u0633\u0627\u0628\u0642\u0627\u062A \u0645\u0647\u0645\u060C \u0628\u0647 \u0631\u0628\u0627\u062A \u062A\u0644\u06AF\u0631\u0627\u0645 \u0628\u067E\u06CC\u0648\u0646\u062F\u06CC\u062F \u2728"><svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true"><path fill="#fff" d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z"/></svg></a>
<script>
var I18N={
fa:{title:"\u0645\u0633\u0627\u0628\u0642\u0627\u062A \u067E\u06CC\u0634\u200C\u0631\u0648 \u2014 \u0627\u0639\u0644\u0627\u0646\u200C\u062F\u0647\u0646\u062F\u0647 \u0645\u0633\u0627\u0628\u0642\u0627\u062A",h1:"\u26BD \u0627\u0639\u0644\u0627\u0646\u200C\u062F\u0647\u0646\u062F\u0647 \u0645\u0633\u0627\u0628\u0642\u0627\u062A",sub1:"\u0645\u0633\u0627\u0628\u0642\u0627\u062A \u067E\u06CC\u0634\u200C\u0631\u0648\u060C \u0631\u0642\u0627\u0628\u062A\u200C\u0647\u0627\u06CC \u0635\u062F\u0631 \u062C\u062F\u0648\u0644 \u0648 \u0646\u062A\u0627\u06CC\u062C \u062A\u06CC\u0645\u200C\u0647\u0627\u06CC \u0645\u0646\u062A\u062E\u0628 \u2014 \u0628\u0647\u200C\u0631\u0648\u0632\u0631\u0633\u0627\u0646\u06CC \u062E\u0648\u062F\u06A9\u0627\u0631",join:"\u0639\u0636\u0648\u06CC\u062A \u062F\u0631 \u0631\u0628\u0627\u062A \u062A\u0644\u06AF\u0631\u0627\u0645",hUpcoming:"\u{1F4C5} \u0645\u0633\u0627\u0628\u0642\u0627\u062A \u067E\u06CC\u0634\u200C\u0631\u0648",hFinished:"\u{1F3C1} \u0646\u062A\u0627\u06CC\u062C \u0627\u062E\u06CC\u0631",hLive:"\u{1F534} \u0645\u0633\u0627\u0628\u0642\u0627\u062A \u0632\u0646\u062F\u0647",moreResults:"\u0628\u06CC\u0634\u062A\u0631",lessResults:"\u06A9\u0645\u062A\u0631",loading:"\u062F\u0631 \u062D\u0627\u0644 \u0628\u0627\u0631\u06AF\u0630\u0627\u0631\u06CC...",noMatches:"\u0645\u0633\u0627\u0628\u0642\u0647\u200C\u0627\u06CC \u062F\u0631 \u0631\u0627\u0647 \u0646\u06CC\u0633\u062A",errLoad:"\u062E\u0637\u0627 \u062F\u0631 \u062F\u0631\u06CC\u0627\u0641\u062A \u062F\u0627\u062F\u0647\u200C\u0647\u0627",madeWith:"\u0633\u0627\u062E\u062A\u0647\u200C\u0634\u062F\u0647 \u0628\u0627 \u2764\uFE0F",adminLink:"\u0648\u0631\u0648\u062F \u0645\u062F\u06CC\u0631\u06CC\u062A",botLink:"\u0631\u0628\u0627\u062A \u062A\u0644\u06AF\u0631\u0627\u0645",soon:"\u0628\u0647\u200C\u0632\u0648\u062F\u06CC",inDays:"\u062F\u0631 %d \u0631\u0648\u0632",barNext:"\u26A1 \u062A\u0627 \u0628\u0627\u0632\u06CC \u0628\u0632\u0631\u06AF \u0628\u0639\u062F\u06CC",barFallback:"\u23F3 \u062A\u0627 \u0645\u0633\u0627\u0628\u0642\u0647 \u0628\u0639\u062F\u06CC",barLive:"\u{1F534} \u062F\u0631 \u062C\u0631\u06CC\u0627\u0646",barIdle:"\u23F3 \u062F\u0631 \u0627\u0646\u062A\u0638\u0627\u0631 \u0628\u0627\u0632\u06CC \u0628\u0639\u062F\u06CC",barBase:"\u0646\u0648\u0627\u0631 \u067E\u06CC\u0634\u0631\u0641\u062A \u062F\u0631 \u06F2\u06F4 \u0633\u0627\u0639\u062A \u067E\u0627\u06CC\u0627\u0646\u06CC \u0642\u0628\u0644 \u0627\u0632 \u0634\u0631\u0648\u0639 \u0628\u0627\u0632\u06CC \u067E\u0631 \u0645\u06CC\u200C\u0634\u0648\u062F \u0648 \u062F\u0631 \u0634\u0631\u0648\u0639 \u0628\u0627\u0632\u06CC \u0628\u0647 \u06F1\u06F0\u06F0\u066A \u0645\u06CC\u200C\u0631\u0633\u062F",uDay:"\u0631\u0648\u0632",uHour:"\u0633\u0627\u0639\u062A",uMin:"\u062F\u0642\u06CC\u0642\u0647",uSec:"\u062B\u0627\u0646\u06CC\u0647",live:"\u062F\u0631 \u062D\u0627\u0644 \u0628\u0631\u06AF\u0632\u0627\u0631\u06CC",pen:"\u067E\u0646\u0627\u0644\u062A\u06CC",own:"\u06AF\u0644 \u0628\u0647 \u062E\u0648\u062F\u06CC",derby:"\u{1F525} \u062F\u0631\u0628\u06CC",hUcl:"\u0644\u06CC\u06AF \u0642\u0647\u0631\u0645\u0627\u0646\u0627\u0646 \u0627\u0631\u0648\u067E\u0627",hUclNext:"\u0645\u0633\u0627\u0628\u0642\u0627\u062A \u0645\u0647\u0645 \u0644\u06CC\u06AF \u0642\u0647\u0631\u0645\u0627\u0646\u0627\u0646 \u0627\u0631\u0648\u067E\u0627",hLgNext:"\u0645\u0633\u0627\u0628\u0642\u0627\u062A \u0628\u0632\u0631\u06AF \u067E\u06CC\u0634\u200C\u0631\u0648",hWeek:"\u{1F4C5} \u062F\u0631 \u0627\u06CC\u0646 \u0647\u0641\u062A\u0647",hWeekNext:"\u{1F4C5} \u0647\u0641\u062A\u0647 \u0628\u0639\u062F",wkDone:"\u067E\u0627\u06CC\u0627\u0646\u200C\u06CC\u0627\u0641\u062A\u0647",navHome:"\u062E\u0627\u0646\u0647",navAbout:"\u062F\u0631\u0628\u0627\u0631\u0647",navContact:"\u062A\u0645\u0627\u0633",thP:"\u0628\u0627\u0632\u06CC",thW:"\u0628\u0631\u062F",thD:"\u0645\u0633\u0627\u0648\u06CC",thL:"\u0628\u0627\u062E\u062A",thGF:"\u06AF\u0644 \u0632\u062F\u0647",thGA:"\u06AF\u0644 \u062E\u0648\u0631\u062F\u0647",thGD:"\u062A\u0641\u0627\u0636\u0644",thPts:"\u0627\u0645\u062A\u06CC\u0627\u0632",topBadge:"\u0635\u062F\u0631 \u062C\u062F\u0648\u0644",hStandings:"\u{1F4CA} \u062C\u062F\u0648\u0644 \u0644\u06CC\u06AF\u200C\u0647\u0627",hCups:"\u{1F3C6} \u062C\u0627\u0645\u200C\u0647\u0627\u06CC \u062D\u0630\u0641\u06CC",stEmpty:"\u062C\u062F\u0648\u0644 \u0647\u0646\u0648\u0632 \u062F\u0631 \u062F\u0633\u062A\u0631\u0633 \u0646\u06CC\u0633\u062A",stNot:"\u0634\u0631\u0648\u0639 \u0646\u0634\u062F\u0647",tierGold:"\u{1F947} \u0633\u0637\u062D \u0637\u0644\u0627 \u2014 \u0627\u0631\u0648\u067E\u0627 \u0648 \u0628\u06CC\u0646\u0627\u0644\u0645\u0644\u0644",tierSilver:"\u{1F948} \u0633\u0637\u062D \u0646\u0642\u0631\u0647 \u2014 \u0627\u0631\u0648\u067E\u0627",tierBronze:"\u{1F949} \u0633\u0637\u062D \u0628\u0631\u0646\u0632 \u2014 \u0627\u0631\u0648\u067E\u0627",cEN:"\u{1F3F4} \u0627\u0646\u06AF\u0644\u0633\u062A\u0627\u0646",cES:"\u{1F1EA}\u{1F1F8} \u0627\u0633\u067E\u0627\u0646\u06CC\u0627",cIT:"\u{1F1EE}\u{1F1F9} \u0627\u06CC\u062A\u0627\u0644\u06CC\u0627",cIR:"\u{1F1EE}\u{1F1F7} \u0627\u06CC\u0631\u0627\u0646",cDE:"\u{1F1E9}\u{1F1EA} \u0622\u0644\u0645\u0627\u0646",cupsNone:"\u0628\u0631\u0646\u0627\u0645\u0647\u200C\u0627\u06CC \u0647\u0646\u0648\u0632 \u0627\u0639\u0644\u0627\u0645 \u0646\u0634\u062F\u0647",tierEurope:"\u{1F3C6} \u0644\u06CC\u06AF\u200C\u0647\u0627\u06CC \u0642\u0627\u0631\u0647 \u0627\u0631\u0648\u067E\u0627",intlCups:"\u{1F3C6} \u062C\u0627\u0645\u200C\u0647\u0627\u06CC \u0628\u06CC\u0646\u200C\u0627\u0644\u0645\u0644\u0644\u06CC",share:"\u0627\u0634\u062A\u0631\u0627\u06A9\u200C\u06AF\u0630\u0627\u0631\u06CC",copy:"\u06A9\u067E\u06CC \u0645\u062A\u0646",copied:"\u06A9\u067E\u06CC \u0634\u062F \u2713",titleL:"\u0648\u0631\u0648\u062F \u2014 \u0645\u062F\u06CC\u0631\u06CC\u062A \u0631\u0628\u0627\u062A",loginH1:"\u{1F510} \u0648\u0631\u0648\u062F \u0628\u0647 \u0645\u062F\u06CC\u0631\u06CC\u062A \u0631\u0628\u0627\u062A",lbUser:"\u0646\u0627\u0645 \u06A9\u0627\u0631\u0628\u0631\u06CC",lbPass:"\u0631\u0645\u0632 \u0639\u0628\u0648\u0631",btnLogin:"\u0648\u0631\u0648\u062F",errUser:"\u0646\u0627\u0645 \u06A9\u0627\u0631\u0628\u0631\u06CC \u0631\u0627 \u0648\u0627\u0631\u062F \u06A9\u0646\u06CC\u062F",errRate:"\u062A\u0644\u0627\u0634 \u0628\u06CC\u0634 \u0627\u0632 \u062D\u062F \u2014 \u0686\u0646\u062F \u062F\u0642\u06CC\u0642\u0647 \u062F\u06CC\u06AF\u0631 \u0627\u0645\u062A\u062D\u0627\u0646 \u06A9\u0646\u06CC\u062F",errCreds:"\u0646\u0627\u0645 \u06A9\u0627\u0631\u0628\u0631\u06CC \u06CC\u0627 \u0631\u0645\u0632 \u0627\u0634\u062A\u0628\u0627\u0647 \u0627\u0633\u062A",titleA:"\u062A\u0646\u0638\u06CC\u0645\u0627\u062A \u0631\u0628\u0627\u062A \u0627\u0639\u0644\u0627\u0646 \u0645\u0633\u0627\u0628\u0642\u0627\u062A",h1A:"\u2699\uFE0F \u062A\u0646\u0638\u06CC\u0645\u0627\u062A \u0631\u0628\u0627\u062A \u0627\u0639\u0644\u0627\u0646 \u0645\u0633\u0627\u0628\u0642\u0627\u062A",hLogin:"\u{1F511} \u0648\u0631\u0648\u062F",tokenPh:"\u0631\u0645\u0632 \u0639\u0628\u0648\u0631 \u0645\u062F\u06CC\u0631\u06CC\u062A (admin password)",hStatus:"\u{1F4CA} \u0648\u0636\u0639\u06CC\u062A",stLoading:"\u062F\u0631 \u062D\u0627\u0644 \u0628\u0627\u0631\u06AF\u0630\u0627\u0631\u06CC...",stErr:"\u274C \u062E\u0637\u0627 \u062F\u0631 \u062F\u0631\u06CC\u0627\u0641\u062A \u0648\u0636\u0639\u06CC\u062A \u2014 \u062F\u0648\u0628\u0627\u0631\u0647 \u0648\u0627\u0631\u062F \u0634\u0648\u06CC\u062F \u06CC\u0627 \u062A\u0648\u06A9\u0646 \u0631\u0627 \u0628\u0631\u0631\u0633\u06CC \u06A9\u0646\u06CC\u062F",stLastRun:"\u{1F552} \u0622\u062E\u0631\u06CC\u0646 \u0627\u062C\u0631\u0627",stApi:"\u{1F4E1} \u0645\u0646\u0628\u0639 API",stUsers:"\u{1F465} \u06A9\u0627\u0631\u0628\u0631\u0627\u0646",stIds:"\u{1F194} \u0634\u0646\u0627\u0633\u0647\u200C\u0647\u0627",stTz:"\u{1F30D} \u0645\u0646\u0637\u0642\u0647 \u0632\u0645\u0627\u0646\u06CC",btnRefresh:"\u0628\u0647\u200C\u0631\u0648\u0632\u0631\u0633\u0627\u0646\u06CC \u0648\u0636\u0639\u06CC\u062A",btnTest:"\u{1F4E8} \u0627\u0631\u0633\u0627\u0644 \u067E\u06CC\u0627\u0645 \u062A\u0633\u062A",btnSim:"\u{1F9EA} \u0634\u0628\u06CC\u0647\u200C\u0633\u0627\u0632\u06CC \u06F5 \u0627\u0639\u0644\u0627\u0646",btnSources:"\u{1F4E1} \u0628\u0631\u0631\u0633\u06CC \u0645\u0646\u0627\u0628\u0639 API",btnLogout:"\u{1F6AA} \u062E\u0631\u0648\u062C",hBroadcast:"\u{1F4E3} \u0627\u0631\u0633\u0627\u0644 \u067E\u06CC\u0627\u0645 \u0628\u0647 \u0647\u0645\u0647 \u06A9\u0627\u0631\u0628\u0631\u0627\u0646",lbBroadcast:"\u0645\u062A\u0646 \u067E\u06CC\u0627\u0645 (\u0628\u0647 \u0641\u0627\u0631\u0633\u06CC \u06CC\u0627 \u0627\u0646\u06AF\u0644\u06CC\u0633\u06CC)",bcPh:"\u0645\u062A\u0646 \u067E\u06CC\u0627\u0645...",btnBroadcast:"\u{1F4E3} \u0627\u0631\u0633\u0627\u0644 \u0628\u0631\u0627\u06CC \u0647\u0645\u0647",hMatches:"\u26BD \u0645\u0633\u0627\u0628\u0642\u0627\u062A \u067E\u06CC\u0634\u200C\u0631\u0648",btnRefreshM:"\u0628\u0647\u200C\u0631\u0648\u0632\u0631\u0633\u0627\u0646\u06CC \u0645\u0633\u0627\u0628\u0642\u0627\u062A",hSettings:"\u2699\uFE0F \u062A\u0646\u0638\u06CC\u0645\u0627\u062A",lbTz:"\u0645\u0646\u0637\u0642\u0647 \u0632\u0645\u0627\u0646\u06CC",lbLeagues:"\u0644\u06CC\u06AF\u200C\u0647\u0627\u06CC \u062A\u062D\u062A \u067E\u0648\u0634\u0634 (\u06A9\u062F\u0647\u0627 \u0628\u0627 \u06A9\u0627\u0645\u0627)",elNote:"EL \u0648 ECL \u062A\u0648\u0633\u0637 SportScore \u067E\u0648\u0634\u0634 \u062F\u0627\u062F\u0647 \u0645\u06CC\u200C\u0634\u0648\u0646\u062F \u0648 \u0646\u06CC\u0627\u0632\u06CC \u0628\u0647 \u0627\u0641\u0632\u0648\u062F\u0646 \u0646\u062F\u0627\u0631\u0646\u062F.",lbTeams:"\u062A\u06CC\u0645\u200C\u0647\u0627\u06CC \u0645\u0646\u062A\u062E\u0628 \u0647\u0631 \u0644\u06CC\u06AF",teamPh:"\u0646\u0627\u0645 \u062A\u06CC\u0645 \u062C\u062F\u06CC\u062F",btnAdd:"+ \u0627\u0641\u0632\u0648\u062F\u0646",btnSave:"\u{1F4BE} \u0630\u062E\u06CC\u0631\u0647 \u062A\u0646\u0638\u06CC\u0645\u0627\u062A",btnBackup:"\u2B07\uFE0F \u067E\u0634\u062A\u06CC\u0628\u0627\u0646\u200C\u06AF\u06CC\u0631\u06CC \u062A\u0646\u0638\u06CC\u0645\u0627\u062A",hPass:"\u{1F511} \u062A\u063A\u06CC\u06CC\u0631 \u0631\u0645\u0632 \u0639\u0628\u0648\u0631",lbNp1:"\u0631\u0645\u0632 \u062C\u062F\u06CC\u062F (\u062D\u062F\u0627\u0642\u0644 \u06F8 \u06A9\u0627\u0631\u0627\u06A9\u062A\u0631)",lbNp2:"\u062A\u06A9\u0631\u0627\u0631 \u0631\u0645\u0632 \u062C\u062F\u06CC\u062F",btnCp:"\u062A\u063A\u06CC\u06CC\u0631 \u0631\u0645\u0632 \u0639\u0628\u0648\u0631",cal:"\u0627\u0641\u0632\u0648\u062F\u0646 \u0628\u0647 \u06AF\u0648\u06AF\u0644 \u062A\u0642\u0648\u06CC\u0645",tzBtn:"\u0645\u0646\u0637\u0642\u0647 \u0632\u0645\u0627\u0646\u06CC",tzTitle:"\u{1F30D} \u0645\u0646\u0637\u0642\u0647 \u0632\u0645\u0627\u0646\u06CC",tzSearch:"\u062C\u0633\u062A\u062C\u0648\u06CC \u06A9\u0634\u0648\u0631 \u06CC\u0627 \u0634\u0647\u0631\u2026",tzClose:"\u0628\u0633\u062A\u0646",lastUpd:"\u0622\u062E\u0631\u06CC\u0646 \u0628\u0647\u200C\u0631\u0648\u0632\u0631\u0633\u0627\u0646\u06CC: %s",ver:"\u0646\u0633\u062E\u0647 \u06F1\u06F2.\u06F3\u06F3-xpost \u2014 \u067E\u0631\u0648\u0641\u0627\u06CC\u0644 \u062E\u0648\u062F\u06A9\u0627\u0631 X\u060C \u0627\u0645\u0636\u0627\u06CC OAuth 1.0a \u0628\u0627 HMAC-SHA1\u060C \u0622\u06CC\u0646\u0647\u200C\u06CC \u0641\u0627\u0631\u0633\u06CC \u0627\u0639\u0644\u0627\u0646\u200C\u0647\u0627\u06CC \u0635\u062F\u0631\u0646\u0634\u06CC\u0646\u060C \u0646\u062A\u06CC\u062C\u0647\u060C \u0634\u0631\u0648\u0639 \u0628\u0627\u0632\u06CC \u0648 \u062C\u062F\u0648\u0644 \u0647\u0641\u062A\u06AF\u06CC\u060C \u0645\u062D\u062F\u0648\u062F\u06AF\u0631 \u0628\u0648\u062F\u062C\u0647 KV (\u06F4\u06F5\u06F0 \u0645\u0627\u0647\u0627\u0646\u0647\u060C \u06F1\u06F2 \u0631\u0648\u0632\u0627\u0646\u0647)\u060C \u062D\u0627\u0644\u062A dry-run \u0648 \u06A9\u0627\u0631\u062A \u0648\u0636\u0639\u06CC\u062A X \u062F\u0631 \u067E\u0646\u0644 \u0645\u062F\u06CC\u0631\u06CC\u062A",mToken:"\u0648\u0631\u0648\u062F \u0646\u0627\u0645\u0639\u062A\u0628\u0631 \u2014 \u0631\u0645\u0632 \u0639\u0628\u0648\u0631 \u06CC\u0627 \u0646\u0634\u0633\u062A \u0645\u0646\u0642\u0636\u06CC \u0634\u062F\u0647",mErr:"\u062E\u0637\u0627: ",mEnterToken:"\u0631\u0645\u0632 \u0639\u0628\u0648\u0631 \u0631\u0627 \u0648\u0627\u0631\u062F \u06A9\u0646\u06CC\u062F",mSaved:"\u2705 \u0630\u062E\u06CC\u0631\u0647 \u0634\u062F",mLoginFirst:"\u0627\u0628\u062A\u062F\u0627 \u0648\u0627\u0631\u062F \u0634\u0648\u06CC\u062F",mBackup:"\u2B07\uFE0F \u067E\u0634\u062A\u06CC\u0628\u0627\u0646\u200C\u06AF\u06CC\u0631\u06CC \u0634\u062F",mPassShort:"\u0631\u0645\u0632 \u0628\u0627\u06CC\u062F \u062D\u062F\u0627\u0642\u0644 \u06F8 \u06A9\u0627\u0631\u0627\u06A9\u062A\u0631 \u0628\u0627\u0634\u062F",mPassMismatch:"\u0631\u0645\u0632\u0647\u0627 \u06CC\u06A9\u0633\u0627\u0646 \u0646\u06CC\u0633\u062A\u0646\u062F",mPassOk:"\u{1F511} \u0631\u0645\u0632 \u0628\u0627 \u0645\u0648\u0641\u0642\u06CC\u062A \u062A\u063A\u06CC\u06CC\u0631 \u06A9\u0631\u062F",mSentTo:"\u{1F4E3} \u0627\u0631\u0633\u0627\u0644 \u0634\u062F \u0628\u0647 %s \u0627\u0632 %s \u06A9\u0627\u0631\u0628\u0631",mTestSent:"\u{1F4E8} \u062A\u0633\u062A \u0627\u0631\u0633\u0627\u0644 \u0634\u062F \u0628\u0647 %s \u06A9\u0627\u0631\u0628\u0631",mSimPrefix:"\u{1F9EA} \u0634\u0628\u06CC\u0647\u200C\u0633\u0627\u0632\u06CC: ",mNoNotif:"\u26A0\uFE0F \u0647\u06CC\u0686 \u0627\u0639\u0644\u0627\u0646\u06CC \u0627\u0631\u0633\u0627\u0644 \u0646\u0634\u062F",mNoMatches:"\u0645\u0633\u0627\u0628\u0642\u0647\u200C\u0627\u06CC \u062F\u0631 \u0631\u0627\u0647 \u0646\u06CC\u0633\u062A",mErrMatches:"\u062E\u0637\u0627 \u062F\u0631 \u062F\u0631\u06CC\u0627\u0641\u062A \u0645\u0633\u0627\u0628\u0642\u0627\u062A",mEnterText:"\u0645\u062A\u0646 \u067E\u06CC\u0627\u0645 \u0631\u0627 \u0648\u0627\u0631\u062F \u06A9\u0646\u06CC\u062F",mErrSrc:"\u274C \u062E\u0637\u0627",acHint:"\u{1F4A1} \u0647\u0646\u06AF\u0627\u0645 \u062A\u0627\u06CC\u067E\u060C \u0646\u0627\u0645 \u062F\u0642\u06CC\u0642 \u0628\u0627\u0634\u06AF\u0627\u0647 \u0627\u0632 \u0641\u0647\u0631\u0633\u062A API \u067E\u06CC\u0634\u0646\u0647\u0627\u062F \u0645\u06CC\u200C\u0634\u0648\u062F \u2014 \u0628\u0631\u0627\u06CC \u062B\u0628\u062A \u0628\u06CC\u200C\u062E\u0637\u0627 \u06CC\u06A9\u06CC \u0631\u0627 \u0627\u0646\u062A\u062E\u0627\u0628 \u06A9\u0646\u06CC\u062F.",acNone:"\u0628\u0627\u0634\u06AF\u0627\u0647\u06CC \u0628\u0627 \u0627\u06CC\u0646 \u0646\u0627\u0645 \u062F\u0631 \u0641\u0647\u0631\u0633\u062A \u0646\u06CC\u0633\u062A",acAdd:"\u2705 %s \u0627\u0641\u0632\u0648\u062F\u0647 \u0634\u062F",acAddUcl:"\u2705 %s \u0627\u0641\u0632\u0648\u062F\u0647 \u0634\u062F \u2014 \u0628\u0631\u0627\u06CC \u0644\u06CC\u06AF \u0642\u0647\u0631\u0645\u0627\u0646\u0627\u0646 \u0627\u0631\u0648\u067E\u0627 \u0647\u0645 \u0627\u0646\u062A\u062E\u0627\u0628 \u0634\u062F",uclSync:"\u0628\u0627\u0634\u06AF\u0627\u0647\u200C\u0647\u0627\u06CC \u0647\u0631 \u0644\u06CC\u06AF \u0628\u0647\u200C\u0635\u0648\u0631\u062A \u062E\u0648\u062F\u06A9\u0627\u0631 \u0628\u0631\u0627\u06CC \u0644\u06CC\u06AF \u0642\u0647\u0631\u0645\u0627\u0646\u0627\u0646 \u0627\u0631\u0648\u067E\u0627 \u0647\u0645 \u0627\u0646\u062A\u062E\u0627\u0628 \u0645\u06CC\u200C\u0634\u0648\u0646\u062F",acDup:"\u26A0\uFE0F %s \u0627\u0632 \u0642\u0628\u0644 \u062F\u0631 \u0627\u06CC\u0646 \u0644\u06CC\u06AF \u0647\u0633\u062A",btnClubs:"\u{1F504} \u0628\u0647\u200C\u0631\u0648\u0632\u0631\u0633\u0627\u0646\u06CC \u0641\u0647\u0631\u0633\u062A \u0628\u0627\u0634\u06AF\u0627\u0647\u200C\u0647\u0627",clubsMeta:"\u0641\u0647\u0631\u0633\u062A \u0628\u0627\u0634\u06AF\u0627\u0647\u200C\u0647\u0627: %s \u0628\u0627\u0634\u06AF\u0627\u0647 \u2014 \u0622\u062E\u0631\u06CC\u0646 \u0628\u0631\u0648\u0632\u0631\u0633\u0627\u0646\u06CC: %s",clubsNone:"\u26A0\uFE0F \u0641\u0647\u0631\u0633\u062A \u0628\u0627\u0634\u06AF\u0627\u0647\u200C\u0647\u0627 \u0647\u0646\u0648\u0632 \u0633\u0627\u062E\u062A\u0647 \u0646\u0634\u062F\u0647 \u2014 \u062F\u06A9\u0645\u0647 \u0628\u0631\u0648\u0632\u0631\u0633\u0627\u0646\u06CC \u0631\u0627 \u0628\u0632\u0646\u06CC\u062F",mClubs:"\u2705 \u0641\u0647\u0631\u0633\u062A \u0628\u0627\u0634\u06AF\u0627\u0647\u200C\u0647\u0627 \u0628\u0631\u0648\u0632\u0631\u0633\u0627\u0646\u06CC \u0634\u062F (%s \u0628\u0627\u0634\u06AF\u0627\u0647)",clubsErr:"\u274C \u0641\u0647\u0631\u0633\u062A \u0628\u0627\u0634\u06AF\u0627\u0647\u200C\u0647\u0627 \u062F\u0631 \u062F\u0633\u062A\u0631\u0633 \u0646\u06CC\u0633\u062A",hMembers:"\u{1F465} \u0627\u0639\u0636\u0627\u06CC \u0631\u0628\u0627\u062A",btnMembers:"\u{1F504} \u0628\u0647\u200C\u0631\u0648\u0632\u0631\u0633\u0627\u0646\u06CC \u0627\u0639\u0636\u0627",membersNone:"\u0647\u0646\u0648\u0632 \u0639\u0636\u0648\u06CC \u062B\u0628\u062A \u0646\u0634\u062F\u0647 \u0627\u0633\u062A \u2014 \u06A9\u0627\u0631\u0628\u0631\u0627\u0646 \u0628\u0627\u06CC\u062F \u0631\u0628\u0627\u062A \u0631\u0627 /start \u06A9\u0646\u0646\u062F",memId:"\u0634\u0646\u0627\u0633\u0647",memSlug:"\u0646\u0627\u0645 \u06A9\u0627\u0631\u0628\u0631\u06CC",memName:"\u0646\u0627\u0645",memJoined:"\u062A\u0627\u0631\u06CC\u062E \u0639\u0636\u0648\u06CC\u062A",memCount:"%s \u0639\u0636\u0648",hAbout:"\u{1F4D8} \u062F\u0631\u0628\u0627\u0631\u0647 SportSignal",aboutTag:"\u0642\u0631\u0627\u0631 \u0646\u06CC\u0633\u062A \u0647\u0631 \u0645\u0633\u0627\u0628\u0642\u0647\u200C\u0627\u06CC \u0631\u0627 \u0628\u0628\u06CC\u0646\u06CC\u061B \u0641\u0642\u0637 \u0646\u0628\u0627\u06CC\u062F \u0628\u0627\u0632\u06CC \u0645\u0647\u0645 \u0631\u0627 \u0627\u0632 \u062F\u0633\u062A \u0628\u062F\u0647\u06CC.",aboutP1:"\u0645\u0646 \u0647\u0645\u06CC\u0634\u0647 \u0641\u0648\u062A\u0628\u0627\u0644 \u0631\u0627 \u062F\u0648\u0633\u062A \u062F\u0627\u0634\u062A\u0645\u060C \u0627\u0645\u0627 \u0646\u0647 \u0622\u0646\u200C\u0642\u062F\u0631 \u06A9\u0647 \u062A\u06A9\u200C\u062A\u06A9 \u0645\u0633\u0627\u0628\u0642\u0627\u062A \u0631\u0627 \u062F\u0646\u0628\u0627\u0644 \u06A9\u0646\u0645 \u06CC\u0627 \u0647\u0631 \u0647\u0641\u062A\u0647 \u0628\u0627\u0632\u06CC\u200C\u0647\u0627\u06CC \u0644\u06CC\u06AF \u062F\u0627\u062E\u0644\u06CC \u0631\u0627 \u0628\u0628\u06CC\u0646\u0645. \u0686\u06CC\u0632\u06CC \u06A9\u0647 \u0647\u0645\u06CC\u0634\u0647 \u0628\u0631\u0627\u06CC\u0645 \u0645\u0647\u0645 \u0628\u0648\u062F\u060C \u067E\u06CC\u062F\u0627 \u06A9\u0631\u062F\u0646 \u0628\u0627\u0632\u06CC\u200C\u0647\u0627\u06CC \u0628\u0632\u0631\u06AF \u0628\u0648\u062F\u061B \u0627\u0644\u200C\u06A9\u0644\u0627\u0633\u06CC\u06A9\u0648\u060C \u062F\u0631\u0628\u06CC\u200C\u0647\u0627\u06CC \u062D\u0633\u0627\u0633 \u0644\u06CC\u06AF \u0628\u0631\u062A\u0631 \u0627\u0646\u06AF\u0644\u06CC\u0633\u060C \u0634\u0628\u200C\u0647\u0627\u06CC \u0628\u0632\u0631\u06AF \u0644\u06CC\u06AF \u0642\u0647\u0631\u0645\u0627\u0646\u0627\u0646 \u0627\u0631\u0648\u067E\u0627 \u0648 \u0647\u0631 \u0645\u0633\u0627\u0628\u0642\u0647\u200C\u0627\u06CC \u06A9\u0647 \u0627\u0631\u0632\u0634 \u0648\u0642\u062A \u06AF\u0630\u0627\u0634\u062A\u0646 \u062F\u0627\u0634\u062A\u0647 \u0628\u0627\u0634\u062F.",aboutP2:"\u0645\u0634\u06A9\u0644 \u0627\u06CC\u0646 \u0628\u0648\u062F \u06A9\u0647 \u0631\u0627\u0647 \u0633\u0627\u062F\u0647\u200C\u0627\u06CC \u0628\u0631\u0627\u06CC \u067E\u06CC\u062F\u0627 \u06A9\u0631\u062F\u0646 \u0627\u06CC\u0646 \u0628\u0627\u0632\u06CC\u200C\u0647\u0627 \u0648\u062C\u0648\u062F \u0646\u062F\u0627\u0634\u062A. \u06CC\u0627 \u0628\u0627\u06CC\u062F \u0627\u067E\u0644\u06CC\u06A9\u06CC\u0634\u0646\u200C\u0647\u0627\u06CC\u06CC \u0646\u0635\u0628 \u0645\u06CC\u200C\u06A9\u0631\u062F\u0645 \u06A9\u0647 \u067E\u0631 \u0627\u0632 \u0627\u0639\u0644\u0627\u0646\u060C \u062E\u0628\u0631 \u0648 \u062D\u0627\u0634\u06CC\u0647 \u0628\u0648\u062F\u0646\u062F\u060C \u06CC\u0627 \u0633\u0627\u0639\u062A\u200C\u0647\u0627 \u062F\u0631 \u0633\u0627\u06CC\u062A\u200C\u0647\u0627\u06CC \u0648\u0631\u0632\u0634\u06CC \u0645\u06CC\u200C\u06AF\u0634\u062A\u0645 \u062A\u0627 \u0628\u0641\u0647\u0645\u0645 \u0628\u0627\u0632\u06CC \u0645\u0647\u0645 \u0628\u0639\u062F\u06CC \u06A9\u06CC \u0648 \u06A9\u062C\u0627\u0633\u062A.",aboutP3:"SportSignal \u0627\u0632 \u0647\u0645\u06CC\u0646\u200C\u062C\u0627 \u0634\u0631\u0648\u0639 \u0634\u062F.",aboutP4:"\u06CC\u06A9 \u067E\u0644\u062A\u0641\u0631\u0645 \u0633\u0627\u062F\u0647 \u0648 \u0645\u0646\u062A\u062E\u0628 \u0628\u0631\u0627\u06CC \u067E\u06CC\u062F\u0627 \u06A9\u0631\u062F\u0646 \u0645\u0633\u0627\u0628\u0642\u0627\u062A \u0645\u0647\u0645\u061B \u0628\u062F\u0648\u0646 \u063A\u0631\u0642 \u0634\u062F\u0646 \u062F\u0631 \u0627\u062E\u0628\u0627\u0631 \u0648 \u062D\u0627\u0634\u06CC\u0647\u200C\u0647\u0627. \u0641\u0642\u0637 \u0628\u0627\u0632\u06CC\u200C\u0647\u0627\u06CC\u06CC \u06A9\u0647 \u0648\u0627\u0642\u0639\u0627\u064B \u0627\u0631\u0632\u0634 \u062F\u06CC\u062F\u0646 \u062F\u0627\u0631\u0646\u062F.",aboutP5:"\u0686\u0648\u0646 \u0628\u0627\u0632\u06CC\u200C\u0647\u0627\u06CC \u0628\u0632\u0631\u06AF \u0641\u0648\u062A\u0628\u0627\u0644 \u0641\u0642\u0637 \u06F9\u06F0 \u062F\u0642\u06CC\u0642\u0647 \u0645\u0633\u0627\u0628\u0642\u0647 \u0646\u06CC\u0633\u062A\u0646\u062F\u061B \u0644\u062D\u0638\u0647\u200C\u0647\u0627\u06CC\u06CC \u0647\u0633\u062A\u0646\u062F \u06A9\u0647 \u0645\u06CC\u0644\u06CC\u0648\u0646\u200C\u0647\u0627 \u0646\u0641\u0631 \u0631\u0627\u060C \u0641\u0627\u0631\u063A \u0627\u0632 \u0627\u06CC\u0646\u06A9\u0647 \u06A9\u062C\u0627 \u0632\u0646\u062F\u06AF\u06CC \u0645\u06CC\u200C\u06A9\u0646\u0646\u062F\u060C \u0628\u0647 \u0647\u0645 \u0648\u0635\u0644 \u0645\u06CC\u200C\u06A9\u0646\u0646\u062F.",aboutP6:"\u0641\u0631\u0642\u06CC \u0646\u0645\u06CC\u200C\u06A9\u0646\u062F \u0627\u0632 \u0627\u06CC\u0631\u0627\u0646 \u0628\u0627\u0634\u06CC\u060C \u0627\u0633\u062A\u0631\u0627\u0644\u06CC\u0627 \u06CC\u0627 \u0698\u0627\u067E\u0646. \u0648\u0642\u062A\u06CC \u0631\u0626\u0627\u0644 \u0645\u0627\u062F\u0631\u06CC\u062F \u0648 \u0628\u0627\u0631\u0633\u0644\u0648\u0646\u0627 \u0628\u0647 \u0645\u0635\u0627\u0641 \u0647\u0645 \u0645\u06CC\u200C\u0631\u0648\u0646\u062F\u060C \u0647\u0645\u0647 \u0645\u06CC\u200C\u062F\u0627\u0646\u06CC\u0645 \u06A9\u0647 \u06CC\u06A9 \u0628\u0627\u0632\u06CC \u0645\u0647\u0645 \u062F\u0631 \u0631\u0627\u0647 \u0627\u0633\u062A.",aboutP7:"SportSignal \u0633\u0627\u062E\u062A\u0647 \u0634\u062F \u062A\u0627 \u06A9\u0645\u06A9 \u06A9\u0646\u062F \u0622\u0646 \u0644\u062D\u0638\u0647\u200C\u0647\u0627 \u0631\u0627 \u0627\u0632 \u062F\u0633\u062A \u0646\u062F\u0647\u06CC.",hContact:"\u{1F4E7} \u062A\u0645\u0627\u0633 \u0628\u0627 \u0645\u0627",contactP1:"\u0627\u06AF\u0631 \u067E\u06CC\u0634\u0646\u0647\u0627\u062F\u06CC\u060C \u0627\u0646\u062A\u0642\u0627\u062F\u06CC\u060C \u06AF\u0632\u0627\u0631\u0634 \u0628\u0627\u06AF (Bug Hunt) \u06CC\u0627 \u0647\u0631 \u0646\u0648\u0639 \u0628\u0627\u0632\u062E\u0648\u0631\u062F\u06CC \u062F\u0627\u0631\u06CC\u062F\u060C \u062E\u0648\u0634\u062D\u0627\u0644 \u0645\u06CC\u200C\u0634\u0648\u0645 \u0622\u0646 \u0631\u0627 \u0628\u0627 \u0645\u0646 \u062F\u0631 \u0645\u06CC\u0627\u0646 \u0628\u06AF\u0630\u0627\u0631\u06CC\u062F.",contactP2:"\u0647\u0631 \u067E\u06CC\u0627\u0645 \u0631\u0627 \u0645\u06CC\u200C\u062A\u0648\u0627\u0646\u06CC\u062F \u0628\u0647 \u0627\u06CC\u0646 \u0622\u062F\u0631\u0633 \u0627\u06CC\u0645\u06CC\u0644 \u0627\u0631\u0633\u0627\u0644 \u06A9\u0646\u06CC\u062F:"},
en:{title:"Upcoming Matches \u2014 Match Notifier",h1:"\u26BD Match Notifier",sub1:"Fixtures, top-of-the-table clashes & results \u2014 auto-refreshed",join:"Join the Telegram bot",hUpcoming:"\u{1F4C5} Upcoming Matches",hFinished:"\u{1F3C1} Recent Results",hLive:"\u{1F534} Live Matches",moreResults:"More",lessResults:"Less",loading:"Loading...",noMatches:"No matches ahead",errLoad:"Error loading data",madeWith:"Made with \u2764\uFE0F",adminLink:"Admin login",botLink:"Telegram bot",soon:"Soon",inDays:"in %d days",barNext:"\u26A1 Until the next big match",barFallback:"\u23F3 Until the next match",barLive:"\u{1F534} Live now",barIdle:"\u23F3 Waiting for the next match",barBase:"The bar fills during the final 24 hours before kickoff and reaches 100% at kickoff",uDay:"d",uHour:"h",uMin:"m",uSec:"s",live:"LIVE",pen:"Penalty",own:"Own goal",derby:"\u{1F525} Derby",hUcl:"UEFA Champions League",hUclNext:"Big UCL Matches",hLgNext:"Big Upcoming Matches",hWeek:"\u{1F4C5} This Week",hWeekNext:"\u{1F4C5} Next Week",wkDone:"Finished",navHome:"Home",navAbout:"About",navContact:"Contact",thP:"P",thW:"W",thD:"D",thL:"L",thGF:"GF",thGA:"GA",thGD:"GD",thPts:"Pts",topBadge:"Top 3",hStandings:"\u{1F4CA} League Standings",hCups:"\u{1F3C6} Tournaments",stEmpty:"Standings not available yet",stNot:"Not started",tierGold:"\u{1F947} Gold tier \u2014 Europe & international",tierSilver:"\u{1F948} Silver tier \u2014 Europe",tierBronze:"\u{1F949} Bronze tier \u2014 Europe",cEN:"\u{1F3F4} England",cES:"\u{1F1EA}\u{1F1F8} Spain",cIT:"\u{1F1EE}\u{1F1F9} Italy",cIR:"\u{1F1EE}\u{1F1F7} Iran",cupsNone:"No fixture announced yet",tierEurope:"\u{1F3C6} European Continental Leagues",intlCups:"\u{1F3C6} International Cups",share:"Share",copy:"Copy text",copied:"Copied \u2713",titleL:"Login \u2014 Bot Admin",loginH1:"\u{1F510} Bot Admin Login",lbUser:"Username",lbPass:"Password",btnLogin:"Login",errUser:"Enter your username",errRate:"Too many attempts \u2014 try again in a few minutes",errCreds:"Wrong username or password",titleA:"Match Bot Settings",h1A:"\u2699\uFE0F Bot Settings",hLogin:"\u{1F511} Login",tokenPh:"Admin password",hStatus:"\u{1F4CA} Status",stLoading:"Loading...",stErr:"\u274C Status error \u2014 re-login or check token",stLastRun:"\u{1F552} Last run",stApi:"\u{1F4E1} API source",stUsers:"\u{1F465} Users",stIds:"\u{1F194} IDs",stTz:"\u{1F30D} Timezone",btnRefresh:"Refresh status",btnTest:"\u{1F4E8} Send test message",btnSim:"\u{1F9EA} Simulate 5 alerts",btnSources:"\u{1F4E1} Check API sources",btnLogout:"\u{1F6AA} Logout",hBroadcast:"\u{1F4E3} Broadcast to all users",lbBroadcast:"Message text (FA or EN)",bcPh:"Message...",btnBroadcast:"\u{1F4E3} Send to all",hMatches:"\u26BD Upcoming Matches",btnRefreshM:"Refresh matches",hSettings:"\u2699\uFE0F Settings",lbTz:"Timezone",lbLeagues:"Leagues (comma-separated codes)",elNote:"EL & ECL are covered by SportScore \u2014 no need to add them.",lbTeams:"Selected teams per league",teamPh:"New team name",btnAdd:"+ Add",btnSave:"\u{1F4BE} Save settings",btnBackup:"\u2B07\uFE0F Backup settings",hPass:"\u{1F511} Change password",lbNp1:"New password (min 8 chars)",lbNp2:"Repeat new password",btnCp:"Change password",cal:"Add to Google Calendar",tzBtn:"Timezone",tzTitle:"\u{1F30D} Timezone",tzSearch:"Search country or city\u2026",tzClose:"Close",lastUpd:"Last updated: %s",ver:"v12.33-xpost \u2014 X (Twitter) automated profile: OAuth 1.0a HMAC-SHA1 signing inline, Persian mirrors of coronation/FT/kickoff/weekly-tables, KV budget governor (450/month, 12/day), dry-run toggle + admin X status card",mToken:"Invalid login \u2014 wrong password or expired session",mErr:"Error: ",mEnterToken:"Enter the admin password",mSaved:"\u2705 Saved",mLoginFirst:"Log in first",mBackup:"\u2B07\uFE0F Backup downloaded",mPassShort:"Password must be at least 8 characters",mPassMismatch:"Passwords do not match",mPassOk:"\u{1F511} Password changed",mSentTo:"\u{1F4E3} Sent to %s of %s users",mTestSent:"\u{1F4E8} Test sent to %s users",mSimPrefix:"\u{1F9EA} Simulate: ",mNoNotif:"\u26A0\uFE0F No notifications sent",mNoMatches:"No matches ahead",mErrMatches:"Error loading matches",mEnterText:"Enter a message",mErrSrc:"\u274C error",acHint:"\u{1F4A1} As you type, the exact API club name is suggested \u2014 pick one to store it safely.",acNone:"No club with that name in the catalog",acAdd:"\u2705 %s added",acAddUcl:"\u2705 %s added \u2014 also selected for the Champions League",uclSync:"Clubs added in any league are auto-selected for the Champions League too",acDup:"\u26A0\uFE0F %s is already in this league",btnClubs:"\u{1F504} Refresh club list",clubsMeta:"Club catalog: %s clubs \u2014 last updated: %s",clubsNone:"\u26A0\uFE0F Club catalog not built yet \u2014 press Refresh",mClubs:"\u2705 Club list refreshed (%s clubs)",clubsErr:"\u274C Club list unavailable",hMembers:"\u{1F465} Bot Members",btnMembers:"\u{1F504} Refresh members",membersNone:"No members yet \u2014 users must /start the bot",memId:"ID",memSlug:"Username",memName:"Name",memJoined:"Joined",memCount:"%s members",hAbout:"\u{1F4D8} About SportSignal",aboutTag:"You don't need to watch every match. You just shouldn't miss the important ones.",aboutP1:"I've always loved football, but never enough to follow every single match or keep up with every game in the domestic league. What I always cared about was finding the big games \u2014 El Cl\u00e1sico, the biggest Premier League derbies, Champions League nights, and any match that was genuinely worth making time for.",aboutP2:"The problem was, there was never an easy way to find them. I either had to install apps that drained my battery and buried me under endless notifications, news, and football drama, or spend hours browsing sports websites just to figure out when the next big game was.",aboutP3:"That's where SportSignal started.",aboutP4:"A simple, curated platform for discovering the matches that matter \u2014 without getting lost in the noise, news, and endless football coverage. Just the games that are actually worth watching.",aboutP5:"Because big football matches are more than 90 minutes of football. They are moments that bring millions of people together, no matter where they live.",aboutP6:"It doesn't matter whether you're from Iran, Australia, or Japan. When Real Madrid and Barcelona face each other, we all know a big game is coming.",aboutP7:"SportSignal was built to make sure you never miss those moments.",hContact:"\u{1F4E7} Get in touch",contactP1:"Have a suggestion, a correction, a bug to report, or any other feedback? I'd love to hear from you.",contactP2:"You can send any message to:",comps:{CL:"Champions League",PL:"Premier League",PD:"La Liga",SA:"Serie A",FL1:"Ligue 1",BL1:"Bundesliga",EL:"Europa League",ECL:"Conference League",FA_CUP:"FA Cup",EFL_CUP:"EFL Cup",CDR:"Copa del Rey",COPPA_ITALIA:"Coppa Italia",DFB_POKAL:"DFB Pokal"}}};
function curLang(){try{return localStorage.getItem("ucl_lang")||"fa";}catch(e){return "fa";}}
var PAGE_TZ = "__PAGE_TZ__";
// Complete IANA timezone list (the same set websites ship): Intl.supportedValuesOf
// returns every CLDR zone. Fallback list below covers legacy browsers. Labels
// carry the REAL GMT offset computed from the zone data itself, so fractional
// offsets (Tehran +3:30, Kathmandu +5:45, Chatham +12:45) are always exact.
// v12.19: labels are fully bilingual \u2014 Farsi regions/cities from the
// hand-transliterated dictionary below + \xAB\u06AF\u0631\u06CC\u0646\u0648\u06CC\u0686+\u06F3:\u06F3\u06F0\xBB in fa mode,
// "Asia/Tehran GMT+3:30" in en mode. Every fixed Etc/GMT\xB1N offset is
// appended so ALL GMT times are pickable, and a \u2B50 popular group pins
// Tehran at the very top (the user could not find +3:30 deep in Asia).
var TZ_ALL = [];
var TZ_ANCHOR = Date.UTC(2026, 0, 1);
var TZ_COMMON = ["UTC","Asia/Tehran","Asia/Dubai","Europe/Istanbul","Europe/London","Europe/Paris","Europe/Berlin","America/New_York","America/Los_Angeles"];
var FA_TZ_REGION = {africa:"\u0622\u0641\u0631\u06CC\u0642\u0627",america:"\u0622\u0645\u0631\u06CC\u06A9\u0627",antarctica:"\u062C\u0646\u0648\u0628\u06AF\u0627\u0646",arctic:"\u0642\u0637\u0628 \u0634\u0645\u0627\u0644",asia:"\u0622\u0633\u06CC\u0627",atlantic:"\u0627\u0642\u06CC\u0627\u0646\u0648\u0633 \u0627\u0637\u0644\u0633",australia:"\u0627\u0633\u062A\u0631\u0627\u0644\u06CC\u0627",europe:"\u0627\u0631\u0648\u067E\u0627",indian:"\u0627\u0642\u06CC\u0627\u0646\u0648\u0633 \u0647\u0646\u062F",pacific:"\u0627\u0642\u06CC\u0627\u0646\u0648\u0633 \u0622\u0631\u0627\u0645",us:"\u0622\u0645\u0631\u06CC\u06A9\u0627",etc:"\u062B\u0627\u0628\u062A",general:"\u0639\u0645\u0648\u0645\u06CC"};
// Hand-transliterated Farsi names for every IANA zone city (key = the zone
// path after the region, lowercased). Multi-segment keys cover the
// Argentina/Indiana/Kentucky/North_Dakota subtrees; bare keys catch the
// legacy aliases of the same zones. Unknown zones fall back to Latin.
var FA_TZ = {
"abidjan":"\u0622\u0628\u06CC\u062C\u0627\u0646","accra":"\u0622\u06A9\u0631\u0627","addis_ababa":"\u0622\u062F\u06CC\u0633\u200C\u0622\u0628\u0627\u0628\u0627","algiers":"\u0627\u0644\u062C\u0632\u06CC\u0631\u0647","asmera":"\u0627\u0633\u0645\u0631\u0627","bamako":"\u0628\u0627\u0645\u0627\u06A9\u0648","bangui":"\u0628\u0627\u0646\u06AF\u06CC","banjul":"\u0628\u0627\u0646\u062C\u0648\u0644","bissau":"\u0628\u06CC\u0633\u0627\u0626\u0648","blantyre":"\u0628\u0644\u0627\u0646\u062A\u0627\u06CC\u0631","brazzaville":"\u0628\u0631\u0627\u0632\u0627\u0648\u06CC\u0644","bujumbura":"\u0628\u0648\u062C\u0648\u0645\u0628\u0648\u0631\u0627","cairo":"\u0642\u0627\u0647\u0631\u0647","casablanca":"\u06A9\u0627\u0632\u0627\u0628\u0644\u0627\u0646\u06A9\u0627","ceuta":"\u0633\u0626\u0648\u062A\u0627","conakry":"\u06A9\u0648\u0646\u0627\u06A9\u0631\u06CC","dakar":"\u062F\u0627\u06A9\u0627\u0631","dar_es_salaam":"\u062F\u0627\u0631\u0627\u0644\u0633\u0644\u0627\u0645","djibouti":"\u062C\u06CC\u0628\u0648\u062A\u06CC","douala":"\u062F\u0648\u0627\u0644\u0627","el_aaiun":"\u0627\u0644\u0639\u06CC\u0648\u0646","freetown":"\u0641\u0631\u06CC\u200C\u062A\u0627\u0648\u0646","gaborone":"\u06AF\u0627\u0628\u0648\u0631\u0648\u0646","harare":"\u0647\u0631\u0627\u0631\u0647","johannesburg":"\u0698\u0648\u0647\u0627\u0646\u0633\u0628\u0648\u0631\u06AF","juba":"\u062C\u0648\u0628\u0627","kampala":"\u06A9\u0627\u0645\u067E\u0627\u0644\u0627","khartoum":"\u062E\u0627\u0631\u0637\u0648\u0645","kigali":"\u06A9\u06CC\u06AF\u0627\u0644\u06CC","kinshasa":"\u06A9\u06CC\u0646\u0634\u0627\u0633\u0627","lagos":"\u0644\u0627\u06AF\u0648\u0633","libreville":"\u0644\u06CC\u0628\u0631\u0648\u06CC\u0644","lome":"\u0644\u0648\u0645\u0647","luanda":"\u0644\u0648\u0622\u0646\u062F\u0627","lubumbashi":"\u0644\u0648\u0628\u0648\u0645\u0628\u0627\u0634\u06CC","lusaka":"\u0644\u0648\u0632\u0627\u06A9\u0627","malabo":"\u0645\u0627\u0644\u0627\u0628\u0648","maputo":"\u0645\u0627\u067E\u0648\u062A\u0648","maseru":"\u0645\u0627\u0633\u0631\u0648","mbabane":"\u0627\u0645\u0628\u0627\u0628\u0627\u0646\u0647","mogadishu":"\u0645\u0648\u06AF\u0627\u062F\u06CC\u0634\u0648","monrovia":"\u0645\u0648\u0646\u0631\u0648\u0648\u06CC\u0627","nairobi":"\u0646\u0627\u06CC\u0631\u0648\u0628\u06CC","ndjamena":"\u0627\u0646\u062C\u0627\u0645\u0646\u0627","niamey":"\u0646\u06CC\u0627\u0645\u06CC","nouakchott":"\u0646\u0648\u0627\u06A9\u0634\u0648\u062A","ouagadougou":"\u0627\u0648\u0622\u06AF\u0627\u062F\u0648\u06AF\u0648","porto-novo":"\u067E\u0648\u0631\u062A\u0648\u200C\u0646\u0648\u0648\u0648","sao_tome":"\u0633\u0627\u0626\u0648\u062A\u0648\u0645\u0647","tripoli":"\u0637\u0631\u0627\u0628\u0644\u0633","tunis":"\u062A\u0648\u0646\u0633","windhoek":"\u0648\u06CC\u0646\u062F\u0647\u0648\u06A9",
"adak":"\u0622\u062F\u06A9","anchorage":"\u0627\u0646\u06A9\u0631\u06CC\u062C","anguilla":"\u0622\u0646\u06AF\u0648\u06CC\u0644\u0627","antigua":"\u0622\u0646\u062A\u06CC\u06AF\u0648\u0627","araguaina":"\u0622\u0631\u0627\u06AF\u0648\u0627\u06CC\u0646\u0627","aruba":"\u0622\u0631\u0648\u0628\u0627","asuncion":"\u0622\u0633\u0648\u0646\u0633\u06CC\u0648\u0646","bahia":"\u0628\u0627\u0647\u06CC\u0627","bahia_banderas":"\u0628\u0627\u0647\u06CC\u0627 \u0628\u0627\u0646\u062F\u0631\u0627\u0633","barbados":"\u0628\u0627\u0631\u0628\u0627\u062F\u0648\u0633","belem":"\u0628\u0644\u0645","belize":"\u0628\u0644\u06CC\u0632","blanc-sablon":"\u0628\u0644\u0627\u0646\u200C\u0633\u0627\u0628\u0644\u0648\u0646","boa_vista":"\u0628\u0648\u0622\u0648\u06CC\u0633\u062A\u0627","bogota":"\u0628\u0648\u06AF\u0648\u062A\u0627","boise":"\u0628\u0648\u0627\u06CC\u0633\u06CC","buenos_aires":"\u0628\u0648\u0626\u0646\u0648\u0633\u200C\u0622\u06CC\u0631\u0633","cambridge_bay":"\u06A9\u0645\u0628\u0631\u06CC\u062C\u200C\u0628\u06CC","campo_grande":"\u06A9\u0627\u0645\u067E\u0648\u06AF\u0631\u0627\u0646\u062F\u0647","cancun":"\u06A9\u0627\u0646\u06A9\u0648\u0646","caracas":"\u06A9\u0627\u0631\u0627\u06A9\u0627\u0633","catamarca":"\u06A9\u0627\u062A\u0627\u0645\u0627\u0631\u06A9\u0627","cayenne":"\u06A9\u0627\u06CC\u0646","cayman":"\u06A9\u06CC\u0645\u0646","chicago":"\u0634\u06CC\u06A9\u0627\u06AF\u0648","chihuahua":"\u0686\u06CC\u0648\u0627\u0648\u0627","ciudad_juarez":"\u0633\u06CC\u0648\u062F\u0627\u062F\u062E\u0648\u0627\u0631\u0632","coral_harbour":"\u06A9\u0648\u0631\u0627\u0644\u200C\u0647\u0627\u0631\u0628\u0631","cordoba":"\u06A9\u0648\u0631\u062F\u0648\u0628\u0627","costa_rica":"\u06A9\u0627\u0633\u062A\u0627\u0631\u06CC\u06A9\u0627","coyhaique":"\u06A9\u0648\u06CC\u0627\u06CC\u06A9\u0647","creston":"\u06A9\u0631\u0633\u062A\u0648\u0646","cuiaba":"\u06A9\u0648\u06CC\u0627\u0628\u0627","curacao":"\u06A9\u0648\u0631\u0627\u0633\u0627\u0626\u0648","danmarkshavn":"\u062F\u0627\u0646\u0645\u0627\u0631\u06A9\u0633\u0647\u0627\u0648\u0646","dawson":"\u062F\u0627\u0648\u0633\u0648\u0646","dawson_creek":"\u062F\u0627\u0648\u0633\u0648\u0646\u200C\u06A9\u0631\u06CC\u06A9","denver":"\u062F\u0646\u0648\u0631","detroit":"\u062F\u06CC\u062A\u0631\u0648\u06CC\u062A","dominica":"\u062F\u0648\u0645\u06CC\u0646\u06CC\u06A9\u0627","edmonton":"\u0627\u062F\u0645\u0648\u0646\u062A\u0648\u0646","eirunepe":"\u0627\u06CC\u0631\u0648\u0646\u067E\u0647","el_salvador":"\u0627\u0644\u0633\u0627\u0644\u0648\u0627\u062F\u0648\u0631","fort_nelson":"\u0641\u0648\u0631\u062A\u200C\u0646\u0644\u0633\u0648\u0646","fortaleza":"\u0641\u0648\u0631\u062A\u0627\u0644\u0632\u0627","glace_bay":"\u06AF\u0644\u06CC\u0633\u200C\u0628\u06CC","godthab":"\u06AF\u0648\u062F\u0647\u0627\u0628","goose_bay":"\u06AF\u0648\u0632\u0628\u06CC","grand_turk":"\u06AF\u0631\u0646\u062F\u062A\u0631\u06A9","grenada":"\u06AF\u0631\u0646\u0627\u062F\u0627","guadeloupe":"\u06AF\u0648\u0627\u062F\u0644\u0648\u067E","guatemala":"\u06AF\u0648\u0627\u062A\u0645\u0627\u0644\u0627","guayaquil":"\u06AF\u0648\u0627\u06CC\u0627\u06A9\u06CC\u0644","guyana":"\u06AF\u0648\u06CC\u0627\u0646","halifax":"\u0647\u0627\u0644\u06CC\u0641\u0627\u06A9\u0633","havana":"\u0647\u0627\u0648\u0627\u0646\u0627","hermosillo":"\u0627\u0631\u0645\u0648\u06CC\u0648","indianapolis":"\u0627\u06CC\u0646\u062F\u06CC\u0627\u0646\u0627\u067E\u0644\u06CC\u0633","inuvik":"\u0627\u06CC\u0646\u0648\u0648\u06CC\u06A9","iqaluit":"\u0627\u06CC\u06A9\u0627\u0644\u0648\u06CC\u062A","jamaica":"\u062C\u0627\u0645\u0627\u0626\u06CC\u06A9\u0627","juneau":"\u0698\u0648\u0646\u0648","kralendijk":"\u06A9\u0631\u0627\u0644\u0646\u062F\u06CC\u06A9","la_paz":"\u0644\u0627\u067E\u0627\u0632","lima":"\u0644\u06CC\u0645\u0627","los_angeles":"\u0644\u0633\u200C\u0622\u0646\u062C\u0644\u0633","louisville":"\u0644\u0648\u0626\u06CC\u0632\u0648\u06CC\u0644","lower_princes":"\u0644\u0648\u0626\u0631\u067E\u0631\u06CC\u0646\u0633\u0632","maceio":"\u0645\u0627\u0633\u0626\u06CC\u0648","managua":"\u0645\u0627\u0646\u0627\u06AF\u0648\u0627","manaus":"\u0645\u0627\u0646\u0627\u0626\u0648\u0633","marigot":"\u0645\u0627\u0631\u06CC\u06AF\u0648","martinique":"\u0645\u0627\u0631\u062A\u06CC\u0646\u06CC\u06A9","matamoros":"\u0645\u0627\u062A\u0627\u0645\u0648\u0631\u0648\u0633","mazatlan":"\u0645\u0627\u0632\u0627\u062A\u0644\u0627\u0646","mendoza":"\u0645\u0646\u062F\u0648\u0632\u0627","menominee":"\u0645\u0646\u0648\u0645\u06CC\u0646\u06CC","merida":"\u0645\u0631\u06CC\u062F\u0627","metlakatla":"\u0645\u062A\u0644\u0627\u06A9\u0627\u062A\u0644\u0627","mexico_city":"\u0645\u06A9\u0632\u06CC\u06A9\u0648\u0633\u06CC\u062A\u06CC","miquelon":"\u0645\u06CC\u06A9\u0644\u0646","moncton":"\u0645\u0648\u0646\u06A9\u062A\u0648\u0646","monterrey":"\u0645\u0648\u0646\u062A\u0631\u06CC","montevideo":"\u0645\u0648\u0646\u062A\u0647\u200C\u0648\u06CC\u062F\u0626\u0648","montserrat":"\u0645\u0648\u0646\u062A\u0633\u0631\u0627\u062A","nassau":"\u0646\u0627\u0633\u0627\u0626\u0648","new_york":"\u0646\u06CC\u0648\u06CC\u0648\u0631\u06A9","nome":"\u0646\u0648\u0645","noronha":"\u0646\u0648\u0631\u0648\u0646\u06CC\u0627","ojinaga":"\u0627\u0648\u062E\u06CC\u0646\u0627\u06AF\u0627","panama":"\u067E\u0627\u0646\u0627\u0645\u0627","paramaribo":"\u067E\u0627\u0631\u0627\u0645\u0627\u0631\u06CC\u0628\u0648","phoenix":"\u0641\u06CC\u0646\u06CC\u06A9\u0633","port-au-prince":"\u067E\u0648\u0631\u062A\u200C\u0627\u0648\u067E\u0631\u0646\u0633","port_of_spain":"\u067E\u0648\u0631\u062A\u200C\u0622\u0648\u0627\u0633\u067E\u06CC\u0646","porto_velho":"\u067E\u0648\u0631\u062A\u0648\u0644\u0648","puerto_rico":"\u067E\u0648\u0631\u062A\u0648\u0631\u06CC\u06A9\u0648","punta_arenas":"\u067E\u0648\u0646\u062A\u0627 \u0622\u0631\u0646\u0627\u0633","rankin_inlet":"\u0631\u0646\u06A9\u06CC\u0646\u200C\u0627\u06CC\u0646\u0644\u062A","recife":"\u0631\u0633\u06CC\u0641\u06CC","regina":"\u0631\u062C\u06CC\u0646\u0627","resolute":"\u0631\u0632\u0648\u0644\u0648\u062A","rio_branco":"\u0631\u06CC\u0648 \u0628\u0631\u0627\u0646\u06A9\u0648","santarem":"\u0633\u0627\u0646\u062A\u0627\u0631\u0645","santiago":"\u0633\u0627\u0646\u062A\u06CC\u0627\u06AF\u0648","santo_domingo":"\u0633\u0627\u0646\u062A\u0648 \u062F\u0648\u0645\u06CC\u0646\u06AF\u0648","sao_paulo":"\u0633\u0627\u0626\u0648\u067E\u0627\u0626\u0648\u0644\u0648","scoresbysund":"\u0627\u0633\u06A9\u0648\u0631\u0633\u0628\u06CC\u0633\u0648\u0646\u062F","sitka":"\u0633\u06CC\u062A\u06A9\u0627","st_barthelemy":"\u0633\u0646\u200C\u0628\u0627\u0631\u062A\u0644\u0645\u06CC","st_johns":"\u0633\u0646\u062A\u200C\u062C\u0627\u0646\u0632","st_kitts":"\u0633\u0646\u062A\u200C\u06A9\u06CC\u062A\u0633","st_lucia":"\u0633\u0646\u062A\u200C\u0644\u0648\u0633\u06CC\u0627","st_thomas":"\u0633\u0646\u062A\u200C\u062A\u0648\u0645\u0627\u0633","st_vincent":"\u0633\u0646\u062A\u200C\u0648\u06CC\u0646\u0633\u0646\u062A","swift_current":"\u0633\u0648\u0626\u06CC\u0641\u062A\u200C\u06A9\u0627\u0631\u0646\u062A","tegucigalpa":"\u062A\u06AF\u0648\u0633\u06CC\u06AF\u0627\u0644\u067E\u0627","thule":"\u062A\u0648\u0644","tijuana":"\u062A\u06CC\u062E\u0648\u0627\u0646\u0627","toronto":"\u062A\u0648\u0631\u0646\u062A\u0648","tortola":"\u062A\u0648\u0631\u062A\u0648\u0644\u0627","vancouver":"\u0648\u0646\u06A9\u0648\u0648\u0631","whitehorse":"\u0648\u0627\u06CC\u062A\u0647\u0627\u0631\u0633","winnipeg":"\u0648\u06CC\u0646\u06CC\u067E\u06AF","yakutat":"\u06CC\u0627\u06A9\u0648\u062A\u0627\u062A",
"argentina/la_rioja":"\u0644\u0627 \u0631\u06CC\u0648\u062E\u0627","argentina/rio_gallegos":"\u0631\u06CC\u0648 \u06AF\u0627\u0644\u06AF\u0648\u0633","argentina/salta":"\u0633\u0627\u0644\u062A\u0627","argentina/san_juan":"\u0633\u0627\u0646\u200C\u062E\u0648\u0627\u0646","argentina/san_luis":"\u0633\u0627\u0646\u200C\u0644\u0648\u0626\u06CC\u0633","argentina/tucuman":"\u062A\u0648\u06A9\u0648\u0645\u0627\u0646","argentina/ushuaia":"\u0627\u0648\u0634\u0648\u0627\u06CC\u0627","argentina/buenos_aires":"\u0628\u0648\u0626\u0646\u0648\u0633\u200C\u0622\u06CC\u0631\u0633","argentina/catamarca":"\u06A9\u0627\u062A\u0627\u0645\u0627\u0631\u06A9\u0627","argentina/cordoba":"\u06A9\u0648\u0631\u062F\u0648\u0628\u0627","argentina/jujuy":"\u062E\u0648\u062E\u0648\u06CC","argentina/mendoza":"\u0645\u0646\u062F\u0648\u0632\u0627","la_rioja":"\u0644\u0627 \u0631\u06CC\u0648\u062E\u0627","rio_gallegos":"\u0631\u06CC\u0648 \u06AF\u0627\u0644\u06AF\u0648\u0633","salta":"\u0633\u0627\u0644\u062A\u0627","san_juan":"\u0633\u0627\u0646\u200C\u062E\u0648\u0627\u0646","san_luis":"\u0633\u0627\u0646\u200C\u0644\u0648\u0626\u06CC\u0633","tucuman":"\u062A\u0648\u06A9\u0648\u0645\u0627\u0646","ushuaia":"\u0627\u0648\u0634\u0648\u0627\u06CC\u0627","jujuy":"\u062E\u0648\u062E\u0648\u06CC","catamarca":"\u06A9\u0627\u062A\u0627\u0645\u0627\u0631\u06A9\u0627","cordoba":"\u06A9\u0648\u0631\u062F\u0648\u0628\u0627","mendoza":"\u0645\u0646\u062F\u0648\u0632\u0627","buenos_aires":"\u0628\u0648\u0626\u0646\u0648\u0633\u200C\u0622\u06CC\u0631\u0633",
"indiana/knox":"\u0646\u0627\u06A9\u0633","indiana/marengo":"\u0645\u0627\u0631\u0646\u06AF\u0648","indiana/petersburg":"\u067E\u06CC\u062A\u0631\u0632\u0628\u0648\u0631\u06AF","indiana/tell_city":"\u062A\u0644\u200C\u0633\u06CC\u062A\u06CC","indiana/vevay":"\u0648\u06CC\u0648\u06CC","indiana/vincennes":"\u0648\u06CC\u0646\u0633\u0646\u0633","indiana/winamac":"\u0648\u06CC\u0646\u0627\u0645\u06A9","kentucky/monticello":"\u0645\u0648\u0646\u062A\u06CC\u0686\u0644\u0648","north_dakota/beulah":"\u0628\u06CC\u0648\u0644\u0627","north_dakota/center":"\u0633\u0646\u062A\u0631","north_dakota/new_salem":"\u0646\u06CC\u0648\u0633\u0627\u0644\u0645",
"casey":"\u06A9\u06CC\u0633\u06CC","davis":"\u062F\u06CC\u0648\u06CC\u0633","dumontdurville":"\u062F\u0648\u0645\u0648\u0646\u200C\u062F\u0648\u0631\u0648\u06CC\u0644","macquarie":"\u0645\u06A9\u0648\u0627\u0631\u06CC","mawson":"\u0645\u0627\u0648\u0633\u0648\u0646","mcmurdo":"\u0645\u06A9\u200C\u0645\u0648\u0631\u062F\u0648","palmer":"\u067E\u0627\u0644\u0645\u0631","rothera":"\u0631\u0648\u062A\u0631\u0627","syowa":"\u0634\u06CC\u0648\u0648\u0627","troll":"\u062A\u0631\u0648\u0644","vostok":"\u0648\u0633\u062A\u0648\u06A9","longyearbyen":"\u0644\u0627\u0646\u06AF\u06CC\u200C\u06CC\u0631\u0628\u06CC\u0646",
"aden":"\u0639\u062F\u0646","almaty":"\u0622\u0644\u0645\u0627\u062A\u06CC","amman":"\u0627\u0645\u0627\u0646","anadyr":"\u0622\u0646\u0627\u062F\u06CC\u0631","aqtau":"\u0622\u0642\u062A\u0627\u0648","aqtobe":"\u0622\u0642\u062A\u0648\u0628\u0647","ashgabat":"\u0639\u0634\u0642\u200C\u0622\u0628\u0627\u062F","atyrau":"\u0622\u062A\u06CC\u0631\u0627\u0648","baghdad":"\u0628\u063A\u062F\u0627\u062F","bahrain":"\u0628\u062D\u0631\u06CC\u0646","baku":"\u0628\u0627\u06A9\u0648","bangkok":"\u0628\u0627\u0646\u06A9\u0648\u06A9","barnaul":"\u0628\u0627\u0631\u0646\u0627\u0626\u0648\u0644","beirut":"\u0628\u06CC\u0631\u0648\u062A","bishkek":"\u0628\u06CC\u0634\u06A9\u06A9","brunei":"\u0628\u0631\u0648\u0646\u0626\u06CC","calcutta":"\u06A9\u0644\u06A9\u062A\u0647","chita":"\u0686\u06CC\u062A\u0627","colombo":"\u06A9\u0644\u0645\u0628\u0648","damascus":"\u062F\u0645\u0634\u0642","dhaka":"\u062F\u0627\u06A9\u0627","dili":"\u062F\u06CC\u0644\u06CC","dubai":"\u062F\u0628\u06CC","dushanbe":"\u062F\u0648\u0634\u0646\u0628\u0647","famagusta":"\u0641\u0627\u0645\u0627\u06AF\u0648\u0633\u062A\u0627","gaza":"\u063A\u0632\u0647","hebron":"\u0627\u0644\u062E\u0644\u06CC\u0644","hong_kong":"\u0647\u0646\u06AF\u200C\u06A9\u0646\u06AF","hovd":"\u062E\u0648\u0648\u062F","irkutsk":"\u0627\u06CC\u0631\u06A9\u0648\u062A\u0633\u06A9","jakarta":"\u062C\u0627\u06A9\u0627\u0631\u062A\u0627","jayapura":"\u062C\u0627\u06CC\u0627\u067E\u0648\u0631\u0627","jerusalem":"\u0642\u062F\u0633","kabul":"\u06A9\u0627\u0628\u0644","kamchatka":"\u06A9\u0627\u0645\u0686\u0627\u062A\u06A9\u0627","karachi":"\u06A9\u0631\u0627\u0686\u06CC","katmandu":"\u06A9\u0627\u062A\u0645\u0627\u0646\u062F\u0648","khandyga":"\u062E\u0627\u0646\u062F\u06CC\u06AF\u0627","krasnoyarsk":"\u06A9\u0631\u0627\u0633\u0646\u0648\u06CC\u0627\u0631\u0633\u06A9","kuala_lumpur":"\u06A9\u0648\u0627\u0644\u0627\u0644\u0627\u0645\u067E\u0648\u0631","kuching":"\u06A9\u0648\u0686\u06CC\u0646\u06AF","kuwait":"\u06A9\u0648\u06CC\u062A","macau":"\u0645\u0627\u06A9\u0627\u0626\u0648","magadan":"\u0645\u06AF\u0627\u062F\u0627\u0646","makassar":"\u0645\u0627\u06A9\u0627\u0633\u0627\u0631","manila":"\u0645\u0627\u0646\u06CC\u0644","muscat":"\u0645\u0633\u0642\u0637","nicosia":"\u0646\u06CC\u06A9\u0648\u0632\u06CC\u0627","novokuznetsk":"\u0646\u0648\u0648\u06A9\u0648\u0632\u0646\u062A\u0633\u06A9","novosibirsk":"\u0646\u0648\u0648\u0633\u06CC\u0628\u06CC\u0631\u0633\u06A9","omsk":"\u0627\u0648\u0645\u0633\u06A9","oral":"\u0627\u0648\u0631\u0627\u0644","phnom_penh":"\u067E\u0646\u0648\u0645\u200C\u067E\u0646","pontianak":"\u067E\u0648\u0646\u062A\u06CC\u0627\u0646\u0627\u06A9","pyongyang":"\u067E\u06CC\u0648\u0646\u06AF\u200C\u06CC\u0627\u0646\u06AF","qatar":"\u0642\u0637\u0631","qostanay":"\u0642\u0648\u0633\u062A\u0627\u0646\u0627\u06CC","qyzylorda":"\u0642\u06CC\u0632\u06CC\u0644\u200C\u0627\u0648\u0631\u062F\u0627","rangoon":"\u06CC\u0627\u0646\u06AF\u0648\u0646","riyadh":"\u0631\u06CC\u0627\u0636","saigon":"\u0633\u0627\u06CC\u06AF\u0648\u0646","sakhalin":"\u0633\u0627\u062E\u0627\u0644\u06CC\u0646","samarkand":"\u0633\u0645\u0631\u0642\u0646\u062F","seoul":"\u0633\u0626\u0648\u0644","shanghai":"\u0634\u0627\u0646\u06AF\u0647\u0627\u06CC","singapore":"\u0633\u0646\u06AF\u0627\u067E\u0648\u0631","srednekolymsk":"\u0633\u0631\u062F\u0646\u06CC\u200C\u06A9\u0648\u0644\u06CC\u0645\u0633\u06A9","taipei":"\u062A\u0627\u06CC\u067E\u0647","tashkent":"\u062A\u0627\u0634\u06A9\u0646\u062F","tbilisi":"\u062A\u0641\u0644\u06CC\u0633","tehran":"\u062A\u0647\u0631\u0627\u0646","thimphu":"\u062A\u06CC\u0645\u0641\u0648","tokyo":"\u062A\u0648\u06A9\u06CC\u0648","tomsk":"\u062A\u0648\u0645\u0633\u06A9","ulaanbaatar":"\u0627\u0648\u0644\u0627\u0646\u200C\u0628\u0627\u062A\u0648\u0631","urumqi":"\u0627\u0631\u0648\u0645\u0686\u06CC","ust-nera":"\u0627\u0648\u0633\u062A\u200C\u0646\u0631\u0627","vientiane":"\u0648\u06CC\u0646\u062A\u06CC\u0627\u0646","vladivostok":"\u0648\u0644\u0627\u062F\u06CC\u200C\u0648\u0633\u062A\u0648\u06A9","yakutsk":"\u06CC\u0627\u06A9\u0648\u062A\u0633\u06A9","yekaterinburg":"\u06CC\u06A9\u0627\u062A\u0631\u06CC\u0646\u0628\u0648\u0631\u06AF","yerevan":"\u0627\u06CC\u0631\u0648\u0627\u0646",
"azores":"\u0622\u0632\u0648\u0631","bermuda":"\u0628\u0631\u0645\u0648\u062F\u0627","canary":"\u0642\u0646\u0627\u0631\u06CC","cape_verde":"\u06A9\u06CC\u067E\u200C\u0648\u0631\u062F","faeroe":"\u0641\u0627\u0631\u0648","madeira":"\u0645\u0627\u062F\u06CC\u0631\u0627","reykjavik":"\u0631\u06CC\u06A9\u06CC\u0627\u0648\u06CC\u06A9","south_georgia":"\u062C\u0646\u0648\u0628 \u062C\u0648\u0631\u062C\u06CC\u0627","st_helena":"\u0633\u0646\u062A\u200C\u0647\u0644\u0646\u0627","stanley":"\u0627\u0633\u062A\u0646\u0644\u06CC",
"adelaide":"\u0622\u062F\u0644\u0627\u06CC\u062F","brisbane":"\u0628\u0631\u06CC\u0632\u0628\u0646","broken_hill":"\u0628\u0631\u0648\u06A9\u0646\u200C\u0647\u06CC\u0644","canberra":"\u06A9\u0627\u0646\u0628\u0631\u0627","darwin":"\u062F\u0627\u0631\u0648\u06CC\u0646","eucla":"\u06CC\u0648\u06A9\u0644\u0627","hobart":"\u0647\u0648\u0628\u0627\u0631\u062A","lindeman":"\u0644\u06CC\u0646\u062F\u0645\u0646","lord_howe":"\u0644\u0631\u062F \u0647\u0627\u0648","melbourne":"\u0645\u0644\u0628\u0648\u0631\u0646","perth":"\u067E\u0631\u062A","sydney":"\u0633\u06CC\u062F\u0646\u06CC",
"amsterdam":"\u0622\u0645\u0633\u062A\u0631\u062F\u0627\u0645","andorra":"\u0622\u0646\u062F\u0648\u0631\u0627","astrakhan":"\u0622\u0633\u062A\u0631\u0627\u062E\u0627\u0646","athens":"\u0622\u062A\u0646","belgrade":"\u0628\u0644\u06AF\u0631\u0627\u062F","berlin":"\u0628\u0631\u0644\u06CC\u0646","bratislava":"\u0628\u0631\u0627\u062A\u06CC\u0633\u0644\u0627\u0648\u0627","brussels":"\u0628\u0631\u0648\u06A9\u0633\u0644","bucharest":"\u0628\u062E\u0627\u0631\u0633\u062A","budapest":"\u0628\u0648\u062F\u0627\u067E\u0633\u062A","busingen":"\u0628\u0648\u0632\u06CC\u0646\u06AF\u0646","chisinau":"\u06A9\u06CC\u0634\u06CC\u0646\u0627\u0648","copenhagen":"\u06A9\u067E\u0646\u0647\u0627\u06AF","dublin":"\u062F\u0648\u0628\u0644\u06CC\u0646","gibraltar":"\u062C\u0628\u0644\u200C\u0627\u0644\u0637\u0627\u0631\u0642","guernsey":"\u06AF\u0631\u0646\u0632\u06CC","helsinki":"\u0647\u0644\u0633\u06CC\u0646\u06A9\u06CC","isle_of_man":"\u062C\u0632\u06CC\u0631\u0647\u200C\u0645\u0627\u0646","istanbul":"\u0627\u0633\u062A\u0627\u0646\u0628\u0648\u0644","jersey":"\u062C\u0631\u0633\u06CC","kaliningrad":"\u06A9\u0627\u0644\u06CC\u0646\u06CC\u0646\u06AF\u0631\u0627\u062F","kiev":"\u06A9\u06CC\u0641","kirov":"\u06A9\u06CC\u0631\u0648\u0641","lisbon":"\u0644\u06CC\u0633\u0628\u0648\u0646","ljubljana":"\u0644\u06CC\u0648\u0628\u0644\u06CC\u0627\u0646\u0627","london":"\u0644\u0646\u062F\u0646","luxembourg":"\u0644\u0648\u06A9\u0632\u0627\u0645\u0628\u0648\u0631\u06AF","madrid":"\u0645\u0627\u062F\u0631\u06CC\u062F","malta":"\u0645\u0627\u0644\u062A","mariehamn":"\u0645\u0627\u0631\u06CC\u200C\u0647\u0645\u0646","minsk":"\u0645\u06CC\u0646\u0633\u06A9","moscow":"\u0645\u0633\u06A9\u0648","monaco":"\u0645\u0648\u0646\u0627\u06A9\u0648","oslo":"\u0627\u0633\u0644\u0648","paris":"\u067E\u0627\u0631\u06CC\u0633","podgorica":"\u067E\u0648\u062F\u06AF\u0648\u0631\u06CC\u062A\u0633\u0627","prague":"\u067E\u0631\u0627\u06AF","riga":"\u0631\u06CC\u06AF\u0627","rome":"\u0631\u0645","samara":"\u0633\u0627\u0645\u0627\u0631\u0627","san_marino":"\u0633\u0627\u0646\u200C\u0645\u0627\u0631\u06CC\u0646\u0648","sarajevo":"\u0633\u0627\u0631\u0627\u06CC\u0648\u0648","saratov":"\u0633\u0627\u0631\u0627\u062A\u0648\u0641","simferopol":"\u0633\u06CC\u0645\u0641\u0631\u0648\u067E\u0644","skopje":"\u0627\u0633\u06A9\u0648\u067E\u06CC\u0647","sofia":"\u0635\u0648\u0641\u06CC\u0647","stockholm":"\u0627\u0633\u062A\u06A9\u0647\u0644\u0645","tallinn":"\u062A\u0627\u0644\u06CC\u0646","tirane":"\u062A\u06CC\u0631\u0627\u0646\u0627","ulyanovsk":"\u0627\u0648\u0644\u06CC\u0627\u0646\u0648\u0641\u0633\u06A9","vaduz":"\u0641\u0627\u062F\u0648\u062A\u0633","vatican":"\u0648\u0627\u062A\u06CC\u06A9\u0627\u0646","vienna":"\u0648\u06CC\u0646","vilnius":"\u0648\u06CC\u0644\u0646\u06CC\u0648\u0633","volgograd":"\u0648\u0644\u06AF\u0648\u06AF\u0631\u0627\u062F","warsaw":"\u0648\u0631\u0634\u0648","zagreb":"\u0632\u0627\u06AF\u0631\u0628","zurich":"\u0632\u0648\u0631\u06CC\u062E",
"antananarivo":"\u0622\u0646\u062A\u0627\u0646\u0627\u0646\u0627\u0631\u06CC\u0648\u0648","chagos":"\u0686\u0627\u06AF\u0648\u0633","christmas":"\u06A9\u0631\u06CC\u0633\u0645\u0633","cocos":"\u06A9\u0648\u06A9\u0648\u0633","comoro":"\u06A9\u0627\u0645\u0648\u0631\u0648","kerguelen":"\u06A9\u0631\u06AF\u0648\u0644\u0646","mahe":"\u0645\u0627\u0647\u0647","maldives":"\u0645\u0627\u0644\u062F\u06CC\u0648","mauritius":"\u0645\u0648\u0631\u06CC\u0633","mayotte":"\u0645\u0627\u06CC\u0648\u062A","reunion":"\u0631\u06CC\u0648\u0646\u06CC\u0648\u0646",
"apia":"\u0622\u067E\u06CC\u0627","auckland":"\u0627\u0648\u06A9\u0644\u0646\u062F","bougainville":"\u0628\u0648\u06AF\u0646\u0648\u06CC\u0644","chatham":"\u0686\u062A\u0645","easter":"\u0627\u06CC\u0633\u062A\u0631","efate":"\u0627\u0641\u0627\u062A\u0647","enderbury":"\u0627\u0646\u062F\u0631\u062A\u0631\u06CC","fakaofo":"\u0641\u0627\u06A9\u0627\u0626\u0648\u0641\u0648","fiji":"\u0641\u06CC\u062C\u06CC","funafuti":"\u0641\u0648\u0646\u0627\u0641\u0648\u062A\u06CC","galapagos":"\u06AF\u0627\u0644\u0627\u067E\u0627\u06AF\u0648\u0633","gambier":"\u06AF\u0627\u0645\u0628\u06CC\u0647","guadalcanal":"\u06AF\u0648\u0627\u062F\u0627\u0644\u06A9\u0627\u0646\u0627\u0644","guam":"\u06AF\u0648\u0627\u0645","honolulu":"\u0647\u0648\u0646\u0648\u0644\u0648\u0644\u0648","kiritimati":"\u06A9\u06CC\u0631\u06CC\u062A\u06CC\u0645\u0627\u062A\u06CC","kosrae":"\u06A9\u0648\u0633\u0631\u0627\u06CC","kwajalein":"\u06A9\u0648\u0627\u062C\u0627\u0644\u06CC\u0646","majuro":"\u0645\u0627\u0698\u0648\u0631\u0648","marquesas":"\u0645\u0627\u0631\u06A9\u06CC\u0632\u0627\u0633","midway":"\u0645\u06CC\u062F\u0648\u06CC","nauru":"\u0646\u0627\u0626\u0648\u0631\u0648","niue":"\u0646\u06CC\u0648\u0626\u0647","norfolk":"\u0646\u0648\u0631\u0641\u0648\u0644\u06A9","noumea":"\u0646\u0648\u0645\u0626\u0627","pago_pago":"\u067E\u0627\u06AF\u0648 \u067E\u0627\u06AF\u0648","palau":"\u067E\u0627\u0644\u0627\u0626\u0648","pitcairn":"\u067E\u06CC\u062A\u06A9\u0631\u0646","ponape":"\u067E\u0648\u0646\u0627\u067E\u0647","port_moresby":"\u067E\u0648\u0631\u062A \u0645\u0648\u0631\u0633\u0628\u06CC","rarotonga":"\u0631\u0627\u0631\u0648\u062A\u0648\u0646\u06AF\u0627","saipan":"\u0633\u0627\u06CC\u067E\u0646","tahiti":"\u062A\u0627\u0647\u06CC\u062A\u06CC","tarawa":"\u062A\u0627\u0631\u0627\u0648\u0627","tongatapu":"\u062A\u0648\u0646\u06AF\u0627\u062A\u0627\u067E\u0648","truk":"\u062A\u0631\u0648\u06A9","wake":"\u0648\u06CC\u06A9","wallis":"\u0648\u0627\u0644\u06CC\u0633"
};
var TZ_INFO = {};
function tzOffsetMin(tz){
  try{
    var p = new Intl.DateTimeFormat("en-US",{timeZone:tz,hour12:false,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit"}).formatToParts(new Date(TZ_ANCHOR));
    var m = {};
    for(var i = 0; i < p.length; i++) m[p[i].type] = p[i].value;
    var asUTC = Date.UTC(+m.year, (+m.month) - 1, +m.day, (+m.hour) % 24, +m.minute, +m.second);
    return Math.round((asUTC - TZ_ANCHOR) / 6e4);
  }catch(e){ return null; }
}
function tzGmtLabel(min, lang){
  if(min === null || min !== min) return "";
  var sign = min < 0 ? "-" : "+", abs = Math.abs(min), h = Math.floor(abs / 60), mm = abs % 60;
  if(lang === "fa") return " \u06AF\u0631\u06CC\u0646\u0648\u06CC\u0686" + sign + faNum(h) + (mm ? ":" + faNum(mm < 10 ? "0" + mm : "" + mm) : "");
  return " GMT" + sign + h + (mm ? ":" + (mm < 10 ? "0" + mm : "" + mm) : "");
}
function tzPathFa(rest){
  var k = rest.toLowerCase();
  if(FA_TZ[k]) return FA_TZ[k];
  var last = k.slice(k.lastIndexOf("/") + 1);
  if(FA_TZ[last]) return FA_TZ[last];
  return rest.replace(/_/g, " ");
}
function tzOptionLabel(tz, lang){
  if(tz === "UTC") return "UTC";
  if(tz.indexOf("Etc/") === 0){
    if(tz === "Etc/UTC") return lang === "fa" ? "UTC (\u062B\u0627\u0628\u062A)" : "UTC (fixed)";
    var eb = tzGmtLabel(tzOffsetMin(tz), lang).trim() || "GMT";
    return lang === "fa" ? eb + " (\u062B\u0627\u0628\u062A)" : eb + " (fixed)";
  }
  var parts = tz.split("/");
  if(lang === "fa") return (FA_TZ_REGION[parts[0].toLowerCase()] || parts[0]) + "/" + tzPathFa(parts.slice(1).join("/")) + tzGmtLabel(tzOffsetMin(tz), "fa");
  return tz.replace(/_/g, " ") + tzGmtLabel(tzOffsetMin(tz), "en");
}
function tzInfo(tz){
  if(!TZ_INFO[tz]) TZ_INFO[tz] = { value: tz.toLowerCase(), en: tzOptionLabel(tz, "en"), fa: tzOptionLabel(tz, "fa") };
  return TZ_INFO[tz];
}
function buildTzAll(){
  var out = [];
  try{ out = Intl.supportedValuesOf ? Intl.supportedValuesOf("timeZone") : []; }catch(e){ out = []; }
  if(!out.length) out = ["UTC","Asia/Tehran","Europe/London","Europe/Berlin","Europe/Paris","Europe/Rome","Asia/Dubai","Europe/Istanbul","America/New_York","America/Los_Angeles","America/Toronto","Asia/Tokyo","Australia/Sydney","Australia/Melbourne","Australia/Brisbane","Australia/Adelaide","Australia/Canberra","Australia/Perth"];
  var seen = {}, list = [];
  out.forEach(function(x){ var s = String(x); if(!seen[s]){ seen[s] = 1; list.push(s); } });
  // v12.19: the full fixed-offset ladder (IANA Etc sign is INVERTED \u2014
  // Etc/GMT+5 is UTC-5) so every pure GMT time from -14 to +14 exists.
  var extra = ["UTC","Etc/UTC","Etc/GMT"];
  for(var u = 1; u <= 14; u++) extra.push("Etc/GMT-" + u);
  for(var w = 1; w <= 14; w++) extra.push("Etc/GMT+" + w);
  extra.forEach(function(x){ if(!seen[x]){ seen[x] = 1; list.push(x); } });
  return list.sort();
}
function curTz(){
  try{ var v = localStorage.getItem("ucl_tz"); if(v){ new Intl.DateTimeFormat("en",{timeZone:v}); return v; } }catch(e){}
  return PAGE_TZ;
}
function T(k){var l=curLang(),d=I18N[l];return (d&&d[k])||I18N.fa[k]||k;}
function fmt(k){var s=T(k);for(var i=1;i<arguments.length;i++)s=s.replace("%s",arguments[i]).replace("%d",arguments[i]);return s;}
function trText(){var l=curLang();document.querySelectorAll("[data-i]").forEach(function(el){el.textContent=T(el.getAttribute("data-i"));});}
function trPlace(){document.querySelectorAll("[data-p]").forEach(function(el){el.setAttribute("placeholder",T(el.getAttribute("data-p")));});}
function initTheme(){try{return localStorage.getItem("ucl_theme")||"dark";}catch(e){return "dark";}}
function setTheme(t){document.documentElement.setAttribute("data-theme",t);try{localStorage.setItem("ucl_theme",t);}catch(e){}var b=document.getElementById("tbtn");if(b)b.textContent=t==="dark"?"\u{1F319}":"\u2600\uFE0F";}
function toggleTheme(){setTheme(document.documentElement.getAttribute("data-theme")==="dark"?"light":"dark");}
function switchLang(){var l=curLang()==="fa"?"en":"fa";try{localStorage.setItem("ucl_lang",l);}catch(e){}applyLang();}
function applyLang(skipHook){var l=curLang();document.documentElement.setAttribute("lang",l);document.documentElement.setAttribute("dir",l==="en"?"ltr":"rtl");var b=document.getElementById("lbtn");if(b)b.textContent=l==="en"?"\u0641\u0627":"EN";trText();trPlace();if(!skipHook&&typeof onLang==="function")onLang();}
var fmtDate = function(iso){
  var l=curLang();
  try{
    var d = new Date(iso);
    if(l==="fa"){
      // Persian order: weekday\u060C day month-name year (\u06F3\u06F0 \u0645\u0631\u062F\u0627\u062F \u06F1\u06F4\u06F0\u06F5) \u2014 fa-IR
      // toLocaleString yields year-first (\u06F1\u06F4\u06F0\u06F5 \u0645\u0631\u062F\u0627\u062F \u06F3\u06F0), which is wrong for Persian.
      var parts = new Intl.DateTimeFormat("fa-IR",{day:"numeric",month:"long",year:"numeric",weekday:"long",hour:"2-digit",minute:"2-digit",hour12:false,timeZone:curTz()}).formatToParts(d);
      var g = function(t){ var p=parts.find(function(x){return x.type===t;}); return p?p.value:""; };
      return g("weekday")+"\u060C "+g("day")+" "+g("month")+" "+g("year")+" \u0633\u0627\u0639\u062A "+g("hour")+":"+g("minute");
    }
    return d.toLocaleString("en-GB",{dateStyle:"full",timeStyle:"short",timeZone:curTz()});
  }
  catch(e){ return new Date(iso).toString(); }
};
// v12.32: the HERO's short date \u2014 weekday + day + month ONLY ("Sunday 22
// September"), the run that rides under the big time chip (.kickdate).
// No year, no clock: the chip above already owns the time, and the
// weekday+date answers "WHEN is that" at a glance.
var fmtHeroDate = function(iso){
  var l=curLang();
  try{
    var d = new Date(iso);
    if(l==="fa"){
      var parts = new Intl.DateTimeFormat("fa-IR",{day:"numeric",month:"long",weekday:"long",timeZone:curTz()}).formatToParts(d);
      var g = function(t){ var p=parts.find(function(x){return x.type===t;}); return p?p.value:""; };
      return g("weekday")+" "+g("day")+" "+g("month");
    }
    return d.toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long",timeZone:curTz()});
  }
  catch(e){ return ""; }
};
var faNum = function(n){ return String(n).replace(/[0-9]/g,function(d){return "\u06F0\u06F1\u06F2\u06F3\u06F4\u06F5\u06F6\u06F7\u06F8\u06F9"[d];}); };
var fmtNum = function(n){ return curLang()==="en"?String(n):faNum(n); };
function compName(m){
  if(curLang()==="en") return (I18N.en.comps&&I18N.en.comps[m.competition.code])||m.competition.code;
  return m.competition.faName||m.competition.code;
}
function monogram(t){
  // Future-plan fix (club badges not loading): a failed or missing crest now
  // falls back to a clean two-letter club monogram instead of a bare \u26BD.
  // NOTE: this lives inside a template literal \u2014 \\s+ emits the s+ regex
  // (a single s would be cooked to a literal "s" and split on the letter!).
  var n = String((t && (t.faName || t.name)) || "");
  var w = n.split(/\\s+/).filter(Boolean);
  if(!w.length) return "\u26BD";
  if(w.length === 1) return w[0].substring(0, 2);
  return w[0].substring(0, 1) + w[w.length - 1].substring(0, 1);
}
function logo(t){
  var el = document.createElement("span"); el.className = "logo";
  if(t.crest){
    var img = document.createElement("img");
    img.src = t.crest; img.alt = ""; img.loading = "lazy"; img.decoding = "async"; img.referrerPolicy = "no-referrer";
    img.onerror = function(){ el.textContent = monogram(t); };
    el.appendChild(img);
  } else { el.textContent = monogram(t); }
  return el;
}
function shareText(m, finished){
  var en = curLang()==="en";
  var h = en ? m.homeTeam.name : (m.homeTeam.faName||m.homeTeam.name);
  var a = en ? m.awayTeam.name : (m.awayTeam.faName||m.awayTeam.name);
  var txt = h + " \u2013 " + a + " \u2014 " + compName(m);
  if((finished || m.status==="LIVE"||m.status==="IN_PLAY"||m.status==="PAUSED") && m.score && m.score.home!==null) txt += " \u2014 " + fmtNum(m.score.home) + ":" + fmtNum(m.score.away);
  return txt + " \u2014 " + fmtDate(m.utcDate);
}
var S_ICONS = {
  share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>',
  wa: '<path fill="#25D366" d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>',
  tg: '<path fill="#2AABEE" d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>',
  mail: '<rect x="2.5" y="5" width="19" height="14.5" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.8"></rect><path d="M3.5 6l8.5 6.5 8.5-6.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path>',
  copy: '<rect x="9" y="9" width="13" height="13" rx="2" ry="2" fill="none" stroke="currentColor" stroke-width="1.8"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path>',
  check: '<polyline points="20 6 9 17 4 12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"></polyline>',
  cal: '<rect x="3" y="4.5" width="18" height="17" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"></rect><path d="M8 2.5v4M16 2.5v4M3 10h18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path>',
  dots: '<circle cx="5" cy="12" r="2.1"/><circle cx="12" cy="12" r="2.1"/><circle cx="19" cy="12" r="2.1"/>'
};
function sBtn(tag, href, body, title){
  var el = document.createElement(tag);
  el.className = "sbtn";
  el.title = title; el.setAttribute("aria-label", title);
  if(tag === "a"){ el.href = href; el.target = "_blank"; el.rel = "noopener"; }
  else el.type = "button";
  el.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">' + body + '</svg>';
  return el;
}
function gcalDates(iso){
  var s = new Date(iso), e = new Date(s.getTime() + 2*60*60*1000);
  var z = function(n){ return n < 10 ? "0"+n : ""+n; };
  var f = function(d){ return "" + d.getUTCFullYear() + z(d.getUTCMonth()+1) + z(d.getUTCDate()) + "T" + z(d.getUTCHours()) + z(d.getUTCMinutes()) + "00Z"; };
  return f(s) + "/" + f(e);
}
function shareRow(m, finished){
  var t = encodeURIComponent(shareText(m, finished));
  var u = encodeURIComponent(location.origin + location.pathname);
  var row = document.createElement("div"); row.className = "share";
  row.appendChild(sBtn("a", "https://wa.me/?text=" + t, S_ICONS.wa, T("share") + " WhatsApp"));
  row.appendChild(sBtn("a", "https://t.me/share/url?url=" + u + "&text=" + t, S_ICONS.tg, T("share") + " Telegram"));
  row.appendChild(sBtn("a", "mailto:?subject=" + t + "&body=" + t, S_ICONS.mail, T("share") + " Email"));
  if(!finished){
    var calU = "https://calendar.google.com/calendar/render?action=TEMPLATE&text=" + t + "&dates=" + gcalDates(m.utcDate) + "&details=" + t;
    row.appendChild(sBtn("a", calU, S_ICONS.cal, T("cal")));
  }
  var cb = sBtn("button", null, S_ICONS.copy, T("copy"));
  cb.onclick = function(){
    var raw = shareText(m, finished), ok = function(){
      cb.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">' + S_ICONS.check + '</svg>'; cb.title = T("copied"); cb.setAttribute("aria-label", T("copied"));
      setTimeout(function(){ cb.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">' + S_ICONS.copy + '</svg>'; cb.title = T("copy"); cb.setAttribute("aria-label", T("copy")); }, 1600);
    };
    if(navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(raw).then(ok, function(){ fallbackCopy(raw); ok(); });
    } else { fallbackCopy(raw); ok(); }
  };
  row.appendChild(cb);
  // v12.21 (the user's ask): the labeled \xABShare\xBB pill on every row was visual
  // noise. The toggle is now a QUIET ghost \u22EF \u2014 icon-only, borderless, muted,
  // 44\xD744 hit area; the options unfold in a popover (outside click / Esc /
  // the next \u22EF close it \u2014 see closeShare and the document listeners below).
  // aria-expanded + tooltip stay.
  // v12.31: the \u22EF moved to the box's top inline-end corner (see the .sharewrap
  // CSS note) \u2014 the icon is 16px and CORNER-ANCHORED so it clears the round
  // crest that hugs that corner on PC (the crest's square corner is empty).
  var wrap = document.createElement("div"); wrap.className = "sharewrap";
  var tg = sBtn("button", null, S_ICONS.dots, T("share"));
  tg.className = "sharetoggle";
  tg.setAttribute("aria-expanded", "false");
  tg.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">' + S_ICONS.dots + '</svg>';
  tg.onclick = function(){
    var open = wrap.classList.toggle("open");
    tg.setAttribute("aria-expanded", open ? "true" : "false");
  };
  wrap.appendChild(tg);
  wrap.appendChild(row);
  return wrap;
}
// v12.21: the share popover closes from ANYWHERE \u2014 an outside click, Esc, or
// another \u22EF opening \u2014 so at most one popover is ever on screen and the
// collapsed rows carry nothing but three quiet dots.
function closeShare(w){
  w.classList.remove("open");
  var t = w.querySelector(".sharetoggle");
  if(t) t.setAttribute("aria-expanded", "false");
}
document.addEventListener("click", function(ev){
  var open = document.querySelectorAll(".sharewrap.open");
  for(var i = 0; i < open.length; i++) if(!open[i].contains(ev.target)) closeShare(open[i]);
});
document.addEventListener("keydown", function(ev){
  if(ev.key === "Escape"){
    var open = document.querySelectorAll(".sharewrap.open");
    for(var i = 0; i < open.length; i++) closeShare(open[i]);
  }
});
function fallbackCopy(text){
  var ta = document.createElement("textarea");
  ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
  document.body.appendChild(ta); ta.select();
  try{ document.execCommand("copy"); }catch(e){}
  document.body.removeChild(ta);
}
function countdown(iso){
  var ms = new Date(iso).getTime() - Date.now();
  if(ms <= 0) return T("soon");
  var h = Math.floor(ms/36e5), m = Math.floor(ms%36e5/6e4);
  if(h > 24) return fmt("inDays",fmtNum(Math.floor(h/24)));
  return "\u23F3 " + fmtNum(h) + ":" + fmtNum(m);
}
// Static local kickoff time \u2014 the bigbar is the ONE live countdown; everywhere
// else shows a stable time so the page stays quiet (no per-second reflow).
function fmtKick(iso){
  try{
    var t = new Date(iso).toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit",timeZone:curTz()});
    return "\u{1F552} " + fmtNum(t);
  }catch(e){ return ""; }
}
function keyOf(m){ return (m.id||"")+"|"+((m.status||"")[0]||"")+(m.score?(m.score.home+"-"+m.score.away):"")+m.utcDate; }
function listSig(list){ var s=""; for(var i=0;i<(list||[]).length;i++) s+=keyOf(list[i])+";"; return s; }
// v12.27 (review item 6): the shared SCORE builder \u2014 the winning side's
// number renders as <b> (900 + glow, see .score b), the losing side dims
// (.score .lose); a draw keeps both plain. Used by render() (mrow rows) and
// spotItemNode() (the hero / big-matches / UCL / week boxes) \u2014 one anatomy.
function scoreNode(score){
  var vs = document.createElement("div"); vs.className = "score";
  var h = (score.home==null?0:score.home), a = (score.away==null?0:score.away);
  var hEl = document.createElement(h>a ? "b" : "span"); if(h<a) hEl.className = "lose"; hEl.textContent = fmtNum(score.home);
  var sep = document.createElement("span"); sep.className = "sep"; sep.textContent = " - ";
  var aEl = document.createElement(a>h ? "b" : "span"); if(a<h) aEl.className = "lose"; aEl.textContent = fmtNum(score.away);
  vs.appendChild(hEl); vs.appendChild(sep); vs.appendChild(aEl);
  return vs;
}
// v12.27 (review item 8): bidi isolation for Latin club names. Policy (one
// rule, consistently): names are PERSIAN-FIRST \u2014 the dict, the AI-learned
// cache and the stem fallback translate everything they can; whatever still
// has no Persian rendering falls back to the Latin provider name, and THAT
// run is wrapped in an isolated <bdi dir="ltr"> so dashes/punctuation next
// to embedded Latin text can never flip order inside the RTL paragraph.
// (In EN mode the page itself is LTR \u2014 no wrap needed.)
function nameInto(el, s){
  // v12.x-team-title-tooltip: set the title attribute so hovering a
  // truncated team name shows the full name as a tooltip. The hero
  // card's team names use white-space:nowrap + fluid clamp() font-size
  // (no truncation), but other boxes may truncate long names — the
  // tooltip gives users the full name on hover.
  el.title = s;
  if(curLang()!=="en" && /[A-Za-z]/.test(s) && !/[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF]/.test(s)){
    el.textContent = "";
    var b = document.createElement("bdi"); b.setAttribute("dir","ltr"); b.textContent = s;
    el.appendChild(b);
  } else { el.textContent = s; }
  return el;
}
function render(list, el, finished){
  var sig0 = listSig(list)+"|"+(finished?1:0);
  if(el.dataset.sig===sig0) return;
  el.dataset.sig=sig0;
  if(el.childElementCount) el.classList.add("stable");
  el.innerHTML = "";
  if(!list || !list.length){ el.innerHTML = "<div class='empty'>"+T("noMatches")+"</div>"; return; }
  list.forEach(function(m, idx){
    var row = document.createElement("div"); row.className = "match";
    if(m.derby) row.className += " derby";
    row.style.setProperty("--i", idx);
    var h = logo(m.homeTeam), a = logo(m.awayTeam);
    var en = curLang()==="en";
    var hName = document.createElement("div"); hName.className = "team"; nameInto(hName, en ? m.homeTeam.name : (m.homeTeam.faName || m.homeTeam.name));
    var aName = document.createElement("div"); aName.className = "team"; nameInto(aName, en ? m.awayTeam.name : (m.awayTeam.faName || m.awayTeam.name));
    var hs = document.createElement("div"); hs.className = "side"; hs.appendChild(h); hs.appendChild(hName);
    var as = document.createElement("div"); as.className = "side away"; as.appendChild(aName); as.appendChild(a);
    var live = !finished && (m.status==="LIVE"||m.status==="IN_PLAY"||m.status=="PAUSED");
    if((finished || live) && m.score && m.score.home !== null){
      var vs = scoreNode(m.score);
      row.appendChild(hs); row.appendChild(vs); row.appendChild(as);
    } else {
      // v12.25: every unplayed row's center slot carries its kickoff TIME \u2014
      // the same x line the score takes on played rows (one aligned system).
      var kt = document.createElement("div"); kt.className = "kick";
      var kc = document.createElement("span"); kc.className = "countdown"; kc.textContent = fmtKick(m.utcDate);
      kt.appendChild(kc);
      row.appendChild(hs); row.appendChild(kt); row.appendChild(as);
    }
    var info = document.createElement("div"); info.className = "info";
    var c = document.createElement("span"); c.className = "comp";
    if(m.competition.emblem){
      var cimg = document.createElement("img"); cimg.className = "complogo"; cimg.src = m.competition.emblem; cimg.alt = ""; cimg.loading = "lazy"; cimg.decoding = "async";
      cimg.onerror = function(){ this.remove(); };
      c.appendChild(cimg);
    }
    c.appendChild(document.createTextNode(compName(m)));
    info.appendChild(c);
    if(m.derby){ var db = document.createElement("span"); db.className = "derbybadge"; db.textContent = T("derby"); info.appendChild(db); }
    if(m.top){ var tb = document.createElement("span"); tb.className = "topbadge"; tb.textContent = "\u{1F3C6} " + T("topBadge"); info.appendChild(tb); }
    info.appendChild(document.createTextNode(fmtDate(m.utcDate)));
    if(live){
      var chip = document.createElement("span"); chip.className = "livechip";
      var lottie = document.createElement("dotlottie-player"); lottie.className = "live-lottie"; lottie.setAttribute("src","/Live.lottie"); lottie.setAttribute("autoplay",""); lottie.setAttribute("loop",""); lottie.setAttribute("background","transparent");
      chip.appendChild(lottie);
      info.appendChild(chip);
      if(m.minute != null){
        var lmin = document.createElement("span"); lmin.className = "lmin"; lmin.textContent = fmtNum(m.minute) + "\u02B9";
        info.appendChild(lmin);
      }
    }
    // v12.25: no kickoff-time chip in the info line anymore \u2014 the time rides
    // the row's CENTER slot (.kick) between its own two teams.
    if(live && m.scorers && m.scorers.length){
      var sc = document.createElement("div"); sc.className = "scorers";
      m.scorers.forEach(function(s){
        var row = document.createElement("div"); row.className = "srow";
        var icon = s.type==="PENALTY" ? "\u{1F3AF}" : (s.type==="OWN_GOAL" ? "\u{1F945}" : "\u26BD");
        var lbl = s.type==="PENALTY" ? T("pen") : (s.type==="OWN_GOAL" ? T("own") : "");
        row.textContent = icon + " " + fmtNum(s.minute) + "\u02B9 ";
        // v12.27 (review item 8): player names are Latin provider strings \u2014
        // the same isolated <bdi dir="ltr"> wrap the club names get.
        if(s.scorer){ var sb = document.createElement("bdi"); sb.setAttribute("dir","ltr"); sb.textContent = s.scorer; row.appendChild(sb); }
        if(lbl) row.appendChild(document.createTextNode(" (" + lbl + ")"));
        var t = scorerTeam(m, s.team);
        if(t) row.appendChild(document.createTextNode(" \u2014 " + t));
        sc.appendChild(row);
      });
      info.appendChild(sc);
    }
    if(m.venue){ var vn = document.createElement("span"); vn.className = "venue"; vn.textContent = "\u{1F3DF}\uFE0F " + m.venue; info.appendChild(vn); }
    // v12.23: the stray re-append of hs/vs/as that sat here is REMOVED \u2014 it
    // re-ordered the row's children after the fact on scored rows and
    // CRASHED the whole render on any unscored row (appendChild(undefined)),
    // dragging the page's data down with it through load()'s catch. The row
    // was already fully assembled at the score branch above.
    // v12.31: the share \u22EF no longer rides the info line (it pushed the
    // centered chips off-center) \u2014 it is the box's top inline-end corner.
    var sr = shareRow(m, finished);
    var wrap = document.createElement("div"); wrap.className = "mrow"; wrap.appendChild(row); wrap.appendChild(info); wrap.appendChild(sr);
    el.appendChild(wrap);
  });
}
async function load(){
  // v12.56: show loading animation on all card content areas while fetching
  var loadingIds = ["topSpot","uclSpot","weekBox","standings","cups","finished","liveMatches","ucl"];
  if(!DATA.upcoming.length){ loadingIds.forEach(function(id){ var el = document.getElementById(id); if(el){ el.classList.add("card-loading"); addLoadingLottie(el); } }); }
  try{
    var r = await fetch("/api/public-matches");
    if(!r.ok) throw new Error("HTTP " + r.status);
    var d = await r.json();
    DATA = { upcoming: d.upcoming || [], finished: d.finished || [], nextBig: d.nextBig || null, topSpot: d.topSpot || null, thisWeek: d.thisWeek || [], nextWeek: d.nextWeek || [], standings: d.standings || null, cups: d.cups || null, ucl: d.ucl || null, cached: !!d.cached, cachedAt: d.cachedAt || null };
    SYNC_TS = d.fetchedAt ? new Date(d.fetchedAt).getTime() : (d.cachedAt ? new Date(d.cachedAt).getTime() : Date.now());
    applyView();
    updateBigBar();
    renderStandings(d.standings);
    renderCups(d.cups);
    renderUcl(d.ucl);
    renderUclSpot(d.ucl);
    renderTopSpot(d.topSpot);
    renderWeek(d.thisWeek, d.nextWeek);
    renderLive();
    renderHeroSpot();
    loadingIds.forEach(function(id){ var el = document.getElementById(id); if(el){ el.classList.remove("card-loading"); removeLoadingLottie(el); } });
  }catch(e){
    ["ucl","standings","cups","finished","liveMatches"].forEach(function(id){
      var el = document.getElementById(id);
      if(el) el.innerHTML = "<div class='empty'>"+T("errLoad")+"</div>";
    });
    renderTopSpot(null);
    renderWeek(null);
    renderHeroSpot();
    loadingIds.forEach(function(id){ var el = document.getElementById(id); if(el){ el.classList.remove("card-loading"); removeLoadingLottie(el); } });
  }
}
// v12.x-loading-lottie: inject a <dotlottie-player> loading animation into
// a container that has the .card-loading class. The animation (loading.lottie,
// a 500x500 Lottie shown at 48x48px) replaces the old CSS border spinner.
// Idempotent — if the player is already present, no-op. removeLoadingLottie
// cleans up after the data arrives.
function addLoadingLottie(el){
  if(!el || el.querySelector("dotlottie-player.loading-lottie")) return;
  var p = document.createElement("dotlottie-player");
  p.className = "loading-lottie";
  p.setAttribute("src","/loading.lottie");
  p.setAttribute("autoplay","");
  p.setAttribute("loop","");
  p.setAttribute("background","transparent");
  p.setAttribute("aria-hidden","true");
  el.appendChild(p);
}
function removeLoadingLottie(el){
  if(!el) return;
  var p = el.querySelector("dotlottie-player.loading-lottie");
  if(p) p.remove();
}
var DATA = { upcoming: [], finished: [], nextBig: null, topSpot: null, thisWeek: [], nextWeek: [], standings: null, cups: null, cached: false, cachedAt: null };
var FLAGS = { PL: "\u{1F3F4}", PD: "\u{1F1EA}\u{1F1F8}", SA: "\u{1F1EE}\u{1F1F9}", FL1: "\u{1F1EB}\u{1F1F7}", BL1: "\u{1F1E9}\u{1F1EA}", PGL: "\u{1F1EE}\u{1F1F7}" };
// v12.19 (the user's ask): the timezone controls no longer squat in the
// topbar \u2014 ONE settings-gear button next to the theme toggle opens this
// popover. Pick a zone (times re-render instantly), click the \u2715, the gear
// again, outside, or press Esc to close.
function toggleTz(){
  var p = document.getElementById("tzpanel"), b = document.getElementById("sbtn");
  if(!p || !b) return;
  var open = !p.classList.contains("open");
  p.classList.toggle("open", open);
  b.setAttribute("aria-expanded", open ? "true" : "false");
  if(open){
    // v12.19: reopening always shows the FULL list \u2014 a stale search filter
    // from the previous visit would otherwise hide every other zone.
    var f = document.getElementById("tzfilter");
    if(f && f.value){ f.value = ""; if(f.oninput) f.oninput(); }
    if(f){ try{ f.focus(); }catch(e){} }
  }
}
function closeTz(){
  var p = document.getElementById("tzpanel"), b = document.getElementById("sbtn");
  if(p) p.classList.remove("open");
  if(b) b.setAttribute("aria-expanded", "false");
}
document.addEventListener("mousedown", function(ev){
  var p = document.getElementById("tzpanel");
  if(!p || !p.classList.contains("open")) return;
  var t = ev.target, inside = false;
  while(t){ if(t === p || t.id === "sbtn"){ inside = true; break; } t = t.parentNode; }
  if(!inside) closeTz();
});
document.addEventListener("keydown", function(ev){ if((ev.key || "") === "Escape") closeTz(); });
function tzGroupLabel(g){
  if(curLang() === "fa"){
    if(g === "Etc") return "\u231A \u0622\u0641\u0633\u062A\u200C\u0647\u0627\u06CC \u062B\u0627\u0628\u062A GMT";
    if(g === "General") return "\u0639\u0645\u0648\u0645\u06CC";
    return FA_TZ_REGION[g.toLowerCase()] || g;
  }
  if(g === "Etc") return "Fixed GMT offsets";
  if(g === "General") return "General";
  return g;
}
function initTz(){
  var sel = document.getElementById("tzsel");
  if(!sel) return;
  if(!TZ_ALL.length) TZ_ALL = buildTzAll();
  var filter = document.getElementById("tzfilter");
  var gear = document.getElementById("sbtn");
  if(gear){ gear.title = T("tzBtn"); gear.setAttribute("aria-label", T("tzBtn")); }
  var cb = document.getElementById("tzclose");
  if(cb){ cb.title = T("tzClose"); cb.setAttribute("aria-label", T("tzClose")); }
  if(filter) filter.setAttribute("aria-label", T("tzSearch"));
  sel.title = T("tzBtn");
  var render = function(){
    var l = curLang();
    var q = (filter && filter.value || "").trim().toLowerCase();
    sel.innerHTML = "";
    var addGroup = function(label, zones){
      var og = document.createElement("optgroup"); og.label = label;
      zones.forEach(function(tz){
        var inf = tzInfo(tz);
        var lbl = l === "fa" ? inf.fa : inf.en;
        if(q){
          // v12.19: the search matches BOTH scripts \u2014 \xAB\u062A\u0647\u0631\u0627\u0646\xBB, "tehran"
          // and "3:30" all find Asia/Tehran.
          var other = (l === "fa" ? inf.en : inf.fa).toLowerCase();
          if(lbl.toLowerCase().indexOf(q) < 0 && other.indexOf(q) < 0 && inf.value.indexOf(q) < 0) return;
        }
        var o = document.createElement("option"); o.value = tz; o.textContent = lbl;
        og.appendChild(o);
      });
      if(og.children.length) sel.appendChild(og);
    };
    // v12.19: the \u2B50 popular group pins Tehran/Dubai/London... at the very
    // top \u2014 the user could not find Tehran +3:30 buried deep in Asia.
    addGroup(l === "fa" ? "\u2B50 \u067E\u0631\u06A9\u0627\u0631\u0628\u0631\u062F" : "\u2B50 Popular", TZ_COMMON.filter(function(tz){ return TZ_ALL.indexOf(tz) >= 0; }));
    var groups = {};
    TZ_ALL.forEach(function(tz){
      var g = tz.indexOf("/") > 0 ? tz.split("/")[0] : "General";
      (groups[g] = groups[g] || []).push(tz);
    });
    var keys = Object.keys(groups).sort().filter(function(g){ return g !== "Etc" && g !== "General"; });
    if(groups.General) keys.push("General");
    if(groups.Etc) keys.push("Etc");
    keys.forEach(function(g){ addGroup(tzGroupLabel(g), groups[g]); });
    try{ sel.value = curTz(); }catch(e){}
    // v12.x-tz-search-fix: when the filter narrows results, the <select>
    // defaults to a dropdown (size=1) which shows BLANK if curTz() isn't
    // in the filtered list (the user typed 'sydney' but the select shows
    // nothing — they have to click the arrow to see the 1 result). Fix:
    // (1) if the current selection is empty (curTz not in filtered list),
    //     default to the first option so the user immediately sees a result.
    // (2) switch the select to a LISTBOX (size>1) when filtered so ALL
    //     results are visible without clicking the dropdown arrow. When
    //     no filter, keep it a compact dropdown (size=1) so the full 458-
    //     option list doesn't dominate the panel. The listbox size scales
    //     with result count (min 1, max 8 rows).
    if(!sel.value && sel.options.length){ sel.value = sel.options[0].value; }
    var n = sel.options.length;
    sel.size = q ? Math.min(Math.max(n, 1), 8) : 1;
  };
  render();
  if(filter) filter.oninput = render;
  sel.onchange = function(){
    try{ localStorage.setItem("ucl_tz", sel.value); }catch(e){}
    rerenderAll();
    closeTz();
  };
}
function rerenderAll(){
  applyView();
  renderStandings(DATA.standings);
  renderCups(DATA.cups);
  renderUcl(DATA.ucl);
  renderUclSpot(DATA.ucl);
  renderTopSpot(DATA.topSpot);
  renderWeek(DATA.thisWeek, DATA.nextWeek);
  renderHeroSpot();
  updateBigBar();
}
// v12.18: language switch re-renders the two cards whose dynamic titles/names
// trText() would otherwise clobber (the week card's \xAB\u0647\u0641\u062A\u0647 \u0628\u0639\u062F\xBB header and the
// UCL table's language-dependent names). v12.19: it also rebuilds the timezone
// popover options \u2014 labels swap between \xAB\u0622\u0633\u06CC\u0627/\u062A\u0647\u0631\u0627\u0646 \u06AF\u0631\u06CC\u0646\u0648\u06CC\u0686+\u06F3:\u06F3\u06F0\xBB and
// "Asia/Tehran GMT+3:30".
var onLang = function(){ renderWeek(DATA.thisWeek, DATA.nextWeek); renderUcl(DATA.ucl); renderHeroSpot(); renderTopSpot(DATA.topSpot); renderLive(); renderFinished(true); initTz(); };
// v12.12: catOf/renderSections (and the CAT_CUPS table) are retired \u2014 they
// fed the \xAB\u{1F4C5} \u0645\u0633\u0627\u0628\u0642\u0627\u062A \u067E\u06CC\u0634\u200C\u0631\u0648\xBB sections list, which is gone together with the
// view toggle (the page is always big-only now; the hero + the topspot box
// + the UCL box ARE the presentation).
function matchKey(m){ return String(m.id||"") + "|" + m.utcDate; }
// v12.12: the view toggle is RETIRED \u2014 the page is permanently big-only
// (\xAB\u0641\u0642\u0637 \u0628\u0627\u0632\u06CC\u200C\u0647\u0627\u06CC \u0628\u0632\u0631\u06AF\xBB, the user's default). The \xAB\u{1F4C5} \u0645\u0633\u0627\u0628\u0642\u0627\u062A \u067E\u06CC\u0634\u200C\u0631\u0648\xBB list
// card is retired with it: the hero card, the topspot box and the UCL box
// ARE the upcoming presentation. All that remains of the old per-view
// rendering is the finished card \u2014 the week's selected-team results.
// v12.32 (the user's ask): "for showing recent result, show the last 5, and
// add a 'more' button that shows the latest 20 match results (do it in pc
// as well)" \u2014 the finished card renders the latest FIVE by default with a
// pill expander under the rows; one tap \u2192 the latest TWENTY (the server
// cap, raised 12 \u2192 20 this release), the pill flips to collapse. PC and
// phones share the behavior. force=true clears render()'s signature so a
// language switch rebuilds the rows + the pill in the new locale.
var FIN_EXPANDED = false;
var FIN_MIN = 5, FIN_MAX = 20;
// v12.42-livesection: renderLive — filters DATA.upcoming for live matches
// (LIVE/IN_PLAY/PAUSED) and renders them in the #liveCard. The card auto-hides
// (display:none) when no matches are live; shows up to 20 live matches.
// Matches stay here as long as the match status is live. Uses spotItemNode
// (same anatomy as every other match row on the page) with finished:true
// so live scores render in the center slot.
function renderLive(){
  var card = document.getElementById("liveCard"), el = document.getElementById("liveMatches");
  if(!card || !el) return;
  el.innerHTML = "";
  // v12.x-live-lottie: replace the breathing green dot with the Live.lottie
  // animation (a pulsing "LIVE" badge). The <dotlottie-player> is injected
  // once per renderLive call (removed if already present from a previous
  // call). The h2 text node keeps the "مسابقات زنده" heading (the 🔴 emoji
  // is stripped). The Lottie animation replaces the .live-breath CSS dot.
  var h2 = card.querySelector("h2");
  if(h2){
    var oldBreath = h2.querySelector(".live-breath");
    if(oldBreath) oldBreath.remove();
    var oldLottie = h2.querySelector("dotlottie-player.live-lottie");
    if(oldLottie) oldLottie.remove();
    var lottie = document.createElement("dotlottie-player"); lottie.className = "live-lottie"; lottie.setAttribute("src","/Live.lottie"); lottie.setAttribute("autoplay",""); lottie.setAttribute("loop",""); lottie.setAttribute("background","transparent"); lottie.setAttribute("aria-hidden","true");
    h2.insertBefore(lottie, h2.firstChild);
    // Strip the 🔴 emoji from the text node (the data-i="hLive" i18n string starts with 🔴)
    h2.childNodes.forEach(function(n){ if(n.nodeType === 3 && n.textContent.indexOf("\u{1F534}") !== -1) n.textContent = n.textContent.replace(/\u{1F534}\s*/g, ""); });
  }
  var live = (DATA.upcoming || []).filter(function(m){ return m.status==="LIVE"||m.status==="IN_PLAY"||m.status==="PAUSED"; });
  if(!live.length){ card.style.display = "none"; return; }
  card.style.display = "";
  live.sort(function(a, b){ return (a.minute||0) - (b.minute||0) || new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime(); });
  live.slice(0, 20).forEach(function(m, idx){ el.appendChild(spotItemNode(m, idx, { finished: true, isLiveCard: true })); });
}
function renderFinished(force){
  var el = document.getElementById("finished"); if(!el) return;
  var list = DATA.finished.filter(function(m){ return m.big || m.top || m.clash || m.sel; });
  if(force) delete el.dataset.sig;
  render(list.slice(0, FIN_EXPANDED ? FIN_MAX : FIN_MIN), el, true);
  var old = el.querySelector(".finmore");
  if(old) old.remove();
  if(list.length > FIN_MIN){
    var b = document.createElement("button");
    b.className = "finmore"; b.type = "button";
    b.textContent = FIN_EXPANDED ? T("lessResults") : T("moreResults");
    b.setAttribute("aria-expanded", FIN_EXPANDED ? "true" : "false");
    b.onclick = function(){ FIN_EXPANDED = !FIN_EXPANDED; renderFinished(false); };
    el.appendChild(b);
  }
}
function applyView(){
  renderFinished(false);
}
// v12.10: renderSpecial removed \u2014 the far nextBig fallback card now lives
// in the HERO CARD at the very top (stuck to its countdown bar), not at the
// head of the upcoming list.
function compOf(c){ if(!c) return ""; return curLang()==="en" ? c.name : (c.faName||c.name); }
function firstMatchOf(code){
  var best = null;
  if(!DATA || !DATA.upcoming) return best;
  DATA.upcoming.forEach(function(m){
    if(m.competition && m.competition.code === code && m.status !== "FINISHED" && (!best || m.utcDate < best.utcDate)) best = m;
  });
  return best;
}
function renderStandings(d){
  var el = document.getElementById("standings"); if(!el) return;
  el.innerHTML = "";
  if(!d) return;
  var grid = document.createElement("div"); grid.className = "grid4";
  // v12.5: PGL joins the grid \u2014 the Iran card's table moved here.
  // v12.12: A-League (AL) removed (the user's ask) \u2014 six boxes remain.
  ["PL","PD","SA","FL1","BL1","PGL"].forEach(function(code){
    var st = d[code], box = document.createElement("div"); box.className = "stbox";
    var h = document.createElement("div"); h.className = "stbox-head";
    // v12.36-enfix: the country-flag emoji prefix (FLAGS[code] + " ") is RETIRED
    // — the user's ask. In English mode the flag emoji rendered as "EN"/"ES"/
    // "IT"/"FR" grey text labels (font fallback) before the league emblem
    // image, which the user found noisy. The league emblem image alone is the
    // brand mark now, bumped ~25% (16px → 20px via .stbox-head img above).
    if(st && st.emblem){ var img = document.createElement("img"); img.src = st.emblem; img.alt = ""; img.onerror = function(){ this.remove(); }; h.appendChild(img); }
    h.appendChild(document.createTextNode(compOf(st) || code));
    if(st && st.started === false){
      var first = firstMatchOf(code);
      var ov = document.createElement("div"); ov.className = "stnot-overlay";
      var l = document.createElement("div"); l.className = "stnot-ovl-label"; l.textContent = T("stNot");
      ov.appendChild(l);
      if(first){
        var trow = document.createElement("div"); trow.className = "stnot-ovl-timer";
        trow.appendChild(document.createTextNode(curLang()==="en" ? "First match: " : "\u0627\u0648\u0644\u06CC\u0646 \u0628\u0627\u0632\u06CC: "));
        trow.appendChild(document.createTextNode(fmtKick(first.utcDate)));
        ov.appendChild(trow);
      }
      box.appendChild(ov);
    }
    box.appendChild(h);
    if(st && st.teams && st.teams.length){
      // v12.27 (review item 4): the compact grid's Pts COLUMN HEADER \u2014 \xAB\u0627\u0645\u062A\u06CC\u0627\u0632\xBB
      // (T("thPts"), "Pts" in EN) rides its own header row over the numbers,
      // exactly like the full UCL table labels every column.
      var th = document.createElement("div"); th.className = "sthead";
      var thf = document.createElement("span"); thf.className = "sthead-fill";
      var thp = document.createElement("span"); thp.className = "sthead-p"; thp.textContent = T("thPts");
      th.appendChild(thf); th.appendChild(thp); box.appendChild(th);
      st.teams.forEach(function(t){
        var r = document.createElement("div"); r.className = "strow" + (t.pos===1 ? " top1" : "");
        var p = document.createElement("span"); p.className = "stpos" + (t.pos<=3 ? " top3" : ""); p.textContent = fmtNum(t.pos);
        var n = document.createElement("span"); n.className = "stname"; nameInto(n, curLang()==="en" ? t.name : (t.faName||t.name));
        var pt = document.createElement("span"); pt.className = "stpts"; pt.textContent = fmtNum(t.points);
        r.appendChild(p); r.appendChild(n); r.appendChild(pt);
        box.appendChild(r);
      });
    } else {
      var e = document.createElement("div"); e.className = "stempty"; e.textContent = T("stEmpty");
      box.appendChild(e);
    }
    grid.appendChild(box);
  });
  el.appendChild(grid);
}
function cupBox(c){
  var box = document.createElement("div"); box.className = "cupbox";
  var h = document.createElement("div"); h.className = "cupbox-head";
  if(c.emblem){ var img = document.createElement("img"); img.src = c.emblem; img.alt=""; img.onerror = function(){ this.remove(); }; h.appendChild(img); }
  h.appendChild(document.createTextNode(compOf(c) + (c.qualifying ? (curLang()==="en" ? " (Qualifying)" : " (\u0645\u0642\u062F\u0645\u0627\u062A\u06CC)") : "")));
  var tierEm = c.tier === "gold" ? "\u{1F947} " : c.tier === "silver" ? "\u{1F948} " : c.tier === "bronze" ? "\u{1F949} " : "";
  h.appendChild(document.createTextNode(tierEm));
  box.appendChild(h);
  if(c.next){
    var n = c.next, en = curLang()==="en";
    var m = document.createElement("div"); m.className = "cupmatch";
    var teams = document.createElement("div"); teams.className = "teams";
    var t1 = document.createElement("span"); nameInto(t1, en ? n.homeTeam.name : (n.homeTeam.faName||n.homeTeam.name)); teams.appendChild(t1);
    teams.appendChild(document.createTextNode(" \u2013 "));
    var t2 = document.createElement("span"); nameInto(t2, en ? n.awayTeam.name : (n.awayTeam.faName||n.awayTeam.name)); teams.appendChild(t2);
    m.appendChild(teams);
    var live = n.status==="LIVE"||n.status==="IN_PLAY"||n.status==="PAUSED";
    var dt = document.createElement("div"); dt.className = "cupdate";
    if(live){ var sp = document.createElement("span"); sp.className = "live-tag"; sp.textContent = "\u{1F534} "+T("live"); dt.appendChild(sp); }
    else dt.appendChild(document.createTextNode(fmtDate(n.utcDate)));
    m.appendChild(dt);
    box.appendChild(m);
  } else {
    var e = document.createElement("div"); e.className = "stempty"; e.textContent = T("cupsNone");
    box.appendChild(e);
  }
  return box;
}
function renderCups(d){
  var el = document.getElementById("cups"); if(!el) return;
  el.innerHTML = "";
  if(!d || !d.length){ el.innerHTML = "<div class='empty'>"+T("cupsNone")+"</div>"; return; }
  // UEFA hierarchy: CL/EL/ECL are continental European LEAGUES (not knockout
  // cups) \u2014 one group; international cups (WC/Euro/...) another; per-country
  // elimination cups last.
  var euro = [], intl = [], dom = {};
  d.forEach(function(c){
    if(c.code === "CL" || c.code === "EL" || c.code === "ECL") euro.push(c);
    else if(c.tier === "gold") intl.push(c);
    else { (dom[c.country||""] = dom[c.country||""] || []).push(c); }
  });
  var groups = [];
  if(euro.length) groups.push({ title: T("tierEurope"), items: euro });
  if(intl.length) groups.push({ title: T("intlCups"), items: intl });
  var countryKey = { EN: "cEN", ES: "cES", IT: "cIT", DE: "cDE", IR: "cIR" };
  // v12.6: Iran closes the country groups \u2014 \u062C\u0627\u0645 \u062D\u0630\u0641\u06CC \u0627\u06CC\u0631\u0627\u0646 lives here now
  // (the old Iran card's Hazfi box, reborn inside the cups grid).
  // v12.x-dfb-pokal: added Germany (DE) between Italy and Iran.
  ["EN","ES","IT","DE","IR"].forEach(function(cc){ if(dom[cc]) groups.push({ title: T(countryKey[cc]), items: dom[cc] }); });
  var frag = document.createElement("div");
  groups.forEach(function(g){
    var t = document.createElement("div"); t.className = "cupgroup-title"; t.textContent = g.title;
    frag.appendChild(t);
    var grid = document.createElement("div"); grid.className = "cupgrid";
    g.items.forEach(function(c){ grid.appendChild(cupBox(c)); });
    frag.appendChild(grid);
  });
  el.appendChild(frag);
}
// Dedicated UCL box: upcoming CL fixtures + the FULL league table (36-team
// Swiss-model standings, not truncated). v12.16: the table is COMPLETE \u2014
// every row carries matches played, wins, draws, losses and goal difference
// next to the points (the user's ask), with a sticky header row.
function renderUcl(d){
  var el = document.getElementById("ucl"); if(!el) return;
  el.innerHTML = "";
  if(!d){ el.innerHTML = "<div class='empty'>"+T("errLoad")+"</div>"; return; }
  // v12.35-uclfix: the matchday chip now lives INSIDE the h2.uclh2 (same row
  // as the title), not in a separate .ucl-head div below. The UCL emblem
  // image is retired (the starball SVG in the h2 is the UCL brand mark).
  // Append the matchday span to the existing h2 element (already in the
  // DOM with the starball + "UEFA Champions League" title). Remove any
  // previous matchday chip first (renderUcl runs on every language switch).
  // Use querySelector for robustness (previousElementSibling had a timing
  // issue on the initial page load).
  var h2ucl = document.querySelector("#uclCard h2.uclh2");
  if(h2ucl){
    var oldMd3 = h2ucl.querySelector(".ucl-md");
    if(oldMd3) oldMd3.remove();
    if(d.matchday){
      var md2 = document.createElement("span"); md2.className="ucl-md";
      md2.textContent = (curLang()==="en"?"Matchday ":"\u0647\u0641\u062A\u0647 ")+fmtNum(d.matchday);
      h2ucl.appendChild(md2);
    }
  }
  // v12.12: the all-fixtures list is GONE from this card (Sabah FK vs SK
  // Slavia Praha noise) \u2014 upcoming CL fixtures live in the uclspot box above
  // (\u22651 selected club, up to 8). This card is standings-only now.
  var wrap = document.createElement("div"); wrap.className = "ucl-stand-wrap";
  var st = document.createElement("div"); st.className = "ucl-stand";
  if(d.started === false){
    var ov = document.createElement("div"); ov.className = "stnot-overlay";
    var l = document.createElement("div"); l.className = "stnot-ovl-label"; l.textContent = T("stNot");
    ov.appendChild(l);
    var firstDate = (d.matches && d.matches.length) ? d.matches[0].utcDate : (d.firstStart || null);
    if(firstDate){
      var trow = document.createElement("div"); trow.className = "stnot-ovl-timer";
      trow.appendChild(document.createTextNode(curLang()==="en" ? "First match: " : "\u0627\u0648\u0644\u06CC\u0646 \u0628\u0627\u0632\u06CC: "));
      trow.appendChild(document.createTextNode(fmtKick(firstDate)));
      ov.appendChild(trow);
    }
    wrap.appendChild(ov);
  }
  if(d.teams && d.teams.length){
    // v12.16: header row \u2014 # | team | MP | W | D | L | GF | GA | GD | Pts in
    // the standard league-table order (the W/D/L/GF/GA middle columns fold
    // away on phones, leaving # | team | MP | GD | Pts). Missing stats render
    // as "\u2014" until the standings cache rotates in the new shape.
    var hr = document.createElement("div"); hr.className = "strow uclhead";
    var hpos = document.createElement("span"); hpos.className = "stpos"; hpos.textContent = "#";
    var hname = document.createElement("span"); hname.className = "stname"; hname.textContent = curLang()==="en" ? "Team" : "\u062A\u06CC\u0645";
    var hmp = document.createElement("span"); hmp.className = "stnum"; hmp.textContent = T("thP");
    var hw = document.createElement("span"); hw.className = "stnum ucl-hidem"; hw.textContent = T("thW");
    var hd = document.createElement("span"); hd.className = "stnum ucl-hidem"; hd.textContent = T("thD");
    var hl = document.createElement("span"); hl.className = "stnum ucl-hidem"; hl.textContent = T("thL");
    var hgf = document.createElement("span"); hgf.className = "stnum ucl-hidem"; hgf.textContent = T("thGF");
    var hga = document.createElement("span"); hga.className = "stnum ucl-hidem"; hga.textContent = T("thGA");
    var hgd = document.createElement("span"); hgd.className = "stnum"; hgd.textContent = T("thGD");
    var hpt = document.createElement("span"); hpt.className = "stpts"; hpt.textContent = T("thPts");
    hr.appendChild(hpos); hr.appendChild(hname); hr.appendChild(hmp); hr.appendChild(hw); hr.appendChild(hd); hr.appendChild(hl); hr.appendChild(hgf); hr.appendChild(hga); hr.appendChild(hgd); hr.appendChild(hpt);
    st.appendChild(hr);
    var num = function(v){ return (v == null || isNaN(v)) ? "\u2014" : fmtNum(v); };
    var gdTxt = function(t2){ if(t2.gd == null) return (t2.gf == null || t2.ga == null) ? "\u2014" : fmtNum(t2.gf - t2.ga); return (t2.gd>0?"+":"")+fmtNum(t2.gd); };
    d.teams.forEach(function(t){
      var r = document.createElement("div"); r.className = "strow" + (t.pos===1 ? " top1" : "");
      var p = document.createElement("span"); p.className = "stpos" + (t.pos<=8 ? " top3" : ""); p.textContent = fmtNum(t.pos);
      // v12.18: round club crest before the name (the user's ask) \u2014 resolved
      // server-side against the clubs catalog; rows without one render
      // text-only, exactly as before.
      var n = document.createElement("span"); n.className = "stname" + (t.crest ? " haslogo" : "");
      if(t.crest){
        var lg = document.createElement("img"); lg.className = "stlogo"; lg.src = t.crest; lg.alt = ""; lg.loading = "lazy"; lg.decoding = "async"; lg.referrerPolicy = "no-referrer";
        lg.onerror = function(){ this.remove(); n.classList.remove("haslogo"); };
        n.appendChild(lg);
        var txt = document.createElement("span"); txt.className = "sttxt"; nameInto(txt, curLang()==="en" ? t.name : (t.faName||t.name));
        n.appendChild(txt);
      } else {
        nameInto(n, curLang()==="en" ? t.name : (t.faName||t.name));
      }
      var mp = document.createElement("span"); mp.className = "stnum"; mp.textContent = num(t.played);
      var w = document.createElement("span"); w.className = "stnum ucl-hidem"; w.textContent = num(t.won);
      var dd = document.createElement("span"); dd.className = "stnum ucl-hidem"; dd.textContent = num(t.draw);
      var ll = document.createElement("span"); ll.className = "stnum ucl-hidem"; ll.textContent = num(t.lost);
      var gf = document.createElement("span"); gf.className = "stnum ucl-hidem"; gf.textContent = num(t.gf);
      var ga = document.createElement("span"); ga.className = "stnum ucl-hidem"; ga.textContent = num(t.ga);
      var gd = document.createElement("span"); gd.className = "stnum"; gd.textContent = gdTxt(t);
      var pt = document.createElement("span"); pt.className = "stpts"; pt.textContent = fmtNum(t.points);
      r.appendChild(p); r.appendChild(n); r.appendChild(mp); r.appendChild(w); r.appendChild(dd); r.appendChild(ll); r.appendChild(gf); r.appendChild(ga); r.appendChild(gd); r.appendChild(pt);
      st.appendChild(r);
    });
  } else {
    var e2 = document.createElement("div"); e2.className = "stempty"; e2.textContent = T("stEmpty");
    st.appendChild(e2);
  }
  wrap.appendChild(st);
  el.appendChild(wrap);
}
// v12.12: the UCL box is GENERALIZED (the user's ask) \u2014 up to EIGHT upcoming
// CL fixtures in strict kickoff order (live first; "two important today, two
// important tomorrow"), and ONLY matches with \u22651 SELECTED club: the server
// filters (Sabah FK vs SK Slavia Praha is noise and never boxes). Same
// spotitem anatomy as the topspot box + hero, so the page stays uniform
// (v12.11). Pre-draw: the wait state counts to the projected first kickoff;
// otherwise the card hides when the box is empty.
// v12.21: the UCL pre-draw wait state carries the starball mark \u2014 the same
// inline SVG the headers use (white stars on the navy ball), injected from
// the worker-side const so page and brand stay in lockstep.
var UCL_BALL = ${JSON.stringify(UCL_BALL)};
function renderUclSpot(d){
  var card = document.getElementById("uclSpotCard"), el = document.getElementById("uclSpot");
  if(!el) return;
  el.innerHTML = "";
  var list = (d && d.matches && d.matches.length) ? d.matches.slice(0, 8) : [];
  if(!list.length){
    if(d && d.firstStart){
      if(card) card.style.display = "";
      var fw = document.createElement("div"); fw.className = "uclspot-wait";
      var fb = document.createElement("div"); fb.className = "uclspot-ball"; fb.setAttribute("aria-hidden", "true"); fb.innerHTML = UCL_BALL;
      fw.appendChild(fb);
      var fl = document.createElement("div"); fl.className = "stnot-ovl-label"; fl.textContent = T("stNot");
      fw.appendChild(fl);
      var ft = document.createElement("div"); ft.className = "stnot-ovl-timer";
      ft.appendChild(document.createTextNode(curLang()==="en" ? "First match: " : "\u0627\u0648\u0644\u06CC\u0646 \u0628\u0627\u0632\u06CC: "));
      ft.appendChild(document.createTextNode(fmtKick(d.firstStart)));
      fw.appendChild(ft);
      el.appendChild(fw);
    } else if(card){
      card.style.display = "none";
    }
    return;
  }
  if(card) card.style.display = "";
  list.forEach(function(m, idx){
    // v12.26: noComp \u2014 the box is UCL-dedicated, the per-row league tag is
    // redundant there (the user's ask).
    el.appendChild(spotItemNode(m, idx, {noComp:true}));
  });
}
// v12.3/v12.4/v12.7/v12.8/v12.12 TOP BOX (league): the consolidated
// big-matches card \u2014 up to TEN entries + the hero's slot 1 (the user's ask;
// e.g. the Madrid derby and the Manchester derby in the SAME box). The
// server picks TRUE big matches only (A: two selected teams;
// B: both sides top-3 \u2014 \u0635\u062F\u0631 \u062C\u062F\u0648\u0644; C: derby; fallback: a selected team vs a
// top-5 side of that league) and orders them STRICTLY by kickoff \u2014 live first
// (kickoff in the past), then the closest upcoming on top. v12.10: slot 1 \u2014
// the countdown's own match \u2014 renders in the HERO CARD at the very top (the
// bar and its match stuck together); this box carries the REMAINING entries.
// v12.12: spotItemNode is the shared anatomy of the hero, the topspot box AND
// the generalized UCL box (live score + LIVE chip, BOTH tags \u2014 a fixture that
// is a derby AND a top-of-the-table clash shows both badges). The card hides
// when nothing qualifies; box fixtures are excluded from the upcoming list
// server-side \u2014 this box IS their presentation. Stale KV payloads (\u22645 min)
// may still carry the old single-match shape {next:\u2026} \u2014 accepted for rollout.
function spotItemNode(m, idx, opts){
  var item = document.createElement("div"); item.className = "spotitem";
  // v12.17: \xAB\u062F\u0631 \u0627\u06CC\u0646 \u0647\u0641\u062A\u0647\xBB passes opts.past for games whose kickoff already
  // ran out \u2014 the whole entry renders "turned off" (dimmed, see .spotitem.past)
  // and the time chip swaps to the \xAB\u067E\u0627\u06CC\u0627\u0646\u200C\u06CC\u0627\u0641\u062A\u0647\xBB (expired) state.
  if(opts && opts.past) item.className += " past";
  var row = document.createElement("div"); row.className = "match";
  if(m.derby) row.className += " derby";
  row.style.setProperty("--i", idx);
  var en = curLang()==="en";
  var hName = document.createElement("div"); hName.className = "team"; nameInto(hName, en ? m.homeTeam.name : (m.homeTeam.faName || m.homeTeam.name));
  var aName = document.createElement("div"); aName.className = "team"; nameInto(aName, en ? m.awayTeam.name : (m.awayTeam.faName || m.awayTeam.name));
  var hs = document.createElement("div"); hs.className = "side"; hs.appendChild(logo(m.homeTeam)); hs.appendChild(hName);
  var as = document.createElement("div"); as.className = "side away"; as.appendChild(aName); as.appendChild(logo(m.awayTeam));
  var live = m.status==="LIVE"||m.status==="IN_PLAY"||m.status==="PAUSED";
  // v12.16: opts.finished (the \xAB\u062F\u0631 \u0627\u06CC\u0646 \u0647\u0641\u062A\u0647\xBB agenda) also shows final scores.
  // v12.25: unplayed rows carry the KICKOFF TIME in the center slot (.kick) \u2014
  // "A [match info] B" on the user's sketch \u2014 same x line as the score; the
  // time belongs to ITS teams, inside ITS box, never to the row above/below.
  var done = !!(opts && opts.finished);
  // v12.32 (the user's ask): the HERO (opts.noDate) center slot is a COLUMN
  // now \u2014 the big time chip (or the live score) with the .kickdate run
  // ("weekday day month", fmtHeroDate) UNDER it: "time / date" as ONE
  // stack between the two clubs (the date moved out of the navy bar,
  // #bigbarDate retired). Every other box keeps the plain single-element
  // center slot; their weekday/date line stays in the info row.
  var hero = !!(opts && opts.noDate);
  var kd = null;
  // v12.44-livepolish: for LIVE matches the kickdate is HIDDEN — the date
  // is redundant when the match is playing (the score is what matters).
  // This also fixes the vertical alignment: the score sits centered in the
  // .kick column (no date below it pushing the score up), matching the team
  // name's vertical center.
  if(m.utcDate && !live && !done){ kd = document.createElement("div"); kd.className = "kickdate"; kd.textContent = fmtHeroDate(m.utcDate); }
  if((live || done) && m.score && m.score.home !== null){
    var vs = scoreNode(m.score);
    if(hero){ var kw = document.createElement("div"); kw.className = "kick"; kw.appendChild(vs); if(kd) kw.appendChild(kd); row.appendChild(hs); row.appendChild(kw); row.appendChild(as); }
    else { var kw2 = document.createElement("div"); kw2.className = "kick"; kw2.appendChild(vs); if(kd) kw2.appendChild(kd); row.appendChild(hs); row.appendChild(kw2); row.appendChild(as); }
  } else {
    var kt = document.createElement("div"); kt.className = "kick";
    var kc = document.createElement("span"); kc.className = "countdown"; kc.textContent = fmtKick(m.utcDate);
    kt.appendChild(kc);
    if(kd) kt.appendChild(kd);
    row.appendChild(hs); row.appendChild(kt); row.appendChild(as);
  }
  item.appendChild(row);
  var info = document.createElement("div"); info.className = "uclspot-info";
  // v12.26 (the user's ask): "remove this tag from UCL box \u2026 because it's
  // redundant since that box is already UCL dedicated" \u2014 the competition
  // chip is skipped for the UCL box's rows (opts.noComp): its heading already
  // says \u0644\u06CC\u06AF \u0642\u0647\u0631\u0645\u0627\u0646\u0627\u0646 \u0627\u0631\u0648\u067E\u0627. Every OTHER box (hero, big matches, week) keeps
  // the chip \u2014 there it distinguishes mixed competitions.
  if(!(opts && opts.noComp)){
    var c = document.createElement("span"); c.className = "comp";
    if(m.competition && m.competition.emblem){ var cimg = document.createElement("img"); cimg.className="complogo"; cimg.src=m.competition.emblem; cimg.alt=""; cimg.loading="lazy"; cimg.decoding="async"; cimg.onerror=function(){this.remove();}; c.appendChild(cimg); }
    c.appendChild(document.createTextNode(compName(m)));
    info.appendChild(c);
  }
  // v12.7 tag rule: a match can be BOTH a derby and a top-of-the-table
  // clash \u2014 each badge renders independently, never either/or.
  if(m.derby){ var db = document.createElement("span"); db.className = "derbybadge"; db.textContent = T("derby"); info.appendChild(db); }
  if(m.top){ var tb = document.createElement("span"); tb.className = "topbadge"; tb.textContent = "\u{1F3C6} " + T("topBadge"); info.appendChild(tb); }
  // v12.31→v12.32 (the user's ask): the HERO passes opts.noDate \u2014 its date
  // rides under the big time chip inside the kick column (.kickdate, see
  // the row assembly above), NOT in this info line. Every other box keeps
  // the full weekday/date/time run right here.
  // v12.40-datebelow: the redundant fmtDate text node is RETIRED — the date
  // now rides under the time chip in the kick column (.kickdate) for EVERY
  // spotitem, not just the hero. The info line carries only the competition
  // chip + badges + live/expired chips + venue. No date, no time.
  if(live){
    // v12.44-livepolish: the livechip "در حال برگزاری" is SKIPPED when the
    // spotitem is inside the #liveCard (the card itself is the live section —
    // the chip is redundant). The check uses opts.isLiveCard (passed from
    // renderLive) because item.closest() doesn't work at build time — the
    // element isn't in the DOM yet. For the hero + big-matches + week cards
    // the chip still renders (those cards mix live + upcoming, so the chip
    // distinguishes).
    var inLiveCard = !!(opts && opts.isLiveCard);
    if(!inLiveCard){
      var chip = document.createElement("span"); chip.className = "livechip";
      var lottie = document.createElement("dotlottie-player"); lottie.className = "live-lottie"; lottie.setAttribute("src","/Live.lottie"); lottie.setAttribute("autoplay",""); lottie.setAttribute("loop",""); lottie.setAttribute("background","transparent");
      chip.appendChild(lottie);
      info.appendChild(chip);
    }
    if(m.minute != null){ var lmin = document.createElement("span"); lmin.className = "lmin"; lmin.textContent = fmtNum(m.minute) + "\u02B9"; info.appendChild(lmin); }
  } else if(opts && opts.past){
    // v12.17/v12.25: kickoff passed, no final score yet \u2014 the expired marker
    // (\xAB\u231B \u067E\u0627\u06CC\u0627\u0646\u200C\u06CC\u0627\u0641\u062A\u0647\xBB) stays in the info line; the kickoff TIME itself now
    // rides the row's center slot (v12.25), dimmed with the box it belongs to.
    var cd = document.createElement("span");
    cd.className = "wkdone";
    cd.textContent = "\u231B " + T("wkDone");
    info.appendChild(cd);
  }
  if(m.venue){ var vn = document.createElement("span"); vn.className="venue"; vn.textContent="\u{1F3DF}\uFE0F " + m.venue; info.appendChild(vn); }
  // v12.21: the share control was a full-width row of its own under the
  // entry. v12.31: it left the info chip line (it pushed the centered
  // chips off-center) for the box's top inline-end corner.
  var sr = shareRow(m, false);
  item.appendChild(info);
  item.appendChild(sr);
  return item;
}
// v12.10/v12.11 HERO: renders the countdown's OWN match (barTarget \u2014 box
// top, live entries leading) stuck directly under the countdown bar inside
// the hero card \u2014 the card the bar belongs to. Same spotitem anatomy as the
// box entries so the headline and the box share one visual language.
// v12.11: always a plain "card bighero" \u2014 no golden topspot chrome; the
// countdown's match row looks exactly like every other match row.
// v12.31→v12.32: the hero's entry passes noDate \u2014 its weekday/date line rides
// under the big time chip INSIDE the kick column (not in the navy bar, not
// in the info row).
function renderHeroSpot(){
  var card = document.getElementById("bigHeroCard"), el = document.getElementById("heroSpot");
  if(!card || !el) return;
  el.innerHTML = "";
  card.className = "card bighero";
  var m = barTarget().m;
  heroWm(card, m);
  // v12.32: #bigbarDate is gone \u2014 spotItemNode({noDate:true}) renders the
  // date itself, under the big time chip (.kickdate in the kick column).
  if(m) el.appendChild(spotItemNode(m, 0, {noDate:true}));
}
// v12.23 (the user's ask): the giant faded crests behind the hero stage \u2014
// "the expanded logo of clubs in lower opacity on the background of the
// next big upcoming match". One watermark per club, anchored to its club's
// half; a missing crest hides that side, and the whole layer hides when
// neither club has one (monogram-only fallbacks stay clean, no broken imgs).
function heroWm(card, m){
  var wm = card.querySelector(".hero-wm"); if(!wm) return;
  var imgs = wm.querySelectorAll("img");
  var c0 = m && m.homeTeam && m.homeTeam.crest, c1 = m && m.awayTeam && m.awayTeam.crest;
  [c0, c1].forEach(function(c, i){
    if(c){ imgs[i].src = c; imgs[i].style.display = ""; }
    else { imgs[i].removeAttribute("src"); imgs[i].style.display = "none"; }
  });
  wm.style.display = (c0 || c1) ? "" : "none";
}
function renderTopSpot(d){
  var card = document.getElementById("topspotCard"), el = document.getElementById("topSpot");
  if(!card || !el) return;
  el.innerHTML = "";
  // v12.12: capacity raised \u2014 the server sends up to ELEVEN big matches
  // (the user's ask: the box shows up to TEN after the hero takes slot 1).
  var list = d && d.matches && d.matches.length ? d.matches.slice(0, 11) : (d && d.next ? [d.next] : []);
  // v12.10: slot 1 \u2014 the closest upcoming big match, the countdown's own
  // match \u2014 lives in the HERO CARD above, stuck to the countdown bar; this
  // box presents the REMAINING big matches, separated from the headline.
  var rest = list.slice(1);
  if(!rest.length){ card.style.display = "none"; return; }
  card.style.display = "";
  rest.forEach(function(m, idx){
    el.appendChild(spotItemNode(m, idx + 1));
  });
}
// v12.16: \xAB\u062F\u0631 \u0627\u06CC\u0646 \u0647\u0641\u062A\u0647\xBB \u2014 the current Iranian week's agenda (Saturday\u2192
// Friday): every followed/top-3 game of THIS week, live first; already-played
// games show their final score. Same spotitem anatomy as every other box;
// the card hides when the week has no followed games.
// v12.17: games whose kickoff has PASSED (finished, or the clock ran out
// while no score arrived yet) are rendered "turned off" \u2014 dimmed rows + the
// \xAB\u067E\u0627\u06CC\u0627\u0646\u200C\u06CC\u0627\u0641\u062A\u0647\xBB chip instead of a fresh kickoff time \u2014 so users instantly
// see what's still ahead vs what's expired. Order: live \u2192 upcoming (soonest
// first) \u2192 past (most recent first at the bottom).
// v12.18 (the Friday problem, the user's ask): when the current week has
// NOTHING left ahead \u2014 late Friday, everything kicked off \u2014 a wall of dimmed
// past games is pointless. The card then switches to NEXT week's fixtures
// (header \xAB\u{1F4C5} \u0647\u0641\u062A\u0647 \u0628\u0639\u062F\xBB) so the box always answers "what's coming". Mid-week
// it stays "this week" with the dimmed past games below the upcoming ones.
function weekPast(m){
  if(m.status === "FINISHED") return true;
  if(m.status==="LIVE"||m.status==="IN_PLAY"||m.status==="PAUSED") return false;
  if(!m.utcDate) return false;
  return new Date(m.utcDate).getTime() < Date.now() - 9e4;
}
function renderWeek(list, nextList){
  var card = document.getElementById("weekCard"), el = document.getElementById("weekBox"), title = document.getElementById("weekTitle");
  if(!card || !el) return;
  el.innerHTML = "";
  // v12.45-compact-live: remove LIVE matches from the week card — they have
  // their own dedicated #liveCard now. Only show upcoming not-yet-played
  // (or past-but-not-finished) matches. The week card is "what's ahead".
  var isLive = function(m){ return m.status==="LIVE"||m.status==="IN_PLAY"||m.status==="PAUSED"; };
  var upcomingThis = (list || []).filter(function(m){ return !weekPast(m) && !isLive(m); });
  var mode = "this";
  if(!upcomingThis.length){
    // Nothing left THIS week → show next week's upcoming fixtures instead.
    mode = "next";
    list = (nextList || []).filter(function(m){ return !isLive(m); });
  } else {
    list = upcomingThis;
  }
  if(title) title.textContent = mode === "next" ? T("hWeekNext") : T("hWeek");
  if(!list || !list.length){ card.style.display = "none"; return; }
  card.style.display = "";
  var sorted = list.slice().sort(function(a, b){
    var pa = weekPast(a), pb = weekPast(b);
    if(pa !== pb) return pa ? 1 : -1; // upcoming before past
    var ta = a.utcDate ? new Date(a.utcDate).getTime() : 0, tb = b.utcDate ? new Date(b.utcDate).getTime() : 0;
    return pa ? tb - ta : ta - tb; // past: recent first · upcoming: soonest first
  });
  sorted.forEach(function(m, idx){
    el.appendChild(spotItemNode(m, idx, { finished: m.status === "FINISHED", past: mode === "this" && weekPast(m) }));
  });
}
// v12.5: renderIran/initIran/toggleIran removed \u2014 the Iran card is retired
// and the PGL table renders through renderStandings like every other league.
// v12.12: setView is retired with the view toggle \u2014 the page is always
// big-only (a stored ucl_view preference is ignored and never re-read).
function scorerTeam(m, teamName){
  if(!teamName) return "";
  var en = curLang()==="en";
  var norm = function(s){ return String(s||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036F]/g,"").replace(/\b(fc|cf|sc|ac|as|ssc|bc|ud|cd|kv|jc)\b/g," ").replace(/[^a-z0-9]/g,""); };
  var t = norm(teamName);
  if(t && t===norm(m.homeTeam.name)) return en ? m.homeTeam.name : (m.homeTeam.faName || m.homeTeam.name);
  if(t && t===norm(m.awayTeam.name)) return en ? m.awayTeam.name : (m.awayTeam.faName || m.awayTeam.name);
  return "";
}
function fmtCountdown(ms){
  ms = Math.max(0, ms|0);
  var en = curLang()==="en";
  var d = Math.floor(ms/864e5), h = Math.floor(ms%864e5/36e5), m = Math.floor(ms%36e5/6e4), s = Math.floor(ms%6e4/1e3);
  if(ms <= 0) return T("soon");
  // v12.x-countdown-words (the user's ask): show the countdown in full
  // words instead of HH:MM:SS — e.g. '۱۴ ساعت و ۱۵ دقیقه و ۴۸ ثانیه'
  // (fa) / '14 hours 15 minutes 48 seconds' (en). Each non-zero unit is
  // shown with its full name + the Persian connector between units.
  // English uses a space-separated style. Zero units are skipped.
  var andWord = en ? " " : " \u0648 ";
  var parts = [];
  if(d) parts.push(fmtNum(d) + " " + T("uDay"));
  if(h) parts.push(fmtNum(h) + " " + T("uHour"));
  if(m) parts.push(fmtNum(m) + " " + T("uMin"));
  if(s) parts.push(fmtNum(s) + " " + T("uSec"));
  if(parts.length === 0) return T("soon");
  if(en){ return parts.join(" "); } else { return parts.join(andWord); }
}
// v12.10: the ONE pick the countdown bar AND the hero card agree on \u2014 box
// top (closest upcoming big match; live entries lead) \u2192 far nextBig \u2192
// nearest big upcoming \u2192 plain upcoming[0]. renderHeroSpot renders exactly
// this match stuck under the bar, so the countdown can never point at a
// card rendered somewhere else on the page.
function barTarget(){
  var ts = DATA.topSpot || null;
  var boxTop = ts ? ((ts.matches && ts.matches.length ? ts.matches[0] : null) || ts.next) : null;
  var next = boxTop || DATA.nextBig || null, i;
  if(!next){ for(i=0;i<DATA.upcoming.length;i++){ if(DATA.upcoming[i].big){ next = DATA.upcoming[i]; break; } } }
  var isBig = !!next;
  if(!next) next = DATA.upcoming[0] || null;
  return { m: next, big: isBig };
}
function updateBigBar(){
  var card = document.getElementById("bigHeroCard"), fill = document.getElementById("bigbarFill"),
      lbl = document.getElementById("bigbarLabel"), clk = document.getElementById("bigbarClock"),
      pct = document.getElementById("bigbarPct"), tr = document.getElementById("bigbarTrack");
  if(!card||!fill||!lbl||!clk) return;
  // v12.8/v12.10: the countdown belongs to the match on TOP of the big
  // matches presentation \u2014 the hero card right under this bar (box top,
  // kickoff-sorted, so the closest upcoming big match; live entries lead,
  // kickoff in the past). Stale KV (\u22643 min) may still carry the legacy
  // single-match shape {next:\u2026}.
  var t = barTarget(), next = t.m;
  if(!next){
    lbl.textContent = ""; clk.textContent = "--:--:--";
    if(pct) pct.textContent = "";
    fill.className = "bigbar-fill idle";
    if(tr) tr.setAttribute("aria-valuenow", "0");
    card.style.display = ""; card.dataset.urgent = "far"; return;
  }
  var isBig = t.big;
  var kick = new Date(next.utcDate).getTime(), rem = kick - Date.now(),
      live = next.status==="LIVE"||next.status==="IN_PLAY"||next.status==="PAUSED"||rem<=0;
  // v12.22 (the user's ask): the hero ESCALATES as kickoff nears \u2014 far (calm
  // emerald breathing) \u2192 soon (\u226424h: amber, faster heartbeat, amber embers)
  // \u2192 final (\u226460min: red alarm heartbeat, pulsing label, red embers) \u2192 live
  // (the red stage around the live bar). One data-urgent attribute drives the
  // whole CSS intensity ladder; it only flips when the mode actually changes.
  var urgent = live ? "live" : (rem <= 36e5 ? "final" : (rem <= 864e5 ? "soon" : "far"));
  if(card.dataset.urgent !== urgent) card.dataset.urgent = urgent;
  // v12.27 (review item 1): the wrapper carries the same data-urgent \u2014 its
  // ::before owns the OUTER heartbeat aura now, so the escalation ladder's
  // color + speed keep driving both pseudo-elements.
  var hw = card.parentNode;
  if(hw && hw.classList && hw.classList.contains("herowrap") && hw.dataset.urgent !== urgent) hw.dataset.urgent = urgent;
  // v12.50: the label text is removed — the countdown is enough (the user's
  // ask: 'remove this text ⚽ ⚡ تا بازی بزرگ بعدی, the countdown is enough').
  // The bigbar-top now shows only the clock + percentage, no label.
  lbl.textContent = "";
  // v12.24: the percent chip speaks the bar's BASE \u2014 100% at kickoff/live.
  var pctTxt = function(v){ return fmtNum(v) + (curLang()==="en" ? "%" : "\u066A"); };
  if(live){
    fill.className = "bigbar-fill live"; fill.style.width = "100%";
    clk.textContent = "-:--:--";
    var liveSuffix = curLang()==="en" ? "/24h" : "/\u06F2\u06F4";
    if(pct) pct.textContent = pctTxt(100) + liveSuffix;
    if(tr){ tr.setAttribute("aria-valuenow", "100"); if(tr.getAttribute("title") !== T("barBase")) tr.setAttribute("title", T("barBase")); }
  }else{
    // v12.38-hero: Fix 1 — the progress bar + percentage now track the FINAL
    // 24 HOURS before kickoff (was 14 days). Both the fill and the countdown
    // clock now reference the same 24h window, so the fill level and the
    // remaining time always agree. Before 24h the bar reads 0% (idle); at
    // kickoff 100%. The percentage badge carries a visible "۲۴" / "24h"
    // suffix so the period is never ambiguous (an unlabeled percentage with
    // no visible total reads as broken even when the math is correct).
    var q = 1 - rem/(24*36e5);
    if(q<0) q=0; if(q>1) q=1;
    fill.className = "bigbar-fill";
    fill.style.width = Math.max(2, Math.round(q*100)) + "%";
    clk.textContent = fmtCountdown(rem);
    // v12.38-hero: the percentage now carries a visible period suffix
    // ("۹۴٪ / ۲۴" in fa, "94% / 24h" in en) so the total is always visible.
    var pctSuffix = curLang()==="en" ? "/24h" : "/\u06F2\u06F4";
    if(pct) pct.textContent = pctTxt(Math.round(q*100)) + pctSuffix;
    // v12.22: the clock POPS every second \u2014 a tiny scale + brightness tick,
    // re-triggered on each pass (tickBigBar runs every second; the reflow
    // between remove/add restarts the CSS animation).
    clk.classList.remove("tick"); void clk.offsetWidth; clk.classList.add("tick");
    if(tr){
      tr.setAttribute("aria-valuenow", Math.round(q*100));
      if(tr.getAttribute("title") !== T("barBase")) tr.setAttribute("title", T("barBase"));
    }
  }
  card.style.display = "";
}
// v12.20: visible proof for the "auto-updated" claim \u2014 the payload's stamp.
// v12.26 (the user's ask): "instead of showing this: \xAB\u0622\u062E\u0631\u06CC\u0646 \u0628\u0647\u200C\u0631\u0648\u0632\u0631\u0633\u0627\u0646\u06CC:
// \u0647\u0645\u06CC\u0646 \u062D\u0627\u0644\u0627\xBB show a truthful API call update like: \xAB\u0622\u062E\u0631\u06CC\u0646 \u0628\u0647 \u0631\u0648\u0632 \u0631\u0633\u0627\u0646\u06CC:
// \u062C\u0645\u0639\u0647 21:30 \u0634\u0628\xBB" \u2014 the sync line now prints the ABSOLUTE stamp of the
// last real API refresh (weekday + HH:MM + a Persian period word), in the
// user's selected timezone and Persian digits. The server side carries the
// upstream pool's true fetchedAt (see fetchPublicMatches), so a quiet
// window honestly shows the last sweep that actually changed anything
// instead of a fake "\u0647\u0645\u06CC\u0646 \u062D\u0627\u0644\u0627".
var SYNC_TS = 0;
function fmtStamp(ts){
  try{
    var d = new Date(ts);
    var t = d.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit",timeZone:curTz()});
    if(curLang()==="en") return d.toLocaleDateString("en-GB",{weekday:"long",timeZone:curTz()}) + " " + t;
    var h = parseInt((t.split(":")[0] || "0"),10) || 0; if(h >= 24) h -= 24;
    var per = (h < 5 || h >= 19) ? "\u0634\u0628" : (h < 12 ? "\u0635\u0628\u062D" : (h < 16 ? "\u0638\u0647\u0631" : "\u0639\u0635\u0631"));
    return d.toLocaleDateString("fa-IR",{weekday:"long",timeZone:curTz()}) + " " + faNum(t) + " " + per;
  }catch(e){ return ""; }
}
function renderSync(){
  var el = document.getElementById("lastSync"); if(!el) return;
  if(!SYNC_TS){ el.textContent = ""; return; }
  // v12.x-resilience: when the API failed and we're serving the 7-day
  // snapshot, append a small "cached data" badge after the last-update
  // stamp so the user knows the data might be stale. Inline bilingual.
  var base = fmt("lastUpd", fmtStamp(SYNC_TS));
  if (DATA && DATA.cached) {
    var en = curLang() === "en";
    var mins = DATA.cachedAt ? Math.max(1, Math.round((Date.now() - new Date(DATA.cachedAt).getTime()) / 6e4)) : null;
    var cachedLabel = en ? "cached" : "\u0630\u062E\u06CC\u0631\u0647\u200C\u0634\u062F\u0647";
    if (mins != null) {
      var ageLabel = en ? (mins + "m ago") : (faNum(String(mins)) + " \u062F\u0642\u06CC\u0642\u0647 \u067E\u06CC\u0634");
      base += " \u00B7 " + cachedLabel + " (" + ageLabel + ")";
    } else {
      base += " \u00B7 " + cachedLabel;
    }
  }
  el.textContent = base;
}
function tickBigBar(){ if(DATA && DATA.upcoming) updateBigBar(); renderSync(); }
// v12.19: this final onLang declaration is the one that WINS at runtime
// (JS var re-assignment) \u2014 language switch rebuilds the tz popover labels
// (fa/en) and re-fetches so every dynamic string swaps language. The
// renderWeek/renderUcl declaration above documents the v12.18 intent; the
// full load() re-render covers those cards too.
var onLang = function(){ initTz(); load(); };
setTheme(initTheme()); applyLang(true); initTz(); load();
// v12.27 (the user's ask: "the background video doesnt play it must be auto
// play"): the autoplay+muted+playsinline attribute trio already satisfies
// every modern autoplay policy, but some browsers still refuse (Safari Low
// Power Mode, iOS data saver, Firefox block-autoplay policies) and leave the
// stage frozen on its first frame. heroVideoKick() is the belt-and-braces
// driver: it calls play() (promise rejections swallowed) at boot, on every
// canplay/loadeddata, whenever the tab becomes visible again, on the FIRST
// user gesture (pointer/key/touch \u2014 a gesture unlocks autoplay in every
// browser), and on a quiet 5s retry ladder (6 tries) while the video sits
// paused.
// v12.28 (the user's report: "Video still doesnt play. (it's just a picture)
// - on chrome"): two changes. (1) The reduced-motion hard-pause is RETIRED \u2014
// the user has now asked twice, unconditionally, that the video autoplay;
// the clip is a dim ambient stage (the CSS fx layers still honor the media
// query), and an OS "reduce motion" setting was freezing the stage on its
// first frame \u2014 exactly "just a picture". (2) muted is also set as a JS
// PROPERTY (hv.muted = true) in addition to the attribute \u2014 Safari's
// autoplay gate reads the property, and some engines reset the parsed
// attribute on re-insertion. The stage itself was also re-tuned in CSS
// (video .78 + a light scrim) so a PLAYING clip is visibly moving.
var heroVideoKick = function(){
  try{
    var hv = document.querySelector(".hero-video video");
    if(!hv) return;
    try{ hv.muted = true; }catch(e){}
    var kick = function(){
      if(hv.ended) return;
      try{ var p = hv.play(); if(p && p.catch) p.catch(function(){}); }catch(e){}
    };
    hv.addEventListener("canplay", kick);
    hv.addEventListener("loadeddata", kick);
    if(document.visibilityState === "visible" || document.visibilityState === "hidden"){
      document.addEventListener("visibilitychange", function(){ if(!document.hidden) kick(); });
    }
    ["pointerdown","keydown","touchstart"].forEach(function(ev){
      document.addEventListener(ev, kick, { once: true, passive: true });
    });
    kick();
    var tries = 0;
    var iv = setInterval(function(){
      if(!document.body.contains(hv)){ clearInterval(iv); return; }
      if(hv.paused){ kick(); if(++tries >= 6) clearInterval(iv); }
      else clearInterval(iv);
    }, 5000);
  }catch(e){}
};
heroVideoKick();
setInterval(load, 60000);
setInterval(tickBigBar, 1000);
// v12.21 (the user's ask): PC-wide HIERARCHY \u2014 the auto-placed 2-column grid
// read as random (ragged shared-row offsets, holes under shorter cards, the
// results card alone at the bottom). setWide() regroups the section cards
// into a MAIN column (every match box) and a reference RAIL (the three table
// boxes) at \u22651440px, and restores the exact single-column DOM order below
// the breakpoint. Runs once at boot (before first paint \u2014 the script is
// synchronous at the end of body) and again on breakpoint change; the
// renderers only touch card CONTENT, so the columns survive every re-render.
var WIDE_MQ = window.matchMedia ? window.matchMedia("(min-width:1440px)") : null;
var WIDE_MAIN = ["topspotCard","uclSpotCard","weekCard","finishedCard"];
var WIDE_RAIL = ["liveCard","uclCard","standingsCard","cupsCard"];
// v12.45-compact-live: on mobile (<1440px, single column), the liveCard
// appears as the SECOND card after the hero (bigHeroCard, which is always
// first in the DOM). Since bigHeroCard is not in WIDE_ORDER, liveCard at
// index 0 puts it right after the hero, before topspotCard.
var WIDE_ORDER = ["liveCard","topspotCard","uclSpotCard","weekCard","uclCard","standingsCard","cupsCard","finishedCard"];
function setWide(on){
  var footer = document.querySelector("footer");
  if(!footer) return;
  if(on){
    if(document.getElementById("wideMain")) return;
    var main = document.createElement("div"); main.id = "wideMain";
    var side = document.createElement("div"); side.id = "wideSide";
    footer.parentNode.insertBefore(main, footer);
    footer.parentNode.insertBefore(side, footer);
    WIDE_MAIN.forEach(function(id){ var e = document.getElementById(id); if(e) main.appendChild(e); });
    WIDE_RAIL.forEach(function(id){ var e = document.getElementById(id); if(e) side.appendChild(e); });
  } else {
    if(!document.getElementById("wideMain") && !document.getElementById("wideSide")) return;
    WIDE_ORDER.forEach(function(id){ var e = document.getElementById(id); if(e) footer.parentNode.insertBefore(e, footer); });
    var main = document.getElementById("wideMain"), side = document.getElementById("wideSide");
    if(main && main.parentNode) main.parentNode.removeChild(main);
    if(side && side.parentNode) side.parentNode.removeChild(side);
  }
}
if(WIDE_MQ){
  setWide(WIDE_MQ.matches);
  var wideChange = function(e){ setWide(e.matches); };
  if(WIDE_MQ.addEventListener) WIDE_MQ.addEventListener("change", wideChange);
  else if(WIDE_MQ.addListener) WIDE_MQ.addListener(wideChange);
}
// v12.20 (the user's ask): sticky join CTA \u2014 visible only while the hero
// button is scrolled PAST (not merely below the fold); scrolling back up
// hides it again. body.joinsticky adds bottom clearance so the bar never
// covers content while shown.
// v12.25: once the FOOTER itself is in view the bar stands down \u2014 the
// footer carries its own Telegram link (and the phone \xAB\u062E\u0627\u0646\u0647 \u062F\u0631\u0628\u0627\u0631\u0647 \u062A\u0645\u0627\u0633\xBB
// row), so a \xAB\u062F\u0631\u0628\u0627\u0631\u0647\xBB anchor lands on clean content instead of under the
// floating bar (the bar's own CTA duty is done at page end).
(function(){
  var stick = document.getElementById("joinSticky");
  var foot = document.getElementById("about");
  if(!stick || !("IntersectionObserver" in window)) return;
  // v12.x-joinsticky-fix: the IntersectionObserver used to watch a.cta (the
  // header CTA button), but that button is now display:none on both mobile
  // AND desktop (retired in v12.x-tg-fab — the floating FAB replaced it on
  // desktop, and the mobile header icon replaced it on mobile). A
  // display:none element has no layout box, so the observer never fired and
  // the sticky bar never appeared on mobile. Fix: observe the hero card
  // (#bigHeroCard) instead — it's always visible. When it scrolls out of
  // view (past = true), show the sticky bar. When the footer comes into
  // view (footIn = true), hide it (the footer carries its own Telegram link).
  var anchor = document.getElementById("bigHeroCard") || document.querySelector(".card");
  if(!anchor) return;
  var past = false, footIn = false;
  var apply = function(){ var show = past && !footIn; stick.classList.toggle("show", show); document.body.classList.toggle("joinsticky", show); };
  var io = new IntersectionObserver(function(entries){
    var e = entries[entries.length - 1];
    past = !e.isIntersecting && e.boundingClientRect.top < 0;
    apply();
  }, { threshold: 0 });
  io.observe(anchor);
  if(foot){
    var fo = new IntersectionObserver(function(entries){
      footIn = entries[entries.length - 1].isIntersecting;
      apply();
    }, { threshold: 0 });
    fo.observe(foot);
  }
})();
if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw.js').catch(function(){});}
// v12.x-fab-promo: the Telegram FAB shows a white promotional bubble every
// 60s to promote the bot. The bubble fades in for 5s, then fades out. The
// cycle repeats indefinitely. The bubble text comes from the data-promo
// attribute (bilingual: Persian in fa mode, English in en mode — set at
// render time + updated on language switch).
(function(){
  var fab = document.getElementById('tgFab');
  if(!fab) return;
  var show = function(){ fab.classList.add('promo-show'); setTimeout(function(){ fab.classList.remove('promo-show'); }, 5000); };
  // First show after 5s, then every 60s
  setTimeout(show, 5000);
  setInterval(show, 60000);
})();
<\/script>
</body>
</html>`;
var LOGIN_PAGE = `<!doctype html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<script>try{var t=localStorage.getItem("ucl_theme")||"dark",l=localStorage.getItem("ucl_lang")||"fa",d=document.documentElement;d.setAttribute("data-theme",t);d.setAttribute("lang",l);d.setAttribute("dir",l==="en"?"ltr":"rtl");}catch(e){}<\/script>
<title data-i="titleL">\u0648\u0631\u0648\u062F \u2014 \u0645\u062F\u06CC\u0631\u06CC\u062A \u0631\u0628\u0627\u062A</title>
<style>@font-face{font-family:Vazirmatn;src:url('/fonts/Vazirmatn-Regular.woff2') format('woff2');font-weight:400;font-display:swap}@font-face{font-family:Vazirmatn;src:url('/fonts/Vazirmatn-SemiBold.woff2') format('woff2');font-weight:600;font-display:swap}@font-face{font-family:Vazirmatn;src:url('/fonts/Vazirmatn-Bold.woff2') format('woff2');font-weight:700;font-display:swap}@font-face{font-family:Vazirmatn;src:url('/fonts/Vazirmatn-ExtraBold.woff2') format('woff2');font-weight:800;font-display:swap}</style>
<style>
:root{color-scheme:dark;--bg:#0f172a;--card:#1e293b;--field:#0f172a;--text:#e2e8f0;--muted:#94a3b8;--border:#334155;--accent:#2563eb;--accent-strong:#1d4ed8;--link:#93c5fd;--score:#4ade80;--countdown:#93c5fd;--countdown-bg:rgba(96,165,250,.12);--danger:#f87171;--chip:#334155;--hover:rgba(148,163,184,.08);--footer:#94a3b8;--glass:rgba(30,41,59,.55);--glass-border:rgba(148,163,184,.16);--glass-hi:rgba(255,255,255,.07);--glass-shadow:0 8px 32px rgba(0,0,0,.35);--glow1:rgba(37,99,235,.17);--glow2:rgba(29,78,216,.11);--scrim:rgba(2,6,23,.62);--badge-top:#15803d;--badge-hot:#b45309;--badge-derby:#7e22ce;--badge-league:#334155;--badge-live:#22c55e}
[data-theme="light"]{color-scheme:light;--bg:#f8fafc;--card:#ffffff;--field:#f8fafc;--text:#0f172a;--muted:#64748b;--border:#e2e8f0;--accent:#2563eb;--accent-strong:#1d4ed8;--link:#1d4ed8;--score:#15803d;--countdown:#2563eb;--countdown-bg:rgba(37,99,235,.1);--danger:#dc2626;--chip:#e2e8f0;--hover:rgba(15,23,42,.045);--footer:#64748b;--glass:rgba(255,255,255,.62);--glass-border:rgba(15,23,42,.08);--glass-hi:rgba(255,255,255,.7);--glass-shadow:0 8px 32px rgba(15,23,42,.08);--glow1:rgba(37,99,235,.09);--glow2:rgba(96,165,250,.08);--scrim:rgba(248,250,252,.78);--badge-top:#15803d;--badge-hot:#b45309;--badge-derby:#7e22ce;--badge-league:#e2e8f0;--badge-live:#22c55e}
body{font-family:'Vazirmatn',system-ui,sans-serif;background-color:var(--bg);color:var(--text);display:flex;align-items:center;justify-content:center;min-height:100vh;min-height:100dvh;margin:0;padding:16px;transition:background .25s,color .25s}body::before{content:"";position:fixed;inset:0;z-index:-1;background:radial-gradient(900px 520px at 88% -8%,var(--glow1),transparent 60%),radial-gradient(820px 620px at -12% 32%,var(--glow2),transparent 60%),linear-gradient(var(--scrim),var(--scrim)),url('/bg.jpg') center/cover no-repeat}
#topbar{position:fixed;top:12px;right:12px;left:12px;display:flex;justify-content:space-between;align-items:center}
#topbar button{background:var(--glass);-webkit-backdrop-filter:blur(10px) saturate(1.3);backdrop-filter:blur(10px) saturate(1.3);color:var(--text);border:1px solid var(--glass-border);border-radius:10px;padding:8px 14px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;transition:border-color .15s,transform .15s cubic-bezier(.16,1,.3,1),background .15s}
#topbar button:hover{border-color:var(--accent);background:var(--hover)}
#topbar button:active{transform:scale(.96)}
:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.login{background:var(--glass);-webkit-backdrop-filter:blur(16px) saturate(1.4);backdrop-filter:blur(16px) saturate(1.4);border:1px solid var(--glass-border);border-radius:16px;padding:28px;width:320px;max-width:100%;box-shadow:var(--glass-shadow),inset 0 1px 0 var(--glass-hi)}
h1{font-size:20px;font-weight:800;margin:0 0 16px;text-align:center}
input{font-size:15px;padding:9px 12px;border-radius:8px;border:1px solid var(--border);background:var(--field);color:var(--text);box-sizing:border-box;width:100%;margin:4px 0 10px;display:block}
button{font-size:15px;padding:9px 12px;border-radius:10px;border:none;background:var(--accent);color:#fff;cursor:pointer;width:100%;transition:background .15s,transform .15s cubic-bezier(.16,1,.3,1)}
button:hover{background:var(--accent-strong)}
button:active{transform:scale(.98)}
.err{color:var(--danger);font-size:13px;margin-top:10px;display:none;text-align:center}
label{display:block;font-size:13px;color:var(--muted)}
@media (max-width:600px){
body{padding:12px;background-attachment:scroll}
.login{padding:22px 16px}
h1{font-size:18px}
#topbar button{padding:7px 12px}
}
@media (prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}}
@media (prefers-reduced-transparency:reduce){body{background:var(--bg)}.login,#topbar button{background:var(--card);-webkit-backdrop-filter:none;backdrop-filter:none;box-shadow:0 1px 2px rgba(15,23,42,.05)}}
</style>
</head>
<body>
<div id="topbar"><button id="lbtn" onclick="switchLang()"></button><button id="tbtn" onclick="toggleTheme()"></button></div>
<div class="login">
<h1 data-i="loginH1">\u{1F510} \u0648\u0631\u0648\u062F \u0628\u0647 \u0645\u062F\u06CC\u0631\u06CC\u062A \u0631\u0628\u0627\u062A</h1>
<label for="user" data-i="lbUser">\u0646\u0627\u0645 \u06A9\u0627\u0631\u0628\u0631\u06CC</label>
<input id="user" name="username" autocomplete="username" data-p="lbUser">
<label for="pass" data-i="lbPass">\u0631\u0645\u0632 \u0639\u0628\u0648\u0631</label>
<input id="pass" name="password" type="password" autocomplete="current-password" data-p="lbPass">
<button id="btnLogin" onclick="doLogin()" data-i="btnLogin">\u0648\u0631\u0648\u062F</button>
<div class="err" id="err" role="alert"></div>
</div>
<script>
var I18N={
fa:{title:"\u0645\u0633\u0627\u0628\u0642\u0627\u062A \u067E\u06CC\u0634\u200C\u0631\u0648 \u2014 \u0627\u0639\u0644\u0627\u0646\u200C\u062F\u0647\u0646\u062F\u0647 \u0645\u0633\u0627\u0628\u0642\u0627\u062A",h1:"\u26BD \u0627\u0639\u0644\u0627\u0646\u200C\u062F\u0647\u0646\u062F\u0647 \u0645\u0633\u0627\u0628\u0642\u0627\u062A",sub1:"\u0645\u0633\u0627\u0628\u0642\u0627\u062A \u067E\u06CC\u0634\u200C\u0631\u0648\u060C \u0631\u0642\u0627\u0628\u062A\u200C\u0647\u0627\u06CC \u0635\u062F\u0631 \u062C\u062F\u0648\u0644 \u0648 \u0646\u062A\u0627\u06CC\u062C \u062A\u06CC\u0645\u200C\u0647\u0627\u06CC \u0645\u0646\u062A\u062E\u0628 \u2014 \u0628\u0647\u200C\u0631\u0648\u0632\u0631\u0633\u0627\u0646\u06CC \u062E\u0648\u062F\u06A9\u0627\u0631",join:"\u0639\u0636\u0648\u06CC\u062A \u062F\u0631 \u0631\u0628\u0627\u062A \u062A\u0644\u06AF\u0631\u0627\u0645",hUpcoming:"\u{1F4C5} \u0645\u0633\u0627\u0628\u0642\u0627\u062A \u067E\u06CC\u0634\u200C\u0631\u0648",hFinished:"\u{1F3C1} \u0646\u062A\u0627\u06CC\u062C \u0627\u062E\u06CC\u0631",hLive:"\u{1F534} \u0645\u0633\u0627\u0628\u0642\u0627\u062A \u0632\u0646\u062F\u0647",loading:"\u062F\u0631 \u062D\u0627\u0644 \u0628\u0627\u0631\u06AF\u0630\u0627\u0631\u06CC...",noMatches:"\u0645\u0633\u0627\u0628\u0642\u0647\u200C\u0627\u06CC \u062F\u0631 \u0631\u0627\u0647 \u0646\u06CC\u0633\u062A",errLoad:"\u062E\u0637\u0627 \u062F\u0631 \u062F\u0631\u06CC\u0627\u0641\u062A \u062F\u0627\u062F\u0647\u200C\u0647\u0627",madeWith:"\u0633\u0627\u062E\u062A\u0647\u200C\u0634\u062F\u0647 \u0628\u0627 \u2764\uFE0F",adminLink:"\u0648\u0631\u0648\u062F \u0645\u062F\u06CC\u0631\u06CC\u062A",botLink:"\u0631\u0628\u0627\u062A \u062A\u0644\u06AF\u0631\u0627\u0645",soon:"\u0628\u0647\u200C\u0632\u0648\u062F\u06CC",inDays:"\u062F\u0631 %d \u0631\u0648\u0632",barNext:"\u26A1 \u062A\u0627 \u0628\u0627\u0632\u06CC \u0628\u0632\u0631\u06AF \u0628\u0639\u062F\u06CC",barFallback:"\u23F3 \u062A\u0627 \u0645\u0633\u0627\u0628\u0642\u0647 \u0628\u0639\u062F\u06CC",barLive:"\u{1F534} \u062F\u0631 \u062C\u0631\u06CC\u0627\u0646",barIdle:"\u23F3 \u062F\u0631 \u0627\u0646\u062A\u0638\u0627\u0631 \u0628\u0627\u0632\u06CC \u0628\u0639\u062F\u06CC",barBase:"\u0646\u0648\u0627\u0631 \u067E\u06CC\u0634\u0631\u0641\u062A \u062F\u0631 \u06F2\u06F4 \u0633\u0627\u0639\u062A \u067E\u0627\u06CC\u0627\u0646\u06CC \u0642\u0628\u0644 \u0627\u0632 \u0634\u0631\u0648\u0639 \u0628\u0627\u0632\u06CC \u067E\u0631 \u0645\u06CC\u200C\u0634\u0648\u062F \u0648 \u062F\u0631 \u0634\u0631\u0648\u0639 \u0628\u0627\u0632\u06CC \u0628\u0647 \u06F1\u06F0\u06F0\u066A \u0645\u06CC\u200C\u0631\u0633\u062F",uDay:"\u0631\u0648\u0632",uHour:"\u0633\u0627\u0639\u062A",uMin:"\u062F\u0642\u06CC\u0642\u0647",uSec:"\u062B\u0627\u0646\u06CC\u0647",live:"\u062F\u0631 \u062D\u0627\u0644 \u0628\u0631\u06AF\u0632\u0627\u0631\u06CC",pen:"\u067E\u0646\u0627\u0644\u062A\u06CC",own:"\u06AF\u0644 \u0628\u0647 \u062E\u0648\u062F\u06CC",derby:"\u{1F525} \u062F\u0631\u0628\u06CC",boxCl:"\u{1F3C6} \u0644\u06CC\u06AF \u0642\u0647\u0631\u0645\u0627\u0646\u0627\u0646 \u0627\u0631\u0648\u067E\u0627",boxCup:"\u{1F3C6} \u062C\u0627\u0645\u200C\u0647\u0627\u06CC \u062D\u0630\u0641\u06CC",boxLg:"\u26BD \u0644\u06CC\u06AF\u200C\u0647\u0627\u06CC \u062F\u0627\u062E\u0644\u06CC",viewBig:"\u26A1 \u0641\u0642\u0637 \u0628\u0627\u0632\u06CC\u0647\u0627\u06CC \u0628\u0632\u0631\u06AF",viewAll:"\u0647\u0645\u0647 \u0628\u0627\u0632\u06CC\u0647\u0627",hStandings:"\u{1F4CA} \u062C\u062F\u0648\u0644 \u0644\u06CC\u06AF\u200C\u0647\u0627",hCups:"\u{1F3C6} \u062C\u0627\u0645\u200C\u0647\u0627\u06CC \u062D\u0630\u0641\u06CC",stEmpty:"\u062C\u062F\u0648\u0644 \u0647\u0646\u0648\u0632 \u062F\u0631 \u062F\u0633\u062A\u0631\u0633 \u0646\u06CC\u0633\u062A",stNot:"\u0634\u0631\u0648\u0639 \u0646\u0634\u062F\u0647",tierGold:"\u{1F947} \u0633\u0637\u062D \u0637\u0644\u0627 \u2014 \u0627\u0631\u0648\u067E\u0627 \u0648 \u0628\u06CC\u0646\u0627\u0644\u0645\u0644\u0644",tierSilver:"\u{1F948} \u0633\u0637\u062D \u0646\u0642\u0631\u0647 \u2014 \u0627\u0631\u0648\u067E\u0627",tierBronze:"\u{1F949} \u0633\u0637\u062D \u0628\u0631\u0646\u0632 \u2014 \u0627\u0631\u0648\u067E\u0627",cEN:"\u{1F3F4} \u0627\u0646\u06AF\u0644\u0633\u062A\u0627\u0646",cES:"\u{1F1EA}\u{1F1F8} \u0627\u0633\u067E\u0627\u0646\u06CC\u0627",cIT:"\u{1F1EE}\u{1F1F9} \u0627\u06CC\u062A\u0627\u0644\u06CC\u0627",cupsNone:"\u062F\u0631 \u0627\u0646\u062A\u0638\u0627\u0631 \u0628\u0631\u0646\u0627\u0645\u0647",share:"\u0627\u0634\u062A\u0631\u0627\u06A9\u200C\u06AF\u0630\u0627\u0631\u06CC",copy:"\u06A9\u067E\u06CC \u0645\u062A\u0646",copied:"\u06A9\u067E\u06CC \u0634\u062F \u2713",titleL:"\u0648\u0631\u0648\u062F \u2014 \u0645\u062F\u06CC\u0631\u06CC\u062A \u0631\u0628\u0627\u062A",loginH1:"\u{1F510} \u0648\u0631\u0648\u062F \u0628\u0647 \u0645\u062F\u06CC\u0631\u06CC\u062A \u0631\u0628\u0627\u062A",lbUser:"\u0646\u0627\u0645 \u06A9\u0627\u0631\u0628\u0631\u06CC",lbPass:"\u0631\u0645\u0632 \u0639\u0628\u0648\u0631",btnLogin:"\u0648\u0631\u0648\u062F",errUser:"\u0646\u0627\u0645 \u06A9\u0627\u0631\u0628\u0631\u06CC \u0631\u0627 \u0648\u0627\u0631\u062F \u06A9\u0646\u06CC\u062F",errRate:"\u062A\u0644\u0627\u0634 \u0628\u06CC\u0634 \u0627\u0632 \u062D\u062F \u2014 \u0686\u0646\u062F \u062F\u0642\u06CC\u0642\u0647 \u062F\u06CC\u06AF\u0631 \u0627\u0645\u062A\u062D\u0627\u0646 \u06A9\u0646\u06CC\u062F",errCreds:"\u0646\u0627\u0645 \u06A9\u0627\u0631\u0628\u0631\u06CC \u06CC\u0627 \u0631\u0645\u0632 \u0627\u0634\u062A\u0628\u0627\u0647 \u0627\u0633\u062A",titleA:"\u062A\u0646\u0638\u06CC\u0645\u0627\u062A \u0631\u0628\u0627\u062A \u0627\u0639\u0644\u0627\u0646 \u0645\u0633\u0627\u0628\u0642\u0627\u062A",h1A:"\u2699\uFE0F \u062A\u0646\u0638\u06CC\u0645\u0627\u062A \u0631\u0628\u0627\u062A \u0627\u0639\u0644\u0627\u0646 \u0645\u0633\u0627\u0628\u0642\u0627\u062A",hLogin:"\u{1F511} \u0648\u0631\u0648\u062F",tokenPh:"\u0631\u0645\u0632 \u0639\u0628\u0648\u0631 \u0645\u062F\u06CC\u0631\u06CC\u062A (admin password)",hStatus:"\u{1F4CA} \u0648\u0636\u0639\u06CC\u062A",stLoading:"\u062F\u0631 \u062D\u0627\u0644 \u0628\u0627\u0631\u06AF\u0630\u0627\u0631\u06CC...",stErr:"\u274C \u062E\u0637\u0627 \u062F\u0631 \u062F\u0631\u06CC\u0627\u0641\u062A \u0648\u0636\u0639\u06CC\u062A \u2014 \u062F\u0648\u0628\u0627\u0631\u0647 \u0648\u0627\u0631\u062F \u0634\u0648\u06CC\u062F \u06CC\u0627 \u062A\u0648\u06A9\u0646 \u0631\u0627 \u0628\u0631\u0631\u0633\u06CC \u06A9\u0646\u06CC\u062F",stLastRun:"\u{1F552} \u0622\u062E\u0631\u06CC\u0646 \u0627\u062C\u0631\u0627",stApi:"\u{1F4E1} \u0645\u0646\u0628\u0639 API",stUsers:"\u{1F465} \u06A9\u0627\u0631\u0628\u0631\u0627\u0646",stIds:"\u{1F194} \u0634\u0646\u0627\u0633\u0647\u200C\u0647\u0627",stTz:"\u{1F30D} \u0645\u0646\u0637\u0642\u0647 \u0632\u0645\u0627\u0646\u06CC",btnRefresh:"\u0628\u0647\u200C\u0631\u0648\u0632\u0631\u0633\u0627\u0646\u06CC \u0648\u0636\u0639\u06CC\u062A",btnTest:"\u{1F4E8} \u0627\u0631\u0633\u0627\u0644 \u067E\u06CC\u0627\u0645 \u062A\u0633\u062A",btnSim:"\u{1F9EA} \u0634\u0628\u06CC\u0647\u200C\u0633\u0627\u0632\u06CC \u06F5 \u0627\u0639\u0644\u0627\u0646",btnSources:"\u{1F4E1} \u0628\u0631\u0631\u0633\u06CC \u0645\u0646\u0627\u0628\u0639 API",btnLogout:"\u{1F6AA} \u062E\u0631\u0648\u062C",hBroadcast:"\u{1F4E3} \u0627\u0631\u0633\u0627\u0644 \u067E\u06CC\u0627\u0645 \u0628\u0647 \u0647\u0645\u0647 \u06A9\u0627\u0631\u0628\u0631\u0627\u0646",lbBroadcast:"\u0645\u062A\u0646 \u067E\u06CC\u0627\u0645 (\u0628\u0647 \u0641\u0627\u0631\u0633\u06CC \u06CC\u0627 \u0627\u0646\u06AF\u0644\u06CC\u0633\u06CC)",bcPh:"\u0645\u062A\u0646 \u067E\u06CC\u0627\u0645...",btnBroadcast:"\u{1F4E3} \u0627\u0631\u0633\u0627\u0644 \u0628\u0631\u0627\u06CC \u0647\u0645\u0647",hMatches:"\u26BD \u0645\u0633\u0627\u0628\u0642\u0627\u062A \u067E\u06CC\u0634\u200C\u0631\u0648",btnRefreshM:"\u0628\u0647\u200C\u0631\u0648\u0632\u0631\u0633\u0627\u0646\u06CC \u0645\u0633\u0627\u0628\u0642\u0627\u062A",hSettings:"\u2699\uFE0F \u062A\u0646\u0638\u06CC\u0645\u0627\u062A",lbTz:"\u0645\u0646\u0637\u0642\u0647 \u0632\u0645\u0627\u0646\u06CC",lbLeagues:"\u0644\u06CC\u06AF\u200C\u0647\u0627\u06CC \u062A\u062D\u062A \u067E\u0648\u0634\u0634 (\u06A9\u062F\u0647\u0627 \u0628\u0627 \u06A9\u0627\u0645\u0627)",elNote:"EL \u0648 ECL \u062A\u0648\u0633\u0637 SportScore \u067E\u0648\u0634\u0634 \u062F\u0627\u062F\u0647 \u0645\u06CC\u200C\u0634\u0648\u0646\u062F \u0648 \u0646\u06CC\u0627\u0632\u06CC \u0628\u0647 \u0627\u0641\u0632\u0648\u062F\u0646 \u0646\u062F\u0627\u0631\u0646\u062F.",lbTeams:"\u062A\u06CC\u0645\u200C\u0647\u0627\u06CC \u0645\u0646\u062A\u062E\u0628 \u0647\u0631 \u0644\u06CC\u06AF",teamPh:"\u0646\u0627\u0645 \u062A\u06CC\u0645 \u062C\u062F\u06CC\u062F",btnAdd:"+ \u0627\u0641\u0632\u0648\u062F\u0646",btnSave:"\u{1F4BE} \u0630\u062E\u06CC\u0631\u0647 \u062A\u0646\u0638\u06CC\u0645\u0627\u062A",btnBackup:"\u2B07\uFE0F \u067E\u0634\u062A\u06CC\u0628\u0627\u0646\u200C\u06AF\u06CC\u0631\u06CC \u062A\u0646\u0638\u06CC\u0645\u0627\u062A",hPass:"\u{1F511} \u062A\u063A\u06CC\u06CC\u0631 \u0631\u0645\u0632 \u0639\u0628\u0648\u0631",lbNp1:"\u0631\u0645\u0632 \u062C\u062F\u06CC\u062F (\u062D\u062F\u0627\u0642\u0644 \u06F8 \u06A9\u0627\u0631\u0627\u06A9\u062A\u0631)",lbNp2:"\u062A\u06A9\u0631\u0627\u0631 \u0631\u0645\u0632 \u062C\u062F\u06CC\u062F",btnCp:"\u062A\u063A\u06CC\u06CC\u0631 \u0631\u0645\u0632 \u0639\u0628\u0648\u0631",ver:"\u0646\u0633\u062E\u0647 \u06F1\u06F2.\u06F3\u06F3-xpost \u2014 \u067E\u0631\u0648\u0641\u0627\u06CC\u0644 \u062E\u0648\u062F\u06A9\u0627\u0631 X\u060C \u0627\u0645\u0636\u0627\u06CC OAuth 1.0a \u0628\u0627 HMAC-SHA1\u060C \u0622\u06CC\u0646\u0647\u200C\u06CC \u0641\u0627\u0631\u0633\u06CC \u0627\u0639\u0644\u0627\u0646\u200C\u0647\u0627\u06CC \u0635\u062F\u0631\u0646\u0634\u06CC\u0646\u060C \u0646\u062A\u06CC\u062C\u0647\u060C \u0634\u0631\u0648\u0639 \u0628\u0627\u0632\u06CC \u0648 \u062C\u062F\u0648\u0644 \u0647\u0641\u062A\u06AF\u06CC\u060C \u0645\u062D\u062F\u0648\u062F\u06AF\u0631 \u0628\u0648\u062F\u062C\u0647 KV (\u06F4\u06F5\u06F0 \u0645\u0627\u0647\u0627\u0646\u0647\u060C \u06F1\u06F2 \u0631\u0648\u0632\u0627\u0646\u0647)\u060C \u062D\u0627\u0644\u062A dry-run \u0648 \u06A9\u0627\u0631\u062A \u0648\u0636\u0639\u06CC\u062A X \u062F\u0631 \u067E\u0646\u0644 \u0645\u062F\u06CC\u0631\u06CC\u062A",mToken:"\u0648\u0631\u0648\u062F \u0646\u0627\u0645\u0639\u062A\u0628\u0631 \u2014 \u0631\u0645\u0632 \u0639\u0628\u0648\u0631 \u06CC\u0627 \u0646\u0634\u0633\u062A \u0645\u0646\u0642\u0636\u06CC \u0634\u062F\u0647",mErr:"\u062E\u0637\u0627: ",mEnterToken:"\u0631\u0645\u0632 \u0639\u0628\u0648\u0631 \u0631\u0627 \u0648\u0627\u0631\u062F \u06A9\u0646\u06CC\u062F",mSaved:"\u2705 \u0630\u062E\u06CC\u0631\u0647 \u0634\u062F",mLoginFirst:"\u0627\u0628\u062A\u062F\u0627 \u0648\u0627\u0631\u062F \u0634\u0648\u06CC\u062F",mBackup:"\u2B07\uFE0F \u067E\u0634\u062A\u06CC\u0628\u0627\u0646\u200C\u06AF\u06CC\u0631\u06CC \u0634\u062F",mPassShort:"\u0631\u0645\u0632 \u0628\u0627\u06CC\u062F \u062D\u062F\u0627\u0642\u0644 \u06F8 \u06A9\u0627\u0631\u0627\u06A9\u062A\u0631 \u0628\u0627\u0634\u062F",mPassMismatch:"\u0631\u0645\u0632\u0647\u0627 \u06CC\u06A9\u0633\u0627\u0646 \u0646\u06CC\u0633\u062A\u0646\u062F",mPassOk:"\u{1F511} \u0631\u0645\u0632 \u0628\u0627 \u0645\u0648\u0641\u0642\u06CC\u062A \u062A\u063A\u06CC\u06CC\u0631 \u06A9\u0631\u062F",mSentTo:"\u{1F4E3} \u0627\u0631\u0633\u0627\u0644 \u0634\u062F \u0628\u0647 %s \u0627\u0632 %s \u06A9\u0627\u0631\u0628\u0631",mTestSent:"\u{1F4E8} \u062A\u0633\u062A \u0627\u0631\u0633\u0627\u0644 \u0634\u062F \u0628\u0647 %s \u06A9\u0627\u0631\u0628\u0631",mSimPrefix:"\u{1F9EA} \u0634\u0628\u06CC\u0647\u200C\u0633\u0627\u0632\u06CC: ",mNoNotif:"\u26A0\uFE0F \u0647\u06CC\u0686 \u0627\u0639\u0644\u0627\u0646\u06CC \u0627\u0631\u0633\u0627\u0644 \u0646\u0634\u062F",mNoMatches:"\u0645\u0633\u0627\u0628\u0642\u0647\u200C\u0627\u06CC \u062F\u0631 \u0631\u0627\u0647 \u0646\u06CC\u0633\u062A",mErrMatches:"\u062E\u0637\u0627 \u062F\u0631 \u062F\u0631\u06CC\u0627\u0641\u062A \u0645\u0633\u0627\u0628\u0642\u0627\u062A",mEnterText:"\u0645\u062A\u0646 \u067E\u06CC\u0627\u0645 \u0631\u0627 \u0648\u0627\u0631\u062F \u06A9\u0646\u06CC\u062F",mErrSrc:"\u274C \u062E\u0637\u0627",acHint:"\u{1F4A1} \u0647\u0646\u06AF\u0627\u0645 \u062A\u0627\u06CC\u067E\u060C \u0646\u0627\u0645 \u062F\u0642\u06CC\u0642 \u0628\u0627\u0634\u06AF\u0627\u0647 \u0627\u0632 \u0641\u0647\u0631\u0633\u062A API \u067E\u06CC\u0634\u0646\u0647\u0627\u062F \u0645\u06CC\u200C\u0634\u0648\u062F \u2014 \u0628\u0631\u0627\u06CC \u062B\u0628\u062A \u0628\u06CC\u200C\u062E\u0637\u0627 \u06CC\u06A9\u06CC \u0631\u0627 \u0627\u0646\u062A\u062E\u0627\u0628 \u06A9\u0646\u06CC\u062F.",acNone:"\u0628\u0627\u0634\u06AF\u0627\u0647\u06CC \u0628\u0627 \u0627\u06CC\u0646 \u0646\u0627\u0645 \u062F\u0631 \u0641\u0647\u0631\u0633\u062A \u0646\u06CC\u0633\u062A",acAdd:"\u2705 %s \u0627\u0641\u0632\u0648\u062F\u0647 \u0634\u062F",acAddUcl:"\u2705 %s \u0627\u0641\u0632\u0648\u062F\u0647 \u0634\u062F \u2014 \u0628\u0631\u0627\u06CC \u0644\u06CC\u06AF \u0642\u0647\u0631\u0645\u0627\u0646\u0627\u0646 \u0627\u0631\u0648\u067E\u0627 \u0647\u0645 \u0627\u0646\u062A\u062E\u0627\u0628 \u0634\u062F",uclSync:"\u0628\u0627\u0634\u06AF\u0627\u0647\u200C\u0647\u0627\u06CC \u0647\u0631 \u0644\u06CC\u06AF \u0628\u0647\u200C\u0635\u0648\u0631\u062A \u062E\u0648\u062F\u06A9\u0627\u0631 \u0628\u0631\u0627\u06CC \u0644\u06CC\u06AF \u0642\u0647\u0631\u0645\u0627\u0646\u0627\u0646 \u0627\u0631\u0648\u067E\u0627 \u0647\u0645 \u0627\u0646\u062A\u062E\u0627\u0628 \u0645\u06CC\u200C\u0634\u0648\u0646\u062F",acDup:"\u26A0\uFE0F %s \u0627\u0632 \u0642\u0628\u0644 \u062F\u0631 \u0627\u06CC\u0646 \u0644\u06CC\u06AF \u0647\u0633\u062A",btnClubs:"\u{1F504} \u0628\u0647\u200C\u0631\u0648\u0632\u0631\u0633\u0627\u0646\u06CC \u0641\u0647\u0631\u0633\u062A \u0628\u0627\u0634\u06AF\u0627\u0647\u200C\u0647\u0627",clubsMeta:"\u0641\u0647\u0631\u0633\u062A \u0628\u0627\u0634\u06AF\u0627\u0647\u200C\u0647\u0627: %s \u0628\u0627\u0634\u06AF\u0627\u0647 \u2014 \u0622\u062E\u0631\u06CC\u0646 \u0628\u0631\u0648\u0632\u0631\u0633\u0627\u0646\u06CC: %s",clubsNone:"\u26A0\uFE0F \u0641\u0647\u0631\u0633\u062A \u0628\u0627\u0634\u06AF\u0627\u0647\u200C\u0647\u0627 \u0647\u0646\u0648\u0632 \u0633\u0627\u062E\u062A\u0647 \u0646\u0634\u062F\u0647 \u2014 \u062F\u06A9\u0645\u0647 \u0628\u0631\u0648\u0632\u0631\u0633\u0627\u0646\u06CC \u0631\u0627 \u0628\u0632\u0646\u06CC\u062F",mClubs:"\u2705 \u0641\u0647\u0631\u0633\u062A \u0628\u0627\u0634\u06AF\u0627\u0647\u200C\u0647\u0627 \u0628\u0631\u0648\u0632\u0631\u0633\u0627\u0646\u06CC \u0634\u062F (%s \u0628\u0627\u0634\u06AF\u0627\u0647)",clubsErr:"\u274C \u0641\u0647\u0631\u0633\u062A \u0628\u0627\u0634\u06AF\u0627\u0647\u200C\u0647\u0627 \u062F\u0631 \u062F\u0633\u062A\u0631\u0633 \u0646\u06CC\u0633\u062A",hMembers:"\u{1F465} \u0627\u0639\u0636\u0627\u06CC \u0631\u0628\u0627\u062A",btnMembers:"\u{1F504} \u0628\u0647\u200C\u0631\u0648\u0632\u0631\u0633\u0627\u0646\u06CC \u0627\u0639\u0636\u0627",membersNone:"\u0647\u0646\u0648\u0632 \u0639\u0636\u0648\u06CC \u062B\u0628\u062A \u0646\u0634\u062F\u0647 \u0627\u0633\u062A \u2014 \u06A9\u0627\u0631\u0628\u0631\u0627\u0646 \u0628\u0627\u06CC\u062F \u0631\u0628\u0627\u062A \u0631\u0627 /start \u06A9\u0646\u0646\u062F",memId:"\u0634\u0646\u0627\u0633\u0647",memSlug:"\u0646\u0627\u0645 \u06A9\u0627\u0631\u0628\u0631\u06CC",memName:"\u0646\u0627\u0645",memJoined:"\u062A\u0627\u0631\u06CC\u062E \u0639\u0636\u0648\u06CC\u062A",memCount:"%s \u0639\u0636\u0648",hFai:"\u{1F9E0} \u062A\u0631\u062C\u0645\u0647 \u0647\u0648\u0634\u0645\u0646\u062F \u0646\u0627\u0645 \u0628\u0627\u0634\u06AF\u0627\u0647\u200C\u0647\u0627",faiHint:"\u0646\u0627\u0645\u200C\u0647\u0627\u06CC \u062C\u062F\u06CC\u062F \u0628\u0647\u200C\u062A\u062F\u0631\u06CC\u062C \u0628\u0627 Workers AI \u062A\u0631\u062C\u0645\u0647 \u0648 \u0630\u062E\u06CC\u0631\u0647 \u0645\u06CC\u200C\u0634\u0648\u0646\u062F \u2014 \u0627\u0632 \u0628\u0627\u0631 \u0628\u0639\u062F \u0645\u0633\u062A\u0642\u06CC\u0645 \u0641\u0627\u0631\u0633\u06CC \u0646\u0645\u0627\u06CC\u0634 \u062F\u0627\u062F\u0647 \u0645\u06CC\u200C\u0634\u0648\u0646\u062F.",faiMeta:"%s \u0646\u0627\u0645 \u062A\u0631\u062C\u0645\u0647\u200C\u0634\u062F\u0647 \u2014 %s \u062F\u0631 \u0627\u0646\u062A\u0638\u0627\u0631",faiNone:"\u0647\u0646\u0648\u0632 \u062A\u0631\u062C\u0645\u0647\u200C\u0627\u06CC \u06CC\u0627\u062F \u06AF\u0631\u0641\u062A\u0647 \u0646\u0634\u062F\u0647 \u2014 \u062F\u06A9\u0645\u0647 \u062A\u0631\u062C\u0645\u0647 \u0647\u0648\u0634\u0645\u0646\u062F \u0631\u0627 \u0628\u0632\u0646\u06CC\u062F",btnFai:"\u{1F504} \u062A\u0631\u062C\u0645\u0647 \u0647\u0648\u0634\u0645\u0646\u062F (AI)",faiRun:"\u2705 %s \u0646\u0627\u0645 \u062C\u062F\u06CC\u062F \u062A\u0631\u062C\u0645\u0647 \u0634\u062F",faiNoNew:"\u0646\u0627\u0645 \u062C\u062F\u06CC\u062F\u06CC \u0628\u0631\u0627\u06CC \u062A\u0631\u062C\u0645\u0647 \u0646\u0628\u0648\u062F",faiOff:"\u26A0\uFE0F \u0627\u062A\u0635\u0627\u0644 Workers AI \u0641\u0639\u0627\u0644 \u0646\u06CC\u0633\u062A",faiForget:"\u0646\u0627\u0645 \u0644\u0627\u062A\u06CC\u0646 \u0628\u0627\u0634\u06AF\u0627\u0647 (\u062D\u0630\u0641 \u062A\u0631\u062C\u0645\u0647)",btnFaiForget:"\u062D\u0630\u0641 \u062A\u0631\u062C\u0645\u0647",hX:"\u{1F426} \u067E\u0631\u0648\u0641\u0627\u06CC\u0644 X (\u062A\u0648\u06CC\u06CC\u062A\u0631)",xHint:"\u0622\u06CC\u0646\u0647\u200C\u06CC \u062E\u0648\u062F\u06A9\u0627\u0631 \u0627\u0639\u0644\u0627\u0646\u200C\u0647\u0627\u06CC \u062A\u0644\u06AF\u0631\u0627\u0645 \u062F\u0631 X \u2014 \u0635\u062F\u0631\u0646\u0634\u06CC\u0646\u060C \u0646\u062A\u06CC\u062C\u0647 \u0628\u0627\u0632\u06CC\u200C\u0647\u0627\u06CC \u0628\u0632\u0631\u06AF\u060C \u0634\u0631\u0648\u0639 \u0628\u0627\u0632\u06CC \u0648 \u062C\u062F\u0648\u0644 \u0647\u0641\u062A\u06AF\u06CC \u062F\u0631 \u0633\u0631\u06CC \u067E\u0627\u0633\u062E\u200C\u0647\u0627. \u0645\u062D\u062F\u0648\u062F\u06AF\u0631 \u0628\u0648\u062F\u062C\u0647: \u06F4\u06F5\u06F0 \u067E\u0633\u062A \u0645\u0627\u0647\u0627\u0646\u0647\u060C \u06F1\u06F2 \u0631\u0648\u0632\u0627\u0646\u0647.",btnXTest:"\u{1F9EA} \u067E\u0633\u062A \u062A\u0633\u062A",btnXRefresh:"\u{1F504} \u0628\u0647\u200C\u0631\u0648\u0632\u0631\u0633\u0627\u0646\u06CC",btnXEnabled:"\u23F8\uFE0F \u062A\u0648\u0642\u0641/\u0631\u0648\u0634\u0646",btnXDryRun:"\u{1F50F} \u062D\u0627\u0644\u062A dry-run",btnXClearPause:"\u26A0\uFE0F \u067E\u0627\u06A9 \u062A\u0648\u0642\u0641 (429)",lbXPhase:"\u0641\u0627\u0632 \u0647\u0627\u06CC \u0641\u0639\u0627\u0644 (\u0628\u0627 \u06A9\u0627\u0645\u0627: coronation,ft,kickoff,tables,media)",btnXPhase:"\u{1F4BE} \u0630\u062E\u06CC\u0631\u0647 \u0641\u0627\u0632",faiForgot:"\u2705 \u062A\u0631\u062C\u0645\u0647 %s \u062D\u0630\u0641 \u0634\u062F",faiNotfound:"\u26A0\uFE0F \u062A\u0631\u062C\u0645\u0647\u200C\u0627\u06CC \u0628\u0631\u0627\u06CC %s \u06CC\u0627\u0641\u062A \u0646\u0634\u062F"},
en:{title:"Upcoming Matches \u2014 Match Notifier",h1:"\u26BD Match Notifier",sub1:"Fixtures, top-of-the-table clashes & results \u2014 auto-refreshed",join:"Join the Telegram bot",hUpcoming:"\u{1F4C5} Upcoming Matches",hFinished:"\u{1F3C1} Recent Results",hLive:"\u{1F534} Live Matches",loading:"Loading...",noMatches:"No matches ahead",errLoad:"Error loading data",madeWith:"Made with \u2764\uFE0F",adminLink:"Admin login",botLink:"Telegram bot",soon:"Soon",inDays:"in %d days",barNext:"\u26A1 Until the next big match",barFallback:"\u23F3 Until the next match",barLive:"\u{1F534} Live now",barIdle:"\u23F3 Waiting for the next match",barBase:"The bar fills during the final 24 hours before kickoff and reaches 100% at kickoff",uDay:"d",uHour:"h",uMin:"m",uSec:"s",live:"LIVE",pen:"Penalty",own:"Own goal",derby:"\u{1F525} Derby",boxCl:"\u{1F3C6} Champions League",boxCup:"\u{1F3C6} Elimination Cups",boxLg:"\u26BD Domestic Leagues",viewBig:"\u26A1 Big matches only",viewAll:"All matches",hStandings:"\u{1F4CA} League Standings",hCups:"\u{1F3C6} Tournaments",stEmpty:"Standings not available yet",stNot:"Not started",tierGold:"\u{1F947} Gold tier \u2014 Europe & international",tierSilver:"\u{1F948} Silver tier \u2014 Europe",tierBronze:"\u{1F949} Bronze tier \u2014 Europe",cEN:"\u{1F3F4} England",cES:"\u{1F1EA}\u{1F1F8} Spain",cIT:"\u{1F1EE}\u{1F1F9} Italy",cupsNone:"No fixture yet",share:"Share",copy:"Copy text",copied:"Copied \u2713",titleL:"Login \u2014 Bot Admin",loginH1:"\u{1F510} Bot Admin Login",lbUser:"Username",lbPass:"Password",btnLogin:"Login",errUser:"Enter your username",errRate:"Too many attempts \u2014 try again in a few minutes",errCreds:"Wrong username or password",titleA:"Match Bot Settings",h1A:"\u2699\uFE0F Bot Settings",hLogin:"\u{1F511} Login",tokenPh:"Admin password",hStatus:"\u{1F4CA} Status",stLoading:"Loading...",stErr:"\u274C Status error \u2014 re-login or check token",stLastRun:"\u{1F552} Last run",stApi:"\u{1F4E1} API source",stUsers:"\u{1F465} Users",stIds:"\u{1F194} IDs",stTz:"\u{1F30D} Timezone",btnRefresh:"Refresh status",btnTest:"\u{1F4E8} Send test message",btnSim:"\u{1F9EA} Simulate 5 alerts",btnSources:"\u{1F4E1} Check API sources",btnLogout:"\u{1F6AA} Logout",hBroadcast:"\u{1F4E3} Broadcast to all users",lbBroadcast:"Message text (FA or EN)",bcPh:"Message...",btnBroadcast:"\u{1F4E3} Send to all",hMatches:"\u26BD Upcoming Matches",btnRefreshM:"Refresh matches",hSettings:"\u2699\uFE0F Settings",lbTz:"Timezone",lbLeagues:"Leagues (comma-separated codes)",elNote:"EL & ECL are covered by SportScore \u2014 no need to add them.",lbTeams:"Selected teams per league",teamPh:"New team name",btnAdd:"+ Add",btnSave:"\u{1F4BE} Save settings",btnBackup:"\u2B07\uFE0F Backup settings",hPass:"\u{1F511} Change password",lbNp1:"New password (min 8 chars)",lbNp2:"Repeat new password",btnCp:"Change password",ver:"v12.33-xpost \u2014 X (Twitter) automated profile: OAuth 1.0a HMAC-SHA1 signing inline, Persian mirrors of coronation/FT/kickoff/weekly-tables, KV budget governor (450/month, 12/day), dry-run toggle + admin X status card",mToken:"Invalid login \u2014 wrong password or expired session",mErr:"Error: ",mEnterToken:"Enter the admin password",mSaved:"\u2705 Saved",mLoginFirst:"Log in first",mBackup:"\u2B07\uFE0F Backup downloaded",mPassShort:"Password must be at least 8 characters",mPassMismatch:"Passwords do not match",mPassOk:"\u{1F511} Password changed",mSentTo:"\u{1F4E3} Sent to %s of %s users",mTestSent:"\u{1F4E8} Test sent to %s users",mSimPrefix:"\u{1F9EA} Simulate: ",mNoNotif:"\u26A0\uFE0F No notifications sent",mNoMatches:"No matches ahead",mErrMatches:"Error loading matches",mEnterText:"Enter a message",mErrSrc:"\u274C error",acHint:"\u{1F4A1} As you type, the exact API club name is suggested \u2014 pick one to store it safely.",acNone:"No club with that name in the catalog",acAdd:"\u2705 %s added",acAddUcl:"\u2705 %s added \u2014 also selected for the Champions League",uclSync:"Clubs added in any league are auto-selected for the Champions League too",acDup:"\u26A0\uFE0F %s is already in this league",btnClubs:"\u{1F504} Refresh club list",clubsMeta:"Club catalog: %s clubs \u2014 last updated: %s",clubsNone:"\u26A0\uFE0F Club catalog not built yet \u2014 press Refresh",mClubs:"\u2705 Club list refreshed (%s clubs)",clubsErr:"\u274C Club list unavailable",hMembers:"\u{1F465} Bot Members",btnMembers:"\u{1F504} Refresh members",membersNone:"No members yet \u2014 users must /start the bot",memId:"ID",memSlug:"Username",memName:"Name",memJoined:"Joined",memCount:"%s members",hFai:"\u{1F9E0} Smart Farsi Club Names",faiHint:"New club names are translated incrementally via Workers AI and stored \u2014 the next visit shows them in Farsi.",faiMeta:"%s translated \u2014 %s pending",faiNone:"No translations learned yet \u2014 press the smart-translate button",btnFai:"\u{1F504} Smart translate (AI)",faiRun:"\u2705 %s new names translated",faiNoNew:"No new names to translate",faiOff:"\u26A0\uFE0F Workers AI binding not enabled",faiForget:"Latin club name (forget translation)",btnFaiForget:"Forget translation",hX:"\u{1F426} X (Twitter) Profile",xHint:"Automated mirror of the Telegram alerts to X \u2014 coronation, big-match results, kickoffs, and weekly tables as a thread. Budget: 450 posts/month, 12/day.",btnXTest:"\u{1F9EA} Test post",btnXRefresh:"\u{1F504} Refresh",btnXEnabled:"\u23F8\uFE0F Toggle ON/OFF",btnXDryRun:"\u{1F50F} Toggle dry-run",btnXClearPause:"\u26A0\uFE0F Clear 429 pause",lbXPhase:"Active phases (comma-separated: coronation,ft,kickoff,tables,media)",btnXPhase:"\u{1F4BE} Save phase",faiForgot:"\u2705 Translation for %s forgotten",faiNotfound:"\u26A0\uFE0F No translation found for %s",comps:{CL:"Champions League",PL:"Premier League",PD:"La Liga",SA:"Serie A",FL1:"Ligue 1",BL1:"Bundesliga",EL:"Europa League",ECL:"Conference League",FA_CUP:"FA Cup",EFL_CUP:"EFL Cup",CDR:"Copa del Rey",COPPA_ITALIA:"Coppa Italia",DFB_POKAL:"DFB Pokal"}}};
function curLang(){try{return localStorage.getItem("ucl_lang")||"fa";}catch(e){return "fa";}}
function T(k){var l=curLang(),d=I18N[l];return (d&&d[k])||I18N.fa[k]||k;}
function fmt(k){var s=T(k);for(var i=1;i<arguments.length;i++)s=s.replace("%s",arguments[i]).replace("%d",arguments[i]);return s;}
function trText(){var l=curLang();document.querySelectorAll("[data-i]").forEach(function(el){el.textContent=T(el.getAttribute("data-i"));});}
function trPlace(){document.querySelectorAll("[data-p]").forEach(function(el){el.setAttribute("placeholder",T(el.getAttribute("data-p")));});}
function initTheme(){try{return localStorage.getItem("ucl_theme")||"dark";}catch(e){return "dark";}}
function setTheme(t){document.documentElement.setAttribute("data-theme",t);try{localStorage.setItem("ucl_theme",t);}catch(e){}var b=document.getElementById("tbtn");if(b)b.textContent=t==="dark"?"\u{1F319}":"\u2600\uFE0F";}
function toggleTheme(){setTheme(document.documentElement.getAttribute("data-theme")==="dark"?"light":"dark");}
function switchLang(){var l=curLang()==="fa"?"en":"fa";try{localStorage.setItem("ucl_lang",l);}catch(e){}applyLang();}
function applyLang(skipHook){var l=curLang();document.documentElement.setAttribute("lang",l);document.documentElement.setAttribute("dir",l==="en"?"ltr":"rtl");var b=document.getElementById("lbtn");if(b)b.textContent=l==="en"?"\u0641\u0627":"EN";trText();trPlace();if(!skipHook&&typeof onLang==="function")onLang();}
function err(t){ var e=document.getElementById("err"); e.textContent=t; e.style.display="block"; }
async function doLogin(){
  var btn=document.getElementById("btnLogin");
  if(btn.disabled) return;
  var u=document.getElementById("user").value.trim();
  var p=document.getElementById("pass").value;
  if(!u){ err(T("errUser")); return; }
  btn.disabled=true;
  var r=await fetch("/admin/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({username:u,password:p})});
  if(r.status===429){ btn.disabled=false; err(T("errRate")); return; }
  if(!r.ok){ btn.disabled=false; err(T("errCreds")); return; }
  location.reload();
}
document.getElementById("pass").addEventListener("keydown",function(e){ if(e.key==="Enter") doLogin(); });
setTheme(initTheme()); applyLang(true);
<\/script>
</body></html>`;
var ADMIN_PAGE = `<!doctype html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<script>try{var t=localStorage.getItem("ucl_theme")||"dark",l=localStorage.getItem("ucl_lang")||"fa",d=document.documentElement;d.setAttribute("data-theme",t);d.setAttribute("lang",l);d.setAttribute("dir",l==="en"?"ltr":"rtl");}catch(e){}<\/script>
<title data-i="titleA">\u062A\u0646\u0638\u06CC\u0645\u0627\u062A \u0631\u0628\u0627\u062A \u0627\u0639\u0644\u0627\u0646 \u0645\u0633\u0627\u0628\u0642\u0627\u062A</title>
<style>@font-face{font-family:Vazirmatn;src:url('/fonts/Vazirmatn-Regular.woff2') format('woff2');font-weight:400;font-display:swap}@font-face{font-family:Vazirmatn;src:url('/fonts/Vazirmatn-SemiBold.woff2') format('woff2');font-weight:600;font-display:swap}@font-face{font-family:Vazirmatn;src:url('/fonts/Vazirmatn-Bold.woff2') format('woff2');font-weight:700;font-display:swap}@font-face{font-family:Vazirmatn;src:url('/fonts/Vazirmatn-ExtraBold.woff2') format('woff2');font-weight:800;font-display:swap}</style>
<style>
:root{color-scheme:dark;--bg:#0f172a;--card:#1e293b;--field:#0f172a;--text:#e2e8f0;--muted:#94a3b8;--border:#334155;--accent:#2563eb;--accent-strong:#1d4ed8;--link:#93c5fd;--score:#4ade80;--countdown:#93c5fd;--countdown-bg:rgba(96,165,250,.12);--danger:#f87171;--chip:#334155;--hover:rgba(148,163,184,.08);--footer:#94a3b8;--glass:rgba(30,41,59,.55);--glass-border:rgba(148,163,184,.16);--glass-hi:rgba(255,255,255,.07);--glass-shadow:0 8px 32px rgba(0,0,0,.35);--glow1:rgba(37,99,235,.17);--glow2:rgba(29,78,216,.11);--scrim:rgba(2,6,23,.62);--badge-top:#15803d;--badge-hot:#b45309;--badge-derby:#7e22ce;--badge-league:#334155;--badge-live:#22c55e}
[data-theme="light"]{color-scheme:light;--bg:#f8fafc;--card:#ffffff;--field:#f8fafc;--text:#0f172a;--muted:#64748b;--border:#e2e8f0;--accent:#2563eb;--accent-strong:#1d4ed8;--link:#1d4ed8;--score:#15803d;--countdown:#2563eb;--countdown-bg:rgba(37,99,235,.1);--danger:#dc2626;--chip:#e2e8f0;--hover:rgba(15,23,42,.045);--footer:#64748b;--glass:rgba(255,255,255,.62);--glass-border:rgba(15,23,42,.08);--glass-hi:rgba(255,255,255,.7);--glass-shadow:0 8px 32px rgba(15,23,42,.08);--glow1:rgba(37,99,235,.09);--glow2:rgba(96,165,250,.08);--scrim:rgba(248,250,252,.78);--badge-top:#15803d;--badge-hot:#b45309;--badge-derby:#7e22ce;--badge-league:#e2e8f0;--badge-live:#22c55e}
body{font-family:'Vazirmatn',system-ui,sans-serif;background-color:var(--bg);color:var(--text);max-width:760px;margin:0 auto;padding:24px 20px 36px;line-height:1.6;transition:background .25s,color .25s}body::before{content:"";position:fixed;inset:0;z-index:-1;background:radial-gradient(900px 520px at 88% -8%,var(--glow1),transparent 60%),radial-gradient(820px 620px at -12% 32%,var(--glow2),transparent 60%),linear-gradient(var(--scrim),var(--scrim)),url('/bg.jpg') center/cover no-repeat}
#topbar{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:22px}
#topbar button{background:var(--glass);-webkit-backdrop-filter:blur(10px) saturate(1.3);backdrop-filter:blur(10px) saturate(1.3);color:var(--text);border:1px solid var(--glass-border);border-radius:10px;padding:8px 14px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;transition:border-color .15s,transform .15s cubic-bezier(.16,1,.3,1),background .15s}
#topbar button:hover{border-color:var(--accent);background:var(--hover)}
#topbar button:active{transform:scale(.96)}
:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
h1{font-size:27px;font-weight:800;letter-spacing:-.01em}h2{font-size:15px;font-weight:700;margin:0 0 10px}
.card{background:var(--glass);-webkit-backdrop-filter:blur(16px) saturate(1.4);backdrop-filter:blur(16px) saturate(1.4);border:1px solid var(--glass-border);border-radius:16px;padding:18px;margin:14px 0;box-shadow:var(--glass-shadow),inset 0 1px 0 var(--glass-hi)}
input,button{font-size:14px;padding:9px 12px;border-radius:8px;border:1px solid var(--border);background:var(--field);color:var(--text);box-sizing:border-box}
input{width:100%;margin:4px 0 10px}
button{background:var(--accent);border:none;cursor:pointer;margin:4px 4px 0 0;color:#fff;transition:background .15s,transform .15s cubic-bezier(.16,1,.3,1)}
button:hover{background:var(--accent-strong)}
button:active{transform:scale(.98)}
.chip{display:inline-flex;align-items:center;gap:6px;background:var(--chip);border-radius:999px;padding:4px 12px;margin:4px 4px 0 0;font-size:13px}
.chip button{background:none;color:var(--muted);padding:0 2px;margin:0}
.chip button:hover{color:var(--danger)}
label{display:block;font-size:13px;color:var(--muted);margin:10px 0 2px}
.row{display:flex;gap:8px}.row input{flex:1}
/* v12.14: club-name autocomplete dropdown (attached to every "add club" input) */
.acwrap{position:relative}
.acbox{position:absolute;top:100%;left:0;right:0;margin-top:2px;z-index:6;background:var(--card);border:1px solid var(--border);border-radius:10px;box-shadow:var(--glass-shadow);max-height:262px;overflow-y:auto;display:none}
.acbox.open{display:block}
.acitem{display:flex;align-items:center;gap:8px;padding:8px 10px;font-size:13px;cursor:pointer;border-bottom:1px solid var(--border);flex-wrap:wrap}
.acitem:last-child,.acnone{border-bottom:none}
.acitem.hi,.acitem:hover{background:var(--hover)}
.acitem img{width:20px;height:20px;flex:0 0 20px;object-fit:contain}
.acitem img.noimg{visibility:hidden}
.acitem .nm{font-weight:600}
.acitem .sh{color:var(--muted);font-size:11px}
.acitem .lgs{margin-inline-start:auto;display:flex;gap:3px;flex:0 0 auto}
.acitem .lgs span{background:var(--chip);color:var(--muted);border-radius:5px;padding:1px 5px;font-size:10px;line-height:1.5}
.acnone{padding:8px 10px}
#clubsMeta{margin-top:6px}
#msg{position:fixed;bottom:16px;left:50%;transform:translateX(-50%);background:var(--score);color:#fff;padding:10px 20px;border-radius:10px;display:none;z-index:9}
#status{font-size:14px;line-height:1.9}
.muted{color:var(--muted);font-size:12px}
.match{display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border);font-size:13px;border-radius:8px}
.match:last-child{border-bottom:none}
.match:hover{background:var(--hover)}
.match .teams{font-weight:600}
.match .when{color:var(--muted);font-size:12px;text-align:left}
/* v12.16: bot members directory rows \u2014 telegram id / @slug / name / joined. */
.membox{max-height:330px;overflow-y:auto;border:1px solid var(--border);border-radius:10px;margin:2px 0 8px;background:var(--field)}
.memhead,.memrow{display:grid;grid-template-columns:110px 1fr 1fr 84px;gap:6px;align-items:center;padding:7px 10px;font-size:12px}
.memhead{position:sticky;top:0;background:var(--card);border-bottom:1px solid var(--border);font-weight:700;color:var(--muted);z-index:1}
.memrow{border-bottom:1px solid var(--border)}
.memrow:last-child{border-bottom:none}
.memrow:hover{background:var(--hover)}
.mid{font-variant-numeric:tabular-nums;font-weight:700;direction:ltr;text-align:left}
.slug{color:var(--link);direction:ltr;text-align:left;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.mname{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.mdate{color:var(--muted);font-size:11px;direction:ltr;text-align:left}
@media (max-width:600px){.memhead,.memrow{grid-template-columns:96px 1fr 70px}.memhead .hname,.memrow .mname{display:none}}
/* v12.17: AI-learned Farsi club names \u2014 sample list of learned pairs. */
.faibox{max-height:260px;overflow-y:auto;border:1px solid var(--border);border-radius:10px;margin:2px 0 8px;background:var(--field)}
.fairow{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:6px 10px;font-size:12px;border-bottom:1px solid var(--border)}
.fairow:last-child{border-bottom:none}
.fairow:hover{background:var(--hover)}
.fairow .fen{color:var(--muted);direction:ltr;text-align:left;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.fairow .ffa{font-weight:700;white-space:nowrap}
@media (max-width:600px){
body{padding:16px 12px 28px;background-attachment:scroll}
h1{font-size:23px}
.card{padding:14px 12px}
.row{flex-direction:column;gap:4px}
.row button{width:100%}
button{width:100%}
#topbar button{width:auto;padding:7px 12px}
.chip button{width:auto}
.match{flex-wrap:wrap;gap:4px;padding:8px 2px}
.match .when{width:100%;text-align:left}
#msg{left:12px;right:12px;transform:none;text-align:center}
}
@media (prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}}
@media (prefers-reduced-transparency:reduce){body{background:var(--bg)}.card,#topbar button,.bigbar,.viewtoggle,.msec,.stbox,.cupbox,.uclcard,.uclspot,#tzsel,#tzfilter{background:var(--card);-webkit-backdrop-filter:none;backdrop-filter:none;box-shadow:0 1px 2px rgba(15,23,42,.05)}}
</style>
</head>
<body>
<div id="topbar"><button id="lbtn" onclick="switchLang()"></button><button id="tbtn" onclick="toggleTheme()"></button></div>
<h1 data-i="h1A">\u2699\uFE0F \u062A\u0646\u0638\u06CC\u0645\u0627\u062A \u0631\u0628\u0627\u062A \u0627\u0639\u0644\u0627\u0646 \u0645\u0633\u0627\u0628\u0642\u0627\u062A</h1>
<div class="card">
<h2 data-i="hLogin">\u{1F511} \u0648\u0631\u0648\u062F</h2>
<div class="row"><input id="token" type="password" autocomplete="off" onkeydown="if(event.key==='Enter')login()" data-p="tokenPh"><button onclick="login()" data-i="btnLogin">\u0648\u0631\u0648\u062F</button></div>
</div>
<div class="card">
<h2 data-i="hStatus">\u{1F4CA} \u0648\u0636\u0639\u06CC\u062A</h2>
<div id="status">\u062F\u0631 \u062D\u0627\u0644 \u0628\u0627\u0631\u06AF\u0630\u0627\u0631\u06CC...</div>
<button id="btnRefresh" onclick="refreshStatus()" data-i="btnRefresh">\u0628\u0647\u200C\u0631\u0648\u0632\u0631\u0633\u0627\u0646\u06CC \u0648\u0636\u0639\u06CC\u062A</button>
<button id="btnTest" onclick="sendTest()" data-i="btnTest">\u{1F4E8} \u0627\u0631\u0633\u0627\u0644 \u067E\u06CC\u0627\u0645 \u062A\u0633\u062A</button>
<button id="btnSim" onclick="simulate()" data-i="btnSim">\u{1F9EA} \u0634\u0628\u06CC\u0647\u200C\u0633\u0627\u0632\u06CC \u06F5 \u0627\u0639\u0644\u0627\u0646</button>
<button onclick="checkSources()" data-i="btnSources">\u{1F4E1} \u0628\u0631\u0631\u0633\u06CC \u0645\u0646\u0627\u0628\u0639 API</button>
<button onclick="logout()" data-i="btnLogout">\u{1F6AA} \u062E\u0631\u0648\u062C</button>
</div>
<!-- v12.16: bot members directory \u2014 every chat that /start-ed the bot with
     its Telegram id, @username ("slug"), display name and join date (the
     user's ask). \u{1F504} re-fetches; unknown members are backfilled via getChat. -->
<div class="card">
<h2 data-i="hMembers">\u{1F465} \u0627\u0639\u0636\u0627\u06CC \u0631\u0628\u0627\u062A</h2>
<div id="members">\u062F\u0631 \u062D\u0627\u0644 \u0628\u0627\u0631\u06AF\u0630\u0627\u0631\u06CC...</div>
<button id="btnMembers" onclick="loadMembers(true)" data-i="btnMembers">\u{1F504} \u0628\u0647\u200C\u0631\u0648\u0632\u0631\u0633\u0627\u0646\u06CC \u0627\u0639\u0636\u0627</button>
</div>
<!-- v12.17: AI-learned Farsi club names (Cloudflare Workers AI). New club
     names the static dict misses are translated incrementally (one batched
     AI call), validated, stored in KV and served from the next payload
     build. \u{1F504} forces a learning round now; the input forgets a bad learned
     translation so the next round re-asks (or the dict stays English). -->
<div class="card">
<h2 data-i="hFai">\u{1F9E0} \u062A\u0631\u062C\u0645\u0647 \u0647\u0648\u0634\u0645\u0646\u062F \u0646\u0627\u0645 \u0628\u0627\u0634\u06AF\u0627\u0647\u200C\u0647\u0627</h2>
<div class="muted" data-i="faiHint">\u0646\u0627\u0645\u200C\u0647\u0627\u06CC \u062C\u062F\u06CC\u062F \u0628\u0647\u200C\u062A\u062F\u0631\u06CC\u062C \u0628\u0627 Workers AI \u062A\u0631\u062C\u0645\u0647 \u0648 \u0630\u062E\u06CC\u0631\u0647 \u0645\u06CC\u200C\u0634\u0648\u0646\u062F \u2014 \u0627\u0632 \u0628\u0627\u0631 \u0628\u0639\u062F \u0645\u0633\u062A\u0642\u06CC\u0645 \u0641\u0627\u0631\u0633\u06CC \u0646\u0645\u0627\u06CC\u0634 \u062F\u0627\u062F\u0647 \u0645\u06CC\u200C\u0634\u0648\u0646\u062F.</div>
<div id="fai">\u062F\u0631 \u062D\u0627\u0644 \u0628\u0627\u0631\u06AF\u0630\u0627\u0631\u06CC...</div>
<button id="btnFai" onclick="loadFai(true)" data-i="btnFai">\u{1F504} \u062A\u0631\u062C\u0645\u0647 \u0647\u0648\u0634\u0645\u0646\u062F (AI)</button>
<div class="row" style="margin-top:8px">
<input id="faiForget" data-p="faiForget">
<button onclick="forgetFai()" data-i="btnFaiForget">\u062D\u0630\u0641 \u062A\u0631\u062C\u0645\u0647</button>
</div>
</div>
<div class="card">
<h2 data-i="hBroadcast">\u{1F4E3} \u0627\u0631\u0633\u0627\u0644 \u067E\u06CC\u0627\u0645 \u0628\u0647 \u0647\u0645\u0647 \u06A9\u0627\u0631\u0628\u0631\u0627\u0646</h2>
<label data-i="lbBroadcast">\u0645\u062A\u0646 \u067E\u06CC\u0627\u0645 (\u0628\u0647 \u0641\u0627\u0631\u0633\u06CC \u06CC\u0627 \u0627\u0646\u06AF\u0644\u06CC\u0633\u06CC)</label>
<input id="broadcastText" data-p="bcPh">
<button id="btnBroadcast" onclick="broadcast()" data-i="btnBroadcast">\u{1F4E3} \u0627\u0631\u0633\u0627\u0644 \u0628\u0631\u0627\u06CC \u0647\u0645\u0647</button>
</div>
<!-- v12.33-xpost: X (Twitter) automated profile — status card + test post +
     dry-run toggle + phase config. The card is powered by /api/x/* admin
     routes. The status line shows enabled / dry-run / paused / phase /
     monthly+daily budget counters / last post + last error. -->
<div class="card">
<h2 data-i="hX">\u{1F426} \u067E\u0631\u0648\u0641\u0627\u06CC\u0644 X (\u062A\u0648\u06CC\u06CC\u062A\u0631)</h2>
<div class="muted" data-i="xHint">\u0622\u06CC\u0646\u0647\u200C\u06CC \u062E\u0648\u062F\u06A9\u0627\u0631 \u0627\u0639\u0644\u0627\u0646\u200C\u0647\u0627\u06CC \u062A\u0644\u06AF\u0631\u0627\u0645 \u062F\u0631 X \u2014 \u0635\u062F\u0631\u0646\u0634\u06CC\u0646\u060C \u0646\u062A\u06CC\u062C\u0647 \u0628\u0627\u0632\u06CC\u200C\u0647\u0627\u06CC \u0628\u0632\u0631\u06AF\u060C \u0634\u0631\u0648\u0639 \u0628\u0627\u0632\u06CC \u0648 \u062C\u062F\u0648\u0644 \u0647\u0641\u062A\u06AF\u06CC \u062F\u0631 \u0633\u0631\u06CC \u067E\u0627\u0633\u062E\u200C\u0647\u0627. \u0645\u062D\u062F\u0648\u062F\u06AF\u0631 \u0628\u0648\u062F\u062C\u0647: \u06F4\u06F5\u06F0 \u067E\u0633\u062A \u0645\u0627\u0647\u0627\u0646\u0647\u060C \u06F1\u06F2 \u0631\u0648\u0632\u0627\u0646\u0647.</div>
<div id="xStatus" style="margin-top:8px">\u062F\u0631 \u062D\u0627\u0644 \u0628\u0627\u0631\u06AF\u0630\u0627\u0631\u06CC...</div>
<div class="row" style="margin-top:8px;flex-wrap:wrap;gap:8px">
<button id="btnXTest" onclick="xTest()" data-i="btnXTest">\u{1F9EA} \u067E\u0633\u062A \u062A\u0633\u062A</button>
<button id="btnXRefresh" onclick="loadXStatus()" data-i="btnXRefresh">\u{1F504} \u0628\u0647\u200C\u0631\u0648\u0632\u0631\u0633\u0627\u0646\u06CC</button>
<button id="btnXEnabled" onclick="xToggleEnabled()" data-i="btnXEnabled">\u23F8\uFE0F \u062A\u0648\u0642\u0641/\u0631\u0648\u0634\u0646</button>
<button id="btnXDryRun" onclick="xToggleDryRun()" data-i="btnXDryRun">\u{1F50F} \u062D\u0627\u0644\u062A dry-run</button>
<button id="btnXClearPause" onclick="xClearPause()" data-i="btnXClearPause" style="display:none">\u26A0\uFE0F \u067E\u0627\u06A9 \u062A\u0648\u0642\u0641 (429)</button>
</div>
<label data-i="lbXPhase" style="margin-top:8px;display:block">\u0641\u0627\u0632 \u0647\u0627\u06CC \u0641\u0639\u0627\u0644 (\u0628\u0627 \u06A9\u0627\u0645\u0627: coronation,ft,kickoff,tables,media)</label>
<input id="xPhase" placeholder="coronation,ft" style="width:100%;box-sizing:border-box;margin-top:4px">
<button id="btnXPhase" onclick="xSavePhase()" data-i="btnXPhase">\u{1F4BE} \u0630\u062E\u06CC\u0631\u0647 \u0641\u0627\u0632</button>
</div>
<div class="card">
<h2 data-i="hMatches">\u26BD \u0645\u0633\u0627\u0628\u0642\u0627\u062A \u067E\u06CC\u0634\u200C\u0631\u0648</h2>
<div id="matches">\u062F\u0631 \u062D\u0627\u0644 \u0628\u0627\u0631\u06AF\u0630\u0627\u0631\u06CC...</div>
<button onclick="loadNextMatches()" data-i="btnRefreshM">\u0628\u0647\u200C\u0631\u0648\u0632\u0631\u0633\u0627\u0646\u06CC \u0645\u0633\u0627\u0628\u0642\u0627\u062A</button>
</div>
<div class="card">
<h2 data-i="hSettings">\u2699\uFE0F \u062A\u0646\u0638\u06CC\u0645\u0627\u062A</h2>
<label data-i="lbTz">\u0645\u0646\u0637\u0642\u0647 \u0632\u0645\u0627\u0646\u06CC</label>
<input id="tz" placeholder="Asia/Tehran">
<label data-i="lbLeagues">\u0644\u06CC\u06AF\u200C\u0647\u0627\u06CC \u062A\u062D\u062A \u067E\u0648\u0634\u0634 (\u06A9\u062F\u0647\u0627 \u0628\u0627 \u06A9\u0627\u0645\u0627)</label>
<input id="leagues" placeholder="CL,PL,PD,SA,FL1">
<div class="muted" data-i="elNote">EL \u0648 ECL \u062A\u0648\u0633\u0637 SportScore \u067E\u0648\u0634\u0634 \u062F\u0627\u062F\u0647 \u0645\u06CC\u200C\u0634\u0648\u0646\u062F \u0648 \u0646\u06CC\u0627\u0632\u06CC \u0628\u0647 \u0627\u0641\u0632\u0648\u062F\u0646 \u0646\u062F\u0627\u0631\u0646\u062F.</div>
<label data-i="lbTeams">\u062A\u06CC\u0645\u200C\u0647\u0627\u06CC \u0645\u0646\u062A\u062E\u0628 \u0647\u0631 \u0644\u06CC\u06AF</label>
<div id="teams"></div>
<div class="muted" data-i="acHint">\u{1F4A1} \u0647\u0646\u06AF\u0627\u0645 \u062A\u0627\u06CC\u067E\u060C \u0646\u0627\u0645 \u062F\u0642\u06CC\u0642 \u0628\u0627\u0634\u06AF\u0627\u0647 \u0627\u0632 \u0641\u0647\u0631\u0633\u062A API \u067E\u06CC\u0634\u0646\u0647\u0627\u062F \u0645\u06CC\u200C\u0634\u0648\u062F</div>
<div class="muted" id="clubsMeta"></div>
<button id="btnClubs" onclick="refreshClubs()" data-i="btnClubs">\u{1F504} \u0628\u0647\u200C\u0631\u0648\u0632\u0631\u0633\u0627\u0646\u06CC \u0641\u0647\u0631\u0633\u062A \u0628\u0627\u0634\u06AF\u0627\u0647\u200C\u0647\u0627</button>
<button onclick="save()" data-i="btnSave">\u{1F4BE} \u0630\u062E\u06CC\u0631\u0647 \u062A\u0646\u0638\u06CC\u0645\u0627\u062A</button>
<button onclick="backup()" data-i="btnBackup">\u2B07\uFE0F \u067E\u0634\u062A\u06CC\u0628\u0627\u0646\u200C\u06AF\u06CC\u0631\u06CC \u062A\u0646\u0638\u06CC\u0645\u0627\u062A</button>
</div>
<div class="card">
<h2 data-i="hPass">\u{1F511} \u062A\u063A\u06CC\u06CC\u0631 \u0631\u0645\u0632 \u0639\u0628\u0648\u0631</h2>
<label data-i="lbNp1">\u0631\u0645\u0632 \u062C\u062F\u06CC\u062F (\u062D\u062F\u0627\u0642\u0644 \u06F8 \u06A9\u0627\u0631\u0627\u06A9\u062A\u0631)</label>
<input id="np1" type="password" autocomplete="new-password">
<label data-i="lbNp2">\u062A\u06A9\u0631\u0627\u0631 \u0631\u0645\u0632 \u062C\u062F\u06CC\u062F</label>
<input id="np2" type="password" autocomplete="new-password">
<button onclick="changePass()" data-i="btnCp">\u062A\u063A\u06CC\u06CC\u0631 \u0631\u0645\u0632 \u0639\u0628\u0648\u0631</button>
</div>
<div class="muted" data-i="ver">\u0646\u0633\u062E\u0647 \u06F1\u06F2.\u06F3\u06F1 \u2014 \u0646\u0642\u0637\u0647\u200C\u0647\u0627\u06CC \u0627\u0634\u062A\u0631\u0627\u06A9 \u0628\u0647 \u06AF\u0648\u0634\u0647\u0654 \u0628\u0627\u0644\u0627 \u0631\u0641\u062A\u0646\u062F\u060C \u062A\u0627\u0631\u06CC\u062E \u0628\u0627\u0632\u06CC \u062F\u0627\u062E\u0644 \u0646\u0648\u0627\u0631 \u0633\u0631\u0645\u0647\u200C\u0627\u06CC\u060C \u0646\u0634\u0627\u0646 \u0635\u062F\u0631 \u062C\u062F\u0648\u0644 \u062A\u062E\u062A \u0634\u062F \u0648 \u0646\u0634\u0627\u0646 \u0631\u0633\u0645\u06CC \u0644\u06CC\u06AF \u0642\u0647\u0631\u0645\u0627\u0646\u0627\u0646 \u0622\u0645\u062F</div>
<div id="msg" role="status" aria-live="polite"></div>
<script>
var I18N={
fa:{title:"\u0645\u0633\u0627\u0628\u0642\u0627\u062A \u067E\u06CC\u0634\u200C\u0631\u0648 \u2014 \u0627\u0639\u0644\u0627\u0646\u200C\u062F\u0647\u0646\u062F\u0647 \u0645\u0633\u0627\u0628\u0642\u0627\u062A",h1:"\u26BD \u0627\u0639\u0644\u0627\u0646\u200C\u062F\u0647\u0646\u062F\u0647 \u0645\u0633\u0627\u0628\u0642\u0627\u062A",sub1:"\u0645\u0633\u0627\u0628\u0642\u0627\u062A \u067E\u06CC\u0634\u200C\u0631\u0648\u060C \u0631\u0642\u0627\u0628\u062A\u200C\u0647\u0627\u06CC \u0635\u062F\u0631 \u062C\u062F\u0648\u0644 \u0648 \u0646\u062A\u0627\u06CC\u062C \u062A\u06CC\u0645\u200C\u0647\u0627\u06CC \u0645\u0646\u062A\u062E\u0628 \u2014 \u0628\u0647\u200C\u0631\u0648\u0632\u0631\u0633\u0627\u0646\u06CC \u062E\u0648\u062F\u06A9\u0627\u0631",join:"\u0639\u0636\u0648\u06CC\u062A \u062F\u0631 \u0631\u0628\u0627\u062A \u062A\u0644\u06AF\u0631\u0627\u0645",hUpcoming:"\u{1F4C5} \u0645\u0633\u0627\u0628\u0642\u0627\u062A \u067E\u06CC\u0634\u200C\u0631\u0648",hFinished:"\u{1F3C1} \u0646\u062A\u0627\u06CC\u062C \u0627\u062E\u06CC\u0631",hLive:"\u{1F534} \u0645\u0633\u0627\u0628\u0642\u0627\u062A \u0632\u0646\u062F\u0647",loading:"\u062F\u0631 \u062D\u0627\u0644 \u0628\u0627\u0631\u06AF\u0630\u0627\u0631\u06CC...",noMatches:"\u0645\u0633\u0627\u0628\u0642\u0647\u200C\u0627\u06CC \u062F\u0631 \u0631\u0627\u0647 \u0646\u06CC\u0633\u062A",errLoad:"\u062E\u0637\u0627 \u062F\u0631 \u062F\u0631\u06CC\u0627\u0641\u062A \u062F\u0627\u062F\u0647\u200C\u0647\u0627",madeWith:"\u0633\u0627\u062E\u062A\u0647\u200C\u0634\u062F\u0647 \u0628\u0627 \u2764\uFE0F",adminLink:"\u0648\u0631\u0648\u062F \u0645\u062F\u06CC\u0631\u06CC\u062A",botLink:"\u0631\u0628\u0627\u062A \u062A\u0644\u06AF\u0631\u0627\u0645",soon:"\u0628\u0647\u200C\u0632\u0648\u062F\u06CC",inDays:"\u062F\u0631 %d \u0631\u0648\u0632",barNext:"\u26A1 \u062A\u0627 \u0628\u0627\u0632\u06CC \u0628\u0632\u0631\u06AF \u0628\u0639\u062F\u06CC",barFallback:"\u23F3 \u062A\u0627 \u0645\u0633\u0627\u0628\u0642\u0647 \u0628\u0639\u062F\u06CC",barLive:"\u{1F534} \u062F\u0631 \u062C\u0631\u06CC\u0627\u0646",barIdle:"\u23F3 \u062F\u0631 \u0627\u0646\u062A\u0638\u0627\u0631 \u0628\u0627\u0632\u06CC \u0628\u0639\u062F\u06CC",barBase:"\u0646\u0648\u0627\u0631 \u067E\u06CC\u0634\u0631\u0641\u062A \u062F\u0631 \u06F2\u06F4 \u0633\u0627\u0639\u062A \u067E\u0627\u06CC\u0627\u0646\u06CC \u0642\u0628\u0644 \u0627\u0632 \u0634\u0631\u0648\u0639 \u0628\u0627\u0632\u06CC \u067E\u0631 \u0645\u06CC\u200C\u0634\u0648\u062F \u0648 \u062F\u0631 \u0634\u0631\u0648\u0639 \u0628\u0627\u0632\u06CC \u0628\u0647 \u06F1\u06F0\u06F0\u066A \u0645\u06CC\u200C\u0631\u0633\u062F",uDay:"\u0631\u0648\u0632",uHour:"\u0633\u0627\u0639\u062A",uMin:"\u062F\u0642\u06CC\u0642\u0647",uSec:"\u062B\u0627\u0646\u06CC\u0647",live:"\u062F\u0631 \u062D\u0627\u0644 \u0628\u0631\u06AF\u0632\u0627\u0631\u06CC",pen:"\u067E\u0646\u0627\u0644\u062A\u06CC",own:"\u06AF\u0644 \u0628\u0647 \u062E\u0648\u062F\u06CC",derby:"\u{1F525} \u062F\u0631\u0628\u06CC",boxCl:"\u{1F3C6} \u0644\u06CC\u06AF \u0642\u0647\u0631\u0645\u0627\u0646\u0627\u0646 \u0627\u0631\u0648\u067E\u0627",boxCup:"\u{1F3C6} \u062C\u0627\u0645\u200C\u0647\u0627\u06CC \u062D\u0630\u0641\u06CC",boxLg:"\u26BD \u0644\u06CC\u06AF\u200C\u0647\u0627\u06CC \u062F\u0627\u062E\u0644\u06CC",viewBig:"\u26A1 \u0641\u0642\u0637 \u0628\u0627\u0632\u06CC\u0647\u0627\u06CC \u0628\u0632\u0631\u06AF",viewAll:"\u0647\u0645\u0647 \u0628\u0627\u0632\u06CC\u0647\u0627",hStandings:"\u{1F4CA} \u062C\u062F\u0648\u0644 \u0644\u06CC\u06AF\u200C\u0647\u0627",hCups:"\u{1F3C6} \u062C\u0627\u0645\u200C\u0647\u0627\u06CC \u062D\u0630\u0641\u06CC",stEmpty:"\u062C\u062F\u0648\u0644 \u0647\u0646\u0648\u0632 \u062F\u0631 \u062F\u0633\u062A\u0631\u0633 \u0646\u06CC\u0633\u062A",stNot:"\u0634\u0631\u0648\u0639 \u0646\u0634\u062F\u0647",tierGold:"\u{1F947} \u0633\u0637\u062D \u0637\u0644\u0627 \u2014 \u0627\u0631\u0648\u067E\u0627 \u0648 \u0628\u06CC\u0646\u0627\u0644\u0645\u0644\u0644",tierSilver:"\u{1F948} \u0633\u0637\u062D \u0646\u0642\u0631\u0647 \u2014 \u0627\u0631\u0648\u067E\u0627",tierBronze:"\u{1F949} \u0633\u0637\u062D \u0628\u0631\u0646\u0632 \u2014 \u0627\u0631\u0648\u067E\u0627",cEN:"\u{1F3F4} \u0627\u0646\u06AF\u0644\u0633\u062A\u0627\u0646",cES:"\u{1F1EA}\u{1F1F8} \u0627\u0633\u067E\u0627\u0646\u06CC\u0627",cIT:"\u{1F1EE}\u{1F1F9} \u0627\u06CC\u062A\u0627\u0644\u06CC\u0627",cupsNone:"\u062F\u0631 \u0627\u0646\u062A\u0638\u0627\u0631 \u0628\u0631\u0646\u0627\u0645\u0647",share:"\u0627\u0634\u062A\u0631\u0627\u06A9\u200C\u06AF\u0630\u0627\u0631\u06CC",copy:"\u06A9\u067E\u06CC \u0645\u062A\u0646",copied:"\u06A9\u067E\u06CC \u0634\u062F \u2713",titleL:"\u0648\u0631\u0648\u062F \u2014 \u0645\u062F\u06CC\u0631\u06CC\u062A \u0631\u0628\u0627\u062A",loginH1:"\u{1F510} \u0648\u0631\u0648\u062F \u0628\u0647 \u0645\u062F\u06CC\u0631\u06CC\u062A \u0631\u0628\u0627\u062A",lbUser:"\u0646\u0627\u0645 \u06A9\u0627\u0631\u0628\u0631\u06CC",lbPass:"\u0631\u0645\u0632 \u0639\u0628\u0648\u0631",btnLogin:"\u0648\u0631\u0648\u062F",errUser:"\u0646\u0627\u0645 \u06A9\u0627\u0631\u0628\u0631\u06CC \u0631\u0627 \u0648\u0627\u0631\u062F \u06A9\u0646\u06CC\u062F",errRate:"\u062A\u0644\u0627\u0634 \u0628\u06CC\u0634 \u0627\u0632 \u062D\u062F \u2014 \u0686\u0646\u062F \u062F\u0642\u06CC\u0642\u0647 \u062F\u06CC\u06AF\u0631 \u0627\u0645\u062A\u062D\u0627\u0646 \u06A9\u0646\u06CC\u062F",errCreds:"\u0646\u0627\u0645 \u06A9\u0627\u0631\u0628\u0631\u06CC \u06CC\u0627 \u0631\u0645\u0632 \u0627\u0634\u062A\u0628\u0627\u0647 \u0627\u0633\u062A",titleA:"\u062A\u0646\u0638\u06CC\u0645\u0627\u062A \u0631\u0628\u0627\u062A \u0627\u0639\u0644\u0627\u0646 \u0645\u0633\u0627\u0628\u0642\u0627\u062A",h1A:"\u2699\uFE0F \u062A\u0646\u0638\u06CC\u0645\u0627\u062A \u0631\u0628\u0627\u062A \u0627\u0639\u0644\u0627\u0646 \u0645\u0633\u0627\u0628\u0642\u0627\u062A",hLogin:"\u{1F511} \u0648\u0631\u0648\u062F",tokenPh:"\u0631\u0645\u0632 \u0639\u0628\u0648\u0631 \u0645\u062F\u06CC\u0631\u06CC\u062A (admin password)",hStatus:"\u{1F4CA} \u0648\u0636\u0639\u06CC\u062A",stLoading:"\u062F\u0631 \u062D\u0627\u0644 \u0628\u0627\u0631\u06AF\u0630\u0627\u0631\u06CC...",stErr:"\u274C \u062E\u0637\u0627 \u062F\u0631 \u062F\u0631\u06CC\u0627\u0641\u062A \u0648\u0636\u0639\u06CC\u062A \u2014 \u062F\u0648\u0628\u0627\u0631\u0647 \u0648\u0627\u0631\u062F \u0634\u0648\u06CC\u062F \u06CC\u0627 \u062A\u0648\u06A9\u0646 \u0631\u0627 \u0628\u0631\u0631\u0633\u06CC \u06A9\u0646\u06CC\u062F",stLastRun:"\u{1F552} \u0622\u062E\u0631\u06CC\u0646 \u0627\u062C\u0631\u0627",stApi:"\u{1F4E1} \u0645\u0646\u0628\u0639 API",stUsers:"\u{1F465} \u06A9\u0627\u0631\u0628\u0631\u0627\u0646",stIds:"\u{1F194} \u0634\u0646\u0627\u0633\u0647\u200C\u0647\u0627",stTz:"\u{1F30D} \u0645\u0646\u0637\u0642\u0647 \u0632\u0645\u0627\u0646\u06CC",btnRefresh:"\u0628\u0647\u200C\u0631\u0648\u0632\u0631\u0633\u0627\u0646\u06CC \u0648\u0636\u0639\u06CC\u062A",btnTest:"\u{1F4E8} \u0627\u0631\u0633\u0627\u0644 \u067E\u06CC\u0627\u0645 \u062A\u0633\u062A",btnSim:"\u{1F9EA} \u0634\u0628\u06CC\u0647\u200C\u0633\u0627\u0632\u06CC \u06F5 \u0627\u0639\u0644\u0627\u0646",btnSources:"\u{1F4E1} \u0628\u0631\u0631\u0633\u06CC \u0645\u0646\u0627\u0628\u0639 API",btnLogout:"\u{1F6AA} \u062E\u0631\u0648\u062C",hBroadcast:"\u{1F4E3} \u0627\u0631\u0633\u0627\u0644 \u067E\u06CC\u0627\u0645 \u0628\u0647 \u0647\u0645\u0647 \u06A9\u0627\u0631\u0628\u0631\u0627\u0646",lbBroadcast:"\u0645\u062A\u0646 \u067E\u06CC\u0627\u0645 (\u0628\u0647 \u0641\u0627\u0631\u0633\u06CC \u06CC\u0627 \u0627\u0646\u06AF\u0644\u06CC\u0633\u06CC)",bcPh:"\u0645\u062A\u0646 \u067E\u06CC\u0627\u0645...",btnBroadcast:"\u{1F4E3} \u0627\u0631\u0633\u0627\u0644 \u0628\u0631\u0627\u06CC \u0647\u0645\u0647",hMatches:"\u26BD \u0645\u0633\u0627\u0628\u0642\u0627\u062A \u067E\u06CC\u0634\u200C\u0631\u0648",btnRefreshM:"\u0628\u0647\u200C\u0631\u0648\u0632\u0631\u0633\u0627\u0646\u06CC \u0645\u0633\u0627\u0628\u0642\u0627\u062A",hSettings:"\u2699\uFE0F \u062A\u0646\u0638\u06CC\u0645\u0627\u062A",lbTz:"\u0645\u0646\u0637\u0642\u0647 \u0632\u0645\u0627\u0646\u06CC",lbLeagues:"\u0644\u06CC\u06AF\u200C\u0647\u0627\u06CC \u062A\u062D\u062A \u067E\u0648\u0634\u0634 (\u06A9\u062F\u0647\u0627 \u0628\u0627 \u06A9\u0627\u0645\u0627)",elNote:"EL \u0648 ECL \u062A\u0648\u0633\u0637 SportScore \u067E\u0648\u0634\u0634 \u062F\u0627\u062F\u0647 \u0645\u06CC\u200C\u0634\u0648\u0646\u062F \u0648 \u0646\u06CC\u0627\u0632\u06CC \u0628\u0647 \u0627\u0641\u0632\u0648\u062F\u0646 \u0646\u062F\u0627\u0631\u0646\u062F.",lbTeams:"\u062A\u06CC\u0645\u200C\u0647\u0627\u06CC \u0645\u0646\u062A\u062E\u0628 \u0647\u0631 \u0644\u06CC\u06AF",teamPh:"\u0646\u0627\u0645 \u062A\u06CC\u0645 \u062C\u062F\u06CC\u062F",btnAdd:"+ \u0627\u0641\u0632\u0648\u062F\u0646",btnSave:"\u{1F4BE} \u0630\u062E\u06CC\u0631\u0647 \u062A\u0646\u0638\u06CC\u0645\u0627\u062A",btnBackup:"\u2B07\uFE0F \u067E\u0634\u062A\u06CC\u0628\u0627\u0646\u200C\u06AF\u06CC\u0631\u06CC \u062A\u0646\u0638\u06CC\u0645\u0627\u062A",hPass:"\u{1F511} \u062A\u063A\u06CC\u06CC\u0631 \u0631\u0645\u0632 \u0639\u0628\u0648\u0631",lbNp1:"\u0631\u0645\u0632 \u062C\u062F\u06CC\u062F (\u062D\u062F\u0627\u0642\u0644 \u06F8 \u06A9\u0627\u0631\u0627\u06A9\u062A\u0631)",lbNp2:"\u062A\u06A9\u0631\u0627\u0631 \u0631\u0645\u0632 \u062C\u062F\u06CC\u062F",btnCp:"\u062A\u063A\u06CC\u06CC\u0631 \u0631\u0645\u0632 \u0639\u0628\u0648\u0631",ver:"\u0646\u0633\u062E\u0647 \u06F1\u06F2.\u06F3\u06F3-xpost \u2014 \u067E\u0631\u0648\u0641\u0627\u06CC\u0644 \u062E\u0648\u062F\u06A9\u0627\u0631 X\u060C \u0627\u0645\u0636\u0627\u06CC OAuth 1.0a \u0628\u0627 HMAC-SHA1\u060C \u0622\u06CC\u0646\u0647\u200C\u06CC \u0641\u0627\u0631\u0633\u06CC \u0627\u0639\u0644\u0627\u0646\u200C\u0647\u0627\u06CC \u0635\u062F\u0631\u0646\u0634\u06CC\u0646\u060C \u0646\u062A\u06CC\u062C\u0647\u060C \u0634\u0631\u0648\u0639 \u0628\u0627\u0632\u06CC \u0648 \u062C\u062F\u0648\u0644 \u0647\u0641\u062A\u06AF\u06CC\u060C \u0645\u062D\u062F\u0648\u062F\u06AF\u0631 \u0628\u0648\u062F\u062C\u0647 KV (\u06F4\u06F5\u06F0 \u0645\u0627\u0647\u0627\u0646\u0647\u060C \u06F1\u06F2 \u0631\u0648\u0632\u0627\u0646\u0647)\u060C \u062D\u0627\u0644\u062A dry-run \u0648 \u06A9\u0627\u0631\u062A \u0648\u0636\u0639\u06CC\u062A X \u062F\u0631 \u067E\u0646\u0644 \u0645\u062F\u06CC\u0631\u06CC\u062A",mToken:"\u0648\u0631\u0648\u062F \u0646\u0627\u0645\u0639\u062A\u0628\u0631 \u2014 \u0631\u0645\u0632 \u0639\u0628\u0648\u0631 \u06CC\u0627 \u0646\u0634\u0633\u062A \u0645\u0646\u0642\u0636\u06CC \u0634\u062F\u0647",mErr:"\u062E\u0637\u0627: ",mEnterToken:"\u0631\u0645\u0632 \u0639\u0628\u0648\u0631 \u0631\u0627 \u0648\u0627\u0631\u062F \u06A9\u0646\u06CC\u062F",mSaved:"\u2705 \u0630\u062E\u06CC\u0631\u0647 \u0634\u062F",mLoginFirst:"\u0627\u0628\u062A\u062F\u0627 \u0648\u0627\u0631\u062F \u0634\u0648\u06CC\u062F",mBackup:"\u2B07\uFE0F \u067E\u0634\u062A\u06CC\u0628\u0627\u0646\u200C\u06AF\u06CC\u0631\u06CC \u0634\u062F",mPassShort:"\u0631\u0645\u0632 \u0628\u0627\u06CC\u062F \u062D\u062F\u0627\u0642\u0644 \u06F8 \u06A9\u0627\u0631\u0627\u06A9\u062A\u0631 \u0628\u0627\u0634\u062F",mPassMismatch:"\u0631\u0645\u0632\u0647\u0627 \u06CC\u06A9\u0633\u0627\u0646 \u0646\u06CC\u0633\u062A\u0646\u062F",mPassOk:"\u{1F511} \u0631\u0645\u0632 \u0628\u0627 \u0645\u0648\u0641\u0642\u06CC\u062A \u062A\u063A\u06CC\u06CC\u0631 \u06A9\u0631\u062F",mSentTo:"\u{1F4E3} \u0627\u0631\u0633\u0627\u0644 \u0634\u062F \u0628\u0647 %s \u0627\u0632 %s \u06A9\u0627\u0631\u0628\u0631",mTestSent:"\u{1F4E8} \u062A\u0633\u062A \u0627\u0631\u0633\u0627\u0644 \u0634\u062F \u0628\u0647 %s \u06A9\u0627\u0631\u0628\u0631",mSimPrefix:"\u{1F9EA} \u0634\u0628\u06CC\u0647\u200C\u0633\u0627\u0632\u06CC: ",mNoNotif:"\u26A0\uFE0F \u0647\u06CC\u0686 \u0627\u0639\u0644\u0627\u0646\u06CC \u0627\u0631\u0633\u0627\u0644 \u0646\u0634\u062F",mNoMatches:"\u0645\u0633\u0627\u0628\u0642\u0647\u200C\u0627\u06CC \u062F\u0631 \u0631\u0627\u0647 \u0646\u06CC\u0633\u062A",mErrMatches:"\u062E\u0637\u0627 \u062F\u0631 \u062F\u0631\u06CC\u0627\u0641\u062A \u0645\u0633\u0627\u0628\u0642\u0627\u062A",mEnterText:"\u0645\u062A\u0646 \u067E\u06CC\u0627\u0645 \u0631\u0627 \u0648\u0627\u0631\u062F \u06A9\u0646\u06CC\u062F",mErrSrc:"\u274C \u062E\u0637\u0627",acHint:"\u{1F4A1} \u0647\u0646\u06AF\u0627\u0645 \u062A\u0627\u06CC\u067E\u060C \u0646\u0627\u0645 \u062F\u0642\u06CC\u0642 \u0628\u0627\u0634\u06AF\u0627\u0647 \u0627\u0632 \u0641\u0647\u0631\u0633\u062A API \u067E\u06CC\u0634\u0646\u0647\u0627\u062F \u0645\u06CC\u200C\u0634\u0648\u062F \u2014 \u0628\u0631\u0627\u06CC \u062B\u0628\u062A \u0628\u06CC\u200C\u062E\u0637\u0627 \u06CC\u06A9\u06CC \u0631\u0627 \u0627\u0646\u062A\u062E\u0627\u0628 \u06A9\u0646\u06CC\u062F.",acNone:"\u0628\u0627\u0634\u06AF\u0627\u0647\u06CC \u0628\u0627 \u0627\u06CC\u0646 \u0646\u0627\u0645 \u062F\u0631 \u0641\u0647\u0631\u0633\u062A \u0646\u06CC\u0633\u062A",acAdd:"\u2705 %s \u0627\u0641\u0632\u0648\u062F\u0647 \u0634\u062F",acAddUcl:"\u2705 %s \u0627\u0641\u0632\u0648\u062F\u0647 \u0634\u062F \u2014 \u0628\u0631\u0627\u06CC \u0644\u06CC\u06AF \u0642\u0647\u0631\u0645\u0627\u0646\u0627\u0646 \u0627\u0631\u0648\u067E\u0627 \u0647\u0645 \u0627\u0646\u062A\u062E\u0627\u0628 \u0634\u062F",uclSync:"\u0628\u0627\u0634\u06AF\u0627\u0647\u200C\u0647\u0627\u06CC \u0647\u0631 \u0644\u06CC\u06AF \u0628\u0647\u200C\u0635\u0648\u0631\u062A \u062E\u0648\u062F\u06A9\u0627\u0631 \u0628\u0631\u0627\u06CC \u0644\u06CC\u06AF \u0642\u0647\u0631\u0645\u0627\u0646\u0627\u0646 \u0627\u0631\u0648\u067E\u0627 \u0647\u0645 \u0627\u0646\u062A\u062E\u0627\u0628 \u0645\u06CC\u200C\u0634\u0648\u0646\u062F",acDup:"\u26A0\uFE0F %s \u0627\u0632 \u0642\u0628\u0644 \u062F\u0631 \u0627\u06CC\u0646 \u0644\u06CC\u06AF \u0647\u0633\u062A",btnClubs:"\u{1F504} \u0628\u0647\u200C\u0631\u0648\u0632\u0631\u0633\u0627\u0646\u06CC \u0641\u0647\u0631\u0633\u062A \u0628\u0627\u0634\u06AF\u0627\u0647\u200C\u0647\u0627",clubsMeta:"\u0641\u0647\u0631\u0633\u062A \u0628\u0627\u0634\u06AF\u0627\u0647\u200C\u0647\u0627: %s \u0628\u0627\u0634\u06AF\u0627\u0647 \u2014 \u0622\u062E\u0631\u06CC\u0646 \u0628\u0631\u0648\u0632\u0631\u0633\u0627\u0646\u06CC: %s",clubsNone:"\u26A0\uFE0F \u0641\u0647\u0631\u0633\u062A \u0628\u0627\u0634\u06AF\u0627\u0647\u200C\u0647\u0627 \u0647\u0646\u0648\u0632 \u0633\u0627\u062E\u062A\u0647 \u0646\u0634\u062F\u0647 \u2014 \u062F\u06A9\u0645\u0647 \u0628\u0631\u0648\u0632\u0631\u0633\u0627\u0646\u06CC \u0631\u0627 \u0628\u0632\u0646\u06CC\u062F",mClubs:"\u2705 \u0641\u0647\u0631\u0633\u062A \u0628\u0627\u0634\u06AF\u0627\u0647\u200C\u0647\u0627 \u0628\u0631\u0648\u0632\u0631\u0633\u0627\u0646\u06CC \u0634\u062F (%s \u0628\u0627\u0634\u06AF\u0627\u0647)",clubsErr:"\u274C \u0641\u0647\u0631\u0633\u062A \u0628\u0627\u0634\u06AF\u0627\u0647\u200C\u0647\u0627 \u062F\u0631 \u062F\u0633\u062A\u0631\u0633 \u0646\u06CC\u0633\u062A",hMembers:"\u{1F465} \u0627\u0639\u0636\u0627\u06CC \u0631\u0628\u0627\u062A",btnMembers:"\u{1F504} \u0628\u0647\u200C\u0631\u0648\u0632\u0631\u0633\u0627\u0646\u06CC \u0627\u0639\u0636\u0627",membersNone:"\u0647\u0646\u0648\u0632 \u0639\u0636\u0648\u06CC \u062B\u0628\u062A \u0646\u0634\u062F\u0647 \u0627\u0633\u062A \u2014 \u06A9\u0627\u0631\u0628\u0631\u0627\u0646 \u0628\u0627\u06CC\u062F \u0631\u0628\u0627\u062A \u0631\u0627 /start \u06A9\u0646\u0646\u062F",memId:"\u0634\u0646\u0627\u0633\u0647",memSlug:"\u0646\u0627\u0645 \u06A9\u0627\u0631\u0628\u0631\u06CC",memName:"\u0646\u0627\u0645",memJoined:"\u062A\u0627\u0631\u06CC\u062E \u0639\u0636\u0648\u06CC\u062A",memCount:"%s \u0639\u0636\u0648",hFai:"\u{1F9E0} \u062A\u0631\u062C\u0645\u0647 \u0647\u0648\u0634\u0645\u0646\u062F \u0646\u0627\u0645 \u0628\u0627\u0634\u06AF\u0627\u0647\u200C\u0647\u0627",faiHint:"\u0646\u0627\u0645\u200C\u0647\u0627\u06CC \u062C\u062F\u06CC\u062F \u0628\u0647\u200C\u062A\u062F\u0631\u06CC\u062C \u0628\u0627 Workers AI \u062A\u0631\u062C\u0645\u0647 \u0648 \u0630\u062E\u06CC\u0631\u0647 \u0645\u06CC\u200C\u0634\u0648\u0646\u062F \u2014 \u0627\u0632 \u0628\u0627\u0631 \u0628\u0639\u062F \u0645\u0633\u062A\u0642\u06CC\u0645 \u0641\u0627\u0631\u0633\u06CC \u0646\u0645\u0627\u06CC\u0634 \u062F\u0627\u062F\u0647 \u0645\u06CC\u200C\u0634\u0648\u0646\u062F.",faiMeta:"%s \u0646\u0627\u0645 \u062A\u0631\u062C\u0645\u0647\u200C\u0634\u062F\u0647 \u2014 %s \u062F\u0631 \u0627\u0646\u062A\u0638\u0627\u0631",faiNone:"\u0647\u0646\u0648\u0632 \u062A\u0631\u062C\u0645\u0647\u200C\u0627\u06CC \u06CC\u0627\u062F \u06AF\u0631\u0641\u062A\u0647 \u0646\u0634\u062F\u0647 \u2014 \u062F\u06A9\u0645\u0647 \u062A\u0631\u062C\u0645\u0647 \u0647\u0648\u0634\u0645\u0646\u062F \u0631\u0627 \u0628\u0632\u0646\u06CC\u062F",btnFai:"\u{1F504} \u062A\u0631\u062C\u0645\u0647 \u0647\u0648\u0634\u0645\u0646\u062F (AI)",faiRun:"\u2705 %s \u0646\u0627\u0645 \u062C\u062F\u06CC\u062F \u062A\u0631\u062C\u0645\u0647 \u0634\u062F",faiNoNew:"\u0646\u0627\u0645 \u062C\u062F\u06CC\u062F\u06CC \u0628\u0631\u0627\u06CC \u062A\u0631\u062C\u0645\u0647 \u0646\u0628\u0648\u062F",faiOff:"\u26A0\uFE0F \u0627\u062A\u0635\u0627\u0644 Workers AI \u0641\u0639\u0627\u0644 \u0646\u06CC\u0633\u062A",faiForget:"\u0646\u0627\u0645 \u0644\u0627\u062A\u06CC\u0646 \u0628\u0627\u0634\u06AF\u0627\u0647 (\u062D\u0630\u0641 \u062A\u0631\u062C\u0645\u0647)",btnFaiForget:"\u062D\u0630\u0641 \u062A\u0631\u062C\u0645\u0647",hX:"\u{1F426} \u067E\u0631\u0648\u0641\u0627\u06CC\u0644 X (\u062A\u0648\u06CC\u06CC\u062A\u0631)",xHint:"\u0622\u06CC\u0646\u0647\u200C\u06CC \u062E\u0648\u062F\u06A9\u0627\u0631 \u0627\u0639\u0644\u0627\u0646\u200C\u0647\u0627\u06CC \u062A\u0644\u06AF\u0631\u0627\u0645 \u062F\u0631 X \u2014 \u0635\u062F\u0631\u0646\u0634\u06CC\u0646\u060C \u0646\u062A\u06CC\u062C\u0647 \u0628\u0627\u0632\u06CC\u200C\u0647\u0627\u06CC \u0628\u0632\u0631\u06AF\u060C \u0634\u0631\u0648\u0639 \u0628\u0627\u0632\u06CC \u0648 \u062C\u062F\u0648\u0644 \u0647\u0641\u062A\u06AF\u06CC \u062F\u0631 \u0633\u0631\u06CC \u067E\u0627\u0633\u062E\u200C\u0647\u0627. \u0645\u062D\u062F\u0648\u062F\u06AF\u0631 \u0628\u0648\u062F\u062C\u0647: \u06F4\u06F5\u06F0 \u067E\u0633\u062A \u0645\u0627\u0647\u0627\u0646\u0647\u060C \u06F1\u06F2 \u0631\u0648\u0632\u0627\u0646\u0647.",btnXTest:"\u{1F9EA} \u067E\u0633\u062A \u062A\u0633\u062A",btnXRefresh:"\u{1F504} \u0628\u0647\u200C\u0631\u0648\u0632\u0631\u0633\u0627\u0646\u06CC",btnXEnabled:"\u23F8\uFE0F \u062A\u0648\u0642\u0641/\u0631\u0648\u0634\u0646",btnXDryRun:"\u{1F50F} \u062D\u0627\u0644\u062A dry-run",btnXClearPause:"\u26A0\uFE0F \u067E\u0627\u06A9 \u062A\u0648\u0642\u0641 (429)",lbXPhase:"\u0641\u0627\u0632 \u0647\u0627\u06CC \u0641\u0639\u0627\u0644 (\u0628\u0627 \u06A9\u0627\u0645\u0627: coronation,ft,kickoff,tables,media)",btnXPhase:"\u{1F4BE} \u0630\u062E\u06CC\u0631\u0647 \u0641\u0627\u0632",faiForgot:"\u2705 \u062A\u0631\u062C\u0645\u0647 %s \u062D\u0630\u0641 \u0634\u062F",faiNotfound:"\u26A0\uFE0F \u062A\u0631\u062C\u0645\u0647\u200C\u0627\u06CC \u0628\u0631\u0627\u06CC %s \u06CC\u0627\u0641\u062A \u0646\u0634\u062F"},
en:{title:"Upcoming Matches \u2014 Match Notifier",h1:"\u26BD Match Notifier",sub1:"Fixtures, top-of-the-table clashes & results \u2014 auto-refreshed",join:"Join the Telegram bot",hUpcoming:"\u{1F4C5} Upcoming Matches",hFinished:"\u{1F3C1} Recent Results",hLive:"\u{1F534} Live Matches",loading:"Loading...",noMatches:"No matches ahead",errLoad:"Error loading data",madeWith:"Made with \u2764\uFE0F",adminLink:"Admin login",botLink:"Telegram bot",soon:"Soon",inDays:"in %d days",barNext:"\u26A1 Until the next big match",barFallback:"\u23F3 Until the next match",barLive:"\u{1F534} Live now",barIdle:"\u23F3 Waiting for the next match",barBase:"The bar fills during the final 24 hours before kickoff and reaches 100% at kickoff",uDay:"d",uHour:"h",uMin:"m",uSec:"s",live:"LIVE",pen:"Penalty",own:"Own goal",derby:"\u{1F525} Derby",boxCl:"\u{1F3C6} Champions League",boxCup:"\u{1F3C6} Elimination Cups",boxLg:"\u26BD Domestic Leagues",viewBig:"\u26A1 Big matches only",viewAll:"All matches",hStandings:"\u{1F4CA} League Standings",hCups:"\u{1F3C6} Tournaments",stEmpty:"Standings not available yet",stNot:"Not started",tierGold:"\u{1F947} Gold tier \u2014 Europe & international",tierSilver:"\u{1F948} Silver tier \u2014 Europe",tierBronze:"\u{1F949} Bronze tier \u2014 Europe",cEN:"\u{1F3F4} England",cES:"\u{1F1EA}\u{1F1F8} Spain",cIT:"\u{1F1EE}\u{1F1F9} Italy",cupsNone:"No fixture yet",share:"Share",copy:"Copy text",copied:"Copied \u2713",titleL:"Login \u2014 Bot Admin",loginH1:"\u{1F510} Bot Admin Login",lbUser:"Username",lbPass:"Password",btnLogin:"Login",errUser:"Enter your username",errRate:"Too many attempts \u2014 try again in a few minutes",errCreds:"Wrong username or password",titleA:"Match Bot Settings",h1A:"\u2699\uFE0F Bot Settings",hLogin:"\u{1F511} Login",tokenPh:"Admin password",hStatus:"\u{1F4CA} Status",stLoading:"Loading...",stErr:"\u274C Status error \u2014 re-login or check token",stLastRun:"\u{1F552} Last run",stApi:"\u{1F4E1} API source",stUsers:"\u{1F465} Users",stIds:"\u{1F194} IDs",stTz:"\u{1F30D} Timezone",btnRefresh:"Refresh status",btnTest:"\u{1F4E8} Send test message",btnSim:"\u{1F9EA} Simulate 5 alerts",btnSources:"\u{1F4E1} Check API sources",btnLogout:"\u{1F6AA} Logout",hBroadcast:"\u{1F4E3} Broadcast to all users",lbBroadcast:"Message text (FA or EN)",bcPh:"Message...",btnBroadcast:"\u{1F4E3} Send to all",hMatches:"\u26BD Upcoming Matches",btnRefreshM:"Refresh matches",hSettings:"\u2699\uFE0F Settings",lbTz:"Timezone",lbLeagues:"Leagues (comma-separated codes)",elNote:"EL & ECL are covered by SportScore \u2014 no need to add them.",lbTeams:"Selected teams per league",teamPh:"New team name",btnAdd:"+ Add",btnSave:"\u{1F4BE} Save settings",btnBackup:"\u2B07\uFE0F Backup settings",hPass:"\u{1F511} Change password",lbNp1:"New password (min 8 chars)",lbNp2:"Repeat new password",btnCp:"Change password",ver:"v12.33-xpost \u2014 X (Twitter) automated profile: OAuth 1.0a HMAC-SHA1 signing inline, Persian mirrors of coronation/FT/kickoff/weekly-tables, KV budget governor (450/month, 12/day), dry-run toggle + admin X status card",mToken:"Invalid login \u2014 wrong password or expired session",mErr:"Error: ",mEnterToken:"Enter the admin password",mSaved:"\u2705 Saved",mLoginFirst:"Log in first",mBackup:"\u2B07\uFE0F Backup downloaded",mPassShort:"Password must be at least 8 characters",mPassMismatch:"Passwords do not match",mPassOk:"\u{1F511} Password changed",mSentTo:"\u{1F4E3} Sent to %s of %s users",mTestSent:"\u{1F4E8} Test sent to %s users",mSimPrefix:"\u{1F9EA} Simulate: ",mNoNotif:"\u26A0\uFE0F No notifications sent",mNoMatches:"No matches ahead",mErrMatches:"Error loading matches",mEnterText:"Enter a message",mErrSrc:"\u274C error",acHint:"\u{1F4A1} As you type, the exact API club name is suggested \u2014 pick one to store it safely.",acNone:"No club with that name in the catalog",acAdd:"\u2705 %s added",acAddUcl:"\u2705 %s added \u2014 also selected for the Champions League",uclSync:"Clubs added in any league are auto-selected for the Champions League too",acDup:"\u26A0\uFE0F %s is already in this league",btnClubs:"\u{1F504} Refresh club list",clubsMeta:"Club catalog: %s clubs \u2014 last updated: %s",clubsNone:"\u26A0\uFE0F Club catalog not built yet \u2014 press Refresh",mClubs:"\u2705 Club list refreshed (%s clubs)",clubsErr:"\u274C Club list unavailable",hMembers:"\u{1F465} Bot Members",btnMembers:"\u{1F504} Refresh members",membersNone:"No members yet \u2014 users must /start the bot",memId:"ID",memSlug:"Username",memName:"Name",memJoined:"Joined",memCount:"%s members",hFai:"\u{1F9E0} Smart Farsi Club Names",faiHint:"New club names are translated incrementally via Workers AI and stored \u2014 the next visit shows them in Farsi.",faiMeta:"%s translated \u2014 %s pending",faiNone:"No translations learned yet \u2014 press the smart-translate button",btnFai:"\u{1F504} Smart translate (AI)",faiRun:"\u2705 %s new names translated",faiNoNew:"No new names to translate",faiOff:"\u26A0\uFE0F Workers AI binding not enabled",faiForget:"Latin club name (forget translation)",btnFaiForget:"Forget translation",hX:"\u{1F426} X (Twitter) Profile",xHint:"Automated mirror of the Telegram alerts to X \u2014 coronation, big-match results, kickoffs, and weekly tables as a thread. Budget: 450 posts/month, 12/day.",btnXTest:"\u{1F9EA} Test post",btnXRefresh:"\u{1F504} Refresh",btnXEnabled:"\u23F8\uFE0F Toggle ON/OFF",btnXDryRun:"\u{1F50F} Toggle dry-run",btnXClearPause:"\u26A0\uFE0F Clear 429 pause",lbXPhase:"Active phases (comma-separated: coronation,ft,kickoff,tables,media)",btnXPhase:"\u{1F4BE} Save phase",faiForgot:"\u2705 Translation for %s forgotten",faiNotfound:"\u26A0\uFE0F No translation found for %s",comps:{CL:"Champions League",PL:"Premier League",PD:"La Liga",SA:"Serie A",FL1:"Ligue 1",BL1:"Bundesliga",EL:"Europa League",ECL:"Conference League",FA_CUP:"FA Cup",EFL_CUP:"EFL Cup",CDR:"Copa del Rey",COPPA_ITALIA:"Coppa Italia",DFB_POKAL:"DFB Pokal"}}};
function curLang(){try{return localStorage.getItem("ucl_lang")||"fa";}catch(e){return "fa";}}
function T(k){var l=curLang(),d=I18N[l];return (d&&d[k])||I18N.fa[k]||k;}
function fmt(k){var s=T(k);for(var i=1;i<arguments.length;i++)s=s.replace("%s",arguments[i]).replace("%d",arguments[i]);return s;}
function trText(){var l=curLang();document.querySelectorAll("[data-i]").forEach(function(el){el.textContent=T(el.getAttribute("data-i"));});}
function trPlace(){document.querySelectorAll("[data-p]").forEach(function(el){el.setAttribute("placeholder",T(el.getAttribute("data-p")));});}
function initTheme(){try{return localStorage.getItem("ucl_theme")||"dark";}catch(e){return "dark";}}
function setTheme(t){document.documentElement.setAttribute("data-theme",t);try{localStorage.setItem("ucl_theme",t);}catch(e){}var b=document.getElementById("tbtn");if(b)b.textContent=t==="dark"?"\u{1F319}":"\u2600\uFE0F";}
function toggleTheme(){setTheme(document.documentElement.getAttribute("data-theme")==="dark"?"light":"dark");}
function switchLang(){var l=curLang()==="fa"?"en":"fa";try{localStorage.setItem("ucl_lang",l);}catch(e){}applyLang();}
function applyLang(skipHook){var l=curLang();document.documentElement.setAttribute("lang",l);document.documentElement.setAttribute("dir",l==="en"?"ltr":"rtl");var b=document.getElementById("lbtn");if(b)b.textContent=l==="en"?"\u0641\u0627":"EN";trText();trPlace();if(!skipHook&&typeof onLang==="function")onLang();}
// Audit fix 8: the admin client no longer reads/stores ADMIN_TOKEN in
// localStorage \u2014 all API calls authenticate via the HttpOnly session cookie
// (set by /admin/login). The re-login box takes the admin PASSWORD.
var TOKEN = "";
var STATE = null;
var lastUsers = null;
var LNAMES = {CL:"\u0644\u06CC\u06AF \u0642\u0647\u0631\u0645\u0627\u0646\u0627\u0646 \u0627\u0631\u0648\u067E\u0627",PL:"\u0644\u06CC\u06AF \u0628\u0631\u062A\u0631 \u0627\u0646\u06AF\u0644\u0633\u062A\u0627\u0646",PD:"\u0644\u0627\u0644\u06CC\u06AF\u0627",SA:"\u0633\u0631\u06CC \u0622",FL1:"\u0644\u06CC\u06AF \u06CC\u06A9 \u0641\u0631\u0627\u0646\u0633\u0647",BL1:"\u0628\u0648\u0646\u062F\u0633\u200C\u0644\u06CC\u06AF\u0627",EL:"\u0644\u06CC\u06AF \u0627\u0631\u0648\u067E\u0627",ECL:"\u0644\u06CC\u06AF \u06A9\u0646\u0641\u0631\u0627\u0646\u0633",FA_CUP:"\u062C\u0627\u0645 \u062D\u0630\u0641\u06CC \u0627\u0646\u06AF\u0644\u0633\u062A\u0627\u0646",EFL_CUP:"\u062C\u0627\u0645 \u0627\u062A\u062D\u0627\u062F\u06CC\u0647 \u0627\u0646\u06AF\u0644\u0633\u062A\u0627\u0646",CDR:"\u062C\u0627\u0645 \u062D\u0630\u0641\u06CC \u0627\u0633\u067E\u0627\u0646\u06CC\u0627",COPPA_ITALIA:"\u062C\u0627\u0645 \u062D\u0630\u0641\u06CC \u0627\u06CC\u062A\u0627\u0644\u06CC\u0627"};
var LNAMES_EN = {CL:"Champions League",PL:"Premier League",PD:"La Liga",SA:"Serie A",FL1:"Ligue 1",BL1:"Bundesliga",EL:"Europa League",ECL:"Conference League",FA_CUP:"FA Cup",EFL_CUP:"EFL Cup",CDR:"Copa del Rey",COPPA_ITALIA:"Coppa Italia",DFB_POKAL:"DFB Pokal"};
function lname(l){return curLang()==="en"?(LNAMES_EN[l]||l):(LNAMES[l]||l);}
function hd(){ var h = new Headers(); h.append("Content-Type","application/json"); return h; }
async function api(url, method, body){
  var r = await fetch(url,{method:method||"GET",headers:hd(),credentials:"same-origin",body:body?JSON.stringify(body):undefined});
  if(r.status===401){ msg(T("mToken")); return null; }
  if(!r.ok){ msg(fmt("mErr")+r.status); return null; }
  return r.json();
}
function login(){
  var p = document.getElementById("token").value;
  if(!p){ msg(T("mEnterToken")); return; }
  fetch("/admin/login",{method:"POST",headers:{"Content-Type":"application/json"},credentials:"same-origin",body:JSON.stringify({username:"admin",password:p})}).then(function(r){ return r.ok ? r.json() : null; }).then(function(r){
    if(!r){ msg(T("mToken")); return; }
    try{ localStorage.removeItem("admin_token"); }catch(e){}
    load(); refreshStatus(); loadNextMatches(); loadMembers();
  }).catch(function(){ msg(T("mErr")); });
}
function msg(t){ var m=document.getElementById("msg"); m.textContent=t; m.style.display="block"; setTimeout(function(){m.style.display="none";},2500); }
async function load(){
  var s = await api("/api/settings");
  if(!s) return;
  STATE = s;
  document.getElementById("tz").value = s.timezone || "Asia/Tehran";
  document.getElementById("leagues").value = (s.leagues||[]).join(",");
  renderTeams();
  loadClubsMeta();
}
function renderTeams(){
  var el = document.getElementById("teams"); el.innerHTML = "";
  var all = {};
  (STATE.leagues||[]).forEach(function(l){ all[l] = []; });
  Object.keys(STATE.teams||{}).forEach(function(l){ all[l] = STATE.teams[l]||[]; });
  Object.keys(all).forEach(function(l){
    var box = document.createElement("div");
    var label = document.createElement("label"); label.textContent = lname(l);
    box.appendChild(label);
    // v12.15: the CL box is auto-populated from every league \u2014 say so.
    if(l==="CL"){
      var uh = document.createElement("div"); uh.className = "muted uclsync";
      uh.textContent = T("uclSync");
      box.appendChild(uh);
    }
    var chips = document.createElement("div");
    (all[l]||[]).forEach(function(t){
      var c = document.createElement("span"); c.className="chip"; c.textContent = t;
      var x = document.createElement("button"); x.textContent="\u2715"; x.type="button"; x.setAttribute("aria-label",(curLang()==="en"?"Remove ":"\u062D\u0630\u0641 ")+t);
      x.onclick = function(){ STATE.teams[l]=(STATE.teams[l]||[]).filter(function(y){return y!==t;}); renderTeams(); };
      c.appendChild(x); chips.appendChild(c);
    });
    box.appendChild(chips);
    // v12.14: the add-club row is an autocomplete wrap \u2014 typing \u22652 chars queries
    // /api/clubs and the dropdown offers the EXACT provider names (crest +
    // short name + league badges); picking one stores the chip instantly.
    var row = document.createElement("div"); row.className="row acwrap";
    var inp = document.createElement("input"); inp.placeholder = T("teamPh");
    inp.setAttribute("autocomplete","off");
    inp.setAttribute("data-lg", l);
    inp.setAttribute("role","combobox");
    inp.setAttribute("aria-autocomplete","list");
    inp.setAttribute("aria-expanded","false");
    var dd = document.createElement("div"); dd.className="acbox"; dd.setAttribute("role","listbox");
    var btn = document.createElement("button"); btn.textContent = T("btnAdd");
    btn.onclick = function(){ addTeamFor(l, inp.value.trim()); };
    attachClubsAc(inp, dd, l, function(name){ addTeamFor(l, name); });
    row.appendChild(inp); row.appendChild(btn); row.appendChild(dd); box.appendChild(row);
    el.appendChild(box);
  });
}
// v12.15: name-variant duplicate guard + UCL auto-selection. anorm()
// mirrors the worker's normalizeTeamName + TEAM_ALIASES fold (case /
// diacritics / punctuation / club-prefix tokens), so "Bayern Munich" and
// "FC Bayern M\xFCnchen" are recognized as the SAME club \u2014 one chip per
// club, and the duplicate toast names the EXISTING entry.
var AC_TOKENS = /^(fc|cf|sc|ac|as|ssc|bc|ud|cd|kv|jc|fk|nk|gnk|msk|sk|sl|rsc|bsc|jk|tc|pfc|sv|tsg)$/;
var AC_ALIAS = { clubatleticodemadrid:"atleticomadrid", atleticodemadrid:"atleticomadrid", internazionale:"intermilan", internazionalemilano:"intermilan", bayernmunich:"bayernmunchen" };
function anorm(s){
  var n = String(s||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036F]/g,"");
  var parts = n.split(/[^a-z0-9]+/).filter(function(p){ return p && !AC_TOKENS.test(p); });
  n = parts.join("");
  return AC_ALIAS[n] || n;
}
function addTeamFor(l, v){
  if(!v) return;
  STATE.teams[l]=STATE.teams[l]||[];
  var k=anorm(v), ex=null;
  for(var i=0;i<STATE.teams[l].length;i++){ if(anorm(STATE.teams[l][i])===k){ ex=STATE.teams[l][i]; break; } }
  if(ex){ msg(fmt("acDup",ex)); return; }
  STATE.teams[l].push(v);
  // v12.15 (the user's rule): every club added in ANY league box is also
  // selected for the Champions League \u2014 its UCL matches then surface (UCL
  // box, standings \u2B50, notifications) with zero extra clicks.
  var uclToo = false;
  if(l!=="CL"){
    STATE.teams.CL = STATE.teams.CL || [];
    var has = STATE.teams.CL.some(function(y){ return anorm(y)===k; });
    if(!has){ STATE.teams.CL.push(v); uclToo = true; }
  }
  msg(uclToo ? fmt("acAddUcl",v) : fmt("acAdd",v));
  renderTeams();
  var again = document.querySelector('#teams input[data-lg="'+l+'"]');
  if(again) again.focus();
}
// v12.14 club autocomplete engine: debounced /api/clubs queries (170ms),
// keyboard navigation (arrows/Enter/Esc), crest + short-name + league badges
// per row, first suggestion pre-highlighted so "type Ro, press Enter" stores
// the club with the exact API name. Free-typed names still work via the add
// button \u2014 the catalog is a guardrail, not a gate.
function attachClubsAc(inp, dd, lg, onPick){
  var timer=null, seq=0, items=[], hi=-1;
  function close(){ dd.classList.remove("open"); dd.innerHTML=""; items=[]; hi=-1; inp.setAttribute("aria-expanded","false"); }
  function paint(){
    for(var i=0;i<dd.children.length;i++) dd.children[i].classList.toggle("hi", i===hi);
    if(dd.children[hi] && dd.children[hi].scrollIntoView) dd.children[hi].scrollIntoView({block:"nearest"});
  }
  function pick(it){ close(); onPick(it.name); }
  function show(list){
    items=list; hi=list.length?0:-1; dd.innerHTML="";
    if(!list.length){
      var d=document.createElement("div"); d.className="acnone muted"; d.textContent=T("acNone");
      dd.appendChild(d); dd.classList.add("open"); inp.setAttribute("aria-expanded","true"); return;
    }
    list.forEach(function(it){
      var d=document.createElement("div"); d.className="acitem"; d.setAttribute("role","option");
      var img=document.createElement("img"); img.alt=""; img.loading="lazy";
      if(it.crest){ img.src=it.crest; } else { img.className="noimg"; }
      img.onerror=function(){ img.className="noimg"; };
      var nm=document.createElement("span"); nm.className="nm"; nm.textContent=it.name;
      d.appendChild(img); d.appendChild(nm);
      if(it.short){ var sh=document.createElement("span"); sh.className="sh"; sh.textContent=it.short; d.appendChild(sh); }
      var lgs=document.createElement("span"); lgs.className="lgs";
      (it.leagues||[]).forEach(function(x){ var s=document.createElement("span"); s.textContent=x; lgs.appendChild(s); });
      if(lgs.children.length) d.appendChild(lgs);
      d.addEventListener("mousedown", function(ev){ ev.preventDefault(); pick(it); });
      dd.appendChild(d);
    });
    dd.classList.add("open"); inp.setAttribute("aria-expanded","true"); paint();
  }
  function query(v){
    var my=++seq;
    api("/api/clubs?q="+encodeURIComponent(v)+"&hint="+encodeURIComponent(lg)).then(function(r){
      if(my!==seq || !r || !r.ok) return;
      show(r.results||[]);
    }).catch(function(){});
  }
  inp.addEventListener("input", function(){
    var v=inp.value.trim();
    if(timer) clearTimeout(timer);
    if(v.length<2){ close(); return; }
    timer=setTimeout(function(){ query(v); },170);
  });
  inp.addEventListener("keydown", function(ev){
    if(ev.key==="ArrowDown"||ev.key==="ArrowUp"){
      if(!items.length) return;
      ev.preventDefault();
      hi=ev.key==="ArrowDown"?(hi+1)%items.length:(hi<=0?items.length-1:hi-1);
      paint();
    } else if(ev.key==="Enter"){
      if(items.length && dd.classList.contains("open")){ ev.preventDefault(); pick(items[hi<0?0:hi]); }
    } else if(ev.key==="Escape"){ close(); }
  });
  inp.addEventListener("blur", function(){ setTimeout(close,200); });
}
async function loadClubsMeta(){
  var el=document.getElementById("clubsMeta"); if(!el) return;
  var r=await api("/api/clubs");
  if(!r){ el.textContent=""; return; }
  if(!r.ok || !r.count){ el.textContent=T("clubsNone"); return; }
  el.textContent=fmt("clubsMeta", String(r.count), (r.fetchedAt||"").slice(0,10));
}
function refreshClubs(){
  if(busy("btnClubs")) return;
  api("/api/clubs?refresh=1").then(function(r){
    done("btnClubs");
    if(!r || !r.ok || !r.count){ msg(T("clubsErr")); return; }
    msg(fmt("mClubs", String(r.count)));
    loadClubsMeta();
  }).catch(function(){ done("btnClubs"); msg(T("clubsErr")); });
}
function save(){
  if(!STATE){ msg(T("mLoginFirst")); return; }
  STATE.timezone = document.getElementById("tz").value.trim() || "Asia/Tehran";
  STATE.leagues = document.getElementById("leagues").value.split(",").map(function(x){return x.trim().toUpperCase();}).filter(Boolean);
  api("/api/settings","PUT",STATE).then(function(s){ if(s){ STATE=s; renderTeams(); msg(T("mSaved")); } });
}
function backup(){
  if(!STATE){ msg(T("mLoginFirst")); return; }
  var blob = new Blob([JSON.stringify(STATE,null,2)],{type:"application/json"});
  var a = document.createElement("a"); a.href = URL.createObjectURL(blob);
  a.download = "ucl-notifier-settings-backup.json"; a.click();
  msg(T("mBackup"));
}
function changePass(){
  var a = document.getElementById("np1").value, b = document.getElementById("np2").value;
  if(!a || a.length < 8){ msg(T("mPassShort")); return; }
  if(a !== b){ msg(T("mPassMismatch")); return; }
  api("/admin/change-password","POST",{password:a}).then(function(r){ if(r) msg(T("mPassOk")); });
}
async function refreshStatus(){
  var s = await api("/api/status");
  if(!s){ document.getElementById("status").innerHTML = T("stErr"); return; }
  lastUsers = s.users != null ? s.users : lastUsers;
  document.getElementById("status").innerHTML =
    T("stLastRun")+": "+(s.last_cron||"\u2014")+"<br>"+
    T("stApi")+": "+(s.api_source||"\u2014")+"<br>"+
    T("stUsers")+": "+s.users+"<br>"+
    (s.chat_ids && s.chat_ids.length ? T("stIds")+": "+s.chat_ids.join(curLang()==="en"?", ":"\u060C ")+"<br>" : "")+
    T("stTz")+": "+s.timezone;
}
function busy(id){ var b=document.getElementById(id); if(!b||b.dataset.busy) return true; b.dataset.busy="1"; b.disabled=true; return false; }
function done(id){ var b=document.getElementById(id); if(!b) return; delete b.dataset.busy; b.disabled=false; }
function broadcast(){
  var t = document.getElementById("broadcastText").value.trim();
  if(!t){ msg(T("mEnterText")); return; }
  if(!confirm(curLang()==="en"?"Send to all "+lastUsers+" user(s)?":"\u0628\u0631\u0627\u06CC \u0647\u0645\u0647 \u06A9\u0627\u0631\u0628\u0631\u0627\u0646 \u0627\u0631\u0633\u0627\u0644 \u0634\u0648\u062F\u061F ("+(lastUsers==null?"\u061F":lastUsers)+" \u06A9\u0627\u0631\u0628\u0631)")) return;
  if(busy("btnBroadcast")) return;
  api("/api/broadcast","POST",{text:t}).then(function(r){ if(r) msg(fmt("mSentTo",r.sent,r.total)); }).catch(function(){ msg(T("mErr")); }).then(function(){ done("btnBroadcast"); });
}
function sendTest(){
  if(busy("btnTest")) return;
  api("/api/test","POST",{}).then(function(r){ if(r) msg(fmt("mTestSent",r.sent)); }).catch(function(){ msg(T("mErr")); }).then(function(){ done("btnTest"); });
}
function simulate(){
  if(busy("btnSim")) return;
  api("/api/simulate","POST",{}).then(function(r){
    if(!r) return;
    var t = "";
    if(r.failures && r.failures.length){ t = "\u274C " + r.failures.join(" ; "); }
    if(r.passed) t = "\u2705 " + (curLang()==="en"?"All "+r.probes.length+" tests passed":"\u0647\u0631 "+r.probes.length+" \u062A\u0633\u062A \u0645\u0648\u0641\u0642");
    var keys = Object.keys(r.sent||{});
    if(!keys.length && !t){ msg(T("mNoNotif")); return; }
    msg(t);
  }).catch(function(){ msg(T("mErr")); }).then(function(){ done("btnSim"); });
}
function checkSources(){
  api("/api/sources").then(function(r){
    if(!r) return;
    var en = curLang()==="en";
    var t = "\u{1F4E1} ";
    Object.keys(r).forEach(function(k){
      t += k+": "+(r[k].ok ? r[k].matches+(en?" games (":" \u0628\u0627\u0632\u06CC (")+r[k].worthy+(en?" worthy)":" \u0645\u0637\u0644\u0648\u0628)") : T("mErrSrc"))+" | ";
    });
    msg(t);
  });
}
// v12.16: bot members directory \u2014 /api/members (admin-gated) feeds the card:
// telegram id, @username ("slug"), display name, join date. Cached in-page;
// the \u{1F504} button re-fetches (the worker backfills unknown members via getChat,
// \u226440 per call, cached into KV so each member is fetched at most once).
var MEMBERS = null;
function faNum(s){ return curLang()==="fa" ? String(s).replace(/[0-9]/g, function(d){ return "\u06F0\u06F1\u06F2\u06F3\u06F4\u06F5\u06F6\u06F7\u06F8\u06F9"[+d]; }) : String(s); }
async function loadMembers(force){
  var el = document.getElementById("members");
  if(!el) return;
  if(!force && MEMBERS){ renderMembers(); return; }
  if(force && busy("btnMembers")) return;
  el.textContent = T("stLoading");
  var d = await api("/api/members");
  if(force) done("btnMembers");
  if(!d){ el.textContent = "\u2014"; return; }
  MEMBERS = d;
  renderMembers();
}
function renderMembers(){
  var el = document.getElementById("members");
  if(!el) return;
  el.innerHTML = "";
  var d = MEMBERS;
  if(!d || !d.members || !d.members.length){
    var e = document.createElement("div"); e.className = "muted"; e.textContent = T("membersNone");
    el.appendChild(e); return;
  }
  var box = document.createElement("div"); box.className = "membox";
  var head = document.createElement("div"); head.className = "memhead";
  [T("memId"), T("memSlug"), T("memName"), T("memJoined")].forEach(function(h, i){
    var s = document.createElement("span"); s.textContent = h; if(i === 2) s.className = "hname";
    head.appendChild(s);
  });
  box.appendChild(head);
  d.members.forEach(function(m){
    var row = document.createElement("div"); row.className = "memrow";
    var id = document.createElement("span"); id.className = "mid"; id.textContent = String(m.id);
    var slug = document.createElement("span"); slug.className = "slug"; slug.textContent = m.username ? "@" + m.username : "\u2014";
    var nm = document.createElement("span"); nm.className = "mname"; nm.textContent = m.first_name || m.title || "\u2014";
    var jd = document.createElement("span"); jd.className = "mdate"; jd.textContent = m.joined ? String(m.joined).slice(0, 10) : "\u2014";
    row.appendChild(id); row.appendChild(slug); row.appendChild(nm); row.appendChild(jd);
    box.appendChild(row);
  });
  el.appendChild(box);
  var cnt = document.createElement("div"); cnt.className = "muted"; cnt.style.marginTop = "2px";
  cnt.textContent = fmt("memCount", faNum(d.count));
  el.appendChild(cnt);
}
var onLang = function(){ refreshStatus(); loadNextMatches(); renderMembers(); loadFai(); };
// v12.17: \u{1F9E0} smart Farsi club names \u2014 stats + sample of the AI-learned
// dictionary; ?run=1 (the \u{1F504} button) forces one learning round now.
var FAI_BUSY = false;
async function loadFai(force){
  var el = document.getElementById("fai"), btn = document.getElementById("btnFai");
  if(!el) return;
  if(FAI_BUSY) return;
  FAI_BUSY = true;
  if(force && btn){ btn.disabled = true; btn.textContent = "\u2026"; }
  try{
    // force: FIRST trigger the learning round (toast from its result), THEN
    // re-read the stats so the card shows TOTALS + the sample list, not the
    // single round's counters.
    if(force){
      var r = await api("/api/fa-teams?run=1");
      if(r){
        if(r.ai === false) msg(T("faiOff"));
        else if(r.error) msg(T("mErr") + r.error);
        else msg(r.learned > 0 ? fmt("faiRun", faNum(r.learned)) : T("faiNoNew"));
      }
    }
    var d = await api("/api/fa-teams");
    if(!d){ el.textContent = T("mErrSrc"); return; }
    el.innerHTML = "";
    var meta = document.createElement("div"); meta.className = "muted"; meta.style.margin = "6px 0 2px";
    meta.textContent = fmt("faiMeta", faNum(d.learned || 0), faNum(d.pending || 0)) + (d.lastRun ? " \u2014 " + String(d.lastRun).slice(0, 16).replace("T", " ") : "");
    el.appendChild(meta);
    if(d.ai === false){
      var off = document.createElement("div"); off.className = "muted"; off.textContent = T("faiOff");
      el.appendChild(off);
    }
    if(d.sample && d.sample.length){
      var box = document.createElement("div"); box.className = "faibox";
      d.sample.forEach(function(s){
        var row = document.createElement("div"); row.className = "fairow";
        var en = document.createElement("span"); en.className = "fen"; en.textContent = s.key;
        var fa = document.createElement("span"); fa.className = "ffa"; fa.textContent = s.fa;
        row.appendChild(fa); row.appendChild(en);
        box.appendChild(row);
      });
      el.appendChild(box);
    } else {
      var none = document.createElement("div"); none.className = "muted"; none.style.marginTop = "4px";
      none.textContent = T("faiNone");
      el.appendChild(none);
    }
  } finally {
    FAI_BUSY = false;
    if(btn){ btn.disabled = false; }
    // skipHook=true: re-translates the static labels (restores the \u{1F504} button
    // text after its "\u2026" busy state) WITHOUT re-firing onLang \u2192 no loop.
    applyLang(true);
  }
}
async function forgetFai(){
  var inp = document.getElementById("faiForget");
  var name = inp && inp.value ? inp.value.trim() : "";
  if(!name){ msg(T("mEnterText")); return; }
  var d = await api("/api/fa-teams?forget=" + encodeURIComponent(name));
  if(d && d.ok){ msg(fmt("faiForgot", name)); inp.value = ""; loadFai(false); }
  else { msg(fmt("faiNotfound", name)); }
}
// v12.33-xpost: X (Twitter) admin handlers — status card + test post + dry-run
// toggle + phase config. Mirrors the FAI / Members / Broadcast patterns
// (api() helper + busy()/done() + msg()).
var X_STATUS = null;
async function loadXStatus(){
  var d = await api("/api/x/status");
  var el = document.getElementById("xStatus");
  if(!d){ el.innerHTML = T("stErr"); return; }
  X_STATUS = d;
  var en = curLang()==="en";
  var phase = (d.phase||[]).join(", ") || "—";
  var lp = d.lastPost;
  var le = d.lastError;
  var lines = [];
  lines.push(en ? "Enabled: " + (d.enabled ? "yes" : "no") : "فعال: " + (d.enabled ? "بله" : "خیر"));
  lines.push(en ? "Dry-run: " + (d.dryRun ? "yes" : "no") : "حالت dry-run: " + (d.dryRun ? "بله" : "خیر"));
  if(d.paused) lines.push(en ? "Paused (429 backoff): yes" : "\u23F8\uFE0F متوقف (429): بله");
  lines.push(en ? "Phase: " + phase : "فاز: " + phase);
  lines.push(en ? "Budget (monthly): " + d.monthlyUsed + "/" + d.monthlyCap : "\u{1F4B0} بودجه ماهانه: " + faNum(d.monthlyUsed) + "/" + faNum(d.monthlyCap));
  lines.push(en ? "Budget (daily): " + d.dailyUsed + "/" + d.dailyCap : "\u{1F4B0} بودجه روزانه: " + faNum(d.dailyUsed) + "/" + faNum(d.dailyCap));
  if(lp && lp.ts){
    var d2 = new Date(lp.ts);
    var snip = (lp.text||"").slice(0, 80);
    lines.push(en ? "Last post: " + d2.toISOString() + " [" + (lp.kind||"") + "]" : "\u{1F4E4} آخرین پست: " + d2.toLocaleString("fa-IR") + " [" + (lp.kind||"") + "]");
    lines.push(en ? "  text: " + snip + (lp.text && lp.text.length > 80 ? "…" : "") : "  متن: " + snip + (lp.text && lp.text.length > 80 ? "…" : ""));
    if(lp.id) lines.push(en ? "  id: " + lp.id : "  شناسه: " + lp.id);
  } else {
    lines.push(en ? "Last post: —" : "\u{1F4E4} آخرین پست: —");
  }
  if(le && le.ts){
    var d3 = new Date(le.ts);
    lines.push(en ? "\u274C Last error: " + d3.toISOString() + " [" + le.status + "]" : "\u274C آخرین خطا: " + d3.toLocaleString("fa-IR") + " [" + le.status + "]");
    lines.push("  " + (le.error||""));
  }
  el.innerHTML = lines.join("<br>");
  // Show the "clear pause" button only when paused
  var btnPause = document.getElementById("btnXClearPause");
  if(btnPause) btnPause.style.display = d.paused ? "" : "none";
  // Reflect the phase into the input
  var ph = document.getElementById("xPhase");
  if(ph && d.phase) ph.value = d.phase.join(",");
  // Update the toggle button labels
  var btnEnabled = document.getElementById("btnXEnabled");
  if(btnEnabled) btnEnabled.textContent = d.enabled ? (en ? "Turn OFF" : "\u{1F6D1} خاموش") : (en ? "Turn ON" : "\u26A1 روشن");
  var btnDryRun = document.getElementById("btnXDryRun");
  if(btnDryRun) btnDryRun.textContent = d.dryRun ? (en ? "Live mode (dry-run OFF)" : "\u{1F680} حالت زنده (dry-run خاموش)") : (en ? "Dry-run ON" : "\u{1F50F} dry-run روشن");
}
async function xTest(){
  if(busy("btnXTest")) return;
  if(!confirm(curLang()==="en" ? "Send a test post to X?" : "\u0627\u0631\u0633\u0627\u0644 \u067E\u0633\u062A \u062A\u0633\u062A \u0628\u0647 X\u061F")) { done("btnXTest"); return; }
  api("/admin/x-test","POST",{}).then(function(r){
    done("btnXTest");
    if(!r){ return; }
    if(r.ok){
      if(r.dryRun) msg(curLang()==="en" ? "\u{1F426} Dry-run test logged (no X post)" : "\u{1F426} \u062A\u0633\u062A dry-run \u062B\u0628\u062A \u0634\u062F (\u0628\u062F\u0648\u0646 \u0627\u0631\u0633\u0627\u0644)");
      else msg(curLang()==="en" ? "\u{1F426} X posted (id=" + (r.id||"?") + ")" : "\u{1F426} \u062F\u0631 X \u0627\u0631\u0633\u0627\u0644 \u0634\u062F (id=" + (r.id||"?") + ")");
      loadXStatus();
    } else {
      msg(T("mErr") + (r.error||""));
    }
  }).catch(function(){ done("btnXTest"); msg(T("mErr")); });
}
async function xToggleEnabled(){
  if(!X_STATUS){ await loadXStatus(); }
  var newVal = X_STATUS ? !X_STATUS.enabled : true;
  api("/api/x/enabled","PUT",{enabled:newVal}).then(function(r){
    if(r && r.ok){ msg(newVal ? (curLang()==="en"?"\u{1F426} X enabled":"\u{1F426} X \u0641\u0639\u0627\u0644 \u0634\u062F") : (curLang()==="en"?"\u{1F6D1} X disabled":"\u{1F6D1} X \u062E\u0627\u0645\u0648\u0634 \u0634\u062F")); loadXStatus(); }
  }).catch(function(){ msg(T("mErr")); });
}
async function xToggleDryRun(){
  if(!X_STATUS){ await loadXStatus(); }
  var newVal = X_STATUS ? !X_STATUS.dryRun : true;
  api("/api/x/dry-run","PUT",{dryRun:newVal}).then(function(r){
    if(r && r.ok){ msg(newVal ? (curLang()==="en"?"\u{1F50F} Dry-run ON":"\u{1F50F} \u062D\u0627\u0644\u062A dry-run \u0631\u0648\u0634\u0646") : (curLang()==="en"?"\u{1F680} Live mode (dry-run OFF)":"\u{1F680} \u062D\u0627\u0644\u062A \u0632\u0646\u062F\u0647")); loadXStatus(); }
  }).catch(function(){ msg(T("mErr")); });
}
async function xSavePhase(){
  var inp = document.getElementById("xPhase");
  var v = (inp && inp.value || "").trim();
  if(!v){ msg(T("mEnterText")); return; }
  if(busy("btnXPhase")) return;
  api("/api/x/phase","PUT",{phase:v}).then(function(r){
    done("btnXPhase");
    if(r && r.ok){ msg(curLang()==="en" ? "\u{1F4BE} Phase saved: " + (r.phase||[]).join(",") : "\u{1F4BE} \u0641\u0627\u0632 \u0630\u062E\u06CC\u0631\u0647 \u0634\u062F"); loadXStatus(); }
    else if(r && r.error) msg(T("mErr") + r.error);
  }).catch(function(){ done("btnXPhase"); msg(T("mErr")); });
}
async function xClearPause(){
  if(busy("btnXClearPause")) return;
  api("/api/x/clear-pause","POST",{}).then(function(r){
    done("btnXClearPause");
    if(r && r.ok){ msg(curLang()==="en"?"\u2705 429 pause cleared":"\u2705 \u062A\u0648\u0642\u0641 429 \u067E\u0627\u06A9 \u0634\u062F"); loadXStatus(); }
  }).catch(function(){ done("btnXClearPause"); msg(T("mErr")); });
}
async function loadNextMatches(){
  var d = await api("/next-matches");
  var el = document.getElementById("matches");
  if(!d){ el.innerHTML = T("mErrMatches"); return; }
  if(!d.matches || !d.matches.length){ el.innerHTML = T("mNoMatches"); return; }
  el.innerHTML = "";
  var en = curLang()==="en";
  d.matches.forEach(function(m){
    var row = document.createElement("div"); row.className = "match";
    var t = document.createElement("span"); t.className = "teams";
    t.textContent = (en?m.home_en:m.home) + " \u2013 " + (en?m.away_en:m.away) + " \u2014 " + (en?(I18N.en.comps[m.code]||m.competition):m.competition);
    var w = document.createElement("span"); w.className = "when";
    w.textContent = (en?m.time_en:m.tehran_time) || m.utc_date || "";
    row.appendChild(t); row.appendChild(w);
    el.appendChild(row);
  });
}
async function logout(){
  await fetch("/admin/logout",{method:"POST"});
  localStorage.removeItem("admin_token");
  location.reload();
}
setTheme(initTheme()); applyLang(true); load(); refreshStatus(); loadNextMatches(); loadMembers(); loadFai(); loadXStatus();
<\/script>
</body></html>`;
async function handleTelegramUpdate(env, update) {
  try {
    const updId = update && update.update_id;
    if (updId != null) {
      const seen = await env.STATE.get("upd_" + updId).catch(() => null);
      if (seen) return;
      await env.STATE.put("upd_" + updId, "1", { expirationTtl: 600 }).catch(() => {
      });
    }
    // v12.x-bilingual-bot: callback_query handler (language picker). Runs
    // BEFORE the message handlers. The callback_data is "lang:fa" or
    // "lang:en". On tap: register the chat if needed, persist the lang,
    // answer the callback (dismisses the loading spinner on the button),
    // then send the welcome + help in the chosen lang. The picker itself
    // is sent via the /lang command (and /start for new users) using the
    // sendTelegramWithKeyboard helper.
    const cbq = update && update.callback_query;
    if (cbq && cbq.id) {
      try {
        const cbChatId = cbq.message && cbq.message.chat && cbq.message.chat.id;
        const cbUserId = cbq.from && cbq.from.id;
        const cbChatId2 = cbChatId || cbUserId;
        if (cbChatId2) {
          const data = String(cbq.data || "");
          const m = data.match(/^lang:(fa|en)$/);
          if (m) {
            const lang = m[1];
            const chats = await getRegisteredChats(env);
            if (!chats.includes(cbChatId2)) {
              chats.push(cbChatId2);
              await env.STATE.put(CONFIG.KV_USERS_KEY, JSON.stringify(chats));
            }
            await setUserLang(env, cbChatId2, lang);
            await answerCallbackQuery(env, cbq.id, lang === "en" ? "English" : "\u0641\u0627\u0631\u0633\u06CC");
            const welcomeText = botStr(lang, "lang_set") + "\n\n" + botStr(lang, "start_welcome") + "\n\n" + botStr(lang, "help_body");
            await sendTelegram(env, welcomeText, cbChatId2);
          }
        }
      } catch (e) {
        console.error("callback_query handler failed: " + e.message);
      }
      return new Response("OK");
    }
    const message = update && update.message;
    if (!message || !message.chat || !message.chat.id) return;
    const chatId = message.chat.id;
    const text = message.text;
    try {
      const from = message.from || {};
      const chat = message.chat || {};
      if (from.id || chat.title) {
        const profiles = await env.STATE.get(CONFIG.KV_USER_PROFILES, "json").catch(() => null) || {};
        const key = String(chatId);
        const cur = profiles[key] || {};
        const next = {
          username: from.username || cur.username || null,
          first_name: from.first_name || cur.first_name || (chat.title ? null : cur.first_name) || null,
          title: chat.title || cur.title || null,
          joined: cur.joined || (/* @__PURE__ */ new Date()).toISOString()
        };
        if (JSON.stringify(next) !== JSON.stringify(cur)) {
          profiles[key] = next;
          await env.STATE.put(CONFIG.KV_USER_PROFILES, JSON.stringify(profiles)).catch(() => {
          });
        }
      }
    } catch (e) {
    }
    if (text === "/start") {
      const chats = await getRegisteredChats(env);
      if (!chats.includes(chatId)) {
        chats.push(chatId);
        await env.STATE.put(CONFIG.KV_USERS_KEY, JSON.stringify(chats));
      }
      const prefs = await getUserPrefs(env);
      const up = prefs[String(chatId)] || {};
      const langSet = up.lang === "en" || up.lang === "fa";
      if (langSet && up.lang === "en") {
        await sendTelegram(env, "Welcome to SportSignal\\!\nNever miss the big matches\\.\n\n/next \\- Upcoming\n/tables \\- Tables\n/help \\- Help\n/stop \\- Stop", chatId);
      } else if (langSet && up.lang === "fa") {
        await sendTelegram(env, "\u2705 \u0628\u0647 SportSignal \u062E\u0648\u0634 \u0622\u0645\u062F\u06CC\u0627\\!\n\n/next \\- \u0628\u0627\u0632\u06CC\u200C\u0647\u0627\u06CC \u067E\u06CC\u0634\u200C\u0631\u0648\n/tables \\- \u062C\u062F\u0648\u0644\u200C\u0647\u0627\n/help \\- \u0631\u0627\u0647\u0646\u0645\u0627\n/stop \\- \u0627\u0646\u0635\u0631\u0627\u0641", chatId);
      } else {
        const hasKeyboard = typeof sendTelegramWithKeyboard === "function";
        const promptText = "\u{1F310} \u0632\u0628\u0627\u0646 / Language";
        const keyboard = { inline_keyboard: [[
          { text: "\u{1F1EE}\u{1F1F7} \u0641\u0627\u0631\u0633\u06CC", callback_data: "lang:fa" },
          { text: "\u{1F1EC}\u{1F1E7} English", callback_data: "lang:en" }
        ]] };
        if (hasKeyboard) {
          await sendTelegramWithKeyboard(env, promptText, chatId, keyboard);
        } else {
          await sendTelegram(env, promptText + "\n\n/lang", chatId);
        }
      }
    } else if (text === "/lang") {
      const hasKeyboard = typeof sendTelegramWithKeyboard === "function";
      const promptText = "\u{1F310} \u0632\u0628\u0627\u0646 / Language";
      const keyboard = { inline_keyboard: [[
        { text: "\u{1F1EE}\u{1F1F7} \u0641\u0627\u0631\u0633\u06CC", callback_data: "lang:fa" },
        { text: "\u{1F1EC}\u{1F1E7} English", callback_data: "lang:en" }
      ]] };
      if (hasKeyboard) {
        await sendTelegramWithKeyboard(env, promptText, chatId, keyboard);
      } else {
        await sendTelegram(env, promptText, chatId);
      }
    } else if (text === "/stop") {
      const chats = await getRegisteredChats(env);
      const newChats = chats.filter((c) => c !== chatId);
      await env.STATE.put(CONFIG.KV_USERS_KEY, JSON.stringify(newChats));
      const prefs = await getUserPrefs(env);
      const lang = (prefs[String(chatId)] && prefs[String(chatId)].lang) === "en" ? "en" : "fa";
      await sendTelegram(env, lang === "en" ? "You have been unsubscribed\\. Use /start to return\\." : "\u274C \u0627\u0632 \u062F\u0631\u06CC\u0627\u0641\u062A \u067E\u06CC\u0627\u0645 \u062E\u0627\u0631\u062C \u0634\u062F\u06CC\u062F\\.", chatId);
    } else if (text === "/help") {
      const prefs = await getUserPrefs(env);
      const lang = (prefs[String(chatId)] && prefs[String(chatId)].lang) === "en" ? "en" : "fa";
      const body = lang === "en"
        ? "/start \\- Join\n/teams \\- List teams\n/follow 1,3,7 \\- Pick teams\n/follow all \\- All teams\n/next \\- Upcoming matches\n/tables \\- League tables\n/timezone london \\- Set timezone\n/lang \\- Change language\n/stop \\- Unsubscribe"
        : "/start \\- \u0639\u0636\u0648\u06CC\u062A\n/teams \\- \u0644\u06CC\u0633\u062A \u062A\u06CC\u0645\u200C\u0647\u0627\n/follow 1,3,7 \\- \u0627\u0646\u062A\u062E\u0627\u0628 \u062A\u06CC\u0645\n/follow all \\- \u0647\u0645\u0647 \u062A\u06CC\u0645\u200C\u0647\u0627\n/next \\- \u0628\u0627\u0632\u06CC\u200C\u0647\u0627\u06CC \u067E\u06CC\u0634\u200C\u0631\u0648\n/tables \\- \u062C\u062F\u0648\u0644\u200C\u0647\u0627\n/timezone london \\- \u062A\u0646\u0638\u06CC\u0645 \u0632\u0645\u0627\u0646\n/lang \\- \u062A\u063A\u06CC\u06CC\u0631 \u0632\u0628\u0627\u0646\n/stop \\- \u0627\u0646\u0635\u0631\u0627\u0641";
      const header = lang === "en" ? "\u26BD *Help*\n\n" : "\u26BD *\u0631\u0627\u0647\u0646\u0645\u0627*\n\n";
      await sendTelegram(env, header + body, chatId);
    } else if (text === "/teams") {
      const master = masterTeamList();
      const prefs = await getUserPrefs(env);
      const p = prefs[String(chatId)];
      const lang = (p && p.lang) === "en" ? "en" : "fa";
      const selected = p && Array.isArray(p.teams) ? p.teams : null;
      const lines = master.map((t, i) => {
        const isSel = selected && selected.some((s) => (0, import_teams.normalizeTeamName)(s) === (0, import_teams.normalizeTeamName)(t));
        return (isSel ? "\u2705 " : "") + String(i + 1) + "\\. " + escapeMarkdownCharacters(translateTeam(t));
      });
      const status = selected
        ? (lang === "en" ? "Selected teams: " + selected.length : "\u062A\u0639\u062F\u0627\u062F \u062A\u06CC\u0645 \u0627\u0646\u062A\u062E\u0627\u0628\u06CC: " + toFaDigits(String(selected.length)))
        : (lang === "en" ? "Following all teams\\." : "\u0647\u0645\u0647 \u062A\u06CC\u0645\u200C\u0647\u0627 \u062F\u0646\u0628\u0627\u0644 \u0645\u06CC\u200C\u0634\u0648\u0646\u062F\\.");
      const header = lang === "en" ? "*Teams you can follow:*" : "*\u062A\u06CC\u0645\u200C\u0647\u0627\u06CC \u0642\u0627\u0628\u0644 \u062F\u0646\u0628\u0627\u0644\u200C\u06A9\u0631\u062F\u0646:*";
      const footer = lang === "en" ? "Pick: /follow 1,3,7\nAll: /follow all" : "\u0627\u0646\u062A\u062E\u0627\u0628: /follow 1,3,7\n\u0647\u0645\u0647: /follow all";
      await sendTelegram(env, header + "\n\n" + lines.join("\n") + "\n\n" + status + "\n\n" + footer, chatId);
    } else if (text && text.startsWith("/follow")) {
      const arg = text.slice(7).trim();
      const master = masterTeamList();
      const prefs = await getUserPrefs(env);
      const p = prefs[String(chatId)] || {};
      const lang = p.lang === "en" ? "en" : "fa";
      if (!arg || arg === "all") {
        if (prefs[String(chatId)]) delete prefs[String(chatId)];
        await env.STATE.put(CONFIG.KV_USER_PREFS, JSON.stringify(prefs));
        await sendTelegram(env, lang === "en" ? "Following all teams\\." : "\u2705 \u0647\u0645\u0647 \u062A\u06CC\u0645\u200C\u0647\u0627 \u062F\u0646\u0628\u0627\u0644 \u0645\u06CC\u200C\u0634\u0648\u0646\u062F\\.", chatId);
      } else {
        const nums = arg.split(/[\s,\u060C]+/).map((n) => parseInt(n, 10)).filter((n) => !isNaN(n) && n >= 1 && n <= master.length);
        if (!nums.length) {
          await sendTelegram(env, lang === "en" ? "Invalid number\\. Use /teams to see the list\\." : "\u26A0\uFE0F \u0634\u0645\u0627\u0631\u0647 \u0646\u0627\u0645\u0639\u062A\u0628\u0631 \u0627\u0633\u062A\\.", chatId);
        } else {
          const picked = [...new Set(nums)].map((n) => master[n - 1]);
          prefs[String(chatId)] = { teams: picked, tz: p.tz || null, lang: p.lang || "fa" };
          await env.STATE.put(CONFIG.KV_USER_PREFS, JSON.stringify(prefs));
          const sep = lang === "en" ? ", " : "\u060C ";
          const names = picked.map((t) => escapeMarkdownCharacters(translateTeam(t))).join(sep);
          const head = lang === "en" ? "Your selected teams:\n" : "\u2705 \u062A\u06CC\u0645\u200C\u0647\u0627\u06CC \u0627\u0646\u062A\u062E\u0627\u0628\u06CC \u0634\u0645\u0627:\n";
          const foot = lang === "en" ? "\n\nTo change: /follow all or new numbers\\." : "\n\n\u0628\u0631\u0627\u06CC \u062A\u063A\u06CC\u06CC\u0631\u060C /follow all \u06CC\u0627 \u0634\u0645\u0627\u0631\u0647\u200C\u0647\u0627\u06CC \u062C\u062F\u06CC\u062F \u0631\u0627 \u0628\u0641\u0631\u0633\u062A\u06CC\u062F\\.";
          await sendTelegram(env, head + names + foot, chatId);
        }
      }
    } else if (text && text.startsWith("/timezone")) {
      const prefs = await getUserPrefs(env);
      const p = prefs[String(chatId)] || {};
      const lang = p.lang === "en" ? "en" : "fa";
      const arg = text.slice(10).trim();
      if (!arg) {
        const tz = getUserTz(prefs, chatId, env);
        const head = lang === "en" ? "Your timezone: " : "\u23F0 \u0645\u0646\u0637\u0642\u0647 \u0632\u0645\u0627\u0646\u06CC \u0634\u0645\u0627: ";
        const tail = lang === "en" ? "\nChange: /timezone london" : "\n\u0628\u0631\u0627\u06CC \u062A\u063A\u06CC\u06CC\u0631: /timezone london";
        await sendTelegram(env, head + escapeMarkdownCharacters(tz) + tail, chatId);
      } else if (arg === "reset") {
        if (prefs[String(chatId)]) delete prefs[String(chatId)].tz;
        await env.STATE.put(CONFIG.KV_USER_PREFS, JSON.stringify(prefs));
        const head = lang === "en" ? "Timezone reset to default: " : "\u2705 \u0645\u0646\u0637\u0642\u0647 \u0632\u0645\u0627\u0646\u06CC \u0634\u0645\u0627 \u0628\u0647 \u067E\u06CC\u0634\u200C\u0641\u0631\u0636 \u0628\u0627\u0632\u06AF\u0634\u062A: ";
        await sendTelegram(env, head + escapeMarkdownCharacters(env.TEHRAN_TZ || ""), chatId);
      } else {
        const tz = resolveTimeZone(arg);
        if (!tz) {
          const head = lang === "en" ? "Invalid timezone\\." : "\u26A0\uFE0F \u0645\u0646\u0637\u0642\u0647 \u0632\u0645\u0627\u0646\u06CC \u0646\u0627\u0645\u0639\u062A\u0628\u0631 \u0627\u0633\u062A\\.";
          const tail = lang === "en" ? "\nExample: /timezone london or /timezone Europe/London" : "\n\u0645\u062B\u0627\u0644: /timezone london \u06CC\u0627 /timezone Europe/London";
          await sendTelegram(env, head + tail, chatId);
        } else {
          if (!prefs[String(chatId)]) prefs[String(chatId)] = {};
          prefs[String(chatId)].tz = tz;
          if (!prefs[String(chatId)].lang) prefs[String(chatId)].lang = "fa";
          await env.STATE.put(CONFIG.KV_USER_PREFS, JSON.stringify(prefs));
          const head = lang === "en" ? "Timezone set: " : "\u2705 \u0645\u0646\u0637\u0642\u0647 \u0632\u0645\u0627\u0646\u06CC \u0634\u0645\u0627 \u062A\u063A\u06CC\u06CC\u0631 \u06A9\u0631\u062F: ";
          const tail = lang === "en" ? "\nMessages will be sent in your local time\\." : "\n\u067E\u06CC\u0627\u0645\u200C\u0647\u0627 \u0627\u0632 \u0627\u06CC\u0646 \u067E\u0633 \u0628\u0631 \u0627\u0633\u0627\u0633 \u0633\u0627\u0639\u062A \u0645\u062D\u0644\u06CC \u0627\u0631\u0633\u0627\u0644 \u0645\u06CC\u200C\u0634\u0648\u0646\u062F\\.";
          await sendTelegram(env, head + escapeMarkdownCharacters(tz) + tail, chatId);
        }
      }
    } else if (text === "/next") {
      await applySettings(env);
      const pool = await env.STATE.get(CONFIG.KV_MATCHES_KEY, "json").catch(() => null);
      const poolFresh = pool && pool.fetchedAt && Date.now() - new Date(pool.fetchedAt).getTime() < 10 * 6e4 && Array.isArray(pool.matches);
      const matches = poolFresh ? pool.matches : await fetchMatchesFromAPI(env);
      const prefs = await getUserPrefs(env);
      const p = prefs[String(chatId)] || {};
      const lang = p.lang === "en" ? "en" : "fa";
      const now = /* @__PURE__ */ new Date();
      const upcoming = matches.filter((m) => shouldNotify(m) && userFollowsMatch(prefs, chatId, m) && new Date(m.utcDate) > now).sort((a, b) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime()).slice(0, 5);
      env.TEHRAN_TZ = getUserTz(prefs, chatId, env);
      if (!upcoming.length) {
        await sendTelegram(env, lang === "en" ? "No upcoming matches for your followed teams right now\\." : "\u{1F4C5} \u062F\u0631 \u062D\u0627\u0644 \u062D\u0627\u0636\u0631 \u0628\u0627\u0632\u06CC \u067E\u06CC\u0634\u200C\u0631\u0648\u06CC \u0628\u0631\u0627\u06CC \u062A\u06CC\u0645\u200C\u0647\u0627\u06CC \u062F\u0646\u0628\u0627\u0644\u200C\u0634\u062F\u0647 \u0634\u0645\u0627 \u0648\u062C\u0648\u062F \u0646\u062F\u0627\u0631\u062F\\.", chatId);
      } else {
        const lines = upcoming.map((m) => {
          const time = lang === "en" ? getEnglishTime(m.utcDate, env) : getJalaliTime(m.utcDate, env);
          const vs = lang === "en" ? " vs " : " \u{1F19A} ";
          return escapeMarkdownCharacters(translateTeam(m.homeTeam.name)) + vs + escapeMarkdownCharacters(translateTeam(m.awayTeam.name)) + "\n" + translateCompetition(m.competition.code) + " \u2014 " + time;
        });
        const header = lang === "en" ? "*Upcoming matches:*\n\n" : "*\u0628\u0627\u0632\u06CC\u200C\u0647\u0627\u06CC \u067E\u06CC\u0634\u200C\u0631\u0648:*\n\n";
        await sendTelegram(env, header + lines.join("\n\n"), chatId);
      }
    } else if (text === "/tables" || text === "/\u062C\u062F\u0648\u0644") {
      await applySettings(env);
      const prefs = await getUserPrefs(env);
      const lang = (prefs[String(chatId)] && prefs[String(chatId)].lang) === "en" ? "en" : "fa";
      const label = lang === "en" ? "Current table" : "\u062C\u062F\u0648\u0644 \u0641\u0639\u0644\u06CC";
      const res = await sendLeagueTables(env, [chatId], { label, lang });
      const wa = await sendWeekAhead(env, [chatId], lang);
      if (res.sent === 0 && wa.sent === 0) {
        await sendTelegram(env, lang === "en" ? "Tables are not available right now\\. Please try again in a few minutes\\." : "\u26A0\uFE0F \u062C\u062F\u0648\u0644\u200C\u0647\u0627 \u0641\u0639\u0644\u0627\u064B \u062F\u0631 \u062F\u0633\u062A\u0631\u0633 \u0646\u06CC\u0633\u062A \\- \u0644\u0637\u0641\u0627\u064B \u062F\u0642\u0627\u06CC\u0642\u06CC \u0628\u0639\u062F \u062F\u0648\u0628\u0627\u0631\u0647 \u062A\u0644\u0627\u0634 \u06A9\u0646\u06CC\u062F\\.", chatId);
      }
    } else if (text && text.startsWith("/")) {
      const prefs = await getUserPrefs(env);
      const lang = (prefs[String(chatId)] && prefs[String(chatId)].lang) === "en" ? "en" : "fa";
      await sendTelegram(env, lang === "en" ? "Unknown command\\. Use /help\\." : "\u{1F4DD} \u062F\u0633\u062A\u0648\u0631 \u0646\u0627\u0634\u0646\u0627\u062E\u062A\u0647 \u0627\u0633\u062A\u060C \u0627\u0632 /help \u0627\u0633\u062A\u0641\u0627\u062F\u0647 \u06A9\u0646\u06CC\u062F\\.", chatId);
    }
    return new Response("OK");
  } catch (error) {
    console.error("Webhook handler error:", error);
  }
}
__name(handleTelegramUpdate, "handleTelegramUpdate");
__name2(handleTelegramUpdate, "handleTelegramUpdate");
var worker_default = {
  async fetch(req, env, ctx) {
    resetSubrequestBudget();
    const url = new URL(req.url);
    if (url.pathname === "/webhook") {
      if (!validateWebhook(req, env)) {
        console.warn("\u26A0\uFE0F Invalid webhook secret");
        return new Response("Unauthorized", { status: 403 });
      }
      let update = null;
      try {
        update = await req.json();
      } catch (e) {
        update = null;
      }
      if (update) {
        ctx.waitUntil(handleTelegramUpdate(env, update).catch((e) => console.error("Webhook background error:", e)));
      }
      return new Response("OK");
    }
    const isAdminPath = url.pathname.startsWith("/admin") || url.pathname.startsWith("/api/");
    if (url.pathname === "/admin/login" && req.method === "POST") {
      const body = await req.json().catch(() => null);
      const ip = req.headers.get("CF-Connecting-IP") || "unknown";
      const username = body && body.username || "";
      const failKey = "login_fail_" + ip + "_" + username;
      const fails = parseInt(await env.STATE.get(failKey).catch(() => null)) || 0;
      if (fails >= 5) return jsonResponse({ error: "Too many attempts, try later" }, 429);
      if (!env.ADMIN_TOKEN) {
        return jsonResponse({ error: "ADMIN_TOKEN secret is not set" }, 500);
      }
      const storedHash = await getAdminPassHash(env);
      let ok = !!(body && username === "admin" && body.password && env.ADMIN_PASS && timingSafeEqualStr(body.password, env.ADMIN_PASS));
      if (!ok && body && username === "admin" && body.password && storedHash) {
        ok = timingSafeEqualStr(await hashPassword(body.password, storedHash.salt), storedHash.hash);
      }
      if (!ok) {
        await env.STATE.put(failKey, String(fails + 1), { expirationTtl: 600 }).catch(() => {
        });
        return jsonResponse({ error: "Invalid credentials" }, 401);
      }
      await env.STATE.delete(failKey).catch(() => {
      });
      const sid = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
      await env.STATE.put("admin_sess_" + sid, JSON.stringify({ created: Date.now(), ip }), { expirationTtl: 43200 }).catch(() => {
      });
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: {
          "content-type": "application/json",
          "set-cookie": "admin_auth=" + sid + "; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=43200"
        }
      });
    }
    if (url.pathname === "/admin/logout" && req.method === "POST") {
      const sid = getAdminCookieToken(req);
      if (sid) await env.STATE.delete("admin_sess_" + sid).catch(() => {
      });
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: {
          "content-type": "application/json",
          "set-cookie": "admin_auth=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0"
        }
      });
    }
    if (url.pathname === "/admin/change-password" && req.method === "POST") {
      if (!await isAdminAuthed(req, env)) return jsonResponse({ error: "Unauthorized" }, 401);
      const body = await req.json().catch(() => null);
      const np = body && body.password;
      if (!np || np.length < 8) return jsonResponse({ error: "Password too short (min 8)" }, 400);
      const salt = crypto.randomUUID();
      const hash = await hashPassword(np, salt);
      await env.STATE.put("admin_pass_hash", JSON.stringify({ salt, hash }));
      return jsonResponse({ ok: true });
    }
    if (url.pathname === "/api/public-matches" && req.method === "GET") {
      try {
        const data = await fetchPublicMatches(env, req);
        if (env.AI) ctx.waitUntil(maybeRunFaAi(env).catch((e) => console.warn("FA-AI bg run failed: " + e.message)));
        return jsonResponse(data);
      } catch (e) {
        console.error("public-matches route failed: " + e.message);
        // v12.x-resilience: try the long-TTL snapshot before giving up
        // and returning an empty degraded response. If even the snapshot
        // is missing/empty, fall through to the degraded JSON (the page
        // hides the cards in that case).
        try {
          const snap = await env.STATE.get(CONFIG.KV_PUBLIC_SNAPSHOT, "json").catch(() => null);
          if (snap && snap.data && (snap.data.upcoming || snap.data.finished || snap.data.topSpot || snap.data.ucl || snap.data.standings)) {
            const stale = Object.assign({}, snap.data, { cached: true, cachedAt: snap.ts ? new Date(snap.ts).toISOString() : snap.data.fetchedAt });
            return jsonResponse(stale);
          }
        } catch (e2) {
          console.error("public-matches snapshot fallback failed: " + e2.message);
        }
        return jsonResponse({ upcoming: [], finished: [], nextBig: null, standings: null, cups: null, ucl: null, degraded: true });
      }
    }
    if (url.pathname === "/public" || url.pathname === "/") {
      return new Response(PUBLIC_PAGE.replace("__PAGE_TZ__", env.TEHRAN_TZ), { headers: PAGE_SEC_HEADERS });
    }
    if (isAdminPath && url.pathname !== "/admin" && !await isAdminAuthed(req, env)) {
      return jsonResponse({
        error: "Unauthorized",
        message: "Login via /admin/login or include 'Authorization: Bearer <ADMIN_TOKEN>' header"
      }, 401);
    }
    await applySettings(env);
    if (url.pathname === "/admin") {
      const authed = await isAdminAuthed(req, env);
      return new Response(authed ? ADMIN_PAGE : LOGIN_PAGE, { headers: PAGE_SEC_HEADERS });
    }
    if (url.pathname === "/api/settings") {
      if (req.method === "GET") {
        return jsonResponse(await getSettings(env));
      }
      if (req.method === "PUT") {
        const body = await req.json().catch(() => null);
        if (!body) return jsonResponse({ error: "Invalid JSON body" }, 400);
        const saved = sanitizeSettings(body);
        let cat = null;
        try {
          cat = await env.STATE.get(CONFIG.KV_CLUBS_CATALOG, "json");
        } catch (e) {
          cat = null;
        }
        saved.teams = syncUclSelection(canonicalizeTeams(saved.teams, cat));
        await env.STATE.put(CONFIG.KV_SETTINGS_KEY, JSON.stringify(saved));
        await applySettings(env);
        return jsonResponse(saved);
      }
    }
    // v12.34-pastel: /healthz is now CORS-open (Access-Control-Allow-Origin: *)
    // so the Next.js audit dashboard (and any other monitor) can fetch the
    // heartbeat JSON cross-origin. OPTIONS preflight returns 204 with the
    // CORS headers; the GET returns the same body as before.
    if (url.pathname === "/healthz") {
      const corsHeaders = {
        "content-type": "application/json",
        "access-control-allow-origin": "*",
        "access-control-allow-methods": "GET, OPTIONS",
        "access-control-allow-headers": "content-type",
        "access-control-max-age": "300",
        "cache-control": "no-store"
      };
      if (req.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: corsHeaders });
      }
      const st = await getCronStatus(env);
      const heartbeat = parseInt(st.heartbeat) || 0;
      const ageMin = heartbeat ? Math.round((Date.now() - heartbeat) / 6e4) : -1;
      const fresh = ageMin >= 0 && ageMin <= CONFIG.EXECUTION_FREQUENCY_MINUTES * 3;
      return new Response(JSON.stringify({ ok: fresh, heartbeat_age_min: ageMin }), {
        status: fresh ? 200 : 503,
        headers: corsHeaders
      });
    }
    // v12.x-seo: sitemap.xml + robots.txt for crawlers. Minimal: one URL for
    // the SPA root; robots allows all + points at the sitemap. Both served
    // with the right content-type so Google Search Console accepts them.
    if (url.pathname === "/sitemap.xml") {
      const xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>https://football.sportsignal.ir/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>\n</urlset>\n';
      return new Response(xml, { headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=3600" } });
    }
    if (url.pathname === "/robots.txt") {
      const body = "User-agent: *\nAllow: /\n\nSitemap: https://football.sportsignal.ir/sitemap.xml\n";
      return new Response(body, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" } });
    }
    if (url.pathname === "/api/members" && req.method === "GET") {
      try {
        return jsonResponse(await getBotMembers(env));
      } catch (e) {
        return jsonResponse({ error: "members lookup failed: " + e.message, count: 0, members: [] }, 200);
      }
    }
    if (url.pathname === "/api/fa-teams" && req.method === "GET") {
      try {
        const forget = String(url.searchParams.get("forget") || "").trim();
        if (forget) {
          if (forget.length > 60) return jsonResponse({ ok: false, error: "name too long" }, 200);
          const k = (0, import_teams.normTeamKey)(forget);
          const rec2 = await env.STATE.get(CONFIG.KV_FA_TEAMS, "json").catch(() => null) || { learned: {}, failed: {} };
          const had = rec2.learned && rec2.learned[k];
          if (had) {
            delete rec2.learned[k];
            rec2.ts = Date.now();
            await env.STATE.put(CONFIG.KV_FA_TEAMS, JSON.stringify(rec2)).catch(() => {
            });
            resetFaAiCache();
          }
          return jsonResponse({ ok: !!had, forgot: had ? forget : null, learned: Object.keys(rec2.learned || {}).length });
        }
        if (url.searchParams.get("run") === "1") {
          const res = await maybeRunFaAi(env, true);
          return jsonResponse(Object.assign({ ok: true, ai: !!env.AI }, res));
        }
        const rec = await env.STATE.get(CONFIG.KV_FA_TEAMS, "json").catch(() => null) || { learned: {}, failed: {} };
        const pub = await env.STATE.get(CONFIG.KV_PUBLIC_MATCHES, "json").catch(() => null);
        await ensureFaAiCache(env).catch(() => {
        });
        const pending = pub && pub.data ? collectUnknownTeamNames(pub.data).length : 0;
        const lastRun = parseInt(await env.STATE.get(CONFIG.KV_FA_LAST_RUN).catch(() => null)) || 0;
        const v3 = await env.STATE.get(CONFIG.KV_V3_CATALOG, "json").catch(() => null);
        const sample = Object.entries(rec.learned || {}).slice(0, 12).map(([k, v]) => ({ key: k, fa: v }));
        return jsonResponse({ ok: true, ai: !!env.AI, learned: Object.keys(rec.learned || {}).length, pending, lastRun: lastRun ? new Date(lastRun).toISOString() : null, v3: v3 && Array.isArray(v3.clubs) ? v3.clubs.length : 0, sample });
      } catch (e) {
        return jsonResponse({ ok: false, error: "fa-teams failed: " + e.message }, 200);
      }
    }
    if (url.pathname === "/api/broadcast" && req.method === "POST") {
      const body = await req.json().catch(() => null);
      const text = body && typeof body.text === "string" && body.text.trim();
      if (!text) return jsonResponse({ error: "text is required" }, 400);
      const chats = await getRegisteredChats(env);
      if (!chats.length) return jsonResponse({ sent: 0, total: 0 });
      const results = await Promise.allSettled(chats.map((c) => sendTelegram(env, escapeMarkdownCharacters(text), c)));
      const okCount = results.filter((r) => r.status === "fulfilled" && r.value === true).length;
      return jsonResponse({ sent: okCount, total: chats.length });
    }
    if (url.pathname === "/api/standings" && req.method === "GET") {
      const code = String(url.searchParams.get("code") || "").toUpperCase();
      if (!code) return jsonResponse({ error: "code param required (e.g. PL, CL)" }, 400);
      const fresh = await fetchStandings(env, code);
      if (!fresh) return jsonResponse({ ok: false, error: "Standings not yet available for " + code + " (source unavailable or season not started)" }, 200);
      const snapKey = CONFIG.KV_STANDINGS_SNAP + code;
      const old = await env.STATE.get(snapKey, "json").catch(() => null);
      await env.STATE.put(snapKey, JSON.stringify(fresh)).catch(() => {
      });
      const teams = fresh.teams.map((t) => {
        const prev = old && old.teams && old.teams.find((x) => (0, import_teams.normalizeTeamName)(x.name) === (0, import_teams.normalizeTeamName)(t.name));
        return { name: t.name, pos: t.pos, points: t.points, delta: prev ? prev.pos - t.pos : null };
      });
      return jsonResponse({ code, matchday: fresh.matchday, teams });
    }
    if (url.pathname === "/api/clubs" && req.method === "GET") {
      try {
        const q = String(url.searchParams.get("q") || "").trim();
        const hint = String(url.searchParams.get("hint") || "").toUpperCase();
        const force = url.searchParams.get("refresh") === "1";
        if (q.length > 40) return jsonResponse({ ok: false, error: "query too long" });
        const cat = await getClubsCatalog(env, force);
        if (!q) return jsonResponse({ ok: true, count: cat.count, fetchedAt: cat.fetchedAt });
        return jsonResponse({
          ok: true,
          count: cat.count,
          fetchedAt: cat.fetchedAt,
          q,
          results: clubsSearch(cat, q, hint)
        });
      } catch (e) {
        return jsonResponse({ ok: false, error: "clubs lookup failed: " + e.message }, 200);
      }
    }
    if (url.pathname === "/api/status") {
      const st = await getCronStatus(env);
      const users = await getRegisteredChats(env);
      return jsonResponse({
        version: VERSION,
        heartbeat: st.heartbeat && st.heartbeat !== "0" ? new Date(parseInt(st.heartbeat)).toISOString() : null,
        last_cron: st.last_cron && st.last_cron !== "0" ? new Date(parseInt(st.last_cron)).toISOString() : null,
        api_source: st.api_source,
        users: users.length,
        // Audit fix 15: raw chat ids masked — the admin panel only needs the
        // count and a recognizable prefix/suffix, not full Telegram ids.
        chat_ids: users.map((id) => {
          const s = String(id);
          return s.length > 6 ? s.slice(0, 3) + "\u2022\u2022\u2022" + s.slice(-2) : "\u2022\u2022\u2022";
        }),
        timezone: env.TEHRAN_TZ,
        monitored_leagues: CONFIG.LEAGUES,
        teams_count: Object.values(CONFIG.BIG_TEAMS_BY_LEAGUE).flat().length
      });
    }
    if (url.pathname === "/api/test" && req.method === "POST") {
      const chats = await getRegisteredChats(env);
      const msg = "\u{1F9EA} \u067E\u06CC\u0627\u0645 \u062A\u0633\u062A \u062A\u0646\u0638\u06CC\u0645\u0627\u062A\n\u0631\u0628\u0627\u062A \u0641\u0639\u0627\u0644 \u0627\u0633\u062A \u2713";
      const results = await Promise.allSettled(chats.map((id) => sendTelegram(env, msg, id)));
      const sent = results.filter((r) => r.status === "fulfilled" && r.value === true).length;
      return jsonResponse({ sent, total: chats.length });
    }
    if (url.pathname === "/api/simulate" && req.method === "POST") {
      const dummy = buildDummyMatches();
      const realKey = CONFIG.KV_NOTIFIED_KEY;
      const realPrefsKey = CONFIG.KV_USER_PREFS;
      CONFIG.KV_NOTIFIED_KEY = "test_sim_v1";
      CONFIG.KV_USER_PREFS = "test_sim_v1_prefs";
      try {
        const chats = await getRegisteredChats(env);
        if (!chats.length) {
          return jsonResponse({ passed: false, failures: ["no registered users \u2014 sign in to the bot via /start first"], sent: {}, probes: [] });
        }
        await env.STATE.delete(CONFIG.KV_NOTIFIED_KEY);
        await sendMatchNotifications(env, dummy);
        const tracked = await env.STATE.get(CONFIG.KV_NOTIFIED_KEY, "json").catch(() => null);
        const counts = {};
        for (const arr of Object.values(tracked || {})) {
          for (const n of arr) counts[n.notificationType] = (counts[n.notificationType] || 0) + 1;
        }
        const expected = [
          ["sim-pre-match-24h", "pre-match-24h"],
          ["sim-pre-match-3h", "pre-match-3h"],
          ["sim-pre-match-1h", "pre-match-1h"],
          ["sim-match-start", "match-start"],
          ["sim-result", "result"],
          ["sim-probe-mixed", "pre-match-1h"],
          ["sim-probe-none", null],
          ["sim-probe-el", "pre-match-1h"],
          ["sim-probe-ecl", "pre-match-1h"],
          ["sim-probe-el-24h", "pre-match-24h"],
          ["sim-probe-knockout", "result"],
          ["sim-probe-cup", "pre-match-1h"],
          ["sim-probe-backfill-24h", "pre-match-24h"],
          ["sim-probe-backfill-3h", "pre-match-3h"],
          ["sim-probe-bigmatch", "pre-match-72h"],
          ["sim-probe-bigmatch-none", null]
        ];
        const probes = [];
        const failures = [];
        for (const [id, wantType] of expected) {
          const m = dummy.find((x) => x.id === id);
          if (!m) {
            failures.push(id + ": probe missing");
            continue;
          }
          const row = tracked ? tracked[(0, import_dedupe.matchKey)(m)] : null;
          const got = row && row.some((n) => n.notificationType === wantType);
          const silent = !row || !row.length;
          const ok = wantType === null ? silent : got;
          probes.push({ id, expected: wantType || "silent", notified: row ? row.map((n) => n.notificationType) : [] });
          if (!ok) failures.push(id + ": expected " + (wantType || "silent") + ", got " + JSON.stringify(row ? row.map((n) => n.notificationType) : []));
        }
        const resultDummy = dummy.find((m) => m.id === "sim-result");
        const knockoutDummy = dummy.find((m) => m.id === "sim-probe-knockout");
        const preview = resultDummy ? await formatResultMessage(resultDummy, env) : null;
        const previewKnockout = knockoutDummy ? await formatResultMessage(knockoutDummy, env) : null;
        return jsonResponse({
          sent: counts,
          probes,
          passed: failures.length === 0,
          failures,
          preview,
          previewKnockout,
          note: "Test messages sent to registered chats; real notification state untouched"
        });
      } finally {
        CONFIG.KV_NOTIFIED_KEY = realKey;
        CONFIG.KV_USER_PREFS = realPrefsKey;
      }
    }
    if (url.pathname === "/api/sources") {
      const report = {};
      const sources = [
        { name: "football-data", fn: fetchFootballData },
        { name: "sportscore", fn: fetchSportScore },
        { name: "thesportsdb", fn: fetchTheSportsDB }
      ];
      for (const s of sources) {
        try {
          const m = await s.fn(env);
          report[s.name] = {
            ok: true,
            matches: m.length,
            worthy: m.filter(shouldNotify).length,
            sample: m.slice(0, 3).map((x) => x.homeTeam.name + " vs " + x.awayTeam.name + " (" + x.competition.code + ")")
          };
        } catch (e) {
          report[s.name] = { ok: false, error: e.message };
        }
      }
      return jsonResponse(report);
    }
    if (url.pathname === "/api/webhook/info") {
      const res = await fetch("https://api.telegram.org/bot" + env.BOT_TOKEN + "/getWebhookInfo").catch(() => null);
      return jsonResponse(res ? await res.json() : { ok: false, error: "Telegram unreachable from worker" });
    }
    if (url.pathname === "/api/bot/info") {
      const res = await fetch("https://api.telegram.org/bot" + env.BOT_TOKEN + "/getMe").catch(() => null);
      return jsonResponse(res ? await res.json() : { ok: false, error: "Telegram unreachable from worker" });
    }
    if (url.pathname === "/api/webhook/setup" && req.method === "POST") {
      const secret = env.WEBHOOK_SECRET;
      if (!secret) return jsonResponse({ ok: false, error: "WEBHOOK_SECRET secret is not set" }, 400);
      const webhookUrl = "https://" + url.host + "/webhook";
      const res = await fetch("https://api.telegram.org/bot" + env.BOT_TOKEN + "/setWebhook", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: webhookUrl, secret_token: secret, allowed_updates: ["message", "callback_query"] })
      }).catch(() => null);
      const body = res ? await res.json() : { ok: false, error: "Telegram unreachable from worker" };
      return jsonResponse({ ...body, webhook_url: webhookUrl });
    }
    // v12.33-xpost: X (Twitter) admin routes. All require admin auth.
    // /admin/x-test sends a manual test post (admin-token protected); the
    // /api/x/* endpoints power the admin panel's X status card.
    if (url.pathname === "/admin/x-test" && req.method === "POST") {
      if (!await isAdminAuthed(req, env)) return jsonResponse({ error: "Unauthorized" }, 401);
      try {
        const r = await xTestPost(env);
        return jsonResponse(r, r.ok ? 200 : 400);
      } catch (e) {
        return jsonResponse({ ok: false, error: e.message }, 500);
      }
    }
    if (url.pathname === "/api/x/status" && req.method === "GET") {
      if (!await isAdminAuthed(req, env)) return jsonResponse({ error: "Unauthorized" }, 401);
      try {
        return jsonResponse(await getXStatus(env));
      } catch (e) {
        return jsonResponse({ error: e.message }, 500);
      }
    }
    if (url.pathname === "/api/x/phase" && req.method === "PUT") {
      if (!await isAdminAuthed(req, env)) return jsonResponse({ error: "Unauthorized" }, 401);
      try {
        const body = await req.json().catch(() => null);
        const raw = body && typeof body.phase === "string" ? body.phase : "";
        const clean = raw.split(",").map((s) => s.trim().toLowerCase()).filter((s) => ["coronation", "ft", "kickoff", "tables", "media"].indexOf(s) !== -1);
        if (!clean.length) return jsonResponse({ error: "phase must include at least one of: coronation, ft, kickoff, tables, media" }, 400);
        await env.STATE.put(X_CONFIG.KV_PHASE, clean.join(",")).catch(() => {
        });
        return jsonResponse({ ok: true, phase: clean });
      } catch (e) {
        return jsonResponse({ error: e.message }, 500);
      }
    }
    if (url.pathname === "/api/x/dry-run" && req.method === "PUT") {
      if (!await isAdminAuthed(req, env)) return jsonResponse({ error: "Unauthorized" }, 401);
      try {
        const body = await req.json().catch(() => null);
        const v = body && body.dryRun ? "1" : "0";
        await env.STATE.put(X_CONFIG.KV_DRY_RUN, v).catch(() => {
        });
        return jsonResponse({ ok: true, dryRun: v === "1" });
      } catch (e) {
        return jsonResponse({ error: e.message }, 500);
      }
    }
    if (url.pathname === "/api/x/enabled" && req.method === "PUT") {
      if (!await isAdminAuthed(req, env)) return jsonResponse({ error: "Unauthorized" }, 401);
      try {
        const body = await req.json().catch(() => null);
        const v = body && body.enabled ? "1" : "0";
        await env.STATE.put(X_CONFIG.KV_ENABLED, v).catch(() => {
        });
        return jsonResponse({ ok: true, enabled: v === "1" });
      } catch (e) {
        return jsonResponse({ error: e.message }, 500);
      }
    }
    if (url.pathname === "/api/x/clear-pause" && req.method === "POST") {
      if (!await isAdminAuthed(req, env)) return jsonResponse({ error: "Unauthorized" }, 401);
      await env.STATE.delete(X_CONFIG.KV_PAUSE).catch(() => {
      });
      return jsonResponse({ ok: true });
    }
    if (url.pathname === "/api/diag-public" && await isAdminAuthed(req, env)) {
      await applySettings(env);
      const live = await fetchMatchesFromAPI(env);
      const pool = await getCachedMatches(env);
      const now = Date.now();
      const codeOf = /* @__PURE__ */ __name((list) => list.reduce((a, m) => {
        const c = m.competition.code;
        a[c] = (a[c] || 0) + 1;
        return a;
      }, {}), "codeOf");
      return jsonResponse({
        live_len: live.length,
        live_worthy: live.filter(shouldNotify).length,
        live_codes: codeOf(live),
        cache_len: pool.length,
        cache_worthy: pool.filter(shouldNotify).length,
        cache_codes: codeOf(pool),
        live_sample: live.slice(0, 6).map((m) => `${m.competition.code}: ${m.homeTeam.name} vs ${m.awayTeam.name} [${m.status}] ${shouldNotify(m) ? "WORTHY" : "no"}`),
        cache_sample: pool.slice(0, 6).map((m) => `${m.competition.code}: ${m.homeTeam.name} vs ${m.awayTeam.name} [${m.status}] ${shouldNotify(m) ? "WORTHY" : "no"}`)
      });
    }
    if (url.pathname === "/api/diag-fd" && await isAdminAuthed(req, env)) {
      const days = parseInt(url.searchParams.get("days") || "7");
      const comps = url.searchParams.get("comps") || "PD";
      const dateFrom = new Date(Date.now() - 2 * 864e5).toISOString().split("T")[0];
      const dateTo = new Date(Date.now() + days * 864e5).toISOString().split("T")[0];
      const key = env.API_TOKEN || "";
      const u = `${CONFIG.API_URL}?competitions=${comps}&dateFrom=${dateFrom}&dateTo=${dateTo}`;
      const res = await fetch(u, { headers: { "X-Auth-Token": key } }).catch((e) => ({ err: e.message }));
      if (res.err) return jsonResponse({ comps, error: "network: " + res.err });
      const text = await res.text();
      let count = null;
      try {
        count = (JSON.parse(text).matches || []).length;
      } catch (e) {
      }
      return jsonResponse({ comps, days, status: res.status, count, body: text.substring(0, 200) });
    }
    if (req.method === "GET") {
      const path = url.pathname.substring(1) || url.searchParams.get("action") || "";
      const adminEndpoints = ["clear-notifications", "clear-locks", "trigger", "simple-test", "send-tables", "next-matches", "debug-notifications", "health", "teams"];
      if (adminEndpoints.includes(path) && !await isAdminAuthed(req, env)) {
        return new Response(JSON.stringify({
          error: "Unauthorized",
          message: "Include 'Authorization: Bearer <token>' header"
        }), {
          status: 401,
          headers: { "content-type": "application/json" }
        });
      }
      switch (path) {
        case "debug-notifications":
          try {
            const notifiedMatches = await getNotifiedMatches(env);
            const now2 = Date.now();
            return new Response(JSON.stringify({
              total_matches: Object.keys(notifiedMatches).length,
              matches: Object.entries(notifiedMatches).map(([matchId, notifications]) => ({
                match_id: matchId,
                notifications: notifications.filter((n) => now2 < n.expiresAt).map((n) => ({
                  type: n.notificationType,
                  notified_at: new Date(n.notifiedAt).toISOString(),
                  expires_at: new Date(n.expiresAt).toISOString(),
                  expires_in_hours: ((n.expiresAt - now2) / CONFIG.ONE_HOUR_MS).toFixed(1)
                }))
              }))
            }, null, 2), {
              headers: { "content-type": "application/json" }
            });
          } catch (error) {
            return new Response(JSON.stringify({
              error: error.message
            }, null, 2), {
              headers: { "content-type": "application/json" }
            });
          }
        case "next-matches":
          try {
            const matches = await fetchLongView(env);
            const now2 = /* @__PURE__ */ new Date();
            const worthyMatches = matches.filter(shouldNotify);
            const upcoming = worthyMatches.filter((m) => new Date(m.utcDate) > now2).sort((a, b) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime()).slice(0, 10);
            return new Response(JSON.stringify({
              count: upcoming.length,
              matches: upcoming.map((m) => ({
                id: m.id,
                home: translateTeam(m.homeTeam.name),
                away: translateTeam(m.awayTeam.name),
                home_en: m.homeTeam.name,
                away_en: m.awayTeam.name,
                code: m.competition.code,
                competition: translateCompetition(m.competition.code),
                utc_date: m.utcDate,
                tehran_time: new Date(m.utcDate).toLocaleString("fa-IR", { timeZone: env.TEHRAN_TZ }),
                time_en: new Date(m.utcDate).toLocaleString("en-GB", { timeZone: env.TEHRAN_TZ }),
                hours_until: ((new Date(m.utcDate).getTime() - now2.getTime()) / CONFIG.ONE_HOUR_MS).toFixed(2),
                minutes_until: ((new Date(m.utcDate).getTime() - now2.getTime()) / (60 * 1e3)).toFixed(0),
                notification_windows: {
                  "24h": isWithin24HourWindow(m, env),
                  "3h": isWithin3HourWindow(m, env),
                  "1h": isWithin1HourWindow(m, env),
                  "match_start": isMatchStartingNow(m, env)
                }
              }))
            }, null, 2), {
              headers: { "content-type": "application/json" }
            });
          } catch (error) {
            return new Response(JSON.stringify({
              error: error.message
            }, null, 2), {
              headers: { "content-type": "application/json" }
            });
          }
        case "clear-notifications":
          await env.STATE.delete(CONFIG.KV_NOTIFIED_KEY);
          return new Response("\u2705 Notification tracking cleared. Next run will send all notifications again.");
        case "clear-locks":
          await env.STATE.delete(CONFIG.KV_MATCHES_KEY);
          await env.STATE.delete(CONFIG.KV_USERS_KEY);
          await env.STATE.delete(CONFIG.KV_HEARTBEAT);
          await env.STATE.delete(CONFIG.KV_LAST_CRON);
          await env.STATE.delete("cron_status_v1");
          await env.STATE.delete(CONFIG.KV_NOTIFIED_KEY);
          await env.STATE.delete(CONFIG.KV_EXECUTION_LOCK);
          return new Response("\u2705 All cache cleared. Users need to /start again.");
        case "health":
          const st = await getCronStatus(env);
          const heartbeat = st.heartbeat;
          const users = await getRegisteredChats(env);
          const now = getNowTehran(env);
          return new Response(JSON.stringify({
            status: "healthy",
            timestamp: (/* @__PURE__ */ new Date()).toISOString(),
            tehran_time: now.toISOString(),
            last_heartbeat: heartbeat && heartbeat !== "0" ? new Date(parseInt(heartbeat)).toISOString() : null,
            user_count: users.length,
            version: VERSION,
            api_source: await env.STATE.get(CONFIG.KV_LAST_SOURCE),
            timezone: env.TEHRAN_TZ,
            config: {
              date_range: `${CONFIG.DATE_RANGE_DAYS} days`,
              monitored_leagues: CONFIG.LEAGUES.length,
              domestic_cups: Object.keys(CONFIG.DOMESTIC_CUP_IDS).length,
              strict_mode: true,
              big_teams: Object.values(CONFIG.BIG_TEAMS_BY_LEAGUE).flat().length,
              notifications: {
                "24_hours_before": `${CONFIG.PRE_MATCH_NOTIFICATION_HOURS} hours`,
                "3_hours_before": `${CONFIG.REMINDER_3_HOURS} hours`,
                "1_hour_before": `${CONFIG.REMINDER_1_HOUR} hour`,
                "match_start_window": "after kickoff (-1..+20 min)",
                "result_after": `${CONFIG.POST_MATCH_NOTIFICATION_HOURS} hours`
              },
              execution_frequency: `${CONFIG.EXECUTION_FREQUENCY_MINUTES} minutes`
            }
          }, null, 2), {
            headers: { "content-type": "application/json" }
          });
        case "":
          return jsonResponse({
            status: "ok",
            version: VERSION,
            health: "/health",
            admin: "/admin"
          });
        case "trigger":
          try {
            const triggerStart = Date.now();
            await executeScheduledLogic(env);
            const elapsed = ((Date.now() - triggerStart) / 1e3).toFixed(1);
            return new Response(JSON.stringify({
              success: true,
              message: "\u2705 Trigger completed successfully",
              elapsed_seconds: elapsed,
              timestamp: (/* @__PURE__ */ new Date()).toISOString()
            }, null, 2), { headers: { "content-type": "application/json" } });
          } catch (err) {
            return new Response(JSON.stringify({
              success: false,
              error: err.message,
              timestamp: (/* @__PURE__ */ new Date()).toISOString()
            }, null, 2), {
              status: 500,
              headers: { "content-type": "application/json" }
            });
          }
        case "simple-test":
          const chats = await getRegisteredChats(env);
          const nowTime = getNowTehran(env);
          const msg = `*\u{1F527} \u062A\u0633\u062A \u0633\u06CC\u0633\u062A\u0645 \\- \u0646\u0633\u062E\u0647 ${VERSION}*

\u0628\u0627\u062A \u062F\u0631 \u062D\u0627\u0644 \u06A9\u0627\u0631 \u0627\u0633\u062A\\!
\u0632\u0645\u0627\u0646 \u062A\u0647\u0631\u0627\u0646: ${nowTime.toLocaleTimeString("fa-IR")}

\u2705 \u0631\u0641\u0639 \u0627\u0634\u06A9\u0627\u0644\u0627\u062A:
  \\- \u0645\u0634\u06A9\u0644 \u0630\u062E\u06CC\u0631\u0647\u200C\u0633\u0627\u0632\u06CC KV
  \\- TTL \u0627\u0635\u0644\u0627\u062D \u0634\u062F
  \\- \u067E\u0646\u062C\u0631\u0647\u200C\u0647\u0627\u06CC \u0632\u0645\u0627\u0646\u06CC \u0628\u0647\u0628\u0648\u062F \u06CC\u0627\u0641\u062A\u0647

\u{1F4CA} \u062A\u0646\u0638\u06CC\u0645\u0627\u062A:
  \\- \u0627\u0639\u0644\u0627\u0646 \u06F2\u06F4 \u0633\u0627\u0639\u062A \u0642\u0628\u0644: \u0641\u0639\u0627\u0644
  \\- \u0627\u0639\u0644\u0627\u0646 \u06F3 \u0633\u0627\u0639\u062A \u0642\u0628\u0644: \u0641\u0639\u0627\u0644
  \\- \u0627\u0639\u0644\u0627\u0646 \u06F1 \u0633\u0627\u0639\u062A \u0642\u0628\u0644: \u0641\u0639\u0627\u0644
  \\- \u0627\u0639\u0644\u0627\u0646 \u0634\u0631\u0648\u0639 \u0628\u0627\u0632\u06CC: \u0641\u0639\u0627\u0644`;
          await Promise.allSettled(chats.map((id) => sendTelegram(env, msg, id)));
          return new Response("\u2705 Simple test sent");
        case "send-tables":
          try {
            await applySettings(env);
            const tchats = await getRegisteredChats(env);
            const tres = await sendLeagueTables(env, tchats, { label: "\u067E\u0627\u06CC\u0627\u0646 \u0647\u0641\u062A\u0647 \u2014 \u0627\u0631\u0633\u0627\u0644 \u062F\u0633\u062A\u06CC" });
            const twa = await sendWeekAhead(env, tchats);
            return new Response(JSON.stringify({
              success: true,
              message: "League tables + week-ahead sent to " + tchats.length + " chat(s)",
              chats: tchats,
              sent: tres.sent,
              failed: tres.failed,
              week_ahead: { sent: twa.sent, failed: twa.failed, skipped: !twa.text },
              leagues: tres.leagues,
              version: VERSION,
              timestamp: (/* @__PURE__ */ new Date()).toISOString()
            }, null, 2), { headers: { "content-type": "application/json" } });
          } catch (err) {
            return new Response(JSON.stringify({
              success: false,
              error: err.message,
              timestamp: (/* @__PURE__ */ new Date()).toISOString()
            }, null, 2), {
              status: 500,
              headers: { "content-type": "application/json" }
            });
          }
        case "teams":
          return new Response(JSON.stringify({
            monitored_teams: Object.entries(CONFIG.BIG_TEAMS_BY_LEAGUE).reduce((acc, [league, teams]) => {
              acc[translateCompetition(league)] = teams.map((t) => translateTeam(t));
              return acc;
            }, {}),
            total_teams: Object.values(CONFIG.BIG_TEAMS_BY_LEAGUE).flat().length,
            leagues: CONFIG.LEAGUES,
            domestic_cups: Object.keys(CONFIG.DOMESTIC_CUP_IDS)
          }, null, 2), {
            headers: { "content-type": "application/json" }
          });
        default:
          return new Response("404 Not Found", { status: 404 });
      }
    }
    return new Response("Method not allowed", { status: 405 });
  },
  async scheduled(event, env, ctx) {
    console.log("\u23F0 Scheduled event triggered");
    try {
      await executeScheduledLogic(env);
    } catch (error) {
      console.error("Scheduled execution failed:", error);
    }
  }
};
export {
  worker_default as default
};
//# sourceMappingURL=worker.js.map
