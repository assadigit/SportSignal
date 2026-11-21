// SportSignal — the STATUS-CHANGE detection (detectStatusChanges): kickoff/
// HT/FT transitions vs the persisted status map (status_map_v6), fail-closed
// (alerts suppressed when the map save fails — v13.36-nospam). Extracted
// from notifications.ts in v13.77-digestnotify.
// v13.276-slim (A2): the HT (PAUSED) alert path is REMOVED — the
// owner-approved live strip. The status map STILL records PAUSED (the
// transition history is intact — a later re-add would not re-fire old
// transitions), and the channel-mirror :ht key mapping stays in
// channel-mirror.ts; only the HT detection + fan-out + channel post are
// gone. POSTPONED/CANCELLED alerts are untouched. Rollback: revert this
// commit.
import { CONFIG } from "./config";
import { COMP_EN } from "./tables";
import type { Env } from "./types";
// v13.106-mdstyle: entity builders (bold match header, italic competition).
import { mdBold, mdItalic } from "./md";
import { normalizeTeamName } from "./teams";
import { translateTeam, translateCompetition } from "./translate";
import { isBackfillEligible } from "./match-windows";
import { shouldSendNotification } from "./match-dedupe";
import { matchKey } from "./dedupe";
import { shouldNotify } from "./match-classify";
import { sendTelegram } from "./telegram";
import { getRegisteredChats, getUserPrefs } from "./users";
// v13.231-channelmirror: the Session-2 hook primitives (DISCOVERY §7.4.3) —
// per alert, after statusMapSaved (the alerts' own fail-closed gate), keys
// via channelEventKeyStatus (POSTPONED/CANCELLED → their own, PAUSED → :ht).
import { claimChannelPost, sendChannelPost, channelEventKeyStatus, appendChannelFooter, withChannelCta } from "./channel-mirror";

export async function detectStatusChanges(env: Env, matches) {
  try {
    const prev = await env.STATE.get(CONFIG.KV_MATCH_STATUS, "json") || {};
    const cur = {};
    const now = Date.now();
    const alerts = [];
    // v13.276-slim (A2): the HT (PAUSED) alert track — the HT array,
    // the first-transition-into-PAUSED detection and the big-match HT
    // fan-out (private buckets + the :ht channel post) — is REMOVED. The
    // status map below still records PAUSED like every other status, so a
    // POSTPONED/CANCELLED transition from a paused match keeps working and
    // a future re-add sees an accurate transition history.
    for (const m of matches) {
      if (!shouldNotify(m)) continue;
      const t = new Date(m.utcDate).getTime();
      if (t < now - 3 * 864e5 || t > now + 10 * 864e5) continue;
      const status = m.status || "SCHEDULED";
      const key = normalizeTeamName(m.homeTeam.name) + "|" + normalizeTeamName(m.awayTeam.name) + "|" + m.competition.code;
      cur[key] = status;
      const old = prev[key];
      if (old && old !== status && (status === "POSTPONED" || status === "CANCELLED") && (old === "SCHEDULED" || old === "TIMED" || old === "POSTPONED")) {
        alerts.push({ m, status });
      }
    }
    // v13.38-qc: WRITE-ONLY-WHEN-CHANGED. The status map was put EVERY tick
    // (144 writes/day) even when the pool was the stale KV cache and cur was
    // byte-identical to prev — quiet ticks can't produce transitions (same
    // stale statuses), so the write was pure churn against the 1,000/day
    // quota. The meter measured it; this kills it.
    let statusMapSaved = false;
    const curJson = JSON.stringify(cur);
    if (curJson === JSON.stringify(prev)) {
      statusMapSaved = true;
    } else {
      try {
        await env.STATE.put(CONFIG.KV_MATCH_STATUS, curJson, { expirationTtl: 14 * 86400 });
        statusMapSaved = true;
      } catch (e) {
        console.error("Status map KV save failed — suppressing status-change alerts this tick (fail-closed anti-spam)");
      }
    }
    if (alerts.length && !statusMapSaved) {
      console.log("\u{1F507} " + alerts.length + " status-change alert(s) deferred: dedupe map not persisted");
    }
    if (alerts.length && statusMapSaved) {
      const chats = await getRegisteredChats(env);
      // v12.x-bilingual-bot: send the alert in each user's lang.
      const prefs = typeof getUserPrefs === "function" ? await getUserPrefs(env) : {};
      const langBuckets = new Map();
      for (const c of chats) {
        const p = prefs[String(c)] || {};
        const lng = p.lang === "en" ? "en" : "fa";
        if (!langBuckets.has(lng)) langBuckets.set(lng, []);
        langBuckets.get(lng).push(c);
      }
      for (const a of alerts) {
        // v13.231-channelmirror (DISCOVERY §7.4.3): claim the channel copy
        // per alert, AFTER statusMapSaved — the map is the alerts' own
        // write-first gate; one post per (match, transition), ever.
        let chClaim = null;
        try {
          chClaim = await claimChannelPost(env, channelEventKeyStatus(matchKey(a.m), a.status));
        } catch (e) {
          console.warn("channel-mirror: status claim hook isolated: " + e.message);
        }
        for (const [lng, bucket] of langBuckets) {
          const en = lng === "en";
          const home = en ? a.m.homeTeam.name : translateTeam(a.m.homeTeam.name);
          const away = en ? a.m.awayTeam.name : translateTeam(a.m.awayTeam.name);
          const comp = en ? (COMP_EN[a.m.competition.code] || a.m.competition.code) : translateCompetition(a.m.competition.code);
          const vs = en ? " vs " : " \u{1F19A} ";
          const teams = mdBold(home) + vs + mdBold(away) + " \u2014 " + mdItalic(comp);
          const msg = a.status === "CANCELLED"
            ? (en ? "\u274C *Match cancelled:* " + teams : "\u274C *\u0628\u0627\u0632\u06CC \u0644\u063A\u0648 \u0634\u062F:* " + teams)
            : (en ? "*Match postponed:* " + teams : "\u{1F550} *\u0628\u0627\u0632\u06CC \u0628\u0647 \u062A\u0639\u0648\u06CC\u0642 \u0627\u0641\u062A\u0627\u062F:* " + teams);
          await Promise.allSettled(bucket.map((c) => sendTelegram(env, withChannelCta(msg, env, lng), c)));
        }
        // v13.231-channelmirror: ONE fa/Asia-Tehran channel post per alert,
        // after the private buckets — the same composition the fa bucket
        // received (the channel is one more (Asia/Tehran, fa) group that
        // always exists — DISCOVERY §7.5) + the required footer links.
        if (chClaim) {
          await sendChannelPost(env, chClaim, async (chEnv, dest, chan) => {
            const home = translateTeam(a.m.homeTeam.name);
            const away = translateTeam(a.m.awayTeam.name);
            const comp = translateCompetition(a.m.competition.code);
            const teams = mdBold(home) + " \u{1F19A} " + mdBold(away) + " \u2014 " + mdItalic(comp);
            const chMsg = a.status === "CANCELLED"
              ? "\u274C *\u0628\u0627\u0632\u06CC \u0644\u063A\u0648 \u0634\u062F:* " + teams
              : "\u{1F550} *\u0628\u0627\u0632\u06CC \u0628\u0647 \u062A\u0639\u0648\u06CC\u0642 \u0627\u0641\u062A\u0627\u062F:* " + teams;
            return await sendTelegram(chEnv, appendChannelFooter(chMsg), dest.chatId, null, chan);
          });
        }
      }
    }
  } catch (e) {
    console.error("Status change detection failed: " + e.message);
  }
}

// (v13.9-reliability #1's reconcileSchedules was REMOVED in v13.43-cpukeeper:
// it wrote sched_v1:* schedule records whose `sent` map was NEVER updated and
// which NOTHING ever read back for firing — the fire-leg was never built, so
// the records were a pure decoy (one KV read per worthy match per tick,
// ~174 reads/tick ≈ 35-90ms CPU the free-plan 10ms budget couldn't afford).
// Recovery is covered for real by the isBackfillEligible legs in
// shouldSendNotification/sendNotificationIfNeeded (every type incl.
// match-start, v13.42) + the dead-letter outbox. Stale sched_v1:* keys expire
// via their own 7-day TTL.)

