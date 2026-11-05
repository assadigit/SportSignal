// scripts/hero-canvas.js — the v13.131-playerpresence ALPHA-TRIM rule, as a
// shared module (v13.226-herowire). The render library contract
// (assets/hero/players/README.md §1 v13.131 update): every /players/hero/
// canvas is a bbox-crop of its manifest-pinned /players/uefa/ original —
// alpha-bbox threshold 8, +2px pad each side (clamped to the canvas),
// lossless webp. The pipeline's normalize contract places every subject in
// the uniform 460px band rows [26..485] of the 512 canvas, so the trim
// yields the standard 464px subject box; the WIDTH tracks the pose.
//
// Consumers: the S10 bulk wiring, backfill-hero-gaps.js --wire (single club).
"use strict";
const path = require("path");
const sharp = require("sharp");

const ALPHA_THRESHOLD = 8; // the v13.131 rule
const PAD = 2; // px, each side

async function subjectBBox(srcPath) {
  const { data, info } = await sharp(srcPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height;
  let top = H, bot = -1, left = W, right = -1;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (data[(y * W + x) * 4 + 3] >= ALPHA_THRESHOLD) {
        if (y < top) top = y;
        if (y > bot) bot = y;
        if (x < left) left = x;
        if (x > right) right = x;
      }
    }
  }
  if (bot < 0) throw new Error(path.basename(srcPath) + ": no opaque pixels (alpha threshold " + ALPHA_THRESHOLD + ")");
  return { W, H, top, bot, left, right };
}

// Trim the uefa original into the render-library canvas.
// Returns the written file's dimensions.
async function trimToHeroCanvas(srcPath, dstPath) {
  const b = await subjectBBox(srcPath);
  const left = Math.max(0, b.left - PAD);
  const top = Math.max(0, b.top - PAD);
  const width = Math.min(b.W - left, b.right - b.left + 1 + 2 * PAD);
  const height = Math.min(b.H - top, b.bot - b.top + 1 + 2 * PAD);
  await sharp(srcPath)
    .extract({ left, top, width, height })
    .webp({ lossless: true })
    .toFile(dstPath);
  return { width, height };
}

module.exports = { subjectBBox, trimToHeroCanvas, ALPHA_THRESHOLD, PAD };
