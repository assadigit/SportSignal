// check-s19-goalalert.js — v13.272-goalert (S19, the Telegram alerts track
// part 1): the per-user live GOAL alerts. The gates:
//   STATIC — the wiring (the cron-notify hook + own try/catch, the claim
//   through saveNotifiedMatch, the two-layer write-first order, the
//   snapshot store + write-only-when-changed, the cap, the cache-only card
//   law, the EITHER-side audience, zero new schedulers/providers, the
//   version triple, no red-card fabrication).
//   BEHAVIORAL — the REAL liveScoreOf / buildGoalSnapshots / diffGoalEvents
//   / goalNtype / goalFanoutVerdict / formatGoalAlert extracted from the
//   concatenated worker source, with the engine's send path and the
//   user/store seams stubbed (their own dedicated harnesses own those —
//   the check-kickoff precedent). The end-to-end seeded timeline (0-0 →
//   1-0 → 2-0 + a provider-error gap, through the REAL detectGoalEvents
//   with the mock KV/D1 + a captured transport) lives in
//   scripts/s19-goal-smoke.ts (the s17-faq-smoke/s18-content-smoke
//   pattern, run manually per the repo convention).
const fs = require("fs");
const path = require("path");
const src = require("./lib/worker-src")();

const SRC_DIR = path.join(__dirname, "..", "src");
const readSrc = (f) => fs.readFileSync(path.join(SRC_DIR, f), "utf8");

// grabFn — brace-balanced slice (the check-composers.js scanner).
function grabFn(sig) {
  const i = src.indexOf(sig);
  if (i < 0) throw new Error("missing " + sig);
  const open = src.indexOf("{", i);
  let depth = 0, j = open;
  let state = 0, tplExprDepth = 0;
  const stack = [];
  while (j < src.length) {
    const ch = src[j], next = src[j + 1] || "";
    if (state === 0) {
      if (ch === "/" && next === "/") { state = 1; j += 2; continue; }
      if (ch === "/" && next === "*") { state = 2; j += 2; continue; }
      if (ch === '"') { stack.push(0); state = 3; j++; continue; }
      if (ch === "'") { stack.push(0); state = 4; j++; continue; }
      if (ch === "`") { stack.push(0); state = 5; j++; continue; }
      if (ch === "{") depth++;
      else if (ch === "}") { depth--; if (depth === 0) break; }
      if (ch === "\\" && next === "u" && src[j + 2] === "{") {
        const end = src.indexOf("}", j + 3);
        if (end > 0) { j = end + 1; continue; }
      }
    } else if (state === 1) { if (ch === "\n") state = 0; }
    else if (state === 2) { if (ch === "*" && next === "/") { state = 0; j += 2; continue; } }
    else if (state === 3) { if (ch === "\\") { j += 2; continue; } if (ch === '"') state = stack.pop(); }
    else if (state === 4) { if (ch === "\\") { j += 2; continue; } if (ch === "'") state = stack.pop(); }
    else if (state === 5) {
      if (ch === "\\") { j += 2; continue; }
      if (ch === "`") { state = stack.pop(); continue; }
      if (ch === "$" && next === "{") { state = 6; tplExprDepth = 1; j += 2; continue; }
    } else if (state === 6) {
      if (ch === "{") tplExprDepth++;
      else if (ch === "}") { tplExprDepth--; if (tplExprDepth === 0) state = 5; }
      else if (ch === '"') { stack.push(6); state = 3; }
      else if (ch === "'") { stack.push(6); state = 4; }
      else if (ch === "`") { stack.push(6); state = 5; }
      else if (ch === "\\") j++;
    }
    j++;
  }
  return src.slice(i, j + 1);
}

let failed = 0;
const check = (name, cond) => {
  console.log((cond ? "OK   " : "FAIL ") + name);
  if (!cond) failed++;
};

// ============================================================================
// LAYER 1 — STATIC WIRING
// ============================================================================
const cronNotifySrc = readSrc("cron-notify.ts");
const goalSrc = readSrc("goal-alert.ts");
const cfgSrc = readSrc("config.ts");
const engineSrc = readSrc("notify-engine.ts");
const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "package.json"), "utf8"));
const wranglerSrc = fs.readFileSync(path.join(__dirname, "..", "wrangler.toml"), "utf8");
const workerOrderSrc = fs.readFileSync(path.join(__dirname, "..", "scripts", "lib", "worker-src.js"), "utf8");

check("cron-notify wires detectGoalEvents AFTER detectStatusChanges + BEFORE sendMatchNotifications, with its own try/catch (a goal failure must never touch the sweep)",
  cronNotifySrc.indexOf("await detectStatusChanges(env, matches);") >= 0 &&
  cronNotifySrc.indexOf("detectGoalEvents(env, matches)") > cronNotifySrc.indexOf("await detectStatusChanges(env, matches);") &&
  cronNotifySrc.indexOf("sendMatchNotifications(env, matches)") > cronNotifySrc.indexOf("detectGoalEvents(env, matches)") &&
  /try \{\s*\n\s*const ga = await detectGoalEvents\(env, matches\);/.test(cronNotifySrc));
check("the per-goal claim rides saveNotifiedMatch verbatim (the notified_v1 PK extension — INSERT OR IGNORE, changes>0 ⟺ newly claimed, D1 failure ⟺ defer)",
  /saveNotifiedMatch\(env, ev\.match, ntype, notifiedMatches\)/.test(goalSrc));
check("the claim key is the score tuple AFTER the goal (goal:<h>-<a>): a 2-1 then 3-1 match alerts twice, a re-sweep of the same 3-1 alerts zero times",
  /function goalNtype\(h, a\) \{\s*\n\s*return "goal:" \+ h \+ "-" \+ a;/.test(goalSrc));
check("TWO-LAYER WRITE-FIRST: the claim persists BEFORE any send (a failed claim defers, no send, baseline NOT advanced)",
  goalSrc.indexOf("const claimed = await saveNotifiedMatch") >= 0 &&
  goalSrc.indexOf("const claimed = await saveNotifiedMatch") < goalSrc.indexOf("sendPhotoBinary(scopedEnv") &&
  /if \(!claimed\) \{ out\.deferred\+\+; out\.events--; continue; \}/.test(goalSrc));
check("TWO-LAYER WRITE-FIRST: the snapshot advances ONLY processed rows (a budget-deferred or claim-failed event keeps the OLD baseline so the delta recomputes)",
  /if \(ev && !done\.has\(k\) && prev\[k\]\) \{ finalMap\[k\] = prev\[k\]; continue; \}/.test(goalSrc) &&
  /function keepBaselines\(cur, prev, events\)/.test(goalSrc));
check("the snapshot store is ONE compact KV key, write-only-when-changed (the match_status_v1 discipline), TTL 2 days",
  /KV_GOAL_SNAPSHOTS: "goal_snapshots_v1",/.test(cfgSrc) &&
  /curJson === JSON\.stringify\(prev \|\| \{\}\)/.test(goalSrc) &&
  /expirationTtl: 2 \* 86400/.test(goalSrc));
check("MISSING-IS-NOT-ZERO: no real score (fullTime null / a null side) → no snapshot row, no event — never a fake 0-0",
  /if \(!ft \|\| ft\.home == null \|\| ft\.away == null\) return null;/.test(goalSrc));
check("FIRST SIGHTING SEEDS, NEVER FIRES (an outage-recovered 2-0 is not 2 goal events)",
  /if \(!p\) continue; \/\/ first sighting: seed only, never fire/.test(goalSrc));
check("BACKWARD movement (a provider correction) advances the baseline silently — no fabricated event",
  /if \(dh <= 0 && da <= 0\) continue; \/\/ correction: advance silently/.test(goalSrc));
check("FAIL-CLOSED provider gap: a live match with a missing score RETAINS the prev row (the next good sweep computes the delta from the last-known score — no burst)",
  /else if \(prev && prev\[key\]\) cur\[key\] = prev\[key\]; \/\/ provider gap: retain/.test(goalSrc) &&
  /if \(isFinite\(ko\) && ko >= nowMs - GOAL_WIN_BACK_MS && ko <= nowMs \+ GOAL_WIN_FWD_MS\) cur\[k\] = row;/.test(goalSrc));
check("the per-tick unit cap bounds the Saturday-slate burst (deferred units ride the next tick with the baseline retained)",
  /GOAL_ALERT_MAX_UNITS: 6,/.test(cfgSrc) &&
  /out\.events >= \(CONFIG\.GOAL_ALERT_MAX_UNITS \|\| 6\)/.test(goalSrc));
check("the fan-out reservation runs BEFORE any claim (defer = clean, unclaimed, retried next tick)",
  goalSrc.indexOf("const verdict = goalFanoutVerdict(chatGroups);") >= 0 &&
  goalSrc.indexOf("const verdict = goalFanoutVerdict(chatGroups);") < goalSrc.indexOf("const claimed = await saveNotifiedMatch"));
check("the card is CACHE-ONLY on the goal path (the v13.94.1 CPU-keeper law — a goal burst must never resvg-render; text fallback per chat)",
  /cachedCardPng\(scopedEnv, ev\.match, lang\)/.test(goalSrc) &&
  !/renderCardPngCached/.test(goalSrc));
check("the audience is the EXISTING team follows — a goal fans out to chats following EITHER side (userFollowsMatch one/both)",
  /userFollowsMatch\(prefs, c, ev\.match\) !== null/.test(goalSrc) &&
  /userFollowsMatch\(prefs, c, ev\.match\)\.length/.test(goalSrc) === false);
check("the delivery ledger + dead-chat pruning ride the engine's own discipline (recordDeliveries + pruneChats)",
  /recordDeliveries\(env, ev\.match, ntype, deliveries\)/.test(goalSrc) &&
  /pruneChats\(env, keep\)/.test(goalSrc));
check("NO red-card fabrication: the composer emits goals ONLY from score deltas — no card/incident vocabulary, no invented scorer names or minutes",
  (() => {
    const composer = grabFn("function formatGoalAlert(match, lang, ev)");
    return !/red.?card|كارت قرمز|کارت قرمز|scorer|minute \d|\u062F\u0642\u06CC\u0642\u0647/.test(composer);
  })());
check("ZERO new schedulers/providers: the crons stay */10 + the 27 */4 far-cup probe; the module fetches NOTHING",
  /crons = \["\*\/10 \* \* \* \*", "27 \*\/4 \* \* \*"\]/.test(wranglerSrc) &&
  !/fetch\(/.test(goalSrc));
check("the version triple: src/config.ts 13.272.0-goalert + package.json 13.272.0.0",
  /export const VERSION = "13\.272\.0-goalert";/.test(cfgSrc) &&
  pkg.version === "13.272.0.0");
check("the eval-harness bundle order carries goal-alert.ts (the harness co-evolves in the SAME commit)",
  /"goal-alert\.ts",/.test(workerOrderSrc));
check("the notify-engine's existing types are UNTOUCHED (kickoff/result zero-regression: the same NOTIFICATION_CONFIGS table + reservation call)",
  /fanoutReservation\(config, chatGroups, channelActive\(env\)\)/.test(engineSrc) &&
  /type: "match-start",/.test(engineSrc) &&
  /type: "result",/.test(engineSrc));

// ============================================================================
// LAYER 2 — BEHAVIORAL (real functions, stubbed seams — the check-kickoff
// pattern; the send path + the user/store seams are owned by their own
// dedicated harnesses)
// ============================================================================
const NOW = Date.parse("2026-11-21T15:00:00Z"); // a Saturday 3pm slate moment
var STUB_USED = 0; // the controllable subrequest meter
function subrequestCount() { return STUB_USED; }
function kvOpsCount() { return 0; }
const CONFIG = { SUBREQUEST_FANOUT_CAP: 46, GOAL_ALERT_MAX_UNITS: 6 };
// the matchKey STUB mirrors the real shape (the check-kickoff precedent —
// identity stability is what the layer needs, not the normalizer itself)
function matchKey(m) {
  return String(m.homeTeam.name).toLowerCase().replace(/\s+/g, "") + "|" +
    String(m.awayTeam.name).toLowerCase().replace(/\s+/g, "") + "|" +
    String(m.utcDate || "").slice(0, 16);
}
// translation stubs (check-fa-dict/check-fasync/check-composers own the real
// dicts; the composer tests need deterministic names only)
function translateTeam(n) { return n === "FC Barcelona" ? "\u0628\u0627\u0631\u0633\u0644\u0648\u0646\u0627" : n === "Real Madrid CF" ? "\u0631\u0626\u0627\u0644 \u0645\u0627\u062F\u0631\u06CC\u062F" : n; }
function translateCompetition(code) { return code === "PL" ? "\u0644\u06CC\u06AF \u0628\u0631\u062A\u0631 \u0627\u0646\u06AF\u0644\u06CC\u0633" : code; }
const COMP_EN = { PL: "Premier League" };

// the window constants (the real module's own values — mirrored for the eval
// slice; the static layer pins the 6h/4h law via the source)
const GOAL_WIN_BACK_MS = 6 * 36e5;
const GOAL_WIN_FWD_MS = 4 * 36e5;
// the md module's escape table (its own top-level vars — sliced verbatim so
// the grabbed builders close over the REAL regex, never a re-implementation)
function grabMdVars() {
  const i = src.indexOf("var MDV2_RESERVED");
  const j = src.indexOf(";", src.indexOf("MDV2_ESCAPE_RE")) + 1;
  return src.slice(i, j);
}
eval([
  grabMdVars(),
  grabFn("function toFaDigits(str)"),
  grabFn("function mdEscape(text)"),
  grabFn("function mdBold(text)"),
  grabFn("function mdItalic(text)"),
  grabFn("function isLiveStatus(status)"),
  grabFn("function koMsOf(match)"),
  grabFn("function liveScoreOf(match)"),
  grabFn("function buildGoalSnapshots(matches, prev, nowMs)"),
  grabFn("function diffGoalEvents(cur, prev, matchOfKey)"),
  grabFn("function goalNtype(h, a)"),
  grabFn("function goalFanoutVerdict(chatGroups)"),
  grabFn("function formatGoalAlert(match, lang, ev)")
].join("\n"));

// --- liveScoreOf: the MISSING-IS-NOT-ZERO law ---
check("liveScoreOf: a null score → null (no fake 0-0, ever)", liveScoreOf({ score: null }) === null);
check("liveScoreOf: fullTime present but a null side → null", liveScoreOf({ score: { fullTime: { home: 1, away: null } } }) === null);
check("liveScoreOf: a REAL 0-0 → {h:0, a:0} (legitimately unchanged, not missing)", JSON.stringify(liveScoreOf({ score: { fullTime: { home: 0, away: 0 } } })) === '{"h":0,"a":0}');
check("liveScoreOf: a real 2-1 → {h:2, a:1}", liveScoreOf({ score: { fullTime: { home: 2, away: 1 } } }).h === 2);
check("liveScoreOf: negative / non-integer garbage → null (never a fabricated state)", liveScoreOf({ score: { fullTime: { home: -1, away: 0 } } }) === null && liveScoreOf({ score: { fullTime: { home: 1.5, away: 0 } } }) === null);

// --- buildGoalSnapshots: the window + status + retention laws ---
const at = (min) => new Date(NOW + min * 6e4).toISOString();
const mk = (home, away, ko, status, h, a) => ({
  competition: { code: "PL" },
  homeTeam: { name: home, crest: null }, awayTeam: { name: away, crest: null },
  utcDate: ko, status,
  score: h == null ? null : { fullTime: { home: h, away: a } }
});
const KO = at(-30); // kicked off 30min ago
const mLive = mk("FC Barcelona", "Real Madrid CF", KO, "IN_PLAY", 1, 0);
const kLive = matchKey(mLive);
check("snapshots: a live match with a real score gets a row", (() => {
  const cur = buildGoalSnapshots([mLive], null, NOW);
  return cur[kLive] && cur[kLive].h === 1 && cur[kLive].a === 0;
})());
check("snapshots: a SCHEDULED match with a (bogus) 0-0 score gets NO row (the pre-kickoff sportscore trap is dead at this layer too)",
  buildGoalSnapshots([mk("A FC", "B FC", at(30), "SCHEDULED", 0, 0)], null, NOW)[matchKey(mk("A FC", "B FC", at(30), "SCHEDULED", 0, 0))] === undefined);
check("snapshots: a FINISHED match gets no row (events fire from live rows only — the FT push is the engine's own job)",
  buildGoalSnapshots([mk("A FC", "B FC", KO, "FINISHED", 2, 0)], null, NOW)[matchKey(mk("A FC", "B FC", KO, "FINISHED", 2, 0))] === undefined);
check("snapshots: a live match whose score went MISSING retains the prev row (fail-closed: the baseline survives the provider gap)",
  (() => {
    const prev = {}; prev[kLive] = { h: 1, a: 0, d: KO };
    const cur = buildGoalSnapshots([mk("FC Barcelona", "Real Madrid CF", KO, "IN_PLAY", null, null)], prev, NOW);
    return cur[kLive] && cur[kLive].h === 1;
  })());
check("snapshots: a match ABSENT from the sweep entirely keeps its in-window prev row (a total provider failure returns the stale pool)",
  (() => {
    const prev = {}; prev[kLive] = { h: 1, a: 0, d: KO };
    const cur = buildGoalSnapshots([], prev, NOW);
    return cur[kLive] && cur[kLive].h === 1;
  })());
check("snapshots: an out-of-window prev row ages out (kickoff > 6h past)",
  (() => {
    const old = mk("A FC", "B FC", at(-7 * 60), "IN_PLAY", 1, 0);
    const prev = {}; prev[matchKey(old)] = { h: 1, a: 0, d: old.utcDate };
    return buildGoalSnapshots([], prev, NOW)[matchKey(old)] === undefined;
  })());
check("snapshots: a future kickoff beyond +4h gets no row (the pre-arm stays tight)",
  (() => {
    const m = mk("A FC", "B FC", at(5 * 60), "IN_PLAY", 0, 0);
    return buildGoalSnapshots([m], null, NOW)[matchKey(m)] === undefined;
  })());

// --- diffGoalEvents: the delta law ---
const of = (m) => (k) => k === matchKey(m) ? m : null;
check("delta: FIRST SIGHTING produces no event (seed only)", (() => {
  const cur = {}; cur[kLive] = { h: 1, a: 0, d: KO };
  return diffGoalEvents(cur, {}, of(mLive)).length === 0;
})());
check("delta: an unchanged score produces no event", (() => {
  const cur = {}; cur[kLive] = { h: 1, a: 0, d: KO };
  const prev = {}; prev[kLive] = { h: 1, a: 0, d: KO };
  return diffGoalEvents(cur, prev, of(mLive)).length === 0;
})());
check("delta: 1-0 → 2-0 is a HOME event with the tuple AFTER the goal", (() => {
  const cur = {}; cur[kLive] = { h: 2, a: 0, d: KO };
  const prev = {}; prev[kLive] = { h: 1, a: 0, d: KO };
  const ev = diffGoalEvents(cur, prev, of(mLive));
  return ev.length === 1 && ev[0].side === "home" && ev[0].goals === 1 && ev[0].h === 2 && ev[0].a === 0;
})());
check("delta: 1-0 → 1-1 is an AWAY event", (() => {
  const cur = {}; cur[kLive] = { h: 1, a: 1, d: KO };
  const prev = {}; prev[kLive] = { h: 1, a: 0, d: KO };
  const ev = diffGoalEvents(cur, prev, of(mLive));
  return ev.length === 1 && ev[0].side === "away" && ev[0].goals === 1;
})());
check("delta: 0-0 → 1-1 in one tick is ONE BOTH event (the order is not in the data — never invented)", (() => {
  const cur = {}; cur[kLive] = { h: 1, a: 1, d: KO };
  const prev = {}; prev[kLive] = { h: 0, a: 0, d: KO };
  const ev = diffGoalEvents(cur, prev, of(mLive));
  return ev.length === 1 && ev[0].side === "both" && ev[0].goals === 2;
})());
check("delta: 0-0 → 2-0 in one tick is one home event counting TWO goals", (() => {
  const cur = {}; cur[kLive] = { h: 2, a: 0, d: KO };
  const prev = {}; prev[kLive] = { h: 0, a: 0, d: KO };
  const ev = diffGoalEvents(cur, prev, of(mLive));
  return ev.length === 1 && ev[0].goals === 2;
})());
check("delta: a BACKWARD correction (2-0 → 1-0) produces no event", (() => {
  const cur = {}; cur[kLive] = { h: 1, a: 0, d: KO };
  const prev = {}; prev[kLive] = { h: 2, a: 0, d: KO };
  return diffGoalEvents(cur, prev, of(mLive)).length === 0;
})());

// --- goalNtype: the per-goal claim key ---
check("claim key: goalNtype(3,1) is 'goal:3-1' — unique per real score state", goalNtype(3, 1) === "goal:3-1");
check("claim key: the 2-1→3-1 double-alert contract (distinct tuples) + the re-sweep zero contract (same tuple)",
  goalNtype(2, 1) !== goalNtype(3, 1) && goalNtype(3, 1) === goalNtype(3, 1));

// --- goalFanoutVerdict: the reservation boundaries ---
check("reservation: full at low usage (cards + text)", (() => { STUB_USED = 0; return goalFanoutVerdict([{ chats: [1, 2, 3] }]) === "full"; })());
check("reservation: lean when only the text cost fits (the text IS the payload)",
  (() => { STUB_USED = 46 - 3 - 2; return goalFanoutVerdict([{ chats: [1, 2] }]) === "lean"; })());
check("reservation: defer past the cap (clean: unclaimed, baseline retained, retried next tick)",
  (() => { STUB_USED = 44; return goalFanoutVerdict([{ chats: [1, 2, 3] }]) === "defer"; })());

// --- formatGoalAlert: the Persian-first composition ---
const evHome = { side: "home", goals: 1, h: 2, a: 0, ph: 1, pa: 0 };
const fa = formatGoalAlert(mLive, "fa", evHome);
check("composer fa: the «گُل!» headline through mdBold (MarkdownV2-safe by construction)",
  fa.indexOf("\u26BD\uFE0F *\u06AF\u064F\u0644\\!") === 0);
check("composer fa: the teams line + the competition label (بارسلونا 🆚 رئال مادرید + لیگ برتر انگلیس italic)",
  fa.indexOf("*\u0628\u0627\u0631\u0633\u0644\u0648\u0646\u0627* \u{1F19A} *\u0631\u0626\u0627\u0644 \u0645\u0627\u062F\u0631\u06CC\u062F*") >= 0 &&
  fa.indexOf("_\u0644\u06CC\u06AF \u0628\u0631\u062A\u0631 \u0627\u0646\u06AF\u0644\u06CC\u0633_") >= 0);
check("composer fa: the score line in Persian digits with the escaped hyphen (نتیجه: *۲\\-۰*)",
  fa.indexOf("\u0646\u062A\u06CC\u062C\u0647: *") >= 0 && fa.indexOf("*\u06F2\\-\u06F0*") >= 0);
check("composer fa: the score-side attribution «گلِ بارسلونا» (composed from the delta — never an invented scorer)",
  fa.indexOf("\u2734\uFE0F \u06AF\u0644\u0650 \u0628\u0627\u0631\u0633\u0644\u0648\u0646\u0627") >= 0);
check("composer fa: the multi-goal variant «۲ گل برای X» (a +2 tick counts honestly)",
  formatGoalAlert(mLive, "fa", { side: "home", goals: 2, h: 3, a: 0, ph: 1, pa: 0 }).indexOf("\u2734\uFE0F \u06F2 \u06AF\u0644 \u0628\u0631\u0627\u06CC \u0628\u0627\u0631\u0633\u0644\u0648\u0646\u0627") >= 0);
check("composer fa: the both-sides variant credits both WITHOUT inventing an order (گلِ X و گلِ Y)",
  formatGoalAlert(mLive, "fa", { side: "both", goals: 2, h: 1, a: 1, ph: 0, pa: 0 }).indexOf("\u06AF\u0644\u0650 \u0628\u0627\u0631\u0633\u0644\u0648\u0646\u0627 \u0648 \u06AF\u0644\u0650 \u0631\u0626\u0627\u0644 \u0645\u0627\u062F\u0631\u06CC\u062F") >= 0);
check("composer en: the GOAL! twin + the English attribution",
  (() => {
    const en = formatGoalAlert(mLive, "en", evHome);
    return en.indexOf("*GOAL\\!") >= 0 && en.indexOf("Barcelona scores") >= 0 && en.indexOf("Score: *2\\-0*") >= 0;
  })());
check("composer: NO minute / scorer-name fabrication anywhere (the sweep carries neither)",
  !/\u062F\u0642\u06CC\u0642\u0647|minute|Lewandowski|Messi/.test(fa) && !/\u062F\u0642\u06CC\u0642\u0647|minute/.test(formatGoalAlert(mLive, "en", evHome)));

// ============================================================================
if (failed) {
  console.error("\ncheck-s19-goalalert: " + failed + " gate(s) FAILED");
  process.exit(1);
}
console.log("\ncheck-s19-goalalert: all gates passed (S19: the live goal-alert layer — delta detection from REAL scores, the MISSING-IS-NOT-ZERO law, first-sighting seeding, fail-closed provider gaps + re-sweeps, the per-tuple D1 claim idempotency, the EITHER-side team-follow fan-out, the cache-only card law, the per-tick burst cap, zero new schedulers/providers, no red-card fabrication)");
