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

// Behavioral: nightIsOver on the REAL eval'd source (with its module-level
// DONE_STATUSES pulled from the same transformed concatenation).
const doneArr = src.match(/const DONE_STATUSES = \[[^\]]*\];/);
const nightIsOver = doneArr
  ? eval("(() => { " + untype(doneArr[0]) + "; " + untype(src.match(/function nightIsOver\([^)]*\) \{[\s\S]*?\n\}/)[0]) + "; return nightIsOver; })()")
  : null;
if (nightIsOver) {
  const now = Date.parse("2026-10-14T01:00:00Z");
  const ko = "2026-10-13T19:00:00Z";
  check("behavioral: all FINISHED → over, finished counted", JSON.stringify(nightIsOver([{ utcDate: ko, status: "FINISHED" }, { utcDate: ko, status: "FINISHED" }], now)) === JSON.stringify({ over: true, finished: 2 }));
  check("behavioral: one TIMED future-ish match blocks the night", nightIsOver([{ utcDate: ko, status: "FINISHED" }, { utcDate: "2026-10-13T22:00:00Z", status: "TIMED" }], now).over === false);
  check("behavioral: stuck IN_PLAY >4h past kickoff counts as done", nightIsOver([{ utcDate: ko, status: "IN_PLAY" }], now).over === true);
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

console.log(fails ? `\n${fails} FAIL` : "\nAll night-digest checks passed");
process.exit(fails ? 1 : 0);
