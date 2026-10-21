// SportSignal — v13.159-bakedcast / v13.160-casttune: the hero player
// CAST-SHADOW baking pipeline.
//
// WHY THIS EXISTS (the three-round rectangle post-mortem, see
// SHADOW-CONSULTATION.md): every prior round built the projected shadow from
// LIVE CSS compositing primitives — filter+mask on a copy (v13.155/.156:
// mask-clip:border-box cropped the filtered paint to the img rectangle ->
// the owner's razor rectangle), a drop-shadow on the masked wrapper
// (v13.157: engine-fragile ancestor-filter compositing + the wrapper's own
// clip-path hard cuts -> "a black line and rectangle"), brightness(0)+blur
// on a masked copy with mask-clip:no-clip (v13.158: Chromium leaks the
// mask-extended fringe BELOW the hero onto the match list — 60k+ toggle-
// verified pixels at 1920x900 — while engines without no-clip razor-cut the
// fringe at the img box). The lesson: filter/mask/mask-clip/clip-path
// combinations are engine-divergent at their geometric edges. So v13.159
// removes every one of those primitives from the shadow layer: the cast is
// a PRE-BAKED IMAGE — the player's own portrait, blackened, gaussian-
// blurred and floor-faded IN PIXELS, padded so the blur fringe never
// reaches the file edge. The <img> that shows it carries NO filter, NO
// mask — only opacity + the lane-split translate(). Plain alpha pixels
// render identically in every engine; nothing can crop them into a
// rectangle, and they cannot paint outside their own file bounds.
//
// PIPELINE (per portrait, all in SOURCE pixels — the display scale is set
// by the CSS height rule, both scale together):
//   pad     left/right = max(12.5% H, 1.9 sigma) each — HEIGHT-based, so
//           the cast box width tracks the figure box uniformly across
//           poses (width-based pads made wide-pose files far wider than
//           their figure boxes, and the edge-anchored box growth
//           cancelled the away lane's translate — the crescent landed on
//           the WRONG side, caught by A/B band mapping in the v13.159 QA);
//           top = 8% H, bottom = 0
//           (the bottom fringe is handled by the fade below; the side pads
//           keep the blur fringe's visible extent (2 sigma) inside the file
//           so no engine ever sees a file-edge cut; the top pad is fully
//           feathered away)
//   blacken RGB -> 0, alpha preserved (the silhouette shape IS the shadow)
//   blur    gaussian sigma = 9% of H (v13.160-casttune, owner: "make the
//           shadow more visible and with more spread" — was 6.5%: the
//           penumbra grows ~40% wider at the 1920 hero; the side pads grow
//           with sigma automatically via the max() below)
//   fade    bottom: alpha 0 below 15% H, smoothstep to 1 at 26% H (mirrors
//           the figure's feet-fade mask ramp so the shadow melts at the
//           floor exactly with its source) | top: smoothstep 0->1 across
//           the whole top pad (the head fringe feathers out — no file-edge
//           cut, and a downward cast reads natural)
//   alpha   x 0.68 (v13.160-casttune: was 0.55 — the owner asked for a MORE
//           VISIBLE cast; 0.68 keeps it a ground shadow, not a black
//           duplicate; the light theme still scales it via the CSS opacity
//           token)
//   out     lossless webp with alpha, <slug>.cast.webp next to its source.
//
// Order mirrors the CSS it replaces: blacken+blur (was filter) -> fades
// (was mask) -> alpha scale (was opacity). Regenerate after any
// portraits:normalize run or hero rotation: `node scripts/make-hero-casts.js`
// (all 33 files are deterministic; sha256s are pinned in check-stats.js).

const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const DIR = path.join(__dirname, "..", "assets", "players", "hero");

const SIGMA_H = 0.09; // gaussian sigma as a fraction of source height (v13.160-casttune: was 0.065 — owner: "more spread")
const PAD_SIDE_H = 0.125; // side pad as a fraction of source HEIGHT (pose-uniform)
const PAD_SIDE_SIGMA = 1.9; // ...or 1.9 sigma, whichever is larger
const PAD_TOP_H = 0.08; // top pad as a fraction of source height
const FADE_LO_H = 0.15; // bottom fade: fully transparent below this
const FADE_HI_H = 0.26; // bottom fade: fully opaque above this
const ALPHA = 0.68; // master alpha weight baked into the pixels (v13.160-casttune: was 0.55 — owner: "more visible")

const smoothstep = (t) => {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
};

async function bakeCast(file) {
  const src = path.join(DIR, file);
  const meta = await sharp(src).metadata();
  if (!meta.hasAlpha) throw new Error(file + " has no alpha channel");
  const W = meta.width, H = meta.height;
  const sigma = Math.max(1, Math.round(SIGMA_H * H));
  const padSide = Math.round(Math.max(PAD_SIDE_H * H, PAD_SIDE_SIGMA * sigma));
  const padTop = Math.round(PAD_TOP_H * H);
  const PW = W + 2 * padSide, PH = H + padTop;

  // 1) place the raw RGBA on a transparent canvas (pads), RGB zeroed
  const raw = await sharp(src).ensureAlpha().raw().toBuffer();
  for (let i = 0; i < raw.length; i += 4) { raw[i] = 0; raw[i + 1] = 0; raw[i + 2] = 0; }
  const padded = await sharp({
    create: { width: PW, height: PH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: raw, raw: { width: W, height: H, channels: 4 }, left: padSide, top: padTop }])
    .raw()
    .toBuffer();

  // 2) gaussian blur (black RGB stays black; alpha blurs — the silhouette
  //    becomes the soft shadow shape)
  const blurred = await sharp(padded, { raw: { width: PW, height: PH, channels: 4 } })
    .blur(sigma)
    .raw()
    .toBuffer();

  // 3) spatial fades + master alpha, in one pass over the alpha channel
  const fadeLo = FADE_LO_H * H, fadeHi = FADE_HI_H * H; // measured from the SILHOUETTE bottom (= file bottom - 0 pad)
  for (let y = 0; y < PH; y++) {
    const fromBottom = PH - y; // distance up from the file bottom
    const bottomMask = smoothstep((fromBottom - fadeLo) / (fadeHi - fadeLo));
    const fromTop = y; // distance down from the file top (= the top pad zone)
    const topMask = smoothstep(fromTop / padTop);
    const m = bottomMask * topMask * ALPHA;
    if (m === 0) { for (let x = 0; x < PW; x++) blurred[y * PW * 4 + x * 4 + 3] = 0; continue; }
    for (let x = 0; x < PW; x++) {
      const a = y * PW * 4 + x * 4 + 3;
      blurred[a] = Math.round(blurred[a] * m);
    }
  }

  const out = file.replace(/\.webp$/, ".cast.webp");
  await sharp(blurred, { raw: { width: PW, height: PH, channels: 4 } })
    .webp({ lossless: true })
    .toFile(path.join(DIR, out));
  return { file, src: `${W}x${H}`, out: `${PW}x${PH}`, sigma, padSide, padTop };
}

(async () => {
  const files = fs.readdirSync(DIR).filter((f) => f.endsWith(".webp") && !f.endsWith(".cast.webp")).sort();
  if (!files.length) throw new Error("no source portraits found in " + DIR);
  let n = 0;
  for (const f of files) {
    const r = await bakeCast(f);
    n++;
    console.log(`${r.file} ${r.src} -> ${r.out} (sigma=${r.sigma}px, pads=${r.padSide}/${r.padSide}/${r.padTop}/0)`);
  }
  console.log(`\nbaked ${n} cast files into ${DIR}`);
})().catch((e) => { console.error(e); process.exit(1); });
