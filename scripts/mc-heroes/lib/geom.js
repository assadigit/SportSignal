#!/usr/bin/env node
// scripts/mc-heroes/lib/geom.js — alpha-geometry measurement primitives.
// Shared by measure/ingest/validate. Pure functions over raw RGBA pixels.
//
// Detection model (derived from the six owner-approved v13.180/182 windows):
//   - CROWN  : top of the first opaque mass that grows >= CONFIRM_ROWS tall
//              (a floating hand above the head shows up as a short mass
//              followed by a transparent gap, and is skipped).
//   - HEAD X : union of the widest opaque RUN over the crown probe band
//              (top 28% of the figure) — runs, not spans, so arms raised
//              BESIDE the head never contaminate the head extent.
//   - HEAD   : rows crown..chin. chin fires on the first of:
//       (a) sustained RUN-width jump  >= JUMP_RATIO x running max (arms),
//       (b) sustained taper < TAPER_RATIO x running max (the neck), or
//       (c) shoulder scale (> HEAD_LIMIT of the figure bbox width).
//   - headMaxW (the jaw/hair widest run) is THE canonical SCALE metric —
//     v13.182's "91px = 25.6%W" (palmer == bruno, the owner-approved pair).
//   - headCx (mean run center over the head rows) is THE lateral anchor —
//     palmer 55.6%W (home) mirrors bruno 44.0%W (away).
"use strict";

const MIN_OPACITY = 38; // alpha >= 38/255 counts as figure (anti-aliased fringe tolerant)

const DEFAULTS = {
  minRun: 3,          // opaque px to count a row
  confirmRows: 14,    // mass height that confirms the head (vs floating hand)
  headProbe: 0.28,    // fraction of figure height used for head x-extent
  headLimit: 0.46,    // run width (fraction of bbox w) = shoulder scale
  jumpRatio: 1.5,     // sustained jump = arms
  taperRatio: 0.72,   // sustained drop below this = neck
  taperRows: 5,       // consecutive taper rows to confirm the neck
  armMinRows: 16,     // head must be >= this many rows before rules arm
  armRows: 6,         // width must be plateaued this many rows before rules arm
};

/** Extract raw RGBA buffer + dims. */
async function pixels(imgPath) {
  const sharp = require("sharp");
  const { data, info } = await sharp(imgPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height, channels: info.channels };
}

/** Opaque runs in one row within [x0,x1]. Returns the widest run + all runs. */
function rowRuns(px, y, x0, x1) {
  const rowOff = y * px.width * px.channels;
  const runs = [];
  let cur = null;
  for (let x = x0; x <= x1; x++) {
    const a = px.data[rowOff + x * px.channels + 3];
    if (a >= MIN_OPACITY) {
      if (!cur) cur = { first: x };
      cur.last = x;
    } else if (cur) {
      cur.w = cur.last - cur.first + 1;
      cur.center = (cur.first + cur.last) / 2;
      runs.push(cur);
      cur = null;
    }
  }
  if (cur) {
    cur.w = cur.last - cur.first + 1;
    cur.center = (cur.first + cur.last) / 2;
    runs.push(cur);
  }
  let widest = null;
  let count = 0;
  for (const r of runs) {
    count += r.w;
    if (!widest || r.w > widest.w) widest = r;
  }
  return { runs, widest, count, spanW: count ? runs[runs.length - 1].last - runs[0].first + 1 : 0 };
}

/** Full-figure alpha bbox (any opaque pixel). */
function alphaBBox(px) {
  let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1;
  for (let y = 0; y < px.height; y++) {
    const r = rowRuns(px, y, 0, px.width - 1);
    if (r.count > 0) {
      if (r.runs[0].first < x0) x0 = r.runs[0].first;
      if (r.runs[r.runs.length - 1].last > x1) x1 = r.runs[r.runs.length - 1].last;
      if (y < y0) y0 = y;
      y1 = y;
    }
  }
  if (x1 < 0) return null;
  return { x0, y0, x1, y1, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

/** The head detector — see the file header for the model. */
function detectHead(px, bbox, opts) {
  const o = Object.assign({}, DEFAULTS, opts || {});
  if (!bbox) return { ok: false, reason: "no figure bbox" };

  // ---- pass A: crown (top of the first CONFIRM_ROWS-tall opaque mass) ----
  let crown = -1;
  let massStart = -1;
  let massRows = 0;
  for (let y = bbox.y0; y <= bbox.y1; y++) {
    const r = rowRuns(px, y, bbox.x0, bbox.x1);
    if (r.count >= o.minRun) {
      if (massStart < 0) { massStart = y; massRows = 0; }
      massRows++;
      if (massRows >= o.confirmRows) { crown = massStart; break; }
    } else if (massStart >= 0) {
      if (massRows < o.confirmRows) { massStart = -1; massRows = 0; } // gap: floating part
      else { crown = massStart; break; } // mass ended on its own
    }
  }
  if (crown < 0) {
    if (massStart >= 0) crown = massStart; // figure shorter than confirmRows
    else return { ok: false, reason: "no opaque mass found" };
  }

  // ---- pass B: head x-extent over the crown probe band ----
  const probeEnd = Math.min(bbox.y1, crown + Math.round(bbox.h * o.headProbe));
  let hx0 = Infinity, hx1 = -Infinity;
  for (let y = crown; y <= probeEnd; y++) {
    const r = rowRuns(px, y, bbox.x0, bbox.x1);
    if (r.widest && r.widest.w <= bbox.w * o.headLimit) {
      if (r.widest.first < hx0) hx0 = r.widest.first;
      if (r.widest.last > hx1) hx1 = r.widest.last;
    }
  }
  if (hx1 < hx1) { /* keep compiler quiet */ }
  if (hx0 === Infinity) { hx0 = bbox.x0; hx1 = bbox.x1; }
  const pad = Math.round((hx1 - hx0 + 1) * 0.12);
  const winX0 = Math.max(bbox.x0, hx0 - pad);
  const winX1 = Math.min(bbox.x1, hx1 + pad);

  // ---- pass C: walk down from crown measuring widest runs ----
  // The rules ARM only once the width has PLATEAUED (sinceMax >= ARM_ROWS
  // since runMax last grew) and the head is >= ARM_MIN_ROWS tall — a hair
  // crown ramping 5px->100px would otherwise read as a "jump".
  const headLimitAbs = bbox.w * o.headLimit;
  let chin = -1;
  let runMax = 0;
  let maxSeenAt = -1;
  let sinceMax = 0;
  let narrowRun = 0;
  let narrowStart = -1;
  const rows = [];
  for (let y = crown; y <= bbox.y1; y++) {
    const r = rowRuns(px, y, winX0, winX1);
    const w = r.widest ? r.widest.w : 0;
    const armed = rows.length >= o.armMinRows && sinceMax >= o.armRows;
    if (armed && r.count > 0) {
      // (c) shoulder scale backstop
      if (w > headLimitAbs) {
        let wide = 0;
        for (let k = 0; k < 5; k++) {
          const r2 = rowRuns(px, Math.min(y + k, bbox.y1), winX0, winX1);
          if (r2.widest && r2.widest.w > headLimitAbs) wide++;
        }
        if (wide >= 4) { chin = y - 1; break; }
      }
      // (a) sustained jump vs the running max (raised arms)
      if (runMax > 0 && w > runMax * o.jumpRatio) {
        let wide = 0;
        for (let k = 0; k < 5; k++) {
          const r2 = rowRuns(px, Math.min(y + k, bbox.y1), winX0, winX1);
          if (r2.widest && r2.widest.w > runMax * o.jumpRatio) wide++;
        }
        if (wide >= 4) { chin = y - 1; break; }
      }
      // (b) sustained taper (the neck)
      if (maxSeenAt >= 0 && y > maxSeenAt) {
        if (w < runMax * o.taperRatio) {
          if (narrowRun === 0) narrowStart = y;
          narrowRun++;
          if (narrowRun >= o.taperRows) { chin = narrowStart; break; }
        } else {
          narrowRun = 0;
        }
      }
    }
    rows.push({ y, w, c: r.widest ? r.widest.center : 0 });
    if (w > runMax) { runMax = w; maxSeenAt = y; sinceMax = 0; }
    else sinceMax++;
  }
  if (chin < 0) chin = bbox.y1; // whole figure narrow (bust, no shoulders)

  // ---- head metrics over crown..chin ----
  let headMaxW = 0;
  let cx = 0, n = 0;
  for (const r of rows) {
    if (r.y > chin) continue;
    if (r.w > headMaxW) headMaxW = r.w;
    cx += r.c;
    n++;
  }
  return {
    ok: true,
    crown,
    chin,
    headH: chin - crown + 1,
    headMaxW,
    headCx: n ? +(cx / n).toFixed(1) : (bbox.x0 + bbox.x1) / 2,
    headWin: [winX0, winX1],
    reason: "",
  };
}

module.exports = { pixels, rowRuns, alphaBBox, detectHead, MIN_OPACITY, DEFAULTS };
