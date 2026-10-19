// scripts/hero-gap-report.js — the AGENTIC side of the hero gap loop
// (v13.129-herogaploop): pull the live gap registry from the worker's
// /api/hero-gaps admin endpoint, print a prioritized worklist, and cache it
// for the backfill orchestrator.
//
// The loop this serves (INSTRUCTIONS §13):
//   runtime detects+logs gaps (KV hero_gaps_v1)  →  THIS REPORT  →
//   backfill-hero-gaps.js runs the documented §2b/§2c pipeline  →
//   sync-hero-coverage.js  →  deploy  →  gaps resolve in the registry.
//
// Usage:
//   node scripts/hero-gap-report.js                     # live pull (needs SS_ADMIN_TOKEN)
//   node scripts/hero-gap-report.js --local             # wrangler dev on :8787
//   node scripts/hero-gap-report.js --base https://sportsignal.ir
//   node scripts/hero-gap-report.js --file .cache/uefa-player-portraits/hero-gap-report.json
//
// Auth: the ADMIN_TOKEN secret (Bearer). Pass via env SS_ADMIN_TOKEN —
// NEVER as a CLI flag (shell history / process lists leak flags).
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const CACHE_REPORT = path.join(ROOT, ".cache", "uefa-player-portraits", "hero-gap-report.json");
const sync = require("./sync-hero-coverage.js");

function usageAndExit(msg) {
  if (msg) console.error("ERROR: " + msg);
  console.error("usage: node scripts/hero-gap-report.js [--base URL | --local | --file PATH]");
  process.exit(msg ? 2 : 0);
}

async function fetchLive(base) {
  const token = process.env.SS_ADMIN_TOKEN;
  if (!token) {
    console.error("ERROR: SS_ADMIN_TOKEN env not set (the worker's ADMIN_TOKEN secret).");
    console.error("       Export it in your shell — never pass credentials as CLI flags.");
    process.exit(2);
  }
  const url = base.replace(/\/$/, "") + "/api/hero-gaps";
  const res = await fetch(url, { headers: { authorization: "Bearer " + token } }).catch((e) => null);
  if (!res) throw new Error("unreachable: " + url);
  if (res.status === 401) throw new Error("401 Unauthorized — SS_ADMIN_TOKEN does not match the worker's ADMIN_TOKEN secret");
  if (!res.ok) throw new Error("HTTP " + res.status + " from " + url);
  const body = await res.json();
  if (!body || body.ok !== true) throw new Error("endpoint returned ok:false: " + JSON.stringify(body).slice(0, 200));
  return body;
}

function platformFor(comps) {
  const codes = Object.keys(comps || {});
  const has = (c) => codes.includes(c);
  if (has("PL") || has("FA_CUP") || has("EFL_CUP")) return "premierleague";
  if (has("PD") || has("CDR")) return "laliga";
  if (has("SA") || has("COPPA_ITALIA")) return "seriea";
  if (has("BL1") || has("DFB_POKAL")) return "bundesliga";
  if (has("FL1")) return "ligue1";
  if (has("CL") || has("EL") || has("ECL")) return "uefa-first";
  return "none (owner curation)";
}

function printReport(rep) {
  const cov = rep.coverage || {};
  console.log("");
  console.log("=== SportSignal hero gap report ===");
  console.log("generated: " + rep.generated_at + (rep.registry_updated_at ? "  (registry updated " + rep.registry_updated_at + ")" : ""));
  console.log("coverage:  " + (cov.wired_teams ?? "?") + " wired teams render today · " +
    (cov.library_only_unwired ?? "?") + " published portraits sit unwired (owner display decision)");
  const counts = rep.counts || {};
  console.log("gaps:      " + (counts.open ?? "?") + " open (" + (counts.library_ready ?? "?") + " library-ready) · " +
    (counts.resolved_recent ?? "?") + " resolved recently");
  console.log("");

  const gaps = rep.gaps || [];
  if (!gaps.length) {
    console.log("No open gaps — every team in the live 7-day window renders artwork. 🎉");
  } else {
    console.log("OPEN GAPS (hero-pick frequency first — these are what visitors actually see):");
    console.log("");
    for (const g of gaps) {
      const comps = Object.entries(g.competitions || {}).map(([c, n]) => c + "×" + n).join(" ") || "—";
      const hero = g.hero_picks > 0 ? " ★HERO×" + g.hero_picks : "";
      console.log("  " + g.name + "  [" + g.slug + "]");
      console.log("    demand: " + g.seen_days + " day(s) seen" + hero + " · comps: " + comps);
      if (g.library_ready) {
        console.log("    portrait: LIBRARY-READY — " + g.library_ready.player + " is already published at " + g.library_ready.src);
        console.log("    action:   WIRE it (owner display decision — README §4): npm run backfill-heroes -- --wire " + g.slug);
      } else {
        console.log("    action:   npm run backfill-heroes -- --add --club " + g.slug + ' --player "<MVP>"  (' + (g.suggested_source || platformFor(g.competitions)) + ")");
      }
    }
    console.log("");
    console.log("The MVP choice is curation (the pipeline's roster contract): pick the club's");
    console.log("icon/top scorer CURRENTLY at the club (kit-timing check — INSTRUCTIONS §8).");
  }

  const resolved = rep.resolved_recent || [];
  if (resolved.length) {
    console.log("");
    console.log("RECENTLY RESOLVED (loop health — portraits landed): " +
      resolved.map((r) => r.name).join(", "));
  }

  // the local wiring backlog (from the repo's own truths — not the worker)
  const local = sync.buildCoverage();
  console.log("");
  console.log("LOCAL WIRING BACKLOG (repo state, independent of the live registry):");
  console.log("  " + local.libraryOnly.length + " published library portraits are not wired into HERO_ART.");
  console.log("  Wiring any of them is an OWNER DISPLAY DECISION (assets/hero/players/README.md §4 —");
  console.log("  rights review + the per-portrait fade-tier scan). List: npm run heroes:sync (regenerates");
  console.log("  src/hero-coverage.ts — library_only[] is the backlog).");
  console.log("");
}

async function main() {
  const argv = process.argv.slice(2);
  let rep = null;
  if (argv.includes("--file")) {
    const f = argv[argv.indexOf("--file") + 1];
    if (!f) usageAndExit("--file needs a path");
    rep = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), f), "utf8"));
  } else {
    let base = "https://sportsignal.ir";
    if (argv.includes("--local")) base = "http://localhost:8787";
    if (argv.includes("--base")) {
      base = argv[argv.indexOf("--base") + 1];
      if (!base) usageAndExit("--base needs a URL");
    }
    rep = await fetchLive(base);
  }
  printReport(rep);
  fs.mkdirSync(path.dirname(CACHE_REPORT), { recursive: true });
  fs.writeFileSync(CACHE_REPORT, JSON.stringify(rep, null, 2));
  console.log("cached: " + path.relative(ROOT, CACHE_REPORT) + " (backfill-hero-gaps.js reads this)");
}

main().catch((e) => {
  console.error("hero-gap-report failed: " + e.message);
  process.exit(1);
});
