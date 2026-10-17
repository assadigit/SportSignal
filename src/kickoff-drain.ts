// SportSignal — v13.117-kickoff: THE DEFERRED-FAN-OUT DRAIN CHAIN.
//
// The owner's report (2026-10-17, two 20:00 Tehran kickoffs): the SECOND
// simultaneous match-start arrived ~10 minutes late — Betis–Barcelona's fan-
// out (dice + card + text to every chat) consumed the tick's subrequest
// budget, the fan-out RESERVATION (v13.94-fanoutfix, correct behavior under
// the free plan's ~50-subrequest-per-invocation wall) deferred Bayern–
// Leipzig's unit CLEANLY to the NEXT 10-minute tick, and it then landed
// lean (text-only, no dice/card) at 20:10. Nothing was lost — but "notified
// at 8 both" is the product promise, and a 10-minute gap between two
// simultaneous kickoffs reads as broken.
//
// The fix: a deferred unit no longer waits for the next cron tick. The tick
// hands its deferred (match, type) keys to THIS module, which invokes the
// worker's OWN /api/kickoff-drain endpoint through the SELF-REFERENCING
// SERVICE BINDING (env.DRAIN_SELF — a direct binding call bypasses the
// public edge; a plain fetch to the worker's own origin is refused by
// Cloudflare with error 1042 "recursive fetch", probed live 2026-10-17).
// The bound request is a NEW invocation with a FRESH ~50-subrequest budget
// (probed live). That invocation re-runs the exact same
// sendNotificationIfNeeded gates (window re-checked, dedupe write-first,
// reservation against the fresh counters) and delivers the FULL fan-out —
// dice + card + text — ~40-60 seconds after kickoff, same-minute as the
// first match. Units that STILL defer inside the drain chain once more
// (3+ simultaneous kickoffs), bounded by KICKOFF_DRAIN_MAX_DEPTH; anything
// past the caps rides the old next-tick path unchanged.
//
// Safety properties (by construction):
//   - token: the chain carries env.WEBHOOK_SECRET; without it the route is
//     a bare 403 (the endpoint sits BEFORE the admin auth gate because the
//     caller is the worker itself, not an admin session).
//   - no double-send: the drain re-uses the write-first dedupe store; a
//     unit the drain already delivered leaves its notified_v1 record, so
//     the next cron tick (or a racing drain) skips it. The reservation's
//     clean-deferral semantics (no record written when deferred) are what
//     make the handoff race-free.
//   - no loops: depth-capped (KICKOFF_DRAIN_MAX_DEPTH), unit-capped
//     (KICKOFF_DRAIN_MAX_UNITS), and chainKickoffDrain refuses empty input.
//   - fail-open to the OLD path: any chain failure (binding missing, non-200,
//     network) logs and returns null — the deferred units keep riding the
//     next-tick retry exactly as before this module existed.
//   - quota-neutral: the drain's writes are D1 (dedupe + delivery ledger,
//     100k/day tier); on the happy path it adds ZERO new KV writes and one
//     extra invocation per tick that actually deferred something.
//   - no new registry semantics: dead chats discovered mid-drain are
//     reported only — the sweep's pruneChats stays the single mutator.

import { CONFIG, VERSION } from "./config";
import type { Env } from "./types";
import { jsonResponse, resetSubrequestBudget } from "./utils";
import { matchKey } from "./dedupe";
import { NOTIFICATION_CONFIGS, sendNotificationIfNeeded, drainUnitPriority } from "./notify-engine";
import { getRegisteredChats, getUserPrefs, groupChatsByTz, userFollowsMatch, isBigMatch } from "./users";
import { getNotifiedMatches } from "./match-dedupe";
import { applySettings } from "./admin";

// The drain runner: re-runs the deferred units through the REAL engine
// gates against the KV pool. Called from the /api/kickoff-drain route (a
// fresh HTTP invocation — resetSubrequestBudget at the fetch entry already
// zeroed the counters; the explicit reset here makes the runner's budget
// deterministic regardless of caller). (Params un-annotated: the eval
// harness slices this function verbatim — the check-composers convention.)
export async function runKickoffDrain(env, units, depth) {
  const out: any = { processed: 0, sent: 0, missing: 0, noPool: false, deferred: [], depth, version: VERSION_TAG() };
  if (!Array.isArray(units) || !units.length) return out;
  resetSubrequestBudget();
  // The LIVE desired-team lists — the same applySettings the sweep's
  // preflight runs. Without it userFollowsMatch/isBigMatch would fall back
  // to compile-time defaults and compute the WRONG audience (the follower
  // sets are admin-editable settings).
  try {
    await applySettings(env);
  } catch (e) {
    console.warn("kickoff drain: applySettings failed (compile-time defaults stand): " + e.message);
  }
  // The KV pool — same key the cron's pool phase reads. The pool's utcDates
  // are stable, which is all the window math needs; a stale status row is
  // harmless here (SCHEDULED/IN_PLAY/PAUSED all pass isMatchStartingNow's
  // exclusion list — only FINISHED/POSTPONED/SUSPENDED/CANCELLED block, and
  // a just-kicked-off match cannot be any of those in a minutes-old pool).
  const poolBlob: any = await env.STATE.get(CONFIG.KV_MATCHES_KEY, "json").catch(() => null);
  const matches = poolBlob && Array.isArray(poolBlob.matches) ? poolBlob.matches : [];
  if (!matches.length) {
    out.noPool = true;
    console.warn("kickoff drain: no pool — units ride the next-tick path");
    return out;
  }
  const chatIds = await getRegisteredChats(env);
  if (!chatIds.length) return out;
  const prefs = await getUserPrefs(env);
  const notifiedMatches = await getNotifiedMatches(env);
  // The same counts shape the sweep passes (sendNotificationIfNeeded reads
  // counts[config.type] and counts.outcome).
  const counts: Record<string, any> = {
    "pre-match-72h": 0,
    "pre-match-24h": 0,
    "pre-match-3h": 0,
    "pre-match-1h": 0,
    "pre-match-5min": 0,
    "match-start": 0,
    "result": 0,
    outcome: { sent: 0, failed: 0, dead: 0 }
  };
  const deadChats = [];
  const deferred = [];
  // Time-critical first — the drain exists for the match-start units.
  const ordered = units.slice().sort((a, b) => drainUnitPriority(a) - drainUnitPriority(b));
  for (const unitKey of ordered) {
    // Split at the LAST ":" — matchKey itself contains a colon inside its
    // HH:MM tail ("home|away|2026-10-17T16:30"), so the type suffix is
    // always behind the final colon.
    const sep = String(unitKey).lastIndexOf(":");
    if (sep < 0) { out.missing++; continue; }
    const mk = String(unitKey).slice(0, sep);
    const ntype = String(unitKey).slice(sep + 1);
    const match = matches.find((m) => matchKey(m) === mk);
    if (!match) { out.missing++; continue; }
    const config = NOTIFICATION_CONFIGS.find((c) => c.type === ntype);
    if (!config) { out.missing++; continue; }
    // The same audience computation the sweep performs per match.
    const matchChats = chatIds.filter((c) => userFollowsMatch(prefs, c, match));
    if (!matchChats.length) continue;
    let groups = groupChatsByTz(matchChats, prefs, env);
    if (config.bigMatchOnly) {
      const both = matchChats.filter((c) => isBigMatch(match, prefs, c));
      if (!both.length) continue;
      groups = groupChatsByTz(both, prefs, env);
    }
    const before = counts[ntype] || 0;
    try {
      // Every gate re-run verbatim: window (an expired unit no-ops cleanly),
      // write-first dedupe (races are impossible), the reservation against
      // THIS invocation's fresh counters. A unit that was deferred by the
      // tick because the budget was full now finds a nearly-empty one.
      await sendNotificationIfNeeded(match, config, groups, env, counts, notifiedMatches, deadChats, deferred);
    } catch (e) {
      console.warn("kickoff drain unit failed (" + unitKey + "): " + e.message);
      continue;
    }
    out.processed++;
    if ((counts[ntype] || 0) > before) out.sent++;
  }
  out.deferred = deferred.slice(0, CONFIG.KICKOFF_DRAIN_MAX_UNITS || 10);
  // Dead chats are REPORTED only — the sweep's pruneChats stays the single
  // registry mutator (the next tick prunes them as always).
  if (deadChats.length) console.log("kickoff drain: dead chat(s) during fan-out (next sweep prunes): " + deadChats.join(", "));
  console.log(`\u26A1 Kickoff drain (depth ${depth}): processed ${out.processed}, sent ${out.sent}, missing ${out.missing}, still-deferred ${out.deferred.length}`);
  return out;
}

// The route: POST /api/kickoff-drain { token, units, depth }. Sits BEFORE
// the admin auth gate in api.ts — the caller is the worker itself carrying
// WEBHOOK_SECRET, not an admin session. Non-POST falls through to the SEO
// router (harmless 404); wrong/missing token is a bare 403.
export async function handleKickoffDrainRoute(req, env) {
  let body: any = null;
  try {
    body = await req.json();
  } catch (e) {
    return jsonResponse({ error: "bad json" }, 400);
  }
  const token = body ? body.token : null;
  if (!env.WEBHOOK_SECRET || typeof token !== "string" || token !== env.WEBHOOK_SECRET) {
    return jsonResponse({ error: "forbidden" }, 403);
  }
  const units = Array.isArray(body.units)
    ? body.units.filter((u) => typeof u === "string").slice(0, CONFIG.KICKOFF_DRAIN_MAX_UNITS || 10)
    : [];
  const depthRaw = Number(body && body.depth);
  const depth = Math.max(0, Math.min(isFinite(depthRaw) ? Math.floor(depthRaw) : 0, CONFIG.KICKOFF_DRAIN_MAX_DEPTH || 2));
  const out = await runKickoffDrain(env, units, depth);
  // Still-deferred units chain ONE more fresh invocation (bounded by the
  // depth cap): 3+ simultaneous kickoffs each get their own budget slice.
  // Anything past the cap rides the old next-tick path.
  if (Array.isArray(out.deferred) && out.deferred.length && depth < (CONFIG.KICKOFF_DRAIN_MAX_DEPTH || 2)) {
    const chained = await chainKickoffDrain(env, out.deferred, depth + 1).catch(() => null);
    if (chained && typeof chained === "object") {
      const c = chained as any;
      out.chained = { depth: depth + 1, processed: c.processed || 0, sent: c.sent || 0, deferred: (c.deferred || []).length };
    }
  }
  return jsonResponse(out);
}

// The chain: one invocation of THIS SAME WORKER through the self-referencing
// SERVICE BINDING (env.DRAIN_SELF — wrangler.toml [[services]]). A direct
// binding call bypasses the public edge — a plain fetch to the worker's own
// workers.dev origin is refused by Cloudflare with error 1042 ("recursive
// fetch", probed live 2026-10-17), while the binding invocation is a NEW
// request context with its OWN ~50-subrequest budget (also probed live:
// an outer invocation that burned 45 subrequests chained a bound invocation
// that completed 12 more). Any failure returns null — the deferred units
// keep the old next-tick retry path; the chain is strictly additive
// latency-recovery, never a correctness dependency.
export async function chainKickoffDrain(env, units, depth) {
  if (!env || !env.DRAIN_SELF || !env.WEBHOOK_SECRET || !Array.isArray(units) || !units.length) return null;
  if (depth > (CONFIG.KICKOFF_DRAIN_MAX_DEPTH || 2)) return null;
  try {
    // The stub hostname is irrelevant to routing — a service-binding request
    // lands in THIS worker's own fetch handler with the path intact, where
    // api.ts's pre-gate /api/kickoff-drain branch picks it up (and the fetch
    // entry's resetSubrequestBudget gives the runner its fresh counters).
    const res = await env.DRAIN_SELF.fetch("https://drain.internal/api/kickoff-drain", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token: env.WEBHOOK_SECRET, units, depth })
    });
    if (!res.ok) {
      console.warn("kickoff drain chain returned HTTP " + res.status + " (units ride the next-tick path)");
      return null;
    }
    return await res.json().catch(() => null);
  } catch (e) {
    console.warn("kickoff drain chain failed (units ride the next-tick path): " + e.message);
    return null;
  }
}

// Deployed-version stamp for the response (ops visibility: which build
// served the drain).
function VERSION_TAG() {
  return VERSION;
}
