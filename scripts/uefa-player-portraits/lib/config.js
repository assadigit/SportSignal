// lib/config.js — shared constants and paths for the UEFA player portrait
// pipeline. See docs/assets/uefa-player-portraits.md for the full method.
"use strict";

const path = require("path");
const fs = require("fs");

const REPO_ROOT = path.resolve(__dirname, "..", "..", "..");

const config = {
  repo_root: REPO_ROOT,

  // Published assets (wrangler [assets] directory = ./assets, served at the
  // site root, so the public URL prefix is /players/uefa/).
  asset_dir: path.join(REPO_ROOT, "assets", "players", "uefa"),
  public_url_prefix: "/players/uefa/",

  // Reproducibility files live outside the published asset directory.
  script_dir: path.join(REPO_ROOT, "scripts", "uefa-player-portraits"),
  roster_file: path.join(REPO_ROOT, "scripts", "uefa-player-portraits", "roster.json"),
  docs_file: path.join(REPO_ROOT, "docs", "assets", "uefa-player-portraits.md"),
  contact_sheet_file: path.join(REPO_ROOT, "docs", "assets", "uefa-player-portraits-contact-sheet.png"),
  identity_evidence_file: path.join(
    REPO_ROOT, "scripts", "uefa-player-portraits", "identity-evidence.json"
  ),

  // Gitignored working cache (see .gitignore).
  cache_dir: path.join(REPO_ROOT, ".cache", "uefa-player-portraits"),
  originals_dir: path.join(REPO_ROOT, ".cache", "uefa-player-portraits", "originals"),
  discovery_file: path.join(REPO_ROOT, ".cache", "uefa-player-portraits", "discovery.json"),
  fetch_log_file: path.join(REPO_ROOT, ".cache", "uefa-player-portraits", "fetch-log.json"),

  // Output normalization targets (spec §8).
  target_width: 512,
  target_height: 512,
  // ~5% padding around the output canvas -> content box.
  padding_fraction: 0.05,
  // Alpha threshold for visible-subject detection (0-255). Pixels with
  // alpha >= this count as visible content; anything lower is treated as
  // background (isolated near-transparent noise is additionally ignored by
  // the row/column density trim in lib/images.js).
  alpha_threshold: 8,
  // A row/column of the thresholded bounding box is trimmed when fewer than
  // this fraction of its pixels are visible (removes stray specks without
  // deleting meaningful content).
  edge_density_trim: 0.005,

  // Encoding: lossless WebP with alpha.
  webp: { lossless: true, effort: 6, alphaQuality: 100 },

  // Network behaviour (spec §7).
  http: {
    // Honest descriptive User-Agent (spec §7).
    user_agent:
      "SportSignalPortraitPipeline/1.0 (UEFA player portrait asset collection for sportsignal.ir)",
    // One request at a time and at least one second between requests to the
    // same host.
    min_interval_ms: 1100,
    timeout_ms: 30000,
    max_redirects: 3,
    max_download_bytes: 10 * 1024 * 1024,
    retries: 3,
    // Only these HTTPS hosts are ever fetched.
    allowed_hosts: ["www.uefa.com", "img.uefa.com"],
    // Narrowly scoped path prefixes per host (the pipeline never fetches
    // anything else).
    allowed_paths: {
      "www.uefa.com": [
        "/uefachampionsleague/clubs/",
        "/uefaeuropaleague/clubs/",
        "/uefaconferenceleague/clubs/",
      ],
      "img.uefa.com": ["/imgml/TP/players/"],
    },
  },

  // Transport selection. "direct" fetches UEFA directly (default, works from
  // ordinary networks). "relay" routes the same HTTPS GET through a
  // self-hosted Cloudflare Worker relay (for restricted network vantage
  // points). "auto" tries direct first and falls back to the relay.
  transport: process.env.UEFA_FETCH_TRANSPORT || "auto",
  relay_base: process.env.UEFA_RELAY_BASE || "",
};

function ensure_dirs() {
  for (const dir of [config.asset_dir, config.cache_dir, config.originals_dir]) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

module.exports = { config, ensure_dirs };
