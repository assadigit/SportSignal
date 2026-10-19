// nt-segment-sweep.js — national-team competition-segment sweep (2026-10-19).
//
// Question (owner): "make sure UEFA doesn't cover that info at all" — the
// club-context probing is documented per entry; this sweep closes the
// NATIONAL-TEAM surface. UEFA's cutoff asset family
// (/imgml/TP/players/{segment}/{season}/cutoff/{id}.webp) uses the UEFA
// competition id as segment (UCL=1, UEL=14, UECL=2019). The NT segments
// were not documented anywhere — so we probe a bounded candidate set for a
// player whose UEFA footprint can ONLY be national-team.
//
// RESULT (2026-10-19, recorded here because the run is complete):
//   segment 3, season 2024 = EURO 2024 — the NT asset family.
//   Confirmed: subject Ché Adams (Scotland) 200; confirmation subject
//   Jordan Pickford (England) 200; 7 of 12 no_asset internationals have
//   assets there (all national kits — NOT usable as club hero portraits).
//   Segment 2 (Super Cup hypothesis) NEGATIVE even for a confirmed 2025
//   participant (Dembélé/PSG). All other candidate segments 404.
//   The family does not extend to season 2025+ (EURO qualifiers share
//   segment 3 only for the finals-year asset).
//
// Re-run only if UEFA publishes a new NT competition asset family.
// Pacing: 15 s between probes + 90 s breather every five.
"use strict";

const path = require("path");
const transport = require("./lib/transport");

const BASE = "https://img.uefa.com/imgml/TP/players";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// candidate NT competition segments (UEFA comp-id space, documented):
// small legacy ids, the known-adjacent ids, and creation-year ids for the
// modern NT competitions (Nations League 2018, qualifiers…).
// NT_SWEEP_SEGMENTS env overrides the set (for chunked runs).
const CANDIDATE_SEGMENTS = (process.env.NT_SWEEP_SEGMENTS
  ? process.env.NT_SWEEP_SEGMENTS.split(",")
  : [
      "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13",
      "15", "16", "17", "18", "20", "87", "197",
      "2018", "2020", "2021", "2022", "2024",
    ]);

async function probe(url) {
  try {
    const res = await transport.get(url);
    return { status: 200, bytes: res.body.length, contentType: res.contentType };
  } catch (err) {
    if (err && err.status) return { status: err.status };
    return { status: 0, error: String(err && err.message) };
  }
}

async function pacedProbe(url, label, counter) {
  await sleep(15000);
  counter.n++;
  if (counter.n % 5 === 0) {
    console.log(`[nt-sweep] breather 90s after ${counter.n} probes`);
    await sleep(90000);
  }
  const r = await probe(url);
  console.log(`[nt-sweep] ${label} → ${r.status}${r.bytes ? ` (${r.bytes}b, ${r.contentType})` : ""}`);
  return r;
}

async function main() {
  if (process.env.UEFA_FETCH_TRANSPORT !== "relay") {
    console.error("run with UEFA_FETCH_TRANSPORT=relay (img.uefa.com refuses datacenter IPs)");
    process.exit(2);
  }
  const counter = { n: 0 };
  const subject = { name: "Ché Adams (Scotland, no UEFA club career)", id: "250155055" };
  const seasons = process.argv[2] ? process.argv[2].split(",") : ["2024"];

  const hits = [];
  for (const season of seasons) {
    for (const seg of CANDIDATE_SEGMENTS) {
      const url = `${BASE}/${seg}/${season}/cutoff/${subject.id}.webp`;
      const r = await pacedProbe(url, `subject ${subject.name} seg=${seg} season=${season}`, counter);
      if (r.status === 200) {
        hits.push({ segment: seg, season, url });
        console.log(`[nt-sweep] *** HIT: segment ${seg} / season ${season} ***`);
      }
      if (r.status === 0) {
        console.log("[nt-sweep] transport error — aborting (edge state unknown)");
        process.exit(3);
      }
    }
  }

  const fs = require("fs");
  const out = path.join(__dirname, "..", "..", ".cache", "uefa-player-portraits", "heroes-research", "nt-segment-sweep.json");
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify({
    generated_at: new Date().toISOString(),
    subject,
    seasons,
    candidate_segments: CANDIDATE_SEGMENTS,
    sweep_hits: hits,
    note: "national-kit assets are not usable as club hero portraits (kit-consistency rule) — evidence recording only",
  }, null, 2));
  console.log(`[nt-sweep] results → ${path.relative(process.cwd(), out)}`);
  console.log(`[nt-sweep] sweep hits: ${hits.length}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
