# SportSignal SEO Program — Session 9 Start Prompt (Competition Pages + Date Pages + Empty States)

Read AGENTS.md in the repo root first and follow it for the whole session.

You are the implementation agent for the SportSignal SEO project, Session 9 of 15: **competition pages, date pages and empty states**. Sessions 1-8 produced the audit, the validated keyword map, the approved architecture blueprint, the deployed crawl/index foundation (C1/C6/C8 live), the match-URL lifecycle mechanism (shipped INERT), the homepage one-month window + carousel crawlability + curated-selection promise (deployed `13.262.0-homepage`), the match-detail footer-hook team-link gating + the metadata audit (deployed `13.263.0-matchlinks`), and the selected-club team-page @graph WebPage node + the team-page content audit + the new `check-seo-teampages.js` gate (deployed `13.264.0-teampages`). This session turns to the competition pages — the `/competitions/{slug}` family (keyword map §2.8-2.13; 7 live competition pages: PL, PD, SA, FL1, BL1, UCL, DFB-Pokal) + the date hub pages (`/matches/today`, `/matches/tomorrow`, `/matches/this-week`, `/matches/this-weekend`) + the empty-state behavior. The C1/C6/C8 foundation + the team-page WebPage node are live; Session 9 owns the competition-page content + the date-hub refinements + the empty-state discipline.

## Step 0 — Credentials (supplied by the owner at session start; never commit them)

The owner provides per session: a GitHub classic token (repo push) and a Cloudflare API token + account ID (deploy). Use credentials only in the environment / one-shot push URL (`git push https://x-access-token:<token>@… main`), never in git config, files, commits, logs or reports. If something you need is missing, say so and proceed with what exists — never fabricate. **A fresh GSC export (ideally 16 months, with URL-level page samples and the queries×pages matrix) remains the program's top evidence request — for this session it would validate the competition-page title/H1 against the actual query surface (the «بازی‌های لیگ برتر انگلیس» / «برنامه سری‌آ» / «بازی‌های لالیگا» competition-schedule heads). The Dec 4-8 freeze applies to the competition-page title/H1 bytes — Session 9 owns them but the actual byte change is a post-Dec-4 decision with a fresh GSC export.**

## Step 1 — Repository

- Repository: `https://github.com/assadigit/SportSignal` (verify the actual `git remote -v`; the owner also writes `assadigit/sportsignal` — same repo).
- Branch: `main` only. Session 8 closed with the code checkpoint (the team-page @graph WebPage node + the `check-seo-teampages.js` gate + version bump) and the session close-out commit (run `git log --oneline -8` to confirm HEAD; the tracker's Session 08 row records the session's commits).
- Clone fresh, verify `git status` is clean, and confirm no uncommitted concurrent-agent work (if any exists: preserve it, isolate your changes, never reset/clean/force-push).
- Live production site: `https://sportsignal.ir` (Worker `ucl-notifier`, versioned deploys only). This session DEPLOYS if (and only if) it makes runtime changes — through the repo's established ritual only. **Current live: `13.264.0-teampages`, deployment recorded in `docs/HANDOFF.md` @100%** (= repo HEAD at Session 8 close-out). **NOTE: the account's KV read quota (100,000/day free-plan) was exceeded at Session 5 close and was STILL exceeded at Session 6/7/8 close — the pool/archive data persists but can't be read until the quota resets at UTC midnight. Verify the quota has reset before your live smoke; if still exceeded, the competition-page data surfaces will be empty (this is a pre-existing infrastructure issue, NOT a code issue). The owner should investigate the read-source; a Workers Paid plan ($5/mo → 1M reads/day) is the durable fix.**

## Step 2 — Mandatory reading order (all in the repo)

1. `AGENTS.md` (repo root — the operating contract; sections 5-7 govern git/secrets/deploy)
2. `sportsignal-seo-implementation/README.md`
3. `sportsignal-seo-implementation/AGENT-INSTRUCTIONS.md` (the master execution contract)
4. `sportsignal-seo-implementation/PRODUCT-AND-SEO-STRATEGY.md` + `MASTER-SEO-SPEC.md` (§2-3 eligibility; §5 technical requirements; §2 Competition pages — the 7 live competition pages; §8 titles/meta/on-page language; §9 internal links; §10 Cloudflare guardrails)
5. `sportsignal-seo-implementation/GSC-AUDIT-BASELINE.md` (the competition-page GSC rows + the date-hub rows)
6. `seo-implementation/architecture/ROUTE-AND-CANONICAL-PLAN.md` (Session 3: the competition-page canonical; §4 the date-hub canonicals; §10 sequencing — Session 9 = competition pages)
7. `seo-implementation/architecture/INDEXABILITY-MATRIX.csv` (the competition-page rows — index follow when ≥1 upcoming; the date-hub rows)
8. `seo-implementation/keyword-research/KEYWORD-TO-URL-MAP.md` (§2.8-2.13 the competition pages; §2.1-2.6 the date hubs; §3 the 4-route eligibility law)
9. `seo-implementation/session-reports/SESSION-08.md` + `SESSION-07.md` + `SESSION-06.md` (the inherited state — the team-page WebPage node, the footer-hook gating, the homepage changes, the C1/C6/C8 foundation)
10. `sportsignal-seo-implementation/IMPLEMENTATION-TRACKER.md` (progress source of truth)
11. `docs/RUNBOOK.md` §2 (the deploy ritual) — and re-check `docs/HANDOFF.md` for the current state (the KV quota issue + the Session 8 team-page WebPage node + the S08 data-surface follow-up)

## Step 3 — Session 1-8 facts you must build on (verified; do not re-audit)

**Architecture (Session 1, live-verified):** Cloudflare Worker `ucl-notifier`, TypeScript, zero framework; SSR HTML from KV only (`getSeoCtx`: payload + pool + overlay); hand-rolled router (`src/seo/router.ts`); npm test = `tsc --noEmit` + 52 check scripts (**baseline now 3,685 OK** — Session 8 added `check-seo-teampages.js`); versioned deploys (`npx wrangler versions upload` → `versions deploy --version-id <id> --percentage 100 --yes`); rollback via `npx wrangler rollback`.

**The competition-page machinery you inherit (all verified):**
- The competition-page builder: `buildCompetitionPage` (`src/seo/pages.ts:2183`) — the indexable rule is `const indexable = list.length >= SEO.MIN_UPCOMING_FOR_INDEX;` (a competition page is indexable when ≥1 upcoming approved match in that competition). The competition page links its upcoming matches (crawlable `<a href>`) + renders the full standings table (`fullStandings`, one cache-only KV read, fail-closed to the compact).
- The competition-page title/H1: `cNameFa + " — برنامه بازی‌های بزرگ پیش‌رو | اسپرت سیگنال"` (title) + `"برنامه بازی‌های " + cNameFa` (H1). The competition-page title/H1 ARE byte-frozen through Dec 4-8 — Session 9 owns them but the actual byte change is a post-Dec-4 decision with a fresh GSC export.
- **The competition-page @graph GAP (Session 8 noted, Session 9 owns):** `buildCompetitionPage`'s `jsonldNodes` emits `siteNodes()` (Organization + WebSite) + `sportsOrganizationNode` (SportsOrganization) + `itemListNode` (when indexable) + `breadcrumbNode` (BreadcrumbList) — **NO WebPage/CollectionPage node**, the SAME gap the team page had (Session 8 fixed the team page; Session 9 should add `JL.webPageNode`/`JL.collectionPageNode` to the competition page for parity — one-line structural JSON-LD hygiene, freeze-safe, zero KV cost).
- The `/competitions` index page: `buildCompetitionsIndexPage` — indexable, self-canonical, tile grid + `linkItemList` JSON-LD (the SS-13 ItemList of child links). Already correct.

**The date-hub machinery you inherit (all verified):**
- The date-hub pages: `/matches/today`, `/matches/tomorrow`, `/matches/this-week`, `/matches/this-weekend` (keyword map §2.1-2.6). Each renders the upcoming matches for that time window, self-canonical, indexable. The homepage one-month window (Session 6) + the curated-selection promise are deployed; the date hubs are NOT changed by Session 6.
- The empty-state behavior: a hub with zero upcoming matches renders the empty-state copy (e.g. «مسابقه‌ای در راه نیست»). The S06-H3 follow-up (the tomorrow-empty-state refinement) is a post-Dec-4 decision with a fresh GSC export.

**Session 8's deployed changes (do not regress — verified by `check-seo-teampages.js`):** the team-page @graph WebPage node (`JL.webPageNode(path, ctx.fetchedAt, { name: "برنامه بازی‌های " + name })` in `buildTeamPage`'s `jsonldNodes`). The team-page title/H1/description/answer are byte-frozen. The `check-seo-teampages.js` 8 gates pin the WebPage node + the no-SportsEvent law + the byte-frozen title/H1 + the answer lead + the indexable rule + the crawlable links + the @graph order.

**Session 7's deployed changes (do not regress):** the footer-hook team-link gating on `isSelectedTeam` (BODY-ONLY, the byte-frozen `<head>` untouched). The match-page title/H1/description/answer funnel is byte-frozen through Dec 4-8.

**Session 6's deployed changes (do not regress):** `SEO.UPCOMING_DISPLAY_DAYS = 30` (the DISPLAY window); the hero-card SSR href + the sr-only carousel nav; the curated-selection promise sr-only paragraph; the title/H1 byte-frozen.

**What NOT to touch:** the `isSelectedTeam` predicate + the 13-club allowlist STAY (Session 4 decision); the non-selected team pages STAY `noindex, follow` (the C1 disposition); the teams.xml 13-row filter STAYS; the match-detail footer-hook team-link gating STAYS (Session 7); the team-page title/H1 bytes ARE byte-frozen through Dec 4-8 (Session 9 does NOT touch them); the competition-page title/H1 bytes ARE byte-frozen through Dec 4-8 (Session 9 owns them — the actual byte change is a post-Dec-4 decision with a fresh GSC export); the homepage title/H1 ARE byte-frozen (Session 6); avoid deploys in the Nov 20 Bayern–Köln S27 auto-verify windows (kickoff 19:30 UTC; M1 ~19:35, M2 ~21:35-45 UTC — check the date before you deploy); Cloudflare free tier is the budget (KV writes ~330/day of 1,000; ~50 subrequests/tick; the 10ms CPU cliff on cold renders — C7; **the KV read quota (100,000/day) was exceeded at Session 5 close and STILL exceeded at Session 6/7/8 close — investigate before deploying; the Session 8 data-surface self-verify at UTC midnight**).

## Step 4 — Session 9 scope (from the keyword map §2.8-2.13 + the route plan §10)

1. **Audit the competition-page data fields and content** (read-first, no code): `buildCompetitionPage` (`src/seo/pages.ts`), the competition-page sections (the standings table, the upcoming matches list, the answer sentence), the competition-page title/H1/meta, the competition-page JSON-LD, the competition-page internal links. Identify where the title/H1/meta/content could be more unique, accurate, or consistent per the keyword map §2.8-2.13 plan.
2. **Add the WebPage node to the competition-page @graph** (the Session 8-noted gap — one-line `JL.webPageNode`/`JL.collectionPageNode` addition to `buildCompetitionPage`'s `jsonldNodes`, mirroring the team-page fix). Structural JSON-LD hygiene, freeze-safe, zero KV cost.
3. **Unique title/H1/meta per competition page** based on accurate competition, upcoming fixture and recent result. The competition-page title ladder is the keyword map §2.8-2.13 plan — verify it against the live GSC query surface. **The Dec 4-8 freeze applies to competition-page title/H1 bytes — if the bytes change, verify with a page diff and record the before/after GSC position.**
4. **Natural Persian competition-name aliases in body copy** only where relevant (the `translateCompetition` map); do NOT stuff all spelling variants into titles. The competition-name spellings are byte-frozen through Dec 4-8.
5. **Ensure competition pages answer next-match intent** with upcoming approved matches + the standings table already available (spec §2). The competition page already lists upcoming matches + the standings table — verify the content is accurate and crawlable.
6. **Preserve useful content; no filler word-count expansion** (spec §2 "Keep the current fairly complete competition page experience"; "Do not add filler text to match a word count").
7. **Do not target live score, broadcast channel, lineup or minute-by-minute intent** if unsupported (spec §2; product constraints).
8. **Make links from competition pages to selected matches and team pages consistent** (spec §9 internal links: "Competition page → upcoming approved matches and team pages"). The competition page already links its upcoming matches — verify the links are crawlable `<a href>` and point to the canonical URLs.
9. **The date-hub pages** (`/matches/today`, `/matches/tomorrow`, `/matches/this-week`, `/matches/this-weekend`): verify the content + the indexability + the canonical are correct per state (the empty-state behavior — a hub with zero upcoming matches). The S06-H3 follow-up (the tomorrow-empty-state refinement) is a post-Dec-4 decision.
10. **Representative competitions verification**: render a competition with upcoming matches (e.g. `/competitions/PL`), a competition with no upcoming matches (the `noindex, follow` at 0 upcoming rule), and verify the metadata, content and canonical are correct per state.

## Step 5 — Git, tests, deploy rules for this session

- `npm install` (npm only, never bun) and `npm test` before your push; the suite must exit 0 (baseline **3,685 OK** — your new checks increase the count; record the new number).
- If runtime code changed: `npm test` → `npx wrangler dev` local smoke of the changed behavior → **versioned deploy** (`CLOUDFLARE_API_TOKEN=… CLOUDFLARE_ACCOUNT_ID=a796fdfe… npx wrangler versions upload` → `npx wrangler versions deploy --version-id <id> --percentage 100 --yes`) → verify live (the competition-page 200 + title/H1/meta agreement + the JSON-LD + the standings table + the canonical + `/healthz` budget before/after) → record the deployment ID. Rollback = `npx wrangler rollback`. If NO runtime change (copy/docs only), no deploy — say so explicitly.
- Deploy-time ritual detail: state the Cloudflare budget of every change; `/healthz` before/after; **verify the KV read quota has reset** (the Session 5/6/7/8 close had it exceeded — if still exceeded, the competition-page data surfaces will be empty; wait for UTC midnight or document the limitation); version bump per the repo convention (version triple + the check-stats pins ride forward + CHANGELOG entry) if code changed.
- Checkpointed commits with `seo(s09): …` messages; push one-shot with the token; fetch before push; verify with `git ls-remote`. Never force-push, never stage unrelated files, never commit secrets.
- End with the repo-convention updates (AGENTS.md §10): `docs/HANDOFF.md`, `CHANGELOG.md`, `docs/DECISIONS.md` (every metadata change and why; the freeze-coordination decision), then the TLDR report in your final response with the full Session 10 prompt pasted for the owner.

## Step 6 — Standing constraints (carry into every session)

- Measurement freeze: GSC-measured surfaces + competition-name spellings byte-frozen through **Dec 4-8, 2026**. The competition-page title/H1 bytes ARE GSC-measured surfaces — copy changes must be justified and diff-verified. The team-page title/H1 bytes ARE byte-frozen (Session 8 verified; Session 9 does not touch them). The match-page title/H1/description bytes ARE byte-frozen (Session 7 verified; Session 9 does not touch them).
- Cloudflare free tier is the budget (KV writes ~330/day of 1,000; ~50 subrequests/tick; 10ms CPU cliff on cold renders — C7; **KV reads 100,000/day — was exceeded at Session 5 close and STILL exceeded at Session 6/7/8 close**). Every change states its budget. No new KV write paths without a change-only discipline; no render-cost additions.
- GSC impressions are site impressions, not market volumes. Do not model traffic upside without stated assumptions.
- Do not start Session 10 work in this session; do not execute later sessions' scopes (internal linking = 10; Persian/entity naming = 11; EN/hreflang = 12; structured data = 13).
- If the same approach fails three times, change approach; if genuinely blocked (missing credential, broken production, unverifiable risk), stop and say so with the exact blocker — never fabricate work, commits, test outcomes, or GSC results.
