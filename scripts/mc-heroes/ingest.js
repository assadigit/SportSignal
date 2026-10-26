#!/usr/bin/env node
// scripts/mc-heroes/ingest.js — THE standardization engine.
//
// Takes ANY source portrait (any dimension, any aspect, any framing) and
// emits the canonical .mc-pre window: 356x574, crown at row 123, head
// (widest run) at 91px, head center at 55.6%W (home) / 44.0%W (away),
// figure reaching the bottom, lanczos3, lossless webp with alpha.
//
// Every output is SELF-VERIFIED (measured again after the write; any
// tolerance breach deletes the file and fails). Sources that cannot fill
// the window are REJECTED with a reason — the operator then picks a
// deeper shot from the club alternates. This is the guard that would
// have caught the Bruno bug (a 0.89-aspect tight bust riding the
// contain fallback) before it ever shipped.
//
// Modes:
//   canonical     target the spec (new players)
//   legacy-scale  target the spec WINDOW (356x574, crown 123, cx 55.6/44.0%W)
//                but a PER-ENTRY head width --head <px> — for sources whose
//                figure is too shallow to span the window at the canonical
//                91px head (the yamal/mbappe precedent, machine-generated:
//                the head lands bigger so the figure still reaches the fade
//                floor; the registry records the head, the gate re-checks it)
//   twin          re-window a source at an existing legacy file's own
//                geometry with the MIRRORED head center (adds the missing
//                side variant to an approved window without touching it)
//
// Usage:
//   node scripts/mc-heroes/ingest.js --src <source.webp> --out <outBasename> \
//        [--side home|away] [--fade N] [--mode canonical|legacy-scale|twin --legacy <file>] \
//        [--head N] [--force] [--json]
"use strict";
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const { pixels, alphaBBox, detectHead } = require("./lib/geom");

const SPEC = require("./spec.json");
const MC_DIR = path.join(__dirname, "..", "..", "assets", "ui", "mc");

function fail(msg) {
  console.error("REJECT " + msg);
  process.exitCode = 2;
  return null;
}

/** Measure a file and return {px,bbox,head} or throw. */
async function measure(file) {
  const px = await pixels(file);
  const bbox = alphaBBox(px);
  if (!bbox) throw new Error("no opaque pixels: " + file);
  const head = detectHead(px, bbox);
  if (!head.ok) throw new Error("head detection failed: " + file + " — " + head.reason);
  return { px, bbox, head };
}

/**
 * The standardization transform.
 * src   — measurement of the SOURCE file
 * tgt   — {w,h,crownRow,headPx,cxPx} the output targets (spec or legacy)
 * Returns { pipeline, meta } — meta carries the window math for the report.
 */
function buildWindow(src, tgt) {
  const s = tgt.headPx / src.head.headMaxW; // scale source -> output
  const winW = tgt.w / s;
  const winH = tgt.h / s;
  const winX = src.head.headCx - tgt.cxPx / s; // window left (source px)
  const winY = src.head.crown - tgt.crownRow / s; // window top (source px)
  return { s, winW, winH, winX, winY };
}

async function runIngest(opts) {
  const { srcFile, outName, side, fade, mode, legacyFile, head, force } = opts;

  // ---------- source ----------
  const src = await measure(srcFile);

  // ---------- target ----------
  let tgt, fadePct, legacyGeo = null;
  if (mode === "twin") {
    if (!legacyFile) return fail("--mode twin requires --legacy <file>");
    const leg = await measure(path.join(MC_DIR, legacyFile));
    legacyGeo = {
      file: legacyFile,
      w: leg.px.width,
      h: leg.px.height,
      crown: leg.head.crown,
      headMaxW: leg.head.headMaxW,
      headCx: leg.head.headCx,
    };
    tgt = {
      w: leg.px.width,
      h: leg.px.height,
      crownRow: leg.head.crown,
      headPx: leg.head.headMaxW,
      cxPx: leg.px.width - leg.head.headCx, // mirrored head center
    };
    fadePct = fade; // required from the registry (the legacy file's own stop)
  } else if (mode === "legacy-scale") {
    // v13.184-mcbig5: the spec window at a bigger head — for the big clubs
    // whose every available source spans the same ~460-row UEFA cutoff (too
    // shallow for 91px), the head is scaled up just enough that the figure
    // still reaches the 534 fade floor (the shipped yamal-4 107px / mbappe-4
    // 125px precedent, now pipeline-generated + self-verified).
    if (!head) return fail("--mode legacy-scale requires --head <px> (the window-filling head width)");
    tgt = {
      w: SPEC.window.width,
      h: SPEC.window.height,
      crownRow: SPEC.window.crown_row,
      headPx: head,
      cxPx: Math.round((side === "home" ? SPEC.head.cx_home_pctw : SPEC.head.cx_away_pctw) / 100 * SPEC.window.width),
    };
    fadePct = fade !== undefined ? fade : SPEC.fade.default_pct;
  } else {
    tgt = {
      w: SPEC.window.width,
      h: SPEC.window.height,
      crownRow: SPEC.window.crown_row,
      headPx: SPEC.head.max_width_px,
      cxPx: Math.round((side === "home" ? SPEC.head.cx_home_pctw : SPEC.head.cx_away_pctw) / 100 * SPEC.window.width),
    };
    fadePct = fade !== undefined ? fade : SPEC.fade.default_pct;
  }

  // ---------- guards ----------
  const g = SPEC.ingest_guards;
  const warnings = [];
  if (src.head.headMaxW < g.min_source_head_px)
    return fail(`source head only ${src.head.headMaxW}px wide (< ${g.min_source_head_px}) — resolution too low for the ${tgt.headPx}px target`);
  const s = tgt.headPx / src.head.headMaxW;
  if (s > g.max_upscale)
    return fail(`needs ${s.toFixed(2)}x upscale (> ${g.max_upscale}) — find a larger source`);
  if (s > g.warn_upscale) warnings.push(`${s.toFixed(2)}x upscale (soft quality risk — a larger source exists in the club alternates?)`);
  const spanOut = Math.round((src.bbox.y1 - src.head.crown + 1) * s);
  // canonical: the window holds (H - crownRow) rows below the crown; the
  //   figure must reach >= 90% of them so its bottom dissolves in the fade.
  // twin: same rule against the legacy window's own crown row.
  const rowsBelowCrown = tgt.h - tgt.crownRow;
  const minSpan = mode === "twin"
    ? Math.round(rowsBelowCrown * 0.90)
    : Math.max(g.min_figure_span_out_rows, Math.round(rowsBelowCrown * 0.90));
  if (spanOut < minSpan)
    return fail(`source figure too short: spans ${spanOut} output rows below the crown (< ${minSpan} needed) — the bust would float above the fade; pick a deeper shot from assets/players/clubs/`);
  if (src.bbox.y0 > src.head.crown) warnings.push("opaque pixels ABOVE the detected crown (a raised hand?) — verify the contact sheet");

  // ---------- window math ----------
  const win = buildWindow(src, tgt);
  if (!isFinite(win.winX) || !isFinite(win.winY)) return fail("window math failed (NaN)");

  // lateral clip analysis (in output px)
  const leftOut = (src.bbox.x0 - win.winX) * win.s;
  const rightOut = tgt.w - (src.bbox.x1 - win.winX) * win.s;
  const clipL = Math.max(0, -leftOut), clipR = Math.max(0, -rightOut);
  for (const [label, v] of [["left", clipL], ["right", clipR]]) {
    const pct = (v / tgt.w) * 100;
    if (pct > g.max_lateral_clip_pct_per_side)
      return fail(`figure clips ${pct.toFixed(1)}% off the ${label} window edge (> ${g.max_lateral_clip_pct_per_side}%) — composition destroyed; pick another pose`);
    if (pct > 12) warnings.push(`figure clips ${pct.toFixed(1)}% at the ${label} edge — INSIDE the side-fade's transparent band (0-14% outer / 75-98% inner), invisible by design (the approved bruno clips 15% the same way)`);
  }

  // fade validation
  if (fadePct === undefined) return fail("twin mode requires --fade (the legacy file's own MC_GEOM stop)");
  if (fadePct < SPEC.fade.min_pct || fadePct > SPEC.fade.max_pct)
    return fail(`fade ${fadePct} outside [${SPEC.fade.min_pct},${SPEC.fade.max_pct}]`);

  // ---------- render ----------
  const srcMeta = await sharp(srcFile).metadata();
  const wW = Math.round(win.winW), wH = Math.round(win.winH);
  const left = Math.round(win.winX), top = Math.round(win.winY);
  const extL = Math.max(0, -left), extT = Math.max(0, -top);
  const extR = Math.max(0, left + wW - srcMeta.width), extB = Math.max(0, top + wH - srcMeta.height);
  const exL = Math.max(0, left), exT = Math.max(0, top);
  const exW = Math.max(1, Math.min(srcMeta.width, left + wW) - exL);
  const exH = Math.max(1, Math.min(srcMeta.height, top + wH) - exT);

  let pipe = sharp(srcFile).extract({ left: exL, top: exT, width: exW, height: exH });
  if (extL || extT || extR || extB) {
    pipe = pipe.extend({
      left: extL, top: extT, right: extR, bottom: extB,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    });
  }
  // TWO PASSES, materialized: chaining extract->extend->resize in ONE sharp
  // stream mis-computes the output size in sharp 0.35.x (the resize sees the
  // pre-extract canvas). The intermediate buffer is tiny (<= ~600px) and the
  // self-verification below would catch any regression anyway.
  const extended = await pipe.png().toBuffer();
  const final = await sharp(extended)
    .resize(tgt.w, tgt.h, { kernel: "lanczos3" })
    .webp({ lossless: true })
    .toBuffer();

  const outPath = path.join(MC_DIR, outName);
  if (fs.existsSync(outPath) && !force)
    return fail(`${outName} already exists (immutable-pin rule) — pass a NEW name or --force to overwrite an unshipped file`);

  fs.writeFileSync(outPath + ".tmp.webp", final);

  // ---------- self-verification ----------
  const out = await measure(outPath + ".tmp.webp");
  const errs = [];
  if (out.px.width !== tgt.w || out.px.height !== tgt.h)
    errs.push(`dims ${out.px.width}x${out.px.height} != ${tgt.w}x${tgt.h}`);
  if (Math.abs(out.head.crown - tgt.crownRow) > SPEC.window.crown_row_tol)
    errs.push(`crown row ${out.head.crown} != ${tgt.crownRow} (tol ${SPEC.window.crown_row_tol})`);
  if (Math.abs(out.head.headMaxW - tgt.headPx) > SPEC.head.max_width_tol_px)
    errs.push(`head width ${out.head.headMaxW} != ${tgt.headPx} (tol ${SPEC.head.max_width_tol_px})`);
  if (Math.abs(out.head.headCx - tgt.cxPx) > Math.ceil(SPEC.head.cx_tol_pctw / 100 * tgt.w))
    errs.push(`head center ${out.head.headCx.toFixed(1)} != ${tgt.cxPx}`);
  const bottomMin = mode === "twin" ? Math.floor(tgt.h * 0.92) : SPEC.window.figure_bottom_min_row;
  if (out.bbox.y1 < bottomMin)
    errs.push(`figure bottom row ${out.bbox.y1} < ${bottomMin} — the bust would float`);
  if (errs.length) {
    fs.unlinkSync(outPath + ".tmp.webp");
    return fail("SELF-VERIFICATION FAILED for " + outName + ": " + errs.join("; "));
  }
  fs.renameSync(outPath + ".tmp.webp", outPath);

  const result = {
    ok: true,
    file: "assets/ui/mc/" + outName,
    mode,
    side,
    source: srcFile,
    scale: +s.toFixed(4),
    fade: fadePct,
    geometry: {
      dims: `${out.px.width}x${out.px.height}`,
      aspect: +(out.px.width / out.px.height).toFixed(4),
      crown: out.head.crown,
      crownPctH: +((out.head.crown / out.px.height) * 100).toFixed(2),
      headMaxW: out.head.headMaxW,
      headCx: Math.round(out.head.headCx),
      headCxPctW: +((out.head.headCx / out.px.width) * 100).toFixed(2),
      figureBottom: out.bbox.y1,
      figureBottomPctH: +((out.bbox.y1 / out.px.height) * 100).toFixed(2),
    },
    warnings,
    legacy: legacyGeo,
  };
  return result;
}

module.exports = { runIngest, measure, buildWindow, SPEC, MC_DIR };

async function main() {
  const argv = process.argv.slice(2);
  const arg = (k) => {
    const i = argv.indexOf("--" + k);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  const opts = {
    srcFile: arg("src"),
    outName: arg("out"),
    side: arg("side") || "home",
    fade: arg("fade") !== undefined ? parseInt(arg("fade"), 10) : undefined,
    mode: arg("mode") || "canonical",
    legacyFile: arg("legacy"),
    head: arg("head") !== undefined ? parseInt(arg("head"), 10) : undefined,
    force: argv.includes("--force"),
  };
  if (!opts.srcFile || !opts.outName) {
    console.error("usage: ingest --src <file> --out <name.webp> [--side home|away] [--fade N] [--mode canonical|legacy-scale --head N | twin --legacy <file>] [--force] [--json]");
    process.exit(1);
  }
  const res = await runIngest(opts);
  if (!res) process.exit(process.exitCode || 2);
  if (argv.includes("--json")) console.log(JSON.stringify(res, null, 1));
  else {
    console.log(`OK    ${res.file}  [${res.mode}/${res.side}] scale ${res.scale} fade ${res.fade}`);
    console.log(`     crown ${res.geometry.crown} (${res.geometry.crownPctH}%H)  head ${res.geometry.headMaxW}px  cx ${res.geometry.headCxPctW}%W  bottom ${res.geometry.figureBottomPctH}%H`);
    for (const w of res.warnings) console.log("     WARN " + w);
  }
}
if (require.main === module) main().catch((e) => { console.error("ERROR", e.message); process.exit(1); });
