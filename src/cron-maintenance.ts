// SportSignal — the cron POOL-MAINTENANCE phase (quiet ticks only): the
// EFL/FA Cup big-team scan + the far-cup probe (both headroom-gated on
// non-sweep, non-SOFT, pool-reuse ticks — the 21:40Z incident lesson),
// the quiet-tick pool stamp-advance and the standings refresh. Cup rows
// land in the pool via match-pool's cacheMatches. Extracted from cron.ts
// in v13.75-cronsplit.
import { CONFIG } from "./config";
import type { Env } from "./types";
import { maybeScanCupFixtures, probeCupFarFixtures } from "./provider-cups";
import { cacheMatches } from "./match-pool";
import { fetchStandings } from "./composers";

export async function runPoolMaintenance(env: Env, ctx) {
  const { fullSweepThisTick, budgetSoft, budgetHard, matches, poolRef, poolBlob } = ctx;
  // v13.50-cupscan: EFL/FA Cup big-team scan on NON-sweep ticks only (a
  // full sweep already burns ~42/48 fetch budget; this tick reuses the
  // pool). Marker-gated inside; adds/updates flow into this tick's
  // notification view AND the persisted pool. Own try/catch \u2014 a scan
  // failure must never break the notification phases.
  // v13.50.1-hotfix (the 21:40Z incident): QUIET ticks only \u2014 the pool-
  // reuse path (matches === poolRef). An active evening tick (live sweep
  // ~20 real fetches + KV ops + notification sends) already lives at
  // Cloudflare's REAL ~50-subrequest ceiling; the scan's 6 fetches tipped
  // it and the cascade took out standings + card + Telegram sends (all
  // fail-closed, outbox recovered). The scan is additive: it belongs on
  // ticks with headroom, never on load-bearing ones.
  if (!fullSweepThisTick && !budgetSoft && matches === poolRef) {
    try {
      const cs = await maybeScanCupFixtures(env, matches, poolRef);
      if (cs.added || cs.updated) console.log(`\u{1F3C6} Cup big-team scan: +${cs.added} added, ${cs.updated} status/score refreshed`);
    } catch (e) {
      console.error("Cup scan step failed: " + e.message);
    }
  }
  // v14.0.5-cupgap: the FAR CUP PROBE, quiet ticks only (the same headroom
  // rule as the cup scan above — 7 sportscore calls). Fills the ECL box
  // between Thursday matchdays and watches the Hazfi slug for the first
  // announced round; see probeCupFarFixtures for the whole story. Internally
  // due-gated every CUP_FAR_SCAN_MS (4h) — the lean "27 */4" cron branch in
  // api.ts shares the same marker, so the two entry points can't double-run.
  if (!fullSweepThisTick && !budgetSoft && matches === poolRef) {
    try {
      const r = await probeCupFarFixtures(env);
      if (r && r.added) console.log(`\u{1F50D} Far cup probe: +${r.added} fixtures added`);
    } catch (e) {
      console.error("Far cup probe step failed: " + e.message);
    }
  }
  // v13.55-epochflow: QUIET-TICK STAMP-ADVANCE. cacheMatches is change-only
  // (v13.31 KV budget) and full sweeps only rewrite it when they FIND
  // matches — on deep break weeks the sequential sweep legitimately
  // returns 0 (fetchMatchesFromAPI falls back to the pool without calling
  // cacheMatches) and the only other writers were the 5h cup scans, so
  // the pool stamp (the site header's "Last updated" clock) could sit
  // 5h+ while the TTL (24h) quietly counted down toward the 13.54.1
  // deadlock again. A quiet tick that reuses the pool now re-caches it
  // with a fresh stamp whenever fetchedAt is >POOL_STAMP_REFRESH_MS old:
  // the header stays ≤~100min fresh AND the pool TTL never runs out.
  // ≤16 writes/day of the 1,000/day quota; correctness gate is HARD only
  // (it also prevents the deadlock — the same class as the overlay).
  if (!fullSweepThisTick && matches === poolRef && poolBlob && poolBlob.fetchedAt && Date.now() - new Date(poolBlob.fetchedAt).getTime() > CONFIG.POOL_STAMP_REFRESH_MS && !budgetHard && !env.KV_BUDGET_HOLD) {
    try {
      await cacheMatches(env, poolRef, poolBlob.source || "quiet-verify");
      console.log("\u{1F551} Pool stamp advanced (quiet tick — verified unchanged data)");
    } catch (e) {
      console.warn("Pool stamp-advance failed: " + e.message);
    }
  }
  // v13.55-epochflow: QUIET-TICK STANDINGS-REFRESH PHASE. Standings fetch
  // authority moved OFF the serve path (visitor rebuilds are cache-only
  // since the frozen-epoch bug — see public-matches.ts). This phase is
  // the refresh owner now: on quiet ticks (meter ~0, ~24 KV ops used —
  // plenty of headroom vs the sweep's 40-50), gated by a 2h marker so it
  // doesn't add ops to EVERY tick. The 6h per-code freshness gates + the
  // 17-min jitter inside fetchStandings stay the real throttle (≈1
  // expired code per pass, ≈4 fetches/code/day); a 429 now suspends the
  // FD circuit for 45min (see composers.ts) instead of silently burning
  // the same exhausted quota minute forever.
  if (!fullSweepThisTick && !budgetSoft && matches === poolRef) {
    try {
      const marker = await env.STATE.get(CONFIG.KV_STAND_REFRESH).catch(() => null);
      if (!marker) {
        for (const c of ["PL", "PD", "SA", "BL1", "FL1", "CL", "PGL"]) {
          try {
            await fetchStandings(env, c, true);
          } catch (e) {
            console.warn("Standings refresh " + c + " failed: " + e.message);
          }
        }
        await env.STATE.put(CONFIG.KV_STAND_REFRESH, String(Date.now()), { expirationTtl: Math.ceil(CONFIG.STAND_REFRESH_MS / 1e3) }).catch(() => {});
      }
    } catch (e) {
      console.warn("Standings refresh phase failed: " + e.message);
    }
  }
}
