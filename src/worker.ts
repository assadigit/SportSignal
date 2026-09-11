var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/worker.ts
import { normalizeTeamName, normTeamKey } from "./teams.js";
import { matchKey, canonDedupe } from "./dedupe.js";
const VERSION = "12.15-uniform";

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
      "FC Bayern M\u00FCnchen",
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
    "FA_CUP": 2055, // football-data FA Cup (was 2018 = Euro Championship — cups never fetched!)
    "EFL_CUP": 2139, // Carabao Cup (Football League Cup)
    "CDR": 2079, // Copa del Rey (was 2013 = Brasileirão Série A)
    "COPPA_ITALIA": 2122 // Coppa Italia (was 2022 = Austrian Playoffs)
  },
  // International tournaments (world/continental cups). Fetched near-term only and
  // shown in the app only while in process (a fixture on the horizon). Kept OUT of
  // LEAGUES: national teams never match the followed clubs, so they can't notify.
  INTL_COMPETITIONS: {
    "WC": 2000, // FIFA World Cup
    "EC": 2018, // UEFA Euro
    "COPA": 2029, // Copa América
    "AFCON": 2088, // Africa Cup of Nations
    "AFC": 2092 // AFC Asian Cup
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
  KV_USER_PREFS: "user_prefs_v1",
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
    "CL", "PL", "PD", "SA", "FL1", "BL1", "EL", "ECL",
    "FA_CUP", "EFL_CUP", "CDR", "COPPA_ITALIA"
  ],
  // v12.14: club-name autocomplete catalog for the admin panel's "add club"
  // inputs. The roster is pre-downloaded from the SAME providers the matcher
  // uses (football-data /teams + sportscore for the A-League) and cached in
  // KV; /api/clubs serves prefix matches so the panel stores the EXACT API
  // name ("AS Roma", not a guessed "Roma"). Stale after 14 days (rosters
  // move in windows, not daily).
  KV_CLUBS_CATALOG: "clubs_catalog",
  CLUBS_STALE_MS: 12096e5,
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
function escapeMarkdownCharacters(text) {
  return text.replace(/([\[\]\(\)~`>#\+\-=|{}\.!_])/g, "\\$1");
}
__name(escapeMarkdownCharacters, "escapeMarkdownCharacters");
// Audit fix 17 (log noise): per-item debug logs are gated behind LOG_VERBOSE;
// run-level summaries and console.error stay unconditional.
var LOG_VERBOSE = false;
function vlog(...args) {
  if (LOG_VERBOSE) console.log(...args);
}
__name(vlog, "vlog");
// Admin password is stored PBKDF2-hashed in KV so the user can change it from the UI
// (Cloudflare secrets can't be written at runtime). env.ADMIN_PASS still takes
// precedence as the bootstrap password until changed.
async function hashPassword(pass, salt) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(pass), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: enc.encode(salt), iterations: 100000, hash: "SHA-256" }, key, 256);
  return [...new Uint8Array(bits)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(hashPassword, "hashPassword");
async function getAdminPassHash(env) {
  return await env.STATE.get("admin_pass_hash", "json").catch(() => null);
}
__name(getAdminPassHash, "getAdminPassHash");
// Audit fix 14: constant-time string comparison for all secret checks (webhook
// secret, Bearer token, session cookie, admin password). Compares over the
// max length so timing does not leak the prefix; length mismatch burns the
// full loop as well.
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
function getNowUTC() {
  return /* @__PURE__ */ new Date();
}
__name(getNowUTC, "getNowUTC");
function getNowTehran(env) {
  // Audit fix 16: robust reimplementation. CONVENTION (unchanged): the returned
  // Date carries Tehran wall-clock on the UTC timeline — its getUTCHours() etc.
  // read Tehran time (the +3:30 skew is intentional and documented at call
  // sites). The old toLocaleString()-then-parse form depended on fragile
  // en-US locale formatting; formatToParts is deterministic.
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: env.TEHRAN_TZ || "Asia/Tehran",
    hour12: false,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit"
  }).formatToParts(/* @__PURE__ */ new Date());
  const p = {};
  for (const x of parts) p[x.type] = x.value;
  const hh = p.hour === "24" ? "00" : p.hour;
  return new Date(`${p.year}-${p.month}-${p.day}T${hh}:${p.minute}:${p.second}Z`);
}
__name(getNowTehran, "getNowTehran");
function getJalaliDate(utcDateStr, env) {
  const date = new Date(utcDateStr);
  const dateOpt = { timeZone: env.TEHRAN_TZ, day: "numeric", month: "long", year: "numeric", weekday: "long" };
  // Persian order: day month-name year (جمعه ۳۰ مرداد ۱۴۰۵) — fa-IR formatToParts
  // keeps the fields, we assemble them in the human order instead of y/m/d.
  const parts = new Intl.DateTimeFormat("fa-IR", dateOpt).formatToParts(date);
  const get = (t) => { const p = parts.find((x) => x.type === t); return p ? p.value : ""; };
  return `${get("weekday")} ${get("day")} ${get("month")} ${get("year")}`;
}
__name(getJalaliDate, "getJalaliDate");
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
// CPU fix (audit finding 5): translateTeam previously rebuilt this ~600-entry
// dict on EVERY call and re-scanned it with normalization per lookup. It is now
// built once (lazily) and served through pre-normalized Map indexes.
var FA_TEAMS_DICT = null;
var FA_TEAMS_NORM = null;
var FA_TEAMS_STEM = null;
function buildFaTeamDict() {
  // Varzesh3-standard Persian names, keyed by canonical English name.
  // Lookup: exact first, then normalized (drops "AFC/FC/CF/RCD..." so any
  // provider variant resolves — e.g. "AFC Bournemouth" and "Bournemouth").
  const FA_TEAMS = {
    // Premier League 2025-26
    "Arsenal FC": "آرسنال",
    "Aston Villa FC": "استون ویلا",
    "AFC Bournemouth": "بورنموث",
    "Brentford FC": "برنتفورد",
    "Brighton & Hove Albion FC": "برایتون",
    "Chelsea FC": "چلسی",
    "Crystal Palace FC": "کریستال پالاس",
    "Everton FC": "اورتون",
    "Fulham FC": "فولام",
    "Hull City AFC": "هال سیتی",
    "Ipswich Town FC": "ایپسویچ",
    "Leeds United FC": "لیدز",
    "Leicester City FC": "لستر",
    "Liverpool FC": "لیورپول",
    "Manchester City FC": "منچسترسیتی",
    "Manchester United FC": "منچستریونایتد",
    "Newcastle United FC": "نیوکاسل",
    "Nottingham Forest FC": "ناتینگهام فارست",
    "Southampton FC": "ساوت‌همپتون",
    "Tottenham Hotspur FC": "تاتنهام",
    "West Ham United FC": "وست‌هم",
    "Wolverhampton Wanderers FC": "ولورهمپتون",
    "Burnley FC": "برنلی",
    "Middlesbrough FC": "میدلزبرو",
    "Sunderland AFC": "ساندرلند",
    "Oxford United FC": "آکسفورد یونایتد",
    "Derby County FC": "دربی کانتی",
    "Norwich City FC": "نوریچ سیتی",
    "Sheffield Wednesday FC": "شفیلد ونزدی",
    "Portsmouth FC": "پورتسموث",
    "Blackburn Rovers FC": "بلکبرن",
    "Millwall FC": "میلوال",
    "Preston North End FC": "پرستون",
    "Queens Park Rangers FC": "کویینز پارک رنجرز",
    "Swansea City AFC": "سوانسی",
    "Bristol City FC": "بریستول سیتی",
    "Coventry City FC": "کاونتری",
    "Stoke City FC": "استوک سیتی",
    "Luton Town FC": "لوتون تاون",
    "West Bromwich Albion FC": "وست برومویچ",
    "Watford FC": "واتفورد",
    "Cardiff City FC": "کاردیف",
    "Sheffield United FC": "شفیلد یونایتد",
    "Wigan Athletic FC": "ویگان",
    "Birmingham City FC": "بیرمنگام",
    "Charlton Athletic FC": "چارلتون",
    "Reading FC": "ردینگ",
    "Bradford City AFC": "بردفورد",
    "Peterborough United FC": "پیتربورو",
    "Salford City FC": "سالفورد",
    "Mansfield Town FC": "منزفیلد",
    // La Liga 2025-26
    "FC Barcelona": "بارسلونا",
    "Real Madrid CF": "رئال مادرید",
    "Atlético Madrid": "اتلتیکو مادرید",
    "Club Atlético de Madrid": "اتلتیکو مادرید",
    "Atlético de Madrid": "اتلتیکو مادرید",
    "Athletic Club": "اتلتیک بیلبائو",
    "Athletic Bilbao": "اتلتیک بیلبائو",
    "Real Sociedad": "رئال سوسیداد",
    "Real Betis": "رئال بتیس",
    "Villarreal CF": "ویارئال",
    "Sevilla FC": "سویا",
    "Valencia CF": "والنسیا",
    "Deportivo Alavés": "آلوس",
    "Getafe CF": "ختافه",
    "Girona FC": "خیرونا",
    "CA Osasuna": "اوساسونا",
    "RC Celta de Vigo": "سلتاویگو",
    "RCD Mallorca": "مایورکا",
    "Rayo Vallecano": "رایو وایکانو",
    "Rayo Vallecano de Madrid": "رایو وایکانو",
    "Elche CF": "الچه",
    "Elche": "الچه",
    "RCD Espanyol": "اسپانیول",
    "RCD Espanyol de Barcelona": "اسپانیول",
    "Espanyol": "اسپانیول",
    "Real Sociedad de Fútbol": "رئال سوسیداد",
    "Stade Rennais FC 1901": "رن",
    "Real Valladolid CF": "وایادولید",
    "Leganés": "لگانس",
    "UD Las Palmas": "لاس پالماس",
    "Espanyol": "اسپانیول",
    "RCD Espanyol de Barcelona": "اسپانیول",
    "Levante UD": "لوانته",
    "SD Huesca": "هوئسکا",
    "UD Almería": "آلمریا",
    // Serie A 2025-26
    "Inter Milan": "اینتر میلان",
    "Inter": "اینتر میلان",
    "FC Internazionale Milano": "اینتر میلان",
    "Internazionale": "اینتر میلان",
    "AC Milan": "آث میلان",
    "Juventus FC": "یوونتوس",
    "SSC Napoli": "ناپولی",
    "AS Roma": "رم",
    "Lazio": "لاتزیو",
    "Atalanta BC": "آتالانتا",
    "Fiorentina": "فیورنتینا",
    "Bologna FC 1909": "بولونیا",
    "Torino FC": "تورینو",
    "AS Monaco FC": "موناکو",
    "Udinese Calcio": "اودینزه",
    "Genoa CFC": "جنوا",
    "Parma Calcio 1913": "پارما",
    "Como 1907": "کومو",
    "US Lecce": "لچه",
    "Cagliari Calcio": "کالیاری",
    "Hellas Verona": "هلاس ورونا",
    "Pisa SC": "پیزا",
    "Sassuolo Calcio": "ساسولو",
    "Empoli FC": "امپولی",
    "AC Monza": "مونتزا",
    "Venezia FC": "ونیز",
    "Spezia Calcio": "اسپتزیا",
    "US Cremonese": "کرمونزه",
    // Ligue 1 2025-26
    "Paris Saint-Germain": "پاری‌سن‌ژرمن",
    "PSG": "پاری‌سن‌ژرمن",
    // v12.8 (audit backlog "Paris FC name fix"): the stem fallback folded
    // "Paris FC" (normKey "paris") onto "parissaintgermain" — the promoted
    // club rendered as PSG in Persian. Exact entry wins before any fallback.
    "Paris FC": "پاری‌اف‌سی",
    "Olympique de Marseille": "مارسی",
    "Olympique Lyonnais": "لیون",
    "Lille OSC": "لیل",
    "OGC Nice": "نیس",
    "AS Monaco": "موناکو",
    "Stade Rennais FC": "رن",
    "RC Lens": "لانس",
    "Toulouse FC": "تولوز",
    "Montpellier HSC": "مونپلیه",
    "FC Nantes": "نانت",
    "RC Strasbourg Alsace": "استراسبورگ",
    "Stade de Reims": "رنس",
    "AJ Auxerre": "اکسر",
    "Angers SCO": "انژه",
    "Stade Brestois 29": "برست",
    "Le Havre AC": "لو آور",
    "FC Metz": "متز",
    // Bundesliga 2025-26 (CL/EL/ECL opponents)
    "FC Bayern München": "بایرن مونیخ",
    "Bayern Munich": "بایرن مونیخ",
    "Borussia Dortmund": "دورتموند",
    // v12.8: promoted BL1 side now visible on the public page
    "SC Paderborn 07": "پادربورن",
    "RB Leipzig": "لایپزیش",
    "Bayer 04 Leverkusen": "بایرلورکوزن",
    "Bayer Leverkusen": "بایرلورکوزن",
    "Eintracht Frankfurt": "آینتراخت فرانکفورت",
    "VfB Stuttgart": "اشتوتگارت",
    "Melbourne Victory": "ملبورن ویکتوری",
    "Melbourne City": "ملبورن سیتی",
    "Sydney FC": "سیدنی",
    "Western Sydney Wanderers": "وسترن سیدنی واندررز",
    "Adelaide United": "آدلاید یونایتد",
    "Central Coast Mariners": "سنترال کوئست مارینرز",
    "Brisbane Roar": "بریزبن",
    "SC Freiburg": "فرایبورگ",
    "Borussia Mönchengladbach": "بروسیا مونشن‌گلادباخ",
    "VfL Wolfsburg": "وولفسبورگ",
    "1. FC Union Berlin": "یونیون برلین",
    "1. FC Heidenheim 1846": "هایدنهایم",
    "FC Augsburg": "آگسبورگ",
    "Holstein Kiel": "هولشتاین کیل",
    "SV Werder Bremen": "وردر برمن",
    "VfL Bochum": "بوخوم",
    "1. FSV Mainz 05": "ماینس",
    "SV Darmstadt 98": "دارمشتات",
    "FC St. Pauli": "سنت پائولی",
    "SSV Ulm 1846": "اولم",
    "Hamburger SV": "هامبورگ",
    "1. FC Köln": "کلن",
    "Hannover 96": "هانوفر",
    // Champions League / Europa / Conference regulars
    "Ajax": "آژاکس",
    "Ajax Amsterdam": "آژاکس",
    "AFC Ajax": "آژاکس",
    "FC Porto": "پورتو",
    "Porto": "پورتو",
    "SL Benfica": "بنفیکا",
    "Benfica": "بنفیکا",
    "Sporting CP": "اسپورتینگ",
    "Sporting Lisbon": "اسپورتینگ",
    "Sporting Lisboa": "اسپورتینگ",
    "PSV": "پی‌اس‌وی",
    "Feyenoord": "فاینورد",
    "Club Brugge KV": "بروژ",
    "Celtic FC": "سلتیک",
    "Rangers FC": "رنجرز",
    "Galatasaray": "گالاتاسرای",
    "Galatasaray SK": "گالاتاسرای",
    "Fenerbahçe": "فنرباغچه",
    "Olympiacos FC": "المپیاکوس",
    "Olympiacos": "المپیاکوس",
    "Panathinaikos": "پاناتینایکوس",
    "FC Dynamo Kyiv": "دینامو کیف",
    "Dynamo Kyiv": "دینامو کیف",
    "Dynamo Kiev": "دینامو کیف",
    "FC Shakhtar Donetsk": "شاختار دونتسک",
    "Shakhtar Donetsk": "شاختار دونتسک",
    "Shakhtar": "شاختار دونتسک",
    "FC Red Bull Salzburg": "سالزبورگ",
    "Red Bull Salzburg": "سالزبورگ",
    "Salzburg": "سالزبورگ",
    "SK Sturm Graz": "اشتورم گراتس",
    "Sturm Graz": "اشتورم گراتس",
    "AZ Alkmaar": "آزد آلکمار",
    "FC Twente": "توئنته",
    "BSC Young Boys": "یانگ بویز",
    "Young Boys": "یانگ بویز",
    "FC Basel": "بازل",
    "Basel": "بازل",
    "GNK Dinamo Zagreb": "دینامو زاگرب",
    "Dinamo Zagreb": "دینامو زاگرب",
    "FK Crvena zvezda": "ستاره سرخ بلگراد",
    "Red Star Belgrade": "ستاره سرخ بلگراد",
    "Crvena Zvezda": "ستاره سرخ بلگراد",
    "FC Copenhagen": "کپنهاگن",
    "FC København": "کپنهاگن",
    "København": "کپنهاگن",
    "Kobenhavn": "کپنهاگن",
    "Copenhagen": "کپنهاگن",
    "FC Midtjylland": "میدیولند",
    "FCSB": "استوا بخارست",
    "CFR Cluj": "سی‌اف‌آر کلوج",
    "Trabzonspor": "ترابوزان‌اسپور",
    "Besiktas JK": "بشیکتاش",
    "Beşiktaş JK": "بشیکتاش",
    "Beşiktaş": "بشیکتاش",
    "Besiktas": "بشیکتاش",
    "PAOK FC": "پی‌ای‌او‌کی",
    "PAOK": "پی‌ای‌او‌کی",
    "RSC Anderlecht": "آندرلخت",
    "Anderlecht": "آندرلخت",
    "Royal Antwerp FC": "آنتورپ",
    "Royal Antwerp": "آنتورپ",
    "Antwerp": "آنتورپ",
    "Slavia Prague": "اسلاویا پراگ",
    "Sparta Prague": "اسپارتا پراگ",
    "FC Viktoria Plzen": "ویکتوریا پلزن",
    "Ferencvárosi TC": "فرنتس‌واروش",
    "Ferencváros": "فرنتس‌واروش",
    "Ferencvaros": "فرنتس‌واروش",
    "Ferencvárosi": "فرنتس‌واروش",
    "Legia Warsaw": "لگیا ورشو",
    "Raków Częstochowa": "راکوف",
    "Shamrock Rovers FC": "شامروک راورز",
    "FK Partizan": "پارتیزان",
    "Partizan": "پارتیزان",
    "Ludogorets Razgrad": "لودوگورتس",
    "Ludogorets": "لودوگورتس",
    "NK Maribor": "ماریبور",
    "Maribor": "ماریبور",
    "APOEL FC": "آپوئل",
    "HJK Helsinki": "هلسینکی",
    "FK Žalgiris": "ژالگیریس",
    "FC Zurich": "زوریخ",
    "FC Zürich": "زوریخ",
    "Zürich": "زوریخ",
    "SønderjyskE": "سوندیریسکه",
    "IF Elfsborg": "الفسبورگ",
    "Djurgårdens IF": "دیورگاردن",
    // UCL participants 2005-06 -> 2024-25 (20-season history coverage)
    "Málaga CF": "مالاگا",
    "Malaga CF": "مالاگا",
    "FC Schalke 04": "شالکه",
    "Schalke 04": "شالکه",
    "TSG Hoffenheim": "هوفن‌هایم",
    "TSG 1899 Hoffenheim": "هوفن‌هایم",
    "1899 Hoffenheim": "هوفن‌هایم",
    "Hoffenheim": "هوفن‌هایم",
    "FC Girondins de Bordeaux": "بوردو",
    "Bordeaux": "بوردو",
    "Standard Liège": "استاندارد لیژ",
    "KRC Genk": "خنک",
    "Genk": "خنک",
    "KAA Gent": "خنت",
    "Gent": "خنت",
    "AEK Athens": "آئک آتن",
    "AEK": "آئک آتن",
    "PFC CSKA Moscow": "زسکا مسکو",
    "CSKA Moscow": "زسکا مسکو",
    "FC Zenit Saint Petersburg": "زنیت سن‌پترزبورگ",
    "Zenit Saint Petersburg": "زنیت سن‌پترزبورگ",
    "Zenit": "زنیت سن‌پترزبورگ",
    "FC Spartak Moscow": "اسپارتاک مسکو",
    "Spartak Moscow": "اسپارتاک مسکو",
    "FC Lokomotiv Moscow": "لوکوموتیو مسکو",
    "Lokomotiv Moscow": "لوکوموتیو مسکو",
    "FC Rubin Kazan": "روبین کازان",
    "Rubin Kazan": "روبین کازان",
    "FC Rostov": "روستوف",
    "Rostov": "روستوف",
    "FC Krasnodar": "کراسنودار",
    "Krasnodar": "کراسنودار",
    "SK Rapid Wien": "راپید وین",
    "Rapid Wien": "راپید وین",
    "FK Austria Wien": "آستریا وین",
    "Austria Wien": "آستریا وین",
    "Grasshopper Club Zürich": "گراس‌هاپر",
    "Grasshopper": "گراس‌هاپر",
    "FC Thun": "تون",
    "Thun": "تون",
    "AaB Aalborg": "آلبورگ",
    "Aalborg BK": "آلبورگ",
    "Aalborg": "آلبورگ",
    "FC Nordsjælland": "نوردشیلند",
    "Nordsjælland": "نوردشیلند",
    "Unirea Urziceni": "اونیرئا اورزیچنی",
    "FC Oțelul Galați": "اوتلول گالاتسی",
    "Oțelul Galați": "اوتلول گالاتسی",
    "AEL Limassol": "آئل لیماسول",
    "AEL": "آئل لیماسول",
    "Anorthosis Famagusta": "آنورتوسیس",
    "Anorthosis": "آنورتوسیس",
    "Rosenborg BK": "روزنبورگ",
    "Rosenborg": "روزنبورگ",
    "Molde FK": "مولده",
    "Molde": "مولده",
    "Malmö FF": "مالمو",
    "Malmo": "مالمو",
    "Malmö": "مالمو",
    "Malmo FF": "مالمو",
    "Maccabi Haifa FC": "مکابی حیفا",
    "Maccabi Haifa": "مکابی حیفا",
    "Maccabi Tel Aviv FC": "مکابی تل‌آویو",
    "Maccabi Tel Aviv": "مکابی تل‌آویو",
    "Lech Poznań": "لخ پوزنان",
    "Lech Poznan": "لخ پوزنان",
    "ŠK Slovan Bratislava": "اسلوان براتیسلاوا",
    "Slovan Bratislava": "اسلوان براتیسلاوا",
    "MŠK Žilina": "ژیلینا",
    "Žilina": "ژیلینا",
    "FK Artmedia Bratislava": "آرتمدیا براتیسلاوا",
    "Artmedia Bratislava": "آرتمدیا براتیسلاوا",
    "NK Olimpija Ljubljana": "المپیجا لیوبلیانا",
    "Olimpija Ljubljana": "المپیجا لیوبلیانا",
    "Debreceni VSC": "دبرسن",
    "Debrecen": "دبرسن",
    "FC BATE Borisov": "باته بوریسوف",
    "BATE Borisov": "باته بوریسوف",
    "BATE": "باته بوریسوف",
    "FC Sheriff Tiraspol": "شریف تیراسپول",
    "Sheriff Tiraspol": "شریف تیراسپول",
    "Qarabağ FK": "قره‌باغ",
    "Qarabağ": "قره‌باغ",
    "Karabakh": "قره‌باغ",
    "FC Astana": "آستانه",
    "Astana": "آستانه",
    "SC Braga": "براگا",
    "Braga": "براگا",
    "İstanbul Başakşehir": "باشاک‌شهر",
    "Istanbul Basaksehir": "باشاک‌شهر",
    "Basaksehir": "باشاک‌شهر",
    "Bursaspor": "بورسااسپور",
    "PFC CSKA Sofia": "زسکا صوفیه",
    "CSKA Sofia": "زسکا صوفیه",
    "PFC Levski Sofia": "لفسکی صوفیه",
    "Levski Sofia": "لفسکی صوفیه",
    // Iran — Persian Gulf Pro League (TheSportsDB names)
    "Persepolis": "پرسپولیس",
    "Esteghlal": "استقلال",
    "Sepahan": "سپاهان",
    "Tractor": "تراکتور",
    "Foolad Khuzestan": "فولاد خوزستان",
    "Gol Gohar Sirjan": "گل‌گهر سیرجان",
    "Gol Gohar": "گل‌گهر سیرجان",
    "Chadormalu": "چادرملو",
    "Fajr Sepasi": "فجر سپاسی",
    "Kheybar Khorramabad": "خیبر خرم‌آباد",
    "Malavan": "ملوان",
    "Esteghlal Khuzestan": "استقلال خوزستان",
    "Paykan": "پیکان",
    "Shams Azar Qazvin": "شمس آذر",
    "Shams Azar": "شمس آذر",
    "Aluminium Arak": "آلومینیوم اراک",
    "Zob Ahan": "ذوب‌آهن",
    "Mes Rafsanjan": "مس رفسنجان",
    // Australia A-League (Wikipedia-sourced via scripts/fa-names-from-wikipedia.js)
    "Perth Glory": "پرث گلوری",
    "Wellington Phoenix": "ولینگتون فینیکس",
    "Newcastle Jets": "نیوکاسل جتس",
    "Western United FC": "وسترن یونایتد",
    "Macarthur FC": "مکارثر",
    "Auckland FC": "اوکلند",
    // Iran PGL — remaining teams (Wikipedia-sourced)
    "Foolad": "فولاد خوزستان",
    "Foolad Khozestan": "فولاد خوزستان",
    "Fajr Sepasi": "فجر سپاسی",
    "Sanat Naft": "صنعت نفت آبادان",
    "Sanat-Naft": "صنعت نفت آبادان",
    "Shams Azar Qazvin": "شمس‌آذر",
    "Chadormalu SC": "چادرملو",
    "Paykan": "پیکان",
    "Mes Shahr Babak FC": "مس شهربابک",
    "Nassaji Mazandaran": "نساجی مازندران",
    "Esteghlal Khozestan": "استقلال خوزستان"
  };
  return FA_TEAMS;
}
__name(buildFaTeamDict, "buildFaTeamDict");
function translateTeam(englishName) {
  if (!FA_TEAMS_DICT) {
    FA_TEAMS_DICT = buildFaTeamDict();
    FA_TEAMS_NORM = new Map();
    FA_TEAMS_STEM = [];
    for (const [en, fa] of Object.entries(FA_TEAMS_DICT)) {
      FA_TEAMS_NORM.set(normTeamKey(en), fa);
      FA_TEAMS_STEM.push([normTeamKey(en).replace(/\d+/g, ""), fa]);
    }
  }
  if (FA_TEAMS_DICT[englishName]) return FA_TEAMS_DICT[englishName];
  const key = normTeamKey(englishName);
  if (!key) return englishName;
  const normHit = FA_TEAMS_NORM.get(key);
  if (normHit) return normHit;
  // Stem fallback (correctness fix): provider names carry extra words or
  // foundation years the dict key lacks — e.g. "Stade Rennais FC 1901" vs
  // "Stade Rennais FC", "Real Sociedad de Fútbol" vs "Real Sociedad",
  // "Stuttgart" vs "VfB Stuttgart". Digits are stripped on both sides so the
  // shared stems compare. Accept only when exactly ONE dict entry matches, to
  // avoid ambiguous collisions.
  const prov = key.replace(/\d+/g, "");
  if (prov.length >= 4) {
    let hit = null, hits = 0;
    for (const [d, fa] of FA_TEAMS_STEM) {
      if (d.length >= 4 && (prov.includes(d) || d.includes(prov))) { hit = fa; hits++; }
    }
    if (hits === 1) return hit;
  }
  return englishName;
}
__name(translateTeam, "translateTeam");
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
// Stable league logos (api-sports public media CDN — no key required for images).
// Used by the public page; providers' own emblems would override per-match if present.
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
  "PGL": "https://media.api-sports.io/football/leagues/290.png",
  "HAZFI_CUP": "https://media.api-sports.io/football/leagues/719.png",
  "WC": "https://media.api-sports.io/football/leagues/1.png",
  "EC": "https://media.api-sports.io/football/leagues/4.png",
  "COPA": "https://media.api-sports.io/football/leagues/9.png",
  "AFCON": "https://media.api-sports.io/football/leagues/79.png",
  "AFC": "https://media.api-sports.io/football/leagues/77.png"
};
var COMP_EN = {
  "CL": "Champions League", "EL": "Europa League", "ECL": "Conference League",
  "PL": "Premier League", "PD": "La Liga", "SA": "Serie A", "FL1": "Ligue 1", "BL1": "Bundesliga",
  "FA_CUP": "FA Cup", "EFL_CUP": "EFL Cup", "CDR": "Copa del Rey", "COPPA_ITALIA": "Coppa Italia",
  "PGL": "Persian Gulf Pro League", "HAZFI_CUP": "Hazfi Cup", "AL": "A-League",
  "WC": "World Cup", "EC": "European Championship", "COPA": "Copa América", "AFCON": "Africa Cup of Nations", "AFC": "AFC Asian Cup"
};
function getCompetitionPriority(code) {
  return CONFIG.PRIORITY[code] || CONFIG.PRIORITY.DEFAULT;
}
__name(getCompetitionPriority, "getCompetitionPriority");
function isDomesticCup(code) {
  return Object.keys(CONFIG.DOMESTIC_CUP_IDS).includes(code);
}
__name(isDomesticCup, "isDomesticCup");
function isQuarterFinalOrLater(stage) {
  return CONFIG.LATE_STAGES.includes(stage);
}
__name(isQuarterFinalOrLater, "isQuarterFinalOrLater");
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
async function saveNotifiedMatch(env, match, notificationType, notifiedMatches) {
  const now = Date.now();
  const matchTime = new Date(match.utcDate).getTime();
  const key = matchKey(match);
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
  // Audit fix 7: a failed KV write must never abort the remaining notifications
  // of the run — log and continue (the dedupe map is best-effort state).
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
async function shouldSendNotification(env, match, notificationType, notifiedMatches) {
  const now = Date.now();
  const key = matchKey(match);
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
    case "match-start":
      return isMatchStartingNow(match, env);
    case "result":
      return (isMatchFinished(match) && isWithinPostMatchWindow(match, env)) || isBackfillEligible(match, "result", env);
    default:
      return false;
  }
}
__name(shouldSendNotification, "shouldSendNotification");
function isWithin24HourWindow(match, _env) {
  const now = getNowUTC();
  const matchTime = new Date(match.utcDate);
  if (matchTime <= now) return false;
  const hoursUntilMatch = (matchTime.getTime() - now.getTime()) / CONFIG.ONE_HOUR_MS;
  return hoursUntilMatch <= 24 && hoursUntilMatch >= 20;
}
__name(isWithin24HourWindow, "isWithin24HourWindow");
// Mode B (priority): both selected teams vs each other get an early heads-up at 72h.
function isWithinBigMatchWindow(match, _env) {
  const now = getNowUTC();
  const matchTime = new Date(match.utcDate);
  if (matchTime <= now) return false;
  const hoursUntilMatch = (matchTime.getTime() - now.getTime()) / CONFIG.ONE_HOUR_MS;
  return hoursUntilMatch <= CONFIG.BIG_MATCH_NOTIFICATION_HOURS && hoursUntilMatch >= CONFIG.BIG_MATCH_NOTIFICATION_HOURS - 4;
}
__name(isWithinBigMatchWindow, "isWithinBigMatchWindow");
function isWithin3HourWindow(match, _env) {
  const now = getNowUTC();
  const matchTime = new Date(match.utcDate);
  if (matchTime <= now) return false;
  const hoursUntilMatch = (matchTime.getTime() - now.getTime()) / CONFIG.ONE_HOUR_MS;
  return hoursUntilMatch <= 3.5 && hoursUntilMatch >= 2.5;
}
__name(isWithin3HourWindow, "isWithin3HourWindow");
function isWithin1HourWindow(match, _env) {
  const now = getNowUTC();
  const matchTime = new Date(match.utcDate);
  if (matchTime <= now) return false;
  const hoursUntilMatch = (matchTime.getTime() - now.getTime()) / CONFIG.ONE_HOUR_MS;
  return hoursUntilMatch <= 1.5 && hoursUntilMatch >= 0.75;
}
__name(isWithin1HourWindow, "isWithin1HourWindow");
function isMatchStartingNow(match, _env) {
  // Future-plan fix (false "🚨 match has started" alerts): the old window was
  // minutesUntilMatch <= 45, so a match kicking off at 22:30 was announced as
  // "started" from 21:45 — 44 minutes before kickoff. The notification now
  // fires only AFTER the actual kickoff: 1 minute of clock-skew grace before
  // the whistle, and 20 minutes of eligibility after it so the 10-minute cron
  // always catches the tick (KV dedupe keeps it to a single message). Fixtures
  // that are finished, postponed, suspended or cancelled never announce a
  // start.
  const now = getNowUTC();
  const matchTime = new Date(match.utcDate);
  const minutesSinceKickoff = (now.getTime() - matchTime.getTime()) / (60 * 1e3);
  if (minutesSinceKickoff < -1 || minutesSinceKickoff > 20) return false;
  const status = String(match.status || "").toUpperCase();
  return status !== "FINISHED" && status !== "POSTPONED" && status !== "SUSPENDED" && status !== "CANCELLED" && status !== "CANCEL";
}
__name(isMatchStartingNow, "isMatchStartingNow");
function isWithinPostMatchWindow(match, _env) {
  if (!isMatchFinished(match)) return false;
  const now = getNowUTC();
  const matchTime = new Date(match.utcDate);
  const hoursSinceMatch = (now.getTime() - matchTime.getTime()) / CONFIG.ONE_HOUR_MS;
  return hoursSinceMatch <= CONFIG.POST_MATCH_NOTIFICATION_HOURS;
}
__name(isWithinPostMatchWindow, "isWithinPostMatchWindow");
// Backfill: recover notifications whose window was missed entirely (provider
// outage, late-published fixture, cron hiccup). Pre-match types send late once
// (dedupe still applies), limited to the next less-urgent window so we never
// spam multiple reminders at once. Results backfill up to 24h after kickoff.
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
  if (floor === undefined) return false;
  return hoursUntil <= max && hoursUntil > floor;
}
__name(isBackfillEligible, "isBackfillEligible");
function isMatchFinished(match) {
  return match.status === "FINISHED";
}
__name(isMatchFinished, "isMatchFinished");
async function cleanupExpiredNotifications(env) {
  // Audit fix 4 (KV write amplification): at most one cleanup pass per hour
  // (was: a KV write nearly every 10-min run whenever any entry had expired).
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
  await env.STATE.put("cleanup_hour", String(hourStamp), { expirationTtl: 2 * 36e5 }).catch(() => {});
}
__name(cleanupExpiredNotifications, "cleanupExpiredNotifications");
function shouldNotify(match) {
  const compCode = match.competition.code;
  // v12.3: match-side names go through the provider alias map so football-data
  // legal names ("Club Atlético de Madrid") match the selected short forms.
  const normHome = normAlias(match.homeTeam.name);
  const normAway = normAlias(match.awayTeam.name);
  // CPU fix (audit finding 5): the normalized team sets used to be rebuilt
  // (Object.values(...).flat().map(normalizeTeamName)) on EVERY call. They are
  // now memoized on CONFIG and invalidated by object identity — applySettings()
  // replaces BIG_TEAMS_BY_LEAGUE with a fresh object, so a stale cache can never
  // survive a settings change. Set.has replaces Array.includes.
  let c = CONFIG.__teamNorm;
  if (!c || c.sig !== CONFIG.BIG_TEAMS_BY_LEAGUE) {
    const all = /* @__PURE__ */ new Set();
    const byLeague = {};
    for (const [lg, list] of Object.entries(CONFIG.BIG_TEAMS_BY_LEAGUE)) {
      const normList = /* @__PURE__ */ new Set();
      for (const t of list) {
        const n = normalizeTeamName(t);
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
  // FIX: notify when EITHER team is followed ("Arsenal vs Brentford" must fire),
  // not only "big matches" between two followed teams.
  return !!(leagueTeams && (leagueTeams.has(normHome) || leagueTeams.has(normAway)));
}
__name(shouldNotify, "shouldNotify");
// "Big matches only" view on the public page: BOTH teams must be big clubs.
// Bayern/Dortmund are big in both BL1 and UEFA cups; PSG is big only in
// European competitions, per the user's rule (Bayern vs PSG, etc.).
var BIG_MATCH_TEAMS = [
  // England
  "Arsenal FC", "Chelsea FC", "Chelsea", "Manchester City FC", "Manchester United FC", "Liverpool FC", "Manchester City", "Manchester United",
  // Italy
  "AC Milan", "Inter Milan", "Milan", "Inter",
  // Spain
  "FC Barcelona", "Real Madrid CF", "Atl\xE9tico Madrid", "Barcelona", "Real Madrid", "Atletico Madrid", "Atleti",
  // Germany (BL1 now monitored + UEFA cups)
  "FC Bayern M\xFCnchen", "Bayern Munich", "Bayern M\xFCnchen", "Borussia Dortmund", "Dortmund",
  // Australia (A-League)
  "Melbourne Victory", "Melbourne City", "Sydney FC", "Western Sydney Wanderers", "Adelaide United"
];
var BIG_MATCH_UEFA = BIG_MATCH_TEAMS.concat(["Paris Saint-Germain", "PSG"]);
function isFeaturedMatch(match) {
  const code = match.competition.code;
  const isUefa = code === "CL" || code === "EL" || code === "ECL" || isDomesticCup(code);
  const pool = isUefa ? BIG_MATCH_UEFA : BIG_MATCH_TEAMS;
  // CPU fix (audit finding 5): the normalized pool was rebuilt per call; it is
  // now memoized on the (static, never-rebuilt) pool arrays as a Set.
  if (!pool.__normSet) pool.__normSet = /* @__PURE__ */ new Set(pool.map(normalizeTeamName));
  const nset = pool.__normSet;
  return nset.has(normAlias(match.homeTeam.name)) && nset.has(normAlias(match.awayTeam.name));
}
__name(isFeaturedMatch, "isFeaturedMatch");
// ── v12.3 TOP BOX rule: selected-vs-selected clashes ──
// User rule: when two SELECTED teams meet — in the Champions League → the
// uclspot box (CL BOX); in a domestic league (e.g. the Manchester derby) →
// the dedicated TOP BOX above the games list, never buried mid-list by
// kickoff order. football-data returns legal names ("Club Atlético de
// Madrid", "FC Internazionale Milano") that never normalize to the selected
// lists' short forms ("Atlético Madrid", "Inter Milan") — matches, big/derby
// flags and notifications silently missed those clubs. The alias map is
// applied on the MATCH side only, so provider variants fold onto the
// selected-list keys without touching the shared dedupe normalizer.
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
  const n = normalizeTeamName(name);
  return TEAM_ALIASES[n] || n;
}
__name(normAlias, "normAlias");
function isDomesticLeagueCode(code) {
  const by = CONFIG.BIG_TEAMS_BY_LEAGUE || {};
  return !!by[code] && code !== "CL" && code !== "EL" && code !== "ECL";
}
__name(isDomesticLeagueCode, "isDomesticLeagueCode");
// Both sides are selected teams (any competition) — the "big for THIS user"
// signal behind the CL BOX pick and nextBig.
function isMasterPair(match) {
  masterTeamList();
  const nset = _masterMemo.normSet;
  return nset.has(normAlias(match.homeTeam.name)) && nset.has(normAlias(match.awayTeam.name));
}
__name(isMasterPair, "isMasterPair");
// v12.4: AT LEAST ONE side is a selected team — the headline tier that takes
// over a featured box while the selected-vs-selected pairing is far away
// (user rule: through a weeks/months-long gap, "Real Madrid vs Leipzig" —
// one selected side — must headline instead of being crowded out by the
// distant two-selected derby). Strict superset of isMasterPair.
function hasSelectedTeam(match) {
  masterTeamList();
  const nset = _masterMemo.normSet;
  return nset.has(normAlias(match.homeTeam.name)) || nset.has(normAlias(match.awayTeam.name));
}
__name(hasSelectedTeam, "hasSelectedTeam");
// A selected-vs-selected fixture inside a domestic league → TOP BOX material.
function isMasterClash(match) {
  return isDomesticLeagueCode(match.competition.code) && isMasterPair(match);
}
__name(isMasterClash, "isMasterClash");
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
  ["FC Bayern München", "Borussia Dortmund"],
  // Madrid derby
  ["Atlético Madrid", "Real Madrid CF"],
  // Le Classique
  ["Paris Saint-Germain", "Olympique de Marseille"]
];
var DERBY_NORM = DERBY_PAIRS.map(function(p){ return [normalizeTeamName(p[0]), normalizeTeamName(p[1])]; });
function isDerby(match) {
  const h = normAlias(match.homeTeam.name);
  const a = normAlias(match.awayTeam.name);
  return DERBY_NORM.some((p) => (h === p[0] && a === p[1]) || (h === p[1] && a === p[0]));
}
function mapStageName(stage) {
  const s = String(stage || "").toLowerCase();
  if (s.includes("quarter")) return "QUARTER_FINALS";
  if (s.includes("semi")) return "SEMI_FINALS";
  if (s.includes("final")) return "FINAL";
  if (s.includes("third") || s.includes("3rd")) return "THIRD_PLACE";
  return "REGULAR_SEASON";
}
__name(mapStageName, "mapStageName");
// League names from fallback providers → our competition codes
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
  "Copa América": "COPA",
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
  // strTimestamp is a full ISO string with timezone — prefer it
  if (tsStr) {
    const d = new Date(tsStr);
    if (!isNaN(d.getTime())) return d.toISOString();
  }
  if (!dateStr) return null;
  // Fallback: TheSportsDB times are UK time; treat as UTC (≤1h skew, notification windows are wide)
  const d = new Date(dateStr + "T" + (timeStr || "12:00:00") + "Z");
  return isNaN(d.getTime()) ? null : d.toISOString();
}
__name(parseTSPDate, "parseTSPDate");
// Audit fix 3 (subrequest budget): Cloudflare free tier caps subrequests at
// 50 per invocation; exceeding it throws error 1101 and kills the whole run
// (the live public-API outage). This soft counter is reset at each invocation
// entry and makes degradation graceful instead: provider calls throw, callers
// catch and serve partial/stale data. Concurrent invocations in one isolate
// share the counter — acceptable: the failure mode is graceful truncation.
var SUBREQUEST_COUNT = 0;
var SUBREQUEST_CAP = 48;
function resetSubrequestBudget() {
  SUBREQUEST_COUNT = 0;
}
__name(resetSubrequestBudget, "resetSubrequestBudget");
async function fetchJSON(url, attempts, headers) {
  attempts = attempts || 2;
  if (++SUBREQUEST_COUNT > SUBREQUEST_CAP) throw new Error("Subrequest budget exhausted");
  // Audit fix 3 (Cache API): provider day-feeds are stable for minutes —
  // cache hits cost ZERO subrequests and cut CPU/wall time. Only headerless
  // GETs (sportscore/TheSportsDB day feeds) are cacheable; authed fd calls
  // keep their KV-level caching.
  const canCache = !headers && typeof caches !== "undefined" && caches.default;
  const cacheKey = canCache ? new Request(url, { method: "GET" }) : null;
  if (cacheKey) {
    try {
      const hit = await caches.default.match(cacheKey);
      if (hit) return await hit.json();
    } catch (e) {}
  }
  for (let i = 1; i <= attempts; i++) {
    try {
      const res = await fetch(url, { headers: headers || {} });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      if (cacheKey) {
        try {
          await caches.default.put(cacheKey, new Response(JSON.stringify(data), { headers: { "content-type": "application/json", "cache-control": "max-age=300" } }));
        } catch (e) {}
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
// SportScore: free live-scores API, ~10k req/day/IP, no key, CORS-open.
// The unfiltered day feed caps at 200 matches and truncates big leagues on
// matchdays, so we fetch per competition with verified slugs instead:
// one request per competition per day (verified 2026-05-17: PL=6, PD=10, SA=10, FL1=9).
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
  for (const e of (data && data.matches) || []) {
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
async function fetchSportScore(env) {
  const matches = [];
  const seen = new Set();
  // FIX: Cloudflare free tier caps subrequests at 50 PER INVOCATION (all three
  // sources share the budget). football-data already covers the 4 domestic
  // leagues, so sportscore here fetches ONLY what fd can't: EL/ECL (fd 400s on
  // them) + the 4 domestic cups (fd free tier has no cup fixtures, TSP is
  // 429-rate-limited on the worker egress IP). 6 slugs x 4 days = 24 calls,
  // leaving headroom for fd's retries instead of starving the last slug.
  const inSeason = (code) => { const s = CONFIG.SEASON_STARTS && CONFIG.SEASON_STARTS[code]; return !s || new Date() >= new Date(s); };
  const slugs = Object.fromEntries(
    Object.entries(SPORTSCORE_SLUGS).filter(([code]) =>
      code === "EL" || code === "ECL" || code === "BL1" || code === "FA_CUP" || code === "EFL_CUP" || code === "CDR" || code === "COPPA_ITALIA" ||
      code === "PGL" ||
      (code === "AL" && inSeason(code))
    )
  );
  if (!Object.keys(slugs).length) return matches;
  // Range: 1 day back (results + result backfill) + 1 day ahead (24h window)
  // = 3 calendar dates. Audit fix 3: was 4 dates — 8-9 slugs × 4 days was the
  // single biggest subrequest blowout (~72 calls). Every notification window
  // (24h/3h/1h/start/result ≤24h back) lives inside ±1 day; wider-horizon
  // fixtures persist in the merged KV pool from the long-view sweep.
  // cacheMatches merges, so wide-horizon fixtures persist from earlier runs.
  const from = new Date(Date.now() - 864e5);
  const to = new Date(Date.now() + 1 * 864e5);
  const acc = { list: matches, seen };
  for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split("T")[0];
    for (const [code, slug] of Object.entries(slugs)) {
      await sportScoreDay(code, slug, dateStr, acc);
    }
  }
  return matches;
}
__name(fetchSportScore, "fetchSportScore");
__name(fetchJSON, "fetchJSON");
// Shared canonical-key dedupe: two providers can report the SAME real match with
// different ids (fd 560542 vs tsd-2494000 for Arsenal/Coventry). Collapse to one
// entry — the later entry wins, venue + crests are adopted from any copy that has
// them. cacheMatches (KV writes) and fetchLongView (its returned list, which feeds
// the public page) both go through this so duplicates can never reach the UI.
async function cacheMatches(env, matches, source) {
  if (!matches || !matches.length) return;
  try {
    const existing = await env.STATE.get(CONFIG.KV_MATCHES_KEY, "json").catch(() => null);
    // Merge into the existing pool instead of replacing: the cron writes the
    // near (8-day) window every 10 min — replacing would wipe the wide horizon
    // the public page needs for nextBig (matches beyond the month). Same-id
    // entries are overwritten by fresher data; ancient entries are pruned.
    const cutoff = Date.now() - 2 * 864e5;
    const head = (existing && Array.isArray(existing.matches) ? existing.matches : [])
      .filter((m) => new Date(m.utcDate || 0).getTime() > cutoff);
    const merged = canonDedupe([...head, ...matches]);
    // Audit fix 4 (KV write amplification): skip the write when the merged pool
    // is identical to what's stored (quiet periods previously rewrote the same
    // data every 10 minutes just to bump fetchedAt).
    if (existing && Array.isArray(existing.matches) && JSON.stringify(merged) === JSON.stringify(existing.matches)) {
      return;
    }
    await env.STATE.put(
      CONFIG.KV_MATCHES_KEY,
      JSON.stringify({ fetchedAt: new Date().toISOString(), source, matches: merged }),
      { expirationTtl: CONFIG.CACHE_STALE_TTL }
    );
  } catch (e) {
    console.error("Match cache write failed: " + e.message);
  }
}
__name(cacheMatches, "cacheMatches");
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
async function fetchFootballData(env) {
  // Free tier hard-cap: date ranges must not exceed 10 days (HTTP 400 otherwise).
  // The notification scan only needs the near window, so keep it small and fast:
  // 1 merged call (leagues+CL) + per-code intl calls; cups come from TheSportsDB
  // (football-data free tier 400s on domestic cup competitions).
  const dateFrom = new Date(Date.now() - CONFIG.DAYS_IN_PAST * 864e5).toISOString().split("T")[0];
  const dateTo = new Date(Date.now() + CONFIG.DAYS_IN_FUTURE * 864e5).toISOString().split("T")[0];
  const fdLeagues = CONFIG.LEAGUES.filter((c) => !["EL", "ECL"].includes(c));
  console.log(`\u{1F4C5} Date range: ${dateFrom} to ${dateTo} (${CONFIG.DATE_RANGE_DAYS} days total)`);
  const allMatches = [];
  const seen = new Set();
  const pushUnique = (list) => {
    for (const m of list) {
      if (!seen.has(m.id)) { seen.add(m.id); allMatches.push(m); }
    }
  };
  try {
    const u = `${CONFIG.API_URL}?competitions=${fdLeagues.join(",")}&dateFrom=${dateFrom}&dateTo=${dateTo}`;
    const m = await fetchWithRetry(u, env.API_TOKEN, "Leagues+CL");
    console.log(`\u2705 Leagues+CL: ${m.length} matches`);
    pushUnique(m);
  } catch (error) {
    console.error(`\u274C Failed to fetch league matches:`, error.message);
  }
  // International tournaments (WC/Euro/Copa América/AFCON/Asian Cup) — near window
  // only: the app shows them only while in process. National teams never match the
  // followed clubs, so they can't trigger bot notifications. Per-code calls so one
  // invalid/absent code can't break the rest (logs show exactly which work).
  for (const [code, id] of Object.entries(CONFIG.INTL_COMPETITIONS)) {
    try {
      const u = `${CONFIG.API_URL}?competitions=${id}&dateFrom=${dateFrom}&dateTo=${dateTo}`;
      const m = await fetchWithRetry(u, env.API_TOKEN, "Intl " + code);
      pushUnique(m.map((match) => (match.competition ? { ...match, competition: { ...match.competition, code } } : match)));
      console.log(`\u2705 Intl ${code}: ${m.length} matches`);
    } catch (e) {
      console.error(`\u274C Intl ${code} fetch failed: ${e.message}`);
    }
  }
  console.log(`\u2705 Found ${allMatches.length} matches total`);
  return allMatches;
}
__name(fetchFootballData, "fetchFootballData");
// Long-range view for the admin page (3-month projection ask): leagues/CL only,
// chunked into <=10-day windows (free-tier cap), cached 6h so page loads stay cheap.
// ponytail: cups/past results omitted here — the near-term scan already covers cups,
// and results live in the standings cards.
async function fetchLongView(env) {
  // Long-range view for the admin page (3-month projection ask): same pool the
  // bot's near scan uses, extended to LONG_VIEW_DAYS so a T+24d match is never
  // fetched for the page while the bot scans it. Cached in the same KV key the
  // bot reads (matches_v13_tracked) — single source of truth for UI + bot.
  const cached = await env.STATE.get(CONFIG.KV_MATCHES_KEY, "json").catch(() => null);
  // Fresh AND wide enough = reuse. Freshness alone is not enough: the cron
  // rewrites this key with the near (8-day) pool every 10 min, so a fresh key
  // may still be too shallow for nextBig — gate on the horizon too.
  const fresh = cached && cached.fetchedAt && Date.now() - new Date(cached.fetchedAt).getTime() < 6 * 3600e3;
  const horizon = cached && Array.isArray(cached.matches) && cached.matches.length
    ? Math.max(0, ...cached.matches.map((m) => new Date(m.utcDate || 0).getTime()))
    : 0;
  if (fresh && horizon > Date.now() + 60 * 864e5) return cached.matches;
  const fdLeagues = CONFIG.LEAGUES.filter((c) => !["EL", "ECL"].includes(c));
  const allMatches = [];
  const seen = new Set();
  const pushUnique = (list) => {
    for (const m of list) {
      if (!seen.has(m.id)) { seen.add(m.id); allMatches.push(m); }
    }
  };
  // v12.5: the finished-results card needs the whole week of past results
  // (midweek CL matchdays + the weekend league round), not the bot's 2-day
  // near window — widen only THIS view's lookback. Still 10 ten-day chunks
  // (the first simply starts earlier), so the subrequest count is unchanged.
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
    await new Promise((r) => setTimeout(r, 2000));
  }
  // EL/ECL: football-data free tier rejects these comps (HTTP 400), and the
  // bots' near scan only reaches 2 days ahead — so the public page would never
  // show Europa/Conference fixtures. Pull them from sportscore for the next
  // ~10 days so EL/ECL big matches appear in the UI and nextBig. 10 days x 2
  // comps = 20 calls; with the fd chunks (10), intl cups (5) and TSP cups/PGL
  // (≤4) the request stays under the free-tier 50-subrequest cap.
  const uefaAcc = { list: allMatches, seen };
  // Domestic cups too: football-data free tier 400s on cup competitions, so
  // the only reliable free source is sportscore (verified: Coppa R64 fixtures,
  // EFL/CDR honest-empty until their rounds publish; v12.6 adds iran-cup —
  // the Hazfi box stays honest-empty until the 1405 R1 draw publishes). Cup
  // matchdays are sparse and publish as discrete rounds, so sweep day-by-day
  // and stop each cup at its first found fixture (e.g. Coppa R64 = today+3)
  // instead of burning 10 days of subrequests on empty pages. EL/ECL after
  // cups so cup data lands inside the 50-subrequest cap.
  // Audit fix 6: every sportscore day call is individually failure-tolerant
  // (a provider hiccup degrades that day's data, never the whole page).
  const cupSlugs = [["FA_CUP", SPORTSCORE_SLUGS.FA_CUP], ["EFL_CUP", SPORTSCORE_SLUGS.EFL_CUP], ["CDR", SPORTSCORE_SLUGS.CDR], ["COPPA_ITALIA", SPORTSCORE_SLUGS.COPPA_ITALIA], ["HAZFI_CUP", SPORTSCORE_SLUGS.HAZFI_CUP]];
  const cupDone = {};
  for (let i = 0; i < 10; i++) {
    const dateStr = new Date(Date.now() + i * 864e5).toISOString().split("T")[0];
    for (const [cc, slug] of cupSlugs) {
      if (cupDone[cc]) continue;
      try {
        const n = await sportScoreDay(cc, slug, dateStr, uefaAcc);
        if (n > 0) cupDone[cc] = true;
      } catch (e) {
        console.error(`\u274C Long view cup ${cc} failed: ${e.message}`);
      }
    }
  }
  // Audit fix 3+6: EL/ECL/BL1 day sweep trimmed 10→7 days (21 calls) and made
  // failure-tolerant per call — this was one of the two loops whose uncaught
  // throws produced the live error-1101 outage.
  for (let i = 0; i < 7; i++) {
    const dateStr = new Date(Date.now() + i * 864e5).toISOString().split("T")[0];
    try {
      await sportScoreDay("EL", SPORTSCORE_SLUGS.EL, dateStr, uefaAcc);
    } catch (e) {
      console.error(`\u274C Long view EL failed: ${e.message}`);
    }
    try {
      await sportScoreDay("ECL", SPORTSCORE_SLUGS.ECL, dateStr, uefaAcc);
    } catch (e) {
      console.error(`\u274C Long view ECL failed: ${e.message}`);
    }
    try {
      await sportScoreDay("BL1", SPORTSCORE_SLUGS.BL1, dateStr, uefaAcc);
    } catch (e) {
      console.error(`\u274C Long view BL1 failed: ${e.message}`);
    }
  }
  if (uefaAcc.list.length !== 0) {
    const uefaCount = uefaAcc.list.filter((m) => m.competition.code === "EL" || m.competition.code === "ECL").length;
    console.log(`\u{1F50D} Long view EL/ECL (sportscore): ${uefaCount} matches`);
  }
  // Domestic cups + Iran PGL via TheSportsDB eventsnextleague (verified live
  // 2026-08-10: EFL 4570 → Plymouth/Exeter; Coppa 4506 → Parma/Catania R64;
  // CDR 4483 → empty until R1 publishes ~Nov; PGL 4742 → Tractor/Paykan). This
  // gives the cups boxes + Iran card real fixtures on the refetch path too;
  // same ids as fetchTheSportsDB so KV/cross-source dedupe stays consistent.
  let tsdbCalls = 0;
  const paceT = () => (tsdbCalls++ > 0 ? new Promise((r) => setTimeout(r, 1200)) : Promise.resolve());
  for (const [code, leagueId] of Object.entries(Object.assign({}, TSP_LEAGUE_IDS, CUP_TSP_IDS))) {
    await paceT();
    try {
      const data = await fetchJSON("https://www.thesportsdb.com/api/v1/json/3/eventsnextleague.php?id=" + leagueId);
      for (const e of (data && data.events) || []) {
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
  // International cups: near window only (10-day free-tier cap) — once in process
  // their fixtures are daily, so a short lookahead is exactly the intent.
  const intlFrom = new Date(Date.now() - CONFIG.DAYS_IN_PAST * 864e5).toISOString().split("T")[0];
  const intlTo = new Date(Date.now() + Math.max(3, 10 - CONFIG.DAYS_IN_PAST) * 864e5).toISOString().split("T")[0];
  for (const [code, id] of Object.entries(CONFIG.INTL_COMPETITIONS)) {
    try {
      const u = `${CONFIG.API_URL}?competitions=${id}&dateFrom=${intlFrom}&dateTo=${intlTo}`;
      const m = await fetchWithRetry(u, env.API_TOKEN, "Intl " + code);
      pushUnique(m.map((match) => (match.competition ? { ...match, competition: { ...match.competition, code } } : match)));
      console.log(`\u{1F50D} Long view intl ${code}: ${m.length} matches`);
    } catch (e) {
      console.error(`\u274C Long view intl ${code} failed: ${e.message}`);
    }
  }
  // Collapse provider duplicates BEFORE returning: cacheMatches only dedupes what
  // lands in KV, so a full refetch was handing the page BOTH copies (fd + tsd ids)
  // of the same game — Arsenal/Coventry showed twice for up to the 18-min cache.
  if (allMatches.length) {
    const deduped = canonDedupe(allMatches);
    allMatches.length = 0;
    allMatches.push(...deduped);
  }
  // 0-worthy resilience: a live pool with no followed-team match must not blank
  // the page — reuse the last good notified pool (same as the bot's resilience).
  if (allMatches.length && !allMatches.some(shouldNotify)) {
    const pool = await getCachedMatches(env);
    if (pool.some(shouldNotify)) {
      console.log("\u26A0\uFE0F Live long pool has 0 followed-team matches — reusing cached pool");
      return pool;
    }
  }
  if (allMatches.length) {
    await cacheMatches(env, allMatches, "football-data+longview");
  }
  return allMatches;
}
__name(fetchLongView, "fetchLongView");
// TheSportsDB free tier covers only these soccer leagues (confirmed via all_leagues.php)
var TSP_LEAGUE_IDS = {
  "PL": 4328,
  "BL1": 4331,
  "SA": 4332,
  "EL": 4481, // verified via thesportsdb lookupleague
  "PGL": 4742 // Iran Persian Gulf Pro League (display-only, never in fd leagues URL)
};
// Domestic cups via TheSportsDB (football-data free tier does NOT serve these;
// verified live 2026-08-10 — eventsnextleague returns real upcoming fixtures).
var CUP_TSP_IDS = {
  "EFL_CUP": 4570, // English League Cup (Plymouth/Exeter etc.)
  "CDR": 4483, // Copa del Rey (R1 not published before ~Nov → honest empty until then)
  "COPPA_ITALIA": 4506 // Coppa Italia (Parma/Catania R64 ...)
};
async function fetchTheSportsDB(env) {
  const matches = [];
  const monitored = new Set([...CONFIG.LEAGUES, "EL", "ECL", ...Object.keys(CONFIG.DOMESTIC_CUP_IDS), ...Object.keys(CONFIG.INTL_COMPETITIONS)]);
  // FIX: pace calls ~1.2s apart — TheSportsDB free tier allows ~1 req/s; bursts get 429
  let tsdbCalls = 0;
  const pace = () => (tsdbCalls++ > 0 ? new Promise((r) => setTimeout(r, 1200)) : Promise.resolve());
  // Per-league "next events" endpoint — one call per league we have an ID for
  for (const [code, leagueId] of Object.entries(Object.assign({}, TSP_LEAGUE_IDS, CUP_TSP_IDS))) {
    if (!monitored.has(code)) continue;
    await pace();
    const data = await fetchJSON("https://www.thesportsdb.com/api/v1/json/3/eventsnextleague.php?id=" + leagueId);
    for (const e of (data && data.events) || []) {
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
  // Sweep: eventsday for any other monitored league (e.g. cups) in the near window.
  // Audit fix 3: this is a redundancy layer — only spend its subrequests when
  // the per-league calls came up empty (TSP hiccup), and tolerate per-day
  // failures so one bad day can't lose the rest of the sweep.
  if (!matches.length) {
    const from = new Date(Date.now() - CONFIG.FALLBACK_DAYS_PAST * 864e5);
    const to = new Date(Date.now() + CONFIG.FALLBACK_DAYS_FUTURE * 864e5);
    for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split("T")[0];
      await pace();
      try {
        const data = await fetchJSON("https://www.thesportsdb.com/api/v1/json/3/eventsday.php?d=" + dateStr);
        for (const e of (data && data.events) || []) {
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
async function fetchMatchesFromAPI(env) {
  // Merge ALL sources instead of first-wins: football-data covers leagues/CL/cups,
  // sportscore adds EL/ECL (fd free tier rejects those comps), thesportsdb is a
  // last sweep. Dedupe on a canonical key so one real match can't notify twice.
  const sources = [
    { name: "football-data", fn: fetchFootballData },
    { name: "sportscore", fn: fetchSportScore },
    { name: "thesportsdb", fn: fetchTheSportsDB }
  ];
  const merged = new Map();
  const used = [];
  // Run ALL sources in parallel (they hit different hosts and share no mutable
  // state): the cron must finish inside the 30s wall-clock limit — sequential
  // source sweeps (fd + sportscore + thesportsdb) regularly blew past it, which
  // is a real "sometimes doesn't notify" cause. Worst-case wall time is now
  // max(source) ≈ the paced TSP calls, well under the limit.
  await Promise.all(sources.map((s) => (async () => {
    try {
      console.log("Trying API source: " + s.name);
      const m = await s.fn(env);
      if (m && m.length) {
        used.push(s.name);
        for (const x of m) {
          const k = `${x.competition.code}|${normalizeTeamName(x.homeTeam.name)}|${normalizeTeamName(x.awayTeam.name)}|${(x.utcDate || "").slice(0, 10)}`;
          const cur = merged.get(k);
          if (!cur) {
            merged.set(k, x);
          } else {
            // Same real match from a later provider: fill in crests the earlier
            // source lacked (e.g. sportscore's home_logo when football-data has
            // no crest for a cup side) — pubMatch renders whichever is present.
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
  // v12.2: the Map above is keyed by comp+pairing+DAY, so the same fixture
  // reported with kickoff noise (~a day apart, same or different id) survives
  // as two rows — the notification loop would then see the same real match
  // twice (double "match started" risk). canonDedupe's pairing-proximity pass
  // collapses those before anything downstream consumes the pool.
  let matches = canonDedupe([...merged.values()]);
  let usedSource = used.join("+");
  // 0-worthy resilience: a live pool without any followed-team match (e.g. only
  // sportscore survived a rate hiccup) must not blank notifications — reuse the
  // last good cached pool so missed windows keep firing via backfill.
  if (matches.length && !matches.some(shouldNotify)) {
    const pool = await getCachedMatches(env);
    if (pool.some(shouldNotify)) {
      console.log("\u26A0\uFE0F Live pool has 0 followed-team matches — reusing cached pool");
      matches = pool;
      usedSource += "+cache";
    }
  }
  if (!matches.length) {
    console.error("\u274C All API sources empty, falling back to cache");
    matches = await getCachedMatches(env);
    if (matches.length) usedSource = "cache";
    // FIX: surface silent degradation — one alert per 6h to the admin chat,
    // so a provider outage is never invisible to the user.
    try {
      const lastAlert = parseInt(await env.STATE.get("degradation_alert_at").catch(() => null)) || 0;
      if (Date.now() - lastAlert > CONFIG.NOTIFICATION_COOLDOWN_HOURS * CONFIG.ONE_HOUR_MS) {
        const chats = await getRegisteredChats(env);
        const msg = "\u26A0\uFE0F *\u0647\u0634\u062F\u0627\u0631:* \u0647\u0645\u0647 \u0645\u0646\u0627\u0628\u0639 \u0646\u0627\u0645\u062A\u0648\u0627\u0646\u0633\u062A\u0646\u062F \u062F\u0627\u062F\u0647 \u0647\u0627 \u0631\u0627 \u0628\u06AF\u06CC\u0631\u0646\u062F\u060C \u0627\u0632 \u06A9\u0627\u0634 (\u06F2\u06F4 \u0633\u0627\u0639\u062A) \u0627\u0633\u062A\u0641\u0627\u062F\u0647 \u0645\u06CC\u200C\u0634\u0648\u062F. \u0627\u06AF\u0631 \u0645\u0634\u06A9\u0644 \u0627\u062F\u0627\u0645\u0647 \u062F\u0627\u0634\u062A\u060C \u0633\u0627\u06CC\u0631 \u0645\u0646\u0627\u0628\u0639 \u0631\u0627 \u0628\u0631\u0631\u0633\u06CC \u06A9\u0646\u06CC\u062F.";
        await Promise.allSettled(chats.map((c) => sendTelegram(env, msg, c)));
        await env.STATE.put("degradation_alert_at", String(Date.now())).catch(() => {});
      }
    } catch (alertErr) {
      console.error("Degradation alert failed: " + alertErr.message);
    }
  } else {
    await cacheMatches(env, matches, usedSource);
  }
  if (usedSource) {
    // Audit fix 4: write only when the source actually changed (was: every run).
    const prevSource = await env.STATE.get(CONFIG.KV_LAST_SOURCE).catch(() => null);
    if (prevSource !== usedSource) {
      await env.STATE.put(CONFIG.KV_LAST_SOURCE, usedSource).catch(() => {});
    }
  }
  console.log(`\u{1F4CA} Total matches found: ${matches.length} (source: ${usedSource})`);
  return matches;
}
__name(fetchMatchesFromAPI, "fetchMatchesFromAPI");
async function fetchWithRetry(url, apiToken, label) {
  for (let attempt = 1; attempt <= CONFIG.API_RETRY_ATTEMPTS; attempt++) {
    if (++SUBREQUEST_COUNT > SUBREQUEST_CAP) throw new Error("Subrequest budget exhausted"); // audit fix 3
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
var TELEGRAM_PAUSE_UNTIL = 0;
async function sendTelegram(env, text, chatId) {
  // Audit fix 11 (429 handling): a 429 no longer sleeps retry_after (can be
  // 30s+) and stall the whole notification group. All sends pause globally for
  // min(retryAfter, 10s); the current message gets one short retry, remaining
  // sends defer to the next cron run (the dedupe lock is only set on success,
  // so nothing is permanently lost).
  for (let attempt = 1; attempt <= CONFIG.TELEGRAM_RETRY_ATTEMPTS; attempt++) {
    if (Date.now() < TELEGRAM_PAUSE_UNTIL) return false;
    if (++SUBREQUEST_COUNT > SUBREQUEST_CAP) return false; // audit fix 3: budget guard — defer, never 1101
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
        TELEGRAM_PAUSE_UNTIL = Math.max(TELEGRAM_PAUSE_UNTIL, Date.now() + Math.min(Math.max(retryAfter, 1), 10) * 1000);
        if (attempt < CONFIG.TELEGRAM_RETRY_ATTEMPTS) {
          await new Promise((r) => setTimeout(r, 1500));
        }
        continue;
      }
      if (res.status >= 400 && res.status < 500) {
        // Permanent error (bad markdown, chat not found, blocked bot, etc.) — retrying won't help.
        // Return "dead" so the caller can prune chats that no longer accept messages
        // (bot blocked / chat not found), and markdown errors surface as "dead" too.
        return /chat not found|blocked by the user|bot was kicked|deactivated/i.test(error) ? "dead" : false;
      }
    } catch (error) {
      console.error(`Telegram network error (attempt ${attempt}/${CONFIG.TELEGRAM_RETRY_ATTEMPTS}):`, error.message);
    }
    if (attempt < CONFIG.TELEGRAM_RETRY_ATTEMPTS) {
      await new Promise((r) => setTimeout(r, 1000 * attempt));
    }
  }
  return false;
}
__name(sendTelegram, "sendTelegram");
function format24HourMessage(match, env) {
  const homeTeam = translateTeam(match.homeTeam.name);
  const awayTeam = translateTeam(match.awayTeam.name);
  const competition = translateCompetition(match.competition.code);
  const jalaliDate = getJalaliDate(match.utcDate, env);
  const jalaliTime = getJalaliTime(match.utcDate, env);
  const stage = STAGE_FA[String(match.stage || "").toUpperCase()] || (match.stage ? match.stage.replace(/_/g, " ") : "\u0645\u0631\u062D\u0644\u0647 \u06AF\u0631\u0648\u0647\u06CC");
  const timeUntil = getRelativeTimeUntilMatch(match.utcDate, env);
  const emojiMap = {
    "CL": "\u{1F3C6}",
    "PL": "\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}",
    "PD": "\u{1F1EA}\u{1F1F8}",
    "SA": "\u{1F1EE}\u{1F1F9}",
    "FL1": "\u{1F1EB}\u{1F1F7}",
    "FA_CUP": "\u{1F3C6}",
    "EFL_CUP": "\u{1F3C6}",
    "CDR": "\u{1F3C6}",
    "COPPA_ITALIA": "\u{1F3C6}"
  };
  const emoji = emojiMap[match.competition.code] || "\u26BD";
  let message = `${emoji} *${competition}*`;
  if (match.competition.code === "CL" || isDomesticCup(match.competition.code) || match.stage !== "REGULAR_SEASON") {
    message += ` \\- ${stage}`;
  }
  message += `
\u{1F4C5} ${jalaliDate}

`;
  message += `\u26BD *${escapeMarkdownCharacters(homeTeam)} \u{1F19A} ${escapeMarkdownCharacters(awayTeam)}*
`;
  message += `\u23F0 ${jalaliTime}
`;
  message += `\u23F3 ${timeUntil}
`;
  if (match.competition.code === "CL") {
    message += `\u{1F4CD} ${escapeMarkdownCharacters(homeTeam)} \u0645\u06CC\u0632\u0628\u0627\u0646
`;
  }
  message += `
\u{1F514} *\u06CC\u0627\u062F\u0622\u0648\u0631\u06CC \u06F2\u06F4 \u0633\u0627\u0639\u062A\u0647:* \u0645\u0633\u0627\u0628\u0642\u0647 \u0641\u0631\u062F\u0627 \u062F\u0631 \u0627\u06CC\u0646 \u0632\u0645\u0627\u0646 \u0628\u0631\u06AF\u0632\u0627\u0631 \u0645\u06CC\u200C\u0634\u0648\u062F\\.`;
  message += `

\u{1F4F1} \u06CC\u0627\u062F\u0622\u0648\u0631\u06CC \u0628\u0639\u062F\u06CC: \u06F3 \u0633\u0627\u0639\u062A \u0642\u0628\u0644 \u0627\u0632 \u0628\u0627\u0632\u06CC`;
  return message;
}
__name(format24HourMessage, "format24HourMessage");
// Mode B heads-up: both followed teams vs each other, delivered ~72h before kickoff.
function formatBigMatchMessage(match, env) {
  const homeTeam = translateTeam(match.homeTeam.name);
  const awayTeam = translateTeam(match.awayTeam.name);
  const competition = translateCompetition(match.competition.code);
  const jalaliDate = getJalaliDate(match.utcDate, env);
  const jalaliTime = getJalaliTime(match.utcDate, env);
  const timeUntil = getRelativeTimeUntilMatch(match.utcDate, env);
  const stage = STAGE_FA[String(match.stage || "").toUpperCase()] || (match.stage ? match.stage.replace(/_/g, " ") : "");
  const emojiMap = {
    "CL": "\u{1F3C6}", "PL": "\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}",
    "PD": "\u{1F1EA}\u{1F1F8}", "SA": "\u{1F1EE}\u{1F1F9}", "FL1": "\u{1F1EB}\u{1F1F7}",
    "FA_CUP": "\u{1F3C6}", "EFL_CUP": "\u{1F3C6}", "CDR": "\u{1F3C6}", "COPPA_ITALIA": "\u{1F3C6}"
  };
  const emoji = emojiMap[match.competition.code] || "\u26BD";
  let message = `\u26A1 *\u0628\u0627\u0632\u06CC \u0628\u0632\u0631\u06AF:* ${escapeMarkdownCharacters(homeTeam)} \u{1F19A} ${escapeMarkdownCharacters(awayTeam)}`;
  message += `\n${emoji} *${competition}*`;
  if (match.competition.code === "CL" || isDomesticCup(match.competition.code) || match.stage !== "REGULAR_SEASON") {
    message += ` \\- ${escapeMarkdownCharacters(stage)}`;
  }
  message += `\n\u{1F4C5} ${jalaliDate}\n\u23F0 ${jalaliTime}\n\u23F3 ${timeUntil}`;
  message += `\n\n\u{1F525} \u062F\u0648 \u062A\u06CC\u0645 \u0645\u0648\u0631\u062F \u0639\u0644\u0627\u0642\u0647 \u0647\u0645\u0631\u0648\u0634\u0648 \u0647\u0633\u062A\u0646\u062F\u200C\\! \u0627\u06CC\u0646 \u06CC\u06A9\u06CC \u0627\u0632 \u0627\u0647\u0645\u062A\u0631\u06CC\u0646 \u0628\u0627\u0632\u06CC\u200C\u0647\u0627\u06CC \u0645\u0627 \u0627\u0633\u062A \u26BD`;
  message += `\n\n\u{1F4F1} \u06CC\u0627\u062F\u0622\u0648\u0631\u06CC \u0628\u0639\u062F\u06CC: \u06F2\u06F4 \u0633\u0627\u0639\u062A \u0642\u0628\u0644 \u0627\u0632 \u0628\u0627\u0632\u06CC`;
  return message;
}
__name(formatBigMatchMessage, "formatBigMatchMessage");
function format3HourMessage(match, env) {
  const homeTeam = translateTeam(match.homeTeam.name);
  const awayTeam = translateTeam(match.awayTeam.name);
  const competition = translateCompetition(match.competition.code);
  const jalaliTime = getJalaliTime(match.utcDate, env);
  const timeUntil = getRelativeTimeUntilMatch(match.utcDate, env);
  let message = `\u23F0 *\u06CC\u0627\u062F\u0622\u0648\u0631\u06CC \u06F3 \u0633\u0627\u0639\u062A\u0647*

`;
  message += `\u26BD ${escapeMarkdownCharacters(homeTeam)} \u{1F19A} ${escapeMarkdownCharacters(awayTeam)}
`;
  message += `\u{1F3C6} ${competition}
`;
  message += `\u{1F552} ${jalaliTime}
`;
  message += `\u23F3 ${timeUntil}

`;
  message += `\u{1F3AF} \u0628\u0627\u0632\u06CC \u0628\u0647 \u0632\u0648\u062F\u06CC \u0634\u0631\u0648\u0639 \u0645\u06CC\u200C\u0634\u0648\u062F\\! \u0622\u0645\u0627\u062F\u0647 \u0628\u0627\u0634\u06CC\u062F \u26BD`;
  message += `

\u{1F4F1} \u06CC\u0627\u062F\u0622\u0648\u0631\u06CC \u0628\u0639\u062F\u06CC: \u06F1 \u0633\u0627\u0639\u062A \u0642\u0628\u0644 \u0627\u0632 \u0628\u0627\u0632\u06CC`;
  return message;
}
__name(format3HourMessage, "format3HourMessage");
function format1HourMessage(match, env) {
  const homeTeam = translateTeam(match.homeTeam.name);
  const awayTeam = translateTeam(match.awayTeam.name);
  const competition = translateCompetition(match.competition.code);
  const jalaliTime = getJalaliTime(match.utcDate, env);
  const timeUntil = getRelativeTimeUntilMatch(match.utcDate, env);
  let message = `\u26A0\uFE0F *\u06CC\u0627\u062F\u0622\u0648\u0631\u06CC \u06F1 \u0633\u0627\u0639\u062A\u0647*

`;
  message += `\u26BD ${escapeMarkdownCharacters(homeTeam)} \u{1F19A} ${escapeMarkdownCharacters(awayTeam)}
`;
  message += `\u{1F3C6} ${competition}
`;
  message += `\u{1F552} ${jalaliTime}
`;
  message += `\u23F3 ${timeUntil}

`;
  message += `\u{1F525} \u0628\u0627\u0632\u06CC \u0646\u0632\u062F\u06CC\u06A9 \u0627\u0633\u062A\\! \u0622\u0645\u0627\u062F\u0647\u200C\u0633\u0627\u0632\u06CC \u0646\u0647\u0627\u06CC\u06CC \u26BD`;
  message += `

\u{1F4F1} \u0627\u0639\u0644\u0627\u0646 \u0628\u0639\u062F\u06CC: \u0632\u0645\u0627\u0646 \u0634\u0631\u0648\u0639 \u0628\u0627\u0632\u06CC`;
  return message;
}
__name(format1HourMessage, "format1HourMessage");
function formatMatchStartMessage(match, env) {
  const homeTeam = translateTeam(match.homeTeam.name);
  const awayTeam = translateTeam(match.awayTeam.name);
  const competition = translateCompetition(match.competition.code);
  const jalaliTime = getJalaliTime(match.utcDate, env);
  let message = `\u{1F6A8} *\u0628\u0627\u0632\u06CC \u0634\u0631\u0648\u0639 \u0634\u062F\\!*

`;
  message += `\u26BD ${escapeMarkdownCharacters(homeTeam)} \u{1F19A} ${escapeMarkdownCharacters(awayTeam)}
`;
  message += `\u{1F3C6} ${competition}
`;
  message += `\u{1F552} ${jalaliTime}

`;
  message += `\u{1F4FA} \u0628\u0627\u0632\u06CC \u062F\u0631 \u062D\u0627\u0644 \u067E\u062E\u0634 \u0627\u0633\u062A\\!`;
  message += `

\u{1F3C3}\u200D\u2642\uFE0F \u0633\u0631\u06CC\u0639 \u0628\u0627\u0634\u06CC\u062F \u0648 \u0627\u0632 \u0628\u0627\u0632\u06CC \u0644\u0630\u062A \u0628\u0628\u0631\u06CC\u062F\\!`;
  return message;
}
__name(formatMatchStartMessage, "formatMatchStartMessage");
async function formatResultMessage(match, env) {
  const homeTeam = translateTeam(match.homeTeam.name);
  const awayTeam = translateTeam(match.awayTeam.name);
  const competition = translateCompetition(match.competition.code);
  const jalaliDate = getJalaliDate(match.utcDate, env);
  let message = `\u{1F3C1} *\u0646\u062A\u06CC\u062C\u0647 \u0628\u0627\u0632\u06CC*

`;
  message += `\u26BD ${escapeMarkdownCharacters(homeTeam)} \u{1F19A} ${escapeMarkdownCharacters(awayTeam)}
`;
  message += `\u{1F3C6} ${competition}
`;
  message += `\u{1F4C5} ${jalaliDate}

`;
  if (match.score.fullTime.home !== null && match.score.fullTime.away !== null) {
    message += `\u{1F4CA} *${toFaDigits(match.score.fullTime.home.toString())}\\-${toFaDigits(match.score.fullTime.away.toString())}*`;
    if (match.score.fullTime.home > match.score.fullTime.away) {
      message += `
\u2705 ${escapeMarkdownCharacters(homeTeam)} \u0628\u0631\u0646\u062F\u0647 \u0634\u062F`;
    } else if (match.score.fullTime.home < match.score.fullTime.away) {
      message += `
\u2705 ${escapeMarkdownCharacters(awayTeam)} \u0628\u0631\u0646\u062F\u0647 \u0634\u062F`;
    } else {
      message += `
\u{1F91D} \u0645\u0633\u0627\u0648\u06CC`;
    }
  } else {
    message += `\u{1F4CA} \u0646\u062A\u06CC\u062C\u0647 \u062F\u0631 \u062F\u0633\u062A\u0631\u0633 \u0646\u06CC\u0633\u062A`;
  }
  return await appendTableOrPhase(env, match, message);
}
__name(formatResultMessage, "formatResultMessage");
// ⚔️ Stage names (Persian) + standings helpers — appended to result notifications
var STAGE_FA = {
  "PLAYOFF_ROUND": "پلی‌آف مرحله حذفی",
  "ROUND_OF_16": "یک‌هشتم نهایی",
  "QUARTER_FINALS": "یک‌چهارم نهایی",
  "QUARTER_FINAL": "یک‌چهارم نهایی",
  "SEMI_FINALS": "نیمه‌نهایی",
  "SEMI_FINAL": "نیمه‌نهایی",
  "FINAL": "فینال",
  "THIRD_PLACE": "رده‌بندی"
};
function faStageName(stage) {
  return STAGE_FA[String(stage || "").toUpperCase()] || null;
}
__name(faStageName, "faStageName");
async function fetchStandings(env, code, allowFetch = true) {
  // Standings with KV cache (10-min freshness, 8h retention for stale-serve).
  // football-data for CL/domestic leagues;
  // sportscore for EL/ECL (football-data's free tier rejects them); TheSportsDB
  // lookuptable for Iran PGL (fd free tier has no Iran comp).
  // Returns { matchday, teams:[{name,pos,points}] } or null (unavailable/failed).
  const cacheKey = CONFIG.KV_STANDINGS_CACHE + code;
  const cached = await env.STATE.get(cacheKey, "json").catch(() => null);
  if (cached && cached.ts && Date.now() - cached.ts < 6e5) return cached.data;
  // Future-plan fix (league tables flaking on the website): football-data's
  // free tier allows 10 req/min and the fixture sweep spends most of that
  // budget — burst-refreshing every table right after it eats 429s and the
  // site shows "table not available". allowFetch=false (time-sliced rotation
  // in fetchPublicMatches) serves the cached table without touching the
  // network, and even an allowed fetch falls back to the last good table on
  // failure instead of an empty box.
  if (!allowFetch) return cached && cached.data && Array.isArray(cached.data.teams) && cached.data.teams.length ? cached.data : null;
  let out = null;
  try {
    if (code === "EL" || code === "ECL") {
      const slug = SPORTSCORE_SLUGS[code];
      if (slug) {
        const data = await fetchJSON("https://sportscore.com/api/v1/standings/?sport=football&competition=" + slug);
        const table = (data && data.tables && data.tables[0] && data.tables[0].rows) || [];
        out = { matchday: null, teams: table.map((r) => ({ name: r.team, pos: r.pos, points: r.pts })) };
      }
    } else if (code === "PGL") {
      // Iran PGL: sportscore is the reliable primary (18-team table); TheSportsDB
      // is only the fallback (its free tier 429s and its PGL table is incomplete).
      const ps = SPORTSCORE_SLUGS.PGL;
      if (ps) {
        try {
          const data = await fetchJSON("https://sportscore.com/api/v1/standings/?sport=football&competition=" + ps);
          const table = (data && data.tables && data.tables[0] && data.tables[0].rows) || [];
          if (table.length) {
            out = { matchday: null, started: table.some((r) => parseInt(r.pts) > 0), teams: table.map((r) => ({ name: r.team, pos: r.pos, points: r.pts })) };
          }
        } catch (e) { /* fall through to thesportsdb */ }
      }
      if (!out) {
        for (const season of ["2026-2027", "2025-2026"]) {
          try {
            const data = await fetchJSON("https://www.thesportsdb.com/api/v1/json/3/lookuptable.php?l=4742&s=" + season);
            const rows = (data && data.table) || [];
            if (rows.length) {
              out = { matchday: 0, started: rows.some((r) => parseInt(r.intPlayed) > 0), teams: rows.map((r) => ({ name: r.strTeam, pos: parseInt(r.intRank) || 0, points: parseInt(r.intPoints) || 0 })) };
              break;
            }
          } catch (e) { /* try previous season */ }
        }
      }
    } else if (code === "AL") {
      const slug = SPORTSCORE_SLUGS.AL;
      if (slug) {
        const data = await fetchJSON("https://sportscore.com/api/v1/standings/?sport=football&competition=" + slug);
        const table = (data && data.tables && data.tables[0] && data.tables[0].rows) || [];
        if (table.length) {
          const sStart = CONFIG.SEASON_STARTS && CONFIG.SEASON_STARTS.AL;
          const notStarted = sStart && new Date() < new Date(sStart);
          out = notStarted
            ? { matchday: null, started: false, teams: table.map((r, i) => ({ name: r.team, pos: i + 1, points: 0 })) }
            : { matchday: null, started: table.some((r) => parseInt(r.pts) > 0), teams: table.map((r) => ({ name: r.team, pos: r.pos, points: r.pts })) };
        }
      }
    } else {
      const headers = { "X-Auth-Token": env.API_TOKEN };
      const res = await fetch("https://api.football-data.org/v4/competitions/" + code + "/standings", { headers });
      if (res.ok) {
        const data = await res.json();
        const season = data.season;
        const table = (data.standings && data.standings[0] && data.standings[0].table) || [];
        // Off-season guard: football-data keeps serving the last completed table until
        // the new season starts. If the served season is over (endDate in the past) or
        // hasn't started yet, show a fresh zeroed table (current-season roster,
        // alphabetical) instead of stale finals.
        const seasonEnded = season && season.endDate && new Date(season.endDate) < new Date();
        const notStarted = seasonEnded || (season && season.startDate && new Date(season.startDate) > new Date());
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
            teams: table.map((r) => ({ name: r.team.name, pos: r.position, points: r.points }))
          };
        }
      }
      // FD free tier can 429 on BL1. sportscore's BL1 table in pre-season is the
      // *completed* prior season's final table — never present those points as
      // current. Zero them and mark started:false (consistent with the FD guard).
      if (!out && code === "BL1") {
        const slug = SPORTSCORE_SLUGS.BL1;
        if (slug) {
          const data = await fetchJSON("https://sportscore.com/api/v1/standings/?sport=football&competition=" + slug);
          const table = (data && data.tables && data.tables[0] && data.tables[0].rows) || [];
          out = { matchday: null, started: false, teams: table.map((r, i) => ({ name: r.team, pos: i + 1, points: 0 })) };
        }
      }
    }
  } catch (e) {
    console.error("Standings fetch failed for " + code + ": " + e.message);
  }
  if (out && out.teams.length) {
    // Future-plan fix: TTL is 8h while freshness stays 10 min (the ts check
    // above) — KV expiry physically deletes the key, and a deleted key cannot
    // be stale-served when the league is outside the current rotation slot.
    // Long TTL + short freshness = refresh cadence unchanged, resilience up.
    await env.STATE.put(cacheKey, JSON.stringify({ ts: Date.now(), data: out }), { expirationTtl: 28800 }).catch(() => {});
    return out;
  }
  // Provider failed (429/5xx) — serve the last good table rather than nothing.
  if (cached && cached.data && Array.isArray(cached.data.teams) && cached.data.teams.length) return cached.data;
  return null;
}
__name(fetchStandings, "fetchStandings");
async function standingsLine(env, match) {
  // Rank + points for the two teams involved, with rank change vs the last snapshot.
  const code = match.competition.code;
  const fresh = await fetchStandings(env, code);
  if (!fresh || !fresh.teams.length) return null;
  const snapKey = CONFIG.KV_STANDINGS_SNAP + code;
  const old = await env.STATE.get(snapKey, "json").catch(() => null);
  await env.STATE.put(snapKey, JSON.stringify(fresh)).catch(() => {});
  const lines = [];
  for (const team of [match.homeTeam, match.awayTeam]) {
    const row = fresh.teams.find((x) => normalizeTeamName(x.name) === normalizeTeamName(team.name));
    if (!row) continue;
    const prev = old && old.teams && old.teams.find((x) => normalizeTeamName(x.name) === normalizeTeamName(team.name));
    let delta = "";
    if (prev) {
      const d = prev.pos - row.pos;
      delta = d > 0 ? " \\(↑" + toFaDigits(d.toString()) + "\\)" : d < 0 ? " \\(↓" + toFaDigits((-d).toString()) + "\\)" : " \\(—\\)";
    }
    lines.push("• " + escapeMarkdownCharacters(translateTeam(row.name)) + ": رتبه " + toFaDigits(row.pos.toString()) + " — " + toFaDigits(row.points.toString()) + " امتیاز" + delta);
  }
  if (!lines.length) return null;
  return "\n\n📊 جدول " + translateCompetition(code) + ":\n" + lines.join("\n");
}
__name(standingsLine, "standingsLine");
async function appendTableOrPhase(env, match, message) {
  // Knockout/cup match → mention the elimination phase; otherwise → standings block.
  const faStage = faStageName(match.stage);
  if (isDomesticCup(match.competition.code) || faStage) {
    return message + "\n\n⚔️ این مسابقه در مرحله حذفی بود" + (faStage ? ": " + faStage : "");
  }
  return message + ((await standingsLine(env, match)) || "");
}
__name(appendTableOrPhase, "appendTableOrPhase");
// ─── v12.9: weekly league-tables digest ───
// The bot delivers the tables of the SELECTED leagues (CONFIG.LEAGUES after
// applySettings — i.e. what the admin picked — plus PGL, the league the user
// curated onto the site's standings grid) once at the end of the week, plus
// on demand via /tables and via the admin "send-tables" action.
function isoWeekKey(d) {
  // ISO-8601 year-week ("2026-W37"). getNowTehran hands us Tehran wall-clock
  // on the UTC timeline, so the key tracks the TEHRAN calendar week.
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
function weeklyTableCodes() {
  // Fixed display order; codes not in the selection (e.g. BL1/AL today) stay
  // out of the digest until the settings add them.
  const order = ["PL", "PD", "SA", "BL1", "FL1", "PGL", "AL", "CL"];
  const picked = new Set([].concat(CONFIG.LEAGUES || [], ["PGL"]));
  return order.filter((c) => picked.has(c));
}
__name(weeklyTableCodes, "weeklyTableCodes");
function buildLeagueTableMessage(code, st, opts) {
  // One MarkdownV2 message per league. Ranks are renumbered sequentially —
  // the providers return TIED positions (two teams on pos 6), which would
  // read like a data bug in a chat message. Leader bolded, selected teams ⭐.
  const isCL = code === "CL";
  const teams = (st.teams || []).slice().sort((a, b) => (a.pos || 0) - (b.pos || 0) || (b.points || 0) - (a.points || 0));
  const shown = isCL ? teams.slice(0, 10) : teams;
  const sel = new Set((CONFIG.BIG_TEAMS_BY_LEAGUE[code] || []).map((t) => normAlias(t)));
  const lines = shown.map((t, i) => {
    const row = toFaDigits(String(i + 1)) + "\\. " + escapeMarkdownCharacters(translateTeam(t.name)) + (sel.has(normAlias(t.name)) ? " ⭐" : "") + " — " + toFaDigits(String(t.points == null ? 0 : t.points)) + " امتیاز";
    return i === 0 ? "*" + row + "*" : row;
  });
  let head = "📊 *جدول " + translateCompetition(code) + "*";
  if (st.matchday) head += " — هفته " + toFaDigits(String(st.matchday));
  if (opts && opts.label) head += " — " + opts.label;
  let msg = head + "\n\n" + lines.join("\n");
  if (isCL && teams.length > shown.length) msg += "\n… " + toFaDigits(String(teams.length - shown.length)) + " تیم بعدی";
  msg += "\n\n📊 جدول کامل: football\\.sportsignal\\.ir";
  return msg;
}
__name(buildLeagueTableMessage, "buildLeagueTableMessage");
async function sendLeagueTables(env, chatIds, opts) {
  // Builds and delivers one message per selected league to every chat.
  // Not-started tables (A-League pre-season) and provider failures are
  // skipped, never fatal. Returns per-league status for the admin action.
  const out = { leagues: [], sent: 0, failed: 0 };
  if (!Array.isArray(chatIds) || !chatIds.length) { out.error = "no chats"; return out; }
  const messages = [];
  for (const code of weeklyTableCodes()) {
    let st = null;
    try { st = await fetchStandings(env, code, true); } catch (e) { st = null; }
    if (!st || !Array.isArray(st.teams) || !st.teams.length) { out.leagues.push({ code, ok: false, reason: "unavailable" }); continue; }
    if (st.started === false) { out.leagues.push({ code, ok: false, reason: "not-started" }); continue; }
    messages.push({ code, text: buildLeagueTableMessage(code, st, opts) });
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
async function maybeSendWeeklyTables(env, chatIds) {
  // Fires once per ISO week inside the end-of-week window (Monday 01:30–06:00
  // Tehran). The week flag is set ONLY when something was actually delivered:
  // an all-failed run (API outage / subrequest cap) retries on the next
  // 10-minute tick with KV-cached standings — the digest is never lost.
  const t = getNowTehran(env);
  if (t.getUTCDay() !== CONFIG.WEEKLY_TABLES.day) return null;
  const mins = t.getUTCHours() * 60 + t.getUTCMinutes();
  if (mins < CONFIG.WEEKLY_TABLES.fromMin || mins >= CONFIG.WEEKLY_TABLES.toMin) return null;
  const week = isoWeekKey(t);
  const done = await env.STATE.get(CONFIG.KV_WEEKLY_TABLES).catch(() => null);
  if (done === week) return null;
  const res = await sendLeagueTables(env, chatIds, { label: "پایان هفته" });
  if (res.sent > 0) await env.STATE.put(CONFIG.KV_WEEKLY_TABLES, week).catch(() => {});
  return res;
}
__name(maybeSendWeeklyTables, "maybeSendWeeklyTables");
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
    windowCheck: /* @__PURE__ */ __name((match, env) => isWithinPostMatchWindow(match, env), "windowCheck"),
    messageFormatter: formatResultMessage,
    requiresFuture: false
  }
];
async function sendNotificationIfNeeded(match, config, chatGroups, env, nowTehran, counts, notifiedMatches, deadChats) {
  const matchTime = new Date(match.utcDate);
  // FIX: nowTehran is Tehran wall-clock parsed as UTC (+3:30h skew) — comparing against it
  // made 3h/1h reminders look "past" and they never fired. Compare against real UTC now.
  const isFuture = matchTime > new Date();
  const isFinished = isMatchFinished(match);
  if (config.requiresFuture && !isFuture) return;
  if (config.type === "result" && !isFinished) return;
  let late = false;
  if (!config.windowCheck(match, env)) {
    // Window missed — recover it as a one-off late notification if still eligible
    if (!isBackfillEligible(match, config.type, env)) return;
    late = true;
  }
  const shouldSend = await shouldSendNotification(env, match, config.type, notifiedMatches);
  if (!shouldSend) return;
  // One message per timezone group so each user sees the kickoff in their local time
  const originalTz = env.TEHRAN_TZ;
  let anySuccess = false;
  try {
    for (const g of chatGroups) {
      env.TEHRAN_TZ = g.tz;
      let message = await config.messageFormatter(match, env);
      if (late) message += "\n\n\u23F1\uFE0F \u0627\u06CC\u0646 \u06CC\u0627\u062F\u0622\u0648\u0631\u06CC \u0628\u0627 \u062A\u0623\u062E\u06CC\u0631 \u0627\u0631\u0633\u0627\u0644 \u0634\u062F";
      const sendResults = await Promise.allSettled(
        g.chats.map((chatId) => sendTelegram(env, message, chatId))
      );
      // Prune chats that permanently reject messages (blocked bot, chat not found)
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
    // Mode B rise to the top: both teams are followed (master list) — global signal,
    // per-user gating happens later in the send loop.
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
    // Per-user filtering: only chats that follow this match get notified
    const matchChats = chatIds.filter((c) => userFollowsMatch(prefs, c, match));
    if (!matchChats.length) continue;
    const chatGroups = groupChatsByTz(matchChats, prefs, env);
    const matchTime = new Date(match.utcDate);
    console.log(`
\u{1F3AF} Processing: ${translateTeam(match.homeTeam.name)} vs ${translateTeam(match.awayTeam.name)}`);
    console.log(`   Match time: ${matchTime.toLocaleString("fa-IR")}`);
    console.log(`   Status: ${match.status}`);
    for (const config of NOTIFICATION_CONFIGS) {
      // Mode B gate: the 72h heads-up only goes to users following BOTH teams
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
  // Prune chats that permanently reject messages so they stop wasting the
  // subrequest budget on every cron run (free tier: 50 subrequests/invocation).
  if (deadChats.length) {
    const keep = chatIds.filter((c) => !deadChats.includes(c));
    console.log(`\u{1F5D1}\uFE0F Pruning dead chats: ${deadChats.join(", ")}`);
    await env.STATE.put(CONFIG.KV_USERS_KEY, JSON.stringify(keep)).catch(() => {});
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
// ─── Per-user preferences ───
// KV user_prefs_v1: { "<chatId>": { teams: ["Arsenal FC", ...] } }.
// Absent entry = follow ALL followed teams (default, backwards-compatible).
async function getUserPrefs(env) {
  try {
    return (await env.STATE.get(CONFIG.KV_USER_PREFS, "json")) || {};
  } catch (e) {
    return {};
  }
}
__name(getUserPrefs, "getUserPrefs");
function userFollowsMatch(prefs, chatId, match) {
  // Mode B (priority): user follows BOTH teams -> "both".
  // Mode A: user follows exactly one -> "one". Default (no prefs) = master list.
  // CPU fix (audit finding 5): the default (no prefs) path resolves against the
  // memoized normalized master Set instead of re-normalizing the full list per call.
  const p = prefs[String(chatId)];
  const nh = normAlias(match.homeTeam.name);
  const na = normAlias(match.awayTeam.name);
  let home = false, away = false;
  if (p && Array.isArray(p.teams) && p.teams.length) {
    home = p.teams.some((t) => normalizeTeamName(t) === nh);
    away = p.teams.some((t) => normalizeTeamName(t) === na);
  } else {
    masterTeamList();
    home = _masterMemo.normSet.has(nh);
    away = _masterMemo.normSet.has(na);
  }
  return home && away ? "both" : home || away ? "one" : null;
}
__name(userFollowsMatch, "userFollowsMatch");
function isBigMatch(match, prefs, chatId) {
  return userFollowsMatch(prefs, chatId, match) === "both";
}
__name(isBigMatch, "isBigMatch");
var _masterMemo = { sig: null, list: null, normSet: null };
function masterTeamList() {
  // Flat unique list of all followed teams (for /teams numbering)
  // CPU fix (audit finding 5): memoized; identity-invalidated automatically
  // when applySettings() replaces CONFIG.BIG_TEAMS_BY_LEAGUE.
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
    _masterMemo.normSet = /* @__PURE__ */ new Set(out.map(normalizeTeamName));
  }
  return _masterMemo.list;
}
__name(masterTeamList, "masterTeamList");
function isMasterBigMatch(match) {
  // Mode B sort signal: both teams are followed teams (master list). Global
  // flag used only for ordering; per-user gating happens in the send loop.
  masterTeamList();
  const nset = _masterMemo.normSet;
  return nset.has(normAlias(match.homeTeam.name)) && nset.has(normAlias(match.awayTeam.name));
}
__name(isMasterBigMatch, "isMasterBigMatch");
// ─── Per-user timezone ───
// Chat-level tz stored in user_prefs: { "<chatId>": { teams: [...], tz: "Europe/London" } }.
// Absent = use global env.TEHRAN_TZ (admin panel setting, default Asia/Tehran).
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
  canbera: "Australia/Canberra", // user's typo — accept both
  perth: "Australia/Perth",
  bangkok: "Asia/Bangkok",
  "kuala-lumpur": "Asia/Kuala_Lumpur",
  singapore: "Asia/Singapore",
  "hong-kong": "Asia/Hong_Kong",
  tokyo: "Asia/Tokyo"
};
__name(TZ_ALIASES, "TZ_ALIASES");
function resolveTimeZone(input) {
  const raw = String(input || "").trim().toLowerCase().replace(/\s+/g, "-");
  const candidate = TZ_ALIASES[raw] || raw.replace(/(^|[\/_])[a-z]/g, (m) => m.toUpperCase());
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: candidate }); // throws RangeError on invalid
    return candidate;
  } catch (e) {
    return null;
  }
}
__name(resolveTimeZone, "resolveTimeZone");
function getUserTz(prefs, chatId, env) {
  const p = prefs[String(chatId)];
  return p && typeof p.tz === "string" && p.tz ? p.tz : env.TEHRAN_TZ;
}
__name(getUserTz, "getUserTz");
function groupChatsByTz(chatIds, prefs, env) {
  // [{tz, chats}] — one message per timezone so each user sees local kickoff time
  const map = new Map();
  for (const c of chatIds) {
    const tz = getUserTz(prefs, c, env);
    if (!map.has(tz)) map.set(tz, []);
    map.get(tz).push(c);
  }
  return [...map.entries()].map(([tz, chats]) => ({ tz, chats }));
}
__name(groupChatsByTz, "groupChatsByTz");
__name(masterTeamList, "masterTeamList");
// ─── Reliability: postponed/cancelled alerts, user-cap & stale-cron warnings ───
// Tracks per-pair status (teams+competition, not time, so a postponed match with a
// new kickoff time is still recognised as the same fixture).
async function detectStatusChanges(env, matches) {
  try {
    const prev = (await env.STATE.get(CONFIG.KV_MATCH_STATUS, "json")) || {};
    const cur = {};
    const now = Date.now();
    const alerts = [];
    for (const m of matches) {
      if (!shouldNotify(m)) continue;
      const t = new Date(m.utcDate).getTime();
      if (t < now - 3 * 864e5 || t > now + 10 * 864e5) continue;
      const status = m.status || "SCHEDULED";
      const key = normalizeTeamName(m.homeTeam.name) + "|" + normalizeTeamName(m.awayTeam.name) + "|" + m.competition.code;
      cur[key] = status;
      const old = prev[key];
      if (old && old !== status && (status === "POSTPONED" || status === "CANCELLED") && (old === "SCHEDULED" || old === "TIMED" || old === "POSTPONED")) {
        alerts.push({ m, status });
      }
    }
    await env.STATE.put(CONFIG.KV_MATCH_STATUS, JSON.stringify(cur), { expirationTtl: 14 * 86400 }).catch(() => {});
    if (alerts.length) {
      const chats = await getRegisteredChats(env);
      for (const a of alerts) {
        const teams = escapeMarkdownCharacters(translateTeam(a.m.homeTeam.name)) + " \u{1F19A} " + escapeMarkdownCharacters(translateTeam(a.m.awayTeam.name)) + " (" + translateCompetition(a.m.competition.code) + ")";
        const msg = a.status === "CANCELLED"
          ? "\u274C *\u0628\u0627\u0632\u06CC \u0644\u063A\u0648 \u0634\u062F:* " + teams
          : "\u{1F550} *\u0628\u0627\u0632\u06CC \u0628\u0647 \u062A\u0639\u0648\u06CC\u0642 \u0627\u0641\u062A\u0627\u062F:* " + teams;
        await Promise.allSettled(chats.map((c) => sendTelegram(env, msg, c)));
      }
    }
  } catch (e) {
    console.error("Status change detection failed: " + e.message);
  }
}
__name(detectStatusChanges, "detectStatusChanges");
async function checkUserCap(env, count) {
  // Free-tier subrequest ceiling is ~20-25 users; warn the admin once per level/week.
  try {
    for (const lv of [15, 20, 25]) {
      if (count < lv) continue;
      const key = "cap_warn_" + lv;
      const last = parseInt(await env.STATE.get(key).catch(() => null)) || 0;
      if (Date.now() - last < 7 * 864e5) continue;
      await env.STATE.put(key, String(Date.now())).catch(() => {});
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
__name(getRegisteredChats, "getRegisteredChats");
function isAdminRequest(req, env) {
  // Fail closed: admin auth requires an explicit ADMIN_TOKEN secret — the
  // Telegram BOT_TOKEN must never double as the admin credential.
  // Audit fix 14: timing-safe comparison (was: plain ===).
  if (!env.ADMIN_TOKEN) return false;
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) return false;
  return timingSafeEqualStr(authHeader.slice(7), env.ADMIN_TOKEN);
}
__name(isAdminRequest, "isAdminRequest");
function getAdminCookieToken(req) {
  const m = (req.headers.get("Cookie") || "").match(/(?:^|;\s*)admin_auth=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}
__name(getAdminCookieToken, "getAdminCookieToken");
async function isValidAdminSession(env, req) {
  // Audit fix 8: the cookie carries a random session id (admin_sess_<id> in
  // KV, 12h TTL) — NOT the ADMIN_TOKEN master secret. An XSS or log leak can
  // no longer compromise the admin token itself.
  const sid = getAdminCookieToken(req);
  if (!sid || !/^[a-f0-9]{32,80}$/i.test(sid)) return false;
  const val = await env.STATE.get("admin_sess_" + sid).catch(() => null);
  return !!val;
}
__name(isValidAdminSession, "isValidAdminSession");
async function isAdminAuthed(req, env) {
  return isAdminRequest(req, env) || await isValidAdminSession(env, req);
}
__name(isAdminAuthed, "isAdminAuthed");
function validateWebhook(req, env) {
  // Fail closed: without WEBHOOK_SECRET the webhook rejects every update.
  // Audit fix 14: timing-safe comparison (was: plain ===).
  if (!env.WEBHOOK_SECRET) return false;
  const secretToken = req.headers.get("X-Telegram-Bot-Api-Secret-Token");
  return timingSafeEqualStr(secretToken, env.WEBHOOK_SECRET);
}
__name(validateWebhook, "validateWebhook");
async function getCronStatus(env) {
  // Audit fix 4: consolidated cron status (heartbeat + last_cron in ONE key)
  // with legacy-key fallback so pre/post-upgrade readers stay compatible.
  try {
    const s = await env.STATE.get("cron_status_v1", "json").catch(() => null);
    if (s && s.heartbeat) return s;
  } catch (e) {}
  const hb = parseInt(await env.STATE.get(CONFIG.KV_HEARTBEAT).catch(() => null)) || 0;
  const lc = parseInt(await env.STATE.get(CONFIG.KV_LAST_CRON).catch(() => null)) || 0;
  const src = await env.STATE.get(CONFIG.KV_LAST_SOURCE).catch(() => null);
  return { heartbeat: hb ? String(hb) : "0", last_cron: lc ? String(lc) : "0", api_source: src || null };
}
__name(getCronStatus, "getCronStatus");
async function executeScheduledLogic(env) {
  resetSubrequestBudget(); // audit fix 3: per-invocation subrequest budget
  await applySettings(env);
  const NOW = Date.now();
  const prevStatus = await getCronStatus(env); // audit fix 4: one read for heartbeat + last_cron (was 2 keys)
  console.log(`
\u{1F680} Starting scheduled execution at ${new Date(NOW).toISOString()}`);
  // Catch-up alert: if the previous run was long ago (crash/outage), warn the admin once
  try {
    const lastCron = parseInt(prevStatus.last_cron) || 0;
    const lastStale = parseInt(await env.STATE.get("stale_alert_at").catch(() => null)) || 0;
    if (lastCron && NOW - lastCron > 30 * 6e4 && NOW - lastStale > 12 * 36e5) {
      await env.STATE.put("stale_alert_at", String(NOW)).catch(() => {});
      const gapMin = Math.round((NOW - lastCron) / 6e4);
      const adminChat = parseInt(env.CHAT_ID);
      if (!isNaN(adminChat)) {
        await sendTelegram(env, "\u26A0\uFE0F *\u0631\u0628\u0627\u062A \u0628\u0631\u0627\u06CC " + toFaDigits(String(gapMin)) + " \u062F\u0642\u06CC\u0642\u0647 \u062E\u0627\u0645\u0648\u0634 \u0628\u0648\u062F* \u2014 \u0627\u0639\u0644\u0627\u0646\u200C\u0647\u0627\u06CC \u0622\u0646 \u0628\u0627\u0632\u0647 \u0645\u0645\u06A9\u0646 \u0627\u0633\u062A \u0627\u0632 \u062F\u0633\u062A \u0631\u0641\u062A\u0647 \u0628\u0627\u0634\u0646\u062F. \u0627\u06A9\u0646\u0648\u0646 \u062F\u0648\u0628\u0627\u0631\u0647 \u0641\u0639\u0627\u0644 \u0634\u062F.", adminChat);
      }
    }
  } catch (e) {
    console.error("Stale alert failed: " + e.message);
  }
  // Audit fix 9: ownership-verified lock. KV has no compare-and-set; writing a
  // unique "own:<ts>:<uuid>" value and reading it back narrows the old
  // get-then-put race from the whole pipeline duration (seconds) to the ~ms
  // window between put and get. The losing writer sees a foreign value and
  // skips; legacy timestamp locks are still honored by freshness.
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
    await checkUserCap(env, chatIds.length);
    if (chatIds.length === 0) {
      console.log("\u274C No users, skipping");
      return;
    }
    // v12.9: end-of-week league-tables digest (Monday 01:30–06:00 Tehran, once
    // per ISO week). Runs BEFORE the fixture sweep so an upstream API outage
    // can't swallow it; the sweep defers safely if the digest ate subrequest
    // budget (its dedupe locks are only set on success).
    try {
      const wt = await maybeSendWeeklyTables(env, chatIds);
      if (wt) console.log(`\u{1F4CA} Weekly tables digest: leagues=${wt.leagues.filter((l) => l.ok).length} sent=${wt.sent} failed=${wt.failed}`);
    } catch (e) {
      console.error("Weekly tables digest failed: " + e.message);
    }
    console.log("\n\u{1F4E1} Fetching matches from API...");
    const matches = await fetchMatchesFromAPI(env);
    console.log(`\u{1F4CA} Total matches received: ${matches.length}`);
    await detectStatusChanges(env, matches);
    const worthyMatches = matches.filter(shouldNotify);
    console.log(`\u{1F3AF} Matches meeting notification criteria: ${worthyMatches.length}`);
    const now = new Date();
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
    // Audit fix 4: ONE consolidated status write (heartbeat + last_cron) with
    // legacy-key fallback — and no lock delete (the 240s TTL expires it long
    // before the next 10-min cron; the delete cost 144 writes/day).
    try {
      await env.STATE.put("cron_status_v1", JSON.stringify({
        heartbeat: String(NOW),
        last_cron: String(NOW)
      }));
    } catch (e) {
      await env.STATE.put(CONFIG.KV_HEARTBEAT, NOW.toString()).catch(() => {});
      await env.STATE.put(CONFIG.KV_LAST_CRON, NOW.toString()).catch(() => {});
    }
    console.log(`
\u2705 Execution completed at ${(/* @__PURE__ */ new Date()).toISOString()}`);
  } catch (error) {
    console.error(`\u274C Fatal error in scheduled logic:`, error);
    throw error;
  }
}
__name(executeScheduledLogic, "executeScheduledLogic");
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
// Security headers for the HTML pages (pages use inline scripts, so CSP allows
// 'unsafe-inline'; the admin token is only ever exposed via the HttpOnly cookie).
const PAGE_SEC_HEADERS = {
  "content-type": "text/html; charset=utf-8",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "referrer-policy": "no-referrer",
  "content-security-policy": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; img-src 'self' data: https:; font-src 'self' https://cdn.jsdelivr.net; connect-src 'self'; frame-ancestors 'none'"
};
__name(jsonResponse, "jsonResponse");
async function getSettings(env) {
  const defaults = {
    timezone: env.TEHRAN_TZ || "Asia/Tehran",
    teams: CONFIG.BIG_TEAMS_BY_LEAGUE,
    leagues: CONFIG.LEAGUES
  };
  try {
    const saved = await env.STATE.get(CONFIG.KV_SETTINGS_KEY, "json");
    if (!saved || !saved.timezone) return defaults;
    // Deep-merge teams per league: saved lists win, but leagues added in new
    // code defaults (e.g. EL/ECL) survive settings saved by older versions.
    const teams = {};
    for (const [lg, list] of Object.entries(defaults.teams)) teams[lg] = saved.teams && Array.isArray(saved.teams[lg]) ? saved.teams[lg] : list;
    // Leagues merge the same way: a league added in new code defaults (e.g.
    // BL1/Bundesliga) must survive settings saved by older versions, or it
    // silently drops out of fetching and notifying.
    const leagues = [...new Set([...(Array.isArray(defaults.leagues) ? defaults.leagues : []), ...(Array.isArray(saved.leagues) ? saved.leagues : [])])];
    // v12.15: uniform club names + UCL auto-selection on every read (cron,
    // admin panel, public page) — a stale saved list can never re-introduce
    // a variant duplicate, and the CL box always mirrors every selected
    // club. Catalog read is KV-only (no subrequests): /api/clubs keeps it
    // fresh; a missing catalog degrades to raw names (normAlias dedupe
    // still applies).
    let cat = null;
    try { cat = await env.STATE.get(CONFIG.KV_CLUBS_CATALOG, "json"); } catch (e) { cat = null; }
    return { ...defaults, ...saved, teams: syncUclSelection(canonicalizeTeams(teams, cat)), leagues };
  } catch (e) {
    console.error("Settings read failed: " + e.message);
    return defaults;
  }
}
__name(getSettings, "getSettings");
async function applySettings(env) {
  const s = await getSettings(env);
  env.TEHRAN_TZ = s.timezone;
  CONFIG.BIG_TEAMS_BY_LEAGUE = s.teams;
  CONFIG.LEAGUES = s.leagues;
  return s;
}
__name(applySettings, "applySettings");
function sanitizeSettings(body) {
  const s = { timezone: "Asia/Tehran", teams: {}, leagues: [] };
  if (typeof body.timezone === "string" && body.timezone.trim()) s.timezone = body.timezone.trim();
  if (Array.isArray(body.leagues)) {
    s.leagues = body.leagues
      .map((x) => String(x).trim().toUpperCase())
      .filter((x) => x && CONFIG.KNOWN_LEAGUE_CODES.includes(x));
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
// ── v12.15 UNIFORM CLUB NAMES + UCL AUTO-SELECTION ───────────────────────────
// Two rules, applied wherever settings enter the system (GET read path +
// PUT save path), so every league list carries ONE exact provider name per
// club:
//   1) canonicalizeTeams(teams, cat) — folds stored name variants ("Bayern
//      Munich" / "FC Bayern M\u00FCnchen", "Inter Milan" / "FC Internazionale
//      Milano", "Paris Saint-Germain" / "Paris Saint-Germain FC") onto the
//      EXACT catalog name and dedupes within each league list by normAlias()
//      key. A name that matches nothing in the catalog is kept verbatim —
//      the free-typed fallback still works.
//   2) syncUclSelection(teams) — every club selected in ANY league box is
//      also selected for the Champions League box (the user's rule: "I want
//      to see their matches in the UCL tournament"). teams.CL = CL-explicit
//      \u222a all-other-leagues, so a club removed from every league box
//      drops out of UCL too, while a UCL-only pick survives.
function catalogNameMap(cat) {
  const map = /* @__PURE__ */ new Map();
  const clubs = (cat && Array.isArray(cat.clubs) && cat.clubs) || [];
  for (const c of clubs) {
    const k = normAlias(String(c.n || ""));
    if (k && !map.has(k)) map.set(k, c.n);
  }
  // Short names ("Inter", "PSG", "Atleti") map onto the SAME legal name —
  // second pass only for keys no full name claimed, so a full name always
  // wins a collision.
  for (const c of clubs) {
    const s = String(c.s || "").trim();
    if (!s) continue;
    const k = normAlias(s);
    if (k && !map.has(k)) map.set(k, c.n);
  }
  return map;
}
__name(catalogNameMap, "catalogNameMap");
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
// ── v12.14 CLUB-NAME AUTOCOMPLETE ───────────────────────────────────────────
// The admin panel's "add club" inputs used to accept ANY text, so a name
// variant ("Roma" vs football-data's "AS Roma", "Inter Milan" vs "FC
// Internazionale Milano") could silently never match a fixture side. The
// catalog pre-downloads the club roster of every covered competition from the
// SAME providers the matcher reads (football-data /competitions/{code}/teams,
// sportscore standings for the A-League, which fd does not serve), caches it
// in KV, and /api/clubs answers prefix queries so the panel can offer the
// EXACT provider name BEFORE the team is stored.
var FD_TEAMS_CODES = ["CL", "PL", "PD", "SA", "FL1", "BL1"];
async function fetchFdTeams(env, code) {
  if (++SUBREQUEST_COUNT > SUBREQUEST_CAP) return null; // audit fix 3
  try {
    const res = await fetch("https://api.football-data.org/v4/competitions/" + code + "/teams", {
      headers: { "X-Auth-Token": env.API_TOKEN }
    });
    if (!res.ok) {
      console.log("clubs catalog " + code + ": HTTP " + res.status + " (skipped)");
      return null;
    }
    const data = await res.json();
    return (data && Array.isArray(data.teams) && data.teams) || null;
  } catch (e) {
    console.log("clubs catalog " + code + " failed: " + e.message);
    return null;
  }
}
__name(fetchFdTeams, "fetchFdTeams");
async function fetchAlTeams() {
  // A-League is sportscore-only (fd free tier does not serve it); the
  // standings rows carry the exact team names the AL matcher compares.
  try {
    const data = await fetchJSON("https://sportscore.com/api/v1/standings/?sport=football&competition=" + SPORTSCORE_SLUGS.AL);
    const rows = (data && data.tables && data.tables[0] && data.tables[0].rows) || [];
    return rows.map((r) => ({ name: r.team, shortName: "", tla: "", crest: "" }));
  } catch (e) {
    console.log("clubs catalog AL failed: " + e.message);
    return null;
  }
}
__name(fetchAlTeams, "fetchAlTeams");
async function refreshClubsCatalog(env) {
  const byKey = /* @__PURE__ */ new Map();
  const addTeam = (t, league) => {
    const name = String(t && t.name || "").trim();
    if (!name || name.length > 40) return;
    const k = normalizeTeamName(name);
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
  };
  // Sequential on purpose: the fd free tier allows 10 req/min and this sweep
  // is at most 6 authed GETs + 1 sportscore call. Failure-tolerant per code —
  // a 400/429 on one competition never blanks the whole catalog.
  // Scope = leagues ∪ teams-config keys: the admin panel's boxes render from
  // that union (renderTeams), and the live settings keep AL only in teams
  // (AL fixtures aren't fetched — standings only), so testing CONFIG.LEAGUES
  // alone silently dropped every A-League club from the suggestions.
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
  const cat = { fetchedAt: new Date().toISOString(), count: clubs.length, clubs };
  if (clubs.length) {
    await env.STATE.put(CONFIG.KV_CLUBS_CATALOG, JSON.stringify(cat)).catch((e) => console.error("clubs catalog write failed: " + e.message));
  }
  console.log(`\u{1F3E2} Clubs catalog: ${clubs.length} clubs from ${wanted.join(",")}`);
  return cat;
}
__name(refreshClubsCatalog, "refreshClubsCatalog");
async function getClubsCatalog(env, force) {
  let cat = null;
  try {
    cat = await env.STATE.get(CONFIG.KV_CLUBS_CATALOG, "json");
  } catch (e) { /* fall through to refresh */ }
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
function clubsSearch(cat, q, hint) {
  // Keep the query AS TYPED (only case/diacritics/punctuation fold) — the
  // token-stripping normalizer is for identity matching, not search: "as
  // roma" must prefix-match "AS Roma", not collapse to "roma".
  const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
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
    // The league box the admin is typing in gets a gentle priority bump (a
    // "Ro" typed under Serie A should offer Roma before Rotterdam), but other
    // leagues still show — big clubs live in several competitions.
    if (hint && c.l && c.l.includes(hint)) score += 0.6;
    scored.push({ score, item: c });
  }
  scored.sort((a, b) => b.score - a.score || a.item.n.localeCompare(b.item.n));
  return scored.slice(0, 8).map((x) => ({ name: x.item.n, short: x.item.s, tla: x.item.t, leagues: x.item.l, crest: x.item.c }));
}
__name(clubsSearch, "clubsSearch");
function dummyForType(type) {
  const now = Date.now();
  const H = 3600e3;
  const M = 60e3;
  const offsets = {
    "pre-match-24h": 23 * H, // 24h window (20–24h before)
    "pre-match-3h": 3 * H, // 3h window (2.5–3.5h before)
    "pre-match-1h": 1 * H, // 1h window (0.75–1.5h before)
    "match-start": 5 * M, // match-start window (−5..+45min)
    "result": -1 * H // result (≤6h after)
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
function buildDummyMatches() {
  const base = ["pre-match-24h", "pre-match-3h", "pre-match-1h", "match-start", "result"].map(dummyForType);
  // Accuracy probes: a followed team vs unknown opponent MUST fire (either/or logic),
  // a match with no followed team MUST stay silent. Counts in the sim response reveal
  // if selection regresses: probe-mixed adds +1 to pre-match-1h, probe-none adds 0.
  base.push({ ...dummyForType("pre-match-1h"), id: "sim-probe-mixed", homeTeam: { name: "Arsenal FC" }, awayTeam: { name: "Brentford FC" } });
  base.push({ ...dummyForType("pre-match-3h"), id: "sim-probe-none", homeTeam: { name: "Bournemouth FC" }, awayTeam: { name: "Wolves FC" } });
  // EL/ECL probe: followed team in Europa League must fire (either-team rule, EL list)
  base.push({ ...dummyForType("pre-match-1h"), id: "sim-probe-el", competition: { code: "EL" }, homeTeam: { name: "Manchester United FC" }, awayTeam: { name: "FCSB" } });
  // ECL probe: followed team in Conference League must fire (ECL list in settings)
  base.push({ ...dummyForType("pre-match-1h"), id: "sim-probe-ecl", competition: { code: "ECL" }, homeTeam: { name: "Chelsea FC" }, awayTeam: { name: "Panathinaikos FC" } });
  // EL 24h probe: Europa League fixture inside the 24h window must fire (not
  // just the 1h/3h windows) — validates near-window EL coverage end-to-end.
  base.push({ ...dummyForType("pre-match-24h"), id: "sim-probe-el-24h", utcDate: new Date(Date.now() + 23 * 3600e3).toISOString(), competition: { code: "EL" }, homeTeam: { name: "Manchester United FC" }, awayTeam: { name: "AS Roma" } });
  // Knockout probe: CL quarter-final must fire and the result message must mention the elimination phase
  base.push({ ...dummyForType("result"), id: "sim-probe-knockout", competition: { code: "CL" }, stage: "QUARTER_FINALS", homeTeam: { name: "Arsenal FC" }, awayTeam: { name: "Real Madrid CF" } });
  // Cup probe: followed teams in a domestic cup (Chelsea vs Liverpool in FA Cup R16)
  // must fire — validates DOMESTIC_CUP_IDS wiring end-to-end.
  base.push({ ...dummyForType("pre-match-1h"), id: "sim-probe-cup", competition: { code: "FA_CUP" }, stage: "ROUND_OF_16", homeTeam: { name: "Chelsea FC" }, awayTeam: { name: "Liverpool FC" } });
  // Backfill probes: a match at 10h (missed the 24h window, in 24h backfill zone)
  // and at 2h (missed the 3h window, in 3h backfill zone) MUST each fire exactly
  // ONE late notification. Counts reveal if window recovery regresses.
  base.push({ ...dummyForType("pre-match-24h"), id: "sim-probe-backfill-24h", utcDate: new Date(Date.now() + 10 * 3600e3).toISOString() });
  base.push({ ...dummyForType("pre-match-3h"), id: "sim-probe-backfill-3h", utcDate: new Date(Date.now() + 2 * 3600e3).toISOString() });
  // Mode B probes: two followed teams meeting (Arsenal vs Liverpool, 71h out)
  // MUST fire the 72h big-match heads-up (+1 to pre-match-72h); a fixture of
  // two unfollowed teams at the same offset MUST stay silent (adds 0).
  base.push({ ...dummyForType("pre-match-1h"), id: "sim-probe-bigmatch", utcDate: new Date(Date.now() + 71 * 3600e3).toISOString(), homeTeam: { name: "Arsenal FC" }, awayTeam: { name: "Liverpool FC" } });
  base.push({ ...dummyForType("pre-match-1h"), id: "sim-probe-bigmatch-none", utcDate: new Date(Date.now() + 71 * 3600e3).toISOString(), homeTeam: { name: "Luton Town FC" }, awayTeam: { name: "Rotherham United FC" } });
  return base;
}
__name(buildDummyMatches, "buildDummyMatches");
// Public site data: next 5 upcoming + recent finished matches of followed teams,
// with club crests (football-data provides them; fallback providers have none).
// Cached 3 min in KV so page views don't hammer provider rate limits (fd: 10 req/min).
function pubMatch(m) {
  return {
    id: m.id || null,
    homeTeam: { name: m.homeTeam.name, faName: translateTeam(m.homeTeam.name), crest: m.homeTeam.crest || null },
    awayTeam: { name: m.awayTeam.name, faName: translateTeam(m.awayTeam.name), crest: m.awayTeam.crest || null },
    utcDate: m.utcDate,
    competition: { code: m.competition.code, faName: translateCompetition(m.competition.code), emblem: (m.competition.emblem) || LEAGUE_LOGOS[m.competition.code] || null },
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
function isLiveStatus(status) {
  const s = String(status || "").toUpperCase();
  return s === "LIVE" || s === "IN_PLAY" || s === "PAUSED";
}
__name(isLiveStatus, "isLiveStatus");
// Live-match enrichment: football-data detail endpoint gives the exact minute
// and goal scorers — the page badge needs them. Only for LIVE matches (rare),
// cached 90s in KV so the 1-minute page refresh doesn't hammer the API.
async function enrichLiveMatches(env, matches) {
  const live = matches.filter((m) => isLiveStatus(m.status) && /^\d+$/.test(String(m.id)));
  for (const m of live.slice(0, 4)) {
    try {
      const key = CONFIG.KV_LIVE_DETAIL + m.id;
      const cached = await env.STATE.get(key, "json").catch(() => null);
      if (cached) { applyLiveDetail(m, cached); continue; }
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
      await env.STATE.put(key, JSON.stringify(detail), { expirationTtl: 90 }).catch(() => {});
      applyLiveDetail(m, detail);
    } catch (e) {
      console.error("Live detail fail for " + m.id + ": " + e.message);
    }
    await new Promise((r) => setTimeout(r, 1400));
  }
  return matches;
}
__name(enrichLiveMatches, "enrichLiveMatches");
function applyLiveDetail(m, detail) {
  if (detail.minute != null) m.minute = detail.minute;
  if (detail.scorers) m.scorers = detail.scorers;
  if (detail.scoreFullTime) m.score = { fullTime: detail.scoreFullTime };
}
__name(applyLiveDetail, "applyLiveDetail");
// ponytail: pre-draw countdown target — the UCL league phase always begins
// mid-September; once the draw publishes real fixtures the client prefers
// d.matches[0] and this projection is never shown.
function projectedUclStart() {
  const now = new Date();
  const y = now.getUTCMonth() >= 9 ? now.getUTCFullYear() + 1 : now.getUTCFullYear();
  return new Date(Date.UTC(y, 8, 15, 19, 0, 0));
}
async function fetchPublicMatches(env, req) {
  const cached = await env.STATE.get(CONFIG.KV_PUBLIC_MATCHES, "json").catch(() => null);
  if (cached && cached.ts && Date.now() - cached.ts < 18e4) return cached.data;
  await applySettings(env);
  // Audit fixes 6+13 (the live error-1101 outage): single-flight refresh lock
  // + per-IP courtesy limit + stale-serve. The old code let EVERY cache-expired
  // request launch a full provider sweep; concurrent sweeps burned the
  // 50-subrequest cap and the route 500'd ("error code: 1101") for ~55s.
  const lockVal = parseInt(await env.STATE.get("pub_refresh_lock").catch(() => null)) || 0;
  const lockFresh = !!(lockVal && Date.now() - lockVal < 45e3);
  if (lockFresh && cached && cached.data) return cached.data; // one sweeper at a time; the rest serve stale
  const ip = (req && req.headers && req.headers.get("CF-Connecting-IP")) || "";
  const rlKey = ip ? "pub_rl_" + ip.replace(/[^0-9a-fA-F:.]/g, "") : null;
  if (rlKey) {
    const rl = await env.STATE.get(rlKey).catch(() => null);
    if (rl && cached && cached.data) return cached.data; // this IP refreshed <60s ago
  }
  // Same pool as the bot: read the notified KV cache first (the cron fills it
  // every 10 min), then fall back to the long view — UI and bot can never
  // diverge because both consume matches_v13_tracked.
  let matches = null;
  // Always refresh from the wide long view when stale (fetchLongView self-caches
  // 6h in the same KV pool). The near 8-day cron pool would cap the page at
  // DAYS_IN_FUTURE and hide big matches beyond the month — nextBig needs 3 months.
  // Audit fix 6: a failing sweep now degrades to stale/cached data instead of
  // throwing (which produced the live public-page 500s).
  try {
    if (!lockFresh) {
      await env.STATE.put("pub_refresh_lock", String(Date.now()), { expirationTtl: 45 }).catch(() => {});
    }
    if (rlKey) {
      await env.STATE.put(rlKey, String(Date.now()), { expirationTtl: 60 }).catch(() => {});
    }
    matches = await fetchLongView(env);
    await enrichLiveMatches(env, matches);
  } catch (e) {
    console.error("Public provider sweep failed (serving stale): " + e.message);
    if (cached && cached.data) return cached.data;
    matches = await getCachedMatches(env);
  }
  const now = Date.now();
  // Standings (compact top-8) for the domestic leagues — each KV-cached 10 min.
  // Fetched BEFORE the schedule is selected because the top-of-the-table
  // filter needs the current top 3. football-data's free tier (10 req/min) is
  // mostly spent by the fixture sweep, so at most 2 FD tables refresh per
  // invocation via a clock-derived time-sliced rotation (no extra KV write);
  // the sportscore-backed codes (AL/PGL) may always refresh. Failed refreshes
  // serve the last good table (fetchStandings stale-serve). FL1 joins the
  // site's league tables with this release.
  // v12.12: A-League (AL) is REMOVED from the site's league tables (the
  // user's ask) — five European leagues + PGL remain in the grid. AL stays in
  // the notify config and the weekly Telegram digest (settings-driven).
  const standCodes = ["PL", "PD", "SA", "BL1", "FL1"];
  const FD_STAND_ROTATION = ["PL", "PD", "SA", "BL1", "FL1", "CL"];
  const fdSlot = Math.floor(Date.now() / 6e5) % 3;
  const fdAllowed = new Set(FD_STAND_ROTATION.slice(fdSlot * 2, fdSlot * 2 + 2));
  const compact = (st) => (st && st.teams.length ? {
    started: st.started !== false,
    teams: st.teams.slice(0, 8).map((t) => ({ pos: t.pos, name: t.name, faName: translateTeam(t.name), points: t.points }))
  } : null);
  const stMap = {};
  await Promise.all(standCodes.concat(["CL", "PGL"]).map((c) => fetchStandings(env, c, c === "PGL" || fdAllowed.has(c)).catch(() => null).then((v) => { stMap[c] = v || null; })));
  const stPL = stMap.PL, stPD = stMap.PD, stSA = stMap.SA, stBL = stMap.BL1, stFL = stMap.FL1, stCL = stMap.CL, stPGL = stMap.PGL;
  // ── Top-of-the-table competition (future-plan ask, v12.2 semantics) ──
  // The top three of each country's current league join the schedule even
  // when neither club is a selected team — e.g. Newcastle outside the PL
  // selection but 3rd in the table: their fixtures are included. Only
  // domestic league tables count; unstarted (pre-season) tables are ignored.
  // Team names are normalized through a local memo (normCache) so the
  // per-sweep CPU cost stays flat regardless of pool size.
  // v12.2 fix (badge flood): v12.1 badged ANY fixture involving a top-3 side —
  // with 6 leagues × 3 sides that stamped "🔥 صدر جدول" on virtually every
  // card and buried the big view. The two concepts are now split: top-3
  // sides' fixtures still JOIN the schedule (inclusion), but the badge, the
  // "🔥 رقابت‌های صدر جدول" section and the big-view filter are reserved for
  // genuine top-of-the-table clashes — BOTH sides inside the top 3.
  const normCache = new Map();
  const norm = (name) => {
    let v = normCache.get(name);
    if (v === undefined) { v = normalizeTeamName(name); normCache.set(name, v); }
    return v;
  };
  const top3 = {};
  for (const c of standCodes) {
    const st = stMap[c];
    if (st && st.started !== false && Array.isArray(st.teams)) {
      top3[c] = new Set(st.teams.slice(0, 3).map((t) => norm(t.name)));
    }
  }
  const isTopTeamInvolved = (m) => {
    const set = top3[m.competition.code];
    if (!set) return false;
    return set.has(norm(m.homeTeam.name)) || set.has(norm(m.awayTeam.name));
  };
  const isTopTable = (m) => {
    const set = top3[m.competition.code];
    if (!set) return false;
    return set.has(norm(m.homeTeam.name)) && set.has(norm(m.awayTeam.name));
  };
  // v12.8 fallback tier (user's rule): a selected team against a TOP-5 side of
  // that league — "if Tottenham is not selected but in the top 5 and Chelsea
  // plays it, that match matters". A routine selected-team fixture against a
  // mid-table side (e.g. Liverpool–Fulham) does NOT qualify for the big box.
  const top5 = {};
  for (const c of standCodes) {
    const st = stMap[c];
    if (st && st.started !== false && Array.isArray(st.teams)) {
      top5[c] = new Set(st.teams.slice(0, 5).map((t) => norm(t.name)));
    }
  }
  const isSelName = (name) => {
    masterTeamList();
    return _masterMemo.normSet.has(normAlias(name));
  };
  const isSelVsTop5 = (m) => {
    const set = top5[m.competition.code];
    if (!set) return false;
    const selHome = isSelName(m.homeTeam.name);
    const selAway = isSelName(m.awayTeam.name);
    if (!selHome && !selAway) return false;
    return (selHome && set.has(norm(m.awayTeam.name))) || (selAway && set.has(norm(m.homeTeam.name)));
  };
  const withTop = (m) => {
    const p = pubMatch(m);
    p.top = isTopTable(m);
    // v12.3: selected-vs-selected league clash → TOP BOX material (drives the
    // section ordering + the big-view filter; the headline fixture itself is
    // lifted into the top box payload below).
    p.clash = isMasterClash(m);
    // v12.5: ≥1 selected team ("big for THIS user", the v12.4 box rule) — lets
    // notified results survive the big-only view of the finished card without
    // changing which UPCOMING matches the big view shows.
    p.sel = hasSelectedTeam(m);
    return p;
  };
  // Big view: "from now until the end of the current month" — dynamic EOM cutoff.
  const eom = new Date(now); eom.setMonth(eom.getMonth() + 1, 0); eom.setHours(23, 59, 59, 999);
  const liveRank = (m) => (isLiveStatus(m.status) ? 0 : 1);
  const select = (pool) => ({
    upcoming: pool
      .filter((m) => (shouldNotify(m) || isTopTeamInvolved(m)) && m.status !== "FINISHED" && (isLiveStatus(m.status) || new Date(m.utcDate).getTime() > now) && new Date(m.utcDate).getTime() <= eom.getTime())
      .sort((a, b) => liveRank(a) - liveRank(b) || new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime())
      .slice(0, 50),
    // v12.5: "نتایج اخیر" must carry the whole week — the old 12-hour window
    // emptied the card every morning after a matchday, so this week's CL
    // results (the exact ones the bot notified on Telegram) never showed.
    // 7 days covers the weekend league round + midweek continental rounds;
    // newest first.
    finished: pool
      .filter((m) => (shouldNotify(m) || isTopTeamInvolved(m)) && m.status === "FINISHED" && now - new Date(m.utcDate).getTime() < 7 * 864e5)
      .sort((a, b) => new Date(b.utcDate).getTime() - new Date(a.utcDate).getTime())
      .slice(0, 12)
  });
  let { upcoming, finished } = select(matches);
  // ── v12.3/v12.4/v12.7/v12.8 TOP BOX: the big-matches card above the games list ──
  // v12.3 rule: when two selected teams meet in a domestic league (e.g. the
  // Manchester derby), that fixture headlines the page in the TOP BOX instead
  // of sitting mid-list in kickoff order. The box fixtures are excluded
  // from the upcoming list (the box IS their presentation); clashes beyond
  // the box stay in the list, flagged m.clash and sorted to the top of their
  // section client-side. 90-day horizon; live matches win.
  // v12.4 proximity refinement (mirrors the CL BOX rule): while the
  // selected-vs-selected clash is FAR away — weeks or months; league derbies
  // can be a season apart — the earliest domestic fixture with AT LEAST ONE
  // selected team leads the card, so it never becomes a weeks-long countdown
  // to a distant derby. The clash keeps the lead while it is near (≤ 7 days —
  // its matchweek) or live.
  // v12.8 (user's rules — "what is called a big match"): the box holds ONLY
  // true big matches —
  //   A: two SELECTED teams meet (isMasterClash);
  //   B: a top-of-the-table clash — both sides in the current top 3;
  //   C: a derby (curated DERBY_PAIRS);
  //   fallback when A/B/C don't fill the box: a selected team against a
  //   TOP-5 side of that league (isSelVsTop5). A routine selected-team
  //   fixture against a mid-table side (e.g. Liverpool–Fulham) has NO place
  //   in the box anymore; featured-only pairings no longer box either.
  // v12.12: capacity raised — the box presents up to TEN matches, and the
  // hero card's slot 1 (the countdown's own match) sits on top of it, so the
  // server picks up to ELEVEN (the user's ask). Selection: A/B/C fill the
  // slots first (closest by kickoff), the
  // fallback tops up whatever is left. Display order is STRICTLY kickoff
  // order — a live match (kickoff in the past) leads, then the closest
  // upcoming on top — and the page's countdown bar (bigbar) tracks slot 1,
  // so the countdown always belongs to the closest big match on top.
  const BOX_NEAR_MS = 7 * 864e5;
  const lgPool = matches
    .filter((m) => m.status !== "FINISHED" && isDomesticLeagueCode(m.competition.code) && (isLiveStatus(m.status) || (new Date(m.utcDate).getTime() > now && new Date(m.utcDate).getTime() <= now + 90 * 864e5)))
    .sort((a, b) => liveRank(a) - liveRank(b) || new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime());
  const bigLgOf = (m) => isMasterClash(m) || isDerby(m) || isTopTable(m);
  const byKick = (a, b) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime();
  const lgBig = lgPool.filter((m) => bigLgOf(m)).sort(byKick);
  const lgRest = lgPool.filter((m) => !bigLgOf(m) && isSelVsTop5(m)).sort(byKick);
  const topSpotPicked = [];
  const topSpotKeys = new Set();
  const addBox = (m) => {
    const k = String(m.id || "") + "|" + m.utcDate;
    if (topSpotKeys.has(k) || topSpotPicked.length >= 11) return;
    topSpotKeys.add(k);
    topSpotPicked.push(m);
  };
  lgBig.slice(0, 11).forEach(addBox);
  lgRest.forEach(addBox);
  const topSpotList = topSpotPicked.sort(byKick);
  const topSpotNext = topSpotList[0] || null;
  // nextBig: nearest featured match with NO end-of-month cutoff (may be months
  // away). v12.3: a selected-vs-selected pairing counts as featured here too —
  // it is the user's own definition of a big match.
  const featured = matches
    .filter((m) => m.status !== "FINISHED" && (isFeaturedMatch(m) || isMasterPair(m)) && (isLiveStatus(m.status) || new Date(m.utcDate).getTime() > Date.now()))
    .sort((a, b) => (isLiveStatus(a.status) ? 0 : 1) - (isLiveStatus(b.status) ? 0 : 1) || new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime());
  const nextBig = featured.length ? pubMatch(featured[0]) : null;
  const standings = {};
  standCodes.forEach((c) => {
    standings[c] = Object.assign({ code: c, name: COMP_EN[c] || c, faName: translateCompetition(c), emblem: LEAGUE_LOGOS[c] || null }, compact(stMap[c]));
  });
  // v12.5: the Iran card is retired — the PGL table now lives among the other
  // league tables (the user's ask). Same compact top-8 shape, same KV-backed
  // sportscore standings source; PGL stays out of standCodes so the top-3
  // badge semantics (domestic leagues only) are untouched.
  standings.PGL = Object.assign({ code: "PGL", name: COMP_EN.PGL || "Persian Gulf Pro League", faName: translateCompetition("PGL"), emblem: LEAGUE_LOGOS.PGL || null }, compact(stPGL));
  // Tournaments: UEFA tiers (gold UCL / silver UEL / bronze UECL per UEFA hierarchy)
  // + gold international cups (only while in process) + per-country domestic cups.
  // Next fixture per cup (no end-of-month cutoff), live first.
  const tierOf = (code) => (CONFIG.INTL_COMPETITIONS[code] ? "gold" : code === "CL" ? "gold" : code === "EL" ? "silver" : code === "ECL" ? "bronze" : "domestic");
  const countryOf = (code) => ({ "FA_CUP": "EN", "EFL_CUP": "EN", "CDR": "ES", "COPPA_ITALIA": "IT", "HAZFI_CUP": "IR" }[code] || null);
  // v12.6: HAZFI_CUP joins the cup boxes — the user asked for جام حذفی ایران
  // inside the جام‌های حذفی card (an 🇮🇷 group, like EN/ES/IT). Display-only:
  // not in DOMESTIC_CUP_IDS, so Hazfi matches never notify and never join the
  // upcoming/finished lists — they surface only through this box's `next`.
  const cupOrder = ["EL", "ECL", ...Object.keys(CONFIG.INTL_COMPETITIONS), "FA_CUP", "EFL_CUP", "CDR", "COPPA_ITALIA", "HAZFI_CUP"];
  // Cup phase windows (from CONFIG — sportscore exposes no round field on the
// fixture list, so we classify cup phase by calendar).
const EURO_LL_START = +new Date(CONFIG.CUP_PHASE_WINDOWS.EURO_LL_START);
const FA_ROUND1 = +new Date(CONFIG.CUP_PHASE_WINDOWS.FA_ROUND1);
const cupsRaw = cupOrder.map((code) => {
    // Cup honesty (correctness pass): don't surface amateur qualifying-round
    // ties as if they were the competition — FA Cup pre-Round-1 is excluded,
    // and EL/ECL pre-league-phase ties are labelled "Qualifying".
    const next = matches
      .filter((m) => {
        if (m.competition.code !== code) return false;
        if (m.status === "FINISHED") return false;
        if (!(isLiveStatus(m.status) || new Date(m.utcDate).getTime() > Date.now())) return false;
        if (code === "FA_CUP" && new Date(m.utcDate).getTime() < FA_ROUND1) return false;
        return true;
      })
      .sort((a, b) => (isLiveStatus(a.status) ? 0 : 1) - (isLiveStatus(b.status) ? 0 : 1) || new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime())[0];
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
  // International cups are hidden unless in process (a fixture is on the horizon).
  const cups = cupsRaw.filter((c) => !(CONFIG.INTL_COMPETITIONS[c.code] && !c.next));
  // v12.5: the dedicated Iran card (PGL table + Hazfi box) is gone — the PGL
  // table moved into the standings grid above; the Hazfi box was retired with
  // the card (no fixtures announced, nothing to show).
  // Dedicated UCL section: every upcoming CL fixture (all UCL matches matter)
  // + the FULL league table (all 36 teams, not the compact top-8 used for
  // domestic leagues).
  const clMatches = matches
    .filter((m) => m.competition.code === "CL" && m.status !== "FINISHED" && (isLiveStatus(m.status) || (new Date(m.utcDate).getTime() > Date.now() && new Date(m.utcDate).getTime() <= Date.now() + 90 * 864e5)))
    .sort((a, b) => (isLiveStatus(a.status) ? 0 : 1) - (isLiveStatus(b.status) ? 0 : 1) || new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime())
    .slice(0, 16);
  // v12.12 (the user's ask): the UCL box is GENERALIZED — up to EIGHT
  // upcoming CL fixtures in strict kickoff order (live first), spanning
  // nights ("two important today, two important tomorrow"), and ONLY
  // matches where AT LEAST ONE side is a SELECTED club — a both-unselected
  // pairing (e.g. Sabah FK 🆚 SK Slavia Praha) is noise and never boxes.
  // The old single-headline nbig pick chain (live master > live selected >
  // … > plain fallback) is retired — the box itself carries every important
  // fixture. The 16-fixture pool above feeds the filter; the uclcard below
  // is standings-only now (its old all-fixtures list was the noise source).
  const clBox = clMatches.filter((m) => hasSelectedTeam(m)).slice(0, 8);
  const uclStarted = stCL ? stCL.started !== false : true;
  const ucl = {
    emblem: LEAGUE_LOGOS.CL || null,
    matchday: stCL ? stCL.matchday : null,
    started: uclStarted,
    // Pre-draw: count down to the projected league-phase kickoff instead of
    // showing nothing; real first fixture wins the moment it exists.
    firstStart: (!uclStarted && !clMatches.length) ? projectedUclStart().toISOString() : null,
    teams: stCL ? stCL.teams.map((t) => ({ pos: t.pos, name: t.name, faName: translateTeam(t.name), points: t.points })) : null,
    matches: clBox.map(pubMatch)
  };
  const data = { upcoming: upcoming.filter((m) => !topSpotKeys.has(String(m.id || "") + "|" + m.utcDate)).map(withTop), finished: finished.map(withTop), nextBig, topSpot: { next: topSpotNext ? withTop(topSpotNext) : null, matches: topSpotList.map(withTop) }, standings, cups, ucl, fetchedAt: new Date().toISOString() };
  if (upcoming.length || finished.length) {
    await env.STATE.put(CONFIG.KV_PUBLIC_MATCHES, JSON.stringify({ ts: Date.now(), data }), { expirationTtl: 300 }).catch(() => {});
  } else {
    // Audit fix 13: empty-but-valid result — back off for a minute instead of
    // re-sweeping providers on every page hit during quiet fixture windows.
    await env.STATE.put(CONFIG.KV_PUBLIC_MATCHES, JSON.stringify({ ts: Date.now(), data }), { expirationTtl: 60 }).catch(() => {});
  }
  return data;
}
__name(fetchPublicMatches, "fetchPublicMatches");
var PUBLIC_PAGE = `<!doctype html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<script>try{var t=localStorage.getItem("ucl_theme")||(matchMedia("(prefers-color-scheme:light)").matches?"light":"dark"),l=localStorage.getItem("ucl_lang")||"fa",d=document.documentElement;d.setAttribute("data-theme",t);d.setAttribute("lang",l);d.setAttribute("dir",l==="en"?"ltr":"rtl");}catch(e){}</script>
<title data-i="title">مسابقات پیشرو — اعلان‌دهنده مسابقات</title>
<style>@font-face{font-family:Vazirmatn;src:url('/fonts/Vazirmatn-Regular.woff2') format('woff2');font-weight:400;font-display:swap}@font-face{font-family:Vazirmatn;src:url('/fonts/Vazirmatn-Medium.woff2') format('woff2');font-weight:500;font-display:swap}@font-face{font-family:Vazirmatn;src:url('/fonts/Vazirmatn-SemiBold.woff2') format('woff2');font-weight:600;font-display:swap}@font-face{font-family:Vazirmatn;src:url('/fonts/Vazirmatn-Bold.woff2') format('woff2');font-weight:700;font-display:swap}@font-face{font-family:Vazirmatn;src:url('/fonts/Vazirmatn-ExtraBold.woff2') format('woff2');font-weight:800;font-display:swap}</style>
<style>
:root{color-scheme:dark;--bg:#0f172a;--card:#1e293b;--field:#0f172a;--text:#e2e8f0;--muted:#94a3b8;--border:#334155;--accent:#2563eb;--accent-strong:#1d4ed8;--link:#93c5fd;--score:#4ade80;--countdown:#93c5fd;--countdown-bg:rgba(96,165,250,.12);--danger:#f87171;--chip:#334155;--hover:rgba(148,163,184,.08);--footer:#94a3b8;--glass:rgba(30,41,59,.55);--glass-border:rgba(148,163,184,.16);--glass-hi:rgba(255,255,255,.07);--glass-shadow:0 8px 32px rgba(0,0,0,.35);--glow1:rgba(37,99,235,.17);--glow2:rgba(29,78,216,.11);--scrim:rgba(2,6,23,.62)}
[data-theme="light"]{color-scheme:light;--bg:#f8fafc;--card:#ffffff;--field:#f8fafc;--text:#0f172a;--muted:#64748b;--border:#e2e8f0;--accent:#2563eb;--accent-strong:#1d4ed8;--link:#1d4ed8;--score:#15803d;--countdown:#2563eb;--countdown-bg:rgba(37,99,235,.1);--danger:#dc2626;--chip:#e2e8f0;--hover:rgba(15,23,42,.045);--footer:#64748b;--glass:rgba(255,255,255,.62);--glass-border:rgba(15,23,42,.08);--glass-hi:rgba(255,255,255,.7);--glass-shadow:0 8px 32px rgba(15,23,42,.08);--glow1:rgba(37,99,235,.09);--glow2:rgba(96,165,250,.08);--scrim:rgba(248,250,252,.78)}
body{font-family:'Vazirmatn',system-ui,sans-serif;background-color:var(--bg);color:var(--text);max-width:760px;margin:0 auto;padding:24px 20px 36px;line-height:1.6;-webkit-font-smoothing:antialiased;transition:background .25s,color .25s}body::before{content:"";position:fixed;inset:0;z-index:-1;background:radial-gradient(900px 520px at 88% -8%,var(--glow1),transparent 60%),radial-gradient(820px 620px at -12% 32%,var(--glow2),transparent 60%),linear-gradient(var(--scrim),var(--scrim)),url('/bg.jpg') center/cover no-repeat}
#topbar{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:22px}
#topbar button{background:var(--glass);-webkit-backdrop-filter:blur(10px) saturate(1.3);backdrop-filter:blur(10px) saturate(1.3);color:var(--text);border:1px solid var(--glass-border);border-radius:10px;padding:8px 14px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;transition:border-color .15s,transform .15s cubic-bezier(.16,1,.3,1),background .15s}
#topbar button:hover{border-color:var(--accent);background:var(--hover)}
#topbar button:active{transform:scale(.96)}
.tb-btns{display:flex;gap:8px;align-items:center}
#tzsel{background:var(--glass);-webkit-backdrop-filter:blur(10px) saturate(1.3);backdrop-filter:blur(10px) saturate(1.3);color:var(--text);border:1px solid var(--glass-border);border-radius:10px;padding:7px 10px;font-size:12px;font-weight:600;font-family:inherit;cursor:pointer;max-width:130px;transition:border-color .15s}
#tzsel:hover{border-color:var(--accent)}
#tzfilter{background:var(--glass);-webkit-backdrop-filter:blur(10px) saturate(1.3);backdrop-filter:blur(10px) saturate(1.3);color:var(--text);border:1px solid var(--glass-border);border-radius:10px;padding:7px 10px;font-size:12px;font-weight:600;font-family:inherit;max-width:110px;transition:border-color .15s}
#tzfilter:focus,#tzsel:focus{border-color:var(--accent)}
:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
h1{font-size:27px;font-weight:800;margin:0 0 6px;letter-spacing:-.01em}
.sub{color:var(--muted);font-size:13.5px;margin:0 0 6px}
.sub a{color:var(--link);text-decoration:none;border-bottom:1px solid transparent;transition:border-bottom-color .15s}
.sub a:hover{border-bottom-color:var(--link)}
.cta{display:inline-flex;align-items:center;gap:8px;margin-top:14px;background:var(--accent);color:#fff;font-size:13px;font-weight:600;padding:10px 18px;border-radius:999px;text-decoration:none;transition:background .15s,transform .15s cubic-bezier(.16,1,.3,1),box-shadow .15s}
.cta:hover{background:var(--accent-strong);transform:translateY(-1px);box-shadow:0 6px 16px rgba(37,99,235,.2)}
/* v12.12: the .viewtoggle block is retired (the page is always big-only) */
.bigbar{margin:14px 0 4px;background:var(--glass);-webkit-backdrop-filter:blur(12px) saturate(1.4);backdrop-filter:blur(12px) saturate(1.4);border:1px solid var(--glass-border);border-radius:14px;padding:12px 16px;box-shadow:var(--glass-shadow),inset 0 1px 0 var(--glass-hi)}
.bigbar-top{display:flex;align-items:center;justify-content:space-between;gap:10px;font-size:13px;font-weight:600;color:var(--muted);margin-bottom:9px}
.bigbar-clock{font-weight:700;color:var(--countdown);font-variant-numeric:tabular-nums}
.bigbar-track{position:relative;height:14px;border-radius:999px;background:rgba(148,163,184,.2);box-shadow:inset 0 1px 3px rgba(0,0,0,.25);overflow:hidden}
[data-theme="light"] .bigbar-track{background:rgba(15,23,42,.08);box-shadow:inset 0 1px 3px rgba(15,23,42,.12)}
.bigbar-fill{position:absolute;top:0;left:0;height:100%;width:0%;border-radius:999px;background-image:linear-gradient(90deg,#22c55e,#16a34a),repeating-linear-gradient(45deg,rgba(255,255,255,.25) 0 10px,rgba(255,255,255,0) 10px 20px);background-size:100% 100%,28px 100%;box-shadow:0 0 8px rgba(34,197,94,.28);transition:width .7s cubic-bezier(.16,1,.3,1);animation:bigbar-stripes 1.1s linear infinite}
@keyframes bigbar-stripes{from{background-position:0 0,0 0}to{background-position:0 0,28px 0}}
.bigbar-fill.live{background-image:linear-gradient(90deg,#f59e0b,#ef4444),repeating-linear-gradient(45deg,rgba(255,255,255,.3) 0 10px,rgba(255,255,255,0) 10px 20px);box-shadow:0 0 10px rgba(239,68,68,.35);animation:bigbar-stripes .8s linear infinite,bigbar-pulse 1.2s ease-in-out infinite}
.bigbar-fill.idle{width:42%;animation:bigbar-stripes .9s linear infinite}
@keyframes bigbar-pulse{0%,100%{opacity:1}50%{opacity:.7}}
/* v12.10/v12.11 HERO CARD: the countdown bar lives INSIDE the hero card,
   flush — with its own match right below it, so the bar and the match read
   as ONE unit. v12.11: the card is a PLAIN standard .card — no golden
   chrome, identical to every other section (streamlined, per the user). */
.bighero .bigbar{margin:0 0 12px;padding:2px 2px 8px;background:transparent;border:none;border-bottom:1px solid var(--border);border-radius:0;box-shadow:none;-webkit-backdrop-filter:none;backdrop-filter:none}
.livechip{display:inline-flex;align-items:center;gap:6px;background:rgba(34,197,94,.14);color:#4ade80;border:1px solid rgba(34,197,94,.35);border-radius:999px;padding:2px 10px;font-size:12px;font-weight:700;margin:0 6px;vertical-align:middle}
[data-theme="light"] .livechip{color:#15803d}
.livechip .dot{width:8px;height:8px;border-radius:50%;background:#22c55e;animation:live-beep 1.1s ease-in-out infinite}
@keyframes live-beep{0%,100%{box-shadow:0 0 0 0 rgba(34,197,94,.35);transform:scale(1)}50%{box-shadow:0 0 0 6px rgba(34,197,94,0);transform:scale(1.15)}}
.lmin{display:inline-block;background:rgba(37,99,235,.12);color:var(--accent);border-radius:6px;padding:1px 7px;font-size:12px;font-weight:700;vertical-align:middle}
[data-theme="light"] .lmin{background:rgba(37,99,235,.1)}
.scorers{margin-top:8px;display:flex;flex-direction:column;gap:4px;font-size:12.5px;color:var(--muted)}
.scorers .srow{display:flex;align-items:center;gap:4px;flex-wrap:wrap}
/* v12.11: the .match.derby box rule is RETIRED — derby rows (Man Utd–City,
   Atlético–Real, Marseille–PSG …) carried an amber border + amber→violet
   gradient while equally big non-derbies (Liverpool–Man City, Roma–Inter)
   stayed plain. Per the user's ask every match row is now IDENTICAL: no
   border, no gradient, no glow. The "derby" class stays in the DOM (inert)
   and the «دربی» badge pill in the info row carries the label. */
.derbybadge{display:inline-flex;align-items:center;gap:4px;background:linear-gradient(90deg,#b45309,#7e22ce);color:#fff;border-radius:999px;padding:2px 10px;font-size:11.5px;font-weight:800;margin-inline-start:6px;vertical-align:middle}
.bigcard{border:2px solid rgba(52,211,153,.38);border-radius:16px;padding:14px 16px 6px;margin:14px 0;background:radial-gradient(120% 160% at 15% 0%,rgba(16,185,129,.20),transparent 55%),linear-gradient(135deg,#064e3b,#065f46 55%,#047857);box-shadow:0 0 10px rgba(5,150,105,.16),0 8px 26px rgba(0,0,0,.35),var(--glass-shadow),inset 0 1px 0 rgba(255,255,255,.16);color:#fff}
.bigcard .match{border-bottom-color:rgba(255,255,255,.16)}
.bigcard .match:hover{background:rgba(255,255,255,.08)}
.bigcard .team,.bigcard .vs,.bigcard .info{color:#ecfdf5}
.bigcard .vs{color:#6ee7b7}
.bigcard .comp{background:rgba(255,255,255,.16);color:#fff}
.bigcard .countdown{background:rgba(255,255,255,.2);color:#fff}
.bigcard .venue{background:rgba(255,255,255,.14);color:#fff}
.bigcard .logo{background:rgba(0,0,0,.28);border-color:rgba(255,255,255,.35)}
[data-theme="light"] .bigcard{background:linear-gradient(135deg,#ecfdf5,#d1fae5 55%,#a7f3d0);border-color:rgba(5,150,105,.42);color:#064e3b;box-shadow:0 8px 24px rgba(5,150,105,.16),var(--glass-shadow),inset 0 1px 0 rgba(255,255,255,.85)}
[data-theme="light"] .bigcard .match{border-bottom-color:rgba(5,46,22,.14)}
[data-theme="light"] .bigcard .match:hover{background:rgba(255,255,255,.4)}
[data-theme="light"] .bigcard .team,[data-theme="light"] .bigcard .vs,[data-theme="light"] .bigcard .info{color:#064e3b}
[data-theme="light"] .bigcard .vs{color:#047857}
[data-theme="light"] .bigcard .comp{background:rgba(5,46,22,.14);color:#052e16}
[data-theme="light"] .bigcard .countdown{background:rgba(5,46,22,.16);color:#052e16}
[data-theme="light"] .bigcard .venue{background:rgba(5,46,22,.12);color:#052e16}
[data-theme="light"] .bigcard .logo{background:rgba(255,255,255,.55);border-color:rgba(5,46,22,.18)}
.bigcard-head{font-size:13px;font-weight:800;color:var(--accent);margin-bottom:4px}
.bigcard .bigcard-head{color:#a7f3d0}
[data-theme="light"] .bigcard-head{color:var(--accent-strong)}
[data-theme="light"] .bigcard .bigcard-head{color:#047857}
/* v12.12: the .msec section rules are retired with renderSections (the
   «مسابقات پیش‌رو» list card is gone; the boxes are the presentation). */
.card{background:var(--glass);-webkit-backdrop-filter:blur(16px) saturate(1.4);backdrop-filter:blur(16px) saturate(1.4);border:1px solid var(--glass-border);border-radius:16px;padding:18px;margin:14px 0;box-shadow:var(--glass-shadow),inset 0 1px 0 var(--glass-hi)}
/* v12.11: the UCL gold chrome is RETIRED too — .uclcard (UCL list) and
   .uclspot (next big UCL match) were the last golden boxes around matches;
   they are plain .card sections now, uniform with everything else. The
   container classes stay in the HTML (inert hooks + reduced-transparency
   selector) and .uclspot-logo/info/wait below remain as layout rules. */
.uclspot-logo{width:72px;height:72px;object-fit:contain;display:block;margin:4px auto 12px;filter:drop-shadow(0 2px 8px rgba(0,0,0,.35))}
.uclspot-info{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:8px;font-size:13px;color:var(--muted);text-align:center}
.uclspot-wait{display:flex;flex-direction:column;align-items:center;gap:6px;padding:12px 0 8px}
/* v12.11: the .topspot golden box chrome is RETIRED — the hero card and the
   big-matches box are plain .card sections now, uniform with every other
   card on the page (the 🔥 heading carries the "big" signal; per the user
   no match or box gets a special border). No element carries the class
   anymore — the rules and glow keyframes below were removed with it. */
/* v12.7/v12.8 multi-match TOP BOX: up to six TRUE big matches (strict kickoff
   order — closest on top) stacked in the card — .spotitem wraps one entry
   (teams row + info + share); the stock .match divider separates entries,
   none after the last. */
.spotitem .match{margin:0 0 8px}
.spotitem:last-child .match{border-bottom:none}
.ucl-head{display:flex;align-items:center;gap:8px;font-weight:800;font-size:14.5px;margin-bottom:8px}
.ucl-emblem{width:26px;height:26px;border-radius:6px;flex-shrink:0}
.ucl-md{margin-left:auto;font-size:11.5px;color:var(--muted);font-weight:600}
.ucl-stand-wrap{position:relative;margin-top:10px}
.ucl-stand{max-height:360px;overflow-y:auto;border:1px solid var(--border);border-radius:12px;padding:6px 10px;background:rgba(30,41,59,.45)}
[data-theme="light"] .ucl-stand{background:rgba(15,23,42,.03)}
.ucl-stand-wrap .stnot-overlay{top:6px;left:6px;right:6px;bottom:6px;background:rgba(2,6,23,.6)}
[data-theme="light"] .ucl-stand-wrap .stnot-overlay{background:rgba(248,250,252,.7)}
h2{font-size:15px;font-weight:700;margin:0 0 12px}
.match{display:flex;align-items:center;gap:12px;padding:12px 8px;border-bottom:1px solid var(--border);border-radius:10px;transition:background .15s;animation:rise .35s cubic-bezier(.16,1,.3,1) both;animation-delay:calc(var(--i,0)*40ms)}
.wrap:last-child .match{border-bottom:none}
.stable .match{animation:none}
.match:hover{background:var(--hover)}
.side{display:flex;align-items:center;gap:8px;flex:1 1 auto;min-width:0;flex-wrap:nowrap}
.side .team{flex:1;min-width:0}
.side.away .team{text-align:end}
.logo{width:38px;height:38px;border-radius:50%;background:var(--bg);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:18px;overflow:hidden;flex-shrink:0}
.logo img{width:100%;height:100%;object-fit:contain}
.team{flex:1;font-weight:700;font-size:14.5px}
.vs{color:var(--muted);font-size:12px;flex-shrink:0}
.score{font-weight:800;font-size:17px;color:var(--score);flex-shrink:0;font-variant-numeric:tabular-nums}
.info{font-size:12px;color:var(--muted);margin-top:6px}
.comp{display:inline-block;background:var(--chip);border-radius:999px;padding:3px 10px;font-size:11px;margin-left:6px;font-weight:600}
.complogo{width:14px;height:14px;border-radius:3px;vertical-align:-2.5px;margin-inline-end:5px}
.countdown{color:var(--countdown);font-weight:700;font-size:11.5px;background:var(--countdown-bg);border-radius:999px;padding:3px 10px;display:inline-block;margin-left:6px}
.venue{display:inline-block;background:rgba(148,163,184,.12);border-radius:999px;padding:3px 10px;font-size:11px;margin-left:6px;font-weight:600;color:var(--text)}
/* v12.13: the standings grid is EXPLICIT, per the user's ask — 2 columns on
   phones, 3 columns everywhere else (the page caps at 760px, so 3 boxes/row
   at ~233px each, two tidy rows for the 6 leagues). The old auto-fit
   minmax(150px,1fr) packed FOUR boxes per row on desktop. */
.grid4{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}
@media (min-width:601px){.grid4{grid-template-columns:repeat(3,1fr)}}
.stbox{position:relative;background:var(--glass);-webkit-backdrop-filter:blur(12px) saturate(1.3);backdrop-filter:blur(12px) saturate(1.3);border:1px solid var(--glass-border);border-radius:12px;padding:10px 12px;box-shadow:var(--glass-shadow),inset 0 1px 0 var(--glass-hi)}
.stbox-head{display:flex;align-items:center;gap:6px;font-size:12.5px;font-weight:800;margin-bottom:6px}
.stbox-head img{width:16px;height:16px;border-radius:3px}
.strow{display:flex;align-items:center;gap:6px;font-size:11.5px;padding:2.5px 0;border-bottom:1px dashed var(--border)}
.strow:last-child{border-bottom:none}
.stpos{width:16px;text-align:center;font-weight:800;color:var(--muted);flex-shrink:0}
.stpos.top3{color:var(--accent)}
.stname{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.stpts{font-weight:800;flex-shrink:0;font-variant-numeric:tabular-nums}
.stempty{color:var(--muted);font-size:11.5px;padding:4px 0}
.stnot-overlay{position:absolute;top:38px;left:8px;right:8px;bottom:8px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;background:rgba(2,6,23,.52);-webkit-backdrop-filter:blur(7px) saturate(1.2);backdrop-filter:blur(7px) saturate(1.2);border-radius:10px;text-align:center;z-index:2;box-shadow:inset 0 1px 0 var(--glass-hi)}
[data-theme="light"] .stnot-overlay{background:rgba(248,250,252,.6)}
.stnot-ovl-label{font-size:12px;font-weight:800;color:var(--text)}
.stnot-ovl-timer{font-size:10.5px;font-weight:700;color:var(--countdown);background:var(--countdown-bg);border-radius:999px;padding:2px 10px;font-variant-numeric:tabular-nums}
.cupgrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:10px}
.cupbox{background:var(--glass);-webkit-backdrop-filter:blur(12px) saturate(1.3);backdrop-filter:blur(12px) saturate(1.3);border:1px solid var(--glass-border);border-radius:12px;padding:10px 12px;box-shadow:var(--glass-shadow),inset 0 1px 0 var(--glass-hi)}
.cupbox-head{display:flex;align-items:center;gap:6px;font-size:12.5px;font-weight:800;margin-bottom:4px}
.cupbox-head img{width:18px;height:18px;border-radius:4px}
.cupgroup-title{margin:12px 0 6px;font-size:12.5px;font-weight:800;color:var(--muted);display:flex;align-items:center;gap:6px}
.cupgroup-title:first-child{margin-top:0}
.cupmatch{font-size:11.5px;line-height:1.7}
.cupmatch .teams{font-weight:700}
.cupdate{color:var(--muted);font-size:11px}
.cupdate .live-tag{color:#4ade80;font-weight:700}
[data-theme="light"] .cupdate .live-tag{color:#15803d}
.share{display:inline-flex;align-items:center;gap:5px;margin:6px 0 0;justify-content:flex-end;width:100%}
.share a,.share button{display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:8px;background:var(--chip);border:1px solid var(--border);padding:0;cursor:pointer;font-family:inherit;color:var(--muted);text-decoration:none;transition:transform .15s,background .15s}
.share a:hover,.share button:hover{transform:translateY(-1px);background:var(--hover)}
.share a:active,.share button:active{transform:scale(.9)}
.share svg{display:block}
.topbadge{display:inline-flex;align-items:center;background:linear-gradient(90deg,#d97706,#b45309);color:#fff;border-radius:999px;padding:2px 10px;font-size:11.5px;font-weight:800;margin-inline-start:6px;vertical-align:middle}
/* Future-plan ask: share/calendar icons appear ONLY while hovering a match
   card (or focusing it with the keyboard). Touch devices have no hover, so
   they keep the icons permanently visible — the rule is scoped to precision
   pointers via the (hover:hover) media query. */
@media (hover:hover) and (pointer:fine){
.share{opacity:0;transform:translateY(2px);transition:opacity .18s ease,transform .18s ease;pointer-events:none}
.mrow:hover .share,.mrow:focus-within .share,.spotitem:hover .share,.spotitem:focus-within .share,#uclSpot:hover .share,#uclSpot:focus-within .share,.bigcard:hover .share,.bigcard:focus-within .share,.share:hover,.share:focus-within{opacity:1;transform:none;pointer-events:auto}
}
#msg{text-align:center;color:var(--muted);font-size:13px;padding:12px}
.empty{color:var(--muted);text-align:center;padding:24px;font-size:14px}
footer{text-align:center;color:var(--footer);font-size:12px;margin-top:28px;line-height:2}
footer a{color:var(--link);text-decoration:none}
footer a:hover{text-decoration:underline}
@media (max-width:600px){
body{padding:16px 12px 28px;background-attachment:scroll}
h1{font-size:23px}
.sub{font-size:12.5px}
.cta{width:100%;justify-content:center;box-sizing:border-box}
.card{padding:14px 10px}
.match{flex-wrap:wrap;gap:8px;padding:10px 6px}
.logo{width:30px;height:30px;font-size:15px}
.team{flex:1 1 auto;min-width:0;font-size:13.5px;word-wrap:break-word;overflow-wrap:anywhere}
.score{font-size:15px}
.info{font-size:11px;line-height:1.7}
#topbar button{padding:7px 12px}
#tzsel{max-width:100px;padding:6px 6px;font-size:11px}
.tb-btns{gap:6px}
}
@keyframes rise{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}.bigcard{box-shadow:0 0 10px rgba(5,150,105,.16),0 8px 26px rgba(0,0,0,.35),var(--glass-shadow),inset 0 1px 0 rgba(255,255,255,.16)}}
@media (prefers-reduced-transparency:reduce){body{background:var(--bg)}.card,#topbar button,.bigbar,.stbox,.cupbox,.uclcard,.uclspot,#tzsel,#tzfilter{background:var(--card);-webkit-backdrop-filter:none;backdrop-filter:none;box-shadow:0 1px 2px rgba(15,23,42,.05)}}
</style>
</head>
<body>
<div id="topbar"><input id="tzfilter" type="search" placeholder="🔍" title="Search timezone" aria-label="Search timezone"><select id="tzsel" title="Timezone" aria-label="Timezone"></select><span class="tb-btns"><button id="lbtn" onclick="switchLang()"></button><button id="tbtn" onclick="toggleTheme()"></button></span></div>
<header class="hero">
<h1 data-i="h1">⚽ اعلان‌دهنده مسابقات</h1>
<p class="sub" data-i="sub1">مسابقات پیش‌رو، رقابت‌های صدر جدول و نتایج تیم‌های منتخب — به‌روزرسانی خودکار</p>
<a class="cta" href="https://t.me/UCL_Match_Bot" target="_blank" rel="noopener" data-i="join">🎮 در تلگرام به ربات بپیوندید و اعلان بگیرید</a>
</header>
<!-- v12.12: the view toggle is RETIRED — the page is permanently big-only
     («فقط بازی‌های بزرگ», the user's default). The hero card + the topspot
     box + the UCL box ARE the upcoming presentation. -->
<!-- v12.10/v12.11 HERO CARD: the countdown bar and ITS match are ONE card at
     the very top — the closest upcoming big match (the big-matches box's
     slot 1, the match the countdown tracks) sits STUCK to the bar, separated
     from the other big matches in the box below (user ask: the next big
     match must be stuck to its countdown). v12.11: the card is a PLAIN
     standard card — same glass/border as every other section — and its match
     row is styled like any other match row (no special box; streamlined).
     #bigbar keeps its id — updateBigBar drives label/clock/fill every
     second; #heroSpot is filled by renderHeroSpot from the SAME barTarget()
     pick, so the card under the countdown is always exactly the match being
     counted down to. -->
<div class="card bighero" id="bigHeroCard" style="display:none">
<div id="bigbar" class="bigbar">
<div class="bigbar-top"><span id="bigbarLabel" data-i="barNext">⚡ تا بازی بزرگ بعدی</span><span id="bigbarClock" class="bigbar-clock">--:--:--</span></div>
<div class="bigbar-track" id="bigbarTrack" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><div id="bigbarFill" class="bigbar-fill"></div></div>
</div>
<div id="heroSpot"></div>
</div>
<!-- v12.3/v12.4/v12.7/v12.8 TOP BOX (league), per the user's rules: TOP CL GAME (two
     selected teams in the Champions League) → the UCL BOX below; big DOMESTIC
     matches (derbies like the Madrid derby, top-of-the-table clashes and
     selected-vs-selected clashes like the Manchester derby) → THIS box,
     heading the games list so a derby can never sit 3rd/4th in kickoff order.
     v12.7: the card consolidates the big upcoming matches (user's ask —
     Atlético–Real Madrid and the Manchester derby in the SAME box); a match
     that is BOTH a derby and a top-of-the-table clash shows BOTH tags.
     v12.8: only TRUE big matches qualify (A: two selected teams / B: both
     sides top-3 / C: derby; fallback when A/B/C run short: a selected team
     vs a TOP-5 side of that league — never a routine selected fixture like
     Liverpool–Fulham) and the order is STRICTLY kickoff — closest upcoming
     on top, live first.
     v12.10: slot 1 — the countdown's own match — now lives in the HERO CARD
     at the very top (bar + match stuck together, per the user's ask); THIS
     box presents the REMAINING big matches. Box fixtures are
     excluded from the upcoming list below — this box IS their presentation.
     Hidden when nothing qualifies — or when the hero took the only entry.
     v12.11: plain .card — no golden chrome; entries are uniform match rows.
     v12.12: capacity raised — up to TEN entries (11 picked server-side,
     slot 1 = the hero; the user's ask).
     v12.13: THIS box now sits BETWEEN the hero and the UCL box (user's ask —
     order: [next big match countdown and teams] → [big upcoming matches] →
     [big upcoming UCL matches]). -->
<div class="card" id="topspotCard" style="display:none">
<h2 data-i="hLgNext" id="topSpotTitle">🔥 مسابقات بزرگ پیش‌رو</h2>
<div id="topSpot"><div class="empty" data-i="loading">در حال بارگذاری...</div></div>
</div>
<!-- v12.2: the UCL box sits above the games list (was below it). v12.4: while
     the selected-vs-selected CL pairing is far away the box headlines the
     nearest CL match with ≥1 selected team (live scores too).
     v12.12: the box is GENERALIZED (the user's ask) — up to EIGHT upcoming
     CL fixtures in kickoff order (live first; "two today, two tomorrow"),
     and ONLY matches with ≥1 SELECTED club (Sabah FK 🆚 SK Slavia Praha is
     noise). Same spotitem rows as every other box (v12.11 uniform). Hidden
     when nothing qualifies; the pre-draw wait state counts to the projected
     first kickoff.
     v12.13: moved BELOW the big-matches box (user's ask — the domestic big
     matches outrank the UCL ones in reading order; hero → topspot → uclspot). -->
<div class="card uclspot" id="uclSpotCard">
<h2 data-i="hUclNext" id="uclSpotTitle">🔥 مسابقات مهم لیگ قهرمانان اروپا</h2>
<div id="uclSpot"><div class="empty" data-i="loading">در حال بارگذاری...</div></div>
</div>
<!-- v12.12: the «📅 مسابقات پیش‌رو» list card is RETIRED — with the view
     toggle gone (always big-only) it only ever held the redundant "همه در
     جعبه بالا هستند" note; the hero card + the topspot box + the UCL box
     ARE the upcoming presentation (the user's ask). -->
<div class="card uclcard">
<h2 data-i="hUcl">🏆 لیگ قهرمانان اروپا</h2>
<div id="ucl"><div class="empty" data-i="loading">در حال بارگذاری...</div></div>
</div>
<div class="card">
<h2 data-i="hStandings">📊 جدول لیگ‌ها</h2>
<div id="standings"><div class="empty" data-i="loading">در حال بارگذاری...</div></div>
</div>
<div class="card">
<h2 data-i="hCups">🏆 تورنمنت‌ها</h2>
<div id="cups"><div class="empty" data-i="loading">در حال بارگذاری...</div></div>
</div>
<!-- v12.5: the Iran card is gone — the PGL table lives inside the league
     standings grid above (#standings), per the user's request. -->
<div class="card">
<h2 data-i="hFinished">🏁 نتایج اخیر</h2>
<div id="finished"><div class="empty" data-i="loading">در حال بارگذاری...</div></div>
</div>
<footer><span data-i="madeWith">ساخته‌شده با ❤️</span> — <a href="/admin" data-i="adminLink">ورود مدیریت</a> — <a href="https://t.me/UCL_Match_Bot" target="_blank" rel="noopener" data-i="botLink">ربات تلگرام</a></footer>
<script>
var I18N={
fa:{title:"مسابقات پیش‌رو — اعلان‌دهنده مسابقات",h1:"⚽ اعلان‌دهنده مسابقات",sub1:"مسابقات پیش‌رو، رقابت‌های صدر جدول و نتایج تیم‌های منتخب — به‌روزرسانی خودکار",join:"در تلگرام به ربات بپیوندید و اعلان بگیرید",hUpcoming:"📅 مسابقات پیش‌رو",hFinished:"🏁 نتایج اخیر",loading:"در حال بارگذاری...",noMatches:"مسابقه‌ای در راه نیست",errLoad:"خطا در دریافت داده‌ها",madeWith:"ساخته‌شده با ❤️",adminLink:"ورود مدیریت",botLink:"ربات تلگرام",soon:"به‌زودی",inDays:"در %d روز",barNext:"⚡ تا بازی بزرگ بعدی",barFallback:"⏳ تا مسابقه بعدی",barLive:"🔴 در جریان",barIdle:"⏳ در انتظار بازی بعدی",uDay:"روز",uHour:"ساعت",uMin:"دقیقه",uSec:"ثانیه",live:"در حال برگزاری",pen:"پنالتی",own:"گل به خودی",derby:"🔥 دربی",hUcl:"🏆 لیگ قهرمانان اروپا",hUclNext:"🔥 مسابقات مهم لیگ قهرمانان اروپا",hLgNext:"🔥 مسابقات بزرگ پیش‌رو",topBadge:"صدر جدول",hStandings:"📊 جدول لیگ‌ها",hCups:"🏆 جام‌های حذفی",stEmpty:"جدول هنوز در دسترس نیست",stNot:"شروع نشده",tierGold:"🥇 سطح طلا — اروپا و بینالملل",tierSilver:"🥈 سطح نقره — اروپا",tierBronze:"🥉 سطح برنز — اروپا",cEN:"🏴 انگلستان",cES:"🇪🇸 اسپانیا",cIT:"🇮🇹 ایتالیا",cIR:"🇮🇷 ایران",cupsNone:"برنامه‌ای هنوز اعلام نشده",tierEurope:"🏆 لیگ‌های قاره اروپا",intlCups:"🏆 جام‌های بین‌المللی",share:"اشتراک‌گذاری",copy:"کپی متن",copied:"کپی شد ✓",titleL:"ورود — مدیریت ربات",loginH1:"🔐 ورود به مدیریت ربات",lbUser:"نام کاربری",lbPass:"رمز عبور",btnLogin:"ورود",errUser:"نام کاربری را وارد کنید",errRate:"تلاش بیش از حد — چند دقیقه دیگر امتحان کنید",errCreds:"نام کاربری یا رمز اشتباه است",titleA:"تنظیمات ربات اعلان مسابقات",h1A:"⚙️ تنظیمات ربات اعلان مسابقات",hLogin:"🔑 ورود",tokenPh:"رمز عبور مدیریت (admin password)",hStatus:"📊 وضعیت",stLoading:"در حال بارگذاری...",stErr:"❌ خطا در دریافت وضعیت — دوباره وارد شوید یا توکن را بررسی کنید",stLastRun:"🕒 آخرین اجرا",stApi:"📡 منبع API",stUsers:"👥 کاربران",stIds:"🆔 شناسه‌ها",stTz:"🌍 منطقه زمانی",btnRefresh:"به‌روزرسانی وضعیت",btnTest:"📨 ارسال پیام تست",btnSim:"🧪 شبیه‌سازی ۵ اعلان",btnSources:"📡 بررسی منابع API",btnLogout:"🚪 خروج",hBroadcast:"📣 ارسال پیام به همه کاربران",lbBroadcast:"متن پیام (به فارسی یا انگلیسی)",bcPh:"متن پیام...",btnBroadcast:"📣 ارسال برای همه",hMatches:"⚽ مسابقات پیش‌رو",btnRefreshM:"به‌روزرسانی مسابقات",hSettings:"⚙️ تنظیمات",lbTz:"منطقه زمانی",lbLeagues:"لیگ‌های تحت پوشش (کدها با کاما)",elNote:"EL و ECL توسط SportScore پوشش داده می‌شوند و نیازی به افزودن ندارند.",lbTeams:"تیم‌های منتخب هر لیگ",teamPh:"نام تیم جدید",btnAdd:"+ افزودن",btnSave:"💾 ذخیره تنظیمات",btnBackup:"⬇️ پشتیبان‌گیری تنظیمات",hPass:"🔑 تغییر رمز عبور",lbNp1:"رمز جدید (حداقل ۸ کاراکتر)",lbNp2:"تکرار رمز جدید",btnCp:"تغییر رمز عبور",cal:"افزودن به گوگل تقویم",ver:"نسخه ۱۲.۱۵ — نام یکپارچه باشگاه‌ها + انتخاب خودکار UCL",mToken:"ورود نامعتبر — رمز عبور یا نشست منقضی شده",mErr:"خطا: ",mEnterToken:"رمز عبور را وارد کنید",mSaved:"✅ ذخیره شد",mLoginFirst:"ابتدا وارد شوید",mBackup:"⬇️ پشتیبان‌گیری شد",mPassShort:"رمز باید حداقل ۸ کاراکتر باشد",mPassMismatch:"رمزها یکسان نیستند",mPassOk:"🔑 رمز با موفقیت تغییر کرد",mSentTo:"📣 ارسال شد به %s از %s کاربر",mTestSent:"📨 تست ارسال شد به %s کاربر",mSimPrefix:"🧪 شبیه‌سازی: ",mNoNotif:"⚠️ هیچ اعلانی ارسال نشد",mNoMatches:"مسابقه‌ای در راه نیست",mErrMatches:"خطا در دریافت مسابقات",mEnterText:"متن پیام را وارد کنید",mErrSrc:"❌ خطا",acHint:"💡 هنگام تایپ، نام دقیق باشگاه از فهرست API پیشنهاد می‌شود — برای ثبت بی‌خطا یکی را انتخاب کنید.",acNone:"باشگاهی با این نام در فهرست نیست",acAdd:"✅ %s افزوده شد",acAddUcl:"✅ %s افزوده شد — برای لیگ قهرمانان اروپا هم انتخاب شد",uclSync:"باشگاه‌های هر لیگ به‌صورت خودکار برای لیگ قهرمانان اروپا هم انتخاب می‌شوند",acDup:"⚠️ %s از قبل در این لیگ هست",btnClubs:"🔄 به‌روزرسانی فهرست باشگاه‌ها",clubsMeta:"فهرست باشگاه‌ها: %s باشگاه — آخرین بروزرسانی: %s",clubsNone:"⚠️ فهرست باشگاه‌ها هنوز ساخته نشده — دکمه بروزرسانی را بزنید",mClubs:"✅ فهرست باشگاه‌ها بروزرسانی شد (%s باشگاه)",clubsErr:"❌ فهرست باشگاه‌ها در دسترس نیست"},
en:{title:"Upcoming Matches — Match Notifier",h1:"⚽ Match Notifier",sub1:"Fixtures, top-of-the-table clashes & results — auto-refreshed",join:"Join the Telegram bot to get notified",hUpcoming:"📅 Upcoming Matches",hFinished:"🏁 Recent Results",loading:"Loading...",noMatches:"No matches ahead",errLoad:"Error loading data",madeWith:"Made with ❤️",adminLink:"Admin login",botLink:"Telegram bot",soon:"Soon",inDays:"in %d days",barNext:"⚡ Until the next big match",barFallback:"⏳ Until the next match",barLive:"🔴 Live now",barIdle:"⏳ Waiting for the next match",uDay:"d",uHour:"h",uMin:"m",uSec:"s",live:"LIVE",pen:"Penalty",own:"Own goal",derby:"🔥 Derby",hUcl:"🏆 UEFA Champions League",hUclNext:"🔥 Big UCL Matches",hLgNext:"🔥 Big Upcoming Matches",topBadge:"Top 3",hStandings:"📊 League Standings",hCups:"🏆 Tournaments",stEmpty:"Standings not available yet",stNot:"Not started",tierGold:"🥇 Gold tier — Europe & international",tierSilver:"🥈 Silver tier — Europe",tierBronze:"🥉 Bronze tier — Europe",cEN:"🏴 England",cES:"🇪🇸 Spain",cIT:"🇮🇹 Italy",cIR:"🇮🇷 Iran",cupsNone:"No fixture announced yet",tierEurope:"🏆 European Continental Leagues",intlCups:"🏆 International Cups",share:"Share",copy:"Copy text",copied:"Copied ✓",titleL:"Login — Bot Admin",loginH1:"🔐 Bot Admin Login",lbUser:"Username",lbPass:"Password",btnLogin:"Login",errUser:"Enter your username",errRate:"Too many attempts — try again in a few minutes",errCreds:"Wrong username or password",titleA:"Match Bot Settings",h1A:"⚙️ Bot Settings",hLogin:"🔑 Login",tokenPh:"Admin password",hStatus:"📊 Status",stLoading:"Loading...",stErr:"❌ Status error — re-login or check token",stLastRun:"🕒 Last run",stApi:"📡 API source",stUsers:"👥 Users",stIds:"🆔 IDs",stTz:"🌍 Timezone",btnRefresh:"Refresh status",btnTest:"📨 Send test message",btnSim:"🧪 Simulate 5 alerts",btnSources:"📡 Check API sources",btnLogout:"🚪 Logout",hBroadcast:"📣 Broadcast to all users",lbBroadcast:"Message text (FA or EN)",bcPh:"Message...",btnBroadcast:"📣 Send to all",hMatches:"⚽ Upcoming Matches",btnRefreshM:"Refresh matches",hSettings:"⚙️ Settings",lbTz:"Timezone",lbLeagues:"Leagues (comma-separated codes)",elNote:"EL & ECL are covered by SportScore — no need to add them.",lbTeams:"Selected teams per league",teamPh:"New team name",btnAdd:"+ Add",btnSave:"💾 Save settings",btnBackup:"⬇️ Backup settings",hPass:"🔑 Change password",lbNp1:"New password (min 8 chars)",lbNp2:"Repeat new password",btnCp:"Change password",cal:"Add to Google Calendar",ver:"v12.15 — uniform club names + auto UCL selection",mToken:"Invalid login — wrong password or expired session",mErr:"Error: ",mEnterToken:"Enter the admin password",mSaved:"✅ Saved",mLoginFirst:"Log in first",mBackup:"⬇️ Backup downloaded",mPassShort:"Password must be at least 8 characters",mPassMismatch:"Passwords do not match",mPassOk:"🔑 Password changed",mSentTo:"📣 Sent to %s of %s users",mTestSent:"📨 Test sent to %s users",mSimPrefix:"🧪 Simulate: ",mNoNotif:"⚠️ No notifications sent",mNoMatches:"No matches ahead",mErrMatches:"Error loading matches",mEnterText:"Enter a message",mErrSrc:"❌ error",acHint:"💡 As you type, the exact API club name is suggested — pick one to store it safely.",acNone:"No club with that name in the catalog",acAdd:"✅ %s added",acAddUcl:"✅ %s added — also selected for the Champions League",uclSync:"Clubs added in any league are auto-selected for the Champions League too",acDup:"⚠️ %s is already in this league",btnClubs:"🔄 Refresh club list",clubsMeta:"Club catalog: %s clubs — last updated: %s",clubsNone:"⚠️ Club catalog not built yet — press Refresh",mClubs:"✅ Club list refreshed (%s clubs)",clubsErr:"❌ Club list unavailable",comps:{CL:"Champions League",PL:"Premier League",PD:"La Liga",SA:"Serie A",FL1:"Ligue 1",BL1:"Bundesliga",EL:"Europa League",ECL:"Conference League",FA_CUP:"FA Cup",EFL_CUP:"EFL Cup",CDR:"Copa del Rey",COPPA_ITALIA:"Coppa Italia"}}};
function curLang(){try{return localStorage.getItem("ucl_lang")||"fa";}catch(e){return "fa";}}
var PAGE_TZ = "__PAGE_TZ__";
// Complete IANA timezone list (the same set websites ship): Intl.supportedValuesOf
// returns every CLDR zone incl. all Etc/GMT±N fixed offsets. Fallback list below
// covers legacy browsers that lack the API. Labels show the real GMT offset.
var TZ_ALL = [];
function tzOffLabel(tz){
  try{
    var p = new Intl.DateTimeFormat("en",{timeZone:tz,timeZoneName:"shortOffset"}).formatToParts(Date.UTC(2026,0,1));
    for(var i=0;i<p.length;i++) if(p[i].type==="timeZoneName" && p[i].value && p[i].value !== "GMT") return " " + p[i].value;
  }catch(e){}
  return "";
}
function tzLabel(tz){ return tz.replace(/_/g," ") + tzOffLabel(tz); }
function buildTzAll(){
  var out = [];
  try{ out = Intl.supportedValuesOf ? Intl.supportedValuesOf("timeZone") : []; }catch(e){ out = []; }
  if(!out.length) out = ["UTC","Asia/Tehran","Europe/London","Europe/Berlin","Europe/Paris","Europe/Rome","Asia/Dubai","Europe/Istanbul","America/New_York","America/Los_Angeles","America/Toronto","Asia/Tokyo","Australia/Sydney","Australia/Melbourne","Australia/Brisbane","Australia/Adelaide","Australia/Canberra","Australia/Perth"];
  return out.filter(function(x,i,a){ return a.indexOf(x) === i; }).sort();
}
function curTz(){
  try{ var v = localStorage.getItem("ucl_tz"); if(v){ new Intl.DateTimeFormat("en",{timeZone:v}); return v; } }catch(e){}
  return PAGE_TZ;
}
function T(k){var l=curLang(),d=I18N[l];return (d&&d[k])||I18N.fa[k]||k;}
function fmt(k){var s=T(k);for(var i=1;i<arguments.length;i++)s=s.replace("%s",arguments[i]).replace("%d",arguments[i]);return s;}
function trText(){var l=curLang();document.querySelectorAll("[data-i]").forEach(function(el){el.textContent=T(el.getAttribute("data-i"));});}
function trPlace(){document.querySelectorAll("[data-p]").forEach(function(el){el.setAttribute("placeholder",T(el.getAttribute("data-p")));});}
function initTheme(){try{return localStorage.getItem("ucl_theme")||((window.matchMedia&&matchMedia("(prefers-color-scheme:light)").matches)?"light":"dark");}catch(e){return "dark";}}
function setTheme(t){document.documentElement.setAttribute("data-theme",t);try{localStorage.setItem("ucl_theme",t);}catch(e){}var b=document.getElementById("tbtn");if(b)b.textContent=t==="dark"?"🌙":"☀️";}
function toggleTheme(){setTheme(document.documentElement.getAttribute("data-theme")==="dark"?"light":"dark");}
function switchLang(){var l=curLang()==="fa"?"en":"fa";try{localStorage.setItem("ucl_lang",l);}catch(e){}applyLang();}
function applyLang(skipHook){var l=curLang();document.documentElement.setAttribute("lang",l);document.documentElement.setAttribute("dir",l==="en"?"ltr":"rtl");var b=document.getElementById("lbtn");if(b)b.textContent=l==="en"?"فا":"EN";trText();trPlace();if(!skipHook&&typeof onLang==="function")onLang();}
var fmtDate = function(iso){
  var l=curLang();
  try{
    var d = new Date(iso);
    if(l==="fa"){
      // Persian order: weekday، day month-name year (۳۰ مرداد ۱۴۰۵) — fa-IR
      // toLocaleString yields year-first (۱۴۰۵ مرداد ۳۰), which is wrong for Persian.
      var parts = new Intl.DateTimeFormat("fa-IR",{day:"numeric",month:"long",year:"numeric",weekday:"long",hour:"2-digit",minute:"2-digit",hour12:false,timeZone:curTz()}).formatToParts(d);
      var g = function(t){ var p=parts.find(function(x){return x.type===t;}); return p?p.value:""; };
      return g("weekday")+"، "+g("day")+" "+g("month")+" "+g("year")+" ساعت "+g("hour")+":"+g("minute");
    }
    return d.toLocaleString("en-GB",{dateStyle:"full",timeStyle:"short",timeZone:curTz()});
  }
  catch(e){ return new Date(iso).toString(); }
};
var faNum = function(n){ return String(n).replace(/[0-9]/g,function(d){return "۰۱۲۳۴۵۶۷۸۹"[d];}); };
var fmtNum = function(n){ return curLang()==="en"?String(n):faNum(n); };
function compName(m){
  if(curLang()==="en") return (I18N.en.comps&&I18N.en.comps[m.competition.code])||m.competition.code;
  return m.competition.faName||m.competition.code;
}
function monogram(t){
  // Future-plan fix (club badges not loading): a failed or missing crest now
  // falls back to a clean two-letter club monogram instead of a bare ⚽.
  // NOTE: this lives inside a template literal — \\s+ emits the \s+ regex
  // (a single \s would be cooked to a literal "s" and split on the letter!).
  var n = String((t && (t.faName || t.name)) || "");
  var w = n.split(/\\s+/).filter(Boolean);
  if(!w.length) return "⚽";
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
  var txt = h + " 🆚 " + a + " — " + compName(m);
  if((finished || m.status==="LIVE"||m.status==="IN_PLAY"||m.status==="PAUSED") && m.score && m.score.home!==null) txt += " — " + fmtNum(m.score.home) + ":" + fmtNum(m.score.away);
  return txt + " — " + fmtDate(m.utcDate);
}
var S_ICONS = {
  wa: '<path fill="#25D366" d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>',
  tg: '<path fill="#2AABEE" d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>',
  mail: '<rect x="2.5" y="5" width="19" height="14.5" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.8"></rect><path d="M3.5 6l8.5 6.5 8.5-6.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path>',
  copy: '<rect x="9" y="9" width="13" height="13" rx="2" ry="2" fill="none" stroke="currentColor" stroke-width="1.8"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path>',
  check: '<polyline points="20 6 9 17 4 12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"></polyline>',
  cal: '<rect x="3" y="4.5" width="18" height="17" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"></rect><path d="M8 2.5v4M16 2.5v4M3 10h18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path>'
};
function sBtn(tag, href, body, title){
  var el = document.createElement(tag);
  el.className = "sbtn";
  el.title = title; el.setAttribute("aria-label", title);
  if(tag === "a"){ el.href = href; el.target = "_blank"; el.rel = "noopener"; }
  else el.type = "button";
  el.innerHTML = '<svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true">' + body + '</svg>';
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
      cb.innerHTML = '<svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true">' + S_ICONS.check + '</svg>'; cb.title = T("copied"); cb.setAttribute("aria-label", T("copied"));
      setTimeout(function(){ cb.innerHTML = '<svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true">' + S_ICONS.copy + '</svg>'; cb.title = T("copy"); cb.setAttribute("aria-label", T("copy")); }, 1600);
    };
    if(navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(raw).then(ok, function(){ fallbackCopy(raw); ok(); });
    } else { fallbackCopy(raw); ok(); }
  };
  row.appendChild(cb);
  return row;
}
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
  return "⏳ " + fmtNum(h) + ":" + fmtNum(m);
}
// Static local kickoff time — the bigbar is the ONE live countdown; everywhere
// else shows a stable time so the page stays quiet (no per-second reflow).
function fmtKick(iso){
  try{
    var t = new Date(iso).toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit",timeZone:curTz()});
    return "🕒 " + fmtNum(t);
  }catch(e){ return ""; }
}
function keyOf(m){ return (m.id||"")+"|"+((m.status||"")[0]||"")+(m.score?(m.score.home+"-"+m.score.away):"")+m.utcDate; }
function listSig(list){ var s=""; for(var i=0;i<(list||[]).length;i++) s+=keyOf(list[i])+";"; return s; }
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
    var hName = document.createElement("div"); hName.className = "team"; hName.textContent = en ? m.homeTeam.name : (m.homeTeam.faName || m.homeTeam.name);
    var aName = document.createElement("div"); aName.className = "team"; aName.textContent = en ? m.awayTeam.name : (m.awayTeam.faName || m.awayTeam.name);
    var hs = document.createElement("div"); hs.className = "side"; hs.appendChild(h); hs.appendChild(hName);
    var as = document.createElement("div"); as.className = "side away"; as.appendChild(aName); as.appendChild(a);
    var vs = document.createElement("div"); vs.className = "vs";
    var live = !finished && (m.status==="LIVE"||m.status==="IN_PLAY"||m.status==="PAUSED");
    if((finished || live) && m.score && m.score.home !== null){
      vs.className = "score";
      vs.textContent = fmtNum(m.score.home) + " - " + fmtNum(m.score.away);
    } else { vs.textContent = "🆚"; }
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
    if(m.top){ var tb = document.createElement("span"); tb.className = "topbadge"; tb.textContent = "🔥 " + T("topBadge"); info.appendChild(tb); }
    info.appendChild(document.createTextNode(fmtDate(m.utcDate)));
    if(live){
      var chip = document.createElement("span"); chip.className = "livechip";
      var dot = document.createElement("span"); dot.className = "dot";
      chip.appendChild(dot); chip.appendChild(document.createTextNode(T("live")));
      info.appendChild(chip);
      if(m.minute != null){
        var lmin = document.createElement("span"); lmin.className = "lmin"; lmin.textContent = fmtNum(m.minute) + "ʹ";
        info.appendChild(lmin);
      }
    } else if(!finished){
      var cd = document.createElement("span"); cd.className = "countdown"; cd.textContent = fmtKick(m.utcDate);
      info.appendChild(cd);
    }
    if(live && m.scorers && m.scorers.length){
      var sc = document.createElement("div"); sc.className = "scorers";
      m.scorers.forEach(function(s){
        var row = document.createElement("div"); row.className = "srow";
        var icon = s.type==="PENALTY" ? "🎯" : (s.type==="OWN_GOAL" ? "🥅" : "⚽");
        var lbl = s.type==="PENALTY" ? T("pen") : (s.type==="OWN_GOAL" ? T("own") : "");
        row.textContent = icon + " " + fmtNum(s.minute) + "ʹ ";
        if(s.scorer) row.appendChild(document.createTextNode(s.scorer));
        if(lbl) row.appendChild(document.createTextNode(" (" + lbl + ")"));
        var t = scorerTeam(m, s.team);
        if(t) row.appendChild(document.createTextNode(" — " + t));
        sc.appendChild(row);
      });
      info.appendChild(sc);
    }
    if(m.venue){ var vn = document.createElement("span"); vn.className = "venue"; vn.textContent = "🏟️ " + m.venue; info.appendChild(vn); }
    var sr = shareRow(m, finished); info.appendChild(sr);
    row.appendChild(hs); row.appendChild(vs); row.appendChild(as);
    var wrap = document.createElement("div"); wrap.className = "mrow"; wrap.appendChild(row); wrap.appendChild(info);
    el.appendChild(wrap);
  });
}
async function load(){
  try{
    var r = await fetch("/api/public-matches");
    if(!r.ok) throw new Error("HTTP " + r.status);
    var d = await r.json();
    DATA = { upcoming: d.upcoming || [], finished: d.finished || [], nextBig: d.nextBig || null, topSpot: d.topSpot || null, standings: d.standings || null, cups: d.cups || null, ucl: d.ucl || null };
    applyView();
    updateBigBar();
    renderStandings(d.standings);
    renderCups(d.cups);
    renderUcl(d.ucl);
    renderUclSpot(d.ucl);
    renderTopSpot(d.topSpot);
    renderHeroSpot();
  }catch(e){
    ["ucl","standings","cups","finished"].forEach(function(id){
      var el = document.getElementById(id);
      if(el) el.innerHTML = "<div class='empty'>"+T("errLoad")+"</div>";
    });
    renderTopSpot(null);
    renderHeroSpot();
  }
}
var DATA = { upcoming: [], finished: [], nextBig: null, topSpot: null, standings: null, cups: null };
var FLAGS = { PL: "🏴", PD: "🇪🇸", SA: "🇮🇹", FL1: "🇫🇷", BL1: "🇩🇪", PGL: "🇮🇷" };
function initTz(){
  var sel = document.getElementById("tzsel");
  if(!sel) return;
  TZ_ALL = buildTzAll();
  var filter = document.getElementById("tzfilter");
  var render = function(){
    var q = (filter && filter.value || "").trim().toLowerCase();
    sel.innerHTML = "";
    var groups = {};
    TZ_ALL.forEach(function(tz){
      var g = tz.indexOf("/") > 0 ? tz.split("/")[0] : "General";
      (groups[g] = groups[g] || []).push(tz);
    });
    Object.keys(groups).sort().forEach(function(g){
      var og = document.createElement("optgroup"); og.label = g;
      groups[g].forEach(function(tz){
        var lbl = tzLabel(tz);
        if(q && lbl.toLowerCase().indexOf(q) < 0) return;
        var o = document.createElement("option"); o.value = tz; o.textContent = lbl;
        og.appendChild(o);
      });
      if(og.children.length) sel.appendChild(og);
    });
    try{ sel.value = curTz(); }catch(e){}
  };
  render();
  if(filter) filter.oninput = render;
  sel.onchange = function(){
    try{ localStorage.setItem("ucl_tz", sel.value); }catch(e){}
    rerenderAll();
  };
}
function rerenderAll(){
  applyView();
  renderStandings(DATA.standings);
  renderCups(DATA.cups);
  renderUcl(DATA.ucl);
  renderUclSpot(DATA.ucl);
  renderTopSpot(DATA.topSpot);
  renderHeroSpot();
  updateBigBar();
}
// v12.12: catOf/renderSections (and the CAT_CUPS table) are retired — they
// fed the «📅 مسابقات پیش‌رو» sections list, which is gone together with the
// view toggle (the page is always big-only now; the hero + the topspot box
// + the UCL box ARE the presentation).
function matchKey(m){ return String(m.id||"") + "|" + m.utcDate; }
// v12.12: the view toggle is RETIRED — the page is permanently big-only
// («فقط بازی‌های بزرگ», the user's default). The «📅 مسابقات پیش‌رو» list
// card is retired with it: the hero card, the topspot box and the UCL box
// ARE the upcoming presentation. All that remains of the old per-view
// rendering is the finished card — the week's selected-team results.
function applyView(){
  render(DATA.finished.filter(function(m){ return m.big || m.top || m.clash || m.sel; }), document.getElementById("finished"), true);
}
// v12.10: renderSpecial removed — the far nextBig fallback card now lives
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
  // v12.5: PGL joins the grid — the Iran card's table moved here.
  // v12.12: A-League (AL) removed (the user's ask) — six boxes remain.
  ["PL","PD","SA","FL1","BL1","PGL"].forEach(function(code){
    var st = d[code], box = document.createElement("div"); box.className = "stbox";
    var h = document.createElement("div"); h.className = "stbox-head";
    if(FLAGS[code]) h.appendChild(document.createTextNode(FLAGS[code] + " "));
    if(st && st.emblem){ var img = document.createElement("img"); img.src = st.emblem; img.alt = ""; img.onerror = function(){ this.remove(); }; h.appendChild(img); }
    h.appendChild(document.createTextNode(compOf(st) || code));
    if(st && st.started === false){
      var first = firstMatchOf(code);
      var ov = document.createElement("div"); ov.className = "stnot-overlay";
      var l = document.createElement("div"); l.className = "stnot-ovl-label"; l.textContent = T("stNot");
      ov.appendChild(l);
      if(first){
        var trow = document.createElement("div"); trow.className = "stnot-ovl-timer";
        trow.appendChild(document.createTextNode(curLang()==="en" ? "First match: " : "اولین بازی: "));
        trow.appendChild(document.createTextNode(fmtKick(first.utcDate)));
        ov.appendChild(trow);
      }
      box.appendChild(ov);
    }
    box.appendChild(h);
    if(st && st.teams && st.teams.length){
      st.teams.forEach(function(t){
        var r = document.createElement("div"); r.className = "strow";
        var p = document.createElement("span"); p.className = "stpos" + (t.pos<=3 ? " top3" : ""); p.textContent = fmtNum(t.pos);
        var n = document.createElement("span"); n.className = "stname"; n.textContent = curLang()==="en" ? t.name : (t.faName||t.name);
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
  h.appendChild(document.createTextNode(compOf(c) + (c.qualifying ? (curLang()==="en" ? " (Qualifying)" : " (مقدماتی)") : "")));
  var tierEm = c.tier === "gold" ? "🥇 " : c.tier === "silver" ? "🥈 " : c.tier === "bronze" ? "🥉 " : "";
  h.appendChild(document.createTextNode(tierEm));
  box.appendChild(h);
  if(c.next){
    var n = c.next, en = curLang()==="en";
    var m = document.createElement("div"); m.className = "cupmatch";
    var teams = document.createElement("div"); teams.className = "teams";
    teams.textContent = (en ? n.homeTeam.name : (n.homeTeam.faName||n.homeTeam.name)) + " 🆚 " + (en ? n.awayTeam.name : (n.awayTeam.faName||n.awayTeam.name));
    m.appendChild(teams);
    var live = n.status==="LIVE"||n.status==="IN_PLAY"||n.status==="PAUSED";
    var dt = document.createElement("div"); dt.className = "cupdate";
    if(live){ var sp = document.createElement("span"); sp.className = "live-tag"; sp.textContent = "🔴 "+T("live"); dt.appendChild(sp); }
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
  // cups) — one group; international cups (WC/Euro/...) another; per-country
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
  var countryKey = { EN: "cEN", ES: "cES", IT: "cIT", IR: "cIR" };
  // v12.6: Iran closes the country groups — جام حذفی ایران lives here now
  // (the old Iran card's Hazfi box, reborn inside the cups grid).
  ["EN","ES","IT","IR"].forEach(function(cc){ if(dom[cc]) groups.push({ title: T(countryKey[cc]), items: dom[cc] }); });
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
// Swiss-model standings, not truncated). Gold-styled, sits above the domestic
// leagues because UCL matters more than all of them combined.
function renderUcl(d){
  var el = document.getElementById("ucl"); if(!el) return;
  el.innerHTML = "";
  if(!d){ el.innerHTML = "<div class='empty'>"+T("errLoad")+"</div>"; return; }
  var head = document.createElement("div"); head.className = "ucl-head";
  if(d.emblem){ var ei = document.createElement("img"); ei.className="ucl-emblem"; ei.src=d.emblem; ei.alt=""; ei.onerror=function(){this.remove();}; head.appendChild(ei); }
  if(d.matchday){ var md = document.createElement("span"); md.className="ucl-md"; md.textContent = (curLang()==="en"?"Matchday ":"هفته ")+fmtNum(d.matchday); head.appendChild(md); }

  if(head.childNodes.length) el.appendChild(head);
  // v12.12: the all-fixtures list is GONE from this card (Sabah FK 🆚 SK
  // Slavia Praha noise) — upcoming CL fixtures live in the uclspot box above
  // (≥1 selected club, up to 8). This card is standings-only now.
  var wrap = document.createElement("div"); wrap.className = "ucl-stand-wrap";
  var st = document.createElement("div"); st.className = "ucl-stand";
  if(d.started === false){
    var ov = document.createElement("div"); ov.className = "stnot-overlay";
    var l = document.createElement("div"); l.className = "stnot-ovl-label"; l.textContent = T("stNot");
    ov.appendChild(l);
    var firstDate = (d.matches && d.matches.length) ? d.matches[0].utcDate : (d.firstStart || null);
    if(firstDate){
      var trow = document.createElement("div"); trow.className = "stnot-ovl-timer";
      trow.appendChild(document.createTextNode(curLang()==="en" ? "First match: " : "اولین بازی: "));
      trow.appendChild(document.createTextNode(fmtKick(firstDate)));
      ov.appendChild(trow);
    }
    wrap.appendChild(ov);
  }
  if(d.teams && d.teams.length){
    d.teams.forEach(function(t){
      var r = document.createElement("div"); r.className = "strow";
      var p = document.createElement("span"); p.className = "stpos" + (t.pos<=8 ? " top3" : ""); p.textContent = fmtNum(t.pos);
      var n = document.createElement("span"); n.className = "stname"; n.textContent = curLang()==="en" ? t.name : (t.faName||t.name);
      var pt = document.createElement("span"); pt.className = "stpts"; pt.textContent = fmtNum(t.points);
      r.appendChild(p); r.appendChild(n); r.appendChild(pt);
      st.appendChild(r);
    });
  } else {
    var e2 = document.createElement("div"); e2.className = "stempty"; e2.textContent = T("stEmpty");
    st.appendChild(e2);
  }
  wrap.appendChild(st);
  el.appendChild(wrap);
}
// v12.12: the UCL box is GENERALIZED (the user's ask) — up to EIGHT upcoming
// CL fixtures in strict kickoff order (live first; "two important today, two
// important tomorrow"), and ONLY matches with ≥1 SELECTED club: the server
// filters (Sabah FK 🆚 SK Slavia Praha is noise and never boxes). Same
// spotitem anatomy as the topspot box + hero, so the page stays uniform
// (v12.11). Pre-draw: the wait state counts to the projected first kickoff;
// otherwise the card hides when the box is empty.
function renderUclSpot(d){
  var card = document.getElementById("uclSpotCard"), el = document.getElementById("uclSpot");
  if(!el) return;
  el.innerHTML = "";
  var list = (d && d.matches && d.matches.length) ? d.matches.slice(0, 8) : [];
  if(!list.length){
    if(d && d.firstStart){
      if(card) card.style.display = "";
      var fw = document.createElement("div"); fw.className = "uclspot-wait";
      var fl = document.createElement("div"); fl.className = "stnot-ovl-label"; fl.textContent = T("stNot");
      fw.appendChild(fl);
      var ft = document.createElement("div"); ft.className = "stnot-ovl-timer";
      ft.appendChild(document.createTextNode(curLang()==="en" ? "First match: " : "اولین بازی: "));
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
    el.appendChild(spotItemNode(m, idx));
  });
}
// v12.3/v12.4/v12.7/v12.8/v12.12 TOP BOX (league): the consolidated
// big-matches card — up to TEN entries + the hero's slot 1 (the user's ask;
// e.g. the Madrid derby and the Manchester derby in the SAME box). The
// server picks TRUE big matches only (A: two selected teams;
// B: both sides top-3 — صدر جدول; C: derby; fallback: a selected team vs a
// top-5 side of that league) and orders them STRICTLY by kickoff — live first
// (kickoff in the past), then the closest upcoming on top. v12.10: slot 1 —
// the countdown's own match — renders in the HERO CARD at the very top (the
// bar and its match stuck together); this box carries the REMAINING entries.
// v12.12: spotItemNode is the shared anatomy of the hero, the topspot box AND
// the generalized UCL box (live score + LIVE chip, BOTH tags — a fixture that
// is a derby AND a top-of-the-table clash shows both badges). The card hides
// when nothing qualifies; box fixtures are excluded from the upcoming list
// server-side — this box IS their presentation. Stale KV payloads (≤5 min)
// may still carry the old single-match shape {next:…} — accepted for rollout.
function spotItemNode(m, idx){
  var item = document.createElement("div"); item.className = "spotitem";
  var row = document.createElement("div"); row.className = "match";
  if(m.derby) row.className += " derby";
  row.style.setProperty("--i", idx);
  var en = curLang()==="en";
  var hName = document.createElement("div"); hName.className = "team"; hName.textContent = en ? m.homeTeam.name : (m.homeTeam.faName || m.homeTeam.name);
  var aName = document.createElement("div"); aName.className = "team"; aName.textContent = en ? m.awayTeam.name : (m.awayTeam.faName || m.awayTeam.name);
  var hs = document.createElement("div"); hs.className = "side"; hs.appendChild(logo(m.homeTeam)); hs.appendChild(hName);
  var as = document.createElement("div"); as.className = "side away"; as.appendChild(aName); as.appendChild(logo(m.awayTeam));
  var vs = document.createElement("div"); vs.className = "vs";
  var live = m.status==="LIVE"||m.status==="IN_PLAY"||m.status==="PAUSED";
  if(live && m.score && m.score.home !== null){ vs.className = "score"; vs.textContent = fmtNum(m.score.home) + " - " + fmtNum(m.score.away); }
  else { vs.textContent = "🆚"; }
  row.appendChild(hs); row.appendChild(vs); row.appendChild(as);
  item.appendChild(row);
  var info = document.createElement("div"); info.className = "uclspot-info";
  var c = document.createElement("span"); c.className = "comp";
  if(m.competition && m.competition.emblem){ var cimg = document.createElement("img"); cimg.className="complogo"; cimg.src=m.competition.emblem; cimg.alt=""; cimg.loading="lazy"; cimg.decoding="async"; cimg.onerror=function(){this.remove();}; c.appendChild(cimg); }
  c.appendChild(document.createTextNode(compName(m)));
  info.appendChild(c);
  // v12.7 tag rule: a match can be BOTH a derby and a top-of-the-table
  // clash — each badge renders independently, never either/or.
  if(m.derby){ var db = document.createElement("span"); db.className = "derbybadge"; db.textContent = T("derby"); info.appendChild(db); }
  if(m.top){ var tb = document.createElement("span"); tb.className = "topbadge"; tb.textContent = "🔥 " + T("topBadge"); info.appendChild(tb); }
  info.appendChild(document.createTextNode(fmtDate(m.utcDate)));
  if(live){
    var chip = document.createElement("span"); chip.className = "livechip";
    var dot = document.createElement("span"); dot.className = "dot";
    chip.appendChild(dot); chip.appendChild(document.createTextNode(T("live")));
    info.appendChild(chip);
    if(m.minute != null){ var lmin = document.createElement("span"); lmin.className = "lmin"; lmin.textContent = fmtNum(m.minute) + "ʹ"; info.appendChild(lmin); }
  } else {
    var cd = document.createElement("span"); cd.className = "countdown"; cd.textContent = fmtKick(m.utcDate);
    info.appendChild(cd);
  }
  if(m.venue){ var vn = document.createElement("span"); vn.className="venue"; vn.textContent="🏟️ " + m.venue; info.appendChild(vn); }
  item.appendChild(info);
  var sr = shareRow(m, false); item.appendChild(sr);
  return item;
}
// v12.10/v12.11 HERO: renders the countdown's OWN match (barTarget — box
// top, live entries leading) stuck directly under the countdown bar inside
// the hero card — the card the bar belongs to. Same spotitem anatomy as the
// box entries so the headline and the box share one visual language.
// v12.11: always a plain "card bighero" — no golden topspot chrome; the
// countdown's match row looks exactly like every other match row.
function renderHeroSpot(){
  var card = document.getElementById("bigHeroCard"), el = document.getElementById("heroSpot");
  if(!card || !el) return;
  el.innerHTML = "";
  card.className = "card bighero";
  var m = barTarget().m;
  if(m) el.appendChild(spotItemNode(m, 0));
}
function renderTopSpot(d){
  var card = document.getElementById("topspotCard"), el = document.getElementById("topSpot");
  if(!card || !el) return;
  el.innerHTML = "";
  // v12.12: capacity raised — the server sends up to ELEVEN big matches
  // (the user's ask: the box shows up to TEN after the hero takes slot 1).
  var list = d && d.matches && d.matches.length ? d.matches.slice(0, 11) : (d && d.next ? [d.next] : []);
  // v12.10: slot 1 — the closest upcoming big match, the countdown's own
  // match — lives in the HERO CARD above, stuck to the countdown bar; this
  // box presents the REMAINING big matches, separated from the headline.
  var rest = list.slice(1);
  if(!rest.length){ card.style.display = "none"; return; }
  card.style.display = "";
  rest.forEach(function(m, idx){
    el.appendChild(spotItemNode(m, idx + 1));
  });
}
// v12.5: renderIran/initIran/toggleIran removed — the Iran card is retired
// and the PGL table renders through renderStandings like every other league.
// v12.12: setView is retired with the view toggle — the page is always
// big-only (a stored ucl_view preference is ignored and never re-read).
function scorerTeam(m, teamName){
  if(!teamName) return "";
  var en = curLang()==="en";
  var norm = function(s){ return String(s||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\b(fc|cf|sc|ac|as|ssc|bc|ud|cd|kv|jc)\b/g," ").replace(/[^a-z0-9]/g,""); };
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
  var dd = fmtNum(d)+" "+T("uDay"), hh = fmtNum(h)+":"+fmtNum(m)+":"+fmtNum(s);
  if(d) return dd+" "+(en?" ":" و ")+hh;
  if(h) return hh;
  if(m) return fmtNum(m)+":"+fmtNum(s);
  return fmtNum(s)+" "+T("uSec");
}
// v12.10: the ONE pick the countdown bar AND the hero card agree on — box
// top (closest upcoming big match; live entries lead) → far nextBig →
// nearest big upcoming → plain upcoming[0]. renderHeroSpot renders exactly
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
      tr = document.getElementById("bigbarTrack");
  if(!card||!fill||!lbl||!clk) return;
  // v12.8/v12.10: the countdown belongs to the match on TOP of the big
  // matches presentation — the hero card right under this bar (box top,
  // kickoff-sorted, so the closest upcoming big match; live entries lead,
  // kickoff in the past). Stale KV (≤3 min) may still carry the legacy
  // single-match shape {next:…}.
  var t = barTarget(), next = t.m;
  if(!next){
    lbl.textContent = T("barIdle"); clk.textContent = "--:--:--";
    fill.className = "bigbar-fill idle";
    if(tr) tr.setAttribute("aria-valuenow", "0");
    card.style.display = ""; return;
  }
  var isBig = t.big;
  var kick = new Date(next.utcDate).getTime(), rem = kick - Date.now(),
      live = next.status==="LIVE"||next.status==="IN_PLAY"||next.status==="PAUSED"||rem<=0;
  lbl.textContent = live ? T("barLive") : (isBig?T("barNext"):T("barFallback"));
  if(live){
    fill.className = "bigbar-fill live"; fill.style.width = "100%";
    clk.textContent = "-:--:--";
    if(tr) tr.setAttribute("aria-valuenow", "100");
  }else{
    var q = 1 - rem/(14*864e5);
    if(q<0) q=0; if(q>1) q=1;
    fill.className = "bigbar-fill";
    fill.style.width = Math.max(2, Math.round(q*100)) + "%";
    clk.textContent = fmtCountdown(rem);
    if(tr) tr.setAttribute("aria-valuenow", Math.round(q*100));
  }
  card.style.display = "";
}
function tickBigBar(){ if(DATA && DATA.upcoming) updateBigBar(); }
var onLang = load;
setTheme(initTheme()); applyLang(true); initTz(); load();
setInterval(load, 60000);
setInterval(tickBigBar, 1000);
</script>
</body>
</html>`;
var LOGIN_PAGE = `<!doctype html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<script>try{var t=localStorage.getItem("ucl_theme")||(matchMedia("(prefers-color-scheme:light)").matches?"light":"dark"),l=localStorage.getItem("ucl_lang")||"fa",d=document.documentElement;d.setAttribute("data-theme",t);d.setAttribute("lang",l);d.setAttribute("dir",l==="en"?"ltr":"rtl");}catch(e){}</script>
<title data-i="titleL">ورود — مدیریت ربات</title>
<style>@font-face{font-family:Vazirmatn;src:url('/fonts/Vazirmatn-Regular.woff2') format('woff2');font-weight:400;font-display:swap}@font-face{font-family:Vazirmatn;src:url('/fonts/Vazirmatn-Medium.woff2') format('woff2');font-weight:500;font-display:swap}@font-face{font-family:Vazirmatn;src:url('/fonts/Vazirmatn-SemiBold.woff2') format('woff2');font-weight:600;font-display:swap}@font-face{font-family:Vazirmatn;src:url('/fonts/Vazirmatn-Bold.woff2') format('woff2');font-weight:700;font-display:swap}@font-face{font-family:Vazirmatn;src:url('/fonts/Vazirmatn-ExtraBold.woff2') format('woff2');font-weight:800;font-display:swap}</style>
<style>
:root{color-scheme:dark;--bg:#0f172a;--card:#1e293b;--field:#0f172a;--text:#e2e8f0;--muted:#94a3b8;--border:#334155;--accent:#2563eb;--accent-strong:#1d4ed8;--link:#93c5fd;--score:#4ade80;--countdown:#93c5fd;--countdown-bg:rgba(96,165,250,.12);--danger:#f87171;--chip:#334155;--hover:rgba(148,163,184,.08);--footer:#94a3b8;--glass:rgba(30,41,59,.55);--glass-border:rgba(148,163,184,.16);--glass-hi:rgba(255,255,255,.07);--glass-shadow:0 8px 32px rgba(0,0,0,.35);--glow1:rgba(37,99,235,.17);--glow2:rgba(29,78,216,.11);--scrim:rgba(2,6,23,.62)}
[data-theme="light"]{color-scheme:light;--bg:#f8fafc;--card:#ffffff;--field:#f8fafc;--text:#0f172a;--muted:#64748b;--border:#e2e8f0;--accent:#2563eb;--accent-strong:#1d4ed8;--link:#1d4ed8;--score:#15803d;--countdown:#2563eb;--countdown-bg:rgba(37,99,235,.1);--danger:#dc2626;--chip:#e2e8f0;--hover:rgba(15,23,42,.045);--footer:#64748b;--glass:rgba(255,255,255,.62);--glass-border:rgba(15,23,42,.08);--glass-hi:rgba(255,255,255,.7);--glass-shadow:0 8px 32px rgba(15,23,42,.08);--glow1:rgba(37,99,235,.09);--glow2:rgba(96,165,250,.08);--scrim:rgba(248,250,252,.78)}
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
<h1 data-i="loginH1">🔐 ورود به مدیریت ربات</h1>
<label for="user" data-i="lbUser">نام کاربری</label>
<input id="user" name="username" autocomplete="username" data-p="lbUser">
<label for="pass" data-i="lbPass">رمز عبور</label>
<input id="pass" name="password" type="password" autocomplete="current-password" data-p="lbPass">
<button id="btnLogin" onclick="doLogin()" data-i="btnLogin">ورود</button>
<div class="err" id="err" role="alert"></div>
</div>
<script>
var I18N={
fa:{title:"مسابقات پیش‌رو — اعلان‌دهنده مسابقات",h1:"⚽ اعلان‌دهنده مسابقات",sub1:"مسابقات پیش‌رو، رقابت‌های صدر جدول و نتایج تیم‌های منتخب — به‌روزرسانی خودکار",join:"در تلگرام به ربات بپیوندید و اعلان بگیرید",hUpcoming:"📅 مسابقات پیش‌رو",hFinished:"🏁 نتایج اخیر",loading:"در حال بارگذاری...",noMatches:"مسابقه‌ای در راه نیست",errLoad:"خطا در دریافت داده‌ها",madeWith:"ساخته‌شده با ❤️",adminLink:"ورود مدیریت",botLink:"ربات تلگرام",soon:"به‌زودی",inDays:"در %d روز",barNext:"⚡ تا بازی بزرگ بعدی",barFallback:"⏳ تا مسابقه بعدی",barLive:"🔴 در جریان",barIdle:"⏳ در انتظار بازی بعدی",uDay:"روز",uHour:"ساعت",uMin:"دقیقه",uSec:"ثانیه",live:"در حال برگزاری",pen:"پنالتی",own:"گل به خودی",derby:"🔥 دربی",boxCl:"🏆 لیگ قهرمانان اروپا",boxCup:"🏆 جام‌های حذفی",boxLg:"⚽ لیگ‌های داخلی",viewBig:"⚡ فقط بازیهای بزرگ",viewAll:"همه بازیها",hStandings:"📊 جدول لیگ‌ها",hCups:"🏆 جام‌های حذفی",stEmpty:"جدول هنوز در دسترس نیست",stNot:"شروع نشده",tierGold:"🥇 سطح طلا — اروپا و بینالملل",tierSilver:"🥈 سطح نقره — اروپا",tierBronze:"🥉 سطح برنز — اروپا",cEN:"🏴 انگلستان",cES:"🇪🇸 اسپانیا",cIT:"🇮🇹 ایتالیا",cupsNone:"در انتظار برنامه",share:"اشتراک‌گذاری",copy:"کپی متن",copied:"کپی شد ✓",titleL:"ورود — مدیریت ربات",loginH1:"🔐 ورود به مدیریت ربات",lbUser:"نام کاربری",lbPass:"رمز عبور",btnLogin:"ورود",errUser:"نام کاربری را وارد کنید",errRate:"تلاش بیش از حد — چند دقیقه دیگر امتحان کنید",errCreds:"نام کاربری یا رمز اشتباه است",titleA:"تنظیمات ربات اعلان مسابقات",h1A:"⚙️ تنظیمات ربات اعلان مسابقات",hLogin:"🔑 ورود",tokenPh:"رمز عبور مدیریت (admin password)",hStatus:"📊 وضعیت",stLoading:"در حال بارگذاری...",stErr:"❌ خطا در دریافت وضعیت — دوباره وارد شوید یا توکن را بررسی کنید",stLastRun:"🕒 آخرین اجرا",stApi:"📡 منبع API",stUsers:"👥 کاربران",stIds:"🆔 شناسه‌ها",stTz:"🌍 منطقه زمانی",btnRefresh:"به‌روزرسانی وضعیت",btnTest:"📨 ارسال پیام تست",btnSim:"🧪 شبیه‌سازی ۵ اعلان",btnSources:"📡 بررسی منابع API",btnLogout:"🚪 خروج",hBroadcast:"📣 ارسال پیام به همه کاربران",lbBroadcast:"متن پیام (به فارسی یا انگلیسی)",bcPh:"متن پیام...",btnBroadcast:"📣 ارسال برای همه",hMatches:"⚽ مسابقات پیش‌رو",btnRefreshM:"به‌روزرسانی مسابقات",hSettings:"⚙️ تنظیمات",lbTz:"منطقه زمانی",lbLeagues:"لیگ‌های تحت پوشش (کدها با کاما)",elNote:"EL و ECL توسط SportScore پوشش داده می‌شوند و نیازی به افزودن ندارند.",lbTeams:"تیم‌های منتخب هر لیگ",teamPh:"نام تیم جدید",btnAdd:"+ افزودن",btnSave:"💾 ذخیره تنظیمات",btnBackup:"⬇️ پشتیبان‌گیری تنظیمات",hPass:"🔑 تغییر رمز عبور",lbNp1:"رمز جدید (حداقل ۸ کاراکتر)",lbNp2:"تکرار رمز جدید",btnCp:"تغییر رمز عبور",ver:"نسخه ۱۲.۱۵ — نام یکپارچه باشگاه‌ها + انتخاب خودکار UCL",mToken:"ورود نامعتبر — رمز عبور یا نشست منقضی شده",mErr:"خطا: ",mEnterToken:"رمز عبور را وارد کنید",mSaved:"✅ ذخیره شد",mLoginFirst:"ابتدا وارد شوید",mBackup:"⬇️ پشتیبان‌گیری شد",mPassShort:"رمز باید حداقل ۸ کاراکتر باشد",mPassMismatch:"رمزها یکسان نیستند",mPassOk:"🔑 رمز با موفقیت تغییر کرد",mSentTo:"📣 ارسال شد به %s از %s کاربر",mTestSent:"📨 تست ارسال شد به %s کاربر",mSimPrefix:"🧪 شبیه‌سازی: ",mNoNotif:"⚠️ هیچ اعلانی ارسال نشد",mNoMatches:"مسابقه‌ای در راه نیست",mErrMatches:"خطا در دریافت مسابقات",mEnterText:"متن پیام را وارد کنید",mErrSrc:"❌ خطا",acHint:"💡 هنگام تایپ، نام دقیق باشگاه از فهرست API پیشنهاد می‌شود — برای ثبت بی‌خطا یکی را انتخاب کنید.",acNone:"باشگاهی با این نام در فهرست نیست",acAdd:"✅ %s افزوده شد",acAddUcl:"✅ %s افزوده شد — برای لیگ قهرمانان اروپا هم انتخاب شد",uclSync:"باشگاه‌های هر لیگ به‌صورت خودکار برای لیگ قهرمانان اروپا هم انتخاب می‌شوند",acDup:"⚠️ %s از قبل در این لیگ هست",btnClubs:"🔄 به‌روزرسانی فهرست باشگاه‌ها",clubsMeta:"فهرست باشگاه‌ها: %s باشگاه — آخرین بروزرسانی: %s",clubsNone:"⚠️ فهرست باشگاه‌ها هنوز ساخته نشده — دکمه بروزرسانی را بزنید",mClubs:"✅ فهرست باشگاه‌ها بروزرسانی شد (%s باشگاه)",clubsErr:"❌ فهرست باشگاه‌ها در دسترس نیست"},
en:{title:"Upcoming Matches — Match Notifier",h1:"⚽ Match Notifier",sub1:"Fixtures, top-of-the-table clashes & results — auto-refreshed",join:"Join the Telegram bot to get notified",hUpcoming:"📅 Upcoming Matches",hFinished:"🏁 Recent Results",loading:"Loading...",noMatches:"No matches ahead",errLoad:"Error loading data",madeWith:"Made with ❤️",adminLink:"Admin login",botLink:"Telegram bot",soon:"Soon",inDays:"in %d days",barNext:"⚡ Until the next big match",barFallback:"⏳ Until the next match",barLive:"🔴 Live now",barIdle:"⏳ Waiting for the next match",uDay:"d",uHour:"h",uMin:"m",uSec:"s",live:"LIVE",pen:"Penalty",own:"Own goal",derby:"🔥 Derby",boxCl:"🏆 Champions League",boxCup:"🏆 Elimination Cups",boxLg:"⚽ Domestic Leagues",viewBig:"⚡ Big matches only",viewAll:"All matches",hStandings:"📊 League Standings",hCups:"🏆 Tournaments",stEmpty:"Standings not available yet",stNot:"Not started",tierGold:"🥇 Gold tier — Europe & international",tierSilver:"🥈 Silver tier — Europe",tierBronze:"🥉 Bronze tier — Europe",cEN:"🏴 England",cES:"🇪🇸 Spain",cIT:"🇮🇹 Italy",cupsNone:"No fixture yet",share:"Share",copy:"Copy text",copied:"Copied ✓",titleL:"Login — Bot Admin",loginH1:"🔐 Bot Admin Login",lbUser:"Username",lbPass:"Password",btnLogin:"Login",errUser:"Enter your username",errRate:"Too many attempts — try again in a few minutes",errCreds:"Wrong username or password",titleA:"Match Bot Settings",h1A:"⚙️ Bot Settings",hLogin:"🔑 Login",tokenPh:"Admin password",hStatus:"📊 Status",stLoading:"Loading...",stErr:"❌ Status error — re-login or check token",stLastRun:"🕒 Last run",stApi:"📡 API source",stUsers:"👥 Users",stIds:"🆔 IDs",stTz:"🌍 Timezone",btnRefresh:"Refresh status",btnTest:"📨 Send test message",btnSim:"🧪 Simulate 5 alerts",btnSources:"📡 Check API sources",btnLogout:"🚪 Logout",hBroadcast:"📣 Broadcast to all users",lbBroadcast:"Message text (FA or EN)",bcPh:"Message...",btnBroadcast:"📣 Send to all",hMatches:"⚽ Upcoming Matches",btnRefreshM:"Refresh matches",hSettings:"⚙️ Settings",lbTz:"Timezone",lbLeagues:"Leagues (comma-separated codes)",elNote:"EL & ECL are covered by SportScore — no need to add them.",lbTeams:"Selected teams per league",teamPh:"New team name",btnAdd:"+ Add",btnSave:"💾 Save settings",btnBackup:"⬇️ Backup settings",hPass:"🔑 Change password",lbNp1:"New password (min 8 chars)",lbNp2:"Repeat new password",btnCp:"Change password",ver:"v12.15 — uniform club names + auto UCL selection",mToken:"Invalid login — wrong password or expired session",mErr:"Error: ",mEnterToken:"Enter the admin password",mSaved:"✅ Saved",mLoginFirst:"Log in first",mBackup:"⬇️ Backup downloaded",mPassShort:"Password must be at least 8 characters",mPassMismatch:"Passwords do not match",mPassOk:"🔑 Password changed",mSentTo:"📣 Sent to %s of %s users",mTestSent:"📨 Test sent to %s users",mSimPrefix:"🧪 Simulate: ",mNoNotif:"⚠️ No notifications sent",mNoMatches:"No matches ahead",mErrMatches:"Error loading matches",mEnterText:"Enter a message",mErrSrc:"❌ error",acHint:"💡 As you type, the exact API club name is suggested — pick one to store it safely.",acNone:"No club with that name in the catalog",acAdd:"✅ %s added",acAddUcl:"✅ %s added — also selected for the Champions League",uclSync:"Clubs added in any league are auto-selected for the Champions League too",acDup:"⚠️ %s is already in this league",btnClubs:"🔄 Refresh club list",clubsMeta:"Club catalog: %s clubs — last updated: %s",clubsNone:"⚠️ Club catalog not built yet — press Refresh",mClubs:"✅ Club list refreshed (%s clubs)",clubsErr:"❌ Club list unavailable",comps:{CL:"Champions League",PL:"Premier League",PD:"La Liga",SA:"Serie A",FL1:"Ligue 1",BL1:"Bundesliga",EL:"Europa League",ECL:"Conference League",FA_CUP:"FA Cup",EFL_CUP:"EFL Cup",CDR:"Copa del Rey",COPPA_ITALIA:"Coppa Italia"}}};
function curLang(){try{return localStorage.getItem("ucl_lang")||"fa";}catch(e){return "fa";}}
function T(k){var l=curLang(),d=I18N[l];return (d&&d[k])||I18N.fa[k]||k;}
function fmt(k){var s=T(k);for(var i=1;i<arguments.length;i++)s=s.replace("%s",arguments[i]).replace("%d",arguments[i]);return s;}
function trText(){var l=curLang();document.querySelectorAll("[data-i]").forEach(function(el){el.textContent=T(el.getAttribute("data-i"));});}
function trPlace(){document.querySelectorAll("[data-p]").forEach(function(el){el.setAttribute("placeholder",T(el.getAttribute("data-p")));});}
function initTheme(){try{return localStorage.getItem("ucl_theme")||((window.matchMedia&&matchMedia("(prefers-color-scheme:light)").matches)?"light":"dark");}catch(e){return "dark";}}
function setTheme(t){document.documentElement.setAttribute("data-theme",t);try{localStorage.setItem("ucl_theme",t);}catch(e){}var b=document.getElementById("tbtn");if(b)b.textContent=t==="dark"?"🌙":"☀️";}
function toggleTheme(){setTheme(document.documentElement.getAttribute("data-theme")==="dark"?"light":"dark");}
function switchLang(){var l=curLang()==="fa"?"en":"fa";try{localStorage.setItem("ucl_lang",l);}catch(e){}applyLang();}
function applyLang(skipHook){var l=curLang();document.documentElement.setAttribute("lang",l);document.documentElement.setAttribute("dir",l==="en"?"ltr":"rtl");var b=document.getElementById("lbtn");if(b)b.textContent=l==="en"?"فا":"EN";trText();trPlace();if(!skipHook&&typeof onLang==="function")onLang();}
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
</script>
</body></html>`;
var ADMIN_PAGE = `<!doctype html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<script>try{var t=localStorage.getItem("ucl_theme")||(matchMedia("(prefers-color-scheme:light)").matches?"light":"dark"),l=localStorage.getItem("ucl_lang")||"fa",d=document.documentElement;d.setAttribute("data-theme",t);d.setAttribute("lang",l);d.setAttribute("dir",l==="en"?"ltr":"rtl");}catch(e){}</script>
<title data-i="titleA">تنظیمات ربات اعلان مسابقات</title>
<style>@font-face{font-family:Vazirmatn;src:url('/fonts/Vazirmatn-Regular.woff2') format('woff2');font-weight:400;font-display:swap}@font-face{font-family:Vazirmatn;src:url('/fonts/Vazirmatn-Medium.woff2') format('woff2');font-weight:500;font-display:swap}@font-face{font-family:Vazirmatn;src:url('/fonts/Vazirmatn-SemiBold.woff2') format('woff2');font-weight:600;font-display:swap}@font-face{font-family:Vazirmatn;src:url('/fonts/Vazirmatn-Bold.woff2') format('woff2');font-weight:700;font-display:swap}@font-face{font-family:Vazirmatn;src:url('/fonts/Vazirmatn-ExtraBold.woff2') format('woff2');font-weight:800;font-display:swap}</style>
<style>
:root{color-scheme:dark;--bg:#0f172a;--card:#1e293b;--field:#0f172a;--text:#e2e8f0;--muted:#94a3b8;--border:#334155;--accent:#2563eb;--accent-strong:#1d4ed8;--link:#93c5fd;--score:#4ade80;--countdown:#93c5fd;--countdown-bg:rgba(96,165,250,.12);--danger:#f87171;--chip:#334155;--hover:rgba(148,163,184,.08);--footer:#94a3b8;--glass:rgba(30,41,59,.55);--glass-border:rgba(148,163,184,.16);--glass-hi:rgba(255,255,255,.07);--glass-shadow:0 8px 32px rgba(0,0,0,.35);--glow1:rgba(37,99,235,.17);--glow2:rgba(29,78,216,.11);--scrim:rgba(2,6,23,.62)}
[data-theme="light"]{color-scheme:light;--bg:#f8fafc;--card:#ffffff;--field:#f8fafc;--text:#0f172a;--muted:#64748b;--border:#e2e8f0;--accent:#2563eb;--accent-strong:#1d4ed8;--link:#1d4ed8;--score:#15803d;--countdown:#2563eb;--countdown-bg:rgba(37,99,235,.1);--danger:#dc2626;--chip:#e2e8f0;--hover:rgba(15,23,42,.045);--footer:#64748b;--glass:rgba(255,255,255,.62);--glass-border:rgba(15,23,42,.08);--glass-hi:rgba(255,255,255,.7);--glass-shadow:0 8px 32px rgba(15,23,42,.08);--glow1:rgba(37,99,235,.09);--glow2:rgba(96,165,250,.08);--scrim:rgba(248,250,252,.78)}
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
<h1 data-i="h1A">⚙️ تنظیمات ربات اعلان مسابقات</h1>
<div class="card">
<h2 data-i="hLogin">🔑 ورود</h2>
<div class="row"><input id="token" type="password" autocomplete="off" onkeydown="if(event.key==='Enter')login()" data-p="tokenPh"><button onclick="login()" data-i="btnLogin">ورود</button></div>
</div>
<div class="card">
<h2 data-i="hStatus">📊 وضعیت</h2>
<div id="status">در حال بارگذاری...</div>
<button id="btnRefresh" onclick="refreshStatus()" data-i="btnRefresh">به‌روزرسانی وضعیت</button>
<button id="btnTest" onclick="sendTest()" data-i="btnTest">📨 ارسال پیام تست</button>
<button id="btnSim" onclick="simulate()" data-i="btnSim">🧪 شبیه‌سازی ۵ اعلان</button>
<button onclick="checkSources()" data-i="btnSources">📡 بررسی منابع API</button>
<button onclick="logout()" data-i="btnLogout">🚪 خروج</button>
</div>
<div class="card">
<h2 data-i="hBroadcast">📣 ارسال پیام به همه کاربران</h2>
<label data-i="lbBroadcast">متن پیام (به فارسی یا انگلیسی)</label>
<input id="broadcastText" data-p="bcPh">
<button id="btnBroadcast" onclick="broadcast()" data-i="btnBroadcast">📣 ارسال برای همه</button>
</div>
<div class="card">
<h2 data-i="hMatches">⚽ مسابقات پیش‌رو</h2>
<div id="matches">در حال بارگذاری...</div>
<button onclick="loadNextMatches()" data-i="btnRefreshM">به‌روزرسانی مسابقات</button>
</div>
<div class="card">
<h2 data-i="hSettings">⚙️ تنظیمات</h2>
<label data-i="lbTz">منطقه زمانی</label>
<input id="tz" placeholder="Asia/Tehran">
<label data-i="lbLeagues">لیگ‌های تحت پوشش (کدها با کاما)</label>
<input id="leagues" placeholder="CL,PL,PD,SA,FL1">
<div class="muted" data-i="elNote">EL و ECL توسط SportScore پوشش داده می‌شوند و نیازی به افزودن ندارند.</div>
<label data-i="lbTeams">تیم‌های منتخب هر لیگ</label>
<div id="teams"></div>
<div class="muted" data-i="acHint">💡 هنگام تایپ، نام دقیق باشگاه از فهرست API پیشنهاد می‌شود</div>
<div class="muted" id="clubsMeta"></div>
<button id="btnClubs" onclick="refreshClubs()" data-i="btnClubs">🔄 به‌روزرسانی فهرست باشگاه‌ها</button>
<button onclick="save()" data-i="btnSave">💾 ذخیره تنظیمات</button>
<button onclick="backup()" data-i="btnBackup">⬇️ پشتیبان‌گیری تنظیمات</button>
</div>
<div class="card">
<h2 data-i="hPass">🔑 تغییر رمز عبور</h2>
<label data-i="lbNp1">رمز جدید (حداقل ۸ کاراکتر)</label>
<input id="np1" type="password" autocomplete="new-password">
<label data-i="lbNp2">تکرار رمز جدید</label>
<input id="np2" type="password" autocomplete="new-password">
<button onclick="changePass()" data-i="btnCp">تغییر رمز عبور</button>
</div>
<div class="muted" data-i="ver">نسخه ۱۲.۱۵ — نام یکپارچه باشگاه‌ها + انتخاب خودکار UCL</div>
<div id="msg" role="status" aria-live="polite"></div>
<script>
var I18N={
fa:{title:"مسابقات پیش‌رو — اعلان‌دهنده مسابقات",h1:"⚽ اعلان‌دهنده مسابقات",sub1:"مسابقات پیش‌رو، رقابت‌های صدر جدول و نتایج تیم‌های منتخب — به‌روزرسانی خودکار",join:"در تلگرام به ربات بپیوندید و اعلان بگیرید",hUpcoming:"📅 مسابقات پیش‌رو",hFinished:"🏁 نتایج اخیر",loading:"در حال بارگذاری...",noMatches:"مسابقه‌ای در راه نیست",errLoad:"خطا در دریافت داده‌ها",madeWith:"ساخته‌شده با ❤️",adminLink:"ورود مدیریت",botLink:"ربات تلگرام",soon:"به‌زودی",inDays:"در %d روز",barNext:"⚡ تا بازی بزرگ بعدی",barFallback:"⏳ تا مسابقه بعدی",barLive:"🔴 در جریان",barIdle:"⏳ در انتظار بازی بعدی",uDay:"روز",uHour:"ساعت",uMin:"دقیقه",uSec:"ثانیه",live:"در حال برگزاری",pen:"پنالتی",own:"گل به خودی",derby:"🔥 دربی",boxCl:"🏆 لیگ قهرمانان اروپا",boxCup:"🏆 جام‌های حذفی",boxLg:"⚽ لیگ‌های داخلی",viewBig:"⚡ فقط بازیهای بزرگ",viewAll:"همه بازیها",hStandings:"📊 جدول لیگ‌ها",hCups:"🏆 جام‌های حذفی",stEmpty:"جدول هنوز در دسترس نیست",stNot:"شروع نشده",tierGold:"🥇 سطح طلا — اروپا و بینالملل",tierSilver:"🥈 سطح نقره — اروپا",tierBronze:"🥉 سطح برنز — اروپا",cEN:"🏴 انگلستان",cES:"🇪🇸 اسپانیا",cIT:"🇮🇹 ایتالیا",cupsNone:"در انتظار برنامه",share:"اشتراک‌گذاری",copy:"کپی متن",copied:"کپی شد ✓",titleL:"ورود — مدیریت ربات",loginH1:"🔐 ورود به مدیریت ربات",lbUser:"نام کاربری",lbPass:"رمز عبور",btnLogin:"ورود",errUser:"نام کاربری را وارد کنید",errRate:"تلاش بیش از حد — چند دقیقه دیگر امتحان کنید",errCreds:"نام کاربری یا رمز اشتباه است",titleA:"تنظیمات ربات اعلان مسابقات",h1A:"⚙️ تنظیمات ربات اعلان مسابقات",hLogin:"🔑 ورود",tokenPh:"رمز عبور مدیریت (admin password)",hStatus:"📊 وضعیت",stLoading:"در حال بارگذاری...",stErr:"❌ خطا در دریافت وضعیت — دوباره وارد شوید یا توکن را بررسی کنید",stLastRun:"🕒 آخرین اجرا",stApi:"📡 منبع API",stUsers:"👥 کاربران",stIds:"🆔 شناسه‌ها",stTz:"🌍 منطقه زمانی",btnRefresh:"به‌روزرسانی وضعیت",btnTest:"📨 ارسال پیام تست",btnSim:"🧪 شبیه‌سازی ۵ اعلان",btnSources:"📡 بررسی منابع API",btnLogout:"🚪 خروج",hBroadcast:"📣 ارسال پیام به همه کاربران",lbBroadcast:"متن پیام (به فارسی یا انگلیسی)",bcPh:"متن پیام...",btnBroadcast:"📣 ارسال برای همه",hMatches:"⚽ مسابقات پیش‌رو",btnRefreshM:"به‌روزرسانی مسابقات",hSettings:"⚙️ تنظیمات",lbTz:"منطقه زمانی",lbLeagues:"لیگ‌های تحت پوشش (کدها با کاما)",elNote:"EL و ECL توسط SportScore پوشش داده می‌شوند و نیازی به افزودن ندارند.",lbTeams:"تیم‌های منتخب هر لیگ",teamPh:"نام تیم جدید",btnAdd:"+ افزودن",btnSave:"💾 ذخیره تنظیمات",btnBackup:"⬇️ پشتیبان‌گیری تنظیمات",hPass:"🔑 تغییر رمز عبور",lbNp1:"رمز جدید (حداقل ۸ کاراکتر)",lbNp2:"تکرار رمز جدید",btnCp:"تغییر رمز عبور",ver:"نسخه ۱۲.۱۵ — نام یکپارچه باشگاه‌ها + انتخاب خودکار UCL",mToken:"ورود نامعتبر — رمز عبور یا نشست منقضی شده",mErr:"خطا: ",mEnterToken:"رمز عبور را وارد کنید",mSaved:"✅ ذخیره شد",mLoginFirst:"ابتدا وارد شوید",mBackup:"⬇️ پشتیبان‌گیری شد",mPassShort:"رمز باید حداقل ۸ کاراکتر باشد",mPassMismatch:"رمزها یکسان نیستند",mPassOk:"🔑 رمز با موفقیت تغییر کرد",mSentTo:"📣 ارسال شد به %s از %s کاربر",mTestSent:"📨 تست ارسال شد به %s کاربر",mSimPrefix:"🧪 شبیه‌سازی: ",mNoNotif:"⚠️ هیچ اعلانی ارسال نشد",mNoMatches:"مسابقه‌ای در راه نیست",mErrMatches:"خطا در دریافت مسابقات",mEnterText:"متن پیام را وارد کنید",mErrSrc:"❌ خطا",acHint:"💡 هنگام تایپ، نام دقیق باشگاه از فهرست API پیشنهاد می‌شود — برای ثبت بی‌خطا یکی را انتخاب کنید.",acNone:"باشگاهی با این نام در فهرست نیست",acAdd:"✅ %s افزوده شد",acAddUcl:"✅ %s افزوده شد — برای لیگ قهرمانان اروپا هم انتخاب شد",uclSync:"باشگاه‌های هر لیگ به‌صورت خودکار برای لیگ قهرمانان اروپا هم انتخاب می‌شوند",acDup:"⚠️ %s از قبل در این لیگ هست",btnClubs:"🔄 به‌روزرسانی فهرست باشگاه‌ها",clubsMeta:"فهرست باشگاه‌ها: %s باشگاه — آخرین بروزرسانی: %s",clubsNone:"⚠️ فهرست باشگاه‌ها هنوز ساخته نشده — دکمه بروزرسانی را بزنید",mClubs:"✅ فهرست باشگاه‌ها بروزرسانی شد (%s باشگاه)",clubsErr:"❌ فهرست باشگاه‌ها در دسترس نیست"},
en:{title:"Upcoming Matches — Match Notifier",h1:"⚽ Match Notifier",sub1:"Fixtures, top-of-the-table clashes & results — auto-refreshed",join:"Join the Telegram bot to get notified",hUpcoming:"📅 Upcoming Matches",hFinished:"🏁 Recent Results",loading:"Loading...",noMatches:"No matches ahead",errLoad:"Error loading data",madeWith:"Made with ❤️",adminLink:"Admin login",botLink:"Telegram bot",soon:"Soon",inDays:"in %d days",barNext:"⚡ Until the next big match",barFallback:"⏳ Until the next match",barLive:"🔴 Live now",barIdle:"⏳ Waiting for the next match",uDay:"d",uHour:"h",uMin:"m",uSec:"s",live:"LIVE",pen:"Penalty",own:"Own goal",derby:"🔥 Derby",boxCl:"🏆 Champions League",boxCup:"🏆 Elimination Cups",boxLg:"⚽ Domestic Leagues",viewBig:"⚡ Big matches only",viewAll:"All matches",hStandings:"📊 League Standings",hCups:"🏆 Tournaments",stEmpty:"Standings not available yet",stNot:"Not started",tierGold:"🥇 Gold tier — Europe & international",tierSilver:"🥈 Silver tier — Europe",tierBronze:"🥉 Bronze tier — Europe",cEN:"🏴 England",cES:"🇪🇸 Spain",cIT:"🇮🇹 Italy",cupsNone:"No fixture yet",share:"Share",copy:"Copy text",copied:"Copied ✓",titleL:"Login — Bot Admin",loginH1:"🔐 Bot Admin Login",lbUser:"Username",lbPass:"Password",btnLogin:"Login",errUser:"Enter your username",errRate:"Too many attempts — try again in a few minutes",errCreds:"Wrong username or password",titleA:"Match Bot Settings",h1A:"⚙️ Bot Settings",hLogin:"🔑 Login",tokenPh:"Admin password",hStatus:"📊 Status",stLoading:"Loading...",stErr:"❌ Status error — re-login or check token",stLastRun:"🕒 Last run",stApi:"📡 API source",stUsers:"👥 Users",stIds:"🆔 IDs",stTz:"🌍 Timezone",btnRefresh:"Refresh status",btnTest:"📨 Send test message",btnSim:"🧪 Simulate 5 alerts",btnSources:"📡 Check API sources",btnLogout:"🚪 Logout",hBroadcast:"📣 Broadcast to all users",lbBroadcast:"Message text (FA or EN)",bcPh:"Message...",btnBroadcast:"📣 Send to all",hMatches:"⚽ Upcoming Matches",btnRefreshM:"Refresh matches",hSettings:"⚙️ Settings",lbTz:"Timezone",lbLeagues:"Leagues (comma-separated codes)",elNote:"EL & ECL are covered by SportScore — no need to add them.",lbTeams:"Selected teams per league",teamPh:"New team name",btnAdd:"+ Add",btnSave:"💾 Save settings",btnBackup:"⬇️ Backup settings",hPass:"🔑 Change password",lbNp1:"New password (min 8 chars)",lbNp2:"Repeat new password",btnCp:"Change password",ver:"v12.15 — uniform club names + auto UCL selection",mToken:"Invalid login — wrong password or expired session",mErr:"Error: ",mEnterToken:"Enter the admin password",mSaved:"✅ Saved",mLoginFirst:"Log in first",mBackup:"⬇️ Backup downloaded",mPassShort:"Password must be at least 8 characters",mPassMismatch:"Passwords do not match",mPassOk:"🔑 Password changed",mSentTo:"📣 Sent to %s of %s users",mTestSent:"📨 Test sent to %s users",mSimPrefix:"🧪 Simulate: ",mNoNotif:"⚠️ No notifications sent",mNoMatches:"No matches ahead",mErrMatches:"Error loading matches",mEnterText:"Enter a message",mErrSrc:"❌ error",acHint:"💡 As you type, the exact API club name is suggested — pick one to store it safely.",acNone:"No club with that name in the catalog",acAdd:"✅ %s added",acAddUcl:"✅ %s added — also selected for the Champions League",uclSync:"Clubs added in any league are auto-selected for the Champions League too",acDup:"⚠️ %s is already in this league",btnClubs:"🔄 Refresh club list",clubsMeta:"Club catalog: %s clubs — last updated: %s",clubsNone:"⚠️ Club catalog not built yet — press Refresh",mClubs:"✅ Club list refreshed (%s clubs)",clubsErr:"❌ Club list unavailable",comps:{CL:"Champions League",PL:"Premier League",PD:"La Liga",SA:"Serie A",FL1:"Ligue 1",BL1:"Bundesliga",EL:"Europa League",ECL:"Conference League",FA_CUP:"FA Cup",EFL_CUP:"EFL Cup",CDR:"Copa del Rey",COPPA_ITALIA:"Coppa Italia"}}};
function curLang(){try{return localStorage.getItem("ucl_lang")||"fa";}catch(e){return "fa";}}
function T(k){var l=curLang(),d=I18N[l];return (d&&d[k])||I18N.fa[k]||k;}
function fmt(k){var s=T(k);for(var i=1;i<arguments.length;i++)s=s.replace("%s",arguments[i]).replace("%d",arguments[i]);return s;}
function trText(){var l=curLang();document.querySelectorAll("[data-i]").forEach(function(el){el.textContent=T(el.getAttribute("data-i"));});}
function trPlace(){document.querySelectorAll("[data-p]").forEach(function(el){el.setAttribute("placeholder",T(el.getAttribute("data-p")));});}
function initTheme(){try{return localStorage.getItem("ucl_theme")||((window.matchMedia&&matchMedia("(prefers-color-scheme:light)").matches)?"light":"dark");}catch(e){return "dark";}}
function setTheme(t){document.documentElement.setAttribute("data-theme",t);try{localStorage.setItem("ucl_theme",t);}catch(e){}var b=document.getElementById("tbtn");if(b)b.textContent=t==="dark"?"🌙":"☀️";}
function toggleTheme(){setTheme(document.documentElement.getAttribute("data-theme")==="dark"?"light":"dark");}
function switchLang(){var l=curLang()==="fa"?"en":"fa";try{localStorage.setItem("ucl_lang",l);}catch(e){}applyLang();}
function applyLang(skipHook){var l=curLang();document.documentElement.setAttribute("lang",l);document.documentElement.setAttribute("dir",l==="en"?"ltr":"rtl");var b=document.getElementById("lbtn");if(b)b.textContent=l==="en"?"فا":"EN";trText();trPlace();if(!skipHook&&typeof onLang==="function")onLang();}
// Audit fix 8: the admin client no longer reads/stores ADMIN_TOKEN in
// localStorage — all API calls authenticate via the HttpOnly session cookie
// (set by /admin/login). The re-login box takes the admin PASSWORD.
var TOKEN = "";
var STATE = null;
var lastUsers = null;
var LNAMES = {CL:"لیگ قهرمانان اروپا",PL:"لیگ برتر انگلستان",PD:"لالیگا",SA:"سری آ",FL1:"لیگ یک فرانسه",BL1:"بوندس‌لیگا",EL:"لیگ اروپا",ECL:"لیگ کنفرانس",FA_CUP:"جام حذفی انگلستان",EFL_CUP:"جام اتحادیه انگلستان",CDR:"جام حذفی اسپانیا",COPPA_ITALIA:"جام حذفی ایتالیا"};
var LNAMES_EN = {CL:"Champions League",PL:"Premier League",PD:"La Liga",SA:"Serie A",FL1:"Ligue 1",BL1:"Bundesliga",EL:"Europa League",ECL:"Conference League",FA_CUP:"FA Cup",EFL_CUP:"EFL Cup",CDR:"Copa del Rey",COPPA_ITALIA:"Coppa Italia"};
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
    load(); refreshStatus(); loadNextMatches();
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
    // v12.15: the CL box is auto-populated from every league — say so.
    if(l==="CL"){
      var uh = document.createElement("div"); uh.className = "muted uclsync";
      uh.textContent = T("uclSync");
      box.appendChild(uh);
    }
    var chips = document.createElement("div");
    (all[l]||[]).forEach(function(t){
      var c = document.createElement("span"); c.className="chip"; c.textContent = t;
      var x = document.createElement("button"); x.textContent="✕"; x.type="button"; x.setAttribute("aria-label",(curLang()==="en"?"Remove ":"حذف ")+t);
      x.onclick = function(){ STATE.teams[l]=(STATE.teams[l]||[]).filter(function(y){return y!==t;}); renderTeams(); };
      c.appendChild(x); chips.appendChild(c);
    });
    box.appendChild(chips);
    // v12.14: the add-club row is an autocomplete wrap — typing ≥2 chars queries
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
// "FC Bayern M\u00FCnchen" are recognized as the SAME club — one chip per
// club, and the duplicate toast names the EXISTING entry.
var AC_TOKENS = /^(fc|cf|sc|ac|as|ssc|bc|ud|cd|kv|jc|fk|nk|gnk|msk|sk|sl|rsc|bsc|jk|tc|pfc|sv|tsg)$/;
var AC_ALIAS = { clubatleticodemadrid:"atleticomadrid", atleticodemadrid:"atleticomadrid", internazionale:"intermilan", internazionalemilano:"intermilan", bayernmunich:"bayernmunchen" };
function anorm(s){
  var n = String(s||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
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
  // selected for the Champions League — its UCL matches then surface (UCL
  // box, standings ⭐, notifications) with zero extra clicks.
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
// button — the catalog is a guardrail, not a gate.
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
    T("stLastRun")+": "+(s.last_cron||"—")+"<br>"+
    T("stApi")+": "+(s.api_source||"—")+"<br>"+
    T("stUsers")+": "+s.users+"<br>"+
    (s.chat_ids && s.chat_ids.length ? T("stIds")+": "+s.chat_ids.join(curLang()==="en"?", ":"، ")+"<br>" : "")+
    T("stTz")+": "+s.timezone;
}
function busy(id){ var b=document.getElementById(id); if(!b||b.dataset.busy) return true; b.dataset.busy="1"; b.disabled=true; return false; }
function done(id){ var b=document.getElementById(id); if(!b) return; delete b.dataset.busy; b.disabled=false; }
function broadcast(){
  var t = document.getElementById("broadcastText").value.trim();
  if(!t){ msg(T("mEnterText")); return; }
  if(!confirm(curLang()==="en"?"Send to all "+lastUsers+" user(s)?":"برای همه کاربران ارسال شود؟ ("+(lastUsers==null?"؟":lastUsers)+" کاربر)")) return;
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
    if(r.passed) t = "\u2705 " + (curLang()==="en"?"All "+r.probes.length+" tests passed":"هر "+r.probes.length+" تست موفق");
    var keys = Object.keys(r.sent||{});
    if(!keys.length && !t){ msg(T("mNoNotif")); return; }
    msg(t);
  }).catch(function(){ msg(T("mErr")); }).then(function(){ done("btnSim"); });
}
function checkSources(){
  api("/api/sources").then(function(r){
    if(!r) return;
    var en = curLang()==="en";
    var t = "📡 ";
    Object.keys(r).forEach(function(k){
      t += k+": "+(r[k].ok ? r[k].matches+(en?" games (":" بازی (")+r[k].worthy+(en?" worthy)":" مطلوب)") : T("mErrSrc"))+" | ";
    });
    msg(t);
  });
}
var onLang = function(){ refreshStatus(); loadNextMatches(); };
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
    t.textContent = (en?m.home_en:m.home) + " 🆚 " + (en?m.away_en:m.away) + " — " + (en?(I18N.en.comps[m.code]||m.competition):m.competition);
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
setTheme(initTheme()); applyLang(true); load(); refreshStatus(); loadNextMatches();
</script>
</body></html>`;
// Audit fixes 1+2+10: the Telegram update handler. Runs ENTIRELY in the
// background (ctx.waitUntil) so the HTTP response is 200 OK within
// milliseconds; dedupes update_id (Telegram re-delivers on any non-2xx/timeout
// — retries must be no-ops); tolerates non-message updates; and swallows
// handler errors (a 500 would make Telegram re-deliver the same failing
// update in an infinite loop).
async function handleTelegramUpdate(env, update) {
  try {
    const updId = update && update.update_id;
    if (updId != null) {
      const seen = await env.STATE.get("upd_" + updId).catch(() => null);
      if (seen) return;
      await env.STATE.put("upd_" + updId, "1", { expirationTtl: 600 }).catch(() => {});
    }
    const message = update && update.message;
    if (!message || !message.chat || !message.chat.id) return;
    const chatId = message.chat.id;
    const text = message.text;
        if (text === "/start") {
          const chats = await getRegisteredChats(env);
          if (!chats.includes(chatId)) {
            chats.push(chatId);
            await env.STATE.put(CONFIG.KV_USERS_KEY, JSON.stringify(chats));
          }
          await sendTelegram(env, "\u2705 \u0628\u0647 \u0631\u0628\u0627\u062A \u0627\u0639\u0644\u0627\u0646 \u0645\u0633\u0627\u0628\u0642\u0627\u062A \u062E\u0648\u0634 \u0622\u0645\u062F\u06CC\u062F\\!\n\n\u26BD \u0627\u0639\u0644\u0627\u0646 \u0628\u0627\u0632\u06CC\u200C\u0647\u0627\u06CC \u062A\u06CC\u0645\u200C\u0647\u0627\u06CC \u062F\u0646\u0628\u0627\u0644\u200C\u0634\u062F\u0647 \u062F\u0631 \u0644\u06CC\u06AF \u0642\u0647\u0631\u0645\u0627\u0646\u0627\u0646 \u0648 \u0644\u06CC\u06AF\u200C\u0647\u0627\u06CC \u0627\u0631\u0648\u067E\u0627\u06CC\u06CC\n\u{1F4C5} /next \u2014 \u0628\u0627\u0632\u06CC\u200C\u0647\u0627\u06CC \u067E\u06CC\u0634\u200C\u0631\u0648 \u0631\u0627 \u0628\u0628\u06CC\u0646\u06CC\u062F\n\u{1F4CA} /tables \u2014 \u062C\u062F\u0648\u0644 \u0644\u06CC\u06AF\u200C\u0647\u0627 \u0631\u0627 \u0628\u0628\u06CC\u0646\u06CC\u062F\n\u{1F4DD} /help \u2014 \u0631\u0627\u0647\u0646\u0645\u0627\u06CC \u062F\u0633\u062A\u0648\u0631\u0627\u062A\n\u274C /stop \u2014 \u0627\u0646\u0635\u0631\u0627\u0641 \u0627\u0632 \u062F\u0631\u06CC\u0627\u0641\u062A \u0627\u0639\u0644\u0627\u0646", chatId);
        } else if (text === "/stop") {
          const chats = await getRegisteredChats(env);
          const newChats = chats.filter((c) => c !== chatId);
          await env.STATE.put(CONFIG.KV_USERS_KEY, JSON.stringify(newChats));
          await sendTelegram(env, "\u274C \u0634\u0645\u0627 \u0627\u0632 \u062F\u0631\u06CC\u0627\u0641\u062A \u0627\u0639\u0644\u0627\u0646\u200C\u0647\u0627 \u062e\u0627\u0631\u062c \u0634\u062f\u06CC\u062f\\. \u0628\u0631\u0627\u06CC \u062b\u0628\u062a\u200C\u0646\u0627\u0645 \u0645\u062c\u062f\u062f /start \u0631\u0627 \u0627\u0631\u0633\u0627\u0644 \u06A9\u0646\u06CC\u062f\\.", chatId);
        } else if (text === "/help") {
          await sendTelegram(env, "\u{1F4DD} *\u0631\u0627\u0647\u0646\u0645\u0627\u06CC \u0631\u0628\u0627\u062A:*\n\n/start \u2014 \u0639\u0636\u0648\u06CC\u062A \u0648 \u062F\u0631\u06CC\u0627\u0641\u062A \u0627\u0639\u0644\u0627\u0646\n/teams \u2014 \u0644\u06CC\u0633\u062A \u062A\u06CC\u0645\u200C\u0647\u0627 \u0648 \u0627\u0646\u062A\u062E\u0627\u0628 \u0634\u0645\u0627\n/follow 1,3,7 \u2014 \u062F\u0646\u0628\u0627\u0644 \u06A9\u0631\u062F\u0646 \u062A\u06CC\u0645\u200C\u0647\u0627\u06CC \u062E\u0627\u0635 \u0627\u0632 \u0644\u06CC\u0633\u062A /teams\n/follow all \u2014 \u062F\u0646\u0628\u0627\u0644 \u06A9\u0631\u062F\u0646 \u0647\u0645\u0647 \u062A\u06CC\u0645\u200C\u0647\u0627\n/next \u2014 \u0628\u0627\u0632\u06CC\u200C\u0647\u0627\u06CC \u067E\u06CC\u0634\u200C\u0631\u0648\u06CC \u062A\u06CC\u0645\u200C\u0647\u0627\u06CC \u062F\u0646\u0628\u0627\u0644\u200C\u0634\u062F\u0647\n/tables \u2014 \u062C\u062F\u0648\u0644 \u0644\u06CC\u06AF\u200C\u0647\u0627\u06CC \u0645\u0646\u062A\u062E\u0628\n/timezone london \u2014 \u062A\u063A\u06CC\u06CC\u0631 \u0645\u0646\u0637\u0642\u0647 \u0632\u0645\u0627\u0646\u06CC (\u0645\u062B\u0644\u0627 \u062F\u0631 \u0633\u0641\u0631) \u061B /timezone reset \u0628\u0631\u0627\u06CC \u0628\u0627\u0632\u06AF\u0634\u062A \u0628\u0647 \u067E\u06CC\u0634\u200C\u0641\u0631\u0636\n/stop \u2014 \u0627\u0646\u0635\u0631\u0627\u0641 \u0627\u0632 \u0627\u0639\u0644\u0627\u0646\u200C\u0647\u0627\n\n\u26BD \u0627\u0639\u0644\u0627\u0646\u200C\u0647\u0627 \u0634\u0627\u0645\u0644: \u06F2\u06F4 \u0633\u0627\u0639\u062A\u060C \u06F3 \u0633\u0627\u0639\u062A\u060C \u06F1 \u0633\u0627\u0639\u062A \u0645\u0627\u0646\u062F\u0647 \u060C \u0634\u0631\u0648\u0639 \u0628\u0627\u0632\u06CC \u0648 \u0646\u062A\u06CC\u062C\u0647 \u0646\u0647\u0627\u06CC\u06CC\n\u{1F3C6} \u067E\u0648\u0634\u0634: \u0644\u06CC\u06AF \u0642\u0647\u0631\u0645\u0627\u0646\u0627\u0646\u060C \u0644\u06CC\u06AF \u0628\u0631\u062A\u0631\u060C \u0644\u0627\u0644\u06CC\u06AF\u0627\u060C \u0633\u0631\u06CC\u200C\u0622\u060C \u0644\u06CC\u06AF \u06CC\u06A9\u060C \u0644\u06CC\u06AF \u0627\u0631\u0648\u067E\u0627\u060C \u0644\u06CC\u06AF \u06A9\u0646\u0641\u0631\u0627\u0646\u0633", chatId);
        } else if (text === "/teams") {
          const master = masterTeamList();
          const prefs = await getUserPrefs(env);
          const p = prefs[String(chatId)];
          const selected = p && Array.isArray(p.teams) ? p.teams : null;
          const lines = master.map((t, i) => {
            const isSel = selected && selected.some((s) => normalizeTeamName(s) === normalizeTeamName(t));
            return (isSel ? "\u2705 " : "\u{1F539} ") + String(i + 1) + "\\. " + escapeMarkdownCharacters(translateTeam(t));
          });
          const status = selected ? "\u0627\u0646\u062A\u062E\u0627\u0628 \u0641\u0639\u0644\u06CC: " + selected.length + " \u062A\u06CC\u0645" : "\u0634\u0645\u0627 \u0627\u06A9\u0646\u0648\u0646 \u0647\u0645\u0647 \u062A\u06CC\u0645\u200C\u0647\u0627 \u0631\u0627 \u062F\u0646\u0628\u0627\u0644 \u0645\u06CC\u200C\u06A9\u0646\u06CC\u062F";
          await sendTelegram(env, "\u{1F4CB} *\u062A\u06CC\u0645\u200C\u0647\u0627\u06CC \u0642\u0627\u0628\u0644 \u062F\u0646\u0628\u0627\u0644\u200C\u06A9\u0631\u062F\u0646:*\n\n" + lines.join("\n") + "\n\n" + status + "\n\n\u0628\u0631\u0627\u06CC \u0627\u0646\u062A\u062E\u0627\u0628: /follow 1,3,7\n\u0628\u0631\u0627\u06CC \u0647\u0645\u0647: /follow all", chatId);
        } else if (text && text.startsWith("/follow")) {
          const arg = text.slice(7).trim();
          const master = masterTeamList();
          const prefs = await getUserPrefs(env);
          if (!arg || arg === "all") {
            delete prefs[String(chatId)];
            await env.STATE.put(CONFIG.KV_USER_PREFS, JSON.stringify(prefs));
            await sendTelegram(env, "\u2705 \u0647\u0645\u0647 \u062A\u06CC\u0645\u200C\u0647\u0627 \u062F\u0646\u0628\u0627\u0644 \u0645\u06CC\u200C\u0634\u0648\u0646\u062F", chatId);
          } else {
            const nums = arg.split(/[\s,\u060C]+/).map((n) => parseInt(n, 10)).filter((n) => !isNaN(n) && n >= 1 && n <= master.length);
            if (!nums.length) {
              await sendTelegram(env, "\u26A0\uFE0F \u0634\u0645\u0627\u0631\u0647 \u0646\u0627\u0645\u0639\u062A\u0628\u0631 \u0627\u0633\u062A\u060C \u0627\u0632 /teams \u0627\u0633\u062A\u0641\u0627\u062F\u0647 \u06A9\u0646\u06CC\u062F", chatId);
            } else {
              const picked = [...new Set(nums)].map((n) => master[n - 1]);
              prefs[String(chatId)] = { teams: picked };
              await env.STATE.put(CONFIG.KV_USER_PREFS, JSON.stringify(prefs));
              const names = picked.map((t) => escapeMarkdownCharacters(translateTeam(t))).join("\u060C ");
              await sendTelegram(env, "\u2705 \u062A\u06CC\u0645\u200C\u0647\u0627\u06CC \u0627\u0646\u062A\u062E\u0627\u0628\u06CC \u0634\u0645\u0627:\n" + names + "\n\n\u0628\u0631\u0627\u06CC \u062A\u063A\u06CC\u06CC\u0631\u060C /follow all \u06CC\u0627 \u0634\u0645\u0627\u0631\u0647\u200C\u0647\u0627\u06CC \u062C\u062F\u06CC\u062F \u0631\u0627 \u0628\u0641\u0631\u0633\u062A\u06CC\u062F", chatId);
            }
          }
        } else if (text && text.startsWith("/timezone")) {
          const prefs = await getUserPrefs(env);
          const arg = text.slice(10).trim();
          if (!arg) {
            const tz = getUserTz(prefs, chatId, env);
            await sendTelegram(env, "\u23F0 \u0645\u0646\u0637\u0642\u0647 \u0632\u0645\u0627\u0646\u06CC \u0634\u0645\u0627: " + escapeMarkdownCharacters(tz) + "\n\u0628\u0631\u0627\u06CC \u062A\u063A\u06CC\u06CC\u0631: /timezone london", chatId);
          } else if (arg === "reset") {
            if (prefs[String(chatId)]) delete prefs[String(chatId)].tz;
            await env.STATE.put(CONFIG.KV_USER_PREFS, JSON.stringify(prefs));
            await sendTelegram(env, "\u2705 \u0645\u0646\u0637\u0642\u0647 \u0632\u0645\u0627\u0646\u06CC \u0634\u0645\u0627 \u0628\u0647 \u067E\u06CC\u0634\u200C\u0641\u0631\u0636 \u0631\u0628\u0627\u062A \u0628\u0627\u0632\u06AF\u0634\u062A: " + escapeMarkdownCharacters(env.TEHRAN_TZ || ""), chatId);
          } else {
            const tz = resolveTimeZone(arg);
            if (!tz) {
              await sendTelegram(env, "\u26A0\uFE0F \u0645\u0646\u0637\u0642\u0647 \u0632\u0645\u0627\u0646\u06CC \u0646\u0627\u0645\u0639\u062A\u0628\u0631 \u0627\u0633\u062A\n\u0645\u062B\u0627\u0644: /timezone london \u06CC\u0627 /timezone Europe/London", chatId);
            } else {
              if (!prefs[String(chatId)]) prefs[String(chatId)] = {};
              prefs[String(chatId)].tz = tz;
              await env.STATE.put(CONFIG.KV_USER_PREFS, JSON.stringify(prefs));
              await sendTelegram(env, "\u2705 \u0645\u0646\u0637\u0642\u0647 \u0632\u0645\u0627\u0646\u06CC \u0634\u0645\u0627 \u062A\u063A\u06CC\u06CC\u0631 \u06A9\u0631\u062F: " + escapeMarkdownCharacters(tz) + "\n\u067E\u06CC\u0627\u0645\u200C\u0647\u0627 \u0627\u0632 \u0627\u06CC\u0646 \u067E\u0633 \u0628\u0631 \u0627\u0633\u0627\u0633 \u0633\u0627\u0639\u062A \u0645\u062D\u0644\u06CC \u0627\u0631\u0633\u0627\u0644 \u0645\u06CC\u200C\u0634\u0648\u0646\u062F", chatId);
            }
          }
        } else if (text === "/next") {
          await applySettings(env);
          // Audit fix 3 (/next subrequests): /next runs in the webhook background —
          // reuse the cron's fresh pool (≤10 min old) instead of triggering a live
          // 3-provider sweep (~40+ subrequests) whenever possible.
          const pool = await env.STATE.get(CONFIG.KV_MATCHES_KEY, "json").catch(() => null);
          const poolFresh = pool && pool.fetchedAt && Date.now() - new Date(pool.fetchedAt).getTime() < 10 * 60e3 && Array.isArray(pool.matches);
          const matches = poolFresh ? pool.matches : await fetchMatchesFromAPI(env);
          const prefs = await getUserPrefs(env);
          const now = new Date();
          const upcoming = matches.filter((m) => shouldNotify(m) && userFollowsMatch(prefs, chatId, m) && new Date(m.utcDate) > now).sort((a, b) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime()).slice(0, 5);
          env.TEHRAN_TZ = getUserTz(prefs, chatId, env);
          if (!upcoming.length) {
            await sendTelegram(env, "\u{1F4C5} \u062F\u0631 \u062D\u0627\u0644 \u062D\u0627\u0636\u0631 \u0628\u0627\u0632\u06CC \u067E\u06CC\u0634\u200C\u0631\u0648\u06CC \u0628\u0631\u0627\u06CC \u062A\u06CC\u0645\u200C\u0647\u0627\u06CC \u062F\u0646\u0628\u0627\u0644\u200C\u0634\u062F\u0647 \u0648\u062C\u0648\u062F \u0646\u062F\u0627\u0631\u062F\u060C \u0648\u0644\u06CC \u0628\u0647 \u0632\u0648\u062F\u06CC \u0634\u0631\u0648\u0639 \u0645\u06CC\u200C\u0634\u0648\u062F\\! \u0645\u0646\u062A\u0638\u0631 \u0628\u0627\u0634\u06CC\u062F\u200C\u060C \u0627\u0639\u0644\u0627\u0646 \u062E\u0648\u062F\u06A9\u0627\u0631 \u0627\u0631\u0633\u0627\u0644 \u0645\u06CC\u200C\u0634\u0648\u062F", chatId);
          } else {
            const lines = upcoming.map((m) => {
              const jalali = getJalaliTime(m.utcDate, env);
              return "\u26BD " + escapeMarkdownCharacters(translateTeam(m.homeTeam.name)) + " \u{1F19A} " + escapeMarkdownCharacters(translateTeam(m.awayTeam.name)) + "\n" + translateCompetition(m.competition.code) + " \u2014 " + jalali;
            });
            await sendTelegram(env, "\u{1F4C5} *\u0628\u0627\u0632\u06CC\u200C\u0647\u0627\u06CC \u067E\u06CC\u0634\u200C\u0631\u0648:*\n\n" + lines.join("\n\n"), chatId);
          }
        } else if (text === "/tables" || text === "/\u062C\u062F\u0648\u0644") {
          // v12.9: league tables of the selected leagues ON DEMAND — the same
          // digest the cron delivers at the end of each week. applySettings
          // first: a cold isolate must not fall back to default league set.
          await applySettings(env);
          const res = await sendLeagueTables(env, [chatId], { label: "\u062C\u062F\u0648\u0644 \u0641\u0639\u0644\u06CC" });
          if (res.sent === 0) {
            await sendTelegram(env, "\u26A0\uFE0F \u062C\u062F\u0648\u0644 \u0644\u06CC\u06AF\u200C\u0647\u0627 \u0641\u0639\u0644\u0627\u064B \u062F\u0631 \u062F\u0633\u062A\u0631\u0633 \u0646\u06CC\u0633\u062A \u2014 \u0644\u0637\u0641\u0627\u064B \u062F\u0642\u0627\u06CC\u0642\u06CC \u0628\u0639\u062F \u062F\u0648\u0628\u0627\u0631\u0647 \u062A\u0644\u0627\u0634 \u06A9\u0646\u06CC\u062F\\.", chatId);
          }
        } else if (text && text.startsWith("/")) {
          await sendTelegram(env, "\u{1F4DD} \u062F\u0633\u062A\u0648\u0631 \u0646\u0627\u0634\u0646\u0627\u062E\u062A\u0647 \u0627\u0633\u062A\u060C \u0627\u0632 /help \u0627\u0633\u062A\u0641\u0627\u062F\u0647 \u06A9\u0646\u06CC\u062F\u060C", chatId);
        }
    return new Response("OK");
  } catch (error) {
    console.error("Webhook handler error:", error);
  }
}
__name(handleTelegramUpdate, "handleTelegramUpdate");
var worker_default = {
  async fetch(req, env, ctx) {
    resetSubrequestBudget(); // audit fix 3: per-invocation subrequest budget
    const url = new URL(req.url);
    if (url.pathname === "/webhook") {
      if (!validateWebhook(req, env)) {
        console.warn("\u26A0\uFE0F Invalid webhook secret");
        return new Response("Unauthorized", { status: 403 });
      }
      // Audit fix 1 (webhook 200-fast): Telegram drops slow webhooks (>60s) and
      // re-delivers them, amplifying work — the old handler processed the whole
      // command chain inline (a /next could block the response 30-60s). Now the
      // body is parsed, 200 OK returns immediately, and all processing runs in
      // ctx.waitUntil. Errors never reach Telegram (no retry loops).
      let update = null;
      try { update = await req.json(); } catch (e) { update = null; }
      if (update) {
        ctx.waitUntil(handleTelegramUpdate(env, update).catch((e) => console.error("Webhook background error:", e)));
      }
      return new Response("OK");
    }
    const isAdminPath = url.pathname.startsWith("/admin") || url.pathname.startsWith("/api/");
    if (url.pathname === "/admin/login" && req.method === "POST") {
      // Public login: validates user/pass, sets HttpOnly session cookie.
      // Hard-fails (500) when ADMIN_TOKEN is unset so a misconfigured worker
      // can never silently fall back to a permissive login.
      const body = await req.json().catch(() => null);
      const ip = req.headers.get("CF-Connecting-IP") || "unknown";
      const username = (body && body.username) || "";
      const failKey = "login_fail_" + ip + "_" + username;
      const fails = parseInt(await env.STATE.get(failKey).catch(() => null)) || 0;
      if (fails >= 5) return jsonResponse({ error: "Too many attempts, try later" }, 429);
      if (!env.ADMIN_TOKEN) {
        return jsonResponse({ error: "ADMIN_TOKEN secret is not set" }, 500);
      }
      // Both valid credential paths, checked in one pass:
      // 1) the PBKDF2 hash set via change-password, and
      // 2) the ADMIN_PASS secret as bootstrap/emergency credential.
      // Empty passwords never authenticate.
      const storedHash = await getAdminPassHash(env);
      let ok = !!(body && username === "admin" && body.password && env.ADMIN_PASS && timingSafeEqualStr(body.password, env.ADMIN_PASS));
      if (!ok && body && username === "admin" && body.password && storedHash) {
        ok = timingSafeEqualStr(await hashPassword(body.password, storedHash.salt), storedHash.hash);
      }
      if (!ok) {
        await env.STATE.put(failKey, String(fails + 1), { expirationTtl: 600 }).catch(() => {});
        return jsonResponse({ error: "Invalid credentials" }, 401);
      }
      await env.STATE.delete(failKey).catch(() => {});
      // Audit fix 8: the cookie now carries a random session id (KV-stored,
      // 12h TTL) — the ADMIN_TOKEN master secret never leaves the server.
      const sid = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
      await env.STATE.put("admin_sess_" + sid, JSON.stringify({ created: Date.now(), ip }), { expirationTtl: 43200 }).catch(() => {});
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: {
          "content-type": "application/json",
          "set-cookie": "admin_auth=" + sid + "; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=43200"
        }
      });
    }
    if (url.pathname === "/admin/logout" && req.method === "POST") {
      // Audit fix 8: destroy the server-side session, not just the cookie.
      const sid = getAdminCookieToken(req);
      if (sid) await env.STATE.delete("admin_sess_" + sid).catch(() => {});
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: {
          "content-type": "application/json",
          "set-cookie": "admin_auth=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0"
        }
      });
    }
    if (url.pathname === "/admin/change-password" && req.method === "POST") {
      // Admin-only: set a new password (PBKDF2-hashed, stored in KV).
      if (!(await isAdminAuthed(req, env))) return jsonResponse({ error: "Unauthorized" }, 401);
      const body = await req.json().catch(() => null);
      const np = body && body.password;
      if (!np || np.length < 8) return jsonResponse({ error: "Password too short (min 8)" }, 400);
      const salt = crypto.randomUUID();
      const hash = await hashPassword(np, salt);
      await env.STATE.put("admin_pass_hash", JSON.stringify({ salt, hash }));
      return jsonResponse({ ok: true });
    }
    if (url.pathname === "/api/public-matches" && req.method === "GET") {
      // Public (no auth): next 5 upcoming + recent results with club crests.
      // Audit fix 6: route-level try/catch — NEVER a raw 500 (Telegram-style
      // retry storms + broken page); worst case serves an empty degraded shape.
      try {
        return jsonResponse(await fetchPublicMatches(env, req));
      } catch (e) {
        console.error("public-matches route failed: " + e.message);
        return jsonResponse({ upcoming: [], finished: [], nextBig: null, standings: null, cups: null, ucl: null, degraded: true });
      }
    }
    if (url.pathname === "/public" || url.pathname === "/") {
      return new Response(PUBLIC_PAGE.replace("__PAGE_TZ__", env.TEHRAN_TZ), { headers: PAGE_SEC_HEADERS });
    }
    if (isAdminPath && url.pathname !== "/admin" && !(await isAdminAuthed(req, env))) {
      // Audit fix 8: the HttpOnly cookie now carries a random session id
      // (KV-stored) — or use the Bearer token; either authenticates.
      return jsonResponse({
        error: "Unauthorized",
        message: "Login via /admin/login or include 'Authorization: Bearer <ADMIN_TOKEN>' header"
      }, 401);
    }
    await applySettings(env);
    if (url.pathname === "/admin") {
      // Panel requires a valid Bearer header or a valid session cookie
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
        // v12.15: persist the CANONICAL lists — one exact provider name per
        // club (variants folded onto the catalog name, duplicates merged)
        // and the UCL box auto-populated with every selected club. The
        // response echoes the canonical state so the panel re-renders what
        // was actually stored.
        let cat = null;
        try { cat = await env.STATE.get(CONFIG.KV_CLUBS_CATALOG, "json"); } catch (e) { cat = null; }
        saved.teams = syncUclSelection(canonicalizeTeams(saved.teams, cat));
        await env.STATE.put(CONFIG.KV_SETTINGS_KEY, JSON.stringify(saved));
        await applySettings(env);
        return jsonResponse(saved);
      }
    }
    if (url.pathname === "/healthz") {
      // Public, no auth: for free uptime monitors (UptimeRobot etc.).
      // 200 while the cron heartbeat is fresh, 503 if stale (worker dying).
      const st = await getCronStatus(env); // audit fix 4: consolidated read
      const heartbeat = parseInt(st.heartbeat) || 0;
      const ageMin = heartbeat ? Math.round((Date.now() - heartbeat) / 6e4) : -1;
      const fresh = ageMin >= 0 && ageMin <= CONFIG.EXECUTION_FREQUENCY_MINUTES * 3;
      return new Response(JSON.stringify({ ok: fresh, heartbeat_age_min: ageMin }), {
        status: fresh ? 200 : 503,
        headers: { "content-type": "application/json" }
      });
    }
    if (url.pathname === "/api/broadcast" && req.method === "POST") {
      // Admin: send a plain-text message to every registered user
      const body = await req.json().catch(() => null);
      const text = body && typeof body.text === "string" && body.text.trim();
      if (!text) return jsonResponse({ error: "text is required" }, 400);
      const chats = await getRegisteredChats(env);
      if (!chats.length) return jsonResponse({ sent: 0, total: 0 });
      // Escape MarkdownV2 special chars so admin can type anything ("!", "-", etc.)
      const results = await Promise.allSettled(chats.map((c) => sendTelegram(env, escapeMarkdownCharacters(text), c)));
      const okCount = results.filter((r) => r.status === "fulfilled" && r.value === true).length;
      return jsonResponse({ sent: okCount, total: chats.length });
    }
    if (url.pathname === "/api/standings" && req.method === "GET") {
      // Admin: live standings + rank deltas for a competition (CL, PL, PD, SA, FL1)
      const code = String(url.searchParams.get("code") || "").toUpperCase();
      if (!code) return jsonResponse({ error: "code param required (e.g. PL, CL)" }, 400);
      const fresh = await fetchStandings(env, code);
      if (!fresh) return jsonResponse({ ok: false, error: "Standings not yet available for " + code + " (source unavailable or season not started)" }, 200);
      const snapKey = CONFIG.KV_STANDINGS_SNAP + code;
      const old = await env.STATE.get(snapKey, "json").catch(() => null);
      await env.STATE.put(snapKey, JSON.stringify(fresh)).catch(() => {});
      const teams = fresh.teams.map((t) => {
        const prev = old && old.teams && old.teams.find((x) => normalizeTeamName(x.name) === normalizeTeamName(t.name));
        return { name: t.name, pos: t.pos, points: t.points, delta: prev ? prev.pos - t.pos : null };
      });
      return jsonResponse({ code, matchday: fresh.matchday, teams });
    }
    if (url.pathname === "/api/clubs" && req.method === "GET") {
      // v12.14: club-name autocomplete backing the admin panel's "add club"
      // inputs (admin-gated by the /api/* check above). ?q=ro&hint=SA →
      // prefix-scored suggestions carrying the EXACT provider names;
      // ?refresh=1 forces a catalog rebuild; no q → catalog meta only. The
      // catalog auto-refreshes server-side when missing or older than 14
      // days, so the FIRST admin visit after a deploy pre-downloads it.
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
        // Never a raw 500 from a lookup route — the panel shows a friendly
        // hint instead (audit fix 6 pattern).
        return jsonResponse({ ok: false, error: "clubs lookup failed: " + e.message }, 200);
      }
    }
    if (url.pathname === "/api/status") {
      const st = await getCronStatus(env); // audit fix 4: consolidated read (heartbeat + last_cron + source)
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
      const msg = "🧪 پیام تست تنظیمات\nربات فعال است ✓";
      const results = await Promise.allSettled(chats.map((id) => sendTelegram(env, msg, id)));
      const sent = results.filter((r) => r.status === "fulfilled" && r.value === true).length;
      return jsonResponse({ sent, total: chats.length });
    }
    if (url.pathname === "/api/simulate" && req.method === "POST") {
      // Test pipeline: run the REAL notification flow on dummy matches, tracked under an
      // isolated KV key so real notification state is never polluted. The test key is
      // wiped on every run so repeat runs give identical, deterministic results.
      const dummy = buildDummyMatches();
      const realKey = CONFIG.KV_NOTIFIED_KEY;
      const realPrefsKey = CONFIG.KV_USER_PREFS;
      CONFIG.KV_NOTIFIED_KEY = "test_sim_v1";
      // Isolate user prefs too: empty prefs = everyone follows the master list,
      // so probes (big-match both/one, mixed, none) give deterministic counts.
      CONFIG.KV_USER_PREFS = "test_sim_v1_prefs";
      try {
        const chats = await getRegisteredChats(env);
        if (!chats.length) {
          return jsonResponse({ passed: false, failures: ["no registered users — sign in to the bot via /start first"], sent: {}, probes: [] });
        }
        await env.STATE.delete(CONFIG.KV_NOTIFIED_KEY);
        await sendMatchNotifications(env, dummy);
        const tracked = await env.STATE.get(CONFIG.KV_NOTIFIED_KEY, "json").catch(() => null);
        const counts = {};
        for (const arr of Object.values(tracked || {})) {
          for (const n of arr) counts[n.notificationType] = (counts[n.notificationType] || 0) + 1;
        }
        // Per-probe assertions: each dummy match must (or must NOT) have fired
        // its expected notification type. matchKey is deterministic, so checks
        // are stable across runs, timezone groups, and user counts.
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
          if (!m) { failures.push(id + ": probe missing"); continue; }
          const row = tracked ? tracked[matchKey(m)] : null;
          const got = row && row.some((n) => n.notificationType === wantType);
          const silent = !row || !row.length;
          const ok = wantType === null ? silent : got;
          probes.push({ id, expected: wantType || "silent", notified: row ? row.map((n) => n.notificationType) : [] });
          if (!ok) failures.push(id + ": expected " + (wantType || "silent") + ", got " + JSON.stringify(row ? row.map((n) => n.notificationType) : []));
        }
        // Preview the exact result messages (standings block + knockout phase) so they can be verified without Telegram
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
      // Diagnostics: hit all three providers live and report what each would contribute
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
      // Admin: bot identity (username) for the public "join bot" link
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
        body: JSON.stringify({ url: webhookUrl, secret_token: secret, allowed_updates: ["message"] })
      }).catch(() => null);
      const body = res ? await res.json() : { ok: false, error: "Telegram unreachable from worker" };
      return jsonResponse({ ...body, webhook_url: webhookUrl });
    }
    if (url.pathname === "/api/diag-public" && (await isAdminAuthed(req, env))) {
      // Temporary diagnostic: why is the public page empty?
      await applySettings(env);
      const live = await fetchMatchesFromAPI(env);
      const pool = await getCachedMatches(env);
      const now = Date.now();
      const codeOf = (list) => list.reduce((a, m) => { const c = m.competition.code; a[c] = (a[c] || 0) + 1; return a; }, {});
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
    if (url.pathname === "/api/diag-fd" && (await isAdminAuthed(req, env))) {
      // Diagnostic: live football-data fetches, raw status per competition group
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
      try { count = (JSON.parse(text).matches || []).length; } catch (e) {}
      return jsonResponse({ comps, days, status: res.status, count, body: text.substring(0, 200) });
    }
    if (req.method === "GET") {
      const path = url.pathname.substring(1) || url.searchParams.get("action") || "";
      const adminEndpoints = ["clear-notifications", "clear-locks", "trigger", "simple-test", "send-tables", "next-matches", "debug-notifications", "health", "teams"];
      if (adminEndpoints.includes(path) && !(await isAdminAuthed(req, env))) {
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
            const now2 = new Date();
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
          const st = await getCronStatus(env); // audit fix 4: consolidated read
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
          // v12.9: force-deliver the weekly league-tables digest to every
          // registered chat RIGHT NOW (manual test path — does NOT consume the
          // Monday "end of week" slot, so the scheduled digest still fires).
          try {
            await applySettings(env); // cold isolate: load the selected leagues
            const tchats = await getRegisteredChats(env);
            const tres = await sendLeagueTables(env, tchats, { label: "\u067E\u0627\u06CC\u0627\u0646 \u0647\u0641\u062A\u0647 \u2014 \u0627\u0631\u0633\u0627\u0644 \u062F\u0633\u062A\u06CC" });
            return new Response(JSON.stringify({
              success: true,
              message: "League tables sent to " + tchats.length + " chat(s)",
              chats: tchats,
              sent: tres.sent,
              failed: tres.failed,
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
