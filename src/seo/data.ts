// SportSignal — SEO data layer. Reads ONLY KV (payload + pool + live
// overlay), never triggers provider sweeps: HTML pages must stay fast
// (PF-01) and must not burn API quota. Mirrors the SWR endpoint's serve
// path (public-swr.ts) — same freshness contract, HTML flavor.

import type { Env } from "../types";
import { CONFIG } from "../config";
import { getCachedMatches } from "../match-pool";
import { applyLiveOverlay, pubMatch } from "../public-matches";
import { ensureFaAiCache, ensureFaVenueCache, translateVenue } from "../translate";
import { normalizeTeamName } from "../teams";
// v13.85-stadiumchip: the home-ground table + one-off-neutral gate moved to
// the root module grounds.ts (shared with pubMatch — one source of truth).
import { homeGround } from "../grounds";
import { isLiveStatus } from "../match-model";
import { shouldNotify } from "../match-classify";
import { fetchJSON } from "../utils";
import { SEO } from "./config";
import { teamSlug, compSlug } from "../slugs";
import { isLiveSt } from "./utils";

export interface SeoCtx {
  env: Env;
  payload: any;         // home-shaped payload (possibly empty degraded object)
  pool: any[];          // raw pool rows, live-patched
  shaped: any[];        // pubMatch-shaped pool rows (fa names, rounds, venueFa…)
  fetchedAt: string | null; // the DATA epoch (pool stamp — G-06)
  degraded: boolean;    // true when nothing but (at best) a stale snapshot
}

function emptyPayload(): any {
  return { upcoming: [], finished: [], nextBig: null, topSpot: null, thisWeek: [], nextWeek: [], standings: {}, cups: [], ucl: null, fetchedAt: null, degraded: true };
}

// The home-shaped payload with live overlay applied (fast path first).
async function loadPayload(env: Env): Promise<{ data: any; degraded: boolean }> {
  const [kv, ov] = await Promise.all([
    env.STATE.get(CONFIG.KV_PUBLIC_MATCHES, "json").catch(() => null),
    env.STATE.get(CONFIG.KV_LIVE_OVERLAY, "json").catch(() => null)
  ]);
  if (kv && kv.data && Array.isArray(kv.data.upcoming)) {
    const served = applyLiveOverlay(Object.assign({}, kv.data), ov);
    return { data: served, degraded: false };
  }
  const snap = await env.STATE.get(CONFIG.KV_PUBLIC_SNAPSHOT, "json").catch(() => null);
  if (snap && snap.data && (snap.data.upcoming || snap.data.finished || snap.data.topSpot || snap.data.ucl || snap.data.standings)) {
    const served = applyLiveOverlay(Object.assign({}, snap.data), ov);
    return { data: served, degraded: true };
  }
  return { data: emptyPayload(), degraded: true };
}

// Full SEO context for a request. Two KV reads in the happy path (payload +
// pool) + the two fa caches (isolate-cached after the first hit).
export async function getSeoCtx(env: Env): Promise<SeoCtx> {
  const payloadPromise = loadPayload(env);
  await Promise.all([
    ensureFaAiCache(env).catch(() => { }),
    ensureFaVenueCache(env).catch(() => { })
  ]);
  const payloadRes = await payloadPromise;
  let pool: any[] = [];
  let poolStamp: string | null = null;
  try {
    const rec = await env.STATE.get(CONFIG.KV_MATCHES_KEY, "json").catch(() => null);
    if (rec && Array.isArray(rec.matches)) {
      pool = rec.matches;
      poolStamp = rec.fetchedAt || null;
    }
  } catch (e) { /* pool unavailable — pages fall back to the payload lists */ }
  const ov = await env.STATE.get(CONFIG.KV_LIVE_OVERLAY, "json").catch(() => null);
  if (pool.length && ov) pool = applyLiveOverlay({ pool: pool.slice() }, ov).pool;
  const shaped = pool.map((m) => pubMatch(m));
  const fetchedAt = poolStamp || payloadRes.data.fetchedAt || null;
  return { env, payload: payloadRes.data, pool, shaped, fetchedAt, degraded: payloadRes.degraded && !pool.length };
}

// --- selection helpers (same eligibility rules as the public payload) ---

export function payloadTop3(payload: any): Record<string, Set<string>> {
  const out: Record<string, Set<string>> = {};
  const st = payload && payload.standings;
  if (!st) return out;
  for (const code of Object.keys(st)) {
    const teams = st[code] && st[code].teams;
    if (Array.isArray(teams) && teams.length) {
      out[code] = new Set(teams.slice(0, 3).map((t: any) => normalizeTeamName(t.name)));
    }
  }
  return out;
}

export function isBigForSeo(m: any, top3: Record<string, Set<string>>): boolean {
  if (!m || !m.competition) return false;
  if (shouldNotify(m)) return true;
  const set = top3[m.competition.code];
  if (!set) return false;
  return set.has(normalizeTeamName(m.homeTeam.name)) || set.has(normalizeTeamName(m.awayTeam.name));
}

export interface SeoMatch {
  raw: any;      // pool row (status/score truth)
  s: any;        // shaped (pubMatch) row for display
}

const PLAYABLE_FUTURE = (raw: any, now: number) =>
  isLiveSt(raw.status) || (new Date(raw.utcDate).getTime() > now &&
    raw.status !== "FINISHED" && raw.status !== "CANCELLED" && raw.status !== "CANCELED" &&
    raw.status !== "POSTPONED" && raw.status !== "SUSPENDED");

export function upcomingBig(ctx: SeoCtx): SeoMatch[] {
  const top3 = payloadTop3(ctx.payload);
  const now = Date.now();
  const horizon = now + 92 * 864e5;
  return ctx.shaped
    .map((s, i) => ({ raw: ctx.pool[i], s }))
    .filter(({ raw, s }) => raw && raw.utcDate &&
      new Date(raw.utcDate).getTime() <= horizon &&
      PLAYABLE_FUTURE(raw, now) &&
      (isBigForSeo(raw, top3) || s.big))
    .sort((a, b) => {
      const la = isLiveStatus(a.raw.status) ? 0 : 1, lb = isLiveStatus(b.raw.status) ? 0 : 1;
      return la - lb || new Date(a.raw.utcDate).getTime() - new Date(b.raw.utcDate).getTime();
    });
}

export function finishedRecent(ctx: SeoCtx, days = 7): SeoMatch[] {
  const top3 = payloadTop3(ctx.payload);
  const now = Date.now();
  return ctx.shaped
    .map((s, i) => ({ raw: ctx.pool[i], s }))
    .filter(({ raw, s }) => raw && raw.utcDate && raw.status === "FINISHED" &&
      now - new Date(raw.utcDate).getTime() < days * 864e5 &&
      (isBigForSeo(raw, top3) || s.big))
    .sort((a, b) => new Date(b.raw.utcDate).getTime() - new Date(a.raw.utcDate).getTime())
    .slice(0, 30);
}

export function teamMatches(ctx: SeoCtx, teamName: string): { upcoming: SeoMatch[]; finished: SeoMatch[] } {
  const norm = normalizeTeamName(teamName);
  const now = Date.now();
  // A team page shows the team's own followed/big matches (the page exists
  // because the team is followed — its matches ARE the site's subject).
  const all = ctx.shaped.map((s, i) => ({ raw: ctx.pool[i], s })).filter(({ raw }) =>
    raw && raw.homeTeam && raw.awayTeam &&
    (normalizeTeamName(raw.homeTeam.name) === norm || normalizeTeamName(raw.awayTeam.name) === norm));
  const upcoming = all
    .filter(({ raw }) => PLAYABLE_FUTURE(raw, now))
    .sort((a, b) => new Date(a.raw.utcDate).getTime() - new Date(b.raw.utcDate).getTime());
  const finished = all
    .filter(({ raw }) => raw.status === "FINISHED" && now - new Date(raw.utcDate).getTime() < 30 * 864e5)
    .sort((a, b) => new Date(b.raw.utcDate).getTime() - new Date(a.raw.utcDate).getTime())
    .slice(0, 10);
  return { upcoming, finished };
}

export function compMatches(ctx: SeoCtx, code: string): SeoMatch[] {
  const now = Date.now();
  return ctx.shaped
    .map((s, i) => ({ raw: ctx.pool[i], s }))
    .filter(({ raw }) => raw && raw.competition && raw.competition.code === code && PLAYABLE_FUTURE(raw, now))
    .sort((a, b) => {
      const la = isLiveStatus(a.raw.status) ? 0 : 1, lb = isLiveStatus(b.raw.status) ? 0 : 1;
      return la - lb || new Date(a.raw.utcDate).getTime() - new Date(b.raw.utcDate).getTime();
    });
}

export interface TeamEntry {
  name: string;       // provider (English) name
  faName: string | null;
  slug: string;
  upcomingBig: number;
  next: SeoMatch | null;
}

// Teams index — every pool team with at least one UPCOMING big match
// (U-04 threshold: 1). Sorted by next kickoff.
export function teamsIndex(ctx: SeoCtx): TeamEntry[] {
  const top3 = payloadTop3(ctx.payload);
  const now = Date.now();
  const byName = new Map<string, TeamEntry>();
  ctx.shaped.forEach((s, i) => {
    const raw = ctx.pool[i];
    if (!raw || !raw.homeTeam || !raw.utcDate) return;
    if (!isBigForSeo(raw, top3) && !s.big) return;
    if (!PLAYABLE_FUTURE(raw, now)) return;
    for (const side of ["homeTeam", "awayTeam"] as const) {
      const t = raw[side];
      if (!t || !t.name) continue;
      let e = byName.get(t.name);
      if (!e) {
        e = { name: t.name, faName: (s[side] && s[side].faName) || null, slug: "", upcomingBig: 0, next: null };
        byName.set(t.name, e);
      }
      e.upcomingBig++;
      if (!e.next || new Date(raw.utcDate).getTime() < new Date(e.next.raw.utcDate).getTime()) {
        e.next = { raw, s };
      }
    }
  });
  const list = Array.from(byName.values());
  for (const e of list) e.slug = teamSlug(e.name);
  // U-03 (one URL per content): distinct provider names can slug to the same
  // team (e.g. "SS Lazio" and "Lazio"). First-by-next-kickoff wins the slug;
  // the loser is skipped entirely (no duplicate URLs, no dupe titles).
  const bySlug = new Map<string, TeamEntry>();
  const sorted = list.sort((a, b) => (a.next && b.next ? new Date(a.next.raw.utcDate).getTime() - new Date(b.next.raw.utcDate).getTime() : 0));
  for (const e of sorted) {
    if (!bySlug.has(e.slug)) bySlug.set(e.slug, e);
  }
  return Array.from(bySlug.values());
}

export interface CompEntry {
  code: string;
  slug: string;
  upcomingBig: number;
  next: SeoMatch | null;
}

export function compsIndex(ctx: SeoCtx): CompEntry[] {
  const top3 = payloadTop3(ctx.payload);
  const now = Date.now();
  const byCode = new Map<string, CompEntry>();
  ctx.shaped.forEach((s, i) => {
    const raw = ctx.pool[i];
    if (!raw || !raw.competition || !raw.utcDate) return;
    if (!isBigForSeo(raw, top3) && !s.big) return;
    if (!PLAYABLE_FUTURE(raw, now)) return;
    let e = byCode.get(raw.competition.code);
    if (!e) {
      e = { code: raw.competition.code, slug: "", upcomingBig: 0, next: null };
      byCode.set(raw.competition.code, e);
    }
    e.upcomingBig++;
    if (!e.next || new Date(raw.utcDate).getTime() < new Date(e.next.raw.utcDate).getTime()) {
      e.next = { raw, s };
    }
  });
  const list = Array.from(byCode.values());
  for (const e of list) e.slug = compSlug(e.code);
  return list;
}

// Match lookup by slug: /matches/{home}-vs-{away}-{YYYY-MM-DD}
export function findMatchBySlug(ctx: SeoCtx, slug: string): SeoMatch | null {
  const m = /^([a-z0-9-]+)-vs-([a-z0-9-]+)-(\d{4}-\d{2}-\d{2})$/.exec(slug);
  if (!m) return null;
  const [, homeSlug, awaySlug, day] = m;
  let best: any = null;
  ctx.shaped.forEach((s, i) => {
    const raw = ctx.pool[i];
    if (!raw || !raw.homeTeam || !raw.awayTeam || !raw.utcDate) return;
    if (String(raw.utcDate).slice(0, 10) !== day) return;
    if (teamSlug(raw.homeTeam.name) !== homeSlug || teamSlug(raw.awayTeam.name) !== awaySlug) return;
    if (!best || new Date(raw.utcDate).getTime() < new Date(best.raw.utcDate).getTime()) best = { raw, s };
  });
  return best as SeoMatch | null;
}

export function findTeamBySlug(ctx: SeoCtx, slug: string): TeamEntry | null {
  const indexed = teamsIndex(ctx);
  for (const e of indexed) {
    if (e.slug === slug) return e;
  }
  // fall back: any pool team (even 0 upcoming) so the page can noindex itself
  let found: any = null;
  ctx.shaped.forEach((s, i) => {
    const raw = ctx.pool[i];
    if (!raw || !raw.homeTeam || !raw.awayTeam || found) return;
    for (const side of ["homeTeam", "awayTeam"] as const) {
      const t = raw[side];
      if (t && t.name && teamSlug(t.name) === slug) {
        found = { name: t.name, faName: (s[side] && s[side].faName) || null, slug, upcomingBig: 0, next: null };
      }
    }
  });
  return found as TeamEntry | null;
}

// ---- v13.82-matchday: venue hydration + similar matches ----
//
// QA finding (2026-10-13): the match page's .mvenue element was dead code —
// no provider supplies venue for SCHEDULED matches (FD's list endpoint
// returns none — verified live: venue null on every upcoming row incl.
// Emirates-hosted fixtures; sportscore doesn't map it; TSP's strVenue is
// rarely populated in the free tier). The FD DETAIL endpoint
// (/v4/matches/{id}) is the one reliable source. This helper runs on the
// match-page render path ONLY (the page HTML is cache-API-cached 5 min, so
// the real fetch rate is ≤1 per match per cache window, KV-cached 24h —
// positive AND negative — so a match without venue is re-checked at most
// once a day). Budget discipline: numeric-FD-id gate (tsd-/spsc- rows skip
// straight out), ONE attempt, a 5s race guard so a slow FD can never hang
// the page render, and fail-closed semantics — any error leaves the page
// exactly as it was (no venue element, no answer-sentence mention).
export async function hydrateMatchVenue(env: Env, sm: SeoMatch | null): Promise<SeoMatch | null> {
  if (!sm) return sm;
  if (sm.s && sm.s.venue) return sm;             // already carries one (TSP/live-detail row)
  // v13.82: the deterministic source first — the HOME team's ground. For
  // league/group fixtures the venue IS the home stadium (a stable mapping;
  // see CONFIG.TEAM_STADIUMS). This lights up followed-team match pages
  // with ZERO subrequests and skips the FD fetch entirely. One-off NEUTRAL
  // stages (finals / third-place games — including roundRaw "Final" but
  // never "semi"/"quarter", which are two-legged home-and-away) are
  // excluded: the administrative home team doesn't host there.
  // v13.85-stadiumchip: the table + gate moved to src/grounds.ts — shared
  // with pubMatch (the public payload) so the homepage chips and the match
  // pages agree on ONE source of truth.
  const g = homeGround(
    sm.raw.homeTeam && sm.raw.homeTeam.name,
    sm.raw.stage,
    sm.raw.roundRaw
  );
  if (g) {
    sm.raw.venue = g.en;
    sm.s.venue = g.en;
    sm.s.venueFa = g.fa;
    return sm;
  }
  const id = sm.raw && sm.raw.id;
  if (!id || !/^\d+$/.test(String(id))) return sm; // FD rows only — providers with string ids have no detail endpoint
  const key = CONFIG.KV_VENUE_CACHE + id;
  let rec: any = null;
  try {
    rec = await env.STATE.get(key, "json");
  } catch (e) { rec = null; }
  if (rec == null) {
    try {
      // one attempt, never blocks the render longer than 5s (venue is a
      // nice-to-have; the page must not wait on a slow upstream)
      const d: any = await Promise.race([
        fetchJSON("https://api.football-data.org/v4/matches/" + id, 1, { "X-Auth-Token": env.API_TOKEN }),
        new Promise((r) => setTimeout(() => r(null), 5000))
      ]);
      const det = d && d.match ? d.match : d;
      const venue = det && typeof det.venue === "string" && det.venue.trim() ? det.venue.trim() : null;
      rec = { v: venue };
      await env.STATE.put(key, JSON.stringify(rec), { expirationTtl: 86400 }).catch(() => { });
    } catch (e) {
      return sm; // fail-closed: transient failure ≠ "no venue" (no negative cache)
    }
  }
  if (rec && rec.v) {
    sm.raw.venue = rec.v;
    sm.s.venue = rec.v;
    sm.s.venueFa = translateVenue(rec.v) || rec.v;
  }
  return sm;
}

// Sibling matches for the match page's "بازی‌های مرتبط" card: same
// competition AND same stage (matchday number, falling back to the round
// string for TSP/sportscore rows) first, then the rest of the same
// competition, then same-UTC-day matches from other competitions. Upcoming
// only (the card sells the next fixtures, not history), the match itself
// excluded, deduped by pairing, kickoff-ordered, capped.
export function similarMatches(ctx: SeoCtx, sm: SeoMatch, max = 6): SeoMatch[] {
  if (!sm || !sm.raw) return [];
  const selfDay = String(sm.raw.utcDate || "").slice(0, 10);
  const selfHome = sm.raw.homeTeam && sm.raw.homeTeam.name;
  const selfAway = sm.raw.awayTeam && sm.raw.awayTeam.name;
  const selfComp = sm.raw.competition && sm.raw.competition.code;
  const selfMD = sm.raw.matchday != null ? sm.raw.matchday : null;
  const selfRound = sm.raw.roundRaw != null && String(sm.raw.roundRaw).trim() ? String(sm.raw.roundRaw).trim() : (sm.raw.round != null && sm.raw.round !== "LEAGUE_STAGE" ? sm.raw.round : null);
  const now = Date.now();
  const cands: { s: any; raw: any; stage: number; t: number }[] = [];
  ctx.shaped.forEach((s, i) => {
    const raw = ctx.pool[i];
    if (!raw || !raw.utcDate || !raw.homeTeam || !raw.awayTeam || !raw.competition) return;
    const t = new Date(raw.utcDate).getTime();
    if (!(t > now) || isLiveSt(raw.status)) return; // upcoming only
    if (raw.homeTeam.name === selfHome && raw.awayTeam.name === selfAway && String(raw.utcDate).slice(0, 10) === selfDay) return; // self
    const comp = raw.competition.code;
    let stage = -1;
    if (comp === selfComp) {
      const md = raw.matchday != null ? raw.matchday : null;
      const round = raw.roundRaw != null && String(raw.roundRaw).trim() ? String(raw.roundRaw).trim() : (raw.round != null && raw.round !== "LEAGUE_STAGE" ? raw.round : null);
      if ((selfMD != null && md === selfMD) || (selfRound != null && round === selfRound)) stage = 0;
      else stage = 1;
    } else if (String(raw.utcDate).slice(0, 10) === selfDay) {
      stage = 2;
    }
    if (stage < 0) return;
    cands.push({ s, raw, stage, t });
  });
  cands.sort((a, b) => a.stage - b.stage || a.t - b.t);
  const seen = new Set<string>();
  const out: SeoMatch[] = [];
  for (const c of cands) {
    const k = c.raw.homeTeam.name + "|" + c.raw.awayTeam.name;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push({ raw: c.raw, s: c.s });
    if (out.length >= max) break;
  }
  return out;
}
