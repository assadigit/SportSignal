// SportSignal — the match-card SVG/PNG route (split from api.ts in
// v13.47-seams): /api/card/<matchKey> renders the visual "team A vs team B"
// card (crests base64-inlined server-side). Looks the match up in the
// tracked pool first, then the public-matches cache. Public (no auth) —
// the card carries no sensitive data.

import type { Env } from "./types";
import { CONFIG } from "./config";
import { matchKey } from "./dedupe";
import { isSiteHiddenMatch } from "./match-classify";

export async function handleCardRoute(req: Request, env: Env, url: URL): Promise<Response> {
  const rawPath = url.pathname.slice("/api/card/".length);
  const isPng = rawPath.endsWith(".png");
  const matchKeyParam = decodeURIComponent(rawPath).replace(/\.svg$/, "").replace(/\.png$/, "");
  const lang = url.searchParams.get("lang") === "en" ? "en" : "fa";
  try {
    // v13.12-cards: look up the match in the tracked pool (KV_MATCHES_KEY,
    // 24h TTL — reliably populated by every cron sweep) first, then the
    // short-TTL public-matches cache as fallback.
    let match = null;
    const tracked = await env.STATE.get(CONFIG.KV_MATCHES_KEY, "json").catch(() => null);
    if (tracked && Array.isArray(tracked.matches)) {
      match = tracked.matches.find((m) => {
        if (!m || !m.homeTeam || !m.awayTeam || !m.utcDate) return false;
        // v13.173-noal: hidden-league rows never render a share/og card.
        if (isSiteHiddenMatch(m)) return false;
        return matchKey(m) === matchKeyParam || String(m.id || "") === matchKeyParam;
      });
    }
    if (!match) {
      const cached = await env.STATE.get(CONFIG.KV_PUBLIC_MATCHES, "json").catch(() => null);
      if (cached && cached.data) {
        const pools = [].concat(
          cached.data.upcoming || [],
          cached.data.finished || [],
          cached.data.thisWeek || [],
          cached.data.nextWeek || [],
          cached.data.topSpot && cached.data.topSpot.matches ? cached.data.topSpot.matches : [],
          cached.data.ucl && cached.data.ucl.matches ? cached.data.ucl.matches : [],
          cached.data.nextBig ? [cached.data.nextBig] : [],
          cached.data.cups ? cached.data.cups.map((c) => c.next).filter(Boolean) : []
        );
        match = pools.find((m) => {
          if (!m || !m.homeTeam || !m.awayTeam || !m.utcDate) return false;
          // v13.173-noal: hidden-league rows never render a share/og card.
          if (isSiteHiddenMatch(m)) return false;
          return matchKey(m) === matchKeyParam || String(m.id || "") === matchKeyParam;
        });
      }
    }
    if (!match) return new Response("card: match not found", { status: 404, headers: { "content-type": "text/plain" } });
    if (isPng) {
      // v13.17-cards: render SVG→PNG via resvg-wasm (Workers-compatible).
      // Telegram's sendPhoto can't fetch SVG URLs, so the bot sends the
      // PNG binary directly. This endpoint is also useful for OG images.
      const { renderCardPngCached } = await import("./card");
      const png = await renderCardPngCached(env, match, lang);
      if (!png) return new Response("card: png render failed", { status: 500, headers: { "content-type": "text/plain" } });
      return new Response(png, {
        headers: {
          "content-type": "image/png",
          "cache-control": "public, max-age=300",
          "access-control-allow-origin": "*"
        }
      });
    }
    const { buildMatchCardSvg } = await import("./card");
    const svg = await buildMatchCardSvg(env, match, lang);
    return new Response(svg, {
      headers: {
        "content-type": "image/svg+xml; charset=utf-8",
        "cache-control": "public, max-age=300",
        "access-control-allow-origin": "*"
      }
    });
  } catch (e) {
    return new Response("card: " + e.message, { status: 500, headers: { "content-type": "text/plain" } });
  }}