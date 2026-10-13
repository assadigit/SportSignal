// SportSignal — the notification AUDIT (auditNotifications): compares the
// pool (ground truth) with notified_matches_v6 — reports worthy matches
// whose expected notification types never fired; alerts the admin when
// gaps exceed the threshold. Also served via /api/audit. Extracted from
// notifications.ts in v13.77-digestnotify.
import { CONFIG } from "./config";
import type { Env } from "./types";
import { toFaDigits } from "./utils";
import { matchKey } from "./dedupe";
import { translateTeam } from "./translate";
import { isMatchFinished } from "./match-model";
import { getNotifiedMatches } from "./match-dedupe";
import { shouldNotify } from "./match-classify";
import { sendTelegram } from "./telegram";

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
  const result = { total: worthy.length, gaps: gaps.length, details: gaps };
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

