#!/usr/bin/env node
// scripts/mc-heroes/wire.js — v13.197-mcdesktop: the runtime wiring for the
// mobile-heroes cutouts is RETIRED. The owner's round: "use the desktop
// player images on mobile too, and fit them with CSS only" — putPort in the
// public-13.6x.js bundle now serves the heroArtFor() HERO_ART desktop
// library for BOTH cards, and the ONE shared .mc-port img rule in the page's
// inline style fits every source. The /ui/mc cutout files, the registry
// (mc-heroes.json) and the whole pipeline (measure/ingest/registry/mock)
// STAY — the files are never deleted (immutable-pin rule) and the spec /
// round-trip / registry layers of scripts/check-mc-heroes.js keep proving
// them on every npm test. Only the RUNTIME wiring is gone:
//
//   BEFORE v13.197: this script generated the MC_ART / MC_GEOM / MC_SIDE /
//   MC_HOME_SRC maps + the side-aware mcFitScan into src/pages/public.ts.
//   AFTER v13.197: it enforces the RETIRED state instead:
//     node scripts/mc-heroes/wire.js           (idempotent — no-op when retired)
//     node scripts/mc-heroes/wire.js --check   verify the retirement (exit 1 on drift)
//
// The retirement contract it verifies in src/pages/public.ts:
//   - NO MC_ART re-assignment, NO MC_GEOM / MC_SIDE / MC_HOME_SRC maps,
//     NO MC-HEROES:AUTO generated block, NO side-aware scan head
//   - mcFitScan is the .mc-clean scene toggle ONLY (the v13.180 contract:
//     any port carrying an <img> swaps the scene to the hole-free scene-4)
//   - the per-port MutationObserver + the initial scan call are kept
"use strict";
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "..");
const PAGE = path.join(ROOT, "src", "pages", "public.ts");

// the retired runtime shape (the v13.197 scan that replaced the classifier)
const RETIRED_SCAN =
  "var mcFitScan=function(){\n" +
  'var mc=document.getElementById("heroMCard");\n' +
  'if(mc){if(mc.querySelectorAll(".mc-ports .mc-port img").length>0)mc.classList.add("mc-clean");else mc.classList.remove("mc-clean")}\n' +
  "};\n";

function problems(src) {
  const p = [];
  if (/if\(typeof MC_ART!=="undefined"\)MC_ART=\{/.test(src)) p.push("MC_ART re-assignment still present");
  if (/var MC_GEOM=\{/.test(src)) p.push("MC_GEOM map still present");
  if (/var MC_SIDE=\{/.test(src)) p.push("MC_SIDE map still present");
  if (/var MC_HOME_SRC=\{/.test(src)) p.push("MC_HOME_SRC map still present");
  if (/\/\*MC-HEROES:AUTO-START /.test(src)) p.push("generated AUTO block still present");
  if (/\/\*MC-HEROES:SCAN-START /.test(src)) p.push("generated SCAN marker still present");
  if (/tw=MC_SIDE\[s0\]/.test(src)) p.push("side-aware swap still present");
  if (/classList\.add\("mc-pre"\)/.test(src)) p.push(".mc-pre classifier still present");
  if (/classList\.add\("mc-fit-w"\)/.test(src)) p.push(".mc-fit-w classifier still present");
  if (!src.includes(RETIRED_SCAN)) p.push("the retired .mc-clean-only mcFitScan not found");
  if (!/new MutationObserver\(mcFitScan\)\.observe\(p,\{childList:true\}\);/.test(src)) p.push("per-port MutationObserver missing");
  if (!/\nmcFitScan\(\);\n/.test(src)) p.push("initial mcFitScan() call missing");
  return p;
}

function main() {
  const check = process.argv.includes("--check");
  const src = fs.readFileSync(PAGE, "utf8");
  const p = problems(src);
  if (p.length) {
    console.error((check ? "FAIL wire --check (retired state): " : "FAIL wire (retired state): ") + p.join("; ") +
      " — the v13.197-mcdesktop retirement is described in CHANGELOG.md; the runtime must not regress to the mobile-cutout wiring");
    process.exit(1);
  }
  console.log("OK   wire " + (check ? "--check: " : "") + "the v13.197-mcdesktop retirement holds (no MC_ART/MC_GEOM/MC_SIDE/MC_HOME_SRC wiring; mcFitScan = the .mc-clean scene toggle only)");
}

main();
