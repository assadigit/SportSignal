// SportSignal — the sweep ORCHESTRATORS: the 92-day pool rebuild
// (fetchLongView), the cheap in-memory live sweep (fetchLiveSweep) and the
// sequential 3-source merge with crest/venue adoption (fetchMatchesFromAPI).
// The individual provider clients live in provider-*.ts; the KV pool
// persistence lives in match-pool.ts (v13.74-providersplit).
import { CONFIG } from "./config";
import { SPORTSCORE_SLUGS, TSP_LEAGUE_IDS, CUP_TSP_IDS } from "./tables";
import type { Env } from "./types";
import { fetchJSON, fetchWithRetry, subrequestCount } from "./utils";
import { normalizeTeamName } from "./teams";
import { canonDedupe } from "./dedupe";
import { shouldNotify, isLiveStatus } from "./matches";
import { getRegisteredChats } from "./users";
import { sendTelegram } from "./telegram";
import { providerSuspended, suspendProvider } from "./provider-breaker";
import { fetchFootballData } from "./provider-fd";
import { tspEventToMatch, fetchTheSportsDB } from "./provider-tsp";
import { sportScoreDay, fetchSportScore } from "./provider-sportscore";
import { cacheMatches, getCachedMatches } from "./match-pool";

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
