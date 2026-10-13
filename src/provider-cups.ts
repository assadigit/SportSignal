// SportSignal — the domestic-cup scans: the big-team team-view scan
// (maybeScanCupFixtures, marker cup_scan_v1) + the far-cup probe
// (probeCupFarFixtures, marker cup_far_scan_v1, own 4-hourly cron). Cup
// rows land in the pool via match-pool's cacheMatches. Extracted from
// providers.ts in v13.74-providersplit.
import { CONFIG } from "./config";
import { PROVIDER_LEAGUE_MAP, SPORTSCORE_SLUGS, CUP_TEAM_TSP_IDS } from "./tables";
import type { Env } from "./types";
import { fetchJSON } from "./utils";
import { matchKey } from "./dedupe";
import { tspEventToMatch } from "./provider-tsp";
import { sportScoreDay } from "./provider-sportscore";
import { cacheMatches } from "./match-pool";

// v13.50-cupscan: the domestic-cup team scan. Root cause it closes:
// TSP's LEAGUE views regressed (eventsnextleague/eventspastleague return
// exactly ONE event per league now — the Premier League control verified
// the same) and sportscore's efl-cup feed is empty, so big-team cup ties
// never entered the pool (the missed Liverpool-Tottenham EFL Cup R32,
// 2026-09-15). The TEAM view (eventsnext.php?id=<teamId>) is the reliable
// free surface: full fixture list + live scores + strStatus.
//
// Semantics:
//  - runs on NON-sweep ticks only (a full sweep already burns ~42/48 of
//    the fetch budget); the next quiet/live tick picks it up within 10 min.
//  - marker cup_scan_v1: "ok:<ts>" skips for CUP_SCAN_TTL_MS; "fail:<ts>"
//    backs off 30 min. HOT window: a tracked EFL_CUP/FA_CUP match within
//    [-1h, +4h] of kickoff re-scans at most every CUP_SCAN_HOT_TTL_MS so
//    live score/status (and FT) flow into the pool at near-tick cadence.
//  - ADD: fixtures not in the pool (matchKey dedupe) are merged into the
//    pool + this tick's in-memory list -> pre-match windows fire.
//  - UPDATE: an existing pool row whose status/score changed is refreshed
//    (pool + in-memory) -> status-change detection -> result alerts.
//  - scores only stored when in-play/finished (TSP shows 0-0 pre-kickoff —
//    same rule the sportscore path applies).
//  - empty pool = skip (wait for the first full sweep to seed it).
export async function maybeScanCupFixtures(env: Env, matches, poolRef) {
  const now = Date.now();
  let marker = null;
  try { marker = await env.STATE.get(CONFIG.KV_CUP_SCAN_KEY).catch(() => null); } catch (e) { }
  if (marker) {
    const parts = String(marker).split(":");
    const ts = parseInt(parts[1]) || 0;
    if (parts[0] === "fail" && now - ts < 30 * 60e3) return { added: 0, updated: 0 };
    if (parts[0] === "ok" && now - ts < CONFIG.CUP_SCAN_TTL_MS) {
      const hot = Array.isArray(poolRef) && poolRef.some((m) => {
        const code = m && m.competition && m.competition.code;
        if (code !== "EFL_CUP" && code !== "FA_CUP") return false;
        const ko = m.utcDate ? new Date(m.utcDate).getTime() : 0;
        if (!ko) return false;
        return ko - now < 3600e3 && now - ko < 4 * 3600e3;
      });
      if (!hot || now - ts < CONFIG.CUP_SCAN_HOT_TTL_MS) return { added: 0, updated: 0 };
    }
  }
  const pool = Array.isArray(poolRef) ? poolRef : [];
  if (!pool.length) return { added: 0, updated: 0 };
  const seenKeys = new Set();
  const updateByKey = new Map();
  const added = [];
  let calls = 0, okCalls = 0;
  for (const [teamName, tspId] of Object.entries(CUP_TEAM_TSP_IDS)) {
    try {
      if (calls) await new Promise((r) => setTimeout(r, 1200));
      calls++;
      const data = await fetchJSON("https://www.thesportsdb.com/api/v1/json/3/eventsnext.php?id=" + tspId);
      okCalls++;
      for (const e of data && data.events || []) {
        if ((e.strSport || "").toLowerCase() !== "soccer") continue;
        const code = String(e.idLeague) === "4570" ? "EFL_CUP" : PROVIDER_LEAGUE_MAP[e.strLeague];
        if (code !== "EFL_CUP" && code !== "FA_CUP") continue;
        const m = cupEventToMatch(e, code);
        if (!m.utcDate) continue;
        const k = matchKey(m);
        if (!seenKeys.has(k)) {
          seenKeys.add(k);
          const row = pool.find((x) => matchKey(x) === k);
          if (row) {
            if (row.status !== m.status || JSON.stringify(row.score || null) !== JSON.stringify(m.score || null)) {
              updateByKey.set(k, m);
            }
          } else {
            added.push(m);
          }
        }
      }
    } catch (e) {
      console.error("\u{1F3C6} Cup scan " + teamName + " failed: " + e.message);
    }
  }
  if (added.length || updateByKey.size) {
    // persist into the POOL (never the live-sweep in-memory merge — the
    // 13.43 invariant: quiet/live ticks don't persist live-merged views)
    const poolOut = pool.map((m) => {
      const u = updateByKey.get(matchKey(m));
      return u ? Object.assign({}, m, { status: u.status, score: u.score }) : m;
    }).concat(added);
    await cacheMatches(env, poolOut, "cupscan");
    // apply to this tick's in-memory view so notifications see it NOW
    for (const a of added) matches.push(a);
    for (const [k, u] of updateByKey) {
      const i = matches.findIndex((m) => matchKey(m) === k);
      if (i >= 0) matches[i] = Object.assign({}, matches[i], { status: u.status, score: u.score });
    }
  }
  try {
    await env.STATE.put(CONFIG.KV_CUP_SCAN_KEY, (okCalls > 0 ? "ok:" : "fail:") + now, { expirationTtl: Math.ceil(CONFIG.CUP_SCAN_TTL_MS / 1e3) + 600 });
  } catch (e) {
  }
  return { added: added.length, updated: updateByKey.size };
}
// cupEventToMatch: the team-view event mapper. Same field mapping as
// tspEventToMatch plus the LIVE status vocabulary TSP's team view carries
// (strStatus: NS/1H/HT/2H/ET/FT/...) — the league-view mapper only knows
// finished|completed and would report a 2H match as SCHEDULED.
function cupEventToMatch(e, code) {
  const base = tspEventToMatch(e, code);
  const st = String(e.strStatus || "").toUpperCase();
  if (["1H", "2H", "ET", "BT", "LIVE"].indexOf(st) !== -1) base.status = "LIVE";
  else if (st === "HT") base.status = "PAUSED";
  else if (["FT", "AET", "PEN"].indexOf(st) !== -1) base.status = "FINISHED";
  else if (st === "NS") base.status = "SCHEDULED";
  if (base.status === "LIVE" || base.status === "PAUSED" || base.status === "FINISHED") {
    base.score = { fullTime: { home: parseInt(e.intHomeScore) || 0, away: parseInt(e.intAwayScore) || 0 } };
  } else {
    base.score = null;
  }
  return base;
}
// v14.0.5-cupgap: the FAR CUP PROBE — its OWN scheduled invocation (cron
// trigger "27 */4 * * *", see wrangler.toml + the api.ts scheduled branch).
// Two cups have schedules upstream that the ±1d day-sweep can never see
// between matchdays:
//   - ECL: league-phase matchdays are THURSDAYS (next: Oct 22 — 18 games
//     live-verified on the sportscore slug). No TSP id exists for the
//     Conference League on the free tier (probed 4470-4505; team
//     next-event views don't carry ECL fixtures either — verified via
//     Zalgiris/Kairat). EL sees far ahead via TSP 4481; ECL needs this
//     probe.
//   - HAZFI_CUP: the slug exists in SPORTSCORE_SLUGS but was deliberately
//     left out of the near-scan; when a round IS announced the box would
//     stay "برنامه‌ای هنوز اعلام نشده" forever without a probe. A coarse
//     +3/+7/+12/+17d grid catches an announced round within ~3 days
//     (announcements run ≥1 week ahead).
// WHY A DEDICATED INVOCATION: the 2026-10-11T04:31Z incident — the full
// sweep's own fan-out (FD intl + 27 sportscore day calls + KV ops, which
// the code's fetch-only meter undercounts) already rides Cloudflare's
// per-invocation subrequest ceiling; running the probe's 7 calls inside
// the same invocation starved the day sweep's tail ("Too many
// subrequests" on the last slug-days AND the first probe call). This lean
// path uses ~10 subrequests total and never collides with a tick (minute
// 27 — the :20 tick is done by ~:22, the :30 tick hasn't started).
// 7 fetches × 6 runs/day = 42 unmetered-slug calls/day; the pool write
// rides cacheMatches' change-only + canonDedupe logic.
export async function probeCupFarFixtures(env: Env) {
  // due-gate: shared by BOTH entry points (the quiet-tick phase in cron.ts
  // and the lean "27 */4" cron branch in api.ts) — the KV marker means only
  // one run per CUP_FAR_SCAN_MS window regardless of which fires first.
  // A total fetch failure writes a short 30-min fail marker (retry sooner).
  try {
    const marker = await env.STATE.get(CONFIG.KV_CUP_FAR_SCAN).catch(() => null);
    if (marker) return { added: 0, scanned: 0, skipped: true };
  } catch (e) {
    // KV read hiccup — proceed (worst case: an extra probe run)
  }
  const blob = await env.STATE.get(CONFIG.KV_MATCHES_KEY, "json").catch(() => null);
  const pool = blob && Array.isArray(blob.matches) ? blob.matches : [];
  if (!pool.length) return { added: 0, scanned: 0 };
  // seed the sportscore-format dedupe keys from the pool rows so the probe
  // can't double-add a fixture the day-sweep already carries
  const seen = new Set();
  for (const m of pool) {
    if (m && m.competition && m.competition.code && m.homeTeam && m.awayTeam && m.utcDate) {
      seen.add(m.competition.code + "|" + m.homeTeam.name + "|" + m.awayTeam.name + "|" + m.utcDate.slice(0, 16));
    }
  }
  const acc = { list: pool.slice(), seen };
  const nextDow = (dow, offsetDays) => {
    const d = new Date(Date.now() + offsetDays * 864e5);
    const cur = d.getUTCDay();
    d.setUTCDate(d.getUTCDate() + ((dow - cur + 7) % 7 || 7));
    return d.toISOString().split("T")[0];
  };
  // ECL: league-phase matchdays are THURSDAYS. DFB_POKAL: German cup rounds
  // are Tue/Wed midweek (R2 = Oct 27/28) — and TSP (the primary DFB source
  // since v14.0.5) rate-limits on the shared free key for hours at a time,
  // so the probe doubles as its backup. HAZFI_CUP: unknown cadence — a
  // coarse ~5-day grid (announcements run ≥1 week ahead).
  const probe = [
    { code: "ECL", slug: SPORTSCORE_SLUGS.ECL, dates: [nextDow(4, 1), nextDow(4, 8), nextDow(4, 15)] },
    { code: "DFB_POKAL", slug: "dfb-pokal", dates: [nextDow(2, 1), nextDow(2, 8), nextDow(2, 15), nextDow(3, 1), nextDow(3, 8), nextDow(3, 15)] },
    { code: "HAZFI_CUP", slug: SPORTSCORE_SLUGS.HAZFI_CUP, dates: [3, 7, 12, 17].map((n) => new Date(Date.now() + n * 864e5).toISOString().split("T")[0]) }
  ];
  let added = 0, scanned = 0, failed = 0;
  for (const p of probe) {
    for (const dateStr of p.dates) {
      try {
        added += await sportScoreDay(p.code, p.slug, dateStr, acc);
        scanned++;
      } catch (e) {
        failed++;
        console.error(`\u274C far cup probe ${p.code} ${dateStr} failed: ${e.message}`);
      }
    }
  }
  console.log(`\u{1F50D} far cup probe: ${scanned} dates ok, ${failed} failed, ${added} fixtures added (pool ${acc.list.length})`);
  if (added > 0) await cacheMatches(env, acc.list, "cupfarscan");
  try {
    const allFailed = scanned === 0 && failed > 0;
    await env.STATE.put(CONFIG.KV_CUP_FAR_SCAN, String(Date.now()), { expirationTtl: allFailed ? 1800 : Math.ceil(CONFIG.CUP_FAR_SCAN_MS / 1e3) });
  } catch (e) {
  }
  return { added, scanned };
}
