// SportSignal — machine-readable files (Phase 2/5): robots.txt (F-01/F-02),
// sitemap index + children with HONEST lastmod (F-04/F-05), calendar.ics
// (F-11), Atom feed (F-12), /api/matches.json (F-13), llms.txt (F-14),
// security.txt (F-15) and text-only per-match OG PNGs (SO-03/SO-04).
//
// Lastmod honesty: a KV map (seo_lastmod_v1) stores {url: {hash, ts}}.
// ts advances ONLY when the URL's meaningful content hash changes — never
// "now on every build" (spec F-05). KV writes are change-only.
//
// Finished-match archive (U-05): the bot's KV pool retains finished
// matches only ~7 days; this layer appends every finished BIG match to
// seo_archive_v1 (365-day retention) so its page stays HTTP 200 forever.

import type { Env } from "../types";
import { CONFIG } from "../config";
import { SEO, absUrl, matchPath, compSlug, teamSlug } from "./config";
import { esc, tehranDayKey } from "./utils";
import { COMP_EN } from "../tables";
import { translateCompetition } from "../translate";
import { pubMatch } from "../public-matches";
import type { SeoCtx, SeoMatch } from "./data";
import { getSeoCtx, upcomingBig, finishedRecent, teamsIndex, compsIndex, payloadTop3, isBigForSeo } from "./data";

// ---------------------------------------------------------------- helpers

function xmlEsc(s: any): string {
  return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function icsEsc(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

function sha1ish(str: string): string {
  // FNV-1a 64-ish for content hashes (sync — no crypto.subtle in some paths)
  let h1 = 0x811c9dc5, h2 = 0x01000193;
  for (let i = 0; i < str.length; i++) {
    h1 = Math.imul(h1 ^ str.charCodeAt(i), 0x01000193) >>> 0;
    h2 = Math.imul(h2 + str.charCodeAt(i) * (i + 7), 0x85ebca6b) >>> 0;
  }
  return h1.toString(36) + "-" + h2.toString(36);
}

// ------------------------------------------------------------ archive (U-05)

interface ArchiveRec {
  m: any;        // pubMatch-shaped row
  fin: string;   // ISO time we saw it finished (approximates status change)
}

export async function loadArchive(env: Env): Promise<ArchiveRec[]> {
  const rec = await env.STATE.get(SEO.KV_SEO_LASTMOD.slice(0, 0) || "seo_archive_v1", "json").catch(() => null);
  return rec && Array.isArray(rec.matches) ? rec.matches : [];
}

async function saveArchive(env: Env, list: ArchiveRec[]): Promise<void> {
  await env.STATE.put("seo_archive_v1", JSON.stringify({ matches: list }), { expirationTtl: 400 * 86400 }).catch((e: any) => { });
}

// Append pool finished big-matches to the archive (change-only, 365d cap).
// Called from the sitemap builder + match pages (bounded: edge caches make
// this run at most a few times per 10 minutes).
export async function syncArchive(env: Env, ctx: SeoCtx): Promise<ArchiveRec[]> {
  const archive = await loadArchive(env);
  const byKey = new Map<string, ArchiveRec>();
  for (const r of archive) {
    if (r && r.m && r.m.utcDate) byKey.set(String(r.m.id || "") + "|" + r.m.utcDate, r);
  }
  const top3 = payloadTop3(ctx.payload);
  let changed = false;
  const nowIso = new Date().toISOString();
  const cutoff = Date.now() - (SEO.FINISHED_MATCH_ARCHIVE_DAYS - 5) * 864e5;
  for (let i = 0; i < ctx.pool.length; i++) {
    const raw = ctx.pool[i];
    const s = ctx.shaped[i];
    if (!raw || !raw.utcDate || raw.status !== "FINISHED") continue;
    if (!(isBigForSeo(raw, top3) || s.big)) continue;
    const key = String(raw.id || "") + "|" + raw.utcDate;
    if (!byKey.has(key)) {
      byKey.set(key, { m: s, fin: nowIso });
      changed = true;
    }
  }
  // prune older than retention (U-05: keep 365 days)
  let list = Array.from(byKey.values());
  const pruned = list.filter((r) => new Date(r.m.utcDate).getTime() > cutoff);
  if (pruned.length !== list.length) changed = true;
  list = pruned;
  if (changed) await saveArchive(env, list);
  return list;
}

// ------------------------------------------------------------- robots.txt (F-01/F-02/G-01)

export function robotsTxt(): string {
  // All three AI toggles are true → the default group already allows every
  // bot; no separate groups needed (spec G-01). If a toggle is ever set to
  // false, add the matching group here (see spec Appendix A).
  let body = "# SportSignal robots.txt\n";
  body += "# Canonical host: https://sportsignal.ir\n";
  body += "User-agent: *\n";
  body += "Allow: /\n";
  body += "Disallow: /admin\n";
  body += "# Note: /api/ stays crawlable — the page JS refreshes from it.\n";
  body += "\nSitemap: " + SEO.SITE_URL + "/sitemap.xml\n";
  if (!(SEO.ALLOW_AI_TRAINING_BOTS && SEO.ALLOW_AI_SEARCH_BOTS && SEO.ALLOW_AI_USER_BOTS)) {
    body += "\n";
    if (!SEO.ALLOW_AI_TRAINING_BOTS) {
      body += "User-agent: GPTBot\nUser-agent: ClaudeBot\nUser-agent: Google-Extended\nUser-agent: Applebot-Extended\nUser-agent: CCBot\nUser-agent: meta-externalagent\nUser-agent: Amazonbot\nDisallow: /\n";
    }
    if (!SEO.ALLOW_AI_SEARCH_BOTS) {
      body += "\nUser-agent: OAI-SearchBot\nUser-agent: Claude-SearchBot\nUser-agent: PerplexityBot\nUser-agent: DuckAssistBot\nDisallow: /\n";
    }
    if (!SEO.ALLOW_AI_USER_BOTS) {
      body += "\nUser-agent: ChatGPT-User\nUser-agent: Claude-User\nUser-agent: Perplexity-User\nDisallow: /\n";
    }
  }
  return body;
}

// ------------------------------------------------------------- sitemaps (F-04/F-05)

async function lastmodMap(env: Env): Promise<Record<string, { h: string; t: number }>> {
  const rec = await env.STATE.get(SEO.KV_SEO_LASTMOD, "json").catch(() => null);
  return (rec && typeof rec === "object" && rec.urls) || {};
}

// Compute honest lastmods: update ts ONLY for URLs whose content hash
// changed. Returns [entries, changedUrls, wrote] for IndexNow (F-16).
async function computeLastmods(env: Env, candidates: { path: string; hash: string }[]): Promise<{ map: Record<string, string>; changed: string[] }> {
  const prev = await lastmodMap(env);
  const now = Date.now();
  const next: Record<string, { h: string; t: number }> = {};
  const outIso: Record<string, string> = {};
  const changed: string[] = [];
  for (const c of candidates) {
    const p = prev[c.path];
    if (p && p.h === c.hash) {
      next[c.path] = p;
    } else {
      next[c.path] = { h: c.hash, t: now };
      changed.push(c.path);
    }
    outIso[c.path] = new Date(next[c.path].t).toISOString();
  }
  const prevKeys = Object.keys(prev).length;
  if (changed.length || prevKeys !== candidates.length) {
    await env.STATE.put(SEO.KV_SEO_LASTMOD, JSON.stringify({ urls: next }), { expirationTtl: 400 * 86400 }).catch(() => { });
  }
  return { map: outIso, changed };
}

function matchHash(sm: SeoMatch): string {
  const m = sm.s;
  return sha1ish([m.utcDate, m.status, m.venue || "", m.round || "", m.homeTeam.name, m.awayTeam.name,
  m.competition.code, m.score ? JSON.stringify(m.score) : ""].join("|"));
}

function urlNode(path: string, lastmod: string): string {
  return "  <url><loc>" + xmlEsc(absUrl(path)) + "</loc><lastmod>" + xmlEsc(lastmod) + "</lastmod></url>\n";
}

function urlsetXml(rows: string): string {
  return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + rows + "</urlset>\n";
}

export async function buildSitemapIndex(env: Env): Promise<string> {
  const ctx = await getSeoCtx(env);
  const now = new Date().toISOString();
  const kids = ["pages", "competitions", "teams", "matches-upcoming", "matches-archive"];
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
  for (const k of kids) {
    xml += "  <sitemap><loc>" + xmlEsc(SEO.SITE_URL + "/sitemaps/" + k + ".xml") + "</loc><lastmod>" + xmlEsc(now) + "</lastmod></sitemap>\n";
  }
  xml += "</sitemapindex>\n";
  return xml;
}

const STATIC_PAGES = [
  "/", "/matches", "/matches/today", "/matches/tomorrow", "/matches/this-week", "/matches/this-weekend",
  "/teams", "/competitions", "/about", "/methodology", "/contact", "/privacy", "/terms", "/data", "/sitemap"
];

export async function buildSitemap(env: Env, kind: string): Promise<{ xml: string; changedUrls: string[] }> {
  const ctx = await getSeoCtx(env);
  let candidates: { path: string; hash: string }[] = [];
  let rows = "";
  if (kind === "pages") {
    // Hand-written pages: lastmod = the content version stamp (SEO_AUDIT:
    // bumped only when the text is actually edited).
    for (const p of STATIC_PAGES) rows += urlNode(p, SEO.CONTENT_VERSION);
  } else if (kind === "matches-upcoming" || kind === "matches-archive") {
    if (kind === "matches-archive") await syncArchive(env, ctx);
    const list = kind === "matches-upcoming" ? upcomingBig(ctx) : finishedRecent(ctx, 30);
    candidates = list.map((sm) => ({
      path: matchPath(sm.s.homeTeam.name, sm.s.awayTeam.name, sm.s.utcDate),
      hash: matchHash(sm)
    }));
    // de-dup by path (rematches/double fixtures)
    const seen = new Set<string>();
    candidates = candidates.filter((c) => (seen.has(c.path) ? false : (seen.add(c.path), true)));
    const { map, changed } = await computeLastmods(env, candidates);
    for (const c of candidates) rows += urlNode(c.path, map[c.path]);
    return { xml: urlsetXml(rows), changedUrls: changed.map(absUrl) };
  } else if (kind === "teams") {
    for (const e of teamsIndex(ctx)) {
      const hash = sha1ish(e.name + "|" + e.upcomingBig + "|" + (e.next ? e.next.s.utcDate : ""));
      candidates.push({ path: "/teams/" + e.slug, hash });
    }
    const { map, changed } = await computeLastmods(env, candidates);
    for (const c of candidates) rows += urlNode(c.path, map[c.path]);
    return { xml: urlsetXml(rows), changedUrls: changed.map(absUrl) };
  } else if (kind === "competitions") {
    for (const e of compsIndex(ctx)) {
      const hash = sha1ish(e.code + "|" + e.upcomingBig + "|" + (e.next ? e.next.s.utcDate : ""));
      candidates.push({ path: "/competitions/" + e.slug, hash });
    }
    const { map, changed } = await computeLastmods(env, candidates);
    for (const c of candidates) rows += urlNode(c.path, map[c.path]);
    return { xml: urlsetXml(rows), changedUrls: changed.map(absUrl) };
  }
  return { xml: urlsetXml(rows), changedUrls: [] };
}

// ------------------------------------------------------------- calendar.ics (F-11)

export async function buildCalendar(env: Env): Promise<string> {
  const ctx = await getSeoCtx(env);
  const list = upcomingBig(ctx).filter((sm) => new Date(sm.s.utcDate).getTime() < Date.now() + 30 * 864e5).slice(0, 120);
  let ics = "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//SportSignal//Fixtures//FA\r\nCALSCALE:GREGORIAN\r\nMETHOD:PUBLISH\r\n";
  ics += "X-WR-CALNAME:" + icsEsc("بازی‌های بزرگ فوتبال — SportSignal") + "\r\n";
  ics += "X-WR-TIMEZONE:UTC\r\n";
  for (const sm of list) {
    const m = sm.s;
    const uid = String(m.id || sha1ish(m.homeTeam.name + m.awayTeam.name + m.utcDate)) + "@sportsignal.ir";
    const dt = m.utcDate.replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
    ics += "BEGIN:VEVENT\r\n";
    ics += "UID:" + uid + "\r\n";
    ics += "DTSTAMP:" + (ctx.fetchedAt || new Date().toISOString()).replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z") + "\r\n";
    ics += "DTSTART:" + dt + "\r\n";
    ics += "SUMMARY:" + icsEsc((m.homeTeam.faName || m.homeTeam.name) + " – " + (m.awayTeam.faName || m.awayTeam.name) + " (" + (m.competition.faName || m.competition.code) + ")") + "\r\n";
    if (m.venue) ics += "LOCATION:" + icsEsc(m.venue) + "\r\n";
    ics += "URL:" + absUrl(matchPath(m.homeTeam.name, m.awayTeam.name, m.utcDate)) + "\r\n";
    ics += "END:VEVENT\r\n";
  }
  ics += "END:VCALENDAR\r\n";
  return ics;
}

// ------------------------------------------------------------- feed.xml (F-12)

export async function buildFeed(env: Env): Promise<string> {
  const ctx = await getSeoCtx(env);
  const upcoming = upcomingBig(ctx).slice(0, 20);
  const finished = finishedRecent(ctx, 3).slice(0, 10);
  const all = [...upcoming, ...finished];
  const updated = ctx.fetchedAt || new Date().toISOString();
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<feed xmlns="http://www.w3.org/2005/Atom">\n';
  xml += "<title>" + xmlEsc("بازی‌های بزرگ فوتبال — SportSignal") + "</title>\n";
  xml += "<id>" + xmlEsc(SEO.SITE_URL + "/feed.xml") + "</id>\n";
  xml += '<link rel="self" href="' + xmlEsc(SEO.SITE_URL + "/feed.xml") + '"/>\n';
  xml += '<link rel="alternate" href="' + xmlEsc(SEO.SITE_URL + "/") + '"/>\n';
  xml += "<updated>" + xmlEsc(updated) + "</updated>\n";
  for (const sm of all) {
    const m = sm.s;
    const path = matchPath(m.homeTeam.name, m.awayTeam.name, m.utcDate);
    const title = (m.homeTeam.faName || m.homeTeam.name) + " – " + (m.awayTeam.faName || m.awayTeam.name) +
      (m.score && m.score.home != null ? " " + m.score.home + "-" + m.score.away : "");
    xml += "<entry>\n";
    xml += "<id>" + xmlEsc(absUrl(path) + "#event") + "</id>\n";
    xml += "<title>" + xmlEsc(title) + "</title>\n";
    xml += '<link href="' + xmlEsc(absUrl(path)) + '"/>\n';
    xml += "<updated>" + xmlEsc(updated) + "</updated>\n";
    xml += "<summary>" + xmlEsc((m.competition.faName || m.competition.code) + " — " + m.utcDate) + "</summary>\n";
    xml += "</entry>\n";
  }
  xml += "</feed>\n";
  return xml;
}

// ------------------------------------------------------- /api/matches.json (F-13)

export async function buildMatchesJson(env: Env): Promise<string> {
  const ctx = await getSeoCtx(env);
  const upcoming = upcomingBig(ctx).slice(0, 100);
  const finished = finishedRecent(ctx, 7).slice(0, 20);
  const shape = (sm: SeoMatch) => {
    const m = sm.s;
    return {
      id: m.id != null ? String(m.id) : null,
      home_team: m.homeTeam.name,
      home_team_fa: m.homeTeam.faName || null,
      away_team: m.awayTeam.name,
      away_team_fa: m.awayTeam.faName || null,
      kickoff_utc: m.utcDate,
      competition: COMP_EN[m.competition.code] || m.competition.code,
      competition_fa: m.competition.faName || translateCompetition(m.competition.code) || null,
      round: m.round || null,
      status: String(sm.raw.status || m.status || "").toLowerCase(),
      venue: m.venue || null,
      score: m.score && m.score.home != null ? { home: m.score.home, away: m.score.away } : null,
      url: absUrl(matchPath(m.homeTeam.name, m.awayTeam.name, m.utcDate))
    };
  };
  const payload = {
    site: SEO.SITE_URL,
    generated_at: ctx.fetchedAt || new Date().toISOString(),
    timezone_note: "All kickoff_utc values are ISO 8601 UTC. Display site timezone: " + SEO.DISPLAY_TZ + ".",
    licence: "Attribution required: SportSignal (https://sportsignal.ir). Base data: " + SEO.DATA_SOURCE_NAME + ".",
    upcoming: upcoming.map(shape),
    recent_finished: finished.map(shape)
  };
  return JSON.stringify(payload, null, 2);
}

// ------------------------------------------------------- llms.txt (F-14) + security.txt (F-15)

export function buildLlmsTxt(): string {
  return `# SportSignal

> ${SEO.SITE_TAGLINE}

بازی‌های بزرگ فوتبال (لیگ قهرمانان اروپا، لیگ برتر انگلیس، لالیگا، سری‌آ، بوندسلیگا، لیگ یک فرانسه و جام‌های حذفی) با تاریخ و ساعت دقیق به وقت تهران و زمان جهانی.

## Main pages

- [Home — next big matches](https://sportsignal.ir/): the next big football matches with countdown
- [All upcoming big matches](https://sportsignal.ir/matches)
- [Matches today](https://sportsignal.ir/matches/today)
- [Matches this week](https://sportsignal.ir/matches/this-week)
- [Teams](https://sportsignal.ir/teams)
- [Competitions](https://sportsignal.ir/competitions)
- [How we pick "big matches"](https://sportsignal.ir/methodology)
- [Machine-readable data](https://sportsignal.ir/data)

## Data

- Machine JSON: https://sportsignal.ir/api/matches.json
- iCalendar: https://sportsignal.ir/calendar.ics
- Atom feed: https://sportsignal.ir/feed.xml

Times are UTC (ISO 8601) in machine files; the site displays Tehran time plus UTC.
`;
}

export function buildSecurityTxt(): string {
  return `Contact: https://t.me/SportSignalAlertsBot
Contact: mailto:security@sportsignal.ir
Expires: 2027-01-01T00:00:00.000Z
Preferred-Languages: fa, en
Canonical: https://sportsignal.ir/.well-known/security.txt
`;
}

// ------------------------------------------------------- OG images (SO-03/SO-04)

// Text-only 1200x630 match card (no crests — licence-safe default). Uses
// the same resvg-wasm machinery as the Telegram cards, cached at the edge.
export async function buildMatchOgPng(env: Env, slug: string): Promise<ArrayBuffer | null> {
  const ctx = await getSeoCtx(env);
  const { findMatchBySlug } = await import("./data");
  const sm = findMatchBySlug(ctx, slug);
  if (!sm) return null;
  const m = sm.s;
  const esc2 = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const comp = COMP_EN[m.competition.code] || m.competition.code;
  const when = new Date(m.utcDate);
  const dateEn = new Intl.DateTimeFormat("en-GB", { timeZone: SEO.DISPLAY_TZ, weekday: "long", day: "numeric", month: "long" }).format(when);
  const timeEn = new Intl.DateTimeFormat("en-GB", { timeZone: SEO.DISPLAY_TZ, hour: "2-digit", minute: "2-digit", hour12: false }).format(when);
  const finished = String(sm.raw.status || "").toUpperCase() === "FINISHED" && m.score && m.score.home != null;
  const mid = finished ? m.score.home + " – " + m.score.away : "vs";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
<rect width="1200" height="630" fill="#0f172a"/>
<rect x="40" y="40" width="1120" height="550" rx="24" fill="none" stroke="#5ea0ff" stroke-opacity="0.35" stroke-width="2"/>
<text x="600" y="150" font-family="Vazirmatn, DejaVu Sans, sans-serif" font-size="64" font-weight="800" fill="#ffffff" text-anchor="middle">${esc2(m.homeTeam.name)}</text>
<text x="600" y="330" font-family="Vazirmatn, DejaVu Sans, sans-serif" font-size="72" font-weight="300" fill="#5ea0ff" text-anchor="middle">${esc2(mid)}</text>
<text x="600" y="470" font-family="Vazirmatn, DejaVu Sans, sans-serif" font-size="64" font-weight="800" fill="#ffffff" text-anchor="middle">${esc2(m.awayTeam.name)}</text>
<text x="600" y="540" font-family="Vazirmatn, DejaVu Sans, sans-serif" font-size="34" fill="#9aa4b2" text-anchor="middle">${esc2(comp + " · " + dateEn + " · " + timeEn + " Tehran")}</text>
<text x="60" y="80" font-family="Vazirmatn, DejaVu Sans, sans-serif" font-size="30" font-weight="700" fill="#5ea0ff">SportSignal</text>
</svg>`;
  try {
    const { initResvgOnce, resvgFontBuffers } = await import("../card");
    const Resvg = await initResvgOnce();
    if (!Resvg) return null;
    const res = new Resvg(svg, {
      fitTo: { mode: "width", value: 1200 },
      font: {
        fontBuffers: resvgFontBuffers(),
        loadSystemFonts: false,
        defaultFontFamily: "Vazirmatn",
        defaultFontSize: 16
      }
    });
    const png = res.render().asPng();
    return png.buffer.slice(png.byteOffset, png.byteOffset + png.byteLength);
  } catch (e) {
    console.warn("OG png render failed: " + (e as any).message);
    return null;
  }
}

export function sitemapHeaders(ttl: number): Record<string, string> {
  return {
    "content-type": "application/xml; charset=utf-8",
    "cache-control": "public, max-age=" + ttl
  };
}
