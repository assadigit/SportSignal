# HANDOFF — SportSignal

> Agents: read AGENTS.md in the repo root first, and follow it for this whole session.

## This session (SEO Follow-up Track Session 18 — the editorial body content on the detail pages; 2026-11-17 — DONE in code + deployed + version-verified live; the page-level live verification rides the S17 00:20 UTC job after the KV-quota reset)

**The objective (the P1-1 gap, `docs/specs/seo-followup-track.md` §Session 18):**
substantive ORIGINAL Persian editorial prose BELOW the answer-sentence on the
team + competition detail pages — composed deterministically from the
already-loaded data (the narrative.ts precedent), never scraped, never
invented, E-E-A-T-grounded, freeze-safe. **DONE.** (The owner prompt arrived
with an assumed P1-7/P1-8 numbering that does not exist in the repo audit —
see DECISIONS S18-4; both prompt-assumed items were already shipped, so the
session executed the repo's real next open P1 item, P1-1.)

- **S18-M1 — the team page ✅.** `src/seo/editorial.ts`
  `buildTeamEditorialHtml`: «وضعیت فصل X» — the standings-position narrative
  (pos/points/played/W-D-L + the honest bands) + the recent-results run
  (the team's OWN finished matches, flat/fullTime/archive score shapes all
  covered) + the upcoming-run close + the E-E-A-T source note. BELOW the
  answer-sentence, ABOVE the S17 faqcard.
- **S18-M2 — the competition page ✅.** `buildCompetitionEditorialHtml`:
  «تصویر کلی X» — the title-race read (leader + gap + 2nd/3rd names from the
  SAME rows the visible table renders) + the coverage note; a cup without a
  table degrades to the coverage note alone.
- **The match page: NO new prose (DECISIONS S18-3)** — the S08 narrative +
  the facts table + the FAQ already cover it; zero match-page bytes changed.
- **The gates ✅.** `check-seo-content-depth.js` (15 gates) wired into the
  `npm test` chain — exit 0, **3,789 OK**; `npx tsc --noEmit` clean; the
  seeded harness `scripts/s18-content-smoke.ts` **29/29** (incl. the S17 FAQ
  regression under the new neighbor + the byte-frozen title/H1).
- **The version ✅.** `13.270.0-faq` → `13.271.0-content` (the version triple
  + the check-stats LIVE pins + the CHANGELOG entry).
- **The deploy ✅ (version-verified live).** Deployment
  `0fad7482-3e36-43ea-a2d8-b78b1b6247a7` @100%; the live `/healthz` reports
  `version: 13.271.0-content`. The page-level live check is blocked by the
  same Nov 17 KV read-quota exhaustion the S17 deploy hit (resets UTC
  midnight; the S17 scheduled 00:20 UTC job covers both sessions' page checks
  — the code path is proven by the 29/29 harness + the 3,789-gate suite + the
  local wrangler-dev smoke on the seeded KV).
- **Budget:** zero new KV-read/subrequest/CPU (pure string composition on
  already-loaded data). No client asset renamed.

## Current state (machine)

- **Version:** `13.270.0-faq` (`src/config.ts` / `package.json` `13.270.0.0`). npm test baseline **3,773 OK** (`npx tsc --noEmit` clean + 57 check scripts — the S16 baseline 3,757 + the 15-gate `check-seo-faq.js` + the re-pinned gates re-counted). The S17 harness: `npx tsx scripts/s17-faq-smoke.ts` (26/26 — manual, not in the test chain, the s9/s10/s11 precedent).
- **Deploy:** Worker `ucl-notifier`, versioned deploys only. Current deployment `62c3b14d-7dae-42e5-8d47-06d21d53176a` (`13.270.0-faq`; 2026-11-17 ~12:10 UTC, @100%). Rollback chain: `2481f840` (13.269.0-entity-image, S16) → `a4cc2982` (13.268.0-perf-preconnect, S14) → earlier (see the RUNBOOK). Rollback = `npx wrangler rollback`.
- **The KV incident at the S17 deploy (2026-11-17 ~11:05 UTC):** the read quota (100,000/day free) exhausted under peak traffic — the documented chronic issue, today 3 hours earlier than the Sessions 5-9 pattern; the analytics evidence + the differential are in the SESSION-17 report §7. The durable fix remains the owner's Workers Paid plan decision ($5/mo → 1M reads/day). The quota resets at UTC midnight; the scheduled verification job completes the S17 page-level live check at 00:20 UTC.
- **Production hostnames:** `sportsignal.ir` (apex Custom Domain), `football.sportsignal.ir` (301→apex except `/webhook`,`/api/`,`/admin`), `ucl-notifier.sportsignal.workers.dev` (noindex-guarded alias).
- **Branch:** `main` (canonical; HEAD = the S17 checkpoint — ls-remote verified after the one-shot token push). Session 17 commit: `seo(s17): …` (the code + the gate + the docs: the SESSION-17 report + the HANDOFF/CHANGELOG/DECISIONS updates + the S18 next-session prompt).
- **Commands:** `npm test` (must exit 0 before every push). **npm only, never `bun install`**. Local dev: `npx wrangler dev --config wrangler.dev.toml --port 8787 --local` (the dev config has no [ai] remote binding). Deploy needs `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` in the env. Versioned deploy: `npx wrangler versions upload` → `npx wrangler versions deploy --version-id <id> --percentage 100 --yes`.
- **Cron triggers:** `*/10 * * * *` + `27 */4 * * *` (unchanged).
- **Key folders:** `src/` (worker modules; `scripts/lib/worker-src.js` carries the bundle ORDER — co-evolve), `assets/` (immutable versioned client payload; SW `sportsignal-v126`, bundle `public-13.80.js`, stylesheet `public-13.87.css`), `docs/` (RUNBOOK, specs, audits, history), `seo-implementation/` (the SEO working tree: session reports, next-session-prompt.md).
- **Backups:** KV is live state; no routine file backups (RUNBOOK §5 KV key contracts). Never rename KV keys.
- **Standing limits:** the Dec 4-8 measurement freeze holds (the byte-frozen title/H1/description/answer-sentence bytes — S17 verified additive-only); the S12 single-language stance FINAL; `_headers` at the 100-rule cap; avoid deploys in the Nov 20 Bayern–Köln windows (M1 ~19:35 UTC, M2 ~21:35-45 UTC — 3 days away at the S17 close); the KV read quota + the 10ms CPU cliff remain the owner's Workers Paid plan decision.

## The SEO follow-up track state

Session 16 ✅ Completed / deployed + verified live (2026-11-17) — the entity-grounding parity + the image sitemap; 3,757 OK. Deployment `2481f840…` @100%.
Session 17 ✅ Completed in code + deployed + version-verified live (2026-11-17) — the FAQPage + the visible Q&A on the team + match detail pages; 3,773 OK; the harness 26/26. Deployment `62c3b14d…` @100%. The page-level live verification completes at the KV-quota reset (the scheduled 00:20 UTC job).
Session 18 ⬜ NEXT — the content depth on the detail pages (the P1-1 gap — the biggest ranking lever). See `docs/specs/seo-followup-track.md` §Session 18 + the next-session prompt (`seo-implementation/next-session-prompt.md`).
The data-dependent gaps (P0-1 CWV, P0-2 before/after GSC, P0-3 CPU cliff, P1-5 pagination, P2-3 allowlist) — the owner's next phase (`docs/specs/seo-followup-track.md` §"The data-dependent gaps").

(The 15-session SEO program 2026-11-16/17 is COMPLETE — the per-session rows
live in the git history + `seo-implementation/FINAL-SEO-IMPLEMENTATION-REPORT.md`;
the owner's 15-session tracker `sportsignal-seo-implementation/IMPLEMENTATION-TRACKER.md`
stays closed.)

## Open follow-ups

- **The S17 page-level live verification (the scheduled 00:20 UTC job, 2026-11-18)** — the FAQPage on the live team + match pages after the KV-quota reset; the `seo(s17-verify)` docs commit.
- **The KV read-quota exhaustion (the owner decision)** — today it exhausted by 11:05 UTC (112,086 reads; the analytics evidence in the SESSION-17 report §7). The Workers Paid plan ($5/mo → 1M reads/day) is the durable fix + the prerequisite for the `/en/` architecture + the GA4 budget. Until then: the SEO detail pages 404 for the tail of each UTC day after the quota crosses.
- **Session 18 (the content depth — P1-1, the biggest ranking lever)** — the next session; the prompt is ready.
- **The audit doc amendment** (the 6 corrected gaps — a docs-only pass; DECISIONS S16-3 + S17-3).
- **The post-Dec-8 freeze-lift decisions** (unchanged — the S2 title-test, the S06-H3 copy, the S1 spelling judgement, the S11 SEO_EXTRA_ALIASES extension, the S13-1 Events revisit — all need the fresh 16-month GSC export).
- **Nov 20 (S27 option B):** the auto-verify workflow fires around Bayern–Köln (`sched_next_ko` was 2026-11-20T19:30:00.000Z at the S15 close); the owner re-fires the M1/M2 window sessions; no deploys in those windows.
- The remaining S15-close backlog (the CrUX measurement, the Workers Logs per-route CPU, the S14 beacon extension IF wanted, the S26 UI/UX iteration, the C8 staleness vector, the May-2027 season-end lifecycle first run) — unchanged, owner-driven.

**Credentials used, not stored.** The GitHub + Cloudflare tokens were used
across S14-S17 (the S17 session used them for the clone, the push, the
deploy, + the KV analytics) — the owner should rotate them after the S17
verification job completes (the scheduled job needs the current tokens).
