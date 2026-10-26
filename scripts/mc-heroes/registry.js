#!/usr/bin/env node
// scripts/mc-heroes/registry.js — the batch driver + the registry file.
//
// The registry (mc-heroes.json) is the SINGLE SOURCE OF TRUTH for the
// mobile featured-match card's player windows:
//   - which clubs are wired (MC_ART),
//   - each club's home/away variant pair (MC_SIDE + MC_HOME_SRC),
//   - each file's fade stop (MC_GEOM),
//   - the provenance of every file (source, mode, geometry snapshot).
//
// `node scripts/mc-heroes/registry.js build`   (re)generates missing files
// `node scripts/mc-heroes/registry.js check`   re-measures + verifies all
//
// Adding the next game's new player = add one entry here + run build + wire.
"use strict";
const fs = require("fs");
const path = require("path");
const { runIngest, measure } = require("./ingest");

const REGISTRY = path.join(__dirname, "mc-heroes.json");
const MC_DIR = path.join(__dirname, "..", "..", "assets", "ui", "mc");

// ---------------------------------------------------------------------------
// THE REGISTRY
// kind: "legacy-pair"   — an owner-approved hand-crafted window (kept
//                        byte-intact, immutable-pin rule) + a generated twin
//                        for the other side
//        "canonical"    — a pipeline-generated pair at the v13.182 spec
//        "legacy-scale" — a pipeline-generated pair at the SPEC WINDOW but
//                        a per-entry `head` px — the v13.184 treatment for
//                        big clubs whose every source is the same ~460-row
//                        UEFA cutoff (too shallow for the 91px canonical
//                        head): the head scales up just enough that the
//                        figure still reaches the 534 fade floor (the shipped
//                        yamal-4/mbappe-4 precedent, machine-generated)
// side_of_file: which slot the EXISTING file was composed for (legacy) —
//               the twin mirrors it; canonical/legacy-scale pairs are
//               generated both ways
// ---------------------------------------------------------------------------
const ENTRIES = {
  "Chelsea FC": {
    kind: "legacy-pair", side_of_file: "home",
    file: "mc-port-palmer.webp", twin: "mc-port-palmer-a.webp",
    source: "assets/players/hero/cole-palmer.webp",
    fade: 66, origin: "v13.180-mcequal hand-craft (round-trip verified 2026-10-26: crown 123, head 91, cx 55.62%W, bottom 99.83%H — regenerated EXACTLY by the pipeline)",
  },
  "Manchester United FC": {
    kind: "legacy-pair", side_of_file: "away",
    file: "mc-port-bruno.webp", twin: "mc-port-bruno-h.webp",
    source: "assets/players/hero/bruno-fernandes.webp",
    fade: 66, origin: "v13.182-mcmirror hand-craft (round-trip verified 2026-10-26: crown 123, head 91 spec, cx 44.04%W)",
  },
  "Tottenham Hotspur FC": {
    kind: "legacy-pair", side_of_file: "home",
    file: "art-tottenham-6.webp", twin: "art-tottenham-6-a.webp",
    source: "assets/ui/mc/art-tottenham-6.webp", // the art family's own crop — the twin re-windows it mirrored
    fade: 61, origin: "v13.180-mcequal hand-craft (the one compatible art source — crest 41-47% of span)",
  },
  "FC Barcelona": {
    kind: "legacy-pair", side_of_file: "home",
    file: "mc-port-yamal-4.webp", twin: "mc-port-yamal-4-a.webp",
    source: "assets/players/clubs/laliga/fc-barcelona/lamine-yamal.webp",
    fade: 77, origin: "v13.180-mcequal hand-craft (head-centered legacy scale)",
  },
  "Real Madrid CF": {
    kind: "legacy-pair", side_of_file: "home",
    file: "mc-port-mbappe-4.webp", twin: "mc-port-mbappe-4-a.webp",
    source: "assets/players/clubs/laliga/real-madrid-cf/kylian-mbappe.webp",
    fade: 71, origin: "v13.180-mcequal hand-craft (head-centered legacy scale)",
  },
  "FC Bayern München": {
    kind: "canonical",
    file: "mc-port-kane-3-h.webp", twin: "mc-port-kane-3-a.webp",
    source: "assets/players/clubs/bundesliga/fc-bayern-munchen/harry-kane.webp",
    fade: 66,
    origin: "generated 2026-10-26 at the v13.182 canonical spec — REPLACES the legacy kane-2 scale (head 30.3%W) so Bayern matches every canonical club head-for-head (the v13.180-era bigger-head look retired with the standardization round; kane-2 stays on disk under the immutable-pin rule)",
  },
  "Arsenal FC": {
    kind: "canonical",
    file: "mc-port-saka-h.webp", twin: "mc-port-saka-a.webp",
    source: "assets/players/hero/bukayo-saka.webp",
    fade: 66, origin: "generated 2026-10-26 at the v13.182 canonical spec",
  },
  "Manchester City FC": {
    kind: "canonical",
    file: "mc-port-haaland-h.webp", twin: "mc-port-haaland-a.webp",
    source: "assets/players/hero/erling-haaland.webp",
    fade: 66, origin: "generated 2026-10-26 at the v13.182 canonical spec",
  },
  "FC Internazionale Milano": {
    kind: "canonical",
    file: "mc-port-lautaro-h.webp", twin: "mc-port-lautaro-a.webp",
    source: "assets/players/hero/lautaro-martinez.webp",
    fade: 66, origin: "generated 2026-10-26 at the v13.182 canonical spec",
  },
  // ---- v13.184-mcbig5 (owner: "all desired clubs must have club logo and
  // players" — no crest-only big clubs): the five unwired BIG_MATCH_TEAMS
  // clubs, windowed from the site's own library. Liverpool is CANONICAL
  // (Barcola's 460-row hero canvas spans 441 output rows at 91px — a genuine
  // spec window, downscale 0.96x); the other four ride legacy-scale (their
  // every source is the same ~460-row cutoff, too shallow for 91px — the
  // head scales up just enough to reach the fade floor, the shipped
  // yamal-4/mbappe-4 precedent, each SMALLER than yamal's 36.1%/mbappe's
  // 40.1% heads). ----
  "Liverpool FC": {
    kind: "canonical",
    file: "mc-port-barcola-h.webp", twin: "mc-port-barcola-a.webp",
    source: "assets/players/hero/bradley-barcola.webp",
    fade: 62, origin: "generated 2026-10-27 at the v13.182 canonical spec (the 2026/27 UCL-roster Liverpool representative — hero/bradley-barcola.webp is the ONE Liverpool source deep enough for a 91px window: figure spans 460 rows at a 95px head)",
  },
  "AC Milan": {
    kind: "legacy-scale", head: 110,
    file: "mc-port-pulisic-h.webp", twin: "mc-port-pulisic-a.webp",
    source: "assets/players/clubs/serie-a/ac-milan/christian-pulisic.webp",
    fade: 72, origin: "generated 2026-10-27 legacy-scale (Milan is outside the 2026/27 UCL roster — the club library is the only photo home; Pulisic is the manifest's active representative)",
  },
  "Club Atlético de Madrid": {
    kind: "legacy-scale", head: 104,
    file: "mc-port-alvarez-h.webp", twin: "mc-port-alvarez-a.webp",
    source: "assets/players/clubs/laliga/club-atletico-de-madrid/julian-alvarez.webp",
    fade: 66, origin: "generated 2026-10-27 legacy-scale (Álvarez — the UCL-roster Atlético representative, manifest active)",
  },
  "Borussia Dortmund": {
    kind: "legacy-scale", head: 103,
    file: "mc-port-guirassy-h.webp", twin: "mc-port-guirassy-a.webp",
    source: "assets/players/clubs/bundesliga/borussia-dortmund/serhou-guirassy.webp",
    fade: 66, origin: "generated 2026-10-27 legacy-scale (Guirassy — the UCL-roster Dortmund representative, manifest active)",
  },
  "Paris Saint-Germain FC": {
    kind: "legacy-scale", head: 119,
    file: "mc-port-dembele-h.webp", twin: "mc-port-dembele-a.webp",
    source: "assets/players/hero/ousmane-dembele.webp",
    fade: 63, origin: "generated 2026-10-27 legacy-scale (Dembélé — the UCL-roster PSG representative, manifest active)",
  },
};

function abs(p) { return path.join(__dirname, "..", "..", p); }

async function build(force) {
  const out = { schema_version: 1, generated_at: new Date().toISOString(), clubs: {} };
  let failures = 0;
  for (const [club, e] of Object.entries(ENTRIES)) {
    const rec = { kind: e.kind, fade: e.fade, source: e.source, origin: e.origin };
    const needTwin = !fs.existsSync(path.join(MC_DIR, e.twin)) || force;
    const needFile = e.kind === "canonical" && (!fs.existsSync(path.join(MC_DIR, e.file)) || force);

    if (e.kind === "canonical" || e.kind === "legacy-scale") {
      for (const [name, side] of [[e.file, "home"], [e.twin, "away"]]) {
        if (!fs.existsSync(path.join(MC_DIR, name)) || force) {
          const r = await runIngest({
            srcFile: abs(e.source), outName: name, side, fade: e.fade,
            mode: e.kind === "legacy-scale" ? "legacy-scale" : "canonical",
            head: e.head, force,
          });
          if (!r) { failures++; continue; }
          console.log(`BUILD ${club} ${name} ok`);
        }
      }
    } else if (needTwin) {
      const twinSide = e.side_of_file === "home" ? "away" : "home";
      const r = await runIngest({
        srcFile: abs(e.source), outName: e.twin, side: twinSide,
        fade: e.fade, mode: "twin", legacyFile: e.file, force,
      });
      if (!r) { failures++; continue; }
      console.log(`BUILD ${club} ${e.twin} ok (twin of ${e.file})`);
    }

    // geometry snapshot of BOTH files (the validator re-checks against these).
    // home/away here = the SLOT each file is COMPOSED FOR (the direction the
    // head leans) — for a legacy club whose approved file was composed for
    // the AWAY slot (Man United / bruno), the twin is the home variant.
    const homeFile = e.kind === "canonical" || e.kind === "legacy-scale" ? e.file : (e.side_of_file === "home" ? e.file : e.twin);
    const awayFile = e.kind === "canonical" || e.kind === "legacy-scale" ? e.twin : (e.side_of_file === "home" ? e.twin : e.file);
    for (const [key, fname] of [["home", homeFile], ["away", awayFile]]) {
      const f = path.join(MC_DIR, fname);
      if (!fs.existsSync(f)) { console.error(`MISSING ${fname} for ${club}`); failures++; continue; }
      const m = await measure(f);
      rec[key] = fname;
      rec[key + "_geo"] = {
        dims: `${m.px.width}x${m.px.height}`,
        crown: m.head.crown,
        headMaxW: m.head.headMaxW,
        headCx: Math.round(m.head.headCx),
        figureBottom: m.bbox.y1,
      };
    }
    out.clubs[club] = rec;
  }
  fs.writeFileSync(REGISTRY, JSON.stringify(out, null, 1) + "\n");
  console.log(`\nregistry written: ${REGISTRY}`);
  if (failures) { console.error(`${failures} failures`); process.exit(2); }
}

async function check() {
  const reg = JSON.parse(fs.readFileSync(REGISTRY, "utf8"));
  const SPEC = require("./spec.json");
  let failed = 0;
  const t = (name, cond) => { console.log((cond ? "OK   " : "FAIL ") + name); if (!cond) failed++; };
  for (const [club, e] of Object.entries(reg.clubs)) {
    for (const side of ["home", "away"]) {
      const f = e[side]; if (!f) continue;
      const geo = e[side + "_geo"];
      const p = path.join(MC_DIR, f);
      t(`${club} ${side} exists (${f})`, fs.existsSync(p));
      if (!fs.existsSync(p)) continue;
      const m = await measure(p);
      t(`${club} ${side} dims ${geo.dims}`, m.px.width + "x" + m.px.height === geo.dims);
      t(`${club} ${side} crown ${geo.crown}`, Math.abs(m.head.crown - geo.crown) <= SPEC.window.crown_row_tol);
      t(`${club} ${side} head ${geo.headMaxW}px`, Math.abs(m.head.headMaxW - geo.headMaxW) <= SPEC.head.max_width_tol_px);
      t(`${club} ${side} headCx ${geo.headCx}`, Math.abs(m.head.headCx - geo.headCx) <= 5);
      t(`${club} ${side} bottom ${geo.figureBottom}`, m.bbox.y1 >= geo.figureBottom - 6);
      t(`${club} ${side} aspect .6202`, Math.abs(m.px.width / m.px.height - SPEC.window.aspect) <= SPEC.window.aspect_tol);
    }
    // the pair must mirror around the window center (within 6px)
    if (e.home_geo && e.away_geo) {
      const W = parseInt(e.home_geo.dims, 10);
      const sum = e.home_geo.headCx + e.away_geo.headCx;
      t(`${club} pair mirror symmetry (cx sum ${sum} ~ ${W})`, Math.abs(sum - W) <= 6);
    }
  }
  console.log(failed ? `\n${failed} CHECK FAILURES` : "\nall registry checks pass");
  if (failed) process.exit(2);
}

(async () => {
  const cmd = process.argv[2] || "check";
  if (cmd === "build") await build(process.argv.includes("--force"));
  else if (cmd === "check") await check();
  else { console.error("usage: registry.js build [--force] | check"); process.exit(1); }
})().catch((e) => { console.error("ERROR", e); process.exit(1); });
