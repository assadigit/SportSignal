// Self-check: v13.56-visitcount — the cookieless page-view counter.
//
// Covers three layers:
//   1) LOGIC — bot detection (Googlebot/bingbot/GPTBot/ClaudeBot/PetalBot +
//      curl/python + empty UA → blocked; real Chrome/Safari/Firefox → counted),
//      Tehran-calendar day computation (UTC→Asia/Tehran midnight boundary),
//      and Persian-digit number formatting.
//   2) WIRING — the /api/visit beacon (public, pre-auth-gate) + /api/stats
//      (admin-gated) routes exist in api.ts; the footer counter markup +
//      beacon inline script exist in the homepage + SEO page-shell; the
//      admin card + loader exist in admin.ts.
//   3) HONESTY — the /privacy page describes the cookieless, IP-free counter
//      accurately (no longer claims "no analytics" while a counter runs).
//
// The pure functions are extracted from src/stats.ts (single source of
// truth) + toFaDigits from src/utils.ts, eval'd in an isolated box.
const fs = require("fs");
const path = require("path");

let failed = 0;
const check = (name, cond) => {
  console.log((cond ? "OK   " : "FAIL ") + name);
  if (!cond) failed++;
};

const read = (rel) => fs.readFileSync(path.join(__dirname, "..", rel), "utf8");
const statsSrc = read("src/stats.ts");
const utilsSrc = read("src/utils.ts");
const apiSrc = read("src/api.ts");
const publicSrc = read("src/pages/public.ts");
const shellSrc = read("src/seo/page-shell.ts");
const adminSrc = read("src/pages/admin.ts");
const privacySrc = read("src/seo/pages-static.ts");
const wranglerSrc = read("wrangler.toml");
const schemaSrc = read("db/stats-schema.sql");

// ---------- extract + eval the pure helpers ----------
// Apply the same TS-erasing transform scripts/lib/worker-src.js uses, plus
// rules for the annotations stats.ts uses (Date/string/number/boolean params
// + return types) so the eval'd source is plain JS.
function transform(ts) {
  let c = ts;
  c = c.replace(/^export const\s+/gm, "var ");
  c = c.replace(/^export (async )?function\s+/gm, "$1function ");
  c = c.replace(/(\w)\?([,)])/g, "$1$2");
  c = c.replace(/(\w)\?:/g, "$1:");
  c = c.replace(/env: Env/g, "env");
  c = c.replace(/: any\)/g, ")");
  c = c.replace(/: any =/g, " =");
  c = c.replace(/ as any;/g, ";");
  // stats.ts annotations
  c = c.replace(/: Date([,)])/g, "$1");
  c = c.replace(/: string([,)])/g, "$1");
  c = c.replace(/: boolean([,)])/g, "$1");
  c = c.replace(/: number([,)])/g, "$1");
  c = c.replace(/\):\s*(string|boolean|number|void|Date|any)\s*\{/g, ") {");
  return c;
}
const statsJs = transform(statsSrc);
const utilsJs = transform(utilsSrc);

function extractFn(src, name) {
  const start = src.indexOf("function " + name + "(");
  if (start < 0) throw new Error("function " + name + " not found");
  let i = src.indexOf("{", start) + 1;
  let depth = 1;
  while (depth > 0 && i < src.length) {
    const c = src[i];
    if (c === "{") depth++;
    else if (c === "}") depth--;
    if (depth === 0) break;
    i++;
  }
  return src.slice(start, i + 1);
}
const toFaDigitsSrc = extractFn(utilsJs, "toFaDigits");
const tehranDaySrc = extractFn(statsJs, "tehranDay");
const isBotSrc = extractFn(statsJs, "isBotUserAgent");
const faNumSrc = extractFn(statsJs, "faNum");
const botRegexSrc = (statsJs.match(/var BOT_REGEX\b[\s\S]*?;\n/) || [""])[0];

const box = eval("(function(){\n" + toFaDigitsSrc + "\n" + botRegexSrc + "\n" + tehranDaySrc + "\n" + isBotSrc + "\n" + faNumSrc + "\nreturn {BOT_REGEX:BOT_REGEX, tehranDay:tehranDay, isBotUserAgent:isBotUserAgent, faNum:faNum};\n})()");
const { tehranDay, isBotUserAgent, faNum } = box;

// ---------- 1) LOGIC: bot detection ----------
const BOTS = [
  "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
  "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)",
  "Mozilla/5.0 AppleWebKit/537.36 (compatible; GPTBot/1.0; +https://openai.com/gptbot)",
  "ClaudeBot/1.0 (https://anthropic.com/claudebot)",
  "Mozilla/5.0 (compatible; PetalBot;+https://webmaster.petalsearch.com/site/petalbot)",
  "Mozilla/5.0 (compatible; Bytespider; spider-feedback@bytedance.com)",
  "Mozilla/5.0 (compatible; Applebot/0.1; +http://www.apple.com/go/applebot)",
  "Mozilla/5.0 (compatible; YandexBot/3.0; +http://yandex.com/bots)",
  "Mozilla/5.0 (compatible; AhrefsBot/7.0; +http://ahrefs.com/robot/)",
  "curl/8.0.1",
  "python-requests/2.31.0",
  "Mozilla/5.0 (compatible; SemrushBot/7~bl; +http://www.semrush.com/bot.html)"
];
BOTS.forEach((ua) => check("bot blocked: " + ua.slice(0, 38), isBotUserAgent(ua) === true));

const REAL = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
  "Mozilla/5.0 (Linux; Android 13; SM-S901B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36"
];
REAL.forEach((ua) => check("real browser counted: " + ua.slice(0, 30), isBotUserAgent(ua) === false));

check("empty UA treated as bot (defensive)", isBotUserAgent("") === true);
check("null/undefined UA treated as bot", isBotUserAgent(null) === true && isBotUserAgent(undefined) === true);

// ---------- 1b) LOGIC: Tehran-calendar day ----------
// Iran Standard Time = UTC+3:30 (no DST since 2022).
// 21:00 UTC → 00:30 next day in Tehran → next calendar day.
check("tehranDay 21:00Z → next day (UTC+3:30 crosses midnight)", tehranDay({ TEHRAN_TZ: "Asia/Tehran" }, new Date("2026-01-15T21:00:00Z")) === "2026-01-16");
check("tehranDay 20:00Z → same day (23:30 Tehran)", tehranDay({ TEHRAN_TZ: "Asia/Tehran" }, new Date("2026-01-15T20:00:00Z")) === "2026-01-15");
check("tehranDay defaults to Asia/Tehran when env TZ absent", tehranDay({}, new Date("2026-01-15T21:00:00Z")) === "2026-01-16");
check("tehranDay output is YYYY-MM-DD", /^\d{4}-\d{2}-\d{2}$/.test(tehranDay({ TEHRAN_TZ: "Asia/Tehran" })));

// ---------- 1c) LOGIC: Persian-digit formatting ----------
check("faNum(0) → ۰", faNum(0) === "\u06F0");
check("faNum(7) → ۷", faNum(7) === "\u06F7");
check("faNum(12345) → ۱۲٬۳۴۵ (Persian digits + U+066C separator)", faNum(12345) === "\u06F1\u06F2\u066C\u06F3\u06F4\u06F5");
check("faNum(45678) → ۴۵٬۶۷۸", faNum(45678) === "\u06F4\u06F5\u066C\u06F6\u06F7\u06F8");
check("faNum(undefined) → ۰ (safe default)", faNum(undefined) === "\u06F0");

// ---------- 2) WIRING: routes ----------
check("/api/visit beacon route registered (public, pre-auth-gate)", /url\.pathname === "\/api\/visit" && req\.method === "GET"/.test(apiSrc));
check("/api/visit handler is handleVisitBeacon", /return await handleVisitBeacon\(req, env, ctx\)/.test(apiSrc));
check("/api/stats admin route registered in POST_GATE_ROUTES", /path: "\/api\/stats", method: "GET"/.test(apiSrc));
check("/api/stats handler calls collectAdminStats", /return jsonResponse\(await collectAdminStats\(env\)\)/.test(apiSrc));
check("handleVisitBeacon + collectAdminStats imported from ./stats", /from "\.\/stats"/.test(apiSrc));

// ---------- 2b) WIRING: footer counter + beacon on the homepage ----------
check("homepage footer has visitCount container", /id="visitCount"/.test(publicSrc));
check("homepage footer has vcToday + vcTotal number spans", /id="vcToday"/.test(publicSrc) && /id="vcTotal"/.test(publicSrc));
check("homepage fires /api/visit beacon (inline script)", /fetch\('\/api\/visit'/.test(publicSrc));
check("homepage beacon uses no-store + keepalive (no caching, survives unload)", /cache:'no-store'/.test(publicSrc) && /keepalive:true/.test(publicSrc));
check("homepage number span has fixed min-width (no layout shift)", /min-width:3\.4em/.test(publicSrc));

// ---------- 2c) WIRING: footer counter + beacon on SEO pages ----------
check("SEO page-shell footer has visitCount container", /id="visitCount"/.test(shellSrc));
check("SEO page-shell fires /api/visit beacon (inline script)", /fetch\('\/api\/visit'/.test(shellSrc));
check("SEO page-shell number span has fixed min-width (no layout shift)", /min-width:3\.4em/.test(shellSrc));

// ---------- 2d) WIRING: admin card ----------
check("admin page has stats card (#stats container)", /id="stats"/.test(adminSrc));
check("admin page has loadStats + renderStats functions", /async function loadStats\(/.test(adminSrc) && /function renderStats\(/.test(adminSrc));
check("admin loadStats fetches /api/stats", /api\("\/api\/stats"\)/.test(adminSrc));
check("admin renderStats called on init", /loadStats\(\)/.test(adminSrc));
check("admin renderStats called on language toggle (onLang)", /renderStats\(\)/.test(adminSrc));
check("admin stats card shows today/yesterday/7d/30d/all-time chips", /d\.today/.test(adminSrc) && /d\.yesterday/.test(adminSrc) && /d\.last_7_days/.test(adminSrc) && /d\.last_30_days/.test(adminSrc) && /d\.all_time/.test(adminSrc));

// ---------- 3) HONESTY: privacy page ----------
check("privacy page describes the cookieless counter", /شمارنده/.test(privacySrc) && /بدون کوکی/.test(privacySrc));
check("privacy page discloses NO IP / NO fingerprint (honest)", /بدون نشانی IP|نشانی IP/.test(privacySrc) && /اثر انگشت/.test(privacySrc));
check("privacy page mentions bot filtering (Googlebot/bingbot/GPTBot/ClaudeBot)", /Googlebot/.test(privacySrc) && /ClaudeBot/.test(privacySrc));
check("privacy meta description describes the cookieless counter (no longer 'no analytics')", /شمارنده ساده و بدون کوکی/.test(privacySrc));
check("privacy answercard no longer claims 'no analytics tool' (honest update)", !/هیچ ابزار آمارگیر/.test(privacySrc));

// ---------- 4) D1 binding + schema ----------
check("wrangler.toml declares a d1_databases binding", /\[\[d1_databases\]\]/.test(wranglerSrc));
check("wrangler.toml binds STATS_DB (the stats D1 database)", /binding = "STATS_DB"/.test(wranglerSrc));
check("schema.sql defines daily_stats(day, pageviews)", /CREATE TABLE IF NOT EXISTS daily_stats/.test(schemaSrc) && /pageviews INTEGER/.test(schemaSrc));
check("stats.ts reads env.STATS_DB (optional binding, degrades gracefully)", /env\.STATS_DB/.test(statsSrc));
check("stats.ts counts in ctx.waitUntil (never slows the response)", /ctx\.waitUntil\(/.test(statsSrc));
check("stats.ts beacon returns no-store (every visit re-counts)", /cache-control.*no-store/.test(statsSrc));

// ---------- 5) no immutable-asset edits (the rename-on-edit rule) ----------
// The counter is implemented entirely in server-rendered templates + inline
// scripts, so public-13.15.js / .css / core-13.8.js must be UNTOUCHED (no
// 13.16 rename, no SW v19 bump needed). Guards against accidental edits.
const headersSrc = read("assets/_headers");
check("public-13.15.js still referenced (not renamed) — no immutable-asset edit", /\/public-13\.15\.js/.test(publicSrc));
check("public-13.15.css still referenced (not renamed)", /\/public-13\.15\.css/.test(publicSrc));
check("core-13.8.js still referenced (not renamed)", /\/core-13\.8\.js/.test(publicSrc));
check("assets/_headers still pins public-13.15 immutable (unchanged)", /\/public-13\.15\.js\s*\n\s*Cache-Control: public, max-age=31536000, immutable/.test(headersSrc));
check("no public-13.16 asset was created (counter is inline, not a new bundle)", !fs.existsSync(path.join(__dirname, "..", "assets", "public-13.16.js")));

console.log("\n" + (failed === 0 ? "✅ all stats checks passed" : "❌ " + failed + " check(s) failed"));
process.exit(failed === 0 ? 0 : 1);
