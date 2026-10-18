#!/usr/bin/env node
// cli.js — command-line entry point for the UEFA player portrait pipeline.
//
// Usage:
//   node scripts/uefa-player-portraits/cli.js discover [--player <base>] [--refresh] [--roster <file>]
//   node scripts/uefa-player-portraits/cli.js fetch     [--player <base>] [--refresh] [--roster <file>]
//   node scripts/uefa-player-portraits/cli.js normalize [--player <base>] [--roster <file>]
//   node scripts/uefa-player-portraits/cli.js validate  [--roster <file>]
//   node scripts/uefa-player-portraits/cli.js contact-sheet [--roster <file>]
//   node scripts/uefa-player-portraits/cli.js all [--refresh] [--roster <file>]
//
//   --player <base>   operate on a single player (filename without .webp),
//                     e.g. --player pedrinho — for troubleshooting
//   --refresh         ignore cached validated data and re-download
//   --roster <file>   roster file (relative to scripts/uefa-player-portraits/)
//                     defining the collection to process. Default: roster.json
//                     (the original 36-player collection). Hero MVP collection:
//                     --roster roster-heroes.json
//
// Environment:
//   UEFA_FETCH_TRANSPORT  direct | relay | auto   (default auto)
//   UEFA_RELAY_BASE       https://<your-relay>.workers.dev  (see
//                         scripts/uefa-player-portraits/relay-worker.js)
//
// Full documentation: docs/scrapping/uefa-players/ (spec + runbook) and
// docs/assets/uefa-player-portraits.md
"use strict";

const fsp = require("fs/promises");
const path = require("path");
const { config, ensure_dirs } = require("./lib/config");
const collection = require("./lib/collection");
const transport = require("./lib/transport");

async function loadRoster(playerFilter, rosterName) {
  const rosterFile = rosterName
    ? path.isAbsolute(rosterName)
      ? rosterName
      : path.join(config.script_dir, rosterName)
    : config.roster_file;
  const roster = JSON.parse(await fsp.readFile(rosterFile, "utf8"));
  roster.__file = rosterFile;
  if (playerFilter) {
    const players = roster.players.filter(
      (p) =>
        p.filename.replace(/\.webp$/, "") === playerFilter ||
        p.state_key === playerFilter
    );
    if (!players.length) {
      throw new Error(`no roster player matches --player ${playerFilter}`);
    }
    return { ...roster, players };
  }
  return roster;
}

function pathsFor(roster) {
  const paths = collection.forRoster(roster, roster.__file);
  paths.deep_probe = Boolean(roster.collection && roster.collection.deep_season_probe);
  return paths;
}

async function loadState(playerFilter, rosterName) {
  const roster = await loadRoster(playerFilter, rosterName);
  const paths = pathsFor(roster);
  let discovery = { players: [] };
  try {
    discovery = JSON.parse(await fsp.readFile(paths.discovery_file, "utf8"));
    if (playerFilter) {
      const keep = roster.players.map((p) => p.state_key || p.filename.replace(/\.webp$/, ""));
      discovery = { players: discovery.players.filter((p) => keep.includes(p.key)) };
    }
  } catch {
    /* not discovered yet */
  }
  let fetchLog = {};
  try {
    fetchLog = JSON.parse(await fsp.readFile(paths.fetch_log_file, "utf8"));
  } catch {
    /* not fetched yet */
  }
  return { roster, discovery, fetchLog, paths };
}

async function main() {
  const args = process.argv.slice(2);
  const cmd = args[0];
  const flags = {};
  for (let i = 1; i < args.length; i++) {
    if (args[i] === "--player") flags.player = args[++i];
    else if (args[i] === "--refresh") flags.refresh = true;
    else if (args[i] === "--roster") flags.roster = args[++i];
    else {
      console.error(`unknown argument: ${args[i]}`);
      process.exit(2);
    }
  }
  if (!["discover", "fetch", "normalize", "validate", "contact-sheet", "all"].includes(cmd)) {
    console.error("usage: cli.js discover|fetch|normalize|validate|contact-sheet|all [--player <base>] [--refresh] [--roster <file>]");
    process.exit(2);
  }

  ensure_dirs();

  if (cmd === "discover") {
    const roster = await loadRoster(flags.player, flags.roster);
    const paths = pathsFor(roster);
    await require("./discover").run({ players: roster.players, refresh: flags.refresh, paths, rosterFile: roster.__file });
  } else if (cmd === "fetch") {
    const { roster, discovery, paths } = await loadState(flags.player, flags.roster);
    if (!discovery.players.length) {
      console.error("no discovery data — run `discover` first");
      process.exit(1);
    }
    await require("./fetch").run({ discovery, refresh: flags.refresh, paths, deepProbe: paths.deep_probe });
  } else if (cmd === "normalize") {
    const { roster, discovery, fetchLog, paths } = await loadState(flags.player, flags.roster);
    await require("./normalize").run({ roster, discovery, fetchLog, paths });
  } else if (cmd === "validate") {
    const roster = await loadRoster(null, flags.roster);
    const paths = pathsFor(roster);
    let manifest;
    try {
      manifest = JSON.parse(await fsp.readFile(paths.manifest_file, "utf8"));
    } catch {
      console.error(`${path.basename(paths.manifest_file)} missing — run \`normalize\` first`);
      process.exit(1);
    }
    const result = await require("./validate").run({ roster, manifest, paths });
    if (!result.ok) process.exit(1);
  } else if (cmd === "contact-sheet") {
    const roster = await loadRoster(null, flags.roster);
    const paths = pathsFor(roster);
    let manifest;
    try {
      manifest = JSON.parse(await fsp.readFile(paths.manifest_file, "utf8"));
    } catch {
      console.error(`${path.basename(paths.manifest_file)} missing — run \`normalize\` first`);
      process.exit(1);
    }
    for (const e of manifest.entries) e._output_path = path.join(config.asset_dir, e.filename);
    await require("./lib/images").buildContactSheet(manifest.entries, paths.contact_sheet_file);
    console.log("[contact-sheet]", "written:", paths.contact_sheet_file);
  } else if (cmd === "all") {
    const roster = await loadRoster(null, flags.roster);
    const paths = pathsFor(roster);
    const discovery = await require("./discover").run({ players: roster.players, refresh: flags.refresh, paths, rosterFile: roster.__file });
    await require("./fetch").run({ discovery, refresh: flags.refresh, paths, deepProbe: paths.deep_probe });
    const fetchLog = JSON.parse(await fsp.readFile(paths.fetch_log_file, "utf8"));
    const manifest = await require("./normalize").run({ roster, discovery, fetchLog, paths });
    const result = await require("./validate").run({ roster, manifest, paths });
    for (const e of manifest.entries) e._output_path = path.join(config.asset_dir, e.filename);
    await require("./lib/images").buildContactSheet(manifest.entries, paths.contact_sheet_file);
    console.log("[contact-sheet]", "written:", paths.contact_sheet_file);
    const blocked = transport.blockedHostList();
    if (blocked.length) console.error(`[blocked hosts] ${blocked.join(", ")}`);
    if (!result.ok) process.exit(1);
  }
}

main().catch((err) => {
  console.error(`\n[pipeline] fatal: ${err.message}`);
  console.error(err.stack || "");
  if (err.name === "BlockedHostError") {
    console.error(
      "UEFA's edge refused automated requests from this network. Options:\n" +
        "  1. run from an unrestricted network (UEFA_FETCH_TRANSPORT=direct)\n" +
        "  2. deploy the scoped relay worker (scripts/uefa-player-portraits/relay-worker.js)\n" +
        "     and set UEFA_RELAY_BASE + UEFA_FETCH_TRANSPORT=relay"
    );
  }
  process.exit(1);
});
