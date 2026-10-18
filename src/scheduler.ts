// SportSignal — the FIXTURE-AWARE SCHEDULER (v13.118-fixsched): pure decision
// functions that turn the tracked-fixture pool into an activity MODE and the
// per-mode work policy (sweep cadence / live-sweep gating / poll hint / next
// wake). Pure on purpose: every function takes `nowMs` (the harness's mock
// clock) and plain rows, references CONFIG only through schedCfg (missing
// keys fall back to the pinned defaults), and imports NOTHING — so the
// self-check scripts can grab + eval any function in isolation and the
// full-worker harness can drive the whole module off the mock clock.
//
// MODES (the task's A–E, plus the degraded fallback):
//   IDLE        no relevant fixture live, imminent or within the idle
//               horizon (48h) and the fixture feed is trusted — the tick
//               shell keeps running (pre-match reminders fire from the KV
//               pool) but full sweeps stretch to 6h discovery and live
//               sweeps stop entirely.
//   UPCOMING    next relevant kickoff between 6h and 48h out — schedule
//               maintenance at the historical 2h cadence (QUIET_SWEEP_MS).
//   PRE_MATCH   kickoff within the 60min activation window (the existing
//               ACTIVE_WINDOW_AHEAD_MS) — live sweep every 10-min tick.
//   LIVE        an authoritative live status on a PLAUSIBLY-live row, or the
//               fixture-based fallback (kickoff passed, provider status
//               still SCHEDULED/TIMED within the live span) — live sweep
//               every tick.
//   POST_MATCH  a FINISHED result inside the 195min confirmation window, or
//               an unconfirmed finish (live status past the live span but
//               within the 45min confirmation grace) — live sweep every
//               tick while confirmation is pending.
//   DEGRADED    the fixture feed failed recently (feed_fail_v1 marker) —
//               NEVER treat a failure as "no football": the Baku fallback
//   window (13:00–02:00 Asia/Baku, pure-arithmetic UTC+4, no DST) sets a
//               conservative 2h cadence + slotted live sweeps inside the
//               window and a 4h cadence outside it.
//
// The stale-live doctrine (the 4 AM screenshot bug — matches "playing" 6-7h
// after they finished): a live status whose kickoff is older than
// SCHED_MAX_LIVE_SPAN_MS (195min — kickoff+90+HT+stoppage, margin for ET/
// pens, the same estimate ACTIVE_WINDOW_BEHIND_MS already uses) is NOT
// plausible; the serve path downgrades it to FINISHED with the last-known
// score (reconcileStaleLive / pubMatch / applyLiveOverlay guards) and the
// pool write converges it after the confirmation grace. Zombies (older than
// span+grace) never drive sweeps again — a stuck provider row can no longer
// keep the backend live-sweeping 24/7.
//
// Timezone policy (the spec pack, docs/spec-pack/…): every comparison is an
// epoch-ms diff — European DST shifts a fixture's UTC instant, never our
// arithmetic. Asia/Baku is UTC+4 year-round (no DST since 1991), so the
// fallback window is pure minute-of-day arithmetic; the fixture schedule
// ALWAYS overrides the window (a valid 09:00-Baku kickoff is processed
// normally — the window only rides the DEGRADED branch).

// The CONFIG import is stripped by the worker-src transform (grabbed evals
// resolve it from their own scope or fall back to the pinned defaults).
import { CONFIG } from "./config";

// schedCfg — CONFIG lookup with a pinned default. Grabbed evals run against
// stub CONFIG objects that predate this module's keys; the defaults are the
// values CONFIG carries (check-scheduler pins the pairings).
function schedCfg(key, def) {
  try {
    if (typeof CONFIG !== "undefined" && CONFIG != null && CONFIG[key] != null) return CONFIG[key];
  } catch (e) { }
  return def;
}

// kickoffMsOf — epoch-ms of a row's utcDate (NaN when unparseable).
export function kickoffMsOf(m) {
  if (!m || !m.utcDate) return NaN;
  var t = Date.parse(String(m.utcDate));
  return t;
}

// staleLiveAgeMs — ms since kickoff when the row carries a live status,
// null otherwise (SCHEDULED/FINISHED/POSTPONED… are not stale-live).
export function staleLiveAgeMs(m, nowMs) {
  if (!m) return null;
  var s = String(m.status || "").toUpperCase();
  if (s !== "LIVE" && s !== "IN_PLAY" && s !== "PAUSED") return null;
  var t = kickoffMsOf(m);
  if (isNaN(t)) return null;
  return nowMs - t;
}

// reconcileStaleLive — in-place downgrade of implausible live rows to
// FINISHED (minute cleared, last-known score kept: the "preserve the last
// known score and match state" rule). Returns how many rows were fixed —
// the caller logs it. Serve path uses span alone; the pool write uses
// span + confirmation grace (the durable convergence is more conservative
// than the display guard).
export function reconcileStaleLive(rows, nowMs, spanMs?) {
  if (!Array.isArray(rows)) return 0;
  var span = spanMs != null ? spanMs : schedCfg("SCHED_MAX_LIVE_SPAN_MS", 195 * 6e4);
  var fixed = 0;
  for (var i = 0; i < rows.length; i++) {
    var m = rows[i];
    if (!m) continue;
    var age = staleLiveAgeMs(m, nowMs);
    if (age == null) continue;
    if (age > span) {
      m.status = "FINISHED";
      if (m.minute != null) m.minute = null;
      fixed++;
    }
  }
  return fixed;
}

// bakuMinuteOfDay — Asia/Baku wall-clock minute (UTC+4, fixed year-round;
// pure arithmetic per the v13.116-tzproof doctrine: no Intl, no colo quirks).
export function bakuMinuteOfDay(nowMs) {
  var d = new Date(nowMs);
  var utcMin = d.getUTCHours() * 60 + d.getUTCMinutes();
  return (utcMin + 4 * 60) % 1440;
}

// bakuFallbackOpen — the 13:00–02:00 Baku coverage window (the spec pack's
// conservative operational reference; wraps over midnight). OPEN default
// 13:00 (780), CLOSE default 02:00 (120).
export function bakuFallbackOpen(nowMs, openMin?, closeMin?) {
  var open = openMin != null ? openMin : schedCfg("BAKU_WINDOW_OPEN_MIN", 780);
  var close = closeMin != null ? closeMin : schedCfg("BAKU_WINDOW_CLOSE_MIN", 120);
  var m = bakuMinuteOfDay(nowMs);
  if (open <= close) return m >= open && m < close;
  return m >= open || m < close;
}

// computeFixtureSignal — one pass over PRE-FILTERED rows (the caller decides
// relevance: cron filters shouldReport — the existing consolidated tier —
// the public path filters its own display tier). Returns the counts the
// mode decision needs. Fields:
//   liveN      live status, kickoff within span behind → authoritative live
//   startedN   kickoff passed within span, status still SCHEDULED/TIMED →
//              the Mode-D fixture fallback (should be active, provider lag)
//   liveStaleN live status, kickoff between span and span+grace behind →
//              unconfirmed finish (POST_MATCH confirmation)
//   zombieN    live status, kickoff older than span+grace → reconciled by
//              the pool write; NEVER drives sweeps
//   confirmN   FINISHED with kickoff within ACTIVE_WINDOW_BEHIND behind →
//              the existing post-match confirmation window
//   preN       kickoff within the pre-match window ahead, not finished
//   soonN      kickoff within the upcoming-soon window (6h) ahead
//   nextKoMs   next future kickoff (min over non-finished rows), null when
//              the calendar knows nothing upcoming
//   horizonMs  the furthest kickoff in the rows (pool blindness check)
export function computeFixtureSignal(rows, nowMs, opts?) {
  var o = opts || {};
  var span = o.spanMs != null ? o.spanMs : schedCfg("SCHED_MAX_LIVE_SPAN_MS", 195 * 6e4);
  var grace = o.graceMs != null ? o.graceMs : schedCfg("SCHED_CONFIRM_GRACE_MS", 45 * 6e4);
  var behind = o.behindMs != null ? o.behindMs : schedCfg("ACTIVE_WINDOW_BEHIND_MS", 195 * 6e4);
  var pre = o.preMs != null ? o.preMs : schedCfg("ACTIVE_WINDOW_AHEAD_MS", 60 * 6e4);
  var soon = o.soonMs != null ? o.soonMs : schedCfg("SCHED_UPCOMING_SOON_MS", 6 * 36e5);
  var sig = { liveN: 0, startedN: 0, liveStaleN: 0, zombieN: 0, confirmN: 0, preN: 0, soonN: 0, nextKoMs: null, horizonMs: 0 };
  if (!Array.isArray(rows)) return sig;
  for (var i = 0; i < rows.length; i++) {
    var m = rows[i];
    if (!m) continue;
    var t = kickoffMsOf(m);
    if (isNaN(t)) continue;
    if (t > sig.horizonMs) sig.horizonMs = t;
    var s = String(m.status || "").toUpperCase();
    var rel = t - nowMs; // >0 future, <0 past
    if (s === "LIVE" || s === "IN_PLAY" || s === "PAUSED") {
      if (rel >= -span) sig.liveN++;
      else if (rel >= -(span + grace)) sig.liveStaleN++;
      else sig.zombieN++;
      continue;
    }
    if (s === "FINISHED") {
      if (rel < 0 && -rel < behind) sig.confirmN++;
      continue;
    }
    // POSTPONED / CANCELLED / SUSPENDED: not active by definition. A FUTURE
    // slot still counts toward nextKo (reschedule discovery — the fixture
    // moved, the calendar must show it), but these statuses never arm the
    // pre-match/soon/started windows (scenario 8: a postponed match whose
    // old slot passed drives nothing; the recalculation sees the new slot).
    if (s === "POSTPONED" || s === "CANCELLED" || s === "SUSPENDED" || s === "CANCELLED_TBD") {
      if (rel > 0 && (sig.nextKoMs == null || t < sig.nextKoMs)) sig.nextKoMs = t;
      continue;
    }
    // SCHEDULED / TIMED / anything else with a future kickoff
    if (rel > 0) {
      if (sig.nextKoMs == null || t < sig.nextKoMs) sig.nextKoMs = t;
      if (rel <= pre) sig.preN++;
      else if (rel <= soon) sig.soonN++;
    } else if (rel >= -span) {
      // kickoff passed but the provider never flipped the status — the
      // fixture itself says this match should be active (Mode D fallback)
      sig.startedN++;
    }
  }
  return sig;
}

// decideActivity — the mode + policy. ctx: { nowMs, feedOk, tickMinute }.
// Returns { mode, reason, sweepIntervalMs, liveSweep ("tick"|"slot"|"none"),
// pollHintSec, nextKoMs, zombieN, wakeAtMs }.
//   sweepIntervalMs  how fresh a full sweep must stay in this mode (the
//                    sweepFresh gate in cron-pool).
//   liveSweep        "tick" = every 10-min tick, "slot" = every other tick
//                    (~20min — the tick grid cannot express 15min exactly),
//                    "none" = no live sweeps.
//   pollHintSec      the payload's client-poll hint (section 7).
//   wakeAtMs         the next instant the mode provably changes (best
//                    effort — informational; the tick recomputes every 10min
//                    regardless, which is what makes restarts safe).
export function decideActivity(sig, ctx?) {
  var c = ctx || {};
  var nowMs = c.nowMs != null ? c.nowMs : Date.now();
  var feedOk = c.feedOk !== false;
  var span = schedCfg("SCHED_MAX_LIVE_SPAN_MS", 195 * 6e4);
  var grace = schedCfg("SCHED_CONFIRM_GRACE_MS", 45 * 6e4);
  var pre = schedCfg("ACTIVE_WINDOW_AHEAD_MS", 60 * 6e4);
  var soon = schedCfg("SCHED_UPCOMING_SOON_MS", 6 * 36e5);
  var idleH = schedCfg("SCHED_IDLE_HORIZON_MS", 48 * 36e5);
  var maint = schedCfg("QUIET_SWEEP_MS", 2 * 36e5);
  var idleDisc = schedCfg("SCHED_IDLE_DISCOVERY_MS", 6 * 36e5);
  var degIn = schedCfg("SCHED_DEGRADED_IN_MS", 2 * 36e5);
  var degOut = schedCfg("SCHED_DEGRADED_OUT_MS", 4 * 36e5);
  var base = {
    nextKoMs: sig.nextKoMs != null ? sig.nextKoMs : null,
    zombieN: sig.zombieN || 0,
    wakeAtMs: null
  };
  // 1. LIVE — authoritative live rows, or the fixture fallback (kickoff
  //    passed, status unconfirmed): Mode D's "should be active".
  if (sig.liveN > 0 || sig.startedN > 0) {
    return Object.assign(base, {
      mode: "LIVE", reason: "live:" + sig.liveN + (sig.startedN ? " started-unconfirmed:" + sig.startedN : ""),
      sweepIntervalMs: maint, liveSweep: "tick", pollHintSec: 60,
      wakeAtMs: nowMs + span
    });
  }
  // 2. POST_MATCH — provider-confirmed finishes inside the confirmation
  //    window, or unconfirmed finishes (stale-live within grace).
  if (sig.confirmN > 0 || sig.liveStaleN > 0) {
    return Object.assign(base, {
      mode: "POST_MATCH", reason: "confirm:" + sig.confirmN + (sig.liveStaleN ? " unconfirmed:" + sig.liveStaleN : ""),
      sweepIntervalMs: maint, liveSweep: "tick", pollHintSec: 90,
      wakeAtMs: nowMs + grace
    });
  }
  // 3. PRE_MATCH — inside the activation window.
  if (sig.preN > 0) {
    return Object.assign(base, {
      mode: "PRE_MATCH", reason: "pre-match:" + sig.preN,
      sweepIntervalMs: maint, liveSweep: "tick", pollHintSec: 60,
      wakeAtMs: sig.nextKoMs != null ? sig.nextKoMs : null
    });
  }
  // 4. UPCOMING (soon) — within 6h: refresh schedule/status on the slot
  //    cadence (~20min) so postponements and kickoff changes surface fast.
  if (sig.soonN > 0) {
    return Object.assign(base, {
      mode: "UPCOMING", reason: "soon:" + sig.soonN,
      sweepIntervalMs: maint, liveSweep: "slot", pollHintSec: 120,
      wakeAtMs: sig.nextKoMs != null ? sig.nextKoMs - pre : null
    });
  }
  // 5. UPCOMING (far) — a known fixture inside the idle horizon: keep the
  //    historical 2h maintenance cadence.
  if (sig.nextKoMs != null && sig.nextKoMs - nowMs <= idleH) {
    return Object.assign(base, {
      mode: "UPCOMING", reason: "next:" + Math.round((sig.nextKoMs - nowMs) / 36e5) + "h",
      sweepIntervalMs: maint, liveSweep: "none", pollHintSec: 300,
      wakeAtMs: sig.nextKoMs - pre
    });
  }
  // 6/7. No imminent fixture — IDLE when the feed is trusted, DEGRADED
  //     (Baku fallback window) when it is not. A successful empty fixture
  //     response is IDLE; a FAILED one is DEGRADED — never "no football".
  if (feedOk) {
    return Object.assign(base, {
      mode: "IDLE",
      reason: sig.nextKoMs != null ? "beyond-horizon" : "no-upcoming-fixtures",
      sweepIntervalMs: idleDisc, liveSweep: "none", pollHintSec: 900,
      wakeAtMs: sig.nextKoMs != null ? sig.nextKoMs - pre : null
    });
  }
  if (bakuFallbackOpen(nowMs)) {
    return Object.assign(base, {
      mode: "DEGRADED", reason: "feed-fail+baku-window",
      sweepIntervalMs: degIn, liveSweep: "slot", pollHintSec: 120,
      wakeAtMs: null
    });
  }
  return Object.assign(base, {
    mode: "DEGRADED", reason: "feed-fail+quiet-hours",
    sweepIntervalMs: degOut, liveSweep: "none", pollHintSec: 300,
    wakeAtMs: null
  });
}

// liveSweepSlotOpen — the ~20min slot grid for "slot" cadence (the 10-min
// cron can only land on :00/:10/:20… — minutes 0/20/40 give 20min).
export function liveSweepSlotOpen(nowMs) {
  var m = new Date(nowMs).getUTCMinutes();
  return m % 20 === 0;
}
