// check-scheduler.js — v13.118-fixsched: the fixture-aware scheduler + the
// stale-live guards (the 4 AM screenshot bug — matches rendered "playing"
// 6-7h after they finished). Two layers, the check-kickoff.js convention:
//   STATIC — the wiring: cron-pool obeys the mode's sweep interval + live
//   sweep cadence; zombies never re-arm sweeps; the feed-fail marker arms
//   DEGRADED (a failed sweep ≠ an empty schedule); the pool write reconciles
//   stale-live rows after the confirmation grace; the overlay write HEALS
//   them; the serve path (pubMatch + applyLiveOverlay + fetchPublicMatches)
//   downgrades implausible live rows with the last-known score; the payload
//   carries pollHint; the client polls adaptively; healthz surfaces the
//   verdict; the CONFIG literals the grabbed guards carry are pinned to the
//   CONFIG keys (no drift).
//   BEHAVIORAL — the REAL scheduler functions (computeFixtureSignal /
//   decideActivity / reconcileStaleLive / bakuFallbackOpen /
//   liveSweepSlotOpen), the REAL applyLiveOverlay, the REAL cacheMatches
//   pool reconciliation and the REAL pubMatch stale-live guard, with
//   deterministic nowMs clocks — the task's 16 required scenarios:
//    1  no relevant fixtures → IDLE
//    2  upcoming match → next activation computed
//    3  pre-match window activates at the expected time
//    4  confirmed live → live-update operations enabled
//    5  simultaneous matches → ONE decision (no per-match workers)
//    6  confirmed FT stops live polling
//    7  ET / delayed final status → no premature deactivation
//    8  rescheduled / postponed matches → recalculation
//    9  API failure ≠ empty schedule (DEGRADED, never IDLE-from-failure)
//    10 European DST transitions never shift a fixture's instant
//    11 Baku time consistent across the year (UTC+4 fixed)
//    12 matches just before/after midnight handled (window wraps)
//    13 valid fixtures OUTSIDE the 13:00–02:00 fallback still processed
//    14 restart reconstructs the correct state (pure, KV-derived)
//    15 concurrent frontend requests → no duplicated upstream calls
//    16 website + APIs stay functional during IDLE
const fs = require("fs");
const path = require("path");
const src = require("./lib/worker-src")();
const { canonDedupe } = require("../src/dedupe.ts");

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
      if (ch === "`") { state = stack.pop(); j++; continue; }
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

// grabVar — var X = …; slice (the transformed CONFIG is a plain var).
function grabVar(name) {
  const i = src.indexOf("var " + name + " =");
  if (i < 0) throw new Error("missing var " + name);
  // brace-balanced scan (CONFIG carries nested object literals)
  const eq = src.indexOf("=", i);
  let depth = 0, j = eq;
  let state = 0;
  const stack = [];
  while (j < src.length) {
    const ch = src[j], next = src[j + 1] || "";
    if (state === 0) {
      if (ch === '"' || ch === "'" || ch === "`") { stack.push(0); state = ch === '"' ? 3 : ch === "'" ? 4 : 5; j++; continue; }
      if (ch === "{") depth++;
      else if (ch === "}") depth--;
      else if (ch === ";" && depth === 0) break;
    } else if (state === 3) { if (ch === "\\") { j += 2; continue; } if (ch === '"') state = stack.pop(); }
    else if (state === 4) { if (ch === "\\") { j += 2; continue; } if (ch === "'") state = stack.pop(); }
    else if (state === 5) { if (ch === "\\") { j += 2; continue; } if (ch === "`") state = stack.pop(); }
    j++;
  }
  return src.slice(i, j + 1);
}

// v13.118-fixsched: the teams.ts normalizeTeamName carries TS annotations a
// narrow grab cannot eval — the check-no-miss.js convention stubs it (identity
// lowercase-fold is enough for the byPair key math under test).
function normalizeTeamName(n) { return String(n || "").toLowerCase().replace(/[^a-z0-9]/g, ""); }

let failed = 0;
const check = (name, cond) => {
  console.log((cond ? "OK   " : "FAIL ") + name);
  if (!cond) failed++;
};

// ============================================================================
// LAYER 1 — STATIC WIRING
// ============================================================================
const schedSrc = readSrc("scheduler.ts");
const poolSrc = readSrc("cron-pool.ts");
const cronSrc = readSrc("cron.ts");
const cfgSrc = readSrc("config.ts");
const pmSrc = readSrc("public-matches.ts");
const swrSrc = readSrc("public-swr.ts");
const cpubSrc = readSrc("cron-public.ts");
const mpoolSrc = readSrc("match-pool.ts");
const provSrc = readSrc("providers.ts");
const apiSrc = readSrc("api.ts");
const wsSrc = fs.readFileSync(path.join(__dirname, "lib", "worker-src.js"), "utf8");
const pubJs = fs.readFileSync(path.join(__dirname, "..", "assets", "public-13.30.js"), "utf8");
const pubPage = readSrc(path.join("pages", "public.ts"));
const headersSrc = fs.readFileSync(path.join(__dirname, "..", "assets", "_headers"), "utf8");

check("scheduler.ts exists with the six-mode vocabulary (A–E + DEGRADED)",
  schedSrc.indexOf('"IDLE"') >= 0 && schedSrc.indexOf('"UPCOMING"') >= 0 && schedSrc.indexOf('"PRE_MATCH"') >= 0 && schedSrc.indexOf('"LIVE"') >= 0 && schedSrc.indexOf('"POST_MATCH"') >= 0 && schedSrc.indexOf('"DEGRADED"') >= 0);
check("config.ts pins the scheduler tunables (span/grace/soon/horizon/idle/degraded/feed-fail/Baku)",
  /SCHED_MAX_LIVE_SPAN_MS: 195 \* 60 \* 1e3/.test(cfgSrc) && /SCHED_CONFIRM_GRACE_MS: 45 \* 60 \* 1e3/.test(cfgSrc) && /SCHED_UPCOMING_SOON_MS: 6 \* 60 \* 60 \* 1e3/.test(cfgSrc) && /SCHED_IDLE_HORIZON_MS: 48 \* 60 \* 60 \* 1e3/.test(cfgSrc) && /SCHED_IDLE_DISCOVERY_MS: 6 \* 60 \* 60 \* 1e3/.test(cfgSrc) && /SCHED_DEGRADED_IN_MS: 2 \* 60 \* 60 \* 1e3/.test(cfgSrc) && /SCHED_DEGRADED_OUT_MS: 4 \* 60 \* 60 \* 1e3/.test(cfgSrc) && /SCHED_FEED_FAIL_MS: 12 \* 60 \* 60 \* 1e3/.test(cfgSrc) && /BAKU_WINDOW_OPEN_MIN: 13 \* 60/.test(cfgSrc) && /BAKU_WINDOW_CLOSE_MIN: 2 \* 60/.test(cfgSrc) && /KV_FEED_FAIL: "feed_fail_v1"/.test(cfgSrc));
check("the grabbed guards' literal spans are pinned to CONFIG (no drift: pubMatch + applyLiveOverlay carry 195*6e4)",
  /Date\.now\(\) - koMs > 195 \* 6e4/.test(pmSrc) && /staleSpanMs = 195 \* 6e4/.test(pmSrc) && /195\s*\*\s*6e4/.test(pubJs));
check("cron-pool computes the fixture signal over the CONSOLIDATED tier (shouldReport — selection unchanged)",
  /cachedPool\.filter\(\(m\) => shouldReport\(m\)\)/.test(poolSrc) && !/import \{ shouldNotify/.test(poolSrc));
check("cron-pool arms the sweepFresh gate from the MODE's interval (IDLE stretches, active keeps 2h)",
  /NOW - lastSweep < act\.sweepIntervalMs/.test(poolSrc) && /computeFixtureSignal\(relevantPool, NOW\)/.test(poolSrc) && /decideActivity\(signal, \{ nowMs: NOW, feedOk \}\)/.test(poolSrc));
check("cron-pool keeps the #cpu1 throttle shape (sweepFresh-first, live-sweep call, quiet reuse, full-sweep adjacency)",
  /if \(sweepFresh && cachedPool\.length\) \{/.test(poolSrc) && /matches = await fetchLiveSweep\(env, cachedPool\);/.test(poolSrc) && /Quiet period \\u2014 reusing KV pool/.test(poolSrc) && /fullSweepThisTick = true;/.test(poolSrc));
check("live sweeps obey the mode cadence (tick for LIVE/PRE/POST, ~20min slot for the 6h tier, never in IDLE)",
  /act\.liveSweep === "tick" \|\| \(act\.liveSweep === "slot" && liveSweepSlotOpen\(NOW\)\)/.test(poolSrc));
check("the feed-fail marker read is skipped when the pool proves upcoming fixtures (trusted-calendar fast path)",
  /KV_FEED_FAIL/.test(poolSrc) && /SCHED_FEED_FAIL_MS/.test(poolSrc));
check("providers.ts writes feed_fail_v1 on the all-empty sweep and clears it on success (failure ≠ empty schedule)",
  /KV_FEED_FAIL, String\(Date\.now\(\)\)/.test(provSrc) && /SCHED_FEED_FAIL_MS/.test(provSrc) && /env\.STATE\.delete\(CONFIG\.KV_FEED_FAIL\)/.test(provSrc));
check("match-pool reconciles stale-live rows at the write point (span + confirmation grace)",
  /SCHED_MAX_LIVE_SPAN_MS.*SCHED_CONFIRM_GRACE_MS/.test(mpoolSrc) && /Pool reconcile/.test(mpoolSrc));
check("cron-public.ts HEALS stale-live rows in the overlay write (st → FINISHED)",
  /staleLive \? "FINISHED" : rawSt/.test(cpubSrc) && /SCHED_MAX_LIVE_SPAN_MS/.test(cpubSrc));
check("pubMatch carries the stale-live guard (status FINISHED, minute nulled, last-known score kept)",
  /staleLive \? "FINISHED" : m\.status/.test(pmSrc) && /!staleLive && isLiveStatus\(m\.status\) && m\.minute != null/.test(pmSrc));
check("applyLiveOverlay sanitizes implausible live rows on EVERY serve + heals stale overlay rows",
  /const staleLiveRow = \(m\) =>/.test(pmSrc) && /st: "FINISHED", min: null/.test(pmSrc) && /if \(staleLiveRow\(m\)\)/.test(pmSrc));
check("fetchPublicMatches reconciles the pool before shaping + carries pollHint/schedMode (section 7)",
  /reconcileStaleLive\(matches, now\)/.test(pmSrc) && /pollHint: pollHintSec/.test(pmSrc) && /schedMode \};/.test(pmSrc) || (/pollHint: pollHintSec/.test(pmSrc) && /schedMode/.test(pmSrc) && /reconcileStaleLive\(matches, now\)/.test(pmSrc)));
check("public-swr degraded payload carries a bounded pollHint (never a 60s hammer on failure)",
  /degraded: true, pollHint: 300/.test(swrSrc));
check("cron.ts folds the sched verdict into the completion blob + logs mode transitions",
  /sched: schedBlob/.test(cronSrc) && /prevMode !== sched\.mode/.test(cronSrc) && /Scheduler: /.test(cronSrc));
check("healthz surfaces the scheduler verdict (mode/reason/live-sweep/next-ko/next-wake/feed)",
  /sched_mode:/.test(apiSrc) && /sched_reason:/.test(apiSrc) && /sched_next_ko:/.test(apiSrc) && /sched_next_wake:/.test(apiSrc) && /sched_feed_ok:/.test(apiSrc));
check("worker-src concat carries scheduler.ts (the harness order)",
  /"scheduler\.ts",/.test(wsSrc));
check("the client polls adaptively (5s master tick + pollHint; no fixed 60s hammer; local stale-live guard)",
  pubJs.indexOf("setInterval(__pollTick,5e3)") >= 0 && pubJs.indexOf("setInterval(load,6e4)") < 0 && pubJs.indexOf("__pollHintSec") >= 0 && pubJs.indexOf("__sanitizeData") >= 0);
check("the public page + _headers reference the bumped asset (cache-bust: 13.29 → 13.30, v13.122-heroart)",
  /public-13\.30\.js/.test(pubPage) && /public-13\.30\.js/.test(headersSrc));
check("scenario 16 (IDLE keeps the site alive): the quiet branch serves the KV pool and the shell never early-returns on IDLE",
  /matches = cachedPool;/.test(poolSrc) && !/if \(act\.mode === "IDLE"\) return;/.test(poolSrc));
check("scenario 15 (no duplicated upstream calls): the SWR refresh lock + edge-cache layer stay intact",
  /pub_refresh_lock/.test(pmSrc) && /caches\.default/.test(swrSrc) && /cacheApi\.match\(req\)/.test(swrSrc));

// ============================================================================
// LAYER 2 — BEHAVIORAL (deterministic clocks; the REAL functions)
// ============================================================================
// The scheduler functions + the REAL CONFIG (grabbed var) in one eval.
eval(grabFn("var CONFIG") + ";\n" +
  grabFn("function schedCfg(key, def)") + "\n" +
  grabFn("function kickoffMsOf(m)") + "\n" +
  grabFn("function staleLiveAgeMs(m, nowMs)") + "\n" +
  grabFn("function reconcileStaleLive(rows, nowMs, spanMs)") + "\n" +
  grabFn("function bakuMinuteOfDay(nowMs)") + "\n" +
  grabFn("function bakuFallbackOpen(nowMs, openMin, closeMin)") + "\n" +
  grabFn("function computeFixtureSignal(rows, nowMs, opts)") + "\n" +
  grabFn("function decideActivity(sig, ctx)") + "\n" +
  grabFn("function liveSweepSlotOpen(nowMs)"));

const MIN = 6e4, H = 36e5, D = 864e5;
// A fixed reference instant: 2026-10-21T18:00:00Z (a Wednesday 22:00 Baku —
// inside the fallback window; DST-safe winter date).
const NOW = Date.parse("2026-10-21T18:00:00.000Z");
const ko = (offsetMs) => new Date(NOW + offsetMs).toISOString();
const row = (offsetMs, status, extra) => Object.assign({ id: "m" + offsetMs + status, homeTeam: { name: "A" }, awayTeam: { name: "B" }, competition: { code: "PL" }, utcDate: ko(offsetMs), status }, extra || {});

console.log("\n=== scenario 1: no relevant fixtures → IDLE ===");
{
  const sig = computeFixtureSignal([], NOW);
  const act = decideActivity(sig, { nowMs: NOW, feedOk: true });
  check("1a. empty calendar + trusted feed → IDLE", act.mode === "IDLE");
  check("1b. IDLE stretches fixture discovery to 6h (was 2h around the clock)", act.sweepIntervalMs === 6 * H);
  check("1c. IDLE stops live sweeps entirely", act.liveSweep === "none");
  check("1d. IDLE slows the client poll hint to 15min", act.pollHintSec === 900);
  const sigPast = computeFixtureSignal([row(-5 * D, "FINISHED"), row(-10 * D, "FINISHED")], NOW);
  const actPast = decideActivity(sigPast, { nowMs: NOW, feedOk: true });
  check("1e. only long-settled history → still IDLE (no nextKo)", actPast.mode === "IDLE" && actPast.nextKoMs == null);
  const farSig = computeFixtureSignal([row(6 * D, "SCHEDULED")], NOW);
  check("1f. next fixture beyond the 48h idle horizon → IDLE (beyond-horizon reason)", decideActivity(farSig, { nowMs: NOW, feedOk: true }).mode === "IDLE" && decideActivity(farSig, { nowMs: NOW, feedOk: true }).reason === "beyond-horizon");
}

console.log("\n=== scenario 2: upcoming match → next activation computed ===");
{
  const sig = computeFixtureSignal([row(36 * H, "SCHEDULED")], NOW);
  const act = decideActivity(sig, { nowMs: NOW, feedOk: true });
  check("2a. fixture in 36h → UPCOMING (inside the 48h horizon, far tier)", act.mode === "UPCOMING");
  check("2b. schedule maintenance keeps the 2h cadence", act.sweepIntervalMs === 2 * H);
  check("2c. the next kickoff is carried (epoch-exact)", act.nextKoMs === NOW + 36 * H);
  check("2d. next wake = kickoff − 60min pre-match arm", act.wakeAtMs === NOW + 36 * H - 60 * MIN);
  const soonSig = computeFixtureSignal([row(4 * H, "SCHEDULED")], NOW);
  const soonAct = decideActivity(soonSig, { nowMs: NOW, feedOk: true });
  check("2e. fixture within 6h → UPCOMING with the ~20min slot refresh cadence", soonAct.mode === "UPCOMING" && soonAct.liveSweep === "slot");
}

console.log("\n=== scenario 3: pre-match window activates at the expected time ===");
{
  const in30 = decideActivity(computeFixtureSignal([row(30 * MIN, "SCHEDULED")], NOW), { nowMs: NOW, feedOk: true });
  check("3a. 30min to kickoff → PRE_MATCH", in30.mode === "PRE_MATCH");
  check("3b. PRE_MATCH live-sweeps every tick", in30.liveSweep === "tick");
  check("3c. PRE_MATCH keeps the 60s client poll", in30.pollHintSec === 60);
  const justBefore = decideActivity(computeFixtureSignal([row(61 * MIN, "SCHEDULED")], NOW), { nowMs: NOW, feedOk: true });
  check("3d. 61min out → NOT yet pre-match (the window arms at 60min)", justBefore.mode === "UPCOMING" && justBefore.liveSweep === "slot");
  const boundary = decideActivity(computeFixtureSignal([row(60 * MIN, "SCHEDULED")], NOW), { nowMs: NOW, feedOk: true });
  check("3e. exactly 60min out → PRE_MATCH (boundary inclusive)", boundary.mode === "PRE_MATCH");
}

console.log("\n=== scenario 4: confirmed live → live updates enabled ===");
{
  const sig = computeFixtureSignal([row(-30 * MIN, "IN_PLAY", { minute: 67 })], NOW);
  const act = decideActivity(sig, { nowMs: NOW, feedOk: true });
  check("4a. authoritative IN_PLAY → LIVE", act.mode === "LIVE");
  check("4b. LIVE live-sweeps every tick (the existing 10-min cadence preserved)", act.liveSweep === "tick");
  check("4c. LIVE keeps the 60s client poll (live latency untouched)", act.pollHintSec === 60);
  const started = computeFixtureSignal([row(-12 * MIN, "TIMED")], NOW);
  const startedAct = decideActivity(started, { nowMs: NOW, feedOk: true });
  check("4d. fixture fallback: kickoff passed but provider still TIMED → LIVE (Mode D unconfirmed-active)", startedAct.mode === "LIVE" && /started-unconfirmed/.test(startedAct.reason));
}

console.log("\n=== scenario 5: simultaneous matches → ONE decision ===");
{
  const rows = [row(-30 * MIN, "IN_PLAY"), row(-25 * MIN, "LIVE"), row(-18 * MIN, "PAUSED"), row(20 * MIN, "SCHEDULED")];
  const sig = computeFixtureSignal(rows, NOW);
  const act = decideActivity(sig, { nowMs: NOW, feedOk: true });
  check("5a. three live + one imminent → ONE LIVE verdict counting all three", act.mode === "LIVE" && /live:3/.test(act.reason));
  check("5b. the sweep cadence is per-TICK, never per-match (one fetchLiveSweep per tick — static wiring)", /matches = await fetchLiveSweep\(env, cachedPool\);/.test(poolSrc) && !/for .*fetchLiveSweep/.test(poolSrc));
}

console.log("\n=== scenario 6: confirmed FT stops live polling ===");
{
  const sig = computeFixtureSignal([row(-40 * MIN, "IN_PLAY")], NOW); // still live
  check("6a. a FINISHED row 40min ago keeps POST_MATCH confirmation", decideActivity(computeFixtureSignal([row(-40 * MIN, "FINISHED")], NOW), { nowMs: NOW, feedOk: true }).mode === "POST_MATCH");
  const longDone = computeFixtureSignal([row(-4 * H, "FINISHED")], NOW);
  const act = decideActivity(longDone, { nowMs: NOW, feedOk: true });
  check("6b. FINISHED 4h ago → beyond the 195min confirmation window → IDLE (live polling stopped)", act.mode === "IDLE");
  check("6c. FINISHED 194min ago → still confirming (boundary)", decideActivity(computeFixtureSignal([row(-194 * MIN, "FINISHED")], NOW), { nowMs: NOW, feedOk: true }).mode === "POST_MATCH");
  check("6d. FINISHED 196min ago → done", decideActivity(computeFixtureSignal([row(-196 * MIN, "FINISHED")], NOW), { nowMs: NOW, feedOk: true }).mode === "IDLE");
  check("6e. same verdict after the pool persists the row (restart determinism)", decideActivity(computeFixtureSignal([row(-4 * H, "FINISHED")], NOW), { nowMs: NOW, feedOk: true }).mode === "IDLE");
}

console.log("\n=== scenario 7: ET / delayed final status → no premature deactivation ===");
{
  check("7a. IN_PLAY at kickoff+100min (ET in play) → still LIVE", decideActivity(computeFixtureSignal([row(-100 * MIN, "IN_PLAY")], NOW), { nowMs: NOW, feedOk: true }).mode === "LIVE");
  check("7b. IN_PLAY at kickoff+160min (pens) → still LIVE (span 195min)", decideActivity(computeFixtureSignal([row(-160 * MIN, "IN_PLAY")], NOW), { nowMs: NOW, feedOk: true }).mode === "LIVE");
  check("7c. IN_PLAY at kickoff+199min → POST_MATCH unconfirmed (confirmation grace 45min)", decideActivity(computeFixtureSignal([row(-199 * MIN, "IN_PLAY")], NOW), { nowMs: NOW, feedOk: true }).mode === "POST_MATCH");
  check("7d. IN_PLAY at kickoff+250min → zombie: reconciled, never re-arms sweeps", decideActivity(computeFixtureSignal([row(-250 * MIN, "IN_PLAY")], NOW), { nowMs: NOW, feedOk: true }).mode === "IDLE");
  check("7e. the zombie is reported for observability (never silently dropped)", computeFixtureSignal([row(-250 * MIN, "IN_PLAY")], NOW).zombieN === 1);
  check("7f. the serve guard keeps the score: reconcileStaleLive preserves score.fullTime", (() => { const m = row(-250 * MIN, "IN_PLAY", { minute: 67, score: { fullTime: { home: 4, away: 1 } } }); reconcileStaleLive([m], NOW); return m.status === "FINISHED" && m.minute === null && m.score.fullTime.home === 4; })());
}

console.log("\n=== scenario 8: rescheduled / postponed → recalculation ===");
{
  const before = computeFixtureSignal([row(-30 * MIN, "SCHEDULED")], NOW);
  check("8a. a match kickoff-moved from -30min to +3h flips startedN → soonN (recalc)", before.startedN === 1 && computeFixtureSignal([row(3 * H, "SCHEDULED")], NOW).soonN === 1);
  const post = computeFixtureSignal([row(-30 * MIN, "POSTPONED")], NOW);
  const postAct = decideActivity(post, { nowMs: NOW, feedOk: true });
  check("8b. POSTPONED past its slot drives nothing (no live, no upcoming)", post.liveN === 0 && post.startedN === 0 && post.nextKoMs == null);
  check("8c. …and the mode drops to IDLE with a trusted feed", postAct.mode === "IDLE");
  const resched = computeFixtureSignal([row(2 * D, "POSTPONED")], NOW);
  check("8d. a POSTPONED row with a FUTURE slot counts as the next kickoff (reschedule detection)", resched.nextKoMs === NOW + 2 * D);
  check("8e. the tick recomputes every 10min — a moved fixture re-evaluates on the next tick (pure functions, no cached state)", computeFixtureSignal([row(3 * H, "SCHEDULED")], NOW).soonN === 1 && computeFixtureSignal([row(3 * H, "SCHEDULED")], NOW + 10 * MIN).soonN === 1);
}

console.log("\n=== scenario 9: API failure ≠ empty schedule ===");
{
  const empty = computeFixtureSignal([], NOW);
  const fail = decideActivity(empty, { nowMs: NOW, feedOk: false });
  check("9a. feed failure + empty calendar → DEGRADED (never IDLE-from-failure)", fail.mode === "DEGRADED");
  check("9b. inside the Baku window the degraded cadence is the conservative 2h", fail.sweepIntervalMs === 2 * H && fail.liveSweep === "slot");
  const nightFail = decideActivity(empty, { nowMs: NOW + 8 * H, feedOk: false }); // 02:00 Baku — outside the window
  check("9c. outside the Baku window the degraded cadence relaxes to 4h (bounded, not unbounded)", nightFail.mode === "DEGRADED" && nightFail.sweepIntervalMs === 4 * H && nightFail.liveSweep === "none");
  check("9d. a SUCCESSFUL empty (feedOk true) stays IDLE — empty ≠ failure", decideActivity(empty, { nowMs: NOW, feedOk: true }).mode === "IDLE");
  check("9e. real fixtures override the degraded branch entirely (fixture-first)", decideActivity(computeFixtureSignal([row(-30 * MIN, "IN_PLAY")], NOW), { nowMs: NOW, feedOk: false }).mode === "LIVE");
}

console.log("\n=== scenario 10: European DST never shifts a fixture's instant ===");
{
  // A 20:00 Madrid (CET, UTC+1) winter kickoff = 19:00Z; the same 20:00
  // Madrid (CEST, UTC+2) summer kickoff = 18:00Z. The provider supplies the
  // UTC instant; every scheduler comparison is epoch arithmetic.
  const winterKo = Date.parse("2026-01-14T19:00:00Z"); // 20:00 CET
  const summerKo = Date.parse("2026-07-14T18:00:00Z"); // 20:00 CEST
  check("10a. winter 20:00 CET (19:00Z) → 23:00 Baku; summer 20:00 CEST (18:00Z) → 22:00 Baku (UTC+4 arithmetic, both seasons)", bakuMinuteOfDay(winterKo) === 23 * 60 && bakuMinuteOfDay(summerKo) === 22 * 60);
  check("10b. the fallback window is OPEN at both instants (the 13h evening window)", bakuFallbackOpen(winterKo) === true && bakuFallbackOpen(summerKo) === true);
  // The pre-match arm fires on the EPOCH, 60min before each kickoff, in any season:
  const winterArm = decideActivity(computeFixtureSignal([{ utcDate: new Date(winterKo).toISOString(), status: "SCHEDULED", homeTeam: { name: "A" }, awayTeam: { name: "B" }, competition: { code: "PD" } }], winterKo - 30 * MIN), { nowMs: winterKo - 30 * MIN, feedOk: true });
  const summerArm = decideActivity(computeFixtureSignal([{ utcDate: new Date(summerKo).toISOString(), status: "SCHEDULED", homeTeam: { name: "A" }, awayTeam: { name: "B" }, competition: { code: "PD" } }], summerKo - 30 * MIN), { nowMs: summerKo - 30 * MIN, feedOk: true });
  check("10c. PRE_MATCH arms 30min before the winter kickoff (CET)", winterArm.mode === "PRE_MATCH");
  check("10d. PRE_MATCH arms 30min before the summer kickoff (CEST)", summerArm.mode === "PRE_MATCH");
  check("10e. the UTC crossing days differ (winter/summer dates) yet nothing shifts", new Date(winterKo).getUTCDate() === 14 && new Date(summerKo).getUTCDate() === 14);
}

console.log("\n=== scenario 11: Baku time consistent across the year ===");
{
  // Same UTC instant evaluated in January and July contexts: Asia/Baku is
  // UTC+4 year-round (no DST since 1991) — pure arithmetic, no colo quirks.
  const inst = Date.parse("2026-03-15T09:30:00Z");
  check("11a. Baku minute-of-day = UTC + 240min always", bakuMinuteOfDay(inst) === 13 * 60 + 30);
  check("11b. the window boundary math is date-independent (same instant, same verdict)", bakuFallbackOpen(inst) === true);
  check("11c. a March DST-change Sunday in Europe doesn't move Baku (2026-03-29 01:00Z)", bakuMinuteOfDay(Date.parse("2026-03-29T01:00:00Z")) === 5 * 60);
  check("11d. the October Europe clock-back doesn't move Baku (2026-10-25 01:00Z)", bakuMinuteOfDay(Date.parse("2026-10-25T01:00:00Z")) === 5 * 60);
}

console.log("\n=== scenario 12: matches just before/after midnight ===");
{
  // Baku wall clock around the 02:00 close and the midnight wrap.
  const t2359 = Date.parse("2026-10-21T19:59:00Z"); // 23:59 Baku
  const t0130 = Date.parse("2026-10-21T21:30:00Z"); // 01:30 Baku (next-day, wrapped)
  const t0200 = Date.parse("2026-10-21T22:00:00Z"); // 02:00 Baku — the close
  const t0201 = Date.parse("2026-10-21T22:01:00Z"); // 02:01 Baku — outside
  const t1259 = Date.parse("2026-10-21T08:59:00Z"); // 12:59 Baku — before open
  const t1300 = Date.parse("2026-10-21T09:00:00Z"); // 13:00 Baku — the open
  check("12a. 23:59 Baku → window open (pre-midnight)", bakuFallbackOpen(t2359) === true);
  check("12b. 01:30 Baku (post-midnight wrap) → window open", bakuFallbackOpen(t0130) === true);
  check("12c. 02:00 Baku → closed (exclusive close)", bakuFallbackOpen(t0200) === false);
  check("12d. 02:01 Baku → closed", bakuFallbackOpen(t0201) === false);
  check("12e. 12:59 Baku → closed (before open)", bakuFallbackOpen(t1259) === false);
  check("12f. 13:00 Baku → open (inclusive open)", bakuFallbackOpen(t1300) === true);
  // A 01:30-Baku kickoff 30min out is PRE_MATCH — the wrap needs no special case:
  const late = decideActivity(computeFixtureSignal([{ utcDate: new Date(t0130).toISOString(), status: "SCHEDULED", homeTeam: { name: "A" }, awayTeam: { name: "B" }, competition: { code: "PL" } }], t0130 - 30 * MIN), { nowMs: t0130 - 30 * MIN, feedOk: true });
  check("12g. a 01:30-Baku fixture arms PRE_MATCH correctly across midnight", late.mode === "PRE_MATCH");
}

console.log("\n=== scenario 13: valid fixtures OUTSIDE the fallback window still processed ===");
{
  // An 09:00 Baku kickoff (05:00Z) is OUTSIDE 13:00–02:00 — the spec pack's
  // rule: the window is a fallback, never a filter. Fixture-first scheduling
  // processes it identically.
  const earlyKo = Date.parse("2026-10-21T05:00:00Z"); // 09:00 Baku
  check("13a. 09:00 Baku is outside the fallback window", bakuFallbackOpen(earlyKo) === false);
  const sig = computeFixtureSignal([{ utcDate: new Date(earlyKo).toISOString(), status: "SCHEDULED", homeTeam: { name: "A" }, awayTeam: { name: "B" }, competition: { code: "PL" } }], earlyKo - 30 * MIN);
  const act = decideActivity(sig, { nowMs: earlyKo - 30 * MIN, feedOk: true });
  check("13b. …yet the fixture arms PRE_MATCH 30min out (fixtures override the window)", act.mode === "PRE_MATCH" && act.liveSweep === "tick");
  const earlyLive = computeFixtureSignal([{ utcDate: new Date(earlyKo).toISOString(), status: "IN_PLAY", homeTeam: { name: "A" }, awayTeam: { name: "B" }, competition: { code: "PL" } }], earlyKo + 20 * MIN);
  check("13c. an out-of-window LIVE match is still LIVE (full processing)", decideActivity(earlyLive, { nowMs: earlyKo + 20 * MIN, feedOk: true }).mode === "LIVE");
  // The window only rides the DEGRADED branch (feed failure), and out-of-window
  // degraded is the RELAXED cadence, never "ignore the fixture":
  check("13d. the window gates ONLY the degraded cadence (never the fixture tiers)", decideActivity(earlyLive, { nowMs: earlyKo + 20 * MIN, feedOk: false }).mode === "LIVE");
}

console.log("\n=== scenario 14: restart reconstructs the correct state ===");
{
  // The scheduler is stateless: same pool + same now → same verdict. The tick
  // derives everything from KV (pool blob + feed-fail marker + last sweep) —
  // nothing survives only in memory, so a restart/deploy/machine-sleep
  // recovers on the very next 10-min tick.
  const poolRows = [row(-30 * MIN, "IN_PLAY"), row(2 * H, "SCHEDULED"), row(-4 * H, "FINISHED")];
  const a1 = decideActivity(computeFixtureSignal(poolRows, NOW), { nowMs: NOW, feedOk: true });
  const a2 = decideActivity(computeFixtureSignal(poolRows, NOW), { nowMs: NOW, feedOk: true });
  check("14a. two independent evaluations agree exactly (pure, deterministic)", JSON.stringify(a1) === JSON.stringify(a2) && a1.mode === "LIVE");
  // Missed timers: 47min of downtime across a pre-match arm still arms on the
  // first tick back (the window is absolute, not consumed):
  const missed = decideActivity(computeFixtureSignal([row(13 * MIN, "SCHEDULED")], NOW), { nowMs: NOW, feedOk: true });
  check("14b. after missed ticks the pre-match window still fires (13min left → PRE_MATCH)", missed.mode === "PRE_MATCH");
  check("14c. cron.ts rebuilds the verdict from the KV pool every tick (no module-level scheduler state)", !/let (currentMode|schedState|modeCache)/.test(schedSrc) && !/^(let|var) .*Mode.*=/m.test(schedSrc));
}

console.log("\n=== scenario 15 + the serve-path guards (behavioral) ===");
{
  // The singleflight/dedup wiring is the static pair above; behavioral half:
  // the payload-level guards the concurrent-serves rely on.
  eval(grabFn("function applyLiveOverlay(data, ov)"));
  const staleKo = new Date(Date.now() - 7 * 36e5).toISOString();
  const payload = {
    upcoming: [
      { id: "s1", homeTeam: { name: "Ajax" }, awayTeam: { name: "Utrecht" }, utcDate: staleKo, status: "IN_PLAY", minute: 67, score: { home: 1, away: 1 } },
      { id: "s2", homeTeam: { name: "Bayern Munich" }, awayTeam: { name: "Heidenheim" }, utcDate: staleKo, status: "LIVE", minute: 61, score: { home: 4, away: 0 } }
    ],
    finished: []
  };
  applyLiveOverlay(payload, null);
  check("15a. THE SCREENSHOT BUG: 7h-stale live rows are purged from upcoming (no overlay at all)", payload.upcoming.length === 0);
  check("15b. they land in finished with the LAST-KNOWN score, minute cleared", payload.finished.length === 2 && payload.finished[0].status === "FINISHED" && payload.finished[0].score.home === 1 && payload.finished[0].minute === null && payload.finished[1].score.home === 4);
  const healPayload = { upcoming: [{ id: "s3", homeTeam: { name: "Barcelona" }, awayTeam: { name: "Real Betis" }, utcDate: staleKo, status: "IN_PLAY", minute: 67, score: { home: 4, away: 1 } }], finished: [] };
  applyLiveOverlay(healPayload, { ts: 1, rows: [{ id: "s3", h: "barcelona", a: "real betis", d: staleKo, st: "IN_PLAY", min: 67, s: { home: 4, away: 1 } }] });
  check("15c. a stale IN_PLAY OVERLAY row heals to FINISHED (the pre-fix blob can no longer re-animate matches)", healPayload.upcoming.length === 0 && healPayload.finished[0].score.home === 4);
}

console.log("\n=== the pubMatch stale-live guard (behavioral, stubbed deps) ===");
{
  // pubMatch's only scheduler-relevant dependency is isLiveStatus; the rest
  // are stubbed to passthroughs (the guard is what's under test).
  const stubs = `
function roundLabel(m){ return { round: null, roundFa: null }; }
function homeGround(){ return null; }
function curatedVenueFa(){ return null; }
function translateVenue(v){ return v; }
function translateTeam(n){ return n; }
function translateCompetition(c){ return c; }
function isLiveStatus(s){ var x = String(s || "").toUpperCase(); return x === "LIVE" || x === "IN_PLAY" || x === "PAUSED"; }
function matchPath(){ return "/x"; }
function isFeaturedMatch(){ return false; }
function isDerby(){ return false; }
function rivalryName(){ return null; }
var LEAGUE_LOGOS = {};
`;
  eval(stubs + "\n" + grabFn("function pubMatch(m)"));
  const stale = pubMatch({ homeTeam: { name: "A" }, awayTeam: { name: "B" }, utcDate: new Date(Date.now() - 7 * 36e5).toISOString(), competition: { code: "PL" }, status: "IN_PLAY", minute: 67, score: { fullTime: { home: 4, away: 1 } } });
  check("pubA. stale IN_PLAY row → served FINISHED", stale.status === "FINISHED");
  check("pubB. minute nulled, scorers empty", stale.minute === null && stale.scorers.length === 0);
  check("pubC. the last-known score survives (the state-preservation rule)", stale.score.home === 4 && stale.score.away === 1);
  const fresh = pubMatch({ homeTeam: { name: "A" }, awayTeam: { name: "B" }, utcDate: new Date(Date.now() - 30 * 6e4).toISOString(), competition: { code: "PL" }, status: "IN_PLAY", minute: 67, score: { fullTime: { home: 4, away: 1 } } });
  check("pubD. a genuinely live row passes through untouched (minute + scorers kept)", fresh.status === "IN_PLAY" && fresh.minute === 67);
  const et = pubMatch({ homeTeam: { name: "A" }, awayTeam: { name: "B" }, utcDate: new Date(Date.now() - 160 * 6e4).toISOString(), competition: { code: "CL" }, status: "PAUSED", minute: 118 });
  check("pubE. extra time at 160min stays live (no premature finish)", et.status === "PAUSED" && et.minute === 118);
}

console.log("\n=== the pool-write reconciliation (behavioral, REAL cacheMatches) ===");
(async () => {
  eval(grabFn("var CONFIG") + ";\n" + grabFn("async function cacheMatches(env, matches, source)") + "\n" + grabFn("async function getCachedMatches(env)"));
  const store = {};
  const env = { STATE: { get: async (k, type) => { const v = store[k]; return v == null ? null : type === "json" ? JSON.parse(v) : v; }, put: async (k, v) => { store[k] = v; } } };
  const mk = (id, offMs, status, extra) => Object.assign({ id, homeTeam: { name: "T" + id }, awayTeam: { name: "U" + id }, competition: { code: "PL" }, utcDate: new Date(Date.now() + offMs).toISOString(), status }, extra || {});
  // A zombie (kickoff −250min, beyond span+grace = 240min) is persisted FINISHED:
  await cacheMatches(env, [mk("z1", -250 * MIN, "IN_PLAY", { minute: 67, score: { fullTime: { home: 2, away: 2 } } })], "cron");
  const pool1 = JSON.parse(store["matches_v13_tracked"]).matches;
  check("poolA. the zombie row persists as FINISHED with the last-known score", pool1[0].status === "FINISHED" && pool1[0].score.fullTime.home === 2 && pool1[0].minute == null);
  // An unconfirmed finish INSIDE the grace (−200min < 240min) is NOT persisted:
  await cacheMatches(env, [mk("g1", -200 * MIN, "IN_PLAY", { minute: 90 })], "cron");
  const pool2 = JSON.parse(store["matches_v13_tracked"]).matches;
  const g1 = pool2.find((m) => m.id === "g1");
  check("poolB. a stale-live row inside the confirmation grace keeps its live status (confirmation still pending)", g1.status === "IN_PLAY");
  // SCHEDULED rows are never touched by the reconciler:
  await cacheMatches(env, [mk("s1", 2 * D, "SCHEDULED")], "cron");
  const pool3 = JSON.parse(store["matches_v13_tracked"]).matches;
  check("poolC. SCHEDULED/FINISHED rows pass through the reconciler untouched", pool3.find((m) => m.id === "s1").status === "SCHEDULED" && pool3.find((m) => m.id === "z1").status === "FINISHED");
  console.log(failed === 0 ? "\nALL SCHEDULER CHECKS PASS" : "\n" + failed + " SCHEDULER CHECK FAILURES");
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });

console.log("\n=== the slot grid + the poll-hint ladder ===");
{
  check("slotA. minutes :00/:20/:40 open the ~20min slot cadence", liveSweepSlotOpen(Date.parse("2026-10-21T18:00:00Z")) && liveSweepSlotOpen(Date.parse("2026-10-21T18:20:00Z")) && liveSweepSlotOpen(Date.parse("2026-10-21T18:40:00Z")));
  check("slotB. minutes :10/:30/:50 close it", !liveSweepSlotOpen(Date.parse("2026-10-21T18:10:00Z")) && !liveSweepSlotOpen(Date.parse("2026-10-21T18:30:00Z")) && !liveSweepSlotOpen(Date.parse("2026-10-21T18:50:00Z")));
  const ladder = {};
  ladder.LIVE = decideActivity(computeFixtureSignal([row(-30 * MIN, "IN_PLAY")], NOW), { nowMs: NOW, feedOk: true }).pollHintSec;
  ladder.POST = decideActivity(computeFixtureSignal([row(-40 * MIN, "FINISHED")], NOW), { nowMs: NOW, feedOk: true }).pollHintSec;
  ladder.PRE = decideActivity(computeFixtureSignal([row(30 * MIN, "SCHEDULED")], NOW), { nowMs: NOW, feedOk: true }).pollHintSec;
  ladder.SOON = decideActivity(computeFixtureSignal([row(3 * H, "SCHEDULED")], NOW), { nowMs: NOW, feedOk: true }).pollHintSec;
  ladder.FAR = decideActivity(computeFixtureSignal([row(2 * D, "SCHEDULED")], NOW), { nowMs: NOW, feedOk: true }).pollHintSec;
  ladder.IDLE = decideActivity(computeFixtureSignal([], NOW), { nowMs: NOW, feedOk: true }).pollHintSec;
  check("pollA. the ladder is non-decreasing toward quiet (60/90/60/120/300/900)", ladder.LIVE === 60 && ladder.POST === 90 && ladder.PRE === 60 && ladder.SOON === 120 && ladder.FAR === 300 && ladder.IDLE === 900);
}

console.log("\n=== CONFIG default pairing (the schedCfg fallback contract) ===");
{
  // The grabbed guards' literal fallbacks must equal the REAL CONFIG values —
  // a stub-CONFIG eval that silently disagreed with production would be the
  // next stale-live bug.
  check("cfgA. SCHED_MAX_LIVE_SPAN_MS = 195min = the pubMatch/overlay literal", CONFIG.SCHED_MAX_LIVE_SPAN_MS === 195 * 6e4);
  check("cfgB. SCHED_CONFIRM_GRACE_MS = 45min = the pool reconcile literal", CONFIG.SCHED_CONFIRM_GRACE_MS === 45 * 6e4);
  check("cfgC. the stale-live span equals ACTIVE_WINDOW_BEHIND_MS (one doctrine)", CONFIG.SCHED_MAX_LIVE_SPAN_MS === CONFIG.ACTIVE_WINDOW_BEHIND_MS);
  check("cfgD. the Baku window is 13:00–02:00 (780/120)", CONFIG.BAKU_WINDOW_OPEN_MIN === 780 && CONFIG.BAKU_WINDOW_CLOSE_MIN === 120);
  check("cfgE. schedCfg resolves through CONFIG and falls back to the literal", schedCfg("SCHED_MAX_LIVE_SPAN_MS", 1) === CONFIG.SCHED_MAX_LIVE_SPAN_MS && schedCfg("NOPE", 42) === 42);
}

console.log("\n(sync layer complete — the async pool layer closes the process)");
