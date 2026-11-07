// SportSignal — the STATUS-CHANGE detection (detectStatusChanges): kickoff/
// HT/FT transitions vs the persisted status map (status_map_v6), fail-closed
// (alerts suppressed when the map save fails — v13.36-nospam). Extracted
// from notifications.ts in v13.77-digestnotify.
import { CONFIG } from "./config";
import { COMP_EN } from "./tables";
import type { Env } from "./types";
import { toFaDigits, escapeMarkdownCharacters } from "./utils";
// v13.106-mdstyle: entity builders (bold match header, italic competition).
import { mdBold, mdItalic } from "./md";
import { normalizeTeamName } from "./teams";
import { translateTeam, translateCompetition } from "./translate";
import { isBackfillEligible } from "./match-windows";
import { shouldSendNotification } from "./match-dedupe";
import { matchKey } from "./dedupe";
import { shouldNotify } from "./match-classify";
import { sendTelegram } from "./telegram";
import { getRegisteredChats, getUserPrefs, isMasterBigMatch } from "./users";
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
    // v12.x-cron-gaps: half-time (PAUSED) alerts for BIG matches only.
    // Tracked separately from postponement/cancellation alerts so they get
    // their own bilingual "HT: Team A [score] - [score] Team B" message
    // and only fire when a SCHEDULED/TIMED/IN_PLAY match first transitions
    // to PAUSED (HT). One fire per status transition (the KV status map
    // flips to PAUSED so a subsequent IN_PLAY \u2192 PAUSED, e.g. after extra
    // time, won't re-fire).
    const htAlerts = [];
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
      // v12.x-cron-gaps: PAUSED \u2192 half-time alert. BIG matches only.
      // Trigger only on the FIRST transition into PAUSED from a non-PAUSED
      // state (so we don't fire on every PAUSED\u2194IN_PLAY flicker).
      if (old && old !== status && status === "PAUSED" && old !== "PAUSED" && isMasterBigMatch(m)) {
        htAlerts.push({ m, status });
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
    // v12.x-cron-gaps: HT alerts broadcast to ALL registered chats (it's a
    // big-match highlight, not a per-team-follow event). Grouped by lang so
    // each user gets the HT message in their lang.
    // v13.37-nospam2: HT alerts share the same dedupe state (the status
    // map) — same fail-closed gate as the postponement/cancellation alerts.
    if (htAlerts.length && statusMapSaved) {
      const chats = await getRegisteredChats(env);
      const prefs = typeof getUserPrefs === "function" ? await getUserPrefs(env) : {};
      const langBuckets = new Map();
      for (const c of chats) {
        const p = prefs[String(c)] || {};
        const lng = p.lang === "en" ? "en" : "fa";
        if (!langBuckets.has(lng)) langBuckets.set(lng, []);
        langBuckets.get(lng).push(c);
      }
      for (const a of htAlerts) {
        const m = a.m;
        const home = m.homeTeam.name;
        const away = m.awayTeam.name;
        const sH = m.score && m.score.fullTime && m.score.fullTime.home != null ? m.score.fullTime.home : null;
        const sA = m.score && m.score.fullTime && m.score.fullTime.away != null ? m.score.fullTime.away : null;
        const comp = COMP_EN[m.competition.code] || m.competition.code;
        // v13.231-channelmirror: claim per HT alert, after statusMapSaved.
        let chClaim = null;
        try {
          chClaim = await claimChannelPost(env, channelEventKeyStatus(matchKey(m), "PAUSED"));
        } catch (e) {
          console.warn("channel-mirror: HT claim hook isolated: " + e.message);
        }
        for (const [lng, bucket] of langBuckets) {
          const en = lng === "en";
          const hName = en ? home : translateTeam(home);
          const aName = en ? away : translateTeam(away);
          const compName = en ? comp : translateCompetition(m.competition.code);
          const hStr = sH == null ? "?" : (en ? String(sH) : toFaDigits(String(sH)));
          const aStr = sA == null ? "?" : (en ? String(sA) : toFaDigits(String(sA)));
          const head = en ? "*Half time*" : "*\u0627\u0633\u062A\u0631\u0627\u062D\u062A*";
          const vs = en ? " - " : " \u2014 ";
          const msg = head + "\n\n\u26BD *" + escapeMarkdownCharacters(hName) + vs + escapeMarkdownCharacters(aName) + "*\n" + mdItalic(compName) + "\n*" + hStr + "\\-" + aStr + "*";
          await Promise.allSettled(bucket.map((c) => sendTelegram(env, withChannelCta(msg, env, lng), c)));
        }
        // v13.231-channelmirror: ONE fa/Asia-Tehran channel post per HT
        // alert (key :ht — the transition itself is the edition).
        if (chClaim) {
          await sendChannelPost(env, chClaim, async (chEnv, dest, chan) => {
            const hName = translateTeam(home);
            const aName = translateTeam(away);
            const compName = translateCompetition(m.competition.code);
            const hStr = sH == null ? "?" : toFaDigits(String(sH));
            const aStr = sA == null ? "?" : toFaDigits(String(sA));
            const chMsg = "*\u0627\u0633\u062A\u0631\u0627\u062D\u062A*\n\n\u26BD *" + escapeMarkdownCharacters(hName) + " \u2014 " + escapeMarkdownCharacters(aName) + "*\n" + mdItalic(compName) + "\n*" + hStr + "\\-" + aStr + "*";
            return await sendTelegram(chEnv, appendChannelFooter(chMsg), dest.chatId, null, chan);
          });
        }
      }
      console.log(`\u{1F680} HT alerts sent for ${htAlerts.length} big matches`);
    } else if (htAlerts.length && !statusMapSaved) {
      console.log("\u{1F507} " + htAlerts.length + " HT alert(s) deferred: dedupe map not persisted");
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

