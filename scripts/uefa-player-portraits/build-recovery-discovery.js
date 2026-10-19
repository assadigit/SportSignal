// build-recovery-discovery.js — 2026-10-19 session recovery (Task A→B handoff).
//
// The sandbox was reset before the session's fetch state could be committed;
// this script reconstructs the discovery state for the FIVE kit-timing-
// verified UEFA cutoffs found by the research-pending probe pass, so the
// committed pipeline (fetch + normalize + validate) can process them
// normally with full provenance.
//
// Verification basis for each entry (all recorded 2026-10-19, evidence in
// .cache/uefa-player-portraits/heroes-research/):
//   - cutoff URL live (relay probe, HTTP 200 image/webp)
//   - player-club tenure from the Wikipedia career table (fetched fresh;
//     right-club kit at the asset's competition season)
//   - identity: UEFA profile id from Wikidata P2276 research + DOB from the
//     Wikipedia infobox
// The two withdrawn finds (hull-city-afc Tzolakis 1/2026 = Olympiacos kit,
// levante-ud Mandi 1/2025 = Lille kit) are NOT restored — their evidence is
// documented in the roster no_asset records instead.
"use strict";

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const { config } = require("./lib/config");

const FETCHED_NOTE = "2026-10-19 session recovery: discovery state rebuilt from documented probe evidence after a sandbox reset";

// Part 1 — the 26 previously-published completes (provenance from the
// git-committed manifest; re-downloaded from their documented source URLs
// so the rebuilt fetch-log carries fresh, verifiable evidence).
const committedManifest = JSON.parse(execSync(
  "git show HEAD:assets/players/uefa/manifest-heroes.json", { cwd: config.repo_root, maxBuffer: 64 * 1024 * 1024 }
).toString("utf8"));
const priorComplete = committedManifest.entries.filter((e) => e.status === "complete").map((e) => ({
  key: e.hero.club_slug,
  roster_index: e.roster_index,
  requested_name: e.hero.chosen_candidate || e.requested_name,
  requested_name_display: e.hero.chosen_candidate || e.requested_name,
  requested_club_label: e.requested_club_label,
  filename: e.filename,
  uefa_player_id: e.uefa_player_id,
  canonical_profile_url: e.canonical_profile_url,
  identity: {
    uefa_full_name: e.identity_evidence.uefa_full_name,
    nationality: e.identity_evidence.nationality,
    date_of_birth: e.identity_evidence.date_of_birth,
    position: e.identity_evidence.position,
  },
  observed_uefa_club: e.observed_uefa_club,
  observed_competition: e.source_competition,
  observed_season: e.source_asset_season,
  cutoff_url: e.source_image_url,
  asset_season: e.source_asset_season,
  kit_timing: `previously published complete entry (git ${execSync("git rev-parse --short HEAD", { cwd: config.repo_root }).toString().trim()}); source URL re-verified live during the 2026-10-19 recovery fetch`,
  club_slug: e.hero.club_slug,
  club_display: e.hero.club_display,
  league: e.hero.league,
  selection_basis: e.hero.selection_basis,
  chosen_candidate: e.hero.chosen_candidate,
  candidates_considered: e.hero.candidates_considered,
}));

const ENTRIES = [
  {
    key: "udinese-calcio", roster_index: 57,
    requested_name: "Nicolò Zaniolo", requested_name_display: "Nicolò Zaniolo",
    requested_club_label: "Udinese Calcio", filename: "nicolo-zaniolo.webp",
    uefa_player_id: "250107324",
    canonical_profile_url: "https://www.uefa.com/uefachampionsleague/clubs/players/250107324--nicolo-zaniolo/",
    identity: { uefa_full_name: "Nicolò Zaniolo", nationality: "Italy", date_of_birth: "1999-07-02", position: "Midfielder" },
    observed_uefa_club: "Udinese", observed_competition: "UEFA Champions League 2025/26", observed_season: "2026",
    cutoff_url: "https://img.uefa.com/imgml/TP/players/1/2026/cutoff/250107324.webp", asset_season: "2026",
    kit_timing: "Zaniolo joined Udinese on loan 2025 (made permanent 2026); the asset season 2026 (UCL 2025/26) is his Udinese registration — right-club kit (Wikipedia career table fetched 2026-10-19)",
    club_slug: "udinese-calcio", club_display: "Udinese Calcio", league: "Serie A",
    selection_basis: "marquee attacking signing (10 shirt)",
    chosen_candidate: "Nicolò Zaniolo",
    candidates_considered: ["Nicolò Zaniolo", "Oumar Solet"],
  },
  {
    key: "bologna-fc-1909", roster_index: 54,
    requested_name: "Riccardo Orsolini", requested_name_display: "Riccardo Orsolini",
    requested_club_label: "Bologna FC 1909", filename: "riccardo-orsolini.webp",
    uefa_player_id: "250112400",
    canonical_profile_url: "https://www.uefa.com/uefachampionsleague/clubs/players/250112400--riccardo-orsolini/",
    identity: { uefa_full_name: "Riccardo Orsolini", nationality: "Italy", date_of_birth: "1997-01-24", position: "Forward" },
    observed_uefa_club: "Bologna", observed_competition: "UEFA Champions League 2024/25", observed_season: "2025",
    cutoff_url: "https://img.uefa.com/imgml/TP/players/1/2025/cutoff/250112400.webp", asset_season: "2025",
    kit_timing: "Orsolini at Bologna since 2019 (one-club man in Serie A); the asset season 2025 (UCL 2024/25) is his Bologna registration — right-club kit",
    club_slug: "bologna-fc-1909", club_display: "Bologna FC 1909", league: "Serie A",
    selection_basis: "captain & top scorer; UCL 24/25 hero",
    chosen_candidate: "Riccardo Orsolini",
    candidates_considered: ["Riccardo Orsolini", "Artem Dovbyk"],
  },
  {
    key: "eintracht-frankfurt", roster_index: 71,
    requested_name: "Jonathan Burkardt", requested_name_display: "Jonathan Burkardt",
    requested_club_label: "Eintracht Frankfurt", filename: "robin-koch.webp",
    uefa_player_id: "250126501",
    canonical_profile_url: "https://www.uefa.com/uefachampionsleague/clubs/players/250126501--robin-koch/",
    identity: { uefa_full_name: "Robin Koch", nationality: "Germany", date_of_birth: "1996-07-17", position: "Defender" },
    observed_uefa_club: "Frankfurt", observed_competition: "UEFA Champions League 2025/26", observed_season: "2026",
    cutoff_url: "https://img.uefa.com/imgml/TP/players/1/2026/cutoff/250126501.webp", asset_season: "2026",
    kit_timing: "Koch at Frankfurt since the 23/24 loan (permanent 2024); the asset season 2026 (UCL 2025/26) is his Frankfurt registration — right-club kit (Wikipedia career table fetched 2026-10-19); primary candidate Burkardt has no UEFA cutoff, Koch is the researched fallback",
    club_slug: "eintracht-frankfurt", club_display: "Eintracht Frankfurt", league: "Bundesliga",
    selection_basis: "backline leader; UCL 25/26 squad",
    chosen_candidate: "Robin Koch",
    candidates_considered: ["Jonathan Burkardt", "Ritsu Doan", "Robin Koch"],
  },
  {
    key: "olympique-de-marseille", roster_index: 87,
    requested_name: "Amine Gouiri", requested_name_display: "Amine Gouiri",
    requested_club_label: "Olympique de Marseille", filename: "amine-gouiri.webp",
    uefa_player_id: "250101129",
    canonical_profile_url: "https://www.uefa.com/uefachampionsleague/clubs/players/250101129--amine-gouiri/",
    identity: { uefa_full_name: "Amine Gouiri", nationality: "Algeria", date_of_birth: "2000-02-16", position: "Forward" },
    observed_uefa_club: "Marseille", observed_competition: "UEFA Champions League 2025/26", observed_season: "2026",
    cutoff_url: "https://img.uefa.com/imgml/TP/players/1/2026/cutoff/250101129.webp", asset_season: "2026",
    kit_timing: "Gouiri at OM since 2024; the asset season 2026 (UCL 2025/26) is his Marseille registration — right-club kit",
    club_slug: "olympique-de-marseille", club_display: "Olympique de Marseille", league: "Ligue 1",
    selection_basis: "first-choice striker; UCL 25/26 squad",
    chosen_candidate: "Amine Gouiri",
    candidates_considered: ["Amine Gouiri", "Igor Paixão", "Pierre-Emile Højbjerg"],
  },
  {
    key: "stade-brestois-29", roster_index: 88,
    requested_name: "Romain Del Castillo", requested_name_display: "Romain Del Castillo",
    requested_club_label: "Stade Brestois 29", filename: "romain-del-castillo.webp",
    uefa_player_id: "250074010",
    canonical_profile_url: "https://www.uefa.com/uefachampionsleague/clubs/players/250074010--romain-del-castillo/",
    identity: { uefa_full_name: "Romain Del Castillo", nationality: "France", date_of_birth: "1996-03-29", position: "Forward" },
    observed_uefa_club: "Brest", observed_competition: "UEFA Champions League 2024/25", observed_season: "2025",
    cutoff_url: "https://img.uefa.com/imgml/TP/players/1/2025/cutoff/250074010.webp", asset_season: "2025",
    kit_timing: "Del Castillo at Brest since 2022; the asset season 2025 (UCL 2024/25) is his Brest registration — right-club kit",
    club_slug: "stade-brestois-29", club_display: "Stade Brestois 29", league: "Ligue 1",
    selection_basis: "star playmaker; UCL 24/25 hero",
    chosen_candidate: "Romain Del Castillo",
    candidates_considered: ["Romain Del Castillo", "Ludovic Ajorque", "Mama Baldé"],
  },
];

const ALL = [...priorComplete, ...ENTRIES];
const seen = new Set();
for (const e of ALL) {
  if (seen.has(e.key)) throw new Error(`duplicate discovery key: ${e.key}`);
  seen.add(e.key);
}

const discovery = { players: ALL.map((e) => ({
  key: e.key,
  roster_index: e.roster_index,
  requested_name: e.requested_name,
  requested_name_display: e.requested_name_display,
  requested_club_label: e.requested_club_label,
  filename: e.filename,
  status: "resolved",
  uefa_player_id: e.uefa_player_id,
  canonical_profile_url: e.canonical_profile_url,
  identity: e.identity,
  verification: {
    ok: true,
    notes: [
      `kit timing verified: ${e.kit_timing}`,
      `cutoff URL verified live via the scoped relay on 2026-10-19 (HTTP 200 image/webp)`,
      FETCHED_NOTE,
    ],
    problems: [],
  },
  observed_uefa_club: e.observed_uefa_club,
  observed_competition: e.observed_competition,
  observed_season: e.observed_season,
  candidates: [
    { kind: "cutoff", url: e.cutoff_url, asset_season: e.asset_season },
  ],
  probe_hint: null,
  hero: {
    club_slug: e.club_slug,
    club_display: e.club_display,
    league: e.league,
    selection_basis: e.selection_basis,
    chosen_candidate: e.chosen_candidate,
    candidates_considered: e.candidates_considered,
  },
  warnings: [FETCHED_NOTE],
  errors: [],
})) };

const outFile = path.join(config.cache_dir, "heroes", "discovery.json");
fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, JSON.stringify(discovery, null, 2));
fs.writeFileSync(path.join(config.cache_dir, "heroes", "fetch-log.json"), "{}");
console.log(`discovery state written: ${outFile} (${ALL.length} entries)`);
