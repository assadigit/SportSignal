// scripts/s10-herowire-build.js — the S10 HERO-WIRING asset leg (v13.226).
// Builds the render-library canvases + cast shadows for the 76 published
// big-5 portraits the owner approved for wiring (the S9 WIRE decision):
//   1. the 76 unwired library clubs (hero-clubs.json minus the wired set,
//      same slug derivation as sync-hero-coverage.js)
//   2. per club: alpha-trim the uefa original into /players/hero/<slug>.webp
//      (the v13.131 rule — bbox thr 8 + 2px pad, lossless webp; the standard
//      464px subject box, width tracks the pose)
//   3. bake ALL cast files via make-hero-casts.js (deterministic) — the 35
//      pre-existing .cast.webp must stay BYTE-IDENTICAL (md5 before/after,
//      the v13.162 precedent); only the 76 new casts may land.
// Idempotent: re-running overwrites with identical bytes (deterministic trim
// + deterministic bake). NO network, NO UEFA re-probing (kit-timing was
// verified at publish time — S10 instruction).
"use strict";
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { trimToHeroCanvas } = require("./hero-canvas.js");
const { bakeCast, DIR } = require("./make-hero-casts.js");

const ROOT = path.resolve(__dirname, "..");
const HERO_CLUBS = path.join(ROOT, "assets", "players", "uefa", "hero-clubs.json");
const UEFA_DIR = path.join(ROOT, "assets", "players", "uefa");
const BUNDLE = path.join(ROOT, "assets", "public-13.71.js");

const slugify = (s) => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, "-");
const md5 = (f) => crypto.createHash("md5").update(fs.readFileSync(f)).digest("hex");

function unwiredList() {
  const lib = JSON.parse(fs.readFileSync(HERO_CLUBS, "utf8")).clubs || {};
  const bundle = fs.readFileSync(BUNDLE, "utf8");
  const m = bundle.match(/var HERO_ART=\{[\s\S]*?\n\};/);
  if (!m) throw new Error("HERO_ART block not found in public-13.71.js");
  const wiredSlugs = new Set([...m[0].matchAll(/"((?:[^"\\]|\\.)+)"\s*:\s*\{/g)].map((x) => slugify(JSON.parse('"' + x[1] + '"'))));
  const out = [];
  for (const [slug, c] of Object.entries(lib)) {
    if (wiredSlugs.has(slug)) continue;
    if (!c || c.status !== "complete" || !c.portrait_url) continue;
    // canvas filename = the PLAYER slug (basename of portrait_url) — the
    // collection invariant: filenames derive from player names, never club
    // names (the v13.162 precedent: joao-pedro-junqueira-de-jesus.webp).
    out.push({ slug, club: c.club, player: c.player, league: c.league, uefaFile: path.join(UEFA_DIR, path.basename(c.portrait_url)), file: path.basename(c.portrait_url), style: c.style });
  }
  // collision gates: no internal duplicate player files, no clash with the
  // existing render-library canvases
  const files = out.map((o) => o.file);
  const dup = files.filter((f, i) => files.indexOf(f) !== i);
  if (dup.length) throw new Error("duplicate player filenames among the unwired: " + dup.join(", "));
  const existing = fs.readdirSync(DIR).filter((f) => f.endsWith(".webp") && !f.endsWith(".cast.webp"));
  const clash = files.filter((f) => existing.includes(f));
  if (clash.length) throw new Error("player filename already in the render library: " + clash.join(", "));
  out.sort((a, b) => a.slug.localeCompare(b.slug));
  return out;
}

(async () => {
  const list = unwiredList();
  console.log("S10 build: " + list.length + " unwired library clubs");
  // pre-flight: every uefa original exists + is 512x512 lossless-alpha webp
  const sharp = require("sharp");
  for (const u of list) {
    if (!fs.existsSync(u.uefaFile)) throw new Error("missing original: " + u.uefaFile);
    const meta = await sharp(u.uefaFile).metadata();
    if (meta.width !== 512 || meta.height !== 512 || !meta.hasAlpha) {
      throw new Error(u.uefaFile + ": unexpected geometry " + meta.width + "x" + meta.height + " alpha=" + meta.hasAlpha);
    }
  }
  console.log("pre-flight OK: all originals present, 512x512, alpha");

  // 1) the trimmed canvases (PLAYER-slug filenames)
  const dims = [];
  for (const u of list) {
    const dst = path.join(DIR, u.file);
    const r = await trimToHeroCanvas(u.uefaFile, dst);
    dims.push({ ...u, ...r });
  }
  const heights = {}, widths = [];
  for (const d of dims) { heights[d.height] = (heights[d.height] || 0) + 1; widths.push(d.width); }
  console.log("canvases: " + dims.length + " written; height distribution " + JSON.stringify(heights) +
    "; width range " + Math.min(...widths) + ".." + Math.max(...widths));

  // determinism spot-check (re-trim 3 files, expect identical md5)
  for (const u of [list[0], list[Math.floor(list.length / 2)], list[list.length - 1]]) {
    const dst = path.join(DIR, u.file);
    const before = md5(dst);
    await trimToHeroCanvas(u.uefaFile, dst);
    if (md5(dst) !== before) throw new Error("non-deterministic trim: " + u.file);
  }
  console.log("determinism spot-check OK (3 files re-trimmed byte-identical)");

  // 2) the casts — md5 the pre-existing ones, bake all, verify byte-identity
  const pre = {};
  for (const f of fs.readdirSync(DIR).filter((f) => f.endsWith(".cast.webp"))) pre[f] = md5(path.join(DIR, f));
  const preCount = Object.keys(pre).length;
  let baked = 0;
  for (const u of list) { await bakeCast(u.file); baked++; }
  let changed = [];
  for (const [f, h] of Object.entries(pre)) {
    if (md5(path.join(DIR, f)) !== h) changed.push(f);
  }
  const nowCount = fs.readdirSync(DIR).filter((f) => f.endsWith(".cast.webp")).length;
  console.log("casts: " + baked + " baked; pre-existing " + preCount + " -> now " + nowCount +
    "; pre-existing BYTE-IDENTICAL: " + (changed.length === 0 ? "YES (all " + preCount + ")" : "NO — " + changed.join(", ")));
  if (changed.length) throw new Error("cast bake was not byte-stable for existing files: " + changed.join(", "));

  // 3) the inventory table (session-note evidence)
  console.log("");
  console.log("slug | club | player | league | style | canvas");
  for (const d of dims) console.log(d.slug + " | " + d.club + " | " + d.player + " | " + d.league + " | " + d.style + " | " + d.width + "x" + d.height);
  fs.writeFileSync(path.join(ROOT, ".cache", "s10-build-report.json"), JSON.stringify({ built: dims.map(({ slug, club, player, league, style, width, height }) => ({ slug, club, player, league, style, width, height })) }, null, 2));
  console.log("");
  console.log("report: .cache/s10-build-report.json");
})().catch((e) => { console.error("FATAL", e); process.exit(1); });
