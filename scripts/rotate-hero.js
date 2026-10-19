// rotate-hero.js — the ROTATION PROCEDURE (agentic tier of the club
// alternates library). Owner directive 2026-10-21: "when a player retires
// or moves to another club, remove it (for that club jersey) database and
// use another alternative." The runtime watch (src/hero-rotation.ts)
// DETECTS the departure; THIS command executes the swap through the
// existing pipeline so every layer agrees:
//
//   1. the chosen bench candidate (already fetched, VLM-style-gated and
//      deployed under assets/players/clubs/<league>/<club>/) is promoted
//      to the club's hero: fetch-log + discovery + roster-heroes are
//      edited so `normalize --player` publishes uefa/<player>.webp from
//      the cached original — no network, no research, no VLM wait
//   2. the departed candidate is marked status=departed in the clubs
//      manifest and its file is REMOVED from the club folder (the owner's
//      "remove it" rule — he no longer wears that jersey)
//   3. hero-clubs.json + manifest-heroes.json are rebuilt by normalize
//   4. src/hero-club-alternates.ts is re-synced (the open event resolves
//      on the next deploy — the watch sees the new active player)
//   5. for a WIRED club the printed follow-up is the --wire step (the
//      client bundle's HERO_ART src follows the owner-gated display
//      decision, README §4 — this command never touches the bundle)
//
// Usage:
//   npm run heroes:rotate -- --club psg                     (next candidate)
//   npm run heroes:rotate -- --club psg --to 2              (candidate #3)
//   npm run heroes:rotate -- --club psg --player "Vitinha"  (by name)
//   npm run heroes:rotate -- --club psg --dry               (preview only)
//
// The candidate's original MUST exist in .cache (the clubs library's
// originals are kept exactly for this). --reason is recorded in the
// rotation audit trail (manifest.rotation_log).
"use strict";

const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");
const { execFileSync } = require("child_process");
const images = require("./uefa-player-portraits/lib/images");

const ROOT = path.resolve(__dirname, "..");
const CLUBS_MANIFEST = path.join(ROOT, "assets", "players", "clubs", "manifest.json");
const HERO_CLUBS = path.join(ROOT, "assets", "players", "uefa", "hero-clubs.json");
const ROSTER = path.join(ROOT, "scripts", "uefa-player-portraits", "roster-heroes.json");
const CACHE = path.join(ROOT, ".cache", "uefa-player-portraits");
const FETCH_LOG = path.join(CACHE, "heroes", "fetch-log.json");
const DISCOVERY = path.join(CACHE, "heroes", "discovery.json");
const ORIGINALS = path.join(CACHE, "clubs-alternates", "originals");

function log(...args) { console.log("[rotate]", ...args); }

async function writeJson(file, data) {
  await fsp.writeFile(file, JSON.stringify(data, null, 2));
}

async function main() {
  const argv = process.argv.slice(2);
  const dry = argv.includes("--dry");
  const clubArg = argv.includes("--club") ? argv[argv.indexOf("--club") + 1] : null;
  const toArg = argv.includes("--to") ? parseInt(argv[argv.indexOf("--to") + 1], 10) : null;
  const playerArg = argv.includes("--player") ? argv[argv.indexOf("--player") + 1] : null;
  const reasonArg = argv.includes("--reason") ? argv[argv.indexOf("--reason") + 1] : null;
  if (!clubArg) { console.error("usage: rotate-hero.js --club <slug> [--to N | --player NAME] [--reason ...] [--dry]"); process.exit(2); }

  const manifest = JSON.parse(fs.readFileSync(CLUBS_MANIFEST, "utf8"));
  const entry = manifest.clubs[clubArg];
  if (!entry) {
    console.error(`club "${clubArg}" not in the clubs manifest — keys are hero-clubs slugs (${Object.keys(manifest.clubs).length} clubs)`);
    process.exit(2);
  }
  const cands = entry.candidates || [];
  if (cands.length < 2) {
    console.error(`club "${clubArg}" has no bench to rotate to (${cands.length} candidate(s))`);
    process.exit(2);
  }

  // pick the promotion target
  let targetIdx = null;
  if (playerArg) {
    const want = playerArg.toLowerCase();
    targetIdx = cands.findIndex((c) => String(c.player).toLowerCase() === want);
    if (targetIdx < 0) { console.error(`player "${playerArg}" is not a candidate of ${clubArg}: ${cands.map((c) => c.player).join(", ")}`); process.exit(2); }
    if (targetIdx === entry.active_index) { console.error(`"${playerArg}" is already the active hero of ${clubArg}`); process.exit(2); }
  } else {
    const start = typeof entry.active_index === "number" ? entry.active_index : 0;
    targetIdx = toArg != null ? toArg : start + 1;
    if (targetIdx >= cands.length) { console.error(`--to ${targetIdx} out of range (0..${cands.length - 1})`); process.exit(2); }
    if (targetIdx === start) { console.error(`candidate #${targetIdx} is already active`); process.exit(2); }
  }
  const departed = cands[entry.active_index || 0];
  const target = cands[targetIdx];

  log(`${entry.club} [${entry.league}]:`);
  log(`  departing: ${departed.player} (status=${departed.status})`);
  log(`  promoting: ${target.player} (${target.style}, ${target.star_basis || "n/a"})`);
  if (dry) { log("  (dry — nothing written)"); return; }

  // 1) the pipeline layer: point the roster/discovery/fetch-log at the
  //    bench candidate's cached original, then normalize --player
  const origFile = path.join(ORIGINALS, clubArg, target.file);
  if (!fs.existsSync(origFile)) {
    console.error(`missing cached original ${path.relative(ROOT, origFile)} — the alternates library must be re-fetched (clubs-alternates.js --club ${clubArg}) before this rotation`);
    process.exit(2);
  }
  const roster = JSON.parse(fs.readFileSync(ROSTER, "utf8"));
  const rp = roster.players.find((p) => p.state_key === clubArg);
  if (!rp) { console.error(`club ${clubArg} not in roster-heroes.json`); process.exit(2); }
  const fetchLog = JSON.parse(fs.readFileSync(FETCH_LOG, "utf8"));
  const discovery = JSON.parse(fs.readFileSync(DISCOVERY, "utf8"));
  let disc = discovery.players.find((d) => d.key === clubArg);
  if (!disc) { console.error(`club ${clubArg} not in the heroes discovery cache`); process.exit(2); }

  const prevFetch = fetchLog[clubArg] || {};
  const origBuf = await fsp.readFile(origFile);
  const prevActivePlayer = (disc.hero && disc.hero.chosen_candidate) || rp.requested_name;

  // the BRIDGE: normalize reads the club's original from the hero
  // collection's originals slot (.cache/.../originals/{state_key}.webp —
  // keyed by CLUB, not player). Copy the bench candidate's pristine
  // original into that slot so `normalize --player` publishes it.
  const heroOrigSlot = path.join(CACHE, "originals", `${clubArg}.webp`);
  await images.writeFileAtomic(heroOrigSlot, origBuf);

  fetchLog[clubArg] = {
    ...prevFetch,
    status: "complete",
    key: clubArg,
    roster_index: rp.roster_index,
    source_image_url: target.source_url || prevFetch.source_image_url,
    source_asset_season: "2026/27",
    source_competition: `${entry.league} (league-official media; clubs-library rotation)`,
    url: target.source_url || prevFetch.url,
    fetched_at: new Date().toISOString(),
    source_sha256: images.sha256(origBuf),
    download_transport: "clubs-library rotation (pre-fetched alternate)",
    alt_source: {
      ...(target.alt_source || prevFetch.alt_source || {}),
      rotation: {
        of: prevActivePlayer,
        to: target.player,
        reason: reasonArg || "departure (transfer/retirement) detected by the transfer watch",
        at: new Date().toISOString(),
      },
    },
    warnings: [
      ...(prevFetch.warnings || []).filter((w) => !/rotation|departure/.test(w)),
      `rotated from ${prevActivePlayer} to ${target.player} (${reasonArg || "departure detected by the transfer watch"})`,
    ],
  };
  disc.hero = disc.hero || {};
  disc.hero.chosen_candidate = target.player;
  disc.status = "resolved";
  disc.verification = disc.verification || { ok: true, notes: [], problems: [] };
  disc.verification.notes.push(
    `v13.133 club-library rotation: ${prevActivePlayer} → ${target.player} (${reasonArg || "departure detected by the transfer watch"}); promoted from the pre-fetched, VLM-style-gated bench (assets/players/clubs/)`
  );
  rp.requested_name = target.player;
  rp.requested_name_display = target.player;
  rp.filename = target.file;

  await writeJson(FETCH_LOG, fetchLog);
  await writeJson(DISCOVERY, discovery);
  await writeJson(ROSTER, roster);
  log("  pipeline layer updated (roster + discovery + fetch-log)");

  // 2) normalize --player: publishes uefa/<file>.webp + rebuilds
  //    manifest-heroes.json + hero-clubs.json (merge-mode keeps the rest)
  execFileSync("node", [
    path.join(ROOT, "scripts", "uefa-player-portraits", "cli.js"),
    "normalize", "--roster", "roster-heroes.json", "--player", clubArg,
  ], { stdio: "inherit", cwd: ROOT });
  log("  normalize complete (uefa/ + hero-clubs.json rebuilt)");

  // §2c orphan rule: the departed hero's uefa/<player>.webp is now
  // unreferenced — remove it (hero-clubs points at the new player)
  const oldHeroFile = path.join(ROOT, "assets", "players", "uefa", `${require("./uefa-player-portraits/lib/parse").nameToSlug(prevActivePlayer)}.webp`);
  if (fs.existsSync(oldHeroFile)) {
    const newHeroFile = path.join(ROOT, "assets", "players", "uefa", target.file);
    if (oldHeroFile !== newHeroFile) {
      await fsp.rm(oldHeroFile);
      log(`  removed orphaned previous hero: ${path.relative(ROOT, oldHeroFile)}`);
    }
  }

  // 3) the clubs manifest: mark departed, remove his file, advance the
  //    active pointer, promote the target to role=hero
  const oldFile = departed.file;
  const clubDir = path.join(ROOT, "assets", "players", "clubs", entry.league_folder, clubArg);
  if (departed.status !== "departed") {
    departed.status = "departed";
    departed.departed_at = new Date().toISOString();
  }
  if (oldFile && oldFile !== target.file) {
    const gone = path.join(clubDir, oldFile);
    if (fs.existsSync(gone)) {
      await fsp.rm(gone);
      log(`  removed departed candidate file: ${path.relative(ROOT, gone)}`);
    }
    departed.file = null; // kept in the manifest as the audit record
    departed.url = null;
  }
  target.status = "active";
  target.role = "hero";
  entry.active_index = targetIdx;
  // the promoted player's uefa/ copy now IS the hero — the club-folder file
  // stays (it equals the published bytes) so the folder keeps 3-4 pictures
  entry.rotation_log = [
    ...(entry.rotation_log || []),
    {
      at: new Date().toISOString(),
      from: prevActivePlayer,
      to: target.player,
      reason: reasonArg || "departure (transfer/retirement) detected by the transfer watch",
    },
  ];
  await writeJson(CLUBS_MANIFEST, manifest);
  log("  clubs manifest updated (departed marked, file removed, pointer advanced)");

  // 4) re-sync the runtime index
  execFileSync("node", [path.join(ROOT, "scripts", "sync-hero-clubs.js")], { stdio: "inherit", cwd: ROOT });
  log("  hero-club-alternates.ts re-synced");

  // 5) follow-ups
  console.log(`
DONE — ${entry.club} hero: ${prevActivePlayer} → ${target.player}
Next steps:
  - npm test                     (portrait + coverage gates)
  - deploy per RUNBOOK §2; the open rotation event resolves on the next watch tick
  - WIRED club? also run the --wire step (backfill-hero-gaps.js) so the client
    bundle's HERO_ART serves the new hero (owner-gated display decision, README §4)
  - commit + push (rotation audit lives in the clubs manifest rotation_log)`);
}

main().catch((err) => { console.error(err); process.exit(1); });
