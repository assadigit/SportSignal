// Self-check: the night results digest (v13.96-nightdigest). Asserts the
// invariants that keep it spam-free and wall-proof:
//  1) write-first dedupe (mark BEFORE send — v13.36-nospam order)
//  2) per-date + per-chat dedupe key format
//  3) the early-morning rollover: hour<6 summarizes YESTERDAY's evening
//  4) daytime gate (hour 6..19 never fires)
//  5) "night over" = all resolved, with the 4h stuck-status defense
//  6) at least one FINISHED required (a no-football night sends nothing)
//  7) the subrequest wall guard (>= 44 skips the digest)
//  8) followed-team line carries the رتبه فعلی rank line
//  9) fan-out isolation: a build failure is per-chat, never fatal
// 10) cron-notify passes the merged live pool (ctx.matches)
"use strict";
const fs = require("fs");
const src = require("./lib/worker-src")();

let fails = 0;
const check = (name, cond) => {
  console.log((cond ? "OK   " : "FAIL ") + name);
  if (!cond) fails++;
};

const nightSrc = fs.readFileSync("src/digest-night.ts", "utf8");
const notifySrc = fs.readFileSync("src/cron-notify.ts", "utf8");

// strip TS type annotations so extracted functions can eval in plain node
const untype = (s) => s.replace(/:\s*(number|string|boolean|any|Date|Map<[^>]*>)(\[\])?/g, "").replace(/\?([,)])/g, "$1");
const evalFn = (name, re) => {
  const m = src.match(re);
  if (!m) return null;
  return eval("(" + untype(m[0]).replace("function " + name, "function") + ")");
};

// 1) mark-before-send: the STATE.put of the dedupe key precedes sendTelegram.
const putIdx = nightSrc.indexOf('await env.STATE.put(dedupeKey');
const sendIdx = nightSrc.indexOf("await sendTelegram(");
check("write-first: dedupe mark precedes the send", putIdx > 0 && sendIdx > 0 && putIdx < sendIdx);
check("dedupe read precedes the mark (skip already-sent)", nightSrc.indexOf("await env.STATE.get(dedupeKey)") < putIdx);

// 2) key format: nightdigest_<dateKey>_<chatId>
check("per-chat per-date dedupe key format", /"nightdigest_" \+ dateKey \+ "_" \+ c/.test(nightSrc));

// 3) hour<6 → yesterday's date (the 00:30 rollover).
check("early-morning summarizes YESTERDAY (hour < 6 rolls the date back)", /if \(hour < 6\) \{/.test(nightSrc) && /24 \* 60 \* 60 \* 1e3\);/.test(nightSrc));

// 4) daytime gate.
check("daytime (6..19) never sends", /else if \(hour < 20\) \{\s*continue;/.test(nightSrc));

// 4b) v13.96.1-hotfix (the 2026-10-14 00:53Z incident): the tz offset is
// sampled ONCE per bucket (tzOffsetMs) and per-match work is pure
// arithmetic — no Intl.DateTimeFormat construction inside any per-match
// loop (the first cut burned ~thousands of constructions/tick and killed
// invocations on the free-plan CPU limit).
check("CPU: one formatter per tz (tzOffsetMs), none inside the match loop", /function tzOffsetMs/.test(nightSrc) && !/new Intl\.DateTimeFormat/.test(nightSrc.slice(nightSrc.indexOf("function matchesOfLocalDate"), nightSrc.indexOf("function nightIsOver"))) );
check("CPU: matchesOfLocalDate is arithmetic (localDateKeyOf, no formatters)", /function localDateKeyOf/.test(nightSrc) && /localDateKeyOf\(t, offsetMs\) === key/.test(nightSrc));

// 5) stuck-status defense + resolution statuses.
check("night-over requires every match resolved", /function nightIsOver/.test(nightSrc) && /DONE_STATUSES\.includes\(st\)/.test(nightSrc));
check("4h stuck-status defense (frozen IN_PLAY can't block the digest)", /nowMs - ko > 4 \* 60 \* 60 \* 1e3\)/.test(nightSrc));

// 6) at least one FINISHED.
check("requires >= 1 FINISHED (no empty digest)", /if \(verdict\.finished < 1\) continue;/.test(nightSrc));

// 7) subrequest wall guard.
check("subrequest wall guard (>= 44 skips the digest)", /subrequestCount\(\) >= 44/.test(nightSrc));

// 8) the rank line (رتبه فعلی) for followed teams.
check("followed-team line carries the رتبه فعلی rank line", nightSrc.includes("\\u0631\\u062A\\u0628\\u0647 \\u0641\\u0639\\u0644\\u06CC"));

// 9) per-chat isolation: the send sits inside the per-chat loop with its
// own build try/catch; a failure counts as skipped, never throws.
check("build failures are per-chat (try/catch inside the chat loop)", /catch \(e\) \{\s*console\.error\("night digest build failed/.test(nightSrc));

// 10) cron-notify wires the digest with the merged live pool.
check("cron-notify calls maybeSendNightDigest with the merged pool", /maybeSendNightDigest\(env, chatIds, matches\)/.test(notifySrc));
check("night digest step owns its try/catch (never breaks notify)", /Night digest step failed/.test(notifySrc));

// 11) v13.98-jalalinight — the fa header is FULL Hijri-Shamsi (Jalali), the
// en header is long-form Gregorian, and the night's tz-local y/m/d is
// passed into the builder (no Gregorian DD/MM rendered with Persian digits).
check("fa header renders Jalali (jalaliDateFa), not Gregorian-in-Persian-digits", /jalaliDateFa\(ny, nm, nd\)/.test(nightSrc) && !/toFaDigits\(faDate\)/.test(nightSrc));
check("en header renders long-form Gregorian (englishDateYmd)", /englishDateYmd\(ny, nm, nd\)/.test(nightSrc));
check("the caller passes the night's tz-local y/m/d into the builder", /buildNightDigestMessage\(\{ \.\.\.env, TEHRAN_TZ: tz \}, nightMatches, lang, prefs, c, rankCache, \{ y, m, d \}\)/.test(nightSrc));

// 12) v13.98-jalalinight — the stale-pool completeness guard: when the 4h
// defense "resolved" half or more of the night, the pool is stale — defer
// for a fresh sweep instead of sending a partial digest (the 2026-10-14
// 01:11Z one-game-digest incident); never blocks past the window's end.
check("stale-pool guard: defended majority defers the digest", /verdict\.defended > 0 && verdict\.finished \* 2 < nightMatches\.length && !lastChance/.test(nightSrc));
check("guard never blocks forever (lastChance at window end: 23h/5h)", /const lastChance = hour >= 23 \|\| hour >= 5/.test(nightSrc));

// Behavioral: jalaliDateFa + englishDateYmd on the REAL harness source (the
// pure-math Borkowski conversion + Persian arrays, eval'd together with
// their dependencies; exports already stripped by the worker-src transform).
const grabU = (re) => { const m = src.match(re); return m ? untype(m[0]) : null; };
const uPieces = [
  grabU(/function toFaDigits\([^)]*\) \{[\s\S]*?\n\}/),
  grabU(/var JALALI_MONTHS_FA = \[[\s\S]*?\];/),
  grabU(/var WEEKDAYS_FA = \[[^\]]*\];/),
  grabU(/var WEEKDAYS_EN = \[[^\]]*\];/),
  grabU(/(?:var|const) MONTHS_EN = \[[^\]]*\];/),
  grabU(/function toJalaliParts\([^)]*\) \{[\s\S]*?\n\}/),
  grabU(/function jalaliDateFa\([^)]*\) \{[\s\S]*?\n\}/),
  grabU(/function englishDateYmd\([^)]*\) \{[\s\S]*?\n\}/)
];
if (uPieces.every(Boolean)) {
  const u = eval("(() => { " + uPieces.join("\n") + "; return { jalaliDateFa, englishDateYmd, toJalaliParts }; })()");
  // 2026-10-13 (the incident night) = سه‌شنبه ۲۱ مهر ۱۴۰۵.
  check("behavioral: jalaliDateFa(2026,10,13) = \"سه‌شنبه ۲۱ مهر ۱۴۰۵\"", u.jalaliDateFa(2026, 10, 13) === "\u0633\u0647\u200C\u0634\u0646\u0628\u0647 \u06F2\u06F1 \u0645\u0647\u0631 \u06F1\u06F4\u06F0\u06F5");
  // Nowruz edge: 2026-03-21 = شنبه ۱ فروردین ۱۴۰۵.
  check("behavioral: jalaliDateFa(2026,3,21) = \"شنبه ۱ فروردین ۱۴۰۵\" (Nowruz edge)", u.jalaliDateFa(2026, 3, 21) === "\u0634\u0646\u0628\u0647 \u06F1 \u0641\u0631\u0648\u0631\u062F\u06CC\u0646 \u06F1\u06F4\u06F0\u06F5");
  // Year edge: 2026-01-01 is still 1404 (۱۱ دی).
  check("behavioral: jalaliDateFa(2026,1,1) = \"پنجشنبه ۱۱ دی ۱۴۰۴\" (year edge)", u.jalaliDateFa(2026, 1, 1) === "\u067E\u0646\u062C\u0634\u0646\u0628\u0647 \u06F1\u06F1 \u062F\u06CC \u06F1\u06F4\u06F0\u06F4");
  check("behavioral: englishDateYmd(2026,10,13) = \"Tuesday, 13 October 2026\"", u.englishDateYmd(2026, 10, 13) === "Tuesday, 13 October 2026");
  check("behavioral: toJalaliParts(2026,10,14) = 1405/7/22", JSON.stringify(u.toJalaliParts(2026, 10, 14)) === JSON.stringify({ jy: 1405, jm: 7, jd: 22 }));
} else {
  check("jalali helpers found in utils.ts source", false);
}

// Behavioral: nightIsOver on the REAL eval'd source (with its module-level
// DONE_STATUSES pulled from the same transformed concatenation).
const doneArr = src.match(/const DONE_STATUSES = \[[^\]]*\];/);
const nightIsOver = doneArr
  ? eval("(() => { " + untype(doneArr[0]) + "; " + untype(src.match(/function nightIsOver\([^)]*\) \{[\s\S]*?\n\}/)[0]) + "; return nightIsOver; })()")
  : null;
if (nightIsOver) {
  const now = Date.parse("2026-10-14T01:00:00Z");
  const ko = "2026-10-13T19:00:00Z";
  check("behavioral: all FINISHED → over, finished counted", JSON.stringify(nightIsOver([{ utcDate: ko, status: "FINISHED" }, { utcDate: ko, status: "FINISHED" }], now)) === JSON.stringify({ over: true, finished: 2, defended: 0 }));
  check("behavioral: one TIMED future-ish match blocks the night", nightIsOver([{ utcDate: ko, status: "FINISHED" }, { utcDate: "2026-10-13T22:00:00Z", status: "TIMED" }], now).over === false);
  check("behavioral: stuck IN_PLAY >4h past kickoff counts as done AND defended", nightIsOver([{ utcDate: ko, status: "IN_PLAY" }], now).over === true && nightIsOver([{ utcDate: ko, status: "IN_PLAY" }], now).defended === 1);
  check("behavioral: fresh IN_PLAY (<4h) blocks", nightIsOver([{ utcDate: "2026-10-13T23:00:00Z", status: "IN_PLAY" }], now).over === false);
  check("behavioral: POSTPONED counts as resolved but not finished", nightIsOver([{ utcDate: ko, status: "POSTPONED" }], now).finished === 0);
} else {
  check("nightIsOver found in harness source", false);
}

// Behavioral: dateKeyOf formats.
const dateKeyOf = evalFn("dateKeyOf", /function dateKeyOf\([^)]*\) \{[\s\S]*?\n\}/);
if (dateKeyOf) {
  check("behavioral: dateKeyOf formats YYYY-MM-DD zero-padded", dateKeyOf(2026, 10, 4) === "2026-10-04");
} else {
  check("dateKeyOf found in harness source", false);
}

// 13) v13.110-dupcollapse — the 2026-10-16 regression: the SAME fixture
// reached the night's set through two provider spellings (FD's legal
// "1. FC Köln" + sportscore's "FC Köln" — the digitfold root fix lives in
// teams.ts/canonDedupe, gated by check-dedupe) and the digest printed
// "آینتراشت فرانکفورت ۱ - ۰ کلن" twice. The builder now collapses the
// night's rows by competition + normalized pairing BEFORE rendering, so
// even a future provider-variant gap can never double a line here.
check("builder collapses same-pairing duplicates before rendering", /nightMatches = collapsePairings\(nightMatches\);/.test(nightSrc));
check("collapsePairings keys on competition + normalized pairing", /function collapsePairings\(list\) \{/.test(nightSrc) && nightSrc.includes('normalizeTeamName(m.homeTeam.name) + "|" + normalizeTeamName(m.awayTeam.name)'));

// Behavioral: render the REAL builder with the EXACT live-pool rows from
// that night (FD id 565828 + spsc-2026-10-16-BL1-36, identical 1-0) plus a
// distinct second match — the Frankfurt line must appear ONCE while the
// other match still renders. Async wrap (the mdstyle pattern — CJS has no
// top-level await); the summary print moves inside the promise tail.
(async () => {
  const { mdv2Safe } = require("./lib/mdv2");
  const { normalizeTeamName } = require("../src/teams.ts");
  // Stubs keep this a pure render (no follows, no standings fetches);
  // normalizeTeamName is the REAL module so the pairing key exercises the
  // production fold (direct eval resolves it through this scope).
  globalThis.normalizeTeamName = normalizeTeamName;
  globalThis.translateTeam = (n) => n;
  globalThis.translateCompetition = (c) => c;
  globalThis.userFollowsMatch = () => null;
  globalThis.userFollowsSides = () => ({ home: false, away: false });
  globalThis.priorityTier = () => 0;
  globalThis.fetchStandings = async () => null;
  const grabSrc = (re) => {
    const m = src.match(re);
    return m ? untype(m[0]) : null;
  };
  const nightPieces = [
    // SYNC wrapper: the eval returns the (async) builder itself, not a
    // promise of it — "use strict" eval scopes stay inside the IIFE.
    "(() => {",
    uPieces.join("\n"),
    grabSrc(/function escapeMarkdownCharacters\([^)]*\) \{[\s\S]*?\n\}/),
    (src.match(/var MDV2_RESERVED = "[^"]*";/) || [])[0],
    (src.match(/var MDV2_ESCAPE_SRC = [^\n]*;/) || [])[0],
    (src.match(/var MDV2_ESCAPE_RE = [^\n]*;/) || [])[0],
    grabSrc(/function mdEscape\([^)]*\) \{[\s\S]*?\n\}/),
    grabSrc(/function mdBold\([^)]*\) \{[\s\S]*?\n\}/),
    grabSrc(/function mdItalic\([^)]*\) \{[\s\S]*?\n\}/),
    grabSrc(/function ftScore\([^)]*\) \{[\s\S]*?\n\}/),
    grabSrc(/function collapsePairings\([^)]*\) \{[\s\S]*?\n\}/),
    grabSrc(/async function teamRank\([^)]*\) \{[\s\S]*?\n\}/),
    grabSrc(/function findTeamRow\([^)]*\) \{[\s\S]*?\n\}/),
    grabSrc(/async function buildNightDigestMessage\([^)]*\) \{[\s\S]*?\n\}/),
    "return buildNightDigestMessage;",
    "})()"
  ];
  const buildNight = nightPieces.every(Boolean) ? eval(nightPieces.join("\n")) : null;
  if (buildNight) {
    const fdRow = { id: 565828, competition: { code: "BL1" }, homeTeam: { name: "Eintracht Frankfurt" }, awayTeam: { name: "1. FC Köln" }, utcDate: "2026-10-16T18:30:00Z", status: "FINISHED", score: { fullTime: { home: 1, away: 0 } } };
    const ssRow = { id: "spsc-2026-10-16-BL1-36", competition: { code: "BL1" }, homeTeam: { name: "Eintracht Frankfurt" }, awayTeam: { name: "FC Köln" }, utcDate: "2026-10-16T18:30:00.000Z", status: "FINISHED", score: { fullTime: { home: 1, away: 0 } } };
    const frosi = { id: 561112, competition: { code: "SA" }, homeTeam: { name: "Frosinone" }, awayTeam: { name: "US Sassuolo Calcio" }, utcDate: "2026-10-16T19:00:00Z", status: "FINISHED", score: { fullTime: { home: 4, away: 2 } } };
    const nightMsg = await buildNight({ TEHRAN_TZ: "Europe/Berlin" }, [fdRow, ssRow, frosi], "fa", { "9": {} }, 9, new Map(), { y: 2026, m: 10, d: 16 });
    check("behavioral: duplicated Frankfurt–Köln renders the pairing ONCE", (nightMsg.match(/Frankfurt/g) || []).length === 1 && (nightMsg.match(/Köln/g) || []).length === 1);
    check("behavioral: the ۱-۰ score line appears exactly once", (nightMsg.match(/۱ \\- ۰/g) || []).length === 1);
    check("behavioral: the distinct night match still renders (Frosinone 4-2)", nightMsg.includes("Frosinone") && (nightMsg.match(/۴ \\- ۲/g) || []).length === 1);
    check("behavioral: the collapsed night digest still parses (MarkdownV2)", mdv2Safe(nightMsg));
    // The collapse must also hold when the two copies disagree on
    // completeness (one provider stale): the row WITH the score survives —
    // a scoreless twin never blanks the line.
    const noScoreTwin = { id: "spsc-late", competition: { code: "BL1" }, homeTeam: { name: "Eintracht Frankfurt" }, awayTeam: { name: "FC Köln" }, utcDate: "2026-10-16T18:30:00.000Z", status: "FINISHED", score: null };
    const nightMsg2 = await buildNight({ TEHRAN_TZ: "Europe/Berlin" }, [noScoreTwin, fdRow], "fa", { "9": {} }, 9, new Map(), { y: 2026, m: 10, d: 16 });
    check("behavioral: scoreless twin collapses onto the scored copy (score kept)", (nightMsg2.match(/Frankfurt/g) || []).length === 1 && (nightMsg2.match(/۱ \\- ۰/g) || []).length === 1);
  } else {
    check("buildNightDigestMessage found in harness source", false);
  }
  console.log(fails ? `\n${fails} FAIL` : "\nAll night-digest checks passed");
  process.exit(fails ? 1 : 0);
})().catch((e) => {
  console.error("ERROR", e);
  process.exit(1);
});
