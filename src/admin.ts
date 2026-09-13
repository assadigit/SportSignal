// SportSignal — admin panel domain: session auth (PBKDF2 password hash +
// HttpOnly cookie sessions), bot settings (teams/leagues), the club-name
// autocomplete catalog and the /api/simulate dummy fixtures.


import { CONFIG, SPORTSCORE_SLUGS } from "./config";
import type { Env } from "./types";
import { timingSafeEqualStr, fetchJSON, bumpSubrequest } from "./utils";
import { normalizeTeamName } from "./teams.js";
import { normAlias } from "./matches";

export function isAdminRequest(req, env) {
  if (!env.ADMIN_TOKEN) return false;
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) return false;
  return timingSafeEqualStr(authHeader.slice(7), env.ADMIN_TOKEN);
}
export function getAdminCookieToken(req) {
  const m = (req.headers.get("Cookie") || "").match(/(?:^|;\s*)admin_auth=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}
export async function isValidAdminSession(env: Env, req) {
  const sid = getAdminCookieToken(req);
  if (!sid || !/^[a-f0-9]{32,80}$/i.test(sid)) return false;
  const val = await env.STATE.get("admin_sess_" + sid).catch(() => null);
  return !!val;
}
export async function isAdminAuthed(req, env) {
  return isAdminRequest(req, env) || await isValidAdminSession(env, req);
}
export function validateWebhook(req, env) {
  if (!env.WEBHOOK_SECRET) return false;
  const secretToken = req.headers.get("X-Telegram-Bot-Api-Secret-Token");
  return timingSafeEqualStr(secretToken, env.WEBHOOK_SECRET);
}
export async function getSettings(env: Env) {
  const defaults = {
    timezone: env.TEHRAN_TZ || "Asia/Tehran",
    teams: CONFIG.BIG_TEAMS_BY_LEAGUE,
    leagues: CONFIG.LEAGUES
  };
  try {
    const saved = await env.STATE.get(CONFIG.KV_SETTINGS_KEY, "json");
    if (!saved || !saved.timezone) return defaults;
    const teams = {};
    for (const [lg, list] of Object.entries(defaults.teams)) teams[lg] = saved.teams && Array.isArray(saved.teams[lg]) ? saved.teams[lg] : list;
    const leagues = [...new Set([...Array.isArray(defaults.leagues) ? defaults.leagues : [], ...Array.isArray(saved.leagues) ? saved.leagues : []])];
    let cat = null;
    try {
      cat = await env.STATE.get(CONFIG.KV_CLUBS_CATALOG, "json");
    } catch (e) {
      cat = null;
    }
    return { ...defaults, ...saved, teams: syncUclSelection(canonicalizeTeams(teams, cat)), leagues };
  } catch (e) {
    console.error("Settings read failed: " + e.message);
    return defaults;
  }
}
export async function applySettings(env: Env) {
  const s = await getSettings(env);
  env.TEHRAN_TZ = s.timezone;
  CONFIG.BIG_TEAMS_BY_LEAGUE = s.teams;
  CONFIG.LEAGUES = s.leagues;
  return s;
}
export function sanitizeSettings(body) {
  const s = { timezone: "Asia/Tehran", teams: {}, leagues: [] };
  if (typeof body.timezone === "string" && body.timezone.trim()) s.timezone = body.timezone.trim();
  if (Array.isArray(body.leagues)) {
    s.leagues = body.leagues.map((x) => String(x).trim().toUpperCase()).filter((x) => x && CONFIG.KNOWN_LEAGUE_CODES.includes(x));
  }
  if (body.teams && typeof body.teams === "object") {
    for (const [league, teams] of Object.entries(body.teams)) {
      if (Array.isArray(teams)) {
        s.teams[league] = [...new Set(teams.map((t) => String(t).trim()).filter((t) => t && t.length <= 40))];
      }
    }
  }
  return s;
}
export function catalogNameMap(cat) {
  const map = new Map();
  const clubs = cat && Array.isArray(cat.clubs) && cat.clubs || [];
  for (const c of clubs) {
    const k = normAlias(String(c.n || ""));
    if (k && !map.has(k)) map.set(k, c.n);
  }
  for (const c of clubs) {
    const s = String(c.s || "").trim();
    if (!s) continue;
    const k = normAlias(s);
    if (k && !map.has(k)) map.set(k, c.n);
  }
  return map;
}
export function canonicalizeTeams(teams, cat) {
  const map = catalogNameMap(cat);
  const out: any = {};
  for (const [lg, list] of Object.entries(teams || {})) {
    if (!Array.isArray(list)) {
      out[lg] = [];
      continue;
    }
    const seen = new Set();
    const clean = [];
    for (const t of list) {
      const raw = String(t || "").trim();
      if (!raw) continue;
      const k = normAlias(raw);
      if (!k || seen.has(k)) continue;
      seen.add(k);
      clean.push(map.get(k) || raw);
    }
    out[lg] = clean;
  }
  return out;
}
export function syncUclSelection(teams) {
  const out: any = {};
  for (const [lg, list] of Object.entries(teams || {})) out[lg] = Array.isArray(list) ? list : [];
  const seen = new Map();
  for (const t of out.CL || []) {
    const k = normAlias(t);
    if (k && !seen.has(k)) seen.set(k, t);
  }
  for (const [lg, list] of Object.entries(out) as any[]) {
    if (lg === "CL") continue;
    for (const t of list) {
      const k = normAlias(t);
      if (k && !seen.has(k)) seen.set(k, t);
    }
  }
  out.CL = [...seen.values()];
  return out;
}
var FD_TEAMS_CODES = ["CL", "PL", "PD", "SA", "FL1", "BL1"];
export async function fetchFdTeams(env: Env, code) {
  if (bumpSubrequest()) return null;
  try {
    const res = await fetch("https://api.football-data.org/v4/competitions/" + code + "/teams", {
      headers: { "X-Auth-Token": env.API_TOKEN }
    });
    if (!res.ok) {
      console.log("clubs catalog " + code + ": HTTP " + res.status + " (skipped)");
      return null;
    }
    const data = await res.json() as any;
    return data && Array.isArray(data.teams) && data.teams || null;
  } catch (e) {
    console.log("clubs catalog " + code + " failed: " + e.message);
    return null;
  }
}
export async function fetchAlTeams() {
  try {
    const data = await fetchJSON("https://sportscore.com/api/v1/standings/?sport=football&competition=" + SPORTSCORE_SLUGS.AL);
    const rows = data && data.tables && data.tables[0] && data.tables[0].rows || [];
    return rows.map((r) => ({ name: r.team, shortName: "", tla: "", crest: "" }));
  } catch (e) {
    console.log("clubs catalog AL failed: " + e.message);
    return null;
  }
}
export async function refreshClubsCatalog(env: Env) {
  const byKey = new Map();
  const addTeam = (t, league) => {
    const name = String(t && t.name || "").trim();
    if (!name || name.length > 40) return;
    const k = normalizeTeamName(name);
    if (!k) return;
    const cur = byKey.get(k);
    if (cur) {
      if (league && !cur.l.includes(league)) cur.l.push(league);
      return;
    }
    const short = String(t.shortName || "").trim();
    const tla = String(t.tla || "").trim().toUpperCase();
    const crest = String(t.crest || "");
    byKey.set(k, {
      n: name,
      s: short && short !== name ? short : "",
      t: tla.length === 2 || tla.length === 3 ? tla : "",
      l: league ? [league] : [],
      c: crest.startsWith("http") ? crest : ""
    });
  };
  const lg = Array.isArray(CONFIG.LEAGUES) ? CONFIG.LEAGUES : [];
  const tm = CONFIG.BIG_TEAMS_BY_LEAGUE && typeof CONFIG.BIG_TEAMS_BY_LEAGUE === "object" ? Object.keys(CONFIG.BIG_TEAMS_BY_LEAGUE) : [];
  const wanted = [...new Set([...lg, ...tm, ...FD_TEAMS_CODES])];
  for (const code of FD_TEAMS_CODES) {
    if (wanted.includes(code)) {
      const teams = await fetchFdTeams(env, code);
      if (teams) for (const t of teams) addTeam(t, code);
    }
  }
  if (wanted.includes("AL")) {
    const al = await fetchAlTeams();
    if (al) for (const t of al) addTeam(t, "AL");
  }
  const clubs = [...byKey.values()].sort((a, b) => a.n.localeCompare(b.n));
  const cat = { fetchedAt: (new Date()).toISOString(), count: clubs.length, clubs };
  if (clubs.length) {
    await env.STATE.put(CONFIG.KV_CLUBS_CATALOG, JSON.stringify(cat)).catch((e) => console.error("clubs catalog write failed: " + e.message));
  }
  console.log(`\u{1F3E2} Clubs catalog: ${clubs.length} clubs from ${wanted.join(",")}`);
  return cat;
}
export async function getClubsCatalog(env: Env, force) {
  let cat = null;
  try {
    cat = await env.STATE.get(CONFIG.KV_CLUBS_CATALOG, "json");
  } catch (e) {
  }
  const stale = !cat || !Array.isArray(cat.clubs) || !cat.clubs.length || !cat.fetchedAt || Date.now() - new Date(cat.fetchedAt).getTime() > CONFIG.CLUBS_STALE_MS;
  if (force || stale) {
    try {
      const fresh = await refreshClubsCatalog(env);
      if (fresh && fresh.count) cat = fresh;
    } catch (e) {
      console.error("clubs catalog refresh failed: " + e.message);
    }
  }
  return cat || { fetchedAt: null, count: 0, clubs: [] };
}
export function clubsSearch(cat, q, hint) {
  const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
  const nq = norm(q);
  if (!nq) return [];
  const scored = [];
  for (const c of cat.clubs || []) {
    const nn = norm(c.n), ns = norm(c.s), nt = norm(c.t);
    let score = 0;
    if (nn === nq) score = 5;
    else if (ns === nq) score = 4.5;
    else if (nn.startsWith(nq)) score = 4;
    else if (ns.startsWith(nq)) score = 3.5;
    else if (nt === nq) score = 3.2;
    else if (nn.includes(nq)) score = 2;
    else if (ns.includes(nq)) score = 1.5;
    else continue;
    if (hint && c.l && c.l.includes(hint)) score += 0.6;
    scored.push({ score, item: c });
  }
  scored.sort((a, b) => b.score - a.score || a.item.n.localeCompare(b.item.n));
  return scored.slice(0, 8).map((x) => ({ name: x.item.n, short: x.item.s, tla: x.item.t, leagues: x.item.l, crest: x.item.c }));
}
export function dummyForType(type) {
  const now = Date.now();
  const H = 36e5;
  const M = 6e4;
  const offsets = {
    "pre-match-24h": 23 * H,
    // 24h window (20–24h before)
    "pre-match-3h": 3 * H,
    // 3h window (2.5–3.5h before)
    "pre-match-1h": 1 * H,
    // 1h window (0.75–1.5h before)
    "match-start": 5 * M,
    // match-start window (−5..+45min)
    "result": -1 * H
    // result (≤6h after)
  };
  const finished = type === "result";
  return {
    id: "sim-" + type,
    utcDate: new Date(now + offsets[type]).toISOString(),
    status: finished ? "FINISHED" : "SCHEDULED",
    stage: "REGULAR_SEASON",
    competition: { code: "PL" },
    homeTeam: { name: "Arsenal FC" },
    awayTeam: { name: "Chelsea FC" },
    score: { fullTime: finished ? { home: 2, away: 1 } : { home: null, away: null } }
  };
}
export function buildDummyMatches() {
  const base = ["pre-match-24h", "pre-match-3h", "pre-match-1h", "match-start", "result"].map(dummyForType);
  base.push({ ...dummyForType("pre-match-1h"), id: "sim-probe-mixed", homeTeam: { name: "Arsenal FC" }, awayTeam: { name: "Brentford FC" } });
  base.push({ ...dummyForType("pre-match-3h"), id: "sim-probe-none", homeTeam: { name: "Bournemouth FC" }, awayTeam: { name: "Wolves FC" } });
  base.push({ ...dummyForType("pre-match-1h"), id: "sim-probe-el", competition: { code: "EL" }, homeTeam: { name: "Manchester United FC" }, awayTeam: { name: "FCSB" } });
  base.push({ ...dummyForType("pre-match-1h"), id: "sim-probe-ecl", competition: { code: "ECL" }, homeTeam: { name: "Chelsea FC" }, awayTeam: { name: "Panathinaikos FC" } });
  base.push({ ...dummyForType("pre-match-24h"), id: "sim-probe-el-24h", utcDate: new Date(Date.now() + 23 * 36e5).toISOString(), competition: { code: "EL" }, homeTeam: { name: "Manchester United FC" }, awayTeam: { name: "AS Roma" } });
  base.push({ ...dummyForType("result"), id: "sim-probe-knockout", competition: { code: "CL" }, stage: "QUARTER_FINALS", homeTeam: { name: "Arsenal FC" }, awayTeam: { name: "Real Madrid CF" } });
  base.push({ ...dummyForType("pre-match-1h"), id: "sim-probe-cup", competition: { code: "FA_CUP" }, stage: "ROUND_OF_16", homeTeam: { name: "Chelsea FC" }, awayTeam: { name: "Liverpool FC" } });
  base.push({ ...dummyForType("pre-match-24h"), id: "sim-probe-backfill-24h", utcDate: new Date(Date.now() + 10 * 36e5).toISOString() });
  base.push({ ...dummyForType("pre-match-3h"), id: "sim-probe-backfill-3h", utcDate: new Date(Date.now() + 2 * 36e5).toISOString() });
  base.push({ ...dummyForType("pre-match-1h"), id: "sim-probe-bigmatch", utcDate: new Date(Date.now() + 71 * 36e5).toISOString(), homeTeam: { name: "Arsenal FC" }, awayTeam: { name: "Liverpool FC" } });
  base.push({ ...dummyForType("pre-match-1h"), id: "sim-probe-bigmatch-none", utcDate: new Date(Date.now() + 71 * 36e5).toISOString(), homeTeam: { name: "Luton Town FC" }, awayTeam: { name: "Rotherham United FC" } });
  return base;
}
