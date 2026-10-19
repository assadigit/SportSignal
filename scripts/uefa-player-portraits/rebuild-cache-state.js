// rebuild-cache-state.js — generalized cache-state recovery (INSTRUCTIONS §10,
// superseding the one-shot build-recovery-discovery.js of the 2026-10-19
// session). After a sandbox reset the gitignored .cache/ is empty while the
// committed manifest-heroes.json still describes every published entry;
// this script rebuilds discovery.json FROM that manifest so targeted
// refills (alt-fetch --refill/--player, normalize --player) can run
// immediately — no full 96-portrait re-fetch needed.
//
// What it writes (both under .cache/uefa-player-portraits/heroes/):
//   discovery.json — every committed complete entry as a RESOLVED discovery
//     record (chosen_candidate = the published player name, so normalize
//     publishes under the right filename; verification notes carry the
//     provenance-summary + the rebuild stamp)
//   fetch-log.json — initialized to {} (NEVER rebuilt wholesale: each refill
//     writes its own entry, and normalize --player merge-mode keeps every
//     untouched manifest entry intact — the v2.3 footgun fix)
//
// Usage:
//   node scripts/uefa-player-portraits/rebuild-cache-state.js
//
// Safety: refuses to run when discovery.json already exists (pass --force to
// rebuild it from the manifest — e.g. after the manifest itself was repaired).
"use strict";

const fs = require("fs");
const path = require("path");
const { config } = require("./lib/config");

const STAMP = () => `cache state rebuilt from the committed manifest by rebuild-cache-state.js (${new Date().toISOString()})`;

function fromCommittedManifest() {
  const manifestFile = path.join(config.asset_dir, "manifest-heroes.json");
  const m = JSON.parse(fs.readFileSync(manifestFile, "utf8"));
  const out = [];
  for (const e of m.entries || []) {
    if (e.status !== "complete") continue;
    out.push({
      key: (e.hero && e.hero.club_slug) || e.filename.replace(/\.webp$/, ""),
      roster_index: e.roster_index,
      requested_name: e.requested_name,
      requested_name_display: e.requested_name_display || e.requested_name,
      requested_club_label: e.requested_club_label,
      filename: e.filename,
      uefa_player_id: e.uefa_player_id || null,
      canonical_profile_url: e.canonical_profile_url || null,
      identity: {
        uefa_full_name: (e.identity_evidence && e.identity_evidence.uefa_full_name) || null,
        nationality: (e.identity_evidence && e.identity_evidence.nationality) || null,
        date_of_birth: (e.identity_evidence && e.identity_evidence.date_of_birth) || null,
        position: (e.identity_evidence && e.identity_evidence.position) || null,
      },
      observed_uefa_club: e.observed_uefa_club || null,
      observed_competition: e.source_competition || null,
      observed_season: e.source_asset_season || null,
      cutoff_url: e.source_image_url || null,
      asset_season: e.source_asset_season || null,
      kit_timing: `previously published complete entry (manifest output_sha256 ${(e.output_sha256 || "").slice(0, 12)}); source ${e.source_image_url || "n/a"}`,
      club_slug: (e.hero && e.hero.club_slug) || null,
      club_display: (e.hero && e.hero.club_display) || e.requested_club_label,
      league: (e.hero && e.hero.league) || null,
      selection_basis: (e.hero && e.hero.selection_basis) || null,
      chosen_candidate: (e.hero && e.hero.chosen_candidate) || e.chosen_player || e.requested_name,
      candidates_considered: (e.hero && e.hero.candidates_considered) || [],
    });
  }
  return out;
}

function main() {
  const force = process.argv.includes("--force");
  const dir = path.join(config.cache_dir, "heroes");
  const discoveryFile = path.join(dir, "discovery.json");
  const fetchLogFile = path.join(dir, "fetch-log.json");

  if (fs.existsSync(discoveryFile) && !force) {
    console.error(`discovery.json already exists (${discoveryFile}) — not rebuilding (pass --force to rebuild from the manifest)`);
    process.exit(2);
  }

  const entries = fromCommittedManifest();
  const seen = new Set();
  for (const e of entries) {
    if (seen.has(e.key)) throw new Error(`duplicate discovery key: ${e.key}`);
    seen.add(e.key);
  }

  const discovery = {
    players: entries.map((e) => ({
      key: e.key,
      roster_index: e.roster_index,
      requested_name: e.requested_name,
      requested_name_display: e.requested_name_display,
      requested_club_label: e.requested_club_label,
      filename: e.filename,
      status: "resolved",
      uefa_player_id: e.uefa_player_id,
      canonical_profile_url: e.canonical_profile_url,
      identity: e.identity,
      verification: {
        ok: true,
        notes: [
          `kit timing: ${e.kit_timing}`,
          STAMP(),
        ],
        problems: [],
      },
      observed_uefa_club: e.observed_uefa_club,
      observed_competition: e.observed_competition,
      observed_season: e.observed_season,
      candidates: e.cutoff_url
        ? [{ kind: /img\.uefa\.com/.test(e.cutoff_url) ? "cutoff" : "alt-platform", url: e.cutoff_url, asset_season: e.asset_season }]
        : [],
      probe_hint: null,
      hero: {
        club_slug: e.club_slug,
        club_display: e.club_display,
        league: e.league,
        selection_basis: e.selection_basis,
        chosen_candidate: e.chosen_candidate,
        candidates_considered: e.candidates_considered,
      },
      warnings: [STAMP()],
      errors: [],
    })),
  };

  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(discoveryFile, JSON.stringify(discovery, null, 2));
  if (!fs.existsSync(fetchLogFile)) fs.writeFileSync(fetchLogFile, "{}");
  console.log(`discovery state written: ${discoveryFile} (${entries.length} resolved entries from manifest-heroes.json)`);
  console.log(`fetch-log initialized: ${fetchLogFile} (refills write their own entries; normalize --player merge-mode protects the untouched manifest entries)`);
}

try {
  main();
} catch (e) {
  console.error(e);
  process.exit(1);
}
