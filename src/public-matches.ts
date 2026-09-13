// SportSignal — the public /api/public-matches pipeline: KV cache with
// refresh lock + per-IP rate limit, live enrichment (minute/scorers/venue),
// standings/cups/UCL/topSpot/week shaping and the 7-day snapshot fallback.


import { CONFIG, LEAGUE_LOGOS, COMP_EN } from "./config";
import type { Env } from "./types";
import { fetchJSON, getNowTehran } from "./utils";
import { normalizeTeamName, normTeamKey } from "./teams.js";
import { translateTeam, translateCompetition, ensureFaAiCache } from "./translate";
import { shouldNotify, isLiveStatus, isFeaturedMatch, normAlias, isDomesticLeagueCode, isMasterPair, hasSelectedTeam, isMasterClash, isDerby } from "./matches";
import { fetchLongView, getCachedMatches } from "./providers";
import { applySettings } from "./admin";
import { fetchStandings } from "./composers";
import { masterTeamList, masterMemo } from "./users";

export function pubMatch(m) {
  return {
    id: m.id || null,
    homeTeam: { name: m.homeTeam.name, faName: translateTeam(m.homeTeam.name), crest: m.homeTeam.crest || null },
    awayTeam: { name: m.awayTeam.name, faName: translateTeam(m.awayTeam.name), crest: m.awayTeam.crest || null },
    utcDate: m.utcDate,
    competition: { code: m.competition.code, faName: translateCompetition(m.competition.code), emblem: m.competition.emblem || LEAGUE_LOGOS[m.competition.code] || null },
    status: m.status,
    minute: isLiveStatus(m.status) && m.minute != null ? m.minute : null,
    scorers: isLiveStatus(m.status) ? (m.scorers || []).map((s) => ({ minute: s.minute, type: s.type, scorer: s.scorer, team: s.team })) : [],
    big: isFeaturedMatch(m),
    derby: isDerby(m),
    venue: m.venue || null,
    score: (isLiveStatus(m.status) || m.status === "FINISHED") && m.score && m.score.fullTime ? m.score.fullTime : null
  };
}
export async function enrichLiveMatches(env: Env, matches) {
  const live = matches.filter((m) => isLiveStatus(m.status) && /^\d+$/.test(String(m.id)));
  for (const m of live.slice(0, 4)) {
    try {
      const key = CONFIG.KV_LIVE_DETAIL + m.id;
      const cached = (await env.STATE.get(key, "json") as any).catch(() => null);
      if (cached) {
        applyLiveDetail(m, cached);
        continue;
      }
      const d = await fetchJSON("https://api.football-data.org/v4/matches/" + m.id, 2, { "X-Auth-Token": env.API_TOKEN });
      const det = d && d.match ? d.match : d;
      if (!det) continue;
      const detail = {
        minute: det.minute != null ? det.minute : null,
        scorers: (det.scorers || []).map((s) => ({
          minute: s.minute != null ? s.minute : null,
          type: s.type || "GOAL",
          scorer: s.scorer && s.scorer.name ? s.scorer.name : null,
          team: s.team && s.team.name ? s.team.name : null
        }))
      };
      if (det.score && det.score.fullTime) {
        detail.scoreFullTime = { home: det.score.fullTime.home, away: det.score.fullTime.away };
      }
      await env.STATE.put(key, JSON.stringify(detail), { expirationTtl: 90 }).catch(() => {
      });
      applyLiveDetail(m, detail);
    } catch (e) {
      console.error("Live detail fail for " + m.id + ": " + e.message);
    }
    await new Promise((r) => setTimeout(r, 1400));
  }
  return matches;
}
export function applyLiveDetail(m, detail) {
  if (detail.minute != null) m.minute = detail.minute;
  if (detail.scorers) m.scorers = detail.scorers;
  if (detail.scoreFullTime) m.score = { fullTime: detail.scoreFullTime };
}
export function projectedUclStart() {
  const now = new Date();
  const y = now.getUTCMonth() >= 9 ? now.getUTCFullYear() + 1 : now.getUTCFullYear();
  return new Date(Date.UTC(y, 8, 15, 19, 0, 0));
}
export async function fetchPublicMatches(env: Env, req) {
  const cached = (await env.STATE.get(CONFIG.KV_PUBLIC_MATCHES, "json") as any).catch(() => null);
  if (cached && cached.ts && Date.now() - cached.ts < 18e4) return cached.data;
  await applySettings(env);
  await ensureFaAiCache(env).catch(() => {
  });
  const lockVal = parseInt(await env.STATE.get("pub_refresh_lock").catch(() => null)) || 0;
  const lockFresh = !!(lockVal && Date.now() - lockVal < 45e3);
  if (lockFresh && cached && cached.data) return cached.data;
  const ip = req && req.headers && req.headers.get("CF-Connecting-IP") || "";
  const rlKey = ip ? "pub_rl_" + ip.replace(/[^0-9a-fA-F:.]/g, "") : null;
  if (rlKey) {
    const rl = await env.STATE.get(rlKey).catch(() => null);
    if (rl && cached && cached.data) return cached.data;
  }
  let matches = null;
  let liveSweepFailed = false;
  try {
    if (!lockFresh) {
      await env.STATE.put("pub_refresh_lock", String(Date.now()), { expirationTtl: 45 }).catch(() => {
      });
    }
    if (rlKey) {
      await env.STATE.put(rlKey, String(Date.now()), { expirationTtl: 60 }).catch(() => {
      });
    }
    matches = await fetchLongView(env);
    await enrichLiveMatches(env, matches);
  } catch (e) {
    console.error("Public provider sweep failed (serving stale): " + e.message);
    liveSweepFailed = true;
    if (cached && cached.data) return cached.data;
    matches = await getCachedMatches(env);
  }
  const now = Date.now();
  const standCodes = ["PL", "PD", "SA", "BL1", "FL1"];
  const FD_STAND_ROTATION = ["PL", "PD", "SA", "BL1", "FL1", "CL"];
  const fdSlot = Math.floor(Date.now() / 6e5) % 3;
  const fdAllowed = new Set(FD_STAND_ROTATION.slice(fdSlot * 2, fdSlot * 2 + 2));
  const compact = (st) => st && st.teams.length ? {
    started: st.started !== false,
    // v12.16: full per-team stats ride along (played/won/draw/lost/gf/ga/gd —
    // fd and the PGL Wikipedia fallback serve them; sources without stats
    // simply carry undefined and the UI renders "—").
    teams: st.teams.slice(0, 8).map((t) => ({ pos: t.pos, name: t.name, faName: translateTeam(t.name), points: t.points, played: t.played, won: t.won, draw: t.draw, lost: t.lost, gf: t.gf, ga: t.ga, gd: t.gd != null ? t.gd : t.gf != null && t.ga != null ? t.gf - t.ga : null }))
  } : null;
  const stMap = {};
  await Promise.all(standCodes.concat(["CL", "PGL"]).map((c) => fetchStandings(env, c, c === "PGL" || fdAllowed.has(c)).catch(() => null).then((v) => {
    stMap[c] = v || null;
  })));
  const stPL = stMap.PL, stPD = stMap.PD, stSA = stMap.SA, stBL = stMap.BL1, stFL = stMap.FL1, stCL = stMap.CL, stPGL = stMap.PGL;
  const normCache = new Map();
  const norm = (name) => {
    let v = normCache.get(name);
    if (v === void 0) {
      v = normalizeTeamName(name);
      normCache.set(name, v);
    }
    return v;
  };
  const top3: any = {};
  for (const c of standCodes) {
    const st = stMap[c];
    if (st && st.started !== false && Array.isArray(st.teams)) {
      top3[c] = new Set(st.teams.slice(0, 3).map((t) => norm(t.name)));
    }
  }
  const isTopTeamInvolved = (m) => {
    const set = top3[m.competition.code];
    if (!set) return false;
    return set.has(norm(m.homeTeam.name)) || set.has(norm(m.awayTeam.name));
  };
  const isTopTable = (m) => {
    const set = top3[m.competition.code];
    if (!set) return false;
    return set.has(norm(m.homeTeam.name)) && set.has(norm(m.awayTeam.name));
  };
  const top5: any = {};
  for (const c of standCodes) {
    const st = stMap[c];
    if (st && st.started !== false && Array.isArray(st.teams)) {
      top5[c] = new Set(st.teams.slice(0, 5).map((t) => norm(t.name)));
    }
  }
  const isSelName = (name) => {
    masterTeamList();
    return masterMemo.normSet.has(normAlias(name));
  };
  const isSelVsTop5 = (m) => {
    const set = top5[m.competition.code];
    if (!set) return false;
    const selHome = isSelName(m.homeTeam.name);
    const selAway = isSelName(m.awayTeam.name);
    if (!selHome && !selAway) return false;
    return selHome && set.has(norm(m.awayTeam.name)) || selAway && set.has(norm(m.homeTeam.name));
  };
  const withTop = (m) => {
    const p = pubMatch(m);
    p.top = isTopTable(m);
    p.clash = isMasterClash(m);
    p.sel = hasSelectedTeam(m);
    return p;
  };
  const eom = new Date(now);
  eom.setMonth(eom.getMonth() + 1, 0);
  eom.setHours(23, 59, 59, 999);
  const liveRank = (m) => isLiveStatus(m.status) ? 0 : 1;
  const select = (pool) => ({
    upcoming: pool.filter((m) => (shouldNotify(m) || isTopTeamInvolved(m)) && m.status !== "FINISHED" && (isLiveStatus(m.status) || new Date(m.utcDate).getTime() > now) && new Date(m.utcDate).getTime() <= eom.getTime()).sort((a, b) => liveRank(a) - liveRank(b) || new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime()).slice(0, 50),
    // v12.5: "نتایج اخیر" must carry the whole week — the old 12-hour window
    // emptied the card every morning after a matchday, so this week's CL
    // results (the exact ones the bot notified on Telegram) never showed.
    // 7 days covers the weekend league round + midweek continental rounds;
    // newest first. v12.32: cap raised 12 \u2192 20 \u2014 the client's \xAB\u0628\u06CC\u0634\u062A\u0631\xBB
    // expander shows the latest 20 (5 by default; PC and phones alike).
    finished: pool.filter((m) => (shouldNotify(m) || isTopTeamInvolved(m)) && m.status === "FINISHED" && now - new Date(m.utcDate).getTime() < 7 * 864e5).sort((a, b) => new Date(b.utcDate).getTime() - new Date(a.utcDate).getTime()).slice(0, 20)
  });
  let { upcoming, finished } = select(matches);
  const BOX_NEAR_MS = 7 * 864e5;
  const lgPool = matches.filter((m) => m.status !== "FINISHED" && isDomesticLeagueCode(m.competition.code) && (isLiveStatus(m.status) || new Date(m.utcDate).getTime() > now && new Date(m.utcDate).getTime() <= now + 90 * 864e5)).sort((a, b) => liveRank(a) - liveRank(b) || new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime());
  const bigLgOf = (m) => isMasterClash(m) || isDerby(m) || isTopTable(m);
  const byKick = (a, b) => new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime();
  const lgBig = lgPool.filter((m) => bigLgOf(m)).sort(byKick);
  const lgRest = lgPool.filter((m) => !bigLgOf(m) && isSelVsTop5(m)).sort(byKick);
  const topSpotPicked = [];
  const topSpotKeys = new Set();
  const addBox = (m) => {
    const k = String(m.id || "") + "|" + m.utcDate;
    if (topSpotKeys.has(k) || topSpotPicked.length >= 11) return;
    topSpotKeys.add(k);
    topSpotPicked.push(m);
  };
  lgBig.slice(0, 11).forEach(addBox);
  lgRest.forEach(addBox);
  const topSpotList = topSpotPicked.sort(byKick);
  const topSpotNext = topSpotList[0] || null;
  const featured = matches.filter((m) => m.status !== "FINISHED" && (isFeaturedMatch(m) || isMasterPair(m)) && (isLiveStatus(m.status) || new Date(m.utcDate).getTime() > Date.now())).sort((a, b) => (isLiveStatus(a.status) ? 0 : 1) - (isLiveStatus(b.status) ? 0 : 1) || new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime());
  const nextBig = featured.length ? pubMatch(featured[0]) : null;
  const standings = {};
  standCodes.forEach((c) => {
    standings[c] = Object.assign({ code: c, name: COMP_EN[c] || c, faName: translateCompetition(c), emblem: LEAGUE_LOGOS[c] || null }, compact(stMap[c]));
  });
  standings.PGL = Object.assign({ code: "PGL", name: COMP_EN.PGL || "Persian Gulf Pro League", faName: translateCompetition("PGL"), emblem: LEAGUE_LOGOS.PGL || null }, compact(stPGL));
  const tierOf = (code) => CONFIG.INTL_COMPETITIONS[code] ? "gold" : code === "CL" ? "gold" : code === "EL" ? "silver" : code === "ECL" ? "bronze" : "domestic";
  const countryOf = (code) => ({ "FA_CUP": "EN", "EFL_CUP": "EN", "CDR": "ES", "COPPA_ITALIA": "IT", "DFB_POKAL": "DE", "HAZFI_CUP": "IR" })[code] || null;
  const cupOrder = ["EL", "ECL", ...Object.keys(CONFIG.INTL_COMPETITIONS), "FA_CUP", "EFL_CUP", "CDR", "COPPA_ITALIA", "DFB_POKAL", "HAZFI_CUP"];
  const EURO_LL_START = +new Date(CONFIG.CUP_PHASE_WINDOWS.EURO_LL_START);
  const FA_ROUND1 = +new Date(CONFIG.CUP_PHASE_WINDOWS.FA_ROUND1);
  const cupsRaw = cupOrder.map((code) => {
    const next = matches.filter((m) => {
      if (m.competition.code !== code) return false;
      if (m.status === "FINISHED") return false;
      if (!(isLiveStatus(m.status) || new Date(m.utcDate).getTime() > Date.now())) return false;
      if (code === "FA_CUP" && new Date(m.utcDate).getTime() < FA_ROUND1) return false;
      return true;
    }).sort((a, b) => (isLiveStatus(a.status) ? 0 : 1) - (isLiveStatus(b.status) ? 0 : 1) || new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime())[0];
    const qualifying = !!(next && (code === "EL" || code === "ECL") && new Date(next.utcDate).getTime() < EURO_LL_START);
    return {
      code,
      name: COMP_EN[code] || code,
      faName: translateCompetition(code),
      emblem: LEAGUE_LOGOS[code] || null,
      tier: tierOf(code),
      country: countryOf(code),
      next: next ? pubMatch(next) : null,
      qualifying
    };
  });
  const cups = cupsRaw.filter((c) => !(CONFIG.INTL_COMPETITIONS[c.code] && !c.next));
  const clMatches = matches.filter((m) => m.competition.code === "CL" && m.status !== "FINISHED" && (isLiveStatus(m.status) || new Date(m.utcDate).getTime() > Date.now() && new Date(m.utcDate).getTime() <= Date.now() + 90 * 864e5)).sort((a, b) => (isLiveStatus(a.status) ? 0 : 1) - (isLiveStatus(b.status) ? 0 : 1) || new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime()).slice(0, 16);
  const clBox = clMatches.filter((m) => hasSelectedTeam(m)).slice(0, 8);
  const uclStarted = stCL ? stCL.started !== false : true;
  const clubsCat = (await env.STATE.get(CONFIG.KV_CLUBS_CATALOG, "json") as any).catch(() => null);
  const crestMap = new Map();
  if (clubsCat && Array.isArray(clubsCat.clubs)) {
    for (const c of clubsCat.clubs) {
      if (c && c.n && c.c) crestMap.set(normTeamKey(c.n), c.c);
    }
  }
  const crestOf = (n) => n ? crestMap.get(normTeamKey(n)) || null : null;
  const ucl = {
    emblem: LEAGUE_LOGOS.CL || null,
    matchday: stCL ? stCL.matchday : null,
    started: uclStarted,
    // Pre-draw: count down to the projected league-phase kickoff instead of
    // showing nothing; real first fixture wins the moment it exists.
    firstStart: !uclStarted && !clMatches.length ? projectedUclStart().toISOString() : null,
    // v12.16: FULL detail per team — the UCL card is a complete league table
    // now (MP / W / D / L / GD / Pts columns), not just points.
    // v12.18: + crest (the round club logo the user asked for).
    teams: stCL ? stCL.teams.map((t) => ({ pos: t.pos, name: t.name, faName: translateTeam(t.name), crest: crestOf(t.name), points: t.points, played: t.played, won: t.won, draw: t.draw, lost: t.lost, gf: t.gf, ga: t.ga, gd: t.gd != null ? t.gd : t.gf != null && t.ga != null ? t.gf - t.ga : null })) : null,
    matches: clBox.map(pubMatch)
  };
  const tNow = getNowTehran(env);
  const daysSinceSat = (tNow.getUTCDay() + 1) % 7;
  const tehranWallMs = Date.UTC(tNow.getUTCFullYear(), tNow.getUTCMonth(), tNow.getUTCDate(), tNow.getUTCHours(), tNow.getUTCMinutes());
  const offsetMs = tehranWallMs - Date.now();
  // v12.51: thisWeek is now a 7-day window from NOW (not from Saturday).
  // Was Saturday-based which meant mid-week users only saw the remaining
  // days of the Persian week, not a full 7-day lookahead.
  const weekStart = Date.now();
  const weekEnd = weekStart + 7 * 864e5;
  const thisWeek = matches.filter((m) => (shouldNotify(m) || isTopTeamInvolved(m)) && new Date(m.utcDate).getTime() >= weekStart && new Date(m.utcDate).getTime() < weekEnd).sort((a, b) => liveRank(a) - liveRank(b) || new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime()).slice(0, 16);
  const nextWeek = matches.filter((m) => (shouldNotify(m) || isTopTeamInvolved(m)) && new Date(m.utcDate).getTime() >= weekEnd && new Date(m.utcDate).getTime() < weekEnd + 7 * 864e5).sort((a, b) => liveRank(a) - liveRank(b) || new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime()).slice(0, 16);
  const data = { upcoming: upcoming.filter((m) => !topSpotKeys.has(String(m.id || "") + "|" + m.utcDate)).map(withTop), finished: finished.map(withTop), nextBig, topSpot: { next: topSpotNext ? withTop(topSpotNext) : null, matches: topSpotList.map(withTop) }, thisWeek: thisWeek.map(withTop), nextWeek: nextWeek.map(withTop), standings, cups, ucl, fetchedAt: null };
  const poolMeta = matches ? (await env.STATE.get(CONFIG.KV_MATCHES_KEY, "json") as any).catch(() => null) : null;
  data.fetchedAt = poolMeta && poolMeta.fetchedAt || (new Date()).toISOString();
  // v12.x-resilience: snapshot fallback. If the live sweep failed OR the
  // pool came back empty (no matches at all from the API), try the long-TTL
  // snapshot in KV \u2014 a stale week of fixtures is still better than empty
  // cards. The data is tagged with `cached: true` + `cachedAt` so the page
  // can show a subtle "cached data" indicator to the user. The 5-min KV
  // cache (above) is still the fast path; this is the last-resort fallback.
  // NOTE: we do NOT fall back when the live sweep succeeded but the upcoming
  // list is empty (e.g. matches exist but all are far-out or unfollowed) \u2014
  // that case still has standings/UCL/cups to render and should NOT use the
  // stale snapshot.
  const poolEmpty = !matches || (Array.isArray(matches) && matches.length === 0);
  if ((liveSweepFailed || poolEmpty) && CONFIG.KV_PUBLIC_SNAPSHOT) {
    const snap = (await env.STATE.get(CONFIG.KV_PUBLIC_SNAPSHOT, "json") as any).catch(() => null);
    if (snap && snap.data && (snap.data.upcoming || snap.data.finished || snap.data.topSpot || snap.data.ucl || snap.data.standings)) {
      const stale = Object.assign({}, snap.data, { cached: true, cachedAt: snap.ts ? new Date(snap.ts).toISOString() : snap.data.fetchedAt });
      // Re-write the short-TTL cache too so the next visitor in the next 5
      // min doesn't all hammer the failing API again \u2014 they all get the
      // stale snapshot from the short cache.
      await env.STATE.put(CONFIG.KV_PUBLIC_MATCHES, JSON.stringify({ ts: Date.now(), data: stale }), { expirationTtl: 60 }).catch(() => {});
      return stale;
    }
  }
  if (upcoming.length || finished.length) {
    await env.STATE.put(CONFIG.KV_PUBLIC_MATCHES, JSON.stringify({ ts: Date.now(), data }), { expirationTtl: 300 }).catch(() => {
    });
    // v12.x-resilience: refresh the 7-day snapshot ONLY when the live sweep
    // succeeded with real data \u2014 otherwise we'd overwrite the snapshot
    // with empty arrays and lose the fallback.
    if (CONFIG.KV_PUBLIC_SNAPSHOT) {
      await env.STATE.put(CONFIG.KV_PUBLIC_SNAPSHOT, JSON.stringify({ ts: Date.now(), data }), { expirationTtl: CONFIG.KV_PUBLIC_SNAPSHOT_TTL || (7 * 24 * 60 * 60) }).catch(() => {
      });
    }
  } else {
    await env.STATE.put(CONFIG.KV_PUBLIC_MATCHES, JSON.stringify({ ts: Date.now(), data }), { expirationTtl: 60 }).catch(() => {
    });
  }
  return data;
}
