# SportSignal SEO Program — Session 10 Start Prompt (Internal Linking + Navigation Relationships)

Read AGENTS.md in the repo root first and follow it for the whole session.

You are the implementation agent for the SportSignal SEO project, Session 10 of 15: **internal linking and navigation relationships**. Sessions 1-9 produced the audit, the validated keyword map, the approved architecture blueprint, the deployed crawl/index foundation (C1/C6/C8 live), the match-URL lifecycle mechanism (shipped INERT), the homepage one-month window + carousel crawlability + curated-selection promise (deployed `13.262.0-homepage`), the match-detail footer-hook team-link gating + the metadata audit (deployed `13.263.0-matchlinks`), the selected-club team-page @graph WebPage node + the team-page content audit + the new `check-seo-teampages.js` gate (deployed `13.264.0-teampages`), and the competition-page @graph CollectionPage node + the date-hub/empty-state verification + the new `check-seo-competitionpages.js` gate + the seeded render harness (deployed `13.265.0-competitions`). This session turns to the internal linking + navigation relationships — the tile order, the anchor wording, the cross-page link graph per the cannibalization checklist (keyword map §3 + the route plan §10). The C1/C6/C8 foundation + the team-page WebPage node + the competition-page CollectionPage node are live; Session 10 owns the internal-link graph refinement (markup-only per the route plan §10).

## Step 0 — Credentials (supplied by the owner at session start; never commit them)

The owner provides per session: a GitHub classic token (repo push) and a Cloudflare API token + account ID (deploy). Use credentials only in the environment / one-shot push URL (`git push https://x-access-token:<token>@… main`), never in git config, files, commits, logs or reports. If something you need is missing, say so and proceed with what exists — never fabricate. **A fresh GSC export (ideally 16 months, with URL-level page samples and the queries×pages matrix) remains the program's top evidence request — for this session it would validate the internal-link anchor wording against the actual query surface + the cannibalization register's 7 resolved overlaps (time-hubs-vs-homepage, team-vs-UCL, team-vs-match, UCL-vs-today, homepage-vs-matches, team-vs-league, DFB-Pokal-vs-UCL). The Dec 4-8 freeze applies to the GSC-measured surfaces (all title/H1 bytes + the team-name spellings + the date-hub empty-state copy on `/matches/tomorrow`) — Session 10's internal-link work is markup-only (anchor text + tile order + link placement), which is safe under the freeze IF it does not touch the byte-frozen title/H1/description/answer-sentence bytes. Anchor text in `<a href>` link text is NOT a GSC-measured surface (it's not in the SERP snippet) — but the visible link text IS user-facing, so any anchor change must be diff-verified + recorded in DECISIONS.md.**

## Step 1 — Repository

- Repository: `https://github.com/assadigit/SportSignal` (verify the actual `git remote -v`; the owner also writes `assadigit/sportsignal` — same repo).
- Branch: `main` only. Session 9 closed with the code checkpoint (the competition-page @graph CollectionPage node + the `check-seo-competitionpages.js` gate + the `scripts/s9-competition-smoke.ts` seeded render harness + version bump) and the session close-out commit (run `git log --oneline -8` to confirm HEAD; the tracker's Session 09 row records the session's commits).
- Clone fresh, verify `git status` is clean, and confirm no uncommitted concurrent-agent work (if any exists: preserve it, isolate your changes, never reset/clean/force-push).
- Live production site: `https://sportsignal.ir` (Worker `ucl-notifier`, versioned deploys only). This session DEPLOYS if (and only if) it makes runtime changes — through the repo's established ritual only. **Current live: `13.265.0-competitions`, deployment `fc07b557-8f7e-4408-859d-5901e9ac9cbf` @100%** (= repo HEAD at Session 9 close-out). **NOTE: the account's KV read quota (100,000/day free-plan) was exceeded at Session 5 close and was STILL exceeded at Session 6/7/8/9 close — the pool/archive data persists but can't be read until the quota resets at UTC midnight. Verify the quota has reset before your live smoke; if still exceeded, the internal-link data surfaces (the rendered tiles with real match/team/competition hrefs) will be empty (this is a pre-existing infrastructure issue, NOT a code issue). The owner should investigate the read-source; a Workers Paid plan ($5/mo → 1M reads/day) is the durable fix.**

## Step 2 — Mandatory reading order (all in the repo)

1. `AGENTS.md` (repo root — the operating contract; sections 5-7 govern git/secrets/deploy)
2. `sportsignal-seo-implementation/README.md`
3. `sportsignal-seo-implementation/AGENT-INSTRUCTIONS.md` (the master execution contract)
4. `sportsignal-seo-implementation/PRODUCT-AND-SEO-STRATEGY.md` + `MASTER-SEO-SPEC.md` (§9 internal links — the cross-page link graph contract; §2 the page architecture; §8 titles/meta/on-page language)
5. `sportsignal-seo-implementation/GSC-AUDIT-BASELINE.md` (the per-class GSC rows — the internal-link weighting evidence)
6. `seo-implementation/architecture/ROUTE-AND-CANONICAL-PLAN.md` (Session 3: §10 sequencing — Session 10 = internal linking/nav, markup-only; §2.3 the `/teams` index tile ordering note; §5 the index-page dispositions)
7. `seo-implementation/architecture/INDEXABILITY-MATRIX.csv` (the per-route-class disposition — the internal-link graph must respect the indexable/noindex boundary)
8. `seo-implementation/keyword-research/KEYWORD-TO-URL-MAP.md` (§3 the cluster assignment rules + the 7-resolved-overlap cannibalization watchlist — the regression checklist for every anchor/tile change; §2.1-2.15 the per-class metadata plans)
9. `seo-implementation/session-reports/SESSION-09.md` + `SESSION-08.md` + `SESSION-07.md` (the inherited state — the competition-page CollectionPage node, the team-page WebPage node, the footer-hook team-link gating, the homepage changes)
10. `sportsignal-seo-implementation/IMPLEMENTATION-TRACKER.md` (progress source of truth)
11. `docs/RUNBOOK.md` §2 (the deploy ritual) — and re-check `docs/HANDOFF.md` for the current state (the KV quota issue + the Session 9 competition-page CollectionPage node + the S09 data-surface follow-up)

## Step 3 — Session 1-9 facts you must build on (verified; do not re-audit)

Architecture (Session 1, live-verified): Cloudflare Worker `ucl-notifier`, TypeScript, zero framework; SSR HTML from KV only (`getSeoCtx`: payload + pool + overlay); hand-rolled router (`src/seo/router.ts`); `npm test` = `tsc --noEmit` + 53 check scripts (baseline now **3,694 OK** — Session 9 added `check-seo-competitionpages.js`); versioned deploys (`npx wrangler versions upload` → `versions deploy --version-id <id> --percentage 100 --yes`); rollback via `npx wrangler rollback`.

The internal-link machinery you inherit (all verified):

- **The spec §9 internal-links contract (the cross-page link graph):**
  - Homepage → current featured match (the hero-card anchor + the sr-only carousel nav — Session 6).
  - Match detail → team pages (the footer-hook «تیم‌ها» line — Session 7: selected clubs get `<a href="/teams/...">`, non-selected clubs render as plain text; BODY-ONLY, the byte-frozen `<head>` untouched).
  - Selected team page → upcoming approved matches + competition pages (Session 8: the upcoming-matches block renders crawlable `<a href>` match rows; the standings window card links to the competition page).
  - Competition page → upcoming approved matches + team pages (Session 9: the upcoming-matches block renders crawlable `<a href>` match rows; the standings table is the full cached table).
  - The `/teams` + `/competitions` index pages → their child pages (the tile grids + the `linkItemList` JSON-LD — Session 3).
  - The date hubs → the matches hub + the sibling hubs (the `hubTiles()` shortcut grid).
  - The breadcrumbs on every page (home → section → page).
- **The cannibalization watchlist (keyword map §3 — the 7 resolved overlaps, the regression checklist for every anchor/tile change):** time-hubs-vs-homepage, team-vs-UCL, team-vs-match, UCL-vs-today, homepage-vs-matches, team-vs-league, DFB-Pokal-vs-UCL. Every anchor/tile change must NOT create a new overlap or worsen a resolved one.
- **The crawlability law (spec §5 + the C1 disposition):** every internal link is a crawlable `<a href>` (no JS-only navigation, no `href="#"` placeholders). A `noindex` page stays crawlable (linked from its index + sibling pages) so Google can read the directive. The 74 non-selected team URLs (noindexed in Session 4) KEEP their internal links from the `/teams` index tiles + the match-page footer-hook (the noindex-must-stay-crawlable law).
- **The `/teams` index tile ordering (route plan §2.3):** "Tile ordering may put the 13 selected clubs first — Session 10's call, cosmetic only." This is the ONE explicit Session 10 decision in the route plan.

Session 9's deployed changes (do not regress — verified by `check-seo-competitionpages.js`): the competition-page @graph CollectionPage node (`JL.collectionPageNode(path, "برنامه بازی‌های " + String(cNameFa), ctx.fetchedAt)` in `buildCompetitionPage`'s `jsonldNodes`). The competition-page title/H1/description/answer are byte-frozen through Dec 4-8. The `check-seo-competitionpages.js` 8 gates pin the CollectionPage node + the no-SportsEvent law + the byte-frozen title/H1 + the answer lead + the indexable rule + the crawlable links + the standings table + the @graph order.

Session 8's deployed changes (do not regress — verified by `check-seo-teampages.js`): the team-page @graph WebPage node. The team-page title/H1/description/answer are byte-frozen.

Session 7's deployed changes (do not regress): the footer-hook team-link gating on `isSelectedTeam` (BODY-ONLY, the byte-frozen `<head>` untouched). The match-page title/H1/description/answer funnel is byte-frozen through Dec 4-8.

Session 6's deployed changes (do not regress): `SEO.UPCOMING_DISPLAY_DAYS = 30` (the DISPLAY window); the hero-card SSR href + the sr-only carousel nav; the curated-selection promise sr-only paragraph; the title/H1 byte-frozen.

What NOT to touch: the isSelectedTeam predicate + the 13-club allowlist STAY (Session 4 decision); the non-selected team pages STAY noindex, follow (the C1 disposition); the teams.xml 13-row filter STAYS; the match-detail footer-hook team-link gating STAYS (Session 7); the team-page title/H1 bytes ARE byte-frozen through Dec 4-8 (Session 8); the competition-page title/H1 bytes ARE byte-frozen through Dec 4-8 (Session 9); the homepage title/H1 ARE byte-frozen (Session 6); the date-hub empty-state copy on `/matches/tomorrow` IS byte-frozen (the S06-H3 follow-up is post-Dec-4); avoid deploys in the Nov 20 Bayern–Köln S27 auto-verify windows (kickoff 19:30 UTC; M1 ~19:35, M2 ~21:35-45 UTC — check the date before you deploy); Cloudflare free tier is the budget (KV writes ~330/day of 1,000; ~50 subrequests/tick; the 10ms CPU cliff on cold renders — C7; the KV read quota (100,000/day) was exceeded at Session 5 close and STILL exceeded at Session 6/7/8/9 close — investigate before deploying; the Session 9 data-surface self-verify at UTC midnight).

## Step 4 — Session 10 scope (from the keyword map §3 + the route plan §10)

Session 10 is **markup-only** (the route plan §10): tile order, anchor wording, link placement. No new URLs, no canonical changes, no indexability changes, no new KV reads, no new fetches. The budget is zero marginal KV/subrequest/CPU (the links are built from data already in scope).

1. **Audit the internal-link graph (read-first, no code):** trace every cross-page link surface — the homepage hero card + carousel nav, the match-page footer-hook, the team-page upcoming-matches block + the standings window card + the related-matches card, the competition-page upcoming-matches block + the standings table, the `/teams` + `/competitions` index tile grids, the date-hub `hubTiles()` shortcut grid, the breadcrumbs. Identify where the anchor wording, the tile order, or the link placement could be more consistent, more crawlable, or better aligned with the cannibalization checklist (keyword map §3).

2. **The `/teams` index tile ordering (route plan §2.3 — the ONE explicit Session 10 decision):** the 13 selected clubs may be ordered first in the `/teams` index tile grid (cosmetic only — the non-selected team URLs stay listed as the crawl path for the noindexed pages). Verify the current ordering + decide whether to promote the 13 selected clubs to the top. If yes: markup-only (the `teamsIndex` iteration order), zero KV cost, the non-selected tiles stay (the crawlability law).

3. **The cannibalization checklist regression test (keyword map §3):** for every anchor/tile change, verify the 7 resolved overlaps are NOT worsened:
   - time-hubs-vs-homepage (the homepage never competes for امروز/امشب/فردا wording — rule 1).
   - team-vs-UCL (the team page vs the UCL competition page — rule 2 vs rule 3).
   - team-vs-match (the team page vs the match detail — rule 2 vs rule 4).
   - UCL-vs-today (the UCL competition page vs the today hub — the UCL-tonight exception, rule 3).
   - homepage-vs-matches (the homepage vs the `/matches` hub — the curated discovery vs the full window).
   - team-vs-league (the team page vs the competition page — rule 2 vs rule 3).
   - DFB-Pokal-vs-UCL (the DFB-Pokal cup page vs the UCL page).

4. **The anchor wording discipline:** the visible link text in `<a href>` is user-facing (NOT a GSC-measured surface — it's not in the SERP snippet — but it IS user-facing, so any anchor change must be diff-verified + recorded in DECISIONS.md). The anchor wording should match the destination page's H1 intent (e.g. a link to `/teams/barcelona` should carry «بارسلونا» or «بازی بعدی بارسلونا» — the team-page H1/answer head; a link to `/competitions/premier-league` should carry «لیگ برتر انگلیس» or «برنامه بازی‌های لیگ برتر انگلیس» — the competition-page H1 intent).

5. **The crawlability law (spec §5 + the C1 disposition):** every internal link stays a crawlable `<a href>` (no JS-only navigation, no `href="#"` placeholders). The 74 non-selected team URLs KEEP their internal links (the noindex-must-stay-crawlable law). No link is removed without a demand/backlink review (the spec §2 "Team pages" law).

6. **The internal-link JSON-LD (the `linkItemList` + the `itemListNode`):** the `/teams` + `/competitions` index pages carry a `linkItemList` JSON-LD (the child-page list); the hubs + the team/competition pages carry an `itemListNode` (the upcoming matches list). Verify these machine-readable lists agree with the visible tiles/links (the visible==machine contract — Session 3 SS-13).

7. **The breadcrumb discipline (spec §5 + P-17):** every page carries a breadcrumb (home → section → page). Verify the breadcrumbs are consistent + crawlable `<a href>` + agree with the page's H1.

8. **Representative internal-link verification:** render the homepage (the hero card + carousel nav + the boxes), a match page (the footer-hook «تیم‌ها» line), a team page (the upcoming-matches block + the standings window card + the related-matches card), a competition page (the upcoming-matches block + the standings table), the `/teams` + `/competitions` index pages (the tile grids), a date hub (the `hubTiles()` shortcut grid), and verify every link is a crawlable `<a href>` pointing to the canonical URL.

## Step 5 — Git, tests, deploy rules for this session

`npm install` (npm only, never bun) and `npm test` before your push; the suite must exit 0 (baseline **3,694 OK** — your new checks increase the count; record the new number).

If runtime code changed: `npm test` → `npx wrangler dev` local smoke of the changed behavior → versioned deploy (`CLOUDFLARE_API_TOKEN=… CLOUDFLARE_ACCOUNT_ID=a796fdfe… npx wrangler versions upload` → `npx wrangler versions deploy --version-id <id> --percentage 100 --yes`) → verify live (the internal-link surfaces 200 + the crawlable `<a href>` + the canonical URLs + `/healthz` budget before/after) → record the deployment ID. Rollback = `npx wrangler rollback`. If NO runtime change (copy/docs only), no deploy — say so explicitly.

Deploy-time ritual detail: state the Cloudflare budget of every change; `/healthz` before/after; verify the KV read quota has reset (the Session 5/6/7/8/9 close had it exceeded — if still exceeded, the internal-link data surfaces will be empty; wait for UTC midnight or document the limitation); version bump per the repo convention (version triple + the check-stats pins ride forward + CHANGELOG entry) if code changed.

Checkpointed commits with `seo(s10): …` messages; push one-shot with the token; fetch before push; verify with `git ls-remote`. Never force-push, never stage unrelated files, never commit secrets.

End with the repo-convention updates (AGENTS.md §10): `docs/HANDOFF.md`, `CHANGELOG.md`, `docs/DECISIONS.md` (every anchor/tile change and why; the freeze-coordination decision), then the TLDR report in your final response with the full Session 11 prompt pasted for the owner.

## Step 6 — Standing constraints (carry into every session)

Measurement freeze: GSC-measured surfaces + team-name spellings byte-frozen through Dec 4-8, 2026. The team-page title/H1 bytes ARE byte-frozen (Session 8 verified). The competition-page title/H1 bytes ARE byte-frozen (Session 9 verified). The match-page title/H1/description bytes ARE byte-frozen (Session 7 verified). The homepage title/H1 ARE byte-frozen (Session 6 verified). The date-hub empty-state copy on `/matches/tomorrow` IS byte-frozen (the S06-H3 follow-up is post-Dec-4). **The anchor text in `<a href>` link text is NOT a GSC-measured surface (it's not in the SERP snippet) — but the visible link text IS user-facing, so any anchor change must be diff-verified + recorded in DECISIONS.md.**

Cloudflare free tier is the budget (KV writes ~330/day of 1,000; ~50 subrequests/tick; 10ms CPU cliff on cold renders — C7; KV reads 100,000/day — was exceeded at Session 5 close and STILL exceeded at Session 6/7/8/9 close). Every change states its budget. No new KV write paths without a change-only discipline; no render-cost additions.

GSC impressions are site impressions, not market volumes. Do not model traffic upside without stated assumptions.

Do not start Session 11 work in this session; do not execute later sessions' scopes (Persian/entity naming = 11; EN/hreflang = 12; structured data = 13; mobile perf/GSC monitoring = 14; final regression = 15).

If the same approach fails three times, change approach; if genuinely blocked (missing credential, broken production, unverifiable risk), stop and say so with the exact blocker — never fabricate work, commits, test outcomes, or GSC results.

That's the full Session 10 prompt — also saved at `SESSION-10-start-prompt.md` and committed to the repo at `seo-implementation/next-session-prompt.md`. Paste it into a fresh session along with the credentials to start Session 10.

One note: I recommend rotating the GitHub + Cloudflare tokens before starting Session 10 — they were used in this session and have now been shared across multiple turns.
