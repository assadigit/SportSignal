// SportSignal — upstream data providers (football-data.org, sportscore,
// thesportsdb, Wikipedia PGL table), the multi-source merger with crest/venue
// adoption, provider circuit breaker and the KV match cache.
import { CONFIG, PROVIDER_LEAGUE_MAP, SPORTSCORE_SLUGS, TSP_LEAGUE_IDS, CUP_TSP_IDS } from "./config";
import type { Env } from "./types";
import { fetchJSON, fetchWithRetry } from "./utils";
import { normalizeTeamName } from "./teams.js";
import { canonDedupe } from "./dedupe.js";
import { shouldNotify, mapStageName, parseTSPDate } from "./matches";
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
export async function fetchSportScore(env: Env) {
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
      ([code]) => code === "EL" || code === "ECL" || code === "BL1" || code === "FA_CUP" || code === "EFL_CUP" || code === "CDR" || code === "COPPA_ITALIA" || code === "PGL" || code === "AL" && inSeason(code)
    )
  );
  if (!Object.keys(slugs).length) return matches;
  const from = new Date(Date.now() - 864e5);
  const to = new Date(Date.now() + 1 * 864e5);
  const acc = { list: matches, seen };
  let calls = 0, failures = 0;
  for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split("T")[0];
    for (const [code, slug] of Object.entries(slugs)) {
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
  try {
    const existing = await env.STATE.get(CONFIG.KV_MATCHES_KEY, "json").catch(() => null);
    const cutoff = Date.now() - 2 * 864e5;
    const head = (existing && Array.isArray(existing.matches) ? existing.matches : []).filter((m) => new Date(m.utcDate || 0).getTime() > cutoff);
    const merged = canonDedupe([...head, ...matches]);
    if (existing && Array.isArray(existing.matches) && JSON.stringify(merged) === JSON.stringify(existing.matches)) {
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
export async function fetchFootballData(env: Env) {
  const dateFrom = new Date(Date.now() - CONFIG.DAYS_IN_PAST * 864e5).toISOString().split("T")[0];
  const dateTo = new Date(Date.now() + CONFIG.DAYS_IN_FUTURE * 864e5).toISOString().split("T")[0];
  const fdLeagues = CONFIG.LEAGUES.filter((c) => !["EL", "ECL"].includes(c));
  console.log(`\u{1F4C5} Date range: ${dateFrom} to ${dateTo} (${CONFIG.DATE_RANGE_DAYS} days total)`);
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
    const m = await fetchWithRetry(u, env.API_TOKEN, "Leagues+CL");
    console.log(`\u2705 Leagues+CL: ${m.length} matches`);
    pushUnique(m);
  } catch (error) {
    console.error(`\u274C Failed to fetch league matches:`, error.message);
  }
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
  const uefaAcc = { list: allMatches, seen };
  if (await providerSuspended(env, "sportscore")) {
    console.log("\u23ED\uFE0F sportscore suspended \u2014 skipping long-view cup/EL/ECL/BL1 sweeps");
  } else {
    const cupSlugs = [["FA_CUP", SPORTSCORE_SLUGS.FA_CUP], ["EFL_CUP", SPORTSCORE_SLUGS.EFL_CUP], ["CDR", SPORTSCORE_SLUGS.CDR], ["COPPA_ITALIA", SPORTSCORE_SLUGS.COPPA_ITALIA], ["HAZFI_CUP", SPORTSCORE_SLUGS.HAZFI_CUP]];
    const cupDone = {};
    let ssCalls = 0, ssFails = 0;
    for (let i = 0; i < 10; i++) {
      const dateStr = new Date(Date.now() + i * 864e5).toISOString().split("T")[0];
      for (const [cc, slug] of cupSlugs) {
        if (cupDone[cc]) continue;
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
      ssCalls++;
      try {
        await sportScoreDay("EL", SPORTSCORE_SLUGS.EL, dateStr, uefaAcc);
      } catch (e) {
        ssFails++;
        console.error(`\u274C Long view EL failed: ${e.message}`);
      }
      ssCalls++;
      try {
        await sportScoreDay("ECL", SPORTSCORE_SLUGS.ECL, dateStr, uefaAcc);
      } catch (e) {
        ssFails++;
        console.error(`\u274C Long view ECL failed: ${e.message}`);
      }
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
export async function fetchMatchesFromAPI(env: Env) {
  const sources = [
    { name: "football-data", fn: fetchFootballData },
    { name: "sportscore", fn: fetchSportScore },
    { name: "thesportsdb", fn: fetchTheSportsDB }
  ];
  const merged = new Map();
  const used = [];
  await Promise.all(sources.map((s) => (async () => {
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
  })()));
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
