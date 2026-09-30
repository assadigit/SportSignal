// SportSignal — monitoring & tick observability (split from cron.ts in
// v13.47-seams): the cron status blob reader (healthz/api source), the
// rate-limited phase-error alerter, and the live-pool fingerprint used by
// the prewarm gate.

import { CONFIG } from "./config";
import type { Env } from "./types";
import { escapeMarkdownCharacters } from "./utils";
import { sendTelegram } from "./telegram";

export async function getCronStatus(env: Env) {
  try {
    const s = await env.STATE.get("cron_status_v1", "json").catch(() => null);
    if (s && s.heartbeat) return s;
  } catch (e) {
  }
  const hb = parseInt(await env.STATE.get(CONFIG.KV_HEARTBEAT).catch(() => null)) || 0;
  const lc = parseInt(await env.STATE.get(CONFIG.KV_LAST_CRON).catch(() => null)) || 0;
  const src = await env.STATE.get(CONFIG.KV_LAST_SOURCE).catch(() => null);
  const lfs = parseInt(await env.STATE.get("last_full_sweep").catch(() => null)) || 0;
  return { heartbeat: hb ? String(hb) : "0", last_cron: lc ? String(lc) : "0", api_source: src || null, last_full_sweep: lfs ? String(lfs) : "0" };
}
// v13.36-nospam: rate-limited phase-error alert. The Sep 14 00:20→10:10 UTC
// outage (CF analytics: err=1 on EVERY cron tick for ~10h) was completely
// invisible — no log, no message, just a stale heartbeat. Now every guarded
// phase reports its failure to the admin chat (max 1 alert / 30min per
// isolate) so the NEXT outage is diagnosable from Telegram within minutes.
var LAST_ERR_ALERT = 0;
export async function alertPhaseError(env: Env, phase, err) {
  const msg = String(err && err.message || err || "unknown");
  console.error(`Cron phase [${phase}] failed: ${msg}`);
  const now = Date.now();
  if (now - LAST_ERR_ALERT < 30 * 6e4) return;
  LAST_ERR_ALERT = now;
  try {
    const adminChat = parseInt(env.CHAT_ID);
    if (!isNaN(adminChat)) {
      await sendTelegram(env, "\u26A0\uFE0F *\u062E\u0637\u0627\u06CC \u0632\u0645\u0627\u0646\u200C\u0628\u0646\u062F:* " + escapeMarkdownCharacters(phase) + "\n`" + escapeMarkdownCharacters(msg.slice(0, 160)) + "`", adminChat);
    }
  } catch (e) {
  }
}
// v13.43-cpukeeper: fingerprint of every live-ish match row (status +
// score + identity). Two lists with equal fingerprints carry identical live
// information — used to skip the ~100ms-CPU public-payload prewarm on live
// ticks where nothing actually changed (the common case: no goal since the
// last rebuild). Order-independent (sorted) so a merge re-ordering can't
// produce a false "changed".
export function liveFingerprint(list) {
  const parts = [];
  for (const m of list || []) {
    const st = String(m.status || "").toUpperCase();
    if (st !== "LIVE" && st !== "IN_PLAY" && st !== "PAUSED" && st !== "FINISHED") continue;
    const s = m.score && m.score.fullTime ? String(m.score.fullTime.home) + "-" + String(m.score.fullTime.away) : "n";
    parts.push(String(m.homeTeam && m.homeTeam.name) + "|" + String(m.awayTeam && m.awayTeam.name) + "|" + String(m.utcDate || "").slice(0, 10) + "|" + st + "|" + s);
  }
  parts.sort();
  return parts.join(";");
}
