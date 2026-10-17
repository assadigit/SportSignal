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
// 11) v13.113-nightgate: the valuable-night gate — a random-results night
//     (the owner's example: Frankfurt–Köln / Frosinone–Sassuolo / Le Mans–
//     Toulouse / Deportivo–La Coruña) sends NOTHING; UCL nights,
//     elimination events, and per-chat desired-team nights still send;
//     bot-silent leagues (AL) leave the night's set entirely.
// 12) v13.113-cupcover: the elimination detector (stageTok / cupTieShape /
//     eliminationOf / collectEliminations) + the "X eliminated against Y"
//     digest section — behavioral on the REAL harness source.
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
check("the caller passes the night's tz-local y/m/d into the builder", /buildNightDigestMessage\(\{ \.\.\.env, TEHRAN_TZ: tz \}, nightMatches, lang, prefs, c, rankCache, \{ y, m, d \}, eliminations\)/.test(nightSrc));

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

// 14) v13.113-nightgate — the valuable-night gate (the owner's rule):
// bot-silent leagues leave the night's set entirely; a chat with no UCL,
// no elimination and no desired team that night is QUIET — skipped BEFORE
// the dedupe read+write (a quiet night costs ZERO KV ops); the elimination
// events are computed over the FULL pool (two-leg twins included).
check("nightgate: bot-silent leagues leave the night's set (AL filter)", nightSrc.includes("nightMatches.filter((mm) => mm && !isBotSilentLeague(mm.competition && mm.competition.code))"));
check("nightgate: every chat passes nightIsValuable before the dedupe read", /if \(!nightIsValuable\(nightMatches, eliminations, prefs, c\)\) \{ out\.quiet\+\+; continue; \}/.test(nightSrc));
check("nightgate: the gate precedes the dedupe read (quiet = zero KV ops)", nightSrc.indexOf("if (!nightIsValuable(") < nightSrc.indexOf("await env.STATE.get(dedupeKey)"));
check("nightgate: eliminations are computed over the full pool", /const eliminations = collectEliminations\(nightMatches, pool\);/.test(nightSrc));
check("nightgate: the out counters carry quiet", /notOver: 0, quiet: 0 \}/.test(nightSrc));
check("nightgate: the builder takes the eliminations param", /nightYmd\?, eliminations\?\) \{/.test(nightSrc));

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
    // v13.113-cupcover: the elimination section renderer rides the same
    // eval scope as the builder that calls it.
    grabSrc(/function renderEliminationSection\([^)]*\) \{[\s\S]*?\n\}/),
    grabSrc(/async function buildNightDigestMessage\([^)]*\) \{[\s\S]*?\n\}/),
    "return buildNightDigestMessage;",
    "})()"
  ];
  const buildNight = nightPieces.every(Boolean) ? eval(nightPieces.join("\n")) : null;
  if (buildNight) {
    const fdRow = { id: 565828, competition: { code: "BL1" }, homeTeam: { name: "Eintracht Frankfurt" }, awayTeam: { name: "1. FC Köln" }, utcDate: "2026-10-16T18:30:00Z", status: "FINISHED", score: { fullTime: { home: 1, away: 0 } } };
    const ssRow = { id: "spsc-2026-10-16-BL1-36", competition: { code: "BL1" }, homeTeam: { name: "Eintracht Frankfurt" }, awayTeam: { name: "FC Köln" }, utcDate: "2026-10-16T18:30:00.000Z", status: "FINISHED", score: { fullTime: { home: 1, away: 0 } } };
    // v13.110 follow-up: the SECOND live duplicate class — FD legal names
    // ("Frosinone Calcio" vs "US Sassuolo Calcio") vs TSP short names
    // ("Frosinone" vs "Sassuolo"), the residual pairs the prefix-token
    // fold (teams.ts) + collapsePairings must also render once. The TSP
    // twin is the VERBATIM live shape: status SCHEDULED (stale) carrying a
    // pre-kickoff default 0-0 — it must NOT displace the FINISHED 4-2 row
    // (the first cut's "later wins" did, and the FINISHED filter then
    // dropped the pairing from the digest entirely).
    const frosiFd = { id: 558573, competition: { code: "SA" }, homeTeam: { name: "Frosinone Calcio" }, awayTeam: { name: "US Sassuolo Calcio" }, utcDate: "2026-10-16T18:45:00Z", status: "FINISHED", score: { fullTime: { home: 4, away: 2 } } };
    const frosiTs = { id: "tsd-2482204", competition: { code: "SA" }, homeTeam: { name: "Frosinone" }, awayTeam: { name: "Sassuolo" }, utcDate: "2026-10-16T18:45:00.000Z", status: "SCHEDULED", score: { fullTime: { home: 0, away: 0 } } };
    const nightMsg = await buildNight({ TEHRAN_TZ: "Europe/Berlin" }, [fdRow, ssRow, frosiFd, frosiTs], "fa", { "9": {} }, 9, new Map(), { y: 2026, m: 10, d: 16 });
    check("behavioral: duplicated Frankfurt–Köln renders the pairing ONCE", (nightMsg.match(/Frankfurt/g) || []).length === 1 && (nightMsg.match(/Köln/g) || []).length === 1);
    check("behavioral: the ۱-۰ score line appears exactly once", (nightMsg.match(/۱ \\- ۰/g) || []).length === 1);
    check("behavioral: duplicated Frosinone–Sassuolo (prefix-token variant) renders ONCE with the REAL score", (nightMsg.match(/Frosinone/g) || []).length === 1 && (nightMsg.match(/Sassuolo/g) || []).length === 1 && (nightMsg.match(/۴ \\- ۲/g) || []).length === 1 && !(nightMsg.match(/۰ \\- ۰/g) || []).length);
    check("behavioral: the collapsed night digest still parses (MarkdownV2)", mdv2Safe(nightMsg));
    // The collapse must also hold when the two copies disagree on
    // completeness (one provider stale): the row WITH the score survives —
    // a scoreless twin never blanks the line.
    const noScoreTwin = { id: "spsc-late", competition: { code: "BL1" }, homeTeam: { name: "Eintracht Frankfurt" }, awayTeam: { name: "FC Köln" }, utcDate: "2026-10-16T18:30:00.000Z", status: "FINISHED", score: null };
    const nightMsg2 = await buildNight({ TEHRAN_TZ: "Europe/Berlin" }, [noScoreTwin, fdRow], "fa", { "9": {} }, 9, new Map(), { y: 2026, m: 10, d: 16 });
    check("behavioral: scoreless twin collapses onto the scored copy (score kept)", (nightMsg2.match(/Frankfurt/g) || []).length === 1 && (nightMsg2.match(/۱ \\- ۰/g) || []).length === 1);

    // =============================================================
    // v13.113-cupcover behavioral: the elimination section — the owner's
    // "always cover elimination cups: Club X eliminated against Y". The
    // completing row renders in the ELIMINATION section (grouped by
    // competition, loser named first), never a second time as a plain
    // "نتایج شب" line, and the whole message still parses MarkdownV2.
    // =============================================================
    const cupRow = { id: 700001, competition: { code: "FA_CUP" }, homeTeam: { name: "Liverpool FC" }, awayTeam: { name: "Ipswich Town FC" }, utcDate: "2026-11-07T15:00:00Z", status: "FINISHED", stage: "3RD_ROUND", score: { fullTime: { home: 2, away: 0 } } };
    const elimEv = { code: "FA_CUP", home: "Liverpool FC", away: "Ipswich Town FC", loser: "Ipswich Town FC", winner: "Liverpool FC", final: false, agg: null };
    const nightMsg3 = await buildNight({ TEHRAN_TZ: "Europe/Berlin" }, [cupRow, fdRow], "fa", { "9": {} }, 9, new Map(), { y: 2026, m: 11, d: 7 }, [elimEv]);
    check("cupcover: the elimination line renders (Ipswich eliminated by Liverpool)", nightMsg3.includes("حذف شد") && nightMsg3.includes("Ipswich Town FC") && nightMsg3.includes("مقابل"));
    check("cupcover: the elimination section is grouped by competition (FA_CUP label, mdItalic-escaped)", nightMsg3.includes("FA\\_CUP"));
    check("cupcover: the eliminated pairing leaves the plain-results section (one line only)", (nightMsg3.match(/Ipswich Town FC/g) || []).length === 1 && (nightMsg3.match(/Liverpool FC/g) || []).length === 1);
    check("cupcover: the non-cup row still renders in نتایج شب", (nightMsg3.match(/Frankfurt/g) || []).length === 1);
    check("cupcover: the elimination digest parses (MarkdownV2)", mdv2Safe(nightMsg3));
    // a two-leg aggregate elimination renders the مجموع suffix (fa digits,
    // escaped hyphen); the final flag renders در فینال.
    const elimEv2 = { code: "CL", home: "Arsenal FC", away: "FC Porto", loser: "FC Porto", winner: "Arsenal FC", final: false, agg: { w: 3, l: 1 } };
    const nightMsg4 = await buildNight({ TEHRAN_TZ: "Europe/Berlin" }, [fdRow], "fa", { "9": {} }, 9, new Map(), { y: 2026, m: 3, d: 18 }, [elimEv2]);
    check("cupcover: the aggregate suffix renders (مجموع ۳ \\- ۱)", nightMsg4.includes("مجموع") && nightMsg4.includes("۳ \\- ۱"));
    check("cupcover: the aggregate digest parses (MarkdownV2)", mdv2Safe(nightMsg4));
    const elimFinal = { code: "CL", home: "Paris Saint-Germain", away: "Inter Milan", loser: "Inter Milan", winner: "Paris Saint-Germain", final: true, agg: null };
    const nightMsg5 = await buildNight({ TEHRAN_TZ: "Europe/Berlin" }, [fdRow], "en", { "9": {} }, 9, new Map(), { y: 2026, m: 5, d: 30 }, [elimFinal]);
    check("cupcover: the final flag renders (en: 'in the final')", nightMsg5.includes("in the final") && nightMsg5.includes("eliminated by"));
    check("cupcover: the en elimination digest parses (MarkdownV2)", mdv2Safe(nightMsg5));
  } else {
    check("buildNightDigestMessage found in harness source", false);
  }

  // =============================================================
  // v13.113-nightgate behavioral: nightIsValuable on the REAL source —
  // the owner's rule, all three triggers + the per-chat resolution.
  // =============================================================
  const gatePiece = grabSrc(/function nightIsValuable\([^)]*\) \{[\s\S]*?\n\}/);
  if (gatePiece) {
    const follows = (prefs, chatId, m) => {
      const teams = ((prefs || {})[String(chatId)] || {}).teams || [];
      return teams.some((t) => t === (m.homeTeam && m.homeTeam.name) || t === (m.awayTeam && m.awayTeam.name)) ? "one" : null;
    };
    globalThis.userFollowsMatch = follows;
    const nightIsValuable = eval("(() => { " + gatePiece + "; return nightIsValuable; })()");
    const rndBL1 = { competition: { code: "BL1" }, homeTeam: { name: "Eintracht Frankfurt" }, awayTeam: { name: "1. FC Köln" }, status: "FINISHED" };
    const rndSA = { competition: { code: "SA" }, homeTeam: { name: "Frosinone Calcio" }, awayTeam: { name: "US Sassuolo Calcio" }, status: "FINISHED" };
    const rndFL1 = { competition: { code: "FL1" }, homeTeam: { name: "Le Mans" }, awayTeam: { name: "Toulouse" }, status: "FINISHED" };
    const rndPD = { competition: { code: "PD" }, homeTeam: { name: "Deportivo La Coruña" }, awayTeam: { name: "Levante" }, status: "FINISHED" };
    const uclRow = { competition: { code: "CL" }, homeTeam: { name: "PSV Eindhoven" }, awayTeam: { name: "Girona FC" }, status: "FINISHED" };
    const livRow = { competition: { code: "PL" }, homeTeam: { name: "Liverpool FC" }, awayTeam: { name: "Everton FC" }, status: "FINISHED" };
    // THE OWNER'S EXAMPLE — the exact 2026-10-17 noise report: a digest of
    // random league results nobody asked for. Now quiet: no send, no
    // dedupe write, nothing.
    check("gate: the owner's example night is QUIET (random league results only)", nightIsValuable([rndBL1, rndSA, rndFL1, rndPD], [], {}, 9) === false);
    check("gate: a UCL night is valuable (even with no desired side)", nightIsValuable([rndBL1, uclRow], [], {}, 9) === true);
    check("gate: an elimination event is ALWAYS valuable", nightIsValuable([rndBL1], [{ code: "FA_CUP", loser: "x", winner: "y" }], {}, 9) === true);
    const prefs9 = { "9": { teams: ["Liverpool FC"] }, "8": { teams: ["Arsenal FC"] } };
    check("gate: a desired-team night is valuable for THE follower (chat 9)", nightIsValuable([rndBL1, livRow], [], prefs9, 9) === true);
    check("gate: another chat's desired team does not open chat 8's gate (per-chat)", nightIsValuable([rndBL1, livRow], [], prefs9, 8) === false);
    check("gate: UCL outranks the per-chat resolution (both chats)", nightIsValuable([livRow, uclRow], [], prefs9, 8) === true);
    globalThis.userFollowsMatch = () => null; // restore the earlier stub
  } else {
    check("nightIsValuable found in harness source", false);
  }

  // =============================================================
  // v13.113-cupcover behavioral: the elimination detector on the REAL
  // source (stageTok / cupTieShape / eliminationOf / collectEliminations)
  // — the tie-shape table, the failure direction (toward silence), the
  // two-leg aggregate, and the dedupe.
  // =============================================================
  globalThis.CONFIG = { INTL_COMPETITIONS: { WC: 2000, EC: 2018, COPA: 2029, AFCON: 2088, AFC: 2092 } };
  globalThis.isDomesticCup = (c) => ["FA_CUP", "EFL_CUP", "CDR", "COPPA_ITALIA", "DFB_POKAL"].includes(c);
  const cePieces = [
    grabSrc(/function stageTok\(m\) \{[\s\S]*?\n\}/),
    grabSrc(/function cupTieShape\([^)]*\) \{[\s\S]*?\n\}/),
    grabSrc(/function ftFullTime\(m\) \{[\s\S]*?\n\}/),
    grabSrc(/function findTwinLeg\([^)]*\) \{[\s\S]*?\n\}/),
    grabSrc(/function eliminationOf\([^)]*\) \{[\s\S]*?\n\}/),
    grabSrc(/function collectEliminations\([^)]*\) \{[\s\S]*?\n\}/)
  ];
  if (cePieces.every(Boolean)) {
    const ce = eval("(() => { " + cePieces.join("\n") + "; return { stageTok, cupTieShape, eliminationOf, collectEliminations }; })()");
    // stageTok — FD enums + sportscore free-text + the trap orders.
    check("cupelim: stageTok FD enums (rounds, semis, final, league)", ce.stageTok({ stage: "3RD_ROUND" }) === "RD3" && ce.stageTok({ stage: "SEMI_FINALS" }) === "SEMI" && ce.stageTok({ stage: "FINAL" }) === "FINAL" && ce.stageTok({ stage: "LEAGUE_STAGE" }) === "LEAGUE" && ce.stageTok({ stage: "PLAYOFF_ROUND" }) === "PLAYOFF" && ce.stageTok({ stage: "1ST_ROUND" }) === "RD1");
    check("cupelim: stageTok sportscore free-text (Round of 16, QF, 3rd place…)", ce.stageTok({ roundRaw: "Round of 16" }) === "R16" && ce.stageTok({ roundRaw: "Quarter-finals" }) === "QF" && ce.stageTok({ roundRaw: "Semi Final" }) === "SEMI" && ce.stageTok({ roundRaw: "Final" }) === "FINAL" && ce.stageTok({ roundRaw: "3rd place" }) === "THIRD" && ce.stageTok({ roundRaw: "First Round" }) === "RD1");
    check("cupelim: 'Third Round'/'3rd Round' are RD3 — never the third-place playoff", ce.stageTok({ roundRaw: "Third Round" }) === "RD3" && ce.stageTok({ roundRaw: "3rd Round" }) === "RD3");
    check("cupelim: roundRaw outranks stage; REGULAR_SEASON means no round", ce.stageTok({ roundRaw: "Round 3", stage: "REGULAR_SEASON" }) === "RD3" && ce.stageTok({ stage: "REGULAR_SEASON" }) === null && ce.stageTok({}) === null);
    // cupTieShape — the tie-shape table.
    check("cupelim: CL league phase has NO elimination semantics", ce.cupTieShape("CL", "LEAGUE") === null);
    check("cupelim: CL knockout two-leg, final single (EL/ECL playoff too)", ce.cupTieShape("CL", "R16") === "two-leg" && ce.cupTieShape("CL", "QF") === "two-leg" && ce.cupTieShape("CL", "SEMI") === "two-leg" && ce.cupTieShape("CL", "FINAL") === "single" && ce.cupTieShape("EL", "PLAYOFF") === "two-leg");
    check("cupelim: domestic cups are single-leg knockout football", ce.cupTieShape("FA_CUP", "RD3") === "single" && ce.cupTieShape("CDR", "R16") === "single" && ce.cupTieShape("DFB_POKAL", "RD2") === "single" && ce.cupTieShape("HAZFI_CUP", "RD2") === "single");
    check("cupelim: two-legged domestic semis (EFL/CDR/Coppa) vs single (FA/DFB)", ce.cupTieShape("EFL_CUP", "SEMI") === "two-leg" && ce.cupTieShape("CDR", "SEMI") === "two-leg" && ce.cupTieShape("COPPA_ITALIA", "SEMI") === "two-leg" && ce.cupTieShape("FA_CUP", "SEMI") === "single" && ce.cupTieShape("DFB_POKAL", "SEMI") === "single");
    check("cupelim: leagues / groups / third-place / qualifiers never claim", ce.cupTieShape("PL", "R16") === null && ce.cupTieShape("WC", "LEAGUE") === null && ce.cupTieShape("FA_CUP", "THIRD") === null && ce.cupTieShape("CL", "QUAL") === null);
    check("cupelim: World Cup knockouts are single-leg", ce.cupTieShape("WC", "QF") === "single" && ce.cupTieShape("WC", "FINAL") === "single" && ce.cupTieShape("WC", "PLAYOFF") === null);
    // eliminationOf — single-leg, draws, leagues, finals.
    const faCupRow = (h, a, hs, as, stage) => ({ competition: { code: "FA_CUP" }, homeTeam: { name: h }, awayTeam: { name: a }, utcDate: "2026-11-07T15:00:00Z", status: "FINISHED", stage, score: { fullTime: { home: hs, away: as } } });
    check("cupelim: single-leg FT loser is eliminated (Ipswich out)", (() => { const ev = ce.eliminationOf(faCupRow("Liverpool FC", "Ipswich Town FC", 2, 0, "3RD_ROUND"), []); return !!ev && ev.loser === "Ipswich Town FC" && ev.winner === "Liverpool FC" && ev.final === false && ev.agg === null; })());
    check("cupelim: a draw eliminates nobody (replay/ET-unknown)", ce.eliminationOf(faCupRow("Liverpool FC", "Ipswich Town FC", 1, 1, "3RD_ROUND"), []) === null);
    check("cupelim: a non-FINISHED cup match claims nothing", ce.eliminationOf(Object.assign(faCupRow("Liverpool FC", "Ipswich Town FC", 2, 0, "3RD_ROUND"), { status: "IN_PLAY" }), []) === null);
    check("cupelim: a league FINISHED match never claims", ce.eliminationOf({ competition: { code: "PL" }, homeTeam: { name: "A FC" }, awayTeam: { name: "B FC" }, utcDate: "2026-11-07T15:00:00Z", status: "FINISHED", stage: "REGULAR_SEASON", score: { fullTime: { home: 3, away: 1 } } }, []) === null);
    check("cupelim: CL league phase never claims", ce.eliminationOf({ competition: { code: "CL" }, homeTeam: { name: "A FC" }, awayTeam: { name: "B FC" }, utcDate: "2026-11-07T15:00:00Z", status: "FINISHED", stage: "LEAGUE_STAGE", score: { fullTime: { home: 3, away: 1 } } }, []) === null);
    check("cupelim: the FINAL carries the final flag (loser named)", (() => { const ev = ce.eliminationOf(faCupRow("Paris Saint-Germain", "Inter Milan", 1, 0, "FINAL"), []); return !!ev && ev.final === true && ev.loser === "Inter Milan"; })());
    // eliminationOf — the two-leg aggregate.
    const leg1 = { id: "l1", competition: { code: "CL" }, homeTeam: { name: "FC Porto" }, awayTeam: { name: "Arsenal FC" }, utcDate: "2026-02-10T20:00:00Z", status: "FINISHED", stage: "ROUND_OF_16", score: { fullTime: { home: 1, away: 1 } } };
    const leg2 = { id: "l2", competition: { code: "CL" }, homeTeam: { name: "Arsenal FC" }, awayTeam: { name: "FC Porto" }, utcDate: "2026-03-18T20:00:00Z", status: "FINISHED", stage: "ROUND_OF_16", score: { fullTime: { home: 2, away: 0 } } };
    check("cupelim: a completed two-leg tie aggregates (Porto out 1-3)", (() => { const ev = ce.eliminationOf(leg2, [leg1, leg2]); return !!ev && ev.loser === "FC Porto" && ev.winner === "Arsenal FC" && ev.agg && ev.agg.w === 3 && ev.agg.l === 1; })());
    check("cupelim: leg 1 alone claims nothing (the twin is still TIMED)", (() => { const leg2up = Object.assign({}, leg2, { status: "TIMED" }); return ce.eliminationOf(leg1, [leg1, leg2up]) === null; })());
    check("cupelim: a level aggregate stays silent (pens unknown post-slim)", (() => { const leg1x = Object.assign({}, leg1, { score: { fullTime: { home: 2, away: 0 } } }); return ce.eliminationOf(leg2, [leg1x, leg2]) === null; })());
    check("cupelim: a same-day twin is a dup row, not a leg (48h fence)", (() => { const twin = Object.assign({}, leg1, { id: "dup", utcDate: "2026-03-18T18:00:00Z" }); return ce.eliminationOf(leg2, [twin, leg2]) === null; })());
    check("cupelim: a different-stage same-pairing row is no twin", (() => { const other = Object.assign({}, leg1, { id: "qf", stage: "QUARTER_FINALS" }); return ce.eliminationOf(leg2, [other, leg2]) === null; })());
    // collectEliminations — the pairing dedupe.
    check("cupelim: collectEliminations dedupes a provider-duplicated tie", (() => { const dup = Object.assign({}, leg2, { id: "spsc-dup" }); const evs = ce.collectEliminations([leg2, dup], [leg1, leg2, dup]); return evs.length === 1 && evs[0].loser === "FC Porto"; })());
    check("cupelim: collectEliminations over a quiet league night is empty", ce.collectEliminations([rndBL1Quiet()], []).length === 0);
    function rndBL1Quiet() { return { competition: { code: "BL1" }, homeTeam: { name: "Eintracht Frankfurt" }, awayTeam: { name: "1. FC Köln" }, utcDate: "2026-10-16T18:30:00Z", status: "FINISHED", score: { fullTime: { home: 1, away: 0 } } }; }
  } else {
    check("cup-elim functions found in harness source", false);
  }
  console.log(fails ? `\n${fails} FAIL` : "\nAll night-digest checks passed");
  process.exit(fails ? 1 : 0);
})().catch((e) => {
  console.error("ERROR", e);
  process.exit(1);
});
