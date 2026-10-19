// scripts/backfill-hero-gaps.js — the AGENTIC ORCHESTRATOR of the hero gap
// loop (v13.129-herogaploop). Consumes the gap report (hero-gap-report.js)
// and runs the MECHANICAL parts of the documented portrait pipeline
// (INSTRUCTIONS §2/§2b/§2c), leaving the genuinely agentic parts — the MVP
// curation call, the kit-timing check (§8), the framing QA, the wiring
// display decision (README §4) — to the operator/agent with explicit gates.
//
// Why the runtime does NOT do this itself (the tier split, §13): the Worker
// cannot crop/normalize portraits (no sharp on Workers — the framing
// contract from v13.122/§9b is unmeetable there), the MVP choice is
// curation, and unprocessed league busts would regress the collection.
// The runtime's job ends at DETECT+LOG; this script is the fill side.
//
// Usage:
//   node scripts/backfill-hero-gaps.js --plan [--top 5]     # worklist → per-gap plans
//   node scripts/backfill-hero-gaps.js --add --club everton-fc --player "Jordan Pickford" \
//        [--basis "England #1, club icon"] [--league PL] [--roster roster-heroes.json]
//   node scripts/backfill-hero-gaps.js --alt everton-fc      # UEFA no_asset → alt-fetch path
//   node scripts/backfill-hero-gaps.js --wire everton-fc     # library portrait → HERO_ART (owner gate)
//   node scripts/backfill-hero-gaps.js --sync                # regenerate the coverage mirror + gate
//
// A report is REQUIRED for --plan (--add/--alt/--wire work straight from
// repo state): run `npm run heroes:report` first.
"use strict";

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const PIPE = path.join(ROOT, "scripts", "uefa-player-portraits");
const ROSTER_FILE = path.join(PIPE, "roster-heroes.json");
const HERO_CLUBS = path.join(ROOT, "assets", "players", "uefa", "hero-clubs.json");
const REPORT = path.join(ROOT, ".cache", "uefa-player-portraits", "hero-gap-report.json");
const sync = require("./sync-hero-coverage.js");

const LEAGUE_OF_CODE = {
  PL: "Premier League", PD: "La Liga", SA: "Serie A", BL1: "Bundesliga", FL1: "Ligue 1",
  CL: "UEFA Champions League", EL: "UEFA Europa League", ECL: "UEFA Conference League"
};

function die(msg, code) {
  console.error("ERROR: " + msg);
  process.exit(code || 2);
}

function note(msg) {
  console.log("     " + msg);
}

function run(cmd, args, opts) {
  const r = spawnSync(cmd, args, Object.assign({ stdio: "inherit", cwd: ROOT }, opts || {}));
  if (r.status !== 0) die("command failed (exit " + r.status + "): " + cmd + " " + args.join(" "), r.status || 1);
  return r;
}

// kebab-case filename base — the collection's filename convention
// (diacritics folded, like armand-gaetan-lauriente.webp)
function playerSlug(name) {
  return String(name || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function loadHeroClubs() {
  return JSON.parse(fs.readFileSync(HERO_CLUBS, "utf8")).clubs || {};
}

function loadReport() {
  if (!fs.existsSync(REPORT)) {
    die("no cached report — run `npm run heroes:report` (or node scripts/hero-gap-report.js) first");
  }
  return JSON.parse(fs.readFileSync(REPORT, "utf8"));
}

// ---- --plan ------------------------------------------------------------------

function cmdPlan(top) {
  const rep = loadReport();
  const gaps = (rep.gaps || []).slice(0, top || 10);
  if (!gaps.length) {
    console.log("No open gaps in the cached report. Refresh it: npm run heroes:report");
    return;
  }
  console.log("");
  console.log("=== hero gap backfill plan (" + gaps.length + " of " + (rep.gaps || []).length + " open gaps) ===");
  console.log("Order = what visitors see: hero-pick frequency first, then days seen.");
  console.log("");
  gaps.forEach((g, i) => {
    console.log((i + 1) + ". " + g.name + "  [" + g.slug + "]");
    if (g.library_ready) {
      note("portrait EXISTS: " + g.library_ready.player + " @ " + g.library_ready.src);
      note("plan (WIRING, no scraping):");
      note("  a. owner display decision (README §4) — confirm with the owner");
      note("  b. fade-tier scan of the portrait (README §2 v13.123 addendum)");
      note("  c. npm run backfill-heroes -- --wire " + g.slug);
      note("  d. npm test → fix the bundle-version pins it lists → deploy");
    } else {
      note("no portrait — full §2 flow:");
      note("  a. pick the MVP (curation: club icon / top scorer CURRENTLY at the club)");
      note("  b. kit-timing check vs Wikipedia career table (§8) — never trust memory");
      note('  c. npm run backfill-heroes -- --add --club ' + g.slug + ' --player "<MVP>"');
      note("  d. if UEFA has no asset (likely for non-UEFA clubs): --alt " + g.slug +
        " (" + (g.suggested_source || "league platform") + ")");
      note("  e. framing QA (analyze-framing.js) + contact sheet + validate");
      note("  f. wiring decision + deploy; the gap then resolves in the registry");
    }
    console.log("");
  });
  console.log("After any portrait lands: npm run backfill-heroes -- --sync, npm test, deploy per RUNBOOK.");
}

// ---- --add -------------------------------------------------------------------

function purgePipelineState(stateKey, cacheSubdir) {
  const dir = path.join(ROOT, ".cache", "uefa-player-portraits", cacheSubdir || "heroes");
  for (const f of ["discovery.json", "fetch-log.json"]) {
    const p = path.join(dir, f);
    if (!fs.existsSync(p)) continue;
    try {
      const st = JSON.parse(fs.readFileSync(p, "utf8"));
      const before = (st.players || []).length;
      st.players = (st.players || []).filter((e) => e.key !== stateKey);
      if ((st.players || []).length !== before) {
        fs.writeFileSync(p, JSON.stringify(st, null, 2));
        note("purged stale " + f + " state for " + stateKey);
      }
    } catch (e) {
      note("could not purge " + f + " (" + e.message + ") — continuing");
    }
  }
}

function cmdAdd(club, player, opts) {
  if (!club || !player) die("--add needs --club <state_key> and --player \"<Name>\"");
  const rosterPath = opts.roster ? path.join(PIPE, opts.roster) : ROSTER_FILE;
  const roster = JSON.parse(fs.readFileSync(rosterPath, "utf8"));
  const collection = roster.collection || {};
  if (roster.players.some((p) => p.state_key === club)) {
    die(club + " is already on the roster — that is an UPDATE (§2c), not an add. " +
      "Edit the entry's requested_name/filename/hero.candidates by hand, then re-run the stages with --refresh.");
  }
  const clubs = loadHeroClubs();
  const libEntry = clubs[club] || null;
  const clubLabel = libEntry ? libEntry.club : (opts.clubLabel || club);
  const league = libEntry ? libEntry.league : (LEAGUE_OF_CODE[opts.league] || null);
  const leagueCode = opts.league || (libEntry ? null : null);
  const filename = playerSlug(player) + ".webp";

  const entry = {
    roster_index: Math.max(0, ...roster.players.map((p) => p.roster_index || 0)) + 1,
    requested_name: player,
    requested_club_label: clubLabel,
    filename,
    state_key: club,
    search_name: player.toLowerCase(),
    club_hint: null,
    uefa_profile_url: null,
    hero: {
      club_slug: club,
      club_display: clubLabel,
      league,
      league_code: leagueCode,
      league_position: null,
      selection_basis: opts.basis || "agentic gap backfill (" + new Date().toISOString().slice(0, 10) + ") — curation pending owner review",
      candidates: [{ name: player }]
    },
    identity_hint: {
      full_name: player,
      date_of_birth: null,
      source: "hero gap backfill (v13.129-herogaploop); identity to be anchored during discovery",
      confidence: "medium",
      profile_url_source: null
    }
  };
  roster.players.push(entry);
  roster.players.sort((a, b) => (a.roster_index || 0) - (b.roster_index || 0));
  fs.writeFileSync(rosterPath, JSON.stringify(roster, null, 2) + "\n");
  console.log("OK   roster entry added: " + player + " → " + clubLabel + " (" + filename + ")");

  purgePipelineState(club, collection.cache_subdir);

  const rosterArg = path.basename(rosterPath);
  console.log("     stage 1/4: UEFA discover…");
  run("node", [path.join(PIPE, "cli.js"), "discover", "--roster", rosterArg, "--player", club]);
  console.log("     stage 2/4: UEFA fetch…");
  run("node", [path.join(PIPE, "cli.js"), "fetch", "--roster", rosterArg, "--player", club]);
  console.log("     stage 3/4: normalize (whole roster — the manifest is derived state)…");
  run("node", [path.join(PIPE, "cli.js"), "normalize", "--roster", rosterArg]);
  console.log("     stage 4/4: validate…");
  run("node", [path.join(PIPE, "cli.js"), "validate", "--roster", rosterArg]);

  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "assets", "players", "uefa", collection.manifest_filename || "manifest.json"), "utf8"));
  const me = (manifest.players || []).find((p) => (p.state_key || p.key || (p.filename || "").replace(/\.webp$/, "")) === club);
  const status = me && me.status;
  console.log("");
  if (status === "complete") {
    console.log("OK   portrait published (" + filename + ", status complete).");
    console.log("NEXT (agentic gates):");
    note("kit-timing check (§8): does the portrait show the CURRENT club's kit?");
    note("framing QA: node scripts/uefa-player-portraits/analyze-framing.js");
    note("contact sheet: node scripts/uefa-player-portraits/cli.js contact-sheet --roster " + rosterArg);
    note("wiring (owner display decision): npm run backfill-heroes -- --wire " + club);
    note("then: npm run backfill-heroes -- --sync && npm test && deploy (RUNBOOK §2)");
  } else {
    console.log("UEFA status: " + (status || "unknown") + " — if no_asset, record the evidence honestly and run the alt path:");
    note("npm run backfill-heroes -- --alt " + club);
    note("(alt-fetch only fills entries whose manifest status is missing/no_asset — §2b)");
  }
}

// ---- --alt -------------------------------------------------------------------

function cmdAlt(club, opts) {
  if (!club) die("--alt needs a club state_key");
  const rosterArg = opts.roster || "roster-heroes.json";
  console.log("alt-fetch for " + club + " (league-official platforms)…");
  run("node", [path.join(PIPE, "alt-fetch.js"), "--player", club]);
  console.log("normalize + validate…");
  run("node", [path.join(PIPE, "cli.js"), "normalize", "--roster", rosterArg]);
  run("node", [path.join(PIPE, "cli.js"), "validate", "--roster", rosterArg]);
  console.log("");
  console.log("NEXT (agentic gates): framing QA (analyze-framing.js — §9b's head-only lesson),");
  note("contact sheet review, kit check (§8), wiring decision (--wire), sync, npm test, deploy.");
}

// ---- --wire ------------------------------------------------------------------

function cmdWire(club) {
  if (!club) die("--wire needs a club state_key");
  const clubs = loadHeroClubs();
  const lib = clubs[club];
  if (!lib || !lib.portrait_url) {
    die(club + " has no library portrait (hero-clubs.json) — wire only fills EXISTING portraits; use --add/--alt to create one");
  }
  const bundleName = sync.liveBundleName();
  const bundlePath = path.join(ROOT, "assets", bundleName);
  const bundle = fs.readFileSync(bundlePath, "utf8");
  if (bundle.includes('"' + lib.club + '":{src:')) {
    die(lib.club + " is already wired in " + bundleName);
  }
  const m = bundle.match(/var HERO_ART=\{[\s\S]*?\n\};/);
  if (!m) die("HERO_ART block not found in " + bundleName);
  const block = m[0];
  const trimmed = block.replace(/\n\};$/, "").replace(/,\s*$/, "");
  const entry = '"' + lib.club + '":{src:"' + lib.portrait_url + '",alt:""}';
  const nextBlock = trimmed + ",\n" + entry + "\n};";
  const nextBundle = bundle.replace(block, nextBlock);

  const ver = bundleName.match(/public-(\d+)\.(\d+)\.js/);
  const nextName = "public-" + ver[1] + "." + (parseInt(ver[2], 10) + 1) + ".js";
  const nextPath = path.join(ROOT, "assets", nextName);
  fs.writeFileSync(nextPath, nextBundle);
  console.log("OK   " + nextName + " created with the new HERO_ART entry:");
  note(entry);

  // public.ts reference
  const pubTs = path.join(ROOT, "src", "pages", "public.ts");
  let pub = fs.readFileSync(pubTs, "utf8");
  pub = pub.split(bundleName).join(nextName);
  fs.writeFileSync(pubTs, pub);
  note("src/pages/public.ts now references " + nextName);

  // _headers immutable pin
  const headersPath = path.join(ROOT, "assets", "_headers");
  let headers = fs.readFileSync(headersPath, "utf8");
  headers = headers.split("/" + bundleName).join("/" + nextName);
  fs.writeFileSync(headersPath, headers);
  note("assets/_headers pin moved to " + nextName);

  // service-worker cache bump
  const swPath = path.join(ROOT, "assets", "sw.js");
  let sw = fs.readFileSync(swPath, "utf8");
  const swM = sw.match(/const CACHE = "sportsignal-v(\d+)"/);
  if (swM) {
    sw = sw.replace(/const CACHE = "sportsignal-v\d+"/, 'const CACHE = "sportsignal-v' + (parseInt(swM[1], 10) + 1) + '"');
    fs.writeFileSync(swPath, sw);
    note("sw.js CACHE bumped v" + swM[1] + " → v" + (parseInt(swM[1], 10) + 1));
  }

  console.log("");
  console.log("GATES before this can ship (the wiring is an OWNER DISPLAY DECISION — README §4):");
  note("1. fade-tier scan of " + lib.player + "'s portrait (README §2 v13.123 addendum — only a");
  note("   non-uniform bottom luminance needs a fade field; uniform figures ship without one)");
  note("2. npm run heroes:sync  (regenerates src/hero-coverage.ts with the new wired entry)");
  note("3. npm test — it will enumerate every version pin that still says " + bundleName +
    " (check-stats.js bundle checks, SW check, any sibling pins). Fix each listed pin.");
  note("4. visual check on the homepage (both flanks, RTL, mobile hide at <901px)");
  note("5. commit + deploy per RUNBOOK §2; the registry then marks the gap resolved");
  console.log("");
  note("The old " + bundleName + " stays in the tree (retired asset versions are kept).");
}

// ---- --sync ------------------------------------------------------------------

function cmdSync() {
  run("node", [path.join(__dirname, "sync-hero-coverage.js")]);
  run("node", [path.join(__dirname, "check-hero-coverage.js")]);
  console.log("");
  console.log("Coverage mirror regenerated and gated. If the sync reported CONTENT CHANGED,");
  console.log("commit src/hero-coverage.ts together with the asset/manifest changes.");
}

// ---- main --------------------------------------------------------------------

function main() {
  const argv = process.argv.slice(2);
  const opts = { roster: null, clubLabel: null, league: null, basis: null };
  if (argv.includes("--roster")) opts.roster = argv[argv.indexOf("--roster") + 1] || null;
  if (argv.includes("--club-label")) opts.clubLabel = argv[argv.indexOf("--club-label") + 1] || null;
  if (argv.includes("--league")) opts.league = argv[argv.indexOf("--league") + 1] || null;
  if (argv.includes("--basis")) opts.basis = argv[argv.indexOf("--basis") + 1] || null;

  if (argv.includes("--plan")) {
    let top = 10;
    if (argv.includes("--top")) top = parseInt(argv[argv.indexOf("--top") + 1], 10) || 10;
    return cmdPlan(top);
  }
  if (argv.includes("--add")) {
    const club = argv.includes("--club") ? argv[argv.indexOf("--club") + 1] : null;
    const player = argv.includes("--player") ? argv[argv.indexOf("--player") + 1] : null;
    return cmdAdd(club, player, opts);
  }
  if (argv.includes("--alt")) {
    return cmdAlt(argv[argv.indexOf("--alt") + 1], opts);
  }
  if (argv.includes("--wire")) {
    return cmdWire(argv[argv.indexOf("--wire") + 1]);
  }
  if (argv.includes("--sync")) return cmdSync();

  console.log("usage: node scripts/backfill-hero-gaps.js --plan [--top N] | --add --club <key> --player \"<Name>\" [--basis …] [--league PL] [--roster roster-heroes.json] | --alt <key> | --wire <key> | --sync");
  console.log("docs: docs/scrapping/uefa-players/INSTRUCTIONS.md §13 (the hero gap loop)");
  process.exit(argv.length ? 2 : 0);
}

main();
