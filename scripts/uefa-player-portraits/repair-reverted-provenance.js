// repair-reverted-provenance.js — one-off provenance repair (2026-10-20, the
// v2.3 style-loop session). The 13.129-hudframe sibling session reverted 9
// v2.2-reframed roster portraits to the initial 44e9906 UEFA cutoff bytes
// (owner directive: "USE official webp uefa pictures — use the previous
// ones") but left manifest-heroes.json pointing at the v2.2 LEAGUE-PLATFORM
// provenance — 9 entries claimed source URLs and output shas that no longer
// matched the published bytes (cli.js validate failed; npm test never
// caught it because check-uefa-portraits.js gates manifest.json, the
// 36-player collection, not the heroes manifest).
//
// This script restores each entry's provenance from the pre-v2.2 manifest
// (commit a75e1d5 — the last state where those 9 entries were UEFA cutoffs
// matching the reverted bytes), verifying sha-exactness before writing, and
// appends the history note. One-off: safe to re-run (idempotent), refuses
// on any sha mismatch.
"use strict";

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const crypto = require("crypto");
const { config } = require("./lib/config");

const FROM_COMMIT = "a75e1d5";
const TARGETS = [
  "erling-haaland.webp", "bukayo-saka.webp", "bruno-fernandes.webp",
  "lamine-yamal.webp", "antony.webp", "georges-mikautadze.webp",
  "lautaro-martinez.webp", "christoph-baumgartner.webp", "ousmane-dembele.webp",
];

const HISTORY_NOTE =
  "provenance repaired 2026-10-20 (v2.3 style-loop session): 13.129-hudframe reverted this portrait to the initial " +
  "44e9906 UEFA cutoff bytes per the owner directive \"USE official webp uefa pictures — use the previous ones\", " +
  "but the manifest still carried the v2.2 league-platform provenance; restored from " + FROM_COMMIT +
  " (sha-verified). The v2.2 refill it replaced was platform CARD ART — rejected by the v2.3 style gate (spec §8c).";

function sha256(buf) { return crypto.createHash("sha256").update(buf).digest("hex"); }

function main() {
  const manifestFile = path.join(config.asset_dir, "manifest-heroes.json");
  const cur = JSON.parse(fs.readFileSync(manifestFile, "utf8"));
  const old = JSON.parse(execSync(
    `git show ${FROM_COMMIT}:assets/players/uefa/manifest-heroes.json`,
    { cwd: config.repo_root, maxBuffer: 64 * 1024 * 1024 }
  ).toString("utf8"));

  const oldByFile = new Map(old.entries.map((e) => [e.filename, e]));
  let repaired = 0;

  for (const fname of TARGETS) {
    const e = cur.entries.find((x) => x.filename === fname);
    const o = oldByFile.get(fname);
    if (!e || !o) { console.error(`  ? ${fname}: entry missing in current or ${FROM_COMMIT} manifest — skipped`); continue; }

    const fileSha = sha256(fs.readFileSync(path.join(config.asset_dir, fname)));
    if (fileSha !== o.output_sha256) {
      throw new Error(`${fname}: current bytes (${fileSha.slice(0, 12)}) do NOT match the ${FROM_COMMIT} output sha (${(o.output_sha256 || "").slice(0, 12)}) — refusing to repair`);
    }
    if (e.output_sha256 === fileSha && !e.alt_source) {
      console.log(`  = ${fname}: already consistent — skipped`);
      continue;
    }

    // provenance fields restored wholesale from the pre-v2.2 entry
    for (const k of [
      "uefa_player_id", "canonical_profile_url", "source_image_url", "source_asset_season",
      "source_competition", "alt_source", "fetched_at", "source_width", "source_height",
      "source_has_alpha", "source_format", "source_sha256", "download_transport",
      "output_sha256", "normalization", "chosen_player",
    ]) {
      e[k] = o[k] !== undefined ? o[k] : null;
    }
    e.warnings = (e.warnings || []).filter((w) => !/^provenance repaired/.test(w));
    e.warnings.push(HISTORY_NOTE);
    repaired++;
    console.log(`  ✓ ${fname}: provenance restored from ${FROM_COMMIT} (sha ${fileSha.slice(0, 12)} verified)`);
  }

  if (repaired) {
    fs.writeFileSync(manifestFile, JSON.stringify(cur, null, 2) + "\n");
    console.log(`manifest-heroes.json written (${repaired} entr(ies) repaired)`);
  } else {
    console.log("nothing to repair");
  }
}

try {
  main();
} catch (e) {
  console.error(e);
  process.exit(1);
}
