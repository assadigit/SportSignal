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


import { CONFIG, COMP_EN, LEAGUE_LOGOS } from "./config";
import type { Env } from "./types";
import { getJalaliDate, getJalaliTime, getEnglishDate, getEnglishTime } from "./utils";
import { translateTeam, translateCompetition, translateVenue } from "./translate";

// Fetch a crest image and return it as a base64 data URI (so the SVG is
// self-contained — no cross-origin fetch needed by the renderer). Falls
// back to a placeholder circle if the fetch fails.
export async function fetchCrestDataUri(env: Env, url: string): Promise<string> {
  if (!url) return "";
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

  // Derby / big-match accent.
  const isDerby = match.derby;
  const accent = isDerby ? "#a855f7" : "#3b82f6"; // purple for derby, blue otherwise
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
  ${isDerby ? `<text x="400" y="40" text-anchor="middle" font-family="Vazirmatn, sans-serif" font-size="18" font-weight="800" fill="#a855f7">⚔️ ${en ? "DERBY" : "دربی"}</text>` : ""}
  <text x="400" y="${isDerby ? 70 : 50}" text-anchor="middle" font-family="Vazirmatn, sans-serif" font-size="16" font-weight="600" fill="#94a3b8">${escXml(competition)}${stageLabel ? " — " + escXml(stageLabel) : ""}</text>
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
