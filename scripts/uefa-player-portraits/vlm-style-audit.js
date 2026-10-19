// vlm-style-audit.js — the VLM style audit (spec v2.3 §8c, owner directive
// 2026-10-20: "rename the pictures, using VLM, that have FULL jersey —
// they're priority to be shown"). One pass over every published portrait:
// classify each with the vision model (photo-with-jersey / bust / head /
// card render) and record the verdict where it matters.
//
// What it writes:
//   .cache/uefa-player-portraits/vlm-style-report.json
//     { files: { "<filename>": { sha256, style, raw, model, verified_at } } }
//     — resume-aware: files whose sha256 is already classified are skipped,
//       so an interrupted run (or a 429 storm) continues where it stopped.
//   --apply: additionally merges `style` + `style_verified_at` (+ a warning
//     on card_render / head_photo entries: "needs replacement — never wire")
//     into every manifest entry whose filename matches, in BOTH
//     manifest-heroes.json (96-club hero library) and manifest.json (the
//     original 36-player collection). Manifests are merged surgically —
//     this tool never runs normalize (the cache may be cold; §1/§10).
//
// TWO-PASS VERIFICATION (the 2026-10-20 calibration): the fast first pass
// (glm turbo) is NOISY — four of five non-LaLiga "card_render" verdicts on
// the first full sweep were false positives (Šporar/Wirtz/Xhaka/Yıldız are
// genuine photos). Every FAILING verdict (card_render / head_photo) is
// therefore re-examined with a detailed pixel-level prompt (--verify, on
// by default for --apply; explicit `--verify` re-runs the second pass over
// all recorded failures); only a CONFIRMED failure is recorded as the
// entry's style. Both verdicts are kept in the report (raw + verify).
//
// The audit is a QA GATE, not a mutator of bytes: renaming/replacement of
// bad-style files happens through the documented fill flows (alt-fetch
// --refill / --player, §2b/§2c) which now carry their own VLM gate.
//
// Usage:
//   node scripts/uefa-player-portraits/vlm-style-audit.js [--only a,b,c] [--wired]
//   node scripts/uefa-player-portraits/vlm-style-audit.js --apply
//   npm run heroes:style-audit
"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { config } = require("./lib/config");
const vlm = require("./lib/vlm");

const REPORT_FILE = path.join(config.cache_dir, "vlm-style-report.json");
const MANIFESTS = [
  path.join(config.asset_dir, "manifest-heroes.json"),
  path.join(config.asset_dir, "manifest.json"),
];
const LIVE_BUNDLE_RE = /public-(\d+)\.(\d+)\.js/;

// the detailed second-pass prompt (pixel-level, calibrated 2026-10-20 — it
// overturned 4 of 5 fast-pass card verdicts as false positives)
const VERIFY_PROMPT =
  "Examine this footballer portrait carefully at the pixel level. Answer: " +
  "1) Is the skin/face photorealistic (real photograph) or computer-generated/illustrated (video-game render, digital painting, vector art)? " +
  "2) Any EA Sports FC / FIFA video-game card frame, rating number, position label, or club/league badges? " +
  "3) What kit is visible and how much (head only / shoulders / full torso)? " +
  "4) What is the cutout style: photographic cutout with natural edges, or flat/graphic illustration edges? " +
  'Strict JSON: {"photorealistic":true|false,"card_elements":"none"|"describe",' +
  '"framing":"...","cutout_style":"photo"|"graphic",' +
  '"verdict":"photo"|"render"|"card","confidence":"high"|"medium"|"low"}';

function styleFromVerification(v) {
  if (!v || typeof v !== "object") return null;
  const verdict = String(v.verdict || "").toLowerCase();
  if (v.photorealistic === false || verdict === "card" || verdict === "render") return "card_render";
  if (verdict === "photo" || v.photorealistic === true) {
    const framing = String(v.framing || "").toLowerCase();
    if (/head only|head-only/.test(framing)) return "head_photo";
    if (/torso|jersey|waist|full body/.test(framing)) return "jersey_photo";
    if (/shoulder|bust/.test(framing)) return "bust_photo";
    return "jersey_photo"; // a photo that shows the kit — default to the passing tier
  }
  return null;
}

function sha256(buf) { return crypto.createHash("sha256").update(buf).digest("hex"); }

function loadReport() {
  try { return JSON.parse(fs.readFileSync(REPORT_FILE, "utf8")); } catch { return { files: {} }; }
}

function saveReport(rep) {
  fs.mkdirSync(path.dirname(REPORT_FILE), { recursive: true });
  rep.updated_at = new Date().toISOString();
  fs.writeFileSync(REPORT_FILE, JSON.stringify(rep, null, 2));
}

// the wired srcs (what the site actually renders) from the live bundle
function wiredSrcs() {
  const dirFiles = fs.readdirSync(path.join(config.repo_root, "assets")).filter((f) => LIVE_BUNDLE_RE.test(f));
  dirFiles.sort((a, b) => {
    const ma = a.match(LIVE_BUNDLE_RE), mb = b.match(LIVE_BUNDLE_RE);
    return (parseInt(mb[1] + mb[2], 10)) - (parseInt(ma[1] + ma[2], 10));
  });
  if (!dirFiles.length) return new Set();
  const src = fs.readFileSync(path.join(config.repo_root, "assets", dirFiles[0]), "utf8");
  const m = src.match(/var HERO_ART=\{[\s\S]*?\n\};/);
  if (!m) return new Set();
  return new Set([...m[0].matchAll(/src:"(\/players\/uefa\/[a-z0-9-]+\.webp)"/g)].map((x) => path.basename(x[1])));
}

async function main() {
  const argv = process.argv.slice(2);
  const apply = argv.includes("--apply");
  const verify = argv.includes("--verify");
  const onlyArg = argv.includes("--only") ? (argv[argv.indexOf("--only") + 1] || "") : "";
  const only = onlyArg ? new Set(onlyArg.split(",").map((s) => s.trim().replace(/\.webp$/, "") + ".webp")) : null;
  const wiredOnly = argv.includes("--wired");

  const wired = wiredSrcs();
  let files = fs.readdirSync(config.asset_dir).filter((f) => f.endsWith(".webp"));
  if (only) files = files.filter((f) => only.has(f));
  if (wiredOnly) files = files.filter((f) => wired.has(f));
  files.sort();

  const rep = loadReport();
  // prune report entries for files that no longer exist on disk (deleted
  // orphans would otherwise pollute the summary with stale verdicts)
  for (const f of Object.keys(rep.files)) {
    if (!fs.existsSync(path.join(config.asset_dir, f))) delete rep.files[f];
  }
  const counts = {};
  const todo = [];
  for (const f of files) {
    const p = path.join(config.asset_dir, f);
    const sha = sha256(fs.readFileSync(p));
    const prev = rep.files[f];
    // resume rule: a settled verdict for the SAME bytes counts; error/unclear
    // entries are re-tried (the throttle may have lifted)
    if (prev && prev.sha256 === sha && prev.style && prev.style !== "unclear" && !prev.error) {
      counts[prev.style] = (counts[prev.style] || 0) + 1;
      continue;
    }
    todo.push({ f, p, sha });
  }

  console.log(`[style-audit] ${files.length} file(s) in scope (${wiredOnly ? "wired only; " : ""}${wired.size} wired total), ${todo.length} to classify, ${files.length - todo.length} cached`);
  let done = 0;
  for (const t of todo) {
    const r = await vlm.classifyPortrait(t.p);
    if (!r.ok) {
      console.warn(`  ✗ ${t.f}: VLM failed — ${r.error}`);
      rep.files[t.f] = { sha256: t.sha, style: "unclear", error: r.error, verified_at: new Date().toISOString() };
      counts.unclear = (counts.unclear || 0) + 1;
    } else {
      rep.files[t.f] = {
        sha256: t.sha,
        style: r.style,
        raw: { medium: r.medium, framing: r.framing, jersey: r.jersey, card_graphics: r.card_graphics, notes: r.notes },
        model: r.model,
        verified_at: r.verified_at,
        wired: wired.has(t.f) || undefined,
      };
      counts[r.style] = (counts[r.style] || 0) + 1;
      const mark = r.style === "card_render" || r.style === "head_photo" ? "‼️" : r.style === "unclear" ? "?" : "✓";
      console.log(`  ${mark} ${t.f.padEnd(44)} ${r.style}${wired.has(t.f) ? "  [WIRED — displayed]" : ""}`);
    }
    saveReport(rep); // checkpoint after every file — resume-safe
    done++;
    if (done % 10 === 0) console.log(`  … ${done}/${todo.length}`);
  }

  // annotate wired status for cached entries too (cheap, keeps report honest)
  for (const [f, e] of Object.entries(rep.files)) {
    const isWired = wired.has(f);
    if (isWired && !e.wired) { e.wired = true; }
    if (!isWired && e.wired) { delete e.wired; }
  }
  saveReport(rep);

  // ---- second pass: verify every failing verdict (two-pass design) -------
  // Fresh card_render/head_photo verdicts from the sweep above AND recorded
  // ones without a verification get the detailed pixel-level re-examination;
  // --verify forces re-verification of already-verified failures too.
  const failing = Object.entries(rep.files).filter(([f, e]) =>
    (e.style === "card_render" || e.style === "head_photo") && (!e.verify || verify));
  if (failing.length) {
    console.log(`[style-audit] second pass: verifying ${failing.length} failing verdict(s) with the detailed prompt…`);
    for (const [f, e] of failing) {
      const p = path.join(config.asset_dir, f);
      let curSha = null;
      try { curSha = sha256(fs.readFileSync(p)); } catch { /* file gone */ }
      if (curSha !== e.sha256) { delete rep.files[f]; saveReport(rep); continue; } // stale — bytes changed
      const v = await vlm.classifyPortrait(p, { prompt: VERIFY_PROMPT });
      if (!v.ok) {
        // honest degrade: an UNVERIFIED failure is treated as unclear —
        // --apply never writes a rejection warning on an unverified verdict
        e.verify_error = v.error;
        e.style = "unclear";
        console.warn(`  ? ${f}: verification failed — ${v.error}`);
      } else {
        const vs = styleFromVerification(v.raw);
        delete e.verify_error;
        if (vs) {
          e.verify = { raw: v.raw, style: vs, verified_at: v.verified_at };
          e.style = vs;
          const bad = vs === "card_render" || vs === "head_photo";
          console.log(`  ${bad ? "‼️ CONFIRMED" : "✓ OVERTURNED"} ${f.padEnd(42)} ${vs}` + (bad && wired.has(f) ? "  [WIRED — displayed!]" : ""));
        } else {
          e.verify_error = "unparseable verification answer";
          e.style = "unclear";
          console.warn(`  ? ${f}: verification unparseable`);
        }
      }
      saveReport(rep);
    }
  }

  // recompute from the live report (the verify pass above may have overturned
  // fast-pass verdicts)
  const finalCounts = {};
  for (const e of Object.values(rep.files)) if (e.style) finalCounts[e.style] = (finalCounts[e.style] || 0) + 1;
  console.log("\n=== VLM STYLE AUDIT SUMMARY ===", JSON.stringify(finalCounts));
  const bad = Object.entries(rep.files).filter(([f, e]) => wired.has(f) && (e.style === "card_render" || e.style === "head_photo" || e.style === "unclear"));
  if (bad.length) {
    console.log("WIRED but failing the style gate (visible on the site TODAY):");
    for (const [f, e] of bad) console.log(`  ‼️  ${f} — ${e.style}${e.error ? " (" + e.error + ")" : ""}`);
  } else {
    console.log("All wired portraits pass the style gate (photo + jersey/bust).");
  }

  if (apply) {
    let touched = 0;
    for (const mf of MANIFESTS) {
      if (!fs.existsSync(mf)) continue;
      const m = JSON.parse(fs.readFileSync(mf, "utf8"));
      let changed = 0;
      for (const e of m.entries || []) {
        const r = rep.files[e.filename];
        if (!r || !r.style) continue;
        const want = r.style === "unclear" ? null : r.style;
        if (e.style === want && (want === null || e.style_verified_at === r.verified_at)) continue;
        e.style = want;
        e.style_verified_at = want ? r.verified_at : new Date().toISOString();
        if (want === "card_render") {
          e.warnings = (e.warnings || []).filter((w) => !/^style gate:/.test(w));
          e.warnings.push(`style gate: ${e.filename} is a CARD RENDER (${(r.raw && r.raw.notes) || "VLM verdict"}) — NEVER wire; replace via the fill flow (alt-fetch --refill/--player, INSTRUCTIONS §2b/§2c)`);
        } else if (want === "head_photo") {
          e.warnings = (e.warnings || []).filter((w) => !/^style gate:/.test(w));
          e.warnings.push(`style gate: ${e.filename} is a head-only photo — fails the §8b framing contract; replace via the fill flow`);
        } else if (want) {
          e.warnings = (e.warnings || []).filter((w) => !/^style gate:/.test(w));
        }
        changed++;
      }
      if (changed) {
        m.style_audit_at = new Date().toISOString();
        fs.writeFileSync(mf, JSON.stringify(m, null, 2) + "\n");
        console.log(`[style-audit] ${path.basename(mf)}: style recorded on ${changed} entr(ies)`);
        touched += changed;
      }
    }
    if (!touched) console.log("[style-audit] --apply: manifests already up to date");
  } else if (Object.values(rep.files).some((e) => e.style === "card_render" || e.style === "head_photo")) {
    console.log("\n(next step: npm run heroes:style-audit -- --apply   to record styles into the manifests)");
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
