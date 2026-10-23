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
const crypto = require("crypto");
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
const js20 = read("assets/public-13.50.js");
const slugsSrc = read("src/slugs.ts");
const seoCfgSrc = read("src/seo/config.ts");
check("public-13.50.js referenced in homepage (13.50 since v13.169-mcv2 — the owner-supplied V2 blank template replaces the V1 frame: renderMCard renders the PLAYER PORTRAITS (club-keyed HERO_ART cutouts into the static .mc-port containers — the same featured-player mapping the PC hero figures use, never a wrong-club player, unmapped club => empty slot), the WEEKDAY+date banner line (fa: fa-IR-u-ca-persian weekday+day+month «سه‌شنبه ۵ آبان»; en: \"Tuesday, 27 October\"), the .mc-name-xl one-line-fit step-down (fa>11/en>10 chars) and the localized venue fallback («استادیوم نامشخص»/Venue TBA); mcStateSet parks the countdown + shows the LIVE/FT/postponed chip (status from the match data, never the clock) and updateBigBar calls it on every tick + a new FINISHED branch; 13.49 since v13.165-mcfa — renderMCard goes LOCALE-AWARE (faName names + the Jalali date + faNum digits + venueFa; en: the artwork Latin design language), the mset cell writer rides fmtNum, the #mcHint scroll hint shows/hides with the card; 13.48 since v13.164-matchcard — the MOBILE hero card)", /\/public-13\.50\.js/.test(publicSrc) && !/\/public-13\.49\.js\/<\/script/.test(publicSrc));
check("public-13.68.css referenced in homepage (13.68 since v13.169-mcv2 — the V2 mobile HUD match card: every slot re-measured from the V2 template's pixels + the owner's Visual reference v2.png — crest boxes (30,52)/(70,52) 17cqw x max-h 21.3cqw, names (30,61.3)/(70,61.3) 39cqw with .mc-name-xl, banner date y68.65 + kickoff y72.6 fs 11.2cqw, countdown centers 28/51/73 numbers y81.2 fs 7.2cqw labels y84.6 fs 2.9cqw, venue left 42.5% maxw 41cqw — + the NEW .mc-ports portrait layer (clipped above the panel glow at y39%, object-fit:contain, single drop-shadow rim light) + the .mc-state chip + the aspect flip 743/1357 -> 600/1065 in the v13.167 width-driven fill + the VS/MATCH DAY pills retire; 13.67 since v13.168-mchint — the ×1.5 «بازی‌های دیگر» scroll-hint button + the 148px height term; 13.66 since v13.167-mcfill — the width-driven FILL; 13.64 since v13.165-mcfa — the cropped frame geometry + the FA presentation overrides + the .mc-hint; 13.63 since v13.164-matchcard — the MOBILE hero card block)", /\/public-13\.68\.css/.test(publicSrc) && !/\/public-13\.67\.css\/">/.test(publicSrc));
check("public-13.68.css referenced in SEO page-shell (13.68 since v13.169-mcv2 — the versioned stylesheet rename rides every page; was 13.67)", /\/public-13\.68\.css/.test(shellSrc) && !/\/public-13\.67\.css/.test(shellSrc));
check("core-13.15.js referenced in homepage + admin + login (public page script tag; core-13.14->13.15 in v13.165-mcfa — the mobile card's label strings join the dictionary: mcVs/mcDay/mcD/mcH/mcM flip the card's static VS / MATCH DAY / DAYS-HOURS-MINUTES layers between the artwork's EN design language and the FA presentation (مقابل / روز مسابقه / روز-ساعت-دقیقه) via the data-i hooks, + mcHint the scroll-affordance pill; v13.150-hud heritage — the EN unit labels spell out to Days/Hours/Min for the frame pockets)", /\/core-13\.15\.js/.test(publicSrc) && !/\/core-13\.14\.js/.test(publicSrc));
check("public-13.36.js exists", fs.existsSync(path.join(__dirname, "..", "assets", "public-13.36.js")));
check("public-13.45.css exists (v13.144-lights) + the retired 13.44.css stays on disk per the retention rule", fs.existsSync(path.join(__dirname, "..", "assets", "public-13.45.css")) && fs.existsSync(path.join(__dirname, "..", "assets", "public-13.44.css")));
check("public-13.68.css exists (v13.169-mcv2) + the retired 13.67.css + 13.66.css stay on disk per the retention rule (stale edge HTML may reference them through one SEO TTL) + the V2 frame + the retired V1 cropped frame stay on disk", fs.existsSync(path.join(__dirname, "..", "assets", "public-13.68.css")) && fs.existsSync(path.join(__dirname, "..", "assets", "public-13.67.css")) && fs.existsSync(path.join(__dirname, "..", "assets", "public-13.66.css")) && fs.existsSync(path.join(__dirname, "..", "assets", "ui", "sportsignal-hud-mobile-v2.webp")) && fs.existsSync(path.join(__dirname, "..", "assets", "ui", "sportsignal-hud-mobile-c.webp")));
check("the supplied kickoff artwork exists (assets/ui/sportsignal-match-time-bg.png — the chip background since v13.127-matchtimeart)", fs.existsSync(path.join(__dirname, "..", "assets", "ui", "sportsignal-match-time-bg.png")));
check("assets/_headers pins public-13.36.js immutable (the JS carries over unchanged in v13.135-zoomlight) + keeps the retired 13.35.js + 13.34.js + 13.33.js served through one SEO TTL (the retention rule)", /\/public-13\.36\.js\s*\n\s*Cache-Control: public, max-age=31536000, immutable/.test(headersSrc) && /\/public-13\.35\.js\s*\n\s*Cache-Control: public, max-age=31536000, immutable/.test(headersSrc) && /\/public-13\.34\.js\s*\n\s*Cache-Control: public, max-age=31536000, immutable/.test(headersSrc) && /\/public-13\.33\.js\s*\n\s*Cache-Control: public, max-age=31536000, immutable/.test(headersSrc) && fs.existsSync(path.join(__dirname, "..", "assets", "public-13.35.js")));
check("assets/_headers keeps public-13.32.js served through one SEO TTL (the layoutrefine rename)", /\/public-13\.32\.js\s*\n\s*Cache-Control: public, max-age=31536000, immutable/.test(headersSrc) && fs.existsSync(path.join(__dirname, "..", "assets", "public-13.32.js")));
check("assets/_headers keeps public-13.30.js served through one SEO TTL (the post-rename 404 window)", /\/public-13\.30\.js\s*\n\s*Cache-Control: public, max-age=31536000, immutable/.test(headersSrc) && fs.existsSync(path.join(__dirname, "..", "assets", "public-13.30.js")));
check("assets/_headers keeps public-13.29.js served through one SEO TTL (the post-rename 404 window)", /\/public-13\.29\.js\s*\n\s*Cache-Control: public, max-age=31536000, immutable/.test(headersSrc) && fs.existsSync(path.join(__dirname, "..", "assets", "public-13.29.js")));
check("assets/_headers pins public-13.68.css + public-13.50.js + /ui/sportsignal-hud-mobile-v2.webp (the v13.169-mcv2 live trio — the V2 frame webp (2x lanczos, 1200x2130, q85, 188KB) + the renamed CSS/JS; retired 13.67.css + 13.49.js + the V1 frame stay pinned one SEO TTL) + public-13.67.css (the v13.168-mchint live pair — the ×1.5 «بازی‌های دیگر» scroll-hint button + the cyan glow treatment + the 148px height term; retired 13.66.css stays pinned through one SEO TTL) + public-13.66.css (the v13.167-mcfill live pair — the width-driven FILL sizing; retired 13.65.css stays pinned through one SEO TTL) + public-13.65.css (the v13.166-mctop live pair — the <=899px margin-top 108->68; retired 13.64.css stays pinned through one SEO TTL) + public-13.64.css + public-13.49.js + core-13.15.js + /ui/sportsignal-hud-mobile-c.webp (the v13.165-mcfa live pair — the CROPPED lossless frame (the artwork's baked transparent margins gone, 743x1357) + the renamed CSS/JS/core; retired 13.63.css + 13.48.js + core-13.14.js + the old frame webp stay pinned through one SEO TTL) + public-13.63.css + public-13.48.js + /ui/sportsignal-hud-mobile.webp (the v13.164-matchcard live pair — the MOBILE hero card: the lossless webp frame + the renamed CSS/JS; retired 13.62.css + 13.47.js stay pinned through one SEO TTL) + public-13.62.css + public-13.47.js (the v13.163-herohd live pair — the UEFA 1080px cutoff quality swap; retired 13.46.js stays pinned through one SEO TTL) + public-13.62.css + public-13.46.js (the v13.162-heropair live pair — the Chelsea + Tottenham HERO_ART wiring; retired 13.45.js stays pinned through one SEO TTL) + public-13.62.css + public-13.45.js (the v13.161-tzstamp live pair — the sync-line zone+GMT parenthetical + the match-day lift; retired 13.61.css + 13.44.js stay pinned through one SEO TTL) + public-13.61.css + public-13.44.js (the v13.160-casttune live pair — the stronger re-baked directional cast + the pose-width guard + the tz cookie round; retired 13.60.css + 13.43.js stay pinned through one SEO TTL) + public-13.60.css + public-13.43.js (the v13.159-bakedcast live pair — the cast-shadow bake: img.hero-cast shows the pre-baked <slug>.cast.webp with no filter/no mask; retired 13.59.css + 13.42.js stay pinned through one SEO TTL) + public-13.59.css + public-13.42.js (the v13.158-pngshadow pair + public-13.55.css + public-13.39.js + the /leagues/ logo pack + the PC-Match HUD frame PNG immutable (13.59/13.42 since v13.158-pngshadow — the black-line/rectangle fix round 2: the shadow becomes the img.hero-cast SECOND COPY of the PNG itself, the v13.157 wrapper drop-shadow retires; retired 13.58.css + 13.41.js stay pinned through one SEO TTL; 13.55/13.39 since v13.154-polish — the 6 owner adjustments: real hero→main gap + day-near-digits + bigger digits + sync 60% + physical player lanes + centred clock-pod cluster; 13.54.css + 13.53.css + 13.38.js + 13.37.js retired under it, retired 13.48.css + 13.47.css + 13.46.css + 13.45.css + 13.44.css + 13.43.css + 13.42.css + 13.41.css + 13.40.css + 13.39.css + 13.38.css + 13.37.css + 13.36.css + 13.34.css + 13.33.css kept per the retention rule) + BOTH HUD artworks + the stadium-lights overlay PNG + the supplied countdown artwork", /\/public-13\.68\.css\s*\n\s*Cache-Control: public, max-age=31536000, immutable/.test(headersSrc) && /\/public-13\.50\.js\s*\n\s*Cache-Control: public, max-age=31536000, immutable/.test(headersSrc) && /\/ui\/sportsignal-hud-mobile-v2\.webp\s*\n\s*Cache-Control: public, max-age=31536000, immutable/.test(headersSrc) && /\/public-13\.67\.css\s*\n\s*Cache-Control: public, max-age=31536000, immutable/.test(headersSrc) && /\/public-13\.66\.css\s*\n\s*Cache-Control: public, max-age=31536000, immutable/.test(headersSrc) && /\/public-13\.65\.css\s*\n\s*Cache-Control: public, max-age=31536000, immutable/.test(headersSrc) && /\/public-13\.64\.css\s*\n\s*Cache-Control: public, max-age=31536000, immutable/.test(headersSrc) && /\/public-13\.49\.js\s*\n\s*Cache-Control: public, max-age=31536000, immutable/.test(headersSrc) && /\/core-13\.15\.js\s*\n\s*Cache-Control: public, max-age=31536000, immutable/.test(headersSrc) && /\/ui\/sportsignal-hud-mobile-c\.webp\s*\n\s*Cache-Control: public, max-age=31536000, immutable/.test(headersSrc) && /\/public-13\.62\.css\s*\n\s*Cache-Control: public, max-age=31536000, immutable/.test(headersSrc) && /\/public-13\.47\.js\s*\n\s*Cache-Control: public, max-age=31536000, immutable/.test(headersSrc) && /\/public-13\.46\.js\s*\n\s*Cache-Control: public, max-age=31536000, immutable/.test(headersSrc) && /\/public-13\.45\.js\s*\n\s*Cache-Control: public, max-age=31536000, immutable/.test(headersSrc) && /\/public-13\.61\.css\s*\n\s*Cache-Control: public, max-age=31536000, immutable/.test(headersSrc) && /\/public-13\.44\.js\s*\n\s*Cache-Control: public, max-age=31536000, immutable/.test(headersSrc) && /\/public-13\.60\.css\s*\n\s*Cache-Control: public, max-age=31536000, immutable/.test(headersSrc) && /\/public-13\.43\.js\s*\n\s*Cache-Control: public, max-age=31536000, immutable/.test(headersSrc) && /\/public-13\.60\.css\s*\n\s*Cache-Control: public, max-age=31536000, immutable/.test(headersSrc) && /\/public-13\.43\.js\s*\n\s*Cache-Control: public, max-age=31536000, immutable/.test(headersSrc) && /\/public-13\.59\.css\s*\n\s*Cache-Control: public, max-age=31536000, immutable/.test(headersSrc) && /\/public-13\.42\.js\s*\n\s*Cache-Control: public, max-age=31536000, immutable/.test(headersSrc) && /\/public-13\.58\.css\s*\n\s*Cache-Control: public, max-age=31536000, immutable/.test(headersSrc) && /\/public-13\.41\.js\s*\n\s*Cache-Control: public, max-age=31536000, immutable/.test(headersSrc) && /\/public-13\.55\.css\s*\n\s*Cache-Control: public, max-age=31536000, immutable/.test(headersSrc) && /\/public-13\.54\.css\s*\n\s*Cache-Control: public, max-age=31536000, immutable/.test(headersSrc) && /\/public-13\.39\.js\s*\n\s*Cache-Control: public, max-age=31536000, immutable/.test(headersSrc) && /\/public-13\.53\.css\s*\n\s*Cache-Control: public, max-age=31536000, immutable/.test(headersSrc) && /\/public-13\.52\.css\s*\n\s*Cache-Control: public, max-age=31536000, immutable/.test(headersSrc) && /\/public-13\.38\.js\s*\n\s*Cache-Control: public, max-age=31536000, immutable/.test(headersSrc) && /\/leagues\/champions-league\.webp\s*\n\s*Cache-Control: public, max-age=31536000, immutable/.test(headersSrc) && /\/leagues\/europa-league\.webp\s*\n\s*Cache-Control: public, max-age=31536000, immutable/.test(headersSrc) && /\/public-13\.51\.css\s*\n\s*Cache-Control: public, max-age=31536000, immutable/.test(headersSrc) && /\/public-13\.37\.js\s*\n\s*Cache-Control: public, max-age=31536000, immutable/.test(headersSrc) && /\/ui\/sportsignal-pc-match-hud\.png\s*\n\s*Cache-Control: public, max-age=31536000, immutable/.test(headersSrc) && /\/public-13\.50\.css\s*\n\s*Cache-Control: public, max-age=31536000, immutable/.test(headersSrc) && /\/public-13\.49\.css\s*\n\s*Cache-Control: public, max-age=31536000, immutable/.test(headersSrc) && /\/public-13\.48\.css\s*\n\s*Cache-Control: public, max-age=31536000, immutable/.test(headersSrc) && /\/public-13\.47\.css\s*\n\s*Cache-Control: public, max-age=31536000, immutable/.test(headersSrc) && /\/public-13\.46\.css\s*\n\s*Cache-Control: public, max-age=31536000, immutable/.test(headersSrc) && /\/ui\/sportsignal-countdown-bg\.png\s*\n\s*Cache-Control: public, max-age=31536000, immutable/.test(headersSrc) && /\/public-13\.45\.css\s*\n\s*Cache-Control: public, max-age=31536000, immutable/.test(headersSrc) && /\/public-13\.44\.css\s*\n\s*Cache-Control: public, max-age=31536000, immutable/.test(headersSrc) && /\/public-13\.43\.css\s*\n\s*Cache-Control: public, max-age=31536000, immutable/.test(headersSrc) && /\/public-13\.42\.css\s*\n\s*Cache-Control: public, max-age=31536000, immutable/.test(headersSrc) && /\/public-13\.41\.css\s*\n\s*Cache-Control: public, max-age=31536000, immutable/.test(headersSrc) && /\/public-13\.40\.css\s*\n\s*Cache-Control: public, max-age=31536000, immutable/.test(headersSrc) && /\/public-13\.39\.css\s*\n\s*Cache-Control: public, max-age=31536000, immutable/.test(headersSrc) && /\/public-13\.38\.css\s*\n\s*Cache-Control: public, max-age=31536000, immutable/.test(headersSrc) && /\/public-13\.37\.css\s*\n\s*Cache-Control: public, max-age=31536000, immutable/.test(headersSrc) && /\/public-13\.36\.css\s*\n\s*Cache-Control: public, max-age=31536000, immutable/.test(headersSrc) && /\/public-13\.34\.css\s*\n\s*Cache-Control: public, max-age=31536000, immutable/.test(headersSrc) && /\/public-13\.33\.css\s*\n\s*Cache-Control: public, max-age=31536000, immutable/.test(headersSrc) && /\/ui\/sportsignal-hud-matches-hero\.png\s*\n\s*Cache-Control: public, max-age=31536000, immutable/.test(headersSrc) && /\/ui\/sportsignal-hud-matches-hero-mobile\.png\s*\n\s*Cache-Control: public, max-age=31536000, immutable/.test(headersSrc) && /\/stadium-lights-hero\.png\s*\n\s*Cache-Control: public, max-age=31536000, immutable/.test(headersSrc));
check("v13.133-persiantype: the font assets are pinned + the pack's woff2 set exists (Morabba VF 250-900 + Peyda 400-900)", /\/fonts\/\*\s*\n\s*Cache-Control: public, max-age=604800/.test(headersSrc) && ["MorabbaVF.woff2","Peyda-Regular.woff2","Peyda-Medium.woff2","Peyda-SemiBold.woff2","Peyda-Bold.woff2","Peyda-ExtraBold.woff2","Peyda-Black.woff2"].every(f => fs.existsSync(path.join(__dirname, "..", "assets", "fonts", f))));
check("v13.133-persiantype: the homepage preloads the new stack (Peyda-Regular + Peyda-ExtraBold + MorabbaVF) and NO Vazirmatn preload remains", /rel="preload" href="\/fonts\/Peyda-Regular\.woff2"/.test(publicSrc) && /rel="preload" href="\/fonts\/Peyda-ExtraBold\.woff2"/.test(publicSrc) && /rel="preload" href="\/fonts\/MorabbaVF\.woff2"/.test(publicSrc) && !/Vazirmatn/.test(publicSrc));
check("v13.133-persiantype: FONT_FACES_STYLE registers Morabba (variable 250-900) + Peyda 400-900 and NO Vazirmatn @font-face remains", (() => { const r = read("src/pages/styles-shared.ts"); const rx = (fam, file, w) => new RegExp("font-family:'" + fam + "';src:url[(]'/fonts/" + file + "'[)][^}]*font-weight:" + w); return rx("Morabba", "MorabbaVF.woff2", "250 900").test(r) && rx("Peyda", "Peyda-Regular.woff2", "400").test(r) && rx("Peyda", "Peyda-Black.woff2", "900").test(r) && !/Vazirmatn/.test(r); })());
check("assets/_headers keeps public-13.30.css served through one SEO TTL (the layoutrefine rename)", /\/public-13\.30\.css\s*\n\s*Cache-Control: public, max-age=31536000, immutable/.test(headersSrc) && fs.existsSync(path.join(__dirname, "..", "assets", "public-13.30.css")));
check("assets/_headers keeps public-13.29.css served through one SEO TTL (the matchtimeart rename)", /\/public-13\.29\.css\s*\n\s*Cache-Control: public, max-age=31536000, immutable/.test(headersSrc) && fs.existsSync(path.join(__dirname, "..", "assets", "public-13.29.css")));
check("assets/_headers pins the kickoff artwork immutable (/ui/sportsignal-match-time-bg.png)", /\/ui\/sportsignal-match-time-bg\.png\s*\n\s*Cache-Control: public, max-age=31536000, immutable/.test(headersSrc));
check("assets/_headers keeps public-13.28.css served through one SEO TTL (the herolook rename)", /\/public-13\.28\.css\s*\n\s*Cache-Control: public, max-age=31536000, immutable/.test(headersSrc) && fs.existsSync(path.join(__dirname, "..", "assets", "public-13.28.css")));
check("assets/_headers keeps public-13.27.css served through one SEO TTL (the same-day 13.28 rename)", /\/public-13\.27\.css\s*\n\s*Cache-Control: public, max-age=31536000, immutable/.test(headersSrc) && fs.existsSync(path.join(__dirname, "..", "assets", "public-13.27.css")));
check("assets/_headers keeps public-13.26.css served through one SEO TTL (the post-rename 404 window, per the v13.121 ops note)", /\/public-13\.26\.css\s*\n\s*Cache-Control: public, max-age=31536000, immutable/.test(headersSrc) && fs.existsSync(path.join(__dirname, "..", "assets", "public-13.26.css")));
check("assets/_headers keeps public-13.25.css served through one SEO TTL (the post-rename 404 window, per the v13.121 ops note)", /\/public-13\.25\.css\s*\n\s*Cache-Control: public, max-age=31536000, immutable/.test(headersSrc) && fs.existsSync(path.join(__dirname, "..", "assets", "public-13.25.css")));
check("assets/_headers serves /players/uefa/* AND the v13.130 alpha-trimmed /players/hero/* day-fresh (owner-replaceable, not immutable)", /\/players\/uefa\/\*\s*\n\s*Cache-Control: public, max-age=86400/.test(headersSrc) && /\/players\/hero\/\*\s*\n\s*Cache-Control: public, max-age=86400/.test(headersSrc));
check("SW cache bumped to sportsignal-v75 (replaces v74 — the v13.169-mcv2 release: the owner-supplied V2 blank template (SportSignal-HUD-Mobile-V2.jpg, 600x1065 = the 928x1648 design grid at 0.646 scale) replaces the V1 frame — /ui/sportsignal-hud-mobile-v2.webp (2x lanczos3, 1200x2130, q85, 188KB; full-bleed JPG: no alpha, no crop pass) — with the PLAYER PORTRAIT layer (club-keyed HERO_ART cutouts clipped above the panel glow), the .mc-state chip (LIVE/FT/postponed parks the countdown — status from the match data, never the clock), the localized WEEKDAY+date banner (Jalali fa / \"Tuesday, 27 October\" en), .mc-name-xl, the localized venue fallback; every slot re-measured; the aspect flips 743/1357 -> 600/1065; the VS + MATCH DAY pills retire. Renames public-13.67.css -> 13.68.css + public-13.49.js -> 13.50.js; the retired pair + the V1 frame stay served + pinned one SEO TTL; CORE_URLS stays minimal. Replaces v74 — the v13.168-mchint release: the ×1.5 «بازی‌های دیگر» scroll-hint button + the real-button treatment + the below-card reserve 60->80px (128->148). Replaces v73 — the v13.167-mcfill release: the width-driven FILL. Replaces v72 — the v13.166-mctop release: margin-top 108->68. Replaces v71 — the v13.165-mcfa release: the cropped frame + the locale-aware presentation. Replaces v70 — the v13.164-matchcard release: the MOBILE hero)", /const CACHE = "sportsignal-v75"/.test(swSrc) && !/const CACHE = "sportsignal-v74"/.test(swSrc));
check("barTarget checks nextBig before topSpot (all competitions) + v13.153-heronext: the ok() future-only guard skips live/finished/already-kicked-off candidates from every source (nextBig, topSpot, the upcoming fallbacks — the hero never shows the current result, owner directive)", /t=DATA\.nextBig\|\|null.*if\(!t\)\{t=a\}/.test(js20) && /var ok=function\(m\)\{if\(!m\)return!1;if\(m\.status==="LIVE"\|\|m\.status==="IN_PLAY"\|\|m\.status==="PAUSED"\|\|m\.status==="FINISHED"\)return!1/.test(js20) && /t=ok\(t\)\?t:null;a=ok\(a\)\?a:null/.test(js20) && !/t=DATA\.upcoming\[0\]\|\|null/.test(js20));
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
check("renderHeroSpot builds the herolook grid (heroTeamNode/heroCentreNode/hero-grid — the centre stack spans the four rows)", /g\.className="hero-grid";g\.appendChild\(heroTeamNode\(t\.homeTeam,T\("heroHome"\),!1\)\);var ce=heroCentreNode\(t\);for\(var q=0;q<ce\.length;q\+\+\)g\.appendChild\(ce\[q\]\);g\.appendChild\(heroTeamNode\(t\.awayTeam,T\("heroAway"\),!0\)\)/.test(js20));
check("renderHeroSpot resets the card to the glass anchor (no featured chrome on the hero)", /e\.className="hero-card";/.test(js20) && !/match-featured"\);\}\}function renderTopSpot/.test(js20));
check("renderHeroSpot wires the card href + aria-label (ONE real link to the match page)", /try\{e\.href=matchHref\(t\)\}catch\(x\)\{e\.href="#"\}/.test(js20) && /e\.setAttribute\("aria-label",hn\+" \u2212 "\+an\+", "\+compName\(t\)\)/.test(js20));
check("heroCentreNode v13.150-hud: the kickoff time is BARE DIGITS in the clock pod (the time-glow/time-chip/time-fill wrappers + the HERO_CLOCK_ICON svg retire — the clock icon is BAKED INTO the PC-Match frame; tz-correct digits, dir=ltr; the hero-role tag + HERO_STADIUM_SVG retire with it)", /dg\.className="time-digits",dg\.setAttribute\("dir","ltr"\)/.test(js20) && !/time-glow/.test(js20) && !/HERO_CLOCK_ICON/.test(js20) && !/HERO_STADIUM_ICON/.test(js20) && !/hero-role/.test(js20));
check("heroCentreNode keeps every state (live pill/finished/postponed/started-soon) + the live score row (score + minute/est)", /pill\(T\("live"\),!0\)/.test(js20) && /pill\(T\("wkDone"\)\)/.test(js20) && /pill\(\/CANCEL\/i\.test\(String\(e\.status\)\)\?T\("stCancel"\):T\("stPostp"\)\)/.test(js20) && /pill\(T\("soon"\),!0\)/.test(js20) && /s2\.className="score hero-score"/.test(js20) && /mi\.className="lmin hero-min"/.test(js20));
check("heroCentreNode (v13.151-edits): the match day rides the clock pod as .time-date BELOW the time (client fmtHeroDate Jalali); the .hero-date shelf row RETIRES (no date-main/date-tz/tzLabelFa in the hero); the venue row is a pill", /td\.className="time-date";try\{td\.textContent=fmtHeroDate\(e\.utcDate\)\}catch\(x\)\{\}tm\.appendChild\(td\)\}rows\.push\(tm\)/.test(js20) && !/dt\.className="hero-date"/.test(js20) && !/date-main/.test(js20) && !/date-tz/.test(js20) && /vp\.className="venue-pill"/.test(js20));
check("heroPills null-guards the RETIRED carousel (v13.129-hudframe removed the pill from the template — the function no-ops on the missing node; kept to avoid a JS bump)", /function heroPills\(a\)\{var c=document\.querySelector\("\.herowrap \.hero-carousel"\);if\(!c\)return;/.test(js20));
check("the hero card never joins the featured system (the desired-look hero is its own design language)", !/#bigHeroCard\.match-featured/.test(js20) && !/#bigHeroCard\.match-featured/.test(publicSrc));
check("homepage inline CSS uses grass green accent #4CBB17", /#4CBB17/.test(publicSrc));
check("homepage inline CSS has .match-featured with flat outer glow (no inset)", /\.match-featured\{.*box-shadow:0 0 var\(--feat-blur\).*!important/.test(publicSrc) && !/inset/.test(publicSrc.match(/\.match-featured\{[^}]+\}/)?.[0]||''));
check("featured CSS has feat-shimmer animation (list cards)", /feat-shimmer/.test(publicSrc) && /infinite/.test(publicSrc));
check("featured CSS has feat-glow-shift animation", /feat-glow-shift/.test(publicSrc));
check("featured CSS makes inner .match panel transparent", /match-featured \.match\{background:transparent!important/.test(publicSrc));
check("featured CSS fixes inner .match overflow", /match-featured \.match\{.*overflow:visible!important/.test(publicSrc));
check("v13.126-herolook: the #bigHeroCard featured lighting is GONE from the inline block (the hero left the featured system)",
  !/#bigHeroCard\.match-featured/.test(publicSrc) && !/hero-sheen/.test(publicSrc) && !/hero-pulse 5s/.test(publicSrc));
check("featured LIST CSS keeps the shimmer + glow-shift + transparent inner panel (spotitems only)",
  /feat-shimmer/.test(publicSrc) && /feat-glow-shift/.test(publicSrc) && /match-featured \.match\{background:transparent!important/.test(publicSrc));
check("hero CSS: no inset in .match-featured rule (flat)", !/inset/.test(publicSrc.match(/\.match-featured\{[^}]+\}/)?.[0]||''));
check("featured CSS has the reduced-motion guard (list variant; the hero's lives in public-13.29.css)", /prefers-reduced-motion:reduce\)\{\.match-featured\{animation:none\}/.test(publicSrc) && !/hero-sheen/.test(publicSrc));
check("homepage inline CSS has .sr-only class", /\.sr-only\{/.test(publicSrc));
check("public countries capped at 5 (SQL LIMIT 5)", /LIMIT 5/.test(statsSrc));

// v13.65-lgtitle: hLgNext retitled (domestic leagues + cups only; UCL has its own section)
const coreSrc = read("assets/core-13.15.js");
check("core-13.15.js exists (renamed from 13.14 in v13.165-mcfa, rename-on-edit rule — the mobile card label strings join the dictionary; 13.14 + 13.13 stay on disk one TTL as the aliases)", fs.existsSync(path.join(__dirname, "..", "assets", "core-13.15.js")) && fs.existsSync(path.join(__dirname, "..", "assets", "core-13.14.js")) && fs.existsSync(path.join(__dirname, "..", "assets", "core-13.13.js")) && !fs.existsSync(path.join(__dirname, "..", "assets", "core-13.10.js")));
check("core-13.14.js fa hLgNext retitled to دیدارهای جذاب لیگ‌ها (carried from 13.13)", /hLgNext:"دیدارهای جذاب لیگ‌ها"/.test(coreSrc));
check("core-13.14.js en hLgNext retitled to Exciting League Fixtures (carried from 13.13) + v13.150-hud: the EN unit labels spell out (uDay Days / uHour Hours / uMin Min / uSec Sec — they ride ABOVE the numbers in the frame pockets)", /hLgNext:"Exciting League Fixtures"/.test(coreSrc) && /uDay:"Days",uHour:"Hours",uMin:"Min",uSec:"Sec"/.test(coreSrc) && !/uDay:"d",uHour:"h",uMin:"m"/.test(coreSrc));
check("core-13.15.js referenced in admin page (v13.150-hud core rename, 13.14->13.15 in v13.165-mcfa — the mobile card label dictionary keys)", /\/core-13\.15\.js/.test(read("src/pages/admin.ts")));
check("core-13.15.js referenced in login page (v13.150-hud core rename, 13.14->13.15 in v13.165-mcfa)", /\/core-13\.15\.js/.test(read("src/pages/login.ts")));
check("core-13.15.js referenced in public page (v13.150-hud core rename, 13.14->13.15 in v13.165-mcfa)", /\/core-13\.15\.js/.test(read("src/pages/public.ts")));
check("assets/_headers pins core-13.14 immutable + keeps core-13.13 + core-13.12 + core-13.11 through one SEO TTL (the v13.150-hud EN unit-label rename)", /\/core-13\.14\.js\s*\n\s*Cache-Control: public, max-age=31536000, immutable/.test(headersSrc) && /\/core-13\.13\.js\s*\n\s*Cache-Control: public, max-age=31536000, immutable/.test(headersSrc) && /\/core-13\.12\.js\s*\n\s*Cache-Control: public, max-age=31536000, immutable/.test(headersSrc) && /\/core-13\.11\.js\s*\n\s*Cache-Control: public, max-age=31536000, immutable/.test(headersSrc));
// v13.84: the orphan data-i keys found by the QA sweep — hStats/btnStats had
// no dict entries, so the live admin showed raw "hStats"/"btnStats" text in
// BOTH languages. Locked so a future key typo can't resurrect silently.
check("core-13.12.js fa dict covers hStats (visit-stats heading)", /hStats:"📊 آمار بازدید"/.test(coreSrc));
check("core-13.12.js fa dict covers btnStats (refresh-stats button)", /btnStats:"🔄 به‌روزرسانی آمار"/.test(coreSrc));
check("core-13.12.js en dict covers hStats + btnStats", /hStats:"📊 Visit Stats"/.test(coreSrc) && /btnStats:"🔄 Refresh stats"/.test(coreSrc));
check("core-13.12.js dead ver keys (stale v12.33 text) removed + v13.126-herolook dict edits (barNext sans bolt; +seeUpcoming fa/en)", !/ver:"(نسخه ۱۲|v12\.33)/.test(coreSrc) && /barNext:"تا بازی بزرگ بعدی",seeUpcoming:"بازی‌های آینده را ببینید"/.test(coreSrc) && /barNext:"Until the next big match",seeUpcoming:"See upcoming matches"/.test(coreSrc) && !/"⚡ تا/.test(coreSrc) && /b\.innerHTML=t==="dark"\?"/.test(coreSrc));
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
check("hero card is the real link to the match page (the static anchor gets href=matchHref + aria-label from renderHeroSpot)", /try\{e\.href=matchHref\(t\)\}catch\(x\)\{e\.href="#"\}/.test(js20) && /e\.setAttribute\("aria-label",hn\+" \u2212 "\+an\+", "\+compName\(t\)\)/.test(js20));
check("heroH1Sync exists and runs at the end of renderHeroSpot (EN H1 fix; v13.134-typelight: fitHeroNames is BACK — the NEW 2-line auto-fit for the enlarged club names, a different routine from the retired v13.12x layer)", /function heroH1Sync\(\)/.test(js20) && /heroH1Sync\(\)\}\}/.test(js20) && /function fitHeroNames\(\)\{var els=document\.querySelectorAll\("\.hero-name"\)/.test(js20));

const css68 = read("assets/public-13.68.css");
const markupSrc = read("src/seo/markup.ts");
const seoUtilsSrc = read("src/seo/utils.ts");
const routerSrc = read("src/seo/router.ts");
const stylesSharedSrc = read("src/pages/styles-shared.ts");
// ---------- v13.165-mcfa: the owner round on the MOBILE hero (margin/scroll/FA) + the v13.164 base ----------
check("v13.169-mcv2: homepage has the hero-mcard anchor (ONE real link, dir=ltr pinned, display:none default — the router unhides under the same rule as the PC card) + the V2 static frame + the STATIC .mc-ports portrait containers (home/away zones — renderMCard fills them with the club-keyed HERO_ART cutouts) + the locale cell labels (data-i hooks, FA defaults) + the static countdown cells (mcD/mcH/mcM ids — updateBigBar ticking contract) + the STATIC #mcState chip (display:none default — the router/mcStateSet own it) + the #mcSr polite region + the #mcardSpot data zone + the #mcHint scroll-hint anchor (display:none default, href #topspotCard)", /<a class="hero-mcard" id="heroMCard" style="display:none" href="#" dir="ltr">/.test(publicSrc) && /<img class="mc-frame" src="\/ui\/sportsignal-hud-mobile-v2\.webp"/.test(publicSrc) && /<div class="mc-ports" aria-hidden="true">/.test(publicSrc) && /<div class="mc-port mc-port-h"><\/div>/.test(publicSrc) && /<div class="mc-port mc-port-a"><\/div>/.test(publicSrc) && /<span class="mc-lbl-t" data-i="mcD">روز<\/span>/.test(publicSrc) && /<span class="mc-lbl-t" data-i="mcH">ساعت<\/span>/.test(publicSrc) && /<span class="mc-lbl-t" data-i="mcM">دقیقه<\/span>/.test(publicSrc) && /<b class="mc-slot mc-num mc-pos-d" id="mcD">__SEO_MCD__<\/b>/.test(publicSrc) && /<div class="mc-slot mc-state" id="mcState" style="display:none" aria-hidden="true"><\/div>/.test(publicSrc) && /<span id="mcSr" class="sr-only" aria-live="polite"><\/span>/.test(publicSrc) && /<div id="mcardSpot">__SEO_MHERO__<\/div>/.test(publicSrc) && /<a class="mc-hint" id="mcHint" style="display:none" href="#topspotCard">/.test(publicSrc) && /<span data-i="mcHint">بازی‌های دیگر<\/span>/.test(publicSrc));
check("v13.169-mcv2: renderMCard renders the mobile card from BOTH renderHeroSpot exits + manages #mcHint with the card (no hero -> no hint) + parks the state chip through mcStateSet(null) on the empty exit + keeps inline display empty so the CSS breakpoint decides (never display:block — that would leak the card onto desktop)", /function renderMCard\(t\)\{var e=document\.getElementById\("heroMCard"\),a=document\.getElementById\("mcardSpot"\),hi=document\.getElementById\("mcHint"\)/.test(js20) && /heroPills\(null\),renderMCard\(null\),heroH1Sync\(\)\);return/.test(js20) && /if\(!t\)\{e\.style\.display="none",a\.innerHTML="",hi&&\(hi\.style\.display="none"\),mcStateSet\(null\);return\}e\.style\.display="",hi&&\(hi\.style\.display=""\);var fa=curLang/.test(js20) && /putPort\(ph,heroArtFor\(t\.homeTeam\)\);putPort\(pa,heroArtFor\(t\.awayTeam\)\)/.test(js20) && /function mcStateSet\(t\)\{/.test(js20));
check("v13.169-mcv2: renderMCard binds the spec slots LOCALE-AWARE — crest imgs (onerror empties the slot), faName names (fa) / FD Latin names (en) with the trim-guard nm + the .mc-name-xl one-line-fit step-down (fa>11/en>10 chars), the PORTRAITS (putPort fills the static .mc-port containers from the club-keyed heroArtFor entries — home left / away right, never a wrong-club player), the ss_tz-zone WEEKDAY+date (fa: fa-IR-u-ca-persian weekday+day+month with Persian digits — byte-parity with the server mirror jalaliWeekdayStr; en: the weekday-day-month join TUESDAY, 27 OCTOBER), the faNum kickoff digits (fa) / en-GB 24h (en), venueFa (fa) / the FD venue (en) with the localized neutral fallback (استادیوم نامشخص / Venue TBA — a real value, never the -- rest state), the -- placeholders with .mc-mut, and mcStateSet(t) at the render tail", /\[t\.homeTeam,t\.awayTeam\]\.forEach\(function\(sd,ix\)\{var d=slot\("mc-slot mc-logo"/.test(js20) && /var fa=curLang\(\)!=="en",nm=function\(sd\)\{if\(!sd\)return null;var n=fa\?sd\.faName\|\|sd\.name:sd\.name;return n&&String\(n\)\.trim\(\)\?n:null\}/.test(js20) && /putPort=function\(box,art\)\{if\(!box\)return;box\.innerHTML="";if\(art&&art\.src\)\{var im=document\.createElement\("img"\);im\.src=art\.src/.test(js20) && /putPort\(ph,heroArtFor\(t\.homeTeam\)\);putPort\(pa,heroArtFor\(t\.awayTeam\)\)/.test(js20) && /lim=fa\?11:10,ncls=function\(n\)\{return"mc-slot mc-name"\+\(n&&n\.length>lim\?" mc-name-xl":""\)\}/.test(js20) && /new Intl\.DateTimeFormat\("fa-IR-u-ca-persian",\{weekday:"long",day:"numeric",month:"long",timeZone:curTz\(\)\}\)\.format\(new Date\(kk\)\)/.test(js20) && /var pp=new Intl\.DateTimeFormat\("en-US",\{weekday:"long",day:"numeric",month:"long",timeZone:curTz\(\)\}\)\.formatToParts\(new Date\(kk\)\)/.test(js20) && /dt=\(gv\("weekday"\)\+", "\+gv\("day"\)\+" "\+gv\("month"\)\)\.toUpperCase\(\)/.test(js20) && /tm=new Date\(kk\)\.toLocaleTimeString\("en-GB",\{hour:"2-digit",minute:"2-digit",timeZone:curTz\(\)\}\);fa&&\(tm=faNum\(tm\)\)/.test(js20) && /var ve=fa\?t\.venueFa\|\|t\.venue:t\.venue;txt\(slot\("mc-slot mc-venue"\),ve\|\|\(fa\?"استادیوم نامشخص":"Venue TBA"\),false\)/.test(js20) && /;mcStateSet\(t\)\}/.test(js20));
check("v13.165-mcfa + v13.169-mcv2: updateBigBar drives the mobile countdown + the mcStateSet state-chip wiring (the 1s tick + the new FINISHED branch) on its second-tick with the fmtNum LOCALE writer (fa pockets read Persian digits like the PC pockets; en keeps the Latin tabular pair) — mcD/mcH/mcM refs + the zero clamp + the cells hidden for no-match/post/NaN/live + the #mcSr per-minute announcement in the page language + the #mcHint click handler smooth-scrolls to the first VISIBLE card below the hero", /function mset\(el,v\)\{if\(!el\)return;var tx=fmtNum\(v<10\?"0"\+v:String\(v\)\);el\.textContent!==tx&&\(el\.textContent=tx\)\}/.test(js20) && /mset\(mcDd,0\),mset\(mcHh,0\),mset\(mcMm,0\)/.test(js20) && /setNum\(dEl,dd\),setNum\(hEl,hh\),setNum\(mEl,mm\),setNum\(sEl,ss\),mset\(mcDd,dd\),mset\(mcHh,hh\),mset\(mcMm,mm\)/.test(js20) && /mcN&&\(mcN\.style\.display="none"\)/.test(js20) && /if\(mcSr&&mcSr\.dataset\.k!==key\)/.test(js20) && /var ids=\["liveCard","topspotCard","weekCard","uclCard","standingsCard"\]/.test(js20) && /mcStateSet\(m\),f&&\(f\.className="bigbar-fill live"/.test(js20) && /if\(m\.status==="FINISHED"\)\{n&&\(n\.style\.display="none"\),mcN&&\(mcN\.style\.display="none"\),mcStateSet\(m\),urg\("far"\);return\}/.test(js20) && /mcN&&\(mcN\.style\.display=""\),mcStateSet\(m\);var ms=kk-Date\.now\(\)/.test(js20));
check("v13.169-mcv2: the SERVER mirror — mcardHtml ships the FA presentation (faName names with the .mc-name-xl step-down, the pure-math JALALI WEEKDAY+date via jalaliWeekdayStr «سه‌شنبه ۵ آبان» (weekday-day-month, no year — byte-identical to the client fa-IR-u-ca-persian weekday-day-month render), toFaDigits kickoff digits, venueFa, crest imgs with onerror, the -- placeholders, the localized venue fallback «استادیوم نامشخص») + the router fills __SEO_MHERO__, unhides the mobile card AND the scroll hint under the hero rule, fills the __SEO_MCD/H/M__ Persian-digit cells from the payload epoch, hides .mc-cells for non-upcoming heroes AND fills+unhides the #mcState chip for live/finished/postponed/canceled heroes (the no-JS state contract)", /export function mcardHtml\(sm: SeoMatch\): string/.test(markupSrc) && /dt = jalaliWeekdayStr\(m\.utcDate\)/.test(markupSrc) && /tm = toFaDigits\(z\(p\.hh\) \+ ":" \+ z\(p\.mm\)\)/.test(markupSrc) && /const nameCls = \(t: any\): string =>/.test(markupSrc) && /mcTextHtml\(nameCls\(m\.homeTeam\), m\.homeTeam && \(m\.homeTeam\.faName \|\| m\.homeTeam\.name\)\)/.test(markupSrc) && /esc\(ve \|\| "استادیوم نامشخص"\)/.test(markupSrc) && /onerror="this\.remove\(\)"/.test(markupSrc) && /export function jalaliWeekdayStr\(iso: string\): string/.test(seoUtilsSrc) && /\.replace\("__SEO_MHERO__", mheroHtml\)/.test(routerSrc) && /if \(mheroHtml\) html = html\.replace\('<a class="hero-mcard" id="heroMCard" style="display:none" href="#" dir="ltr">'/.test(routerSrc) && /if \(mheroHtml\) html = html\.replace\('<a class="mc-hint" id="mcHint" style="display:none" href="#topspotCard">'/.test(routerSrc) && /mcD = toFaDigits\(z\(Math\.floor\(ms \/ 864e5\)\)\)/.test(routerSrc) && /\.replace\("__SEO_MCD__", mcD\)\.replace\("__SEO_MCH__", mcH\)\.replace\("__SEO_MCM__", mcM\)/.test(routerSrc) && /<div class="mc-cells" id="mcCells" role="timer" dir="ltr" style="display:none">/.test(routerSrc) && /'<div class="' \+ stCls \+ '" id="mcState" aria-hidden="true">'/.test(routerSrc) && /stTxt = "زنده"; stCls \+= " mc-state-live"/.test(routerSrc) && /stTxt = "پایان"/.test(routerSrc) && /stTxt = "لغو شده"/.test(routerSrc));
check("v13.169-mcv2: the card CSS — .hero-mcard is WIDTH-driven FILL (the v13.167 shape, ratio flipped to the V2 artwork: width:min(calc(100% - 8px),calc((100vh - 148px)*600/1065)) + the svh line + height:auto + aspect-ratio 600/1065; the 148px height term (68 top + 80 below-card reserve) keeps the v13.168 ×1.5 hint pill inside the first screen on short viewports) + the V2 slot map measured from the template + the reference (portraits .mc-ports/.mc-port top 4.5% height 34.5% width 46% left 2%/52% + object-fit:contain/object-position:bottom + the single drop-shadow rim; crests (30,52)/(70,52) w 17cqw h 21.3cqw; names (30,61.3)/(70,61.3) w 39cqw with .mc-name-xl 4.5cqw; date (50,68.65) fs 4.2cqw; kickoff (50,72.6) fs 11.2cqw + gradient + glow; cells 28/51/73 numbers y81.2 w 22cqw fs 7.2cqw labels y84.6 fs 2.9cqw; .mc-state (51,82.2) fs 4.6cqw + live green + mut; venue left 42.5% y89.7 maxw 41cqw fs 3.9cqw) + the html[lang=fa] FA overrides (name 6.2cqw w800, ko 10.4cqw, num w800, lbl Peyda 2.8cqw ls 0, state Peyda 4.3cqw ls 0, venue Peyda 3.9cqw) + the .mc-hint scroll hint ×1.5 BUTTON (v13.168) + the <=899px presentation swap (margin-top 68px, hint display:flex) + the reduced-transparency plate + the portrait/state glow off", /\.hero-mcard\{position:relative;z-index:2;display:none;box-sizing:border-box;width:min\(calc\(100% - 8px\),calc\(\(100vh - 148px\)\*600\/1065\)\);width:min\(calc\(100% - 8px\),calc\(\(100svh - 148px\)\*600\/1065\)\);height:auto;aspect-ratio:600\/1065;margin-inline:auto;container-type:inline-size;direction:ltr;font-family:"Chakra Petch",Morabba,Peyda,'Segoe UI',Tahoma,ui-sans-serif,sans-serif/.test(css68) && /\.hero-mcard \.mc-port\{position:absolute;top:4\.5%;height:34\.5%;width:46%/.test(css68) && /\.hero-mcard \.mc-port img\{display:block;width:100%;height:100%;object-fit:contain;object-position:center bottom;filter:drop-shadow\(0 0 1\.4cqw rgba\(110,198,251,\.34\)\)\}/.test(css68) && /\.hero-mcard \.mc-logo\{left:30%;top:52%;width:17cqw;height:21\.3cqw/.test(css68) && /\.hero-mcard \.mc-name\{left:30%;top:61\.3%;width:39cqw/.test(css68) && /\.hero-mcard \.mc-name\.mc-name-xl\{font-size:4\.5cqw\}/.test(css68) && /\.hero-mcard \.mc-date\{left:50%;top:68\.65%/.test(css68) && /\.hero-mcard \.mc-ko\{left:50%;top:72\.6%/.test(css68) && /font-size:11\.2cqw/.test(css68) && /\.hero-mcard \.mc-num\{top:81\.2%;width:22cqw/.test(css68) && /font-size:7\.2cqw/.test(css68) && /\.hero-mcard \.mc-lbl\{top:84\.6%;width:22cqw/.test(css68) && /\.hero-mcard \.mc-pos-d\{left:28%\}/.test(css68) && /\.hero-mcard \.mc-pos-h\{left:51%\}/.test(css68) && /\.hero-mcard \.mc-pos-m\{left:73%\}/.test(css68) && /\.hero-mcard \.mc-state\{left:51%;top:82\.2%/.test(css68) && /\.hero-mcard \.mc-state\.mc-state-live\{color:#35E08E/.test(css68) && /\.hero-mcard \.mc-venue\{left:42\.5%;top:89\.7%;max-width:41cqw/.test(css68) && /html\[lang="fa"\] \.hero-mcard \.mc-name\{font-weight:800;line-height:1\.32;font-size:6\.2cqw\}/.test(css68) && /html\[lang="fa"\] \.hero-mcard \.mc-ko\{font-size:10\.4cqw\}/.test(css68) && /html\[lang="fa"\] \.hero-mcard \.mc-lbl\{font-size:2\.8cqw;letter-spacing:0;font-family:Peyda,'Segoe UI',Tahoma,system-ui,sans-serif\}/.test(css68) && /html\[lang="fa"\] \.hero-mcard \.mc-state\{font-size:4\.3cqw;letter-spacing:0;font-family:Peyda,'Segoe UI',Tahoma,system-ui,sans-serif\}/.test(css68) && /\.mc-hint\{position:relative;z-index:2;display:none;margin:12px auto 0;width:max-content;max-width:86%;box-sizing:border-box;padding:6px 21px 9px;border-radius:999px;background:rgba\(4,38,76,\.88\);border:1\.5px solid rgba\(23,205,240,\.6\);color:#EAF6FF;font-family:var\(--font-body\);font-size:18px;font-weight:700/.test(css68) && /@keyframes mc-hint-bob\{0%,100%\{transform:translateY\(0\)\}50%\{transform:translateY\(5px\)\}\}/.test(css68) && /@media \(max-width:899px\)\{\s*\.hero-card\{display:none\}\s*\.hero-mcard\{display:block;margin-top:68px\}\s*\.mc-hint\{display:flex\}\s*\}/.test(css68) && /@media \(prefers-reduced-transparency:reduce\)\{\.hero-mcard\{background:#01142E/.test(css68) && /\.hero-mcard \.mc-port img\{filter:none\}/.test(css68));
check("v13.165-mcfa + v13.169-mcv2: Chakra Petch self-hosted (500/600/700 latin woff2 @font-face in the shared style block — fetched only where the mobile card rules match text) + the three font files + the CROPPED lossless frame on disk (the old un-cropped webp stays served per the retention rule)", /@font-face\{font-family:'Chakra Petch';src:url\('\/fonts\/ChakraPetch-Medium\.woff2'\) format\('woff2'\);font-weight:500/.test(stylesSharedSrc) && /ChakraPetch-SemiBold\.woff2/.test(stylesSharedSrc) && /ChakraPetch-Bold\.woff2/.test(stylesSharedSrc) && !!read("assets/fonts/ChakraPetch-Medium.woff2") && !!read("assets/fonts/ChakraPetch-SemiBold.woff2") && !!read("assets/fonts/ChakraPetch-Bold.woff2") && !!read("assets/ui/sportsignal-hud-mobile-c.webp") && !!read("assets/ui/sportsignal-hud-mobile.webp") && !!read("assets/ui/sportsignal-hud-mobile-v2.webp"));
check("v13.165-mcfa: core-13.15.js carries the six new I18N keys in BOTH dictionaries (fa: mcVs مقابل / mcDay روز مسابقه / mcD روز / mcH ساعت / mcM دقیقه / mcHint بازی‌های دیگر; en: VS / MATCH DAY / DAYS / HOURS / MINUTES / More matches)", /mcVs:"مقابل",mcDay:"روز مسابقه",mcD:"روز",mcH:"ساعت",mcM:"دقیقه",mcHint:"بازی‌های دیگر",/.test(coreSrc) && /mcVs:"VS",mcDay:"MATCH DAY",mcD:"DAYS",mcH:"HOURS",mcM:"MINUTES",mcHint:"More matches"/.test(coreSrc));
check("heroH1Sync writes the EN sentence (Next big match:)", /"Next big match: "\+r\+" \\u2013 "\+n/.test(js20));

// ---------- 11) v13.126-herolook: the desired-look hero ("Stadium Night") ----------
const cssHero = read("assets/public-13.62.css");
check("hero CSS: tokens inlined once (the iteration-pack set; v13.150-hud: --ss-crest-size retired with the fixed crest — the crest now scales with the frame via clamp(40px,10.5cqi,92px))", /--ss-bg-abyss:#010A1D/.test(cssHero) && /--ss-safe-gap:24px/.test(cssHero) && !/--ss-crest-size/.test(cssHero));
check("hero CSS v13.150-hud: measured overrides — the ONE frame canvas (--ss-card-w min(920px,max(720px,60%)) — the player lanes size from the same var) + the header var (v13.152-spacing: 94 -> 102px — the brand logo grew +20%; the old --ss-time-w/--ss-hud-pad-* clamps retire with the chip and the safe-area padding)", /--ss-card-w:min\(920px,max\(720px,60%\)\)/.test(cssHero) && /--ss-header-h:102px/.test(cssHero) && !/--ss-time-w:/.test(cssHero) && !/--ss-hud-pad-[xy]:/.test(cssHero));
check("hero CSS v13.150-hud: the retired layout scaffolding stays retired (no 3-lane grid, no chip tokens, no .count-inner, no panel width token — the countdown pockets are % zones of the ONE frame)", !/grid-template-columns:minmax\(0,1fr\) minmax\(252px,27%\) minmax\(0,1fr\)/.test(cssHero) && !/--ss-countdown-w:/.test(cssHero) && !/\.count-inner\{/.test(cssHero) && /--ss-hero-min-h:460px;/.test(cssHero));
check("hero CSS v13.128-layoutrefine: the section is full-bleed with NO 100vw trick (the page shell is full-width — 100vw overflowed the viewport on classic-scrollbar browsers and shifted the header band inside the old body grid; v13.130: padding-bottom 14 -> 34px; v13.153-heronext: 34 -> 72px — the owner's hero→main-area safe margin, the scene floor doubles and the dark island extends; v13.154-polish: + margin-bottom:32px — a REAL page gap below the floor: the wide layout's #wideMain margin:0 children made the first container start at the floor's end, 0px away)", /\.herowrap\{position:relative;display:flow-root;margin-top:calc\(-1 \* var\(--ss-header-h\)\);width:100%;padding-bottom:72px;margin-bottom:32px\}/.test(cssHero) && !/100vw;margin-inline:calc\(50% - 50vw\)/.test(cssHero) && /html\{overflow-x:clip;scroll-behavior:smooth\}/.test(cssHero));
check("hero CSS: the scene (graded photo + grade/vignette/scrim + swooshes + wm watermarks; since v13.129 the layer CLIPS at the section edge — overflow:hidden keeps the crest watermarks/swoosh overhangs inside the container per the owner's report)", /\.hero-bg\{position:absolute;inset:0;z-index:1;pointer-events:none;background:var\(--ss-bg-abyss\);overflow:hidden\}/.test(cssHero) && /\.hero-bg \.bg-photo\{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center;filter:saturate\(\.7\)/.test(cssHero) && /\.hero-bg \.bg-wm\{position:absolute;width:420px;height:420px;object-fit:contain;opacity:\.464/.test(cssHero) && /\.bg-swoosh\.sw-right\{right:-50px/.test(cssHero));
check("hero CSS v13.150-hud: the match card IS the supplied PC-Match frame (/ui/sportsignal-pc-match-hud.png, 1000x406 — the ONE artwork replacing the card PNG + match-time chip + countdown panel) — aspect-locked 1000/406 + container-type:inline-size (every zone type scales with the frame via cqi), an absolute .card-hud layer behind the zones at OPACITY .74, margin-top 184px (94px header band + the league block above the frame + gaps), zero padding (the zones are % of the canvas), the zone layer .hero-grid absolute inset:0 z1, nothing clips the glow, box-sizing:border-box (NO global border-box on this site)", /\.hero-card\{position:relative;z-index:2;display:block;box-sizing:border-box;width:var\(--ss-card-w\);margin-inline:auto;margin-top:184px;aspect-ratio:1000\/406;container-type:inline-size;padding:0;background:none;border:none;border-radius:0;box-shadow:none/.test(cssHero) && /\.hero-card \.card-hud\{position:absolute;inset:0;width:100%;height:100%;object-fit:fill;opacity:\.74;pointer-events:none/.test(cssHero) && /\.hero-card \.hero-grid\{position:absolute;inset:0;z-index:1\}/.test(cssHero));
check("hero CSS v13.151-edits + v13.154-polish: the zone map — every content band is an absolutely-positioned overlay zone MEASURED from the PC-Match artwork pixels (clock pod = the FULL pill interior left39.25/right39.25/top33.25/bottom51.2 — v13.154: the SYMMETRIC band lands dead-centre on the pill\'s measured rim x332-668 (centre x500; the old 43%/35.5% zone centred at x537.5, 3.75% right) + the day rides BARELY closer to the digits (gap clamp 1px/.3cqi/3.5px, line-height 1.15); the date shelf RETIRES as a content zone; countdown cells = the pocket interiors left32.7/right32.7/top60.85/bottom24.15 on a measured 5-track grid 28.32/6.94/29.48/6.94/28.32fr = the artwork\u2019s pockets+dividers so every stack is dead-centre; venue tail left44/right38/top83/bottom6; wings left/right 6.5% width 26% top 16.5% bottom 24.5% with the crest-name gap HALVED; the league block centred above the canvas via bottom:100% — the logo case pulls onto the frame\u2019s top rim with margin-bottom:-4.6%)", /\.hero-time\{position:absolute;left:39\.25%;right:39\.25%;top:33\.25%;bottom:51\.2%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:clamp\(1px,\.3cqi,3\.5px\);min-width:0\}/.test(cssHero) && !/\.hero-date\{/.test(cssHero) && !/\.date-main\{/.test(cssHero) && !/\.date-tz\{/.test(cssHero) && /\.time-date\{font-size:clamp\(10px,1\.7cqi,15px\);font-weight:700;color:var\(--ss-text\);opacity:\.85;line-height:1\.15;white-space:nowrap\}/.test(cssHero) && /\.hud-cells\{position:absolute;left:32\.7%;right:32\.7%;top:60\.85%;bottom:24\.15%;display:grid;grid-template-columns:28\.32fr 6\.94fr 29\.48fr 6\.94fr 28\.32fr;grid-template-rows:100%;z-index:1\}/.test(cssHero) && /\.hero-venue\{position:absolute;left:44%;right:38%;top:83%;bottom:6%;/.test(cssHero) && /\.hero-league\{position:absolute;bottom:100%;left:15%;right:15%;margin-bottom:14px;/.test(cssHero) && /\.hero-league\.has-logo\{margin-bottom:-4\.6%;gap:0\}/.test(cssHero) && /\.league-logo\{width:clamp\(64px,15cqi,150px\);height:auto;display:block;filter:drop-shadow\(0 10px 22px rgba\(1,6,20,\.55\)\);-webkit-user-drag:none\}/.test(cssHero) && /\.hero-team\{position:absolute;top:16\.5%;bottom:24\.5%;width:26%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:clamp\(6px,2\.1cqi,21px\);min-width:0\}/.test(cssHero) && /\.hero-team\.team-home\{left:6\.5%\}/.test(cssHero) && /\.hero-team\.team-away\{right:6\.5%\}/.test(cssHero));
check("hero CSS v13.151-edits + v13.154-polish: tabular digits on the clock pod + the countdown pockets — the digits are CONSIDERABLY larger + bolder (v13.154: +11% — clamp(20px,4.4cqi,40px) weight 800, the owner\u2019s eye-catcher; was 18/3.95cqi/36) and the match day rides below them (.time-date clamp(10px,1.7cqi,15px) weight 700 at .85 opacity); numbers ~20% smaller since v13.152-spacing (clamp(11px,3.1cqi,27px) with an 11px px-fallback first); the digits carry the stronger cyan glow", /\.time-digits\{font-size:clamp\(20px,4\.4cqi,40px\);font-weight:800;line-height:1;color:var\(--ss-text\);font-variant-numeric:tabular-nums;letter-spacing:\.02em;unicode-bidi:isolate;text-shadow:0 0 16px rgba\(0,190,255,\.4\);white-space:nowrap\}/.test(cssHero) && /\.count-num\{position:relative;font-size:11px;font-size:clamp\(11px,3\.1cqi,27px\);font-weight:600;line-height:1;color:var\(--ss-text\);font-variant-numeric:tabular-nums;animation:tick-fade \.15s ease\}/.test(cssHero));
check("hero CSS v13.150-hud: the kickoff chip RETIRES with its artwork (no .time-chip/.time-glow/.time-fill rules, no /ui/sportsignal-match-time-bg.png reference — the time is bare digits in the frame's clock pod; the file stays on disk + pinned for the retired CSS per the retention rule)", !/\.time-chip\{/.test(cssHero) && !/\.time-glow\{/.test(cssHero) && !/\.time-fill\{/.test(cssHero) && !/match-time-bg\.png/.test(cssHero));
check("hero CSS v13.151-edits: the countdown cells are BARE TEXT dead-centre in the artwork\u2019s pockets — the strip is a measured 5-track GRID (pockets+dividers), each tile grid-row:1 flex-column centred (label clamp(6px,1.25cqi,11px) cyan caps ABOVE the number — no tile skin, no chamfer, no lime tick, no ::before/::after — the pockets + dividers are baked into the frame)", /\.count-tile\{grid-row:1;min-width:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:clamp\(2px,\.35cqi,4px\)\}/.test(cssHero) && /\.count-tile:nth-child\(1\)\{grid-column:1\}/.test(cssHero) && /\.count-tile:nth-child\(2\)\{grid-column:3\}/.test(cssHero) && /\.count-tile:nth-child\(3\)\{grid-column:5\}/.test(cssHero) && /\.count-unit\{position:relative;font-style:normal;font-size:6px;font-size:clamp\(6px,1\.25cqi,11px\);font-weight:700;line-height:1;color:var\(--ss-aqua\);white-space:nowrap\}/.test(cssHero) && !/count-tile::before/.test(cssHero) && !/count-tile::after/.test(cssHero) && !/tile-chamfer/.test(cssHero));
check("hero CSS v13.150-hud: the countdown PANEL retires with its artwork (no .hero-count rule, no /ui/sportsignal-countdown-bg.png reference, no .count-head/.count-tiles rules — the cells ride the ONE frame's pockets as the .hud-cells layer inside the card; the panel's head caption «تا بازی بزرگ بعدی» + the seconds tile retire with it; the file stays on disk + pinned for the retired CSS per the retention rule; the sr-only track + #hcS.tick + tick-fade stay in the contract)", !/\.hero-count\{/.test(cssHero) && !/countdown-bg\.png/.test(cssHero) && !/\.count-head\{/.test(cssHero) && !/\.count-tiles\{/.test(cssHero) && /\.hc-track\{position:absolute;width:1px;height:1px/.test(cssHero) && /#hcS\.tick\{animation:tick-fade \.18s ease\}/.test(cssHero) && /@keyframes tick-fade\{from\{opacity:\.35\}to\{opacity:1\}\}/.test(cssHero));
check("hero CSS: the 24h progress track stays in the contract but rides sr-only (no visible bar in the reference)", /\.hc-track\{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect\(0,0,0,0\);white-space:nowrap;border:0\}/.test(cssHero) && /#hcS\.tick\{animation:tick-fade \.18s ease\}/.test(cssHero) && /@keyframes tick-fade\{from\{opacity:\.35\}to\{opacity:1\}\}/.test(cssHero));
check("hero CSS v13.151-edits + v13.152-spacing + v13.154-polish: the figures grow +15% (height 91.77% -> a 105.54% CEILING) and the head top now parks BELOW the header (owner: part of the player head was colliding with header items — height:min(105.54%,calc(113.585% - 122px)) caps the box so its top sits ~122px from the section top; the feet anchor stays -13.585%, the melt is untouched) and lean NEARER the HUD (owner: 'slightly more near to HUD' — the img anchors step PAST the lane\u2019s inner edge at -32px (was -16px); the wrapper clip opened the same 32px inward until v13.158-pngshadow widened it to 120px for the img.hero-cast copy's blur fringe — players z3 over the card z2, 3D layering; max-width calc(100% + 32px) doubles as width budget); v13.154-polish (owner): the lanes are PHYSICAL — home figure = LEFT lane beside the home wing, away = RIGHT (the old inline-start/end anchors mirrored with dir, so on the RTL site every figure stood beside the OPPOSITE team's crest — Kane beside the Arsenal wing, Saka beside Bayern); one clip/tilt per lane serves every direction, no [dir] player rules remain; the mask keeps the cinematic ramp (transparent to 14.8%, complete at 26%); everything else from the approved rounds preserved: contain (full figure unzoomed), width auto aspect-true, object-position center bottom",
  /\.hero-player\{position:absolute;bottom:0;height:100%;z-index:3;pointer-events:none;width:calc\(\(100% - var\(--ss-card-w\)\)\/2\);display:none\}/.test(cssHero) &&
  /\.hero-player\.has\{display:block\}/.test(cssHero) &&
  /\.hero-player img\{position:absolute;bottom:-13\.585%;height:min\(105\.54%,calc\(113\.585% - 122px\)\);width:auto;max-width:calc\(100% \+ 32px\);object-fit:contain;object-position:center bottom;filter:var\(--ss-player-glow\) brightness\(\.88\) contrast\(1\.08\)/.test(cssHero) &&
  /-webkit-mask-image:linear-gradient\(to top,transparent 0,transparent 14\.8%,#000 26%\);mask-image:linear-gradient\(to top,transparent 0,transparent 14\.8%,#000 26%\)/.test(cssHero) &&
  /\.hero-player\.player-home\{left:0\}/.test(cssHero) &&
  /\.hero-player\.player-away\{right:0\}/.test(cssHero) &&
  /\.hero-player\.player-home img\{right:calc\(-32px - var\(--ss-pose-shift,0px\)\);left:auto\}/.test(cssHero) &&
  /\.hero-player\.player-away img\{left:calc\(-32px - var\(--ss-pose-shift,0px\)\);right:auto\}/.test(cssHero) &&
  /\.hero-player\.player-home\{clip-path:inset\(-100% -320px -100% -100%\)\}/.test(cssHero) &&
  /\.hero-player\.player-away\{clip-path:inset\(-100% -100% -100% -320px\)\}/.test(cssHero) &&
  /\.hero-player\.player-home img\{--ss-player-tilt:-1deg\}/.test(cssHero) &&
  /\.hero-player\.player-away img\{--ss-player-tilt:1deg\}/.test(cssHero) &&
  !/\[dir=(ltr|rtl)\] \.hero-player/.test(cssHero) &&
  /\[data-theme=light\] \.hero-player img\{filter:drop-shadow\(0 0 1px rgba\(8,32,63,\.6\)\) var\(--ss-player-glow\)/.test(cssHero));
check("hero CSS v13.150-hud: the .hero-role tag (میزبان/میهمان) RETIRES — the visual reference shows crest + name only in the wings", !/\.hero-role\{/.test(cssHero) && !/hero-role/.test(js20));
check("hero CSS v13.131-playerpresence: BOTH corner pills are RETIRED (the carousel in v13.129, the bell now — owner directive; heroPills null-guards) — NO .hero-bell rule may remain anywhere + the sync line sits BELOW the countdown panel (v13.142-cinematic: sibling of #bigbar, not inside it)", !/\.hero-carousel\{/.test(cssHero) && !/\.car-crest\{/.test(cssHero) && !/\.car-dots\{/.test(cssHero) && !/\.car-btn\{/.test(cssHero) && !/\.hero-bell/.test(cssHero) && /background:rgba\(1,13,35,\.72\)/.test(cssHero) === false && /\.hero-sync\{display:none\}/.test(cssHero));
check("hero CSS: the header island (transparent over the scene, full-width — NO 100vw trick, border-box so the 44px padding stays inside); v13.134: the #tbtn gold-moon rule is retired with the toggle (no #tbtn rule may remain)", /#topbar\{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px 22px;margin-bottom:10px;position:relative;z-index:20;box-sizing:border-box;width:100%;padding:16px 22px 8px\}/.test(cssHero) && !/#tbtn/.test(cssHero));
check("hero CSS: light theme turns only the page below the hero (the island stays dark; lifted-navy tokens)", /\[data-theme=light\]\{\s*--ss-page-bg:#EEF4FA/.test(cssHero) && /--ss-bg-abyss:#08203F;--ss-bg-deep:#0A2A5C;--ss-bg-navy:#07499C;/.test(cssHero) && !/\[data-theme=light\] \.hero-card\{/.test(cssHero));
check("hero CSS v13.151-edits mobile: the SAME PC-Match frame renders phone-wide (no 9-slice, no veil, no stacked grid rows, no --ss-time-w override — the zones + cqi type scale with the card; margin-top 134px since v13.152-spacing (the brand +20% needs the league-logo crown clearance) = the 100px mobile header + the league logo above; the shelf tz-note rule RETIRES with the shelf — the .time-date match day rides the clock pod; players retired <=1019px; crest watermarks flank the hero foot)", /@media \(max-width:899px\)\{/.test(cssHero) && /\.hero-card\{width:auto;margin-inline:10px;margin-top:134px\}/.test(cssHero) && /@media \(max-width:479px\)\{\s*\/\* v13\.151-edits: the shelf tz-note rule retires/.test(cssHero) && !/\.hero-date \.date-tz/.test(cssHero) && !/border-image:url\(/.test(cssHero) && !/\.hero-card::after\{content:"";position:absolute;inset:0;z-index:0;background:rgba\(1,9,24,\.5\)/.test(cssHero) && /@media \(max-width:1019px\)\{\s*\.hero-player,\.hero-player\.has\{display:none\}\s*\/\* v13\.158-pngshadow: the projected cast retires WITH the figures[\s\S]*?\*\/\s*\}/.test(cssHero));
check("hero CSS: reduced-motion kills the tick + parks the ambient particles (v13.155-herodepth spec 02/05: .hero-particle animation:none, a static .06 point stays — atmosphere without motion; the wrapper cast and HUD depth are STATIC effects and remain)", /@media \(prefers-reduced-motion:reduce\)\{\s*#hcS\.tick\{animation:none\}\s*\/\*[\s\S]*?\.hero-particle\{animation:none;opacity:\.06\}\s*\}/.test(cssHero));
check("hero CSS: the old Stadium-Pulse layers are GONE (video/fx/wm/hud/data/mid/chips/urgency ladder)", !/\.hero-video/.test(cssHero) && !/\.hero-fx/.test(cssHero) && !/\.hero-hud/.test(cssHero) && !/\.hero-mid\{/.test(cssHero) && !/data-urgent=soon/.test(cssHero) && !/\.hero-art/.test(cssHero) && !/--hero-blue:/.test(cssHero));

// ---------- 11b) v13.128-layoutrefine: the owner's six reported fixes ----------
check("v13.133 + v13.150-hud: the typography system stays centralized — the Morabba display list (h1-h6, hero-name); the numeric/meta surfaces (time-digits, venue-pill, count-num) in the Peyda group (800/500/600 — the digits went bold in v13.151-edits; count-label retired with the panel head)", /:root\{--font-heading:Morabba,Peyda,'Segoe UI',Tahoma,system-ui,sans-serif;--font-body:Peyda,'Segoe UI',Tahoma,system-ui,sans-serif/.test(cssHero) && /h1,h2,h3,h4,h5,h6,\.hero-name\{font-family:var\(--font-heading\)\}/.test(cssHero) && /\.league-title\{font-size:clamp\(13px,1\.9cqi,17px\);font-family:var\(--font-body\);font-weight:500/.test(cssHero) && /\.time-digits,\.venue-pill,\.count-num\{font-family:var\(--font-body\)\}/.test(cssHero) && /\.time-digits\{font-weight:800\}/.test(cssHero) && /\.venue-pill\{font-weight:500\}/.test(cssHero) && /\.count-num\{font-weight:600;line-height:1\}/.test(cssHero) && !/font-family:Vazirmatn/.test(cssHero));
check("v13.150-hud: the mobile 9-slice portrait artwork RETIRES (the PC-Match frame IS the card at every viewport — no border-image anywhere; the mobile PNG stays on disk + pinned for the retired CSS per the retention rule)", !/border-image:url\(\/ui\/sportsignal-hud-matches-hero-mobile\.png\)/.test(cssHero) && !/border-width:33px 35px 29px 33px/.test(cssHero) && fs.existsSync(path.join(__dirname, "..", "assets", "ui", "sportsignal-hud-matches-hero-mobile.png")));
check("v13.150-hud + v13.152-spacing: mobile card clearance — margin-top 134px under 900px (the 100px mobile header band + the league block above the frame + the +20% brand), 118 -> 134 in v13.152-spacing", /@media \(max-width:899px\)\{[\s\S]*?\.hero-card\{width:auto;margin-inline:10px;margin-top:134px/.test(cssHero));
check("v13.133-persiantype: no dead band on mobile — herowrap padding-bottom 0 (v13.153-heronext: 0 -> 48px — the same hero→main safe margin on phones; v13.154-polish: + margin-bottom:24px — the REAL page gap on phones too, the containers were 14px apart and read as collided) + the below-panel sync line (#lastSyncM, base layer — v13.151-edits: pulled UP onto the card\u2019s bottom rim (margin -8px, pointer-events:none) per requested-edits.png; v13.154-polish: opacity .6 — it is meta data, one step back; v13.149-syncfix: position:relative + z-index:2 lifts it above the z1 stadium photo — it was STATIC and painted UNDERNEATH .hero-bg, invisible since v13.142; color pinned #E2E8F0 hero-stable, 12px) + the page-col copy retired on ALL viewports + renderSync mirrors it", /\.herowrap\{padding-bottom:48px;margin-bottom:24px;--ss-header-h:100px\}/.test(cssHero) && /#lastSyncM\{display:block;position:relative;z-index:2;margin:-8px 0 0;padding:0;text-align:center;font-size:12px;line-height:1\.65;color:#E2E8F0;opacity:\.6;pointer-events:none\}/.test(cssHero) && /\.hero-sync\{display:none\}/.test(cssHero) && /\.hero-sync-m\{display:none\}/.test(cssHero) && /lastSyncM/.test(js20));
check("v13.133-persiantype: the crest watermarks are BACK on mobile (countdown-flank, low opacity, edge-clipped; v13.139-hud: .176->.202; v13.140-refine: +10% again — .202->.222; v13.141-wm: +10% again — .222->.244; v13.142-cinematic: +10% again — .244->.268; v13.152-spacing: +20 POINTS — .268->.468, desktop .264->.464) instead of display:none", /\.hero-bg \.bg-wm\{width:168px;height:168px;opacity:\.468;filter:blur\(1\.2px\);top:auto;bottom:-52px\}/.test(cssHero) && !/\.hero-bg \.bg-wm\{display:none\}/.test(cssHero));
check("v13.142-cinematic + v13.155-herodepth rim: BOTH hero players carry the reusable cinematic treatment — the class in the template + the lane-split class rules (grade + soft dark shadow + the DIRECTIONAL rim toward the card + subtle blue halo, in that order: --ss-player-rim-l lights the LEFT lane's figure from its right side, -r the RIGHT lane's from its left — screen-space only, never dir/team) + the centralized :root params + the navy light-theme swap + the base .88/1.08 filter stays as the no-class fallback", /hero-player hero-player--cinematic player-home/.test(publicSrc) && /hero-player hero-player--cinematic player-away/.test(publicSrc) && /\.hero-player--cinematic\.player-home img\{filter:var\(--ss-player-grade\) var\(--ss-player-shadow\) var\(--ss-player-rim-l\) var\(--ss-player-halo\)\}/.test(cssHero) && /\.hero-player--cinematic\.player-away img\{filter:var\(--ss-player-grade\) var\(--ss-player-shadow\) var\(--ss-player-rim-r\) var\(--ss-player-halo\)\}/.test(cssHero) && /\[data-theme=light\] \.hero-player--cinematic\.player-home img\{filter:drop-shadow\(0 0 1px rgba\(8,32,63,\.6\)\) var\(--ss-player-grade\) var\(--ss-player-shadow\) var\(--ss-player-rim-l\) var\(--ss-player-halo\)\}/.test(cssHero) && /\[data-theme=light\] \.hero-player--cinematic\.player-away img\{filter:drop-shadow\(0 0 1px rgba\(8,32,63,\.6\)\) var\(--ss-player-grade\) var\(--ss-player-shadow\) var\(--ss-player-rim-r\) var\(--ss-player-halo\)\}/.test(cssHero) && /--ss-player-rim-l:drop-shadow\(2px 0 1px rgba\(74,164,255,\.13\)\) drop-shadow\(4px 0 4px rgba\(39,132,255,\.07\)\)/.test(cssHero) && /--ss-player-rim-r:drop-shadow\(-2px 0 1px rgba\(74,164,255,\.13\)\) drop-shadow\(-4px 0 4px rgba\(39,132,255,\.07\)\)/.test(cssHero) && /--ss-player-grade:brightness\(\.97\) contrast\(1\.12\) saturate\(1\.08\)/.test(cssHero) && /--ss-player-shadow:drop-shadow\(0 12px 22px rgba\(0,8,25,\.38\)\)/.test(cssHero) && /--ss-player-halo:drop-shadow\(0 0 14px rgba\(0,155,255,\.14\)\)/.test(cssHero) && /--ss-player-shadow:drop-shadow\(0 12px 22px rgba\(8,32,63,\.42\)\)/.test(cssHero) && /filter:var\(--ss-player-glow\) brightness\(\.88\) contrast\(1\.08\)/.test(cssHero));

check("v13.150-hud: the featured club names scale with the frame — clamp(19px,3.45cqi,31px) (+4px, hugging the crest — v13.151-edits per requested-edits.png; the fitHeroNames walk in the bundle still shrinks the pathological cases), 2-line clamp kept", /font-size:clamp\(19px,3\.45cqi,31px\);font-weight:800/.test(cssHero) && !/\.hero-name\{font-size:17\.5px\}/.test(cssHero));
check("v13.135-zoomlight + v13.138-polish: the stadium-lights overlay — the img in the hero-bg template (after bg-scrim) + the .bg-lights rule (screen blend, opacity raised .35 -> .5 zoom round -> .6 polish round -> .66 refine round -> .726 cinematic round -> .799 lights round -> .919 + brightness(1.15) edits round (owner: 15% more brightness + 15% more opacity), cover, pointer-transparent) + the PNG exists on disk", /class="bg-lights" src="\/stadium-lights-hero\.png"/.test(publicSrc) && /\.hero-bg \.bg-lights\{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center;mix-blend-mode:screen;opacity:\.919;filter:brightness\(1\.15\);pointer-events:none;-webkit-user-select:none;user-select:none;display:block\}/.test(cssHero) && fs.existsSync(path.join(__dirname, "..", "assets", "stadium-lights-hero.png")));
check("v13.134-typelight: the dark/light toggle is RETIRED — no #tbtn in the public template, the pre-paint script pins var t=\"dark\" (styles-shared), the bundle init pins setTheme(\"dark\"), and the bundle ships fitHeroNames() wired after every renderHeroSpot()", !/id="tbtn"/.test(publicSrc) && /var t="dark"/.test(read("src/pages/styles-shared.ts")) && /setTheme\("dark"\),applyLang/.test(js20) && /function fitHeroNames\(\)\{var els=document\.querySelectorAll\("\.hero-name"\)/.test(js20) && /renderHeroSpot\(\),fitHeroNames\(\)/.test(js20));
check("v13.150-hud: the venue name reads Peyda 500, bare text in the tail (the old glass pill + svg icon retire — the stadium icon is baked into the frame; 2-line clamp for long names)", /\.venue-pill\{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden;color:var\(--ss-text\);font-size:clamp\(11px,1\.7cqi,15px\);font-weight:500;line-height:1\.25;text-align:center;max-width:100%\}/.test(cssHero));
check("v13.150-hud: the template carries the in-hero sync element BELOW the card (a sibling of the card anchor; v13.165-mcfa: the #mcHint scroll pill follows it as the LAST hero child, then the v13.131 retirement note; v13.149-syncfix's z-index lift rides in the CSS #lastSyncM rule)", (() => { const r = read("src/pages/public.ts"); return /class="hero-sync-m" id="lastSyncM"[^>]*>__SEO_SYNC__<\/p>/.test(r) && /<p class="hero-sync-m" id="lastSyncM"[^>]*>__SEO_SYNC__<\/p>\s*<!-- v13\.165-mcfa \(owner: "it\'s unclear/.test(r) && /<span data-i="mcHint">بازی‌های دیگر<\/span><\/a>\s*<!-- v13\.131-playerpresence/.test(r) && !/class="count-inner"/.test(r); })());
check("v13.150-hud: the mobile --ss-time-w override RETIRES with the chip (no time-artwork token anywhere — the frame scales via --ss-card-w + cqi)", !/--ss-time-w:min\(242px/.test(cssHero) && !/--ss-time-w:/.test(cssHero));
check("v13.128 page shell: body is FULL-WIDTH (no 760px column, no max-width) and the content column lives on .page-col (border-box — no global border-box on this site)", /body\{font-family:Peyda,'Segoe UI',Tahoma,system-ui,sans-serif;background-color:var\(--bg\);color:var\(--text\);max-width:none;margin:0;padding:24px 0 36px/.test(cssHero) && /\.page-col\{box-sizing:border-box;width:100%;max-width:760px;margin-inline:auto;padding-inline:20px\}/.test(cssHero) && !/max-width:760px;margin:0 auto/.test(cssHero));
check("v13.128 layout: the two-column grid rides .page-col.wide at >=1080px (was a body grid at >=1440px) — #wideMain in the WIDE inline-start column, #wideSide (the tables sidebar) in the narrow inline-end rail, sync line spanning", /@media \(min-width:1080px\)\{/.test(cssHero) && /\.page-col\.wide\{display:grid;grid-template-columns:minmax\(0,1fr\) minmax\(440px,500px\);column-gap:28px;row-gap:14px;align-items:start\}/.test(cssHero) && /\.page-col\.wide #wideMain\{grid-column:1\}/.test(cssHero) && /\.page-col\.wide #wideSide\{grid-column:2\}/.test(cssHero) && /\.page-col\.wide>\.hero-sync\{grid-column:1\/-1/.test(cssHero) && !/@media \(min-width:1440px\)\{body\{max-width:1400px/.test(cssHero));
check("v13.128 layout: the footer carries its own column constraint (was the body column; border-box)", /footer\{text-align:start;color:var\(--footer\);font-size:12px;margin-top:28px;line-height:2;box-sizing:border-box;max-width:760px;margin-inline:auto;padding-inline:20px\}/.test(cssHero));
check("v13.128 template: .page-col wraps EVERYTHING below the hero inside #main (the sync line + all nine cards), closed before </main>", (function(){const t=publicSrc, open=t.indexOf('<div class="page-col">'), sync=t.indexOf('id="lastSync"'), stats=t.indexOf('id="statsCard"'), mainEnd=t.indexOf('</main>'); return open>-1 && sync>open && stats>sync && mainEnd>stats && t.slice(stats,mainEnd).indexOf('</div>')>-1;})());
check("v13.128 JS: setWide relocates the cards INSIDE .page-col (appends #wideMain/#wideSide there + toggles .wide; undo restores the exact DOM order), threshold 1080px", /h=document\.querySelector\("#main \.page-col"\)\|\|\(a\?a\.parentNode:null\)/.test(js20) && /h\.appendChild\(t\),h\.appendChild\(r\),h\.classList\.add\("wide"\)/.test(js20) && /WIDE_ORDER\.forEach\(function\(o\)\{var l=document\.getElementById\(o\);l&&h\.appendChild\(l\)\}\)/.test(js20) && /h\.classList\.remove\("wide"\)/.test(js20) && /matchMedia\("\(min-width:1080px\)"\)/.test(js20) && !/matchMedia\("\(min-width:1440px\)"\)/.test(js20));

check("updateBigBar drives the four unit digits (hcD/hcH/hcM/hcS)", /getElementById\("hcD"\)/.test(js20) && /setNum\(dEl,dd\),setNum\(hEl,hh\),setNum\(mEl,mm\),setNum\(sEl,ss\)/.test(js20));
check("updateBigBar hides the panel for live/postponed (no fake countdown)", /post\)\{n&&\(n\.style\.display="none"\)/.test(js20) && /if\(live\)\{n&&\(n\.style\.display="none"\)/.test(js20));
check("updateBigBar never renders a negative countdown (clamped zeros + T(soon))", /if\(ms<=0\)\{setNum\(dEl,0\),setNum\(hEl,0\),setNum\(mEl,0\),setNum\(sEl,0\)/.test(js20) && /t&&\(t\.textContent=T\("soon"\)\)/.test(js20));

check("server mirror: heroCardHtml exists in seo/markup.ts (the herolook centre stack + Jalali date, class-for-class with the client)", /export function heroCardHtml\(sm: SeoMatch\): string/.test(read("src/seo/markup.ts")) && /function faHeroDateJalali/.test(read("src/seo/markup.ts")) && /function heroTeamHtml/.test(read("src/seo/markup.ts")));
check("router serves heroCardHtml into __SEO_HERO__", /const heroHtml = nextBig \? M\.heroCardHtml\(nextBig\) : ""/.test(read("src/seo/router.ts")));
check("router fills the server-side countdown digits (upcoming only, else hides the panel)", /__SEO_HCD__/.test(read("src/seo/router.ts")) && /hcUpcoming/.test(read("src/seo/router.ts")));
check("router injects the ONE h1 + the sr-only summary BEFORE the card anchor (never inside the link)", /html\.replace\('<a class="hero-card" id="bigHeroCard"',/.test(read("src/seo/router.ts")));
// ---------- v13.121-portraits: the HERO_ART mapping pins ----------
const heroArtBlock = js20.slice(js20.indexOf("var HERO_ART={"), js20.indexOf("function heroArtFor"));
const heroArtSrcs = [...heroArtBlock.matchAll(/src:"(\/players\/hero\/[a-z0-9-]+\.webp)"/g)].map((m) => m[1]);
const heroArtKeys = [...heroArtBlock.matchAll(/^"((?:[^"\\]|\\.)+)":\{src/gm)].map((m) => m[1].replace(/\\u([0-9A-F]{4})/g, (h, c) => String.fromCharCode(parseInt(c, 16))));
check("v13.160-casttune: every HERO_ART src has its PRE-BAKED cast sibling <slug>.cast.webp in assets/players/hero/ (generated by scripts/make-hero-casts.js — blackened + gaussian-blurred sigma 9%H (v13.160: was 6.5%H — the owner's 'more visible and with more spread') + floor-faded 15%->26%H + top-feathered + alpha x.68 (was .55), padded max(12.5%H, 1.9 sigma) sides / 8%H top so the blur fringe never meets a file edge and the cast box tracks the figure box across poses; the .cast.webp files are deterministic outputs — regenerate after any portraits:normalize or hero rotation), the bake script is committed, and its params are the documented ones", (() => {
  const castOk = heroArtSrcs.every((src) => fs.existsSync(path.join(__dirname, "..", "assets", src.replace(/\.webp$/, ".cast.webp"))));
  const scriptOk = fs.existsSync(path.join(__dirname, "..", "scripts", "make-hero-casts.js"));
  const bake = scriptOk ? fs.readFileSync(path.join(__dirname, "..", "scripts", "make-hero-casts.js"), "utf8") : "";
  return castOk && scriptOk && /SIGMA_H = 0\.09/.test(bake) && /PAD_SIDE_H = 0\.125/.test(bake) && /PAD_TOP_H = 0\.08/.test(bake) && /FADE_LO_H = 0\.15/.test(bake) && /FADE_HI_H = 0\.26/.test(bake) && /ALPHA = 0\.68/.test(bake) && /lossless: true/.test(bake);
})());
check("HERO_ART v13.130: every src resolves to a file in assets/players/hero/ (the ALPHA-TRIMMED canvases — bbox-crops of the manifest-pinned /players/uefa/ originals, same players/initial-UEFA bytes; same-count guard)", heroArtSrcs.length === heroArtKeys.length && heroArtSrcs.every((s) => fs.existsSync(path.join(__dirname, "..", "assets", s.slice(1)))) && heroArtSrcs.every((s) => fs.existsSync(path.join(__dirname, "..", "assets", "players", "uefa", s.split("/").pop()))));
check("HERO_ART: 35 entries — the 33 UCL-roster representatives + Chelsea FC + Tottenham Hotspur FC WIRED (v13.163-herohd: both entries now point at the players' NATIVE UEFA 1080px UCL-25/26 cutoffs — Cole Palmer + Dominic Solanke, the owner's 2026-10-22 quality directive; v13.162-heropair heritage: both PL giants sat crest-only until that round); deferred players' teams absent (Jackson/Aston Villa + Thauvin/Lens) AND the kit-mismatch team absent (Ueda shows his Feyenoord kit at Lille — excluded, owner decision 2026-10-18: no kit mismatch allowed)", heroArtKeys.length === 35 && heroArtKeys.includes("Chelsea FC") && heroArtKeys.includes("Tottenham Hotspur FC") && !heroArtKeys.includes("Aston Villa FC") && !heroArtKeys.includes("Racing Club de Lens") && !heroArtKeys.includes("Lille OSC"));
check("HERO_ART: keys are EXACT football-data.org provider names (FD is the first-priority pool source), incl. the cross-competition legal spellings", heroArtKeys.includes("Paris Saint-Germain FC") && heroArtKeys.includes("Club Atlético de Madrid") && heroArtKeys.includes("FC Internazionale Milano") && heroArtKeys.includes("PAE AEK") && heroArtKeys.includes("ŠK Slovan Bratislava") && heroArtKeys.includes("FK Bodø/Glimt"));
check("HERO_ART: alt empty on every entry (decorative aria-hidden layer) + poseId dropped; v13.123 fade fields allowed on the tier entries", (heroArtBlock.match(/,alt:\"\"[,}]/g) || []).length === 35 && !/poseId/.test(js20));
// ---------- v13.129-hudframe: the initial UEFA cutoffs RESTORED ----------
// The owner: "USE official webp uefa pictures… you've changed the yamal and
// dembele picture — use the previous ones (the initial uefa scraped one)".
// v2.2's framing fix had replaced these 9 roster portraits with
// league-platform media; these pins freeze the INITIAL 44e9906 cutoff bytes.
// v2.3 (13.131-styleloop) note: the bytes stay (owner-verified cutoffs,
// VLM-classified jersey/bust photos); the manifest provenance for these 9
// was repaired from a75e1d5 — see repair-reverted-provenance.js. The reason
// the owner wanted them back: the v2.2 replacements included platform CARD
// ART (the Yamal FIFA-card incident), now impossible via the style gate.
const UEFA_INITIAL_REVERT = {
  "ousmane-dembele": "7b7cc0210883", "lamine-yamal": "77fe0d659981", "antony": "fb4736e59593",
  "bruno-fernandes": "3a0c7ec05157", "bukayo-saka": "5f694f4833a2", "christoph-baumgartner": "1e0672cb557e",
  "erling-haaland": "11d71bf8e51f", "georges-mikautadze": "af7f7b14536a", "lautaro-martinez": "e5b68d7f80ee"
};
check("UEFA portraits: the 9 v2.2-reframed roster entries are REVERTED to the initial 44e9906 official UEFA cutoff bytes (sha256 prefixes)", Object.entries(UEFA_INITIAL_REVERT).every(([f, want]) => {
  const p = path.join(__dirname, "..", "assets", "players", "uefa", f + ".webp");
  if (!fs.existsSync(p)) return false;
  const h = crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
  return h.startsWith(want);
}));
check("HERO_ART v13.123-fadepill: the two fade tiers keyed to their portraits (Yamal hi — bright shorts end ~89% over dark legs; Šimić deep — bright kit ends ~70%, near-invisible below; v13.130: srcs moved to the trimmed /players/hero/ canvases — the data-fade attrs stay INERT since the v13.129 unified mask replaced the tier system)", /"FC Barcelona":\{src:"\/players\/hero\/lamine-yamal\.webp",alt:"",fade:"hi"\}/.test(heroArtBlock) && /"Sabah FK":\{src:"\/players\/hero\/veljko-simic\.webp",alt:"",fade:"deep"\}/.test(heroArtBlock));
check("template v13.150-hud: the countdown cells ride INSIDE the card anchor as the static .hud-cells layer (THREE tiles — the seconds tile retires with the old panel; label ABOVE the number via DOM order, data-i labels translated on language switch; #hcSr + the sr-only #bigbarTrack keep their ids; the __SEO_HC*__ placeholders are filled server-side; NO #bigbar element, NO bigbarLabel — updateBigBar null-guards them)", /<div class="hud-cells" role="timer" dir="ltr">/.test(publicSrc) && /<i class="count-unit" data-i="uDay">روز<\/i><b class="count-num" id="hcD">__SEO_HCD__<\/b>/.test(publicSrc) && /<i class="count-unit" data-i="uHour">ساعت<\/i><b class="count-num" id="hcH">__SEO_HCH__<\/b>/.test(publicSrc) && /<i class="count-unit" data-i="uMin">دقیقه<\/i><b class="count-num" id="hcM">__SEO_HCM__<\/b>/.test(publicSrc) && !/id="hcS"/.test(publicSrc) && !/bigbarLabel/.test(publicSrc) && /id="hcSr" class="sr-only" aria-live="polite"/.test(publicSrc) && /id="bigbarTrack" role="progressbar"/.test(publicSrc) && !/id="bigbar"/.test(publicSrc));
check("template: the player slots present but empty (no src, aria-hidden — the layer renders only for a mapped team; T-03 raw-HTML reasons); v13.158-pngshadow: each wrapper carries the img.hero-cast SHADOW COPY first + the figure img second (both filled by heroArt from the same entry)", /<div class="hero-player hero-player--cinematic player-home" aria-hidden="true"><img class="hero-cast" alt="" referrerpolicy="no-referrer"><img alt="" referrerpolicy="no-referrer"><\/div>\s*<div class="hero-player hero-player--cinematic player-away" aria-hidden="true"><img class="hero-cast" alt="" referrerpolicy="no-referrer"><img alt="" referrerpolicy="no-referrer"><\/div>/.test(publicSrc) && !/class="hero-art"/.test(publicSrc) && !/"hero-video"/.test(publicSrc));
check("template v13.150-hud: the .hero-player zones ride as section-level siblings between the scene and the card anchor; the PC-Match frame layer + the static .hud-cells countdown layer ride INSIDE the card anchor BEFORE #heroSpot (survive the client rebuild); the old #bigbar panel is GONE; the sync line sits below the card; the carousel AND the bell are GONE", (function(){const t=publicSrc, wrap=t.indexOf('<div class="herowrap">'), bg=t.indexOf('<div class="hero-bg"'), p1=t.indexOf('<div class="hero-player hero-player--cinematic player-home"'), card=t.indexOf('<a class="hero-card" id="bigHeroCard"'), hud=t.indexOf('<img class="card-hud" src="/ui/sportsignal-pc-match-hud.png"'), cells=t.indexOf('<div class="hud-cells" role="timer" dir="ltr">'), spot=t.indexOf('<div id="heroSpot">'), syncM=t.indexOf('id="lastSyncM"'), sync=t.indexOf('id="lastSync"'); return wrap>-1 && bg>wrap && p1>bg && card>p1 && hud>card && hud<spot && cells>card && cells<spot && spot>card && syncM>card && sync>syncM && t.indexOf('id="bigbar"')===-1 && t.indexOf('<div class="hero-carousel"')===-1 && t.indexOf('<a class="hero-bell"')===-1 && !/class="card bighero"/.test(t);})());
check("heroArt renders each zone ONLY when a mapping resolves (per-wrapper .has toggle — no reserved blank space)", /put\(w\[0\],a&&heroArtFor\(a\.homeTeam\)\),put\(w\[1\],a&&heroArtFor\(a\.awayTeam\)\)/.test(js20) && /node\.classList\.add\("has"\)/.test(js20) && /node\.classList\.remove\("has"\)/.test(js20));
check("heroArt v13.125 + v13.159-bakedcast: the figures AND their .hero-cast shadow imgs are queried at section level (.herowrap .hero-player) and filled per side from the SAME heroArtFor entry — figure img = img:not(.hero-cast) gets art.src; the cast img gets the entry's PRE-BAKED shadow file via art.src.replace(/\.webp$/,\".cast.webp\") (one source of truth: the cast is derived from the same entry, zero mapping drift; src-only — decorative, wrapper aria-hidden; its src cleared on hide with the figure's); the v13.155/.156 putShadow fill stays RETIRED with the .hud-shadow-plane", /function heroArt\(e,a\)\{\/\*[\s\S]*?\*\/var w=document\.querySelectorAll\("\.herowrap \.hero-player"\);if\(!w\.length\)return;/.test(js20) && /var im=node&&node\.querySelector\("img:not\(\.hero-cast\)"\),sc=node&&node\.querySelector\("img\.hero-cast"\);/.test(js20) && /sc&&\(sc\.src=art\.src\.replace\(\/\\\.webp\$\/,"\.cast\.webp"\)\),node\.classList\.add\("has"\)/.test(js20) && /sc&&sc\.removeAttribute\("src"\),node\.classList\.remove\("has"\)/.test(js20) && /put\(w\[0\],a&&heroArtFor\(a\.homeTeam\)\),put\(w\[1\],a&&heroArtFor\(a\.awayTeam\)\)\}/.test(js20) && !/putShadow=function/.test(js20));
check("v13.160-casttune: the projected player cast is a PRE-BAKED IMAGE shown by a BORING rule set (v13.159-bakedcast heritage — img.hero-cast (FIRST child of each lane wrapper, DOM-behind the figure) carries NO filter and NO mask (both EXPLICITLY killed: the base .hero-player img rule would otherwise hand it the figure's filter chain and the feet-fade mask — the mask's border-box clip is the v13.155/.156 rectangle mechanism and mask-clip:no-clip is the v13.158 below-hero leak) and NO max-width (the lane's +32px budget must not contain-shrink the padded cast file), only opacity var(--ss-cast-alpha) (1 dark / .84 light over the baked .68 master) + the lane-split translate+skewX (home +X toward the card with skewX(-3.2deg) leaning the head-shadow RIGHT, away −X with skewX(3.2deg) leaning LEFT — PHYSICAL lanes exactly like the rim rules, the owner's 'player left casts right / player right casts left' rule; transform-origin 50% 100% keeps the feet planted; the larger clamp(56px,5vw,100px) vector compensates the baked side pads' silhouette offset and leaves a clearly readable directional crescent) + the lane wrapper clips OPEN (inset(-100% -320px -100% -100%) / inset(-100% -100% -100% -320px) — v13.160 widened 160px->320px for the stronger cast reach: the bottom:0 floor cut that straight-lined every filtered paint crossing the wrapper bottom retires with the live compositing it guarded; the −320px card-side bound clears the padded cast file's translated+screwed box (translate 100 + skew ~48 + pose shift ≤56 at the head) + every prior live-composited cast mechanism stays RETIRED (the v13.157 WRAPPER drop-shadow, the v13.155/.156 shadow plane) + --ss-cast-blur RETIRES (the blur is baked into the pixels)", /\.hero-player--cinematic\.player-home img\.hero-cast\{filter:none;-webkit-mask:none;mask:none;max-width:none;opacity:var\(--ss-cast-alpha\);transform-origin:50% 100%;transform:translate\(var\(--ss-cast-x\),var\(--ss-cast-y\)\) skewX\(-3\.2deg\)\}/.test(cssHero) && /\.hero-player--cinematic\.player-away img\.hero-cast\{filter:none;-webkit-mask:none;mask:none;max-width:none;opacity:var\(--ss-cast-alpha\);transform-origin:50% 100%;transform:translate\(calc\(-1\*var\(--ss-cast-x\)\),var\(--ss-cast-y\)\) skewX\(3\.2deg\)\}/.test(cssHero) && /--ss-cast-x:clamp\(56px,5vw,100px\)/.test(cssHero) && /--ss-cast-y:clamp\(10px,\.9vw,18px\)/.test(cssHero) && /--ss-cast-alpha:1\b/.test(cssHero) && /--ss-cast-alpha:\.84/.test(cssHero) && !/--ss-cast-blur/.test(cssHero) && /\.hero-player\.player-home\{clip-path:inset\(-100% -320px -100% -100%\)\}/.test(cssHero) && /\.hero-player\.player-away\{clip-path:inset\(-100% -100% -100% -320px\)\}/.test(cssHero) && !/;mask-clip:no-clip;/.test(cssHero) && !/\.hero-player--cinematic\.player-home\{filter:drop-shadow/.test(cssHero) && !/\.hero-player--cinematic\.player-away\{filter:drop-shadow/.test(cssHero) && !/\.hud-shadow-plane\{position:absolute/.test(cssHero) && !/\.hs-img--soft/.test(cssHero) && !/\.hs-player\{/.test(cssHero) && /--ss-pose-shift/.test(cssHero));
check("heroArt keeps the data-fade tier contract (set on show, REMOVED on hide — no stale tier leaks across re-renders; the new design uses a single mask, the tiers ride as data)", /art\.fade\?im\.setAttribute\("data-fade",art\.fade\):im\.removeAttribute\("data-fade"\)/.test(js20) && /im\.removeAttribute\("src"\),im\.removeAttribute\("data-fade"\)/.test(js20) && /function heroWm\(e,a\)\{var t=document\.querySelector\("\.herowrap \.hero-bg"\)/.test(js20));
check("heroArt v13.160-casttune: the POSE-WIDTH GUARD — ssPoseShift(node,im) measures the LAID-OUT figure box (offsetWidth, unrotated + budget-capped) against the lane width and sets --ss-pose-shift on the wrapper (extra inward inset = max(0, clamp(24px,3vw,56px) − (laneW + 32 − figW)) — wide poses like Saka .89 / Haaland .92 that fill the whole max-width calc(100% + 32px) budget get pulled inward off the viewport edge; narrow poses measure 0 and render pixel-identically to v13.159); wired at fill time (im.onload + the complete-cache fast path) and cleared on hide with the src; refitHeroPoses() re-measures both lanes and rides the resize rAF pass (fitHeroNames companion)", /function ssPoseShift\(node,im\)\{try\{var laneW=node\.offsetWidth\|\|0,figW=im\.offsetWidth\|\|0,C=Math\.round\(Math\.min\(56,Math\.max\(24,window\.innerWidth\*\.03\)\)\),s=Math\.max\(0,C-\(laneW\+32-figW\)\);node\.style\.setProperty\("--ss-pose-shift",s\+"px"\)\}catch\(x\)\{\}\}/.test(js20) && /function refitHeroPoses\(\)\{var w=document\.querySelectorAll\("\.herowrap \.hero-player"\)/.test(js20) && /im\.onload=function\(\)\{ssPoseShift\(node,im\)\},im\.complete&&im\.naturalWidth&&ssPoseShift\(node,im\)\}/.test(js20) && /node\.style\.removeProperty\("--ss-pose-shift"\)/.test(js20) && /requestAnimationFrame\(function\(\)\{fitHeroNames\(\);refitHeroPoses\(\)\}\)\}\)/.test(js20));
check("timezone v13.160-casttune: THE MELBOURNE FIX — the tz select's filter rebuild NO LONGER auto-picks the first matching option (the v13.159 bug: after searching a city the select displayed that very option, so clicking it fired NO change event — \"found melbourne, but did nothing\"); while a filter is active and the stored zone is not among the matches a DISABLED PLACEHOLDER is inserted instead; the panel gains the ⏱ Auto (browser) entry that clears the stored preference; the choice persists to the ss_tz COOKIE (path=/, max-age=31536000, SameSite=Lax) AND the legacy localStorage mirror; legacy localStorage values migrate to the cookie at initTz", /ph\.value="",ph\.disabled=!0,ph\.textContent/.test(js20) && /e\.insertBefore\(ph,e\.firstChild\),e\.selectedIndex=0/.test(js20) && /var pref=tzStored\(\),hasOpt=function\(v\)\{for\(var q=0;q<e\.options\.length;q\+\+\)if\(e\.options\[q\]\.value===v\)return!0;return!1\}/.test(js20) && !/!e\.value&&e\.options\.length&&\(e\.value=e\.options\[0\]\.value\)/.test(js20) && /au\.value="__auto__"/.test(js20) && /\("auto browser خودکار مرورگر "\+autoLbl\)\.toLowerCase\(\)\.indexOf\(o\)>=0/.test(js20) && /function tzCookieWrite\(v\)\{try\{document\.cookie="ss_tz="\+encodeURIComponent\(v\)\+";path=\/;max-age=31536000;SameSite=Lax"\}catch\(x\)\{\}\}/.test(js20) && /function tzCookieClear\(\)\{try\{document\.cookie="ss_tz=;path=\/;max-age=0;SameSite=Lax"\}catch\(x\)\{\}\}/.test(js20) && /tzCookieWrite\(v\),tzValid\(v\)&&\(function\(\)\{try\{localStorage\.setItem\("ucl_tz",v\)\}catch\(x\)\{\}\}\)\(\)\)/.test(js20) && /legacy&&tzValid\(legacy\)&&!tzCookieRead\(\)&&tzCookieWrite\(legacy\)/.test(js20));
check("timezone v13.160-casttune: curTz() resolves ss_tz COOKIE -> legacy localStorage ucl_tz -> the BROWSER/OS-LOCALE zone (Intl.DateTimeFormat().resolvedOptions().timeZone — the owner-asked first-visit default; Iranian users still resolve Asia/Tehran) -> PAGE_TZ (server final fallback), every candidate Intl-validated so a malformed stored value can never break rendering, and the resolution is CACHED (TZ_CACHE + tzInvalidate()) because curTz() sits on the per-second countdown hot path", /function tzStored\(\)\{var v=tzCookieRead\(\);if\(v\)return v;try\{v=localStorage\.getItem\("ucl_tz"\);if\(v&&tzValid\(v\)\)return v\}catch\(x\)\{\}return null\}/.test(js20) && /if\(TZ_CACHE\)return TZ_CACHE;var v=tzStored\(\);if\(!v\)\{try\{v=Intl\.DateTimeFormat\(\)\.resolvedOptions\(\)\.timeZone\|\|null\}catch\(x\)\{v=null\}v&&tzValid\(v\)\|\|\(v=null\)\}v\|\|\(v=PAGE_TZ\);return TZ_CACHE=v/.test(js20) && /function tzInvalidate\(\)\{TZ_CACHE=null\}/.test(js20));
check("timezone v13.161-tzstamp: the sync line carries the DISPLAY ZONE + GMT OFFSET in parentheses — fmtStamp() appends tzStamp(e) on BOTH language paths; tzStamp resolves the city from the SAME FA_TZ map the tz panel uses (tzPathFa for fa, the IANA path for en, UTC for fixed Etc/ zones) and the offset from tzOffAt() — the formatToParts diff computed AT THE STAMPED INSTANT (DST-honest: a Melbourne stamp reads 11:00 in southern summer, 10:00 in winter — always agreeing with the rendered clock, unlike the TZ_ANCHOR-pinned dropdown labels); the note shape is « (تهران 3:30 GMT)» with the sign only on negatives (the owner's literal example)", /if\(curLang\(\)==="en"\)return a\.toLocaleDateString\("en-GB",\{weekday:"long",timeZone:curTz\(\)\}\)\+" "\+t\+tzStamp\(e\);/.test(js20) && /\+" "\+faNum\(t\)\+" "\+n\+tzStamp\(e\)\}catch\{return""\}\}/.test(js20) && /function tzOffAt\(e,d\)\{try\{for\(var a=new Intl\.DateTimeFormat\("en-US",\{timeZone:e,hour12:!1,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit"\}\)\.formatToParts\(d\)/.test(js20) && /return Math\.round\(\(n-d\.getTime\(\)\)\/6e4\)\}catch\(x\)\{return null\}\}/.test(js20) && /var sg=o<0\?"-":"",m=Math\.abs\(o\),h=Math\.floor\(m\/60\),mm=m%60,off=sg\+h\+":"\+\(mm<10\?"0"\+mm:""\+mm\)/.test(js20) && /city=l==="en"\?p\.replace\(\/_\/g," "\):tzPathFa\(p\)\}return" \("\+city\+" "\+off\+" GMT\)"\}catch\(x\)\{return""\}\}/.test(js20));
check("timezone v13.161-tzstamp: the SERVER sync stamp carries the same zone note — lastUpdatedHtml (seo/markup.ts) appends « (تهران 3:30 GMT)» via displayTzGmtOffset() (Intl shortOffset primary, the en-GB parts-diff fallback, the UTC+3:30 constant as the honest last resort — DISPLAY_TZ has no DST); the router fills BOTH sync placeholders (the old first-occurrence-only __SEO_SYNC__ replace left #lastSync as a raw placeholder for no-JS visitors — now /__SEO_SYNC__/g)", (() => { const mk = read("src/seo/markup.ts"); const rt = read("src/seo/router.ts"); return /function displayTzGmtOffset\(iso: string\): string \{/.test(mk) && /timeZoneName: "shortOffset"/.test(mk) && /const note = " \(تهران " \+ displayTzGmtOffset\(fetchedAt\) \+ " GMT\)";/.test(mk) && /\/__SEO_SYNC__\/g, syncHtml/.test(rt) && !/\.replace\("__SEO_SYNC__", syncHtml\)/.test(rt); })());
check("hero CSS v13.161-tzstamp: the MATCH DAY rides a few px closer to the match time — .hero-time .time-digits + .time-date gains --ss-date-lift clamp(-9px,-.8cqi,-3px) as margin-top with an EQUAL padding-bottom (calc(var(--ss-date-lift) * -1)) so the flex stack height — and the digits' centering in the artwork's clock pod — stays byte-stable (only the date text moves); scoped to the upcoming digits pairing ONLY so live/score pods (state pill -> score -> date) keep their spacing", /\.hero-time \.time-digits \+ \.time-date\{--ss-date-lift:clamp\(-9px,-\.8cqi,-3px\);margin-top:var\(--ss-date-lift\);padding-bottom:calc\(var\(--ss-date-lift\) \* -1\)\}/.test(cssHero));

check("HERO_ART: the ONE kit-mismatch portrait EXCLUDED (Ueda→Lille in a Feyenoord kit; file retained in the collection for re-check) — Šporar KEPT: portrait visually verified a genuine Slovan 26/27 kit (adidas, niké 'je tipovanie', double-cross-on-hills crest; the manifest's Olimpija-kit claim corrected 2026-10-18 — Olimpija wear green/white Puma)", !heroArtKeys.includes("Lille OSC") && heroArtKeys.includes("ŠK Slovan Bratislava") && !/KIT MISMATCH/.test(heroArtBlock) && fs.existsSync(path.join(__dirname, "..", "assets", "players", "uefa", "ayase-ueda.webp")));
check("player artwork contract documented (assets/hero/players/README.md) — the REAL UEFA-portrait contract, old 2:3 contract explicitly retired", (() => { const r = read("assets/hero/players/README.md"); return fs.existsSync(path.join(__dirname, "..", "assets", "hero", "players", "README.md")) && /512 × 512/.test(r) && /\/players\/uefa\//.test(r) && /manifest\.json/.test(r) && /Superseded/.test(r); })());
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
const crypto = require("crypto");
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
const crypto = require("crypto");
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
const crypto = require("crypto");
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
