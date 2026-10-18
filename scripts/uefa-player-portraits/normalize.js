// normalize.js — produce the final published portraits and the provenance
// manifest.
//
// Reads <collection>/discovery.json + <collection>/fetch-log.json + cached
// originals; writes assets/players/uefa/<filename>.webp and the collection's
// manifest (default manifest.json; hero collections use manifest-heroes.json
// and additionally emit assets/players/uefa/hero-clubs.json — the club →
// player-portrait map the hero frontend consumes).
// Identity evidence from the UEFA profile plus the recorded external
// corroboration (scripts/uefa-player-portraits/identity-evidence.json) is
// merged into every manifest entry, including failures.
"use strict";

const fsp = require("fs/promises");
const path = require("path");
const { config, ensure_dirs } = require("./lib/config");
const images = require("./lib/images");
const parse = require("./lib/parse");

function log(...args) {
  console.log("[normalize]", ...args);
}

async function readJson(file, fallback) {
  try { return JSON.parse(await fsp.readFile(file, "utf8")); } catch { return fallback; }
}

// Optional documented per-player framing overrides (contact-sheet review
// adjustments). File is created empty by default; entries:
//   { "<filename-base>": { "scale": 0.9, "y_offset_px": -10, "x_offset_px": 0 } }
async function loadFramingOverrides() {
  const file = path.join(config.script_dir, "framing-overrides.json");
  const data = await readJson(file, {});
  const out = {};
  for (const [k, v] of Object.entries(data)) {
    if (v && typeof v === "object" && (v.scale != null || v.y_offset_px != null || v.x_offset_px != null)) {
      if (v.reason == null) throw new Error(`framing-overrides.json: entry ${k} must document a "reason"`);
      out[k] = v;
    }
  }
  return out;
}

async function run({ roster, discovery, fetchLog, paths }) {
  ensure_dirs();

  const evidence = await readJson(config.identity_evidence_file, {});
  const overrides = await loadFramingOverrides();

  const manifest = {
    schema_version: 1,
    generated_at: new Date().toISOString(),
    collection: roster.collection && roster.collection.name ? roster.collection.name : "default",
    output_format: "webp-lossless-alpha",
    target_width: config.target_width,
    target_height: config.target_height,
    source: "UEFA (official uefa.com player profiles; img.uefa.com cutoff portraits)",
    rights: {
      copyright: "© UEFA. Images remain the property of UEFA; public availability does not establish redistribution permission.",
      terms_reference: "https://www.uefa.com/terms-of-use/ (Use of UEFA.com signifies agreement to the Terms and Conditions and Privacy Policy; the UEFA word, logo and competition marks are protected trademarks — no commercial use)",
      reuse_permission_established: false,
      reuse_status: "unverified — see docs/assets/uefa-player-portraits.md §Rights before any redistribution",
    },
    entries: [],
  };

  for (const player of roster.players) {
    const key = player.state_key || player.filename.replace(/\.webp$/, "");
    const disc = discovery.players.find((p) => p.key === key);
    const fetched = fetchLog[key];

    // hero entries publish under the CHOSEN candidate's name (the primary
    // pick may have been replaced by a fallback with an existing cutout);
    // plain rosters always publish under the roster filename
    let publishedName = player.requested_name_display || player.requested_name;
    let publishedFilename = player.filename;
    if (player.hero && disc && disc.hero && disc.hero.chosen_candidate) {
      publishedName = disc.hero.chosen_candidate;
      publishedFilename = parse.nameToSlug(publishedName) + ".webp";
    }

    const entry = {
      roster_index: player.roster_index,
      requested_name: player.requested_name_display || player.requested_name,
      requested_club_label: player.requested_club_label,
      filename: publishedFilename,
      chosen_player: publishedName !== (player.requested_name_display || player.requested_name) ? publishedName : null,
      status: "missing",
      uefa_player_id: disc && disc.uefa_player_id ? disc.uefa_player_id : null,
      canonical_profile_url: disc && disc.canonical_profile_url ? disc.canonical_profile_url : null,
      identity_evidence: {
        uefa_full_name: disc && disc.identity ? disc.identity.uefa_full_name : null,
        nationality: disc && disc.identity ? disc.identity.nationality : null,
        date_of_birth: disc && disc.identity ? disc.identity.date_of_birth : null,
        position: disc && disc.identity ? disc.identity.position : null,
        disambiguation: null,
        external_corroboration: evidence[key] || null,
      },
      observed_uefa_club: disc && disc.observed_uefa_club ? disc.observed_uefa_club : null,
      source_image_url: fetched && fetched.source_image_url ? fetched.source_image_url : null,
      source_asset_season: fetched && fetched.source_asset_season ? fetched.source_asset_season : null,
      source_competition: disc && disc.observed_competition ? disc.observed_competition : null,
      fetched_at: fetched && fetched.fetched_at ? fetched.fetched_at : null,
      source_width: fetched && fetched.source_width ? fetched.source_width : null,
      source_height: fetched && fetched.source_height ? fetched.source_height : null,
      source_has_alpha: fetched && fetched.source_has_alpha != null ? fetched.source_has_alpha : null,
      source_sha256: fetched && fetched.source_sha256 ? fetched.source_sha256 : null,
      download_transport: fetched && fetched.download_transport ? fetched.download_transport : null,
      output_width: null,
      output_height: null,
      output_sha256: null,
      normalization: null,
      warnings: [],
    };

    // hero collection fields (club mapping for the frontend)
    if (player.hero) {
      entry.hero = {
        club_slug: player.hero.club_slug || null,
        club_display: player.hero.club_display || player.requested_club_label,
        league: player.hero.league || null,
        selection_basis: player.hero.selection_basis || null,
        chosen_candidate: (disc && disc.hero && disc.hero.chosen_candidate) || null,
        candidates_considered: (disc && disc.hero && disc.hero.candidates_considered) || [],
      };
    }

    // assemble the disambiguation explanation from discovery verification
    if (disc && disc.verification) {
      const expl = [...disc.verification.notes, ...disc.verification.problems];
      if (expl.length) entry.identity_evidence.disambiguation = expl.join("; ");
    }

    // surface kit/unexpected-asset warnings recorded in the external evidence
    const ext = evidence[key];
    if (ext && typeof ext.finding === "string" && ext.finding.includes("KIT WARNING")) {
      const m = ext.finding.split("KIT WARNING:")[1];
      entry.warnings.push(`unexpected kit (external evidence):${m ? m.split(".")[0] + "." : " see identity_evidence.external_corroboration"}`);
    }

    if (!disc) {
      entry.warnings.push("no discovery record");
      manifest.entries.push(entry);
      continue;
    }
    if (disc.status === "ambiguous") {
      entry.status = "ambiguous";
      entry.warnings.push(...(disc.verification ? disc.verification.problems : []));
      manifest.entries.push(entry);
      continue;
    }
    if (!fetched || fetched.status !== "complete") {
      if (player.no_asset) {
        entry.status = "no_asset";
        entry.no_asset = player.no_asset;
      } else {
        entry.status = fetched && fetched.status === "blocked" ? "blocked" : "missing";
      }
      entry.warnings.push(fetched && fetched.reason ? fetched.reason : "no verified original in cache");
      if (fetched && Array.isArray(fetched.warnings)) entry.warnings.push(...fetched.warnings);
      manifest.entries.push(entry);
      continue;
    }

    // warnings carried from discovery/fetch
    for (const w of disc.warnings || []) entry.warnings.push(w);
    if (fetched.is_fallback_season) {
      entry.warnings.push(`fallback asset season ${fetched.source_asset_season} (preferred season unavailable)`);
    }

    // normalize
    const srcPath = path.join(paths.originals_dir, `${key}.webp`);
    let buf;
    try {
      buf = await fsp.readFile(srcPath);
    } catch {
      entry.status = "missing";
      entry.warnings.push(`cached original missing at ${srcPath}`);
      manifest.entries.push(entry);
      continue;
    }
    const sha = images.sha256(buf);
    if (sha !== fetched.source_sha256) {
      entry.status = "quality_review";
      entry.warnings.push("cached original sha256 does not match the fetch log — re-run fetch");
      manifest.entries.push(entry);
      continue;
    }

    const ov = overrides[key] || null;
    try {
      const result = await images.normalizePortrait(buf, { framing_override: ov });
      const outPath = path.join(config.asset_dir, publishedFilename);
      await images.writeFileAtomic(outPath, result.buffer);
      entry.status = "complete";
      entry.output_width = config.target_width;
      entry.output_height = config.target_height;
      entry.output_sha256 = images.sha256(result.buffer);
      entry.normalization = { ...result.normalization, warnings: result.warnings };
      entry.warnings.push(...result.warnings);
      if (ov) entry.warnings.push(`framing override applied (${ov.reason})`);
      log(
        `#${player.roster_index} ${publishedName}: ${publishedFilename} ` +
        `${fetched.source_width}x${fetched.source_height} -> ${config.target_width}x${config.target_height} ` +
        `scale=${result.normalization.applied_scale}`
      );
    } catch (err) {
      entry.status = "quality_review";
      entry.warnings.push(`normalization failed: ${err.message}`);
    }
    manifest.entries.push(entry);
  }

  await images.writeFileAtomic(paths.manifest_file, Buffer.from(JSON.stringify(manifest, null, 2)));
  const counts = {};
  for (const e of manifest.entries) counts[e.status] = (counts[e.status] || 0) + 1;
  log("manifest written:", paths.manifest_file, JSON.stringify(counts));

  // hero-clubs.json — the club → portrait map for the hero frontend.
  // Every roster club appears (complete or not) so the frontend can
  // distinguish "no asset" from "not covered".
  if (paths.hero_output) {
    const heroMap = {
      schema_version: 1,
      generated_at: new Date().toISOString(),
      description: "Club → hero MVP portrait map (UEFA official cutouts). Keys are football-data.org team-name slugs. status 'complete' entries carry the portrait URL; the hero layer renders without artwork for any other status.",
      public_url_prefix: config.public_url_prefix,
      rights: manifest.rights,
      clubs: {},
    };
    for (const e of manifest.entries) {
      if (!e.hero || !e.hero.club_slug) continue;
      heroMap.clubs[e.hero.club_slug] = {
        club: e.hero.club_display,
        league: e.hero.league,
        player: e.chosen_player || e.hero.chosen_candidate || e.requested_name,
        status: e.status,
        portrait_url: e.status === "complete" ? config.public_url_prefix + e.filename : null,
        uefa_player_id: e.uefa_player_id,
        canonical_profile_url: e.canonical_profile_url,
      };
    }
    await images.writeFileAtomic(paths.hero_map_file, Buffer.from(JSON.stringify(heroMap, null, 2)));
    log("hero map written:", paths.hero_map_file, `(${Object.keys(heroMap.clubs).length} clubs)`);
  }

  return manifest;
}

module.exports = { run };
