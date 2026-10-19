// validate.js — verify the roster, files, image properties and provenance.
// Exits non-zero when any entry is unresolved or any acceptance criterion
// fails. Documented exceptions:
//   - status "deferred": an explicit owner decision, recorded in the
//     manifest with a deferral record (decided_at + reason) — accepted as a
//     known-incomplete outcome and reported as a note, not a failure;
//   - alt_source entries (spec v2.1 §8b): UEFA carries no asset for the
//     club's candidates; the portrait comes from a league-official platform
//     instead. Provenance must name the platform and its player reference,
//     the source URL must match that platform's CDN, and the no-upscale
//     rule may be lifted ONLY by the per-entry allow_upscale flag.
//
// v2 (multi-collection library):
//   - roster counts are taken from the roster file, not hardcoded;
//   - the published asset directory is a LIBRARY shared by all collections:
//     a portrait file is expected when it belongs to THIS roster (complete
//     entry) or to a complete entry of any other manifest present in the
//     directory; any other file is flagged as unexpected;
//   - hero collections additionally validate hero-clubs.json against the
//     manifest (one club key per hero entry, coherent statuses, portrait
//     URLs only for complete entries).
"use strict";

const fsp = require("fs/promises");
const path = require("path");
const { config } = require("./lib/config");
const images = require("./lib/images");
const parse = require("./lib/parse");

function log(...args) {
  console.log("[validate]", ...args);
}

// Union of filenames that other manifests in the asset dir have published.
async function libraryFilenames(excludeManifestFile) {
  const names = new Set();
  let dirEntries = [];
  try { dirEntries = await fsp.readdir(config.asset_dir); } catch { return names; }
  for (const f of dirEntries.filter((x) => /^manifest.*\.json$/.test(x))) {
    const full = path.join(config.asset_dir, f);
    if (path.resolve(full) === path.resolve(excludeManifestFile)) continue;
    try {
      const m = JSON.parse(await fsp.readFile(full, "utf8"));
      for (const e of m.entries || []) {
        if (e.status === "complete" || e.status === "deferred") names.add(e.filename);
      }
    } catch { /* unreadable manifest — ignore, files checked per-roster */ }
  }
  return names;
}

async function run({ roster, manifest, paths }) {
  paths = paths || {
    manifest_file: path.join(config.asset_dir, "manifest.json"),
    hero_output: false,
    hero_map_file: path.join(config.asset_dir, "hero-clubs.json"),
  };
  const failures = [];
  const notes = [];
  const ok = (cond, msg) => {
    if (!cond) failures.push(msg);
    return cond;
  };

  // --- roster integrity ---
  const players = roster.players;
  ok(players.length >= 1, `roster must have at least one entry (found ${players.length})`);
  const filenames = players.map((p) => p.filename);
  ok(new Set(filenames).size === filenames.length, "roster filenames must be unique");
  ok(
    filenames.every((f) => /^[a-z0-9-]+\.webp$/.test(f)),
    "roster filenames must be stable ASCII kebab-case .webp"
  );
  const indexes = players.map((p) => p.roster_index);
  ok(indexes.every((n, i) => n === i + 1), "roster order must be preserved (1..N in order)");

  // --- manifest integrity ---
  ok(manifest.entries.length === players.length, `manifest must contain one entry per requested player (found ${manifest.entries.length}, roster has ${players.length})`);
  const mIdx = manifest.entries.map((e) => e.roster_index);
  ok(mIdx.every((n, i) => n === i + 1), "manifest must preserve roster order");
  // hero fallbacks publish under the chosen candidate's name, so manifest
  // filenames can differ from roster filenames — entries are matched by
  // roster_index (order-preserving) and filenames must still be unique
  const mFilenames = manifest.entries.map((e) => e.filename);
  ok(new Set(mFilenames).size === mFilenames.length, "manifest filenames must be unique within the collection");
  ok(
    mFilenames.every((f) => /^[a-z0-9-]+\.webp$/.test(f)),
    "manifest filenames must be stable ASCII kebab-case .webp"
  );
  for (const p of players) {
    const e = manifest.entries[p.roster_index - 1];
    ok(!!e, `manifest entry missing for ${p.filename}`);
    if (e) {
      ok(e.requested_name === (p.requested_name_display || p.requested_name), `manifest requested_name must match roster for ${p.filename}`);
      ok(e.requested_club_label === p.requested_club_label, `manifest club label must match roster for ${p.filename} (labels are never rewritten)`);
      ok(
        ["complete", "missing", "ambiguous", "blocked", "quality_review", "deferred", "no_asset"].includes(e.status),
        `invalid status on ${p.filename}`
      );
      if (e.status === "deferred") {
        ok(
          e.deferral && typeof e.deferral.decided_at === "string" && typeof e.deferral.reason === "string" &&
            e.deferral.reason.length > 0,
          `${p.filename}: deferred entries must carry a deferral record (decided_at + reason)`
        );
      }
      if (e.status === "no_asset") {
        ok(
          e.no_asset && typeof e.no_asset.verified_at === "string" && typeof e.no_asset.evidence === "string" &&
            e.no_asset.evidence.length > 0,
          `${p.filename}: no_asset entries must carry a verification record (verified_at + evidence)`
        );
      }
      // hero entries must carry their club mapping
      if (p.hero) {
        ok(e.hero && e.hero.club_slug === (p.hero.club_slug || null), `${p.filename}: hero entry must record the club slug`);
      }
    }
  }

  // --- identity uniqueness (within this collection) ---
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

  // --- files and image properties (library-aware) ---
  const present = new Set();
  const library = await libraryFilenames(paths.manifest_file);
  const dirEntries = await fsp.readdir(config.asset_dir).catch(() => []);
  const webpFiles = dirEntries.filter((f) => f.endsWith(".webp"));
  for (const f of webpFiles) {
    ok(filenames.includes(f) || mFilenames.includes(f) || library.has(f), `unexpected portrait file in the asset dir: ${f}`);
  }
  for (const e of manifest.entries) {
    if (e.status !== "complete") {
      // unresolved entries must not have output metadata
      ok(e.output_sha256 == null && e.output_width == null, `unresolved entry ${e.filename} must not carry output metadata`);
      const stray = path.join(config.asset_dir, e.filename);
      const strayExists = await fsp.stat(stray).then(() => true).catch(() => false);
      const fromOtherCollection = library.has(e.filename);
      ok(!strayExists || fromOtherCollection, `unresolved entry ${e.filename} must not have a published portrait file`);
      continue;
    }
    // required provenance
    if (e.alt_source) {
      // league-official alternative source (spec v2.1 §8b)
      const PLATFORM_URL_PREFIXES = {
        "premierleague.com": ["https://resources.premierleague.com/"],
        "laliga.com": ["https://assets.laliga.com/"],
        "legaseriea.it": ["https://media-sdp.legaseriea.it/"],
        "bundesliga.com": ["https://assets.bundesliga.com/"],
        "ligue1.fr": [], // S3 bucket URLs vary — host suffix checked below
      };
      ok(e.alt_source.platform && PLATFORM_URL_PREFIXES.hasOwnProperty(e.alt_source.platform),
        `${e.filename}: alt_source.platform must be a supported league-official platform`);
      ok(typeof e.alt_source.platform_player_ref === "string" && e.alt_source.platform_player_ref.length > 0,
        `${e.filename}: alt_source must carry the platform player reference`);
      const prefixes = PLATFORM_URL_PREFIXES[e.alt_source.platform] || [];
      const urlOk = e.source_image_url &&
        (prefixes.some((p) => e.source_image_url.startsWith(p)) ||
          (e.alt_source.platform === "ligue1.fr" && /\.ligue1\.fr|^https:\/\/s3\.[^/]*\.amazonaws\.com\/(ligue1\.image|image\.mpg)\//.test(e.source_image_url)));
      ok(urlOk, `${e.filename}: source image must come from the ${e.alt_source.platform} platform CDN`);
      // UEFA ids are optional for players never registered in UEFA comps —
      // but when present must look sane
      if (e.uefa_player_id != null) {
        ok(/^\d+$/.test(String(e.uefa_player_id)), `${e.filename}: uefa_player_id must be numeric`);
      }
      if (e.normalization && e.normalization.applied_scale > 1) {
        ok(e.alt_source.allow_upscale === true,
          `${e.filename}: upscale only allowed with the per-entry alt_source.allow_upscale flag`);
      }
    } else {
      ok(e.uefa_player_id != null, `${e.filename}: missing uefa_player_id`);
      ok(e.canonical_profile_url && /^https:\/\/www\.uefa\.com\//.test(e.canonical_profile_url), `${e.filename}: missing/invalid canonical profile URL`);
      ok(e.source_image_url && /^https:\/\/img\.uefa\.com\/imgml\/TP\/players\//.test(e.source_image_url), `${e.filename}: source image must come from img.uefa.com`);
      ok(e.normalization && e.normalization.applied_scale <= 1, `${e.filename}: portrait must not be upscaled (scale > 1)`);
    }
    ok(e.source_sha256 != null, `${e.filename}: missing source_sha256`);
    ok(e.fetched_at != null, `${e.filename}: missing fetched_at`);
    ok(e.identity_evidence && (e.identity_evidence.date_of_birth || e.identity_evidence.disambiguation), `${e.filename}: identity evidence must include DOB or a disambiguation explanation`);
    ok(e.source_has_alpha === true, `${e.filename}: source must have alpha transparency`);
    ok(e.normalization != null, `${e.filename}: missing normalization record`);
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

  // --- hero-clubs.json consistency (hero collections) ---
  if (paths.hero_output) {
    let heroMap = null;
    try {
      heroMap = JSON.parse(await fsp.readFile(paths.hero_map_file, "utf8"));
    } catch {
      failures.push("hero-clubs.json missing — run `normalize` for the hero roster");
    }
    if (heroMap) {
      const heroEntries = manifest.entries.filter((e) => e.hero && e.hero.club_slug);
      const keys = Object.keys(heroMap.clubs || {});
      ok(keys.length === heroEntries.length, `hero-clubs.json must have one club per hero entry (${keys.length} keys vs ${heroEntries.length} entries)`);
      for (const e of heroEntries) {
        const c = heroMap.clubs[e.hero.club_slug];
        if (!ok(!!c, `hero-clubs.json missing club ${e.hero.club_slug}`)) continue;
        ok(c.status === e.status, `hero-clubs.json status mismatch for ${e.hero.club_slug} (${c.status} vs ${e.status})`);
        if (e.status === "complete") {
          ok(c.portrait_url === config.public_url_prefix + e.filename, `hero-clubs.json portrait_url mismatch for ${e.hero.club_slug}`);
        } else {
          ok(c.portrait_url == null, `hero-clubs.json must not carry a portrait_url for incomplete club ${e.hero.club_slug}`);
        }
      }
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
  const undocumented = manifest.entries.filter((e) => e.status !== "complete" && e.status !== "deferred" && e.status !== "no_asset");
  if (counts.no_asset) {
    notes.push(`${counts.no_asset} clubs verified to have no official UEFA cutoff in the target club's kit (probe evidence per entry) — hero renders without artwork for these`);
  }
  if (undocumented.length > 0) {
    failures.push(`collection is incomplete: ${complete}/${players.length} complete (${JSON.stringify(counts)})`);
  } else if (counts.deferred) {
    // owner-accepted deferrals: honest incompleteness, documented per entry
    notes.push(
      `collection incomplete by owner decision: ${complete}/${players.length} complete, ${counts.deferred} deferred ` +
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
