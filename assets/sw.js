// SportSignal service worker (v13.7-perf)
// Strategies:
//   - install:  skipWaiting() so a new SW takes over the next navigation
//   - activate: claim() clients + wipe any cache that isn't ours
//   - fetch:    network-first for navigations (always-fresh HTML/API),
//              cache-first for static assets (fonts, images),
//              stale-while-revalidate for the main page HTML.
// Cache name:  sportsignal-v64 (v13.158-pngshadow: bumped from v63 — routine
//              evict for this release's public-13.58.css→13.59.css +
//              public-13.41.js→13.42.js renames (the owner reported the
//              v13.157 wrapper cast as "a black line and rectangle" —
//              filter() on a container wrapping a masked + clip-path'ed
//              child is engine-fragile; per the owner's own direction the
//              shadow is now A SECOND COPY OF THE PNG ITSELF — img.hero-cast,
//              first child of each lane wrapper, brightness(0) + blur + the
//              lane-split translate toward the card, inheriting the figure's
//              geometry/anchoring/feet-fade mask with mask-clip:no-clip;
//              heroArt fills figure + copy from the same heroArtFor entry;
//              the v13.157 wrapper drop-shadow rules RETIRE and the lane
//              wrapper clip-path inward bound widens 32→120px so the copy's
//              blur fringe never meets a hard cut); stale HTML may still
//              reference the retired 13.58.css/13.41.js pair, which stays
//              served per the retention rule — cache-first assets can't
//              refresh without a rename or a bump, the v13.39 rule: every
//              asset-editing release bumps.)
// Cache name:  sportsignal-v63 (v13.157-shadowfix: bumped from v62 — routine
//              evict for this release's public-13.57.css→13.58.css +
//              public-13.40.js→13.41.js renames (the owner's rectangle-
//              shadow fix: the v13.155/.156 projected-shadow plane RETIRED —
//              its blackened portrait copies carried the fg figure's
//              feet-fade mask, whose border-box clip cropped the filtered
//              paint to the img element's rectangle while the echo filled
//              the box interior → the razor-edged black RECTANGLE the owner
//              reported; replaced by the --ss-cast-* drop-shadow ON the
//              .hero-player--cinematic wrappers: shape from the live masked
//              alpha, soft (blur clamp(20px,1.9vw,38px)), unclipped, +X
//              home / −X away by PHYSICAL lane; heroArt drops putShadow);
//              stale HTML may still reference the retired 13.57.css/13.40.js
//              pair, which stays served per the retention rule — cache-first
//              assets can't refresh without a rename or a bump, the v13.39
//              rule: every asset-editing release bumps.)
// Cache name:  sportsignal-v62 (v13.156-shadowtune: bumped from v61 — routine
//              evict for this release's public-13.56.css→13.57.css rename
//              (the owner-reported invisible cast shadows: the v13.155
//              .13/.055 alphas measured a −2.7 mean-luminance wash on the
//              navy HUD face; the pair lifts to .5/.22 with the soft blur
//              16→13px and the echo color alpha .45→.55 — a readable
//              figure-shaped cast, still feathered); stale HTML may still
//              reference the retired 13.56.css, which stays served per the
//              retention rule — cache-first assets can't refresh without a
//              rename or a bump, the v13.39 rule: every asset-editing
//              release bumps.)
// Cache name:  sportsignal-v61 (v13.155-herodepth: bumped from v60 — routine
//              evict for this release's public-13.55.css→13.56.css +
//              public-13.39.js→13.40.js renames (the hero visual depth pass:
//              directional player silhouettes cast onto the HUD's inner face,
//              the darker/dimensional panel face + frame depth, the faint
//              inward-facing player rim light, and the ambient particle
//              layer); stale HTML may still reference the retired
//              13.55.css/13.39.js pair, which stays served per the
//              retention rule — cache-first assets can't refresh without a
//              rename or a bump, the v13.39 rule: every asset-editing
//              release bumps.)
// Cache name:  sportsignal-v60 (v13.154-polish: bumped from v59 — routine
//              evict for this release's public-13.54.css→13.55.css rename
//              (the 6 owner adjustments from 545454.png: a REAL page gap
//              below the hero floor — margin-bottom 32px desktop / 24px
//              phones, the first container was starting at the floor's end
//              0px away; the match day barely closer to the kickoff
//              digits; the digits +11% (20/4.4cqi/40); the sync caption at
//              60% opacity; the player lanes PHYSICAL — each figure stands
//              beside his own team's crest, the old logical anchors
//              mirrored on RTL; the time+date cluster dead-centre in the
//              clock pod); stale HTML may still reference the retired
//              13.54.css, which stays served per the retention rule —
//              cache-first assets can't refresh without a rename or a
//              bump, the v13.39 rule: every asset-editing release bumps.)
// Cache name:  sportsignal-v59 (v13.153-heronext: bumped from v58 — routine
//              evict for this release's public-13.53.css→13.54.css +
//              public-13.38.js→13.39.js renames (the hero always shows the
//              NEXT future match — live/finished never take the card — plus
//              the hero→main-area safe margin: the scene floor 34→72px
//              desktop, 0→48px phones); stale HTML may still reference the
//              retired 13.53.css/13.38.js pair, which stays served per the
//              retention rule — cache-first assets can't refresh without a
//              rename or a bump, the v13.39 rule: every asset-editing
//              release bumps.)
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
// v13.150-hud: the whole match HUD is ONE supplied frame now —
// /ui/sportsignal-pc-match-hud.png (1000x406: wings + clock pod + date
// shelf + three countdown pockets + venue tail, icons baked in) replaces
// the card PNG + match-time chip PNG + countdown panel PNG; content =
// measured overlay zones per hud-visual-reference.png. New immutable
// pair: /public-13.51.css + /public-13.37.js (heroCentreNode restructure,
// bare digits/venue, the .hud-cells countdown layer inside the card).
// Cache name:  sportsignal-v55 (v13.149-syncfix: public-13.49.css→13.50.css
//              — CSS-only release, core-13.13.js carries over unchanged.
//              The owner's syncfix round: the تاریخ به‌روزرسانی caption
//              below the countdown was a STATIC element — it painted
//              UNDERNEATH .hero-bg (the z-index:1 stadium photo layer)
//              and was invisible on every viewport since v13.142 moved
//              it below the panel. Lifted into the content layer
//              (position:relative + z-index:2), the color pinned to a
//              hero-stable #E2E8F0 (the page ink token flips light→dark
//              in light theme and would hide it again), and 12px to
//              match the owner's at-least-12px floor for this area.
//              Routine evict — stale HTML may still reference 13.49.css,
//              which stays served per the retention rule.)
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
// Cache name:  sportsignal-v69 (v13.163-herohd: bumped from v68 — the
//              owner's quality round: «The quality of pictures are too
//              low, find better quality pictures for tottenham and
//              chelsea (it doesnt matter if you find one of the best
//              players of either team) not only the MVP.» The two v13.162
//              hero portraits were 220x280 premierleague.com headshot
//              cards upscaled ×1.65 to the 512 canvas (the documented
//              low-res exception — no larger official PL variant is
//              served). Both clubs' players DO have native UEFA
//              1080×1080 transparent cutoffs on the UCL 2025/26 campaign
//              URLs (the probe gap: the original no_asset sweep never
//              probed segment 1 / season 2026 — UCL 25/26 was both clubs'
//              most recent UEFA participation; fetched through the
//              redeployed uefa-image-relay). The swap: Chelsea → Cole
//              Palmer (id 250124282 — FD squad + FPL verified current),
//              Tottenham → Dominic Solanke (id 250066930; Romero,
//              Vicario and Johnson also carry 1080px cutoffs but all
//              three are DEPARTED per the FD squad — Romero's UEFA
//              profile now reads Atleti/UCL 26/27). The 1080px cutoffs
//              are downscaled lanczos3 to the 512 library canvas
//              (normalizePortrait — no upscale exception), then the
//              standard hero trim (345×464 / 298×464) + fresh casts; the
//              retired joao-pedro/maddison hero canvases + casts stay
//              served (retention rule: stale HTML + the pinned 13.46.js
//              still reference them). This release renames the bundle
//              public-13.46.js→13.47.js (CSS pair 13.62.css unchanged);
//              stale HTML may still reference the retired 13.46.js, which
//              stays served per the retention rule.)
// Cache name:  sportsignal-v68 (v13.162-heropair: bumped from v67 — the
//              owner's Chelsea + Tottenham round: «Investigate why chelsea
//              and tottenham doesnt have hero player pictures. if not
//              available. fetch and scrap them.» Root cause: HERO_ART was
//              scoped to the 2026/27 UCL 36-club roster and both PL giants
//              sat outside it (UEFA publishes no transparent cutoff for
//              either player — bounded 404 sweep re-verified 2026-10-19);
//              their portraits already lived UNWIRED in the 96-club big-5
//              hero MVP library (league-official premierleague.com headshot
//              cards, spec §8b). Fix: both wired — 2 new alpha-trimmed
//              hero canvases (365×464 / 366×464, the standard subject box)
//              + 2 pre-baked .cast.webp shadows (35 total, all 33 prior
//              casts byte-identical under the deterministic bake), kit
//              VLM-verified (João Pedro: Chelsea blue/lion crest/Nike;
//              Maddison: Spurs white/cockerel crest/AIA), uniform
//              bright-to-bottom so the default fade ramp carries both
//              (no custom tier). This release renames the bundle
//              public-13.45.js->13.46.js (CSS pair unchanged:
//              13.62.css); stale HTML may still reference the retired
//              13.45.js, which stays served per the retention rule.)
// Cache name:  sportsignal-v67 (v13.161-tzstamp: bumped from v66 — the
//              owner's two-item round: (1) the sync line («تاریخ
//              به‌روزرسانی: …») carries the display zone + GMT offset in
//              parentheses — «(تهران 3:30 GMT)» — server-stamped from
//              DISPLAY_TZ (markup.ts displayTzGmtOffset, shortOffset-
//              honest) and client-rendered from the user's ss_tz zone
//              (public-13.45.js tzStamp/tzOffAt — the offset at the
//              stamped instant, DST-honest; the city from the FA_TZ map);
//              the /__SEO_SYNC__/g router replace fixes the raw
//              placeholder that #lastSync showed pre-JS. (2) the match
//              day lifts a few px toward the match time
//              (.time-digits + .time-date --ss-date-lift, equal
//              padding-bottom keeps the digits centered in the clock
//              pod). This release renamed the asset pair
//              public-13.61.css->13.62.css + public-13.44.js->13.45.js;
//              stale HTML may still reference the retired pairs, which
//              stay served per the retention rule.)
// Cache name:  sportsignal-v66 (v13.160-casttune: bumped from v65 — the
//              owner's three-item round: (1) the cast shadows re-baked
//              stronger (sigma 9%H / alpha .68, all 33 .cast.webp files)
//              with a bigger lane-split vector + skewX(3.2deg) so the
//              head-shadow leans toward the card (left player casts
//              right, right player casts left); (2) the pose-width guard
//              (--ss-pose-shift) pulls wide poses inward off the viewport
//              edge; (3) the Melbourne timezone fix — the tz select's
//              filter auto-pick poisoned the change event; the choice now
//              persists in the ss_tz cookie + localStorage mirror and the
//              first-visit default is the browser/OS-locale zone. This
//              release renamed the asset pair public-13.60.css->13.61.css
//              + public-13.43.js->13.44.js; stale HTML may
//              still reference the retired pairs, which stay served per
//              the retention rule.
// Cache name:  sportsignal-v65 (v13.159-bakedcast: bumped from v64 — the
//              owner's black-line/rectangle fix, round 3: the projected
//              player shadow becomes a PRE-BAKED IMAGE (/players/hero/
//              <slug>.cast.webp from scripts/make-hero-casts.js) shown by a
//              filter-less, mask-less img.hero-cast — plain alpha pixels,
//              zero engine-sensitive compositing primitives (the three-round
//              post-mortem: SHADOW-CONSULTATION.md). This release renamed
//              the asset pair public-13.59.css→13.60.css +
//              public-13.42.js→13.43.js; stale HTML may still reference the
//              retired pair, which stays served per the retention rule.
// History — v13.158-pngshadow (v64): the cast became a brightness(0)+blur
//              masked copy; v13.151-edits (v57): the 8
//              owner adjustments from requested-edits.png: bigger wing names
//              + halved crest gap, the time larger/bolder with the match day
//              below it in the clock pod (the date shelf retires as a content
//              zone), the countdown grid dead-centre in the artwork pockets,
//              the sync caption onto the card's bottom rim, the competition
//              LOGO pack (/leagues/*.webp) riding the frame's top rim,
//              players +15% nearer the HUD, stadium lights +15%/+15%. This
//              release renamed the asset pair public-13.51.css→13.52.css +
//              public-13.37.js→13.38.js; stale HTML may still reference the
//              retired pair, which stays served per the retention rule.)
// v13.165-mcfa (v71): the owner round on the mobile hero — "1. too much
//              waste margin space around the HUD 2. unclear that they
//              should scroll — no sign of below containers 3. FA mode must
//              show jalali calender + farsi numerals + farsi translations".
//              The frame re-ships CROPPED as /ui/sportsignal-hud-mobile-c.webp
//              (alpha-bounds crop 743x1357 — the ~14%/side baked transparent
//              margins gone; lossless, composited-pixel-identical, 625KB),
//              the card is HEIGHT-driven (min(72svh,660px) + aspect-ratio
//              743/1357) so the first screen always shows the new scroll
//              hint (#mcHint — «بازی‌های دیگر» / More matches) + the next
//              card's peek, and the whole presentation goes LOCALE-AWARE:
//              data-i label hooks (core-13.14.js→core-13.15.js: mcVs/mcDay/
//              mcD/mcH/mcM/mcHint), renderMCard renders faName names + the
//              JALALI date + faNum digits + venueFa (mset rides fmtNum;
//              mcardHtml the FA/Jalali server mirror), en keeps the Latin
//              design language. Renames public-13.63.css→13.64.css +
//              public-13.48.js→13.49.js; CORE_URLS stays minimal (the
//              cropped frame + fonts lazy-cache on demand, cache-first).
// v13.164-matchcard (v70): the MOBILE hero — the HUD mobile match card
//              (the owner-supplied 1024x1536 2:3 frame, served lossless as
//              /ui/sportsignal-hud-mobile.webp) takes the hero <=899px (the
//              phone zone — the PC HUD frame squeezed to ~150px tall there);
//              14 cqw-scaled center-anchored slots, Chakra Petch
//              self-hosted, renderMCard + the updateBigBar second-tick,
//              mcardHtml the server mirror. Renames public-13.62.css→13.63.css
//              + public-13.47.js→13.48.js; CORE_URLS stays minimal (the
//              frame + fonts lazy-cache on demand, cache-first).
const CACHE = "sportsignal-v71";
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
