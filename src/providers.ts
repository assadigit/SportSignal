// SportSignal — upstream data providers (football-data.org, sportscore,
// thesportsdb, Wikipedia PGL table), the multi-source merger with crest/venue
// adoption, provider circuit breaker and the KV match cache.
import { CONFIG } from "./config";
import { PROVIDER_LEAGUE_MAP, SPORTSCORE_SLUGS, TSP_LEAGUE_IDS, CUP_TSP_IDS, CUP_TEAM_TSP_IDS } from "./tables";
import type { Env } from "./types";
import { fetchJSON, fetchWithRetry, fdRateLimited, subrequestCount } from "./utils";
import { normalizeTeamName } from "./teams";
import { canonDedupe, matchKey } from "./dedupe";
import { shouldNotify, mapStageName, parseTSPDate, isLiveStatus } from "./matches";
import { getRegisteredChats } from "./users";
import { sendTelegram } from "./telegram";

export async function providerSuspended(env: Env, key) {
  const until = parseInt(await env.STATE.get("prov_down_" + key).catch(() => null)) || 0;
  return Date.now() < until;
}
export async function suspendProvider(env: Env, key, ms?) {
  const ttl = Math.ceil((ms || CONFIG.PROVIDER_SUSPEND_MS) / 1e3) + 60;
  await env.STATE.put("prov_down_" + key, String(Date.now() + (ms || CONFIG.PROVIDER_SUSPEND_MS)), { expirationTtl: ttl }).catch(() => {
  });
}
export async function clearProviderSuspension(env: Env, key) {
  await env.STATE.delete("prov_down_" + key).catch(() => {
  });
}
export async function fetchPglTableFromWikipedia(env: Env) {
  try {
    const y = (new Date()).getUTCFullYear();
    const m = (new Date()).getUTCMonth() + 1;
    const startYear = m >= 7 ? y : y - 1;
    const nextYY = String((startYear + 1) % 100).padStart(2, "0");
    const season = startYear + "\u2013" + nextYY;
    const page = "Template:" + season + " Persian Gulf Pro League table";
    const u = "https://en.wikipedia.org/w/api.php?action=parse&prop=wikitext&format=json&formatversion=2&page=" + encodeURIComponent(page);
    const data = await fetchJSON(u, 1, { "User-Agent": "SportSignalBot/1.0 (football.sportsignal.ir)" });
    const wt = data && data.parse && data.parse.wikitext ? String(data.parse.wikitext) : "";
    if (!wt) return null;
    const orderMatch = wt.match(/team_order\s*=\s*([A-Z]{2,4}(?:\s*,\s*[A-Z]{2,4})*)/);
    if (!orderMatch) return null;
    const codes = orderMatch[1].split(",").map((s) => s.trim()).filter(Boolean);
    const teams = [];
    const stat = (code, key) => {
      const m2 = wt.match(new RegExp("\\|" + key + "_" + code + "\\s*=\\s*(-?\\d+)"));
      return m2 ? parseInt(m2[1]) : null;
    };
    const nameOf = (code) => {
      const m2 = wt.match(new RegExp("\\|name_" + code + "\\s*=\\s*\\[\\[[^\\]|]*\\|([^\\]]+)\\]\\]"));
      if (m2) return m2[1];
      const m3 = wt.match(new RegExp("\\|name_" + code + "\\s*=\\s*\\[\\[([^\\]|]+)\\]\\]"));
      return m3 ? m3[1] : code;
    };
    for (let i = 0; i < codes.length; i++) {
      const c = codes[i];
      const w = stat(c, "win"), d = stat(c, "draw"), l = stat(c, "loss"), gf = stat(c, "gf"), ga = stat(c, "ga");
      if (w == null || d == null || l == null) continue;
      teams.push({
        name: nameOf(c),
        pos: i + 1,
        points: w * 3 + d,
        played: w + d + l,
        won: w,
        draw: d,
        lost: l,
        gf: gf == null ? null : gf,
        ga: ga == null ? null : ga,
        gd: gf != null && ga != null ? gf - ga : null
      });
    }
    if (teams.length < 8) return null;
    return { matchday: null, started: true, source: "wikipedia", teams };
  } catch (e) {
    console.error("PGL wikipedia table failed: " + e.message);
    return null;
  }
}
export async function sportScoreDay(code, slug, dateStr, acc) {
  const data = await fetchJSON("https://sportscore.com/api/v1/fixtures/?sport=football&date=" + dateStr + "&competition=" + slug + "&limit=200");
  let added = 0;
  for (const e of data && data.matches || []) {
    const utcDate = e.time ? new Date(e.time).toISOString() : null;
    if (!utcDate) continue;
    const dedupeKey = code + "|" + e.home + "|" + e.away + "|" + utcDate.slice(0, 16);
    if (acc.seen.has(dedupeKey)) continue;
    acc.seen.add(dedupeKey);
    added++;
    const status = e.status === "finished" ? "FINISHED" : e.status === "live" ? "LIVE" : "SCHEDULED";
    const inPlay = status !== "SCHEDULED";
    acc.list.push({
      id: "spsc-" + dateStr + "-" + code + "-" + acc.list.length,
      utcDate,
      status,
      stage: mapStageName(""),
      roundRaw: e.round_name || e.round || e.stage || "",
      competition: { code },
      homeTeam: { name: e.home, crest: e.home_logo || null },
      awayTeam: { name: e.away, crest: e.away_logo || null },
      // sportscore supplies a 0-0 default score for scheduled matches — never
      // store a pre-kickoff score in the shared pool (it would leak into UI/bot).
      score: inPlay ? { fullTime: { home: parseInt(e.home_score) || 0, away: parseInt(e.away_score) || 0 } } : null
    });
  }
  return added;
}
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

export async function fetchSportScore(env: Env, opts?) {
  // v13.43-cpukeeper: opts narrows the day window for the cheap LIVE sweep
  // (yesterday + today). Default (no opts) keeps the full-sweep window
  // [now-24h, now+24h] exactly as before.
  // v13.53-standsteady (backlog R6): opts.slugs narrows the COMPETITION set
  // too — the live sweep passes only the leagues that actually have a
  // live/imminent/just-finished pool match (see fetchLiveSweep). The full
  // sweep (no slugs) keeps fetching every eligible slug — fixture discovery
  // stays its job.
  const fromDays = opts && opts.fromDays != null ? opts.fromDays : 1;
  const toDays = opts && opts.toDays != null ? opts.toDays : 1;
  const onlySlugs = opts && Array.isArray(opts.slugs) && opts.slugs.length ? new Set(opts.slugs) : null;
  const matches = [];
  const seen = new Set();
  if (await providerSuspended(env, "sportscore")) {
    console.log("\u23ED\uFE0F sportscore suspended (recent sweep failed) \u2014 skipping day sweep");
    return matches;
  }
  const inSeason = (code) => {
    const s = CONFIG.SEASON_STARTS && CONFIG.SEASON_STARTS[code];
    return !s || new Date() >= new Date(s);
  };
  const slugs = Object.fromEntries(
    Object.entries(SPORTSCORE_SLUGS).filter(
      ([code]) => onlySlugs ? onlySlugs.has(code) && (code !== "AL" || inSeason(code)) : code === "EL" || code === "ECL" || code === "BL1" || code === "FA_CUP" || code === "EFL_CUP" || code === "CDR" || code === "COPPA_ITALIA" || code === "PGL" || code === "AL" && inSeason(code)
    )
  );
  if (!Object.keys(slugs).length) return matches;
  const from = new Date(Date.now() - fromDays * 864e5);
  const to = new Date(Date.now() + toDays * 864e5);
  const acc = { list: matches, seen };
  let calls = 0, failures = 0;
  for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split("T")[0];
    for (const [code, slug] of Object.entries(slugs)) {
      // v13.54.1-poolbreak: hard budget-stop inside the day-loop. The
      // full-sweep fan-out (9 codes × 3 days = 27 calls on top of FD+TSP)
      // crossed Cloudflare's real ~50-subrequest ceiling mid-loop on
      // 2026-09-30 — the remaining calls failed with CF's "Too many
      // subrequests" (not our local throw), TSP never got budget, the
      // sweep returned 0 matches, and the pool stayed dead. Stopping at
      // 44 metered (now accurate — fetchJSON bumps per attempt) leaves
      // the loop's failures < calls so the provider-suspension check
      // below can't misfire on budget stops.
      if (subrequestCount() >= 44) {
        console.log(`\u23ED\uFE0F sportscore day sweep budget-stopped at ${calls}/${calls + 1} calls (${subrequestCount()}/48 metered)`);
        calls = calls || 1; // never 0: report the stop as a partial sweep
        return matches;
      }
      calls++;
      try {
        await sportScoreDay(code, slug, dateStr, acc);
      } catch (e) {
        failures++;
        console.error(`\u274C sportscore day ${code} ${dateStr} failed: ${e.message}`);
      }
    }
  }
  if (calls > 0 && failures === calls) {
    console.error("\u26A0\uFE0F sportscore: all " + calls + " day-calls failed \u2014 suspending provider");
    await suspendProvider(env, "sportscore");
  }
  return matches;
}
export async function cacheMatches(env: Env, matches, source) {
  if (!matches || !matches.length) return;
  // v13.44-quotaguard: hard budget hold (env-scoped flag set by the cron
  // governor at ≥KV_WRITES_HARD). The pool write is deferred — the existing
  // pool keeps serving (fixtures are static days ahead; a slightly stale
  // live score for a few ticks is worth ~150 writes of quota headroom).
  if (env && env.KV_BUDGET_HOLD) {
    console.warn("\u{1F4B0} KV write budget hold \u2014 pool cache write deferred this tick");
    return;
  }
  try {
    const existing = await env.STATE.get(CONFIG.KV_MATCHES_KEY, "json").catch(() => null);
    // v13.52-swrsolid: retention 2d → 7d — the public page's finished card
    // carries a full week by design (v12.5: "the 12-hour window emptied the
    // card every morning"), and since public rebuilds went POOL-FIRST the
    // pool is that card's only source. Fetches still only BRING ~±2d of
    // data; the wider cutoff just RETAINS settled rows in KV a week (no
    // extra fetches, no extra requests — the rows are already there).
    const cutoff = Date.now() - 7 * 864e5;
    const head = (existing && Array.isArray(existing.matches) ? existing.matches : []).filter((m) => new Date(m.utcDate || 0).getTime() > cutoff);
    const merged = canonDedupe([...head, ...matches]);
    // v13.54-livestamp: the change-only skip now also requires the STAMP to
    // be fresh (<POOL_STAMP_REFRESH_MS). fetchedAt is the site header's
    // "Last updated" clock — on break weeks content never changes, the old
    // gate skipped every write, and the stamp froze for DAYS while sweeps
    // ran clean every 2h (the 2026-09-28 report: "Monday 15:39 · cached
    // (1407m ago)" with a perfectly healthy pipeline). A stamp-advance
    // rewrite costs one KV put every ≥90min (the 2h sweep cadence makes it
    // ~12/day of the 1,000/day quota); real content changes keep their
    // instant write, and the budget hold above still gates everything.
    const stampAge = existing && existing.fetchedAt ? Date.now() - new Date(existing.fetchedAt).getTime() : Infinity;
    if (existing && Array.isArray(existing.matches) && stampAge < CONFIG.POOL_STAMP_REFRESH_MS && JSON.stringify(merged) === JSON.stringify(existing.matches)) {
      return;
    }
    await env.STATE.put(
      CONFIG.KV_MATCHES_KEY,
      JSON.stringify({ fetchedAt: (new Date()).toISOString(), source, matches: merged }),
      { expirationTtl: CONFIG.CACHE_STALE_TTL }
    );
  } catch (e) {
    console.error("Match cache write failed: " + e.message);
  }
}
export async function getCachedMatches(env: Env) {
  try {
    const data = await env.STATE.get(CONFIG.KV_MATCHES_KEY, "json");
    if (data && Array.isArray(data.matches) && data.matches.length) {
      console.log("Using cached matches from " + data.source + " (" + data.fetchedAt + ")");
      return data.matches;
    }
  } catch (e) {
    console.error("Match cache read failed: " + e.message);
  }
  return [];
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
export async function fetchFootballData(env: Env, opts?) {
  // v13.43-cpukeeper: opts narrows the date range (and skips the intl
  // calls) for the cheap LIVE sweep — ±2 days covers every live/just-
  // finished/just-starting worthy match at a fraction of the parse CPU of
  // the default 10-day range. Default (no opts) = the full-sweep behavior.
  // v13.44-quotaguard (F5): mirror of the sportscore circuit — a 429-
  // exhausted sweep suspends FD for PROVIDER_SUSPEND_MS so the rest of this
  // sweep and the next ticks skip straight to the other providers + the KV
  // pool instead of burning subrequests into the same exhausted quota
  // minute (football-data free tier: 10 req/min).
  if (await providerSuspended(env, "football-data")) {
    console.log("\u23F8\uFE0F football-data suspended \u2014 skipping FD calls this sweep");
    return [];
  }
  const pastDays = opts && opts.pastDays != null ? opts.pastDays : CONFIG.DAYS_IN_PAST;
  const futureDays = opts && opts.futureDays != null ? opts.futureDays : CONFIG.DAYS_IN_FUTURE;
  const liveMode = !!(opts && opts.live);
  const dateFrom = new Date(Date.now() - pastDays * 864e5).toISOString().split("T")[0];
  const dateTo = new Date(Date.now() + futureDays * 864e5).toISOString().split("T")[0];
  const fdLeagues = CONFIG.LEAGUES.filter((c) => !["EL", "ECL"].includes(c));
  // v13.43-cpukeeper: print the ACTUAL range length (live sweeps are ±2d, not
  // the config's 10-day total).
  console.log(`\u{1F4C5} Date range: ${dateFrom} to ${dateTo} (${pastDays + futureDays} days${liveMode ? ", live sweep" : `, ${CONFIG.DATE_RANGE_DAYS} total`})`);
  const allMatches = [];
  const seen = new Set();
  const pushUnique = (list) => {
    for (const m of list) {
      if (!seen.has(m.id)) {
        seen.add(m.id);
        allMatches.push(m);
      }
    }
  };
  try {
    const u = `${CONFIG.API_URL}?competitions=${fdLeagues.join(",")}&dateFrom=${dateFrom}&dateTo=${dateTo}`;
    const m = await fetchWithRetry(u, env.API_TOKEN, liveMode ? "Leagues+CL (live)" : "Leagues+CL");
    console.log(`\u2705 Leagues+CL${liveMode ? " (live)" : ""}: ${m.length} matches`);
    pushUnique(m);
  } catch (error) {
    console.error(`\u274C Failed to fetch league matches:`, error.message);
  }
  // v13.44-quotaguard (F5): a rate-limited main call means the quota window
  // is exhausted — suspending beats retrying the intl calls into the same
  // window (each would 429, wait, and fail too).
  if (fdRateLimited()) {
    await suspendProvider(env, "football-data");
    console.warn(`\u23F8\uFE0F football-data rate-limited \u2014 suspended ${Math.round(CONFIG.PROVIDER_SUSPEND_MS / 6e4)}min (Retry-After honored; intl calls skipped this sweep; pool + other providers cover)`);
    return allMatches;
  }
  // Intl competitions: full sweeps only — live-worthy intl fixtures are rare
  // and each competition costs a subrequest + parse (v13.43-cpukeeper).
  if (liveMode) return allMatches;
  for (const [code, id] of Object.entries(CONFIG.INTL_COMPETITIONS)) {
    try {
      const u = `${CONFIG.API_URL}?competitions=${id}&dateFrom=${dateFrom}&dateTo=${dateTo}`;
      const m = await fetchWithRetry(u, env.API_TOKEN, "Intl " + code);
      pushUnique(m.map((match) => match.competition ? { ...match, competition: { ...match.competition, code } } : match));
      console.log(`\u2705 Intl ${code}: ${m.length} matches`);
    } catch (e) {
      console.error(`\u274C Intl ${code} fetch failed: ${e.message}`);
    }
  }
  console.log(`\u2705 Found ${allMatches.length} matches total`);
  return allMatches;
}
export async function fetchLongView(env: Env) {
  const cached = await env.STATE.get(CONFIG.KV_MATCHES_KEY, "json").catch(() => null);
  const fresh = cached && cached.fetchedAt && Date.now() - new Date(cached.fetchedAt).getTime() < 6 * 36e5;
  const horizon = cached && Array.isArray(cached.matches) && cached.matches.length ? Math.max(0, ...cached.matches.map((m) => new Date(m.utcDate || 0).getTime())) : 0;
  if (fresh && horizon > Date.now() + 60 * 864e5) return cached.matches;
  const fdLeagues = CONFIG.LEAGUES.filter((c) => !["EL", "ECL"].includes(c));
  const allMatches = [];
  const seen = new Set();
  const pushUnique = (list) => {
    for (const m of list) {
      if (!seen.has(m.id)) {
        seen.add(m.id);
        allMatches.push(m);
      }
    }
  };
  const pastDays = Math.max(CONFIG.DAYS_IN_PAST, 7);
  const start = Date.now() - pastDays * 864e5;
  for (let i = 0; i < Math.ceil((CONFIG.LONG_VIEW_DAYS + pastDays) / 10); i++) {
    const f = new Date(start + i * 10 * 864e5).toISOString().split("T")[0];
    const t = new Date(start + (i + 1) * 10 * 864e5).toISOString().split("T")[0];
    const u = `${CONFIG.API_URL}?competitions=${fdLeagues.join(",")}&dateFrom=${f}&dateTo=${t}`;
    try {
      const m = await fetchWithRetry(u, env.API_TOKEN, `Long chunk ${i + 1}`);
      console.log(`\u{1F50D} Long view chunk ${i + 1} (${f}..${t}): ${m.length} matches`);
      pushUnique(m);
    } catch (e) {
      console.error(`\u274C Long view chunk ${i + 1} failed: ${e.message}`);
    }
    await new Promise((r) => setTimeout(r, 2e3));
  }
  // v13.54.1-poolbreak: TSP now runs BEFORE the sportscore sections (was
  // after). The long view is the pool's ONLY complete rebuild path, and
  // future fixtures are its product: FD's 92-day chunks + TSP's next-event
  // views + the intl calls (~23 metered total) ALWAYS complete within any
  // budget, while the sportscore cup/EL/ECL/BL1 day-fan-out (up to 50+27
  // calls) is the part that crossed Cloudflare's real ~50 ceiling and killed
  // this very function's caller chain on 2026-09-30. sportscore detail now
  // rides on whatever budget is left, stopping hard at 44 metered.
  let tsdbCalls = 0;
  const paceT = () => tsdbCalls++ > 0 ? new Promise((r) => setTimeout(r, 1200)) : Promise.resolve();
  for (const [code, leagueId] of Object.entries(Object.assign({}, TSP_LEAGUE_IDS, CUP_TSP_IDS))) {
    await paceT();
    try {
      const data = await fetchJSON("https://www.thesportsdb.com/api/v1/json/3/eventsnextleague.php?id=" + leagueId);
      for (const e of data && data.events || []) {
        if ((e.strSport || "").toLowerCase() !== "soccer") continue;
        const m = tspEventToMatch(e, code);
        if (!m.utcDate) continue;
        pushUnique(m);
      }
    } catch (e) {
      console.error(`\u274C Long view TSP ${code} failed: ${e.message}`);
    }
  }
  const intlFrom = new Date(Date.now() - CONFIG.DAYS_IN_PAST * 864e5).toISOString().split("T")[0];
  const intlTo = new Date(Date.now() + Math.max(3, 10 - CONFIG.DAYS_IN_PAST) * 864e5).toISOString().split("T")[0];
  for (const [code, id] of Object.entries(CONFIG.INTL_COMPETITIONS)) {
    try {
      const u = `${CONFIG.API_URL}?competitions=${id}&dateFrom=${intlFrom}&dateTo=${intlTo}`;
      const m = await fetchWithRetry(u, env.API_TOKEN, "Intl " + code);
      pushUnique(m.map((match) => match.competition ? { ...match, competition: { ...match.competition, code } } : match));
      console.log(`\u{1F50D} Long view intl ${code}: ${m.length} matches`);
    } catch (e) {
      console.error(`\u274C Long view intl ${code} failed: ${e.message}`);
    }
  }
  const uefaAcc = { list: allMatches, seen };
  if (await providerSuspended(env, "sportscore")) {
    console.log("\u23ED\uFE0F sportscore suspended \u2014 skipping long-view cup/EL/ECL/BL1 sweeps");
  } else if (subrequestCount() >= 44) {
    console.log(`\u23ED\uFE0F sportscore long-view sections skipped \u2014 subrequest budget ${subrequestCount()}/48`);
  } else {
    const cupSlugs = [["FA_CUP", SPORTSCORE_SLUGS.FA_CUP], ["EFL_CUP", SPORTSCORE_SLUGS.EFL_CUP], ["CDR", SPORTSCORE_SLUGS.CDR], ["COPPA_ITALIA", SPORTSCORE_SLUGS.COPPA_ITALIA], ["HAZFI_CUP", SPORTSCORE_SLUGS.HAZFI_CUP]];
    const cupDone = {};
    let ssCalls = 0, ssFails = 0;
    for (let i = 0; i < 10; i++) {
      const dateStr = new Date(Date.now() + i * 864e5).toISOString().split("T")[0];
      for (const [cc, slug] of cupSlugs) {
        if (cupDone[cc]) continue;
        if (subrequestCount() >= 44) { ssCalls = ssCalls || 1; i = 10; break; }
        ssCalls++;
        try {
          const n = await sportScoreDay(cc, slug, dateStr, uefaAcc);
          if (n > 0) cupDone[cc] = true;
        } catch (e) {
          ssFails++;
          console.error(`\u274C Long view cup ${cc} failed: ${e.message}`);
        }
      }
    }
    for (let i = 0; i < 7; i++) {
      const dateStr = new Date(Date.now() + i * 864e5).toISOString().split("T")[0];
      if (subrequestCount() >= 44) { ssCalls = ssCalls || 1; break; }
      ssCalls++;
      try {
        await sportScoreDay("EL", SPORTSCORE_SLUGS.EL, dateStr, uefaAcc);
      } catch (e) {
        ssFails++;
        console.error(`\u274C Long view EL failed: ${e.message}`);
      }
      if (subrequestCount() >= 44) { ssCalls = ssCalls || 1; break; }
      ssCalls++;
      try {
        await sportScoreDay("ECL", SPORTSCORE_SLUGS.ECL, dateStr, uefaAcc);
      } catch (e) {
        ssFails++;
        console.error(`\u274C Long view ECL failed: ${e.message}`);
      }
      if (subrequestCount() >= 44) { ssCalls = ssCalls || 1; break; }
      ssCalls++;
      try {
        await sportScoreDay("BL1", SPORTSCORE_SLUGS.BL1, dateStr, uefaAcc);
      } catch (e) {
        ssFails++;
        console.error(`\u274C Long view BL1 failed: ${e.message}`);
      }
    }
    if (ssCalls > 0 && ssFails === ssCalls) {
      console.error("\u26A0\uFE0F sportscore long-view: all " + ssCalls + " calls failed \u2014 suspending provider");
      await suspendProvider(env, "sportscore");
    }
  }
  if (uefaAcc.list.length !== 0) {
    const uefaCount = uefaAcc.list.filter((m) => m.competition.code === "EL" || m.competition.code === "ECL").length;
    console.log(`\u{1F50D} Long view EL/ECL (sportscore): ${uefaCount} matches`);
  }
  if (allMatches.length) {
    const deduped = canonDedupe(allMatches);
    allMatches.length = 0;
    allMatches.push(...deduped);
  }
  if (allMatches.length && !allMatches.some(shouldNotify)) {
    const pool = await getCachedMatches(env);
    if (pool.some(shouldNotify)) {
      console.log("\u26A0\uFE0F Live long pool has 0 followed-team matches \u2014 reusing cached pool");
      return pool;
    }
  }
  if (allMatches.length) {
    await cacheMatches(env, allMatches, "football-data+longview");
  }
  return allMatches;
}

// v13.2: ONE thesportsdb event → match mapper (was duplicated ×3 across
// fetchLongView + fetchTheSportsDB's two branches). Identical field mapping.
function tspEventToMatch(e, code) {
  return {
    id: "tsd-" + e.idEvent,
    utcDate: parseTSPDate(e.dateEvent, e.strTime, e.strTimestamp),
    status: /finished|completed/i.test(e.strStatus || "") ? "FINISHED" : "SCHEDULED",
    stage: mapStageName(e.strRound || e.intRound),
    // v13.35-rounds: keep the RAW round text ("3rd Round", "Quarter-finals")
    // — mapStageName is LOSSY ("3rd Round" collapses to THIRD_PLACE, which
    // would mislabel a cup's third round as the رده‌بندی playoff). roundLabel
    // prefers roundRaw and only falls back to the (lossy) stage.
    roundRaw: e.strRound || e.intRound || "",
    competition: { code },
    venue: e.strVenue || null,
    homeTeam: { name: e.strHomeTeam, crest: e.strHomeTeamBadge || null },
    awayTeam: { name: e.strAwayTeam, crest: e.strAwayTeamBadge || null },
    score: { fullTime: { home: parseInt(e.intHomeScore) || 0, away: parseInt(e.intAwayScore) || 0 } }
  };
}

export async function fetchTheSportsDB(env: Env) {
  const matches = [];
  const monitored = new Set([...CONFIG.LEAGUES, "EL", "ECL", ...Object.keys(CONFIG.DOMESTIC_CUP_IDS), ...Object.keys(CONFIG.INTL_COMPETITIONS)]);
  let tsdbCalls = 0;
  const pace = () => tsdbCalls++ > 0 ? new Promise((r) => setTimeout(r, 1200)) : Promise.resolve();
  for (const [code, leagueId] of Object.entries(Object.assign({}, TSP_LEAGUE_IDS, CUP_TSP_IDS))) {
    if (!monitored.has(code)) continue;
    await pace();
    const data = await fetchJSON("https://www.thesportsdb.com/api/v1/json/3/eventsnextleague.php?id=" + leagueId);
    for (const e of data && data.events || []) {
      if ((e.strSport || "").toLowerCase() !== "soccer") continue;
      const m = tspEventToMatch(e, code);
      if (!m.utcDate) continue;
      matches.push(m);
    }
  }
  if (!matches.length) {
    const from = new Date(Date.now() - CONFIG.FALLBACK_DAYS_PAST * 864e5);
    const to = new Date(Date.now() + CONFIG.FALLBACK_DAYS_FUTURE * 864e5);
    for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split("T")[0];
      await pace();
      try {
        const data = await fetchJSON("https://www.thesportsdb.com/api/v1/json/3/eventsday.php?d=" + dateStr);
        for (const e of data && data.events || []) {
          const code = PROVIDER_LEAGUE_MAP[e.strLeague];
          if (!code || !monitored.has(code)) continue;
          if ((e.strSport || "").toLowerCase() !== "soccer") continue;
          const m = tspEventToMatch(e, code);
          if (!m.utcDate) continue;
          matches.push(m);
        }
      } catch (e) {
        console.error(`\u274C TSP day sweep ${dateStr} failed: ${e.message}`);
      }
    }
  }
  return matches;
}
// v13.43-cpukeeper: the CHEAP live sweep. Root cause it kills: this Workers
// account is on the FREE plan (10ms CPU rolling-average enforcement) and the
// full 3-provider sweep burns ~100ms CPU — running it on every 10-min tick
// during active windows (any worthy FT keeps isActiveTime true for 8h)
// dragged the average over the limit and CF killed EVERY cron tick at
// exactly 10ms CPU (status=exceededResources, err=1): the 2026-09-14
// 00:20→10:10Z outage (57 consecutive kills) and the 22:00Z+ outage the same
// day. Structure now: full sweep at most once per QUIET_SWEEP_MS (2h);
// between full sweeps an active tick runs THIS — one narrow football-data
// call (±2 days: statuses + scores for everything near kickoff) plus the
// sportscore yesterday/today sweep (BL1/EL/ECL/cup live data), merged OVER
// the cached KV pool IN MEMORY. ~15–25ms CPU per tick, no KV pool write (the
// pool stays the last full sweep's snapshot). HT / POSTPONED / FT /
// match-start-backfill / 5min windows all still evaluate at full 10-minute
// cadence from the merged pool. NEVER throws — a total provider failure
// returns the cached pool unchanged (the same data the quiet path would
// have used, so notifications still run off it).
export async function fetchLiveSweep(env: Env, cachedPool) {
  const pool = Array.isArray(cachedPool) ? cachedPool : [];
  const fetched = [];
  let fdCount = 0, ssCount = 0;
  try {
    const fd = await fetchFootballData(env, { pastDays: 2, futureDays: 2, live: true });
    fdCount = fd.length;
    fetched.push(...fd);
  } catch (e) {
    console.error("Live sweep football-data failed: " + e.message);
  }
  if (!(await providerSuspended(env, "sportscore"))) {
    try {
      // v13.53-standsteady (backlog R6): the live sweep only needs sportscore
      // for ELIGIBLE leagues that actually have a live / imminent /
      // just-finished match in the pool. Before: all 9 slugs × 2 days = 18
      // calls on EVERY active tick (~540-720 calls on a matchday — the
      // single biggest API consumer, the user's "too much update request").
      // A league evening with no cup/EL/PGL match in flight now burns 0
      // sportscore calls (FD's single ±2d fixtures call covers its own
      // leagues); an EL Thursday fetches just EL+ECL (4 calls). Fixture
      // DISCOVERY stays the full sweep's job (every 2h, all slugs) — a live
      // update can only apply to a match the pool already knows anyway.
      // Window: [-6h, +3h] — the tail covers extra time + delays + just-FT
      // capture; the pre-arm catches kickoff transitions the moment they
      // fire. BL1 stays eligible: it's FD-covered, but when FD is suspended
      // (the 429 penalty box) sportscore becomes its only live source.
      const nowMs = Date.now();
      const SS_LIVE_BACK = 6 * 36e5, SS_LIVE_FWD = 3 * 36e5;
      const SS_LIVE_ELIGIBLE = ["EL", "ECL", "BL1", "FA_CUP", "EFL_CUP", "CDR", "COPPA_ITALIA", "PGL", "AL"];
      const eligible = new Set(SS_LIVE_ELIGIBLE);
      const need = new Set();
      for (const m of pool) {
        const code = m && m.competition && m.competition.code;
        if (!code || !eligible.has(code)) continue;
        const t = m.utcDate ? new Date(m.utcDate).getTime() : 0;
        if (!t) continue;
        const st = String((m && m.status) || "").toUpperCase();
        if (isLiveStatus(st) || (t >= nowMs - SS_LIVE_BACK && t <= nowMs + SS_LIVE_FWD)) need.add(code);
      }
      if (need.size) {
        const ss = await fetchSportScore(env, { fromDays: 1, toDays: 0, slugs: [...need] });
        ssCount = ss.length;
        fetched.push(...ss);
      } else {
        console.log("\u23ED\uFE0F sportscore live sweep: no eligible in-window pool match \u2014 0 calls (was 18)");
      }
    } catch (e) {
      console.error("Live sweep sportscore failed: " + e.message);
    }
  }
  const merged = canonDedupe([...pool, ...fetched]);
  const liveN = merged.filter((m) => isLiveStatus(m.status)).length;
  console.log(`\u26A1 Live sweep: pool=${pool.length} fetched=${fetched.length} (fd=${fdCount} spsc=${ssCount}) merged=${merged.length} live=${liveN}`);
  return merged;
}
export async function fetchMatchesFromAPI(env: Env) {
  // v13.54.1-poolbreak: the sources run SEQUENTIALLY in priority order
  // with meter gates (was Promise.all concurrency). The 2026-09-30 deadlock:
  // the pool KV had expired (24h TTL, change-only writes, break week) → every
  // tick full-swept → the concurrent fan-out (FD ~17 + sportscore 27 + TSP
  // ~10) crossed Cloudflare's real ~50-subrequest ceiling mid-flight → TSP
  // (the only source with FUTURE fixtures when FD's 10-day window sees
  // nothing) starved → 0 matches → cacheMatches skipped → the pool could
  // never repopulate. Sequential + gates guarantee FD and TSP ALWAYS
  // complete (~27 metered), so the sweep always has something to cache;
  // sportscore runs on the leftover budget only (the 10-min live sweep
  // owns live detail on matchdays, R6-narrowed).
  const sources = [
    { name: "football-data", fn: fetchFootballData, gate: 46 },
    { name: "thesportsdb", fn: fetchTheSportsDB, gate: 42 },
    { name: "sportscore", fn: fetchSportScore, gate: 34 }
  ];
  const merged = new Map();
  const used = [];
  for (const s of sources) {
    if (subrequestCount() > s.gate) {
      console.log(`\u23ED\uFE0F Source ${s.name} skipped \u2014 subrequest budget ${subrequestCount()}/48 (gate ${s.gate})`);
      continue;
    }
    try {
      console.log("Trying API source: " + s.name);
      const m = await s.fn(env);
      if (m && m.length) {
        used.push(s.name);
        for (const x of m) {
          const k = `${x.competition.code}|${normalizeTeamName(x.homeTeam.name)}|${normalizeTeamName(x.awayTeam.name)}|${(x.utcDate || "").slice(0, 10)}`;
          const cur = merged.get(k);
          if (!cur) {
            merged.set(k, x);
          } else {
            if (!cur.homeTeam.crest && x.homeTeam.crest) cur.homeTeam.crest = x.homeTeam.crest;
            if (!cur.awayTeam.crest && x.awayTeam.crest) cur.awayTeam.crest = x.awayTeam.crest;
            if (!cur.venue && x.venue) cur.venue = x.venue;
          }
        }
        console.log(`\u2705 Source ${s.name} contributed ${m.length} matches (pool ${merged.size})`);
      }
    } catch (e) {
      console.error(`\u274C Source ${s.name} failed: ` + e.message);
    }
  }
  let matches = canonDedupe([...merged.values()]);
  let usedSource = used.join("+");
  if (matches.length && !matches.some(shouldNotify)) {
    const pool = await getCachedMatches(env);
    if (pool.some(shouldNotify)) {
      console.log("\u26A0\uFE0F Live pool has 0 followed-team matches \u2014 reusing cached pool");
      matches = pool;
      usedSource += "+cache";
    }
  }
  if (!matches.length) {
    console.error("\u274C All API sources empty, falling back to cache");
    matches = await getCachedMatches(env);
    if (matches.length) usedSource = "cache";
    try {
      const lastAlert = parseInt(await env.STATE.get("degradation_alert_at").catch(() => null)) || 0;
      if (Date.now() - lastAlert > CONFIG.NOTIFICATION_COOLDOWN_HOURS * CONFIG.ONE_HOUR_MS) {
        const chats = await getRegisteredChats(env);
        const msg = "\u26A0\uFE0F *\u0647\u0634\u062F\u0627\u0631:* \u0647\u0645\u0647 \u0645\u0646\u0627\u0628\u0639 \u0646\u0627\u0645\u062A\u0648\u0627\u0646\u0633\u062A\u0646\u062F \u062F\u0627\u062F\u0647 \u0647\u0627 \u0631\u0627 \u0628\u06AF\u06CC\u0631\u0646\u062F\u060C \u0627\u0632 \u06A9\u0627\u0634 (\u06F2\u06F4 \u0633\u0627\u0639\u062A) \u0627\u0633\u062A\u0641\u0627\u062F\u0647 \u0645\u06CC\u200C\u0634\u0648\u062F. \u0627\u06AF\u0631 \u0645\u0634\u06A9\u0644 \u0627\u062F\u0627\u0645\u0647 \u062F\u0627\u0634\u062A\u060C \u0633\u0627\u06CC\u0631 \u0645\u0646\u0627\u0628\u0639 \u0631\u0627 \u0628\u0631\u0631\u0633\u06CC \u06A9\u0646\u06CC\u062F.";
        await Promise.allSettled(chats.map((c) => sendTelegram(env, msg, c)));
        await env.STATE.put("degradation_alert_at", String(Date.now())).catch(() => {
        });
      }
    } catch (alertErr) {
      console.error("Degradation alert failed: " + alertErr.message);
    }
  } else {
    await cacheMatches(env, matches, usedSource);
  }
  if (usedSource) {
    const prevSource = await env.STATE.get(CONFIG.KV_LAST_SOURCE).catch(() => null);
    if (prevSource !== usedSource) {
      await env.STATE.put(CONFIG.KV_LAST_SOURCE, usedSource).catch(() => {
      });
    }
  }
  console.log(`\u{1F4CA} Total matches found: ${matches.length} (source: ${usedSource})`);
  return matches;
}
