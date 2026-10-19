// ascii-viz.js — deterministic "eyes" for portrait QA without VLM.
// Renders any portrait/original as a coarse ASCII grid:
//   .  = transparent      o = skin-like (vs face reference)   K = kit/other color
//   #  = opaque & dark (hair/shadow)                         ? = unclassified
// Usage: node ascii-viz.js <file.webp> [cols] [rows]
"use strict";

const { sharp } = require("./lib/images");

function rgbToHsv(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let h = 0;
  if (d > 0) {
    if (mx === r) h = 60 * (((g - b) / d) % 6);
    else if (mx === g) h = 60 * ((b - r) / d + 2);
    else h = 60 * ((r - g) / d + 4);
    if (h < 0) h += 360;
  }
  return { h, s: mx === 0 ? 0 : d / mx, v: mx };
}

(async () => {
  const file = process.argv[2];
  const COLS = parseInt(process.argv[3] || "28", 10);
  const ROWS = parseInt(process.argv[4] || "32", 10);
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  // grid accumulation
  const cellA = Array.from({ length: ROWS }, () => new Float64Array(COLS));       // alpha sum
  const cellN = Array.from({ length: ROWS }, () => new Int32Array(COLS));          // pixel count
  const cellRGB = Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => [0, 0, 0]));
  for (let y = 0; y < height; y++) {
    const gy = Math.min(ROWS - 1, Math.floor((y / height) * ROWS));
    for (let x = 0; x < width; x++) {
      const gx = Math.min(COLS - 1, Math.floor((x / width) * COLS));
      const i = (y * width + x) * channels;
      cellA[gy][gx] += data[i + 3];
      cellN[gy][gx]++;
      cellRGB[gy][gx][0] += data[i]; cellRGB[gy][gx][1] += data[i + 1]; cellRGB[gy][gx][2] += data[i + 2];
    }
  }
  // face reference: median hue/sat of skin-gated cells in rows 20-40% (upper third of subject)
  // first pass: find subject rows (any alpha)
  const rowOpaque = cellA.map((r) => r.reduce((a, b) => a + (b > 12.75 * 30 ? 1 : 0), 0)); // cells with avg alpha>15
  const firstRow = rowOpaque.findIndex((n) => n >= 2);
  const lastRow = ROWS - 1 - rowOpaque.slice().reverse().findIndex((n) => n >= 2);
  const subjRows = firstRow >= 0 ? lastRow - firstRow + 1 : ROWS;
  const faceCells = [];
  for (let gy = Math.round(firstRow + subjRows * 0.15); gy <= Math.round(firstRow + subjRows * 0.45); gy++) {
    for (let gx = 0; gx < COLS; gx++) {
      if (cellA[gy][gx] / (cellN[gy][gx] * 255) < 0.5) continue;
      const [r, g, b] = cellRGB[gy][gx].map((v) => v / cellN[gy][gx]);
      const { h, s } = rgbToHsv(r, g, b);
      if (h >= 5 && h <= 60 && s >= 0.08 && s <= 0.75) faceCells.push([r, g, b]);
    }
  }
  faceCells.sort((a, b) => (a[0] + a[1] + a[2]) - (b[0] + b[1] + b[2]));
  const ref = faceCells[Math.floor(faceCells.length / 2)] || [200, 160, 130];

  const out = [];
  for (let gy = 0; gy < ROWS; gy++) {
    let line = "";
    for (let gx = 0; gx < COLS; gx++) {
      const a = cellA[gy][gx] / (cellN[gy][gx] * 255);
      if (a < 0.15) { line += "."; continue; }
      const [r, g, b] = cellRGB[gy][gx].map((v) => v / cellN[gy][gx]);
      const { h, s, v } = rgbToHsv(r, g, b);
      const d = Math.hypot(r - ref[0], g - ref[1], b - ref[2]);
      if (d < 70 && h >= 0 && h <= 70 && s <= 0.8) line += "o";        // skin-like
      else if (v < 0.28) line += "#";                                    // dark (hair/shadow/dark kit)
      else line += "K";                                                  // kit/other colour
    }
    out.push(line);
  }
  console.log(`--- ${file} (${width}x${height}) — . transparent / o skin / # dark / K kit — subject rows ${firstRow}..${lastRow}`);
  console.log(out.join("\n"));
})();
