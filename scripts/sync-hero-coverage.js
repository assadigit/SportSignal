// scripts/sync-hero-coverage.js — regenerates src/hero-coverage.ts, the
// server-side mirror of the hero-portrait coverage (v13.129-herogaploop).
//
// WHY THIS EXISTS: the hero player-artwork layer renders CLIENT-side via the
// HERO_ART map inside the live public-*.js bundle (assets/hero/players/
// README.md §2), while the portrait LIBRARY (which clubs have a published
// 512×512 webp at all) is tracked by assets/players/uefa/hero-clubs.json —
// the uefa-player-portraits pipeline's output. The WORKER previously had
// zero portrait awareness, so a club appearing in fixtures without artwork
// was invisible to the server: nothing logged it, nothing could report it.
//
// This script folds both truths into one generated module the worker can
// import:
//   wired        FD team name → {src, fade, slug, player?, league?} — the
//                entries actually rendering on the site today (the bundle's
//                HERO_ART, the render truth)
//   library_only hero-clubs.json clubs whose portrait EXISTS but is not
//                wired into HERO_ART (a wiring/display decision, NOT a
//                scraping gap — README §4: prominence changes need an
//                explicit owner call)
//
// Determinism: output is sorted + stable so regeneration is diff-clean
// (check-hero-coverage.js fails npm test on drift, like check-version-sync).
//
// Usage: node scripts/sync-hero-coverage.js   (or: npm run heroes:sync)
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const PUBLIC_TS = path.join(ROOT, "src", "pages", "public.ts");
const HERO_CLUBS = path.join(ROOT, "assets", "players", "uefa", "hero-clubs.json");
const OUT = path.join(ROOT, "src", "hero-coverage.ts");

// The slug recipe — MUST stay byte-compatible with the roster's club_slug /
// hero-clubs.json keys (state_key derivation, INSTRUCTIONS §2) and with
// heroTeamSlug() in src/hero-gaps.ts (parity-tested by check-hero-coverage).
// "Brighton & Hove Albion FC" → brighton-hove-albion-fc,
// "Club Atlético de Madrid" → club-atletico-de-madrid,
// "FC Bayern München" → fc-bayern-munchen.
function slugify(name) {
  return String(name || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, "-");
}

// Which bundle is live: parse the <script src="/public-XX.YY.js"> reference
// out of the page template (survives version bumps; never guesses).
function liveBundleName() {
  const src = fs.readFileSync(PUBLIC_TS, "utf8");
  const m = src.match(/\/(public-\d+\.\d+\.js)/);
  if (!m) throw new Error("no /public-XX.YY.js reference found in src/pages/public.ts");
  return m[1];
}

// Extract the HERO_ART map from the (minified) bundle. Keys are JSON string
// literals (\uXXXX escapes included — unescape via JSON.parse); bodies carry
// src (always) and fade (optional tier).
function extractHeroArt(bundleSrc) {
  const i = bundleSrc.indexOf("var HERO_ART={");
  if (i < 0) throw new Error("HERO_ART not found in the live bundle");
  const j = bundleSrc.indexOf("\n};", i);
  if (j < 0) throw new Error("HERO_ART block end not found");
  const block = bundleSrc.slice(i, j);
  const out = [];
  const re = /"((?:[^"\\]|\\.)+)"\s*:\s*\{([^}]*)\}/g;
  let m;
  while ((m = re.exec(block))) {
    const name = JSON.parse('"' + m[1] + '"');
    const srcM = m[2].match(/src:\s*"([^"]+)"/);
    if (!srcM) continue; // defensive: an entry without src renders nothing
    const fadeM = m[2].match(/fade:\s*"([^"]+)"/);
    out.push({ name, src: srcM[1], fade: fadeM ? fadeM[1] : null });
  }
  return out;
}

function buildCoverage() {
  const bundle = liveBundleName();
  const bundleSrc = fs.readFileSync(path.join(ROOT, "assets", bundle), "utf8");
  const heroArt = extractHeroArt(bundleSrc);
  const lib = JSON.parse(fs.readFileSync(HERO_CLUBS, "utf8"));
  const libBySlug = new Map();
  for (const [slug, e] of Object.entries(lib.clubs || {})) {
    if (e && e.status === "complete" && e.portrait_url) {
      libBySlug.set(slug, e);
    }
  }

  const wiredSlugs = new Set();
  const wired = heroArt
    .map((e) => {
      const slug = slugify(e.name);
      wiredSlugs.add(slug);
      const l = libBySlug.get(slug) || null;
      return {
        name: e.name,
        src: e.src,
        fade: e.fade,
        slug,
        player: l ? l.player : null,
        league: l ? l.league : null,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const libraryOnly = Array.from(libBySlug.entries())
    .filter(([slug]) => !wiredSlugs.has(slug))
    .map(([slug, e]) => ({
      slug,
      club: e.club,
      player: e.player,
      src: e.portrait_url,
      league: e.league,
    }))
    .sort((a, b) => a.slug.localeCompare(b.slug));

  // sanity gates (fail loudly rather than publish a broken mirror)
  if (!wired.length) throw new Error("zero wired teams parsed — HERO_ART extraction broke");
  if (wired.length !== heroArt.length) throw new Error("wired count mismatch after slug pass");
  const dupSlugs = wired.map((w) => w.slug).filter((s, i, a) => a.indexOf(s) !== i);
  if (dupSlugs.length) throw new Error("duplicate wired slugs: " + dupSlugs.join(", "));

  return { bundle, wired, libraryOnly, libraryTotal: libBySlug.size };
}

const esc = (s) => JSON.stringify(s === null ? null : String(s));

function renderModule(cov) {
  const lines = [];
  lines.push("// GENERATED FILE — do not edit by hand.");
  lines.push("// Source of truth #1 (render): HERO_ART in assets/" + cov.bundle + " (the live");
  lines.push("//   client bundle — assets/hero/players/README.md is the contract).");
  lines.push("// Source of truth #2 (library): assets/players/uefa/hero-clubs.json");
  lines.push("//   (the uefa-player-portraits pipeline's club → MVP portrait map).");
  lines.push("// Regenerate: node scripts/sync-hero-coverage.js  (npm run heroes:sync)");
  lines.push("// Drift gate: scripts/check-hero-coverage.js (part of npm test).");
  lines.push("// v13.129-herogaploop: consumed by src/hero-gaps.ts — the runtime hero-gap");
  lines.push("//   detector (KV hero_gaps_v1) + the /api/hero-gaps admin report. The");
  lines.push("//   `wired` list is what the SITE renders; `library_only` clubs have a");
  lines.push("//   published portrait that is not displayed (wiring = owner decision).");
  lines.push("");
  lines.push("export const HERO_COVERAGE_RAW = {");
  lines.push('  generated_at: "' + new Date().toISOString() + '",');
  lines.push('  bundle: "' + cov.bundle + '",');
  lines.push("  wired: [");
  for (const w of cov.wired) {
    lines.push(
      "    { name: " + esc(w.name) + ", src: " + esc(w.src) + ", fade: " + esc(w.fade) +
      ", slug: " + esc(w.slug) + ", player: " + esc(w.player) + ", league: " + esc(w.league) + " },"
    );
  }
  lines.push("  ],");
  lines.push("  library_only: [");
  for (const l of cov.libraryOnly) {
    lines.push(
      "    { slug: " + esc(l.slug) + ", club: " + esc(l.club) + ", player: " + esc(l.player) +
      ", src: " + esc(l.src) + ", league: " + esc(l.league) + " },"
    );
  }
  lines.push("  ]");
  lines.push("};");
  lines.push("");
  return lines.join("\n");
}

function main() {
  const cov = buildCoverage();
  const prev = fs.existsSync(OUT) ? fs.readFileSync(OUT, "utf8") : "";
  const next = renderModule(cov);
  fs.writeFileSync(OUT, next);
  const norm = (s) => s.replace(/generated_at: "[^"]+"/, "");
  console.log("OK   sync-hero-coverage: " + cov.wired.length + " wired (bundle " + cov.bundle + "), " +
    cov.libraryOnly.length + " library-only, " + cov.libraryTotal + " library clubs total" +
    (prev && norm(prev) !== norm(next) ? " — CONTENT CHANGED" : ""));
}

if (require.main === module) main();

module.exports = { slugify, liveBundleName, extractHeroArt, buildCoverage, renderModule, OUT };
