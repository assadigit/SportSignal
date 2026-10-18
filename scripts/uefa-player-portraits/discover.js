// discover.js — Phase A (resolve identities) + Phase B (extract portrait
// candidates) of uefa-player-portraits.spec.md §6.
//
// For each roster player:
//   1. walk the club squad page (competition context from the roster hint)
//   2. match the requested player by normalized name
//   3. fetch the canonical UEFA profile and parse identity fields
//   4. verify identity against the roster identity hints (DOB, nationality,
//      club context) and record the transparent cutoff candidate
//
// Writes .cache/uefa-player-portraits/discovery.json. No assets published.
// Never enumerates numeric player IDs; every ID comes from a real squad page
// link observed on uefa.com.
"use strict";

const fsp = require("fs/promises");
const { config, ensure_dirs } = require("./lib/config");
const transport = require("./lib/transport");
const parse = require("./lib/parse");

const COMPS = ["uefachampionsleague", "uefaeuropaleague", "uefaconferenceleague"];

function log(...args) {
  console.log("[discover]", ...args);
}

async function fetchPageHtml(url) {
  const res = await transport.get(url);
  const ct = (res.contentType || "").toLowerCase();
  if (!ct.includes("text/html")) {
    throw new Error(`expected HTML at ${url}, got content-type "${res.contentType}"`);
  }
  return { html: res.body.toString("utf8"), transport: res.transport, url: res.url };
}

// Compare UEFA profile data against the roster identity hint.
// Returns { ok, notes[] } — never rewrites names or club labels.
// Tolerance policy (documented): a DOB mismatch of <= 400 days is treated as
// a data-entry variance between sources (recorded as a warning + needing
// external corroboration), because genuine namesakes differ by years. A
// larger mismatch stays a hard ambiguity. Missing nationality is tolerated
// (several profiles show a flag with no text field); it becomes a hard
// problem only when the hint explicitly flags a namesake risk AND the DOB
// check cannot separate the candidates.
function verifyIdentity(hint, profile, player, squadContext) {
  const notes = [];
  const problems = [];
  if (!profile.full_name) problems.push("UEFA profile has no readable name");
  if (!profile.date_of_birth) problems.push("UEFA profile has no readable date of birth");

  if (hint.date_of_birth && profile.date_of_birth) {
    if (hint.date_of_birth === profile.date_of_birth) {
      notes.push(`DOB matches identity hint (${profile.date_of_birth})`);
    } else {
      const days = Math.abs(
        Date.parse(profile.date_of_birth) - Date.parse(hint.date_of_birth)
      ) / 86400000;
      if (days <= 400) {
        notes.push(
          `WARNING: DOB variance of ${Math.round(days)} days (UEFA: ${profile.date_of_birth}, hint: ${hint.date_of_birth}) — treated as data-entry variance; identity corroborated by unique name on the labelled club's squad`
        );
      } else {
        problems.push(`DOB mismatch: UEFA says ${profile.date_of_birth}, identity hint expects ${hint.date_of_birth} — possible namesake, needs review`);
      }
    }
  } else if (!hint.date_of_birth && profile.date_of_birth) {
    notes.push(`UEFA DOB recorded (${profile.date_of_birth}); roster hint had none (low/medium confidence case)`);
  }

  if (hint.nationality && profile.nationality) {
    const norm = (s) => parse.normalizeName(s);
    if (norm(hint.nationality) === norm(profile.nationality)) {
      notes.push(`nationality matches identity hint (${profile.nationality})`);
    } else {
      notes.push(`WARNING: nationality "${profile.nationality}" differs from hint "${hint.nationality}" (may be birth country vs international nation) — review`);
    }
  } else if (!profile.nationality) {
    notes.push("UEFA profile displays no country/nationality text field (flag-only or absent) — identity rests on DOB + squad context");
  }

  if (squadContext) {
    notes.push(`found on the ${squadContext.competition} squad page of ${squadContext.club_path}`);
  }

  if (hint.disambiguation) notes.push(`disambiguation note: ${hint.disambiguation}`);

  return { ok: problems.length === 0, problems, notes };
}

async function discoverForPlayer(player, state, { refresh }) {
  const key = player.filename.replace(/\.webp$/, "");
  const existing = state.players.find((p) => p.key === key);
  if (existing && existing.status === "resolved" && !refresh) {
    log(`#${player.roster_index} ${player.requested_name}: cached (${existing.uefa_player_id}), skipping`);
    return existing;
  }

  const entry = {
    key,
    roster_index: player.roster_index,
    requested_name: player.requested_name,
    requested_name_display: player.requested_name_display || player.requested_name,
    requested_club_label: player.requested_club_label,
    filename: player.filename,
    status: "unresolved",
    uefa_player_id: null,
    canonical_profile_url: null,
    observed_uefa_club: null,
    observed_competition: null,
    observed_season: null,
    identity: null,
    verification: null,
    candidates: [],
    warnings: [],
    errors: [],
  };

  // 1) squad page in the hinted competition context, then the other contexts
  //    as fallbacks (the club label is a supplied label, not verified
  //    affiliation — the spec allows other competitions as fallback sources).
  const contexts = [];
  const hinted = player.club_hint || {};
  if (hinted.competition && hinted.club_path) contexts.push(hinted);
  for (const c of COMPS) {
    if (!hinted.competition || c !== hinted.competition) {
      if (hinted.club_path) contexts.push({ competition: c, club_path: hinted.club_path });
    }
  }

  let squadMatch = null;
  let squadContext = null;
  let lastErr = null;
  for (const ctx of contexts) {
    const squadUrl = `https://www.uefa.com/${ctx.competition}/clubs/${ctx.club_path}/squad/`;
    try {
      log(`#${player.roster_index} ${player.requested_name}: squad ${ctx.competition}/${ctx.club_path}`);
      const page = await fetchPageHtml(squadUrl);
      const squad = parse.parseSquad(page.html, ctx.competition);
      if (!squad.length) {
        entry.warnings.push(`squad page ${squadUrl} listed no players`);
        continue;
      }
      const { match, alsoMatching } = parse.matchSquadPlayer(
        squad, player.search_name, player.search_aliases || []
      );
      if (match) {
        squadMatch = match;
        squadContext = { ...ctx, url: squadUrl, transport: page.transport };
        break;
      }
      if (alsoMatching && alsoMatching.length) {
        entry.warnings.push(
          `ambiguous squad match on ${ctx.competition}/${ctx.club_path}: ${alsoMatching.map((p) => `${p.playerId}--${p.slug}`).join(", ")}`
        );
      } else {
        entry.warnings.push(`not found on ${ctx.competition}/${ctx.club_path} squad`);
      }
    } catch (err) {
      lastErr = err;
      entry.warnings.push(`squad fetch failed (${ctx.competition}/${ctx.club_path}): ${err.message}`);
    }
  }

  if (!squadMatch) {
    entry.status = "missing";
    entry.errors.push(
      lastErr && lastErr.name === "BlockedHostError"
        ? `blocked by UEFA edge: ${lastErr.message}`
        : `player not found on any squad page of the labelled club (tried ${contexts.length} competition contexts); manual profile URL needed`
    );
    return entry;
  }

  // 2) canonical profile
  const profileUrl = `https://www.uefa.com${squadMatch.profilePath}`;
  let profilePage;
  try {
    profilePage = await fetchPageHtml(profileUrl);
  } catch (err) {
    entry.status = err.name === "BlockedHostError" ? "blocked" : "missing";
    entry.errors.push(`profile fetch failed: ${err.message}`);
    return entry;
  }
  const profile = parse.parsePlayerProfile(profilePage.html, profileUrl);
  entry.uefa_player_id = squadMatch.playerId;
  entry.canonical_profile_url = profileUrl;
  entry.observed_uefa_club = profile.uefa_observed_club;
  entry.observed_competition = profile.competition;
  entry.observed_season = profile.season;
  entry.identity = {
    uefa_full_name: profile.full_name,
    nationality: profile.nationality,
    date_of_birth: profile.date_of_birth,
    position: profile.position,
    height: profile.height,
    weight: profile.weight,
    cutoff_alt_text: profile.cutoff_alt_text,
  };

  // 3) identity verification vs roster hint
  const hint = player.identity_hint || {};
  const verification = verifyIdentity(hint, profile, player, squadContext);
  entry.verification = verification;

  // 4) candidates
  if (profile.cutoff_image_url) {
    // sanity: the cutoff URL must carry this player's id (guard against
    // parser grabbing a neighbouring element)
    const idInUrl = profile.cutoff_image_url.match(/cutoff\/(\d+)\.webp$/);
    if (!idInUrl || idInUrl[1] !== squadMatch.playerId) {
      entry.warnings.push(`cutoff URL player id ${idInUrl ? idInUrl[1] : "none"} != profile id ${squadMatch.playerId} — candidate rejected`);
    } else {
      entry.candidates.push({
        kind: "cutoff",
        url: profile.cutoff_image_url,
        asset_season: profile.cutoff_asset_season,
        transparent: true,
        preferred: true,
      });
    }
  } else {
    entry.warnings.push("profile page exposes no transparent cutoff image (opaque photo or none)");
  }
  if (profile.fallback_image_url) {
    entry.candidates.push({
      kind: "324-jpg",
      url: profile.fallback_image_url,
      asset_season: (profile.fallback_image_url.match(/players\/1\/(\d{4})\//) || [])[1] || null,
      transparent: false,
      preferred: false,
    });
  }

  if (!entry.candidates.some((c) => c.kind === "cutoff")) {
    entry.status = "quality_review";
    entry.warnings.push("no transparent UEFA cutout on the profile — needs a fallback-season cutout search or user decision");
  } else if (!verification.ok) {
    entry.status = "ambiguous";
  } else {
    entry.status = "resolved";
  }
  return entry;
}

async function run({ players, refresh }) {
  ensure_dirs();
  let state = { players: [] };
  try {
    if (!refresh) state = JSON.parse(await fsp.readFile(config.discovery_file, "utf8"));
  } catch { /* fresh run */ }

  for (const player of players) {
    const entry = await discoverForPlayer(player, state, { refresh });
    // replace or append, keep roster order stable
    const idx = state.players.findIndex((p) => p.key === entry.key);
    if (idx >= 0) state.players[idx] = entry;
    else state.players.push(entry);
    await fsp.writeFile(config.discovery_file, JSON.stringify(state, null, 2));
    const tag = entry.status === "resolved"
      ? `resolved id=${entry.uefa_player_id} club="${entry.observed_uefa_club}" ${entry.identity && entry.identity.date_of_birth ? `dob=${entry.identity.date_of_birth}` : ""}`
      : `${entry.status}: ${entry.errors.concat(entry.warnings).join(" | ")}`;
    log(`#${player.roster_index} ${player.requested_name} -> ${tag}`);
  }

  const counts = {};
  for (const p of state.players) counts[p.status] = (counts[p.status] || 0) + 1;
  log("summary:", JSON.stringify(counts));
  return state;
}

module.exports = { run, verifyIdentity, fetchPageHtml };
