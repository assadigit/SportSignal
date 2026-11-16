# SportSignal SEO Program — Session 8 Start Prompt (Selected-Club Team Pages)

Read AGENTS.md in the repo root first and follow it for the whole session.

You are the implementation agent for the SportSignal SEO project, Session 8 of 15: **selected-club team pages and allowlist**. Sessions 1-7 produced the audit, the validated keyword map, the approved architecture blueprint, the deployed crawl/index foundation (C1/C6/C8 live), the match-URL lifecycle mechanism (shipped INERT), the homepage one-month window + carousel crawlability + curated-selection promise (deployed `13.262.0-homepage`), and the match-detail footer-hook team-link gating + the metadata audit (deployed `13.263.0-matchlinks`). This session turns to the selected-club team pages — the `/teams/{slug}` family (keyword map §2.14; 13 selected clubs; 127 team URLs generated only 16 clicks from 2,456 impressions at 0.65% CTR in the baseline — the C1 disposition already noindexed the 74 non-selected team URLs in Session 4; Session 8 owns the CONTENT of the 13 selected-club team pages those match-detail footer-hook links point to).

## Step 0 — Credentials (supplied by the owner at session start; never commit them)

The owner provides per session: a GitHub classic token (repo push) and a Cloudflare API token + account ID (deploy). Use credentials only in the environment / one-shot push URL (`git push https://x-access-token:<token>@… main`), never in git config, files, commits, logs or reports. If something you need is missing, say so and proceed with what exists — never fabricate. **A fresh GSC export (ideally 16 months, with URL-level page samples and the queries×pages matrix) remains the program's top evidence request — for this session it would validate the team-page title/H1 against the actual query surface (the «بازی بعدی X» / «برنامه بازی‌های X» next-match heads are real GSC strings from the 2026-11-15 export — Session 8 owns these surfaces, and a fresh export unlocks the title/H1 test past the Dec 4-8 gate).**

## Step 1 — Repository

- Repository: `https://github.com/assadigit/SportSignal` (verify the actual `git remote -v`; the owner also writes `assadigit/sportsignal` — same repo).
- Branch: `main` only. Session 7 closed with the code checkpoint `7e2503b` (the footer-hook team-link gating + the Session 7 gate + version bump) and the session close-out commit (run `git log --oneline -8` to confirm HEAD; the tracker's Session 07 row records the session's commits).
- Clone fresh, verify `git status` is clean, and confirm no uncommitted concurrent-agent work (if any exists: preserve it, isolate your changes, never reset/clean/force-push).
- Live production site: `https://sportsignal.ir` (Worker `ucl-notifier`, versioned deploys only). This session DEPLOYS if (and only if) it makes runtime changes — through the repo's established ritual only. **Current live: `13.263.0-matchlinks`, deployment `3e3a65e7-cebb-4fee-8354-8c3dd13d6f07` @100%** (= repo HEAD at Session 7 close-out). **NOTE: the account's KV read quota (100,000/day free-plan) was exceeded at Session 5 close and was STILL exceeded at Session 6/7 close — the pool/archive data persists but can't be read until the quota resets at UTC midnight. Verify the quota has reset before your live smoke; if still exceeded, the team-page data surfaces will be empty (this is a pre-existing infrastructure issue, NOT a code issue). The owner should investigate the read-source; a Workers Paid plan ($5/mo → 1M reads/day) is the durable fix.**

## Step 2 — Mandatory reading order (all in the repo)

1. `AGENTS.md` (repo root — the operating contract; sections 5-7 govern git/secrets/deploy)
2. `sportsignal-seo-implementation/README.md`
3. `sportsignal-seo-implementation/AGENT-INSTRUCTIONS.md` (the master execution contract)
4. `sportsignal-seo-implementation/PRODUCT-AND-SEO-STRATEGY.md` + `MASTER-SEO-SPEC.md` (§2-3 eligibility; §5 technical requirements; §2 Team pages — "Only selected-club pages are indexable. Use an authoritative allowlist… Never create a page per provider team."; §8 titles/meta/on-page language; §9 internal links; §10 Cloudflare guardrails)
5. `sportsignal-seo-implementation/GSC-AUDIT-BASELINE.md` (the team-page GSC rows: 127 URLs / 16 clicks / 2,456 impr / 0.65% CTR; the «بازی بعدی بارسا» 179 impr / pos 9.97; the «بازی بعدی بایرن مونیخ» 105 impr / pos 9.99; the owner's decision to keep indexable team pages only for the 13 selected clubs)
6. `sportsignal-seo-implementation/phases/SESSION-08-SELECTED-TEAM-PAGES.md` (this session's scope)
7. `seo-implementation/keyword-research/KEYWORD-TO-URL-MAP.md` (§2.7 `/teams/{slug}` — the 13 selected-club team pages; §2.14 the next-match/club-schedule family «بازی بعدی X» / «برنامه بازی‌های X»; the Persian metadata plan; the 4-route eligibility law)
8. `seo-implementation/architecture/ROUTE-AND-CANONICAL-PLAN.md` (Session 3: the team-page canonical; §7 the Inter/Atlético provider-derived slugs; §10 sequencing)
9. `seo-implementation/architecture/INDEXABILITY-MATRIX.csv` (the team-page row 9 — selected club = index follow when ≥1 upcoming; non-selected = noindex follow)
10. `seo-implementation/session-reports/SESSION-07.md` + `SESSION-06.md` + `SESSION-04.md` (the inherited state — the footer-hook team-link gating, the homepage changes, the C1/C6/C8 foundation)
11. `sportsignal-seo-implementation/IMPLEMENTATION-TRACKER.md` (progress source of truth)
12. `docs/RUNBOOK.md` §2 (the deploy ritual) — and re-check `docs/HANDOFF.md` for the current state (the KV quota issue + the Session 7 footer-hook self-verify + the S07 data-surface follow-up)

## Step 3 — Session 1-7 facts you must build on (verified; do not re-audit)

**Architecture (Session 1, live-verified):** Cloudflare Worker `ucl-notifier`, TypeScript, zero framework; SSR HTML from KV only (`getSeoCtx`: payload + pool + overlay); hand-rolled router (`src/seo/router.ts`); npm test = `tsc --noEmit` + 51 check scripts (**baseline now 3,676 OK** — Session 7 added the section 3b gate in `check-seo-crawlindex.js`); versioned deploys (`npx wrangler versions upload` → `versions deploy --version-id <id> --percentage 100 --yes`); rollback via `npx wrangler rollback`.

**The team-page machinery you inherit (all verified):**
- The team-page builder: `buildTeamPage` (`src/seo/pages.ts`) — the indexable rule is `const indexable = isSelectedTeam(entry.name) && upcoming.length >= SEO.MIN_UPCOMING_FOR_INDEX;` (Session 4, the C1 disposition; `check-seo-crawlindex.js` line 129 gates this). Non-selected team pages serve `noindex, follow` + 200 + self-canonical + all internal links preserved (the C1 disposition — 74 non-selected URLs noindexed in Session 4; teams.xml 87 → 13).
- The `isSelectedTeam` predicate (`src/seo/data.ts:302`) — the 13-club allowlist (PL/PD/SA/FL1/BL1 domestic league keys; AL excluded; EL/ECL are duplicate names). The predicate normalizes via `normalizeTeamName`/`normAlias` (verified against the two provider-derived canonical slugs "FC Internazionale Milano" + "Club Atlético de Madrid" + 18 variant cases). The admin-overlay rebuild (the `teamNormCache` sig pattern) takes effect without a redeploy.
- The team-page title/H1: the team-page title ladder + the H1 are GSC-measured surfaces (the «بازی بعدی X» / «برنامه بازی‌های X» query heads) — byte-frozen through Dec 4-8. Session 8 owns them but the actual byte change is a post-Dec-4 decision with a fresh GSC export.
- The team-page internal links: the team page links to its upcoming matches (the matchHref anchors) + its competition page. The match-detail footer-hook (Session 7) now links ONLY selected-club team pages (`isSelectedTeam` gating) — non-selected clubs render as plain text.
- The team-page JSON-LD: the @graph carries Organization + WebSite + WebPage + BreadcrumbList (NO SportsEvent — the team page is not an event; theItemList for the upcoming fixtures list). The team-page title/H1/meta are byte-frozen through Dec 4-8.

**Session 4's deployed foundation (do not regress):** `isSelectedTeam` (C1 — only 13 selected clubs get indexable team pages + teams.xml rows); `guardNonProdMachineFile` (C6); C8 = record-and-skip (do NOT re-attempt the `s-maxage` fix).

**Session 7's match-detail changes (do not regress — verified by `check-seo-crawlindex.js` section 3b):** the footer-hook team-link gating on `isSelectedTeam` (only selected clubs get `<a href="/teams/...">`; non-selected clubs render as plain text; BODY-ONLY — the byte-frozen `<head>` untouched). The metadata audit verified the match-detail title/H1/meta/OG/JSON-LD/answer-sentence funnel is correct + byte-frozen. The 13 GSC "Missing field location" items are the no-venue matches (the MISSING-IS-NOT-ZERO law holds).

**Session 6's homepage changes (do not regress):** `SEO.UPCOMING_DISPLAY_DAYS = 30` (the DISPLAY window); the hero-card SSR href + the sr-only carousel nav; the curated-selection promise sr-only paragraph; the title/H1 byte-frozen.

**What NOT to touch:** the `isSelectedTeam` predicate + the 13-club allowlist STAY (Session 4 decision); the non-selected team pages STAY `noindex, follow` (the C1 disposition); the teams.xml 13-row filter STAYS; the match-detail footer-hook team-link gating STAYS (Session 7); the team-page title/H1 bytes ARE byte-frozen through Dec 4-8 (Session 8 owns them — the actual byte change is a post-Dec-4 decision with a fresh GSC export); the homepage title/H1 ARE byte-frozen (Session 6); avoid deploys in the Nov 20 Bayern–Köln S27 auto-verify windows (kickoff 19:30 UTC; M1 ~19:35, M2 ~21:35-45 UTC — check the date before you deploy); Cloudflare free tier is the budget (KV writes ~330/day of 1,000; ~50 subrequests/tick; the 10ms CPU cliff on cold renders — C7; **the KV read quota (100,000/day) was exceeded at Session 5 close and STILL exceeded at Session 6/7 close — investigate before deploying; the Session 7 data-surface self-verify at UTC midnight**).

## Step 4 — Session 8 scope (from the phase file + the keyword map §2.7/§2.14)

1. **Audit the current team-page data fields and content** (read-first, no code): `buildTeamPage` (`src/seo/pages.ts`), the team-page sections (the upcoming fixtures list, the competition link, the recent results, the form strip, the season record), the team-page title/H1/meta, the team-page JSON-LD, the team-page internal links. Identify where the title/H1/meta/content could be more unique, accurate, or consistent per the keyword map §2.7/§2.14 plan.
2. **Unique title/H1/meta per selected team page** based on accurate club, competition, upcoming fixture and recent result. The team-page title ladder is the keyword map §2.7/§2.14 plan — verify it against the live GSC query surface (the «بازی بعدی X» / «برنامه بازی‌های X» heads). **The Dec 4-8 freeze applies to team-page title/H1 bytes — if the bytes change, verify with a page diff and record the before/after GSC position.**
3. **Natural Persian team-name aliases in body copy** only where relevant (the `seoTeamFaName` + `seoTeamAltName` overrides in `src/seo/team-names.ts`, the S1 spelling-fix round); do NOT stuff all spelling variants into titles. The team-name spellings are byte-frozen through Dec 4-8.
4. **Ensure selected team pages answer next-match intent** with upcoming selected fixtures, competition and recent/final result information already available (spec §2 + the phase file). The team page already lists upcoming matches + the competition link + recent results — verify the content is accurate and crawlable.
5. **Preserve useful content; no filler word-count expansion** (spec §2 "Keep the current fairly complete team page experience"; "Do not add filler text to match a word count").
6. **Do not target live score, broadcast channel, lineup or minute-by-minute intent** if unsupported (spec §2; product constraints).
7. **Make links from team pages to selected matches and competition pages consistent** (spec §9 internal links: "Selected team page → upcoming approved matches and competition pages"). The team page already links its upcoming matches + the competition — verify the links are crawlable `<a href>` and point to the canonical URLs.
8. **The sitemap includes selected teams only** (the teams.xml 13-row filter — Session 4, verified). Do NOT regress.
9. **Representative teams verification**: render a selected team with upcoming matches, a selected team with no upcoming matches (the `noindex, follow` at 0 upcoming rule), and verify the metadata, content and canonical are correct per state.

## Step 5 — Git, tests, deploy rules for this session

- `npm install` (npm only, never bun) and `npm test` before your push; the suite must exit 0 (baseline **3,676 OK** — your new checks increase the count; record the new number).
- If runtime code changed: `npm test` → `npx wrangler dev` local smoke of the changed behavior → **versioned deploy** (`CLOUDFLARE_API_TOKEN=… CLOUDFLARE_ACCOUNT_ID=a796fdfe… npx wrangler versions upload` → `npx wrangler versions deploy --version-id <id> --percentage 100 --yes`) → verify live (the team-page 200 + title/H1/meta agreement + the JSON-LD + the upcoming fixtures list + the canonical + `/healthz` budget before/after) → record the deployment ID. Rollback = `npx wrangler rollback`. If NO runtime change (copy/docs only), no deploy — say so explicitly.
- Deploy-time ritual detail: state the Cloudflare budget of every change; `/healthz` before/after; **verify the KV read quota has reset** (the Session 5/6/7 close had it exceeded — if still exceeded, the team-page data surfaces will be empty; wait for UTC midnight or document the limitation); version bump per the repo convention (version triple + the check-stats pins ride forward + CHANGELOG entry) if code changed.
- Checkpointed commits with `seo(s08): …` messages; push one-shot with the token; fetch before push; verify with `git ls-remote`. Never force-push, never stage unrelated files, never commit secrets.
- End with the repo-convention updates (AGENTS.md §10): `docs/HANDOFF.md`, `CHANGELOG.md`, `docs/DECISIONS.md` (every metadata change and why; the freeze-coordination decision), then the TLDR report in your final response with the full Session 9 prompt pasted for the owner.

## Step 6 — Standing constraints (carry into every session)

- Measurement freeze: GSC-measured surfaces + team-name spellings byte-frozen through **Dec 4-8, 2026**. The team-page title/H1 bytes ARE GSC-measured surfaces — copy changes must be justified and diff-verified. The match-page title/H1/description bytes ARE byte-frozen (Session 7 verified; Session 8 does not touch them).
- Cloudflare free tier is the budget (KV writes ~330/day of 1,000; ~50 subrequests/tick; 10ms CPU cliff on cold renders — C7; **KV reads 100,000/day — was exceeded at Session 5 close and STILL exceeded at Session 6/7 close**). Every change states its budget. No new KV write paths without a change-only discipline; no render-cost additions.
- GSC impressions are site impressions, not market volumes. Do not model traffic upside without stated assumptions.
- Do not start Session 9 work in this session; do not execute later sessions' scopes (competition/date pages = 9; internal linking = 10; Persian/entity naming = 11; EN/hreflang = 12; structured data = 13).
- If the same approach fails three times, change approach; if genuinely blocked (missing credential, broken production, unverifiable risk), stop and say so with the exact blocker — never fabricate work, commits, test outcomes, or GSC results.
