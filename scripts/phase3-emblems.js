#!/usr/bin/env node
// Phase 3 F-H1 — league emblem sourcing + normalization.
// Downloads the media.api-sports.io league PNGs the site references today
// (same art, now self-hosted) and normalizes every one to a 256×256 square
// transparent WebP canvas (contain fit) under assets/emblems/<code>.webp.
// Square intrinsic ratio = the square rendered slots (fixes F-M4).
const sharp = require("/home/z/.npm-global/lib/node_modules/sharp");
const fs = require("fs");
const path = require("path");

const CODES = {
  CL: 2, EL: 3, ECL: 848, PL: 39, PD: 140, SA: 135, FL1: 61, BL1: 78,
  AL: 188, FA_CUP: 45, EFL_CUP: 41, CDR: 143, COPPA_ITALIA: 137,
  DFB_POKAL: 81, PGL: 290, HAZFI_CUP: 719, WC: 1, EC: 4, COPA: 9,
  AFCON: 79, AFC: 77,
};

const OUT = path.join(__dirname, "..", "assets", "emblems");
fs.mkdirSync(OUT, { recursive: true });

async function dl(id) {
  const url = `https://media.api-sports.io/football/leagues/${id}.png`;
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120 Safari/537.36" } });
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

(async () => {
  for (const [code, id] of Object.entries(CODES)) {
    const dest = path.join(OUT, `${code.toLowerCase()}.webp`);
    try {
      const buf = await dl(id);
      const meta = await sharp(buf).metadata();
      // contain-fit onto a 256×256 transparent square canvas
      const out = await sharp(buf)
        .resize(256, 256, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .webp({ quality: 90, alphaQuality: 100, effort: 6 })
        .toBuffer();
      fs.writeFileSync(dest, out);
      console.log(`${code} (api id ${id}, ${meta.width}x${meta.height}) -> ${Math.round(out.length / 1024)}KB ${dest}`);
    } catch (e) {
      console.error(`FAIL ${code}: ${e.message}`);
      process.exitCode = 1;
    }
  }
})();
