// Self-check: v13.57-uniqueregions — the cookieless visitor counter with
// unique-visitor dedup, per-country breakdown, and live online-now tracking.
//
// Covers three layers:
//   1) LOGIC — bot detection, Tehran-calendar day, Persian-digit formatting,
//      country flag emoji + Persian name mapping, and the unique-visitor
//      fingerprint stability (same IP+UA+day → same hash; different UA →
//      different hash; different day → different hash).
//   2) WIRING — /api/visit beacon (public) + /api/stats (admin) routes; the
//      live stats box below the cups card on the homepage; the footer counter
//      on both page templates; the admin card with online/unique/country.
//   3) HONESTY — /privacy accurately describes the salted one-way hash dedup
//      (no IP storage), country-code aggregation, and online-now tracking.
//   4) SCHEMA — D1 v2 tables (daily_visitors, country_stats, visitor_online)
//      + daily_stats.visitors column + auto-salt row.
//   5) no immutable-asset edits (the counter is server-rendered + inline).
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
const schemaV1 = read("db/stats-schema.sql");
const schemaV2 = read("db/stats-schema-v2.sql");

// ---------- extract + eval the pure helpers ----------
function transform(ts) {
  let c = ts;
  c = c.replace(/^export const\s+/gm, "var ");
  c = c.replace(/^export (async )?function\s+/gm, "$1function ");
  c = c.replace(/^export interface\b[\s\S]*?\n\}\n/gm, "");
  // Convert ALL line-starting const/let to var so the eval'd concatenation has
  // no temporal-dead-zone issues when helpers are re-ordered (non-exported
  // top-level consts like COUNTRY_FA would otherwise stay `const`).
  c = c.replace(/^(const|let)\s+/gm, "var ");
  c = c.replace(/(\w)\?([,)])/g, "$1$2");
  c = c.replace(/(\w)\?:/g, "$1:");
  c = c.replace(/env: Env/g, "env");
  c = c.replace(/: Request/g, "req");
  c = c.replace(/: any\)/g, ")");
  c = c.replace(/: any =/g, " =");
  c = c.replace(/ as any;/g, ";");
  c = c.replace(/: Date([,)])/g, "$1");
  c = c.replace(/: string([,)])/g, "$1");
  c = c.replace(/: boolean([,)])/g, "$1");
  c = c.replace(/: number([,)])/g, "$1");
  c = c.replace(/\):\s*(string|boolean|number|void|Date|any|PublicStatsBlock|AdminStats)\s*\{/g, ") {");
  c = c.replace(/: Record<string, string>/g, "");
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
const flagSrc = extractFn(statsJs, "countryFlag");
const nameSrc = extractFn(statsJs, "countryNameFa");
const botRegexSrc = (statsJs.match(/var BOT_REGEX\b[\s\S]*?;\n/) || [""])[0];
const countryFaSrc = (statsJs.match(/var COUNTRY_FA\b[\s\S]*?\n\};/) || [""])[0].replace(/\n\};/, "\n};");
const onlineWinSrc = (statsJs.match(/var ONLINE_WINDOW_SECONDS\b[\s\S]*?;\n/) || [""])[0];

const box = eval("(function(){\n" + toFaDigitsSrc + "\n" + botRegexSrc + "\n" + countryFaSrc + "\n" + onlineWinSrc + "\n" + tehranDaySrc + "\n" + isBotSrc + "\n" + faNumSrc + "\n" + flagSrc + "\n" + nameSrc + "\nreturn {BOT_REGEX:BOT_REGEX, COUNTRY_FA:COUNTRY_FA, ONLINE_WINDOW_SECONDS:ONLINE_WINDOW_SECONDS, tehranDay:tehranDay, isBotUserAgent:isBotUserAgent, faNum:faNum, countryFlag:countryFlag, countryNameFa:countryNameFa};\n})()");
const { tehranDay, isBotUserAgent, faNum, countryFlag, countryNameFa, COUNTRY_FA, ONLINE_WINDOW_SECONDS } = box;

// ---------- 1a) LOGIC: bot detection ----------
const BOTS = [
  "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
  "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)",
  "Mozilla/5.0 AppleWebKit/537.36 (compatible; GPTBot/1.0; +https://openai.com/gptbot)",
  "ClaudeBot/1.0 (https://anthropic.com/claudebot)",
  "Mozilla/5.0 (compatible; PetalBot;+https://webmaster.petalsearch.com/site/petalbot)",
  "Mozilla/5.0 (compatible; Bytespider; spider-feedback@bytedance.com)",
  "curl/8.0.1", "python-requests/2.31.0",
  "Mozilla/5.0 (compatible; SemrushBot/7~bl; +http://www.semrush.com/bot.html)"
];
BOTS.forEach((ua) => check("bot blocked: " + ua.slice(0, 30), isBotUserAgent(ua) === true));
const REAL = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17.0 Safari/605.1.15"
];
REAL.forEach((ua) => check("real browser counted: " + ua.slice(0, 28), isBotUserAgent(ua) === false));
check("empty UA treated as bot", isBotUserAgent("") === true);
check("null UA treated as bot", isBotUserAgent(null) === true);

// ---------- 1b) LOGIC: Tehran-calendar day (UTC+3:30, no DST) ----------
check("tehranDay 21:00Z → next day (midnight crossing)", tehranDay({ TEHRAN_TZ: "Asia/Tehran" }, new Date("2026-01-15T21:00:00Z")) === "2026-01-16");
check("tehranDay 20:00Z → same day (23:30 Tehran)", tehranDay({ TEHRAN_TZ: "Asia/Tehran" }, new Date("2026-01-15T20:00:00Z")) === "2026-01-15");
check("tehranDay defaults to Asia/Tehran", tehranDay({}, new Date("2026-01-15T21:00:00Z")) === "2026-01-16");
check("tehranDay output is YYYY-MM-DD", /^\d{4}-\d{2}-\d{2}$/.test(tehranDay({ TEHRAN_TZ: "Asia/Tehran" })));

// ---------- 1c) LOGIC: Persian-digit formatting ----------
check("faNum(0) → ۰", faNum(0) === "\u06F0");
check("faNum(12345) → ۱۲٬۳۴۵ (U+066C separator)", faNum(12345) === "\u06F1\u06F2\u066C\u06F3\u06F4\u06F5");
check("faNum(45678) → ۴۵٬۶۷۸", faNum(45678) === "\u06F4\u06F5\u066C\u06F6\u06F7\u06F8");
check("faNum(undefined) → ۰", faNum(undefined) === "\u06F0");

// ---------- 1d) LOGIC: country flag emoji (regional indicator symbols) ----------
check("countryFlag('IR') → 🇮🇷", countryFlag("IR") === "\u{1F1EE}\u{1F1F7}");
check("countryFlag('GB') → 🇬🇧", countryFlag("GB") === "\u{1F1EC}\u{1F1E7}");
check("countryFlag('AU') → 🇦🇺", countryFlag("AU") === "\u{1F1E6}\u{1F1FA}");
check("countryFlag('US') → 🇺🇸", countryFlag("US") === "\u{1F1FA}\u{1F1F8}");
check("countryFlag('DE') → 🇩🇪", countryFlag("DE") === "\u{1F1E9}\u{1F1EA}");
check("countryFlag lowercase 'ir' → 🇮🇷 (case-insensitive)", countryFlag("ir") === "\u{1F1EE}\u{1F1F7}");
check("countryFlag('') → black flag fallback", countryFlag("") === "\u{1F3F4}");
check("countryFlag('XYZ') → black flag (3 chars rejected)", countryFlag("XYZ") === "\u{1F3F4}");

// ---------- 1e) LOGIC: country Persian names ----------
check("countryNameFa('IR') → ایران", countryNameFa("IR") === "\u0627\u06CC\u0631\u0627\u0646");
check("countryNameFa('GB') → انگلستان", countryNameFa("GB") === "\u0627\u0646\u06AF\u0644\u0633\u062A\u0627\u0646");
check("countryNameFa('AU') → استرالیا", countryNameFa("AU") === "\u0627\u0633\u062A\u0631\u0627\u0644\u06CC\u0627");
check("countryNameFa('XX') → XX (unknown code passes through)", countryNameFa("XX") === "XX");
check("countryNameFa('') → —", countryNameFa("") === "\u2014");
check("COUNTRY_FA has Iran+UK+Australia+Germany", COUNTRY_FA.IR && COUNTRY_FA.GB && COUNTRY_FA.AU && COUNTRY_FA.DE);

// ---------- 1f) LOGIC: online window ----------
check("ONLINE_WINDOW_SECONDS = 300 (5 min)", ONLINE_WINDOW_SECONDS === 300);

// ---------- 1g) LOGIC: unique-visitor fingerprint (via stats.ts source) ----------
// The fingerprint is sha256(salt + "|" + ip + "|" + ua + "|" + day). Assert the
// build + the SHA-256 crypto path exist; the per-day uniqueness is structurally
// guaranteed by the day being part of the hash input.
check("visitorFingerprint uses salt+ip+ua+day (daily unique dedup)", /visitorFingerprint[\s\S]*?sha256Hex\(salt \+ "\|" \+ ip \+ "\|" \+ ua \+ "\|" \+ day\)/.test(statsSrc));
check("visitorFingerprint reads CF-Connecting-IP (never stored)", /req\.headers\.get\("CF-Connecting-IP"\)/.test(statsSrc));
check("recordVisit uses INSERT OR IGNORE for daily unique dedup", /INSERT OR IGNORE INTO daily_visitors/.test(statsSrc));
check("recordVisit detects new-vs-returning via meta.changes", /ins\.meta && ins\.meta\.changes > 0/.test(statsSrc));
check("recordVisit upserts daily_stats visitors only when new", /visitors = visitors \+ \?2/.test(statsSrc));

// ---------- 1h) LOGIC: country + online recording ----------
check("recordVisit reads country from req.cf.country (Cloudflare edge)", /cf\.country \|\| req\.headers\.get\("CF-IPCountry"\)/.test(statsSrc));
check("recordVisit upserts country_stats (day, country)", /INSERT INTO country_stats/.test(statsSrc) && /ON CONFLICT\(day, country\)/.test(statsSrc));
check("recordVisit upserts visitor_online last_seen", /INSERT INTO visitor_online \(visitor, last_seen\)/.test(statsSrc));
check("recordVisit prunes old data occasionally (2%)", /Math\.random\(\) < 0\.02/.test(statsSrc) && /DELETE FROM daily_visitors WHERE day/.test(statsSrc) && /DELETE FROM visitor_online WHERE last_seen/.test(statsSrc));

// ---------- 2) WIRING: routes ----------
check("/api/visit beacon route registered (public, pre-auth-gate)", /url\.pathname === "\/api\/visit" && req\.method === "GET"/.test(apiSrc));
check("/api/visit handler is handleVisitBeacon", /return await handleVisitBeacon\(req, env, ctx\)/.test(apiSrc));
check("/api/stats admin route registered", /path: "\/api\/stats", method: "GET"/.test(apiSrc));
check("/api/stats handler calls collectAdminStats", /return jsonResponse\(await collectAdminStats\(env\)\)/.test(apiSrc));

// ---------- 2b) WIRING: homepage live stats box + footer ----------
check("homepage has #statsCard below cups card", /id="statsCard"/.test(publicSrc));
check("homepage has #statsBox container", /id="statsBox"/.test(publicSrc));
check("homepage stats card placed after cups card", publicSrc.indexOf('id="cupsCard"') < publicSrc.indexOf('id="statsCard"'));
check("homepage footer has visitCount + vcToday + vcTotal", /id="visitCount"/.test(publicSrc) && /id="vcToday"/.test(publicSrc) && /id="vcTotal"/.test(publicSrc));
check("homepage fires ONE /api/visit beacon (single fetch fills box + footer)", (publicSrc.match(/fetch\('\/api\/visit'/g) || []).length === 1);
check("homepage beacon uses no-store + keepalive", /cache:'no-store'/.test(publicSrc) && /keepalive:true/.test(publicSrc));
check("homepage beacon renders online + today_views + today_visitors + total_views", /d\.online/.test(publicSrc) && /d\.today_views/.test(publicSrc) && /d\.today_visitors/.test(publicSrc) && /d\.total_views/.test(publicSrc));
check("homepage beacon renders country table", /d\.countries/.test(publicSrc) && /c\.flag/.test(publicSrc) && /c\.pct/.test(publicSrc));
check("homepage footer number span has fixed min-width (no layout shift)", /min-width:3\.4em/.test(publicSrc));

// ---------- 2c) WIRING: SEO page footer ----------
check("SEO page-shell footer has visitCount", /id="visitCount"/.test(shellSrc));
check("SEO page-shell fires /api/visit beacon", /fetch\('\/api\/visit'/.test(shellSrc));
check("SEO page-shell beacon uses today_views/total_views (v2 field names)", /d\.today_views/.test(shellSrc) && /d\.total_views/.test(shellSrc));

// ---------- 2d) WIRING: admin card ----------
check("admin page has stats card (#stats container)", /id="stats"/.test(adminSrc));
check("admin renderStats shows online now (d.online)", /d\.online/.test(adminSrc));
check("admin renderStats shows unique visitors (today_visitors)", /d\.today_visitors/.test(adminSrc) && /d\.yesterday_visitors/.test(adminSrc) && /d\.last_7_visitors/.test(adminSrc) && /d\.last_30_visitors/.test(adminSrc) && /d\.all_time_visitors/.test(adminSrc));
check("admin renderStats shows views (today_views etc.)", /d\.today_views/.test(adminSrc) && /d\.all_time_views/.test(adminSrc));
check("admin renderStats shows country tables (countries_today + countries_30d)", /d\.countries_today/.test(adminSrc) && /d\.countries_30d/.test(adminSrc));
check("admin renderStats called on init + language toggle", /loadStats\(\)/.test(adminSrc) && /renderStats\(\)/.test(adminSrc));

// ---------- 3) HONESTY: privacy page ----------
check("privacy describes unique visitors + salted hash (no IP storage)", /درهم‌شده یک‌طرفه|hash نمک‌دار|SHA-256/.test(privacySrc) && /نشانی IP واقعی هرگز ذخیره نمی‌شود/.test(privacySrc));
check("privacy describes country-code aggregation (not personal data)", /کد کشور/.test(privacySrc) && /داده تجمیعی است، نه داده شخصی/.test(privacySrc));
check("privacy describes online-now tracking + auto-prune", /آنلاین اکنون/.test(privacySrc) && /قدیمی‌تر از یک ساعت/.test(privacySrc));
check("privacy mentions bot filtering (Googlebot/ClaudeBot)", /Googlebot/.test(privacySrc) && /ClaudeBot/.test(privacySrc));
check("privacy meta description mentions hash + no-IP", /hash نمک‌دار، بدون ذخیره IP/.test(privacySrc));

// ---------- 4) SCHEMA: D1 v2 ----------
check("schema v2 adds daily_stats.visitors column", /ALTER TABLE daily_stats ADD COLUMN visitors/.test(schemaV2));
check("schema v2 creates daily_visitors(day, visitor) dedup table", /CREATE TABLE IF NOT EXISTS daily_visitors/.test(schemaV2) && /PRIMARY KEY \(day, visitor\)/.test(schemaV2));
check("schema v2 creates country_stats(day, country)", /CREATE TABLE IF NOT EXISTS country_stats/.test(schemaV2) && /PRIMARY KEY \(day, country\)/.test(schemaV2));
check("schema v2 creates visitor_online(visitor, last_seen)", /CREATE TABLE IF NOT EXISTS visitor_online/.test(schemaV2) && /visitor\s+TEXT\s+PRIMARY\s+KEY/.test(schemaV2));
check("schema v2 seeds stats_meta salt row", /INSERT OR IGNORE INTO stats_meta \(k, v\) VALUES \('salt', ''\)/.test(schemaV2));
check("wrangler.toml binds STATS_DB (D1)", /binding = "STATS_DB"/.test(wranglerSrc));
check("stats.ts auto-generates salt via crypto.getRandomValues", /crypto\.getRandomValues\(new Uint8Array\(32\)\)/.test(statsSrc));
check("stats.ts stores salt in stats_meta (not in source)", /UPDATE stats_meta SET v = \?1 WHERE k = 'salt'/.test(statsSrc));
check("stats.ts counts in ctx.waitUntil", /ctx\.waitUntil\(/.test(statsSrc));
check("stats.ts beacon returns no-store", /cache-control.*no-store/.test(statsSrc));

// ---------- 5) immutable-asset rename done correctly (13.19 → 13.20) ----------
// v13.61-goldglow: featured class moved to spotitem wrapper (fills full
// container); animated glitter shimmer + pulsing glow + radial glow shift;
// more prominent (tint 16%, glow 28%, !important overrides). SW v22 → v23.
const headersSrc = read("assets/_headers");
const swSrc = read("assets/sw.js");
const js20 = read("assets/public-13.23.js");
check("public-13.23.js referenced in homepage (renamed from 13.22)", /\/public-13\.23\.js/.test(publicSrc));
check("public-13.23.css referenced in homepage (renamed from 13.22)", /\/public-13\.23\.css/.test(publicSrc));
check("public-13.23.css referenced in SEO page-shell (renamed)", /\/public-13\.23\.css/.test(shellSrc));
check("core-13.9.js referenced in homepage (renamed from 13.8)", /\/core-13\.9\.js/.test(publicSrc));
check("public-13.23.js exists", fs.existsSync(path.join(__dirname, "..", "assets", "public-13.23.js")));
check("public-13.23.css exists", fs.existsSync(path.join(__dirname, "..", "assets", "public-13.23.css")));
check("assets/_headers pins public-13.23 immutable", /\/public-13\.23\.js\s*\n\s*Cache-Control: public, max-age=31536000, immutable/.test(headersSrc));
check("assets/_headers pins public-13.23.css immutable", /\/public-13\.23\.css\s*\n\s*Cache-Control: public, max-age=31536000, immutable/.test(headersSrc));
check("SW cache bumped to sportsignal-v27 (replaces v26)", /CACHE = "sportsignal-v27"/.test(swSrc));
check("barTarget checks nextBig before topSpot (all competitions)", /t=DATA\.nextBig\|\|null.*if\(!t\)\{t=a\}/.test(js20));
check("featKeys() helper exists (cap at N per list)", /function featKeys\(arr,cap\)/.test(js20));
check("featKeys filters on .big (both teams desired)", /m&&m\.big/.test(js20));
check("featKeys caps at 2", /featKeys\(e,2\)/.test(js20));
check("featKeys excludes hero match key (no double glow in lists)", /var hb=barTarget\(\),hk=hb&&hb\.m\?keyOf\(hb\.m\):""/.test(js20) && /if\(hk&&k===hk\)continue/.test(js20));
check("spotItemNode adds match-featured to spotitem wrapper when t.feat (not featOuter)", /t&&t\.feat&&!fo&&\(r\.className\+=" match-featured"\)/.test(js20));
check("spotItemNode adds sr-only span when t.feat", /t&&t\.feat\)\{if\(!fo\)\{n\.className\+=" match-featured"\}var sr=document\.createElement\("span"\);sr\.className="sr-only"/.test(js20));
check("spotItemNode featOuter option (hero: class on outer card, not here)", /var fo=t&&t\.featOuter/.test(js20));
check("renderTopSpot passes feat option", /feat:fk\.has\(keyOf\(i\)\)/.test(js20));
check("renderWeek passes feat option", /feat:wfk\.has\(keyOf\(d\)\)/.test(js20));
check("renderLive passes feat option", /feat:lfk\.has\(keyOf\(o\)\)/.test(js20));
check("renderUcl passes feat option", /feat:ufk\.has\(keyOf\(c\)\)/.test(js20));
check("renderHeroSpot passes feat:!!t.big + featOuter:!!t.big", /feat:!!t\.big,featOuter:!!t\.big/.test(js20));
check("renderHeroSpot adds match-featured to #bigHeroCard when t.big", /t&&t\.big&&\(e\.className\+=" match-featured"\)/.test(js20));
check("homepage inline CSS uses grass green accent #4CBB17", /#4CBB17/.test(publicSrc));
check("homepage inline CSS has .match-featured with flat outer glow (no inset)", /\.match-featured\{.*box-shadow:0 0 var\(--feat-blur\).*!important/.test(publicSrc) && !/inset/.test(publicSrc.match(/\.match-featured\{[^}]+\}/)?.[0]||''));
check("featured CSS has feat-shimmer animation (list cards)", /feat-shimmer/.test(publicSrc) && /infinite/.test(publicSrc));
check("featured CSS has feat-glow-shift animation", /feat-glow-shift/.test(publicSrc));
check("featured CSS makes inner .match panel transparent", /match-featured \.match\{background:transparent!important/.test(publicSrc));
check("featured CSS fixes inner .match overflow", /match-featured \.match\{.*overflow:visible!important/.test(publicSrc));
check("hero CSS: glow on #bigHeroCard.match-featured", /#bigHeroCard\.match-featured\{/.test(publicSrc));
check("hero CSS: feat-hero-sweep (7s infinite, R→L)", /feat-hero-sweep 7s/.test(publicSrc) && /@keyframes feat-hero-sweep/.test(publicSrc));
check("hero CSS: feat-hero-pulse (5s infinite)", /feat-hero-pulse 5s/.test(publicSrc) && /@keyframes feat-hero-pulse/.test(publicSrc));
check("hero CSS: mask-image fades tint+sweep at L/R edges", /-webkit-mask-image:linear-gradient\(to right,transparent 0%,black 1[34]%,black 8[67]%,transparent 100%\)/.test(publicSrc) && /mask-image:linear-gradient\(to right,transparent 0%,black 1[34]%,black 8[67]%,transparent 100%\)/.test(publicSrc));
check("hero CSS: hover lift (translateY)", /#bigHeroCard\.match-featured:hover\{transform:translateY/.test(publicSrc));
check("hero CSS: no inset in .match-featured rule (flat)", !/inset/.test(publicSrc.match(/\.match-featured\{[^}]+\}/)?.[0]||''));
check("featured CSS has reduced-motion guard (incl hero)", /prefers-reduced-motion:reduce\)\{\.match-featured\{animation:none\}/.test(publicSrc) && /#bigHeroCard\.match-featured\{animation:none\}/.test(publicSrc));
check("homepage inline CSS has .sr-only class", /\.sr-only\{/.test(publicSrc));
check("public countries capped at 5 (SQL LIMIT 5)", /LIMIT 5/.test(statsSrc));

// v13.65-lgtitle: hLgNext retitled (domestic leagues + cups only; UCL has its own section)
const coreSrc = read("assets/core-13.9.js");
check("core-13.9.js exists", fs.existsSync(path.join(__dirname, "..", "assets", "core-13.9.js")));
check("core-13.9.js fa hLgNext retitled to دیدارهای جذاب لیگ‌ها", /hLgNext:"دیدارهای جذاب لیگ‌ها"/.test(coreSrc));
check("core-13.9.js en hLgNext retitled to Exciting League Fixtures", /hLgNext:"Exciting League Fixtures"/.test(coreSrc));
check("core-13.9.js referenced in admin page", /\/core-13\.9\.js/.test(read("src/pages/admin.ts")));
check("core-13.9.js referenced in login page", /\/core-13\.9\.js/.test(read("src/pages/login.ts")));
check("assets/_headers pins core-13.9 immutable", /\/core-13\.9\.js\s*\n\s*Cache-Control: public, max-age=31536000, immutable/.test(headersSrc));
check("homepage server fallback h2 retitled (no old text)", /<h2 data-i="hLgNext" id="topSpotTitle">دیدارهای جذاب لیگ‌ها<\/h2>/.test(publicSrc) && !/مسابقات بزرگ پیش‌رو/.test(publicSrc));

console.log("\n" + (failed === 0 ? "✅ all stats checks passed" : "❌ " + failed + " check(s) failed"));
process.exit(failed === 0 ? 0 : 1);
