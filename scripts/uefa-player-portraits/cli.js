#!/usr/bin/env node
// cli.js — command-line entry point for the UEFA player portrait pipeline
// (uefa-player-portraits.spec.md §10).
//
// Usage:
//   node scripts/uefa-player-portraits/cli.js discover [--player <base>] [--refresh]
//   node scripts/uefa-player-portraits/cli.js fetch     [--player <base>] [--refresh]
//   node scripts/uefa-player-portraits/cli.js normalize [--player <base>]
//   node scripts/uefa-player-portraits/cli.js validate
//   node scripts/uefa-player-portraits/cli.js contact-sheet
//   node scripts/uefa-player-portraits/cli.js all [--refresh]
//
//   --player <base>   operate on a single player (filename without .webp),
//                     e.g. --player pedrinho — for troubleshooting
//   --refresh         ignore cached validated data and re-download
//
// Environment:
//   UEFA_FETCH_TRANSPORT  direct | relay | auto   (default auto)
//   UEFA_RELAY_BASE       https://<your-relay>.workers.dev  (see
//                         scripts/uefa-player-portraits/relay-worker.js)
//
// Full documentation: docs/assets/uefa-player-portraits.md
"use strict";

const fsp = require("fs/promises");
const { config, ensure_dirs } = require("./lib/config");
const transport = require("./lib/transport");

async function loadRoster(playerFilter) {
  const roster = JSON.parse(await fsp.readFile(config.roster_file, "utf8"));
  if (playerFilter) {
    const players = roster.players.filter(
      (p) => p.filename.replace(/\.webp$/, "") === playerFilter
    );
    if (!players.length) {
      throw new Error(`no roster player matches --player ${playerFilter}`);
    }
    return { ...roster, players };
  }
  return roster;
}

async function loadState(playerFilter) {
  const roster = await loadRoster(playerFilter);
  let discovery = { players: [] };
  try {
    discovery = JSON.parse(await fsp.readFile(config.discovery_file, "utf8"));
    if (playerFilter) {
      const keep = roster.players.map((p) => p.filename.replace(/\.webp$/, ""));
      discovery = { players: discovery.players.filter((p) => keep.includes(p.key)) };
    }
  } catch {
    /* not discovered yet */
  }
  let fetchLog = {};
  try {
    fetchLog = JSON.parse(await fsp.readFile(config.fetch_log_file, "utf8"));
  } catch {
    /* not fetched yet */
  }
  return { roster, discovery, fetchLog };
}

async function main() {
  const args = process.argv.slice(2);
  const cmd = args[0];
  const flags = {};
  for (let i = 1; i < args.length; i++) {
    if (args[i] === "--player") flags.player = args[++i];
    else if (args[i] === "--refresh") flags.refresh = true;
    else {
      console.error(`unknown argument: ${args[i]}`);
      process.exit(2);
    }
  }
  if (!["discover", "fetch", "normalize", "validate", "contact-sheet", "all"].includes(cmd)) {
    console.error("usage: cli.js discover|fetch|normalize|validate|contact-sheet|all [--player <base>] [--refresh]");
    process.exit(2);
  }

  ensure_dirs();

  if (cmd === "discover") {
    const roster = await loadRoster(flags.player);
    await require("./discover").run({ players: roster.players, refresh: flags.refresh });
  } else if (cmd === "fetch") {
    const { roster, discovery } = await loadState(flags.player);
    if (!discovery.players.length) {
      console.error("no discovery data — run `discover` first");
      process.exit(1);
    }
    await require("./fetch").run({ discovery, refresh: flags.refresh });
  } else if (cmd === "normalize") {
    const { roster, discovery, fetchLog } = await loadState(flags.player);
    await require("./normalize").run({ roster, discovery, fetchLog });
  } else if (cmd === "validate") {
    const roster = await loadRoster(null);
    let manifest;
    try {
      manifest = JSON.parse(await fsp.readFile(`${config.asset_dir}/manifest.json`, "utf8"));
    } catch {
      console.error("manifest.json missing — run `normalize` first");
      process.exit(1);
    }
    const result = await require("./validate").run({ roster, manifest });
    if (!result.ok) process.exit(1);
  } else if (cmd === "contact-sheet") {
    const roster = await loadRoster(null);
    let manifest;
    try {
      manifest = JSON.parse(await fsp.readFile(`${config.asset_dir}/manifest.json`, "utf8"));
    } catch {
      console.error("manifest.json missing — run `normalize` first");
      process.exit(1);
    }
    const path = require("path");
    for (const e of manifest.entries) e._output_path = path.join(config.asset_dir, e.filename);
    await require("./lib/images").buildContactSheet(manifest.entries, config.contact_sheet_file);
    console.log("[contact-sheet]", "written:", config.contact_sheet_file);
  } else if (cmd === "all") {
    const roster = await loadRoster(null);
    const discovery = await require("./discover").run({ players: roster.players, refresh: flags.refresh });
    await require("./fetch").run({ discovery, refresh: flags.refresh });
    const fetchLog = JSON.parse(await fsp.readFile(config.fetch_log_file, "utf8"));
    const manifest = await require("./normalize").run({ roster, discovery, fetchLog });
    const result = await require("./validate").run({ roster, manifest });
    const path = require("path");
    for (const e of manifest.entries) e._output_path = path.join(config.asset_dir, e.filename);
    await require("./lib/images").buildContactSheet(manifest.entries, config.contact_sheet_file);
    console.log("[contact-sheet]", "written:", config.contact_sheet_file);
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
