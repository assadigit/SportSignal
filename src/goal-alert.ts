// SportSignal — the GOAL-EVENT layer (S19, the Telegram alerts track part 1):
// per-user live goal alerts derived from REAL score deltas in the LIVE sweep.
// The notify-status.ts structural twin (the event-boundary notification
// precedent — one hook in runNotifyPhase, zero new schedulers/providers):
//
//   snapshot   one compact KV map (goal_snapshots_v1) of last-known scores
//              for in-window LIVE matches, write-only-when-changed (the
//              match_status_v1 discipline), TTL 2 days.
//   delta      fresh live score vs the snapshot → goal events with
//              score-side attribution. FIRST SIGHTING SEEDS, NEVER FIRES
//              (an outage-recovered 2-0 is not 2 goal events). Backward
//              movement (a provider correction) advances the baseline
//              silently — no event, never a fabricated one.
//   MISSING-   a live match with no REAL score (score.fullTime.home/away
//   IS-NOT-    both non-null) gets no snapshot row and no event — never a
//   ZERO       fake "0-0 unchanged". A provider gap mid-match RETAINS the
//              prev row (fail-closed): the next good sweep computes the
//              delta from the last-known score, so missed goals arrive
//              late, never as a burst, never fabricated.
//   claim      the per-goal D1 write-first claim rides notified_v1 verbatim
//              (INSERT OR IGNORE, PK (match_key, ntype)) with the ntype
//              "goal:<h>-<a>" — the score tuple AFTER the goal. A 2-1 then
//              3-1 match alerts twice (goal:2-1, goal:3-1); a re-sweep of
//              the same 3-1 alerts zero times. At most one alert per score
//              tuple per match, ever (a disallowed-goal correction that
//              re-crosses the same tuple is suppressed — the repo's
//              fail-toward-fewer-notifications law).
//   two-layer   the claim persists BEFORE any send (a failed claim defers,
//   write-first no send, baseline NOT advanced — the delta recomputes next
//   order      tick); the KV snapshot advances ONLY rows whose events were
//              claimed/sent or had no events (a budget-deferred or
//              claim-failed event keeps the OLD score so the next tick
//              recomputes the same delta). A failed snapshot put is safe:
//              D1 claims block any double-send, unclaimed deltas retry.
//   audience   the EXISTING team-follow subscriptions (user_prefs.teams via
//              userFollowsMatch "one"/"both") — a goal fans out to chats
//              following EITHER side. No new subscription surface.
//   send       the existing transport (sendTelegram: retries/429-pause/
//              outbox/dead-chat) + the per-chat delivery ledger; the card
//              from cachedCardPng ONLY (cache-only — the v13.94.1 CPU-keeper
//              law: a goal burst during a Saturday slate must never resvg-
//              render; text fallback per chat). Budget-reserved BEFORE any
//              claim (full/lean/defer — the v13.94 fan-out reservation
//              semantics), capped per tick (CONFIG.GOAL_ALERT_MAX_UNITS).
//
// Scoped OUT (DECISIONS S19-3/S19-5): red-card alerts (no incident source on
// the wired providers — never fabricated), channel-mirror goal posts + the
// sportscore scorer enrichment (S20 backlog).
import { CONFIG } from "./config";
import type { Env } from "./types";
import { toFaDigits, subrequestCount, kvOpsCount } from "./utils";
import { mdBold, mdItalic } from "./md";
import { isLiveStatus } from "./match-model";
import { matchKey } from "./dedupe";
import { translateTeam, translateCompetition } from "./translate";
import { COMP_EN } from "./tables";
import { getNotifiedMatches, saveNotifiedMatch, recordDeliveries } from "./match-dedupe";
import { sendTelegram, sendPhotoBinary } from "./telegram";
import { cachedCardPng } from "./card";
import { getRegisteredChats, getUserPrefs, userFollowsMatch, groupChatsByTz } from "./users";
import { pruneChats } from "./user-store";
import { withChannelCta } from "./channel-mirror";

// The live-relevance window: a match only contributes snapshot rows while
// its kickoff sits inside [-(GOAL_WIN_BACK), +(GOAL_WIN_FWD)]. Back covers
// a full match + extra time + delays (the overlay's own 6h law); the small
// forward arm catches early rows the sweep arms before kickoff (seeding a
// baseline BEFORE the first goal is what makes the 1-0 fire correctly).
const GOAL_WIN_BACK_MS = 6 * 36e5;
const GOAL_WIN_FWD_MS = 4 * 36e5;

// MISSING-IS-NOT-ZERO: the score extraction. Returns {h, a} only when the
// row carries REAL score data (both fullTime fields non-null integers);
// null otherwise — a null is NEVER a 0.
export function liveScoreOf(match) {
  const ft = match && match.score && match.score.fullTime;
  if (!ft || ft.home == null || ft.away == null) return null;
  const h = Number(ft.home), a = Number(ft.away);
  if (!Number.isInteger(h) || !Number.isInteger(a) || h < 0 || a < 0) return null;
  return { h, a };
}

function koMsOf(match) {
  const t = match && match.utcDate ? new Date(match.utcDate).getTime() : NaN;
  return t;
}

// The fresh snapshot row set: { matchKey: {h, a, d} } for in-window LIVE
// matches with a real score, PLUS the retained prev rows for in-window
// matches whose fresh score is missing this tick (the fail-closed provider-
// gap law) or whose row is absent from the sweep entirely. Exported for the
// check harness (pure).
export function buildGoalSnapshots(matches, prev, nowMs) {
  const cur = {};
  const seen = new Set();
  for (const m of Array.isArray(matches) ? matches : []) {
    if (!m || !m.competition || !m.homeTeam || !m.awayTeam) continue;
    const ko = koMsOf(m);
    if (!isFinite(ko) || ko < nowMs - GOAL_WIN_BACK_MS || ko > nowMs + GOAL_WIN_FWD_MS) continue;
    const key = matchKey(m);
    seen.add(key);
    if (!isLiveStatus(m.status)) continue; // events fire from live rows only
    const s = liveScoreOf(m);
    if (s) cur[key] = { h: s.h, a: s.a, d: m.utcDate };
    else if (prev && prev[key]) cur[key] = prev[key]; // provider gap: retain
  }
  // Retention pass: in-window prev rows whose match is absent from this
  // tick's sweep entirely (a total provider failure returning the stale
  // pool) keep their baseline — the delta recomputes on the next good sweep.
  if (prev) {
    for (const k of Object.keys(prev)) {
      if (seen.has(k)) continue;
      const row = prev[k];
      const ko = row && row.d ? new Date(row.d).getTime() : NaN;
      if (isFinite(ko) && ko >= nowMs - GOAL_WIN_BACK_MS && ko <= nowMs + GOAL_WIN_FWD_MS) cur[k] = row;
    }
  }
  return cur;
}

// The pure delta law. Returns the event list [{key, match, ph, pa, h, a,
// side: "home"|"away"|"both", goals}] for prev→cur changes, or [] when
// nothing fireable changed. First sightings, unchanged scores, backward
// corrections and non-live rows produce NO events (the baseline still
// advances via the snapshot write).
export function diffGoalEvents(cur, prev, matchOfKey) {
  const events = [];
  if (!cur) return events;
  for (const k of Object.keys(cur)) {
    const row = cur[k];
    const p = prev ? prev[k] : null;
    if (!p) continue; // first sighting: seed only, never fire
    if (row.h === p.h && row.a === p.a) continue; // legitimately unchanged
    const dh = row.h - p.h, da = row.a - p.a;
    if (dh <= 0 && da <= 0) continue; // correction: advance silently
    const match = matchOfKey ? matchOfKey(k) : null;
    if (!match) continue;
    events.push({
      key: k, match,
      ph: p.h, pa: p.a, h: row.h, a: row.a,
      side: dh > 0 && da > 0 ? "both" : dh > 0 ? "home" : "away",
      goals: Math.max(dh, 0) + Math.max(da, 0)
    });
  }
  return events;
}

// The per-goal claim ntype: "goal:<h>-<a>" — the score tuple AFTER the goal.
// Unique per real score state; a re-sweep of the same tuple claims 0 rows.
export function goalNtype(h, a) {
  return "goal:" + h + "-" + a;
}

// The fan-out reservation for a goal unit (the v13.94 semantics specialized:
// a goal's text IS the payload, so lean (text-only, no card) applies to every
// goal unit — not just match-start). "defer" leaves the event unclaimed with
// the baseline retained; the next tick recomputes the same delta.
export function goalFanoutVerdict(chatGroups) {
  let sends = 0;
  for (const g of chatGroups) sends += g.chats.length;
  const used = subrequestCount() + kvOpsCount();
  // worst case per chat: 1 photo send + 1 text fallback; +2 margin for the
  // snapshot put + the delivery-ledger batch. Cards are cache-only (0 fetch).
  const full = sends * 2 + 2;
  if (used + full <= CONFIG.SUBREQUEST_FANOUT_CAP) return "full";
  if (used + sends + 3 <= CONFIG.SUBREQUEST_FANOUT_CAP) return "lean";
  return "defer";
}

// The composer (Persian-first, the site's vocabulary — «گُل!» mirroring the
// «نتیجه نهایی»/«استراحت» headline shapes; score-side attribution only;
// NEVER scorer names or minutes the sweep data does not carry).
export function formatGoalAlert(match, lang, ev) {
  const en = lang === "en";
  const home = en ? match.homeTeam.name : translateTeam(match.homeTeam.name);
  const away = en ? match.awayTeam.name : translateTeam(match.awayTeam.name);
  const comp = en ? (COMP_EN[match.competition.code] || match.competition.code) : translateCompetition(match.competition.code);
  const head = en ? "\u26BD\uFE0F " + mdBold("GOAL!") : "\u26BD\uFE0F " + mdBold("\u06AF\u064F\u0644\u0021");
  const hStr = en ? String(ev.h) : toFaDigits(String(ev.h));
  const aStr = en ? String(ev.a) : toFaDigits(String(ev.a));
  let msg = head + "\n\n";
  msg += mdBold(home) + " \u{1F19A} " + mdBold(away) + "\n";
  msg += mdItalic(comp) + "\n";
  msg += (en ? "Score: " : "\u0646\u062A\u06CC\u062C\u0647: ") + mdBold(hStr + "-" + aStr);
  // score-side attribution (composed from the delta, never invented)
  const nStr = en ? String(ev.goals) : toFaDigits(String(ev.goals));
  if (ev.side === "home") {
    msg += "\n\u2734\uFE0F " + (ev.goals > 1
      ? (en ? nStr + " goals for " + home : nStr + " \u06AF\u0644 \u0628\u0631\u0627\u06CC " + home)
      : (en ? home + " scores" : "\u06AF\u0644\u0650 " + home));
  } else if (ev.side === "away") {
    msg += "\n\u2734\uFE0F " + (ev.goals > 1
      ? (en ? nStr + " goals for " + away : nStr + " \u06AF\u0644 \u0628\u0631\u0627\u06CC " + away)
      : (en ? away + " scores" : "\u06AF\u0644\u0650 " + away));
  } else {
    // both sides scored within the tick — the ORDER is not in the data, so
    // the alert credits both without inventing a sequence
    msg += "\n\u2734\uFE0F " + (en
      ? "Goals for " + home + " and " + away
      : "\u06AF\u0644\u0650 " + home + " \u0648 \u06AF\u0644\u0650 " + away);
  }
  return msg;
}

// ============================================================================
// The notify-phase hook (cron-notify.ts, right after detectStatusChanges).
// Never throws into the phase — the whole body is the caller's try/catch's
// child, and every store interaction here already fails closed on its own.
// ============================================================================
export async function detectGoalEvents(env: Env, matches) {
  const out = { events: 0, sent: 0, seeded: 0, deferred: 0, noChats: 0, pruned: 0 };
  const nowMs = Date.now();
  // Cheap gate first: build the candidate row set WITHOUT any read. An
  // empty candidate set on a quiet tick means ZERO extra KV reads.
  const emptyCur = buildGoalSnapshots(matches, null, nowMs);
  if (!Object.keys(emptyCur).length) return out;
  // One KV read (only on ticks with live-scored in-window matches).
  let prev = {};
  try {
    prev = await env.STATE.get(CONFIG.KV_GOAL_SNAPSHOTS, "json").catch(() => null) || {};
  } catch (e) {
    prev = {};
  }
  const cur = buildGoalSnapshots(matches, prev, nowMs);
  const keyOf = new Map();
  for (const m of Array.isArray(matches) ? matches : []) {
    if (m && m.competition && m.homeTeam && m.awayTeam) keyOf.set(matchKey(m), m);
  }
  const events = diffGoalEvents(cur, prev, (k) => keyOf.get(k) || null);
  out.seeded = Object.keys(cur).filter((k) => !prev[k]).length;
  if (!events.length) {
    await persistGoalSnapshots(env, cur, prev);
    return out;
  }
  // The audience (fetched only on event ticks): chats following EITHER side.
  let chatIds = [];
  let prefs = {};
  try {
    chatIds = await getRegisteredChats(env);
    prefs = await getUserPrefs(env);
  } catch (e) {
    console.warn("goal-alert: roster read failed (deferring all events): " + e.message);
    await persistGoalSnapshots(env, keepBaselines(cur, prev, events), prev);
    out.deferred = events.length;
    return out;
  }
  const notifiedMatches = await getNotifiedMatches(env).catch(() => null);
  if (!notifiedMatches) {
    // unreadable ledger: fail closed — no claims, baselines retained
    console.warn("goal-alert: notified ledger unreadable \u2014 deferring all events (fail-closed)");
    await persistGoalSnapshots(env, keepBaselines(cur, prev, events), prev);
    out.deferred = events.length;
    return out;
  }
  const deadChats = [];
  // audience-size first (the biggest blast protected by the cap), then the
  // heavier deltas — deterministic tiebreak by key.
  events.sort((a, b) => {
    const au = chatIds.filter((c) => userFollowsMatch(prefs, c, a.match)).length;
    const bu = chatIds.filter((c) => userFollowsMatch(prefs, c, b.match)).length;
    if (au !== bu) return bu - au;
    if (a.goals !== b.goals) return b.goals - a.goals;
    return a.key < b.key ? -1 : 1;
  });
  const done = new Set(); // keys fully processed (baseline may advance)
  for (const ev of events) {
    const matchChats = chatIds.filter((c) => userFollowsMatch(prefs, c, ev.match) !== null);
    if (!matchChats.length) { out.noChats++; done.add(ev.key); continue; }
    if (out.events >= (CONFIG.GOAL_ALERT_MAX_UNITS || 6)) { out.deferred++; continue; } // cap: baseline retained
    out.events++;
    const ntype = goalNtype(ev.h, ev.a);
    // already fired (a re-sweep / a snapshot-put failure aftermath)? advance.
    const key = ev.key;
    const prior = notifiedMatches[key] && notifiedMatches[key].some((n) => n && n.notificationType === ntype);
    if (prior) { done.add(key); continue; }
    const chatGroups = groupChatsByTz(matchChats, prefs, env);
    const verdict = goalFanoutVerdict(chatGroups);
    if (verdict === "defer") { out.deferred++; out.events--; continue; } // unclaimed, baseline retained
    const lean = verdict === "lean";
    // THE CLAIM (write-first, fail-closed): persisted ⟺ the send may run.
    const claimed = await saveNotifiedMatch(env, ev.match, ntype, notifiedMatches);
    if (!claimed) { out.deferred++; out.events--; continue; } // D1 error: no send, baseline retained
    console.log("\u26BD goal-alert: " + ev.key + " " + ev.ph + "-" + ev.pa + " \u2192 " + ev.h + "-" + ev.a + " (" + ev.side + ", " + matchChats.length + " chats, " + verdict + ")");
    const deliveries = [];
    for (const g of chatGroups) {
      const lang = g.lang || "fa";
      const scopedEnv: Env = { ...env, TEHRAN_TZ: g.tz };
      let message = "";
      try {
        message = formatGoalAlert(ev.match, lang, ev);
      } catch (e) {
        console.warn("goal-alert: formatter failed (" + ev.key + "): " + e.message);
        continue;
      }
      message = withChannelCta(message, env, lang);
      // cache-only card (the CPU-keeper law); lean = text-only for all
      let cardResults = [];
      let cardsAttempted = false;
      if (!lean && (ev.match.homeTeam.crest || ev.match.awayTeam.crest)) {
        try {
          const pngBuf = await cachedCardPng(scopedEnv, ev.match, lang);
          if (pngBuf) {
            cardsAttempted = true;
            const caption = message.length > 1024 ? message.slice(0, 1020) + "\u2026" : message;
            cardResults = await Promise.allSettled(
              g.chats.map((chatId) => sendPhotoBinary(scopedEnv, chatId, pngBuf, caption, true))
            );
            cardResults.forEach((r, i) => {
              if (r.status === "fulfilled" && r.value === "dead") deadChats.push(g.chats[i]);
            });
          }
        } catch (e) {
          console.warn("goal-alert: card send failed, text fallback: " + e.message);
        }
      }
      const needText = g.chats.filter((_c, i) => {
        if (!cardsAttempted) return true;
        const r = cardResults[i];
        return !(r.status === "fulfilled" && (r.value === true || r.value === "dead"));
      });
      // v13.69-cardfallback shape (the engine's own per-chat verdict law):
      // exactly the chats the card did not reach take the text fallback.
      let textResults: any[] = [];
      if (needText.length) {
        textResults = await Promise.allSettled(
          needText.map((chatId) => sendTelegram(scopedEnv, message, chatId))
        );
        textResults.forEach((r, i) => {
          if (r.status === "fulfilled" && r.value === "dead") deadChats.push(needText[i]);
        });
      }
      const cardOkCount = cardResults.filter((r) => r.status === "fulfilled" && r.value === true).length;
      const textOkCount = textResults.filter((r) => r.status === "fulfilled" && r.value === true).length;
      out.sent += cardOkCount + textOkCount;
      // the per-chat delivery ledger (the v13.102 discipline)
      for (let ci = 0; ci < g.chats.length; ci++) {
        const cr = cardsAttempted ? cardResults[ci] : null;
        const cardOk = cr && cr.status === "fulfilled" && cr.value === true;
        const cardDead = cr && cr.status === "fulfilled" && cr.value === "dead";
        if (cardOk) { deliveries.push({ chatId: g.chats[ci], verdict: "sent" }); continue; }
        if (cardDead) { deliveries.push({ chatId: g.chats[ci], verdict: "dead" }); continue; }
        const ti = needText.indexOf(g.chats[ci]);
        const tr = ti !== -1 ? textResults[ti] : null;
        if (tr && tr.status === "fulfilled" && tr.value === true) deliveries.push({ chatId: g.chats[ci], verdict: "sent" });
        else if (tr && tr.status === "fulfilled" && tr.value === "dead") deliveries.push({ chatId: g.chats[ci], verdict: "dead" });
        else deliveries.push({ chatId: g.chats[ci], verdict: "failed" });
      }
    }
    if (deliveries.length) await recordDeliveries(env, ev.match, ntype, deliveries).catch(() => null);
    done.add(ev.key);
  }
  if (deadChats.length) {
    const keep = chatIds.filter((c) => !deadChats.includes(c));
    try {
      await pruneChats(env, keep);
      out.pruned = deadChats.length;
    } catch (e) {
      console.warn("goal-alert: dead-chat prune failed: " + e.message);
    }
  }
  // THE SNAPSHOT WRITE (write-only-when-changed): rows whose events were
  // fully processed advance; deferred/failed ones keep the OLD baseline.
  const finalMap = {};
  for (const k of Object.keys(cur)) {
    const ev = events.find((e) => e.key === k);
    if (ev && !done.has(k) && prev[k]) { finalMap[k] = prev[k]; continue; }
    finalMap[k] = cur[k];
  }
  await persistGoalSnapshots(env, finalMap, prev);
  if (out.events || out.deferred) {
    console.log("\u26BD goal-alert tick: " + out.events + " event(s), " + out.sent + " sends, " + out.deferred + " deferred, " + out.noChats + " no-audience, seeded " + out.seeded);
  }
  return out;
}

// keepBaselines: the fail-closed map for a total deferral (roster/ledger
// unreadable) — every event's match keeps its OLD baseline.
function keepBaselines(cur, prev, events) {
  const out = {};
  for (const k of Object.keys(cur)) {
    const ev = events.find((e) => e.key === k);
    if (ev && prev[k]) { out[k] = prev[k]; continue; }
    out[k] = cur[k];
  }
  return out;
}

async function persistGoalSnapshots(env: Env, cur, prev) {
  const curJson = JSON.stringify(cur || {});
  if (curJson === JSON.stringify(prev || {})) return; // write-only-when-changed
  try {
    await env.STATE.put(CONFIG.KV_GOAL_SNAPSHOTS, curJson, { expirationTtl: 2 * 86400 });
  } catch (e) {
    // fail-closed: the send path already claimed in D1 (no double-send can
    // come from this), and unadvanced... every row we intended to advance is
    // now recomputed next tick with the D1 claims suppressing re-sends.
    console.warn("goal-alert: snapshot save failed (fail-closed; deltas re-derive next tick): " + e.message);
  }
}
