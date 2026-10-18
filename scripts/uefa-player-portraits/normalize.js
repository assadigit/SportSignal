// normalize.js — produce the final published portraits and the provenance
// manifest (uefa-player-portraits.spec.md §8/§9).
//
// Reads discovery.json + fetch-log.json + cached originals; writes
// assets/players/uefa/<filename>.webp and assets/players/uefa/manifest.json.
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

// Optional documented per-player framing overrides (spec §8: contact-sheet
// review adjustments). File is created empty by default; entries:
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

async function run({ roster, discovery, fetchLog }) {
  ensure_dirs();

  const evidence = await readJson(config.identity_evidence_file, {});
  const overrides = await loadFramingOverrides();

  const manifest = {
    schema_version: 1,
    generated_at: new Date().toISOString(),
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
    const key = player.filename.replace(/\.webp$/, "");
    const disc = discovery.players.find((p) => p.key === key);
    const fetched = fetchLog[key];

    const entry = {
      roster_index: player.roster_index,
      requested_name: player.requested_name_display || player.requested_name,
      requested_club_label: player.requested_club_label,
      filename: player.filename,
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
      entry.status = fetched && fetched.status === "blocked" ? "blocked" : "missing";
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
    const srcPath = path.join(config.originals_dir, `${key}.webp`);
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
      const outPath = path.join(config.asset_dir, player.filename);
      await images.writeFileAtomic(outPath, result.buffer);
      entry.status = "complete";
      entry.output_width = config.target_width;
      entry.output_height = config.target_height;
      entry.output_sha256 = images.sha256(result.buffer);
      entry.normalization = { ...result.normalization, warnings: result.warnings };
      entry.warnings.push(...result.warnings);
      if (ov) entry.warnings.push(`framing override applied (${ov.reason})`);
      log(
        `#${player.roster_index} ${player.requested_name}: ${player.filename} ` +
        `${fetched.source_width}x${fetched.source_height} -> ${config.target_width}x${config.target_height} ` +
        `scale=${result.normalization.applied_scale}`
      );
    } catch (err) {
      entry.status = "quality_review";
      entry.warnings.push(`normalization failed: ${err.message}`);
    }
    manifest.entries.push(entry);
  }

  const manifestPath = path.join(config.asset_dir, "manifest.json");
  await images.writeFileAtomic(manifestPath, Buffer.from(JSON.stringify(manifest, null, 2)));
  const counts = {};
  for (const e of manifest.entries) counts[e.status] = (counts[e.status] || 0) + 1;
  log("manifest written:", manifestPath, JSON.stringify(counts));
  return manifest;
}

module.exports = { run };
