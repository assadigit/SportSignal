// SportSignal — the KV match pool (matches_v13_tracked): the write path
// (cacheMatches: 7-day retention, canonDedupe merge, change-only +
// stamp-age skip, budget-hold gate) and the read path (getCachedMatches).
// The blob shape {fetchedAt, source, matches[]} is a LIVE-STATE contract.
// Extracted from providers.ts in v13.74-providersplit.
import { CONFIG } from "./config";
import type { Env } from "./types";
import { canonDedupe } from "./dedupe";

export async function cacheMatches(env: Env, matches, source) {
  if (!matches || !matches.length) return;
  // v13.44-quotaguard: hard budget hold (env-scoped flag set by the cron
  // governor at ≥KV_WRITES_HARD). The pool write is deferred — the existing
  // pool keeps serving (fixtures are static days ahead; a slightly stale
  // live score for a few ticks is worth ~150 writes of quota headroom).
  if (env && env.KV_BUDGET_HOLD) {
    console.warn("\u{1F4B0} KV write budget hold \u2014 pool cache write deferred this tick");
    return;
  }
  try {
    const existing = await env.STATE.get(CONFIG.KV_MATCHES_KEY, "json").catch(() => null);
    // v13.52-swrsolid: retention 2d → 7d — the public page's finished card
    // carries a full week by design (v12.5: "the 12-hour window emptied the
    // card every morning"), and since public rebuilds went POOL-FIRST the
    // pool is that card's only source. Fetches still only BRING ~±2d of
    // data; the wider cutoff just RETAINS settled rows in KV a week (no
    // extra fetches, no extra requests — the rows are already there).
    const cutoff = Date.now() - 7 * 864e5;
    const head = (existing && Array.isArray(existing.matches) ? existing.matches : []).filter((m) => new Date(m.utcDate || 0).getTime() > cutoff);
    const merged = canonDedupe([...head, ...matches]);
    // v13.111-quotaslim: ROW SLIMMING at the write point. The live pool was
    // 617KB/707 rows — every consumer of the pool (all 144 cron ticks/day,
    // every serve path, every digest) JSON.parses it, and ~46% of the bytes
    // were fields NOTHING reads: football-data's nested odds / referees /
    // area / season / group / lastUpdated, team shortName/tla/id, score
    // winner/duration/halfTime, competition name/id/type. The whitelist
    // below is the EXACT set of fields the whole codebase consumes (field
    // audit 2026-10-17: id, utcDate, status, venue, stage, matchday, round,
    // roundRaw, minute, scorers, homeTeam.{name,crest,faName},
    // awayTeam.{name,crest,faName}, competition.{code,faName,emblem},
    // score.fullTime). In-memory lists keep whatever the providers brought
    // (the merge above is untouched); only the PERSISTED blob is slim, so
    // every future read parses ~331KB instead of 617KB — the free-plan
    // 10ms-CPU pressure that killed 1,007 invocations on Oct 14 drops with
    // it. The slim is applied to BOTH sides of the change-only comparison
    // below so an already-slim pool converges on the first stamp-advance
    // (≤90min) and identical-content skips stay exact.
    const slim = (m) => {
      if (!m || typeof m !== "object") return m;
      const out: any = {};
      for (const k of ["id", "utcDate", "status", "venue", "stage", "matchday", "round", "roundRaw", "roundFa", "minute", "scorers"]) {
        if (m[k] !== undefined && m[k] !== null) out[k] = m[k];
      }
      if (m.score && m.score.fullTime !== undefined && m.score.fullTime !== null) out.score = { fullTime: m.score.fullTime };
      for (const side of ["homeTeam", "awayTeam"]) {
        const t = m[side];
        if (t && typeof t === "object") {
          const o: any = {};
          for (const k of ["name", "crest", "faName"]) if (t[k] !== undefined && t[k] !== null) o[k] = t[k];
          if (Object.keys(o).length) out[side] = o;
        }
      }
      if (m.competition && typeof m.competition === "object") {
        const c: any = {};
        for (const k of ["code", "faName", "emblem"]) if (m.competition[k] !== undefined && m.competition[k] !== null) c[k] = m.competition[k];
        if (Object.keys(c).length) out.competition = c;
      }
      return out;
    };
    const mergedSlim = merged.map(slim);
    // v13.54-livestamp: the change-only skip now also requires the STAMP to
    // be fresh (<POOL_STAMP_REFRESH_MS). fetchedAt is the site header's
    // "Last updated" clock — on break weeks content never changes, the old
    // gate skipped every write, and the stamp froze for DAYS while sweeps
    // ran clean every 2h (the 2026-09-28 report: "Monday 15:39 · cached
    // (1407m ago)" with a perfectly healthy pipeline). A stamp-advance
    // rewrite costs one KV put every ≥90min (the 2h sweep cadence makes it
    // ~12/day of the 1,000/day quota); real content changes keep their
    // instant write, and the budget hold above still gates everything.
    const stampAge = existing && existing.fetchedAt ? Date.now() - new Date(existing.fetchedAt).getTime() : Infinity;
    if (existing && Array.isArray(existing.matches) && stampAge < CONFIG.POOL_STAMP_REFRESH_MS && JSON.stringify(mergedSlim) === JSON.stringify(existing.matches.map(slim))) {
      return;
    }
    await env.STATE.put(
      CONFIG.KV_MATCHES_KEY,
      JSON.stringify({ fetchedAt: (new Date()).toISOString(), source, matches: mergedSlim }),
      { expirationTtl: CONFIG.CACHE_STALE_TTL }
    );
  } catch (e) {
    console.error("Match cache write failed: " + e.message);
  }
}
export async function getCachedMatches(env: Env) {
  try {
    const data = await env.STATE.get(CONFIG.KV_MATCHES_KEY, "json");
    if (data && Array.isArray(data.matches) && data.matches.length) {
      console.log("Using cached matches from " + data.source + " (" + data.fetchedAt + ")");
      return data.matches;
    }
  } catch (e) {
    console.error("Match cache read failed: " + e.message);
  }
  return [];
}
