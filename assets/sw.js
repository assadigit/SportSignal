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
const CACHE = "sportsignal-v2";
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
