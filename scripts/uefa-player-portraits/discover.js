// discover.js — Phase A (resolve identities) + Phase B (extract portrait
// candidates). v2 adds three capabilities over the original 36-player flow:
//
//   1. Per-collection paths (lib/collection.js) — multiple rosters can share
//      the asset library with separate discovery/fetch state.
//   2. Candidate fallback (hero rosters): an entry may list ordered candidate
//      players (hero.candidates). The first candidate that resolves WITH a
//      transparent cutoff wins; every attempt is recorded in the warnings.
//   3. Direct profile-URL path: when the club is not in a current UEFA
//      competition (no squad page exists), the roster may carry a researched
//      canonical profile URL (uefa_profile_url). Identity verification then
//      REQUIRES a DOB hint (the squad-page context that normally anchors the
//      identity is absent) and the observed UEFA club is fuzzy-checked
//      against the requested club label (kit consistency for hero use).
//
// Writes <collection>/discovery.json. No assets published.
// Never enumerates numeric player IDs; every ID comes from a real squad page
// link or a researched canonical profile URL recorded in the roster.
"use strict";

const fsp = require("fs/promises");
const { config, ensure_dirs } = require("./lib/config");
const collection = require("./lib/collection");
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
function verifyIdentity(hint, profile, player, squadContext, { requireDob = false } = {}) {
  const notes = [];
  const problems = [];
  if (!profile.full_name) problems.push("UEFA profile has no readable name");
  if (!profile.date_of_birth) problems.push("UEFA profile has no readable date of birth");
  // A DOB hint is mandatory for direct profile-URL discovery UNLESS the URL
  // came from the player's own Wikipedia page (recorded editorial link —
  // the profile-side club check then anchors the identity)
  const wikiSourced = hint.profile_url_source === "wikipedia-player-page";
  if (requireDob && !hint.date_of_birth && !wikiSourced) {
    problems.push("direct profile-URL discovery requires a date-of-birth hint (no squad-page context to anchor the identity)");
  }

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

// Fuzzy club comparison for the hero kit-consistency check. UEFA profile
// "observed club" strings are short display names ("Paris", "Inter",
// "Bayern"), while roster labels are full provider names — compare on
// normalized token subsets plus a small alias table.
const CLUB_ALIAS_TOKENS = [
  [/internazionale/g, "inter"],
  [/paris saint germain/g, "paris psg"],
  [/bayern munchen/g, "bayern"],
  [/borussia dortmund/g, "dortmund bvb"],
  [/manchester united/g, "man utd"],
  [/manchester city/g, "man city"],
  [/bayer leverkusen/g, "leverkusen"],
  [/olympique de marseille/g, "marseille om"],
  [/olympique lyonnais/g, "lyon ol"],
  [/racing club de lens/g, "lens"],
  [/stade rennais/g, "rennes"],
  [/stade brestois/g, "brest"],
  [/real betis balompie/g, "betis"],
  [/club atletico de madrid/g, "atletico"],
  [/athletic club/g, "bilbao athletic"],
  [/deportivo alaves/g, "alaves"],
  [/rc celta de vigo/g, "celta"],
  [/real sociedad de futbol/g, "sociedad"],
  [/as roma/g, "roma"],
  [/ac milan/g, "milan"],
  [/fc internazionale milano/g, "inter"],
  [/ssc napoli/g, "napoli"],
  [/atalanta bc/g, "atalanta"],
  [/como 1907/g, "como"],
  [/sc freiburg/g, "freiburg"],
  [/rb leipzig/g, "leipzig"],
  [/vfb stuttgart/g, "stuttgart"],
  [/tsg 1899 hoffenheim/g, "hoffenheim"],
  [/borussia monchengladbach/g, "monchengladbach"],
  [/lille osc/g, "lille"],
  [/as monaco/g, "monaco"],
  [/eintracht frankfurt/g, "frankfurt"],
  [/sv werder bremen/g, "bremen"],
  [/hamburger sv/g, "hamburg"],
  [/1 fc koln/g, "koln"],
  [/fc schalke 04/g, "schalke"],
  [/tottenham hotspur/g, "tottenham spurs"],
  [/brighton hove albion/g, "brighton"],
  [/nottingham forest/g, "forest nottingham"],
  [/crystal palace/g, "palace crystal"],
  [/afc bournemouth/g, "bournemouth"],
  [/sunderland afc/g, "sunderland"],
  [/newcastle united/g, "newcastle"],
  [/aston villa/g, "villa aston"],
  [/west ham united/g, "west ham"],
  [/racing club de santander/g, "santander racing"],
];
const CLUB_STOP_TOKENS = new Set(["fc", "cf", "ac", "afc", "bc", "sc", "ssc", "as", "ca", "rc", "rcd", "ud", "cd", "sv", "tsg", "vfb", "fsv", "kv", "sk", "fk", "bk", "if", "aif", "calcio", "de", "balompie", "futbol", "club", "1", "04", "05", "07", "09", "18", "29", "1899", "1907", "1909", "1913", "1901", "1903", "1906", "the"]);

// Token-level canonicalization for UEFA's short display names ("Atleti",
// "B. Dortmund") vs full provider names ("Club Atlético de Madrid").
const CLUB_TOKEN_ALIASES = {
  atleti: "atletico",
  bilbao: "athletic",
  psg: "paris",
  bvb: "dortmund",
  nerazzurri: "inter",
  rossoneri: "milan",
  villarreal: "villarreal",
  wolves: "wolverhampton",
  spurs: "tottenham",
  magpies: "newcastle",
  forest: "nottingham",
};

function clubTokens(name) {
  let s = parse.normalizeName(name || "");
  for (const [re, rep] of CLUB_ALIAS_TOKENS) s = s.replace(re, rep);
  return s
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 1 && !CLUB_STOP_TOKENS.has(t))
    .map((t) => CLUB_TOKEN_ALIASES[t] || t);
}

// true when the tokens of one club name are a subset/superset of the other's
// (with at least one meaningful token), or they share >= 2 meaningful tokens.
function clubMatches(labelA, labelB) {
  const a = new Set(clubTokens(labelA));
  const b = new Set(clubTokens(labelB));
  if (!a.size || !b.size) return false;
  let shared = 0;
  for (const t of a) if (b.has(t)) shared++;
  if (shared === 0) return false;
  const subset = [...a].every((t) => b.has(t)) || [...b].every((t) => a.has(t));
  return subset || shared >= 2;
}

// Resolve ONE candidate player through the available paths.
// Returns { ok, entry-fields..., cutoffFound } without touching state.
async function resolveCandidate({ player, candidate, entry }) {
  const warnings = [];
  const errors = [];
  const aliases = candidate.aliases || [];
  const searchName = candidate.search_name || parse.normalizeName(candidate.name);
  const hint = candidate.identity_hint || {};

  let squadMatch = null;
  let squadContext = null;
  let profileUrl = null;

  // Path 1: squad page of the hinted club (current UEFA competitions)
  if (player.club_hint && player.club_hint.club_path) {
    const contexts = [];
    const hinted = player.club_hint;
    if (hinted.competition && hinted.club_path) contexts.push(hinted);
    for (const c of COMPS) {
      if (!hinted.competition || c !== hinted.competition) {
        contexts.push({ competition: c, club_path: hinted.club_path });
      }
    }
    let lastErr = null;
    for (const ctx of contexts) {
      const squadUrl = `https://www.uefa.com/${ctx.competition}/clubs/${ctx.club_path}/squad/`;
      try {
        const page = await fetchPageHtml(squadUrl);
        const squad = parse.parseSquad(page.html, ctx.competition);
        if (!squad.length) {
          warnings.push(`squad page ${squadUrl} listed no players`);
          continue;
        }
        const { match, alsoMatching } = parse.matchSquadPlayer(squad, searchName, aliases);
        if (match) {
          squadMatch = match;
          squadContext = { ...ctx, url: squadUrl, transport: page.transport };
          break;
        }
        if (alsoMatching && alsoMatching.length) {
          warnings.push(
            `ambiguous squad match on ${ctx.competition}/${ctx.club_path}: ${alsoMatching.map((p) => `${p.playerId}--${p.slug}`).join(", ")}`
          );
        } else {
          warnings.push(`not found on ${ctx.competition}/${ctx.club_path} squad`);
        }
      } catch (err) {
        lastErr = err;
        warnings.push(`squad fetch failed (${ctx.competition}/${ctx.club_path}): ${err.message}`);
      }
    }
    if (!squadMatch && lastErr && lastErr.name === "BlockedHostError") {
      errors.push(`blocked by UEFA edge: ${lastErr.message}`);
    }
  }

  // Path 2: researched canonical profile URL (clubs without a current squad
  // page). A profile only resolves under the competition context of the
  // player's last UEFA registration — the same (id, slug) can 404 in one
  // context and 200 in another, so the other contexts are tried on 404.
  const directUrl = candidate.uefa_profile_url || null;
  if (!squadMatch && directUrl) {
    profileUrl = directUrl;
  }
  let directContextTried = [];

  if (!squadMatch && !profileUrl) {
    return {
      resolved: false,
      status: "missing",
      warnings,
      errors: errors.length ? errors : [
        `player not found on any squad page of the labelled club and no researched profile URL provided${player.club_hint ? "" : " (club not in a current UEFA competition)"}`,
      ],
    };
  }

  if (!profileUrl) profileUrl = `https://www.uefa.com${squadMatch.profilePath}`;
  let profilePage = null;
  let profileErr = null;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      profilePage = await fetchPageHtml(profileUrl);
      break;
    } catch (err) {
      profileErr = err;
      if (err.name === "BlockedHostError") break;
      // 404 on a researched URL: try the other competition contexts
      const m = profileUrl.match(/\/\/(www\.uefa\.com)\/([a-z]+)\/(clubs\/players\/\d+(?:--[^\/]*)?\/?)$/);
      if (m && attempt < 3) {
        directContextTried.push(m[2]);
        const others = ["uefaeuropaleague", "uefaconferenceleague", "uefachampionsleague"].filter(
          (c) => !directContextTried.includes(c) && c !== m[2]
        );
        if (others.length) {
          profileUrl = `https://${m[1]}/${others[0]}/${m[3]}`;
          warnings.push(`profile 404 under ${m[2]} context — retrying under ${others[0]}`);
          continue;
        }
      }
      break;
    }
  }
  if (!profilePage) {
    const err = profileErr || new Error("profile fetch failed");
    return {
      resolved: false,
      status: err.name === "BlockedHostError" ? "blocked" : "missing",
      warnings,
      errors: [`profile fetch failed: ${err.message}`],
    };
  }
  const profile = parse.parsePlayerProfile(profilePage.html, profileUrl);
  // player id from the URL — canonical slugged form (250066886--ousmane-dembele)
  // or the bare form (250066886) that UEFA redirects to the slugged one
  const playerId = (profileUrl.match(/players\/(\d+)(?:--[^/]*)?\//) || [])[1];

  // identity verification vs the candidate hint
  const requireDob = !squadMatch; // direct-URL path has no squad anchor
  const wikiSourcedUrl = hint.profile_url_source === "wikipedia-player-page" ||
    (candidate.uefa_profile_url && candidate.uefa_profile_url_provenance === "wikipedia-player-page");
  // Generic-shell profiles: players with no current UEFA registration can
  // serve a competition-context page that carries NO name/DOB fields (only
  // the fallback avatar). For researched (Wikipedia-sourced) URLs the
  // identity rests on that provenance + the post-fetch kit review; the
  // limitation is recorded, not silently ignored.
  const profileIsShell = !profile.full_name && !profile.date_of_birth;
  const verification = profileIsShell && wikiSourcedUrl
    ? {
        ok: true,
        problems: [],
        notes: [
          "GENERIC SHELL PROFILE: the player has no current UEFA registration; the profile page carries no name/DOB fields. Identity anchored by the researched URL provenance (Wikipedia player page); kit/club consistency MUST be verified visually post-fetch (VLM review) before publication",
        ],
      }
    : verifyIdentity(hint, profile, player, squadContext, { requireDob });
  if (requireDob && wikiSourcedUrl && !profileIsShell) {
    verification.notes.push("profile URL researched from the player's Wikipedia page (recorded editorial link); identity anchored by name + observed-club check, DOB recorded from the UEFA profile");
  }
  warnings.push(...verification.notes, ...verification.problems);

  // cutoff candidates
  const cutoffs = [];
  if (profile.cutoff_image_url) {
    const idInUrl = profile.cutoff_image_url.match(/cutoff\/(\d+)\.webp$/);
    if (!idInUrl || idInUrl[1] !== playerId) {
      warnings.push(`cutoff URL player id ${idInUrl ? idInUrl[1] : "none"} != profile id ${playerId} — candidate rejected`);
    } else {
      cutoffs.push({
        kind: "cutoff",
        url: profile.cutoff_image_url,
        asset_season: profile.cutoff_asset_season,
        transparent: true,
        preferred: true,
      });
    }
  } else {
    warnings.push("profile page exposes no transparent cutoff image (opaque photo or none)");
  }
  const fallbacks = [];
  if (profile.fallback_image_url) {
    fallbacks.push({
      kind: "324-jpg",
      url: profile.fallback_image_url,
      asset_season: (profile.fallback_image_url.match(/players\/1\/(\d{4})\//) || [])[1] || null,
      transparent: false,
      preferred: false,
    });
  }

  // hero kit-consistency: the observed UEFA club must match the requested
  // club label (fuzzy). Only checked when the roster declares a hero club.
  let clubOk = true;
  if (player.hero && player.hero.club_display && profile.uefa_observed_club) {
    if (!clubMatches(player.hero.club_display, profile.uefa_observed_club)) {
      clubOk = false;
      warnings.push(
        `KIT/CLUB MISMATCH: observed UEFA club "${profile.uefa_observed_club}" does not match the requested club "${player.hero.club_display}" — portrait would show a different club's kit`
      );
    }
  }

  const cutoffFound = cutoffs.length > 0;
  let status;
  if (!cutoffFound) status = "quality_review";
  else if (!verification.ok) status = "ambiguous";
  else if (!clubOk) status = "quality_review";
  else status = "resolved";

  return {
    resolved: status === "resolved",
    status,
    playerId,
    profileUrl,
    profile,
    verification,
    cutoffs,
    fallbacks,
    warnings,
    errors,
  };
}

async function discoverForPlayer(player, state, { refresh, paths }) {
  // heroes are keyed by their stable club slug (state_key); plain roster
  // entries are keyed by the filename base (player name)
  const key = player.state_key || player.filename.replace(/\.webp$/, "");
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
    probe_hint: player.probe_hint || null,
    hero: player.hero
      ? {
          club_slug: player.hero.club_slug || null,
          club_display: player.hero.club_display || player.requested_club_label,
          league: player.hero.league || null,
          selection_basis: player.hero.selection_basis || null,
          chosen_candidate: null,
          candidates_considered: (player.hero.candidates || []).map((c) => (typeof c === "string" ? c : c.name)),
        }
      : null,
    warnings: [],
    errors: [],
  };

  // ordered candidate list: hero rosters may carry several; plain rosters
  // always have exactly one (the requested player)
  const candidateList = [];
  if (player.hero && Array.isArray(player.hero.candidates) && player.hero.candidates.length) {
    for (const c of player.hero.candidates) {
      candidateList.push(typeof c === "string" ? { name: c } : c);
    }
  } else {
    candidateList.push({
      name: player.requested_name_display || player.requested_name,
      search_name: player.search_name,
      aliases: player.search_aliases,
      uefa_profile_url: player.uefa_profile_url,
      identity_hint: player.identity_hint,
    });
  }

  let attempts = [];
  let last = null;
  let best = null; // best non-resolved outcome (quality_review beats missing)
  let bestCandidateName = null;
  for (let i = 0; i < candidateList.length; i++) {
    const candidate = candidateList[i];
    // the entry-level hint/profile URL apply to the first candidate
    if (i === 0) {
      if (!candidate.uefa_profile_url && player.uefa_profile_url) candidate.uefa_profile_url = player.uefa_profile_url;
      if (!candidate.identity_hint && player.identity_hint) candidate.identity_hint = player.identity_hint;
      if (!candidate.search_name && player.search_name && candidate.name === (player.requested_name_display || player.requested_name)) candidate.search_name = player.search_name;
      if (!candidate.aliases && player.search_aliases && candidate.name === (player.requested_name_display || player.requested_name)) candidate.aliases = player.search_aliases;
    }
    const result = await resolveCandidate({ player, candidate, entry });
    last = result;
    attempts.push({ candidate: candidate.name, status: result.status, resolved: !!result.resolved });

    if (result.resolved) {
      entry.status = "resolved";
      entry.uefa_player_id = result.playerId;
      entry.canonical_profile_url = result.profileUrl;
      entry.observed_uefa_club = result.profile.uefa_observed_club;
      entry.observed_competition = result.profile.competition;
      entry.observed_season = result.profile.season;
      entry.identity = {
        uefa_full_name: result.profile.full_name,
        nationality: result.profile.nationality,
        date_of_birth: result.profile.date_of_birth,
        position: result.profile.position,
        height: result.profile.height,
        weight: result.profile.weight,
        cutoff_alt_text: result.profile.cutoff_alt_text,
      };
      entry.verification = result.verification;
      entry.candidates = [...result.cutoffs, ...result.fallbacks];
      entry.warnings.push(...result.warnings);
      if (entry.hero) entry.hero.chosen_candidate = candidate.name;
      if (i > 0) {
        entry.warnings.push(
          `fallback candidate used: "${candidate.name}" (primary candidate(s) ${attempts.slice(0, i).map((a) => `"${a.candidate}" (${a.status})`).join(", ")} had no acceptable cutout)`
        );
      }
      return entry;
    }

    // not resolved — record why and try the next candidate
    entry.warnings.push(
      `candidate "${candidate.name}" not usable (${result.status}): ${(result.errors && result.errors.length ? result.errors.join("; ") : result.warnings.slice(-2).join("; "))}`
    );
    if (result.status === "blocked") {
      entry.status = "blocked";
      entry.errors.push(...(result.errors || []));
      return entry;
    }
    if (result.status === "quality_review" && !best) {
      best = result;
      bestCandidateName = candidate.name;
    }
  }

  // all candidates failed — carry the BEST fetchable candidate's structured
  // data (a quality_review candidate with a profile/id can still yield a
  // portrait via the bounded probe sweep); if none, the last candidate's
  const final = best || last;
  entry.status = (final && final.status) || "missing";
  if (final === best && best) entry.hero && (entry.hero.chosen_candidate = bestCandidateName);
  if (final && final.playerId) {
    entry.uefa_player_id = final.playerId;
    entry.canonical_profile_url = final.profileUrl;
    entry.observed_uefa_club = final.profile && final.profile.uefa_observed_club;
    entry.observed_competition = final.profile && final.profile.competition;
    entry.identity = final.profile
      ? {
          uefa_full_name: final.profile.full_name,
          nationality: final.profile.nationality,
          date_of_birth: final.profile.date_of_birth,
          position: final.profile.position,
        }
      : null;
    entry.verification = final.verification;
    entry.candidates = [...(final.cutoffs || []), ...(final.fallbacks || [])];
    // merge the final candidate's detailed warnings (kit mismatches, missing
    // cutoffs, verification notes) — the summary line alone is not enough
    entry.warnings.push(...((final && final.warnings) || []));
  }
  if (final && final.errors) entry.errors.push(...final.errors);
  if (entry.status === "missing" && !entry.errors.length) {
    entry.errors.push("no candidate resolved with an acceptable transparent cutout");
  }
  return entry;
}

async function run({ players, refresh, paths, rosterFile }) {
  ensure_dirs();
  paths = paths || collection.forRoster({ players }, rosterFile);
  require("fs").mkdirSync(require("path").dirname(paths.discovery_file), { recursive: true });
  let state = { players: [] };
  try {
    if (!refresh) state = JSON.parse(await fsp.readFile(paths.discovery_file, "utf8"));
  } catch { /* fresh run */ }

  for (const player of players) {
    const entry = await discoverForPlayer(player, state, { refresh, paths });
    // replace or append, keep roster order stable
    const idx = state.players.findIndex((p) => p.key === entry.key);
    if (idx >= 0) state.players[idx] = entry;
    else state.players.push(entry);
    await fsp.writeFile(paths.discovery_file, JSON.stringify(state, null, 2));
    const tag = entry.status === "resolved"
      ? `resolved id=${entry.uefa_player_id} club="${entry.observed_uefa_club}" ${entry.identity && entry.identity.date_of_birth ? `dob=${entry.identity.date_of_birth}` : ""}`
      : `${entry.status}: ${entry.errors.concat(entry.warnings.slice(-1)).join(" | ")}`;
    log(`#${player.roster_index} ${player.requested_name} -> ${tag}`);
  }

  const counts = {};
  for (const p of state.players) counts[p.status] = (counts[p.status] || 0) + 1;
  log("summary:", JSON.stringify(counts));
  return state;
}

module.exports = { run, verifyIdentity, fetchPageHtml, clubMatches };
