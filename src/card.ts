// SportSignal — match-card SVG generator. Builds a visual "team A vs team B"
// card with the two crests, team names, kickoff time, and competition. The
// SVG is served at /api/card/<matchKey> and sent via Telegram sendPhoto
// (converted to PNG via Cloudflare Image Resizing if available, otherwise
// sent as a document).
//
// v13.12-cards: the card uses the REAL provider crest URLs (already in the
// match data — football-data.org / sportscore / thesportsdb PNGs). The
// Worker fetches them server-side, base64-inlines them into the SVG (so the
// SVG is self-contained + Telegram/Image-Resizing doesn't need to fetch
// cross-origin), and returns the composed SVG.


import { CONFIG } from "./config";
import { COMP_EN, LEAGUE_LOGOS } from "./tables";
import type { Env } from "./types";
import { getJalaliDate, getJalaliTime, getEnglishDate, getEnglishTime, bumpSubrequest } from "./utils";
import { translateTeam, translateCompetition, translateVenue } from "./translate";
import { matchKey } from "./dedupe";
import { isDerby, rivalryName } from "./matches";
import { VAZIRMATN_BOLD_TTF_B64, VAZIRMATN_EXTRABOLD_TTF_B64 } from "./card-fonts";

// v13.17-cards: resvg-wasm init (lazy, once per isolate). The WASM module
// is imported as a binding via wrangler rules (CompiledWasm). In the Worker
// runtime, the .wasm file is imported as a WebAssembly.Module.
let _resvgInit = false;
let _Resvg = null;
async function ensureResvg() {
  if (_resvgInit) return _Resvg;
  try {
    const mod = await import("@resvg/resvg-wasm");
    // The wasm binary is imported as a module binding (wrangler rules
    // map *.wasm → CompiledWasm). In Workers, `import wasm from "..."` gives
    // a WebAssembly.Module instance directly.
    // @ts-ignore — the .wasm module has no type declarations
    const wasmModule = (await import("@resvg/resvg-wasm/index_bg.wasm")).default;
    await mod.initWasm(wasmModule);
    _Resvg = mod.Resvg;
    _resvgInit = true;
    return _Resvg;
  } catch (e) {
    console.warn("resvg-wasm init failed (cards will be SVG-only): " + e.message);
    _resvgInit = true; // don't retry
    return null;
  }
}

// Fetch a crest image and return it as a base64 data URI (so the SVG is
// self-contained — no cross-origin fetch needed by the renderer). Falls
// back to a placeholder circle if the fetch fails.
export async function fetchCrestDataUri(env: Env, url: string): Promise<string> {
  if (!url) return "";
  // v13.45-sightlines (F10): crest fetches (card renders) were invisible to
  // the counter — up to 2 per card, on the path that runs INSIDE
  // notification sends. Budget-out falls back to the placeholder crest.
  if (bumpSubrequest()) return "";
  try {
    const res = await fetch(url, { cf: { cacheTtl: 86400, cacheEverything: true } });
    if (!res.ok) return "";
    const buf = await res.arrayBuffer();
    const type = res.headers.get("content-type") || "image/png";
    const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
    return `data:${type};base64,${b64}`;
  } catch (e) {
    return "";
  }
}

// Escape XML special chars in team names for safe SVG interpolation.
function escXml(s: string): string {
  return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

// Truncate a team name to fit the card width (SVG text doesn't auto-wrap).
function fitName(s: string, maxChars: number): string {
  const t = String(s || "");
  if (t.length <= maxChars) return t;
  return t.slice(0, maxChars - 1) + "…";
}

// Build the match-card SVG. 800×420 — a wide card that looks good in
// Telegram's photo view (both phone + desktop).
export async function buildMatchCardSvg(env: Env, match: any, lang: string): Promise<string> {
  const en = lang === "en";
  const homeName = en ? match.homeTeam.name : (translateTeam(match.homeTeam.name) || match.homeTeam.name);
  const awayName = en ? match.awayTeam.name : (translateTeam(match.awayTeam.name) || match.awayTeam.name);
  const competition = en ? (COMP_EN[match.competition.code] || match.competition.code) : (translateCompetition(match.competition.code) || match.competition.code);
  const dateStr = en ? getEnglishDate(match.utcDate, env) : getJalaliDate(match.utcDate, env);
  const timeStr = en ? getEnglishTime(match.utcDate, env) : getJalaliTime(match.utcDate, env);

  // Fetch both crests in parallel (base64-inline for a self-contained SVG).
  const [homeCrest, awayCrest] = await Promise.all([
    fetchCrestDataUri(env, match.homeTeam.crest || ""),
    fetchCrestDataUri(env, match.awayTeam.crest || "")
  ]);

  // Derby / big-match accent. v13.51-rivalries: the tag is computed from
  // the match itself — the card renders for BOTH the public-matches cache
  // (which carries .derby) and the raw tracked pool (which doesn't, so bot
  // notification cards never showed it). Named rivalries (El Clásico, Der
  // Klassiker, …) replace the generic DERBY text; Persian keeps a tag only
  // for ال کلاسیکو (the other names are English-only — the fa card drops the
  // tag but keeps the purple accent); and NEVER in the Champions League,
  // where the meeting is just a UCL match.
  const namedRivalry = rivalryName(match, "en");
  const tagForLang = rivalryName(match, en ? "en" : "fa");
  const isDerbyMatch = isDerby(match) || !!namedRivalry;
  const derbyTag = tagForLang || (!namedRivalry && isDerbyMatch ? (en ? "DERBY" : "\u062F\u0631\u0628\u06CC") : null);
  const accent = isDerbyMatch ? "#a855f7" : "#3b82f6"; // purple for derby, blue otherwise
  const stageLabel = match.stage && match.stage !== "REGULAR_SEASON" ? String(match.stage).replace(/_/g, " ") : "";

  // The card: dark gradient background, two crest circles, team names, VS,
  // competition + date + time at the bottom. RTL-aware (home on right for fa).
  const homeOnRight = !en; // fa is RTL → home team on the right
  const left = homeOnRight ? awayName : homeName;
  const right = homeOnRight ? homeName : awayName;
  const leftCrest = homeOnRight ? awayCrest : homeCrest;
  const rightCrest = homeOnRight ? homeCrest : awayCrest;

  const leftCrestEl = leftCrest
    ? `<image href="${leftCrest}" x="120" y="80" width="160" height="160" preserveAspectRatio="xMidYMid meet"/>`
    : `<circle cx="200" cy="160" r="70" fill="#334155"/>`;
  const rightCrestEl = rightCrest
    ? `<image href="${rightCrest}" x="520" y="80" width="160" height="160" preserveAspectRatio="xMidYMid meet"/>`
    : `<circle cx="600" cy="160" r="70" fill="#334155"/>`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 420" width="800" height="420">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#1e293b"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${accent}" stop-opacity="0"/>
      <stop offset="50%" stop-color="${accent}" stop-opacity="0.8"/>
      <stop offset="100%" stop-color="${accent}" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect width="800" height="420" fill="url(#bg)"/>
  <rect x="0" y="0" width="800" height="6" fill="url(#accent)"/>
  ${derbyTag ? `<text x="400" y="40" text-anchor="middle" font-family="Vazirmatn, sans-serif" font-size="18" font-weight="800" fill="#a855f7">\u2694\uFE0F ${escXml(derbyTag)}</text>` : ""}
  <text x="400" y="${isDerbyMatch ? 70 : 50}" text-anchor="middle" font-family="Vazirmatn, sans-serif" font-size="16" font-weight="600" fill="#94a3b8">${escXml(competition)}${stageLabel ? " — " + escXml(stageLabel) : ""}</text>
  ${leftCrestEl}
  ${rightCrestEl}
  <text x="200" y="280" text-anchor="middle" font-family="Vazirmatn, sans-serif" font-size="26" font-weight="800" fill="#e2e8f0">${escXml(fitName(left, 22))}</text>
  <text x="600" y="280" text-anchor="middle" font-family="Vazirmatn, sans-serif" font-size="26" font-weight="800" fill="#e2e8f0">${escXml(fitName(right, 22))}</text>
  <text x="400" y="200" text-anchor="middle" font-family="Vazirmatn, sans-serif" font-size="42" font-weight="900" fill="${accent}">VS</text>
  <line x1="280" y1="320" x2="520" y2="320" stroke="url(#accent)" stroke-width="2"/>
  <text x="400" y="355" text-anchor="middle" font-family="Vazirmatn, sans-serif" font-size="20" font-weight="700" fill="#e2e8f0">${escXml(dateStr)}</text>
  <text x="400" y="385" text-anchor="middle" font-family="Vazirmatn, sans-serif" font-size="24" font-weight="800" fill="${accent}">${escXml(timeStr)}</text>
  ${match.venue ? `<text x="400" y="412" text-anchor="middle" font-family="Vazirmatn, sans-serif" font-size="14" font-weight="600" fill="#94a3b8">\u{1F4CD} ${escXml(en ? match.venue : (translateVenue(match.venue) || match.venue))}</text>` : ""}
</svg>`;
}

// v13.17-cards: render the SVG to PNG via @resvg/resvg-wasm (pure-WASM,
// runs natively in the Worker runtime — no native bindings needed).
// Returns a PNG ArrayBuffer, or null if rendering fails (caller falls back
// to text-only). The Vazirmatn TTF fonts are loaded into resvg so the
// Persian team names + Jalali dates render correctly (not tofu boxes).
export async function renderCardPng(env: Env, match: any, lang: string): Promise<ArrayBuffer | null> {
  try {
    const Resvg = await ensureResvg();
    if (!Resvg) return null;
    const svg = await buildMatchCardSvg(env, match, lang);
    // v13.31-perf: the two Vazirmatn TTFs were base64-DECODED (atob) on
    // EVERY render — several hundred KB of string churn per card, per chat
    // sweep. They are immutable module constants: decode once per isolate.
    if (!_fontBufs) {
      _fontBufs = {
        bold: Uint8Array.from(atob(VAZIRMATN_BOLD_TTF_B64), (c) => c.charCodeAt(0)),
        extraBold: Uint8Array.from(atob(VAZIRMATN_EXTRABOLD_TTF_B64), (c) => c.charCodeAt(0))
      };
    }
    const resvg = new Resvg(svg, {
      fitTo: { mode: "width", value: 800 },
      font: {
        fontBuffers: [_fontBufs.bold, _fontBufs.extraBold],
        loadSystemFonts: false,
        defaultFontFamily: "Vazirmatn",
        defaultFontSize: 16
      }
    });
    const png = resvg.render().asPng();
    // resvg returns a Uint8Array; convert to ArrayBuffer for the Response.
    return png.buffer.slice(png.byteOffset, png.byteOffset + png.byteLength);
  } catch (e) {
    console.warn("renderCardPng failed: " + e.message);
    return null;
  }
}

// v13.31-perf: decoded font buffers — module-level, one per isolate.
let _fontBufs: { bold: Uint8Array; extraBold: Uint8Array } | null = null;

// v13.31-perf: Cache API-backed PNG cache (caches.default — NOT KV, so it
// never touches the 1,000/day KV write quota). The same card is rendered
// repeatedly: once per language-bucket in a notification sweep, again on
// backfill retries, again on the bot's featured button, again on every
// /api/card/<key>.png request. Rendering costs the wasm rasterize + two
// crest fetches — the cache turns those into a single per-colo render per
// hour. Key: synthetic URL keyed by (matchKey, lang). Card content (teams,
// kickoff, competition) is stable per matchKey; a late FA-name improvement
// within the 1h TTL is accepted (translateTeam results improve asynchronously).
export async function renderCardPngCached(env: Env, match: any, lang: string): Promise<ArrayBuffer | null> {
  let cacheReq: Request | null = null;
  try {
    cacheReq = new Request("https://cards.internal/" + encodeURIComponent(matchKey(match)) + "/" + lang + ".png");
    const hit = await caches.default.match(cacheReq);
    if (hit) {
      const buf = await hit.arrayBuffer();
      if (buf && buf.byteLength) return buf;
    }
  } catch (e) {
    cacheReq = null;
  }
  const png = await renderCardPng(env, match, lang);
  if (png && cacheReq) {
    try {
      const resp = new Response(png, { headers: { "content-type": "image/png", "cache-control": "public, max-age=3600" } });
      await caches.default.put(cacheReq, resp.clone());
    } catch (e) {
      // Cache API unavailable (e.g. some runtimes) — render still succeeds.
    }
  }
  return png;
}
