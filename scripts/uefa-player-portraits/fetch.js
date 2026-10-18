// fetch.js — Phase C (select best source + download verified originals to the
// gitignored cache).
//
// Only the transparent cutoff candidate from the player's own UEFA profile is
// accepted. Downloads are validated by content-type AND successful decoding
// (alpha expected), written atomically, and logged with sha256 for idempotent
// reruns.
//
// Season/segment probing (documented, bounded):
//   - Standard collections probe the observed seasons [2027, 2026, 2025]
//     on the cutoff URL's own competition segment.
//   - Collections that set collection.deep_season_probe (hero MVP
//     collections, whose players often last played UEFA football several
//     seasons ago) probe a deeper documented season set [2027 … 2020] across
//     ALL three known competition segments, preferring the player's observed
//     competition segment. Segments map to URL path positions observed on
//     live UEFA asset URLs: UCL = /players/1/, UEL = /players/14/,
//     UECL = /players/2019/.
// No arbitrary year sweeps: the set is fixed, ordered, and stops at the
// first valid image.
"use strict";

const fsp = require("fs/promises");
const path = require("path");
const { config, ensure_dirs } = require("./lib/config");
const transport = require("./lib/transport");
const images = require("./lib/images");

// Asset-season values observed on live UEFA pages/asset URLs.
const PROBE_SEASONS = ["2027", "2026", "2025"];
const DEEP_PROBE_SEASONS = ["2027", "2026", "2025", "2024", "2023", "2022", "2021", "2020"];
// Competition → URL segment observed on live img.uefa.com cutoff URLs.
const COMP_SEGMENTS = {
  uefachampionsleague: "1",
  uefaeuropaleague: "14",
  uefaconferenceleague: "2019",
};

function log(...args) {
  console.log("[fetch]", ...args);
}

function logEntry(paths) {
  try { return JSON.parse(require("fs").readFileSync(paths.fetch_log_file, "utf8")); }
  catch { return {}; }
}

async function saveLog(logdb, paths) {
  await images.writeFileAtomic(paths.fetch_log_file, Buffer.from(JSON.stringify(logdb, null, 2)));
}

async function fetchCandidate(url, destPath) {
  const res = await transport.get(url);
  const ct = (res.contentType || "").toLowerCase();
  if (!ct.startsWith("image/")) {
    throw new Error(`rejected: content-type "${res.contentType}" is not an image (possible HTML error page)`);
  }
  const check = await images.validateImageBuffer(res.body, { expectAlpha: true });
  if (!check.ok) {
    throw new Error(`rejected: ${check.problems.join("; ")}`);
  }
  await images.writeFileAtomic(destPath, res.body);
  return {
    url,
    fetched_at: new Date().toISOString(),
    source_width: check.meta.width,
    source_height: check.meta.height,
    source_has_alpha: Boolean(check.meta.hasAlpha),
    source_format: check.meta.format,
    source_sha256: images.sha256(res.body),
    bytes: res.body.length,
    download_transport: res.transport,
  };
}

// Build the ordered, bounded attempt list for one player.
function buildAttempts(entry, deepProbe) {
  const cutoff = (entry.candidates || []).find((c) => c.kind === "cutoff");
  // documented research hint: the (segment, season) of the player's last
  // UEFA registration IN THE TARGET CLUB — tried before any sweep
  const hint = entry.probe_hint
    ? {
        label: `researched probe (segment ${entry.probe_hint.segment}, season ${entry.probe_hint.season})`,
        url: `https://img.uefa.com/imgml/TP/players/${entry.probe_hint.segment}/${entry.probe_hint.season}/cutoff/${entry.uefa_player_id}.webp`,
        season: entry.probe_hint.season,
      }
    : null;
  if (hint && entry.uefa_player_id) {
    // BOUNDED hint search: the researched (segment, season) of the player's
    // last registration in the target club, its adjacent seasons on the same
    // segment, and the profile's own fallback-avatar location. No cross-
    // segment sweep: for a researched hint the sweep's extra finds are more
    // likely wrong-club kits than usable portraits.
    const seg = entry.probe_hint.segment;
    const base = Number(entry.probe_hint.season);
    const seasons = [base, base - 1, base + 1, base - 2].map(String);
    const attempts = [{ ...hint, probe: true }];
    for (const ssn of seasons) {
      if (ssn === String(base)) continue;
      attempts.push({
        probe: true,
        label: `adjacent to researched probe (segment ${seg}, season ${ssn})`,
        url: `https://img.uefa.com/imgml/TP/players/${seg}/${ssn}/cutoff/${entry.uefa_player_id}.webp`,
        season: ssn,
      });
    }
    const fb = (entry.candidates || []).find((c) => c.kind === "324-jpg");
    if (fb) {
      const fbUrl = fb.url.replace(/\/324x324\/(\d+)\.jpg/, "/cutoff/$1.webp");
      if (!attempts.some((a) => a.url === fbUrl)) {
        attempts.push({
          probe: true,
          label: "profile fallback-avatar location",
          url: fbUrl,
          season: (fbUrl.match(/\/(\d{4})\/cutoff\//) || [])[1] || null,
        });
      }
    }
    return attempts;
  }
  return buildSweepAttempts(entry, deepProbe);
}

function buildSweepAttempts(entry, deepProbe) {
  const cutoff = (entry.candidates || []).find((c) => c.kind === "cutoff");
  const seasons = deepProbe ? DEEP_PROBE_SEASONS : PROBE_SEASONS;

  if (cutoff) {
    // preferred: the transparent cutoff extracted from the player's own
    // profile, then the same observed URL pattern for adjacent documented
    // seasons (same competition segment), then — deep probe only — the
    // other known competition segments
    const seg = (cutoff.url.match(/\/players\/(\d+)\/\d{4}\/cutoff\//) || [])[1] || "1";
    const attempts = [
      { label: "profile cutoff", url: cutoff.url, season: cutoff.asset_season },
      ...seasons.filter((s) => s !== cutoff.asset_season).map((s) => ({
        label: `fallback season ${s}`,
        url: cutoff.url.replace(/\/(\d{4})\/cutoff\//, `/${s}/cutoff/`),
        season: s,
      })),
    ];
    if (deepProbe) {
      for (const otherSeg of ["1", "14", "2019"]) {
        if (otherSeg === seg) continue;
        for (const s of seasons) {
          attempts.push({
            label: `constructed cutoff segment ${otherSeg} season ${s}`,
            url: `https://img.uefa.com/imgml/TP/players/${otherSeg}/${s}/cutoff/${entry.uefa_player_id}.webp`,
            season: s,
          });
        }
      }
    }
    return attempts;
  }

  if (entry.uefa_player_id) {
    // the profile page exposed no cutoff image: probe the KNOWN cutoff URL
    // pattern (observed on live UEFA pages) with this player's verified UEFA
    // id. The starting hint is the profile's own fallback-avatar URL — its
    // (segment, season) is where UEFA's current asset for the player lives,
    // so the first probes hit the most likely location before any sweep.
    const fb = (entry.candidates || []).find((c) => c.kind === "324-jpg");
    const fbParts = fb ? (fb.url.match(/\/players\/(\d+)\/(\d{4})\//) || []) : [];
    let preferredSeg = fbParts[1] || COMP_SEGMENTS[entry.observed_competition] || "1";
    // observed_competition may be a display string ("UEFA Conference League
    // 2026/27") — map it back to a segment when COMP_SEGMENTS misses
    if (!fbParts[1] && !COMP_SEGMENTS[entry.observed_competition]) {
      if (/conference/i.test(entry.observed_competition || "")) preferredSeg = "2019";
      else if (/europa/i.test(entry.observed_competition || "")) preferredSeg = "14";
    }
    const preferredSeasons = fbParts[2]
      ? [fbParts[2], ...seasons.filter((s) => s !== fbParts[2])]
      : seasons;
    const segments = deepProbe ? [preferredSeg, ...["1", "14", "2019"].filter((s) => s !== preferredSeg)] : [preferredSeg];
    const attempts = [];
    for (const seg of segments) {
      for (const s of seg === preferredSeg ? preferredSeasons : seasons) {
        attempts.push({
          label: `constructed cutoff season ${s} segment ${seg} (profile has no cutoff image)`,
          url: `https://img.uefa.com/imgml/TP/players/${seg}/${s}/cutoff/${entry.uefa_player_id}.webp`,
          season: s,
        });
      }
    }
    return attempts;
  }

  return [];
}

async function fetchForPlayer(entry, logdb, { refresh, deepProbe, paths }) {
  const key = entry.key;
  const existing = logdb[key];
  const dest = path.join(paths.originals_dir, `${key}.webp`);

  const cachedOk =
    existing &&
    existing.status === "complete" &&
    existing.source_sha256 &&
    (await fsp.stat(dest).then(() => true).catch(() => false));
  if (cachedOk && !refresh) {
    log(`#${entry.roster_index} ${entry.requested_name}: cached original ${existing.source_sha256.slice(0, 12)}… reusing`);
    return existing;
  }

  const attempts = buildAttempts(entry, deepProbe);
  if (!attempts.length) {
    logdb[key] = {
      status: "missing",
      reason: "no transparent cutoff candidate and no verified UEFA player id",
      ...(existing || {}),
    };
    return logdb[key];
  }

  const warnings = [];
  let probeBreather = 0;
  for (const attempt of attempts) {
    // Bounded 404-probe sweeps (constructed URLs) are the most scrape-like
    // part of the pipeline — pace them MUCH slower than real page/image
    // fetches so UEFA's edge does not throttle the transport (observed:
    // bursts of rapid 404-probes trigger multi-minute access denials).
    if (attempt.probe) {
      // UEFA's edge starts refusing (403) after ~6-7 cutoff probes within a
      // rolling minute — pace probes at 15 s and breathe 90 s after every
      // five to stay clear of the threshold
      await new Promise((r) => setTimeout(r, 15000));
      probeBreather = (probeBreather || 0) + 1;
      if (probeBreather % 5 === 0) {
        await new Promise((r) => setTimeout(r, 90000));
      }
    }
    try {
      const info = await fetchCandidate(attempt.url, dest);
      probeBreather = 0;
      const cutoff = (entry.candidates || []).find((c) => c.kind === "cutoff");
      const out = {
        status: "complete",
        key,
        roster_index: entry.roster_index,
        source_image_url: attempt.url,
        source_asset_season: attempt.season,
        is_fallback_season: cutoff ? attempt.season !== cutoff.asset_season : false,
        ...info,
        warnings,
      };
      if (cutoff && attempt.season !== cutoff.asset_season) {
        warnings.push(`fallback asset season ${attempt.season} used (preferred season ${cutoff.asset_season} had no cutoff)`);
      }
      logdb[key] = out;
      log(
        `#${entry.roster_index} ${entry.requested_name}: ${attempt.label} OK ` +
        `${info.source_width}x${info.source_height} alpha=${info.source_has_alpha} sha=${info.source_sha256.slice(0, 12)}…`
      );
      return out;
    } catch (err) {
      if (err.name === "BlockedHostError") {
        logdb[key] = { status: "blocked", reason: err.message, ...(existing || {}) };
        return logdb[key];
      }
      if (err instanceof transport.HttpError && err.status === 404) {
        warnings.push(`${attempt.label}: 404 (missing candidate)`);
        continue;
      }
      warnings.push(`${attempt.label}: ${err.message}`);
      // transient failures were already retried inside transport.get
    }
  }

  logdb[key] = {
    status: "missing",
    key,
    roster_index: entry.roster_index,
    reason: `no acceptable transparent cutout after ${attempts.length} documented candidates`,
    warnings,
    ...(existing && existing.source_sha256 ? { previous: existing.source_sha256 } : {}),
  };
  return logdb[key];
}

async function run({ discovery, refresh, paths, deepProbe }) {
  ensure_dirs();
  require("fs").mkdirSync(require("path").dirname(paths.fetch_log_file), { recursive: true });
  const logdb = refresh ? {} : logEntry(paths);
  const out = [];
  // Self-healing for transient edge throttles: when the transport reports a
  // host block, pause for a few minutes, clear the in-process block state
  // and continue. Bounded to MAX_BLOCK_RECOVERIES; a persistent block still
  // aborts the run (spec §7: stop on real access denial).
  const MAX_BLOCK_RECOVERIES = 4;
  let blockRecoveries = 0;
  for (const entry of discovery.players) {
    if (entry.status === "resolved" || entry.status === "quality_review") {
      let r = await fetchForPlayer(entry, logdb, { refresh, deepProbe, paths });
      if (r.status === "blocked" && blockRecoveries < MAX_BLOCK_RECOVERIES) {
        blockRecoveries++;
        const waitMs = 180000 + blockRecoveries * 60000; // 4 min, 5 min, ...
        log(`transport blocked after ${entry.key} — pausing ${Math.round(waitMs / 1000)}s before retrying (recovery ${blockRecoveries}/${MAX_BLOCK_RECOVERIES})`);
        await new Promise((res) => setTimeout(res, waitMs));
        transport.clearBlocked();
        r = await fetchForPlayer(entry, logdb, { refresh, deepProbe, paths });
      }
      if (r.status === "blocked" && blockRecoveries >= MAX_BLOCK_RECOVERIES) {
        out.push(r);
        await saveLog(logdb, paths);
        log("persistent access denial — stopping the fetch run (re-run later; completed entries are cached)");
        break;
      }
      out.push(r);
      await saveLog(logdb, paths);
    } else {
      logdb[entry.key] = {
        status: "unresolved",
        reason: `discovery status ${entry.status}`,
        roster_index: entry.roster_index,
      };
      log(`#${entry.roster_index} ${entry.requested_name}: skipped (discovery: ${entry.status})`);
    }
  }
  const counts = {};
  for (const r of out) counts[r.status] = (counts[r.status] || 0) + 1;
  log("summary:", JSON.stringify(counts));
  return logdb;
}

module.exports = { run, fetchCandidate, PROBE_SEASONS, DEEP_PROBE_SEASONS, buildAttempts };
