// scripts/s10-fadescan.js — the v13.123-fadepill bottom-region luminance scan
// (S10 leg, v2 bright-quartile metric). Calibrated against the three
// documented precedents:
//   lamine-yamal  -> hi    (white shorts end ~89%; bright->dark step ~106@88%;
//                           our metric: bright-quartile 246 until ~91%, drop to
//                           ~31; step 140, brightEnd 93%)
//   veljko-simic  -> deep  (bright ends 69.5%; our metric: brightEnd 69%)
//   christoph-baumgartner -> default (uniform bright to bottom)
// Row metric = mean luma of the brightest 25% of opaque pixels (alpha>=128) —
// "bright content" luma, immune to dark-kit dilution (a striped/dark shirt's
// mean would hide its bright half). Tiers:
//   deep: brightEnd <= 72% (bright kit ends well above the box bottom)
//   hi:   bright->dark DROP >= 90 located in [80%,96%] of the box
//   default otherwise (uniform figures ship no fade field).
"use strict";
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const { subjectBBox } = require("./hero-canvas.js");

const ROOT = path.resolve(__dirname, "..");
const UEFA_DIR = path.join(ROOT, "assets", "players", "uefa");
const BUNDLE = path.join(ROOT, "assets", "public-13.71.js");
const BRIGHT_T = 150;
const STEP_HI = 90;
const DEEP_END = 72;

const slugify = (s) => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, "-");

function unwired() {
  const lib = JSON.parse(fs.readFileSync(path.join(UEFA_DIR, "hero-clubs.json"), "utf8")).clubs;
  const bundle = fs.readFileSync(BUNDLE, "utf8");
  const m = bundle.match(/var HERO_ART=\{[\s\S]*?\n\};/);
  const wiredSlugs = new Set([...m[0].matchAll(/"((?:[^"\\]|\\.)+)"\s*:\s*\{/g)].map((x) => slugify(JSON.parse('"' + x[1] + '"'))));
  const out = [];
  for (const [slug, c] of Object.entries(lib)) {
    if (wiredSlugs.has(slug)) continue;
    out.push({ slug, club: c.club, player: c.player, file: path.basename(c.portrait_url), style: c.style });
  }
  return out.sort((a, b) => a.slug.localeCompare(b.slug));
}

async function rowProfile(file) {
  const f = path.join(UEFA_DIR, file);
  const b = await subjectBBox(f);
  const { data, info } = await sharp(f).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width;
  const rows = [];
  for (let y = b.top; y <= b.bot; y++) {
    const px = [];
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      if (data[i + 3] >= 128) px.push(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    }
    if (px.length < 4) { rows.push(null); continue; }
    px.sort((a, c) => c - a);
    const q = Math.max(1, Math.ceil(px.length * 0.25));
    let s = 0; for (let i = 0; i < q; i++) s += px[i];
    rows.push(s / q);
  }
  return { rows, H: b.bot - b.top + 1 };
}

function metrics(rows, H) {
  const pct = (i) => Math.round((100 * (i + 1)) / H);
  let brightEnd = 0;
  for (let i = H - 1; i >= 0; i--) { if (rows[i] !== null && rows[i] >= BRIGHT_T) { brightEnd = pct(i); break; } }
  let maxDrop = 0, dropAt = 0;
  for (let i = Math.floor(H * 0.60); i < H - 1; i++) {
    if (rows[i] === null || rows[i + 1] === null) continue;
    const d = rows[i] - rows[i + 1]; // bright -> dark direction only
    if (d > maxDrop) { maxDrop = d; dropAt = pct(i); }
  }
  return { brightEnd, maxDrop: Math.round(maxDrop), dropAt };
}

function propose(r) {
  if (r.brightEnd > 0 && r.brightEnd <= DEEP_END) return "deep";
  if (r.maxDrop >= STEP_HI && r.dropAt >= 80 && r.dropAt <= 96 && r.brightEnd >= 80) return "hi";
  return "default";
}

(async () => {
  console.log("=== calibration (documented precedents) ===");
  for (const f of ["lamine-yamal", "veljko-simic", "christoph-baumgartner"]) {
    const { rows, H } = await rowProfile(f + ".webp");
    const r = metrics(rows, H);
    console.log(f.padEnd(24), "brightEnd=" + r.brightEnd + "%", "maxDrop=" + r.maxDrop + "@" + r.dropAt + "%", "=>", propose(r));
  }
  console.log("");
  const list = unwired();
  const rows = [];
  for (const u of list) {
    const { rows: prof, H } = await rowProfile(u.file);
    const r = metrics(prof, H);
    rows.push({ ...u, H, ...r, tier: propose(r), prof });
  }
  const flagged = rows.filter((r) => r.tier !== "default");
  console.log("scanned " + rows.length + "; flagged (non-default): " + flagged.length);
  for (const r of rows) {
    const mark = r.tier === "default" ? "   " : "->>";
    console.log(mark, r.file.replace(".webp", "").padEnd(48), "brightEnd=" + String(r.brightEnd).padStart(3) + "%", "maxDrop=" + String(r.maxDrop).padStart(3) + "@" + String(r.dropAt).padStart(2) + "%", "style=" + r.style.padEnd(12), "=>", r.tier);
  }
  console.log("");
  console.log("=== profiles of flagged candidates (bottom 45%, every 2.5%) ===");
  for (const r of flagged) {
    let line = "";
    for (let i = Math.floor(r.H * 0.55); i < r.H; i += Math.max(1, Math.floor(r.H * 0.025))) {
      line += Math.round((100 * (i + 1)) / r.H) + "%:" + (r.prof[i] === null ? "nul" : Math.round(r.prof[i])) + "  ";
    }
    console.log(r.file.replace(".webp", "") + " (" + r.tier + "):");
    console.log("   " + line);
  }
  fs.writeFileSync(path.join(ROOT, ".cache", "s10-fadescan.json"), JSON.stringify(rows.map(({ prof, ...rest }) => rest), null, 2));
  console.log("\nreport: .cache/s10-fadescan.json");
})().catch((e) => { console.error("FATAL", e); process.exit(1); });
