// validate.js — verify the roster, files, image properties and provenance
// (uefa-player-portraits.spec.md §10/§13). Exits non-zero when any entry is
// unresolved or any acceptance criterion fails. The one documented exception:
// entries with status "deferred" — an explicit owner decision, recorded in the
// manifest with a deferral record (decided_at + reason) — are accepted as a
// known-incomplete outcome and reported as a note, not a failure.
"use strict";

const fsp = require("fs/promises");
const path = require("path");
const { config } = require("./lib/config");
const images = require("./lib/images");
const parse = require("./lib/parse");

function log(...args) {
  console.log("[validate]", ...args);
}

async function run({ roster, manifest }) {
  const failures = [];
  const notes = [];
  const ok = (cond, msg) => {
    if (!cond) failures.push(msg);
    return cond;
  };

  // --- roster integrity ---
  const players = roster.players;
  ok(players.length === 36, `roster must have exactly 36 entries (found ${players.length})`);
  const filenames = players.map((p) => p.filename);
  ok(new Set(filenames).size === filenames.length, "roster filenames must be unique");
  ok(
    filenames.every((f) => /^[a-z0-9-]+\.webp$/.test(f)),
    "roster filenames must be stable ASCII kebab-case .webp"
  );
  const indexes = players.map((p) => p.roster_index);
  ok(indexes.every((n, i) => n === i + 1), "roster order must be preserved (1..36 in order)");

  // --- manifest integrity ---
  ok(manifest.entries.length === 36, `manifest must contain one entry per requested player (found ${manifest.entries.length})`);
  const mIdx = manifest.entries.map((e) => e.roster_index);
  ok(mIdx.every((n, i) => n === i + 1), "manifest must preserve roster order");
  for (const p of players) {
    const e = manifest.entries.find((x) => x.filename === p.filename);
    ok(!!e, `manifest entry missing for ${p.filename}`);
    if (e) {
      ok(e.requested_name === (p.requested_name_display || p.requested_name), `manifest requested_name must match roster for ${p.filename}`);
      ok(e.requested_club_label === p.requested_club_label, `manifest club label must match roster for ${p.filename} (labels are never rewritten)`);
      ok(
        ["complete", "missing", "ambiguous", "blocked", "quality_review", "deferred"].includes(e.status),
        `invalid status on ${p.filename}`
      );
      if (e.status === "deferred") {
        ok(
          e.deferral && typeof e.deferral.decided_at === "string" && typeof e.deferral.reason === "string" &&
            e.deferral.reason.length > 0,
          `${p.filename}: deferred entries must carry a deferral record (decided_at + reason)`
        );
      }
    }
  }

  // --- identity uniqueness ---
  const ids = manifest.entries.filter((e) => e.uefa_player_id).map((e) => e.uefa_player_id);
  ok(new Set(ids).size === ids.length, "different players must not map to the same UEFA player id");
  const hashes = manifest.entries.filter((e) => e.source_sha256).map((e) => e.source_sha256);
  if (new Set(hashes).size !== hashes.length) {
    const seen = new Map();
    for (const e of manifest.entries) {
      if (e.source_sha256) {
        if (seen.has(e.source_sha256)) {
          failures.push(
            `IDENTICAL SOURCE HASH across ${seen.get(e.source_sha256)} and ${e.filename} — manual review required`
          );
        } else seen.set(e.source_sha256, e.filename);
      }
    }
  }

  // --- files and image properties ---
  const present = new Set();
  const dirEntries = await fsp.readdir(config.asset_dir).catch(() => []);
  const webpFiles = dirEntries.filter((f) => f.endsWith(".webp"));
  for (const f of webpFiles) {
    ok(filenames.includes(f), `unexpected portrait file in the asset dir: ${f}`);
  }
  for (const e of manifest.entries) {
    if (e.status !== "complete") {
      // unresolved entries must not have output metadata
      ok(e.output_sha256 == null && e.output_width == null, `unresolved entry ${e.filename} must not carry output metadata`);
      const stray = path.join(config.asset_dir, e.filename);
      const strayExists = await fsp.stat(stray).then(() => true).catch(() => false);
      ok(!strayExists, `unresolved entry ${e.filename} must not have a published portrait file`);
      continue;
    }
    // required provenance
    ok(e.uefa_player_id != null, `${e.filename}: missing uefa_player_id`);
    ok(e.canonical_profile_url && /^https:\/\/www\.uefa\.com\//.test(e.canonical_profile_url), `${e.filename}: missing/invalid canonical profile URL`);
    ok(e.source_image_url && /^https:\/\/img\.uefa\.com\/imgml\/TP\/players\//.test(e.source_image_url), `${e.filename}: source image must come from img.uefa.com`);
    ok(e.source_sha256 != null, `${e.filename}: missing source_sha256`);
    ok(e.fetched_at != null, `${e.filename}: missing fetched_at`);
    ok(e.identity_evidence && (e.identity_evidence.date_of_birth || e.identity_evidence.disambiguation), `${e.filename}: identity evidence must include DOB or a disambiguation explanation`);
    ok(e.source_has_alpha === true, `${e.filename}: source must have alpha transparency`);
    ok(e.normalization != null, `${e.filename}: missing normalization record`);
    ok(e.normalization && e.normalization.applied_scale <= 1, `${e.filename}: portrait must not be upscaled (scale > 1)`);
    ok(e.output_width === config.target_width && e.output_height === config.target_height, `${e.filename}: output must be ${config.target_width}x${config.target_height}`);

    const file = path.join(config.asset_dir, e.filename);
    const exists = await fsp.stat(file).then(() => true).catch(() => false);
    if (!ok(exists, `${e.filename}: published file missing`)) continue;
    present.add(e.filename);
    const buf = await fsp.readFile(file);
    const sha = images.sha256(buf);
    ok(sha === e.output_sha256, `${e.filename}: output sha256 mismatch (file changed after manifest generation?)`);
    const check = await images.validateImageBuffer(buf, { expectAlpha: true });
    ok(check.ok, `${e.filename}: output failed image validation — ${check.problems.join("; ")}`);
    if (check.meta) {
      ok(check.meta.format === "webp", `${e.filename}: output must be WebP (found ${check.meta.format})`);
      ok(check.meta.width === config.target_width && check.meta.height === config.target_height, `${e.filename}: wrong output dimensions ${check.meta.width}x${check.meta.height}`);
      ok(check.meta.hasAlpha === true, `${e.filename}: output must retain alpha transparency`);
    }
    // aspect-ratio preservation: output subject ratio vs source subject ratio
    if (e.normalization && e.normalization.source_subject_bounds && e.normalization.output_subject_size) {
      const sb = e.normalization.source_subject_bounds;
      const os = e.normalization.output_subject_size;
      const srcRatio = sb.w / sb.h;
      const outRatio = os.w / os.h;
      ok(Math.abs(srcRatio - outRatio) / srcRatio < 0.02, `${e.filename}: aspect ratio not preserved (src ${srcRatio.toFixed(3)} vs out ${outRatio.toFixed(3)})`);
    }
  }

  // --- resolution adequacy warnings (subject must fill the content box) ---
  for (const e of manifest.entries) {
    if (e.status === "complete" && e.normalization && e.normalization.scale_capped_at_one) {
      failures.push(
        `${e.filename}: source subject is smaller than the target content box — placed WITHOUT upscaling; ` +
        `user decision required (lower common resolution or explicitly permit upscaling)`
      );
    }
  }

  // --- resolution summary ---
  const counts = {};
  for (const e of manifest.entries) counts[e.status] = (counts[e.status] || 0) + 1;
  const complete = counts.complete || 0;
  const undocumented = manifest.entries.filter((e) => e.status !== "complete" && e.status !== "deferred");
  if (undocumented.length > 0) {
    failures.push(`collection is incomplete: ${complete}/36 complete (${JSON.stringify(counts)})`);
  } else if (counts.deferred) {
    // owner-accepted deferrals: honest incompleteness, documented per entry
    notes.push(
      `collection incomplete by owner decision: ${complete}/36 complete, ${counts.deferred} deferred ` +
        `(deferral records with reasons are in the manifest; re-run \`npm run portraits:fetch --refresh\` to retry)`
    );
  }

  log(`status counts: ${JSON.stringify(counts)}`);
  log(`published portrait files: ${present.size}`);
  if (notes.length) notes.forEach((n) => log("note:", n));

  if (failures.length) {
    console.error("\nVALIDATION FAILED:");
    for (const f of failures) console.error("  ✗ " + f);
    process.exitCode = 1;
    return { ok: false, failures, counts };
  }
  log("all acceptance checks passed");
  return { ok: true, failures: [], counts };
}

module.exports = { run };
