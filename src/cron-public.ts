// SportSignal — the cron PUBLIC phase: the live-changed fingerprint, the
// live scorer enrichment, the public-payload prewarm (self-fetch first,
// in-tick fallback) and the LIVE OVERLAY write (the serve path's
// never-stale-live guarantee). Concat order in the eval harness keeps
// this module BEFORE the shell so its writes precede the completion
// blob's meter fold (the #quota1/#swrsolid order checks). Extracted from
// cron.ts in v13.75-cronsplit.
import { CONFIG } from "./config";
import type { Env } from "./types";
import { subrequestCount } from "./utils";
import { normalizeTeamName } from "./teams";
import { fetchPublicMatches, enrichLiveMatches } from "./public-matches";
import { liveFingerprint } from "./monitoring";
// v13.129-herogaploop: the hero-portrait gap scan (detection + KV registry
// write — src/hero-gaps.ts). Runs from THIS tick's in-memory pool: zero
// extra fetches; the registry write is merge-disciplined (1/day + new teams).
import { noteHeroGaps } from "./hero-gaps";

export async function runPublicPhase(env: Env, ctx) {
  const { fullSweepThisTick, budgetSoft, budgetHard, matches, poolRef } = ctx;
  // v13.44.1-truemeter: moved BEFORE the completion blob so its writes
  // fold into kv_writes_day — the blob is now the tick's LAST write and
  // the meter counts everything (see the fold below).
  // v13.35-prewarm: kill the first-visitor cold sweep. If the public
  // payload is (nearly) expired, rebuild it NOW from the pool this tick
  // already fetched — the expensive provider sweep never runs twice, and
  // visitors between ticks always hit a warm 3-minute-fresh KV payload
  // instead of paying ~4.6s for the sweep. Budget-guarded: prewarm only
  // with ≥18 subrequests of headroom (standings need ≤6; the pool ride-
  // along needs 0). KV write math documented in public-matches.ts.
  // v13.43-cpukeeper: the payload rebuild itself is ~100ms of CPU (full
  // shaping + ~100KB stringify) — running it EVERY tick was the other half
  // of the poison that tripped the free-plan 10ms CPU average (measured
  // live: a live-sweep tick WITH prewarm = 164ms CPU). It now runs ONLY on
  // full sweeps (2h cadence) or when the live sweep actually CHANGED live
  // data (goal / HT / FT / newly-discovered fixture). Quiet ticks skip it
  // entirely; visitors between rebuilds trigger the on-demand refresh
  // (the pre-v13.35 path).
  // v13.52-swrsolid: liveChanged hoisted out of the prewarm try — the
  // live-overlay writer below needs the same signal (a goal / kickoff /
  // HT / FT changed this tick's live data vs the persisted pool).
  let liveChanged = false;
  if (!fullSweepThisTick && poolRef) {
    liveChanged = liveFingerprint(matches) !== liveFingerprint(poolRef);
  }
  // v13.55-epochflow: the prewarm now runs as a SELF-FETCH (a fresh
  // invocation with its own full 50-subrequest budget). The old in-tick
  // rebuild ran AFTER the sequential 3-provider sweep, when the tick
  // already sat at ~40-50 real subrequests — its final payload + snapshot
  // puts crossed CF's real ceiling and died silently on nearly every
  // sweep (the 2026-09-30 frozen-epoch bug: the snapshot's last
  // successful write was 05:43 while sweeps ran clean every 2h after).
  // One subrequest here; the fetched invocation serves from KV and its
  // waitUntil rebuild (pool-first, cache-only standings, no long view)
  // lands the writes in ~15-20 ops. Fallback: the in-tick rebuild, still
  // meter-gated <30 like the old prewarm.
  if (liveChanged && subrequestCount() < 36) {
    // v13.53-standsteady semantics preserved: live scorers enrichment is
    // cron-owned (a goal → the next tick's prewarm re-enriched within
    // ~10min). The self-fetch rebuild is visitor-shaped (no fetches), so
    // the tick enriches directly before publishing.
    try {
      await enrichLiveMatches(env, matches);
    } catch (e) {
      console.warn("Live scorer enrichment failed: " + e.message);
    }
  }
  try {
    const pub = await env.STATE.get(CONFIG.KV_PUBLIC_MATCHES, "json").catch(() => null) as any;
    const pubStale = !pub || !pub.ts || Date.now() - pub.ts >= 555e3;
    // v13.44-quotaguard: prewarm is a cosmetic write too — under the SOFT
    // governor the visitors' on-demand refresh path takes over (the
    // pre-v13.35 behavior).
    if ((fullSweepThisTick || liveChanged) && pubStale && !budgetSoft) {
      const why = fullSweepThisTick ? "full sweep" : "live data changed";
      let fired = false;
      if (CONFIG.SELF_PREWARM_URL) {
        try {
          const r = await fetch(CONFIG.SELF_PREWARM_URL + "?selfprewarm=" + Date.now(), { headers: { "x-ss-selfprewarm": "1" } });
          await r.text().catch(() => {});
          fired = r.status === 200;
        } catch (e) {
          console.warn("Self-prewarm fetch failed: " + e.message);
        }
      }
      if (fired) {
        console.log(`\u{1F525} Public payload pre-warm fired via self-fetch (${why})`);
      } else if (subrequestCount() < 30) {
        await fetchPublicMatches(env, null, { prewarm: true, pool: matches });
        console.log(`\u{1F525} Public payload pre-warmed in-tick (${why}) for the next visitors`);
      }
    }
  } catch (e) {
    console.error("Public pre-warm failed: " + e.message);
  }
  // v13.52-swrsolid: the LIVE OVERLAY write. The public serve path reads
  // this tiny blob and patches live rows into every payload it serves —
  // so fixtures can cache for hours while a live match is NEVER served
  // stale (a FINISHED game is purged from the live lists immediately:
  // the user's rule, "you can't cache a live game — it would still show
  // as playing"). Written when:
  //   - live data CHANGED this tick (the fingerprint gate above — goal,
  //     kickoff, HT, FT), or
  //   - a FULL SWEEP ran (authoritative refresh, ≤12/day), or
  //   - anything is live and the blob is ≥10min old (minute freshness
  //     between events — bounded ~6 writes/hour).
  // NOT gated on budgetSoft: this is correctness, not cosmetics, and its
  // worst case is ~40-60 writes on a busy matchday. The HARD governor
  // still holds it (budgetHard), and the subrequest headroom rule (the
  // 21:40Z incident lesson) keeps it off ticks that live at the real cap.
  // 2 KV ops (1 read + 1 write) when it fires; zero on quiet days.
  try {
    const now = Date.now();
    const ovWin = 6 * 36e5;
    const liveRows = (matches || []).filter((m) => {
      const st = String((m && m.status) || "").toUpperCase();
      if (st !== "LIVE" && st !== "IN_PLAY" && st !== "PAUSED" && st !== "FINISHED") return false;
      const t = new Date((m && m.utcDate) || 0).getTime();
      if (!t || t < now - ovWin || t > now + ovWin) return false;
      return true;
    }).map((m) => {
      // v13.118-fixsched: the overlay write HEALS stale-live rows — a row
      // still carrying LIVE/IN_PLAY/PAUSED whose kickoff is older than
      // SCHED_MAX_LIVE_SPAN_MS (195min) is persisted into the overlay as
      // FINISHED (last-known score kept) so every serve path purges it
      // from the live lists. Before this, a stuck provider row kept being
      // re-written as IN_PLAY every 10 minutes and re-animated finished
      // matches on the site all night (the 4 AM screenshot bug).
      const rawSt = String(m.status || "").toUpperCase();
      const ko = new Date((m && m.utcDate) || 0).getTime();
      const staleLive = (rawSt === "LIVE" || rawSt === "IN_PLAY" || rawSt === "PAUSED") && ko && now - ko > CONFIG.SCHED_MAX_LIVE_SPAN_MS;
      return {
        id: m.id != null ? String(m.id) : null,
        h: normalizeTeamName(m.homeTeam && m.homeTeam.name),
        a: normalizeTeamName(m.awayTeam && m.awayTeam.name),
        d: String(m.utcDate || ""),
        st: staleLive ? "FINISHED" : rawSt,
        min: !staleLive && m.minute != null ? m.minute : null,
        s: m.score && m.score.fullTime ? { home: m.score.fullTime.home, away: m.score.fullTime.away } : null
      };
    });
    if (liveRows.length && !budgetHard && subrequestCount() < 40) {
      const prevOv = await env.STATE.get(CONFIG.KV_LIVE_OVERLAY, "json").catch(() => null);
      const ovAge = prevOv && prevOv.ts ? now - prevOv.ts : Infinity;
      if (fullSweepThisTick || liveChanged || ovAge >= 6e5) {
        await env.STATE.put(CONFIG.KV_LIVE_OVERLAY, JSON.stringify({ ts: now, rows: liveRows }), { expirationTtl: CONFIG.KV_LIVE_OVERLAY_TTL || 21600 }).catch(() => {
        });
      }
    }
  } catch (e) {
    console.error("Live overlay write failed: " + e.message);
  }
  // v13.129-herogaploop: the HERO GAP scan — which teams on this tick's
  // pool (live/upcoming 7-day window + the featured hero match) render
  // crest-only because no HERO_ART portrait is wired for them. Detection
  // is free (the pool is already in memory); the registry merge costs one
  // KV read and AT MOST one write (new gap team or the day's first bump —
  // mergeHeroGapRegistry's discipline). Gated like the overlay: never on
  // hard-budget ticks, never when the fetch budget is nearly spent — a
  // deferred scan simply rides the next 10-minute tick. Fail-silent by
  // contract (noteHeroGaps catches its own errors): the gap loop must
  // never cost a notification.
  try {
    if (!budgetHard && subrequestCount() < 42) {
      await noteHeroGaps(env, matches);
    }
  } catch (e) {
    console.warn("hero gap scan failed: " + e.message);
  }
}
