// SportSignal service worker (v13.7-perf)
// Strategies:
//   - install:  skipWaiting() so a new SW takes over the next navigation
//   - activate: claim() clients + wipe any cache that isn't ours
//   - fetch:    network-first for navigations (always-fresh HTML/API),
//              cache-first for static assets (fonts, images),
//              stale-while-revalidate for the main page HTML.
// Cache name:  sportsignal-v39 (v13.130: bumped from v38 — routine evict;
//              this release renamed the asset pair public-13.32.css→13.33.css
//              + public-13.33.js→13.34.js and added /players/hero/*; stale
//              HTML may still reference the retired pair, which stays served
//              per the retention rule).
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
//              v13.129-hudframe bump: /ui/sportsignal-hud-matches-hero.png
//              kickoff-time chip background. Same rule: cache-first assets
//              can't refresh in place, so every client cache generation
//              turns over on install.)
//              public-13.28.css→13.29, core-13.11.js→13.12 — the desired-look
//              hero restyle. Same rule: cache-first assets can't refresh
//              without a rename or a bump.
//              CORE_URLS drops /hero-stage.mp4 (the new hero has no video
//              layer — saves ~645KB per SW install); the fetch handler below
//              still caches it on demand for stale-HTML clients.)
// Cache name:  sportsignal-v40 (v13.133-persiantype: public-13.33.css→13.34
//              + public-13.34.js→13.35 — the Morabba+Peyda Persian
//              typography system (new /fonts/MorabbaVF.woff2 +
//              /fonts/Peyda-*.woff2) + the dedicated mobile HUD artwork
//              (/ui/sportsignal-hud-matches-hero-mobile.png, 9-slice source
//              for the <900px card) + the mobile layout round. Same rule:
//              cache-first assets can't refresh in place, so every client
//              cache generation turns over on install.)
// Cache name:  sportsignal-v41 (v13.134-typelight: public-13.34.css→13.36.css
//              + public-13.35.js→13.36.js + the /stadium-lights-hero.png hero
//              overlay; the dark/light toggle retired (always dark). Routine
//              evict — stale HTML may still reference the retired pair, which
//              stays served per the retention rule.)
// Cache name:  sportsignal-v42 (v13.135-zoomlight: public-13.36.css→13.37.css
//              — CSS-only release, public-13.36.js carries over unchanged.
//              The hero players become full-lane cover boxes (uniform zoomed
//              framing), the stadium-lights overlay brightens .35→.5, the
//              mobile HUD veil deepens .26→.4. Routine evict — stale HTML
//              may still reference 13.36.css, which stays served per the
//              retention rule.)
// Cache name:  sportsignal-v43 (v13.136-dezoom: public-13.37.css→13.38.css
//              — CSS-only release, public-13.36.js carries over unchanged.
//              The hero players return to natural framing: contain (full
//              figure head-to-feet, nothing cropped), height 108%→76%
//              (~30% smaller), anchored at the wrapper's inner edge beside
//              the big blue HUD card, feet-only melt (fade 26%→20%).
//              Routine evict — stale HTML may still reference 13.37.css,
//              which stays served per the retention rule.)
// Cache name:  sportsignal-v50 (v13.144-lights: public-13.44.css→13.45.css
//              — CSS-only release, public-13.36.js carries over unchanged.
//              The owner's lights round: stadium floodlights +10% again
//              ("it can be brighter": .726→.799) + the "آخرین به‌روزرسانی"
//              caption tightens to 4px below the chamfered countdown box
//              ("instantly after this box" — still a sibling of #bigbar,
//              NOT part of it). Routine evict — stale HTML may still
//              reference 13.44.css, which stays served per the retention
//              rule.)
// Cache name:  sportsignal-v49 (v13.142-cinematic: public-13.43.css→13.44.css
//              — CSS+template release, public-13.36.js carries over
//              unchanged (+ the #lastSyncM template move in public.ts: it
//              now sits BELOW #bigbar, a sibling of the chamfered panel).
//              The owner's cinematic round: a reusable player treatment
//              (.hero-player--cinematic: grade .97/1.12/1.08 + soft dark
//              shadow + subtle blue halo, --ss-player-* tokens), stadium
//              floodlights +10% (.66→.726), crest watermarks +10%
//              (.240→.264 desktop, .244→.268 mobile). Routine evict —
//              stale HTML may still reference 13.43.css, which stays
//              served per the retention rule.)
// Cache name:  sportsignal-v48 (v13.141-wm: public-13.42.css→13.43.css
//              — CSS-only release, public-13.36.js carries over unchanged.
//              The owner's wm round: the hero's club-crest watermarks
//              +10% presence again (.218→.240 desktop, .222→.244 mobile,
//              both × 1.1) — the fourth consecutive crest bump; nothing
//              else changes this round. Routine evict — stale HTML may
//              still reference 13.42.css, which stays served per the
//              retention rule.)
// Cache name:  sportsignal-v47 (v13.140-refine: public-13.41.css→13.42.css
//              — CSS-only release, public-13.36.js carries over unchanged
//              (+ one template move in public.ts: #lastSyncM rides inside
//              #bigbar, right after .count-inner). The owner's refine
//              round: crest watermarks +10% (.218/.222), floodlights
//              +10% (.66), the big match HUD frame -10% (.74→.666), the
//              tournament name to Peyda 500 (was Morabba 800), and the
//              "آخرین به‌روزرسانی" line sticks exactly below .count-inner
//              on ALL viewports. Routine evict — stale HTML may still
//              reference 13.41.css, which stays served per the
//              retention rule.)
// Cache name:  sportsignal-v46 (v13.139-hud: public-13.40.css→13.41.css
//              — CSS-only release, public-13.36.js carries over unchanged.
//              The owner's hud round: a mobile-only opacity pair — the
//              mobile HUD veil .4→.5 (the blue frame reads 15% less
//              opaque, visibility .59→.50) and the mobile crest
//              watermarks .176→.202 (+15% presence); the desktop rules
//              are untouched this round. Routine evict — stale HTML may
//              still reference 13.40.css, which stays served per the
//              retention rule.)
// Cache name:  sportsignal-v45 (v13.138-polish: public-13.39.css→13.40.css
//              — CSS-only release, public-13.36.js carries over unchanged.
//              The owner's polish round: players +5% (height 87.4%→91.77%,
//              growth split up/down so the melt stays graceful), 16px
//              closer to the blue HUD (overlap onto the card + the same
//              allowance spent as width budget via max-width), the mask
//              dissolves to ZERO at the section floor (transparent hold
//              14.8%, black 26%), the top grade ramp eases over 0-27%
//              (no more sudden dark band), crest watermarks +10%
//              (.18→.198), floodlights .5→.6. Routine evict — stale
//              HTML may still reference 13.39.css, which stays served
//              per the retention rule.)
// Cache name:  sportsignal-v54 (v13.148-head12: public-13.48.css→13.49.css
//              — CSS-only release, core-13.13.js carries over unchanged.
//              The owner's head12 round: the countdown head caption
//              «تا بازی بزرگ بعدی» moves to a flat 12px on every
//              viewport (the ×1.2 syncdate scaling capped it at 7.8px,
//              under the owner's at-least-12px floor); the head icon
//              scales to 13px and the head gap to 5.5px, keeping the
//              row's shipped proportions. Routine evict — stale HTML
//              may still reference 13.48.css, which stays served per
//              the retention rule.)
// Cache name:  sportsignal-v53 (v13.147-syncdate: public-13.47.css→13.48.css
//              + core-13.12.js→core-13.13.js — the countdown grows 20%
//              (clamp 162/230 → 194.4/276, every fixed-px value ×1.2),
//              the HUD artwork fades another 20% (::before .8 → .64),
//              and the caption below the panel reads تاریخ به‌روزرسانی
//              (i18n lastUpd relabel). Routine evict — stale HTML may
//              still reference 13.47.css / core-13.12.js, which stay
//              served per the retention rule.)
const CACHE = "sportsignal-v54";
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
