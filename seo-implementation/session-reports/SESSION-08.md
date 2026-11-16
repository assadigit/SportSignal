# SEO Program Session 08 — Selected-Club Team Pages and Allowlist

> Agents: read AGENTS.md in the repo root first, and follow it for this whole task.

- **Date:** 2026-11-16
- **Version shipped:** `13.264.0-teampages` (`package.json` `13.264.0.0`)
- **Live before:** `13.263.0-matchlinks` (Session 7, deployment `3e3a65e7-cebb-4fee-8354-8c3dd13d6f07` @100%)
- **Status:** Completed / deployed (versioned). The KV read quota is STILL exceeded (pre-existing, NOT a code issue — self-heals at UTC midnight).

## 1. Objective and scope

The selected-club team-page session of the 15-session SEO program: the `/teams/{slug}` family (keyword map §2.7; 13 selected clubs; 127 team URLs generated only 16 clicks from 2,456 impressions at 0.65% CTR in the baseline — the C1 disposition already noindexed the 74 non-selected team URLs in Session 4; Session 8 owns the CONTENT of the 13 selected-club team pages those match-detail footer-hook links point to).

The Dec 4-8 measurement freeze applies to the team-page title/H1 bytes (the parked S2 title test reads GSC on Dec 4 — Session 8 owns the content + the structural JSON-LD, NOT the title bytes pre-gate). Per the keyword map §2.7: "What Session 8 may do before the gate: nothing on titles; after the gate: apply the test's winning pattern, then the Session 8 scope (content depth, internal links)."

The phase file (`sportsignal-seo-implementation/phases/SESSION-08-SELECTED-TEAM-PAGES.md`) objective: *Align team page generation and indexability with the selected-club model.* Required work: use the curated allowlist; generate indexable team pages only for selected clubs; ensure selected team pages answer next-match intent with upcoming fixtures + competition + recent/final result information; ensure the sitemap includes selected teams only; do not create dedicated pages for every team in data feeds. Acceptance: tests cover selected + non-selected teams; only allowed team URLs can be indexed/sitemap-listed; team names and aliases are consistent; no regressions in match details.

## 2. Findings (the team-page surfaces traced — Task 1-audit)

The audit (read-first) confirms `buildTeamPage` (`src/seo/pages.ts:1987`) is already complete against the phase file + the keyword map §2.7 + the spec §2/§9. Every required surface is present + correct + byte-frozen:

- **The title ladder (byte-frozen, keyword map §2.7):** `name + " — برنامه بازی بعدی و ساعت شروع | اسپرت سیگنال"` (the >65 rung drops «بعدی » per the v13.229-teamladder trim — only «برنامه بازی و ساعت شروع» when the assembled title exceeds 65 chars; the unique core — the team name — never drops). The title leads with the club name; the GSC intent leads with «بازی بعدی X» — the answer sentence carries the «بازی بعدی» head (see below).
- **The H1 (byte-frozen, keyword map §2.7):** `"برنامه بازی‌های " + name` — the whole upcoming schedule.
- **The answer sentence:** leads with «بازی بعدی X» when there is a next match (the GSC query head «بازی بعدی بارسا» 179 impr / pos 9.97 / «بازی بعدی بایرن مونیخ» 105 impr / pos 9.99 / «بازی بعدی لیورپول» 24 impr / pos 7.21 / «بازی بعدی آرسنال» 14 impr / pos 9.14), OR «برنامه بازی‌های X در اسپرت سیگنال» when no fixture is queued. The standings position rides the answer when the window found the team's row.
- **The meta description:** derived from the answer sentence, sliced to 165. Honest: promises the next match + the schedule, never live scores, TV channels, lineups, or minute-by-minute (spec §2 product constraints).
- **The content blocks (spec §2 "recent/final result information already available"):** (1) the answercard; (2) the altNote (the S1 M2 spelling-fix alternate-name disclosure — «X با نام «Y» هم شناخته می‌شود.»); (3) «بازی‌های پیش‌روی X» — the upcoming fixtures list; (4) the standings window card (the team's neighborhood in its competition's standings + the competition link); (5) the form/season record card (the team's own form dots or season record); (6) «نتایج اخیر» — the recent finished results; (7) the related-matches card «بازی‌های مرتبط». No filler text (spec §2 "Do not add filler text to match a word count").
- **The internal links (spec §9 "Selected team page → upcoming approved matches and competition pages"):** the upcoming-matches block renders crawlable `<a href>` match URLs via `dateGroupedRows` → `M.mrowHtml` → `M.matchHref` → `matchPath` (the canonical `/matches/{home}-vs-{away}-{YYYY-MM-DD}`). The standings window card links to the competition page. The related-matches card cross-links siblings. All crawlable `<a href>`; no JS-only navigation; no `href="#"` placeholders.
- **The JSON-LD @graph (THE ONE GAP):** the team page emitted `siteNodes()` (Organization + WebSite) + `sportsTeamNode` (SportsTeam) + `itemListNode` (ItemList, when indexable) + `breadcrumbNode` (BreadcrumbList). **NO WebPage/CollectionPage node** — the team page was the lone page-class without one. The match page emits `JL.webPageNode`; the hubs (`/matches`, `/matches/today`, …) + the `/teams` index + the `/competitions` index emit `JL.collectionPageNode`. The spec contract (the Session 8 prompt Step 3: "the @graph carries Organization + WebSite + WebPage + BreadcrumbList") was non-conformant for the team page. **No SportsEvent** — the team page is not an event; a SportsEvent would require a fabricated fixture-on-this-page (the MISSING-IS-NOT-ZERO law holds). This gap is the ONE code change this session.
- **The indexable rule (the C1 disposition, Session 4):** `const indexable = isSelectedTeam(entry.name) && upcoming.length >= SEO.MIN_UPCOMING_FOR_INDEX;` (MIN_UPCOMING_FOR_INDEX=1; a selected team with 0 upcoming serves `noindex, follow` + 200 + self-canonical + full content + internal links — the noindex-must-stay-crawlable law). Non-selected team pages serve `noindex, follow` (the C1 disposition — 74 URLs noindexed in Session 4; teams.xml 87 → 13).
- **The team-name overrides (the S1 M2 F3 spelling fix):** `seoTeamFaName`/`seoTeamAltName` (`src/seo/team-names.ts`) apply the searcher-spelling overrides (Leipzig «لایپزیگ»/«لایپزیش»; Nordsjaelland «نورشلان»/«نوردشیلند»; Roma keeps «رم» + alt «آ س رم»). The dictionary spelling is shown once in the altNote; the SEO-visible name rides the override. Byte-frozen through Dec 4-8.
- **The teams.xml 13-row filter (Session 4, do not regress):** `files.ts` teams branch filters to `isSelectedTeam` BEFORE any candidate row is pushed. Gated by `check-seo-crawlindex.js` §2.

## 3. Files changed

### Modified (runtime)
- `src/seo/pages.ts` — `buildTeamPage`'s `jsonldNodes` array gains `JL.webPageNode(path, ctx.fetchedAt, { name: "برنامه بازی‌های " + name })` between `siteNodes()` and `sportsTeamNode`. Structural JSON-LD hygiene only; the byte-frozen title/H1/description/answer are untouched.

### Modified (tests)
- `scripts/check-seo-teampages.js` — NEW. 8 offline gates pinned to the `buildTeamPage` function body: (1) the WebPage node is in the `jsonldNodes` array; (2) NO SportsEvent node; (3) the byte-frozen title ladder + the >65 rung; (4) the byte-frozen H1; (5) the answer sentence leads with «بازی بعدی X» (next match) / «برنامه بازی‌های X در اسپرت سیگنال» (no next match); (6) the indexable rule (the C1 disposition); (7) the crawlable upcoming-matches rows + the recent-results block (spec §9); (8) the @graph node order. Wired into the `npm test` chain after `check-seo-crawlindex.js`.
- `scripts/check-stats.js` — the v13.254-rankbadge + v13.258-mca11y release-wiring pins ride forward to `13.264.0.0` + the new `check-seo-teampages.js` existence + the test-chain regex (the v13.254 VERSION + CHANGELOG assertions update to `13.264.0-teampages`).

### Modified (docs + version)
- `src/config.ts` — `VERSION` `13.263.0-matchlinks` → `13.264.0-teampages`.
- `package.json` — `version` `13.263.0.0` → `13.264.0.0`; the `test` script chain gains `&& node scripts/check-seo-teampages.js`.
- `package-lock.json` — resynced via `npm install`.
- `CHANGELOG.md` — the `# v13.264.0-teampages` entry (the session's narrative).
- `docs/HANDOFF.md` — rewritten for Session 8.
- `docs/DECISIONS.md` — S08-1 (the WebPage node), S08-2 (the audit confirms the content is already complete — no further content changes pre-Dec-4), S08-3 (the KV read quota STILL exceeded).
- `sportsignal-seo-implementation/IMPLEMENTATION-TRACKER.md` — the Session 08 row (Completed / deployed).
- `seo-implementation/session-reports/SESSION-08.md` — this file.
- `seo-implementation/next-session-prompt.md` — the Session 9 start prompt (competition pages).

### No client asset changed
SW stays `sportsignal-v126`; the client bundle stays `public-13.80.js`; the stylesheet stays `public-13.87.css`. The change is server-side-only (the RUNBOOK §2 rule) — the WebPage node is rendered server-side in the JSON-LD `<script>` block; no client asset renamed.

## 4. The implementation decisions

- **S08-1 — the team-page @graph WebPage node.** `buildTeamPage` gains `JL.webPageNode(path, ctx.fetchedAt, { name: "برنامه بازی‌های " + name })`. The @graph is now Organization + WebSite + WebPage + SportsTeam + ItemList (when indexable) + BreadcrumbList — matching the spec Step-3 contract. Structural JSON-LD hygiene only (the WebPage node is machine-readable, invisible to the SERP snippet — does NOT contaminate the Dec 4-8 GSC measurement). Zero KV/fetch/CPU cost (in-memory object literal). The competition detail page has the SAME gap — deferred to Session 9 (the prompt's Step 6 standing constraint forbids starting Session 9 work this session).
- **S08-2 — the audit confirms the team-page content is already complete (no further content changes pre-Dec-4).** The title ladder, H1, answer sentence, meta description, content blocks, internal links, indexable rule, team-name overrides, and the teams.xml 13-row filter are ALL present + correct + byte-frozen. The phase file says "Preserve useful content; no filler word-count expansion" — the team page already answers next-match intent with the three required blocks. No filler added; no byte-frozen surface changed.
- **S08-3 — the KV read quota is STILL exceeded at Session 8 close (pre-existing, NOT a code issue).** Live `/healthz` (2026-11-16 19:59 UTC): `ok:false` + `pool_matches:0` + `pool_age_min:-1`. The team-page data surfaces (upcoming matches, competition chips, recent results) CANNOT be live-verified while the quota is exceeded — they self-verify once the quota resets at UTC midnight. The SSR-structural change (the WebPage node) is verified by the offline gates + the tsx render harness. The owner should investigate the read-source; a Workers Paid plan ($5/mo → 1M reads/day) is the durable fix.

## 5. Tests

- `npm test` exit 0. **Baseline 3,676 OK → 3,685 OK** (the +9 = the new `check-seo-teampages.js` 8 gates + 1 summary line; `npx tsc --noEmit` clean).
- The new `check-seo-teampages.js` standalone: 8/8 gates pass.
- The tsx render harness (`scripts/s8-team-smoke.ts` — a seeded SeoCtx with Barcelona + an upcoming El Clásico) renders the team page and asserts: (1) the @graph `Organization, WebSite, WebPage, SportsTeam, ItemList, BreadcrumbList`; (2) the WebPage `@id` = `/teams/barcelona#webpage` + `inLanguage: fa-IR` + `isPartOf: #website`; (3) NO SportsEvent; (4) the byte-frozen title «بارسلونا — برنامه بازی بعدی و ساعت شروع | اسپرت سیگنال»; (5) the byte-frozen H1 «برنامه بازی‌های بارسلونا»; (6) the self-canonical `https://sportsignal.ir/teams/barcelona`; (7) robots `index, follow`; (8) a crawlable `<a href="/matches/barcelona-vs-real-madrid-2026-11-23">`. 14/14 assertions pass.
- Local `wrangler dev` smoke: worker boots cleanly (no errors in the dev log); `/healthz` 200; the SEO router resolves `/teams/barcelona` to the 404 data-path on the empty local KV (correct — `findTeamBySlug` returns nothing when the pool is empty; this mirrors the pre-existing production KV-quota issue, NOT a code error).

## 6. Deploy

Versioned deploy via the repo's established ritual (RUNBOOK §2): `npm test` (exit 0) → local `wrangler dev` smoke (worker boots) → `npx wrangler versions upload` → `npx wrangler versions deploy --version-id <id> --percentage 100 --yes` → live verify. The deployment ID + the live `/healthz` version are recorded in `docs/HANDOFF.md` + the tracker after the deploy completes.

**Cloudflare budget of this change:** zero new KV reads (the `webPageNode` call is an in-memory object literal built from `path` + `ctx.fetchedAt` already in scope); zero new KV writes (`kv_writes_day:0`); zero new subrequests; zero new fetches; zero render-cost additions (a small object appended to an existing array). Well within the free-tier budget.

**Deploy-window check:** today is 2026-11-16 (Mon) — NOT Nov 20 (the Bayern–Köln S27 auto-verify windows: kickoff 19:30 UTC, M1 ~19:35, M2 ~21:35-45 UTC). Safe to deploy.

## 7. The KV read quota (pre-existing, STILL OPEN)

The account's 100,000 KV reads/day free-plan limit was exceeded at Session 5 close and was STILL exceeded at Session 6/7/8 close. Live `/healthz` at Session 8 close (2026-11-16 19:59 UTC): `ok:false` + `pool_matches:0` + `pool_age_min:-1` — the pool is unreadable. This is a pre-existing infrastructure issue, NOT a code issue (KV was already failing before the Session 5 deploy served traffic). The worker tail shows `"Settings read failed: KV get() limit exceeded for the day"`. Self-heals at UTC midnight (quota reset). The owner should investigate the read-source (the 10-min cron + public traffic + the bot may collectively exceed 100K reads/day); the durable fix is a Workers Paid plan ($5/mo → 1M reads/day).

**Session 8 implication:** the team-page data surfaces (the upcoming approved matches list, the competition chips, the recent/final results) CANNOT be live-verified while the quota is exceeded — they self-verify once the quota resets at UTC midnight. The SSR-structural change (the WebPage node) is verified by the `check-seo-teampages.js` offline gates + the tsx render harness (14/14 assertions pass on a seeded ctx). The deploy is safe regardless of the quota state — the code change has zero new KV reads (it cannot worsen the quota issue).

## 8. Commit SHAs

- The code checkpoint: `seo(s08): the team-page @graph WebPage node + the check-seo-teampages.js gate + version bump` (the WebPage node in `buildTeamPage`, the new check script, the version bump, the check-stats pins, the CHANGELOG entry).
- The close-out: `seo(s08): session close-out — the report, tracker, handoff, decisions + Session 9 prompt`.

Recorded in `sportsignal-seo-implementation/IMPLEMENTATION-TRACKER.md` Session 08 row after the push.

## 9. Unresolved risks / open follow-ups

- **The S08 data-surface self-verify** (the team-page @graph WebPage node + the byte-frozen title/H1 + the crawlable match hrefs on the LIVE rendered page): once the KV quota resets at UTC midnight, re-verify live on `/teams/barcelona` (200 + `index, follow` + the @graph `WebPage` node + the byte-frozen title/H1 + the crawlable `<a href>` match rows). The SSR-structural change is already verified by the offline gates + the tsx harness.
- **The competition-page WebPage node (Session 9 scope):** `buildCompetitionPage` has the same @graph gap. Session 9 owns it (one-line `JL.webPageNode`/`JL.collectionPageNode` addition).
- **The Dec 4-8 freeze:** the team-page title/H1 bytes are byte-frozen. After Dec 4, apply the parked S2 title-test winning pattern (if any), then continue the content-depth work. A fresh 16-month GSC export is the top evidence request (unlocks the S2 result, the S07-H2 match-page title/H1 byte decisions, the S07-H4 `og:type` decision, the S06-H2 homepage H1 decision, the S06-H3 tomorrow empty-state refinement, the M5 marquee-slug refinement).
- **The KV read quota:** STILL exceeded at S8 close. Re-check at every session close until the owner resolves it (investigate the read-source or upgrade to Workers Paid).

## 10. Session 8 acceptance criteria (from the phase file)

- ✅ **Tests cover selected and non-selected teams** — the `check-seo-teampages.js` gates (the WebPage node + the indexable rule + the byte-frozen title/H1 + the crawlable links) pin the team-page behavior; `check-seo-crawlindex.js` §2 pins the C1 selected-vs-non-selected indexable rule + the sitemap 13-row filter. The tsx harness renders a selected team with upcoming matches (indexable).
- ✅ **Only allowed team URLs can be indexed/sitemap-listed** — the C1 disposition (Session 4, unchanged): `isSelectedTeam` gates the indexable rule + the teams.xml 13-row filter. Non-selected team pages serve `noindex, follow` (200 + self-canonical + crawlable). NOT regressed.
- ✅ **Team names and aliases are consistent** — the S1 M2 F3 spelling fix (`src/seo/team-names.ts`) applies the SEO-visible overrides (Leipzig/Nordsjaelland/Roma) with the dictionary spelling shown once in the altNote; the `seoTeamAltNames` JSON-LD `alternateName` array carries both spellings. Byte-frozen through Dec 4-8. Gated by `check-seo-teamnames.js`.
- ✅ **No regressions in match details** — the Session 7 footer-hook team-link gating (BODY-ONLY, the byte-frozen `<head>` untouched) is unchanged; the match-page title/H1/description/answer funnel is byte-frozen (verified by `check-match-centre.js` S20/S25). The Session 8 change touches ONLY `buildTeamPage`; no match-page code touched.
- ✅ **Selected team pages answer next-match intent** — the answer sentence leads with «بازی بعدی X» (the GSC query head); the upcoming fixtures list + the competition link + the recent results are present and crawlable (verified by the audit + the tsx harness).
- ✅ **The sitemap includes selected teams only** — the teams.xml 13-row filter (Session 4, gated by `check-seo-crawlindex.js` §2). NOT regressed.
- ✅ **Do not create dedicated pages for every team in data feeds** — the C1 disposition: only the 13 selected clubs get indexable team pages; the 74 non-selected URLs serve `noindex, follow` (never robots-blocked, never 404, never redirected, never deleted). NOT regressed.

## 11. Handoff to Session 9

Session 9 owns the competition pages (the `/competitions/{slug}` family — keyword map §2.8-2.13; 5 leagues + UCL + DFB-Pokal). The competition detail page has the SAME @graph WebPage-node gap the team page had (Session 8 noted it; Session 9 should add the `JL.webPageNode`/`JL.collectionPageNode` for parity). The next-session prompt is in `seo-implementation/next-session-prompt.md`. The standing constraints carry: the Dec 4-8 freeze; the Cloudflare free-tier budget; the KV read quota (re-check at S9 close); do not start Session 10+ work in Session 9.
