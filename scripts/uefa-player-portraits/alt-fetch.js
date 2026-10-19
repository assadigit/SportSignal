// alt-fetch.js — league-official alternative sources for hero entries that
// UEFA does not cover (2026-10-19, owner directive: "find alternatives for
// the remaining clubs, same style and quality — FIFA, the leagues' own
// websites, or club websites").
//
// v2.3 STYLE GATE + STAR FALLBACK (owner directive 2026-10-20: "rename the
// pictures, using VLM, that have FULL jersey — they're priority to be
// shown; a FIFA card must never stand in for the player" + "if a player
// for any reason can't be found, find another STAR of that club — be
// flexible"):
//   - every downloaded candidate is VLM-classified before it is accepted
//     (lib/vlm.js): photo + jersey/bust passes, card renders / head-onlys
//     are rejected and the next variant/candidate/star is tried
//   - LaLiga variant preference: the "_1_" photo series (001/003/002) is
//     fetched BEFORE the "_0_" stylized series (004 = EA-FC card art —
//     the Yamal incident, INSTRUCTIONS §9b/§13); photo variants arrive on
//     a white studio background and are keyed via keyStudioBackground
//   - Ligue 1 now prefers fullBodyPictures (full jersey, owner priority)
//     over the bust fallback
//   - STAR FALLBACK: when the requested player matches nothing on the
//     platform, the club's squad is ranked for star-ness (shirt number,
//     position, FPL price/points) and the top stars are tried in order —
//     the substitution is fully documented in the fetch-log alt_source
//     (star_fallback.of/star/basis) and the manifest's chosen_player
//   - the gate degrades LOUDLY, never blocks: without the z-ai SDK the
//     fill proceeds with deterministic QA + a recorded warning
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
//   node scripts/uefa-player-portraits/alt-fetch.js \
//     --refill manchester-city-fc,juventus-fc,…
//   (--refill re-fills the listed state_keys regardless of manifest status —
//    used for FRAMING UPGRADES: replacing a UEFA asset whose framing ends
//    above the jersey with league-official media per the 2026-10-19 owner
//    directive "body visible to at least the jersey". The reason is
//    recorded in the fetch-log entry as refill_reason.)
"use strict";

const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");
const sharp = require("sharp");
const { config } = require("./lib/config");
const images = require("./lib/images");
const vlm = require("./lib/vlm");

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
    .toLowerCase()
    // Turkish dotless ı has no NFD decomposition — fold it to i so
    // "Kenan Yıldız" and "Kenan Yildiz" normalize identically
    .replace(/ı/g, "i")
    .replace(/[^a-z0-9]+/g, " ").trim();
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
    const POS = { 1: "Goalkeeper", 2: "Defender", 3: "Midfielder", 4: "Forward" };
    const players = (data.elements || []).map((e) => ({
      name: `${e.first_name} ${e.second_name}`,
      web_name: e.web_name,
      team: teams[e.team] || null,
      team_id: e.team,
      photo_id: String(e.photo || "").replace(/\.(png|jpg)$/i, ""),
      // v2.3 star-fallback inputs (FPL is the market's star opinion)
      position: POS[e.element_type] || null,
      price: e.now_cost != null ? e.now_cost / 10 : null,       // £m
      points: e.total_points != null ? e.total_points : null,
      selected: e.selected_by_percent != null ? parseFloat(e.selected_by_percent) : null,
    }));
    this.cache = { players, teams };
    return this.cache;
  },
  clubPlayers(clubDisplay) {
    // sync-safe accessor used by the star fallback (load() must have run)
    const players = (this.cache && this.cache.players) || [];
    const clubN = normName(clubDisplay);
    return players.filter((p) => {
      const tn = normName(p.team || "");
      return tn && (tn.includes(clubN.split(" ")[0]) || clubN.includes(tn.split(" ")[0]));
    });
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
        // v2.3 star-fallback inputs
        shirt: s.shirt_number != null ? s.shirt_number : null,
        position: (s.position && s.position.name) || null,
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
  // v2.3 variant table (the Yamal incident): LaLiga serves TWO asset
  // series — "_1_" photos (001 waist-up studio, 002 match jpg, 003 square
  // studio) and "_0_" stylized renders (004 = EA-FC-style CARD ART).
  // Photos are ALWAYS preferred; the card series is last-resort only (and
  // the VLM gate rejects it even then). Photos arrive on a white studio
  // background — keying happens in the download loop.
  variantUrls(m) {
    const photos = m.photos || {};
    const order = ["001", "003", "002", "004"];
    const out = [];
    const pickLargest = (v) => {
      const keys = Object.keys(v || {}).sort((a, b) => {
        const pa = parseInt(String(a).split("x")[0], 10) || 0;
        const pb = parseInt(String(b).split("x")[0], 10) || 0;
        return pb - pa;
      });
      return keys.length ? v[keys[0]] : null;
    };
    for (const k of order) {
      if (!photos[k]) continue;
      const url = pickLargest(photos[k]);
      if (url && !out.some((x) => x.url === url)) {
        out.push({ url, variant: k, series: /_0_/.test(url) ? "stylized" : "photo" });
      }
    }
    for (const [k, v] of Object.entries(photos)) {
      if (order.includes(k)) continue;
      const url = pickLargest(v);
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
  imageUrlVariant(m) {
    const vs = this.variantUrls(m);
    return vs.length ? vs[0] : null;
  },
  altSource(m, variantInfo) {
    const v = variantInfo || this.imageUrlVariant(m) || {};
    return {
      platform: "laliga.com",
      platform_player_ref: `laliga player id ${m.id} (${m.name})`,
      laliga_variant: v.variant ? String(v.variant) + " (" + (v.series || "photo") + " series)" : null,
      crop_top_fraction: 0,
      allow_upscale: false,
      note: "official LaLiga squad media — photo series preferred over the stylized/card series per the v2.3 style gate (the Yamal incident)",
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
              // v2.3 star-fallback inputs (defensive — field names vary)
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
      // v2.2 framing fix: these sources are BUSTS (head ≈ 40-45% of the
      // canvas, shoulders + chest below), NOT full-body poses — the original
      // 0.45 top-crop cut exactly at the collarbone and produced face-filling
      // portraits (the 2026-10-19 "only their head" complaint). The bust is
      // published as-is (crop 0), matching the other bust platforms.
      crop_top_fraction: 0,
      allow_upscale: true,
      note: "official Serie A lineup/squad imagery (1024x1024 transparent webp bust, head+shoulders+chest) — published as-is",
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
      // v2.3 star-fallback input
      shirt: p.jerseyNumber != null ? p.jerseyNumber : null,
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
  // v2.3 jersey priority (owner directive "FULL jersey = priority"): the
  // platform serves fullBodyPictures (official ~800x1200 full-kit pose) —
  // preferred over the bust fallback (400x300 head+chest)
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
    const v = variantInfo || this.variantUrls(m)[0] || {};
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
// v2.3 STAR FALLBACK (owner directive 2026-10-20: "if a player for any
// reason didn't find — for example you couldn't find Dembélé of PSG — find
// another STAR of that club, be flexible")
//
// Ranks the club's platform squad by star-ness and returns candidate names,
// best first. Every substitution is documented end-to-end (rec.star_fallback
// → fetch-log alt_source.star_fallback → discovery/manifest chosen_player) —
// the AGENTS.md "no player substitution without documentation" rule.
// ---------------------------------------------------------------------------
const STAR_FALLBACK_MAX = 5;

function starScore(p) {
  const pos = String(p.position || "").toLowerCase();
  let s = /forward|striker|winger|attack/.test(pos) ? 40
    : /midfield/.test(pos) ? 25
    : /defen|back/.test(pos) ? 12
    : /goalkeep|keeper|gk/.test(pos) ? 4
    : 15;
  if (p.price != null) s += p.price * 2;                       // FPL £m — the market's star opinion
  if (p.points != null) s += Math.min(30, p.points / 10);      // FPL total points
  if (p.selected != null) s += Math.min(25, p.selected / 2);   // FPL ownership %
  if (typeof p.shirt === "number" && p.shirt >= 1 && p.shirt <= 11) s += 8;
  if ([7, 9, 10, 11].includes(p.shirt)) s += 10;               // classic star shirts
  if (p.apps != null) s += Math.min(15, p.apps * 3);           // seriea: recent-lineup presence
  return s;
}

async function starFallbackCandidates(platform, clubDisplay, excludeNames) {
  const ex = new Set(excludeNames.map(normName));
  let squad = [];
  try {
    if (platform === pl) {
      await pl.load();
      squad = pl.clubPlayers(clubDisplay);
    } else if (platform === laliga) {
      for (const slug of laliga.slugsForClub(clubDisplay)) {
        const s = await laliga.loadSquad(slug);
        if (s && s.length) { squad = s; break; }
      }
    } else if (platform === seriea) {
      const s = await seriea.loadClubPlayers(clubDisplay);
      squad = (s && s.players) || [];
    } else if (platform === ligue1) {
      const s = await ligue1.loadSquad(clubDisplay);
      squad = (s && s.players) || [];
    } else {
      // bundesliga: player-page slugs only — no squad enumeration exists on
      // that platform, so the star fallback is honestly unavailable there
      return [];
    }
  } catch { return []; }
  return squad
    .filter((p) => p && p.name && !ex.has(normName(p.name)) && !(p.nickname && ex.has(normName(p.nickname))))
    .filter((p) => !!platform.imageUrl(p)) // only players the platform can serve
    .map((p) => ({
      name: p.name,
      score: starScore(p),
      basis: `star fallback (v2.3 owner directive "be flexible"): shirt ${p.shirt != null ? p.shirt : "?"}` +
        `${p.position ? ", " + p.position : ""}${p.price != null ? ", FPL £" + p.price.toFixed(1) + "m" : ""}`,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, STAR_FALLBACK_MAX);
}

// variant info lookup for provenance (photo/card series, asset kind)
function variantInfoFor(platform, m, url) {
  if (!platform.variantUrls) return null;
  return platform.variantUrls(m).find((v) => v.url === url) || null;
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
  // NB: argv.indexOf returns -1 when the flag is absent — guard with
  // includes() so argv[0] (another flag) is never misread as the value
  const playerFilter = argv.includes("--player")
    ? ((argv[argv.indexOf("--player") + 1] || "").replace(/\.webp$/, "") || null)
    : null;
  // --refill key1,key2,… — framing-upgrade re-fill of specific entries
  // regardless of manifest status (see header). Mutually exclusive with
  // --player for sanity.
  const refillArg = argv.includes("--refill") ? (argv[argv.indexOf("--refill") + 1] || "") : "";
  const refillKeys = refillArg ? refillArg.split(",").map((s) => s.trim()).filter(Boolean) : null;
  if (refillKeys && playerFilter) {
    console.error("--refill and --player are mutually exclusive");
    process.exit(2);
  }
  const REFILL_REASON =
    "framing upgrade (2026-10-19 owner directive: body visible to at least the jersey): " +
    "the previous UEFA cutoff ends above the jersey (narrow neck/chest strip) — replaced with league-official media";

  // v2.3 style gate: ON by default (the Yamal FIFA-card incident); disable
  // only explicitly — and the disable is recorded per entry either way
  const vlmGateOn = !argv.includes("--no-vlm-gate");
  let vlmGateAvailable = false;
  if (vlmGateOn) {
    vlmGateAvailable = !!(await vlm.zai());
    if (!vlmGateAvailable) log("! z-ai SDK unavailable — the VLM style gate is OFF for this run (deterministic QA only; recorded per entry)");
  }
  const gateDir = path.join(config.cache_dir, "vlm-gate");
  if (vlmGateOn && vlmGateAvailable) fs.mkdirSync(gateDir, { recursive: true });

  const rosterFile = path.join(config.script_dir, "roster-heroes.json");
  const manifestFile = path.join(config.asset_dir, "manifest-heroes.json");
  const cacheDir = path.join(config.cache_dir, "heroes");
  const fetchLogFile = path.join(cacheDir, "fetch-log.json");
  const discoveryFile = path.join(cacheDir, "discovery.json");

  const roster = JSON.parse(fs.readFileSync(rosterFile, "utf8"));
  const manifest = JSON.parse(fs.readFileSync(manifestFile, "utf8"));
  const fetchLog = JSON.parse(fs.readFileSync(fetchLogFile, "utf8"));
  const discovery = JSON.parse(fs.readFileSync(discoveryFile, "utf8"));

  // targets: UEFA-unresolved entries (missing/no_asset), or explicit refill
  // keys (framing upgrades), optionally one club
  const statusByKey = {};
  for (const e of manifest.entries) statusByKey[e.hero ? e.hero.club_slug : e.filename.replace(/\.webp$/, "")] = e.status;
  const targets = roster.players.filter((p) => {
    const key = p.state_key || p.filename.replace(/\.webp$/, "");
    if (playerFilter && key !== playerFilter) return false;
    if (refillKeys) return refillKeys.includes(key);
    const st = statusByKey[key];
    return st === "missing" || st === "no_asset";
  });

  log(
    refillKeys
      ? `${targets.length} framing-upgrade refills requested (${refillKeys.length} keys)`
      : `${targets.length} hero entries to fill from league-official sources`
  );

  const results = [];
  for (const p of targets) {
    const key = p.state_key;
    const league = (p.hero && p.hero.league) || null;
    const platform = PLATFORMS[league];
    const rec = { key, club: p.requested_club_label, league, status: "not_found", platform: league };
    if (refillKeys) rec.refill = true;
    results.push(rec);

    if (!platform) { log(`# ${p.requested_club_label}: no alt platform for league "${league}"`); continue; }

    // ordered candidates, primary first
    const candidates = [p.requested_name];
    for (const c of (p.hero && p.hero.candidates) || []) {
      const n = typeof c === "string" ? c : c.name;
      if (n && !candidates.includes(n)) candidates.push(n);
    }

    const matches0 = await findMatches(platform, p.requested_club_label, candidates);
    let matches = matches0;
    // refill safety: a framing upgrade must NEVER change the club's hero —
    // only the platform match equal to the already-chosen candidate is
    // accepted (fallback candidates are for original fills, not upgrades)
    if (refillKeys && matches.length) {
      const discRec = discovery.players.find((d) => d.key === key);
      const chosen = (discRec && discRec.hero && discRec.hero.chosen_candidate) || p.requested_name;
      const compact = (s) => (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/ı/g, "i").replace(/[^a-z0-9]+/g, " ").trim();
      // subsequence match: the chosen hero's name tokens appear in order in
      // the platform name ("Bruno Fernandes" ⊆ "Bruno Borges Fernandes",
      // "Kenan Yıldız" ⊆ "Kenan Yildiz"). Club-scoped matching + this gate
      // keeps identity safe while tolerating legal-name forms.
      const isSameIdentity = (platformName) => {
        const want = compact(chosen).split(" ").filter(Boolean);
        const have = compact(platformName).split(" ").filter(Boolean);
        let i = 0;
        for (const tok of have) if (i < want.length && tok === want[i]) i++;
        return i === want.length;
      };
      const exact = matches.filter((x) => isSameIdentity(x.name));
      if (!exact.length) {
        log(`# ${p.requested_club_label}: refill — platform match(es) [${matches.map((m) => m.name).join(", ")}] do not equal the chosen hero "${chosen}" — skipping`);
        rec.status = "not_found";
        rec.error = `no platform match for the chosen hero "${chosen}"`;
        continue;
      }
      matches = exact;
    }
    if (!matches.length && !refillKeys) {
      // v2.3 star fallback — the owner's "find another STAR of that club,
      // be flexible" directive. Never on refills (a refill must never
      // change the club's hero — see the identity gate above).
      const stars = await starFallbackCandidates(platform, p.requested_club_label, candidates);
      if (stars.length) {
        log(`# ${p.requested_club_label}: no candidate matched on ${league} — v2.3 star fallback trying: ${stars.map((s) => s.name).join(", ")}`);
        for (const star of stars) {
          const m = await findMatches(platform, p.requested_club_label, [star.name]);
          if (m.length) {
            matches = m;
            rec.star_fallback = { of: p.requested_name, star: m[0].name, basis: star.basis };
            break;
          }
        }
      } else if (platform === bundesliga) {
        log(`# ${p.requested_club_label}: star fallback unavailable on bundesliga (platform exposes no squad enumeration)`);
      }
    }
    if (!matches.length) { log(`# ${p.requested_club_label}: no candidate matched on ${league}`); continue; }

    rec.status = "matched";
    rec.player = matches[0].name;
    rec.url = matches[0].url;
    rec.matches_considered = matches.map((x) => x.name);

    if (dry) { log(`# ${p.requested_club_label}: ${rec.player} → ${matches[0].url.slice(0, 90)}… (dry)`); continue; }

    // v2.3: the fill attempt as a local function — it is re-run when the
    // style-exhaustion star fallback swaps in another player of the club
    const attemptFill = async (matchList) => {
      let done = false;
      let lastErr = null;
      for (const match of matchList) {
        if (done) break;
    // v2.3: each player match is tried across its platform VARIANT URLs
    // (photo series before stylized series on LaLiga; fullBody before bust
    // on Ligue 1) — a card-render variant no longer sinks the player, the
    // gate just moves to the next variant
    const variantList = [];
    if (match.url) variantList.push(match.url);
    for (const u of (platform.imageUrls ? platform.imageUrls(match.m) : [])) {
      if (!variantList.includes(u)) variantList.push(u);
    }
    for (const imageUrl of variantList) {
      if (done) break;
    try {
      const m = match.m;
      let buf = await httpGet(imageUrl, { accept: "image/*" });
      // basic sanity first (format/dimensions); alpha may arrive via keying
      let meta = await validateImage(buf, { expectAlpha: false });
      // v2.3: white-studio photos (LaLiga "_1_" series, JPGs) → keyed to
      // transparent alpha before the collection contract is enforced
      let bgKey = null;
      const needsKey = !meta.hasAlpha || (await images.studioBackgroundLikely(buf));
      if (needsKey) {
        const keyed = await images.keyStudioBackground(buf);
        bgKey = { keyed_fraction: keyed.keyed_fraction, method: keyed.method };
        buf = keyed.buffer;
        meta = await validateImage(buf); // now enforces real alpha usage
      }
      // pristine original → lossless WebP at native size
      const webp = await sharp(buf).webp({ lossless: true, effort: 6 }).toBuffer();

      // v2.3 VLM STYLE GATE — the owner's "a FIFA card must never stand in
      // for the player" rule. Classifies a 512px preview; card renders and
      // head-onlys are REJECTED (next variant/candidate/star is tried).
      let vlmStyle = null;
      let vlmNotes = null;
      let vlmGateWarning = null;
      if (vlmGateOn && vlmGateAvailable) {
        const gateFile = path.join(gateDir, `${key}-${Date.now()}.webp`);
        const preview = await sharp(webp).resize(512, 512, { fit: "inside", withoutEnlargement: true }).webp({ lossless: true }).toBuffer();
        await images.writeFileAtomic(gateFile, preview);
        const cls = await vlm.classifyPortrait(gateFile);
        try { fs.unlinkSync(gateFile); } catch { /* temp */ }
        if (cls.ok) {
          vlmStyle = cls.style;
          vlmNotes = cls.notes;
          if (!vlm.stylePublishable(cls.style)) {
            throw new Error(`style gate REJECTED this asset (${cls.style}${cls.notes ? ": " + cls.notes.slice(0, 90) : ""})`);
          }
        } else {
          vlmGateWarning = `vlm style gate unavailable (${cls.error}) — accepted on deterministic QA alone (spec v2.3 §8c degrade rule)`;
          log(`  ! ${p.requested_club_label}: ${vlmGateWarning}`);
        }
      } else if (vlmGateOn && !vlmGateAvailable) {
        vlmGateWarning = "vlm style gate unavailable this run (no z-ai SDK) — accepted on deterministic QA alone (spec v2.3 §8c degrade rule)";
      }

      const vInfo = variantInfoFor(platform, m, imageUrl);
      const alt = platform.altSource(m, vInfo);
      if (bgKey) alt.bg_key = bgKey;
      if (vlmStyle) alt.vlm_style = vlmStyle;
      if (rec.star_fallback) alt.star_fallback = rec.star_fallback;
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
        ...(vlmStyle ? { vlm_style: vlmStyle, vlm_verified_at: new Date().toISOString() } : {}),
        ...(bgKey ? { bg_key: bgKey } : {}),
        ...(rec.star_fallback ? { star_fallback: rec.star_fallback } : {}),
        ...(refillKeys ? { refill_reason: REFILL_REASON, refilled_at: new Date().toISOString() } : {}),
        warnings: [
          ...(refillKeys ? [REFILL_REASON] : []),
          ...(vlmGateWarning ? [vlmGateWarning] : []),
        ],
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
      // a style-exhausted substitution REPLACES the hero on refills too (the
      // star_fallback provenance documents the change); ordinary refills
      // keep the established hero name form (diacritics)
      if (!refillKeys || !disc.hero.chosen_candidate ||
          (rec.star_fallback && rec.star_fallback.reason === "style_exhausted" && rec.star_fallback.star === match.name)) {
        disc.hero.chosen_candidate = match.name;
      }
      if (!disc.warnings) disc.warnings = [];
      disc.warnings.push(
        `alt source: no UEFA transparent cutoff exists for this club's candidates; portrait filled from ${alt.platform} (${alt.platform_player_ref}), official league media — provenance in fetch log alt_source`
      );
      if (refillKeys) {
        disc.warnings.push(REFILL_REASON);
      }
      if (rec.star_fallback) {
        disc.warnings.push(
          `star fallback (v2.3): the requested hero "${rec.star_fallback.of}" matched nothing on the platform — ${match.name} substituted (${rec.star_fallback.basis})`
        );
      }
      if (vlmStyle) {
        disc.verification = disc.verification || { ok: true, notes: [], problems: [] };
        disc.verification.notes.push(
          `v2.3 style gate: VLM classified the published portrait as ${vlmStyle}${vlmNotes ? " (" + vlmNotes.slice(0, 120) + ")" : ""} (${FETCH_DATE})`
        );
      }
      disc.verification = disc.verification || { ok: true, notes: [], problems: [] };
      disc.verification.notes.push(
        `identity anchored by the ${league} platform match: player "${match.name}" on ${p.requested_club_label}'s official ${alt.platform} data (${FETCH_DATE})`
      );
      rec.status = "complete";
      rec.player = match.name;
      rec.url = imageUrl;
      rec.variant = vInfo ? (vInfo.variant || vInfo.kind) : undefined;
      rec.vlm_style = vlmStyle || undefined;
      log(`# ${p.requested_club_label}: ${match.name} ${meta.width}x${meta.height} alpha=${meta.hasAlpha}${bgKey ? " (bg keyed " + (bgKey.keyed_fraction * 100).toFixed(0) + "%)" : ""}${vlmStyle ? " vlm=" + vlmStyle : ""} → ${key}.webp`);
      await fsp.writeFile(fetchLogFile, JSON.stringify(fetchLog, null, 2));
      await fsp.writeFile(discoveryFile, JSON.stringify(discovery, null, 2));
      done = true;
    } catch (err) {
      lastErr = err;
      log(`# ${p.requested_club_label}: ${match.name} variant failed (${err.message.slice(0, 80)}) — trying next variant/candidate`);
    }
    }
      }
      return { done, lastErr };
    };

    let fill = await attemptFill(matches);
    let done = fill.done;
    let lastErr = fill.lastErr;

    if (!done) {
      // v2.3 "be flexible" EXHAUSTION path (owner directive 2026-10-20):
      // the candidate MATCHED but every asset failed the style gate (all
      // card renders — e.g. Troyes' entire 2026 Ligue 1 media set) or the
      // downloads. Try another STAR of the same club. On a refill this is a
      // deliberate, fully documented hero substitution (the identity gate
      // above protects refills from ACCIDENTAL changes; a style-forced one
      // is exactly what "be flexible" asks for).
      const failedNames = matches.map((x) => x.name).concat(candidates);
      const stars = await starFallbackCandidates(platform, p.requested_club_label, failedNames);
      for (const star of stars) {
        const m = await findMatches(platform, p.requested_club_label, [star.name]);
        if (!m.length) continue;
        log(`# ${p.requested_club_label}: style-exhaustion star fallback → ${star.name}`);
        rec.star_fallback = {
          of: rec.star_fallback ? rec.star_fallback.of : p.requested_name,
          star: m[0].name,
          basis: star.basis + "; reason: every platform asset of the previous hero failed the v2.3 style gate (card render / head-only)",
          ...(refillKeys ? { reason: "style_exhausted" } : {}),
        };
        matches = m;
        fill = await attemptFill(matches);
        done = fill.done;
        lastErr = fill.lastErr;
        if (done) break;
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
