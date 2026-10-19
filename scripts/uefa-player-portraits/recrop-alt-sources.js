// recrop-alt-sources.js — adjust the normalization crop directive of already
// cached alt-source entries WITHOUT re-fetching (2026-10-19 framing fix).
//
// Why: the Serie A platform sources are BUSTS (head ≈ 40-45% of the canvas,
// shoulders + jersey below), not the full-body poses the original 0.45
// top-crop assumed — 0.45 cut exactly at the collarbone and produced
// face-filling portraits (the owner's "only their head" complaint). This
// script rewrites the fetch-log alt_source directive so the next normalize
// run uses the corrected framing; the change is recorded in the entry's
// warnings so the manifest carries the reason.
//
// Usage:
//   node scripts/uefa-player-portraits/recrop-alt-sources.js \
//     --keys ss-lazio,venezia-fc --crop 0 --reason "framing fix …"
// (--crop 0 disables the top-crop entirely; any value in [0,1) is allowed)
"use strict";

const fs = require("fs");
const path = require("path");
const { config } = require("./lib/config");

function log(...args) { console.log("[recrop]", ...args); }

function main() {
  const argv = process.argv.slice(2);
  const keys = ((argv[argv.indexOf("--keys") + 1] || "") || "").split(",").map((s) => s.trim()).filter(Boolean);
  const crop = parseFloat(argv[argv.indexOf("--crop") + 1]);
  const reason = (argv[argv.indexOf("--reason") + 1] || "") || "crop directive adjustment";
  if (!keys.length) { console.error("no --keys given"); process.exit(2); }
  if (!(crop >= 0 && crop < 1)) { console.error("--crop must be in [0,1)"); process.exit(2); }

  const fetchLogFile = path.join(config.cache_dir, "heroes", "fetch-log.json");
  const fetchLog = JSON.parse(fs.readFileSync(fetchLogFile, "utf8"));

  for (const key of keys) {
    const rec = fetchLog[key];
    if (!rec || !rec.alt_source) { log(`SKIP ${key}: no fetch-log alt_source entry`); continue; }
    const before = rec.alt_source.crop_top_fraction;
    rec.alt_source.crop_top_fraction = crop;
    if (!Array.isArray(rec.warnings)) rec.warnings = [];
    rec.warnings.push(`crop directive ${before} -> ${crop}: ${reason}`);
    log(`${key}: crop_top_fraction ${before} -> ${crop}`);
  }

  const tmp = fetchLogFile + ".tmp-" + process.pid;
  fs.writeFileSync(tmp, JSON.stringify(fetchLog, null, 2));
  fs.renameSync(tmp, fetchLogFile);
  log(`fetch-log updated (${keys.length} keys) — run normalize next`);
}

main();
