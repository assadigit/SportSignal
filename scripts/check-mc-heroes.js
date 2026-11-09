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
//   4) RETIREMENT (v13.197-mcdesktop) — the RUNTIME wiring for the cutouts
//      is retired from public.ts (no MC_ART/MC_GEOM/MC_SIDE/MC_HOME_SRC,
//      no side-aware scan; mcFitScan is the .mc-clean scene toggle only —
//      wire.js --check enforces it), every registry file still exists on
//      disk (the immutable-pin rule: nothing is deleted), the LIVE bundle
//      (public-13.63.js since v13.199-mcspace) serves the heroArtFor() desktop library on BOTH
//      cards, the ONE shared .mc-port img CSS rule fits every source, and
//      the service worker cache is bumped past the release that retired
//      the wiring.
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
  const CANON = ["mc-port-saka-h.webp", "mc-port-saka-a.webp", "mc-port-haaland-h.webp", "mc-port-haaland-a.webp", "mc-port-lautaro-h.webp", "mc-port-lautaro-a.webp", "mc-port-kane-3-h.webp", "mc-port-kane-3-a.webp", "mc-port-barcola-h.webp", "mc-port-barcola-a.webp", "mc-port-guirassy-2-h.webp", "mc-port-guirassy-2-a.webp"];
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

  // ---------- 4) RETIREMENT (v13.197-mcdesktop) ----------
  const page = fs.readFileSync(path.join(ROOT, "src", "pages", "public.ts"), "utf8");
  const liveBundle = fs.readFileSync(path.join(ROOT, "assets", "public-13.75.js"), "utf8"); // v13.248-rankchip: the read follows the 13.74 -> 13.75 rename (the S37 team rank-chip round; the MC_CREST/MC_WL contracts ride unchanged); was 13.74 since v13.226.1-herowirefix: the read follows the 13.72 -> 13.73 rename (the elision hotfix); was 13.72 since v13.226-herowire (SS-27): the read follows the 13.70 -> 13.71 rename // v13.204-foldsplit (F-M2, the verified re-apply): the read follows the 13.67 -> 13.68 rename — the fold-split bundle returns byte-identical to the v13.202 13.66.js (the v13.203 revert was based on lab runs contaminated by sandbox CPU contention; the putPort/carWarm contracts this gate pins are untouched across all three releases); was 13.67 since v13.203-warmdefer (the revert); was 13.66 since v13.202-threaddiet (the fold-split); was 13.65 since v13.201-carstack (the ghost car-in strip); was 13.64 since v13.200-carsmooth (the cross-slide choreography); was 13.63 since v13.199-mcspace: the read follows the 13.62 -> 13.63 rename (the FA kickoff faNum edit)
  for (const e of Object.values(REG.clubs)) {
    check(`retirement: ${e.home} file stays on disk (${e.home})`, fs.existsSync(path.join(MC_DIR, e.home)));
    check(`retirement: twin ${e.away} stays on disk`, fs.existsSync(path.join(MC_DIR, e.away)));
  }
  check("retirement: NO MC_ART re-assignment in public.ts (the mobile-cutout priority is gone — the desktop library serves both cards)", !/if\(typeof MC_ART!=="undefined"\)MC_ART=\{/.test(page));
  check("retirement: NO MC_GEOM / MC_SIDE / MC_HOME_SRC maps in public.ts", !/var MC_GEOM=\{/.test(page) && !/var MC_SIDE=\{/.test(page) && !/var MC_HOME_SRC=\{/.test(page));
  check("retirement: the side-aware swap is gone", !page.includes('if(wa===ih){im.setAttribute("src",tw);s0=tw}'));
  check("retirement: the .mc-pre / .mc-fit-w classifiers are gone", !/classList\.add\("mc-pre"\)/.test(page) && !/classList\.add\("mc-fit-w"\)/.test(page));
  check("retirement: the ONE shared .mc-port img rule fits every desktop source (contain + per-side OUTER alignment + NO fade; v13.238-mchedge rescale: the 116cqw concept-mockup height, the two-axis mask retired — the hands near the centre stay fully opaque)", page.includes('.hero-mcard .mc-ports .mc-port img{position:absolute;bottom:0;left:0;right:0;width:100%;height:116cqw;object-fit:contain;object-position:center bottom}') && page.includes('.hero-mcard .mc-ports .mc-port.mc-port-h img{object-position:left bottom}') && page.includes('.hero-mcard .mc-ports .mc-port.mc-port-a img{object-position:right bottom}') && !page.includes('--mc-fade:') && !page.includes('--mc-side:'));
  check("retirement: putPort in the LIVE bundle serves the heroArtFor() desktop library (no MC_ART read)", liveBundle.includes("var art=heroArtFor(sd);if(art&&art.src)") && !/var own=MC_ART\[/.test(liveBundle) && !/var MC_ART=\{/.test(liveBundle));
  check("retirement: carWarm warms the library portrait + cast only (no MC_ART/MC_SIDE busts)", !liveBundle.includes("MC_SIDE[own.src]") && liveBundle.includes('var lib=heroArtFor(sd);if(lib&&lib.src)'));

  // wire --check (the retirement state, enforced)
  try {
    execSync("node scripts/mc-heroes/wire.js --check", { cwd: ROOT, stdio: "pipe" });
    check("retirement: wire.js --check holds", true);
  } catch (err) {
    check("retirement: wire.js --check holds — " + String(err.stdout || err.message), false);
  }

  const sw = fs.readFileSync(path.join(ROOT, "assets", "sw.js"), "utf8");
    check("retirement: SW cache bumped to sportsignal-v121 (v13.248-rankchip — the S37 rank-chip round: public-13.74.js -> 13.75.js + public-13.81.css -> 13.82.css; the mc map is unchanged, the registry byte-stable; was v120 at v13.242-faglow — the S31 bundle rename round: public-13.73.js -> 13.74.js + the served-HTML mobile round; the mc map is unchanged, the registry byte-stable; was v119 — v13.229-teamladder — the S13 team-title ladder round: the routine served-HTML evict — the per-team <title> template gains the SS-10 >65 trim rung (exactly one team rides it: بروسیا مونشن‌گلادباخ, 66→61); no /ui/mc asset, no bundle, no mc map change, the registry byte-stable; was v118 — v13.228-farsibrand — the S12 Farsi-brand round: the routine served-HTML evict — the SEO titles/descriptions render the brand in Farsi («اسپرت سیگنال») + the match titles’ leading ⚽; no /ui/mc asset, no bundle, no mc map change, the registry byte-stable; was v117 — v13.227-rumzone — the S11 RUM-zone round: the routine served-HTML evict for the CF Web-Analytics beacon send.to zone override; no /ui/mc asset, no bundle, no mc map change, the registry byte-stable; was v116 — v13.226.1-herowirefix — the elision-hotfix rename round: public-13.72.js -> 13.73.js; the mc map is unchanged, the registry byte-stable; was v115 — v13.226-herowire — the S10 hero-wiring round: public-13.71.js -> 13.72.js, HERO_ART 35 -> 111; the mc map is unchanged, the registry byte-stable; was v114 — v13.225-socialsec \u2014 the SS-26 social-wiring + security-mailto round: every page footer gains the social line (the X profile + the Telegram bot) + the head gains twitter:site \u2014 a served-HTML edit, no /ui/mc asset, no bundle, no mc map change, the registry byte-stable; the routine evict so SWR/offline-fallback copies of \"/\" with the old footer leave the cache; was v113 \u2014 v13.224-herolcp \u2014 the SS-20 mobile-LCP priority round: the homepage head gains the mobile-scoped fetchpriority=high preload of /hero-poster.jpg + the img.bg-photo element hint \u2014 a served-HTML edit, no /ui/mc asset, no bundle, no mc map change, the registry byte-stable; the routine evict so SWR/offline-fallback copies of \"/\" with the old unhinted markup leave the cache; was v112 \u2014 v13.212-shamsifirst \u2014 the SS-27 CALENDAR_DISPLAY_v2 round: the public-13.70.js -> 13.71.js bundle rename (the date renderers go Shamsi-first + Gregorian parens); the mc map is unchanged, the registry byte-stable; was v111 \u2014 v13.210-namefix \u2014 the Phase 6 close-out: the public-13.69.js -> 13.70.js bundle rename (the mobile hero curated label retires); the mc map is unchanged, the registry byte-stable; was v110 \u2014 v13.209-a11y \u2014 the Phase 6 a11y round: the public-13.68.js -> 13.69.js bundle rename (the hero accessible names) + the public-13.80.css -> 13.81.css stylesheet rename (F-M3 color-dimming + F-M6 touch targets); the mc map is unchanged, the registry byte-stable; was v109 \u2014 v13.206-scenediet — the Phase 3 close-out: the /ui/mc/scene-4.webp -> scene-4-2.webp q90 re-encode, 264KB effectively-lossless -> 44KB; the mc map is unchanged, the registry byte-stable; was v108 — v13.205-lcpreveal — the Phase 3 assets round: the 13.79.css -> 13.80.css rename + the hero-art re-encodes + the /emblems/* pack; was v107 — v13.204-foldsplit — the F-M2 verified re-apply: the public-13.67.js -> 13.68.js rename — the fold-split bundle returns byte-identical to the v13.202 13.66.js after the v13.203 revert was shown contaminated by sandbox CPU contention; the mc map is unchanged, the registry byte-stable; was v106 — v13.203-warmdefer — the revert release: the public-13.66.js -> 13.67.js rename; was v105 — v13.202-threaddiet — the experiment release: the public-13.65.js -> 13.66.js + public-13.78.css -> 13.79.css renames — the fold-split render chain, the idle initTz, the load-event carWarm; was v104 — v13.201-carstack — the owner's stacking round: the public-13.64.js -> 13.65.js + public-13.77.css -> 13.78.css renames — carGhost strips the carried .car-in from every ghost clone; #heroSpot/#mcardSpot + .car-ghost-spot gain the explicit z-index:5 (the blank-HUD + low-opacity-league-logo fix); the mc map is unchanged, the registry byte-stable; v103 — v13.200-carsmooth — the owner's smoothness round (the cross-slide choreography — the ghost exit, the staggered springy enter, the sheen); v102 — v13.199-mcspace — the header-space round: the public-13.62.js -> 13.63.js rename (the renderMCard FA-kickoff faNum edit) + the inline-style margin/lockup/time overrides; the /ui/mc files, the registry and the pipeline are unchanged on disk — this gate re-proves the retirement + the file set; v101 — v13.198-mcsize — the too-small-too-faded round: routine evict for the inline-style rescale of the ONE shared .mc-port img rule — no asset renames; v100 — v13.197-mcdesktop — the one-image-set round: routine evict for the public-13.61.js→13.62.js rename; v99 — v13.196-carlive final cut: routine evict for the public-13.58.js→13.59.js→13.60.js→13.61.js renames; v96 — v13.195-carsides — the owner's arrow round; v95 — v13.194-herocarousel — the carousel release)", /const CACHE = "sportsignal-v121"/.test(sw) && !/const CACHE = "sportsignal-v120"/.test(sw) && !/const CACHE = "sportsignal-v119"/.test(sw) && !/const CACHE = "sportsignal-v118"/.test(sw) && !/const CACHE = "sportsignal-v117"/.test(sw) && !/const CACHE = "sportsignal-v116"/.test(sw) && !/const CACHE = "sportsignal-v115"/.test(sw) && !/const CACHE = "sportsignal-v114"/.test(sw) && !/const CACHE = "sportsignal-v113"/.test(sw) && !/const CACHE = "sportsignal-v112"/.test(sw) && !/const CACHE = "sportsignal-v111"/.test(sw) && !/const CACHE = "sportsignal-v110"/.test(sw) && !/const CACHE = "sportsignal-v109"/.test(sw) && !/const CACHE = "sportsignal-v108"/.test(sw) && !/const CACHE = "sportsignal-v107"/.test(sw) && !/const CACHE = "sportsignal-v106"/.test(sw) && !/const CACHE = "sportsignal-v105"/.test(sw) && !/const CACHE = "sportsignal-v104"/.test(sw) && !/const CACHE = "sportsignal-v103"/.test(sw) && !/const CACHE = "sportsignal-v102"/.test(sw) && !/const CACHE = "sportsignal-v101"/.test(sw) && !/const CACHE = "sportsignal-v100"/.test(sw) && !/const CACHE = "sportsignal-v99"/.test(sw) && !/const CACHE = "sportsignal-v98"/.test(sw));

  console.log(failed ? `\n${failed} MC-HEROES GATE FAILURES` : "\nmc-heroes gate: all layers pass (spec / round-trip / registry / retirement)");
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error("ERROR", e); process.exit(1); });
