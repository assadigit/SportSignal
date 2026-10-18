# SportSignal — Hero Artwork Session Handoff (v13.121-portraits)

> **Status 2026-10-18 (late evening): SHIPPED, DEPLOYED, VERIFIED LIVE.**
> Owner gates answered (§B); release pushed (`bb3c791` + security redact
> `60a1a4a`), deployed to Cloudflare (worker version
> `69775023-8dd2-4cea-8c4f-2ab682cb23be`), and verified on production
> (§C — all green). **This document is retired**; the durable contract lives
> in `assets/hero/players/README.md`, the CHANGELOG, and the manifest.

---

## A. What shipped (this release, suite green)

**The hero artwork is wired**: `HERO_ART` in `assets/public-13.29.js` maps 33
official UEFA cutoff portraits — `{src, alt}` entries, `alt:""`, `poseId`
dropped — keyed by the exact football-data.org provider team names (verified
live against the FD API; FD is the first-priority pool source, so
followed-club rows carry these spellings; `faName` remains the `heroArtFor`
fallback). Sources: `/players/uefa/<slug>.webp` (provenance:
`assets/players/uefa/manifest.json`). Unmapped teams keep the crest-only
look — no blank slot, no broken img, zero CLS.

### The kit audit (owner rule 2026-10-18: NO kit mismatch allowed)

All 34 collected portraits were **visually verified** against their club's
2026/27 kit (crest, manufacturer, shirt sponsor, colours — cross-checked
against kit archives and club announcements). Result: **exactly ONE kit
mismatch among the 34 players**:

- **Ayase Ueda → Lille OSC — EXCLUDED.** His UEFA cutoff photographs him in
  his **Feyenoord** kit (red/white half-split, Feyenoord crest, Castore);
  the Feyenoord→Lille transfer is confirmed (30–31 Aug 2026, ~€15m).
  Lille keeps the crest-only fallback until UEFA reshots him in a Lille
  kit (`cli.js fetch --refresh` + kit re-verification, then restore the
  one-line entry 33→34 + pin count).
- **Andraž Šporar → ŠK Slovan Bratislava — KEPT (false alarm resolved).**
  The collection session's warning claimed an Olimpija Ljubljana kit; the
  portrait is actually a **genuine Slovan kit** (royal blue, adidas, gold
  `niké je tipovanie` sponsor, circular crest with the white double cross
  on three hills — Slovan's badge; Olimpija wear green/white Puma 2026/27).
  His July 2026 Olimpija transfer is real, but his UCL registration and
  this cutoff both remain Slovan. The manifest warning + identity-evidence
  record were corrected 2026-10-18.

| Piece | State |
|---|---|
| `assets/public-13.29.js` (renamed from 13.28) | HERO_ART filled (33 entries, roster order, kit-audit notes); header comment updated |
| `assets/public-13.25.css` (renamed from 13.24) | `.hero-art img` retuned for square sources: `height:66%; max-height:340px` + soft bottom fade (`mask-image`, first 15%) — was 82%/400px tuned for the retired 2:3 contract |
| `assets/hero/players/README.md` | Rewritten to the REAL contract (UEFA collection, 512×512 webp, manifest provenance; the 1024×1536 generated-PNG pose-library contract explicitly retired) + §3 kit-verification record |
| `assets/players/uefa/manifest.json` + `scripts/uefa-player-portraits/identity-evidence.json` | Šporar kit warning corrected (false alarm); Ueda warning kept (accurate) |
| Version triplet | `package.json` 13.121.0.0 · `src/config.ts` `13.121-portraits` · asset renames — `check-version-sync` green |
| `assets/_headers` | 13.29/13.25 immutable pins; NEW `/players/uefa/*` = `max-age=86400` (not immutable — the pipeline may re-shoot under the same filename) |
| `assets/sw.js` | CACHE v30 → v31 |
| `src/pages/public.ts`, `src/seo/page-shell.ts`, `src/seo/markup.ts`, `src/seo/router.ts` | asset refs + comments; page baselines re-frozen via `check-admin-parity --update` |
| Pins | `check-stats.js`: the "HERO_ART ships EMPTY" pin FLIPPED to the real-mapping pin set (every src resolves on disk, 33 entries, FD-name keys incl. non-ASCII legal spellings, `alt:""`, poseId dropped, deferred teams absent, kit-mismatch team excluded + Šporar keep verified); README real-contract pin; square-retune+fade CSS pin; `/players/uefa/*` header pin. `check-scheduler.js`: cache-bust pin 13.29 |
| `package-lock.json` | Re-synced (the portraits session bumped sharp without regenerating the lock — fresh-clone `npm ci` failed) |
| CHANGELOG | `[13.121-portraits]` entry (33 portraits, kit-audit story) |

**Verified locally (browser, Agent Browser + VLM reviews, previous session):**
- Artwork flanks render >900px for a mapped pair (Barça–Bayern fixture), both
  figures 214×214 at 1920/1440, 211px at 1024; hidden ≤900px (860px probe:
  layer `display:none`).
- Both themes (dark + light `#DCEBFA`), fa/RTL + en/LTR — home/away figures
  follow their sides via logical properties (measured, not assumed).
- Mixed states: single-side mapped (Porto figure / Villa crest-only) and
  unmapped-both (crest-only, no `has` class, src-less imgs hidden).
- No CLS from the artwork (A/B mapped vs unmapped: 0.034 vs 0.018, no shift
  source references `.hero-art`; the layer reserves nothing). Reduced-motion:
  the artwork layer has NO animation by construction; the pinned
  reduced-motion CSS block covers the ambient layers.
- VLM review findings across 4 states: one real critique (hard crop line at
  the figure bottom) → fixed with the mask fade; all states re-reviewed
  clean.
- `npm test` exit 0 (tsc clean), portraits gate 37/37;
  `seo:check --local` **56/0**.

## B. Owner gates — ANSWERED 2026-10-18 (evening)

1. **UEFA rights — GO.** The owner re-confirmed the portraits are already
   pushed to the public repo (`assets/players/uefa/`, commit `44e9906`) and
   instructed: push, deploy, verify live. The standing rights caveat remains
   documented (`docs/assets/uefa-player-portraits.md` §7 + manifest `rights`)
   — the empty-mapping fallback stays one revert away.
2. **Team coverage — CONFIRMED.** More pictures and clubs are being added
   (owner, ongoing). The mapping architecture is additive: a new club is one
   `HERO_ART` line keyed by its FD name (spellings verified live via the FD
   API) + a pin-count bump.
3. **Kit mismatches — RULE: NONE ALLOWED.** One player gave a kit mismatch
   (Ueda/Lille — excluded). Šporar verified clean (see §A). 
4. **Deferred players** (Jackson/Aston Villa + Thauvin/Lens): unchanged —
   re-check mid-season via `cli.js fetch --refresh` then
   `npm run portraits:normalize && npm run portraits:validate`.

## C. Deploy + live verification — DONE 2026-10-18 (all green)

1. `git fetch origin` (owner uploads directly to main; no divergence) →
   pushed `d45e2d8 → bb3c791` (redact `60a1a4a` + release `bb3c791`).
2. `npx wrangler deploy` — 5 changed assets uploaded (13.29/13.25/sw/manifest/
   README), worker version `69775023-…`, both cron triggers intact.
3. **Live verification results** (https://sportsignal.ir):
   - Homepage 200, version **13.121-portraits** in the served HTML;
     script/css refs = `/public-13.29.js` + `/public-13.25.css` (both 200).
   - Portrait URLs 200 (spot-checked Dembélé/Yamal/Šporar/Ueda webp).
   - `npm run seo:check` (live) → **56/0 PASS**.
   - **Hero renders on real match data**: the featured fixture is
     PSG–Barcelona (2026-10-20) — BOTH sides mapped. Verified in a real
     browser: `.hero-art.has` with both figures 214×214 @1920px dark/fa-RTL
     (Dembélé home/right, Yamal away/left — sides follow logical
     properties), 211px @1024px; `display:none` @860px (≤900px rule);
     light theme + en/LTR verified (both figures, no console errors);
     VLM review confirms likenesses/kits/soft-fade, no glitches.
   - Live `public-13.29.js` carries exactly 33 `/players/uefa/` entries;
     no `Lille OSC` key, no mismatch notes.
4. **Ops observation (self-healed, ~10 min window):** the homepage HTML is
   held in the worker's `caches.default` (internal key, query-independent,
   `SEO_PAGE_TTL` 900s hold) which **survives redeploys** — so for ~10 min
   post-deploy the edge served the old HTML referencing the now-404ing
   `public-13.28.js`/`public-13.24.css` (fresh visitors saw an unstyled
   page; it self-healed when the hold expired). Future rename-releases
   should either upload one-TTL alias copies of the old asset names or
   accept/document the window. (Zone purge via API was attempted with the
   session token — it lacks the purge permission.)
5. Handoff retired (this document); session worklog appended.

## D. Development environment notes (carried from the sessions)

- Repo: `/home/z/SportSignal` (main).
- Local worker: `bash /home/z/hero-dev/reseed.sh <mode>` — recreates the KV
  seed AND restarts wrangler dev on :8787. Modes:
  upcoming|soon|live|finished|postponed|passed|single|unmapped|empty.
  Needs `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` in the calling env
  (the [ai] binding is remote in dev; its remote-preview warning is
  non-blocking — AI is fail-open and unused by the hero path).
- Dev gotchas: miniflare persists `caches.default` in `.wrangler/state/v3/cache`
  across restarts (reseed wipes it); `/api/public-matches` sends
  `Cache-Control: max-age=60` (a reseed's fixture is invisible to a browser
  for up to 60s — reload in a FRESH session or wait); wrangler dev snapshots
  the assets table at startup (restart to pick up asset file edits);
  `/api/status` needs admin auth (probe `/` instead).
- Sandbox preview at :3000: `next.config.ts` after-files catch-all rewrite →
  :8787; `/api/preview` strips CSP `frame-ancestors`; `/` is a full-viewport
  iframe. Browser verification sessions should use a FRESH agent-browser
  session per state (cache layers: SW CacheStorage, browser HTTP cache with
  immutable pins).
- Suite expectations after this release: `npm test` exit 0; portraits gate
  37/37; `seo:check` 56/0.
- **Standing security reminder:** rotate the Telegram bot token + the
  Cloudflare tokens exposed in the 2026-10-13 history doc (redacted in-tree;
  git history still carries them until the owner rewrites/rotates).
