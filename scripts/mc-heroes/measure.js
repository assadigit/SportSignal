#!/usr/bin/env node
// scripts/mc-heroes/measure.js — print the geometry of an image (or all
// registered .mc-pre windows). Usage:
//   node scripts/mc-heroes/measure.js assets/ui/mc/mc-port-palmer.webp [more...]
//   node scripts/mc-heroes/measure.js --all
// Every number this pipeline standardizes against is computed here — the
// spec constants in spec.json were derived from these measurements of the
// six owner-approved v13.180/v13.182 windows.
"use strict";
const path = require("path");
const fs = require("fs");
const { pixels, alphaBBox, detectHead } = require("./lib/geom");

// the live per-file fade stops (MC_GEOM in src/pages/public.ts)
const LIVE_FADE = {
  "mc-port-kane-2.webp": 69,
  "mc-port-yamal-4.webp": 77,
  "mc-port-mbappe-4.webp": 71,
  "mc-port-palmer.webp": 66,
  "art-tottenham-6.webp": 61,
  "mc-port-bruno.webp": 66,
};

async function measureOne(f) {
  const px = await pixels(f);
  const bbox = alphaBBox(px);
  const head = detectHead(px, bbox);
  const base = path.basename(f);
  const fade = LIVE_FADE[base];
  const out = {
    file: base,
    dims: `${px.width}x${px.height}`,
    aspect: +(px.width / px.height).toFixed(4),
    bbox,
    crownPctH: +((head.crown / px.height) * 100).toFixed(2),
    figureBottomPctH: +((bbox.y1 / px.height) * 100).toFixed(2),
    head: {
      crown: head.crown,
      chin: head.chin,
      headMaxW: head.headMaxW,
      headMaxW_PctW: +((head.headMaxW / px.width) * 100).toFixed(2),
      headCx: head.headCx,
      headCx_PctW: +((head.headCx / px.width) * 100).toFixed(2),
    },
  };
  if (fade !== undefined) {
    const fadeRow = (fade / 100) * px.height;
    out.fade = {
      stopPct: fade,
      fadeRow: Math.round(fadeRow),
      headsBelowCrown: +((fadeRow - head.crown) / head.headMaxW).toFixed(2),
    };
  }
  return out;
}

(async () => {
  const args = process.argv.slice(2);
  let files = args;
  if (!args.length || args[0] === "--all") {
    const dir = path.join(__dirname, "..", "..", "assets", "ui", "mc");
    files = fs
      .readdirSync(dir)
      .filter((f) => /^mc-port-|^art-/.test(f))
      .map((f) => path.join(dir, f))
      .sort();
  }
  for (const f of files) {
    if (!fs.existsSync(f)) { console.error("missing:", f); continue; }
    console.log(JSON.stringify(await measureOne(f)));
  }
})();
