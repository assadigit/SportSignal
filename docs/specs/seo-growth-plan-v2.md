> Agents: read AGENTS.md in the repo root first, and follow it for this whole task.

# sportsignal.ir — SEO growth plan v2

- **Date:** 2026-11-10
- **Replaces nothing.** It sits on top of `docs/SPORTSIGNAL_SEO_GEO_SPEC.md`, `docs/SPORTSIGNAL_SEO_GEO_SPEC_PHASE2.md` and `docs/SEO_IMPLEMENTATION_REPORT.md`, which cover the technical build. This plan covers the next stage: earning clicks.
- **Evidence:** `docs/audits/2026-11-10-gsc-audit.md` (Search Console, Oct 10 – Nov 7, 2026).
- **Built with:** the `seo-plan` skill structure (discovery, strategy, roadmap, KPIs) and the `marketing-seo-audit` rankings-push method.

---

## 1. Where we are

The technical foundation is finished: every match, team and competition has its own server-rendered page, a sitemap with honest dates, canonical tags, structured data, redirects, IndexNow, and AI-crawler access. Google already shows the site (6,945 impressions in 4 weeks).

What is missing is **clicks**. 65% of visible impressions are on page 2, only 33.7% are at positions 1–10, and half of all clicks come from four Barcelona / Real Madrid games.

So the plan has one goal for the next 90 days: **move match pages from positions 10–20 into positions 1–10, without breaking what already works.**

## 2. Who we serve

Persian-speaking football fans, almost all on a phone (97%), mostly in Iran (91%), a few in Afghanistan (6%). They type short questions like "X مقابل Y", "مکان تماشای X درمقابل Y", "بازی بعدی X", in Tehran time. The site's strength: a fast, accurate, clean page for exactly that question.

Established Persian sports sites will win the generic queries. We do not compete there. We compete on **specific fixture pages for big European games**, where a precise answer beats a broad portal.

## 3. Three growth levers (in this order)

**Lever 1 — Win page one on match pages.** Smallest changes first:
1. Spell team names the way people type them (SEO surface only).
2. Make sure each upcoming match has at least 3 internal links pointing to it.
3. Only then change titles, through a controlled test (section 5).

**Lever 2 — Keep and copy the hubs.** The today / tomorrow / this-weekend pages already get an 8.1% click rate. Leave them alone. After the Dec 4 read, consider competition-specific hubs (for example Champions League this week).

**Lever 3 — Serve the questions we do not answer yet.** "Where to watch" is the only unserved pattern with a real click rate (3.0%). Lineups and timeline have impressions but no clicks. This needs data we may not have, so it starts as an investigation, not a build.

## 4. Match page lifecycle (what each page should do)

| Stage | What people search | What the page must show |
|---|---|---|
| 3+ weeks before | Date, "X مقابل Y", next match | Date and time in Tehran time and UTC, competition, stage, venue, form, links from home/hubs/team pages |
| Match week | Time, where to watch, lineups | Same, plus a "where to watch" block **only if verified data exists** |
| After the game | Result | Final score block (already built); keep URL stable; keep it linked from both team pages |

The data shows no "result" searches yet (0 of 206 queries), so there is no reason to rework post-game titles now. Watch for this each week.

## 5. Rules of the road (measurement discipline)

These exist because the site changed several times in its first month, so no single change can be judged.

1. **One change per group of pages.** If two changes touch the same pages in the same 3–4 weeks, we learn nothing.
2. **Wait 3–4 weeks before judging** a title or content change. Record the page's starting position, impressions and click rate first.
3. **Keep a control group.** For title tests, a fixed half of the pages (chosen by a deterministic rule on the page address, not at random each time) keeps the old title.
4. **Same-position comparisons only.** Compare click rates between pages at similar positions, not site-wide averages (more impressions at positions 10–14 lowers the site-wide rate by itself).
5. **Stop rule.** If two rounds on a page move nothing, stop editing it. The limit is probably authority or search intent, not wording.
6. **Everything goes in `docs/SEO_GSC_LOG.md`**: date, what changed, which pages, baseline numbers. No log entry means it did not happen.

## 6. Roadmap

Phases follow the `seo-plan` skill (foundation, expansion, scale, authority), compressed because the foundation is already done.

### Phase 1 — Quick wins (Nov 10 – Dec 4)
- **S1 (this plan's first agent session, see section 8):** save the audit and this plan into the repo; spelling fix on the SEO surface (Leipzig, Nordsjælland, Roma); internal-link coverage check and fix for matches in the next 14 days; start `docs/SEO_GSC_LOG.md` with the baseline.
- **Investigation (report only):** can the repo's data providers give broadcaster or lineup data? Result goes into `docs/audits/`.
- **Owner:** export Search Console again on about Nov 20 and on Dec 4 (steps in section 9). Add the Indexing → Pages export.
- **Hands off:** the title template, the hubs, the sitemap.

### Phase 2 — Read, then test (Dec 4 – Jan 15)
- Read the Nov 6 title change (⚽ and Farsi brand) using same-position click rates.
- **S2:** title wording test «X مقابل Y» on half of the match pages (control = other half), behind an off-by-default switch in `src/seo/config.ts`.
- Test one team-page title change on about 10 team pages.
- If the investigation found usable data: **S3** builds the "where to watch" or lineup block on match pages.

### Phase 3 — Scale (Jan 15 – Mar)
- Roll out whatever won in Phase 2 to all pages.
- Competition-specific hubs if the hubs keep their lead.
- Light, honest outreach: the site's X account and Telegram channel, Persian football communities. No paid links, no link schemes.
- Ask: does Google show our pages as the answer for "next match" searches? Check weekly.

### Phase 4 — Authority (Mar – Jun)
- Repeat the read-test-roll-out cycle each month.
- Review the Afghanistan audience (small idea: a Kabul-time line).
- Re-run the full audit with 6 months of data and replace this plan with v3.

## 7. KPI targets

Baseline = Nov 1–7 unless noted. **Targets are planning guesses, not forecasts.** A one-month-old site has no history to forecast from, so revisit them on Dec 4 and Feb 10.

| Metric | Baseline | 3 months (Feb 10) | 6 months (May 10) | 12 months |
|---|---|---|---|---|
| Clicks per day | 8.1 | 15 | 30 | 60 |
| Impressions per day | 423 | 800 | 1,500 | 3,000 |
| Share of visible impressions at positions 1–10 | 33.7% | 50% | 60% | 65% |
| Click rate at positions 8–10 | about 0.9% (8 of 923) | 2% | 3% | 3% |
| Pages with at least one click | 55 of 315 | 120 | 200 | 300+ |
| Pages Google has indexed | unknown (needs Indexing export) | fill in from export | fill in | fill in |
| Mobile page speed (LCP, real visitors) | n=1, not reliable | under 2.5 s at p75 | under 2.5 s | under 2.5 s |
| Backlinks / referring sites | unknown (needs Links export) | fill in | fill in | fill in |

"Domain authority" from the seo-plan template is left out on purpose: it needs a paid tool and does not tell us what to do next.

## 8. Agent sessions

Per `AGENTS.md`, each session has one objective and at most three milestones.

### S1 — Quick wins (start now)
**Objective:** apply the three cheap, evidence-backed changes and set up measurement.

**M1 — Save and baseline.** Put the audit in `docs/audits/2026-11-10-gsc-audit.md` and this plan in `docs/specs/seo-growth-plan-v2.md`. Create `docs/SEO_GSC_LOG.md` with the baseline numbers from the audit and a table to append to. Update `docs/HANDOFF.md`.
*Done when:* the three files exist, are committed and pushed.

**M2 — Spelling on the SEO surface.**
- RB Leipzig: visible SEO name «لایپزیگ» (searchers type «آربی لایپزیگ» / «لایپزیگ»), alternate «لایپزیش».
- Nordsjælland: visible SEO name «نورشلان», alternate «نوردشیلند».
- AS Roma: keep «رم», add alternate «آ س رم».
- Use these in titles, H1, meta descriptions, answer sentence and JSON-LD `alternateName` for match, team and hub pages. Show the alternate spelling once in visible page text.
- **Do not** change `src/fa-dict.ts` display names used by the bot, cards or digests. Add a small SEO-only override map in `src/seo/`.
- Keep titles at or under 65 characters (the existing trim ladder).
*Done when:* `npm test` and `npm run seo:check` pass; a local build shows the new spelling on a Leipzig, a Nordsjælland and a Roma page and in their JSON-LD; the bot and cards output is byte-identical to before; deployed per the RUNBOOK ritual and verified live; the change is logged in `docs/SEO_GSC_LOG.md` with date and affected pages.

**M3 — Internal links for upcoming games + data investigation.**
- Count internal links pointing at every match in the next 14 days (home, hubs, team pages, sibling card). Fix any match with fewer than 3. Add this count as a check in `scripts/seo-check.js`.
- Report only (no building): can the existing providers supply broadcaster or lineup data for matches? Write the answer in `docs/audits/<date>-broadcast-lineup-data.md`.
*Done when:* the check passes in production; the report exists and says plainly "yes, from X" or "no".

**Out of scope for S1:** title wording, team-page titles, hubs, sitemap, anything with new data.

### S2 — Title test (start on or after Dec 4)
Needs the Dec 4 Search Console export first. Objective: run the «X مقابل Y» title test with a control group, plus the small team-title test. The S1 agent writes the S2 start prompt at the end of S1.

### S3 — Where to watch / lineups (only if S1 M3 says data exists)
Objective: add a verified, clearly labelled block to match pages. If no data exists, close this item and say so in `docs/DECISIONS.md`.

## 9. Owner routine (10 minutes a week, plain steps)

1. Open Search Console → Performance → Search results.
2. Set the date range to the last 28 days. Click Export → download. Send the zip to the agent, or save it for the monthly read.
3. Once a month also export Indexing → Pages and Links.
4. Look at two numbers only: **average position** and **click rate**. If both are flat for three weeks, do nothing new; patience is part of the plan.

## 10. Risks

| Risk | What we do |
|---|---|
| Google's own sports box takes the top spot for famous matches | Focus on the long tail of fixtures and on hubs; do not chase generic team-name queries |
| Spelling change confuses existing readers | SEO surface only; the alternate spelling is shown on the page |
| Early numbers are noisy (4 weeks of data, big games dominate) | Read targets again on Dec 4 and Feb 10; compare same-position pages only |
| Adding "where to watch" with unverified information | Only verified data, labelled with its source; otherwise skip it |
| Too many simultaneous changes | Rules in section 5 and the log |

## 11. Decisions needed from the owner

**Q1 — When should the title test (S2) start?**
A. Dec 4, after a full 4 weeks of data on the Nov 6 title change *(recommended: gives a clean baseline)*
B. Right away, accepting that results will be muddy
C. Skip the test and keep the current titles

**Q2 — If the investigation finds broadcaster or lineup data, should we build it?**
A. Yes, build "where to watch" first, because it already has the best click rate *(recommended)*
B. Yes, lineups first
C. No, keep match pages as they are
