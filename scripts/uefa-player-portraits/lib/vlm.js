// lib/vlm.js — the VLM style gate (spec v2.3, owner directive 2026-10-20:
// "rename the pictures, using VLM, that have FULL jersey — they're priority
// to be shown; a FIFA card must never stand in for the player").
//
// The 2026-10-19/20 war story that created this module: the v2.2 framing
// refills drew LaLiga's "004" squad variant for Lamine Yamal — which turned
// out to be an EA-FC-style CARD RENDER (gold shield, rating 89, badges), not
// a photograph. Deterministic framing analysis cannot tell a card render
// from a photo (the silhouette geometry passes either way); only a vision
// model can. This module is that eye.
//
// Style vocabulary (spec v2.3 §8c — the display priority order):
//   jersey_photo  photo, jersey visible on the torso      — PRIORITY 1
//   bust_photo    photo, head+shoulders+chest             — PRIORITY 2 (upgradeable)
//   head_photo    photo, head only                        — fails §8b framing, replace
//   card_render   stylized/illustrated/game-card artwork  — FORBIDDEN, never display
//   unclear       the model hedged                        — human eyes required
//
// SDK resolution (z-ai-web-dev-sdk is a dev-sandbox package, NOT a repo
// dependency — see INSTRUCTIONS §11 "z-ai buckets"):
//   1. env Z_AI_SDK_PATH (explicit override)
//   2. a locally installed z-ai-web-dev-sdk (require resolution)
//   3. /home/z/my-project/node_modules/z-ai-web-dev-sdk (the known sandbox)
// When none resolve, vlmAvailable() returns false and callers fall back to
// deterministic QA with a loud warning (the gate degrades, it never blocks).
"use strict";

const fs = require("fs");
const path = require("path");

const MIN_INTERVAL_MS = 1500; // pacing between VLM calls
// 429 (the documented z-ai bucket throttle — INSTRUCTIONS §11) needs LONG
// cooldowns; other retryables (5xx, unparseable) recover faster.
const RETRY_DELAYS_MS = [3000, 8000, 20000];
const RETRY_DELAYS_429_MS = [30000, 60000, 120000, 300000];

let _zai = null;
let _zaiTried = false;
let _lastCall = 0;
let _model = null;

function resolveSdkPath() {
  const candidates = [];
  if (process.env.Z_AI_SDK_PATH) candidates.push(process.env.Z_AI_SDK_PATH);
  candidates.push("z-ai-web-dev-sdk"); // local resolution
  candidates.push("/home/z/my-project/node_modules/z-ai-web-dev-sdk"); // dev sandbox
  for (const c of candidates) {
    try {
      const resolved = require.resolve(c + "/package.json");
      return path.dirname(resolved);
    } catch { /* try next */ }
  }
  return null;
}

async function zai() {
  if (_zai) return _zai;
  if (_zaiTried) return null;
  _zaiTried = true;
  const sdkPath = resolveSdkPath();
  if (!sdkPath) {
    console.warn("[vlm] z-ai-web-dev-sdk not found (tried Z_AI_SDK_PATH, local, sandbox path) — style gate UNAVAILABLE");
    return null;
  }
  try {
    const mod = require(sdkPath);
    const ZAI = mod.default || mod;
    _zai = await ZAI.create();
    return _zai;
  } catch (e) {
    console.warn("[vlm] SDK init failed (" + e.message + ") — style gate UNAVAILABLE");
    return null;
  }
}

function vlmAvailable() {
  return _zai !== null; // only truthful after a zai() attempt; callers await zai() first
}

const PROMPT =
  "Look at this image. It is a football player portrait used as website hero artwork. " +
  "1) Is it a real photograph of a footballer, or a computer-generated/stylized artwork " +
  "(e.g., a FIFA/EA FC video-game player card render, illustration, or digital painting)? " +
  "2) Is the player wearing a club jersey/kit with the torso visible? " +
  "3) What framing: full jersey torso visible / bust (head+shoulders) / head only? " +
  "4) Are there any card frames, rating numbers, badges, text overlays or graphic elements? " +
  'Answer with STRICT JSON only, no other text: {"medium":"photo"|"render",' +
  '"jersey":"full"|"partial"|"none","framing":"jersey"|"bust"|"head",' +
  '"card_graphics":true|false,"notes":"one short sentence"}';

function parseVlmJson(text) {
  if (!text) return null;
  let t = String(text).trim();
  t = t.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/,"");
  const s = t.indexOf("{");
  const e = t.lastIndexOf("}");
  if (s < 0 || e <= s) return null;
  try { return JSON.parse(t.slice(s, e + 1)); } catch { return null; }
}

function styleOf(r) {
  if (!r || typeof r !== "object") return "unclear";
  const medium = String(r.medium || "").toLowerCase();
  const framing = String(r.framing || "").toLowerCase();
  const notes = String(r.notes || "").toLowerCase();
  // a card/stylized verdict from any of the three signals is decisive
  const isCard = medium === "render" || r.card_graphics === true ||
    (medium !== "photo" && /card|render|illustration|digital painting/.test(notes));
  if (isCard) return "card_render";
  if (medium !== "photo") return "unclear";
  if (framing === "jersey" || r.jersey === "full") return "jersey_photo";
  if (framing === "bust" || r.jersey === "partial") return "bust_photo";
  if (framing === "head") return "head_photo";
  return "unclear";
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function pace() {
  const wait = _lastCall + MIN_INTERVAL_MS - Date.now();
  if (wait > 0) await sleep(wait);
  _lastCall = Date.now();
}

// Classify one local image file. Returns:
//   { ok, style, medium, framing, jersey, card_graphics, background?, notes, model, verified_at }
//   { ok:false, error } — after retries (caller decides: fail-open with warning
//   or fail-closed; the audit tool records the failure honestly).
async function classifyPortrait(filePath, opts = {}) {
  const client = await zai();
  if (!client) return { ok: false, error: "z-ai-web-dev-sdk unavailable" };
  const buf = fs.readFileSync(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const mime = ext === ".png" ? "image/png" : ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : "image/webp";
  const dataUrl = `data:${mime};base64,${buf.toString("base64")}`;

  let lastErr = null;
  let is429 = false;
  for (let attempt = 0; attempt <= RETRY_DELAYS_429_MS.length; attempt++) {
    if (attempt > 0) {
      const delay = is429 ? RETRY_DELAYS_429_MS[Math.min(attempt - 1, RETRY_DELAYS_429_MS.length - 1)] : RETRY_DELAYS_MS[Math.min(attempt - 1, RETRY_DELAYS_MS.length - 1)];
      console.warn(`[vlm] retry #${attempt} after ${delay}ms (${lastErr || "unknown"}${is429 ? " — 429 throttle" : ""})`);
      await sleep(delay);
    }
    await pace();
    try {
      const res = await client.chat.completions.createVision({
        messages: [{
          role: "user",
          content: [
            { type: "text", text: opts.prompt || PROMPT },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        }],
        thinking: { type: "disabled" },
      });
      const content = res && res.choices && res.choices[0] && res.choices[0].message && res.choices[0].message.content;
      const parsed = parseVlmJson(content);
      if (!parsed) {
        lastErr = "unparseable VLM answer: " + String(content).slice(0, 120);
        continue;
      }
      if (!_model && res.model) _model = res.model;
      return {
        ok: true,
        style: styleOf(parsed),
        raw: parsed,
        medium: parsed.medium || null,
        framing: parsed.framing || null,
        jersey: parsed.jersey || null,
        card_graphics: parsed.card_graphics === true,
        notes: parsed.notes || null,
        model: res.model || _model || null,
        verified_at: new Date().toISOString(),
      };
    } catch (e) {
      lastErr = e && e.message ? e.message : String(e);
      is429 = /429|too many requests/i.test(lastErr);
      // non-retryable client errors (auth, bad request) — bail immediately
      if (/401|403|invalid api key|unauthorized/i.test(lastErr)) break;
    }
  }
  return { ok: false, error: (is429 ? "429-throttled: " : "") + (lastErr || "vlm failed"), throttled: is429 };
}

// Style display priority (spec v2.3 §8c) — higher wins.
const STYLE_PRIORITY = { jersey_photo: 3, bust_photo: 2, head_photo: 1, card_render: 0, unclear: -1 };

// Is this style acceptable for publishing? card/head are never acceptable;
// unclear is not acceptable either (the gate is honest — it demands a verdict).
function stylePublishable(style) {
  return style === "jersey_photo" || style === "bust_photo";
}

module.exports = {
  zai,
  vlmAvailable,
  classifyPortrait,
  styleOf,
  stylePublishable,
  parseVlmJson,
  STYLE_PRIORITY,
};
