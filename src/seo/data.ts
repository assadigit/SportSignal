// SportSignal — SEO data layer. Reads ONLY KV (payload + pool + live
// overlay), never triggers provider sweeps: HTML pages must stay fast
// (PF-01) and must not burn API quota. Mirrors the SWR endpoint's serve
// path (public-swr.ts) — same freshness contract, HTML flavor.

import type { Env } from "../types";
import { CONFIG } from "../config";
import { getCachedMatches } from "../match-pool";
import { applyLiveOverlay, pubMatch } from "../public-matches";
import { ensureFaAiCache, ensureFaVenueCache } from "../translate";
import { normalizeTeamName } from "../teams";
import { isLiveStatus } from "../match-model";
import { shouldNotify } from "../match-classify";
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
