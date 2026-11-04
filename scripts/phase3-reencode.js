#!/usr/bin/env node
// Phase 3 F-H2/F-M7 — image re-encodes.
//   stadium-lights-hero.png (192KB) -> assets/ui/stadium-lights-2.webp (<=60KB)
//   sportsignal-pc-match-hud.png (122KB) -> assets/ui/sportsignal-pc-match-hud-2.webp (<=60KB)
//   bg.jpg (92KB) -> assets/bg-2.webp (<=40KB)
//   og/default.png (294KB) -> in-place palette re-encode (~100-120KB, 1d freshness)
// Also reports a quality metric (composited PSNR vs source where meaningful).
const sharp = require("/home/z/.npm-global/lib/node_modules/sharp");
const fs = require("fs");
const path = require("path");
const A = (p) => path.join(__dirname, "..", "assets", p);
const kb = (b) => Math.round((b.length || b) / 1024) + "KB";

async function psnr(a, b) {
  // composited over black, MSE over RGB
  const f1 = await sharp(a).flatten({ background: "#000" }).raw().toBuffer({ resolveWithObject: true });
  const f2 = await sharp(b).flatten({ background: "#000" }).raw().toBuffer({ resolveWithObject: true });
  if (f1.info.width !== f2.info.width || f1.info.height !== f2.info.height) return -1;
  let se = 0, n = 0;
  for (let i = 0; i < f1.data.length; i++) { se += (f1.data[i] - f2.data[i]) ** 2; n++; }
  const mse = se / n;
  return mse === 0 ? 99 : 10 * Math.log10(255 * 255 / mse);
}

(async () => {
  // 1. stadium lights — atmospheric glow overlay (screen-blended at .919 opacity):
  //    lossy webp q82 is visually safe; keep 1400x467.
  for (const q of [85, 82, 80, 78]) {
    const b = await sharp(A("stadium-lights-hero.png")).webp({ quality: q, alphaQuality: 100, effort: 6 }).toBuffer();
    console.log(`stadium q${q}: ${kb(b)}`);
    if (b.length <= 60 * 1024) { fs.writeFileSync(A("ui/stadium-lights-2.webp"), b); console.log(`  -> written ui/stadium-lights-2.webp q${q} ${kb(b)} (src ${kb(fs.statSync(A("stadium-lights-hero.png")).size)}) PSNR=${(await psnr(A("stadium-lights-hero.png"), A("ui/stadium-lights-2.webp"))).toFixed(1)}dB`); break; }
  }

  // 2. PC HUD frame — crisp cyan lines + glows on transparent. Higher q.
  for (const q of [92, 90, 88, 86, 84]) {
    const b = await sharp(A("ui/sportsignal-pc-match-hud.png")).webp({ quality: q, alphaQuality: 100, effort: 6 }).toBuffer();
    console.log(`hud q${q}: ${kb(b)}`);
    if (b.length <= 60 * 1024) { fs.writeFileSync(A("ui/sportsignal-pc-match-hud-2.webp"), b); console.log(`  -> written ui/sportsignal-pc-match-hud-2.webp q${q} ${kb(b)} (src ${kb(fs.statSync(A("ui/sportsignal-pc-match-hud.png")).size)}) PSNR=${(await psnr(A("ui/sportsignal-pc-match-hud.png"), A("ui/sportsignal-pc-match-hud-2.webp"))).toFixed(1)}dB`); break; }
  }

  // 3. bg.jpg — photographic page background, 1200x681. q sweep to <=40KB.
  for (const q of [80, 78, 76, 74, 72]) {
    const b = await sharp(A("bg.jpg")).webp({ quality: q, effort: 6 }).toBuffer();
    console.log(`bg q${q}: ${kb(b)}`);
    if (b.length <= 40 * 1024) { fs.writeFileSync(A("bg-2.webp"), b); console.log(`  -> written bg-2.webp q${q} ${kb(b)} (src ${kb(fs.statSync(A("bg.jpg")).size)}) PSNR=${(await psnr(A("bg.jpg"), A("bg-2.webp"))).toFixed(1)}dB`); break; }
  }

  // 4. og/default.png — social share card, in-place (1-day cache rule).
  for (const q of [90, 85, 80, 75]) {
    const b = await sharp(A("og/default.png")).png({ palette: true, quality: q, effort: 10, colours: 256 }).toBuffer();
    console.log(`og palette q${q}: ${kb(b)}`);
    if (b.length <= 120 * 1024) { fs.writeFileSync(A("og/default.png"), b); console.log(`  -> REWRITTEN og/default.png palette q${q} ${kb(b)} (src was 294KB) PSNR=${(await psnr(A("og/default.png"), A("og/default.png"))).toFixed(1)}`); break; }
  }
})();
