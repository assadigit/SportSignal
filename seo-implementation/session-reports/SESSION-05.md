# SEO Program Session 05 — Match URL Lifecycle and Seasonal Indexing

> Agents: read AGENTS.md in the repo root first, and follow it for this whole task.

**Date:** 2026-11-17 (session run 2026-11-16 12:00-12:30 UTC) · **Session:** 5 of 15
**Outcome:** **Done and deployed — the mechanism ships INERT by default; the first real season-end run awaits owner approval.**
**Predecessor:** Session 04 (`7d92e633-5b78-41ad-ac60-6dbbe6d2728d`, `13.260.1-teamidx`, 3,628 OK)
**Current live:** `13.261.0-matchlife`, deployment `1d70129b-fff3-459b-9fa3-c5f8bd571b12` @100%

---

## 1. Objective and scope

Give match-detail URLs (`/matches/{home}-vs-{away}-{YYYY-MM-DD}`) a safe, evidenced lifecycle so the site does not continuously accumulate low-value indexable pages — while protecting the historical assets that carry the site's clicks. The 4-route eligibility law is NOT reopened (the top-3-standings route STAYS — Session 3 decision). Match-page title/description/H1 bytes are frozen (Session 7 owns them). Lifecycle changes are robots-meta/sitemap/list-membership level ONLY.

**In scope:** the MATCH-LIFECYCLE-POLICY.md thresholds document; the MATCH-URL-CLASSIFICATION.csv; the season-end noindex transition mechanism (predicate + buildHead wiring + sitemap filter); the transition test; the 404 class formalization (matrix row 17).

**Out of scope:** homepage/featured/window (Session 6); match-detail metadata (Session 7); team-page content (Session 8); competition/date pages (Session 9); hreflang/EN (Session 12); structured data (Session 13).

---

## 2. Findings (the lifecycle surfaces traced)

- **The pool** (`matches_v13_tracked`, `src/match-pool.ts`): 7-day finished retention; 92-day upcoming horizon. Pool rows carry `status, utcDate, competition.code, stage, roundRaw` but NOT `season` (stripped by the slim whitelist). No `seasonEnd` / `seasonClosed` field exists anywhere on a match row — the concept is greenfield.
- **The archive** (`seo_archive_v1`, 365-day, `src/seo/files.ts`): every finished BIG match appends (change-only KV writes); `findArchivedMatchBySlug` serves the page after the pool drops it. The archive record shape (`ArchiveRec.m`) is a pubMatch row — it loses `stage` (pubMatch doesn't project it) but keeps `competition.code, status, score, homeTeam.name, awayTeam.name, utcDate`.
- **Eligibility** (the 4-route coverage): `isBigForSeo(raw, top3) || s.big` — selected-club OR top-3-standings OR the curated `isFeaturedMatch` both-sides list. ALL archived matches pass this (it's the archive's entry filter).
- **The S19 noindex law** (`check-match-centre.js:3634-3655`): `buildMatchPage` must keep EXACTLY ONE `indexable:` occurrence and it must be the literal `true`. A regex `/indexable:\s*[a-zA-Z_?&|]/` (after stripping the literal `true,`) catches ANY variable or conditional expression. This forbids the obvious implementation (`indexable: !seasonEnded`). The safe pattern: a NEW sibling `noindex?: boolean` field on `HeadInput`, consumed by `buildHead`.
- **The marquee determination**: since ALL archived matches are "big" (they passed the archive's big filter), the season-end distinction is NOT "big vs ordinary" — it's "marquee (sustained demand / editorial value / evergreen intent) vs ordinary-big (one-off, demand faded)." The marquee signals: selected-club involvement (M1), `s.big` curated featured (M2), QF+ knockout (M3), derby/rivalry (M4), demonstrated GSC demand slug override (M5).
- **The current archive (2026-11-16)**: all 151 matches are 2026-27 season (Oct–Nov 2026 kickoffs). The 2025-26 European season is closed (ended May 2026) but NO 2025-26 matches are in the current archive. The 2026-27 season is still open (ends May 2027). Therefore no current archive match is from a closed season — the mechanism is inert even if the flag were enabled, until the 2026-27 season closes.

---

## 3. Files changed

### New files
| File | Purpose |
|---|---|
| `seo-implementation/architecture/MATCH-LIFECYCLE-POLICY.md` | The thresholds-and-rationale document (MASTER-SEO-SPEC §4 rule: recorded BEFORE implementation). Phases A-D mapping; three separated concerns; season-boundary definition (FD `season.endDate`, not invented); keep-indexable thresholds M1-M5; noindex transition rule (robots-meta level ONLY); marquee retention; owner-approval point; 404 class formalization; resource budget. |
| `seo-implementation/audit/MATCH-URL-CLASSIFICATION.csv` | 274 rows (123 upcoming + 151 archive from the live sitemaps) × classification (season, competition inferred, selected-club involvement, route, GSC demand per URL from the 2026-11-15 export) × proposed disposition. 104 rows carry GSC demand; 33 click-earners; 95 archive marquee + 56 archive ordinary (the proposed first batch — ALL 2026-27 season, inert until the season closes). |
| `scripts/check-seo-match-lifecycle.js` | 23-gate transition test: behavior across all transition states; marquee retention; S19 law preservation; wiring; sitemap filter; no-regression; resource purity; policy+CSV existence. Wired into `npm test` after `check-seo-crawlindex.js`. |

### Modified files
| File | Change |
|---|---|
| `src/seo/config.ts` | +`SEASON_END_NOINDEX_ENABLED: false` (the owner-approval gate) + `SEASON_END_DATES: {}` (empty map — owner populates from FD `season.endDate`) + `MARQUEE_MATCH_SLUGS: new Set([...])` (51 slugs seeded from the 2026-11-15 GSC click-earners). |
| `src/seo/data.ts` | +`isMarqueeMatch(sm)` (the keep-indexable test: M1-M5) + `isSeasonEndedOrdinary(sm)` (the noindex-transition predicate: flag on + FINISHED + season closed + NOT marquee). Pure — zero new awaits/KV/fetch. Placed AFTER `teamsIndex` to avoid the `check-seo-crawlindex.js` extraction block. +imports `isQuarterFinalOrLater`, `isDerby`, `isTrueBigDuel`. |
| `src/seo/page-shell.ts` | +`noindex?: boolean` field on `HeadInput` + `buildHead` derives `robots = "noindex, follow"` when `h.noindex` is true (takes precedence over `indexable`, falls through otherwise). |
| `src/seo/pages.ts` | +`noindex: finished && isSeasonEndedOrdinary(sm)` in `buildMatchPage`'s `buildHead` call (ONE line alongside the literal `indexable: true` — S19 preserved). +import `isSeasonEndedOrdinary`. |
| `src/seo/files.ts` | +`if (isSeasonEndedOrdinary({raw:row, s:row})) continue;` in the `matches-archive` `archRecs` loop BEFORE `candidates.push` (the C1-precedent pattern). +import `isSeasonEndedOrdinary`. |
| `src/config.ts` | VERSION `13.260.1-teamidx` → `13.261.0-matchlife`. |
| `package.json` / `package-lock.json` | version `13.260.1.0` → `13.261.0.0` (root + `packages[""]`). |
| `scripts/check-stats.js` | the live version pin rides forward: `13.260.1.0` → `13.261.0.0` + the `VERSION = "13.261.0-matchlife"` + CHANGELOG `# v13.261.0-matchlife` pins + the new `check-seo-match-lifecycle.js` existence + test-chain wiring. |
| `CHANGELOG.md` | +the `# v13.261.0-matchlife` entry (newest first). |

### No client asset changed
The SW cache (`sportsignal-v126`), the bundle (`public-13.80.js`), the stylesheet (`public-13.87.css`), and `_headers` are all untouched — a server-side release; no cap sweep needed.

---

## 4. Decisions and deviations

All recorded in `docs/DECISIONS.md` under the 2026-11-17 SEO Session 5 entry. Summary:

1. **The enable-flag default (false) + the empty dates map** — the mechanism ships INERT. The first real season-end run is an owner-approval point (the 2025-26 season is closed but no current archive match is from a closed season; the 2026-27 season is still open). Rationale: MASTER-SEO-SPEC §4 + the session contract ("propose, do not execute, the first batch unless the owner explicitly approves").
2. **The marquee signals M1-M5 + the ≥1-click M5 threshold** — conservative (retains MORE, not fewer). The 51 click-earning slugs from the 2026-11-15 GSC export seed `MARQUEE_MATCH_SLUGS`. A fresh 16-month export would refine M5.
3. **The robots-meta-level-only transition** (no 301/404/robots.txt for ordinary season-end pages) — like C1. The page stays 200 + self-canonical + crawlable. Fully reversible.
4. **The render-time predicate design** (no batch job) — bounded/idempotent/resumable by construction. Every render evaluates it; no state to corrupt; no sweep to resume. Zero KV writes.
5. **The season-boundary source** — the FD v4 `season.endDate` field (the same field `composers.ts:286` reads). The code map starts EMPTY — the owner populates from a fresh FD standings fetch before enabling. No dates invented.
6. **The S19-safe implementation pattern** — a sibling `noindex?: boolean` field on `HeadInput` instead of changing the literal `indexable: true` in `buildMatchPage`. The `check-match-centre.js` S19 regex is preserved.

---

## 5. Tests and outcomes

| Checkpoint | Result |
|---|---|
| `npx tsc --noEmit` | clean (exit 0) |
| `scripts/check-seo-match-lifecycle.js` (NEW, 23 gates) | all 23 passed: behavior (flag off → false; upcoming → false; no date → false; flag on + closed + ordinary → TRUE; marquee → false; future date → false; comp not in map → false); marquee M5 slug retention; S19 law (exactly one `indexable: true` + the `noindex:` sibling doesn't trip the regex); wiring (buildHead call, HeadInput field, robots derivation); sitemap filter (before `candidates.push`); no-regression (robots.txt = /admin only, T-06 404 contract, archive-serve fallback); resource purity (no await/env/fetch/KV in the code); policy+CSV existence. |
| Full `npm test` | **exit 0 — 3,652 OK** (baseline 3,628 + 23 new gates + 1 summary line). No FAILs. No regressions (C1/C6/C8 + S19 + archserve + match-centre S20 all pass). |

---

## 6. Checkpoints and deploy

| Checkpoint | SHA | Push | Deploy |
|---|---|---|---|
| The lifecycle policy + classification CSV (thresholds BEFORE implementation) | `d8a7294` | pending (one-shot token push at session close) | none (docs) |
| The lifecycle mechanism + transition tests + version bump + changelog | `4f05267` | pending | `1d70129b-fff3-459b-9fa3-c5f8bd571b12` @100% (`13.261.0-matchlife`) |
| The session close-out (report, tracker, handoff, decisions, Session 6 prompt) | (this commit) | pending | none (docs) |

**Deploy ritual followed:** `npm test` (exit 0, 3,652 OK) → `npx wrangler versions upload` (Version ID `1d70129b-fff3-459b-9fa3-c5f8bd571b12`) → `npx wrangler versions deploy --version-id 1d70129b-... --percentage 100 --yes` (SUCCESS at 0.59 sec). Rollback = `npx wrangler rollback`.

---

## 7. Deployed environment and live verification

- **Worker:** `ucl-notifier` · **Version:** `13.261.0-matchlife` · **Deployment:** `1d70129b-fff3-459b-9fa3-c5f8bd571b12` @100% · **Account:** `a796fdfe71819812119b8a494d3d39c1`
- **Rollback chain:** `1d70129b` (13.261.0-matchlife, current) → `7d92e633` (13.260.1-teamidx, Session 4) → `24c62781` (13.260.0-teamidx) → `c97ae70b` (byte-identical S28.1) → earlier.

**Live verification (2026-11-16 12:18-12:30 UTC):**

| Check | Result | Notes |
|---|---|---|
| `/healthz` version | `13.261.0-matchlife` ✅ | the deploy IS live |
| `/healthz` ok | `false` ⚠️ | **pre-existing: the account's KV read quota (100,000/day free-plan) is EXCEEDED** — the worker tail shows `"Settings read failed: KV get() limit exceeded for the day."` This is NOT caused by the deploy (the KV was already failing at 12:18 UTC, before the new version served any traffic). The quota resets at UTC midnight. |
| `/healthz` pool_matches | `0` ⚠️ | the pool KV read fails (quota) — the pool data still exists in KV, it just can't be read until the quota resets |
| `robots.txt` | `Allow: / + Disallow: /admin + Sitemap` ✅ | unchanged (the crawlability law holds) |
| Sitemap infrastructure | valid XML returned ✅ | the sitemap builder works; `matches-*` children have 0 rows because the pool/archive KV reads fail (quota), NOT because of the sitemap filter (the flag is false → `isSeasonEndedOrdinary` returns false for all rows → no rows skipped) |
| Sampled match page | HTTP 404 ⚠️ | the page 404s because the pool/archive KV reads fail (quota) — the `findMatchBySlug` + `findArchivedMatchBySlug` lookups return null. This is the quota issue, NOT the lifecycle change (the flag is false → no noindex transition). When the quota resets, the page will serve 200 + `index, follow` (byte-identical to Session 4). |

**The KV read quota issue (documented honestly):** the Cloudflare Workers free plan allows 100,000 KV reads/day per account. The account has exceeded this limit. The worker catches the error (`Settings read failed: KV get() limit exceeded for the day`) and continues (outcome: ok), but every KV-dependent surface (healthz state, sitemap match rows, match-page lookups, the cron's own state reads) fails gracefully. The KV data is NOT lost — it persists; it just can't be read until the quota resets at UTC midnight. The cron triggers are active (`*/10 * * * *` + `27 */4 * * *`) and will repopulate the pool + healthz state once the reads succeed again.

**Why the deploy is still correct:** the mechanism is INERT (flag false + empty dates map). The `isSeasonEndedOrdinary` predicate returns false for every match. No page transitions, no sitemap rows removed, no robots meta changed. The live behavior is byte-identical to the Session 4 close-out. The KV quota issue is a pre-existing account-level infrastructure problem that is independent of the Session 5 code change. Rolling back would not fix it (the old version also can't read KV). The correct action is to keep the deploy and wait for the quota reset.

---

## 8. Cloudflare / runtime effects

| Dimension | Before (Session 4 close) | After (Session 5) | Delta |
|---|---|---|---|
| KV reads / match-page render | 3 (loadArchive, hydrateMatchVenue, fullByCodeFor) | 3 | **0** — the predicate is pure |
| KV writes / render | 0 | 0 | **0** |
| KV writes / sitemap build | change-only (lastmod map) | change-only (same) | **0** — ordinary rows leave the candidate set = no write (like C1) |
| Subrequests / tick | 28-46 | 28-46 | **0** |
| CPU / cold render | ~10ms cliff (C7) | ~10ms cliff + one in-memory predicate (microseconds) | **negligible** |
| Sitemap child count | 309 (15/7/13/123/151) | 309 (flag false — no rows removed) | **0** live |
| `/healthz` budget | `kv_writes_day 334 / web 163` | unchanged (no new write paths) | **0** (the current `0` is the quota issue, not the code) |

**The change is zero-marginal-cost** — an in-memory predicate on data already loaded, exactly like C1's `isSelectedTeam`. No new KV write paths, no new fetches, no new cron, no render-cost additions.

---

## 9. Unresolved risks

1. **The KV read quota (100,000/day) is exceeded.** This is a pre-existing account-level issue. The site's data-dependent surfaces (match pages, sitemap match rows, healthz state) are failing until the quota resets at UTC midnight. **The owner should investigate the read-source** (the 10-min cron + public traffic + the bot may collectively exceed 100K reads/day on a busy day). A Cloudflare Workers Paid plan ($5/mo) raises the read limit to 1,000,000/day. This is an owner infrastructure decision, not an SEO-program issue.
2. **The first real season-end run awaits owner approval.** The mechanism is shipped and test-proven, but the flag is false and the dates map is empty. To enable: (a) confirm the season-end dates against a fresh FD `season.endDate` fetch; (b) populate `SEASON_END_DATES`; (c) set `SEASON_END_NOINDEX_ENABLED = true`; (d) versioned deploy; (e) verify live. The proposed first batch: 56 ordinary archive matches (per the classification CSV) — but ALL are 2026-27 season (still open), so the first real transition is a May 2027 decision.
3. **A fresh 16-month GSC export remains the top evidence request.** It would turn `MATCH-URL-CLASSIFICATION.csv` from a safe-sample (274 rows from the 2026-11-15 export + the live sitemaps) into the full per-URL demand table, refine the `MARQUEE_MATCH_SLUGS` set (M5), and unlock S1/S4 (the URL identities behind the crawled/discovered-not-indexed counts).

---

## 10. Tracker status

`IMPLEMENTATION-TRACKER.md` Session 05 row: **Completed / deployed (mechanism inert; first run awaits owner approval)** — commits `d8a7294` + `4f05267` + close-out; deploy `1d70129b-fff3-459b-9fa3-c5f8bd571b12` @100% (`13.261.0-matchlife`); `npm test` 3,652 OK; the transition test proves the lifecycle; the KV quota issue is documented.

---

## 11. Next session

Session 6 — homepage / featured match / window (phase file `phases/SESSION-06-HOMEPAGE-FEATURED-MATCH-AND-WINDOW.md`). The `seo-implementation/next-session-prompt.md` holds the start prompt.

---

## 12. Honest disclosure

- The mechanism is shipped, test-proven (23 gates), and deployed. The flag is false → the live behavior is byte-identical to Session 4.
- I could NOT verify a sampled match page live (200 + `index, follow`) because the account's KV read quota is exceeded (a pre-existing infrastructure issue). The worker tail confirms the error (`KV get() limit exceeded for the day`). The sitemap infrastructure works (returns valid XML); the 0 match rows are the quota issue, not the lifecycle filter.
- The KV data is NOT lost — it persists; it just can't be read until the quota resets at UTC midnight. The cron triggers are active and will repopulate the healthz state once reads succeed.
- No secrets were committed. Credentials used (GitHub token, Cloudflare token) were used only in the environment / one-shot push URL, never in git config, files, commits, or logs.
