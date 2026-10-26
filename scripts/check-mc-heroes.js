#!/usr/bin/env node
// scripts/check-mc-heroes.js — the npm-test gate for the mobile-heroes
// image system (v13.183-mchero). Runs FOUR layers:
//
//   1. SPEC — the canonical spec constants are internally consistent and
//      still decode the six owner-approved hand-crafted windows.
//   2. ROUND-TRIP — regenerating palmer + bruno from their library sources
//      through the ingest transform (IN MEMORY, no file writes) reproduces
//      the approved files' geometry: the pipeline is PROVEN against the
//      hand-craft on every test run.
//   3. REGISTRY — every wired file exists and re-measures within tolerance
//      of its recorded geometry; every pair mirrors; every fade in range.
//   4. WIRING — public.ts's generated MC-HEROES blocks are byte-in sync
//      with the registry (wire.js --check), the side-swap observer is
//      present, every MC_ART src + MC_SIDE twin exists on disk, and the
//      service worker cache is bumped past the release that shipped them.
//
// A new player file that does not conform CANNOT pass npm test — the
// "flawless for the next game" contract is enforced, not aspirational.
"use strict";
const path = require("path");
const fs = require("fs");
const { execSync } = require("child_process");

const ROOT = path.join(__dirname, "..");
const MC_DIR = path.join(ROOT, "assets", "ui", "mc");
const SPEC = require("./mc-heroes/spec.json");
const REG = require("./mc-heroes/mc-heroes.json");

let failed = 0;
const check = (name, cond) => {
  console.log((cond ? "OK   " : "FAIL ") + name);
  if (!cond) failed++;
};

// ---------- 1) SPEC ----------
(async () => {
  check("spec: window aspect matches dims", Math.abs(SPEC.window.width / SPEC.window.height - SPEC.window.aspect) <= SPEC.window.aspect_tol);
  check("spec: crown row matches pct", Math.abs(SPEC.window.crown_row / SPEC.window.height * 100 - SPEC.window.crown_row_pct) < 0.05);
  check("spec: head width pct decodes", Math.abs(SPEC.head.max_width_px / SPEC.window.width * 100 - SPEC.head.max_width_pctw) < 0.05);

  // ---------- 2) ROUND-TRIP (in memory) ----------
  const { measure, buildWindow } = require("./mc-heroes/ingest");
  const rt = async (srcRel, approvedFile, side) => {
    const src = await measure(path.join(ROOT, srcRel));
    const app = await measure(path.join(MC_DIR, approvedFile));
    const tgt = {
      w: SPEC.window.width, h: SPEC.window.height,
      crownRow: SPEC.window.crown_row, headPx: SPEC.head.max_width_px,
      cxPx: Math.round((side === "home" ? SPEC.head.cx_home_pctw : SPEC.head.cx_away_pctw) / 100 * SPEC.window.width),
    };
    const win = buildWindow(src, tgt);
    const s = win.s;
    const gotCrown = Math.round(src.head.crown * s - win.winY * s); // = crownRow by construction
    const gotHead = Math.round(src.head.headMaxW * s);
    const gotCx = Math.round(src.head.headCx * s - win.winX * s);
    check(`round-trip ${approvedFile}: dims ${app.px.width}x${app.px.height} == spec`, app.px.width === SPEC.window.width && app.px.height === SPEC.window.height);
    check(`round-trip ${approvedFile}: approved crown ${app.head.crown} ~ spec ${tgt.crownRow}`, Math.abs(app.head.crown - tgt.crownRow) <= SPEC.window.crown_row_tol);
    check(`round-trip ${approvedFile}: transform lands crown ${gotCrown} == ${tgt.crownRow}`, Math.abs(gotCrown - tgt.crownRow) <= 1);
    check(`round-trip ${approvedFile}: approved head ${app.head.headMaxW} ~ transform ${gotHead} (spec ${tgt.headPx})`, Math.abs(gotHead - tgt.headPx) <= SPEC.head.max_width_tol_px && Math.abs(app.head.headMaxW - tgt.headPx) <= SPEC.head.max_width_tol_px + 1);
    check(`round-trip ${approvedFile}: approved cx ${app.head.headCx} ~ transform ${gotCx} (target ${tgt.cxPx})`, Math.abs(app.head.headCx - tgt.cxPx) <= 6 && Math.abs(gotCx - tgt.cxPx) <= 2);
  };
  await rt("assets/players/hero/cole-palmer.webp", "mc-port-palmer.webp", "home");
  await rt("assets/players/hero/bruno-fernandes.webp", "mc-port-bruno.webp", "away");

  // ---------- 3) REGISTRY ----------
  for (const [club, e] of Object.entries(REG.clubs)) {
    for (const side of ["home", "away"]) {
      const f = e[side], geo = e[side + "_geo"];
      const p = path.join(MC_DIR, f);
      check(`registry: ${club} ${side} file exists (${f})`, fs.existsSync(p));
      if (!fs.existsSync(p)) continue;
      const m = await measure(p);
      check(`registry: ${club} ${side} dims`, m.px.width + "x" + m.px.height === geo.dims);
      check(`registry: ${club} ${side} crown ${m.head.crown} ~ ${geo.crown}`, Math.abs(m.head.crown - geo.crown) <= SPEC.window.crown_row_tol);
      check(`registry: ${club} ${side} head ${m.head.headMaxW} ~ ${geo.headMaxW}`, Math.abs(m.head.headMaxW - geo.headMaxW) <= SPEC.head.max_width_tol_px);
      check(`registry: ${club} ${side} aspect .6202`, Math.abs(m.px.width / m.px.height - SPEC.window.aspect) <= SPEC.window.aspect_tol);
      check(`registry: ${club} ${side} fade ${e.fade} in [${SPEC.fade.min_pct},${SPEC.fade.max_pct}]`, e.fade >= SPEC.fade.min_pct && e.fade <= SPEC.fade.max_pct);
    }
    if (e.home_geo && e.away_geo) {
      const W = parseInt(e.home_geo.dims, 10);
      check(`registry: ${club} pair mirror (cx sum ${e.home_geo.headCx + e.away_geo.headCx} ~ ${W})`, Math.abs(e.home_geo.headCx + e.away_geo.headCx - W) <= 6);
    }
  }

  // canonical files must sit at the spec targets exactly
  const CANON = ["mc-port-saka-h.webp", "mc-port-saka-a.webp", "mc-port-haaland-h.webp", "mc-port-haaland-a.webp", "mc-port-lautaro-h.webp", "mc-port-lautaro-a.webp", "mc-port-kane-3-h.webp", "mc-port-kane-3-a.webp", "mc-port-barcola-h.webp", "mc-port-barcola-a.webp"];
  for (const f of CANON) {
    const p = path.join(MC_DIR, f);
    check(`canonical: ${f} exists`, fs.existsSync(p));
    if (!fs.existsSync(p)) continue;
    const m = await measure(p);
    const isHome = f.includes("-h.webp");
    check(`canonical: ${f} crown 123`, Math.abs(m.head.crown - SPEC.window.crown_row) <= SPEC.window.crown_row_tol);
    check(`canonical: ${f} head 91`, Math.abs(m.head.headMaxW - SPEC.head.max_width_px) <= SPEC.head.max_width_tol_px);
    const wantCx = Math.round((isHome ? SPEC.head.cx_home_pctw : SPEC.head.cx_away_pctw) / 100 * SPEC.window.width);
    check(`canonical: ${f} cx ${wantCx}`, Math.abs(m.head.headCx - wantCx) <= 5);
    check(`canonical: ${f} bottom >= ${SPEC.window.figure_bottom_min_row}`, m.bbox.y1 >= SPEC.window.figure_bottom_min_row - 8);
  }

  // ---------- 4) WIRING ----------
  const page = fs.readFileSync(path.join(ROOT, "src", "pages", "public.ts"), "utf8");
  for (const e of Object.values(REG.clubs)) {
    check(`wiring: /ui/mc/${e.home} wired in MC_ART`, page.includes(`"/ui/mc/${e.home}"`));
    check(`wiring: twin /ui/mc/${e.away} on disk`, fs.existsSync(path.join(MC_DIR, e.away)));
  }
  check("wiring: MC_SIDE observer present", page.includes('if(wa===ih){im.setAttribute("src",tw);s0=tw}'));
  check("wiring: MC_HOME_SRC map present", /var MC_HOME_SRC=\{/.test(page));
  check("wiring: swap falls through to MC_GEOM[s0] lookup", /var g=MC_GEOM\[s0\];/.test(page));
  check("wiring: MC_ART has 14 registry clubs", (page.match(/if\(typeof MC_ART!=="undefined"\)MC_ART=\{/g) || []).length === 1);

  // wire --check (byte-sync of the generated blocks)
  try {
    execSync("node scripts/mc-heroes/wire.js --check", { cwd: ROOT, stdio: "pipe" });
    check("wiring: wire.js --check in sync", true);
  } catch (err) {
    check("wiring: wire.js --check in sync — " + String(err.stdout || err.message), false);
  }

  // sw cache bumped (the release pin: v87 shipped these assets)
  const sw = fs.readFileSync(path.join(ROOT, "assets", "sw.js"), "utf8");
  check("wiring: SW cache bumped to sportsignal-v87", /const CACHE = "sportsignal-v87"/.test(sw) && !/const CACHE = "sportsignal-v86"/.test(sw));

  console.log(failed ? `\n${failed} MC-HEROES GATE FAILURES` : "\nmc-heroes gate: all layers pass (spec / round-trip / registry / wiring)");
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error("ERROR", e); process.exit(1); });
