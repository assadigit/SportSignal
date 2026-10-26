#!/usr/bin/env node
// scripts/mc-heroes/cardmock.js — render a featured-match card mock for any
// registry pair, at the REAL css geometry (52cqw width, -3.72cqw top, 2cqw
// outer insets, the two-axis mask-composite fade), over the live scene-4
// background + a translucent HUD panel. The output is a PNG for visual /
// VLM review — the "do the two players match?" check that caught the Bruno
// bug, now reproducible for ANY pair before it ships.
//
//   node scripts/mc-heroes/cardmock.js --pair "Chelsea FC","Manchester United FC" --out cardmock.png
//   node scripts/mc-heroes/cardmock.js --all   (one mock per adjacent pair + the live fixture)
"use strict";
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const MC_DIR = path.join(__dirname, "..", "..", "assets", "ui", "mc");
const REG = require("./mc-heroes.json");

// card constants (the .hero-mcard css: 9:16, cqw = cardwidth/100)
const CW = 720, CH = 1280; // 9:16
const CQW = CW / 100;

function svgMask(w, h, stops, dir) {
  // stops: [[offsetPct, opacity], ...] — rendered as black-with-opacity
  const s = stops.map(([o, op]) => `<stop offset="${o}%" stop-color="#000" stop-opacity="${op}"/>`).join("");
  const grad = dir === "v"
    ? `<linearGradient id="g" x1="0" y1="0" x2="0" y2="1">${s}</linearGradient>`
    : `<linearGradient id="g" x1="0" y1="0" x2="1" y2="0">${s}</linearGradient>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><defs>${grad}</defs><rect width="${w}" height="${h}" fill="url(#g)"/></svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

/** Apply the v13.180 two-axis mask (vertical fade x side fade, intersect). */
async function applyMask(imgBuf, w, h, fadePct, side /* "home"|"away" */) {
  // vertical: opaque 0 -> fadePct, transparent 100%
  const vMask = await svgMask(w, h, [[0, 1], [fadePct, 1], [100, 0]], "v");
  // side: home = 90deg (left edge 0-14% in, opaque 14-75%, inner 75-98% out)
  const sideStops = side === "home"
    ? [[0, 0], [14, 1], [75, 1], [98, 0], [100, 0]]
    : [[0, 0], [2, 0], [25, 1], [86, 1], [100, 0]]; // mirrored for away
  const sMask = await svgMask(w, h, sideStops, "h");
  let out = await sharp(imgBuf).composite([{ input: vMask, blend: "dest-in" }]).png().toBuffer();
  out = await sharp(out).composite([{ input: sMask, blend: "dest-in" }]).png().toBuffer();
  return out;
}

async function renderPair(homeClub, awayClub, outFile) {
  const H = REG.clubs[homeClub], A = REG.clubs[awayClub];
  if (!H || !A) throw new Error("club not in registry: " + (!H ? homeClub : awayClub));

  // background: dark navy + the live scene-4 across the top 43%
  const base = await sharp({
    create: { width: CW, height: CH, channels: 4, background: { r: 3, g: 15, b: 44, alpha: 1 } },
  }).png().toBuffer();
  const scene = await sharp(path.join(MC_DIR, "scene-4.webp"))
    .resize(CW, Math.round(CH * 0.43), { fit: "fill" })
    .composite([{ input: await svgMask(CW, Math.round(CH * 0.43), [[0, 0.92], [85, 0.92], [100, 0]], "v"), blend: "dest-in" }])
    .png().toBuffer();

  const layers = [{ input: scene, top: 0, left: 0 }];

  // the ports: img width 52cqw, top -3.72cqw, aspect .62
  const imgW = Math.round(52 * CQW);
  const imgH = Math.round(imgW / 0.6202);
  const topY = Math.round(-3.72 * CQW);

  for (const [side, club, entry, key] of [["home", homeClub, H, "home"], ["away", awayClub, A, "away"]]) {
    const file = entry[key];
    const fade = entry.fade;
    let img = await sharp(path.join(MC_DIR, file)).resize(imgW, imgH, { fit: "fill" }).png().toBuffer();
    img = await applyMask(img, imgW, imgH, fade, side);
    const left = side === "home" ? Math.round(2 * CQW) : CW - Math.round(2 * CQW) - imgW;
    layers.push({ input: img, top: topY, left });
  }

  // the HUD panel: translucent fill from 42.7%H + a top border line
  const panelTop = Math.round(CH * 0.427);
  const panelSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${CW}" height="${CH - panelTop}">
    <rect x="60" y="24" width="${CW - 120}" height="${CH - panelTop - 24}" fill="#06183A" fill-opacity="0.88" rx="10"/>
    <rect x="60" y="24" width="${CW - 120}" height="3" fill="#17CDF0" fill-opacity="0.85"/>
  </svg>`;
  layers.push({ input: await sharp(Buffer.from(panelSvg)).png().toBuffer(), top: panelTop, left: 0 });

  // labels
  const label = `<svg xmlns="http://www.w3.org/2000/svg" width="${CW}" height="60">
    <text x="${CW / 2}" y="38" text-anchor="middle" font-family="sans-serif" font-size="26" font-weight="700" fill="#9FC6E8">${homeClub}  vs  ${awayClub}</text>
  </svg>`;
  layers.push({ input: await sharp(Buffer.from(label)).png().toBuffer(), top: CH - 60, left: 0 });

  await sharp(base).composite(layers).png().toFile(outFile);
  console.log("MOCK  " + outFile);
}

async function main() {
  const argv = process.argv.slice(2);
  const outDir = argv.includes("--all") ? "/home/z/my-project/download" : path.join(__dirname, "..", "..");
  const mk = (n) => path.join(outDir, n);
  if (argv.includes("--all")) {
    const pairs = [
      ["Chelsea FC", "Manchester United FC"],   // the live fixture
      ["Arsenal FC", "Manchester City FC"],      // new canonical pair
      ["FC Internazionale Milano", "Arsenal FC"],// new + legacy-scale mixing
      ["FC Barcelona", "Real Madrid CF"],        // El Clasico (legacy pair)
      ["FC Bayern München", "Chelsea FC"],       // legacy + canonical mix
    ];
    let i = 0;
    for (const [h, a] of pairs) await renderPair(h, a, mk("cardmock-" + ++i + ".png"));
  } else {
    const i = argv.indexOf("--pair");
    const pair = i >= 0 ? argv[i + 1].split(",").map((s) => s.trim()) : ["Chelsea FC", "Manchester United FC"];
    const o = argv.indexOf("--out");
    await renderPair(pair[0], pair[1], o >= 0 ? argv[o + 1] : mk("cardmock.png"));
  }
}
main().catch((e) => { console.error("ERROR", e.message); process.exit(1); });
