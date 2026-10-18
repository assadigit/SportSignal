// lib/collection.js — per-collection paths and metadata.
//
// A "collection" is one roster file plus its own discovery/fetch state,
// manifest and (optionally) hero-club map. Multiple collections share:
//   - the published asset directory (assets/players/uefa/) — filenames are
//     player-name-based and unique across collections (a cross-collection
//     person/filename collision is rejected by validate);
//   - the gitignored originals cache directory — keys are filename bases, so
//     a player already collected for another roster reuses the same original
//     bytes (re-downloads are also safe: same source URL → same bytes).
//
// Roster files declare their collection needs (all optional):
//   collection.manifest_filename   default: manifest.json
//   collection.cache_subdir        default: "" (cache root)
//   collection.contact_sheet_file  default: docs/assets/<file> of the roster
//   collection.hero_output         true → emit hero-clubs.json
"use strict";

const path = require("path");
const { config } = require("./config");

const DEFAULTS = {
  manifest_filename: "manifest.json",
  cache_subdir: "",
  contact_sheet_file: "docs/assets/uefa-player-portraits-contact-sheet.png",
};

function forRoster(roster, rosterFile) {
  const col = Object.assign({}, DEFAULTS, roster.collection || {});
  const cacheDir = col.cache_subdir
    ? path.join(config.cache_dir, col.cache_subdir)
    : config.cache_dir;
  return {
    roster_file: rosterFile,
    manifest_filename: col.manifest_filename,
    manifest_file: path.join(config.asset_dir, col.manifest_filename),
    cache_dir: cacheDir,
    discovery_file: path.join(cacheDir, "discovery.json"),
    fetch_log_file: path.join(cacheDir, "fetch-log.json"),
    // originals are SHARED across collections (keyed by filename base)
    originals_dir: config.originals_dir,
    contact_sheet_file: path.isAbsolute(col.contact_sheet_file)
      ? col.contact_sheet_file
      : path.join(config.repo_root, col.contact_sheet_file),
    hero_output: col.hero_output === true,
    hero_map_file: path.join(config.asset_dir, "hero-clubs.json"),
  };
}

module.exports = { forRoster, DEFAULTS };
