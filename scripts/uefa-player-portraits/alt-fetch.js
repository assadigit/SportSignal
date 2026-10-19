// alt-fetch.js — league-official alternative sources for hero entries that
// UEFA does not cover (2026-10-19, owner directive: "find alternatives for
// the remaining clubs, same style and quality — FIFA, the leagues' own
// websites, or club websites").
//
// Scope: big-5 league clubs whose hero MVP has no UEFA transparent cutoff
// (manifest status no_asset/missing — every such club now carries verified
// no_asset evidence). UEFA stays the preferred source — this stage only
// fills the documented gaps, and the provenance of every published file
// records which platform it came from (spec v2.1 §8b).
//
// Platforms (all serving transparent-background official squad media):
//   premierleague  FPL bootstrap JSON → photo id →
//                  resources.premierleague.com/premierleague25/photos/
//                  players/110x140/{id}.png   (220×280 RGBA — upscaled with
//                  a documented per-entry exception)
//   laliga         apim.laliga.com squad-manager → assets.laliga.com/squad/
//                  2026/t{team}/p{player}/2048x2048/...png (2048×2048 RGBA)
//   seriea         api-sdp.legaseriea.it standings → matches → lineups →
//                  media-sdp.legaseriea.it/playerImages/... (1024×1024
//                  RGBA webp, full-body pose — top-cropped)
//   bundesliga     www.bundesliga.com/en/player/{slug} page (title carries
//                  the club → identity anchor) → assets.bundesliga.com/
//                  player/{dfl-obj}-body.png (780×960 RGBA, full body —
//                  top-cropped to head-and-shoulders)
//   ligue1         ma-api.ligue1.fr championship-club-summary →
//                  s3 ligue1.image bustPictures (800×600 RGBA)
//
// What it writes (idempotent, --dry / --player supported):
//   .cache/uefa-player-portraits/originals/{key}.webp   pristine original,
//                     lossless WebP at native size (provenance: sha256)
//   fetch-log entry:   status complete + alt_source provenance block
//   discovery entry:   status resolved, hero.chosen_candidate, verification
//                      notes documenting the platform match
//
// Usage:
//   node scripts/uefa-player-portraits/alt-fetch.js --dry
//   node scripts/uefa-player-portraits/alt-fetch.js
//   node scripts/uefa-player-portraits/alt-fetch.js --player brighton-hove-albion-fc
//   (--player takes the roster state_key — the exact club slug)
"use strict";

const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");
const sharp = require("sharp");
const { config } = require("./lib/config");
const images = require("./lib/images");

const UA = "SportSignalPortraitPipeline/1.0 (league-official hero portrait collection for sportsignal.ir; contact: sportsignal@atomicmail.io)";
const FETCH_DATE = new Date().toISOString().slice(0, 10);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function log(...args) { console.log("[alt-fetch]", ...args); }

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------
function normName(s) {
  return (s || "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

async function httpGet(url, { accept = "*/*", timeoutMs = 30000 } = {}) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: accept },
      signal: ac.signal,
      redirect: "follow",
    });
    const buf = Buffer.from(await res.arrayBuffer());
    if (!res.ok) throw Object.assign(new Error(`HTTP ${res.status} for ${url.slice(0, 120)}`), { status: res.status });
    if (buf.length > 12 * 1024 * 1024) throw new Error(`download too large (${buf.length}b): ${url.slice(0, 120)}`);
    return buf;
  } finally { clearTimeout(t); }
}

async function validateImage(buf, { expectAlpha = true, minDim = 160 } = {}) {
  const meta = await sharp(buf).metadata();
  if (!["png", "webp"].includes(meta.format)) throw new Error(`unexpected format ${meta.format}`);
  if (expectAlpha && !meta.hasAlpha) throw new Error("source has no alpha channel");
  if (Math.min(meta.width, meta.height) < minDim) throw new Error(`source too small (${meta.width}x${meta.height})`);
  return meta;
}

// ---------------------------------------------------------------------------
// platform: Premier League (FPL bootstrap → photo id → resources CDN)
// ---------------------------------------------------------------------------
const pl = {
  cache: null,
  async load() {
    if (this.cache) return this.cache;
    const buf = await httpGet("https://fantasy.premierleague.com/api/bootstrap-static/", { accept: "application/json" });
    const data = JSON.parse(buf.toString("utf8"));
    const teams = {};
    for (const t of data.teams || []) teams[t.id] = t.name;
    const players = (data.elements || []).map((e) => ({
      name: `${e.first_name} ${e.second_name}`,
      web_name: e.web_name,
      team: teams[e.team] || null,
      team_id: e.team,
      photo_id: String(e.photo || "").replace(/\.(png|jpg)$/i, ""),
    }));
    this.cache = { players, teams };
    return this.cache;
  },
  async findPlayer(clubDisplay, candidateNames) {
    const { players } = await this.load();
    const clubN = normName(clubDisplay);
    const clubPlayers = players.filter((p) => {
      const tn = normName(p.team || "");
      return tn && (tn.includes(clubN.split(" ")[0]) || clubN.includes(tn.split(" ")[0]));
    });
    const pool = clubPlayers.length ? clubPlayers : players;
    for (const cand of candidateNames) {
      const n = normName(cand);
      let m = pool.find((p) => normName(p.name) === n || normName(p.web_name) === n);
      if (!m) { // unique last-name match within the club
        const last = n.split(" ").pop();
        const cands = pool.filter((p) => normName(p.name).endsWith(" " + last) || normName(p.web_name) === last);
        if (cands.length === 1) m = cands[0];
      }
      if (m && m.photo_id) return m;
    }
    return null;
  },
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

// ---------------------------------------------------------------------------
// platform: LaLiga (squad-manager API → assets.laliga.com squad photos)
// ---------------------------------------------------------------------------
const LALIGA_KEY = "c13c3a8e2f6b46da9c5c425cf61fab3e"; // public key embedded in every laliga.com page
const LALIGA_SLUGS = [
  "athletic-club", "atletico-de-madrid", "c-a-osasuna", "rc-celta", "d-alaves",
  "elche-c-f", "fc-barcelona", "getafe-cf", "levante-ud", "malaga-cf",
  "r-racing-club", "rc-deportivo", "rcd-espanyol", "rayo-vallecano",
  "real-betis", "real-madrid", "real-sociedad", "sevilla-fc", "valencia-cf",
  "villarreal-cf",
];
const laliga = {
  clubSquads: {},
  slugForClub(clubDisplay) {
    const tokens = normName(clubDisplay).split(" ").filter((t) => t.length > 3 && !["club", "real"].includes(t));
    if (!tokens.length) return null;
    let best = null, bestScore = 0;
    for (const s of LALIGA_SLUGS) {
      const sn = normName(s.replace(/-/g, " "));
      const score = tokens.filter((t) => sn.includes(t)).length;
      if (score > bestScore) { best = s; bestScore = score; }
    }
    return bestScore > 0 ? best : null;
  },
  // candidate slugs ranked by token score — ambiguous club names ("RCD
  // Espanyol de Barcelona" vs "fc-barcelona") are disambiguated by the
  // PLAYER match itself: try the top slugs until a candidate matches
  slugsForClub(clubDisplay, max = 3) {
    const tokens = normName(clubDisplay).split(" ").filter((t) => t.length > 3 && !["club", "real"].includes(t));
    if (!tokens.length) return [];
    const scored = [];
    for (const s of LALIGA_SLUGS) {
      const sn = normName(s.replace(/-/g, " "));
      const score = tokens.filter((t) => sn.includes(t)).length;
      if (score > 0) scored.push({ s, score });
    }
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, max).map((x) => x.s);
  },
  async loadSquad(slug) {
    if (this.clubSquads[slug]) return this.clubSquads[slug];
    const url = `https://apim.laliga.com/public-service/api/v1/teams/${slug}/squad-manager?limit=50&offset=0&orderField=id&orderType=DESC&seasonYear=2026&contentLanguage=en&subscription-key=${LALIGA_KEY}`;
    const buf = await httpGet(url, { accept: "application/json" });
    const data = JSON.parse(buf.toString("utf8"));
    const players = (data.squads || [])
      .filter((s) => s.role && s.role.id === 1)
      .map((s) => ({
        name: s.person.name || s.person.nickname,
        nickname: s.person.nickname,
        slug: s.person.slug,
        id: s.id,
        photos: s.photos || {},
      }));
    this.clubSquads[slug] = players;
    await sleep(1200);
    return players;
  },
  matchInSquad(squad, candidateNames) {
    for (const cand of candidateNames) {
      const n = normName(cand);
      let m = squad.find((p) => normName(p.name) === n || normName(p.nickname) === n || normName(p.slug) === n.replace(/ /g, "-"));
      if (!m) {
        const last = n.split(" ").pop();
        const cands = squad.filter((p) => normName(p.name).endsWith(" " + last) || normName(p.nickname) === last);
        if (cands.length === 1) m = cands[0];
      }
      if (m) return m;
    }
    return null;
  },
  async findPlayer(clubDisplay, candidateNames) {
    for (const slug of this.slugsForClub(clubDisplay)) {
      const squad = await this.loadSquad(slug);
      const m = this.matchInSquad(squad, candidateNames);
      if (m) return m;
    }
    return null;
  },
  imageUrl(m) {
    const photos = m.photos["004"] || m.photos["001"] || Object.values(m.photos)[0] || {};
    return photos["2048x2048"] || photos["1024x1024"] || Object.values(photos)[0];
  },
  altSource(m) {
    return {
      platform: "laliga.com",
      platform_player_ref: `laliga player id ${m.id} (${m.name})`,
      crop_top_fraction: 0,
      allow_upscale: false,
      note: "official LaLiga squad portrait, transparent PNG up to 2048x2048",
    };
  },
};

// ---------------------------------------------------------------------------
// platform: Serie A (standings → matches → lineups → media-sdp player images)
// ---------------------------------------------------------------------------
const SA_COMP = "serie-a%3A%3AFootball_Competition%3A%3Aec93b94f74294dc98ab5bcfd67fc0d88";
const SA_SEASON = "serie-a%3A%3AFootball_Season%3A%3Aed7fdc2a3e7b408b942ec177b7b956b5";
const seriea = {
  teamsCache: null,
  lineupsCache: {},
  async loadTeams() {
    if (this.teamsCache) return this.teamsCache;
    const buf = await httpGet(`https://api-sdp.legaseriea.it/v1/serie-a/football/seasons/${SA_SEASON}/standings?locale=en-GB`, { accept: "application/json" });
    const data = JSON.parse(buf.toString("utf8"));
    this.teamsCache = (data.teams || []).map((t) => ({
      id: t.teamId,
      name: t.mediaShortName || t.mediaName || t.officialName,
    }));
    return this.teamsCache;
  },
  async loadClubPlayers(clubDisplay) {
    const teams = await this.loadTeams();
    const clubN = normName(clubDisplay);
    const team = teams.find((t) => {
      const tn = normName(t.name);
      return tn === clubN || tn.includes(clubN) || clubN.includes(tn) ||
        tn.split(" ")[0] === clubN.split(" ")[0];
    });
    if (!team) return { players: [], teamName: null };
    if (this.lineupsCache[team.id]) return this.lineupsCache[team.id];

    const buf = await httpGet(`https://api-sdp.legaseriea.it/v1/serie-a/football/seasons/${SA_SEASON}/matches?relevantTeamIds=${encodeURIComponent(team.id)}&locale=en-GB`, { accept: "application/json" });
    const data = JSON.parse(buf.toString("utf8"));
    const matches = (data.matches || data || []).slice(0, 8);
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
            });
          }
        }
      } catch { /* match without lineups yet — skip */ }
      await sleep(1000);
      if (players.length >= 26) break;
    }
    this.lineupsCache[team.id] = { players, teamName: team.name };
    return this.lineupsCache[team.id];
  },
  async findPlayer(clubDisplay, candidateNames) {
    const { players } = await this.loadClubPlayers(clubDisplay);
    for (const cand of candidateNames) {
      const n = normName(cand);
      let m = players.find((p) => normName(p.name) === n || normName(p.display) === n);
      if (!m) {
        const last = n.split(" ").pop();
        const cands = players.filter((p) => normName(p.name).endsWith(" " + last) || normName(p.display) === last);
        if (cands.length === 1) m = cands[0];
      }
      if (m && m.imagery && (m.imagery.playerImage_home_left || m.imagery.playerImage_home_middle)) return m;
    }
    return null;
  },
  imageUrl(m) {
    return `https://media-sdp.legaseriea.it/${m.imagery.playerImage_home_left || m.imagery.playerImage_home_middle}`;
  },
  altSource(m) {
    return {
      platform: "legaseriea.it",
      platform_player_ref: `serie-a player ${m.playerId.split("::").pop()} (${m.name})`,
      crop_top_fraction: 0.45,
      allow_upscale: true,
      note: "official Serie A lineup/squad imagery (1024x1024 transparent webp, full-body pose) — top-cropped to head-and-shoulders for collection consistency",
    };
  },
};

// ---------------------------------------------------------------------------
// platform: Bundesliga (player page → assets.bundesliga.com body PNG)
// ---------------------------------------------------------------------------
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
  slugCandidates(candidateNames) {
    const out = [];
    for (const cand of candidateNames) {
      const n = normName(cand);
      out.push(n.replace(/ /g, "-"));
      const parts = n.split(" ");
      if (parts.length > 2) out.push(parts[0] + "-" + parts[parts.length - 1]);
    }
    return [...new Set(out)];
  },
  async findPlayer(clubDisplay, candidateNames) {
    for (const slug of this.slugCandidates(candidateNames)) {
      const hit = await this.trySlug(slug);
      if (!hit) { await sleep(1500); continue; }
      // club verification: the page title carries the club name
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

// ---------------------------------------------------------------------------
// platform: Ligue 1 (ma-api club summary → S3 bust pictures)
// ---------------------------------------------------------------------------
const ligue1 = {
  clubIds: null,
  async loadClubs() {
    if (this.clubIds) return this.clubIds;
    const cacheFile = path.join(config.cache_dir, "heroes-research", "ligue1-clubs.json");
    try {
      this.clubIds = JSON.parse(fs.readFileSync(cacheFile, "utf8"));
      return this.clubIds;
    } catch { /* rebuild below */ }
    // official club registry (all French pro clubs incl. lower divisions)
    const buf = await httpGet("https://ma-api.ligue1.fr/championship-clubs?season=2026", { accept: "application/json" });
    const data = JSON.parse(buf.toString("utf8"));
    const out = Object.values(data.championshipsClubs || {}).map((c) => ({ id: c.id, name: c.name }));
    fs.mkdirSync(path.dirname(cacheFile), { recursive: true });
    fs.writeFileSync(cacheFile, JSON.stringify(out, null, 2));
    this.clubIds = out;
    return out;
  },
  summaries: {},
  async loadSquad(clubDisplay) {
    const clubs = await this.loadClubs();
    const clubN = normName(clubDisplay);
    const STOP = new Set(["fc", "ac", "sc", "rc", "as", "club", "stade", "olympique", "de", "athletic", "herault", "the"]);
    const tokens = clubN.split(" ").filter((t) => t.length > 3 && !STOP.has(t));
    let club = clubs.find((c) => {
      const cn = normName(c.name);
      return cn === clubN || cn.includes(clubN) || clubN.includes(cn);
    });
    if (!club) {
      // token-overlap match ("Le Havre AC" ~ "Havre Athletic Club"):
      // unique significant token shared with exactly one API club
      const hits = clubs.filter((c) => {
        const cn = normName(c.name);
        return tokens.some((t) => cn.split(" ").includes(t));
      });
      if (hits.length === 1) club = hits[0];
    }
    if (!club) return null;
    if (this.summaries[club.id]) return this.summaries[club.id];
    const buf = await httpGet(`https://ma-api.ligue1.fr/championship-club-summary/${club.id}?season=2026`, { accept: "application/json" });
    const data = JSON.parse(buf.toString("utf8"));
    const players = Object.values((data.squad && data.squad.players) || {}).map((p) => ({
      name: `${p.firstName || ""} ${p.lastName || ""}`.trim(),
      last: p.lastName,
      assets: p.assets || {},
    }));
    this.summaries[club.id] = { players, clubName: club.name };
    return this.summaries[club.id];
  },
  async findPlayer(clubDisplay, candidateNames) {
    const squad = await this.loadSquad(clubDisplay);
    if (!squad) return null;
    for (const cand of candidateNames) {
      const n = normName(cand);
      let m = squad.players.find((p) => normName(p.name) === n);
      if (!m) {
        const last = n.split(" ").pop();
        const cands = squad.players.filter((p) => normName(p.last || "") === last);
        if (cands.length === 1) m = cands[0];
      }
      if (m) return m;
    }
    return null;
  },
  imageUrl(m) {
    const bust = m.assets.bustPictures || {};
    return bust.large || bust.medium || bust.small || (m.assets.facePictures || {}).large;
  },
  altSource(m) {
    return {
      platform: "ligue1.fr",
      platform_player_ref: `ligue1 player (${m.name})`,
      crop_top_fraction: 0,
      allow_upscale: true,
      note: "official Ligue 1 bust picture (transparent PNG, ~400x300) — upscaled to the 512 canvas as a documented per-entry exception (no larger official variant is served)",
    };
  },
};

// ---------------------------------------------------------------------------
// candidate-fallback wrapper: returns ALL candidate matches in roster order
// (the download loop then tries each until one validates — a broken CDN
// asset for the primary candidate must not sink the club)
// ---------------------------------------------------------------------------
async function findMatches(platform, clubDisplay, candidateNames) {
  const matches = [];
  for (const cand of candidateNames) {
    let m = null;
    try { m = await platform.findPlayer(clubDisplay, [cand]); }
    catch { /* platform lookup error for this candidate — skip */ }
    if (m) {
      const url = platform.imageUrl(m);
      const name = m.name || m.display || cand;
      if (url && !matches.some((x) => x.url === url)) matches.push({ url, m, name, candidate: cand });
    }
  }
  return matches;
}

// ---------------------------------------------------------------------------
// platform dispatch by league
// ---------------------------------------------------------------------------
const PLATFORMS = {
  "Premier League": pl,
  "La Liga": laliga,
  "Serie A": seriea,
  "Bundesliga": bundesliga,
  "Ligue 1": ligue1,
};

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------
async function main() {
  const argv = process.argv.slice(2);
  const dry = argv.includes("--dry");
  const playerFilter = (argv[argv.indexOf("--player") + 1] || "").replace(/\.webp$/, "") || null;

  const rosterFile = path.join(config.script_dir, "roster-heroes.json");
  const manifestFile = path.join(config.asset_dir, "manifest-heroes.json");
  const cacheDir = path.join(config.cache_dir, "heroes");
  const fetchLogFile = path.join(cacheDir, "fetch-log.json");
  const discoveryFile = path.join(cacheDir, "discovery.json");

  const roster = JSON.parse(fs.readFileSync(rosterFile, "utf8"));
  const manifest = JSON.parse(fs.readFileSync(manifestFile, "utf8"));
  const fetchLog = JSON.parse(fs.readFileSync(fetchLogFile, "utf8"));
  const discovery = JSON.parse(fs.readFileSync(discoveryFile, "utf8"));

  // targets: UEFA-unresolved entries (missing/no_asset), optionally one club
  const statusByKey = {};
  for (const e of manifest.entries) statusByKey[e.hero ? e.hero.club_slug : e.filename.replace(/\.webp$/, "")] = e.status;
  const targets = roster.players.filter((p) => {
    const key = p.state_key || p.filename.replace(/\.webp$/, "");
    if (playerFilter && key !== playerFilter) return false;
    const st = statusByKey[key];
    return st === "missing" || st === "no_asset";
  });

  log(`${targets.length} hero entries to fill from league-official sources`);

  const results = [];
  for (const p of targets) {
    const key = p.state_key;
    const league = (p.hero && p.hero.league) || null;
    const platform = PLATFORMS[league];
    const rec = { key, club: p.requested_club_label, league, status: "not_found", platform: league };
    results.push(rec);

    if (!platform) { log(`# ${p.requested_club_label}: no alt platform for league "${league}"`); continue; }

    // ordered candidates, primary first
    const candidates = [p.requested_name];
    for (const c of (p.hero && p.hero.candidates) || []) {
      const n = typeof c === "string" ? c : c.name;
      if (n && !candidates.includes(n)) candidates.push(n);
    }

    const matches = await findMatches(platform, p.requested_club_label, candidates);
    if (!matches.length) { log(`# ${p.requested_club_label}: no candidate matched on ${league}`); continue; }

    rec.status = "matched";
    rec.player = matches[0].name;
    rec.url = matches[0].url;
    rec.matches_considered = matches.map((x) => x.name);

    if (dry) { log(`# ${p.requested_club_label}: ${rec.player} → ${matches[0].url.slice(0, 90)}… (dry)`); continue; }

    let done = false;
    let lastErr = null;
    for (const match of matches) {
      if (done) break;
    try {
      const m = match.m;
      const imageUrl = match.url;
      const buf = await httpGet(imageUrl, { accept: "image/*" });
      const meta = await validateImage(buf);
      const alt = platform.altSource(m);
      // pristine original → lossless WebP at native size
      const webp = await sharp(buf).webp({ lossless: true, effort: 6 }).toBuffer();
      const dest = path.join(config.originals_dir, `${key}.webp`);
      await images.writeFileAtomic(dest, webp);

      fetchLog[key] = {
        status: "complete",
        key,
        roster_index: p.roster_index,
        source_image_url: imageUrl,
        source_asset_season: "2026/27",
        source_competition: `${league} (league-official media)`,
        url: imageUrl,
        fetched_at: new Date().toISOString(),
        source_width: meta.width,
        source_height: meta.height,
        source_has_alpha: Boolean(meta.hasAlpha),
        source_format: meta.format,
        source_sha256: images.sha256(webp),
        bytes: webp.length,
        download_transport: "direct (league-official platform)",
        alt_source: alt,
        warnings: [],
      };

      // discovery: mark resolved with the platform match as chosen candidate
      // (create the entry when the club has no discovery record — e.g.
      // research-resolved no_asset clubs that never went through a
      // squad-page crawl)
      let disc = discovery.players.find((d) => d.key === key);
      if (!disc) {
        disc = {
          key,
          roster_index: p.roster_index,
          requested_name: p.requested_name,
          requested_name_display: p.requested_name_display || p.requested_name,
          requested_club_label: p.requested_club_label,
          filename: p.filename,
          status: "unresolved",
          uefa_player_id: p.uefa_player_id || null,
          canonical_profile_url: null,
          identity: null,
          verification: { ok: true, notes: [], problems: [] },
          observed_uefa_club: null,
          observed_competition: null,
          observed_season: null,
          candidates: [],
          probe_hint: null,
          hero: {
            club_slug: (p.hero && p.hero.club_slug) || key,
            club_display: (p.hero && p.hero.club_display) || p.requested_club_label,
            league: (p.hero && p.hero.league) || league,
            selection_basis: (p.hero && p.hero.selection_basis) || null,
            chosen_candidate: null,
            candidates_considered: (p.hero && p.hero.candidates || []).map((c) => (typeof c === "string" ? c : c.name)),
          },
          warnings: [],
          errors: [],
        };
        discovery.players.push(disc);
      }
      disc.status = "resolved";
      disc.hero = disc.hero || {};
      disc.hero.chosen_candidate = match.name;
      if (!disc.warnings) disc.warnings = [];
      disc.warnings.push(
        `alt source: no UEFA transparent cutoff exists for this club's candidates; portrait filled from ${alt.platform} (${alt.platform_player_ref}), official league media — provenance in fetch log alt_source`
      );
      disc.verification = disc.verification || { ok: true, notes: [], problems: [] };
      disc.verification.notes.push(
        `identity anchored by the ${league} platform match: player "${match.name}" on ${p.requested_club_label}'s official ${alt.platform} data (${FETCH_DATE})`
      );
      rec.status = "complete";
      rec.player = match.name;
      rec.url = imageUrl;
      log(`# ${p.requested_club_label}: ${match.name} ${meta.width}x${meta.height} alpha=${meta.hasAlpha} → ${key}.webp`);
      await fsp.writeFile(fetchLogFile, JSON.stringify(fetchLog, null, 2));
      await fsp.writeFile(discoveryFile, JSON.stringify(discovery, null, 2));
      done = true;
    } catch (err) {
      lastErr = err;
      log(`# ${p.requested_club_label}: ${match.name} download/validate failed (${err.message.slice(0, 60)}) — trying next candidate`);
    }
    }
    if (!done && !dry) {
      rec.status = "error";
      rec.error = lastErr ? lastErr.message : "no downloadable candidate";
    }
  }

  const counts = {};
  for (const r of results) counts[r.status] = (counts[r.status] || 0) + 1;
  console.log("\n=== ALT-FETCH SUMMARY ===", JSON.stringify(counts));
  for (const r of results) {
    const mark = r.status === "complete" ? "✓" : r.status === "matched" ? "○" : "✗";
    console.log(`  ${mark} ${r.club} [${r.league}]: ${r.player || "—"} ${r.status}${r.error ? " — " + r.error.slice(0, 80) : ""}`);
  }
  const provenance = { generated_at: new Date().toISOString(), results };
  const provFile = path.join(config.cache_dir, "heroes-research", "alt-sources.json");
  fs.mkdirSync(path.dirname(provFile), { recursive: true });
  fs.writeFileSync(provFile, JSON.stringify(provenance, null, 2));
  log(`provenance → ${path.relative(config.repo_root, provFile)}`);
  if (dry) console.log("(dry run — nothing written except the provenance preview)");
}

main().catch((err) => { console.error(err); process.exit(1); });
