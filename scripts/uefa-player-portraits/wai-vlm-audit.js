// wai-vlm-audit.js — the Workers AI audit for the clubs library
// (13.133-clubalt). The z-ai bucket hit its documented daily 429 wall
// mid-run (166 candidates fetched during the throttle window with the
// gate degraded); this script closes their classification through the
// owner-supplied WORKERS AI token instead:
//
//   CARD GATE   @cf/llava-hf/llava-1.5-7b-hf — "PHOTO or CARD?" on a
//               white-flattened 384px render (transparent cutouts make
//               llava hallucinate "card" — flattening fixed it; calibrated
//               2026-10-21 on known-good photos + a synthetic card). Every
//               CARD verdict gets the detailed second pass before any
//               drop (the vlm-style-audit two-pass rule).
//   FRAMING     derived from the platform's asset kind, calibrated against
//               the z-ai-classified hero manifest (all platforms →
//               jersey_photo except bundesliga.com → bust_photo).
//
// The z-ai full audit (--audit-gaps --all) remains the documented
// refinement follow-up when the bucket recovers: it re-classifies
// style_source="wai-llava+platform" entries with the stronger model. Every
// entry carries its provenance (style_source + audited_by) so the two
// auditors interoperate through the same state file and never silently
// overwrite each other's verdicts.
//
// Usage:
//   WAI_TOKEN=cfut_... WAI_ACCOUNT=... node scripts/uefa-player-portraits/wai-vlm-audit.js
//   (--limit N smoke run; --republish regenerates assets + the index after)
// Exit 0 = done, exit 3 = throttled/unavailable.
"use strict";

const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");
const sharp = require("sharp");

const ROOT = path.resolve(__dirname, "..", "..");
const CACHE = path.join(ROOT, ".cache", "uefa-player-portraits", "clubs-alternates");
const STATE_FILE = path.join(CACHE, "state.json");
const ORIGINALS_DIR = path.join(CACHE, "originals");

const MODEL = "@cf/llava-hf/llava-1.5-7b-hf";
const MIN_INTERVAL_MS = 1100;

const CARD_PROMPT =
  "Is this a real photograph of a footballer, or a video-game trading card render? " +
  "Answer with PHOTO or CARD first, then one short sentence.";
const VERIFY_PROMPT =
  "Look carefully at this image. Is it a real photograph of a person, or computer-generated " +
  "artwork like a video-game trading card (card frame, rating numbers, badges, illustration)? " +
  "Answer with PHOTO or RENDER first, then say which elements made you decide.";

// platform → framing tier, calibrated against the z-ai-classified hero
// manifest (2026-10-21: premierleague 16/16 jersey, legaseriea 16/16
// jersey, laliga 15/15 jersey, ligue1 15/15 jersey, bundesliga 12/12 bust)
const PLATFORM_FRAMING = {
  "premierleague.com": "jersey_photo",
  "legaseriea.it": "jersey_photo",
  "laliga.com": "jersey_photo",
  "ligue1.fr": "jersey_photo",
  "bundesliga.com": "bust_photo",
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function askLlava(token, account, pngBuf, prompt) {
  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/ai/run/${MODEL}`, {
    method: "POST",
    headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
    // NB: llava takes the image as a BYTE ARRAY — a base64 string 400s the
    // schema ("oneOf at '/' not met"); the model id stays RAW in the URL.
    body: JSON.stringify({ image: Array.from(pngBuf), prompt }),
  });
  if (res.status === 429) throw Object.assign(new Error("429"), { throttled: true });
  if (!res.ok) throw new Error("HTTP " + res.status + ": " + (await res.text()).slice(0, 120));
  const body = await res.json();
  return String((body.result && (body.result.description || body.result.response)) || "");
}

function verdictIsCard(text) {
  const t = String(text || "").toUpperCase();
  const card = /\bCARD\b|\bRENDER\b/.test(t);
  const photo = /\bPHOTO\b/.test(t);
  return card && !photo; // both words → ambiguous → treat as photo (fail-open)
}

async function renderFlat(file) {
  // llava on a transparent cutout hallucinates "card" — flatten to white
  return sharp(file).resize(384, 384, { fit: "inside" }).flatten({ background: "#ffffff" }).png().toBuffer();
}

async function main() {
  const argv = process.argv.slice(2);
  const token = process.env.WAI_TOKEN;
  const account = process.env.WAI_ACCOUNT;
  if (!token || !account) {
    console.error("needs WAI_TOKEN + WAI_ACCOUNT env (the owner's Workers AI credentials)");
    process.exit(2);
  }
  const limit = argv.includes("--limit") ? parseInt(argv[argv.indexOf("--limit") + 1], 10) : null;

  const state = JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
  let done = 0, dropped = 0, pending = 0, throttled = false;

  outer:
  for (const [slug, st] of Object.entries(state.clubs)) {
    const keep = [];
    for (const c of (st.candidates || [])) {
      // settled (by EITHER auditor — z-ai's verdict or a previous wai pass)?
      // skip: re-classifying wai-derived entries on every resume burned the
      // run's wall-clock before ever reaching the tail (the 67-stuck lesson)
      if (c.style && ["jersey_photo", "bust_photo"].includes(c.style)) { keep.push(c); continue; }
      if (limit && done + dropped >= limit) { keep.push(c); continue; }
      const origFile = path.join(ORIGINALS_DIR, slug, c.file);
      if (!fs.existsSync(origFile)) { keep.push(c); continue; }
      try {
        await sleep(MIN_INTERVAL_MS);
        const flat = await renderFlat(origFile);
        const t1 = await askLlava(token, account, flat, CARD_PROMPT);
        if (verdictIsCard(t1)) {
          // two-pass: the detailed re-examination before ANY drop
          await sleep(MIN_INTERVAL_MS);
          const t2 = await askLlava(token, account, flat, VERIFY_PROMPT);
          if (verdictIsCard(t2)) {
            st.failures = st.failures || {};
            st.failures[c.player] = `workers-ai audit: card render (two-pass: "${t1.slice(0, 60)}" / "${t2.slice(0, 60)}")`;
            dropped++;
            console.log(`  ✗ ${slug}: ${c.player} CARD CONFIRMED (two-pass) — DROPPED`);
            // NOT kept — the drop is the point (a replacement is fetched
            // on the next clubs:alt run)
          } else {
            c.style = PLATFORM_FRAMING[c.source_platform] || "jersey_photo";
            c.style_source = "wai-llava+platform";
            c.audited_by = "workers-ai llama-1.5-7b card gate (card verdict overturned on verification) + platform-calibrated framing";
            c.audited_at = new Date().toISOString();
            done++;
            keep.push(c);
            console.log(`  ✓ ${slug}: ${c.player} fast CARD OVERTURNED → ${c.style}`);
          }
        } else {
          c.style = PLATFORM_FRAMING[c.source_platform] || "jersey_photo";
          c.style_source = "wai-llava+platform";
          c.audited_by = "workers-ai llama-1.5-7b card gate + platform-calibrated framing";
          c.audited_at = new Date().toISOString();
          done++;
          keep.push(c);
          console.log(`  ✓ ${slug}: ${c.player} PHOTO → ${c.style}`);
        }
      } catch (e) {
        if (e.throttled) {
          console.warn("  ! Workers AI throttled — stopping (re-run resumes here)");
          throttled = true;
          keep.push(c);
          break outer;
        }
        console.log(`  ! ${slug}: ${c.player} error ${e.message.slice(0, 90)} — kept pending`);
        pending++;
        keep.push(c);
      }
      await fsp.writeFile(STATE_FILE, JSON.stringify(state, null, 2));
    }
    st.candidates = keep;
  }
  await fsp.writeFile(STATE_FILE, JSON.stringify(state, null, 2));
  console.log(`\nwai-vlm-audit: ${done} classified, ${dropped} dropped, ${pending} pending${throttled ? " (THROTTLED)" : ""}`);

  if ((done || dropped) && argv.includes("--republish")) {
    const { execFileSync } = require("child_process");
    execFileSync("node", [path.join(__dirname, "clubs-alternates.js"), "--publish-only"], { stdio: "inherit", cwd: ROOT });
    execFileSync("node", [path.join(ROOT, "scripts", "sync-hero-clubs.js")], { stdio: "inherit", cwd: ROOT });
  }
  process.exit(throttled ? 3 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
