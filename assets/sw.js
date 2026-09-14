// SportSignal service worker (v13.7-perf)
// Strategies:
//   - install:  skipWaiting() so a new SW takes over the next navigation
//   - activate: claim() clients + wipe any cache that isn't ours
//   - fetch:    network-first for navigations (always-fresh HTML/API),
//              cache-first for static assets (fonts, images),
//              stale-while-revalidate for the main page HTML.
// Cache name:  sportsignal-v2 (v13.7: bumped from v1 to evict orphaned
//              pre-13.6 asset entries — public-13.5.js/css and the old
//              inline-payload HTML — that were stranded in clients' SW
//              caches after the v13.6 asset split. The activate handler
//              deletes every cache !== CACHE, so the bump is a one-shot
//              clean sweep on the next SW takeover.)
// Cache name:  sportsignal-v8 (v13.36: bumped from v7 — one-shot evict of
//              v13.35 entries; public-13.11→13.12 renamed in the same
//              release. cache-first-forever assets can't refresh on stale
//              clients without the bump.)
// Cache name:  sportsignal-v7 (v13.35 mid-release hotfix: mobile touch-target
//              CSS landed after first deploy; same-named 13.11 assets can't
//              refresh under cache-first — the bump is the evict.)
// Cache name:  sportsignal-v6 (v13.35: bumped from v5 — one-shot evict of
//              stranded v13.34 asset entries; public-13.10→13.11 renamed in
//              the same release. cache-first-forever assets can't refresh on
//              stale clients without the bump.)
// Cache name:  sportsignal-v4 (v13.29: bumped from v3 — one-shot evict of
//              any stranded/stale asset entries on client browsers; the
//              client assets were renamed public-13.8→public-13.9 in the
//              same release, so the bump also guarantees a clean slate.)
const CACHE = "sportsignal-v8";
const CORE_URLS = [
  "/",
  "/site.webmanifest",
  "/logo.png",
  "/hero-stage.mp4"
];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // Use { cache: "reload" } so we don't reuse a stale browser cache entry
    // for the precache, and ignore individual failures (we'll lazy-cache
    // on demand). The whole install resolves so the SW activates promptly.
    await Promise.allSettled(CORE_URLS.map((u) =>
      cache.add(new Request(u, { cache: "reload" }))
    ));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // Same-origin only — never cache cross-origin (cdn, telegram, etc.)
  if (url.origin !== self.location.origin) return;

  // 1. Navigations: network-first, fall back to cached "/" when offline.
  if (req.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(CACHE);
        cache.put("/", fresh.clone()).catch(() => {});
        return fresh;
      } catch (e) {
        const cache = await caches.open(CACHE);
        const fallback = await cache.match("/") || await cache.match(req);
        return fallback || new Response("Offline", { status: 503, headers: { "content-type": "text/plain; charset=utf-8" } });
      }
    })());
    return;
  }

  // 2. Static assets (fonts, images, video): cache-first, then network.
  const isStaticAsset =
    url.pathname.startsWith("/fonts/") ||
    url.pathname.startsWith("/assets/") ||
    /\.(woff2|png|jpg|jpeg|webp|svg|ico|mp4|css|js)$/i.test(url.pathname) ||
    url.pathname === "/logo.png" ||
    url.pathname === "/bg.jpg" ||
    url.pathname === "/hero-stage.mp4";

  if (isStaticAsset) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const cached = await cache.match(req);
      if (cached) return cached;
      try {
        const fresh = await fetch(req);
        if (fresh && fresh.ok) cache.put(req, fresh.clone()).catch(() => {});
        return fresh;
      } catch (e) {
        return cached || new Response("Offline", { status: 503 });
      }
    })());
    return;
  }

  // 3. The main page (HTML) — stale-while-revalidate: serve cache, refresh
  //    in the background. Anything else (API, JSON) → straight to network.
  const isApiOrJson = url.pathname.startsWith("/api/") || url.pathname.endsWith(".json") || url.pathname.endsWith(".xml");
  if (isApiOrJson) {
    // Always go to network for API/XML — never serve stale API.
    return;
  }
  // Default (HTML page, manifest, etc.): stale-while-revalidate.
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(req);
    const network = fetch(req).then((fresh) => {
      if (fresh && fresh.ok) cache.put(req, fresh.clone()).catch(() => {});
      return fresh;
    }).catch(() => cached);
    return cached || network;
  })());
});
