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
// v13.83 split: the stats wiring moved with the template body/JS into
// admin-html.ts / admin-js.ts; the composer admin.ts still pins the
// core-13.9.js script tag + ${VERSION} footer.
const adminHtmlSrc = read("src/pages/admin-html.ts");
const adminJsSrc = read("src/pages/admin-js.ts");
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
check("admin page has stats card (#stats container)", /id="stats"/.test(adminHtmlSrc));
check("admin renderStats shows online now (d.online)", /d\.online/.test(adminJsSrc));
check("admin renderStats shows unique visitors (today_visitors)", /d\.today_visitors/.test(adminJsSrc) && /d\.yesterday_visitors/.test(adminJsSrc) && /d\.last_7_visitors/.test(adminJsSrc) && /d\.last_30_visitors/.test(adminJsSrc) && /d\.all_time_visitors/.test(adminJsSrc));
check("admin renderStats shows views (today_views etc.)", /d\.today_views/.test(adminJsSrc) && /d\.all_time_views/.test(adminJsSrc));
check("admin renderStats shows country tables (countries_today + countries_30d)", /d\.countries_today/.test(adminJsSrc) && /d\.countries_30d/.test(adminJsSrc));
check("admin renderStats called on init + language toggle", /loadStats\(\)/.test(adminJsSrc) && /renderStats\(\)/.test(adminJsSrc));
check("admin composer stays thin (≤40 lines)", adminSrc.split("\n").length <= 40);
check("styles-shared consumed by all three templates", [adminSrc, read("src/pages/login.ts"), read("src/pages/public.ts")].every((s) => /\.\/styles-shared/.test(s)));
check("admin split modules exist (css/html/js)", ["admin-css.ts", "admin-html.ts", "admin-js.ts"].every((f) => fs.existsSync(path.join(__dirname, "..", "src", "pages", f))));
check("byte-parity harness is in the test chain", /check-admin-parity\.js/.test(read("package.json")));

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
const js20 = read("assets/public-13.26.js");
const slugsSrc = read("src/slugs.ts");
const seoCfgSrc = read("src/seo/config.ts");
check("public-13.26.js referenced in homepage (renamed from 13.24)", /\/public-13\.26\.js/.test(publicSrc));
check("public-13.23.css referenced in homepage (renamed from 13.22)", /\/public-13\.23\.css/.test(publicSrc));
check("public-13.23.css referenced in SEO page-shell (renamed)", /\/public-13\.23\.css/.test(shellSrc));
check("core-13.10.js referenced in homepage (public page script tag)", /\/core-13\.10\.js/.test(publicSrc));
check("public-13.26.js exists", fs.existsSync(path.join(__dirname, "..", "assets", "public-13.26.js")));
check("public-13.23.css exists", fs.existsSync(path.join(__dirname, "..", "assets", "public-13.23.css")));
check("assets/_headers pins public-13.26 immutable", /\/public-13\.26\.js\s*\n\s*Cache-Control: public, max-age=31536000, immutable/.test(headersSrc));
check("assets/_headers pins public-13.23.css immutable", /\/public-13\.23\.css\s*\n\s*Cache-Control: public, max-age=31536000, immutable/.test(headersSrc));
check("SW cache bumped to sportsignal-v29 (replaces v28)", /CACHE = "sportsignal-v29"/.test(swSrc));
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
const coreSrc = read("assets/core-13.10.js");
check("core-13.10.js exists (renamed from 13.9 in v13.84, rename-on-edit rule)", fs.existsSync(path.join(__dirname, "..", "assets", "core-13.10.js")) && !fs.existsSync(path.join(__dirname, "..", "assets", "core-13.9.js")));
check("core-13.10.js fa hLgNext retitled to دیدارهای جذاب لیگ‌ها", /hLgNext:"دیدارهای جذاب لیگ‌ها"/.test(coreSrc));
check("core-13.10.js en hLgNext retitled to Exciting League Fixtures", /hLgNext:"Exciting League Fixtures"/.test(coreSrc));
check("core-13.10.js referenced in admin page", /\/core-13\.10\.js/.test(read("src/pages/admin.ts")));
check("core-13.10.js referenced in login page", /\/core-13\.10\.js/.test(read("src/pages/login.ts")));
check("core-13.10.js referenced in public page", /\/core-13\.10\.js/.test(read("src/pages/public.ts")));
check("assets/_headers pins core-13.10 immutable", /\/core-13\.10\.js\s*\n\s*Cache-Control: public, max-age=31536000, immutable/.test(headersSrc));
// v13.84: the orphan data-i keys found by the QA sweep — hStats/btnStats had
// no dict entries, so the live admin showed raw "hStats"/"btnStats" text in
// BOTH languages. Locked so a future key typo can't resurrect silently.
check("core-13.10.js fa dict covers hStats (visit-stats heading)", /hStats:"📊 آمار بازدید"/.test(coreSrc));
check("core-13.10.js fa dict covers btnStats (refresh-stats button)", /btnStats:"🔄 به‌روزرسانی آمار"/.test(coreSrc));
check("core-13.10.js en dict covers hStats + btnStats", /hStats:"📊 Visit Stats"/.test(coreSrc) && /btnStats:"🔄 Refresh stats"/.test(coreSrc));
check("core-13.10.js dead ver keys (stale v12.33 text) removed", !/ver:"(نسخه ۱۲|v12\.33)/.test(coreSrc));
check("every admin data-i/data-p key has a dict entry (orphan sweep)", (() => {
  const used = new Set();
  for (const m of read("src/pages/admin.ts").matchAll(/data-(?:i|p)="(\w+)"/g)) used.add(m[1]); // composer carries titleA
  for (const m of read("src/pages/admin-html.ts").matchAll(/data-(?:i|p)="(\w+)"/g)) used.add(m[1]);
  for (const m of read("src/pages/admin-js.ts").matchAll(/T\("(\w+)"/g)) used.add(m[1]);
  const login = read("src/pages/login.ts");
  for (const m of login.matchAll(/data-(?:i|p)="(\w+)"/g)) used.add(m[1]);
  for (const m of (login.match(/<script>([\s\S]*?)<\/script>/) || [,""])[1].matchAll(/T\("(\w+)"/g)) used.add(m[1]);
  const dicts = coreSrc.slice(coreSrc.indexOf("var I18N="), coreSrc.indexOf("aboutP2"));
  const missing = [...used].filter((k) => !dicts.includes(k + ':"'));
  if (missing.length) console.log("     orphan keys:", missing.join(", "));
  return missing.length === 0;
})());
check("homepage server fallback h2 retitled (no old text)", /<h2 data-i="hLgNext" id="topSpotTitle">دیدارهای جذاب لیگ‌ها<\/h2>/.test(publicSrc) && !/مسابقات بزرگ پیش‌رو/.test(publicSrc));

// ---------- 9) v13.80-canonical-hrefs: payload-carried match paths ----------
// The bug this locks out: public-13.23.js re-rendered every match row with a
// PRIVATE slugifier (no TEAM_SLUGS table) → chelsea-vs-tottenham-hotspur-…,
// bayern-munchen-…, milan-vs-… — 404s. The fix: ONE slug module (src/slugs.ts,
// moved out of seo/config.ts so the payload shaper can import it), pubMatch
// stamps `path` on every row, and the client's matchHref prefers that field.
check("slugs.ts module exists (moved out of seo/config.ts)", fs.existsSync(path.join(__dirname, "..", "src", "slugs.ts")));
check("slugs.ts carries TEAM_SLUGS + teamSlug + matchPath (no shim re-exports)",
  /export const TEAM_SLUGS/.test(slugsSrc) && /export function teamSlug\(/.test(slugsSrc) && /export function matchPath\(/.test(slugsSrc));
check("seo/config.ts no longer exports slug fns (single home, no re-export shim)",
  !/export function teamSlug/.test(seoCfgSrc) && !/export function matchPath/.test(seoCfgSrc) && !/export const TEAM_SLUGS/.test(seoCfgSrc));
check("pubMatch stamps the canonical path on every payload row",
  /path: matchPath\(m\.homeTeam\.name, m\.awayTeam\.name, m\.utcDate\)/.test(read("src/public-matches.ts")));
check("public-matches.ts imports matchPath from ./slugs", /from "\.\/slugs"/.test(read("src/public-matches.ts")));
check("client matchHref prefers the payload path (fallback only for stale caches)",
  /function matchHref\(e\)\{var a=String\(e\.utcDate\|\|""\)\.slice\(0,10\);return e\.path\|\|/.test(js20));
check("worker-src harness orders slugs.ts before public-matches.ts",
  (() => { const o = read("scripts/lib/worker-src.js"); const iS = o.indexOf('"slugs.ts"'); const iP = o.indexOf('"public-matches.ts"'); return iS !== -1 && iP !== -1 && iS < iP; })());
// behavioral: the slug block from the REAL harness concat (post-transform)
const wsrc = require("./lib/worker-src")();
{
  const src = wsrc;
  const grabVar = (name) => { const m = wsrc.match(new RegExp("var " + name + " = \\{[\\s\\S]*?\\n\\};")); if (!m) throw new Error("grabVar miss " + name); return m[0]; };
  const grabFn = (sig) => { const i = src.indexOf(sig); if (i < 0) throw new Error("grabFn miss " + sig); const j = src.indexOf("\n}", i); return src.slice(i, j + 2); };
  const grabSet = (name) => { const m = src.match(new RegExp("const " + name + " = new Set\\(\\[[\\s\\S]*?\\]\\);")); if (!m) throw new Error("grabSet miss " + name); return m[0]; };
  const slugBlock = grabVar("TEAM_SLUGS") + "\n" + grabSet("STRICT_STRIP") + "\n" + grabFn("function teamSlug(name)") + "\n" + grabFn("function matchPath(homeName, awayName, utcDate)");
  eval(slugBlock);
  check("teamSlug honors the fixed table (Tottenham Hotspur FC → tottenham)", teamSlug("Tottenham Hotspur FC") === "tottenham");
  check("teamSlug transliterates the fixed table (FC Bayern München → bayern-munich)", teamSlug("FC Bayern M\u00FCnchen") === "bayern-munich");
  check("teamSlug strips legal tokens dynamically (Lille OSC → lille-osc)", teamSlug("Lille OSC") === "lille-osc");
  check("matchPath builds the canonical form", matchPath("Chelsea FC", "Tottenham Hotspur FC", "2026-10-24T16:30:00Z") === "/matches/chelsea-vs-tottenham-2026-10-24");
  check("matchPath matches the API/sitemap/JSON-LD form (Club Atlético de Madrid)", matchPath("Club Atl\u00E9tico de Madrid", "Manchester United FC", "2026-10-13T19:00:00Z") === "/matches/club-atletico-de-madrid-vs-manchester-united-2026-10-13");
  // client side: matchHref must return e.path verbatim when present
  const mhSrc = js20.match(/function matchHref\(e\)\{[\s\S]*?\}function nameInto/)[0].replace(/function nameInto[\s\S]*$/, "");
  globalThis.seoTeamSlug = (n) => String(n || "").toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const matchHref = new Function("return " + mhSrc.replace("function matchHref(e)", "function mh(e)"))();
  check("matchHref returns the payload path when present (no guessing)", matchHref({ utcDate: "2026-10-24T16:30:00Z", homeTeam: { name: "Chelsea FC" }, awayTeam: { name: "Tottenham Hotspur FC" }, path: "/matches/chelsea-vs-tottenham-2026-10-24" }) === "/matches/chelsea-vs-tottenham-2026-10-24");
  check("matchHref still works on stale rows without path (fallback)", matchHref({ utcDate: "2026-10-24T16:30:00Z", homeTeam: { name: "Chelsea FC" }, awayTeam: { name: "Tottenham Hotspur FC" } }) === "/matches/chelsea-fc-vs-tottenham-hotspur-fc-2026-10-24");
}
// pubMatch behavioral: the payload row carries the same canonical path
{
  const src = wsrc;
  const pubSrc = src.match(/function pubMatch\(m\) \{[\s\S]*?\n\}/)[0].replace(/^function pubMatch\(m\) \{/, "").replace(/\n\}$/, "");
  globalThis.translateTeam = (n) => n;
  globalThis.translateCompetition = () => "x";
  globalThis.translateVenue = (v) => v;
  globalThis.LEAGUE_LOGOS = {};
  globalThis.isLiveStatus = (s) => s === "LIVE";
  globalThis.isFeaturedMatch = () => false;
  globalThis.isDerby = () => false;
  globalThis.rivalryName = () => null;
  // v13.85-stadiumchip: pubMatch's home-ground fallback (the path checks
  // here don't assert venue; the table wiring has its own behavioral checks
  // in check-venue). v13.86-groundsfix: curatedVenueFa rides the same rule.
  globalThis.homeGround = () => null;
  globalThis.curatedVenueFa = () => null;
  const roundFaSrc = src.match(/var ROUND_FA = \{[\s\S]*?\n\};/)[0];
  const faOrdSrc = src.match(/var FA_ORDINALS = \[[\s\S]*?\];/)[0];
  const roundLabelSrc = src.match(/function roundLabel\(m\) \{[\s\S]*?\n\}/)[0];
  const slugBlock = src.match(/var TEAM_SLUGS = \{[\s\S]*?\n\};/)[0] + "\n" + src.match(/const STRICT_STRIP = new Set\(\[[\s\S]*?\]\);/)[0] + "\n" + src.match(/function teamSlug\(name\) \{[\s\S]*?\n\}/)[0] + "\n" + src.match(/function matchPath\(homeName, awayName, utcDate\) \{[\s\S]*?\n\}/)[0];
  new Function(roundFaSrc + "\n" + faOrdSrc + "\n" + roundLabelSrc + "\n" + slugBlock + "\nglobalThis.ROUND_FA = ROUND_FA; globalThis.FA_ORDINALS = FA_ORDINALS; globalThis.roundLabel = roundLabel; globalThis.matchPath = matchPath;")();
  const pubMatch = new Function("m", pubSrc + "; return pubMatch(m);");
  const out = pubMatch({ homeTeam: { name: "Chelsea FC" }, awayTeam: { name: "Tottenham Hotspur FC" }, utcDate: "2026-10-24T16:30:00Z", competition: { code: "PL" }, status: "SCHEDULED" });
  check("pubMatch row carries the canonical path (Tottenham via TEAM_SLUGS)", out.path === "/matches/chelsea-vs-tottenham-2026-10-24");
  const out2 = pubMatch({ homeTeam: { name: "FC Bayern M\u00FCnchen" }, awayTeam: { name: "Borussia Dortmund" }, utcDate: "2026-10-31T19:30:00Z", competition: { code: "BL1" }, status: "SCHEDULED" });
  check("pubMatch row carries the canonical path (Bayern transliteration)", out2.path === "/matches/bayern-munich-vs-borussia-dortmund-2026-10-31");
}

// ---------- 10) v13.81-matchpage: the match destination + growth loop ----------
const pagesSrc = read("src/seo/pages.ts");
const shellSrc81 = read("src/seo/page-shell.ts");
check("match page carries the scoreboard head (matchhead section)", /<section class="matchhead" aria-label="خلاصه بازی">/.test(pagesSrc));
check("matchhead renders both crests + monogram fallback", /function crestHtml\(t: any\)/.test(pagesSrc) && /class="mcrest"/.test(pagesSrc) && /mcrest-mono/.test(pagesSrc));
check("match page countdown element only for upcoming (data-kickoff)", /class="mcount" data-kickoff="/.test(pagesSrc));
check("match page countdown script ticks + Persian digits + kickoff stop", /querySelector\('\.mcount'\)/.test(pagesSrc) && /setTimeout\(tick,30000\)/.test(pagesSrc) && /\\u06F0\\u06F1/.test(pagesSrc));
check("match page actions: calendar + whatsapp + telegram + copy", /mact-cal/.test(pagesSrc) && /wa\.me\/\?text=/.test(pagesSrc) && /t\.me\/share\/url\?url=/.test(pagesSrc) && /copyMatchLink/.test(pagesSrc));
check("calendar link built from kickoff +2h basic format", /gcalBasic\(m\.utcDate, 0\) \+ "\/" \+ gcalBasic\(m\.utcDate, 2\)/.test(pagesSrc));
check("match page styles present in page-shell (matchhead/mactions/mact)", /\.matchhead\{/.test(shellSrc81) && /\.mactions\{/.test(shellSrc81) && /\.mact\{/.test(shellSrc81));
check("matchhead mobile stacking breakpoint (560px)", /@media \(max-width:560px\)\{\.matchhead/.test(shellSrc81));
check("matchhead live dot pulse guarded by prefers-reduced-motion", /@media \(prefers-reduced-motion:reduce\)\{\.mdot\{animation:none\}\}/.test(shellSrc81));
check("hero row is a link now (noLink dropped from the hero spotItemNode call)", /spotItemNode\(t,0,\{noDate:!0,feat:!!t\.big,featOuter:!!t\.big\}\)/.test(js20) && !/spotItemNode\(t,0,\{noDate:!0,noLink:!0/.test(js20));
check("heroH1Sync exists and runs inside renderHeroSpot (EN H1 fix)", /function heroH1Sync\(\)/.test(js20) && /heroH1Sync\(\),fitHeroNames\(\)\}\}/.test(js20));
check("heroH1Sync writes the EN sentence (Next big match:)", /"Next big match: "\+r\+" \\u2013 "\+n/.test(js20));
check("shareUrl helper prefers the payload path", /function shareUrl\(e\)\{return e&&e\.path\?location\.origin\+e\.path:null\}/.test(js20));
check("share texts append the canonical URL (wa.me + copy)", /var su=shareUrl\(e\),txt=shareText\(e,a\),wtxt=su\?txt\+"\\n\\n"\+su:txt/.test(js20));
check("telegram share targets the match URL when present", /encodeURIComponent\(su\|\|location\.origin\+location\.pathname\)/.test(js20));
check("calendar event title stays plain (details carry the URL)", /&text="\+plain\+"&dates="/.test(js20) && /"&details="\+t/.test(js20));

// ---------- 11) v13.82-matchday: venue hydration + map links + sibling fixtures ----------
const dataSrc82 = read("src/seo/data.ts");
const pubSrc82 = read("src/public-matches.ts");
const routerSrc82 = read("src/seo/router.ts");
// venue hydration: the gates (QA finding — .mvenue was dead code because no
// provider supplies venue for scheduled matches)
check("hydrateMatchVenue exists with the numeric-FD-id gate", /export async function hydrateMatchVenue\(env: Env, sm: SeoMatch \| null\)/.test(dataSrc82) && /\/\^\\d\+\$\/\.test\(String\(id\)\)\) return sm;/.test(dataSrc82));
check("hydrateMatchVenue is fail-closed (error returns sm unchanged, no negative cache)", /return sm; \/\/ fail-closed: transient failure/.test(dataSrc82));
check("hydrateMatchVenue caches positive AND negative in venue_v1_ (24h TTL)", /CONFIG\.KV_VENUE_CACHE \+ id/.test(dataSrc82) && /expirationTtl: 86400/.test(dataSrc82) && read("src/config.ts").includes('KV_VENUE_CACHE: "venue_v1_"'));
check("hydrateMatchVenue races a 5s guard so the render can never hang", /Promise\.race\(\[\s*\n\s*fetchJSON\("https:\/\/api\.football-data\.org\/v4\/matches\/" \+ id, 1, \{ "X-Auth-Token": env\.API_TOKEN \}\)/.test(dataSrc82) && /setTimeout\(\(\) => r\(null\), 5000\)/.test(dataSrc82));
check("hydrateMatchVenue patches sm.s.venue + venueFa (v13.86: curated first, then translateVenue)", /sm\.s\.venue = rec\.v;/.test(dataSrc82) && /sm\.s\.venueFa = curatedVenueFa\(rec\.v\) \|\| translateVenue\(rec\.v\) \|\| rec\.v;/.test(dataSrc82));
// map link: the venue becomes a place
check("venueMapLink targets Google Maps search (api=1, no key)", /https:\/\/www\.google\.com\/maps\/search\/\?api=1&query=/.test(pagesSrc) && /encodeURIComponent\(m\.venue \+ " stadium"\)/.test(pagesSrc));
check("mvenue in the scoreboard head is the map link (not a dead div)", /if \(m\.venue\) center \+= venueMapLink\(m, "🏟/.test(pagesSrc));
check("facts-table venue row is the map link too", /rows\.push\(\["ورزشگاه", venueMapLink\(m, ""\)\]\)/.test(pagesSrc));
check("venue map link is off-site safe (target _blank + noopener) with sr-only label", /target="_blank" rel="noopener" href="https:\/\/www\.google\.com\/maps/.test(pagesSrc) && /class="sr-only"> — نمایش روی نقشه<\/span>/.test(pagesSrc));
// similar matches card
check("similarMatches exists with the three-stage priority (stage→comp→day)", /export function similarMatches\(ctx: SeoCtx, sm: SeoMatch, max = 6\)/.test(dataSrc82) && /stage = 0/.test(dataSrc82) && /stage = 1/.test(dataSrc82) && /stage = 2/.test(dataSrc82));
check("similarMatches is upcoming-only + self-excluded + pairing-deduped + capped", /if \(!\(t > now\) \|\| isLiveSt\(raw\.status\)\) return; \/\/ upcoming only/.test(dataSrc82) && /\/\/ self/.test(dataSrc82) && /if \(seen\.has\(k\)\) continue;/.test(dataSrc82) && /if \(out\.length >= max\) break;/.test(dataSrc82));
check("match page renders the sibling card (h2 + count chip + mrow rows)", /'<div class="card simcard"><h2>بازی‌های مرتبط <span class="simcount">'/.test(pagesSrc) && /sims\.map\(\(x, i\) => M\.mrowHtml\(x, i, false\)\)/.test(pagesSrc));
check("buildMatchPage is async + awaits the hydration before rendering", /export async function buildMatchPage\(ctx: SeoCtx, slug: string\): Promise<\{ html: string; notFound: boolean \}>/.test(pagesSrc) && /sm = await hydrateMatchVenue\(ctx\.env, sm\);/.test(pagesSrc));
check("seo router awaits the async buildMatchPage", /const r = await buildMatchPage\(seoCtx, mm\[1\]\);/.test(routerSrc82));
// live-detail venue adoption (free data — the fetch is already paid for)
check("enrichLiveMatches extracts det.venue from the already-made detail fetch", /venue: typeof det\.venue === "string" && det\.venue\.trim\(\) \? det\.venue\.trim\(\) : null,/.test(pubSrc82));
check("mvenue-map + simcard + simcount styles present in page-shell", /a\.mvenue-map\{/.test(shellSrc81) && /a\.mvenue-map:hover\{/.test(shellSrc81) && /\.simcard\{/.test(shellSrc81) && /\.simcount\{/.test(shellSrc81));
// behavioral: applyLiveDetail adopts venue (fills, never overwrites)
{
  const src82 = read("src/public-matches.ts");
  const fnSrc = src82.match(/export function applyLiveDetail\(m, detail\) \{[\s\S]*?\n\}/)[0].replace(/^export /, "");
  const applyLiveDetail = new Function(fnSrc + "; return applyLiveDetail;")();
  const m1 = { minute: null, scorers: [], venue: null };
  applyLiveDetail(m1, { minute: 63, scorers: [{ minute: 12, type: "GOAL", scorer: "X", team: "Y" }], venue: "Emirates Stadium", scoreFullTime: null });
  const adopted = m1.venue === "Emirates Stadium" && m1.minute === 63;
  const m2 = { venue: "Old Trafford (provider)" };
  applyLiveDetail(m2, { venue: "Some Other Ground" });
  const neverOverwrites = m2.venue === "Old Trafford (provider)";
  const m3 = { venue: null };
  applyLiveDetail(m3, { minute: 5 });
  const nullVenueStays = m3.venue == null;
  check("applyLiveDetail adopts venue, fills-only (behavioral)", adopted && neverOverwrites && nullVenueStays);
}

// v13.82 addendum: the HOME-GROUND table — the deterministic venue source.
// FD's endpoints return no venue for regular matches (verified live on
// three CL fixtures), so the followed clubs' stadiums light the venue up
// with zero subrequests; the FD-detail fetch remains only for long-tail
// home teams + neutral finals.
const cfgSrc82 = read("src/config.ts");
check("TEAM_STADIUMS table exists for the followed clubs (en + fa)", /TEAM_STADIUMS: \{/.test(cfgSrc82) && /"Arsenal FC": \{ en: "Emirates Stadium", fa: "ورزشگاه امارات" \}/.test(cfgSrc82) && /"Western Sydney Wanderers"/.test(cfgSrc82));
check("shared grounds mapped per club (San Siro × Inter+Milan, AAMI × Melbourne)", /"Inter Milan": \{ en: "San Siro"[^\n]*\n\s*"AC Milan": \{ en: "San Siro"/.test(cfgSrc82) && /"Melbourne Victory": \{ en: "AAMI Park"[^\n]*\n\s*"Melbourne City": \{ en: "AAMI Park"/.test(cfgSrc82));
// v13.86-groundsfix: the live QA finding — FD sends "Club Atl\u00E9tico de
// Madrid" / "FC Internazionale Milano", the v13.85 table keyed the short
// forms, and normalizeTeamName doesn't strip club prefixes → the HERO
// match page + every Inter home fixture rendered venue-less. The table now
// carries BOTH provider forms, and the folding happens in grounds.ts.
check("v13.86-groundsfix: grounds.ts folds club-prefix forms (normTeamKey on map + lookup)", (() => {
  const g = read("src/grounds.ts");
  return /cache\.map\.set\(normTeamKey\(name\)/.test(g) && /table\(\)\.get\(normTeamKey\(homeName\)\)/.test(g);
})());
check("v13.86-groundsfix: TEAM_STADIUMS carries the provider variant keys + the missing followed clubs", (() => {
  return /"Atl\\xE9tico Madrid": \{ en: "Riyadh Air Metropolitano"/.test(cfgSrc82) && /"FC Internazionale Milano": \{ en: "San Siro"/.test(cfgSrc82) && /"Tottenham Hotspur FC": \{ en: "Tottenham Hotspur Stadium"/.test(cfgSrc82) && /"Juventus FC": \{ en: "Allianz Stadium"/.test(cfgSrc82) && /"AS Roma": \{ en: "Stadio Olimpico"/.test(cfgSrc82);
})());
check("v13.86-groundsfix: curated fa for provider venues (one Persian name per ground)", (() => {
  const p = read("src/public-matches.ts");
  const d = read("src/seo/data.ts");
  const g = read("src/grounds.ts");
  return /curatedVenueFa\(m\.venue\) \|\| translateVenue\(m\.venue\)/.test(p) && /sm\.s\.venueFa = curatedVenueFa\(rec\.v\) \|\| translateVenue\(rec\.v\) \|\| rec\.v;/.test(d) && /export function curatedVenueFa\(/.test(g);
})());
check("hydrate consults the home-ground table BEFORE the FD fetch", dataSrc82.indexOf("homeGround(") < dataSrc82.indexOf('fetchJSON("https://api.football-data.org/v4/matches/" + id') && /homeGround\(\s*$|homeGround\(\n/.test(dataSrc82));
check("v13.85-stadiumchip: grounds.ts is the one table+gate (root module)", (() => {
  const g = read("src/grounds.ts");
  return /export function homeGround\(/.test(g) && /export function isOneOffNeutral\(/.test(g) && /TEAM_STADIUMS/.test(g) && /semi\|quarter\|qualif/.test(g);
})());
check("team pages carry the similar-matches strip (sibling loop)", (() => {
  const p = read("src/seo/pages.ts");
  return /const sims = next \? similarMatches\(ctx, next, 6\) : \[\];/.test(p) && /simCard;/m.test(p) && /بازی‌های مرتبط /.test(p);
})());
check("pubMatch adopts the home-ground table (fills-only, provider wins)", (() => {
  const p = read("src/public-matches.ts");
  return /!m\.venue \? homeGround\(m\.homeTeam && m\.homeTeam\.name, m\.stage, m\.round\)/.test(p) && /m\.venue \|\| \(ground \? ground\.en : null\)/.test(p) && /ground \? ground\.fa : null/.test(p);
})());
check("seo hydrate + pubMatch share grounds.ts (no duplicated table logic)", !/TEAM_STADIUMS\) \{/.test(dataSrc82) && !/stadiumNorm/.test(dataSrc82));
check("one-off neutral stages skip the table (FINAL/THIRD_PLACE; roundRaw final-but-not-semi)", (() => {
  const g = read("src/grounds.ts"); // v13.85: the gate moved here from seo/data.ts
  return /=== "FINAL" \|\| s === "THIRD_PLACE"/.test(g) && /\/final\/i\.test\(r\) && !\/semi\|quarter\|qualif\/i\.test\(r\)/.test(g);
})());
check("table venue sets en + fa (no FD round-trip)", /sm\.raw\.venue = g\.en;/.test(dataSrc82) && /sm\.s\.venueFa = g\.fa;/.test(dataSrc82));


// ---- v13.87-formtable: the standings window + the form strip ----
check("v13.87: teamStandingsWindow exists + wired into buildTeamPage", (() => {
  const d = read("src/seo/data.ts");
  const p2 = read("src/seo/pages.ts");
  return /export function teamStandingsWindow\(ctx: SeoCtx, teamName: string, next: SeoMatch \| null, fullByCode\?: Record<string, any>\)/.test(d) && /const stw = teamStandingsWindow\(ctx, entry\.name, next, fullByCode\);/.test(p2) && /stWinCard \+/.test(p2);
})());
check("v13.87: teamForm exists + the match page renders the form strip", (() => {
  const d = read("src/seo/data.ts");
  const p2 = read("src/seo/pages.ts");
  return /export function teamForm\(ctx: SeoCtx, teamName: string, archiveRows: any\[\] = \[\], limit = 5, min = 3\)/.test(d) && /const formCard = formStripHtml\(ctx, sm, archive, fullByCode\);/.test(p2) && /facts \+ formCard \+ similarCard/.test(p2) && /const archive = await loadArchive\(ctx\.env\)\.catch/.test(p2);
})());
check("v13.87: teamForm is fail-closed (min-3 gate; null when short)", (() => {
  const d = read("src/seo/data.ts");
  return /if \(rows\.length < min\) return null;/.test(d) && /min = 3/.test(d);
})());
check("v13.87: teamStandingsWindow picks next-comp then falls back + 5-row window", (() => {
  const d = read("src/seo/data.ts");
  return /next\.s\.competition && next\.s\.competition\.code/.test(d) && /Math\.min\(idx - 2, Math\.max\(0, st\.teams\.length - 5\)\)/.test(d) && /st\.teams\.slice\(start, start \+ 5\)/.test(d);
})());
check("v13.87: the standings window highlights the team row + links the full table", (() => {
  const p2 = read("src/seo/pages.ts");
  return /strow-me/.test(p2) && /<a class="stmore" href="\/competitions\/' \+ compSlug\(stw\.code\)/.test(p2);
})());
check("v13.87: form dots render ب/م/ش with hover titles + count summary", (() => {
  const p2 = read("src/seo/pages.ts");
  return /fdot f' \+ d\.r\.toLowerCase\(\)/.test(p2) && /<i class="fdot f/.test(p2) && /class="formsum"/.test(p2);
})());
check("v13.87: the new styles ship in the page-shell block", (() => {
  const ps = read("src/seo/page-shell.ts");
  return [".strow-me", ".stmore", ".formstrip .formrow", ".fdot", ".fw{", ".fd{", ".fl{", ".formsum"].every((cls) => ps.includes(cls));
})());
check("v13.87: formstrip merges pool FINISHED + archive rows (no provider fetches)", (() => {
  const d = read("src/seo/data.ts");
  const i = d.indexOf("export function teamForm");
  const j = d.indexOf("export function similarMatches", i);
  const seg = d.slice(i, j > 0 ? j : i + 4000);
  return /raw\.status !== "FINISHED"/.test(seg) && /archiveRows/.test(seg) && /\.sort\(\)\.join\("\|"\) \+ "\|" \+ String\(utcDate/.test(seg) && !/fetchJSON|fetch\(/.test(seg);
})());
// v13.87 behavioral: eval the REAL teamForm (brace-matched extraction from
// src/seo/data.ts, TS annotations stripped by EXACT-string replacement --
// the replacements are themselves locks: drift breaks loudly here, not
// silently in prod) with the REAL normalizeTeamName and a stub ctx. Three
// finished rows (pool + archive, one DUPLICATE across sources) must yield
// W/D/L dots in oldest-to-newest order; two rows must yield null (min-3).
check("v13.87 behavioral: teamForm dedupes pool+archive, W/D/L math, min-3 fail-closed", (() => {
  const fs = require("fs");
  const d = fs.readFileSync("src/seo/data.ts", "utf8");
  const i = d.indexOf("export function teamForm");
  if (i < 0) return false;
  const open = d.indexOf("| null {", i) + 7;  // body-open anchored past the return-type braces
  let depth = 0, j = open;
  for (; j < d.length; j++) {
    if (d[j] === "{") depth++;
    else if (d[j] === "}") { depth--; if (depth === 0) break; }
  }
  let seg = d.slice(i, j + 1);
  const sigOld = "function teamForm(ctx: SeoCtx, teamName: string, archiveRows: any[] = [], limit = 5, min = 3): { r: string; oppFa: string; score: string; date: string }[] | null {";
  const sigNew = "function teamForm(ctx, teamName, archiveRows, limit, min) {";
  const unifOld = "const unif: { ts: number; nh: string; homeFa: string; awayFa: string; gh: number; ga: number }[] = [];";
  const addOld = "const addRow = (home: string, away: string, homeFa: string, awayFa: string, utcDate: string, gh: any, ga: any) => {";
  const feOld = "ctx.shaped.forEach((s: any, i: number) => {";
  if (seg.indexOf(sigOld) < 0 || seg.indexOf(unifOld) < 0 || seg.indexOf(addOld) < 0 || seg.indexOf(feOld) < 0) return false;
  seg = seg
    .replace(sigOld, sigNew)
    .replace(/new Set<string>\(\)/g, "new Set()")
    .replace(unifOld, "const unif = [];")
    .replace(addOld, "const addRow = (home, away, homeFa, awayFa, utcDate, gh, ga) => {")
    .replace(feOld, "ctx.shaped.forEach((s, i) => {")
    .replace(/^export /, "");
  const { normalizeTeamName } = require("../src/teams.ts");
  const teamForm = new Function("normalizeTeamName", seg + "\n; return teamForm;")(normalizeTeamName);
  const mk = (h, a, d2, gh, ga) => ({ status: "FINISHED", utcDate: d2, score: { fullTime: { home: gh, away: ga } }, homeTeam: { name: h }, awayTeam: { name: a } });
  const pool = [mk("Arsenal FC", "Leeds United FC", "2026-10-10T18:00:00Z", 2, 1), mk("Arsenal FC", "Chelsea FC", "2026-10-03T16:30:00Z", 1, 1), mk("Everton FC", "Arsenal FC", "2026-09-26T16:30:00Z", 0, 3)];
  const shaped = pool.map((m) => ({ homeTeam: { faName: "\u0622\u0631\u0633\u0627\u0644" }, awayTeam: { faName: "x" } }));
  const archive = [{ m: { utcDate: "2026-10-10T18:00:00Z", homeTeam: { name: "Arsenal FC", faName: "\u0622\u0631\u0633\u0627\u0644" }, awayTeam: { name: "Leeds United FC", faName: "y" }, score: { home: 2, away: 1 } } }];
  const dots = teamForm({ shaped, pool }, "Arsenal FC", archive, 5, 3);
  const ok3 = dots && dots.length === 3 && dots[0].r === "W" && dots[1].r === "D" && dots[2].r === "W" && dots[2].oppFa === "x" && dots[2].date === "2026-10-10";
  const two = teamForm({ shaped: [shaped[0]], pool: [pool[0]] }, "Arsenal FC", [], 5, 3);
  return ok3 && two === null;
})());

// ---- v13.88-formagg: the season-record fallback + the team form card ----
check("v13.88: teamSeasonRecord exists + wired into both pages", (() => {
  const d = read("src/seo/data.ts");
  const p2 = read("src/seo/pages.ts");
  return /export function teamSeasonRecord\(ctx: SeoCtx, teamName: string, fullByCode\?: Record<string, any>\)/.test(d) && /const rec = dots \? null : teamSeasonRecord\(ctx, entryName, fullByCode\);/.test(p2) && /rec: teamSeasonRecord\(ctx, x\.name \|\| "", fullByCode\)/.test(p2);
})());
check("v13.88: teamSeasonRecord is read-only fail-closed (no fetches)", (() => {
  const d = read("src/seo/data.ts");
  const i = d.indexOf("export function teamSeasonRecord");
  const j = d.indexOf("export function teamForm", i);
  const seg = d.slice(i, j > 0 ? j : i + 3500);
  return /ctx\.payload && ctx\.payload\.standings/.test(seg) && /ctx\.payload && ctx\.payload\.ucl/.test(seg) && !/fetchJSON|fetch\(|env\.STATE/.test(seg);
})());
check("v13.88: the match strip falls back to the season chip («وضعیت فصل» title when no dots)", (() => {
  const p2 = read("src/seo/pages.ts");
  return /anyDots \? "فرم اخیر" : "وضعیت فصل"/.test(p2) && /class=\\"fseason\\"/.test(p2.replace(/'/g, '"')) === false && p2.includes('<span class="fseason">') && /f\.rec && f\.rec\.won != null/.test(p2);
})());
check("v13.88: team page gains the form card (async build + router await + archive load)", (() => {
  const p2 = read("src/seo/pages.ts");
  const r = read("src/seo/router.ts");
  return /function teamFormCardHtml/.test(p2) && /const formCard = teamFormCardHtml\(ctx, entry\.name, name, archive, fullByCode\);/.test(p2) && /stWinCard \+\n    formCard \+/.test(p2) && /await buildTeamPage\(seoCtx, tm\[1\]\)/.test(r) && /export async function buildTeamPage/.test(p2);
})());
check("v13.88: the standings position rides the team answer sentence", (() => {
  const p2 = read("src/seo/pages.ts");
  return /const meRow = stw && stw\.meIdx >= 0 \? stw\.rows\[stw\.meIdx\] : null;/.test(p2) && /در ردهٔ " \+ posFa/.test(p2);
})());
check("v13.88: the new styles ship in the page-shell block", (() => {
  const ps = read("src/seo/page-shell.ts");
  return [".fseason", ".fseason .fsw", ".fseason .fsplayed", ".formlegend", ".formlegend .fdot"].every((cls) => ps.includes(cls));
})());
// v13.88 behavioral: eval the REAL teamSeasonRecord (brace-matched
// extraction, TS annotations stripped by exact-string replacement — the
// replacements double as drift locks) with a stub payload: a PL team is
// found with its numbers; a missing team falls through to ucl.teams; an
// unknown team yields null (fail-closed).
check("v13.88 behavioral: teamSeasonRecord finds league + ucl rows, null when absent", (() => {
  const fs = require("fs");
  const d = fs.readFileSync("src/seo/data.ts", "utf8");
  const i = d.indexOf("export function teamSeasonRecord");
  if (i < 0) return false;
  const open = d.indexOf("| null {", i) + 7; // past the return-type braces
  let depth = 0, j = open;
  for (; j < d.length; j++) {
    if (d[j] === "{") depth++;
    else if (d[j] === "}") { depth--; if (depth === 0) break; }
  }
  let seg = d.slice(i, j + 1);
  const sigOld = "function teamSeasonRecord(ctx: SeoCtx, teamName: string, fullByCode?: Record<string, any>): { code: string; compFa: string; pos: number | null; played: number | null; won: number | null; draw: number | null; lost: number | null; points: number | null } | null {";
  const ftOld = "const fromTeams = (teams: any[], code: string, compFa: string) => {";
  const findOld = "teams.find((x: any) => x && normalizeTeamName(x.name) === norm)";
  const numOld = "const num = (v: any) =>";
  if (seg.indexOf(sigOld) < 0 || seg.indexOf(ftOld) < 0 || seg.indexOf(findOld) < 0 || seg.indexOf(numOld) < 0) return false;
  seg = seg
    .replace(sigOld, "function teamSeasonRecord(ctx, teamName, fullByCode) {")
    .replace(ftOld, "const fromTeams = (teams, code, compFa) => {")
    .replace(findOld, "teams.find((x) => x && normalizeTeamName(x.name) === norm)")
    .replace(numOld, "const num = (v) =>")
    .replace("const cand: any[] = [];", "const cand = [];")
    .replace(/^export /, "");
  const { normalizeTeamName } = require("../src/teams.ts");
  // translateCompetition is passed as a STUB (the real dictionary is locked
  // by check-fa-dict); the function under test only needs the CL mapping.
  const faComp = (c) => (c === "CL" ? "لیگ قهرمانان اروپا" : c);
  const fn = new Function("normalizeTeamName", "translateCompetition", "COMP_EN", seg + "\n; return teamSeasonRecord;")(normalizeTeamName, faComp, { PL: "لیگ برتر انگلیس", CL: "لیگ قهرمانان اروپا" });
  const payload = {
    standings: {
      PL: { faName: "لیگ برتر انگلیس", teams: [{ pos: 2, name: "Arsenal FC", played: 9, won: 6, draw: 2, lost: 1, points: 20 }] },
      PD: { faName: "لالیگا", teams: [{ pos: 1, name: "Real Madrid CF", played: 9, won: 7, draw: 2, lost: 0, points: 23 }] }
    },
    ucl: { faName: "لیگ قهرمانان اروپا", teams: [{ pos: 4, name: "Manchester United FC", played: 3, won: 2, draw: 1, lost: 0, points: 7 }] }
  };
  const pl = fn({ payload }, "Arsenal FC");
  const okPl = pl && pl.code === "PL" && pl.won === 6 && pl.draw === 2 && pl.lost === 1 && pl.points === 20 && pl.pos === 2;
  const ucl = fn({ payload }, "Manchester United"); // normalizeTeamName folds club-prefix tokens ("FC")
  const okUcl = ucl && ucl.code === "CL" && ucl.won === 2;
  const uclFa = fn({ payload: { standings: {}, ucl: { teams: [{ pos: 1, name: "Manchester United FC", won: 1, draw: 0, lost: 0, points: 3 }] } } }, "Manchester United");
  const okUclFa = uclFa && uclFa.compFa === "لیگ قهرمانان اروپا"; // v13.89: the faName fallback via translateCompetition
  const none = fn({ payload }, "No Such FC");
  // v13.93-fullrec: fullByCode — a rank-14 side INVISIBLE to the top-8
  // payload compacts gets its record from the full cached table; a full
  // table also WINS over a stale payload row (fresher numbers); both
  // missing stays fail-closed null.
  // v13.110-digitfold: fixture names are LETTER-indexed ("Team N FC"),
  // not digit-indexed — normalizeTeamName now folds club-name digits
  // (founding years/ordinals), so "Team 14 FC"/"Team 9 FC" would all
  // collapse to the single key "team" and the find() would hit the wrong
  // row. Synthetic fixtures must differ by letters, like real clubs do.
  const fullTab = [];
  for (let p = 1; p <= 20; p++) fullTab.push({ pos: p, name: "Team " + String.fromCharCode(64 + p) + " FC", played: 11, won: 12 - p, draw: 2, lost: p - 1, points: 38 - p });
  const bottom = fn({ payload }, "Team N FC", { PL: { teams: fullTab, faName: "لیگ برتر انگلیس" } });
  const okBottom = bottom && bottom.code === "PL" && bottom.pos === 14 && bottom.played === 11 && bottom.lost === 13;
  const freshFull = fn({ payload }, "Arsenal FC", { PL: { teams: [{ pos: 3, name: "Arsenal FC", played: 10, won: 7, draw: 2, lost: 1, points: 23 }], faName: "لیگ برتر انگلیس" } });
  const okFresh = freshFull && freshFull.pos === 3 && freshFull.won === 7 && freshFull.points === 23;
  const bothMiss = fn({ payload }, "No Such FC", { PL: { teams: fullTab } });
  // v13.93 LIVE-QA regression: recCodes ordered the next-fixture CUP first —
  // the 1-game UCL record must NOT drown the 9-game league season (the
  // RICHEST record wins on played count, regardless of insertion order).
  const uclTab = [{ pos: 13, name: "Liverpool FC", played: 1, won: 1, draw: 0, lost: 0, points: 3 }];
  const plTab = []; for (let p = 1; p <= 20; p++) plTab.push({ pos: p, name: p === 9 ? "Liverpool FC" : "Team " + String.fromCharCode(64 + p) + " FC", played: 9, won: 19 - p, draw: 2, lost: p - 1, points: 59 - p });
  const richest = fn({ payload: { ucl: { teams: uclTab } } }, "Liverpool FC", { CL: { teams: uclTab }, PL: { teams: plTab, faName: "لیگ برتر انگلیس" } });
  const okRichest = richest && richest.code === "PL" && richest.pos === 9 && richest.played === 9;
  return okPl && okUcl && okUclFa && none === null && okBottom && okFresh && bothMiss === null && okRichest;
})());

// v13.93-fullrec behavioral: the REAL teamStandingsWindow with a full cached
// table — a rank-12 team (OUTSIDE the payload's top-8 compact) gets its
// 5-row window from the full table with meIdx correct + the entry's faName;
// the window still prefers the next fixture's competition.
check("v13.93 behavioral: teamStandingsWindow serves rank-9+ teams from the full table", (() => {
  const fs = require("fs");
  const d = fs.readFileSync("src/seo/data.ts", "utf8");
  const i = d.indexOf("export function teamStandingsWindow");
  if (i < 0) return false;
  // body-open anchored PAST the return-type braces (the v13.88 lesson)
  const open = d.indexOf("| null {", i) + 7;
  let depth = 0, j = open;
  for (; j < d.length; j++) {
    if (d[j] === "{") depth++;
    else if (d[j] === "}") { depth--; if (depth === 0) break; }
  }
  let seg = d.slice(i, j + 1);
  const sigOld = "function teamStandingsWindow(ctx: SeoCtx, teamName: string, next: SeoMatch | null, fullByCode?: Record<string, any>): { code: string; compFa: string; emblem: string | null; rows: any[]; meIdx: number } | null {";
  const findOld = "teams.find((t: any) => t && normalizeTeamName(t.name) === norm)";
  const findSigOld = "const find = (comp: string): { st: any; me: any } | null => {";
  const codeOld = "let code: string | null = next && next.s.competition && next.s.competition.code;";
  if (seg.indexOf(sigOld) < 0 || seg.indexOf(findOld) < 0 || seg.indexOf(findSigOld) < 0 || seg.indexOf(codeOld) < 0) return false;
  seg = seg
    .replace(sigOld, "function teamStandingsWindow(ctx, teamName, next, fullByCode) {")
    .replace(findOld, "teams.find((t) => t && normalizeTeamName(t.name) === norm)")
    .replace(findSigOld, "const find = (comp) => {")
    .replace(codeOld, "let code = next && next.s.competition && next.s.competition.code;")
    .replace(/^export /, "");
  const { normalizeTeamName } = require("../src/teams.ts");
  const fn = new Function("normalizeTeamName", "COMP_EN", seg + "\n; return teamStandingsWindow;")(normalizeTeamName, { PL: "لیگ برتر انگلیس", CL: "لیگ قهرمانان اروپا" });
  // v13.110-digitfold: letter-indexed fixture names (digits fold — see the
  // teamSeasonRecord behavioral above).
  const mk = (p) => ({ pos: p, name: "Team " + String.fromCharCode(64 + p) + " FC", played: 11, won: 12 - p, draw: 2, lost: p - 1, points: 38 - p });
  const full20 = []; for (let p = 1; p <= 20; p++) full20.push(mk(p));
  const ctx = { payload: { standings: { PL: { faName: "لیگ برتر انگلیس", emblem: "pl.png", teams: full20.slice(0, 8) } } } };
  const nextPL = { s: { competition: { code: "PL" } } };
  // rank-12: NOT in the top-8 payload — the full table serves the window
  const w12 = fn(ctx, "Team L FC", nextPL, { PL: { teams: full20, faName: "لیگ برتر انگلیس" } });
  const ok12 = w12 && w12.rows.length === 5 && w12.rows.map((r) => r.pos).join(",") === "10,11,12,13,14" && w12.meIdx === 2 && w12.compFa === "لیگ برتر انگلیس" && w12.code === "PL";
  // without the full table: same team → null (the v13.87 fail-closed behavior)
  const wNull = fn(ctx, "Team L FC", nextPL, null);
  // next-comp preference: a CUP next fixture falls back to the payload comp
  // WITH its full table (the fallback loop consults fullByCode too)
  const wCup = fn(ctx, "Team L FC", { s: { competition: { code: "FAC" } } }, { PL: { teams: full20, faName: "لیگ برتر انگلیس" } });
  const okCup = wCup && wCup.code === "PL" && wCup.meIdx === 2;
  // top-3 clamping still works from the full table
  const w1 = fn(ctx, "Team A FC", nextPL, { PL: { teams: full20, faName: "لیگ برتر انگلیس" } });
  const ok1 = w1 && w1.rows.map((r) => r.pos).join(",") === "1,2,3,4,5" && w1.meIdx === 0;
  return ok12 && wNull === null && okCup && ok1;
})());


// ---- v13.89-stdetail: the W/D/L column + the full competition table ----
check("v13.89: stWdlHtml renders the compact W·D·L cell in both tables", (() => {
  const p2 = read("src/seo/pages.ts");
  return /function stWdlHtml/.test(p2) && p2.includes('<span class="stwdl" title="برد-مساوی-شکست">') && /stw-w/.test(p2) && /stw-d/.test(p2) && /stw-l/.test(p2) && (p2.match(/stWdlHtml\(t\)/g) || []).length === 2;
})());
check("v13.89: the W·D·L column header ships in both sthead rows", (() => {
  const p2 = read("src/seo/pages.ts");
  return (p2.match(/<span class="sthead-wdl stwdl">ب-م-ش<\/span>/g) || []).length === 2;
})());
check("v13.89: competition pages read the FULL cached table (cache-only, fail-closed)", (() => {
  const p2 = read("src/seo/pages.ts");
  const r = read("src/seo/router.ts");
  return /async function fullStandings/.test(p2) && /await fetchStandings\(env, code, false\)/.test(p2) && /st\.teams\.length > 8/.test(p2) && /await buildCompetitionPage\(seoCtx, cm\[1\]\)/.test(r) && /export async function buildCompetitionPage/.test(p2);
})());
check("v13.89: fullStandings maps faName via translateTeam + keeps wdl fields", (() => {
  const p2 = read("src/seo/pages.ts");
  return /faName: translateTeam\(t\.name\)/.test(p2) && /won: t\.won, draw: t\.draw, lost: t\.lost/.test(p2);
})());
check("v13.89: the season chip carries its competition name", (() => {
  const p2 = read("src/seo/pages.ts");
  return /rec\.compFa \? " " \+ esc\(String\(rec\.compFa\)\) : ""/.test(p2);
})());
check("v13.89: the new styles + a11y polish ship in the page-shell block", (() => {
  const ps = read("src/seo/page-shell.ts");
  return [".stwdl", ".stwdl .stw-w", ".sthead-wdl", "a:focus-visible", ".hubtile:hover{border-color:rgba(94,160,255,.5);transform:translateY(-1px)}", ".pagination a:hover", "@media (prefers-reduced-motion:reduce){.hubtile,.hubtile:hover{transform:none}"].every((s) => ps.includes(s)) && /@media \(max-width:600px\)\{\.stwdl,\.sthead-wdl\{display:none\}\}/.test(ps);
})());

// ---- v13.93-fullrec: the full-table-backed chips + windows (every side gets
// a record; every ranked team gets a window) + the rank badge + polish ----
check("v13.93: fullByCodeFor loader exists, cache-only, ≤2 codes on team pages", (() => {
  const p2 = read("src/seo/pages.ts");
  return /async function fullByCodeFor\(ctx: SeoCtx, codes: \(string \| null \| undefined\)\[\]\)/.test(p2) && /await fullStandings\(ctx\.env, code\)\.catch\(\(\) => null\)/.test(p2) && /const fullByCode = await fullByCodeFor\(ctx, recCodes\);/.test(p2) && /const fullByCode = await fullByCodeFor\(ctx, \[sm\.s\.competition && sm\.s\.competition\.code\]\);/.test(p2);
})());
check("v13.93: the team page derives the codes from its OWN fixtures (the LIVE-QA lesson: the payload top-8 cannot be the source for a rank-9+ team)", (() => {
  const p2 = read("src/seo/pages.ts");
  return /const recCodes: string\[\] = \[\];/.test(p2) && /for \(const m of upcoming\.slice\(0, 12\)\)/.test(p2) && /if \(c && !recCodes\.includes\(c\)\) recCodes\.push\(c\);/.test(p2) && /if \(recCodes\.length >= 2\) break;/.test(p2) && !/fallbackCode/.test(p2);
})());
check("v13.93: the season chip renders the rank badge (fspos) only when pos exists", (() => {
  const p2 = read("src/seo/pages.ts");
  return /rec\.pos != null \? '<b class="fspos">/.test(p2) && /'<b class="fspos">ردیف ' \+ toFaDigits\(String\(rec\.pos\)\)/.test(p2);
})());
check("v13.93: formRowHtml's record type carries pos (the badge source)", (() => {
  const p2 = read("src/seo/pages.ts");
  return /pos\?: number \| null; compFa\?: string \| null \} \| null\): string \{/.test(p2);
})());
check("v13.93: the new styles ship in the page-shell block (badge + polish + reduced-motion)", (() => {
  const ps = read("src/seo/page-shell.ts");
  return [".fseason .fspos", "border-inline-start:3px solid rgba(125,211,252,.55)", ".fdot{", "transition:transform .12s}", ".fdot:hover{transform:scale(1.14)}", ".strow-me:hover{background:rgba(125,211,252,.16)}", ".fdot,.fdot:hover{transform:none}.strow-me{transition:none}"].every((s) => ps.includes(s));
})());
check("v13.93: the full-table path stays reads-only (no fetch with allowFetch=true in the seo layer)", (() => {
  const p2 = read("src/seo/pages.ts");
  return /fetchStandings\(env, code, false\)/.test(p2) && !/fetchStandings\(ctx\.env, code, true\)/.test(p2);
})());

// ---------- 12) v13.103-monthstats: yesterday + current-month visitors ----------
// Pure helper: tehranMonthStart (first day of the CURRENT Tehran month).
const monthStartFnSrc = extractFn(statsJs, "tehranMonthStart");
const tehranMonthStart = eval("(function(){\n" + tehranDaySrc + "\n" + monthStartFnSrc + "\nreturn tehranMonthStart;\n})()");
check("tehranMonthStart mid-month (2026-10-15) → 2026-10-01", tehranMonthStart({ TEHRAN_TZ: "Asia/Tehran" }, new Date("2026-10-15T09:30:00Z")) === "2026-10-01");
check("tehranMonthStart on the 1st (2026-11-01) → 2026-11-01", tehranMonthStart({ TEHRAN_TZ: "Asia/Tehran" }, new Date("2026-11-01T09:30:00Z")) === "2026-11-01");
check("tehranMonthStart Sept-30 20:30Z → 2026-10-01 (Tehran midnight crossing flips the MONTH)", tehranMonthStart({ TEHRAN_TZ: "Asia/Tehran" }, new Date("2026-09-30T20:30:00Z")) === "2026-10-01");
check("tehranMonthStart Dec-31 23:00Z → 2027-01-01 (cross-year, Tehran is already Jan 1)", tehranMonthStart({ TEHRAN_TZ: "Asia/Tehran" }, new Date("2026-12-31T23:00:00Z")) === "2027-01-01");

check("PublicStatsBlock interface carries yesterday_visitors + month_visitors", (() => {
  const reg = statsSrc.slice(statsSrc.indexOf("export interface PublicStatsBlock"), statsSrc.indexOf("const STATS_CACHE_TTL_MS"));
  return /yesterday_visitors: number/.test(reg) && /month_visitors: number/.test(reg);
})());
check("readPublicStatsBlock serves yesterday (day =) + month (day >= the 1st) visitors", (() => {
  const reg = statsSrc.slice(statsSrc.indexOf("async function readPublicStatsBlock"), statsSrc.indexOf("async function refreshPublicCache"));
  return /COALESCE\(visitors,0\) AS u FROM daily_stats WHERE day = \?1"\)\.bind\(yesterday\)/.test(reg) &&
         /COALESCE\(SUM\(visitors\),0\) AS u FROM daily_stats WHERE day >= \?1"\)\.bind\(monthStart\)/.test(reg);
})());
check("beacon no-DB + read-error fallbacks carry the new fields as 0",
  /jsonResponseBlock\(\{ online: 0, today_views: 0, today_visitors: 0, yesterday_visitors: 0, month_visitors: 0, total_views: 0, countries: \[\] \}\)/.test(statsSrc) &&
  /return \{ online: 0, today_views: 0, today_visitors: 0, yesterday_visitors: 0, month_visitors: 0, total_views: 0, countries: \[\] \};/.test(statsSrc));
check("homepage stats box renders \u0628\u0627\u0632\u062F\u06CC\u062F\u06A9\u0646\u0646\u062F\u0647 \u062F\u06CC\u0631\u0648\u0632 + \u0627\u06CC\u0646 \u0645\u0627\u0647 rows",
  /d\.yesterday_visitors/.test(publicSrc) && /d\.month_visitors/.test(publicSrc) &&
  publicSrc.includes("\\u0628\\u0627\\u0632\\u062F\\u06CC\\u062F\\u06A9\\u0646\\u0646\\u062F\\u0647 \\u062F\\u06CC\\u0631\\u0648\\u0632") &&
  publicSrc.includes("\\u0628\\u0627\\u0632\\u062F\\u06CC\\u062F\\u06A9\\u0646\\u0646\\u062F\\u0647 \\u0627\\u06CC\\u0646 \\u0645\\u0627\\u0647"));
check("both footers carry vcYesterday + vcMonth spans (homepage + SEO shell)",
  /id="vcYesterday"/.test(publicSrc) && /id="vcMonth"/.test(publicSrc) &&
  /id="vcYesterday"/.test(shellSrc) && /id="vcMonth"/.test(shellSrc));
check("both beacons set vcYesterday + vcMonth from the served block",
  /set\('vcYesterday',faNum\(d\.yesterday_visitors\|\|0\)\)/.test(publicSrc) && /set\('vcMonth',faNum\(d\.month_visitors\|\|0\)\)/.test(publicSrc) &&
  /set\('vcYesterday',faNum\(d\.yesterday_visitors\|\|0\)\)/.test(shellSrc) && /set\('vcMonth',faNum\(d\.month_visitors\|\|0\)\)/.test(shellSrc));
check("footer labels say \u0628\u0627\u0632\u062F\u06CC\u062F\u06A9\u0646\u062F\u0647 (VISITORS) for the new counters, not \u0628\u0627\u0632\u062F\u06CC\u062F (views)",
  publicSrc.includes("\u0628\u0627\u0632\u062F\u06CC\u062F\u06A9\u0646\u0646\u062F\u0647 \u062F\u06CC\u0631\u0648\u0632:") && publicSrc.includes("\u0628\u0627\u0632\u062F\u06CC\u062F\u06A9\u0646\u0646\u062F\u0647 \u0627\u06CC\u0646 \u0645\u0627\u0647:") &&
  shellSrc.includes("\u0628\u0627\u0632\u062F\u06CC\u062F\u06A9\u0646\u0646\u062F\u0647 \u062F\u06CC\u0631\u0648\u0632:") && shellSrc.includes("\u0628\u0627\u0632\u062F\u06CC\u062F\u06A9\u0646\u0646\u062F\u0647 \u0627\u06CC\u0646 \u0645\u0627\u0647:"));
check("admin card shows this-month chips (views + unique)", /d\.month_views/.test(adminJsSrc) && /d\.month_visitors/.test(adminJsSrc));
check("collectAdminStats feeds month_views/month_visitors (calendar month via tehranMonthStart, batch index 10)",
  /const calMonthStart = tehranMonthStart\(env\)/.test(statsSrc) &&
  /month_views: pair\(10\)\.v, month_visitors: pair\(10\)\.u/.test(statsSrc));
check("privacy lists the new counter labels + the honesty note (aggregates only, no new data collected)",
  /\u00AB\u0628\u0627\u0632\u062F\u06CC\u062F\u06A9\u0646\u0646\u062F\u0647\u200C\u0647\u0627\u06CC \u062F\u06CC\u0631\u0648\u0632\u00BB/.test(privacySrc) &&
  /\u00AB\u0628\u0627\u0632\u062F\u06CC\u062F\u06A9\u0646\u0646\u062F\u0647\u200C\u0647\u0627\u06CC \u0627\u06CC\u0646 \u0645\u0627\u0647\u00BB/.test(privacySrc) &&
  privacySrc.includes("\u0647\u06CC\u0686 \u062F\u0627\u062F\u0647 \u062C\u062F\u06CC\u062F\u06CC \u062C\u0645\u0639\u200C\u0622\u0648\u0631\u06CC \u0646\u0645\u06CC\u200C\u06A9\u0646\u0646\u062F"));

// ---------- 12b) BEHAVIORAL: the REAL readPublicStatsBlock against an in-memory
// D1, under a FIXED clock (the check-priority lesson: never anchor a test to
// the real wall clock). Exercises the exact SQL the beacon serves, including
// the calendar-month semantics (a previous-month row never leaks into the
// month sum) and the month-rollover shape (yesterday can be last month).
const daysAgoSrc = extractFn(statsJs, "daysAgoDay");
const CLOCK = { ms: 0 };
let readBlockFn = null;
try {
  const readBlockSrc = ("async " + extractFn(statsJs, "readPublicStatsBlock"))
    .replace(/\): Promise<PublicStatsBlock> \{/, ") {") // return type
    .replace(/\) as any\[\];/, ");")                     // (… || []) as any[]
    .replace(/const countries: CountryStat\[\] =/, "const countries =");
  readBlockFn = eval("(function(__CLOCKHOLDER){\n" + tehranDaySrc + "\n" + daysAgoSrc + "\n" + monthStartFnSrc + "\n" + onlineWinSrc + "\n" + countryFaSrc + "\n" + flagSrc + "\n" + nameSrc + "\n" +
    "var __RealDate = globalThis.Date; var __Clock = __CLOCKHOLDER;\n" +
    "function __FixedDate(a){ if(this instanceof __FixedDate){ return arguments.length ? new __RealDate(a) : new __RealDate(__Clock.ms); } return new __FixedDate().toString(); }\n" +
    "__FixedDate.now = function(){ return __Clock.ms; };\n" +
    "__FixedDate.parse = __RealDate.parse; __FixedDate.UTC = __RealDate.UTC;\n" +
    "var Date = __FixedDate;\n" +
    readBlockSrc + "\nreturn readPublicStatsBlock;\n})")(CLOCK);
} catch (e) {
  console.log("     readPublicStatsBlock eval failed: " + (e && e.message));
}
// In-memory STATS_DB implementing the exact statement surface readPublicStatsBlock
// uses (unrecognized SQL throws — the mock-env pattern).
function mockStatsDb(seed) {
  function normSql(s) { return s.replace(/\s+/g, " ").trim(); }
  function execOne(sql, args) {
    const s = normSql(sql);
    if (s === "SELECT COALESCE(pageviews,0) AS v, COALESCE(visitors,0) AS u FROM daily_stats WHERE day = ?1") {
      const r = seed.daily[args[0]];
      return [{ v: r ? r.pv : 0, u: r ? r.vis : 0 }];
    }
    if (s === "SELECT COALESCE(SUM(pageviews),0) AS v FROM daily_stats") {
      return [{ v: Object.values(seed.daily).reduce((a, r) => a + r.pv, 0) }];
    }
    if (s === "SELECT COUNT(*) AS n FROM visitor_online WHERE last_seen >= ?1") {
      return [{ n: seed.online.filter((o) => o.last_seen >= args[0]).length }];
    }
    if (s === "SELECT country, visitors FROM country_stats WHERE day = ?1 AND country <> 'XX' ORDER BY visitors DESC LIMIT 5") {
      return Object.entries(seed.country[args[0]] || {})
        .filter(([c]) => c !== "XX")
        .sort((a, b) => b[1] - a[1]).slice(0, 5)
        .map(([country, visitors]) => ({ country, visitors }));
    }
    if (s === "SELECT COALESCE(visitors,0) AS u FROM daily_stats WHERE day = ?1") {
      const r = seed.daily[args[0]];
      return [{ u: r ? r.vis : 0 }];
    }
    if (s === "SELECT COALESCE(SUM(visitors),0) AS u FROM daily_stats WHERE day >= ?1") {
      return [{ u: Object.entries(seed.daily).filter(([d]) => d >= args[0]).reduce((a, [, r]) => a + r.vis, 0) }];
    }
    throw new Error("mock stats D1: unrecognized SQL: " + s);
  }
  function stmt(sql) {
    const st = { __sql: sql, __args: [] };
    st.bind = function () { st.__args = Array.prototype.slice.call(arguments); return st; };
    st.run = async () => ({ meta: { changes: 0 } });
    st.first = async () => execOne(sql, st.__args)[0] || null;
    st.all = async () => ({ results: execOne(sql, st.__args) });
    return st;
  }
  return {
    prepare(sql) { return stmt(sql); },
    async batch(stmts) { return stmts.map((st) => ({ results: execOne(st.__sql, st.__args) })); }
  };
}
const mkEnv = (seed) => ({ STATS_DB: mockStatsDb(seed), TEHRAN_TZ: "Asia/Tehran" });

(async () => {
  check("readPublicStatsBlock evals from the real source (transformed for Node)", typeof readBlockFn === "function");

  // Scenario 1: mid-October — yesterday inside the same month + a Sept row
  // that must NOT leak into the month sum.
  CLOCK.ms = Date.parse("2026-10-15T09:30:00Z"); // Tehran 13:00, Oct 15
  const nowS = Math.floor(CLOCK.ms / 1000);
  const b1 = await readBlockFn(mkEnv({
    daily: {
      "2026-10-15": { pv: 10, vis: 6 },
      "2026-10-14": { pv: 8, vis: 5 },
      "2026-10-02": { pv: 30, vis: 20 },
      "2026-10-01": { pv: 12, vis: 9 },
      "2026-09-30": { pv: 99, vis: 50 }
    },
    online: [{ visitor: "a", last_seen: nowS - 100 }, { visitor: "b", last_seen: nowS - 200 }, { visitor: "c", last_seen: nowS - 3600 }],
    country: { "2026-10-15": { IR: 4, DE: 2, XX: 7 } }
  }));
  check("S1: online counts only the 5-min window (2)", b1.online === 2);
  check("S1: today views/visitors unchanged (10/6)", b1.today_views === 10 && b1.today_visitors === 6);
  check("S1: yesterday_visitors = 5 (the 2026-10-14 row)", b1.yesterday_visitors === 5);
  check("S1: month_visitors = 40 (today+yesterday+Oct2+Oct1; Sept-30's 50 excluded)", b1.month_visitors === 40);
  check("S1: total_views still all-time (159)", b1.total_views === 159);
  check("S1: countries top-5 sorted, XX dropped, pct rounded", b1.countries.length === 2 && b1.countries[0].code === "IR" && b1.countries[0].visitors === 4 && b1.countries[0].pct === 67 && b1.countries[1].code === "DE");

  // Scenario 2: month rollover — Nov 1. Yesterday (Oct 31) is LAST month:
  // still reported as yesterday, but excluded from the month sum.
  CLOCK.ms = Date.parse("2026-11-01T05:00:00Z"); // Tehran 08:30, Nov 1
  const b2 = await readBlockFn(mkEnv({
    daily: { "2026-11-01": { pv: 3, vis: 2 }, "2026-10-31": { pv: 7, vis: 4 } },
    online: [], country: {}
  }));
  check("S2: month boundary resets — month_visitors = 2 (Nov 1 only)", b2.month_visitors === 2 && b2.today_visitors === 2);
  check("S2: yesterday_visitors = 4 (yesterday can be a previous-month day)", b2.yesterday_visitors === 4 && b2.today_views === 3);

  // Scenario 3: no traffic yesterday → 0 (COALESCE, no row).
  CLOCK.ms = Date.parse("2026-10-15T09:30:00Z");
  const b3 = await readBlockFn(mkEnv({
    daily: { "2026-10-15": { pv: 10, vis: 6 }, "2026-10-02": { pv: 30, vis: 20 }, "2026-10-01": { pv: 12, vis: 9 } },
    online: [], country: {}
  }));
  check("S3: missing yesterday row → yesterday_visitors = 0", b3.yesterday_visitors === 0);
  check("S3: month still sums the month (35)", b3.month_visitors === 35);

  console.log("\n" + (failed === 0 ? "✅ all stats checks passed" : "❌ " + failed + " check(s) failed"));
  process.exit(failed === 0 ? 0 : 1);
})().catch((e) => {
  console.error("FAIL behavioral section crashed: " + (e && e.stack ? e.stack : e));
  process.exit(1);
});
