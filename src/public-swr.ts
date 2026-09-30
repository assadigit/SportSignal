// SportSignal — the public-matches API with stale-while-revalidate (split
// from api.ts in v13.47-seams). v13.52-swrsolid semantics:
//   FRESH (<5min)  = serve the KV cache inline, live rows patched by the
//                    overlay;
//   STALE (5–10min)= serve instantly + background refresh via ctx.waitUntil;
//   EXPIRED/MISSING= serve the 7-day snapshot instantly (fixtures are
//                    slow-moving; live rows are still patched from the
//                    overlay) + background refresh;
//   TRUE COLD      = synchronous rebuild — now pool-first (fast; the 92-day
//   (no payload,     long view only runs when the pool itself is gone, and
//    no snapshot)    even then this is the first-deploy/KV-wipe case).
// The visitor NEVER waits for a provider sweep again (the "few minutes to
// load" bug), and a finished match is never served as playing (the overlay
// purges it). On total failure the degraded empty payload remains the floor.

import type { Env } from "./types";
import { jsonResponse } from "./utils";
import { CONFIG } from "./config";
import { fetchPublicMatches, applyLiveOverlay } from "./public-matches";
import { maybeRunFaAi } from "./fa-ai";

export async function handlePublicMatchesApi(req: Request, env: Env, ctx): Promise<Response> {
  // v13.7-perf: stale-while-revalidate on the public-matches endpoint.
  // The KV cache (CONFIG.KV_PUBLIC_MATCHES, 12-min TTL since v13.52) is the
  // fast path. When it is FRESH (<5min) we serve it inline. When it is
  // STALE-but-present (5–10min) we return the payload INSTANTLY and kick the
  // refresh to the background via ctx.waitUntil — the first visitor after
  // TTL expiry no longer pays the sweep latency; the next visitor sees the
  // refreshed data.
  // v13.52-swrsolid: the payload TTL used to be 300s for visitor-written
  // payloads — the key VANISHED at exactly the moment it became stale, so
  // with sparse traffic (>5-min gaps between visitors, i.e. almost every
  // visit) the stale-serve window never operated and every visitor ran the
  // SYNCHRONOUS full rebuild below: fetchLongView (10 FD chunks with 2s
  // sleeps + ~70 sportscore calls + TSP fan-out) — tens of seconds to
  // MINUTES when football-data was rate-limiting. That was reported as
  // "the site takes a few minutes to load, there is no caching". Now:
  // the snapshot serves first (fixtures cache — the user's rule), the
  // refresh runs in the background (pool-first, cheap), and the live
  // overlay patches status/score/minute so live truth never goes stale.
  try {
    const FRESH_MS = 3e5;         // 5min  — matches fetchPublicMatches' fresh gate
    const STALE_GRACE_MS = 6e5;   // 10min — serve stale + bg-refresh window
    const [kv, ov] = await Promise.all([
      env.STATE.get(CONFIG.KV_PUBLIC_MATCHES, "json").catch(() => null),
      env.STATE.get(CONFIG.KV_LIVE_OVERLAY, "json").catch(() => null)
    ]);
    const age = kv && kv.ts ? Date.now() - kv.ts : Infinity;
    if (kv && kv.data && age < STALE_GRACE_MS) {
      const stale = age >= FRESH_MS;
      if (stale) {
        // Serve the stale cache now; refresh in the background. The
        // refresh path (fetchPublicMatches) re-checks the KV + refresh
        // lock, so a concurrent request can't double-sweep.
        // v13.55-epochflow: bg refreshes pass skipLongView — the 92-day
        // long view can't finish inside ctx.waitUntil (~30s) and only
        // burned budget in a dying invocation (see fetchPublicMatches).
        ctx.waitUntil(fetchPublicMatches(env, req, { skipLongView: true }).catch((e) => console.warn("SWR bg refresh failed: " + e.message)));
      }
      if (env.AI) ctx.waitUntil(maybeRunFaAi(env).catch((e) => console.warn("FA-AI bg run failed: " + e.message)));
      const served = applyLiveOverlay(Object.assign({}, kv.data), ov);
      if (ov && ov.ts) served.liveAt = new Date(ov.ts).toISOString();
      if (stale) {
        served.swr = true;
        served.cachedAt = new Date(kv.ts).toISOString();
      }
      return jsonResponse(served);
    }
    // v13.52-swrsolid: payload expired/missing → the 7-day snapshot serves
    // INSTANTLY (fixtures/standings are slow-moving; the live overlay keeps
    // live rows true) and the rebuild runs in the background. This used to
    // be a synchronous rebuild — the multi-minute load. The snapshot was
    // previously reachable ONLY via the catch() below; it is now the primary
    // stale source. The bg refresh re-checks the payload KV + refresh lock
    // internally, so snapshot-serves can't stampede the rebuild.
    // v13.54-livestamp: the "cached" badge is DATA-AGE-gated, not
    // write-time-gated. With sparse traffic (>10-min visitor gaps) EVERY
    // request lands here while the pipeline is perfectly healthy — the old
    // unconditional cached:true made quiet days read as an outage with an
    // age that froze at the last content change ("cached (1407m ago)").
    // Now the badge only appears when the data EPOCH (the pool stamp riding
    // in fetchedAt — advanced by every ≥90min cacheMatches rewrite) is
    // older than CACHED_BADGE_MS (3h), and the age shown is the DATA's age.
    const snap = await env.STATE.get(CONFIG.KV_PUBLIC_SNAPSHOT, "json").catch(() => null);
    if (snap && snap.data && (snap.data.upcoming || snap.data.finished || snap.data.topSpot || snap.data.ucl || snap.data.standings)) {
      ctx.waitUntil(fetchPublicMatches(env, req, { skipLongView: true }).catch((e) => console.warn("Snapshot bg refresh failed: " + e.message)));
      if (env.AI) ctx.waitUntil(maybeRunFaAi(env).catch((e) => console.warn("FA-AI bg run failed: " + e.message)));
      const served = applyLiveOverlay(Object.assign({}, snap.data), ov);
      if (ov && ov.ts) served.liveAt = new Date(ov.ts).toISOString();
      const epochMs = Date.parse(snap.data.fetchedAt || "") || snap.ts || 0;
      if (epochMs && Date.now() - epochMs > CONFIG.CACHED_BADGE_MS) {
        served.cached = true;
        served.cachedAt = new Date(epochMs).toISOString();
      }
      return jsonResponse(served);
    }
    // True cold: no payload, no snapshot (first deploy / KV wipe). The
    // rebuild is now pool-first (see fetchPublicMatches) so even this path
    // is fast unless the pool is gone too.
    const data = await fetchPublicMatches(env, req);
    if (env.AI) ctx.waitUntil(maybeRunFaAi(env).catch((e) => console.warn("FA-AI bg run failed: " + e.message)));
    return jsonResponse(data);
  } catch (e) {
    console.error("public-matches route failed: " + e.message);
    // v12.x-resilience: try the long-TTL snapshot before giving up
    // and returning an empty degraded response. If even the snapshot
    // is missing/empty, fall through to the degraded JSON (the page
    // hides the cards in that case).
    try {
      const snap = await env.STATE.get(CONFIG.KV_PUBLIC_SNAPSHOT, "json").catch(() => null);
      if (snap && snap.data && (snap.data.upcoming || snap.data.finished || snap.data.topSpot || snap.data.ucl || snap.data.standings)) {
        // v13.54-livestamp: same data-age badge gate as the primary snapshot
        // serve above — this is the last-resort path, so if the epoch is
        // somehow unknown it stays conservative and SHOWS the badge.
        const epochMs = Date.parse(snap.data.fetchedAt || "") || snap.ts || 0;
        const badge = !epochMs || Date.now() - epochMs > CONFIG.CACHED_BADGE_MS;
        const stale = Object.assign({}, snap.data, badge ? { cached: true, cachedAt: new Date(epochMs || Date.now()).toISOString() } : { cached: false });
        return jsonResponse(stale);
      }
    } catch (e2) {
      console.error("public-matches snapshot fallback failed: " + e2.message);
    }
    return jsonResponse({ upcoming: [], finished: [], nextBig: null, standings: null, cups: null, ucl: null, degraded: true });
  }}
