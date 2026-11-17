# SEO Program Session 10 — Internal Linking and Navigation Relationships

> Agents: read AGENTS.md in the repo root first, and follow it for this whole task.

- **Date:** 2026-11-17
- **Version shipped:** `13.266.0-internallinks` (`package.json` `13.266.0.0`)
- **Live before:** `13.265.0-competitions` (Session 9, deployment `fc07b557-8f7e-4408-859d-5901e9ac9cbf` @100%)
- **Status:** Completed / deployed (versioned). The KV quota was healthy at deploy (it had reset at UTC midnight — `ok:true` + `pool_matches:324`).

## 1. Objective and scope

The internal-linking + navigation session of the 15-session SEO program: the
cross-page link graph refinement (tile order, anchor wording per the
cannibalization checklist — keyword map §3 + the route plan §2.3/§10 +
MASTER-SEO-SPEC §9). Sessions 1-9 produced the audit, the validated keyword
map, the approved architecture blueprint, the deployed crawl/index foundation
(C1/C6/C8 live), the match-URL lifecycle mechanism (INERT), the homepage
one-month window + carousel crawlability + curated-selection promise, the
match-detail footer-hook team-link gating + the metadata audit, the
selected-club team-page @graph WebPage node, and the competition-page @graph
CollectionPage node.

The Dec 4-8 measurement freeze applies to the GSC-measured surfaces (all
title/H1 bytes + the team-name spellings + the date-hub empty-state copy on
/matches/tomorrow). Anchor text in `<a href>` link text is NOT a GSC-measured
surface (it's not in the SERP snippet) — but the visible link text IS
user-facing, so any anchor change is diff-verified + recorded in DECISIONS.md.
Session 10's work is markup-only (anchor text + tile order + link placement per
the route plan §10) — safe under the freeze.

## 2. Findings (the cross-page internal-link graph traced — Task 1-audit)

The audit (read-first, no code) traced every cross-page link surface. Every
internal link is a crawlable `<a href>` (no JS-only navigation, no `href="#"`
placeholders in the tile grids):

- **The homepage (S6):** the hero-card anchor (`router.ts` `heroHref = nextBig
  ? esc(M.matchHref(nextBig.s)) : "#"` — the `#` fallback only when nextBig is
  null + the card is `display:none`) + the sr-only carousel nav
  (`carouselNavHtml` emits `<a href>` per slide when ≥ 2 heroMatches) + the
  curated-selection promise sr-only paragraph. The homepage boxes (liveCard,
  topspotCard, uclSpotCard, weekCard, finishedCard) render match tiles via
  `spotItemHtml`/`mrowHtml` → crawlable `<a href="/matches/...">`. The
  standingsCard + cupsCard render plain text (no team/competition anchors — see
  S10-2).
- **The match detail page (S7):** the footer-hook «تیم‌ها» line gates team
  links on `isSelectedTeam` (selected → `<a href="/teams/...">`; non-selected
  → plain `esc(faName(t))` text; BODY-ONLY, the byte-frozen `<head>` untouched)
  + the competition link (`<a href="/competitions/...">` in the facts table +
  the footer-hook) + the date links (the footer-hook's «بازی‌های امروز» →
  `/matches/today`, «بازی‌های این هفته» → `/matches/this-week`, «همه بازی‌های
  بزرگ» → `/matches`).
- **The team page (S8):** the upcoming-matches block (`dateGroupedRows` →
  `mrowHtml` → crawlable `<a href>` match rows) + the standings-window
  `.stmore` link («جدول کامل <compFa> ↗» → `/competitions/...`) + the
  related-matches card (`simCard` via `mrowHtml`).
- **The competition page (S9):** the upcoming-matches block
  (`dateGroupedRows`) + the full standings table (`fullStandings`, one
  cache-only KV read, fail-closed).
- **The `/teams` + `/competitions` index pages (SS-13):** the tile grids +
  the `linkItemList` JSON-LD consume the SAME `entries` array (the
  visible==machine contract — the tile order mirrors the ListItem positions).
- **The date hubs:** the `hubTiles()` shortcut grid (all 4 sibling hubs:
  today/tomorrow/this-week/this-weekend) + the `dateGroupedRows` match list +
  the breadcrumb (home → بازی‌ها → crumb).
- **The breadcrumbs (every page):** `M.breadcrumbsHtml(trail)` + the JSON-LD
  `JL.breadcrumbNode(trail)` on every page class (match/team/competition/hub/
  teams-index/competitions-index/matches-hub). The homepage (root) + 404 are
  the exceptions.

The anchor wording is already aligned with the destination page's H1 intent:
the `/teams` tile carries the team name (`seoTeamFaName(e)` — e.g.
«بارسلونا»); the `/competitions` tile carries the competition faName (e.g.
«لیگ برتر انگلیس»); the match-page facts-table competition link carries
`<compFa>`; the team-page `.stmore` link carries «جدول کامل <compFa> ↗». No
anchor-wording change needed this session (the wording matches the spec §9
examples).

The cannibalization checklist (keyword map §3 — the 7 resolved overlaps) is
NOT worsened by the tile-ordering change: the selected-clubs-first sort does
not create a new overlap or worsen a resolved one — the tiles point to the
same URLs in a reordered sequence; the homepage-vs-matches rule is unaffected
(the tiles point to team pages, not /matches).

**The ONE spec §9 gap the audit surfaced:** the homepage does NOT link
directly to `/teams/<slug>` or `/competitions/<slug>` (spec §9 lists "Homepage →
... selected competition sections and selected team pages"). Closing this gap
is a "link placement" change (in-scope per route plan §10) but touches the
shared homepage standings/cups renderers (`markup.ts`) with visual
side-effects — documented as a Session 11+ follow-up (decision S10-2), NOT
changed this session (the route plan §2.3 named the tile ordering as "the ONE
explicit Session 10 decision"; closing the homepage gap is a broader change
that deserves its own scoped pass).

## 3. Files changed

### Modified (runtime)
- `src/seo/pages.ts` — `buildTeamsIndexPage` gains a selected-clubs-first sort
  comparator on the `teamsIndex(ctx)` return (the ONE explicit S10 decision).
  The sort puts the 13 selected clubs (`isSelectedTeam ? 0 : 1` → `sa - sb`
  delta) before the non-selected pool teams, with the chronological-by-next-
  kickoff tiebreaker WITHIN each group. The sort rides in the PRESENTATION
  layer (buildTeamsIndexPage), NOT in `teamsIndex` itself — the Session 4 C1
  law (`check-seo-crawlindex.js`) requires `teamsIndex` to generate BOTH sides
  unfiltered (the sitemap `teams.xml` filter + the team-page indexable rule
  apply `isSelectedTeam`; `teamsIndex` stays the raw chronological generator
  that powers the `/teams` tiles for ALL teams so the noindex stays
  crawlable). The visible==machine contract holds (both the tile grid + the
  linkItemList consume the same sorted `entries` array — SS-13).

### Modified (tests)
- `scripts/check-seo-internallinks.js` — NEW. 9 offline gates: (1) the
  buildTeamsIndexPage selected-clubs-first sort (the S10 decision); (2) the
  C1-regression assertion (teamsIndex itself must NOT reference
  isSelectedTeam — the Session 4 invariant holds); (3) the /teams index
  visible==machine contract (SS-13); (4) the /competitions index
  visible==machine contract; (5) crawlable `<a href>` in the team-page +
  competition-page + date-hub match lists (dateGroupedRows); (6) the
  hubTiles() cross-hub nav (all 4 sibling hubs); (7) the breadcrumb discipline
  (every page class carries a trail); (8) the S7 footer-hook team-link gating
  regression pin; (9) the S6 homepage hero-card anchor regression pin. Wired
  into the `npm test` chain after `check-seo-competitionpages.js`.
- `scripts/s10-internallinks-smoke.ts` — NEW. A seeded tsx render harness: a
  SeoCtx with 4 upcoming matches (each one selected club vs one non-selected
  club, ascending dates) renders the `/teams` index + the `/matches/this-week`
  hub + the `/matches/arsenal-vs-juventus` match page and asserts: (1) the 13
  selected clubs come first in the rendered tile order (arsenal, barcelona,
  chelsea, bayern-munich); (2) the non-selected clubs follow in chronological
  order (juventus, roma, lazio, torino); (3) the tile href order == the
  linkItemList JSON-LD url order (visible==machine, SS-13); (4) 8 crawlable
  `<a href="/teams/...">` tiles, no `href="#"`; (5) the hub renders ≥4
  crawlable `<a href="/matches/...">` match rows + the hubTiles cross-hub nav
  + the breadcrumb; (6) the match-page footer-hook links Arsenal (selected) as
  `<a href="/teams/arsenal">` + does NOT link Juventus (non-selected) — plain
  text only (the S7 gating); (7) the match-page competition + date links +
  breadcrumb. **29/29 assertions pass.**
- `scripts/check-stats.js` — the version-sync pins ride forward to
  `13.266.0-internallinks` + the new `check-seo-internallinks.js` existence +
  the test-chain regex (the VERSION + CHANGELOG assertions update to
  `13.266.0-internallinks`).

### Modified (docs + version)
- `src/config.ts` — `VERSION` `13.265.0-competitions` → `13.266.0-internallinks`.
- `package.json` — `version` `13.265.0.0` → `13.266.0.0`; the `test` script
  chain gains `&& node scripts/check-seo-internallinks.js`.
- `CHANGELOG.md` — the `# v13.266.0-internallinks` entry (the session's
  narrative).
- `docs/HANDOFF.md` — rewritten for Session 10.
- `docs/DECISIONS.md` — S10-1 (the tile ordering — the ONE explicit decision),
  S10-2 (the audit findings — the homepage → team/competition spec §9 gap
  documented as a Session 11+ follow-up), S10-3 (the freeze-coordination: the
  tile ordering is markup-only + the Dec 4-8 freeze holds), S10-4 (the KV
  quota healthy at deploy — the S10 data-surface self-verify is COMPLETE).
- `sportsignal-seo-implementation/IMPLEMENTATION-TRACKER.md` — the Session 10
  row (Completed / deployed).
- `seo-implementation/session-reports/SESSION-10.md` — this file.
- `seo-implementation/next-session-prompt.md` — the Session 11 start prompt
  (Persian entity naming/metadata polish).

### No client asset changed
SW stays `sportsignal-v126`; the client bundle stays `public-13.80.js`; the
stylesheet stays `public-13.87.css`. The change is server-side-only (the
RUNBOOK §2 rule) — the tile-ordering sort renders server-side in the
`buildTeamsIndexPage` HTML; no client asset renamed.

## 4. The implementation decisions

- **S10-1 — the `/teams` index tile ordering: the 13 selected clubs surface
  FIRST (the ONE explicit Session 10 decision — route plan §2.3 + §10).** The
  call is YES. `buildTeamsIndexPage` sorts the `teamsIndex(ctx)` return so the
  13 selected clubs lead the tile grid + the linkItemList JSON-LD, with the
  chronological tiebreaker within each group. Cosmetic only (the non-selected
  tiles stay — the crawlability law); zero KV cost (in-memory isSelectedTeam
  check). The sort rides in the PRESENTATION layer (buildTeamsIndexPage), NOT
  in `teamsIndex` itself — the Session 4 C1 law requires `teamsIndex` to
  generate BOTH sides unfiltered. Verified by the new `check-seo-internallinks.js`
  (9 gates) + the seeded tsx render harness (29/29 assertions) + live (the
  `/teams` index renders 87 tiles with the 13 selected clubs leading + the
  linkItemList numberOfItems=87 mirrors the tile order).
- **S10-2 — the audit findings: every surface verified crawlable; the homepage
  → team/competition spec §9 gap documented as a Session 11+ follow-up.** The
  cross-page internal-link graph is crawlable + the anchor wording is aligned.
  The ONE gap: the homepage does not link directly to `/teams/<slug>` or
  `/competitions/<slug>` (spec §9 lists them). Closing it touches the shared
  homepage standings/cups renderers with visual side-effects — documented as a
  Session 11+ follow-up, NOT changed this session (the route plan §2.3 named
  the tile ordering as "the ONE explicit Session 10 decision"; the homepage
  gap is a broader change that deserves its own scoped pass).
- **S10-3 — the freeze-coordination: the tile ordering is markup-only + the
  Dec 4-8 freeze holds.** The teamsIndex sort reorders tiles, not the page's
  title/H1/description/answer (the `/teams` index title/H1 are unchanged). The
  anchor text in the tiles is the team name (unchanged). The linkItemList
  JSON-LD is machine-readable (invisible to the SERP snippet). The byte-frozen
  surfaces (competition/team/match/homepage title/H1 + the date-hub
  empty-state copy) are all untouched. Safe under the freeze.
- **S10-4 — the KV read quota: healthy at Session 10 deploy (the S10
  data-surface self-verify is COMPLETE).** Live `/healthz` at Session 10 deploy
  (2026-11-17 01:10 UTC): `ok:true` + `pool_matches:324` + `kv_writes_day:72`
  + `degraded:false`. The KV quota had reset at UTC midnight (early UTC). The
  S10 data-surface self-verify is COMPLETE: the `/teams` index renders 87 real
  tiles with the 13 selected clubs leading + the linkItemList JSON-LD
  numberOfItems=87 mirrors the tile order (visible==machine). The S10 change
  has zero new KV reads (in-memory isSelectedTeam check). The owner should
  continue to investigate the read-source (the quota gets exceeded DAILY
  during peak traffic); a Workers Paid plan ($5/mo → 1M reads/day) remains the
  durable fix.

## 5. Tests

- `npm test` exit 0. **Baseline 3,694 OK → 3,704 OK** (the +10 = the new
  `check-seo-internallinks.js` 9 gates + 1 summary line; `npx tsc --noEmit`
  clean).
- The new `check-seo-internallinks.js` standalone: 9/9 gates pass.
- The seeded tsx render harness (`scripts/s10-internallinks-smoke.ts` — a
  seeded SeoCtx with 4 matches: Arsenal/Juventus, Barcelona/Roma,
  Chelsea/Lazio, Bayern/Torino) renders the `/teams` index + the
  `/matches/this-week` hub + the `/matches/arsenal-vs-juventus` match page
  and asserts: the selected clubs lead the tiles; the linkItemList mirrors the
  tiles; crawlable hrefs; the hubTiles cross-hub nav; the S7 footer-hook
  gating (Arsenal linked, Juventus plain text). **29/29 assertions pass.**
- Local `wrangler dev` smoke (miniflare local mode): worker boots cleanly;
  `/healthz` 200 + version `13.266.0-internallinks`; `/teams` index renders
  the byte-frozen title «تیم‌های فوتبال دنبال‌شده — برنامه بازی‌ها | اسپرت
  سیگنال» + the empty-state on the local empty KV (correct — no data);
  `/matches/this-week` hub renders the hubTiles (all 4 sibling hubs) + the
  breadcrumb; `/competitions` index renders the byte-frozen title.

## 6. Deploy

Versioned deploy via the repo's established ritual (RUNBOOK §2): `npm test`
(exit 0) → local `wrangler dev` smoke (worker boots) → `npx wrangler versions
upload` (Version ID `12793863-ff39-49af-a5f7-e1cf0b5ccc28`) → `npx wrangler
versions deploy --version-id 12793863-ff39-49af-a5f7-e1cf0b5ccc28
--percentage 100 --yes` → live verify. **Deployed:
`12793863-ff39-49af-a5f7-e1cf0b5ccc28` (`13.266.0-internallinks`) @ 100%.**
Live `/healthz` confirms version `13.266.0-internallinks`. The deployment ID is
recorded in `docs/HANDOFF.md` + the tracker.

**Cloudflare budget of this change:** zero new KV reads (the isSelectedTeam
check is an in-memory Set membership lookup on data already in scope); zero
new KV writes (`kv_writes_day:72` at deploy — unchanged by the S10 change);
zero new subrequests; zero new fetches; zero render-cost additions (a
comparator function on an already-iterated array). Well within the free-tier
budget.

**Deploy-window check:** today is 2026-11-17 (the deploy landed at 01:10 UTC
2026-11-17) — NOT Nov 20 (the Bayern–Köln S27 auto-verify windows: kickoff
19:30 UTC, M1 ~19:35, M2 ~21:35-45 UTC; `sched_next_ko:
2026-11-20T19:30:00.000Z`). Safe to deploy.

**Live verify (2026-11-17 01:12 UTC):** `/healthz` version =
`13.266.0-internallinks` ✓; `ok:true` + `pool_matches:324` + `kv_writes_day:72`
+ `degraded:false` (the KV quota had reset at UTC midnight — healthy at
deploy). `/teams` index renders 87 tiles (13 selected + 74 non-selected) with
the 13 selected clubs leading: bayern-munich, manchester-city,
borussia-dortmund, chelsea, paris-saint-germain, arsenal, real-madrid,
barcelona, liverpool, manchester-united, ac-milan, internazionale-milano,
club-atletico-de-madrid — the 13 indexable team pages ✓; the linkItemList
JSON-LD `numberOfItems=87` + the first 4 ListItem urls
(`/teams/bayern-munich`, `/teams/manchester-city`, `/teams/borussia-dortmund`,
`/teams/chelsea`) mirror the tile href order (visible==machine, SS-13) ✓; the
byte-frozen title «تیم‌های فوتبال دنبال‌شده — برنامه بازی‌ها | اسپرت سیگنال»
unchanged ✓; `/competitions/premier-league` 200 + the byte-frozen title «لیگ
برتر انگلیس — برنامه بازی‌های بزرگ پیش‌رو | اسپرت سیگنال» + the CollectionPage
node (S9 unchanged) ✓. **The S10 data-surface self-verify is COMPLETE.**

## 7. The KV read quota (healthy at deploy; the daily-exceedance issue continues)

The account's 100,000 KV reads/day free-plan limit was exceeded at Session 5
close and at Session 6/7/8/9 close (it resets at UTC midnight but gets
exceeded again during the day). At Session 10 deploy (2026-11-17 01:10 UTC),
the quota had reset: `ok:true` + `pool_matches:324` + `pool_age_min:50`. The
S10 data-surface self-verify is COMPLETE (the `/teams` index renders 87 real
tiles with the selected clubs leading + the linkItemList mirrors). The S10
change has zero new KV reads (the isSelectedTeam check is in-memory), so it
cannot worsen the quota issue. The owner should continue to investigate the
read-source (the 10-min cron + public traffic + the bot may collectively
exceed 100K reads/day); the durable fix is a Workers Paid plan ($5/mo → 1M
reads/day).

## 8. Commit SHAs

- The code checkpoint: `dbf1afd` — `seo(s10): the /teams index tile ordering
  — the 13 selected clubs first (the ONE explicit S10 decision — route plan
  §2.3 + §10; the sort rides in buildTeamsIndexPage, the presentation layer)
  + the check-seo-internallinks.js gate + the s10-internallinks-smoke.ts
  render harness + version bump` (the buildTeamsIndexPage selected-clubs-first
  sort, the new check script, the seeded render harness, the version bump, the
  check-stats pins, the CHANGELOG entry, the report/tracker/handoff/decisions,
  the Session 11 prompt — one commit; ls-remote verified).

Recorded in `sportsignal-seo-implementation/IMPLEMENTATION-TRACKER.md`
Session 10 row after the push.

## 9. Unresolved risks / open follow-ups

- **The homepage → team/competition spec §9 gap (S10-2):** the homepage does
  not link directly to `/teams/<slug>` or `/competitions/<slug>` (spec §9 lists
  "Homepage → ... selected competition sections and selected team pages").
  Closing it is a "link placement" change (in-scope per route plan §10) but
  touches the shared homepage standings/cups renderers (`markup.ts`) with
  visual side-effects — a Session 11+ follow-up (the Persian/entity naming
  session or a dedicated internal-link pass).
- **The Dec 4-8 freeze:** the competition/team/match/homepage title/H1 bytes
  + the team-name spellings + the date-hub empty-state copy are byte-frozen.
  After Dec 4, with a fresh 16-month GSC export, apply the parked S2
  title-test winning pattern + decide the frozen-surface byte changes (S09-3,
  S08, S07-H2, S06-H2, S06-H3).
- **The KV read quota:** healthy at S10 deploy (the quota had reset at UTC
  midnight). Re-check at every session close until the owner resolves it
  (investigate the read-source or upgrade to Workers Paid).

## 10. Session 10 acceptance criteria (from the phase file)

- ✅ **Audit the internal-link graph (read-first, no code)** — the audit traced
  every cross-page link surface (the homepage hero card + carousel nav, the
  match-page footer-hook, the team-page upcoming-matches block + the standings
  window + the related-matches card, the competition-page upcoming-matches
  block + the standings table, the /teams + /competitions index tile grids +
  the linkItemList JSON-LD, the date-hub hubTiles() shortcut grid, the
  breadcrumbs). Every internal link is a crawlable `<a href>`. The anchor
  wording is aligned with the destination page's H1 intent.
- ✅ **The /teams index tile ordering (route plan §2.3 — the ONE explicit S10
  decision)** — decided YES: the 13 selected clubs now lead the `/teams` index
  tile grid + the linkItemList JSON-LD. Markup-only, zero KV cost, the
  non-selected tiles stay (the crawlability law). The sort rides in the
  presentation layer (buildTeamsIndexPage) so `teamsIndex` stays the raw
  unfiltered generator (the Session 4 C1 law).
- ✅ **The cannibalization checklist regression test (keyword map §3)** — the 7
  resolved overlaps are NOT worsened by the tile-ordering change (the tiles
  point to the same URLs in a reordered sequence; the homepage-vs-matches rule
  is unaffected).
- ✅ **The anchor wording discipline** — the anchor wording already matches the
  destination page's H1 intent (the /teams tile carries the team name; the
  /competitions tile carries the competition faName). No change needed.
- ✅ **The crawlability law (spec §5 + the C1 disposition)** — every internal
  link stays a crawlable `<a href>` (no JS-only navigation, no `href="#"`
  placeholders in the tile grids). The 74 non-selected team URLs keep their
  internal links (the noindex-must-stay-crawlable law).
- ✅ **The internal-link JSON-LD (visible==machine contract — SS-13)** — the
  /teams + /competitions index tile grids + the linkItemList JSON-LD consume
  the same `entries` array; the ListItem positions mirror the tile order
  exactly.
- ✅ **The breadcrumb discipline (spec §5 + P-17)** — every page carries a
  breadcrumb (home → section → page) via `M.breadcrumbsHtml` + the JSON-LD
  `breadcrumbNode`. Verified consistent + crawlable `<a href>` + agree with
  the page's H1.
- ✅ **Representative internal-link verification** — the seeded tsx render
  harness renders the `/teams` index + the `/matches/this-week` hub + the
  `/matches/arsenal-vs-juventus` match page and verifies every link is a
  crawlable `<a href>` pointing to the canonical URL (29/29 assertions pass);
  the live verification confirms the `/teams` index renders 87 tiles with the
  selected clubs leading + the linkItemList mirrors (visible==machine).

## 11. Handoff to Session 11

Session 11 owns the Persian entity naming/metadata polish (spelling-freeze-
aware — post-Dec-8 for frozen surfaces; the route plan §10). The
next-session prompt is in `seo-implementation/next-session-prompt.md`. The
standing constraints carry: the Dec 4-8 freeze; the Cloudflare free-tier
budget; the KV read quota (re-check at S11 close); the S10-2 homepage →
team/competition gap follow-up; do not start Session 12+ work in Session 11.
