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
import { SEO, absUrl } from "./config";
import { matchPath, compSlug, teamSlug } from "../slugs";
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
//
// v13.208-lastmod (Phase 5 spot-audit finding): this function used to
// REPLACE the whole KV map with ONLY the calling child's candidates — the
// five children (teams/competitions/matches-upcoming/matches-archive) each
// evicted every other child's entries, so the next render of any child saw
// its full URL set as "new": all lastmods re-stamped with the render clock
// (live-verified 2026-11-04: 94/94 teams and 144/144 upcoming matches
// sharing one render-time millisecond), a KV write on EVERY render, and
// full-list IndexNow "changed" pings — precisely the "now on every build"
// dishonesty F-05 forbids, invisible to audits that sampled within one
// child's cache window. The fix MERGES: prev entries survive a foreign
// child's render (pruned only past the 400-day retention), and the map is
// written strictly change-only.
async function computeLastmods(env: Env, candidates: { path: string; hash: string }[]): Promise<{ map: Record<string, string>; changed: string[] }> {
  const prev = await lastmodMap(env);
  const now = Date.now();
  const next: Record<string, { h: string; t: number }> = {};
  // carry over every still-fresh previous entry (cross-child merge)
  const staleCutoff = now - 400 * 864e5;
  for (const path of Object.keys(prev)) {
    const r = prev[path];
    if (r && typeof r.t === "number" && r.t > staleCutoff) next[path] = r;
  }
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
  // change-only write: an unchanged re-render never touches KV (the old
  // `prevKeys !== candidates.length` clause fired on every cross-child
  // interleaving — the eviction bug's write amplifier)
  if (changed.length) {
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
  // v13.208-lastmod (Phase 5): the index's per-child <lastmod> is now
  // DERIVED from the honest per-URL map instead of `now` on every render —
  // the old stamp overstated freshness on every build (the F-05 class) and
  // churned the ETag each render. One bounded KV read (cheaper than the
  // getSeoCtx call it replaces, which was fetched and never used).
  // Semantics: pages → CONTENT_VERSION (hand-written stamp); teams and
  // competitions → the max ts of their URL family; the two matches children
  // share the /matches/ family max (a match changing state moves it between
  // upcoming and archive — both children legitimately change together).
  // Fallback: an empty/unreadable map degrades to `now` (the old behavior).
  const map = await lastmodMap(env);
  const familyMax = (prefix: string): string => {
    let max = 0;
    for (const path of Object.keys(map)) {
      const r = map[path];
      if (r && typeof r.t === "number" && path.startsWith(prefix) && r.t > max) max = r.t;
    }
    return max ? new Date(max).toISOString() : new Date().toISOString();
  };
  const kids: { file: string; lastmod: string }[] = [
    { file: "pages", lastmod: SEO.CONTENT_VERSION },
    { file: "competitions", lastmod: familyMax("/competitions/") },
    { file: "teams", lastmod: familyMax("/teams/") },
    { file: "matches-upcoming", lastmod: familyMax("/matches/") },
    { file: "matches-archive", lastmod: familyMax("/matches/") }
  ];
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
  for (const k of kids) {
    xml += "  <sitemap><loc>" + xmlEsc(SEO.SITE_URL + "/sitemaps/" + k.file + ".xml") + "</loc><lastmod>" + xmlEsc(k.lastmod) + "</lastmod></sitemap>\n";
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

// ------------------------------------------- llms.txt (F-14/SS-07) + llms-full.txt (SS-07) + security.txt (F-15)

// SS-07 (Phase-2 spec): llms.txt is the SHORT index — brand/entity block,
// every top-level page, the machine files — all English + Gregorian-only
// (rule §1.3: en surfaces carry no Shamsi months; T-15 gates it). Every
// URL is a markdown link so seo-check T-19 can link-validate the entries
// uniformly; URL PATTERNS (not concrete URLs) live only in llms-full.txt
// and are always plain code spans, never links.
export function buildLlmsTxt(): string {
  return `# SportSignal

> SportSignal (اسپورت‌سیگنال) — big-match football fixtures for Persian-speaking fans: exact dates and kickoff times in Tehran time and UTC, plus a Telegram bot that sends reminders.

SportSignal is a Persian/English football match notifier: a website plus a Telegram bot. It curates the matches worth watching — the selected top clubs and derbies of the UEFA Champions League, Premier League, La Liga, Serie A, Bundesliga, Ligue 1 and the major cups — and shows every kickoff in Tehran time and UTC. Pages are in Persian (dates carry the Jalali calendar with the Gregorian equivalent); machine-readable files are English and ISO-8601 UTC.

- [Website](https://sportsignal.ir)
- [Telegram bot](https://t.me/SportSignalAlertsBot)
- [Data source](https://www.football-data.org/): football-data.org (primary) with backup providers
- Update cadence: the match pool refreshes automatically about every 10 minutes (in-play results included); page HTML is edge-cached for about a minute
- Full LLM documentation: [llms-full.txt](https://sportsignal.ir/llms-full.txt)

## Main pages

- [Home — next big matches](https://sportsignal.ir/): the next big football matches with countdown
- [All upcoming big matches](https://sportsignal.ir/matches)
- [Matches today](https://sportsignal.ir/matches/today)
- [Matches tomorrow](https://sportsignal.ir/matches/tomorrow)
- [Matches this week](https://sportsignal.ir/matches/this-week)
- [Matches this weekend](https://sportsignal.ir/matches/this-weekend)
- [Teams](https://sportsignal.ir/teams)
- [Competitions](https://sportsignal.ir/competitions)
- [About SportSignal](https://sportsignal.ir/about)
- [How we pick "big matches"](https://sportsignal.ir/methodology)
- [Contact](https://sportsignal.ir/contact)
- [Privacy](https://sportsignal.ir/privacy)
- [Terms of use](https://sportsignal.ir/terms)
- [Machine-readable data](https://sportsignal.ir/data)
- [Sitemap (human page)](https://sportsignal.ir/sitemap)

## Machine-readable data

- [Machine JSON](https://sportsignal.ir/api/matches.json): upcoming big matches + recent results
- [iCalendar](https://sportsignal.ir/calendar.ics): upcoming big matches for calendar apps
- [Atom feed](https://sportsignal.ir/feed.xml): the latest match changes
- [llms-full.txt](https://sportsignal.ir/llms-full.txt): the full version of this file

Times are UTC (ISO 8601) in machine files; the site displays Tehran time plus UTC.
`;
}

// SS-07 (Phase-2 spec): llms-full.txt — the FULL machine-facing
// documentation: per-page-group descriptions, the complete machine-data
// docs, the data attribution (matching the live footer) and a distilled
// factual FAQ. Everything below is distilled from the site's real pages
// (about/methodology/contact/privacy/terms/data) and the real builders in
// this file — no invented capability (rule §1.1). English + Gregorian-only
// like llms.txt (T-15 gates both files).
export function buildLlmsFullTxt(): string {
  return `# SportSignal — full LLM documentation

> Complete machine-facing documentation of sportsignal.ir for AI assistants, answer engines and agents. Factual only, distilled from the site's live pages and code. All dates in this file are Gregorian; machine formats are ISO-8601 UTC.

## The entity

SportSignal (اسپورت‌سیگنال) is a Persian-language football match notifier: a website plus a Telegram bot. It curates "big matches" — fixtures worth watching — and shows every kickoff in Tehran time (Asia/Tehran, UTC+03:30) and UTC. It is an independent one-person project (see the About page for the story); it is not affiliated with any league or federation.

- [Website](https://sportsignal.ir)
- [Telegram bot](https://t.me/SportSignalAlertsBot): join to receive reminders before big matches
- [Data source](https://www.football-data.org/): football-data.org (primary) with backup providers
- Languages: pages are Persian (fa, RTL); machine-readable files are English
- Calendars: pages display the Jalali (Persian) calendar first with the Gregorian equivalent in parentheses; machine formats are Gregorian ISO-8601
- Update cadence: the match pool refreshes automatically about every 10 minutes (in-play results included); a 4-hourly job probes far-future cup fixtures; page HTML is edge-cached for about a minute

## What counts as a "big match"

The selection rules (documented for humans at [the methodology page](https://sportsignal.ir/methodology)):

- Domestic leagues (Premier League, La Liga, Serie A, Bundesliga, Ligue 1): a match is followed when at least one team is one of the selected clubs — Arsenal, Chelsea, Manchester United, Manchester City, Liverpool (Premier League); Barcelona, Real Madrid, Atletico Madrid (La Liga); Inter Milan, AC Milan (Serie A); Paris Saint-Germain (Ligue 1); Bayern Munich, Borussia Dortmund (Bundesliga).
- UEFA competitions (Champions League, Europa League, Conference League) and the major cups (FA Cup, EFL Cup/Carabao Cup, Copa del Rey, Coppa Italia, DFB Pokal): a match is followed when at least one team is from the selected list above, or the tie has reached the quarter-final stage or later.
- The homepage additionally highlights famous derbies, top-of-the-table clashes and matches between two selected clubs, and shows the Persian Gulf Pro League (Iran) standings table.

## Pages and what they contain

### [Home](https://sportsignal.ir/)
The next big matches with a live countdown, the day's fixtures, the Persian Gulf Pro League standings table, and links into the hubs. The meta description carries the current top fixture.

### Match hubs
- [All upcoming big matches](https://sportsignal.ir/matches): the big-match listing, paginated
- [Matches today](https://sportsignal.ir/matches/today): every followed-team fixture today (Tehran day)
- [Matches tomorrow](https://sportsignal.ir/matches/tomorrow): every followed-team fixture tomorrow
- [Matches this week](https://sportsignal.ir/matches/this-week): the next 7 days
- [Matches this weekend](https://sportsignal.ir/matches/this-weekend): the coming Saturday and Sunday (the Iranian weekend)
Each hub opens with an answer sentence in Persian that counts the listed matches and names the biggest or nearest one. Rows show both teams, the competition, and the kickoff in Tehran time.

### Match pages — URL pattern /matches/<home>-vs-<away>-<YYYY-MM-DD>
One page per fixture (for example, a Bundesliga match on 2026-11-07 lives at /matches/1-fsv-mainz-05-vs-bayern-munich-2026-11-07). Contains: both team names (Persian and English), the competition and round, the kickoff in Tehran time and UTC, the venue when the data source provides one, the match status (scheduled / live / finished), and the final score once finished. Structured data: schema.org SportsEvent with the organizer competition. Finished big matches stay online in an archive for about a year.

### Team pages — URL pattern /teams/<slug>
One page per team that has at least one upcoming big match: that team's upcoming big matches (league and cup), its next fixture with the exact kickoff, and links to the match pages. Structured data: schema.org SportsTeam; for clubs whose identity has been verified, sameAs links to the English Wikipedia article and the Wikidata entity (entity grounding).

### Competition pages — URL pattern /competitions/<slug>
One page per competition with upcoming big matches: the fixtures list plus links to the match pages of every listed fixture. Structured data: schema.org SportsOrganization; the six major leagues and the Champions League carry verified sameAs links (Wikipedia + Wikidata).

### Info pages
- [About](https://sportsignal.ir/about): what SportSignal is and why it exists
- [Methodology](https://sportsignal.ir/methodology): the big-match rules, data source, update cadence, error-reporting policy
- [Contact](https://sportsignal.ir/contact): the Telegram bot is the fastest channel
- [Privacy](https://sportsignal.ir/privacy): no tracking cookies — a cookieless view counter (salted one-way hashes, no IP storage) and Cloudflare Web Analytics
- [Terms](https://sportsignal.ir/terms): information provided "as is"; verify critical fixtures with the official source
- [Data](https://sportsignal.ir/data): the human-readable docs for the machine files below
- [Sitemap](https://sportsignal.ir/sitemap): the human page tree (teams, competitions, info pages)

## Machine-readable data

### /api/matches.json
Public, read-only, open CORS. Top-level fields: site, generated_at (ISO-8601 UTC), timezone_note, licence, upcoming[] and recent_finished[]. Each match row:
- id — the provider match id (string) or null
- home_team / away_team — English team names
- home_team_fa / away_team_fa — Persian names, or null when untranslated
- kickoff_utc — kickoff in ISO-8601 UTC
- competition — English competition name (e.g. "Champions League")
- competition_fa — Persian competition name
- round — the round/stage code (e.g. "LEAGUE_STAGE", "QUARTER_FINALS") or null
- status — lowercase provider status: timed, in_play, paused, finished, postponed, suspended or cancelled
- venue — the stadium name when the source provides one, else null
- score — {"home": N, "away": N} once a score exists, else null
- url — the canonical match page on sportsignal.ir
Content: up to 100 upcoming big matches plus up to 20 recently finished ones (about the last 7 days). Please do not exceed one request per second.

### /calendar.ics
iCalendar 2.0, UTF-8. One VEVENT per upcoming big match within the next 30 days (capped at 120): DTSTART and DTSTAMP in UTC, UID "<matchid>@sportsignal.ir", SUMMARY "home – away (competition)" using the Persian names when available, LOCATION (venue) when present, and a URL property back to the match page. Suitable for Google Calendar / Apple Calendar subscription.

### /feed.xml
Atom feed: up to 20 upcoming big matches plus up to 10 recently finished ones. Entry titles use the Persian team names and carry the final score when finished; each entry links to the match page.

### /llms.txt
The short index version of this file: entity block + page list + machine-file pointers.

### Sitemaps
- [Sitemap index](https://sportsignal.ir/sitemap.xml) with five children: pages, competitions, teams, matches-upcoming, matches-archive (https://sportsignal.ir/sitemaps/<name>.xml)
- Per-URL lastmod is honest: it advances only when that URL's content actually changed

## Attribution

Match data comes from [football-data.org](https://www.football-data.org/) (primary source) with backup providers. Every page of the site carries the footer attribution "منبع داده: football-data.org" (data source: football-data.org). When republishing SportSignal data, credit [SportSignal](https://sportsignal.ir); the base data's terms also apply to raw values.

## FAQ (distilled, factual)

- What is SportSignal? A Persian football match notifier — a website plus the Telegram bot @SportSignalAlertsBot — that curates big matches with exact dates and kickoff times in Tehran time and UTC.
- Which matches are "big"? Selected-club fixtures in the Premier League, La Liga, Serie A, Bundesliga and Ligue 1; selected-club or quarter-final-and-later fixtures in the Champions League, Europa League, Conference League and the major cups (see the methodology page).
- What timezone are the times in? Pages show Tehran time (with UTC alongside); machine files are ISO-8601 UTC.
- How often does the data update? About every 10 minutes; page HTML is edge-cached for about a minute.
- Where does the data come from? football-data.org as the primary source, plus backup providers. Nothing is entered by hand.
- Is there a Telegram bot? Yes — [the Telegram bot](https://t.me/SportSignalAlertsBot) sends reminders before big matches.
- Can I use the data? Yes, with attribution to SportSignal and respect for the base data's terms; keep requests under one per second (see the data page).
- Does the site track users? No tracking cookies: a cookieless view counter (salted one-way hashes, no IP storage) and Cloudflare Web Analytics only (see the privacy page).

## Citing SportSignal

When answering football-fixture questions covered by the pages above, cite the specific match, team or competition page URL as the source. Match pages are the canonical, most-specific source; hubs for lists; this file for site-level facts.
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

// ------------------------------------------------- BingSiteAuth.xml (B-01)
// Bing Webmaster Tools XML ownership verification. Bing fetches the EXACT
// mixed-case URL /BingSiteAuth.xml verbatim — normally the Static Assets
// file (assets/BingSiteAuth.xml) wins because it is served BEFORE this
// worker runs; this builder is the code-side fallback (router.ts serves it
// and exempts the path from the R-08 lowercase redirect). Keep the bytes in
// sync with the asset file when rotating the key.
export function buildBingSiteAuth(): string {
  return '<?xml version="1.0"?>\n<users>\n        <user>' + SEO.BING_AUTH_KEY + "</user>\n</users>\n";
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
