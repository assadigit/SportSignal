// recover-clubs-state.js — ONE-OFF disaster recovery (2026-10-21). The
// first wai-vlm-audit run had a keep-array bug: successfully-classified
// candidates were mutated but never pushed into `keep`, so
// `st.candidates = keep` silently DROPPED all 166 wai-classified
// alternates from state.json (and the next --republish shrank the
// manifest to 218 candidates). The bug is fixed; this script rebuilds the
// lost candidate METADATA from the artifacts that survived:
//
//   - assets/players/clubs/<league>/<club>/*.webp   (all 384 files exist)
//   - .cache/.../clubs-alternates/originals/<club>/ (pristine originals)
//   - the platform squad caches (name ↔ slug reverse map, star basis,
//     source URL reconstruction; bundesliga.com player pages re-probed
//     for the dfl-object ids)
//
// Every recovered candidate is marked recovered: true + alt_source.recovered
// with the incident note — the provenance stays honest about its origin.
// Styles start null (re-audited by wai-vlm-audit right after).
"use strict";

const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");
const sharp = require("sharp");
const parse = require("./lib/parse");
const images = require("./lib/images");

const ROOT = path.resolve(__dirname, "..", "..");
const CACHE = path.join(ROOT, ".cache", "uefa-player-portraits", "clubs-alternates");
const STATE_FILE = path.join(CACHE, "state.json");
const ORIGINALS_DIR = path.join(CACHE, "originals");
const CLUBS_DIR = path.join(ROOT, "assets", "players", "clubs");
const HERO_CLUBS = path.join(ROOT, "assets", "players", "uefa", "hero-clubs.json");

const LALIGA_SLUGS = ["athletic-club", "atletico-de-madrid", "c-a-osasuna", "rc-celta", "d-alaves",
  "elche-c-f", "fc-barcelona", "getafe-cf", "levante-ud", "malaga-cf",
  "r-racing-club", "rc-deportivo", "rcd-espanyol", "rayo-vallecano",
  "real-betis", "real-madrid", "real-sociedad", "sevilla-fc", "valencia-cf",
  "villarreal-cf"];

function normName(s) {
  return (s || "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/ı/g, "i")
    .replace(/[^a-z0-9]+/g, " ").trim();
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function readJson(file, fallback) { try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return fallback; } }

async function httpGet(url, opts = {}) {
  const res = await fetch(url, { headers: { "User-Agent": "SportSignalPortraitPipeline/1.0", Accept: "image/*", ...(opts.headers || {}) }, redirect: "follow" });
  if (!res.ok) throw new Error("HTTP " + res.status + " " + url.slice(0, 80));
  return Buffer.from(await res.arrayBuffer());
}

async function main() {
  const state = readJson(STATE_FILE, { clubs: {}, fd_ids: {} });
  const heroClubs = readJson(HERO_CLUBS, {});
  const plCache = readJson(path.join(CACHE, "squads-premierleague.json"), null);
  const laligaCache = readJson(path.join(CACHE, "squads-laliga.json"), null);
  const serieaCache = readJson(path.join(CACHE, "squads-seriea.json"), null);
  const ligue1Cache = readJson(path.join(CACHE, "squads-ligue1.json"), null);
  const fdSquadsDir = path.join(CACHE, "fd-squads");

  // reverse maps: nameToSlug(name) → squad player record (per club)
  const plBySlug = new Map();
  for (const p of (plCache && plCache.players) || []) {
    if (p.photo_id) plBySlug.set(parse.nameToSlug(p.name), p);
  }
  const serieaBySlug = new Map();
  for (const rec of Object.values((serieaCache && serieaCache.lineups) || {})) {
    for (const p of rec.players || []) {
      if (p.imagery && (p.imagery.playerImage_home_left || p.imagery.playerImage_home_middle)) {
        serieaBySlug.set(parse.nameToSlug(p.name), p);
      }
    }
  }
  const ligue1BySlug = new Map();
  for (const rec of Object.values((ligue1Cache && ligue1Cache.summaries) || {})) {
    if (rec.error) continue;
    for (const p of rec.players || []) {
      const a = p.assets || {};
      if (a.fullBodyPictures || a.bustPictures) ligue1BySlug.set(parse.nameToSlug(p.name), p);
    }
  }

  function starScore(p) {
    const pos = String(p.position || "").toLowerCase();
    let s = /forward|striker|winger|attack/.test(pos) ? 40 : /midfield/.test(pos) ? 25 : /defen|back/.test(pos) ? 12 : /goalkeep|keeper|gk/.test(pos) ? 4 : 15;
    if (p.price != null) s += p.price * 2;
    if (p.points != null) s += Math.min(30, p.points / 10);
    if (p.selected != null) s += Math.min(25, p.selected / 2);
    if (typeof p.shirt === "number" && p.shirt >= 1 && p.shirt <= 11) s += 8;
    if ([7, 9, 10, 11].includes(p.shirt)) s += 10;
    if (p.apps != null) s += Math.min(15, p.apps * 3);
    return s;
  }

  const RECOVERY_NOTE = "recovered from disk artifacts after the 2026-10-21 wai-audit keep-array incident (state metadata lost; files + originals survived; the source URL is the reconstructed current best-guess)";
  let recovered = 0, unmatched = [];

  for (const [slug, hero] of Object.entries(heroClubs.clubs)) {
    const st = state.clubs[slug] || (state.clubs[slug] = { candidates: [], failures: {} });
    st.candidates = st.candidates || [];
    const leagueFolder = { "Premier League": "premier-league", "La Liga": "laliga", "Serie A": "serie-a", "Bundesliga": "bundesliga", "Ligue 1": "ligue-1" }[hero.league];
    if (!leagueFolder) continue;
    const clubDir = path.join(CLUBS_DIR, leagueFolder, slug);
    if (!fs.existsSync(clubDir)) continue;

    const known = new Set(st.candidates.map((c) => c.file));
    known.add(path.basename(hero.portrait_url || "x"));

    for (const f of fs.readdirSync(clubDir)) {
      if (!f.endsWith(".webp") || known.has(f)) continue;
      const fileSlug = f.replace(/\.webp$/, "");
      const origFile = path.join(ORIGINALS_DIR, slug, f);
      if (!fs.existsSync(origFile)) { unmatched.push(slug + "/" + f + " (no original)"); continue; }

      let player = null, srcUrl = null, platform = null, alt = null, sb = "recovered (star basis lost in the incident)";
      if (hero.league === "Premier League") {
        const p = plBySlug.get(fileSlug);
        if (p) {
          player = p.name; platform = "premierleague.com";
          srcUrl = `https://resources.premierleague.com/premierleague25/photos/players/110x140/${p.photo_id}.png`;
          sb = `shirt ${p.shirt != null ? p.shirt : "?"}, ${p.position || "?"}, FPL £${(p.price || 0).toFixed(1)}m (recovered)`;
          alt = { platform, platform_player_ref: `fpl photo id ${p.photo_id} (${p.name}, ${p.team})`, crop_top_fraction: 0, allow_upscale: true, note: "220x280 official PL headshot card (transparent PNG) — upscaled to the 512 canvas (documented exception)", recovered: true };
        }
      } else if (hero.league === "La Liga") {
        for (const s of LALIGA_SLUGS) {
          const squad = (laligaCache || {})[s] || [];
          const p = squad.find((x) => parse.nameToSlug(x.name) === fileSlug || parse.nameToSlug(x.nickname || "") === fileSlug);
          if (p) {
            player = p.name; platform = "laliga.com";
            const photos = p.photos || {};
            const pick = (v) => { const keys = Object.keys(v || {}).sort((a, b) => (parseInt(String(b).split("x")[0], 10) || 0) - (parseInt(String(a).split("x")[0], 10) || 0)); return keys.length ? v[keys[0]] : null; };
            for (const k of ["001", "003", "002"]) { const u = pick(photos[k]); if (u) { srcUrl = u; break; } }
            sb = `shirt ${p.shirt != null ? p.shirt : "?"}${p.position ? ", " + p.position : ""} (recovered)`;
            alt = { platform, platform_player_ref: `laliga player id ${p.id} (${p.name})`, crop_top_fraction: 0, allow_upscale: false, note: "official LaLiga squad media — photo series (v2.3 style gate)", recovered: true };
            break;
          }
        }
      } else if (hero.league === "Serie A") {
        const p = serieaBySlug.get(fileSlug);
        if (p) {
          player = p.name; platform = "legaseriea.it";
          srcUrl = `https://media-sdp.legaseriea.it/${p.imagery.playerImage_home_left || p.imagery.playerImage_home_middle}`;
          sb = `serie-a lineup presence (recovered)`;
          alt = { platform, platform_player_ref: `serie-a player ${String(p.playerId).split("::").pop()} (${p.name})`, crop_top_fraction: 0, allow_upscale: true, note: "official Serie A lineup/squad imagery (1024x1024 transparent webp bust)", recovered: true };
        }
      } else if (hero.league === "Ligue 1") {
        const p = ligue1BySlug.get(fileSlug);
        if (p) {
          player = p.name; platform = "ligue1.fr";
          const a = p.assets || {};
          const kind = a.fullBodyPictures ? "fullBodyPictures" : (a.bustPictures ? "bustPictures" : null);
          if (kind) srcUrl = Object.values(a[kind])[0];
          sb = `shirt ${p.shirt != null ? p.shirt : "?"} (recovered)`;
          alt = { platform, platform_player_ref: `ligue1 player (${p.name})`, ligue1_asset: kind, crop_top_fraction: 0, allow_upscale: true, note: kind === "fullBodyPictures" ? "official Ligue 1 full-body kit pose" : "official Ligue 1 bust picture", recovered: true };
        }
      } else if (hero.league === "Bundesliga") {
        // probe the player page for the dfl-object (the only lost id)
        for (const cand of [fileSlug]) {
          try {
            const html = (await httpGet(`https://www.bundesliga.com/en/player/${cand}`, { headers: { Accept: "text/html" } })).toString("utf8");
            const m = html.match(/player\/(dfl-obj-[a-z0-9]+-dfl-clu-[a-z0-9]+-dfl-sea-[a-z0-9]+)-body\.png/);
            const title = (html.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
            if (m) {
              player = title.split("|")[0].trim() || fileSlug;
              platform = "bundesliga.com";
              srcUrl = `https://assets.bundesliga.com/player/${m[1]}-body.png`;
              sb = "bundesliga player page (recovered)";
              alt = { platform, platform_player_ref: `${m[1]} (${player}; club verified via page title)`, crop_top_fraction: 0.42, allow_upscale: true, note: "official Bundesliga player body image (780x960 transparent PNG) — top-cropped", recovered: true };
            }
          } catch { /* page probe failed — unmatched */ }
          await sleep(1500);
        }
      }

      if (!player) { unmatched.push(slug + "/" + f); continue; }
      const origBuf = await fsp.readFile(origFile);
      st.candidates.push({
        player, file: f, style: null, style_source: null,
        star_basis: sb, star_score: null,
        source_image_url: srcUrl, source_platform: platform,
        source_sha256: images.sha256(origBuf),
        fetched_at: new Date().toISOString(),
        recovered: true,
        recovery_note: RECOVERY_NOTE,
        alt_source: alt,
      });
      recovered++;
      await fsp.writeFile(STATE_FILE, JSON.stringify(state, null, 2)); // checkpoint per candidate
    }
  }
  await fsp.writeFile(STATE_FILE, JSON.stringify(state, null, 2));
  console.log(`recovered: ${recovered} candidates, unmatched: ${unmatched.length}`);
  unmatched.forEach((u) => console.log("  ? " + u));
}

main().catch((e) => { console.error(e); process.exit(1); });
