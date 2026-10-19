// analyze-framing.js — deterministic "head-only vs jersey-visible" classifier
// for the published 512x512 portraits (2026-10-19 owner ask: "some players
// pictures are only their head — find players with their body (at least until
// their jersey) in view").
//
// Method: per-portrait row-width profile of the visible subject.
//   - A head-only cutout is widest at the cheek/ear line (t≈0.3-0.5 of subject
//     height) and NARROWS toward the bottom (jaw → neck).
//   - A portrait with shoulders/chest flares WIDE at the bottom (shoulders,
//     jersey chest) or keeps near-max width down low.
// Metrics per portrait:
//   t_max      — where the widest row sits (0=top of head, 1=bottom)
//   bottom     — width at t=0.80..0.92 (median) relative to max width
//   neck_min   — narrowest width across t=0.45..0.80 relative to max
//   verdict    — head_only | jersey_ok (heuristic thresholds, see below)
//
// Calibration anchors (known by platform nature):
//   premierleague.com FPL 220x280 headshot cards  → expected head_only
//   UEFA 1080x1080 cutoffs                        → expected jersey_ok
"use strict";

const fs = require("fs");
const path = require("path");
const { config } = require("./lib/config");
const { sharp } = require("./lib/images");

async function rowProfile(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const th = config.alpha_threshold;
  const rowVisible = new Uint32Array(height);
  for (let y = 0; y < height; y++) {
    const off = y * width * channels;
    let c = 0;
    for (let x = 0; x < width; x++) if (data[off + x * channels + 3] >= th) c++;
    rowVisible[y] = c;
  }
  // subject bounds with the pipeline's edge-density trim
  const minRow = Math.max(1, Math.ceil(width * config.edge_density_trim));
  let minY = 0; while (minY < height && rowVisible[minY] < minRow) minY++;
  let maxY = height - 1; while (maxY > minY && rowVisible[maxY] < minRow) maxY--;
  if (maxY <= minY) return null;
  let maxW = 0;
  for (let y = minY; y <= maxY; y++) maxW = Math.max(maxW, rowVisible[y]);
  const subjectH = maxY - minY + 1;
  const wAt = (t) => {
    const y = minY + Math.round(t * (subjectH - 1));
    return rowVisible[y] / maxW;
  };
  // bottom band median (robust vs a single cropped row)
  const band = [0.80, 0.84, 0.88, 0.92].map(wAt).sort((a, b) => a - b);
  const bottom = (band[1] + band[2]) / 2;
  // narrowest point in the mid-lower region (the "neck")
  let neck = 1;
  for (let t = 0.45; t <= 0.8; t += 0.05) neck = Math.min(neck, wAt(t));
  // where is the widest row?
  let tMax = 0;
  for (let y = minY; y <= maxY; y++) if (rowVisible[y] === maxW) { tMax = (y - minY) / (subjectH - 1); break; }
  return { minY, maxY, subjectH, maxW, tMax, bottom, neck };
}

(async () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(config.asset_dir, "manifest-heroes.json"), "utf8"));
  const fetchLog = JSON.parse(fs.readFileSync(path.join(config.cache_dir, "heroes", "fetch-log.json"), "utf8"));

  // platform per key from the fetch log (alt_source present = league platform)
  const platByKey = {};
  for (const [key, rec] of Object.entries(fetchLog)) {
    platByKey[key] = rec.alt_source ? rec.alt_source.platform : "uefa";
  }

  const rows = [];
  for (const e of manifest.entries) {
    const key = e.hero ? e.hero.club_slug : e.filename.replace(/\.webp$/, "");
    const file = path.join(config.asset_dir, e.filename);
    if (!fs.existsSync(file)) continue;
    const p = await rowProfile(file);
    if (!p) { rows.push({ file: e.filename, name: e.requested_name_display || e.requested_name, plat: platByKey[key] || "?", err: "no subject" }); continue; }
    rows.push({
      file: e.filename,
      name: e.requested_name_display || e.requested_name,
      plat: platByKey[key] || "?",
      tMax: +p.tMax.toFixed(2),
      bottom: +p.bottom.toFixed(2),
      neck: +p.neck.toFixed(2),
      h: p.subjectH,
    });
  }

  // verdict: head-only = widest point clearly above the shoulders AND the
  // bottom band clearly narrower than the max (taper) AND a pronounced neck
  // pinch. jersey_ok = wide bottom band or no taper.
  for (const r of rows) {
    if (r.err) { r.verdict = "ERROR"; continue; }
    const taper = r.bottom < 0.72;            // bottom is much narrower than max
    const highMax = r.tMax < 0.55;            // widest row is at cheek/ear level
    const pinch = r.neck < 0.78;              // a real neck/jaw narrowing exists
    r.verdict = taper && highMax && pinch ? "head_only" : "jersey_ok";
  }

  const order = { head_only: 0, jersey_ok: 1, ERROR: 2 };
  rows.sort((a, b) => (order[a.verdict] - order[b.verdict]) || a.plat.localeCompare(b.plat));
  console.log("verdict\tplatform\ttMax\tbottom\tneck\tsubjectH\tfile\tname");
  for (const r of rows) {
    console.log(`${r.verdict}\t${r.plat}\t${r.tMax}\t${r.bottom}\t${r.neck}\t${r.h}\t${r.file}\t${r.name}`);
  }
  console.log("\n=== per-platform tallies ===");
  const tally = {};
  for (const r of rows) {
    tally[r.plat] = tally[r.plat] || { head_only: 0, jersey_ok: 0 };
    tally[r.plat][r.verdict] = (tally[r.plat][r.verdict] || 0) + 1;
  }
  for (const [p, t] of Object.entries(tally)) console.log(p, JSON.stringify(t));
})();
