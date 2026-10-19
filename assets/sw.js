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
// Cache name:  sportsignal-v12 (v13.51: bumped from v11 — routine evict for
//              this release's public-13.12.js edit (named-rivalry badges:
//              El Clásico / Der Klassiker / … replace the generic derby
//              badge — English names + ال کلاسیکو only, never in the UCL).
//              cache-first assets can't refresh without a rename or a bump
//              — the v13.39 rule: every asset-editing release bumps.)
// Cache name:  sportsignal-v11 (v13.41: bumped from v10 — routine evict for
//              this release's public-13.12.css edit (UCL next-matchday line
//              de-pilled to plain text). cache-first assets can't refresh
//              without a rename or a bump — the v13.39 rule: every
//              asset-editing release bumps.)
// Cache name:  sportsignal-v10 (v13.40: bumped from v9 — routine evict for
//              this release's public-13.12.js/css edits (UCL next-matchday
//              line). cache-first assets can't refresh without a rename or
//              a bump — the v13.39 rule: every asset-editing release bumps.)
// Cache name:  sportsignal-v9 (v13.39: bumped from v8 — one-shot evict of
//              stranded v13.36-v13.38 entries. Those releases edited
//              public-13.12.js/css in place WITHOUT a rename, and the
//              cache-first asset rule below kept serving stale JS to every
//              SW client since v13.36. The bump guarantees this release's
//              parked-favorites + no-truncation page reaches everyone.)
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
// Cache name:  sportsignal-v16 (v14.0.2-cachefix: the v14.0.1-uifix edited
//              public-13.14.js in place — correct in CacheStorage (v15 evicted
//              it) but NOT in browsers' HTTP caches, which had pinned the
//              mid-window broken build under "immutable, max-age=31536000".
//              A SW bump cannot evict the HTTP cache; the fixed build is now
//              served as public-13.15.js (new URL = guaranteed miss in every
//              cache layer). This bump also sweeps any 13.14 entry that a
//              stale-HTML client re-cached into v15.)
// Cache name:  sportsignal-v17 (v14.0.3-gridfix: the SEO <main> wrapper broke the
//              >=1440px body grid — one grid item swallowed the hero and misplaced
//              every section. main{display:contents} (public-13.14.css) restores
//              the pre-SEO grid; rename-on-edit + this bump = clean slate.)
// Cache name:  sportsignal-v18 (v14.0.4-sronly: the SEO sr-only elements
//              rendered VISIBLE — the pre-SEO stylesheet scoped the .sr-only
//              rule to .empty.loading-empty containers only, so the homepage
//              intro paragraph showed on screen. public-13.15.css adds the
//              GLOBAL .sr-only rule; rename-on-edit + this bump = clean slate.)
// Cache name:  sportsignal-v28 (v13.80-canonical-hrefs: public-13.23.js→13.24
//              rename — matchHref now prefers the payload-carried canonical
//              `path` (built server-side through TEAM_SLUGS) over the local
//              fallback slugifier, fixing 404 match links. cache-first assets
//              can't refresh without a rename or a bump — the v13.39 rule.)
// Cache name:  sportsignal-v30 (v13.120-hero: public-13.27.js→13.28,
//              public-13.23.css→13.24, core-13.10.js→13.11 — the
//              Stadium-Pulse hero redesign. cache-first assets can't refresh
//              without a rename or a bump — the v13.39 rule.)
// Cache name:  sportsignal-v32 (v13.122-heroart: public-13.29.js→13.30
//              + public-13.25.css→13.26 — the breakout flank retune from
//              the owner's reference mockup: full-height figures in front
//              of the card, heads slightly above its top edge. Same rule:
//              cache-first assets can't refresh without a rename or a bump.)
// Cache name:  sportsignal-v33 (v13.123-fadepill: public-13.30.js→13.31
//              + public-13.26.css→13.27 — the eased jersey crossfade
//              (per-portrait fade tiers via data-fade) + the compact
//              countdown pill. Same rule: cache-first assets can't refresh
//              without a rename or a bump.)
// Cache name:  sportsignal-v35 (v13.126-herolook: public-13.31.js→13.32,
// Cache name:  sportsignal-v36 (v13.127-matchtimeart: public-13.29.css→13.30
//              + the new /ui/sportsignal-match-time-bg.png artwork — the
//              kickoff-time chip background. Same rule: cache-first assets
//              can't refresh in place, so every client cache generation
//              turns over on install.)
//              public-13.28.css→13.29, core-13.11.js→13.12 — the desired-look
//              hero restyle. Same rule: cache-first assets can't refresh
//              without a rename or a bump.
//              CORE_URLS drops /hero-stage.mp4 (the new hero has no video
//              layer — saves ~645KB per SW install); the fetch handler below
//              still caches it on demand for stale-HTML clients.)
const CACHE = "sportsignal-v36";
const CORE_URLS = [
  "/",
  "/site.webmanifest",
  "/logo.png"
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
