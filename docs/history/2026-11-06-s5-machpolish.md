# 2026-11-06 — SEO/GEO Phase-2 Session 5: meta/machine polish (SS-10, SS-11, SS-15, SS-16, SS-17, SS-18; SS-19 decided)

Session scope per `docs/SPORTSIGNAL_SEO_GEO_SPEC_PHASE2.md` §4 (S5). This
note carries each checkpoint's live evidence; the close-out digest is at
the bottom. (Wall-clock note: the session's deploys were executed
2026-11-05 ~13:33–13:57 UTC. The session was interrupted immediately
after the v13.223 deploy — commit + push + deploy all landed, but the
verification gate and docs had not — and was completed by a continuation
session on a fresh clone 2026-11-05 ~16:00–16:30 UTC: nothing was
reimplemented, no code changed after `5365227`, and the verification
evidence below is that continuation's. The repo's session dating stays
monotonic with the S4 note.)

## CP1 — SS-10 + SS-11: the ≤65 title / ≤165 description sweep (v13.222-titlesweep)

Commit `9b39faa` (tag v13.222-titlesweep), deploy
`6e76ebd6-3094-4b2f-8fa9-ca8a768e0fc9`. Server-side only — no client
asset changed, NO CONTENT_VERSION bump (title/meta assembly only — the
v13.213/v13.214 precedent).

What shipped (spec §3/SS-10 + SS-11):

- **SS-10** — the match-title trim ladder gains its final guard: after
  the SS-27 D3 steps (drop Gregorian parens → drop brand → shorten
  competition, trailing words first) a still-over-65 title drops the
  COMPETITION clause entirely — teams + Shamsi date is the irreducible
  unique core, and the date token keeps a pairing's legs distinct. The
  audit's 13 titles of 66–74 chars were already gone at SS-27; this
  makes ≤65 structural. The >75 seo-check backstop reports the
  impossible residual.
- **SS-11** — the match meta description rides a ≤165 trim ladder:
  `matchAnswerSentence` gains `opts.noVenue` (drop the STADIUM clause
  first; the UTC clause never drops — timezone honesty outranks
  length), then a word-boundary ellipsis trim that never cuts mid-word
  and strips a trailing sentence separator before the … (never «.…»).
  The visible answercard + SportsEvent description keep the FULL
  sentence — only the meta/og/twitter description consumes the trimmed
  text; team/comp/hub descs verified already ≤165.
- seo-check: NEW **REPORT mode** (report() + the T-12 summary's
  «(+N reports)» line) + **T-23** — the FULL-sitemap sweep: title >75
  FAIL backstop / 66–75 REPORT (the SS-10 pixel-risk band), desc >165
  FAIL + <50 FAIL (SS-11), full-sweep title uniqueness (T-03's sampled
  check hardened).

### Evidence (live, after deploy 6e76ebd6; verified in the continuation session with both CPs live)

- `npm test` → exit 0 (2,604 OK at the commit's local run; 2,605 after
  CP2's new assertions — re-verified end-of-session on the fresh clone).
- `npm run seo:check` vs production → **PASS 255 / FAIL 0**, including:
  - ✓ all 279 swept titles ≤ 65 chars (**max 65**) — zero pixel-risk
    band titles (SS-10)
  - ✓ all 279 swept meta descriptions 50–165 chars (**max 165**) (SS-11)
  - ✓ all 279 swept titles unique (full-sitemap uniqueness)
- Live sample: `/matches/leeds-united-vs-tottenham-2026-11-07` title
  «لیدز – تاتنهام | لیگ برتر انگلیس، ۱۶ آبان | SportSignal» (55 chars),
  description 160 chars with the UTC clause intact («زمان جهانی این بازی
  12:30 UTC است.»).

**SS-10 + SS-11 status: VERIFIED.**

## CP2 — SS-15 + SS-16 + SS-17 + SS-18: machine polish (v13.223-machpolish)

Commit `5365227` (tag v13.223-machpolish), deploy
`ca1663f8-365d-49a0-8c32-a2365ef6a5be` (the live deployment). 
Server-side only — machine files, JSON-LD and response headers (NO
CONTENT_VERSION bump, the v13.213/v13.214 precedent; no client asset
changed).

What shipped (spec §3/SS-15…SS-18):

- **SS-15** — `SportsEvent.image` = `[absUrl("/og/match-<slug>.png"),
  absUrl(SEO.OG_DEFAULT_IMAGE)]` — the same art the page's og:image
  carries, the site default as the fallback shape (schema.org accepts
  an array; consumers use the first usable entry). The slug derives
  from `matchPath` — no new data, no fetching.
- **SS-16** — feed.xml entry `<updated>` honesty: `buildFeed`
  (`src/seo/files.ts`) reads the `seo_lastmod_v1` per-URL map (READ/
  reuse ONLY — one bounded KV read, NO new write path, rule §1.4;
  `buildFeed` never calls `computeLastmods`); a map-miss falls back to
  the data epoch (the slim pool rows carry no per-match change
  timestamp). The feed-level `<updated>` stays the epoch. Two no-change
  builds now emit IDENTICAL entry values (the old code restamped every
  entry with `ctx.fetchedAt` per build — the F-05 class).
- **SS-17** — every calendar.ics VEVENT gains `DTEND = DTSTART + 2h`
  with the assumption documented at the line (the provider carries no
  end times; football runs ~1h45–2h+ with stoppage; machine dates stay
  ISO 8601 UTC basic, rule §1.3).
- **SS-18** — EVERY `/admin` response carries
  `X-Robots-Tag: noindex, nofollow` via ONE wrap at the `api.ts` fetch
  entry (`new Response(res.body, res)` + `headers.set`):
  login/logout/change-password/401/405/ops all inherit, handlers
  untouched (rule §1.7); robots.txt `Disallow: /admin` stays; the SEO
  router never sees `/admin` (bails on the prefix).
- seo-check: T-23 grows the SS-15 assertion + NEW **T-24** (feed
  `<updated>` == same-URL sitemap lastmod — the deterministic SS-16
  crosscheck with the cache-race caveat in the message; VEVENT
  DTEND == DTSTART+2h; /admin/login + /admin + unknown /admin path all
  carry X-Robots-Tag).

### Evidence (live, after deploy ca1663f8; verified in the continuation session)

- `npm test` → exit 0 (**2,605 OK** / 0 fail, on the fresh clone).
- **SS-15** — `/matches/leeds-united-vs-tottenham-2026-11-07` JSON-LD:
  `"image":["https://sportsignal.ir/og/match-leeds-united-vs-tottenham-2026-11-07.png","https://sportsignal.ir/og/default.png"]`.
  seo:check: ✓ all 166 swept match pages carry the per-match OG in
  SportsEvent.image + ✓ 5 sampled per-match OG PNGs all answer 200
  image/png.
- **SS-16** — manual crosscheck (curl): feed entry
  `/matches/ac-milan-vs-ferencvarosi-tc-2026-11-05` `<updated>` ==
  the same URL's sitemap lastmod `2026-11-05T10:52:50.734Z` (exact);
  `/matches/1-fsv-mainz-05-vs-bayern-munich-2026-11-07` ==
  `2026-11-04T19:46:00.943Z` (exact); the feed-level `<updated>` stays
  the data epoch. seo:check: ✓ all 27 feed entries' `<updated>` match
  their sitemap lastmod (+ a non-fatal REPORT: 1–2 entries on the
  map-miss data-epoch fallback — the documented honest fallback; the
  count drifts with the live pool).
- **SS-17** — `/calendar.ics`: `DTSTART:20261105T174500Z` /
  `DTEND:20261105T194500Z` (+2h exact). seo:check: ✓ all 87 VEVENTs
  carry DTEND = DTSTART + 2h.
- **SS-18** — `curl -I`: `/admin` (HTTP 200), `/admin/login` (401 on
  HEAD / 302 on GET — every auth-state shape) and `/admin/zzz-unknown`
  (401) ALL carry `x-robots-tag: noindex, nofollow`; `robots.txt` still
  carries `Disallow: /admin`. seo:check: ✓ all three admin paths
  asserted.
- `npm run seo:check` vs production → **PASS 255 / FAIL 0 / REPORTS 1**
  (243 at S4; +12 = T-23's new sweep assertions + T-24's).

**SS-15 + SS-16 + SS-17 + SS-18 status: VERIFIED.**

## SS-19 — 410 for retired team pages: SKIPPED (the spec's own fallback)

The spec: prefer 410 Gone "IF it adds no KV read on the 404 path; else
keep plain 404. Do not add per-404 KV reads." Analysis on the live
code: `buildTeamPage` decides `notFound` from the CURRENT pool
(`findTeamBySlug(ctx, slug)` — no extra read), and `getSeoCtx` carries
no historical followed-team data. The only honest way to know a slug
was once followed (and is now "retired" rather than never-existed) is
the 365-day seo archive — i.e. a NEW KV read on the 404 path, exactly
what SS-19 forbids. A static in-code retired list would go stale the
moment the bot's followed-set changes (invented data, rule §1.1). 
Decision: keep the SS-12 plain 404 (already VERIFIED — full shell +
noindex, pure render, no KV on the 404 path).

## S5 close-out

All six session items VERIFIED live: SS-10 + SS-11 (v13.222-titlesweep
— the ≤65/≤165 sweep over the full sitemap, word-boundary desc trim
with the UTC clause never dropping), SS-15 + SS-16 + SS-17 + SS-18
(v13.223-machpolish — per-match SportsEvent.image, feed lastmod
honesty, ics DTEND, /admin noindex). SS-19 skipped per the spec's own
fallback (no honest classification without a 404-path KV read). Two
deploys (6e76ebd6 → ca1663f8). npm test 2,604 → 2,605; seo:check
243 → 255 assertions, all green. Deviations from the session plan:
none (SS-19 was optional and its skip is the spec-sanctioned outcome).

Recovery note: the session was interrupted immediately after the
v13.223 deploy. The continuation session — fresh clone, credentials
re-supplied by the owner — verified the deployed state end-to-end
(npm test 2,605 OK; seo:check 255/0; per-item curl acceptance for all
six items) before writing this note and updating the tracker. No code
changed after `5365227`; remote main was already at `5365227` with both
tags pushed (`git ls-remote` verified).

Operational notes for S6:
- The cold-render 503 class has a THIRD recorded shape: the new T-23
  full-sitemap sweep fetches all ~279 URLs, and distant-future fixtures
  (the whole 2026-12-19 matchday) that had NEVER been rendered answer
  Cloudflare **error 1102** (worker exceeded CPU) on the first hits —
  up to 3–4 retries spaced 15–20 s before the render completes and
  caches. The first end-of-session seo:check run failed 5 assertions on
  exactly this class; after warming the listed URLs (spaced retries)
  the re-run was 255/0. NOT a regression — the same pages render 200
  once warm. When T-23 fails with 503/1102s, warm the listed URLs and
  re-run before debugging.
- The T-24 map-miss REPORT (feed entries falling back to the data
  epoch) is expected and non-fatal by design; its count can drift
  (1–2) with the live pool.
- `check-hero-carousel.js` fixed epoch is NOW=2026-11-30T12:00:00Z
  (the S4 bump) — the S6 session must check it hasn't expired before
  the final test run (the expiry/bump rule is documented at the
  constant).

Next (S6, per spec §4): **SS-20** (home mobile LCP — the lighthouse
harness before/after), SS-21–26 OWNER_TODO refresh, **final
full-sitemap sweep** (the audit's method, fresh evidence), the Phase-2
section in `SEO_IMPLEMENTATION_REPORT.md`, the program close-out note.
