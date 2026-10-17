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

// v13.111-quotaslim: the pool's freshness + row count WITHOUT the parse.
// /healthz and the admin /status card used to JSON.parse the ENTIRE pool
// blob (617KB / 707 rows pre-slim — the single biggest CPU sink on any
// invocation that touched it; with uptime monitors polling healthz every
// few minutes this was a standing CPU-limit killer). The blob's shape is
// a live contract ({fetchedAt, source, matches[]}, every row carrying
// exactly one "utcDate") — a text scan answers both questions for ~1-3ms
// instead of a 20-40ms parse, and stays correct after row slimming.
export async function getPoolMetaCheap(env: Env) {
  try {
    const text = await env.STATE.get(CONFIG.KV_MATCHES_KEY).catch(() => null);
    if (!text || typeof text !== "string") return { ageMin: -1, matches: 0 };
    const i = text.indexOf('"fetchedAt":"');
    if (i < 0) return { ageMin: -1, matches: 0 };
    const m = /"fetchedAt":"([^"]+)"/.exec(text.slice(i, i + 80));
    const t = m ? Date.parse(m[1]) : NaN;
    let n = 0;
    const re = /"utcDate":/g;
    while (re.exec(text) !== null) n++;
    return { ageMin: isNaN(t) ? -1 : Math.round((Date.now() - t) / 6e4), matches: n };
  } catch (e) {
    return { ageMin: -1, matches: 0 };
  }
}

// v13.111-quotaslim: the day's TRUE KV-write burn = the cron accumulator
// (cron_status_v1.kv_writes_day — ticks only) + the web counter
// (kv_writes_web_v1 — visitor rebuilds, SEO venue caches, webhook writes,
// CI-crawl writes; see kv-webmeter.ts). The governor, healthz, the admin
// card and the public rebuild guard all decide on THIS sum so web-side
// bursts can no longer burn the quota invisibly (2026-10-14: 1,273 writes
// with the cron meter reporting a healthy fraction).
export async function getDailyWrites(env: Env) {
  const day = new Date().toISOString().slice(0, 10);
  let cronN = 0;
  let webN = 0;
  let st: any = null;
  try {
    st = await getCronStatus(env);
  } catch (e) { }
  if (st && st.kv_day === day) cronN = parseInt(st.kv_writes_day) || 0;
  try {
    const w = await env.STATE.get("kv_writes_web_v1", "json").catch(() => null);
    if (w && w.d === day) webN = parseInt(w.n) || 0;
  } catch (e) { }
  return { cron: cronN, web: webN, total: cronN + webN };
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
