# SportSignal — Hero Player Cast Shadow: Engineering Consultation Dossier

**Prepared for**: a front-end engineer taking over the "player shadow renders as a
black line / hard-edged rectangle" problem on https://sportsignal.ir
**Prepared by**: the engineering agent that shipped rounds 1-3 below
**Date**: 2026-10-21 · **Live version at time of writing**: `13.159-bakedcast`
(worker version `66671370-ea38-4e80-968f-ff73ebd6fe0a`, deployed and verified)

---

## 0. TL;DR — what you need to know in 60 seconds

The site's hero shows two football-player PNG cutouts flanking a match card
(see §2 for the DOM/CSS map). The owner asked for a **soft, blurred,
silhouette-shaped projected shadow** cast from each player toward the card.
Three implementation rounds (v13.155 → v13.158) each shipped "verified" in
Chromium and each failed for the owner with the same symptom family:
**black lines, hard edges, rectangles.**

**The root cause (proven, not theorized)**: every round built the shadow from
LIVE CSS compositing primitives (`filter` + `mask` + `mask-clip` +
`clip-path` on/around the shadow element). These primitives have
engine-divergent behavior at their GEOMETRIC EDGES — the exact places where a
shadow must be soft. Each "fix" round swapped one fragile primitive for
another fragile primitive.

**The shipped fix (v13.159, live now)**: the shadow is a **pre-baked image
file** — `/players/hero/<slug>.cast.webp`, generated offline by
`scripts/make-hero-casts.js` (blackened + Gaussian-blurred + floor-faded, in
pixels, padded so the blur fringe never reaches the file edge). The `<img>`
that shows it carries **no filter, no mask, no max-width** — only `opacity`
and a lane-split `translate()`. Plain alpha pixels render identically in
every engine; nothing can crop them into a rectangle; they cannot paint
outside their own file bounds.

If v13.159 STILL fails for the owner, the problem is almost certainly NOT the
compositing (see §7 — the remaining suspects are image decoding/caching or
an old cached asset, both one-command checks).

---

## 1. The requirement (owner's words, in order)

1. *"a rectangle shape casted shadow, instead of the player's (png-based)
   silhouette of the same person… must be blurred and soft"* (report on
   v13.155/.156)
2. *"The method didnt work and casted a black line and rectangle instead.
   Can't you just cast shadow on the PNG picture object itself?"* (report on
   v13.157 — the owner's own suggested architecture)
3. *"The problem persists. there are still line and hard edges and
   rectangles"* (report on v13.158 — the report that triggered this dossier
   and round 3)

**The visual contract**: a soft dark shadow, shaped like the player's own
silhouette (head/shoulders/arms readable), cast toward the match card,
melting into the floor at the player's feet, never a rectangle, never a hard
edge, in EVERY browser engine (the audience is Iranian — significant Safari
iOS + older Android Chromium share), both themes, RTL and LTR, desktop and
mobile-retired.

---

## 2. The battlefield — exact DOM/CSS map (all file:line refs are v13.159)

```
.herowrap (position:relative; the hero section; bottom edge = "the floor")
├─ .hero-bg            z1  overflow:hidden — stadium photo/video/grades
├─ .hero-player.player-home   (LEFT lane,  z3, width:calc((100% - var(--ss-card-w))/2))
│    ├─ img.hero-cast         ← THE SHADOW (DOM-first = behind the figure)
│    └─ img                   ← the figure (the player PNG)
├─ .hero-player.player-away   (RIGHT lane, z3, mirrored)
│    ├─ img.hero-cast
│    └─ img
└─ a.hero-card         z2  (the match card; players paint ABOVE it)
```

Key rules (in `assets/public-13.60.css`):

| Rule | Value | Note |
|---|---|---|
| `.hero-player` | `position:absolute;bottom:0;height:100%;z-index:3` | lane wrapper, spans to .herowrap's bottom (floor+72px padding) |
| `.hero-player img` (base) | `bottom:-13.585%; height:min(105.54%,calc(113.585% - 122px)); width:auto; max-width:calc(100% + 32px); object-fit:contain; object-position:center bottom; filter:…; mask-image:linear-gradient(to top,transparent 0,transparent 14.8%,#000 26%)` | the FIGURE rule — its mask is the "feet-fade" (the figure melts into the floor) |
| `.hero-player.player-home img` | `right:-32px` (tucks 32px toward the card) | away mirrors: `left:-32px` |
| lane clip-paths | home `inset(-100% -160px -100% -100%)`, away `inset(-100% -100% -100% -160px)` | v13.159: bottom bound OPENED to −100% (was `0` — the floor-line cutter); card-side −160px guard |
| cast rules | `.hero-player--cinematic.player-home img.hero-cast{filter:none;-webkit-mask:none;mask:none;max-width:none;opacity:var(--ss-cast-alpha);transform:translate(var(--ss-cast-x),var(--ss-cast-y))}` (+ away mirrored with `calc(-1*var(--ss-cast-x))`) | v13.159: the WHOLE rule set |
| tokens | `--ss-cast-x:clamp(48px,4.4vw,88px); --ss-cast-y:clamp(10px,.9vw,18px); --ss-cast-alpha:1` (dark) / `.82` (light) | |
| figure chain (untouched) | `--ss-player-grade` → `--ss-player-shadow` (drop-shadow 0 12px 22px) → rim → halo | the approved figure look since v13.142 |

The art: `assets/players/hero/<slug>.webp` — 33 alpha-trimmed lossless-webp
cutouts (bbox + 2px pad, all 464px tall, widths 236-429), served at
`/players/hero/<slug>.webp` (day-fresh cache). The shadows:
`<slug>.cast.webp` siblings, same directory, same caching.

The fill: `heroArt()` in `assets/public-13.43.js` —
`sc.src = art.src.replace(/\.webp$/,".cast.webp")` from the same
`HERO_ART`/`heroArtFor` entry (single source of truth; HERO_ART maps
club → player slug; the client fills both imgs per lane from the live match
payload).

---

## 3. Round-by-round: what was worked, how, what failed, and the PROOF

### Round 1 — v13.155-herodepth / v13.156-shadowtune: the shadow PLANE

**What was built**: a decorative `.hud-shadow-plane` layer between the card
and the figures, carrying blackened copies of the same portrait PNGs:
`filter: brightness(0) blur(16px)` (tuned to 13px + an "echo"
`drop-shadow(0 67px 11.52px …)` in .156 for reach), opacity ~.13→.6, clipped
to a 28-vertex polygon matching the card artwork's inner face.

**How it was verified at the time**: pixel A/B toggles of the plane, zone
deltas over crests, VLM crop reads. All green in Chromium.

**Why it failed for the owner (established in the v13.157 post-mortem)**:
1. The copies carried the FIGURE's feet-fade mask; `mask-clip:border-box`
   (the default) **crops the FILTERED paint to the img element's rectangle**
   — blur and echo included — while the echo's +67px offset filled the box
   interior: `union(silhouette, echo) ≈ the whole box`, clipped to a
   rectangle ⇒ **the razor-edged solid black rectangle** the owner
   screenshot-verified ("solid filled rectangle/block, softness 1/10").
2. Architecturally, the wing's inner-face clip only ever exposed a
   22px→~100px window of the portrait's inner edge — for bbox-cropped poses
   the recognizable features (Kane's head, arm gap) mapped OUTSIDE the
   window, so no alpha/vector tuning could ever make it read as a silhouette.

**Lesson**: `filter` + `mask` on the same element = the mask's border-box
clip crops the filter's output at the element's straight edges. Never put a
blur that must exceed the element box on a masked element.

### Round 2 — v13.157-shadowfix: drop-shadow on the WRAPPER

**What was built** (the owner's own suggestion, adopted): retire the plane;
put `filter: drop-shadow(clamp(28px,2.6vw,52px) clamp(10px,.9vw,18px)
clamp(20px,1.9vw,38px) rgba(2,12,30,.52))` on the `.hero-player--cinematic`
lane WRAPPER (unmasked), lane-split ±X.

**How it was verified**: 78,557 toggle-verified pixels, contour std-dev
13.5-141.7px (organic), VLM 8/10 softness, both sandbox and production
Chromium, content zones 0.00 delta.

**Why it failed for the owner**: two mechanisms, both diagnosed at the time:
1. `filter()` on a CONTAINER that wraps a masked + clip-path'ed child is
   engine-fragile — the ancestor filter re-rasterizes the child's mask/clip
   during offscreen compositing (the classic WebKit-class failure). The
   owner's browser composited it as "a black line and rectangle".
2. **In EVERY engine**: the wrapper's own `clip-path:inset(-100% -32px 0
   -100%)` hard-cut the cast's inward tail at the 32px tuck line — the
   v13.157 QA's own flank cluster measurements ended exactly at that clip.

**Lesson**: never filter an ancestor of a masked/clipped child; and remember
`clip-path` cuts filter OUTPUT, in every engine, at straight lines.

### Round 3 — v13.158-pngshadow: brightness(0)+blur copy with mask-clip:no-clip

**What was built** (again following the owner's "cast shadow on the PNG
picture object itself" literally): each lane wrapper carries TWO imgs —
`img.hero-cast` first (behind), the figure second — both filled with the
SAME webp URL. Cast CSS: `filter:brightness(0) blur(clamp(20px,1.9vw,38px));
opacity:.52; -webkit-mask-clip:no-clip; mask-clip:no-clip;
transform:translate(±49.92px,17.28px)` — the copy inheriting the figure's
geometry AND feet-fade mask, with `no-clip` to let the blur fringe paint
past the img box; lane clip widened 32→120px.

**How it was verified**: computed styles, A/B toggle diffs (flanks),
hard-cut detector at the OLD tuck lines (x532/x1388), VLM flank crops 8/10
silhouette, content zones 0.000, LTR byte-identical, light theme, mobile
retirement. All green. **The owner still reported "line and hard edges and
rectangles."**

**Why it failed — REPRODUCED AND PROVEN this round (this is the new work)**:

On the local mirror (wrangler dev :8787, KV fixture reseeded
Bayern(Kane)/Arsenal(Saka), viewport 1920×900):

1. **The below-hero LEAK (Chromium, i.e. the engine that SUPPORTS no-clip)**:
   `mask-clip:no-clip` extends the mask painting area past the img box, and
   the lane wrapper's `clip-path` does **NOT** contain the mask-extended
   paint. The blurred feet-fringe leaked BELOW the hero floor onto the match
   list: **60,848 toggle-verified changed pixels** (casts on vs hidden,
   animations frozen, video paused), an ASCII-heatmap-mapped solid black
   smear under the away player at x≈1560-1920 / y≈760-900+ (viewport
   bottom — it extended further). The v13.158 QA had seen this exact
   below-fold diff in its own A/B and **misattributed it to "the live match
   list"** — that sentence in the v13.158 changelog is the smoking gun of
   the missed diagnosis. This is what the owner was seeing.
2. **The border-box fallback (engines WITHOUT no-clip — Safari, Chromium
   <120)**: forcing `mask-clip:border-box` in DevTools changed 50,238
   pixels with Δ up to 203 — the fringe razor-cut at the img element's
   straight edges = "hard edges and rectangles".
3. **The floor-line cut (every engine)**: the wrapper clip's `bottom:0`
   straight-lined everything crossing the wrapper's bottom edge — the
   figure's own drop-shadow tails AND the cast's fade tail.
4. **The card-side cut**: the cast's translated canvas reached x631 at 1920
   while the widened clip still cut at x620 — a straight vertical cut
   through live shadow paint (the v13.158 hard-cut detector was pointed at
   the OLD x532/x1388 tuck lines, not the NEW x620/x1300 bounds).

**Lesson (the round-3 synthesis)**: `filter`/`mask`/`mask-clip`/`clip-path`
combinations are engine-divergent AT THEIR GEOMETRIC EDGES. Three rounds
each picked a different subset of the same fragile family. The QA kept
passing because Chromium is ONE engine and the detectors were pointed at
the PREVIOUS round's artifact coordinates, not the CURRENT round's.

### Round 3 fix — v13.159-bakedcast (LIVE NOW)

**Architecture**: remove the entire primitive family from the shadow layer.
The shadow is baked into pixels at build time.

- `scripts/make-hero-casts.js` (committed, deterministic, sharp):
  per portrait → `<slug>.cast.webp`:
  - pad: sides `max(12.5%H, 1.9σ)` each, top `8%H` (fully feathered away),
    bottom `0` (the bottom fringe is handled by the fade)
  - blacken: RGB→0, alpha preserved (the silhouette IS the shadow)
  - blur: Gaussian σ = 6.5% of source height (≈36px at the 1920 hero —
    matching the approved v13.158 softness)
  - floor fade: alpha smoothstep 0→1 over the bottom 15%→26% of source
    height (mirrors the figure's mask ramp, so the shadow melts with the
    figure at the same floor line)
  - top feather: smoothstep across the whole top pad
  - master alpha ×0.55; lossless webp
  - **side pads are HEIGHT-based on purpose**: width-proportional pads made
    wide-pose files (Saka 411px-wide canvas) far wider than their
    (max-width-capped) figure boxes; the edge-anchored box growth then
    CANCELLED the away lane's translate and put the crescent on the WRONG
    side — caught by A/B darkened-band mapping during the v13.159 QA and
    fixed before release. Keep them height-based.
- `heroArt()` (public-13.43.js): `sc.src = art.src.replace(/\.webp$/,".cast.webp")`
- CSS (public-13.60.css): the cast rule is deliberately boring —
  `filter:none; -webkit-mask:none; mask:none; max-width:none;
  opacity:var(--ss-cast-alpha); transform:translate(±var(--ss-cast-x),
  var(--ss-cast-y))` (both the filter and the mask must be EXPLICITLY killed
  or the base `.hero-player img` rule hands them back — the mask is the
  rectangle mechanism). Lane clips opened to
  `inset(-100% -160px -100% -100%)` / mirrored: the `bottom:0` floor cut is
  gone (nothing left to guard), the −160px card-side bound clears the
  cast's painted box (~116px at 1920) while guarding the wing crests.
- `--ss-cast-x` enlarged to `clamp(48px,4.4vw,88px)`: the baked side pads
  offset the silhouette ~70px back from the box's card-side edge (the box
  shares the figure's card-side anchor and grows away from the card), so
  the vector = pad-offset (~70px) + the visible crescent (~16px core +
  fringe).

**Why this cannot regress into the owner's symptom**: the cast img renders
plain alpha pixels — the only geometry it participates in is its own
content box (+ translate). It cannot be cropped by any mask/clip semantics
(no mask, no filter, and the ancestor clips clear its painted extent), it
cannot leak below the hero (its visible alpha ends at the baked fade, ~14px
below the floor line, on the dark floor margin), and every engine
rasterizes an alpha webp identically.

**The shipped verification (v13.159)**:
- computed: `filter:none`, `mask:none`, `opacity:1`, `translate(84.48,
  17.28)` at 1920, casts = the .cast.webp files, naturalWidth 352 (Kane)
- below-hero left margin A/B: **0 changed pixels** (was 60,848)
- the cast's painted boxes measured: home x190-616, away x1304-1941,
  bottom y742 — visible alpha ends y651 — nothing below, nothing at the
  clip bounds (x660/x1260 guards cleared)
- content zones (exact crest/name/clock rects measured in-DOM):
  **0.000 delta** home crest, away crest, both names, clock pod
- crescent side: darkened-band mapping peaks at the figure's CARD-side
  contour on BOTH lanes (home x480-540, away x1330-1580 + pose-hole shadow
  through Saka's arm gaps — correct shadow-through-gaps behavior)
- VLM: home flank "distinct dark cast shadow … toward the match-card wing
  … no hard geometric edges … premium composite"; away flank "most
  prominent on his LEFT side (toward the card) … no hard straight edges,
  black rectangles, or razor-sharp lines"; full page "no black rectangles
  or smudges overlapping the content below the hero"
- LTR toggle: transforms byte-identical, lanes unchanged; light theme
  renders (opacity .82 over the baked .55); ≤1019px: players + casts
  retire (`display:none`)
- `npm test` EXIT 0 — 2069 checks (pins rewritten: bundle/css refs, the
  full cast-CSS contract, the heroArt derivation, the lane clips, SW v65,
  a NEW pin requiring every HERO_ART src to have its .cast.webp sibling
  and the bake script's params to stay documented)
- live: healthz `13.159-bakedcast`, CSS/JS md5-identical to repo, cast
  webps 200, SW `sportsignal-v65`, live browser A/B: 0 below-hero margin
  pixels, shadow present (28,286 darkened px in the home flank), VLM clean

---

## 4. What was NOT tested (honest gaps — check these first if it fails)

1. **Real Safari / WebKit / Firefox were never driven directly.** All
   browser QA ran in sandbox Chromium (recent). The engine-divergence
   reasoning is sound for v13.159 (no engine-sensitive primitives remain),
   but nobody has literally opened the site in Safari. `agent-browser`
   (Playwright/Chromium) cannot do this; use BrowserStack / a real device,
   or ask the owner for a screenshot + `navigator.userAgent`.
2. **The owner's actual viewport/zoom/device is unknown.** The repro matrix
   was 1920×900, 1440-ish implicit via clamps, 375×700. If the owner views
   at an odd zoom (e.g. 125% Windows scaling), the clamps shift — the
   architecture is zoom-safe (all relative), but the LOOK was not verified
   there.
3. **`prefers-reduced-motion`**: the cast is a static effect and stays on
   (per the v13.155 spec 05 contract) — verified by reasoning, not by an
   emulation pass.
4. **PWA/offline**: the .cast.webp files ride the SW's
   `/players/hero/*; stale` runtime cache rule (not precached). An offline
   load may show figures whose cast webps haven't been runtime-cached yet —
   a benign degrade (figure without shadow), not an artifact. Not
   explicitly driven offline.
5. **The hero rotation pipeline** (owner replaces players over time): the
   new pin in check-stats FAILS the test suite if a HERO_ART entry lacks
   its .cast.webp — the rotation procedure must run
   `node scripts/make-hero-casts.js` (or at minimum bake the new slug) and
   commit the file. Documented in the script header; not exercised
   end-to-end with a fake new player.

---

## 5. How to reproduce / verify any of this yourself

Local mirror (wrangler dev, needs the CF token as an env var because of the
remote AI binding — get it from the owner, never commit it):

```bash
cd <repo>
node scripts/seed-local.js        # KV fixture: Bayern(Kane) vs Arsenal(Saka)
CLOUDFLARE_API_TOKEN=<token> setsid nohup bunx wrangler dev --port 8787 --host 127.0.0.1 &
# NOTE: seed AFTER any wrangler restart; and the SW caches /api/public-matches
# stale-while-revalidate — on repeated QA runs unregister the SW + clear caches
# in DevTools (Application → Clear storage) or the hero will show empty.
```

Artifact detectors (the ones that caught everything in round 3):

```bash
# 1) below-hero leak: freeze animations+video, screenshot casts on/off, diff
#    margins below the hero — must be 0 px (node + sharp; sharp is in the
#    repo's node_modules)
# 2) darkened-band mapping: diff casts on/off per 20px column band; the
#    darkening must PEAK at the figure's CARD-side contour on both lanes
# 3) content zones: measure .team-crest/.hero-name/.hero-time rects in-DOM
#    (getBoundingClientRect), diff those rects on/off — must be 0 px
# 4) hard-cut detector: |lum(x,y) − lum(x±1,y)| ≥ 8 over ≥50px runs — must
#    find ONLY the figure's own silhouette edges and the hero/page seam
#    (y≈637 at 1920×900, present with casts hidden — it is the designed
#    .hero-bg bottom, NOT an artifact; do not chase it)
```

Gates: `npm test` (2069 checks incl. all the shadow pins). Release flow:
version-bump chain (config.ts VERSION, package.json, CSS/JS rename-on-edit,
SW cache bump, _headers pins, check-stats pins, CHANGELOG, admin-parity
re-freeze via `node scripts/check-admin-parity.js --update`) → test →
commit+push → `CLOUDFLARE_API_TOKEN=… CLOUDFLARE_ACCOUNT_ID=… npx wrangler
deploy` → verify healthz version, live refs, md5s, SW const, browser A/B,
two cron ticks (healthz `last_cron_age_min` resets). RUNBOOK.md at the repo
root has the full §3 checklist.

---

## 6. Where everything lives (v13.159)

| What | Where |
|---|---|
| Shadow generator | `scripts/make-hero-casts.js` (params pinned by check-stats) |
| Shadow files | `assets/players/hero/<slug>.cast.webp` (33) |
| Cast CSS rules + tokens + post-mortems | `assets/public-13.60.css` (the `--ss-cast-*` token comment, the P7.3 clip comment, the "LIVE-COMPOSITED cast RETIRED" block) |
| Cast fill (heroArt) | `assets/public-13.43.js` (`function heroArt`) |
| Hero markup + contract comments | `src/pages/public.ts` (~lines 181-198, 248-271) |
| Stylesheet href | `src/seo/page-shell.ts` + `src/pages/public.ts` |
| Version | `src/config.ts` `VERSION`, `package.json` |
| Test pins (all shadow contracts) | `scripts/check-stats.js` (~lines 232-234, 243, 255, 429-430, 475-486, 505-506) |
| Baselines | `scripts/fixtures/public-page-baseline.html` |
| History | `CHANGELOG.md` entries [13.155]-[13.159]; git log v13.155→v13.159 |

---

## 7. If the owner STILL reports artifacts on v13.159 — triage order

1. **Stale cache (most likely)**: the CSS/JS/casts are immutable-cached
   (31536000) and the SW is v65 — but the OWNER's browser may hold an old
   registration + old HTML (SEO TTL ~900s). Ask them to hard-refresh / clear
   site data, or check `document.querySelector('link[rel=stylesheet]').href`
   in their console — it MUST be `/public-13.60.css`. If it's 13.58/13.59,
   they are looking at a previous round; the fix round never reached them.
2. **Which asset, which engine**: get `navigator.userAgent` + a screenshot
   crop + the computed style of `.hero-cast` (must print `filter: none`,
   `mask-image: none`, `opacity: 1`, a translate matrix). Any deviation =
   stale CSS; no deviation but artifacts = move to (3).
3. **The remaining visual suspects** (all in the BAKED FILES, all
   engine-proof to render but tunable in look):
   - the file-edge fringe cut (α≈0.005-0.01 — invisible; raise
     `PAD_SIDE_SIGMA` in make-hero-casts.js if paranoid)
   - the floor tail (14px of sub-0.15-alpha fade below the floor line, on
     the dark margin; raise `FADE_LO_H` to pull it up)
   - the crescent width (`--ss-cast-x` minus the pad offset ~70px = the
     visible core; widen by raising the token)
   Regenerate with `node scripts/make-hero-casts.js` after any param edit
   (deterministic; the check-stats pins will force the docs to match).
4. **If it's genuinely a NEW engine bug with plain alpha webps + opacity +
   translate** (no known instance): escalate with the computed-style dump,
   the UA string, and the exact crop — at that point the layer is
   suspicious-proof by construction, so the report would implicate
   something OUTSIDE the cast system (e.g. the FIGURE's own filter chain,
   which is unchanged since v13.142 and was never the complaint).

---

## 8. Access & operational notes for the consulting engineer

- Repo: `assadigit/SportSignal` (GitHub, main branch). The agent works in a
  sandbox clone; the owner holds the GitHub, Cloudflare, Telegram and
  football-data credentials — request them from the owner directly. They are
  deliberately NOT written into this file or the repo.
- Deploy: `npx wrangler deploy` from the repo root with
  `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` in the environment.
  Worker name `ucl-notifier`; routes serve https://sportsignal.ir.
- **Never** `bun run build` / never touch the Next.js app at :3000 — the
  user-facing product is the worker; the sandbox preview proxies to :8787.
- Asset discipline: `public-{n}.css/js` are rename-on-edit, immutable, and
  retired files stay served+pinned for one SEO TTL; sw.js `CACHE` bumps
  every release; `/players/hero/*` is day-fresh (owner-replaceable) — cast
  files inherit that rule (a replaced portrait must re-run the bake).
- The single most important institutional lesson from this saga, for
  whatever you build next here: **when a visual layer must be soft at its
  edges, do not compose it from filter/mask/clip primitives whose
  edge semantics vary per engine — ship pixels.**
