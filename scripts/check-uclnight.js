// Self-check: the UCL night feature (v13.99-uclgif) — the "/" command menu
// (setMyCommands) + the UCL.gif banner on both halves of a UCL day (the
// fixture preview + the night results digest). Asserts the invariants:
//  1) write-first dedupe (mark BEFORE any send — v13.36-nospam)
//  2) per-date + per-chat dedupe key format uclnight_<dateKey>_<chatId>
//  3) the preview window: [T-6h, T-10min] (early/late/fire behavioral)
//  4) UCL-only (competition code "CL"), data-driven not weekday-driven
//  5) entry wall guard >= 40 + per-send banner guard < 42
//  6) the banner precedes the text and can NEVER block it (own try/catch)
//  7) the night digest carries the banner only on CL nights (< 42 guard)
//  8) sendAnimation: plain-text caption (NO parse_mode), file_id cache
//     (put on URL success, delete on file_id failure)
//  9) ensureBotMenu: once per VERSION (KV flag), fa default + en + admin
//     chat scope; every menu command has a real bot.ts handler
// 10) the asset: assets/bot/ucl-night.gif exists, root UCL.gif gone,
//     _headers pins its cache policy, config points at /bot/ucl-night.gif
// 11) cron-notify wiring (preview step + menu step, both own try/catch)
// 12) harness order: digest-uclnight.ts after the digest group (no cycle)
// 13) behavioral: buildUclPreviewMessage (fa Jalali header + escaped lines,
//     en Gregorian header) passes a strict MarkdownV2 lint
"use strict";
const fs = require("fs");
const path = require("path");
const src = require("./lib/worker-src")();

let fails = 0;
const check = (name, cond) => {
  console.log((cond ? "OK   " : "FAIL ") + name);
  if (!cond) fails++;
};

const uclSrc = fs.readFileSync("src/digest-uclnight.ts", "utf8");
const nightSrc = fs.readFileSync("src/digest-night.ts", "utf8");
const notifySrc = fs.readFileSync("src/cron-notify.ts", "utf8");
const tgSrc = fs.readFileSync("src/telegram.ts", "utf8");
const botSrc = fs.readFileSync("src/bot.ts", "utf8");
const cfgSrc = fs.readFileSync("src/config.ts", "utf8");

// 1) mark-before-send (the put of the dedupe key precedes the FIRST send of
// any kind — banner or text).
const putIdx = uclSrc.indexOf("await env.STATE.put(dedupeKey");
const bannerIdx = uclSrc.indexOf("await sendUclGifBanner(");
const sendIdx = uclSrc.indexOf("await sendTelegram(");
check("write-first: dedupe mark precedes banner and text", putIdx > 0 && bannerIdx > putIdx && sendIdx > putIdx);
check("dedupe read precedes the mark (skip already-sent)", uclSrc.indexOf("await env.STATE.get(dedupeKey)") < putIdx);

// 2) key format: uclnight_<dateKey>_<chatId>
check("per-chat per-date dedupe key format", /"uclnight_" \+ dateKey \+ "_" \+ c/.test(uclSrc));

// 3) the window (behavioral — real eval'd source with a CONFIG stub).
const untype = (s) => s.replace(/:\s*(number|string|boolean|any|Date|Map<[^>]*>)(\[\])?/g, "").replace(/\?([,)])/g, "$1");
const wsFn = uclSrc.match(/export function previewWindowState\([^)]*\) \{[\s\S]*?\n\}/);
if (wsFn) {
  const previewWindowState = eval("(() => { var CONFIG = { UCL_PREVIEW_LEAD_MS: 6 * 60 * 60 * 1e3, UCL_PREVIEW_TAIL_MS: 10 * 60 * 1e3 }; " + untype(wsFn[0]).replace("export function", "function") + "; return previewWindowState; })()");
  const T = Date.parse("2026-10-14T16:45:00Z"); // tonight's first UCL kickoff
  check("window: >6h ahead = early (no preview yet)", previewWindowState(T, T - 7 * 3600e3) === "early");
  check("window: T-2h = fire (the deploy-mid-window case)", previewWindowState(T, T - 2 * 3600e3) === "fire");
  check("window: T-6h exactly = fire (boundary inclusive)", previewWindowState(T, T - 6 * 3600e3) === "fire");
  check("window: T-10min exactly = fire (boundary inclusive)", previewWindowState(T, T - 10 * 60e3) === "fire");
  check("window: T-5min = late (ball about to roll)", previewWindowState(T, T - 5 * 60e3) === "late");
  check("window: after kickoff = late (no stale fixture list)", previewWindowState(T, T + 30 * 60e3) === "late");
  check("window: no kickoff = none", previewWindowState(0, T) === "none");
} else {
  check("previewWindowState found in source", false);
}
check("window tunables live in CONFIG (LEAD 6h / TAIL 10min)", /UCL_PREVIEW_LEAD_MS: 6 \* 60 \* 60 \* 1e3/.test(cfgSrc) && /UCL_PREVIEW_TAIL_MS: 10 \* 60 \* 1e3/.test(cfgSrc));

// 4) UCL-only filter.
check("UCL-only: the CL competition code set", /const UCL_CODES = \["CL"\];/.test(uclSrc) && /UCL_CODES\.indexOf\(mm\.competition\.code\) > -1/.test(uclSrc));
check("data-driven day (no weekday gates in the preview)", !/getUTCDay\(\)|getDay\(\)/.test(uclSrc));

// 5) wall guards.
check("entry wall guard (>= 40 skips the preview)", /subrequestCount\(\) >= 40/.test(uclSrc));
check("per-send banner guard (< 42)", /if \(subrequestCount\(\) < 42\) \{/.test(uclSrc));

// 6) banner-first + never-blocking.
check("banner precedes the fixture text (user's exact layout)", bannerIdx > 0 && sendIdx > bannerIdx);
check("banner failure never blocks the text (own try/catch)", /UCL preview banner failed/.test(uclSrc) && /catch \(e\) \{\s*console\.warn\("UCL preview banner failed/.test(uclSrc));
check("preview build failures are per-chat (never fatal)", /catch \(e\) \{\s*console\.error\("UCL preview build failed/.test(uclSrc));

// 7) the night digest's results half.
check("night digest: UCL detection (nightHasUcl = CL in the night's set)", /nightHasUcl = nightMatches\.some\(\(mm\) => mm && mm\.competition && mm\.competition\.code === "CL"\)/.test(nightSrc));
check("night digest: banner budget-guarded (< 42) and non-blocking", /if \(nightHasUcl && subrequestCount\(\) < 42\) \{/.test(nightSrc) && /UCL night banner failed/.test(nightSrc));
check("night digest: banner goes before the digest text", nightSrc.indexOf("await sendUclGifBanner(") < nightSrc.indexOf("await sendTelegram("));
check("night digest log marks the banner", /\(\+UCL banner\)/.test(nightSrc));

// 8) the animation sender.
const animSeg = (tgSrc.match(/export async function sendAnimation[\s\S]*?\n\}/) || [""])[0];
check("sendAnimation exists (2 attempts)", /for \(let attempt = 1; attempt <= 2; attempt\+\+\)/.test(animSeg));
check("sendAnimation: PLAIN caption — no parse_mode on the animation", !/parse_mode/.test(animSeg));
check("sendAnimation: dead-chat detection", /chat not found\|blocked by the user\|bot was kicked\|deactivated/.test(animSeg));
const bStart = tgSrc.indexOf("export async function sendUclGifBanner");
const bannerSeg = bStart >= 0 ? tgSrc.slice(bStart, tgSrc.indexOf("// v13.99-botmenu", bStart) > 0 ? tgSrc.indexOf("// v13.99-botmenu", bStart) : bStart + 4000) : "";
check("banner: file_id cache — URL on miss, put on success, delete on failure", /CONFIG\.KV_UCL_GIF_FILEID\)/.test(bannerSeg) && /env\.STATE\.delete\(CONFIG\.KV_UCL_GIF_FILEID\)/.test(bannerSeg) && /env\.STATE\.put\(CONFIG\.KV_UCL_GIF_FILEID, r2\.file_id/.test(bannerSeg) && /CONFIG\.UCL_GIF_URL/.test(bannerSeg));
check("banner: no outbox push (a missed GIF must never queue a retry)", !/outboxPush/.test(bannerSeg));

// 9) the menu.
check("menu: fa default + en language + admin chat scope registration", /await setMyCommands\(env, BOT_MENU_FA\)/.test(tgSrc) && /await setMyCommands\(env, BOT_MENU_EN, \{ type: "default" \}, "en"\)/.test(tgSrc) && /\{ type: "chat", chat_id: adminChat \}/.test(tgSrc));
check("menu: once per VERSION (KV flag, the VERSION export — NOT CONFIG.VERSION)", /env\.STATE\.get\(CONFIG\.KV_BOT_MENU_FLAG\)/.test(tgSrc) && /env\.STATE\.put\(CONFIG\.KV_BOT_MENU_FLAG, VERSION\)/.test(tgSrc) && !/CONFIG\.VERSION/.test(tgSrc));
check("menu: telegram.ts imports the VERSION export", /import \{ CONFIG, VERSION \} from "\.\/config"/.test(tgSrc));
const menuLists = eval("(() => { " + [
  (src.match(/var BOT_MENU_FA = \[[\s\S]*?\];/) || [""])[0],
  (src.match(/var BOT_MENU_EN = \[[\s\S]*?\];/) || [""])[0],
  (src.match(/var BOT_MENU_ADMIN_FA = BOT_MENU_FA\.concat\(\[[\s\S]*?\]\);/) || [""])[0],
  (src.match(/var BOT_MENU_ADMIN_EN = BOT_MENU_EN\.concat\(\[[\s\S]*?\]\);/) || [""])[0]
].join("\n") + "\n; return { BOT_MENU_FA, BOT_MENU_EN, BOT_MENU_ADMIN_FA, BOT_MENU_ADMIN_EN }; })()");
check("menu: all four lists parse from the harness source", menuLists.BOT_MENU_FA.length === 10 && menuLists.BOT_MENU_ADMIN_FA.length === 14);
check("menu: command names are Telegram-legal (lowercase, 1-32)", menuLists.BOT_MENU_ADMIN_EN.every((c) => /^[a-z0-9_]{1,32}$/.test(c.command)));
check("menu: descriptions within 1-256 chars", menuLists.BOT_MENU_ADMIN_FA.concat(menuLists.BOT_MENU_EN).every((c) => c.description && c.description.length >= 1 && c.description.length <= 256));
check("menu: every user command has a REAL bot.ts handler", menuLists.BOT_MENU_FA.every((c) => new RegExp('"/' + c.command + '"').test(botSrc)));
check("menu: admin commands are the user set + the toolbelt", menuLists.BOT_MENU_ADMIN_EN.slice(0, menuLists.BOT_MENU_EN.length).every((c, i) => c.command === menuLists.BOT_MENU_EN[i].command) && menuLists.BOT_MENU_ADMIN_EN.length === menuLists.BOT_MENU_EN.length + 4);
check("help body now lists /featured too (code-span form, menu/help consistency)", /`\/featured` \\\\-/.test(botSrc));

// 10) the asset.
check("asset: assets/bot/ucl-night.gif exists", fs.existsSync(path.join(__dirname, "..", "assets", "bot", "ucl-night.gif")));
check("asset: moved out of the repo root (no stray UCL.gif)", !fs.existsSync(path.join(__dirname, "..", "UCL.gif")));
check("asset: _headers pins its cache policy + marks it a BOT asset", /\/bot\/ucl-night\.gif/.test(fs.readFileSync(path.join(__dirname, "..", "assets", "_headers"), "utf8")) && /TELEGRAM BOT ASSET/.test(fs.readFileSync(path.join(__dirname, "..", "assets", "_headers"), "utf8")));
check("config: UCL_GIF_URL points at the served asset", /UCL_GIF_URL: "https:\/\/sportsignal\.ir\/bot\/ucl-night\.gif"/.test(cfgSrc));
check("operator script exists (manual menu re-run)", fs.existsSync(path.join(__dirname, "set-bot-commands.js")));

// 11) wiring.
check("cron-notify calls the preview with the merged pool", /maybeSendUclNightPreview\(env, chatIds, matches\)/.test(notifySrc));
check("preview + menu steps own their try/catch (never break notify)", /UCL preview step failed/.test(notifySrc) && /Bot menu registration step failed/.test(notifySrc) && /await ensureBotMenu\(env\)/.test(notifySrc));

// 12) harness order: digest-uclnight.ts after the digest group (the pinned
// five stay contiguous; the new module follows — one-directional import).
const harnessSrc = fs.readFileSync(path.join(__dirname, "lib", "worker-src.js"), "utf8");
check("harness order: digest group stays contiguous, uclnight after it", /"digest-weekly\.ts", "digest-morning\.ts", "digest-night\.ts", "digest-bigmatch\.ts", "digest-coronation\.ts",/.test(harnessSrc) && harnessSrc.indexOf('"digest-uclnight.ts"') > harnessSrc.indexOf('"digest-coronation.ts"'));

// 13) behavioral: buildUclPreviewMessage on the REAL eval'd source (real
// Jalali/English date helpers + real time helpers; translateTeam stubbed so
// the test is deterministic; then a strict MarkdownV2 lint on the output).
const grabU = (re) => { const m = src.match(re); return m ? untype(m[0]) : null; };
const uPieces = [
  // v13.106-mdstyle: the real entity builders (uclPreviewLine composes
  // mdBold/mdCode now) + the escape-regex vars they close over
  grabU(/var MDV2_RESERVED = "[^"]*";/),
  grabU(/var MDV2_ESCAPE_SRC = [^\n]*;/),
  grabU(/var MDV2_ESCAPE_RE = [^\n]*;/),
  grabU(/function mdEscape\([^)]*\) \{[\s\S]*?\n\}/),
  grabU(/function mdBold\([^)]*\) \{[\s\S]*?\n\}/),
  grabU(/function mdCode\([^)]*\) \{[\s\S]*?\n\}/),
  grabU(/function toFaDigits\([^)]*\) \{[\s\S]*?\n\}/),
  grabU(/function escapeMarkdownCharacters\([^)]*\) \{[\s\S]*?\n\}/),
  grabU(/var JALALI_MONTHS_FA = \[[\s\S]*?\];/),
  grabU(/var WEEKDAYS_FA = \[[^\]]*\];/),
  grabU(/var WEEKDAYS_EN = \[[^\]]*\];/),
  grabU(/(?:var|const) MONTHS_EN = \[[^\]]*\];/),
  grabU(/function toJalaliParts\([^)]*\) \{[\s\S]*?\n\}/),
  grabU(/function jalaliDateFa\([^)]*\) \{[\s\S]*?\n\}/),
  grabU(/function englishDateYmd\([^)]*\) \{[\s\S]*?\n\}/),
  grabU(/function getJalaliTime\([^)]*\) \{[\s\S]*?\n\}/),
  grabU(/function getEnglishTime\([^)]*\) \{[\s\S]*?\n\}/),
  // v13.100-priority: the builder delegates each line to uclPreviewLine
  grabU(/function uclPreviewLine\([^)]*\) \{[\s\S]*?\n\}/),
  grabU(/function buildUclPreviewMessage\([^)]*\) \{[\s\S]*?\n\}/)
];
if (uPieces.every(Boolean)) {
  const ctx = eval("(() => { " + uPieces.join("\n") + "; var translateTeam = (n) => n.replace(/United/, \"Utd\"); return { buildUclPreviewMessage }; })()");
  const mk = (h, a, ko) => ({ homeTeam: { name: h }, awayTeam: { name: a }, utcDate: ko, competition: { code: "CL" }, status: "TIMED" });
  const envT = { TEHRAN_TZ: "Asia/Tehran" };
  const fixtures = [mk("Arsenal", "Shakhtar United", "2026-10-14T16:45:00Z"), mk("Inter", "Bayern München", "2026-10-14T19:00:00Z"), mk("Real Madrid", "Man City", "2026-10-14T19:00:00Z")];
  const fa = ctx.buildUclPreviewMessage(envT, fixtures, "fa", 2026, 10, 14);
  const en = ctx.buildUclPreviewMessage(envT, fixtures, "en", 2026, 10, 14);
  check("behavioral fa: FULL Jalali header (چهارشنبه ۲۲ مهر ۱۴۰۵)", fa.includes("\u0634\u0628 \u0644\u06CC\u06AF \u0642\u0647\u0631\u0645\u0627\u0646\u0627\u0646 \u0627\u0631\u0648\u067E\u0627 \u2014 \u0686\u0647\u0627\u0631\u0634\u0646\u0628\u0647 \u06F2\u06F2 \u0645\u0647\u0631 \u06F1\u06F4\u06F0\u06F5"));
  check("behavioral fa: Tehran kickoff times PLAIN, Persian digits (v13.107)", fa.includes("\u2014 \u06F2\u06F0:\u06F1\u06F5") && fa.includes("\u2014 \u06F2\u06F2:\u06F3\u06F0"));
  check("behavioral fa: all three fixtures listed with translated names", fa.includes("Arsenal") && fa.includes("Shakhtar Utd") && fa.includes("Bayern M\u00FCnchen") && fa.includes("Real Madrid"));
  check("behavioral en: long-form Gregorian header", en.includes("Champions League night \u2014 Wednesday, 14 October 2026"));
  check("behavioral en: 24h times PLAIN (v13.107)", en.includes("\u2014 20:15") && en.includes("\u2014 22:30"));
  // v13.106-mdstyle: the shared ENTITY-AWARE validator (bold/code/italic
  // modeled; outside code spans every reserved char still must be escaped —
  // the v13.96.1 '-' lesson + the user's ZWNJ names, unchanged in spirit).
  const { mdv2Safe, mdv2Entities } = require("./lib/mdv2");
  check("behavioral: fa message passes the entity-aware MarkdownV2 gate", mdv2Safe(fa));
  check("behavioral: en message passes the entity-aware MarkdownV2 gate", mdv2Safe(en));
  check("behavioral: fa fixture lines are BOLD match headers", mdv2Entities(fa).bold.some((b) => b.includes("Arsenal")) && mdv2Entities(fa).bold.some((b) => b.includes("Bayern M\u00FCnchen")));
  const many = [];
  for (let i = 0; i < 18; i++) many.push(mk("Team" + i, "Opp" + i, "2026-10-14T19:00:00Z"));
  const faMany = ctx.buildUclPreviewMessage(envT, many, "fa", 2026, 10, 14);
  check("behavioral: >16 games cap to the LIMIT + Persian-digit '+N more'", faMany.includes("\u2026 \u0648 \u06F2") && (faMany.match(/\u26BD/g) || []).length === 16);
  // v13.100-priority: the lineBuilder injection — the fan-out loop passes
  // memoized lines (once per match per lang); the builder must use them
  // VERBATIM and call once per rendered match (never twice, never zero).
  {
    const calls = new Map();
    const viaBuilder = ctx.buildUclPreviewMessage(envT, fixtures, "fa", 2026, 10, 14, (mt) => {
      const k = mt.homeTeam.name;
      calls.set(k, (calls.get(k) || 0) + 1);
      return "LINE(" + k + ")";
    });
    check("behavioral: lineBuilder lines render verbatim in order", viaBuilder.includes("LINE(Arsenal)") && viaBuilder.indexOf("LINE(Arsenal)") < viaBuilder.indexOf("LINE(Inter)") && viaBuilder.indexOf("LINE(Inter)") < viaBuilder.indexOf("LINE(Real Madrid)"));
    check("behavioral: lineBuilder called exactly once per fixture", [...calls.values()].every((n) => n === 1) && calls.size === 3);
    check("behavioral: header identical with the lineBuilder path", viaBuilder.startsWith(fa.slice(0, fa.indexOf("\u26BD"))));
  }
} else {
  check("buildUclPreviewMessage + utils pieces found in harness source", false);
}

console.log(fails ? `\n${fails} FAIL` : "\nAll UCL-night checks passed");
process.exit(fails ? 1 : 0);
