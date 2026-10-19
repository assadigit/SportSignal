// clubs-alternates.js — the CLUB ALTERNATES LIBRARY builder (owner directive
// 2026-10-21: "gather 3-4 pictures per club and folder them in the github,
// like LaLiga > Real-Madrid — players retire or move to other clubs, so
// their picture must alternate; track the transfers market and when a
// player retires/moves, remove him from that club's jersey database and
// use another alternative").
//
// What this builds: assets/players/clubs/<league-folder>/<club-slug>/ —
// FOUR portraits per big-5 club (the published hero + 3 star-ranked
// alternates), plus assets/players/clubs/manifest.json (the club jersey
// DATABASE: rotation order, per-candidate provenance, FD team ids for the
// runtime transfer watch — src/hero-rotation.ts).
//
// League folders: premier-league | laliga | serie-a | bundesliga | ligue-1.
//
// Why alternates are PRE-FETCHED (the point of the directive): when a hero
// transfers/retires, the rotation (scripts/rotate-hero.js, INSTRUCTIONS
// §14) is a LOCAL manifest promotion — no network session, no research,
// no VLM wait — because every alternate is already in the repo, deployed,
// and style-gated. The runtime watch (FD.org squads) only DETECTS the
// departure and logs the worklist; the agentic session executes the swap.
//
// Selection policy per club (the owner's "find another STAR — be flexible"
// directive, extended to a bench):
//   1. the platform squad is star-ranked (starScore — mirrors alt-fetch.js
//      v2.3: shirt number, position, FPL price/points/ownership where the
//      platform serves them)
//   2. the current hero is EXCLUDED (he is already candidate #1, copied
//      byte-identical from assets/players/uefa/)
//   3. the top stars are fetched through the SAME fill contract as
//      alt-fetch v2.3: variant tables (photo series before stylized),
//      white-studio keying, and the VLM STYLE GATE (card renders and
//      head-onlys are REJECTED — a FIFA card must never sit on the bench
//      either); a rejected star is replaced by the next in the ranking
//   4. candidates are ordered jersey_photo before bust_photo (the owner's
//      full-jersey display priority), then by star score
//
// Bundesliga has NO squad enumeration on bundesliga.com (alt-fetch §v2.3)
// — its star ranking comes from Football-Data.org /v4/teams/{id} squads
// (name + position; the same API the runtime watch uses), then the media
// is fetched from the bundesliga.com player pages as usual.
//
// Chunked-run survival (INSTRUCTIONS §11 — the sandbox kills background
// processes): ALL state is checkpointed to .cache/clubs-alternates/ —
// state.json after EVERY candidate, platform squad enumerations persisted
// to disk so re-runs skip them (Serie A's lineup crawl is ~9 requests per
// club — caching it is what makes a 20-club chunked run tractable).
//
// Platform accessors MIRROR alt-fetch.js v2.3 (it is a script, not a
// module — main() runs on require). Keep them in sync; the mirror is
// marked "MIRROR" at each block.
//
// Usage:
//   node scripts/uefa-player-portraits/clubs-alternates.js --fd-ids
//       (build .cache/clubs-alternates/fd-teams.json — 5 FD API calls)
//   node scripts/uefa-player-portraits/clubs-alternates.js --dry
//   node scripts/uefa-player-portraits/clubs-alternates.js --platform "Serie A" --limit 5
//   node scripts/uefa-player-portraits/clubs-alternates.js --club real-madrid-cf
//   node scripts/uefa-player-portraits/clubs-alternates.js --publish-only
//       (regenerate assets/players/clubs/** + manifest.json from state —
//        deterministic; run after any state edit, e.g. a rotation)
//
// Environment: FD_TOKEN (football-data.org API token) for --fd-ids and
// the Bundesliga ranking; Z_AI_SDK_PATH or the sandbox default for the
// VLM gate (degrades LOUDLY, never blocks — spec v2.3 §8c).
"use strict";

const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");
const sharp = require("sharp");
const images = require("./lib/images");
const vlm = require("./lib/vlm");
const parse = require("./lib/parse");

const UA = "SportSignalPortraitPipeline/1.0 (league-official hero portrait collection for sportsignal.ir; contact: sportsignal@atomicmail.io)";
const FETCH_DATE = new Date().toISOString().slice(0, 10);
const FD_BASE = "https://api.football-data.org/v4";

const ROOT = path.resolve(__dirname, "..", "..");
const CLUBS_DIR = path.join(ROOT, "assets", "players", "clubs");
const MANIFEST_FILE = path.join(CLUBS_DIR, "manifest.json");
const UEFA_DIR = path.join(ROOT, "assets", "players", "uefa");
const HERO_CLUBS_FILE = path.join(UEFA_DIR, "hero-clubs.json");

const CACHE = path.join(ROOT, ".cache", "uefa-player-portraits", "clubs-alternates");
const STATE_FILE = path.join(CACHE, "state.json");
const FD_TEAMS_FILE = path.join(CACHE, "fd-teams.json");
const FD_SQUADS_DIR = path.join(CACHE, "fd-squads");
const SQUAD_CACHE = {
  "Premier League": path.join(CACHE, "squads-premierleague.json"),
  "La Liga": path.join(CACHE, "squads-laliga.json"),
  "Serie A": path.join(CACHE, "squads-seriea.json"),
  "Ligue 1": path.join(CACHE, "squads-ligue1.json"),
};
const ORIGINALS_DIR = path.join(CACHE, "originals");

const LEAGUE_FOLDER = {
  "Premier League": "premier-league",
  "La Liga": "laliga",
  "Serie A": "serie-a",
  "Bundesliga": "bundesliga",
  "Ligue 1": "ligue-1",
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function log(...args) { console.log("[clubs-alt]", ...args); }

// MIRROR: alt-fetch.js normName (Turkish dotless ı fold included)
function normName(s) {
  return (s || "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/ı/g, "i")
    .replace(/[^a-z0-9]+/g, " ").trim();
}

async function httpGet(url, { accept = "*/*", timeoutMs = 30000, headers = {} } = {}) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: accept, ...headers },
      signal: ac.signal,
      redirect: "follow",
    });
    const buf = Buffer.from(await res.arrayBuffer());
    if (!res.ok) {
      const err = Object.assign(new Error(`HTTP ${res.status} for ${url.slice(0, 120)}`), { status: res.status });
      if (res.status === 429) {
        const ra = parseInt(res.headers.get("retry-after") || "0", 10);
        if (ra > 0) err.retryAfter = ra;
      }
      throw err;
    }
    if (buf.length > 12 * 1024 * 1024) throw new Error(`download too large (${buf.length}b): ${url.slice(0, 120)}`);
    return buf;
  } finally { clearTimeout(t); }
}

async function validateImage(buf, { expectAlpha = true, minDim = 160 } = {}) {
  const meta = await sharp(buf).metadata();
  if (!["png", "webp", "jpeg"].includes(meta.format)) throw new Error(`unexpected format ${meta.format}`);
  if (expectAlpha && !meta.hasAlpha) throw new Error("source has no alpha channel");
  if (Math.min(meta.width, meta.height) < minDim) throw new Error(`source too small (${meta.width}x${meta.height})`);
  return meta;
}

function readJsonSync(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return fallback; }
}

async function writeJsonAtomic(file, data) {
  await fsp.writeFile(file, JSON.stringify(data, null, 2));
}

// ---------------------------------------------------------------------------
// state (checkpointed after every candidate — chunked-run survival)
// ---------------------------------------------------------------------------
// state = {
//   clubs: {
//     "<slug>": {
//       candidates: [ { player, file, style, star_basis, source_image_url,
//                       source_platform, source_sha256, output_sha256,
//                       fetched_at, alt_source } ],
//       hero: { player, file, style },     // snapshot at build time
//       exhausted: null | { reason },      // set when < target reached
//       attempted: [player names already tried (gate rejections count)]
//     }
//   },
//   fd_ids: { "<slug>": id }   // built by --fd-ids
// }
function loadState() {
  return readJsonSync(STATE_FILE, { clubs: {}, fd_ids: {} });
}
async function saveState(state) { await writeJsonAtomic(STATE_FILE, state); }

// ---------------------------------------------------------------------------
// MIRROR: alt-fetch.js starScore — the star ranking (shirt/position/FPL)
// ---------------------------------------------------------------------------
function starScore(p) {
  const pos = String(p.position || "").toLowerCase();
  let s = /forward|striker|winger|attack/.test(pos) ? 40
    : /midfield/.test(pos) ? 25
    : /defen|back/.test(pos) ? 12
    : /goalkeep|keeper|gk/.test(pos) ? 4
    : 15;
  if (p.price != null) s += p.price * 2;
  if (p.points != null) s += Math.min(30, p.points / 10);
  if (p.selected != null) s += Math.min(25, p.selected / 2);
  if (typeof p.shirt === "number" && p.shirt >= 1 && p.shirt <= 11) s += 8;
  if ([7, 9, 10, 11].includes(p.shirt)) s += 10;
  if (p.apps != null) s += Math.min(15, p.apps * 3);
  return s;
}

function starBasis(p) {
  return "shirt " + (p.shirt != null ? p.shirt : "?") +
    (p.position ? ", " + p.position : "") +
    (p.price != null ? ", FPL £" + p.price.toFixed(1) + "m" : "") +
    (p.points != null ? ", " + p.points + " pts" : "") +
    (p.selected != null ? ", " + p.selected + "% owned" : "") +
    (p.apps != null ? ", " + p.apps + " recent apps" : "");
}

// Identity-tolerant name comparison (the alt-fetch v2.3 gate): display
// names ("Paulo Dybala") must match legal squad names ("Paulo Exequiel
// Dybala") in BOTH directions — exact, or one's tokens appearing in order
// inside the other. Without this the hero leaks onto his own bench (the
// Roma/Dybala lesson: exact-name exclusion missed him, he was fetched as
// his own alternate).
function isSameIdentity(a, b) {
  const fa = normName(a) || "";
  const fb = normName(b) || "";
  if (!fa || !fb) return false;
  if (fa === fb) return true;
  const ta = fa.split(" ").filter(Boolean);
  const tb = fb.split(" ").filter(Boolean);
  const sub = (x, y) => {
    let i = 0;
    for (const t of y) if (i < x.length && t === x[i]) i++;
    return i === x.length;
  };
  return sub(ta, tb) || sub(tb, ta);
}

// ---------------------------------------------------------------------------
// MIRROR: alt-fetch.js platforms (accessors only — no fill logic)
// ---------------------------------------------------------------------------
const pl = {
  cache: null,
  async load() {
    if (this.cache) return this.cache;
    const disk = readJsonSync(SQUAD_CACHE["Premier League"], null);
    if (disk) { this.cache = disk; return this.cache; }
    const buf = await httpGet("https://fantasy.premierleague.com/api/bootstrap-static/", { accept: "application/json" });
    const data = JSON.parse(buf.toString("utf8"));
    const teams = {};
    for (const t of data.teams || []) teams[t.id] = t.name;
    const POS = { 1: "Goalkeeper", 2: "Defender", 3: "Midfielder", 4: "Forward" };
    const players = (data.elements || []).map((e) => ({
      name: `${e.first_name} ${e.second_name}`,
      web_name: e.web_name,
      team: teams[e.team] || null,
      photo_id: String(e.photo || "").replace(/\.(png|jpg)$/i, ""),
      position: POS[e.element_type] || null,
      price: e.now_cost != null ? e.now_cost / 10 : null,
      points: e.total_points != null ? e.total_points : null,
      selected: e.selected_by_percent != null ? parseFloat(e.selected_by_percent) : null,
    }));
    this.cache = { players, teams };
    await writeJsonAtomic(SQUAD_CACHE["Premier League"], this.cache);
    return this.cache;
  },
  clubPlayers(clubDisplay, heroName) {
    const players = (this.cache && this.cache.players) || [];
    // FPL serves SHORT team names ("Man City", "Man Utd", "Spurs") — token
    // matching mixes the Manchester clubs and misses nicknames entirely.
    // HERO-ANCHORED binding instead: the club's squad is the FPL team that
    // CONTAINS the hero player (self-verifying; a wrong team cannot hold
    // him). Token matching is only the fallback (loudly, for review).
    const byTeam = new Map();
    for (const p of players) {
      if (!p.team) continue;
      if (!byTeam.has(p.team)) byTeam.set(p.team, []);
      byTeam.get(p.team).push(p);
    }
    if (heroName) {
      const hn = normName(heroName);
      const last = hn.split(" ").pop();
      for (const [team, list] of byTeam) {
        let hit = list.find((p) => normName(p.name) === hn || normName(p.web_name) === hn);
        if (!hit) {
          const cands = list.filter((p) => normName(p.name).endsWith(" " + last) || normName(p.web_name) === last);
          if (cands.length === 1) hit = cands[0];
        }
        if (hit) return list;
      }
      log(`  ! PL hero "${heroName}" not found in ANY FPL team — token fallback (review the binding)`);
    }
    const clubN = normName(clubDisplay);
    return players.filter((p) => {
      const tn = normName(p.team || "");
      return tn && (tn.includes(clubN.split(" ")[0]) || clubN.includes(tn.split(" ")[0]));
    });
  },
  servable(m) { return !!(m && m.photo_id); },
  imageUrl(m) {
    return `https://resources.premierleague.com/premierleague25/photos/players/110x140/${m.photo_id}.png`;
  },
  altSource(m) {
    return {
      platform: "premierleague.com",
      platform_player_ref: `fpl photo id ${m.photo_id} (${m.name}, ${m.team})`,
      crop_top_fraction: 0,
      allow_upscale: true,
      note: "220x280 official PL headshot card (transparent PNG) — upscaled to the 512 canvas as a documented per-entry exception (no larger official variant is served)",
    };
  },
};

const LALIGA_KEY = "c13c3a8e2f6b46da9c5c425cf61fab3e";
const LALIGA_SLUGS = [
  "athletic-club", "atletico-de-madrid", "c-a-osasuna", "rc-celta", "d-alaves",
  "elche-c-f", "fc-barcelona", "getafe-cf", "levante-ud", "malaga-cf",
  "r-racing-club", "rc-deportivo", "rcd-espanyol", "rayo-vallecano",
  "real-betis", "real-madrid", "real-sociedad", "sevilla-fc", "valencia-cf",
  "villarreal-cf",
];
const laliga = {
  clubSquads: null,
  async loadAll() {
    if (this.clubSquads) return this.clubSquads;
    // incremental: a chunk that died mid-enumeration left a PARTIAL disk
    // cache — only the slugs missing from it are fetched (chunked-run
    // survival, INSTRUCTIONS §11)
    const all = readJsonSync(SQUAD_CACHE["La Liga"], {}) || {};
    for (const slug of LALIGA_SLUGS) {
      if (all[slug]) continue;
      const url = `https://apim.laliga.com/public-service/api/v1/teams/${slug}/squad-manager?limit=50&offset=0&orderField=id&orderType=DESC&seasonYear=2026&contentLanguage=en&subscription-key=${LALIGA_KEY}`;
      const buf = await httpGet(url, { accept: "application/json" });
      const data = JSON.parse(buf.toString("utf8"));
      all[slug] = (data.squads || [])
        .filter((s) => s.role && s.role.id === 1)
        .map((s) => ({
          name: s.person.name || s.person.nickname,
          nickname: s.person.nickname,
          slug: s.person.slug,
          id: s.id,
          photos: s.photos || {},
          shirt: s.shirt_number != null ? s.shirt_number : null,
          position: (s.position && s.position.name) || null,
        }));
      log(`  laliga squad ${slug}: ${all[slug].length} players`);
      await writeJsonAtomic(SQUAD_CACHE["La Liga"], all); // checkpoint per squad
      await sleep(1200);
    }
    this.clubSquads = all;
    return all;
  },
  // HERO-ANCHORED slug pick (the madrid derby trap: "Real Madrid CF" and
  // "Club Atlético de Madrid" both score on token "madrid" and atletico
  // sorts first — the wrong squad silently ranked). The squad that CONTAINS
  // the club's hero wins; token order is only the fallback.
  squadForClub(clubDisplay, heroName) {
    const tokens = normName(clubDisplay).split(" ").filter((t) => t.length > 3 && !["club", "real"].includes(t));
    const scored = [];
    for (const s of LALIGA_SLUGS) {
      const sn = normName(s.replace(/-/g, " "));
      const score = tokens.filter((t) => sn.includes(t)).length;
      if (score > 0) scored.push({ s, score });
    }
    scored.sort((a, b) => b.score - a.score);
    const top = scored.slice(0, 3).map((x) => x.s);
    if (heroName && top.length > 1) {
      const hn = normName(heroName);
      const last = hn.split(" ").pop();
      for (const s of top) {
        const squad = this.clubSquads[s] || [];
        const hit = squad.find((p) =>
          normName(p.name) === hn || normName(p.nickname) === hn ||
          normName(p.name).endsWith(" " + last) || normName(p.nickname) === last);
        if (hit) return squad;
      }
      log(`  ! laliga hero "${heroName}" not in any of [${top.join(", ")}] — using the first (review the binding)`);
    }
    return (top[0] && this.clubSquads[top[0]]) || [];
  },
  servable(m) { return this.variantUrls(m).length > 0; },
  // clubs-library variant picker: the LARGEST variant not exceeding
  // maxDim (the 512px published output needs no 2048px source — this is
  // the one deliberate divergence from alt-fetch's pickLargest)
  variantUrls(m, maxDim = 1024) {
    const photos = m.photos || {};
    const order = ["001", "003", "002", "004"];
    const out = [];
    const pickCapped = (v) => {
      const keys = Object.keys(v || {}).sort((a, b) => {
        const pa = parseInt(String(a).split("x")[0], 10) || 0;
        const pb = parseInt(String(b).split("x")[0], 10) || 0;
        return pb - pa;
      });
      let best = null;
      for (const k of keys) {
        const w = parseInt(String(k).split("x")[0], 10) || 0;
        if (w <= maxDim) { best = v[k]; break; }
      }
      return best || (keys.length ? v[keys[0]] : null);
    };
    for (const k of order) {
      if (!photos[k]) continue;
      const url = pickCapped(photos[k]);
      if (url && !out.some((x) => x.url === url)) {
        out.push({ url, variant: k, series: /_0_/.test(url) ? "stylized" : "photo" });
      }
    }
    for (const [k, v] of Object.entries(photos)) {
      if (order.includes(k)) continue;
      const url = pickCapped(v);
      if (url && !out.some((x) => x.url === url)) {
        out.push({ url, variant: k, series: /_0_/.test(url) ? "stylized" : "photo" });
      }
    }
    return out;
  },
  imageUrl(m) {
    const vs = this.variantUrls(m);
    return vs.length ? vs[0].url : null;
  },
  imageUrls(m) {
    return this.variantUrls(m).map((v) => v.url);
  },
  altSource(m, variantInfo) {
    const v = variantInfo || {};
    return {
      platform: "laliga.com",
      platform_player_ref: `laliga player id ${m.id} (${m.name})`,
      laliga_variant: v.variant ? String(v.variant) + " (" + (v.series || "photo") + " series)" : null,
      crop_top_fraction: 0,
      allow_upscale: false,
      note: "official LaLiga squad media — photo series preferred over the stylized/card series per the v2.3 style gate (the Yamal incident); clubs library fetches the <=1024px variant (512px published output)",
    };
  },
};

const SA_COMP = "serie-a%3A%3AFootball_Competition%3A%3Aec93b94f74294dc98ab5bcfd67fc0d88";
const SA_SEASON = "serie-a%3A%3AFootball_Season%3A%3Aed7fdc2a3e7b408b942ec177b7b956b5";
const seriea = {
  teamsCache: null,
  lineupsCache: null,
  async loadAll() {
    if (this.teamsCache && this.lineupsCache) return;
    // incremental (chunked-run survival): teams from one standings call;
    // lineups crawled only for teams missing from the disk cache
    const disk = readJsonSync(SQUAD_CACHE["Serie A"], null) || { teams: null, lineups: {} };
    let teams = disk.teams;
    if (!teams) {
      const tbuf = await httpGet(`https://api-sdp.legaseriea.it/v1/serie-a/football/seasons/${SA_SEASON}/standings?locale=en-GB`, { accept: "application/json" });
      const data = JSON.parse(tbuf.toString("utf8"));
      teams = (data.teams || []).map((t) => ({ id: t.teamId, name: t.mediaShortName || t.mediaName || t.officialName }));
      await writeJsonAtomic(SQUAD_CACHE["Serie A"], { teams, lineups: disk.lineups || {} });
    }
    const lineups = disk.lineups || {};
    for (const team of teams) {
      if (lineups[team.id]) continue;
      const clubN = normName(team.name);
      const mbuf = await httpGet(`https://api-sdp.legaseriea.it/v1/serie-a/football/seasons/${SA_SEASON}/matches?relevantTeamIds=${encodeURIComponent(team.id)}&locale=en-GB`, { accept: "application/json" });
      const mdata = JSON.parse(mbuf.toString("utf8"));
      const matches = (mdata.matches || mdata || []).slice(0, 8);
      const players = [];
      const seen = new Set();
      for (const m of matches) {
        const mid = (m.matchId || m.id || "").split("::").pop();
        if (!mid) continue;
        try {
          const lbuf = await httpGet(`https://api-sdp.legaseriea.it/v1/serie-a/football/seasons/${SA_SEASON}/matches/serie-a%3A%3AFootball_Match%3A%3A${mid}/lineups?locale=en-GB`, { accept: "application/json" });
          const lu = JSON.parse(lbuf.toString("utf8"));
          for (const side of ["home", "away"]) {
            const sideName = normName(lu[side] && lu[side].mediaName);
            const isTarget = sideName && (sideName === clubN || sideName.includes(clubN) || clubN.includes(sideName));
            for (const p of [...((lu[side] && lu[side].fielded) || []), ...((lu[side] && lu[side].benched) || [])]) {
              if (!isTarget || seen.has(p.playerId)) continue;
              seen.add(p.playerId);
              players.push({
                name: `${p.mediaFirstName || ""} ${p.mediaLastName || ""}`.trim() || p.displayName,
                display: p.displayName,
                playerId: p.playerId,
                imagery: p.imagery || {},
                shirt: p.shirtNumber != null ? p.shirtNumber : (p.number != null ? p.number : null),
                position: (p.role && (p.role.name || p.role)) || (p.position && (p.position.name || p.position)) || null,
                apps: 1,
              });
            }
          }
        } catch { /* match without lineups yet — skip */ }
        await sleep(1000);
        if (players.length >= 26) break;
      }
      lineups[team.id] = { players, teamName: team.name };
      log(`  seriea squad ${team.name}: ${players.length} players`);
      await writeJsonAtomic(SQUAD_CACHE["Serie A"], { teams, lineups }); // checkpoint per club
      await sleep(1000);
    }
    this.teamsCache = teams;
    this.lineupsCache = lineups;
  },
  squadForClub(clubDisplay) {
    const clubN = normName(clubDisplay);
    const team = (this.teamsCache || []).find((t) => {
      const tn = normName(t.name);
      return tn === clubN || tn.includes(clubN) || clubN.includes(tn) ||
        tn.split(" ")[0] === clubN.split(" ")[0];
    });
    if (!team) return [];
    const rec = (this.lineupsCache || {})[team.id];
    return rec ? rec.players : [];
  },
  servable(m) { return !!(m && m.imagery && (m.imagery.playerImage_home_left || m.imagery.playerImage_home_middle)); },
  imageUrl(m) {
    return `https://media-sdp.legaseriea.it/${m.imagery.playerImage_home_left || m.imagery.playerImage_home_middle}`;
  },
  altSource(m) {
    return {
      platform: "legaseriea.it",
      platform_player_ref: `serie-a player ${m.playerId.split("::").pop()} (${m.name})`,
      crop_top_fraction: 0,
      allow_upscale: true,
      note: "official Serie A lineup/squad imagery (1024x1024 transparent webp bust, head+shoulders+chest) — published as-is",
    };
  },
};

// MIRROR: alt-fetch.js bundesliga player-page probe (media access only —
// the RANKING comes from FD squads, see fdSquadFor)
const bundesliga = {
  async trySlug(slug) {
    const url = `https://www.bundesliga.com/en/player/${slug}`;
    let buf;
    try { buf = await httpGet(url, { accept: "text/html" }); }
    catch { return null; }
    const html = buf.toString("utf8");
    const title = (html.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    if (/error|not found|404/i.test(title)) return null;
    const m = html.match(/player\/(dfl-obj-[a-z0-9]+-dfl-clu-[a-z0-9]+-dfl-sea-[a-z0-9]+)-body\.png/);
    if (!m) return null;
    return { title, dflObject: m[1] };
  },
  slugCandidates(name) {
    const n = normName(name);
    const out = [n.replace(/ /g, "-")];
    const parts = n.split(" ");
    if (parts.length > 2) out.push(parts[0] + "-" + parts[parts.length - 1]);
    return [...new Set(out)];
  },
  async findPlayer(clubDisplay, name) {
    for (const slug of this.slugCandidates(name)) {
      const hit = await this.trySlug(slug);
      if (!hit) { await sleep(1500); continue; }
      const clubN = normName(clubDisplay);
      const titleN = normName(hit.title);
      const tokens = clubN.split(" ").filter((t) => t.length > 3 && !["club"].includes(t));
      const match = tokens.some((t) => titleN.includes(t));
      if (!match) { log(`  bundesliga: page "${hit.title}" does not mention club ${clubDisplay} — skipping`); continue; }
      return { ...hit, name: hit.title.split("|")[0].trim(), slug };
    }
    return null;
  },
  imageUrl(m) {
    return `https://assets.bundesliga.com/player/${m.dflObject}-body.png`;
  },
  altSource(m) {
    return {
      platform: "bundesliga.com",
      platform_player_ref: `${m.dflObject} (${m.name}; club verified via page title)`,
      crop_top_fraction: 0.42,
      allow_upscale: true,
      note: "official Bundesliga player body image (780x960 transparent PNG, full body) — top-cropped to head-and-shoulders for collection consistency",
    };
  },
};

const ligue1 = {
  clubIds: null,
  summaries: null,
  async loadAll() {
    if (this.clubIds && this.summaries) return;
    // incremental (chunked-run survival) + error tombstones (a permanently
    // failing club summary is recorded, not re-requested every run)
    const disk = readJsonSync(SQUAD_CACHE["Ligue 1"], null) || { clubIds: null, summaries: {} };
    let clubs = disk.clubIds;
    if (!clubs) {
      let reg = readJsonSync(path.join(CACHE, "ligue1-clubs.json"), null);
      if (!reg) {
        const buf = await httpGet("https://ma-api.ligue1.fr/championship-clubs?season=2026", { accept: "application/json" });
        const data = JSON.parse(buf.toString("utf8"));
        reg = Object.values(data.championshipsClubs || {}).map((c) => ({ id: c.id, name: c.name }));
        await writeJsonAtomic(path.join(CACHE, "ligue1-clubs.json"), reg);
      }
      clubs = reg;
      await writeJsonAtomic(SQUAD_CACHE["Ligue 1"], { clubIds: clubs, summaries: disk.summaries || {} });
    }
    const summaries = disk.summaries || {};
    for (const c of clubs) {
      const key = String(c.id);
      if (summaries[key]) continue;
      try {
        const buf = await httpGet(`https://ma-api.ligue1.fr/championship-club-summary/${c.id}?season=2026`, { accept: "application/json" });
        const data = JSON.parse(buf.toString("utf8"));
        summaries[key] = {
          clubName: c.name,
          players: Object.values((data.squad && data.squad.players) || {}).map((p) => ({
            name: `${p.firstName || ""} ${p.lastName || ""}`.trim(),
            last: p.lastName,
            assets: p.assets || {},
            shirt: p.jerseyNumber != null ? p.jerseyNumber : null,
          })),
        };
      } catch (e) {
        summaries[key] = { error: e.message.slice(0, 100), clubName: c.name };
        log(`  ligue1 summary ${c.name} failed: ${e.message.slice(0, 60)}`);
      }
      await writeJsonAtomic(SQUAD_CACHE["Ligue 1"], { clubIds: clubs, summaries }); // checkpoint
      await sleep(1000);
    }
    this.clubIds = clubs;
    this.summaries = summaries;
  },
  squadForClub(clubDisplay) {
    const clubN = normName(clubDisplay);
    const STOP = new Set(["fc", "ac", "sc", "rc", "as", "club", "stade", "olympique", "de", "athletic", "herault", "the"]);
    const tokens = clubN.split(" ").filter((t) => t.length > 3 && !STOP.has(t));
    let clubId = null;
    for (const [id, rec] of Object.entries((this.summaries || {}))) {
      if (rec.error) continue; // tombstone
      const cn = normName(rec.clubName);
      if (cn === clubN || cn.includes(clubN) || clubN.includes(cn)) { clubId = id; break; }
    }
    if (clubId == null) {
      const hits = Object.entries(this.summaries || {}).filter(([, rec]) => {
        if (rec.error) return false;
        const cn = normName(rec.clubName);
        return tokens.some((t) => cn.split(" ").includes(t));
      });
      if (hits.length === 1) clubId = hits[0][0];
    }
    if (clubId == null) return null;
    return this.summaries[clubId].players;
  },
  servable(m) { return this.variantUrls(m).length > 0; },
  variantUrls(m) {
    const a = m.assets || {};
    const pick = (v) => {
      const keys = Object.keys(v || {});
      return keys.length ? v[keys[0]] : null;
    };
    const out = [];
    for (const kind of ["fullBodyPictures", "bustPictures", "facePictures"]) {
      const url = pick(a[kind]);
      if (url && !out.some((x) => x.url === url)) out.push({ url, kind });
    }
    return out;
  },
  imageUrl(m) {
    const vs = this.variantUrls(m);
    return vs.length ? vs[0].url : null;
  },
  imageUrls(m) {
    return this.variantUrls(m).map((v) => v.url);
  },
  altSource(m, variantInfo) {
    const v = variantInfo || {};
    return {
      platform: "ligue1.fr",
      platform_player_ref: `ligue1 player (${m.name})`,
      ligue1_asset: v.kind || null,
      crop_top_fraction: 0,
      allow_upscale: true,
      note: v.kind === "fullBodyPictures"
        ? "official Ligue 1 full-body kit pose (transparent PNG ~800x1200) — fullBody preferred per the v2.3 jersey-priority directive, published as-is (full figure)"
        : "official Ligue 1 bust picture (transparent PNG) — upscaled to the 512 canvas as a documented per-entry exception (no larger official variant is served)",
    };
  },
};

const PLATFORMS = {
  "Premier League": pl,
  "La Liga": laliga,
  "Serie A": seriea,
  "Bundesliga": bundesliga,
  "Ligue 1": ligue1,
};

// ---------------------------------------------------------------------------
// Football-Data.org: club→team-id map (--fd-ids) + Bundesliga squad ranking
// ---------------------------------------------------------------------------
async function fdGet(pathname, token, { paced = true } = {}) {
  const buf = await httpGet(FD_BASE + pathname, {
    accept: "application/json",
    headers: { "X-Auth-Token": token },
  });
  if (paced) await sleep(6800); // free tier: 10 req/min
  return JSON.parse(buf.toString("utf8"));
}

// heroTeamSlug parity (sync-hero-coverage.js slugify)
function slugifyTeam(name) {
  return String(name || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, "-");
}

async function buildFdIds(fdToken, heroClubs) {
  const byLeague = {};
  for (const [slug, e] of Object.entries(heroClubs.clubs)) {
    (byLeague[e.league] = byLeague[e.league] || []).push(slug);
  }
  const compCode = { "Premier League": "PL", "La Liga": "PD", "Serie A": "SA", "Bundesliga": "BL1", "Ligue 1": "FL1" };
  const fdIds = {};
  const unmatched = [];
  for (const [league, slugs] of Object.entries(byLeague)) {
    const code = compCode[league];
    if (!code) continue;
    log(`FD teams for ${league} (${code})…`);
    let teams;
    try {
      const data = await fdGet(`/competitions/${code}/teams`, fdToken);
      teams = data.teams || [];
    } catch (e) {
      log(`  FD ${code} failed: ${e.message}`);
      continue;
    }
    const bySlug = new Map();
    for (const t of teams) bySlug.set(slugifyTeam(t.name), t);
    for (const slug of slugs) {
      const t = bySlug.get(slug);
      if (t) { fdIds[slug] = t.id; continue; }
      // fuzzy: token overlap
      const want = slug.split("-");
      let best = null, bestScore = 0;
      for (const [ts, tt] of bySlug) {
        const score = want.filter((w) => ts.includes(w)).length;
        if (score > bestScore) { best = tt; bestScore = score; }
      }
      if (best && bestScore >= 1) {
        fdIds[slug] = best.id;
        log(`  fuzzy: ${slug} → ${best.name} (#${best.id})`);
      } else {
        unmatched.push(`${league}: ${slug}`);
      }
    }
    log(`  ${league}: ${slugs.filter((s) => fdIds[s]).length}/${slugs.length} matched`);
  }
  if (unmatched.length) {
    console.log("UNMATCHED (fix by hand in fd-teams.json):");
    for (const u of unmatched) console.log("  " + u);
  }
  return fdIds;
}

async function fdSquadFor(fdTeamId, fdToken) {
  fs.mkdirSync(FD_SQUADS_DIR, { recursive: true });
  const file = path.join(FD_SQUADS_DIR, `${fdTeamId}.json`);
  const disk = readJsonSync(file, null);
  if (disk) return disk;
  const data = await fdGet(`/teams/${fdTeamId}`, fdToken);
  const squad = (data.squad || []).map((p) => ({
    name: p.name,
    position: p.position || null,
    shirt: p.shirtNumber != null ? p.shirtNumber : null,
  }));
  const rec = { teamName: data.name, squad, fetched_at: new Date().toISOString() };
  await writeJsonAtomic(file, rec);
  return rec;
}

// ---------------------------------------------------------------------------
// per-platform star candidate list (excluding the hero)
// ---------------------------------------------------------------------------
async function starCandidatesFor(club, league, heroName, fdToken, needed) {
  const ex = new Set([normName(heroName)]);
  let ranked = [];
  if (league === "Bundesliga") {
    if (!fdToken) { log("  bundesliga ranking needs FD_TOKEN"); return []; }
    const state = loadState();
    const fdId = state.fd_ids[club.slug];
    if (!fdId) { log(`  no fd_team_id for ${club.slug} — run --fd-ids`); return []; }
    const rec = await fdSquadFor(fdId, fdToken);
    ranked = rec.squad.map((p) => ({ ...p, _m: p }));
  } else {
    const platform = PLATFORMS[league];
    let squad = [];
    if (league === "Premier League") { await pl.load(); squad = pl.clubPlayers(club.club, club.hero); }
    else if (league === "La Liga") { await laliga.loadAll(); squad = laliga.squadForClub(club.club, club.hero); }
    else if (league === "Serie A") {
      await seriea.loadAll();
      // legaseriea positions arrive as numeric role ids (1=GK 2=DF 3=MF
      // 4=FW — verified against Lautaro 4 / Barella 3 / Bastoni 2 / J.
      // Martinez 1). Unmapped, starScore's position regex misses them and
      // goalkeepers rank like outfield stars (the Svilar-first lesson).
      const SA_POS = { "1": "Goalkeeper", "2": "Defender", "3": "Midfielder", "4": "Forward" };
      squad = seriea.squadForClub(club.club).map((p) => ({ ...p, position: SA_POS[String(p.position)] || p.position }));
    }
    else if (league === "Ligue 1") { await ligue1.loadAll(); squad = ligue1.squadForClub(club.club) || []; }
    // only servable candidates (a photo-less youth player would waste an
    // attempt slot — mirrors alt-fetch's starFallbackCandidates filter)
    ranked = squad.filter((p) => platform.servable(p)).map((p) => ({ ...p, _m: p }));
  }
  return ranked
    .filter((p) => p && p.name && !isSameIdentity(heroName, p.name))
    .map((p) => ({ name: p.name, score: starScore(p), basis: starBasis(p), m: p._m }))
    .sort((a, b) => b.score - a.score)
    .slice(0, needed);
}

// ---------------------------------------------------------------------------
// the fill: one player, all variants, VLM gate — mirrors alt-fetch v2.3
// ---------------------------------------------------------------------------
async function fillCandidate(club, league, cand, vlmGate) {
  const platform = PLATFORMS[league];
  let m;
  let variantUrls;
  if (league === "Bundesliga") {
    m = await bundesliga.findPlayer(club.club, cand.name);
    if (!m) return { ok: false, error: "no bundesliga.com player page" };
    variantUrls = [{ url: bundesliga.imageUrl(m), variant: null }];
  } else {
    m = cand.m;
    variantUrls = platform.imageUrls ? platform.imageUrls(m).map((u, i) => ({ url: u })) : [{ url: platform.imageUrl(m) }];
    if (league === "Serie A") variantUrls = [{ url: seriea.imageUrl(m) }];
    variantUrls = variantUrls.filter((v) => v.url);
  }
  for (const v of variantUrls) {
    try {
      let buf = await httpGet(v.url, { accept: "image/*" });
      let meta = await validateImage(buf, { expectAlpha: false });
      let bgKey = null;
      const needsKey = !meta.hasAlpha || (await images.studioBackgroundLikely(buf));
      if (needsKey) {
        const keyed = await images.keyStudioBackground(buf);
        bgKey = { keyed_fraction: keyed.keyed_fraction, method: keyed.method };
        buf = keyed.buffer;
        meta = await validateImage(buf);
      }
      const webp = await sharp(buf).webp({ lossless: true, effort: 6 }).toBuffer();

      let vlmStyle = null;
      let vlmNotes = null;
      if (vlmGate.on) {
        const gateDir = path.join(CACHE, "vlm-gate");
        fs.mkdirSync(gateDir, { recursive: true });
        const gateFile = path.join(gateDir, `${club.slug}-${Date.now()}.webp`);
        const preview = await sharp(webp).resize(512, 512, { fit: "inside", withoutEnlargement: true }).webp({ lossless: true }).toBuffer();
        await images.writeFileAtomic(gateFile, preview);
        const cls = await vlm.classifyPortrait(gateFile);
        try { fs.unlinkSync(gateFile); } catch { /* temp */ }
        if (cls.ok) {
          vlmStyle = cls.style;
          vlmNotes = cls.notes;
          if (!vlm.stylePublishable(cls.style)) {
            throw new Error(`style gate REJECTED (${cls.style}${cls.notes ? ": " + String(cls.notes).slice(0, 80) : ""})`);
          }
        } else {
          vlmStyle = "gate_unavailable";
          log(`  ! vlm gate unavailable (${cls.error}) — deterministic QA only`);
        }
      }

      const alt = platform.altSource(m, v);
      if (bgKey) alt.bg_key = bgKey;
      return {
        ok: true,
        player: m.name || cand.name,
        original: webp,
        meta, alt, vlmStyle, vlmNotes, bgKey,
        source_url: v.url,
      };
    } catch (e) {
      log(`  ${cand.name}: variant failed (${e.message.slice(0, 90)})`);
      await sleep(1500);
    }
  }
  return { ok: false, error: "all variants failed" };
}

// ---------------------------------------------------------------------------
// publish: club folders + manifest.json (deterministic from state)
// ---------------------------------------------------------------------------
const STYLE_TIER = { jersey_photo: 0, bust_photo: 1, head_photo: 2, card_render: 3, unclear: 2 };

function fileSlug(name, taken) {
  let s = parse.nameToSlug(name);
  if (!s) s = "player";
  let out = s, i = 2;
  while (taken.has(out)) { out = `${s}-${i++}`; }
  taken.add(out);
  return out;
}

async function publish(state) {
  const heroClubs = JSON.parse(fs.readFileSync(HERO_CLUBS_FILE, "utf8"));
  fs.mkdirSync(CLUBS_DIR, { recursive: true });

  const manifest = {
    schema_version: 1,
    generated_at: new Date().toISOString(),
    description: "Club hero alternates database — the club jersey library (owner directive 2026-10-21): 3-4 star candidates per big-5 club, foldered league > club, pre-fetched and VLM style-gated so a transfer/retirement rotation is a local manifest promotion (scripts/rotate-hero.js), never a scraping session.",
    public_url_prefix: "/players/clubs/",
    rotation_policy: "candidates[active_index] is the club's hero. When the runtime transfer watch (src/hero-rotation.ts, FD.org squads) detects the active player left the club, rotate: npm run heroes:rotate -- --club <slug> — the departed candidate is marked status=departed and its file removed from the club folder; the next candidate still in the squad is promoted. Candidate order = jersey_photo before bust_photo (the full-jersey display priority), then star rank.",
    rights: {
      copyright: "© the respective rights holders (UEFA + the five leagues' official media platforms). Images remain the property of their sources; public availability does not establish redistribution permission.",
      reuse_permission_established: false,
      reuse_status: "unverified — see docs/assets/uefa-player-portraits.md §Rights before any redistribution",
    },
    clubs: {},
  };

  const bySlug = {};
  for (const [slug, e] of Object.entries(heroClubs.clubs)) bySlug[slug] = e;

  let clubsDone = 0, filesWritten = 0;
  for (const [slug, hero] of Object.entries(bySlug)) {
    const st = state.clubs[slug] || { candidates: [] };
    const leagueFolder = LEAGUE_FOLDER[hero.league];
    if (!leagueFolder) continue;
    const clubDir = path.join(CLUBS_DIR, leagueFolder, slug);
    fs.mkdirSync(clubDir, { recursive: true });

    const taken = new Set();
    const candidates = [];

    // candidate #1: the published hero — byte-identical copy from uefa/
    const heroFile = path.basename(hero.portrait_url || "");
    if (hero.status === "complete" && heroFile) {
      const src = path.join(UEFA_DIR, heroFile);
      if (fs.existsSync(src)) {
        const buf = await fsp.readFile(src);
        await images.writeFileAtomic(path.join(clubDir, heroFile), buf);
        filesWritten++;
        taken.add(heroFile.replace(/\.webp$/, ""));
        candidates.push({
          player: hero.player,
          file: heroFile,
          url: "/players/clubs/" + leagueFolder + "/" + slug + "/" + heroFile,
          style: hero.style || null,
          status: "active",
          role: "hero",
          star_basis: "published hero (assets/players/uefa/hero-clubs.json)",
          source: hero.alt_platform || "uefa.com",
          source_url: null,
          output_sha256: images.sha256(buf),
          added_at: (st.hero && st.hero.added_at) || new Date().toISOString(),
        });
      }
    }

    // alternates: style tier first, then star score
    const alts = [...(st.candidates || [])].sort((a, b) => {
      const ta = STYLE_TIER[a.style] != null ? STYLE_TIER[a.style] : 2;
      const tb = STYLE_TIER[b.style] != null ? STYLE_TIER[b.style] : 2;
      if (ta !== tb) return ta - tb;
      return (b.star_score != null ? b.star_score : 0) - (a.star_score != null ? a.star_score : 0);
    });
    for (const alt of alts) {
      if (candidates.length >= 4) break;
      if (candidates.some((c) => normName(c.player) === normName(alt.player))) continue;
      const origFile = path.join(ORIGINALS_DIR, slug, alt.file);
      if (!fs.existsSync(origFile)) continue;
      const original = await fsp.readFile(origFile);
      const norm = await images.normalizePortrait(original, {
        crop_top_fraction: alt.alt_source && alt.alt_source.crop_top_fraction,
        allow_upscale: alt.alt_source && alt.alt_source.allow_upscale,
      });
      const out = path.join(clubDir, alt.file);
      await images.writeFileAtomic(out, norm.buffer);
      filesWritten++;
      taken.add(alt.file.replace(/\.webp$/, ""));
      candidates.push({
        player: alt.player,
        file: alt.file,
        url: "/players/clubs/" + leagueFolder + "/" + slug + "/" + alt.file,
        style: alt.style,
        status: "alternate",
        role: "alternate",
        star_basis: alt.star_basis,
        star_score: alt.star_score != null ? alt.star_score : null,
        source: (alt.alt_source && alt.alt_source.platform) || null,
        source_url: alt.source_image_url,
        output_sha256: images.sha256(norm.buffer),
        normalization: norm.normalization,
        alt_source: alt.alt_source,
        added_at: alt.fetched_at,
      });
    }

    manifest.clubs[slug] = {
      club: hero.club,
      league: hero.league,
      league_folder: leagueFolder,
      fd_team_id: (state.fd_ids && state.fd_ids[slug]) || null,
      active_index: 0,
      candidates,
      ...(st.exhausted && candidates.length < 4 ? { exhausted: st.exhausted } : {}),
    };
    if (candidates.length >= 3) clubsDone++;
  }

  await writeJsonAtomic(MANIFEST_FILE, manifest);
  log(`publish: ${clubsDone} clubs with >=3 candidates, ${filesWritten} files written`);
  log(`manifest → ${path.relative(ROOT, MANIFEST_FILE)}`);
  return manifest;
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------
async function main() {
  const argv = process.argv.slice(2);
  const dry = argv.includes("--dry");
  const fdIdsOnly = argv.includes("--fd-ids");
  const publishOnly = argv.includes("--publish-only");
  const platformFilter = argv.includes("--platform") ? argv[argv.indexOf("--platform") + 1] : null;
  const clubFilter = argv.includes("--club") ? argv[argv.indexOf("--club") + 1] : null;
  const limit = argv.includes("--limit") ? parseInt(argv[argv.indexOf("--limit") + 1], 10) : null;
  const addTarget = argv.includes("--add") ? parseInt(argv[argv.indexOf("--add") + 1], 10) : 3;
  const fdToken = process.env.FD_TOKEN || null;

  const heroClubs = JSON.parse(fs.readFileSync(HERO_CLUBS_FILE, "utf8"));
  const state = loadState();
  fs.mkdirSync(CACHE, { recursive: true });
  fs.mkdirSync(ORIGINALS_DIR, { recursive: true });

  if (fdIdsOnly) {
    if (!fdToken) { console.error("--fd-ids needs FD_TOKEN (football-data.org API token)"); process.exit(2); }
    const fdIds = await buildFdIds(fdToken, heroClubs);
    const prev = readJsonSync(FD_TEAMS_FILE, {});
    const merged = { ...prev, ...fdIds };
    await writeJsonAtomic(FD_TEAMS_FILE, merged);
    state.fd_ids = merged;
    await saveState(state);
    log(`fd-teams: ${Object.keys(merged).length} clubs mapped → ${path.relative(ROOT, FD_TEAMS_FILE)}`);
    return;
  }

  if (publishOnly) {
    await publish(state);
    return;
  }

  // --audit-gaps: re-classify candidates never classified — the 429-storm
  // degrade (style "gate_unavailable", accepted on deterministic QA alone
  // per spec v2.3 §8c) AND the deliberate ungated bulk runs (style null,
  // single-variant platforms fetched while the bucket was throttled). Now
  // that the bucket may have recovered: classify, keep what passes, DROP
  // what turns out to be a card/head (the drop lands in failures so the
  // next fetch run substitutes another star).
  if (argv.includes("--audit-gaps")) {
    const z = await vlm.zai();
    if (!z) { console.error("--audit-gaps needs the z-ai SDK (still unavailable)"); process.exit(2); }
    // the detailed second-pass prompt (calibrated 2026-10-20 — it overturned
    // 4 of 5 fast-pass card verdicts as false positives; a candidate is
    // NEVER dropped on a fast verdict alone, the vlm-style-audit rule)
    const VERIFY_PROMPT =
      "Examine this footballer portrait carefully at the pixel level. Answer: " +
      "1) Is the skin/face photorealistic (real photograph) or computer-generated/illustrated (video-game render, digital painting, vector art)? " +
      "2) Any EA Sports FC / FIFA video-game card frame, rating number, position label, or club/league badges? " +
      "3) What kit is visible and how much (head only / shoulders / full torso)? " +
      "4) What is the cutout style: photographic cutout with natural edges, or flat/graphic illustration edges? " +
      'Strict JSON: {"photorealistic":true|false,"card_elements":"none"|"describe",' +
      '"framing":"...","cutout_style":"photo"|"graphic",' +
      '"verdict":"photo"|"render"|"card","confidence":"high"|"medium"|"low"}';
    const styleFromVerification = (v) => {
      if (!v || typeof v !== "object") return null;
      const verdict = String(v.verdict || "").toLowerCase();
      if (v.photorealistic === false || verdict === "card" || verdict === "render") return "card_render";
      if (verdict === "photo" || v.photorealistic === true) {
        const framing = String(v.framing || "").toLowerCase();
        if (/head only|head-only/.test(framing)) return "head_photo";
        if (/torso|jersey|waist|full body/.test(framing)) return "jersey_photo";
        if (/shoulder|bust/.test(framing)) return "bust_photo";
        return "jersey_photo";
      }
      return null;
    };
    let fixed = 0, dropped = 0, pending = 0;
    for (const [slug, st] of Object.entries(state.clubs)) {
      const keep = [];
      for (const c of (st.candidates || [])) {
        // skip only settled publishable styles; unclear/gate_unavailable/null
        // all stay re-auditable until they resolve. --all ALSO re-refines the
        // wai-llava+platform-derived styles (the stronger z-ai model
        // overwrites them when the daily bucket recovers).
        const skip = c.style && ["jersey_photo", "bust_photo"].includes(c.style) &&
          !(argv.includes("--all") && c.style_source === "wai-llava+platform");
        if (skip) { keep.push(c); continue; }
        const origFile = path.join(ORIGINALS_DIR, slug, c.file);
        if (!fs.existsSync(origFile)) { keep.push(c); continue; }
        const cls = await vlm.classifyPortrait(origFile);
        if (cls.ok && vlm.stylePublishable(cls.style)) {
          c.style = cls.style;
          c.audited_at = new Date().toISOString();
          fixed++;
          log(`  ✓ ${slug}: ${c.player} → ${cls.style}`);
        } else if (cls.ok) {
          // two-pass: the detailed pixel-level re-examination before ANY
          // drop (the fast pass is noisy — vlm-style-audit calibration)
          const v = await vlm.classifyPortrait(origFile, { prompt: VERIFY_PROMPT });
          const vs = v.ok ? styleFromVerification(v.raw) : null;
          if (v.ok && vs && vlm.stylePublishable(vs)) {
            c.style = vs;
            c.audited_at = new Date().toISOString();
            c.verify = { style: vs, verified_at: new Date().toISOString() };
            fixed++;
            log(`  ✓ ${slug}: ${c.player} → fast ${cls.style} OVERTURNED → ${vs}`);
          } else if (v.ok && vs) {
            st.failures = st.failures || {};
            st.failures[c.player] = `audit re-classification: ${vs} (verified, two-pass)`;
            dropped++;
            log(`  ✗ ${slug}: ${c.player} → ${vs} CONFIRMED (two-pass) — DROPPED (a replacement is fetched on the next run)`);
          } else {
            // honest degrade: unverified failure = unclear, keep for a later audit
            c.style = "unclear";
            c.audited_at = new Date().toISOString();
            pending++;
            log(`  ? ${slug}: ${c.player} fast ${cls.style}, verification unparseable/unavailable — kept as unclear`);
            keep.push(c);
          }
        } else {
          pending++;
          log(`  ! ${slug}: ${c.player} still unavailable (${cls.error})`);
          keep.push(c);
        }
        await saveState(state);
      }
      st.candidates = keep;
    }
    await saveState(state);
    log(`audit-gaps: ${fixed} classified, ${dropped} dropped, ${pending} still pending`);
    if (fixed || dropped) await publish(state);
    return;
  }

  const vlmGate = { on: false };
  if (!argv.includes("--no-vlm-gate")) {
    const z = await vlm.zai();
    vlmGate.on = !!z;
    if (!z) log("! z-ai SDK unavailable — VLM style gate OFF this run (deterministic QA only; recorded per entry)");
  }

  // club list in hero-clubs order (deterministic)
  const clubList = Object.entries(heroClubs.clubs).map(([slug, e]) => ({
    slug, club: e.club, league: e.league, hero: e.player, status: e.status,
  })).filter((c) => LEAGUE_FOLDER[c.league]);

  const targets = clubList.filter((c) => {
    if (clubFilter && c.slug !== clubFilter) return false;
    if (platformFilter && c.league !== platformFilter) return false;
    const st = state.clubs[c.slug];
    if (!st) return true;
    return (st.candidates || []).length < addTarget && !st.exhausted;
  });

  log(`${targets.length} clubs still needing candidates (target ${addTarget} alternates each)`);

  let processed = 0;
  for (const club of targets) {
    if (limit && processed >= limit) break;
    processed++;
    const st = state.clubs[club.slug] || { candidates: [], failures: {} };
    st.candidates = st.candidates || [];
    st.failures = st.failures || {};
    state.clubs[club.slug] = st;

    log(`# ${club.club} [${club.league}] — hero: ${club.hero}, have ${st.candidates.length}/${addTarget}`);

    // the star bench: try enough stars to land addTarget after rejections.
    // A name is skipped only on a RECORDED failure — a run killed mid-fill
    // (e.g. inside the VLM 429 ladder) never records one, so the candidate
    // is retried on resume instead of being silently lost (and never
    // falsely tripping the exhausted marker).
    const needed = addTarget + 3;
    const stars = await starCandidatesFor(club, club.league, club.hero, fdToken, needed + st.candidates.length + Object.keys(st.failures).length);
    const fresh = stars.filter((s) => !st.failures[s.name] && !st.candidates.some((c) => isSameIdentity(c.player, s.name)));

    // exhausted = the platform genuinely cannot serve more stars beyond
    // the hero (recorded failures do NOT count — those were real attempts
    // and stay sticky, but the club remains re-targetable for a retry)
    if (stars.length + st.candidates.length < addTarget) {
      st.exhausted = { reason: `only ${stars.length} servable star candidate(s) beyond the hero on the platform`, at: new Date().toISOString() };
      await saveState(state);
      log(`  exhausted at ${st.candidates.length}`);
      continue;
    }

    if (dry) {
      log(`  (dry) star bench: ${fresh.slice(0, addTarget + 2).map((s) => s.name).join(", ")}`);
      continue;
    }

    for (const star of fresh) {
      if (st.candidates.length >= addTarget) break;
      log(`  trying ${star.name} (${star.basis})`);
      const fill = await fillCandidate(club, club.league, star, vlmGate);
      if (fill.ok) {
        const fileSlugName = parse.nameToSlug(fill.player);
        const origDir = path.join(ORIGINALS_DIR, club.slug);
        fs.mkdirSync(origDir, { recursive: true });
        const origFile = path.join(origDir, `${fileSlugName}.webp`);
        await images.writeFileAtomic(origFile, fill.original);
        st.candidates.push({
          player: fill.player,
          file: `${fileSlugName}.webp`,
          style: fill.vlmStyle,
          star_basis: star.basis,
          star_score: star.score,
          source_image_url: fill.source_url,
          source_platform: (fill.alt && fill.alt.platform) || null,
          source_sha256: images.sha256(fill.original),
          fetched_at: new Date().toISOString(),
          alt_source: fill.alt,
        });
        log(`  ✓ ${fill.player} ${fill.meta.width}x${fill.meta.height} style=${fill.vlmStyle} → ${fileSlugName}.webp (${st.candidates.length}/${addTarget})`);
      } else {
        st.failures[star.name] = (fill.error || "failed").slice(0, 140);
        log(`  ✗ ${star.name}: ${fill.error}`);
      }
      await saveState(state); // checkpoint after EVERY candidate
      await sleep(1200);
    }

    if (st.candidates.length < addTarget && !fresh.length && Object.keys(st.failures).length === 0) {
      st.exhausted = { reason: "star pool exhausted (no servable candidates beyond the hero)", at: new Date().toISOString() };
      await saveState(state);
    }
    await saveState(state);
  }

  const counts = {};
  for (const [slug, st] of Object.entries(state.clubs)) {
    const n = (st.candidates || []).length;
    counts[n] = (counts[n] || 0) + 1;
  }
  log(`state: ${JSON.stringify(counts)} (alternates per club) — ${processed} clubs processed this run`);

  if (!dry) {
    log("publishing…");
    await publish(state);
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
