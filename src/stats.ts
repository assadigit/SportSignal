// SportSignal — v13.57-uniqueregions: visitor stats with unique-visitor dedup,
// per-country breakdown, and live "online now" tracking. Backed by a dedicated
// D1 database (binding STATS_DB), isolated from the STATE KV namespace's write
// quota (the chronic 13.55-epochflow pain point). D1's free tier allows 100k
// writes/day + atomic SQLite upserts (KV has no atomic increment).
//
// PRIVACY (honest, matches /privacy):
//   - NO cookies. NO IP storage. NO fingerprint storage.
//   - For DAILY UNIQUE-VISITOR dedup only, a one-way SHA-256 hash of
//     (salt + IP + User-Agent + day) is computed and the HASH (not the IP) is
//     stored for the day, then pruned to ~30 days. The salt is auto-generated
//     once (crypto.getRandomValues) and stored in the D1 stats_meta table —
//     never in source, never a secret the owner must set. The hash cannot be
//     reversed to recover the IP without the salt + brute force, and the data
//     is daily-aggregate + pruned.
//   - Country is captured from Cloudflare's CF-IPCountry / req.cf.country (an
//     ISO-3166 alpha-2 CODE like "IR"/"GB"/"AU") — a country code is aggregate,
//     not personal data. No IP is needed or stored for this.
//   - Bots are filtered by User-Agent (Googlebot/bingbot/GPTBot/ClaudeBot/etc.)
//     and never counted. Counting runs in ctx.waitUntil so it never slows the
//     beacon response.
//
// The HTML pages are edge-cached (s-maxage=60), so the reliable real-visitor
// signal is the client beacon — a tiny same-origin GET fired by an inline
// script on every page. It only fires from a browser that runs JS, so non-JS
// crawlers are excluded on top of the UA filter.

import type { Env } from "./types";
import { toFaDigits } from "./utils";

// Bots/crawlers/automation we must NOT count. The site is heavily crawled on
// purpose (SEO); a counter that included Googlebot et al. is meaningless.
// Case-insensitive substring match on the User-Agent.
export const BOT_REGEX =
  /bot|crawl|spider|slurp|bing|facebookexternalhit|preview|headless|python-requests|curl|wget|monitor|uptime|lighthouse|anthropic|bytespider|applebot|yandex|baidu|semrush|ahrefs|dotbot|petalbot|dataprovider|duckduckbot|sogou|exabot|facebot|ia_archiver|linkedinbot|telegrambot|discordbot|whatsapp/i;

// Tehran-calendar day key: YYYY-MM-DD in Asia/Tehran. en-CA yields ISO order.
export function tehranDay(env: Env, date?: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: (env && env.TEHRAN_TZ) || "Asia/Tehran",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date || new Date());
}

export function daysAgoDay(env: Env, n: number): string {
  return tehranDay(env, new Date(Date.now() - n * 86400000));
}

export function isBotUserAgent(ua: string): boolean {
  if (!ua) return true; // empty UA = treat as bot (defensive)
  return BOT_REGEX.test(ua);
}

// "Online now" window: a visitor counts as online if active in the last 5 min.
export const ONLINE_WINDOW_SECONDS = 300;

// ---------- salt (auto-generated, stored in D1, never in source) ----------
// CRITICAL for unique-visitor accuracy: the salt MUST be identical across all
// isolates, otherwise the same IP+UA hashes to different fingerprints → over-
// counting uniques. Two failure modes guarded against:
//   (1) RACE on first generation: two isolates read an empty salt row
//       simultaneously, each generates a different candidate. Guarded by an
//       atomic UPDATE … WHERE v='' (only one wins) + a RE-READ so every
//       isolate converges on the canonical winning salt.
//   (2) STALE module cache: an isolate that cached a salt before the canonical
//       one was persisted would keep hashing with the wrong salt for its whole
//       lifetime. Guarded by NOT caching in module memory — the salt is read
//       fresh from D1 on every recordVisit. This adds one ~5ms indexed-PK read
//       per visit, but recordVisit runs in ctx.waitUntil (background), so it
//       is invisible to the user. Accuracy > micro-optimization.
// The salt is pre-seeded at deploy time (see db/stats-schema-v2.sql + the
// wrangler one-time UPDATE), so the generate path is a rare fallback.
async function getStatsSalt(env: Env): Promise<string> {
  try {
    const readSalt = () => env.STATS_DB.prepare("SELECT v FROM stats_meta WHERE k = 'salt'").first();
    let row: any = await readSalt();
    let s = row && row.v ? row.v : "";
    if (!s) {
      // Empty (first-ever deploy, or replica lag). Generate a candidate and try
      // to claim the slot atomically; then RE-READ to converge on the winner.
      const bytes = crypto.getRandomValues(new Uint8Array(32));
      const candidate = Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
      await env.STATS_DB.prepare("UPDATE stats_meta SET v = ?1 WHERE k = 'salt' AND (v = '' OR v IS NULL)").bind(candidate).run();
      row = await readSalt();
      s = (row && row.v) ? row.v : candidate;
    }
    return s;
  } catch (e) {
    console.warn("stats getStatsSalt failed: " + (e && e.message));
    return "fallback-salt-" + (env.TEHRAN_TZ || "x"); // degrades but still functional
  }
}

async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// One-way visitor fingerprint for daily unique dedup. Includes the day so a
// returning visitor on a new day is a new unique (matching the reference
// design: "someone who visits on three different days counts as three
// visitors"). The IP is read from CF-Connecting-IP, hashed, and NEVER stored.
async function visitorFingerprint(env: Env, req: Request, salt: string, day: string): Promise<string> {
  const ip = req.headers.get("CF-Connecting-IP") || req.headers.get("X-Forwarded-For") || "0.0.0.0";
  const ua = req.headers.get("user-agent") || "";
  return sha256Hex(salt + "|" + ip + "|" + ua + "|" + day);
}

// ---------- public stats block (served to the beacon) ----------
export interface CountryStat {
  code: string;
  name: string;
  flag: string;
  visitors: number;
  pct: number;
}
export interface PublicStatsBlock {
  online: number;
  today_views: number;
  today_visitors: number;
  total_views: number;
  countries: CountryStat[]; // top 5 today
}

const STATS_CACHE_TTL_MS = 30 * 1000;
let publicCache: { data: PublicStatsBlock; ts: number } | null = null;

// ISO-3166 alpha-2 → Persian name (common countries; fallback to the code).
const COUNTRY_FA: Record<string, string> = {
  IR: "ایران", GB: "انگلستان", US: "آمریکا", DE: "آلمان", FR: "فرانسه", ES: "اسپانیا",
  IT: "ایتالیا", NL: "هلند", AU: "استرالیا", CA: "کانادا", AE: "امارات", TR: "ترکیه",
  RU: "روسیه", CN: "چین", IN: "هند", BR: "برزیل", AR: "آرژانتین", MX: "مکزیک",
  SE: "سوئد", NO: "نروژ", FI: "فنلاند", DK: "دانمارک", BE: "بلژیک", CH: "سوئیس",
  AT: "اتریش", PT: "پرتغال", PL: "لهستان", UA: "اوکراین", SA: "عربستان", IQ: "عراق",
  AF: "افغانستان", PK: "پاکستان", JP: "ژاپن", KR: "کره جنوبی", ID: "اندونزی",
  MY: "مالزی", SG: "سنگاپور", EG: "مصر", ZA: "آفریقای جنوبی", NZ: "نیوزیلند",
  IE: "ایرلند", GR: "یونان", CZ: "چک", RO: "رومانیا", HU: "مجارستان", RS: "صربستان",
  HR: "کرواسی", CO: "کلمبیا", CL: "شیلی", PE: "پرو", EC: "اکوادور", VE: "ونزوئلا",
  MA: "مراکش", DZ: "الجزایر", TN: "تونس", JO: "اردن", LB: "لبنان", SY: "سوریه",
  QA: "قطر", KW: "کویت", BH: "بحرین", OM: "عمان", YE: "یمن", KZ: "قزاقستان",
  UZ: "ازبکستان", AZ: "آذربایجان", GE: "گرجستان", AM: "ارمنستان", TM: "ترکمنستان"
};

// Convert ISO-3166 alpha-2 → flag emoji via regional indicator symbols.
export function countryFlag(code: string): string {
  if (!code || code.length !== 2 || !/^[A-Za-z]{2}$/.test(code)) return "\u{1F3F4}";
  const A = 0x1f1e6, base = 65;
  return String.fromCodePoint(A + (code.toUpperCase().charCodeAt(0) - base)) +
         String.fromCodePoint(A + (code.toUpperCase().charCodeAt(1) - base));
}

export function countryNameFa(code: string): string {
  const c = String(code || "").toUpperCase();
  return COUNTRY_FA[c] || c || "—";
}

async function readPublicStatsBlock(env: Env): Promise<PublicStatsBlock> {
  const today = tehranDay(env);
  const now = Math.floor(Date.now() / 1000);
  try {
    const res = await env.STATS_DB.batch([
      env.STATS_DB.prepare("SELECT COALESCE(pageviews,0) AS v, COALESCE(visitors,0) AS u FROM daily_stats WHERE day = ?1").bind(today),
      env.STATS_DB.prepare("SELECT COALESCE(SUM(pageviews),0) AS v FROM daily_stats"),
      env.STATS_DB.prepare("SELECT COUNT(*) AS n FROM visitor_online WHERE last_seen >= ?1").bind(now - ONLINE_WINDOW_SECONDS),
      env.STATS_DB.prepare("SELECT country, visitors FROM country_stats WHERE day = ?1 AND country <> 'XX' ORDER BY visitors DESC LIMIT 5").bind(today)
    ]);
    const todayRow = (res[0].results && res[0].results[0]) || {};
    const totalViews = (res[1].results && res[1].results[0] && Number(res[1].results[0].v)) || 0;
    const online = (res[2].results && res[2].results[0] && Number(res[2].results[0].n)) || 0;
    const todayVisitors = Number(todayRow.u) || 0;
    const cr = (res[3].results || []) as any[];
    const sumCountry = cr.reduce((a, r) => a + (Number(r.visitors) || 0), 0) || 1;
    const countries: CountryStat[] = cr.map((r) => ({
      code: String(r.country).toUpperCase(),
      name: countryNameFa(r.country),
      flag: countryFlag(r.country),
      visitors: Number(r.visitors) || 0,
      pct: Math.round(((Number(r.visitors) || 0) / sumCountry) * 100)
    }));
    return {
      online,
      today_views: Number(todayRow.v) || 0,
      today_visitors: todayVisitors,
      total_views: totalViews,
      countries
    };
  } catch (e) {
    console.warn("stats readPublicStatsBlock failed: " + (e && e.message));
    return { online: 0, today_views: 0, today_visitors: 0, total_views: 0, countries: [] };
  }
}

async function refreshPublicCache(env: Env): Promise<void> {
  const data = await readPublicStatsBlock(env);
  publicCache = { data, ts: Date.now() };
}

// ---------- the beacon endpoint ----------
export async function handleVisitBeacon(req: Request, env: Env, ctx: any): Promise<Response> {
  if (!env.STATS_DB) {
    return jsonResponseBlock({ online: 0, today_views: 0, today_visitors: 0, total_views: 0, countries: [] });
  }
  const ua = req.headers.get("user-agent") || "";
  if (isBotUserAgent(ua)) {
    return new Response(null, { status: 204, headers: COUNT_HEADERS });
  }
  const day = tehranDay(env);
  // Background: count the visit (unique dedup + country + online) via ctx.waitUntil.
  ctx.waitUntil(recordVisit(env, req, ua, day).catch((e: any) => console.warn("stats recordVisit failed: " + (e && e.message))));

  // Serve the public block from the in-memory cache (instant). Refresh in the
  // background when stale; on a cold isolate, do one direct read to seed it.
  let block: PublicStatsBlock | null = publicCache && Date.now() - publicCache.ts < STATS_CACHE_TTL_MS
    ? publicCache.data
    : null;
  if (!block) {
    if (publicCache) {
      block = publicCache.data;
      ctx.waitUntil(refreshPublicCache(env).catch(() => {}));
    } else {
      block = await readPublicStatsBlock(env);
      publicCache = { data: block, ts: Date.now() };
    }
  }
  return jsonResponseBlock(block);
}

const COUNT_HEADERS = {
  "content-type": "application/json",
  "cache-control": "no-store, max-age=0",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "referrer-policy": "no-referrer"
};

function jsonResponseBlock(b: PublicStatsBlock): Response {
  return new Response(JSON.stringify(b), { status: 200, headers: COUNT_HEADERS });
}

// ---------- the counting write (background) ----------
async function recordVisit(env: Env, req: Request, ua: string, day: string): Promise<void> {
  const salt = await getStatsSalt(env);
  const visitor = await visitorFingerprint(env, req, salt, day);
  const now = Math.floor(Date.now() / 1000);
  // Country from Cloudflare (req.cf.country is set by the edge; CF-IPCountry
  // header is the same value). A country CODE is aggregate, not personal data.
  const cf: any = (req as any).cf || {};
  const country = (cf.country || req.headers.get("CF-IPCountry") || "XX").toUpperCase().slice(0, 2);

  // 1) unique-visitor dedup: INSERT OR IGNORE → changes>0 means new today.
  const ins = await env.STATS_DB.prepare("INSERT OR IGNORE INTO daily_visitors (day, visitor) VALUES (?1, ?2)").bind(day, visitor).run();
  const isNew = ins && ins.meta && ins.meta.changes > 0 ? 1 : 0;

  // 2) daily_stats (pageviews + visitors), 3) country_stats, 4) visitor_online,
  //    5) tracking_since stamp — one batch (atomic, one round-trip).
  await env.STATS_DB.batch([
    env.STATS_DB.prepare(
      "INSERT INTO daily_stats (day, pageviews, visitors) VALUES (?1, 1, ?2) " +
        "ON CONFLICT(day) DO UPDATE SET pageviews = pageviews + 1, visitors = visitors + ?2, updated_at = datetime('now')"
    ).bind(day, isNew),
    env.STATS_DB.prepare(
      "INSERT INTO country_stats (day, country, visitors, pageviews) VALUES (?1, ?2, ?3, 1) " +
        "ON CONFLICT(day, country) DO UPDATE SET visitors = visitors + ?3, pageviews = pageviews + 1"
    ).bind(day, country, isNew),
    env.STATS_DB.prepare(
      "INSERT INTO visitor_online (visitor, last_seen) VALUES (?1, ?2) " +
        "ON CONFLICT(visitor) DO UPDATE SET last_seen = excluded.last_seen"
    ).bind(visitor, now),
    env.STATS_DB.prepare(
      "UPDATE stats_meta SET v = ?1 WHERE k = 'tracking_since' AND (v = '' OR v IS NULL)"
    ).bind(day)
  ]);

  // Occasional tidy-up so the DB stays tiny forever (~2% of visits).
  if (Math.random() < 0.02) {
    try {
      const cutoff30 = daysAgoDay(env, 30);
      const cutoff90 = daysAgoDay(env, 90);
      await env.STATS_DB.batch([
        env.STATS_DB.prepare("DELETE FROM daily_visitors WHERE day < ?1").bind(cutoff30),
        env.STATS_DB.prepare("DELETE FROM country_stats WHERE day < ?1").bind(cutoff90),
        env.STATS_DB.prepare("DELETE FROM visitor_online WHERE last_seen < ?1").bind(now - 3600)
      ]);
    } catch (e) {
      /* best-effort cleanup */
    }
  }

  // Refresh the in-memory cache so this isolate serves the bumped counts.
  await refreshPublicCache(env).catch(() => {});
}

// ---------- admin stats ----------
export interface DayStat { day: string; pageviews: number; visitors: number; }
export interface AdminCountryStat { code: string; name: string; flag: string; visitors: number; pageviews: number; pct: number; }
export interface AdminStats {
  online: number;
  today_views: number; today_visitors: number;
  yesterday_views: number; yesterday_visitors: number;
  last_7_views: number; last_7_visitors: number;
  last_30_views: number; last_30_visitors: number;
  all_time_views: number; all_time_visitors: number;
  tracking_since: string | null;
  days: DayStat[];
  countries_today: AdminCountryStat[];
  countries_30d: AdminCountryStat[];
  configured: boolean;
}

export async function collectAdminStats(env: Env): Promise<AdminStats> {
  if (!env.STATS_DB) {
    return {
      online: 0, today_views: 0, today_visitors: 0, yesterday_views: 0, yesterday_visitors: 0,
      last_7_views: 0, last_7_visitors: 0, last_30_views: 0, last_30_visitors: 0,
      all_time_views: 0, all_time_visitors: 0, tracking_since: null, days: [],
      countries_today: [], countries_30d: [], configured: false
    };
  }
  const today = tehranDay(env);
  const yesterday = daysAgoDay(env, 1);
  const weekStart = daysAgoDay(env, 6);
  const monthStart = daysAgoDay(env, 29);
  const now = Math.floor(Date.now() / 1000);
  try {
    const r = await env.STATS_DB.batch([
      env.STATS_DB.prepare("SELECT COALESCE(pageviews,0) AS v, COALESCE(visitors,0) AS u FROM daily_stats WHERE day = ?1").bind(today),
      env.STATS_DB.prepare("SELECT COALESCE(pageviews,0) AS v, COALESCE(visitors,0) AS u FROM daily_stats WHERE day = ?1").bind(yesterday),
      env.STATS_DB.prepare("SELECT COALESCE(SUM(pageviews),0) AS v, COALESCE(SUM(visitors),0) AS u FROM daily_stats WHERE day >= ?1").bind(weekStart),
      env.STATS_DB.prepare("SELECT COALESCE(SUM(pageviews),0) AS v, COALESCE(SUM(visitors),0) AS u FROM daily_stats WHERE day >= ?1").bind(monthStart),
      env.STATS_DB.prepare("SELECT COALESCE(SUM(pageviews),0) AS v, COALESCE(SUM(visitors),0) AS u FROM daily_stats"),
      env.STATS_DB.prepare("SELECT v FROM stats_meta WHERE k = 'tracking_since'"),
      env.STATS_DB.prepare("SELECT COUNT(*) AS n FROM visitor_online WHERE last_seen >= ?1").bind(now - ONLINE_WINDOW_SECONDS),
      env.STATS_DB.prepare("SELECT day, pageviews, visitors FROM daily_stats ORDER BY day DESC LIMIT 90").all(),
      env.STATS_DB.prepare("SELECT country, SUM(visitors) AS visitors, SUM(pageviews) AS pageviews FROM country_stats WHERE day = ?1 AND country <> 'XX' GROUP BY country ORDER BY visitors DESC LIMIT 12").bind(today),
      env.STATS_DB.prepare("SELECT country, SUM(visitors) AS visitors, SUM(pageviews) AS pageviews FROM country_stats WHERE day >= ?1 AND country <> 'XX' GROUP BY country ORDER BY visitors DESC LIMIT 12").bind(monthStart)
    ]);
    const pair = (i: number) => {
      const x = r[i].results && r[i].results[0];
      return { v: Number(x && x.v) || 0, u: Number(x && x.u) || 0 };
    };
    const sinceRow = r[5].results && r[5].results[0];
    const online = (r[6].results && r[6].results[0] && Number(r[6].results[0].n)) || 0;
    const days: DayStat[] = (r[7].results || []).map((x: any) => ({
      day: x.day, pageviews: Number(x.pageviews) || 0, visitors: Number(x.visitors) || 0
    }));
    const mkCountries = (i: number): AdminCountryStat[] => {
      const rows = (r[i].results || []) as any[];
      const sum = rows.reduce((a, x) => a + (Number(x.visitors) || 0), 0) || 1;
      return rows.map((x) => ({
        code: String(x.country).toUpperCase(),
        name: countryNameFa(x.country),
        flag: countryFlag(x.country),
        visitors: Number(x.visitors) || 0,
        pageviews: Number(x.pageviews) || 0,
        pct: Math.round(((Number(x.visitors) || 0) / sum) * 100)
      }));
    };
    return {
      online,
      today_views: pair(0).v, today_visitors: pair(0).u,
      yesterday_views: pair(1).v, yesterday_visitors: pair(1).u,
      last_7_views: pair(2).v, last_7_visitors: pair(2).u,
      last_30_views: pair(3).v, last_30_visitors: pair(3).u,
      all_time_views: pair(4).v, all_time_visitors: pair(4).u,
      tracking_since: sinceRow ? sinceRow.v || null : null,
      days,
      countries_today: mkCountries(8),
      countries_30d: mkCountries(9),
      configured: true
    };
  } catch (e) {
    console.warn("stats collectAdminStats failed: " + (e && e.message));
    return {
      online: 0, today_views: 0, today_visitors: 0, yesterday_views: 0, yesterday_visitors: 0,
      last_7_views: 0, last_7_visitors: 0, last_30_views: 0, last_30_visitors: 0,
      all_time_views: 0, all_time_visitors: 0, tracking_since: null, days: [],
      countries_today: [], countries_30d: [], configured: true
    };
  }
}

// Format an integer with thousands separators in Persian digits (footer + box).
export function faNum(n: number): string {
  try {
    return toFaDigits(Number(n || 0).toLocaleString("en-US").replace(/,/g, "\u066C"));
  } catch (e) {
    return toFaDigits(String(n || 0));
  }
}
