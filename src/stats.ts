// SportSignal — v13.56-visitcount: a tiny, cookieless, IP-free page-view
// counter backed by a dedicated D1 database (binding STATS_DB).
//
// WHY D1 (not the STATE KV namespace): the site chronically brushes the KV
// free-tier 1,000-writes/day quota (the 13.55-epochflow frozen-epoch bug was
// caused by exactly that). A per-visit counter would burn hundreds-to-
// thousands of KV writes/day on top of an already-tight budget. D1's free
// tier allows 100k writes/day in an isolated quota, and SQLite gives atomic
// `pageviews = pageviews + 1` upserts (KV has no atomic increment — naive
// read-modify-write loses updates under concurrency).
//
// PRIVACY (honest, matches /privacy): NO cookies, NO IP, NO fingerprint, NO
// personal data of any kind is read or stored. Each beacon from a real
// (non-bot) browser increments one aggregate integer for the Tehran-calendar
// day. Bots are filtered by user-agent (the site is intentionally heavily
// crawled — Googlebot/bingbot/GPTBot/ClaudeBot/etc. — a counter that
// included them would be meaningless). Counting happens inside ctx.waitUntil
// so it never slows the beacon response.
//
// The HTML pages are edge-cached (s-maxage=60), so counting inside the HTML
// path would undercount. The reliable real-visitor signal is this beacon —
// a tiny same-origin GET fired by an inline script on every page (homepage +
// SEO pages). It only fires from a browser that actually executes JS, so
// crawlers that never run JS are naturally excluded on top of the UA filter.

import type { Env } from "./types";
import { toFaDigits } from "./utils";

// Bots/crawlers/automation we must NOT count. The site is heavily crawled on
// purpose (SEO); a counter that includes Googlebot et al. is meaningless.
// Case-insensitive substring match on the User-Agent. Kept broad: catches
// Googlebot/bingbot/GPTBot/ClaudeBot/Bytespider/Applebot/Yandex/Baidu/Semrush/
// Ahrefs/DotBot/PetalBot + generic crawl/spider/slurp + HTTP libraries
// (curl/wget/python-requests) + monitors (uptime/lighthouse). A real browser
// UA (Chrome/Safari/Firefox/Edge) never contains these tokens.
export const BOT_REGEX =
  /bot|crawl|spider|slurp|bing|facebookexternalhit|preview|headless|python-requests|curl|wget|monitor|uptime|lighthouse|anthropic|bytespider|applebot|yandex|baidu|semrush|ahrefs|dotbot|petalbot|dataprovider|duckduckbot|sogou|exabot|facebot|ia_archiver|linkedinbot|telegrambot|discordbot|whatsapp/i;

// Tehran-calendar day key: YYYY-MM-DD in Asia/Tehran. en-CA yields the
// ISO-style YYYY-MM-DD order (vs en-GB's DD/MM/YYYY), perfect for a PK +
// lexicographic day ordering. Mirrors getNowTehran's timezone source.
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

// In-memory cache of the public counts (today + total) so the beacon response
// path is a pure memory read — zero D1 latency on the hot path. Workers module
// state is per-isolate and ephemeral; each isolate refreshes independently
// after STATS_CACHE_TTL_MS. The counter is approximate by design (a public
// footer counter), so ≤30s staleness across isolates is perfectly fine.
const STATS_CACHE_TTL_MS = 30 * 1000;
interface PublicCounts {
  today: number;
  total: number;
  ts: number;
}
let publicCountsCache: PublicCounts | null = null;

async function readPublicCounts(env: Env): Promise<{ today: number; total: number }> {
  const today = tehranDay(env);
  try {
    const res = await env.STATS_DB.prepare(
      "SELECT (SELECT pageviews FROM daily_stats WHERE day = ?1) AS today, " +
        "(SELECT COALESCE(SUM(pageviews), 0) FROM daily_stats) AS total"
    )
      .bind(today)
      .first();
    return {
      today: (res && Number(res.today)) || 0,
      total: (res && Number(res.total)) || 0
    };
  } catch (e) {
    console.warn("stats readPublicCounts failed: " + (e && e.message));
    return { today: 0, total: 0 };
  }
}

// Refresh the in-memory cache from D1 (background, via ctx.waitUntil).
async function refreshPublicCountsCache(env: Env): Promise<void> {
  const fresh = await readPublicCounts(env);
  publicCountsCache = { today: fresh.today, total: fresh.total, ts: Date.now() };
}

// The beacon endpoint: counts one page view (background, ctx.waitUntil) and
// returns the public counts (today + total) for the footer. The response is
// instant — it serves from the in-memory cache and only triggers a background
// D1 refresh when the cache is stale. The counting write is also backgrounded.
export async function handleVisitBeacon(req: Request, env: Env, ctx: any): Promise<Response> {
  // No STATS_DB binding? Fail open: return zeroes (the feature degrades
  // gracefully rather than 500ing the page). The admin sees a clear "not
  // configured" state from /api/stats.
  if (!env.STATS_DB) {
    return jsonResponseCounts({ today: 0, total: 0 });
  }
  const ua = req.headers.get("user-agent") || "";
  // Bot filter — never count crawlers. A 204 is the cheapest non-count signal.
  if (isBotUserAgent(ua)) {
    return new Response(null, { status: 204, headers: COUNT_HEADERS });
  }
  const today = tehranDay(env);

  // Counting: background write so the response never waits on D1. The upsert
  // is atomic in SQLite (no lost updates under concurrency). Occasionally
  // stamp tracking_since on the first ever record (INSERT … WHERE NOT EXISTS
  // style: a separate cheap idempotent write).
  ctx.waitUntil(
    (async () => {
      try {
        await env.STATS_DB.batch([
          env.STATS_DB.prepare(
            "INSERT INTO daily_stats (day, pageviews) VALUES (?1, 1) " +
              "ON CONFLICT(day) DO UPDATE SET pageviews = pageviews + 1, updated_at = datetime('now')"
          ).bind(today),
          // Stamp tracking_since once (idempotent: only sets when empty).
          env.STATS_DB.prepare(
            "UPDATE stats_meta SET v = ?1 WHERE k = 'tracking_since' AND (v = '' OR v IS NULL)"
          ).bind(today)
        ]);
        // Refresh the in-memory cache so this isolate serves the bumped count
        // to the next visitor without waiting for the TTL.
        await refreshPublicCountsCache(env).catch(() => {});
      } catch (e) {
        console.warn("stats recordVisit failed: " + (e && e.message));
      }
    })()
  );

  // Serve public counts from the in-memory cache (instant). If the cache is
  // stale or missing, refresh it in the background AND fall back to a direct
  // read only if there's no cached value at all (first request on a cold
  // isolate). This keeps the hot path free of D1 latency.
  let counts = publicCountsCache && Date.now() - publicCountsCache.ts < STATS_CACHE_TTL_MS
    ? { today: publicCountsCache.today, total: publicCountsCache.total }
    : null;
  if (!counts) {
    if (publicCountsCache) {
      // Stale cache: serve it instantly, refresh in the background.
      counts = { today: publicCountsCache.today, total: publicCountsCache.total };
      ctx.waitUntil(refreshPublicCountsCache(env).catch(() => {}));
    } else {
      // Cold isolate (no cache yet): one direct read to seed the cache. This
      // is a single ~10ms D1 query on the first request per isolate only.
      counts = await readPublicCounts(env);
      publicCountsCache = { today: counts.today, total: counts.total, ts: Date.now() };
    }
  }

  return jsonResponseCounts(counts);
}

const COUNT_HEADERS = {
  "content-type": "application/json",
  // Never cache the beacon — every page load must re-count.
  "cache-control": "no-store, max-age=0",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "referrer-policy": "no-referrer"
};

function jsonResponseCounts(c: { today: number; total: number }): Response {
  return new Response(JSON.stringify({ today: c.today, total: c.total }), {
    status: 200,
    headers: COUNT_HEADERS
  });
}

// ---------- Admin stats ----------

export interface DayStat {
  day: string;
  pageviews: number;
}
export interface AdminStats {
  today: number;
  yesterday: number;
  last_7_days: number;
  last_30_days: number;
  all_time: number;
  tracking_since: string | null;
  days: DayStat[]; // per-day, newest first, up to 90
  configured: boolean;
}

export async function collectAdminStats(env: Env): Promise<AdminStats> {
  if (!env.STATS_DB) {
    return {
      today: 0, yesterday: 0, last_7_days: 0, last_30_days: 0, all_time: 0,
      tracking_since: null, days: [], configured: false
    };
  }
  const today = tehranDay(env);
  const yesterday = daysAgoDay(env, 1);
  const weekStart = daysAgoDay(env, 6);
  const monthStart = daysAgoDay(env, 29);
  try {
    const results = await env.STATS_DB.batch([
      env.STATS_DB.prepare("SELECT COALESCE(pageviews,0) AS v FROM daily_stats WHERE day = ?1").bind(today),
      env.STATS_DB.prepare("SELECT COALESCE(pageviews,0) AS v FROM daily_stats WHERE day = ?1").bind(yesterday),
      env.STATS_DB.prepare("SELECT COALESCE(SUM(pageviews),0) AS v FROM daily_stats WHERE day >= ?1").bind(weekStart),
      env.STATS_DB.prepare("SELECT COALESCE(SUM(pageviews),0) AS v FROM daily_stats WHERE day >= ?1").bind(monthStart),
      env.STATS_DB.prepare("SELECT COALESCE(SUM(pageviews),0) AS v FROM daily_stats"),
      env.STATS_DB.prepare("SELECT v FROM stats_meta WHERE k = 'tracking_since'"),
      env.STATS_DB.prepare("SELECT day, pageviews FROM daily_stats ORDER BY day DESC LIMIT 90").all()
    ]);
    const val = (i: number): number => {
      const r = results[i].results && results[i].results[0];
      return r ? Number(r.v) || 0 : 0;
    };
    const sinceRow = results[5].results && results[5].results[0];
    const days: DayStat[] = (results[6].results || []).map((r: any) => ({
      day: r.day,
      pageviews: Number(r.pageviews) || 0
    }));
    return {
      today: val(0),
      yesterday: val(1),
      last_7_days: val(2),
      last_30_days: val(3),
      all_time: val(4),
      tracking_since: sinceRow ? sinceRow.v || null : null,
      days,
      configured: true
    };
  } catch (e) {
    console.warn("stats collectAdminStats failed: " + (e && e.message));
    return {
      today: 0, yesterday: 0, last_7_days: 0, last_30_days: 0, all_time: 0,
      tracking_since: null, days: [], configured: true
    };
  }
}

// Format an integer with thousands separators in Persian digits (for the
// admin dashboard + footer). 12345 -> "۱۲٬۳۴۵" (fa-IR grouping + the Persian
// thousands separator U+066C). 0 -> "۰".
export function faNum(n: number): string {
  try {
    return toFaDigits(Number(n || 0).toLocaleString("en-US").replace(/,/g, "\u066C"));
  } catch (e) {
    return toFaDigits(String(n || 0));
  }
}
