// lib/images.js — image inspection and normalization (spec §8) using sharp.
//
// Framing contract:
//   1. visible content detected with a documented alpha threshold, ignoring
//      isolated near-transparent noise (row/column density trim)
//   2. uniform scale-to-fit inside a content box leaving ~5% padding
//   3. horizontally centred, subject bottom aligned to the shared content-box
//      baseline
//   4. aspect ratio preserved; scale never exceeds 1 (no upscaling); no
//      cropping of meaningful content
"use strict";

const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");
const crypto = require("crypto");
const sharp = require("sharp");

const { config } = require("./config");

sharp.cache(false);
sharp.concurrency(1);

function sha256(buf) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

// --- validation of downloaded bytes -----------------------------------------

const WEBP_MAGIC = Buffer.from("RIFF");
const WEBP_MAGIC2 = Buffer.from("WEBP");

// Content validation: magic bytes + decodable + sane dimensions + real alpha
// usage when alpha is present. Rejects HTML error pages, empty images,
// implausibly small images and generic placeholders (spec §7).
async function validateImageBuffer(buf, { expectAlpha = true, minDimension = 64, maxDimension = 4096 } = {}) {
  const problems = [];
  if (!buf || buf.length < 64) problems.push("implausibly small download (<64 bytes)");
  if (buf && (buf.length < 4 || !buf.slice(0, 4).equals(WEBP_MAGIC) || buf.slice(8, 12).toString("ascii") !== "WEBP")) {
    // not a WebP container — could still be a valid PNG/JPEG candidate, let
    // sharp decide below; only flag when sharp cannot decode either.
  }
  let meta;
  try {
    meta = await sharp(buf).metadata();
  } catch (err) {
    return { ok: false, problems: [`not a decodable image: ${err.message}`] };
  }
  if (!meta.format) problems.push("unknown image format");
  if (meta.format === "html") problems.push("HTML masquerading as an image");
  if (!meta.width || !meta.height) problems.push("missing dimensions");
  if (meta.width && (meta.width < minDimension || meta.height < minDimension)) {
    problems.push(`implausibly small image (${meta.width}x${meta.height})`);
  }
  if (meta.width && (meta.width > maxDimension || meta.height > maxDimension)) {
    problems.push(`unexpectedly large image (${meta.width}x${meta.height})`);
  }
  if (expectAlpha && !meta.hasAlpha) problems.push("source has no alpha channel");
  // placeholder detection: fully transparent or fully opaque single-colour
  if (meta.hasAlpha) {
    const stats = await sharp(buf).ensureAlpha().stats();
    const a = stats.channels[stats.channels.length - 1];
    if (a && a.min === a.max) {
      problems.push(a.min === 0 ? "image is fully transparent (placeholder)" : "alpha channel is constant (no transparency)");
    }
  }
  return { ok: problems.length === 0, problems, meta };
}

// --- subject geometry -------------------------------------------------------

// Compute the visible-subject bounding box using the documented alpha
// threshold, trimming rows/columns whose visible density is below the
// documented edge-density trim (ignores isolated near-transparent noise
// without deleting meaningful content).
async function subjectBounds(imgInput) {
  const { data, info } = await sharp(imgInput)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const threshold = config.alpha_threshold;
  const rowVisible = new Uint32Array(height);
  const colVisible = new Uint32Array(width);
  let any = false;
  for (let y = 0; y < height; y++) {
    const rowOff = y * width * channels;
    for (let x = 0; x < width; x++) {
      if (data[rowOff + x * channels + channels - 1] >= threshold) {
        rowVisible[y]++;
        colVisible[x]++;
        any = true;
      }
    }
  }
  if (!any) return { empty: true, width, height };
  const minRowPixels = Math.max(1, Math.ceil(width * config.edge_density_trim));
  const minColPixels = Math.max(1, Math.ceil(height * config.edge_density_trim));
  let minY = 0;
  while (minY < height && rowVisible[minY] < minRowPixels) minY++;
  let maxY = height - 1;
  while (maxY > minY && rowVisible[maxY] < minRowPixels) maxY--;
  let minX = 0;
  while (minX < width && colVisible[minX] < minColPixels) minX++;
  let maxX = width - 1;
  while (maxX > minX && colVisible[maxX] < minColPixels) maxX--;
  return {
    empty: false,
    width,
    height,
    minX,
    minY,
    maxX,
    maxY,
    subjectWidth: maxX - minX + 1,
    subjectHeight: maxY - minY + 1,
  };
}

// --- studio-background keying (spec v2.3) -----------------------------------
//
// Some league platforms serve their PHOTO variants on a plain white studio
// background (LaLiga's "_1_" series, 2048x2225) instead of transparent. The
// collection contract requires alpha, so those photos get keyed here:
// border-connected flood-fill of near-white pixels (only regions REACHABLE
// from the canvas edge are removed — white shorts inside the figure stay),
// then a 2px near-white erosion of the cut edge to kill the halo.
function isNearWhite(r, g, b, threshold) {
  return r >= threshold && g >= threshold && b >= threshold;
}

// Does this buffer look like a white-background studio shot? Samples the
// border ring: when >=85% of border pixels are near-white and opaque, the
// image is a keying candidate.
async function studioBackgroundLikely(buf, { threshold = 240, coverage = 0.85 } = {}) {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  let white = 0, total = 0;
  const test = (x, y) => {
    const i = (y * width + x) * channels;
    const a = data[i + channels - 1];
    if (a < 16) return; // already transparent — not a studio shot pixel
    total++;
    if (isNearWhite(data[i], data[i + 1], data[i + 2], threshold)) white++;
  };
  for (let x = 0; x < width; x++) { test(x, 0); test(x, height - 1); }
  for (let y = 0; y < height; y++) { test(0, y); test(width - 1, y); }
  return total > 0 && white / total >= coverage;
}

// Key the white studio background. Returns { buffer, keyed_fraction, method }
// or throws when the safety envelope is violated (the flood reached <3% or
// >92% of the canvas — the source was probably not a studio shot, or the
// subject itself is white; refusing is safer than mangling the player).
async function keyStudioBackground(buf, { threshold = 240, erodePx = 2 } = {}) {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const W = width, H = height, C = channels;
  const keyed = new Uint8Array(W * H); // 1 = remove
  const queue = new Int32Array(W * H);
  let qh = 0, qt = 0, keyedCount = 0;

  const nearWhiteAt = (idx) => isNearWhite(data[idx], data[idx + 1], data[idx + 2], threshold);

  const push = (x, y) => {
    const p = y * W + x;
    if (keyed[p]) return;
    const i = p * C;
    const a = data[i + C - 1];
    const bgish = a < 16 || nearWhiteAt(i);
    if (!bgish) return;
    keyed[p] = 1;
    keyedCount++;
    queue[qt++] = p;
  };

  for (let x = 0; x < W; x++) { push(x, 0); push(x, H - 1); }
  for (let y = 0; y < H; y++) { push(0, y); push(W - 1, y); }

  while (qh < qt) {
    const p = queue[qh++];
    const x = p % W, y = (p - x) / W;
    if (x > 0) push(x - 1, y);
    if (x < W - 1) push(x + 1, y);
    if (y > 0) push(x, y - 1);
    if (y < H - 1) push(x, y + 1);
  }

  const fraction = keyedCount / (W * H);
  if (fraction < 0.03 || fraction > 0.92) {
    throw new Error(`keyStudioBackground: flood-fill reached ${(fraction * 100).toFixed(1)}% of the canvas (expected 3-92%) — refusing to key`);
  }

  // 2px erosion of the cut edge: near-white opaque pixels adjacent to the
  // keyed region are removed too (kills the white halo without touching
  // white kit INSIDE the figure, which the flood never reached).
  for (let pass = 0; pass < erodePx; pass++) {
    const grow = new Uint8Array(keyed); // copy
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const p = y * W + x;
        if (keyed[p]) continue;
        const nb = (x > 0 && keyed[p - 1]) || (x < W - 1 && keyed[p + 1]) ||
          (y > 0 && keyed[p - W]) || (y < H - 1 && keyed[p + W]);
        if (!nb) continue;
        const i = p * C;
        if (data[i + C - 1] >= 16 && nearWhiteAt(i)) { grow[p] = 1; keyedCount++; }
      }
    }
    keyed.set(grow);
  }

  // apply
  for (let p = 0; p < W * H; p++) {
    if (keyed[p]) data[p * C + C - 1] = 0;
  }

  const out = await sharp(data, { raw: { width: W, height: H, channels: C } }).png().toBuffer();
  return {
    buffer: out,
    keyed_fraction: Number(fraction.toFixed(4)),
    method: `border-connected flood-fill near-white (>=${threshold}), ${erodePx}px edge erosion`,
  };
}


// Normalize a source cutout to the shared target canvas.
// Returns { buffer, normalization } or throws with an actionable error.
// opts.framing_override: optional { scale?: <=1, y_offset_px?, x_offset_px? }
// documented per-player override (spec §8 framing review).
// opts.crop_top_fraction: alt-source full-body images are cropped to their
//   top fraction (head-and-shoulders region) before bounding — recorded in
//   the fetch-log alt_source block.
// opts.allow_upscale: alt-source exception (spec §8 no-upscale applies to UEFA
//   originals; some league platforms serve no larger variant).
async function normalizePortrait(sourceBuf, opts = {}) {
  const W = config.target_width;
  const H = config.target_height;
  const pad = Math.round(Math.min(W, H) * config.padding_fraction); // 5%
  const contentX = pad;
  const contentY = pad;
  const contentW = W - 2 * pad;
  const contentH = H - 2 * pad;

  if (opts.crop_top_fraction && opts.crop_top_fraction > 0 && opts.crop_top_fraction < 1) {
    const meta = await sharp(sourceBuf).metadata();
    const cropH = Math.max(1, Math.round(meta.height * opts.crop_top_fraction));
    sourceBuf = await sharp(sourceBuf)
      .extract({ left: 0, top: 0, width: meta.width, height: cropH })
      .toBuffer();
  }

  const bounds = await subjectBounds(sourceBuf);
  if (bounds.empty) throw new Error("source has no visible subject (all alpha below threshold)");
  if (bounds.minX < 0 || bounds.minY < 0 || bounds.maxX >= bounds.width || bounds.maxY >= bounds.height) {
    throw new Error("subject bounds outside canvas — refusing to continue");
  }

  // Uniform scale-to-fit inside the content box.
  let scale = Math.min(contentW / bounds.subjectWidth, contentH / bounds.subjectHeight);
  let scaleCapped = false;
  if (scale > 1) {
    // Never upscale UEFA originals (spec §8). Alt-source collections may
    // explicitly allow it (e.g. the PL's 220x280 headshots have no larger
    // official variant) — the exception is recorded per entry.
    if (!opts.allow_upscale) {
      scale = 1;
      scaleCapped = true;
    }
  }
  const ov = opts.framing_override || {};
  if (typeof ov.scale === "number") {
    if (ov.scale <= 0 || ov.scale > 1) throw new Error("framing_override.scale must be in (0, 1]");
    scale = Math.min(scale, ov.scale);
  }
  const outW = Math.max(1, Math.round(bounds.subjectWidth * scale));
  const outH = Math.max(1, Math.round(bounds.subjectHeight * scale));

  // Horizontal centring + bottom-of-subject aligned to the content-box
  // baseline. A documented override may shift placement.
  let left = Math.round((W - outW) / 2);
  let top = contentY + contentH - outH;
  if (typeof ov.x_offset_px === "number") left += Math.round(ov.x_offset_px);
  if (typeof ov.y_offset_px === "number") top += Math.round(ov.y_offset_px);
  // Safety: keep the whole subject inside the canvas (never clip heads).
  left = Math.min(Math.max(0, left), W - outW);
  top = Math.min(Math.max(0, top), H - outH);

  const subject = await sharp(sourceBuf)
    .extract({ left: bounds.minX, top: bounds.minY, width: bounds.subjectWidth, height: bounds.subjectHeight })
    .resize(outW, outH, { fit: "fill", kernel: "lanczos3" })
    .png({ compressionLevel: 0 })
    .toBuffer();

  const canvas = await sharp({
    create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .png()
    .toBuffer();

  const buffer = await sharp(canvas)
    .composite([{ input: subject, left, top }])
    .webp(config.webp)
    .toBuffer();

  const outMeta = await sharp(buffer).metadata();
  if (outMeta.width !== W || outMeta.height !== H || !outMeta.hasAlpha) {
    throw new Error(`normalization produced unexpected output (${outMeta.width}x${outMeta.height}, alpha=${outMeta.hasAlpha})`);
  }

  return {
    buffer,
    normalization: {
      source_width: bounds.width,
      source_height: bounds.height,
      source_subject_bounds: { x: bounds.minX, y: bounds.minY, w: bounds.subjectWidth, h: bounds.subjectHeight },
      alpha_threshold: config.alpha_threshold,
      applied_scale: Number(scale.toFixed(6)),
      scale_capped_at_one: scaleCapped,
      output_subject_size: { w: outW, h: outH },
      placement: { left, top },
      content_box: { x: contentX, y: contentY, w: contentW, h: contentH },
      framing_override: opts.framing_override || null,
      encoder: "sharp webp lossless (lanczos3 downscale)",
    },
    warnings: scaleCapped
      ? [
          `source subject (${bounds.subjectWidth}x${bounds.subjectHeight}) is smaller than the ${contentW}x${contentH} content box — placed without upscaling; portrait will appear undersized on the shared canvas`,
        ]
      : [],
  };
}

// --- atomic writes ----------------------------------------------------------

async function writeFileAtomic(filePath, buf) {
  await fsp.mkdir(path.dirname(filePath), { recursive: true });
  const tmp = `${filePath}.tmp-${process.pid}-${Date.now()}`;
  await fsp.writeFile(tmp, buf);
  await fsp.rename(tmp, filePath);
}

// --- contact sheet ----------------------------------------------------------

// Build a labelled contact sheet (grid) from the final assets. Rendered on a
// neutral checkerboard so transparency is visible. Output stays OUTSIDE the
// published portrait directory (docs/assets/).
async function buildContactSheet(entries, outPath, { columns = 6 } = {}) {
  const cell = 256;
  const labelH = 44;
  const pad = 8;
  const rows = Math.ceil(entries.length / columns);
  const sheetW = columns * (cell + pad) + pad;
  const sheetH = rows * (cell + labelH + pad) + pad;

  // checkerboard background tile
  const tile = 16;

  const comps = [];
  const svgText = (txt, sub, x, y) =>
    `<text x="${x}" y="${y}" font-family="DejaVu Sans, Arial, sans-serif" font-size="13" fill="#111">${esc(txt)}</text>` +
    `<text x="${x}" y="${y + 15}" font-family="DejaVu Sans, Arial, sans-serif" font-size="11" fill="#555">${esc(sub)}</text>`;
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    const col = i % columns;
    const row = Math.floor(i / columns);
    const x = pad + col * (cell + pad);
    const y = pad + row * (cell + labelH + pad);

    // checkerboard for this cell
    const rects = [];
    for (let cy = 0; cy < cell; cy += tile) {
      for (let cx = 0; cx < cell; cx += tile) {
        const dark = ((cx / tile) + (cy / tile)) % 2 === 0;
        rects.push(`<rect x="${cx}" y="${cy}" width="${Math.min(tile, cell - cx)}" height="${Math.min(tile, cell - cy)}" fill="${dark ? "#d8d8d8" : "#f4f4f4"}"/>`);
      }
    }
    const checker = Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${cell}" height="${cell}">${rects.join("")}</svg>`
    );
    comps.push({ input: await sharp(checker).png().toBuffer(), left: x, top: y });

    let imgInput;
    let label = `#${e.roster_index} ${e.requested_name_display || e.requested_name}`;
    let sub = e.status === "complete" ? e.filename : `STATUS: ${e.status}`;
    if (e.status === "complete" && fs.existsSync(e._output_path)) {
      imgInput = await sharp(e._output_path).resize(cell, cell, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
    } else {
      // grey placeholder box for unresolved entries
      imgInput = await sharp({
        create: { width: cell, height: cell, channels: 4, background: { r: 120, g: 120, b: 120, alpha: 0.35 } },
      }).png().toBuffer();
      sub += e.warnings && e.warnings.length ? ` — ${e.warnings[0].slice(0, 60)}` : "";
    }
    comps.push({ input: imgInput, left: x, top: y });
    const labelSvg = Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${cell}" height="${labelH}">${svgText(label, sub, 0, 14)}</svg>`
    );
    comps.push({ input: await sharp(labelSvg).png().toBuffer(), left: x, top: y + cell + 2 });
  }

  const sheet = await sharp({
    create: { width: sheetW, height: sheetH, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } },
  })
    .composite(comps)
    .png()
    .toBuffer();
  await writeFileAtomic(outPath, sheet);
  return outPath;
}

module.exports = {
  sharp,
  sha256,
  validateImageBuffer,
  subjectBounds,
  studioBackgroundLikely,
  keyStudioBackground,
  normalizePortrait,
  writeFileAtomic,
  buildContactSheet,
};
