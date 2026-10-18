// fetch.js — Phase C (select best source + download verified originals to the
// gitignored cache) of uefa-player-portraits.spec.md §6/§7.
//
// Only the transparent cutoff candidate from the player's own UEFA profile is
// accepted. Downloads are validated by content-type AND successful decoding
// (alpha expected), written atomically, and logged with sha256 for idempotent
// reruns. A small, documented fallback-season probe (observed UEFA asset
// seasons only, no arbitrary sweeps) is used when the profile has no cutoff.
"use strict";

const fsp = require("fs/promises");
const path = require("path");
const { config, ensure_dirs } = require("./lib/config");
const transport = require("./lib/transport");
const images = require("./lib/images");

// Asset-season values observed on live UEFA pages/asset URLs. The probe set
// is intentionally tiny and documented (spec §6 Phase C): the current-season
// identifier 2027 (2026/27) plus the two previous seasons.
const PROBE_SEASONS = ["2027", "2026", "2025"];

function log(...args) {
  console.log("[fetch]", ...args);
}

function logEntry() {
  try { return JSON.parse(require("fs").readFileSync(config.fetch_log_file, "utf8")); }
  catch { return {}; }
}

async function saveLog(logdb) {
  await images.writeFileAtomic(config.fetch_log_file, Buffer.from(JSON.stringify(logdb, null, 2)));
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

async function fetchForPlayer(entry, logdb, { refresh }) {
  const key = entry.key;
  const existing = logdb[key];
  const dest = path.join(config.originals_dir, `${key}.webp`);

  const cachedOk =
    existing &&
    existing.status === "complete" &&
    existing.source_sha256 &&
    (await fsp.stat(dest).then(() => true).catch(() => false));
  if (cachedOk && !refresh) {
    log(`#${entry.roster_index} ${entry.requested_name}: cached original ${existing.source_sha256.slice(0, 12)}… reusing`);
    return existing;
  }

  const cutoff = (entry.candidates || []).find((c) => c.kind === "cutoff");
  let attempts;
  if (cutoff) {
    // preferred: the transparent cutoff extracted from the player's own
    // profile, then the same observed URL pattern for adjacent documented
    // seasons (no arbitrary year sweeps)
    attempts = [
      { label: "profile cutoff", url: cutoff.url, season: cutoff.asset_season },
      ...PROBE_SEASONS.filter((s) => s !== cutoff.asset_season).map((s) => ({
        label: `fallback season ${s}`,
        url: cutoff.url.replace(/\/(\d{4})\/cutoff\//, `/${s}/cutoff/`),
        season: s,
      })),
    ];
  } else if (entry.uefa_player_id) {
    // the profile page exposed no cutoff image: probe the KNOWN cutoff URL
    // pattern (observed on live UEFA pages) with this player's verified UEFA
    // id across the small documented season set
    attempts = PROBE_SEASONS.map((s) => ({
      label: `constructed cutoff season ${s} (profile has no cutoff image)`,
      url: `https://img.uefa.com/imgml/TP/players/1/${s}/cutoff/${entry.uefa_player_id}.webp`,
      season: s,
    }));
  } else {
    logdb[key] = {
      status: "missing",
      reason: "no transparent cutoff candidate and no verified UEFA player id",
      ...(existing || {}),
    };
    return logdb[key];
  }

  const warnings = [];
  for (const attempt of attempts) {
    try {
      const info = await fetchCandidate(attempt.url, dest);
      const out = {
        status: "complete",
        key,
        roster_index: entry.roster_index,
        source_image_url: attempt.url,
        source_asset_season: attempt.season,
        is_fallback_season: attempt.season !== cutoff.asset_season,
        ...info,
        warnings,
      };
      if (attempt.season !== cutoff.asset_season) {
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

async function run({ discovery, refresh }) {
  ensure_dirs();
  const logdb = refresh ? {} : logEntry();
  const out = [];
  for (const entry of discovery.players) {
    if (entry.status === "resolved" || entry.status === "quality_review") {
      const r = await fetchForPlayer(entry, logdb, { refresh });
      out.push(r);
      await saveLog(logdb);
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

module.exports = { run, fetchCandidate, PROBE_SEASONS };
