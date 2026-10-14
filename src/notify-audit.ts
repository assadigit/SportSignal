// SportSignal — the notification AUDIT (auditNotifications): compares the
// pool (ground truth) with notified_matches_v6 — reports worthy matches
// whose expected notification types never fired; alerts the admin when
// gaps exceed the threshold. Also served via /api/audit. Extracted from
// notifications.ts in v13.77-digestnotify.
// v13.102-perchat: the audit ALSO checks PER-CHAT completeness now — every
// fired (match, type-group) must cover its audience with delivery-ledger
// rows (match-dedupe.ts recordDeliveries). The no-row chats (the CPU-kill
// mid-fan-out shape: the global dedupe record persisted, the tail chats
// got nothing, no outbox entry) are reported + paged (own 6h rate-limit)
// and handed to the repair leg (notify-engine.ts repairPerChatGaps) while
// the stage is still timely. Rows with verdict failed/dead/repair are
// visible in the /api/audit details but not paged (the outbox owns
// 'failed', the prune owns 'dead', the marker owns 'repair').
import { CONFIG } from "./config";
import type { Env } from "./types";
import { toFaDigits, escapeMarkdownCharacters } from "./utils";
import { matchKey } from "./dedupe";
import { translateTeam } from "./translate";
import { isMatchFinished } from "./match-model";
import { getNotifiedMatches, fetchDeliveryLedger, deliveriesActive } from "./match-dedupe";
import { shouldNotify } from "./match-classify";
import { sendTelegram } from "./telegram";
import { getRegisteredChats, getUserPrefs, userFollowsMatch } from "./users";
// v13.92-d1userstore: profiles (join dates) via the seam — a chat that
// joined AFTER a stage fired is not expected to have its row.
import { chatProfilesAll } from "./user-store";

// v13.102-perchat: only stages fired after this epoch are audited per-chat
// (no delivery rows exist before it — every older record would false-gap).
const PERCHAT_EPOCH_MS = Date.parse("2026-10-15T00:00:00Z");

// The equivalent-type groups: followers get the regular type, non-followers
// the -big broadcast — a chat is served iff ANY type in the group delivered.
const PERCHAT_TYPE_GROUPS = [
  ["pre-match-72h"],
  ["pre-match-24h"],
  ["pre-match-3h"],
  ["pre-match-1h"],
  ["pre-match-5min"],
  ["match-start", "match-start-big"],
  ["result", "result-big"]
];

async function auditPerChat(env: Env, worthy, notified, now) {
  const gaps = [];
  if (!deliveriesActive(env)) return gaps;
  const chatIds = await getRegisteredChats(env);
  if (!chatIds || !chatIds.length) return gaps;
  const prefs = await getUserPrefs(env);
  let profiles = {};
  try {
    profiles = await chatProfilesAll(env);
  } catch (e) { }
  // 1h of slack over the 48h audit window: a stage fired exactly 48h ago is
  // still audited (now - firedAt > 48h is false at the boundary) while the
  // ledger's default read (sent_at > now-48h) would exclude its rows at the
  // same instant — the check-lifecycle 12:10Z run caught that exact false
  // page. Read wider than the audit window, never narrower.
  const ledger = await fetchDeliveryLedger(env, now - 49 * 36e5);
  for (const m of worthy) {
    const key = matchKey(m);
    const recs = notified[key] || [];
    if (!recs.length) continue;
    for (const grp of PERCHAT_TYPE_GROUPS) {
      const fired = grp.filter((t) => recs.find((r) => r.notificationType === t));
      if (!fired.length) continue;
      const firedAt = Math.min(...fired.map((t) => (recs.find((r) => r.notificationType === t) || {}).notifiedAt || 0));
      if (!firedAt || firedAt < PERCHAT_EPOCH_MS) continue;
      if (now - firedAt > 48 * 36e5) continue;
      // Audience = union over the FIRED types (followers for the regular
      // types, both-sides followers for the big-match-only pre types,
      // non-followers for the -big broadcasts).
      const audience = new Set();
      for (const t of fired) {
        if (t.endsWith("-big")) {
          for (const c of chatIds) if (!userFollowsMatch(prefs, c, m)) audience.add(c);
        } else if (t === "pre-match-72h" || t === "pre-match-5min") {
          for (const c of chatIds) if (userFollowsMatch(prefs, c, m) === "both") audience.add(c);
        } else {
          for (const c of chatIds) if (userFollowsMatch(prefs, c, m)) audience.add(c);
        }
      }
      const expected = [...audience].filter((c) => {
        const prof = profiles[String(c)];
        const joined = prof && prof.joined ? new Date(prof.joined).getTime() : 0;
        return !joined || joined <= firedAt + 36e5;
      });
      // Coverage = a ledger row of ANY verdict for one of the fired types:
      // 'sent' delivered, 'dead' pruned, 'failed' outbox-owned, 'repair'
      // attempted-once. The PAGE-worthy gap is a chat with NO row at all —
      // the CPU-kill shape (nothing ran, nothing was recorded). Verdict
      // detail stays visible via /api/audit's raw ledger, not here.
      const covered = new Set();
      for (const t of fired) {
        const map = ledger[key + "|" + t];
        if (map) for (const cid of map.keys()) covered.add(cid);
      }
      const missing = expected.filter((c) => !covered.has(c));
      if (missing.length) {
        gaps.push({
          matchKey: key,
          match: translateTeam(m.homeTeam.name) + " vs " + translateTeam(m.awayTeam.name),
          kickoff: m.utcDate,
          // the BASE type (repair formatter + window); 'fired' carries the
          // whole group so the repair marks the right ledger bucket.
          ntype: grp[0].replace(/-big$/, ""),
          fired,
          missing
        });
      }
    }
  }
  return gaps;
}

// v13.23-audit: compare sportsignal.ir match data (ground truth) with the
// bot's notified_matches_v6 KV. For each worthy match whose kickoff has
// passed, checks that the expected notification types fired. Reports gaps.
// Called from cron after sendMatchNotifications. Also available via
// /api/audit (admin endpoint) for on-demand checks.
export async function auditNotifications(env: Env, matches) {
  const now = Date.now();
  const notified = await getNotifiedMatches(env);
  const worthy = (matches || []).filter(shouldNotify);
  const gaps = [];
  for (const m of worthy) {
    const ko = new Date(m.utcDate).getTime();
    const minSince = (now - ko) / 60000;
    const hoursSince = (now - ko) / CONFIG.ONE_HOUR_MS;
    const key = matchKey(m);
    const sent = notified[key] || [];
    const sentTypes = new Set(sent.map((n) => n.notificationType));
    // Expected notifications based on how long ago kickoff was:
    // - >24h ago: 24h, 3h, 1h, match-start (if not finished)
    // - FINISHED + >6h ago: 24h, 3h, 1h, match-start, result
    const expected = [];
    if (hoursSince > 24) expected.push("pre-match-24h");
    if (hoursSince > 3.5) expected.push("pre-match-3h");
    if (hoursSince > 1.5) expected.push("pre-match-1h");
    if (minSince > 20) expected.push("match-start");
    if (isMatchFinished(m) && hoursSince > CONFIG.POST_MATCH_NOTIFICATION_HOURS) expected.push("result");
    // Check for missing types (exclude big-match-only types for non-big matches)
    const missing = expected.filter((t) => !sentTypes.has(t) && t !== "pre-match-72h" && t !== "pre-match-5min");
    if (missing.length) {
      gaps.push({
        match: translateTeam(m.homeTeam.name) + " vs " + translateTeam(m.awayTeam.name),
        kickoff: m.utcDate,
        status: m.status,
        missing: missing,
        key: key
      });
    }
  }
  const result = { total: worthy.length, gaps: gaps.length, details: gaps, perChatGaps: [] as any[] };
  // v13.102-perchat: the per-chat completeness pass (audience vs the
  // delivery ledger) — runs after the per-match pass so one /api/audit call
  // answers both "did it fire?" and "did everyone actually receive it?".
  try {
    result.perChatGaps = await auditPerChat(env, worthy, notified, now);
  } catch (e: any) {
    console.warn("per-chat audit pass failed: " + e.message);
  }
  if (result.perChatGaps.length) {
    console.log(`\u26A0\uFE0F Per-chat audit: ${result.perChatGaps.length} stage(s) missing delivery rows`);
    for (const g of result.perChatGaps.slice(0, 5)) {
      console.log(`   ${g.match} (${g.ntype}) — no row for chat(s): ${g.missing.join(", ")}`);
    }
    // Page the admin (rate-limited 6h, own stamp — the per-match alert's
    // key must not absorb this one): every no-row gap is either repaired
    // in-window by the next step or a permanent miss the owner should see.
    const adminChat = parseInt(env.CHAT_ID);
    const stamp = await env.STATE.get("perchat_alert_v1", "json").catch(() => null);
    const lastTs = stamp && stamp.ts ? stamp.ts : 0;
    if (!isNaN(adminChat) && Date.now() - lastTs > 6 * CONFIG.ONE_HOUR_MS) {
      const lines = result.perChatGaps.slice(0, 6).map((g) =>
        `\u2022 ${escapeMarkdownCharacters(g.match)} \\(${escapeMarkdownCharacters(g.ntype)}\\) \u2014 ${toFaDigits(String(g.missing.length))} \u0686\u062A \u0628\u062F\u0648\u0646 \u0631\u062F\u06CC\u0641 \u062A\u062D\u0648\u06CC\u0644`).join("\n");
      await sendTelegram(env, "\u{1F527} *\u06AF\u0632\u0627\u0631\u0634 \u062A\u062D\u0648\u06CC\u0644 \u062F\u0631 \u0633\u0637\u062D \u0686\u062A*\n\n" + lines, adminChat).catch(() => {});
      await env.STATE.put("perchat_alert_v1", JSON.stringify({ ts: Date.now() }), { expirationTtl: 2 * 86400 }).catch(() => {});
    }
  } else if (deliveriesActive(env)) {
    console.log(`\u2705 Per-chat audit: every fired stage of the last 48h covers its audience`);
  }
  if (gaps.length) {
    console.log(`\u26A0\uFE0F Audit: ${gaps.length} notification gaps found out of ${worthy.length} worthy matches`);
    for (const g of gaps.slice(0, 5)) {
      console.log(`   ${g.match} (${g.kickoff}) — missing: ${g.missing.join(", ")}`);
    }
    // Alert the admin if there are significant gaps (more than 2).
    // v13.37-nospam2: RATE-LIMITED. Gaps can legitimately persist for hours
    // (a provider drops a finished match from the pool; a type the audit
    // expects but reality never sends) — the old code alerted the admin on
    // EVERY tick while gaps > 2 (up to 144 alerts/day: the bot spammed its
    // own admin). One alert / 6h max, stamped in KV.
    if (gaps.length > 2) {
      const adminChat = parseInt(env.CHAT_ID);
      const stamp = await env.STATE.get(CONFIG.KV_AUDIT_ALERT, "json").catch(() => null);
      const lastTs = stamp && stamp.ts ? stamp.ts : 0;
      if (!isNaN(adminChat) && Date.now() - lastTs > 6 * CONFIG.ONE_HOUR_MS) {
        const summary = gaps.slice(0, 10).map((g) => `\u2022 ${g.match} \\- missing: ${g.missing.join(", ")}`).join("\n");
        await sendTelegram(env, "\u26A0\uFE0F *\u06AF\u0632\u0627\u0631\u0634 \u0628\u0627\u0632\u0628\u06CC\u0646\u06CC*\n\n" + toFaDigits(String(gaps.length)) + " \u0646\u0648\u0639\u06CC\u0641\u06CC\u06A9\u06CC\u0646 \u0646\u0627\u0642\u0635 \\(" + toFaDigits(String(worthy.length)) + " \u0645\u0633\u0627\u0628\u0642\u0627\u062A\\)\n\n" + summary, adminChat).catch(() => {});
        await env.STATE.put(CONFIG.KV_AUDIT_ALERT, JSON.stringify({ ts: Date.now() }), { expirationTtl: 2 * 86400 }).catch(() => {});
      }
    }
  } else {
    console.log(`\u2705 Audit: all ${worthy.length} worthy matches have complete notifications`);
  }
  return result;
}

