# SportSignal — Hero Redesign: Session Handoff

> **Purpose:** hand this document to the next agent session. It captures the
> verified state of the hero redesign (v13.120-hero, LIVE since 2026-10-18),
> the UEFA portrait collection that landed after it, and the concrete work
> that remains to finish the hero's artwork story. Read it fully before
> writing any code.

---

## 1. Verified state at handoff (2026-10-18)

| What | State |
|---|---|
| Repository | `main`, clean tree, everything pushed |
| Hero redesign | **Shipped, deployed, browser-verified** — commits `704e808` (v13.120-hero) and `ccb090d` (v13.120-hero.1) |
| Portrait collection | **Landed** — commit `44e9906` (owner push): 34/36 official UEFA cutoff portraits + pipeline + manifest + offline test gate |
| Production | Worker `ucl-notifier` live at **https://sportsignal.ir** (and `ucl-notifier.sportsignal.workers.dev`), version `13.120-hero`, last deploy `e4645704` |
| Live SEO check | `npm run seo:check` → **PASS 56 / FAIL 0** |
| Local suite | `npm test` → **exit 0** (tsc clean, 1939 OK + portraits gate 37/37) |
| Player artwork in hero | **NOT wired yet** — `HERO_ART` ships EMPTY by design (the hero phase was forbidden from generating player images) |

The hero today: Stadium Pulse + Match Protocol — three-zone card (home |
blue kickoff panel | away) over the cinematic video stage, four-unit
countdown (server-filled digits, client updates digits only), HUD chrome,
fa/RTL + en/LTR, dark + light themes, mobile two-row composition (≤640px),
all seven match states degrade gracefully. It is **visually complete
without artwork** — the `.hero-art` layer renders only when a mapping
exists.

## 2. The remaining work (in priority order)

### A. Core task — wire the UEFA portraits into the hero

**Integration point (already built and tested):**

- `assets/public-13.28.js`, top of the hero builders:

  ```js
  var HERO_ART = {};   // ← currently EMPTY (the phase rule)
  function heroArtFor(e){ ... HERO_ART[e.name] || HERO_ART[e.faName] ... }
  function heroArt(e,a){ /* fills .hero-art img[0]=home, img[1]=away,
                            toggles .has */ }
  ```

- Entry shape: `{ src, alt, poseId }` keyed by the **exact provider team
  name** (football-data.org spelling, e.g. `"Paris Saint-Germain"`,
  `"FC Barcelona"`, `"Real Madrid CF"` — cross-ref `src/config.ts` /
  `src/teams.ts`; `faName` is the lookup fallback).
- Markup slot: `<div class="hero-art" aria-hidden="true">` with two
  src-less `<img alt="">` in `src/pages/public.ts`.
- CSS (`.hero-art` block in `assets/public-13.24.css` ~line 390):
  absolute flanks, `bottom:0; height:82%; max-height:400px; width:auto;
  object-fit:contain`, `display:none` default, `.has` shows it,
  **hidden ≤900px, never mirrored**.

**What the next session must do:**

1. **Reconcile the artwork contract.** `assets/hero/players/README.md`
   documents the ORIGINAL phase contract (1024×1536 2:3 transparent PNG per
   team, AI-generated pose library, files under `/assets/hero/players/`).
   Reality after `44e9906`: **real UEFA photos, 512×512 square, lossless
   WebP with alpha, served from `/players/uefa/<slug>.webp`**. Rewrite that
   README to the real contract (source = UEFA cutoff collection, manifest =
   provenance, `poseId` obsolete → drop or keep as catalog metadata only).
2. **Build the HERO_ART mapping** — provider team name → portrait file.
   Verified club→file map from the manifest (UEFA's short club names;
   translate to provider spellings when keying):

   | UEFA club | Portrait file |
   |---|---|
   | Paris (PSG) | `ousmane-dembele.webp` |
   | Barcelona | `lamine-yamal.webp` |
   | Real Madrid | `kylian-mbappe.webp` |
   | Man City | `erling-haaland.webp` |
   | Liverpool | `bradley-barcola.webp` |
   | Arsenal | `bukayo-saka.webp` |
   | Bayern München | `harry-kane.webp` |
   | B. Dortmund | `serhou-guirassy.webp` |
   | Inter | `lautaro-martinez.webp` |
   | Napoli | `scott-mctominay.webp` |
   | Man Utd | `bruno-fernandes.webp` |
   | Atleti | `julian-alvarez.webp` |
   | Roma | `paulo-dybala.webp` |
   | Villarreal | `georges-mikautadze.webp` |
   | Feyenoord | `luciano-valente.webp` |
   | PSV | `ricardo-pepi.webp` |
   | Porto | `diogo-costa.webp` |
   | Sporting CP | `luis-suarez-colombia.webp` |
   | Galatasaray | `victor-osimhen.webp` |
   | Fenerbahçe | `ngolo-kante.webp` |
   | Como | `nico-paz.webp` |
   | Real Betis | `antony.webp` |
   | AEK Athens | `luka-jovic.webp` |
   | Shakhtar | `pedrinho.webp` |
   | Club Brugge | `nicolo-tresoldi.webp` |
   | Leipzig | `christoph-baumgartner.webp` |
   | Stuttgart | `deniz-undav.webp` |
   | Bodø/Glimt | `patrick-berg.webp` |
   | Slavia Praha | `lukas-provod.webp` |
   | LASK | `samuel-adeniran.webp` |
   | S. Bratislava | `andraz-sporar.webp` ⚠ kit mismatch |
   | Sabah | `veljko-simic.webp` |
   | Viking | `zlatko-tripic.webp` |
   | Lille | `ayase-ueda.webp` ⚠ kit mismatch (shows Feyenoord) |

   ⚠ Two portraits show a *previous club's* kit (documented in
   `assets/players/uefa/manifest.json` warnings): Ueda (Feyenoord kit, now
   Lille) and Šporar (Olimpija kit, registered Slovan Bratislava). Decide:
   keep with a manifest note, or exclude those two teams from HERO_ART.
3. **CSS check for square art.** The flank sizing was designed for tall 2:3
   artwork; a square image at `height:82%` will be wider than intended and
   may crowd the center panel. Verify visually at 1920/1440/1024; adjust
   height/position if needed (likely ~60-70% height for square sources).
   Keep: hidden ≤900px, no mirroring, no layout shift when the image loads
   (fade-in is fine; reserve nothing).
4. **Update the test pins** in `scripts/check-stats.js`:
   - `HERO_ART mapping ships EMPTY (…)` → becomes a pin asserting the
     REAL mapping (every `src` resolves to a file that exists in
     `assets/players/uefa/`, keys are provider-name style, `alt:""`).
   - The template pin (`hero-art slot present but empty`) and the
     `hidden ≤900px` CSS pin stay as-is.
5. **Version choreography** (the repo's rules — see §3): bump to
   `13.121-portraits` (or similar), rename-on-edit any asset you touch
   (`public-13.28.js` → `13.29`, `public-13.24.css` → `13.25`), update
   `_headers` immutable pins, `sw.js` `CACHE` v30 → v31, CHANGELOG entry,
   `check-version-sync` must pass, re-freeze baselines with
   `node scripts/check-admin-parity.js --update` if `src/pages/public.ts`
   changed.

### B. Owner decision gates — ask, don't assume

1. **UEFA rights (the big one).** `docs/assets/uefa-player-portraits.md` §7:
   redistribution permission is **NOT established**. The assets are already
   web-served at `/players/uefa/*` (the owner pushed that), but *displaying
   them inside the public hero* is the visible, prominent use. Get an
   explicit owner go/no-go before deploying the wired hero. If no-go: ship
   the wiring with `HERO_ART` still empty (the graceful fallback IS the
   feature) and document why.
2. **Team coverage** — only these 34 players' teams can render artwork;
   every other team keeps the crest-only look (by design, no blank slots).
   Confirm the representative-player choices above.
3. **Deferred players** — Nicolas Jackson (Aston Villa) and Florian Thauvin
   (Lens): UEFA publishes no transparent cutoff for either; deferred by
   owner decision 2026-10-18 (records in the manifest). UEFA sometimes
   publishes mid-season — re-run
   `node scripts/uefa-player-portraits/cli.js fetch --refresh` +
   `npm run portraits:normalize && npm run portraits:validate` to re-check.

### C. Related open items (context, not blockers)

- `OWNER_TODO.md` §8 — the mobile LCP decision (background video vs
  optimized still; predates the redesign, still pending owner choice).
- `OWNER_TODO.md` §2 — ClaudeBot/Amazonbot still 403 (owner-side
  Cloudflare setting).

## 3. The repo's engineering rules (non-negotiable)

- **Rename-on-edit (the v13.39 rule):** versioned assets
  (`public-*.js`, `public-*.css`, `core-*.js`) are cache-first + immutable —
  any content change requires a filename bump, `_headers` pin update, and
  `sw.js` CACHE bump.
- **Version triplet:** `package.json` version · `src/config.ts` VERSION ·
  asset/CACHE bumps must move together; `scripts/check-version-sync.js`
  enforces it.
- **Baselines:** page templates are pinned in `scripts/fixtures/*-baseline.html`
  — re-freeze with `node scripts/check-admin-parity.js --update` (never by
  hand) after intentional template changes.
- **Test pins describe the intended design:** when you change a design,
  change its pins in the same commit (`check-stats.js`, `check-scheduler.js`).
- **Suite green before push:** `npm test` must exit 0 (tsc + all check
  scripts). The 4 "❌ TSP day sweep" console lines in the scheduler check
  are pre-existing harness fixtures — exit code is the truth.
- **Never commit secrets.** Credentials arrive per-session from the owner;
  the remote URL in a fresh clone must not contain tokens.
- **Preserve owner changes:** the owner pushes "Add files via upload"
  commits directly to main — fetch before pushing, rebase cleanly, never
  force-push, never reset.
- **Deploy:** `npx wrangler deploy` (owner's CF token + account id arrive
  with the session). Then verify live: homepage 200 + correct version,
  new asset URLs 200, `npm run seo:check` → 56/0. Note the homepage HTML
  is edge-cached (`s-maxage=60, stale-while-revalidate=300`) — wait ~2 min
  or poll before declaring an HTML change missing; versioned assets are
  immutable and instant.
- **The deployment of record should be the pushed HEAD** — deploy after
  push, even for asset/doc-only changes.

## 4. Development environment (this sandbox)

- Repo: `/home/z/SportSignal` (checked out on `main`).
- Local worker: `cd /home/z/SportSignal && npm run dev` →
  `wrangler dev --port 8787` (KV/D1 bindings resolve to local miniflare).
- Seeding the local KV for hero-state testing: helpers at
  `/home/z/hero-dev/reseed.sh` and `/tmp/seed-payload.js` (modes:
  upcoming | live | finished | soon | postponed | passed | empty). If the
  sandbox was reset, the pattern is: write pubMatch-shaped payloads into
  the `STATE` namespace preview id `3d0548d6…` and wipe `caches.default`.
- Preview surface: the sandbox's Next.js on port 3000 embeds the worker via
  `/preview` (`src/app/api/preview/route.ts` proxies pages, stripping CSP
  `frame-ancestors`; `next.config.ts` rewrites forward versioned assets,
  fonts, media, API and subroutes to :8787). Only `/` is user-visible in
  the sandbox preview panel.
- Shared worklog: `/home/z/my-project/worklog.md` — read before working,
  append your session record after (template inside).

## 5. Verification checklist (the portraits-in-hero session)

- [ ] `npm test` exit 0 (1939 + 37 OK, or more with new pins)
- [ ] `npx tsc --noEmit` clean
- [ ] Hero shows flanking artwork >900px for a mapped team pair (seed a
      fixture, e.g. Barcelona–Bayern), none ≤900px
- [ ] Unmapped teams → no artwork, no blank slot, no broken img, no CLS
- [ ] Both themes, fa/RTL + en/LTR, `prefers-reduced-motion`
- [ ] `check-stats.js` pins updated and green; baselines re-frozen
- [ ] Version triplet + `_headers` + `sw.js` CACHE bumped; CHANGELOG entry
- [ ] Pushed; deployed; live: hero renders on real match data, portrait
      URLs 200, `seo:check` 56/0
- [ ] Owner decision on UEFA rights recorded in the handoff/worklog
- [ ] Worklog appended; this file updated or retired

## 6. Pointers (where everything lives)

| Thing | Path |
|---|---|
| Hero client code | `assets/public-13.28.js` (`renderHeroSpot`, `heroArt`, `heroArtFor`, `updateBigBar`) |
| Hero CSS | `assets/public-13.24.css` (the `--hero-*` token section) |
| Hero server mirror | `src/seo/markup.ts` (`heroCardHtml`), `src/seo/router.ts` (fills countdown digits) |
| Hero markup | `src/pages/public.ts` (the `bighero` card) |
| Artwork contract (to rewrite) | `assets/hero/players/README.md` |
| Portraits + manifest | `assets/players/uefa/` (served at `/players/uefa/`) |
| Portrait pipeline | `scripts/uefa-player-portraits/` + `docs/assets/uefa-player-portraits.md` |
| Portrait spec (owner's) | `uefa-player-portraits.spec.md` (repo root) |
| Hero spec package | was `sportsignal-hero-spec.zip` on main; extracted copy at `/tmp/hero-spec/sportsignal-hero-spec/` |
| i18n keys | `assets/core-13.11.js` (`I18N` fa/en) |
| Test pins | `scripts/check-stats.js`, `scripts/check-scheduler.js` |
| Baselines | `scripts/fixtures/*-baseline.html` |
