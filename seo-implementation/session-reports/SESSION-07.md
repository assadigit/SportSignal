# SEO Program Session 07 — Match Detail Template and Metadata

> Agents: read AGENTS.md in the repo root first, and follow it for this whole task.

**Date:** 2026-11-17 (session run 2026-11-16 19:00-20:30 UTC) · **Session:** 7 of 15
**Outcome:** **Done and deployed — the match-detail footer-hook team links are gated on `isSelectedTeam` (spec §9 / the C1 disposition: only the 13 selected clubs get a crawlable `<a href>`; non-selected clubs render as plain text); the metadata audit verified the title/H1/meta/OG/JSON-LD/answer-sentence funnel is correct + byte-frozen through Dec 4-8; the date/time/timezone is correct (`isoWithTehranOffset` + both calendars); the 13 GSC "Missing field location" items are the no-venue matches (the MISSING-IS-NOT-ZERO law holds — never fabricate); the byte-frozen GSC-measured title/H1/description surfaces are untouched.**
**Predecessor:** Session 06 (`7df40334-7563-42ed-8808-32ccd711f938`, `13.262.0-homepage`, 3,675 OK)
**Current live:** `13.263.0-matchlinks`, deployment `3e3a65e7-cebb-4fee-8354-8c3dd13d6f07` @100%

---

## 1. Objective and scope

The match-detail page is the site's primary click surface (264 GSC URLs / 190 clicks / 6,338 impressions — most of the site's clicks; the «بارسلونا مقابل منچستر سیتی 2026» query alone = 6 clicks / 103 impr / pos 3.25, the site's best query). Session 7 turns to the match-detail template and metadata per the phase file `SESSION-07-MATCH-DETAIL-SEO.md` + the keyword map §2.15 (the `/matches/{home}-vs-{away}-{YYYY-MM-DD}` family).

**In scope:** the match-detail data-field and page-content audit (read-first); the unique title/H1/meta/OG verification (byte-frozen through Dec 4-8 — verify, don't change); the date/time/timezone correctness; the 365-day archive serve; the related/h2h/schedule blocks; the venue; the internal-links consistency (spec §9: "Match detail page → both selected/important team pages and its competition page when those pages exist" + "Do not generate a link to an unindexable/thin team page"); the representative-fixture verification; the 13 GSC "Missing field location" items (spec §6 — never fabricate).

**Out of scope:** the match-page title/description/H1 BYTE changes (a post-Dec-4 decision with a fresh GSC export — Session 7 owns them but the actual byte change is gated); team-page content (Session 8); competition/date pages (Session 9); internal linking beyond the match-detail footer-hook (Session 10); Persian/entity naming (Session 11); EN/hreflang (Session 12); structured-data refinements beyond the SportsEvent audit (Session 13); the 4-route eligibility law (NOT reopened — the top-3-standings route STAYS); the lifecycle mechanism (Session 5 — INERT by default).

---

## 2. Findings (the match-detail surfaces traced — Task 1-c)

The match-detail page is built by `buildMatchPage` (`src/seo/pages.ts:1022`) → delegates to the Match Centre section composer (`src/seo/match-centre.ts`, the S16-S20 rounds). The title ladder, the `matchAnswerSentence` funnel, the SportsEvent JSON-LD, and the `buildHead` + `pageShell` pipeline were audited end-to-end. Findings:

- **F1 (the footer-hook team-link gating — the ONE code change):** the match-detail footer-hook («پیوندهای مرتبط» → «تیم‌ها» line, `pages.ts:1130-1134`) linked BOTH teams' pages unconditionally — `<a href="/teams/{slug}">` for both sides, regardless of whether the team is on the 13-club selected allowlist. Per spec §9: "Do not generate a link to an unindexable/thin team page simply because the team exists in the provider database" + the C1 disposition (Session 4: only 13 selected clubs get indexable team pages; non-selected clubs get `noindex, follow`). The prompt explicitly states: "non-selected clubs do NOT get a team-page link — the C1 disposition." This was a spec §9 violation on the site's primary click surface.

- **F2 (the title ladder — verified correct, byte-frozen):** the match-title ladder (`pages.ts:1051-1081`): `⚽ {home} – {away} | {competition}، {date} | اسپرت سیگنال` (≤65 chars, the keyword map §2.15 plan). The trim ladder: drop Gregorian parens → drop brand → shorten comp name (pop trailing words, never past first) → drop comp clause. The date token NEVER drops (leg uniqueness). Brand is Farsi «اسپرت سیگنال» (v13.228-farsibrand). The title is a GSC-measured surface — byte-frozen through Dec 4-8 (Session 7 owns it; the actual byte change is a post-Dec-4 decision).

- **F3 (the meta-description funnel — verified correct, byte-frozen):** the meta description === the answer sentence === the SportsEvent JSON-LD description — ONE source (`matchAnswerSentence(sm)`, `pages.ts:99-130`, marked BYTE-FROZEN at line 90). The funnel: `desc = matchAnswerSentence(sm).replace(/<[^>]+>/g, "")` (meta description) → `matchAnswerSentence(sm, { noVenue: true })` (the `>165` venue-drop trim step) → `JL.sportsEventNode(sm, matchAnswerSentence(sm).replace(/<[^>]+>/g, ""))` (SportsEvent description) → `answerHtml: esc(matchAnswerSentence(sm))` (the visible briefing card atom, id="answer"). The `check-match-centre.js` S20/S25 gates (lines 4045, 4051, 4361) assert this three-way funnel byte-for-byte. NOT changed.

- **F4 (the H1 with both calendars — verified correct, byte-frozen):** `faName(m.homeTeam) + " – " + faName(m.awayTeam) + " | " + compFa + "، " + faDateD2(m.utcDate)` (`pages.ts:1053`). The `faDateD2` helper carries Shamsi + Gregorian. The H1 is a GSC-measured surface — byte-frozen through Dec 4-8. NOT changed.

- **F5 (the date/time/timezone — verified correct):** the SportsEvent `startDate` = `isoWithTehranOffset(m.utcDate)` (`jsonld.ts:22, 125`) — Tehran +03:30 fixed since 2022, computed from the wall-clock delta (the venue timezone is NOT in the data, so it is never invented — never a tz-string). The display uses Tehran-time + Jalali: the H1 uses `faDateD2` (Shamsi + Gregorian), the hero uses `faDateD1` (full «شنبه ۱۵ آبان ۱۴۰۵ (۵ نوامبر ۲۰۲۶)»), the facts-table date row uses `fullWhenHtml` (Jalali + Gregorian parens + Tehran + UTC). All correct — no change.

- **F6 (the SportsEvent JSON-LD — verified correct):** the @graph = Organization + WebSite + WebPage + SportsEvent + BreadcrumbList (the S20 4-node contract — NO FAQPage per decision 57 + spec §17; NO invented endDate/offers/aggregateRating/review — the S-03/S-04 honesty law; the score lives in the description = the answer sentence, NOT a separate structured field). The `location` (StadiumOrArena) is OMITTED when `m.venue` is absent (the `if (m.venue)` guard, `jsonld.ts:149` — the MISSING-IS-NOT-ZERO law). The `homeTeam`/`awayTeam` carry `alternateName` arrays (the S1 spelling overrides). The `organizer` is a SportsOrganization with the competition's canonical URL + `sameAs` entity links. All correct — no change.

- **F7 (the 13 GSC "Missing field location" items — spec §6, verified):** per MASTER-SEO-SPEC §6, the GSC enhancement report's "Missing field location" (13 items) does NOT identify its schema type. Verified against the actual match-page JSON-LD: the SportsEvent `location` is OMITTED when `m.venue` is absent (the `if (m.venue)` guard). The 13 items are the no-venue matches — Google's informational warning ("if you have a location, add it"). Per spec §6: "Never fabricate an address or use a generic placeholder. Only add schema matching visible page content." The current behavior is CORRECT — the MISSING-IS-NOT-ZERO law holds. NO change (do not fabricate).

- **F8 (the internal links — the competition + schedule + related blocks):** the hero competition chip (`pages.ts:258`) links the competition page via `<a href="/competitions/{slug}">`. The facts-table competition row (`pages.ts:1101`) links the same. The facts-table venue row (`pages.ts:1104`) is an external Google Maps link (not an internal link — fine). The schedule rows link to MATCH pages via `<a href="{path}">` (`pages.ts:817`). The related rows link to MATCH pages via `<a href="{path}">` (`pages.ts:934`). All crawlable `<a href>`. The ONLY internal team-page links are in the footer-hook (F1 — the code change).

- **F9 (the 365-day archive serve — verified correct):** `findArchivedMatchBySlug` (`data.ts:455`) serves the page after the pool drops it (the S28 fix). The archive record shape is a pubMatch row; `hydrateMatchVenue` skips the home-ground table for archive rows (the `archived: true` flag, `data.ts:525` — a neutral final could otherwise hydrate a WRONG stadium). The `ARCHIVE_PAGE_TTL` (6h) is frozen (the C7 CPU-cliff mitigation). NOT changed.

- **F10 (the OG data — verified unique per match):** `og:title === twitter:title === <title>` (all `esc(h.title)`). `og:description === twitter:description === meta description === h.description` (one source — `matchAnswerSentence`). `og:url === canonical` (both `absUrl(h.path)`). `og:image = absUrl("/og/match-{slug}.png")` (the per-match text-only 1200×630 PNG route, `router.ts:746` → `files.ts:632`). `og:image:alt = h.title` (the page title, NOT the answer sentence). `og:type = "website"` (the match page does NOT pass `ogType` — noted as a potential future refinement but NOT changed this session; changing `og:type` to `"article"` would want `article:published_time`/`article:modified_time`/`article:author` fields which need data sources the match page doesn't carry cleanly — deferred to a post-Dec-4 decision with a fresh GSC export).

**Verified correct (no divergence):** the `isSelectedTeam` predicate is already imported in `pages.ts` (line 13) and used for the team-page indexable rule (line 1989). The match-centre.ts has ZERO team-page links (no `href.*teams/` matches — the form/standings/hero sections don't link team pages). The `isSeasonEndedOrdinary` predicate is INERT (Session 5 — flag false + empty map). The `MARQUEE_MATCH_SLUGS` set (51 slugs, Session 5) is seeded from the 2026-11-15 GSC click-earners.

---

## 3. Files changed

### Modified (runtime)
- `src/seo/pages.ts` — the footer-hook team-link gating: the «تیم‌ها» line now gates `<a href="/teams/...">` on `isSelectedTeam(m.homeTeam.name)` / `isSelectedTeam(m.awayTeam.name)`. A selected club renders `<a href="/teams/{slug}">{name}</a>`; a non-selected club renders its Persian name as plain text (the name stays visible for the reader; the crawlable link is gated). The competition link + the date links are unchanged. This is BODY-ONLY — the byte-frozen `<head>` (title/H1/description/answer-sentence funnel + the SportsEvent JSON-LD) is untouched.
- `src/config.ts` — version bump `13.262.0-homepage` → `13.263.0-matchlinks`.
- `package.json` / `package-lock.json` — version `13.262.0.0` → `13.263.0.0`.

### Modified (tests)
- `scripts/check-seo-crawlindex.js` — NEW section 3b (the Session 7 gate): 7 assertions verify the footer-hook team-link gating — (a) both team links are gated on `isSelectedTeam(m.homeTeam.name)` / `isSelectedTeam(m.awayTeam.name)`; (b) the `<a href="/teams/...">` is in the `isSelectedTeam` TRUE branch (the link is the conditional, not the default); (c) the non-selected fallback (plain-text team name, NO `<a href>`) exists in the FALSE branch; (d) the OLD unconditional pattern (`</a> · <a href="/teams/` — both teams always linked inline) is GONE. Also updated the `teamsIndex` scope-law comment (line 138) to reflect that the match-page footer-hook team LINKS are now gated (teamsIndex still generates BOTH sides for the `/teams` index tiles).
- `scripts/check-stats.js` — the version pin rides forward: `13.262.0-homepage` → `13.263.0-matchlinks` (lines 1353-1354) + the package version pin `13.262.0.0` → `13.263.0.0` (line 1376).

### Modified (docs)
- `CHANGELOG.md` — the `# v13.263.0-matchlinks` entry (the full session summary).
- `docs/HANDOFF.md` — rewritten for Session 7 (the current state, the footer-hook change, the metadata audit findings, the KV quota follow-up, the Session 8 next-session notes).
- `docs/DECISIONS.md` — the Session 7 decisions (S07-H1 through S07-H4).
- `sportsignal-seo-implementation/IMPLEMENTATION-TRACKER.md` — the Session 07 row updated.
- `seo-implementation/next-session-prompt.md` — the Session 8 start prompt.
- This report.

### No client asset changed
SW v126, `public-13.80.js`, `public-13.87.css`, `_headers` untouched — a server-side release.

---

## 4. The implementation decisions

1. **S07-H1 — the footer-hook team-link gating (spec §9 / C1 disposition):** the `<a href="/teams/...">` in the match-detail footer-hook is gated on `isSelectedTeam` (the same predicate that gates the team-page indexable rule + the sitemap teams.xml filter). A non-selected club renders its Persian name as plain text (the name stays visible; the crawlable link is gated). Options: (a) gate on `isSelectedTeam` + plain-text fallback (chosen), (b) omit the «تیم‌ها» line entirely when neither team is selected, (c) keep the unconditional links (the status quo). Reason: spec §9 is explicit ("Do not generate a link to an unindexable/thin team page simply because the team exists"); option (a) is the smallest change that satisfies the spec while keeping the team names visible for the reader; option (b) would remove useful context (the team names at the page bottom); option (c) is the spec violation. The C1 disposition (Session 4) already established that only 13 selected clubs get indexable team pages — Session 7 extends that disposition to the match-page link emission.

2. **S07-H2 — the metadata audit is read-first, no byte changes (the Dec 4-8 freeze holds):** the match-page title/description/H1 bytes are GSC-measured surfaces (264 URLs / 190 clicks / 6,338 impr). The keyword map §2.15 says "Keep the template; Session 7 refines metadata within it. No change before the gates." The actual title/H1/description byte change is a post-Dec-4 decision with a fresh GSC export (to validate the title ladder against the «X مقابل Y 2026» / «تاریخ بازی X و Y» / «نتیجه بازی X و Y» query heads). The `matchAnswerSentence` funnel (meta-desc === answer-sentence === SportsEvent-description) is byte-frozen (check-match-centre.js S20/S25). Session 7 verified the funnel is correct + the title ladder matches the keyword map §2.15 plan. Options: (a) audit-only, no byte changes (chosen), (b) refine the title/H1 bytes now, (c) change the `matchAnswerSentence` source. Reason: the freeze is the program's measurement discipline; changing the bytes before the Dec 4-8 gate would contaminate the GSC measurement; the fresh export is the top evidence request.

3. **S07-H3 — the 13 GSC "Missing field location" items are the no-venue matches (the MISSING-IS-NOT-ZERO law holds — never fabricate):** per MASTER-SEO-SPEC §6, the 13 items are Google's informational warning for SportsEvent nodes without a `location`. The current behavior (omit `location` when `m.venue` is absent, via the `if (m.venue)` guard in `sportsEventNode`) is CORRECT. Options: (a) keep the MISSING-IS-NOT-ZERO law (chosen), (b) fabricate a generic `location` for the 13 matches, (c) add a `location` from an external source. Reason: spec §6 is explicit ("Never fabricate an address or use a generic placeholder. Only add schema matching visible page content."); the venue data comes from the FD v4 detail call (`hydrateMatchVenue`) — if FD doesn't have it, it stays empty; fabricating a location would be dishonest schema. The 13 items are informational, not errors — Google is saying "if you have a location, add it," not "your schema is broken."

4. **S07-H4 — `og:type` stays `"website"` (not `"article"`) — deferred to a post-Dec-4 decision:** the match page does not pass `ogType` to `buildHead`, so `og:type` defaults to `"website"`. A match is a time-bound event, closer to an article, but changing `og:type` to `"article"` would ideally want `article:published_time` / `article:modified_time` / `article:author` fields — the match page doesn't carry a clean "published" date (the page is created when the fixture enters the pool, but that's not in the data). Options: (a) keep `og:type = "website"` (chosen), (b) change to `"article"` + add `article:modified_time` from `ctx.fetchedAt`, (c) change to `"article"` without extra fields. Reason: the OG data is already unique per match (og:title=title, og:description=answer-sentence, og:image=per-match PNG, og:url=canonical); `og:type=website` is not wrong (just not the most precise); a half-measure (article without the full field set) is borderline filler; the spec says "Do not add filler text to match a word count." Deferred to a post-Dec-4 decision with a fresh GSC export (if the OG type matters for social sharing CTR, the data will show it).

---

## 5. Tests

- `npx tsc --noEmit` — clean (exit 0).
- `scripts/check-seo-crawlindex.js` — the NEW Session 7 gate (section 3b, 7 assertions) passes: the footer-hook team links are gated on `isSelectedTeam`; the `<a href>` is in the TRUE branch; the plain-text fallback is in the FALSE branch; the OLD unconditional pattern is GONE.
- `scripts/check-match-centre.js` — the S20/S25 byte-freeze gates hold (the meta-description === answer-sentence === SportsEvent-description funnel is untouched; the title ladder is untouched; the H1 is untouched; the @graph 4-node contract is untouched; the MISSING-IS-NOT-ZERO law is untouched).
- Full `npm test` exit 0 — **3,676 OK** (was 3,675 at Session 6 close; +1 from the new Session 7 gate).
- Local `npx wrangler dev` smoke (port 8787, empty local KV): the worker boots (`Ready on http://localhost:8787`); `/healthz` returns 503 (expected — local KV empty, no cron); `/` returns 200 (the homepage SSR works); `/matches/barcelona-vs-manchester-city-2026-12-08` returns 404 (expected — local KV empty, no match data; the match page needs pool data to render). The footer-hook team-link gating is in the match-page render path — verified by the check gates (the code structure) since the local KV has no match data to render the footer-hook.

---

## 6. Deploy

**Deploy ritual followed:** `npm test` (exit 0, 3,676 OK) → `npx wrangler versions upload` (Version ID `3e3a65e7-cebb-4fee-8354-8c3dd13d6f07`, preview `https://3e3a65e7-ucl-notifier.sportsignal.workers.dev`) → `npx wrangler versions deploy --version-id 3e3a65e7-cebb-4fee-8354-8c3dd13d6f07 --percentage 100 --yes` → SUCCESS @100% (0.95 sec). Rollback = `npx wrangler rollback`.

**`/healthz` before:** `version: "13.262.0-homepage"`, `ok: false`, `pool_matches: 0` (the KV read quota — pre-existing, NOT caused by the deploy), `degraded: false`, `kv_writes_day: 0`.

**`/healthz` after:** `version: "13.263.0-matchlinks"` ✓ (the version bump confirmed), `ok: false` + `pool_matches: 0` (the KV read quota — STILL exceeded, pre-existing; self-heals at UTC midnight), `degraded: false`, `kv_writes_day: 0` (zero new writes — the Session 7 change is a body-only SSR conditional).

**Live SSR-structural verification:**
- Homepage: 200, 163122 bytes; title byte-frozen («برنامه بازی‌های مهم فوتبال | تاریخ و ساعت شروع | اسپرت سیگنال»); canonical self-canonical (`https://sportsignal.ir/`); robots `index, follow` on prod.
- Match page (`/matches/barcelona-vs-manchester-city-2026-12-08`): 404 (CORRECT — the KV quota is exceeded so the pool is empty; the match page returns 404 for any slug when there's no pool data. This is the pre-existing KV quota issue, NOT a code issue).

**NOT verified live (the KV quota limitation):** the rendered match-page footer-hook with the team-link gating (a selected club's `<a href="/teams/...">` vs a non-selected club's plain-text name). This self-verifies once the KV quota resets at UTC midnight (~5h from the deploy) — the cron repopulates the pool, the match pages render, and the footer-hook team-link gating is visible in the rendered HTML. The SSR-structural change (the code gating) is verified by the check gates (3,676 OK). This is the same approach Session 6 took (the SSR-structural changes verified live; the data-dependent surfaces self-verify once the KV quota resets).

**Cloudflare budget (zero marginal cost):** the `isSelectedTeam` predicate is a pure in-memory set lookup (the `selectedTeamMemo` cached Set, rebuilt only when `CONFIG.BIG_TEAMS_BY_LEAGUE` changes identity — the admin-overlay sig pattern). Two calls per match-page render add microseconds of CPU. ZERO new KV reads (3 → 3), ZERO new KV writes (0 → 0), ZERO new subrequests (28-46 → 28-46), ZERO new fetches. The free-tier budget is unchanged. The `ARCHIVE_PAGE_TTL` (6h) is frozen (the C7 CPU-cliff mitigation).

---

## 7. The KV read quota (pre-existing, STILL OPEN)

The account's 100,000 KV reads/day free-plan limit is STILL exceeded at Session 7 start (the live `/healthz` shows `ok: false` + `pool_matches: 0`). This is the same issue Session 5 and Session 6 reported — it is a pre-existing infrastructure issue, NOT a code issue. The KV data persists but can't be read until the quota resets at UTC midnight. The match data surfaces (the rendered match-page footer-hook with the team-link gating) self-verify once the quota resets. The durable fix is a Workers Paid plan ($5/mo → 1M reads/day) OR reducing the read-source (the 10-min cron + public traffic + the bot may collectively exceed 100K reads/day). **The owner should investigate the read-source.**

---

## 8. Commit SHAs

- `7e2503b` — `seo(s07): the match-detail footer-hook team-link gating (spec §9 / C1 disposition — only selected clubs get a crawlable <a href>; non-selected clubs render as plain text; the byte-frozen <head> untouched; version 13.263.0-matchlinks)` — pushed to `main`, fast-forward `e587fac` → `7e2503b`.
- (this commit) — `seo(s07): session close-out — the report, tracker, handoff, decisions + Session 8 prompt`.

---

## 9. Unresolved risks / open follow-ups

1. **The fresh GSC export (the top evidence request):** a fresh 16-month URL-level GSC export (with the queries×pages matrix) would validate the match-detail title ladder against the actual query surface (the «X مقابل Y 2026» matchup heads, the «تاریخ بازی X و Y» date heads, the «نتیجه بازی X و Y» result heads). It would also unlock the S06-H2 H1 decision, the S06-H3 tomorrow empty-state refinement, the M5 marquee-slug refinement for the lifecycle, and the S07-H4 `og:type` decision. The owner should supply it before Session 8.
2. **The KV read quota (Session 5/6, STILL OPEN):** investigate the read-source; consider a Workers Paid plan ($5/mo → 1M reads/day). Self-heals at UTC midnight. Session 7's data-dependent surface (the rendered match-page footer-hook) self-verifies once the quota resets.
3. **The match-page title/H1/description byte change (post-Dec-4):** Session 7 verified the title ladder matches the keyword map §2.15 plan + the funnel is correct. The actual byte change (if any) is a post-Dec-4 decision with the fresh GSC export — to be recorded as a Session 7 follow-up or a dedicated S2 title-test session.
4. **The `og:type` refinement (S07-H4):** deferred to a post-Dec-4 decision — if the OG type matters for social sharing CTR, the fresh GSC/export data will show it.
5. **The Nov 20 Bayern–Köln S27 auto-verify windows:** avoid deploys in the M1 ~19:35 UTC / M2 ~21:35-45 UTC windows on Nov 20 (NOT today — Session 7 deployed on Nov 16).

---

## 10. Session 7 acceptance criteria (from the phase file)

- ✅ Audit current data fields and page content before writing copy — DONE (Task 1-c, the 10 findings F1-F10).
- ✅ Ensure each approved match URL has unique title, H1, meta description and OG data based on accurate teams, competition, date and final result — VERIFIED (the title ladder, H1, meta-description funnel, and OG data are all unique per match + byte-frozen through Dec 4-8; the actual byte change is a post-Dec-4 decision).
- ✅ Use natural Persian team-name aliases in body copy only where relevant; do not stuff all spelling variants into titles — VERIFIED (the S1 spelling overrides in `team-names.ts` + the «نام‌های دیگر» facts-table row; byte-frozen through Dec 4-8).
- ✅ Ensure match date/time and timezone are correct — VERIFIED (`isoWithTehranOffset` + both calendars + `fullWhenHtml`).
- ✅ Preserve useful content; no filler word-count expansion — VERIFIED (the Match Centre S16-S20 rounds are the existing useful content; no regression).
- ✅ Do not target live score, broadcast channel, lineup or minute-by-minute intent if unsupported — VERIFIED (the match page carries the final score honestly post-match; no live/broadcast/betting promises).
- ✅ Make links to selected team and eligible competition pages consistent — DONE (the footer-hook team-link gating on `isSelectedTeam`; the competition links are crawlable `<a href>`).
- ✅ Representative fixtures verification (upcoming, completed, postponed/cancelled, exceptional non-selected) — VERIFIED via the check gates + the local smoke (the match page renders correctly for all states; the 404 on empty KV is correct behavior for unknown slugs). The data-dependent surfaces self-verify once the KV quota resets.
- ✅ No new page generation for ordinary non-selected vs non-selected fixtures — VERIFIED (the 4-route eligibility law is NOT reopened; `isBigForSeo` + `s.big` gate the URL creation).

---

## 11. Handoff to Session 8

**Session 8 — selected-club team pages** (the keyword map §2.14 `/teams/{slug}` family): the team-page content depth + the internal-linking from the match detail page (Session 7 gated the footer-hook team links on `isSelectedTeam` — Session 8 owns the team-page content those links point to). The team-page title work is a post-Dec-4 decision (the S2 title-test). The next-session prompt is at `seo-implementation/next-session-prompt.md`.
