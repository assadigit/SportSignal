// relay-worker.js — OPTIONAL scoped fetch relay for restricted network vantage
// points (e.g. datacenter ranges that UEFA's CDN edge refuses).
//
// This is the exact worker deployed as `uefa-image-relay-temp` on the
// SportSignal Cloudflare account during the initial collection run
// (see docs/assets/uefa-player-portraits.md §Transport). It is NOT an open
// proxy: it forwards a single validated GET to exactly two official UEFA
// hosts and narrowly relevant path prefixes, with the pipeline's honest
// User-Agent, manual redirects and no-store responses. No credentials are
// stored or forwarded.
//
// Deploy (owner's own account, wrangler is already a devDependency):
//   npx wrangler deploy scripts/uefa-player-portraits/relay-worker.js \
//     --name uefa-image-relay --compatibility-date 2025-01-01
// Then set for pipeline runs from restricted networks:
//   export UEFA_RELAY_BASE="https://uefa-image-relay.<your-subdomain>.workers.dev"
//   export UEFA_FETCH_TRANSPORT=relay
//
// Delete it when no longer needed:
//   npx wrangler delete --name uefa-image-relay
const ALLOWED = [
  { host: "img.uefa.com", prefix: "/imgml/TP/players/" },
  { host: "www.uefa.com", prefix: "/uefachampionsleague/clubs/" },
  { host: "www.uefa.com", prefix: "/uefaeuropaleague/clubs/" },
  { host: "www.uefa.com", prefix: "/uefaconferenceleague/clubs/" },
];

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (request.method !== "GET") return new Response("method not allowed", { status: 405 });
    const target = url.searchParams.get("url");
    if (!target) return new Response("missing ?url=", { status: 400 });
    let u;
    try { u = new URL(target); } catch { return new Response("bad url", { status: 400 }); }
    const ok = ALLOWED.some(
      (a) => u.protocol === "https:" && u.hostname === a.host && u.pathname.startsWith(a.prefix)
    );
    if (!ok) return new Response("host/path not allowed", { status: 403 });
    const upstream = await fetch(u.toString(), {
      method: "GET",
      headers: {
        "User-Agent": "SportSignalPortraitPipeline/1.0 (UEFA player portrait asset collection for sportsignal.ir)",
        "Accept": "text/html,application/xhtml+xml,image/webp,image/*;q=0.8,*/*;q=0.5",
      },
      redirect: "manual",
    });
    const body = await upstream.arrayBuffer();
    const headers = new Headers();
    headers.set("content-type", upstream.headers.get("content-type") || "application/octet-stream");
    headers.set("x-upstream-status", String(upstream.status));
    headers.set("cache-control", "no-store");
    return new Response(body, { status: upstream.status, headers });
  },
};
