# HANDOFF — SportSignal

> Agents: read AGENTS.md in the repo root first, and follow it for this whole session.

## This session (SEO Follow-up Track Session 17 — the FAQ structured data + the visible Q&A on the detail pages; 2026-11-17 — DONE in code + deployed + version-verified live; the page-level live verification completes at the UTC-midnight KV-quota reset)

**The objective (the P1-6 gap, `docs/specs/seo-followup-track.md` §Session 17):**
the `FAQPage` + `Question` + `Answer` structured data + a visible Q&A section on
the team + match detail pages — real (fixture-sourced) + Persian + NEVER a
"where to watch" Q + freeze-safe. **DONE.**

- **S17-M1 — the team page ✅.** `buildTeamFaqItems` (`src/seo/faq-content.ts`):
  «بازی بعدی [team] کی است؟» (ALWAYS — the honest empty answer on the empty
  window) / «بازی‌های [team] در کدام لیگ است؟» (the distinct competitions the
  team's own fixtures name — CONDITIONAL) / «ساعت بازی بعدی [team] به وقت
  تهران چند است؟» (CONDITIONAL). The visible faqcard (`M.faqHtml`, the hub
  pattern, the LAST section of main — BELOW the answer-sentence, zero new CSS)
  + the `JL.faqNode` FAQPage node in the @graph — ONE source array feeds both
  (the T-20 byte-identical contract).
- **S17-M2 — the match page ✅.** `faqHtml ? JL.faqNode(buildMatchFaqItems(sm)) : null`
  in `buildMatchPage`'s jsonldNodes — the FAQPage node fed from the SAME
  authored array as the visible accordion (the owner-authorized GEO emit path;
  the S17 spec supersedes the Match Centre S16-Schema omit decision — DECISIONS
  S17-2; the three pinned `check-match-centre.js` gates re-pinned).
- **The new gate ✅.** `check-seo-faq.js` (15 gates) wired into the `npm test`
  chain; `npm test` exit 0 — **3,773 OK**; `npx tsc --noEmit` clean; the
  seeded render harness `scripts/s17-faq-smoke.ts` **26/26** (the REAL
  builders: the team page 3-Q FAQPage + the visible faqcard + the T-20
  contract + the byte-frozen title/H1; the with-venue match 4-Q FAQPage; the
  no-venue omission; the empty-window honest answer).
- **The version ✅.** `13.269.0-entity-image` → `13.270.0-faq` (the version
  triple + the `check-stats.js` LIVE pins + the CHANGELOG entry). The
  `check-seo-performance.js` version band extended for 13.270+ (a latent
  under-match — DECISIONS-in-place).
- **The deploy ✅ (version-verified live).** Deployment
  `62c3b14d-7dae-42e5-8d47-06d21d53176a` @100%; the live `/healthz` reports
  `version: 13.270.0-faq`.
- **The page-level live verification — BLOCKED at deploy time by the KV
  read-quota exhaustion; the completion is SCHEDULED.** The account's KV
  namespace crossed the 100,000-reads/day free limit at ~11:05 UTC Nov 17
  (the analytics: 112,086 reads by 12:00 UTC; the S16 live verification at
  11:05 UTC landed minutes before the exhaustion, the S17 deploy at ~12:10 UTC
  after). Until the UTC-midnight reset the KV-sourced routes degrade
  (`/healthz ok:false` + `pool_matches:0`; the SEO detail pages 404 — the
  pool read fails). **NOT the S17 change:** the differential — the PREVIOUS
  deployment (`2481f840…`, S16, verified healthy this morning) shows the
  IDENTICAL state right now; the S17 diff touches zero KV wiring. A one-shot
  verification job fires at **2026-11-18T00:20 UTC** (after the reset + the
  00:10 cron tick) to verify the live `/healthz ok:true` + the FAQPage on the
  team + match pages, then finalize the SESSION-17 report §7 + push the
  `seo(s17-verify)` docs commit. **Until then the S17 status is: deployed +
  version-verified live; the page-level FAQ verification pending the reset**
  (the code path is proven by the 26/26 harness + the 3,773-gate suite).
- **The audit correction (DECISIONS S17-3):** the match page HAS had a visible
  FAQ since Nov 14 (the Match Centre S16 accordion) — the P1-6 gap was the
  FAQPage NODE (correct in the audit) — the audit's "no FAQ on the match page"
  framing is corrected. Running total: 6 of 18 audit gaps carry corrections.
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
