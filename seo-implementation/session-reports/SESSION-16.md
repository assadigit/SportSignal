# SEO Follow-up Track Session 16 — Entity-Grounding Parity + Image Sitemap

> Agents: read AGENTS.md in the repo root first, and follow it for this whole task.

- **Date:** 2026-11-17
- **Version shipped:** `13.269.0-entity-image` (deployment `2481f840-b7da-4093-a4b7-db4c7888f90e` @100%).
- **Live before:** `13.268.0-perf-preconnect` (Session 14, deployment `a4cc2982-c6fa-493f-907b-e71d89c1f33f` @100%).
- **Status:** Completed / deployed + verified live. The first session of the SEO follow-up track (the data-independent, freeze-safe gap fixes — `docs/specs/seo-followup-track.md`).

## 1. Objective and scope

The first session of the SEO follow-up track — fix the gaps from the
`docs/audits/2026-11-17-seo-gap-and-swot-audit.md` that are NOT blocked on the
GSC/GA4 data (the site is fresh — GSC needs a few months; GA4 unavailable) AND
NOT blocked on the Workers Paid plan AND freeze-safe. Two milestones: the
entity-grounding parity (M1) + the image sitemap (M2).

## 2. The gap-audit corrections (3 of 18 gaps were verification errors)

During the S16 implementation, three gaps from the audit were re-verified + found
to be NON-gaps (the audit used English grep patterns on a Persian site + didn't
check the HTTP status code):

- **P1-3 (the visible breadcrumb) — NOT a gap.** The breadcrumb IS visible:
  `<nav class="crumbs" aria-label="مسیر صفحه">` (Persian aria-label). The audit's
  `grep aria-label="breadcrumb"` (English) missed the Persian aria-label.
- **P2-1 (the Cloudflare beacon on SEO pages) — NOT a gap.** The beacon IS on
  every SEO page (the page-shell.ts includes `beacon.min.js` with
  `send.to: /cdn-cgi/rum`; live-verified: 4 references on the match/team pages).
- **P3-1 (the `/teams.xml` soft-404) — NOT a gap.** `/teams.xml` returns HTTP 404
  (a correct 404 — the audit saw the HTML 404 page + misread it as a 200 soft-404).

These three are removed from the follow-up track.

## 3. S16-M1 — the entity-grounding parity (the P1-2 gap fix)

The match-page `SportsEvent` `homeTeam`/`awayTeam` `SportsTeam` nodes now carry
the same `TEAM_ENTITY_LINKS` `sameAs` (Wikipedia + Wikidata) as the team-page
`sportsTeamNode`. The `teamRef` function (`src/seo/jsonld.ts`) now looks up
`TEAM_ENTITY_LINKS[name]` + adds the `sameAs` — the same verified-map lookup the
team page uses. Pure static-map lookup (zero new KV-read/subrequest/CPU — rule
§1.5). Freeze-safe (a JSON-LD field — NOT a byte-frozen surface).

**Live-verified:** the match page `/matches/barcelona-vs-manchester-city-2026-12-08`
now emits `"sameAs":["https://en.wikipedia.org/wiki/FC_Barcelona","https://www.wikidata.org/wiki/Q7156"]`
on the homeTeam SportsTeam + `"sameAs":["https://en.wikipedia.org/wiki/Manchester_City_F.C.","https://www.wikidata.org/wiki/Q50602"]`
on the awayTeam SportsTeam (was bare before the deploy).

## 4. S16-M2 — the image sitemap (the P2-4 gap fix)

The sitemap entries now declare the page's image(s) to Google Image search via
the `<image:image>` extension (`xmlns:image`). The match pages declare their
specific per-match OG image (`/og/match-<slug>.png`); the team/competition/static
pages declare the site OG default (`/og/default.png`). Pure string concatenation
on the already-iterated rows — zero new KV-read/subrequest/CPU. Freeze-safe (a
machine-file extension).

**Live-verified:** `/sitemaps/teams.xml` carries 13 `<image:image>` entries +
the `xmlns:image` namespace; `/sitemaps/matches-upcoming.xml` carries 130
`<image:image>` entries (the per-match OG images, e.g.
`https://sportsignal.ir/og/match-bayern-munich-vs-1-koln-2026-11-20.png`).

## 5. The check gates + the test suite

- **`check-seo-entity-parity.js`** (7 gates): the teamRef sameAs, the
  sportsTeamNode parity, the TEAM_ENTITY_LINKS import, the homeTeam+awayTeam
  usage, the freeze-coordination (scoped to the teamRef body), the organizer
  contract intact.
- **`check-seo-image-sitemap.js`** (10 gates): the urlNode images param, the
  `<image:image>` emission, the xmlns:image namespace, the ogImageForPath per-match
  + default logic, the 4 builder call sites (matches/teams/competitions/pages),
  the freeze-coordination.
- **`npm test` exit 0 (3,757 OK)** = the 3,738 S14 baseline + 17 new S16 gates +
  2 parity. `npx tsc --noEmit` clean. The `check-stats.js` LIVE version pin
  updated (both the v13.258-mca11y pin + the v13.254-rankbadge pin) + the S16
  comment block. The `check-seo-performance.js` S14 version gate relaxed to
  accept version >= 13.268.0 (the preconnect shipped + is preserved through
  later versions).

## 6. Cloudflare budget

Zero new KV reads/writes, zero new subrequests, zero new Worker CPU, zero new
cron paths. The `sameAs` is a pure static-map lookup; the image sitemap is pure
string concatenation on already-iterated rows. The `/healthz` budget snapshot
unchanged (`ok:true` + `pool_matches:324` + `degraded:false`).

## 7. What I checked (verification)

- `npm test` exit 0 (3,757 OK; `npx tsc --noEmit` clean; the two new gates pass
  standalone).
- The local wrangler dev smoke (the worker boots, the homepage 200 + the
  preconnect present; `/healthz` 503 = the designed local-dev degraded state,
  NOT a 500/1101 error).
- The versioned deploy `2481f840-b7da-4093-a4b7-db4c7888f90e` @100%.
- The live `/healthz`: `version:13.269.0-entity-image` + `ok:true` +
  `pool_matches:324`.
- The live match-page SportsTeam `sameAs` (Barcelona→Q7156 + Man City→Q50602).
- The live image sitemap (13 `<image:image>` on teams.xml + 130 on
  matches-upcoming + the xmlns:image namespace + the per-match OG images).

## 8. Decisions

- **S16-1 — the entity-grounding parity (the P1-2 fix).** The match-page
  SportsTeam nodes now carry the same `sameAs` as the team-page SportsTeam.
  Freeze-safe (a JSON-LD field). Details in `docs/DECISIONS.md`.
- **S16-2 — the image sitemap (the P2-4 fix).** The `<image:image>` extension on
  every sitemap entry + the xmlns:image namespace. Freeze-safe (a machine-file
  extension). Details in `docs/DECISIONS.md`.
- **S16-3 — the gap-audit corrections (3 of 18 gaps were verification errors).**
  The P1-3 breadcrumb + the P2-1 beacon + the P3-1 `/teams.xml` are NOT gaps
  (the audit used English greps on a Persian site + didn't check the HTTP
  status code). Removed from the follow-up track.
