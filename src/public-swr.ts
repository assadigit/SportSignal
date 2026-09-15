// SportSignal — the public-matches API with stale-while-revalidate (split
// from api.ts in v13.47-seams). FRESH (<5min) = serve the KV cache inline;
// STALE (5–10min) = serve instantly + background refresh via ctx.waitUntil;
// older/missing = synchronous refresh; on failure the long-TTL snapshot,
// then the degraded empty payload.

import type { Env } from "./types";
import { jsonResponse } from "./utils";
import { CONFIG } from "./config";
import { fetchPublicMatches } from "./public-matches";
import { maybeRunFaAi } from "./fa-ai";

export async function handlePublicMatchesApi(req: Request, env: Env, ctx): Promise<Response> {
  // v13.7-perf: stale-while-revalidate on the public-matches endpoint.
  // The KV cache (CONFIG.KV_PUBLIC_MATCHES, 3-min TTL inside
  // fetchPublicMatches) is the fast path. When it is FRESH (<3min) we
  // await fetchPublicMatches as before (it returns the cached data
  // without a provider sweep). When it is STALE-but-present (3–10min)
  // we return the cached payload INSTANTLY and kick the refresh to the
  // background via ctx.waitUntil — the first visitor after TTL expiry
  // no longer pays the 2–5s provider-sweep latency; the next visitor
  // sees the refreshed data. Cache older than 10min (or missing) falls
  // through to a synchronous refresh (the original behavior), so a cold
  // cache or a long gap still resolves inline. The 7-day snapshot
  // fallback below is unchanged.
  try {
    // v13.31-kv-budget: FRESH_MS 3min → 5min — now exactly the KV TTL
    // inside fetchPublicMatches (300s). Under continuous traffic the
    // background refresh therefore runs at most ~288×/day instead of
    // ~480×/day (each refresh = provider sweep + KV writes), and the
    // data served is never older than the previous 5-min cadence.
    // STALE_GRACE_MS unchanged: serve-stale + bg-refresh window 5–10min.
    const FRESH_MS = 3e5;         // 5min  — matches fetchPublicMatches' KV TTL
    const STALE_GRACE_MS = 6e5;   // 10min — serve stale + bg-refresh window
    const kv = await env.STATE.get(CONFIG.KV_PUBLIC_MATCHES, "json").catch(() => null);
    const age = kv && kv.ts ? Date.now() - kv.ts : Infinity;
    if (kv && kv.data && age < STALE_GRACE_MS) {
      const stale = age >= FRESH_MS;
      if (stale) {
        // Serve the stale cache now; refresh in the background. The
        // refresh path (fetchPublicMatches) re-checks the KV + refresh
        // lock, so a concurrent request can't double-sweep.
        ctx.waitUntil(fetchPublicMatches(env, req).catch((e) => console.warn("SWR bg refresh failed: " + e.message)));
      }
      if (env.AI) ctx.waitUntil(maybeRunFaAi(env).catch((e) => console.warn("FA-AI bg run failed: " + e.message)));
      return jsonResponse(stale ? Object.assign({}, kv.data, { swr: true, cachedAt: new Date(kv.ts).toISOString() }) : kv.data);
    }
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
        const stale = Object.assign({}, snap.data, { cached: true, cachedAt: snap.ts ? new Date(snap.ts).toISOString() : snap.data.fetchedAt });
        return jsonResponse(stale);
      }
    } catch (e2) {
      console.error("public-matches snapshot fallback failed: " + e2.message);
    }
    return jsonResponse({ upcoming: [], finished: [], nextBig: null, standings: null, cups: null, ucl: null, degraded: true });
  }}